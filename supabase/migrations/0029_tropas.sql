-- LOTE 40 (AS TROPAS NAS FICHAS): a tropa de cada personagem — a guarda pessoal dele, em unidades.
-- Ela mora no documento "fichas:tropas:<id do personagem>": quem mestra as Fichas cria, com o dono do personagem como
-- dono do documento — e por isso só o dono e quem mestra o recebem (a regra de leitura de sempre: o que é seu e o que é
-- da mesa). Os outros jogadores não recebem a tropa de ninguém.
-- O dono pode mudar o documento (é a regra de sempre para os documentos com dono), mas só as escolhas dele: o nome, o
-- brasão e as informações da tropa; e, de cada unidade, o nome, a raça, a classe, o brasão, os equipamentos, os
-- suprimentos e as informações. Os números (as tropas, o HP, o ATQ, a DEF, a veterania, as batalhas, as baixas, as
-- quantidades, a moral, os mantimentos, o diário) e a lista das unidades são de quem mestra — o que esta migração
-- confere: a "parte do mestre" (o documento sem as escolhas do jogador) tem que ficar igual quando quem grava não mestra.
-- E a tropa fica sempre fora da mesa (vis = 'mestre'). Criar e apagar já são só de quem mestra (as regras de sempre).
-- Tudo aqui é acréscimo: sem esta migração, a tropa funciona do mesmo jeito (só sem a tranca). Pode rodar mais de uma vez.

-- a parte do mestre: a tropa sem as chaves do jogador (a mesma conta de parteMestre, em tc/tropas.js)
create or replace function privado.tropas_mestre(d jsonb)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select (coalesce(d, '{}'::jsonb) - 'nome' - 'bras' - 'info')
    || jsonb_build_object('unid', coalesce((
         select jsonb_agg(case when jsonb_typeof(u) = 'object'
                               then u - 'nome' - 'raca' - 'racaN' - 'classe' - 'classeN' - 'bras' - 'equip' - 'supr' - 'info'
                               else u end order by ord)
           from jsonb_array_elements(case when jsonb_typeof(d -> 'unid') = 'array' then d -> 'unid' else '[]'::jsonb end) with ordinality as t(u, ord)),
         '[]'::jsonb))
$function$;
revoke all on function privado.tropas_mestre(jsonb) from public, anon, authenticated;

create or replace function privado.tropas_guarda()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
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
  if privado.tropas_mestre(new.dados) is distinct from privado.tropas_mestre(old.dados) then
    raise exception 'Só o mestre muda os números das tropas.';
  end if;
  return new;
end $function$;
revoke all on function privado.tropas_guarda() from public, anon, authenticated;

drop trigger if exists documentos_tropas_guarda on public.documentos;
create trigger documentos_tropas_guarda before insert or update on public.documentos for each row when (new.id like 'fichas:tropas:%') execute function privado.tropas_guarda();
