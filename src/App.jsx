import { useEffect, useMemo, useState } from 'react';
import { fetchGastos } from './services/sheets';
import TitleBlock from './components/TitleBlock';
import BudgetLine from './components/BudgetLine';
import BreakdownChart from './components/BreakdownChart';
import RecentTable from './components/RecentTable';
import './styles.css';

const REFRESH_MS = 60_000;

export default function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('—');

  async function load() {
    try {
      const data = await fetchGastos();
      setRows(data);
      setStatus('ready');
      setLastUpdate(
        new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  const total = useMemo(() => rows.reduce((sum, r) => sum + r.valor, 0), [rows]);

  const byCategoria = useMemo(() => groupBy(rows, 'categoria'), [rows]);
  const byEtapa = useMemo(() => groupBy(rows, 'etapa'), [rows]);

  const recent = useMemo(
    () =>
      [...rows]
        .sort((a, b) => (b.data?.getTime() || 0) - (a.data?.getTime() || 0))
        .slice(0, 8),
    [rows]
  );

  if (status === 'loading') {
    return <StatusScreen title="Carregando dados da planilha…" />;
  }

  if (status === 'error') {
    return (
      <StatusScreen
        title="Não foi possível carregar a planilha"
        subtitle={error}
        isError
      />
    );
  }

  return (
    <div className="page">
      <TitleBlock total={total} count={rows.length} lastUpdate={lastUpdate} />

      <BudgetLine total={total} />

      <div className="grid-2">
        <BreakdownChart title="Gasto por categoria" data={byCategoria} />
        <BreakdownChart title="Gasto por etapa da obra" data={byEtapa} />
      </div>

      <RecentTable rows={recent} />

      <footer className="footer mono">
        atualiza automaticamente a cada 60s · fonte: google sheets
      </footer>
    </div>
  );
}

function groupBy(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const k = row[key] || 'Sem categoria';
    map.set(k, (map.get(k) || 0) + row.valor);
  });
  return Array.from(map, ([name, valor]) => ({ name, valor })).sort(
    (a, b) => b.valor - a.valor
  );
}

function StatusScreen({ title, subtitle, isError }) {
  return (
    <div className="status-screen">
      <span className="mono status-screen__eyebrow">OBRA — PAINEL DE GASTOS</span>
      <h1 className={isError ? 'text-accent' : ''}>{title}</h1>
      {subtitle && <p className="text-muted">{subtitle}</p>}
    </div>
  );
}
