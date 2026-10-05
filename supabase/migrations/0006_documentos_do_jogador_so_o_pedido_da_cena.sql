-- O jogador só cria um tipo de documento na mesa: o pedido dele para a cena que está no ar
-- (cena:pedido:<o próprio usuário>). Todos os outros documentos são escritos pelo mestre.
-- Antes, um jogador podia criar um documento com qualquer nome que ainda não existisse (por exemplo o índice das
-- cenas de uma mesa nova) e ficar como dono dele. Os sistemas já ignoram documentos com dono; esta é a tranca no banco.
alter policy documentos_criar on public.documentos
  with check (
    privado.e_mestre(mesa_id)
    or (
      privado.e_membro(mesa_id)
      and dono_id = (select auth.uid())
      and not apagado
      and id = 'cena:pedido:' || ((select auth.uid()))::text
    )
  );
