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
    tipo: str = "despesa"  # "despesa" ou "receita"
    novoOrcamentoId: Optional[str] = None


class CategoriaInput(BaseModel):
    categoriaChave: str
    categoriaLabel: str
    subcategoriaChave: Optional[str] = ""
    subcategoriaLabel: Optional[str] = ""


class FeedbackInput(BaseModel):
    mensagem: str


class MetaInput(BaseModel):
    nome: str
    valorAlvo: float
    dataAlvo: Optional[str] = None


class MetaAporteInput(BaseModel):
    valor: float


class RecorrenteInput(BaseModel):
    descricao: str
    valor: float
    categoria: str = "outro"
    etapa: str = "nao_especificada"
    tipo: str = "despesa"
    diaDoMes: int = 1
    ativo: bool = True
