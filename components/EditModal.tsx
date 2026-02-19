
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, ObservationStatus } from '../types';
import { X, Save, Loader2, User, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { logSystemAction } from '../services/api'; 
import { useAuth } from '../contexts/AuthContext';
import { BADGE_EXPIRATION_DATE } from '../constants';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSave: (rowId: number | string, data: { observacao: string; periciado: string }) => Promise<void>;
  onDelete: (rowId: number | string) => Promise<void>;
}

const EditModal: React.FC<EditModalProps> = ({ isOpen, onClose, appointment, onSave, onDelete }) => {
  const { userProfile, isAdmin } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [periciadoName, setPericiadoName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (appointment) {
      setSelectedStatus(appointment.observacao || '');
      setPericiadoName(appointment.periciado || '');
    }
  }, [appointment]);

  const showNewBadge = useMemo(() => {
    return new Date() < new Date(BADGE_EXPIRATION_DATE);
  }, []);

  if (!isOpen || !appointment) return null;

  const handleSave = async () => {
    if (!periciadoName.trim()) {
      alert("O nome do periciado não pode ficar vazio.");
      return;
    }

    setIsSaving(true);
    
    // Normalização para maiúsculas antes de enviar
    const normalizedName = periciadoName.trim().toUpperCase();
    const normalizedStatus = selectedStatus.trim().toUpperCase();

    await onSave(appointment.rowId, { 
      observacao: normalizedStatus, 
      periciado: normalizedName 
    });
    
    if (userProfile?.email) {
      const changedName = normalizedName !== appointment.periciado;
      const changedStatus = normalizedStatus !== (appointment.observacao || '');
      
      let logDetail = '';
      if (changedName && changedStatus) logDetail = `Alterou nome para '${normalizedName}' e status para '${normalizedStatus}'`;
      else if (changedName) logDetail = `Corrigiu nome de '${appointment.periciado}' para '${normalizedName}'`;
      else logDetail = `Alterou status de '${appointment.periciado}' para '${normalizedStatus || 'PENDENTE'}'`;

      await logSystemAction(
        userProfile.email, 
        'EDIÇÃO PERÍCIA', 
        logDetail
      );
    }

    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
     const confirmMsg = `ATENÇÃO: Você está prestes a excluir PERMANENTEMENTE o agendamento de:\n\n${periciadoName}\nData: ${appointment.data}\n\nTem certeza absoluta que deseja continuar?`;
     
     if (window.confirm(confirmMsg)) {
        setIsDeleting(true);
        await onDelete(appointment.rowId);
        setIsDeleting(false);
     }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Editar Agendamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <User size={12} /> Nome do Periciado
            </label>
            <div className="relative group">
              <input 
                type="text"
                value={periciadoName}
                onChange={(e) => setPericiadoName(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all shadow-sm uppercase"
                placeholder="NOME DO PERICIADO"
              />
              <Pencil className="absolute right-4 top-3.5 text-slate-300 pointer-events-none group-focus-within:text-blue-900" size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
             <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data</label>
              <p className="text-sm font-bold text-slate-700">{appointment.data}</p>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Especialidade</label>
              <p className="text-sm font-bold text-slate-700">{appointment.especialidade}</p>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status da Perícia
            </label>
            <div className="space-y-2">
              {[ObservationStatus.COMPARECEU, ObservationStatus.NAO_COMPARECEU, ObservationStatus.FALECIMENTO].map((status) => (
                <label 
                  key={status}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedStatus === status 
                      ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900 shadow-md' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="status" 
                    value={status} 
                    checked={selectedStatus === status}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="sr-only" 
                  />
                  <span className={`text-sm font-bold uppercase tracking-wide ${
                    status === ObservationStatus.COMPARECEU ? 'text-emerald-700' :
                    status === ObservationStatus.NAO_COMPARECEU ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    {status}
                  </span>
                  {selectedStatus === status && (
                    <div className="ml-auto w-2.5 h-2.5 rounded-full bg-blue-900 shadow-sm"></div>
                  )}
                </label>
              ))}
              
              <label 
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedStatus === '' 
                      ? 'border-blue-900 bg-blue-50 ring-1 ring-blue-900 shadow-md' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="status" 
                    value="" 
                    checked={selectedStatus === ''}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="sr-only" 
                  />
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">
                    PENDENTE / LIMPAR
                  </span>
                  {selectedStatus === '' && (
                    <div className="ml-auto w-2.5 h-2.5 rounded-full bg-blue-900 shadow-sm"></div>
                  )}
                </label>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
          {isAdmin ? (
             <button
               onClick={handleDelete}
               disabled={isDeleting || isSaving}
               className="group relative px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center gap-2 disabled:opacity-50"
               title="Excluir este agendamento"
             >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Excluir</span>
                {showNewBadge && (
                    <span className="absolute -top-2 -right-1 bg-amber-400 text-amber-950 text-[8px] px-1.5 py-0.5 rounded shadow-sm font-black animate-bounce">
                        NOVO
                    </span>
                )}
             </button>
          ) : (
            <div></div>
          )}

          <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-slate-200"
                disabled={isSaving || isDeleting}
            >
                CANCELAR
            </button>
            <button 
                onClick={handleSave}
                disabled={isSaving || isDeleting}
                className="flex items-center gap-2 px-6 py-3 text-xs font-black text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 uppercase tracking-widest active:scale-95"
            >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                SALVAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;
