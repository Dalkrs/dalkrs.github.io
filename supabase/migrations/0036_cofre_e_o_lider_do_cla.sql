-- LOTE 74 (CLÃ): o cofre de lapros do clã e o líder que cuida do clã.
-- 1) O cofre de lapros do clã: cla:cofre:<clã> = { v: { q: <lapros no cofre>, ext: [ { em, quem, pc, q, saldo, nota, m } ] } }
--    (como a caixinha do grupo: ext é o extrato, do mais novo para o mais velho, até 100 linhas; q > 0 entrou no cofre,
--    q < 0 saiu; m: foi quem mestra que fez; por: o líder que pagou). A mesa lê; quem escreve é public.cla_cofre_mover:
--      · quem joga põe lapros da ficha de um personagem seu que é membro do clã (sai da ficha, entra no cofre);
--      · o líder do clã dos jogadores (o dono do personagem no cargo de líder) tira do cofre para a ficha de qualquer
--        membro (paga um membro);
--      · quem mestra o Clã faz tudo isso com qualquer ficha de membro, e também põe ou tira lapros sem ficha nenhuma
--        ("o mestre pôs 200 · o saque da cripta").
--    As duas pontas — a ficha e o cofre — mudam juntas, e ninguém fica com menos de zero.
-- 2) O líder do clã dos jogadores passa a cuidar também dos recursos do cofre, das construções e dos membros (o rol, os
--    dados de cada um e o respeito dos membros), por public.cla_lider. Continuam só com quem mestra: o cargo de líder,
--    o nome, o lema, o brasão, a facção, o respeito no mundo, as relações, a sede e as tropas. Cada mudança do líder vai
--    para o histórico com o nome dele, e a última fica guardada (liderUlt: o antes e o depois) para quem mestra desfazer.
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

-- (apoio) o personagem é membro do clã? (numa pessoa de um cargo, ou entre os membros sem cargo)
create or replace function privado.cla_tem_pc(p_doc jsonb, p_pc text)
returns boolean language sql immutable set search_path to '' as $function$
  select coalesce(p_pc, '') <> '' and (
    exists (select 1 from jsonb_each(case when jsonb_typeof(p_doc -> 'cargos') = 'object' then p_doc -> 'cargos' else '{}'::jsonb end) c
             cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value -> 'gente') = 'array' then c.value -> 'gente' else '[]'::jsonb end) g(p)
             where g.p ->> 'pc' = p_pc)
    or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_doc #> '{membros,avulsos}') = 'array' then p_doc #> '{membros,avulsos}' else '[]'::jsonb end) a(p)
                where a.p ->> 'pc' = p_pc));
