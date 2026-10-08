-- CAMPANHAS
-- A mesa é um mundo; nele jogam vários grupos, em campanhas diferentes (uma geração é uma campanha, a seguinte é
-- outra). Cada campanha tem os jogadores, os grupos de fichas, a conversa da mesa ao vivo, o acampamento, as
-- missões do grupo, as cenas e os mapas dela. O jogador só recebe o que é das campanhas de que participa (e o que é
-- "do mundo": sem campanha). Quem mestra vê todas. Só o mestre organiza: cria, renomeia, ordena, encerra e diz quem
-- participa. Numa mesa sem campanha nenhuma, nada muda.
-- Campanha ENCERRADA fica guardada: a conversa, as fichas, o acampamento e as missões do grupo dela são só para
-- consulta, para todos (o mestre também), até ele reabrir. As cenas e os mapas dela continuam com o mestre.

-- 1) As campanhas e quem participa de cada uma ------------------------------------------------------------------
create table public.campanhas (
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  id text not null,
  nome text not null,
  ordem double precision not null default 0,
  encerrada boolean not null default false,
  criada_em timestamptz not null default now(),
  primary key (mesa_id, id),
  constraint campanhas_id_check check (id ~ '^[a-z0-9]{4,16}$'),
  constraint campanhas_nome_check check (char_length(nome) >= 1 and char_length(nome) <= 60)
);
create table public.campanha_membros (
  mesa_id uuid not null,
  campanha_id text not null,
  usuario_id uuid not null,
  desde timestamptz not null default now(),
  primary key (mesa_id, campanha_id, usuario_id),
  constraint campanha_membros_campanha_fkey foreign key (mesa_id, campanha_id) references public.campanhas(mesa_id, id) on delete cascade,
  constraint campanha_membros_membro_fkey foreign key (mesa_id, usuario_id) references public.mesa_membros(mesa_id, usuario_id) on delete cascade
);
create index campanha_membros_usuario_idx on public.campanha_membros (mesa_id, usuario_id);
alter table public.campanhas enable row level security;
alter table public.campanha_membros enable row level security;
-- Quantas campanhas a mesa tem. Quem não participa de nenhuma não vê as campanhas — mas fica sabendo, por aqui, que
-- elas existem (e que por isso só está vendo o que é do mundo).
alter table public.mesas add column campanhas integer not null default 0;

-- 2) De que campanha é cada coisa ----------------------------------------------------------------------------------
-- ficha e linha da mesa ao vivo: de uma campanha, ou de nenhuma (do mundo). Documento: de uma ou mais, ou de nenhuma.
alter table public.personagens add column campanha text;
alter table public.personagens add constraint personagens_campanha_fkey foreign key (mesa_id, campanha) references public.campanhas(mesa_id, id);
create index personagens_campanha_idx on public.personagens (mesa_id, campanha);
alter table public.registro add column campanha text;
alter table public.registro add constraint registro_campanha_fkey foreign key (mesa_id, campanha) references public.campanhas(mesa_id, id);
create index registro_campanha_idx on public.registro (mesa_id, campanha, criado_em desc);
alter table public.documentos add column campanhas text[] not null default '{}'::text[];

