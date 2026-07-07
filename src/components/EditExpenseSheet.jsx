import { useState } from 'react';
import { updateGasto } from '../services/appsScript';
import { useCategories } from '../context/CategoriesContext';
import CategoryPicker from './CategoryPicker';
import SubcategoryPicker from './SubcategoryPicker';

export default function EditExpenseSheet({ row, onClose, onSaved }) {
  const { subcategoryOptions } = useCategories();
  const [form, setForm] = useState({
    valor: row.valor,
    descricao: row.descricao,
    categoria: row.categoria,
    etapa: row.etapa,
    responsavel: row.responsavel,
    data: row.data ? row.data.toLocaleDateString('pt-BR') : '',
  });
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

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
      await updateGasto(row.rowNumber, {
        ...form,
        valor: Number(form.valor),
      });
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
          <h2>Editar gasto</h2>
          <button type="button" className="link-button mono" onClick={onClose}>
            fechar
          </button>
        </div>

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
          <span>Quem registrou</span>
          <input
            type="text"
            value={form.responsavel}
            onChange={(e) => update('responsavel', e.target.value)}
          />
        </label>

        {status === 'error' && <p className="field-error">{errorMessage}</p>}

        <button type="submit" className="primary-button primary-button--full" disabled={status === 'saving'}>
          {status === 'saving' ? 'salvando…' : 'salvar alterações'}
        </button>
      </form>
    </div>
  );
}
