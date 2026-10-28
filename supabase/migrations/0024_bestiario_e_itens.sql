-- LOTE 29 (BESTIÁRIO E ITENS): as abas Bestiário e Itens, do mestre.
-- Os documentos da mesa:
--   · best:i:<id> — um inimigo do Bestiário; best:enc:<id> — um encontro guardado; best:tags — as tags criadas. Tudo só
--     de quem mestra o Bestiário (nascem com vis = 'mestre': os jogadores não recebem os inimigos);
--   · itens:* — o catálogo de itens, a loja e as receitas (aba Itens).
-- 1) Os documentos best:* são da aba Bestiário, e os itens:*, da aba Itens (o mestre auxiliar com a aba liberada mestra).
-- 2) As duas abas entre as que o mestre libera para o mestre auxiliar.
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
