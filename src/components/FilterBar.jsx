import { Search } from 'lucide-react';
import { getCategoryMeta, getEtapaMeta } from '../utils/categoryMeta';

const PERIODOS = [
  { id: 'all', label: 'Tudo' },
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'month', label: 'Este mês' },
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
}) {
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
          Todas etapas
        </button>
        {etapas.map((et) => {
          const meta = getEtapaMeta(et);
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
