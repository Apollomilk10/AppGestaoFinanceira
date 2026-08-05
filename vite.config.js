import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/AppGestaoFinanceira/',
  build: {
    rollupOptions: {
      output: {
        // Separa só bibliotecas grandes e independentes. React NÃO entra
        // aqui de propósito: forçar um chunk próprio pra ele quebra a
        // ordem de inicialização (react-dom carregava antes do react) e
        // derrubava o app com tela branca.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
          if (id.includes('lucide-react')) return 'icons';
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
});
