-- =====================================================================
-- Suíte Comercial — Schema inicial (MVP 1)
-- Postgres / Supabase
-- Convenções: snake_case, timestamptz, soft-delete via deleted_at,
-- todo dado de negócio carrega company_id + RLS por empresa.
-- =====================================================================

create extension if not exists "pgcrypto";        -- gen_random_uuid()
create extension if not exists "pg_trgm";          -- busca textual (busca global)

-- =====================================================================
-- 1. CORE: empresas, vínculo usuário↔empresa, planos, assinaturas
-- =====================================================================

create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  legal_name   text,
  cnpj         text,
  logo_url     text,
  phone        text,
  email        text,
  address      text,
  city         text,
  state        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- papéis previstos no PRD (seção 32). owner = criador da empresa.
create type public.company_role as enum ('owner','admin','vendedor','financeiro','gestor');

create table public.company_users (
  company_id   uuid not null references public.companies(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         public.company_role not null default 'owner',
  created_at   timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- Planos. Módulos e limites em JSONB para ajustar sem migration.
-- modules ex.: {"clientes":true,"precifica":true,"orcamentos":true}
-- limits  ex.: {"customers":30,"quotes_per_month":5,"products":10}
--             (null = ilimitado)
create table public.plans (
  id           text primary key,               -- 'free','clientezap','pro',...
  name         text not null,
  price_cents  integer not null default 0,
  modules      jsonb not null default '{}'::jsonb,
  limits       jsonb not null default '{}'::jsonb,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create type public.subscription_status as enum ('active','trialing','past_due','canceled');

create table public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  plan_id      text not null references public.plans(id),
  status       public.subscription_status not null default 'active',
  current_period_end timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- uma assinatura ativa por empresa
create unique index subscriptions_one_active_per_company
  on public.subscriptions(company_id) where status in ('active','trialing');

-- =====================================================================
-- 2. CLIENTEZAP: clientes, contatos, tags, follow-ups, atividades
-- =====================================================================

create type public.person_type as enum ('pf','pj');

create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  person_type  public.person_type not null default 'pj',
  -- PF
  name         text,
  cpf          text,
  -- PJ
  legal_name   text,
  trade_name   text,
  cnpj         text,
  -- comum
  phone        text,
  whatsapp     text,
  email        text,
  address      text,
  city         text,
  state        text,
  contact_name text,                            -- contato (PJ)
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index customers_company_idx on public.customers(company_id) where deleted_at is null;
create index customers_search_idx on public.customers
  using gin ((coalesce(name,'')||' '||coalesce(trade_name,'')||' '||coalesce(legal_name,'')||' '||coalesce(cnpj,'')||' '||coalesce(phone,'')) gin_trgm_ops);

create table public.customer_contacts (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  channel      text,                            -- whatsapp, phone, email
  content      text,
  created_at   timestamptz not null default now()
);
create index customer_contacts_customer_idx on public.customer_contacts(customer_id);

-- tags por empresa + associação n:n
create table public.tags (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null,
  color        text,
  created_at   timestamptz not null default now(),
  unique (company_id, name)
);

create table public.customer_tags (
  customer_id  uuid not null references public.customers(id) on delete cascade,
  tag_id       uuid not null references public.tags(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  primary key (customer_id, tag_id)
);

create type public.followup_status as enum ('pending','done','canceled');

create table public.followups (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  quote_id     uuid,                            -- FK adicionada após quotes
  due_date     date not null,
  reason       text,
  notes        text,
  assigned_to  uuid references auth.users(id),
  status       public.followup_status not null default 'pending',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);
create index followups_company_due_idx on public.followups(company_id, due_date) where status = 'pending';
create index followups_customer_idx on public.followups(customer_id);

-- timeline unificada do cliente (seção 12)
create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  customer_id  uuid references public.customers(id) on delete cascade,
  type         text not null,                   -- customer_created, contact, quote_sent, sale, note...
  title        text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index activities_customer_idx on public.activities(customer_id, created_at desc);

-- =====================================================================
-- 3. PRECIFICA: categorias, produtos, cálculos de preço
-- =====================================================================

create table public.product_categories (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null,
  created_at   timestamptz not null default now(),
  unique (company_id, name)
);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  category_id  uuid references public.product_categories(id) on delete set null,
  name         text not null,
  sku          text,
  unit         text,                            -- un, kg, h, m...
  cost_cents   integer not null default 0,      -- custo base
  current_price_cents integer,                  -- último preço definido
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index products_company_idx on public.products(company_id) where deleted_at is null;

-- histórico de cálculos = também histórico de preços (seção 18)
create table public.price_calculations (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  product_id        uuid references public.products(id) on delete cascade,
  cost_cents        integer not null default 0,
  expenses_cents    integer not null default 0,
  tax_percent       numeric(6,3) not null default 0,
  commission_percent numeric(6,3) not null default 0,
  margin_percent    numeric(6,3) not null default 0,
  -- resultado (persistido para histórico; recalculável)
  suggested_price_cents integer,
  profit_cents      integer,
  is_reverse        boolean not null default false,   -- precificação reversa (seção 17)
  target_price_cents integer,                          -- preço-alvo, quando reversa
  created_at        timestamptz not null default now()
);
create index price_calc_product_idx on public.price_calculations(product_id, created_at desc);

-- =====================================================================
-- 4. ORÇAFÁCIL: orçamentos, itens, histórico de status
-- =====================================================================

create type public.quote_status as enum
  ('draft','sent','viewed','negotiation','approved','rejected');

create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete restrict,
  number        integer not null,               -- sequencial por empresa (#1048)
  status        public.quote_status not null default 'draft',
  public_token  text not null default translate(encode(gen_random_bytes(12),'base64'),'+/=','-_'),  -- página pública (URL-safe)
  discount_cents integer not null default 0,
  subtotal_cents integer not null default 0,     -- desnormalizado (soma dos itens)
  total_cents   integer not null default 0,
  valid_until   date,
  payment_terms text,
  delivery_terms text,
  notes         text,
  sent_at       timestamptz,
  viewed_at     timestamptz,
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (company_id, number)
);
create unique index quotes_public_token_idx on public.quotes(public_token);
create index quotes_company_idx on public.quotes(company_id) where deleted_at is null;
create index quotes_customer_idx on public.quotes(customer_id);

create table public.quote_items (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  description   text not null,                   -- snapshot do nome (produto pode mudar)
  quantity      numeric(12,3) not null default 1,
  unit_price_cents integer not null default 0,
  total_cents   integer not null default 0,
  sort_order    integer not null default 0
);
create index quote_items_quote_idx on public.quote_items(quote_id);

create table public.quote_status_history (
  id            uuid primary key default gen_random_uuid(),
  quote_id      uuid not null references public.quotes(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  status        public.quote_status not null,
  changed_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index quote_status_history_quote_idx on public.quote_status_history(quote_id, created_at);

-- FK atrasada: followups.quote_id → quotes.id
alter table public.followups
  add constraint followups_quote_fk
  foreign key (quote_id) references public.quotes(id) on delete set null;

-- número sequencial de orçamento por empresa
create table public.quote_counters (
  company_id   uuid primary key references public.companies(id) on delete cascade,
  last_number  integer not null default 0
);

create or replace function public.next_quote_number(p_company uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into quote_counters(company_id, last_number) values (p_company, 1)
    on conflict (company_id) do update set last_number = quote_counters.last_number + 1
    returning last_number into n;
  return n;
end $$;

-- =====================================================================
-- 5. VENDAS
-- =====================================================================

create table public.sales (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete restrict,
  quote_id      uuid references public.quotes(id) on delete set null,
  total_cents   integer not null default 0,
  status        text not null default 'won',    -- won, received...
  sold_at       timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index sales_company_idx on public.sales(company_id);
create index sales_customer_idx on public.sales(customer_id);

-- =====================================================================
-- 6. NOTIFICAÇÕES  (in-app; seção 31)
-- =====================================================================

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  type          text not null,                  -- followup_due, quote_no_reply...
  title         text not null,
  body          text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc) where read_at is null;

-- =====================================================================
-- 7. USAGE  (contadores para limites do freemium; seções 42–43)
-- Um registro por empresa/período para quota mensal (orçamentos/mês).
-- Contadores absolutos (clientes, produtos) são contados direto.
-- =====================================================================

create table public.usage_counters (
  company_id   uuid not null references public.companies(id) on delete cascade,
  metric       text not null,                   -- quotes_created
  period       text not null,                   -- '2026-09' ou 'all'
  count        integer not null default 0,
  primary key (company_id, metric, period)
);

-- =====================================================================
-- 8. updated_at automático
-- =====================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['companies','customers','products','quotes','subscriptions']
  loop
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- =====================================================================
-- 9. HELPERS de autorização (usados no RLS)
-- =====================================================================

-- empresas às quais o usuário atual pertence
create or replace function public.my_company_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select company_id from public.company_users where user_id = auth.uid()
$$;

-- =====================================================================
-- 10. RLS — habilitar em todas as tabelas de dados
-- Regra base: acesso apenas às empresas do usuário (company_id ∈ my_company_ids()).
-- =====================================================================

alter table public.companies         enable row level security;
alter table public.company_users     enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.customers         enable row level security;
alter table public.customer_contacts enable row level security;
alter table public.tags              enable row level security;
alter table public.customer_tags     enable row level security;
alter table public.followups         enable row level security;
alter table public.activities        enable row level security;
alter table public.product_categories enable row level security;
alter table public.products          enable row level security;
alter table public.price_calculations enable row level security;
alter table public.quotes            enable row level security;
alter table public.quote_items       enable row level security;
alter table public.quote_status_history enable row level security;
alter table public.sales             enable row level security;
alter table public.notifications     enable row level security;
alter table public.usage_counters    enable row level security;
-- plans: leitura pública (catálogo); sem escrita via cliente.
alter table public.plans             enable row level security;
create policy plans_read on public.plans for select using (is_active);

-- company_users: usuário vê os vínculos das suas empresas
create policy company_users_select on public.company_users
  for select using (company_id in (select public.my_company_ids()));

-- companies: membro lê; owner/admin edita
create policy companies_select on public.companies
  for select using (id in (select public.my_company_ids()));
create policy companies_update on public.companies
  for update using (exists (
    select 1 from public.company_users cu
    where cu.company_id = companies.id and cu.user_id = auth.uid()
      and cu.role in ('owner','admin')));

-- subscriptions: membro lê (escrita via service_role/webhook)
create policy subscriptions_select on public.subscriptions
  for select using (company_id in (select public.my_company_ids()));

-- Política genérica ALL para as tabelas de dados por company_id.
do $$
declare t text;
begin
  foreach t in array array[
    'customers','customer_contacts','tags','customer_tags','followups',
    'activities','product_categories','products','price_calculations',
    'quotes','quote_items','quote_status_history','sales','usage_counters'
  ]
  loop
    execute format(
      'create policy %1$s_rw on public.%1$s for all
         using (company_id in (select public.my_company_ids()))
         with check (company_id in (select public.my_company_ids()))', t);
  end loop;
end $$;

-- notifications: por usuário
create policy notifications_rw on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- 11. Página pública do orçamento (seção 25)
-- Leitura sem login via public_token — feita por RPC security definer,
-- NÃO por política aberta (evita varredura da tabela).
-- =====================================================================

create or replace function public.get_public_quote(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'quote', to_jsonb(q) - 'company_id' - 'public_token',
    'company', jsonb_build_object('name', c.name, 'logo_url', c.logo_url,
               'phone', c.phone, 'email', c.email),
    'customer', jsonb_build_object('name',
               coalesce(cu.trade_name, cu.name, cu.legal_name)),
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.sort_order)
                       from quote_items i where i.quote_id = q.id), '[]'::jsonb)
  )
  from quotes q
  join companies c on c.id = q.company_id
  join customers cu on cu.id = q.customer_id
  where q.public_token = p_token and q.deleted_at is null
$$;

grant execute on function public.get_public_quote(text) to anon, authenticated;

-- decisão do cliente na página pública (aprovar/recusar)
create or replace function public.decide_public_quote(p_token text, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
declare q record;
begin
  if p_decision not in ('approved','rejected') then
    raise exception 'invalid decision';
  end if;
  select * into q from quotes where public_token = p_token and deleted_at is null;
  if not found then raise exception 'not found'; end if;
  update quotes set status = p_decision::quote_status, decided_at = now()
    where id = q.id;
  insert into quote_status_history(quote_id, company_id, status)
    values (q.id, q.company_id, p_decision::quote_status);
end $$;

grant execute on function public.decide_public_quote(text, text) to anon, authenticated;
