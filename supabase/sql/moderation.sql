-- Moderation in one screen (/admin/reports): recent posts and comments from
-- everyone, removing them, and blocking a member from posting. Feed posts
-- are only readable by followers (social_feed.sql), so admins read and
-- delete through these security-definer functions. A blocked member can
-- still use their collection; only new posts and comments are refused
-- (restrictive insert policies). Safe to run again.

create table if not exists public.blocked_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text check (char_length(reason) <= 300),
  blocked_by uuid default auth.uid(),
  blocked_at timestamptz not null default now()
);

alter table public.blocked_members enable row level security;

drop policy if exists blocked_members_admin on public.blocked_members;
create policy blocked_members_admin on public.blocked_members
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Blocked members can't post or comment (on top of the existing policies).
drop policy if exists posts_not_blocked on public.posts;
create policy posts_not_blocked on public.posts
  as restrictive for insert to authenticated
  with check (not exists (select 1 from public.blocked_members b where b.user_id = auth.uid()));

drop policy if exists post_comments_not_blocked on public.post_comments;
create policy post_comments_not_blocked on public.post_comments
  as restrictive for insert to authenticated
  with check (not exists (select 1 from public.blocked_members b where b.user_id = auth.uid()));

create or replace function public.admin_recent_content(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  return jsonb_build_object(
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'author_id', p.author_id, 'author', pr.name, 'title', p.title,
                                          'body', p.body, 'movie_title', p.movie_title, 'created_at', p.created_at)
                       order by p.created_at desc)
        from (select * from public.posts order by created_at desc nulls last limit greatest(1, least(p_limit, 200))) p
        left join public.profiles pr on pr.id = p.author_id), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'post_id', c.post_id, 'author_id', c.author_id, 'author', pr.name,
                                          'body', c.body, 'created_at', c.created_at)
                       order by c.created_at desc)
        from (select * from public.post_comments order by created_at desc nulls last limit greatest(1, least(p_limit, 200))) c
        left join public.profiles pr on pr.id = c.author_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_delete_content(p_type text, p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception 'not_admin';
  end if;
  if p_type = 'post' then
    delete from public.posts where id::text = p_id;
  elsif p_type = 'comment' then
    delete from public.post_comments where id::text = p_id;
  else
    raise exception 'bad_type';
  end if;
end;
$$;

revoke all on function public.admin_recent_content(int) from public, anon;
revoke all on function public.admin_delete_content(text, text) from public, anon;
grant execute on function public.admin_recent_content(int) to authenticated;
grant execute on function public.admin_delete_content(text, text) to authenticated;
