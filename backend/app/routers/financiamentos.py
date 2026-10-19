from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..financiamento import resumo
from ..firebase import db
from ..models import FinanciamentoInput

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
            **_situacao(d, rd.get("vezesGeradas", 0), rd.get("ativo", False)),
        })
    rows.sort(key=lambda r: r["nome"].lower())
    return {"rows": rows}


@router.post("/orcamentos/{orcamento_id}/financiamentos")
async def criar_financiamento(orcamento_id: str, body: FinanciamentoInput, user: dict = Depends(get_current_user)):
    """Cadastra o financiamento e já cria a conta recorrente parcelada que
    lança a parcela de cada mês (valores variáveis no caso do SAC)."""
    await exigir_membro(orcamento_id, user["uid"])
    _validar(body)

    restantes = body.prazoMeses - body.parcelasPagas
    r = resumo(body.valorFinanciado, body.taxaAnual, body.prazoMeses, body.sistema, body.parcelasPagas, body.seguroMensal)
    if body.valorParcela:
        valores, valor = None, body.valorParcela
    else:
        valores, valor = r["valores"], r["valores"][0]

    agora = datetime.now(timezone.utc)
    _, rec_ref = db.collection("recorrentes").add({
        "orcamentoId": orcamento_id,
        "descricao": body.nome.strip(),
        "valor": valor,
        "valores": valores,
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
