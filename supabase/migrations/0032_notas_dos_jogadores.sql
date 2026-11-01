-- Tiny Cats · 0032 · o bloco de notas de quem joga (lote 52)
-- Dois cadernos novos, além do "notas:<id>" do mestre (que só ele vê):
--   · "notasj:<uid>:<id>" — o caderno de cada jogador. O dono é ele; vis 'mestre'. Ele lê e escreve; o mestre da mesa
--     também lê (privado.mestra_doc: um documento sem aba é só do mestre — nem o auxiliar). Os outros jogadores, não.
--   · "notasg:<id>" ou "notasg:<id>@<campanha>" — o caderno do grupo, vis 'mesa'. Quem participa da campanha (ou da
--     mesa, sem campanha) lê e escreve, inclusive o que outro escreveu; o mestre também. Dono, visibilidade e apagar
--     continuam com quem mestra (privado.tocar): quem joga "apaga" marcando o capítulo nos dados, e o site o esconde.
-- O que muda: as regras de criar e de editar documentos (acrescentando os dois casos às de antes, sem tirar nada) e um
-- tamanho máximo para cada capítulo. Rodar uma vez no SQL Editor.

-- 1) Criar: o jogador cria o capítulo do caderno dele e capítulos do caderno do grupo -------------------------------
alter policy documentos_criar on public.documentos
  with check (
    privado.doc_aberto(mesa_id, id)
    and (privado.mestra_doc(mesa_id, id)
         or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()) and not apagado
             and (id = 'cena:pedido:' || (select auth.uid())::text
                  or (id = 'jornal:cartas:' || (select auth.uid())::text and vis = 'mestre')
                  or (id like 'medit:pratica:%' and vis = 'mestre'
                      and privado.dono_do_personagem(mesa_id, substr(id, 15)) = (select auth.uid()))
                  or (id = 'mundo:rabisco:' || (select auth.uid())::text and vis = 'mesa')
                  -- (lote 52) o caderno do jogador
                  or (id like 'notasj:' || (select auth.uid())::text || ':%' and position('@' in id) = 0 and vis = 'mestre')
                  -- (lote 52) o caderno do grupo, numa campanha de quem escreve (ou do mundo)
                  or (id like 'notasg:%' and vis = 'mesa'
                      and (position('@' in id) = 0 or privado.ve_campanha(mesa_id, split_part(id, '@', 2)))))))
  );

-- 2) Editar: o que já valia, e o caderno do grupo para quem o vê ---------------------------------------------------
alter policy documentos_editar on public.documentos
  using (privado.doc_aberto(mesa_id, id)
         and (privado.mestra_doc(mesa_id, id)
              or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
              or privado.edita_acamp(mesa_id, id)
              or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))))
  with check (privado.doc_aberto(mesa_id, id)
              and (privado.mestra_doc(mesa_id, id)
                   or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
                   or privado.edita_acamp(mesa_id, id)
                   or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))));

-- 3) O tamanho de cada capítulo (o texto do site tem até uns 60 mil caracteres) ------------------------------------
create or replace function privado.notas_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if (new.id like 'notasj:%' or new.id like 'notasg:%') and pg_column_size(new.dados) > 300000 then
    raise exception 'Este capítulo ficou grande demais: divida em dois.';
  end if;
  return new;
end;
$function$;
revoke all on function privado.notas_guarda() from public, anon;
drop trigger if exists documentos_notas_guarda on public.documentos;
create trigger documentos_notas_guarda before insert or update on public.documentos for each row execute function privado.notas_guarda();
