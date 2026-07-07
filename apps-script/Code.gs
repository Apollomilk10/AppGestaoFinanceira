/**
 * Cole este código em Extensões > Apps Script, dentro da própria planilha.
 * Depois implante como "App da Web" (veja o README do projeto para o
 * passo a passo completo).
 *
 * IMPORTANTE: sempre que editar este arquivo, é preciso fazer
 * Implantar > Gerenciar implantações > editar (ícone de lápis) > Nova versão
 * para a mudança valer no link já publicado.
 *
 * ARQUITETURA:
 * - Cada pessoa cria uma conta própria (e-mail + senha).
 * - Ao se cadastrar, a pessoa cria um orçamento novo (recebe um código) ou
 *   entra num orçamento existente com o código de alguém.
 * - Depois de logada, a pessoa pode criar OUTROS orçamentos ou entrar em
 *   outros com código, e alternar entre eles (como "grupos" do Splitwise).
 * - Todo gasto/categoria fica marcado com o orçamento em que foi criado.
 * - Nas leituras, só retornamos dados do orçamento pedido — e só se o
 *   usuário for de fato membro dele.
 * - Existe também uma consulta "meusGastos", que soma o que a PRÓPRIA
 *   pessoa lançou, em TODOS os orçamentos que participa.
 */

const NOME_DA_ABA = 'Pagina1'; // aba de gastos — troque se tiver outro nome

function doGet(e) {
  try {
    const tipo = e.parameter.type;
    const email = e.parameter.email;
    const token = e.parameter.token;
    const orcamentoId = e.parameter.orcamentoId;

    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const sessao = validarSessao(planilha, email, token);
    if (!sessao.valido) {
      return respostaJson({ status: 'erro', message: sessao.message });
    }

    if (tipo === 'orcamentos') {
      return respostaJson({ status: 'ok', rows: listarOrcamentosDoUsuario(planilha, sessao.email) });
    }
    if (tipo === 'gastos') {
      const permissao = validarMembro(planilha, sessao.email, orcamentoId);
      if (!permissao.valido) return respostaJson({ status: 'erro', message: permissao.message });
      return respostaJson({ status: 'ok', rows: listarGastos(planilha, orcamentoId) });
    }
    if (tipo === 'categorias') {
      const permissao = validarMembro(planilha, sessao.email, orcamentoId);
      if (!permissao.valido) return respostaJson({ status: 'erro', message: permissao.message });
      return respostaJson({ status: 'ok', rows: listarCategorias(planilha, orcamentoId) });
    }
    if (tipo === 'meusGastos') {
      return respostaJson({ status: 'ok', rows: listarMeusGastos(planilha, sessao.email) });
    }

    return respostaJson({ status: 'erro', message: 'Tipo de consulta desconhecido.' });
  } catch (err) {
    return respostaJson({ status: 'erro', message: 'Erro no script: ' + err.message });
  }
}

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const acao = dados.action || 'create';

    if (acao === 'signup') return signup(planilha, dados);
    if (acao === 'login') return login(planilha, dados);

    const sessao = validarSessao(planilha, dados.email, dados.token);
    if (!sessao.valido) {
      return respostaJson({ status: 'erro', message: sessao.message });
    }

    if (acao === 'criarOrcamento') return criarOrcamento(planilha, dados, sessao.email);
    if (acao === 'entrarOrcamento') return entrarOrcamento(planilha, dados, sessao.email);
    if (acao === 'feedback') return salvarFeedback(planilha, dados);

    // Ações abaixo mexem em gastos/categorias de um orçamento específico —
    // todas exigem que o usuário seja membro dele.
    const permissao = validarMembro(planilha, sessao.email, dados.orcamentoId);
    if (!permissao.valido) {
      return respostaJson({ status: 'erro', message: permissao.message });
    }

    const aba = planilha.getSheetByName(NOME_DA_ABA);
    if (!aba) {
      return respostaJson({ status: 'erro', message: `Aba "${NOME_DA_ABA}" não encontrada.` });
    }

    if (acao === 'create') return criar(aba, dados, dados.orcamentoId, sessao.email);
    if (acao === 'update') return atualizar(aba, dados, dados.orcamentoId);
    if (acao === 'delete') return excluir(aba, dados, dados.orcamentoId);
    if (acao === 'addCategoria') return adicionarCategoria(planilha, dados, dados.orcamentoId);

    return respostaJson({ status: 'erro', message: `Ação desconhecida: ${acao}` });
  } catch (err) {
    return respostaJson({ status: 'erro', message: 'Erro no script: ' + err.message });
  }
}

