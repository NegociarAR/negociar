-- Vinculo opcional entre cobrança recorrente e orçamento de origem.
-- Executar no SQL editor do Supabase (projeto suite-comercial).

alter table public.recurring_charges add column if not exists quote_id uuid references public.quotes(id);
create index if not exists recurring_charges_quote_idx on public.recurring_charges (quote_id);
