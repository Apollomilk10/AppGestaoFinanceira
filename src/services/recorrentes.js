import { apiGet, apiPost, apiDelete } from './api';

export async function fetchRecorrentes(orcamentoId) {
  const result = await apiGet(`/orcamentos/${orcamentoId}/recorrentes`);
  return result.rows;
}

export function criarRecorrente(orcamentoId, dados) {
  return apiPost(`/orcamentos/${orcamentoId}/recorrentes`, dados);
}

export function excluirRecorrente(orcamentoId, recorrenteId) {
  return apiDelete(`/orcamentos/${orcamentoId}/recorrentes/${recorrenteId}`);
}

export function processarRecorrentes(orcamentoId) {
  return apiPost(`/orcamentos/${orcamentoId}/recorrentes/processar`, {});
}
