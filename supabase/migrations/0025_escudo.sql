-- LOTE 31 (O ESCUDO DO MESTRE): o roteiro, os relógios de ameaça, os handouts e os puzzles.
-- Os documentos da mesa:
--   · escudo:* — as sessões do roteiro, os relógios, os handouts como o mestre os fez (só quem mestra o Escudo) e
--     escudo:vista[@campanha], os relógios que o mestre mostra (a mesa lê);
--   · pista:<id>[@campanha] — o handout entregue, sem o que ainda está escondido: para a mesa toda (vis = 'mesa') ou só
--     para alguns (a coluna nova "para": quem recebe; os outros não leem);
--   · pista:jogo:<id>[@campanha] — o puzzle entregue, que quem recebeu resolve junto: muda pela função pista_jogar, um
--     lance de cada vez (o banco junta os lances de todos, e confere a resposta antes de dar o puzzle por resolvido).
-- 1) Os documentos escudo:* e pista:* são da aba Escudo do mestre (o mestre auxiliar com a aba liberada mestra).
-- 2) A aba entre as que o mestre libera para o mestre auxiliar.
-- 3) O documento "só para alguns": a coluna para (uuid[]). Quem está na lista lê o documento (como lê os da mesa); só
--    quem mestra a aba do documento põe ou muda a lista.
-- 4) Os lances do puzzle (pista_jogar) e a versão do Escudo no banco (escudo_versao).
-- 5) As linhas da Mesa ao vivo que vêm do Escudo e das Pistas ("Puzzle resolvido").
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração (sem ela, o Escudo
-- funciona só para o mestre da mesa, e os handouts vão só para a mesa toda — sem "só para alguns" e sem puzzles).
-- Pode rodar mais de uma vez.

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
    when id like 'best:%' then 'bestiario'
    when id like 'itens:%' then 'itens'
    when id like 'escudo:%' or id like 'pista:%' then 'escudo'
    else null end;
$function$;

-- 2) A aba Escudo nas permissões do mestre auxiliar ----------------------------------------------------------------
alter table public.mesa_membros drop constraint if exists mesa_membros_abas_check;
alter table public.mesa_membros add constraint mesa_membros_abas_check
  check (abas <@ array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao', 'cla', 'bestiario', 'itens', 'escudo']::text[]);

create or replace function public.definir_auxiliar(p_mesa uuid, p_usuario uuid, p_auxiliar boolean, p_abas text[] default null)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_todas constant text[] := array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao', 'cla', 'bestiario', 'itens', 'escudo'];
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

-- 3) O documento só para alguns -------------------------------------------------------------------------------------
alter table public.documentos add column if not exists para uuid[];
comment on column public.documentos.para is 'Documento entregue só a algumas pessoas (o handout do Escudo do mestre): além de quem mestra a aba dele, só elas o leem. null: vale a visibilidade de sempre (vis).';

alter policy documentos_ver on public.documentos
  using (
    privado.mestra_doc(mesa_id, id)
    or (privado.e_membro(mesa_id)
        and (dono_id = (select auth.uid())
             or (vis = 'mesa' and privado.ve_campanhas(mesa_id, campanhas))
             or (para is not null and (select auth.uid()) = any (para) and privado.ve_campanhas(mesa_id, campanhas))))
  );

-- quem não mestra a aba do documento não põe nem muda a lista; e as pistas têm um tamanho máximo
create or replace function privado.para_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.para is not null and coalesce(array_length(new.para, 1), 0) > 24 then
    raise exception 'Um documento vai a no máximo 24 pessoas.';
  end if;
  if new.id like 'pista:%' and pg_column_size(new.dados) > 400000 then
    raise exception 'O handout passou do tamanho máximo.';
  end if;
  if (select auth.uid()) is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.para is not null and not privado.mestra_doc(new.mesa_id, new.id) then
      raise exception 'Só o mestre entrega um documento a algumas pessoas.';
    end if;
  elsif new.para is distinct from old.para and not privado.mestra_doc(old.mesa_id, old.id) then
    raise exception 'Só o mestre muda para quem um documento vai.';
  end if;
  return new;
end $function$;
revoke all on function privado.para_guarda() from public;
drop trigger if exists documentos_para_guarda on public.documentos;
create trigger documentos_para_guarda before insert or update on public.documentos for each row execute function privado.para_guarda();

-- 4) Os puzzles -------------------------------------------------------------------------------------------------------
-- A versão do Escudo neste banco (o site pergunta antes de oferecer "só para alguns" e os puzzles).
create or replace function public.escudo_versao()
returns integer language sql stable set search_path to '' as $function$ select 1 $function$;
revoke all on function public.escudo_versao() from public, anon;
grant execute on function public.escudo_versao() to authenticated;

