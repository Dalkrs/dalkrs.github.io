-- Tiny Cats · 0040 · o quadro de missões (lote 123)
-- A aba Missões: cada campanha tem um quadro, o documento "fichas:mis:quadro@<campanha>" (ou "fichas:mis:quadro", numa
-- mesa sem campanhas), vis 'mesa', criado por quem mestra as Fichas. Quem participa da campanha (ou da mesa, sem
-- campanha) muda o quadro — pegar uma missão e desistir dela —, mas não cria nem apaga quadros, nem troca o dono ou a
-- visibilidade (isso continua com quem mestra: privado.tocar). Os rascunhos (fichas:mis:rasc…) são só de quem mestra; as
-- missões da história de um personagem (fichas:mis:pc:<personagem>) têm como dono quem joga o personagem, e a regra de
-- dono, que já existia, deixa ele desistir.
-- O que muda: a regra de editar documentos (a de antes, da 0033, e o quadro) e um tamanho máximo para o quadro.
-- Rodar uma vez no SQL Editor, depois da 0039.

-- 1) Editar: o que já valia, e o quadro para quem vê a campanha ------------------------------------------------------
alter policy documentos_editar on public.documentos
  using (privado.doc_aberto(mesa_id, id)
         and (privado.mestra_doc(mesa_id, id)
              or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
              or privado.edita_acamp(mesa_id, id)
              or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
              or (id like 'mural:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
              -- (lote 123) o quadro de missões
              or ((id = 'fichas:mis:quadro' or id like 'fichas:mis:quadro@%') and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))))
  with check (privado.doc_aberto(mesa_id, id)
              and (privado.mestra_doc(mesa_id, id)
                   or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
                   or privado.edita_acamp(mesa_id, id)
                   or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
                   or (id like 'mural:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
                   or ((id = 'fichas:mis:quadro' or id like 'fichas:mis:quadro@%') and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))));

-- 2) O tamanho do quadro (as imagens vão por endereço, não dentro do documento) --------------------------------------
create or replace function privado.quadro_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if (new.id = 'fichas:mis:quadro' or new.id like 'fichas:mis:quadro@%') and pg_column_size(new.dados) > 300000 then
    raise exception 'O quadro de missões ficou grande demais: apague algumas missões antigas.';
  end if;
  return new;
end;
$function$;
revoke all on function privado.quadro_guarda() from public, anon;
drop trigger if exists documentos_quadro_guarda on public.documentos;
create trigger documentos_quadro_guarda before insert or update on public.documentos for each row execute function privado.quadro_guarda();
