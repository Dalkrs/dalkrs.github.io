-- LOTE 36 (O BESTIÁRIO DO CLÃ): o livro de caça de cada clã.
-- O mestre monta as páginas (à mão, na aba Bestiário do clã, ou enviando do Bestiário dele) e revela, parte por parte,
-- o que o clã já descobriu de cada criatura. Quem tem personagem nos cargos do clã lê o livro e escreve anotações na
-- margem, assinadas com o nome do personagem.
--   · cla:livro:<clã>            a capa: { v, on (liberado para o clã), titulo } — só quem mestra o Clã
--   · cla:livro:<clã>:p:<pág>    a página inteira, com o que o clã ainda não sabe — só quem mestra o Clã
--   · cla:lpub:<clã>             a capa que o clã vê — montada pelo banco, só com o livro liberado
--   · cla:lpub:<clã>:p:<pág>     a página que o clã vê: só as partes reveladas — montada pelo banco a cada mudança
--   · cla:lpub:<clã>:n:<pág>     as anotações do clã na página — quem escreve é a função livro_nota
-- O que o clã ainda não descobriu nunca sai do banco para os jogadores: a página deles não leva a parte escondida,
-- só o aviso de que ela existe. E os cla:lpub: de um clã só chegam a quem está nos cargos dele: a regra de leitura dos
-- documentos ganha esse caso (quem sai do clã deixa de ler; quem entra passa a ler, e o banco avisa os aparelhos).
-- Tudo aqui é acréscimo: o site de antes continua funcionando com o banco depois desta migração (sem ela, a aba
-- Bestiário do clã avisa que falta a atualização do banco). Pode rodar mais de uma vez.

-- 1) Quem lê o livro de um clã: quem tem personagem (não apagado) num cargo dele, num clã que não foi apagado ----------
create or replace function privado.ve_livro(p_mesa uuid, p_id text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select p_id like 'cla:lpub:%' and exists (
    select 1
      from public.documentos c
      join public.personagens p on p.mesa_id = c.mesa_id
     where c.mesa_id = p_mesa
       and c.id = 'cla:c:' || split_part(p_id, ':', 3)
       and not c.apagado
       and p.dono_id = (select auth.uid())
       and not p.apagado
       and jsonb_path_exists(c.dados, '$.cargos.*.gente[*] ? (@.pc == $pc)', jsonb_build_object('pc', p.id))
  );
$function$;
revoke all on function privado.ve_livro(uuid, text) from public, anon;
grant execute on function privado.ve_livro(uuid, text) to authenticated;

-- 2) A regra de leitura dos documentos: a de antes (a do lote 31, com o "só para alguns" das pistas), mais o livro do
--    clã para quem é do clã ---------------------------------------------------------------------------------------
alter policy documentos_ver on public.documentos
  using (
    privado.mestra_doc(mesa_id, id)
    or (privado.e_membro(mesa_id)
        and (dono_id = (select auth.uid())
             or (vis = 'mesa' and privado.ve_campanhas(mesa_id, campanhas))
             or (para is not null and (select auth.uid()) = any (para) and privado.ve_campanhas(mesa_id, campanhas))))
    or (id like 'cla:lpub:%' and privado.e_membro(mesa_id) and privado.ve_livro(mesa_id, id))
  );

-- 3) O que o clã vê: a capa e cada página, montadas a partir do que o mestre escreveu -------------------------------
-- (a página escondida, ou o livro trancado: o documento fica apagado e vazio)
create or replace function privado.livro_esconder(p_mesa uuid, p_id text)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  if exists (select 1 from public.documentos d where d.mesa_id = p_mesa and d.id = p_id and (not d.apagado or d.dados <> '{"v":1,"oculto":true}'::jsonb)) then
    perform set_config('tinycats.livro', 'sim', true);
    update public.documentos d set dados = '{"v":1,"oculto":true}'::jsonb, apagado = true where d.mesa_id = p_mesa and d.id = p_id;
    perform set_config('tinycats.livro', '', true);
  end if;
end $function$;

create or replace function privado.livro_gravar(p_mesa uuid, p_id text, p_dados jsonb)
returns void language plpgsql security definer set search_path to '' as $function$
begin
  perform set_config('tinycats.livro', 'sim', true);
  insert into public.documentos as d (mesa_id, id, vis, dados)
  values (p_mesa, p_id, 'mestre', p_dados)
  on conflict (mesa_id, id) do update set dados = excluded.dados, apagado = false, vis = 'mestre', dono_id = null
   where d.dados is distinct from excluded.dados or d.apagado or d.vis <> 'mestre' or d.dono_id is not null;
  perform set_config('tinycats.livro', '', true);
