import { apiGet } from './api';

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

export async function fetchGastos({ orcamentoId }) {
  if (!orcamentoId) {
    throw new Error('Nenhum orçamento selecionado.');
  }

  const result = await apiGet(`/orcamentos/${orcamentoId}/gastos`);

  return result.rows
    .map((row) => ({
      id: row.id,
      rowNumber: row.id,
      data: parseDataBR(row.data),
      categoria: (row.categoria || 'Sem categoria').toString().trim(),
      descricao: (row.descricao || '').toString().trim(),
      valor: Number(row.valor) || 0,
      responsavel: (row.responsavel || '').toString().trim(),
      etapa: (row.etapa || 'Sem etapa').toString().trim(),
    }))
    .filter((row) => row.valor > 0 || row.descricao);
}
