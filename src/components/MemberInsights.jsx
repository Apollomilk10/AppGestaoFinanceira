import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import { porIntegrantePercentual, porIntegranteMensal } from '../utils/insights';

const CORES = ['#f2622e', '#4fb3ff', '#6fbf8b', '#e8b84b', '#b98cf0', '#ff5d7a', '#4fd1c5'];

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="chart-tooltip mono">
      <strong>{p.name}</strong>
      <span>{formatBRL(p.value)} ({p.payload.pct.toFixed(0)}%)</span>
    </div>
  );
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      {payload.map((p) => (
        <span key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value)}
        </span>
      ))}
    </div>
  );
}

export default function MemberInsights({ rows }) {
  const percentual = porIntegrantePercentual(rows);
  const { serie, pessoas } = porIntegranteMensal(rows);

  const temDadosMensais = serie.some((linha) => pessoas.some((p) => linha[p] > 0));

  if (percentual.length === 0) return null;

  return (
    <>
      <div className="panel">
        <h2 className="panel__title">% de despesas por integrante</h2>
        <div className="pie-layout">
          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie data={percentual} dataKey="valor" nameKey="nome" innerRadius={42} outerRadius={72} paddingAngle={2}>
                {percentual.map((entry, i) => (
                  <Cell key={entry.nome} fill={CORES[i % CORES.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pie-legend">
            {percentual.map((entry, i) => (
              <div key={entry.nome} className="pie-legend__item">
                <span className="pie-legend__dot" style={{ background: CORES[i % CORES.length] }} />
                <span className="pie-legend__label">
                  {entry.nome} · {entry.pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {temDadosMensais && (
        <div className="panel">
          <h2 className="panel__title">Por integrante, mês a mês</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--panel-border)' }}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(17,17,20,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} />
              {pessoas.map((nome, i) => (
                <Bar key={nome} dataKey={nome} fill={CORES[i % CORES.length]} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
