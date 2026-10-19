import { Home, Receipt, PieChart, BarChart3 } from 'lucide-react';

/**
 * Navegação do Casa+, em quatro destinos: onde eu estou (Início),
 * o que os números dizem (Relatórios), o que saiu (Gastos) e os
 * lançamentos (Orçamentos).
 */
const TABS = [
  { id: 'overview', label: 'Início', icon: Home },
  { id: 'insights', label: 'Relatórios', icon: BarChart3 },
  { id: 'transactions', label: 'Gastos', icon: Receipt },
  { id: 'manage', label: 'Orçamentos', icon: PieChart },
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
