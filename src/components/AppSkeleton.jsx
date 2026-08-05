/**
 * Esqueleto da tela inicial. Aparece no lugar do spinner enquanto os
 * dados carregam — mostrar a forma do layout antes do conteúdo faz a
 * espera parecer mais curta do que uma tela vazia girando.
 */
export default function AppSkeleton() {
  return (
    <div className="tab-content tab-content--fluido" aria-busy="true" aria-label="Carregando">
      <section className="hero">
        <div className="skeleton" style={{ width: 96, height: 12, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: '62%', height: 44, borderRadius: 12 }} />
        <div className="skeleton" style={{ width: '80%', height: 13, marginTop: 12 }} />
        <div className="skeleton" style={{ height: 128, marginTop: 18, borderRadius: 14 }} />
      </section>

      <section className="secao">
        <div className="skeleton" style={{ width: 110, height: 10, marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 28 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '70%', height: 11, marginBottom: 7 }} />
              <div className="skeleton" style={{ width: '90%', height: 20 }} />
            </div>
          ))}
        </div>
      </section>

      <section className="secao">
        <div className="skeleton" style={{ width: 130, height: 10, marginBottom: 18 }} />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="linha">
            <div className="skeleton" style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0 }} />
            <div className="linha__corpo">
              <div className="skeleton" style={{ width: `${58 - i * 8}%`, height: 13 }} />
              <div className="skeleton" style={{ height: 3, marginTop: 6 }} />
            </div>
            <div className="skeleton" style={{ width: 62, height: 14, flexShrink: 0 }} />
          </div>
        ))}
      </section>
    </div>
  );
}
