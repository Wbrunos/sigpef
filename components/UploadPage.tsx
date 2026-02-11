
import React, { useState, useRef, useEffect } from 'react';
import { CloudUpload, FileText, CheckCircle, AlertCircle, Loader2, X, BrainCircuit, Trash2, History, AlertTriangle, Clock } from 'lucide-react';
import { uploadPautaFile, logSystemAction, deleteImportedBatch } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UploadHistoryItem {
  batchId: string;
  fileName: string;
  timestamp: number;
}

const UploadPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // States de Progresso
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning' | null; msg: string }>({ type: null, msg: '' });
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [recentUploads, setRecentUploads] = useState<UploadHistoryItem[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estado para controlar o tempo atual e atualizar a UI (Timer de 10 min)
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Atualiza o relógio a cada 10 segundos para verificar expiração do botão Undo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Carrega histórico do LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('sigpef_upload_history');
    if (saved) {
      try {
        setRecentUploads(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('sigpef_upload_history');
      }
    }
  }, []);

  // Salva histórico
  const updateHistory = (newItem: UploadHistoryItem) => {
    const updated = [newItem, ...recentUploads].slice(0, 5); // Mantém os últimos 5
    setRecentUploads(updated);
    localStorage.setItem('sigpef_upload_history', JSON.stringify(updated));
  };

  const removeFromHistory = (batchId: string) => {
    const updated = recentUploads.filter(item => item.batchId !== batchId);
    setRecentUploads(updated);
    localStorage.setItem('sigpef_upload_history', JSON.stringify(updated));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      setStatus({ type: 'error', msg: 'Apenas arquivos PDF são permitidos.' });
      return;
    }
    setFile(file);
    setStatus({ type: null, msg: '' });
    setProgress(0); // Reset progress
  };

  const handleUpload = async () => {
    if (!file) return;

    // VERIFICAÇÃO DE DUPLICIDADE
    // Impede o envio se o arquivo já estiver na lista de recentes
    const isDuplicate = recentUploads.some(item => item.fileName === file.name);
    if (isDuplicate) {
      setStatus({ 
        type: 'error', 
        msg: `O arquivo "${file.name}" já foi enviado recentemente. Para reenviar, exclua o registro anterior ou renomeie o arquivo.` 
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setStatus({ type: null, msg: '' });

    // Gera um Batch ID único para este upload
    const batchId = crypto.randomUUID();

    try {
      const result = await uploadPautaFile(file, batchId, (percent) => {
        setProgress(percent);
      });

      if (result.success) {
        // Verifica se foi sucesso total ou warning (duplicatas)
        if (result.isWarning) {
            setStatus({ type: 'warning', msg: result.message });
        } else {
            setStatus({ type: 'success', msg: result.message });
        }

        if (userProfile?.email) {
           logSystemAction(userProfile.email, 'UPLOAD PAUTA', `Enviou arquivo: ${file.name} (Lote: ${batchId}). Msg: ${result.message}`);
        }
        
        // Salva no histórico mesmo se tiver warning, pois alguns registros podem ter sido criados
        updateHistory({
          batchId,
          fileName: file.name,
          timestamp: Date.now()
        });

        // Delay para limpar o arquivo da UI visualmente após o 100%
        setTimeout(() => setFile(null), 1000);
      } else {
        setStatus({ type: 'error', msg: result.message });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: 'Ocorreu um erro inesperado durante o upload.' });
    } finally {
      setUploading(false);
    }
  };

  const handleUndo = async (item: UploadHistoryItem) => {
    // Verificação de segurança extra para o clique
    const timeSinceUpload = Date.now() - item.timestamp;
    const isExpired = timeSinceUpload > 10 * 60 * 1000; // 10 minutos
    
    if (isExpired) {
      alert("O prazo de 10 minutos para desfazer esta importação expirou.");
      return;
    }

    if (!window.confirm(`Tem certeza que deseja apagar todos os registros importados do arquivo "${item.fileName}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setDeletingId(item.batchId);
    setStatus({ type: null, msg: '' }); // Limpa status anterior
    
    const result = await deleteImportedBatch(item.batchId);

    if (result.success) {
      if (result.count && result.count > 0) {
        setStatus({ type: 'success', msg: `Importação desfeita com sucesso. ${result.count} registros foram removidos da base.` });
        if (userProfile?.email) {
           logSystemAction(userProfile.email, 'DESFAZER UPLOAD', `Apagou lote ${item.batchId} do arquivo ${item.fileName} (${result.count} registros)`);
        }
        removeFromHistory(item.batchId);
      } else {
        setStatus({ 
          type: 'warning', 
          msg: 'O sistema processou o pedido, mas 0 registros foram encontrados para este lote. Verifique se o n8n está salvando o "import_batch_id" corretamente.' 
        });
      }
    } else {
      setStatus({ type: 'error', msg: 'Erro ao tentar desfazer. Verifique sua conexão ou permissões.' });
    }
    setDeletingId(null);
  };

  const clearFile = () => {
    setFile(null);
    setStatus({ type: null, msg: '' });
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border border-slate-200 p-6 rounded-[2rem] shadow-sm mb-6">
         <div className="flex items-center gap-4">
            <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-900">
              <CloudUpload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Upload de Pauta (IA)</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processamento Inteligente de PDF</p>
            </div>
         </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 mb-8">
        
        {/* Dropzone */}
        <div 
          className={`
            relative flex flex-col items-center justify-center w-full h-80 rounded-[2rem] border-4 border-dashed transition-all duration-300 overflow-hidden
            ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}
            ${file ? 'border-emerald-300 bg-emerald-50/30' : ''}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input 
            ref={inputRef}
            type="file" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept=".pdf"
            disabled={uploading}
          />

          {!file ? (
             <div className="text-center pointer-events-none p-6">
                <div className="bg-white p-4 rounded-full shadow-sm inline-block mb-4">
                   <CloudUpload size={48} className="text-indigo-400" />
                </div>
                <p className="text-lg font-black text-slate-700 mb-2">Arraste seu PDF aqui</p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ou clique para selecionar</p>
             </div>
          ) : (
             <div className="text-center relative z-10 w-full max-w-sm">
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100 flex items-center gap-4">
                   <div className="bg-red-100 p-3 rounded-xl text-red-600">
                      <FileText size={32} />
                   </div>
                   <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs font-bold text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                   </div>
                   {!uploading && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); clearFile(); }}
                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                        disabled={uploading}
                    >
                        <X size={20} />
                    </button>
                   )}
                </div>
             </div>
          )}

          {/* Barra de Progresso Interna */}
          {uploading && (
             <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-200">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                ></div>
             </div>
          )}
        </div>

        {/* Progress Text / Status Messages */}
        {uploading && (
            <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center animate-in fade-in">
                 <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="animate-spin text-indigo-600" size={20} />
                    <span className="text-indigo-900 font-black text-sm uppercase tracking-widest">
                       {progress < 100 ? `Enviando Arquivo: ${progress}%` : 'Processando IA...'}
                    </span>
                 </div>
                 <p className="text-[10px] text-indigo-400 font-bold">Por favor, não feche a janela.</p>
            </div>
        )}

        {status.msg && !uploading && (
          <div className={`mt-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-black animate-in fade-in slide-in-from-top-2 ${
            status.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' :
            status.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
            'bg-emerald-50 text-emerald-700 border border-emerald-100'
          }`}>
            {status.type === 'error' ? <AlertTriangle size={20} /> : 
             status.type === 'warning' ? <AlertTriangle size={20} /> :
             <CheckCircle size={20} />}
            {status.msg}
          </div>
        )}

        {/* Action Button */}
        {!uploading && status.type !== 'success' && status.type !== 'warning' && (
            <div className="mt-8">
            <button
                onClick={handleUpload}
                disabled={!file}
                className={`
                w-full py-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all
                ${!file 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300 active:scale-[0.98]'
                }
                `}
            >
                <BrainCircuit size={20} /> Iniciar Processamento IA
            </button>
            </div>
        )}

        <div className="mt-6 text-center">
           <p className="text-[10px] font-bold text-slate-400 max-w-md mx-auto leading-relaxed">
             <span className="text-slate-600 uppercase">Nota:</span> O arquivo será processado por Inteligência Artificial. Se o envio chegar a 100% e demorar, é a IA analisando o documento.
           </p>
        </div>
      </div>

      {/* Histórico Recente e Desfazer */}
      {recentUploads.length > 0 && (
         <div className="bg-slate-100 rounded-[2rem] p-6 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
               <History size={16} className="text-slate-400" />
               <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Envios Recentes (Opções de Desfazer)</h3>
            </div>
            
            <div className="space-y-3">
               {recentUploads.map((item) => {
                  // Lógica de Expiração (10 minutos)
                  const timeSinceUpload = currentTime - item.timestamp;
                  const minutesLeft = Math.max(0, 10 - Math.floor(timeSinceUpload / 60000));
                  const isExpired = timeSinceUpload > 10 * 60 * 1000;

                  return (
                    <div key={item.batchId} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                       <div className="flex items-center gap-3 w-full">
                          <div className={`p-2.5 rounded-xl ${isExpired ? 'bg-slate-50 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                             <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                             <p className={`text-sm font-bold truncate ${isExpired ? 'text-slate-400' : 'text-slate-800'}`}>{item.fileName}</p>
                             <div className="flex items-center gap-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                   {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                                {!isExpired && (
                                    <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 rounded flex items-center gap-1">
                                       <Clock size={8} /> Expira em {minutesLeft}m
                                    </span>
                                )}
                             </div>
                          </div>
                       </div>
                       
                       {isExpired ? (
                          <span className="px-4 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest border border-slate-100 rounded-xl select-none cursor-not-allowed w-full sm:w-auto text-center">
                            Prazo Expirado
                          </span>
                       ) : (
                          <button 
                            onClick={() => handleUndo(item)}
                            disabled={deletingId === item.batchId}
                            className="w-full sm:w-auto px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            {deletingId === item.batchId ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            Desfazer Importação
                          </button>
                       )}
                    </div>
                  );
               })}
            </div>
         </div>
      )}
    </div>
  );
};

export default UploadPage;