-- 3) Quem vê o quê ---------------------------------------------------------------------------------------------------
create or replace function privado.na_campanha(m uuid, c text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select exists (select 1 from public.campanha_membros cm where cm.mesa_id = m and cm.campanha_id = c and cm.usuario_id = (select auth.uid()));
$function$;
-- Vê o que é de uma campanha: o que não é de nenhuma (do mundo), quem está mestrando, quem participa dela.
create or replace function privado.ve_campanha(m uuid, c text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select c is null or privado.mestrando(m) or privado.na_campanha(m, c);
$function$;
create or replace function privado.ve_campanhas(m uuid, cs text[])
returns boolean language sql stable security definer set search_path to '' as $function$
  select cs is null or cs = '{}'::text[] or privado.mestrando(m)
      or exists (select 1 from public.campanha_membros cm where cm.mesa_id = m and cm.usuario_id = (select auth.uid()) and cm.campanha_id = any (cs));
$function$;
-- Campanha em que ainda se joga (a encerrada fica só para consulta).
create or replace function privado.campanha_aberta(m uuid, c text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select c is null or not exists (select 1 from public.campanhas x where x.mesa_id = m and x.id = c and x.encerrada);
$function$;
-- O documento "de uma campanha" (nome@campanha: o acampamento dela, as missões do grupo dela) acompanha: não muda
-- enquanto ela está encerrada. Os outros documentos (cenas, mapas, o que é da mesa inteira) não dependem disso.
create or replace function privado.doc_aberto(m uuid, i text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select position('@' in i) = 0 or privado.campanha_aberta(m, split_part(i, '@', 2));
$function$;
revoke all on function privado.na_campanha(uuid, text), privado.ve_campanha(uuid, text), privado.ve_campanhas(uuid, text[]), privado.campanha_aberta(uuid, text), privado.doc_aberto(uuid, text) from public, anon;
grant execute on function privado.na_campanha(uuid, text), privado.ve_campanha(uuid, text), privado.ve_campanhas(uuid, text[]), privado.campanha_aberta(uuid, text), privado.doc_aberto(uuid, text) to authenticated;

-- As campanhas e os participantes: só se lê pela tabela (quem mestra, todas; o jogador, as dele). Escrever é pelas
-- funções mais abaixo, que só o mestre da mesa usa.
revoke all on public.campanhas, public.campanha_membros from anon, authenticated;
grant select on public.campanhas, public.campanha_membros to authenticated;
create policy campanhas_ver on public.campanhas for select to authenticated
  using (privado.mestrando(mesa_id) or privado.na_campanha(mesa_id, id));
create policy campanha_membros_ver on public.campanha_membros for select to authenticated
  using (privado.mestrando(mesa_id) or usuario_id = (select auth.uid()) or privado.na_campanha(mesa_id, campanha_id));

-- Fichas: o jogador vê as abertas a todos das campanhas dele (e as do mundo); a dele, sempre. Ficha nova de jogador:
-- no mundo ou numa campanha dele. Numa campanha encerrada ninguém cria nem mexe em ficha.
alter policy personagens_ver on public.personagens
  using (
    privado.mestra(mesa_id, 'fichas')
    or (privado.e_membro(mesa_id) and (dono_id = (select auth.uid()) or (vis = 'mesa' and privado.ve_campanha(mesa_id, campanha))))
  );
alter policy personagens_criar on public.personagens
  with check (
    privado.campanha_aberta(mesa_id, campanha)
    and (privado.mestra(mesa_id, 'fichas')
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado
             and (campanha is null or privado.na_campanha(mesa_id, campanha))))
  );
alter policy personagens_editar on public.personagens
  using (
    privado.campanha_aberta(mesa_id, campanha)
    and (privado.mestra(mesa_id, 'fichas')
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
         or (privado.mestrando(mesa_id) and vis = 'mesa'))
  )
  with check (
    privado.campanha_aberta(mesa_id, campanha)
    and (privado.mestra(mesa_id, 'fichas')
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
         or (privado.mestrando(mesa_id) and vis = 'mesa'))
  );

-- Documentos da mesa: o jogador vê os das campanhas dele (e os do mundo). O "nome@campanha" não muda com ela encerrada.
alter policy documentos_ver on public.documentos
  using (
    privado.mestra_doc(mesa_id, id)
    or (privado.e_membro(mesa_id) and (dono_id = (select auth.uid()) or (vis = 'mesa' and privado.ve_campanhas(mesa_id, campanhas))))
  );
alter policy documentos_criar on public.documentos
  with check (
    privado.doc_aberto(mesa_id, id)
    and (privado.mestra_doc(mesa_id, id)
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado and id = 'cena:pedido:' || (select auth.uid())::text))
  );
alter policy documentos_editar on public.documentos
  using (privado.doc_aberto(mesa_id, id) and (privado.mestra_doc(mesa_id, id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))))
  with check (privado.doc_aberto(mesa_id, id) and (privado.mestra_doc(mesa_id, id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))));

