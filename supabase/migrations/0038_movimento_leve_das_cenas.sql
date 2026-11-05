-- ============================================================================================
-- Tiny Cats · o movimento leve das Cenas (lote 92)
-- O que muda nos tokens vai ao vivo, como uma mensagem pequena, por canais privados do Realtime:
--   cenap:<mesa>:<campanha|mundo>  o que os jogadores recebem (a diferença da projeção, sem nada só do mestre)
--   cenam:<mesa>                   o que os aparelhos de quem mestra recebem (a diferença da cena inteira)
-- Quem manda em qualquer um deles é só quem mestra as Cenas. Quem lê: cenam, quem mestra; cenap, os membros da mesa que
-- veem a campanha. Num banco sem Realtime (o local de ensaio) esta migração não faz nada.
-- ============================================================================================
do $migracao$
begin
  if to_regclass('realtime.messages') is null then return; end if;

  execute $f$
    create or replace function privado.cena_leve_le(t text) returns boolean
    language plpgsql stable security invoker set search_path = '' as $c$
    declare p text[] := string_to_array(t, ':'); m uuid;
    begin
      if p[1] not in ('cenap', 'cenam') or p[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
      m := p[2]::uuid;
      if p[1] = 'cenam' then return array_length(p, 1) = 2 and privado.mestra_doc(m, 'cena:x'); end if;
      if array_length(p, 1) <> 3 or not privado.e_membro(m) then return false; end if;
      return p[3] = 'mundo' or privado.mestra_doc(m, 'cena:x') or privado.ve_campanha(m, p[3]);
    end $c$
  $f$;
  execute $f$
    create or replace function privado.cena_leve_manda(t text) returns boolean
    language plpgsql stable security invoker set search_path = '' as $c$
    declare p text[] := string_to_array(t, ':');
    begin
      if p[1] not in ('cenap', 'cenam') or p[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
      return privado.mestra_doc(p[2]::uuid, 'cena:x');
    end $c$
  $f$;
  grant execute on function privado.cena_leve_le(text), privado.cena_leve_manda(text) to authenticated;

  execute 'drop policy if exists cena_leve_ler on realtime.messages';
  execute 'drop policy if exists cena_leve_mandar on realtime.messages';
  execute $p$
    create policy cena_leve_ler on realtime.messages for select to authenticated
    using (extension = 'broadcast' and privado.cena_leve_le((select realtime.topic())))
  $p$;
  execute $p$
    create policy cena_leve_mandar on realtime.messages for insert to authenticated
    with check (extension = 'broadcast' and privado.cena_leve_manda((select realtime.topic())))
  $p$;
end
$migracao$;
