
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Trip, Client, Hotel } from '../types';
import { Printer, FileText, Calendar, MapPin, Users, ChevronRight, Clock, Cake, PartyPopper, Building2, Globe, ArrowRight } from 'lucide-react';

type ReportType = 'trip' | 'birthday' | 'hotel';

const months = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const ReportsTab: React.FC = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('trip');
  
  // Trip Report State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | string>('');
  const [tripReportData, setTripReportData] = useState<{ trip: Trip; passengers: Client[] } | null>(null);
  
  // Birthday Report State
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [birthdayClients, setBirthdayClients] = useState<Client[] | null>(null);

  // Hotel Report State
  const [hotelCountries, setHotelCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [hotelReportData, setHotelReportData] = useState<any[] | null>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  // Fetch unique countries when switching to Hotel tab
  useEffect(() => {
    if (activeReport === 'hotel') {
        fetchHotelCountries();
    }
  }, [activeReport]);

  const fetchTrips = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    
    const { data, error } = await supabase
      .from('viagens')
      .select('*')
      .order('data_ida', { ascending: false });

    if (!error && data) {
      setTrips(data as Trip[]);
    }
  };

  const fetchHotelCountries = async () => {
    if (!isSupabaseConfigured || !supabase) return;

    // Fetch all countries to create a distinct list
    const { data, error } = await supabase
        .from('hoteis')
        .select('pais')
        .neq('pais', null)
        .neq('pais', ''); // Ensure valid strings

    if (!error && data) {
        // Extract unique countries
        // Explicitly cast to string[] to resolve TS error
        const countries = Array.from(new Set(data.map((item: any) => String(item.pais)))).sort() as string[];
        setHotelCountries(countries);
    }
  };

  // --- LOGIC: TRIP REPORT ---
  const generateTripReport = async () => {
    if (!selectedTripId || !supabase) return;
    
    setLoading(true);
    try {
      const { data: tripData, error: tripError } = await supabase
        .from('viagens')
        .select('*')
        .eq('id', selectedTripId)
        .single();

      if (tripError) throw tripError;

      const { data: passengersData, error: passengersError } = await supabase
        .from('viagem_clientes')
        .select(`
          cliente_id,
          clientes (*)
        `)
        .eq('viagem_id', selectedTripId);

      if (passengersError) throw passengersError;

      const passengers = (passengersData || [])
        .map((item: any) => {
            const c = item.clientes;
            return {
                ...c,
                dataNascimento: c.data_nascimento || c.dataNascimento,
                ufRg: c.uf_rg || c.ufRg,
            };
        })
        .filter((client: any) => client !== null)
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome));

      setTripReportData({
        trip: tripData as Trip,
        passengers: passengers as Client[]
      });
      setBirthdayClients(null); 
      setHotelReportData(null);

    } catch (error) {
      console.error("Erro ao gerar relatório de viagem:", error);
      alert("Erro ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIC: BIRTHDAY REPORT ---
  const generateBirthdayReport = async () => {
    if (!selectedMonth || !supabase) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome');

      if (error) throw error;

      const clients = (data || []).map((item: any) => ({
        ...item,
        dataNascimento: item.data_nascimento || item.dataNascimento,
        ufRg: item.uf_rg || item.ufRg,
      }));

      // Filter by month
      const birthdays = clients.filter((client: Client) => {
        if (!client.dataNascimento) return false;
        
        let month = '';
        
        if (client.dataNascimento.includes('/')) {
            const parts = client.dataNascimento.split('/');
            if (parts.length === 3) month = parts[1];
        } 
        else if (client.dataNascimento.includes('-')) {
            const parts = client.dataNascimento.split('-');
            if (parts.length === 3) month = parts[1];
        }

        return month === selectedMonth;
      });

      // Sort by Day
      birthdays.sort((a: Client, b: Client) => {
         const getDay = (dateStr: string) => {
            if (dateStr.includes('/')) return parseInt(dateStr.split('/')[0]);
            if (dateStr.includes('-')) return parseInt(dateStr.split('-')[2]);
            return 99;
         };
         return getDay(a.dataNascimento) - getDay(b.dataNascimento);
      });

      setBirthdayClients(birthdays);
      setTripReportData(null);
      setHotelReportData(null);

    } catch (error) {
        console.error("Erro ao gerar relatório de aniversariantes:", error);
        alert("Erro ao buscar aniversariantes.");
    } finally {
        setLoading(false);
    }
  };

  // --- LOGIC: HOTEL REPORT ---
  const generateHotelReport = async () => {
      if (!selectedCountry || !supabase) return;
      setLoading(true);

      try {
          // Fetch hotels filtered by country and order by check_in DESC
          // Also fetch related trip or group name using Supabase relational query
          const { data, error } = await supabase
            .from('hoteis')
            .select(`
                *,
                viagens (nome_viagem),
                grupos_aereos (nome_grupo)
            `)
            .eq('pais', selectedCountry)
            .order('check_in', { ascending: false }); // Do mais recente para o mais antigo

          if (error) throw error;

          setHotelReportData(data);
          setTripReportData(null);
          setBirthdayClients(null);

      } catch (error) {
          console.error("Erro ao gerar relatório de hotéis:", error);
          alert("Erro ao buscar hotéis.");
      } finally {
          setLoading(false);
      }
  };


  // --- UTILS ---
  const calculateAge = (birthDate: string | undefined) => {
    if (!birthDate) return '';
    let dateObj: Date;
    if (birthDate.includes('/')) {
        const [day, month, year] = birthDate.split('/');
        dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    } else {
        dateObj = new Date(birthDate);
    }
    if (isNaN(dateObj.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dateObj.getFullYear();
    const monthDiff = today.getMonth() - dateObj.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateObj.getDate())) {
        age--;
    }
    return age;
  };

  const formatBirthDay = (dateStr: string) => {
     if (!dateStr) return '';
     if (dateStr.includes('/')) return dateStr.substring(0, 5); // DD/MM
     if (dateStr.includes('-')) {
         const parts = dateStr.split('-');
         return `${parts[2]}/${parts[1]}`;
     }
     return dateStr;
  };

  const formatDateFull = (dateStr: string) => {
      if (!dateStr) return '-';
      if (dateStr.includes('/')) return dateStr;
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return dateStr;
  }

  const formatCurrency = (val: number | string, currency: 'BRL' | 'EUR') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(num);
  };

  // --- PRINT HANDLERS ---
  const handlePrint = () => {
    const printContent = document.getElementById('printable-area');
    if (!printContent) return;

    let title = "Relatório";
    if (activeReport === 'trip') title = `Relatório de Viagem - ${tripReportData?.trip.nome_viagem}`;
    else if (activeReport === 'birthday') title = `Aniversariantes - ${months.find(m => m.value === selectedMonth)?.label}`;
    else if (activeReport === 'hotel') title = `Hotéis - ${selectedCountry}`;

    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; margin: 0; padding: 10px; }
              .no-print { display: none; }
              @page { margin: 10mm; size: A4; }
            }
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          ` + '<' + '/script>' + `
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* TABS SWITCHER */}
      <div className="flex space-x-4 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => { setActiveReport('trip'); setBirthdayClients(null); setHotelReportData(null); }}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeReport === 'trip' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={18} />
            Lista de Passageiros
          </button>
          <button
            onClick={() => { setActiveReport('birthday'); setTripReportData(null); setHotelReportData(null); }}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeReport === 'birthday' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Cake size={18} />
            Aniversariantes
          </button>
          <button
            onClick={() => { setActiveReport('hotel'); setTripReportData(null); setBirthdayClients(null); }}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeReport === 'hotel' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 size={18} />
            Hotéis por País
          </button>
      </div>

      {/* TRIP REPORT CONTROLS */}
      {activeReport === 'trip' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Gerar Lista de Viagem</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Viagem</label>
                <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                value={selectedTripId}
                onChange={(e) => {
                    setSelectedTripId(e.target.value);
                    setTripReportData(null);
                }}
                >
                <option value="">-- Selecione --</option>
                {trips.map(trip => (
                    <option key={trip.id} value={trip.id}>
                    {new Date(trip.data_ida).toLocaleDateString('pt-BR')} - {trip.nome_viagem} ({trip.destino})
                    </option>
                ))}
                </select>
            </div>
            
            <button
                onClick={generateTripReport}
                disabled={!selectedTripId || loading}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading ? 'Gerando...' : 'Gerar Relatório'}
                <ChevronRight size={16} />
            </button>
            </div>
        </div>
      )}

      {/* BIRTHDAY REPORT CONTROLS */}
      {activeReport === 'birthday' && (
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PartyPopper className="text-primary" size={20} />
                Gerar Lista de Aniversariantes
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Mês</label>
                    <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                    value={selectedMonth}
                    onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setBirthdayClients(null);
                    }}
                    >
                    <option value="">-- Selecione --</option>
                    {months.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                    </select>
                </div>
                
                <button
                    onClick={generateBirthdayReport}
                    disabled={!selectedMonth || loading}
                    className="px-6 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? 'Buscando...' : 'Buscar Aniversariantes'}
                    <ChevronRight size={16} />
                </button>
            </div>
         </div>
      )}

      {/* HOTEL REPORT CONTROLS */}
      {activeReport === 'hotel' && (
         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Globe className="text-primary" size={20} />
                Relatório de Hotéis
            </h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o País</label>
                    <select
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                        value={selectedCountry}
                        onChange={(e) => {
                            setSelectedCountry(e.target.value);
                            setHotelReportData(null);
                        }}
                    >
                        <option value="">-- Selecione um País --</option>
                        {hotelCountries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
                    {hotelCountries.length === 0 && (
                        <p className="text-xs text-gray-400 mt-1">Nenhum país cadastrado nos hotéis.</p>
                    )}
                </div>
                
                <button
                    onClick={generateHotelReport}
                    disabled={!selectedCountry || loading}
                    className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? 'Buscando...' : 'Gerar Relatório'}
                    <ChevronRight size={16} />
                </button>
            </div>
         </div>
      )}

      {/* REPORT PREVIEW AREA */}
      {(tripReportData || birthdayClients || hotelReportData) && (
        <div className="animate-fade-in">
          <div className="flex justify-end mb-4">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 shadow-sm"
            >
              <Printer size={18} />
              Imprimir / Salvar PDF
            </button>
          </div>

          <div id="printable-area" className="bg-white p-8 shadow-lg border border-gray-200 rounded-none max-w-[210mm] mx-auto min-h-[297mm]">
            
            {/* HEADER PADRÃO */}
            <div className="border-b-2 border-primary pb-2 mb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 uppercase">
                            {tripReportData ? 'Relatório de Viagem' : 
                             birthdayClients ? 'Relatório de Aniversariantes' : 
                             'Histórico de Hotéis'}
                        </h1>
                        <p className="text-xs text-gray-500">Neto Almudi Viagens</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500">Emissão</p>
                        <p className="font-mono text-xs font-medium">{new Date().toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            </div>
            
            {/* TRIP REPORT VIEW */}
            {tripReportData && (
                <>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-6 text-xs">
                        <div className="flex justify-between items-start mb-3 border-b border-gray-200 pb-2">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Viagem</p>
                                <p className="font-bold text-sm text-gray-900">{tripReportData.trip.nome_viagem}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-500 uppercase">Total Passageiros</p>
                                <p className="font-bold text-sm text-primary flex items-center justify-end gap-1">
                                    <Users size={12} /> {tripReportData.passengers.length}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Cidade de Origem</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-1">
                                    <MapPin size={10} /> {tripReportData.trip.origem}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Cidade de Destino</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-1">
                                    <MapPin size={10} /> {tripReportData.trip.destino}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Data/Hora Partida</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-1">
                                    <Calendar size={10} /> 
                                    {new Date(tripReportData.trip.data_ida).toLocaleDateString('pt-BR') || '-'} 
                                    <Clock size={10} className="ml-1" /> {tripReportData.trip.hora_ida}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase">Data/Hora Retorno</p>
                                <p className="font-semibold text-gray-900 flex items-center gap-1">
                                    <Calendar size={10} /> 
                                    {tripReportData.trip.data_volta ? new Date(tripReportData.trip.data_volta).toLocaleDateString('pt-BR') : '-'} 
                                    <Clock size={10} className="ml-1" /> {tripReportData.trip.hora_volta || '-'}
                                </p>
                            </div>
                        </div>

                        {tripReportData.trip.roteiro && (
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <p className="text-[10px] text-gray-500 uppercase mb-1">Roteiro Detalhado</p>
                                <div className="font-medium text-gray-800 whitespace-pre-wrap leading-snug bg-white p-2 rounded border border-gray-200">
                                    {tripReportData.trip.roteiro}
                                </div>
                            </div>
                        )}
                        
                        {tripReportData.trip.contratante_id && (
                            <div className="mt-3 pt-2 border-t border-gray-200">
                                <p className="text-[10px] text-gray-500 uppercase">Contratante Responsável</p>
                                <p className="font-bold text-gray-900">
                                    {tripReportData.passengers.find(p => p.id === tripReportData.trip.contratante_id)?.nome} {tripReportData.passengers.find(p => p.id === tripReportData.trip.contratante_id)?.sobrenome}
                                </p>
                            </div>
                        )}
                    </div>

                    <h2 className="text-sm font-bold text-gray-800 mb-2 uppercase border-b pb-1">Lista de Passageiros</h2>

                    <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-200 text-[10px] uppercase text-gray-600">
                        <th className="py-1 px-1 font-bold w-8 text-center">#</th>
                        <th className="py-1 px-1 font-bold">Nome Completo</th>
                        <th className="py-1 px-1 font-bold">CPF</th>
                        <th className="py-1 px-1 font-bold">RG</th>
                        <th className="py-1 px-1 font-bold text-center">Nascimento</th>
                        <th className="py-1 px-1 font-bold text-center">Idade</th>
                        <th className="py-1 px-1 font-bold">Celular</th>
                        </tr>
                    </thead>
                    <tbody className="text-[10px] text-gray-700 divide-y divide-gray-200">
                        {tripReportData.passengers.map((passenger, index) => {
                            const isContractor = tripReportData.trip.contratante_id === passenger.id;
                            const birthDateFormatted = formatDateFull(passenger.dataNascimento);

                            return (
                                <tr key={passenger.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="py-1 px-1 text-center text-gray-500">{index + 1}</td>
                                <td className="py-1 px-1">
                                    <span className={isContractor ? "font-bold text-black" : ""}>
                                        {passenger.nome} {passenger.sobrenome}
                                    </span>
                                    {isContractor && <span className="ml-1 text-[9px] text-gray-500 font-normal">(Resp.)</span>}
                                </td>
                                <td className="py-1 px-1 font-mono">{passenger.cpf}</td>
                                <td className="py-1 px-1 font-mono">{passenger.rg || '-'}</td>
                                <td className="py-1 px-1 text-center">{birthDateFormatted}</td>
                                <td className="py-1 px-1 text-center">{calculateAge(passenger.dataNascimento)}</td>
                                <td className="py-1 px-1">{passenger.celular}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                </>
            )}

            {/* BIRTHDAY REPORT VIEW */}
            {birthdayClients && (
                <>
                    <div className="bg-pink-50 p-4 rounded mb-6 flex items-center gap-3 border border-pink-100">
                        <Cake className="text-pink-500" size={24} />
                        <div>
                            <p className="text-xs uppercase text-pink-500 font-bold">Mês Selecionado</p>
                            <h2 className="text-xl font-bold text-gray-900">{months.find(m => m.value === selectedMonth)?.label}</h2>
                        </div>
                    </div>

                    {birthdayClients.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-gray-100">
                            Nenhum aniversariante encontrado para este mês.
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-gray-600">
                                Total de Aniversariantes: <span className="font-bold text-gray-900">{birthdayClients.length}</span>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-pink-50 border-b border-pink-200 text-[10px] uppercase text-pink-800">
                                        <th className="py-2 px-2 font-bold w-16 text-center">Dia</th>
                                        <th className="py-2 px-2 font-bold">Nome Completo</th>
                                        <th className="py-2 px-2 font-bold text-center">Data Nasc.</th>
                                        <th className="py-2 px-2 font-bold text-center">Idade Completa</th>
                                        <th className="py-2 px-2 font-bold">Contato (Celular)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px] text-gray-700 divide-y divide-gray-100">
                                    {birthdayClients.map((client, index) => {
                                        const age = calculateAge(client.dataNascimento);
                                        const dayMonth = formatBirthDay(client.dataNascimento);
                                        const day = dayMonth.split('/')[0];
                                        
                                        return (
                                            <tr key={client.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="py-2 px-2 text-center font-bold text-pink-600 text-lg">{day}</td>
                                                <td className="py-2 px-2 font-medium">
                                                    {client.nome} {client.sobrenome}
                                                </td>
                                                <td className="py-2 px-2 text-center">{formatDateFull(client.dataNascimento)}</td>
                                                <td className="py-2 px-2 text-center">
                                                    {typeof age === 'number' ? `${age} anos` : '-'}
                                                </td>
                                                <td className="py-2 px-2">{client.celular}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}
                </>
            )}

            {/* HOTEL REPORT VIEW */}
            {hotelReportData && (
                <>
                    <div className="bg-blue-50 p-4 rounded mb-6 flex items-center gap-3 border border-blue-100">
                        <Globe className="text-primary" size={24} />
                        <div>
                            <p className="text-xs uppercase text-primary font-bold">País Filtrado</p>
                            <h2 className="text-xl font-bold text-gray-900">{selectedCountry}</h2>
                        </div>
                    </div>

                    {hotelReportData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 bg-gray-50 rounded border border-gray-100">
                            Nenhum hotel encontrado para este país.
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-200 text-[10px] uppercase text-gray-600">
                                        <th className="py-2 px-2 font-bold">Hotel</th>
                                        <th className="py-2 px-2 font-bold">Check-in / Check-out</th>
                                        <th className="py-2 px-2 font-bold">Vínculo (Viagem/Grupo)</th>
                                        <th className="py-2 px-2 font-bold text-right">Valor (R$)</th>
                                        <th className="py-2 px-2 font-bold text-right">Valor (€)</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px] text-gray-700 divide-y divide-gray-100">
                                    {hotelReportData.map((hotel, index) => {
                                        const vinculo = hotel.viagens?.nome_viagem 
                                            ? `Viagem: ${hotel.viagens.nome_viagem}` 
                                            : hotel.grupos_aereos?.nome_grupo 
                                                ? `Grupo: ${hotel.grupos_aereos.nome_grupo}` 
                                                : '-';
                                        
                                        return (
                                            <tr key={hotel.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="py-2 px-2 font-bold">{hotel.nome_hotel}</td>
                                                <td className="py-2 px-2">
                                                    <div className="flex items-center gap-1">
                                                        {formatDateFull(hotel.check_in)} 
                                                        <ArrowRight size={10} className="text-gray-400" />
                                                        {formatDateFull(hotel.check_out)}
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 text-gray-500 italic">{vinculo}</td>
                                                <td className="py-2 px-2 text-right font-mono">{formatCurrency(hotel.valor_total_brl, 'BRL')}</td>
                                                <td className="py-2 px-2 text-right font-mono">{formatCurrency(hotel.valor_total_eur, 'EUR')}</td>
                                            </tr>
                                        );
                                    })}
                                    
                                    {/* Footer Totais */}
                                    <tr className="bg-gray-100 font-bold border-t border-gray-300">
                                        <td colSpan={3} className="py-2 px-2 text-right text-gray-600 uppercase">Totais</td>
                                        <td className="py-2 px-2 text-right text-green-700">
                                            {formatCurrency(hotelReportData.reduce((acc, h) => acc + Number(h.valor_total_brl), 0), 'BRL')}
                                        </td>
                                        <td className="py-2 px-2 text-right text-blue-700">
                                            {formatCurrency(hotelReportData.reduce((acc, h) => acc + Number(h.valor_total_eur), 0), 'EUR')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="text-[9px] text-gray-400 mt-2 text-right">
                                * Ordenado pela data de check-in mais recente.
                            </p>
                        </>
                    )}
                </>
            )}
            
            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between text-[10px] text-gray-400">
                <span>Relatório gerado pelo sistema Neto Almudi Viagens</span>
                <span>Página 1 de 1</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
