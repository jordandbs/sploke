-- =====================================================================
-- Muscu : schéma PostgreSQL pour Supabase
-- À exécuter une seule fois : Supabase → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Fonctions utilitaires ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------- Tables synchronisées avec l'application ----------
-- Chaque ligne appartient à un utilisateur (user_id) ; les identifiants (id)
-- sont générés par l'application, ce qui permet d'enregistrer hors ligne.
-- "deleted" = suppression logique, pour propager les suppressions entre appareils.

create table public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '' check (char_length(name) <= 60),
  height_cm  int  check (height_cm between 100 and 250),
  settings   jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.body_weights (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  kg          numeric(5,1) not null check (kg between 20 and 400),
  measured_on date not null,
  measured_at timestamptz not null,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.exercises (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  name        text not null check (char_length(name) between 1 and 120),
  muscle      text,
  equipment   text,
  type        text,
  description text not null default '' check (char_length(description) <= 1000),
  video_url   text not null default '' check (char_length(video_url) <= 200),
  is_custom   boolean not null default false,
  is_favorite boolean not null default false,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.workouts (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  name       text not null check (char_length(name) between 1 and 60),
  color      text,
  position   int  not null default 0,
  items      jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.sessions (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  workout_id  text,
  name        text not null,
  started_at  timestamptz not null,
  duration_s  int not null default 0 check (duration_s >= 0),
  exercises   jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises) = 'array'),
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create index on public.body_weights (user_id, updated_at);
create index on public.exercises    (user_id, updated_at);
create index on public.workouts     (user_id, updated_at);
create index on public.sessions     (user_id, updated_at);
create index on public.sessions     (user_id, started_at desc);

-- updated_at est toujours fixé par le serveur (pas par l'horloge du téléphone)
create trigger touch before insert or update on public.profiles     for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.body_weights for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.exercises    for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.workouts     for each row execute function public.touch_updated_at();
create trigger touch before insert or update on public.sessions     for each row execute function public.touch_updated_at();

-- ---------- Tables dérivées (lecture seule) pour les statistiques SQL ----------
-- Remplies automatiquement par des triggers à partir des colonnes jsonb.

create table public.workout_items (
  user_id     uuid not null references auth.users(id) on delete cascade,
  workout_id  text not null,
  position    int  not null,
  exercise_id text not null,
  sets        int  not null,
  reps        int  not null,
  primary key (user_id, workout_id, position)
);

create table public.session_sets (
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    text not null,
  ex_pos        int  not null,
  set_no        int  not null,
  exercise_id   text not null,
  exercise_name text,
  kg            numeric(6,2) not null,
  reps          int not null,
  performed_at  timestamptz not null,
  primary key (user_id, session_id, ex_pos, set_no)
);
create index on public.session_sets (user_id, exercise_id, performed_at);

create or replace function public.expand_workout() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.workout_items where user_id = new.user_id and workout_id = new.id;
  if not new.deleted then
    insert into public.workout_items (user_id, workout_id, position, exercise_id, sets, reps)
    select new.user_id, new.id, (o.ord - 1)::int, o.item->>'exId',
           coalesce((o.item->>'sets')::int, 3), coalesce((o.item->>'reps')::int, 10)
    from jsonb_array_elements(new.items) with ordinality as o(item, ord)
    where o.item->>'exId' is not null;
  end if;
  return new;
end $$;

create or replace function public.expand_session() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.session_sets where user_id = new.user_id and session_id = new.id;
  if not new.deleted then
    insert into public.session_sets
      (user_id, session_id, ex_pos, set_no, exercise_id, exercise_name, kg, reps, performed_at)
    select new.user_id, new.id, (e.ord - 1)::int, (s.ord - 1)::int,
           e.ex->>'exId', e.ex->>'name',
           coalesce((s.st->>'kg')::numeric, 0), coalesce((s.st->>'reps')::int, 0), new.started_at
    from jsonb_array_elements(new.exercises) with ordinality as e(ex, ord),
         jsonb_array_elements(e.ex->'sets')  with ordinality as s(st, ord)
    where e.ex->>'exId' is not null;
  end if;
  return new;
end $$;

create trigger expand after insert or update on public.workouts for each row execute function public.expand_workout();
create trigger expand after insert or update on public.sessions for each row execute function public.expand_session();

-- Progression par exercice et par séance (charge max, 1RM estimé (Epley), volume, reps max)
create view public.exercise_progress with (security_invoker = true) as
select user_id, exercise_id, max(exercise_name) as exercise_name, session_id, performed_at,
       max(kg)                       as best_kg,
       max(kg * (1 + reps / 30.0))   as est_1rm,
       sum(kg * reps)                as volume,
       max(reps)                     as max_reps,
       count(*)                      as sets
from public.session_sets
group by user_id, exercise_id, session_id, performed_at;

-- ---------- Sécurité : chaque utilisateur ne voit et ne modifie que ses lignes ----------
alter table public.profiles      enable row level security;
alter table public.body_weights  enable row level security;
alter table public.exercises     enable row level security;
alter table public.workouts      enable row level security;
alter table public.sessions      enable row level security;
alter table public.workout_items enable row level security;
alter table public.session_sets  enable row level security;

create policy "own rows" on public.profiles     for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.body_weights for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.exercises    for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.workouts     for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows" on public.sessions     for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own rows (lecture)" on public.workout_items for select to authenticated
  using (user_id = (select auth.uid()));
create policy "own rows (lecture)" on public.session_sets  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------- RGPD : suppression du compte et de toutes ses données ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = (select auth.uid());
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
