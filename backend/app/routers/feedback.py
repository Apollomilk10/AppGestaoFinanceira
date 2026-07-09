from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_current_user
from ..firebase import db
from ..models import FeedbackInput

router = APIRouter(tags=["feedback"])


@router.post("/feedback")
async def enviar_feedback(body: FeedbackInput, user: dict = Depends(get_current_user)):
    mensagem = body.mensagem.strip()
    if not mensagem:
        raise HTTPException(status_code=400, detail="Mensagem vazia.")

    db.collection("feedback").add({
        "mensagem": mensagem,
        "email": user["email"],
        "criadoEm": datetime.now(timezone.utc),
    })
    return {"status": "ok"}
