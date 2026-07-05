/**
 * Envia um novo gasto para o Google Apps Script, que grava a linha
 * diretamente na planilha.
 *
 * Como preparar (veja o README para o passo a passo completo):
 * 1. Abra a planilha > Extensões > Apps Script
 * 2. Cole o código do arquivo apps-script/Code.gs deste projeto
 * 3. Implantar > Nova implantação > Tipo: App da Web
 * 4. Executar como: você / Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL gerada e cole em VITE_APPS_SCRIPT_URL no .env
 */

const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export async function postGasto({ data, categoria, descricao, valor, responsavel, etapa }) {
  if (!SCRIPT_URL) {
    throw new Error(
      'VITE_APPS_SCRIPT_URL não configurada. Veja o README para instruções.'
    );
  }

  // Content-Type text/plain evita o preflight CORS, que o Apps Script
  // não trata bem por padrão. O Apps Script lê o corpo como texto e
  // faz o JSON.parse do lado de lá.
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ data, categoria, descricao, valor, responsavel, etapa }),
  });

  if (!response.ok) {
    throw new Error(`Falha ao salvar (status ${response.status})`);
  }

  const result = await response.json();
  if (result.status !== 'ok') {
    throw new Error(result.message || 'Falha ao salvar o gasto.');
  }
  return result;
}
