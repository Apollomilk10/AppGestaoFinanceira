import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useMembros } from '../hooks/useMembros';
import { definirCorMembro, definirPercentuais } from '../services/orcamentos';
import { PALETA_INTEGRANTES, EVENTO_CORES } from '../hooks/useCoresIntegrantes';

export default function MembersModal({ orcamento, onClose }) {
  const { membros, loading } = useMembros(orcamento?.id);
  const [cores, setCores] = useState({});
  const [erro, setErro] = useState('');
  const [pcts, setPcts] = useState({});
  const [salvandoPct, setSalvandoPct] = useState(false);
  const [pctSalvo, setPctSalvo] = useState(false);

  useEffect(() => {
    const inicial = {};
    const p = {};
    membros.forEach((m) => {
      if (m.cor) inicial[m.uid] = m.cor;
      if (m.percentual != null) p[m.uid] = String(m.percentual);
    });
    setCores(inicial);
    setPcts(p);
  }, [membros]);

  const somaPct = membros.reduce((s, m) => s + (Number(pcts[m.uid]) || 0), 0);
  const pctFecha = membros.length > 0 && Math.abs(somaPct - 100) < 0.01;

  function dividirIgual() {
    const n = membros.length;
    const base = Math.floor((10000 / n)) / 100;
    const novo = {};
    membros.forEach((m, i) => {
      novo[m.uid] = String(i === n - 1 ? Math.round((100 - base * (n - 1)) * 100) / 100 : base);
    });
    setPcts(novo);
    setPctSalvo(false);
  }

  async function salvarPercentuais() {
    setErro('');
    setSalvandoPct(true);
    try {
      await definirPercentuais(
        orcamento.id,
        membros.map((m) => ({ uid: m.uid, percentual: Number(pcts[m.uid]) || 0 }))
      );
      setPctSalvo(true);
      window.dispatchEvent(new Event(EVENTO_CORES));
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar os percentuais.');
    } finally {
      setSalvandoPct(false);
    }
  }

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
                <label className="integrante__pct">
                  <span>Parte no financiamento</span>
                  <span className="integrante__pct-campo">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.01"
                      value={pcts[m.uid] ?? ''}
                      placeholder="0"
                      onChange={(e) => {
                        setPcts((p) => ({ ...p, [m.uid]: e.target.value }));
                        setPctSalvo(false);
                      }}
                    />
                    <b>%</b>
                  </span>
                </label>
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

        {membros.length > 1 && (
          <div className="rateio">
            <div className="rateio__linha">
              <span>Soma das partes</span>
              <b className={pctFecha ? 'text-good' : 'text-danger'}>{somaPct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</b>
            </div>
            <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
              Cada parcela do financiamento é lançada dividida entre os integrantes nessa proporção.
            </p>
            <div className="rateio__botoes">
              <button type="button" className="confirmar-exclusao__neutro" onClick={dividirIgual}>
                Dividir igualmente
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!pctFecha || salvandoPct}
                onClick={salvarPercentuais}
              >
                {salvandoPct ? 'salvando…' : pctSalvo ? 'salvo ✓' : 'salvar divisão'}
              </button>
            </div>
          </div>
        )}

        <p className="text-muted" style={{ fontSize: 12 }}>
          Compartilhe o código <strong className="mono">{orcamento.codigo}</strong> pra convidar mais gente.
        </p>
      </div>
    </div>
  );
}
