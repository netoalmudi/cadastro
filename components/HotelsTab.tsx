import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Trip, AirGroup, Hotel } from '../types';
import Input from './ui/Input';
import { Bed, Plus, Trash2, Calendar, Loader2, Hotel as HotelIcon, Search, MapPin, Plane, Bus } from 'lucide-react';

const HotelsTab: React.FC = () => {
  // Selection State
  const [contextType, setContextType] = useState<'viagem' | 'grupo'>('viagem'); // 'viagem' = Terrestre, 'grupo' = Aéreo
  const [selectedEntityId, setSelectedEntityId] = useState<number | string>('');
  
  // Data State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [groups, setGroups] = useState<AirGroup[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  
  // Loading States
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form State
  const initialForm = {
    nome_hotel: '',
    check_in: '',
    check_out: '',
    valor_total_brl: '',
    valor_total_eur: '',
  };
  const [formData, setFormData] = useState(initialForm);

  // Fetch Trips and Groups on mount
  useEffect(() => {
    fetchEntities();
  }, []);

  // Fetch Hotels when selection changes
  useEffect(() => {
    if (selectedEntityId) {
      fetchHotels();
    } else {
      setHotels([]);
    }
  }, [selectedEntityId, contextType]);

  const fetchEntities = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setLoadingEntities(true);

    try {
      const { data: tripsData } = await supabase.from('viagens').select('*').order('data_ida', { ascending: false });
      const { data: groupsData } = await supabase.from('grupos_aereos').select('*').order('created_at', { ascending: false });

      if (tripsData) setTrips(tripsData as Trip[]);
      if (groupsData) setGroups(groupsData as AirGroup[]);
    } catch (error) {
      console.error("Erro ao buscar viagens/grupos:", error);
    } finally {
      setLoadingEntities(false);
    }
  };

  const fetchHotels = async () => {
    if (!supabase || !selectedEntityId) return;
    setLoadingHotels(true);
    
    const column = contextType === 'viagem' ? 'viagem_id' : 'grupo_id';
    
    const { data, error } = await supabase
      .from('hoteis')
      .select('*')
      .eq(column, selectedEntityId)
      .order('check_in', { ascending: true });

    if (error) {
      console.error('Erro ao buscar hotéis:', error);
    } else {
      setHotels(data as Hotel[]);
    }
    setLoadingHotels(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selectedEntityId) return;
    setAdding(true);

    const payload: any = {
      ...formData,
      valor_total_brl: formData.valor_total_brl ? parseFloat(formData.valor_total_brl.toString()) : 0,
      valor_total_eur: formData.valor_total_eur ? parseFloat(formData.valor_total_eur.toString()) : 0,
    };

    if (contextType === 'viagem') payload.viagem_id = selectedEntityId;
    else payload.grupo_id = selectedEntityId;

    const { error } = await supabase.from('hoteis').insert([payload]);

    if (error) {
      alert('Erro ao adicionar hotel: ' + error.message);
    } else {
      setFormData(initialForm);
      fetchHotels();
    }
    setAdding(false);
  };

  const handleDelete = async (id: number) => {
    if (!supabase) return;
    if (!window.confirm('Tem certeza que deseja remover este hotel?')) return;

    const { error } = await supabase.from('hoteis').delete().eq('id', id);
    if (error) {
      alert('Erro ao deletar: ' + error.message);
    } else {
      setHotels(prev => prev.filter(h => h.id !== id));
    }
  };

  // Utilities
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (val: number | string, currency: 'BRL' | 'EUR') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(num);
  };

  const selectedEntityLabel = () => {
     if (contextType === 'viagem') {
         const t = trips.find(t => t.id == selectedEntityId);
         return t ? `${t.nome_viagem} (${t.destino})` : '';
     } else {
         const g = groups.find(g => g.id == selectedEntityId);
         return g ? g.nome_grupo : '';
     }
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* SELECTION CARD */}
       <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* 1. Select Type */}
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Registro</label>
                   <div className="flex bg-gray-100 p-1 rounded-md">
                       <button
                           onClick={() => { setContextType('viagem'); setSelectedEntityId(''); }}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded text-sm font-medium transition-colors ${
                               contextType === 'viagem' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                           }`}
                       >
                           <Bus size={16} /> Viagem Terrestre
                       </button>
                       <button
                           onClick={() => { setContextType('grupo'); setSelectedEntityId(''); }}
                           className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded text-sm font-medium transition-colors ${
                               contextType === 'grupo' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                           }`}
                       >
                           <Plane size={16} /> Grupo Aéreo
                       </button>
                   </div>
               </div>

               {/* 2. Select Entity */}
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                       Selecione {contextType === 'viagem' ? 'a Viagem' : 'o Grupo'}
                   </label>
                   <div className="relative">
                       <select
                           className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2.5 bg-white focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
                           value={selectedEntityId}
                           onChange={(e) => setSelectedEntityId(e.target.value)}
                           disabled={loadingEntities}
                       >
                           <option value="">-- Selecione para gerenciar hotéis --</option>
                           {contextType === 'viagem' ? (
                               trips.map(t => (
                                   <option key={t.id} value={t.id}>{formatDate(t.data_ida)} - {t.nome_viagem}</option>
                               ))
                           ) : (
                               groups.map(g => (
                                   <option key={g.id} value={g.id}>{g.nome_grupo}</option>
                               ))
                           )}
                       </select>
                       <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                   </div>
               </div>
           </div>
       </div>

       {/* MANAGER AREA */}
       {selectedEntityId && (
           <>
                <div className="flex items-center gap-2 text-xl font-bold text-gray-800 border-b pb-2">
                    <Bed className="text-primary" />
                    <h2>Hotéis em: <span className="text-primary">{selectedEntityLabel()}</span></h2>
                </div>

                {/* ADD FORM */}
                <form onSubmit={handleSubmit} className="bg-blue-50 p-5 rounded-lg border border-blue-100 shadow-sm">
                    <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                        <Plus size={16} /> Cadastrar Novo Hotel
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-4">
                            <Input 
                                label="Nome do Hotel" 
                                name="nome_hotel" 
                                value={formData.nome_hotel} 
                                onChange={handleFormChange} 
                                placeholder="Ex: Ibis Paris Centro"
                                required
                                className="mb-0 bg-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input 
                                label="Check-in" 
                                name="check_in" 
                                type="date"
                                value={formData.check_in} 
                                onChange={handleFormChange}
                                className="mb-0 bg-white" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input 
                                label="Check-out" 
                                name="check_out" 
                                type="date"
                                value={formData.check_out} 
                                onChange={handleFormChange}
                                className="mb-0 bg-white" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Input 
                                label="Valor Total (R$)" 
                                name="valor_total_brl" 
                                type="number"
                                step="0.01"
                                value={formData.valor_total_brl} 
                                onChange={handleFormChange}
                                placeholder="0.00"
                                className="mb-0 bg-white"
                            />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                            <div className="relative w-full">
                                <Input 
                                    label="Valor Total (€)" 
                                    name="valor_total_eur" 
                                    type="number"
                                    step="0.01"
                                    value={formData.valor_total_eur} 
                                    onChange={handleFormChange}
                                    placeholder="0.00"
                                    className="mb-0 bg-white"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={adding}
                                className="bg-primary text-white rounded-md hover:bg-blue-700 transition-colors h-[42px] mt-auto flex items-center justify-center min-w-[42px] shadow-sm"
                                title="Salvar Hotel"
                            >
                                {adding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                            </button>
                        </div>
                    </div>
                </form>

                {/* LIST */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    {loadingHotels ? (
                        <div className="p-12 text-center text-gray-500">
                            <Loader2 className="animate-spin mx-auto mb-2" />
                            Carregando hotéis...
                        </div>
                    ) : hotels.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <HotelIcon className="mx-auto mb-2 opacity-20" size={48} />
                            <p>Nenhum hotel cadastrado para esta viagem/grupo.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Hotel</th>
                                    <th className="px-6 py-4">Período (Check-in / Check-out)</th>
                                    <th className="px-6 py-4 text-right">Custo em Reais (R$)</th>
                                    <th className="px-6 py-4 text-right">Custo em Euros (€)</th>
                                    <th className="px-6 py-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {hotels.map(hotel => (
                                    <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <HotelIcon size={16} className="text-gray-400" />
                                                {hotel.nome_hotel}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-gray-400"/>
                                                {formatDate(hotel.check_in)} 
                                                <span className="text-gray-300">➜</span>
                                                {formatDate(hotel.check_out)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-green-700 bg-green-50/30">
                                            {formatCurrency(hotel.valor_total_brl, 'BRL')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-medium text-blue-700 bg-blue-50/30">
                                            {formatCurrency(hotel.valor_total_eur, 'EUR')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(hotel.id)}
                                                className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-full"
                                                title="Remover Hotel"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {/* TOTALS ROW */}
                                <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                                    <td className="px-6 py-4 text-right text-gray-600" colSpan={2}>CUSTO TOTAL DE HOSPEDAGEM:</td>
                                    <td className="px-6 py-4 text-right text-green-800 text-base">
                                        {formatCurrency(hotels.reduce((acc, h) => acc + Number(h.valor_total_brl), 0), 'BRL')}
                                    </td>
                                    <td className="px-6 py-4 text-right text-blue-800 text-base">
                                        {formatCurrency(hotels.reduce((acc, h) => acc + Number(h.valor_total_eur), 0), 'EUR')}
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
           </>
       )}
    </div>
  );
};

export default HotelsTab;