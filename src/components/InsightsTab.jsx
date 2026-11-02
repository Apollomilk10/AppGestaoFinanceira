import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { mensalPorPessoa, acumuladoMensal, acumuladoPorPessoa, separarPrevisao } from '../utils/insights';
import { useProjecao } from '../hooks/useProjecao';
import { useCoresIntegrantes } from '../hooks/useCoresIntegrantes';


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
  const futuro = payload[0]?.payload?.futuro;
  // Linha real e tracejada se encontram no mês atual: mostra um valor só.
  const vistos = new Set();
  const itens = payload.filter((p) => {
    if (p.value == null || vistos.has(p.name)) return false;
    vistos.add(p.name);
    return true;
  });
  return (
    <div className="chart-tooltip mono">
      <strong>{label}{futuro ? ' · previsto' : ''}</strong>
      {itens.map((p) => (
        <span key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {brl(p.value)}
        </span>
      ))}
    </div>
  );
}

const MESES_PREVISAO = 12;

const EIXO_X = {
  tick: { fill: 'var(--muted)', fontSize: 11 },
  axisLine: { stroke: 'var(--panel-border)' },
  tickLine: false,
};
const EIXO_Y = {
  tick: { fill: 'var(--muted)', fontSize: 10 },
  axisLine: false,
  tickLine: false,
  width: 54,
  tickFormatter: brlCurto,
};

function BarrasPorPessoa({ titulo, subtitulo, dados, corDe }) {
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
                fill={corDe(nome, i)}
                radius={[5, 5, 0, 0]}
                maxBarSize={22}
              >
                {serie.map((l) => (
                  <Cell key={l.label} fillOpacity={l.futuro ? 0.38 : 1} />
                ))}
              </Bar>
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
  const { corDe } = useCoresIntegrantes();

  // Chave da previsão: mostra os próximos 12 meses em todos os gráficos,
  // a partir das contas fixas, parcelamentos e financiamentos.
  const [previsao, setPrevisao] = useState(() => {
    try {
      return localStorage.getItem('casa:relatorios-previsao') === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('casa:relatorios-previsao', previsao ? '1' : '0');
    } catch {
      /* sem armazenamento: só não lembra a escolha */
    }
  }, [previsao]);
  const { previstos, carregando, erro } = useProjecao(previsao, MESES_PREVISAO);
  const futuro = previsao ? MESES_PREVISAO : 0;
  const base = useMemo(() => (previsao ? [...rows, ...previstos] : rows), [rows, previstos, previsao]);

  const entradas = useMemo(() => mensalPorPessoa(base, 'receita', meses, futuro), [base, meses, futuro]);
  const saidas = useMemo(() => mensalPorPessoa(base, 'despesa', meses, futuro), [base, meses, futuro]);

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

      <div className="mode-toggle mode-toggle--small" role="group" aria-label="Previsão" style={{ marginTop: 8 }}>
        <button type="button" className={!previsao ? 'mode-toggle__active' : ''} onClick={() => setPrevisao(false)}>
          Só o que já aconteceu
        </button>
        <button type="button" className={previsao ? 'mode-toggle__active' : ''} onClick={() => setPrevisao(true)}>
          + próximos 12 meses
        </button>
      </div>
      {previsao && (
        <p className="text-muted" style={{ fontSize: 12, margin: '6px 2px 0' }}>
          {carregando
            ? 'Calculando a previsão…'
            : erro ||
              'Meses claros e linhas tracejadas são previsão: contas fixas, parcelamentos e financiamentos que ainda vão cair. Gastos avulsos não entram.'}
        </p>
      )}

      <BarrasPorPessoa
        titulo="Entradas por mês"
        subtitulo={previsao ? 'Quanto cada um recebeu e vai receber em cada mês' : 'Quanto cada um recebeu em cada mês'}
        dados={entradas}
        corDe={corDe}
      />

      <BarrasPorPessoa
        titulo="Saídas por mês"
        subtitulo={previsao ? 'Quanto cada um gastou e vai gastar em cada mês' : 'Quanto cada um gastou em cada mês'}
        dados={saidas}
        corDe={corDe}
      />

      <Acumulado rows={base} meses={meses} futuro={futuro} corDe={corDe} />
    </div>
  );
}

