// Paleta e ícones por categoria/etapa — usados em toda a interface
// (cartões, gráficos, listas) pra manter consistência visual.

export const CATEGORY_META = {
  material: { label: 'Material', color: '#f2622e', icon: 'Package' },
  mao_de_obra: { label: 'Mão de obra', color: '#4fb3ff', icon: 'HardHat' },
  imprevisto: { label: 'Imprevisto', color: '#ff5d7a', icon: 'AlertTriangle' },
  outro: { label: 'Outro', color: '#b98cf0', icon: 'MoreHorizontal' },
};

export const ETAPA_META = {
  eletrica: { label: 'Elétrica', color: '#e8b84b', icon: 'Zap' },
  hidraulica: { label: 'Hidráulica', color: '#4fd1c5', icon: 'Droplet' },
  alvenaria: { label: 'Alvenaria', color: '#c98a5e', icon: 'Blocks' },
  acabamento: { label: 'Acabamento', color: '#6fbf8b', icon: 'Paintbrush' },
  nao_especificada: { label: 'Não especificada', color: '#8fa3c0', icon: 'HelpCircle' },
};

const FALLBACK_COLORS = ['#f2622e', '#4fb3ff', '#e8b84b', '#6fbf8b', '#b98cf0', '#ff5d7a', '#4fd1c5'];

function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

function hashToIndex(str, mod) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % mod;
}

export function getCategoryMeta(raw) {
  const key = slugify(raw);
  if (CATEGORY_META[key]) return { ...CATEGORY_META[key], key };
  return {
    key,
    label: raw || 'Outro',
    color: FALLBACK_COLORS[hashToIndex(key, FALLBACK_COLORS.length)],
    icon: 'MoreHorizontal',
  };
}

export function getEtapaMeta(raw) {
  const key = slugify(raw);
  if (ETAPA_META[key]) return { ...ETAPA_META[key], key };
  return {
    key,
    label: raw || 'Não especificada',
    color: FALLBACK_COLORS[hashToIndex(key, FALLBACK_COLORS.length)],
    icon: 'HelpCircle',
  };
}
