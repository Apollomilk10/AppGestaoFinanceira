const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function callAuth(payload) {
  if (!SCRIPT_URL) {
    throw new Error('VITE_APPS_SCRIPT_URL não configurada. Veja o README para instruções.');
  }

  let response;
  try {
    response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Confira sua internet e tente de novo.');
  }

  const rawText = await response.text();
  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error(
      'O Apps Script não retornou um JSON válido. Provavelmente é preciso publicar uma "Nova versão" da implantação.'
    );
  }

  if (result.status !== 'ok') {
    throw new Error(result.message || 'Erro desconhecido.');
  }
  return result;
}

export function signup({ email, senha, modoGrupo, codigoGrupo }) {
  return callAuth({ action: 'signup', email, senha, modoGrupo, codigoGrupo });
}

export function login({ email, senha }) {
  return callAuth({ action: 'login', email, senha });
}
