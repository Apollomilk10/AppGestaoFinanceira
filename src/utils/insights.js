// Cálculos derivados dos lançamentos — usados na aba de Insights e nos
// cartões da Visão Geral.

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function last14DaysSeries(rows) {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d;
  });

  return days.map((day) => {
    const total = rows
      .filter((r) => r.data && startOfDay(r.data).getTime() === day.getTime())
      .reduce((sum, r) => sum + r.valor, 0);
    return { date: day, total };
  });
}

export function monthlySeries(rows, months = 6) {
  const today = new Date();
  const buckets = Array.from({ length: months }).map((_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('pt-BR', { month: 'short' }) };
  });

  return buckets.map((b) => {
    const total = rows
      .filter((r) => r.data && r.data.getFullYear() === b.year && r.data.getMonth() === b.month)
      .reduce((sum, r) => sum + r.valor, 0);
    return { ...b, total };
  });
}

export function currentVsPreviousMonth(rows) {
  const now = new Date();
  const thisMonth = rows.filter(
    (r) => r.data && r.data.getFullYear() === now.getFullYear() && r.data.getMonth() === now.getMonth()
  );
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = rows.filter(
    (r) => r.data && r.data.getFullYear() === prevDate.getFullYear() && r.data.getMonth() === prevDate.getMonth()
  );

  const atual = thisMonth.reduce((s, r) => s + r.valor, 0);
  const anterior = prevMonth.reduce((s, r) => s + r.valor, 0);
  const variacao = anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;

  return { atual, anterior, variacao };
}

export function averageDaily(rows) {
  if (rows.length === 0) return 0;
  const datas = rows.map((r) => r.data).filter(Boolean);
  if (datas.length === 0) return 0;
  const min = new Date(Math.min(...datas.map((d) => d.getTime())));
  const max = new Date(Math.max(...datas.map((d) => d.getTime())));
  const dias = Math.max(1, Math.round((max - min) / (1000 * 60 * 60 * 24)) + 1);
  const total = rows.reduce((s, r) => s + r.valor, 0);
  return total / dias;
}

export function biggestExpense(rows) {
  if (rows.length === 0) return null;
  return rows.reduce((max, r) => (r.valor > (max?.valor || 0) ? r : max), null);
}

export function rankBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const k = row[key] || 'outro';
    map.set(k, (map.get(k) || 0) + row.valor);
  });
  const total = rows.reduce((s, r) => s + r.valor, 0);
  return Array.from(map, ([key, valor]) => ({
    key,
    valor,
    pct: total > 0 ? (valor / total) * 100 : 0,
  })).sort((a, b) => b.valor - a.valor);
}

// ===================== DESPESAS x RECEITAS =====================

export function filtrarDespesas(rows) {
  return rows.filter((r) => r.tipo !== 'receita');
}

export function filtrarReceitas(rows) {
  return rows.filter((r) => r.tipo === 'receita');
}

/**
 * Saldo líquido: receitas menos despesas.
 */
export function saldoTotal(rows) {
  return rows
    .filter((r) => r.status !== 'projetado')
    .reduce((s, r) => s + (r.tipo === 'receita' ? r.valor : -r.valor), 0);
}

/**
 * Soma tudo que é confirmado com data anterior ao limite informado —
 * é o "saldo inicial" carregado de todo o histórico até ali.
 */
export function saldoAcumuladoAte(rows, dataLimite) {
  return rows
    .filter((r) => r.status !== 'projetado' && r.data && r.data < dataLimite)
    .reduce((s, r) => s + (r.tipo === 'receita' ? r.valor : -r.valor), 0);
}

/**
 * Saldo do mês: agora sensibilizado pelo fechamento acumulado de TODOS os
 * meses anteriores (não começa mais do zero) + confirmado até agora +
 * o que já está projetado pro restante do mês.
 */
export function previsaoSaldoMes(rows, mesOffset = 0) {
  const base = new Date();
  const alvo = new Date(base.getFullYear(), base.getMonth() + mesOffset, 1);
  const inicial = saldoAcumuladoAte(rows, alvo);

  const doMes = rows.filter(
    (r) => r.data && r.data.getFullYear() === alvo.getFullYear() && r.data.getMonth() === alvo.getMonth()
  );

  const confirmados = doMes.filter((r) => r.status !== 'projetado');
  const projetados = doMes.filter((r) => r.status === 'projetado');

  const despesasMes = confirmados.filter((r) => r.tipo !== 'receita').reduce((s, r) => s + r.valor, 0);
  const receitasMes = confirmados.filter((r) => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);

  const despesaProjetada = projetados.filter((r) => r.tipo !== 'receita').reduce((s, r) => s + r.valor, 0);
  const receitaProjetada = projetados.filter((r) => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);

  const saldoAtual = inicial + receitasMes - despesasMes;
  const saldoProjetado = saldoAtual + (receitaProjetada - despesaProjetada);

  return {
    inicial,
    despesasMes,
    receitasMes,
    saldoAtual,
    saldoProjetado,
    despesaProjetada,
    receitaProjetada,
  };
}

