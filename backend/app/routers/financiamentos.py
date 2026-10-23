from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..financiamento import resumo, normalizar_cronograma, situacao_cronograma
from ..firebase import db
from ..models import FinanciamentoInput, CronogramaInput

router = APIRouter(tags=["financiamentos"])


def _validar(b: FinanciamentoInput) -> None:
    if not b.nome.strip():
        raise HTTPException(status_code=400, detail="Dê um nome ao financiamento.")
    if b.valorFinanciado <= 0:
        raise HTTPException(status_code=400, detail="Valor financiado inválido.")
    if not (0 <= b.taxaAnual <= 60):
        raise HTTPException(status_code=400, detail="Taxa de juros anual precisa ficar entre 0% e 60%.")
    if not (1 <= b.prazoMeses <= 480):
        raise HTTPException(status_code=400, detail="Prazo precisa ficar entre 1 e 480 meses.")
    if b.sistema not in ("price", "sac"):
        raise HTTPException(status_code=400, detail="Sistema precisa ser Price ou SAC.")
    if not (0 <= b.parcelasPagas < b.prazoMeses):
        raise HTTPException(status_code=400, detail="Parcelas já pagas precisa ser menor que o prazo.")
    if not (1 <= b.diaVencimento <= 28):
        raise HTTPException(status_code=400, detail="O dia do vencimento precisa ser entre 1 e 28.")
    if b.seguroMensal < 0 or (b.valorParcela is not None and b.valorParcela <= 0):
        raise HTTPException(status_code=400, detail="Valores de parcela e seguros precisam ser positivos.")


def _aplicar_cronograma(body) -> list:
    """O cronograma do banco manda: prazo, parcelas pagas e vencimento saem dele."""
    try:
        crono = normalizar_cronograma(body.cronograma)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    pend = [x for x in crono if not x["p"]]
    if not pend:
        raise HTTPException(status_code=400, detail="Esse financiamento já está quitado no demonstrativo.")
    body.prazoMeses = len(crono)
    body.parcelasPagas = len(crono) - len(pend)
    body.diaVencimento = min(28, int(pend[0]["d"][8:10]))
    body.valorParcela = None
    if body.sistema not in ("price", "sac"):
        body.sistema = "sac"
    return crono


def _campos_cronograma(crono: list) -> dict:
    pend = [x for x in crono if not x["p"]]
    return {
        "cronograma": crono,
        "parcelasGeradas": [],
        "parcelas": len(pend),
        "parcelaInicial": pend[0]["n"],
        "parcelasTotal": len(crono),
        "diaDoMes": min(28, int(pend[0]["d"][8:10])),
        "vezesGeradas": 0,
        "ultimoMesGerado": "",
        "ativo": True,
    }


def _situacao(d: dict, geradas: int, ativo: bool) -> dict:
    """Quanto falta, em cima do que já foi lançado até agora."""
    pagas = min(d["prazoMeses"], d.get("parcelasPagas", 0) + geradas)
    r = resumo(d["valorFinanciado"], d["taxaAnual"], d["prazoMeses"], d["sistema"], pagas, d.get("seguroMensal", 0))
    fixa = d.get("valorParcela")
    restantes = d["prazoMeses"] - pagas
    if fixa:
        r["valores"] = [fixa] * restantes
        r["totalRestante"] = round(fixa * restantes, 2)
    return {
        "parcelasPagas": pagas,
        "parcelasRestantes": restantes,
        "proximaParcela": r["valores"][0] if r["valores"] else 0,
        "saldoDevedor": r["saldoDevedor"],
        "totalRestante": r["totalRestante"],
        "ativo": ativo and restantes > 0,
    }


