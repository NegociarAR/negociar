import Link from "next/link";
import { getFollowups, customersForFollowup } from "@/modules/followups/queries";
import { FollowupItemActions, ReopenButton } from "@/modules/followups/item-actions";
import { NewFollowupForm } from "@/modules/followups/new-form";
import type { Followup } from "@/modules/followups/queries";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function Item({ f }: { f: Followup }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="tabular text-sm font-medium">{fmtDate(f.due_date)}</span>
          <Link
            href={`/clientes/${f.customer_id}`}
            className="truncate font-medium hover:underline"
          >
            {f.customer_name ?? "Cliente"}
          </Link>
          {f.quote_number && (
            <span className="text-xs text-muted">#{f.quote_number}</span>
          )}
        </div>
        {f.reason && <p className="text-sm text-muted">{f.reason}</p>}
      </div>
      <FollowupItemActions id={f.id} />
    </li>
  );
}

function Group({
  title,
  items,
  emphasis,
}: {
  title: string;
  items: Followup[];
  emphasis?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">
        {title}{" "}
        <span className={emphasis ? "text-foreground" : "text-muted"}>
          ({items.length})
        </span>
      </h2>
      <ul
        className={`divide-y rounded-lg border bg-surface ${
          emphasis ? "border-l-2 border-l-foreground" : ""
        }`}
      >
        {items.map((f) => (
          <Item key={f.id} f={f} />
        ))}
      </ul>
    </section>
  );
}

export default async function FollowupsPage() {
  const { overdue, today, upcoming, done } = await getFollowups();
  const customers = await customersForFollowup();

  const empty = overdue.length + today.length + upcoming.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Follow-ups</h1>
      </header>

      <NewFollowupForm customers={customers} />

      {empty ? (
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
          Nenhum follow-up pendente. Ao enviar um orçamento, um lembrete é criado
          automaticamente.
        </div>
      ) : (
        <div className="space-y-6">
          <Group title="Atrasados" items={overdue} emphasis />
          <Group title="Hoje" items={today} emphasis />
          <Group title="Próximos" items={upcoming} />
        </div>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted hover:text-foreground">
            Concluídos recentemente ({done.length})
          </summary>
          <ul className="mt-2 divide-y rounded-lg border bg-surface">
            {done.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-4 px-4 py-3 opacity-70">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Link href={`/clientes/${f.customer_id}`} className="truncate font-medium line-through hover:no-underline">
                      {f.customer_name ?? "Cliente"}
                    </Link>
                    {f.quote_number && <span className="text-xs text-muted">#{f.quote_number}</span>}
                  </div>
                  {f.reason && <p className="text-sm text-muted">{f.reason}</p>}
                </div>
                <ReopenButton id={f.id} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
