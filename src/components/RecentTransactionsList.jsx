import TagIcon from './TagIcon';
import { useCategories } from '../context/CategoriesContext';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function RecentTransactionsList({ rows, limite = 5 }) {
  const { getCategoryMeta } = useCategories();

  const recentes = [...rows]
    .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))
    .slice(0, limite);

  if (recentes.length === 0) return null;

  return (
    <div className="panel">
      <h2 className="panel__title">Últimas despesas</h2>
      <div className="recent-mini-list">
        {recentes.map((row) => {
          const meta = getCategoryMeta(row.categoria);
          return (
            <div key={row.id} className="recent-mini-row">
              <TagIcon meta={meta} size={18} />
              <div className="recent-mini-row__main">
                <span className="recent-mini-row__desc">{row.descricao || meta.label}</span>
                <span className="text-muted" style={{ fontSize: 11 }}>
                  {row.data ? row.data.toLocaleDateString('pt-BR') : ''}
                </span>
              </div>
              <span className={`mono ${row.tipo === 'receita' ? 'text-good' : ''}`}>
                {row.tipo === 'receita' ? '+' : '-'}{formatBRL(row.valor)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
