import { useCallback, useEffect, useState } from 'react';
import { RotateCcw, Trash2, Undo2, X } from 'lucide-react';
import { apagarDeVez, fetchLixeira, restaurarDaLixeira } from '../services/lixeira';

function brl(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const EVENTO_LIXEIRA = 'casa:lixeira';

/** Avisa as listas de excluídos que algo novo foi para a lixeira. */
export function avisarLixeira() {
  window.dispatchEvent(new Event(EVENTO_LIXEIRA));
}

/**
 * Barra "Excluído · Desfazer" que aparece logo depois de uma exclusão e
 * some sozinha depois de alguns segundos.
 */
export function Desfazer({ texto, orcamentoId, lixeiraId, onRestaurado, onFechar }) {
  const [desfazendo, setDesfazendo] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (desfazendo) return undefined;
    const t = setTimeout(onFechar, 10000);
    return () => clearTimeout(t);
  }, [lixeiraId, desfazendo, onFechar]);

  async function desfazer() {
    setDesfazendo(true);
    setErro('');
    try {
      await restaurarDaLixeira(orcamentoId, lixeiraId);
      avisarLixeira();
      onRestaurado?.();
      onFechar();
    } catch (e) {
      setErro(e.message || 'Não deu para desfazer.');
      setDesfazendo(false);
    }
  }

  return (
    <div className="desfazer" role="status">
      <span className="desfazer__texto">{erro || texto}</span>
      <button type="button" className="desfazer__botao" onClick={desfazer} disabled={desfazendo}>
        <Undo2 size={15} />
        {desfazendo ? 'voltando…' : 'Desfazer'}
      </button>
      <button type="button" className="desfazer__fechar" onClick={onFechar} aria-label="Fechar">
        <X size={15} />
      </button>
    </div>
  );
}

const ROTULO = {
  financiamento: 'Financiamento',
  parcelamento: 'Parcelamento',
};

/**
 * "Excluídos recentemente": tudo que foi excluído nos últimos 30 dias, com
 * botão para restaurar. `soParcelas` mostra só o que é de financiamentos e
 * parcelamentos (o próprio contrato ou parcelas lançadas dele).
 */
export default function Lixeira({ orcamentoId, soParcelas = false, onRestaurado }) {
  const [itens, setItens] = useState([]);
  const [dias, setDias] = useState(30);
  const [aberta, setAberta] = useState(false);
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!orcamentoId) return;
    try {
      const r = await fetchLixeira(orcamentoId);
      setItens((r.rows || []).filter((i) => !soParcelas || i.deFinanciamento));
      setDias(r.diasGuardado || 30);
    } catch (e) {
      console.error('Lixeira:', e);
    }
  }, [orcamentoId, soParcelas]);

  useEffect(() => {
    carregar();
    window.addEventListener(EVENTO_LIXEIRA, carregar);
    return () => window.removeEventListener(EVENTO_LIXEIRA, carregar);
  }, [carregar]);

  async function restaurar(item) {
    setOcupado(item.id);
    setErro('');
    try {
      await restaurarDaLixeira(orcamentoId, item.id);
      setItens((l) => l.filter((x) => x.id !== item.id));
      onRestaurado?.(item);
    } catch (e) {
      setErro(e.message || 'Não foi possível restaurar.');
    } finally {
      setOcupado(null);
    }
  }

  async function apagar(item) {
    setOcupado(item.id);
    try {
      await apagarDeVez(orcamentoId, item.id);
      setItens((l) => l.filter((x) => x.id !== item.id));
    } catch (e) {
      setErro(e.message || 'Não foi possível apagar.');
    } finally {
      setOcupado(null);
    }
  }

  if (itens.length === 0) return null;

  return (
    <section className="secao lixeira">
      <button type="button" className="lixeira__cabeca" onClick={() => setAberta((v) => !v)} aria-expanded={aberta}>
        <RotateCcw size={16} />
        <span>Excluídos recentemente ({itens.length})</span>
        <span className="text-muted lixeira__ver">{aberta ? 'esconder' : 'ver'}</span>
      </button>

      {aberta && (
        <>
          <p className="text-muted" style={{ fontSize: 12, margin: '4px 0 6px' }}>
            Ficam guardados por {dias} dias. Restaurar traz de volta exatamente como estava.
          </p>
          {erro && <p className="field-error">{erro}</p>}
          {itens.map((i) => {
            const quando = i.excluidoEm ? new Date(i.excluidoEm).toLocaleDateString('pt-BR') : '';
            const titulo =
              i.tipo === 'lancamentos'
                ? `${i.descricao}${i.quantidade > 1 ? ` · ${i.quantidade} lançamentos` : ''}`
                : `${ROTULO[i.tipo] || 'Item'}: ${i.descricao}`;
            return (
              <div key={i.id} className="lixeira__item">
                <div className="lixeira__info">
                  <span className="lixeira__titulo">{titulo}</span>
                  <span className="text-muted lixeira__sub">
                    {i.tipo === 'lancamentos' ? `${brl(i.valor)} · ` : ''}excluído em {quando}
                    {i.excluidoPorNome ? ` por ${i.excluidoPorNome}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="lixeira__restaurar"
                  disabled={ocupado === i.id}
                  onClick={() => restaurar(i)}
                >
                  {ocupado === i.id ? '…' : 'Restaurar'}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Apagar de vez"
                  disabled={ocupado === i.id}
                  onClick={() => apagar(i)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </>
      )}
    </section>
  );
}
