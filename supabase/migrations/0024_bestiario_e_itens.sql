-- LOTE 29 (BESTIÁRIO E ITENS): as abas Bestiário e Itens, do mestre.
-- Os documentos da mesa:
--   · best:i:<id> — um inimigo do Bestiário; best:enc:<id> — um encontro guardado; best:tags — as tags criadas. Tudo só
--     de quem mestra o Bestiário (nascem com vis = 'mestre': os jogadores não recebem os inimigos);
--   · itens:* — o catálogo de itens, a loja e as receitas (aba Itens).
-- 1) Os documentos best:* são da aba Bestiário, e os itens:*, da aba Itens (o mestre auxiliar com a aba liberada mestra).
-- 2) As duas abas entre as que o mestre libera para o mestre auxiliar.
-- 3) Quem está perto de cada loja: o banco confere no Mapa-múndi quais personagens (os ligados a um grupo do mapa) estão
--    no hexágono do lugar da loja, e guarda na loja (aqui) — de novo a cada mudança no mapa ou na loja.
-- 4) A compra: o jogador compra para o personagem dele, de perto (o banco confere), com os lapros da ficha; o item vai
--    para a bolsa (ou para os equipamentos, guardado), o estoque baixa e a compra fica anotada para o mestre, no Jornal
--    (jornal:compras). Desfazer, pela mesma pessoa, nos 15 minutos seguintes.
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração (sem ela, o Bestiário
-- funciona só para o mestre da mesa).

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
    else null end;
$function$;