/**
 * Série do mês inteiro: saldo real (confirmado) do dia 1 até hoje, e a
 * partir de hoje continua com o saldo projetado (linha prevista) até o
 * fim do mês, considerando lançamentos futuros já marcados no calendário.
 * mesOffset permite navegar (0 = mês atual, -1 = anterior, 1 = seguinte).
 * Meses passados ficam inteiramente "reais"; meses futuros, inteiramente
 * "previstos".
 */
export function saldoDiarioMes(rows, mesOffset = 0) {
  const base = new Date();
  const alvo = new Date(base.getFullYear(), base.getMonth() + mesOffset, 1);
  const mes = alvo.getMonth();
  const ano = alvo.getFullYear();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const ehMesAtual = mesOffset === 0;
  const ehMesPassado = mesOffset < 0;
  const hoje = ehMesAtual ? base.getDate() : ehMesPassado ? diasNoMes : 0;

  const doMes = rows.filter((r) => r.data && r.data.getFullYear() === ano && r.data.getMonth() === mes);

  const porDiaConfirmado = new Map();
  const porDiaProjetado = new Map();
  doMes.forEach((r) => {
    const dia = r.data.getDate();
    const delta = r.tipo === 'receita' ? r.valor : -r.valor;
    const mapa = r.status === 'projetado' ? porDiaProjetado : porDiaConfirmado;
    mapa.set(dia, (mapa.get(dia) || 0) + delta);
  });

  const label = (dia) => `${String(dia).padStart(2, '0')}/${String(mes + 1).padStart(2, '0')}`;

  let acumulado = saldoAcumuladoAte(rows, alvo);
  const passado = [];
  for (let dia = 1; dia <= hoje; dia++) {
    acumulado += porDiaConfirmado.get(dia) || 0;
    passado.push({ label: label(dia), real: acumulado, previsto: null });
  }

  let acumuladoPrevisto = acumulado;
  const futuro = [];
  for (let dia = hoje + 1; dia <= diasNoMes; dia++) {
    acumuladoPrevisto += (porDiaConfirmado.get(dia) || 0) + (porDiaProjetado.get(dia) || 0);
    futuro.push({ label: label(dia), real: null, previsto: acumuladoPrevisto });
  }

  // conecta as duas linhas no dia de hoje, pra não deixar buraco no gráfico
  if (futuro.length > 0) {
    passado[passado.length - 1].previsto = passado[passado.length - 1].real;
  }

  return [...passado, ...futuro];
}

/**
 * Percentual acumulado de despesas por integrante (baseado em quem foi
 * declarado no campo "Quem", via responsavelNome já resolvido).
 */
export function porIntegrantePercentual(rows) {
  const despesas = rows.filter((r) => r.tipo !== 'receita' && r.responsavelNome);
  const total = despesas.reduce((s, r) => s + r.valor, 0);

  const porPessoa = new Map();
  despesas.forEach((r) => {
    porPessoa.set(r.responsavelNome, (porPessoa.get(r.responsavelNome) || 0) + r.valor);
  });

  return Array.from(porPessoa, ([nome, valor]) => ({
    nome,
    valor,
    pct: total > 0 ? (valor / total) * 100 : 0,
  })).sort((a, b) => b.valor - a.valor);
}

/**
 * Quanto cada integrante gastou em cada um dos últimos N meses — pra um
 * gráfico de barras agrupadas por mês.
 */
export function porIntegranteMensal(rows, meses = 6) {
  const now = new Date();
  const baldes = Array.from({ length: meses }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (meses - 1 - i), 1);
    return { ano: d.getFullYear(), mes: d.getMonth(), label: d.toLocaleDateString('pt-BR', { month: 'short' }) };
  });

  const pessoas = Array.from(
    new Set(rows.filter((r) => r.tipo !== 'receita' && r.responsavelNome).map((r) => r.responsavelNome))
  );

  const serie = baldes.map((b) => {
    const linha = { label: b.label };
    pessoas.forEach((nome) => {
      linha[nome] = rows
        .filter(
          (r) =>
            r.tipo !== 'receita' &&
            r.responsavelNome === nome &&
            r.data &&
            r.data.getFullYear() === b.ano &&
            r.data.getMonth() === b.mes
        )
        .reduce((s, r) => s + r.valor, 0);
    });
    return linha;
  });

  return { serie, pessoas };
}

