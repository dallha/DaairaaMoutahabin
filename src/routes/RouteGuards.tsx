import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex flex-col items-center justify-center text-primary gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">refresh</span>
        <span className="font-body-md text-sm text-on-surface-variant">Chargement de la session souveraine...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface PublicRouteProps {
  children: ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center text-primary">
        <span className="material-symbols-outlined text-[36px] animate-spin">refresh</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

interface RoleGuardProps {
  allowed: ('superadmin' | 'admin' | 'agent' | 'member')[];
  children: ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowed, children }) => {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 rounded-2xl bg-surface-container-low border border-red-500/30 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">shield_person</span>
        </div>
        <h2 className="font-headline-sm text-xl font-bold text-on-surface">Accès Restreint</h2>
        <p className="font-body-md text-sm text-on-surface-variant max-w-md">
          Cette section requiert des privilèges d'accréditation supérieurs ({allowed.join(', ')}). Votre rôle actuel ({user?.role || 'visiteur'}) n'autorise pas cette opération.
        </p>
        <a
          href="/dashboard"
          className="px-5 py-2 rounded-xl bg-surface-container-highest hover:bg-surface-bright text-primary font-label-md text-xs font-semibold transition"
        >
          Retour au Tableau de Bord
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
