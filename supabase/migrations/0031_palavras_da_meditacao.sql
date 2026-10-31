-- LOTE 45 (AS PALAVRAS DA MEDITAÇÃO): além dos símbolos, os pilares aceitam palavras. Cada personagem tem um
-- dicionário, com as palavras que o mestre deu a ele.
--   · medit:palavras:<personagem> — o dicionário: { lista: [{ id, p (a palavra), k (a chave: sem acento, minúsculas,
--     hífen no lugar do espaço), s (o sentido), n (a nota do mestre), em }] }. Quem mestra a Meditação escreve (e cria,
--     com o dono do personagem como dono do documento e vis 'mestre'); o dono e quem mestra veem. O jogador não muda o
--     dicionário: a nota e a estrela dele em cada palavra moram na prática (medit:pratica, campo pal).
-- 1) A tentativa aceita, em cada pilar, um símbolo ou uma palavra ("w." + a chave); a palavra precisa estar no
--    dicionário do personagem. O resto da conferência é o da 0017.
-- 2) O dicionário só muda pelas mãos de quem mestra a Meditação (a mesma trava de medit:achados).
-- 3) O dicionário acompanha o dono do personagem (como a prática e o que a meditação guardou).
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

-- 1) Tentar os pilares, com palavras ------------------------------------------------------------------------------------
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
  v_mestre uuid; v_pal jsonb;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado;
  if not found then raise exception 'Esse personagem não está nesta mesa.'; end if;
  if v_pc.dono_id is distinct from v_uid then raise exception 'Só o dono do personagem tenta os pilares por ele.'; end if;
  if not privado.campanha_aberta(p_mesa, v_pc.campanha) then raise exception 'A campanha desse personagem está encerrada.'; end if;
  if p_seq is null or coalesce(array_length(p_seq, 1), 0) < 2 or array_length(p_seq, 1) > 5 then raise exception 'Ponha de 2 a 5 símbolos ou palavras nos pilares.'; end if;
  if exists (select 1 from unnest(p_seq) s where s is null or (s !~ '^[A-Za-z0-9_-]{1,40}$' and s !~ '^w\.[a-z0-9-]{1,38}$')) then raise exception 'Há um símbolo que não existe.'; end if;
  -- (lote 45) as palavras: só as que estão no dicionário do personagem (a chave, em medit:palavras:<personagem>)
  if exists (select 1 from unnest(p_seq) s where s like 'w.%') then
    select d.dados into v_pal from public.documentos d where d.mesa_id = p_mesa and d.id = 'medit:palavras:' || p_pc and not d.apagado;
    if exists (select 1 from unnest(p_seq) s where s like 'w.%' and not exists (
         select 1 from jsonb_array_elements(case when jsonb_typeof(v_pal -> 'lista') = 'array' then v_pal -> 'lista' else '[]'::jsonb end) e
          where jsonb_typeof(e) = 'object' and e ->> 'k' = substr(s, 3))) then
      raise exception 'Uma das palavras não está no dicionário do personagem.';
    end if;
  end if;
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


-- 2) O dicionário só muda por quem mestra a Meditação ----------------------------------------------------------------
create or replace function privado.medit_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if (select auth.uid()) is null or (old.id not like 'medit:achados:%' and old.id not like 'medit:palavras:%')
     or privado.mestra_doc(old.mesa_id, old.id)
     or coalesce(current_setting('tinycats.meditacao', true), '') = 'sim' then
    return new;
  end if;
  if old.id like 'medit:palavras:%' then
    raise exception 'O dicionário de palavras só muda pelas mãos do mestre.';
  end if;
  raise exception 'O que a meditação guardou (tentativas e receitas descobertas) só muda pela própria meditação ou pelo mestre.';
end $function$;
revoke all on function privado.medit_guarda() from public;

-- 3) O dicionário acompanha o dono do personagem ----------------------------------------------------------------------
create or replace function privado.medit_dono()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.dono_id is distinct from old.dono_id then
    perform set_config('tinycats.meditacao', 'sim', true);
    update public.documentos d set dono_id = new.dono_id
     where d.mesa_id = new.mesa_id and d.id in ('medit:pratica:' || new.id, 'medit:achados:' || new.id, 'medit:palavras:' || new.id)
       and d.dono_id is distinct from new.dono_id;
    perform set_config('tinycats.meditacao', '', true);
  end if;
  return null;
end $function$;
revoke all on function privado.medit_dono() from public;

notify pgrst, 'reload schema';
