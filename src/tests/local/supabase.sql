-- Banco local de ensaio: o mínimo do que o Supabase já traz pronto num projeto, para as migrações de
-- supabase/migrations/ rodarem num PostgreSQL comum e os testes "de rede" poderem falar com ele (em vez do projeto
-- de verdade). Não é o Supabase: é o bastante para as regras de acesso (RLS), as funções e os gatilhos deste site
-- valerem igual. Roda uma vez, num banco vazio, antes das migrações. Ver src/tests/local/LEIA.md.

-- Os papéis da API: quem não tem conta (anon), quem tem (authenticated), o serviço (service_role, passa por cima
-- das regras) e o papel com que o PostgREST se liga ao banco (authenticator, que troca para um dos outros).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit password 'local'; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

-- O esquema público, como num projeto novo: os papéis da API usam, e o que o dono criar nasce liberado para eles
-- (as migrações é que fecham: "revoke …", regras de acesso por linha).
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- As contas. No projeto de verdade quem cuida disto é o serviço de contas do Supabase; aqui, a "porta" local
-- (src/tests/local/porta.js) cria a conta e confere a senha. A senha fica como veio: é um banco de ensaio.
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  senha text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- Quem está pedindo: o PostgREST deixa o que veio no passe (JWT) em request.jwt.claims.
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant all on auth.users to service_role;

-- O armazenamento de arquivos: só a parte que as regras deste site usam (os baldes, os objetos e a função que
-- separa as pastas de um caminho). Os arquivos em si ficam com a porta local.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

-- O tempo real: as migrações põem as tabelas nesta publicação. Aqui ninguém a ouve (o tempo real não existe no
-- banco local: os testes já rodam sem ele, pela leitura periódica), mas ela precisa existir.
create publication supabase_realtime;
