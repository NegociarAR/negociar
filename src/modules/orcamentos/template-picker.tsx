"use client";

import { useRouter } from "next/navigation";

export function TemplatePicker({
  templates,
  currentTemplateId,
}: {
  templates: { id: string; name: string }[];
  currentTemplateId?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-subtle px-3 py-2 text-sm">
      <span className="shrink-0 text-muted">Começar de um template:</span>
      <select
        value={currentTemplateId ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          router.push(id ? `/orcamentos/novo?template=${id}` : "/orcamentos/novo");
        }}
        className="flex-1 rounded border bg-surface px-2 py-1 text-sm"
      >
        <option value="">— nenhum —</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
