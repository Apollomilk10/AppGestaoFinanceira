import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Check, Circle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { saldoDiarioMes, previsaoSaldoMes } from '../utils/insights';

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

export default function SaldoMensalChart({ rows }) {
  const [mesOffset, setMesOffset] = useState(0);

  const base = new Date();
  const alvo = new Date(base.getFullYear(), base.getMonth() + mesOffset, 1);
  const nomeMes = MESES[alvo.getMonth()];

  const serie = saldoDiarioMes(rows, mesOffset);
  const previsao = previsaoSaldoMes(rows, mesOffset);
  const saldoInicial = 0;
  const saldoAtual = mesOffset < 0 ? previsao.saldoProjetado : previsao.saldoAtual;
  const saldoPrevisto = previsao.saldoProjetado;

  return (
    <div className="panel saldo-mensal">
      <div className="saldo-mensal__header">
        <button
          className="icon-button"
          onClick={() => setMesOffset((m) => m - 1)}
          aria-label="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="mono eyebrow">
          {nomeMes.toUpperCase()} {alvo.getFullYear() !== base.getFullYear() ? alvo.getFullYear() : ''}
        </span>
        <button
          className="icon-button"
          onClick={() => setMesOffset((m) => Math.min(m + 1, 0))}
          disabled={mesOffset >= 0}
          aria-label="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="saldo-mensal__metrics">
        <div className="saldo-mensal__metric">
          <span className="saldo-mensal__metric-label"><Check size={11} /> Inicial</span>
          <span className="saldo-mensal__metric-value mono">{formatBRL(saldoInicial)}</span>
        </div>
        <div className="saldo-mensal__metric">
          <span className="saldo-mensal__metric-label"><Circle size={11} /> {mesOffset === 0 ? 'Saldo' : 'Fechou em'}</span>
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

      {serie.length <= 1 && (
        <p className="text-muted" style={{ fontSize: 12.5, textAlign: 'center', padding: '12px 0' }}>
          Nenhum lançamento nesse mês.
        </p>
      )}
    </div>
  );
}
