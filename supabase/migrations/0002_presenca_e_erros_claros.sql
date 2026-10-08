-- Presença: cada pessoa marca, de tempos em tempos, que está com a mesa aberta.
alter table public.mesa_membros add column if not exists visto_em timestamptz;
comment on column public.mesa_membros.visto_em is 'Última vez em que a pessoa esteve com a mesa aberta (para mostrar quem está online).';

create or replace function public.marcar_presenca(p_mesa uuid)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare v_agora timestamptz := now();
begin
  update public.mesa_membros set visto_em = v_agora where mesa_id = p_mesa and usuario_id = (select auth.uid());
  if not found then raise exception 'Você não participa desta mesa.'; end if;
  return v_agora;
end $$;
comment on function public.marcar_presenca(uuid) is 'Marca que quem chama está com a mesa aberta agora. Devolve a hora do servidor.';
revoke all on function public.marcar_presenca(uuid) from public, anon;
grant execute on function public.marcar_presenca(uuid) to authenticated;

-- Erros de uso (código errado, mesa cheia...) passam a sair como "pedido inválido" (400), não como falha do servidor.
create or replace function public.criar_mesa(p_nome text, p_meu_nome text default null)
returns public.mesas
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_mesa public.mesas;
  v_nome text := left(coalesce(nullif(btrim(p_meu_nome), ''), 'Mestre'), 40);
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  if char_length(btrim(coalesce(p_nome, ''))) = 0 then raise exception 'Dê um nome à mesa.'; end if;
  if (select count(*) from public.mesas m where m.dono_id = v_uid) >= 20 then
    raise exception 'Você já tem 20 mesas. Apague uma para criar outra.';
  end if;
  insert into public.mesas (nome, dono_id) values (left(btrim(p_nome), 80), v_uid) returning * into v_mesa;
  loop
    begin
      insert into public.mesa_convites (mesa_id, codigo) values (v_mesa.id, privado.gerar_codigo());
      exit;
    exception when unique_violation then null;   -- código repetido: sorteia outro
    end;
  end loop;
  insert into public.mesa_membros (mesa_id, usuario_id, papel, nome, cor, visto_em) values (v_mesa.id, v_uid, 'mestre', v_nome, '#E6AB4F', now());
  return v_mesa;
end $$;

create or replace function public.entrar_na_mesa(p_codigo text, p_meu_nome text default null)
returns public.mesas
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_cod text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
  v_mesa public.mesas;
  v_nome text := left(coalesce(nullif(btrim(p_meu_nome), ''), 'Jogador'), 40);
  v_cores constant text[] := array['#5AA2FF', '#5CC26B', '#F06AA8', '#A67CF2', '#2FC4BD', '#FF8A3D', '#F5CF4F', '#EF5350'];
  v_n int;
begin
  if v_uid is null then raise exception 'Entre na sua conta primeiro.'; end if;
  select m.* into v_mesa from public.mesas m join public.mesa_convites c on c.mesa_id = m.id where c.codigo = v_cod;
  if not found then raise exception 'Código de convite não encontrado.'; end if;
  if exists (select 1 from public.mesa_membros mm where mm.mesa_id = v_mesa.id and mm.usuario_id = v_uid) then return v_mesa; end if;
  select count(*) into v_n from public.mesa_membros mm where mm.mesa_id = v_mesa.id;
  if v_n >= 12 then raise exception 'Esta mesa já está cheia.'; end if;
  insert into public.mesa_membros (mesa_id, usuario_id, papel, nome, cor, visto_em)
  values (v_mesa.id, v_uid, 'jogador', v_nome, v_cores[((v_n - 1) % 8) + 1], now());
  return v_mesa;
end $$;

create or replace function public.novo_codigo(p_mesa uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_cod text;
begin
  if not privado.e_mestre(p_mesa) then raise exception 'Só o mestre troca o código de convite.'; end if;
  loop
    v_cod := privado.gerar_codigo();
    begin
      update public.mesa_convites set codigo = v_cod, criado_em = now() where mesa_id = p_mesa;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return v_cod;
end $$;
