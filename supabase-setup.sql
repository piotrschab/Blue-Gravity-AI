-- Uruchom w Supabase → SQL Editor

create table bgc_conversations (
  id uuid default gen_random_uuid() primary key,
  conversation_id text unique not null,
  session_id text,
  title text,
  messages jsonb,
  agents_engaged jsonb,
  status text default 'done',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index bgc_conversations_created_at_idx on bgc_conversations(created_at desc);

alter table bgc_conversations enable row level security;

create policy "Allow all" on bgc_conversations
  for all using (true) with check (true);
