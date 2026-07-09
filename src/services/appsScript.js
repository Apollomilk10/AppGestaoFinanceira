import { apiGet, apiPost, apiPut, apiDelete } from './api';

export function postGasto(gasto, session) {
  return apiPost(`/orcamentos/${session.orcamentoId}/gastos`, gasto);
}

export function updateGasto(gastoId, gasto, session) {
  return apiPut(`/orcamentos/${session.orcamentoId}/gastos/${gastoId}`, gasto);
}

export function deleteGasto(gastoId, session) {
  return apiDelete(`/orcamentos/${session.orcamentoId}/gastos/${gastoId}`);
}

export function sendFeedback(mensagem) {
  return apiPost('/feedback', { mensagem });
}

export function addCategoria(payload, session) {
  return apiPost(`/orcamentos/${session.orcamentoId}/categorias`, payload);
}

export function deleteCategoria(orcamentoId, categoriaId) {
  return apiDelete(`/orcamentos/${orcamentoId}/categorias/${categoriaId}`);
}

export async function fetchPorIntegrante(orcamentoId) {
  const result = await apiGet(`/orcamentos/${orcamentoId}/por-integrante`);
  return result.rows;
}
