import {
  Car,
  FileText,
  Gamepad2,
  Heart,
  HelpCircle,
  Home,
  Shield,
  Shirt,
  ShoppingCart,
  Target,
  TrendingUp,
  Tv,
  Utensils,
  Zap,
} from "lucide-react";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  ShoppingCart,
  Home,
  Zap,
  Car,
  FileText,
  Utensils,
  Shirt,
  Tv,
  Heart,
  Gamepad2,
  Shield,
  TrendingUp,
  Target,
};

interface CategoryIconProps {
  iconName: string;
  badgeColor: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({
  iconName,
  badgeColor,
  size = 20,
  className = "",
}: CategoryIconProps) {
  const Icon = ICON_MAP[iconName] ?? HelpCircle;
  return (
    <div
      className={`flex items-center justify-center rounded-full flex-shrink-0 ${className}`}
      style={{
        backgroundColor: badgeColor,
        width: size + 16,
        height: size + 16,
      }}
    >
      <Icon size={size} className="text-white" />
    </div>
  );
}
