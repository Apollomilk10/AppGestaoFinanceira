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
