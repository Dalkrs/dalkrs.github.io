-- LOTE 6, PARTE 4 (ÁRVORE): o aviso que o mestre manda só para um jogador.
-- Quando o mestre abre um caminho trancado da árvore para um personagem, o dono dele recebe uma linha na mesa ao vivo
-- que só ele (e quem a escreveu) vê: a linha fica em segredo (secreta) e diz para quem é (para). Até aqui, uma linha em
-- segredo era só de quem a escreveu. Só quem mestra escreve uma linha "para" alguém, e ela é sempre em segredo.
-- O resto das regras da mesa ao vivo continua igual (as campanhas; a mesa ao vivo fechada para um jogador, que
-- continua vendo as linhas dele — e agora também as que são para ele). Para quem a linha vai não muda depois (a coluna
-- fica fora do que se pode atualizar).
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

alter table public.registro add column if not exists para uuid;
comment on column public.registro.para is 'Linha em segredo endereçada: além de quem a escreveu, só esta pessoa a vê. Quem escreve é quem mestra (ex.: o caminho da árvore aberto para o personagem dela).';

alter policy registro_ver on public.registro
  using (privado.e_membro(mesa_id)
         and (not secreta or autor_id = (select auth.uid()) or para = (select auth.uid()))
         and privado.ve_campanha(mesa_id, campanha)
         and (autor_id = (select auth.uid()) or para = (select auth.uid()) or not privado.vivo_fechado(mesa_id)));

alter policy registro_escrever on public.registro
  with check (
    privado.e_membro(mesa_id) and autor_id = (select auth.uid()) and (not secreta or privado.mestrando(mesa_id))
    and (para is null or (secreta and privado.mestrando(mesa_id)))
    and privado.campanha_aberta(mesa_id, campanha)
    and (campanha is null or privado.mestrando(mesa_id) or privado.na_campanha(mesa_id, campanha))
  );
