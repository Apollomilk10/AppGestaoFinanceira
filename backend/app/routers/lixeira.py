from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..lixeira import DIAS_GUARDADO, expirado, restaurar

router = APIRouter(tags=["lixeira"])


def _item(orcamento_id: str, item_id: str):
    ref = db.collection("lixeira").document(item_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Esse item não está mais na lixeira.")
    return ref, doc.to_dict()


@router.get("/orcamentos/{orcamento_id}/lixeira")
async def listar_lixeira(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    rows = []
    for d in db.collection("lixeira").where("orcamentoId", "==", orcamento_id).stream():
        x = d.to_dict()
        if expirado(x.get("excluidoEm")):
            d.reference.delete()  # passou do prazo: some de vez
            continue
        quando = x.get("excluidoEm")
        rows.append({
            "id": d.id,
            "tipo": x.get("tipo"),
            "descricao": x.get("descricao", ""),
            "valor": x.get("valor", 0),
            "quantidade": x.get("quantidade", 1),
            "deFinanciamento": x.get("deFinanciamento", False),
            "excluidoEm": quando.isoformat() if quando else None,
            "excluidoPorNome": x.get("excluidoPorNome", ""),
        })
    rows.sort(key=lambda r: r["excluidoEm"] or "", reverse=True)
    return {"rows": rows, "diasGuardado": DIAS_GUARDADO}


@router.post("/orcamentos/{orcamento_id}/lixeira/{item_id}/restaurar")
async def restaurar_item(orcamento_id: str, item_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref, item = _item(orcamento_id, item_id)
    voltaram = restaurar(item)
    ref.delete()
    return {"status": "ok", "restaurados": voltaram, "tipo": item.get("tipo")}


@router.delete("/orcamentos/{orcamento_id}/lixeira/{item_id}")
async def apagar_de_vez(orcamento_id: str, item_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref, _ = _item(orcamento_id, item_id)
    ref.delete()
    return {"status": "ok"}
