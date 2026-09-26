-- =====================================================================
-- Bootstrap no cadastro: todo novo auth.user ganha uma empresa,
-- vínculo owner e assinatura Free. Nome da empresa vem de
-- raw_user_meta_data->>'company_name' (definido no signup do app),
-- com fallback para 'Minha empresa'.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_company uuid;
begin
  insert into public.companies (name, email)
    values (coalesce(new.raw_user_meta_data->>'company_name','Minha empresa'), new.email)
    returning id into new_company;

  insert into public.company_users (company_id, user_id, role)
    values (new_company, new.id, 'owner');

  insert into public.subscriptions (company_id, plan_id, status)
    values (new_company, 'free', 'active');

  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
