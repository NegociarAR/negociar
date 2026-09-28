"use client";

import { useState, useTransition } from "react";
import { setProductActive } from "./status-actions";

export function ProductStatusSelect({ productId, active }: { productId: string; active: boolean }) {
  const [value, setValue] = useState(active);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    setValue(next);
    startTransition(async () => {
      const res = await setProductActive(productId, next);
      if (!res.ok) setValue(!next);
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Status</span>
      <select
        value={value ? "1" : "0"}
        onChange={(e) => change(e.target.value === "1")}
        disabled={pending}
        className="h-8 rounded-md border bg-surface px-2 text-sm"
      >
        <option value="1">Ativo</option>
        <option value="0">Inativo</option>
      </select>
    </label>
  );
}
