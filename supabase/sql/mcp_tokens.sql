-- Personal access tokens for the Filmory MCP server (/api/mcp): a member
-- connects an AI assistant (Claude Desktop, Claude Code, ...) to their own
-- collection, read-only. Only the SHA-256 of a token is stored; the token
-- itself is shown once when it's made. Members see and revoke their own
-- tokens (RLS). The server resolves a token with mcp_use_token(), which
-- only the service role may call, counts calls per hour and refuses a
-- revoked or over-limit token. Safe to run again.

create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_hint text not null check (char_length(token_hint) <= 12),
  scope text not null default 'read' check (scope in ('read')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  window_start timestamptz,
  window_calls int not null default 0
);

create index if not exists mcp_tokens_user_idx on public.mcp_tokens (user_id);

alter table public.mcp_tokens enable row level security;

drop policy if exists mcp_tokens_own_read on public.mcp_tokens;
create policy mcp_tokens_own_read on public.mcp_tokens
  for select to authenticated using (user_id = auth.uid());

drop policy if exists mcp_tokens_own_insert on public.mcp_tokens;
create policy mcp_tokens_own_insert on public.mcp_tokens
  for insert to authenticated with check (user_id = auth.uid() and scope = 'read' and revoked_at is null);

-- Updating is only for revoking (the app sets revoked_at); deleting is allowed too.
drop policy if exists mcp_tokens_own_update on public.mcp_tokens;
create policy mcp_tokens_own_update on public.mcp_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists mcp_tokens_own_delete on public.mcp_tokens;
create policy mcp_tokens_own_delete on public.mcp_tokens
  for delete to authenticated using (user_id = auth.uid());

-- Token hash in, member out: {status: 'ok', user_id, is_admin} or
-- {status: 'invalid' | 'limited'}. Counts the call in an hourly window.
create or replace function public.mcp_use_token(p_token_hash text, p_limit int default 600)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.mcp_tokens%rowtype;
begin
  select * into t from public.mcp_tokens
   where token_hash = p_token_hash and revoked_at is null
   for update;
  if not found then return jsonb_build_object('status', 'invalid'); end if;

  if t.window_start is null or t.window_start < now() - interval '1 hour' then
    update public.mcp_tokens set window_start = now(), window_calls = 1, last_used_at = now() where id = t.id;
  elsif t.window_calls >= p_limit then
    return jsonb_build_object('status', 'limited');
  else
    update public.mcp_tokens set window_calls = window_calls + 1, last_used_at = now() where id = t.id;
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'user_id', t.user_id,
    'is_admin', coalesce((select p.is_admin from public.profiles p where p.id = t.user_id), false)
  );
end;
$$;

revoke all on function public.mcp_use_token(text, int) from public, anon, authenticated;
grant execute on function public.mcp_use_token(text, int) to service_role;
