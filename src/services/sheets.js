const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

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

async function fetchComTimeout(payload, ms = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw new Error('REDE');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * O Apps Script gratuito tem instabilidade intermitente conhecida. Por
 * isso, leituras tentam de novo automaticamente antes de mostrar erro.
 */
async function callComRetry(payload, tentativas = 3) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const response = await fetchComTimeout(payload);
      if (!response.ok) {
        throw new Error(`Falha ao buscar os gastos (status ${response.status}).`);
      }
      const rawText = await response.text();
      let result;
      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error('O Apps Script não retornou um JSON válido. Publique uma "Nova versão" da implantação.');
      }
      if (result.status !== 'ok') {
        throw new Error(result.message || 'Erro ao buscar os gastos.');
      }
      return result;
    } catch (err) {
      ultimoErro = err;
      if (err.message === 'TIMEOUT' || err.message === 'REDE') {
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      throw err;
    }
  }
  const mensagem =
    ultimoErro.message === 'TIMEOUT'
      ? 'O servidor demorou demais pra responder, mesmo depois de tentar 3 vezes. O Apps Script gratuito às vezes fica instável — tente de novo em alguns segundos.'
      : 'Não foi possível conectar ao servidor depois de 3 tentativas. Confira sua internet.';
  throw new Error(mensagem);
}

export async function fetchGastos({ email, token, orcamentoId }) {
  if (!SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL não configurada. Veja o README para instruções.');
  }
  if (!email || !token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }
  if (!orcamentoId) {
    throw new Error('Nenhum orçamento selecionado.');
  }

  const result = await callComRetry({ action: 'listGastos', email, token, orcamentoId });

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
