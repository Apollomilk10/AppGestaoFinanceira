# Obra — Painel de Gastos

Dashboard de controle de gastos com **contas reais** (cadastro com e-mail/
senha) e **espaços compartilhados**: cada conta pertence a um espaço
(identificado por um código), e só enxerga os dados desse espaço. Duas
pessoas podem compartilhar o mesmo espaço (ex: um casal), enquanto outro
espaço (ex: outro casal usando o mesmo app) fica completamente isolado.

## Como funciona a separação por espaço

1. A primeira pessoa cria uma conta e escolhe **"Criar novo espaço"** — o
   app gera um código (ex: `A3F9K2`)
2. Ela compartilha esse código com quem também vai lançar gastos ali
   (parceiro(a), etc.)
3. A segunda pessoa cria a própria conta escolhendo **"Entrar com código"**
   e usando esse código
4. As duas contas agora enxergam os mesmos dados — mas nenhuma outra conta
   de fora desse espaço consegue ver ou mexer nesses dados

## 1. Estrutura da planilha

Você não precisa criar nada manualmente — o Apps Script cria sozinho as
abas que precisa (`Usuarios`, `Categorias`, `Feedback`) na primeira vez que
forem usadas. Só a aba de gastos precisa existir com estas colunas, nessa
ordem, com cabeçalho na primeira linha:

| Data       | Categoria | Descricao      | Valor  | Responsavel | Etapa    |
|------------|-----------|-----------------|--------|-------------|----------|
| 04/07/2026 | material  | cimento 5 sacos | 250,00 | você        | eletrica |

O script adiciona sozinho uma 7ª coluna (`Grupo`) nos gastos que forem
criados por ele — não precisa adicionar essa coluna manualmente.

## 2. Configurar o Google Apps Script

Esse projeto não usa mais links de CSV publicado — **tudo** (login,
cadastro, leitura e escrita de gastos, categorias) passa pelo Apps Script.

1. Abra sua planilha no Google Sheets
2. Vá em **Extensões > Apps Script**
3. Apague o conteúdo padrão do editor e cole o código do arquivo
   `apps-script/Code.gs` deste projeto
4. Confira se a constante `NOME_DA_ABA` no topo do script bate com o nome
   real da sua aba de gastos
5. Clique em **Implantar > Nova implantação**
6. Em "Selecionar tipo", escolha **App da Web**
7. Configure:
   - **Executar como**: sua conta
   - **Quem pode acessar**: Qualquer pessoa
8. Clique em **Implantar** e autorize as permissões pedidas
9. Copie a **URL do app da Web** gerada — deve terminar em `/exec`
10. Cole essa URL no `.env`, na variável `VITE_APPS_SCRIPT_URL`

> Sempre que editar o `Code.gs`, é preciso fazer
> **Implantar > Gerenciar implantações > editar (lápis) > Nova versão**
> pra a mudança valer no link já publicado.

## 3. Configurar o projeto localmente

\`\`\`bash
npm install
cp .env.example .env
# cole a URL do Apps Script no .env
npm run dev
\`\`\`

## 4. Build e deploy

\`\`\`bash
npm run build
npm run deploy   # se você já tiver o gh-pages configurado
\`\`\`

## Sobre segurança

- Senhas são guardadas com hash (SHA-256 + salt), nunca em texto puro
- O login gera um token que precisa ser enviado em toda operação — isso
  evita que alguém monte a URL na mão trocando o e-mail pra tentar ler
  dados de outro espaço
- Ainda assim, isso **não é** segurança de nível bancário: é um Apps
  Script gratuito, sem HTTPS próprio além do que o Google já fornece, sem
  rate-limiting contra tentativas de força bruta no login, e o código
  roda do lado do navegador (visível a quem inspecionar). Para o uso
  proposto (controle doméstico de gastos entre poucas pessoas de
  confiança) é um nível de proteção razoável — não é o suficiente para
  dados verdadeiramente sensíveis
- O e-mail cadastrado é único por conta (não dá pra cadastrar duas contas
  com o mesmo e-mail)

## Próximos passos possíveis

- Recuperação de senha (hoje não existe — se esquecer, precisa de acesso
  direto à planilha pra redefinir manualmente)
- Expiração de token/sessão por tempo
- Permitir trocar de espaço ou sair de um espaço
