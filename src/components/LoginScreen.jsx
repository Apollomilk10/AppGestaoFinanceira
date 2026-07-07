import { useState } from 'react';
import { Lock } from 'lucide-react';

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const result = onLogin(email, password, remember);
    if (!result.ok) {
      setError(result.message);
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__icon">
          <Lock size={22} strokeWidth={2.2} />
        </div>
        <h1 className="login-card__title">Obra — Painel de Gastos</h1>
        <p className="login-card__subtitle text-muted">Entre para continuar</p>

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

        <label className="field">
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </label>

        {error && <p className="field-error">{error}</p>}

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Manter conectado neste dispositivo</span>
        </label>

        <button type="submit" className="primary-button primary-button--full">
          Entrar
        </button>
      </form>
    </div>
  );
}
