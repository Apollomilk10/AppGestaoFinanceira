export default function RecentTable({ rows }) {
  return (
    <div className="panel">
      <h2 className="panel__title">Últimos lançamentos</h2>
      <div className="table-wrap">
        <table className="recent-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Etapa</th>
              <th className="align-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono">
                  {row.data
                    ? row.data.toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td>{row.descricao || '—'}</td>
                <td>
                  <span className="tag">{row.categoria}</span>
                </td>
                <td className="text-muted">{row.etapa}</td>
                <td className="align-right mono">
                  {row.valor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted" style={{ textAlign: 'center', padding: '24px 0' }}>
                  Nenhum lançamento ainda. Envie um gasto pelo bot do Telegram.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
