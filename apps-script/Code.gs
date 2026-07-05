/**
 * Cole este código em Extensões > Apps Script, dentro da própria planilha.
 * Depois implante como "App da Web" (veja o README do projeto para o
 * passo a passo completo).
 *
 * Este script só grava dados na aba especificada abaixo — ele não lê nem
 * expõe o conteúdo da planilha para quem chama o link.
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
  } catch (err) {
    return resposta({ status: 'erro', message: err.message });
  }
}

function resposta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
