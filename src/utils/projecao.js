/**
 * Previsão dos próximos meses a partir das contas recorrentes: fixas,
 * parceladas, parcelamentos e financiamentos (inclusive com as parcelas
 * exatas do banco). Gera "lançamentos previstos" no mesmo formato dos
 * reais, para os gráficos tratarem tudo igual. Cada previsto vai para
 * quem paga: o responsável do parcelamento, a divisão por percentual do
 * financiamento, ou quem criou a conta.
 */

/** Divide em centavos pelos percentuais; a sobra vai para a maior fatia. */
export function ratear(valor, percentuais) {
  const ativos = Object.entries(percentuais).filter(([, p]) => p > 0);
  if (!ativos.length) return [];
  const total = Math.round(valor * 100);
  const soma = ativos.reduce((s, [, p]) => s + p, 0);
  const partes = ativos.map(([u, p]) => [u, Math.floor((total * p) / soma)]);
  const resto = total - partes.reduce((s, [, c]) => s + c, 0);
  const maior = ativos.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  return partes.map(([u, c]) => [u, (c + (u === maior ? resto : 0)) / 100]).filter(([, v]) => v > 0);
}

const chave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * recorrentes: lista vinda da API, cada uma com `orcamentoId`.
 * membrosPorOrc: { [orcamentoId]: [{ uid, nome, percentual }] }.
 * meses: quantos meses à frente (o mês atual conta só se a conta ainda
 * não foi lançada nele).
 */
export function gerarPrevistos(recorrentes, membrosPorOrc, meses = 12, hoje = new Date()) {
  const mesAtual = chave(hoje);
  const previstos = [];

  recorrentes.forEach((r) => {
    if (!r.ativo) return;
    const membros = membrosPorOrc[r.orcamentoId] || [];
    const nomeDe = (uid) => membros.find((m) => m.uid === uid)?.nome || r.criadoPorNome || 'Sem responsável';
    const percentuais = Object.fromEntries(membros.map((m) => [m.uid, Number(m.percentual) || 0]));

    function quem(valor) {
      if (r.responsavelUid) return [[r.responsavelUid, valor]];
      if (r.financiamentoId) {
        const partes = ratear(valor, percentuais);
        if (partes.length) return partes;
      }
      return [[r.criadoPorUid, valor]];
    }

    function lancar(offset, valor, dia) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + offset, Math.min(dia || 1, 28));
      quem(valor).forEach(([uid, v]) => {
        previstos.push({
          id: `prev-${r.id}-${offset}-${uid}`,
          previsto: true,
          status: 'previsto',
          tipo: r.tipo === 'receita' ? 'receita' : 'despesa',
          valor: v,
          data,
          categoria: r.categoria,
          descricao: r.descricao,
          orcamentoId: r.orcamentoId,
          responsavel: uid,
          responsavelNome: nomeDe(uid),
        });
      });
    }

    if (Array.isArray(r.agenda)) {
      // Parcelas exatas do banco: cada uma no seu mês. As do mês atual são
      // lançadas pelo próprio app ao carregar, por isso só daqui pra frente.
      r.agenda.forEach((a) => {
        const [ano, mes] = a.mes.split('-').map(Number);
        const offset = (ano - hoje.getFullYear()) * 12 + (mes - 1 - hoje.getMonth());
        if (offset >= 1 && offset <= meses) lancar(offset, a.valor, r.diaDoMes);
      });
      return;
    }

    const inicio = r.ultimoMesGerado === mesAtual ? 1 : 0;
    const restantes = r.parcelas == null ? Infinity : Math.max(0, r.parcelas - (r.vezesGeradas || 0));
    for (let k = 0; k < restantes; k++) {
      const offset = inicio + k;
      if (offset > meses) break;
      const idx = (r.vezesGeradas || 0) + k;
      const valor = Array.isArray(r.valores) && r.valores[idx] != null ? r.valores[idx] : r.valor;
      lancar(offset, valor, r.diaDoMes);
    }
  });

  return previstos;
}
