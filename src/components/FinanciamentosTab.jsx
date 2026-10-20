import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Landmark, Plus, Trash2 } from 'lucide-react';
import Spinner from './Spinner';
import { useOrcamentos } from '../context/OrcamentosContext';
import { criarFinanciamento, excluirFinanciamento, fetchFinanciamentos } from '../services/financiamentos';
import { previa } from '../utils/financiamento';
import { useMembros } from '../hooks/useMembros';

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const FORM_VAZIO = {
  nome: 'Financiamento imobiliário',
  valorFinanciado: '',
  taxaAnual: '',
  prazoMeses: '360',
  sistema: 'price',
  parcelasPagas: '0',
  diaVencimento: '5',
  seguroMensal: '',
  valorParcela: '',
};

/**
 * Financiamentos: cadastra o contrato (valor, juros, prazo) e gera a conta
 * recorrente que lança a parcela todo mês na aba Gastos.
 */
export default function FinanciamentosTab({ onChanged }) {
  const { filtroId } = useOrcamentos();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(false);
  const [confirmando, setConfirmando] = useState(null);

  const carregar = useCallback(async () => {
    if (!filtroId) return;
    try {
      setLista(await fetchFinanciamentos(filtroId));
      setErro('');
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar os financiamentos.');
    } finally {
      setCarregando(false);
    }
  }, [filtroId]);

  useEffect(() => {
    setCarregando(true);
    carregar();
  }, [carregar]);

  async function excluir(f) {
    try {
      await excluirFinanciamento(filtroId, f.id);
      setConfirmando(null);
      setLista((l) => l.filter((x) => x.id !== f.id));
    } catch (e) {
      setErro(e.message || 'Não foi possível excluir.');
    }
  }

  return (
    <div className="tab-content">
      <section className="secao">
        <h2 className="secao__titulo">Financiamentos</h2>
        <p className="text-muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          A parcela vira um gasto recorrente: todo mês ela entra sozinha na aba Gastos.
        </p>
        <button type="button" className="primary-button primary-button--full" onClick={() => setAbrindo(true)}>
          <Plus size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          Novo financiamento
        </button>
      </section>

      {erro && <p className="field-error">{erro}</p>}

      {carregando && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spinner size={24} />
        </div>
      )}

      {!carregando && lista.length === 0 && !erro && (
        <section className="secao">
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px 8px' }}>
            Nenhum financiamento ainda. Cadastre o do seu imóvel e acompanhe parcelas, saldo devedor e quanto falta pagar.
          </p>
        </section>
      )}

      {lista.map((f) => {
        const pct = Math.min(100, (f.parcelasPagas / f.prazoMeses) * 100);
        const pedindo = confirmando === f.id;
        return (
          <section key={f.id} className="secao fin-card">
            <div className="fin-card__topo">
              <span className="fin-card__icone"><Landmark size={18} /></span>
              <div className="fin-card__titulo">
                <strong>{f.nome}</strong>
                <span className="text-muted">
                  {f.sistema === 'sac' ? 'SAC' : 'Price'} · {f.taxaAnual.toLocaleString('pt-BR')}% a.a. · vence dia {f.diaVencimento}
                </span>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`Excluir ${f.nome}`}
                onClick={() => setConfirmando(pedindo ? null : f.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="fin-card__progresso" role="img" aria-label={`${pct.toFixed(0)}% das parcelas lançadas`}>
              <div style={{ width: `${pct}%` }} />
            </div>
            <div className="fin-card__legenda text-muted">
              <span>{f.parcelasPagas} de {f.prazoMeses} parcelas</span>
              <span>{f.parcelasRestantes} restantes</span>
            </div>

            <div className="fin-card__grade">
              <div><span>Próxima parcela</span><b>{f.ativo ? brl(f.proximaParcela) : '—'}</b></div>
              <div><span>Saldo devedor</span><b>{brl(f.saldoDevedor)}</b></div>
              <div><span>Falta pagar</span><b>{brl(f.totalRestante)}</b></div>
              <div><span>Financiado</span><b>{brl(f.valorFinanciado)}</b></div>
            </div>

            {!f.ativo && f.parcelasRestantes === 0 && (
              <p className="text-good" style={{ fontSize: 13, marginTop: 8 }}>Quitado 🎉</p>
            )}

            {pedindo && (
              <div className="confirmar-exclusao">
                <span className="confirmar-exclusao__pergunta">
                  Excluir este financiamento? As parcelas futuras deixam de ser lançadas; o que já está em Gastos fica.
                </span>
                <div className="confirmar-exclusao__botoes">
                  <button type="button" className="confirmar-exclusao__perigo" onClick={() => excluir(f)}>
                    Excluir
                  </button>
                  <button type="button" onClick={() => setConfirmando(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {abrindo && (
        <NovoFinanciamento
          orcamentoId={filtroId}
          onClose={() => setAbrindo(false)}
          onSaved={() => {
            setAbrindo(false);
            carregar();
            // a primeira parcela é lançada ao recarregar os gastos
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}

function NovoFinanciamento({ orcamentoId, onClose, onSaved }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const calc = useMemo(() => previa(form), [form]);
  const { membros } = useMembros(orcamentoId);
  // Quanto cabe a cada um na primeira parcela (só se a divisão foi definida).
  const divisao = membros.filter((m) => m.percentual > 0);

  async function salvar(e) {
    e.preventDefault();
    if (!calc) {
      setErro('Confira valor financiado, prazo e parcelas já pagas.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await criarFinanciamento(orcamentoId, {
        nome: form.nome.trim() || 'Financiamento',
        valorFinanciado: Number(form.valorFinanciado),
        taxaAnual: Number(form.taxaAnual) || 0,
        prazoMeses: Number(form.prazoMeses),
        sistema: form.sistema,
        parcelasPagas: Number(form.parcelasPagas) || 0,
        diaVencimento: Number(form.diaVencimento) || 5,
        seguroMensal: Number(form.seguroMensal) || 0,
        valorParcela: Number(form.valorParcela) > 0 ? Number(form.valorParcela) : null,
      });
      onSaved();
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar.');
      setSalvando(false);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={salvar}>
        <div className="sheet__header">
          <h2>Novo financiamento</h2>
          <button type="button" className="link-button mono" onClick={onClose}>fechar</button>
        </div>

        <label className="field">
          <span>Nome</span>
          <input type="text" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
        </label>

        <div className="fin-duo">
          <label className="field">
            <span>Valor financiado</span>
            <div className="field__prefix">
              <span className="mono">R$</span>
              <input
                type="number" inputMode="decimal" min="0" step="0.01" required autoFocus
                value={form.valorFinanciado} onChange={(e) => set('valorFinanciado', e.target.value)}
                placeholder="300000"
              />
            </div>
          </label>
          <label className="field">
            <span>Juros ao ano (%)</span>
            <input
              type="number" inputMode="decimal" min="0" max="60" step="0.01"
              value={form.taxaAnual} onChange={(e) => set('taxaAnual', e.target.value)}
              placeholder="10,5"
            />
          </label>
        </div>

        <div className="fin-duo">
          <label className="field">
            <span>Prazo (meses)</span>
            <input
              type="number" inputMode="numeric" min="1" max="480" required
              value={form.prazoMeses} onChange={(e) => set('prazoMeses', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Parcelas já pagas</span>
            <input
              type="number" inputMode="numeric" min="0"
              value={form.parcelasPagas} onChange={(e) => set('parcelasPagas', e.target.value)}
            />
          </label>
        </div>

        <div className="fin-duo">
          <div className="field">
            <span>Sistema</span>
            <div className="mode-toggle mode-toggle--small">
              {[['price', 'Price (fixa)'], ['sac', 'SAC (cai)']].map(([id, rotulo]) => (
                <button
                  key={id} type="button"
                  className={form.sistema === id ? 'mode-toggle__active' : ''}
                  onClick={() => set('sistema', id)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Vence todo dia</span>
            <input
              type="number" inputMode="numeric" min="1" max="28"
              value={form.diaVencimento} onChange={(e) => set('diaVencimento', e.target.value)}
            />
          </label>
        </div>

        <button type="button" className="mais-opcoes" onClick={() => setMais((v) => !v)} aria-expanded={mais}>
          Seguros e valor exato da parcela
          <ChevronDown size={16} className={mais ? 'mais-opcoes__seta mais-opcoes__seta--aberta' : 'mais-opcoes__seta'} />
        </button>

        {mais && (
          <div className="mais-opcoes__corpo">
            <label className="field">
              <span>Seguros e tarifas por mês</span>
              <div className="field__prefix">
                <span className="mono">R$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01"
                  value={form.seguroMensal} onChange={(e) => set('seguroMensal', e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </label>
            <label className="field">
              <span>Valor da parcela (se já souber)</span>
              <div className="field__prefix">
                <span className="mono">R$</span>
                <input
                  type="number" inputMode="decimal" min="0" step="0.01"
                  value={form.valorParcela} onChange={(e) => set('valorParcela', e.target.value)}
                  placeholder="usa este valor em vez do cálculo"
                />
              </div>
            </label>
          </div>
        )}

        {calc ? (
          <div className="fin-previa">
            <div>
              <span className="text-muted">{form.valorParcela ? 'Parcela' : 'Primeira parcela (estimada)'}</span>
              <b>{brl(calc.primeira)}</b>
            </div>
            {form.sistema === 'sac' && !form.valorParcela && (
              <div><span className="text-muted">Última parcela</span><b>{brl(calc.ultima)}</b></div>
            )}
            <div><span className="text-muted">Saldo devedor hoje</span><b>{brl(calc.saldoDevedor)}</b></div>
            <div><span className="text-muted">Falta pagar ({calc.restantes}x)</span><b>{brl(calc.totalRestante)}</b></div>
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: 12 }}>
            Preencha valor financiado e prazo para ver a parcela.
          </p>
        )}
        {calc && divisao.length > 0 && (
          <div className="fin-divisao">
            <span className="text-muted">Cada um paga na primeira parcela</span>
            {divisao.map((m) => (
              <div key={m.uid}>
                <span>{m.nome} · {m.percentual.toLocaleString('pt-BR')}%</span>
                <b>{brl((calc.primeira * m.percentual) / 100)}</b>
              </div>
            ))}
          </div>
        )}
        {calc && divisao.length === 0 && membros.length > 1 && (
          <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
            Dica: defina a parte de cada integrante (menu do orçamento → Integrantes) para a parcela ser dividida entre vocês.
          </p>
        )}
        <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
          Vai criar um gasto recorrente em Moradia, todo dia {form.diaVencimento || 5}, pelas {calc?.restantes ?? '…'} parcelas que faltam.
          A taxa é a efetiva anual do contrato; a TR e reajustes não entram — se a parcela do banco for diferente, informe o valor exato.
        </p>

        {erro && <p className="field-error">{erro}</p>}

        <button type="submit" className="primary-button primary-button--full" disabled={salvando}>
          {salvando ? 'salvando…' : 'salvar e gerar gasto recorrente'}
        </button>
      </form>
    </div>
  );
}