-- 2) As abas Bestiário e Itens nas permissões do mestre auxiliar ------------------------------------------------------
alter table public.mesa_membros drop constraint if exists mesa_membros_abas_check;
alter table public.mesa_membros add constraint mesa_membros_abas_check
  check (abas <@ array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao', 'cla', 'bestiario', 'itens']::text[]);

create or replace function public.definir_auxiliar(p_mesa uuid, p_usuario uuid, p_auxiliar boolean, p_abas text[] default null)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_todas constant text[] := array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal', 'meditacao', 'cla', 'bestiario', 'itens'];
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

-- 3) Quem está perto de cada loja -----------------------------------------------------------------------------------
-- (apoio) um número de um jsonb (número ou texto com número), ou null
create or replace function privado.itens_num(v jsonb)
returns numeric language plpgsql immutable set search_path to '' as $function$
begin
  if jsonb_typeof(v) = 'number' then return (v #>> '{}')::numeric; end if;
  if jsonb_typeof(v) = 'string' and btrim(v #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then return btrim(v #>> '{}')::numeric; end if;
  return null;
end $function$;
-- o hexágono de um ponto do mapa, "q,r" — a mesma conta de hexDe (mundo/nucleo.js); null sem grade
create or replace function privado.itens_hex(p_grade jsonb, p_x numeric, p_y numeric)
returns text language plpgsql immutable set search_path to '' as $function$
declare
  r3 numeric := sqrt(3::numeric);
  v_tam numeric; v_s numeric; v_px numeric; v_py numeric; v_q numeric; v_r numeric; v_z numeric;
  v_rq numeric; v_rr numeric; v_rz numeric;
begin
  if jsonb_typeof(p_grade) is distinct from 'object' or p_x is null or p_y is null then return null; end if;
  v_tam := privado.itens_num(p_grade -> 'tam');
  if v_tam is null or v_tam <= 0 then return null; end if;
  v_s := v_tam / r3;
  v_px := p_x - coalesce(privado.itens_num(p_grade -> 'x'), 0);
  v_py := p_y - coalesce(privado.itens_num(p_grade -> 'y'), 0);
  if p_grade ->> 'orient' = 'deitado' then
    v_q := (2.0 / 3 * v_px) / v_s; v_r := (-1.0 / 3 * v_px + r3 / 3 * v_py) / v_s;
  else
    v_q := (r3 / 3 * v_px - 1.0 / 3 * v_py) / v_s; v_r := (2.0 / 3 * v_py) / v_s;
  end if;
  v_z := -v_q - v_r;
  v_rq := floor(v_q + 0.5); v_rr := floor(v_r + 0.5); v_rz := floor(v_z + 0.5);        -- (o Math.round do navegador)
  if abs(v_rq - v_q) > abs(v_rr - v_r) and abs(v_rq - v_q) > abs(v_rz - v_z) then v_rq := -v_rr - v_rz;
  elsif abs(v_rr - v_r) > abs(v_rz - v_z) then v_rr := -v_rq - v_rz;
  end if;
  return (v_rq::bigint)::text || ',' || (v_rr::bigint)::text;
end $function$;
-- os personagens no lugar (o hexágono do marcador): os dos grupos do mapa (pcs) que estão no mesmo hexágono
create or replace function privado.itens_aqui(p_mesa uuid, p_lugar jsonb)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare v_mapa jsonb; v_objs jsonb; v_m jsonb; v_hex text; v_out jsonb;
begin
  if jsonb_typeof(p_lugar) is distinct from 'object' or coalesce(p_lugar ->> 'mapa', '') = '' then return '[]'::jsonb; end if;
  select d.dados into v_mapa from public.documentos d where d.mesa_id = p_mesa and d.id = 'mundo:mapa:' || (p_lugar ->> 'mapa') and not d.apagado;
  if not found then return '[]'::jsonb; end if;
  v_objs := case when jsonb_typeof(v_mapa -> 'objs') = 'array' then v_mapa -> 'objs' else '[]'::jsonb end;
  select o into v_m from jsonb_array_elements(v_objs) o where o ->> 'k' = 'm' and o ->> 'id' = p_lugar ->> 'marcador' limit 1;
  if v_m is null then return '[]'::jsonb; end if;
  v_hex := privado.itens_hex(v_mapa -> 'grade', privado.itens_num(v_m -> 'x'), privado.itens_num(v_m -> 'y'));
  if v_hex is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(distinct p.value), '[]'::jsonb) into v_out
    from jsonb_array_elements(v_objs) g
   cross join lateral jsonb_array_elements(case when jsonb_typeof(g -> 'pcs') = 'array' then g -> 'pcs' else '[]'::jsonb end) p
   where g ->> 'k' = 'g' and jsonb_typeof(p.value) = 'string'
     and privado.itens_hex(v_mapa -> 'grade', privado.itens_num(g -> 'x'), privado.itens_num(g -> 'y')) = v_hex;
  return v_out;
end $function$;
-- a loja guarda quem está perto (quem grava a loja não escolhe: o banco monta)
create or replace function privado.itens_loja_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if jsonb_typeof(new.dados) = 'object' then
    new.dados := jsonb_set(new.dados, '{aqui}', privado.itens_aqui(new.mesa_id, new.dados -> 'lugar'), true);
  end if;
  return new;
end $function$;
-- o mapa mudou (um grupo andou, o mestre ligou personagens a um grupo, o marcador mudou de lugar): as lojas dele também
create or replace function privado.itens_mapa_mudou()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare v_l record; v_aqui jsonb;
begin
  for v_l in select d.id, d.dados from public.documentos d
              where d.mesa_id = new.mesa_id and d.id like 'itens:loja:%' and not d.apagado and d.dados #>> '{lugar,mapa}' = substr(new.id, 12) loop
    v_aqui := privado.itens_aqui(new.mesa_id, v_l.dados -> 'lugar');
    if v_aqui is distinct from coalesce(v_l.dados -> 'aqui', '[]'::jsonb) then
      update public.documentos d set dados = jsonb_set(d.dados, '{aqui}', v_aqui, true) where d.mesa_id = new.mesa_id and d.id = v_l.id;
    end if;
  end loop;
  return null;
end $function$;
revoke all on function privado.itens_num(jsonb), privado.itens_hex(jsonb, numeric, numeric), privado.itens_aqui(uuid, jsonb), privado.itens_loja_guarda(), privado.itens_mapa_mudou() from public, anon, authenticated;
drop trigger if exists documentos_itens_loja on public.documentos;
create trigger documentos_itens_loja before insert or update on public.documentos for each row when (new.id like 'itens:loja:%') execute function privado.itens_loja_guarda();
drop trigger if exists documentos_itens_mapa on public.documentos;
create trigger documentos_itens_mapa after insert or update on public.documentos for each row when (new.id like 'mundo:mapa:%') execute function privado.itens_mapa_mudou();

-- 4) A compra --------------------------------------------------------------------------------------------------------
create or replace function privado.itens_id()
returns text language sql volatile set search_path to '' as $function$
  select substr(md5(random()::text || clock_timestamp()::text), 1, 10);
