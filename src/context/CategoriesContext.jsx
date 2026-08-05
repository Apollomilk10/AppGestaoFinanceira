import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchCustomCategoriesAgregadas } from '../services/categoriesSheet';
import { addCategoria as addCategoriaApi, deleteCategoria } from '../services/appsScript';
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
  const [customRows, setCustomRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isAuthenticated || orcamentos.length === 0) return;
    const custom = await fetchCustomCategoriesAgregadas(orcamentos);
    setCustomRows(custom);
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

    await addCategoriaApi(
      { categoriaChave, categoriaLabel, subcategoriaChave: '', subcategoriaLabel: '' },
      { orcamentoId }
    );
    // Não recarrega do servidor aqui de propósito: o índice do Firestore
    // pode demorar um instante pra refletir a escrita, e isso sobrescrevia
    // a categoria que acabamos de adicionar local. O estado local já é a
    // fonte da verdade até a próxima sincronização natural.
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

    await addCategoriaApi(
      {
        categoriaChave,
        categoriaLabel: cat?.label || categoriaChave,
        subcategoriaChave,
        subcategoriaLabel,
      },
      { orcamentoId }
    );
    return subcategoriaChave;
  }

  /**
   * Remove uma categoria (ou só uma subcategoria) criada por vocês.
   * As categorias que já vêm no app não podem ser removidas.
   */
  async function removeCategory(categoriaChave, subcategoriaChave = '') {
    const alvos = customRows.filter(
      (r) =>
        r.categoriaChave === categoriaChave &&
        (subcategoriaChave ? r.subcategoriaChave === subcategoriaChave : true)
    );
    if (alvos.length === 0) throw new Error('Essa é uma categoria padrão do app e não pode ser removida.');

    setTree((prev) => {
      const copia = { ...prev };
      if (subcategoriaChave) {
        const cat = copia[categoriaChave];
        if (cat) {
          const subs = { ...cat.subcategorias };
          delete subs[subcategoriaChave];
          copia[categoriaChave] = { ...cat, subcategorias: subs };
        }
      } else {
        delete copia[categoriaChave];
      }
      return copia;
    });
    setCustomRows((prev) => prev.filter((r) => !alvos.some((a) => a.id === r.id)));

    for (const alvo of alvos) {
      await deleteCategoria(alvo.orcamentoId, alvo.id);
    }
  }

  function ehCustomizada(categoriaChave, subcategoriaChave = '') {
    return customRows.some(
      (r) =>
        r.categoriaChave === categoriaChave &&
        (subcategoriaChave ? r.subcategoriaChave === subcategoriaChave : true)
    );
  }

  const value = {
    tree,
    removeCategory,
    ehCustomizada,
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
