import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { checkAdminUserActive } from '../services/adminUserService';
import { AdminLogin } from './AdminLogin';

interface AdminProtectedRouteProps {
  children: (props: { currentUser: User; onLogout: () => Promise<void> }) => React.ReactNode;
  onExitToPortal: () => void;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({
  children,
  onExitToPortal
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string>('');

  useEffect(() => {
    // Monitora o estado de autenticação em tempo real
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Fallback para ambiente demo local se autenticado via session
        const demoAuth = sessionStorage.getItem('hl360_demo_admin');
        if (demoAuth) {
          setCurrentUser({ uid: 'adm-demo', email: 'admin@houseland.online' } as any);
        } else {
          setCurrentUser(null);
        }
        setCheckingAuth(false);
        return;
      }

      // Validação adicional: confirma se o usuário consta ativo na coleção admin_users
      try {
        const check = await checkAdminUserActive(user.uid || user.email || '');
        if (check.exists && !check.active) {
          await signOut(auth);
          setCurrentUser(null);
          setAccessDeniedMessage('Acesso revogado pela administração.');
          setCheckingAuth(false);
          return;
        }

        setCurrentUser(user);
      } catch (err) {
        console.warn('Erro ao validar perfil admin:', err);
        // Em caso de falha de conexão, mantém o usuário autenticado pelo Firebase Auth
        setCurrentUser(user);
      } finally {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('hl360_demo_admin');
      await signOut(auth);
      setCurrentUser(null);
    } catch (err) {
      console.warn('Erro no signOut:', err);
      setCurrentUser(null);
    }
  };

  // 1. Loading Skeleton / Spinner com tema escuro e detalhes em âmbar
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#08080a] flex flex-col items-center justify-center p-6 text-stone-300 font-sans select-none">
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <span className="text-xl">🛡️</span>
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-amber-500 border-t-transparent animate-spin"></div>
          </div>
          
          <div className="text-center space-y-1">
            <span className="text-xs uppercase font-mono tracking-widest text-amber-500 font-bold block">
              House Land Rock Chopp · Autenticação
            </span>
            <span className="text-sm font-semibold text-stone-300">
              Verificando credenciais de acesso seguro...
            </span>
          </div>

          <div className="w-48 h-1 bg-stone-900 rounded-full overflow-hidden mt-2">
            <div className="w-full full bg-gradient-to-r from-amber-600 to-amber-400 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Se NÃO houver usuário autenticado, exibe a tela de login
  if (!currentUser) {
    return (
      <div className="relative">
        {accessDeniedMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs shadow-2xl backdrop-blur-md">
            ⚠️ {accessDeniedMessage}
          </div>
        )}
        <AdminLogin
          onSuccess={() => {
            sessionStorage.setItem('hl360_demo_admin', 'true');
            setCurrentUser({ uid: 'adm-demo', email: 'admin@houseland.online' } as any);
            setAccessDeniedMessage('');
          }}
          onBackToPortal={onExitToPortal}
        />
      </div>
    );
  }

  // 3. Usuário autenticado e com acesso ativo: renderiza o painel
  return <>{children({ currentUser, onLogout: handleLogout })}</>;
};
