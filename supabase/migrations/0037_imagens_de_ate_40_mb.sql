-- (lote 81) As imagens da mesa podem ter até 40 MB (antes, 15 MB): os fundos grandes das Cenas (até 8192 px no lado
-- maior, como a Fortaleza Cinzenta, com 7680 × 5120 px) sobem como vieram, sem serem comprimidos de novo.
-- O site confere o mesmo limite antes de enviar (tc/tc.js, arquivos.subir).
update storage.buckets set file_size_limit = 41943040 where id = 'mesas';
