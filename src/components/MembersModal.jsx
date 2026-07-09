import { Users } from 'lucide-react';
import { useMembros } from '../hooks/useMembros';

export default function MembersModal({ orcamento, onClose }) {
  const { membros, loading } = useMembros(orcamento?.id);

  if (!orcamento) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2>Integrantes — {orcamento.nome}</h2>
          <button type="button" className="link-button mono" onClick={onClose}>
            fechar
          </button>
        </div>

        {loading && <p className="text-muted" style={{ fontSize: 13 }}>Carregando…</p>}

        {!loading && membros.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13 }}>Nenhum integrante encontrado.</p>
        )}

        <div className="members-list">
          {membros.map((m) => (
            <div key={m.uid} className="members-list__row">
              <span className="members-list__avatar">
                <Users size={14} />
              </span>
              <span className="members-list__email">{m.email}</span>
              {m.uid === orcamento.criadoPorUid && <span className="members-list__badge">criador</span>}
            </div>
          ))}
        </div>

        <p className="text-muted" style={{ fontSize: 12 }}>
          Compartilhe o código <strong className="mono">{orcamento.codigo}</strong> pra convidar mais gente.
        </p>
      </div>
    </div>
  );
}