$function$;
-- a barra de cada efeito da poção, na ficha de quem recebe: o catálogo diz o nome ("HP"); a bolsa guarda o id do recurso
-- (ou "pd:" + o id da barra especial) — a mesma conta de TC.itens.recDaFicha
create or replace function privado.itens_fx_da_ficha(fx jsonb, ficha jsonb)
returns jsonb language sql immutable set search_path to '' as $function$
  select coalesce(jsonb_agg(case when jsonb_typeof(e) = 'object' and e ->> 'k' in ('barra', 'sob') then
           e || jsonb_build_object('rec', coalesce(
             (select r ->> 'id' from jsonb_array_elements(case when jsonb_typeof(ficha -> 'recursos') = 'array' then ficha -> 'recursos' else '[]'::jsonb end) r
               where r ->> 'id' = e ->> 'rec' limit 1),
             (select r ->> 'id' from jsonb_array_elements(case when jsonb_typeof(ficha -> 'recursos') = 'array' then ficha -> 'recursos' else '[]'::jsonb end) r
               where lower(btrim(r ->> 'nome')) = lower(btrim(e ->> 'rec')) and coalesce(r ->> 'id', '') <> '' limit 1),
             (select 'pd:' || (p ->> 'id') from jsonb_array_elements(case when jsonb_typeof(ficha -> 'poderes') = 'array' then ficha -> 'poderes' else '[]'::jsonb end) p
               where lower(btrim(p ->> 'nome')) = lower(btrim(e ->> 'rec')) and coalesce(p ->> 'id', '') <> '' limit 1),
             e ->> 'rec'))
         else e end order by o), '[]'::jsonb)
    from jsonb_array_elements(case when jsonb_typeof(fx) = 'array' then fx else '[]'::jsonb end) with ordinality t(e, o);
$function$;
-- o item como entra na bolsa (o mesmo de TC.itens.paraBolsa) e nos equipamentos, guardado (paraFicha)
create or replace function privado.itens_para_bolsa(it jsonb, p_id text, ficha jsonb)
returns jsonb language sql immutable set search_path to '' as $function$
  select jsonb_build_object('id', p_id, 't', case when it ->> 't' in ('pocao', 'bomba', 'runa', 'municao', 'material') then it ->> 't' else 'material' end, 'nome', left(coalesce(it ->> 'nome', 'Item'), 80))
    || case when coalesce(it ->> 'nota', '') <> '' then jsonb_build_object('nota', left(it ->> 'nota', 600)) else '{}'::jsonb end
    || case when it ->> 't' = 'pocao' and jsonb_typeof(it -> 'fx') = 'array' then jsonb_build_object('fx', privado.itens_fx_da_ficha(it -> 'fx', ficha)) else '{}'::jsonb end;
