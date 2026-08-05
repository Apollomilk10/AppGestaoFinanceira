/**
 * Regras de fatura de cartão de crédito.
 *
 * Uma compra entra na fatura que ainda não fechou quando ela aconteceu.
 * Se o cartão fecha dia 20 e você compra dia 25, a compra cai na fatura
 * do mês seguinte — que é como funciona na vida real.
 */

export function faturaDaCompra(data, diaFechamento) {
  const d = new Date(data);
  // comprou depois do fechamento? entra no ciclo seguinte
  const mesRef = d.getDate() > diaFechamento ? d.getMonth() + 1 : d.getMonth();
  return new Date(d.getFullYear(), mesRef, 1);
}

export function chaveFatura(dataRef) {
  return `${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Agrupa os lançamentos de um cartão por fatura, devolvendo cada ciclo
 * com seu total, data de fechamento e de vencimento.
 */
export function faturasDoCartao(rows, conta) {
  if (!conta || conta.tipo !== 'cartao') return [];

  const doCartao = rows.filter(
    (r) => r.contaId === conta.id && r.tipo !== 'receita' && r.data
  );

  const grupos = new Map();
  doCartao.forEach((r) => {
    const ref = faturaDaCompra(r.data, conta.diaFechamento);
    const k = chaveFatura(ref);
    if (!grupos.has(k)) grupos.set(k, { chave: k, referencia: ref, itens: [], total: 0 });
    const g = grupos.get(k);
    g.itens.push(r);
    g.total += r.valor;
  });

  const hoje = new Date();
  return Array.from(grupos.values())
    .map((g) => {
      const fechamento = new Date(g.referencia.getFullYear(), g.referencia.getMonth(), conta.diaFechamento);
      const vencimento = new Date(
        g.referencia.getFullYear(),
        g.referencia.getMonth() + (conta.diaVencimento < conta.diaFechamento ? 1 : 0),
        conta.diaVencimento
      );
      return { ...g, fechamento, vencimento, aberta: hoje <= fechamento };
    })
    .sort((a, b) => b.referencia - a.referencia);
}

/** Quanto já foi usado do limite: soma das faturas ainda não vencidas. */
export function limiteUsado(rows, conta) {
  const hoje = new Date();
  return faturasDoCartao(rows, conta)
    .filter((f) => f.vencimento >= hoje)
    .reduce((s, f) => s + f.total, 0);
}

/** Saldo de uma conta comum (não-cartão): inicial + entradas − saídas. */
export function saldoDaConta(rows, conta) {
  if (!conta) return 0;
  return rows
    .filter((r) => r.contaId === conta.id && r.status !== 'projetado')
    .reduce((s, r) => s + (r.tipo === 'receita' ? r.valor : -r.valor), conta.saldoInicial || 0);
}
