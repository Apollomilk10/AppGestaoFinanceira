import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { mensalPorPessoa, acumuladoMensal } from '../utils/insights';

// Uma cor fixa por pessoa (mesma ordem nos dois gráficos), legível no claro e no escuro.
const CORES_PESSOAS = ['#2fae82', '#f0a63a', '#5b8def', '#c06bd9', '#e0574f'];

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function brlCurto(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10_000 ? 0 : 1).replace('.', ',')} mil`;
  return String(Math.round(v));
}

function Dica({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      {payload.map((p) => (
        <span key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {brl(p.value)}
        </span>
      ))}
    </div>
  );
}

const EIXO_X = {
  tick: { fill: 'var(--muted)', fontSize: 11 },
  axisLine: { stroke: 'var(--panel-border)' },
  tickLine: false,
};
const EIXO_Y = {
  tick: { fill: 'var(--muted)', fontSize: 10 },
  axisLine: false,
  tickLine: false,
  width: 44,
  tickFormatter: brlCurto,
};

function BarrasPorPessoa({ titulo, subtitulo, dados }) {
  const { serie, pessoas } = dados;
  const temDados = pessoas.length > 0 && serie.some((l) => pessoas.some((p) => l[p] > 0));

  return (
    <div className="panel">
      <h2 className="panel__title">{titulo}</h2>
      <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 10px' }}>{subtitulo}</p>
      {temDados ? (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={serie} margin={{ top: 6, right: 4, left: -6, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--panel-border)" strokeDasharray="3 4" />
            <XAxis dataKey="label" {...EIXO_X} />
            <YAxis {...EIXO_Y} />
            <Tooltip content={<Dica />} cursor={{ fill: 'var(--mint-soft)', opacity: 0.5 }} />
            {pessoas.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
            {pessoas.map((nome, i) => (
              <Bar
                key={nome}
                dataKey={nome}
                name={nome}
                fill={CORES_PESSOAS[i % CORES_PESSOAS.length]}
                radius={[5, 5, 0, 0]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
          Ainda não há lançamentos nesse período.
        </p>
      )}
    </div>
  );
}

export default function InsightsTab({ rows }) {
  const [meses, setMeses] = useState(6);

  const entradas = useMemo(() => mensalPorPessoa(rows, 'receita', meses), [rows, meses]);
  const saidas = useMemo(() => mensalPorPessoa(rows, 'despesa', meses), [rows, meses]);
  const acumulado = useMemo(() => acumuladoMensal(rows, meses), [rows, meses]);

  const ultimo = acumulado[acumulado.length - 1];
  const temAcumulado = acumulado.some((m) => m.entradas > 0 || m.saidas > 0);

  return (
    <div className="tab-content">
      <div className="mode-toggle mode-toggle--small" role="group" aria-label="Período">
        {[6, 12].map((n) => (
          <button
            key={n}
            type="button"
            className={meses === n ? 'mode-toggle__active' : ''}
            onClick={() => setMeses(n)}
          >
            {n} meses
          </button>
        ))}
      </div>

      <BarrasPorPessoa
        titulo="Entradas por mês"
        subtitulo="Quanto cada um recebeu em cada mês"
        dados={entradas}
      />

      <BarrasPorPessoa
        titulo="Saídas por mês"
        subtitulo="Quanto cada um gastou em cada mês"
        dados={saidas}
      />

      <div className="panel">
        <h2 className="panel__title">Acumulado no tempo</h2>
        <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 4px' }}>
          Tudo que já entrou e já saiu, somado mês a mês
        </p>
        {temAcumulado ? (
          <>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 8px' }}>
              <span className={ultimo.saldo < 0 ? 'text-danger' : 'text-good'}>
                {ultimo.saldo < 0 ? '−' : ''}{brl(Math.abs(ultimo.saldo))}
              </span>
              <span className="text-muted" style={{ fontSize: 12, fontWeight: 500, marginLeft: 8 }}>
                guardado até agora
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={acumulado} margin={{ top: 6, right: 8, left: -6, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--panel-border)" strokeDasharray="3 4" />
                <XAxis dataKey="label" {...EIXO_X} />
                <YAxis {...EIXO_Y} />
                <Tooltip content={<Dica />} cursor={{ stroke: 'var(--panel-border)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" name="Entrou" stroke="var(--good)" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="saidas" name="Saiu" stroke="var(--danger)" strokeWidth={2.4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </>
        ) : (
          <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
            Ainda não há lançamentos nesse período.
          </p>
        )}
      </div>
    </div>
  );
}
