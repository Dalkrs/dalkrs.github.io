-- Tiny Cats · 0034 · os membros do clã e as perícias das tropas (lote 56)
-- 1) O clã ganha a lista de membros (a chave "membros" do documento cla:c:<id>: os membros sem cargo e, de cada um —
--    com cargo ou sem —, a raça, a classe, o nascimento no calendário do mundo e a ficha ligada). O que a mesa vê
--    (cla:pub:<id>, montado aqui no banco) passa a levar a parte "membros" como as outras: no clã dos jogadores, sempre;
--    no de NPC, quando o mestre marca. No clã de NPC, o respeito de cada membro sem cargo fica dentro do clã (como o de
--    quem tem cargo).
-- 2) As perícias das unidades das tropas (a chave "per" de cada unidade, de 1 a 10) são do mestre; quando ele liga a
--    chave "Os jogadores distribuem os pontos das perícias" (nas tabelas base das Fichas: fichas:cfg → v.tropas.perJog), o
--    dono do personagem também muda os pontos. A tranca da tropa (privado.tropas_guarda, da 0029) passa a conferir isso.
-- Rodar uma vez no SQL Editor, depois da 0033. Pode rodar mais de uma vez.

-- 1) O que a mesa vê de um clã: a 0018 com a parte "membros" ---------------------------------------------------------
create or replace function privado.cla_pub(p_mesa uuid, p_id text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_partes constant text[] := array['cargos', 'construcoes', 'recursos', 'respeito', 'relacoes', 'hist', 'membros'];
  v_d jsonb; v_apagado boolean; v_jog boolean; v_ver jsonb; v_pub jsonb; v_vistos jsonb; v_lista jsonb; v_k text; v_parte boolean;
begin
  select d.dados, d.apagado into v_d, v_apagado from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:c:' || p_id;
  if not found or not privado.cla_visivel(v_d, v_apagado) then
    if exists (select 1 from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:pub:' || p_id and (not d.apagado or d.dados <> '{"v":1,"oculto":true}'::jsonb)) then
      perform set_config('tinycats.cla', 'sim', true);
      update public.documentos d set dados = '{"v":1,"oculto":true}'::jsonb, apagado = true where d.mesa_id = p_mesa and d.id = 'cla:pub:' || p_id;
      perform set_config('tinycats.cla', '', true);
    end if;
    return;
  end if;
  v_jog := coalesce((v_d -> 'jogadores') = 'true'::jsonb, false);
  v_ver := case when jsonb_typeof(v_d -> 'ver') = 'object' then v_d -> 'ver' else '{}'::jsonb end;
  select coalesce(jsonb_object_agg(substr(d.id, 7), jsonb_build_object('nome', coalesce(d.dados -> 'nome', '""'::jsonb), 'cor', coalesce(d.dados #> '{brasao,cores,0}', 'null'::jsonb))), '{}'::jsonb)
    into v_vistos
    from public.documentos d where d.mesa_id = p_mesa and d.id like 'cla:c:%' and privado.cla_visivel(d.dados, d.apagado);
  v_pub := jsonb_build_object('v', 1, 'id', p_id, 'jogadores', v_jog, 'nome', coalesce(v_d -> 'nome', '""'::jsonb), 'lema', coalesce(v_d -> 'lema', '""'::jsonb),
    'brasao', coalesce(v_d -> 'brasao', 'null'::jsonb), 'faccao', coalesce(v_d -> 'faccao', 'null'::jsonb), 'ordem', coalesce(v_d -> 'ordem', '0'::jsonb), 'ver', '{}'::jsonb);
  foreach v_k in array v_partes loop
    v_parte := v_jog or coalesce((v_ver -> v_k) = 'true'::jsonb, false);
    v_pub := jsonb_set(v_pub, array['ver', v_k], to_jsonb(v_parte), true);
    if v_parte and v_d ? v_k then v_pub := v_pub || jsonb_build_object(v_k, v_d -> v_k); end if;
  end loop;
  if jsonb_typeof(v_pub -> 'relacoes') = 'array' then
    select coalesce(jsonb_agg(case when x.r ->> 'tipo' = 'cla'
                                   then x.r || jsonb_build_object('nome', coalesce(v_vistos #> array[x.r ->> 'alvo', 'nome'], '""'::jsonb), 'cor', coalesce(v_vistos #> array[x.r ->> 'alvo', 'cor'], 'null'::jsonb))
                                   else x.r end order by x.o), '[]'::jsonb)
      into v_lista
      from jsonb_array_elements(v_pub -> 'relacoes') with ordinality x(r, o)
     where jsonb_typeof(x.r) = 'object' and (x.r ->> 'tipo' is distinct from 'cla' or coalesce(v_vistos ? (x.r ->> 'alvo'), false));
    v_pub := jsonb_set(v_pub, '{relacoes}', v_lista);
  end if;
  if jsonb_typeof(v_pub -> 'hist') = 'array' then
    select coalesce(jsonb_agg(x.e order by x.o), '[]'::jsonb) into v_lista
      from jsonb_array_elements(v_pub -> 'hist') with ordinality x(e, o)
     where jsonb_typeof(x.e) = 'object'
       and coalesce(case x.e ->> 'tipo'
             when 'rec' then (v_pub #> '{ver,recursos}') = 'true'::jsonb
             when 'cons' then (v_pub #> '{ver,construcoes}') = 'true'::jsonb
             when 'resp' then (v_pub #> '{ver,respeito}') = 'true'::jsonb
             when 'rel' then (v_pub #> '{ver,relacoes}') = 'true'::jsonb and (x.e ->> 'alvoTipo' is distinct from 'cla' or v_vistos ? (x.e ->> 'alvo'))
             when 'cargo' then (v_pub #> '{ver,cargos}') = 'true'::jsonb
             when 'membro' then v_jog
             else true end, false);
    v_pub := jsonb_set(v_pub, '{hist}', v_lista);
  end if;
  if not v_jog and jsonb_typeof(v_pub -> 'cargos') = 'object' then
    select coalesce(jsonb_object_agg(c.key,
             case when jsonb_typeof(c.value) = 'object' and jsonb_typeof(c.value -> 'gente') = 'array'
                  then jsonb_set(c.value, '{gente}', (select coalesce(jsonb_agg(case when jsonb_typeof(g.p) = 'object' then g.p - 'resp' else g.p end order by g.o), '[]'::jsonb)
                                                       from jsonb_array_elements(c.value -> 'gente') with ordinality g(p, o)))
                  else c.value end), '{}'::jsonb)
      into v_lista
      from jsonb_each(v_pub -> 'cargos') c;
    v_pub := jsonb_set(v_pub, '{cargos}', v_lista);
  end if;
  -- (lote 56) sem os cargos, as pessoas deles vão na lista de membros (o nome e a ficha, sem o cargo e sem o respeito)
  if (v_pub #> '{ver,membros}') = 'true'::jsonb and (v_pub #> '{ver,cargos}') is distinct from 'true'::jsonb and jsonb_typeof(v_d -> 'cargos') = 'object' then
    if jsonb_typeof(v_pub -> 'membros') is distinct from 'object' then v_pub := jsonb_set(v_pub, '{membros}', '{}'::jsonb, true); end if;
    v_pub := jsonb_set(v_pub, '{membros,gente}', (
      select coalesce(jsonb_agg(jsonb_build_object('id', g.p -> 'id', 'pc', g.p -> 'pc', 'nome', g.p -> 'nome') order by length(c.key), c.key, g.o), '[]'::jsonb)
        from jsonb_each(v_d -> 'cargos') c
       cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value -> 'gente') = 'array' then c.value -> 'gente' else '[]'::jsonb end) with ordinality g(p, o)
       where jsonb_typeof(g.p) = 'object'), true);
  end if;
  -- (lote 56) no clã de NPC, o respeito de quem não tem cargo também fica de fora
  if not v_jog and jsonb_typeof(v_pub -> 'membros') = 'object' and jsonb_typeof(v_pub #> '{membros,avulsos}') = 'array' then
    v_pub := jsonb_set(v_pub, '{membros,avulsos}', (select coalesce(jsonb_agg(case when jsonb_typeof(g.p) = 'object' then g.p - 'resp' else g.p end order by g.o), '[]'::jsonb)
                                                    from jsonb_array_elements(v_pub #> '{membros,avulsos}') with ordinality g(p, o)));
  end if;
  perform set_config('tinycats.cla', 'sim', true);
  insert into public.documentos as d (mesa_id, id, vis, dados)
  values (p_mesa, 'cla:pub:' || p_id, 'mesa', v_pub)
  on conflict (mesa_id, id) do update set dados = excluded.dados, apagado = false, vis = 'mesa', dono_id = null
   where d.dados is distinct from excluded.dados or d.apagado or d.vis <> 'mesa' or d.dono_id is not null;
  perform set_config('tinycats.cla', '', true);
end $function$;
revoke all on function privado.cla_pub(uuid, text) from public, anon, authenticated;

-- (os clãs que já existem: o que a mesa vê deles é montado de novo, com a parte nova)
do $$
declare r record;
begin
  for r in select d.mesa_id, substr(d.id, 7) as id from public.documentos d where d.id like 'cla:c:%' loop
    perform privado.cla_pub(r.mesa_id, r.id);
  end loop;
end $$;

-- 2) A tranca da tropa com as perícias -------------------------------------------------------------------------------
-- a tropa sem as perícias de cada unidade (para comparar quando o mestre deixa os jogadores distribuírem os pontos)
create or replace function privado.tropas_sem_per(d jsonb)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select case when jsonb_typeof(d -> 'unid') = 'array'
              then d || jsonb_build_object('unid', (select coalesce(jsonb_agg(case when jsonb_typeof(u) = 'object' then u - 'per' else u end order by ord), '[]'::jsonb)
                                                    from jsonb_array_elements(d -> 'unid') with ordinality as t(u, ord)))
              else d end
$function$;
revoke all on function privado.tropas_sem_per(jsonb) from public, anon, authenticated;

create or replace function privado.tropas_guarda()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_perjog boolean;
begin
  if new.vis is distinct from 'mestre' then
    raise exception 'A tropa fica só com o dono do personagem e com quem mestra (nunca com a mesa toda).';
  end if;
  if (select auth.uid()) is null or privado.mestra_doc(new.mesa_id, new.id) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Só o mestre dá tropas a um personagem.';
  end if;
  if old.dono_id is distinct from (select auth.uid()) then
    raise exception 'Só o mestre e o dono do personagem mudam a tropa.';
  end if;
  -- (lote 56) com a chave do mestre ligada, os pontos das perícias também são do jogador
  select coalesce((c.dados #> '{v,tropas,perJog}') = 'true'::jsonb, false) into v_perjog
    from public.documentos c where c.mesa_id = new.mesa_id and c.id = 'fichas:cfg' and not c.apagado;
  if coalesce(v_perjog, false) then
    if privado.tropas_sem_per(privado.tropas_mestre(new.dados)) is distinct from privado.tropas_sem_per(privado.tropas_mestre(old.dados)) then
      raise exception 'Só o mestre muda os números das tropas.';
    end if;
  elsif privado.tropas_mestre(new.dados) is distinct from privado.tropas_mestre(old.dados) then
    raise exception 'Só o mestre muda os números das tropas.';
  end if;
  return new;
end $function$;
revoke all on function privado.tropas_guarda() from public, anon, authenticated;
