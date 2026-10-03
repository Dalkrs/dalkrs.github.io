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

-- Erros de uso (código errado, mesa cheia...) passam a sair como "pedido inválido" (400), não como falha do servidor:
-- criar_mesa, entrar_na_mesa e novo_codigo foram recriadas iguais às de 0001, só sem os códigos de erro próprios
-- (e gravando visto_em ao criar/entrar). O texto completo está no histórico de migrações do projeto.
