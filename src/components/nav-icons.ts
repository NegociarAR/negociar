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
  Columns3,
  Clock,
  History,
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
  pipeline: Columns3,
  clock: Clock,
  history: History,
};
