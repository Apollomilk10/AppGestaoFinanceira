import { useEffect, useState } from 'react';
import { Repeat, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { fetchRecorrentes, criarRecorrente, excluirRecorrente } from '../services/recorrentes';
import { useCategories } from '../context/CategoriesContext';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function diasParaVencer(diaDoMes) {
  const hoje = new Date();
  let venc = new Date(hoje.getFullYear(), hoje.getMonth(), diaDoMes);
  if (venc < hoje) venc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, diaDoMes);
  return Math.ceil((venc - hoje) / (1000 * 60 * 60 * 24));
}

export default function RecorrentesModal({ orcamentoId, onClose }) {
  const { categoryOptions } = useCategories();
  const [recorrentes, setRecorrentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState({ descricao: '', valor: '', categoria: 'moradia', diaDoMes: '5', tipo: 'despesa', parcelas: '' });
  const [error, setError] = useState('');

  async function carregar() {
    setLoading(true);
    try {
      const rows = await fetchRecorrentes(orcamentoId);
      setRecorrentes(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId]);

  async function handleCriar(e) {
    e.preventDefault();
    if (!form.descricao.trim() || !form.valor) return;
    setError('');
    try {
      await criarRecorrente(orcamentoId, {
        descricao: form.descricao.trim(),
        valor: Number(form.valor),
        categoria: form.categoria,
        etapa: 'nao_especificada',
        tipo: form.tipo,
        diaDoMes: Number(form.diaDoMes),
        parcelas: form.parcelas ? Number(form.parcelas) : null,
      });
      setForm({ descricao: '', valor: '', categoria: 'moradia', diaDoMes: '5', tipo: 'despesa', parcelas: '' });
      setCriando(false);
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExcluir(id) {
    try {
      await excluirRecorrente(orcamentoId, id);
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  const proximosVencimentos = recorrentes
    .filter((r) => r.ativo && r.tipo === 'despesa')
    .map((r) => ({ ...r, dias: diasParaVencer(r.diaDoMes) }))
    .filter((r) => r.dias <= 7)
    .sort((a, b) => a.dias - b.dias);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2>Contas recorrentes</h2>
          <button type="button" className="link-button mono" onClick={onClose}>fechar</button>
        </div>

        {proximosVencimentos.length > 0 && (
          <div className="alerta-vencimento">
            <AlertTriangle size={14} />
            <div>
              {proximosVencimentos.map((r) => (
                <div key={r.id} className="alerta-vencimento__item">
                  <strong>{r.descricao}</strong> vence {r.dias === 0 ? 'hoje' : `em ${r.dias} dia${r.dias > 1 ? 's' : ''}`}
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        {!criando && (
          <button className="sidebar__action" onClick={() => setCriando(true)} style={{ padding: '10px 0' }}>
            <Plus size={16} />
            <span>Nova conta recorrente</span>
          </button>
        )}

        {criando && (
          <form className="inline-add inline-add--stack" onSubmit={handleCriar}>
            <input
              type="text"
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
              placeholder="ex: Aluguel"
              autoFocus
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm((p) => ({ ...p, valor: e.target.value }))}
              placeholder="Valor (R$)"
            />
            <div className="field-row">
              <select value={form.categoria} onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}>
                {categoryOptions().map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                max="28"
                value={form.diaDoMes}
                onChange={(e) => setForm((p) => ({ ...p, diaDoMes: e.target.value }))}
                placeholder="Dia do mês"
              />
            </div>
            <input
              type="number"
              min="2"
              max="60"
              value={form.parcelas}
              onChange={(e) => setForm((p) => ({ ...p, parcelas: e.target.value }))}
              placeholder="Parcelas (deixe vazio pra recorrente fixa, sem fim)"
            />
            <div className="sidebar__form-actions">
              <button type="submit" className="primary-button">criar</button>
              <button type="button" className="link-button" onClick={() => setCriando(false)}>cancelar</button>
            </div>
          </form>
        )}

        {!loading && recorrentes.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13 }}>Nenhuma conta recorrente ainda.</p>
        )}

        <div className="recorrentes-list">
          {recorrentes.map((r) => (
            <div key={r.id} className="recorrentes-list__row">
              <span className="recorrentes-list__icon"><Repeat size={14} /></span>
              <div className="recorrentes-list__main">
                <span className="recorrentes-list__desc">{r.descricao}</span>
                <span className="text-muted" style={{ fontSize: 11.5 }}>
                  todo dia {r.diaDoMes} · {r.parcelas ? `parcela ${Math.min(r.vezesGeradas + 1, r.parcelas)}/${r.parcelas}` : 'recorrente fixa'}
                  {!r.ativo && r.parcelas ? ' · concluída' : ''}
                </span>
              </div>
              <span className={`mono ${r.tipo === 'receita' ? 'text-good' : ''}`}>{formatBRL(r.valor)}</span>
              <button className="icon-button icon-button--danger" onClick={() => handleExcluir(r.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
