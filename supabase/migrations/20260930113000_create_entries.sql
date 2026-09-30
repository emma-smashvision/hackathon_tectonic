-- A shared, public list for verifying the hackathon app's database connection.
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  word text not null,
  created_at timestamptz not null default now(),
  constraint entries_word_length check (char_length(btrim(word)) between 1 and 80),
  constraint entries_word_trimmed check (word = btrim(word))
);

create index entries_created_at_idx on public.entries (created_at desc, id desc);

alter table public.entries enable row level security;

revoke all on public.entries from anon, authenticated;
grant select, insert, delete on public.entries to anon, authenticated;

create policy "Anyone can read entries"
  on public.entries for select to anon, authenticated using (true);

create policy "Anyone can add entries"
  on public.entries for insert to anon, authenticated with check (true);

create policy "Anyone can remove entries"
  on public.entries for delete to anon, authenticated using (true);
