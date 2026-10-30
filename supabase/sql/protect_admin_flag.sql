-- Only an admin can make someone an admin. Members may update their own
-- profile row (name, bio, ...), and depending on the profiles policies that
-- could include is_admin; this trigger refuses that, also for direct API
-- calls. The service role and the signup trigger (no auth.uid()) are not
-- affected. Safe to run again.

create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (tg_op = 'INSERT' and coalesce(new.is_admin, false))
     or (tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin) then
    if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
      raise exception 'only admins can change is_admin' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
  before insert or update of is_admin on public.profiles
  for each row execute function public.protect_profile_admin_flag();