/**
 * Simula o impacto de cada recorrente ativa num mês futuro específico
 * (offsetAlvo >= 1), sem criar lançamentos de verdade — só pra projeção
 * visual. Respeita quantas parcelas já foram geradas e quantas restam.
 */
export function projecaoMensalFutura(recorrentes, offsetAlvo, mesAtualStr) {
  let despesas = 0;
  let receitas = 0;

  // Mês-alvo (AAAA-MM), para financiamentos com parcelas exatas do banco.
  const [anoBase, mesBase] = mesAtualStr.split('-').map(Number);
  const alvo = new Date(anoBase, mesBase - 1 + offsetAlvo, 1);
  const mesAlvoStr = `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}`;

  recorrentes.forEach((r) => {
    if (!r.ativo) return;
    if (Array.isArray(r.agenda)) {
      // Parcelas ainda não lançadas, cada uma no seu mês e valor.
      r.agenda.forEach((a) => {
        if (a.mes === mesAlvoStr) despesas += a.valor;
      });
      return;
    }
    const jaGerouEsteMes = r.ultimoMesGerado === mesAtualStr;
    const proximoOffset = jaGerouEsteMes ? 1 : 0;

    let incluir;
    if (r.parcelas == null) {
      incluir = offsetAlvo >= proximoOffset;
    } else {
      const restantes = Math.max(0, r.parcelas - (r.vezesGeradas || 0));
      const ultimoOffsetValido = proximoOffset + restantes - 1;
      incluir = offsetAlvo >= proximoOffset && offsetAlvo <= ultimoOffsetValido;
    }

    if (incluir) {
      // Parcelas de valor variável (financiamento SAC): pega a do mês certo.
      const idx = (r.vezesGeradas || 0) + (offsetAlvo - proximoOffset);
      const valor = Array.isArray(r.valores) && r.valores[idx] != null ? r.valores[idx] : r.valor;
      if (r.tipo === 'receita') receitas += valor;
      else despesas += valor;
    }
  });

  return { despesasMes: despesas, receitasMes: receitas, saldoAtual: receitas - despesas, saldoProjetado: receitas - despesas };
}

export function projecaoTotal(rows, orcamento) {
  const now = new Date();
  const diaDoMes = now.getDate();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const gastoMesAtual = rows
    .filter((r) => r.data && r.data.getFullYear() === now.getFullYear() && r.data.getMonth() === now.getMonth())
    .reduce((s, r) => s + r.valor, 0);

  const mediaDiaria = diaDoMes > 0 ? gastoMesAtual / diaDoMes : 0;
  const projecaoMes = mediaDiaria * diasNoMes;

  return { gastoMesAtual, mediaDiaria, projecaoMes };
}

/**
 * Os N maiores gastos, do maior pro menor.
 */
export function topExpenses(rows, n = 5) {
  return [...rows].sort((a, b) => b.valor - a.valor).slice(0, n);
}

/**
 * Soma de gastos por dia da semana (0 = domingo ... 6 = sábado) — ajuda a
 * enxergar em quais dias o dinheiro costuma sair mais.
 */
export function weekdaySeries(rows) {
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const totals = new Array(7).fill(0);
  rows.forEach((r) => {
    if (!r.data) return;
    totals[r.data.getDay()] += r.valor;
  });
  return nomes.map((label, i) => ({ label, total: totals[i] }));
}
export function cumulativeSeries(rows) {
  const comData = rows.filter((r) => r.data).sort((a, b) => a.data.getTime() - b.data.getTime());
  if (comData.length === 0) return [];

  const porDia = new Map();
  comData.forEach((r) => {
    const key = r.data.toISOString().slice(0, 10);
    porDia.set(key, (porDia.get(key) || 0) + r.valor);
  });

  let acumulado = 0;
  return Array.from(porDia.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateStr, total]) => {
      acumulado += total;
      return { label: new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), total: acumulado };
    });
}

// ===================== RELATÓRIOS (por pessoa e acumulado) =====================

