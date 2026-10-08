"use client";

import { useEffect } from "react";

// Registra o service worker do shell (instalabilidade PWA). Client
// component isolado pra não acoplar isso ao layout em si.
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
