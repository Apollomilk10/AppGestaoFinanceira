import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vercel serve o app na raiz do domínio. No GitHub Pages era
  // '/AppGestaoFinanceira/' porque o site vivia num subcaminho.
  base: '/',
  build: {
    // Sem separação manual de chunks: forçá-la já causou tela branca por
    // ordem de inicialização errada do React. O ganho de cache não vale o
    // risco — o carregamento sob demanda das abas (React.lazy) já resolve
    // a maior parte do peso inicial com segurança.
    chunkSizeWarningLimit: 900,
  },
});
