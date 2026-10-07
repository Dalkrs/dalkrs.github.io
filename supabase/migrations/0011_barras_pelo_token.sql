-- AS BARRAS DE UMA FICHA, PELO TOKEN, SEM VER A FICHA
-- O mestre auxiliar pode mestrar as Cenas sem a aba Fichas. Nesse caso as fichas escondidas dos jogadores não chegam
-- a ele — mas os tokens ligados a elas estão na cena, e o dano que ele dá num desses tokens tem de ir para a ficha
-- (é a ficha que manda nas barras: sem isso, o que ele fez seria desfeito quando o mestre abrisse a mesa).
-- Esta função grava só isso, "às cegas": o valor atual e a sobrevida das barras que a ficha tem. Não devolve nada da
-- ficha, e só vale para quem mestra as Cenas.
create or replace function public.barras_do_token(p_mesa uuid, p_id text, p_rec jsonb, p_sob jsonb default null)
returns table (rev bigint, rev_ant bigint)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ficha jsonb; v_estado jsonb; v_ids text[]; v_rec jsonb; v_sob jsonb; k text; v jsonb;
begin
  if not privado.mestra(p_mesa, 'cenas') then raise exception 'Só o mestre mexe nas barras de uma ficha pelo token.'; end if;
  if p_rec is null or jsonb_typeof(p_rec) <> 'object' or (p_sob is not null and jsonb_typeof(p_sob) <> 'object') then
    raise exception 'Mudança de barras inválida.';
  end if;
  select p.ficha, p.estado into v_ficha, v_estado
    from public.personagens p where p.mesa_id = p_mesa and p.id = p_id and not p.apagado for update;
  if not found then return; end if;
  -- só as barras que a ficha tem (nada de chave inventada no estado dela)
  select coalesce(array_agg(r ->> 'id'), '{}'::text[]) into v_ids
    from jsonb_array_elements(case when jsonb_typeof(v_ficha -> 'recursos') = 'array' then v_ficha -> 'recursos' else '[]'::jsonb end) r
   where jsonb_typeof(r) = 'object' and (r ->> 'id') is not null;
  v_estado := case when jsonb_typeof(v_estado) = 'object' then v_estado else '{}'::jsonb end;
  v_rec := case when jsonb_typeof(v_estado -> 'rec') = 'object' then v_estado -> 'rec' else '{}'::jsonb end;
  v_sob := case when jsonb_typeof(v_estado -> 'sob') = 'object' then v_estado -> 'sob' else '{}'::jsonb end;
  for k, v in select * from jsonb_each(p_rec) loop
    if k = any (v_ids) and jsonb_typeof(v) = 'number' then v_rec := jsonb_set(v_rec, array[k], v, true); end if;
  end loop;
  if p_sob is not null then
    for k, v in select * from jsonb_each(p_sob) loop
      if k = any (v_ids) then
        if jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric > 0 then v_sob := jsonb_set(v_sob, array[k], v, true);
        else v_sob := v_sob - k;                              -- sem sobrevida: a chave sai
        end if;
      end if;
    end loop;
  end if;
  return query
    update public.personagens p
       set estado = jsonb_set(jsonb_set(v_estado, '{rec}', v_rec, true), '{sob}', v_sob, true)
     where p.mesa_id = p_mesa and p.id = p_id
    returning p.rev, p.rev_ant;
end $function$;
revoke all on function public.barras_do_token(uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.barras_do_token(uuid, text, jsonb, jsonb) to authenticated;
