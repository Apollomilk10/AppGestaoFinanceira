import { apiGet, apiPost } from './api';

function parseDataBR(raw) {
  if (!raw) return null;
  const str = raw.toString().trim();
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export async function fetchGastosDeOrcamento(orcamento) {
  // Materializa lançamentos de contas recorrentes do mês atual, se ainda
  // não tiverem sido gerados — silencioso, não bloqueia a leitura se falhar.
  try {
    await apiPost(`/orcamentos/${orcamento.id}/recorrentes/processar`, {});
  } catch {
    // segue sem travar a leitura dos gastos
  }

  const result = await apiGet(`/orcamentos/${orcamento.id}/gastos`);

  return result.rows
    .map((row) => ({
      id: row.id,
      rowNumber: row.id,
      orcamentoId: orcamento.id,
      orcamentoNome: orcamento.nome,
      data: parseDataBR(row.data),
      categoria: (row.categoria || 'Sem categoria').toString().trim(),
      descricao: (row.descricao || '').toString().trim(),
      valor: Number(row.valor) || 0,
      responsavel: (row.responsavel || '').toString().trim(),
      etapa: (row.etapa || 'Sem etapa').toString().trim(),
      tipo: row.tipo === 'receita' ? 'receita' : 'despesa',
      status: row.status === 'projetado' ? 'projetado' : 'confirmado',
      criadoPorNome: (row.criadoPorNome || row.criadoPorEmail || '').toString().trim(),
    }))
    .filter((row) => row.valor > 0 || row.descricao);
}

/**
 * Busca os gastos de TODOS os orçamentos informados e junta tudo numa
 * lista só — é assim que "Meu espaço" mostra a visão combinada.
 */
export async function fetchGastosAgregados(orcamentos) {
  const listas = await Promise.all(orcamentos.map(fetchGastosDeOrcamento));
  return listas.flat();
}