$function$;
-- (apoio) quem usa é o líder do clã dos jogadores? → o nome do personagem no cargo de líder, ou null
create or replace function privado.cla_lider_nome(p_mesa uuid, p_doc jsonb)
returns text language sql stable security definer set search_path to '' as $function$
  select coalesce(nullif(btrim(pe.nome), ''), 'O líder')
    from public.personagens pe
   where (p_doc -> 'jogadores') = 'true'::jsonb and pe.mesa_id = p_mesa and pe.id = (p_doc #>> '{cargos,lider,gente,0,pc}')
     and not pe.apagado and pe.dono_id = (select auth.uid());
$function$;
revoke all on function privado.cla_tem_pc(jsonb, text), privado.cla_lider_nome(uuid, jsonb) from public, anon, authenticated;

-- O cofre só o banco escreve (ver cla_cofre_mover); o resto dos documentos do clã, como antes (0018)
create or replace function privado.cla_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id like 'cla:pub:%' or new.id like 'cla:cofre:%' then
    if (select auth.uid()) is not null and coalesce(current_setting('tinycats.cla', true), '') <> 'sim' then
      raise exception '%', case when new.id like 'cla:cofre:%' then 'O cofre do clã só muda pelo cofre (pôr e tirar lapros).' else 'O que a mesa vê de um clã é o próprio banco que monta, a partir do clã.' end;
    end if;
  elsif new.id like 'cla:c:%' and (new.vis is distinct from 'mestre' or new.dono_id is not null) then
    raise exception 'O clã inteiro fica só com quem mestra o Clã (a mesa vê a parte que o mestre mostra).';
  end if;
  return new;
end $function$;
revoke all on function privado.cla_guarda() from public, anon, authenticated;

/* p_qtd > 0: põe no cofre (sai da ficha p_pc); p_qtd < 0: tira do cofre (vai para a ficha p_pc). Sem ficha (p_pc nulo):
   só quem mestra o Clã, e só o cofre muda. p_nota: um texto curto para o extrato. */
create or replace function public.cla_cofre_mover(p_mesa uuid, p_cla text, p_pc text, p_qtd bigint, p_nota text default '')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_nota text := left(btrim(regexp_replace(coalesce(p_nota, ''), '[[:space:]]+', ' ', 'g')), 120);
  v_doc text; v_cla jsonb; v_mestra boolean; v_lider text; v_pc public.personagens;
  v_d jsonb; v_q bigint; v_lapros bigint := null; v_quem text; v_por text := null; v_m boolean := false;
  v_em text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if p_cla is null or p_cla !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Esse clã não existe.'; end if;
  if p_qtd is null or p_qtd = 0 or abs(p_qtd) > 1000000000 then raise exception 'Diga quantos lapros (um número inteiro).'; end if;
  select d.dados into v_cla from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:c:' || p_cla and not d.apagado;
  if not found then raise exception 'Esse clã não existe mais.'; end if;
  v_mestra := privado.mestra(p_mesa, 'cla');
  v_lider := case when v_mestra then null else privado.cla_lider_nome(p_mesa, v_cla) end;
  if not v_mestra and (v_cla -> 'jogadores') is distinct from 'true'::jsonb then raise exception 'Só o clã dos jogadores tem cofre para eles.'; end if;
  if p_pc is null then
    if not v_mestra then raise exception 'Só quem mestra o Clã põe ou tira lapros sem uma ficha.'; end if;
    v_quem := 'O mestre'; v_m := true;
  else
    select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado for update;
    if not found then raise exception 'Essa ficha não existe mais.'; end if;
    if not privado.cla_tem_pc(v_cla, p_pc) then raise exception 'Esse personagem não é membro do clã.'; end if;
    if p_qtd > 0 and not v_mestra and v_pc.dono_id is distinct from v_uid then raise exception 'Você põe lapros de um personagem seu.'; end if;
    if p_qtd < 0 and not v_mestra and v_lider is null then raise exception 'Só o líder do clã (ou quem mestra) tira lapros do cofre.'; end if;
    v_quem := left(coalesce(nullif(btrim(v_pc.nome), ''), 'Sem nome'), 60);
    v_m := v_mestra and v_pc.dono_id is distinct from v_uid;
    v_lapros := privado.caixa_qtd(v_pc.estado -> 'lapros');
    if p_qtd > 0 and v_lapros < p_qtd then raise exception '% tem só % lapros.', v_quem, v_lapros; end if;
    -- (o líder pagando um membro: o extrato diz quem pagou)
    if p_qtd < 0 and not v_mestra then v_por := left(v_lider, 60); end if;
  end if;
  v_doc := 'cla:cofre:' || p_cla;
  perform set_config('tinycats.cla', 'sim', true);
  insert into public.documentos (mesa_id, id, vis, dados) values (p_mesa, v_doc, 'mesa', '{"v":{"q":0,"ext":[]}}'::jsonb)
  on conflict (mesa_id, id) do nothing;
  select d.dados into v_d from public.documentos d where d.mesa_id = p_mesa and d.id = v_doc for update;
  if jsonb_typeof(v_d) is distinct from 'object' or jsonb_typeof(v_d -> 'v') is distinct from 'object' then v_d := '{"v":{"q":0,"ext":[]}}'::jsonb; end if;
  v_q := privado.caixa_qtd(v_d #> '{v,q}');
  if p_qtd < 0 and v_q < -p_qtd then perform set_config('tinycats.cla', '', true); raise exception 'O cofre do clã tem só % lapros.', v_q; end if;
  v_q := v_q + p_qtd;
  v_d := jsonb_build_object('v', jsonb_build_object('q', v_q, 'ext', privado.medit_lista(
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('em', v_em, 'quem', v_quem, 'pc', p_pc, 'q', p_qtd, 'saldo', v_q, 'nota', nullif(v_nota, ''), 'por', v_por, 'm', case when v_m then true end)))
      || coalesce(case when jsonb_typeof(v_d #> '{v,ext}') = 'array' then v_d #> '{v,ext}' end, '[]'::jsonb), 100)));
  update public.documentos d set dados = v_d, apagado = false, vis = 'mesa', dono_id = null where d.mesa_id = p_mesa and d.id = v_doc;
  perform set_config('tinycats.cla', '', true);
  if p_pc is not null then
    v_lapros := v_lapros - p_qtd;
    update public.personagens pe set estado = jsonb_set(case when jsonb_typeof(pe.estado) = 'object' then pe.estado else '{}'::jsonb end, '{lapros}', to_jsonb(v_lapros), true)
     where pe.mesa_id = p_mesa and pe.id = p_pc;
  end if;
  return jsonb_build_object('ok', true, 'cofre', v_q, 'lapros', v_lapros);
end $function$;
revoke all on function public.cla_cofre_mover(uuid, text, text, bigint, text) from public, anon;
grant execute on function public.cla_cofre_mover(uuid, text, text, bigint, text) to authenticated;

/* O líder cuida do clã. p_partes: { recursos?, construcoes?, membros?, resp? } — o valor novo de cada parte que mudou
   (como o site guarda: ver cla/nucleo.js). resp: { <id da pessoa>: <respeito> } — o respeito dos membros (de quem
   está num cargo; o dos membros sem cargo vai junto com membros). O resto do clã fica como está. p_txt: o que vai
   para o histórico ("subiu a Forja para o nível 2"). Quem mestra o Clã também pode usar (mas grava o clã direto). */
create or replace function public.cla_lider(p_mesa uuid, p_cla text, p_partes jsonb, p_txt text default '')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_doc jsonb; v_novo jsonb; v_quem text; v_txt text; v_antes jsonb := '{}'::jsonb; v_depois jsonb := '{}'::jsonb;
  v_k text; v_cargos jsonb; v_c text; v_i integer; v_pid text; v_r jsonb;
  v_em text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if p_cla is null or p_cla !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Esse clã não existe.'; end if;
  if jsonb_typeof(p_partes) is distinct from 'object' then raise exception 'Pedido desconhecido.'; end if;
  if exists (select 1 from jsonb_object_keys(p_partes) k where k not in ('recursos', 'construcoes', 'membros', 'resp')) then raise exception 'O líder cuida dos recursos, das construções e dos membros (o resto é com o mestre).'; end if;
  if octet_length(p_partes::text) > 400000 then raise exception 'Mudança grande demais.'; end if;
  select d.dados into v_doc from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:c:' || p_cla and not d.apagado for update;
  if not found then raise exception 'Esse clã não existe mais.'; end if;
  v_doc := case when jsonb_typeof(v_doc) = 'object' then v_doc else '{}'::jsonb end;
  if privado.mestra(p_mesa, 'cla') then v_quem := 'Quem mestra';
  else
    v_quem := privado.cla_lider_nome(p_mesa, v_doc);
    if v_quem is null then raise exception 'Só quem ocupa o cargo de líder do clã dos jogadores (ou quem mestra o Clã) mexe nisso.'; end if;
    v_quem := v_quem || ' (líder)';
  end if;
  v_novo := v_doc;
  foreach v_k in array array['recursos', 'construcoes', 'membros'] loop
    continue when not (p_partes ? v_k);
    if v_k = 'construcoes' and jsonb_typeof(p_partes -> v_k) is distinct from 'array' then raise exception 'Pedido desconhecido.'; end if;
    if v_k <> 'construcoes' and jsonb_typeof(p_partes -> v_k) is distinct from 'object' then raise exception 'Pedido desconhecido.'; end if;
    v_antes := v_antes || jsonb_build_object(v_k, coalesce(v_doc -> v_k, 'null'::jsonb));
    v_depois := v_depois || jsonb_build_object(v_k, p_partes -> v_k);
    v_novo := jsonb_set(v_novo, array[v_k], p_partes -> v_k, true);
  end loop;
  -- o respeito de quem está num cargo: só o número muda (o cargo e a pessoa continuam como estão)
  if p_partes ? 'resp' then
    if jsonb_typeof(p_partes -> 'resp') is distinct from 'object' then raise exception 'Pedido desconhecido.'; end if;
    v_cargos := case when jsonb_typeof(v_doc -> 'cargos') = 'object' then v_doc -> 'cargos' else '{}'::jsonb end;
    v_antes := v_antes || jsonb_build_object('cargos', v_cargos);
    for v_c in select jsonb_object_keys(v_cargos) loop
      continue when jsonb_typeof(v_cargos #> array[v_c, 'gente']) is distinct from 'array';
      for v_i in 0 .. jsonb_array_length(v_cargos #> array[v_c, 'gente']) - 1 loop
        v_pid := v_cargos #>> array[v_c, 'gente', v_i::text, 'id'];
        v_r := p_partes #> array['resp', coalesce(v_pid, '')];
        if v_pid is not null and jsonb_typeof(v_r) = 'number' then
          v_cargos := jsonb_set(v_cargos, array[v_c, 'gente', v_i::text, 'resp'], to_jsonb(greatest(-10, least(10, round((v_r #>> '{}')::numeric)))::integer), true);
        end if;
      end loop;
    end loop;
    v_novo := jsonb_set(v_novo, '{cargos}', v_cargos, true);
    v_depois := v_depois || jsonb_build_object('cargos', v_cargos);
  end if;
  if v_novo = v_doc then return jsonb_build_object('ok', true, 'nada', true); end if;
  v_txt := rtrim(btrim(regexp_replace(coalesce(p_txt, ''), '[[:space:]]+', ' ', 'g')), '.');
  v_novo := jsonb_set(v_novo, '{hist}', privado.medit_lista(jsonb_build_array(jsonb_build_object('em', v_em, 'tipo', 'lider', 'txt', left(v_quem || ': ' || coalesce(nullif(v_txt, ''), 'mudou o clã') || '.', 300)))
    || privado.medit_lista(v_doc -> 'hist', 299), 300), true);
  -- a última mudança do líder, para quem mestra desfazer (só a última)
  if v_quem <> 'Quem mestra' then
    v_novo := jsonb_set(v_novo, '{liderUlt}', jsonb_build_object('em', v_em, 'quem', v_quem, 'txt', left(coalesce(nullif(v_txt, ''), 'mudou o clã'), 200), 'antes', v_antes, 'depois', v_depois), true);
  end if;
  if octet_length(v_novo::text) > 1500000 then raise exception 'O clã ficou grande demais.'; end if;
  update public.documentos d set dados = v_novo where d.mesa_id = p_mesa and d.id = 'cla:c:' || p_cla;
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.cla_lider(uuid, text, jsonb, text) from public, anon;
grant execute on function public.cla_lider(uuid, text, jsonb, text) to authenticated;
