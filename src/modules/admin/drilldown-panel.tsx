"use client";

import { useState } from "react";
import Link from "next/link";
import type { DrillRow } from "./usage-queries";

interface Props {
  title: string;
  count: number;
  rows: DrillRow[];
  children: React.ReactNode;
}

export function DrilldownTrigger({ title, count, rows, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
      >
        {children}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border bg-surface">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-medium">
              {title}
              <span className="ml-1.5 text-muted font-normal">({count})</span>
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-foreground transition text-lg leading-none"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Nenhuma empresa.</p>
          ) : (
            <ul className="divide-y max-h-72 overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/empresas/${row.id}`}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-subtle transition"
                  >
                    <span className="font-medium min-w-0 truncate">{row.label}</span>
                    {row.detail && (
                      <span className="shrink-0 text-xs text-muted">{row.detail}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
