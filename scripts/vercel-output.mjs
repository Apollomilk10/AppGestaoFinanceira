/**
 * Escreve o config.json da Build Output API (v3) ao lado dos arquivos
 * estáticos gerados pelo Vite em .vercel/output/static.
 *
 * Por que isso existe: o projeto na Vercel foi criado com o preset
 * "FastAPI" (herança da época em que o backend morava no mesmo repo) e,
 * com esse preset, a Vercel ignora o outputDirectory do vercel.json e
 * falha dizendo que não achou "dist". Entregando a saída já no formato
 * da Build Output API, o preset deixa de importar: a Vercel serve o que
 * está em .vercel/output, ponto.
 */
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';

const config = {
  version: 3,
  routes: [
    // Hash no nome do arquivo garante que o conteúdo nunca muda: cache longo.
    {
      src: '/assets/(.*)',
      headers: { 'cache-control': 'public, max-age=31536000, immutable' },
      continue: true,
    },
    { src: '/manifest.json', headers: { 'cache-control': 'public, max-age=0, must-revalidate' }, continue: true },
    // Arquivo existente ganha do fallback.
    { handle: 'filesystem' },
    // SPA: qualquer rota desconhecida volta pro index.
    { src: '/.*', dest: '/index.html' },
  ],
};

mkdirSync('.vercel/output', { recursive: true });
// Espelha o dist em .vercel/output/static: assim a Vercel encontra a saída
// tanto pelo caminho clássico (outputDirectory) quanto pela Build Output API.
cpSync('dist', '.vercel/output/static', { recursive: true });
writeFileSync('.vercel/output/config.json', JSON.stringify(config, null, 2));
console.log('Build Output API: .vercel/output/config.json escrito');
