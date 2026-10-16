-- LOTE 6, PARTE 7a (MEDITAÇÃO): a aba Meditação — o lugar onde os personagens meditam, a prática de cada um, os
-- pilares de símbolos com as receitas do mestre e as barras de treinamento.
-- Os documentos da mesa:
--   · medit:cena — o lugar (ambiente, hora, clima, a imagem do mestre): a mesa toda lê; quem mestra escreve;
--   · medit:quem — quem está meditando agora: a mesa toda lê; quem escreve é a função de entrar e sair (abaixo);
--   · medit:simbolos — os símbolos que o mestre escondeu e os que ele criou: a mesa toda lê;
--   · medit:receitas — as receitas dos pilares: só quem mestra a Meditação;
--   · medit:treino — as barras de treinamento: só quem mestra a Meditação;
--   · medit:pratica:<personagem> — a prática de um personagem (objeto, mantra, representação, imagem): o dono do
--     personagem escreve; só ele e quem mestra veem;
--   · medit:achados:<personagem> — as tentativas liberadas e feitas, as receitas descobertas e o registro das
--     meditações: só o dono do personagem e quem mestra veem. Quem escreve são as funções abaixo (e quem mestra, para
--     corrigir): o jogador não muda o que descobriu nem as tentativas que tem.
-- 1) Os documentos medit:* são da aba Meditação (o mestre auxiliar com a aba liberada mestra a Meditação).
-- 2) O jogador cria a prática de um personagem dele (só para o mestre ver, com ele como dono).
-- 3) A aba Meditação entre as que o mestre libera para o mestre auxiliar.
-- 4) As funções da meditação: entrar e sair (o dono do personagem, ou quem mestra), liberar uma tentativa (quem
--    mestra) e tentar os pilares (o dono: a combinação é conferida aqui, nas receitas, que ele não lê). A receita
--    descoberta vira um aviso na mesa ao vivo, em segredo, do jogador para o mestre da mesa (só os dois veem).
-- 5) A mesa ao vivo aceita o que vem da Meditação.
-- 6) A prática e o que a meditação guardou de um personagem passam ao novo dono quando o personagem muda de dono.
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
    else null end;
$function$;

-- 2) O jogador cria a prática de um personagem dele -------------------------------------------------------------------
create or replace function privado.dono_do_personagem(m uuid, p text)
returns uuid language sql stable security definer set search_path to '' as $function$
  select pe.dono_id from public.personagens pe where pe.mesa_id = m and pe.id = p and not pe.apagado;
$function$;
revoke all on function privado.dono_do_personagem(uuid, text) from public, anon;
grant execute on function privado.dono_do_personagem(uuid, text) to authenticated;

alter policy documentos_criar on public.documentos
  with check (
    privado.doc_aberto(mesa_id, id)
    and (privado.mestra_doc(mesa_id, id)
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado
             and (id = 'cena:pedido:' || (select auth.uid())::text
                  or (id = 'jornal:cartas:' || (select auth.uid())::text and vis = 'mestre')
                  or (id like 'medit:pratica:%' and vis = 'mestre'
                      and privado.dono_do_personagem(mesa_id, substr(id, 15)) = (select auth.uid())))))
  );

-- O que foi descoberto na meditação (medit:achados) só muda pelas funções da meditação ou por quem mestra a aba.
create or replace function privado.medit_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if (select auth.uid()) is null or old.id not like 'medit:achados:%' or privado.mestra_doc(old.mesa_id, old.id)
     or coalesce(current_setting('tinycats.meditacao', true), '') = 'sim' then
    return new;
  end if;
  raise exception 'O que a meditação guardou (tentativas e receitas descobertas) só muda pela própria meditação ou pelo mestre.';
end $function$;
revoke all on function privado.medit_guarda() from public;
drop trigger if exists documentos_medit_guarda on public.documentos;
create trigger documentos_medit_guarda before update on public.documentos for each row execute function privado.medit_guarda();

