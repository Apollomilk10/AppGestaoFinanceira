# Obra — Painel de Gastos

Dashboard que lê os lançamentos de gastos da reforma direto de uma planilha
Google Sheets e mostra indicadores: total gasto, tendências, gasto por
categoria, gasto por etapa, orçamento previsto, filtros e uma tela de
gerenciamento para editar/excluir lançamentos. Tem login simples e um
formulário embutido para adicionar novos gastos direto pelo site, sem custo.

## 1. Estrutura esperada da planilha

A aba precisa ter estas colunas, nessa ordem, com cabeçalho na primeira linha:

| Data       | Categoria | Descricao      | Valor  | Responsavel | Etapa     |
|------------|-----------|-----------------|--------|-------------|-----------|
| 04/07/2026 | material  | cimento 5 sacos | 250,00 | você        | elétrica  |

## 2. Publicar a planilha como CSV (para o dashboard *ler* os dados)

1. Abra a planilha no Google Sheets
2. Vá em **Arquivo > Compartilhar > Publicar na web**
3. Em "Link", selecione a aba correta e o formato **Valores separados por vírgula (.csv)**
4. Clique em **Publicar** e copie o link gerado

> ⚠️ Esse link publicado fica acessível por qualquer pessoa que o tenha —
> não é indexado pelo Google, mas não é criptografado.

## 3. Configurar o Google Apps Script (para *escrever*, editar e excluir)

O dashboard grava, edita e exclui lançamentos direto na planilha usando o
**Google Apps Script**, um recurso gratuito do próprio Google Sheets.

1. Abra sua planilha no Google Sheets
2. Vá em **Extensões > Apps Script**
3. Apague o conteúdo padrão do editor e cole o código do arquivo
   `apps-script/Code.gs` deste projeto
4. Confira se a constante `NOME_DA_ABA` no topo do script bate com o nome
   real da sua aba
5. Clique em **Implantar > Nova implantação**
6. Em "Selecionar tipo", escolha **App da Web**
7. Configure:
   - **Executar como**: sua conta
   - **Quem pode acessar**: Qualquer pessoa
8. Clique em **Implantar** e autorize as permissões pedidas
9. Copie a **URL do app da Web** gerada — ela deve terminar em `/exec`
10. Cole essa URL no `.env`, na variável `VITE_APPS_SCRIPT_URL`

> **Já tinha uma versão anterior do Code.gs?** É preciso substituir todo o
> conteúdo do editor pelo novo código (ele agora suporta criar, editar e
> excluir) e, depois de colar, fazer:
> **Implantar > Gerenciar implantações > editar (ícone de lápis) > Nova versão**
>
> Sem esse passo, o link continua rodando a versão antiga do script e as
> ações de editar/excluir não vão funcionar.

## 4. Configurar o login

O dashboard pede e-mail e senha antes de mostrar qualquer dado, e lembra o
acesso no navegador depois do primeiro login.

No `.env`, defina:

```
VITE_APP_EMAIL=voce@exemplo.com
VITE_APP_PASSWORD=escolha-uma-senha
```

> ⚠️ **Limite importante de segurança**: como este é um site estático (sem
> servidor próprio), essa senha fica embutida no código publicado. Isso
> impede acesso casual de quem não conhece a senha, mas **não** é proteção
> contra alguém disposto a inspecionar o código-fonte do site. Para um
> controle de gastos doméstico costuma ser suficiente, mas não é segurança
> de nível bancário.

## 5. Configurar o projeto localmente

\`\`\`bash
npm install
cp .env.example .env
# preencha as 4 variáveis no .env
npm run dev
\`\`\`

O dashboard abre em \`http://localhost:5173\`.

## 6. Build de produção

\`\`\`bash
npm run build
\`\`\`

## 7. Publicar

Se você já configurou o deploy pro GitHub Pages (`npm run deploy`), basta
rodar esse comando de novo depois de qualquer mudança de código.

## Diagnosticando erros ao salvar/editar/excluir

O app agora mostra a mensagem de erro real (não mais um texto genérico).
As causas mais comuns:

- **"URL parece incorreta"**: confira se `VITE_APPS_SCRIPT_URL` termina em
  `/exec`, não `/dev`
- **"não retornou um JSON válido"**: falta publicar uma "Nova versão" da
  implantação no Apps Script depois de editar o `Code.gs`
- **"erro de rede/CORS"**: confira se a implantação está com acesso
  "Qualquer pessoa" habilitado

## Sobre segurança

O link do CSV e o link do Apps Script ficam embutidos no código publicado.
Ninguém consegue *ler* a planilha inteira pelo link do Apps Script (ele só
grava/edita/exclui linhas), mas o link do CSV permite leitura completa por
quem o descobrir. A senha de login também fica no código publicado — veja
a seção 4 acima. Para um controle de gastos doméstico isso costuma ser um
risco aceitável, mas vale ter em mente.

## Próximos passos possíveis

- Adicionar um backend real com autenticação segura, se o projeto crescer
- Trocar o CSV publicado pela API oficial do Google Sheets com login
- Adicionar exportação de relatórios em PDF
