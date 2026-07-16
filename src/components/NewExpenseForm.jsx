import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { postGasto } from '../services/appsScript';
import { criarRecorrente } from '../services/recorrentes';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useCategories } from '../context/CategoriesContext';
import { useAuth } from '../context/AuthContext';
import { useMembros } from '../hooks/useMembros';
import { sugerirCategoria } from '../utils/autoCategorize';
import CategoryPicker from './CategoryPicker';
import SubcategoryPicker from './SubcategoryPicker';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoParaBR(iso) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function estadoInicial(orcamentos, filtroId, uid) {
  return {
    tipo: 'despesa',
    valor: '',
    categoria: 'obra_reforma',
    descricao: '',
    etapa: 'nao_especificada',
    responsavel: uid || '',
    orcamentoId: filtroId || orcamentos.find((o) => o.pessoal)?.id || orcamentos[0]?.id || '',
    sugestaoAplicada: false,
    data: hojeISO(),
    frequencia: 'unica', // unica | recorrente | parcelado
    parcelas: '',
    statusLancamento: 'confirmado', // confirmado | projetado
  };
}

export default function NewExpenseForm({ onSaved, onSavedRow }) {
  const { orcamentos, filtroId } = useOrcamentos();
  const { nome, uid } = useAuth();
  const { subcategoryOptions } = useCategories();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => estadoInicial(orcamentos, filtroId, uid));
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
      if (prev.sugestaoAplicada || prev.tipo === 'receita') {
        return { ...prev, descricao };
      }
      const sugestao = sugerirCategoria(descricao);
      if (!sugestao) return { ...prev, descricao };
      return { ...prev, descricao, categoria: sugestao.categoria, etapa: sugestao.etapa };
    });
  }

  function handleOpen() {
    setForm(estadoInicial(orcamentos, filtroId, uid));
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
      if (form.frequencia === 'recorrente' || form.frequencia === 'parcelado') {
        if (form.frequencia === 'parcelado' && (!form.parcelas || Number(form.parcelas) < 2)) {
          setErrorMessage('Informe a quantidade de parcelas (mínimo 2).');
          setStatus('error');
          return;
        }
        const diaDoMes = Number(form.data.split('-')[2]);
        await criarRecorrente(form.orcamentoId, {
          descricao: form.descricao,
          valor: Number(form.valor),
          categoria: form.categoria,
          etapa: form.etapa,
          tipo: form.tipo,
          diaDoMes: Math.min(diaDoMes, 28),
          parcelas: form.frequencia === 'parcelado' ? Number(form.parcelas) : null,
        });
        onSaved?.();
      } else {
        const resultado = await postGasto(
          {
            data: isoParaBR(form.data),
            categoria: form.categoria,
            descricao: form.descricao,
            valor: Number(form.valor),
            responsavel: form.responsavel,
            etapa: form.etapa,
            tipo: form.tipo,
            status: form.statusLancamento,
          },
          { orcamentoId: form.orcamentoId }
        );

        const orcamentoEscolhido = orcamentos.find((o) => o.id === form.orcamentoId);
        onSavedRow?.({
          id: resultado.id,
          rowNumber: resultado.id,
          orcamentoId: form.orcamentoId,
          orcamentoNome: orcamentoEscolhido?.nome || '',
          data: new Date(`${form.data}T00:00:00`),
          categoria: form.categoria,
          descricao: form.descricao,
          valor: Number(form.valor),
          responsavel: form.responsavel,
          responsavelNome: resultado.responsavelNome || form.responsavel,
          etapa: form.etapa,
          tipo: form.tipo,
          status: form.statusLancamento,
        });
      }
      setOpen(false);
      setStatus('idle');
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

        <label className="field">
          <span>Salvar no orçamento</span>
          <select value={form.orcamentoId} onChange={(e) => update('orcamentoId', e.target.value)}>
            {orcamentos.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>

        <div className="field-row">
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
            <span>Data</span>
            <input type="date" value={form.data} onChange={(e) => update('data', e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Descrição</span>
          <input
            type="text"
            value={form.descricao}
            onChange={(e) => handleDescricaoChange(e.target.value)}
            placeholder="ex: cimento, 5 sacos"
          />
        </label>

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

        <label className="field">
          <span>Quem</span>
          <select value={form.responsavel} onChange={(e) => update('responsavel', e.target.value)}>
            {membros.length === 0 && uid && <option value={uid}>{nome}</option>}
            {membros.map((m) => (
              <option key={m.uid} value={m.uid}>
                {m.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Repetição</span>
          <div className="mode-toggle mode-toggle--small">
            <button
              type="button"
              className={form.frequencia === 'unica' ? 'mode-toggle__active' : ''}
              onClick={() => update('frequencia', 'unica')}
            >
              Única
            </button>
            <button
              type="button"
              className={form.frequencia === 'recorrente' ? 'mode-toggle__active' : ''}
              onClick={() => update('frequencia', 'recorrente')}
            >
              Recorrente fixa
            </button>
            <button
              type="button"
              className={form.frequencia === 'parcelado' ? 'mode-toggle__active' : ''}
              onClick={() => update('frequencia', 'parcelado')}
            >
              Parcelado
            </button>
          </div>
        </label>

        {form.frequencia === 'unica' && (
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
        )}

        {form.frequencia === 'parcelado' && (
          <label className="field">
            <span>Quantidade de parcelas</span>
            <input
              type="number"
              min="2"
              max="60"
              value={form.parcelas}
              onChange={(e) => update('parcelas', e.target.value)}
              placeholder="ex: 12"
            />
          </label>
        )}

        {form.frequencia === 'recorrente' && (
          <p className="text-muted" style={{ fontSize: 12 }}>
            Vai se repetir todo dia {form.data.split('-')[2]} de cada mês, sem data pra acabar.
          </p>
        )}

        {form.frequencia === 'parcelado' && form.parcelas && (
          <p className="text-muted" style={{ fontSize: 12 }}>
            Vai se repetir todo dia {form.data.split('-')[2]} de cada mês, por {form.parcelas}x, e parar sozinho.
          </p>
        )}

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
