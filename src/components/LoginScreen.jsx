import { useState } from 'react';
import { Lock, Copy, Check, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const { login, signup } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [modo, setModo] = useState('entrar'); // entrar | cadastrar
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [modoGrupo, setModoGrupo] = useState('criar'); // criar | entrar
  const [codigoGrupo, setCodigoGrupo] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [grupoGerado, setGrupoGerado] = useState('');
  const [copiado, setCopiado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('loading');

    const result =
      modo === 'entrar'
        ? await login(email, senha, remember)
        : await signup(email, senha, nome, modoGrupo, codigoGrupo, 'Meu espaço', remember);

    setStatus('idle');

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (modo === 'cadastrar' && modoGrupo === 'criar') {
      setGrupoGerado(result.grupo);
    }
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(grupoGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (grupoGerado) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-card__icon">
            <Check size={22} strokeWidth={2.2} />
          </div>
          <h1 className="login-card__title">Conta criada!</h1>
          <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
            Compartilhe este código com quem também vai lançar gastos com você. A pessoa
            usa ele na hora de criar a conta dela, em "Entrar num espaço existente".
          </p>
          <div className="grupo-code">
            <span className="mono grupo-code__value">{grupoGerado}</span>
            <button type="button" className="icon-button" onClick={copiarCodigo}>
              {copiado ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <button
            className="primary-button primary-button--full"
            onClick={() => window.location.reload()}
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <button className="icon-button theme-toggle-floating" onClick={toggleTheme} aria-label="Trocar tema">
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__icon">
          <Lock size={22} strokeWidth={2.2} />
        </div>
        <h1 className="login-card__title">Obra — Painel de Gastos</h1>

        <div className="mode-toggle">
          <button
            type="button"
            className={modo === 'entrar' ? 'mode-toggle__active' : ''}
            onClick={() => setModo('entrar')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={modo === 'cadastrar' ? 'mode-toggle__active' : ''}
            onClick={() => setModo('cadastrar')}
          >
            Criar conta
          </button>
        </div>

        <label className="field">
          <span>E-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            required
            autoFocus
          />
        </label>

        {modo === 'cadastrar' && (
          <label className="field">
            <span>Seu nome</span>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="ex: Lucas"
              required
            />
          </label>
        )}

        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {modo === 'cadastrar' && (
          <>
            <div className="mode-toggle mode-toggle--small">
              <button
                type="button"
                className={modoGrupo === 'criar' ? 'mode-toggle__active' : ''}
                onClick={() => setModoGrupo('criar')}
              >
                Criar novo espaço
              </button>
              <button
                type="button"
                className={modoGrupo === 'entrar' ? 'mode-toggle__active' : ''}
                onClick={() => setModoGrupo('entrar')}
              >
                Entrar com código
              </button>
            </div>

            {modoGrupo === 'entrar' && (
              <label className="field">
                <span>Código do espaço</span>
                <input
                  type="text"
                  value={codigoGrupo}
                  onChange={(e) => setCodigoGrupo(e.target.value.toUpperCase())}
                  placeholder="ex: A3F9K2"
                  required
                />
              </label>
            )}
          </>
        )}

        {error && <p className="field-error">{error}</p>}

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Manter conectado neste dispositivo</span>
        </label>

        <button type="submit" className="primary-button primary-button--full" disabled={status === 'loading'}>
          {status === 'loading' ? 'aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>
    </div>
  );
}
