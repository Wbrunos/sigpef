
import React from 'react';
import { Search, Filter, X, Calendar, Activity, User, ChevronDown } from 'lucide-react';
import { ObservationStatus } from '../types';

interface FiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  peritoFilter: string;
  setPeritoFilter: (val: string) => void;
  specialtyFilter: string;
  setSpecialtyFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  yearFilter: string;
  setYearFilter: (val: string) => void;
  monthFilter: string;
  setMonthFilter: (val: string) => void;
  dayFilter: string;
  setDayFilter: (val: string) => void;
  uniquePeritos: string[];
  uniqueSpecialties: string[];
  clearFilters: () => void;
}

const Filters: React.FC<FiltersProps> = ({
  searchTerm, setSearchTerm,
  peritoFilter, setPeritoFilter,
  specialtyFilter, setSpecialtyFilter,
  statusFilter, setStatusFilter,
  yearFilter, setYearFilter,
  monthFilter, setMonthFilter,
  dayFilter, setDayFilter,
  uniquePeritos, uniqueSpecialties,
  clearFilters
}) => {
  const years = ['2024', '2025', '2026'];
  const months = [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' }, { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' }, { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const hasActiveFilters = searchTerm || peritoFilter || specialtyFilter || statusFilter || dayFilter;

  return (
    <div className="space-y-4 mb-8">
      {/* Search Bar - Principal */}
      <div className="flex flex-col lg:flex-row gap-2">
        <div className="flex-grow relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-900 transition-colors">
            <Search size={18} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por nome do periciado..."
            className="block w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900/50 transition-all shadow-sm text-blue-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center justify-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white bg-red-700 hover:bg-red-800 rounded-2xl transition-all shadow-md shadow-red-700/20 active:scale-95 shrink-0"
          >
            <X size={14} strokeWidth={3} /> Limpar
          </button>
        )}
      </div>

      {/* Grid de Filtros Inteligentes */}
      <div className="bg-white/70 backdrop-blur-xl border border-slate-200 rounded-[2rem] p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Coluna Mês/Dia (Prioritária) */}
           <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-black text-blue-900 uppercase tracking-widest ml-1">
              <Calendar size={12} strokeWidth={2.5} /> Data da Pauta
            </h4>
            <div className="grid grid-cols-2 gap-2">
               {/* Seleção de Dia */}
               <div className="relative">
                 <select
                    className={`block w-full pl-2 pr-6 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none transition-all cursor-pointer border-2 ${dayFilter ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                  >
                    <option value="">Dia</option>
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-3 text-slate-500 pointer-events-none" />
               </div>

                {/* Seleção de Mês */}
               <div className="relative">
                <select
                  className="block w-full pl-2 pr-6 py-2.5 bg-blue-50 border-2 border-blue-100 rounded-xl text-xs font-black focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none text-blue-900 hover:bg-blue-100 transition-all cursor-pointer"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {months.map((m) => (
                    <option key={m.value} value={m.value}>{m.label.substring(0,3)}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-3 text-blue-800 pointer-events-none" />
              </div>
            </div>
            
            <div className="relative">
                <select
                  className="block w-full pl-3 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-blue-900 appearance-none text-slate-600 hover:bg-slate-200 transition-all cursor-pointer"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>Ano {y}</option>
                  ))}
                </select>
                <ChevronDown size={10} className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Coluna Profissional */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              <User size={12} strokeWidth={2.5} /> Profissional
            </h4>
            <div className="space-y-2">
              <div className="relative">
                <select
                  className="block w-full pl-3 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                  value={peritoFilter}
                  onChange={(e) => setPeritoFilter(e.target.value)}
                >
                  <option value="">Todos os Peritos</option>
                  {uniquePeritos.map((perito) => (
                    <option key={perito} value={perito}>{perito}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  className="block w-full pl-3 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                  value={specialtyFilter}
                  onChange={(e) => setSpecialtyFilter(e.target.value)}
                >
                  <option value="">Todas Especialidades</option>
                  {uniqueSpecialties.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Coluna Status */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              <Activity size={12} strokeWidth={2.5} /> Status
            </h4>
            <div className="relative">
              <select
                className="block w-full pl-3 pr-8 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos os Status</option>
                <option value="PENDENTE">PENDENTE</option>
                <option value={ObservationStatus.COMPARECEU}>COMPARECEU</option>
                <option value={ObservationStatus.NAO_COMPARECEU}>AUSENTE</option>
                <option value={ObservationStatus.FALECIMENTO}>FALECIMENTO</option>
              </select>
              <Filter size={12} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Filters;
