from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import CategoriaInput

router = APIRouter(tags=["categorias"])


@router.get("/orcamentos/{orcamento_id}/categorias")
async def listar_categorias(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("categorias").where("orcamentoId", "==", orcamento_id).stream()
    rows = [d.to_dict() for d in docs]
    return {"rows": rows}


@router.post("/orcamentos/{orcamento_id}/categorias")
async def adicionar_categoria(orcamento_id: str, body: CategoriaInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    db.collection("categorias").add({
        "orcamentoId": orcamento_id,
        "categoriaChave": body.categoriaChave,
        "categoriaLabel": body.categoriaLabel,
        "subcategoriaChave": body.subcategoriaChave or "",
        "subcategoriaLabel": body.subcategoriaLabel or "",
    })
    return {"status": "ok"}
