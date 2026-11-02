import { apiGet, apiPost, apiDelete } from './api';

export async function fetchLixeira(orcamentoId) {
  return apiGet(`/orcamentos/${orcamentoId}/lixeira`);
}

export function restaurarDaLixeira(orcamentoId, itemId) {
  return apiPost(`/orcamentos/${orcamentoId}/lixeira/${itemId}/restaurar`, {});
}

export function apagarDeVez(orcamentoId, itemId) {
  return apiDelete(`/orcamentos/${orcamentoId}/lixeira/${itemId}`);
}
