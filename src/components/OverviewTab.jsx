import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Repeat } from 'lucide-react';
import Sparkline from './Sparkline';
import TagIcon from './TagIcon';
import MetasPanel from './MetasPanel';
import RecorrentesModal from './RecorrentesModal';
import MemberBreakdown from './MemberBreakdown';
import { useCategories } from '../context/CategoriesContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import {
  last14DaysSeries,
  averageDaily,
  biggestExpense,
  rankBy,
  topExpenses,
  weekdaySeries,
  filtrarDespesas,
  filtrarReceitas,
  saldoTotal,
  previsaoSaldoMes,
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
  const { orcamentos, filtroId } = useOrcamentos();
  const [vendoRecorrentes, setVendoRecorrentes] = useState(false);

  const despesas = filtrarDespesas(rows);
  const receitas = filtrarReceitas(rows);
  const totalDespesas = despesas.reduce((s, r) => s + r.valor, 0);
  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
  const saldo = saldoTotal(rows);
  const previsao = previsaoSaldoMes(rows);

  const series = last14DaysSeries(despesas);
  const media = averageDaily(despesas);
  const maior = biggestExpense(despesas);
  const porCategoria = rankBy(despesas, 'categoria').slice(0, 5);
  const porOrcamento = rankBy(despesas, 'orcamentoNome');
  const maioresGastos = topExpenses(despesas, 5);
  const ritmoSemanal = weekdaySeries(despesas);

  const pieData = porCategoria.map((item) => {
    const meta = getCategoryMeta(item.key);
    return { name: meta.label, value: item.valor, color: meta.color };
  });

  // orçamento pra recorrentes/metas: o filtrado, ou o único que a pessoa tem
  const orcamentoAlvo = filtroId || (orcamentos.length === 1 ? orcamentos[0].id : null);

  return (
    <div className="tab-content">
      {/* Hero — saldo líquido (receitas - despesas) */}
      <div className="panel hero-card">
        <div className="hero-card__top">
          <span className="mono eyebrow">SALDO — {saldo >= 0 ? 'POSITIVO' : 'NEGATIVO'}</span>
          <h1 className={`hero-card__total ${saldo < 0 ? 'text-danger' : 'text-good'}`}>
            {formatBRL(saldo)}
          </h1>
        </div>
        <Sparkline data={series} />
        <span className="hero-card__caption text-muted mono">
          {formatBRL(totalReceitas)} em receitas · {formatBRL(totalDespesas)} em despesas
        </span>
      </div>

      {/* Previsão do mês */}
      <div className="panel saldo-card">
        <h2 className="panel__title">Previsão de saldo do mês</h2>
        <div className={`hero-card__total ${previsao.saldoProjetado < 0 ? 'text-danger' : 'text-good'}`} style={{ fontSize: 28 }}>
          {formatBRL(previsao.saldoProjetado)}
        </div>
        <div className="saldo-card__linha text-muted">
          <span>Receitas projetadas</span>
          <span className="mono">{formatBRL(previsao.receitaProjetada)}</span>
        </div>
        <div className="saldo-card__linha text-muted">
          <span>Despesas projetadas</span>
          <span className="mono">{formatBRL(previsao.despesaProjetada)}</span>
        </div>
      </div>

      {/* Stats rápidos */}
      <div className="stat-row">
        <div className="panel stat-card">
          <span className="stat-card__label">Média diária (despesas)</span>
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

      {/* Metas de economia */}
      {orcamentoAlvo && <MetasPanel orcamentoId={orcamentoAlvo} />}

      {/* Contas recorrentes */}
      {orcamentoAlvo && (
        <button className="panel recorrentes-shortcut" onClick={() => setVendoRecorrentes(true)}>
          <Repeat size={16} />
          <span>Ver contas recorrentes e alertas de vencimento</span>
        </button>
      )}

      {/* Quebra por integrante — só faz sentido dentro de um orçamento específico */}
      {filtroId && <MemberBreakdown orcamentoId={filtroId} />}

      {/* Pizza por categoria */}
      {pieData.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Distribuição de despesas por categoria</h2>
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
          <h2 className="panel__title">Despesas por orçamento</h2>
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

      {vendoRecorrentes && orcamentoAlvo && (
        <RecorrentesModal orcamentoId={orcamentoAlvo} onClose={() => setVendoRecorrentes(false)} />
      )}
    </div>
  );
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
