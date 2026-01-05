import React, { useState, useEffect } from 'react';
import { supabase } from '../db/database';
import { Hotel } from '../types';
import Input from './ui/Input';
import { Bed, Plus, Trash2, Calendar, DollarSign, Euro, Save, Loader2, Hotel as HotelIcon } from 'lucide-react';

interface HotelManagerProps {
  parentId: number;
  parentType: 'viagem' | 'grupo';
}

const HotelManager: React.FC<HotelManagerProps> = ({ parentId, parentType }) => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const initialForm = {
    nome_hotel: '',
    check_in: '',
    check_out: '',
    valor_total_brl: '',
    valor_total_eur: '',
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchHotels();
  }, [parentId, parentType]);

  const fetchHotels = async () => {
    if (!supabase) return;
    setLoading(true);
    
    const column = parentType === 'viagem' ? 'viagem_id' : 'grupo_id';
    
    const { data, error } = await supabase
      .from('hoteis')
      .select('*')
      .eq(column, parentId)
      .order('check_in', { ascending: true });

    if (error) {
      console.error('Erro ao buscar hotéis:', error);
    } else {
      setHotels(data as Hotel[]);
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setAdding(true);

    const payload: any = {
      ...formData,
      valor_total_brl: formData.valor_total_brl ? parseFloat(formData.valor_total_brl.toString()) : 0,
      valor_total_eur: formData.valor_total_eur ? parseFloat(formData.valor_total_eur.toString()) : 0,
    };

    if (parentType === 'viagem') payload.viagem_id = parentId;
    else payload.grupo_id = parentId;

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (val: number | string, currency: 'BRL' | 'EUR') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(num);
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
        <Bed className="text-primary" />
        Reservas de Hotéis
      </h3>

      {/* Form de Adição */}
      <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Plus size={16} /> Nova Reserva
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-4">
                <Input 
                    label="Nome do Hotel" 
                    name="nome_hotel" 
                    value={formData.nome_hotel} 
                    onChange={handleChange} 
                    placeholder="Ex: Ibis Paris"
                    required
                    className="mb-0"
                />
            </div>
            <div className="md:col-span-2">
                <Input 
                    label="Check-in" 
                    name="check_in" 
                    type="date"
                    value={formData.check_in} 
                    onChange={handleChange}
                    className="mb-0" 
                />
            </div>
            <div className="md:col-span-2">
                <Input 
                    label="Check-out" 
                    name="check_out" 
                    type="date"
                    value={formData.check_out} 
                    onChange={handleChange}
                    className="mb-0" 
                />
            </div>
            <div className="md:col-span-2">
                <div className="relative">
                    <Input 
                        label="Valor (R$)" 
                        name="valor_total_brl" 
                        type="number"
                        step="0.01"
                        value={formData.valor_total_brl} 
                        onChange={handleChange}
                        placeholder="0.00"
                        className="mb-0"
                    />
                </div>
            </div>
            <div className="md:col-span-2 flex gap-2">
                 <div className="relative w-full">
                    <Input 
                        label="Valor (€)" 
                        name="valor_total_eur" 
                        type="number"
                        step="0.01"
                        value={formData.valor_total_eur} 
                        onChange={handleChange}
                        placeholder="0.00"
                        className="mb-0"
                    />
                </div>
                <button 
                    type="submit"
                    disabled={adding}
                    className="bg-primary text-white p-2 rounded-md hover:bg-blue-700 transition-colors h-[42px] mt-auto flex items-center justify-center min-w-[42px]"
                    title="Adicionar Hotel"
                >
                    {adding ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
                </button>
            </div>
        </div>
      </form>

      {/* Lista de Hotéis */}
      {loading ? (
        <div className="text-center py-4 text-gray-500">Carregando hotéis...</div>
      ) : hotels.length === 0 ? (
        <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
            <HotelIcon className="mx-auto mb-2 opacity-20" size={32} />
            <p>Nenhum hotel registrado para este grupo/viagem.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 font-semibold border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3">Hotel</th>
                        <th className="px-4 py-3">Estadia</th>
                        <th className="px-4 py-3 text-right">Valor (R$)</th>
                        <th className="px-4 py-3 text-right">Valor (€)</th>
                        <th className="px-4 py-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {hotels.map(hotel => (
                        <tr key={hotel.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800">
                                {hotel.nome_hotel}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Calendar size={14} className="text-gray-400"/>
                                    {formatDate(hotel.check_in)} 
                                    <span className="text-gray-300 mx-1">➜</span>
                                    {formatDate(hotel.check_out)}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-green-700">
                                {formatCurrency(hotel.valor_total_brl, 'BRL')}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-blue-700">
                                {formatCurrency(hotel.valor_total_eur, 'EUR')}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button 
                                    onClick={() => handleDelete(hotel.id)}
                                    className="text-gray-400 hover:text-red-600 transition-colors"
                                    title="Remover Hotel"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {/* Linha de Totais */}
                    <tr className="bg-gray-50 font-bold border-t border-gray-200">
                        <td className="px-4 py-3 text-right" colSpan={2}>TOTAIS:</td>
                        <td className="px-4 py-3 text-right text-green-800">
                            {formatCurrency(hotels.reduce((acc, h) => acc + Number(h.valor_total_brl), 0), 'BRL')}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-800">
                            {formatCurrency(hotels.reduce((acc, h) => acc + Number(h.valor_total_eur), 0), 'EUR')}
                        </td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        </div>
      )}
    </div>
  );
};

export default HotelManager;