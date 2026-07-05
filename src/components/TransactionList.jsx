import TagIcon from './TagIcon';
import { getCategoryMeta, getEtapaMeta } from '../utils/categoryMeta';

export default function TransactionList({ rows }) {
  const groups = groupByDate(rows);

  if (rows.length === 0) {
    return (
      <div className="panel">
        <p className="text-muted" style={{ textAlign: 'center', padding: '32px 0' }}>
          Nenhum lançamento encontrado com esses filtros.
        </p>
      </div>
    );
  }

  return (
    <div className="transaction-groups">
      {groups.map(([dateLabel, items]) => (
        <div key={dateLabel} className="transaction-group">
          <span className="transaction-group__label mono">{dateLabel}</span>
          <div className="panel transaction-group__list">
            {items.map((row) => {
              const catMeta = getCategoryMeta(row.categoria);
              const etapaMeta = getEtapaMeta(row.etapa);
              return (
                <div key={row.id} className="transaction-row">
                  <TagIcon meta={catMeta} />
                  <div className="transaction-row__main">
                    <span className="transaction-row__desc">{row.descricao || catMeta.label}</span>
                    <span className="transaction-row__meta text-muted">
                      {catMeta.label} · {etapaMeta.label}
                      {row.responsavel ? ` · ${row.responsavel}` : ''}
                    </span>
                  </div>
                  <span className="transaction-row__valor mono">{formatBRL(row.valor)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function groupByDate(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const label = row.data ? row.data.toLocaleDateString('pt-BR') : 'Sem data';
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(row);
  });
  return Array.from(map.entries());
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