end $function$;

-- o livro está liberado para o clã?
create or replace function privado.livro_aberto(p_mesa uuid, p_cla text)
returns boolean language sql stable security definer set search_path to '' as $function$
  select coalesce((select not d.apagado and coalesce(d.dados -> 'on', 'false'::jsonb) = 'true'::jsonb
                     from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:livro:' || p_cla), false);
$function$;

create or replace function privado.livro_capa(p_mesa uuid, p_cla text)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_titulo jsonb;
begin
  if not privado.livro_aberto(p_mesa, p_cla) then
    perform privado.livro_esconder(p_mesa, 'cla:lpub:' || p_cla);
    return;
  end if;
  select coalesce(d.dados -> 'titulo', '""'::jsonb) into v_titulo from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:livro:' || p_cla;
  perform privado.livro_gravar(p_mesa, 'cla:lpub:' || p_cla, jsonb_build_object('v', 1, 'titulo', v_titulo));
end $function$;

/* A página que o clã vê (a mesma conta de projetar(), em livro/nucleo.js): o nome; cada parte revelada que tem
   conteúdo (a ilustração com a legenda, a descrição, o que sabemos, as fraquezas e resistências, o que deixa cair); e
   em "oc" as partes que existem mas o clã ainda não descobriu — sem o conteúdo delas. */
create or replace function privado.livro_pub(p_mesa uuid, p_cla text, p_pag text)
returns void language plpgsql security definer set search_path to '' as $function$
declare
  v_id text := 'cla:lpub:' || p_cla || ':p:' || p_pag;
  v_d jsonb; v_apagado boolean; v_ver jsonb; v_pub jsonb; v_oc jsonb := '[]'::jsonb; v_k text;
begin
  select d.dados, d.apagado into v_d, v_apagado from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:livro:' || p_cla || ':p:' || p_pag;
  if not found or v_apagado or jsonb_typeof(v_d) is distinct from 'object' or coalesce(v_d #> '{ver,pag}', 'false'::jsonb) <> 'true'::jsonb
     or not privado.livro_aberto(p_mesa, p_cla) then
    perform privado.livro_esconder(p_mesa, v_id);
    return;
  end if;
  v_ver := case when jsonb_typeof(v_d -> 'ver') = 'object' then v_d -> 'ver' else '{}'::jsonb end;
  v_pub := jsonb_build_object('v', 1, 'nome', coalesce(v_d -> 'nome', '""'::jsonb));
  -- a ilustração (com a legenda)
  if coalesce(nullif(v_d ->> 'img', ''), nullif(v_d ->> 'legenda', '')) is not null then
    if v_ver -> 'img' = 'true'::jsonb then v_pub := v_pub || jsonb_build_object('img', coalesce(v_d -> 'img', 'null'::jsonb), 'legenda', coalesce(v_d -> 'legenda', '""'::jsonb));
    else v_oc := v_oc || '["img"]'::jsonb; end if;
  end if;
  -- a descrição
  if nullif(v_d ->> 'desc', '') is not null then
    if v_ver -> 'desc' = 'true'::jsonb then v_pub := v_pub || jsonb_build_object('desc', v_d -> 'desc');
    else v_oc := v_oc || '["desc"]'::jsonb; end if;
  end if;
  -- as listas: o que sabemos, as fraquezas e resistências, o que deixa cair
  foreach v_k in array array['nums', 'fraq', 'saque'] loop
    if jsonb_typeof(v_d -> v_k) = 'array' and jsonb_array_length(v_d -> v_k) > 0 then
      if v_ver -> v_k = 'true'::jsonb then v_pub := v_pub || jsonb_build_object(v_k, v_d -> v_k);
      else v_oc := v_oc || jsonb_build_array(v_k); end if;
    end if;
  end loop;
  perform privado.livro_gravar(p_mesa, v_id, v_pub || jsonb_build_object('oc', v_oc));
end $function$;

-- A cada mudança no livro, o que o clã vê é montado de novo: a capa (e, quando ela é liberada ou trancada, todas as
-- páginas) ou só a página que mudou.
create or replace function privado.livro_projetar()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_p text[] := string_to_array(substr(new.id, 11), ':');
  v_pag text;
begin
  if coalesce(array_length(v_p, 1), 0) = 1 and v_p[1] ~ '^[A-Za-z0-9_-]{1,40}$' then
    perform privado.livro_capa(new.mesa_id, v_p[1]);
    if tg_op = 'INSERT' or (new.dados -> 'on') is distinct from (old.dados -> 'on') or new.apagado is distinct from old.apagado then
      for v_pag in
        select substr(d.id, char_length('cla:livro:' || v_p[1] || ':p:') + 1) from public.documentos d
         where d.mesa_id = new.mesa_id and starts_with(d.id, 'cla:livro:' || v_p[1] || ':p:')
      loop
        if v_pag ~ '^[A-Za-z0-9_-]{1,61}$' then perform privado.livro_pub(new.mesa_id, v_p[1], v_pag); end if;
      end loop;
    end if;
  elsif coalesce(array_length(v_p, 1), 0) = 3 and v_p[2] = 'p' and v_p[1] ~ '^[A-Za-z0-9_-]{1,40}$' and v_p[3] ~ '^[A-Za-z0-9_-]{1,61}$' then
    perform privado.livro_pub(new.mesa_id, v_p[1], v_p[3]);
  end if;
  return null;
end $function$;

-- O que o clã vê só o banco escreve; o livro inteiro fica só com quem mestra (sem dono, para o mestre).
create or replace function privado.livro_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id like 'cla:lpub:%' then
    if (select auth.uid()) is not null and coalesce(current_setting('tinycats.livro', true), '') <> 'sim' then
      raise exception 'O que o clã vê do livro é o próprio banco que monta, a partir das páginas do mestre.';
    end if;
  elsif new.id like 'cla:livro:%' and (new.vis is distinct from 'mestre' or new.dono_id is not null) then
    raise exception 'O livro inteiro fica só com quem mestra o Clã (o clã vê o que o mestre revela).';
  end if;
  return new;
end $function$;

-- Quem está nos cargos de um clã mudou (ou o clã foi apagado ou voltou): o livro dele é "tocado" (a revisão sobe),
-- para quem entrou receber as páginas que já existiam. Quem saiu deixa de ler na hora (a regra de leitura).
create or replace function privado.livro_membros()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_cla text := substr(new.id, 7);
  v_agora jsonb; v_antes jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(distinct x order by x), '[]'::jsonb) into v_agora from jsonb_path_query(new.dados, '$.cargos.*.gente[*].pc ? (@ != null)') x;
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(distinct x order by x), '[]'::jsonb) into v_antes from jsonb_path_query(old.dados, '$.cargos.*.gente[*].pc ? (@ != null)') x;
  end if;
  if v_agora is distinct from v_antes or (tg_op = 'UPDATE' and new.apagado is distinct from old.apagado) then
    perform set_config('tinycats.livro', 'sim', true);
    update public.documentos d set dados = d.dados
     where d.mesa_id = new.mesa_id and not d.apagado and (d.id = 'cla:lpub:' || v_cla or starts_with(d.id, 'cla:lpub:' || v_cla || ':'));
    perform set_config('tinycats.livro', '', true);
  end if;
  return null;
end $function$;

revoke all on function privado.livro_esconder(uuid, text), privado.livro_gravar(uuid, text, jsonb), privado.livro_aberto(uuid, text), privado.livro_capa(uuid, text),
  privado.livro_pub(uuid, text, text), privado.livro_projetar(), privado.livro_guarda(), privado.livro_membros() from public, anon, authenticated;

drop trigger if exists documentos_livro_guarda on public.documentos;
create trigger documentos_livro_guarda before insert or update on public.documentos for each row when (new.id like 'cla:l%') execute function privado.livro_guarda();
drop trigger if exists documentos_livro_projetar on public.documentos;
create trigger documentos_livro_projetar after insert or update on public.documentos for each row when (new.id like 'cla:livro:%') execute function privado.livro_projetar();
drop trigger if exists documentos_livro_membros on public.documentos;
create trigger documentos_livro_membros after insert or update on public.documentos for each row when (new.id like 'cla:c:%') execute function privado.livro_membros();

-- 4) As anotações na margem -------------------------------------------------------------------------------------------
/* p_op: 'criar' (p_texto; p_pc: o personagem que assina — dele, e nos cargos do clã; vazio, o primeiro), 'mudar'
   (p_nota, p_texto: só quem escreveu) ou 'apagar' (p_nota: quem escreveu, ou quem mestra o Clã). Só numa página que o
   clã vê. Devolve as anotações da página como ficaram. */
