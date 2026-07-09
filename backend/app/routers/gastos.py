from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import GastoInput

router = APIRouter(tags=["gastos"])


def _serializar(doc) -> dict:
    data = doc.to_dict()
    return {
        "id": doc.id,
        "data": data.get("data", ""),
        "categoria": data.get("categoria", "outro"),
        "descricao": data.get("descricao", ""),
        "valor": data.get("valor", 0),
        "responsavel": data.get("responsavel", ""),
        "etapa": data.get("etapa", "nao_especificada"),
        "criadoPorEmail": data.get("criadoPorEmail", ""),
    }


@router.get("/orcamentos/{orcamento_id}/gastos")
async def listar_gastos(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("gastos").where("orcamentoId", "==", orcamento_id).stream()
    rows = [_serializar(d) for d in docs]
    return {"rows": rows}


@router.post("/orcamentos/{orcamento_id}/gastos")
async def criar_gasto(orcamento_id: str, body: GastoInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    if body.valor <= 0:
        raise HTTPException(status_code=400, detail="Valor inválido.")

    data_str = body.data or datetime.now(timezone.utc).strftime("%d/%m/%Y")

    db.collection("gastos").add({
        "orcamentoId": orcamento_id,
        "data": data_str,
        "categoria": body.categoria,
        "descricao": body.descricao,
        "valor": body.valor,
        "responsavel": body.responsavel,
        "etapa": body.etapa,
        "criadoPorUid": user["uid"],
        "criadoPorEmail": user["email"],
        "criadoEm": datetime.now(timezone.utc),
    })
    return {"status": "ok"}


@router.put("/orcamentos/{orcamento_id}/gastos/{gasto_id}")
async def atualizar_gasto(orcamento_id: str, gasto_id: str, body: GastoInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    if body.valor <= 0:
        raise HTTPException(status_code=400, detail="Valor inválido.")

    ref = db.collection("gastos").document(gasto_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado nesse orçamento.")

    destino_id = orcamento_id
    if body.novoOrcamentoId and body.novoOrcamentoId != orcamento_id:
        await exigir_membro(body.novoOrcamentoId, user["uid"])
        destino_id = body.novoOrcamentoId

    ref.update({
        "orcamentoId": destino_id,
        "data": body.data or doc.to_dict().get("data", ""),
        "categoria": body.categoria,
        "descricao": body.descricao,
        "valor": body.valor,
        "responsavel": body.responsavel,
        "etapa": body.etapa,
    })
    return {"status": "ok"}


@router.delete("/orcamentos/{orcamento_id}/gastos/{gasto_id}")
async def excluir_gasto(orcamento_id: str, gasto_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])

    ref = db.collection("gastos").document(gasto_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado nesse orçamento.")

    ref.delete()
    return {"status": "ok"}


@router.get("/meus-gastos")
async def meus_gastos(user: dict = Depends(get_current_user)):
    docs = db.collection("gastos").where("criadoPorUid", "==", user["uid"]).stream()

    orcamento_nomes = {}
    rows = []
    for d in docs:
        data = d.to_dict()
        orcamento_id = data.get("orcamentoId")
        if orcamento_id not in orcamento_nomes:
            odoc = db.collection("orcamentos").document(orcamento_id).get()
            orcamento_nomes[orcamento_id] = odoc.to_dict().get("nome") if odoc.exists else orcamento_id

        rows.append({
            "id": d.id,
            "data": data.get("data", ""),
            "categoria": data.get("categoria", "outro"),
            "descricao": data.get("descricao", ""),
            "valor": data.get("valor", 0),
            "orcamentoId": orcamento_id,
            "orcamentoNome": orcamento_nomes[orcamento_id],
        })
    return {"rows": rows}
