from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import LimiteInput

router = APIRouter(tags=["limites"])


@router.get("/orcamentos/{orcamento_id}/limites")
async def listar_limites(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("limites").where("orcamentoId", "==", orcamento_id).stream()
    return {"rows": [{"id": d.id, **{k: v for k, v in d.to_dict().items() if k != "orcamentoId"}} for d in docs]}


@router.put("/orcamentos/{orcamento_id}/limites")
async def definir_limite(orcamento_id: str, body: LimiteInput, user: dict = Depends(get_current_user)):
    """Define (ou atualiza) o limite mensal de uma categoria. Um limite por
    categoria por orçamento — por isso o id do doc é previsível."""
    await exigir_membro(orcamento_id, user["uid"])
    if body.valorLimite < 0:
        raise HTTPException(status_code=400, detail="O limite não pode ser negativo.")

    doc_id = f"{orcamento_id}_{body.categoriaChave}"
    ref = db.collection("limites").document(doc_id)
    if body.valorLimite == 0:
        if ref.get().exists:
            ref.delete()
        return {"status": "removido"}

    ref.set({
        "orcamentoId": orcamento_id,
        "categoriaChave": body.categoriaChave,
        "valorLimite": body.valorLimite,
    })
    return {"status": "ok", "id": doc_id}
