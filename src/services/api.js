import { auth } from '../firebaseConfig';

const API_URL = import.meta.env.VITE_API_URL;

async function authHeader() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sessão inválida. Faça login novamente.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function handleResponse(response) {
  const rawText = await response.text();
  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error('O servidor retornou uma resposta inválida.');
  }
  if (!response.ok) {
    throw new Error(data.detail || `Erro do servidor (status ${response.status}).`);
  }
  return data;
}

export async function apiGet(path) {
  if (!API_URL) throw new Error('VITE_API_URL não configurada.');
  const headers = await authHeader();
  const response = await fetch(`${API_URL}${path}`, { headers });
  return handleResponse(response);
}

export async function apiPost(path, body) {
  if (!API_URL) throw new Error('VITE_API_URL não configurada.');
  const headers = await authHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiPut(path, body) {
  if (!API_URL) throw new Error('VITE_API_URL não configurada.');
  const headers = await authHeader();
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function apiDelete(path) {
  if (!API_URL) throw new Error('VITE_API_URL não configurada.');
  const headers = await authHeader();
  const response = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
  return handleResponse(response);
}
