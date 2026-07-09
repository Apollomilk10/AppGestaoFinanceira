import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import Sparkline from './Sparkline';
import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import {
  last14DaysSeries,
  averageDaily,
  biggestExpense,
  rankBy,
  topExpenses,
  weekdaySeries,
} from '../utils/insights';

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip mono">
      <strong>{payload[0].name}</strong>
      <span>{formatBRL(payload[0].value)}</span>
    </div>
  );
}

export default function OverviewTab({ rows, onSelectCategory }) {
  const { getCategoryMeta } = useCategories();
  const { orcamentos } = useOrcamentos();
  const total = rows.reduce((sum, r) => sum + r.valor, 0);
  const series = last14DaysSeries(rows);
  const media = averageDaily(rows);
  const maior = biggestExpense(rows);
  const porCategoria = rankBy(rows, 'categoria').slice(0, 5);
  const porOrcamento = rankBy(rows, 'orcamentoNome');
  const maioresGastos = topExpenses(rows, 5);
  const ritmoSemanal = weekdaySeries(rows);

  const pieData = porCategoria.map((item) => {
    const meta = getCategoryMeta(item.key);
    return { name: meta.label, value: item.valor, color: meta.color };
  });

  return (
    <div className="tab-content">
      {/* Hero */}
      <div className="panel hero-card">
        <div className="hero-card__top">
          <span className="mono eyebrow">TOTAL GASTO — MEU ESPAÇO</span>
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

      {/* Pizza por categoria */}
      {pieData.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Distribuição por categoria</h2>
          <div className="pie-layout">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-legend">
              {pieData.map((entry) => (
                <div key={entry.name} className="pie-legend__item">
                  <span className="pie-legend__dot" style={{ background: entry.color }} />
                  <span className="pie-legend__label">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gasto por orçamento — só faz sentido com mais de 1 */}
      {orcamentos.length > 1 && porOrcamento.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Gasto por orçamento</h2>
          <div className="rank-list">
            {porOrcamento.map((item, i) => (
              <div key={item.key} className="rank-row">
                <span className="rank-row__pos mono">{i + 1}</span>
                <span className="rank-row__label">{item.key}</span>
                <span className="rank-row__pct text-muted mono">{item.pct.toFixed(0)}%</span>
                <span className="rank-row__valor mono">{formatBRL(item.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ritmo semanal */}
      <div className="panel">
        <h2 className="panel__title">Ritmo por dia da semana</h2>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={ritmoSemanal} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--panel-border)' }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(17,17,20,0.04)' }} />
            <Bar dataKey="total" name="Total" fill="var(--ink)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Maiores gastos */}
      {maioresGastos.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Maiores gastos</h2>
          <div className="rank-list">
            {maioresGastos.map((row, i) => {
              const meta = getCategoryMeta(row.categoria);
              return (
                <div key={row.id} className="rank-row">
                  <span className="rank-row__pos mono">{i + 1}</span>
                  <TagIcon meta={meta} />
                  <span className="rank-row__label">{row.descricao || meta.label}</span>
                  <span className="rank-row__valor mono">{formatBRL(row.valor)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gasto por categoria (barras, clicável pra filtrar) */}
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