/* Um lance num puzzle entregue (pista:jogo:<id>[@campanha]), por quem o recebeu (ou por quem mestra o Escudo):
     p_op 'jogar'   — as chaves de p_mudas trocam as do estado (null apaga a chave); o resto do estado fica
     p_op 'errar'   — o mesmo, e conta um erro (a tentativa que não deu: o mestre pode ter ligado um relógio a isso)
     p_op 'acertar' — o mesmo, e o puzzle fica resolvido (por quem, quando), se a resposta (p_prova) bate com o md5
                      guardado: md5(sal || ':' || resposta) está na lista chk
   p_mudas._txt: o que aconteceu, em palavras ("trocou duas peças"), que os outros veem. Resolvido, não muda mais. */
create or replace function public.pista_jogar(p_mesa uuid, p_id text, p_op text, p_mudas jsonb default '{}'::jsonb, p_prova text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.documentos;
  v_dados jsonb;
  v_est jsonb;
  v_mudas jsonb;
  v_agora text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_erros integer;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if p_id is null or p_id not like 'pista:jogo:%' or length(p_id) > 160 then raise exception 'Puzzle desconhecido.'; end if;
  if p_op is null or p_op not in ('jogar', 'errar', 'acertar') then raise exception 'Pedido desconhecido.'; end if;
  select d.* into v_d from public.documentos d where d.mesa_id = p_mesa and d.id = p_id for update;
  if not found or v_d.apagado then raise exception 'Este puzzle não está mais na mesa.'; end if;
  if not privado.mestra_doc(p_mesa, p_id)
     and not (privado.e_membro(p_mesa) and privado.ve_campanhas(p_mesa, v_d.campanhas)
              and (v_d.vis = 'mesa' or (v_d.para is not null and v_uid = any (v_d.para)))) then
    raise exception 'Este puzzle não foi entregue a você.';
  end if;
  if not privado.doc_aberto(p_mesa, p_id) then raise exception 'A campanha deste puzzle está encerrada.'; end if;
  v_dados := case when jsonb_typeof(v_d.dados) = 'object' then v_d.dados else '{}'::jsonb end;
  if jsonb_typeof(v_dados -> 'resolvido') = 'object' then raise exception 'Este puzzle já foi resolvido.'; end if;
  v_mudas := case when jsonb_typeof(p_mudas) = 'object' then p_mudas else '{}'::jsonb end;
  v_est := case when jsonb_typeof(v_dados -> 'estado') = 'object' then v_dados -> 'estado' else '{}'::jsonb end;
  v_est := jsonb_strip_nulls(v_est || (v_mudas - '_txt'));
  v_dados := jsonb_set(v_dados, '{estado}', v_est);
  v_dados := jsonb_set(v_dados, '{ultimo}', jsonb_build_object('por', v_uid, 'em', v_agora, 'txt', left(coalesce(v_mudas ->> '_txt', ''), 120)));
  if p_op = 'errar' then
    v_erros := case when jsonb_typeof(v_dados -> 'erros') = 'number' then floor((v_dados ->> 'erros')::numeric)::integer else 0 end;
    v_dados := jsonb_set(v_dados, '{erros}', to_jsonb(v_erros + 1));
  elsif p_op = 'acertar' then
    if p_prova is null or jsonb_typeof(v_dados -> 'chk') is distinct from 'array'
       or not ((v_dados -> 'chk') ? md5(coalesce(v_dados ->> 'sal', '') || ':' || p_prova)) then
      raise exception 'Ainda não é isso.';
    end if;
    v_dados := jsonb_set(v_dados, '{resolvido}', jsonb_build_object('por', v_uid, 'em', v_agora));
  end if;
  if pg_column_size(v_dados) > 200000 then raise exception 'O puzzle ficou grande demais.'; end if;
  update public.documentos set dados = v_dados where mesa_id = p_mesa and id = p_id;
  return v_dados;
end $function$;
revoke all on function public.pista_jogar(uuid, text, text, jsonb, text) from public, anon;
grant execute on function public.pista_jogar(uuid, text, text, jsonb, text) to authenticated;

-- 5) A origem das linhas da Mesa ao vivo ------------------------------------------------------------------------------
alter table public.registro drop constraint if exists registro_origem_check;
alter table public.registro add constraint registro_origem_check
  check (origem in ('mesa', 'rolador', 'ficha', 'cena', 'mundo', 'arvore', 'acampamento', 'meditacao', 'escudo', 'pistas'));

notify pgrst, 'reload schema';
