from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import RecorrenteInput

router = APIRouter(tags=["recorrentes"])


def _serializar(doc) -> dict:
    data = doc.to_dict()
    return {
        "id": doc.id,
        "descricao": data.get("descricao", ""),
        "valor": data.get("valor", 0),
        "categoria": data.get("categoria", "outro"),
        "etapa": data.get("etapa", "nao_especificada"),
        "tipo": data.get("tipo", "despesa"),
        "diaDoMes": data.get("diaDoMes", 1),
        "ativo": data.get("ativo", True),
        "parcelas": data.get("parcelas"),
        "vezesGeradas": data.get("vezesGeradas", 0),
    }


@router.get("/orcamentos/{orcamento_id}/recorrentes")
async def listar_recorrentes(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("recorrentes").where("orcamentoId", "==", orcamento_id).stream()
    return {"rows": [_serializar(d) for d in docs]}


@router.post("/orcamentos/{orcamento_id}/recorrentes")
async def criar_recorrente(orcamento_id: str, body: RecorrenteInput, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    if body.valor <= 0:
        raise HTTPException(status_code=400, detail="Valor inválido.")
    if not (1 <= body.diaDoMes <= 28):
        raise HTTPException(status_code=400, detail="Dia do mês precisa ser entre 1 e 28.")

    if body.parcelas is not None and body.parcelas < 1:
        raise HTTPException(status_code=400, detail="Número de parcelas precisa ser pelo menos 1.")

    db.collection("recorrentes").add({
        "orcamentoId": orcamento_id,
        "descricao": body.descricao.strip(),
        "valor": body.valor,
        "categoria": body.categoria,
        "etapa": body.etapa,
        "tipo": body.tipo if body.tipo in ("despesa", "receita") else "despesa",
        "diaDoMes": body.diaDoMes,
        "ativo": True,
        "parcelas": body.parcelas,  # None = recorrente fixa; número = parcelado
        "vezesGeradas": 0,
        "ultimoMesGerado": "",
        "criadoPorUid": user["uid"],
        "criadoPorEmail": user["email"],
        "criadoPorNome": user.get("name", user["email"]),
        "criadoEm": datetime.now(timezone.utc),
    })
    return {"status": "ok"}


@router.delete("/orcamentos/{orcamento_id}/recorrentes/{recorrente_id}")
async def excluir_recorrente(orcamento_id: str, recorrente_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("recorrentes").document(recorrente_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada.")
    ref.delete()
    return {"status": "ok"}


@router.post("/orcamentos/{orcamento_id}/recorrentes/processar")
async def processar_recorrentes(orcamento_id: str, user: dict = Depends(get_current_user)):
    """Gera automaticamente os lançamentos do mês atual pra cada conta
    recorrente ativa que ainda não foi gerada nesse mês. Chamado sempre
    que o app carrega os gastos de um orçamento."""
    await exigir_membro(orcamento_id, user["uid"])

    agora = datetime.now(timezone.utc)
    mes_atual = agora.strftime("%Y-%m")
    criados = 0

    docs = db.collection("recorrentes").where("orcamentoId", "==", orcamento_id).where("ativo", "==", True).stream()
    for d in docs:
        data = d.to_dict()
        if data.get("ultimoMesGerado") == mes_atual:
            continue

        parcelas = data.get("parcelas")
        vezes_geradas = data.get("vezesGeradas", 0)
        if parcelas is not None and vezes_geradas >= parcelas:
            d.reference.update({"ativo": False})
            continue

        numero_parcela = vezes_geradas + 1
        sufixo = f" (parcela {numero_parcela}/{parcelas})" if parcelas else " (recorrente)"

        data_lancamento = agora.replace(day=min(data.get("diaDoMes", 1), 28))
        db.collection("gastos").add({
            "orcamentoId": orcamento_id,
            "data": data_lancamento.strftime("%d/%m/%Y"),
            "categoria": data.get("categoria", "outro"),
            "descricao": data.get("descricao", "") + sufixo,
            "valor": data.get("valor", 0),
            "responsavel": data.get("criadoPorEmail", ""),
            "etapa": data.get("etapa", "nao_especificada"),
            "tipo": data.get("tipo", "despesa"),
            "criadoPorUid": data.get("criadoPorUid"),
            "criadoPorEmail": data.get("criadoPorEmail", ""),
            "criadoPorNome": data.get("criadoPorNome", data.get("criadoPorEmail", "")),
            "criadoEm": agora,
            "geradoDeRecorrente": d.id,
        })

        atualizacao = {"ultimoMesGerado": mes_atual, "vezesGeradas": numero_parcela}
        if parcelas is not None and numero_parcela >= parcelas:
            atualizacao["ativo"] = False
        d.reference.update(atualizacao)
        criados += 1

    return {"status": "ok", "criados": criados}
