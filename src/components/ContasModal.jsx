import { useEffect, useState } from 'react';
import { Wallet, CreditCard, PiggyBank, Landmark, Trash2, Plus, ChevronDown } from 'lucide-react';
import { fetchContas, criarConta, excluirConta } from '../services/contas';
import { faturasDoCartao, limiteUsado, saldoDaConta } from '../utils/fatura';

const TIPOS = [
  { valor: 'corrente', label: 'Conta corrente', icone: Landmark },
  { valor: 'carteira', label: 'Dinheiro', icone: Wallet },
  { valor: 'poupanca', label: 'Poupança', icone: PiggyBank },
  { valor: 'cartao', label: 'Cartão de crédito', icone: CreditCard },
];

function brl(v) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const FORM_VAZIO = {
  nome: '', tipo: 'corrente', saldoInicial: '', limite: '', diaFechamento: '', diaVencimento: '',
};

export default function ContasModal({ orcamentoId, rows, onClose, onChanged }) {
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [expandida, setExpandida] = useState(null);

  async function carregar() {
    setCarregando(true);
    try {
      setContas(await fetchContas(orcamentoId));
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoId]);

  function set(campo, valor) {
    setForm((p) => ({ ...p, [campo]: valor }));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) return setErro('Dê um nome para a conta.');
    if (form.tipo === 'cartao' && (!form.diaFechamento || !form.diaVencimento)) {
      return setErro('Informe os dias de fechamento e vencimento do cartão.');
    }
    try {
      await criarConta(orcamentoId, {
        nome: form.nome.trim(),
        tipo: form.tipo,
        saldoInicial: Number(form.saldoInicial) || 0,
        limite: form.limite ? Number(form.limite) : null,
        diaFechamento: form.diaFechamento ? Number(form.diaFechamento) : null,
        diaVencimento: form.diaVencimento ? Number(form.diaVencimento) : null,
      });
      setForm(FORM_VAZIO);
      setCriando(false);
      carregar();
      onChanged?.();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function remover(id) {
    try {
      await excluirConta(orcamentoId, id);
      carregar();
      onChanged?.();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__header">
          <h2>Contas e cartões</h2>
          <button type="button" className="link-button mono" onClick={onClose}>fechar</button>
        </div>

        {erro && <p className="field-error">{erro}</p>}

        {!criando && (
          <button className="linha linha--clicavel" onClick={() => setCriando(true)}>
            <Plus size={17} className="text-muted" />
            <div className="linha__corpo">
              <span className="linha__nome">Adicionar conta ou cartão</span>
            </div>
          </button>
        )}

        {criando && (
          <form className="inline-add inline-add--stack" onSubmit={salvar}>
            <input
              type="text" value={form.nome} autoFocus
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome (ex: Nubank, Carteira)"
            />
            <select value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
            </select>

            {form.tipo === 'cartao' ? (
              <>
                <input
                  type="number" min="0" step="0.01" value={form.limite}
                  onChange={(e) => set('limite', e.target.value)}
                  placeholder="Limite do cartão (opcional)"
                />
                <div className="field-row">
                  <input
                    type="number" min="1" max="28" value={form.diaFechamento}
                    onChange={(e) => set('diaFechamento', e.target.value)}
                    placeholder="Fecha dia"
                  />
                  <input
                    type="number" min="1" max="28" value={form.diaVencimento}
                    onChange={(e) => set('diaVencimento', e.target.value)}
                    placeholder="Vence dia"
                  />
                </div>
              </>
            ) : (
              <input
                type="number" step="0.01" value={form.saldoInicial}
                onChange={(e) => set('saldoInicial', e.target.value)}
                placeholder="Saldo que já tem hoje (opcional)"
              />
            )}

            <div className="sidebar__form-actions">
              <button type="submit" className="primary-button">criar</button>
              <button type="button" className="link-button" onClick={() => { setCriando(false); setErro(''); }}>
                cancelar
              </button>
            </div>
          </form>
        )}

        {!carregando && contas.length === 0 && !criando && (
          <p className="text-muted" style={{ fontSize: 13 }}>
            Nenhuma conta ainda. Crie uma para saber de onde cada gasto saiu.
          </p>
        )}

        {contas.map((c) => {
          const Icone = TIPOS.find((t) => t.valor === c.tipo)?.icone || Wallet;
          const cartao = c.tipo === 'cartao';
          const faturas = cartao ? faturasDoCartao(rows, c) : [];
          const usado = cartao ? limiteUsado(rows, c) : 0;
          const pctLimite = cartao && c.limite ? Math.min((usado / c.limite) * 100, 100) : 0;
          const aberta = expandida === c.id;

          return (
            <div key={c.id} style={{ borderTop: '1px solid var(--panel-border)' }}>
              <div className="linha" style={{ borderTop: 'none' }}>
                <Icone size={17} className="text-muted" />
                <button
                  className="linha__corpo"
                  style={{ background: 'none', border: 'none', textAlign: 'left', cursor: cartao ? 'pointer' : 'default', padding: 0 }}
                  onClick={() => cartao && setExpandida(aberta ? null : c.id)}
                >
                  <span className="linha__nome">
                    {c.nome}
                    {cartao && faturas.length > 0 && (
                      <ChevronDown
                        size={13}
                        style={{ marginLeft: 5, verticalAlign: -2, transform: aberta ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
                      />
                    )}
                  </span>
                  <span className="linha__sub">
                    {cartao
                      ? `fecha dia ${c.diaFechamento} · vence dia ${c.diaVencimento}`
                      : TIPOS.find((t) => t.valor === c.tipo)?.label}
                  </span>
                  {cartao && c.limite > 0 && (
                    <div className="linha__barra" style={{ marginTop: 5 }}>
                      <div
                        className="linha__barra-fill"
                        style={{ width: `${pctLimite}%`, background: pctLimite > 85 ? 'var(--danger)' : 'var(--accent)' }}
                      />
                    </div>
                  )}
                </button>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="linha__valor">
                    {cartao ? brl(usado) : brl(saldoDaConta(rows, c))}
                  </div>
                  {cartao && c.limite > 0 && (
                    <div className="linha__sub">de {brl(c.limite)}</div>
                  )}
                </div>
                <button className="icon-button icon-button--danger" onClick={() => remover(c.id)} aria-label="Excluir conta">
                  <Trash2 size={13} />
                </button>
              </div>

              {cartao && aberta && (
                <div style={{ paddingLeft: 29, paddingBottom: 10 }}>
                  {faturas.length === 0 && (
                    <p className="text-muted" style={{ fontSize: 12 }}>Nenhuma compra nesse cartão ainda.</p>
                  )}
                  {faturas.slice(0, 6).map((f) => (
                    <div key={f.chave} className="linha" style={{ padding: '7px 0' }}>
                      <div className="linha__corpo">
                        <span className="linha__nome" style={{ fontSize: 12.5 }}>
                          Fatura de {f.referencia.toLocaleDateString('pt-BR', { month: 'long' })}
                          {f.aberta ? ' · aberta' : ''}
                        </span>
                        <span className="linha__sub">
                          vence {f.vencimento.toLocaleDateString('pt-BR')} · {f.itens.length} compra{f.itens.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="linha__valor" style={{ fontSize: 13 }}>{brl(f.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
