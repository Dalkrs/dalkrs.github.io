-- ============================================================================================
-- Tiny Cats · o quadro de pistas de quem joga (lote 143)
-- Cada jogador monta os quadros dele (o mural de cortiça com cartões e fios) para organizar as pistas, as missões e a
-- linha de pensamento da saga: quadroj:<ele>:<id>, com ele como dono, que só ele e o mestre veem (vis 'mestre').
-- O ver e o editar já valem (o dono lê e edita o que é dele; o mestre lê tudo). Aqui, o criar.
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
        )
      )
    )
  );
