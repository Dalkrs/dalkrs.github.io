# Banco local de ensaio

Um banco **daqui mesmo**, igual ao do projeto de verdade nas tabelas, nas regras de acesso, nas funções e nos gatilhos,
para duas coisas:

1. **ensaiar uma migração antes de aplicá-la** no projeto de verdade (ela roda aqui primeiro; se quebrar, quebra aqui);
2. **rodar os testes "de rede"** (os que criam mesas, entram com contas, gravam fichas…) sem tocar no projeto de
   verdade — nem nas mesas, nem nas contas de ninguém.

Não é o Supabase: é um PostgreSQL comum, com as migrações de `supabase/migrations/` aplicadas em ordem, o
[PostgREST](https://postgrest.org) na frente (é o mesmo programa que atende o `/rest/v1` no Supabase) e uma "porta"
pequena (`porta.js`) que faz o resto do papel do endereço do Supabase: entrar com e-mail e senha, criar conta,
guardar as imagens. O **tempo real não existe aqui** — os testes já rodam sem ele (o site cai na leitura periódica).

## Usar

Precisa de: PostgreSQL 15 ou mais novo instalado na máquina (só os programas; o banco é criado numa pasta à parte),
Node e, na primeira vez, internet para baixar o PostgREST (um arquivo só).

```sh
src/tests/local/banco.sh ligar            # sobe tudo; na primeira vez, monta o banco com todas as migrações
cd src/tests
TC_LOCAL=https://127.0.0.1:54331 node mesa.test.js       # qualquer teste de rede, agora contra o banco local
src/tests/local/banco.sh desligar
```

Ensaiar uma migração nova (`00NN_x.sql`, ainda fora de `supabase/migrations/`):

```sh
src/tests/local/banco.sh montar           # banco novo, com as migrações que já estão no projeto
src/tests/local/banco.sh aplicar caminho/00NN_x.sql      # a nova roda aqui primeiro (numa transação: ou tudo, ou nada)
TC_LOCAL=https://127.0.0.1:54331 node …    # os testes, com ela aplicada
```

`banco.sh montar 0011` monta só até a migração 0011 (o banco "de antes" de uma migração), `banco.sh psql` abre o
`psql` no banco local e `banco.sh estado` diz o que está de pé.

## O que é igual e o que não é

Igual ao projeto de verdade (conferido comparando o catálogo dos dois bancos: funções, regras de acesso, colunas,
restrições, índices, gatilhos, permissões): tudo o que está em `public` e `privado`, e as regras do balde de imagens.

Diferente, de propósito:

- **contas**: a porta local guarda e-mail e senha numa tabela simples (`auth.users`) e assina o passe (JWT) com um
  segredo fixo que está no próprio `banco.sh`. Não há e-mail de confirmação, nem limite de tentativas. É um ensaio:
  nada disso serve para guardar conta de verdade;
- **imagens**: ficam numa pasta temporária; quem pode enviar, listar e apagar é o banco que decide, pelas mesmas
  regras (`storage.objects`);
- **tempo real**: não há. O que depende dele (um aviso chegar na hora, em vez de em até 3 s) só se confere no
  projeto de verdade;
- **as funções de borda** (`supabase/functions/`): `criar-conta` é imitada pela porta; `faxina` responde que não
  havia o que limpar.

Por isso o banco local **não substitui** a rodada final no projeto de verdade: ele vem antes dela.
