import { useEffect, useMemo, useState } from 'react';
import { fetchGastos } from './services/sheets';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import TabBar from './components/TabBar';
import OverviewTab from './components/OverviewTab';
import TransactionsTab from './components/TransactionsTab';
import InsightsTab from './components/InsightsTab';
import ManageTab from './components/ManageTab';
import NewExpenseForm from './components/NewExpenseForm';
import RefreshButton from './components/RefreshButton';
import FeedbackButton from './components/FeedbackButton';
import './styles.css';

const REFRESH_MS = 60_000;

export default function App() {
  const { isAuthenticated, login, logout } = useAuth();

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [jumpCategoria, setJumpCategoria] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

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
    if (!isAuthenticated) return;
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const rowsMemo = useMemo(() => rows, [rows]);

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

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

  async function handleForceRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <div className="page">
      <header className="app-header">
        <div className="app-header__top">
          <span className="mono eyebrow">OBRA — APARTAMENTO</span>
          <button className="link-button mono" onClick={logout}>
            sair
          </button>
        </div>
        <TabBar active={activeTab} onChange={setActiveTab} />
      </header>

      {activeTab === 'overview' && (
        <OverviewTab rows={rowsMemo} onSelectCategory={handleSelectCategory} />
      )}
      {activeTab === 'transactions' && (
        <TransactionsTab rows={rowsMemo} initialCategoria={jumpCategoria} />
      )}
      {activeTab === 'insights' && <InsightsTab rows={rowsMemo} />}
      {activeTab === 'manage' && <ManageTab rows={rowsMemo} onChanged={load} />}

      <footer className="footer mono">
        atualiza automaticamente a cada 60s · fonte: google sheets
      </footer>

      <NewExpenseForm onSaved={load} />
      <RefreshButton onRefresh={handleForceRefresh} refreshing={refreshing} />
      <FeedbackButton />
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