@router.get("/orcamentos/{orcamento_id}/financiamentos")
async def listar_financiamentos(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("financiamentos").where("orcamentoId", "==", orcamento_id).stream()
    rows = []
    for doc in docs:
        d = doc.to_dict()
        rec = db.collection("recorrentes").document(d.get("recorrenteId", "_")).get()
        rd = rec.to_dict() if rec.exists else {}
        crono = rd.get("cronograma")
        if crono:
            situacao = {**situacao_cronograma(crono, rd.get("parcelasGeradas"), d["valorFinanciado"]),
                        "ativo": rd.get("ativo", False), "exato": True}
        else:
            situacao = _situacao(d, rd.get("vezesGeradas", 0), rd.get("ativo", False))
        rows.append({
            "id": doc.id,
            "nome": d.get("nome", ""),
            "valorFinanciado": d["valorFinanciado"],
            "taxaAnual": d["taxaAnual"],
            "prazoMeses": d["prazoMeses"],
            "sistema": d["sistema"],
            "diaVencimento": d.get("diaVencimento", 5),
            "seguroMensal": d.get("seguroMensal", 0),
            "valorParcela": d.get("valorParcela"),
            **situacao,
        })
    rows.sort(key=lambda r: r["nome"].lower())
    return {"rows": rows}


@router.post("/orcamentos/{orcamento_id}/financiamentos")
async def criar_financiamento(orcamento_id: str, body: FinanciamentoInput, user: dict = Depends(get_current_user)):
    """Cadastra o financiamento e já cria a conta recorrente parcelada que
    lança a parcela de cada mês (valores variáveis no caso do SAC)."""
    await exigir_membro(orcamento_id, user["uid"])
    crono = None
    if body.cronograma:
        crono = _aplicar_cronograma(body)
    _validar(body)

    restantes = body.prazoMeses - body.parcelasPagas
    r = resumo(body.valorFinanciado, body.taxaAnual, body.prazoMeses, body.sistema, body.parcelasPagas, body.seguroMensal)
    if body.valorParcela:
        valores, valor = None, body.valorParcela
    else:
        valores, valor = r["valores"], r["valores"][0]

    agora = datetime.now(timezone.utc)
    if crono:
        pend = [x for x in crono if not x["p"]]
        valor, valores = (pend[0]["v"] if pend else crono[-1]["v"]), None
    _, rec_ref = db.collection("recorrentes").add({
        "orcamentoId": orcamento_id,
        "descricao": body.nome.strip(),
        "valor": valor,
        "valores": valores,
        **(_campos_cronograma(crono) if crono else {}),
        "categoria": "moradia",
        "etapa": "nao_especificada",
        "tipo": "despesa",
        "diaDoMes": body.diaVencimento,
        "ativo": True,
        "parcelas": restantes,
        "parcelaInicial": body.parcelasPagas + 1,
        "parcelasTotal": body.prazoMeses,
        "vezesGeradas": 0,
        "ultimoMesGerado": "",
        "criadoPorUid": user["uid"],
        "criadoPorEmail": user["email"],
        "criadoPorNome": user.get("name", user["email"]),
        "criadoEm": agora,
    })
    _, fin_ref = db.collection("financiamentos").add({
        "orcamentoId": orcamento_id,
        "nome": body.nome.strip(),
        "valorFinanciado": body.valorFinanciado,
        "taxaAnual": body.taxaAnual,
        "prazoMeses": body.prazoMeses,
        "sistema": body.sistema,
        "parcelasPagas": body.parcelasPagas,
        "diaVencimento": body.diaVencimento,
        "seguroMensal": body.seguroMensal,
        "valorParcela": body.valorParcela,
        "exato": bool(crono),
        "recorrenteId": rec_ref.id,
        "criadoPorUid": user["uid"],
        "criadoEm": agora,
    })
    rec_ref.update({"financiamentoId": fin_ref.id})
    return {"status": "ok", "id": fin_ref.id, "parcelasRestantes": restantes, "proximaParcela": valor}


@router.delete("/orcamentos/{orcamento_id}/financiamentos/{financiamento_id}")
async def excluir_financiamento(orcamento_id: str, financiamento_id: str, user: dict = Depends(get_current_user)):
    """Remove o financiamento e a conta recorrente dele. Os lançamentos
    que já foram gerados continuam no histórico."""
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("financiamentos").document(financiamento_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Financiamento não encontrado.")
    rec_id = doc.to_dict().get("recorrenteId")
    if rec_id:
        db.collection("recorrentes").document(rec_id).delete()
    ref.delete()
    return {"status": "ok"}


@router.put("/orcamentos/{orcamento_id}/financiamentos/{financiamento_id}/cronograma")
async def atualizar_cronograma(
    orcamento_id: str, financiamento_id: str, body: CronogramaInput, user: dict = Depends(get_current_user)
):
    """Troca as parcelas calculadas pelas parcelas exatas do banco. A conta
    recorrente passa a lançar cada parcela no vencimento e no valor do
    demonstrativo. Lançamentos já gerados antes ficam como estão."""
    await exigir_membro(orcamento_id, user["uid"])
    ref = db.collection("financiamentos").document(financiamento_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("orcamentoId") != orcamento_id:
        raise HTTPException(status_code=404, detail="Financiamento não encontrado.")
    d = doc.to_dict()

    class _B:  # reaproveita a validação de _aplicar_cronograma
        cronograma = body.cronograma
        sistema = body.sistema or d.get("sistema")
        prazoMeses = parcelasPagas = diaVencimento = valorParcela = 0

    crono = _aplicar_cronograma(_B)
    campos = _campos_cronograma(crono)

    rec_id = d.get("recorrenteId")
    rec_ref = db.collection("recorrentes").document(rec_id) if rec_id else None
    pend = [x for x in crono if not x["p"]]
    base = {"valor": pend[0]["v"], "valores": None, **campos}
    if rec_ref is not None and rec_ref.get().exists:
        rec_ref.update(base)
    else:
        _, rec_ref = db.collection("recorrentes").add({
            "orcamentoId": orcamento_id,
            "descricao": d.get("nome", "Financiamento"),
            "categoria": "moradia",
            "etapa": "nao_especificada",
            "tipo": "despesa",
            "criadoPorUid": user["uid"],
            "criadoPorEmail": user["email"],
            "criadoPorNome": user.get("name", user["email"]),
            "criadoEm": datetime.now(timezone.utc),
            "financiamentoId": financiamento_id,
            **base,
        })
    ref.update({
        "prazoMeses": _B.prazoMeses,
        "parcelasPagas": _B.parcelasPagas,
        "diaVencimento": _B.diaVencimento,
        "sistema": _B.sistema,
        "valorParcela": None,
        "exato": True,
        "recorrenteId": rec_ref.id,
        **({"valorFinanciado": body.valorFinanciado} if body.valorFinanciado and body.valorFinanciado > 0 else {}),
        **({"taxaAnual": body.taxaAnual} if body.taxaAnual is not None and 0 <= body.taxaAnual <= 60 else {}),
    })
    return {"status": "ok", "parcelasRestantes": len(pend), "proximaParcela": pend[0]["v"]}
