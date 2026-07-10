import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fetchPorIntegrante } from '../services/appsScript';

function formatBRL(value) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip mono">
      <strong>{label}</strong>
      {payload.map((p) => (
        <span key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value)}
        </span>
      ))}
    </div>
  );
}

export default function MemberBreakdown({ orcamentos }) {
  const [linhas, setLinhas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orcamentos || orcamentos.length === 0) return;
    setLoading(true);

    Promise.all(orcamentos.map((o) => fetchPorIntegrante(o.id)))
      .then((listas) => {
        const somaPorPessoa = new Map();
        listas.flat().forEach((l) => {
          const atual = somaPorPessoa.get(l.uid) || { uid: l.uid, nome: l.nome, despesas: 0, receitas: 0 };
          atual.despesas += l.despesas;
          atual.receitas += l.receitas;
          somaPorPessoa.set(l.uid, atual);
        });
        setLinhas(Array.from(somaPorPessoa.values()).sort((a, b) => b.despesas - a.despesas));
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [orcamentos]);

  if (!orcamentos || orcamentos.length === 0 || (!loading && linhas.length === 0)) return null;

  const dadosGrafico = linhas.map((l) => ({ nome: l.nome, Despesas: l.despesas, Receitas: l.receitas }));

  return (
    <div className="panel">
      <h2 className="panel__title">Por integrante</h2>

      <ResponsiveContainer width="100%" height={Math.max(120, linhas.length * 50)}>
        <BarChart data={dadosGrafico} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nome"
            width={80}
            tick={{ fill: 'var(--muted)', fontSize: 11.5 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(17,17,20,0.04)' }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Despesas" fill="var(--danger)" radius={[0, 4, 4, 0]} barSize={14} />
          <Bar dataKey="Receitas" fill="var(--good)" radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>

      <div className="rank-list" style={{ marginTop: 8 }}>
        {linhas.map((l) => (
          <div key={l.uid} className="rank-row">
            <span className="rank-row__label">{l.nome}</span>
            <span className="mono text-danger" style={{ marginRight: 8 }}>-{formatBRL(l.despesas)}</span>
            <span className="mono text-good">+{formatBRL(l.receitas)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
