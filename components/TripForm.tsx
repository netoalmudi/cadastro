import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../db/database';
import { Trip, Client } from '../types';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import { ArrowLeft, Save, Calendar, Clock, MapPin, Users, Search, X, Plus, Trash2, Check, DollarSign, Calculator, Star, Crown } from 'lucide-react';

interface TripFormProps {
  initialData?: Trip | null;
  availableClients: Client[]; // Lista de todos os clientes para seleção
  onSuccess: () => void;
  onCancel: () => void;
}

const TripForm: React.FC<TripFormProps> = ({ initialData, availableClients, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Trip, 'id' | 'created_at'>>({
    nome_viagem: '',
    origem: '',
    destino: '',
    data_ida: '',
    hora_ida: '',
    data_volta: '',
    hora_volta: '',
    roteiro: '',
    km_total: '',
    dias_total: '',
    valor_diaria: '',
    valor_km: '',
    valor_guia: '',
    contratante_id: null,
  });

  // Alterado para aceitar string (UUID) ou number
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

  // Carrega dados iniciais se estiver editando
  useEffect(() => {
    if (initialData) {
      setFormData({
        nome_viagem: initialData.nome_viagem,
        origem: initialData.origem,
        destino: initialData.destino,
        data_ida: initialData.data_ida,
        hora_ida: initialData.hora_ida,
        data_volta: initialData.data_volta,
        hora_volta: initialData.hora_volta,
        roteiro: initialData.roteiro,
        km_total: initialData.km_total,
        dias_total: initialData.dias_total,
        valor_diaria: initialData.valor_diaria || '',
        valor_km: initialData.valor_km || '',
        valor_guia: initialData.valor_guia || '',
        contratante_id: initialData.contratante_id || null,
      });
      fetchTripClients(initialData.id);
    }
  }, [initialData]);

  // Busca clientes já vinculados a esta viagem (se for edição)
  const fetchTripClients = async (tripId: number) => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('viagem_clientes')
      .select('cliente_id')
      .eq('viagem_id', tripId);

    if (data && !error) {
      setSelectedClientIds(data.map((item: any) => item.cliente_id));
    }
  };

  // Cálculo automático de dias
  useEffect(() => {
    if (formData.data_ida && formData.data_volta) {
      const start = new Date(formData.data_ida);
      const end = new Date(formData.data_volta);
      
      // Diferença em milissegundos
      const diffTime = Math.abs(end.getTime() - start.getTime());
      // Converter para dias (adicionando 1 para contar o dia da ida e da volta, se for inclusivo)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
      
      if (!isNaN(diffDays) && diffDays > 0) {
        setFormData(prev => ({ ...prev, dias_total: diffDays }));
      }
    }
  }, [formData.data_ida, formData.data_volta]);

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
    // Se o cliente removido era o contratante, limpa o campo
    if (formData.contratante_id === clientId) {
      setFormData(prev => ({ ...prev, contratante_id: null }));
    }
  };

  const toggleContractor = (clientId: number | string) => {
    setFormData(prev => ({
      ...prev,
      // Se já for este o contratante, desmarca (null). Se for outro, marca este.
      contratante_id: prev.contratante_id === clientId ? null : clientId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!supabase) {
        alert("Erro de conexão com banco de dados.");
        setIsSubmitting(false);
        return;
    }

    try {
      let tripId: number;

      // 1. Salvar ou Atualizar a Viagem
      if (initialData?.id) {
        // Update
        const { error } = await supabase
          .from('viagens')
          .update(formData)
          .eq('id', initialData.id);
        
        if (error) throw error;
        tripId = initialData.id;

      } else {
        // Insert
        const { data, error } = await supabase
          .from('viagens')
          .insert([formData])
          .select()
          .single();
        
        if (error) throw error;
        tripId = data.id;
      }

      // 2. Atualizar Clientes Vinculados (Estratégia: Remove todos e insere os selecionados)
      if (initialData?.id) {
        // Limpar vínculos existentes apenas se for edição
        await supabase.from('viagem_clientes').delete().eq('viagem_id', tripId);
      }

      if (selectedClientIds.length > 0) {
        const relationData = selectedClientIds.map(clientId => ({
          viagem_id: tripId,
          cliente_id: clientId
        }));
        
        const { error: relationError } = await supabase
          .from('viagem_clientes')
          .insert(relationData);
          
        if (relationError) throw relationError;
      }

      alert("Viagem salva com sucesso!");
      onSuccess();

    } catch (error: any) {
      console.error("Erro ao salvar viagem:", error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtra clientes disponíveis (que ainda não foram selecionados e batem com a busca)
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

  // --- LÓGICA DE CÁLCULO DE CUSTOS ---
  const dias = Number(formData.dias_total) || 0;
  const km = Number(formData.km_total) || 0;
  
  const valDiaria = Number(formData.valor_diaria) || 0;
  const valKm = Number(formData.valor_km) || 0;
  const valGuia = Number(formData.valor_guia) || 0;

  const calcTotalDiaria = dias * valDiaria;
  const calcTotalKm = km * valKm;
  const calcTotalGuia = dias * valGuia;
  
  const totalGeral = calcTotalDiaria + calcTotalKm + calcTotalGuia;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          {initialData ? 'Editar Viagem' : 'Nova Viagem'}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* DADOS GERAIS */}
        <SectionHeader title="Informações da Viagem" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Nome da Viagem" 
            name="nome_viagem" 
            value={formData.nome_viagem} 
            onChange={handleChange} 
            required 
            placeholder="Ex: Excursão Beto Carrero"
            className="md:col-span-3"
          />
          
          <div className="md:col-span-1">
             <div className="relative">
                <Input label="Origem" name="origem" value={formData.origem} onChange={handleChange} />
                <MapPin className="absolute right-3 top-9 text-gray-400 w-4 h-4" />
             </div>
          </div>
          <div className="md:col-span-1">
             <div className="relative">
                <Input label="Destino" name="destino" value={formData.destino} onChange={handleChange} />
                <MapPin className="absolute right-3 top-9 text-gray-400 w-4 h-4" />
             </div>
          </div>
          <Input label="KM Total" name="km_total" type="number" value={formData.km_total} onChange={handleChange} placeholder="Ex: 500" />
        </div>

        {/* DATAS E HORÁRIOS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <Input label="Data Ida" name="data_ida" type="date" value={formData.data_ida} onChange={handleChange} required />
          <Input label="Hora Ida" name="hora_ida" type="time" value={formData.hora_ida} onChange={handleChange} />
          
          <Input label="Data Volta" name="data_volta" type="date" value={formData.data_volta} onChange={handleChange} required />
          <Input label="Hora Volta" name="hora_volta" type="time" value={formData.hora_volta} onChange={handleChange} />
          
          <div className="md:col-span-4 mt-2">
             <span className="text-sm font-medium text-gray-600">Duração Calculada: </span>
             <span className="text-sm font-bold text-primary">{formData.dias_total || 0} dias</span>
          </div>
        </div>

        {/* CUSTOS E ORÇAMENTO */}
        <SectionHeader title="Custos e Orçamento" />
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Linha 1: Diária do Veículo */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
              <div className="w-full md:w-1/2">
                <Input 
                   label="Valor Diária (Veículo)" 
                   name="valor_diaria" 
                   type="number" 
                   step="0.01"
                   value={formData.valor_diaria} 
                   onChange={handleChange} 
                   placeholder="0,00" 
                />
              </div>
              <div className="flex flex-col pb-2 w-full md:w-1/2">
                <span className="text-xs text-gray-500 mb-1">Total Diárias ({dias} dias)</span>
                <div className="font-mono font-medium text-gray-800 text-lg border-b border-gray-300 pb-1 flex items-center gap-2">
                  <Calculator size={14} className="text-gray-400" />
                  {formatCurrency(calcTotalDiaria)}
                </div>
              </div>
            </div>

            {/* Linha 2: KM Rodado */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
              <div className="w-full md:w-1/2">
                <Input 
                   label="Valor por KM" 
                   name="valor_km" 
                   type="number" 
                   step="0.01"
                   value={formData.valor_km} 
                   onChange={handleChange} 
                   placeholder="0,00" 
                />
              </div>
              <div className="flex flex-col pb-2 w-full md:w-1/2">
                <span className="text-xs text-gray-500 mb-1">Total KM ({km} km)</span>
                <div className="font-mono font-medium text-gray-800 text-lg border-b border-gray-300 pb-1 flex items-center gap-2">
                  <Calculator size={14} className="text-gray-400" />
                  {formatCurrency(calcTotalKm)}
                </div>
              </div>
            </div>

            {/* Linha 3: Diária Guia */}
            <div className="flex flex-col md:flex-row items-start md:items-end gap-3">
              <div className="w-full md:w-1/2">
                <Input 
                   label="Valor Diária (Guia)" 
                   name="valor_guia" 
                   type="number" 
                   step="0.01"
                   value={formData.valor_guia} 
                   onChange={handleChange} 
                   placeholder="0,00" 
                />
              </div>
              <div className="flex flex-col pb-2 w-full md:w-1/2">
                <span className="text-xs text-gray-500 mb-1">Total Guia ({dias} dias)</span>
                <div className="font-mono font-medium text-gray-800 text-lg border-b border-gray-300 pb-1 flex items-center gap-2">
                  <Calculator size={14} className="text-gray-400" />
                  {formatCurrency(calcTotalGuia)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Total Geral */}
          <div className="mt-8 pt-4 border-t-2 border-blue-200 flex flex-col md:flex-row justify-between items-center">
            <span className="text-lg font-bold text-blue-900 uppercase tracking-wide">Orçamento Estimado</span>
            <div className="text-3xl font-bold text-blue-700 bg-white px-6 py-2 rounded shadow-sm border border-blue-100 flex items-center gap-2 mt-2 md:mt-0">
               <span className="text-lg text-gray-400">R$</span> {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* ROTEIRO */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-600">Roteiro Detalhado</label>
          <textarea 
            name="roteiro" 
            rows={5} 
            className="w-full border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Descreva o itinerário da viagem..."
            value={formData.roteiro}
            onChange={handleChange}
          ></textarea>
        </div>

        {/* SELEÇÃO DE CLIENTES */}
        <SectionHeader title="Lista de Passageiros" />
        
        {/* Dropdown de Busca */}
        <div className="relative mb-6" ref={dropdownRef}>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Adicionar Cliente</label>
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
              Passageiros Adicionados
            </span>
            <div className="flex gap-2">
                <span className="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-1 rounded-md flex items-center gap-1 border border-yellow-200">
                    <Star size={12} fill="currentColor" /> Contratante
                </span>
                <span className="text-xs font-bold bg-primary text-white px-2 py-1 rounded-full">
                    {selectedClientIds.length}
                </span>
            </div>
          </div>
          
          {selectedClientsList.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
              <Users size={32} className="opacity-20" />
              <p>Nenhum passageiro adicionado nesta viagem.</p>
              <p className="text-sm">Utilize a busca acima para adicionar clientes.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedClientsList.map(client => {
                const isContractor = formData.contratante_id === client.id;
                
                return (
                  <div key={client.id} className={`flex justify-between items-center px-4 py-3 transition-colors ${isContractor ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isContractor ? 'bg-yellow-200 text-yellow-800 ring-2 ring-yellow-400 ring-offset-1' : 'bg-blue-100 text-blue-700'}`}>
                         {isContractor ? <Crown size={14} /> : `${client.nome.charAt(0)}${client.sobrenome.charAt(0)}`}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                            <div className={`text-sm font-medium ${isContractor ? 'text-yellow-900 font-bold' : 'text-gray-900'}`}>
                                {client.nome} {client.sobrenome}
                            </div>
                            {isContractor && (
                                <span className="text-[10px] uppercase font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded">Contratante</span>
                            )}
                        </div>
                        <div className="text-xs text-gray-500 flex gap-3">
                          <span>CPF: {client.cpf}</span>
                          <span>Tel: {client.celular}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => toggleContractor(client.id)}
                            className={`p-2 rounded-full transition-all flex items-center gap-1 text-xs font-medium ${
                                isContractor 
                                ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' 
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
                            }`}
                            title={isContractor ? "Remover contratante" : "Definir como contratante"}
                        >
                            <Star size={18} fill={isContractor ? "currentColor" : "none"} />
                        </button>

                        <button 
                            type="button" 
                            onClick={() => removeClient(client.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                            title="Remover passageiro"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </div>
                );
              })}
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
            Salvar Viagem
          </button>
        </div>
      </form>
    </div>
  );
};

export default TripForm;