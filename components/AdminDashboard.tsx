import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Client, Trip, AirGroup } from '../types';
import { Search, Plus, Pencil, Trash2, X, RefreshCw, AlertCircle, Users, Map, FileText, Plane, Printer, CreditCard, Globe, Calendar, FileSignature, ChevronLeft, ChevronRight, Bed, MapPin } from 'lucide-react';
import ClientForm from './ClientForm';
import TripForm from './TripForm';
import AirGroupForm from './AirGroupForm';
import ReportsTab from './ReportsTab';
import HotelsTab from './HotelsTab';
import { formatCurrency, numberToExtenso } from '../utils/currencyUtils';

interface AdminDashboardProps {
  onLogout: () => void;
}

type TabView = 'clients' | 'trips' | 'air' | 'reports' | 'hotels';
type EditMode = 'list' | 'form';

const ITEMS_PER_PAGE = 7;

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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

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

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

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

  const handleGenerateContract = async (trip: Trip) => {
    if (!trip.contratante_id) {
        alert("Esta viagem não possui um Contratante definido. Edite a viagem e defina um Contratante (ícone de estrela na lista de passageiros).");
        return;
      }
  
      if (!supabase) return;
  
      // Buscar dados do contratante
      const { data: clientData, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', trip.contratante_id)
        .single();
  
      if (error || !clientData) {
        alert("Erro ao buscar dados do contratante.");
        return;
      }
  
      const contractor: Client = {
          ...clientData,
          dataNascimento: clientData.data_nascimento || clientData.dataNascimento,
          ufRg: clientData.uf_rg || clientData.ufRg,
      };
  
      // Calcular valores
      const dias = Number(trip.dias_total) || 0;
      const km = Number(trip.km_total) || 0;
      const valDiaria = Number(trip.valor_diaria) || 0;
      const valKm = Number(trip.valor_km) || 0;
      const valGuia = Number(trip.valor_guia) || 0;
      const totalGeral = (dias * valDiaria) + (km * valKm) + (dias * valGuia);
  
      const valorExtenso = numberToExtenso(totalGeral);
      
      // Formatar datas
      const dtIda = formatDateDisplay(trip.data_ida);
      const dtVolta = formatDateDisplay(trip.data_volta);
  
      // Gerar número do contrato baseado na data atual: AAAAMMDD
      const today = new Date();
      const contractNumber = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
      const printWindow = window.open('', '', 'width=900,height=800');
      if (!printWindow) return;
  
      printWindow.document.write(`
        <html>
          <head>
            <title>Contrato - ${trip.nome_viagem}</title>
            <style>
              @page { margin: 15mm; size: A4; }
              body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.15; color: #000; padding: 0; margin: 0; }
              .header-info { text-align: right; margin-bottom: 10px; font-size: 9pt; }
              h1 { font-size: 11pt; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
              p { text-align: justify; margin-bottom: 8px; }
              .uppercase { text-transform: uppercase; }
              .bold { font-weight: bold; }
              .signature-section { margin-top: 30px; display: flex; justify-content: space-between; gap: 20px; }
              .signature-box { width: 45%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 10pt; }
              .footer-location { text-align: right; margin-top: 20px; margin-bottom: 20px; }
              ul { margin: 0; padding-left: 20px; }
              li { text-align: justify; margin-bottom: 5px; }
            </style>
          </head>
          <body>
            <div class="header-info">
              Número: ${contractNumber}
            </div>
  
            <h1>CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRANSPORTE DE PASSAGEIROS NO REGIME DE FRETAMENTO EXCLUSIVO</h1>
  
            <p>
              <span class="bold">CONTRATADA:</span> DARIO ALMUDI NETO VIAGENS LTDA, pessoa jurídica de direito privado, inscrita no CNPJ: 28.623.289/0001-14, Inscrição Estadual: 91077391-70, com sede na Rua Presidente Castelo Branco, 983, Jardim São João, Porecatu, estado do Paraná, CEP 86160-000, doravante denominada CONTRATADA;
            </p>
  
            <p>
              <span class="bold">CONTRATANTE:</span> <span class="uppercase bold">${contractor.nome} ${contractor.sobrenome}</span>, RG: ${contractor.rg || 'N/I'} ${contractor.ufRg || ''} - CPF: ${contractor.cpf}, ENDEREÇO: ${contractor.endereco || ''}, N° ${contractor.numero || ''}, BAIRRO: ${contractor.bairro || ''}, CEP: ${contractor.cep || ''} - CIDADE: ${contractor.cidade || ''} - ESTADO: ${contractor.estado || ''}, doravante denominada CONTRATANTE;
            </p>
  
            <p>As partes acima qualificadas resolvem celebrar o presente Contrato de Prestação de Serviços de Transporte de Passageiros sob o Regime de Fretamento Turístico Exclusivo, o qual será regido pelas cláusulas e condições a seguir estabelecidas:</p>
  
            <p>1. A CONTRATADA prestará à CONTRATANTE serviço de transporte de passageiros, sob o regime de fretamento turístico exclusivo, a ser realizado em MICRO-ÔNIBUS DE 9 lugares de placa QTM9F23 da marca Mercedez Benz modelo 416 Marticar de acordo com as características abaixo:</p>
  
            <div style="margin-left: 20px;">
              <p>1.1 Itinerário da viagem: <span class="uppercase bold">${trip.origem} X ${trip.destino}</span> – DATA DA SAÍDA: ${dtIda} HORA DA SAÍDA: ${trip.hora_ida || '___:___'} - DATA DO RETORNO: ${dtVolta} HORA DO RETORNO: ${trip.hora_volta || '___:___'}</p>
              <p>1.2 Roteiro da viagem: ${trip.roteiro || 'Conforme combinado'}</p>
              <p>1.3 Local de embarque: casas particulares de cada viajante.</p>
            </div>
  
            <p>2. DO PREÇO, DA CONDIÇÃO DE PAGAMENTO e DAS DESPESAS DE VIAGEM:</p>
  
            <div style="margin-left: 20px;">
              <p>2.1 Pela presente prestação de serviços de fretamento ora contratado, o CONTRATANTE pagará à CONTRATADA a importância de <span class="bold">${formatCurrency(totalGeral)} (${valorExtenso})</span>. O valor corresponde o roteiro descrito em anexo, no qual já consta a franquia extra de translado.</p>
              <p>2.2 A importância descrita no item 2.1, será quitada da seguinte forma pela CONTRATANTE: Forma/Condição Pagto: Depósito a vista com vencimento em: ${dtIda} Valor: <span class="bold">${formatCurrency(totalGeral)} (${valorExtenso})</span></p>
              <p>2.3 Em ocorrendo por parte da CONTRATANTE: a) descumprimento do “Item 2.2”; e b) não devolução do contrato assinado em até quatro dias após a data da emissão, que se dará sempre na data do encaminhamento – considera-se rescindido o presente contrato sem a necessidade de qualquer aviso ao contratante e sem prejuízo do “Item 2.4”</p>
              <p>2.4 Se após o pagamento estipulado no item 2.2 “a”, ocorrer: cancelamento, adiantamento da viagem, ausência de documentos por parte do contratante, ou outro fato que venha impedir a autorização de viagem pelo órgão competente, o valor que trata o item 2.2 “a” não será devolvido à Contratante, sendo o mesmo considerado como ressarcimento de despesas suportadas pela Contratada por tornar o veículo indisponível para demais fretamentos.</p>
              <p>2.5 Independentemente do valor estipulado na cláusula 2.1, ficará a cargo da CONTRATANTE as despesas com alimentação e hospedagem do(s) motorista(s) durante o período de prestação de serviços, bem como taxas turísticas e despesas com estacionamento do veículo.</p>
              <p>2.6 Havendo alteração do roteiro por parte do contratante, além do valor acima estipulado, o contratante pagará à contratada o valor de 7 (nove reais) por Km que venha exceder ao roteiro, o que será aferido ao final da viagem, sendo que essa diferença deverá ser quitada no prazo de 15 dias, contados do término da viagem, ficando desde já autorizado a emissão de cobrança.</p>
              <p>2.7 Se a duração da viagem ultrapassar o limite de dias aqui estipulados, por motivos alheios à vontade da contratada, o contratante deverá pagar diárias, no valor de 500,00 (quinhentos reais) sem prejuízo da cobrança da quilometragem excedente;</p>
              <p>2.8 O pagamento fora dos prazos estabelecidos nesse contrato acarretará a aplicação de correção monetária com base no INPC – IBGE, juros moratórios de 1% (um por cento) ao mês, multa de 2% (dois por cento) sobre o valor inadimplido, até a data do efetivo pagamento.</p>
            </div>
  
            <p>3. OBRIGAÇÃO DA CONTRATADA:</p>
            <div style="margin-left: 20px;">
              <p>3.1 Compromete-se a realizar a viagem nos horários e dias previstos;</p>
              <p>3.2 Fornecer o veículo em conformidade atendendo a todas as exigências de ordem legal;</p>
              <p>3.3 Arcar com todas as despesas de mão-de-obra, lubrificantes, peças e manutenção necessários à execução dos serviços objeto deste instrumento;</p>
              <p>3.4 Manter seguro de danos pessoais, previsto no Código Nacional de Trânsito;</p>
              <p>3.5 Substituir no prazo determinado pela Resolução 1166/2002 ANTT o micro-ônibus que não apresente condições de transporte, por avaria mecânica ou qualquer outro motivo, onde quer que estes se encontrem, prosseguindo na condução das pessoas transportadas;</p>
              <p>3.6 Fornecer condutores devidamente capacitados e habilitados que observem rigorosamente as disposições legais e regulamentares no que se refere à condução do ônibus, bem como trajados e identificados, e em condições de higiene pessoal;</p>
              <p>3.7 Responsabilizar-se pelo registro e habilitação dos seus contratados para o serviço, respondendo exclusivamente pelo micro-ônibus e encargos decorrentes dos contratos de trabalho, por toda e qualquer ação trabalhista e/ou indenizatória, bem como as multas por parte de órgãos fiscalizadores, quando estas se derem por sua culpa exclusiva;</p>
              <p>3.8 O embarque será realizado no local indicado pelo contrato, desde que os acessos estejam em perfeitas condições de tráfego e segurança para passageiros e tripulação;</p>
              <p>3.9 Conduzir o veículo, respeitando a legislação e as determinações das autoridades de trânsito.</p>
            </div>
  
            <p>4. OBRIGAÇÕES DA CONTRATANTE:</p>
            <div style="margin-left: 20px;">
              <p>4.1 Apresentar a lista de passageiros, até 5 (cinco) dias uteis anteriores a partida, sob pena de cancelamento da viagem sem direito a restituição do sinal pago conforme item 2.3;</p>
              <p>4.2 Instruir os passageiros quanto aos documentos de identificação exigidos na hora do embarque, de acordo com a Resolução 4.308/2014 da ANTT, cujo conteúdo o CONTRATANTE declara ter tomado ciência neste ato;</p>
              <p>4.3 Em especial, quando se tratar de viagem de menores: a) Crianças de colo - até 06 anos incompletos, documento: Certidão de Nascimento; b) Crianças até 12 anos incompletos, documento: CN ou RG; c) Adolescentes de 12 a 18 anos incompletos, documento de identificação: RG;</p>
              <p>4.4 Na lista de passageiros deverão constar os nomes completos, nº do RG ou Passaporte. Em caso de dados incorretos ou omissão de nomes o CONTRATANTE é responsável pelas multas que porventura venham a ocorrer;</p>
              <p>4.5 Contratar o GUIA de TURISMO devidamente credenciado pela CADASTUR para a viagem durante a execução do serviço de deslocamento, o qual compromete-se a zelar pelo bom andamento da viagem.</p>
            </div>

            <div class="signature-section">
                <div class="signature-box">
                <span class="bold">CONTRATADA</span><br>
                DARIO ALMUDI NETO VIAGENS LTDA
                </div>
                <div class="signature-box">
                <span class="bold">CONTRATANTE</span><br>
                ${contractor.nome} ${contractor.sobrenome}
                </div>
            </div>

          </body>
        </html>
      `);
      printWindow.document.close();
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

  const handlePrintAirList = async (group: AirGroup) => {
    if (!supabase) return;
    
    // Fetch passengers
    const { data, error } = await supabase
      .from('grupo_aereo_clientes')
      .select('cliente_id, clientes(*)')
      .eq('grupo_id', group.id);

    if (error) {
      alert("Erro ao buscar passageiros.");
      return;
    }

    const passengers = data.map((d: any) => d.clientes).sort((a: any, b: any) => a.nome.localeCompare(b.nome));

    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Lista Aérea - ${group.nome_grupo}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            h2 { font-size: 14px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h1>${group.nome_grupo}</h1>
          <h2>${group.origem || 'Origem'} ✈ ${group.destino || 'Destino'}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome Completo</th>
                <th>CPF</th>
                <th>Passaporte</th>
                <th>Data Nasc.</th>
              </tr>
            </thead>
            <tbody>
              ${passengers.map((p: any, i: number) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${p.nome} ${p.sobrenome}</td>
                  <td>${p.cpf}</td>
                  <td>${p.passaporte || '-'}</td>
                  <td>${p.data_nascimento || p.dataNascimento || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // --- Render Helpers ---

  // Pagination Logic
  const filterData = () => {
    const term = searchTerm.toLowerCase();
    if (activeTab === 'clients') {
      return clients.filter(c => c.nome.toLowerCase().includes(term) || c.sobrenome.toLowerCase().includes(term) || c.cpf.includes(term));
    } else if (activeTab === 'trips') {
      return trips.filter(t => t.nome_viagem.toLowerCase().includes(term));
    } else if (activeTab === 'air') {
      return airGroups.filter(g => g.nome_grupo.toLowerCase().includes(term));
    }
    return [];
  };

  const filteredItems = filterData();
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const currentItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleLogout = () => {
    if (window.confirm("Deseja sair da área administrativa?")) {
        onLogout();
    }
  };

  // If in Form Mode
  if (mode === 'form') {
    if (activeTab === 'clients') {
        return <ClientForm initialData={editingClient} onSuccess={() => { fetchData(); setMode('list'); }} onCancel={() => setMode('list')} isAdmin={true} />;
    }
    if (activeTab === 'trips') {
        return <TripForm initialData={editingTrip} availableClients={clients} onSuccess={() => { fetchData(); setMode('list'); }} onCancel={() => setMode('list')} />;
    }
    if (activeTab === 'air') {
        return <AirGroupForm initialData={editingAirGroup} availableClients={clients} onSuccess={() => { fetchData(); setMode('list'); }} onCancel={() => setMode('list')} />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 flex items-center">
                       {/* Logo or Title */}
                       <span className="text-xl font-bold text-gray-800">Painel Administrativo</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={fetchData} className="p-2 text-gray-400 hover:text-primary transition-colors" title="Atualizar Dados">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleLogout} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100">
                        Sair
                    </button>
                </div>
            </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6 overflow-x-auto">
            <button onClick={() => setActiveTab('clients')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'clients' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <div className="flex items-center justify-center gap-2"><Users size={16}/> Clientes</div>
            </button>
            <button onClick={() => setActiveTab('trips')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'trips' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <div className="flex items-center justify-center gap-2"><Map size={16}/> Viagens</div>
            </button>
            <button onClick={() => setActiveTab('air')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'air' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <div className="flex items-center justify-center gap-2"><Plane size={16}/> Grupos Aéreos</div>
            </button>
            <button onClick={() => setActiveTab('reports')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'reports' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <div className="flex items-center justify-center gap-2"><FileText size={16}/> Relatórios</div>
            </button>
            <button onClick={() => setActiveTab('hotels')} className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${activeTab === 'hotels' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <div className="flex items-center justify-center gap-2"><Bed size={16}/> Hotéis</div>
            </button>
        </div>

        {/* Search Bar & Add Button */}
        {(activeTab === 'clients' || activeTab === 'trips' || activeTab === 'air') && (
            <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder={
                            activeTab === 'clients' ? "Buscar por nome ou CPF..." :
                            activeTab === 'trips' ? "Buscar viagem..." : "Buscar grupo aéreo..."
                        }
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                </div>
                <button 
                    onClick={() => {
                        if (activeTab === 'clients') { setEditingClient(null); setMode('form'); }
                        if (activeTab === 'trips') { setEditingTrip(null); setMode('form'); }
                        if (activeTab === 'air') { setEditingAirGroup(null); setMode('form'); }
                    }}
                    className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <Plus size={20} />
                    {activeTab === 'clients' ? 'Novo Cliente' : activeTab === 'trips' ? 'Nova Viagem' : 'Novo Grupo Aéreo'}
                </button>
            </div>
        )}

        {/* Loading / Error */}
        {loading && <div className="text-center py-10"><RefreshCw className="animate-spin mx-auto text-primary mb-2" />Carregando dados...</div>}
        {fetchError && <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 border border-red-200 flex items-center gap-2"><AlertCircle size={20}/>{fetchError}</div>}

        {/* LISTS */}
        {!loading && !fetchError && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                
                {/* --- CLIENTS LIST --- */}
                {activeTab === 'clients' && (
                    <div className="divide-y divide-gray-100">
                        {currentItems.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</div> : 
                        (currentItems as Client[]).map(client => (
                            <div key={client.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 text-primary flex items-center justify-center font-bold">
                                        {client.nome.charAt(0)}{client.sobrenome.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{client.nome} {client.sobrenome}</h3>
                                        <div className="text-sm text-gray-500 flex gap-4">
                                            <span>CPF: {client.cpf}</span>
                                            <span>{client.cidade}/{client.estado}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditClient(client)} className="text-gray-400 hover:text-primary p-2 transition-colors"><Pencil size={18}/></button>
                                    <button onClick={() => handleDeleteClient(client.id)} className="text-gray-400 hover:text-red-600 p-2 transition-colors"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- TRIPS LIST --- */}
                {activeTab === 'trips' && (
                    <div className="divide-y divide-gray-100">
                         {currentItems.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhuma viagem encontrada.</div> : 
                        (currentItems as Trip[]).map(trip => (
                            <div key={trip.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <MapPin size={16} className="text-primary" /> {trip.nome_viagem}
                                    </h3>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-3">
                                        <span>{formatDateDisplay(trip.data_ida)} ➜ {formatDateDisplay(trip.data_volta)}</span>
                                        <span>• {trip.destino}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => handleGenerateContract(trip)} className="px-3 py-1 text-xs border border-blue-200 text-blue-600 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-1">
                                        <FileSignature size={14} /> Contrato
                                    </button>
                                    <button onClick={() => handleEditTrip(trip)} className="text-gray-400 hover:text-primary p-2"><Pencil size={18}/></button>
                                    <button onClick={() => handleDeleteTrip(trip.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* --- AIR GROUPS LIST --- */}
                {activeTab === 'air' && (
                    <div className="divide-y divide-gray-100">
                         {currentItems.length === 0 ? <div className="p-8 text-center text-gray-500">Nenhum grupo encontrado.</div> : 
                        (currentItems as AirGroup[]).map(group => (
                            <div key={group.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Plane size={16} className="text-primary" /> {group.nome_grupo}
                                    </h3>
                                    <div className="text-sm text-gray-500 mt-1 flex gap-3">
                                        <span>{group.origem || 'Origem'} ✈ {group.destino || 'Destino'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => handlePrintAirList(group)} className="px-3 py-1 text-xs border border-green-200 text-green-700 bg-green-50 rounded hover:bg-green-100 flex items-center gap-1">
                                        <Printer size={14} /> Lista Aérea
                                    </button>
                                    
                                    {/* NEW BUTTON */}
                                    <button 
                                        onClick={() => alert("Funcionalidade em desenvolvimento: Autorização de Débito")}
                                        className="px-3 py-1 text-xs border border-blue-200 text-blue-700 bg-blue-50 rounded hover:bg-blue-100 flex items-center gap-1"
                                    >
                                        <CreditCard size={14} /> Autorização de Débito
                                    </button>

                                    <button onClick={() => handleEditAirGroup(group)} className="text-gray-400 hover:text-primary p-2"><Pencil size={18}/></button>
                                    <button onClick={() => handleDeleteAirGroup(group.id)} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* --- REPORTS TAB --- */}
                {activeTab === 'reports' && (
                    <div className="p-4">
                        <ReportsTab />
                    </div>
                )}

                {/* --- HOTELS TAB --- */}
                {activeTab === 'hotels' && (
                    <div className="p-4">
                        <HotelsTab />
                    </div>
                )}
            </div>
        )}

        {/* Pagination Controls */}
        {!loading && filteredItems.length > ITEMS_PER_PAGE && activeTab !== 'reports' && activeTab !== 'hotels' && (
            <div className="flex justify-center mt-6 gap-2">
                <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-50"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="px-4 py-2 text-sm text-gray-600 flex items-center">
                    Página {currentPage} de {totalPages}
                </span>
                <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-md border border-gray-300 bg-white disabled:opacity-50"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;