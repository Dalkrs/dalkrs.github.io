-- Tiny Cats · 0045 · os bônus da conta (lote 163)
-- O que o jogador ganha por zerar uma campanha fica no documento "bonus:<id da conta>", vis 'mestre', com o jogador de
-- dono: só ele e quem mestra veem (a regra de ver, que já existia). Quem mestra cria e muda à vontade (dar, tirar). O
-- jogador, que é o dono, pode mudar — mas só para gastar: nenhuma quantidade sobe, o documento não troca de dono nem
-- de nome, e a história não encolhe. O jogador não cria o documento (a regra de criar não o deixa).
-- Rodar uma vez no SQL Editor, depois da 0044.

create or replace function privado.bonus_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  k text;
  v jsonb;
  antes int;
begin
  if new.id not like 'bonus:%' then return new; end if;
  if new.dono_id is null or new.id <> 'bonus:' || new.dono_id::text or new.vis <> 'mestre' then
    raise exception 'O documento de bônus é da conta do jogador (bonus:<conta>, só o mestre e ele veem).';
  end if;
  if pg_column_size(new.dados) > 100000 then
    raise exception 'O documento de bônus ficou grande demais.';
  end if;
  if privado.mestra_doc(new.mesa_id, new.id) then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'Só o mestre dá bônus.';
  end if;
  -- o jogador: só gasta
  for k, v in select * from jsonb_each(coalesce(new.dados -> 'n', '{}'::jsonb)) loop
    antes := coalesce((old.dados -> 'n' ->> k)::int, 0);
    if jsonb_typeof(v) <> 'number' or v::text::numeric > antes then
      raise exception 'Só o mestre dá bônus.';
    end if;
  end loop;
  if jsonb_array_length(coalesce(new.dados -> 'hist', '[]'::jsonb)) < least(jsonb_array_length(coalesce(old.dados -> 'hist', '[]'::jsonb)), 200) then
    raise exception 'A história dos bônus não se apaga.';
  end if;
  return new;
end;
$function$;
revoke all on function privado.bonus_guarda() from public, anon;
drop trigger if exists documentos_bonus_guarda on public.documentos;
create trigger documentos_bonus_guarda before insert or update on public.documentos
  for each row when (new.id like 'bonus:%') execute function privado.bonus_guarda();
