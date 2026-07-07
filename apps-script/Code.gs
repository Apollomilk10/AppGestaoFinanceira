/**
 * Cole este código em Extensões > Apps Script, dentro da própria planilha.
 * Depois implante como "App da Web" (veja o README do projeto para o
 * passo a passo completo).
 *
 * IMPORTANTE: sempre que editar este arquivo, é preciso fazer
 * Implantar > Gerenciar implantações > editar (ícone de lápis) > Nova versão
 * para a mudança valer no link já publicado. Sem isso, o link continua
 * rodando a versão antiga do código.
 *
 * ARQUITETURA DE CONTAS:
 * - Cada pessoa cria uma conta própria (e-mail + senha, um e-mail por conta).
 * - Ao se cadastrar, a pessoa cria um "espaço" novo (recebe um código pra
 *   compartilhar) ou entra num espaço existente usando o código de alguém.
 * - Todo gasto/categoria fica marcado com o espaço de quem criou.
 * - Nas leituras, só retornamos dados do MESMO espaço do usuário logado.
 * - Login gera um token guardado na aba Usuarios; esse token precisa ser
 *   enviado em toda leitura/escrita subsequente (evita que alguém monte a
 *   URL na mão trocando o e-mail e leia dados de outro espaço).
 */

const NOME_DA_ABA = 'Pagina1'; // aba de gastos — troque se tiver outro nome

function doGet(e) {
  try {
    const tipo = e.parameter.type;
    const email = e.parameter.email;
    const token = e.parameter.token;

    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const sessao = validarSessao(planilha, email, token);
    if (!sessao.valido) {
      return respostaJson({ status: 'erro', message: sessao.message });
    }

    if (tipo === 'gastos') {
      return respostaJson({ status: 'ok', rows: listarGastos(planilha, sessao.grupo) });
    }
    if (tipo === 'categorias') {
      return respostaJson({ status: 'ok', rows: listarCategorias(planilha, sessao.grupo) });
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

    // Todas as outras ações exigem sessão válida
    const sessao = validarSessao(planilha, dados.email, dados.token);
    if (!sessao.valido) {
      return respostaJson({ status: 'erro', message: sessao.message });
    }

    const aba = planilha.getSheetByName(NOME_DA_ABA);
    if (!aba) {
      return respostaJson({ status: 'erro', message: `Aba "${NOME_DA_ABA}" não encontrada.` });
    }

    if (acao === 'create') return criar(aba, dados, sessao.grupo);
    if (acao === 'update') return atualizar(aba, dados, sessao.grupo);
    if (acao === 'delete') return excluir(aba, dados, sessao.grupo);
    if (acao === 'feedback') return salvarFeedback(planilha, dados);
    if (acao === 'addCategoria') return adicionarCategoria(planilha, dados, sessao.grupo);

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
    aba.appendRow(['Email', 'SenhaHash', 'Salt', 'Grupo', 'Token', 'DataCriacao']);
  }
  return aba;
}

function gerarSalt() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function gerarToken() {
  return Utilities.getUuid().replace(/-/g, '');
}

function gerarCodigoGrupo() {
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
      return { linha: i + 1, email: dados[i][0], senhaHash: dados[i][1], salt: dados[i][2], grupo: dados[i][3], token: dados[i][4] };
    }
  }
  return null;
}

function grupoExiste(aba, codigo) {
  const dados = aba.getDataRange().getValues();
  const codigoNormalizado = (codigo || '').trim().toUpperCase();
  for (let i = 1; i < dados.length; i++) {
    if ((dados[i][3] || '').toString().trim().toUpperCase() === codigoNormalizado) {
      return true;
    }
  }
  return false;
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

  let grupo;
  if (dados.modoGrupo === 'entrar') {
    const codigo = (dados.codigoGrupo || '').trim().toUpperCase();
    if (!codigo) {
      return respostaJson({ status: 'erro', message: 'Informe o código do espaço.' });
    }
    if (!grupoExiste(abaUsuarios, codigo)) {
      return respostaJson({ status: 'erro', message: 'Código de espaço inválido.' });
    }
    grupo = codigo;
  } else {
    grupo = gerarCodigoGrupo();
  }

  const salt = gerarSalt();
  const senhaHash = hashSenha(senha, salt);
  const token = gerarToken();

  abaUsuarios.appendRow([email, senhaHash, salt, grupo, token, new Date()]);

  return respostaJson({ status: 'ok', email, grupo, token });
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

  return respostaJson({ status: 'ok', email: usuario.email, grupo: usuario.grupo, token: novoToken });
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
  return { valido: true, grupo: usuario.grupo };
}

// ===================== GASTOS =====================

