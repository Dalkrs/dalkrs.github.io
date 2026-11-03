-- (lote 66) A ficha de um personagem também é gravada como diferença, e o banco junta. Até aqui a coluna `ficha`
-- subia inteira: se o mestre entregava um item (a aba Itens grava a ficha) enquanto o jogador editava a ficha dele,
-- a gravação do jogador levava a ficha de antes e o item sumia. Agora cada um manda só o que mudou (o formato "JSON
-- Merge Patch", como o estado e as skills: objeto se junta chave por chave; lista e texto trocam o que havia).
--
-- É a mesma função de 0009, aceitando também 'ficha'. Roda com as permissões de quem chama: as regras de acesso da
-- tabela (e as guardas de 0028, a corrupção que só o mestre muda) continuam decidindo. O site só manda a ficha assim
-- depois de conferir que esta versão da função está no banco; antes disso, ela continua subindo inteira.
create or replace function public.personagem_juntar(p_mesa uuid, p_id text, p_coluna text, p_mudas jsonb)
returns table (rev bigint, rev_ant bigint)
language plpgsql
security invoker
set search_path to ''
as $function$
declare m jsonb; novo jsonb;
begin
  if p_coluna is null or p_coluna not in ('estado', 'skills', 'ficha') then
    raise exception 'Coluna inválida.';
  end if;
  if p_mudas is null or jsonb_typeof(p_mudas) <> 'array' or jsonb_array_length(p_mudas) > 200 then
    raise exception 'Mudança inválida.';
  end if;
  if p_coluna = 'estado' then
    select p.estado into novo from public.personagens p where p.mesa_id = p_mesa and p.id = p_id for update;
  elsif p_coluna = 'skills' then
    select p.skills into novo from public.personagens p where p.mesa_id = p_mesa and p.id = p_id for update;
  else
    select p.ficha into novo from public.personagens p where p.mesa_id = p_mesa and p.id = p_id for update;
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
  elsif p_coluna = 'skills' then
    return query
      update public.personagens p set skills = novo
       where p.mesa_id = p_mesa and p.id = p_id
      returning p.rev, p.rev_ant;
  else
    return query
      update public.personagens p set ficha = novo
       where p.mesa_id = p_mesa and p.id = p_id
      returning p.rev, p.rev_ant;
  end if;
end $function$;
revoke all on function public.personagem_juntar(uuid, text, text, jsonb) from public, anon;
grant execute on function public.personagem_juntar(uuid, text, text, jsonb) to authenticated;