const VISOES = [
  { id: 'geral', label: 'Entradas × saídas' },
  { id: 'receita', label: 'Entradas por pessoa' },
  { id: 'despesa', label: 'Saídas por pessoa' },
];

function Acumulado({ rows, meses, futuro = 0, corDe }) {
  const [visao, setVisao] = useState('geral');

  const geral = useMemo(() => acumuladoMensal(rows, meses, futuro), [rows, meses, futuro]);
  const porPessoaBruto = useMemo(
    () => (visao === 'geral' ? null : acumuladoPorPessoa(rows, visao, meses, futuro)),
    [rows, meses, futuro, visao]
  );

  // Valores "até agora" (mês atual) e "previsto" (fim da janela).
  const idxAtual = geral.reduce((idx, l, i) => (l.futuro ? idx : i), geral.length - 1);
  const ultimo = geral[idxAtual];
  const fimPrevisto = futuro ? geral[geral.length - 1] : null;
  const porPessoa = useMemo(() => {
    if (!porPessoaBruto) return null;
    const atual = porPessoaBruto.serie[idxAtual] || {};
    const total = porPessoaBruto.pessoas.reduce((s, n) => s + (atual[n] || 0), 0);
    const fim = porPessoaBruto.serie[porPessoaBruto.serie.length - 1] || {};
    return {
      ...porPessoaBruto,
      total,
      totalPrevisto: porPessoaBruto.pessoas.reduce((s, n) => s + (fim[n] || 0), 0),
      mix: porPessoaBruto.pessoas.map((nome) => ({
        nome,
        valor: atual[nome] || 0,
        pct: total > 0 ? ((atual[nome] || 0) / total) * 100 : 0,
      })),
    };
  }, [porPessoaBruto, idxAtual]);

  const chaves = visao === 'geral' ? ['entradas', 'saidas'] : porPessoa?.pessoas || [];
  const dadosGrafico = useMemo(() => {
    const serie = visao === 'geral' ? geral : porPessoa?.serie || [];
    return futuro ? separarPrevisao(serie, chaves) : serie;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geral, porPessoa, visao, futuro, chaves.join('|')]);
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
      : (porPessoa?.mix || []).map((m, i) => ({ ...m, cor: corDe(m.nome, i) }));

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
              {fimPrevisto && (
                <span className="acumulado__previsto">
                  previsto em {fimPrevisto.label}: <b>{fimPrevisto.saldo < 0 ? '−' : ''}{brl(Math.abs(fimPrevisto.saldo))}</b>
                </span>
              )}
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
              {futuro > 0 && (
                <span className="acumulado__previsto">
                  previsto em {dadosGrafico[dadosGrafico.length - 1]?.label}: <b>{brl(porPessoa.totalPrevisto)}</b>
                </span>
              )}
            </div>
          )}

          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={dadosGrafico}
              margin={{ top: 6, right: 8, left: -6, bottom: 0 }}
            >
              <CartesianGrid vertical={false} stroke="var(--panel-border)" strokeDasharray="3 4" />
              <XAxis dataKey="label" {...EIXO_X} />
              <YAxis {...EIXO_Y} />
              <Tooltip content={<Dica />} cursor={{ stroke: 'var(--panel-border)' }} />
              {(visao === 'geral'
                ? [
                    { k: 'entradas', nome: 'Entrou', cor: 'var(--good)' },
                    { k: 'saidas', nome: 'Saiu', cor: 'var(--danger)' },
                  ]
                : porPessoa.pessoas.map((nome, i) => ({ k: nome, nome, cor: corDe(nome, i) }))
              ).flatMap(({ k, nome, cor }) => [
                <Line key={k} type="monotone" dataKey={k} name={nome} stroke={cor} strokeWidth={2.4} dot={false} connectNulls={false} />,
                futuro > 0 && (
                  <Line
                    key={`${k}__prev`}
                    type="monotone"
                    dataKey={`${k}__prev`}
                    name={nome}
                    stroke={cor}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    legendType="none"
                    connectNulls={false}
                  />
                ),
              ])}
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
