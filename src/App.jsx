import { useEffect, useMemo, useState } from 'react';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import Spinner from './components/Spinner';
import { fetchGastosAgregados, fetchGastosDeOrcamento } from './services/sheets';
import { useAuth } from './context/AuthContext';
import { useOrcamentos } from './context/OrcamentosContext';
import { useTheme } from './context/ThemeContext';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import ProfileTab from './components/ProfileTab';
import TabBar from './components/TabBar';
import OverviewTab from './components/OverviewTab';
import TransactionsTab from './components/TransactionsTab';
import WishlistTab from './components/WishlistTab';
import InsightsTab from './components/InsightsTab';
import ManageTab from './components/ManageTab';
import NewExpenseForm from './components/NewExpenseForm';
import RefreshButton from './components/RefreshButton';
import FeedbackButton from './components/FeedbackButton';
import './styles.css';

const REFRESH_MS = 60_000;

export default function App() {
  const { isAuthenticated, initializing, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    orcamentos,
    loading: orcamentosLoading,
    error: orcamentosError,
    reload: reloadOrcamentos,
    filtroId,
    filtro,
    isMeuEspaco,
  } = useOrcamentos();

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
    if (orcamentos.length === 0) return;
    try {
      const data =
        isMeuEspaco
          ? await fetchGastosAgregados(orcamentos)
          : await fetchGastosDeOrcamento(filtro || orcamentos.find((o) => o.id === filtroId));
      setRows(data);
      setStatus('ready');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  /**
   * Insere o lançamento novo direto na tela, sem esperar o servidor —
   * o Firestore às vezes demora uma fração de segundo pra indexar a
   * escrita nova, e um recarregamento imediato podia não trazê-la ainda.
   * Depois disso, sincroniza com o servidor em segundo plano.
   */
  function addRowOptimista(row) {
    setRows((prev) => [row, ...prev]);
    // Não recarrega do servidor aqui de propósito — a leitura por query do
    // Firestore pode demorar um instante pra refletir a escrita, e isso
    // sobrescrevia o lançamento recém-criado (mesma causa do bug de
    // categoria). O próximo refresh automático (60s) sincroniza sozinho.
  }

  useEffect(() => {
    if (!isAuthenticated || orcamentos.length === 0) return;
    setStatus('loading');
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, orcamentos.map((o) => o.id).join(','), filtroId]);

  const rowsMemo = useMemo(() => rows, [rows]);

  if (initializing) {
    return <StatusScreen title="Carregando…" />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (orcamentosLoading || (status === 'loading' && orcamentos.length === 0)) {
    if (travado) {
      return (
        <StatusScreen
          title="Isso está demorando mais que o esperado"
          subtitle="Pode ser que o servidor esteja iniciando (comum no plano gratuito). Tente recarregar em alguns segundos."
          isError
        >
          <button className="primary-button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </StatusScreen>
      );
    }
    return <StatusScreen title="Carregando seu espaço…" />;
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

  if (orcamentos.length === 0) {
    return (
      <StatusScreen
        title="Você ainda não está em nenhum orçamento"
        subtitle="Abra o menu lateral pra criar um novo ou entrar com um código."
      />
    );
  }

  if (status === 'loading') {
    return <StatusScreen title="Carregando seus dados…" />;
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
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenProfile={() => setShowProfile(true)} />

      <header className="app-header">
        <div className="app-header__top">
          <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="Abrir menu">
            <Menu size={18} />
          </button>
          <span className="mono eyebrow app-header__title">
            {isMeuEspaco ? 'MEU ESPAÇO' : filtro?.nome || 'ORÇAMENTO'}
          </span>
          <div className="app-header__actions">
            <button className="icon-button" onClick={toggleTheme} aria-label="Trocar tema">
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
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
          {activeTab === 'wishlist' && <WishlistTab rows={rowsMemo} />}
          {activeTab === 'insights' && <InsightsTab rows={rowsMemo} />}
          {activeTab === 'manage' && <ManageTab rows={rowsMemo} onChanged={load} />}

          <footer className="footer mono">atualiza automaticamente a cada 60s</footer>

          <NewExpenseForm onSaved={load} onSavedRow={addRowOptimista} />
          <FeedbackButton />
        </>
      )}
    </div>
  );
}

function StatusScreen({ title, subtitle, isError, children }) {
  return (
    <div className="status-screen">
      {!isError && <Spinner size={36} />}
      <span className="mono status-screen__eyebrow">FINANÇAS & ORÇAMENTO</span>
      <h1 className={isError ? 'text-accent' : ''}>{title}</h1>
      {subtitle && <p className="text-muted">{subtitle}</p>}
      {children}
    </div>
  );
}
