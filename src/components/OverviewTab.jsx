import Sparkline from './Sparkline';
import BudgetGauge from './BudgetGauge';
import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';
import { last14DaysSeries, averageDaily, biggestExpense, rankBy } from '../utils/insights';

export default function OverviewTab({ rows, onSelectCategory }) {
  const { getCategoryMeta } = useCategories();
  const total = rows.reduce((sum, r) => sum + r.valor, 0);
  const series = last14DaysSeries(rows);
  const media = averageDaily(rows);
  const maior = biggestExpense(rows);
  const porCategoria = rankBy(rows, 'categoria').slice(0, 5);

  return (
    <div className="tab-content">
      {/* Hero */}
      <div className="panel hero-card">
        <div className="hero-card__top">
          <span className="mono eyebrow">TOTAL GASTO — OBRA</span>
          <h1 className="hero-card__total">{formatBRL(total)}</h1>
        </div>
        <Sparkline data={series} />
        <span className="hero-card__caption text-muted mono">últimos 14 dias</span>
      </div>

      {/* Stats rápidos */}
      <div className="stat-row">
        <div className="panel stat-card">
          <span className="stat-card__label">Média diária</span>
          <span className="stat-card__value mono">{formatBRL(media)}</span>
        </div>
        <div className="panel stat-card">
          <span className="stat-card__label">Maior gasto</span>
          <span className="stat-card__value mono">
            {maior ? formatBRL(maior.valor) : '—'}
          </span>
          {maior && <span className="stat-card__sub">{maior.descricao}</span>}
        </div>
      </div>

      <BudgetGauge total={total} />

      {/* Gasto por categoria */}
      <div className="panel">
        <h2 className="panel__title">Gasto por categoria</h2>
        <div className="category-bars">
          {porCategoria.map((item) => {
            const meta = getCategoryMeta(item.key);
            return (
              <button
                key={item.key}
                className="category-bar"
                onClick={() => onSelectCategory?.(meta.key)}
              >
                <TagIcon meta={meta} />
                <div className="category-bar__main">
                  <div className="category-bar__top">
                    <span>{meta.label}</span>
                    <span className="mono">{formatBRL(item.valor)}</span>
                  </div>
                  <div className="category-bar__track">
                    <div
                      className="category-bar__fill"
                      style={{ width: `${item.pct}%`, background: meta.color }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
          {porCategoria.length === 0 && (
            <p className="text-muted" style={{ fontSize: 13 }}>
              Nenhum lançamento ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
