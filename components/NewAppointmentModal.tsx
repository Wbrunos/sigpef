
import React, { useState } from 'react';
import { X, Save, Loader2, User, Stethoscope, Calendar, FileText } from 'lucide-react';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { data: string; periciado: string; perito: string; especialidade: string }) => Promise<void>;
  existingPeritos: string[];
  existingSpecialties: string[];
}

const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSave, existingPeritos, existingSpecialties }) => {
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [periciado, setPericiado] = useState('');
  const [perito, setPerito] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periciado.trim() || !perito.trim() || !especialidade.trim() || !data) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    setIsSaving(true);
    // Normalização final antes do save (também feita na API, mas boa prática aqui)
    await onSave({ 
      data, 
      periciado: periciado.trim().toUpperCase(), 
      perito: perito.trim().toUpperCase(), 
      especialidade: especialidade.trim().toUpperCase() 
    });
    
    setPericiado('');
    setPerito('');
    setEspecialidade('');
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-800">CADASTRAR NOVA PERÍCIA</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INCLUSÃO MANUAL NA PAUTA</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <Calendar size={12} /> DATA DA PERÍCIA
            </label>
            <input 
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all shadow-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
              <User size={12} /> NOME DO PERICIADO
            </label>
            <input 
              type="text"
              required
              value={periciado}
              onChange={(e) => setPericiado(e.target.value.toUpperCase())}
              placeholder="DIGITE O NOME COMPLETO"
              className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all shadow-sm placeholder:font-normal placeholder:text-slate-400 uppercase"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Stethoscope size={12} /> PERITO
                </label>
                <input 
                  type="text"
                  required
                  list="peritos-list"
                  value={perito}
                  onChange={(e) => setPerito(e.target.value.toUpperCase())}
                  placeholder="SELECIONE OU DIGITE"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all shadow-sm placeholder:font-normal placeholder:text-slate-400 uppercase"
                />
                <datalist id="peritos-list">
                    {existingPeritos.map(p => <option key={p} value={p} />)}
                </datalist>
             </div>

             <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <FileText size={12} /> ESPECIALIDADE
                </label>
                <input 
                  type="text"
                  required
                  list="specialties-list"
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value.toUpperCase())}
                  placeholder="SELECIONE OU DIGITE"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all shadow-sm placeholder:font-normal placeholder:text-slate-400 uppercase"
                />
                 <datalist id="specialties-list">
                    {existingSpecialties.map(s => <option key={s} value={s} />)}
                </datalist>
             </div>
          </div>

          <div className="pt-4 flex gap-3">
             <button 
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
             >
                CANCELAR
             </button>
             <button 
                type="submit"
                disabled={isSaving}
                className="flex-[2] flex items-center justify-center gap-2 py-3 text-xs font-black text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 uppercase tracking-widest active:scale-95"
             >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                CADASTRAR PERÍCIA
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NewAppointmentModal;
