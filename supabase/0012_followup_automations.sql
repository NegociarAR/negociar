-- Automações de follow-up e notificações.
-- Executar no SQL Editor do Supabase (projeto suite-comercial).

alter table public.sale_installments
  add column if not exists client_due_reminder_sent_at timestamptz;

create table if not exists public.company_notification_settings (
  company_id uuid primary key references public.companies(id),
  client_due_reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_notification_settings enable row level security;

create policy "company members can manage their notification settings"
  on public.company_notification_settings
  for all
  using  (company_id in (select public.my_company_ids()))
  with check (company_id in (select public.my_company_ids()));

create or replace function public.check_quote_followups()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_stalled int := 0;
  v_expiring int := 0;
begin
  -- parado: sent/viewed/negotiation/negotiation_requested, sem mudança de
  -- status há mais de 5 dias, e sem follow-up pendente já aberto pra esse orçamento
  for r in
    select q.id, q.company_id, q.customer_id, q.number,
           coalesce((select max(changed_at) from quote_status_history h where h.quote_id = q.id), q.sent_at) as last_change
    from quotes q
    where q.status in ('sent','viewed','negotiation','negotiation_requested')
      and q.deleted_at is null
      and not exists (select 1 from followups f where f.quote_id = q.id and f.status = 'pending')
  loop
    if r.last_change is not null and r.last_change < now() - interval '5 days' then
      insert into followups (company_id, customer_id, quote_id, due_date, reason, status)
      values (r.company_id, r.customer_id, r.id, current_date, 'Orçamento #' || r.number || ' parado há mais de 5 dias', 'pending');
      perform notify_company_users(r.company_id, 'quote_stalled',
        'Orçamento #' || r.number || ' parado',
        'Sem movimento há mais de 5 dias.');
      v_stalled := v_stalled + 1;
    end if;
  end loop;

  -- expirando: validade em até 3 dias, ainda em aberto, só notifica 1x por dia
  for r in
    select q.id, q.company_id, q.number, q.valid_until
    from quotes q
    where q.status in ('sent','viewed','negotiation','negotiation_requested')
      and q.deleted_at is null
      and q.valid_until is not null
      and q.valid_until between current_date and current_date + 3
      and not exists (
        select 1 from notifications n
        where n.company_id = q.company_id and n.type = 'quote_expiring'
          and n.title = 'Orçamento #' || q.number || ' expira em breve'
          and n.created_at::date = current_date
      )
  loop
    perform notify_company_users(r.company_id, 'quote_expiring',
      'Orçamento #' || r.number || ' expira em breve',
      'Validade: ' || to_char(r.valid_until, 'DD/MM/YYYY'));
    v_expiring := v_expiring + 1;
  end loop;

  return jsonb_build_object('stalled', v_stalled, 'expiring', v_expiring);
end;
$$;
