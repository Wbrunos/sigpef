
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  isApproved: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // RBAC seguro
  const isApproved = userProfile?.approved === true;
  const isAdmin = userProfile?.role === 'admin' && isApproved;
  const canEdit = (userProfile?.role === 'admin' || userProfile?.role === 'editor') && isApproved;

  const fetchProfile = async (sessionData: Session) => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const userId = sessionData.user.id;
      const userEmail = sessionData.user.email;
      // Recupera o nome dos metadados do Auth (onde o Login salva)
      const metaName = sessionData.user.user_metadata?.full_name || '';

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, approved, full_name') // Agora lemos o nome do banco também
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error.message);
        // Fallback resiliente
        setUserProfile({
          id: userId,
          email: userEmail || '',
          full_name: metaName,
          role: 'viewer',
          approved: false
        });
      } else if (data) {
        // Sucesso: Prioriza o nome do banco, se vazio usa o do metadado
        setUserProfile({
            id: data.id,
            email: data.email,
            role: data.role,
            approved: data.approved,
            full_name: data.full_name || metaName 
        });
      } else {
        // Perfil ainda não criado pela Trigger (muito rápido após cadastro)
        setUserProfile({
          id: userId,
          email: userEmail || '',
          full_name: metaName,
          role: 'viewer',
          approved: false
        });
      }
    } catch (e) {
      console.error('Crash no AuthContext:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Check inicial de sessão
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session);
      } else {
        setLoading(false);
      }
    });

    // 2. Listener de mudanças (Login, Logout, Auto-refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (session) {
        // IMPORTANTE: Setar loading true aqui previne a tela branca
        setLoading(true); 
        fetchProfile(session);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUserProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => {
    setLoading(true);
    if (session) {
        await fetchProfile(session);
    } else {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, loading, isAdmin, canEdit, isApproved, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
