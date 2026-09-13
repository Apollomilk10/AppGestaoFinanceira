import { useEffect, useState } from 'react';
import { Home, UtensilsCrossed, Car, Plane } from 'lucide-react';
import Logo from './Logo';

const CHAVE = 'casa_onboarding_v1';

export function jaViuOnboarding() {
  try {
    return localStorage.getItem(CHAVE) === 'sim';
  } catch {
    return false;
  }
}

function marcarVisto() {
  try {
    localStorage.setItem(CHAVE, 'sim');
  } catch {
    /* modo privado: no pior caso a pessoa vê de novo */
  }
}

const TELAS = [
  {
    titulo: 'Organize seus gastos',
    texto:
      'Tenha uma visão completa de tudo o que entra e sai, e nunca mais se perca no seu dinheiro.',
    arte: <ArteGastos />,
  },
  {
    titulo: 'Defina seus orçamentos',
    texto:
      'Crie limites por categoria, acompanhe em tempo real e evite surpresas no fim do mês.',
    arte: <ArteOrcamento />,
  },
  {
    titulo: 'Planeje seus sonhos',
    texto:
      'Defina metas, acompanhe sua evolução e veja o seu dinheiro trabalhando ao seu favor.',
    arte: <ArteMeta />,
  },
];

/**
 * Primeira impressão do app: splash curto de marca e três telas que
 * explicam a proposta antes de pedir login. Só aparece uma vez por
 * dispositivo — quem já usa o app nunca mais vê isso.
 */
export default function Onboarding({ onFinish }) {
  const [etapa, setEtapa] = useState(-1); // -1 = splash

  useEffect(() => {
    if (etapa !== -1) return;
    const t = setTimeout(() => setEtapa(0), 1700);
    return () => clearTimeout(t);
  }, [etapa]);

  function concluir() {
    marcarVisto();
    onFinish();
  }

  if (etapa === -1) {
    return (
      <div className="splash">
        <Logo size={72} tone="light" />
        <h1 className="splash__nome">Casa+</h1>
        <p className="splash__tagline">Juntos por um futuro financeiro melhor</p>
        <p className="splash__texto">
          Acompanhe seus gastos, planeje seus sonhos e conquiste seus objetivos com quem você ama.
        </p>
      </div>
    );
  }

  const tela = TELAS[etapa];
  const ultima = etapa === TELAS.length - 1;

  return (
    <div className="onboarding">
      <button className="onboarding__pular" onClick={concluir}>
        Pular
      </button>

      <h1 className="onboarding__titulo">{tela.titulo}</h1>
      <p className="onboarding__texto">{tela.texto}</p>

      <div className="onboarding__arte">{tela.arte}</div>

      <div className="onboarding__pontos">
        {TELAS.map((_, i) => (
          <span
            key={i}
            className={`onboarding__ponto ${i === etapa ? 'onboarding__ponto--ativo' : ''}`}
          />
        ))}
      </div>

      <button
        className="primary-button primary-button--full"
        onClick={() => (ultima ? concluir() : setEtapa(etapa + 1))}
      >
        {ultima ? 'Começar' : 'Próximo'}
      </button>
    </div>
  );
}

/* --- Ilustrações: componentes reais do app, em miniatura ----------- */

function ArteGastos() {
  const linhas = [
    { nome: 'Moradia', valor: 'R$ 2.300', cor: 'var(--cat-moradia)', Icone: Home },
    { nome: 'Alimentação', valor: 'R$ 680', cor: 'var(--cat-alimentacao)', Icone: UtensilsCrossed },
    { nome: 'Transporte', valor: 'R$ 330', cor: 'var(--cat-transporte)', Icone: Car },
  ];
  return (
    <div className="demo-card">
      {linhas.map(({ nome, valor, cor, Icone }) => (
        <div className="demo-linha" key={nome}>
          <span
            className="demo-linha__bolha"
            style={{ background: `color-mix(in srgb, ${cor} 16%, transparent)`, color: cor }}
          >
            <Icone size={15} strokeWidth={2.2} />
          </span>
          <span className="demo-linha__nome">{nome}</span>
          <span className="demo-linha__valor">{valor}</span>
        </div>
      ))}
    </div>
  );
}

function ArteOrcamento() {
  const alturas = [38, 52, 46, 68, 84, 60];
  return (
    <div className="demo-card">
      <span className="demo-card__titulo">Orçamento mensal</span>
      <div>
        <span className="demo-linha__valor" style={{ fontSize: 20 }}>
          R$ 4.200
        </span>
        <span className="text-muted" style={{ fontSize: 12.5 }}>
          {' '}
          / R$ 5.000
        </span>
        <div className="demo-progresso" style={{ marginTop: 8 }}>
          <div className="demo-progresso__fill" style={{ width: '84%' }} />
        </div>
      </div>
      <div className="demo-barras">
        {alturas.map((h, i) => (
          <span
            key={i}
            className={`demo-barras__barra ${i >= 3 ? 'demo-barras__barra--forte' : ''}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function ArteMeta() {
  return (
    <div className="demo-card">
      <div className="demo-linha">
        <span
          className="demo-linha__bolha"
          style={{ background: 'var(--mint-soft)', color: 'var(--mint-strong)' }}
        >
          <Plane size={15} strokeWidth={2.2} />
        </span>
        <span className="demo-linha__nome">Viagem para Europa</span>
      </div>
      <div>
        <span className="demo-linha__valor" style={{ fontSize: 20 }}>
          R$ 18.000
        </span>
        <span className="text-muted" style={{ fontSize: 12.5 }}>
          {' '}
          de R$ 30.000
        </span>
        <div className="demo-progresso" style={{ marginTop: 8 }}>
          <div className="demo-progresso__fill" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}
