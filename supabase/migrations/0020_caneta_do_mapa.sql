-- Tiny Cats · lote 17: a caneta do Mapa-múndi (o desenho de agora, que todos na mesa veem).
--   · mundo:rabisco:<usuário> — os traços de uma pessoa no mapa. Ela é a dona e a mesa inteira lê (vis = 'mesa'). O
--     jogador cria e muda o dele; quem mestra o Mapa-múndi muda o de todos (para limpar os desenhos). Ninguém troca o
--     dono nem a visibilidade (privado.tocar já confere isso).
--   · Um tamanho máximo para esse documento, para a caneta não encher o banco.
-- Pode rodar mais de uma vez.

-- 1) O jogador cria o documento da caneta dele --------------------------------------------------------------------
--    (a mesma regra da 0017, com a caneta no fim)
alter policy documentos_criar on public.documentos
  with check (
    privado.doc_aberto(mesa_id, id)
    and (privado.mestra_doc(mesa_id, id)
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado
             and (id = 'cena:pedido:' || (select auth.uid())::text
                  or (id = 'jornal:cartas:' || (select auth.uid())::text and vis = 'mestre')
                  or (id like 'medit:pratica:%' and vis = 'mestre'
                      and privado.dono_do_personagem(mesa_id, substr(id, 15)) = (select auth.uid()))
                  or (id = 'mundo:rabisco:' || (select auth.uid())::text and vis = 'mesa'))))
  );

-- 2) O tamanho máximo dos desenhos ---------------------------------------------------------------------------------
create or replace function privado.rabisco_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id like 'mundo:rabisco:%' and pg_column_size(new.dados) > 2000000 then
    raise exception 'Os desenhos da caneta passaram do tamanho máximo. Limpe alguns traços.';
  end if;
  return new;
end $function$;
revoke all on function privado.rabisco_guarda() from public;
drop trigger if exists documentos_rabisco_guarda on public.documentos;
create trigger documentos_rabisco_guarda before insert or update on public.documentos for each row execute function privado.rabisco_guarda();
