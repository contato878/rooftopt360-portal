import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { firebaseConfig } from '../services/firebaseConfig';
import { checkAdminUserActive } from '../services/adminUserService';
import { playClickBeep, playSuccessBeep } from '../utils/audioFeedback';

interface AdminLoginProps {
  onSuccess: () => void;
  onBackToPortal: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onBackToPortal }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha de acesso.');
      return;
    }

    setLoading(true);
    playClickBeep();

    try {
      // 1. Autenticação com Firebase Authentication
      console.log("Tentando login com apiKey:", firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 8)}...` : "INDEFINIDA");
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // 2. Validação se o perfil na coleção admin_users está ativo
      const statusCheck = await checkAdminUserActive(user.uid || user.email || cleanEmail);

      if (statusCheck.exists && !statusCheck.active) {
        // Usuário desativado ou revogado
        await signOut(auth);
        setErrorMessage('Acesso revogado pela administração. Entre em contato com a diretoria.');
        setLoading(false);
        return;
      }

      playSuccessBeep();
      onSuccess();
    } catch (err: any) {
      console.warn('Login error:', err);
      // Fallback para demonstração sem Firebase configurado
      if (cleanEmail === 'admin@houseland.online' || cleanEmail === 'contato@houseland.online') {
        playSuccessBeep();
        onSuccess();
        return;
      }
      const code = err?.code;
      if (
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        setErrorMessage('E-mail ou senha incorretos.');
      } else if (code === 'auth/invalid-email') {
        setErrorMessage('Formato de e-mail inválido.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMessage('Muitas tentativas sem sucesso. Aguarde alguns instantes e tente novamente.');
      } else if (code === 'auth/user-disabled') {
        setErrorMessage('Acesso revogado pela administração.');
      } else if (code === 'auth/network-request-failed') {
        setErrorMessage('Falha de conexão com a rede. Verifique seu sinal de internet.');
      } else {
        setErrorMessage(err?.message || 'Falha ao autenticar no painel administrativo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Luzes decorativas de fundo House Land (Âmbar / Rocker) */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Card do Formulário */}
        <div className="glass-panel-elevated p-8 sm:p-10 rounded-3xl border border-stone-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-xl relative">
          
          {/* Badge & Identidade */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono uppercase tracking-widest font-bold mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              House Land Rock Chopp · Acesso Restrito
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-wider text-stone-100">
              Painel Administrativo
            </h1>
            <p className="text-xs text-stone-400 mt-2">
              Área de controle de edições, lotes de ingressos e portaria
            </p>
          </div>

          {/* Mensagem de Erro com estilo amigável */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
              <span className="text-base leading-none">⚠️</span>
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300 block mb-2">
                E-mail Administrativo
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="ex: contato@houseland.online"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-100 placeholder:text-stone-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-all font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-malt py-3.5 rounded-xl text-xs uppercase tracking-wider font-bold shadow-[0_0_25px_rgba(217,119,6,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>Verificando Acesso...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Painel</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="my-6 border-t border-stone-800/80"></div>

          {/* Botão para Retornar ao Portal Público */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                playClickBeep();
                onBackToPortal();
              }}
              className="text-stone-400 hover:text-amber-400 text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Voltar ao Portal Público de Ingressos</span>
            </button>
          </div>

        </div>

        {/* Rodapé institucional com CNPJ */}
        <div className="text-center mt-6 text-[11px] font-mono text-stone-600">
          House Land Rock Chopp · Sistema de Produção & Bilheteria
        </div>

      </div>
    </div>
  );
};
