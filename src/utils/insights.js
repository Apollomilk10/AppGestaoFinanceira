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
 * Saldo do mês: confirmado até agora + o que já está projetado pro
 * restante do mês (lançamentos marcados como "projetado").
 */
export function previsaoSaldoMes(rows) {
  const now = new Date();

  const doMes = rows.filter(
    (r) => r.data && r.data.getFullYear() === now.getFullYear() && r.data.getMonth() === now.getMonth()
  );

  const confirmados = doMes.filter((r) => r.status !== 'projetado');
  const projetados = doMes.filter((r) => r.status === 'projetado');

  const despesasMes = confirmados.filter((r) => r.tipo !== 'receita').reduce((s, r) => s + r.valor, 0);
  const receitasMes = confirmados.filter((r) => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);

  const despesaProjetada = projetados.filter((r) => r.tipo !== 'receita').reduce((s, r) => s + r.valor, 0);
  const receitaProjetada = projetados.filter((r) => r.tipo === 'receita').reduce((s, r) => s + r.valor, 0);

  const saldoAtual = receitasMes - despesasMes;
  const saldoProjetado = saldoAtual + (receitaProjetada - despesaProjetada);

  return {
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
 */
export function saldoDiarioMes(rows) {
  const now = new Date();
  const hoje = now.getDate();
  const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const mes = now.getMonth();
  const ano = now.getFullYear();

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

  let acumulado = 0;
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
