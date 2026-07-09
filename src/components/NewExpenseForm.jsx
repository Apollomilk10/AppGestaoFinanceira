import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { postGasto } from '../services/appsScript';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useCategories } from '../context/CategoriesContext';
import { useAuth } from '../context/AuthContext';
import { useMembros } from '../hooks/useMembros';
import { sugerirCategoria } from '../utils/autoCategorize';
import CategoryPicker from './CategoryPicker';
import SubcategoryPicker from './SubcategoryPicker';

function estadoInicial(orcamentos, filtroId, nome) {
  return {
    tipo: 'despesa',
    valor: '',
    categoria: 'obra_reforma',
    descricao: '',
    etapa: 'nao_especificada',
    responsavel: nome || '',
    orcamentoId: filtroId || orcamentos[0]?.id || '',
    sugestaoAplicada: false,
  };
}

export default function NewExpenseForm({ onSaved }) {
  const { orcamentos, filtroId } = useOrcamentos();
  const { nome } = useAuth();
  const { subcategoryOptions } = useCategories();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => estadoInicial(orcamentos, filtroId, nome));
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const [errorMessage, setErrorMessage] = useState('');
  const { membros } = useMembros(form.orcamentoId);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCategoriaChange(categoria) {
    const options = subcategoryOptions(categoria);
    setForm((prev) => ({ ...prev, categoria, etapa: options[0]?.value || '' }));
  }

  function handleDescricaoChange(descricao) {
    setForm((prev) => {
      // só sugere automaticamente se a pessoa ainda não mexeu na categoria
      if (prev.sugestaoAplicada || prev.tipo === 'receita') {
        return { ...prev, descricao };
      }
      const sugestao = sugerirCategoria(descricao);
      if (!sugestao) return { ...prev, descricao };
      return { ...prev, descricao, categoria: sugestao.categoria, etapa: sugestao.etapa };
    });
  }

  function handleOpen() {
    setForm(estadoInicial(orcamentos, filtroId, nome));
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.valor || Number(form.valor) <= 0) return;
    if (!form.orcamentoId) {
      setErrorMessage('Escolha em qual orçamento salvar.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    try {
      await postGasto(
        {
          data: new Date().toLocaleDateString('pt-BR'),
          categoria: form.categoria,
          descricao: form.descricao,
          valor: Number(form.valor),
          responsavel: form.responsavel,
          etapa: form.etapa,
          tipo: form.tipo,
        },
        { orcamentoId: form.orcamentoId }
      );
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
      <button className="fab" onClick={handleOpen} aria-label="Novo lançamento">
        <span className="fab__icon">+</span>
        <span>Novo lançamento</span>
      </button>
    );
  }

  return (
    <div className="sheet-backdrop" onClick={() => setOpen(false)}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="sheet__header">
          <h2>Novo lançamento</h2>
          <button type="button" className="link-button mono" onClick={() => setOpen(false)}>
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

        {orcamentos.length > 1 && (
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
        )}

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
            onChange={(e) => handleDescricaoChange(e.target.value)}
            placeholder="ex: cimento, 5 sacos"
          />
        </label>

        {form.tipo === 'despesa' && (
          <div className="field-row">
            <label className="field">
              <span>Categoria</span>
              <CategoryPicker
                value={form.categoria}
                onChange={(v) => {
                  update('sugestaoAplicada', true);
                  handleCategoriaChange(v);
                }}
              />
            </label>

            <label className="field">
              <span>Subcategoria</span>
              <SubcategoryPicker categoria={form.categoria} value={form.etapa} onChange={(v) => update('etapa', v)} />
            </label>
          </div>
        )}

        <label className="field">
          <span>Quem</span>
          <select value={form.responsavel} onChange={(e) => update('responsavel', e.target.value)}>
            {membros.length === 0 && nome && <option value={nome}>{nome}</option>}
            {membros.map((m) => (
              <option key={m.uid} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>

        {status === 'error' && (
          <p className="field-error">{errorMessage || 'Não foi possível salvar. Tente novamente.'}</p>
        )}

        <button type="submit" className="primary-button primary-button--full" disabled={status === 'saving'}>
          {status === 'saving' ? 'salvando…' : 'salvar'}
        </button>
      </form>
    </div>
  );
}
