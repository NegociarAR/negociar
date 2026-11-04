"use client";

import { useState, useTransition } from "react";
import { createCategory } from "./category-actions";

export function CategorySelect({
  categories,
  defaultValue,
}: {
  categories: { id: string; name: string }[];
  defaultValue?: string | null;
}) {
  const [cats, setCats] = useState(categories);
  const [selected, setSelected] = useState(defaultValue ?? "");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const res = await createCategory(newName);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const created = { id: res.id, name: newName.trim() };
      setCats((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setSelected(created.id);
      setNewName("");
      setCreating(false);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          name="category_id"
          value={selected}
          onChange={(e) => {
            if (e.target.value === "__new__") {
              setCreating(true);
            } else {
              setSelected(e.target.value);
              setCreating(false);
            }
          }}
          className="h-10 w-full rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Sem categoria</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
          <option value="__new__">+ Nova categoria</option>
        </select>
      </div>
      {creating && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } }}
            placeholder="Nome da categoria"
            className="h-9 flex-1 rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending || !newName.trim()}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {pending ? "Criando…" : "Criar"}
          </button>
          <button
            type="button"
            onClick={() => { setCreating(false); setNewName(""); setError(null); }}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-subtle"
          >
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
