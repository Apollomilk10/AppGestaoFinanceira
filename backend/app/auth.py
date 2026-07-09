from fastapi import Header, HTTPException
from firebase_admin import auth as firebase_auth

from .firebase import verify_token


async def get_current_user(authorization: str = Header(default="")) -> dict:
    """Espera um header 'Authorization: Bearer <token>' com o ID token
    gerado pelo Firebase Auth no front-end."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não enviado.")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        return verify_token(token)
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido. Faça login novamente.")
