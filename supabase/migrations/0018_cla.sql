-- LOTE 6, PARTE 7b (CLÃ): a aba Clã — os clãs da mesa (o dos jogadores e os de NPC: rivais, aliados), com a árvore de
-- cargos, as construções, os recursos, o respeito no mundo, as relações com as facções e com os outros clãs, o
-- respeito de cada membro dentro do clã e o histórico.
-- Os documentos da mesa (os clãs valem para a mesa toda, sem campanha):
--   · cla:c:<id> — o clã inteiro: só quem mestra o Clã lê e escreve;
--   · cla:pub:<id> — o que a mesa vê dele, montado pelo próprio banco a cada mudança no clã: o clã dos jogadores vai
--     inteiro; o de NPC, só as partes que o mestre marcou (o resto nem chega aos aparelhos dos jogadores);
--   · cla:nomes — os nomes dos níveis das três escalas, de −5 a +5 (a mesa toda lê; quem mestra escreve).
-- 1) Os documentos cla:* são da aba Clã (o mestre auxiliar com a aba liberada mestra o Clã).
-- 2) A aba Clã entre as que o mestre libera para o mestre auxiliar.
-- 3) O que a mesa vê de cada clã, montado aqui.
-- 4) O líder do clã dos jogadores (o dono do personagem que ocupa o cargo de líder) cria, renomeia, move e preenche
--    os outros cargos, por uma função daqui — o cargo de líder e o respeito de cada um continuam com o mestre.
-- 5) (arrumação) privado.medit_achados, da 0017, só é chamada pelas funções da Meditação.
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

-- 1) A aba de cada documento ---------------------------------------------------------------------------------------
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
    when id like 'jornal:%' then 'jornal'
    when id like 'medit:%' then 'meditacao'
    when id like 'cla:%' then 'cla'
    else null end;
$function$;

