import { useState } from 'react';

export default function BudgetLine({ total }) {
  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem('obra-orcamento');
    return saved ? Number(saved) : 0;
  });
  const [editing, setEditing] = useState(!budget);

  const pct = budget > 0 ? Math.min((total / budget) * 100, 100) : 0;
  const over = budget > 0 && total > budget;

  function handleSave(value) {
    const num = Number(value);
    if (num > 0) {
      setBudget(num);
      localStorage.setItem('obra-orcamento', String(num));
      setEditing(false);
    }
  }

  return (
    <div className="panel budget-line">
      <div className="budget-line__header">
        <h2 className="panel__title">Orçamento previsto</h2>
        {!editing && (
          <button className="link-button mono" onClick={() => setEditing(true)}>
            editar
          </button>
        )}
      </div>

      {editing ? (
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
      ) : (
        <div className="dimension">
          <div className="dimension__track">
            <div
              className="dimension__fill"
              style={{
                width: `${pct}%`,
                background: over ? 'var(--accent)' : 'var(--good)',
              }}
            />
            <div className="dimension__ticks" aria-hidden="true">
              {Array.from({ length: 11 }).map((_, i) => (
                <span key={i} className="dimension__tick" />
              ))}
            </div>
          </div>
          <div className="dimension__labels mono">
            <span>
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}{' '}
              gasto
            </span>
            <span className={over ? 'text-accent' : 'text-muted'}>
              {over ? 'acima de ' : 'de '}
              {budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
