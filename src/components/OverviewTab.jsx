import { useMemo, useState } from 'react';
import { Repeat } from 'lucide-react';
import TagIcon from './TagIcon';
import MetasPanel from './MetasPanel';
import LimitesPanel from './LimitesPanel';
import RecorrentesModal from './RecorrentesModal';
import MemberBreakdown from './MemberBreakdown';
import MemberInsights from './MemberInsights';
import SaldoMensalChart from './SaldoMensalChart';
import { useCategories } from '../context/CategoriesContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import {
  averageDaily,
  biggestExpense,
  rankBy,
  filtrarDespesas,
  filtrarReceitas,
} from '../utils/insights';

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function OverviewTab({ rows, onSelectCategory }) {
  const { getCategoryMeta } = useCategories();
  const { orcamentos, filtroId, isMeuEspaco } = useOrcamentos();
  const [vendoRecorrentes, setVendoRecorrentes] = useState(false);

  const dados = useMemo(() => {
    const despesas = filtrarDespesas(rows);
    const receitas = filtrarReceitas(rows);
    return {
      despesas,
      receitas,
      totalDespesas: despesas.reduce((s, r) => s + r.valor, 0),
      totalReceitas: receitas.reduce((s, r) => s + r.valor, 0),
      porCategoria: rankBy(despesas, 'categoria').slice(0, 6),
      porCategoriaReceita: rankBy(receitas, 'categoria').slice(0, 3),
      media: averageDaily(despesas),
      maior: biggestExpense(despesas),
      recentes: [...rows]
        .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))
        .slice(0, 6),
    };
  }, [rows]);

  const orcamentosVisiveis = isMeuEspaco ? orcamentos : orcamentos.filter((o) => o.id === filtroId);
  const orcamentoAlvo = filtroId || null;

  return (
    <div className="tab-content tab-content--fluido">
      <SaldoMensalChart rows={rows} orcamentos={orcamentosVisiveis} />

      <section className="secao">
        <h2 className="secao__titulo">Fluxo do período</h2>
        <div className="par-fluxo">
          <div className="par-fluxo__item">
            <span className="par-fluxo__label">Entrou</span>
            <span className="par-fluxo__valor text-good">{brl(dados.totalReceitas)}</span>
          </div>
          <div className="par-fluxo__item">
            <span className="par-fluxo__label">Saiu</span>
            <span className="par-fluxo__valor text-danger">{brl(dados.totalDespesas)}</span>
          </div>
          <div className="par-fluxo__item">
            <span className="par-fluxo__label">Média por dia</span>
            <span className="par-fluxo__valor">{brl(dados.media)}</span>
          </div>
        </div>
      </section>

      {dados.porCategoria.length > 0 && (
        <section className="secao">
          <h2 className="secao__titulo">Onde o dinheiro foi</h2>
          {dados.porCategoria.map((item) => {
            const meta = getCategoryMeta(item.key);
            return (
              <button
                key={item.key}
                className="linha linha--clicavel"
                onClick={() => onSelectCategory?.(meta.key)}
              >
                <TagIcon meta={meta} />
                <div className="linha__corpo">
                  <span className="linha__nome">{meta.label}</span>
                  <div className="linha__barra">
                    <div
                      className="linha__barra-fill"
                      style={{ width: `${item.pct}%`, background: meta.color }}
                    />
                  </div>
                </div>
                <span className="linha__valor">{brl(item.valor)}</span>
              </button>
            );
          })}
        </section>
      )}

      {dados.recentes.length > 0 && (
        <section className="secao">
          <h2 className="secao__titulo">Últimos lançamentos</h2>
          {dados.recentes.map((row) => {
            const meta = getCategoryMeta(row.categoria);
            const receita = row.tipo === 'receita';
            return (
              <div key={row.id} className="linha">
                <TagIcon meta={meta} />
                <div className="linha__corpo">
                  <span className="linha__nome">{row.descricao || meta.label}</span>
                  <span className="linha__sub">
                    {row.data ? row.data.toLocaleDateString('pt-BR') : ''}
                    {row.responsavelNome ? ` · ${row.responsavelNome}` : ''}
                    {row.status === 'projetado' ? ' · desejo' : ''}
                  </span>
                </div>
                <span className={`linha__valor ${receita ? 'text-good' : ''}`}>
                  {receita ? '+' : '−'}{brl(row.valor)}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {dados.receitas.length > 0 && (
        <section className="secao">
          <h2 className="secao__titulo">De onde veio</h2>
          {dados.porCategoriaReceita.map((item) => {
            const meta = getCategoryMeta(item.key);
            return (
              <div key={item.key} className="linha">
                <TagIcon meta={meta} />
                <div className="linha__corpo">
                  <span className="linha__nome">{meta.label}</span>
                  <span className="linha__sub">{item.pct.toFixed(0)}% das entradas</span>
                </div>
                <span className="linha__valor text-good">+{brl(item.valor)}</span>
              </div>
            );
          })}
        </section>
      )}

      {dados.maior && (
        <section className="secao">
          <h2 className="secao__titulo">Maior gasto do período</h2>
          <div className="linha">
            <div className="linha__corpo">
              <span className="linha__nome">{dados.maior.descricao || 'Sem descrição'}</span>
              <span className="linha__sub">
                {dados.maior.data ? dados.maior.data.toLocaleDateString('pt-BR') : ''}
              </span>
            </div>
            <span className="linha__valor">{brl(dados.maior.valor)}</span>
          </div>
        </section>
      )}

      <MemberBreakdown orcamentos={orcamentosVisiveis} />
      <MemberInsights rows={dados.despesas} />

      {orcamentoAlvo && (
        <>
          <LimitesPanel orcamentoId={orcamentoAlvo} rows={rows} />
          <MetasPanel orcamentoId={orcamentoAlvo} />
          <section className="secao">
            <button className="linha linha--clicavel" onClick={() => setVendoRecorrentes(true)}>
              <Repeat size={17} className="text-muted" />
              <div className="linha__corpo">
                <span className="linha__nome">Contas fixas e vencimentos</span>
                <span className="linha__sub">ver, criar e acompanhar parcelas</span>
              </div>
            </button>
          </section>
        </>
      )}

      {vendoRecorrentes && orcamentoAlvo && (
        <RecorrentesModal orcamentoId={orcamentoAlvo} onClose={() => setVendoRecorrentes(false)} />
      )}
    </div>
  );
}
