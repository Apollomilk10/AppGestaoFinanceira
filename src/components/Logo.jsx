/**
 * Marca do Casa+ — uma casa desenhada em traço, com a folha crescendo
 * dentro dela. Vetor inline (em vez do PNG antigo) pra poder herdar a
 * cor do contexto: escura no app claro, clara sobre o verde do splash.
 */
export default function Logo({ size = 32, className = '', tone = 'brand' }) {
  const traco = tone === 'light' ? '#ffffff' : 'var(--brand)';
  const folha = tone === 'light' ? '#4ec79b' : 'var(--mint)';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={`logo ${className}`}
      aria-label="Casa+"
      role="img"
    >
      <path
        d="M7.5 21.2 24 8.2l16.5 13V37a4.5 4.5 0 0 1-4.5 4.5H12A4.5 4.5 0 0 1 7.5 37V21.2Z"
        stroke={traco}
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M17.6 30.9c-1.3-6.8 3.3-11.4 11.4-12 1.2 6.9-3.5 11.5-11.4 12Z"
        fill={folha}
      />
      <path
        d="m17.9 30.6 10.6-11.3"
        stroke={tone === 'light' ? '#0a2c26' : 'var(--panel)'}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
