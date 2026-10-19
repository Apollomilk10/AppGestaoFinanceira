import { apiGet, apiPost, apiDelete } from './api';

export async function fetchFinanciamentos(orcamentoId) {
  const r = await apiGet(`/orcamentos/${orcamentoId}/financiamentos`);
  return r.rows;
}

export function criarFinanciamento(orcamentoId, dados) {
  return apiPost(`/orcamentos/${orcamentoId}/financiamentos`, dados);
}

export function excluirFinanciamento(orcamentoId, financiamentoId) {
  return apiDelete(`/orcamentos/${orcamentoId}/financiamentos/${financiamentoId}`);
}
