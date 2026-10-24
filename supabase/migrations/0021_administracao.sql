-- Tiny Cats · a administração do site (lote 27)
-- Quem administra o site (não uma mesa: o site inteiro) fica em public.admins. Cada um só consegue ler a própria linha
-- (para o site saber se mostra a aba Administração); ninguém escreve por aqui. O que o administrador faz — trocar a
-- senha de uma conta, mudar nome ou e-mail, apagar uma conta, abrir ou fechar o cadastro — passa pela função "admin"
-- (supabase/functions/admin), que confere se quem pediu está em public.admins e usa a chave de serviço; cada ação fica
-- em public.admin_registro (sem ligação com a conta, para o registro ficar mesmo depois de a conta ser apagada).
-- public.site_cfg guarda o que vale para o site inteiro: o cadastro ({ aberto, teto }), que a função criar-conta lê.

create table if not exists public.admins (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  desde timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists admins_ver_a_propria on public.admins;
create policy admins_ver_a_propria on public.admins for select to authenticated using (usuario_id = (select auth.uid()));

create table if not exists public.admin_registro (
  id bigint generated always as identity primary key,
  em timestamptz not null default now(),
  admin_id uuid,
  admin_email text,
  acao text not null,
  alvo_id uuid,
  alvo text,
  detalhe jsonb not null default '{}'::jsonb
);
alter table public.admin_registro enable row level security;      -- sem regra: só a função (chave de serviço) lê e escreve
create index if not exists admin_registro_em on public.admin_registro (em desc);

create table if not exists public.site_cfg (
  chave text primary key,
  valor jsonb not null,
  em timestamptz not null default now()
);
alter table public.site_cfg enable row level security;             -- idem
insert into public.site_cfg (chave, valor) values ('cadastro', '{"aberto": true, "teto": 300}'::jsonb) on conflict (chave) do nothing;

-- o primeiro administrador: o dono do site
insert into public.admins (usuario_id) select id from auth.users where lower(email) = 'dalmohferreira@gmail.com' on conflict do nothing;
