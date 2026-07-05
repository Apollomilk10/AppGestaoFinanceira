# Obra — Painel de Gastos

Dashboard que lê os lançamentos de gastos da reforma direto de uma planilha
Google Sheets e mostra indicadores básicos: total gasto, gasto por
categoria, gasto por etapa da obra, orçamento previsto e últimos
lançamentos. Tem um formulário embutido para adicionar novos gastos direto
pelo site, sem custo.

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

## 3. Ativar o botão "Novo gasto" (para *escrever* na planilha, sem custo)

O dashboard tem um formulário embutido (botão flutuante "+ Novo gasto") que
grava lançamentos direto na planilha, sem precisar de bot, servidor ou API
paga. Isso é feito com o **Google Apps Script**, um recurso gratuito do
próprio Google Sheets.

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
8. Clique em **Implantar** e autorize as permissões pedidas (é o próprio
   Google pedindo confirmação de que o script pode editar essa planilha)
9. Copie a **URL do app da Web** gerada
10. Cole essa URL no `.env` do projeto, na variável `VITE_APPS_SCRIPT_URL`

> Sempre que você editar o código do `Code.gs`, precisa fazer
> **Implantar > Gerenciar implantações > editar (ícone de lápis) > Nova versão**
> para a mudança valer no link já gerado.

## 4. Configurar o projeto localmente

\`\`\`bash
npm install
cp .env.example .env
# cole os dois links (CSV e Apps Script) no .env
npm run dev
\`\`\`

O dashboard abre em \`http://localhost:5173\`, atualiza os dados
automaticamente a cada 60 segundos, e já permite adicionar gastos pelo
formulário.

## 5. Build de produção

\`\`\`bash
npm run build
\`\`\`

Os arquivos finais ficam em \`dist/\`. Você pode hospedar em Vercel, Netlify,
GitHub Pages ou qualquer serviço de arquivos estáticos.

## 6. Criar o repositório no GitHub e publicar

1. Acesse [github.com/new](https://github.com/new)
2. Nome sugerido: \`obra-dashboard\`
3. Escolha a visibilidade (pública, se for usar GitHub Pages no plano gratuito)
4. Crie o repositório **sem** README (este projeto já tem um)
5. No terminal, dentro da pasta do projeto:

\`\`\`bash
git init
git add .
git commit -m "primeira versão do painel de gastos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/obra-dashboard.git
git push -u origin main
\`\`\`

6. Se o repositório for privado e você quiser dar acesso a alguém: vá em
   **Settings > Collaborators > Add people** e digite o e-mail da pessoa —
   se ela não tiver conta no GitHub, ele envia um convite automático

## Sobre segurança

O link do CSV e o link do Apps Script ficam embutidos no código publicado
(visível em um repositório público ou inspecionando o site). Ninguém
consegue *ler* a planilha inteira pelo link do Apps Script (ele só grava
linhas), mas o link do CSV permite leitura completa por quem o descobrir.
Para um controle de gastos doméstico isso costuma ser um risco aceitável,
mas vale ter em mente.

## Próximos passos possíveis

- Adicionar uma senha simples de acesso ao site
- Trocar o CSV publicado pela API oficial do Google Sheets com login (mais seguro, porém mais complexo)
- Adicionar comparação mês a mês
- Reaproveitar este mesmo formulário como alternativa ao bot do Telegram, ou usar os dois em paralelo
