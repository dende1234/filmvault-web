-- Errors from the web app (server errors via instrumentation.ts, browser
-- errors via components/error-reporter.tsx), shown on /admin/status.
-- Written only through log_app_error() (anyone, capped), read by admins.
-- Rows older than 30 days are cleaned up as new ones come in. Safe to run again.

create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null check (source in ('server', 'client')),
  message text not null,
  digest text,
  path text,
  context text,
  user_agent text,
  user_id uuid
);

create index if not exists app_errors_created_at_idx on public.app_errors (created_at desc);

alter table public.app_errors enable row level security;

drop policy if exists app_errors_select_admin on public.app_errors;
create policy app_errors_select_admin on public.app_errors
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create or replace function public.log_app_error(
  p_source text, p_message text, p_digest text default null, p_path text default null,
  p_context text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_source not in ('server', 'client') or coalesce(trim(p_message), '') = '' then
    return;
  end if;
  -- A runaway loop or a flood must not fill the table.
  if (select count(*) from public.app_errors where created_at > now() - interval '1 minute') >= 60 then
    return;
  end if;
  insert into public.app_errors (source, message, digest, path, context, user_agent, user_id)
  values (p_source, left(p_message, 1000), left(p_digest, 100), left(p_path, 300), left(p_context, 300), left(p_user_agent, 300), auth.uid());
  if random() < 0.02 then
    delete from public.app_errors where created_at < now() - interval '30 days';
  end if;
end;
$$;

grant execute on function public.log_app_error(text, text, text, text, text, text) to anon, authenticated;
