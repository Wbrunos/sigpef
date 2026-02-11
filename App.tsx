
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Stats, GlobalMessage } from './types';
import { fetchAppointments, updateAppointment, fetchGlobalMessages, createAppointment, logSystemAction, deleteAppointment } from './services/api'; 
import { supabase } from './services/supabase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import AdminUsersPage from './components/AdminUsersPage';
import DashboardStats from './components/DashboardStats';
import Filters from './components/Filters';
import AppointmentList from './components/AppointmentList';
import EditModal from './components/EditModal';
import NewAppointmentModal from './components/NewAppointmentModal';
import AttendancePage from './components/AttendancePage';
import ReportsPage from './components/ReportsPage';
import UploadPage from './components/UploadPage';
import NotificationToast from './components/NotificationToast';
import SystemNotificationsModal from './components/SystemNotificationsModal';
import { Scale, Loader2, RefreshCw, LayoutDashboard, UserCheck, FileText, LogOut, Shield, Lock, Users, Bell, Plus, CloudUpload } from 'lucide-react';
import { APP_VERSION, BADGE_EXPIRATION_DATE } from './constants';

type ViewType = 'dashboard' | 'attendance' | 'reports' | 'admin_users' | 'upload';

const PendingApprovalScreen: React.FC<{ onLogout: () => void, onRefresh: () => void }> = ({ onLogout, onRefresh }) => (
  <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
    <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border border-slate-200 animate-in fade-in zoom-in duration-500">
      <div className="bg-amber-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-600 shadow-inner">
        <Lock size={40} />
      </div>
      <h2 className="text-2xl font-black text-slate-800 mb-2">Acesso Pendente</h2>
      <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed">
        Seu cadastro foi recebido. Um administrador precisa aprovar seu nível de acesso antes de você entrar.
      </p>
      <div className="space-y-3">
        <button onClick={onRefresh} className="w-full py-4 bg-blue-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
          <RefreshCw size={14} /> Verificar Agora
        </button>
        <button onClick={onLogout} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 hover:text-red-600 transition-all">
          Sair da Conta
        </button>
      </div>
    </div>
  </div>
);

