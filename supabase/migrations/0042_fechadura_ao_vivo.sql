-- ============================================================================================
-- Tiny Cats · a fechadura ao vivo (lote 137, pedido do Bruno)
-- Enquanto o jogador mexe na fechadura (o puzzle de gazuas), o movimento vai como mensagem pequena por um canal privado
-- do Realtime, sem gravar nada: fechv:<mesa>. No Escudo, em "Ver como está", o mestre vê a fechadura mexendo.
-- Quem lê e quem manda: os membros da mesa (o jogador manda; o mestre lê). Nada aqui é segredo: é só a posição da
-- gazua e dos pinos (o ponto certo da fechadura não vai). Num banco sem Realtime (o local de ensaio), não faz nada.
-- ============================================================================================
do $migracao$
begin
  if to_regclass('realtime.messages') is null then return; end if;

  execute $f$
    create or replace function privado.fech_vivo_ok(t text) returns boolean
    language plpgsql stable security invoker set search_path = '' as $c$
    declare p text[] := string_to_array(t, ':');
    begin
      if array_length(p, 1) <> 2 or p[1] <> 'fechv' or p[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
      return privado.e_membro(p[2]::uuid);
    end $c$
  $f$;
  grant execute on function privado.fech_vivo_ok(text) to authenticated;

  execute 'drop policy if exists fech_vivo_ler on realtime.messages';
  execute 'drop policy if exists fech_vivo_mandar on realtime.messages';
  execute $p$
    create policy fech_vivo_ler on realtime.messages for select to authenticated
    using (extension = 'broadcast' and privado.fech_vivo_ok((select realtime.topic())))
  $p$;
  execute $p$
    create policy fech_vivo_mandar on realtime.messages for insert to authenticated
    with check (extension = 'broadcast' and privado.fech_vivo_ok((select realtime.topic())))
  $p$;
end
$migracao$;
