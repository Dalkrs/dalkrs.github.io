-- LOTE 16 (FICHAS, GRUPO E ÁRVORE): a caixinha do grupo — os lapros que o grupo guarda junto.
-- O documento fichas:caixa (o dos grupos do mundo) ou fichas:caixa@<campanha> (o dos grupos de uma campanha):
--   { v: { g: { <nome do grupo>: { q: <lapros na caixinha>, ext: [ { em, quem, pc, q, saldo, nota, m } ] } } } }
--   (ext: o extrato, do mais novo para o mais velho, até 100 linhas; q > 0 entrou na caixinha, q < 0 saiu;
--    m: foi quem mestra que fez, pela ficha de outro ou sem ficha nenhuma)
-- A mesa lê (o de uma campanha, quem participa dela). Quem escreve são as funções daqui:
--   · public.caixa_mover — quem joga, com um personagem seu daquele grupo, põe lapros da ficha na caixinha, ou pega da
--     caixinha para a ficha; quem mestra as Fichas faz o mesmo com qualquer ficha do grupo, e também põe ou tira da
--     caixinha sem ficha nenhuma (um achado, uma despesa do grupo). As duas pontas — a ficha e a caixinha — mudam
--     juntas, e ninguém fica com menos de zero.
--   · public.caixa_levar — quem mestra as Fichas leva a caixinha quando o grupo muda de nome (ou passa para outra
--     campanha): o que havia vai junto, somado ao que já houver lá.
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

-- (apoio) o nome do grupo, do jeito que a ficha guarda: sem espaço sobrando
create or replace function privado.caixa_grupo(g text)
returns text language sql immutable set search_path to '' as $function$
  select btrim(regexp_replace(coalesce(g, ''), '[[:space:]]+', ' ', 'g'));
