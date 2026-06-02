import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'PARENT';
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  clearMustChangePassword: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // localStorage (beni hatırla) veya sessionStorage (geçici oturum) kontrol et
    const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser  = localStorage.getItem('user')  || sessionStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, rememberMe = false) => {
    const response = await api.post('/auth/login', { username, password, rememberMe });
    const { token: newToken, user: newUser } = response.data.data;

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', newToken);
    storage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  // Şifre değiştirildikten sonra flag'i sıfırla (sayfayı yeniden yüklemeden)
  const clearMustChangePassword = () => {
    setUser((prev) => prev ? { ...prev, mustChangePassword: false } : null);
    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.mustChangePassword = false;
      if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(parsed));
      else sessionStorage.setItem('user', JSON.stringify(parsed));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, clearMustChangePassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
