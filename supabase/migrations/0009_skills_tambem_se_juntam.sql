-- O que mais de uma pessoa mexe ao mesmo tempo num personagem é gravado como diferença, e o banco junta. Até aqui
-- era só o estado atual (0008). Agora também as skills: o mestre dá pontos (no quadro de Ascensão da ficha, ou na
-- aba Árvore) enquanto o jogador gasta os dele na árvore — cada um muda uma chave (pontos / alocados), e as duas
-- mudanças ficam valendo.
--
-- É a mesma conta de estado_juntar, para a coluna que quem chama indicar ('estado' ou 'skills'). Roda com as
-- permissões de quem chama: as regras de acesso da tabela continuam decidindo quem pode alterar a linha (quem não
-- pode não altera nada, e nada volta). estado_juntar continua existindo, para as páginas que ainda estiverem abertas
-- com a versão anterior do site.
create or replace function public.personagem_juntar(p_mesa uuid, p_id text, p_coluna text, p_mudas jsonb)
returns table (rev bigint, rev_ant bigint)
language plpgsql
security invoker
set search_path to ''
as $function$
declare m jsonb; novo jsonb;
begin
  if p_coluna is null or p_coluna not in ('estado', 'skills') then
    raise exception 'Coluna inválida.';
  end if;
  if p_mudas is null or jsonb_typeof(p_mudas) <> 'array' or jsonb_array_length(p_mudas) > 200 then
    raise exception 'Mudança inválida.';
  end if;
  if p_coluna = 'estado' then
    select p.estado into novo from public.personagens p where p.mesa_id = p_mesa and p.id = p_id for update;
  else
    select p.skills into novo from public.personagens p where p.mesa_id = p_mesa and p.id = p_id for update;
  end if;
  if not found then return; end if;
  for m in select * from jsonb_array_elements(p_mudas) loop
    if jsonb_typeof(m) <> 'object' then raise exception 'Mudança inválida.'; end if;
    novo := privado.juntar_json(novo, m);
  end loop;
  if p_coluna = 'estado' then
    return query
      update public.personagens p set estado = novo
       where p.mesa_id = p_mesa and p.id = p_id
      returning p.rev, p.rev_ant;
  else
    return query
      update public.personagens p set skills = novo
       where p.mesa_id = p_mesa and p.id = p_id
      returning p.rev, p.rev_ant;
  end if;
end $function$;
revoke all on function public.personagem_juntar(uuid, text, text, jsonb) from public, anon;
grant execute on function public.personagem_juntar(uuid, text, text, jsonb) to authenticated;
