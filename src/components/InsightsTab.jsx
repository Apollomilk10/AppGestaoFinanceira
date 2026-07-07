import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';
import {
  monthlySeries,
  currentVsPreviousMonth,
  rankBy,
  projecaoTotal,
} from '../utils/insights';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      <span>{formatBRL(payload[0].value)}</span>
    </div>
  );
}

export default function InsightsTab({ rows }) {
  const { getCategoryMeta, findSubcategoryMeta } = useCategories();
  const meses = monthlySeries(rows, 6);
  const comparacao = currentVsPreviousMonth(rows);
  const porCategoria = rankBy(rows, 'categoria');
  const porEtapa = rankBy(rows, 'etapa');
  const projecao = projecaoTotal(rows);

  return (
    <div className="tab-content">
      {/* Tendência mensal */}
      <div className="panel">
        <h2 className="panel__title">Tendência dos últimos 6 meses</h2>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={meses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="monthlyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--measure)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--measure)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--panel-border)' }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--panel-border)' }} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--measure)"
              strokeWidth={2}
              fill="url(#monthlyFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Comparação mês a mês */}
      <div className="panel comparison-card">
        <h2 className="panel__title">Este mês vs. mês anterior</h2>
        <div className="comparison-card__row">
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Este mês</span>
            <div className="mono comparison-card__value">{formatBRL(comparacao.atual)}</div>
          </div>
          <div>
            <span className="text-muted" style={{ fontSize: 12 }}>Mês anterior</span>
            <div className="mono comparison-card__value text-muted">{formatBRL(comparacao.anterior)}</div>
          </div>
        </div>
        {comparacao.variacao !== null && (
          <span className={`comparison-card__badge ${comparacao.variacao > 0 ? 'text-danger' : 'text-good'}`}>
            {comparacao.variacao > 0 ? '▲' : '▼'} {Math.abs(comparacao.variacao).toFixed(0)}%{' '}
            {comparacao.variacao > 0 ? 'a mais' : 'a menos'}
          </span>
        )}
      </div>

      {/* Projeção */}
      <div className="panel">
        <h2 className="panel__title">Projeção do mês</h2>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Baseado na média diária de gastos até agora
        </p>
        <div className="projection-value mono">{formatBRL(projecao.projecaoMes)}</div>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {formatBRL(projecao.mediaDiaria)} / dia em média
        </span>
      </div>

      {/* Ranking por categoria */}
      <div className="panel">
        <h2 className="panel__title">Ranking por categoria</h2>
        <div className="rank-list">
          {porCategoria.map((item, i) => {
            const meta = getCategoryMeta(item.key);
            return (
              <div key={item.key} className="rank-row">
                <span className="rank-row__pos mono">{i + 1}</span>
                <TagIcon meta={meta} />
                <span className="rank-row__label">{meta.label}</span>
                <span className="rank-row__pct text-muted mono">{item.pct.toFixed(0)}%</span>
                <span className="rank-row__valor mono">{formatBRL(item.valor)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking por subcategoria */}
      <div className="panel">
        <h2 className="panel__title">Ranking por subcategoria</h2>
        <div className="rank-list">
          {porEtapa.map((item, i) => {
            const meta = findSubcategoryMeta(item.key);
            return (
              <div key={item.key} className="rank-row">
                <span className="rank-row__pos mono">{i + 1}</span>
                <TagIcon meta={meta} />
                <span className="rank-row__label">{meta.label}</span>
                <span className="rank-row__pct text-muted mono">{item.pct.toFixed(0)}%</span>
                <span className="rank-row__valor mono">{formatBRL(item.valor)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
