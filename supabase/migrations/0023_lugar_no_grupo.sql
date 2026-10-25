-- Tiny Cats · o jogador muda o lugar das fichas do grupo dele (lote 27)
-- Ativos, Inativos ou Toldo (estado.ativo = false para os dois de fora; estado.toldo = true para o Toldo). O mestre já
-- mudava; agora o jogador também, nas fichas do grupo dele: a ficha dele, as fichas que estão no mesmo grupo que uma
-- ficha dele (na mesma campanha), os NPCs do background dele (ficha.fundo.de) e os pets de qualquer uma dessas. Muda
-- só o lugar — nada mais da ficha. A qualquer hora, sem aviso; numa campanha encerrada, não.

create or replace function privado.do_meu_grupo(m uuid, p_id text, fundo integer default 0)
returns boolean language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); v public.personagens;
begin
  if v_uid is null or fundo > 2 then return false; end if;
  select * into v from public.personagens p where p.mesa_id = m and p.id = p_id and not p.apagado;
  if not found then return false; end if;
  if v.dono_id = v_uid or (v.ficha -> 'fundo' ->> 'de') = v_uid::text then return true; end if;
  if coalesce(v.ficha ->> 'grupo', '') <> '' and exists (
       select 1 from public.personagens y
        where y.mesa_id = m and y.dono_id = v_uid and not y.apagado
          and y.campanha is not distinct from v.campanha and (y.ficha ->> 'grupo') = (v.ficha ->> 'grupo')) then
    return true;
  end if;
  -- o pet de uma ficha do grupo
  if coalesce(v.ficha ->> 'petDe', '') <> '' then return privado.do_meu_grupo(m, v.ficha ->> 'petDe', fundo + 1); end if;
  return false;
end $$;

create or replace function public.lugar_no_grupo(p_mesa uuid, p_id text, p_lugar text)
returns table(rev bigint, rev_ant bigint) language plpgsql security definer set search_path to '' as $$
declare v public.personagens; v_est jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if p_lugar is null or p_lugar not in ('ativo', 'inativo', 'toldo') then raise exception 'Lugar desconhecido.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  select * into v from public.personagens p where p.mesa_id = p_mesa and p.id = p_id and not p.apagado for update;
  if not found then raise exception 'Essa ficha não existe mais.'; end if;
  if not privado.campanha_aberta(p_mesa, v.campanha) then raise exception 'Esta campanha está encerrada: só consulta.'; end if;
  if not (privado.mestra(p_mesa, 'fichas') or privado.do_meu_grupo(p_mesa, p_id)) then
    raise exception 'Essa ficha não é do seu grupo.';
  end if;
  v_est := (case when jsonb_typeof(v.estado) = 'object' then v.estado else '{}'::jsonb end) - 'ativo' - 'toldo';
  if p_lugar <> 'ativo' then v_est := v_est || '{"ativo": false}'::jsonb; end if;
  if p_lugar = 'toldo' then v_est := v_est || '{"toldo": true}'::jsonb; end if;
  return query update public.personagens p set estado = v_est where p.mesa_id = p_mesa and p.id = p_id returning p.rev, p.rev_ant;
end $$;
revoke all on function public.lugar_no_grupo(uuid, text, text) from public, anon;
grant execute on function public.lugar_no_grupo(uuid, text, text) to authenticated;
comment on function public.lugar_no_grupo(uuid, text, text) is 'Ativos, Inativos ou Toldo: o mestre, qualquer ficha; o jogador, as do grupo dele (privado.do_meu_grupo).';
