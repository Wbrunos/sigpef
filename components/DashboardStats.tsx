
import React from 'react';
import { Stats } from '../types';
import { ClipboardList, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface DashboardStatsProps {
  stats: Stats;
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; colorClass: string; iconBgClass: string; subtitle?: string }> = ({ 
  title, value, icon, colorClass, iconBgClass, subtitle 
}) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md h-full relative overflow-hidden group">
    <div className="relative z-10">
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em] mb-1">{title}</p>
      <h3 className={`text-3xl font-black ${colorClass} tracking-tighter`}>{value}</h3>
      {subtitle && <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{subtitle}</p>}
    </div>
    <div className={`p-4 rounded-2xl ${iconBgClass} bg-opacity-10 shrink-0 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
  </div>
);

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total na Pauta" 
          value={stats.total} 
          icon={<ClipboardList size={24} className="text-blue-900" />} 
          colorClass="text-blue-900"
          iconBgClass="bg-blue-100"
          subtitle="Agendamentos Filtrados"
        />
        <StatCard 
          title="Pendentes" 
          value={stats.pending} 
          icon={<Clock size={24} className="text-amber-500" />} 
          colorClass="text-amber-600"
          iconBgClass="bg-amber-100"
          subtitle="Aguardando Realização"
        />
        <StatCard 
          title="Concluídos" 
          value={stats.completed} 
          icon={<CheckCircle size={24} className="text-emerald-600" />} 
          colorClass="text-emerald-700"
          iconBgClass="bg-emerald-100"
          subtitle="Perícias Finalizadas"
        />
        
        {/* Card de Performance Visual */}
        <div className="bg-blue-900 rounded-[2rem] p-6 shadow-xl shadow-blue-900/20 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 text-white rotate-12">
               <TrendingUp size={120} />
            </div>
            <div className="relative z-10">
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.15em] mb-2">Aproveitamento</p>
                <div className="flex items-end gap-2">
                    <h3 className="text-4xl font-black text-white tracking-tighter">{completionRate}%</h3>
                    <div className="mb-1 text-blue-300 font-bold text-[10px] uppercase tracking-widest">Taxa de Realização</div>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-2 bg-blue-800 rounded-full mt-4 overflow-hidden border border-blue-700">
                    <div 
                      className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                      style={{ width: `${completionRate}%` }}
                    ></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
