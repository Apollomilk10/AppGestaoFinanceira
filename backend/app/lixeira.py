"""Lixeira: o que é excluído fica guardado por 30 dias e pode voltar.

Cada item guarda os documentos apagados (coleção, id, conteúdo) e os campos
que a exclusão mudou em outros documentos (ex.: a recorrência que foi
encerrada), para restaurar tudo do jeito que estava.
"""
from datetime import datetime, timedelta, timezone

from .firebase import db

DIAS_GUARDADO = 30


def guardar(orcamento_id: str, user: dict, tipo: str, descricao: str, docs: list, alteracoes: list | None = None,
            valor: float = 0, de_financiamento: bool = False) -> str:
    """docs: [(colecao, id, dados)]; alteracoes: [(colecao, id, campos_antes)]."""
    _, ref = db.collection("lixeira").add({
        "orcamentoId": orcamento_id,
        "tipo": tipo,  # lancamentos | financiamento | parcelamento
        "descricao": descricao,
        "valor": round(valor, 2),
        "quantidade": len(docs) if tipo == "lancamentos" else 1,
        "deFinanciamento": de_financiamento,
        "docs": [{"colecao": c, "id": i, "dados": d} for c, i, d in docs],
        "alteracoes": [{"colecao": c, "id": i, "campos": f} for c, i, f in (alteracoes or [])],
        "excluidoEm": datetime.now(timezone.utc),
        "excluidoPorUid": user["uid"],
        "excluidoPorNome": user.get("name", user.get("email", "")),
    })
    return ref.id


def expirado(excluido_em) -> bool:
    if not excluido_em:
        return False
    if excluido_em.tzinfo is None:
        excluido_em = excluido_em.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - excluido_em > timedelta(days=DIAS_GUARDADO)


def restaurar(item: dict) -> int:
    """Recoloca os documentos (sem sobrescrever o que já existe) e desfaz as
    alterações. Devolve quantos documentos voltaram."""
    voltaram = 0
    for d in item.get("docs", []):
        ref = db.collection(d["colecao"]).document(d["id"])
        if not ref.get().exists:
            ref.set(d["dados"])
            voltaram += 1
    for a in item.get("alteracoes", []):
        ref = db.collection(a["colecao"]).document(a["id"])
        if ref.get().exists:
            ref.update(a["campos"])
    return voltaram
