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
  Home,
  Key,
  Building2,
  Wifi,
  ShoppingCart,
  UtensilsCrossed,
  Bike,
  Car,
  Fuel,
  Wrench,
  Bus,
  HeartPulse,
  Stethoscope,
  Pill,
  ShieldPlus,
  Popcorn,
  Tv,
  Plane,
  Gamepad2,
  ShoppingBag,
  Shirt,
  Smartphone,
  Sofa,
  GraduationCap,
  BookOpen,
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
  Home,
  Key,
  Building2,
  Wifi,
  ShoppingCart,
  UtensilsCrossed,
  Bike,
  Car,
  Fuel,
  Wrench,
  Bus,
  HeartPulse,
  Stethoscope,
  Pill,
  ShieldPlus,
  Popcorn,
  Tv,
  Plane,
  Gamepad2,
  ShoppingBag,
  Shirt,
  Smartphone,
  Sofa,
  GraduationCap,
  BookOpen,
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
