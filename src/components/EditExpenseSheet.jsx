import { useState } from 'react';
import { updateGasto } from '../services/appsScript';

const CATEGORIAS = [
  { value: 'material', label: 'Material' },
  { value: 'mao_de_obra', label: 'Mão de obra' },
  { value: 'imprevisto', label: 'Imprevisto' },
  { value: 'outro', label: 'Outro' },
];

const ETAPAS = [
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'hidraulica', label: 'Hidráulica' },
  { value: 'alvenaria', label: 'Alvenaria' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'nao_especificada', label: 'Não especificada' },
];

export default function EditExpenseSheet({ row, onClose, onSaved }) {
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
            <select value={form.categoria} onChange={(e) => update('categoria', e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Etapa</span>
            <select value={form.etapa} onChange={(e) => update('etapa', e.target.value)}>
              {ETAPAS.map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
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
