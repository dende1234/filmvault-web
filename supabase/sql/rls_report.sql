-- Security check for /admin/status: every table in the public schema with
-- whether row level security is on and how many policies it has. A table
-- without RLS is readable and writable by any signed-in member through the
-- API. Only admins get rows. Safe to run again.

create or replace function public.admin_rls_report()
returns table (table_name text, rls_enabled boolean, policies int)
language sql
stable
security definer
set search_path = public
as $$
  select c.relname::text,
         c.relrowsecurity,
         (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')
     and exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.is_admin)
   order by c.relrowsecurity, c.relname;
$$;

revoke all on function public.admin_rls_report() from public, anon;
grant execute on function public.admin_rls_report() to authenticated;
