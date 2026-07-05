import { useState } from 'react';

const SIZE = 168;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function BudgetGauge({ total }) {
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem('obra-orcamento');
    return saved ? Number(saved) : 0;
  });
  const [editing, setEditing] = useState(!budget);

  const pct = budget > 0 ? Math.min(total / budget, 1) : 0;
  const over = budget > 0 && total > budget;
  const dash = CIRCUMFERENCE * pct;

  function handleSave(value) {
    const num = Number(value);
    if (num > 0) {
      setBudget(num);
      localStorage.setItem('obra-orcamento', String(num));
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="panel gauge-card gauge-card--edit">
        <h2 className="panel__title">Orçamento previsto</h2>
        <form
          className="budget-line__form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(e.target.elements.orcamento.value);
          }}
        >
          <span className="mono">R$</span>
          <input
            name="orcamento"
            type="number"
            min="0"
            step="100"
            defaultValue={budget || ''}
            placeholder="valor total previsto"
            className="mono"
            autoFocus
          />
          <button type="submit" className="primary-button">
            salvar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="panel gauge-card">
      <div className="gauge-card__header">
        <h2 className="panel__title">Orçamento</h2>
        <button className="link-button mono" onClick={() => setEditing(true)}>
          editar
        </button>
      </div>

      <div className="gauge">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={over ? 'var(--accent)' : 'var(--good)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
          {/* marcações estilo manômetro */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const inner = RADIUS - STROKE / 2 - 4;
            const outer = RADIUS - STROKE / 2 + 2;
            const x1 = SIZE / 2 + inner * Math.cos(rad);
            const y1 = SIZE / 2 + inner * Math.sin(rad);
            const x2 = SIZE / 2 + outer * Math.cos(rad);
            const y2 = SIZE / 2 + outer * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1}
              />
            );
          })}
        </svg>
        <div className="gauge__center">
          <span className="gauge__pct mono">{Math.round(pct * 100)}%</span>
          <span className="gauge__label">usado</span>
        </div>
      </div>

      <div className="gauge-card__footer mono">
        <span>{formatBRL(total)} gasto</span>
        <span className={over ? 'text-accent' : 'text-muted'}>
          {over ? 'acima de ' : 'de '}
          {formatBRL(budget)}
        </span>
      </div>
    </div>
  );
}

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
