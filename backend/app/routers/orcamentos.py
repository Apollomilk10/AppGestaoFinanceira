from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import gerar_codigo, buscar_orcamento_por_codigo, membro_doc_id
from ..firebase import db
from ..models import CriarOrcamento, EntrarOrcamento

router = APIRouter(prefix="/orcamentos", tags=["orcamentos"])


@router.post("")
async def criar_orcamento(body: CriarOrcamento, user: dict = Depends(get_current_user)):
    nome = body.nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Dê um nome para o orçamento.")

    codigo = gerar_codigo()
    orcamento_ref = db.collection("orcamentos").document()
    orcamento_ref.set({
        "nome": nome,
        "codigo": codigo,
        "criadoPorUid": user["uid"],
        "criadoPorEmail": user["email"],
        "criadoEm": datetime.now(timezone.utc),
    })

    db.collection("membros").document(membro_doc_id(orcamento_ref.id, user["uid"])).set({
        "orcamentoId": orcamento_ref.id,
        "uid": user["uid"],
        "email": user["email"],
        "dataEntrada": datetime.now(timezone.utc),
    })

    return {"orcamentoId": orcamento_ref.id, "nome": nome, "codigo": codigo}


@router.post("/entrar")
async def entrar_orcamento(body: EntrarOrcamento, user: dict = Depends(get_current_user)):
    doc = buscar_orcamento_por_codigo(body.codigo)
    if not doc:
        raise HTTPException(status_code=404, detail="Código de orçamento inválido.")

    orcamento_id = doc.id
    nome = doc.to_dict().get("nome")

    db.collection("membros").document(membro_doc_id(orcamento_id, user["uid"])).set({
        "orcamentoId": orcamento_id,
        "uid": user["uid"],
        "email": user["email"],
        "dataEntrada": datetime.now(timezone.utc),
    })

    return {"orcamentoId": orcamento_id, "nome": nome}


@router.get("")
async def listar_meus_orcamentos(user: dict = Depends(get_current_user)):
    membros = db.collection("membros").where("uid", "==", user["uid"]).stream()
    ids = [m.to_dict()["orcamentoId"] for m in membros]

    resultado = []
    for orcamento_id in ids:
        doc = db.collection("orcamentos").document(orcamento_id).get()
        if doc.exists:
            data = doc.to_dict()
            resultado.append({
                "id": doc.id,
                "nome": data.get("nome"),
                "codigo": data.get("codigo"),
            })
    return {"rows": resultado}
