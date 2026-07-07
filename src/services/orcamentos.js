const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function callScript(payload) {
  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  const rawText = await response.text();
  let result;
  try {
    result = JSON.parse(rawText);
  } catch {
    throw new Error('O Apps Script não retornou um JSON válido. Publique uma "Nova versão" da implantação.');
  }
  if (result.status !== 'ok') {
    throw new Error(result.message || 'Erro desconhecido.');
  }
  return result;
}

export async function fetchOrcamentos({ email, token }) {
  const url = `${SCRIPT_URL}?type=orcamentos&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (result.status !== 'ok') throw new Error(result.message);
  return result.rows;
}

export function criarOrcamento(nome, session) {
  return callScript({ action: 'criarOrcamento', nome, email: session.email, token: session.token });
}

export function entrarOrcamento(codigo, session) {
  return callScript({ action: 'entrarOrcamento', codigo, email: session.email, token: session.token });
}

export async function fetchMeusGastos({ email, token }) {
  const url = `${SCRIPT_URL}?type=meusGastos&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (result.status !== 'ok') throw new Error(result.message);
  return result.rows;
}
