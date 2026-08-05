import { apiGet, apiPost, apiPut, apiDelete } from './api';

export async function fetchContas(orcamentoId) {
  const r = await apiGet(`/orcamentos/${orcamentoId}/contas`);
  return r.rows;
}
export function criarConta(orcamentoId, dados) {
  return apiPost(`/orcamentos/${orcamentoId}/contas`, dados);
}
export function atualizarConta(orcamentoId, contaId, dados) {
  return apiPut(`/orcamentos/${orcamentoId}/contas/${contaId}`, dados);
}
export function excluirConta(orcamentoId, contaId) {
  return apiDelete(`/orcamentos/${orcamentoId}/contas/${contaId}`);
}

export async function fetchLimites(orcamentoId) {
  const r = await apiGet(`/orcamentos/${orcamentoId}/limites`);
  return r.rows;
}
export function definirLimite(orcamentoId, categoriaChave, valorLimite) {
  return apiPut(`/orcamentos/${orcamentoId}/limites`, { categoriaChave, valorLimite });
}
