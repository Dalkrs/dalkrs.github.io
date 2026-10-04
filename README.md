# Tiny Cats · Sistema de RPG

Site único com os sistemas da mesa, publicado em <https://dalkrs.github.io/>:

| Aba | O que é |
|---|---|
| **Cenas** | O mapa tático: tokens, barras (com sobrevida), condições, turnos, paredes, luz, névoa, efeitos. |
| **Mapa-múndi** | O mapa do mundo da campanha: marcadores, grupos viajando, regiões e facções, calendário, névoa e rumores. |
| **Acampamento** | A cena da fogueira: quem está no acampamento, provisões, melhorias, equipamentos, descansos e momentos. |
| **Fichas** | As fichas dos personagens: atributos, recursos, equipamento, rolagens, Lapros, Sanidade, Conforto, Relacionamento. |
| **Árvore** | A árvore de habilidades de cada personagem. |
| **Rolador** | A mesa de dados do mestre: fixa, dados, tabelas, duelos, históricos. |

## Conta, mesa e dados

- **Sem entrar na conta** (ou sem mesa aberta), cada sistema guarda os dados no próprio navegador, como sempre foi.
- **Com uma mesa aberta**, os dados passam a ser os da mesa e ficam no banco (Supabase, projeto "Tiny Cats"):
  fichas, árvore, mapa-múndi, acampamento, cenas (com as imagens) e os históricos do Rolador. Abrem em qualquer
  aparelho. Os dados do navegador não são tocados; cada sistema oferece trazê-los para a mesa, e o mestre escolhe.
- **Mestre e jogadores.** A mesa tem um mestre e jogadores que entram com o código de convite. O banco só entrega a
  cada um o que ele pode ver: o jogador vê a própria ficha (e as que o mestre liberar), a cena que o mestre pôs no
  ar (sem o que é só do mestre), o mapa-múndi revelado e o acampamento. O Rolador, numa mesa, é só do mestre.
- **Mesa ao vivo**: o painel da direita mostra as rolagens e a conversa de todos, na hora.

## Como está organizado

| Pasta | O que é |
|---|---|
| `index.html` | A casca: barra com a marca, as abas, a conta, a mesa e a mesa ao vivo. Cada sistema roda na própria página, dentro de uma moldura. |
| `cenas/`, `mundo/`, `acampamento/`, `fichas/`, `arvore/`, `rolador/` | As páginas dos sistemas (cada uma também abre sozinha, em outra janela). |
| `tc/` | O que é de todos: `supabase.js` (a biblioteca do banco), `tc.js` (conta, mesas, mesa ao vivo e os dados da mesa), `ponte.js` (a conversa entre um sistema e a casca), `rules.js` (regras da ficha), `dice.js` (dados), `config.js` (endereço e chave pública do banco). |
| `src/cenas/` | Fontes das Cenas. `./build.sh` gera `cenas/index.html`. Testes em `src/cenas/test/`. |
| `src/tests/` | Testes do site. Os `*-mesa.test.js` (e `banco`, `mesa`, `fichas-novas`, `token-ficha`) usam o banco de verdade. |
| `src/legado/` | As versões originais de cada sistema, guardadas para comparação nos testes. |
| `supabase/` | O banco: migrações (tabelas, regras de acesso, Storage) e a função `criar-conta`. |

### Como os dados da mesa ficam no banco

- `mesas`, `mesa_membros`, `mesa_convites`: a mesa e quem participa.
- `registro`: a mesa ao vivo (rolagens e conversa).
- `personagens`: uma linha por ficha (ficha, árvore e estado em colunas separadas).
- `documentos`: o resto, um documento por assunto. Cada documento é "só do mestre" ou "da mesa":
  - Mapa-múndi: `mundo:mapa:<id>` (mestre) e `mundo:pub:<id>` (o que os jogadores veem).
  - Acampamento: `acampamento`.
  - Cenas: `cena:<id>:m` e `cena:<id>:v` (mestre), `cena:pub:m` e `cena:pub:v` (a cena que está no ar, sem o que é
    só do mestre) e `cena:pedido:<jogador>` (o que o jogador fez e o mestre ainda vai aplicar).
  - Rolador: `rol:est`, `rol:h:<id>`, `rol:c:<id>:<n>` (as rolagens, em trechos) e `rol:t:<id>` (tabelas).
- Storage, pasta `mesas/<mesa>/`: as imagens (mapas, retratos, fundos).

## Testes

```
cd src/cenas && ./build.sh && cd test && for f in unit unit2 unit3 unit4 unit5 v3 v4 e2e ui2; do node $f.js; done
cd src/tests && for f in dice rules mundo-nucleo acampamento-nucleo site fichas mundo acampamento; do node $f.test.js; done
```

Os testes que usam o banco de verdade precisam das contas de teste (criadas na primeira vez, com a senha guardada
fora do repositório): `banco`, `mesa`, `fichas-mesa`, `fichas-novas`, `token-ficha`, `arvore-mesa`, `mundo-mesa`,
`acampamento-mesa`, `cenas-mesa`, `rolador-mesa`. `vivo.js` confere o site publicado.
