import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchOrcamentos,
  criarOrcamento as criarOrcamentoApi,
  entrarOrcamento as entrarOrcamentoApi,
} from '../services/orcamentos';
import { useAuth } from './AuthContext';

const OrcamentosContext = createContext(null);
const ACTIVE_KEY = 'obra-orcamento-ativo';

export function OrcamentosProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [orcamentos, setOrcamentos] = useState([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(ACTIVE_KEY) || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!isAuthenticated) return;
    setError('');
    try {
      const rows = await fetchOrcamentos();
      setOrcamentos(rows);
      setLoading(false);
      setActiveId((current) => {
        const aindaExiste = rows.some((o) => o.id === current);
        if (aindaExiste) return current;
        const novo = rows[0]?.id || '';
        if (novo) localStorage.setItem(ACTIVE_KEY, novo);
        return novo;
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    reload();
  }, [reload]);

  function switchOrcamento(id) {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }

  async function criarOrcamento(nome) {
    const result = await criarOrcamentoApi(nome);
    await reload();
    switchOrcamento(result.orcamentoId);
    return result;
  }

  async function entrarOrcamento(codigo) {
    const result = await entrarOrcamentoApi(codigo);
    await reload();
    switchOrcamento(result.orcamentoId);
    return result;
  }

  const active = orcamentos.find((o) => o.id === activeId) || null;

  const value = {
    orcamentos,
    activeId,
    active,
    loading,
    error,
    reload,
    switchOrcamento,
    criarOrcamento,
    entrarOrcamento,
  };

  return <OrcamentosContext.Provider value={value}>{children}</OrcamentosContext.Provider>;
}

export function useOrcamentos() {
  const ctx = useContext(OrcamentosContext);
  if (!ctx) throw new Error('useOrcamentos precisa estar dentro de OrcamentosProvider');
  return ctx;
}
