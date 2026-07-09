from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import MetaInput, MetaAporteInput

router = APIRouter(tags=["metas"])


def _serializar(doc) -> dict:
    data = doc.to_dict()
    return {
        "id": doc.id,
        "nome": data.get("nome", ""),
        "valorAlvo": data.get("valorAlvo", 0),
        "valorAtual": data.get("valorAtual", 0),
        "dataAlvo": data.get("dataAlvo", ""),
    }


@router.get("/orcamentos/{orcamento_id}/metas")
async def listar_metas(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("metas").where("orcamentoId", "==", orcamento_id).stream()
    return {"rows": [_serializar(d) for d in docs]}


@router.post("/orcamentos/{orcamento_id}/metas")
async def criar_meta(orcamento_id: str, body: MetaInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    if body.valorAlvo <= 0:
        raise HTTPException(status_code=400, detail="Valor alvo inválido.")

    db.collection("metas").add({
        "orcamentoId": orcamento_id,
        "nome": body.nome.strip(),
        "valorAlvo": body.valorAlvo,
        "valorAtual": 0,
        "dataAlvo": body.dataAlvo or "",
        "criadoPorUid": user["uid"],
        "criadoEm": datetime.now(timezone.utc),
    })
    return {"status": "ok"}


@router.post("/orcamentos/{orcamento_id}/metas/{meta_id}/aporte")
async def adicionar_aporte(orcamento_id: str, meta_id: str, body: MetaAporteInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("metas").document(meta_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Meta não encontrada.")

    novo_valor = doc.to_dict().get("valorAtual", 0) + body.valor
    ref.update({"valorAtual": max(0, novo_valor)})
    return {"status": "ok"}


@router.delete("/orcamentos/{orcamento_id}/metas/{meta_id}")
async def excluir_meta(orcamento_id: str, meta_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("metas").document(meta_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Meta não encontrada.")
    ref.delete()
    return {"status": "ok"}
