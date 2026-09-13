import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Se as variáveis não chegarem ao build, o Firebase estoura antes de
 * qualquer tela existir. Em vez de morrer em branco, mostramos o que
 * cada variável trouxe — só o tamanho e o começo do valor, o bastante
 * pra distinguir "não veio nada" de "veio errado".
 */
function resumo(valor) {
  if (valor === undefined) return 'ausente';
  if (valor === '') return 'vazia';
  return `${String(valor).length} caracteres, começa com "${String(valor).slice(0, 4)}"`;
}

let app;
let authInstance;

try {
  app = initializeApp(firebaseConfig);
  authInstance = getAuth(app);
} catch (erro) {
  const diagnostico = Object.entries(firebaseConfig)
    .map(([chave, valor]) => `${chave}: ${resumo(valor)}`)
    .join('\n');
  if (typeof window !== 'undefined' && window.__casaErro) {
    window.__casaErro(
      'Configuração do Firebase inválida',
      `${erro.message}\n\nO que chegou no build:\n${diagnostico}`,
    );
  }
  throw erro;
}

export const firebaseApp = app;
export const auth = authInstance;
