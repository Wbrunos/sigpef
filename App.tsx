
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
  
  const [notification, setNotification] = useState<{ id: string; msg: string } | null>(null);
  const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const todayDate = new Date();
  const [searchTerm, setSearchTerm] = useState('');
  const [peritoFilter, setPeritoFilter] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Estados de Data inicializados com o dia atual para exibição inicial
  const [yearFilter, setYearFilter] = useState(todayDate.getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState((todayDate.getMonth() + 1).toString().padStart(2, '0'));
  const [dayFilter, setDayFilter] = useState(todayDate.getDate().toString().padStart(2, '0'));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const showNewBadge = useMemo(() => {
    return new Date() < new Date(BADGE_EXPIRATION_DATE);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Erro ao carregar pauta:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadGlobalMessagesData = async () => {
      const msgs = await fetchGlobalMessages();
      setGlobalMessages(msgs);
      const lastReadId = Number(localStorage.getItem('sigpef_last_read_msg_id') || 0);
      const unread = msgs.filter(m => m.id > lastReadId).length;
      setUnreadCount(unread);
  };

  const triggerNotification = (message: string) => {
    setNotification({ 
        id: `${Date.now()}-${Math.random()}`, 
        msg: message 
    });
  };

  useEffect(() => {
    loadData();
    loadGlobalMessagesData();
    
    if (supabase) {
      const dataChannel = supabase
        .channel('system-data-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pericias' }, () => {
          loadData(true); 
        })
        .subscribe();

      return () => {
        supabase.removeChannel(dataChannel);
      };
    }
  }, []);

  const uniquePeritos = useMemo(() => Array.from(new Set(appointments.map(a => a.perito))).filter(Boolean).sort(), [appointments]);
  const uniqueSpecialties = useMemo(() => Array.from(new Set(appointments.map(a => a.especialidade))).filter(Boolean).sort(), [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      // 1. Busca textual
      const matchesSearch = apt.periciado?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
      
      // 2. Filtros de Profissional
      const matchesPerito = !peritoFilter || apt.perito === peritoFilter;
      const matchesSpecialty = !specialtyFilter || apt.especialidade === specialtyFilter;
      
      // 3. Filtro de Status
      const aptStatus = (apt.observacao || 'PENDENTE').toUpperCase();
      const filterStatus = statusFilter?.toUpperCase();
      const matchesStatus = !statusFilter ? true : (filterStatus === 'PENDENTE' ? (!apt.observacao || apt.observacao === '') : aptStatus === filterStatus);
      
      // 4. Filtragem rigorosa por Data (YYYY-MM-DD)
      if (!apt.data) return false;
      const parts = apt.data.split('-');
      if (parts.length !== 3) return false;
      const [y, m, d] = parts;

      const matchesYear = !yearFilter || y === yearFilter;
      const matchesMonth = !monthFilter || m === monthFilter;
      const matchesDay = !dayFilter || d === dayFilter;

      return matchesSearch && matchesPerito && matchesSpecialty && matchesStatus && matchesYear && matchesMonth && matchesDay;
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
     }
  };

  const handleCreateAppointment = async (data: { data: string; periciado: string; perito: string; especialidade: string }) => {
     const success = await createAppointment(data);
     if (success) {
        if (userProfile?.email) {
            logSystemAction(userProfile.email, 'NOVA PERÍCIA', `Cadastrou perícia: ${data.periciado}`);
        }
        triggerNotification("Perícia cadastrada!");
        loadData(true);
     }
  };

  const handleDeleteAppointment = async (id: number | string) => {
    const success = await deleteAppointment(id);
    if (success) {
      triggerNotification("Perícia excluída.");
      setIsModalOpen(false);
      loadData(true);
    }
  };

  if (!isApproved) return <PendingApprovalScreen onLogout={signOut} onRefresh={refreshProfile} />;

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 text-blue-900 relative">
      
      {notification && (
        <NotificationToast 
          key={notification.id} 
          message={notification.msg} 
          onClose={() => setNotification(null)} 
        />
      )}

      <SystemNotificationsModal 
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        messages={globalMessages}
      />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900 p-2.5 rounded-xl shadow-lg relative">
             <Scale className="text-white" size={24} />
             <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm"></div>
          </div>
          <div>
            <h1 className="text-xl font-black text-blue-900 tracking-tight">SIG<span className="text-red-700">PEF</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">v{APP_VERSION}</p>
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
            <button onClick={() => setIsNotifModalOpen(true)} className="relative p-3.5 bg-white border border-slate-200 text-slate-600 hover:text-blue-900 rounded-2xl shadow-sm transition-all active:scale-90">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
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
                 {canEdit && (
                    <button onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                      <Plus size={16} /> <span>Nova Perícia</span>
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
                <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</p>
              </div>
            ) : (
              <AppointmentList 
                appointments={filteredAppointments} 
                onEdit={(apt) => { if(canEdit) { setSelectedAppointment(apt); setIsModalOpen(true); } }} 
              />
            )}
          </div>
        )}
        {currentView === 'attendance' && <AttendancePage availablePeritos={uniquePeritos} />}
        {currentView === 'reports' && <ReportsPage allAppointments={appointments} />}
        {currentView === 'upload' && <UploadPage />}
        {currentView === 'admin_users' && isAdmin && <AdminUsersPage />}
      </main>

      <EditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} appointment={selectedAppointment} onSave={handleSaveAppointment} onDelete={handleDeleteAppointment} />
      <NewAppointmentModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} onSave={handleCreateAppointment} existingPeritos={uniquePeritos} existingSpecialties={uniqueSpecialties} />
    </div>
  );
};

const AppWrapper: React.FC = () => {
  const { session, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="animate-spin text-blue-900" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Autenticando...</p>
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
