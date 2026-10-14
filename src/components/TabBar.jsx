import { Home, Receipt, PieChart, BarChart3 } from 'lucide-react';

/**
 * Navegação do Casa+, em quatro destinos: onde eu estou (Início),
 * o que saiu (Gastos), os lançamentos (Orçamentos) e o que os números
 * dizem (Relatórios).
 */
const TABS = [
  { id: 'overview', label: 'Início', icon: Home },
  { id: 'transactions', label: 'Gastos', icon: Receipt },
  { id: 'manage', label: 'Orçamentos', icon: PieChart },
  { id: 'insights', label: 'Relatórios', icon: BarChart3 },
];

export default function TabBar({ active, onChange }) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            className={`tab-bar__item ${isActive ? 'tab-bar__item--active' : ''}`}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
