import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Client } from '../types';
import { Search, Plus, Pencil, Trash2, X, RefreshCw, AlertCircle } from 'lucide-react';
import ClientForm from './ClientForm';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchClients = async () => {
    if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
    }

    setLoading(true);
    setFetchError(null);
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar clientes:", error);
        setFetchError("Erro ao conectar com o banco de dados. Verifique o console para mais detalhes.");
      } else {
        // Mapeamento dos campos do banco (snake_case) para a interface (camelCase)
        // Isso é necessário porque o banco usa 'data_nascimento' e a aplicação 'dataNascimento'
        const mappedData: Client[] = (data || []).map((item: any) => ({
          ...item,
          dataNascimento: item.data_nascimento || item.dataNascimento,
          ufRg: item.uf_rg || item.ufRg,
        }));
        
        setClients(mappedData);
        console.log("Clientes carregados:", mappedData);
      }
    } catch (err: any) {
      console.error("Exceção ao buscar clientes:", err);
      setFetchError("Ocorreu um erro inesperado ao buscar os dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDelete = async (id: number) => {
    if (!isSupabaseConfigured || !supabase) return;
    
    if (window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      
      if (error) {
        alert("Erro ao excluir cliente: " + error.message);
      } else {
        setClients(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setView('form');
  };

  const handleNew = () => {
    setEditingClient(null);
    setView('form');
  };

  const handleFormSuccess = () => {
    fetchClients();
    setView('list');
    setEditingClient(null);
  };

  const handleFormCancel = () => {
    setView('list');
    setEditingClient(null);
  };

  const filteredClients = clients.filter(client => 
    (client.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (client.sobrenome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (client.cpf || '').includes(searchTerm) ||
    (client.protocolo || '').includes(searchTerm)
  );

  if (view === 'form') {
    return (
      <ClientForm 
        initialData={editingClient} 
        onSuccess={handleFormSuccess} 
        onCancel={handleFormCancel}
        isAdmin={true}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Clientes</h1>
                <p className="text-gray-500">Administre os cadastros recebidos.</p>
            </div>
            <div className="flex gap-3">
                 <button 
                    onClick={onLogout}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                    Sair
                </button>
                <button 
                    onClick={handleNew}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    Novo Cliente
                </button>
            </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Buscar por Nome, CPF ou Protocolo..." 
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
                onClick={fetchClients} 
                className="p-2 text-gray-500 hover:text-primary hover:bg-blue-50 rounded-full transition-colors"
                title="Atualizar lista"
            >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* Error Message */}
        {fetchError && (
             <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3 rounded shadow-sm">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                    <p className="font-bold">Erro ao buscar dados</p>
                    <p className="text-sm">{fetchError}</p>
                </div>
            </div>
        )}

        {/* Table Content */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            {loading ? (
                <div className="p-12 flex justify-center items-center text-gray-500">
                    <RefreshCw className="animate-spin mr-2" /> Carregando dados...
                </div>
            ) : filteredClients.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                    <p className="text-lg font-medium text-gray-600 mb-2">
                        {searchTerm ? "Nenhum cliente encontrado para sua busca." : "Nenhum registro encontrado."}
                    </p>
                    
                    {!searchTerm && !fetchError && (
                        <div className="mt-6 max-w-lg mx-auto bg-blue-50 p-4 rounded-lg border border-blue-100 text-left">
                            <p className="text-sm text-blue-800 font-bold mb-2 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Dica de Solução de Problemas (Supabase):
                            </p>
                            <p className="text-sm text-blue-700 mb-2">
                                Se você já cadastrou clientes mas eles não aparecem aqui, é provável que as 
                                <strong> Políticas de Segurança (RLS)</strong> do seu banco de dados estejam bloqueando a leitura.
                            </p>
                            <ul className="list-disc list-inside text-xs text-blue-600 space-y-1">
                                <li>Acesse o painel do Supabase {'>'} Table Editor {'>'} clientes.</li>
                                <li>Verifique se há dados na tabela.</li>
                                <li>Se houver dados, vá em Authentication {'>'} Policies.</li>
                                <li>Adicione uma política para habilitar "SELECT" para o role "anon" ou "public".</li>
                            </ul>
                        </div>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocolo</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documentos</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClients.map((client) => (
                                <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono font-medium text-primary">{client.protocolo}</div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(client.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {client.nome ? client.nome.charAt(0) : '?'}{client.sobrenome ? client.sobrenome.charAt(0) : ''}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{client.nome} {client.sobrenome}</div>
                                                <div className="text-sm text-gray-500">{client.cpf}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex space-x-2">
                                            {client.rg_url ? (
                                                <a href={client.rg_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full border border-green-200 hover:bg-green-200 transition-colors">RG</a>
                                            ) : (
                                                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full border border-gray-200">S/ RG</span>
                                            )}
                                            {client.passaporte_url ? (
                                                <a href={client.passaporte_url} target="_blank" rel="noopener noreferrer" className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full border border-purple-200 hover:bg-purple-200 transition-colors">Passaporte</a>
                                            ) : (
                                                <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full border border-gray-200">S/ Pass</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{client.celular}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-[150px]">{client.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => handleEdit(client)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4" 
                                            title="Editar"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(client.id)}
                                            className="text-red-600 hover:text-red-900" 
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
        <div className="mt-4 text-xs text-gray-400 text-center">
             Exibindo {filteredClients.length} registro(s).
        </div>
    </div>
  );
};

export default AdminDashboard;