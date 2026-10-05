-- Ver a lista dos arquivos de uma pasta do balde "mesas": o mestre, a da mesa inteira; o jogador, a dele.
-- Sem isto o site não conseguia apagar arquivo nenhum (o armazenamento só apaga o que quem pede também pode ver):
-- a imagem trocada ficava lá, e apagar a mesa deixava a pasta dela para trás.
-- Ler uma imagem continua sendo pelo endereço dela, que é público.
create policy "mesas: o mestre vê a pasta" on storage.objects for select to authenticated
  using (bucket_id = 'mesas' and privado.mestre_da_pasta(name));
create policy "mesas: o jogador vê o que é dele" on storage.objects for select to authenticated
  using (bucket_id = 'mesas' and privado.jogador_da_pasta(name));
