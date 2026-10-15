-- LOTE 6, PARTE 6 (JORNAL): o Jornal da mesa e as cartas dos leitores.
-- O Jornal tem estes documentos na mesa:
--   · jornal:rascunho — o que quem mestra o Jornal está escrevendo (só ele vê);
--   · jornal:pub — o que foi publicado (a mesa toda lê);
--   · jornal:cartas:<usuário> — as cartas de um jogador: só ele e quem mestra o Jornal veem. O jogador escreve as dele;
--   · jornal:resp:<usuário> — o que aconteceu com cada carta dele (saiu no jornal, não saiu): quem mestra escreve, com
--     o jogador como dono, para só ele e quem mestra verem. (Como dono, ele poderia regravá-lo pela API: isso só mexe no
--     que se diz das cartas dele mesmo.)
-- 1) Os documentos jornal:* são da aba Jornal: o mestre auxiliar com a aba Jornal liberada mestra o Jornal também.
-- 2) O jogador cria, além do pedido dele para a cena que está no ar, o documento das cartas dele — só o dele, só
--    com ele mesmo como dono e só para o mestre ver (as regras de antes já não deixam o jogador trocar o dono, a
--    visibilidade nem apagar o documento depois).
-- 3) A aba Jornal entre as que o mestre libera para o mestre auxiliar (quem já é auxiliar continua com as abas que
--    tinha; o mestre libera o Jornal no menu da mesa, se quiser).
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

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
    else null end;
$function$;

alter policy documentos_criar on public.documentos
  with check (
    privado.doc_aberto(mesa_id, id)
    and (privado.mestra_doc(mesa_id, id)
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado
             and (id = 'cena:pedido:' || (select auth.uid())::text
                  or (id = 'jornal:cartas:' || (select auth.uid())::text and vis = 'mestre'))))
  );

alter table public.mesa_membros drop constraint if exists mesa_membros_abas_check;
alter table public.mesa_membros add constraint mesa_membros_abas_check
  check (abas <@ array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal']::text[]);

create or replace function public.definir_auxiliar(p_mesa uuid, p_usuario uuid, p_auxiliar boolean, p_abas text[] default null)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_todas constant text[] := array['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador', 'jornal'];
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
