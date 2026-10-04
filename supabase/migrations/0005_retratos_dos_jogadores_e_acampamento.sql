-- 1) Jogadores também enviam imagens (o retrato do próprio personagem), mas só para a própria pasta dentro da mesa:
--      <mesa>/j/<usuário>/<arquivo>
--    O mestre continua podendo tudo na pasta da mesa (políticas de imagens_da_mesa).
create or replace function privado.jogador_da_pasta(caminho text)
returns boolean
language plpgsql stable security definer set search_path to ''
as $$
declare p text[];
begin
  p := storage.foldername(caminho);
  return array_length(p, 1) = 3
     and p[2] = 'j'
     and p[3] = ((select auth.uid()))::text
     and privado.e_membro(p[1]::uuid);
exception when others then
  return false;
end $$;
revoke all on function privado.jogador_da_pasta(text) from public, anon;
grant execute on function privado.jogador_da_pasta(text) to authenticated;

create policy "mesas: o jogador envia o que é dele" on storage.objects for insert to authenticated
  with check (bucket_id = 'mesas' and privado.jogador_da_pasta(name));
create policy "mesas: o jogador troca o que é dele" on storage.objects for update to authenticated
  using (bucket_id = 'mesas' and privado.jogador_da_pasta(name))
  with check (bucket_id = 'mesas' and privado.jogador_da_pasta(name));
create policy "mesas: o jogador apaga o que é dele" on storage.objects for delete to authenticated
  using (bucket_id = 'mesas' and privado.jogador_da_pasta(name));

-- 2) A mesa ao vivo passa a aceitar o que vem do Acampamento (descansos, por exemplo).
alter table public.registro drop constraint registro_origem_check;
alter table public.registro add constraint registro_origem_check
  check (origem in ('mesa', 'rolador', 'ficha', 'cena', 'mundo', 'arvore', 'acampamento'));
