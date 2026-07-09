import { useState, useEffect } from 'react';
import { Trash2, Tags } from 'lucide-react';
import { useCategories } from '../context/CategoriesContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import { deleteCategoria } from '../services/appsScript';
import { fetchCustomCategories } from '../services/categoriesSheet';

export default function ManageCategoriesModal({ onClose }) {
  const { reload: reloadCategorias } = useCategories();
  const { orcamentos } = useOrcamentos();
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function carregar() {
    setLoading(true);
    try {
      const listas = await Promise.all(
        orcamentos.map(async (o) => {
          const rows = await fetchCustomCategories({ orcamentoId: o.id });
          return rows.map((r) => ({ ...r, orcamentoId: o.id, orcamentoNome: o.nome }));
        })
      );
      setLinhas(listas.flat().filter((l) => l.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExcluir(linha) {
    try {
      await deleteCategoria(linha.orcamentoId, linha.id);
      await reloadCategorias();
      carregar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2>Categorias customizadas</h2>
          <button type="button" className="link-button mono" onClick={onClose}>fechar</button>
        </div>

        <p className="text-muted" style={{ fontSize: 12, marginTop: -8 }}>
          As categorias padrão não podem ser excluídas — só as que foram criadas por vocês.
        </p>

        {error && <p className="field-error">{error}</p>}

        {!loading && linhas.length === 0 && (
          <p className="text-muted" style={{ fontSize: 13 }}>Nenhuma categoria customizada ainda.</p>
        )}

        <div className="recorrentes-list">
          {linhas.map((l) => (
            <div key={l.id} className="recorrentes-list__row">
              <span className="recorrentes-list__icon"><Tags size={14} /></span>
              <div className="recorrentes-list__main">
                <span className="recorrentes-list__desc">
                  {l.categoriaLabel}{l.subcategoriaLabel ? ` › ${l.subcategoriaLabel}` : ''}
                </span>
                {orcamentos.length > 1 && (
                  <span className="text-muted" style={{ fontSize: 11 }}>{l.orcamentoNome}</span>
                )}
              </div>
              <button className="icon-button icon-button--danger" onClick={() => handleExcluir(l)}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