-- Mesa ao vivo: cada campanha tem a sua conversa; a de uma campanha encerrada não muda.
alter policy registro_ver on public.registro
  using (privado.e_membro(mesa_id) and (not secreta or autor_id = (select auth.uid())) and privado.ve_campanha(mesa_id, campanha));
alter policy registro_escrever on public.registro
  with check (
    privado.e_membro(mesa_id) and autor_id = (select auth.uid()) and (not secreta or privado.mestrando(mesa_id))
    and privado.campanha_aberta(mesa_id, campanha)
    and (campanha is null or privado.mestrando(mesa_id) or privado.na_campanha(mesa_id, campanha))
  );
alter policy registro_editar on public.registro
  using (
    privado.e_membro(mesa_id) and (autor_id = (select auth.uid()) or (privado.mestrando(mesa_id) and not secreta))
    and privado.ve_campanha(mesa_id, campanha) and privado.campanha_aberta(mesa_id, campanha)
  )
  with check (privado.e_membro(mesa_id) and (not secreta or privado.mestrando(mesa_id)));

-- 4) Os gatilhos ------------------------------------------------------------------------------------------------------
-- De que campanha é uma ficha, uma cena ou um mapa, só o MESTRE DA MESA muda: é ele quem organiza as campanhas (o
-- auxiliar mestra dentro das que existem — cria ficha, cena e mapa na campanha em que está, mas não os passa de uma
-- para outra). A projeção — o que os jogadores recebem da cena no ar e de cada mapa — acompanha a campanha da cena
-- ou do mapa, e quem a regrava é o aparelho que transmite: essa, quem mestra a aba muda. O documento "de uma
-- campanha" (nome@campanha) é sempre só dela, escreva quem escrever.
create or replace function privado.tocar()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_pode boolean;
  v_mudou boolean;
  v_camp boolean;
begin
  if tg_table_name = 'documentos' then
    if position('@' in new.id) > 0 then new.campanhas := array[split_part(new.id, '@', 2)];
    elsif new.campanhas is null then new.campanhas := '{}'::text[];          -- (quem grava sem dizer: de campanha nenhuma)
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.mesa_id := old.mesa_id; new.id := old.id;
    new.rev_ant := old.rev;
    if tg_table_name = 'personagens' then v_camp := new.campanha is distinct from old.campanha;
    else v_camp := new.campanhas is distinct from old.campanhas;
    end if;
    v_mudou := v_camp or new.dono_id is distinct from old.dono_id or new.vis is distinct from old.vis or new.apagado is distinct from old.apagado;
    if v_uid is not null and v_mudou then
      if tg_table_name = 'personagens' then v_pode := privado.mestra(old.mesa_id, 'fichas');
      else v_pode := privado.mestra_doc(old.mesa_id, old.id);
      end if;
      if not v_pode then
        raise exception 'Só o mestre troca o dono, a visibilidade, a campanha ou apaga.';
      end if;
      if v_camp and not privado.e_mestre(old.mesa_id)
         and (tg_table_name = 'personagens' or (old.id not like 'cena:pub:%' and old.id not like 'mundo:pub:%')) then
        raise exception 'Só o mestre da mesa passa fichas, cenas e mapas de uma campanha para outra.';
      end if;
    end if;
  else
    new.rev_ant := null;
    -- documento criado por quem não mestra a aba dele (o pedido do jogador para a cena): de campanha nenhuma
    if tg_table_name = 'documentos' and v_uid is not null and position('@' in new.id) = 0 and not privado.mestra_doc(new.mesa_id, new.id) then
      new.campanhas := '{}'::text[];
    end if;
  end if;
  new.rev := nextval('privado.rev_seq');
  new.atualizado_em := now();
  new.atualizado_por := v_uid;
  return new;
end $function$;

