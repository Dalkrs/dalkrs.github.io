-- MESTRE AUXILIAR
-- Um jogador da mesa pode ser nomeado mestre auxiliar pelo mestre. Ele mestra junto: vê e mexe no que é do mestre,
-- dentro das abas que o mestre liberar. Não administra a mesa (não tira gente, não troca o código de convite, não
-- renomeia nem apaga a mesa, não nomeia outros auxiliares). E pode, quando quiser, jogar como jogador: enquanto
-- joga, o banco o trata como jogador (o que é só do mestre deixa de chegar a ele); a permissão de auxiliar continua.
--
-- Para quem é 'mestre' ou 'jogador' nada muda: as regras abaixo dão o mesmo resultado de antes.

-- 1) O papel novo, o modo (mestrando ou jogando) e as abas liberadas ------------------------------------------
alter table public.mesa_membros drop constraint mesa_membros_papel_check;
alter table public.mesa_membros add constraint mesa_membros_papel_check check (papel = any (array['mestre'::text, 'auxiliar'::text, 'jogador'::text]));
alter table public.mesa_membros add column if not exists jogando boolean not null default false;
alter table public.mesa_membros add column if not exists abas text[] not null default '{}'::text[];
alter table public.mesa_membros add constraint mesa_membros_abas_check
  check (abas <@ array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador']::text[]);
-- (só o auxiliar tem modo e abas)
alter table public.mesa_membros add constraint mesa_membros_auxiliar_check
  check (papel = 'auxiliar' or (not jogando and abas = '{}'::text[]));

-- 2) Quem é quem ---------------------------------------------------------------------------------------------
-- privado.e_mestre(m) continua sendo "é O mestre da mesa": é quem administra.
-- Está mestrando: o mestre, ou o auxiliar que não está jogando como jogador.
create or replace function privado.mestrando(m uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.mesa_membros mm
     where mm.mesa_id = m and mm.usuario_id = (select auth.uid())
       and (mm.papel = 'mestre' or (mm.papel = 'auxiliar' and not mm.jogando)));
$function$;

-- Mestra uma aba: o mestre (todas) ou o auxiliar mestrando que tem a aba liberada. Sem aba (null), só o mestre.
create or replace function privado.mestra(m uuid, aba text)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select exists (
    select 1 from public.mesa_membros mm
     where mm.mesa_id = m and mm.usuario_id = (select auth.uid())
       and (mm.papel = 'mestre' or (mm.papel = 'auxiliar' and not mm.jogando and aba = any (mm.abas))));
$function$;

-- A aba a que um documento pertence, pelo nome dele. Nome desconhecido: de nenhuma (só o mestre mexe).
create or replace function privado.aba_do_doc(id text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case
    when id like 'cena:%' or id like 'cenas:%' then 'cenas'
    when id like 'mundo:%' then 'mundo'
    when id = 'acampamento' or id like 'acampamento@%' or id like 'acampamento:%' then 'acampamento'
    when id like 'fichas:%' then 'fichas'
    when id like 'arvore:%' then 'arvore'
    when id like 'rol:%' then 'rolador'
    else null end;
$function$;

create or replace function privado.mestra_doc(m uuid, id text)
returns boolean
language sql
stable security definer
set search_path to ''
as $function$
  select privado.mestra(m, privado.aba_do_doc(id));
$function$;

revoke all on function privado.mestrando(uuid), privado.mestra(uuid, text), privado.aba_do_doc(text), privado.mestra_doc(uuid, text) from public, anon;
grant execute on function privado.mestrando(uuid), privado.mestra(uuid, text), privado.aba_do_doc(text), privado.mestra_doc(uuid, text) to authenticated;

-- 3) Fichas ---------------------------------------------------------------------------------------------------
-- Com a aba Fichas: tudo, como o mestre. Sem ela, o auxiliar não recebe as fichas escondidas (nem os documentos de
-- mestre das Fichas, mais abaixo), não troca dono nem visibilidade e não apaga. As fichas que os jogadores veem ele
-- mexe enquanto mestra — é o que as Cenas (dano, cura) e o Acampamento (descanso) fazem.
alter policy personagens_ver on public.personagens
  using (
    privado.mestra(mesa_id, 'fichas')
    or (privado.e_membro(mesa_id) and (vis = 'mesa' or dono_id = (select auth.uid())))
  );
alter policy personagens_criar on public.personagens
  with check (
    privado.mestra(mesa_id, 'fichas')
    or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado)
  );
alter policy personagens_editar on public.personagens
  using (
    privado.mestra(mesa_id, 'fichas')
    or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
    or (privado.mestrando(mesa_id) and vis = 'mesa')
  )
  with check (
    privado.mestra(mesa_id, 'fichas')
    or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
    or (privado.mestrando(mesa_id) and vis = 'mesa')
  );

-- 4) Documentos: cada um é de uma aba ---------------------------------------------------------------------------
alter policy documentos_ver on public.documentos
  using (
    privado.mestra_doc(mesa_id, id)
    or (privado.e_membro(mesa_id) and (vis = 'mesa' or dono_id = (select auth.uid())))
  );
