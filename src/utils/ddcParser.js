/**
 * Lê o "Demonstrativo Descritivo de Crédito (DDC)" do banco — o PDF com a
 * evolução do saldo devedor — e devolve as parcelas exatas do financiamento
 * (número, vencimento, valor total, saldo devedor, se já foi paga).
 * Tudo roda no aparelho: o PDF não é enviado a lugar nenhum; só o
 * cronograma lido vai para o app.
 */

const num = (s) => Number(s.replace(/\./g, '').replace(',', '.'));

// "  12  21/07/2027 ...  Projetada  7.491,59  666.101,64"
const LINHA = /^\s*(\d{1,3})\s+(\d{2})\/(\d{2})\/(\d{4})\s.*\s(\S+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/;

/** Junta os itens de texto de uma página em linhas, agrupando pela altura. */
export function linhasDaPagina(itens) {
  const lista = itens
    .filter((i) => i.str && i.str.trim())
    .map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5] }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas = [];
  let atual = null;
  for (const it of lista) {
    if (atual && Math.abs(atual.y - it.y) <= 2.5) {
      atual.itens.push(it);
    } else {
      atual = { y: it.y, itens: [it] };
      linhas.push(atual);
    }
  }
  return linhas.map((l) => l.itens.sort((a, b) => a.x - b.x).map((i) => i.s).join(' '));
}

/** Transforma as linhas de texto do PDF no cronograma do financiamento. */
export function interpretarDDC(linhas) {
  const cronograma = [];
  for (const l of linhas) {
    const m = LINHA.exec(l);
    if (!m) continue;
    const [, n, dd, mm, aaaa, situacao, total, saldo] = m;
    cronograma.push({
      n: Number(n),
      d: `${aaaa}-${mm}-${dd}`,
      v: num(total),
      s: num(saldo),
      p: /^paga$/i.test(situacao),
    });
  }
  cronograma.sort((a, b) => a.n - b.n);

  if (cronograma.length === 0) {
    throw new Error('Não encontrei a tabela de parcelas. Envie o PDF do "Demonstrativo Descritivo de Crédito" completo.');
  }
  const esperado = cronograma.length;
  if (cronograma.some((p, i) => p.n !== i + 1)) {
    throw new Error(`Li ${esperado} parcelas, mas faltam algumas no meio. Confira se o PDF está completo.`);
  }

  const texto = linhas.join('\n');
  const prazo = /Prazo total opera[^\d\n]*(\d+)/i.exec(texto);
  if (prazo && Number(prazo[1]) !== esperado) {
    throw new Error(`O PDF diz ${prazo[1]} parcelas, mas li só ${esperado}. Confira se o PDF está completo.`);
  }
  const operacao = /Valor da Opera[^\d\n]*([\d.]+,\d{2})/i.exec(texto);
  const efetiva = /Taxa efetiva \(anual\)\s*([\d.,]+)/i.exec(texto);
  const sistema = /Sistema de amortiza[^\n]*?\b(SAC|PRICE)\b/i.exec(texto);

  return {
    cronograma,
    valorOperacao: operacao ? num(operacao[1]) : null,
    taxaAnual: efetiva ? num(efetiva[1]) : null,
    sistema: sistema ? sistema[1].toLowerCase() : null,
    pagas: cronograma.filter((p) => p.p).length,
  };
}

export async function lerPdfDDC(arquivo) {
  const pdfjs = await import('pdfjs-dist/build/pdf.min.mjs');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const linhas = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pagina = await doc.getPage(i);
    const conteudo = await pagina.getTextContent();
    linhas.push(...linhasDaPagina(conteudo.items));
  }
  return interpretarDDC(linhas);
}
