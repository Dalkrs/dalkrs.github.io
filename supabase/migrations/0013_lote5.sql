-- LOTE 5 (FICHAS, POÇÕES E MESA AO VIVO)
-- 1) As barras especiais (os antigos "poderes divinos") também vão da cena para a ficha "às cegas".
-- 2) Poção (ou outro item da bolsa) usada por um jogador em OUTRO personagem.
-- 3) O mestre fecha a mesa ao vivo para um jogador (até liberar de novo).
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

-- 1) As barras de uma ficha, pelo token, sem ver a ficha (0011/0012) — agora também as barras especiais --------------
-- O valor de agora de cada barra especial mora no estado da ficha (estado.pd: { id: n }); a lista delas (nome e
-- limite) é a de ficha.poderes. Só valem as que a ficha tem, com número de 0 até o limite (0 = sem limite).
drop function if exists public.barras_do_token(uuid, text, jsonb, jsonb);
create or replace function public.barras_do_token(p_mesa uuid, p_id text, p_rec jsonb, p_sob jsonb default null, p_pd jsonb default null)
returns table (rev bigint, rev_ant bigint)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ficha jsonb; v_estado jsonb; v_camp text; v_ids text[]; v_rec jsonb; v_sob jsonb; v_pd jsonb; k text; v jsonb; v_max numeric;
begin
  if not privado.mestra(p_mesa, 'cenas') then raise exception 'Só o mestre mexe nas barras de uma ficha pelo token.'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or (p_sob is not null and jsonb_typeof(p_sob) <> 'object')
     or (p_pd is not null and jsonb_typeof(p_pd) <> 'object') then
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
  v_pd := case when jsonb_typeof(v_estado -> 'pd') = 'object' then v_estado -> 'pd' else '{}'::jsonb end;
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
  if p_pd is not null then
    for k, v in select * from jsonb_each(p_pd) loop
      if jsonb_typeof(v) <> 'number' then continue; end if;
      select greatest(0, round(coalesce(case when jsonb_typeof(x -> 'max') = 'number' then (x ->> 'max')::numeric end, 0))) into v_max
        from jsonb_array_elements(case when jsonb_typeof(v_ficha -> 'poderes') = 'array' then v_ficha -> 'poderes' else '[]'::jsonb end) x
       where jsonb_typeof(x) = 'object' and (x ->> 'id') = k
       limit 1;
      if not found then continue; end if;                     -- barra especial que a ficha não tem
      v_pd := jsonb_set(v_pd, array[k], to_jsonb(case when v_max > 0 then least(greatest(0, round((v #>> '{}')::numeric)), v_max)
                                                       else greatest(0, round((v #>> '{}')::numeric)) end), true);
    end loop;
  end if;
  return query
    update public.personagens p
       set estado = case when p_pd is null then jsonb_set(jsonb_set(v_estado, '{rec}', v_rec, true), '{sob}', v_sob, true)
                         else jsonb_set(jsonb_set(jsonb_set(v_estado, '{rec}', v_rec, true), '{sob}', v_sob, true), '{pd}', v_pd, true) end
     where p.mesa_id = p_mesa and p.id = p_id
    returning p.rev, p.rev_ant;
end $function$;
revoke all on function public.barras_do_token(uuid, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.barras_do_token(uuid, text, jsonb, jsonb, jsonb) to authenticated;

-- 2) Um item da bolsa usado em OUTRO personagem ------------------------------------------------------------------------
-- O jogador usa uma poção (ou outro item) da bolsa da ficha dele em outro personagem que ele vê (de outro jogador, ou um
-- NPC aberto a todos). A ficha do outro ele não pode gravar: esta função grava as duas coisas juntas — a bolsa dele
-- perde uma unidade e o outro recebe o efeito. As contas (o máximo da barra, os dados rolados) são feitas no aparelho
-- de quem usa, como no resto do site; aqui se confere a forma: de quem é a bolsa, se o item existe e ainda tem, se o
-- outro está à vista de quem usa, e que cada mudança é uma barra, sobrevida, barra especial ou bônus que existe.
--   p_mudas = { rec: { barra: valor }, sob: { barra: valor | null }, pd: { barra especial: valor },
--               tmp: { id do bônus: { n, k, v, d?, t?, r?, ate? } | null } }
--   p_volta = true desfaz um uso: a unidade volta para a bolsa (e as mudanças são as de antes; tmp: null tira o bônus).
-- (O mestre não precisa disto: ele grava as fichas direto.)
create or replace function public.usar_item_em(p_mesa uuid, p_de text, p_item text, p_alvo text, p_mudas jsonb, p_volta boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_de public.personagens; v_alvo public.personagens;
  v_qtd numeric; v_estado jsonb; v_e jsonb; v_rec jsonb; v_sob jsonb; v_pd jsonb; v_tmp jsonb;
  v_ids text[]; v_pds text[]; k text; v jsonb; v_max numeric; x jsonb;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if p_mudas is null or jsonb_typeof(p_mudas) <> 'object' then raise exception 'Uso de item inválido.'; end if;
  if p_de = p_alvo then raise exception 'Para usar no próprio personagem, a bolsa grava direto na ficha.'; end if;
  -- (as duas linhas são presas sempre na mesma ordem: dois usos cruzados ao mesmo tempo não se travam)
  perform 1 from public.personagens p where p.mesa_id = p_mesa and p.id in (p_de, p_alvo) order by p.id for update;
  -- quem usa: a ficha é dele (ou quem usa mestra as Fichas)
  select p.* into v_de from public.personagens p where p.mesa_id = p_mesa and p.id = p_de and not p.apagado for update;
  if not found then raise exception 'A ficha de quem usa não está mais na mesa.'; end if;
  if not (v_de.dono_id = v_uid or privado.mestra(p_mesa, 'fichas')) then raise exception 'Você só usa itens da bolsa dos seus personagens.'; end if;
  if not privado.campanha_aberta(p_mesa, v_de.campanha) then raise exception 'Esta campanha está encerrada: as fichas dela são só para consulta.'; end if;
  if not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(v_de.ficha -> 'bolsa') = 'array' then v_de.ficha -> 'bolsa' else '[]'::jsonb end) b
                  where jsonb_typeof(b) = 'object' and (b ->> 'id') = p_item) then
    raise exception 'Este item não está mais na bolsa.';
  end if;
  -- em quem: um personagem que quem usa vê, numa campanha em que ainda se joga
  select p.* into v_alvo from public.personagens p where p.mesa_id = p_mesa and p.id = p_alvo and not p.apagado for update;
  if not found then raise exception 'Esse personagem não está mais na mesa.'; end if;
  if not (privado.mestra(p_mesa, 'fichas')
          or v_alvo.dono_id = v_uid
          or (v_alvo.vis = 'mesa' and privado.ve_campanha(p_mesa, v_alvo.campanha))) then
    raise exception 'Você não vê a ficha desse personagem.';
  end if;
  if not privado.campanha_aberta(p_mesa, v_alvo.campanha) then raise exception 'A campanha desse personagem está encerrada.'; end if;

  -- a unidade sai da bolsa (ou volta, ao desfazer)
  v_estado := case when jsonb_typeof(v_de.estado) = 'object' then v_de.estado else '{}'::jsonb end;
  v_qtd := case when jsonb_typeof(v_estado -> 'qtd' -> p_item) = 'number' then floor((v_estado -> 'qtd' ->> p_item)::numeric) else 0 end;
  if coalesce(p_volta, false) then v_qtd := least(9999, greatest(0, v_qtd) + 1);
  else
    if v_qtd < 1 then raise exception 'Não há mais deste item na bolsa.'; end if;
    v_qtd := v_qtd - 1;
  end if;
  v_estado := jsonb_set(v_estado, '{qtd}', case when jsonb_typeof(v_estado -> 'qtd') = 'object' then v_estado -> 'qtd' else '{}'::jsonb end, true);
  v_estado := jsonb_set(v_estado, array['qtd', p_item], to_jsonb(v_qtd), true);
  update public.personagens p set estado = v_estado where p.mesa_id = p_mesa and p.id = p_de;

  -- o efeito no outro: só barras, sobrevidas, barras especiais e bônus que existem, com valores de verdade
  v_e := case when jsonb_typeof(v_alvo.estado) = 'object' then v_alvo.estado else '{}'::jsonb end;
  select coalesce(array_agg(r ->> 'id'), '{}'::text[]) into v_ids
    from jsonb_array_elements(case when jsonb_typeof(v_alvo.ficha -> 'recursos') = 'array' then v_alvo.ficha -> 'recursos' else '[]'::jsonb end) r
   where jsonb_typeof(r) = 'object' and (r ->> 'id') is not null;
  select coalesce(array_agg(r ->> 'id'), '{}'::text[]) into v_pds
    from jsonb_array_elements(case when jsonb_typeof(v_alvo.ficha -> 'poderes') = 'array' then v_alvo.ficha -> 'poderes' else '[]'::jsonb end) r
   where jsonb_typeof(r) = 'object' and (r ->> 'id') is not null;
  v_rec := case when jsonb_typeof(v_e -> 'rec') = 'object' then v_e -> 'rec' else '{}'::jsonb end;
  v_sob := case when jsonb_typeof(v_e -> 'sob') = 'object' then v_e -> 'sob' else '{}'::jsonb end;
  v_pd := case when jsonb_typeof(v_e -> 'pd') = 'object' then v_e -> 'pd' else '{}'::jsonb end;
  v_tmp := case when jsonb_typeof(v_e -> 'tmp') = 'object' then v_e -> 'tmp' else '{}'::jsonb end;
  if jsonb_typeof(p_mudas -> 'rec') = 'object' then
    for k, v in select * from jsonb_each(p_mudas -> 'rec') loop
      if not (k = any (v_ids)) then raise exception 'Barra desconhecida.'; end if;
      if jsonb_typeof(v) = 'null' then v_rec := v_rec - k;            -- (desfazer: a barra volta ao começo dela)
      elsif jsonb_typeof(v) = 'number' and abs((v #>> '{}')::numeric) <= 1000000 then v_rec := jsonb_set(v_rec, array[k], v, true);
      else raise exception 'Valor de barra inválido.'; end if;
    end loop;
  end if;
  if jsonb_typeof(p_mudas -> 'sob') = 'object' then
    for k, v in select * from jsonb_each(p_mudas -> 'sob') loop
      if not (k = any (v_ids)) then raise exception 'Barra desconhecida.'; end if;
      if jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric > 0 and (v #>> '{}')::numeric <= 1000000 then v_sob := jsonb_set(v_sob, array[k], v, true);
      elsif jsonb_typeof(v) = 'null' or (jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric <= 0) then v_sob := v_sob - k;
      else raise exception 'Sobrevida inválida.'; end if;
    end loop;
  end if;
  if jsonb_typeof(p_mudas -> 'pd') = 'object' then
    for k, v in select * from jsonb_each(p_mudas -> 'pd') loop
      if not (k = any (v_pds)) or jsonb_typeof(v) <> 'number' then raise exception 'Barra especial desconhecida.'; end if;
      select greatest(0, round(coalesce(case when jsonb_typeof(x2 -> 'max') = 'number' then (x2 ->> 'max')::numeric end, 0))) into v_max
        from jsonb_array_elements(v_alvo.ficha -> 'poderes') x2 where jsonb_typeof(x2) = 'object' and (x2 ->> 'id') = k limit 1;
      v_pd := jsonb_set(v_pd, array[k], to_jsonb(case when v_max > 0 then least(greatest(0, round((v #>> '{}')::numeric)), v_max) else greatest(0, round((v #>> '{}')::numeric)) end), true);
    end loop;
  end if;
  if jsonb_typeof(p_mudas -> 'tmp') = 'object' then
    for k, x in select * from jsonb_each(p_mudas -> 'tmp') loop
      if k !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Bônus inválido.'; end if;
      if jsonb_typeof(x) = 'null' then
        if not coalesce(p_volta, false) then raise exception 'Bônus inválido.'; end if;
        v_tmp := v_tmp - k;
        continue;
      end if;
      if coalesce(p_volta, false) or v_tmp ? k then raise exception 'Bônus inválido.'; end if;
      if jsonb_typeof(x) <> 'object' or jsonb_typeof(x -> 'v') <> 'number' or abs((x ->> 'v')::numeric) > 9999
         or coalesce(x ->> 'k', '') !~ '^[A-Z_]{1,12}$' or char_length(coalesce(x ->> 'n', '')) > 80 or char_length(coalesce(x ->> 'd', '')) > 80
         or (x ? 'r' and (jsonb_typeof(x -> 'r') <> 'number' or (x ->> 'r')::numeric < 0 or (x ->> 'r')::numeric > 999))
         or (x ? 'ate' and coalesce(x ->> 'ate', '') <> 'descanso')
         or (x ? 't' and jsonb_typeof(x -> 't') <> 'number') then
        raise exception 'Bônus inválido.';
      end if;
      v_tmp := jsonb_set(v_tmp, array[k], jsonb_strip_nulls(jsonb_build_object('n', x -> 'n', 'k', x -> 'k', 'v', x -> 'v', 'd', x -> 'd', 't', x -> 't', 'r', x -> 'r', 'ate', x -> 'ate')), true);
    end loop;
  end if;
  v_e := jsonb_set(jsonb_set(jsonb_set(jsonb_set(v_e, '{rec}', v_rec, true), '{sob}', v_sob, true), '{pd}', v_pd, true), '{tmp}', v_tmp, true);
  update public.personagens p set estado = v_e where p.mesa_id = p_mesa and p.id = p_alvo;
  return jsonb_build_object('ok', true, 'qtd', v_qtd);
end $function$;
revoke all on function public.usar_item_em(uuid, text, text, text, jsonb, boolean) from public, anon;
grant execute on function public.usar_item_em(uuid, text, text, text, jsonb, boolean) to authenticated;

-- 3) A mesa ao vivo fechada para um jogador ----------------------------------------------------------------------------
-- O mestre fecha a mesa ao vivo para um jogador (no menu da mesa, em Permissões): até liberar, essa pessoa só vê as
-- próprias linhas — a conversa, as rolagens e os avisos dos outros não chegam a ela. Quem está mestrando vê sempre.
alter table public.mesa_membros add column if not exists sem_vivo boolean not null default false;
comment on column public.mesa_membros.sem_vivo is 'O mestre fechou a mesa ao vivo para esta pessoa: ela só vê as próprias linhas.';
create or replace function privado.vivo_fechado(m uuid)
returns boolean language sql stable security definer set search_path to '' as $function$
  select exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()) and mm.sem_vivo)
     and not privado.mestrando(m);
$function$;
revoke all on function privado.vivo_fechado(uuid) from public, anon;
grant execute on function privado.vivo_fechado(uuid) to authenticated;
alter policy registro_ver on public.registro
  using (privado.e_membro(mesa_id) and (not secreta or autor_id = (select auth.uid())) and privado.ve_campanha(mesa_id, campanha)
         and (autor_id = (select auth.uid()) or not privado.vivo_fechado(mesa_id)));
-- fechar e abrir: só o mestre da mesa (como nomear o auxiliar); o mestre não se fecha
create or replace function public.vivo_do_jogador(p_mesa uuid, p_usuario uuid, p_fechado boolean)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare v_linha public.mesa_membros;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa fecha a mesa ao vivo para alguém.'; end if;
  update public.mesa_membros mm set sem_vivo = coalesce(p_fechado, false)
   where mm.mesa_id = p_mesa and mm.usuario_id = p_usuario and mm.papel <> 'mestre'
  returning mm.* into v_linha;
  if not found then raise exception 'Essa pessoa não participa desta mesa (ou é o mestre).'; end if;
  return v_linha;
end $function$;
revoke all on function public.vivo_do_jogador(uuid, uuid, boolean) from public, anon;
grant execute on function public.vivo_do_jogador(uuid, uuid, boolean) to authenticated;
