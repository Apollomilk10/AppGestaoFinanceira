from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..data import exigir_membro
from ..firebase import db
from ..models import GastoInput

router = APIRouter(tags=["gastos"])


def _mapa_membros(orcamento_id: str):
    """Monta dois mapas: uid -> nome, e email -> uid. Isso permite
    reconhecer lançamentos antigos que guardaram o e-mail (ou nome solto)
    no campo "responsavel", unificando com a identidade atual da pessoa."""
    docs = db.collection("membros").where("orcamentoId", "==", orcamento_id).stream()
    uid_para_nome = {}
    email_para_uid = {}
    for d in docs:
        data = d.to_dict()
        uid = data.get("uid")
        email = (data.get("email") or "").strip().lower()
        nome = data.get("nome") or data.get("email")
        uid_para_nome[uid] = nome
        if email:
            email_para_uid[email] = uid
    return uid_para_nome, email_para_uid


def _resolver_identidade(valor: str, uid_para_nome: dict, email_para_uid: dict):
    """Dado o que estiver salvo no campo 'responsavel' (pode ser um uid,
    um e-mail antigo, ou até um nome solto de versões bem antigas), tenta
    achar a pessoa real e devolve (chave_estavel, nome_atual)."""
    if not valor:
        return "nao_informado", "Não informado"

    if valor in uid_para_nome:
        return valor, uid_para_nome[valor]

    valor_normalizado = valor.strip().lower()
    if valor_normalizado in email_para_uid:
        uid = email_para_uid[valor_normalizado]
        return uid, uid_para_nome.get(uid, valor)

    # não conseguiu casar com ninguém atual do orçamento — mantém como veio
    return valor, valor


def _serializar(doc, uid_para_nome: dict, email_para_uid: dict) -> dict:
    data = doc.to_dict()
    responsavel = data.get("responsavel", "")
    _, nome_resolvido = _resolver_identidade(responsavel, uid_para_nome, email_para_uid)
    return {
        "id": doc.id,
        "data": data.get("data", ""),
        "categoria": data.get("categoria", "outro"),
        "descricao": data.get("descricao", ""),
        "valor": data.get("valor", 0),
        "responsavel": responsavel,
        # nome de exibição: resolvido AGORA a partir do perfil atual da
        # pessoa declarada em "Quem" — nunca um nome "congelado" antigo
        "responsavelNome": nome_resolvido,
        "etapa": data.get("etapa", "nao_especificada"),
        "tipo": data.get("tipo", "despesa"),
        "status": data.get("status", "confirmado"),
        "criadoPorEmail": data.get("criadoPorEmail", ""),
        "criadoPorNome": data.get("criadoPorNome", data.get("criadoPorEmail", "")),
    }


@router.get("/orcamentos/{orcamento_id}/gastos")
async def listar_gastos(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    uid_para_nome, email_para_uid = _mapa_membros(orcamento_id)
    docs = db.collection("gastos").where("orcamentoId", "==", orcamento_id).stream()
    rows = [_serializar(d, uid_para_nome, email_para_uid) for d in docs]
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
        "responsavel": body.responsavel,  # uid de quem foi declarado em "Quem"
        "etapa": body.etapa,
        "tipo": body.tipo if body.tipo in ("despesa", "receita") else "despesa",
        "status": body.status if body.status in ("confirmado", "projetado") else "confirmado",
        "criadoPorUid": user["uid"],
        "criadoPorEmail": user["email"],
        "criadoPorNome": user.get("name", user["email"]),
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
        "tipo": body.tipo if body.tipo in ("despesa", "receita") else "despesa",
        "status": body.status if body.status in ("confirmado", "projetado") else "confirmado",
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


@router.get("/orcamentos/{orcamento_id}/por-integrante")
async def gastos_por_integrante(orcamento_id: str, user: dict = Depends(get_current_user)):
    await exigir_membro(orcamento_id, user["uid"])
    uid_para_nome, email_para_uid = _mapa_membros(orcamento_id)
    docs = db.collection("gastos").where("orcamentoId", "==", orcamento_id).stream()

    resumo = {}
    for d in docs:
        data = d.to_dict()
        # Quebra por quem foi DECLARADO no campo "Quem" do lançamento —
        # não por quem efetivamente cadastrou no app. Casa por uid OU por
        # e-mail antigo, unificando com o nome atual da pessoa.
        bruto = data.get("responsavel") or ""
        chave, nome = _resolver_identidade(bruto, uid_para_nome, email_para_uid)
        valor = data.get("valor", 0)
        tipo = data.get("tipo", "despesa")

        if chave not in resumo:
            resumo[chave] = {"uid": chave, "nome": nome, "despesas": 0, "receitas": 0}
        if tipo == "receita":
            resumo[chave]["receitas"] += valor
        else:
            resumo[chave]["despesas"] += valor

    return {"rows": list(resumo.values())}


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
            "tipo": data.get("tipo", "despesa"),
            "status": data.get("status", "confirmado"),
            "orcamentoId": orcamento_id,
            "orcamentoNome": orcamento_nomes[orcamento_id],
        })
    return {"rows": rows}
