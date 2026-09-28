"use client";

import { useEffect } from "react";
import { markQuoteViewed } from "./actions";

// Marca "visualizado" só quando o navegador executa JS.
// Prévia de link (WhatsApp, e-mail) e robôs só leem o HTML e não disparam.
export function MarkViewed({ token }: { token: string }) {
  useEffect(() => {
    markQuoteViewed(token);
  }, [token]);
  return null;
}
