import { useEffect, useState } from 'react';
import { fetchContas } from '../services/contas';

export function useContas(orcamentoId) {
  const [contas, setContas] = useState([]);

  useEffect(() => {
    if (!orcamentoId) return setContas([]);
    fetchContas(orcamentoId)
      .then(setContas)
      .catch((e) => {
        console.error('Contas:', e);
        setContas([]);
      });
  }, [orcamentoId]);

  return contas;
}
