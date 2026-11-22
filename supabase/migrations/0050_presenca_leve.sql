-- (lote 202) A presença sem o tempo real.
-- Cada pessoa avisava "estou aqui" a cada 60 s gravando mesa_membros.visto_em. A tabela mesa_membros está no tempo real:
-- cada aviso virava uma mensagem para todos da mesa (perto de 40% das mensagens). Agora o aviso vai para
-- public.presencas, que NÃO está no tempo real, e a resposta já traz a hora de todos da mesa: quem avisa fica sabendo de
-- quem está online, sem mensagem nenhuma. O mesa_membros.visto_em segue valendo (o painel da administração lê dali),
-- mas só é regravado quando está com mais de 10 minutos.
create table if not exists public.presencas (
  mesa_id uuid not null references public.mesas(id) on delete cascade,
  usuario_id uuid not null,
  visto_em timestamptz not null default now(),
  primary key (mesa_id, usuario_id)
);
comment on table public.presencas is 'Última vez em que cada pessoa esteve com a mesa aberta. Fora do tempo real: lida e escrita só por presenca_marcar.';
alter table public.presencas enable row level security;
-- (sem regras de acesso: ninguém lê nem grava direto; só pela função abaixo)

create or replace function public.presenca_marcar(p_mesa uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_agora timestamptz := now();
  v_eu uuid := (select auth.uid());
begin
  if not exists (select 1 from public.mesa_membros where mesa_id = p_mesa and usuario_id = v_eu) then
    raise exception 'Você não participa desta mesa.';
  end if;
  insert into public.presencas (mesa_id, usuario_id, visto_em) values (p_mesa, v_eu, v_agora)
    on conflict (mesa_id, usuario_id) do update set visto_em = excluded.visto_em;
  update public.mesa_membros set visto_em = v_agora
    where mesa_id = p_mesa and usuario_id = v_eu and (visto_em is null or visto_em < v_agora - interval '10 minutes');
  return jsonb_build_object(
    'agora', v_agora,
    'vistos', coalesce((
      select jsonb_object_agg(mm.usuario_id::text, greatest(mm.visto_em, p.visto_em))
        from public.mesa_membros mm
        left join public.presencas p on p.mesa_id = mm.mesa_id and p.usuario_id = mm.usuario_id
       where mm.mesa_id = p_mesa), '{}'::jsonb));
end;
$function$;
comment on function public.presenca_marcar(uuid) is 'Marca que quem chama está com a mesa aberta agora; devolve a hora do servidor e a última presença de cada membro.';
revoke all on function public.presenca_marcar(uuid) from public, anon;
grant execute on function public.presenca_marcar(uuid) to authenticated;
