
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { fetchSystemLogs, sendGlobalMessage, fetchGlobalMessages } from '../services/api'; 
import { UserProfile, UserRole, LogEntry, GlobalMessage } from '../types';
import { Shield, Check, X, Search, Loader2, User, AlertTriangle, List, Activity, Clock, Filter, Monitor, Calendar, MessageSquare, Send, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const AdminUsersPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'messages'>('users');
  
  // Users State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  // Filters State for Logs
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');

  // Messages State
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageHistory, setMessageHistory] = useState<GlobalMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setLoadingUsers(false);
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    const data = await fetchSystemLogs();
    setLogs(data);
    setLoadingLogs(false);
  };

  const loadMessages = async () => {
    setLoadingMessages(true);
    const data = await fetchGlobalMessages();
    setMessageHistory(data);
    setLoadingMessages(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') loadLogs();
    if (activeTab === 'messages') loadMessages();
  }, [activeTab]);

  const handleUpdateUser = async (id: string, updates: Partial<UserProfile>) => {
    setUpdatingId(id);
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    } catch (err) {
      alert("Erro ao atualizar usuário.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!supabase) return;
    if (!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
    });

    if (error) {
        alert("Erro ao enviar e-mail: " + error.message);
    } else {
        alert("E-mail de recuperação enviado com sucesso!");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!messageText.trim()) return;
    
    setSendingMessage(true);
    const success = await sendGlobalMessage(messageText, userProfile?.full_name || userProfile?.email || 'Admin');
    
    if (success) {
      setMessageText('');
      loadMessages(); // Recarrega histórico
      alert("Mensagem enviada para todos os usuários logados!");
    } else {
      alert("Erro ao enviar mensagem.");
    }
    setSendingMessage(false);
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lógica de filtragem dos logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro de Texto (Email, Detalhes, IP)
      const textMatch = 
        log.user_email.toLowerCase().includes(logSearch.toLowerCase()) ||
        log.details?.toLowerCase().includes(logSearch.toLowerCase()) ||
        (log.ip_address && log.ip_address.includes(logSearch));
      
      if (!textMatch) return false;

      // Filtro de Ação
      if (logActionFilter && !log.action.includes(logActionFilter)) return false;

      // Filtro de Data
      if (logDateFilter) {
         // Converte timestamp ISO para YYYY-MM-DD
         const logDate = log.created_at.split('T')[0];
         if (logDate !== logDateFilter) return false;
      }

      return true;
    });
  }, [logs, logSearch, logActionFilter, logDateFilter]);

  const uniqueActions = useMemo(() => {
     return Array.from(new Set(logs.map(l => l.action))).sort();
  }, [logs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Header Admin */}
      <div className="bg-white/80 backdrop-blur border border-slate-200 p-6 rounded-[2rem] shadow-sm">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-3 rounded-2xl text-white">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Painel Administrativo</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controle Total do Sistema</p>
              </div>
            </div>

            {/* Tabs Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
               <button 
                 onClick={() => setActiveTab('users')}
                 className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <User size={14} /> Usuários
               </button>
               <button 
                 onClick={() => setActiveTab('logs')}
                 className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <List size={14} /> Logs
               </button>
               <button 
                 onClick={() => setActiveTab('messages')}
                 className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'messages' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <MessageSquare size={14} /> Avisos
               </button>
            </div>
         </div>
      </div>

      {/* --- TAB: USUÁRIOS --- */}
      {activeTab === 'users' && (
        <>
          <div className="relative w-full max-w-md group mx-auto md:mx-0">
              <Search className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-900 transition-colors" size={18} />
              <input 
                type="text"
                placeholder="Pesquisar por nome ou e-mail..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-900/10 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
            {loadingUsers ? (
              <div className="p-20 text-center flex flex-col items-center">
                <Loader2 className="animate-spin text-blue-900 mb-4" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando usuários...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status de Acesso</th>
                      <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nível de Permissão</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className={`hover:bg-slate-50/50 transition-colors ${user.id === userProfile?.id ? 'bg-blue-50/30' : ''}`}>
                        <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black uppercase shadow-sm shrink-0 ${user.approved ? 'bg-blue-900' : 'bg-slate-300'}`}>
                                {user.full_name ? user.full_name.charAt(0) : (user.email?.charAt(0) || <User size={16}/>)}
                              </div>
                              <div className="flex flex-col">
                                {/* Exibe Nome Completo se existir, senão um placeholder */}
                                <span className="text-sm font-black text-slate-800">
                                   {user.full_name || 'Usuário sem Nome'}
                                </span>
                                <span className="text-[10px] font-medium text-slate-500">{user.email}</span>
                                {user.id === userProfile?.id && <span className="text-[9px] font-black bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md w-fit mt-0.5">ESTE É VOCÊ</span>}
                              </div>
                            </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                            {user.approved ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                                <Check size={12} /> Aprovado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 border border-amber-200 uppercase tracking-wider">
                                <AlertTriangle size={12} /> Pendente
                              </span>
                            )}
                        </td>
                        <td className="px-6 py-5">
                            <div className="relative">
                                <select 
                                value={user.role}
                                onChange={(e) => handleUpdateUser(user.id, { role: e.target.value as UserRole })}
                                disabled={updatingId === user.id || user.id === userProfile?.id}
                                className="w-full bg-slate-100 border border-slate-200 text-xs font-black text-slate-700 rounded-xl py-2 px-3 focus:ring-2 focus:ring-blue-900 outline-none uppercase tracking-widest appearance-none cursor-pointer disabled:opacity-50"
                                >
                                <option value="viewer">Viewer (Leitura)</option>
                                <option value="editor">Editor</option>
                                <option value="admin">Administrador</option>
                                </select>
                            </div>
                        </td>
                        <td className="px-8 py-5 text-right">
                            {updatingId === user.id ? (
                              <Loader2 className="animate-spin ml-auto text-blue-900" size={18} />
                            ) : (
                              <div className="flex justify-end gap-2">
                                  {/* Botão de Reset de Senha */}
                                  <button
                                    onClick={() => handlePasswordReset(user.email)}
                                    className="p-2.5 text-slate-400 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 rounded-xl transition-all"
                                    title="Enviar e-mail de redefinição de senha"
                                  >
                                    <KeyRound size={18} />
                                  </button>

                                  {!user.approved ? (
                                    <button 
                                      onClick={() => handleUpdateUser(user.id, { approved: true })}
                                      className="group flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                                    >
                                      <Check size={14} strokeWidth={3} /> Liberar Acesso
                                    </button>
                                  ) : (
                                    user.id !== userProfile?.id && (
                                        <button 
                                        onClick={() => handleUpdateUser(user.id, { approved: false })}
                                        className="p-2.5 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-all"
                                        title="Bloquear Acesso"
                                        >
                                        <X size={18} />
                                        </button>
                                    )
                                  )}
                              </div>
                            )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                        <tr>
                            <td colSpan={4} className="p-20 text-center text-slate-400 text-sm font-bold">Nenhum usuário encontrado.</td>
                        </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* --- TAB: LOGS --- */}
      {activeTab === 'logs' && (
        <>
        {/* Filtros de Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="flex-1 w-full space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar (Email, IP, Detalhes)</label>
                <div className="relative group">
                    <Search className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-blue-900 transition-colors" size={16} />
                    <input 
                        type="text"
                        placeholder="Ex: 192.168... ou usuario@email..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900/10 focus:bg-white transition-all"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="w-full md:w-48 space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Ação</label>
                <div className="relative">
                    <select
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900/10 focus:bg-white transition-all appearance-none cursor-pointer text-slate-600"
                        value={logActionFilter}
                        onChange={(e) => setLogActionFilter(e.target.value)}
                    >
                        <option value="">Todas</option>
                        {uniqueActions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>
                    <Filter className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>
            </div>

            <div className="w-full md:w-40 space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                 <div className="relative">
                    <input 
                        type="date"
                        className="w-full pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-900/10 focus:bg-white transition-all text-slate-600"
                        value={logDateFilter}
                        onChange={(e) => setLogDateFilter(e.target.value)}
                    />
                 </div>
            </div>

            {(logSearch || logActionFilter || logDateFilter) && (
                <button 
                    onClick={() => { setLogSearch(''); setLogActionFilter(''); setLogDateFilter(''); }}
                    className="h-[34px] px-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                    Limpar
                </button>
            )}
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-200">
           {loadingLogs ? (
              <div className="p-20 text-center flex flex-col items-center">
                <Loader2 className="animate-spin text-blue-900 mb-4" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando logs do sistema...</span>
              </div>
           ) : (
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                     <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                           <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2 text-slate-600">
                                 <Clock size={14} className="text-slate-400" />
                                 <span className="text-xs font-bold tabular-nums">
                                    {new Date(log.created_at).toLocaleString('pt-BR')}
                                 </span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs font-bold text-blue-900">{log.user_email}</span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Monitor size={12} className="text-slate-300" />
                                <span className="text-[10px] font-mono font-bold">{log.ip_address || '---'}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className={`inline-block px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                                 log.action.includes('LOGIN') ? 'bg-emerald-100 text-emerald-700' :
                                 log.action.includes('NAVEGA') ? 'bg-slate-100 text-slate-600' :
                                 log.action.includes('EDIT') || log.action.includes('UPDATE') ? 'bg-amber-100 text-amber-700' :
                                 'bg-blue-100 text-blue-700'
                              }`}>
                                 {log.action}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-xs text-slate-600 font-medium">{log.details}</span>
                           </td>
                        </tr>
                     ))}
                     {filteredLogs.length === 0 && (
                        <tr><td colSpan={5} className="p-10 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum registro encontrado para os filtros selecionados.</td></tr>
                     )}
                  </tbody>
                </table>
             </div>
           )}
        </div>
        </>
      )}

      {/* --- TAB: MENSAGENS / AVISOS --- */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Envio */}
          <div className="bg-white border-2 border-slate-200 rounded-[2rem] p-6 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
               <div className="bg-blue-100 p-2 rounded-xl text-blue-900">
                 <MessageSquare size={20} />
               </div>
               <h3 className="text-lg font-black text-slate-800">Enviar Aviso Global</h3>
             </div>
             <p className="text-xs text-slate-500 mb-4 font-medium">Esta mensagem aparecerá como uma notificação "Push" para todos os usuários logados no sistema agora.</p>
             
             <form onSubmit={handleSendMessage} className="space-y-4">
                <textarea 
                  className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-900 focus:bg-white transition-all resize-none placeholder-slate-400"
                  placeholder="Digite o aviso aqui..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  required
                ></textarea>
                
                <button 
                  type="submit" 
                  disabled={sendingMessage || !messageText.trim()}
                  className="w-full bg-blue-900 hover:bg-black text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Enviar Push
                </button>
             </form>
          </div>

          {/* Histórico */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col h-[500px]">
             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Histórico de Envios</h3>
             
             <div className="flex-1 overflow-y-auto pr-2 space-y-3">
               {loadingMessages ? (
                 <div className="flex justify-center items-center h-full">
                    <Loader2 className="animate-spin text-slate-300" />
                 </div>
               ) : messageHistory.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-300 text-xs font-bold uppercase tracking-widest">
                   <MessageSquare size={32} className="mb-2 opacity-20" />
                   Nenhuma mensagem enviada.
                 </div>
               ) : (
                 messageHistory.map((msg) => (
                   <div key={msg.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                           {msg.created_by}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(msg.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-700 leading-relaxed">{msg.message}</p>
                   </div>
                 ))
               )}
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminUsersPage;
