# Obra — Painel de Gastos

Dashboard que lê os lançamentos de gastos da reforma direto de uma planilha
Google Sheets (alimentada pelo bot do Telegram) e mostra indicadores básicos:
total gasto, gasto por categoria, gasto por etapa da obra, orçamento previsto
e últimos lançamentos.

## 1. Estrutura esperada da planilha

A aba precisa ter estas colunas, nessa ordem, com cabeçalho na primeira linha:

| Data       | Categoria | Descricao      | Valor  | Responsavel | Etapa     |
|------------|-----------|-----------------|--------|-------------|-----------|
| 04/07/2026 | material  | cimento 5 sacos | 250,00 | você        | elétrica  |

## 2. Publicar a planilha como CSV

1. Abra a planilha no Google Sheets
2. Vá em **Arquivo > Compartilhar > Publicar na web**
3. Em "Link", selecione a aba correta e o formato **Valores separados por vírgula (.csv)**
4. Clique em **Publicar** e copie o link gerado

> ⚠️ Esse link publicado fica acessível por qualquer pessoa que o tenha —
> não é indexado pelo Google, mas não é criptografado. Se os valores forem
> sensíveis, considere migrar futuramente para a API oficial do Google Sheets
> com uma Service Account (posso te ajudar a implementar isso depois).

https://docs.google.com/spreadsheets/d/e/2PACX-1vSMgJ-yfn3P-e_jsoJLsBnPKlr1ZJ6VW3eHaESU6gX4GS88lHCMQ47mE4IpSh2bNqWwVQ3_X7ttDpMl/pub?output=csv

## 3. Configurar o projeto localmente

```bash
npm install
cp .env.example .env
# cole o link do CSV publicado em VITE_SHEET_CSV_URL dentro do .env
npm run dev
```

O dashboard abre em `http://localhost:5173` e atualiza os dados automaticamente
a cada 60 segundos.

## 4. Build de produção

```bash
npm run build
```

Os arquivos finais ficam em `dist/`. Você pode hospedar em Vercel, Netlify,
GitHub Pages ou qualquer serviço de arquivos estáticos.

## 5. Criar o repositório privado no GitHub e liberar acesso por e-mail

1. Acesse [github.com/new](https://github.com/new)
2. Nome sugerido: `obra-dashboard`
3. Marque a opção **Private**
4. Crie o repositório **sem** README (este projeto já tem um)
5. No terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "primeira versão do painel de gastos"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/obra-dashboard.git
git push -u origin main
```

6. No GitHub, vá em **Settings > Collaborators > Add people**
7. Digite o e-mail da pessoa — se ela não tiver conta no GitHub, ele envia um
   convite por e-mail para criar a conta e aceitar o acesso automaticamente

## Próximos passos possíveis

- Adicionar autenticação simples se o link for hospedado publicamente
- Trocar o CSV publicado pela API oficial do Google Sheets (mais seguro)
- Adicionar comparação mês a mês
- Conectar diretamente ao mesmo backend do bot do Telegram, se ele expuser uma API
