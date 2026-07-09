import random
import string

from fastapi import HTTPException

from .firebase import db

CHARS_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sem caracteres ambíguos


def gerar_codigo() -> str:
    return "".join(random.choice(CHARS_CODIGO) for _ in range(6))


def membro_doc_id(orcamento_id: str, uid: str) -> str:
    return f"{orcamento_id}_{uid}"


async def exigir_membro(orcamento_id: str, uid: str) -> None:
    """Levanta 403 se o usuário não for membro do orçamento."""
    doc = db.collection("membros").document(membro_doc_id(orcamento_id, uid)).get()
    if not doc.exists:
        raise HTTPException(status_code=403, detail="Você não é membro desse orçamento.")


def buscar_orcamento_por_codigo(codigo: str):
    codigo = codigo.strip().upper()
    query = db.collection("orcamentos").where("codigo", "==", codigo).limit(1).stream()
    for doc in query:
        return doc
    return None