-- 2) A aba Clã nas permissões do mestre auxiliar ---------------------------------------------------------------------
alter table public.mesa_membros drop constraint if exists mesa_membros_abas_check;
alter table public.mesa_membros add constraint mesa_membros_abas_check
  check (abas <@ array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao', 'cla']::text[]);

create or replace function public.definir_auxiliar(p_mesa uuid, p_usuario uuid, p_auxiliar boolean, p_abas text[] default null)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_todas constant text[] := array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao', 'cla'];
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
revoke all on function public.definir_auxiliar(uuid, uuid, boolean, text[]) from public, anon;
grant execute on function public.definir_auxiliar(uuid, uuid, boolean, text[]) to authenticated;

-- 3) O que a mesa vê de cada clã -------------------------------------------------------------------------------------
-- (apoio) o clã está à vista dos jogadores: é o clã dos jogadores, ou o mestre o mostra — e não foi apagado
create or replace function privado.cla_visivel(d jsonb, apagado boolean)
returns boolean language sql immutable set search_path to '' as $function$
  select not coalesce(apagado, false) and coalesce(jsonb_typeof(d) = 'object' and ((d -> 'jogadores') = 'true'::jsonb or (d #> '{ver,mostrar}') = 'true'::jsonb), false);
$function$;

/* Monta cla:pub:<id> a partir de cla:c:<id>. O clã que os jogadores não veem: o documento fica apagado e vazio.
   O que vai: o nome, o lema, o brasão, a facção, a ordem, se é o clã dos jogadores e que partes eles veem (ver); e as
   partes — o clã dos jogadores, todas; o de NPC, as que o mestre marcou. Por cima disso:
     · as relações com um clã que os jogadores não veem ficam de fora (as outras levam o nome e a cor desse clã);
     · o histórico só fala das partes que vão (e não das relações com um clã escondido);
     · no clã de NPC, o respeito de cada membro fica dentro do clã (nem nos cargos, nem no histórico). */
create or replace function privado.cla_pub(p_mesa uuid, p_id text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_partes constant text[] := array['cargos', 'construcoes', 'recursos', 'respeito', 'relacoes', 'hist'];
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
  -- os clãs que os jogadores veem (para as relações e o histórico): id → o nome e a cor
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
  perform set_config('tinycats.cla', 'sim', true);
  insert into public.documentos as d (mesa_id, id, vis, dados)
  values (p_mesa, 'cla:pub:' || p_id, 'mesa', v_pub)
  on conflict (mesa_id, id) do update set dados = excluded.dados, apagado = false, vis = 'mesa', dono_id = null
   where d.dados is distinct from excluded.dados or d.apagado or d.vis <> 'mesa' or d.dono_id is not null;
  perform set_config('tinycats.cla', '', true);
end $function$;

-- A cada mudança num clã, o que a mesa vê dele é montado de novo. Os clãs que têm relação com ele (ou que falam dele
-- no histórico) mostram o nome e a cor dele, e só enquanto os jogadores o veem: quando isso muda, são montados de novo.
create or replace function privado.cla_projetar()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_id text := substr(new.id, 7);
  v_agora boolean := privado.cla_visivel(new.dados, new.apagado);
  v_muda boolean := true;
  v_outro text;
begin
  perform privado.cla_pub(new.mesa_id, v_id);
  if tg_op = 'UPDATE' then
    v_muda := v_agora is distinct from privado.cla_visivel(old.dados, old.apagado)
      or (v_agora and ((new.dados -> 'nome') is distinct from (old.dados -> 'nome') or (new.dados #> '{brasao,cores,0}') is distinct from (old.dados #> '{brasao,cores,0}')));
  end if;
  if v_muda then
    for v_outro in
      select substr(d.id, 7) from public.documentos d
       where d.mesa_id = new.mesa_id and d.id like 'cla:c:%' and d.id <> new.id
         and ((jsonb_typeof(d.dados -> 'relacoes') = 'array' and (d.dados -> 'relacoes') @> jsonb_build_array(jsonb_build_object('tipo', 'cla', 'alvo', v_id)))
              or (jsonb_typeof(d.dados -> 'hist') = 'array' and (d.dados -> 'hist') @> jsonb_build_array(jsonb_build_object('alvoTipo', 'cla', 'alvo', v_id))))
    loop
      perform privado.cla_pub(new.mesa_id, v_outro);
    end loop;
  end if;
  return null;
end $function$;

-- O que a mesa vê de um clã só o banco escreve (acima); o clã inteiro fica só com quem mestra (sem dono, para o mestre).
create or replace function privado.cla_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id like 'cla:pub:%' then
    if (select auth.uid()) is not null and coalesce(current_setting('tinycats.cla', true), '') <> 'sim' then
      raise exception 'O que a mesa vê de um clã é o próprio banco que monta, a partir do clã.';
    end if;
  elsif new.id like 'cla:c:%' and (new.vis is distinct from 'mestre' or new.dono_id is not null) then
    raise exception 'O clã inteiro fica só com quem mestra o Clã (a mesa vê a parte que o mestre mostra).';
  end if;
  return new;
end $function$;

revoke all on function privado.cla_visivel(jsonb, boolean), privado.cla_pub(uuid, text), privado.cla_projetar(), privado.cla_guarda() from public, anon, authenticated;
drop trigger if exists documentos_cla_guarda on public.documentos;
create trigger documentos_cla_guarda before insert or update on public.documentos for each row execute function privado.cla_guarda();
drop trigger if exists documentos_cla_projetar on public.documentos;
create trigger documentos_cla_projetar after insert or update on public.documentos for each row when (new.id like 'cla:c:%') execute function privado.cla_projetar();

-- 4) O líder mexe nos cargos -----------------------------------------------------------------------------------------
/* p_mudar: { <id do cargo>: { nome, pai, ordem, gente: [{ id, pc, nome }] } | null (apagar) } — só os cargos que
   mudaram. Quem pode: o dono do personagem que ocupa o cargo de líder do clã dos jogadores (ou quem mestra o Clã).
   O cargo de líder não muda por aqui, e o respeito de cada pessoa é o que já estava (uma pessoa nova começa no 0; quem
   sai dos cargos tem o respeito guardado em respGuardado — se voltar, com o líder desfazendo, volta com ele).
   No fim, a árvore precisa continuar inteira: cada cargo pendurado num que existe, subindo até o líder, e ninguém
   repetido. A mudança vai para o histórico do clã, com o texto que a página manda (p_txt). */
create or replace function public.cla_cargos(p_mesa uuid, p_cla text, p_mudar jsonb, p_txt text default '')
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_doc jsonb; v_cargos jsonb; v_resp jsonb; v_guardado jsonb; v_quem text; v_txt text;
  v_k text; v_v jsonb; v_p jsonb; v_gente jsonb; v_pid text; v_pai text; v_passos integer; v_n integer; v_u integer;
  v_em text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if p_cla is null or p_cla !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Esse clã não existe.'; end if;
  if jsonb_typeof(p_mudar) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_mudar)) > 120 then raise exception 'Pedido desconhecido.'; end if;
  select d.dados into v_doc from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:c:' || p_cla and not d.apagado for update;
  if not found then raise exception 'Esse clã não existe mais.'; end if;
  v_doc := case when jsonb_typeof(v_doc) = 'object' then v_doc else '{}'::jsonb end;
  v_cargos := case when jsonb_typeof(v_doc -> 'cargos') = 'object' then v_doc -> 'cargos' else '{}'::jsonb end;
  if privado.mestra(p_mesa, 'cla') then
    v_quem := 'Quem mestra';
  else
    if (v_doc -> 'jogadores') is distinct from 'true'::jsonb then raise exception 'Só o clã dos jogadores tem um líder que mexe nos cargos.'; end if;
    select pe.nome into v_quem from public.personagens pe
     where pe.mesa_id = p_mesa and pe.id = (v_cargos #>> '{lider,gente,0,pc}') and not pe.apagado and pe.dono_id = v_uid;
    if not found then raise exception 'Só quem ocupa o cargo de líder do clã (ou quem mestra o Clã) mexe nos cargos.'; end if;
    v_quem := coalesce(nullif(btrim(v_quem), ''), 'O líder') || ' (líder)';
  end if;
  -- o respeito de cada pessoa, como está agora
  select coalesce(jsonb_object_agg(x.id, x.resp), '{}'::jsonb) into v_resp
    from (select g.p ->> 'id' as id, g.p -> 'resp' as resp
            from jsonb_each(v_cargos) c
           cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value -> 'gente') = 'array' then c.value -> 'gente' else '[]'::jsonb end) g(p)
           where jsonb_typeof(g.p) = 'object' and coalesce(g.p ->> 'id', '') <> '' and jsonb_typeof(g.p -> 'resp') = 'number') x;
  -- (e o de quem já tinha saído dos cargos: vale o de agora, se a pessoa está num cargo)
  v_resp := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(case when jsonb_typeof(v_doc -> 'respGuardado') = 'object' then v_doc -> 'respGuardado' else '{}'::jsonb end) e
                       where e.key ~ '^[A-Za-z0-9_-]{1,40}$' and jsonb_typeof(e.value) = 'number'), '{}'::jsonb) || v_resp;
  for v_k, v_v in select e.key, e.value from jsonb_each(p_mudar) e loop
    if v_k = 'lider' then raise exception 'O cargo de líder só quem mestra o Clã muda.'; end if;
    if v_k !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Há um cargo que não existe.'; end if;
    if jsonb_typeof(v_v) = 'null' then
      v_cargos := v_cargos - v_k;
    elsif jsonb_typeof(v_v) = 'object' then
      v_gente := '[]'::jsonb;
      for v_p in select e from jsonb_array_elements(case when jsonb_typeof(v_v -> 'gente') = 'array' then v_v -> 'gente' else '[]'::jsonb end) e loop
        v_pid := case when jsonb_typeof(v_p) = 'object' then v_p ->> 'id' end;
        if coalesce(v_pid, '') !~ '^[A-Za-z0-9_-]{1,40}$' then raise exception 'Há uma pessoa sem identificação nos cargos.'; end if;
        v_p := jsonb_build_object('id', v_pid,
          'pc', case when coalesce(v_p ->> 'pc', '') ~ '^[^:@[:space:]]{1,64}$' then to_jsonb(v_p ->> 'pc') else 'null'::jsonb end,
          'nome', to_jsonb(left(btrim(regexp_replace(coalesce(v_p ->> 'nome', ''), '[[:space:]]+', ' ', 'g')), 60)),
          'resp', coalesce(v_resp -> v_pid, '0'::jsonb));
        if (v_p -> 'pc') = 'null'::jsonb and (v_p ->> 'nome') = '' then raise exception 'Toda pessoa num cargo precisa de um nome (ou de um personagem).'; end if;
        v_gente := v_gente || jsonb_build_array(v_p);
      end loop;
      if jsonb_array_length(v_gente) > 30 then raise exception 'São no máximo 30 pessoas num cargo.'; end if;
      v_cargos := jsonb_set(v_cargos, array[v_k], jsonb_build_object(
        'nome', to_jsonb(left(btrim(regexp_replace(coalesce(v_v ->> 'nome', ''), '[[:space:]]+', ' ', 'g')), 60)),
        'pai', coalesce(to_jsonb(v_v ->> 'pai'), 'null'::jsonb),
        'ordem', to_jsonb(case when jsonb_typeof(v_v -> 'ordem') = 'number' then greatest(0, least(100000, floor((v_v ->> 'ordem')::numeric)))::integer else 0 end),
        'gente', v_gente), true);
      if (v_cargos -> v_k ->> 'nome') = '' then raise exception 'Todo cargo precisa de um nome.'; end if;
    else
      raise exception 'Pedido desconhecido.';
    end if;
  end loop;
  -- a árvore continua inteira: o líder no alto, cada cargo pendurado num que existe, subindo até ele
  if jsonb_typeof(v_cargos -> 'lider') is distinct from 'object' then raise exception 'O clã está sem o cargo de líder: fale com o mestre.'; end if;
  select count(*) into v_n from jsonb_object_keys(v_cargos);
  if v_n > 61 then raise exception 'São no máximo 60 cargos abaixo do líder.'; end if;
  for v_k in select jsonb_object_keys(v_cargos) loop
    continue when v_k = 'lider';
    v_pai := v_cargos -> v_k ->> 'pai'; v_passos := 0;
    while v_pai is distinct from 'lider' loop
      v_passos := v_passos + 1;
      if v_pai is null or not (v_cargos ? v_pai) or v_passos > 61 then raise exception 'Os cargos ficaram sem ligação com o líder. Tente de novo.'; end if;
      v_pai := v_cargos -> v_pai ->> 'pai';
    end loop;
  end loop;
  select count(*), count(distinct g.p ->> 'id') into v_n, v_u
    from jsonb_each(v_cargos) c
   cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value -> 'gente') = 'array' then c.value -> 'gente' else '[]'::jsonb end) g(p);
  if v_n <> v_u then raise exception 'A mesma pessoa aparece duas vezes nos cargos.'; end if;
  if v_n > 400 then raise exception 'Gente demais nos cargos.'; end if;
  -- quem não está mais nos cargos: o respeito fica guardado (no máximo 300 pessoas)
  select coalesce(jsonb_object_agg(x.key, x.value), '{}'::jsonb) into v_guardado
    from (select e.key, e.value from jsonb_each(v_resp) e
           where not exists (select 1 from jsonb_each(v_cargos) c
                              cross join lateral jsonb_array_elements(case when jsonb_typeof(c.value -> 'gente') = 'array' then c.value -> 'gente' else '[]'::jsonb end) g(p)
                              where g.p ->> 'id' = e.key)
           order by e.key limit 300) x;
  v_txt := rtrim(btrim(regexp_replace(coalesce(p_txt, ''), '[[:space:]]+', ' ', 'g')), '.');
  -- (privado.medit_lista, da 0017: uma lista cortada nos primeiros n itens)
  update public.documentos d
     set dados = jsonb_set(jsonb_set(jsonb_set(v_doc, '{cargos}', v_cargos, true), '{hist}',
           privado.medit_lista(jsonb_build_array(jsonb_build_object('em', v_em, 'tipo', 'cargo', 'txt', left(v_quem || ': ' || coalesce(nullif(v_txt, ''), 'mudou os cargos') || '.', 300)))
             || privado.medit_lista(v_doc -> 'hist', 299), 300), true), '{respGuardado}', v_guardado, true)
   where d.mesa_id = p_mesa and d.id = 'cla:c:' || p_cla;
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.cla_cargos(uuid, text, jsonb, text) from public, anon;
grant execute on function public.cla_cargos(uuid, text, jsonb, text) to authenticated;

-- 5) (arrumação) ---------------------------------------------------------------------------------------------------
-- privado.medit_achados cria documentos com o dono que recebe: só as funções da Meditação (que rodam como dono do
-- banco) a chamam — quem entra no site não precisa dela.
revoke execute on function privado.medit_achados(uuid, text, uuid) from authenticated;
