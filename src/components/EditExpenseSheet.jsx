import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { updateGasto } from '../services/appsScript';
import { useCategories } from '../context/CategoriesContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useMembros } from '../hooks/useMembros';
import CategoryPicker from './CategoryPicker';
import SubcategoryPicker from './SubcategoryPicker';

function dataParaISO(data) {
  if (!data) return '';
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function isoParaBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function EditExpenseSheet({ row, onClose, onSaved }) {
  const { subcategoryOptions } = useCategories();
  const { orcamentos } = useOrcamentos();
  const [form, setForm] = useState({
    tipo: row.tipo || 'despesa',
    valor: row.valor,
    descricao: row.descricao,
    categoria: row.categoria,
    etapa: row.etapa,
    responsavel: row.responsavel,
    data: dataParaISO(row.data),
    orcamentoId: row.orcamentoId,
    statusLancamento: row.status || 'confirmado',
  });
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { membros } = useMembros(form.orcamentoId);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCategoriaChange(categoria) {
    const options = subcategoryOptions(categoria);
    const aindaValida = options.some((o) => o.value === form.etapa);
    setForm((prev) => ({ ...prev, categoria, etapa: aindaValida ? prev.etapa : options[0]?.value || '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.valor || Number(form.valor) <= 0) return;

    setStatus('saving');
    try {
      const mudouOrcamento = form.orcamentoId !== row.orcamentoId;
      await updateGasto(
        row.rowNumber,
        {
          data: isoParaBR(form.data),
          categoria: form.categoria,
          descricao: form.descricao,
          valor: Number(form.valor),
          responsavel: form.responsavel,
          etapa: form.etapa,
          tipo: form.tipo,
          status: form.statusLancamento,
          ...(mudouOrcamento ? { novoOrcamentoId: form.orcamentoId } : {}),
        },
        { orcamentoId: row.orcamentoId }
      );
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="sheet__header">
          <h2>Editar lançamento</h2>
          <button type="button" className="link-button mono" onClick={onClose}>
            fechar
          </button>
        </div>

        <div className="tipo-toggle">
          <button
            type="button"
            className={`tipo-toggle__option tipo-toggle__option--despesa ${form.tipo === 'despesa' ? 'tipo-toggle__option--active' : ''}`}
            onClick={() => update('tipo', 'despesa')}
          >
            <ArrowDownCircle size={15} />
            Despesa
          </button>
          <button
            type="button"
            className={`tipo-toggle__option tipo-toggle__option--receita ${form.tipo === 'receita' ? 'tipo-toggle__option--active' : ''}`}
            onClick={() => update('tipo', 'receita')}
          >
            <ArrowUpCircle size={15} />
            Receita
          </button>
        </div>

        <label className="field">
          <span>Orçamento</span>
          <select value={form.orcamentoId} onChange={(e) => update('orcamentoId', e.target.value)}>
            {orcamentos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Valor</span>
          <div className="field__prefix">
            <span className="mono">R$</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={(e) => update('valor', e.target.value)}
              required
            />
          </div>
        </label>

        <label className="field">
          <span>Data</span>
          <input type="date" value={form.data} onChange={(e) => update('data', e.target.value)} />
        </label>

        <label className="field">
          <span>Descrição</span>
          <input
            type="text"
            value={form.descricao}
            onChange={(e) => update('descricao', e.target.value)}
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Categoria</span>
            <CategoryPicker value={form.categoria} onChange={handleCategoriaChange} />
          </label>

          <label className="field">
            <span>Subcategoria</span>
            <SubcategoryPicker
              categoria={form.categoria}
              value={form.etapa}
              onChange={(v) => update('etapa', v)}
            />
          </label>
        </div>

        <label className="field">
          <span>Quem</span>
          <select value={form.responsavel} onChange={(e) => update('responsavel', e.target.value)}>
            {form.responsavel && !membros.some((m) => m.uid === form.responsavel) && (
              <option value={form.responsavel}>{row.responsavelNome || form.responsavel}</option>
            )}
            {membros.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Situação</span>
          <div className="mode-toggle mode-toggle--small">
            <button
              type="button"
              className={form.statusLancamento === 'confirmado' ? 'mode-toggle__active' : ''}
              onClick={() => update('statusLancamento', 'confirmado')}
            >
              Efetivada
            </button>
            <button
              type="button"
              className={form.statusLancamento === 'projetado' ? 'mode-toggle__active' : ''}
              onClick={() => update('statusLancamento', 'projetado')}
            >
              Lista de Desejo
            </button>
          </div>
        </label>

        {status === 'error' && <p className="field-error">{errorMessage}</p>}

        <button type="submit" className="primary-button primary-button--full" disabled={status === 'saving'}>
          {status === 'saving' ? 'salvando…' : 'salvar alterações'}
        </button>
      </form>
    </div>
  );
}
