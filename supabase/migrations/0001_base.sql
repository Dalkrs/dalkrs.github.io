-- =====================================================================
-- Tiny Cats · base do banco
-- Mesas (campanhas), quem participa de cada uma, convite por código e o
-- registro ao vivo da mesa (rolagens e conversa).
--
-- Regras de acesso (RLS):
--   · só quem participa de uma mesa enxerga o que é dela;
--   · o mestre administra a mesa; o jogador mexe só no que é dele;
--   · rolagem secreta só aparece para quem rolou, até ser revelada.
-- =====================================================================

create schema if not exists privado;
comment on schema privado is 'Funções de apoio que não ficam expostas pela API.';

create sequence if not exists privado.rev_seq;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.mesas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  dono_id uuid not null references auth.users (id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  criada_em timestamptz not null default now()
);
comment on table public.mesas is 'Cada mesa de jogo (campanha). Quem cria é o mestre.';

create table public.mesa_membros (
  mesa_id uuid not null references public.mesas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  papel text not null check (papel in ('mestre', 'jogador')),
  nome text not null check (char_length(nome) between 1 and 40),
  cor text check (cor is null or cor ~ '^#[0-9a-fA-F]{6}$'),
  entrou_em timestamptz not null default now(),
  primary key (mesa_id, usuario_id)
);
comment on table public.mesa_membros is 'Quem participa de cada mesa, com o papel (mestre ou jogador), o nome e a cor usados nela.';
create index mesa_membros_usuario_idx on public.mesa_membros (usuario_id);

create table public.mesa_convites (
  mesa_id uuid primary key references public.mesas (id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[A-Z2-9]{6}$'),
  criado_em timestamptz not null default now()
);
comment on table public.mesa_convites is 'Código de convite de cada mesa. Só o mestre vê; quem tem o código entra como jogador.';

create table public.registro (
  mesa_id uuid not null references public.mesas (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  autor_id uuid not null references auth.users (id) on delete cascade,
  autor_nome text not null,
  tipo text not null check (tipo in ('rolagem', 'fala', 'acao', 'sistema')),
  origem text not null default 'mesa' check (origem in ('mesa', 'rolador', 'ficha', 'cena', 'mundo', 'arvore')),
  secreta boolean not null default false,
  dados jsonb not null check (octet_length(dados::text) <= 16000),
  criado_em timestamptz not null default now(),
  rev bigint not null default 0,
  atualizado_em timestamptz not null default now(),
  apagado boolean not null default false,
  primary key (mesa_id, id)
);
comment on table public.registro is 'Registro ao vivo da mesa: rolagens e conversa, em ordem. Rolagem secreta só aparece para quem rolou.';
create index registro_ordem_idx on public.registro (mesa_id, criado_em desc);

-- ---------------------------------------------------------------------
-- Funções de apoio (fora da API)
-- ---------------------------------------------------------------------
create or replace function privado.e_membro(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()));
$$;

create or replace function privado.e_mestre(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()) and mm.papel = 'mestre');
$$;

-- Código de convite: 6 caracteres sem os que se confundem (0/O, 1/I).
create or replace function privado.gerar_codigo() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alfa constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid());   -- os 6 primeiros bytes de um UUID v4 são aleatórios
  r text := '';
