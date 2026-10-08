-- =====================================================================
-- Dados compartilhados da mesa: personagens (ficha, skills e estado atual) e documentos
-- (configurações e bibliotecas dos sistemas: tabelas base das fichas, árvores, tabelas de eventos...).
--
-- Quem vê o quê:
--   · o mestre vê e altera tudo da mesa;
--   · o jogador vê o que é dele (dono_id) e o que o mestre abriu para a mesa (vis = 'mesa');
--   · o jogador altera só o que é dele, e não troca o dono, a visibilidade nem apaga.
-- Apagar é marcar apagado = true (assim a remoção também chega aos outros aparelhos).
-- =====================================================================

create table public.personagens (
  mesa_id uuid not null references public.mesas (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 64),
  nome text not null default '' check (char_length(nome) <= 120),
  dono_id uuid references auth.users (id) on delete set null,
  vis text not null default 'mestre' check (vis in ('mestre', 'mesa')),
  ordem double precision not null default 0,
  ficha jsonb not null default '{}'::jsonb check (octet_length(ficha::text) <= 400000),
  skills jsonb not null default '{}'::jsonb check (octet_length(skills::text) <= 100000),
  estado jsonb not null default '{}'::jsonb check (octet_length(estado::text) <= 50000),
  rev bigint not null default 0,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  apagado boolean not null default false,
  primary key (mesa_id, id)
);
comment on table public.personagens is 'Personagens da mesa. ficha = a ficha da Calculadora; skills = árvores equipadas e nódulos escolhidos; estado = valores atuais (HP, SP...). dono_id = jogador que controla.';
comment on column public.personagens.vis is 'mestre = só o mestre (e o dono, se houver); mesa = todos os jogadores veem.';
create index personagens_dono_idx on public.personagens (dono_id);

create table public.documentos (
  mesa_id uuid not null references public.mesas (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 120),
  dono_id uuid references auth.users (id) on delete set null,
  vis text not null default 'mestre' check (vis in ('mestre', 'mesa')),
  dados jsonb not null default '{}'::jsonb check (octet_length(dados::text) <= 1500000),
  rev bigint not null default 0,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid,
  apagado boolean not null default false,
  primary key (mesa_id, id)
);
comment on table public.documentos is 'Documentos dos sistemas, por mesa: tabelas base das fichas (fichas:cfg), biblioteca de árvores (arvore:biblioteca, arvore:pacote), tabelas de eventos...';

-- Antes de gravar: a revisão e a hora são do servidor; o jogador não troca dono, visibilidade nem apaga.
create or replace function privado.tocar() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' then
    new.mesa_id := old.mesa_id; new.id := old.id;
    if v_uid is not null and not privado.e_mestre(old.mesa_id) then
      if new.dono_id is distinct from old.dono_id or new.vis is distinct from old.vis or new.apagado is distinct from old.apagado then
        raise exception 'Só o mestre troca o dono, a visibilidade ou apaga.';
      end if;
    end if;
  end if;
  new.rev := nextval('privado.rev_seq');
  new.atualizado_em := now();
  new.atualizado_por := v_uid;
  return new;
end $$;
revoke all on function privado.tocar() from public;

create trigger personagens_tocar before insert or update on public.personagens for each row execute function privado.tocar();
create trigger documentos_tocar before insert or update on public.documentos for each row execute function privado.tocar();

alter table public.personagens enable row level security;
alter table public.documentos enable row level security;

create policy personagens_ver on public.personagens for select to authenticated
  using (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and (vis = 'mesa' or dono_id = (select auth.uid()))));
create policy personagens_criar on public.personagens for insert to authenticated
  with check (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado));
create policy personagens_editar on public.personagens for update to authenticated
  using (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())))
  with check (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())));

create policy documentos_ver on public.documentos for select to authenticated
  using (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and (vis = 'mesa' or dono_id = (select auth.uid()))));
create policy documentos_criar on public.documentos for insert to authenticated
  with check (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado));
create policy documentos_editar on public.documentos for update to authenticated
  using (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())))
  with check (privado.e_mestre(mesa_id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())));

revoke all on public.personagens, public.documentos from anon;
revoke delete on public.personagens, public.documentos from authenticated;

alter publication supabase_realtime add table public.personagens, public.documentos;
