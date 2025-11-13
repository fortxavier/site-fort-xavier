"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from './supabase';

interface User {
  id: string;
  username: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se há usuário logado no localStorage ao carregar
  useEffect(() => {
    const savedUser = localStorage.getItem('admin_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
        localStorage.removeItem('admin_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Chamar a função RPC do Supabase para autenticar
      const { data, error } = await supabase
        .rpc('authenticate_user', {
          p_username: username,
          p_password: password
        });

      if (error) {
        console.error('Erro ao autenticar:', error);
        return false;
      }

      // Se retornou dados, o usuário foi autenticado
      if (data && data.length > 0) {
        const authenticatedUser = data[0];
        const userData: User = {
          id: authenticatedUser.id,
          username: authenticatedUser.username,
          name: authenticatedUser.name
        };
        
        setUser(userData);
        localStorage.setItem('admin_user', JSON.stringify(userData));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('admin_user');
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        {/* <p>Carregando...</p> */}
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

