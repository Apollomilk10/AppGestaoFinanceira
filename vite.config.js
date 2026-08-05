import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/AppGestaoFinanceira/',
  build: {
    // Separa as bibliotecas pesadas em arquivos próprios: o navegador
    // guarda cada uma em cache independente, então uma mudança no código
    // do app não invalida o download do Recharts/Firebase de novo.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          firebase: ['firebase/app', 'firebase/auth'],
          icons: ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