$function$;
-- (apoio) um número inteiro, de zero para cima, de um valor do JSON (o que não é número vale 0)
create or replace function privado.caixa_qtd(v jsonb)
returns bigint language sql immutable set search_path to '' as $function$
  select case when jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric between 0 and 1e15 then floor((v #>> '{}')::numeric)::bigint
              when jsonb_typeof(v) = 'string' and (v #>> '{}') ~ '^[0-9]{1,15}$' then (v #>> '{}')::bigint
              else 0 end;
$function$;
-- (apoio) o documento da caixinha, travado para esta mudança (nasce vazio na primeira vez)
create or replace function privado.caixa_doc(p_mesa uuid, p_doc text)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_d jsonb; v_apagado boolean;
begin
  insert into public.documentos (mesa_id, id, vis, dados) values (p_mesa, p_doc, 'mesa', '{"v":{"g":{}}}'::jsonb)
  on conflict (mesa_id, id) do nothing;
  select d.dados, d.apagado into v_d, v_apagado from public.documentos d where d.mesa_id = p_mesa and d.id = p_doc for update;
  if v_apagado or jsonb_typeof(v_d) is distinct from 'object' or jsonb_typeof(v_d -> 'v') is distinct from 'object' then v_d := '{"v":{"g":{}}}'::jsonb; end if;
  if jsonb_typeof(v_d #> '{v,g}') is distinct from 'object' then v_d := jsonb_set(v_d, '{v,g}', '{}'::jsonb, true); end if;
  return v_d;
end $function$;
create or replace function privado.caixa_gravar(p_mesa uuid, p_doc text, p_d jsonb)
returns void language sql security definer set search_path to '' as $function$
  update public.documentos d set dados = p_d, apagado = false, vis = 'mesa', dono_id = null where d.mesa_id = p_mesa and d.id = p_doc;
$function$;
revoke all on function privado.caixa_grupo(text), privado.caixa_qtd(jsonb), privado.caixa_doc(uuid, text), privado.caixa_gravar(uuid, text, jsonb) from public, anon, authenticated;

/* p_qtd > 0: põe na caixinha (sai da ficha); p_qtd < 0: pega da caixinha (vai para a ficha). Sem ficha (p_pc nulo): só
   quem mestra as Fichas, e só a caixinha muda. p_nota: um texto curto para o extrato ("a pousada", "o achado da cripta"). */
create or replace function public.caixa_mover(p_mesa uuid, p_camp text, p_grupo text, p_pc text, p_qtd bigint, p_nota text default '')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_camp text := nullif(btrim(coalesce(p_camp, '')), '');
  v_doc text;
  v_grupo text := privado.caixa_grupo(p_grupo);
  v_nota text := left(btrim(regexp_replace(coalesce(p_nota, ''), '[[:space:]]+', ' ', 'g')), 120);
  v_mestra boolean;
  v_pc public.personagens;
  v_d jsonb; v_g jsonb; v_caixa bigint; v_lapros bigint := null; v_quem text; v_m boolean := false;
  v_em text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if v_camp is not null and not exists (select 1 from public.campanhas c where c.mesa_id = p_mesa and c.id = v_camp) then raise exception 'Essa campanha não existe mais.'; end if;
  if not privado.campanha_aberta(p_mesa, v_camp) then raise exception 'Campanha encerrada: só para consulta.'; end if;
  if v_grupo = '' then raise exception 'A caixinha é de um grupo: ponha a ficha num grupo primeiro.'; end if;
  if char_length(v_grupo) > 120 then raise exception 'Esse grupo não existe.'; end if;
  if p_qtd is null or p_qtd = 0 or abs(p_qtd) > 1000000000 then raise exception 'Diga quantos lapros (um número inteiro).'; end if;
  v_mestra := privado.mestra(p_mesa, 'fichas');
  if not v_mestra and not privado.ve_campanha(p_mesa, v_camp) then raise exception 'Você não participa dessa campanha.'; end if;
  v_doc := 'fichas:caixa' || case when v_camp is null then '' else '@' || v_camp end;
  if p_pc is null then
    if not v_mestra then raise exception 'Só quem mestra as Fichas mexe na caixinha sem uma ficha.'; end if;
    v_quem := ''; v_m := true;
  else
    select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado for update;
    if not found then raise exception 'Essa ficha não existe mais.'; end if;
    if not v_mestra and v_pc.dono_id is distinct from v_uid then raise exception 'Só com um personagem seu (quem mestra as Fichas usa qualquer um).'; end if;
    if v_pc.campanha is distinct from v_camp or privado.caixa_grupo(v_pc.ficha ->> 'grupo') <> v_grupo then raise exception 'Esse personagem não é desse grupo.'; end if;
    v_quem := left(coalesce(nullif(btrim(v_pc.nome), ''), 'Sem nome'), 60);
    v_m := v_mestra and v_pc.dono_id is distinct from v_uid;
    v_lapros := privado.caixa_qtd(v_pc.estado -> 'lapros');
    if p_qtd > 0 and v_lapros < p_qtd then raise exception '% tem só % lapros.', v_quem, v_lapros; end if;
  end if;
  v_d := privado.caixa_doc(p_mesa, v_doc);
  v_g := case when jsonb_typeof(v_d #> array['v', 'g', v_grupo]) = 'object' then v_d #> array['v', 'g', v_grupo] else '{}'::jsonb end;
  v_caixa := privado.caixa_qtd(v_g -> 'q');
  if p_qtd < 0 and v_caixa < -p_qtd then raise exception 'A caixinha do grupo tem só % lapros.', v_caixa; end if;
  v_caixa := v_caixa + p_qtd;
  v_g := jsonb_build_object('q', v_caixa, 'ext', privado.medit_lista(
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('em', v_em, 'quem', v_quem, 'pc', p_pc, 'q', p_qtd, 'saldo', v_caixa, 'nota', nullif(v_nota, ''), 'm', case when v_m then true end)))
      || coalesce(case when jsonb_typeof(v_g -> 'ext') = 'array' then v_g -> 'ext' end, '[]'::jsonb), 100));
  perform privado.caixa_gravar(p_mesa, v_doc, jsonb_set(v_d, array['v', 'g', v_grupo], v_g, true));
  if p_pc is not null then
    v_lapros := v_lapros - p_qtd;
    update public.personagens pe set estado = jsonb_set(case when jsonb_typeof(pe.estado) = 'object' then pe.estado else '{}'::jsonb end, '{lapros}', to_jsonb(v_lapros), true)
     where pe.mesa_id = p_mesa and pe.id = p_pc;
  end if;
  return jsonb_build_object('ok', true, 'caixa', v_caixa, 'lapros', v_lapros);
end $function$;
revoke all on function public.caixa_mover(uuid, text, text, text, bigint, text) from public, anon;
grant execute on function public.caixa_mover(uuid, text, text, text, bigint, text) to authenticated;

/* O grupo mudou de nome (ou passou para outra campanha): a caixinha vai junto. O que havia no destino continua lá, com
   o que chega somado; o extrato fica um só (o mais novo primeiro). Só quem mestra as Fichas; de uma campanha para
   outra, só o mestre da mesa (como passar o grupo). */
create or replace function public.caixa_levar(p_mesa uuid, p_camp text, p_grupo text, p_para_camp text, p_para_grupo text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_camp text := nullif(btrim(coalesce(p_camp, '')), '');
  v_para text := nullif(btrim(coalesce(p_para_camp, '')), '');
  v_de text := privado.caixa_grupo(p_grupo);
  v_pg text := privado.caixa_grupo(p_para_grupo);
  v_doc1 text; v_doc2 text; v_d1 jsonb; v_d2 jsonb; v_g1 jsonb; v_g2 jsonb; v_ext jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.mestra(p_mesa, 'fichas') then raise exception 'Só quem mestra as Fichas leva a caixinha de um grupo.'; end if;
  if v_de = '' or v_pg = '' or char_length(v_pg) > 120 then raise exception 'Esse grupo não existe.'; end if;
  if v_camp is distinct from v_para and not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa passa um grupo de uma campanha para outra.'; end if;
  if not privado.campanha_aberta(p_mesa, v_camp) or not privado.campanha_aberta(p_mesa, v_para) then raise exception 'Campanha encerrada: só para consulta.'; end if;
  if v_para is not null and not exists (select 1 from public.campanhas c where c.mesa_id = p_mesa and c.id = v_para) then raise exception 'Essa campanha não existe mais.'; end if;
  v_doc1 := 'fichas:caixa' || case when v_camp is null then '' else '@' || v_camp end;
  v_doc2 := 'fichas:caixa' || case when v_para is null then '' else '@' || v_para end;
  if v_doc1 = v_doc2 and v_de = v_pg then return jsonb_build_object('ok', true); end if;
  if not exists (select 1 from public.documentos d where d.mesa_id = p_mesa and d.id = v_doc1 and not d.apagado and jsonb_typeof(d.dados #> array['v', 'g', v_de]) = 'object') then
    return jsonb_build_object('ok', true);          -- (o grupo não tinha caixinha: nada a levar)
  end if;
  -- (os dois documentos travados sempre na mesma ordem: duas mudanças ao mesmo tempo não se esperam para sempre)
  if v_doc1 <= v_doc2 then v_d1 := privado.caixa_doc(p_mesa, v_doc1); v_d2 := case when v_doc1 = v_doc2 then v_d1 else privado.caixa_doc(p_mesa, v_doc2) end;
  else v_d2 := privado.caixa_doc(p_mesa, v_doc2); v_d1 := privado.caixa_doc(p_mesa, v_doc1); end if;
  v_g1 := case when jsonb_typeof(v_d1 #> array['v', 'g', v_de]) = 'object' then v_d1 #> array['v', 'g', v_de] else '{}'::jsonb end;
  v_d1 := v_d1 #- array['v', 'g', v_de];
  if v_doc1 = v_doc2 then v_d2 := v_d1; end if;
  v_g2 := case when jsonb_typeof(v_d2 #> array['v', 'g', v_pg]) = 'object' then v_d2 #> array['v', 'g', v_pg] else '{}'::jsonb end;
  select coalesce(jsonb_agg(x.e order by x.e ->> 'em' desc), '[]'::jsonb) into v_ext
    from (select e from jsonb_array_elements(coalesce(case when jsonb_typeof(v_g1 -> 'ext') = 'array' then v_g1 -> 'ext' end, '[]'::jsonb)) e
          union all
          select e from jsonb_array_elements(coalesce(case when jsonb_typeof(v_g2 -> 'ext') = 'array' then v_g2 -> 'ext' end, '[]'::jsonb)) e) x;
  v_d2 := jsonb_set(v_d2, array['v', 'g', v_pg], jsonb_build_object('q', privado.caixa_qtd(v_g1 -> 'q') + privado.caixa_qtd(v_g2 -> 'q'), 'ext', privado.medit_lista(v_ext, 100)), true);
  if v_doc1 <> v_doc2 then perform privado.caixa_gravar(p_mesa, v_doc1, v_d1); end if;
  perform privado.caixa_gravar(p_mesa, v_doc2, v_d2);
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.caixa_levar(uuid, text, text, text, text) from public, anon;
grant execute on function public.caixa_levar(uuid, text, text, text, text) to authenticated;
