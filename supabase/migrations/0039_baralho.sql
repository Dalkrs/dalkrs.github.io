-- Lote 105: o Baralho (as cartas da Cartomante).
-- 1) quem joga cria o baralho do próprio personagem (baralho:pc:<personagem>, só ele e o mestre veem);
-- 2) a carta jogada vai para a mesa ao vivo, com a origem 'baralho'.

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
        )
      )
    )
  );

alter table public.registro drop constraint registro_origem_check;
alter table public.registro add constraint registro_origem_check
  check (origem = any (array['mesa', 'rolador', 'ficha', 'cena', 'mundo', 'arvore', 'acampamento', 'meditacao', 'escudo', 'pistas', 'baralho']));
