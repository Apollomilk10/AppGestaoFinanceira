import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import TagIcon from './TagIcon';
import EditExpenseSheet from './EditExpenseSheet';
import { useAuth } from '../context/AuthContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useCategories } from '../context/CategoriesContext';
import { deleteGasto } from '../services/appsScript';

export default function ManageTab({ rows, onChanged }) {
  const auth = useAuth();
  const { activeId } = useOrcamentos();
  const session = { ...auth, orcamentoId: activeId };
  const { getCategoryMeta, getSubcategoryMeta } = useCategories();
  const [editing, setEditing] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const ordenadas = [...rows].sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));

  async function handleDelete(row) {
    setDeleting(true);
    setError('');
    try {
      await deleteGasto(row.rowNumber, session);
      setConfirmingId(null);
      onChanged?.();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="tab-content">
      <div className="panel">
        <h2 className="panel__title">Todos os lançamentos ({rows.length})</h2>

        {error && <p className="field-error" style={{ marginBottom: 10 }}>{error}</p>}

        {ordenadas.length === 0 && (
          <p className="text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>
            Nenhum lançamento ainda.
          </p>
        )}

        {ordenadas.map((row) => {
          const catMeta = getCategoryMeta(row.categoria);
          const subMeta = getSubcategoryMeta(row.categoria, row.etapa);
          const isConfirming = confirmingId === row.id;

          return (
            <div key={row.id} className="manage-row">
              <TagIcon meta={catMeta} />
              <div className="manage-row__main">
                <span className="manage-row__desc">{row.descricao || catMeta.label}</span>
                <span className="manage-row__meta text-muted">
                  {row.data ? row.data.toLocaleDateString('pt-BR') : 'sem data'} · {catMeta.label} · {subMeta.label}
                </span>
              </div>
              <span className="manage-row__valor mono">{formatBRL(row.valor)}</span>

              {isConfirming ? (
                <div className="confirm-delete">
                  <button
                    type="button"
                    className="confirm-delete__yes"
                    disabled={deleting}
                    onClick={() => handleDelete(row)}
                  >
                    {deleting ? '...' : 'excluir'}
                  </button>
                  <button type="button" className="confirm-delete__no" onClick={() => setConfirmingId(null)}>
                    cancelar
                  </button>
                </div>
              ) : (
                <div className="manage-row__actions">
                  <button className="icon-button" onClick={() => setEditing(row)} aria-label="Editar">
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button icon-button--danger"
                    onClick={() => setConfirmingId(row.id)}
                    aria-label="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <EditExpenseSheet row={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
      )}
    </div>
  );
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
