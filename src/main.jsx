import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { OrcamentosProvider } from './context/OrcamentosContext.jsx';
import { CategoriesProvider } from './context/CategoriesContext.jsx';
import './index.css';

/**
 * Rede de segurança do boot.
 *
 * Qualquer erro antes do primeiro render deixava a tela em branco — o pior
 * tipo de falha, porque não dá nenhuma pista de onde olhar. Aqui o erro vira
 * texto na tela: quem abriu o app consegue dizer o que aconteceu sem precisar
 * de console de navegador.
 */
function mostrarFalha(titulo, detalhe) {
  const raiz = document.getElementById('root');
  if (!raiz) return;
  raiz.innerHTML =
    '<div style="min-height:100vh;display:flex;flex-direction:column;justify-content:center;' +
    'gap:12px;padding:28px;font-family:system-ui,sans-serif;color:#0f2b25;background:#f4f7f5;' +
    'line-height:1.5"><strong style="font-size:19px">' + titulo + '</strong>' +
    '<pre style="white-space:pre-wrap;word-break:break-word;font-size:12.5px;color:#6b807a;' +
    'background:#fff;padding:14px;border-radius:14px;margin:0">' + detalhe + '</pre></div>';
}

// Variáveis que o app precisa ter recebido no momento do build. Acesso
// estático de propósito: é assim que o Vite substitui o valor no bundle.
const exigidas = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
  VITE_API_URL: import.meta.env.VITE_API_URL,
};

const faltando = Object.entries(exigidas)
  .filter(([, valor]) => !valor)
  .map(([chave]) => chave);

window.addEventListener('error', (evento) => {
  mostrarFalha('O app não conseguiu iniciar', String(evento.error?.stack || evento.message));
});
window.addEventListener('unhandledrejection', (evento) => {
  mostrarFalha('O app não conseguiu iniciar', String(evento.reason?.stack || evento.reason));
});

if (faltando.length > 0) {
  mostrarFalha(
    'Configuração faltando no build',
    'Estas variáveis não chegaram ao build da Vercel:\n\n' +
      faltando.join('\n') +
      '\n\nCadastre-as em Settings → Environment Variables (Production) e refaça o deploy.',
  );
} else {
  try {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <ThemeProvider>
          <AuthProvider>
            <OrcamentosProvider>
              <CategoriesProvider>
                <App />
              </CategoriesProvider>
            </OrcamentosProvider>
          </AuthProvider>
        </ThemeProvider>
      </React.StrictMode>,
    );
  } catch (erro) {
    mostrarFalha('O app não conseguiu iniciar', String(erro?.stack || erro));
  }
}
