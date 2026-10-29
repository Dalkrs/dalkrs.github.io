-- LOTE 35 (A ANÁLISE DO BANCO): índices para as leituras que o site faz o tempo todo.
-- O site lê as mudanças de cada mesa "pela revisão": select … where mesa_id = $1 and rev > $2 order by rev, e a
-- revisão mais alta com order by rev desc limit 1. Sem índice em (mesa_id, rev), o banco lia a mesa inteira e
-- conferia as regras de quem vê (as funções privado.*) em cada linha antes de ordenar — no registro (as rolagens e a
-- conversa), em média 233 ms por leitura, até 6 s. Com o índice, ele anda pela revisão e para na primeira linha
-- que serve.
-- E os quatro índices que o próprio Supabase aponta como faltando (chaves estrangeiras sem índice): pesam quando uma
-- conta ou uma mesa é apagada (o banco procura o que aponta para ela).
-- Tudo aqui é acréscimo: nada muda no que cada um vê ou grava. As tabelas são pequenas: cada índice fica pronto
-- na hora. Pode rodar mais de uma vez.

create index if not exists registro_rev_idx on public.registro (mesa_id, rev);
create index if not exists documentos_rev_idx on public.documentos (mesa_id, rev);
create index if not exists personagens_rev_idx on public.personagens (mesa_id, rev);

create index if not exists documentos_dono_idx on public.documentos (dono_id);
create index if not exists registro_autor_idx on public.registro (autor_id);
create index if not exists mesas_dono_idx on public.mesas (dono_id);
create index if not exists admin_auditoria_mesa_idx on public.admin_auditoria (mesa_id);

analyze public.registro;
analyze public.documentos;
analyze public.personagens;
