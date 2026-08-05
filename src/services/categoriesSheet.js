import { apiGet } from './api';

export async function fetchCustomCategories({ orcamentoId }) {
  if (!orcamentoId) return [];
  const result = await apiGet(`/orcamentos/${orcamentoId}/categorias`);
  return result.rows;
}

/**
 * Busca as categorias customizadas de TODOS os orçamentos informados e
 * junta tudo numa lista só (mesma lógica da agregação de gastos).
 */
export async function fetchCustomCategoriesAgregadas(orcamentos) {
  const listas = await Promise.all(
    orcamentos.map(async (o) => {
      const rows = await fetchCustomCategories({ orcamentoId: o.id });
      // carrega o orçamento de origem junto: é o que permite excluir depois
      return rows.map((r) => ({ ...r, orcamentoId: o.id }));
    })
  );
  return listas.flat();
}