// ===================== CONTAS =====================

function getOrCreateUsuariosSheet(planilha) {
  let aba = planilha.getSheetByName('Usuarios');
  if (!aba) {
    aba = planilha.insertSheet('Usuarios');
    aba.appendRow(['Email', 'SenhaHash', 'Salt', 'OrcamentoPadrao', 'Token', 'DataCriacao']);
  }
  return aba;
}

function getOrCreateOrcamentosSheet(planilha) {
  let aba = planilha.getSheetByName('Orcamentos');
  if (!aba) {
    aba = planilha.insertSheet('Orcamentos');
    aba.appendRow(['OrcamentoId', 'Nome', 'CriadoPorEmail', 'DataCriacao']);
  }
  return aba;
}

function getOrCreateMembrosSheet(planilha) {
  let aba = planilha.getSheetByName('Membros');
  if (!aba) {
    aba = planilha.insertSheet('Membros');
    aba.appendRow(['OrcamentoId', 'Email', 'DataEntrada']);
  }
  return aba;
}

function gerarSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function gerarToken() {
  return Utilities.getUuid().replace(/-/g, '');
}

function gerarCodigoOrcamento() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

function hashSenha(senha, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, senha + salt);
  return Utilities.base64Encode(bytes);
}

function encontrarUsuario(aba, email) {
  const dados = aba.getDataRange().getValues();
  const emailNormalizado = (email || '').trim().toLowerCase();
  for (let i = 1; i < dados.length; i++) {
    if ((dados[i][0] || '').toString().trim().toLowerCase() === emailNormalizado) {
      return { linha: i + 1, email: dados[i][0], senhaHash: dados[i][1], salt: dados[i][2], token: dados[i][4] };
    }
  }
  return null;
}

function orcamentoExiste(abaOrcamentos, codigo) {
  const dados = abaOrcamentos.getDataRange().getValues();
  const codigoNormalizado = (codigo || '').trim().toUpperCase();
  for (let i = 1; i < dados.length; i++) {
    if ((dados[i][0] || '').toString().trim().toUpperCase() === codigoNormalizado) {
      return dados[i][1]; // retorna o nome
    }
  }
  return null;
}

function adicionarMembro(abaMembros, orcamentoId, email) {
  const dados = abaMembros.getDataRange().getValues();
  const jaMembro = dados.some(
    (linha, i) =>
      i > 0 &&
      (linha[0] || '').toString().trim().toUpperCase() === orcamentoId &&
      (linha[1] || '').toString().trim().toLowerCase() === email.toLowerCase()
  );
  if (!jaMembro) {
    abaMembros.appendRow([orcamentoId, email, new Date()]);
  }
}

