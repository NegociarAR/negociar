-- =====================================================================
-- Cobrança Recorrente — etapa 1
-- Executar no SQL editor do Supabase (projeto suite-comercial).
-- =====================================================================

-- 1. Tipo enum para o período
create type public.recurring_period as enum ('monthly');

-- 2. Tabela principal
create table public.recurring_charges (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies(id) on delete cascade,
  customer_id             uuid not null references public.customers(id) on delete cascade,
  description             text not null,
  amount_cents            integer not null check (amount_cents > 0),
  period                  public.recurring_period not null default 'monthly',
  day_of_month            integer not null check (day_of_month between 1 and 28),
  next_due_date           date not null,
  active                  boolean not null default true,
  last_generated_sale_id  uuid references public.sales(id),
  created_at              timestamptz not null default now()
);

create index recurring_charges_company_idx on public.recurring_charges (company_id);
create index recurring_charges_due_idx     on public.recurring_charges (next_due_date) where active;

-- 3. RLS — mesmo padrão das outras tabelas de dados (company_id-scoped)
alter table public.recurring_charges enable row level security;

create policy recurring_charges_rw on public.recurring_charges
  for all
  using      (company_id in (select public.my_company_ids()))
  with check (company_id in (select public.my_company_ids()));

-- 4. RPC de geração diária
--    Padrão idêntico a close_sale: security definer, search_path = public,
--    autorização via company_users (uid()).
--    Observação: 'reference_period' não existe em sales (confirmado no schema) —
--    a informação de período vai em notes.
create or replace function public.generate_recurring_charges()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r         record;
  v_sale_id uuid;
  v_count   integer := 0;
begin
  for r in
    select *
    from   recurring_charges
    where  active
      and  next_due_date <= current_date
    order  by next_due_date
  loop
    -- Cria a venda sem quote_id (campo nullable em sales)
    insert into sales (
      company_id, customer_id, quote_id,
      total_cents, gross_cents, net_cents,
      status, sold_at,
      discount_percent, discount_cents,
      down_payment_cents, installments, first_due_date,
      notes
    ) values (
      r.company_id, r.customer_id, null,
      r.amount_cents, r.amount_cents, r.amount_cents,
      'won', now(),
      0, 0,
      0, 1, r.next_due_date,
      'Cobrança recorrente: ' || r.description
    )
    returning id into v_sale_id;

    -- Cria a única parcela (number = 1, igual ao padrão de close_sale)
    insert into sale_installments (sale_id, company_id, number, due_date, amount_cents, status)
    values (v_sale_id, r.company_id, 1, r.next_due_date, r.amount_cents, 'pending');

    -- Avança next_due_date para o próximo ciclo
    update recurring_charges
    set    next_due_date           = (r.next_due_date + interval '1 month')::date,
           last_generated_sale_id  = v_sale_id
    where  id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
