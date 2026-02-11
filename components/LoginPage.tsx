
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Scale, Mail, Lock, Loader2, ArrowRight, KeyRound, AlertCircle, UserPlus, CheckCircle2, User } from 'lucide-react';
import { APP_VERSION } from '../constants';

type AuthMode = 'login' | 'register' | 'recovery';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setName('');
    setEmail('');
    setPassword('');
    setAcceptedTerms(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        // Validações de Cadastro
        if (!name.trim()) {
            throw new Error('Por favor, informe seu nome completo.');
        }
        if (!acceptedTerms) {
            throw new Error('Você precisa aceitar os termos de uso para continuar.');
        }

        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                // Salva o nome nos metadados do usuário
                data: { full_name: name },
                emailRedirectTo: window.location.origin 
            }
        });
        if (error) throw error;
        setSuccessMsg('Cadastro realizado! Se o login não for automático, verifique seu email.');
      }
    } catch (error: any) {
      setErrorMsg(error.message === 'Invalid login credentials' ? 'Credenciais inválidas.' : error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      setSuccessMsg('Verifique seu email! Um link de recuperação foi enviado.');
      setMode('login');
    } catch (error: any) {
      setErrorMsg(error.message || 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f0f4f8] bg-[radial-gradient(at_50%_0%,hsla(215,30%,96%,1)_0,transparent_50%)]">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header Visual */}
        <div className="bg-blue-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col items-center">
             <div className="bg-white/10 p-3 rounded-2xl mb-4 backdrop-blur-sm border border-white/20 shadow-lg">
                <Scale className="text-white" size={32} />
             </div>
             <h1 className="text-2xl font-black text-white tracking-tight">
               SIG<span className="text-red-500">PEF</span>
             </h1>
             <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.3em] mt-1">Sistema de Gestão de Perícias Federais</p>
          </div>
        </div>

        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm font-bold animate-in slide-in-from-top-2">
              <AlertCircle size={16} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-700 text-sm font-bold animate-in slide-in-from-top-2">
              <CheckCircle2 size={16} className="shrink-0" />
              {successMsg}
            </div>
          )}

          {/* Abas de Navegação */}
          {mode !== 'recovery' && (
            <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                <button 
                  onClick={() => { setMode('login'); resetForm(); }}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'login' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Login
                </button>
                <button 
                  onClick={() => { setMode('register'); resetForm(); }}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${mode === 'register' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Cadastro
                </button>
            </div>
          )}

          {mode === 'recovery' ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
               <div className="text-center mb-6">
                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-900">
                  <KeyRound size={20} />
                </div>
                <h3 className="text-lg font-black text-blue-900">Recuperar Senha</h3>
                <p className="text-xs text-slate-500 font-medium max-w-[200px] mx-auto">
                  Digite seu email para receber um link de redefinição.
                </p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Cadastrado</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-900 transition-colors" size={18} />
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-900 hover:bg-black text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Link'}
              </button>
              <button type="button" onClick={() => setMode('login')} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-900 transition-colors">Voltar</button>
            </form>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5">
              
              {/* Campo Nome (Apenas Cadastro) */}
              {mode === 'register' && (
                <div className="space-y-1.5 animate-in slide-in-from-left-2 fade-in">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-900 transition-colors" size={18} />
                    <input 
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all placeholder:font-medium"
                        placeholder="Dr. Nome Sobrenome"
                    />
                    </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Institucional</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-900 transition-colors" size={18} />
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all placeholder:font-medium"
                    placeholder="usuario@justica.gov.br"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Senha</label>
                   {mode === 'login' && (
                     <button type="button" onClick={() => setMode('recovery')} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider">Esqueci a senha</button>
                   )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-900 transition-colors" size={18} />
                  <input 
                    type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-900 focus:bg-white transition-all placeholder:font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Checkbox Termos (Apenas Cadastro) */}
              {mode === 'register' && (
                 <div className="flex items-start gap-3 pt-2 animate-in slide-in-from-left-2 fade-in">
                    <div className="relative flex items-center h-5">
                        <input
                            id="terms"
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="w-5 h-5 border-2 border-slate-300 rounded-lg text-blue-900 focus:ring-blue-900 transition-all cursor-pointer"
                        />
                    </div>
                    <label htmlFor="terms" className="text-xs font-medium text-slate-500 leading-snug cursor-pointer select-none">
                        Eu aceito os <span className="text-blue-900 font-bold hover:underline">termos de uso</span> e li a <span className="text-blue-900 font-bold hover:underline">política de privacidade</span>.
                    </label>
                 </div>
              )}

              <button 
                type="submit" disabled={loading}
                className={`w-full bg-blue-900 hover:bg-black text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 ${loading || (mode === 'register' && !acceptedTerms) ? 'opacity-70' : ''}`}
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : mode === 'login' ? <>Entrar no Sistema <ArrowRight size={16} /></> : <>Criar Conta <UserPlus size={16} /></>}
              </button>
            </form>
          )}
        </div>
        
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <p className="text-[9px] font-bold text-slate-400">© 2024 Justiça Federal • A&B Tecnologia • v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