begin
  for i in 0..5 loop
    r := r || substr(alfa, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return r;
end $$;

-- Antes de gravar no registro: quem escreveu e quando são decididos aqui, não por quem envia.
create or replace function privado.registro_antes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.autor_id := v_uid;
      new.autor_nome := coalesce((select mm.nome from public.mesa_membros mm where mm.mesa_id = new.mesa_id and mm.usuario_id = v_uid), new.autor_nome, '?');
    end if;
    new.criado_em := now();
  else
    new.mesa_id := old.mesa_id; new.id := old.id;
    new.autor_id := old.autor_id; new.autor_nome := old.autor_nome;
    new.tipo := old.tipo; new.origem := old.origem; new.criado_em := old.criado_em;
  end if;
  new.rev := nextval('privado.rev_seq');
  new.atualizado_em := now();
  return new;
end $$;

create trigger registro_antes before insert or update on public.registro
for each row execute function privado.registro_antes();

revoke all on function privado.e_membro(uuid), privado.e_mestre(uuid), privado.gerar_codigo(), privado.registro_antes() from public;
grant usage on schema privado to authenticated;
grant execute on function privado.e_membro(uuid), privado.e_mestre(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Funções da API (chamadas pelo site)
-- ---------------------------------------------------------------------
create or replace function public.criar_mesa(p_nome text, p_meu_nome text default null)
returns public.mesas
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_mesa public.mesas;
  v_nome text := left(coalesce(nullif(btrim(p_meu_nome), ''), 'Mestre'), 40);
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.' using errcode = '28000'; end if;
  if char_length(btrim(coalesce(p_nome, ''))) = 0 then raise exception 'Dê um nome à mesa.' using errcode = '22023'; end if;
  if (select count(*) from public.mesas m where m.dono_id = v_uid) >= 20 then
    raise exception 'Você já tem 20 mesas. Apague uma para criar outra.' using errcode = '54000';
  end if;
  insert into public.mesas (nome, dono_id) values (left(btrim(p_nome), 80), v_uid) returning * into v_mesa;
  loop
    begin
      insert into public.mesa_convites (mesa_id, codigo) values (v_mesa.id, privado.gerar_codigo());
      exit;
    exception when unique_violation then null;   -- código repetido: sorteia outro
    end;
  end loop;
  insert into public.mesa_membros (mesa_id, usuario_id, papel, nome, cor) values (v_mesa.id, v_uid, 'mestre', v_nome, '#E6AB4F');
  return v_mesa;
end $$;
comment on function public.criar_mesa(text, text) is 'Cria uma mesa; quem chama vira o mestre dela.';

create or replace function public.entrar_na_mesa(p_codigo text, p_meu_nome text default null)
returns public.mesas
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_cod text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_mesa public.mesas;
  v_nome text := left(coalesce(nullif(btrim(p_meu_nome), ''), 'Jogador'), 40);
  v_cores constant text[] := array['#5AA2FF', '#5CC26B', '#F06AA8', '#A67CF2', '#2FC4BD', '#FF8A3D', '#F5CF4F', '#EF5350'];
  v_n int;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.' using errcode = '28000'; end if;
  select m.* into v_mesa from public.mesas m join public.mesa_convites c on c.mesa_id = m.id where c.codigo = v_cod;
  if not found then raise exception 'Código de convite não encontrado.' using errcode = 'P0002'; end if;
  if exists (select 1 from public.mesa_membros mm where mm.mesa_id = v_mesa.id and mm.usuario_id = v_uid) then return v_mesa; end if;
  select count(*) into v_n from public.mesa_membros mm where mm.mesa_id = v_mesa.id;
  if v_n >= 12 then raise exception 'Esta mesa já está cheia.' using errcode = '54000'; end if;
  insert into public.mesa_membros (mesa_id, usuario_id, papel, nome, cor)
  values (v_mesa.id, v_uid, 'jogador', v_nome, v_cores[((v_n - 1) % 8) + 1]);
  return v_mesa;
end $$;
comment on function public.entrar_na_mesa(text, text) is 'Entra numa mesa, como jogador, com o código de convite.';

create or replace function public.novo_codigo(p_mesa uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_cod text;
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre troca o código de convite.' using errcode = '42501'; end if;
  loop
    v_cod := privado.gerar_codigo();
    begin
      update public.mesa_convites set codigo = v_cod, criado_em = now() where mesa_id = p_mesa;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return v_cod;
end $$;
comment on function public.novo_codigo(uuid) is 'Troca o código de convite da mesa (o antigo deixa de valer). Só o mestre.';

revoke all on function public.criar_mesa(text, text), public.entrar_na_mesa(text, text), public.novo_codigo(uuid) from public, anon;
grant execute on function public.criar_mesa(text, text), public.entrar_na_mesa(text, text), public.novo_codigo(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Regras de acesso
-- ---------------------------------------------------------------------
alter table public.mesas enable row level security;
alter table public.mesa_membros enable row level security;
alter table public.mesa_convites enable row level security;
alter table public.registro enable row level security;

-- mesas: quem participa vê; o mestre renomeia; o dono apaga. Criar é pela função criar_mesa.
create policy mesas_ver on public.mesas for select to authenticated using (privado.e_membro(id));
create policy mesas_editar on public.mesas for update to authenticated using (privado.e_mestre(id)) with check (privado.e_mestre(id));
create policy mesas_apagar on public.mesas for delete to authenticated using (dono_id = (select auth.uid()));
revoke insert, update on public.mesas from authenticated, anon;
grant update (nome, config) on public.mesas to authenticated;

-- membros: quem participa vê todos da mesa; cada um troca o próprio nome e cor (o mestre, os de qualquer um);
-- o jogador pode sair; o mestre pode tirar um jogador. O papel nunca muda por aqui.
create policy membros_ver on public.mesa_membros for select to authenticated using (privado.e_membro(mesa_id));
create policy membros_editar on public.mesa_membros for update to authenticated
  using (usuario_id = (select auth.uid()) or privado.e_mestre(mesa_id))
  with check (usuario_id = (select auth.uid()) or privado.e_mestre(mesa_id));
create policy membros_sair on public.mesa_membros for delete to authenticated
  using (papel = 'jogador' and (usuario_id = (select auth.uid()) or privado.e_mestre(mesa_id)));
revoke insert, update on public.mesa_membros from authenticated, anon;
grant update (nome, cor) on public.mesa_membros to authenticated;

-- convites: só o mestre vê o código. Trocar é pela função novo_codigo.
create policy convites_ver on public.mesa_convites for select to authenticated using (privado.e_mestre(mesa_id));
revoke insert, update, delete on public.mesa_convites from authenticated, anon;

-- registro: quem participa lê (a secreta, só quem rolou); cada um escreve em seu nome; só o mestre rola em segredo;
-- quem escreveu (ou o mestre) pode revelar, corrigir ou apagar a própria linha.
create policy registro_ver on public.registro for select to authenticated
  using (privado.e_membro(mesa_id) and (not secreta or autor_id = (select auth.uid())));
create policy registro_escrever on public.registro for insert to authenticated
  with check (privado.e_membro(mesa_id) and autor_id = (select auth.uid()) and (not secreta or privado.e_mestre(mesa_id)));
create policy registro_editar on public.registro for update to authenticated
  using (privado.e_membro(mesa_id) and (autor_id = (select auth.uid()) or (privado.e_mestre(mesa_id) and not secreta)))
  with check (privado.e_membro(mesa_id) and (not secreta or privado.e_mestre(mesa_id)));
revoke update, delete on public.registro from authenticated, anon;
grant update (dados, secreta, apagado) on public.registro to authenticated;

-- nada disso é para visitante sem conta
revoke all on public.mesas, public.mesa_membros, public.mesa_convites, public.registro from anon;

-- ---------------------------------------------------------------------
-- Tempo real
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.registro, public.mesa_membros, public.mesas;
