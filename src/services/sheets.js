import Papa from 'papaparse';

/**
 * Lê os dados de uma planilha do Google Sheets publicada como CSV.
 *
 * Como preparar a planilha:
 * 1. No Google Sheets, vá em Arquivo > Compartilhar > Publicar na web
 * 2. Escolha a aba correta e o formato "Valores separados por vírgula (.csv)"
 * 3. Clique em Publicar e copie o link gerado
 * 4. Cole esse link no arquivo .env como VITE_SHEET_CSV_URL
 *
 * Colunas esperadas na planilha (nessa ordem, com cabeçalho):
 * Data | Categoria | Descricao | Valor | Responsavel | Etapa
 */

const CSV_URL = import.meta.env.VITE_SHEET_CSV_URL;

function parseValorBR(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  // aceita "1.234,56" ou "1234.56" ou "R$ 1234,56"
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
  // aceita dd/mm/aaaa
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
  }
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export async function fetchGastos() {
  if (!CSV_URL) {
    throw new Error(
      'VITE_SHEET_CSV_URL não configurada. Veja o README para instruções.'
    );
  }

  const response = await fetch(CSV_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao buscar a planilha (status ${response.status})`);
  }

  const csvText = await response.text();
  const { data } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return data
    .map((row, index) => ({
      id: index,
      // Assume que a ordem do CSV publicado é a mesma da planilha (cabeçalho
      // na linha 1, dados a partir da linha 2). Isso é usado para editar/
      // excluir a linha certa via Apps Script. Evite reordenar/filtrar
      // manualmente a aba na planilha, ou esse número pode ficar incorreto.
      rowNumber: index + 2,
      data: parseDataBR(row.Data),
      categoria: (row.Categoria || 'Sem categoria').trim(),
      descricao: (row.Descricao || row['Descrição'] || '').trim(),
      valor: parseValorBR(row.Valor),
      responsavel: (row.Responsavel || row['Responsável'] || '').trim(),
      etapa: (row.Etapa || 'Sem etapa').trim(),
    }))
    .filter((row) => row.valor > 0 || row.descricao);
}
