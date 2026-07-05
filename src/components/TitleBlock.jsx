export default function TitleBlock({ total, count, lastUpdate }) {
  const formatted = total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <header className="title-block">
      <div className="title-block__main">
        <span className="title-block__eyebrow mono">OBRA — APARTAMENTO</span>
        <h1 className="title-block__total">{formatted}</h1>
        <span className="title-block__label">gasto total registrado</span>
      </div>

      <div className="title-block__meta mono">
        <div>
          <span className="title-block__meta-label">LANÇAMENTOS</span>
          <span className="title-block__meta-value">{count}</span>
        </div>
        <div>
          <span className="title-block__meta-label">ATUALIZADO</span>
          <span className="title-block__meta-value">{lastUpdate}</span>
        </div>
        <div>
          <span className="title-block__meta-label">FOLHA</span>
          <span className="title-block__meta-value">01/01</span>
        </div>
      </div>
    </header>
  );
}
