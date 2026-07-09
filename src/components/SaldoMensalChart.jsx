import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Check, Circle, Clock } from 'lucide-react';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      <span>{formatBRL(payload[0].value)}</span>
    </div>
  );
}

export default function SaldoMensalChart({ serie, saldoAtual, saldoInicial, saldoPrevisto }) {
  const [modo, setModo] = useState('saldo'); // inicial | saldo | previsto

  const valores = { inicial: saldoInicial, saldo: saldoAtual, previsto: saldoPrevisto };

  // adiciona o ponto de "hoje" e, se estiver vendo previsto, um ponto final
  const dadosGrafico =
    modo === 'previsto' && serie.length > 0
      ? [...serie, { label: 'fim do mês', total: saldoPrevisto }]
      : serie;

  return (
    <div className="panel saldo-mensal">
      <div className="saldo-mensal__tabs">
        <button
          className={`saldo-mensal__tab ${modo === 'inicial' ? 'saldo-mensal__tab--active' : ''}`}
          onClick={() => setModo('inicial')}
        >
          <Check size={12} /> Inicial
        </button>
        <button
          className={`saldo-mensal__tab ${modo === 'saldo' ? 'saldo-mensal__tab--active' : ''}`}
          onClick={() => setModo('saldo')}
        >
          <Circle size={12} /> Saldo
        </button>
        <button
          className={`saldo-mensal__tab ${modo === 'previsto' ? 'saldo-mensal__tab--active' : ''}`}
          onClick={() => setModo('previsto')}
        >
          <Clock size={12} /> Previsto
        </button>
      </div>

      <div className={`saldo-mensal__valor mono ${valores[modo] < 0 ? 'text-danger' : 'text-good'}`}>
        {formatBRL(valores[modo])}
      </div>

      {dadosGrafico.length > 1 && (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={dadosGrafico} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="saldoMensalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
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
            <Area type="monotone" dataKey="total" stroke="var(--ink)" strokeWidth={2} fill="url(#saldoMensalFill)" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
