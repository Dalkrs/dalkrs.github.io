-- Tiny Cats · 0033 · o mural dos mistérios (lote 53)
-- O caso que o mestre abre à mesa tem um mural do grupo: o documento "mural:<caso>" (ou "mural:<caso>@<campanha>"),
-- vis 'mesa', criado por quem mestra o Escudo. Quem participa da campanha (ou da mesa, sem campanha) muda o mural — onde
-- está cada cartão, os fios, as notas e a acusação —, mas não cria nem apaga murais, nem troca o dono ou a visibilidade
-- (isso continua com quem mestra: privado.tocar). O resto do caso (escudo:caso, escudo:mpub) é só de quem mestra.
-- O que muda: a regra de editar documentos (a de antes, da 0032, e o mural) e um tamanho máximo para o mural.
-- Rodar uma vez no SQL Editor, depois da 0032.

-- 1) Editar: o que já valia, e o mural para quem vê o caso ---------------------------------------------------------
alter policy documentos_editar on public.documentos
  using (privado.doc_aberto(mesa_id, id)
         and (privado.mestra_doc(mesa_id, id)
              or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
              or privado.edita_acamp(mesa_id, id)
              or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
              -- (lote 53) o mural do caso
              or (id like 'mural:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))))
  with check (privado.doc_aberto(mesa_id, id)
              and (privado.mestra_doc(mesa_id, id)
                   or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
                   or privado.edita_acamp(mesa_id, id)
                   or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
                   or (id like 'mural:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))));

-- 2) O tamanho do mural -----------------------------------------------------------------------------------------------
create or replace function privado.mural_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id like 'mural:%' and pg_column_size(new.dados) > 200000 then
    raise exception 'O mural ficou grande demais: tire algumas notas.';
  end if;
  return new;
end;
$function$;
revoke all on function privado.mural_guarda() from public, anon;
drop trigger if exists documentos_mural_guarda on public.documentos;
create trigger documentos_mural_guarda before insert or update on public.documentos for each row execute function privado.mural_guarda();
