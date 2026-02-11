
import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

interface NotificationToastProps {
  message: string | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ message, onClose }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (message) {
      // Força um pequeno delay para garantir que o DOM foi renderizado invisível
      // antes de aplicar a classe que o torna visível, disparando a transição CSS.
      const entryTimer = setTimeout(() => {
        setIsActive(true);
      }, 100);

      // Timer para fechar automaticamente
      const exitTimer = setTimeout(() => {
        handleClose();
      }, 6000);

      return () => {
        clearTimeout(entryTimer);
        clearTimeout(exitTimer);
      };
    }
  }, [message]); // O App.tsx usa 'key', então este componente é remontado a cada nova msg

  const handleClose = () => {
    setIsActive(false);
    // Aguarda o tempo da animação CSS (500ms) antes de chamar o onClose real
    setTimeout(onClose, 500);
  };

  if (!message) return null;

  return (
    <div 
      className={`fixed top-4 right-4 left-4 md:left-auto md:right-8 z-[99999] pointer-events-none flex justify-end`}
    >
      <div 
        className={`
          pointer-events-auto
          bg-slate-900/95 text-white 
          shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] 
          border border-slate-700/50 
          rounded-[2rem] p-5 max-w-sm w-full
          flex items-center gap-4 
          ring-1 ring-white/10 backdrop-blur-xl
          transform transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
          ${isActive ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-24 opacity-0 scale-90'}
        `}
      >
        <div className="relative shrink-0">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40"></div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2.5 rounded-full text-white relative z-10 shadow-lg border border-blue-400/20">
            <Bell size={20} strokeWidth={2.5} className="animate-[wiggle_1s_ease-in-out_infinite]" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-0.5">SIGPEF Informa</p>
          <p className="text-xs font-bold leading-snug text-slate-100 break-words">{message}</p>
        </div>
        <button 
          onClick={handleClose}
          className="bg-white/5 hover:bg-white/20 p-2 rounded-full transition-colors shrink-0 -mr-1 cursor-pointer"
        >
          <X size={14} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
