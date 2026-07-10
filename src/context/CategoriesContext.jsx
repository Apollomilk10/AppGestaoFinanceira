import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchCustomCategoriesAgregadas } from '../services/categoriesSheet';
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
  const { orcamentos } = useOrcamentos();
  const [tree, setTree] = useState(BUILTIN_CATEGORY_TREE);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isAuthenticated || orcamentos.length === 0) return;
    const custom = await fetchCustomCategoriesAgregadas(orcamentos);
    setTree(mergeCategoryTree(custom));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, orcamentos.map((o) => o.id).join(',')]);

  useEffect(() => {
    reload().catch((err) => {
      console.error('Falha ao carregar categorias customizadas:', err);
      setLoading(false);
    });
  }, [reload]);

  // Novas categorias/subcategorias sempre entram no primeiro orçamento do
  // usuário (na prática, quase sempre a única) — como a visão é agregada,
  // elas aparecem pra todo mundo que participa de qualquer orçamento dela.
  function orcamentoDestino() {
    return orcamentos[0]?.id;
  }

  async function addCategory(categoriaLabel) {
    const categoriaChave = slugify(categoriaLabel);
    const orcamentoId = orcamentoDestino();
    if (!orcamentoId) throw new Error('Você precisa estar em pelo menos um orçamento.');

    // Aplica local imediatamente — evita esperar o servidor pra selecionar
    setTree((prev) => {
      if (prev[categoriaChave]) return prev;
      return {
        ...prev,
        [categoriaChave]: {
          label: categoriaLabel,
          color: '#9a9aa0',
          icon: 'MoreHorizontal',
          subcategorias: {},
        },
      };
    });

    try {
      await addCategoriaApi(
        { categoriaChave, categoriaLabel, subcategoriaChave: '', subcategoriaLabel: '' },
        { orcamentoId }
      );
    } finally {
      reload(); // sincroniza com o servidor em segundo plano, sem bloquear
    }
    return categoriaChave;
  }

  async function addSubcategory(categoriaChave, subcategoriaLabel) {
    const cat = tree[categoriaChave];
    const subcategoriaChave = slugify(subcategoriaLabel);
    const orcamentoId = orcamentoDestino();
    if (!orcamentoId) throw new Error('Você precisa estar em pelo menos um orçamento.');

    // Aplica local imediatamente
    setTree((prev) => {
      const atual = prev[categoriaChave];
      if (!atual || atual.subcategorias[subcategoriaChave]) return prev;
      return {
        ...prev,
        [categoriaChave]: {
          ...atual,
          subcategorias: {
            ...atual.subcategorias,
            [subcategoriaChave]: { label: subcategoriaLabel, icon: 'MoreHorizontal' },
          },
        },
      };
    });

    try {
      await addCategoriaApi(
        {
          categoriaChave,
          categoriaLabel: cat?.label || categoriaChave,
          subcategoriaChave,
          subcategoriaLabel,
        },
        { orcamentoId }
      );
    } finally {
      reload();
    }
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
