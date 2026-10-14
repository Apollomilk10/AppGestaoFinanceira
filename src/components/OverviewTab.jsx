import { useMemo } from 'react';
import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';
import { rankBy, filtrarDespesas, filtrarReceitas } from '../utils/insights';

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Início: só o essencial do mês — quanto sobrou, onde o dinheiro foi e o
 * que entrou/saiu por último. Adicionar lançamento é o botão flutuante;
 * contas fixas e limites moraram na aba Orçamentos.
 */
export default function OverviewTab({ rows, onSelectCategory }) {
  const { getCategoryMeta } = useCategories();

  const dados = useMemo(() => {
    const agora = new Date();
    const doMes = rows.filter(
      (r) =>
        r.status !== 'projetado' &&
        r.data &&
        r.data.getFullYear() === agora.getFullYear() &&
        r.data.getMonth() === agora.getMonth()
    );
    const despesas = filtrarDespesas(doMes);
    const receitas = filtrarReceitas(doMes);
    const totalDespesas = despesas.reduce((s, r) => s + r.valor, 0);
    const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
    return {
      mes: agora.toLocaleDateString('pt-BR', { month: 'long' }),
      totalDespesas,
      totalReceitas,
      saldo: totalReceitas - totalDespesas,
      porCategoria: rankBy(despesas, 'categoria').slice(0, 5),
      recentes: rows
        .filter((r) => r.status !== 'projetado')
        .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))
        .slice(0, 5),
    };
  }, [rows]);

  // Quanto do que entrou no mês já foi gasto.
  const consumido =
    dados.totalReceitas > 0
      ? Math.min(100, (dados.totalDespesas / dados.totalReceitas) * 100)
      : dados.totalDespesas > 0
        ? 100
        : 0;
  const negativo = dados.saldo < 0;

  return (
    <div className="tab-content tab-content--fluido">
      <section className="balanco">
        <span className="balanco__label">Sobra de {dados.mes}</span>
        <strong className={`balanco__valor ${negativo ? 'balanco__valor--negativo' : ''}`}>
          {negativo ? '−' : ''}{brl(Math.abs(dados.saldo))}
        </strong>

        <div
          className="balanco__trilha"
          role="img"
          aria-label={`${consumido.toFixed(0)}% do que entrou já foi gasto`}
        >
          <div className="balanco__trilha-fill" style={{ width: `${consumido}%` }} />
        </div>

        <div className="balanco__pes">
          <span className="balanco__pe">
            <i className="balanco__ponto balanco__ponto--entrou" />
            Entrou <b>{brl(dados.totalReceitas)}</b>
          </span>
          <span className="balanco__pe">
            <i className="balanco__ponto balanco__ponto--saiu" />
            Saiu <b>{brl(dados.totalDespesas)}</b>
          </span>
        </div>
      </section>

      {dados.recentes.length === 0 && (
        <section className="secao">
          <p className="text-muted" style={{ textAlign: 'center', padding: '28px 8px' }}>
            Nada por aqui ainda. Toque no <b>+</b> para adicionar sua primeira receita ou gasto.
          </p>
        </section>
      )}

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
    </div>
  );
}
