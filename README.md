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
| `supabase/` | O banco: migrações (tabelas, regras de acesso, Storage) e as funções `criar-conta` e `faxina`. |

### Como os dados da mesa ficam no banco

- `mesas`, `mesa_membros`, `mesa_convites`: a mesa e quem participa.
- `registro`: a mesa ao vivo (rolagens e conversa).
- `personagens`: uma linha por ficha (ficha, árvore e estado em colunas separadas).
- `documentos`: o resto, um documento por assunto. Cada documento é "só do mestre" ou "da mesa":
  - Mapa-múndi: `mundo:mapa:<id>` (mestre) e `mundo:pub:<id>` (o que os jogadores veem).
  - Acampamento: `acampamento`.
  - Cenas: `cenas:indice` (a ordem das cenas, qual está no ar e qual aparelho do mestre a transmite), `cena:<id>:m`
    e `cena:<id>:v` (mestre), `cena:pub:m` e `cena:pub:v` (a cena que está no ar, sem o que é só do mestre) e
    `cena:pedido:<jogador>` (o que o jogador fez e o mestre ainda vai aplicar). Quem aplica os pedidos e escreve a
    projeção é o programa do mestre — um aparelho só, mesmo que ele tenha o site aberto em vários.
  - Rolador: `rol:est`, `rol:h:<id>`, `rol:c:<id>:<aparelho>-<n>` (as rolagens, em trechos; cada aparelho do mestre
    escreve nos trechos dele) e `rol:t:<id>` (tabelas).
  - Todos os documentos são escritos pelo mestre (sem dono). A única exceção, e a única coisa que o banco deixa
    um jogador criar, é o `cena:pedido:` dele mesmo.
- Storage, pasta `mesas/<mesa>/`: as imagens (mapas, retratos, fundos).

### Para nada ficar para trás

Cada sistema entrega as mudanças à casca na hora (chamada direta: são páginas do mesmo site), e a casca as manda ao
banco logo em seguida, só os campos que mudaram. Ao fechar a página, a casca pede a cada sistema o que ele ainda
segurava e envia tudo de um jeito que o navegador termina mesmo com a página fechada (`keepalive`, até 64 KB). Se
algo não couber nisso, o navegador pergunta antes de sair. Fechar ou trocar de mesa, e sair da conta, esperam o que
faltava subir.

### Limites conhecidos

- **O mestre em dois aparelhos, na mesma cena, no mesmo instante.** Um aparelho só transmite a cena que está no ar, e
  o que o mestre faz num e noutro é juntado (barras, condições e auras pela variação; o resto, por objeto). Mas se as
  gravações dos dois se cruzam no mesmo segundo, o documento da cena fica com a que chegou por último, e um gesto pode
  ser desfeito. Os pedidos recentes dos jogadores não se perdem nesse caso: cada um guarda os dele por dois minutos
  depois de confirmados, e o aparelho que transmite aplica de novo os que a cena que ficou não tiver.
- **Quem aplica o que os jogadores fazem é o programa do mestre.** Com o mestre fora (ou com a aba dormindo), os
  pedidos esperam; valem quando ele volta.
- **Sem a ligação em tempo real**, a mesa lê o banco a cada 3 segundos: tudo funciona, com esse atraso.
- **As paredes valem para o jogador na tela dele**: o banco não confere por onde um token passou.
- **Imagens que foram trocadas** (um retrato, o fundo de uma cena) continuam no Storage até a mesa ser apagada.
  Apagar a mesa apaga a pasta dela; a função `faxina` (em `supabase/functions/`) apaga as pastas de mesas que não
  existem mais — o que sobrou de antes disso, ou de um apagar que parou no meio.

## Testes

```
cd src/cenas && ./build.sh && cd test && for f in unit unit2 unit3 unit4 unit5 unit6 v3 v4 e2e ui2 faixa; do node $f.js; done
cd src/tests && for f in dice rules mundo-nucleo acampamento-nucleo site fichas arvore mundo acampamento; do node $f.test.js; done
```

Os testes que usam o banco de verdade precisam das contas de teste (criadas na primeira vez, com a senha guardada
fora do repositório): `banco`, `mesa`, `fichas-mesa`, `fichas-novas`, `token-ficha`, `arvore-mesa`, `mundo-mesa`,
`acampamento-mesa`, `cenas-mesa`, `rolador-mesa`. `vivo.js` confere o site publicado.