-- 3) A aba Meditação nas permissões do mestre auxiliar ---------------------------------------------------------------
alter table public.mesa_membros drop constraint if exists mesa_membros_abas_check;
alter table public.mesa_membros add constraint mesa_membros_abas_check
  check (abas <@ array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao']::text[]);

create or replace function public.definir_auxiliar(p_mesa uuid, p_usuario uuid, p_auxiliar boolean, p_abas text[] default null)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_todas constant text[] := array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao'];
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

-- 4) As funções da meditação ------------------------------------------------------------------------------------------
-- (apoio) um número inteiro de dentro do documento, ou 0
create or replace function privado.medit_int(v jsonb)
returns integer language sql immutable set search_path to '' as $function$
  select case when jsonb_typeof(v) = 'number' then greatest(0, least(100000, floor((v #>> '{}')::numeric)))::integer else 0 end;
$function$;
-- (apoio) uma lista de dentro do documento (ou vazia), cortada nos primeiros n itens
create or replace function privado.medit_lista(v jsonb, n integer)
returns jsonb language sql immutable set search_path to '' as $function$
  select coalesce((select jsonb_agg(t.e order by t.o) from jsonb_array_elements(case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end) with ordinality as t(e, o) where t.o <= n), '[]'::jsonb);
$function$;
-- (apoio) o lugar da cena como a página o mostra: o ambiente, a hora e o clima conhecidos (o que não é: o de começo,
-- o templo ao pôr do sol, sem clima)
create or replace function privado.medit_lugar(v jsonb)
returns jsonb language sql immutable set search_path to '' as $function$
  select jsonb_build_object(
    'amb', case when v ->> 'amb' in ('templo', 'montanha', 'floresta', 'cachoeira', 'caverna', 'jardim', 'deserto', 'ceu') then v ->> 'amb' else 'templo' end,
    'hora', case when v ->> 'hora' in ('manha', 'tarde', 'por', 'noite', 'madrugada') then v ->> 'hora' else 'por' end,
    'clima', case when v ->> 'clima' in ('sol', 'nublado', 'chuva', 'tempestade', 'neve', 'nevoa', 'vento', 'calor', 'frio') then v ->> 'clima' else '' end);
$function$;
-- (apoio) o documento do que a meditação guardou de um personagem, preso para mudar (criado se ainda não existe)
create or replace function privado.medit_achados(p_mesa uuid, p_pc text, p_dono uuid)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v jsonb;
begin
  select d.dados into v from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:achados:' || p_pc for update;
  if not found then
    insert into public.documentos (mesa_id, id, dono_id, vis, dados)
    values (p_mesa, 'medit:achados:' || p_pc, p_dono, 'mestre', '{"v":1,"lib":0,"feitas":0,"achadas":[],"reg":[]}'::jsonb)
    on conflict (mesa_id, id) do nothing;
    select d.dados into v from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:achados:' || p_pc for update;
  end if;
  return case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end;
end $function$;
revoke all on function privado.medit_int(jsonb), privado.medit_lista(jsonb, integer), privado.medit_lugar(jsonb), privado.medit_achados(uuid, text, uuid) from public, anon;
grant execute on function privado.medit_int(jsonb), privado.medit_lista(jsonb, integer), privado.medit_lugar(jsonb), privado.medit_achados(uuid, text, uuid) to authenticated;

-- Entrar na meditação (ou sair): o dono do personagem, ou quem mestra a Meditação. Quem está meditando fica em
-- medit:quem (que a mesa toda lê; só esta função escreve, e o lugar, em medit:cena, quem mestra muda à vontade sem
-- atropelar quem entra no mesmo instante); ao entrar, o registro do personagem guarda o lugar, a hora e o clima.
create or replace function public.meditacao_entrar(p_mesa uuid, p_pc text, p_entrar boolean)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_pc public.personagens;
  v_lugar jsonb; v_doc jsonb; v_quem jsonb; v_tem boolean; v_ach jsonb;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado;
  if not found then raise exception 'Esse personagem não está nesta mesa.'; end if;
  if not (privado.mestra(p_mesa, 'meditacao') or v_pc.dono_id = v_uid) then
    raise exception 'Só o dono do personagem (ou quem mestra a Meditação) o põe para meditar.';
  end if;
  if not privado.campanha_aberta(p_mesa, v_pc.campanha) then raise exception 'A campanha desse personagem está encerrada.'; end if;
  perform set_config('tinycats.meditacao', 'sim', true);
  select d.dados into v_doc from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:quem' for update;
  if not found then
    insert into public.documentos (mesa_id, id, vis, dados) values (p_mesa, 'medit:quem', 'mesa', '{"v":1,"quem":[]}'::jsonb) on conflict (mesa_id, id) do nothing;
    select d.dados into v_doc from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:quem' for update;
  end if;
  v_doc := case when jsonb_typeof(v_doc) = 'object' then v_doc else '{}'::jsonb end;
  v_quem := case when jsonb_typeof(v_doc -> 'quem') = 'array' then v_doc -> 'quem' else '[]'::jsonb end;
  v_tem := v_quem @> to_jsonb(p_pc);
  if coalesce(p_entrar, false) then
    if not v_tem then
      if jsonb_array_length(v_quem) >= 40 then raise exception 'Já há gente demais meditando nesta cena.'; end if;
      v_quem := v_quem || jsonb_build_array(p_pc);
    end if;
  else
    v_quem := coalesce((select jsonb_agg(e) from jsonb_array_elements(v_quem) e where e <> to_jsonb(p_pc)), '[]'::jsonb);
  end if;
  update public.documentos d set dados = jsonb_set(v_doc, '{quem}', v_quem, true), apagado = false where d.mesa_id = p_mesa and d.id = 'medit:quem';
  if coalesce(p_entrar, false) and not v_tem and v_pc.dono_id is not null then
    select privado.medit_lugar(d.dados) into v_lugar from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:cena' and not d.apagado;
    v_lugar := coalesce(v_lugar, privado.medit_lugar(null));
    v_ach := privado.medit_achados(p_mesa, p_pc, v_pc.dono_id);
    update public.documentos d
       set dados = jsonb_set(v_ach, '{reg}', privado.medit_lista(
             jsonb_build_array(jsonb_build_object(
               'em', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'tipo', 'entrou',
               'amb', v_lugar ->> 'amb', 'hora', v_lugar ->> 'hora', 'clima', v_lugar ->> 'clima',
               'por', case when v_pc.dono_id = v_uid then 'dono' else 'mestre' end))
             || privado.medit_lista(v_ach -> 'reg', 200), 200), true), apagado = false
     where d.mesa_id = p_mesa and d.id = 'medit:achados:' || p_pc;
  end if;
  perform set_config('tinycats.meditacao', '', true);           -- (a trava volta a valer no resto da transação)
  return jsonb_build_object('quem', v_quem);
end $function$;
revoke all on function public.meditacao_entrar(uuid, text, boolean) from public, anon;
grant execute on function public.meditacao_entrar(uuid, text, boolean) to authenticated;

-- Liberar (p_mais = 1) ou tirar (p_mais = −1) uma tentativa nos pilares: só quem mestra a Meditação. Nunca abaixo das
-- tentativas já feitas, nem mais de 5 à frente.
create or replace function public.meditacao_liberar(p_mesa uuid, p_pc text, p_mais integer default 1)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_pc public.personagens;
  v_ach jsonb; v_lib integer; v_feitas integer;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.mestra(p_mesa, 'meditacao') then raise exception 'Só quem mestra a Meditação libera a tentativa.'; end if;
  select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado;
  if not found then raise exception 'Esse personagem não está nesta mesa.'; end if;
  if v_pc.dono_id is null then raise exception 'Esse personagem não tem dono: quem tenta os pilares são os personagens dos jogadores.'; end if;
  perform set_config('tinycats.meditacao', 'sim', true);
  v_ach := privado.medit_achados(p_mesa, p_pc, v_pc.dono_id);
  v_feitas := privado.medit_int(v_ach -> 'feitas');
  v_lib := greatest(v_feitas, least(v_feitas + 5, greatest(privado.medit_int(v_ach -> 'lib'), v_feitas) + coalesce(p_mais, 1)));
  update public.documentos d set dados = jsonb_set(jsonb_set(v_ach, '{lib}', to_jsonb(v_lib), true), '{feitas}', to_jsonb(v_feitas), true), apagado = false
   where d.mesa_id = p_mesa and d.id = 'medit:achados:' || p_pc;
  perform set_config('tinycats.meditacao', '', true);
  return jsonb_build_object('lib', v_lib, 'feitas', v_feitas);
end $function$;
revoke all on function public.meditacao_liberar(uuid, text, integer) from public, anon;
grant execute on function public.meditacao_liberar(uuid, text, integer) to authenticated;

-- Tentar os pilares: só o dono do personagem, meditando e com uma tentativa liberada. A combinação (de 2 a 5 símbolos,
-- na ordem) é conferida nas receitas do mestre — a primeira que casa, valendo naquele ambiente e para aquele
-- personagem. A tentativa entra no registro; a receita nova, na lista do personagem, e vira um aviso na mesa ao vivo
-- só para o jogador e o mestre. → { res: 'nada' | 'achou', nova, id, nome, efeito }
create or replace function public.meditacao_tentar(p_mesa uuid, p_pc text, p_seq text[])
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_pc public.personagens;
  v_doc jsonb; v_lugar jsonb; v_rec jsonb; v_r jsonb; v_achou jsonb; v_ach jsonb; v_achadas jsonb;
  v_lib integer; v_feitas integer; v_nova boolean := false;
  v_seq jsonb; v_amb text; v_em text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_mestre uuid;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado;
  if not found then raise exception 'Esse personagem não está nesta mesa.'; end if;
  if v_pc.dono_id is distinct from v_uid then raise exception 'Só o dono do personagem tenta os pilares por ele.'; end if;
  if not privado.campanha_aberta(p_mesa, v_pc.campanha) then raise exception 'A campanha desse personagem está encerrada.'; end if;
  if p_seq is null or coalesce(array_length(p_seq, 1), 0) < 2 or array_length(p_seq, 1) > 5 then raise exception 'Ponha de 2 a 5 símbolos nos pilares.'; end if;
  if exists (select 1 from unnest(p_seq) s where s is null or s !~ '^[A-Za-z0-9_-]{1,40}$') then raise exception 'Há um símbolo que não existe.'; end if;
  select d.dados into v_doc from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:quem' and not d.apagado;
  if not found or jsonb_typeof(v_doc -> 'quem') is distinct from 'array' or not (v_doc -> 'quem' @> to_jsonb(p_pc)) then
    raise exception 'O personagem não está meditando.';
  end if;
  select privado.medit_lugar(d.dados) into v_lugar from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:cena' and not d.apagado;
  v_lugar := coalesce(v_lugar, privado.medit_lugar(null));
  perform set_config('tinycats.meditacao', 'sim', true);
  v_ach := privado.medit_achados(p_mesa, p_pc, v_pc.dono_id);
  v_lib := privado.medit_int(v_ach -> 'lib'); v_feitas := privado.medit_int(v_ach -> 'feitas');
  if v_lib <= v_feitas then raise exception 'O mestre ainda não liberou uma tentativa.'; end if;
  v_seq := to_jsonb(p_seq);
  v_amb := v_lugar ->> 'amb';
  select d.dados into v_rec from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:receitas' and not d.apagado;
  for v_r in select e from jsonb_array_elements(case when jsonb_typeof(v_rec -> 'lista') = 'array' then v_rec -> 'lista' else '[]'::jsonb end) e loop
    if jsonb_typeof(v_r) = 'object' and (v_r -> 'seq') = v_seq and coalesce(v_r ->> 'id', '') <> ''
       and (coalesce(v_r ->> 'onde', '') = '' or v_r ->> 'onde' = v_amb)
       and (coalesce(jsonb_typeof(v_r -> 'quem'), 'null') <> 'array' or jsonb_array_length(v_r -> 'quem') = 0 or (v_r -> 'quem') @> to_jsonb(p_pc)) then
      v_achou := v_r;
      exit;
    end if;
  end loop;
  v_achadas := privado.medit_lista(v_ach -> 'achadas', 500);
  if v_achou is not null and not exists (select 1 from jsonb_array_elements(v_achadas) a where a ->> 'id' = v_achou ->> 'id') then
    v_nova := true;
    v_achadas := v_achadas || jsonb_build_array(jsonb_build_object('id', v_achou ->> 'id', 'nome', left(coalesce(v_achou ->> 'nome', ''), 120),
      'efeito', left(coalesce(v_achou ->> 'efeito', ''), 4000), 'em', v_em, 'amb', v_amb));
  end if;
  update public.documentos d
     set dados = jsonb_set(jsonb_set(jsonb_set(v_ach, '{feitas}', to_jsonb(v_feitas + 1), true), '{achadas}', v_achadas, true), '{reg}', privado.medit_lista(
           jsonb_build_array(jsonb_build_object('em', v_em, 'tipo', 'tentou', 'amb', v_amb, 'hora', v_lugar ->> 'hora', 'clima', v_lugar ->> 'clima',
             'seq', v_seq, 'res', v_achou ->> 'id', 'nome', left(coalesce(v_achou ->> 'nome', ''), 120)))
           || privado.medit_lista(v_ach -> 'reg', 200), 200), true), apagado = false
   where d.mesa_id = p_mesa and d.id = 'medit:achados:' || p_pc;
  -- a receita nova: um aviso na mesa ao vivo, em segredo, do jogador para o mestre da mesa (só os dois veem)
  if v_nova then
    select m.dono_id into v_mestre from public.mesas m where m.id = p_mesa;
    if v_mestre is not null and v_mestre <> v_uid then
      -- (na conversa da campanha do personagem)
      insert into public.registro (mesa_id, id, autor_id, autor_nome, tipo, origem, secreta, para, campanha, dados)
      values (p_mesa, 'md_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20), v_uid, '?', 'rolagem', 'meditacao', true, v_mestre, v_pc.campanha,
        jsonb_build_object('k', 'tabela', 'titulo', left('Receita descoberta: ' || coalesce(v_achou ->> 'nome', ''), 120), 'total', null,
          'resumo', left(coalesce(nullif(v_pc.nome, ''), 'O personagem') || ' descobriu esta receita nos pilares. Ela está na aba Meditação.', 600), 'veredito', null, 'passou', null));
    end if;
  end if;
  perform set_config('tinycats.meditacao', '', true);
  if v_achou is null then return jsonb_build_object('res', 'nada'); end if;
  return jsonb_build_object('res', 'achou', 'nova', v_nova, 'id', v_achou ->> 'id', 'nome', v_achou ->> 'nome', 'efeito', v_achou ->> 'efeito');
end $function$;
revoke all on function public.meditacao_tentar(uuid, text, text[]) from public, anon;
grant execute on function public.meditacao_tentar(uuid, text, text[]) to authenticated;

-- 5) A mesa ao vivo aceita o que vem da Meditação ---------------------------------------------------------------------
alter table public.registro drop constraint if exists registro_origem_check;
alter table public.registro add constraint registro_origem_check
  check (origem in ('mesa', 'rolador', 'ficha', 'cena', 'mundo', 'arvore', 'acampamento', 'meditacao'));

-- 6) A prática e o que a meditação guardou acompanham o dono do personagem ------------------------------------------
-- Quando quem mestra as Fichas entrega o personagem a outra pessoa (ou a alguém, depois de prepará-lo sem dono), os
-- dois documentos dele passam a ser dela: é ela quem escreve a prática, e só ela (e quem mestra) vê os dois.
-- privado.tocar só deixa quem mestra a aba de um documento trocar o dono dele; abre exceção para os documentos medit:*
-- dentro das funções da Meditação (as mesmas que a trava acima deixa passar). O resto dela continua igual.
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
    -- (dentro das funções da Meditação, a prática e o que a meditação guardou de um personagem passam ao novo dono dele:
    --  ver privado.medit_dono, na 0017)
    if v_uid is not null and v_mudou
       and not (tg_table_name = 'documentos' and old.id like 'medit:%' and coalesce(current_setting('tinycats.meditacao', true), '') = 'sim') then
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

create or replace function privado.medit_dono()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.dono_id is distinct from old.dono_id then
    perform set_config('tinycats.meditacao', 'sim', true);
    update public.documentos d set dono_id = new.dono_id
     where d.mesa_id = new.mesa_id and d.id in ('medit:pratica:' || new.id, 'medit:achados:' || new.id)
       and d.dono_id is distinct from new.dono_id;
    perform set_config('tinycats.meditacao', '', true);
  end if;
  return null;
end $function$;
revoke all on function privado.medit_dono() from public;
drop trigger if exists personagens_medit_dono on public.personagens;
create trigger personagens_medit_dono after update of dono_id on public.personagens for each row execute function privado.medit_dono();
