import { useEffect, useMemo, useState } from 'react';
import { useOrcamentos } from '../context/OrcamentosContext';
import { useAuth } from '../context/AuthContext';
import { fetchRecorrentes } from '../services/recorrentes';
import { fetchMembros } from '../services/orcamentos';
import { gerarPrevistos } from '../utils/projecao';

/**
 * Lançamentos previstos dos próximos `meses` meses para os orçamentos que
 * estão na tela (o selecionado, ou todos no "Meu espaço"). Só busca quando
 * `ativo` — a previsão é opcional nos Relatórios.
 */
export function useProjecao(ativo, meses = 12) {
  const { orcamentos, filtroId, isMeuEspaco } = useOrcamentos();
  const { uid } = useAuth();
  const [dados, setDados] = useState({ recorrentes: [], membros: {} });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const escopo = isMeuEspaco ? orcamentos : orcamentos.filter((o) => o.id === filtroId);
  const ids = escopo.map((o) => o.id).join(',');

  useEffect(() => {
    if (!ativo || !ids) return undefined;
    let vivo = true;
    setCarregando(true);
    setErro('');
    const lista = ids.split(',');
    Promise.all(
      lista.map(async (id) => {
        const [rec, mem] = await Promise.all([fetchRecorrentes(id), fetchMembros(id).catch(() => [])]);
        return { id, rec: rec.map((r) => ({ ...r, orcamentoId: id })), mem };
      })
    )
      .then((res) => {
        if (!vivo) return;
        setDados({
          recorrentes: res.flatMap((r) => r.rec),
          membros: Object.fromEntries(res.map((r) => [r.id, r.mem])),
        });
      })
      .catch((e) => vivo && setErro(e.message || 'Não foi possível carregar a previsão.'))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [ativo, ids]);

  const previstos = useMemo(
    () => {
      if (!ativo) return [];
      const todos = gerarPrevistos(dados.recorrentes, dados.membros, meses);
      // No "Meu espaço", só a minha parte do que vai cair.
      return isMeuEspaco ? todos.filter((r) => r.responsavel === uid) : todos;
    },
    [ativo, dados, meses, isMeuEspaco, uid]
  );

  return { previstos, carregando, erro };
}
