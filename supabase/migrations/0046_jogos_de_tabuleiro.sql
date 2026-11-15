-- ============================================================================================
-- Tiny Cats · 0046 · os Jogos de Tabuleiro (lote 167)
-- Uma partida entre duas pessoas da mesa são dois documentos, um de cada jogador: jogo:<partida>:<a conta dele>, com ele
-- de dono e vis 'mesa' (toda a mesa vê: é assim que se assiste). Cada um escreve só no seu (os lances dele, aceitar,
-- desistir, oferecer empate): o editar já vale para o dono. Aqui, o criar, e uma guarda para o nome, o dono, o vis e o
-- tamanho do documento.
-- Rodar uma vez no SQL Editor, depois da 0045.
-- ============================================================================================
alter policy documentos_criar on public.documentos
  with check (
    privado.doc_aberto(mesa_id, id) and (
      privado.mestra_doc(mesa_id, id) or (
        privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado and (
          id = 'cena:pedido:' || (select auth.uid())::text
          or (id = 'jornal:cartas:' || (select auth.uid())::text and vis = 'mestre')
          or (id like 'medit:pratica:%' and vis = 'mestre' and privado.dono_do_personagem(mesa_id, substr(id, 15)) = (select auth.uid()))
          or (id = 'mundo:rabisco:' || (select auth.uid())::text and vis = 'mesa')
          or (id like 'notasj:' || (select auth.uid())::text || ':%' and position('@' in id) = 0 and vis = 'mestre')
          or (id like 'notasg:%' and vis = 'mesa' and (position('@' in id) = 0 or privado.ve_campanha(mesa_id, split_part(id, '@', 2))))
          or (id like 'baralho:pc:%' and vis = 'mestre' and position('@' in id) = 0
              and privado.dono_do_personagem(mesa_id, substr(id, 12)) = (select auth.uid()))
          or (id like 'quadroj:' || (select auth.uid())::text || ':%' and position('@' in id) = 0 and vis = 'mestre')
          -- (lote 167) a parte de cada jogador numa partida dos Jogos de Tabuleiro
          or (id ~ '^jogo:[a-z0-9]{6,16}:' and id = split_part(id, ':', 1) || ':' || split_part(id, ':', 2) || ':' || (select auth.uid())::text and vis = 'mesa')
        )
      )
    )
  );

create or replace function privado.jogo_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id not like 'jogo:%' then return new; end if;
  if new.id !~ '^jogo:[a-z0-9]{6,16}:[0-9a-f-]{36}$' or new.dono_id is null or split_part(new.id, ':', 3) <> new.dono_id::text or new.vis <> 'mesa' then
    raise exception 'A parte de uma partida é jogo:<partida>:<a conta do jogador>, dele, e a mesa toda vê.';
  end if;
  if pg_column_size(new.dados) > 60000 then
    raise exception 'A partida ficou grande demais.';
  end if;
  return new;
end;
$function$;
revoke all on function privado.jogo_guarda() from public, anon;
drop trigger if exists documentos_jogo_guarda on public.documentos;
create trigger documentos_jogo_guarda before insert or update on public.documentos
  for each row execute function privado.jogo_guarda();

-- o fim de uma partida (e o começo) vai para a mesa ao vivo com a origem 'jogos'
alter table public.registro drop constraint registro_origem_check;
alter table public.registro add constraint registro_origem_check
  check (origem = any (array['mesa', 'rolador', 'ficha', 'cena', 'mundo', 'arvore', 'acampamento', 'meditacao', 'escudo', 'pistas', 'baralho', 'jogos']));
