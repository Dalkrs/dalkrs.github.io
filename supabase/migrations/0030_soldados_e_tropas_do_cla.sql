-- LOTE 42 (OS SOLDADOS COM NOME E AS TROPAS DO CLÃ): uma escolha nova do jogador na tropa, e a tropa que é do clã.
-- 1) Os soldados com nome de cada unidade (o nome, a raça e a classe dos que importam) são escolha do dono do
--    personagem, como o nome e o brasão da unidade: a parte do mestre (privado.tropas_mestre, da 0029) passa a deixar
--    de fora a chave "sold" de cada unidade. Sem esta migração, o dono não consegue salvar os soldados (o banco acha
--    que ele mexeu nos números).
-- 2) A tropa do clã é a tropa da ficha do líder dela (o documento fichas:tropas:<id do personagem>), com o clã dentro
--    (a chave "cla", da parte do mestre). O líder do clã também a recebe: quem mestra põe o dono do personagem no
--    cargo de líder na lista "para" do documento (a regra de leitura e a tranca da "para" são as da 0025: só quem
--    mestra muda para quem o documento vai). O líder do clã só lê: mudar, só o dono da tropa (as escolhas) e quem
--    mestra (tudo) — a tranca da 0029.
-- Pode rodar mais de uma vez.

create or replace function privado.tropas_mestre(d jsonb)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select (coalesce(d, '{}'::jsonb) - 'nome' - 'bras' - 'info')
    || jsonb_build_object('unid', coalesce((
         select jsonb_agg(case when jsonb_typeof(u) = 'object'
                               then u - 'nome' - 'raca' - 'racaN' - 'classe' - 'classeN' - 'bras' - 'equip' - 'supr' - 'info' - 'sold'
                               else u end order by ord)
           from jsonb_array_elements(case when jsonb_typeof(d -> 'unid') = 'array' then d -> 'unid' else '[]'::jsonb end) with ordinality as t(u, ord)),
         '[]'::jsonb))
$function$;
revoke all on function privado.tropas_mestre(jsonb) from public, anon, authenticated;
