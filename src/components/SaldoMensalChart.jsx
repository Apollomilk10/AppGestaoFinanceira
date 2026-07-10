import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Check, Circle, Clock } from 'lucide-react';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const ponto = payload[0].payload;
  const valor = ponto.real ?? ponto.previsto;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      <span>{formatBRL(valor)}{ponto.real === null ? ' (previsto)' : ''}</span>
    </div>
  );
}

export default function SaldoMensalChart({ serie, saldoInicial, saldoAtual, saldoPrevisto }) {
  const nomeMes = MESES[new Date().getMonth()];

  return (
    <div className="panel saldo-mensal">
      <div className="saldo-mensal__header">
        <span className="mono eyebrow">{nomeMes.toUpperCase()}</span>
      </div>

      <div className="saldo-mensal__metrics">
        <div className="saldo-mensal__metric">
          <span className="saldo-mensal__metric-label"><Check size={11} /> Inicial</span>
          <span className="saldo-mensal__metric-value mono">{formatBRL(saldoInicial)}</span>
        </div>
        <div className="saldo-mensal__metric">
          <span className="saldo-mensal__metric-label"><Circle size={11} /> Saldo</span>
          <span className={`saldo-mensal__metric-value mono ${saldoAtual < 0 ? 'text-danger' : 'text-good'}`}>
            {formatBRL(saldoAtual)}
          </span>
        </div>
        <div className="saldo-mensal__metric">
          <span className="saldo-mensal__metric-label"><Clock size={11} /> Previsto</span>
          <span className={`saldo-mensal__metric-value mono ${saldoPrevisto < 0 ? 'text-danger' : 'text-good'}`}>
            {formatBRL(saldoPrevisto)}
          </span>
        </div>
      </div>

      {serie.length > 1 && (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={serie} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="saldoRealFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--ink)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="saldoPrevistoFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--muted)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--muted)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--muted)', fontSize: 10 }}
              axisLine={{ stroke: 'var(--panel-border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="real"
              stroke="var(--ink)"
              strokeWidth={2}
              fill="url(#saldoRealFill)"
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="previsto"
              stroke="var(--muted)"
              strokeWidth={2}
              strokeDasharray="4 4"
              fill="url(#saldoPrevistoFill)"
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
