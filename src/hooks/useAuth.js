import { useState } from 'react';

const STORAGE_KEY = 'obra-auth';

const VALID_EMAIL = import.meta.env.VITE_APP_EMAIL;
const VALID_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  function login(email, password) {
    if (!VALID_EMAIL || !VALID_PASSWORD) {
      return {
        ok: false,
        message:
          'Login não configurado. Defina VITE_APP_EMAIL e VITE_APP_PASSWORD no .env.',
      };
    }

    const emailOk = email.trim().toLowerCase() === VALID_EMAIL.toLowerCase();
    const passwordOk = password === VALID_PASSWORD;

    if (emailOk && passwordOk) {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      return { ok: true };
    }

    return { ok: false, message: 'E-mail ou senha incorretos.' };
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(false);
  }

  return { isAuthenticated, login, logout };
}
