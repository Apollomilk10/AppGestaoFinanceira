import { useEffect, useMemo, useState } from 'react';
import { fetchGastos } from './services/sheets';
import TabBar from './components/TabBar';
import OverviewTab from './components/OverviewTab';
import TransactionsTab from './components/TransactionsTab';
import InsightsTab from './components/InsightsTab';
import NewExpenseForm from './components/NewExpenseForm';
import './styles.css';

const REFRESH_MS = 60_000;

export default function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [jumpCategoria, setJumpCategoria] = useState('all');

  async function load() {
    try {
      const data = await fetchGastos();
      setRows(data);
      setStatus('ready');
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

  const rowsMemo = useMemo(() => rows, [rows]);

  if (status === 'loading') {
    return <StatusScreen title="Carregando dados da planilha…" />;
  }

  if (status === 'error') {
    return <StatusScreen title="Não foi possível carregar a planilha" subtitle={error} isError />;
  }

  function handleSelectCategory(categoriaKey) {
    setJumpCategoria(categoriaKey);
    setActiveTab('transactions');
  }

  return (
    <div className="page">
      <header className="app-header">
        <span className="mono eyebrow">OBRA — APARTAMENTO</span>
        <TabBar active={activeTab} onChange={setActiveTab} />
      </header>

      {activeTab === 'overview' && (
        <OverviewTab rows={rowsMemo} onSelectCategory={handleSelectCategory} />
      )}
      {activeTab === 'transactions' && (
        <TransactionsTab rows={rowsMemo} initialCategoria={jumpCategoria} />
      )}
      {activeTab === 'insights' && <InsightsTab rows={rowsMemo} />}

      <footer className="footer mono">
        atualiza automaticamente a cada 60s · fonte: google sheets
      </footer>

      <NewExpenseForm onSaved={load} />
    </div>
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
