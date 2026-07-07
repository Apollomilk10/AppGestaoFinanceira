/**
 * Cole este código em Extensões > Apps Script, dentro da própria planilha.
 * Depois implante como "App da Web" (veja o README do projeto para o
 * passo a passo completo).
 *
 * IMPORTANTE: sempre que editar este arquivo, é preciso fazer
 * Implantar > Gerenciar implantações > editar (ícone de lápis) > Nova versão
 * para a mudança valer no link já publicado. Sem isso, o link continua
 * rodando a versão antiga do código.
 */

const NOME_DA_ABA = 'Pagina1'; // troque se sua aba tiver outro nome

function doPost(e) {
  try {
    const dados = JSON.parse(e.postData.contents);
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    const aba = planilha.getSheetByName(NOME_DA_ABA);

    if (!aba) {
      return resposta({ status: 'erro', message: `Aba "${NOME_DA_ABA}" não encontrada.` });
    }

    const acao = dados.action || 'create';

    if (acao === 'create') {
      return criar(aba, dados);
    }
    if (acao === 'update') {
      return atualizar(aba, dados);
    }
    if (acao === 'delete') {
      return excluir(aba, dados);
    }
    if (acao === 'feedback') {
      return salvarFeedback(planilha, dados);
    }
    if (acao === 'addCategoria') {
      return adicionarCategoria(planilha, dados);
    }

    return resposta({ status: 'erro', message: `Ação desconhecida: ${acao}` });
  } catch (err) {
    return resposta({ status: 'erro', message: 'Erro no script: ' + err.message });
  }
}

function criar(aba, dados) {
  if (!dados.valor || isNaN(Number(dados.valor))) {
    return resposta({ status: 'erro', message: 'Valor inválido.' });
  }

  aba.appendRow([
    dados.data || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy'),
    dados.categoria || 'outro',
    dados.descricao || '',
    Number(dados.valor),
    dados.responsavel || '',
    dados.etapa || 'nao_especificada',
  ]);

  return resposta({ status: 'ok' });
}

function atualizar(aba, dados) {
  const linha = Number(dados.rowNumber);
  if (!linha || linha < 2) {
    return resposta({ status: 'erro', message: 'Número de linha inválido.' });
  }
  if (!dados.valor || isNaN(Number(dados.valor))) {
    return resposta({ status: 'erro', message: 'Valor inválido.' });
  }

  aba.getRange(linha, 1, 1, 6).setValues([[
    dados.data || '',
    dados.categoria || 'outro',
    dados.descricao || '',
    Number(dados.valor),
    dados.responsavel || '',
    dados.etapa || 'nao_especificada',
  ]]);

  return resposta({ status: 'ok' });
}

function excluir(aba, dados) {
  const linha = Number(dados.rowNumber);
  if (!linha || linha < 2) {
    return resposta({ status: 'erro', message: 'Número de linha inválido.' });
  }

  aba.deleteRow(linha);
  return resposta({ status: 'ok' });
}

function salvarFeedback(planilha, dados) {
  const mensagem = (dados.mensagem || '').trim();
  if (!mensagem) {
    return resposta({ status: 'erro', message: 'Mensagem vazia.' });
  }

  let abaFeedback = planilha.getSheetByName('Feedback');
  if (!abaFeedback) {
    abaFeedback = planilha.insertSheet('Feedback');
    abaFeedback.appendRow(['Data/Hora', 'Mensagem']);
  }

  abaFeedback.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm'),
    mensagem,
  ]);

  return resposta({ status: 'ok' });
}

function adicionarCategoria(planilha, dados) {
  const categoriaChave = (dados.categoriaChave || '').trim();
  const categoriaLabel = (dados.categoriaLabel || '').trim();

  if (!categoriaChave && !categoriaLabel) {
    return resposta({ status: 'erro', message: 'Categoria vazia.' });
  }

  let abaCategorias = planilha.getSheetByName('Categorias');
  if (!abaCategorias) {
    abaCategorias = planilha.insertSheet('Categorias');
    abaCategorias.appendRow(['CategoriaChave', 'CategoriaLabel', 'SubcategoriaChave', 'SubcategoriaLabel']);
  }

  abaCategorias.appendRow([
    categoriaChave,
    categoriaLabel,
    (dados.subcategoriaChave || '').trim(),
    (dados.subcategoriaLabel || '').trim(),
  ]);

  return resposta({ status: 'ok' });
}

function resposta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
