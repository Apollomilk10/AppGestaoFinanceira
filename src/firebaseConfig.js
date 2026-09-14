import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

/**
 * Configuração do app web no Firebase.
 *
 * Os valores ficam aqui como padrão de propósito. Essa configuração não é
 * segredo: ela é embutida no bundle de qualquer front-end e fica visível
 * pra quem abrir o código-fonte da página. Quem protege os dados são as
 * regras do Firestore e a lista de domínios autorizados no Authentication.
 *
 * A variável de ambiente continua tendo prioridade — serve pra apontar o
 * app pra outro projeto do Firebase sem tocar no código.
 */
const PADRAO = {
  apiKey: 'AIzaSyAtpgnvCGoeF-kg5ZJBlLq2qKFNabVY-9U',
  authDomain: 'appfinanca-c0eb2.firebaseapp.com',
  projectId: 'appfinanca-c0eb2',
  storageBucket: 'appfinanca-c0eb2.firebasestorage.app',
  messagingSenderId: '822108688816',
  appId: '1:822108688816:web:14f8720271ceb9acd40675',
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || PADRAO.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || PADRAO.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || PADRAO.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || PADRAO.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || PADRAO.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || PADRAO.appId,
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
