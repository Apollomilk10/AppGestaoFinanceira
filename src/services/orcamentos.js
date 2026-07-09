import { apiGet, apiPost } from './api';

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

export async function fetchMeusGastos() {
  const result = await apiGet('/meus-gastos');
  return result.rows;
}
