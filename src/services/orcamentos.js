import { apiGet, apiPost, apiPut, apiDelete } from './api';

export async function fetchOrcamentos() {
  const result = await apiGet('/orcamentos');
  return result.rows;
}

export async function criarOrcamento(nome) {
  return apiPost('/orcamentos', { nome });
}

export async function entrarOrcamento(codigo) {
  return apiPost('/orcamentos/entrar', { codigo });
}

export async function excluirOrcamento(orcamentoId) {
  return apiDelete(`/orcamentos/${orcamentoId}`);
}

export async function fetchMeusGastos() {
  const result = await apiGet('/meus-gastos');
  return result.rows;
}

export function definirCorMembro(orcamentoId, uid, cor) {
  return apiPut(`/orcamentos/${orcamentoId}/membros/${uid}/cor`, { cor });
}

export function definirPercentuais(orcamentoId, itens) {
  return apiPut(`/orcamentos/${orcamentoId}/membros-percentuais`, { itens });
}

export async function fetchMembros(orcamentoId) {
  const result = await apiGet(`/orcamentos/${orcamentoId}/membros`);
  return result.rows;
}
