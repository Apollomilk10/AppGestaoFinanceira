const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

async function fetchComTimeout(payload, ms = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response;
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
 * O Apps Script gratuito tem instabilidade intermitente conhecida (às vezes
 * demora ou falha sem motivo aparente, e funciona normal na tentativa
 * seguinte). Por isso, chamadas de LEITURA tentam de novo automaticamente
 * antes de mostrar erro pro usuário.
 */
async function callScriptComRetry(payload, tentativas = 3) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      const response = await fetchComTimeout(payload);
      if (!response.ok) {
        throw new Error(`O servidor respondeu com erro (status ${response.status}).`);
      }
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
    } catch (err) {
      ultimoErro = err;
      if (err.message === 'TIMEOUT' || err.message === 'REDE') {
        // vale a pena tentar de novo
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      // erro "de negócio" (ex: sessão inválida) não adianta tentar de novo
      throw err;
    }
  }
  const mensagem =
    ultimoErro.message === 'TIMEOUT'
      ? 'O servidor demorou demais pra responder, mesmo depois de tentar 3 vezes. O Apps Script gratuito às vezes fica instável — tente de novo em alguns segundos.'
      : 'Não foi possível conectar ao servidor depois de 3 tentativas. Confira sua internet.';
  throw new Error(mensagem);
}

async function callScript(payload) {
  return callScriptComRetry(payload);
}

export async function fetchOrcamentos({ email, token }) {
  const result = await callScriptComRetry({ action: 'listOrcamentos', email, token });
  return result.rows;
}

export function criarOrcamento(nome, session) {
  return callScript({ action: 'criarOrcamento', nome, email: session.email, token: session.token });
}

export function entrarOrcamento(codigo, session) {
  return callScript({ action: 'entrarOrcamento', codigo, email: session.email, token: session.token });
}

export async function fetchMeusGastos({ email, token }) {
  const result = await callScriptComRetry({ action: 'listMeusGastos', email, token });
  return result.rows;
}
