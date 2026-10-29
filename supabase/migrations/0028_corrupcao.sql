-- LOTE 37 (A CORRUPÇÃO DAS FICHAS): a corrupção de cada personagem (vampírica, licantropa ou demoníaca).
-- Ela mora no documento "fichas:corr:<id do personagem>": o mestre escreve, com o dono do personagem como dono do
-- documento — e por isso só o dono e quem mestra as Fichas o recebem (a regra de leitura de sempre: o que é seu e o
-- que é da mesa). Os outros jogadores não veem a corrupção de ninguém: nem na ficha, nem no retrato, nem na aura do
-- token nas Cenas.
-- O que esta migração acrescenta é a tranca: o dono de um documento pode mudá-lo (é a regra de sempre, para o pedido
-- da cena), mas a corrupção quem muda é só quem mestra as Fichas; e ela fica sempre fora da mesa (vis = 'mestre').
-- Tudo aqui é acréscimo: sem esta migração, a corrupção funciona do mesmo jeito (só sem a tranca). Pode rodar mais de
-- uma vez.

create or replace function privado.corr_guarda()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and not privado.mestra_doc(new.mesa_id, new.id) then
    raise exception 'A corrupção de um personagem só quem mestra as Fichas muda.';
  end if;
  if new.vis is distinct from 'mestre' then
    raise exception 'A corrupção fica só com o dono do personagem e com quem mestra (nunca com a mesa toda).';
  end if;
  return new;
end $function$;
revoke all on function privado.corr_guarda() from public, anon, authenticated;

drop trigger if exists documentos_corr_guarda on public.documentos;
create trigger documentos_corr_guarda before insert or update on public.documentos for each row when (new.id like 'fichas:corr:%') execute function privado.corr_guarda();
