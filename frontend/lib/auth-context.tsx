"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { fetchApi, getAuthToken, setAuthToken, removeAuthToken } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: string;
  status: string;
  is_demo_user: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await fetchApi<User>("/api/v1/auth/me");
      setUser(data);
    } catch {
      removeAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await fetchApi<{ access_token: string; user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: pass }),
    });
    setAuthToken(res.access_token);
    setUser(res.user);
  };

  const demoLogin = async () => {
    const res = await fetchApi<{ access_token: string; user: User }>("/api/v1/auth/demo-login", {
      method: "POST",
    });
    setAuthToken(res.access_token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await fetchApi<{ access_token: string; user: User }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password: pass }),
    });
    setAuthToken(res.access_token);
    setUser(res.user);
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, demoLogin, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
