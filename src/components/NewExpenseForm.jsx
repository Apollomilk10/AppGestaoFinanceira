import { useState } from 'react';
import { postGasto } from '../services/appsScript';
import { useCategories } from '../context/CategoriesContext';
import CategoryPicker from './CategoryPicker';
import SubcategoryPicker from './SubcategoryPicker';

const initialState = {
  valor: '',
  categoria: 'obra_reforma',
  descricao: '',
  etapa: 'nao_especificada',
  responsavel: '',
};

export default function NewExpenseForm({ onSaved }) {
  const { subcategoryOptions } = useCategories();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [errorMessage, setErrorMessage] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCategoriaChange(categoria) {
    const options = subcategoryOptions(categoria);
    setForm((prev) => ({ ...prev, categoria, etapa: options[0]?.value || '' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.valor || Number(form.valor) <= 0) return;

    setStatus('saving');
    try {
      await postGasto({
        data: new Date().toLocaleDateString('pt-BR'),
        categoria: form.categoria,
        descricao: form.descricao,
        valor: Number(form.valor),
        responsavel: form.responsavel,
        etapa: form.etapa,
      });
      setForm(initialState);
      setOpen(false);
      setStatus('idle');
      onSaved?.();
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Erro desconhecido.');
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <button className="fab" onClick={() => setOpen(true)} aria-label="Novo gasto">
        <span className="fab__icon">+</span>
        <span>Novo gasto</span>
      </button>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="sheet__header">
          <h2>Novo gasto</h2>
          <button type="button" className="link-button mono" onClick={() => setOpen(false)}>
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
              autoFocus
              value={form.valor}
              onChange={(e) => update('valor', e.target.value)}
              placeholder="0,00"
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
            placeholder="ex: cimento, 5 sacos"
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
            placeholder="seu nome"
          />
        </label>

        {status === 'error' && (
          <p className="field-error">{errorMessage || 'Não foi possível salvar. Tente novamente.'}</p>
        )}

        <button type="submit" className="primary-button primary-button--full" disabled={status === 'saving'}>
          {status === 'saving' ? 'salvando…' : 'salvar gasto'}
        </button>
      </form>
    </div>
  );
}
