import { Search } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';

const PERIODOS = [
  { id: 'all', label: 'Tudo' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'month', label: 'Este mês' },
  { id: 'lastmonth', label: 'Mês passado' },
  { id: 'year', label: 'Este ano' },
  { id: 'custom', label: 'Escolher datas' },
];

const TIPOS = [
  { id: 'all', label: 'Tudo' },
  { id: 'despesa', label: 'Só saídas' },
  { id: 'receita', label: 'Só entradas' },
];

export default function FilterBar({
  search,
  onSearch,
  categorias,
  categoriaAtiva,
  onCategoria,
  etapas,
  etapaAtiva,
  onEtapa,
  periodo,
  onPeriodo,
  tipo,
  onTipo,
  contas = [],
  contaAtiva,
  onConta,
  dataInicio,
  dataFim,
  onDatas,
}) {
  const { getCategoryMeta, findSubcategoryMeta } = useCategories();

  return (
    <div className="filter-bar">
      <div className="search-input">
        <Search size={16} />
        <input
          type="text"
          placeholder="Buscar por descrição…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      <div className="chip-row">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            className={`chip ${periodo === p.id ? 'chip--active' : ''}`}
            onClick={() => onPeriodo(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {periodo === 'custom' && (
        <div className="field-row" style={{ marginTop: 2 }}>
          <label className="field">
            <span>De</span>
            <input type="date" value={dataInicio} onChange={(e) => onDatas(e.target.value, dataFim)} />
          </label>
          <label className="field">
            <span>Até</span>
            <input type="date" value={dataFim} onChange={(e) => onDatas(dataInicio, e.target.value)} />
          </label>
        </div>
      )}

      <div className="chip-row">
        {TIPOS.map((t) => (
          <button
            key={t.id}
            className={`chip ${tipo === t.id ? 'chip--active' : ''}`}
            onClick={() => onTipo(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {contas.length > 0 && (
        <div className="chip-row">
          <button
            className={`chip ${contaAtiva === 'all' ? 'chip--active' : ''}`}
            onClick={() => onConta('all')}
          >
            Todas as contas
          </button>
          {contas.map((c) => (
            <button
              key={c.id}
              className={`chip ${contaAtiva === c.id ? 'chip--active' : ''}`}
              onClick={() => onConta(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}

      <div className="chip-row">
        <button
          className={`chip ${categoriaAtiva === 'all' ? 'chip--active' : ''}`}
          onClick={() => onCategoria('all')}
        >
          Todas categorias
        </button>
        {categorias.map((c) => {
          const meta = getCategoryMeta(c);
          return (
            <button
              key={c}
              className={`chip ${categoriaAtiva === c ? 'chip--active' : ''}`}
              style={categoriaAtiva === c ? { borderColor: meta.color, color: meta.color } : {}}
              onClick={() => onCategoria(c)}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <div className="chip-row">
        <button
          className={`chip ${etapaAtiva === 'all' ? 'chip--active' : ''}`}
          onClick={() => onEtapa('all')}
        >
          Todas subcategorias
        </button>
        {etapas.map((et) => {
          const meta = findSubcategoryMeta(et);
          return (
            <button
              key={et}
              className={`chip ${etapaAtiva === et ? 'chip--active' : ''}`}
              style={etapaAtiva === et ? { borderColor: meta.color, color: meta.color } : {}}
              onClick={() => onEtapa(et)}
            >
              {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
