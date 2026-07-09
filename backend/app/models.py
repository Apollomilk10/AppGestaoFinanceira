from typing import Optional
from pydantic import BaseModel


class CriarOrcamento(BaseModel):
    nome: str


class EntrarOrcamento(BaseModel):
    codigo: str


class GastoInput(BaseModel):
    data: Optional[str] = None
    categoria: str = "outro"
    descricao: str = ""
    valor: float
    responsavel: str = ""
    etapa: str = "nao_especificada"


class CategoriaInput(BaseModel):
    categoriaChave: str
    categoriaLabel: str
    subcategoriaChave: Optional[str] = ""
    subcategoriaLabel: Optional[str] = ""


class FeedbackInput(BaseModel):
    mensagem: str
