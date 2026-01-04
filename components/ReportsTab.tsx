import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../db/database';
import { Trip, Client } from '../types';
import { Printer, FileText, Download, Calendar, MapPin, Users, ChevronRight } from 'lucide-react';

const ReportsTab: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<number | string>('');
  const [reportData, setReportData] = useState<{ trip: Trip; passengers: Client[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

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

  const generateReport = async () => {
    if (!selectedTripId || !supabase) return;
    
    setLoading(true);
    try {
      // 1. Buscar dados da viagem
      const { data: tripData, error: tripError } = await supabase
        .from('viagens')
        .select('*')
        .eq('id', selectedTripId)
        .single();

      if (tripError) throw tripError;

      // 2. Buscar passageiros (Join via tabela de junção)
      // Nota: Supabase retorna os dados aninhados. Ex: { cliente_id: 1, clientes: { ...dados } }
      const { data: passengersData, error: passengersError } = await supabase
        .from('viagem_clientes')
        .select(`
          cliente_id,
          clientes (*)
        `)
        .eq('viagem_id', selectedTripId);

      if (passengersError) throw passengersError;

      // Extrair e formatar os clientes
      const passengers = (passengersData || [])
        .map((item: any) => item.clientes)
        .filter((client: any) => client !== null) // Remove nulos caso cliente tenha sido deletado mas a relação exista
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome)); // Ordem alfabética

      setReportData({
        trip: tripData as Trip,
        passengers: passengers as Client[]
      });

    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      alert("Erro ao gerar relatório. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

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

  const handlePrint = () => {
    const printContent = document.getElementById('printable-report');
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Viagem - ${reportData?.trip.nome_viagem}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none; }
            }
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* SELEÇÃO */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          Gerador de Lista de Passageiros
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Viagem</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectedTripId}
              onChange={(e) => {
                setSelectedTripId(e.target.value);
                setReportData(null); // Limpa relatório anterior ao mudar seleção
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
            onClick={generateReport}
            disabled={!selectedTripId || loading}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? 'Gerando...' : 'Gerar Relatório'}
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* PREVIEW E IMPRESSÃO */}
      {reportData && (
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

          <div id="printable-report" className="bg-white p-8 shadow-lg border border-gray-200 rounded-none max-w-[210mm] mx-auto min-h-[297mm]">
            {/* CABEÇALHO DO RELATÓRIO */}
            <div className="border-b-2 border-primary pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                   <h1 className="text-2xl font-bold text-gray-900 uppercase">Lista de Passageiros</h1>
                   <p className="text-sm text-gray-500">Neto Almudi Viagens</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Data de Emissão</p>
                  <p className="font-mono font-medium">{new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* DADOS DA VIAGEM */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Detalhes da Viagem</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Viagem</p>
                  <p className="font-semibold text-gray-900">{reportData.trip.nome_viagem}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Destino</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1">
                    <MapPin size={12} /> {reportData.trip.destino}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Data Ida</p>
                  <p className="font-semibold text-gray-900 flex items-center gap-1">
                    <Calendar size={12} /> {new Date(reportData.trip.data_ida).toLocaleDateString('pt-BR')} {reportData.trip.hora_ida}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Passageiros</p>
                  <p className="font-semibold text-primary flex items-center gap-1">
                    <Users size={12} /> {reportData.passengers.length}
                  </p>
                </div>
              </div>
              {/* Informação do Contratante, se houver */}
              {reportData.trip.contratante_id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Contratante Responsável</p>
                    <p className="font-bold text-gray-900">
                        {reportData.passengers.find(p => p.id === reportData.trip.contratante_id)?.nome} {reportData.passengers.find(p => p.id === reportData.trip.contratante_id)?.sobrenome}
                    </p>
                  </div>
              )}
            </div>

            {/* TABELA DE PASSAGEIROS */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-xs uppercase text-gray-600">
                  <th className="py-2 px-2 font-bold w-10 text-center">#</th>
                  <th className="py-2 px-2 font-bold">Nome Completo</th>
                  <th className="py-2 px-2 font-bold">CPF</th>
                  <th className="py-2 px-2 font-bold">RG</th>
                  <th className="py-2 px-2 font-bold">Nascimento</th>
                  <th className="py-2 px-2 font-bold text-center">Idade</th>
                  <th className="py-2 px-2 font-bold text-center">Sexo</th>
                  <th className="py-2 px-2 font-bold">Celular</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
                {reportData.passengers.map((passenger, index) => {
                    const isContractor = reportData.trip.contratante_id === passenger.id;
                    return (
                        <tr key={passenger.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-2 text-center text-gray-500 text-xs">{index + 1}</td>
                        <td className="py-2 px-2">
                            <span className={isContractor ? "font-bold text-black" : ""}>
                                {passenger.nome} {passenger.sobrenome}
                            </span>
                            {isContractor && <span className="ml-1 text-[10px] text-gray-500">(Resp.)</span>}
                        </td>
                        <td className="py-2 px-2 font-mono text-xs">{passenger.cpf}</td>
                        <td className="py-2 px-2 font-mono text-xs">{passenger.rg || '-'}</td>
                        <td className="py-2 px-2 text-xs">{passenger.dataNascimento}</td>
                        <td className="py-2 px-2 text-center text-xs">{calculateAge(passenger.dataNascimento)}</td>
                        <td className="py-2 px-2 text-center text-xs">{passenger.sexo}</td>
                        <td className="py-2 px-2 text-xs">{passenger.celular}</td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
            
            <div className="mt-8 pt-8 border-t border-gray-200 flex justify-between text-xs text-gray-400">
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