-- Uma linha da mesa ao vivo não muda de campanha — a não ser quando a primeira campanha da mesa recebe o que a
-- mesa já tinha, ou quando isso é desfeito (aí a linha não conta como "mexida": a revisão e a hora dela ficam como
-- estavam).
create or replace function privado.registro_antes()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid()); v_camp text;
begin
  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.autor_id := v_uid;
      new.autor_nome := coalesce((select mm.nome from public.mesa_membros mm where mm.mesa_id = new.mesa_id and mm.usuario_id = v_uid), new.autor_nome, '?');
      -- Uma linha sem campanha, de quem joga numa campanha só: é dessa campanha. (O site manda sempre a campanha em
      -- vista; quem manda sem ela é um aparelho ainda com a versão anterior, que não sabe de campanhas — sem isto a
      -- fala dele iria para o mundo e apareceria em todas as campanhas.)
      if new.campanha is null and not privado.mestrando(new.mesa_id) then
        select min(cm.campanha_id) into v_camp from public.campanha_membros cm
         where cm.mesa_id = new.mesa_id and cm.usuario_id = v_uid having count(*) = 1;
        if v_camp is not null then new.campanha := v_camp; end if;
      end if;
    end if;
    new.criado_em := now();
  else
    new.mesa_id := old.mesa_id; new.id := old.id;
    new.autor_id := old.autor_id; new.autor_nome := old.autor_nome;
    new.tipo := old.tipo; new.origem := old.origem; new.criado_em := old.criado_em;
    if coalesce(current_setting('tinycats.adotando', true), '') = '1' then
      new.rev := old.rev; new.atualizado_em := old.atualizado_em;
      return new;
    end if;
    new.campanha := old.campanha;
  end if;
  new.rev := nextval('privado.rev_seq');
  new.atualizado_em := now();
  return new;
end $function$;

