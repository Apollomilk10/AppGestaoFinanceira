import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useMembros } from '../hooks/useMembros';
import { definirCorMembro } from '../services/orcamentos';
import { PALETA_INTEGRANTES, EVENTO_CORES } from '../hooks/useCoresIntegrantes';

export default function MembersModal({ orcamento, onClose }) {
  const { membros, loading } = useMembros(orcamento?.id);
  const [cores, setCores] = useState({});
  const [erro, setErro] = useState('');

  useEffect(() => {
    const inicial = {};
    membros.forEach((m) => {
      if (m.cor) inicial[m.uid] = m.cor;
    });
    setCores(inicial);
  }, [membros]);

  if (!orcamento) return null;

  async function escolher(uid, cor) {
    const anterior = cores[uid];
    setErro('');
    setCores((c) => ({ ...c, [uid]: cor })); // aparece na hora
    try {
      await definirCorMembro(orcamento.id, uid, cor);
      window.dispatchEvent(new Event(EVENTO_CORES));
    } catch (e) {
      setCores((c) => ({ ...c, [uid]: anterior }));
      setErro(e.message || 'Não foi possível salvar a cor.');
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2>Integrantes — {orcamento.nome}</h2>
          <button type="button" className="link-button mono" onClick={onClose}>
            fechar
          </button>
        </div>

        <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
          Toque numa cor para usá-la nos gráficos. Vale para todos do orçamento.
        </p>

        {loading && <p className="text-muted" style={{ fontSize: 13 }}>Carregando…</p>}

        {!loading && membros.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13 }}>Nenhum integrante encontrado.</p>
        )}

        {erro && <p className="field-error">{erro}</p>}

        <div className="integrantes">
          {membros.map((m) => {
            const atual = cores[m.uid];
            return (
              <div key={m.uid} className="integrante">
                <div className="integrante__topo">
                  <span
                    className="integrante__avatar"
                    style={{ background: atual || 'var(--panel-border)' }}
                    aria-hidden="true"
                  >
                    {(m.nome || m.email || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="integrante__texto">
                    <span className="integrante__nome">{m.nome || m.email}</span>
                    {m.nome && m.email && m.nome !== m.email && (
                      <span className="integrante__email">{m.email}</span>
                    )}
                  </span>
                  {m.uid === orcamento.criadoPorUid && <span className="members-list__badge">criador</span>}
                </div>
                <div className="integrante__cores" role="radiogroup" aria-label={`Cor de ${m.nome || m.email}`}>
                  {PALETA_INTEGRANTES.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      role="radio"
                      aria-checked={atual === cor}
                      aria-label={cor}
                      className={`integrante__cor ${atual === cor ? 'integrante__cor--ativa' : ''}`}
                      style={{ background: cor }}
                      onClick={() => escolher(m.uid, cor)}
                    >
                      {atual === cor && <Check size={14} strokeWidth={3} color="#ffffff" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-muted" style={{ fontSize: 12 }}>
          Compartilhe o código <strong className="mono">{orcamento.codigo}</strong> pra convidar mais gente.
        </p>
      </div>
    </div>
  );
}