function signup(planilha, dados) {
  const email = (dados.email || '').trim().toLowerCase();
  const senha = dados.senha || '';

  if (!email || !senha) {
    return respostaJson({ status: 'erro', message: 'E-mail e senha são obrigatórios.' });
  }
  if (senha.length < 4) {
    return respostaJson({ status: 'erro', message: 'A senha precisa ter pelo menos 4 caracteres.' });
  }

  const abaUsuarios = getOrCreateUsuariosSheet(planilha);
  if (encontrarUsuario(abaUsuarios, email)) {
    return respostaJson({ status: 'erro', message: 'Já existe uma conta com esse e-mail.' });
  }

  const abaOrcamentos = getOrCreateOrcamentosSheet(planilha);
  const abaMembros = getOrCreateMembrosSheet(planilha);

  let orcamentoId;
  let nomeOrcamento;

  if (dados.modoGrupo === 'entrar') {
    const codigo = (dados.codigoGrupo || '').trim().toUpperCase();
    if (!codigo) {
      return respostaJson({ status: 'erro', message: 'Informe o código do orçamento.' });
    }
    const nome = orcamentoExiste(abaOrcamentos, codigo);
    if (!nome) {
      return respostaJson({ status: 'erro', message: 'Código de orçamento inválido.' });
    }
    orcamentoId = codigo;
    nomeOrcamento = nome;
  } else {
    orcamentoId = gerarCodigoOrcamento();
    nomeOrcamento = dados.nomeOrcamento || 'Meu espaço';
    abaOrcamentos.appendRow([orcamentoId, nomeOrcamento, email, new Date()]);
  }

  adicionarMembro(abaMembros, orcamentoId, email);

  const salt = gerarSalt();
  const senhaHash = hashSenha(senha, salt);
  const token = gerarToken();
  abaUsuarios.appendRow([email, senhaHash, salt, orcamentoId, token, new Date()]);

  return respostaJson({ status: 'ok', email, token, orcamentoId, nomeOrcamento });
}

function login(planilha, dados) {
  const email = (dados.email || '').trim().toLowerCase();
  const senha = dados.senha || '';

  const abaUsuarios = getOrCreateUsuariosSheet(planilha);
  const usuario = encontrarUsuario(abaUsuarios, email);

  if (!usuario) {
    return respostaJson({ status: 'erro', message: 'E-mail ou senha incorretos.' });
  }

  const senhaHash = hashSenha(senha, usuario.salt);
  if (senhaHash !== usuario.senhaHash) {
    return respostaJson({ status: 'erro', message: 'E-mail ou senha incorretos.' });
  }

  const novoToken = gerarToken();
  abaUsuarios.getRange(usuario.linha, 5).setValue(novoToken);

  return respostaJson({ status: 'ok', email: usuario.email, token: novoToken });
}

function validarSessao(planilha, email, token) {
  if (!email || !token) {
    return { valido: false, message: 'Sessão inválida. Faça login novamente.' };
  }
  const abaUsuarios = getOrCreateUsuariosSheet(planilha);
  const usuario = encontrarUsuario(abaUsuarios, email);
  if (!usuario || usuario.token !== token) {
    return { valido: false, message: 'Sessão expirada. Faça login novamente.' };
  }
  return { valido: true, email: usuario.email };
}

// ===================== ORÇAMENTOS =====================

function listarOrcamentosDoUsuario(planilha, email) {
  const abaMembros = getOrCreateMembrosSheet(planilha);
  const abaOrcamentos = getOrCreateOrcamentosSheet(planilha);

  const membros = abaMembros.getDataRange().getValues();
  const meusIds = [];
  for (let i = 1; i < membros.length; i++) {
    if ((membros[i][1] || '').toString().trim().toLowerCase() === email.toLowerCase()) {
      meusIds.push((membros[i][0] || '').toString().trim().toUpperCase());
    }
  }

  const orcamentos = abaOrcamentos.getDataRange().getValues();
  const resultado = [];
  for (let i = 1; i < orcamentos.length; i++) {
    const id = (orcamentos[i][0] || '').toString().trim().toUpperCase();
    if (meusIds.indexOf(id) !== -1) {
      resultado.push({ id, nome: orcamentos[i][1], criadoPor: orcamentos[i][2] });
    }
  }
  return resultado;
}