-- 5) Organizar as campanhas (só o mestre da mesa) ---------------------------------------------------------------------
-- Criar. Com p_adotar, a PRIMEIRA campanha da mesa recebe o que a mesa já tinha: as fichas, a conversa, o
-- acampamento, as missões do grupo, as cenas (e a que está no ar), os mapas — e os jogadores de hoje participam.
create or replace function public.campanha_criar(p_mesa uuid, p_nome text, p_adotar boolean default false)
returns public.campanhas
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_nome text := left(btrim(coalesce(p_nome, '')), 60);
  v_id text; v_n int; v_ordem double precision; v_linha public.campanhas;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa organiza as campanhas.'; end if;
  if char_length(v_nome) = 0 then raise exception 'Dê um nome à campanha.'; end if;
  perform 1 from public.mesas m where m.id = p_mesa for update;                 -- (uma criação de cada vez nesta mesa)
  select count(*), coalesce(max(c.ordem), 0) + 1 into v_n, v_ordem from public.campanhas c where c.mesa_id = p_mesa;
  if v_n >= 40 then raise exception 'Esta mesa já tem 40 campanhas. Apague uma que não usa para criar outra.'; end if;
  if coalesce(p_adotar, false) and v_n > 0 then raise exception 'Só a primeira campanha da mesa recebe o que a mesa já tinha.'; end if;
  loop
    v_id := 'c' || substr(md5(gen_random_uuid()::text), 1, 9);
    begin
      insert into public.campanhas (mesa_id, id, nome, ordem) values (p_mesa, v_id, v_nome, v_ordem) returning * into v_linha;
      exit;
    exception when unique_violation then null;                                    -- (id repetido: sorteia outro)
    end;
  end loop;
  update public.mesas set campanhas = v_n + 1 where id = p_mesa;
  if coalesce(p_adotar, false) then
    perform set_config('tinycats.adotando', '1', true);
    update public.personagens set campanha = v_id where mesa_id = p_mesa and campanha is null;
    update public.registro set campanha = v_id where mesa_id = p_mesa and campanha is null;
    -- o acampamento, as missões do grupo e a ordem dos grupos passam a ser os da campanha (nome@campanha)
    insert into public.documentos (mesa_id, id, dono_id, vis, dados, campanhas)
      select d.mesa_id, d.id || '@' || v_id, null, d.vis, d.dados, array[v_id]
        from public.documentos d
       where d.mesa_id = p_mesa and d.id in ('acampamento', 'fichas:missoes', 'fichas:grupos') and not d.apagado
    on conflict (mesa_id, id) do nothing;
    update public.documentos set apagado = true
     where mesa_id = p_mesa and id in ('acampamento', 'fichas:missoes', 'fichas:grupos') and not apagado;
    -- as missões do grupo que o mestre ainda esconde: de mis.g para mis.gc.<campanha>
    update public.documentos d
       set dados = jsonb_set(jsonb_set(d.dados #- '{v,mis,g}', '{v,mis,gc}', coalesce(d.dados #> '{v,mis,gc}', '{}'::jsonb), true),
                             array['v', 'mis', 'gc', v_id], d.dados #> '{v,mis,g}', true)
     where d.mesa_id = p_mesa and d.id = 'fichas:segredos' and not d.apagado and jsonb_typeof(d.dados #> '{v,mis,g}') = 'object';
    -- as cenas (e a projeção da que está no ar) e os mapas
    update public.documentos set campanhas = array[v_id]
     where mesa_id = p_mesa and campanhas = '{}'::text[] and not apagado
       and (id ~ '^cena:[A-Za-z0-9_-]+:[mv]$' or id like 'mundo:mapa:%' or id like 'mundo:pub:%');
    -- o índice dos mapas é da mesa inteira: fica só com os nomes dos mapas do mundo — agora, nenhum (os de campanha,
    -- cada jogador conhece pelas projeções que recebe). O mapa que está sendo mostrado continua o mesmo.
    update public.documentos d set dados = jsonb_set(d.dados, '{mapas}', '[]'::jsonb, true)
     where d.mesa_id = p_mesa and d.id = 'mundo:indice' and not d.apagado and jsonb_typeof(d.dados) = 'object';
    -- quem já joga na mesa participa
    insert into public.campanha_membros (mesa_id, campanha_id, usuario_id)
      select mm.mesa_id, v_id, mm.usuario_id from public.mesa_membros mm where mm.mesa_id = p_mesa and mm.papel <> 'mestre'
    on conflict do nothing;
    perform set_config('tinycats.adotando', '', true);
  end if;
  return v_linha;
end $function$;

-- Renomear, encerrar ou reabrir (só o que vier).
create or replace function public.campanha_mudar(p_mesa uuid, p_id text, p_nome text default null, p_encerrada boolean default null)
returns public.campanhas
language plpgsql
security definer
set search_path to ''
as $function$
declare v_linha public.campanhas;
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa organiza as campanhas.'; end if;
  if p_nome is not null and char_length(btrim(p_nome)) = 0 then raise exception 'Dê um nome à campanha.'; end if;
  update public.campanhas c
     set nome = case when p_nome is null then c.nome else left(btrim(p_nome), 60) end,
         encerrada = coalesce(p_encerrada, c.encerrada)
   where c.mesa_id = p_mesa and c.id = p_id
  returning c.* into v_linha;
  if not found then raise exception 'Esta campanha não existe mais.'; end if;
  return v_linha;
end $function$;

-- A ordem da lista: os ids, na ordem que o mestre quer (os que faltarem ficam depois, como estavam).
create or replace function public.campanha_ordenar(p_mesa uuid, p_ids text[])
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare v_n integer;
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa organiza as campanhas.'; end if;
  update public.campanhas c set ordem = t.ord
    from unnest(coalesce(p_ids, '{}'::text[])) with ordinality as t(id, ord)
   where c.mesa_id = p_mesa and c.id = t.id;
  get diagnostics v_n = row_count;
  update public.campanhas c set ordem = 1000 + c.ordem
   where c.mesa_id = p_mesa and not (c.id = any (coalesce(p_ids, '{}'::text[]))) and c.ordem < 1000;
  return v_n;
end $function$;

-- Quem participa.
create or replace function public.campanha_participa(p_mesa uuid, p_id text, p_usuario uuid, p_sim boolean)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_papel text;
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa organiza as campanhas.'; end if;
  if not exists (select 1 from public.campanhas c where c.mesa_id = p_mesa and c.id = p_id) then raise exception 'Esta campanha não existe mais.'; end if;
  select mm.papel into v_papel from public.mesa_membros mm where mm.mesa_id = p_mesa and mm.usuario_id = p_usuario;
  if not found then raise exception 'Essa pessoa não participa desta mesa.'; end if;
  if v_papel = 'mestre' then raise exception 'O mestre da mesa já vê todas as campanhas.'; end if;
  if coalesce(p_sim, false) then
    insert into public.campanha_membros (mesa_id, campanha_id, usuario_id) values (p_mesa, p_id, p_usuario) on conflict do nothing;
  else
    delete from public.campanha_membros cm where cm.mesa_id = p_mesa and cm.campanha_id = p_id and cm.usuario_id = p_usuario;
  end if;
  return coalesce(p_sim, false);
end $function$;

-- Apagar: só a campanha que não guarda nada (a que foi usada se encerra — encerrar guarda tudo).
create or replace function public.campanha_apagar(p_mesa uuid, p_id text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa organiza as campanhas.'; end if;
  perform 1 from public.mesas m where m.id = p_mesa for update;
  if not exists (select 1 from public.campanhas c where c.mesa_id = p_mesa and c.id = p_id) then return false; end if;
  if exists (select 1 from public.personagens p where p.mesa_id = p_mesa and p.campanha = p_id and not p.apagado) then
    raise exception 'Esta campanha ainda tem fichas. Passe os grupos dela para outra campanha (ou para o mundo) antes de apagar — ou encerre a campanha, que guarda tudo.';
  end if;
  if exists (select 1 from public.registro r where r.mesa_id = p_mesa and r.campanha = p_id and not r.apagado) then
    raise exception 'Esta campanha ainda tem conversa na mesa ao vivo. Limpe a mesa ao vivo dela antes de apagar — ou encerre a campanha, que guarda tudo.';
  end if;
  if exists (select 1 from public.documentos d where d.mesa_id = p_mesa and p_id = any (d.campanhas) and not d.apagado and position('@' in d.id) = 0 and d.id not like 'cena:pub:%') then
    raise exception 'Esta campanha ainda tem cenas ou mapas. Passe-os para outra campanha (ou para o mundo) antes de apagar — ou encerre a campanha, que guarda tudo.';
  end if;
  -- o que sobrou: o que já estava apagado e os documentos que só existem por causa da campanha (o acampamento dela…)
  delete from public.registro r where r.mesa_id = p_mesa and r.campanha = p_id;
  -- As fichas dela que já estavam apagadas deixam de ser dela — e ficam só com o mestre: sem campanha, as que eram
  -- abertas aos jogadores dela passariam a ser entregues (apagadas, mas inteiras) a todos os da mesa.
  update public.personagens p set campanha = null, vis = 'mestre' where p.mesa_id = p_mesa and p.campanha = p_id;
  update public.documentos d set apagado = true where d.mesa_id = p_mesa and d.id like '%@' || p_id and not d.apagado;
  -- Os documentos dela que já estavam apagados — e a projeção da cena no ar, se ainda dizia ser dela — continuam
  -- dizendo de que campanha eram: assim nenhum jogador os recebe. Sem campanha seriam "do mundo", entregues a todos.
  -- (A projeção, o aparelho do mestre regrava com a campanha certa assim que as Cenas dele abrem de novo.)
  delete from public.campanhas c where c.mesa_id = p_mesa and c.id = p_id;
  update public.mesas m set campanhas = (select count(*) from public.campanhas c where c.mesa_id = p_mesa) where m.id = p_mesa;
  return true;
end $function$;

-- Desfazer as campanhas: tudo o que é da ÚNICA campanha da mesa volta a ser da mesa, e a campanha some — a mesa fica
-- como era antes das campanhas. (Com mais de uma, isso mostraria aos jogadores de uma o que é da outra: aí não vale.)
create or replace function public.campanha_desfazer(p_mesa uuid, p_id text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_n int; v_mapas jsonb;
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa organiza as campanhas.'; end if;
  perform 1 from public.mesas m where m.id = p_mesa for update;
  if not exists (select 1 from public.campanhas c where c.mesa_id = p_mesa and c.id = p_id) then return false; end if;
  select count(*) into v_n from public.campanhas c where c.mesa_id = p_mesa;
  if v_n <> 1 then raise exception 'Só dá para desfazer as campanhas enquanto a mesa tem uma só.'; end if;
  perform set_config('tinycats.adotando', '1', true);
  update public.registro set campanha = null where mesa_id = p_mesa and campanha = p_id;
  update public.personagens set campanha = null where mesa_id = p_mesa and campanha = p_id;
  -- o acampamento, as missões do grupo e a ordem dos grupos da campanha voltam a ser os da mesa
  insert into public.documentos (mesa_id, id, dono_id, vis, dados, campanhas)
    select d.mesa_id, split_part(d.id, '@', 1), null, d.vis, d.dados, '{}'::text[]
      from public.documentos d
     where d.mesa_id = p_mesa and d.id like '%@' || p_id and not d.apagado
  on conflict (mesa_id, id) do update set dados = excluded.dados, vis = excluded.vis, dono_id = null, apagado = false, campanhas = '{}'::text[];
  update public.documentos set apagado = true where mesa_id = p_mesa and id like '%@' || p_id and not apagado;
  -- as missões do grupo que o mestre esconde: de mis.gc.<campanha> de volta para mis.g
  update public.documentos d
     set dados = jsonb_set(d.dados #- array['v', 'mis', 'gc', p_id], '{v,mis,g}',
                           coalesce(d.dados #> '{v,mis,g}', '{}'::jsonb) || (d.dados #> array['v', 'mis', 'gc', p_id]), true)
   where d.mesa_id = p_mesa and d.id = 'fichas:segredos' and not d.apagado and jsonb_typeof(d.dados #> array['v', 'mis', 'gc', p_id]) = 'object';
  -- as cenas (e a projeção) e os mapas
  update public.documentos set campanhas = array_remove(campanhas, p_id)
   where mesa_id = p_mesa and p_id = any (campanhas) and position('@' in id) = 0;
  -- o índice dos mapas volta a ter os nomes de todos os que os jogadores podem abrir (os que têm projeção); se a mesa
  -- ainda não tinha índice (só havia mapas de campanha, e nenhum sendo mostrado), ele passa a existir
  select coalesce(jsonb_agg(jsonb_build_object('id', substr(p.id, 11), 'nome', coalesce(nullif(btrim(p.dados ->> 'nome'), ''), 'Mapa sem nome'))
                            order by p.dados ->> 'nome', p.id), '[]'::jsonb)
    into v_mapas
    from public.documentos p
   where p.mesa_id = p_mesa and p.id like 'mundo:pub:%' and not p.apagado and p.vis = 'mesa' and p.campanhas = '{}'::text[] and jsonb_typeof(p.dados) = 'object';
  update public.documentos d set dados = jsonb_set(d.dados, '{mapas}', v_mapas, true)
   where d.mesa_id = p_mesa and d.id = 'mundo:indice' and not d.apagado and jsonb_typeof(d.dados) = 'object';
  if not found and jsonb_array_length(v_mapas) > 0 then
    insert into public.documentos (mesa_id, id, dono_id, vis, dados, campanhas)
      values (p_mesa, 'mundo:indice', null, 'mesa', jsonb_build_object('mapas', v_mapas, 'mostrado', null), '{}'::text[])
    on conflict (mesa_id, id) do update set dados = excluded.dados, vis = 'mesa', dono_id = null, apagado = false, campanhas = '{}'::text[];
  end if;
  delete from public.campanhas c where c.mesa_id = p_mesa and c.id = p_id;      -- (quem participava sai junto)
  update public.mesas set campanhas = 0 where id = p_mesa;
  perform set_config('tinycats.adotando', '', true);
  return true;
end $function$;

revoke all on function public.campanha_criar(uuid, text, boolean), public.campanha_mudar(uuid, text, text, boolean), public.campanha_ordenar(uuid, text[]),
  public.campanha_participa(uuid, text, uuid, boolean), public.campanha_apagar(uuid, text), public.campanha_desfazer(uuid, text) from public, anon;
grant execute on function public.campanha_criar(uuid, text, boolean), public.campanha_mudar(uuid, text, text, boolean), public.campanha_ordenar(uuid, text[]),
  public.campanha_participa(uuid, text, uuid, boolean), public.campanha_apagar(uuid, text), public.campanha_desfazer(uuid, text) to authenticated;

-- 6) As barras de uma ficha pelo token (0011) respeitam a campanha encerrada ------------------------------------------
-- (essa função grava por conta própria, sem passar pelas regras da tabela: a conferência é feita aqui)
create or replace function public.barras_do_token(p_mesa uuid, p_id text, p_rec jsonb, p_sob jsonb default null)
returns table (rev bigint, rev_ant bigint)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ficha jsonb; v_estado jsonb; v_camp text; v_ids text[]; v_rec jsonb; v_sob jsonb; k text; v jsonb;
begin
  if not privado.mestra(p_mesa, 'cenas') then raise exception 'Só o mestre mexe nas barras de uma ficha pelo token.'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or (p_sob is not null and jsonb_typeof(p_sob) <> 'object') then
    raise exception 'Mudança de barras inválida.';
  end if;
  select p.ficha, p.estado, p.campanha into v_ficha, v_estado, v_camp
    from public.personagens p where p.mesa_id = p_mesa and p.id = p_id and not p.apagado for update;
  if not found then return; end if;
  if not privado.campanha_aberta(p_mesa, v_camp) then raise exception 'Esta campanha está encerrada: as fichas dela são só para consulta.'; end if;
  -- só as barras que a ficha tem (nada de chave inventada no estado dela)
  select coalesce(array_agg(r ->> 'id'), '{}'::text[]) into v_ids
    from jsonb_array_elements(case when jsonb_typeof(v_ficha -> 'recursos') = 'array' then v_ficha -> 'recursos' else '[]'::jsonb end) r
   where jsonb_typeof(r) = 'object' and (r ->> 'id') is not null;
  v_estado := case when jsonb_typeof(v_estado) = 'object' then v_estado else '{}'::jsonb end;
  v_rec := case when jsonb_typeof(v_estado -> 'rec') = 'object' then v_estado -> 'rec' else '{}'::jsonb end;
  v_sob := case when jsonb_typeof(v_estado -> 'sob') = 'object' then v_estado -> 'sob' else '{}'::jsonb end;
  for k, v in select * from jsonb_each(p_rec) loop
    if k = any (v_ids) and jsonb_typeof(v) = 'number' then v_rec := jsonb_set(v_rec, array[k], v, true); end if;
  end loop;
  if p_sob is not null then
    for k, v in select * from jsonb_each(p_sob) loop
      if k = any (v_ids) then
        if jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric > 0 then v_sob := jsonb_set(v_sob, array[k], v, true);
        else v_sob := v_sob - k;                              -- sem sobrevida: a chave sai
        end if;
      end if;
    end loop;
  end if;
  return query
    update public.personagens p
       set estado = jsonb_set(jsonb_set(v_estado, '{rec}', v_rec, true), '{sob}', v_sob, true)
     where p.mesa_id = p_mesa and p.id = p_id
    returning p.rev, p.rev_ant;
end $function$;
revoke all on function public.barras_do_token(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.barras_do_token(uuid, text, jsonb, jsonb) to authenticated;

-- 7) O tempo real avisa das campanhas e de quem participa ------------------------------------------------------------
alter publication supabase_realtime add table public.campanhas, public.campanha_membros;
