const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function callScript(payload) {
  if (!SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL não configurada. Veja o README para instruções.');
  }
  if (!SCRIPT_URL.includes('/exec')) {
    throw new Error(
      'VITE_APPS_SCRIPT_URL parece incorreta — a URL deve terminar em /exec (não /dev). Reveja a implantação no Apps Script.'
    );
  }

  let response;
  try {
    response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
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

export function postGasto(gasto, session) {
  return callScript({ action: 'create', ...gasto, email: session.email, token: session.token });
}

export function updateGasto(rowNumber, gasto, session) {
  return callScript({ action: 'update', rowNumber, ...gasto, email: session.email, token: session.token });
}

export function deleteGasto(rowNumber, session) {
  return callScript({ action: 'delete', rowNumber, email: session.email, token: session.token });
}

export function sendFeedback(mensagem, session) {
  return callScript({ action: 'feedback', mensagem, email: session.email, token: session.token });
}

export function addCategoria(payload, session) {
  return callScript({ action: 'addCategoria', ...payload, email: session.email, token: session.token });
}
