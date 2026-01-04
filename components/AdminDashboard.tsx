import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Client, Trip, AirGroup } from '../types';
import { Search, Plus, Pencil, Trash2, X, RefreshCw, AlertCircle, Users, Map, FileText, Plane, Printer, CreditCard, Globe, Calendar } from 'lucide-react';
import ClientForm from './ClientForm';
import TripForm from './TripForm';
import AirGroupForm from './AirGroupForm';
import ReportsTab from './ReportsTab';

interface AdminDashboardProps {
  onLogout: () => void;
}

type TabView = 'clients' | 'trips' | 'air' | 'reports';
type EditMode = 'list' | 'form';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  // State for Clients
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // State for Trips
  const [trips, setTrips] = useState<Trip[]>([]);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  // State for Air Groups
  const [airGroups, setAirGroups] = useState<AirGroup[]>([]);
  const [editingAirGroup, setEditingAirGroup] = useState<AirGroup | null>(null);

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
      const { data: clientsData, error: clientsError } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true })
        .order('sobrenome', { ascending: true });

      if (clientsError) throw clientsError;

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
        .order('data_ida', { ascending: true });

      if (tripsError) console.warn("Erro ao buscar viagens", tripsError);
      if (tripsData) setTrips(tripsData as Trip[]);

      // 3. Fetch Air Groups
      const { data: airData, error: airError } = await supabase
        .from('grupos_aereos')
        .select('*')
        .order('created_at', { ascending: false });

      if (airError) console.warn("Tabela grupos_aereos pode não existir.", airError);
      if (airData) setAirGroups(airData as AirGroup[]);

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
    if (birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    // Assume formato YYYY-MM-DD vindo do banco
    if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    return dateStr;
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

  // --- Handlers for Air Groups ---
  const handleDeleteAirGroup = async (id: number) => {
    if (!isSupabaseConfigured || !supabase) return;
    if (window.confirm("Tem certeza que deseja excluir este grupo aéreo?")) {
      const { error } = await supabase.from('grupos_aereos').delete().eq('id', id);
      if (error) alert("Erro: " + error.message);
      else setAirGroups(prev => prev.filter(g => g.id !== id));
    }
  };

  const handleEditAirGroup = (group: AirGroup) => {
    setEditingAirGroup(group);
    setMode('form');
  };

  const generateAirReport = async (group: AirGroup) => {
    if (!supabase) return;
    
    // Buscar passageiros
    const { data: passengersData, error } = await supabase
        .from('grupo_aereo_clientes')
        .select(`
          cliente_id,
          clientes (*)
        `)
        .eq('grupo_id', group.id);

    if (error) {
        alert("Erro ao buscar passageiros.");
        return;
    }

    const passengers = (passengersData || [])
        .map((item: any) => item.clientes)
        .sort((a: any, b: any) => a.sobrenome.localeCompare(b.sobrenome));

    // Formatar data para impressão
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        if (dateStr.includes('/')) return dateStr;
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    // Criar conteúdo HTML para impressão
    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Emissão Aérea - ${group.nome_grupo}</title>
          <style>
            @media print {
              body { font-family: sans-serif; padding: 20px; font-size: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
              th { background-color: #eee; text-transform: uppercase; }
              h1 { font-size: 18px; margin-bottom: 5px; }
              .header { margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .uppercase { text-transform: uppercase; }
              .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            }
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LISTA PARA EMISSÃO DE BILHETES AÉREOS</h1>
            <p style="font-size: 14px; margin-bottom: 10px;"><strong>GRUPO:</strong> ${group.nome_grupo}</p>
            
            <div class="info-grid">
               <div><strong>ORIGEM:</strong> ${group.origem || '-'}</div>
               <div><strong>DESTINO:</strong> ${group.destino || '-'}</div>
            </div>

            <p><strong>ROTEIRO:</strong> ${group.roteiro || 'N/D'}</p>
            <p><strong>TOTAL PAX:</strong> ${passengers.length}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>SOBRENOME</th>
                <th>NOME</th>
                <th>SEXO</th>
                <th>CPF</th>
                <th>PASSAPORTE</th>
                <th>DATA NASC.</th>
              </tr>
            </thead>
            <tbody>
              ${passengers.map((p: any) => `
                <tr>
                  <td class="uppercase"><strong>${p.sobrenome}</strong></td>
                  <td class="uppercase">${p.nome}</td>
                  <td class="uppercase">${p.sexo}</td>
                  <td>${p.cpf}</td>
                  <td class="uppercase">${p.passaporte || '-'}</td>
                  <td>${formatDate(p.data_nascimento || p.dataNascimento)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          ` + '<' + '/script>' + `
        </body>
      </html>
    `);
    printWindow.document.close();
  };


  // --- Common Handlers ---
  const handleNew = () => {
    if (activeTab === 'clients') setEditingClient(null);
    else if (activeTab === 'trips') setEditingTrip(null);
    else if (activeTab === 'air') setEditingAirGroup(null);
    setMode('form');
  };

  const handleFormSuccess = () => {
    fetchData();
    setMode('list');
    setEditingClient(null);
    setEditingTrip(null);
    setEditingAirGroup(null);
  };

  const handleFormCancel = () => {
    setMode('list');
    setEditingClient(null);
    setEditingTrip(null);
    setEditingAirGroup(null);
  };

  // --- Filtering ---
  const filteredClients = clients.filter(c => 
    (c.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.sobrenome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.cpf || '').includes(searchTerm)
  );

  const filteredTrips = trips.filter(t => 
    (t.nome_viagem?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (t.destino?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const filteredAirGroups = airGroups.filter(g =>
    (g.nome_grupo?.toLowerCase() || '').includes(searchTerm.toLowerCase())
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
    } else if (activeTab === 'trips') {
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
    } else if (activeTab === 'air') {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8 mt-6">
                <AirGroupForm
                    initialData={editingAirGroup}
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
                <p className="text-gray-500">Gerencie clientes, viagens e grupos aéreos.</p>
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
                      {activeTab === 'clients' ? 'Novo Cliente' : activeTab === 'trips' ? 'Nova Viagem' : 'Novo Grupo Aéreo'}
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
                onClick={() => { setActiveTab('air'); setSearchTerm(''); }}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'air' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Plane size={18} />
                Grupos Aéreos
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
                      placeholder={
                          activeTab === 'clients' ? "Buscar por Nome, CPF ou Protocolo..." : 
                          activeTab === 'trips' ? "Buscar por Viagem ou Destino..." :
                          "Buscar Grupo Aéreo..."
                      }
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documentos</th>
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
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex gap-2">
                                                            {client.rg_url && (
                                                                <a 
                                                                    href={client.rg_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-blue-600 hover:text-blue-800 transition-colors p-1 hover:bg-blue-50 rounded"
                                                                    title="Visualizar RG/CNH"
                                                                >
                                                                    <CreditCard size={20} />
                                                                </a>
                                                            )}
                                                            {client.passaporte_url && (
                                                                <a 
                                                                    href={client.passaporte_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer" 
                                                                    className="text-green-600 hover:text-green-800 transition-colors p-1 hover:bg-green-50 rounded"
                                                                    title="Visualizar Passaporte"
                                                                >
                                                                    <Globe size={20} />
                                                                </a>
                                                            )}
                                                            {!client.rg_url && !client.passaporte_url && (
                                                                <span className="text-gray-300 text-xs">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end items-center gap-3">
                                                            <button onClick={() => handleEditClient(client)} className="text-indigo-600 hover:text-indigo-900"><Pencil size={18} /></button>
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
                    // TRIPS LIST
                    <div className="space-y-4">
                        {filteredTrips.length === 0 ? (
                            <div className="bg-white p-12 text-center text-gray-500 rounded-lg border border-gray-200">
                                Nenhuma viagem encontrada. Clique em "Nova Viagem" para começar.
                            </div>
                        ) : (
                            filteredTrips.map(trip => {
                                const todayStr = new Date().toLocaleDateString('en-CA');
                                const tripDateStr = trip.data_ida;
                                const isPast = tripDateStr < todayStr;
                                const isToday = tripDateStr === todayStr;

                                let containerClasses = "rounded-lg shadow-sm border hover:shadow-md transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-4";
                                
                                if (isPast) {
                                    containerClasses += " bg-yellow-50 border-yellow-200";
                                } else {
                                    containerClasses += " bg-green-50 border-green-200";
                                }

                                return (
                                <div key={trip.id} className={containerClasses}>
                                    <div className="flex-grow">
                                         <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-gray-900">{trip.nome_viagem}</h3>
                                            {isPast ? (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800 border border-yellow-300">Realizada</span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-200 text-green-800 border border-green-300">
                                                    {isToday ? 'Hoje' : 'Em Breve'}
                                                </span>
                                            )}
                                         </div>
                                         <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                                            <div className="flex items-center">
                                                <Map size={16} className={`${isPast ? 'text-yellow-600' : 'text-green-600'} mr-1`} />
                                                {trip.origem} <span className="mx-2 text-gray-300">➔</span> {trip.destino}
                                            </div>
                                            
                                            <div className="flex items-center text-gray-500">
                                                <Calendar size={16} className="mr-1.5" />
                                                <span>{formatDateDisplay(trip.data_ida)}</span>
                                                {trip.data_volta && (
                                                    <>
                                                        <span className="mx-2 text-gray-300">até</span>
                                                        <span>{formatDateDisplay(trip.data_volta)}</span>
                                                    </>
                                                )}
                                            </div>
                                         </div>
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-gray-200/50">
                                         <button onClick={() => handleEditTrip(trip)} className="flex-1 md:flex-none px-4 py-2 bg-white/50 border border-gray-300 text-gray-700 rounded-md hover:bg-white transition-colors text-sm font-medium flex items-center justify-center gap-2">
                                            <Pencil size={16} /> Editar
                                         </button>
                                         <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 text-red-600 hover:bg-red-50/50 rounded-md transition-colors border border-transparent hover:border-red-100">
                                            <Trash2 size={18} />
                                         </button>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                )}

                {activeTab === 'air' && (
                    // AIR GROUPS LIST
                    <div className="space-y-4">
                        {filteredAirGroups.length === 0 ? (
                            <div className="bg-white p-12 text-center text-gray-500 rounded-lg border border-gray-200">
                                Nenhum grupo aéreo encontrado. Clique em "Novo Grupo Aéreo" para começar.
                            </div>
                        ) : (
                            filteredAirGroups.map(group => (
                                <div key={group.id} className="rounded-lg shadow-sm border border-blue-200 bg-blue-50 hover:shadow-md transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Plane className="text-primary" size={20} />
                                            <h3 className="text-lg font-bold text-gray-900">{group.nome_grupo}</h3>
                                        </div>
                                        {group.roteiro && (
                                            <p className="text-sm text-gray-600 line-clamp-2">{group.roteiro}</p>
                                        )}
                                        {(group.origem || group.destino) && (
                                            <div className="flex items-center text-xs text-gray-500 mt-2 gap-2">
                                                <Map size={14} />
                                                <span>{group.origem || '?'}</span>
                                                <span className="text-gray-300">➔</span>
                                                <span>{group.destino || '?'}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-blue-200/50">
                                         <button 
                                            onClick={() => generateAirReport(group)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white text-green-700 border border-green-200 rounded-md hover:bg-green-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                            title="Gerar lista para companhia aérea"
                                         >
                                            <Printer size={16} /> Lista Aérea
                                         </button>
                                         
                                         <button 
                                            onClick={() => handleEditAirGroup(group)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white/50 border border-gray-300 text-gray-700 rounded-md hover:bg-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                         >
                                            <Pencil size={16} /> Editar
                                         </button>
                                         
                                         <button 
                                            onClick={() => handleDeleteAirGroup(group.id)}
                                            className="p-2 text-red-600 hover:bg-red-50/50 rounded-md transition-colors border border-transparent hover:border-red-100"
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