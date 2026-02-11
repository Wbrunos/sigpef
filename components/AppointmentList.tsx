
import React from 'react';
import { Appointment, ObservationStatus } from '../types';
import { Edit2, User, Calendar, Stethoscope, AlertCircle, CheckCircle, Clock, Lock, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AppointmentListProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return dateString;
  } catch (e) {
    return dateString;
  }
};

const getStatusStyles = (status: string) => {
  const upperStatus = status?.toUpperCase() || '';
  
  if (upperStatus === 'COMPARECEU') {
    return {
      row: "bg-emerald-50/60 hover:bg-emerald-100/80 border-emerald-100",
      card: "bg-emerald-50 border-emerald-200 shadow-emerald-100/50",
      badge: "bg-emerald-600 text-white border-emerald-700",
      icon: <CheckCircle size={12} className="mr-1.5" />,
      label: "COMPARECEU",
      accent: "bg-emerald-600",
      textColor: "text-emerald-900",
      subTextColor: "text-emerald-700/70"
    };
  }
  
  if (upperStatus === 'NAO COMPARECEU' || upperStatus === 'AUSENTE') {
    return {
      row: "bg-red-50/60 hover:bg-red-100/80 border-red-100",
      card: "bg-red-50 border-red-200 shadow-red-100/50",
      badge: "bg-red-600 text-white border-red-700",
      icon: <AlertCircle size={12} className="mr-1.5" />,
      label: "AUSENTE",
      accent: "bg-red-600",
      textColor: "text-red-900",
      subTextColor: "text-red-700/70"
    };
  }

  if (upperStatus === 'FALECIMENTO') {
    return {
      row: "bg-slate-100 hover:bg-slate-200 border-slate-200",
      card: "bg-slate-100 border-slate-300 shadow-slate-200/50",
      badge: "bg-slate-800 text-white border-slate-900",
      icon: <User size={12} className="mr-1.5" />,
      label: "FALECIMENTO",
      accent: "bg-slate-800",
      textColor: "text-slate-900",
      subTextColor: "text-slate-600"
    };
  }

  return {
    row: "bg-white hover:bg-blue-50/40 border-slate-200",
    card: "bg-white border-slate-200 shadow-slate-100/50",
    badge: "bg-slate-100 text-slate-500 border-slate-200",
    icon: <Clock size={12} className="mr-1.5" />,
    label: "PENDENTE",
    accent: "bg-blue-900",
    textColor: "text-slate-900",
    subTextColor: "text-slate-400"
  };
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = getStatusStyles(status);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-sm ${styles.badge}`}>
      {styles.icon} {styles.label}
    </span>
  );
};

// Componente de Linha Memoizado para performance
const AppointmentRow = React.memo(({ apt, onEdit, canEdit }: { apt: Appointment, onEdit: (a: Appointment) => void, canEdit: boolean }) => {
  const styles = getStatusStyles(apt.observacao);
  return (
    <tr 
      className={`${styles.row} transition-all duration-300 cursor-pointer group border-b relative`}
      onClick={() => onEdit(apt)}
    >
      <td className="px-6 py-5 whitespace-nowrap text-sm font-black tabular-nums text-slate-900">
        <div className="flex items-center gap-4">
          <div className={`w-1.5 h-6 rounded-full ${styles.accent} transition-all group-hover:h-10 group-hover:w-2`}></div>
          {formatDate(apt.data)}
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className={`text-sm font-bold ${styles.textColor} group-hover:translate-x-1 transition-transform`}>{apt.periciado}</div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${styles.textColor}`}>{apt.especialidade}</span>
          <span className={`text-[11px] flex items-center gap-1 font-bold uppercase tracking-tight ${styles.subTextColor}`}>
            <Stethoscope size={10} className={styles.accent} /> {apt.perito}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <StatusBadge status={apt.observacao} />
      </td>
      <td className="px-6 py-5 whitespace-nowrap text-right">
        <div className={`flex items-center justify-end gap-2 text-[10px] font-black uppercase tracking-widest ${styles.subTextColor} group-hover:text-blue-900 transition-colors`}>
          {canEdit ? 'Editar' : 'Ver'}
          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </td>
    </tr>
  );
});

const AppointmentList: React.FC<AppointmentListProps> = ({ appointments, onEdit }) => {
  const { canEdit } = useAuth();

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white/50 backdrop-blur border-2 border-dashed border-slate-200 rounded-[3rem] text-center animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-full mb-6 text-slate-200 shadow-sm">
          <Calendar size={64} strokeWidth={1} />
        </div>
        <h3 className="text-2xl font-black text-slate-700 tracking-tight">Pauta Vazia</h3>
        <p className="text-slate-400 text-sm mt-2 font-bold max-w-xs mx-auto">Nenhum registro encontrado para os filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-sm transition-all">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Data</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Periciado</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Especialidade / Perito</th>
              <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Situação</th>
              <th className="px-8 py-5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {appointments.map((apt) => (
              <AppointmentRow key={apt.rowId} apt={apt} onEdit={onEdit} canEdit={canEdit} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {appointments.map((apt, index) => {
          const styles = getStatusStyles(apt.observacao);
          return (
            <div 
              key={apt.rowId}
              onClick={() => onEdit(apt)}
              className={`p-6 rounded-[2rem] shadow-sm border transition-all active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-300 ${styles.card}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                   <div className={`w-1.5 h-4 rounded-full ${styles.accent}`}></div>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${styles.subTextColor}`}>
                    {formatDate(apt.data)}
                   </span>
                </div>
                <StatusBadge status={apt.observacao} />
              </div>
              
              <h3 className={`text-xl font-black mb-4 leading-tight tracking-tight ${styles.textColor}`}>{apt.periciado}</h3>
              
              <div className={`grid grid-cols-1 gap-3 pt-5 border-t ${apt.observacao ? 'border-black/5' : 'border-slate-50'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${styles.subTextColor}`}>Especialidade</span>
                  <span className={`text-xs font-bold ${styles.textColor}`}>{apt.especialidade}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${styles.subTextColor}`}>Perito</span>
                  <span className={`text-xs font-bold ${styles.textColor}`}>{apt.perito}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AppointmentList;