function validarMembro(planilha, email, orcamentoId) {
  if (!orcamentoId) {
    return { valido: false, message: 'Nenhum orçamento selecionado.' };
  }
  const abaMembros = getOrCreateMembrosSheet(planilha);
  const dados = abaMembros.getDataRange().getValues();
  const id = orcamentoId.toString().trim().toUpperCase();
  const ehMembro = dados.some(
    (linha, i) =>
      i > 0 &&
      (linha[0] || '').toString().trim().toUpperCase() === id &&
      (linha[1] || '').toString().trim().toLowerCase() === email.toLowerCase()
  );
  if (!ehMembro) {
    return { valido: false, message: 'Você não é membro desse orçamento.' };
  }
  return { valido: true };
}

function criarOrcamento(planilha, dados, email) {
  const nome = (dados.nome || '').trim();
  if (!nome) {
    return respostaJson({ status: 'erro', message: 'Dê um nome para o orçamento.' });
  }

  const abaOrcamentos = getOrCreateOrcamentosSheet(planilha);
  const abaMembros = getOrCreateMembrosSheet(planilha);

  const orcamentoId = gerarCodigoOrcamento();
  abaOrcamentos.appendRow([orcamentoId, nome, email, new Date()]);
  adicionarMembro(abaMembros, orcamentoId, email);

  return respostaJson({ status: 'ok', orcamentoId, nome });
}

function entrarOrcamento(planilha, dados, email) {
  const codigo = (dados.codigo || '').trim().toUpperCase();
  if (!codigo) {
    return respostaJson({ status: 'erro', message: 'Informe o código do orçamento.' });
  }

  const abaOrcamentos = getOrCreateOrcamentosSheet(planilha);
  const nome = orcamentoExiste(abaOrcamentos, codigo);
  if (!nome) {
    return respostaJson({ status: 'erro', message: 'Código de orçamento inválido.' });
  }

  const abaMembros = getOrCreateMembrosSheet(planilha);
  adicionarMembro(abaMembros, codigo, email);

  return respostaJson({ status: 'ok', orcamentoId: codigo, nome });
}

// ===================== GASTOS =====================

function listarGastos(planilha, orcamentoId) {
  const aba = planilha.getSheetByName(NOME_DA_ABA);
  if (!aba) return [];

  const id = orcamentoId.toString().trim().toUpperCase();
  const dados = aba.getDataRange().getValues();
  const linhas = [];
  for (let i = 1; i < dados.length; i++) {
    const linhaOrcamento = (dados[i][6] || '').toString().trim().toUpperCase();
    if (linhaOrcamento !== id) continue;
    linhas.push({
      rowNumber: i + 1,
      data: formatarData(dados[i][0]),
      categoria: dados[i][1],
      descricao: dados[i][2],
      valor: dados[i][3],
      responsavel: dados[i][4],
      etapa: dados[i][5],
      criadoPorEmail: dados[i][7] || '',
    });
  }
  return linhas;
}

function listarMeusGastos(planilha, email) {
  const aba = planilha.getSheetByName(NOME_DA_ABA);
  if (!aba) return [];

  const abaOrcamentos = getOrCreateOrcamentosSheet(planilha);
  const nomesPorId = {};
  const listaOrcamentos = abaOrcamentos.getDataRange().getValues();
  for (let i = 1; i < listaOrcamentos.length; i++) {
    nomesPorId[(listaOrcamentos[i][0] || '').toString().trim().toUpperCase()] = listaOrcamentos[i][1];
  }

  const dados = aba.getDataRange().getValues();
  const linhas = [];
  for (let i = 1; i < dados.length; i++) {
    const criadoPor = (dados[i][7] || '').toString().trim().toLowerCase();
    if (criadoPor !== email.toLowerCase()) continue;
    const orcamentoId = (dados[i][6] || '').toString().trim().toUpperCase();
    linhas.push({
      rowNumber: i + 1,
      data: formatarData(dados[i][0]),
      categoria: dados[i][1],
      descricao: dados[i][2],
      valor: dados[i][3],
      responsavel: dados[i][4],
      etapa: dados[i][5],
      orcamentoId: orcamentoId,
      orcamentoNome: nomesPorId[orcamentoId] || orcamentoId,
    });
  }
  return linhas;
}

