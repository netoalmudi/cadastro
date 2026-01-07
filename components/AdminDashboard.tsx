import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Client, Trip, AirGroup } from '../types';
import { Search, Plus, Pencil, Trash2, X, RefreshCw, AlertCircle, Users, Map, FileText, Plane, Printer, CreditCard, Globe, Calendar, FileSignature, ChevronLeft, ChevronRight, Bed } from 'lucide-react';
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

  const handleGenerateContract = async (trip: Trip) => {
    // ... (Code omitted for brevity, logic remains the same)
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
              <p>3.7 Responsabilizar-se pelo registro e habilitação dos seus contratados para o serviço, respondendo exclusivamente pelo micro-ônibus e encargos decorrentes dos contratos de trabalho, por toda e qualquer ação trabalhista e/ou indenizatória, bem como por eventuais autuações/multas por parte de órgãos fiscalizadores, quando estas se derem por sua culpa exclusiva;</p>
              <p>3.8 O embarque será realizado no local indicado pelo contrato, desde que os acessos estejam em perfeitas condições de tráfego e segurança para passageiros e tripulação;</p>
              <p>3.9 Conduzir o veículo, respeitando a legislação e as determinações das autoridades de trânsito.</p>
            </div>
  
            <p>4. OBRIGAÇÕES DA CONTRATANTE:</p>
            <div style="margin-left: 20px;">
              <p>4.1 Apresentar a lista de passageiros, até 5 (cinco) dias uteis anteriores a partida, sob pena de cancelamento da viagem sem direito a restituição do sinal pago conforme item 2.3;</p>
              <p>4.2 Instruir os passageiros quanto aos documentos de identificação exigidos na hora do embarque, de acordo com a Resolução 4.308/2014 da ANTT, cujo conteúdo o CONTRATANTE declara ter tomado ciência neste ato;</p>
              <p>4.3 Em especial, quando se tratar de viagem de menores: a) Crianças de colo - até 06 anos incompletos, documento: Certidão de Nascimento; b) Crianças até 12 anos incompletos, documento: CN ou RG; c) Adolescentes de 12 a 18 anos incompletos, documento de identificação: RG;</p>
              <p>4.4 Na lista de passageiros deverão constar os nomes completos, nº do RG ou Passaporte. Em caso de dados incorretos ou omissão de nomes o CONTRATANTE é responsável pelas multas que porventura venham a ocorrer;</p>
              <p>4.5 Contratar o GUIA de TURISMO devidamente credenciado pela CADASTUR para a viagem durante a execução do serviço de deslocamento, o qual compromete-se a zelar pelo bom andamento da viagem;</p>
              <p>4.6 Diligenciar para que todos os passageiros, enquanto em viagem, utilizem cinto de segurança;</p>
              <p>4.7 Reunir todos os passageiros nos locais e horários estabelecidos;</p>
              <p>4.8 Respeitar todas as normas relativas à viagem estabelecidas pela CONTRATANTE;</p>
              <p>4.9 Correrão por conta do CONTRATANTE as despesas relativas a taxas turísticas, obtenção de alvarás e autorização do juizado de menores, estadias, refeições e outras mencionadas com os transportes e suas bagagens;</p>
              <p>4.10 Não será permitido o transporte de passageiros em pé, bem como exceder a lotação oficial do veículo, obedecendo ao Decreto Federal nº 2521/98.</p>
              <p>4.11 Não usar o veículo para outras finalidades que não a de transporte de passageiros;</p>
              <p>4.12 Obter os alvarás e autorizações necessárias nas cidades onde a legislação exige;</p>
              <p>4.13 Arcar com despesas de estacionamento, sendo que não o fazendo, responderá por todo e qualquer prejuízo decorrente da permanência do veículo, quando estacionado em via pública, bem como as demais consequências praticadas por terceiros e vândalos;</p>
              <p>4.14 Solicitar, por escrito, qualquer alteração de data, horário e /ou endereço no mínimo 20 (vinte) dias antes da data da viagem, sendo que tais alterações serão avaliadas conforme disponibilidade da CONTRATADA podendo haver alterações no preço ora ajustado;</p>
              <p>4.15 Reparar todos os danos e extravios ocorridos no veículo, causados pelo CONTRATANTE e/ou por passageiros.</p>
            </div>
  
            <p>5. DISPOSIÇÕES GERAIS</p>
            <div style="margin-left: 20px;">
              <p>5.1 O CONTRATANTE receberá o veículo em condições de funcionamento, conforme lista de vistorias, em caso de danos causados pelos passageiros, a Neto Almudi Viagens fica autorizada a executar em oficina de confiança todos os reparos que se façam necessários para restituir o estado anterior, correndo as despesas por conta do CONTRATANTE;</p>
              <p>5.2 Na forma do artigo 30 do Decreto Federal 2521/98 será recusado o transporte de passageiros que não se identificar quando exigido; se encontre em estado de embriaguez; portar armas; demonstrar incontinência no comportamento; comprometer a segurança, o conforto ou a tranquilidade dos demais passageiros; fizer uso de produtos ilícitos ou proibidos por lei no interior do veículo;</p>
              <p>5.3 A viagem poderá ser cancelada no dia previsto pelos seguintes motivos: fatos da natureza; contra ordem do poder disciplinar (EMBRATUR ANTT DER ou outro) e estradas sem condição de tráfego, falta de pagamento ou descumprimento das disposições contratuais;</p>
              <p>5.4 O presente instrumento passará a ter validade, somente após a assinatura de ambas as partes, não caracterizando em hipótese alguma reserva de veículo quando ausente esta condição;</p>
              <p>5.5 Será permitido o peso máximo de 30 quilos de bagagem por passageiro conforme resolução 1432/2002 ANTT Ultrapassando este limite, responderá o CONTRATANTE pelas multas por excesso de peso, todas as bagagens deverão ser etiquetadas;</p>
              <p>5.6 A CONTRATADA não se responsabilizará pela ausência da CONTRATANTE e seus passageiros nos locais de embarque nos horários estabelecidos;</p>
              <p>5.7 Qualquer tolerância ou omissão em exigir o estrito cumprimento de quaisquer das Clausulas ou condições deste contrato, ou exercer direito delas decorrentes, não constituirá renuncias às mesmas, e não prejudicará a faculdade das partes em exigi-las ou exercê-las a qualquer tempo;</p>
              <p>5.8 Este contrato não estabelece vínculo de qualquer natureza nem envolve responsabilidade solidária e/ou subsidiária entre as partes, bem como seus funcionários ou prepostos, sujeitando-se apenas ao pactuado neste instrumento;</p>
            </div>
  
            <p>6. NETO ALMUDI VIAGENS NÃO SE RESPONSABILIZA:</p>
            <div style="margin-left: 20px;">
              <p>6.1 Por extravios de volumes ou valores que sejam deixados pelos passageiros ou no interior do veículo;</p>
              <p>6.2 Por danos que venham a ocorrer aos passageiros por atraso que se verifica na chegada ao destino ou retorno;</p>
              <p>6.3 Pela relação jurídica existente entre o contratante e os passageiros;</p>
              <p>6.4 Fica eleito o foro da comarca de Porecatu, Estado do Paraná, para nele serem dirimidas todas as questões decorrentes deste contrato, renunciando a contratante, expressamente, a qualquer outro por mais privilegiado que seja.</p>
            </div>
  
            <p>E por estarem justas e contratadas, firmam o presente em duas vias de igual teor e forma.</p>
  
            <div class="footer-location">
               <span class="uppercase">PORECATU, ${new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
  
            <div class="signature-section">
              <div class="signature-box">
                DARIO ALMUDI NETO VIAGENS LTDA<br>
                <span style="font-size: 10pt; color: #888;">(Contratada)</span>
              </div>
              <div class="signature-box">
                <span class="uppercase">${contractor.nome} ${contractor.sobrenome}</span><br>
                <span style="font-size: 10pt; color: #888;">(Contratante)</span>
              </div>
            </div>
            
            <script>
              setTimeout(() => { window.print(); window.close(); }, 800);
            ` + '<' + '/script>' + `
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

  const generateAirReport = async (group: AirGroup) => {
     // ... (Code omitted for brevity, logic remains the same)
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
              body { font-family: sans-serif; padding: 10px; font-size: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              /* Force font size on cells to ensure list is small */
              th, td { 
                border: 1px solid #000; 
                padding: 4px; 
                text-align: left; 
                font-size: 10px !important; 
              }
              th { 
                background-color: #eee; 
                text-transform: uppercase; 
                font-weight: bold; 
              }
              h1 { font-size: 14px; margin-bottom: 5px; }
              p { margin: 2px 0; font-size: 10px; }
              .header { margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
              .uppercase { text-transform: uppercase; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 10px; }
            }
            /* Default styles for preview */
            body { font-family: sans-serif; padding: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
            th { background-color: #f0f0f0; }
            .header { border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LISTA PARA EMISSÃO DE BILHETES AÉREOS</h1>
            <p><strong>GRUPO:</strong> ${group.nome_grupo}</p>
            
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

  // --- Filtering & Pagination ---
  const filteredClients = clients.filter(c => 
    (c.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.sobrenome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (c.cpf || '').includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
                {activeTab !== 'reports' && activeTab !== 'hotels' && (
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
            <button
                onClick={() => { setActiveTab('hotels'); setSearchTerm(''); }}
                className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'hotels' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Bed size={18} />
                Hotéis
            </button>
        </div>

        {/* Search Bar - Hide on Reports and Hotels Tab */}
        {activeTab !== 'reports' && activeTab !== 'hotels' && (
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
        {fetchError && activeTab !== 'reports' && activeTab !== 'hotels' && (
             <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start gap-3 rounded shadow-sm">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                    <p className="font-bold">Erro ao buscar dados</p>
                    <p className="text-sm">{fetchError}</p>
                </div>
            </div>
        )}

        {loading && activeTab !== 'reports' && activeTab !== 'hotels' ? (
             <div className="p-12 flex justify-center items-center text-gray-500 bg-white rounded-lg border border-gray-200">
                <RefreshCw className="animate-spin mr-2" /> Carregando dados...
            </div>
        ) : (
            <>
                {activeTab === 'reports' && (
                  <ReportsTab />
                )}

                {activeTab === 'hotels' && (
                  <HotelsTab />
                )}

                {activeTab === 'clients' && (
                    // CLIENTS TABLE
                    // ... (Conteúdo mantido)
                    <>
                    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                        {filteredClients.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">Nenhum cliente encontrado.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Idade</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Cliente
                                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {filteredClients.length}
                                                </span>
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documentos</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {paginatedClients.map((client) => {
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

                    {/* PAGINATION CONTROLS */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-4 select-none">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            
                            <div className="flex gap-1 overflow-x-auto max-w-[300px] scrollbar-hide">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                                            currentPage === page 
                                            ? 'bg-primary text-white' 
                                            : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                    </>
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
                                         <button 
                                            onClick={() => handleGenerateContract(trip)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                            title="Gerar Contrato de Viagem"
                                         >
                                            <FileSignature size={16} /> Contrato
                                         </button>

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
                                            onClick={() => alert("Funcionalidade em desenvolvimento: Autorização de Débito")}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                            title="Gerar Autorização de Débito"
                                         >
                                            <CreditCard size={16} /> Autorização de Débito
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