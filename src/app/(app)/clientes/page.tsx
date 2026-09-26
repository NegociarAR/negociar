import Link from "next/link";
import {
  listCustomersSorted,
  countCustomers,
  relThresholds,
  type CustomerSort,
} from "@/modules/clientes/queries";
import { customerDisplayName } from "@/modules/clientes/types";
import { autoInactivateStale } from "@/modules/clientes/actions";
import { relStatus, daysSince, type RelStatus } from "@/modules/clientes/relationship";
import { RelBadge } from "@/modules/clientes/rel-badge";
import { RecoveryAction } from "@/modules/clientes/recovery-action";
import { ImportCustomers } from "@/modules/clientes/import-customers";
import { ThresholdSettings } from "@/modules/clientes/threshold-settings";
import { getEntitlements, checkLimit } from "@/lib/entitlements";
import { Button } from "@/components/ui/form";

const SORTS: { key: CustomerSort; label: string }[] = [
  { key: "recent", label: "Contato recente" },
  { key: "forgotten", label: "Mais esquecidos" },
  { key: "priority", label: "Prioridade" },
  { key: "name", label: "Nome A–Z" },
];

function recoveryMessage(name: string, status: RelStatus): string {
  if (status === "forgotten") {
    return `Olá, ${name}! Faz um tempo que não conversamos. Posso te ajudar em algo?`;
  }
  return `Olá, ${name}! Passando para saber se está tudo bem e se posso ajudar com algo.`;
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; limite?: string; sort?: CustomerSort; f?: string }>;
}) {
  const { q, limite, sort, f } = await searchParams;
  const activeSort = sort ?? "recent";
  await autoInactivateStale();
  const { customers } = await listCustomersSorted(q, activeSort);
  const used = await countCustomers();
  const ent = await getEntitlements();
  const gate = checkLimit(ent, "customers", used);
  const t = await relThresholds();

  // calcula status de cada cliente
  const withStatus = customers.map((c) => ({
    c,
    status: relStatus(c.last_contact_at, t),
  }));

  // stats
  const stats = {
    all: withStatus.length,
    active: withStatus.filter((x) => x.status === "active").length,
    stale: withStatus.filter((x) => x.status === "stale").length,
    forgotten: withStatus.filter((x) => x.status === "forgotten").length,
  };

  // filtro por status (stats clicáveis)
  const filtered = f
    ? withStatus.filter((x) => x.status === f)
    : withStatus;

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted">
            {gate.limit === null ? `${used} clientes` : `${used}/${gate.limit} clientes`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCustomers />
          <Link href="/clientes/novo">
            <Button>+ Novo cliente</Button>
          </Link>
        </div>
      </header>

      {limite && (
        <div className="flex items-center justify-between rounded-lg border border-l-2 border-l-primary bg-primary-soft px-4 py-3 text-sm">
          <span>Você atingiu o limite de {gate.limit} clientes do seu plano.</span>
          <Link href="/configuracoes" className="font-medium text-foreground underline">Fazer upgrade</Link>
        </div>
      )}

      {/* stats clicáveis */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Todos" value={stats.all} active={!f} href="/clientes" />
        <StatCard label="Em dia" value={stats.active} active={f === "active"} href="/clientes?f=active" />
        <StatCard label="Sem retorno" value={stats.stale} active={f === "stale"} href="/clientes?f=stale" />
        <StatCard label="Esquecidos" value={stats.forgotten} active={f === "forgotten"} href="/clientes?f=forgotten" />
      </div>

      <ThresholdSettings yellowDays={t.yellowDays} redDays={t.redDays} />

      {/* busca + ordenação */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex flex-1 gap-2">
          {f && <input type="hidden" name="f" value={f} />}
          <input type="hidden" name="sort" value={activeSort} />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por nome, telefone, CNPJ..."
            className="w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <Button type="submit" variant="ghost">Buscar</Button>
        </form>
        <div className="flex gap-1 text-sm">
          {SORTS.map((sOpt) => {
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (f) params.set("f", f);
            params.set("sort", sOpt.key);
            return (
              <Link
                key={sOpt.key}
                href={`/clientes?${params.toString()}`}
                className={`rounded-lg px-3 py-1.5 ${
                  activeSort === sOpt.key ? "bg-primary text-primary-fg" : "text-muted hover:text-foreground"
                }`}
              >
                {sOpt.label}
              </Link>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-surface p-10 text-center text-sm text-muted">
          {q || f ? "Nenhum cliente encontrado." : "Nenhum cliente ainda. Cadastre o primeiro."}
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-surface">
          {filtered.map(({ c, status }) => {
            const name = customerDisplayName(c);
            const d = daysSince(c.last_contact_at);
            return (
              <li
                key={c.id}
                className={`px-4 py-3 ${c.status === "inactive" ? "opacity-55" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/clientes/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{name}</span>
                      <RelBadge status={status} />
                      {c.status === "inactive" && (
                        <span className="rounded-full border px-2 py-0.5 text-xs text-muted">
                          Inativo
                        </span>
                      )}
                      {c.status === "blocked" && (
                        <span className="rounded-full border border-danger/40 bg-danger/10 px-2 py-0.5 text-xs text-danger">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted">
                      {c.phone ?? c.whatsapp ?? c.email ?? "—"}
                      {d != null && ` · há ${d} dia${d === 1 ? "" : "s"}`}
                    </p>
                  </Link>
                  {status !== "active" && c.status !== "blocked" && (
                    <RecoveryAction
                      customerId={c.id}
                      customerName={name}
                      whatsapp={c.whatsapp ?? c.phone}
                      defaultMessage={recoveryMessage(name, status)}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  active,
  href,
}: {
  label: string;
  value: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-3 text-center transition ${
        active ? "border-primary bg-primary-soft" : "hover:bg-subtle"
      }`}
    >
      <p className="tabular text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </Link>
  );
}
