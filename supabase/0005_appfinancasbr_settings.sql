-- =====================================================================
-- AppFinançasBr — configurações por empresa
-- Executar no SQL editor do Supabase (projeto suite-comercial).
-- =====================================================================

create table public.company_appfinancasbr_settings (
  company_id  uuid primary key references public.companies(id) on delete cascade,
  token       text,
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.company_appfinancasbr_settings enable row level security;

-- Mesmo padrão da policy company_asaas_client_settings e das demais tabelas
-- de dados por empresa: acesso total para membros da própria empresa.
create policy company_appfinancasbr_settings_rw on public.company_appfinancasbr_settings
  for all
  using      (company_id in (select public.my_company_ids()))
  with check (company_id in (select public.my_company_ids()));
