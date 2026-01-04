import React, { useState, useEffect } from 'react';
import { supabase } from '../db/database';
import { Trip, Client } from '../types';
import SectionHeader from './ui/SectionHeader';
import Input from './ui/Input';
import { ArrowLeft, Save, Calendar, Clock, MapPin, Users, Search } from 'lucide-react';

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
  });

  // Alterado para aceitar string (UUID) ou number
  const [selectedClientIds, setSelectedClientIds] = useState<(number | string)[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const toggleClientSelection = (clientId: number | string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
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

  // Filtragem de clientes para seleção
  const filteredClients = availableClients.filter(c => 
    c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.sobrenome.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    c.cpf.includes(clientSearchTerm)
  );

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
        <SectionHeader title="Passageiros / Clientes" />
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente para adicionar..." 
              className="bg-transparent border-none focus:ring-0 w-full text-sm"
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
             {filteredClients.length === 0 ? (
               <p className="text-center text-sm text-gray-500 py-4">Nenhum cliente encontrado.</p>
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                 {filteredClients.map(client => (
                   <div 
                     key={client.id}
                     onClick={() => toggleClientSelection(client.id)}
                     className={`
                       cursor-pointer flex items-center p-2 rounded border text-sm transition-colors
                       ${selectedClientIds.includes(client.id) 
                         ? 'bg-blue-50 border-blue-300 text-blue-800' 
                         : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'}
                     `}
                   >
                     <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${selectedClientIds.includes(client.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                        {selectedClientIds.includes(client.id) && <Users size={10} className="text-white" />}
                     </div>
                     <span className="truncate font-medium">{client.nome} {client.sobrenome}</span>
                     <span className="ml-auto text-xs text-gray-400">{client.cpf}</span>
                   </div>
                 ))}
               </div>
             )}
          </div>
          <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 text-xs text-gray-500 text-right">
            {selectedClientIds.length} cliente(s) selecionado(s)
          </div>
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