-- Recria respond_public_quote adicionando notificações in-app para todos os
-- usuários da empresa quando o cliente aprova, recusa ou pede negociação.
create or replace function public.respond_public_quote(
  p_token text,
  p_action text,
  p_reason text default null,
  p_signer_name text default null
) returns void
  language plpgsql security definer
  set search_path to 'public'
as $$
declare
  q       record;
  notif_title text;
  notif_body  text;
  u       record;
begin
  select id, company_id, number, customer_id, status
    into q
  from quotes
  where public_token = p_token and deleted_at is null;
  if not found then raise exception 'not found'; end if;

  if p_action = 'approved' then
    update quotes
      set status = 'approved',
          decided_at = now(),
          approved_by_name = nullif(trim(coalesce(p_signer_name, '')), '')
      where id = q.id;
    insert into quote_status_history(quote_id, company_id, status)
      values (q.id, q.company_id, 'approved');

    notif_title := 'Orçamento #' || q.number || ' aprovado';
    notif_body  := case
      when nullif(trim(coalesce(p_signer_name, '')), '') is not null
        then 'Aprovado por ' || trim(p_signer_name)
      else 'O cliente aprovou o orçamento.'
    end;

  elsif p_action = 'rejected' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason required';
    end if;
    update quotes
      set status = 'rejected', decided_at = now(), decision_reason = p_reason
      where id = q.id;
    insert into quote_status_history(quote_id, company_id, status)
      values (q.id, q.company_id, 'rejected');

    notif_title := 'Orçamento #' || q.number || ' recusado';
    notif_body  := p_reason;

  elsif p_action = 'negotiate' then
    if p_reason is null or length(trim(p_reason)) = 0 then
      raise exception 'reason required';
    end if;
    update quotes
      set status = 'negotiation_requested', decision_reason = p_reason
      where id = q.id;
    insert into quote_status_history(quote_id, company_id, status)
      values (q.id, q.company_id, 'negotiation_requested');

    notif_title := 'Orçamento #' || q.number || ': cliente quer negociar';
    notif_body  := p_reason;

  else
    raise exception 'invalid action';
  end if;

  -- notificação in-app para cada membro da empresa
  for u in
    select user_id from company_users where company_id = q.company_id
  loop
    insert into notifications(company_id, user_id, type, title, body)
    values (q.company_id, u.user_id, 'quote_' || p_action, notif_title, notif_body);
  end loop;

  insert into activities(company_id, customer_id, type, title, metadata)
  values (
    q.company_id, q.customer_id,
    'quote_' || p_action,
    case p_action
      when 'approved' then 'Orçamento #' || q.number || ' aprovado pelo cliente'
      when 'rejected' then 'Orçamento #' || q.number || ' recusado pelo cliente'
      else 'Cliente pediu negociação no orçamento #' || q.number
    end,
    coalesce(jsonb_build_object('reason', p_reason), '{}'::jsonb)
  );
end $$;
