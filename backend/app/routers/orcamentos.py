from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import gerar_codigo, buscar_orcamento_por_codigo, membro_doc_id, exigir_membro
from ..firebase import db
import re

from ..models import CriarOrcamento, EntrarOrcamento, CorIntegrante

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
        "nome": user.get("name", user["email"]),
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
        "nome": user.get("name", user["email"]),
        "dataEntrada": datetime.now(timezone.utc),
    })

    return {"orcamentoId": orcamento_id, "nome": nome}


def _garantir_orcamento_pessoal(user: dict) -> str:
    """Todo mundo tem um orçamento pessoal próprio, sempre presente,
    marcado com pessoal=True. Criado na primeira vez que for necessário
    (funciona tanto pra contas novas quanto pras que já existiam antes
    dessa funcionalidade)."""
    existentes = db.collection("orcamentos").where("criadoPorUid", "==", user["uid"]).where("pessoal", "==", True).limit(1).stream()
    for doc in existentes:
        return doc.id

    orcamento_ref = db.collection("orcamentos").document()
    orcamento_ref.set({
        "nome": "Meu espaço",
        "codigo": gerar_codigo(),
        "pessoal": True,
        "criadoPorUid": user["uid"],
        "criadoPorEmail": user["email"],
        "criadoEm": datetime.now(timezone.utc),
    })
    db.collection("membros").document(membro_doc_id(orcamento_ref.id, user["uid"])).set({
        "orcamentoId": orcamento_ref.id,
        "uid": user["uid"],
        "email": user["email"],
        "nome": user.get("name", user["email"]),
        "dataEntrada": datetime.now(timezone.utc),
    })
    return orcamento_ref.id


@router.get("")
async def listar_meus_orcamentos(user: dict = Depends(get_current_user)):
    _garantir_orcamento_pessoal(user)

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
                "criadoPorUid": data.get("criadoPorUid"),
                "pessoal": data.get("pessoal", False),
            })
    # o orçamento pessoal sempre vem primeiro na lista
    resultado.sort(key=lambda o: 0 if o["pessoal"] else 1)
    return {"rows": resultado}


@router.get("/{orcamento_id}/membros")
async def listar_membros(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    docs = db.collection("membros").where("orcamentoId", "==", orcamento_id).stream()
    resultado = [
        {
            "uid": d.to_dict().get("uid"),
            "email": d.to_dict().get("email"),
            "nome": d.to_dict().get("nome") or d.to_dict().get("email"),
            "cor": d.to_dict().get("cor"),
        }
        for d in docs
    ]
    return {"rows": resultado}


@router.put("/{orcamento_id}/membros/{membro_uid}/cor")
async def definir_cor_membro(
    orcamento_id: str, membro_uid: str, body: CorIntegrante, user: dict = Depends(get_current_user)
):
    """Define a cor de um integrante nos gráficos. Qualquer integrante do
    orçamento pode escolher a cor de qualquer um — é só preferência visual,
    compartilhada por todos que veem o orçamento."""
    await exigir_membro(orcamento_id, user["uid"])
    cor = body.cor.strip().lower()
    if not re.fullmatch(r"#[0-9a-f]{6}", cor):
        raise HTTPException(status_code=400, detail="Cor inválida.")
    ref = db.collection("membros").document(membro_doc_id(orcamento_id, membro_uid))
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Integrante não encontrado nesse orçamento.")
    ref.update({"cor": cor})
    return {"status": "ok", "cor": cor}


@router.delete("/{orcamento_id}")
async def excluir_orcamento(orcamento_id: str, user: dict = Depends(get_current_user)):
    doc_ref = db.collection("orcamentos").document(orcamento_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado.")

    if doc.to_dict().get("criadoPorUid") != user["uid"]:
        raise HTTPException(status_code=403, detail="Só quem criou o orçamento pode excluí-lo.")

    if doc.to_dict().get("pessoal"):
        raise HTTPException(status_code=403, detail="O orçamento pessoal não pode ser excluído.")

    # Limpeza em cascata: gastos, categorias, metas, recorrentes e membros
    for colecao in ("gastos", "categorias", "metas", "recorrentes"):
        docs = db.collection(colecao).where("orcamentoId", "==", orcamento_id).stream()
        for d in docs:
            d.reference.delete()

    membros = db.collection("membros").where("orcamentoId", "==", orcamento_id).stream()
    for m in membros:
        m.reference.delete()

    doc_ref.delete()
    return {"status": "ok"}
