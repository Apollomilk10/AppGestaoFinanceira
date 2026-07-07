import Papa from 'papaparse';

/**
 * Lê categorias/subcategorias customizadas de uma aba própria da planilha
 * ("Categorias"), publicada como CSV da mesma forma que a aba de gastos.
 *
 * Como preparar (veja o README):
 * 1. Crie uma aba chamada "Categorias" na mesma planilha
 * 2. Publique essa aba como CSV (Arquivo > Compartilhar > Publicar na web)
 * 3. Cole o link em VITE_CATEGORIES_CSV_URL no .env
 *
 * Colunas esperadas: CategoriaChave | CategoriaLabel | SubcategoriaChave | SubcategoriaLabel
 */

const CSV_URL = import.meta.env.VITE_CATEGORIES_CSV_URL;

export async function fetchCustomCategories() {
  if (!CSV_URL) return [];

  try {
    const response = await fetch(CSV_URL, { cache: 'no-store' });
    if (!response.ok) return [];

    const csvText = await response.text();
    const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });

    return data
      .map((row) => ({
        categoriaChave: (row.CategoriaChave || '').trim(),
        categoriaLabel: (row.CategoriaLabel || '').trim(),
        subcategoriaChave: (row.SubcategoriaChave || '').trim(),
        subcategoriaLabel: (row.SubcategoriaLabel || '').trim(),
      }))
      .filter((row) => row.categoriaChave || row.categoriaLabel);
  } catch {
    // Se a aba de categorias ainda não existir/estiver publicada, o app
    // simplesmente segue usando só as categorias padrão.
    return [];
  }
}
