-- (lote 198) Os pontos extraordinários: skills.extra = [{ id, pid, n, motivo, em }], que só o mestre da mesa escreve.
-- Quem não é o mestre (o jogador, na ficha dele) não muda essa lista: o banco devolve a que estava (sem erro, para a
-- gravação do resto da ficha seguir). Gravações sem usuário (o próprio banco, migrações) passam.
create or replace function privado.extra_guarda()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  antes jsonb := case when tg_op = 'UPDATE' then old.skills -> 'extra' else null end;
begin
  if (select auth.uid()) is null or privado.e_mestre(new.mesa_id) then return new; end if;
  if new.skills is null then return new; end if;
  if (new.skills -> 'extra') is distinct from antes then
    if antes is null then new.skills := new.skills - 'extra';
    else new.skills := jsonb_set(new.skills, '{extra}', antes); end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists personagens_extra_guarda on public.personagens;
create trigger personagens_extra_guarda before insert or update on public.personagens
  for each row execute function privado.extra_guarda();
