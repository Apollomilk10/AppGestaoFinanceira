import { useEffect, useMemo, useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { fetchGastos } from './services/sheets';
import { useAuth } from './context/AuthContext';
import { useOrcamentos } from './context/OrcamentosContext';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ProfileTab from './components/ProfileTab';
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
  const { isAuthenticated, initializing, email, logout } = useAuth();
  const { activeId, active, loading: orcamentosLoading, error: orcamentosError, reload: reloadOrcamentos } = useOrcamentos();

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [jumpCategoria, setJumpCategoria] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [travado, setTravado] = useState(false);

  useEffect(() => {
    if (!orcamentosLoading) {
      setTravado(false);
      return;
    }
    const timeoutId = setTimeout(() => setTravado(true), 20000);
    return () => clearTimeout(timeoutId);
  }, [orcamentosLoading]);

  async function load() {
    if (!activeId) return;
    try {
      const data = await fetchGastos({ orcamentoId: activeId });
      setRows(data);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !activeId) return;
    setStatus('loading');
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeId]);

  const rowsMemo = useMemo(() => rows, [rows]);

  if (initializing) {
    return <StatusScreen title="Carregando…" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (orcamentosLoading || (status === 'loading' && !activeId)) {
    if (travado) {
      return (
        <StatusScreen
          title="Isso está demorando mais que o esperado"
          subtitle="Pode ser instabilidade no Apps Script. Tente recarregar a página."
          isError
        >
          <button className="primary-button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </StatusScreen>
      );
    }
    return <StatusScreen title="Carregando seus orçamentos…" />;
  }

  if (orcamentosError) {
    return (
      <StatusScreen title="Não foi possível carregar seus orçamentos" subtitle={orcamentosError} isError>
        <button className="primary-button" onClick={reloadOrcamentos}>
          Tentar de novo
        </button>
      </StatusScreen>
    );
  }

  if (!activeId) {
    return (
      <StatusScreen
        title="Você ainda não está em nenhum orçamento"
        subtitle="Abra o menu lateral pra criar um novo ou entrar com um código."
      />
    );
  }

  if (status === 'loading') {
    return <StatusScreen title="Carregando dados do orçamento…" />;
  }

  if (status === 'error') {
    return <StatusScreen title="Não foi possível carregar os dados" subtitle={error} isError />;
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
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenProfile={() => setShowProfile(true)}
      />

      <header className="app-header">
        <div className="app-header__top">
          <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <span className="mono eyebrow app-header__title">{active?.nome || 'ORÇAMENTO'}</span>
          <div className="app-header__actions">
            <RefreshButton onRefresh={handleForceRefresh} refreshing={refreshing} />
            <button className="icon-button" onClick={logout} aria-label="Sair">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {!showProfile && <TabBar active={activeTab} onChange={setActiveTab} />}
      </header>

      {showProfile ? (
        <ProfileTab onBack={() => setShowProfile(false)} />
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab rows={rowsMemo} onSelectCategory={handleSelectCategory} />
          )}
          {activeTab === 'transactions' && (
            <TransactionsTab rows={rowsMemo} initialCategoria={jumpCategoria} />
          )}
          {activeTab === 'insights' && <InsightsTab rows={rowsMemo} />}
          {activeTab === 'manage' && <ManageTab rows={rowsMemo} onChanged={load} />}

          <footer className="footer mono">
            atualiza automaticamente a cada 60s
          </footer>

          <NewExpenseForm onSaved={load} />
          <FeedbackButton />
        </>
      )}
    </div>
  );
}

function StatusScreen({ title, subtitle, isError, children }) {
  return (
    <div className="status-screen">
      <span className="mono status-screen__eyebrow">OBRA — PAINEL DE GASTOS</span>
      <h1 className={isError ? 'text-accent' : ''}>{title}</h1>
      {subtitle && <p className="text-muted">{subtitle}</p>}
      {children}
    </div>
  );
}
