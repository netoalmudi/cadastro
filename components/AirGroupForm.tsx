import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../db/database';
import { AirGroup, Client } from '../types';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import { ArrowLeft, Save, Users, Search, Plus, Trash2, Clock, Plane, MapPin, Tag } from 'lucide-react';

interface AirGroupFormProps {
  initialData?: AirGroup | null;
  availableClients: Client[]; // Lista de todos os clientes para seleção
  onSuccess: () => void;
  onCancel: () => void;
}

const AirGroupForm: React.FC<AirGroupFormProps> = ({ initialData, availableClients, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Omit<AirGroup, 'id' | 'created_at'>>({
    nome_grupo: '',
    roteiro: '',
    origem: '',
    destino: '',
  });

  // Local state for split fields to handle IATA codes better
  const [originCity, setOriginCity] = useState('');
  const [originIata, setOriginIata] = useState('');
  const [destCity, setDestCity] = useState('');
  const [destIata, setDestIata] = useState('');

  const [selectedClientIds, setSelectedClientIds] = useState<(number | string)[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to parse "City (IATA)"
  const parseLocation = (value: string) => {
    if (!value) return { city: '', iata: '' };
    // Regex to match "City Name (IATA)"
    // Looks for 3 letters inside parentheses at the end of string
    const match = value.match(/^(.*)\s*\((.{3})\)$/);
    if (match) {
      return { city: match[1].trim(), iata: match[2].toUpperCase() };
    }
    return { city: value, iata: '' };
  };

  // Carrega dados iniciais se estiver editando
  useEffect(() => {
    if (initialData) {
      setFormData({
        nome_grupo: initialData.nome_grupo,
        roteiro: initialData.roteiro || '',
        origem: initialData.origem || '',
        destino: initialData.destino || '',
      });
      
      const parsedOrig = parseLocation(initialData.origem || '');
      setOriginCity(parsedOrig.city);
      setOriginIata(parsedOrig.iata);

      const parsedDest = parseLocation(initialData.destino || '');
      setDestCity(parsedDest.city);
      setDestIata(parsedDest.iata);

      fetchGroupClients(initialData.id);
    }
  }, [initialData]);

  // Busca clientes já vinculados a este grupo (se for edição)
  const fetchGroupClients = async (groupId: number) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('grupo_aereo_clientes')
      .select('cliente_id')
      .eq('grupo_id', groupId);

    if (data && !error) {
      setSelectedClientIds(data.map((item: any) => item.cliente_id));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addClient = (clientId: number | string) => {
    if (!selectedClientIds.includes(clientId)) {
      setSelectedClientIds(prev => [...prev, clientId]);
    }
    setClientSearchTerm('');
    setIsDropdownOpen(false);
  };

  const removeClient = (clientId: number | string) => {
    setSelectedClientIds(prev => prev.filter(id => id !== clientId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!supabase) {
        alert("Erro de conexão com banco de dados.");
        setIsSubmitting(false);
        return;
    }

    // Construct final strings
    const finalOrigem = originIata ? `${originCity} (${originIata.toUpperCase()})` : originCity;
    const finalDestino = destIata ? `${destCity} (${destIata.toUpperCase()})` : destCity;

    const payloadData = {
        ...formData,
        origem: finalOrigem,
        destino: finalDestino,
    };

    try {
      let groupId: number;

      // 1. Salvar ou Atualizar o Grupo
      if (initialData?.id) {
        // Update
        const { error } = await supabase
          .from('grupos_aereos')
          .update(payloadData)
          .eq('id', initialData.id);
        
        if (error) throw error;
        groupId = initialData.id;

      } else {
        // Insert
        const { data, error } = await supabase
          .from('grupos_aereos')
          .insert([payloadData])
          .select()
          .single();
        
        if (error) throw error;
        groupId = data.id;
      }

      // 2. Atualizar Clientes Vinculados
      if (initialData?.id) {
        // Limpar vínculos existentes apenas se for edição
        await supabase.from('grupo_aereo_clientes').delete().eq('grupo_id', groupId);
      }

      if (selectedClientIds.length > 0) {
        const relationData = selectedClientIds.map(clientId => ({
          grupo_id: groupId,
          cliente_id: clientId
        }));
        
        const { error: relationError } = await supabase
          .from('grupo_aereo_clientes')
          .insert(relationData);
          
        if (relationError) throw relationError;
      }

      alert("Grupo Aéreo salvo com sucesso!");
      onSuccess();

    } catch (error: any) {
      console.error("Erro ao salvar grupo:", error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtra clientes disponíveis
  const availableToSelect = availableClients.filter(c => 
    !selectedClientIds.includes(c.id) &&
    (
      c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      c.sobrenome.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
      c.cpf.includes(clientSearchTerm)
    )
  );

  // Obtém os objetos completos dos clientes selecionados para exibir na lista
  const selectedClientsList = availableClients.filter(c => selectedClientIds.includes(c.id));

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Plane className="text-primary" />
          {initialData ? 'Editar Grupo Aéreo' : 'Novo Grupo Aéreo'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* DADOS GERAIS */}
        <SectionHeader title="Dados do Grupo" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Nome do Grupo / Identificação da Viagem" 
            name="nome_grupo" 
            value={formData.nome_grupo} 
            onChange={handleChange} 
            required 
            placeholder="Ex: Grupo Portugal 2024"
            className="md:col-span-2"
          />
          
          {/* Origem e IATA */}
          <div className="md:col-span-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
             <div className="flex gap-2">
                <div className="flex-grow">
                    <Input 
                      label="Cidade Origem" 
                      name="originCity" 
                      value={originCity} 
                      onChange={(e) => setOriginCity(e.target.value)} 
                      placeholder="Ex: Curitiba"
                    />
                </div>
                <div className="w-24">
                     <Input 
                      label="IATA" 
                      name="originIata" 
                      value={originIata} 
                      onChange={(e) => setOriginIata(e.target.value.toUpperCase().slice(0, 3))} 
                      placeholder="CWB"
                      maxLength={3}
                    />
                </div>
             </div>
          </div>

          {/* Destino e IATA */}
          <div className="md:col-span-1 bg-gray-50 p-3 rounded-lg border border-gray-200">
             <div className="flex gap-2">
                <div className="flex-grow">
                    <Input 
                      label="Cidade Destino" 
                      name="destCity" 
                      value={destCity} 
                      onChange={(e) => setDestCity(e.target.value)} 
                      placeholder="Ex: Lisboa"
                    />
                </div>
                <div className="w-24">
                     <Input 
                      label="IATA" 
                      name="destIata" 
                      value={destIata} 
                      onChange={(e) => setDestIata(e.target.value.toUpperCase().slice(0, 3))} 
                      placeholder="LIS"
                      maxLength={3}
                    />
                </div>
             </div>
          </div>
        </div>

        {/* ROTEIRO */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">Roteiro / Detalhes do Voo</label>
          <textarea 
            name="roteiro" 
            rows={5} 
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Descreva o roteiro, conexões ou dados detalhados dos voos..."
            value={formData.roteiro}
            onChange={handleChange}
          ></textarea>
        </div>

        {/* SELEÇÃO DE CLIENTES */}
        <SectionHeader title="Passageiros (Ticketing)" />
        
        {/* Dropdown de Busca */}
        <div className="relative mb-6" ref={dropdownRef}>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Adicionar Passageiro</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Digite o nome ou CPF para buscar..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={clientSearchTerm}
              onChange={(e) => {
                setClientSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>

          {isDropdownOpen && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {availableToSelect.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">Nenhum cliente disponível encontrado.</div>
              ) : (
                availableToSelect.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => addClient(client.id)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 flex justify-between items-center group transition-colors"
                  >
                    <div>
                      <div className="font-medium text-gray-800">{client.nome} {client.sobrenome}</div>
                      <div className="text-xs text-gray-500">CPF: {client.cpf}</div>
                    </div>
                    <Plus size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Lista de Passageiros Adicionados */}
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <span className="font-medium text-gray-700 flex items-center gap-2">
              <Users size={18} />
              Lista para Emissão
            </span>
            <div className="flex gap-2">
                <span className="text-xs font-bold bg-primary text-white px-2 py-1 rounded-full">
                    {selectedClientIds.length}
                </span>
            </div>
          </div>
          
          {selectedClientsList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
              <Users size={32} className="opacity-20" />
              <p>Nenhum passageiro adicionado.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedClientsList.map(client => (
                  <div key={client.id} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                         {`${client.nome.charAt(0)}${client.sobrenome.charAt(0)}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                                <span className="uppercase font-bold">{client.sobrenome}</span>, {client.nome}
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 flex gap-3">
                          <span>Passaporte: {client.passaporte || 'N/A'}</span>
                          <span>CPF: {client.cpf}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={() => removeClient(client.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                        title="Remover passageiro"
                    >
                        <Trash2 size={16} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            {isSubmitting && <Clock size={16} className="animate-spin" />}
            <Save size={18} />
            Salvar Grupo
          </button>
        </div>
      </form>
    </div>
  );
};

export default AirGroupForm;
