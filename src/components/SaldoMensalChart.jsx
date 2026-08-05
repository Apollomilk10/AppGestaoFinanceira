import { useEffect, useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { saldoDiarioMes, previsaoSaldoMes, projecaoMensalFutura } from '../utils/insights';
import { fetchRecorrentes } from '../services/recorrentes';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MAX_FUTURO = 12;

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const v = p.real ?? p.previsto;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      <span>{brl(v)}{p.real == null ? ' · previsto' : ''}</span>
    </div>
  );
}

export default function SaldoMensalChart({ rows, orcamentos }) {
  const [offset, setOffset] = useState(0);
  const [recorrentes, setRecorrentes] = useState([]);

  const idsOrcamentos = orcamentos?.map((o) => o.id).join(',') || '';

  useEffect(() => {
    if (!orcamentos?.length) return;
    Promise.all(orcamentos.map((o) => fetchRecorrentes(o.id)))
      .then((l) => setRecorrentes(l.flat()))
      .catch((e) => console.error('Recorrentes para projeção:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsOrcamentos]);

  const base = new Date();
  const alvo = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const mesAtualStr = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
  const futuro = offset > 0;

  const { inicial, saldo, previsto, serie } = useMemo(() => {
    if (futuro) {
      let acum = previsaoSaldoMes(rows, 0).saldoProjetado;
      for (let k = 1; k < offset; k++) {
        acum += projecaoMensalFutura(recorrentes, k, mesAtualStr).saldoProjetado;
      }
      const mes = projecaoMensalFutura(recorrentes, offset, mesAtualStr);
      return {
        inicial: acum,
        saldo: acum + mes.saldoAtual,
        previsto: acum + mes.saldoProjetado,
        serie: [
          { label: 'início', real: null, previsto: acum },
          { label: 'fim', real: null, previsto: acum + mes.saldoProjetado },
        ],
      };
    }
    const p = previsaoSaldoMes(rows, offset);
    return {
      inicial: p.inicial,
      saldo: p.saldoAtual,
      previsto: p.saldoProjetado,
      serie: saldoDiarioMes(rows, offset),
    };
  }, [rows, recorrentes, offset, futuro, mesAtualStr]);

  const anoDiferente = alvo.getFullYear() !== base.getFullYear();

  return (
    <section className="hero">
      <div className="hero__nav">
        <button className="hero__nav-btn" onClick={() => setOffset((o) => o - 1)} aria-label="Mês anterior">
          <ChevronLeft size={17} strokeWidth={2.4} />
        </button>
        <span className="hero__mes">
          {MESES[alvo.getMonth()]}{anoDiferente ? ` ${alvo.getFullYear()}` : ''}
        </span>
        <button
          className="hero__nav-btn"
          onClick={() => setOffset((o) => Math.min(o + 1, MAX_FUTURO))}
          disabled={offset >= MAX_FUTURO}
          aria-label="Próximo mês"
        >
          <ChevronRight size={17} strokeWidth={2.4} />
        </button>
      </div>

      <div className={`hero__valor ${saldo < 0 ? 'hero__valor--negativo' : ''}`}>{brl(saldo)}</div>

      <p className="hero__legenda">
        {futuro ? 'Projetado a partir das suas contas fixas. ' : ''}
        Começou o mês com <strong>{brl(inicial)}</strong> · deve fechar em{' '}
        <strong>{brl(previsto)}</strong>
      </p>

      {serie.length > 1 && (
        <div className="hero__grafico">
          <ResponsiveContainer width="100%" height={128}>
            <AreaChart data={serie} margin={{ top: 6, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="fillReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis hide domain={['dataMin', 'dataMax']} />
              <Tooltip content={<Tip />} />
              <Area
                type="monotone"
                dataKey="real"
                stroke="var(--accent)"
                strokeWidth={2.4}
                fill="url(#fillReal)"
                connectNulls={false}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="previsto"
                stroke="var(--muted)"
                strokeWidth={1.8}
                strokeDasharray="3 4"
                fill="none"
                connectNulls={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
