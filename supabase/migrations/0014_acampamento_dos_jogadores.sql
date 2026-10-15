-- LOTE 5, PARTE 3 (ACAMPAMENTO)
-- O mestre deixa um jogador mexer no acampamento (no menu da mesa, em Permissões): as provisões, a estrutura, a
-- caravana, os lugares e as áreas, o diário. O descanso, as regras e os momentos — e o nome, a hora, quem está no
-- acampamento, os bônus, o lugar e o clima — continuam só com quem mestra o acampamento.
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração.

-- 1) A permissão, pessoa por pessoa ---------------------------------------------------------------------------------
alter table public.mesa_membros add column if not exists acamp boolean not null default false;
comment on column public.mesa_membros.acamp is 'O mestre deixou esta pessoa mexer no acampamento (quase tudo: o descanso, as regras e os momentos ficam com quem mestra).';

-- 2) Quem mexe no documento do acampamento sem mestrar a aba: quem tem a permissão — no acampamento da mesa, ou no de
--    uma campanha de que participa (acampamento@<campanha>). Criar o documento continua sendo de quem mestra.
create or replace function privado.edita_acamp(m uuid, i text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select (i = 'acampamento' or i like 'acampamento@%')
     and exists (select 1 from public.mesa_membros mm where mm.mesa_id = m and mm.usuario_id = (select auth.uid()) and mm.acamp)
     and (position('@' in i) = 0 or privado.na_campanha(m, split_part(i, '@', 2)));
$function$;
revoke all on function privado.edita_acamp(uuid, text) from public, anon;
grant execute on function privado.edita_acamp(uuid, text) to authenticated;

alter policy documentos_editar on public.documentos
  using (privado.doc_aberto(mesa_id, id) and (privado.mestra_doc(mesa_id, id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())) or privado.edita_acamp(mesa_id, id)))
  with check (privado.doc_aberto(mesa_id, id) and (privado.mestra_doc(mesa_id, id) or (privado.e_membro(mesa_id) and dono_id = (select auth.uid())) or privado.edita_acamp(mesa_id, id)));

-- 3) As partes do mestre: quem grava o acampamento sem mestrar a aba não muda nenhuma delas (o site já não deixa; aqui
--    o banco confere). Dono, visibilidade, campanha e apagar já são conferidos por privado.tocar.
create or replace function privado.acamp_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare k text;
begin
  if (select auth.uid()) is null or not (old.id = 'acampamento' or old.id like 'acampamento@%') or privado.mestra_doc(old.mesa_id, old.id) then
    return new;
  end if;
  foreach k in array array['nome', 'hora', 'fundo', 'cena', 'presentes', 'autoVistos', 'roda', 'regras', 'bonus', 'emo', 'lugar', 'clima'] loop
    if (new.dados -> k) is distinct from (old.dados -> k) then
      raise exception 'Só o mestre muda isso no acampamento (%).', k;
    end if;
  end loop;
  return new;
end $function$;
revoke all on function privado.acamp_guarda() from public;
drop trigger if exists documentos_acamp_guarda on public.documentos;
create trigger documentos_acamp_guarda before update on public.documentos for each row execute function privado.acamp_guarda();

-- 4) Dar e tirar a permissão: só o mestre da mesa (como nomear o auxiliar) --------------------------------------------
create or replace function public.acamp_do_jogador(p_mesa uuid, p_usuario uuid, p_pode boolean)
returns public.mesa_membros
language plpgsql
security definer
set search_path to ''
as $function$
declare v_linha public.mesa_membros;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre da mesa dá o acampamento a alguém.'; end if;
  update public.mesa_membros mm set acamp = coalesce(p_pode, false)
   where mm.mesa_id = p_mesa and mm.usuario_id = p_usuario and mm.papel <> 'mestre'
  returning mm.* into v_linha;
  if not found then raise exception 'Essa pessoa não participa desta mesa (ou é o mestre).'; end if;
  return v_linha;
end $function$;
revoke all on function public.acamp_do_jogador(uuid, uuid, boolean) from public, anon;
grant execute on function public.acamp_do_jogador(uuid, uuid, boolean) to authenticated;
