/**
 * Cálculo de financiamento (Price e SAC) — espelho de backend/app/financiamento.py.
 * A taxa informada é a efetiva anual; a mensal sai de (1 + a)^(1/12) − 1.
 * Seguros e tarifas mensais entram somados em cada parcela.
 */
export function taxaMensal(taxaAnual) {
  return taxaAnual > 0 ? (1 + taxaAnual / 100) ** (1 / 12) - 1 : 0;
}

export function cronograma(valor, taxaAnual, prazo, sistema, extras = 0) {
  const i = taxaMensal(taxaAnual);
  const pmt = i === 0 ? valor / prazo : (valor * i) / (1 - (1 + i) ** -prazo);
  const amortSac = valor / prazo;
  let saldo = valor;
  const parcelas = [];
  const saldos = [valor];
  for (let k = 0; k < prazo; k++) {
    const juros = saldo * i;
    const amort = sistema === 'price' ? pmt - juros : amortSac;
    parcelas.push(Math.round((juros + amort + extras) * 100) / 100);
    saldo = Math.max(0, saldo - amort);
    saldos.push(saldo);
  }
  return { parcelas, saldos };
}

/** Prévia do que o financiamento vai gerar, enquanto a pessoa preenche. */
export function previa({ valorFinanciado, taxaAnual, prazoMeses, sistema, parcelasPagas, seguroMensal, valorParcela }) {
  const valor = Number(valorFinanciado);
  const prazo = Number(prazoMeses);
  const pagas = Number(parcelasPagas) || 0;
  const taxa = Number(taxaAnual) || 0;
  if (!(valor > 0) || !(prazo >= 1) || pagas < 0 || pagas >= prazo) return null;
  const { parcelas, saldos } = cronograma(valor, taxa, prazo, sistema, Number(seguroMensal) || 0);
  const fixa = Number(valorParcela) > 0 ? Number(valorParcela) : null;
  const restantes = prazo - pagas;
  const valores = fixa ? Array(restantes).fill(fixa) : parcelas.slice(pagas);
  return {
    restantes,
    primeira: valores[0],
    ultima: valores[valores.length - 1],
    saldoDevedor: saldos[pagas],
    totalRestante: valores.reduce((s, v) => s + v, 0),
  };
}
