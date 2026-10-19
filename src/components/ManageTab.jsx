import { Fragment, useState } from 'react';
import { Pencil, Trash2, Repeat } from 'lucide-react';
import TagIcon from './TagIcon';
import EditExpenseSheet from './EditExpenseSheet';
import LimitesPanel from './LimitesPanel';
import RecorrentesModal from './RecorrentesModal';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useCategories } from '../context/CategoriesContext';
import { deleteGasto } from '../services/appsScript';

export default function ManageTab({ rows, onChanged, onDeleted }) {
  const { getCategoryMeta, getSubcategoryMeta } = useCategories();
  const { filtroId } = useOrcamentos();
  const [vendoRecorrentes, setVendoRecorrentes] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const ordenadas = [...rows].sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0));

  // Marcações de mês e de dia na lista, com o total de cada mês.
  const chaveMes = (d) => (d ? `${d.getFullYear()}-${d.getMonth()}` : 'sem-data');
  const chaveDia = (d) => (d ? d.toDateString() : 'sem-data');
  const totaisMes = new Map();
  ordenadas.forEach((r) => {
    if (r.status === 'projetado') return;
    const k = chaveMes(r.data);
    const t = totaisMes.get(k) || { entradas: 0, saidas: 0 };
    if (r.tipo === 'receita') t.entradas += r.valor;
    else t.saidas += r.valor;
    totaisMes.set(k, t);
  });
  const anoAtual = new Date().getFullYear();
  function rotuloMes(d) {
    if (!d) return 'Sem data';
    const nome = d.toLocaleDateString('pt-BR', { month: 'long' });
    return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${d.getFullYear()}`;
  }
  function rotuloDia(d) {
    if (!d) return '';
    const hoje = new Date();
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    const txt = d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      ...(d.getFullYear() !== anoAtual ? { year: 'numeric' } : {}),
    });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  async function handleDelete(row, escopo = 'este') {
    setDeleting(true);
    setError('');
    try {
      const resultado = await deleteGasto(row.rowNumber, { orcamentoId: row.orcamentoId }, escopo);
      setConfirmingId(null);
      // Remove da tela na hora: recarregar do servidor logo após a exclusão
      // podia trazer o lançamento de volta por um instante.
      onDeleted?.(resultado?.excluidos?.length ? resultado.excluidos : [row.id]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Não foi possível excluir.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="tab-content">
      {filtroId && (
        <>
          <LimitesPanel orcamentoId={filtroId} rows={rows} />
          <section className="secao">
            <button className="linha linha--clicavel" onClick={() => setVendoRecorrentes(true)}>
              <Repeat size={17} className="text-muted" />
              <div className="linha__corpo">
                <span className="linha__nome">Contas fixas e vencimentos</span>
                <span className="linha__sub">ver, criar e acompanhar parcelas</span>
              </div>
            </button>
          </section>
        </>
      )}

      <div className="panel">
        <h2 className="panel__title">Todos os lançamentos ({rows.length})</h2>

        {ordenadas.length === 0 && (
          <p className="text-muted" style={{ padding: '20px 0', textAlign: 'center' }}>
            Nenhum lançamento ainda.
          </p>
        )}

        {ordenadas.map((row, i) => {
          const anterior = ordenadas[i - 1];
          const novoMes = !anterior || chaveMes(anterior.data) !== chaveMes(row.data);
          const novoDia = novoMes || chaveDia(anterior.data) !== chaveDia(row.data);
          const totalMes = totaisMes.get(chaveMes(row.data)) || { entradas: 0, saidas: 0 };
          const catMeta = getCategoryMeta(row.categoria);
          const subMeta = getSubcategoryMeta(row.categoria, row.etapa);
          const isConfirming = confirmingId === row.id;

          return (
            <Fragment key={row.id}>
              {novoMes && (
                <div className="lista-mes">
                  <span className="lista-mes__nome">{rotuloMes(row.data)}</span>
                  <span className="lista-mes__totais">
                    <span className="text-good">+{formatBRL(totalMes.entradas)}</span>
                    <span className="text-danger">−{formatBRL(totalMes.saidas)}</span>
                  </span>
                </div>
              )}
              {novoDia && row.data && <div className="lista-dia">{rotuloDia(row.data)}</div>}
            <div className="manage-row">
              <TagIcon meta={catMeta} />
              <div className="manage-row__main">
                <span className="manage-row__desc">{row.descricao || catMeta.label}</span>
                <span className="manage-row__meta text-muted">
                  {catMeta.label} · {subMeta.label}
                  {row.responsavelNome ? ` · ${row.responsavelNome}` : ''}
                </span>
              </div>
              <span className={`manage-row__valor mono ${row.tipo === 'receita' ? 'text-good' : 'text-danger'}`}>
                {row.tipo === 'receita' ? '+' : '-'}{formatBRL(row.valor)}
              </span>

              {isConfirming ? (
                <div className="confirmar-exclusao">
                  <span className="confirmar-exclusao__pergunta">
                    {row.recorrenteId
                      ? 'Este lançamento se repete. O que excluir?'
                      : 'Excluir este lançamento?'}
                  </span>
                  <div className="confirmar-exclusao__botoes">
                    {row.recorrenteId ? (
                      <>
                        <button
                          type="button"
                          className="confirmar-exclusao__perigo"
                          disabled={deleting}
                          onClick={() => handleDelete(row, 'futuros')}
                        >
                          {deleting ? 'excluindo…' : 'Este e os próximos'}
                        </button>
                        <button
                          type="button"
                          className="confirmar-exclusao__neutro"
                          disabled={deleting}
                          onClick={() => handleDelete(row, 'este')}
                        >
                          Só este
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="confirmar-exclusao__perigo"
                        disabled={deleting}
                        onClick={() => handleDelete(row, 'este')}
                      >
                        {deleting ? 'excluindo…' : 'Excluir'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="confirmar-exclusao__neutro"
                      disabled={deleting}
                      onClick={() => {
                        setConfirmingId(null);
                        setError('');
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                  {error && <p className="field-error">{error}</p>}
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
            </Fragment>
          );
        })}
      </div>

      {editing && (
        <EditExpenseSheet row={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
      )}

      {vendoRecorrentes && filtroId && (
        <RecorrentesModal orcamentoId={filtroId} onClose={() => setVendoRecorrentes(false)} />
      )}
    </div>
  );
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
