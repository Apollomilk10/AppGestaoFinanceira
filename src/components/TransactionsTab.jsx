import { useMemo, useState } from 'react';
import FilterBar from './FilterBar';
import TransactionList from './TransactionList';
import { useCategories } from '../context/CategoriesContext';

export default function TransactionsTab({ rows, initialCategoria = 'all' }) {
  const { getCategoryMeta } = useCategories();
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState(initialCategoria);
  const [etapa, setEtapa] = useState('all');
  const [periodo, setPeriodo] = useState('all');

  const categoriasDisponiveis = useMemo(
    () => uniqueValues(rows, 'categoria', getCategoryMeta),
    [rows, getCategoryMeta]
  );
  const etapasDisponiveis = useMemo(() => uniqueValues(rows, 'etapa', getCategoryMeta), [rows, getCategoryMeta]);

  const filtradas = useMemo(() => {
    const agora = new Date();
    return rows
      .filter((r) => {
        if (search && !r.descricao?.toLowerCase().includes(search.toLowerCase())) return false;
        if (categoria !== 'all' && getCategoryMeta(r.categoria).key !== categoria) return false;
        if (etapa !== 'all' && (r.etapa || 'nao_especificada').toLowerCase() !== etapa) return false;
        if (periodo !== 'all' && r.data) {
          const diffDias = (agora - r.data) / (1000 * 60 * 60 * 24);
          if (periodo === '7d' && diffDias > 7) return false;
          if (periodo === '30d' && diffDias > 30) return false;
          if (
            periodo === 'month' &&
            !(r.data.getFullYear() === agora.getFullYear() && r.data.getMonth() === agora.getMonth())
          )
            return false;
        }
        return true;
      })
      .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));
  }, [rows, search, categoria, etapa, periodo, getCategoryMeta]);

  const totalFiltrado = filtradas.reduce((s, r) => s + r.valor, 0);

  return (
    <div className="tab-content">
      <FilterBar
        search={search}
        onSearch={setSearch}
        categorias={categoriasDisponiveis}
        categoriaAtiva={categoria}
        onCategoria={setCategoria}
        etapas={etapasDisponiveis}
        etapaAtiva={etapa}
        onEtapa={setEtapa}
        periodo={periodo}
        onPeriodo={setPeriodo}
      />

      <div className="filter-summary mono text-muted">
        {filtradas.length} lançamento{filtradas.length !== 1 ? 's' : ''} · {formatBRL(totalFiltrado)}
      </div>

      <TransactionList rows={filtradas} />
    </div>
  );
}

function uniqueValues(rows, key, getCategoryMeta) {
  const set = new Set();
  rows.forEach((r) => {
    const v = key === 'categoria' ? getCategoryMeta(r[key]).key : (r[key] || 'nao_especificada').toLowerCase();
    set.add(v);
  });
  return Array.from(set);
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
