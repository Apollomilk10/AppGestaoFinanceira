import { useEffect, useState } from 'react';
import { fetchMembros } from '../services/orcamentos';

export function useMembros(orcamentoId) {
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orcamentoId) {
      setMembros([]);
      return;
    }
    setLoading(true);
    fetchMembros(orcamentoId)
      .then(setMembros)
      .catch((err) => {
        console.error('Falha ao carregar integrantes:', err);
        setMembros([]);
      })
      .finally(() => setLoading(false));
  }, [orcamentoId]);

  return { membros, loading };
}
