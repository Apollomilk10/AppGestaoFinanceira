# Obra — API (FastAPI + Firebase)

Backend que substitui o Google Apps Script. Usa Firestore como banco de
dados e Firebase Authentication para login/cadastro (o front-end fala
direto com o Firebase Auth; esta API só valida o token e aplica as regras
de negócio).

## Rodar localmente

```bash
pip install -r requirements.txt
cp .env.example .env
# preencha FIREBASE_CREDENTIALS_JSON com o conteúdo do JSON da conta de serviço
export $(cat .env | xargs)
uvicorn app.main:app --reload
```

Acesse http://localhost:8000/docs para a documentação interativa (Swagger).

## Deploy no Render (gratuito)

1. Suba este projeto para um repositório no GitHub
2. Em [render.com](https://render.com), crie uma conta e clique em
   **New > Web Service**
3. Conecte o repositório
4. Runtime: **Docker** (ele detecta o Dockerfile sozinho)
5. Em **Environment**, adicione as variáveis:
   - `FIREBASE_CREDENTIALS_JSON`: conteúdo do JSON da conta de serviço
   - `ALLOWED_ORIGINS`: seu domínio do GitHub Pages
6. Deploy — o Render te dá uma URL pública (ex: `https://obra-api.onrender.com`)

> No plano gratuito do Render, o serviço "dorme" depois de um tempo sem uso
> e demora ~30s pra acordar na primeira chamada seguinte. Isso é esperado.
