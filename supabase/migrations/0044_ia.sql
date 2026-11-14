-- Tiny Cats · a IA no site (lote 150): o "Descrever o lugar" do gerador de mapas chama o Claude pela função `ia`.
-- A chave da API fica nos segredos das funções (ANTHROPIC_API_KEY), nunca no navegador. Só as mesas liberadas aqui
-- usam, e só o mestre (ou o mestre auxiliar) delas; cada mesa tem um teto de pedidos por dia. Cada uso fica anotado.
-- As duas tabelas são só da função (chave de serviço): sem regra de acesso para mais ninguém.
create table if not exists public.ia_mesas (
  mesa_id uuid primary key references public.mesas (id) on delete cascade,
  ativo boolean not null default true,
  teto_dia integer not null default 40 check (teto_dia between 0 and 1000),
  criado_em timestamptz not null default now()
);
alter table public.ia_mesas enable row level security;

create table if not exists public.ia_uso (
  id bigint generated always as identity primary key,
  mesa_id uuid not null,
  usuario_id uuid not null,
  acao text not null,
  ok boolean not null default true,
  entrada integer not null default 0,
  saida integer not null default 0,
  em timestamptz not null default now()
);
alter table public.ia_uso enable row level security;
create index if not exists ia_uso_mesa_em on public.ia_uso (mesa_id, em desc);
