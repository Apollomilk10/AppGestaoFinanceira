import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  fetchOrcamentos,
  criarOrcamento as criarOrcamentoApi,
  entrarOrcamento as entrarOrcamentoApi,
  excluirOrcamento as excluirOrcamentoApi,
} from '../services/orcamentos';
import { useAuth } from './AuthContext';

const OrcamentosContext = createContext(null);
const FILTRO_KEY = 'obra-filtro-orcamento';

export function OrcamentosProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // '' = "Meu espaço" (visão agregada de todos). Qualquer outro valor é o
  // id de um orçamento específico que a pessoa escolheu ver sozinho.
  const [filtroId, setFiltroId] = useState(() => localStorage.getItem(FILTRO_KEY) || '');

  const reload = useCallback(async () => {
    if (!isAuthenticated) return;
    setError('');
    try {
      const rows = await fetchOrcamentos();
      setOrcamentos(rows);
      setLoading(false);
      setFiltroId((current) => {
        if (current === '') return current; // "Meu espaço" é sempre válido
        const aindaExiste = rows.some((o) => o.id === current);
        return aindaExiste ? current : '';
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    reload();
  }, [reload]);

  function setFiltro(id) {
    setFiltroId(id);
    localStorage.setItem(FILTRO_KEY, id);
  }

  async function criarOrcamento(nome) {
    const result = await criarOrcamentoApi(nome);
    await reload();
    return result;
  }

  async function entrarOrcamento(codigo) {
    const result = await entrarOrcamentoApi(codigo);
    await reload();
    return result;
  }

  async function excluirOrcamento(orcamentoId) {
    await excluirOrcamentoApi(orcamentoId);
    if (filtroId === orcamentoId) setFiltro('');
    await reload();
  }

  const filtro = orcamentos.find((o) => o.id === filtroId) || null;

  const value = {
    orcamentos,
    loading,
    error,
    reload,
    criarOrcamento,
    entrarOrcamento,
    excluirOrcamento,
    filtroId,
    filtro,
    setFiltro,
  };

  return <OrcamentosContext.Provider value={value}>{children}</OrcamentosContext.Provider>;
}

export function useOrcamentos() {
  const ctx = useContext(OrcamentosContext);
  if (!ctx) throw new Error('useOrcamentos precisa estar dentro de OrcamentosProvider');
  return ctx;
}
