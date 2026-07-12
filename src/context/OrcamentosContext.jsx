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
  const [filtroId, setFiltroId] = useState(() => localStorage.getItem(FILTRO_KEY) || '');

  const pessoal = orcamentos.find((o) => o.pessoal) || null;

  const reload = useCallback(async () => {
    if (!isAuthenticated) return;
    setError('');
    try {
      const rows = await fetchOrcamentos();
      setOrcamentos(rows);
      setLoading(false);
      setFiltroId((current) => {
        // se ainda não tem filtro escolhido, ou o que tinha sumiu, cai
        // sempre no orçamento pessoal ("Meu espaço") — é o único fixo
        const aindaExiste = rows.some((o) => o.id === current);
        if (aindaExiste) return current;
        return rows.find((o) => o.pessoal)?.id || rows[0]?.id || '';
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
    if (filtroId === orcamentoId) setFiltro(pessoal?.id || '');
    await reload();
  }

  const filtro = orcamentos.find((o) => o.id === filtroId) || null;
  // "Meu Espaço" é sempre o orçamento pessoal — quando ele está selecionado,
  // a visão é agregada (soma de tudo); qualquer outro orçamento mostra só
  // os próprios dados.
  const isMeuEspaco = !!filtro?.pessoal;

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
    isMeuEspaco,
    pessoal,
    setFiltro,
  };

  return <OrcamentosContext.Provider value={value}>{children}</OrcamentosContext.Provider>;
}

export function useOrcamentos() {
  const ctx = useContext(OrcamentosContext);
  if (!ctx) throw new Error('useOrcamentos precisa estar dentro de OrcamentosProvider');
  return ctx;
}
