
import React, { useMemo, useState, useEffect } from 'react';
import { Appointment, ObservationStatus } from '../types';
import { Download, Printer, Filter, Search, Calendar, FileBarChart2, ChevronDown, UserCheck, ArrowRight } from 'lucide-react';

interface ReportsPageProps {
  allAppointments: Appointment[];
}

const ReportsPage: React.FC<ReportsPageProps> = ({ allAppointments }) => {
  const today = new Date();
  
  // States for Quick Filters
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'));

  // States for Range (Auto-calculated or Manual)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [reportSearch, setReportSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPerito, setSelectedPerito] = useState('');

  // Extract unique peritos for filter dropdown
  const uniquePeritos = useMemo(() => {
    const peritos = Array.from(new Set(allAppointments.map(a => a.perito))).filter(Boolean);
    return peritos.sort();
  }, [allAppointments]);

  // Update dates when Year or Month changes (Preset Logic)
  useEffect(() => {
    if (!selectedYear) return;

    if (selectedMonth === '') {
      // Todos os Meses do Ano Selecionado
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else {
      // Mês Específico
      const firstDay = `${selectedYear}-${selectedMonth}-01`;
      // Hack to get last day of month: Day 0 of next month
      const lastDayDate = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
      const lastDay = `${selectedYear}-${selectedMonth}-${lastDayDate.getDate()}`;
      
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
  }, [selectedYear, selectedMonth]);

  const filteredData = useMemo(() => {
    return allAppointments.filter(apt => {
      const aptDate = apt.data;
      if (!aptDate) return false;

      // Filter Date Range
      if (startDate && aptDate < startDate) return false;
      if (endDate && aptDate > endDate) return false;

      // Filter Status
      if (statusFilter) {
        if (statusFilter === 'PENDING') {
            if (apt.observacao && apt.observacao !== '') return false;
        } else if (apt.observacao !== statusFilter) {
            return false;
        }
      }

      // Filter Perito
      if (selectedPerito && apt.perito !== selectedPerito) return false;

      // Filter Search
      if (reportSearch) {
        const searchLower = reportSearch.toLowerCase();
        const textMatch = 
            apt.periciado?.toLowerCase().includes(searchLower) ||
            apt.perito?.toLowerCase().includes(searchLower) ||
            apt.especialidade?.toLowerCase().includes(searchLower);
        if (!textMatch) return false;
      }

      return true;
    }).sort((a, b) => (a.data > b.data ? 1 : -1));
  }, [allAppointments, startDate, endDate, reportSearch, statusFilter, selectedPerito]);

  const stats = useMemo(() => {
    return {
      total: filteredData.length,
      compareceu: filteredData.filter(a => a.observacao === ObservationStatus.COMPARECEU).length,
      ausente: filteredData.filter(a => a.observacao === ObservationStatus.NAO_COMPARECEU).length,
      falecimento: filteredData.filter(a => a.observacao === ObservationStatus.FALECIMENTO).length,
      pendente: filteredData.filter(a => !a.observacao).length,
    };
  }, [filteredData]);

  const handlePrint = () => {
    window.print();
  };

  const formatDateBR = (dateString: string) => {
    if (!dateString) return '-';
    // Assume YYYY-MM-DD coming from DB
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const handleExportCSV = () => {
    // BOM para Excel reconhecer acentuação
    const BOM = "\uFEFF"; 
    const headers = ['Data', 'Periciado', 'Perito', 'Especialidade', 'Status'];
    
    // Dados Principais
    const dataRows = filteredData.map(apt => [
      formatDateBR(apt.data), 
      `"${apt.periciado}"`, 
      `"${apt.perito}"`,
      `"${apt.especialidade}"`,
      apt.observacao || 'PENDENTE'
    ]);

    // Linhas de Resumo (Footer)
    const summaryRows = [
      ['', '', '', '', ''], // Linha em branco
      ['RESUMO ESTATISTICO', '', '', '', ''],
      ['Compareceu', stats.compareceu, '', '', ''],
      ['Nao Compareceu (Ausente)', stats.ausente, '', '', ''],
      ['Falecimento', stats.falecimento, '', '', ''],
      ['Pendente', stats.pendente, '', '', ''],
      ['TOTAL GERAL', stats.total, '', '', '']
    ];

    const allRows = [...dataRows, ...summaryRows];

    const csvContent = "data:text/csv;charset=utf-8," + BOM
      + headers.join(",") + "\n" 
      + allRows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    // Nome do arquivo amigável
    const periodo = startDate && endDate ? `${startDate}_a_${endDate}` : 'Completo';
    const peritoName = selectedPerito ? `_${selectedPerito.replace(/\s+/g, '_')}` : '';
    link.setAttribute("download", `Relatorio_SIGPEF_${periodo}${peritoName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const years = ['2024', '2025', '2026'];
  const months = [
    { value: '', label: 'Ano Completo' },
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur border border-slate-200 p-6 rounded-[2rem] shadow-sm print:hidden">
        <div className="flex items-center gap-4">
           <div className="bg-blue-100 p-3 rounded-2xl text-blue-900">
             <FileBarChart2 size={24} />
           </div>
           <div>
             <h2 className="text-xl font-black text-blue-900 tracking-tight">Relatório Gerencial</h2>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consulta Detalhada & Exportação</p>
           </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <button 
             onClick={handleExportCSV}
             className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200 active:scale-95"
           >
             <Download size={16} /> <span className="hidden sm:inline">Exportar Excel/CSV</span>
           </button>
           <button 
             onClick={handlePrint}
             className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-300 active:scale-95"
             title="Clique para gerar o PDF através da janela de impressão"
           >
             <Printer size={16} /> <span className="hidden sm:inline">Imprimir / Salvar PDF</span>
           </button>
        </div>
      </div>

      {/* Filters Area - Hidden on Print */}
      <div className="bg-white border-2 border-slate-200 p-6 rounded-[2rem] shadow-sm print:hidden">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            
            {/* 1. SELEÇÃO DE PERÍODO (Ocupa 5 colunas no LG) */}
            <div className="lg:col-span-5 space-y-4">
               
               {/* Predefinição */}
               <div className="grid grid-cols-3 gap-2">
                 <div className="col-span-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Ano Ref.</label>
                    <div className="relative">
                        <select
                          className="w-full bg-slate-100 border-transparent rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-slate-800 appearance-none cursor-pointer"
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(e.target.value)}
                        >
                          {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-3 text-slate-500 pointer-events-none" />
                    </div>
                 </div>
                 <div className="col-span-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Mês (Atalho)</label>
                    <div className="relative">
                        <select
                          className={`w-full border-transparent rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-900 outline-none transition-colors appearance-none cursor-pointer ${selectedMonth === '' ? 'bg-blue-50 text-blue-900' : 'bg-slate-100 text-slate-800'}`}
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-3 text-slate-500 pointer-events-none" />
                    </div>
                 </div>
               </div>

               {/* Intervalo Manual */}
               <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block flex items-center gap-1">
                     <Calendar size={10} /> Intervalo Personalizado
                  </label>
                  <div className="flex items-center gap-2">
                     <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:border-blue-900 focus:outline-none transition-all"
                     />
                     <ArrowRight size={14} className="text-slate-300 shrink-0" />
                     <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 focus:border-blue-900 focus:outline-none transition-all"
                     />
                  </div>
               </div>

            </div>
            
            {/* Divisor Visual (apenas MD+) */}
            <div className="hidden lg:block w-px bg-slate-100 mx-auto h-full"></div>

            {/* 2. FILTROS DE DADOS (Ocupa 6 colunas no LG) */}
            <div className="lg:col-span-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* Filtro de Status */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Status</label>
                      <div className="relative">
                        <select 
                          className="w-full bg-slate-100 border-transparent rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-slate-800 appearance-none cursor-pointer"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="">Todos</option>
                          <option value="PENDING">Pendentes</option>
                          <option value={ObservationStatus.COMPARECEU}>Compareceu</option>
                          <option value={ObservationStatus.NAO_COMPARECEU}>Ausente</option>
                          <option value={ObservationStatus.FALECIMENTO}>Falecimento</option>
                        </select>
                        <Filter className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>

                     {/* Busca Geral */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Busca Textual</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Nome..."
                          className="w-full bg-slate-100 border-transparent rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-slate-800 placeholder-slate-400"
                          value={reportSearch}
                          onChange={(e) => setReportSearch(e.target.value)}
                        />
                        <Search className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>
                </div>

                {/* Filtro de Perito */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Filtrar por Perito</label>
                  <div className="relative">
                    <select 
                      className="w-full bg-slate-100 border-transparent rounded-xl p-3 text-xs font-bold focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-slate-800 appearance-none cursor-pointer"
                      value={selectedPerito}
                      onChange={(e) => setSelectedPerito(e.target.value)}
                    >
                      <option value="">Todos os Peritos</option>
                      {uniquePeritos.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <UserCheck className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={14} />
                  </div>
                </div>
            </div>

         </div>
      </div>

      {/* Summary Cards - Visible on Screen, Hidden on Print (Print uses the Table Footer) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 print:hidden">
         <div className="bg-blue-900 text-white p-4 rounded-xl text-center shadow-lg shadow-blue-900/20">
            <div className="text-2xl font-black">{stats.total}</div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">Total Filtrado</div>
         </div>
         <div className="bg-emerald-600 text-white p-4 rounded-xl text-center shadow-lg shadow-emerald-600/20">
            <div className="text-2xl font-black">{stats.compareceu}</div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">Compareceu</div>
         </div>
         <div className="bg-red-600 text-white p-4 rounded-xl text-center shadow-lg shadow-red-600/20">
            <div className="text-2xl font-black">{stats.ausente}</div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">Ausente</div>
         </div>
         <div className="bg-white border border-slate-200 text-slate-600 p-4 rounded-xl text-center">
            <div className="text-2xl font-black">{stats.pendente}</div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">Pendente</div>
         </div>
         <div className="bg-slate-800 text-white p-4 rounded-xl text-center col-span-2 md:col-span-1">
            <div className="text-2xl font-black">{stats.falecimento}</div>
            <div className="text-[9px] uppercase tracking-widest opacity-70">Falecimento</div>
         </div>
      </div>
      
      {/* Title only for Print */}
      <div className="hidden print:block text-center mb-8">
         <h1 className="text-2xl font-black text-black">RELATÓRIO DE PERÍCIAS</h1>
         {selectedPerito && (
            <h2 className="text-xl font-bold text-slate-800 mt-2 border-b-2 border-black inline-block pb-1">
               PERITO: {selectedPerito.toUpperCase()}
            </h2>
         )}
         <p className="text-sm text-slate-600 uppercase font-bold mt-2">
            Período: {formatDateBR(startDate)} até {formatDateBR(endDate)}
         </p>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-[1.5rem] shadow-sm overflow-hidden border border-slate-200 print:border-none print:shadow-none print:rounded-none">
         
         <div className="hidden md:block overflow-x-auto print:block">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 print:border-black">
                     <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Data</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Periciado</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Especialidade</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest print:text-black">Perito</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center print:text-black">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {filteredData.length > 0 ? (
                    filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors print:break-inside-avoid">
                         <td className="px-6 py-3 text-xs font-bold text-slate-700 tabular-nums border-r border-slate-50 print:border-slate-200 print:text-black">
                            {formatDateBR(row.data)}
                         </td>
                         <td className="px-6 py-3 text-xs font-bold text-slate-800 print:text-black">
                            {row.periciado}
                         </td>
                         <td className="px-6 py-3 text-xs font-medium text-slate-600 print:text-black">
                            {row.especialidade}
                         </td>
                         <td className="px-6 py-3 text-xs font-medium text-slate-600 print:text-black">
                            {row.perito}
                         </td>
                         <td className="px-6 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wide print:border-black print:text-black print:bg-transparent ${
                               !row.observacao ? 'bg-slate-100 text-slate-400 border-slate-200' :
                               row.observacao === ObservationStatus.COMPARECEU ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                               row.observacao === ObservationStatus.NAO_COMPARECEU ? 'bg-red-100 text-red-700 border-red-200' :
                               'bg-slate-800 text-white border-slate-900'
                            }`}>
                               {row.observacao || 'PENDENTE'}
                            </span>
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                       <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm font-bold">
                          Nenhum registro encontrado para este período.
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Mobile Card View */}
         <div className="md:hidden print:hidden">
            {filteredData.length > 0 ? (
              <div className="divide-y divide-slate-100">
                 {filteredData.map((row, idx) => (
                    <div key={idx} className="p-5 flex flex-col gap-3">
                       <div className="flex justify-between items-start">
                          <div>
                             <p className="text-xs font-black text-blue-900">{formatDateBR(row.data)}</p>
                             <h4 className="text-sm font-bold text-slate-800 mt-1">{row.periciado}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wide ${
                               !row.observacao ? 'bg-slate-100 text-slate-400' :
                               row.observacao === ObservationStatus.COMPARECEU ? 'bg-emerald-100 text-emerald-700' :
                               row.observacao === ObservationStatus.NAO_COMPARECEU ? 'bg-red-100 text-red-700' :
                               'bg-slate-800 text-white'
                            }`}>
                               {row.observacao || 'PENDENTE'}
                          </span>
                       </div>
                       <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg">
                          <div>
                             <span className="block text-[9px] font-black uppercase text-slate-400">Especialidade</span>
                             {row.especialidade}
                          </div>
                          <div>
                             <span className="block text-[9px] font-black uppercase text-slate-400">Perito</span>
                             {row.perito}
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
            ) : (
               <div className="p-10 text-center text-slate-400 text-sm font-bold">
                  Nenhum registro encontrado.
               </div>
            )}
         </div>
      </div>

      {/* Resumo Final (Footer) - Visível no PDF e na Tela */}
      <div className="mt-8 pt-6 border-t-2 border-slate-200 break-inside-avoid print:border-black">
         <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 print:text-black">Resumo Estatístico do Período</h3>
         
         <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 print:bg-white print:border-black print:rounded-none">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 print:gap-4">
               <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Compareceram</span>
                  <span className="block text-2xl font-black text-emerald-600 print:text-black">{stats.compareceu}</span>
               </div>
               <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Ausentes</span>
                  <span className="block text-2xl font-black text-red-600 print:text-black">{stats.ausente}</span>
               </div>
               <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Falecimentos</span>
                  <span className="block text-2xl font-black text-slate-700 print:text-black">{stats.falecimento}</span>
               </div>
               <div className="space-y-1">
                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-black">Pendentes</span>
                  <span className="block text-2xl font-black text-slate-400 print:text-black">{stats.pendente}</span>
               </div>
               <div className="space-y-1 pt-4 md:pt-0 md:border-l md:border-slate-200 md:pl-8 print:border-l print:border-black print:pl-4">
                  <span className="block text-[10px] font-black text-blue-900 uppercase tracking-widest print:text-black">Total Geral</span>
                  <span className="block text-3xl font-black text-blue-900 print:text-black">{stats.total}</span>
               </div>
            </div>
         </div>
      </div>
      
      {/* Footer info for report */}
      <div className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest print:block hidden pt-8">
         Relatório gerado em {today.toLocaleString()} • Sistema SIGPEF
      </div>
    </div>
  );
};

export default ReportsPage;
