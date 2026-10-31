-- Templates de proposta comercial.
-- Executar no SQL Editor do Supabase (projeto suite-comercial).

create table public.quote_templates (
  id              uuid        primary key default gen_random_uuid(),
  company_id      uuid        not null references public.companies(id),
  name            text        not null,
  discount_cents  integer     not null default 0,
  payment_terms   text,
  delivery_terms  text,
  notes           text,
  created_at      timestamptz not null default now()
);

create table public.quote_template_items (
  id               uuid    primary key default gen_random_uuid(),
  template_id      uuid    not null references public.quote_templates(id) on delete cascade,
  company_id       uuid    not null references public.companies(id),
  product_id       uuid    references public.products(id),
  description      text    not null,
  quantity         numeric not null,
  unit_price_cents integer not null,
  sort_order       integer not null default 0
);

create index quote_templates_company_idx      on public.quote_templates      (company_id);
create index quote_template_items_template_idx on public.quote_template_items (template_id);

alter table public.quote_templates      enable row level security;
alter table public.quote_template_items enable row level security;

create policy "company members can manage their quote templates"
  on public.quote_templates
  for all
  using  (company_id in (select public.my_company_ids()))
  with check (company_id in (select public.my_company_ids()));

create policy "company members can manage their quote template items"
  on public.quote_template_items
  for all
  using  (company_id in (select public.my_company_ids()))
  with check (company_id in (select public.my_company_ids()));
