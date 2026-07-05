import { useState } from 'react';
import { postGasto } from '../services/appsScript';

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

const initialState = {
  valor: '',
  categoria: 'material',
  descricao: '',
  etapa: 'nao_especificada',
  responsavel: '',
};

export default function NewExpenseForm({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle'); // idle | saving | error

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
            placeholder="seu nome"
          />
        </label>

        {status === 'error' && (
          <p className="field-error">Não foi possível salvar. Tente novamente.</p>
        )}

        <button type="submit" className="primary-button primary-button--full" disabled={status === 'saving'}>
          {status === 'saving' ? 'salvando…' : 'salvar gasto'}
        </button>
      </form>
    </div>
  );
}
