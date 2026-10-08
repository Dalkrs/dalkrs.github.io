-- Imagens da mesa (mapa-múndi, fundos de cena, retratos): um balde público, com uma pasta por mesa.
-- Ler é pelo endereço da imagem (que ninguém adivinha: leva o id da mesa e um nome sorteado).
-- Enviar, trocar e apagar: só o mestre da mesa dona da pasta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mesas', 'mesas', true, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- A primeira pasta do caminho é o id da mesa. Caminho torto (sem pasta, pasta que não é um id) = não.
create or replace function privado.mestre_da_pasta(caminho text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return privado.e_mestre(((storage.foldername(caminho))[1])::uuid);
exception when others then
  return false;
end $$;
revoke all on function privado.mestre_da_pasta(text) from public;
grant execute on function privado.mestre_da_pasta(text) to authenticated;

create policy "mesas: o mestre envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'mesas' and privado.mestre_da_pasta(name));
create policy "mesas: o mestre troca" on storage.objects for update to authenticated
  using (bucket_id = 'mesas' and privado.mestre_da_pasta(name)) with check (bucket_id = 'mesas' and privado.mestre_da_pasta(name));
create policy "mesas: o mestre apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'mesas' and privado.mestre_da_pasta(name));
