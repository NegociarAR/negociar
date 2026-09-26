"use client";

import {
  Home,
  Users,
  Calculator,
  FileText,
  Package,
  Bell,
  Settings,
  Wallet,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import type { IconKey } from "./nav-items";

export const ICONS: Record<IconKey, LucideIcon> = {
  home: Home,
  users: Users,
  calc: Calculator,
  quote: FileText,
  box: Package,
  bell: Bell,
  settings: Settings,
  wallet: Wallet,
  chart: BarChart3,
};
