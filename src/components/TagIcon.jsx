import {
  Package,
  HardHat,
  AlertTriangle,
  MoreHorizontal,
  Zap,
  Droplet,
  Blocks,
  Paintbrush,
  HelpCircle,
} from 'lucide-react';

const ICONS = {
  Package,
  HardHat,
  AlertTriangle,
  MoreHorizontal,
  Zap,
  Droplet,
  Blocks,
  Paintbrush,
  HelpCircle,
};

export default function TagIcon({ meta, size = 16 }) {
  const Icon = ICONS[meta.icon] || MoreHorizontal;
  return (
    <span
      className="tag-icon"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      <Icon size={size} strokeWidth={2.2} />
    </span>
  );
}