function listarGastos(planilha, grupo) {
  const aba = planilha.getSheetByName(NOME_DA_ABA);
  if (!aba) return [];

  const dados = aba.getDataRange().getValues();
  const linhas = [];
  for (let i = 1; i < dados.length; i++) {
    const linhaGrupo = (dados[i][6] || '').toString().trim().toUpperCase();
    if (linhaGrupo !== grupo) continue;
    linhas.push({
      rowNumber: i + 1,
      data: formatarData(dados[i][0]),
      categoria: dados[i][1],
      descricao: dados[i][2],
      valor: dados[i][3],
      responsavel: dados[i][4],
      etapa: dados[i][5],
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

function criar(aba, dados, grupo) {
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
    grupo,
  ]);

  return respostaJson({ status: 'ok' });
}

function atualizar(aba, dados, grupo) {
  const linha = Number(dados.rowNumber);
  if (!linha || linha < 2) {
    return respostaJson({ status: 'erro', message: 'Número de linha inválido.' });
  }
  if (!dados.valor || isNaN(Number(dados.valor))) {
    return respostaJson({ status: 'erro', message: 'Valor inválido.' });
  }

  const grupoAtual = (aba.getRange(linha, 7).getValue() || '').toString().trim().toUpperCase();
  if (grupoAtual !== grupo) {
    return respostaJson({ status: 'erro', message: 'Você não tem permissão para editar esse lançamento.' });
  }

  aba.getRange(linha, 1, 1, 7).setValues([[
    dados.data || '',
    dados.categoria || 'outro',
    dados.descricao || '',
    Number(dados.valor),
    dados.responsavel || '',
    dados.etapa || 'nao_especificada',
    grupo,
  ]]);

  return respostaJson({ status: 'ok' });
}

function excluir(aba, dados, grupo) {
  const linha = Number(dados.rowNumber);
  if (!linha || linha < 2) {
    return respostaJson({ status: 'erro', message: 'Número de linha inválido.' });
  }

  const grupoAtual = (aba.getRange(linha, 7).getValue() || '').toString().trim().toUpperCase();
  if (grupoAtual !== grupo) {
    return respostaJson({ status: 'erro', message: 'Você não tem permissão para excluir esse lançamento.' });
  }

  aba.deleteRow(linha);
  return respostaJson({ status: 'ok' });
}

// ===================== CATEGORIAS CUSTOMIZADAS =====================

function listarCategorias(planilha, grupo) {
  const aba = planilha.getSheetByName('Categorias');
  if (!aba) return [];

  const dados = aba.getDataRange().getValues();
  const linhas = [];
  for (let i = 1; i < dados.length; i++) {
    const linhaGrupo = (dados[i][4] || '').toString().trim().toUpperCase();
    if (linhaGrupo !== grupo) continue;
    linhas.push({
      categoriaChave: dados[i][0],
      categoriaLabel: dados[i][1],
      subcategoriaChave: dados[i][2],
      subcategoriaLabel: dados[i][3],
    });
  }
  return linhas;
}

function adicionarCategoria(planilha, dados, grupo) {
  const categoriaChave = (dados.categoriaChave || '').trim();
  const categoriaLabel = (dados.categoriaLabel || '').trim();

  if (!categoriaChave && !categoriaLabel) {
    return respostaJson({ status: 'erro', message: 'Categoria vazia.' });
  }

  let abaCategorias = planilha.getSheetByName('Categorias');
  if (!abaCategorias) {
    abaCategorias = planilha.insertSheet('Categorias');
    abaCategorias.appendRow(['CategoriaChave', 'CategoriaLabel', 'SubcategoriaChave', 'SubcategoriaLabel', 'Grupo']);
  }

  abaCategorias.appendRow([
    categoriaChave,
    categoriaLabel,
    (dados.subcategoriaChave || '').trim(),
    (dados.subcategoriaLabel || '').trim(),
    grupo,
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
 * FUNÇÃO DE MIGRAÇÃO — rode isso MANUALMENTE só uma vez, direto pelo editor
 * do Apps Script (não é acessível pela internet), depois de criar sua conta
 * e saber o código do seu espaço.
 *
 * Como usar:
 * 1. Troque 'SEU_CODIGO_AQUI' pelo código do seu espaço (ex: 'A3F9K2')
 * 2. No topo do editor do Apps Script, selecione esta função no menu
 *    suspenso ("preencherGrupoEmDadosAntigos")
 * 3. Clique em "Executar" (▶)
 * 4. Isso marca todo gasto que ainda não tinha um "Grupo" com o código
 *    informado, pra continuarem aparecendo pra você depois da migração
 */
function preencherGrupoEmDadosAntigos() {
  const CODIGO_DO_MEU_ESPACO = 'SEU_CODIGO_AQUI'; // <-- troque aqui

  const planilha = SpreadsheetApp.getActiveSpreadsheet();
  const aba = planilha.getSheetByName(NOME_DA_ABA);
  if (!aba) {
    Logger.log('Aba de gastos não encontrada.');
    return;
  }

  const ultimaLinha = aba.getLastRow();
  let atualizados = 0;

  for (let linha = 2; linha <= ultimaLinha; linha++) {
    const grupoAtual = aba.getRange(linha, 7).getValue();
    if (!grupoAtual) {
      aba.getRange(linha, 7).setValue(CODIGO_DO_MEU_ESPACO);
      atualizados++;
    }
  }

  Logger.log('Linhas atualizadas: ' + atualizados);
}
