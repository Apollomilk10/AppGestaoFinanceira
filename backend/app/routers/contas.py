from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import ContaInput

router = APIRouter(tags=["contas"])

TIPOS_VALIDOS = ("carteira", "corrente", "poupanca", "cartao")


def _serializar(doc) -> dict:
    d = doc.to_dict()
    return {
        "id": doc.id,
        "nome": d.get("nome", ""),
        "tipo": d.get("tipo", "corrente"),
        "saldoInicial": d.get("saldoInicial", 0),
        "limite": d.get("limite"),
        "diaFechamento": d.get("diaFechamento"),
        "diaVencimento": d.get("diaVencimento"),
        "cor": d.get("cor"),
        "arquivada": d.get("arquivada", False),
    }


@router.get("/orcamentos/{orcamento_id}/contas")
async def listar_contas(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("contas").where("orcamentoId", "==", orcamento_id).stream()
    return {"rows": [_serializar(d) for d in docs]}


@router.post("/orcamentos/{orcamento_id}/contas")
async def criar_conta(orcamento_id: str, body: ContaInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    if not body.nome.strip():
        raise HTTPException(status_code=400, detail="Dê um nome para a conta.")
    if body.tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo de conta inválido.")
    if body.tipo == "cartao":
        for campo, valor in (("fechamento", body.diaFechamento), ("vencimento", body.diaVencimento)):
            if valor is None or not (1 <= valor <= 28):
                raise HTTPException(status_code=400, detail=f"Dia de {campo} precisa ser entre 1 e 28.")

    _, ref = db.collection("contas").add({
        "orcamentoId": orcamento_id,
        "nome": body.nome.strip(),
        "tipo": body.tipo,
        "saldoInicial": body.saldoInicial,
        "limite": body.limite,
        "diaFechamento": body.diaFechamento,
        "diaVencimento": body.diaVencimento,
        "cor": body.cor,
        "arquivada": False,
        "criadoPorUid": user["uid"],
        "criadoEm": datetime.now(timezone.utc),
    })
    return {"status": "ok", "id": ref.id}


@router.put("/orcamentos/{orcamento_id}/contas/{conta_id}")
async def atualizar_conta(orcamento_id: str, conta_id: str, body: ContaInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("contas").document(conta_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    ref.update({
        "nome": body.nome.strip(),
        "tipo": body.tipo,
        "saldoInicial": body.saldoInicial,
        "limite": body.limite,
        "diaFechamento": body.diaFechamento,
        "diaVencimento": body.diaVencimento,
        "cor": body.cor,
    })
    return {"status": "ok"}


@router.delete("/orcamentos/{orcamento_id}/contas/{conta_id}")
async def excluir_conta(orcamento_id: str, conta_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("contas").document(conta_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")

    # Lançamentos já feitos nessa conta ficam sem conta, em vez de sumirem
    vinculados = db.collection("gastos").where("contaId", "==", conta_id).stream()
    for g in vinculados:
        g.reference.update({"contaId": None})

    ref.delete()
    return {"status": "ok"}