alter policy documentos_criar on public.documentos
  with check (
    privado.mestra_doc(mesa_id, id)
    or (
      privado.e_membro(mesa_id)
      and dono_id = (select auth.uid())
      and not apagado
      and id = 'cena:pedido:' || ((select auth.uid()))::text
    )
  );
alter policy documentos_editar on public.documentos
  using (privado.mestra_doc(mesa_id, id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())))
  with check (privado.mestra_doc(mesa_id, id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())));

-- Dono, visibilidade e apagar: nas fichas, quem mestra a aba Fichas; nos documentos, quem mestra a aba do documento.
create or replace function privado.tocar()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_pode boolean;
begin
  if tg_op = 'UPDATE' then
    new.mesa_id := old.mesa_id; new.id := old.id;
    new.rev_ant := old.rev;
    if v_uid is not null
       and (new.dono_id is distinct from old.dono_id or new.vis is distinct from old.vis or new.apagado is distinct from old.apagado) then
      if tg_table_name = 'personagens' then v_pode := privado.mestra(old.mesa_id, 'fichas');
      else v_pode := privado.mestra_doc(old.mesa_id, old.id);
      end if;
      if not v_pode then
        raise exception 'Só o mestre troca o dono, a visibilidade ou apaga.';
      end if;
    end if;
  else
    new.rev_ant := null;
  end if;
  new.rev := nextval('privado.rev_seq');
  new.atualizado_em := now();
  new.atualizado_por := v_uid;
  return new;
end $function$;

-- 5) Mesa ao vivo: rolar em segredo e mexer na linha dos outros é de quem está mestrando -----------------------------
alter policy registro_escrever on public.registro
  with check (privado.e_membro(mesa_id) and autor_id = (select auth.uid()) and (not secreta or privado.mestrando(mesa_id)));
alter policy registro_editar on public.registro
  using (privado.e_membro(mesa_id) and (autor_id = (select auth.uid()) or (privado.mestrando(mesa_id) and not secreta)))
  with check (privado.e_membro(mesa_id) and (not secreta or privado.mestrando(mesa_id)));

-- 6) Participantes: o auxiliar também pode sair (ou ser tirado pelo mestre); o mestre, não -------------------------
alter policy membros_sair on public.mesa_membros
  using (papel = any (array['jogador'::text, 'auxiliar'::text]) and (usuario_id = (select auth.uid()) or privado.e_mestre(mesa_id)));

-- 7) Imagens da mesa: a pasta da mesa é de quem está mestrando -----------------------------------------------------
create or replace function privado.mestre_da_pasta(caminho text)
returns boolean
language plpgsql
stable security definer
set search_path to ''
as $function$
begin
  return privado.mestrando(((storage.foldername(caminho))[1])::uuid);
exception when others then
  return false;
end $function$;

-- 8) Nomear o auxiliar (só o mestre) e alternar entre mestrar e jogar (o próprio auxiliar) --------------------------
create or replace function public.definir_auxiliar(p_mesa uuid, p_usuario uuid, p_auxiliar boolean, p_abas text[] default null)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_todas constant text[] := array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador'];
  v_abas text[];
  v_linha public.mesa_membros;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa nomeia o mestre auxiliar.'; end if;
  select mm.* into v_linha from public.mesa_membros mm where mm.mesa_id = p_mesa and mm.usuario_id = p_usuario for update;
  if not found then raise exception 'Essa pessoa não participa desta mesa.'; end if;
  if v_linha.papel = 'mestre' then raise exception 'O mestre da mesa não vira auxiliar.'; end if;
  if coalesce(p_auxiliar, false) then
    -- as abas pedidas, na ordem de sempre e sem repetir (nome desconhecido é ignorado); sem lista, todas
    select coalesce(array_agg(t.a order by t.ord), '{}'::text[]) into v_abas
      from unnest(v_todas) with ordinality as t(a, ord)
     where p_abas is null or t.a = any (p_abas);
    update public.mesa_membros mm
       set papel = 'auxiliar', abas = v_abas, jogando = (mm.papel = 'auxiliar' and mm.jogando)
     where mm.mesa_id = p_mesa and mm.usuario_id = p_usuario
    returning mm.* into v_linha;
  else
    update public.mesa_membros mm
       set papel = 'jogador', abas = '{}'::text[], jogando = false
     where mm.mesa_id = p_mesa and mm.usuario_id = p_usuario
    returning mm.* into v_linha;
  end if;
  return v_linha;
end $function$;

create or replace function public.auxiliar_jogar(p_mesa uuid, p_jogando boolean)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare v_linha public.mesa_membros;
begin
  update public.mesa_membros mm
     set jogando = coalesce(p_jogando, false)
   where mm.mesa_id = p_mesa and mm.usuario_id = (select auth.uid()) and mm.papel = 'auxiliar'
  returning mm.* into v_linha;
  if not found then raise exception 'Você não é mestre auxiliar desta mesa.'; end if;
  return v_linha;
end $function$;

revoke all on function public.definir_auxiliar(uuid, uuid, boolean, text[]), public.auxiliar_jogar(uuid, boolean) from public, anon;
grant execute on function public.definir_auxiliar(uuid, uuid, boolean, text[]), public.auxiliar_jogar(uuid, boolean) to authenticated;
