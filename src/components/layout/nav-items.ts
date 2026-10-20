import type { Route } from "next";
import {
  BookOpen,
  Boxes,
  Heart,
  LayoutDashboard,
  Layers,
  Library,
  type LucideIcon,
  Receipt,
  Settings,
  TrendingUp,
} from "lucide-react";

export type NavItem = { href: Route; label: string; icon: LucideIcon; primary?: boolean };

// PRD §18 routes. `primary` items appear in the iPhone bottom bar; the rest live under "More".
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/cards", label: "Cards", icon: BookOpen, primary: true },
  { href: "/collection", label: "Collection", icon: Library, primary: true },
  { href: "/sets", label: "Sets", icon: Layers, primary: true },
  { href: "/products", label: "Products", icon: Boxes },
  { href: "/purchases", label: "Purchases", icon: Receipt },
  { href: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
