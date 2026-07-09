import { useState } from 'react';
import { X, Plus, LogIn, Wallet, Layers, User, Trash2, Copy, Check } from 'lucide-react';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ open, onClose, onOpenProfile }) {
  const { orcamentos, filtroId, setFiltro, criarOrcamento, entrarOrcamento, excluirOrcamento } = useOrcamentos();
  const { uid } = useAuth();
  const [modo, setModo] = useState(null); // null | 'criar' | 'entrar'
  const [valor, setValor] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [copiadoId, setCopiadoId] = useState('');

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
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  }

  async function handleDelete(orcamentoId) {
    setDeletingId(orcamentoId);
    try {
      await excluirOrcamento(orcamentoId);
      setConfirmingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  function copiarCodigo(codigo) {
    navigator.clipboard.writeText(codigo);
    setCopiadoId(codigo);
    setTimeout(() => setCopiadoId(''), 2000);
  }

  function handleSelect(id) {
    setFiltro(id);
    onClose();
  }

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <span className="mono eyebrow">VER</span>
          <button className="icon-button" onClick={onClose} aria-label="Fechar menu">
            <X size={16} />
          </button>
        </div>

        <div className="sidebar__list">
          <button
            className={`sidebar__item sidebar__item--clickable ${filtroId === '' ? 'sidebar__item--active' : ''}`}
            onClick={() => handleSelect('')}
          >
            <Layers size={16} />
            <span className="sidebar__item-name">Meu espaço (tudo)</span>
            {filtroId === '' && <Check size={15} />}
          </button>

          {orcamentos.map((orc) => {
            const souDono = orc.criadoPorUid === uid;
            const isConfirming = confirmingId === orc.id;
            const isActive = filtroId === orc.id;

            return (
              <div key={orc.id} className={`sidebar__item ${isActive ? 'sidebar__item--active' : ''}`}>
                <button
                  type="button"
                  className="sidebar__item--clickable sidebar__item-clickarea"
                  onClick={() => handleSelect(orc.id)}
                >
                  <Wallet size={16} />
                  <div className="sidebar__item-main">
                    <span className="sidebar__item-name">{orc.nome}</span>
                    <span className="sidebar__item-code mono" onClick={(e) => { e.stopPropagation(); copiarCodigo(orc.codigo); }}>
                      {copiadoId === orc.codigo ? <Check size={11} /> : <Copy size={11} />}
                      {orc.codigo}
                    </span>
                  </div>
                </button>

                {isActive && <Check size={15} className="sidebar__item-check" />}

                {souDono && (
                  isConfirming ? (
                    <div className="confirm-delete">
                      <button
                        type="button"
                        className="confirm-delete__yes"
                        disabled={deletingId === orc.id}
                        onClick={() => handleDelete(orc.id)}
                      >
                        {deletingId === orc.id ? '...' : 'excluir'}
                      </button>
                      <button type="button" className="confirm-delete__no" onClick={() => setConfirmingId(null)}>
                        não
                      </button>
                    </div>
                  ) : (
                    <button
                      className="icon-button icon-button--danger"
                      onClick={() => setConfirmingId(orc.id)}
                      aria-label="Excluir orçamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="field-error">{error}</p>}

        {modo ? (
          <form className="sidebar__form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={valor}
              onChange={(e) => setValor(modo === 'entrar' ? e.target.value.toUpperCase() : e.target.value)}
              placeholder={modo === 'criar' ? 'Nome do orçamento' : 'Código do orçamento'}
              autoFocus
            />
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
