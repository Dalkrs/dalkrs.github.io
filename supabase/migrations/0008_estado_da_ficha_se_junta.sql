-- 1) Cada gravação passa a dizer qual era a revisão da linha logo antes dela (rev_ant). Quem gravou compara com a
--    revisão que tinha em mãos: se não for a mesma, outra pessoa mexeu na linha nesse meio-tempo, e ele a lê de novo.
alter table public.personagens add column if not exists rev_ant bigint;
alter table public.documentos add column if not exists rev_ant bigint;

create or replace function privado.tocar()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' then
    new.mesa_id := old.mesa_id; new.id := old.id;
    new.rev_ant := old.rev;
    if v_uid is not null and not privado.e_mestre(old.mesa_id) then
      if new.dono_id is distinct from old.dono_id or new.vis is distinct from old.vis or new.apagado is distinct from old.apagado then
        raise exception 'Só o mestre troca o dono, a visibilidade ou apaga.';
      end if;
    end if;
  else
    new.rev_ant := null;
  end if;
  new.rev := nextval('privado.rev_seq');
  new.atualizado_em := now();
  new.atualizado_por := v_uid;
  return new;
end $function$;

-- 2) Juntar uma mudança a um JSON (o "JSON Merge Patch", RFC 7396): objeto se junta chave por chave, null apaga a
--    chave, qualquer outro valor (número, texto, lista) troca o que havia. A profundidade é limitada.
create or replace function privado.juntar_json(alvo jsonb, muda jsonb, fundo integer default 0)
returns jsonb
language plpgsql
immutable
set search_path to ''
as $function$
declare saida jsonb; k text; v jsonb;
begin
  if muda is null then return alvo; end if;
  if jsonb_typeof(muda) <> 'object' or fundo >= 8 then return muda; end if;
  saida := case when jsonb_typeof(alvo) = 'object' then alvo else '{}'::jsonb end;
  for k, v in select * from jsonb_each(muda) loop
    if jsonb_typeof(v) = 'null' then
      saida := saida - k;
    else
      saida := jsonb_set(saida, array[k], privado.juntar_json(saida -> k, v, fundo + 1), true);
    end if;
  end loop;
  return saida;
end $function$;
revoke all on function privado.juntar_json(jsonb, jsonb, integer) from public, anon;
grant execute on function privado.juntar_json(jsonb, jsonb, integer) to authenticated;

-- 3) O estado atual de um personagem (pontos das barras, sobrevida, bolsas, bônus temporários…) é gravado como
--    diferença: só as chaves que quem gravou mexeu. O mestre mexendo numa barra pelo token e o jogador mexendo em outra
--    pela ficha, no mesmo instante, ficam os dois valendo. Roda com as permissões de quem chama: as regras de acesso
--    da tabela continuam decidindo quem pode alterar a linha (quem não pode não altera nada, e nada volta).
create or replace function public.estado_juntar(p_mesa uuid, p_id text, p_mudas jsonb)
returns table (rev bigint, rev_ant bigint)
language plpgsql
security invoker
set search_path to ''
as $function$
declare m jsonb; novo jsonb;
begin
  if p_mudas is null or jsonb_typeof(p_mudas) <> 'array' or jsonb_array_length(p_mudas) > 200 then
    raise exception 'Mudança de estado inválida.';
  end if;
  select p.estado into novo from public.personagens p where p.mesa_id = p_mesa and p.id = p_id for update;
  if not found then return; end if;
  for m in select * from jsonb_array_elements(p_mudas) loop
    if jsonb_typeof(m) <> 'object' then raise exception 'Mudança de estado inválida.'; end if;
    novo := privado.juntar_json(novo, m);
  end loop;
  return query
    update public.personagens p set estado = novo
     where p.mesa_id = p_mesa and p.id = p_id
    returning p.rev, p.rev_ant;
end $function$;
revoke all on function public.estado_juntar(uuid, text, jsonb) from public, anon;
grant execute on function public.estado_juntar(uuid, text, jsonb) to authenticated;
