from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..auth import get_current_user
from ..firebase import db

router = APIRouter(prefix="/perfil", tags=["perfil"])


class NomeInput(BaseModel):
    nome: str


@router.put("/nome")
async def atualizar_nome(body: NomeInput, user: dict = Depends(get_current_user)):
    nome = body.nome.strip() or user["email"]
    docs = db.collection("membros").where("uid", "==", user["uid"]).stream()
    for d in docs:
        d.reference.update({"nome": nome})
    return {"status": "ok"}
