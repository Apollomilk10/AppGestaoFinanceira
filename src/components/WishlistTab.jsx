import { Sparkles, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function WishlistTab({ rows }) {
  const { getCategoryMeta } = useCategories();

  const desejos = rows
    .filter((r) => r.status === 'projetado')
    .sort((a, b) => (a.data?.getTime() || 0) - (b.data?.getTime() || 0));

  const despesas = desejos.filter((r) => r.tipo !== 'receita');
  const receitas = desejos.filter((r) => r.tipo === 'receita');

  const totalDespesas = despesas.reduce((s, r) => s + r.valor, 0);
  const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
  const maiorItem = [...despesas].sort((a, b) => b.valor - a.valor)[0];

  return (
    <div className="tab-content">
      <div className="panel">
        <div className="panel__header-row">
          <h2 className="panel__title">Lista de desejos</h2>
          <Sparkles size={16} className="text-muted" />
        </div>
        <p className="text-muted" style={{ fontSize: 12.5, marginTop: -8 }}>
          Coisas planejadas, ainda não efetivadas. Marque um lançamento como "Lista de Desejo" pra ele cair aqui.
        </p>
      </div>

      <div className="stat-row">
        <div className="panel stat-card">
          <span className="stat-card__label">Total projetado (despesas)</span>
          <span className="stat-card__value mono text-danger">{formatBRL(totalDespesas)}</span>
        </div>
        <div className="panel stat-card">
          <span className="stat-card__label">Itens na lista</span>
          <span className="stat-card__value mono">{desejos.length}</span>
        </div>
      </div>

      <div className="stat-row">
        <div className="panel stat-card">
          <span className="stat-card__label">Maior item</span>
          <span className="stat-card__value mono">{maiorItem ? formatBRL(maiorItem.valor) : '—'}</span>
          {maiorItem && <span className="stat-card__sub">{maiorItem.descricao}</span>}
        </div>
        <div className="panel stat-card">
          <span className="stat-card__label">Receitas projetadas</span>
          <span className="stat-card__value mono text-good">{formatBRL(totalReceitas)}</span>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Itens</h2>

        {desejos.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13 }}>
            Nada projetado ainda. Adicione um lançamento e marque como "Lista de Desejo".
          </p>
        )}

        <div className="recent-mini-list">
          {desejos.map((row) => {
            const meta = getCategoryMeta(row.categoria);
            return (
              <div key={row.id} className="recent-mini-row">
                {row.tipo === 'receita' ? (
                  <ArrowUpCircle size={18} className="text-good" />
                ) : (
                  <TagIcon meta={meta} size={18} />
                )}
                <div className="recent-mini-row__main">
                  <span className="recent-mini-row__desc">{row.descricao || meta.label}</span>
                  <span className="text-muted" style={{ fontSize: 11 }}>
                    {row.data ? row.data.toLocaleDateString('pt-BR') : ''}
                    {row.orcamentoNome ? ` · ${row.orcamentoNome}` : ''}
                  </span>
                </div>
                <span className={`mono ${row.tipo === 'receita' ? 'text-good' : 'text-danger'}`}>
                  {row.tipo === 'receita' ? '+' : '-'}{formatBRL(row.valor)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
