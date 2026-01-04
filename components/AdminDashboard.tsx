import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Client, Trip } from '../types';
import { Search, Plus, Pencil, Trash2, X, RefreshCw, AlertCircle, Users, Map, Calendar, MapPin, FileImage, Plane, FileText } from 'lucide-react';
import ClientForm from './ClientForm';
import TripForm from './TripForm';
import ReportsTab from './ReportsTab';

interface AdminDashboardProps {
  onLogout: () => void;
}

type TabView = 'clients' | 'trips' | 'reports';
type EditMode = 'list' | 'form';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  // State for Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // State for Trips
  const [trips, setTrips] = useState<Trip[]>([]);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // Common State
  const [activeTab, setActiveTab] = useState<TabView>('clients');
  const [mode, setMode] = useState<EditMode>('list');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
    }

    setLoading(true);
    setFetchError(null);
    
    try {
      // 1. Fetch Clients
      // Alterado para ordenar por nome (alfabético) em vez de data de criação
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true })
        .order('sobrenome', { ascending: true }); // Ordenação secundária pelo sobrenome

      if (clientsError) throw clientsError;

      // Map snake_case to camelCase for Clients
      const mappedClients: Client[] = (clientsData || []).map((item: any) => ({
        ...item,
        dataNascimento: item.data_nascimento || item.dataNascimento,
        ufRg: item.uf_rg || item.ufRg,
      }));
      setClients(mappedClients);

      // 2. Fetch Trips
      const { data: tripsData, error: tripsError } = await supabase
        .from('viagens')
        .select('*')
        .order('data_ida', { ascending: true }); // Sort by upcoming trips

      if (tripsError) {
          // Se a tabela não existir, não quebra a tela de clientes, apenas loga
          console.warn("Tabela de viagens pode não existir ainda.", tripsError);
      }

      if (tripsData) {
        setTrips(tripsData as Trip[]);
      }

    } catch (err: any) {
      console.error("Erro ao buscar dados:", err);
      setFetchError("Ocorreu um erro ao buscar os dados. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper para calcular idade
  const calculateAge = (birthDate: string | undefined) => {
    if (!birthDate) return null;
    
    let dateObj: Date;
    
    // Check for DD/MM/YYYY format (from input mask manually stored as string)
    if (birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
        // Assume ISO YYYY-MM-DD (standard DB date)
        dateObj = new Date(birthDate);
    }
    
    if (isNaN(dateObj.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dateObj.getFullYear();
    const monthDiff = today.getMonth() - dateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
        age--;
    }
    
    return age;
  };

  // --- Handlers for Clients ---
  const handleDeleteClient = async (id: number | string) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (window.confirm("Tem certeza que deseja excluir este cliente?")) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) alert("Erro: " + error.message);
      else setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setMode('form');
  };

  // --- Handlers for Trips ---
  const handleDeleteTrip = async (id: number) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (window.confirm("Tem certeza que deseja excluir esta viagem?")) {
      const { error } = await supabase.from('viagens').delete().eq('id', id);
      if (error) alert("Erro: " + error.message);
      else setTrips(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setMode('form');
  };

  // --- Common Handlers ---
  const handleNew = () => {
    if (activeTab === 'clients') setEditingClient(null);
    else setEditingTrip(null);
    setMode('form');
  };

  const handleFormSuccess = () => {
    fetchData(); // Reload all data to be fresh
    setMode('list');
    setEditingClient(null);
    setEditingTrip(null);
  };

  const handleFormCancel = () => {
    setMode('list');
    setEditingClient(null);
    setEditingTrip(null);
  };

  // --- Filtering ---
  const filteredClients = clients.filter(c => 
    (c.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.sobrenome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.cpf || '').includes(searchTerm) ||
    (c.protocolo || '').includes(searchTerm)
  );

  const filteredTrips = trips.filter(t => 
    (t.nome_viagem?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (t.destino?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // --- Render Views ---

  if (mode === 'form') {
    if (activeTab === 'clients') {
      return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <ClientForm 
                initialData={editingClient} 
                onSuccess={handleFormSuccess} 
                onCancel={handleFormCancel}
                isAdmin={true}
            />
        </div>
      );
    } else {
      return (
        <div className="max-w-7xl mx-auto px-4 py-8 mt-6">
            <TripForm
                initialData={editingTrip}
                availableClients={clients}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
            />
        </div>
      );
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
                <p className="text-gray-500">Gerencie clientes e viagens.</p>
            </div>
            <div className="flex gap-3">
                 <button 
                    onClick={onLogout}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Sair
                </button>
                {activeTab !== 'reports' && (
                  <button 
                      onClick={handleNew}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                  >
                      <Plus size={20} />
                      {activeTab === 'clients' ? 'Novo Cliente' : 'Nova Viagem'}
                  </button>
                )}
            </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex space-x-1 border-b border-gray-200 mb-6 overflow-x-auto">
            <button
                onClick={() => { setActiveTab('clients'); setSearchTerm(''); }}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'clients' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Users size={18} />
                Clientes
            </button>
            <button
                onClick={() => { setActiveTab('trips'); setSearchTerm(''); }}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'trips' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Map size={18} />
                Viagens
            </button>
            <button
                onClick={() => { setActiveTab('reports'); setSearchTerm(''); }}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'reports' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <FileText size={18} />
                Relatórios
            </button>
        </div>

        {/* Search Bar - Hide on Reports Tab */}
        {activeTab !== 'reports' && (
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                      type="text" 
                      placeholder={activeTab === 'clients' ? "Buscar por Nome, CPF ou Protocolo..." : "Buscar por Viagem ou Destino..."}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                      <button 
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                          <X size={16} />
                      </button>
                  )}
              </div>
              <button 
                  onClick={fetchData} 
                  className="p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-full transition-colors"
                  title="Atualizar lista"
              >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
          </div>
        )}

        {/* Content Area */}
        {fetchError && activeTab !== 'reports' && (
             <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3 rounded shadow-sm">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                    <p className="font-bold">Erro ao buscar dados</p>
                    <p className="text-sm">{fetchError}</p>
                </div>
            </div>
        )}

        {loading && activeTab !== 'reports' ? (
             <div className="p-12 flex justify-center items-center text-gray-500 bg-white rounded-lg border border-gray-200">
                <RefreshCw className="animate-spin mr-2" /> Carregando dados...
            </div>
        ) : (
            <>
                {activeTab === 'reports' && (
                  <ReportsTab />
                )}

                {activeTab === 'clients' && (
                    // CLIENTS TABLE
                    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                        {filteredClients.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">Nenhum cliente encontrado.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Idade</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredClients.map((client) => {
                                            const age = calculateAge(client.dataNascimento);
                                            const isSenior = age !== null && age >= 60;
                                            return (
                                                <tr key={client.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className={`text-sm font-medium ${isSenior ? 'text-orange-600' : 'text-gray-900'}`}>
                                                            {age !== null ? `${age} anos` : '-'}
                                                            {isSenior && (
                                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                    60+
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{client.nome} {client.sobrenome}</div>
                                                        <div className="text-sm text-gray-500">{client.cpf}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{client.celular}</div>
                                                        <div className="text-sm text-gray-500 truncate max-w-[150px]">{client.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end items-center">
                                                            {(client.rg_url || client.passaporte_url) && (
                                                                <div className="flex gap-2 mr-3 border-r pr-3 border-gray-200">
                                                                    {client.rg_url && (
                                                                        <a href={client.rg_url} target="_blank" title="Ver RG" className="text-gray-400 hover:text-blue-600 transition-colors">
                                                                            <FileImage size={18} />
                                                                        </a>
                                                                    )}
                                                                    {client.passaporte_url && (
                                                                        <a href={client.passaporte_url} target="_blank" title="Ver Passaporte" className="text-gray-400 hover:text-blue-600 transition-colors">
                                                                            <Plane size={18} />
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <button onClick={() => handleEditClient(client)} className="text-indigo-600 hover:text-indigo-900 mr-4"><Pencil size={18} /></button>
                                                            <button onClick={() => handleDeleteClient(client.id)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'trips' && (
                    // TRIPS LIST (Vertical)
                    <div className="space-y-4">
                        {filteredTrips.length === 0 ? (
                            <div className="bg-white p-12 text-center text-gray-500 rounded-lg border border-gray-200">
                                Nenhuma viagem encontrada. Clique em "Nova Viagem" para começar.
                            </div>
                        ) : (
                            filteredTrips.map(trip => (
                                <div key={trip.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                                    {/* Left: Info */}
                                    <div className="flex-grow">
                                         <h3 className="text-lg font-bold text-gray-900">{trip.nome_viagem}</h3>
                                         
                                         <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <MapPin size={16} className="text-gray-400 mr-1" />
                                                {trip.origem} <span className="mx-2 text-gray-300">➔</span> {trip.destino}
                                            </div>
                                            <div className="hidden md:block w-1 h-1 bg-gray-300 rounded-full"></div>
                                            <div className="flex items-center">
                                                <Calendar size={16} className="text-gray-400 mr-1" />
                                                {trip.data_ida ? new Date(trip.data_ida).toLocaleDateString('pt-BR') : '-'} 
                                                {trip.data_volta && ` até ${new Date(trip.data_volta).toLocaleDateString('pt-BR')}`}
                                            </div>
                                         </div>

                                         <div className="flex items-center gap-3 mt-3 text-xs font-medium text-gray-500">
                                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                                {trip.dias_total} dias
                                            </span>
                                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                                {trip.km_total} km
                                            </span>
                                         </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                                         <button 
                                            onClick={() => handleEditTrip(trip)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                         >
                                            <Pencil size={16} /> Editar
                                         </button>
                                         <button 
                                            onClick={() => handleDeleteTrip(trip.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
                                            title="Excluir"
                                         >
                                            <Trash2 size={18} />
                                         </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export default AdminDashboard;