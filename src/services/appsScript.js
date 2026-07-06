/**
 * Envia criação, edição ou exclusão de gastos para o Google Apps Script,
 * que grava/edita/remove a linha diretamente na planilha.
 *
 * Como preparar (veja o README para o passo a passo completo):
 * 1. Abra a planilha > Extensões > Apps Script
 * 2. Cole o código do arquivo apps-script/Code.gs deste projeto
 * 3. Implantar > Nova implantação > Tipo: App da Web
 * 4. Executar como: você / Quem pode acessar: Qualquer pessoa
 * 5. Copie a URL gerada (deve terminar em /exec) e cole em
 *    VITE_APPS_SCRIPT_URL no .env
 */

const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function callScript(payload) {
  if (!SCRIPT_URL) {
    throw new Error(
      'VITE_APPS_SCRIPT_URL não configurada. Veja o README para instruções.'
    );
  }
  if (!SCRIPT_URL.includes('/exec')) {
    throw new Error(
      'VITE_APPS_SCRIPT_URL parece incorreta — a URL deve terminar em /exec (não /dev). Reveja a implantação no Apps Script.'
    );
  }

  let response;
  try {
    // Content-Type text/plain evita o preflight CORS, que o Apps Script
    // não trata bem por padrão. O Apps Script lê o corpo como texto e
    // faz o JSON.parse do lado de lá.
    response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    throw new Error(
      'Não foi possível conectar ao Apps Script (erro de rede/CORS). Confira se a URL está correta e se o app foi implantado com acesso "Qualquer pessoa".'
    );
  }

  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`O Apps Script retornou um erro HTTP ${response.status}.`);
  }

  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      'O Apps Script não retornou um JSON válido. Provavelmente é preciso publicar uma "Nova versão" da implantação depois da última edição do Code.gs.'
    );
  }

  if (result.status !== 'ok') {
    throw new Error(result.message || 'O Apps Script retornou um erro ao salvar.');
  }

  return result;
}

export function postGasto(gasto) {
  return callScript({ action: 'create', ...gasto });
}

export function updateGasto(rowNumber, gasto) {
  return callScript({ action: 'update', rowNumber, ...gasto });
}

export function deleteGasto(rowNumber) {
  return callScript({ action: 'delete', rowNumber });
}

export function sendFeedback(mensagem) {
  return callScript({ action: 'feedback', mensagem });
}