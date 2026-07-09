import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { fetchPorIntegrante } from '../services/appsScript';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MemberBreakdown({ orcamentoId }) {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orcamentoId) return;
    setLoading(true);
    fetchPorIntegrante(orcamentoId)
      .then((rows) => setLinhas(rows.sort((a, b) => b.despesas - a.despesas)))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [orcamentoId]);

  if (!orcamentoId || (!loading && linhas.length === 0)) return null;

  return (
    <div className="panel">
      <h2 className="panel__title">Por integrante</h2>
      <div className="rank-list">
        {linhas.map((l) => (
          <div key={l.uid} className="rank-row">
            <span className="rank-row__pos"><Users size={13} /></span>
            <span className="rank-row__label">{l.nome}</span>
            <span className="mono text-danger" style={{ marginRight: 8 }}>-{formatBRL(l.despesas)}</span>
            {l.receitas > 0 && <span className="mono text-good">+{formatBRL(l.receitas)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
