import { useEffect, useMemo, useState } from 'react';
import { fetchLimites, definirLimite } from '../services/contas';
import { useCategories } from '../context/CategoriesContext';

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Limite mensal por categoria. Compara o gasto do mês corrente com o teto
 * definido e mostra o quanto ainda sobra — a barra fica vermelha quando
 * passa do limite.
 */
export default function LimitesPanel({ orcamentoId, rows }) {
  const { getCategoryMeta, categoryOptions } = useCategories();
  const [limites, setLimites] = useState([]);
  const [editando, setEditando] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');

  async function carregar() {
    if (!orcamentoId) return;
    try {
      setLimites(await fetchLimites(orcamentoId));
    } catch (e) {
      console.error('Limites:', e);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId]);

  const gastoPorCategoria = useMemo(() => {
    const agora = new Date();
    const mapa = new Map();
    rows
      .filter(
        (r) =>
          r.tipo !== 'receita' &&
          r.status !== 'projetado' &&
          r.data &&
          r.data.getMonth() === agora.getMonth() &&
          r.data.getFullYear() === agora.getFullYear()
      )
      .forEach((r) => mapa.set(r.categoria, (mapa.get(r.categoria) || 0) + r.valor));
    return mapa;
  }, [rows]);

  async function salvar(e) {
    e.preventDefault();
    if (!categoria || !valor) return;
    setErro('');
    try {
      await definirLimite(orcamentoId, categoria, Number(valor));
      setCategoria('');
      setValor('');
      setEditando(false);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function remover(chave) {
    try {
      await definirLimite(orcamentoId, chave, 0);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!orcamentoId) return null;

  return (
    <section className="secao">
      <h2 className="secao__titulo">
        Limites do mês
        {!editando && (
          <button className="secao__acao" onClick={() => setEditando(true)}>definir</button>
        )}
      </h2>

      {erro && <p className="field-error">{erro}</p>}

      {editando && (
        <form className="inline-add inline-add--stack" onSubmit={salvar}>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Escolha a categoria</option>
            {categoryOptions().map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="number" min="0" step="0.01" value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Teto mensal (R$)"
          />
          <div className="sidebar__form-actions">
            <button type="submit" className="primary-button">salvar</button>
            <button type="button" className="link-button" onClick={() => setEditando(false)}>cancelar</button>
          </div>
        </form>
      )}

      {limites.length === 0 && !editando && (
        <p className="text-muted" style={{ fontSize: 12.5 }}>
          Nenhum limite ainda. Defina um teto por categoria para receber um alerta ao se aproximar.
        </p>
      )}

      {limites.map((l) => {
        const meta = getCategoryMeta(l.categoriaChave);
        const gasto = gastoPorCategoria.get(l.categoriaChave) || 0;
        const pct = l.valorLimite > 0 ? (gasto / l.valorLimite) * 100 : 0;
        const estourou = gasto > l.valorLimite;
        const perto = !estourou && pct >= 80;

        return (
          <div key={l.id} className="linha">
            <div className="linha__corpo">
              <span className="linha__nome">{meta.label}</span>
              <div className="linha__barra">
                <div
                  className="linha__barra-fill"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: estourou ? 'var(--danger)' : perto ? 'var(--secondary, #c8815f)' : 'var(--accent)',
                  }}
                />
              </div>
              <span className="linha__sub">
                {estourou
                  ? `passou ${brl(gasto - l.valorLimite)} do limite`
                  : `sobra ${brl(l.valorLimite - gasto)} de ${brl(l.valorLimite)}`}
              </span>
            </div>
            <span className={`linha__valor ${estourou ? 'text-danger' : ''}`}>{brl(gasto)}</span>
            <button className="secao__acao" onClick={() => remover(l.categoriaChave)}>remover</button>
          </div>
        );
      })}
    </section>
  );
}
