"use client";

import { downloadCsv } from "@/lib/csv";

export function ExportCsvButton({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <button
      onClick={() => downloadCsv(filename, headers, rows)}
      className="rounded-md border px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-subtle hover:text-foreground"
    >
      Exportar CSV
    </button>
  );
}
