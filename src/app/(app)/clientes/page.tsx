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
import { LeadForm } from "@/modules/clientes/lead-form";
import { STAGE_TABS, STAGE_LABELS, STAGE_BADGE, type Stage } from "@/modules/clientes/stages";

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
  searchParams: Promise<{ q?: string; limite?: string; sort?: CustomerSort; f?: string; etapa?: string }>;
}) {
  const { q, limite, sort, f, etapa } = await searchParams;
  const activeSort = sort ?? "recent";
  await autoInactivateStale();
  const { customers: allCustomers } = await listCustomersSorted(q, activeSort);
  const stageOf = (c: { stage?: Stage }): Stage => c.stage ?? "customer";
  const stageFilter = (["lead", "opportunity", "customer", "lost"] as const).find((x) => x === etapa) ?? null;
  const stageCounts: Record<string, number> = {
    all: allCustomers.length,
    lead: allCustomers.filter((c) => stageOf(c) === "lead").length,
    opportunity: allCustomers.filter((c) => stageOf(c) === "opportunity").length,
    customer: allCustomers.filter((c) => stageOf(c) === "customer").length,
    lost: allCustomers.filter((c) => stageOf(c) === "lost").length,
  };
  const customers = stageFilter ? allCustomers.filter((c) => stageOf(c) === stageFilter) : allCustomers;
  const fHref = (v?: string) => {
    const p = new URLSearchParams();
    if (stageFilter) p.set("etapa", stageFilter);
    if (v) p.set("f", v);
    const qs = p.toString();
    return `/clientes${qs ? `?${qs}` : ""}`;
  };
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
            {gate.limit === null ? `${used} contatos` : `${used}/${gate.limit} contatos`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCustomers />
          <LeadForm />
          <Link href="/pipeline" className="text-sm font-medium text-primary hover:underline">Pipeline →</Link>
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

      {/* etapas comerciais */}
      <div className="flex gap-1 overflow-x-auto border-b text-sm">
        {STAGE_TABS.map((t) => {
          const p = new URLSearchParams();
          if (q) p.set("q", q);
          if (t.key !== "all") p.set("etapa", t.key);
          const qs = p.toString();
          const active = (stageFilter ?? "all") === t.key;
          return (
            <Link
              key={t.key}
              href={`/clientes${qs ? `?${qs}` : ""}`}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 ${
                active ? "border-primary font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t.label} <span className="tabular text-xs text-muted">{stageCounts[t.key]}</span>
            </Link>
          );
        })}
      </div>

      {/* stats clicáveis */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Todos" value={stats.all} active={!f} href={fHref()} />
        <StatCard label="Em dia" value={stats.active} active={f === "active"} href={fHref("active")} />
        <StatCard label="Sem retorno" value={stats.stale} active={f === "stale"} href={fHref("stale")} />
        <StatCard label="Esquecidos" value={stats.forgotten} active={f === "forgotten"} href={fHref("forgotten")} />
      </div>

      <ThresholdSettings yellowDays={t.yellowDays} redDays={t.redDays} />

      {/* busca + ordenação */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex flex-1 gap-2">
          {f && <input type="hidden" name="f" value={f} />}
          {stageFilter && <input type="hidden" name="etapa" value={stageFilter} />}
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
            if (stageFilter) params.set("etapa", stageFilter);
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
                      {stageOf(c) !== "customer" && (
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${STAGE_BADGE[stageOf(c)]}`}>
                          {STAGE_LABELS[stageOf(c)]}
                        </span>
                      )}
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
                  {status !== "active" && c.status !== "blocked" && stageOf(c) !== "lost" && (
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
