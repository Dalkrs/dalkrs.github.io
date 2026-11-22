-- (lote 201) A conferência leve do que deixou de ser visível.
-- Quem não é o mestre confere de tempos em tempos se as linhas que tem na tela ainda existem para ele (o mestre pode ter
-- escondido uma ficha, ou apagado um documento). Antes, o site baixava a lista inteira de ids da mesa (cerca de 800
-- documentos, 70 KB) a cada 45 s. Agora ele manda os ids que tem, e o banco devolve só os que não pode mais ver — quase
-- sempre nenhum. A função roda com as regras de acesso de quem chama (security invoker): ela não mostra nada que a
-- pessoa não veria lendo a tabela.
create or replace function public.conferir_vivos(p_mesa uuid, p_tabela text, p_ids text[])
returns text[]
language plpgsql
stable
security invoker
set search_path to ''
as $function$
declare
  r text[];
begin
  if p_tabela not in ('documentos', 'personagens') then raise exception 'tabela não conferida: %', p_tabela; end if;
  if p_ids is null or cardinality(p_ids) = 0 then return '{}'; end if;
  if cardinality(p_ids) > 5000 then raise exception 'ids demais'; end if;
  execute format(
    'select coalesce(array_agg(x), ''{}''::text[]) from unnest($2) as x
      where not exists (select 1 from public.%I t where t.mesa_id = $1 and t.id = x and not t.apagado)', p_tabela)
    into r using p_mesa, p_ids;
  return r;
end;
$function$;

revoke all on function public.conferir_vivos(uuid, text, text[]) from public, anon;
grant execute on function public.conferir_vivos(uuid, text, text[]) to authenticated;
