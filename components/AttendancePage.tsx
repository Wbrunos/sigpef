
import React, { useState, useEffect } from 'react';
import { AttendanceRecord } from '../types';
import { fetchAttendanceRecords, createAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord, logSystemAction } from '../services/api';
import { Clock, MapPin, Save, UserCheck, Briefcase, Plus, Loader2, Edit2, ArrowLeft, Timer, Trash2, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Auth Hook

interface AttendancePageProps {
  availablePeritos: string[];
}

// Função auxiliar para calcular diferença de horas (Formato HH:mm)
const calculateDuration = (start: string, end: string) => {
  if (!start || !end) return null;
  
  try {
    const [hStart, mStart] = start.split(':').map(Number);
    const [hEnd, mEnd] = end.split(':').map(Number);

    const startMinutes = hStart * 60 + mStart;
    const endMinutes = hEnd * 60 + mEnd;

    let diff = endMinutes - startMinutes;

    if (diff < 0) {
       diff += 24 * 60;
    }

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    if (hours === 0 && minutes === 0) return "0m";
    
    let result = "";
    if (hours > 0) result += `${hours}h`;
    if (minutes > 0) result += ` ${minutes}m`;
    
    return result.trim();
  } catch (e) {
    return null;
  }
};

const AttendancePage: React.FC<AttendancePageProps> = ({ availablePeritos }) => {
  const { canEdit, isAdmin, userProfile } = useAuth(); // Permissões e Perfil
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    data_pericia: new Date().toISOString().split('T')[0],
    perito: '',
    vara: '',
    sala: '',
    hora_chegada: '',
    hora_saida: ''
  });

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendanceRecords();
      setRecords(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      data_pericia: new Date().toISOString().split('T')[0],
      perito: '',
      vara: '',
      sala: '',
      hora_chegada: '',
      hora_saida: ''
    });
    setEditingId(null);
  };

  const startEdit = (record: AttendanceRecord) => {
    if (!canEdit) return;
    setEditingId(record.id || null);
    setFormData({
      data_pericia: record.data_pericia,
      perito: record.perito,
      vara: record.vara || '',
      sala: record.sala || '',
      hora_chegada: record.hora_chegada || '',
      hora_saida: record.hora_saida || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    // Permite que Admin OU Editor excluam (canEdit cobre ambos)
    if (!canEdit) {
        alert("Você não tem permissão para excluir registros.");
        return;
    }
    
    if (window.confirm("Tem certeza que deseja excluir este registro? Essa ação não pode ser desfeita.")) {
       // Otimisticamente remove da lista
       const previousRecords = [...records];
       setRecords(prev => prev.filter(r => r.id !== id));
       
       const success = await deleteAttendanceRecord(id);
       
       if (success) {
         if (userProfile?.email) logSystemAction(userProfile.email, 'EXCLUSÃO PRESENÇA', `Excluiu registro ID ${id}`);
       } else {
         // Reverte se der erro
         setRecords(previousRecords);
         alert("Erro ao excluir. Verifique se você tem permissão no sistema.");
       }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    
    // Validação básica
    if (!formData.perito || !formData.data_pericia) {
      alert("Por favor, preencha a Data e o Perito.");
      return;
    }

    setIsSubmitting(true);
    let success = false;

    // CRUCIAL: Converte string vazia "" para null antes de enviar para o banco
    // Bancos SQL rejeitam "" em campos do tipo TIME
    const payload = {
        data_pericia: formData.data_pericia,
        perito: formData.perito,
        vara: formData.vara,
        sala: formData.sala,
        hora_chegada: formData.hora_chegada || null,
        hora_saida: formData.hora_saida || null 
    };

    if (editingId) {
      success = await updateAttendanceRecord(editingId, payload);
      if (success && userProfile?.email) {
        logSystemAction(userProfile.email, 'UPDATE PRESENÇA', `Atualizou presença de ${formData.perito} em ${formData.data_pericia}`);
      }
    } else {
      // @ts-ignore - Supabase aceita insert sem ID
      success = await createAttendanceRecord(payload);
       if (success && userProfile?.email) {
        logSystemAction(userProfile.email, 'CRIAÇÃO PRESENÇA', `Criou presença de ${formData.perito} em ${formData.data_pericia}`);
      }
    }

    setIsSubmitting(false);

    if (success) {
      resetForm();
      loadRecords();
    } else {
      alert("Erro ao processar registro. Verifique a conexão.");
    }
  };

  const handleQuickTime = async (id: number, field: 'hora_chegada' | 'hora_saida') => {
    if (!canEdit) return;
    const now = new Date();
    const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: timeString } : r));
    const success = await updateAttendanceRecord(id, { [field]: timeString });
    
    if (success && userProfile?.email) {
      logSystemAction(userProfile.email, 'PONTO RÁPIDO', `Marcou ${field} como ${timeString} para registro ID ${id}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Registration / Edit Card */}
      <div className={`bg-white border-2 transition-all duration-300 rounded-[2.5rem] shadow-sm p-8 ${editingId ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-100'} ${!canEdit ? 'opacity-60 pointer-events-none' : ''}`}>
        
        {!canEdit && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 backdrop-blur-[1px] rounded-[2.5rem]">
                <div className="bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg">
                    <Lock size={14} /> Somente Leitura
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl transition-colors ${editingId ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {editingId ? <Edit2 size={24} /> : <UserCheck size={24} />}
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${editingId ? 'text-red-700' : 'text-blue-900'}`}>
                {editingId ? 'Editar Registro' : 'Controle de Presença'}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {editingId ? `Editando registro ID #${editingId}` : 'Gestão de entrada e saída de peritos'}
              </p>
            </div>
          </div>
          
          {editingId && (
            <button 
              onClick={resetForm}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeft size={14} /> Cancelar Edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-0">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Perícia</label>
            <input 
              type="date" 
              name="data_pericia"
              required
              className="w-full bg-slate-200 border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-900/5 focus:border-blue-900 outline-none transition-all text-slate-800"
              value={formData.data_pericia}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perito Responsável</label>
            <div className="relative">
              <select 
                name="perito"
                required
                className="w-full bg-slate-200 border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold appearance-none focus:ring-4 focus:ring-blue-900/5 focus:border-blue-900 outline-none transition-all cursor-pointer text-slate-800"
                value={formData.perito}
                onChange={handleInputChange}
              >
                <option value="">Selecione um perito...</option>
                {availablePeritos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <div className="absolute right-4 top-4 pointer-events-none text-slate-500">
                <UserCheck size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vara / Setor</label>
            <div className="relative">
              <input 
                type="text" 
                name="vara"
                placeholder="Ex: 1ª Vara Cível"
                className="w-full bg-slate-200 border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-900/5 focus:border-blue-900 outline-none transition-all text-slate-800 placeholder-slate-400"
                value={formData.vara}
                onChange={handleInputChange}
              />
               <div className="absolute right-4 top-4 pointer-events-none text-slate-500">
                <Briefcase size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sala de Atendimento</label>
            <div className="relative">
              <input 
                type="text" 
                name="sala"
                placeholder="Ex: Sala 02"
                className="w-full bg-slate-200 border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-900/5 focus:border-blue-900 outline-none transition-all text-slate-800 placeholder-slate-400"
                value={formData.sala}
                onChange={handleInputChange}
              />
              <div className="absolute right-4 top-4 pointer-events-none text-slate-500">
                <MapPin size={18} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Chegada</label>
            <div className="relative">
               <input 
                type="time" 
                name="hora_chegada"
                className="w-full bg-slate-200 border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-900/5 focus:border-blue-900 outline-none transition-all text-slate-800"
                value={formData.hora_chegada}
                onChange={handleInputChange}
              />
              <Clock size={16} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Saída (Opcional)</label>
            <div className="relative">
              <input 
                type="time" 
                name="hora_saida"
                className="w-full bg-slate-200 border-2 border-slate-200 rounded-2xl p-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-900/5 focus:border-blue-900 outline-none transition-all text-slate-800"
                value={formData.hora_saida}
                onChange={handleInputChange}
              />
              <Clock size={16} className="absolute right-4 top-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-3 pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full font-black py-5 px-8 rounded-3xl shadow-xl transition-all flex justify-center items-center gap-3 text-xs uppercase tracking-[0.2em] active:scale-[0.98] ${editingId ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200' : 'bg-blue-900 hover:bg-black text-white shadow-blue-200'}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />}
              {editingId ? 'Salvar Alterações' : 'Registrar Nova Presença'}
            </button>
          </div>
        </form>
      </div>

      {/* List Table */}
      <div className="bg-white/70 backdrop-blur border-2 border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="text-lg font-black text-blue-900 flex items-center gap-3 tracking-tight">
            <Clock size={20} className="text-blue-500" /> Histórico de Frequência
          </h3>
          <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
            {records.length} Registros
          </span>
        </div>
        
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-300">
            <Loader2 className="animate-spin mb-4" size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest">Atualizando Histórico...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
                <tr>
                  <th className="px-8 py-5">Data</th>
                  <th className="px-8 py-5">Perito</th>
                  <th className="px-8 py-5">Local</th>
                  <th className="px-4 py-5 text-center">Entrada</th>
                  <th className="px-4 py-5 text-center">Saída</th>
                  <th className="px-4 py-5 text-center">Permanência</th>
                  <th className="px-8 py-5 text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((rec) => {
                  const duration = calculateDuration(rec.hora_chegada, rec.hora_saida);
                  
                  return (
                    <tr key={rec.id} className={`hover:bg-blue-50/30 transition-colors group ${editingId === rec.id ? 'bg-red-50/50' : ''}`}>
                      <td className="px-8 py-6">
                        <span className="text-sm font-black text-blue-900 tabular-nums">
                          {rec.data_pericia ? rec.data_pericia.split('-').reverse().join('/') : '-'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 uppercase">
                             {(rec.perito || '?').charAt(0)}
                           </div>
                           <span className="text-sm font-bold text-slate-800">{rec.perito}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{rec.vara || '-'}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{rec.sala || 'SALA NÃO INFO.'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        {rec.hora_chegada ? (
                          <span className="inline-block bg-emerald-100 text-emerald-700 py-1.5 px-3.5 rounded-xl font-black text-xs tabular-nums">
                            {rec.hora_chegada}
                          </span>
                        ) : (
                          <button 
                            onClick={() => canEdit && rec.id && handleQuickTime(rec.id, 'hora_chegada')}
                            disabled={!canEdit}
                            className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${canEdit ? 'text-blue-500 hover:text-blue-700' : 'text-slate-300 cursor-not-allowed'}`}
                          >
                            Marcar Agora
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-6 text-center">
                         {rec.hora_saida ? (
                          <span className="inline-block bg-slate-200 text-slate-600 py-1.5 px-3.5 rounded-xl font-black text-xs tabular-nums">
                            {rec.hora_saida}
                          </span>
                        ) : (
                          <button 
                            onClick={() => canEdit && rec.id && handleQuickTime(rec.id, 'hora_saida')}
                            disabled={!canEdit}
                            className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${canEdit ? 'text-blue-500 hover:text-blue-700' : 'text-slate-300 cursor-not-allowed'}`}
                          >
                            Marcar Agora
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-6 text-center">
                         {duration ? (
                           <span className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-700 py-1.5 px-3.5 rounded-xl font-black text-xs tabular-nums border border-indigo-200">
                              <Timer size={10} /> {duration}
                           </span>
                         ) : (
                           <span className="text-slate-300 font-bold text-xs">-</span>
                         )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           {/* Botão de EDITAR (Disponível para Editores/Admins) */}
                           {canEdit && (
                             <button 
                              onClick={() => startEdit(rec)}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-95"
                              title="Editar Registro"
                             >
                               <Edit2 size={16} />
                             </button>
                           )}
                           
                           {/* Botão de EXCLUIR (Disponível para Editores/Admins) */}
                           {canEdit && (
                             <button 
                              onClick={() => rec.id && handleDelete(rec.id)}
                              className="p-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-95"
                              title="Excluir Registro"
                             >
                               <Trash2 size={16} />
                             </button>
                           )}
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
    </div>
  );
};

export default AttendancePage;
