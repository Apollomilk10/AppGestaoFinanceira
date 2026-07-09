import { useEffect, useState } from 'react';
import { Target, Plus, Trash2 } from 'lucide-react';
import { fetchMetas, criarMeta, aportarMeta, excluirMeta } from '../services/metas';
import { useOrcamentos } from '../context/OrcamentosContext';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MetasPanel({ orcamentoId }) {
  const { orcamentos } = useOrcamentos();
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [aportando, setAportando] = useState(null); // id da meta
  const [valorAporte, setValorAporte] = useState('');
  const [error, setError] = useState('');

  const alvo = orcamentoId || orcamentos[0]?.id;

  async function carregar() {
    if (!alvo) return;
    setLoading(true);
    try {
      const rows = await fetchMetas(alvo);
      setMetas(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo]);

  async function handleCriar(e) {
    e.preventDefault();
    if (!nome.trim() || !valorAlvo) return;
    setError('');
    try {
      await criarMeta(alvo, { nome: nome.trim(), valorAlvo: Number(valorAlvo) });
      setNome('');
      setValorAlvo('');
      setCriando(false);
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAporte(metaId) {
    if (!valorAporte) return;
    try {
      await aportarMeta(alvo, metaId, Number(valorAporte));
      setValorAporte('');
      setAportando(null);
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExcluir(metaId) {
    try {
      await excluirMeta(alvo, metaId);
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!alvo) return null;

  return (
    <div className="panel">
      <div className="panel__header-row">
        <h2 className="panel__title">Metas de economia</h2>
        {!criando && (
          <button className="link-button mono" onClick={() => setCriando(true)}>
            + nova
          </button>
        )}
      </div>

      {error && <p className="field-error">{error}</p>}

      {criando && (
        <form className="inline-add inline-add--stack" onSubmit={handleCriar}>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="ex: Reserva de emergência"
            autoFocus
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={valorAlvo}
            onChange={(e) => setValorAlvo(e.target.value)}
            placeholder="Valor alvo (R$)"
          />
          <div className="sidebar__form-actions">
            <button type="submit" className="primary-button">criar</button>
            <button type="button" className="link-button" onClick={() => setCriando(false)}>cancelar</button>
          </div>
        </form>
      )}

      {!loading && metas.length === 0 && !criando && (
        <p className="text-muted" style={{ fontSize: 13 }}>Nenhuma meta ainda.</p>
      )}

      <div className="metas-list">
        {metas.map((m) => {
          const pct = m.valorAlvo > 0 ? Math.min((m.valorAtual / m.valorAlvo) * 100, 100) : 0;
          return (
            <div key={m.id} className="meta-card">
              <div className="meta-card__top">
                <span className="meta-card__icon"><Target size={14} /></span>
                <span className="meta-card__nome">{m.nome}</span>
                <button className="icon-button icon-button--danger" onClick={() => handleExcluir(m.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="meta-card__track">
                <div className="meta-card__fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="meta-card__valores mono">
                <span>{formatBRL(m.valorAtual)}</span>
                <span className="text-muted">de {formatBRL(m.valorAlvo)}</span>
              </div>

              {aportando === m.id ? (
                <div className="inline-add">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={valorAporte}
                    onChange={(e) => setValorAporte(e.target.value)}
                    placeholder="Valor"
                    autoFocus
                  />
                  <button type="button" className="inline-add__confirm" onClick={() => handleAporte(m.id)}>ok</button>
                  <button type="button" className="inline-add__cancel" onClick={() => setAportando(null)}>x</button>
                </div>
              ) : (
                <button type="button" className="meta-card__aportar" onClick={() => setAportando(m.id)}>
                  <Plus size={12} /> adicionar valor
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
