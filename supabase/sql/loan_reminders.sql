-- Reminder for films you lent out more than 30 days ago: one notification
-- per loan in /meldingen (kind 'loan_reminder'). Made when you open the
-- dashboard (create_my_loan_reminders), so no scheduled job or service key
-- is needed. A new loan of the same copy gets a new reminder.
-- Needs contributors_region.sql (user_notifications). Safe to run again.

alter table public.collection_items add column if not exists loan_reminded_at timestamptz;

-- Widen the allowed notification kinds.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.user_notifications'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.user_notifications drop constraint %I', c.conname);
  end loop;
  alter table public.user_notifications
    add constraint user_notifications_kind_check
    check (kind in ('barcode_approved', 'barcode_rejected', 'loan_reminder', 'announcement'));
end $$;

create or replace function public.create_my_loan_reminders(p_days int default 30)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  made int := 0;
begin
  if me is null then
    return 0;
  end if;

  with due as (
    select distinct on (ci.item_group_id)
           ci.item_group_id, ci.id, ci.collection_id, ci.tmdb_movie_id, ci.movie_title, ci.movie_poster,
           ci.loaned_to, ci.loaned_at
      from public.collection_items ci
      join public.collections c on c.id = ci.collection_id
     where c.user_id = me
       and ci.loaned_to is not null
       and ci.loaned_at is not null
       and ci.loaned_at < now() - make_interval(days => p_days)
       and (ci.loan_reminded_at is null or ci.loan_reminded_at < ci.loaned_at)
     order by ci.item_group_id, ci.id
  ),
  notified as (
    insert into public.user_notifications (user_id, kind, payload)
    select me, 'loan_reminder', jsonb_build_object(
             'title', d.movie_title, 'poster', d.movie_poster, 'loanedTo', d.loaned_to, 'loanedAt', d.loaned_at,
             'tmdbMovieId', d.tmdb_movie_id, 'collectionId', d.collection_id, 'itemId', d.id)
      from due d
    returning 1
  ),
  marked as (
    update public.collection_items ci
       set loan_reminded_at = now()
     where ci.item_group_id in (select item_group_id from due)
    returning 1
  )
  select count(*) into made from notified;

  return made;
end;
$$;

revoke all on function public.create_my_loan_reminders(int) from public, anon;
grant execute on function public.create_my_loan_reminders(int) to authenticated;
