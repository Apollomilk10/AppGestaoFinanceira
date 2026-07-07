// Árvore de categorias padrão do app — inspirada na estrutura usada por
// apps de controle financeiro como Mobills, Organizze e Money Lover.
// Cada categoria tem suas próprias subcategorias (equivalente ao que antes
// chamávamos de "etapa", agora generalizado pra qualquer categoria).
//
// A categoria "Obra - Reforma" mantém as etapas originais do projeto como
// subcategorias, incluindo os valores antigos (material, mao_de_obra,
// imprevisto) pra continuar reconhecendo lançamentos já existentes.

export const BUILTIN_CATEGORY_TREE = {
  obra_reforma: {
    label: 'Obra - Reforma',
    color: '#f2622e',
    icon: 'HardHat',
    subcategorias: {
      eletrica: { label: 'Elétrica', icon: 'Zap' },
      hidraulica: { label: 'Hidráulica', icon: 'Droplet' },
      alvenaria: { label: 'Alvenaria', icon: 'Blocks' },
      acabamento: { label: 'Acabamento', icon: 'Paintbrush' },
      material: { label: 'Material', icon: 'Package' },
      mao_de_obra: { label: 'Mão de obra', icon: 'HardHat' },
      imprevisto: { label: 'Imprevisto', icon: 'AlertTriangle' },
      nao_especificada: { label: 'Não especificada', icon: 'HelpCircle' },
    },
  },
  moradia: {
    label: 'Moradia',
    color: '#4fb3ff',
    icon: 'Home',
    subcategorias: {
      aluguel: { label: 'Aluguel', icon: 'Key' },
      condominio: { label: 'Condomínio', icon: 'Building2' },
      energia: { label: 'Energia', icon: 'Zap' },
      agua: { label: 'Água', icon: 'Droplet' },
      internet: { label: 'Internet', icon: 'Wifi' },
    },
  },
  alimentacao: {
    label: 'Alimentação',
    color: '#6fbf8b',
    icon: 'UtensilsCrossed',
    subcategorias: {
      mercado: { label: 'Mercado', icon: 'ShoppingCart' },
      restaurante: { label: 'Restaurante', icon: 'UtensilsCrossed' },
      delivery: { label: 'Delivery', icon: 'Bike' },
    },
  },
  transporte: {
    label: 'Transporte',
    color: '#e8b84b',
    icon: 'Car',
    subcategorias: {
      combustivel: { label: 'Combustível', icon: 'Fuel' },
      app_transporte: { label: 'App de transporte', icon: 'Car' },
      manutencao: { label: 'Manutenção', icon: 'Wrench' },
      transporte_publico: { label: 'Transporte público', icon: 'Bus' },
    },
  },
  saude: {
    label: 'Saúde',
    color: '#ff5d7a',
    icon: 'HeartPulse',
    subcategorias: {
      consultas: { label: 'Consultas', icon: 'Stethoscope' },
      farmacia: { label: 'Farmácia', icon: 'Pill' },
      plano_saude: { label: 'Plano de saúde', icon: 'ShieldPlus' },
    },
  },
  lazer: {
    label: 'Lazer',
    color: '#b98cf0',
    icon: 'Popcorn',
    subcategorias: {
      streaming: { label: 'Streaming', icon: 'Tv' },
      viagem: { label: 'Viagem', icon: 'Plane' },
      hobbies: { label: 'Hobbies', icon: 'Gamepad2' },
    },
  },
  compras: {
    label: 'Compras',
    color: '#4fd1c5',
    icon: 'ShoppingBag',
    subcategorias: {
      roupas: { label: 'Roupas', icon: 'Shirt' },
      eletronicos: { label: 'Eletrônicos', icon: 'Smartphone' },
      casa: { label: 'Casa', icon: 'Sofa' },
    },
  },
  educacao: {
    label: 'Educação',
    color: '#8fa3c0',
    icon: 'GraduationCap',
    subcategorias: {
      cursos: { label: 'Cursos', icon: 'GraduationCap' },
      material_estudo: { label: 'Material de estudo', icon: 'BookOpen' },
    },
  },
  outro: {
    label: 'Outro',
    color: '#9a9aa0',
    icon: 'MoreHorizontal',
    subcategorias: {},
  },
};

const FALLBACK_COLORS = ['#f2622e', '#4fb3ff', '#e8b84b', '#6fbf8b', '#b98cf0', '#ff5d7a', '#4fd1c5'];

export function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function hashToIndex(str, mod) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % mod;
}

/**
 * Mescla a árvore padrão com categorias/subcategorias customizadas
 * carregadas da planilha (aba "Categorias").
 */
export function mergeCategoryTree(customRows) {
  const tree = JSON.parse(JSON.stringify(BUILTIN_CATEGORY_TREE));

  customRows.forEach((row) => {
    const catKey = slugify(row.categoriaChave || row.categoriaLabel);
    if (!catKey) return;

    if (!tree[catKey]) {
      tree[catKey] = {
        label: row.categoriaLabel || row.categoriaChave,
        color: FALLBACK_COLORS[hashToIndex(catKey, FALLBACK_COLORS.length)],
        icon: 'MoreHorizontal',
        subcategorias: {},
      };
    }

    const subKey = slugify(row.subcategoriaChave || row.subcategoriaLabel);
    if (subKey && !tree[catKey].subcategorias[subKey]) {
      tree[catKey].subcategorias[subKey] = {
        label: row.subcategoriaLabel || row.subcategoriaChave,
        icon: 'MoreHorizontal',
      };
    }
  });

  return tree;
}

export function getCategoryMeta(tree, raw) {
  const key = slugify(raw);
  if (tree[key]) return { ...tree[key], key };
  return {
    key,
    label: raw || 'Outro',
    color: FALLBACK_COLORS[hashToIndex(key, FALLBACK_COLORS.length)],
    icon: 'MoreHorizontal',
    subcategorias: {},
  };
}

export function getSubcategoryMeta(tree, categoriaRaw, subRaw) {
  const catMeta = getCategoryMeta(tree, categoriaRaw);
  const subKey = slugify(subRaw);
  const sub = catMeta.subcategorias?.[subKey];
  if (sub) return { ...sub, key: subKey, color: catMeta.color };
  return {
    key: subKey,
    label: subRaw || 'Não especificada',
    icon: 'HelpCircle',
    color: catMeta.color,
  };
}

/**
 * Busca uma subcategoria em qualquer categoria da árvore — útil nos
 * filtros, onde nem sempre sabemos a categoria de origem do valor.
 */
export function findSubcategoryMeta(tree, subRaw) {
  const subKey = slugify(subRaw);
  for (const [catKey, cat] of Object.entries(tree)) {
    if (cat.subcategorias?.[subKey]) {
      return { ...cat.subcategorias[subKey], key: subKey, color: cat.color, categoriaKey: catKey };
    }
  }
  return {
    key: subKey,
    label: subRaw || 'Não especificada',
    icon: 'HelpCircle',
    color: FALLBACK_COLORS[hashToIndex(subKey, FALLBACK_COLORS.length)],
  };
}

export function categoryOptions(tree) {
  return Object.entries(tree).map(([key, val]) => ({ value: key, label: val.label }));
}

export function subcategoryOptions(tree, categoriaKey) {
  const cat = tree[slugify(categoriaKey)];
  if (!cat) return [];
  return Object.entries(cat.subcategorias).map(([key, val]) => ({ value: key, label: val.label }));
}