create or replace function public.livro_nota(p_mesa uuid, p_cla text, p_pag text, p_op text, p_nota text default null, p_texto text default null, p_pc text default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id text; v_mestre boolean; v_do_cla boolean; v_d jsonb; v_notas jsonb; v_nota jsonb; v_nome text; v_pc text; v_texto text; v_agora text; v_i int;
begin
  if v_uid is null then raise exception 'Entre na sua conta para anotar no livro.'; end if;
  if not privado.e_membro(p_mesa) then raise exception 'Você não participa desta mesa.'; end if;
  if coalesce(p_cla, '') !~ '^[A-Za-z0-9_-]{1,40}$' or coalesce(p_pag, '') !~ '^[A-Za-z0-9_-]{1,61}$' then raise exception 'Pedido desconhecido.'; end if;
  if not exists (select 1 from public.documentos d where d.mesa_id = p_mesa and d.id = 'cla:lpub:' || p_cla || ':p:' || p_pag and not d.apagado) then
    raise exception 'Esta página não está no livro do clã.';
  end if;
  v_mestre := privado.mestra_doc(p_mesa, 'cla:livro:' || p_cla);
  v_do_cla := privado.ve_livro(p_mesa, 'cla:lpub:' || p_cla);
  if not v_mestre and not v_do_cla then raise exception 'Só quem é do clã escreve no livro dele.'; end if;
  v_id := 'cla:lpub:' || p_cla || ':n:' || p_pag;
  select d.dados into v_d from public.documentos d where d.mesa_id = p_mesa and d.id = v_id for update;
  v_notas := case when jsonb_typeof(v_d -> 'notas') = 'array' then v_d -> 'notas' else '[]'::jsonb end;
  v_agora := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_texto := left(btrim(coalesce(p_texto, '')), 500);

  if p_op = 'criar' then
    if not v_do_cla then raise exception 'As anotações são de quem é do clã (com um personagem nos cargos dele).'; end if;
    if v_texto = '' then raise exception 'Escreva alguma coisa antes de anotar.'; end if;
    if jsonb_array_length(v_notas) >= 60 then raise exception 'Esta página já tem 60 anotações: apague alguma antes.'; end if;
    select p.id, p.nome into v_pc, v_nome
      from public.personagens p, public.documentos c
     where p.mesa_id = p_mesa and p.dono_id = v_uid and not p.apagado and (p_pc is null or p.id = p_pc)
       and c.mesa_id = p_mesa and c.id = 'cla:c:' || p_cla and not c.apagado
       and jsonb_path_exists(c.dados, '$.cargos.*.gente[*] ? (@.pc == $pc)', jsonb_build_object('pc', p.id))
     order by p.nome, p.id limit 1;
    if v_pc is null then raise exception 'Este personagem não está nos cargos do clã.'; end if;
    v_nota := jsonb_build_object('id', 'n' || substr(md5(random()::text || clock_timestamp()::text), 1, 12), 'autor', v_uid::text, 'pc', v_pc,
      'nome', coalesce(nullif(btrim(v_nome), ''), 'Alguém do clã'), 'texto', v_texto, 'em', v_agora);
    v_notas := v_notas || jsonb_build_array(v_nota);
  elsif p_op in ('mudar', 'apagar') then
    select (x.i - 1)::int, x.n into v_i, v_nota from jsonb_array_elements(v_notas) with ordinality as x(n, i) where x.n ->> 'id' = p_nota limit 1;
    if v_nota is null then raise exception 'Esta anotação não existe mais.'; end if;
    if p_op = 'mudar' then
      if v_nota ->> 'autor' is distinct from v_uid::text or not v_do_cla then raise exception 'Só quem escreveu muda a anotação.'; end if;
      if v_texto = '' then raise exception 'Escreva alguma coisa (ou apague a anotação).'; end if;
      v_notas := jsonb_set(v_notas, array[v_i::text], v_nota || jsonb_build_object('texto', v_texto, 'ed', v_agora));
    else
      if not v_mestre and (v_nota ->> 'autor' is distinct from v_uid::text or not v_do_cla) then raise exception 'Só quem escreveu (ou o mestre) apaga a anotação.'; end if;
      v_notas := v_notas - v_i;
    end if;
  else
    raise exception 'Pedido desconhecido.';
  end if;

  perform privado.livro_gravar(p_mesa, v_id, jsonb_build_object('v', 1, 'notas', v_notas));
  return jsonb_build_object('v', 1, 'notas', v_notas);
end $function$;
revoke all on function public.livro_nota(uuid, text, text, text, text, text, text) from public, anon;
grant execute on function public.livro_nota(uuid, text, text, text, text, text, text) to authenticated;
