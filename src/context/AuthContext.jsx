import { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { apiPost, apiPut } from '../services/api';

const AuthContext = createContext(null);

function traduzErro(codigo) {
  const mapa = {
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  };
  return mapa[codigo] || 'Não foi possível completar a ação. Tente novamente.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, senha, remember) {
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), senha);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: traduzErro(err.code) };
    }
  }

  async function signup(email, senha, nome, modoGrupo, codigoGrupo, nomeOrcamento, remember) {
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      await updateProfile(cred.user, { displayName: nome.trim() });
      await cred.user.getIdToken(true); // força o token a incluir o nome já

      // Cria ou entra no orçamento depois que a conta já existe
      const result =
        modoGrupo === 'entrar'
          ? await apiPost('/orcamentos/entrar', { codigo: codigoGrupo })
          : await apiPost('/orcamentos', { nome: nomeOrcamento });

      return { ok: true, grupo: result.codigo || result.orcamentoId };
    } catch (err) {
      // Se a conta chegou a ser criada no Firebase mas o passo do
      // orçamento falhou, a pessoa ainda consegue logar depois e criar/
      // entrar em um orçamento pela barra lateral.
      const message = err.code ? traduzErro(err.code) : err.message;
      return { ok: false, message };
    }
  }

  async function atualizarNome(novoNome) {
    if (!auth.currentUser) return { ok: false, message: 'Sessão inválida.' };
    try {
      await updateProfile(auth.currentUser, { displayName: novoNome.trim() });
      await auth.currentUser.getIdToken(true);
      await apiPut('/perfil/nome', { nome: novoNome.trim() });
      setUser({ ...auth.currentUser });
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }

  function logout() {
    signOut(auth);
  }

  const value = {
    isAuthenticated: !!user,
    initializing,
    email: user?.email || '',
    uid: user?.uid || '',
    nome: user?.displayName || user?.email || '',
    login,
    signup,
    logout,
    atualizarNome,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