const SEM_RESPONSAVEL = 'Sem responsável';

/** Últimos N meses (do mais antigo ao mais recente), com rótulo curto. */
function ultimosMeses(n) {
  const now = new Date();
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      ano: d.getFullYear(),
      mes: d.getMonth(),
      inicio: d,
      fim: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
    };
  });
}

/**
 * Total por pessoa em cada um dos últimos N meses, só do que está
 * confirmado (desejos/projetados ficam de fora). `tipo` é 'receita'
 * (entradas) ou 'despesa' (saídas). Devolve { serie, pessoas } pronto
 * pra um gráfico de barras agrupadas.
 */
export function mensalPorPessoa(rows, tipo, meses = 6) {
  const base = rows.filter(
    (r) =>
      r.status !== 'projetado' &&
      r.data &&
      (tipo === 'receita' ? r.tipo === 'receita' : r.tipo !== 'receita')
  );
  const nomeDe = (r) => r.responsavelNome || SEM_RESPONSAVEL;

  // pessoas ordenadas por quem mais movimentou, pra cor e legenda estáveis
  const totais = new Map();
  base.forEach((r) => totais.set(nomeDe(r), (totais.get(nomeDe(r)) || 0) + r.valor));
  const pessoas = Array.from(totais.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome]) => nome);

  const serie = ultimosMeses(meses).map((b) => {
    const linha = { label: b.label };
    pessoas.forEach((nome) => {
      linha[nome] = base
        .filter((r) => nomeDe(r) === nome && r.data >= b.inicio && r.data < b.fim)
        .reduce((s, r) => s + r.valor, 0);
    });
    return linha;
  });

  return { serie, pessoas };
}

/**
 * Acumulado no tempo: quanto já entrou e quanto já saiu, somando tudo
 * desde o primeiro lançamento até o fim de cada mês. A diferença entre as
 * duas linhas é o saldo guardado.
 */
export function acumuladoMensal(rows, meses = 12) {
  const confirmados = rows.filter((r) => r.status !== 'projetado' && r.data);
  const buckets = ultimosMeses(meses);
  const soma = (lista) => lista.reduce((s, r) => s + r.valor, 0);

  let entradas = soma(confirmados.filter((r) => r.tipo === 'receita' && r.data < buckets[0].inicio));
  let saidas = soma(confirmados.filter((r) => r.tipo !== 'receita' && r.data < buckets[0].inicio));

  return buckets.map((b) => {
    const doMes = confirmados.filter((r) => r.data >= b.inicio && r.data < b.fim);
    entradas += soma(doMes.filter((r) => r.tipo === 'receita'));
    saidas += soma(doMes.filter((r) => r.tipo !== 'receita'));
    return { label: b.label, entradas, saidas, saldo: entradas - saidas };
  });
}

/**
 * Acumulado por pessoa: quanto cada integrante já recebeu (tipo 'receita')
 * ou já gastou (tipo 'despesa'), somando tudo desde o primeiro lançamento
 * até o fim de cada um dos últimos N meses. Devolve também o "mix" final —
 * quanto do total acumulado é de cada pessoa.
 */
export function acumuladoPorPessoa(rows, tipo, meses = 12) {
  const base = rows.filter(
    (r) =>
      r.status !== 'projetado' &&
      r.data &&
      (tipo === 'receita' ? r.tipo === 'receita' : r.tipo !== 'receita')
  );
  const nomeDe = (r) => r.responsavelNome || SEM_RESPONSAVEL;

  const totais = new Map();
  base.forEach((r) => totais.set(nomeDe(r), (totais.get(nomeDe(r)) || 0) + r.valor));
  const pessoas = Array.from(totais.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([nome]) => nome);

  const buckets = ultimosMeses(meses);
  const fimJanela = buckets[buckets.length - 1].fim;
  const serie = buckets.map((b) => {
    const linha = { label: b.label };
    pessoas.forEach((nome) => {
      linha[nome] = base
        .filter((r) => nomeDe(r) === nome && r.data < b.fim)
        .reduce((s, r) => s + r.valor, 0);
    });
    return linha;
  });

  const ultimo = serie[serie.length - 1] || {};
  const total = pessoas.reduce((s, n) => s + (ultimo[n] || 0), 0);
  const mix = pessoas.map((nome) => ({
    nome,
    valor: ultimo[nome] || 0,
    pct: total > 0 ? ((ultimo[nome] || 0) / total) * 100 : 0,
  }));

  return { serie, pessoas, mix, total, fimJanela };
}
