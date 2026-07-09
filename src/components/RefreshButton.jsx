import { RotateCw } from 'lucide-react';

export default function RefreshButton({ onRefresh, refreshing }) {
  return (
    <button
      className="icon-button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label="Atualizar dados"
    >
      <RotateCw size={16} className={refreshing ? 'spin' : ''} />
    </button>
  );
}
