import { apiGet } from './api';

export async function fetchCustomCategories({ orcamentoId }) {
  if (!orcamentoId) return [];
  try {
    const result = await apiGet(`/orcamentos/${orcamentoId}/categorias`);
    return result.rows;
  } catch {
    return [];
  }
}
