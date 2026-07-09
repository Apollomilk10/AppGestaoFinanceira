import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchCustomCategories } from '../services/categoriesSheet';
import { addCategoria as addCategoriaApi } from '../services/appsScript';
import { useAuth } from './AuthContext';
import { useOrcamentos } from './OrcamentosContext';
import {
  BUILTIN_CATEGORY_TREE,
  mergeCategoryTree,
  getCategoryMeta as getCategoryMetaPure,
  getSubcategoryMeta as getSubcategoryMetaPure,
  findSubcategoryMeta as findSubcategoryMetaPure,
  categoryOptions as categoryOptionsPure,
  subcategoryOptions as subcategoryOptionsPure,
  slugify,
} from '../utils/categoryMeta';

const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { activeId } = useOrcamentos();
  const [tree, setTree] = useState(BUILTIN_CATEGORY_TREE);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isAuthenticated || !activeId) return;
    const custom = await fetchCustomCategories({ orcamentoId: activeId });
    setTree(mergeCategoryTree(custom));
    setLoading(false);
  }, [isAuthenticated, activeId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addCategory(categoriaLabel) {
    const categoriaChave = slugify(categoriaLabel);
    await addCategoriaApi(
      { categoriaChave, categoriaLabel, subcategoriaChave: '', subcategoriaLabel: '' },
      { orcamentoId: activeId }
    );
    await reload();
    return categoriaChave;
  }

  async function addSubcategory(categoriaChave, subcategoriaLabel) {
    const cat = tree[categoriaChave];
    const subcategoriaChave = slugify(subcategoriaLabel);
    await addCategoriaApi(
      {
        categoriaChave,
        categoriaLabel: cat?.label || categoriaChave,
        subcategoriaChave,
        subcategoriaLabel,
      },
      { orcamentoId: activeId }
    );
    await reload();
    return subcategoriaChave;
  }

  const value = {
    tree,
    loading,
    reload,
    addCategory,
    addSubcategory,
    getCategoryMeta: (raw) => getCategoryMetaPure(tree, raw),
    getSubcategoryMeta: (categoria, sub) => getSubcategoryMetaPure(tree, categoria, sub),
    findSubcategoryMeta: (sub) => findSubcategoryMetaPure(tree, sub),
    categoryOptions: () => categoryOptionsPure(tree),
    subcategoryOptions: (categoria) => subcategoryOptionsPure(tree, categoria),
  };

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error('useCategories precisa estar dentro de CategoriesProvider');
  return ctx;
}
