import json
import os

import firebase_admin
from firebase_admin import credentials, firestore, auth

_CREDENTIALS_JSON = os.environ.get("FIREBASE_CREDENTIALS_JSON")

if not firebase_admin._apps:
    if _CREDENTIALS_JSON:
        cred_info = json.loads(_CREDENTIALS_JSON)
        cred = credentials.Certificate(cred_info)
    else:
        # Em produção sempre esperamos FIREBASE_CREDENTIALS_JSON definida.
        # Isso só cai aqui em ambiente local se a variável não foi setada.
        raise RuntimeError(
            "FIREBASE_CREDENTIALS_JSON não definida. Configure essa variável "
            "de ambiente com o conteúdo do JSON da conta de serviço do Firebase."
        )
    firebase_admin.initialize_app(cred)

db = firestore.client()


def verify_token(id_token: str) -> dict:
    """Verifica o token do Firebase Auth enviado pelo front e retorna
    os dados do usuário (uid, email, nome)."""
    decoded = auth.verify_id_token(id_token)
    return {
        "uid": decoded["uid"],
        "email": decoded.get("email", "").lower(),
        "name": decoded.get("name", "") or decoded.get("email", "").split("@")[0],
    }
