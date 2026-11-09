-- Tiny Cats · 0041 · as bases: a casa e o esconderijo (lote 125)
-- A aba Acampamento virou Bases: além do acampamento do grupo ("acampamento" / "acampamento@<campanha>"), cada campanha
-- pode ter casas e esconderijos, um documento cada: "acampamento:base:<id>" (ou "acampamento:base:<id>@<campanha>").
-- Quem mestra o Acampamento cria e apaga as bases (isso já valia: privado.aba_do_doc manda "acampamento:%" para a aba
-- Acampamento). A base de um personagem nasce com o jogador dele como dono do documento; a base do grupo, sem dono.
--   · o dono mexe na base dele (a regra do dono, que já existia), e quem tem o acampamento (mesa_membros.acamp) mexe nas
--     bases do grupo — mas nenhum dos dois muda as partes do mestre: as de sempre e as da base (o tipo, o esconderijo, o
--     nível, os níveis, a exposição, as faixas, o dono e onde fica). O gatilho privado.acamp_guarda confere;
--   · a base que é segredo (vis 'mestre') só o dono e o mestre veem (a regra de ver, que já existia).
-- O que muda: privado.edita_acamp (as bases do grupo), a regra de editar documentos (a da 0040, com a base de um
-- personagem fora do alcance de quem tem o acampamento) e privado.acamp_guarda (as bases e as partes novas).
-- Rodar uma vez no SQL Editor, depois da 0040.

-- 1) Quem tem o acampamento mexe também nas bases (as do grupo: a regra de editar, abaixo, confere o dono) ------------
create or replace function privado.edita_acamp(m uuid, i text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select (i = 'acampamento' or i like 'acampamento@%' or i like 'acampamento:base:%')
     and exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()) and mm.acamp)
     and (position('@' in i) = 0 or privado.na_campanha(m, split_part(i, '@', 2)));
$function$;
revoke all on function privado.edita_acamp(uuid, text) from public, anon;
grant execute on function privado.edita_acamp(uuid, text) to authenticated;

-- 2) Editar: o que já valia; quem tem o acampamento não mexe na base que tem dono (a de um personagem) --------------
alter policy documentos_editar on public.documentos
  using (privado.doc_aberto(mesa_id, id)
         and (privado.mestra_doc(mesa_id, id)
              or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
              or (privado.edita_acamp(mesa_id, id) and (dono_id is null or id not like 'acampamento:base:%'))
              or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
              or (id like 'mural:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
              or ((id = 'fichas:mis:quadro' or id like 'fichas:mis:quadro@%') and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))))
  with check (privado.doc_aberto(mesa_id, id)
              and (privado.mestra_doc(mesa_id, id)
                   or (privado.e_membro(mesa_id) and dono_id = (select auth.uid()))
                   or (privado.edita_acamp(mesa_id, id) and (dono_id is null or id not like 'acampamento:base:%'))
                   or (id like 'notasg:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
                   or (id like 'mural:%' and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))
                   or ((id = 'fichas:mis:quadro' or id like 'fichas:mis:quadro@%') and vis = 'mesa' and privado.e_membro(mesa_id) and privado.ve_campanhas(mesa_id, campanhas))));

-- 3) As partes do mestre: no acampamento e nas bases, quem não mestra não muda nenhuma delas ---------------------------
create or replace function privado.acamp_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare k text;
begin
  if (select auth.uid()) is null or not (old.id = 'acampamento' or old.id like 'acampamento@%' or old.id like 'acampamento:base:%') or privado.mestra_doc(old.mesa_id, old.id) then
    return new;
  end if;
  foreach k in array array['nome', 'hora', 'fundo', 'cena', 'presentes', 'autoVistos', 'roda', 'regras', 'bonus', 'emo', 'lugar', 'clima',
                           'tipo', 'esc', 'nivel', 'niveis', 'exp', 'faixas', 'dono', 'mapa'] loop
    if (new.dados -> k) is distinct from (old.dados -> k) then
      raise exception 'Só o mestre muda isso no acampamento (%).', k;
    end if;
  end loop;
  return new;
end $function$;
revoke all on function privado.acamp_guarda() from public;
