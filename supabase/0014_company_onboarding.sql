-- Estado do onboarding por empresa.
-- dismissed: usuário dispensou o card do Dashboard (pode reabrir via "Primeiros passos").
-- issues_invoices: null = ainda não respondeu; true/false = respondeu à pergunta de NFS-e.
create table public.company_onboarding (
  company_id    uuid primary key references public.companies(id) on delete cascade,
  dismissed     boolean not null default false,
  issues_invoices boolean,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.company_onboarding enable row level security;

create policy company_onboarding_rw on public.company_onboarding
  using  (company_id in (select public.my_company_ids()))
  with check (company_id in (select public.my_company_ids()));