$function$;
create or replace function privado.itens_para_ficha(it jsonb, p_id text)
returns jsonb language sql immutable set search_path to '' as $function$
  select jsonb_build_object('id', p_id, 'nome', left(coalesce(it ->> 'nome', 'Item'), 80), 'equipado', false,
           'bonus', '{"FOR":0,"DES":0,"VIT":0,"CAN":0,"AGI":0,"ESQ":0,"FUR":0,"PER":0,"EMB":0,"DFF":0,"DFM":0,"BLQ":0}'::jsonb
                    || case when jsonb_typeof(it #> '{equip,bonus}') = 'object' then it #> '{equip,bonus}' else '{}'::jsonb end)
    || case when coalesce(it #>> '{equip,tipo}', '') <> '' then jsonb_build_object('tipo', it #>> '{equip,tipo}') else '{}'::jsonb end
    || case when jsonb_typeof(it #> '{equip,def}') = 'object' and it #> '{equip,def}' <> '{}'::jsonb then jsonb_build_object('def', it #> '{equip,def}') else '{}'::jsonb end
    || case when coalesce(it ->> 'nota', '') <> '' then jsonb_build_object('efeito', left(it ->> 'nota', 600)) else '{}'::jsonb end;
$function$;
revoke all on function privado.itens_id(), privado.itens_fx_da_ficha(jsonb, jsonb), privado.itens_para_bolsa(jsonb, text, jsonb), privado.itens_para_ficha(jsonb, text) from public, anon, authenticated;

/* Comprar: p_qtd unidades do item p_item da loja p_loja, para o personagem p_pc. Quem pode: o dono do personagem, com
   ele no hexágono da loja (ou quem mestra os Itens, de qualquer lugar). A loja precisa estar aberta, com estoque (sem
   estoque guardado: sem fim) e o personagem com os lapros. → { ok, compra, total, lapros } */
create or replace function public.itens_comprar(p_mesa uuid, p_loja text, p_item text, p_qtd integer, p_pc text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_mestra boolean; v_pc public.personagens; v_loja jsonb; v_it jsonb; v_i integer; v_q integer;
  v_preco bigint; v_total bigint; v_lap bigint; v_item jsonb; v_t text; v_nome text;
  v_bolsa jsonb; v_itens jsonb; v_qtd jsonb; v_bid text; v_somou jsonb := '{}'::jsonb; v_novos_b jsonb := '[]'::jsonb; v_novos_i jsonb := '[]'::jsonb;
  v_compra jsonb; v_cid text := privado.itens_id(); v_k integer;
  v_em text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if coalesce(p_loja, '') !~ '^[A-Za-z0-9_-]{1,60}$' or coalesce(p_item, '') !~ '^[A-Za-z0-9_-]{1,60}$' or coalesce(p_pc, '') = '' then raise exception 'Pedido desconhecido.'; end if;
  v_q := greatest(1, least(99, coalesce(p_qtd, 1)));
  v_mestra := privado.mestra(p_mesa, 'itens');
  select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = p_pc and not pe.apagado for update;
  if not found or v_pc.ficha is null then raise exception 'Este personagem não está na mesa.'; end if;
  if not v_mestra and v_pc.dono_id is distinct from v_uid then raise exception 'Você compra para o seu personagem.'; end if;
  select d.dados into v_loja from public.documentos d where d.mesa_id = p_mesa and d.id = 'itens:loja:' || p_loja and not d.apagado for update;
  if not found then raise exception 'Esta loja não existe mais.'; end if;
  if (v_loja -> 'aberta') = 'false'::jsonb then raise exception 'A loja está fechada.'; end if;
  if not v_mestra and not coalesce((v_loja -> 'aqui') ? p_pc, false) then raise exception '% não está perto desta loja (no hexágono dela, no Mapa-múndi).', coalesce(nullif(btrim(v_pc.nome), ''), 'O personagem'); end if;
  select x.e, (x.o - 1)::integer into v_it, v_i
    from jsonb_array_elements(case when jsonb_typeof(v_loja -> 'itens') = 'array' then v_loja -> 'itens' else '[]'::jsonb end) with ordinality x(e, o)
   where x.e ->> 'id' = p_item limit 1;
  if v_it is null or jsonb_typeof(v_it -> 'item') is distinct from 'object' then raise exception 'Este item não está mais na loja.'; end if;
  if jsonb_typeof(v_it -> 'estoque') = 'number' and privado.itens_num(v_it -> 'estoque') < v_q then
    raise exception '%', case when privado.itens_num(v_it -> 'estoque') > 0 then 'Só há ' || privado.itens_num(v_it -> 'estoque')::bigint || ' na loja.' else 'Acabou o estoque.' end;
  end if;
  v_preco := greatest(0, floor(coalesce(privado.itens_num(v_it -> 'preco'), 0)))::bigint;
  v_total := v_preco * v_q;
  v_lap := greatest(0, floor(coalesce(privado.itens_num(v_pc.estado -> 'lapros'), 0)))::bigint;
  if v_total > v_lap then raise exception 'Faltam % lapros (custa %, tem %).', v_total - v_lap, v_total, v_lap; end if;
  v_item := v_it -> 'item'; v_t := coalesce(v_item ->> 't', 'material'); v_nome := left(btrim(coalesce(v_item ->> 'nome', 'Item')), 80);
  v_bolsa := case when jsonb_typeof(v_pc.ficha -> 'bolsa') = 'array' then v_pc.ficha -> 'bolsa' else '[]'::jsonb end;
  v_itens := case when jsonb_typeof(v_pc.ficha -> 'itens') = 'array' then v_pc.ficha -> 'itens' else '[]'::jsonb end;
  v_qtd := case when jsonb_typeof(v_pc.estado -> 'qtd') = 'object' then v_pc.estado -> 'qtd' else '{}'::jsonb end;
  if v_t = 'equip' then
    for v_k in 1..least(v_q, 20) loop
      v_bid := privado.itens_id();
      v_itens := v_itens || jsonb_build_array(privado.itens_para_ficha(v_item, v_bid));
      v_novos_i := v_novos_i || to_jsonb(v_bid);
    end loop;
  else
    if v_t not in ('pocao', 'bomba', 'runa', 'municao', 'material') then v_t := 'material'; end if;
    select b ->> 'id' into v_bid from jsonb_array_elements(v_bolsa) b
     where jsonb_typeof(b) = 'object' and coalesce(b ->> 'id', '') <> '' and lower(btrim(coalesce(b ->> 'nome', ''))) = lower(v_nome)
       and (case when b ->> 't' in ('pocao', 'bomba', 'runa', 'municao', 'material') then b ->> 't' else 'material' end) = v_t
     limit 1;
    if v_bid is null then
      v_bid := 'b' || privado.itens_id();
      v_bolsa := v_bolsa || jsonb_build_array(privado.itens_para_bolsa(v_item, v_bid, v_pc.ficha));
      v_novos_b := v_novos_b || to_jsonb(v_bid);
    end if;
    v_qtd := jsonb_set(v_qtd, array[v_bid], to_jsonb(greatest(0, floor(coalesce(privado.itens_num(v_qtd -> v_bid), 0)))::bigint + v_q), true);
    v_somou := jsonb_build_object(v_bid, v_q);
  end if;
  update public.personagens pe
     set ficha = jsonb_set(jsonb_set(pe.ficha, '{bolsa}', v_bolsa, true), '{itens}', v_itens, true),
         estado = jsonb_set(jsonb_set(coalesce(pe.estado, '{}'::jsonb), '{qtd}', v_qtd, true), '{lapros}', to_jsonb(v_lap - v_total), true)
   where pe.mesa_id = p_mesa and pe.id = p_pc;
  if jsonb_typeof(v_it -> 'estoque') = 'number' then
    update public.documentos d set dados = jsonb_set(d.dados, array['itens', v_i::text, 'estoque'], to_jsonb(privado.itens_num(v_it -> 'estoque')::bigint - v_q))
     where d.mesa_id = p_mesa and d.id = 'itens:loja:' || p_loja;
  end if;
  v_compra := jsonb_build_object('id', v_cid, 'em', v_em, 'quem', v_uid, 'pc', p_pc, 'pcNome', coalesce(v_pc.nome, ''), 'loja', p_loja, 'lojaNome', coalesce(v_loja ->> 'nome', 'Loja'),
    'itemId', p_item, 'item', v_nome, 't', v_t, 'qtd', v_q, 'total', v_total, 'estoque', jsonb_typeof(v_it -> 'estoque') = 'number',
    'somou', v_somou, 'novosB', v_novos_b, 'novosI', v_novos_i, 'desfeita', false);
  insert into public.documentos as d (mesa_id, id, vis, dados) values (p_mesa, 'jornal:compras', 'mestre', jsonb_build_object('v', 1, 'lista', jsonb_build_array(v_compra)))
  on conflict (mesa_id, id) do update set dados = jsonb_build_object('v', 1, 'lista', privado.medit_lista(jsonb_build_array(v_compra) || coalesce(d.dados -> 'lista', '[]'::jsonb), 300)), apagado = false;
  return jsonb_build_object('ok', true, 'compra', v_cid, 'total', v_total, 'lapros', v_lap - v_total);
end $function$;
revoke all on function public.itens_comprar(uuid, text, text, integer, text) from public, anon;
grant execute on function public.itens_comprar(uuid, text, text, integer, text) to authenticated;

/* Desfazer uma compra (quem comprou, nos 15 minutos seguintes; quem mestra os Itens, quando quiser): os lapros voltam,
   o que entrou sai da ficha (o que já foi gasto não volta duas vezes: tira até o que há) e o estoque volta. */
create or replace function public.itens_desfazer_compra(p_mesa uuid, p_compra text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_doc jsonb; v_c jsonb; v_i integer; v_pc public.personagens; v_qtd jsonb; v_bolsa jsonb; v_itens jsonb; v_k text; v_n bigint; v_loja jsonb; v_j integer;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  select d.dados into v_doc from public.documentos d where d.mesa_id = p_mesa and d.id = 'jornal:compras' and not d.apagado for update;
  if not found then raise exception 'Esta compra não existe.'; end if;
  select x.e, (x.o - 1)::integer into v_c, v_i from jsonb_array_elements(coalesce(v_doc -> 'lista', '[]'::jsonb)) with ordinality x(e, o) where x.e ->> 'id' = p_compra limit 1;
  if v_c is null then raise exception 'Esta compra não existe.'; end if;
  if (v_c -> 'desfeita') = 'true'::jsonb then raise exception 'Esta compra já foi desfeita.'; end if;
  if not privado.mestra(p_mesa, 'itens') then
    if (v_c ->> 'quem') is distinct from v_uid::text then raise exception 'Só quem comprou desfaz a compra.'; end if;
    if (v_c ->> 'em')::timestamptz < now() - interval '15 minutes' then raise exception 'Passou o tempo de desfazer (15 minutos): fale com o mestre.'; end if;
  end if;
  select pe.* into v_pc from public.personagens pe where pe.mesa_id = p_mesa and pe.id = v_c ->> 'pc' and not pe.apagado for update;
  if found and v_pc.ficha is not null then
    v_qtd := case when jsonb_typeof(v_pc.estado -> 'qtd') = 'object' then v_pc.estado -> 'qtd' else '{}'::jsonb end;
    for v_k, v_n in select e.key, privado.itens_num(e.value)::bigint from jsonb_each(coalesce(v_c -> 'somou', '{}'::jsonb)) e loop
      v_qtd := jsonb_set(v_qtd, array[v_k], to_jsonb(greatest(0, floor(coalesce(privado.itens_num(v_qtd -> v_k), 0))::bigint - v_n)), true);
    end loop;
    v_bolsa := (select coalesce(jsonb_agg(b order by o), '[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(v_pc.ficha -> 'bolsa') = 'array' then v_pc.ficha -> 'bolsa' else '[]'::jsonb end) with ordinality t(b, o)
                 where not (coalesce(v_c -> 'novosB', '[]'::jsonb) ? (b ->> 'id') and coalesce(privado.itens_num(v_qtd -> (b ->> 'id')), 0) <= 0));
    for v_k in select jsonb_array_elements_text(coalesce(v_c -> 'novosB', '[]'::jsonb)) loop
      if coalesce(privado.itens_num(v_qtd -> v_k), 0) <= 0 then v_qtd := v_qtd - v_k; end if;
    end loop;
    v_itens := (select coalesce(jsonb_agg(b order by o), '[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(v_pc.ficha -> 'itens') = 'array' then v_pc.ficha -> 'itens' else '[]'::jsonb end) with ordinality t(b, o)
                 where not (coalesce(v_c -> 'novosI', '[]'::jsonb) ? (b ->> 'id')));
    update public.personagens pe
       set ficha = jsonb_set(jsonb_set(pe.ficha, '{bolsa}', v_bolsa, true), '{itens}', v_itens, true),
           estado = jsonb_set(jsonb_set(coalesce(pe.estado, '{}'::jsonb), '{qtd}', v_qtd, true), '{lapros}',
                      to_jsonb(greatest(0, floor(coalesce(privado.itens_num(pe.estado -> 'lapros'), 0)))::bigint + coalesce(privado.itens_num(v_c -> 'total'), 0)::bigint), true)
     where pe.mesa_id = p_mesa and pe.id = v_pc.id;
  end if;
  if (v_c -> 'estoque') = 'true'::jsonb then
    select d.dados into v_loja from public.documentos d where d.mesa_id = p_mesa and d.id = 'itens:loja:' || (v_c ->> 'loja') and not d.apagado for update;
    if found then
      select (x.o - 1)::integer into v_j from jsonb_array_elements(coalesce(v_loja -> 'itens', '[]'::jsonb)) with ordinality x(e, o) where x.e ->> 'id' = v_c ->> 'itemId' and jsonb_typeof(x.e -> 'estoque') = 'number' limit 1;
      if v_j is not null then
        update public.documentos d set dados = jsonb_set(d.dados, array['itens', v_j::text, 'estoque'], to_jsonb(privado.itens_num(d.dados #> array['itens', v_j::text, 'estoque'])::bigint + privado.itens_num(v_c -> 'qtd')::bigint))
         where d.mesa_id = p_mesa and d.id = 'itens:loja:' || (v_c ->> 'loja');
      end if;
    end if;
  end if;
  update public.documentos d set dados = jsonb_set(d.dados, array['lista', v_i::text, 'desfeita'], 'true'::jsonb) where d.mesa_id = p_mesa and d.id = 'jornal:compras';
  return jsonb_build_object('ok', true);
end $function$;
revoke all on function public.itens_desfazer_compra(uuid, text) from public, anon;
grant execute on function public.itens_desfazer_compra(uuid, text) to authenticated;
