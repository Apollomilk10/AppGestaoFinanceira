import { apiGet, apiPost, apiDelete } from './api';

export async function fetchMetas(orcamentoId) {
  const result = await apiGet(`/orcamentos/${orcamentoId}/metas`);
  return result.rows;
}

export function criarMeta(orcamentoId, { nome, valorAlvo, dataAlvo }) {
  return apiPost(`/orcamentos/${orcamentoId}/metas`, { nome, valorAlvo, dataAlvo });
}

export function aportarMeta(orcamentoId, metaId, valor) {
  return apiPost(`/orcamentos/${orcamentoId}/metas/${metaId}/aporte`, { valor });
}

export function excluirMeta(orcamentoId, metaId) {
  return apiDelete(`/orcamentos/${orcamentoId}/metas/${metaId}`);
}
