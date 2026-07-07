const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

/**
 * Lê os gastos do espaço do usuário logado, direto do Apps Script
 * (não usa mais CSV publicado — a filtragem por espaço acontece no
 * próprio script, então cada usuário só recebe os dados do seu grupo).
 */

function parseValorBR(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const cleaned = raw
    .toString()
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(,|$))/g, '')
    .replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? 0 : value;
}

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

export async function fetchGastos({ email, token }) {
  if (!SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL não configurada. Veja o README para instruções.');
  }
  if (!email || !token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const url = `${SCRIPT_URL}?type=gastos&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao buscar os gastos (status ${response.status}).`);
  }

  const result = await response.json();
  if (result.status !== 'ok') {
    throw new Error(result.message || 'Erro ao buscar os gastos.');
  }

  return result.rows
    .map((row, index) => ({
      id: index,
      rowNumber: row.rowNumber,
      data: parseDataBR(row.data),
      categoria: (row.categoria || 'Sem categoria').toString().trim(),
      descricao: (row.descricao || '').toString().trim(),
      valor: parseValorBR(row.valor),
      responsavel: (row.responsavel || '').toString().trim(),
      etapa: (row.etapa || 'Sem etapa').toString().trim(),
    }))
    .filter((row) => row.valor > 0 || row.descricao);
}
