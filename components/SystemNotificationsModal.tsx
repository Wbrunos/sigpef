
import React from 'react';
import { GlobalMessage } from '../types';
import { X, MessageSquare, Clock, ShieldAlert } from 'lucide-react';

interface SystemNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: GlobalMessage[];
}

const SystemNotificationsModal: React.FC<SystemNotificationsModalProps> = ({ isOpen, onClose, messages }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-red-100 p-2 rounded-xl text-red-600">
               <ShieldAlert size={20} />
             </div>
             <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Avisos do Sistema</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comunicados Oficiais</p>
             </div>
          </div>
          <button onClick={onClose} className="bg-white p-2 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare size={48} className="text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-400">Nenhum aviso no momento.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                    {msg.created_by || 'Admin'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={10} />
                    <span className="text-[9px] font-bold uppercase tracking-wide">
                      {new Date(msg.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {msg.message}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white text-center shrink-0">
           <button 
             onClick={onClose}
             className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
           >
             Fechar e Marcar como Lido
           </button>
        </div>
      </div>
    </div>
  );
};

export default SystemNotificationsModal;
