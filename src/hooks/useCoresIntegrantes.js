import { useEffect, useState } from 'react';
import { fetchMembros } from '../services/orcamentos';
import { useOrcamentos } from '../context/OrcamentosContext';

/** Paleta oferecida na escolha de cor e usada para quem ainda não escolheu. */
export const PALETA_INTEGRANTES = [
  '#2fae82', '#f0a63a', '#5b8def', '#c06bd9',
  '#e0574f', '#14b8a6', '#ec4899', '#84cc16',
];

/** Evento disparado quando alguém troca uma cor — os gráficos recarregam. */
export const EVENTO_CORES = 'casa:cores-integrantes';

/**
 * Mapa nome do integrante -> cor, para os orçamentos visíveis agora
 * (o selecionado, ou todos em "Meu espaço"). Use `corDe(nome, i)`: devolve a
 * cor escolhida ou, se a pessoa não escolheu, uma da paleta pela posição.
 */
export function useCoresIntegrantes() {
  const { orcamentos, filtroId, isMeuEspaco } = useOrcamentos();
  const [cores, setCores] = useState({});
  const [nomes, setNomes] = useState([]);
  const [versao, setVersao] = useState(0);

  const visiveis = isMeuEspaco ? orcamentos : orcamentos.filter((o) => o.id === filtroId);
  const chave = visiveis.map((o) => o.id).join(',');

  useEffect(() => {
    const recarregar = () => setVersao((v) => v + 1);
    window.addEventListener(EVENTO_CORES, recarregar);
    return () => window.removeEventListener(EVENTO_CORES, recarregar);
  }, []);

  useEffect(() => {
    if (!visiveis.length) return;
    let ativo = true;
    Promise.all(visiveis.map((o) => fetchMembros(o.id).catch(() => [])))
      .then((listas) => {
        if (!ativo) return;
        const mapa = {};
        const todos = new Set();
        listas.flat().forEach((m) => {
          if (m.nome) todos.add(m.nome);
          if (m.cor && m.nome && !mapa[m.nome]) mapa[m.nome] = m.cor;
        });
        setCores(mapa);
        setNomes(Array.from(todos).sort((a, b) => a.localeCompare(b)));
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, versao]);

  function corDe(nome, i = 0) {
    if (cores[nome]) return cores[nome];
    // quem não escolheu pega a próxima cor da paleta que ninguém está usando
    const usadas = new Set(Object.values(cores));
    const livres = PALETA_INTEGRANTES.filter((c) => !usadas.has(c));
    const lista = livres.length ? livres : PALETA_INTEGRANTES;
    // posição estável (ordem alfabética dos integrantes sem cor), para a
    // mesma pessoa ter a mesma cor em todas as telas
    const semCor = nomes.filter((n) => !cores[n]);
    const pos = semCor.indexOf(nome);
    return lista[(pos >= 0 ? pos : semCor.length + i) % lista.length];
  }

  return { cores, corDe };
}
