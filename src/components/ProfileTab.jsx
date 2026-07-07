import { useEffect, useState } from 'react';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrcamentos } from '../context/OrcamentosContext';
import { fetchMeusGastos } from '../services/orcamentos';
import { last14DaysSeries } from '../utils/insights';
import Sparkline from './Sparkline';

export default function ProfileTab({ onBack }) {
  const { email, token } = useAuth();
  const { orcamentos } = useOrcamentos();
  const [meusGastos, setMeusGastos] = useState([]);
  const [status, setStatus] = useState('loading');
  const [copiadoId, setCopiadoId] = useState('');

  useEffect(() => {
    fetchMeusGastos({ email, token })
      .then((rows) => {
        setMeusGastos(
          rows.map((r, i) => ({
            id: i,
            data: parseData(r.data),
            valor: Number(r.valor) || 0,
            descricao: r.descricao,
            orcamentoNome: r.orcamentoNome,
          }))
        );
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [email, token]);

  function copiarCodigo(id) {
    navigator.clipboard.writeText(id);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(''), 2000);
  }

  const totalPessoal = meusGastos.reduce((s, r) => s + r.valor, 0);
  const porOrcamento = rankByOrcamento(meusGastos);
  const series = last14DaysSeries(meusGastos);

  return (
    <div className="tab-content">
      <button className="link-button mono back-link" onClick={onBack}>
        <ArrowLeft size={14} /> voltar
      </button>

      <div className="panel">
        <h2 className="panel__title">Minha conta</h2>
        <p className="mono" style={{ fontSize: 14 }}>{email}</p>
      </div>

      <div className="panel hero-card">
        <div className="hero-card__top">
          <span className="mono eyebrow">MINHA VISÃO — TODOS OS ORÇAMENTOS</span>
          <h1 className="hero-card__total">{formatBRL(totalPessoal)}</h1>
        </div>
        {status === 'ready' && series.some((d) => d.total > 0) && <Sparkline data={series} />}
        <span className="hero-card__caption text-muted mono">
          soma de tudo que você mesmo lançou, em {orcamentos.length} orçamento{orcamentos.length !== 1 ? 's' : ''}
        </span>
      </div>

      {porOrcamento.length > 0 && (
        <div className="panel">
          <h2 className="panel__title">Por orçamento</h2>
          <div className="rank-list">
            {porOrcamento.map((item, i) => (
              <div key={item.nome} className="rank-row">
                <span className="rank-row__pos mono">{i + 1}</span>
                <span className="rank-row__label">{item.nome}</span>
                <span className="rank-row__valor mono">{formatBRL(item.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel">
        <h2 className="panel__title">Meus orçamentos</h2>
        <div className="profile-orcamento-list">
          {orcamentos.map((orc) => (
            <div key={orc.id} className="profile-orcamento-row">
              <div>
                <span className="profile-orcamento-row__nome">{orc.nome}</span>
                <span className="mono text-muted profile-orcamento-row__codigo">{orc.id}</span>
              </div>
              <button className="icon-button" onClick={() => copiarCodigo(orc.id)}>
                {copiadoId === orc.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function parseData(str) {
  if (!str) return null;
  const match = str.toString().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;
  const [, d, m, y] = match;
  return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
}

function rankByOrcamento(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const nome = r.orcamentoNome || 'Sem orçamento';
    map.set(nome, (map.get(nome) || 0) + r.valor);
  });
  return Array.from(map, ([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