function formatarData(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return valor || '';
}

function criar(aba, dados, orcamentoId, emailCriador) {
  if (!dados.valor || isNaN(Number(dados.valor))) {
    return respostaJson({ status: 'erro', message: 'Valor inválido.' });
  }

  aba.appendRow([
    dados.data || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    dados.categoria || 'outro',
    dados.descricao || '',
    Number(dados.valor),
    dados.responsavel || '',
    dados.etapa || 'nao_especificada',
    orcamentoId.toString().trim().toUpperCase(),
    emailCriador,
  ]);

  return respostaJson({ status: 'ok' });
}

function atualizar(aba, dados, orcamentoId) {
  const linha = Number(dados.rowNumber);
  if (!linha || linha < 2) {
    return respostaJson({ status: 'erro', message: 'Número de linha inválido.' });
  }
  if (!dados.valor || isNaN(Number(dados.valor))) {
    return respostaJson({ status: 'erro', message: 'Valor inválido.' });
  }

  const id = orcamentoId.toString().trim().toUpperCase();
  const orcamentoAtual = (aba.getRange(linha, 7).getValue() || '').toString().trim().toUpperCase();
  if (orcamentoAtual !== id) {
    return respostaJson({ status: 'erro', message: 'Esse lançamento não pertence a esse orçamento.' });
  }

  aba.getRange(linha, 1, 1, 6).setValues([[
    dados.data || '',
    dados.categoria || 'outro',
    dados.descricao || '',
    Number(dados.valor),
    dados.responsavel || '',
    dados.etapa || 'nao_especificada',
  ]]);

  return respostaJson({ status: 'ok' });
}

function excluir(aba, dados, orcamentoId) {
  const linha = Number(dados.rowNumber);
  if (!linha || linha < 2) {
    return respostaJson({ status: 'erro', message: 'Número de linha inválido.' });
  }

  const id = orcamentoId.toString().trim().toUpperCase();
  const orcamentoAtual = (aba.getRange(linha, 7).getValue() || '').toString().trim().toUpperCase();
  if (orcamentoAtual !== id) {
    return respostaJson({ status: 'erro', message: 'Esse lançamento não pertence a esse orçamento.' });
  }

  aba.deleteRow(linha);
  return respostaJson({ status: 'ok' });
}

// ===================== CATEGORIAS CUSTOMIZADAS =====================

function listarCategorias(planilha, orcamentoId) {
  const aba = planilha.getSheetByName('Categorias');
  if (!aba) return [];

  const id = orcamentoId.toString().trim().toUpperCase();
  const dados = aba.getDataRange().getValues();
  const linhas = [];
  for (let i = 1; i < dados.length; i++) {
    const linhaOrcamento = (dados[i][4] || '').toString().trim().toUpperCase();
    if (linhaOrcamento !== id) continue;
    linhas.push({
      categoriaChave: dados[i][0],
      categoriaLabel: dados[i][1],
      subcategoriaChave: dados[i][2],
      subcategoriaLabel: dados[i][3],
    });
  }
  return linhas;
}

function adicionarCategoria(planilha, dados, orcamentoId) {
  const categoriaChave = (dados.categoriaChave || '').trim();
  const categoriaLabel = (dados.categoriaLabel || '').trim();

  if (!categoriaChave && !categoriaLabel) {
    return respostaJson({ status: 'erro', message: 'Categoria vazia.' });
  }

  let abaCategorias = planilha.getSheetByName('Categorias');
  if (!abaCategorias) {
    abaCategorias = planilha.insertSheet('Categorias');
    abaCategorias.appendRow(['CategoriaChave', 'CategoriaLabel', 'SubcategoriaChave', 'SubcategoriaLabel', 'OrcamentoId']);
  }

  abaCategorias.appendRow([
    categoriaChave,
    categoriaLabel,
    (dados.subcategoriaChave || '').trim(),
    (dados.subcategoriaLabel || '').trim(),
    orcamentoId.toString().trim().toUpperCase(),
  ]);

  return respostaJson({ status: 'ok' });
}

