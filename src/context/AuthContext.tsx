import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, getCurrentUserApi, loginApi, logoutApi } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { email?: string; matricule?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('dahirah_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUserApi();
      setUser(currentUser);
      if (currentUser) {
        localStorage.setItem('dahirah_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('dahirah_current_user');
      }
    } catch (err) {
      console.warn('Vérification session utilisateur échouée:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: { email?: string; matricule?: string; password: string }) => {
    const result = await loginApi(credentials);
    setUser(result.user);
    localStorage.setItem('dahirah_current_user', JSON.stringify(result.user));
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    localStorage.removeItem('dahirah_current_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
