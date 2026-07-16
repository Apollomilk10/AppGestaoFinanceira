import { LayoutGrid, List, TrendingUp, Settings2, Sparkles } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Visão geral', icon: LayoutGrid },
  { id: 'transactions', label: 'Lançamentos', icon: List },
  { id: 'insights', label: 'Insights', icon: TrendingUp },
  { id: 'manage', label: 'Gerenciar', icon: Settings2 },
  { id: 'wishlist', label: 'Desejos', icon: Sparkles },
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
          >
            <Icon size={18} strokeWidth={2.2} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