// ===================== FEEDBACK =====================

function salvarFeedback(planilha, dados) {
  const mensagem = (dados.mensagem || '').trim();
  if (!mensagem) {
    return respostaJson({ status: 'erro', message: 'Mensagem vazia.' });
  }

  let abaFeedback = planilha.getSheetByName('Feedback');
  if (!abaFeedback) {
    abaFeedback = planilha.insertSheet('Feedback');
    abaFeedback.appendRow(['Data/Hora', 'Mensagem', 'Email']);
  }

  abaFeedback.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    mensagem,
    dados.email || '',
  ]);

  return respostaJson({ status: 'ok' });
}

// ===================== HELPERS =====================

function respostaJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * MIGRAÇÃO — rode isso MANUALMENTE só uma vez, direto pelo editor do Apps
 * Script, pra converter o sistema antigo (1 espaço fixo por conta) pro
 * novo sistema de múltiplos orçamentos, sem perder nada.
 *
 * O que faz: para cada código de espaço que já existe nos gastos (coluna 7),
 * cria um Orçamento correspondente e torna todo mundo que tinha esse código
 * (aba Usuarios antiga, se ainda tiver a coluna Grupo) membro dele. Também
 * adiciona a coluna "CriadoPorEmail" nos gastos antigos, vazia (não temos
 * como saber quem lançou cada um retroativamente).
 *
 * Como usar: selecione "migrarParaOrcamentos" no menu suspenso do topo do
 * editor e clique em Executar (▶).
 */
function migrarParaOrcamentos() {
  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(NOME_DA_ABA);
  const abaOrcamentos = getOrCreateOrcamentosSheet(planilha);
  const abaMembros = getOrCreateMembrosSheet(planilha);

  // 1. Descobre todos os códigos de espaço usados nos gastos
  const dadosGastos = aba.getDataRange().getValues();
  const codigosUsados = {};
  for (let i = 1; i < dadosGastos.length; i++) {
    const codigo = (dadosGastos[i][6] || '').toString().trim().toUpperCase();
    if (codigo) codigosUsados[codigo] = true;
  }

  // 2. Cria um Orçamento pra cada código que ainda não tem um
  const existentes = abaOrcamentos.getDataRange().getValues();
  const idsExistentes = existentes.slice(1).map((l) => (l[0] || '').toString().trim().toUpperCase());

  Object.keys(codigosUsados).forEach((codigo) => {
    if (idsExistentes.indexOf(codigo) === -1) {
      abaOrcamentos.appendRow([codigo, 'Meu espaço', '', new Date()]);
    }
  });

  // 3. Se existir uma aba Usuarios antiga com coluna Grupo (formato antigo),
  // torna cada usuário membro do orçamento correspondente ao Grupo dele
  const abaUsuarios = planilha.getSheetByName('Usuarios');
  if (abaUsuarios) {
    const cabecalho = abaUsuarios.getRange(1, 1, 1, abaUsuarios.getLastColumn()).getValues()[0];
    const colGrupo = cabecalho.indexOf('Grupo');
    if (colGrupo !== -1) {
      const dadosUsuarios = abaUsuarios.getDataRange().getValues();
      for (let i = 1; i < dadosUsuarios.length; i++) {
        const email = dadosUsuarios[i][0];
        const grupo = (dadosUsuarios[i][colGrupo] || '').toString().trim().toUpperCase();
        if (email && grupo) {
          adicionarMembro(abaMembros, grupo, email);
        }
      }
    }
  }

  // 4. Garante que a coluna 8 (CriadoPorEmail) existe nos gastos
  if (aba.getLastColumn() < 8) {
    aba.getRange(1, 8).setValue('CriadoPorEmail');
  }

  Logger.log('Migração concluída.');
}
