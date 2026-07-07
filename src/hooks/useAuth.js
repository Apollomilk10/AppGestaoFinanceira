import { useState } from 'react';

const STORAGE_KEY = 'obra-auth';

// Formato no .env: "email1:senha1,email2:senha2"
const RAW_USERS = import.meta.env.VITE_APP_USERS || '';

function parseUsers(raw) {
  return raw
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [email, ...resto] = pair.split(':');
      return {
        email: (email || '').trim().toLowerCase(),
        password: resto.join(':').trim(), // permite ':' dentro da senha
      };
    })
    .filter((u) => u.email && u.password);
}

const USERS = parseUsers(RAW_USERS);

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return (
      localStorage.getItem(STORAGE_KEY) === 'true' ||
      sessionStorage.getItem(STORAGE_KEY) === 'true'
    );
  });
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem(`${STORAGE_KEY}-email`) || sessionStorage.getItem(`${STORAGE_KEY}-email`) || '';
  });

  function login(email, password, remember) {
    if (USERS.length === 0) {
      return {
        ok: false,
        message:
          'Login não configurado. Defina VITE_APP_USERS no .env (formato: email1:senha1,email2:senha2).',
      };
    }

    const emailNormalizado = email.trim().toLowerCase();
    const usuarioValido = USERS.find(
      (u) => u.email === emailNormalizado && u.password === password
    );

    if (usuarioValido) {
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(STORAGE_KEY, 'true');
      storage.setItem(`${STORAGE_KEY}-email`, usuarioValido.email);
      setIsAuthenticated(true);
      setUserEmail(usuarioValido.email);
      return { ok: true };
    }

    return { ok: false, message: 'E-mail ou senha incorretos.' };
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(`${STORAGE_KEY}-email`);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(`${STORAGE_KEY}-email`);
    setIsAuthenticated(false);
    setUserEmail('');
  }

  return { isAuthenticated, userEmail, login, logout };
}
