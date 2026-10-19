import { useMemo } from 'react';
import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useMembros } from '../hooks/useMembros';
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
  const { filtroId } = useOrcamentos();
  const { membros } = useMembros(filtroId);

  const dados = useMemo(() => {
    const agora = new Date();
    const fimDeHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
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
    // Quebra por participante: entradas e saídas do mês de cada um.
    // Começa com todos os integrantes do orçamento (mesmo quem não lançou
    // nada) e soma quem aparece nos lançamentos.
    const porPessoa = new Map();
    membros.forEach((m) => porPessoa.set(m.nome, { nome: m.nome, entradas: 0, saidas: 0 }));
    doMes.forEach((r) => {
      const nome = r.responsavelNome || 'Sem responsável';
      const p = porPessoa.get(nome) || { nome, entradas: 0, saidas: 0 };
      if (r.tipo === 'receita') p.entradas += r.valor;
      else p.saidas += r.valor;
      porPessoa.set(nome, p);
    });
    const participantes = Array.from(porPessoa.values())
      .map((p) => ({ ...p, saldo: p.entradas - p.saidas }))
      .sort((a, b) => b.entradas + b.saidas - (a.entradas + a.saidas));

    return {
      participantes,
      mes: agora.toLocaleDateString('pt-BR', { month: 'long' }),
      totalDespesas,
      totalReceitas,
      // Saldo atual: tudo que entrou menos tudo que saiu, desde o primeiro
      // lançamento até hoje (inclusive). Lançamentos com data futura e
      // desejos/projetados ficam de fora.
      saldo: rows
        .filter((r) => r.status !== 'projetado' && r.data && r.data < fimDeHoje)
        .reduce((s, r) => s + (r.tipo === 'receita' ? r.valor : -r.valor), 0),
      porCategoria: rankBy(despesas, 'categoria').slice(0, 5),
      recentes: rows
        .filter((r) => r.status !== 'projetado')
        .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))
        .slice(0, 5),
    };
  }, [rows, membros]);

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
        <span className="balanco__label">Saldo atual</span>
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
            Entrou em {dados.mes} <b>{brl(dados.totalReceitas)}</b>
          </span>
          <span className="balanco__pe">
            <i className="balanco__ponto balanco__ponto--saiu" />
            Saiu em {dados.mes} <b>{brl(dados.totalDespesas)}</b>
          </span>
        </div>
      </section>

      {dados.participantes.length > 0 && (
        <section className="secao">
          <h2 className="secao__titulo">Por participante no mês</h2>
          {dados.participantes.map((p) => (
            <div key={p.nome} className="participante">
              <div className="participante__topo">
                <span className="participante__nome">{p.nome}</span>
                <span className={`participante__saldo ${p.saldo < 0 ? 'text-danger' : 'text-good'}`}>
                  {p.saldo < 0 ? '−' : ''}{brl(Math.abs(p.saldo))}
                </span>
              </div>
              <div className="participante__fluxo">
                <span>Entrou <b className="text-good">{brl(p.entradas)}</b></span>
                <span>Saiu <b className="text-danger">{brl(p.saidas)}</b></span>
              </div>
            </div>
          ))}
        </section>
      )}

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
