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
import { mensalPorPessoa, acumuladoMensal, acumuladoPorPessoa } from '../utils/insights';

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

      <Acumulado rows={rows} meses={meses} />
    </div>
  );
}

const VISOES = [
  { id: 'geral', label: 'Entradas × saídas' },
  { id: 'receita', label: 'Entradas por pessoa' },
  { id: 'despesa', label: 'Saídas por pessoa' },
];

function Acumulado({ rows, meses }) {
  const [visao, setVisao] = useState('geral');

  const geral = useMemo(() => acumuladoMensal(rows, meses), [rows, meses]);
  const porPessoa = useMemo(
    () => (visao === 'geral' ? null : acumuladoPorPessoa(rows, visao, meses)),
    [rows, meses, visao]
  );

  const ultimo = geral[geral.length - 1];
  const temDados =
    visao === 'geral'
      ? geral.some((m) => m.entradas > 0 || m.saidas > 0)
      : porPessoa && porPessoa.total > 0;

  // Mix na ponta: quanto do acumulado é de cada um.
  const mix =
    visao === 'geral'
      ? (() => {
          const tot = (ultimo?.entradas || 0) + (ultimo?.saidas || 0);
          return [
            { nome: 'Entrou', valor: ultimo?.entradas || 0, cor: 'var(--good)' },
            { nome: 'Saiu', valor: ultimo?.saidas || 0, cor: 'var(--danger)' },
          ].map((m) => ({ ...m, pct: tot > 0 ? (m.valor / tot) * 100 : 0 }));
        })()
      : (porPessoa?.mix || []).map((m, i) => ({ ...m, cor: CORES_PESSOAS[i % CORES_PESSOAS.length] }));

  return (
    <div className="panel">
      <h2 className="panel__title">Acumulado no tempo</h2>
      <p className="text-muted" style={{ fontSize: 12, margin: '2px 0 10px' }}>
        Tudo somado desde o primeiro lançamento, mês a mês
      </p>

      <div className="mode-toggle mode-toggle--small" role="group" aria-label="Agrupar por">
        {VISOES.map((v) => (
          <button
            key={v.id}
            type="button"
            className={visao === v.id ? 'mode-toggle__active' : ''}
            onClick={() => setVisao(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {!temDados ? (
        <p className="text-muted" style={{ padding: '24px 0', textAlign: 'center' }}>
          Ainda não há lançamentos nesse período.
        </p>
      ) : (
        <>
          {visao === 'geral' && (
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 8px' }}>
              <span className={ultimo.saldo < 0 ? 'text-danger' : 'text-good'}>
                {ultimo.saldo < 0 ? '−' : ''}{brl(Math.abs(ultimo.saldo))}
              </span>
              <span className="text-muted" style={{ fontSize: 12, fontWeight: 500, marginLeft: 8 }}>
                guardado até agora
              </span>
            </div>
          )}
          {visao !== 'geral' && (
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 8px' }}>
              <span className={visao === 'receita' ? 'text-good' : 'text-danger'}>
                {brl(porPessoa.total)}
              </span>
              <span className="text-muted" style={{ fontSize: 12, fontWeight: 500, marginLeft: 8 }}>
                {visao === 'receita' ? 'recebido no total' : 'gasto no total'}
              </span>
            </div>
          )}

          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={visao === 'geral' ? geral : porPessoa.serie}
              margin={{ top: 6, right: 8, left: -6, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--panel-border)" strokeDasharray="3 4" />
              <XAxis dataKey="label" {...EIXO_X} />
              <YAxis {...EIXO_Y} />
              <Tooltip content={<Dica />} cursor={{ stroke: 'var(--panel-border)' }} />
              {visao === 'geral' ? (
                <>
                  <Line type="monotone" dataKey="entradas" name="Entrou" stroke="var(--good)" strokeWidth={2.4} dot={false} />
                  <Line type="monotone" dataKey="saidas" name="Saiu" stroke="var(--danger)" strokeWidth={2.4} dot={false} />
                </>
              ) : (
                porPessoa.pessoas.map((nome, i) => (
                  <Line
                    key={nome}
                    type="monotone"
                    dataKey={nome}
                    name={nome}
                    stroke={CORES_PESSOAS[i % CORES_PESSOAS.length]}
                    strokeWidth={2.4}
                    dot={false}
                  />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>

          <div className="mix">
            <span className="mix__titulo">
              {visao === 'geral' ? 'Mix do acumulado' : 'Quanto é de cada um'}
            </span>
            <div className="mix__barra" role="img" aria-label={mix.map((m) => `${m.nome} ${m.pct.toFixed(0)}%`).join(', ')}>
              {mix.filter((m) => m.pct > 0).map((m) => (
                <div key={m.nome} style={{ width: `${m.pct}%`, background: m.cor }} />
              ))}
            </div>
            {mix.map((m) => (
              <div key={m.nome} className="mix__linha">
                <i className="mix__ponto" style={{ background: m.cor }} />
                <span className="mix__nome">{m.nome}</span>
                <span className="mix__pct">{m.pct.toFixed(0)}%</span>
                <span className="mix__valor">{brl(m.valor)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
