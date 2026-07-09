import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import orcamentos, gastos, categorias, feedback, metas, recorrentes

app = FastAPI(title="Obra — API de Gastos")

# Domínios que podem chamar essa API. Em produção, restrinja ao seu
# domínio do GitHub Pages via variável de ambiente ALLOWED_ORIGINS
# (separado por vírgula), por segurança.
_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = ["*"] if _origins_env == "*" else _origins_env.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orcamentos.router)
app.include_router(gastos.router)
app.include_router(categorias.router)
app.include_router(feedback.router)
app.include_router(metas.router)
app.include_router(recorrentes.router)


@app.get("/")
async def raiz():
    return {"status": "ok", "service": "obra-gastos-api"}


@app.get("/health")
async def health():
    return {"status": "ok"}
