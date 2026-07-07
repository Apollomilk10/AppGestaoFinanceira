import { useState } from 'react';
import { X, Plus, LogIn, Wallet, User, Check } from 'lucide-react';
import { useOrcamentos } from '../context/OrcamentosContext';

export default function Sidebar({ open, onClose, onOpenProfile }) {
  const { orcamentos, activeId, switchOrcamento, criarOrcamento, entrarOrcamento } = useOrcamentos();
  const [modo, setModo] = useState(null); // null | 'criar' | 'entrar'
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function fecharFormulario() {
    setModo(null);
    setValor('');
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valor.trim()) return;
    setStatus('saving');
    setError('');
    try {
      if (modo === 'criar') {
        await criarOrcamento(valor.trim());
      } else {
        await entrarOrcamento(valor.trim());
      }
      fecharFormulario();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  }

  function handleSelect(id) {
    switchOrcamento(id);
    onClose();
  }

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <span className="mono eyebrow">MEUS ORÇAMENTOS</span>
          <button className="icon-button" onClick={onClose} aria-label="Fechar menu">
            <X size={16} />
          </button>
        </div>

        <div className="sidebar__list">
          {orcamentos.map((orc) => (
            <button
              key={orc.id}
              className={`sidebar__item ${orc.id === activeId ? 'sidebar__item--active' : ''}`}
              onClick={() => handleSelect(orc.id)}
            >
              <Wallet size={16} />
              <span className="sidebar__item-name">{orc.nome}</span>
              {orc.id === activeId && <Check size={15} />}
            </button>
          ))}
        </div>

        {modo ? (
          <form className="sidebar__form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(modo === 'entrar' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={modo === 'criar' ? 'Nome do orçamento' : 'Código do orçamento'}
              autoFocus
            />
            {error && <p className="field-error">{error}</p>}
            <div className="sidebar__form-actions">
              <button type="submit" className="primary-button" disabled={status === 'saving'}>
                {status === 'saving' ? '...' : 'confirmar'}
              </button>
              <button type="button" className="link-button" onClick={fecharFormulario}>
                cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="sidebar__actions">
            <button className="sidebar__action" onClick={() => setModo('criar')}>
              <Plus size={16} />
              <span>Criar orçamento</span>
            </button>
            <button className="sidebar__action" onClick={() => setModo('entrar')}>
              <LogIn size={16} />
              <span>Entrar com código</span>
            </button>
          </div>
        )}

        <div className="sidebar__footer">
          <button
            className="sidebar__action"
            onClick={() => {
              onOpenProfile();
              onClose();
            }}
          >
            <User size={16} />
            <span>Meu perfil</span>
          </button>
        </div>
      </aside>
    </>
  );
}
