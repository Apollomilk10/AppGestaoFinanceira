import { createContext, useContext, useState } from 'react';
import { signup as signupApi, login as loginApi } from '../services/auth';

const STORAGE_KEY = 'obra-session';
const AuthContext = createContext(null);

function readStoredSession() {
  const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  function persist(sessionData, remember) {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  }

  async function login(email, senha, remember) {
    try {
      const result = await loginApi({ email, senha });
      const sessionData = { email: result.email, token: result.token };
      persist(sessionData, remember);
      setSession(sessionData);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  async function signup(email, senha, modoGrupo, codigoGrupo, nomeOrcamento, remember) {
    try {
      const result = await signupApi({ email, senha, modoGrupo, codigoGrupo, nomeOrcamento });
      const sessionData = { email: result.email, token: result.token };
      persist(sessionData, remember);
      setSession(sessionData);
      return { ok: true, grupo: result.orcamentoId };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  const value = {
    isAuthenticated: !!session,
    email: session?.email || '',
    token: session?.token || '',
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
