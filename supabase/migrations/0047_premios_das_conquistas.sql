-- Tiny Cats · 0047 · os prêmios das conquistas vão sozinhos para as fichas (lote 184)
-- A conquista é da conta do jogador (conq:j:<conta>). O prêmio dela — pontos de árvore num tipo (Raça, Classe,
-- Profissão, Bênção, Linhagem) e títulos — vale para TODOS os personagens dessa conta na mesa, inclusive os que ele
-- criar depois. O banco calcula e guarda na coluna nova personagens.conq:
--   { pontos: { p_classe: 2, … }, origem: [{ c, nome, pool, n }], titulos: [{ c, nome, v }] }
-- Ninguém escreve nessa coluna: ela é refeita a cada gravação do personagem e sempre que mudam as conquistas do jogador
-- (conq:j:<conta>) ou o catálogo (conq:lista, de onde vem o prêmio de cada uma). Tirar a conquista tira o prêmio.
-- Os pets (ficha.petDe) não recebem. E as conquistas passam a ser só do mestre: o jogador, que é o dono do documento
-- das conquistas dele, não pode mais mexer nele (antes não importava; agora o prêmio entra na ficha).
-- Rodar uma vez no SQL Editor, depois da 0046.

alter table public.personagens add column if not exists conq jsonb not null default '{}'::jsonb;

create or replace function privado.conq_calc(p_mesa uuid, p_dono uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare
  j jsonb;
  cat jsonb;
  it jsonb;
  c jsonb;
  pr jsonb;
  pool text;
  n int;
  pontos jsonb := '{}'::jsonb;
  origem jsonb := '[]'::jsonb;
  titulos jsonb := '[]'::jsonb;
begin
  if p_dono is null then return '{}'::jsonb; end if;
  select d.dados into j from public.documentos d where d.mesa_id = p_mesa and d.id = 'conq:j:' || p_dono::text and not d.apagado;
  if j is null or jsonb_typeof(j -> 'itens') <> 'array' then return '{}'::jsonb; end if;
  select d.dados -> 'itens' into cat from public.documentos d where d.mesa_id = p_mesa and d.id = 'conq:lista' and not d.apagado;
  for it in select * from jsonb_array_elements(j -> 'itens') loop
    if jsonb_typeof(it) <> 'object' then continue; end if;
    c := null;
    if jsonb_typeof(cat) = 'array' then
      select x into c from jsonb_array_elements(cat) x where x ->> 'id' = it ->> 'id' limit 1;
    end if;
    c := coalesce(c, it);                                   -- (a conquista que saiu do catálogo: vale a cópia do jogador)
    if jsonb_typeof(c -> 'premios') <> 'array' then continue; end if;
    for pr in select * from jsonb_array_elements(c -> 'premios') loop
      if pr ->> 't' = 'pontos' then
        pool := pr ->> 'pool';
        if pool is null or pool !~ '^[A-Za-z0-9_-]{1,40}$' or jsonb_typeof(pr -> 'n') <> 'number' then continue; end if;
        n := greatest(-20, least(20, (pr ->> 'n')::numeric::int));
        if n = 0 then continue; end if;
        pontos := jsonb_set(pontos, array[pool], to_jsonb(coalesce((pontos ->> pool)::int, 0) + n));
        origem := origem || jsonb_build_array(jsonb_build_object('c', it ->> 'id', 'nome', left(coalesce(c ->> 'nome', 'Conquista'), 60), 'pool', pool, 'n', n));
      elsif pr ->> 't' = 'titulo' and length(trim(coalesce(pr ->> 'v', ''))) > 0 then
        titulos := titulos || jsonb_build_array(jsonb_build_object('c', it ->> 'id', 'nome', left(coalesce(c ->> 'nome', 'Conquista'), 60), 'v', left(trim(pr ->> 'v'), 40)));
      end if;
    end loop;
  end loop;
  if pontos = '{}'::jsonb and titulos = '[]'::jsonb then return '{}'::jsonb; end if;
  return jsonb_build_object('pontos', pontos, 'origem', origem, 'titulos', titulos);
end;
$function$;
revoke all on function privado.conq_calc(uuid, uuid) from public, anon, authenticated;

-- o personagem: a coluna é sempre a conta do banco (o que vier do aparelho não vale)
create or replace function privado.conq_personagem()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.ficha is not null and coalesce(new.ficha ->> 'petDe', '') <> '' then
    new.conq := '{}'::jsonb;
  else
    new.conq := privado.conq_calc(new.mesa_id, new.dono_id);
  end if;
  return new;
end;
$function$;
revoke all on function privado.conq_personagem() from public, anon;
drop trigger if exists personagens_conq on public.personagens;
create trigger personagens_conq before insert or update on public.personagens
  for each row execute function privado.conq_personagem();

-- as conquistas mudaram: refaz a coluna dos personagens de quem foi afetado (só onde muda, para não acordar todo mundo)
create or replace function privado.conq_mudou()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  r record;
  dono uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;
  if r.id not like 'conq:%' then return null; end if;
  if r.id like 'conq:j:%' then
    begin dono := substr(r.id, 8)::uuid; exception when others then return null; end;
    update public.personagens p set conq = privado.conq_calc(p.mesa_id, p.dono_id)
      where p.mesa_id = r.mesa_id and p.dono_id = dono and not p.apagado
        and p.conq is distinct from (case when coalesce(p.ficha ->> 'petDe', '') <> '' then '{}'::jsonb else privado.conq_calc(p.mesa_id, p.dono_id) end);
  elsif r.id = 'conq:lista' then
    update public.personagens p set conq = privado.conq_calc(p.mesa_id, p.dono_id)
      where p.mesa_id = r.mesa_id and p.dono_id is not null and not p.apagado
        and p.conq is distinct from (case when coalesce(p.ficha ->> 'petDe', '') <> '' then '{}'::jsonb else privado.conq_calc(p.mesa_id, p.dono_id) end);
  end if;
  return null;
end;
$function$;
revoke all on function privado.conq_mudou() from public, anon;
drop trigger if exists documentos_conq_mudou on public.documentos;
create trigger documentos_conq_mudou after insert or update or delete on public.documentos
  for each row execute function privado.conq_mudou();

-- só quem mestra mexe nas conquistas (o catálogo, o que todos veem e as de cada jogador)
create or replace function privado.conq_guarda()
returns trigger language plpgsql security definer set search_path to '' as $function$
begin
  if new.id not like 'conq:%' then return new; end if;
  if (select auth.uid()) is null or privado.mestra_doc(new.mesa_id, new.id) then return new; end if;
  raise exception 'Só o mestre dá ou tira conquistas.';
end;
$function$;
revoke all on function privado.conq_guarda() from public, anon;
drop trigger if exists documentos_conq_guarda on public.documentos;
create trigger documentos_conq_guarda before insert or update on public.documentos
  for each row when (new.id like 'conq:%') execute function privado.conq_guarda();

-- as fichas que já existem: fazem a conta uma vez
update public.personagens p set conq = privado.conq_calc(p.mesa_id, p.dono_id)
  where p.dono_id is not null and coalesce(p.ficha ->> 'petDe', '') = '';
