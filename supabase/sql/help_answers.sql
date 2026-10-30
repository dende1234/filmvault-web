-- Reel answers managed from /admin/feedback → Hulpvragen, next to the fixed
-- knowledge base in lib/help/faq.ts: an admin turns an unanswered question
-- into an answer without a new release. Everyone can read active answers
-- (Reel matches in the browser); only admins can write. Safe to run again.

create table if not exists public.help_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  question_nl text not null check (char_length(question_nl) between 3 and 200),
  question_en text not null check (char_length(question_en) between 3 and 200),
  answer_nl text not null check (char_length(answer_nl) between 3 and 2000),
  answer_en text not null check (char_length(answer_en) between 3 and 2000),
  keywords_nl text[] not null default '{}',
  keywords_en text[] not null default '{}',
  pages text[] not null default '{}',
  -- false = "Filmory can't do this (yet)": Reel offers feedback with the answer.
  possible boolean not null default true,
  active boolean not null default true
);

alter table public.help_answers enable row level security;

drop policy if exists help_answers_select on public.help_answers;
create policy help_answers_select on public.help_answers
  for select to anon, authenticated
  using (active or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists help_answers_write_admin on public.help_answers;
create policy help_answers_write_admin on public.help_answers
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
