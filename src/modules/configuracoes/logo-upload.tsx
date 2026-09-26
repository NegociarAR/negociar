"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { setCompanyLogo } from "./actions";
import { Button } from "@/components/ui/form";

export function LogoUpload({
  companyId,
  currentUrl,
}: {
  companyId: string;
  currentUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("Máximo 2MB.");
      return;
    }
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${companyId}/logo.${ext}`;
    const supabase = createClient();

    const { error: upErr } = await supabase.storage
      .from("company-logos")
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) {
      setError("Falha no upload: " + upErr.message);
      return;
    }
    const { data } = supabase.storage.from("company-logos").getPublicUrl(path);
    // cache-buster para atualizar preview após re-upload
    const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

    startTransition(async () => {
      await setCompanyLogo(publicUrl);
      setUrl(publicUrl);
    });
  }

  function remove() {
    startTransition(async () => {
      await setCompanyLogo(null);
      setUrl(null);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border bg-surface p-5 shadow-card">
      <div>
        <h2 className="text-sm font-semibold">Logo da empresa</h2>
        <p className="text-xs text-muted">
          Aparece no orçamento em PDF e na página que o cliente acessa. PNG ou
          JPG, até 2MB.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border bg-subtle">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-muted">sem logo</span>
          )}
        </div>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            disabled={pending}
            className="block text-sm text-muted file:mr-3 file:rounded-md file:border file:bg-subtle file:px-3 file:py-1.5 file:text-sm"
          />
          {url && (
            <button
              onClick={remove}
              disabled={pending}
              className="text-xs text-danger underline disabled:opacity-50"
            >
              Remover logo
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
