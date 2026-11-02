import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, CreditCard, FileUp, Landmark, Plus, Trash2 } from 'lucide-react';
import Spinner from './Spinner';
import { useOrcamentos } from '../context/OrcamentosContext';
import { atualizarCronograma, criarFinanciamento, excluirFinanciamento, fetchFinanciamentos } from '../services/financiamentos';
import { lerPdfDDC } from '../utils/ddcParser';
import { previa } from '../utils/financiamento';
import { useMembros } from '../hooks/useMembros';
import { useCategories } from '../context/CategoriesContext';
import CategoryPicker from './CategoryPicker';

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

function mesAno(aaaamm) {
  if (!aaaamm) return '—';
  const [a, m] = aaaamm.split('-').map(Number);
  const txt = new Date(a, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  return txt.replace('.', '').replace(' de ', '/');
}

/**
 * Financiamentos e parcelamentos: o contrato do imóvel (valor, juros, prazo
 * ou as parcelas exatas do banco) e as compras/dívidas parceladas de cada
 * um. Tudo vira conta recorrente que lança a parcela do mês na aba Gastos.
 */
export default function FinanciamentosTab({ onChanged }) {
  const { filtroId } = useOrcamentos();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [abrindo, setAbrindo] = useState(null); // null | 'financiamento' | 'parcelamento'
  const { membros } = useMembros(filtroId);
  const { getCategoryMeta } = useCategories();
  const [confirmando, setConfirmando] = useState(null);
  const [importando, setImportando] = useState(null); // id do cartão lendo o PDF
  const [aviso, setAviso] = useState('');

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

  async function importarPdf(f, arquivo) {
    if (!arquivo) return;
    setImportando(f.id);
    setErro('');
    setAviso('');
    try {
      const r = await lerPdfDDC(arquivo);
      await atualizarCronograma(filtroId, f.id, {
        cronograma: r.cronograma,
        valorFinanciado: r.valorOperacao,
        taxaAnual: r.taxaAnual,
        sistema: r.sistema,
      });
      await carregar();
      onChanged?.();
      setAviso(`Parcelas do banco importadas: ${r.cronograma.length} parcelas, ${r.pagas} já pagas.`);
    } catch (e) {
      setErro(e.message || 'Não foi possível importar o PDF.');
    } finally {
      setImportando(null);
    }
  }

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
        <h2 className="secao__titulo">Financiamentos e parcelamentos</h2>
        <p className="text-muted" style={{ fontSize: 13, margin: '0 0 12px' }}>
          Cada parcela vira um gasto recorrente: todo mês ela entra sozinha na aba Gastos, até acabar.
        </p>
        <div className="fin-acoes">
          <button type="button" className="primary-button" onClick={() => setAbrindo('financiamento')}>
            <Plus size={16} />
            Financiamento
          </button>
          <button type="button" className="primary-button" onClick={() => setAbrindo('parcelamento')}>
            <Plus size={16} />
            Parcelamento
          </button>
        </div>
      </section>

      {erro && <p className="field-error">{erro}</p>}
      {aviso && <p className="text-good" style={{ fontSize: 13 }}>{aviso}</p>}

      {carregando && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <Spinner size={24} />
        </div>
      )}

      {!carregando && lista.length === 0 && !erro && (
        <section className="secao">
          <p className="text-muted" style={{ textAlign: 'center', padding: '20px 8px' }}>
            Nada por aqui ainda. Cadastre o financiamento do imóvel ou um parcelamento (uma compra no cartão, um empréstimo, um acordo de dívida) e acompanhe quanto falta pagar.
          </p>
        </section>
      )}

      {[
        ['financiamento', 'Financiamentos'],
        ['parcelamento', 'Parcelamentos'],
      ].map(([tipo, titulo]) => {
        const itens = lista.filter((f) => (f.tipo || 'financiamento') === tipo);
        if (itens.length === 0) return null;
        return (
          <div key={tipo} className="fin-grupo">
            <h3 className="fin-grupo__titulo">
              {titulo} <span className="text-muted">· {brl(itens.reduce((t, f) => t + (f.ativo ? f.proximaParcela : 0), 0))}/mês</span>
            </h3>
            {itens.map((f) => (tipo === 'parcelamento' ? renderParcelamento(f) : renderFinanciamento(f)))}
          </div>
        );
      })}

      {abrindo === 'financiamento' && (
        <NovoFinanciamento
          orcamentoId={filtroId}
          onClose={() => setAbrindo(null)}
          onSaved={() => {
            setAbrindo(null);
            carregar();
            onChanged?.();
          }}
        />
      )}

      {abrindo === 'parcelamento' && (
        <NovoParcelamento
          membros={membros}
          orcamentoId={filtroId}
          onClose={() => setAbrindo(null)}
          onSaved={() => {
            setAbrindo(null);
            carregar();
            onChanged?.();
          }}
        />
      )}
    </div>
  );

  function confirmacao(f, rotulo) {
    if (confirmando !== f.id) return null;
    return (
      <div className="confirmar-exclusao">
        <span className="confirmar-exclusao__pergunta">
          Excluir {rotulo}? As parcelas futuras deixam de ser lançadas; o que já está em Gastos fica.
        </span>
        <div className="confirmar-exclusao__botoes">
          <button type="button" className="confirmar-exclusao__perigo" onClick={() => excluir(f)}>
            Excluir
          </button>
          <button type="button" onClick={() => setConfirmando(null)}>Cancelar</button>
        </div>
      </div>
    );
  }

  function renderParcelamento(f) {
    const pct = Math.min(100, (f.parcelasPagas / f.prazoMeses) * 100);
    const quem = f.responsavelUid
      ? membros.find((m) => m.uid === f.responsavelUid)?.nome || 'integrante'
      : 'dividido entre vocês';
    const cat = getCategoryMeta(f.categoria || 'outro');
    return (
      <section key={f.id} className="secao fin-card">
        <div className="fin-card__topo">
          <span className="fin-card__icone"><CreditCard size={18} /></span>
          <div className="fin-card__titulo">
            <strong>{f.nome}</strong>
            <span className="text-muted">
              {cat.label} · vence dia {f.diaVencimento} · {quem}
            </span>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={`Excluir ${f.nome}`}
            onClick={() => setConfirmando(confirmando === f.id ? null : f.id)}
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className="fin-card__progresso" role="img" aria-label={`${pct.toFixed(0)}% das parcelas lançadas`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="fin-card__legenda text-muted">
          <span>{f.parcelasPagas} de {f.prazoMeses} parcelas</span>
          <span>termina em {mesAno(f.terminaEm)}</span>
        </div>
        <div className="fin-card__grade">
          <div><span>Parcela</span><b>{brl(f.valorParcela || f.proximaParcela)}</b></div>
          <div><span>Falta pagar</span><b>{brl(f.totalRestante)}</b></div>
        </div>
        {!f.ativo && f.parcelasRestantes === 0 && (
          <p className="text-good" style={{ fontSize: 13, marginTop: 8 }}>Quitado 🎉</p>
        )}
        {confirmacao(f, 'este parcelamento')}
      </section>
    );
  }

  function renderFinanciamento(f) {
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
                  {f.exato ? ' · parcelas do banco' : ''}
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
              <span>{f.parcelasRestantes} restantes · até {mesAno(f.terminaEm)}</span>
            </div>

            <div className="fin-card__grade">
              <div><span>Próxima parcela</span><b>{f.ativo ? brl(f.proximaParcela) : '—'}</b></div>
              <div><span>Saldo devedor</span><b>{brl(f.saldoDevedor)}</b></div>
              <div><span>Falta pagar</span><b>{brl(f.totalRestante)}</b></div>
              <div><span>Financiado</span><b>{brl(f.valorFinanciado)}</b></div>
            </div>

            {f.proximas?.length > 0 && (
              <details className="fin-parcelas">
                <summary>Próximas parcelas</summary>
                {f.proximas.map((p) => (
                  <div key={p.n}>
                    <span>{p.n}/{f.prazoMeses} · {new Date(`${p.d}T00:00:00`).toLocaleDateString('pt-BR')}</span>
                    <b>{brl(p.v)}</b>
                  </div>
                ))}
              </details>
            )}

            <label className="fin-importar">
              <FileUp size={15} />
              {importando === f.id
                ? 'lendo o PDF…'
                : f.exato
                  ? 'Atualizar com um novo PDF do banco'
                  : 'Usar as parcelas exatas do PDF do banco'}
              <input
                type="file"
                accept="application/pdf"
                disabled={importando === f.id}
                onChange={(e) => {
                  importarPdf(f, e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>

            {!f.ativo && f.parcelasRestantes === 0 && (
              <p className="text-good" style={{ fontSize: 13, marginTop: 8 }}>Quitado 🎉</p>
            )}

            {pedindo && confirmacao(f, 'este financiamento')}
          </section>
        );
  }
}

function NovoFinanciamento({ orcamentoId, onClose, onSaved }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [mais, setMais] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const [pdf, setPdf] = useState(null); // cronograma lido do PDF do banco
  const [lendo, setLendo] = useState(false);
  const calcAuto = useMemo(() => previa(form), [form]);
  // Com o PDF, a prévia vem das parcelas do banco, não do cálculo.
  const calc = useMemo(() => {
    if (!pdf) return calcAuto;
    const pend = pdf.cronograma.filter((p) => !p.p);
    const pagas = pdf.cronograma.filter((p) => p.p);
    return {
      restantes: pend.length,
      primeira: pend[0]?.v ?? 0,
      ultima: pend[pend.length - 1]?.v ?? 0,
      saldoDevedor: pagas.length ? pagas[pagas.length - 1].s : pdf.valorOperacao,
      totalRestante: pend.reduce((s, p) => s + p.v, 0),
    };
  }, [pdf, calcAuto]);

  async function lerPdf(arquivo) {
    if (!arquivo) return;
    setLendo(true);
    setErro('');
    try {
      const r = await lerPdfDDC(arquivo);
      const pend = r.cronograma.filter((p) => !p.p);
      setPdf(r);
      setForm((p) => ({
        ...p,
        valorFinanciado: String(r.valorOperacao ?? p.valorFinanciado),
        taxaAnual: String(r.taxaAnual ?? p.taxaAnual),
        prazoMeses: String(r.cronograma.length),
        parcelasPagas: String(r.pagas),
        sistema: r.sistema || p.sistema,
        diaVencimento: String(Number(pend[0]?.d.slice(8, 10)) || p.diaVencimento),
        valorParcela: '',
      }));
    } catch (e) {
      setErro(e.message || 'Não foi possível ler o PDF.');
    } finally {
      setLendo(false);
    }
  }
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
        ...(pdf ? { cronograma: pdf.cronograma } : {}),
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

        <label className="fin-importar fin-importar--topo">
          <FileUp size={15} />
          {lendo ? 'lendo o PDF…' : pdf ? `PDF lido: ${pdf.cronograma.length} parcelas, ${pdf.pagas} pagas` : 'Importar o PDF do banco (parcelas exatas)'}
          <input
            type="file"
            accept="application/pdf"
            disabled={lendo}
            onChange={(e) => {
              lerPdf(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

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
              <span className="text-muted">{form.valorParcela || pdf ? 'Próxima parcela' : 'Primeira parcela (estimada)'}</span>
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
          {pdf
            ? `Vai lançar cada uma das ${calc.restantes} parcelas que faltam no vencimento e no valor do demonstrativo do banco (Moradia).`
            : `Vai criar um gasto recorrente em Moradia, todo dia ${form.diaVencimento || 5}, pelas ${calc?.restantes ?? '…'} parcelas que faltam. A taxa é a efetiva anual do contrato; a TR e reajustes não entram — se tiver o PDF do banco, importe-o acima.`}
        </p>

        {erro && <p className="field-error">{erro}</p>}

        <button type="submit" className="primary-button primary-button--full" disabled={salvando}>
          {salvando ? 'salvando…' : 'salvar e gerar gasto recorrente'}
        </button>
      </form>
    </div>
  );
}

function NovoParcelamento({ membros, orcamentoId, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: '',
    valorParcela: '',
    prazoMeses: '',
    parcelasPagas: '0',
    diaVencimento: String(Math.min(new Date().getDate(), 28)),
    categoria: 'outro',
    responsavelUid: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const parcela = Number(form.valorParcela) || 0;
  const prazo = Number(form.prazoMeses) || 0;
  const pagas = Number(form.parcelasPagas) || 0;
  const restantes = Math.max(0, prazo - pagas);
  const valido = form.nome.trim() && parcela > 0 && prazo >= 1 && pagas >= 0 && pagas < prazo;

  async function salvar(e) {
    e.preventDefault();
    if (!valido) {
      setErro('Preencha descrição, valor da parcela e número de parcelas (as já pagas precisam ser menos que o total).');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      await criarFinanciamento(orcamentoId, {
        tipo: 'parcelamento',
        nome: form.nome.trim(),
        valorFinanciado: parcela * prazo,
        valorParcela: parcela,
        prazoMeses: prazo,
        parcelasPagas: pagas,
        diaVencimento: Number(form.diaVencimento) || 5,
        categoria: form.categoria,
        responsavelUid: form.responsavelUid || null,
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
          <h2>Novo parcelamento</h2>
          <button type="button" className="link-button mono" onClick={onClose}>fechar</button>
        </div>

        <label className="field">
          <span>O que é</span>
          <input
            type="text" autoFocus value={form.nome} onChange={(e) => set('nome', e.target.value)}
            placeholder="ex: geladeira, empréstimo, acordo do cartão"
          />
        </label>

        <div className="fin-duo">
          <label className="field">
            <span>Valor da parcela</span>
            <div className="field__prefix">
              <span className="mono">R$</span>
              <input
                type="number" inputMode="decimal" min="0" step="0.01" required
                value={form.valorParcela} onChange={(e) => set('valorParcela', e.target.value)} placeholder="0,00"
              />
            </div>
          </label>
          <label className="field">
            <span>Nº de parcelas</span>
            <input
              type="number" inputMode="numeric" min="1" max="480" required
              value={form.prazoMeses} onChange={(e) => set('prazoMeses', e.target.value)} placeholder="ex: 10"
            />
          </label>
        </div>

        <div className="fin-duo">
          <label className="field">
            <span>Já pagas</span>
            <input
              type="number" inputMode="numeric" min="0"
              value={form.parcelasPagas} onChange={(e) => set('parcelasPagas', e.target.value)}
            />
          </label>
          <label className="field">
            <span>Vence todo dia</span>
            <input
              type="number" inputMode="numeric" min="1" max="28"
              value={form.diaVencimento} onChange={(e) => set('diaVencimento', e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Quem paga</span>
          <select value={form.responsavelUid} onChange={(e) => set('responsavelUid', e.target.value)}>
            <option value="">Dividir pela parte de cada um</option>
            {membros.map((m) => (
              <option key={m.uid} value={m.uid}>{m.nome}</option>
            ))}
          </select>
        </label>

        <div className="field">
          <span>Categoria</span>
          <CategoryPicker value={form.categoria} onChange={(v) => set('categoria', v)} />
        </div>

        {parcela > 0 && prazo > 0 && (
          <div className="fin-previa">
            <div><span className="text-muted">Total da compra/dívida</span><b>{brl(parcela * prazo)}</b></div>
            <div><span className="text-muted">Falta pagar ({restantes}x)</span><b>{brl(parcela * restantes)}</b></div>
          </div>
        )}
        <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 0' }}>
          A parcela entra em Gastos todo dia {form.diaVencimento || '…'}
          {restantes ? `, pelas ${restantes} parcelas que faltam, e para sozinha no fim` : ''}.
          {!form.responsavelUid && ' Sem um responsável, ela é dividida pela parte de cada integrante (Integrantes → Parte).'}
        </p>

        {erro && <p className="field-error">{erro}</p>}

        <button type="submit" className="primary-button primary-button--full" disabled={salvando}>
          {salvando ? 'salvando…' : 'salvar parcelamento'}
        </button>
      </form>
    </div>
  );
}
