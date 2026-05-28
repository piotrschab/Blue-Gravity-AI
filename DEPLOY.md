# BGC Agents — Instrukcja wdrożenia
# Vercel + Supabase

---

## KROK 1 — Supabase

1. supabase.com → Twój projekt → SQL Editor
2. Wklej i uruchom `supabase-setup.sql`
3. Skopiuj z Project Settings → API:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY

---

## KROK 2 — GitHub

1. Utwórz nowe prywatne repo na github.com
2. Wgraj wszystkie pliki z tego folderu

---

## KROK 3 — Vercel

1. vercel.com → Add New Project → zaimportuj repo
2. Framework: Next.js (wykryje automatycznie)
3. Dodaj Environment Variables:

   ANTHROPIC_API_KEY           = sk-ant-api03-TWOJ_NOWY_KLUCZ
   ANTHROPIC_AGENT_ID          = agent_01Ks7zYVtLK7y9CVhnS1UQsh
   ANTHROPIC_ENVIRONMENT_ID    = env_01QAwoXtT9bY1JmGdTHdHXWr
   NEXT_PUBLIC_SUPABASE_URL    = https://TWOJ_PROJEKT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = TWOJ_ANON_KEY

4. Deploy → za ~2 minuty masz link

---

## Dodawanie nowych agentów w przyszłości

Gdy dodasz nowych agentów w Claude Console i zarejestrujesz ich
w Orchestratorze (multiagent.agents w YAML) — aplikacja
automatycznie ich wykryje i pokaże w interfejsie.
Nie musisz nic zmieniać w kodzie.
  
