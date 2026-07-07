const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export async function fetchCustomCategories({ email, token, orcamentoId }) {
  if (!SCRIPT_URL || !email || !token || !orcamentoId) return [];

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'listCategorias', email, token, orcamentoId }),
      });
      if (!response.ok) continue;

      const result = await response.json();
      if (result.status !== 'ok') continue;

      return result.rows.map((row) => ({
        categoriaChave: (row.categoriaChave || '').toString().trim(),
        categoriaLabel: (row.categoriaLabel || '').toString().trim(),
        subcategoriaChave: (row.subcategoriaChave || '').toString().trim(),
        subcategoriaLabel: (row.subcategoriaLabel || '').toString().trim(),
      }));
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return [];
}