const AuthenticatedApp: React.FC = () => {
  const { userProfile, signOut, canEdit, isAdmin, isApproved, refreshProfile } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Notificações Toast (Temporárias)
  const [notification, setNotification] = useState<{ id: string; msg: string } | null>(null);

  // Notificações do Sistema (Persistentes / Sino)
  const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const todayDate = new Date();
  const [searchTerm, setSearchTerm] = useState('');
  const [peritoFilter, setPeritoFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(todayDate.getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState((todayDate.getMonth() + 1).toString().padStart(2, '0'));
  const [dayFilter, setDayFilter] = useState(todayDate.getDate().toString().padStart(2, '0'));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Lógica de expiração do badge "NOVO"
  const showNewBadge = useMemo(() => {
    return new Date() < new Date(BADGE_EXPIRATION_DATE);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (err) {
      setError('Erro ao carregar dados.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Carrega mensagens e calcula não lidas
  const loadGlobalMessagesData = async () => {
      const msgs = await fetchGlobalMessages();
      
      setGlobalMessages((prev) => {
         // Evita atualização de estado desnecessária se não mudou
         if (prev.length === msgs.length && prev[0]?.id === msgs[0]?.id) return prev;
         return msgs;
      });

      // Lógica de "Não Lidas": ID da mensagem > ID salvo no localStorage
      // Chave atualizada para SIGPEF
      const lastReadId = Number(localStorage.getItem('sigpef_last_read_msg_id') || 0);
      const unread = msgs.filter(m => m.id > lastReadId).length;
      setUnreadCount(unread);
  };

  // Helper para disparar notificação Toast
  const triggerNotification = (message: string) => {
    setTimeout(() => {
        setNotification({ 
            id: `${Date.now()}-${Math.random()}`, 
            msg: message 
        });
    }, 50);
  };

  useEffect(() => {
    loadData();
    loadGlobalMessagesData();
    
    // SAFETY NET: Polling automático a cada 15s para garantir que mensagens cheguem
    // mesmo se o WebSocket falhar (comum em redes corporativas/Justiça Federal)
    const pollingInterval = setInterval(() => {
        loadGlobalMessagesData();
    }, 15000);

    if (supabase) {
      // 1. Canal para Pauta e Presença (Tabelas Principais)
      const dataChannel = supabase
        .channel('system-data-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pericias' }, (payload) => {
          loadData(true); 
          if (payload.eventType === 'UPDATE') {
            const oldVal = payload.old;
            const newVal = payload.new;
            const nome = newVal?.periciado || 'Registro';
            if (oldVal.observacao !== newVal.observacao) {
              triggerNotification(`"${nome}": Status atualizado para ${newVal.observacao || 'PENDENTE'}`);
            } else if (oldVal.periciado !== newVal.periciado) {
              triggerNotification(`Nome corrigido na pauta: "${newVal.periciado}"`);
            } 
          } else if (payload.eventType === 'INSERT') {
            const nome = payload.new?.periciado || 'Nova perícia';
            triggerNotification(`Novo agendamento: ${nome}`);
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'controle_presenca' }, (payload) => {
           if (payload.eventType === 'INSERT') {
               const perito = payload.new?.perito || 'Perito';
               triggerNotification(`Presença iniciada: ${perito}`);
           } else if (payload.eventType === 'UPDATE') {
               const perito = payload.new?.perito || 'Perito';
               if (payload.new?.hora_saida && !payload.old?.hora_saida) {
                   triggerNotification(`Saída registrada: ${perito}`);
               } else {
                   triggerNotification(`Registro de presença atualizado: ${perito}`);
               }
           }
        })
        .subscribe();

      // 2. Canal Exclusivo para Mensagens Globais (Garante prioridade e separação)
      const messagesChannel = supabase
        .channel('global-messages-alert')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_messages' }, (payload) => {
           // Nova mensagem global recebida via Socket (Instantânea)
           const newMsg = payload.new as GlobalMessage;
           
           if (newMsg && newMsg.message) {
              triggerNotification(`📢 AVISO GERAL: ${newMsg.message}`);
              
              // Atualização Otimista
              setGlobalMessages((prev) => [newMsg, ...prev]);
              setUnreadCount((prev) => prev + 1);
           }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(dataChannel);
        supabase.removeChannel(messagesChannel);
        clearInterval(pollingInterval);
      };
    }
    
    return () => clearInterval(pollingInterval);
  }, []);

  const uniquePeritos = useMemo(() => Array.from(new Set(appointments.map(a => a.perito))).filter(Boolean).sort(), [appointments]);
  const uniqueSpecialties = useMemo(() => Array.from(new Set(appointments.map(a => a.especialidade))).filter(Boolean).sort(), [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const matchesSearch = apt.periciado?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      const matchesPerito = peritoFilter ? apt.perito === peritoFilter : true;
      const matchesSpecialty = specialtyFilter ? apt.especialidade === specialtyFilter : true;
      const aptStatus = apt.observacao?.toUpperCase() || 'PENDENTE';
      const filterStatus = statusFilter?.toUpperCase();
      const matchesStatus = statusFilter ? (filterStatus === 'PENDENTE' ? (!apt.observacao || aptStatus === '') : aptStatus.includes(filterStatus)) : true;
      const [y, m, d] = (apt.data || '').split('-');
      return matchesSearch && matchesPerito && matchesSpecialty && matchesStatus && 
             (yearFilter ? y === yearFilter : true) && (monthFilter ? m === monthFilter : true) && (dayFilter ? d === dayFilter : true);
    });
  }, [appointments, searchTerm, peritoFilter, specialtyFilter, statusFilter, yearFilter, monthFilter, dayFilter]);

  const stats = useMemo<Stats>(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter(a => a.observacao && a.observacao !== '').length;
    return { total, completed, pending: total - completed };
  }, [filteredAppointments]);

  const handleSaveAppointment = async (id: number | string, data: { observacao: string; periciado: string }) => {
     const success = await updateAppointment(id, data);
     if (success) {
       triggerNotification("Salvando alterações...");
       loadData(true);
     } else {
       alert("Erro ao salvar alteração. Verifique sua conexão.");
     }
  };

  const handleCreateAppointment = async (data: { data: string; periciado: string; perito: string; especialidade: string }) => {
     // VALIDAÇÃO DE DUPLICIDADE: NOME + DATA
     // Verificamos na base completa (appointments) se já existe o mesmo periciado na mesma data
     const isDuplicate = appointments.some(apt => 
        apt.periciado.trim().toLowerCase() === data.periciado.trim().toLowerCase() && 
        apt.data === data.data
     );

     if (isDuplicate) {
        const formattedDate = data.data.split('-').reverse().join('/');
        alert(`ALERTA DE DUPLICIDADE:\n\nO periciado "${data.periciado}" JÁ POSSUI um agendamento para o dia ${formattedDate}.\n\nNão é permitido inserir a mesma pessoa mais de uma vez na mesma data.`);
        return;
     }

     const success = await createAppointment(data);
     if (success) {
        if (userProfile?.email) {
            logSystemAction(userProfile.email, 'NOVA PERÍCIA', `Cadastrou perícia manual: ${data.periciado} com ${data.perito}`);
        }
        triggerNotification("Perícia cadastrada com sucesso!");
        loadData(true);
     } else {
        alert("Erro ao cadastrar. Verifique a conexão.");
     }
  };

  const handleDeleteAppointment = async (id: number | string) => {
    const success = await deleteAppointment(id);
    if (success) {
      if (userProfile?.email) {
          logSystemAction(userProfile.email, 'EXCLUIR PERÍCIA', `Excluiu perícia ID ${id}`);
      }
      triggerNotification("Perícia excluída com sucesso.");
      setIsModalOpen(false); // Fecha o modal após excluir
      loadData(true);
    } else {
      alert("Erro ao excluir. Verifique se você tem permissão ou sua conexão.");
    }
  };

  const handleOpenNotifications = () => {
    setIsNotifModalOpen(true);
    // Ao abrir, marcamos como lido salvando o ID mais recente
    if (globalMessages.length > 0) {
      const latestId = Math.max(...globalMessages.map(m => m.id));
      localStorage.setItem('sigpef_last_read_msg_id', latestId.toString());
      setUnreadCount(0);
    }
  };

  if (!isApproved) return <PendingApprovalScreen onLogout={signOut} onRefresh={refreshProfile} />;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 text-blue-900 relative">
      
      {/* Toast flutuante para eventos rápidos */}
      {notification && (
        <NotificationToast 
          key={notification.id} 
          message={notification.msg} 
          onClose={() => setNotification(null)} 
        />
      )}

      {/* Modal de Histórico de Mensagens */}
      <SystemNotificationsModal 
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        messages={globalMessages}
      />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900 p-2.5 rounded-xl shadow-lg relative">
             <Scale className="text-white" size={24} />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm" title="Realtime Ativo"></div>
          </div>
          <div>
            <h1 className="text-xl font-black text-blue-900 tracking-tight">SIG<span className="text-red-700">PEF</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistema de Gestão de Perícias Federais • v{APP_VERSION}</p>
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row items-center gap-4 w-full md:w-auto">
          <nav className="w-full md:w-auto flex items-center p-2 bg-white/70 backdrop-blur border border-slate-200 rounded-2xl shadow-xl gap-2 overflow-x-auto">
            <button onClick={() => setCurrentView('dashboard')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'dashboard' ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-blue-800'}`}>
              <LayoutDashboard size={18} className="inline mr-2" /> Pauta
            </button>
            <button onClick={() => setCurrentView('attendance')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'attendance' ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-blue-800'}`}>
              <UserCheck size={18} className="inline mr-2" /> Presença
            </button>
            <button onClick={() => setCurrentView('reports')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'reports' ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-blue-800'}`}>
              <FileText size={18} className="inline mr-2" /> Relatórios
            </button>
            {/* Botão de Upload com Destaque NOVO */}
            {canEdit && (
                <button onClick={() => setCurrentView('upload')} className={`relative flex-1 md:flex-none px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'upload' ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:text-blue-800'}`}>
                  <CloudUpload size={18} className="inline mr-2" /> 
                  Upload
                  {showNewBadge && (
                    <span className="absolute top-1 right-1 bg-amber-400 text-amber-950 text-[6px] px-1 rounded-md font-black animate-pulse">NOVO</span>
                  )}
                </button>
            )}

            {isAdmin && (
              <button onClick={() => setCurrentView('admin_users')} className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${currentView === 'admin_users' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
                <Users size={18} />
              </button>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {/* Botão de Notificações (Sino) */}
            <button 
              onClick={handleOpenNotifications}
              className="relative p-3.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-900 rounded-2xl shadow-sm transition-all active:scale-90"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Desktop Name Display */}
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-xs font-black text-blue-900 uppercase">{(userProfile?.full_name || 'Usuário').split(' ')[0]}</span>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-tighter flex items-center gap-1">
                {isAdmin && <Shield size={10} className="text-red-600" />} {userProfile?.role}
              </span>
            </div>

            {/* Mobile Name Display */}
            <div className="md:hidden flex flex-col items-end mr-1">
                 <span className="text-[10px] font-black text-blue-900 uppercase tracking-tight">
                   {(userProfile?.full_name || 'Usuário').split(' ')[0]}
                 </span>
            </div>

            <button onClick={signOut} className="p-3.5 bg-white border border-slate-200 hover:text-red-600 rounded-2xl shadow-sm transition-all active:scale-90">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {currentView === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <DashboardStats stats={stats} />
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-xl font-black text-blue-900 tracking-tight">Pauta de Perícias</h2>
               <div className="flex gap-2">
                 {/* Botão de Nova Perícia (Apenas Editores/Admin) */}
                 {canEdit && (
                    <button 
                      onClick={() => setIsNewModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all relative"
                    >
                      <Plus size={16} /> 
                      <span className="hidden sm:inline">Nova Perícia</span>
                    </button>
                 )}
                 <button onClick={() => loadData()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 shadow-sm transition-all">
                   <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                 </button>
               </div>
            </div>
            <Filters 
              searchTerm={searchTerm} setSearchTerm={setSearchTerm}
              peritoFilter={peritoFilter} setPeritoFilter={setPeritoFilter}
              specialtyFilter={specialtyFilter} setSpecialtyFilter={setSpecialtyFilter}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              yearFilter={yearFilter} setYearFilter={setYearFilter}
              monthFilter={monthFilter} setMonthFilter={setMonthFilter}
              dayFilter={dayFilter} setDayFilter={setDayFilter}
              uniquePeritos={uniquePeritos} uniqueSpecialties={uniqueSpecialties}
              clearFilters={() => { setSearchTerm(''); setPeritoFilter(''); setSpecialtyFilter(''); setStatusFilter(''); setDayFilter(''); }}
            />
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-300">
                <Loader2 className="animate-spin mb-4" size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando com o Tribunal...</p>
              </div>
            ) : (
              <AppointmentList 
                appointments={filteredAppointments} 
                onEdit={(apt) => { 
                    if(canEdit) { 
                        setSelectedAppointment(apt); 
                        setIsModalOpen(true); 
                    } else { 
                        triggerNotification("Seu nível de acesso é apenas de leitura!");
                    } 
                }} 
              />
            )}
          </div>
        )}
        {currentView === 'attendance' && <AttendancePage availablePeritos={uniquePeritos} />}
        {currentView === 'reports' && <ReportsPage allAppointments={appointments} />}
        {currentView === 'upload' && <UploadPage />}
        {currentView === 'admin_users' && isAdmin && <AdminUsersPage />}
      </main>

      <EditModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        appointment={selectedAppointment} 
        onSave={handleSaveAppointment} 
        onDelete={handleDeleteAppointment}
      />

      <NewAppointmentModal 
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSave={handleCreateAppointment}
        existingPeritos={uniquePeritos}
        existingSpecialties={uniqueSpecialties}
      />
    </div>
  );
};

const AppWrapper: React.FC = () => {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-900" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verificando Credenciais...</p>
    </div>
  );
  return session ? <AuthenticatedApp /> : <LoginPage />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AppWrapper />
  </AuthProvider>
);

export default App;
