"""Cálculo de financiamento (Price e SAC) para gerar a conta recorrente.

Taxa informada é a efetiva anual; a mensal sai de (1 + a)^(1/12) - 1.
Seguros e tarifas mensais entram somados em cada parcela.
"""


def taxa_mensal(taxa_anual: float) -> float:
    if taxa_anual <= 0:
        return 0.0
    return (1 + taxa_anual / 100) ** (1 / 12) - 1


def cronograma(valor: float, taxa_anual: float, prazo: int, sistema: str, extras: float = 0.0):
    """Devolve (parcelas, saldos): parcela k (1..prazo) e o saldo devedor
    antes de pagar a parcela k (saldos[k-1]); saldos[prazo] = saldo final."""
    i = taxa_mensal(taxa_anual)
    if sistema == "price":
        if i == 0:
            pmt = valor / prazo
        else:
            pmt = valor * i / (1 - (1 + i) ** -prazo)
    amort_sac = valor / prazo
    saldo = valor
    parcelas, saldos = [], [valor]
    for _ in range(prazo):
        juros = saldo * i
        amort = (pmt - juros) if sistema == "price" else amort_sac
        parcelas.append(round(juros + amort + extras, 2))
        saldo = max(0.0, saldo - amort)
        saldos.append(saldo)
    return parcelas, saldos


def resumo(valor: float, taxa_anual: float, prazo: int, sistema: str, pagas: int, extras: float = 0.0):
    parcelas, saldos = cronograma(valor, taxa_anual, prazo, sistema, extras)
    restantes = parcelas[pagas:]
    return {
        "valores": restantes,
        "saldoDevedor": round(saldos[pagas], 2),
        "totalRestante": round(sum(restantes), 2),
    }


def ratear(valor: float, percentuais: dict):
    """Divide `valor` entre os integrantes pelos percentuais (uid -> %),
    em centavos; a sobra de arredondamento vai para quem tem a maior fatia.
    Sem percentuais definidos, devolve [] (não há o que ratear)."""
    ativos = {u: p for u, p in percentuais.items() if p and p > 0}
    if not ativos:
        return []
    total_centavos = round(valor * 100)
    soma = sum(ativos.values())
    partes = {u: int(total_centavos * p / soma) for u, p in ativos.items()}
    resto = total_centavos - sum(partes.values())
    maior = max(ativos, key=lambda u: ativos[u])
    partes[maior] += resto
    return [(u, c / 100) for u, c in partes.items() if c > 0]


# --- Cronograma exato (demonstrativo do banco) ---------------------------

def normalizar_cronograma(itens) -> list:
    """Valida e devolve o cronograma como lista de dicts compactos
    ({n, d, v, s, p}), em ordem, com parcelas 1..N sem buracos."""
    from datetime import date

    crono = sorted(
        ({"n": i.n, "d": i.d, "v": round(i.v, 2), "s": round(i.s, 2), "p": bool(i.p)} for i in itens),
        key=lambda x: x["n"],
    )
    if not crono or len(crono) > 480:
        raise ValueError("Cronograma vazio ou com mais de 480 parcelas.")
    if [x["n"] for x in crono] != list(range(1, len(crono) + 1)):
        raise ValueError("As parcelas precisam ser sequenciais, de 1 até a última.")
    ultima = None
    for x in crono:
        try:
            dia = date.fromisoformat(x["d"])
        except ValueError:
            raise ValueError(f"Data inválida na parcela {x['n']}.")
        if x["v"] <= 0:
            raise ValueError(f"Valor inválido na parcela {x['n']}.")
        if ultima and dia <= ultima:
            raise ValueError("Os vencimentos precisam estar em ordem crescente.")
        ultima = dia
    # parcelas pagas vêm sempre antes das pendentes
    vistas_pendente = False
    for x in crono:
        if not x["p"]:
            vistas_pendente = True
        elif vistas_pendente:
            raise ValueError("Há parcela paga depois de uma pendente.")
    return crono


def agenda_pendente(crono: list, geradas) -> list:
    """Parcelas ainda não pagas nem lançadas: [{n, mes, valor}]."""
    geradas = set(geradas or [])
    return [
        {"n": x["n"], "mes": x["d"][:7], "valor": x["v"]}
        for x in crono
        if not x["p"] and x["n"] not in geradas
    ]


def situacao_cronograma(crono: list, geradas, valor_financiado: float) -> dict:
    geradas = set(geradas or [])
    lancadas = [x for x in crono if x["p"] or x["n"] in geradas]
    pend = [x for x in crono if not x["p"] and x["n"] not in geradas]
    saldo = lancadas[-1]["s"] if lancadas else valor_financiado
    return {
        "parcelasPagas": len(lancadas),
        "parcelasRestantes": len(pend),
        "proximaParcela": pend[0]["v"] if pend else 0,
        "proximaData": pend[0]["d"] if pend else None,
        "saldoDevedor": round(saldo, 2),
        "totalRestante": round(sum(x["v"] for x in pend), 2),
        "proximas": [{"n": x["n"], "d": x["d"], "v": x["v"]} for x in pend[:12]],
    }
