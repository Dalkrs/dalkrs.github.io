# Tiny Cats · Sistema de RPG

Site único com os sistemas da mesa, publicado em <https://dalkrs.github.io/>:

| Aba | O que é |
|---|---|
| **Jornal** | O jornal da mesa, uma página só, sempre a de agora: o mestre escreve (o nome, a data do mundo pelo calendário de um mapa, o clima, matérias com destaque, negrito e itálico, boatos e anúncios) e publica; os jogadores leem e mandam cartas, assinadas por um personagem ou anônimas — o mestre decide quais saem. |
| **Cenas** | O mapa tático: tokens, barras (com sobrevida e, quando a ficha manda, abaixo de zero), condições, turnos, paredes, luz, névoa, efeitos, terreno com altura, a bolsa do personagem usada pelo token — e o combate: rolar atributo pelo token (F), disputa (C), puxar um grupo das Fichas e o ataque com defesa. |
| **Mapa-múndi** | O mapa do mundo da campanha: o desenho à mão do terreno (com textura), carimbos, textos, rios, estradas e trilhas, a grade de hexágonos com o terreno de cada um, marcadores, grupos viajando (em cubos, de hexágono em hexágono), regiões, facções e zonas de guerra, calendário, névoa e rumores. |
| **Acampamento** | A cena da fogueira: quem está no acampamento (com a aura da emoção de cada um), as provisões (rações com efeito), melhorias e equipamentos (para todos ou só para alguns), a caravana, os descansos e os momentos. |
| **Fichas** | As fichas dos personagens: atributos, as 13 defesas específicas, barras (que podem começar pela metade e ficar negativas), equipamento (que soma em atributo, barra ou defesa), bônus temporários, bolsas (poções, bombas, runas, munições, materiais), rolagens, Lapros, a barra de XP junto do nível, Sanidade, Conforto, Relacionamentos (com a trilha de romance, e com o que o mestre esconde), o quadro de Ascensão (os pontos das árvores), o corpo com os ferimentos e as Missões. |
| **Árvore** | A árvore de habilidades de cada personagem. |
| **Meditação** | O lugar onde os personagens meditam (oito ambientes desenhados ou uma imagem do mestre, a hora e o clima) e quem está meditando; a prática de cada personagem (objeto, mantra, representação, panteão, a imagem meditando); os pilares de símbolos, onde o jogador, com a tentativa que o mestre libera, descobre as receitas que o mestre escreveu; e as barras de treinamento, que só o mestre vê. |
| **Clã** | Os clãs da mesa — o dos jogadores e os de NPC (rivais, aliados) — num salão com as bandeiras do brasão: a árvore de cargos (o líder no alto; cada cargo com uma ou mais pessoas, cada uma com o seu respeito dentro do clã), as construções (subir de nível desconta os recursos), os recursos, o respeito no mundo, as relações com as facções e com os outros clãs, e o histórico. O líder do clã dos jogadores mexe nos cargos; de um clã de NPC, os jogadores veem só o que o mestre marca. |
| **Rolador** | A mesa de dados do mestre: fixa, dados, tabelas, duelos, históricos — e, numa mesa, o auditor dos dados (o que saiu de cada dado, de todo mundo, contra o esperado). |

## Conta, mesa e dados

- **Sem entrar na conta** (ou sem mesa aberta), cada sistema guarda os dados no próprio navegador, como sempre foi.
- **Com uma mesa aberta**, os dados passam a ser os da mesa e ficam no banco (Supabase, projeto "Tiny Cats"):
  fichas, árvore, mapa-múndi, acampamento, cenas (com as imagens) e os históricos do Rolador. Abrem em qualquer
  aparelho. Os dados do navegador não são tocados; cada sistema oferece trazê-los para a mesa, e o mestre escolhe.
- **Mestre e jogadores.** A mesa tem um mestre e jogadores que entram com o código de convite. O banco só entrega a
  cada um o que ele pode ver: o jogador vê a própria ficha (e as que o mestre liberar), a cena que o mestre pôs no
  ar (sem o que é só do mestre), o mapa-múndi revelado e o acampamento. O Rolador, numa mesa, é só do mestre.
- **Mestre auxiliar.** No menu da mesa, o mestre pode dar a um jogador o papel de mestre auxiliar ("Permissões…") e
  escolher as abas que ele mestra. O auxiliar mestra junto — cenas, fichas, mapa, acampamento, mesa ao vivo —, mas
  não administra a mesa: não tira ninguém, não vê nem troca o código de convite, não renomeia nem apaga a mesa e não
  nomeia outros auxiliares. Numa aba que o mestre não liberou ele vê o que os jogadores veem (o Rolador some). E
  pode, quando quiser, **jogar como jogador** (botão no menu da mesa): enquanto joga, o que é só do mestre deixa de
  chegar aos aparelhos dele; a permissão de auxiliar continua, e o mesmo botão o leva de volta. Ver "O mestre
  auxiliar".
- **Campanhas.** A mesa é um mundo; nele podem jogar vários grupos, em campanhas diferentes — a geração de um
  personagem é uma campanha, a geração seguinte é outra. O mestre as organiza em "Campanhas…", no menu da mesa:
  cria, dá nome, põe em ordem, diz quem participa, encerra e reabre. Cada campanha tem os jogadores, os grupos de
  fichas, a conversa da mesa ao vivo, o acampamento, as missões do grupo, as cenas e os mapas dela; o que não é de
  nenhuma campanha é **do mundo**, e aparece em todas. Cada aparelho tem uma **campanha em vista** (ao lado do nome
  da mesa, na barra): é nela que a pessoa está jogando ou mestrando agora, e em toda lista — fichas, quem fala, quem
  entra na cena — o que é dela vem primeiro. O jogador só recebe o que é das campanhas de que participa; quem mestra
  vê todas. Numa mesa sem campanha nenhuma, nada disso aparece. Ver "As campanhas".
- **Mesa ao vivo**: o painel da direita mostra as rolagens e a conversa de todos, na hora. Nele fica também a
  **telinha de dados** (rolar um atributo com fixa, ou a iniciativa, pela ficha, sem digitar comando — o jogador
  pelos personagens dele, o mestre por qualquer um) e as duas chaves de **som** e **efeito** das rolagens, que cada
  pessoa liga ou desliga no próprio aparelho. Quando o mestre pede (num ataque com defesa), é ali que o jogador rola
  a defesa do personagem dele. Na mesma janela "Permissões…" do menu da mesa, o mestre pode **fechar a mesa ao vivo
  para um jogador** por um tempo: até liberar, ele só vê as próprias rolagens e mensagens (que continuam chegando à
  mesa) e um aviso no lugar da conversa. Ver "Fichas, poções e rolagens (lote 5)".

## Como está organizado

| Pasta | O que é |
|---|---|
| `index.html` | A casca: barra com a marca, as abas, a conta, a mesa e a mesa ao vivo. Cada sistema roda na própria página, dentro de uma moldura. |
| `versao.json` | A versão publicada (a mesma de `VERSAO`, na casca). A casca aberta a consulta de tempos em tempos: se for outra, mostra o botão "Versão nova" na barra — nada recarrega sozinho. Os dois mudam juntos a cada publicação. |
| `novidades.json` | O que muda em cada versão, a mais nova primeiro: título, data e os itens (`novo`, `melhorou` ou `consertado`; `mestre: true` marca o que é só do mestre). Aparece na janela do botão "Versão nova" (o que a versão nova traz) e no item "Novidades" do menu da conta (e no link "Novidades do site", na janela de entrar). Uma bolinha no canto do botão da conta fica acesa, em cada aparelho, até a pessoa abrir a lista; nada abre sozinho. **Toda publicação ganha uma entrada aqui**, com a mesma versão de `VERSAO` (o `site.test.js` confere). |
| `jornal/`, `cenas/`, `mundo/`, `acampamento/`, `fichas/`, `arvore/`, `meditacao/`, `cla/`, `rolador/` | As páginas dos sistemas (cada uma também abre sozinha, em outra janela). |
| `tc/` | O que é de todos: `supabase.js` (a biblioteca do banco), `tc.js` (conta, mesas, mesa ao vivo e os dados da mesa), `ponte.js` (a conversa entre um sistema e a casca), `rules.js` (regras da ficha), `dice.js` (dados), `auditoria.js` (as contas do auditor dos dados), `config.js` (endereço e chave pública do banco). |
| `src/cenas/` | Fontes das Cenas. `./build.sh` gera `cenas/index.html`. Testes em `src/cenas/test/`. |
| `src/tests/` | Testes do site. Os `*-mesa.test.js`, os `*.rede.test.js` (e `banco`, `mesa`, `fichas-novas`, `token-ficha`) usam o banco de verdade — ou, com `TC_LOCAL`, o banco local de ensaio. |
| `src/tests/local/` | O banco local de ensaio: um PostgreSQL daqui mesmo com as migrações aplicadas, para ensaiar uma migração antes de aplicá-la no projeto de verdade e rodar os testes de rede sem tocar nele. Ver `src/tests/local/LEIA.md`. |
| `src/legado/` | As versões originais de cada sistema, guardadas para comparação nos testes. |
| `supabase/` | O banco: migrações (tabelas, regras de acesso, Storage) e as funções `criar-conta` e `faxina`. |

### Como os dados da mesa ficam no banco

- `mesas`, `mesa_membros`, `mesa_convites`: a mesa e quem participa. Em `mesa_membros`, `papel` é `mestre`,
  `auxiliar` ou `jogador`; o auxiliar tem ainda `jogando` (está jogando como jogador) e `abas` (as que ele mestra);
  `sem_vivo` diz que o mestre fechou a mesa ao vivo para essa pessoa (só muda por `vivo_do_jogador`) e `acamp`, que
  ela mexe no acampamento (só muda por `acamp_do_jogador`).
- `campanhas` e `campanha_membros`: as campanhas da mesa (nome, ordem, encerrada) e quem participa de cada uma. De
  que campanha é cada coisa fica na linha dela: `personagens.campanha` e `registro.campanha` (uma, ou nenhuma) e
  `documentos.campanhas` (uma lista: um mapa pode ser de mais de uma). Sem campanha = do mundo. `mesas.campanhas`
  é quantas a mesa tem (para quem não participa de nenhuma saber que elas existem). Ver "As campanhas".
- `registro`: a mesa ao vivo (rolagens e conversa). Uma linha em segredo (`secreta`) é só de quem a escreveu — ou,
  com `para`, também da pessoa a quem ela se destina (só quem mestra escreve uma linha "para" alguém, e sempre em
  segredo; para quem ela vai não muda depois; quem a recebe a lê mesmo com a mesa ao vivo fechada para ele).
- `personagens`: uma linha por ficha, em três colunas: `ficha` (o que o personagem é: atributos, barras, itens,
  bolsas…), `skills` (a árvore: as árvores equipadas, os pontos que o personagem tem em `pontos`, onde gastou em
  `alocados` e, em `ramos`, os caminhos trancados que o mestre abriu para ele — ver "A Árvore (lote 6)") e `estado` (o que muda no meio do jogo: o valor atual das barras em `rec`, a sobrevida em `sob`, as
  quantidades das bolsas em `qtd`, os bônus temporários em `tmp`, as moedas, Sanidade e Conforto, os
  relacionamentos em `rels`, os ferimentos em `fer`, as missões do personagem em `mis`, o XP em `xp`, a emoção — a
  aura no Acampamento — em `emo` e o valor de agora das barras especiais em `pd`). As marcas que só o mestre põe
  também moram no `estado`, para o que o jogador grava na ficha não desfazê-las: `ativo: false` (fora do grupo ativo)
  e `ferTrava` (o cadeado dos ferimentos).
- `documentos`: o resto, um documento por assunto. Cada documento é "só do mestre" ou "da mesa":
  - Mapa-múndi: `mundo:mapa:<id>` (mestre), `mundo:pub:<id>` (o que os jogadores veem), `mundo:indice` (os nomes
    dos mapas do mundo que os jogadores podem abrir, e qual está sendo mostrado) e `mundo:rabisco:<usuário>` (os traços
    da caneta de cada pessoa, em todos os mapas: ver "O Mapa-múndi e a guerra (lote 17)").
  - Acampamento: `acampamento` — numa mesa com campanhas, um por campanha: `acampamento@<campanha>`. É o único
    documento que um jogador (com a permissão do acampamento) também grava — sem as partes do mestre.
  - Cenas: `cenas:indice` (a ordem das cenas, qual está no ar e qual aparelho do mestre a transmite), `cena:<id>:m`
    e `cena:<id>:v` (mestre), `cena:pub:m` e `cena:pub:v` (a cena que está no ar, sem o que é só do mestre) e
    `cena:pedido:<jogador>` (o que o jogador fez e o mestre ainda vai aplicar). Quem aplica os pedidos e escreve a
    projeção é o programa do mestre — um aparelho só, mesmo que ele tenha o site aberto em vários.
  - Rolador: `rol:est`, `rol:h:<id>`, `rol:c:<id>:<aparelho>-<n>` (as rolagens, em trechos; cada aparelho do mestre
    escreve nos trechos dele) e `rol:t:<id>` (tabelas).
  - Fichas: `fichas:cfg` e `fichas:grupos` (da mesa: as tabelas base e os grupos), `fichas:situacoes` e
    `fichas:tabelas` (mestre), `fichas:missoes` (da mesa: as missões do grupo) e `fichas:segredos` (mestre: ver
    "O que o mestre guarda só para ele"). Com campanhas, os grupos e as missões do grupo são de cada uma:
    `fichas:grupos@<campanha>` e `fichas:missoes@<campanha>`.
  - Jornal: `jornal:rascunho` (mestre), `jornal:pub` (o publicado), `jornal:cartas:<jogador>` e
    `jornal:resp:<jogador>` (ver "O Jornal (lote 6)").
  - Meditação: `medit:cena` e `medit:quem` (o lugar e quem medita), `medit:simbolos` (da mesa), `medit:receitas` e
    `medit:treino` (mestre), `medit:pratica:<personagem>` e `medit:achados:<personagem>` (ver "A Meditação (lote 6)").
  - Clã: `cla:c:<clã>` (mestre: o clã inteiro), `cla:pub:<clã>` (o que a mesa vê dele, montado pelo banco) e
    `cla:nomes` (da mesa: os nomes dos níveis) — ver "O Clã (lote 6)".
  - Os documentos são escritos pelo mestre (sem dono). O que o banco deixa um jogador criar: o `cena:pedido:` dele
    mesmo, as cartas dele ao Jornal (`jornal:cartas:<ele>`), a prática de um personagem dele na Meditação
    (`medit:pratica:<personagem>`) e a caneta dele no Mapa-múndi (`mundo:rabisco:<ele>`, que a mesa inteira lê). `jornal:resp:<jogador>` e `medit:achados:<personagem>` têm o jogador como dono
    (para ele ler), mas quem escreve é quem mestra — e, no segundo, as funções da Meditação.
- Storage, pasta `mesas/<mesa>/`: as imagens (mapas, retratos, fundos).

### Duas pessoas mexendo na mesma ficha

O estado de um personagem é mexido por mais de uma pessoa ao mesmo tempo: o mestre dá dano pelo token enquanto o
jogador gasta SP pela ficha, ou usa uma poção pela cena. Por isso o `estado` nunca sobe inteiro ("o meu por cima do
seu"): sobe só o que mudou, e o banco junta (`personagem_juntar`, no formato "JSON Merge Patch": objeto se junta chave
por chave, `null` apaga, o resto troca). Cada barra, cada item da bolsa, cada bônus, cada relacionamento, cada
ferimento e cada missão é uma chave: mudanças em chaves diferentes ficam todas valendo; na mesma chave, vale a última.

As `skills` sobem do mesmo jeito: o mestre dá pontos (no quadro de Ascensão da ficha, ou na aba Árvore) enquanto o
jogador gasta os dele na árvore — um mexe em `pontos`, o outro em `alocados`, e os dois ficam valendo. (A lista das
árvores equipadas, `arvores`, é uma lista: troca inteira.) Páginas ainda abertas com uma versão anterior do site
continuam usando `estado_juntar`, que faz a mesma conta só para o estado.

Toda gravação devolve a revisão nova da linha e a que ela tinha logo antes (`rev_ant`). Se a anterior não é a que o
aparelho conhecia, outra pessoa mexeu na linha antes dessa gravação; se, quando a resposta chega, o aparelho já está
numa revisão mais nova que a dela, outra pessoa mexeu depois. Nos dois casos ele lê a linha de novo, inteira — sem
esperar o aviso em tempo real nem a leitura periódica —, e a tela fica com o que está no banco. O que chega do banco
enquanto uma mudança daqui ainda está subindo é juntado com ela na tela (as duas aparecem). Quando a ficha e o estado
saem juntos, são dois pedidos (o estado, depois a ficha): assim que o do estado chega, o estado deixa de contar como
"a caminho" e volta a acompanhar o banco, mesmo com a ficha ainda subindo.

O que foi apagado fica apagado: cada aparelho anota a revisão em que uma linha (um personagem, uma cena) foi apagada,
e dali em diante ela só volta por uma revisão maior que essa — isto é, se alguém a recriou. Uma leitura que saiu do
banco antes do apagar e chegou depois (numa rede lenta, por exemplo) não traz a linha de volta.

A mesa ao vivo é lida por revisão ("o que tem revisão maior que a última que vi"). Duas linhas gravadas no mesmo
instante podem ficar visíveis fora de ordem — a de revisão menor depois da de revisão maior —, e a menor ficaria para
trás. Por isso cada leitura confere de novo, só pelos números (`id`, `rev`, `apagado`), a faixa da leitura anterior e
busca o que faltar; e, ao abrir a mesa, a revisão mais alta é lida antes das linhas, não depois.

### Duas pessoas mestrando a mesma cena

A cena é um documento (dois: o mapa, `cena:<id>:m`, e a parte viva — tokens, efeitos, turnos —, `cena:<id>:v`), e é
gravada inteira. Com o mestre e o mestre auxiliar na mesma cena (ou o mestre em dois aparelhos), duas gravações no
mesmo instante se atropelariam: a que chegasse por último apagaria o que a outra fez. Por isso as cenas e o índice
(`cenas:indice`) são gravados **conferindo a versão**: a gravação só vale se o documento ainda está, no banco, na
revisão de que o aparelho partiu (`update … where rev = …`). Se não está, o núcleo (`tc/tc.js`) lê o que está lá,
**junta em três vias** — o ponto de partida, o que foi feito aqui e o que o outro gravou (`juntar3`) — e grava de
novo. O sistema recebe o documento juntado como uma mudança que veio de fora e refaz por cima dele o que ainda tiver
por salvar.

Como a conta junta: o que só um dos dois mudou fica como ele deixou; objetos se juntam chave por chave; listas de
objetos com `id` (tokens, desenhos, paredes, luzes) se juntam objeto por objeto, e listas de nomes sem repetição (a
ordem das cenas, a fila de turnos), nome por nome; a ordem é a de quem mexeu na ordem, e o que o outro incluiu entra
ao lado do vizinho que tinha lá. Só quando os dois mexem na **mesma coisa** (o mesmo token arrastado para dois
lugares, a mesma barra) fica uma só — a de quem gravou por último —, igual para todos. Quem apagou, apagou.

A projeção que os jogadores recebem (`cena:pub:*`) não passa por isso: só o aparelho que transmite a escreve,
inteira. Ao fechar a página, o que falta vai do jeito simples (não há mais quem receba um documento juntado).

### A cena ao vivo: o que demora quanto

Um token que um jogador move (ou uma barra que ele muda) faz este caminho: o pedido dele sobe ao banco, o aparelho do
mestre que transmite o aplica e publica a projeção, e a projeção chega aos outros. Desde a versão 2026.10.24-1:

- **A fila da casca não adia o que já estava marcado** (`agendar`, em `tc/tc.js`). Uma linha sobe meio segundo depois
  da primeira mudança dela que ainda não subiu — e não meio segundo depois da última. Antes, cada mudança recomeçava
  a espera: com duas ou três pessoas mexendo, a projeção podia ficar parada até todo mundo dar uma pausa.
- **O que os outros estão esperando sobe com pressa** (`opt.pressa`, levado pela ponte): a projeção (`cena:pub:m` e
  `cena:pub:v`) e os pedidos dos jogadores (`cena:pedido:*`) sobem 30 ms depois, sem o meio segundo. O resto (as
  fichas, a cena guardada inteira, o índice) continua juntando o que muda em sequência.
- **A projeção sai antes de a cena ser guardada** (`publicarLogo`, em `07d-nuvem.js`): 40 ms depois de uma mudança na
  cena que está no ar, e não junto com a gravação da cena inteira (450 ms). No meio de um gesto do mestre, ela espera
  ele soltar.

Com isso, do jogador que solta o token até a tela dos outros fica perto de 0,7 s (antes, 2 a 3 s, e mais com várias
pessoas mexendo); do mestre até os jogadores, perto de 0,3 s. Enquanto o mestre arrasta alguma coisa, os pedidos dos
jogadores ainda esperam ele soltar.

### As rolagens e o auditor

Toda rolagem do site é sorteada no aparelho de quem rolou, com o gerador de números do navegador
(`crypto.getRandomValues`, com sobra descartada para nenhuma face sair mais que as outras), e vai para a mesa ao vivo
(tabela `registro`). Além do texto que aparece no painel, cada linha guarda os dados que sorteou, um a um —
`dados.dd: [[lados, valor], …]` (`TC.dice.diceOf`) —, venha ela do chat (`/r`, `/fixa`), da telinha de dados, da
ficha (rolagem rápida, iniciativa, disputa, situações, tabelas), de um token nas Cenas, de uma poção ou do Rolador.

O **auditor** (Rolador → Menu → Auditor dos dados; só o mestre, só leitura) lê o registro inteiro da mesa — inclusive
o que já foi limpo do painel — e mostra, por pessoa e por tamanho de dado, quantas vezes saiu cada face contra o
esperado, com um veredito em palavras. As contas estão em `tc/auditoria.js`:

- **Duas perguntas** ao mesmo conjunto: alguma face saiu demais ou de menos (qui-quadrado)? E, no conjunto, os
  resultados caíram mais alto ou mais baixo do que deviam (a altura média)? Cada uma responde com metade da
  tolerância, para que as duas juntas estranhem um dado honesto em 5% das conferências e o acusem em 1%.
- **Dados de tamanhos diferentes** (toda rolagem com fixa é um dado de outro tamanho) entram na mesma conta em dez
  faixas da altura do dado; o esperado de cada faixa leva em conta que um d6 não se espalha por igual em dez.
- **Rolagens antigas**, de antes de existir o `dd`, têm os dados lidos do texto do painel (`doResumo`), que cada tipo
  de rolagem escreve sempre do mesmo jeito; o que não dá para ler com certeza fica de fora.
- **Valor que o dado não tem** (um 0 num d20) não entra nas contas e aparece num alerta: é defeito, não sorte. Foi
  assim que apareceu o do botão "Rolar iniciativa" da ficha, que sorteava de 0 a 19 (corrigido em 05/10/2026;
  `fichas.test.js` agora troca o sorteio do navegador por um controlado e confere a face mais baixa e a mais alta).

Uma linha do registro pode levar um **recado para os sistemas** (`dados.sis`), que a casca repassa às molduras
(`TC.ponte.registro.aoChegar`). É assim que a iniciativa rolada pela telinha chega às Cenas do mestre, que a
oferecem ao lado do token na ordem de turnos — nada é anotado sozinho, e só vale se quem rolou é o dono da ficha
(ou o próprio mestre).

### O combate nas Cenas

As contas ficam em `src/cenas/src/js/07e-combate.js` e as telas em `10c-combate.js`. Nada age sozinho: toda mudança
na cena passa por um botão e vira um passo de desfazer.

- **F — rolar atributo pelo token.** Uma janelinha ao lado do token (o que está sob o cursor; senão, o selecionado),
  com um botão por atributo da ficha e o campo "Fixando". Fica aberta até fechar (Esc, F, o × ou um clique fora) e
  não muda a seleção. O mestre usa em qualquer token ligado a uma ficha; o jogador, no token do personagem dele.
  Token sem ficha: um valor digitado, com a mesma regra da fixa.
- **A iniciativa de cada turno.** Quem joga mais de uma vez por rodada (um chefe) pode ter uma iniciativa para cada
  turno (`token.inis`, no painel do token, em Turnos): 1d20 + 6 no primeiro, 1d20 + 4 no segundo, 1d20 + 0 no
  terceiro; vazio, vale a iniciativa de sempre. A fixa é uma só por token (a que o mestre digita fica lembrada
  enquanto a página está aberta; sem isso, a da ficha). Para os jogadores, o token de um NPC vai sem as iniciativas.
  (A "fixa de cada turno" de antes, `token.fixas`, era um engano e sai das cenas ao abrir.)
- **A faixa de iniciativa de um grupo.** Vários tokens numa linha só da ordem (`turn.list[]` com `toks: [ids]` e o
  bônus próprio), rolada uma vez no combate: quem tirar mais que a faixa joga antes do grupo; quem tirar menos,
  depois; empate, o outro vai antes (`turnSort`). Um token fica numa faixa só e, nela, não tem linha própria. Na vez
  da faixa, o anel aparece em todos os tokens dela, e a duração das condições deles desconta quando a faixa termina
  a vez. Para os jogadores, a faixa vai só com os tokens que eles veem (e não vai, se todos estão ocultos). Dá para
  mudar nome, bônus e quem está nela, ou separar em linhas. (Lote 8) Na janela da faixa nova, quem já está em outra
  faixa vem desmarcado, com o nome dela ("está na faixa Goblin: marque para trazer"): antes vinha marcado e, com a
  seleção de antes ainda de pé, a primeira faixa ficava vazia e sumia. Marcado, ele sai da outra.
- **Esperando para reagir** (`reac` na entrada): a marca de quem segurou a vez para agir fora de ordem. O botão fica
  na linha de quem está jogando (e na de quem está esperando, para dizer que reagiu); a marca sai sozinha quando a
  vez dele volta.
- **Encerrar** (lote 8, `encerrarCombate`) zera a iniciativa de todos — a da ordem, a rolagem guardada, a reação e as
  rolagens da mesa ao vivo que ainda não foram anotadas (`App.iniRolls`) —, para o combate seguinte começar do zero.
  É um passo de desfazer só, e o aviso traz o Desfazer.
- **K — ataque com defesa** no token sob o cursor (ou nos selecionados; sob o cursor um dos selecionados, vale a
  seleção inteira). Só o mestre.
- **Força e defesas ao lado do nome.** Com o mouse sobre um token (ou com até quatro escolhidos), uma etiqueta ao
  lado do nome mostra Força, Canalização Mágica, Defesa Física, Defesa Mágica e Esquiva, cada um com o seu
  desenho (espada, livro, escudo, manto, pé). Vêm da ficha (`Fichas.numeros`, as mesmas contas da janelinha F);
  num token sem ficha, o mestre preenche os que quiser (`token.st`). Só o mestre e o dono veem: a projeção tira
  `st` dos tokens do mestre.
- **Sanidade e Conforto no token, só para o mestre.** Quando a ficha ligada usa os dois (a de um jogador, ou a que
  já tem algum anotado), o token ganha duas barras tracejadas no alto (`Fichas.mente`), e o painel, os campos com
  −5/−1/+1/+5, que gravam direto na ficha (`Fichas.mudarMente`). Não estão nas barras do token: não vão para os
  jogadores, nem para o dono. O Desfazer do aviso volta ao valor de antes da sequência de cliques.
- **Sobrevida em grupo**: na seleção de vários tokens, no botão direito e na aba Jogadores (aos dos jogadores, ou a
  todos da cena). Cada um fica com a maior — a que já tinha ou a nova; não soma. O escudo com o número aparece
  também para quem só vê a proporção das barras: a projeção manda a sobrevida em proporção (`x`) e em pontos (`xn`),
  e o `cleanBar` do lado do jogador guarda o `xn` (sem ele, o escudo mostrava a porcentagem: 6 de 46 virava 13).
- **O teclado volta para a cena no clique.** O clique no mapa não muda o foco sozinho (o `preventDefault` do
  `pointerdown`); por isso a cena puxa o foco ali (`tomarFoco`): quem acabou de escrever na conversa da mesa ao vivo
  usa os atalhos logo depois de clicar no mapa.
- **Condições por categoria.** São 67 (20 vieram no lote 7), cada uma com uma categoria (`CONDS[].g`: Dano, Controle, Combate, Mente,
  Corpo, Ritmo, Bênçãos); a escolha mostra uma aba de cada vez (ou Todas), com uma busca pelo nome que ignora
  acentos. A aba que tem condição ativa ganha um ponto.
- **C — disputa** (só o mestre): dois lados, cada um com um token da cena ou um valor avulso; lado com ficha escolhe
  o atributo. Vai para a mesa ao vivo com o que cada lado rolou — em segredo, se um dos tokens está oculto ou com o
  nome escondido. O veredito sai em verde ou vermelho só quando um dos lados (e só um) é de jogador.
- **Puxar o grupo**: cria de uma vez os tokens de um grupo das Fichas (ou dos personagens dos jogadores), já ligados
  às fichas — nome, barras, iniciativa, imagem e dono —, em quadrados livres a partir do meio da tela. Quem já tem
  token na cena fica de fora; um Desfazer tira todos.
- **Ataque com defesa.** O mestre diz o dano, a barra e quais defesas descontam (as duas gerais e as 13 específicas;
  as marcadas se somam; nenhuma = o dano entra inteiro), o mínimo e o máximo (que valem depois do desconto), e a
  janela mostra, alvo por alvo, o que vai sobrar. Token sem ficha: o mestre digita quanto ele tomou. Nada muda antes
  de "Aplicar". O aviso do resultado para a mesa lista só quem os jogadores podem ver com números (token de
  jogador, ou barra com "Números" para quem não é dono) e nunca um token oculto.
  - **Quem defende pode rolar.** Com "Rola a defesa", cada alvo com ficha precisa de uma rolagem da soma das
    defesas, com a regra da fixa; desconta o que sair. O mestre rola pelos NPCs ali mesmo; para os personagens de
    jogador, manda um **pedido**, e pode rolar por quem demorar ou valer a defesa inteira.
  - **O pedido** é uma linha da mesa ao vivo (`dados.k = 'pedido'`, `dados.pd = { rot, defs, alvos: [{ c, n }], fim? }`),
    sem o dano e sem o valor da defesa de ninguém: a casca de cada jogador soma as defesas da própria ficha, rola e
    escreve uma rolagem comum com o recado `sis = { t: 'rd', p: id do pedido, c, v, a, f, d }`. A linha da resposta
    tem um id que depende do pedido, do personagem e de quem rolou: a mesma pessoa não rola duas vezes. A janela do
    mestre só aceita a resposta de quem é o dono da ficha (ou do próprio mestre) e que caiba na defesa de agora; a
    primeira vale. Ao aplicar ou fechar a janela, o pedido ganha `pd.fim` (`aplicado` ou `cancelado`); esquecido,
    expira sozinho em 10 minutos. (`TC.ponte.registro.pedir / encerrar`, `TC.aoVivo.pedirDefesa /
    responderDefesa / encerrarPedido`.)
- **Objetos de cenário** (ferramenta J, só o mestre): tochas de parede, lampiões, velas, fogueiras e braseiros (com
  a luz que tremula), móveis e baús, natureza, perigos e marcos — cada um desenhado em `06b-props.js`. Um objeto é
  um token com `prop` (e `rot`, o giro): anda, gira, se esconde e se apaga como um token, mas não tem barras,
  condições, nome à mostra nem visão; fica por baixo dos tokens e fora da ordem de turnos, das áreas de dano, da
  mira, da janelinha F e do K. A luz que tremula (`light.fl`, também nas luzes fixas e na tocha que o token carrega)
  ganha um clarão animado dentro do que ela alcança (`Vision.out.flick`, com o polígono que as paredes cortam).
- **Zonas de efeito**: 51 (19 vieram no lote 7), em quatro categorias (Elementos, Magia, Natureza, Sagrado e sombrio). Na primeira vez em
  que o mestre aplica uma zona, a condição que combina com ela já vem escolhida (`FX.P[].sug`). Quando a vez passa
  para alguém que está dentro de uma zona com algo guardado (o "Aplicar a quem está dentro…"), o mestre vê um aviso
  — "Ana começa a vez dentro de Lava: −5 Vida + Queimando" — e escolhe Aplicar ou Pular. Nada acontece sozinho.
- **Parede durante o arrasto**: com "Paredes barram o movimento dos jogadores", o token do jogador para na parede
  enquanto é arrastado (não só ao soltar), e a visão — e o mapa explorado — nunca é calculada do outro lado.
- **Terreno** (ferramenta Q, só o mestre): áreas com tipo (morro, montanha, plataforma, fosso, água, mata) e altura
  na unidade da cena, pintadas com pincel, retângulo, elipse ou polígono. É um desenho da cena com o campo
  `ter = { t, h }`, pintado logo acima do fundo, e é só visual: o token que está em cima mostra a altura junto do
  nome (▲3 m; ▼ num fosso), e o rodapé e a dica do mapa dizem o que há sob o mouse — para o jogador, só onde a névoa
  não cobre. Fora da ferramenta Terreno, a área não se deixa selecionar (é parte do mapa). Um desenho de jogador
  nunca vira terreno (`Proj.formaLimpa` não deixa passar o campo).

A casca avisa os sistemas da versão da conversa com ela (`TC.ponte.estado.v`): uma aba das Cenas aberta numa casca
que ainda não foi recarregada depois desta atualização avisa que a disputa não chegou à mesa, em vez de calar.

### Fichas, poções e rolagens (lote 5)

- **Bloqueio.** Uma terceira defesa (`BLQ`, "BLOQ"), ao lado da física e da mágica: na ficha, nos bônus dos itens e
  da Árvore, na telinha de dados e no F das Cenas. Ficha antiga ganha `BLQ: 0` ao ser aberta, sem regravar o resto.
- **Barras especiais** (os antigos "poderes divinos", agora com o nome que o mestre quiser: cargas, usos…). A lista
  — nome e limite — fica na ficha (`ficha.poderes`); o valor de agora, no estado (`estado.pd: { id: n }`; sem nada
  ali, vale o `atual` antigo da lista). Ligado à ficha, o token mostra cada uma em bolinhas, e mexer nelas pelo token
  grava na ficha — "às cegas" quando quem mestra não vê a ficha (`barras_do_token`, com `p_pd`). O descanso do
  Acampamento as enche. "Encher todas" e o "×" de cada uma têm Desfazer.
- **Poções com vários efeitos** (até 8, em `item.fx`): mexer numa barra (ou numa barra especial: `rec: "pd:<id>"`),
  dar sobrevida (fica a maior), dar um bônus (até o próximo descanso, por rodadas ou com uma anotação) e pôr uma
  condição no token de quem recebe (só pela cena). A poção de antes (`rec`/`val` e `bk`/`bv`/`bd` soltos no item) é
  lida como a lista equivalente (`efeitosDoItem`). As contas são de `TC.rules.usarItem`; a prévia, de `previaDoUso`;
  o texto, de `textoDoUso`.
- **Em outra pessoa.** "Usar" pergunta em quem. Em outro personagem, a barra é achada **pelo nome** (o "HP" da poção
  mexe no "HP" de quem bebe). Pela ficha, o mestre grava as duas fichas direto; o jogador, que não grava a ficha do
  outro, passa por `usar_item_em`: o banco confere de quem é a bolsa, se o item existe e ainda tem, se o outro está à
  vista de quem usa e a forma de cada mudança, e grava as duas juntas (com o caminho de volta, para o Desfazer). Pela
  cena, o jogador manda um pedido (`{ t: 'item', de, item, alvo, rol }`) e o programa do mestre confere tudo antes de
  aplicar — a ficha é dele, o item tem, o token está à vista e cada dado rolado cabe no efeito (`faixaDoEfeito`:
  "2d6+3" dá de 5 a 15). Num token sem ficha, as barras dele fazem papel de ficha e o bônus não vale. A mesa ao vivo
  não fica sabendo da vida de quem recebe quando quem usa não é o dono dele: "HP +30", não "HP 20 → 50".
- **Bônus só nesta rolagem.** Na rolagem rápida da ficha, na telinha de dados e no F das Cenas: "+ atributo" soma no
  atributo **antes** de rolar (muda o dado: atributo 40 com +5, fixando 15, rola 1d30 + 15) e "+ resultado" soma no
  total (vale também para a iniciativa). Voltam a zero depois da rolagem que os usou. A linha da mesa ao vivo guarda
  `base`, `ma` e `mr` e diz os dois (`TC.dice.rollFixaMais`, `TC.dice.maisTexto`).
- **Personagem ativo** (só o mestre marca, na ficha): quem está fora do grupo ativo — um suporte que fica no
  acampamento — vem desmarcado em "Puxar o grupo", nas Cenas ("Só os ativos", "Todos" e "Nenhum" trocam a marcação).
- **O cadeado dos ferimentos**: travado, só o mestre põe, edita e tira ferimentos da ficha; o jogador vê "travado pelo
  mestre".
- **Relacionamentos de uma vez**: "Esconder tudo" (na hora, com Desfazer) e "Revelar tudo" (pergunta antes; o
  Desfazer devolve cada linha escondida do jeito que estava).
- **A mesa ao vivo fechada para um jogador** (`mesa_membros.sem_vivo`, que só o mestre da mesa muda, por
  `vivo_do_jogador`): a regra de leitura do `registro` passa a entregar a essa pessoa só as linhas dela. Fechar e
  abrir avisam o aparelho dela, que lê a conversa de novo (fechada, só as dela; aberta, tudo).

### Fichas e Acampamento (lote 6)

- **Embate** (`EMB`): um derivado — metade da Vitalidade **base**, para baixo, mais o Bloqueio inteiro (o valor próprio,
  os itens, a árvore e os bônus dele). Por isso `calcular` agora faz as defesas **antes** dos derivados, e o `calc` de
  cada derivado recebe as defesas (`calc(base, def)`). Rola como os outros (ficha, telinha, F das Cenas) e é a 9.ª das
  doze chaves de bônus (`CHAVES_BONUS`).
- **A regra de cada barra especial** (`ficha.poderes[].rec`): `longo` (enche no descanso longo — o padrão, que nem fica
  anotado), `qualquer` (enche em qualquer descanso), `quantia` (soma `qc` no curto e `ql` no longo, sem passar do
  limite) ou `manual` (o descanso não mexe). O mestre escolhe na ficha; o jogador vê a regra por extenso
  (`textoRecEspecial`). A conta do descanso é do acampamento (`AcampNucleo.paraDaEspecial`); a regra geral das barras
  (`regras.longo.poderes`) saiu.
- **Tirar os bônus no descanso** (`regras.longo.tiraBonus`, `regras.curto.tiraBonus`, os dois `true` de começo): o
  padrão de cada tipo de descanso. Na janela do descanso, a chave muda só para aquele descanso (`planejar(…, { tiraBonus })`);
  cada linha do plano traz `saem` (os bônus "até o próximo descanso" que acabam) ou `ficam`. O descanso que não tira
  anota no diário, e os bônus "até o descanso" do próprio acampamento também ficam.
- **Fadiga** (`estado.fad`, de 0 a 5; sem nada anotado, a pilha está cheia): em uso na ficha de um jogador da mesa e na
  que tem a fadiga anotada (`TC.rules.usaFadiga`). Mexem o mestre e o dono (na ficha e no painel do token). O descanso
  longo a enche e o curto devolve um. O programa do mestre leva o valor ao token (`token.fad`), que a cena dos
  jogadores recebe junto — a pilha aparece no token para todos, mesmo para quem não recebe a ficha.
- **Amputação** (`estado.amp: { parte: { c, n } }`, só os oito membros): um estado permanente, à parte dos ferimentos.
  A parte de baixo vai junto (`ABAIXO`: sem o braço, sem a mão). Marcar pergunta antes e tira os ferimentos abertos
  daquela parte e da de baixo (com Desfazer); não pesa nas contas e não põe o sinal de ferido no token
  (`TC.rules.amputados`). No painel do token, os membros amputados aparecem junto dos ferimentos.
- **Equipamentos em cartões** (`FichasExtras.painelItens`): a chave de equipado, o nome e só o que o item soma; "Editar"
  abre os doze números, as barras e defesas específicas, as passivas, a **relíquia** (`item.reliquia`: só o destaque
  dourado) e o **grupo de troca** (`item.troca`). Dos itens do mesmo grupo (sem diferença de maiúsculas e acentos), um
  só fica equipado: equipar um guarda os outros (`TC.rules.equiparItem`, com Desfazer). Dois equipados no mesmo grupo
  (porque o grupo foi dado depois) só ganham um aviso.
- **"Só funciona com…"** (`item.req`: `'i:<id do item>'` ou `'g:<grupo de troca>'`): o item complementar (a bainha da
  espada) só vale com aquele item, ou com qualquer item do grupo (qualquer nível da espada serve). Equipado sem ele,
  fica "sem efeito" — o cartão avisa e ele não soma (`TC.rules.itemAtivo`, que `calcular` usa no lugar de
  `equipado`). Equipá-lo equipa o requisito junto (num grupo, o último usado: `item.uso`); guardar o requisito guarda
  junto quem depende dele, que fica marcado (`item.volta`) e volta quando o requisito voltar. Trocar o nível da espada
  não guarda a bainha (o grupo continua atendido). `equiparItem` devolve `{ itens, guardados, trocados, equipados,
  trocas }`, e `textoDoEquipar` escreve o aviso ("Guardou Espada do Gelo I; guardou junto: Bainha de Selene e Luva da
  Geada."), o mesmo nas Fichas e na janelinha E das Cenas. Um requisito que saiu da ficha não prende o item.
- **Os tipos de equipamento (lote 7).** `item.tipo` guarda o id do tipo: os prontos (`TC.rules.TIPOS_ITEM`: Arma,
  Armadura, Escudo, Acessório, Vestimenta, Ferramenta e Outro) e os que quem mestra cria (`S.cfg.tiposItem:
  [{ id: 'tp_…', nome }]`, na configuração da mesa — o documento `fichas:cfg`; `tiposCriados` arruma: sem repetir nome,
  até 30). A lista vira seções (`secoesDeItens`: na ordem dos tipos, os da mesa antes do Outro, "Sem tipo" no fim; em
  cada uma, os equipados primeiro), que se recolhem (`S.itFechadas`, neste aparelho). Em cima, os filtros (tipo,
  equipados ou guardados, relíquias e a busca pelo nome, sem acento): só na tela (`filtros`, sem gravar), aplicados no
  próprio DOM — a busca não perde o cursor. Na ficha só para consulta, os filtros, a busca e as seções continuam
  (`limitar()` em fichas/mesa.js). "Separar por tipo…" sugere o tipo de cada item sem tipo pelo nome (`tipoPeloNome`:
  a primeira palavra que diz alguma coisa decide; sem palpite, "Outro") e só aplica no "Aplicar" (com Desfazer). O "+
  Item" com o filtro de um tipo ligado já vem daquele tipo. A alça do cartão arrasta (soltar noutra seção troca o tipo;
  um guardado não passa à frente dos equipados) e, com o foco nela, as setas sobem e descem — com Desfazer.
- **Itens com níveis (lote 7).** `item.niveis: [{ bonus, rec, def, efeito }, …]` (de 2 a 10) e `item.nv` (o de agora).
  Os números e a passiva do nível de agora ficam também no próprio item — o espelho (`itemNoNivel`): as contas, as
  Cenas e a versão de antes do site leem dali; a fonte é a lista. `espelharItem` (no `migrar()`) refaz o espelho que
  não confere e devolve o mesmo objeto quando confere (abrir a ficha não a regrava). No "Editar", uma aba por nível
  (`nivelAberto`): os campos levam `data-nv` e gravam no nível (`editarNivel`); "+ nível" (`itemComNivelNovo`: o novo
  começa igual ao último), "Usar o Nv…", "Copiar do Nv…" e "Tirar o Nv…" (`itemSemNivel`; sobrando um nível, o item
  volta a ser comum). O ◂ Nv ▸ do cartão (o dono e quem mestra — quem edita a ficha) troca o de agora, com Desfazer, e
  manda para a mesa ao vivo "Katana de gelo: Nv 1 → Nv 2" (`textoDoNivel`, pelo `logar` da ficha).
- **"Só funciona com…" com vários (lote 7).** `item.req` pode ser uma lista: o item vale com QUALQUER um deles
  (`reqsDoItem`; um só continua sendo um texto, como antes). `'i:<id>@<n>'` pede aquele item do nível n para cima
  ("Katana de gelo (Nv 2 ou mais)"). O que saiu da ficha não conta (com todos fora, não prende). Equipar o complementar
  traz, dos que servem e no nível pedido, o usado por último. No cartão, o "com…" fica numa linha só dele.
- **Pets** (`ficha.petDe`: o id do dono): uma ficha suplementar, como a de um NPC — atributos à mão (distribuição livre,
  do zero), barras, habilidades, sem bolsa, sem Tier e sem ligar sozinha o que a de jogador liga (Sanidade, corpo,
  fadiga, relacionamentos: `deJogador` não conta o pet). No elenco, fica logo embaixo do dono. Quem controla o dono
  controla o pet: a gravação acerta o `dono_id` (e a campanha) do pet pelos do dono, e mover o dono de grupo ou de
  campanha leva os pets junto. Excluir o dono exclui os pets (a pergunta diz isso).
- **Quem vê a ficha**: "Os outros jogadores veem esta ficha (o dono sempre vê a dele)" — o banco já deixava o dono ver a
  dele com a ficha escondida; agora a chave, o olho da lista e o aviso dizem isso.

### As Cenas (lote 6)

- **Teclas novas.** **N** passa a vez e **Shift+N** volta (só o mestre; o jogador recebe um aviso); **E** abre os
  equipamentos do token. Por isso a Névoa manual foi para **U** e os Efeitos de magia, para **Y** (as dicas dos botões
  e a janela de atalhos já mostram as novas).
- **E — os equipamentos do token.** Uma janelinha ao lado do token (o sob o cursor; senão, o selecionado), como a do F:
  um cartão por item da ficha, com a chave de equipado, o nome, o grupo de troca, a gema da relíquia e só o que o
  item soma. Um clique equipa ou guarda; do mesmo grupo de troca, um só fica equipado (`TC.rules.equiparItem`). Grava
  na ficha (`Fichas.equipar`, com Desfazer, que devolve só a chave de equipado de cada item) e acompanha mudanças de
  fora enquanto está aberta. O mestre usa em qualquer token ligado; o jogador, no token do personagem dele. Abrir a do
  F fecha a do E, e vice-versa. (Lote 7) Os itens vêm na ordem das seções da ficha (`Fichas.itens` usa `secoesDeItens`
  com a configuração da mesa), com o título de cada tipo quando há mais de um, e o item com níveis mostra o de agora
  ("Nv 2").
- **Postura** (`token.post`): uma marca liga/desliga — a etiqueta âmbar "Postura" junto do nome, que todos veem. A
  chave fica na seção Condições do painel do token; o jogador muda a do token dele (a projeção aceita só `true` ou
  `false`, com a mesma permissão das condições).
- **O contador de uma condição em vários tokens.** Com vários tokens selecionados (no painel e na janela de condições),
  cada condição ativa ganha uma linha com − e + (somam ou tiram 1 de cada um; quem chega a zero perde a condição) e as
  rodadas (o mesmo número para todos que a têm). Tudo num passo de desfazer (`Act.condLote`). A linha diz em quantos
  tokens a condição está e o contador ("1 a 3"; o de cada um na dica).
- **A linha invisível na ordem de turnos** (`inv` na entrada): o olho de cada linha esconde dos jogadores todas as
  linhas daquele combatente (os vários turnos de um token, ou de uma entrada avulsa; `Act.turnInv`, com Desfazer). A
  projeção não manda a linha; na vez dela, manda `turn.mestre = true` sem apontar a vez para ninguém, e o jogador vê
  "O turno está com o mestre" (na aba Turnos e no aviso de vez). Duas linhas invisíveis seguidas chegam iguais. As
  linhas novas de quem está invisível (mais turnos por rodada, a faixa desfeita) também ficam invisíveis. O token
  continua no mapa como estiver (para sumir com ele, é o "Ocultar" de sempre).
- **Bônus só nesta defesa.** No cartão do pedido de defesa, na mesa ao vivo: "+ atributo" (soma na defesa antes de
  rolar: muda o dado) e "+ resultado". A rolagem diz os dois, e o recado leva `sis.ma`, `sis.mr` e `sis.b` (a defesa
  sem o bônus). Na janela do ataque, o que foi rolado (sem o + resultado) tem de caber na defesa com o + atributo, e a
  conta aparece na linha do alvo: "rolou 45 de 40 (27 no d30 + 15 · +5 no atributo · +3 no resultado)". Uma defesa
  que fique negativa por um − no resultado desconta zero.
- **Shift+F, a rolagem geral** (`Luta.rolagemGeral`): o mesmo atributo para vários tokens — os selecionados, os
  personagens dos jogadores ou todos da cena —, com o nome da rolagem e a fixa de cada linha. O mestre escolhe na hora:
  "Pedir aos jogadores" (uma linha da mesa ao vivo, `dados.k = 'pedido'` com `pd = { rot, atr, alvos }`, que chega
  como o cartão do pedido de defesa; cada jogador rola pela própria ficha, e a resposta leva `sis.t = 'ra'`) — e rola
  os NPCs ali ("Rolar pelos NPCs") —, ou "Rolar tudo". "Rolar por ele", com o pedido aberto, vale como a resposta do
  jogador (o recado vai junto, e o cartão dele mostra "(pelo mestre)"). A janela confere cada resposta como a do
  ataque (de quem é, se cabe no atributo), diz quem tirou mais e não muda nada na cena. Fechar encerra o pedido
  (`aplicado` com todos rolados; senão, `cancelado`).
- **Pastas na lista de cenas** (`S.pastas = { lista: [{ id, nome }], de: { idDaCena: idDaPasta }, mae }`, só do mestre:
  numa mesa, no índice das cenas; sem mesa, neste navegador): a janela "Organizar as cenas…" (era "Organizar em
  pastas…"; arrastar a cena, ou escolher onde ela fica na lista ao lado dela; criar, renomear e apagar pastas — as
  cenas voltam para "Sem pasta"), com Desfazer. (As famílias de cenas, no lote 7, moram aqui também: `mae`.)
  Na lista do botão de cenas, cada pasta abre e fecha (lembrado neste aparelho). A cena que um marcador do Mapa-múndi
  abre ganha o ícone do mundo (`Nuvem.noMundo`, lido dos mapas da mesa).
- **O vilarejo** (`Vila`, `10d-vila.js`; desde o lote 7, na janela "Gerar um lugar…"): tamanho (aldeia ou vila),
  terreno, rio, paliçada e quantas casas, com a prévia e "Gerar outro". O plano é uma conta pura (`Vila.gerar`, pela
  semente); a cena nova sai com o fundo pintado (na mesa, vira arquivo no Storage) e, por cima, tudo editável: as
  paredes de cada casa com a porta e as janelas, os móveis (objetos de cenário), o poço e as luzes da praça, a paliçada
  com os portões abertos. A névoa dinâmica vem ligada (as paredes bloqueiam a visão). Nada sai escrito (até o lote 6,
  cada casa ganhava um nome; o mestre preferiu dar os nomes ele mesmo).
- **Os itens complementares na janelinha E**: o "com Espada de gelo" numa linha embaixo do nome, e "sem efeito ·
  precisa de …" quando está equipado sem o requisito.

### As Cenas (lote 7)

- **20 condições novas** (`CONDS` e `TC.rules.CONDICOES`, que o `rules` confere juntas): Petrificado, Adormecido,
  Eletrizado, Corroído, Enregelado, Possuído, Enraizado, Sufocando, Ofuscado, Vulnerável, Escudado, Refletindo,
  Etéreo, Enlouquecido, Determinado, Qi bloqueado, Desvio de Qi, Agigantado, Encolhido e Ventania — cada uma com
  ícone e cor próprios. São lembretes, como as outras (o contador e as rodadas de sempre; a Ventania usa o contador
  para os acúmulos), com três exceções:
  - **Escudado**: o número dele é a sobrevida do token (a soma de todas as barras; `condNum`). Na janela e na
    barrinha do token ele não tem − e +: os pontos mudam na barra. Sai quando a sobrevida vai de mais de zero a zero
    (pelo dano, ou zerada na mão); posto num token sem sobrevida, fica até ela chegar e acabar. Na tela do jogador, o
    token do mestre cuja barra vai só em proporção manda os pontos em `xn`, e o número sai deles.
  - **Agigantado** dobra o tamanho do token e **Encolhido** o deixa na metade (de ¼ a 8 quadrados: `TAM_MIN`,
    `TAM_MAX`), ajustado para continuar dentro da cena. O tamanho de antes fica em `t.tam0` e volta quando a condição
    sai (também quando acaba pelas rodadas). Os dois juntos não ficam: o que já estava sai, e vale o que entrou.
  - Quem acerta é o programa do mestre (ou o de quem usa sem mesa), nunca o do jogador (`acertaAqui`): no fim do passo
    que mudou o token, dentro dele (`Store.aoFechar`, com o mesmo Desfazer); para o que chegou de fora (o pedido de um
    jogador, a ficha), num passo logo depois. O "antes" de cada token é o do começo do passo (`antesDoToken`, pela
    última inversa que mexeu em cada coisa).
- **A faixa de cinema** (`#cine`): quando a vez muda, uma faixa larga atravessa o meio da cena por uns dois segundos
  (três, se há condições) — o retrato grande, "Vez de Dain", a rodada e as condições de quem vai jogar. O mestre vê
  sempre (na linha invisível, com a marca); o jogador vê a dele, "Sua vez!", quando a vez é de um token seu (numa
  faixa de grupo, se algum token dela é dele); os outros jogadores continuam com a faixa pequena do alto (`#turnb`).
  Na primeira vez de uma rodada nova, e quando o combate começa, vem antes a faixa "Rodada N" (1,5 s). Ela não pega
  clique (`pointer-events: none`), sai sozinha e troca na hora se a vez muda de novo (a que estava para vir é
  cancelada). A cor diz o lado: âmbar para os aliados, vermelho para os inimigos (a ficha diz `lado`; o token sem
  ficha e sem dono é do mestre e conta como inimigo; um grupo, se todos os tokens dele são), verde-água para o "Sua
  vez!". Com movimento reduzido, ela só aparece e some.
- **Os sons da vez** (`Som`, `10e-som.js`, feitos no navegador com Web Audio, sem arquivo): o gongo na vez de um
  aliado, o tambor na de um inimigo, dois toques claros no "Sua vez!" e um sino grave com tambor na rodada nova.
  Seguem a chave "Som ao rolar" da mesa ao vivo (`tinycats:som`), em cada aparelho: desligada, nada toca.
- **19 zonas novas** (`FX.P`, cada uma com o desenho dela): Chão congelado, Fumaça, Brasas, Muralha de cristais de
  gelo, Cinzas vulcânicas, Correnteza e Água eletrificada (Elementos); Vórtice, Gravidade pesada, Distorção do tempo,
  Portal, Runas-armadilha e Formação de selos (Magia); Óleo derramado, Lama e Jardim florescendo (Natureza); Névoa de
  espíritos, Santuário e Lua de sangue (Sagrado e sombrio). Cada uma diz a regra no painel (`regra`). O que dá trabalho
  à mão, o site faz; o resto é lembrete:
  - **Fumaça e Muralha de cristais tapam a visão de verdade** (`bloqueia`): o contorno da área (`FX.contorno`, o
    círculo em 28 lados) entra como parede de visão em `Walls.of` (`FX.barreiras`), e a muralha também barra a
    passagem (`barra`), como as paredes ("Paredes barram o movimento dos jogadores"). A zona só do mestre não barra.
    Mexer numa delas refaz as paredes e a visão (`FX.mexeNaBarreira`, no Walls e no `Vision.onOp`).
  - **A muralha tem pontos de vida** (`pv`, `pvm`; 30 ao nascer): no painel, o dano com sinal ("-8") ou o valor novo;
    em zero, ela quebra. "Quebrar" tira num clique. Tudo com Desfazer. O mestre vê a barrinha com os números no mapa.
  - **O Portal** é sempre de dois círculos, a entrada (`x`, `y`) e a saída (`x2`, `y2`, ao lado, ao nascer): arrastar
    dentro de um círculo leva só ele. O token solto num círculo — o centro estava fora dos dois e agora está num —
    sai no centro do outro, no mesmo passo (`atravessar`, no `Store.aoFechar`); o que um jogador solta atravessa num
    passo do mestre logo depois. O mestre vê "Fulano atravessou o portal", com Desfazer.
  - **As Runas-armadilha** nascem escondidas (`oculta`: `gm`); "Revelar aos jogadores" e "Esconder de novo" no painel.
    O token que entra nas runas escondidas avisa o mestre ("Lia pisou nas Runas-armadilha", com Revelar).
  - **As zonas de condição** (`cond`: Distorção do tempo, Névoa de espíritos, Lua de sangue) nascem com a condição
    guardada no `apply`, e o aviso do começo da vez pergunta: Aplicar ou Pular. Na Distorção do tempo, o painel escolhe
    Lento ou Acelerado (`conds`; os ponteiros andam para trás ou correm).
  - **As zonas de lembrete** (`lembra`) avisam o mestre no começo da vez de quem está dentro delas: "Ogro começa a vez
    dentro de Lama: só se anda a metade." — com Ok; nada muda sozinho. Brasas e Jardim avisam até o mestre guardar o
    dano ou a cura (aí vale o aviso com Aplicar).
  - Trocar o tipo no painel acerta o que a zona nova traz (`trocaDeZona`); o efeito pedido por um jogador também vem
    com a saída do portal, os pontos da muralha e a condição (`efeitoLimpo`).
- **As combinações** (`FX.COMBOS`): fogo (ou lava, chamas negras, brasas) no óleo, raio (ou tempestade) na água (ou
  pântano, correnteza), gelo (ou nevasca) na água. Quando as duas se encostam (`FX.seTocam`), o mestre vê o cartão —
  "Fogo no óleo: explosão?" — com Aplicar ou Pular (que não pergunta mais por aquele par). Aplicar troca as zonas (a
  que muda vira o resultado — Fogo, Água eletrificada, Chão congelado — e a que disparou sai; um Desfazer) e abre o
  dano para quem está dentro, com a condição da combinação sugerida (Queimando, Eletrizado, Congelado). O Desfazer
  não pergunta de novo; o fogo que um jogador solta também gera o cartão.
- **As famílias de cenas** (`S.pastas.mae = { idDaFilha: idDaMãe }`, no índice das cenas, só do mestre): uma cena
  fica dentro de outra — a cidade, o bairro, a casa. Na janela "Organizar as cenas…", arrastar uma cena para cima de
  outra a põe dentro dela; arrastar para o título de uma pasta (ou um canto vazio dela) a deixa solta ali; a lista
  "Onde fica", ao lado de cada cena, faz o mesmo (as pastas e, embaixo, as cenas — menos ela mesma e as de dentro dela).
  Sem voltas e até seis níveis (`Proj.normPastas` corta o resto; a janela avisa). A família inteira fica na pasta da mãe
  de todas. No menu de cenas, as filhas vêm logo abaixo da mãe, um pouco para dentro; a mãe tem, à direita, o botão que
  abre e fecha a família (com quantas cenas há dentro; lembrado neste aparelho em `tinycats:cenas:familias-fechadas`),
  e ele fica marcado quando a cena aberta está lá dentro. Duplicar uma cena deixa a cópia na mesma mãe (sem copiar as
  filhas); apagar uma cena passa as filhas para a mãe dela (ou as deixa soltas, na pasta dela) — a janela de apagar diz.
  Numa mesa com campanhas, a cena cuja mãe é de outra campanha aparece sem mãe.
- **As passagens**: um objeto de cenário pode levar a outra cena (`t.cena`, só do mestre: a projeção tira). Os
  marcadores **Entrada** e **Saída** (`Props.P.entrada`/`saida`, em Perigos e marcos) nascem ocultos dos jogadores. No
  painel do objeto, "Leva para outra cena" escolhe a cena (com Desfazer), "Ir para lá" vai, e "Uma cena nova, dentro
  desta…" cria a cena (na família desta, na mesma campanha) já com a Saída de volta. Dois cliques no objeto abrem o
  menu da passagem: "Ir para esta cena" (o aviso tem Voltar), "Ir e mostrar aos jogadores" (numa mesa), ou escolher
  outra. Ir para outra cena não muda o que os jogadores veem; se a cena ligada foi apagada, o menu diz.
- **Objetos novos** (para os estilos do gerador, e soltos): a lanterna de papel (uma luz), a almofada, o tapete (2 × 2),
  o jarro de barro, a bigorna, as flores e a pedra rúnica; e, para os interiores, o banco e o balcão (vários em fila
  viram um banco comprido ou o balcão da taverna; giram com o objeto) e a coluna de pedra.
- **A janela "Gerar um lugar…"** (`Gerador`, `10h-gerador.js`; o menu de cenas trocou "Gerar um vilarejo…" por ela):
  uma aba por lugar (o Vilarejo, a Cidade, a Tribo, o Encontro, as Ruínas, a Masmorra e o Porto), as escolhas do lugar à esquerda e, embaixo delas, o
  que vale para todos — o **estilo**, a **hora do dia**, o **clima** e a chave **"Com relevo e formas"** —; a prévia à
  direita. A janela abre na última aba usada (`App.opt.genLugar`).
  - **Os estilos** (`Estilos`, `10c2-estilos.js`): Comum, Oriental, Nórdico, Desértico, Élfico e Anão. O estilo muda o
    desenho (as cores da rua, o chão da praça — pedras, cascalho rastelado, terra com anel de pedras, mosaico, grama
    com flores, lajes de seis lados —, o piso das casas — tábuas, tatame, ladrilho, madeira clara, lajes —, as paredes
    pintadas — madeira, papel, troncos, adobe, madeira viva, pedra —, as árvores — cerejeira e bambu, pinheiros,
    palmeiras, árvores com luzinhas, pedras no lugar das árvores — e os enfeites: o torii na frente do santuário, o toldo
    listrado na porta), os prédios (a casa longa nórdica com a fogueira no meio, as casas redondas élficas e os salões
    anões de cantos cortados) e os móveis de cada tipo (`Estilos.TIPOS`). As luzes da praça também: lampião, lanterna de
    papel ou braseiro. O nome da cena acompanha ("Aldeia nórdica", "Vila anã").
  - **A hora e o clima** vão para a cena (`sc.tone`, `sc.light`, `sc.weather`); a hora tinge a prévia. À noite (e no
    breu), cada casa ganha uma luz por dentro ("Luz da casa"), que escapa pelas janelas e pela porta aberta.
  - **Travar**: um clique numa parte da prévia — uma casa, o rio, as ruas e a praça — trava a parte (o cadeado; com o
    teclado, as setas escolhem a parte e Enter trava). "Gerar outro" sorteia de novo, e o travado fica igual (a casa,
    com a porta, as janelas e os móveis; as ruas, com a praça; o rio). As ruas sorteadas desviam das casas travadas; a
    casa travada que não couber sai (o resumo diz). Trocar o estilo mantém a casa travada no lugar, com a mesma porta, e
    troca a forma, as janelas e os móveis (com outro sorteio, para não mexer no resto). "Soltar tudo" solta sem sortear.
  - **A semente** fica à mostra: o mesmo número, com as mesmas escolhas e o mesmo travado, dá o mesmo lugar.
  - **Os modelos** (`S.prefs.modelos`, no índice das cenas, só do mestre; `Proj.normModelos`, até 30): "Guardar como
    modelo" guarda as escolhas, o estilo, a hora, o clima, o relevo, a semente e o que está travado; abrir um modelo
    devolve o lugar (na aba dele, com Desfazer), e "Gerar outro" sorteia outros parecidos. A lixeira apaga um modelo.
  - **O relevo e as formas** (`Estilos.terrenoNaCena`, `formaNaCena`; a chave "Com relevo e formas", ligada, lembrada em
    `App.opt.genRelevo`): o lugar sai com áreas de Terreno com altura (as do menu Terreno: quem fica em cima mostra
    "▲6 m"; passar o mouse diz "Plataforma · altura 6 m") e com formas de enfeite **travadas** (arte de fundo: um clique
    passa direto; dois cliques selecionam, para destravar ou apagar). A prévia mostra os dois com o desenho de verdade
    do Terreno (`Estilos.relevoNaPrevia`, que usa o `Render.drawTer`). Desligada, o lugar sai plano. No vilarejo: o rio
    vira Água com 1,5 m de fundura, a ponte de madeira fica 1,5 m acima dela, o píer na beira do rio e, num canto
    livre, um morro (de 3 a 5 m); as bandeirinhas cruzam a praça, de uma luz à do outro lado. E, num sorteio à parte
    (o resto do lugar fica igual), os quintais atrás das casas: a horta e o terreiro com a lenha e o feno.
- **A Cidade** (`Cidade`, `10f-cidade.js`), em duas maneiras — a **cena completa** e o **mapa de bairros** — com o
  tamanho (Pequena 64 × 46, Média 80 × 56, Grande 96 × 68 quadrados), o terreno, quantos prédios (o resumo diz quantos
  couberam), o rio e a muralha. O plano (`Cidade.gerar`) é uma conta pura, com sorteios separados: o **traçado** (a
  muralha em octógono, com as torres e três ou quatro portões; a praça com a fonte; as ruas principais, dos portões à
  praça; o anel por dentro da muralha; o rio e as pontes; o templo de frente para a praça, com o cemitério ao lado; a
  casa do senhor no pátio murado, com o jardim e o laguinho; o quartel no pátio de treino, com os bonecos, os alvos e
  a torre de vigia; o largo do mercado com as barracas e o palco; e as ruas de bairro, uma grade torta que para onde
  bate num prédio grande e continua do outro lado), os **prédios comuns** (de frente para a rua, encostados nela, as
  ruas principais e a praça primeiro; o lote e o tipo de cada bairro — o centro, o bairro nobre, o mercado, o bairro
  pobre, o quartel e a beira-rio —; a frente da porta fica sempre livre) e os **quintais e as árvores** (a horta, o
  terreiro e o jardim nos fundos dos lotes). Travar: um clique num prédio trava o prédio; nas ruas, na praça, no rio ou
  num prédio grande, trava o traçado (as ruas, a praça, os pátios e os grandes ficam iguais e os prédios comuns são
  sorteados de novo; o prédio travado fica, e o traçado desvia dele). Trocar o tamanho solta a trava.
  - **A cena completa**: a cidade inteira na escala de batalha, com a visão pelas paredes. Cada prédio é fechado (as
    paredes do contorno; entra-se pelo marcador) e tem, na porta, um marcador de **Entrada** (oculto, só do mestre) que
    sabe o tipo, as medidas, o lado da porta, o estilo e uma semente (`t.gera`); dois cliques nele: "Gerar o
    interior…". Os pátios e a muralha têm os portões abertos. As lanternas (o poste do estilo) nas ruas principais e
    quatro na praça; à noite, um lampião na porta da taverna, do templo, da casa do senhor e do quartel, e tochas dos
    dois lados de cada portão (objetos com luz: nada de marcas de luz espalhadas pelo mapa). Na porta das lojas, dos
    armazéns e das ferrarias, caixotes, barris e sacos pintados. O relevo: o adarve da muralha a 6 m e as torres a 9 m;
    o fosso por fora (com água no comum e no oriental, seco no anão e no nórdico), com a ponte de cada portão; o rio com
    2 m de fundura, as pontes de madeira 2 m acima da água (as de pedra, do comum, do anão e do desértico, só no
    desenho), os píeres; a fonte, o palco do mercado (1,5 m), a torre de vigia (6 m) e o laguinho. As formas: as
    bandeirinhas cruzando a praça e o largo, os alvos de tiro. Nada sai escrito.
  - **O mapa de bairros**: a mesma cidade vista de longe (cada quadrado vale dois: 3 m), com o tom de cada bairro, a
    linha entre um e outro, o relevo na escala do mapa e um marcador de Entrada (oculto) em cada bairro (`gera: { b }`).
    O mapa guarda com que escolhas, semente e traçado a cidade foi feita (`sc.gerado`, só do mestre: a projeção tira).
    Dois cliques num marcador: "Gerar este bairro…" — a prévia do pedaço da cidade e o nome; "Criar a cena" refaz a
    cidade com os dados do mapa, recorta o bairro (`Cidade.recorte`: a caixa das casas dele, com três quadrados de
    folga; o que toca nela entra, e o desenho e as paredes param na borda; as bandeirinhas entram inteiras ou não
    entram), e a cena nasce dentro do mapa (na lista de cenas), na mesma campanha, com a Saída de volta perto da fonte;
    o marcador do mapa fica ligado a ela.
- **Os interiores** (`Interior`, `10g-interior.js`): dois cliques na Entrada de um prédio da cidade, "Gerar o
  interior…": o tipo do prédio e o estilo já vêm escolhidos (dá para trocar); numa Entrada posta à mão, escolhe-se
  também o tamanho (Pequeno, Médio, Grande). A planta tem o dobro das medidas do prédio, dividida em salas (`PLANTAS`:
  a sala, o quarto e a cozinha da casa; o salão, a cozinha e os quartos da taverna; a forja; o armazém e o
  escritório; a nave e a sacristia do templo; o salão nobre, a biblioteca, os quartos e a cozinha do senhor; o
  refeitório, o dormitório e o arsenal do quartel). Nos tipos com sala grande, a sala da porta fica com a faixa da
  frente, inteira. Cada divisão tem uma porta (todas as salas ficam ligadas), janelas nas paredes de fora (uma por
  sala) e os móveis de cada sala, no estilo, arrumados: a cadeira virada para a mesa, o baú e a vela junto da cama, a
  cama e a estante de costas para a parede, as estátuas dos lados do altar, o altar no fundo, na linha da porta, a
  colunata e os bancos da nave (com o corredor do meio livre), o balcão no fundo da taverna e da loja (de frente para
  quem entra), as colunas do salão nobre; nada na frente das portas. O relevo de dentro: o estrado do altar e a pia
  de água benta do templo, o palquinho do bardo na taverna, o estrado com a mesa alta do senhor, a tina da forja, o
  alçapão do porão no armazém; e a luz que entra pelas janelas em feixes (de dia, quentes; ao entardecer, laranja; de
  noite, o luar; no breu, nada). A cena sai dentro da cena de fora, com a hora dela (à noite, uma luz em cada sala),
  a Saída junto da porta de entrada levando de volta, e o marcador ligado a ela.
- **O Encontro** (`Encontro`, `10f2-encontro.js`, com os desenhos em `Paisagem`, `10f1-paisagem.js`; lote 7, parte 4b):
  a cena de batalha no caminho. Doze **terrenos** (Estrada, Floresta, Deserto, Montanha, Pântano, Neve, Campo, Selva,
  Terra corrompida, Lava, Cristais e Água), cada um com quatro **situações** (`TERRENOS[].sit`: a curva na mata, a
  carroça tombada, a ponte sobre o rio e a encruzilhada; a clareira, o riacho, a árvore gigante caída e o acampamento
  abandonado; as dunas, o oásis, a ossada gigante e o cânion; o desfiladeiro, a ponte de corda, a trilha na encosta e o
  platô; as ilhas na água rasa, a passarela de tábuas, a cabana na palafita e as raízes na névoa; o lago congelado, os
  pinheiros, a cabana do caçador e a fenda no gelo; a plantação, o moinho e o celeiro, o capim alto e o morro de
  pedras; a mata fechada, o rio com a cachoeira, a árvore colossal e as flores gigantes; as árvores mortas, os
  cristais negros, as poças de lodo e a fenda que brilha; o rio de lava, a ponte de pedra, o campo de basalto e a
  boca do vulcão; a gruta, o campo de cristais, o geodo gigante e o lago espelhado; um navio, a abordagem, o barco no
  rio e o naufrágio) ou a **Surpresa**, que sorteia uma (o resumo diz "(sorteada)"). O **caminho** (sem, trilha ou
  estrada; a estrada nunca fica sem, e na água não há: `camValido`) e o **tamanho** (Pequeno 24 × 18, Médio 32 × 24,
  Grande 40 × 30). O plano (`Encontro.gerar`) é uma conta pura: uma grade de ocupação (livre, caminho, água,
  obstáculo, árvore, área da situação, relevo baixo, abismo, convés, pedra de atravessar) guia cada passo — a situação,
  a vegetação do terreno, os enfeites (objetos que dá para mover) e os marcadores —, com sorteios separados
  (`sub(seed, k)`, bem embaralhado). **Travar**: um clique no traçado da prévia (o caminho, a água, os penhascos, a peça
  do meio) trava o traçado (`trava: { terreno, tamanho, caminho, sit, s }`); "Gerar outro" troca só as árvores, as
  pedras e os objetos; trocar o terreno, a situação, o caminho ou o tamanho solta. A cena: o fundo pintado (o chão, a
  água com a margem e a espuma, os penhascos com a face e os blocos, os abismos com a névoa, as dunas, as árvores de
  cada terreno), as **paredes de visão só no que é grande** (as pedras grandes, os troncos grossos, os paredões, os
  cristais grandes e as construções; moitas, árvores e mato não tapam), as construções (a cabana, o celeiro, o
  santuário: abertas, com a porta, as janelas e os móveis, ou fechadas, com uma Entrada na porta para gerar o
  interior), as **zonas de efeito** soltas no mapa (a lama, o gelo, a lava, as brasas, a correnteza, a névoa, os
  esporos, a maldição, o lodo tóxico, os espinhos, a areia movediça), as luzes (a lava, os cristais, a fenda que brilha;
  à noite, a casa) e o **relevo leve** (abaixo). E dois **marcadores ocultos** (`Props`: `chegada`, a bandeira verde, e
  `emboscada`, o xis vermelho; só do mestre, mesmo postos à mão, e dá para apagar): a chegada no começo do caminho, na
  borda (ou onde o grupo já está: no convés, na ponta da passarela da palafita), e a emboscada atrás de uma cobertura, a
  meia distância e longe da borda (a chave "Marcar a chegada e a emboscada" desliga). O nome da cena é o do lugar
  ("Encontro na floresta", "Abordagem").
- **O navio** (`Navio`, `10f3-navio.js`): o convés visto de cima — o casco com a popa reta e a proa em ponta (para um
  lado ou para o outro), o castelo de popa (2 m, com as escadas), o castelo de proa (1 m), os mastros com as velas
  enroladas, a escotilha e as aberturas da amurada no meio; cada estilo tem o seu barco (a nau comum, o junco oriental
  com os olhos na proa, o drácar nórdico com os escudos, os remos e a cabeça de dragão, o dhow desértico, o barco-cisne
  élfico e o couraçado anão). A **amurada** é de mureta (abaixo). Na escotilha, uma
  Entrada (oculta) que sabe o tamanho do convés (`gera: { t: 'navio', w, h, p, f: 'navio' }`); dois cliques nela,
  "Gerar o interior…": o tipo é só "Navio" (`Navio.planta`, no formato das plantas das casas) — do tamanho do
  convés, com o casco em ponta, da popa para a proa: a cabine do capitão (com as janelas da popa), as duas cabines
  pequenas, o porão de carga (com a escada da escotilha, onde fica a Saída), o alojamento e o paiol da proa; uma porta
  em cada divisão, as vigias e a carga e os móveis de cada sala. Na abordagem, dois navios lado a lado, com a prancha
  entre as aberturas e as cordas dos ganchos.
- **A mureta** (um tipo novo de parede, `k: 'mureta'`): uma parede baixa — a amurada do navio, um parapeito — que deixa
  ver e deixa a luz passar, mas barra a passagem (`wallBlocksSight` não, `wallBlocksMove` sim); não abre e não tem o
  ícone das aberturas (nada para clicar, nem para quem joga). No painel e na ferramenta de paredes, "Mureta"; o traço
  é verde-claro, de traço e ponto. Vai para quem joga como é (a visão dele também passa).
- **O relevo leve** (lote 7, parte 4b): uma área de Terreno com a opacidade guardada abaixo de 0,5 (`s.a`) é desenhada
  translúcida, sem a sombra e com o contorno tracejado (`Render.drawTer`) — é a do relevo dos lugares gerados, por cima
  de um fundo que já desenha o morro, a água e o penhasco. As outras ficam como eram.
- **Do Mapa-múndi para a cena** (lote 7, parte 4b): o Mapa-múndi pede pela ponte (`TC.ponte.ir('cenas', { gerar,
  cena })`) e as Cenas abrem a janela "Gerar um lugar" já preenchida (`Gerador.abrir(lugar, { op, estilo, hora, clima,
  nome, id })`); nada muda até o mestre criar, e o que veio do mapa não vira escolha guardada da janela. Com uma
  janela já aberta nas Cenas, só um aviso. O `id` (o do atalho do marcador) vale se ainda não existir cena com ele.
- **A Tribo** (`Tribo`, `10f4-tribo.js`, feita com o motor dos encontros, `Encontro.motor`; lote 7, parte 4b-2): a
  aldeia da tribo. As **moradias** são uma escolha própria (Tendas, Cabanas, Iurtes, Palafitas ou Iglus; não dependem
  do terreno); o **tamanho** (Pequena 36 × 30, até 6 moradias; Média 44 × 36, até 9; Grande 52 × 42, até 13 — das
  maiores, a cabana e a iurte, às vezes cabem menos); o **terreno** (Campo, Floresta, Selva, Deserto, Neve, Pântano); e
  três chaves: a **paliçada** (as estacas em volta, com o portão — uma porta, que abre e fecha —, as torres de vigia de
  4 m dos dois lados do portão e, na média e na grande, mais duas lá atrás, e o fosso com estacas por fora, com a
  ponte de troncos amarrados diante do portão); os **lugares sagrados** (o círculo de pedras com a fogueira dos
  ancestrais, fora da paliçada quando cabe — senão lá atrás, dentro —, o mastro com crânios junto do portão e os totens
  menores); e o **dia a dia** (o cercado, com a cerca baixa — mureta: deixa ver, não deixa passar —, a porteira aberta
  do lado da praça e os bichos pintados no fundo, que não são tokens — cabras, ovelhas, porcos, bois; renas na neve —;
  os secadores de peles e de carne, o forno de barro, o tear e a lenha; o riacho num dos lados curtos, com as canoas na
  beira). Sempre: a praça no meio, com a fogueira (e os troncos de sentar em volta) e o totem; a moradia do chefe,
  maior, do outro lado da praça, de frente para o portão (com o crânio de chifres); as outras em volta (nas grandes, em
  duas fileiras desencontradas), cada uma com a trilha batida da porta até a praça (que contorna a moradia do caminho);
  e as tochas do portão. As **palafitas** ficam sobre um lago, do lado oposto ao do portão: o píer sai da praça até a
  passarela comprida, paralela à beira, e as moradias ficam dos dois lados dela (do lado de cá só quando o lago é fundo
  o bastante), cada uma com o seu deque (1 m acima da água) e a porta para a passarela; a do chefe bem na frente do
  píer; as canoas junto dos deques; a paliçada e o fosso acabam na beira do lago. O plano (`Tribo.gerar`) é uma conta
  pura: o traçado (a água, a praça, a paliçada, as torres, as moradias, a trilha, o círculo de pedras e o cercado) tem
  o sorteio dele — um clique na prévia trava (`trava: { tamanho, moradias, terreno, palicada, sagrados, vida, s }`), e
  "Gerar outro" troca só os detalhes (as árvores, os enfeites, os secadores, o forno, o tear, a lenha, as canoas e os
  bichos); trocar uma escolha solta. A cena: o fundo pintado (cada moradia com o desenho dela, vista de cima — a tenda de
  couro com as costuras, a faixa pintada e as varas; a iurte de feltro com as cordas e a coroa; o iglu de blocos de neve
  com o túnel; a cabana de palha de duas águas; a palafita de palha de quatro águas —, a paliçada de troncos apontados,
  o fosso, as torres, o cercado), as paredes (a paliçada é de visão; as moradias, fechadas; o portão, uma porta; a
  cerca, mureta), o relevo leve (as torres, o fosso, a água, os deques, as passarelas e a ponte) e os objetos (as
  fogueiras e as tochas, com a luz delas; os totens). Cada moradia tem a sua Entrada oculta na porta, que sabe que
  moradia é (`gera.t`) e se é a do chefe (`gera.c`). O nome da cena: "Aldeia das tendas", "Aldeia dos iglus"… Os
  desenhos da tribo ficam registrados no motor (`Encontro.motor.PINTORES`; a moradia com desenho próprio, `k.desenho`,
  é pintada por `PINTORES.moradia`), e o motor monta também as paredes de outro tipo que o lugar pede (`p.paredes`: o
  portão, a cerca); na prévia, as paredes das moradias com desenho não aparecem (o desenho já mostra).
- **As moradias por dentro** (`Tribo.planta`, pelo `Interior`): dois cliques na Entrada, "Gerar o interior…" — o tipo
  é só o da moradia (as moradias não entram na lista dos prédios da cidade); a planta tem o dobro das medidas e uma
  sala só (redonda — o octógono, com o canto cortado de quase um oitavo — na tenda, na iurte e no iglu), com a fogueira
  bem no meio (no iglu, o braseiro), as peles para dormir em volta, os baús e os jarros; na do chefe, mais peles, a pele
  grande diante do assento, o assento no fundo (de frente para a porta), as armas e um totem. O chão de terra com palha
  (a tenda e a iurte), de neve socada (o iglu) ou de esteira (a cabana e a palafita, que têm uma janela); as paredes de
  couro, de feltro, de gelo ou de troncos (`Estilos.paredesPintadas(…, material)`). No iglu, o estrado de neve no fundo
  (a área de meio metro e a forma clara por cima). À noite, a fogueira é que ilumina (nenhuma "Luz da sala"). O aviso
  diz "uma sala".
- **Objetos novos** (parte 4b-2): a pele (onde se dorme nas moradias: parda, branca ou malhada), as armas no suporte
  (as lanças e o escudo redondo) — em Móveis e baús — e o totem, em Perigos e marcos.
- **O Porto** (`Porto`, `10f5-porto.js`, feito com o motor dos encontros; lote 7, parte 4b-2): o lugar à beira-mar,
  em duas maneiras — a **vila de pescadores** e o **porto grande** —, com o **tamanho** (Pequeno, Médio, Grande: na vila,
  40 × 32, 46 × 36 e 52 × 40 quadrados, até 6, 9 e 12 prédios; no porto, 54 × 42, 62 × 48 e 70 × 54, até 9, 13 e 18
  prédios e 1, 2 e 3 navios), o **terreno** (Campo, Floresta, Deserto, Neve) e três chaves: os **navios** (o barco de
  pesca, na vila), o **farol** e o **mercado** (na vila, o mercado do peixe; no porto, o movimento do cais). O mar fica
  num dos lados (sorteado), com o raso mais claro junto da beira e as fileiras de ondas (`Paisagem.lago(…, 'mar')`).
  - **A vila de pescadores**: a beira ondulada, a praia (de seixos, na neve) e a espuma; os píeres de tábuas — o do
    meio na enseada, onde a beira recua: com a beira deitada, ele tem a cabeça em T e o barco de pesca atracado nela,
    do lado do mar; com a beira em pé, é comprido, com o barco atracado ao lado, de proa para o mar; os outros, a nove
    quadrados ou mais dele —; a ponta de pedras num dos lados, com o farol; a trilha da beira e as casas de frente para
    o mar (com um recuo aqui e ali), e, nas maiores, outras fileiras atrás de outras trilhas; a taverna, o armazém do
    peixe, a capela e a loja; as barracas do peixe junto do píer do meio, as redes estendidas e os secadores na areia;
    os barcos pequenos amarrados nos píeres, soltos na água e puxados para a areia.
  - **O porto grande**: o cais de pedra (seis quadrados de lajes, com o capeamento e os cabeços), os molhes de pedra e
    os navios grandes — com a beira deitada, ao longo do cais, um atrás do outro, com um molhe entre eles; em pé, um
    molhe para cada navio, com o navio ao lado, de proa para o mar, e mais um molhe, menor, para os barcos —; o
    quebra-mar de pedras que sai num dos lados e se curva para dentro, com o farol na ponta; a fileira dos armazéns, das
    tavernas e da loja de frente para o cais, e as outras fileiras atrás das ruas, com o templo e o quartel da guarda;
    os lampiões do cais; um guindaste junto de cada lugar de navio, a carga empilhada (caixotes sob a rede, sacos,
    barris), os barris e os caixotes.
  - **Os navios** são lugares (o mesmo navio do Encontro): o convés com a amurada de mureta, a prancha da abertura do
    meio até o cais, o molhe ou o píer (passa-se por ela; ao lado, a amurada barra), o convés por cima da água (uma
    área sem altura, debaixo dos castelos) e a escotilha com a Entrada oculta — dois cliques geram o porão e as
    cabines. Os barcos pequenos são desenho.
  - **O farol**: a torre redonda caiada com a faixa, a galeria e a lanterna acesa, que tapa a visão, tem a luz (até
    14 quadrados) e a galeria a 10 m (no relevo). Sem a chave, a ponta de pedras e o quebra-mar ficam, sem a torre.
  - O plano (`Porto.gerar`) é uma conta pura: o **traçado** (o mar, a beira, as ruas e as travessas — uma delas sai
    pela borda de terra —, os píeres, os molhes, os lugares dos navios, a ponta do farol e os prédios) tem o sorteio
    dele e **não depende das chaves**: ligar ou desligar os navios, o farol ou o mercado só põe ou tira essas coisas, e
    trocar o terreno também não mexe no traçado; os barcos pequenos, o mercado e as árvores têm cada um o seu sorteio
    (os barcos não usam os lugares dos navios, com ou sem navio). Um clique na prévia trava o traçado (`trava: { tipo,
    tamanho, s }`) e "Gerar outro" troca só os barcos, o mercado e as árvores; trocar o lugar ou o tamanho solta. Os
    prédios são fechados, com a Entrada na porta (o tipo: a casa, a taverna, o armazém, a loja, o templo, o quartel). O
    nome da cena: "Vila de pescadores" ou "Porto". No Mapa-múndi, o marcador de porto também tem "Gerar este lugar…".
  - Os desenhos do porto ficam na `Paisagem` (o cais, o molhe, o quebra-mar, o farol, a prancha, o guindaste, a carga,
    as redes, o secador de peixe, a barraca do peixe, o gelo), registrados no motor (`Encontro.motor.PINTORES`), e a
    Cidade com mar usa os mesmos.
- **A Cidade com mar** (a chave "Com mar", desligada de começo; `o.mar`): um lado do mapa vira mar (sorteado à parte,
  da semente do traçado: sem o mar, a cidade sai exatamente como antes). A muralha desce até a beira e fica aberta
  para a água (o lado do octógono que dá para o mar não tem muro, nem o adarve; o fosso vai de uma ponta à outra); não
  há portão para o mar; a praça fica no meio da terra. Por dentro da muralha corre o **cais de pedra**, de quatro
  quadrados (sem muralha, a beira inteira), que vale como rua: os prédios do **bairro do porto** (o novo bairro, na
  faixa junto da água: armazéns, tavernas, lojas e casas) ficam de frente para ele, e a frente do cais enche primeiro.
  A **rua do porto** desce da praça até o cais; as ruas de bairro param antes dele; o anel não passa pelo lado da água.
  Os **molhes** e os **navios atracados** (com a beira deitada, ao longo do cais; em pé, ao lado dos molhes), longe da
  boca do rio; o rio deságua no mar (com a ponte do cais sobre a boca) ou, com o mar de um lado, corre longe dele. Fora
  da muralha, a praia. Os barcos pequenos, um guindaste junto de cada navio e a carga do cais são desenho (outro
  sorteio). Na cena: a amurada de cada navio (mureta), a carga do convés e a Entrada da escotilha; no relevo, o mar
  (2 m), os molhes, o convés e a prancha. No mapa de bairros, o porto tem o seu marcador, e o recorte dele leva a água
  inteira, até a borda (os navios entram sem corte).
- **As masmorras** (`Masmorra`, `10g2-masmorra.js`; lote 7, parte 4b-3): os níveis de baixo, um de cada vez. Dois
  cliques numa Entrada posta à mão oferecem "Gerar uma masmorra embaixo…" (o nível 1); a janela "Gerar o nível" tem o
  **tipo** — a **masmorra de pedra**, a **caverna**, a **cripta** e a **mina abandonada** —, o **tamanho** (Pequeno
  34 × 26, Médio 46 × 34, Grande 58 × 42 quadrados) e as chaves dos **segredos**, da **escada de descida** e do relevo,
  com a prévia (as portas em azul, as secretas em roxo, as grades em verde, as runas em laranja, a subida verde e a
  descida vermelha) e "Gerar outro". O plano (`Masmorra.gerar`) é uma conta pura (a mesma semente, com as mesmas
  escolhas, dá o mesmo nível): a grade (`grade`: 0 rocha, 1 sala, 2 corredor, 3 água, 4 abismo, 5 nicho, 6 ponte), as
  salas com o papel de cada uma, as paredes (com as portas), as paredes de visão, os objetos, as luzes, o relevo, as
  runas, os desenhos e as escadas (`sobe`, `desce`); todo o chão se alcança a partir da escada de subida.
  - **A masmorra de pedra**: as salas (uma em cada folha de uma partição do mapa) ligadas por corredores retos de um
    quadrado (a árvore mais curta e uns laços; os corredores não encostam nas salas, só nas portas, e se juntam aos que
    já existem); as portas de madeira (algumas trancadas; em arco, aberto, de vez em quando; no corredor curtinho, uma
    só), com a soleira e os batentes no desenho, e as paredes de cantaria do lado da rocha. A sala da escada de subida
    fica perto de um lado; a da descida é a mais longe dela. A sala principal é a do **trono** (o estrado de meio metro
    no fundo, o trono de frente para a porta, os braseiros, as colunas em duas fileiras e o tapete da porta ao estrado)
    ou o **salão das colunas**; as **celas** (ao longo de um lado sem porta: as paredes entre elas, a frente de grades —
    mureta — com a portinhola de grade — janela: abre e deixa ver —, a palha ou os ossos, as correntes); a guarda, o
    arsenal, o depósito, a biblioteca, o altar, o poço e a sala vazia (o entulho, os ossos); o **tesouro** numa sala sem
    saída, atrás da porta secreta (com os segredos). As colunas tapam a visão.
  - **A caverna**: as câmaras (manchas espalhadas pelo mapa) ligadas por túneis tortos, com a beira de rocha alisada e
    tremida (a mesma nas paredes e no desenho); o **lago** de baixo da terra (escuro, verde-azulado; 1,5 m), o
    **abismo** (a fenda atravessando uma câmara, com a ponte de pedra — e só quando tudo continua ligado; 10 m), as
    **estalagmites** (as grandes tapam a visão), os **cogumelos que brilham** (com a luz azulada ou verde), as poças e os
    ossos; as escadas de pedra bruta; com os segredos, a **gruta escondida**, no fim de um túnel estreito, atrás da porta
    secreta (o baú, as moedas, os ossos de quem achou primeiro).
  - **A cripta**: salas menores e corredores estreitos, com os **nichos** dos mortos (as covas na rocha, de duas em
    duas casas, com o esqueleto ou a urna); o **jazigo do senhor** (o estrado, o sarcófago grande — 1,3 m —, os
    braseiros e as estátuas), a **capela** (o altar, as velas, os bancos), o **ossário** (os ossos empilhados nas
    paredes), as salas dos **sarcófagos** (em fileiras, com 1 m de altura e o corredor do meio livre), as salas dos
    nichos e as oferendas (atrás da porta secreta).
  - **A mina abandonada**: o **túnel dos trilhos** (dois de largura, da escada de madeira, num lado, até a câmara do
    **poço de descida** — o buraco de 10 m com a armação e o sarilho —, do outro); os túneis do lado (às vezes com uma
    curva, às vezes com um ramo), que terminam nas **galerias** (os veios brilhando na rocha, as ferramentas, a carga)
    ou nos **desabamentos**; as **escoras** de três em três casas, os **vagonetes** nos trilhos, os lampiões acesos na
    entrada e no poço, o acampamento abandonado (a mesa, a fogueira apagada) e as poças; com os segredos, a **galeria
    escondida** (o veio rico e o baú) atrás da porta secreta.
  - **Os segredos** (a chave, ligada de começo): as **portas secretas** (`{ k: 'door', secret: true }`: para quem joga,
    uma parede comum, sem ícone; no desenho, a parede continua) e as **runas-armadilha** (o efeito das runas, escondido —
    `gm: true` —, onde fazem sentido: diante do tesouro, no meio da sala principal, num cruzamento de corredores; na
    caverna, na boca da gruta; na mina, na boca da galeria e na beira do poço). O mestre revela cada um (a porta no
    painel da parede; as runas no painel do efeito).
  - **A cena**: dentro da de cima (na família de cenas), **no breu** (só o fogo das tochas, dos braseiros, das velas e
    dos lampiões e o brilho dos cogumelos iluminam), com a névoa; o fundo pintado; as paredes, as portas e as grades; as
    paredes de visão das colunas e das estalagmites; os objetos; o relevo (os estrados, os sarcófagos, a água, o abismo,
    o poço); as runas escondidas. A **Saída** (oculta) na escada de subida leva de volta; na escada de descida fica a
    **Entrada** (oculta) do nível de baixo (`gera: { t: 'masmorra', m: tipo, n: nível, tam, e, s }`): dois cliques nela,
    "Gerar o nível 2…", abrem a janela já com o nível, o tipo e o tamanho de cima (o tipo pode mudar: a caverna embaixo
    da masmorra, a cripta embaixo do templo). O nome: "Masmorra — nível 1", "Caverna — nível 2"…
  - **A aba Masmorra** (lote 7, parte 4b-3c; `Masmorra.LUGAR`): o mesmo nível direto no "Gerar um lugar…", sem precisar
    de uma Entrada — a aba entre as Ruínas e o Porto, com o tipo, o tamanho, o **nível** (1 a 99; o nome acompanha:
    "Cripta — nível 3"), **"Embaixo de"** (as cenas na ordem das famílias, as de dentro recuadas: `UI.familiasVistas`) e
    as chaves dos segredos e da escada de descida; sem a hora e o clima (`semHora`: lá embaixo é breu) e sem partes para
    travar. Com a cena de cima escolhida, o nível nasce dentro dela, com a Saída de volta; com "Nenhuma", sai como uma
    cena solta, e a Saída fica sem destino até o mestre escolher a cena no painel dela. O estado da aba vai junto para o
    criar (`ex.op`). No Mapa-múndi, o marcador de masmorra abre esta aba (o nível 1), com o nome do marcador e o id que
    ele espera.
- **As Ruínas** (`Ruinas`, `10f6-ruinas.js`, feitas com o motor dos encontros; lote 7, parte 4b-3): a aba entre o
  Encontro e o Porto. O **lugar** — o **templo caído**, a **torre tombada**, o **forte em ruínas**, o **círculo de
  pedras** e a **boca da mina** —, o **tamanho** (Pequeno 36 × 28, Médio 44 × 34, Grande 52 × 40 quadrados), o
  **terreno** (Campo, Floresta, Deserto, Neve) e duas chaves: a **entrada da masmorra** (um marcador de Entrada,
  oculto, que gera o nível 1 lá embaixo pela Masmorra — `gera: { t: 'masmorra', m, n: 1, tam, e, s }`: a cripta
  embaixo do templo, a masmorra de pedra embaixo da torre e do forte, a caverna atrás da boca do paredão, a mina atrás
  da entrada escorada) e o **mato** (a hera nas pedras — no deserto, o mato seco; na neve, o musgo com a geada —; sem a
  chave, as árvores ficam longe das ruínas).
  - **O templo caído**: o estilóbato de lajes rachadas (1 m; umas lajes faltando), a escadaria na frente (meio metro),
    as colunas do peristilo — de pé (tapam a visão), quebradas (o toco, 0,8 m) ou caídas para fora (os tambores em
    fila, com o capitel) —, a cela com as paredes em pedaços (as de pé tapam a visão; as baixas são mureta), o altar
    quebrado no fundo, uma estátua de pé e outra tombada, a escada da cripta no meio da cela, o frontão caído na frente
    (tapa a visão) e o entulho; a trilha da escadaria até a borda.
  - **A torre tombada**: a base redonda de pé (a porta do lado de onde se chega, duas brechas com o entulho), o chão de
    lajes, a escada em caracol quebrada (2 m) e a escada que desce; o corpo da torre deitado no chão, em pedaços (cada
    um com as fiadas de pedra e as pontas quebradas, 2 m, tapa a visão), até as ameias espalhadas no fim.
  - **O forte em ruínas**: a muralha com as brechas (o adarve, 4 m, onde ela está de pé; o monte de entulho nas
    brechas), as torres dos cantos (de pé, com o topo de ameias, 6 m; algumas caídas, o monte de entulho), o portão
    arrombado (as folhas no chão), o pátio de terra com o poço, o alojamento sem teto (as paredes baixas, as armas
    largadas), a torre de menagem com a escada que desce e a fogueira apagada de quem passou por ali, com os barris.
  - **O círculo de pedras**: o paredão de rocha num dos lados (8 m, tapa a visão), com a boca da caverna no entalhe; no
    descampado, o círculo de menires (os de pé tapam a visão; uns caídos) com a pedra do altar no meio (o rego escuro),
    as velas e as flores; as pedras grandes ao pé do paredão; a trilha que passa pelo círculo até a boca.
  - **A boca da mina**: o paredão com a entrada escorada (os esteios e a verga), os trilhos até o monte de escória
    (1,5 m), o vagonete, o barracão (fechado, com a Entrada do interior), o lampião aceso na boca, os barris, os
    caixotes e a lenha.
  - O plano (`Ruinas.gerar`) é uma conta pura: o **traçado** (as ruínas, o paredão, a trilha, a entrada) tem o sorteio
    dele e **não depende das chaves nem do terreno**; um clique na prévia trava o traçado (`trava: { tipo, tamanho, s }`),
    e "Gerar outro" troca só as árvores, as pedras e os enfeites; trocar o lugar ou o tamanho solta. Os desenhos das
    ruínas ficam registrados no motor (`Encontro.motor.PINTORES`), e o motor monta também as Entradas que o lugar pede
    (`p.entradas`).
  - No Mapa-múndi, os marcadores de ruína, templo, torre, castelo (o forte), caverna (o círculo de pedras com a boca) e
    mina (a boca da mina) têm "Gerar este lugar…" (o de masmorra abre a aba Masmorra: 4b-3c); e "Gerar a cena aqui",
    com o grupo no terreno Ruínas, abre a aba Ruínas (e não um encontro).

### Fichas e Cenas (lote 8)

- **O Limite de dano** (`pc.limDano`, na ficha): um número de consulta, na tabela de atributos, depois das defesas
  ("Limite de dano · manual"). Vazio é sem limite. Não entra em conta nenhuma (`TC.rules` não o lê) e só aparece na
  ficha.
- **A Ferida permanente** (a condição `ferida`): a ponta de uma barra apodrece. Só o mestre põe e tira, num token de
  cada vez, pela janela da condição (qual barra, quanto apodrece, com a prévia "HP 30 → 20 de 30; a cura não passa de
  20"). O quanto fica na barra do token (`b.pod`); num token ligado, também na ficha (`estado.podre: { id da barra:
  quanto }`, chave por chave no "JSON Merge Patch"), e vai de um para o outro como a sobrevida. O teto da cura é o
  máximo menos o podre (`barTeto`; nunca abaixo do piso): o valor acima dele desce ao apodrecer, e nada passa dali —
  o valor digitado e o "+" (`barSet`, `barAfter`), a cura total (`barFull`), o dano em área, o pedido de um jogador
  (`fundirBarras`), as poções e o "Atual" da ficha (`TC.rules.estadoRecursos`/`aplicarDelta`, `atualDoRecurso`), o
  descanso e as comidas do Acampamento (`linhaDoDescanso`, `aplicarFx`). O dano continua valendo. A condição e as
  barras podres andam juntas (`acertarCondicoes`): tirar a condição tira o podre de todas as barras; a barra que
  apodrece pela ficha traz a condição; a última que deixa de estar podre a leva. A ponta podre aparece riscada em
  verde-oliva no token, no painel, nas barrinhas da ficha ("20 apodrecidos", com "Tirar a ferida" para quem mestra) e
  no plano do descanso. Para os jogadores, vai em proporção quando só a proporção da barra vai. O auxiliar sem a aba
  Fichas não põe a ferida num token ligado (a ficha não chega a ele).
- **O Clone** (a condição `clone`): pela janela da condição (só o mestre, num token de cada vez), de 1 a 10 cópias
  (3 de começo) num raio de 1 a 10 quadrados (2), em lugares livres, dentro do mapa e sem parede entre o real e o
  lugar (`vagasDoClone`, ao acaso: primeiro os que não encostam no real nem nas outras cópias; se não der, os que
  sobram). As cópias são tokens iguais ao real — nome, imagem, tamanho, barras, condições
  (com a Clone), dono e a ficha, só para mostrar — com `clone: <id do real>`; ficam fora da sincronização com a ficha
  (nos dois sentidos). O real é o token de sempre (a ficha, a vez na ordem). Escolher o real ("Este é o real", no
  painel e no botão direito; ou o clique no mapa, com a faixa de cima, logo depois de criar com "Eu escolho no mapa")
  é trocar de lugar com a cópia (os tokens não deslizam, então os jogadores não notam); "Sortear" escolhe ao acaso
  (pode ser ele mesmo). Só o mestre vê a coroa no real. No fim de cada passo (`regrasDoClone`, no programa do mestre;
  e num passo logo depois, para o que chegou de fora — o dano que veio da ficha): a cópia cujo real sumiu ou ficou
  sem a condição (tirada, ou acabaram as rodadas dela) some, e a cópia sem a condição também; o real que levou dano
  (a barra da vida — HP, Vida ou PV, senão a primeira — desceu, no valor ou na sobrevida) leva todas as cópias; a
  cópia que levou dano some sozinha; senão, o que mudou no real vai para as cópias. Tudo no mesmo passo de desfazer,
  com um aviso. Na projeção, as cópias vão sem `clone`, e os do grupo vão com a mesma marca (`cg`, um resumo que não
  diz qual é o real): na vez do real, o anel aparece em todos, e o clique na linha da ordem mostra o grupo todo.
- O pedido de um jogador não põe nem tira a Ferida permanente e o Clone (nem o contador e as rodadas deles); o dano
  em área e as zonas não os aplicam (`COND_JANELA`, `cleanApply`), e a lista de condições das poções da ficha não os
  oferece (os dois estão em `TC.rules.CONDICOES`, que continua igual à das Cenas).

### O Clã e o Mapa-múndi (lote 8)

- **As três escalas do clã vão de −10 a +10** (o respeito no mundo, as relações e o respeito dos membros:
  `ClaNucleo.NIVEL_MAX`, `NIVEIS`). Os valores que já existiam ficam como estavam (+3 continua +3). Os nomes de −5 a
  +5 são os mesmos, no meio; os níveis novos, de fora, ganharam nomes próprios (renomeáveis, como os outros). O
  documento `cla:nomes` passa a guardar 21 nomes por escala (`v: 2`); os de antes (`v: 1`, 11 nomes) vão para o meio, nos
  mesmos níveis (`normNomes`). Na escala do painel, o número aparece no 0, no ±5, no ±10 e no nível de agora; os outros,
  na dica.
- **A honra dos grupos do Mapa-múndi vai de −10 a +10** (`MAX_HONRA`). O selo continua igual até ±5 e ganha, acima, a
  segunda volta de raios (+6), as asas (+7), as pedras no aro (+8), o halo (+9) e a estrela (+10), com o ouro clareando
  até quase branco; abaixo, mais rachaduras, as correntes (−7), a brasa (−8) e outra lasca (−9), escurecendo até quase
  preto.
- **O recurso novo na construção**: no custo do próximo nível, "+ recurso novo no custo" (ou "+ Recurso novo…" na lista
  de um item) pede o nome de um recurso que o clã ainda não tem. Ao salvar, ele entra na lista do clã com 0, já no
  custo, no mesmo passo de desfazer. Um nome igual ao de um recurso que já existe (sem acento e sem maiúscula) usa esse.
- **A bandeira do clã nas facções do Mapa-múndi**: o clã ligado a uma facção (na aba Clã, "a facção do clã") dá a ela a
  bandeira — o brasão dele, desenhado pelo núcleo do Clã (`ClaNucleo.brasaoSvg`; o Mapa-múndi carrega `meditacao/nucleo.js`
  e `cla/nucleo.js`), ou a imagem dele, quando é do banco. Ela aparece na aba Facções (no lugar da bolinha de cor, e no
  editor, com de onde vem), no meio das regiões da facção, junto dos grupos dela (o grupo ganhou a facção, `g.fac`) e
  nas zonas e frentes de guerra, dos dois lados. A página do mapa lê os clãs (`cla:c:`, de quem mestra o Clã; senão
  `cla:pub:`, o que a mesa vê) e acompanha quando um muda (`brasoesDosClas`, `App.brasaoDe`). A projeção leva a bandeira
  em cada facção (`f.br`, conferida por `normBr`): os jogadores a veem mesmo com o clã escondido deles, e a facção
  escondida não a leva. O mapa não guarda a bandeira: ela vem do clã a cada vez (quem mestra publica a projeção de novo
  quando o clã muda; o auxiliar sem a aba Clã mantém a que a projeção já tinha).

### As camadas do Mapa-múndi (lote 8)

- **O botão Camadas**, na caixa do zoom (canto de baixo, à direita; a tecla C abre e fecha), abre a janelinha das
  camadas (`mundo/camadas.js`, `window.MundoCamadas`): Cidades e grupos (os marcadores e os grupos), Estradas e rios,
  Rotas, Eventos (a área e o selo), Zonas de perigo, Regiões (a área e o nome; desde o lote 10, só as províncias),
  Sub-regiões (lote 10: as regiões de dentro de outra), Guerra (as zonas de guerra e as frentes), Textos e carimbos,
  Terreno (a tinta à mão e a dos hexágonos) e Grade (as linhas). Cada linha diz quanto há da camada no mapa aberto e tem
  o olho (mostrar ou esconder) e o cadeado (travar).
- **Só neste aparelho** (`localStorage` `tinycats:mundo:camadas`, para todos os mapas; vale para quem mestra e para
  quem joga, e acompanha outra aba do mesmo navegador). Esconder só limpa a própria tela: o mapa e o que os outros veem
  não mudam — "Esconder dos jogadores" continua sendo o jeito de esconder deles. O botão ganha um ponto quando há
  camada escondida ou travada, e a dica dele diz quantas.
- **Escondida**: o que é dela nem se desenha (`desenharObjetos` pula; a tinta e as linhas da grade somem), sai da
  seleção e não se escolhe (`App.selecionar`/`podarSel` só aceitam o que está livre). **Travada**: aparece, mas o
  clique passa por ela (`.obj.trava`, sem ponteiro em nada do que está dentro): clicar na cidade travada pega a região
  embaixo. A Grade não trava (não se clica nela); com a ferramenta Terreno em uso, as linhas aparecem mesmo com a
  camada escondida, como com "Mostrar a grade" desligado.
- **Os atalhos**: Viagem (sem Regiões, Sub-regiões e Guerra), Política (sem Rotas, Eventos, Zonas de perigo e Grade),
  Guerra (sem Rotas, Eventos, Zonas de perigo, Sub-regiões e Textos e carimbos) e Tudo. Mudam só o que aparece (as travas ficam como estão); o
  aviso diz o que ficou escondido e traz o Desfazer (um aviso de atalho por vez). O atalho que bate com o que está à
  vista fica marcado.
- **Nada muda sozinho**: escolher uma ferramenta que cria numa camada escondida ou travada — ou clicar com ela, ou usar
  o menu do mapa — só avisa ("A camada Eventos está escondida neste aparelho"), com o botão que resolve ("Mostrar a
  camada" ou "Destravar"); arrastar com ela continua andando pelo mapa. Na lista "O que há no mapa", o que está numa
  camada escondida ou travada tem a etiqueta, e o clique (ou a busca rápida) avisa e, no botão, mostra a camada e vai
  até ele.

### O traçado dos geradores (lote 8)

- **A seção "Traçado"** na janela "Gerar um lugar…" (`Tracado.secao`, `src/cenas/src/js/10c3-tracado.js`), na Cidade,
  no Vilarejo, na Tribo e no Encontro: abre e fecha (o aparelho lembra), e o resumo dela diz o que saiu do automático
  ("portões: norte e leste · rio de oeste, até um lago · 2 pontes"). "Voltar ao automático" desfaz tudo. As escolhas
  vão no modelo guardado (só as que mudaram, `Tracado.soMudadas`) e no estado de cada aba (`cidTracado`,
  `vilaTracado`, `triTracado`, `encTracado`).
- **O que sai igual**: com tudo no automático, os quatro geradores dão exatamente o que davam (os modelos, os bairros
  e as cenas filhas regeradas continuam iguais). Os sorteios novos têm sementes próprias (`sub(seed, k)` com k novos),
  e os de sempre seguem na mesma ordem. `gerador8-ouro.json` guarda as impressões de 159 lugares tiradas antes.
- **Os portões numa rosa dos ventos** (oito direções e "Auto"; "Sortear" liga de duas a quatro): na Cidade e no
  Vilarejo, uma rua principal sai de cada portão até a praça; com muralha, o portão é o ponto do contorno naquela
  direção (`Tracado.noContorno`). Na Tribo, uma trilha de cada portão, e a moradia do chefe fica de frente para o
  primeiro; nas palafitas, o principal fica num dos quatro lados e nenhum vai para o lago. No Encontro são os
  **caminhos**: de cada direção ligada, um caminho até o caminho da situação (ou até o meio do encontro, sem caminho);
  a direção de onde o caminho da situação já chega não ganha outro.
- **A forma da muralha**: Cidade (octógono, redonda, irregular, sem — com o mar, cortada na beira e aberta para a
  água), Vilarejo (retângulo, octógono, redonda, irregular, sem) e Tribo (redonda, octógono, irregular, sem). A
  paliçada do vilarejo pelo contorno (`Tracado.pecasDoAnel`) tem um vão onde cada rua cruza o contorno e fica aberta
  onde ele passa pela água; os quadrados dela ficam marcados, e nada nasce em cima.
- **O rio**: de onde vem e para onde vai (`Tracado.rioPlano`; para onde vai também pode ser um lago dentro do mapa), a
  largura (riacho 0,9 · rio 1,7 · rio largo 2,6, a meia largura em quadrados), as curvas (0 a 10; 4 é como sempre), o
  afluente (dois rios que se juntam) e o lago no caminho (no máximo um quinto do mapa, mais largo que o rio). O rio da
  rosa vem antes e o lugar se arruma em volta: na Cidade, das tentativas, a que passa mais longe da praça (se ela ainda
  fica a menos de três quadrados da água, anda para o lugar seco mais perto, e as ruas vão até lá; perto de um portão, o
  primeiro portão com um lugar seco logo para dentro); no Vilarejo, uma das tentativas que deixam mais chão seco no
  meio, e a praça num lugar seco; na Tribo, uma das que deixam o anel das moradias com mais chão seco, e a aldeia vai
  para lá (do lado da praça: a paliçada termina na beira, e nada fica do outro lado da água). No Encontro, o rio da
  situação muda (a travessia dela vai junto, onde o caminho cruza o rio novo); se a situação não tem rio, escolher de
  onde ele vem põe um rio novo antes de tudo (um ensaio com o mesmo sorteio diz se ela tem, e por onde passam os
  caminhos dela: o lago fica longe deles). Na Cidade com mar, o rio deságua no mar. Na Tribo, o riacho vem com "O dia a
  dia" (fora das palafitas).
- **A praça**: no centro, perto do rio (na beira, do lado de dentro da muralha) ou perto de um portão (a uns cinco a
  sete quadrados dele, para dentro); a Tribo tem só o centro e perto do rio.
- **As pontes**: automático (uma em cada rua que cruza a água), nenhuma ou de 1 a 6, na ordem de perto da praça (na
  Cidade, as principais primeiro); onde não há ponte, a rua (ou a trilha) para na beira, dos dois lados. O lago não tem
  ponte, nem o rio onde ele passa por dentro do lago. No Encontro, as pontes são onde um caminho cruza a água nova (ou
  um caminho da rosa cruza qualquer água); a travessia que a situação já pôs (a ponte, as pedras, o tronco) vale.
- **O relevo natural** (`Tracado.manchas`, ruído suave em três oitavas): as colinas (terreno Morro, com a altura) e as
  matas (terreno Mata, onde há mato) em manchas, e as pedras em grupos, longe da praça, das ruas, da água e do que foi
  construído; as árvores de fora se juntam nos bosques. No vilarejo, ele toma o lugar do morro de um canto.
- **As travas**: no Vilarejo, as ruas novas e o rio da rosa travam pela semente (`{ v: 8, s }` e `{ v: 8, s, k }` —
  a tentativa que serviu); a trava das ruas de sempre não vale nas ruas novas (escolher os portões traça de novo). Na
  Cidade, na Tribo e no Encontro, a trava do traçado continua sendo a semente dele, e as escolhas valem por cima.

### O motor de biomas e a Região livre (lote 13)

- **O motor de biomas** (`Biomas`, `src/cenas/src/js/10c4-biomas.js`; conta pura, sorteada pela semente). A tabela dos
  treze biomas (`LISTA`: os doze dos encontros sem a Água — ela vem como rio, lago e mar — e mais a Savana, a Costa e a
  Tundra): a paleta do chão, as árvores de cada estilo e quantas, os enfeites e as pedrinhas, se é de pedra, a água
  parada (o gelo, a lava, o espelho), as poças, onde ele fica quando é vizinho (os de altura no alto, os de água no
  baixo, a costa num lado, junto do mar), que parte do mapa é patamar e os três vizinhos que combinam com ele.
  `campo(W, H, seed, o)`: a altura (`Tracado.ruido`, inclinada pelo rio escolhido e pelo mar); o mapa dos biomas (o
  principal e um vizinho na Mistura pouca, um ou dois na média, dois na muita — uns 16%, 32% ou 48% da cena —, em
  manchas: duas voltas da maioria em volta, sem os pedacinhos de menos de seis casas); o mar na costa (uns 28% do mapa
  num lado; na costa vizinha, metade da faixa dela); o rio (o caminho mais barato do alto para o baixo — subir custa, e
  correr junto da borda também —, da casa mais alta da borda até outro lado, com a reta passando perto do meio, ou até
  o lago, ou até o mar; as curvas fazem ele serpentear como o rio de sempre; o afluente chega no trecho do meio dele);
  o lago (enche como a água sobe, e um pouco mais perto do meio: não escorre comprido pelo vale); os patamares (as
  casas acima da altura de cada bioma, longe da água e da borda: o planalto e o paredão nos de pedra, o morro e o topo
  dele nos outros).
- **A Região livre** (`Regiao`, `10f7-regiao.js`, com o motor dos encontros): a aba entre o Encontro e as Ruínas, uma
  área para explorar, sem situação. O bioma, a Mistura, o tamanho (32 × 24, 40 × 30 ou 48 × 36), a água (a Surpresa —
  o rio, o rio que acaba no lago, só o lago ou nada; escolher o rio na rosa garante o rio —, Rio, Lago, Sem água), o
  caminho (sem, trilha, estrada; sem caminho, a rosa ainda põe trilhas), os marcadores e o Traçado (os caminhos da rosa
  — o primeiro atravessa a região, os outros vão até ele —, o rio e as pontes; sem a chave do relevo natural,
  `cfg.relevo: false`). O caminho cruza o rio pela ponte (sem ponte, para na beira) e não vem do mar.
- **O desenho**: o chão dos vizinhos em manchas de beira macia (`Paisagem.chaoMisto`: o chão inteiro do vizinho,
  recortado pela máscara borrada — feita pela sombra, que funciona em todo navegador); o morro macio
  (`Paisagem.morroMacio`: a sombra só fora dele, o alto mais claro, as curvas de nível; o chão continua aparecendo); o
  lago e o mar em duas demãos (a de sempre antes dos rios; outra sem a beira, `Paisagem.lago(…, semBeira)`, por cima da
  ponta do rio — a foz fica limpa); a água e as árvores com a paleta do bioma delas (`a.pal`; nas árvores, `a.neve`);
  na passagem de um bioma para o outro, as espécies se misturam.
- **Os pontos de interesse** (um no Pequeno, dois no Médio, três no Grande; longe uns dos outros e da chegada): a
  clareira com o poço velho, a árvore antiga (nos cristais, o cristal antigo) ou o círculo de pedras; a entrada de gruta
  (na beira de um paredão, do lado aberto, ou num penhasco novo; `Paisagem.bocaGruta`); o ninho ou a toca
  (`Paisagem.ninho`, `Paisagem.toca`); o vau ou a ponte velha (no primeiro cruzamento do caminho com o rio, ou no rio,
  longe das pontes). Cada um tem o marcador oculto `interesse` (o nome é o que há ali; ele também fica na paleta de
  objetos, em Perigos e marcos); a chegada fica na ponta do caminho que entra no mapa.
- **O que cada bioma tem de seu**: as poças (a água rasa com a lama no pântano, o lodo com a zona tóxica, a lava), os
  cristais grandes, a neve funda, as fendas de lava; o lago congelado na neve e na tundra (dá para andar nele, com a zona
  escorregadia); o rio de lava, com a zona e a luz; a mata (o relevo) onde o bosque fecha. A trava do traçado vale no
  mesmo bioma, tamanho, mistura, água e caminho; a seca do Mapa-múndi seca o chão verde (o dos vizinhos também).
- **O que sai igual**: os outros geradores pintam como antes (conferido pixel a pixel no Encontro, no Porto, na Tribo,
  nas Ruínas e no Vilarejo) e os planos deles são os mesmos (`gerador8.js`, `SO=ouro`).

### O Encontro no chão novo, a Savana, a Costa e a Tundra (lote 13, parte 13b)

- **O chão novo** (`chao: 2` nas escolhas da janela e dos modelos novos; os modelos de antes não têm o campo e geram o
  mesmo lugar de sempre — `abrirModelo` passa `{ modelo: true }`, e a janela mostra o aviso com o botão "Usar o chão
  novo", com Desfazer). O bioma de cada terreno (`BIOMA`: a estrada é o campo; o pântano e a água cobrem o mapa todo e
  ficam como eram; a gruta dos cristais, que também cobre tudo, fica no chão de antes). Antes da situação (`chaoAntes`): os vizinhos da tabela, pela Mistura (a costa não é vizinha no
  Encontro: sem o mar, ela seria só o campo com palmeiras), a altura (inclinada pelo rio da rosa e pelo mar) e, na
  Costa, o mar num lado (não o de onde o rio vem; no naufrágio, em cima ou embaixo; a enseada entra mais no meio:
  `Biomas.marDe(…, forma)`). Depois dela (`chaoDepois`): o mapa dos vizinhos longe do meio dela
  (`Biomas.mapaDosBiomas(…, longe)`), as manchas (`Biomas.manchasDe`) e os patamares só nas casas que ela não usa
  (`livresDaSituacao`: nada marcado a dois quadrados, fora das manchas, dos desenhos, do relevo e das zonas dela e do
  meio dela; `Biomas.patamares(…, ok)`). A vegetação, os enfeites e as pedrinhas de cada bioma onde ele está (no do
  terreno, a espécie e a densidade da situação, como sempre; as árvores se juntam nos bosques; a mata no relevo onde o
  bosque fecha; as árvores dos vizinhos com a paleta e a neve deles). No chão novo não há o relevo natural (a chave sai
  da seção Traçado). A Mistura fica na janela (lembrada como `encMis`); a trava do traçado guarda o chão e a mistura.
- **O rio da rosa pelo relevo** (`rioDoRelevo`, com `Biomas.aguaDe`): o rio que a rosa pede (o novo, quando a
  situação não tem rio; ou no lugar do dela) desce pelo relevo e desvia do que a situação põe de grande (as
  construções, as pedras, o convés: `o.bloq` no `Biomas.rioDe`); o lago não cresce por cima do caminho nem da área
  dela (se não couber, só fora do que é duro); oito tentativas, notadas como no `Tracado.rioPlano` (o ensaio da
  situação diz por onde passam os caminhos e o que ela ocupa). O lago vem em duas demãos. Na costa, o rio deságua no
  mar; na falésia, cai em cachoeira.
- **Os terrenos novos** (só no chão novo), cada um com quatro situações: a **Savana** — o bebedouro (a água barrenta, o
  barro pisado com a lama, as trilhas de pegadas dos bichos chegando de todos os lados, os ossos de uma caça), os
  cupinzeiros (altos, de barro duro: não dá para passar; os grandes tapam a visão; o capim alto e os espinhos entre
  eles), o baobá gigante (o tronco enorme, que tapa a visão, a copa de galhos grossos, o oco com as oferendas, os
  baobás menores) e o rochedo dos leões (o lajedo de granito, de 3 m, com os matacões, a toca na beira com os ossos na
  frente, o capim alto em volta); a **Costa** (o mar num lado, com a praia e a espuma; em duas demãos) — a enseada (a
  baía redonda, a areia larga no fundo, os braços de pedra entrando no mar, o barco puxado na areia, a fogueira, a
  correnteza na boca), a falésia (a face de pedra entre a praia lá embaixo e o alto, a escada cavada nela, a gruta no
  pé, as agulhas de pedra no mar, os ninhos na beira), o naufrágio na areia (o navio encalhado, deitado ao longo da
  praia, com a amurada quebrada, o mastro caído e a areia entrando — o porão ainda se gera —, os destroços e a carga
  na areia, as pegadas de quem saiu dele) e as piscinas de maré (o costão de pedra com as poças, cada uma com as
  algas, as anêmonas e as estrelas-do-mar; os canais por onde a maré entra, com a correnteza); a **Tundra** — as fontes
  quentes (a água turquesa com a beira de minério, o vapor: a névoa; o chão morno sem neve), a ossada de mamute (o
  crânio com as presas, as costelas largas, os ossos espalhados, a neve funda, o chão congelado; o caminho passa ao lado
  dela, nunca por cima), o acampamento de
  caçadores (a fogueira acesa, com a luz dela, as tendas de couro, o varal das peles, a lenha, as armas e, em volta, as
  armadilhas de urso ocultas — `oculto` no objeto do plano: só o mestre vê) e o campo de pedras (os matacões em grupos,
  as poças congeladas, os liquens).
- **O desenho** (`Paisagem`): as pegadas (de casco, de pata, de gente), o cupinzeiro, o baobá, os ossos de um bicho, a
  ossada de mamute, a falésia vista de cima, a escada cavada na pedra (`escadaPedra`), a vida da poça de maré, a fonte
  quente (`lago(…, 'termal')`); no navio encalhado, a areia entrando (`danificado.chao`). Os desenhos da Região livre
  (a água parada em duas demãos, o morro macio, a boca da gruta, o ninho, a toca) passaram para o motor dos encontros.
- **O Mapa-múndi**: "Gerar a cena aqui" na savana e na tundra abre os terrenos delas (antes: o capim alto do campo e a
  neve); a janela vem no chão novo.
- **O que sai igual**: os modelos de antes (os planos conferidos contra a versão de antes, `lote13b.js`, `SO=chao`), os
  outros geradores, a Região livre e o desenho deles (51 casos conferidos pixel a pixel).

### As estações, a história do lugar e os achados raros (lote 13, parte 13c)

- **A Estação** (`Estacoes`, 10f8-estacoes.js): uma escolha da janela "Gerar um lugar…" — Primavera, Verão, Outono,
  Inverno — nos lugares de fora (a Região livre, o Encontro, a Tribo, as Ruínas e o Porto: `LUGAR.aceitaEstacao`),
  lembrada (`genEstacao`) e guardada no modelo (o modelo de antes abre no verão). Vinda do Mapa-múndi, a do mês de hoje
  no calendário (`estacaoDoMes`; com o Inverno rigoroso em cima, o inverno). O verão é o lugar de sempre: o plano e o
  desenho não mudam (os planos e os desenhos de todos os geradores de fora conferidos contra a 13b). Só os chãos que têm
  estação mudam (`DO_CHAO`: o campo, a floresta, o pântano e a montanha nas quatro; a tundra e a terra corrompida, no
  inverno); o deserto, a savana, a selva, a neve, a lava, os cristais e o mar ficam iguais (o resumo avisa), e num chão
  misto cada mancha segue o bioma dela (a máscara de beira macia). O desenho tem o sorteio dele (`pintor(p, c)`): o
  mesmo lugar, com as cores e os enfeites da estação — na primavera, o verde novo, as flores no chão e parte das árvores
  floridas; no outono, as copas amarelas, laranja e vermelhas (os pinheiros ficam verdes) e as folhas caídas; no
  inverno, a neve fina no chão, nas copas, nas pedras, nos penhascos e nos telhados (só enfeita) e as árvores de folha
  quase sem folhas.
- **O inverno congela** (`noPlano`, antes dos marcadores): a água parada e rasa dos chãos com estação vira gelo — o lago
  (e a segunda demão dele), as poças do pântano e a água rasa do pântano inteiro —: as casas viram chão de andar, a
  fundura sai, a lama da beira some e a zona Gelado cobre o gelo (um círculo no meio e uns menores pelas pontas; no
  pântano, uma só, no mapa todo). O rio, o mar, a fonte quente, o lodo e a lava não congelam.
- **A história do lugar** (`Historia`, 10f9-historia.js), na Região livre e no Encontro: as caixas "História do lugar"
  (várias juntas; lembradas e no modelo — o de antes fica sem): a Batalha antiga (as armas enferrujadas, os ossos, o
  túmulo, o estandarte rasgado), o Acampamento abandonado (a fogueira fria, a tenda rasgada, os caixotes, o barril, o
  tronco), o Incêndio (o chão queimado, as árvores carbonizadas sem as brasas — a espécie `queimada` —, os tocos) e as
  Ruínas pequenas (o alicerce com os pedaços de parede, de pé ou baixos, as lajes, o entulho, a coluna caída). Cada uma
  longe do meio da situação, do caminho e das outras, só em casas que a situação não usa (o que havia antes da
  vegetação: `Historia.antes`); sem lugar do tamanho de sempre, encolhe; sem nenhum, fica de fora (o resumo diz). Entra
  depois da vegetação, com o sorteio dela: as árvores, as pedrinhas e os enfeites da área saem, e o resto do lugar fica
  igual. Na água e na gruta dos cristais, não há onde (a janela nem mostra no Pântano e na Água).
- **Os achados raros**: a chave "Achados raros" (ligada de começo; o modelo de antes fica sem): a semente da cena decide,
  uma em cada quatro — um baú, um altar, uma árvore antiga, uma pedra rúnica ou um esqueleto com uma bolsa —, num canto
  longe do meio, com o lugar limpo só em volta dele.
- **Os marcadores**: cada marca da história ganha o marcador oculto de ponto de interesse com o nome dela; o achado, o
  marcador novo `achado` (a moeda de ouro: `Achado: …`) — os dois só com a chave dos marcadores ligada.

### A cena que nasce do hexágono do Mapa-múndi (lote 14, parte 14a)

- **O tijolo do hexágono** (`hexParaCena`, `tijoloHex` em `mundo/nucleo.js`): a cena gerada num hexágono é o retângulo
  do mundo que fica com ele — com a ponta para cima, da largura de um hexágono e da altura de uma fileira; deitado, o
  contrário. Os tijolos cobrem o mundo sem sobrar nem sobrepor, então o lado de uma cena é o lado da cena do vizinho (ou
  a metade dele): com a ponta para cima, os vizinhos de noroeste e de nordeste ficam com a metade esquerda e a direita do
  lado de cima, o de leste com o lado direito inteiro, os de sudeste e sudoeste com as metades de baixo, o de oeste com
  o esquerdo; deitado, o de norte em cima, os de nordeste e sudeste nas metades do lado direito, o de sul embaixo, os de
  sudoeste e noroeste nas do esquerdo. O pedido leva o terreno do hexágono e dos seis vizinhos (pelo desenho: o bioma
  das Cenas, a água ou nada; o desenho liso, campo), o número do mapa (para as sementes) e as linhas recortadas no
  tijolo, em (u, v) de 0 a 1, na ordem do mapa: os rios (da nascente para a foz; o mais comprido primeiro, até três) e
  os caminhos (as linhas de estrada e de trilha e as rotas de estrada e de trilha — a selvagem, a de rio e a de mar não
  são caminho; a rota em cima da estrada conta uma vez, e a estrada vale mais; até seis), cada pedaço com as pontas na
  borda (a linha continua no vizinho) ou dentro (ela acaba ali). O pedaço que corre em cima da borda fica de fora.
- **"Gerar a cena aqui"** (no grupo) manda o hexágono do grupo junto, e a Região livre já preenchida com ele (o bioma, a
  água — o rio, se o mapa tem; senão, nenhuma — e o caminho do mapa); no mar, o hexágono vai sem a Região. A janela abre
  no Encontro, com a caixa do hexágono no alto: a chave "Com o hexágono do Mapa-múndi" (ligada) e a frase do que vem
  dele ("Floresta (hexágono 12, −3): campo a leste, água a nordeste; o rio entra pelo oeste e sai pelo nordeste; a
  estrada vai do sul ao leste."). A chave vale para o Encontro e a Região livre; desligada, o lugar de sempre. Preencher
  a outra aba não mexe no que a janela lembra. Na aba que não aceita, a caixa diz por quê (o pântano e a água cobrem a
  cena; o hexágono de água; o sem terreno: "pinte o terreno dele"). O modelo guarda as escolhas, não o hexágono.
- **Os vizinhos nas bordas** (`HexCena`, 10c5-hexcena.js): em cada lado com vizinho de outro bioma, a fronteira é uma
  linha ondulada — uma onda larga e o ruído, sorteados pelo par de hexágonos (a mesma semente dos dois lados) e medidos
  pelo mundo ao longo do lado, com o sinal trocado de lá: a cena de cá e a de lá desenham a mesma linha, cada uma do seu
  lado, e o vizinho entra num lugar e a cena entra na dele no outro. A linha some nas pontas do lado (nas quinas e no
  meio do lado de cima e de baixo, onde três se encontram). A água do vizinho entra mais e segue pela borda toda que é
  dela (na quina com outra água, não some), com a praia e a espuma, e passa da borda. A Mistura diz quanto os vizinhos
  entram (pouca, média, muita); os de mesmo bioma não entram. Os pedacinhos soltos viram o que está em volta (os que
  encostam na borda ficam: a outra metade deles está na cena do vizinho). Os patamares ficam a três quadrados da borda.
- **O rio e os caminhos pelos lados certos**: o rio do mapa desce do ponto por onde entra ao por onde sai, pelo relevo
  (o chão é alto de onde ele vem e baixo para onde vai, e baixo perto da água), entrando e saindo pelos pontos exatos da
  borda (`Biomas.prenderPontas`): o mesmo ponto do mundo é o mesmo ponto relativo do lado, de cá e de lá, em qualquer
  tamanho de cena. O que nasce ali dentro começa no meio; o que acaba ali, num lago; o que acaba na água do vizinho, na
  água; o que vem da água nasce na terra mais perto; um segundo rio vira o afluente, do ponto dele. Os caminhos do mapa
  vão de ponta a ponta pelo mais barato (as pontas a menos de dois quadrados, no mesmo lado, viram uma; o caminho que já
  existe sai mais barato, e eles se juntam), com as pontes onde cruzam o rio.
  - Na **Região livre**: a Água e o Caminho dizem o que vem do mapa (sem rio ou sem caminho no mapa, a escolha continua,
    e o que se escolher ali é do mestre); a rosa do Traçado (de onde vem e para onde vai o rio, os caminhos) dá lugar à
    nota, e a largura, as curvas, o afluente, o lago e as pontes continuam.
  - No **Encontro**: o chão novo vem junto (mesmo num modelo de antes), com a situação no meio; a água dos vizinhos fica
    fora do que a situação põe (o ensaio dela); o rio do mapa fica no lugar do da situação (ou vem antes dela); os
    caminhos da situação vão até as pontas do mapa (cada ponta uma vez; o caminho que ia para a borda troca a ponta pela
    do mapa) e as pontas que sobram vão até o caminho que já existe (ou ao meio). A rosa só conta quando o mapa não tem
    caminho ali. No pântano e na água, o Encontro de sempre.
- **O que sai igual**: sem o hexágono (ou com um que não presta, de água ou sem terreno), os planos e os desenhos de
  todos os geradores de fora (conferidos contra a versão de antes: 312 planos e 50 desenhos).

### As marcas da guerra na cena do hexágono (lote 14, parte 14b)

- **O que vem do Mapa-múndi** (`guerraDoHex`, em `mundo/nucleo.js`, no pedido do hexágono só quando há guerra ali): a
  batalha mais nova que foi nele (o nome, os dias desde ela, o tamanho da vitória, quem venceu, os dois lados com as
  cores e as tropas que os exércitos dos dois lados ainda têm), a marca (destruído ou corrompido), os exércitos que estão
  nele (juntos pela facção, os maiores primeiro, até dois — o resto conta; as tropas, as cores, as máquinas de cerco e se
  todos estão escondidos no mapa) e o cerco do lugar que fica nele (o nome, quem cerca, os dias de cerco, onde o lugar
  fica no tijolo e as máquinas dos exércitos que cercam, até um hexágono dele, com as aliadas). Com o cerco ali, os
  exércitos do dono do lugar (quem o ocupa, se ocupado, ou o dono da região) e das aliadas dele estão dentro: não acampam
  fora. As cores são as da bandeira (a do clã, senão a própria da facção), senão a cor da facção e um tom dela (a cor
  escura ganha um tom claro); sem facção, a cor do grupo; sem nada, as neutras. As máquinas vão pelo desenho: as de
  começo são elas mesmas; as do mestre, pelo que fazem (a que não atira é um aríete, a que bate forte na estrutura é um
  trabuco, o resto uma catapulta; o tipo que não existe mais no mapa não conta).
- **A janela**: na caixa do hexágono, embaixo da frase, os botões das **Marcas da guerra** (várias juntas, nas duas abas
  que aceitam o hexágono): a batalha ("Batalha do Vau (há 2 dias)"; com mais de 7 dias, "…: vira a Batalha antiga"), o
  hexágono destruído ou corrompido, cada acampamento ("Acampamento: Hoste de Ferro (1.500 tropas)") e o cerco. Todos
  ligados de começo, menos o exército escondido no mapa ("· escondido no mapa": começa desligado). As notas dizem quando
  há mais exércitos do que cabem e quando um exército está dentro do lugar cercado. A chave do hexágono desligada tira
  as marcas também. A batalha antiga entra na História do lugar da cena sem mudar a História da janela (nem o que ela
  lembra). As marcas desligadas dão o lugar de sempre (o mesmo plano de sem guerra).
- **A batalha fresca** (até 7 dias; `MarcasGuerra`, 10fa-guerra.js): o chão pisado; os caídos discretos — as silhuetas
  deitadas e as manchas escuras embaixo, sem sangue à mostra, com um pano na cor do lado (mais de quem perdeu, pelas
  perdas da guerra) —; as armas e os escudos nas cores dos lados; as flechas fincadas; os cavalos (nas batalhas
  grandes); os buracos das pedras (pelo tamanho da vitória); o estandarte de quem venceu fincado e o de quem perdeu
  caído (no empate, os dois caídos). No dia e no seguinte, as brasas ainda acesas (a zona Brasas, a luz e o chão
  chamuscado); do dia seguinte ao quinto, os corvos; do terceiro dia em diante, as covas (a terra fresca com a espada
  fincada) — e menos caídos e menos armas a cada fase (os mortos enterrados, as armas recolhidas). O tamanho do campo e
  quantos caídos, pelas perdas e pelas tropas. Com mais de 7 dias, ela vira a **Batalha antiga** da história do lugar,
  com o nome e os dias dela no marcador e o estandarte rasgado na cor de quem perdeu.
- **O hexágono destruído**: a cinza por cima do chão (das plantações também; o caminho continua à mostra), com os riscos
  de carvão; as árvores carbonizadas; os arbustos, as flores e os cogumelos queimados; os tocos; a casa queimada (o
  alicerce, as vigas, o entulho e a chaminé de pé, que é obstáculo); e a fuligem nos telhados das construções da
  situação que ficam na cinza. **O corrompido**: a terra roxa, os veios que brilham, as árvores mortas e roxas e os
  cristais negros com a luz roxa. As manchas ficam longe da borda, quase sem água; onde nada cabe (a encosta, o
  desfiladeiro), uma menor.
- **O acampamento** (de cada exército, até dois): a tenda do comando (redonda, nos gomos das duas cores, com a franja e a
  flâmula) no meio, o estandarte fincado e a fogueira na frente; as tendas em roda (a primeira roda leva oito; a segunda,
  mais quinze), com a lona puxando para a cor da facção, a faixa e a flâmula, a porta para dentro e a entrada aberta; as
  outras fogueiras, os barris, os caixotes, as armas, a lenha; as estacas na frente do acampamento grande; e as máquinas
  de cerco do exército paradas atrás. Mais tropas, mais tendas e fogueiras: 3 tendas com 50 tropas, 8 com 450, 11 com
  1.500, até 16 (o teto). As tendas e a tenda do comando têm as paredes de visão (dá para se esgueirar entre elas); as
  fogueiras são objetos com a luz. Só nas casas livres (nunca no caminho, na água ou no que a situação usa); quando o
  acampamento inteiro não cabe, ele fica menor — e o resumo diz ("8 das 11 tendas; no tamanho Grande cabe mais"). Dois
  de facções diferentes ficam um virado para o outro.
- **O cerco**: no lado da cena que fica para o lugar (pelo eixo mais forte, medido no hexágono), a trincheira de ponta a
  ponta, paralela a ele, com a terra tirada do lado de cá e as estacas do lado de lá; as máquinas (até duas de cada, e
  um aríete na frente) atrás dela, viradas para o lugar, com as pedras de atirar; o estandarte de quem cerca; entre a
  trincheira e a borda, as flechas e os buracos dos tiros de lá. O acampamento de quem cerca fica atrás das máquinas,
  aberto para o lugar; sem o exército na cena (ou sem lugar para ele), o posto (duas tendas e a fogueira). O marcador
  diz onde fica o lugar ("o lugar fica a nordeste"); o lugar em si é a cena dele (a parte 14c).
- **Tudo** entra depois da vegetação, com o sorteio dele, longe da borda (dois quadrados e meio: a borda fica como a do
  vizinho) e do meio da situação; a história do lugar fica longe da guerra. Cada coisa ganha o marcador oculto do
  mestre, com o nome do que é ("Acampamento: Hoste de Ferro (1.500 tropas, Casa de Ferro)", "Campo de batalha: Batalha
  do Vau (há 2 dias)", "Cerco de Pedravale (há 5 dias, Casa de Ferro): o lugar fica a nordeste", "Casa queimada"). O
  resumo diz o que entrou e o que não coube (com a dica do tamanho Grande).
- **O que sai igual**: sem guerra no hexágono, ou com as marcas desligadas, os planos são os de antes (conferidos: 312
  planos e 50 desenhos dos geradores de fora e 1.200 planos de hexágono, com e sem a história e os achados).

### Os arredores do lugar (lote 14, parte 14c)

- **A escolha** (`Arredores`, 10fb-arredores.js): o Vilarejo, a Cidade (a cena completa), a Tribo, as Ruínas e o Porto
  ganham os **Arredores** na janela — Nenhum (o lugar sozinho, como sempre), Pouco (uns 4 quadrados de cada lado), Médio
  (uns 8; o de começo) e Muito (uns 14: cabem os acampamentos e a batalha). A janela lembra a escolha. O lugar sai como
  sempre e fica no meio da cena, com o chão de fora em volta. No mapa de bairros da Cidade os arredores não entram (a
  nota diz). Com eles, a **História** e os **Achados raros** dos arredores (a batalha antiga, o acampamento abandonado, o
  incêndio e as ruínas pequenas em volta do lugar; o achado só o mestre vê). O modelo guarda os arredores; o modelo de
  antes deles abre o lugar sozinho, como era.
- **O anel**: o chão do terreno do lugar (com o hexágono, o dele), as manchas dos biomas vizinhos longe do lugar, a
  vegetação e os enfeites de cada bioma, os morros e os penhascos a três quadrados ou mais do lugar e da água. O lugar
  de outro chão (a Cidade no campo, num hexágono de floresta) fica numa clareira do chão dele, de beira macia. O rio e
  os caminhos do lugar seguem pelos arredores até a borda — o rio a um ou dois quadrados do lugar, descendo pelo relevo;
  o caminho reto para fora e depois pelo mais barato —, com as pontes onde cruzam, nas cores e na largura do lugar: o
  desenho do lugar fica dentro da beira dele e o anel continua o rio e os caminhos dali, sem emenda; o relevo da água (a
  fundura, a do rio do lugar) é um só, de borda a borda, e todos os caminhos dos arredores têm as cores do lugar (o do
  mapa que chega no dele também). O que o lugar desenha além da beira de propósito (as copas, o lago, o mar e a praia do
  Porto, o lago das palafitas) fica, e o anel não põe nada em cima.
- **Com o hexágono**: "Gerar este lugar…", no marcador do Mapa-múndi, manda o hexágono dele junto (a masmorra, não; o
  encontro do marcador — a ponte, a floresta, a montanha — também leva). O chão do hexágono e os vizinhos nas bordas, a
  água dos vizinhos fora do lugar; o lugar vem preenchido — o rio do mapa (ligado, de onde vem e para onde vai) e os
  portões onde chegam os caminhos do mapa (o Traçado diz, no lugar das rosas) —, sem mexer no que a janela lembra. O rio
  do lugar sai pelo ponto exato do rio do mapa na borda; no lugar sem rio (as Ruínas), o rio do mapa passa em volta. Os
  caminhos do lugar vão até as pontas dos caminhos do mapa: a ponta do mapa que sobra chega no caminho que já existe; o
  caminho do lugar que sobra acaba no campo (o resumo diz); a ponta que cai no mar vai até a beira. O mar do Porto e o da
  Cidade ficam no lado da água do hexágono, de borda a borda da cena. Com os arredores em Nenhum, o chão do hexágono não
  entra (a nota diz por quê).
- **A guerra em volta do lugar** (as marcas da parte 14b, nos arredores): o **cerco do próprio lugar** (o pedido do
  marcador marca o cerco dele, `hexParaCena(m, q, r, { marcador })`) — a trincheira em volta, a uns dois quadrados da
  beira (com as passagens nos caminhos), as estacas do lado de lá, as máquinas atrás dela viradas para o meio do lugar,
  o aríete diante de um portão (o da muralha da vila e da cidade, o portão arrombado do forte, a paliçada da tribo), as
  flechas e os buracos dos tiros, o estandarte e, mais para fora, o acampamento de quem cerca (ou o posto), com o
  marcador do mestre ("Cerco de Pedravale (há 5 dias, Casa de Ferro)"). O cerco de outro lugar do mesmo hexágono fica
  fora da cena (o resumo diz). No **hexágono destruído**, umas quatro em cada dez casas do próprio lugar queimadas (de
  uma a seis): a fuligem, as duas primeiras fechadas desabadas (as cinzas, as vigas e a chaminé), o chão chamuscado nas
  abertas e nas redondas (a tenda, a iurte e o iglu queimam na forma delas), com o marcador do mestre nas três primeiras.
  O corrompido e a batalha fresca ficam nos arredores. Os acampamentos e a batalha precisam de espaço: quando não cabem,
  o resumo diz ("com os arredores em Muito cabe mais").
- **A cena criada**: do tamanho dos arredores, com o fundo esticado (o anel, o lugar por cima e as marcas no lugar); as
  paredes, as portas, os móveis, as luzes, os marcadores e a entrada da masmorra do lugar, deslocados para o meio; os
  marcadores dos arredores (a história, a guerra) ocultos. O aviso diz que eles vieram junto ("Os arredores (Médio) vieram junto.").
- **O que sai igual**: com os arredores em Nenhum, os planos, as prévias, os resumos e as cenas de sempre (conferidos:
  502 impressões dos lugares, dos desenhos e das cenas, 312 planos e 50 desenhos dos geradores de fora e 1.200 planos de
  hexágono).

### Consertos e ajustes rápidos (lote 15)

- **O máximo da barra ligada vai para a ficha** (`Fichas.maximoParaFicha`, 07b-fichas.js; o campo do máximo no painel do
  token): antes, o máximo mudado só no token voltava para o da ficha na primeira mudança — numa ficha de jogador ainda
  sem pontos, o `LVL*5` da fórmula: o HP "que não descontava e voltava para 10". Agora o número entra na ficha no lugar da
  fórmula do recurso (o que a árvore e os itens somam continua por cima: o total fica o número digitado) e o valor de
  agora fica como estava. Na ficha preenchida (algum atributo com ponto) a Cena pergunta antes de trocar a fórmula pelo
  número, mostrando a fórmula, o que ela dá e o número que fica; na ficha vazia, ou com o máximo que já era número,
  troca direto. O aviso tem **Desfazer**, que volta a fórmula (e não passa por cima de uma mudança feita depois na
  ficha). Na barra especial, o número é o máximo dela (pelo menos 1). A ficha que não está à vista (o mestre auxiliar sem
  a aba Fichas) não muda: o aviso diz onde mudar.
- **As barras especiais só ao passar o mouse**: as barras especiais da ficha (as cargas, os usos) aparecem em cima do
  token só com o mouse por cima ou com o token selecionado, no alto da pilha — a altura conta com elas sempre, e as outras
  barras não saem do lugar. Nas opções de cada barra, **No mapa**: "Sempre no token" ou "Só ao passar o mouse ou
  selecionar" (qualquer barra; a escolha fica na barra e vai para os jogadores). O painel e a faixa de baixo mostram
  todas.
- **A porcentagem nas barras**, sempre do máximo e arredondando para baixo: `-10%` tira 10% do máximo (Vida 80/100 →
  70/100), `+25%` põe, `50%` deixa a barra na metade. No campo da barra (o painel do token e a faixa de baixo), na caixa
  "Somar ou subtrair de todos" (cada um com o máximo dele; sem sinal, tira, como o número dessa caixa) e no valor atual
  dos recursos na ficha. O dano gasta a sobrevida primeiro, como o `-8` de sempre.
- **O Estaque escondido do jogador**, ficha por ficha: no Estaque da ficha de um jogador (ou de um NPC aberto aos
  jogadores), o mestre marca "Esconder o Estaque de …". O jogador deixa de ver a aba, e o texto nem chega a ele: a ficha
  leva o Estaque vazio e o texto vai para o documento dos segredos do mestre (`fichas:segredos`, em `est`); o mestre vê e
  escreve como sempre (também depois de recarregar, e sem perder o texto quando chega uma mudança do jogador).
  Desmarcado, o texto volta para a ficha.
- **O Descanso curto da equipe ativa**: no Acampamento, a janela do Descanso curto traz, além de quem está em volta da
  fogueira, a equipe ativa (os personagens de jogador da campanha, e os do mundo, que o mestre deixou ativos na ficha) —
  "longe da fogueira", marcados — e gasta as rações do acampamento do mesmo jeito. O inativo não entra sozinho; o Descanso
  longo continua sendo de quem está na fogueira. Nas **Cenas**, o botão **Descanso curto…** (na Seleção vazia, na
  seleção de vários tokens e no menu do mapa) abre a aba Acampamento já nessa janela, com quem está na cena marcado: os
  tokens escolhidos (os ligados a uma ficha) ou, sem escolha, os personagens dos jogadores e os aliados à vista (o inimigo
  não). Lá o mestre confere quem descansa e as rações, e confirma (e lá também se desfaz).
- **Mapa-múndi**: Shift + clique em dois exércitos e a seleção oferece **Batalha entre os dois…**, que abre a batalha com
  um de cada lado (nada é rolado antes de pedir; sem unidades, o botão fica apagado, com a explicação). Em cima do token
  do exército, só para o mestre, **quantos soldados** ele tem (de qualquer tipo: a soma das tropas das unidades que lutam,
  "1,2 mil", "25 mil") e, quando há, os selinhos dos **magos** (a estrela) e das **máquinas de cerco** (a roda); o título
  diz por extenso. A fileira da marcha sobe para cima deles.

### Fichas, grupo e árvore (lote 16)

- **A ficha em abas, com o resumo fixo em cima** (fichas/index.html: `htmlResumo`, `htmlAbasFicha`, `irParaAba`): em
  cima, sempre à vista, o nome, as barras (HP, SP e as especiais, que se editam ali: `-8`, `+25%`), os atributos e as
  defesas, os lapros, a caixinha do grupo, o aniversário do dia, os ferimentos abertos, a Sanidade e o Conforto — cada
  selo leva à aba em que a coisa fica. Embaixo, as abas **Atributos · Bolsas e itens · Social · Skills · Notas**; a
  ficha lembra a aba (também ao recarregar e ao trocar de personagem), e a ficha nova abre em Atributos. Trocar de aba
  não redesenha a ficha (quem digita noutra aba não perde nada).
- **A equipe ativa e a inativa** (`renderLista`, `soltarArraste`): na mesa, o mestre vê cada grupo do elenco com os
  ativos em cima e **Inativos (n)** recolhido embaixo (a tela lembra se está aberto). Arrastar uma ficha de um bloco para
  o outro muda o ativo dela — o mesmo de "Personagem ativo" (`estado.ativo: false`), com aviso e Desfazer; soltar em cima
  do "Inativos" recolhido também vale. Quem joga não vê os blocos.
- **O aniversário no calendário do mundo** (`ficha.aniv = { d, m, a? }`; `TC.rules.anivOk` e `aniversario`;
  `FichasMesa.calendario`): no "Quem é", o dia, o mês (os do mapa da mesa — o do Jornal publicado, o do rascunho para o
  mestre, senão o primeiro mapa; sem mapa, os 12 meses de começo) e o ano, opcional, para a idade. Escrevem o dono e o
  mestre. A ficha diz quanto falta ("É amanhã · 19 anos"; o dia que não cabe no mês avisa) e, no dia, o selo no resumo.
  No **Jornal**, o rascunho do mestre sugere a nota pronta (`JornalNucleo.aniversarios`: hoje e nos próximos 7 dias,
  com a idade); "Pôr como nota" põe (com Desfazer), "Agora não" esconde aquele dia do mundo neste aparelho, e nada sai
  sem publicar.
- **A caixinha do grupo** (supabase/migrations/0019_caixinha_do_grupo.sql; `TC.dados.caixa`, `TC.ponte.caixa`,
  `FichasMesa.moverCaixa`): na aba Bolsas e itens, os lapros que o grupo guarda junto — uma por grupo de cada bloco
  (`fichas:caixa`, os grupos do mundo; `fichas:caixa@<campanha>`). Com os lapros da ficha, **Pôr na caixinha** e
  **Pegar para a ficha**, com a conta antes, botão por botão (o que não dá fica apagado, e diz por quê), e Desfazer. Quem
  mestra também lança **+ Achado** e **− Despesa** sem ficha. O extrato (até 100 linhas) diz quem fez, quanto, para quê e
  o saldo ("pelo mestre", quando foi ele com a ficha de outro). Na mesa, quem muda as duas pontas juntas é o banco
  (`caixa_mover`: confere que a ficha é de quem pede e do grupo, que há lapros que bastem na ficha ou na caixinha, e que
  a campanha está aberta); o grupo que muda de nome ou passa para outra campanha leva a caixinha (`caixa_levar`, somada
  à de lá); o grupo desfeito deixa a caixinha guardada com o nome. Sem mesa, a mesma conta fica nesta tela (`S.caixas`).
- **A aba Skills como resumo** (`htmlCartoesSkills`): um cartão para cada coisa aprendida na árvore (o tipo de uso, o
  grau, o texto do grau e a descrição com as contas no número do personagem, o bônus na ficha, o custo de uso) e para
  cada **skill única**; **Abrir na Árvore** (na mesa, na ficha que a pessoa controla) leva ao personagem na aba Árvore.
  Distribuir pontos e equipar árvores continuam embaixo, recolhidos. As habilidades escritas à mão viram skills únicas em
  **Passar para skills únicas…** (quem mestra; sem mesa, quem usa): a janela mostra cada uma com o tipo de uso que ela
  ganha (as inativas desmarcadas), e o aviso tem Desfazer.
- **As skills únicas** (`skills.unicas`; `TC.rules.unicasDe`; arvore/index.html: `blocoUnicas`, `editarUnica`): na
  Árvore, no modo Jogador, o painel do personagem tem **Skills únicas** — o mestre cria uma skill só dele (o nome, o que
  faz com as contas entre chaves, o bônus na ficha, o custo de uso e o tipo de uso), já aprendida, sem árvore e sem
  gastar pontos; Editar e Apagar (pergunta antes), com o ↺/↻ da Árvore. O bônus conta nos atributos (`bonusDaArvore`
  soma as únicas). Quem joga vê; quem escreve é o mestre (como os ramos trancados).
- **A busca e os filtros da Árvore**: a busca acha também pelo texto de cada grau e lista o que achou em todas as
  árvores que a tela mostra (o mestre: a biblioteca; o jogador: as equipadas), mais as skills únicas do personagem — um
  clique troca de árvore e escolhe o nódulo (Esc fecha; ↑↓ e Enter andam). Em cima da árvore, ao lado das naturezas, o
  filtro dos **tipos de uso** (ativa, passiva…), com "limpar".
- **A Corte com as fichas** (mundo/corte-painel.js): no cartão do título, o titular pode ser uma das **fichas da mesa**
  que ainda não estão na corte — ao salvar, o personagem entra na corte com a ficha ligada (o nascimento vem do
  aniversário da ficha, quando ela tem o ano) e fica com o título; a nota diz isso antes. Na **Diplomacia**, **Quem fala
  por cada facção**: o governante (o maior título preso a ela), com "ficha" e **Abrir a ficha** quando ele tem uma (quem
  joga vê só os governantes que conhece).
- **O guia de cada aba** (tc/guia.js, a casca e `TC.ponte.aoMostrar`): o **?** da barra de cima abre os assuntos da aba
  aberta — o guia do mestre para quem mestra a aba, o do jogador para quem joga —, um aberto de cada vez. **Mostrar onde
  fica** fecha o guia e destaca o lugar no sistema por uns instantes (nas Fichas, abrindo antes a aba da ficha); o lugar
  que não está à vista dá o aviso do assunto. Trocar de aba com o guia aberto troca os assuntos. Nada muda sozinho.
- (conserto) A busca rápida que leva a um item da bolsa abre a aba Bolsas e itens da ficha.

### O Mapa-múndi e a guerra (lote 17)

- **A zona de guerra automática** (mundo/nucleo.js: `donosDosHexes`, `zonaDeGuerra`; mundo/tela.js: `desenharZonaAuto`):
  com a grade, o dono de cada hexágono é quem controla a região de dentro onde o centro dele cai (quem ocupa, ou a dona);
  o hexágono de uma cidade ocupada fica com quem ocupa. A zona são os hexágonos ocupados e os dois lados da fronteira
  entre facções em guerra (aba Facções), listrados nas duas cores, com a borda tracejada e a **linha do front** (os lados
  de hexágono entre as duas, nas duas cores, andando, como a frente de batalha). Ela cresce sozinha com a ocupação. O
  mestre ajusta: a ferramenta **Frente → Ajustar a zona** pinta para **pôr**, **tirar** ou voltar ao **automático**
  (`guerra.zona = { off, add, tira }`, um passo de Desfazer por traço); na aba Guerra, **Zona de guerra** liga e desliga,
  conta os hexágonos e tem **Voltar ao automático**. É só desenho: nenhuma regra muda por ela. Todos veem: quem joga
  recebe a zona pronta na projeção (`guerra.zauto`, fora da névoa, sem as facções escondidas). Sem a grade, as regiões
  ocupadas continuam listradas (lote 12).
- **As setas de ofensiva** (o objeto `a`: `{ pts, fac, cor, ver }`; `MundoNucleo.setaDaMarcha`): a ferramenta **Frente →
  Seta de ofensiva** desenha uma seta curva pelos pontos, na cor da facção (ou numa cor própria), andando, com a ponta no
  último ponto. E a **marcha planejada** de um grupo com rota vira seta ("Mostrar a marcha como seta", no painel do
  grupo: de onde ele está até o fim da rota; encurta conforme ele anda). Os jogadores veem as setas da facção deles (a
  facção dos jogadores); as das outras, só as que o mestre mostrar, uma por uma ("Os jogadores veem"). A seta da marcha
  vai para eles pronta (`sp`), sem a rota, que pode continuar escondida.
- **As viagens por mar** (`marcador.mar = [{ p, d }]`; `ligacoesMar`, `caminhoComMar`): no painel de um porto, **Viagens
  por mar → Ligar a outro porto…** liga os dois com os dias de viagem (vale nos dois sentidos; dá para mudar os dias ou
  desligar). A linha tracejada entre os dois portos aparece no mapa, com os dias, para todos que veem os dois portos. No
  **Traçar entre dois marcadores** de um grupo, o caminho vai por mar quando chega antes (os dias da ligação contam no
  passo de quem anda). Na viagem, a travessia leva os dias da ligação: os hexágonos do mar dividem o tempo (as bolinhas
  continuam valendo), e a rota fica azul nesse trecho.
- **Os recursos por hexágono** (`eco.hexr = { "q,r": { recurso: n } }`): na ferramenta **Terreno → Por hexágono**, com a
  economia ligada, o pincel **Recurso…** põe um recurso e quanto ele dá por semana em cada hexágono pintado (0 tira); soma
  com o do terreno, na conta da região (`producaoPropria`, na fonte "terreno"). **Tirar os recursos** limpa. Enquanto o
  pincel está nesses modos, cada hexágono com recurso mostra o que tem, e a dica do cursor diz o que o hexágono produz. O
  mestre vê tudo; quem joga, a produção da facção dele (a economia de sempre).
- **Os lugares que fazem algo**: a **mina**, a **pedreira**, a **serraria** e a **fazenda** produzem um recurso por semana
  (`marcador.pr`; o de começo é o do papel do ícone — o metal, a pedra, a madeira, a comida — com 5 por semana) para quem
  controla a região onde ficam (`MundoReino.lugaresQueProduzem`; na produção, a fonte nova **lugares**, que quem joga vê
  na economia dele). O **castelo** e o **forte** somam na defesa da fortificação (+3 e +2, de começo), mesmo sem uma
  fortificação escrita: quem defende ali já ganha isso na batalha. A **ruína**, a **masmorra** e o **ninho de monstro**
  têm **Gerar este lugar…** (o ninho: a boca da caverna, com o covil embaixo).
- **A defesa do terreno** (`guerra.def = { ter, ic }`; `defesaDoTerreno`, `defesaDoIcone`, `defesaNoHex`; o bônus
  `terreno` de mundo/guerra.js): na aba Guerra, **Defesa do terreno e dos lugares** mostra a tabela (de começo: Montanha
  e Desfiladeiro +3, Colina +2, Floresta, Selva, Pântano, Ruínas, Geleira e Floresta morta +1; Castelo +3, Forte +2) e
  **Mudar a tabela…** (de −10 a +10; "Voltar à de começo"). Na batalha, quem defende o hexágono dela ganha o número do
  terreno dele, no Choque e na resumida — por começo, o lado atacado; com uma fortificação, quem a defende; o alto da
  janela deixa trocar (ou "Ninguém (campo aberto)"). A lista dos bônus diz de onde veio: "Terreno (Montanha) +3".
- **Os terrenos novos**: Água rasa, Mar profundo, Desfiladeiro, Geleira, Floresta morta, Oásis, Charneca e Terra
  devastada, cada um com o desenho dele (na tinta e em cada hexágono) e com o bioma da cena que nasce dele. Um mapa novo
  já vem com eles; num mapa de antes, a aba Terreno oferece acrescentar (nada muda sozinho). E os **ícones novos**:
  Fazenda, Pedreira, Serraria, Forte, Farol, Estalagem, Mercado, Cemitério, Portal e Ninho de monstro.
- **A terra devastada** (`MundoCampanha.devastadaNoDia`, `aplicarDevastada`): no **Próximo dia**, onde houve batalha nos
  dias que passaram (ou onde um cerco continua), a janela sugere marcar o hexágono como Terra devastada — a linha vem
  **desmarcada**: só vale a que o mestre marca (o custo próprio do hexágono fica). O mestre também pinta a Terra
  devastada como qualquer terreno.
- **A caneta** (supabase/migrations/0020_caneta_do_mapa.sql; mundo/mundo.js: `App.rabiscar`, `rabiscosDe`,
  `limparRabiscos`; mundo/tela.js): o botão da caneta, no canto do mapa (e no trilho do mestre, tecla W), é de todos —
  quem joga também desenha. Duas canetas: a que **some em segundos** (o traço apaga sozinho, uns segundos depois da última
  mudança dele) e a que **fica até limpar**. Cada pessoa tem a cor dela (a de quem participa da mesa; dá para escolher
  outra, neste aparelho). Os outros veem ao vivo (o traço vai sendo mandado enquanto é desenhado). Quem joga limpa os
  dele ("Limpar os meus", "Desfazer o meu último"); o mestre, os de todos (**Limpar desenhos**, com Desfazer no aviso).
  Na mesa, cada pessoa tem o documento dela, `mundo:rabisco:<usuário>` (ela é a dona, a mesa inteira lê), que o banco
  só deixa o dono criar e mudar (e quem mestra o Mapa-múndi, para limpar), com um tamanho máximo. Sem mesa, os traços
  que ficam ficam neste navegador. A caneta não mexe no mapa nem no Desfazer dele; a camada **Caneta** esconde os traços
  só neste aparelho.

### As condições das raças (lote 19)

- **As condições** (src/cenas/src/js/01-base.js: `CONDS` no grupo `racas`; tc/rules.js: `CONDICOES`, a mesma lista): as 53
  das árvores de raça (Carga de trovão, Frio, Laço, Dor, Recusa da Morte, Coma, Contagem, Sentença, Endurecido, Exposto,
  Rendido, Transe Rubro, Lição…), num grupo só, **Raças**, em ordem alfabética, cada uma com o ícone próprio e a raça e a
  árvore de onde vem (aparece embaixo do nome, no seletor e nas ativas, e na dica do token). São marcadores, como as
  outras: o efeito, quem aplica é o mestre. **A duração de começo** (`dur`) e **o contador de começo** (`ini`) vêm
  preenchidos ao pôr; **o contador para no máximo** (`max`: Carga de trovão 3, Frio 5, Dor 5, Endurecido 5, Dívida
  Espiritual 5, Perdido 3, Na Pança e Sobra 2). **No limite, a sugestão** (`lim`), com Aplicar e Desfazer: o Frio no 5
  sugere Congelado por 1 rodada (e zera); a Contagem (começa em 3 e desce) no zero sugere a Sentença.
- **Os membros perdidos** (Mão, Pé, Braço e Perna Perdida, Costelas Abertas; `lado`): só o mestre, num token de cada vez;
  a janela pergunta o lado (esquerdo, direito, os dois). Num token ligado, a ficha marca a parte como amputada
  (`estado.amp`; as Costelas, um ferimento no peito em `estado.fer`), com a condição de onde veio (`cond`): tirar a
  condição (ou o Desfazer) desmarca; o que o mestre marcou à mão na ficha fica. Grava quem pode gravar a ficha (o mestre
  ou o dono). Os itens e poções da ficha não põem estas (como a Ferida permanente e o Clone).
- **As zonas e os objetos** (src/cenas/src/js/06c-fx-racas.js; o grupo **Raças** da aba Efeitos): o Chão Rachado, o Chão
  Revirado, o Corredor de Vento, o Enxame de Varejeiras, o Foco de Doença, a Arapuca e a Grande Arapuca (nascem
  escondidas dos jogadores, como as runas; quem entra avisa o mestre, com o Revelar), a Fumaça do Nistus'atach, a Terra
  Morta, o Chão Quebradiço, a Nuvem de Cinza, o Chão Podre, o Círculo de Sangue, a Névoa Rubra, o Campo Aquático, a Água
  do Odre, a Cerca de Espíritos (a linha entre dois totens), o **Totem** (12 de HP) e a **Parte Solta** (15 de HP; a mão,
  6): cada uma com o desenho próprio, a regra escrita no painel (com a raça), a condição sugerida e o aviso do começo da
  vez de quem está dentro. Escolher uma delas já põe na ferramenta a duração, a forma e o tamanho de começo (o Corredor
  de Vento, a linha de 6). O Totem e a Parte Solta têm os pontos de vida no painel; em zero, somem (com Desfazer).

### As cenas e o acampamento (lote 18)

- **O relevo com regra** (src/cenas/src/js/07f-relevo.js): as áreas de terreno com altura (Morro, Montanha, Plataforma,
  Fosso…) passam a ter regra — sempre como sugestão, o mestre confirma. A **tabela do mestre** (a da mesa, uma para
  todas as cenas: `prefs.relevo`; a cena que vai para os jogadores leva uma cópia, `relevoTab`) começa com: subir 1
  quadrado de altura custa +1 quadrado; 3 quadrados de uma vez é **penhasco** (subir só escalando; descer é queda); de
  cima +2 no ataque, de baixo −2; a **queda** sugere 10% da Vida máxima a cada 2 quadrados. A régua e o arrastar mostram
  a subida e o penhasco; a queda mostra ao mestre o aviso com "Aplicar o dano" (e o Desfazer); a janelinha de atributos
  oferece somar o bônus de cima ou de baixo, mirando alguém. A **visão pelo relevo** é uma chave por cena (aba Cena →
  Relevo; precisa da visão por paredes): o mais alto que o olho esconde o que está atrás, de dentro de um fosso só se vê o
  fosso e de cima se vê mais longe. "Regras do relevo…" muda a tabela.
- **A caverna embaixo da cena** (10g2-masmorra.js: `abrirSubsolo`): a entrada de gruta da Região livre (e qualquer
  Entrada, pelo menu dela) oferece "Gerar a caverna embaixo…": o subsolo do tamanho da cena de cima, com a subida embaixo
  da entrada, o rio de cima virando o rio de baixo (pelo mesmo traçado), o bioma de baixo sugerido pelo de cima (fungos
  que brilham, cristais, lava, gelo, raízes), um achado e um ninho (marcadores ocultos) e a passagem escondida para
  descer mais (o nível de baixo é a masmorra).
- **As arenas** (10g2-masmorra.js: `nivelDeArena`, `fasesDaArena`; 10g4-arena.js): a aba **Arena** de "Gerar um lugar…"
  tem oito tipos (Arena/coliseu, Sala do trono, Mausoléu, Covil do dragão, Altar do ritual, Ponte sobre o abismo, Topo da
  torre, Círculo de pedras) em três tamanhos: a entrada embaixo, o lugar do chefe elevado de frente para ela (com a altura
  do relevo), a cobertura e os obstáculos (tapam a visão), os perigos no chão (zonas: o mestre aplica), o token do chefe
  (dois quadrados, dois turnos por rodada) e os pontos de reforço ocultos. As **fases** vêm prontas (a 2 e a 3, cada uma
  com duas mudanças: os reforços chegam, o chão desaba, as luzes se apagam, a grade fecha, uma zona aparece) e cada
  mudança liga, desliga ou troca na janela. Ficam na cena (`fases`, só do mestre: a projeção não leva); a aba Cena mostra
  cada fase com "Acionar…", e o botão direito no mapa também: acionar mostra antes o que muda e é um passo só (o
  Desfazer volta). O último nível da masmorra pode ser a **sala do chefe** (a arena que combina com o tipo, com a Saída
  de volta), e o ninho, a ruína e a masmorra do Mapa-múndi oferecem "Gerar a arena do chefe…".
- **O campo de batalha** (10g5-campo.js; mundo/guerra-painel.js: `secCampo`, `abrirCampo`, `doCampo`): na janela da
  Batalha do Mapa-múndi, "Abrir no campo de batalha…" manda para as Cenas a cena do hexágono da batalha e os dois
  exércitos (as unidades, a cor da facção, o lado de cada um, a ficha do comandante e a do governante da facção). A
  janela "Gerar um lugar" abre com o bloco do campo: quantos soldados vão em cada bloco (de começo, 100). Ao criar, os
  dois exércitos ficam frente a frente — os blocos de soldados na frente, os magos e as máquinas atrás, cada bloco um
  token com a barra dos soldados (até 40 por lado). **Quem move**: o mestre move todos; o jogador dono da ficha do
  comandante (ou, sem ela, do governante da facção) é o dono dos blocos daquele lado. A **leitura do campo** (aba Cena →
  Campo de batalha): o flanco (o bloco pego por dois lados, ou por trás), o terreno alto, a cobertura (a mata) e a
  reserva viram **bônus sugeridos**; "Levar para a batalha…" abre a batalha no Mapa-múndi com eles, e lá "Somar" vira um
  bônus do mestre (tática, terreno, reforço). No "Depois", "Levar as perdas aos blocos" manda as perdas de cada lado para
  o campo: a prévia mostra quanto cada bloco perde (quem está na luta perde o dobro; o que chega a zero sai do campo), e
  aplicar é um passo só.
- **O acampamento**: as barracas com detalhe (a lona, as costuras, as cordas, a porta aberta, a luz de dentro), os
  abrigos pelo que o grupo carrega (barraca, pavilhão, toldo, rede), os veículos pelo tipo (carroça, carruagem, barco,
  montaria, animal de carga) e o estado no desenho (a roda quebrada, a carga demais). A quinta área, **Caça**, com o defumadouro: cada
  caçador rola (a Percepção, de começo) contra a dificuldade do lugar, e o resultado sugere rações (Carne de caça) no
  descanso longo — as regras ficam no Diário, em Regras do descanso. **Distribuir…** abre um quadro com uma coluna por
  área: arraste os retratos (ou use as setas), com Desfazer.

### A Guerra no Mapa-múndi (lote 8)

- **A aba Guerra** (só do mestre; `mundo/guerra-painel.js`, `window.MundoGuerraPainel`, com as contas em
  `mundo/guerra.js`, `window.MundoGuerra`, que roda também no Node): a batalha (nova, ou voltar à que ficou aberta), os
  exércitos que se encontraram, os exércitos (tropas, moral e para quantos dias dão os mantimentos; "sem mantimentos"
  quando acabaram), os tipos de tropa, os hexágonos destruídos ou corrompidos e o histórico das batalhas. As seis abas
  cabem no painel (com a letra um pouco menor na tela estreita; no painel de 280 px, o número da seleção vira um ponto).
- **Os tipos de tropa** são a tabela do mestre (vazia no começo; até 40, em `guerra.tipos`): o nome, "à distância"
  (entra na Abertura, com os magos) e a vantagem contra cada outro tipo (de −20 a +20, no d20). Apagar um tipo deixa as
  unidades dele sem tipo.
- **O exército** é um grupo do tipo Exército (`exe` no grupo). A seção Exército: o comandante (o nome e o bônus no
  d20; a ficha ligada, opcional, dá o nome e o retrato), a moral (0 a 10; 5 é firme), os mantimentos e o consumo por dia
  (um por cem soldados, ou o que o mestre escolher) e as unidades (até 40): nome, tipo, tropas, HP e HP máximo (no lote
  12, parte 12c, viram o HP de cada tropa), ATQ,
  DEF, magos, máquinas de cerco (no lote 12, parte 12d, quantas de cada tipo), equipamentos (até 12, cada um com ATQ e
  DEF) e "escondida dos jogadores"; duplicar e apagar (com Desfazer).
- **A fortificação** é do marcador (`estr`): o nome, a DEF (0 a 20: o bônus de quem defende ali, pelo HP que sobra), o
  HP (danificada, em ruínas) e Consertar. As máquinas de cerco de quem ataca danificam (até o lote 12, parte 12d,
  também tiravam da DEF; agora a DEF cai só com o HP).
- **A batalha** (uma janela, aberta pelo exército, pela aba ou pelo aviso do encontro): os dois lados (a força de cada
  unidade é tropas × de 50% a 100%, pelo HP; no lote 12, parte 12c, só as tropas), quem defende uma fortificação a até um hexágono (escolhido sozinho), a
  tabela lado a lado e os bônus de cada um, na escala do d20 — números (+4 a cada vez que dobra o outro, até 10), ATQ
  contra DEF (até ±6), os tipos (a vantagem pesada pela força de cada tipo), a moral (− 5), o comandante, os magos
  (√magos, até 6), à distância (+3 se só um lado tem; com os dois, os números da força de longe, até 6), as máquinas de
  cerco (lote 12, parte 12d: √ da soma do dano contra exército, até 6), a fortificação e a fome (−1 por dia sem
  mantimentos, até −3). Os bônus do mestre (tática, terreno, reforço, magia ou outro) valem
  para um lado, na batalha toda ou só num momento.
  - **A resumida (d100)**: um d100 de cada lado mais 5 × os bônus; a margem diz o tamanho (menos de 8, empate; até 24,
    apertada; até 49, vitória; até 79, clara; 80 ou mais, esmagadora).
  - **A detalhada (d20)**: um d20 de cada lado em cada momento — Abertura (magos, à distância e as máquinas de cerco), Choque (números, ATQ ×
    DEF, tipos, fortificação e fome), Virada (moral e comandante; e os heróis, no lote 9) e Desfecho (números, moral e fome) —, e o placar soma
    as margens (menos de 4, empate; até 11, apertada; até 23, vitória; até 35, clara; 36 ou mais, esmagadora).
    Momento-chave: margem de 2 ou menos, ou saiu 1 ou 20; antes de seguir, o mestre pode mudar um bônus (no próprio
    momento: o dado fica e o resultado muda na hora), rolar de novo, escrever ou parar.
  - **Parar**: o recuo (quem recua perde por pouco), a rendição (perde feio) e a trégua (ninguém vence). Mudar um bônus
    depois de rolar refaz a conta com os mesmos dados.
  - A janela não pula para o topo a cada dado. Fechada com dados rolados, a batalha fica guardada na página ("Voltar à
    batalha aberta"); fechada sem nada feito, some.
  - **A ajuda da batalha** (`mundo/guerra-ajuda.js`): o "?" no alto da janela abre o guia ao lado da batalha (no
    celular, por cima dela), sem cobrir os números; um "?" pequeno ao lado de cada parte — Rolar, a resumida e a
    detalhada, cada momento, o momento-chave, os dois lados, cada bônus nas listas, os bônus do mestre, a fortificação,
    os heróis, a ação heroica, parar, o resultado e o depois — abre o guia já naquela parte (marcada por um instante).
    O guia explica em palavras simples a resumida e a detalhada, os quatro momentos (o que pesa em cada um), cada bônus,
    o resultado, o depois e os heróis, sempre com os números da batalha aberta ("Nesta batalha: …", acompanhando cada
    dado e cada bônus mudado); a fórmula de cada coisa fica em "Ver a conta". Esc ou o × fecham só a ajuda.
- **O depois** (a prévia; nada muda até "Aplicar", que é um passo de desfazer): as tropas e o HP de cada unidade (quem
  perde, mais: de 12% a 50%, pelo tamanho; quem vence, de 4% a 8%; a unidade que chega a zero tropas ou zero HP sai), a
  moral (quem vence sobe, quem perde cai), um dia de mantimentos, a fortificação (as máquinas de quem ataca sempre
  batem — a soma do dano contra estrutura delas —; vencendo, o dobro e mais o tamanho da vitória), a frente (a dos dois lados, a mais perto; anda de 1 a 4 hexágonos — dá para mudar — para o lado
  de quem perdeu, só perto da batalha, numa fase nova a partir de hoje: os dias de antes ficam com a linha de antes) e
  o hexágono (fica como está, destruído ou corrompido). A batalha aplicada vai para o histórico (até 60, ficam as mais
  novas): os momentos, os dados e as notas; dá para ler e escrever mais depois.
- **Os hexágonos destruídos e corrompidos** (`guerra.hexes`) aparecem no mapa, na camada Guerra — também para os
  jogadores (fora da névoa). Marca-se no depois de uma batalha ou pelo botão direito num hexágono; a aba lista, vai até
  lá e tira a marca (com Desfazer).
- **A frente que anda**: as fases da frente (`fases`, como na zona de guerra — a partir de tal dia, tal linha). A seção
  "Fases da frente" lista as fases, tira uma e cria a de hoje, para arrastar os pontos à mão.
- **No tempo do mundo** ("Próximo dia", "+1 tempo"): dois exércitos de facções diferentes (ou sem facção) que passam a
  até um hexágono um do outro no caminho dão o aviso "Exércitos frente a frente", com "Abrir a batalha" (e a aba lista
  o encontro). A cada dia que passa vem a proposta dos mantimentos: quanto cada exército come, para quantos dias
  sobra e quem ficou sem (a moral cai 1 por dia sem comer, e a fome tira ATQ nas batalhas); dá para desmarcar quem não
  come, e "Agora não" não muda nada.
- **Quem joga** não vê a aba Guerra nem os números: do exército, só o nome do comandante e as unidades que não estão
  escondidas (o nome e o tipo); dos tipos, só os nomes; nada do histórico, das fortificações, das vantagens nem das
  fases que vêm (a frente aparece como está hoje). O mapa de antes (sem guerra) continua igual.

### Fichas e Cenas (lote 9)

- **O Limite de dano na ficha de jogador**: a ficha da distribuição livre (`modoAtr: 'livre'`, a dos jogadores) tem a
  mesma linha "Limite de dano · manual" da tabela de atributos, depois das defesas (`linhaLimiteDeDano`, em
  `fichas/extras.js`); quem edita a ficha escreve (o jogador na dele, e o mestre). Continua um número de consulta.
- **O Duplicado** (a condição `duplicado`, junto do Clone): o gêmeo maligno — o boss que copia um personagem. Pela janela
  da condição (só o mestre, num token de cada vez, nunca num objeto), aplicada no token que vai ser copiado: as barras
  do gêmeo (cheias — no máximo, sem sobrevida, podre ou condições — ou como estão agora, com as condições e a ferida
  permanente; o Clone do original não vem) e, se o
  copiado está na ordem de turnos, entrar logo depois dele (com a mesma iniciativa). O gêmeo nasce ao lado (a até 1
  quadrado; sem lugar, até 3), igual ao copiado (nome, imagem, tamanho, cor, forma, auras), sem dono, com `dup: <id do
  copiado>` e a condição Duplicado (`Act.duplicadoCriar`, um passo de desfazer). Ligado a uma ficha, o gêmeo ganha uma
  ficha só dele (`Fichas.copiarFicha`): uma cópia da original — atributos, defesas, itens, habilidades, a árvore, a
  imagem —, "… (gêmeo)", só do mestre (`vis: 'mestre'`), sem dono, do lado Inimigo, na mesma campanha, com as barras
  como foi escolhido; o token do gêmeo segue essa ficha (o dano nele vai para ela, não para a original) e continua com
  o nome do original. Sem a ficha ao alcance (o auxiliar sem a aba Fichas, ou sem mesa), vai só o token.
- **Para os jogadores**, o gêmeo é igual ao original: a projeção tira `dup` e a condição Duplicado (e, como todo token
  do mestre, a ficha). Só o mestre vê a condição ("gêmeo de Ana") e a seção Duplicado no painel do gêmeo (de quem ele é
  cópia, "Ir até o original", "Tirar da cena").
- **Quando o gêmeo cai** (a barra da vida passa a 0 ou menos — pelo dano na cena ou pela ficha dele), nada some
  sozinho: o aviso oferece "Tirar da cena" (`gemeosQueCairam`, no fim de cada passo no programa do mestre; a ficha fica
  nas Fichas). Tirar a condição do gêmeo o deixa como um token comum.

### O Mapa-múndi (lote 9)

- **O tamanho das bandeiras** (parte 2), neste aparelho: na aba Facções, "Neste aparelho" → "Tamanho das bandeiras no
  mapa": Pequenas (as de antes), Médias (de começo, 1,4×) ou Grandes (1,9×) — todas, nas regiões, nos grupos, nas
  frentes e nas zonas de guerra (`escalaBandeira`, em `mundo/tela.js`; guardado em `tinycats:mundo:painel`, campo
  `band`). Não mexe no mapa. A base da bandeira da região fica no lugar (em cima do nome) e a do grupo não encosta no
  token.
- **A missão no mapa** (parte 2): um marcador, um grupo, uma região ou um evento podem ter uma missão (`o.mis`: `t`, o
  texto curto; `ref`, o id de uma missão do grupo nas Fichas; `ver`, os jogadores veem; `ok`, concluída à mão). O ícone
  ganha um "!" (✓ concluída, ✕ falhou; a que só o mestre vê, tracejada; o nome vai na dica). Pela seção Missão do
  painel: "Marcar missão…" (o texto curto, ou uma missão do grupo das Fichas — as do mundo e as da campanha em vista),
  "Os jogadores veem a missão" (nasce desmarcado), "Concluir (✓)" / "Reabrir" (no texto curto), "Trocar…" e "Tirar a
  missão" (com desfazer). A missão ligada pega o nome e a situação das Fichas (`App.missaoDaFicha`, de
  `fichas:missoes`, `fichas:missoes@<campanha>` e, as escondidas, `fichas:segredos`): concluída lá, vira ✓ sozinha; a
  ainda escondida nas Fichas não vai para os jogadores mesmo marcada "Os jogadores veem" (até ser revelada lá); a que
  saiu das Fichas fica apagada, com o aviso no painel. Na projeção, só vai a mostrada, pronta (`t` e `e`, sem a
  ligação: `comMissoes`); quem joga lê "Missão: …" no painel. A aba Hoje lista as "Missões no mapa". Duplicar um
  objeto não leva a missão.
- **O descanso dos grupos** (parte 3): todo grupo (o dos jogadores também) pode ter uma hora de descanso (`g.desc =
  { de, ate }`, tempos do dia; pode virar a noite: do 9º ao 2º). Nos tempos do descanso ele não anda (a espera de uma
  parada passa junto); o painel diz "descansando agora" e o mapa do mestre mostra "zZ" no token. O grupo dos jogadores
  só para; o grupo do mundo (caravana, patrulha, exército) dorme num **ponto de descanso** — os marcadores marcados como
  "Ponto de descanso" (`m.desc`, valem para todos) e os pontos do próprio grupo, na rota dele (`g.pdesc`, com a lua no
  mapa quando ele está escolhido): no começo do descanso, se ainda chega a um andando até a metade do descanso (para
  dormir pelo menos a outra metade: do 6º ao 10º, chegando até o começo do 8º), segue até lá e dorme; senão, acampa onde
  está (`andarTempos`, `janelaDeDescanso`, `pontosDeDescanso`). O "+1 tempo" e o "Próximo dia" andam o relógio tempo a
  tempo junto (o descanso depende do tempo do dia). Os jogadores não veem o descanso nem os pontos.
- **Paradas e o fim da rota para todos** (parte 3): "Ao chegar ao fim da rota" (só ida, ida e volta, circuito) e as
  paradas valem para todo grupo, o dos jogadores também.
- **Voltar pela mesma rota** (parte 3): o grupo de só ida que chega ao fim ganha o botão "Voltar pela mesma rota" no
  painel, e o aviso da chegada oferece o mesmo: ele vira (`sentido: -1`, o caminho ao contrário) e anda até o começo;
  lá, o botão o manda de novo para a frente.
- **O clima muda ao longo do dia** (parte 4): a cada N tempos (no calendário da aba Mapa, "O clima muda": a cada 2
  tempos de começo, ou a cada 1, 3, 4, 5, ou uma vez por dia — `clima.cada`, guardado só quando não é 2). O dia fica em
  trechos de N tempos: o primeiro é o sorteio do dia (como antes); cada trecho seguinte anda aos poucos a partir do
  anterior — fica, ou vai para um vizinho (sol ↔ nublado ↔ chuva ↔ tempestade, nublado ↔ névoa, vento, frio, frio ↔
  neve, sol ↔ calor), pela chance da tabela do mês e do ajuste da região (o que não tem chance, não vem). O número de
  cada trecho vem do mapa, do dia e do trecho (`sorteioDoTrecho`): sai igual em todo aparelho. `climaDoDia` passa a dar
  o clima do trecho de agora (hoje) — a barra de cima, a aba Hoje, as regiões, as cenas geradas e a projeção (o
  Acampamento e a Meditação recebem o de agora). Trocar à mão ("Trocar o de agora", no mundo e na região) vale para o
  trecho de agora, até a próxima mudança (`mao`/`chj` com o trecho `t`); o trecho seguinte continua a partir dele. A aba
  Hoje mostra os climas do dia até agora ("Hoje: Sol (do 1º ao 4º) → Nublado (desde o 5º, agora)") e a próxima mudança.
- **Os heróis na Guerra** (parte 5): as fichas da mesa (as do grupo, os NPCs; não as dos pets) lutam junto — as do
  exército (seção Heróis do exército: `exe.herois`, lista de `{ ficha, b }`, até 12; `b`, o bônus que o mestre
  escreveu, só quando escrito) e as que o mestre põe só numa batalha (na janela, seção Heróis: ficam na batalha, não no
  exército; cada ficha uma vez só). O bônus de cada um: o escrito, senão o sugerido pela ficha (`bonusSugerido`, em
  `mundo/guerra.js`: a média de +1 a cada 5 níveis e de +1 a cada 13 pontos do maior atributo, cada um até +10; as
  contas da ficha como nas Cenas, `TC.rules.resumo`). Somam na Virada da detalhada e na resumida, até +10 por lado
  (`MAX_HEROIS_BONUS`; a comparação ganha a linha "Heróis"). Nos momentos-chave da detalhada, "Ação heroica…": um
  herói da batalha rola um atributo da ficha (`TC.dice.rollFixaMais`, com a fixa da ficha) contra a dificuldade que o
  mestre escreve — passou, +5; passou pelo dobro, +10; falhou, −2 (`resultadoHeroico`; fora do teto), no próprio
  momento (o dado do momento fica; dá para tirar a ação enquanto ele é o último). No depois, "Os heróis": quanto cada um
  perde do HP máximo — quem perde, de 10% a 40%, pelo tamanho; quem vence, de 3% a 10%; empate ou trégua, 5%
  (`feridaDoHeroi`) —, com "Ferir os heróis (no HP da ficha)" (marcado de começo). "Aplicar" grava o HP de cada ficha
  (o `estado` dela, com `TC.rules.aplicarDelta`) e as ações vão para as notas da batalha no histórico; o aviso
  "Desfazer" volta o mapa e o HP das fichas. Fora de uma mesa (sem Fichas), a seção só conta quantos heróis o exército
  tem. Os jogadores não veem os heróis (a projeção do exército não os leva).

### O Mapa-múndi como grand strategy (lote 10)

O mundo não anda sozinho: o sistema calcula, lembra e mostra; quem mexe é o mestre (as contas vêm em prévias, e nada
muda sem "Aplicar", com desfazer). As contas do território ficam em `mundo/reino.js` (`window.MundoReino`, que roda
também no Node) e o que aparece no painel, em `mundo/reino-painel.js` (`window.MundoReinoPainel`).

- **Províncias e sub-regiões** (parte 1): a região de fora é a província; as de dentro dela (o campo "Dentro de") são
  as sub-regiões — os ducados, as prefeituras…, em quantos níveis o mestre quiser. As contas fecham na província; cada
  sub-região mostra a parte dela e pode ter outro dono (a facção dela). Na Seleção, a descrição diz "Província · Aldar"
  ou "Sub-região de Reino de Aldar · Vale", e a seção **Província** (ou **Sub-região**) mostra as sub-regiões de
  dentro, em árvore (com o dono quando é outro; clicar vai até ela), de qual província ela é parte (com o botão que
  volta) e os hexágonos por terreno (`terrenosDaRegiao`: os hexágonos da grade com o centro dentro dela,
  `hexesDaRegiao`, guardados por mapa). A camada **Sub-regiões** (nas camadas, só neste aparelho) mostra ou esconde
  as de dentro (a área, a borda e o nome); o atalho Política mostra as duas.
- **A aba Reinos** (parte 1; era Facções — o id da aba continua `faccoes`): a lista diz as províncias e as
  sub-regiões de cada facção. **A facção dos jogadores** (`f.jog`, uma só: marcar outra tira a primeira, com o aviso)
  são as terras deles; vai na projeção (quem joga vê "vocês" nela). O **Livro do reino** (só o mestre, por enquanto)
  conta, por facção, as províncias, as sub-regiões, os hexágonos (`livroDoReino`: os de cada região ficam com a
  facção dela — a sub-região de outro dono leva os dela; `hexesProprios` tira os das sub-regiões) e os exércitos,
  com as tropas; a linha "Sem dono" junta o resto.
- **Os modos do mapa** (parte 1), na janelinha das camadas (só neste aparelho, guardado com elas em
  `tinycats:mundo:camadas`, campo `modo`): Político (as cores das facções, o de sempre), Terreno (as regiões só com a
  borda e o nome), Clima (cada região com a cor do clima de agora: o mestre conta pela região; quem joga recebe o
  pronto da projeção) e Perigo (pela chance de encontro de cada região, do verde ao vermelho; só o mestre — para quem
  joga, vira o Político). A legenda aparece no canto do mapa (o modo, as cores e o botão "Político", que volta), e o
  botão das camadas ganha o ponto enquanto o modo não é o Político.
- **A economia do mundo** (parte 2; `mapa.eco`, normalizada em `normEco`; só quando há: o mapa de antes fica igual):
  "Ligar a economia…" (na aba Reinos) cria os recursos de começo — Lapros (moeda), Suprimentos (comida), Madeira,
  Pedra, Orith (metal) e Runas (magia) —, a tabela de começo do terreno (pelo papel: planície dá suprimentos, floresta
  madeira, montanha pedra e orith…), os estratos da população (parte 5, abaixo) e os níveis dos assentamentos (Aldeia,
  Vila, Cidade e Metrópole, com 2, 4, 6 e 8 espaços de construção). A janela antes diz o que muda: o recurso que uma
  facção já tinha com o mesmo nome passa a ser o do mundo (o número e o histórico acompanham: `recursosNaFaccao`), e o
  mapa que ainda não contava os dias da semana passa a contar (hoje vira segunda-feira; a semana fecha de domingo
  para segunda). Desligar guarda tudo (`eco.on`). Na seção **Economia do mundo**: os recursos (a cor, o nome — as
  facções acompanham —, o papel — o que ele é para as regras — e tirar: a facção fica com o estoque, como um recurso só
  dela), "+ Recurso" (cada facção ganha o estoque dele), "Produção do terreno…" (uma tabela: um terreno por linha, um
  recurso por coluna, por hexágono e por semana; vírgula vale; negativo gasta) e os níveis (o nome, os espaços,
  "+ Nível" — com a divisão por estrato do último —, tirar — os assentamentos dele ficam sem nível).
- **A produção** (parte 2; `producaoPropria`, `producaoDaRegiao`, `producaoPorFaccao`): a parte própria de uma região
  soma os hexágonos próprios (pelo terreno), os assentamentos dela (os marcadores com assentamento cuja região de mais
  dentro é ela) e o valor do mestre (`r.prod`, "Produção do mestre…", por semana; negativo gasta); a província soma a
  dela e a das sub-regiões; cada facção, a parte própria das regiões dela (a sub-região de outro dono leva a dela). A
  seção Província mostra a produção por semana de cada recurso e de onde vem (o terreno, a população, o do mestre) e os
  assentamentos de dentro. O Livro do reino ganha o que cada facção produz por semana e o estoque (o número de cada
  recurso do mundo nela, em `f.rec`, com o mesmo id; na facção, esses números ficam sem renomear nem tirar).
- **O assentamento** (parte 2; `m.ass = { niv, pop }`): no marcador, a seção Assentamento (com a economia ligada) — o
  nível ("Não é assentamento", ou um dos níveis, com os espaços) e a população (fixa: só muda quando o mestre muda;
  parte 5: por estrato), onde ele fica (a região e a província) e o que produz pela população. Fora das províncias, não
  produz para ninguém.
- **O modo Economia** (parte 2; só o mestre, com a economia ligada): cada região pela produção de um recurso (a parte
  dela), do tom de base à cor do recurso; sem produção dele, só a borda. A legenda tem a escolha do recurso
  (guardada neste aparelho, com o modo) e a escala.
- **Para os jogadores**, a economia, a produção do mestre e os assentamentos não vão na projeção (por enquanto: a
  parte 6 mostra o que for deles).
- **O catálogo de construções** (parte 3; `eco.cons`, normalizado em `normCatalogo`): ligar a economia traz o pronto
  (`catalogoPronto`, pelo papel dos recursos e pelos terrenos e níveis que o mapa tem) — produção (Fazenda, Serraria,
  Pedreira e Mina de Orith em colina ou montanha, Mercado a partir da Vila, Santuário rúnico, que gasta Lapros), defesa
  (Paliçada, Muralha a partir da Cidade, Quartel, que come Suprimentos, Torre de vigia) e cívico (Templo, Taverna,
  Celeiro, Porto na água, Biblioteca) —, cada uma com 3 níveis. Na Economia do mundo, "Mostrar o catálogo" lista as
  construções (os espaços, os níveis, as exigências e o nível 1); "Editar…" abre a janela da construção: o nome, o
  ícone (os das construções do Clã e mais alguns), os espaços (de 0 a 6), o que ela exige (o nível do assentamento,
  outra construção pronta antes e um dos terrenos na região — o que não marcar, não exige) e os níveis (até 5: as
  semanas de obra, a defesa, uma tabela com o custo, o que produz e o que gasta por semana, recurso a recurso, e o
  efeito escrito); "+ Construção" cria uma; tirar uma que algum assentamento tem pergunta antes (as dele saem junto). No
  mapa que ligou a economia antes desta parte, "Pôr o catálogo pronto".
- **As construções no assentamento** (parte 3; `ass.cons = [{ id, t, n, obra }]`): o nível do assentamento dá os
  espaços ("Construções · 2 de 6 espaços"); a obra já ocupa o espaço. "+ Construir…" abre a janela da obra: a
  construção (as que não dão aparecem desligadas, com o motivo: o nível, o terreno, a outra construção, o espaço), as
  semanas, o custo, o que ela faz pronta, quem paga (a dona do lugar, outra facção ou ninguém — de graça) com o estoque
  dele e o que falta (faltando, não começa). Começar paga na hora (`comecarObra`: o estoque da facção, com o motivo no
  histórico dela; sem semanas de obra, fica pronta na hora). Cada construção mostra o nível e o que faz; a obra, as
  semanas que faltam (dá para mudar) e "Terminar a obra" (a parte 4 conta as semanas sozinha, no fechamento da
  semana); "Subir para o nível 2…" (a mesma janela; o nível de agora continua valendo durante a obra); "Cancelar a
  obra…" (devolve o que foi pago a quem pagou; a que não tinha ficado pronta sai); demolir (a obra em andamento
  devolve). As prontas produzem e gastam por semana (`efeitoDasConstrucoes`): entram na parte própria da região do
  assentamento ("construções" e "manutenção", na seção Província), no Livro e no modo Economia.
- **A defesa das construções** (parte 3; `defDoAssentamento`, até 20, só com a economia ligada) soma na fortificação do
  marcador: a seção Fortificação diz quanto, e na batalha ao lado (`fortificacoesPerto`) o assentamento só com a
  Paliçada já protege quem o defende (sem HP: as máquinas de cerco não o danificam).
- **A sede do clã** (parte 3; `ass.cla = { id, prod }`): no assentamento, "Sede de clã" escolhe um dos clãs da página
  Clã (`App.clas`: na mesa, os que o mestre mestra; fora dela, os deste navegador). As construções do clã aparecem com o
  nível e o efeito (não ocupam espaços), e "Produção…" dá a cada uma quanto produz por semana; isso vai para a facção
  ligada ao clã (sem ela, para a dona do lugar: `producaoPorFaccao(m, clas)`), e aparece no Livro do reino.
- **A semana** (parte 4; `eco.sem` = a primeira semana ainda não fechada; o número da semana de um dia é (sem0 + dia) / 7,
  e ela vira de domingo para segunda): na Economia do mundo, a caixa da semana diz se ela está aberta (e quando fecha)
  ou quantas estão para fechar, com "Fechar a semana…". Quando uma mudança do mestre faz o calendário passar de domingo
  para segunda (o "+7 dias", o "Próximo dia"…), a prévia abre sozinha; "Agora não" a deixa para depois. Ligar a
  economia (ou ligar de novo) começa a contar da semana de hoje.
- **A prévia da semana** (`semanaPrevia`, sem mexer no mapa): por facção, uma tabela com o estoque, a produção (a de
  sempre, com as construções e as sedes dos clãs), a manutenção dos exércitos, o que fica (nunca abaixo de zero) e o que
  falta; a manutenção de cada exército; as construções que param. O que a falta traz, cada coisa com a caixa para
  recusar: sem comida, o apoio da facção cai (só com o apoio escrito); sem moeda, as obras dela param (de quem pagou,
  senão da dona do lugar) e a moral de cada exército dela cai; sem outro recurso, as construções dela que gastam dele não
  produzem nem gastam (isso já entra na conta) e a moral dos exércitos que o usam na manutenção cai. As obras andam uma
  semana (a que chega a zero fica pronta; recusar "as obras param" faz andar). "Aplicar a semana" (`aplicarSemana`, um
  passo de Desfazer): os estoques ficam no que sobrou (com o motivo "Semana até…" no histórico de cada facção), o apoio
  e a moral caem, as obras andam e a semana seguinte fica aberta; havendo outra pendente, a prévia dela aparece em
  seguida (uma de cada vez).
- **A manutenção dos exércitos** (`eco.manut` por tipo de tropa, `eco.manut0` para as unidades sem tipo;
  `manutencaoDe`): "Manutenção dos exércitos…" abre a tabela (os tipos de tropa da aba Guerra e "Sem tipo de tropa",
  um recurso por coluna): quanto cada 10 soldados custam por semana, na proporção (25 soldados pagam 2,5 vezes). As sem
  tipo começam em 1 de comida e 1 de moeda; um tipo sem número não paga. **As regras da falta** (`eco.regras`):
  "Regras da falta…" muda quanto o apoio cai (de começo, 10), quanto a moral cai sem moeda (1) ou sem outro recurso
  (1), e se as obras e as construções param.
- **A população por estrato** (parte 5; o mundo é pequeno — as maiores cidades têm uns 90 a 120 moradores —, então a
  população produz por pessoa, com vírgula): os **estratos** (`eco.estr`: o nome, a cor, o que cada pessoa produz ou
  consome por semana e o lembrete) ficam na Economia do mundo ("Estratos da população", fechados de começo: "Mostrar
  os estratos", "Editar…", "+ Estrato", tirar — o estrato com gente pergunta antes, dizendo quantos e onde). Os 9 de
  começo (pelo papel do recurso): Camponeses (Suprimentos +0,6), Artesãos (Madeira +0,2 e Pedra +0,2), Mercadores
  (Lapros +1), Aventureiros (Lapros +0,3 · rumores), Clero e sábios (Runas +0,2 · apoio), Guarda (Suprimentos −0,4 ·
  defesa), Nobreza (Lapros −1 · apoio), Idosos e Crianças (Suprimentos −0,3); o mapa de antes, sem a lista, fica com
  eles (`estratosDeComeco`). No assentamento, a população é **quantas pessoas de cada estrato** (`ass.estr`; `ass.pop`
  é a soma; a população de antes, sem estratos, vira Camponeses): a seção mostra o total, uma barra com a cor de cada
  estrato, a lista e o que produzem; "População…" abre a janela com uma linha por estrato (as pessoas e o que produzem
  por semana, na hora) e o **"Distribuir"**, que enche os campos com a divisão sugerida de um total pelas
  porcentagens do nível (`distribuir`, pelos maiores restos; nada muda até salvar, num passo de Desfazer). A **divisão
  por nível** (`niv.dist`, "Divisão por nível…": uma tabela, um nível por linha, um estrato por coluna, em %; não
  precisa somar 100) começa com uma por nível (a Aldeia com mais camponeses, a Cidade com mais artesãos e
  mercadores). Os efeitos dos estratos são **só lembretes**: a prévia da semana lista, por assentamento, os estratos
  com lembrete ("Vila do Norte (Aldar): Aventureiros (3): rumores · Guarda (6): defesa…"), sem mudar nenhum número.
- **As guildas** (parte 5b; não são clãs: cada cidade tem as suas, sem filiais): no assentamento, a seção ganha
  "Guildas" — cada uma num cartão (o ícone, o nome, "secreta", os membros e de qual estrato, o líder, a influência de −10
  a +10, só para ler, a relação com o grupo de −10 a +10, como a do clã, o que produz e gasta por semana, quantos % vão para a facção, o
  estoque e os serviços), com "Editar…", "Abrir a ficha" (o líder ligado a uma ficha, dentro do site) e tirar (pergunta,
  dizendo o estoque; com Desfazer). "+ Guilda…" abre a janela com a escolha de um modelo do catálogo, que enche os
  campos (`guildaDoModelo`: o que é de cada cidade começa vazio). Os membros vêm de um estrato e não passam das pessoas
  dele na cidade (a janela não deixa salvar); se a população diminuir depois, o cartão avisa, sem mudar nada sozinho.
  O líder: o nome e, numa mesa, uma ficha das Fichas (opcional). Os serviços: uma lista (o tipo — contrato, item ou
  informação —, o nome, o preço em texto e a descrição; "+ Serviço", tirar). **O que a guilda produz** vai, na
  porcentagem escolhida, para a facção dona da cidade (`partesDaGuilda`; na produção da região como "guildas", no
  Livro e na prévia da semana) e o resto fica no estoque da guilda; **o que ela gasta sai do estoque dela** — na
  prévia da semana, "As guildas" diz o que cada uma recebe, o que vai para a facção, o gasto, o estoque que fica e, em
  vermelho, o que falta (o estoque fica em zero); "Aplicar" guarda o estoque. O **catálogo de guildas** (`eco.guildas`,
  na Economia do mundo, fechado de começo) tem os modelos — os 8 prontos (`guildasProntas`: Caçadores, Assassinos e
  Ladrões, secretos e sem dar nada à facção, Mercadores, Magos, Artesãos, Aventureiros e Bardos, com a produção pelo
  papel dos recursos, o estrato de começo e os preços na moeda do mapa) —, "+ Guilda no catálogo", "Editar…" e tirar
  (as guildas das cidades continuam). A economia ligada agora já vem com eles; o mapa de antes fica com o catálogo
  vazio e o botão "Pôr as 8 prontas". As guildas (`ass.guildas`) não vão na projeção (na parte 6, as que não são
  secretas vão prontas, em "dentro").
- **O pente fino** (o que estava duplicado e confundia; as escolhas do mestre): na facção, com a economia ligada, os
  números ficam em duas listas — "Estoque (recursos do mundo)" em cima e "Outros números desta facção" embaixo, com
  "+ Outro número" (que não aceita o nome de um recurso do mundo) e o aviso de que um recurso de todas as facções se
  cria na Economia do mundo; o número só da facção com o nome de um recurso do mundo avisa e oferece "Juntar ao
  estoque…" (`juntarAoMundo`: a janela diz a conta antes; soma no estoque, o histórico vai junto; com Desfazer). A
  **população da facção**, com a economia ligada, é a soma dos assentamentos das regiões dela (`populacaoDaFaccao`; só
  para ler, com a nota; na projeção, `f.pop` vira essa soma — o número à mão fica para a economia desligada). O
  **exército**: "Mantimentos (comida na estrada)" e, com a economia ligada, quanto ele custa à facção por semana (a
  manutenção). O **Clã**: "Cofre do clã" (a aba "Cofre") e "Construções do clã"; no Cofre, o estoque da facção ligada ao
  clã, do Mapa-múndi, só para ler (numa mesa); na cidade, "Construções da cidade" e, na sede, "Construções do clã (da
  página Clã)". Quando **o clã dos jogadores** está ligado a uma facção que não é a marcada como a dos jogadores, a aba
  Reinos avisa e oferece marcá-la (com confirmação e Desfazer). A **relação da guilda** com o grupo vai de −10 a +10. Ao
  escolher o **nível do assentamento**, aparece a sugestão do ícone que combina (Aldeia e Vila: o de Vila; Cidade e
  Metrópole: o de Cidade) — "Usar o ícone" ou "Agora não"; nada muda sozinho.
- **O que os jogadores veem** (parte 6; com a economia ligada). A **facção dos jogadores** vai inteira: na aba Reinos
  deles, o Livro do reino só com a linha deles (as províncias, as sub-regiões, os hexágonos e os exércitos que eles veem;
  o que produz por semana e o estoque — todos os recursos do mundo, sem olhar a caixa "Jogadores veem") e "De onde vem"
  (cada recurso com as fontes: terreno, população, construções com o gasto delas, guildas, sede do clã e outras; a
  manutenção dos exércitos; a produção por província — a que eles não veem, e o que fica fora das províncias, vai
  junto em "Outras terras", sem nome). Tudo vai pronto na projeção (`ecoJ`, de `economiaDosJogadores`, conferido por
  `normEcoJ`; a conta é a mesma do Livro do mestre, com as sedes dos clãs pelos clãs que a página lê — quem mestra
  publica de novo quando só os clãs mudam). Das **outras facções**, a economia não vai: os recursos do mundo delas não
  chegam (nem com a caixa marcada); os outros números de cada uma, a população e o apoio seguem a caixa. No editor da
  facção, a caixa dos recursos do mundo fica travada (marcada na dos jogadores, desmarcada nas outras), com a nota.
  **Cada cidade** ganha a caixa "Os jogadores veem o que tem dentro" (`ass.ver`; sem ela, as da facção dos jogadores
  começam marcadas e as outras, desmarcadas — `verDentro`): a cidade aberta (e que eles veem no mapa) leva `dentro`
  (`dentroParaJogadores`: o nome do nível, a população total, as construções prontas com o nível — sem as obras nem os
  números — e as guildas que não são secretas, com a descrição e os serviços com o preço; sem o líder, os membros, a
  influência e a relação), que quem joga vê ao clicar nela ("O que tem dentro"). Ao **fechar a semana**, a prévia traz
  "Mandar o resumo da semana para o rascunho do Jornal" (marcada; "Ver o resumo" mostra o texto e acompanha o que o
  mestre recusa): `resumoDaSemana` escreve, só da facção dos jogadores, o saldo (quanto cada recurso mudou e com quanto
  fica), as obras prontas nas cidades que eles veem por dentro e o que a falta trouxe (o que foi recusado não entra; o
  exército e a construção que eles não veem ficam sem o nome). Vira uma matéria no rascunho do Jornal (`jornal:rascunho`
  na mesa; fora dela, o deste navegador; sem rascunho, ele começa do jornal publicado, como na página Jornal); o mestre
  revisa e publica lá. O Desfazer da semana tira a matéria, e o Refazer põe de novo.
- **A bandeira própria da facção** (sem clã): no editor da facção (aba Reinos), "Criar a bandeira…" abre o mesmo editor
  do brasão do Clã (`janelaBandeira`) — a forma, a divisão, as duas cores (a paleta do Clã, a cor da facção e "Outra"), o
  símbolo e, numa mesa, uma imagem (reduzida a 480 px, em PNG, e enviada ao banco; fora de uma mesa, só o desenho). A
  janela mexe numa cópia (a prévia mostra; no celular, ela fica presa em cima enquanto rola): "Criar a bandeira" (ou
  "Salvar") vale num passo de Desfazer, com o aviso; "Cancelar" e Esc não mudam nada. A de começo é um estandarte
  partido na cor da facção e no dourado (numa cor clara, no azul-escuro). Ela fica na facção (`f.band`, conferida por
  `normBr`, como a do clã), vai na projeção (os jogadores a veem; a da facção escondida não vai) e aparece onde a do clã
  aparece — no meio das regiões, junto dos grupos, nas zonas e frentes de guerra, na lista e no editor da aba Reinos —
  e também no Livro do reino e na prévia da semana, no lugar da bolinha. Com um clã ligado à facção, vale a do clã
  (`App.brasaoDe`: a do clã que a página lê, a que a projeção trouxe do clã e, por fim, a própria); a própria fica
  guardada e volta quando o clã sai. "Tirar a bandeira" (com Desfazer) tira a própria.
- **A corte** (lote 11, parte 1a; `mundo/corte.js` e `mundo/corte-painel.js`). Uma aba nova, **Corte** (depois de Reinos),
  com os personagens do mundo — os nobres, os governantes, a corte de cada facção — por casa (os sem casa no fim; os
  mortos recolhidos em "Mortos", que continua aberto quando aberto) e um filtro de facção. Para quem mestra, "+
  Personagem", "+ Casa" e "Cargos da corte…". O **cartão do personagem** (uma janela; nada muda até "Criar" ou
  "Salvar"): o nome, o gênero (homem, mulher ou outro), a casa, a facção e o cargo na corte dela, o nascimento e a morte
  pela data do mundo (o ano basta — pode ser negativo —; o mês e o dia, se souber; a idade sai sozinha, hoje ou na
  morte), os pais (até dois; nunca um descendente: ninguém é antepassado de si mesmo), os cônjuges (até quatro; valem
  para os dois lados, e tirar tira dos dois), onde está (uma cidade ou outro marcador, ou um grupo; sem lugar, só na
  lista), a ficha das Fichas (numa mesa; o nome fica o do personagem e "Abrir a ficha" leva a ela), "Os jogadores
  conhecem", o que eles sabem e a nota do mestre; "Tirar da corte…" pergunta antes. A **casa**: o nome, o lema, o
  chefe (um dos membros) e o brasão, feito com o mesmo editor da bandeira (o do Clã); "Tirar a casa…" deixa os membros
  sem casa. Os **cargos da corte** são por facção (os de começo: Conselheiro, Marechal, Tesoureiro, Espião-mestre,
  Sacerdote e Embaixador; renomear, criar, tirar — quem tinha fica sem cargo — e "Voltar aos de começo"). Na cidade e
  no grupo, **"Quem está aqui"** (os vivos; clicar abre o cartão). Tudo fica no mapa (`corte`, conferido por `normCorte`
  e pelas referências do mapa todo), com Desfazer. **Quem joga** vê, na aba Corte e em "Quem está aqui", só os que o
  mestre marcou como conhecidos (a projeção leva só eles, sem a nota nem a ficha; os laços só entre conhecidos; o lugar
  só se eles o veem; a casa com algum conhecido, o chefe só se conhecido), com os laços em texto ("filha de…", "esposa
  de…", "mãe de…"). As abas do painel ficaram um pouco mais juntas, para as sete caberem.
- **A árvore da família** (lote 11, parte 1b). Em cada casa, "Árvore da família…" abre uma janela grande com a árvore
  desenhada (`arvoreDaCasa`, em `mundo/corte.js`): entram os membros da casa e os cônjuges deles; a geração de cada um
  sai dos pais (de cima para baixo), e quem casou com alguém da casa (sem os pais na árvore) fica na geração do cônjuge,
  logo ao lado dele, com a borda tracejada. Os filhos ficam na ordem do meio dos pais, pendurados no meio do casal (ou
  em quem está na árvore); o morto tem a cruz e fica mais apagado; cada caixa mostra o nome e os anos. A árvore rola
  nas duas direções e começa ajustada à janela (até 140%); "−", "+" e "Ajustar" mudam o tamanho. Para quem mestra,
  clicar numa pessoa abre o cartão dela (por cima da árvore) e, ao salvar, a árvore se refaz; quem joga abre a mesma
  árvore só com os conhecidos (é a projeção que chega a eles), sem abrir cartão.
- **Os títulos** (lote 11, parte 2a). No alto da aba Corte, **"Casas | Títulos"**. Em "Títulos", a lista dos títulos
  por reino (o governante no alto de cada um; os sem reino no fim), com o filtro de facção, "+ Título" e "Graus e
  maioridade…". Os **graus** são do mundo, do maior para o menor (os de começo: Império, Reino, Ducado, Condado e
  Baronia, cada um com o nome de quem tem — Imperador/Imperatriz, Rei/Rainha, Duque/Duquesa, Conde/Condessa,
  Barão/Baronesa —, e "outro" opcional; renomear, criar, subir e descer, tirar — o título de um grau que sai fica sem
  grau, com o nome de agora — e "Voltar aos de começo"); a **maioridade** (16 de começo) diz quem é menor de idade. O
  **cartão do título** (uma janela; nada muda até "Criar" ou "Salvar"): o grau (ou nenhum: um nome livre, como
  "Grão-Mestre da Ordem"), a terra (uma região, uma cidade ou outro lugar que pode ter senhor, uma facção — ou nada), o
  "de quê" (vazio: "de" + o nome da terra; escrito: "da Terra Alta"), o reino (de começo, o da terra; não muda sozinho),
  o titular e desde quando (pela data do mundo), o herdeiro escolhido (passa na frente da regra de sucessão), o regente,
  os pretendentes (com o motivo), os titulares de antes (uma pessoa da corte ou só o nome, com os anos), o que os
  jogadores sabem e a nota; uma prévia mostra o nome do título e o de quem tem ("Ducado de Valmor · Ana do Vale:
  Duquesa de Valmor"). No título novo, o grau e o reino seguem a terra escolhida até você mexer neles (a região de
  fora: Ducado; a de dentro: Condado; a cidade: Baronia; a facção: Reino). Trocar o titular põe o de antes nos
  titulares de antes, até hoje (uma caixa, já marcada — desmarque se foi só um engano), e o "desde" vira hoje. Na
  região, na cidade (e nos lugares que podem ter senhor) e na facção (aba Reinos, "Títulos do reino"), os títulos de lá
  e "+ Título desta região…"; quem tem o maior título preso à facção é o **governante** (na linha dela, em Reinos). O
  maior título vai junto do nome nas listas ("Ana do Vale, Duquesa de Valmor"), e o cartão do personagem mostra os
  títulos em que ele aparece (os que tem, de que é herdeiro escolhido, regente ou pretendente). Tirar da corte quem tem
  título deixa o título vago. Tudo fica na corte (`titulos`, `graus`, `maior`, conferidos por `normCorte`), com
  Desfazer. **Quem joga** vê os títulos das terras que vê (a região e a cidade fora da névoa; a facção que não está
  escondida) e os dos personagens conhecidos — a névoa só esconde o lugar: o título vai com o nome pronto; a terra
  escondida pelo mestre e a facção escondida não —, com as pessoas só se conhecidas (o titular, o herdeiro, o regente,
  os pretendentes, os titulares de antes; "sem titular conhecido" quando não) e sem a nota.
- **A sucessão** (lote 11, parte 2b). Cada reino tem a **regra de sucessão** (na facção, aba Reinos: a forma e o
  gênero; de começo, primogenitura, homens e mulheres por igual), e cada título pode ter a sua (no cartão dele, "Regra
  de sucessão"; "A do reino" mostra qual é). As formas: **primogenitura** (os filhos do mais velho para o mais novo,
  cada um com a linha dele — os netos — antes do irmão seguinte; o filho morto passa a vez para os filhos dele),
  **ultimogenitura** (do mais novo), **antiguidade** (os vivos da casa do titular, do mais velho para o mais novo),
  **partilha** (os títulos de quem morreu divididos entre os filhos vivos — o maior com o mais velho) e **"o mestre
  escolhe"**; o gênero: homens e mulheres por igual, homens primeiro, só homens, mulheres primeiro ou só mulheres (no
  "só", a linha só passa por eles). Sem filhos, a linha sobe pela árvore: os pais (vivos, herdam), os irmãos e os
  sobrinhos, os avós, os tios e os primos. O herdeiro escolhido passa na frente. O cartão do título mostra **a linha
  de sucessão** (os próximos, com o laço e a idade), que muda na hora com a regra, o titular e o herdeiro escolhido.
  Quando o mestre marca a **morte** de quem tem títulos (ou é chefe de uma casa) e salva, abre a **prévia da
  sucessão** (`sucessaoDe`): cada título com o herdeiro da regra (para trocar: a linha, "Ninguém" ou outra pessoa), o
  regente quando o herdeiro é menor de idade (de começo, um dos pais dele, vivo), o novo chefe da casa (quem herda o
  maior título, se for da casa; senão, o mais velho dela) e a caixa, desmarcada, para a notícia no rascunho do Jornal.
  "Aplicar" (`aplicarSucessao`) faz tudo num passo de Desfazer (o Jornal junto): o morto vai para os titulares de
  antes (até a data da morte), o herdeiro fica com o título desde ela. "Agora não" deixa os títulos com o morto; depois,
  "Fazer a sucessão…" no cartão do título ou no dele. As regras ficam na corte (`regras`, `titulo.regra`) e são do mestre
  (não vão para os jogadores).
- **As abas em duas fileiras e a diplomacia** (lote 11, parte 3a; `mundo/diplomacia.js` e `mundo/diplomacia-painel.js`).
  As abas do painel agora ficam em **duas fileiras, por assunto** — em cima, o mapa (Seleção, Hoje, Terreno, Mapa);
  embaixo, a política (Reinos, Corte, Diplomacia, Guerra) —, todas à vista e com a letra normal (quem joga vê as dele
  nas mesmas fileiras). A aba nova, **Diplomacia**, tem o filtro de facção e: as **relações** de cada par de facções
  (a mesma relação da aba Reinos, para os dois lados) com a **opinião de cada lado** — "Opinião…" abre os motivos de
  cada um, cada motivo com o valor (de −100 a +100), um prazo opcional e a soma na hora; o vencido continua contando até
  você tirar; os **tratados** (os em vigor, os vencidos e os que ainda não começaram; os encerrados recolhidos), com
  "+ Tratado" e "Tipos de tratado…" (os de começo: Aliança, Paz ou trégua, Comércio e Passagem livre; renomear, criar,
  tirar e "Voltar aos de começo"). O **cartão do tratado**: o tipo, as facções (duas ou mais), o começo e o prazo pela
  data do mundo, "Público", os termos e a nota do mestre; "Encerrar o tratado…" (guarda a data de hoje) e "Reabrir";
  "Tirar…" pergunta antes. Tudo fica no mapa (`dipl`, conferido por `normDipl`), com Desfazer. **Quem joga** vê as
  relações que não são neutras e os tratados públicos entre facções que ele vê (sem a nota); a opinião é do mestre.
- **A vassalagem, o tributo e as trocas na semana** (lote 11, parte 3b). Na aba Diplomacia, "+ Vassalagem": a
  **vassala**, a **suserana**, desde quando e, com a economia, o **tributo** por semana (um recurso e a quantidade).
  Uma suserana por vassala; a que fecharia um círculo (a suserana já é vassala dela, direto ou pela cadeia) não passa.
  A vassalagem aparece na seção "Vassalagem", no par das duas e na aba Reinos ("vassala de …"). O **cartão do tratado**
  ganha as **trocas por semana**: o que uma facção do tratado manda para outra (de um recurso da economia). Na
  **prévia da semana**, o tributo e as trocas entram na conta (a coluna "Trocas"; o que fica já com eles): acontecem
  no fim da semana, com o que sobrou a quem manda — quem não tem tudo manda o que tem (a prévia avisa), e o que chega
  na mesma semana não paga o que sai; cada um tem a caixa (desmarcado, não vai nesta semana; as contas mudam na hora).
  Os **tratados que vencem** na semana aparecem para decidir: "Encerrar" (de começo; acaba no prazo dele), "Renovar
  até" um prazo novo (de começo, um ano depois) ou "Deixar vencido"; os **motivos de opinião que vencem**, para tirar
  (marcados). Tudo vale junto com a semana, num passo de Desfazer (`MundoDiplomacia.fluxosDaSemana`,
  `tratadosQueVencem`, `motivosQueVencem`, `aplicarDecisoes`; `dipl.vassalos` e `tratado.trocas`). Sem a economia, o
  tratado passado do prazo fica "vencido" na lista. **Quem joga** vê a vassalagem (sem o tributo); o tributo e as
  trocas da facção dele vão na economia dele (`ecoJ.trocas`: o Livro do reino, em "De onde vem") e no resumo da semana
  para o Jornal.
- **Os motivos de guerra, a guerra e a paz** (lote 11, parte 3c). Na aba Diplomacia, a seção **Motivos de guerra** (só
  do mestre): os motivos de cada facção contra outra (o texto e "Ainda vale"), por facção, com "+ Motivo de guerra"; as
  **sugestões pelos pretendentes** — quem pretende um título do reino de outra facção vira uma sugestão da facção dele
  contra esse reino ("Usar…" abre o motivo já preenchido; usada, sai da lista). No par de facções, **"Declarar
  guerra…"** abre a prévia: quem declara (e o motivo dele, dos que ainda valem), o que muda (a relação vira Guerra dos
  dois lados; os tratados entre as duas, com os de paz marcados para acabar hoje; o aviso, se uma é vassala da outra) e
  a caixa, desmarcada, da notícia no rascunho do Jornal (com "Ver a notícia"). Em guerra, o par mostra **"Fazer a
  paz…"**: a relação fica Neutra ou Tensão e nasce o tratado de paz (o tipo, o prazo opcional, "Pública", os termos),
  com a notícia. O **tratado novo** também tem a caixa da notícia ("assinaram um tratado de …"). Tudo vale num passo de
  Desfazer (o Jornal junto). Os motivos ficam no mapa (`dipl.motivosGuerra`) e não vão para os jogadores
  (`MundoDiplomacia.sugestoesDeGuerra`, `declararGuerra`, `fazerPaz`, `noticiaGuerra`, `noticiaPaz`, `noticiaTratado`).
- **A aba Intrigas e os segredos** (lote 11, parte 4a; `mundo/intrigas.js` e `mundo/intrigas-painel.js`). A aba nova,
  **Intrigas** (na fileira da política, depois da Diplomacia), tem o filtro de facção e os **segredos**: cada um com o
  texto, de quem é (um personagem, uma casa, uma facção, um título, um tratado, uma região ou um lugar do mapa; ou
  "Ninguém": um segredo do mundo), **quem sabe** (personagens e facções, como etiquetas), "É boato" e "É falso" (só o
  mestre sabe) e a nota. Na lista: o texto, sobre quem, quem sabe e as etiquetas "boato", "falso" e "revelado".
  **"Revelar aos jogadores…"** abre, por cima do cartão, o que eles vão ler (o texto, "boato" e sobre quem — só se eles
  veem o dono, pela projeção) e a caixa, desmarcada, da notícia no rascunho do Jornal (sem o dono que eles não veem);
  "Cancelar" volta ao cartão. **"Esconder dos jogadores"** desfaz a revelação. Tudo fica no mapa (`intr.segredos`,
  conferido por `normIntr`), com Desfazer. **Quem joga** vê, na aba Intrigas dele, os segredos revelados ("boato"; sobre
  quem, se ele vê o dono; sem quem sabe, o falso e a nota) e, nos títulos, a **regra de sucessão** em texto curto
  ("Primogenitura · por igual": a projeção leva a regra que vale para cada título).
- **As intrigas** (lote 11, parte 4b). Na aba Intrigas, acima dos segredos, com **"+ Intriga"**: as abertas (as em
  andamento primeiro, depois as planejadas e as descobertas) e as **encerradas** (concluídas e fracassadas) recolhidas
  em "Encerradas (N)". Na lista: o nome, quem trama, os alvos, os passos feitos ("1 de 2 passos"), o estado e
  "mostrada". O **cartão da intriga** tem o nome, o estado (Planejando, Em andamento, Descoberta, Concluída, Fracassou),
  **quem trama** (personagens, como etiquetas, e a facção por trás), os **alvos** (o tipo — personagem, casa, facção,
  título, região ou lugar do mapa — e qual; "+ Alvo" e o × de cada um), o objetivo, os **passos** (com a caixinha de
  feito; "+ Passo"), os **segredos que ela usa**, quem já sabe, o texto para os jogadores, **"Os jogadores veem"** (só
  com o texto para eles) e a nota. O cartão do segredo diz em que intrigas ele é usado, e tirar um segredo avisa que ele
  sai delas. O filtro de facção vale para quem trama, os alvos e quem sabe. Na **prévia da semana**, as intrigas em
  andamento aparecem só para o mestre, cada uma com a caixa, desmarcada, que a mostra aos jogadores (sem o texto para
  eles, travada; a que eles já veem, só diz); as marcadas passam a ser vistas junto com a semana (o mesmo Desfazer).
  **Quem joga** vê as mostradas: o texto para eles e o estado (o nome, quem trama, os alvos, o objetivo, os passos, os
  segredos, quem sabe e a nota não vão; o filtro de facção, para eles, vale só para os segredos). No mapa:
  `intr.intrigas` (`normIntr`; `MundoIntrigas.intrigasEmAndamento`, `mostrarIntrigas`, `facsDaIntriga`).
- **O dia da campanha** (lote 12, parte 12a; `mundo/campanha.js`, `window.MundoCampanha`). O "Próximo dia" abre a
  janela do dia com cada exército: **o que ele come** (sem a refeição inteira, o dia é de fome: a moral cai 1 e a fome
  tira ATQ), o **reabastecimento** (na terra da facção dele ou de uma aliada — a relação Aliança ou um tratado de
  aliança valendo —, do estoque do recurso de comida da facção: o que falta para a refeição e para o teto de 10 dias,
  1 mantimento por 1 de comida; o estoque vai primeiro para quem vem antes no mapa), a **forragem** (na terra de uma
  facção em guerra com a dele, sem dono ou, para o exército sem facção, em qualquer terra: metade do que ele come; a
  produção de comida da região cai naquela semana, até a dela, na conta da dona) e o **desgaste** (a % das tropas por
  dia: sem comida 2%, em qualquer lugar; em terreno duro 1% e no inverno +1%, só fora das terras da facção e das
  aliadas). Cada um tem a caixa: desmarcar refaz as contas (o estoque vai para quem vem depois); o exército desmarcado
  fica como está; as linhas ficam no lugar (as que podem aparecer já aparecem); aplicar vale num passo de Desfazer (o
  estoque, com o motivo no histórico da facção). Conta o dia que passou (de domingo para segunda, o domingo), e a prévia
  da semana espera o dia da campanha. Na aba Guerra, as **regras da campanha** (o teto, o custo, a forragem, o
  desgaste, os terrenos duros e os meses de inverno — de começo, os da estação do calendário, e a zona do evento
  Inverno rigoroso), com "Voltar às de começo"; no exército, onde ele está e o que vale ali. No mapa: `guerra.regras`
  (`normRegrasCampanha`, `CAMPANHA_PADRAO`) e `guerra.forr` (a forragem por região e semana, que sai ao fechar a
  semana); nada disso vai para os jogadores.
- **A ocupação** (lote 12, parte 12b; `mundo/campanha.js`). A região fica **"ocupada por"** outra facção sem mudar a
  dona: a produção dela (o terreno, a população, as construções, as guildas, a sede do clã sem facção) vai para **quem
  ocupa** (também a forragem que cai na semana), e o exército de quem ocupa está em casa lá; o Livro do reino e a
  população continuam da dona. No mapa, as **listras** na cor de quem ocupa por cima da cor da dona (no modo Político),
  também para os jogadores. No "Próximo dia", a janela do dia traz **a ocupação**: em cada região com exército (a de
  mais dentro), os dias seguidos de uma facção em guerra com a dona **sem defensor** (nenhum exército da dona nem de uma
  aliada dela) e **sem fortificação de pé** dela (o marcador com a fortificação com HP, ou com a defesa das construções
  — a Paliçada, a Muralha —, que outra facção não ocupa: aí a linha diz que primeiro vem o cerco); com os dias das
  regras (3, de começo), a **proposta de ocupar**, marcada; o mesmo para **libertar** a ocupada (a dona ou uma aliada,
  sem as tropas de quem ocupa nem de uma aliada dela). Desmarcada, a linha só esmaece, a proposta não vale e a contagem
  recomeça do zero; o exército desmarcado no dia continua lá (conta). A caixa (desmarcada) põe as notícias no rascunho
  do Jornal, com a prévia só das marcadas; aplicar vale num passo de Desfazer (as notícias juntas). Na região, a seção
  **Ocupação**: quem ocupa e desde quando, a contagem que está correndo, **"Marcar como ocupada…"** (quem ocupa; de
  começo, a primeira em guerra com a dona), **"Anexar…"** (a dona passa a ser quem ocupa) e **"Tirar a ocupação…"**,
  cada um com a confirmação e a notícia (desmarcada); vale só para a região (as de dentro têm a sua). Na aba Guerra, as
  **terras ocupadas** (e as contagens), e nas regras, os dias sem defensor. Na **paz**, as terras ocupadas entre as duas
  facções: cada uma volta para a dona (de começo) ou fica com quem ocupa (anexar), no mesmo passo e na notícia. **Quem
  joga** vê as listras e "Ocupada por … desde …" (de uma facção escondida, "Ocupada desde …", as listras cinza). No mapa:
  `ocup: { fac, d }` na região e no marcador (`normOcup`; `controleDaRegiao`) e `guerra.pres` (a contagem dos dias, que
  não vai para os jogadores).
- **A vida das tropas e a cura** (lote 12, parte 12c). Cada unidade tem o **HP de cada tropa** (1 de começo; as unidades
  de antes, com o HP e o HP máximo separados, começam inteiras com 1 por tropa): o HP da unidade é a soma das tropas, e
  o dano (a batalha, o desgaste do dia) sai dessa soma — as tropas morrem uma a uma, e a que fica ferida conta como viva
  (na força e na comida). A força na batalha são as tropas (a unidade ferida não luta mais pela metade); a comida, por
  tropa. A unidade mostra o HP dela ("2.994 de 3.000 · uma tropa ferida (4 de 10)") e "Curar a ferida". A **cura** só
  recupera a tropa ferida (as que caíram não voltam): no "Próximo dia", cada exército cura a % do HP que falta — a soma
  da **Cura (%)** das unidades de médicos e alquimistas (em qualquer lugar) e a da **Enfermaria** (construção nova: +5%,
  +10%, +15%) da cidade onde ele está (o hexágono dela ou um colado, na terra da facção ou de uma aliada); pelo menos 1
  de HP por dia; a linha da cura tem a caixa. No exército, a cura dali; na cidade, a nota da Enfermaria. O catálogo
  oferece "Pôr as novas do catálogo pronto" nos mapas de antes (a Enfermaria), e o editor de construção tem a cura de
  cada nível. No mapa: `hpT`, `fer` e `cura` na unidade (`hpDaUnidade`, `tropasComHp`) e `cura` no nível da construção
  (`efeitoDasConstrucoes`, `curaDoAssentamento`; `MundoCampanha.enfermariaPerto`).
- **As máquinas de cerco** (lote 12, parte 12d). Os **tipos** ficam na aba Guerra (seção Máquinas de cerco): o nome, o
  dano contra estrutura, o dano contra exército e o acerto (o mínimo no d20 para um tiro acertar as tropas; vazio, não
  atira). Os de começo: Aríete (3 / 0 / não atira), Catapulta (2 / 5 / 11) e Trabuco (4 / 3 / 13); a primeira mudança
  guarda a lista no mapa ("Voltar às de começo" a tira — com tipos criados em uso, pergunta antes), e dá para criar
  outros (até 40) e tirar (em uso, pergunta antes: as máquinas dele saem junto). A **unidade** e a **fortificação** têm
  quantas de cada tipo (o número de antes, "Máquinas de cerco", some). Na **batalha**, as máquinas entram como os magos:
  na Abertura (e na resumida), a raiz da soma do dano contra exército, até +6 — quem defende a fortificação soma as
  dela —, e a tabela dos dois lados mostra as de cada um. Na **muralha**, só no HP, depois da batalha: a soma do dano
  contra estrutura das máquinas de quem ataca (vencendo, o dobro e mais o tamanho da vitória); a DEF da fortificação cai
  com o HP (as máquinas não tiram mais da DEF). No mapa: `guerra.maqs` (`{ id, nome, est, exe, ac }`; sem ela, os de
  começo — `MAQUINAS_PADRAO`, `maquinasDe`) e `maq: { tipo: quantas }` na unidade e na fortificação (`somaDasMaquinas`).
- **O cerco** (lote 12, parte 12e; `mundo/campanha.js`). Um exército a até 1 hexágono de um lugar com fortificação (a do
  marcador ou a defesa das construções) de outra facção — que não seja aliada; sem guerra entre as duas, a janela avisa —
  tem **"Cercar …"** (no exército e no lugar): a janela mostra quem cerca (a facção e as aliadas dela, a até 1 hexágono),
  quem está dentro (o dono do lugar e as aliadas, no mesmo hexágono), a reserva e a muralha, e a notícia para o Jornal
  (desmarcada). A fortificação ganha a **Reserva** (os dias de comida da cidade num cerco: 30 de começo; enche de novo
  quando o cerco acaba) e a **Milícia** (100 tropas de começo: quem defende sem exército dentro). A cada **"Próximo
  dia"**, o cerco tem as linhas dele: as máquinas de fora batem na muralha (a soma do dano contra estrutura); as de
  dentro — as da fortificação e as das unidades de dentro — atiram (um d20 por máquina contra o acerto do tipo; acertando,
  o dano contra exército sai do HP de uma unidade sorteada de quem cerca; o sorteio fica o mesmo enquanto a janela está
  aberta); a reserva cai 1 e alimenta quem está dentro quando os mantimentos acabam (dentro, não se reabastece); o
  desgaste do cerco (1% por dia, nas regras) vale para os dois lados. Desmarcada, cada linha só esmaece. Sem ninguém
  cercando, a linha "o cerco acaba" (marcada; desmarcada, ele espera). A **rendição**: com a comida de dentro no fim (a
  reserva e os mantimentos) e a moral de quem está dentro em 2 ou menos (sem ninguém dentro, basta a reserva acabar), a
  proposta (marcada). **"Assaltar…"** abre a batalha de quem cerca contra quem está dentro, com a fortificação; sem
  ninguém dentro, a milícia vira um exército no lugar ("Milícia de …", pergunta antes) — sem milícia, "Tomar o lugar".
  No depois da batalha: a **queda** (quem cerca venceu quem estava dentro) ou o **socorro** (um exército de fora, do lado
  do dono, venceu quem cerca: o cerco acaba), com a caixa e a notícia. A queda (também a da rendição): o lugar fica
  ocupado por quem cercou, com a região dele (ou volta para a dona, se foi ela — ou uma aliada — quem cercou), e os
  exércitos de dentro saem do mapa. "Levantar o cerco…" o encerra à mão. O lugar cercado tem um anel tracejado na cor de
  quem cerca; a aba Guerra lista os cercos. **Quem joga** vê o anel e "Cercado por … desde …" (de uma facção escondida,
  sem ela; o anel cinza) e, quando a facção deles cerca ou é cercada, a reserva e a muralha. No mapa: `cerco: { fac, d,
  res }` no marcador e `res`/`mil` na fortificação (só quando não são as de começo).

### A Árvore (lote 6)

- **O caminho trancado.** No editor, a chave "Trancado" do nódulo (`n.tranca`) esconde dos jogadores ele e o que só
  se alcança através dele. "Alcançar" segue a regra de cada nódulo, dentro da árvore dele: "e" pede todos os de antes,
  "ou" pede um deles, e quem não tem nenhum antes (a raiz, ou só requisitos de outra árvore) está sempre ao alcance
  (`TC.rules.visiveis(biblioteca, trancasAbertas)`). Um nódulo que pede outro caminho trancado também fica escondido
  até os dois abrirem. Uma tranca dentro de outra só aparece depois da de fora. O pacote dos jogadores
  (`arvore:pacote`) vai só com o que todos alcançam, e a biblioteca do mestre guarda tudo, com a marca. O cadeado
  aparece no desenho do mestre. A dica do nódulo diz para quem o caminho está aberto.
- **"Aberto para…"** (no editor, embaixo da chave): um personagem por linha. Abrir põe uma cópia do ramo nas skills
  do personagem (`skills.ramos[idDoNódulo] = { a: árvore, nodes, defs: { pools, naturezas, usos }, em }`). A cópia
  leva o nódulo e o que vem depois dele, sem passar por outra tranca, tirando o que todos já veem. Ela vai sem a marca
  de trancado e sem senha de escola. Quem escreve os ramos é só o mestre: a gravação do jogador nunca os leva, e o
  Desfazer dele não os volta. A cada gravação do mestre, as cópias acompanham a biblioteca (`sincronizarRamos`):
  mudou o nódulo, a cópia muda; destrancou ou apagou, ela sai. Fechar o caminho tira a cópia. Os nódulos que o
  personagem tinha ali ficam guardados em `alocados`, mas não contam, e voltam se o caminho abrir de novo (o aviso diz
  quantos são, e a aba Skills da ficha mostra "N de ramo trancado"). Abrir e fechar têm Desfazer.
- **A biblioteca de cada personagem** é `TC.rules.bibComRamos(biblioteca, skills)`: a da mesa, só com o que ele
  alcança, mais os nódulos dos ramos que ele consegue alcançar (o resto do ramo fica de fora, e os tipos de ponto e
  de uso só entram com algum nódulo). No mestre, que tem a biblioteca inteira, e no jogador, que tem o pacote, o
  resultado é o mesmo. É dela que saem os bônus na ficha (`bonusDaArvore`) — nas Fichas, nas Cenas, no Acampamento e
  na mesa ao vivo —, o índice das Fichas (aba Skills e "Passivas e Habilidades") e, no modo jogador, a tela da Árvore
  (`bib()`).
- **O aviso só para o dono.** Três segundos depois de abrir (se o mestre desfizer antes, não vai), a Árvore publica
  `{ kind: 'abriu', para, titulo, resumo }` e a casca grava uma linha da mesa ao vivo em segredo, endereçada ao dono
  (`registro.para`, SQL 0015). Ele vê "Só você e o mestre veem"; o mestre, "Só você e <nome> veem", sem "Mostrar à
  mesa". Com a mesa ao vivo fechada, o dono recebe um aviso na tela que leva até ela. Personagem do mestre (ou sem
  dono) não gera aviso.
- **Contas entre chaves** no texto das habilidades (descrição e texto de cada grau): `{FOR*2 + 10}` vira o número do
  personagem (`TC.rules.partesComContas`). As variáveis são as das fórmulas da ficha: FOR, DES, AGI, VIT, CAN, as
  defesas, os derivados, LVL. Os números vêm da ficha dele, com as regras da mesa (`fichas:cfg`) e os bônus da
  árvore, e o arredondamento é o que a mesa manda. Passando o mouse, aparece a conta com os valores
  (`explicarConta`). Sem ficha, ou no editor do mestre, a conta aparece escrita. Isso vale na Árvore, no modo
  jogador (`ArvoreMesa.calcDe`), e na ficha ("Passivas e Habilidades" e a tabela da aba Skills).
- **Custo de uso** por grau (`grau.uso = [{ b: barra, v: quanto }]`, até 4): "+ Custo de uso" no editor, com a lista
  das barras das fichas da mesa. O "quanto" é um número ou uma conta (`CAN/2`; as chaves são tiradas). Ele só
  aparece, e quem usa desconta à mão: "uso: 15 SP · 7 Energia", na Árvore e na ficha. Um grau novo começa com o custo
  do anterior.

### O Jornal (lote 6)

- **Uma página só, sempre a de agora.** O Jornal da mesa (`jornal/`) é a primeira aba. Quem mestra o Jornal (o
  mestre, ou o auxiliar com a aba Jornal liberada) escreve no rascunho (`jornal:rascunho`, só ele vê) e publica
  (`jornal:pub`, a mesa lê): o publicado é a cópia do rascunho com a data do mundo, a hora (`em`) e o número da
  publicação (`n`). Não há edições guardadas nem arquivo: publicar de novo troca a página. Desfazer a publicação volta
  o publicado de antes (e o que cada jogador sabia das cartas dele); se não havia, o documento sai e os jogadores
  voltam a ler "ainda não saiu".
- **O editor**, com a folha ao lado (como os jogadores vão ver), acompanhando enquanto se escreve: o nome no alto (de
  começo, "O Arauto"), a data do mundo (o dia do calendário de um mapa do Mapa-múndi, escolhido pelo mestre —
  `MundoNucleo.textoData(cal, cal.dia)` —, gravada no publicado na hora de publicar), o clima (nove, cada um com o
  ícone, e uma frase), as matérias (a primeira é a manchete; título, texto com `**negrito**` e `_itálico_` — os botões
  N e I envolvem o trecho escolhido —, assinatura e destaque, com a moldura dupla; a ordem pelas setas), os boatos e
  anúncios (notas curtas, que o mestre escreve) e as cartas dos leitores. Cada mudança é um passo de desfazer (o botão
  e Ctrl+Z); tirar uma matéria, nota ou carta avisa com Desfazer. "Como os jogadores verão" mostra o rascunho na
  página inteira; "Publicado", o que está no ar. Fora de uma mesa, o rascunho e o publicado ficam no navegador. A
  lógica (sem tela) é `jornal/nucleo.js`.
- **As cartas.** O jogador escreve ao jornal assinando por um personagem dele ou anônima (`jornal:cartas:<usuário>`:
  dono ele, visível só para quem mestra; o banco deixa o jogador criar só o dele, SQL 0016). Quem mestra vê as que
  chegaram, em ordem de chegada: "Pôr no jornal" (a carta entra no rascunho com a assinatura; ali o texto pode ser
  corrigido) ou "Não publicar" (fica guardada em "Não saíram", de onde ainda pode ir para o jornal). O que aconteceu
  com cada carta vai em `jornal:resp:<usuário>` (quem mestra escreve, com o jogador como dono, para só os dois verem):
  "Saiu no jornal" quando ela é publicada, "Não saiu" quando o mestre recusa; sem nada, "Esperando o mestre" — e,
  enquanto espera, o jogador pode retirá-la.
- **Saiu o Jornal.** Quando sai uma edição que a pessoa ainda não leu (a hora dela, `em`, diferente da guardada no
  aparelho, `tinycats:jornal:visto:<mesa>`), a aba ganha uma bolinha e o Jornal abre para ela — ao entrar na mesa ou
  já dentro dela —, com o aviso "Saiu o Jornal." e "Voltar para <aba>". Se ela está escrevendo (na mesa ao vivo ou
  num campo de um sistema) ou com uma janela aberta, nada abre por cima: fica a bolinha e o aviso com "Ler". Com o
  site em segundo plano, abre quando ela voltar. Para quem mestra o Jornal (é quem publica), nada abre sozinho.
- **Escrever sem ser atrapalhado.** O editor se redesenha por cima (como o painel do Mapa-múndi): o campo em que a
  pessoa escreve não sai do lugar nem perde o que ainda não foi gravado quando chega uma carta, e o clique no campo
  seguinte cai nele.

### A Meditação (lote 6)

- **A cena.** A aba Meditação (`meditacao/`, depois da Árvore) mostra, para todos, o lugar onde os personagens meditam
  e quem está meditando agora. Quem mestra a Meditação (o mestre, ou o auxiliar com a aba liberada) escolhe o ambiente
  — oito desenhados (templo na montanha, montanha, floresta, cachoeira, caverna, jardim, deserto e céu estrelado:
  `meditacao/desenhos.js`) ou uma imagem própria —, a hora (manhã, tarde, pôr do sol, noite e madrugada: as cores da
  cena mudam) e o clima (os do Jornal, caindo por cima da cena). Com a imagem própria, o ambiente escolhido continua
  valendo para as receitas. O lugar fica em `medit:cena` (a mesa lê); quem está meditando, em `medit:quem` (a mesa lê;
  só a função `meditacao_entrar` escreve — assim, o mestre mudar o lugar no mesmo instante em que alguém entra não
  apaga a entrada). Uma cena por mesa (não por campanha). (Lote 7, parte 5c) Com um mapa do Mapa-múndi mostrado aos
  jogadores, quem mestra vê ali o clima de hoje de lá ("Hoje no Mapa-múndi: Chuva", o de onde o grupo está) e "Usar no
  fundo da cena" põe esse clima na cena (é o clima da cena, como se escolhido na lista: o banco o guarda igual).
- **A prática** de cada personagem: objeto, mantra, representação e o panteão (é o campo da ficha, `ficha.panteao`:
  mudar aqui muda nas Fichas — e muda quem pode mudar a ficha). Fica em `medit:pratica:<personagem>`, com o dono do
  personagem como dono: só ele e quem mestra veem. O banco deixa o jogador criar só a de um personagem dele.
- **A imagem meditando (lote 7)** mora na ficha (`ficha.imgMed`, como o panteão: muda quem pode mudar a ficha), e
  por isso todos que veem o personagem a veem: na cena, o personagem inteiro, sem moldura, de pé no chão da cena, com
  a aura em volta do contorno (a mesma imagem, desfocada e clara, por trás) e a luz da hora, de leve — até metade da
  altura da cena sozinho, menor com mais gente. A imagem é guardada com a transparência (WebP, ou PNG no navegador que
  não faz WebP; até 1.400 pixels) e sem as margens vazias em volta. A imagem de antes (`medit:pratica`, `img`), que só
  o dono e o mestre viam, continua no retrato redondo para eles, com um aviso, até ser trocada.
- **Limpar o registro (lote 7).** Quem mestra limpa o registro de um personagem ("Limpar o registro", com a pergunta
  e Desfazer): só as linhas do registro saem — as receitas descobertas e as tentativas ficam.
- **Entrar e sair.** O jogador entra e sai pela aba dele ("Meditar"); quem mestra chama ("Chamar para meditar…",
  vários de uma vez) e tira. Ao entrar, o registro do personagem guarda o lugar, a hora e o clima (e se foi chamado
  pelo mestre).
- **As receitas e os símbolos.** Quem mestra escreve as receitas (`medit:receitas`, só ele vê): um nome, a sequência
  de 2 a 5 símbolos (a ordem importa), o efeito (o que o jogador passa a ver quando acerta), onde vale (em qualquer
  ambiente ou só em um) e para quem (todos ou alguns personagens). A lista avisa quando uma receita não pode ser achada:
  menos de 2 símbolos, um símbolo escondido dos jogadores (ou que não existe mais), a mesma sequência de outra que vem
  antes e também vale. Os símbolos (`medit:simbolos`, a mesa lê) são os prontos, em quatro grupos (elementos, astros,
  animais e espíritos, runas e glifos) — que o mestre pode esconder dos jogadores —, e os dele (nome e desenho, ou uma
  imagem).
- **A tentativa.** O jogador combina os símbolos nos pilares quando está meditando e o mestre liberou uma tentativa
  ("Liberar tentativa", no cartão do personagem; até 5 à frente, e dá para tirar). "Meditar sobre os pilares" vai ao
  banco (`meditacao_tentar`), que confere a combinação nas receitas — o jogador não as lê — e gasta a tentativa: errou,
  "Nada aconteceu."; acertou, "Você descobriu: <receita>", com o efeito, e a receita entra na lista dele (o mestre vê
  a tentativa no cartão e no registro). A receita nova vira um aviso na mesa ao vivo, em segredo, do jogador para o
  mestre da mesa (só os dois veem), na conversa da campanha do personagem. O que a meditação guardou de cada
  personagem — as tentativas liberadas e feitas, as receitas descobertas e o registro — fica em
  `medit:achados:<personagem>`: só o dono e quem mestra leem; quem escreve são as funções (`meditacao_entrar`,
  `meditacao_liberar`, `meditacao_tentar`) e, para corrigir, quem mestra. O jogador não muda as tentativas nem o que
  descobriu (o banco recusa).
- **O treinamento.** Barras que quem mestra cria para cada personagem (o nome e quantos pontos a enchem), enche à mão
  (+ e −) e só ele vê (`medit:treino`). Cheia, a barra mostra "Completa" e quando encheu: a recompensa é com o mestre,
  na história.
- **O personagem que muda de dono** leva junto a prática e o que descobriu: os dois documentos passam a ser do novo
  dono (no banco, o gatilho `personagens_medit_dono`, que vale mesmo quando quem entrega a ficha não mestra a
  Meditação).
- Cada mudança é um passo de desfazer (o botão e Ctrl+Z); entrar, sair, chamar e liberar também se desfazem (a
  tentativa já usada não volta). O painel se redesenha por cima, como o do Jornal: o campo em que se escreve não sai do
  lugar. Fora de uma mesa, tudo fica no navegador, com um personagem de teste, e a página faz o que o banco faria. A
  lógica (sem tela) é `meditacao/nucleo.js`. SQL: `supabase/migrations/0017_meditacao.sql`.

### O Clã (lote 6)

- **Os clãs da mesa.** A aba Clã (`cla/`, depois da Meditação) guarda os clãs da mesa toda (valem em todas as
  campanhas): o clã dos jogadores — eles veem tudo dele — e os de NPC (rivais, aliados), que nascem escondidos. Quem
  mestra o Clã (o mestre, ou o auxiliar com a aba liberada) tem o painel (a vista "Mestre": a lista dos clãs, à
  esquerda, e o clã escolhido) e vê o salão como os jogadores o veem ("O salão"). O clã inteiro fica em `cla:c:<clã>`
  (só quem mestra lê e escreve; o banco recusa deixá-lo para a mesa ler ou dar-lhe um dono).
- **O que os jogadores recebem** (`cla:pub:<clã>`) é o próprio banco que monta, a cada mudança no clã (o gatilho
  `documentos_cla_projetar` e `privado.cla_pub`; ninguém escreve nele direto): o nome, o lema, o brasão, a facção e,
  do clã dos jogadores, todas as partes; de um clã de NPC, só as que o mestre marcou ("O que os jogadores veem…":
  cargos, construções, recursos, respeito no mundo, relações, histórico) — o resto nem chega aos aparelhos deles. O
  respeito de cada membro de um clã de NPC fica sempre com o mestre. As relações com um clã que os jogadores não veem
  ficam de fora (as outras levam o nome e a cor desse clã), e o histórico só fala das partes que vão — quando um clã
  aparece, some ou muda de nome, os clãs que falam dele são montados de novo. A página sozinha faz a mesma conta
  (`projetar`, em `cla/nucleo.js`), e o teste do banco confere que as duas batem.
- **O salão.** O nome e o lema sobre o desenho do salão, com as duas bandeiras do brasão, o respeito no mundo e a
  facção; as abas Hierarquia, Construções, Recursos, Respeito e relações, Histórico (a parte que o mestre não mostrou
  aparece trancada).
- **A hierarquia** é uma árvore de cargos: o líder no alto (uma pessoa só), os cargos logo abaixo lado a lado e os de
  baixo em coluna. Cada cargo tem uma ou mais pessoas — um personagem da mesa (com o nome de agora) ou só um nome — e
  cada pessoa, o seu respeito dentro do clã (de −5 a +5: todos do clã veem, só o mestre muda). Criar, renomear, mover
  (arrastando o cartão — no quarto da esquerda de outro, vai antes dele; no da direita, depois; no meio, para debaixo
  dele — ou pela janela "Mover…"), preencher e apagar (as pessoas saem; os cargos de baixo sobem para o lugar dele).
  **O líder do clã dos jogadores** — o dono do personagem que ocupa o cargo de líder — faz tudo isso nos outros
  cargos, pela função `cla_cargos` do banco, que manda só o que mudou, cargo por cargo, e confere que ele é o líder,
  que o cargo de líder e o respeito de cada um ficam como estavam e que a árvore continua inteira (nem ciclo, nem cargo
  pendurado no nada, ninguém repetido). Passar a liderança é só com o mestre ("Passar a liderança…": alguém do clã,
  outro personagem da mesa ou um nome; o líder de antes vai para um cargo, ou sai do clã). O personagem que muda de
  dono leva a liderança junto (o novo dono passa a ser o líder).
- **Construções**: nome, ícone, nível, o efeito escrito e o próximo nível (o custo, em recursos do clã, e o efeito
  novo, se houver). "Subir de nível" desconta o custo, sobe o nível, põe o efeito novo para valer e deixa o próximo
  nível em branco para o mestre escrever; sem recurso bastante, o botão fica desativado e diz o que falta.
- **Recursos**: uma lista livre (nome e quantidade, de 0 para cima), com − e + (com Shift, de 10 em 10) ou a
  quantidade escrita. **Respeito no mundo**: de −5 a +5, cada nível com um nome. **Relações** com as facções do
  Mapa-múndi e com os outros clãs, também de −5 a +5. **Respeito dos membros**: a lista de todos, com − e +. Cada
  mudança vai para o histórico, com o motivo escrito no campo da parte (o campo esvazia quando o motivo é usado);
  mudanças seguidas na mesma coisa, dentro de um minuto e para o mesmo lado, viram uma linha só (voltando ao que era, a
  linha some). Os nomes dos níveis das três escalas são da mesa toda (`cla:nomes`: "Renomear os níveis").
- **O brasão**: a forma (escudo, redondo, losango, estandarte, flâmula), a divisão (liso, partido, cortado,
  esquartelado, faixa), duas cores e um símbolo (os da Meditação e mais alguns) — ou uma imagem. Aparece nas bandeiras
  do salão, na lista dos clãs e nas relações.
- **A facção** do clã é uma referência opcional a uma facção do Mapa-múndi (a lista vem dos mapas da mesa).
- As mudanças no clã ficam no histórico, sem aviso na mesa ao vivo. Cada mudança é um passo de desfazer (o botão e
  Ctrl+Z); o líder desfaz pela função do banco, se ninguém mexeu nesses cargos depois. O painel se redesenha por cima,
  como o da Meditação. Fora de uma mesa, tudo fica no navegador. A lógica (sem tela) é `cla/nucleo.js`. SQL:
  `supabase/migrations/0018_cla.sql`.

### O mapa-múndi: a grade, o terreno e a viagem

- **A distância é em cubos**, e quem dá a escala é a grade de hexágonos (aba Terreno): `grade.tam` é a distância
  entre os centros de dois hexágonos vizinhos, em unidades do mapa, e um hexágono tem 5 cubos. Sem grade não há
  escala (a régua e a viagem falam em unidades do mapa). A grade se encaixa numa imagem pelo tamanho (à mão ou
  medindo alguns hexágonos dela com a régua), pela orientação (em pé ou deitados) e pelas setas; pode ficar à mostra
  (os jogadores também veem) ou escondida, medindo do mesmo jeito. Um mapa de antes, com a escala em km, ganhou a
  grade da mesma escala, escondida (1 km virou 1 cubo).
- **O terreno**: os tipos ficam no mapa (`terrenos`, cada um com o custo em cubos para atravessar um hexágono; os
  de começo são Planície, Floresta, Colina, Montanha, Pântano, Deserto, Neve e Água) e o de cada hexágono, em
  `hexes` ("q,r" → o tipo, ou [tipo, custo próprio]). O custo de entrar num hexágono é o próprio dele, senão o da
  região que tem custo e cobre o centro dele, senão o do terreno, senão os 5 cubos de um hexágono sem nada. A
  ferramenta Terreno (H) pinta o tipo, tira, dá custo próprio ou tira o custo, de 1, 7 ou 19 hexágonos.
- **A viagem, em tempos de marcha** (lote 6): o dia tem `cal.tpd` tempos de marcha (10 de começo; o mestre muda no
  calendário do mapa), e cada grupo anda os cubos de um tempo (`pt`); o tipo de caminho da rota é só o desenho. "Andar 1
  tempo" leva o grupo pela rota, de hexágono em hexágono, gastando o custo de cada um, e passa um tempo de marcha
  (`cal.tempo`; a cada `tpd` tempos, passa um dia); "Andar 1 dia" anda os tempos que faltam até o fim do dia. É um passo
  de desfazer só (o grupo e o tempo). O calendário continua contando dias: o tempo de marcha de hoje aparece junto dos
  grupos. O que sobra rumo ao próximo hexágono fica guardado no andado (`prog`, em cubos): uma montanha de 20 cubos,
  andando 10 por tempo, leva dois tempos. O grupo de antes (só com os cubos por dia) anda um décimo disso por tempo;
  `cubos` (por dia) continua no grupo, para o site de antes.
- **O tempo para todos (lote 7).** Junto da data, na barra de cima, o tempo de marcha de agora ("4º tempo de 10"; na
  tela estreita, "4/10"). "+1 tempo" (na barra e na aba Hoje) leva todos os grupos com rota um tempo, cada um no seu
  passo, e o relógio avança; o ▶ ("Próximo dia") leva todos o que falta do dia e o relógio vai para o 1º tempo de
  amanhã (`passarTempoMundo`). Sem nenhum grupo andando, só o relógio passa. O ◀, "+7 dias" e "Ir para a data" só mudam
  o calendário (os grupos ficam onde estão). Tudo é um passo de desfazer só. O "Andar" de um grupo continua levando só
  ele (e passando o tempo).
- **Os dias da semana (lote 7, `cal.sem0`).** No calendário do mapa, o mestre escolhe que dia da semana é hoje, e os
  outros seguem (de Segunda-Feira a Domingo, `SEMANA`): `sem0` é o dia da semana do dia 0 do mundo (null = o mapa não
  conta a semana). Aparece junto da data, na barra de cima e na aba Hoje, para todos (`textoDataSemana`).
- **Gerar a cena (lote 7, parte 4b; só dentro do site, só o mestre).** No grupo, "Gerar a cena aqui": a janela "Gerar
  um lugar" das Cenas abre na aba Encontro (no terreno Ruínas, fora do mar e do rio, na aba Ruínas: lote 7, parte
  4b-3) com o terreno do hexágono onde o grupo está (pelo desenho do terreno, para
  valer também nos que o mestre criou: `ENC_DA_TEX` — a lavoura já na plantação, a savana no capim alto; um terreno sem
  desenho vira campo), o caminho da rota (estrada ou trilha; na planície com estrada, o encontro na estrada; numa rota
  de mar, o navio; de rio, o barco), a hora do tempo de agora, o que os eventos de hoje que cobrem o lugar levam para
  a cena (o clima, a hora, as zonas e o chão seco: "Os eventos na viagem e nas cenas", mais abaixo) e o estilo da
  região. Nos marcadores
  de cidade, vila, porto (lote 7, parte 4b-2b), ponte, floresta e montanha e nos das ruínas (lote 7, parte 4b-3:
  ruína, templo, torre e castelo — o forte —, caverna — o círculo de pedras com a boca — e mina; o de masmorra, na aba
  Masmorra: 4b-3c), sem atalho,
  "Gerar este lugar…" (`LUGAR_DO_ICONE`): a aba do lugar (a vila, a cidade, o porto e as ruínas com o terreno do
  hexágono: floresta, areia, neve ou campo), o nome do marcador; o marcador fica
  ligado à cena que vai nascer (`liga: { t: 'cena', id: 'cena_mundo_…' }`, um passo de desfazer) e, se o mestre fechar
  sem criar, o botão do atalho continua "Gerar este lugar…" (com o mesmo id). Criada, o atalho abre a cena.
- **Quando escurece (`cal.ent`, `cal.noi`).** No calendário do mapa, "Entardecer a partir do tempo" e "Noite a
  partir do tempo" (vazio: os de fábrica, `quandoEscurece` — num dia de 10 tempos, o entardecer no 8º e a noite no
  9º; com menos de 4 tempos, não escurece). `horaDoTempo(cal)` dá a hora (dia, entardecer ou noite) das cenas geradas.
- **O estilo das cenas, por região (`r.estilo`).** "Estilo das cenas" na região (`ESTILOS_CENA`: Comum, Oriental,
  Nórdico, Desértico, Élfico, Anão): as cenas geradas lá dentro saem nele; vale a região mais de dentro que tiver um
  (uma sem estilo usa o da de fora). É só do mestre: a projeção tira.
- **Os eventos na viagem e nas cenas (lote 7, parte 5a).** Os 24 tipos novos de evento (`EVENTOS`, de 12 para 36): na
  estrada, Caravana mercante, Peregrinação, Bandidos na estrada, Ponte caída e Migração de monstros; no céu e na terra,
  Eclipse, Chuva de meteoros, Lua de sangue, Tribulação celestial, Seca, Terremoto, Erupção e Inverno rigoroso; na
  política, Torneio das seitas, Coroação ou casamento real, Golpe, Cerco e Leilão de tesouros; no mistério, Assombração,
  Reino secreto aberto, Dragão avistado, Seita ou culto e Caçada a um procurado; e a Colheita farta. Um evento pode
  pesar na viagem (`e.peso: { custo, enc, fecha }`; no painel do evento, "Na viagem"), nos hexágonos com o centro dentro
  dele, enquanto acontece: os cubos a mais para entrar (somam por cima de tudo, até do custo próprio — `hexInfo` dá
  `custo`, `custoBase`, `extra`, `eventos` e `fechado`), os pontos a mais (ou a menos) na chance do "Sortear encontro"
  de um grupo dentro dele (o cartão mostra a conta: "Com os eventos: 10% da região, "Bandidos na estrada" +30% = 40%.")
  e se ele fecha a passagem: ninguém entra nos hexágonos dele, e o grupo para no de antes (`marchar` devolve `parou`) —
  o tempo passa, ele fica parado até o mestre abrir a passagem ou o evento acabar. O evento novo nasce com o peso de
  começo do tipo (`PESO_EVENTO`: a tempestade, +5 cubos; a inundação e a erupção, +10; os bandidos e a migração, +30% de
  encontro; a ponte caída, o terremoto e o cerco fecham a passagem; a colheita farta, −10%…); trocar o tipo leva o do
  tipo novo, e "Voltar ao de começo do tipo" desfaz o que o mestre mudou. Os eventos de antes, sem `peso`, não pesam
  até o mestre ligar "Pesa na viagem". O "+1 tempo" e o ▶ avisam quem parou ("— parado: "Ponte caída" fecha a
  passagem.") e quem entrou num evento que pesa ("— agora dentro de "Tempestade" (+5 cubos por hexágono).": os três
  primeiros; o resto, na aba Hoje), e a aba Hoje lista "Os eventos na viagem": quem está dentro de um evento que pesa e
  quem está parado antes de uma passagem fechada. Na ferramenta Terreno, a dica do hexágono soma os cubos dos eventos e
  diz o que fecha a passagem. O peso é só do mestre: a projeção tira. Para a cena gerada dentro de um evento
  (`CENA_EVENTO`, com ou sem o peso ligado; `cenaNoPonto`): o clima (tempestade, inundação e tribulação: chuva;
  incêndio, erupção e meteoros: cinzas e brasas; inverno: neve; assombração: neblina; magia e reino secreto:
  vaga-lumes), a hora (o eclipse escurece tudo, o breu; a lua de sangue faz noite, se for de dia), as zonas que cobrem
  a cena toda (a Lua de sangue e a Névoa de espíritos, leves e à mostra para todos) e o chão seco da seca (no
  Encontro, o campo, a floresta, a selva e o pântano com o capim seco da savana; o resto do sorteio é o mesmo). Na
  janela "Gerar um lugar", o clima e a hora já vêm escolhidos, e a chave "Com os eventos do Mapa-múndi (os nomes): o
  chão seco e a zona … cobrindo a cena" tira o resto, se o mestre quiser (na masmorra, lá embaixo, os eventos não
  chegam).
- **Os grupos do mundo e o que anda sozinho (lote 7, parte 5b).** Um grupo pode ser de um tipo (`g.tipo`,
  `TIPOS_GRUPO`): Caravana, Patrulha ou Exército — o grupo de sempre (os jogadores, ou quem o mestre quiser) não tem
  tipo. Na ferramenta Grupo, "Tipo"; o do mundo nasce escondido dos jogadores, com a sigla, a cor e o passo de começo do
  tipo (`camposDoTipo`), e no mapa leva o desenho do tipo no lugar da sigla. No painel dele, "Os jogadores veem" (no
  lugar do "Esconder dos jogadores"). A rota, de dois jeitos: "Desenhar a rota" (a ferramenta Rota; a rota desenhada é
  dele, e ele vai para o começo dela — `App.rotaPara`) ou "Traçar entre dois marcadores…" (De e Para; "Ver o caminho"
  mostra a prévia fina no mapa, com os hexágonos, os cubos e quanto leva; nada muda até "Usar esta rota").
  `tracarRota` acha o caminho mais barato pelos hexágonos (o custo de entrar em cada um, com os eventos de hoje), mais
  barato ainda nas estradas (×0,4) e trilhas (×0,7) desenhadas, sem entrar onde um evento fecha a passagem, dentro do
  mapa; a rota guarda só os cantos (onde o caminho muda de direção), que refazem o mesmo caminho. A rota que nasce assim
  (de um grupo do mundo ou de um evento) é escondida (`t.esc` e `oculto`): não aparece no mapa — só fina, com uma seta no
  sentido de agora, quando quem anda nela está selecionado — e não vai para os jogadores. "Ao chegar ao fim" (`modo`):
  para (só ida), volta pelo mesmo caminho (ida e volta: `sentido` −1 na volta, e o caminho é a rota ao contrário) ou
  recomeça (circuito: a rota fechada, do último ponto ao primeiro); o que sobra do tempo segue depois de virar.
  As paradas (`paradas: [{ x, y, n, u, nome }]`, até 30): "Marcar uma parada no mapa" pede um clique na rota
  (`MundoTela.escolherPonto`; Esc cancela) e põe a parada no hexágono dela mais perto (de começo, 1 dia; o mestre muda
  para tempos ou dias e dá um nome — sem nome, vale o do marcador do hexágono). Ao entrar no hexágono de uma parada, o
  grupo fica ali (o resto do tempo se perde) e a espera começa (`espera`, em tempos); acabada, segue no tempo seguinte.
  Com a caravana selecionada, as paradas aparecem como bandeirinhas na rota; o painel diz "Parado em "Feira de Vel":
  falta 1 tempo." e "Voltando pelo mesmo caminho.". Um evento também anda ("Anda pelo mapa": a rota, os cubos por tempo
  e o fim), enquanto acontece, e a área vai junto. O "+1 tempo" e o "Próximo dia" passam o tempo tempo a tempo, numa
  cópia do mapa: os eventos que andam primeiro (mudam o caminho dos grupos), depois os grupos; depois de cada tempo, um
  grupo do mundo que passou a até 1 hexágono de um grupo comum (pelos hexágonos por onde cada um passou:
  `encontrosNoCaminho`) dá o aviso "Caravana de Sal encontrou Os Heróis (no 5º tempo)." — os dois seguem. Tudo num passo
  de desfazer só. A aba Hoje mostra os do mundo em "Pelo mapa" (escondido, onde está, parado, voltando, fora da rota,
  junto de quem). Para os jogadores: o grupo do mundo mostrado vai com o tipo, sem o jeito de andar, as paradas e a
  espera; o evento, sem a rota.
- **O clima do dia (lote 7, parte 5c).** Os climas são os do Jornal e da Meditação (`CLIMAS`: Ensolarado, Nublado,
  Chuva, Tempestade, Neve, Névoa, Ventania, Calor e Frio — o mesmo nome e o mesmo desenho). A tabela do mundo (`clima.tab`,
  aba Mapa, "A tabela do clima") dá a chance de cada um em cada mês do calendário; sem ela, vale a de começo, pela
  estação do mês (`CLIMA_ESTACOES`: o primeiro e o último mês do ano são de inverno, depois primavera, verão e outono —
  `estacaoDoMes`). As chances valem na proporção (somando 100% ou não); um mês sem nenhuma não passa. Uma região ajusta
  clima por clima (`r.clima`, no painel dela, "Ajustar o clima da região…": nunca ×0, menos ×½, mais ×2 + 5 e muito
  mais ×4 + 15 — os dois últimos valem até no mês em que o mundo não tem aquele clima: o deserto tem calor no inverno).
  O sorteio do dia (`climaSorteado`) é um número só para o mapa inteiro, do id do mapa e do dia (`sorteioDoDia`: sai
  igual em todo aparelho e não muda ao repintar), que cada região lê com as chances dela — um dia de tempestade tende a
  ser de tempestade em todo lugar, e no deserto vira calor. O mestre troca o de hoje à mão (no mundo, na aba Hoje:
  `clima.mao = { d, k }`; numa região, no painel dela: `r.chj`), só para aquele dia. Num ponto vale a região mais de
  dentro com ajuste (a de dentro sem ajuste usa a de fora: `regiaoDoClima`), senão o mundo (`climaNoPonto`). Aparece
  junto da data, para todos (clicar abre a aba Hoje, com "O clima de hoje": sorteado ou escolhido, trocar o de hoje, as
  regiões com clima próprio e o atalho para a tabela), no painel da região e nas cenas geradas (sem clima de evento, o
  do dia: chuva e tempestade, chuva; neve, neve; névoa, neblina; os outros, nenhum). Quem joga recebe o de hoje pronto
  (`clima.hoje`, e `ch` nas regiões com ajuste e nos grupos), sem a tabela e sem os ajustes. Com o mapa mostrado aos
  jogadores, o Acampamento e a Meditação leem o de hoje (o de onde o grupo comum está; senão, o do mundo — ver lá).
- **As zonas de perigo (lote 7, parte 5c).** Na ferramenta Frente, "Zona de perigo" e o tipo (`ZONAS`: Tempestade,
  Praga, Frio extremo, Terra amaldiçoada e Território de monstro): uma área desenhada como a de guerra (`k: 'z'` com
  `tipo`; com começo, fim e fases), na cor do tipo, com listras finas e o nome dele. O que um dia dentro dela mexe na
  ficha (`ef: { fad, conf, san }`: a Fadiga em passos da pilha, o Conforto e a Sanidade) vem do tipo (o frio: Fadiga −1,
  Conforto −10) e o mestre muda no painel ("Voltar aos números do tipo" desfaz). No "Próximo dia" (ou num "+1 tempo" que
  vira o dia), o grupo comum que terminou o dia dentro de uma (`zonasNoPonto`, no dia que acabou; várias somam:
  `efeitoDasZonas`) traz a proposta: a janela com a equipe (os personagens dos jogadores da campanha), o antes e o depois
  de cada um (`TC.rules.mexerNaMente`, as mesmas contas do Acampamento e das Cenas), todos marcados — desmarca quem não
  estava junto; "Aplicar" muda as fichas e vai para a mesa ao vivo, com Desfazer (as fichas voltam); "Agora não" deixa
  tudo como está. Sem mesa, só o aviso do que o dia faria. Quem joga vê a zona, sem os números.
- **As bolinhas da travessia** (`MundoNucleo.bolinhas`): quando o próximo hexágono custa mais do que o grupo anda num
  tempo, uma fileira de bolinhas junto do grupo, no mapa — uma por tempo que a travessia pede, cheias as já andadas — e
  no painel do grupo. Quem joga recebe as bolinhas prontas na projeção (`bol: [feitas, total]`), porque os custos são
  do mestre. O mestre ajusta à mão sem passar o tempo do mundo: "− tempo", "+ tempo" e clicar numa bolinha (marca até
  ela; na última cheia, esvazia) — `ajustarMarcha`, com Desfazer.
- **O tamanho do mapa em cubos** (aba Terreno, "Largura do mapa"): a largura em cubos muda o tamanho dos hexágonos
  (cada um continua com 5 cubos); a altura acompanha a imagem. O terreno pintado hexágono por hexágono é refeito na
  grade nova (`regradear`: cada hexágono novo fica com o terreno e o custo próprio do hexágono velho que tem o centro
  dele); os grupos ficam onde estão (o andado passa a ser o do hexágono deles na rota nova); o desenho à mão, as rotas e
  as regiões não mudam. Se o terreno pintado passar do limite de hexágonos do mapa, nada muda e o aviso diz por quê.
- **As regiões de dentro** (lote 6, `r.pai`): uma região pode ficar dentro de outra (o Condado no Reino), em quantos
  níveis precisar. Sem facção própria, ela é da facção da de fora (`facDaRegiao`); a cor dela, se tiver, vale no lugar
  da da facção (para cada Condado se distinguir no Reino). Para o encontro e o custo de viagem, vale a mais de dentro
  (`regioesEm`): o Condado sem custo não usa o do Reino. No painel, "Dentro de" escolhe a de fora (nunca uma que está
  dentro dela) e, quando a região está desenhada dentro de outra sem dizer, aparece a sugestão "Pôr dentro de…" — nada
  muda sozinho. A lista do mapa mostra as regiões em árvore; no mapa, a de dentro tem a borda mais fina, o nome menor e
  fica por cima; o nome da de fora vai para um lugar livre das de dentro. Na projeção, cada região vai com a facção
  que vale para ela.
- **Os terrenos novos** (lote 6): Lavoura, Ruínas, Lava, Cristais, Selva, Savana, Tundra e Terra corrompida, cada
  um com a sua textura (no pincel livre e nos hexágonos). Um mapa novo já vem com os dezesseis; num mapa de antes, a
  aba Terreno oferece "Acrescentar os 8" (`terrenosQueFaltam`: os que o mapa não tem, nem pelo id nem pelo nome,
  cabendo no limite de tipos) — nada muda sozinho.
- **O terreno pintado por hexágono** vai para um canvas entre o desenho à mão e as camadas do mapa. (Lote 7) A tinta é
  a mesma do Pincel livre: a cor e a textura do terreno (`ladrilho`, presa às coordenadas do mapa), cobrindo a imagem
  com a "Força da tinta" (`pintura.alfa`, aba Terreno, a mesma para o desenho à mão e para os hexágonos). Cada tipo de
  terreno vai numa máscara um pouco maior e desfocada (as bordas macias, que se misturam com o vizinho sem fresta); a
  volta de toda a área pintada recorta a tinta com uma borda macia mais curta (por fora, ela não avança sobre os
  hexágonos sem pintura). O desfoque vem do `filter` do canvas; o navegador que não o tem fica com a borda reta. As
  linhas da grade e a tinta são coisas separadas: escondida a grade, só as linhas somem.
- **O desenho em cada hexágono** (lote 6, `grade.des`, ligado de começo): por cima da tinta, a composição do terreno
  (as árvores da floresta, os picos da montanha, as fileiras da lavoura, as rachaduras da lava…), variada de um
  hexágono para outro: a semente é o lugar do hexágono, então o mesmo sai sempre igual, para o mestre e para quem
  joga. Não são carimbos (não contam como objetos). Desligado ("Desenho em cada hexágono", aba Terreno), só a tinta.
  O canvas é desenhado na resolução da tela (`pintarHexVista`): só a parte à vista do terreno pintado, com uma margem
  de um quarto da tela para cada lado, refeita quando o zoom para ou quando a vista sai do que já foi desenhado —
  nítido em qualquer zoom (com um teto de pixels; a tela muito densa conta como 2). De longe, com os hexágonos miúdos
  na tela (menos de 12 px), fica só a tinta, com a textura. (Lote 8) De perto, com o desenho em cada hexágono, a
  tinta fica lisa (`texturaHex(…, liso)`: só a cor e as manchas do `ladrilho`) — os desenhos da textura, de outro
  tamanho, ficavam por cima dos de cada hexágono. Com o desenho em cada hexágono desligado, a textura fica em qualquer
  zoom (`hexCv.dataset.liso` diz qual foi desenhada).
- **A honra dos grupos** (lote 6, `g.estilo`, `g.honra`, `g.hhist`): de −5 a +5, com um selo junto do token no estilo
  escolhido (elmo medieval, kabuto, katana, turbante, coroa, escudo com brasão, cajado de mago, máscara tribal; sem
  estilo, o grupo não mostra honra). Positiva: o corpo vai do bronze ao ouro, com o aro dourado (mais grosso quanto
  maior), os louros (+3 de um lado; +4 e +5 dos dois) e os raios (+5); negativa: cada vez mais escuro, rachado (de −2
  em diante) e lascado (−4 e −5). No painel do grupo, − e + e o motivo (opcional): cada mudança vai para o histórico
  com a data do mundo e o motivo (`mudarHonra`; as últimas 100), que todos veem — o mestre corrige o motivo de uma
  linha ou a tira (a honra não muda).
- **O painel das facções** (lote 6, `f.rec`, `f.pop`, `f.apoio`, `f.ver`, `f.hist`): recursos (uma lista livre: nome e
  número), população e apoio geral (%). Cada mudança nos números entra sozinha no histórico (`facMudar`,
  `facNovoRecurso`, `facTirarRecurso`): a data do mundo, o motivo escrito no painel e o que mudou (`[campo, nome, de,
  para]`); no mesmo dia e com o mesmo motivo, as mudanças juntam numa linha só (e a que volta ao que era sai dela).
  Tudo começa só com o mestre: a caixa "Jogadores veem" de cada recurso, da população, do apoio e do histórico mostra
  aquilo a eles — na projeção vão só os recursos marcados e, do histórico, só as mudanças do que eles veem (a linha que
  fica vazia não vai).
- **Para os jogadores** vão a grade, os tipos de terreno e o terreno dos hexágonos que a névoa não cobre — sem os
  custos próprios (de hexágono e de região), que são do mestre.

### O mapa-múndi desenhado

- **O desenho à mão do terreno** (ferramenta Terreno, "Pincel livre"; não precisa de grade): pinceladas em ordem em
  `pintura.ops` (`{ t: terreno | '' = borracha, r, pts }`, em pontos inteiros), desenhadas num `<canvas>` entre a
  imagem e o SVG, com a textura do terreno (`terrenos[].tex`) e a borda macia; a borracha tira o que estava pintado.
  `pintura.alfa` é a força do desenho por cima da imagem. Com a grade, cada hexágono fica com o terreno da última
  pincelada que cobre o centro dele (`terrenoPintado`); o que se pinta por hexágono vale mais, e `'-'` no hexágono
  quer dizer "sem terreno" mesmo com o desenho por baixo ("Seguir o desenho" tira a correção). Limites: 4000
  pinceladas e 60 000 pontos (o documento do mapa tem tamanho máximo). O desenho vai inteiro para os jogadores: é a
  arte do mapa, como a imagem, e a névoa o cobre na tela.
- **A ferramenta Desenho (P)**: carimbos (`k: 'c'`, arte própria em `CARIMBOS`, do tamanho escolhido na tela; um
  clique põe um, arrastar espalha vários num passo de desfazer), textos livres (`k: 'x'`, o texto é o nome; letra,
  tamanho, giro, espaço entre as letras e cor) e linhas (`k: 'l'`: o rio engrossa da nascente, o primeiro ponto, até a
  foz, com uma ondulação que só depende do id; a estrada é tracejada e a trilha, pontilhada; todas suaves, passando
  pelos pontos, com o nome ao longo). Carimbos e textos sob a névoa e linhas todas cobertas não vão para os jogadores.
  O nome da linha é refeito a cada zoom (`ajustarNomeLinha`), com o contorno no estilo da própria letra: como
  atributo, a regra geral `svg text` do CSS passava por cima, e de perto o contorno engolia as letras. (A cor da
  letra também vai no estilo, pelo mesmo motivo.)
- **Os nomes do mapa** (lote 6: marcadores, grupos, eventos, regiões, estradas, rios e linhas de viagem): letra Cinzel
  (`--mapa`), clara, com um contorno escuro grosso — nos dois temas, para ler sobre qualquer imagem. O nome de uma
  linha leva um toque da cor dela. Os textos livres continuam com a letra escolhida; as siglas dos grupos e a régua,
  com a letra do site.
- **O desenho dos eventos** (lote 7, parte 5a, `arteEvento`): cada tipo novo tem a sua arte dentro da área, sorteada
  pelo id do evento (sempre a mesma): os meteoros riscando o céu, os raios da tribulação, a neve caindo, a fumaça da
  erupção, os espíritos da assombração, a lua de sangue e o eclipse respirando, o caminho da caravana correndo, o dragão
  passando, as rachaduras da seca e do terremoto, o X da ponte caída, as tendas do cerco… Os que se mexem têm uma
  animação leve, que só o navegador faz (nada é gravado). Fica parado enquanto o mapa se mexe, com mais de 120 peças
  animadas na tela, no evento fora da data, para quem pede menos movimento no aparelho e quando o mestre desliga
  "Animar os eventos (neste aparelho)" na aba Hoje (lembrado só neste navegador).
- **A ordem das camadas** (de baixo para cima): hexágonos, regiões, linhas, carimbos, zonas de guerra, os nomes das
  regiões (`c-nreg`), textos, frentes, rotas, eventos, marcadores, névoa, grupos. A área da região fica por baixo das
  estradas, dos rios e dos carimbos; o nome dela, por cima.
- **A zona de guerra** (ferramenta Frente → "Zona de guerra", `k: 'z'`): a área das duas facções, em listras nas
  cores delas, com começo e fim (como o evento); pulsa enquanto acontece. As fases (`fases: [{ dia, pts }]`) mudam a
  forma com o tempo: vale a da última fase que já começou; "Mudar a forma a partir de hoje" cria uma, e as alças do
  mapa mexem na forma do dia que está na tela. Os jogadores só recebem a zona ativa, com a forma de hoje — sem as
  fases que vêm, sem o fim planejado e sem facção escondida.

### O acampamento

- **O clima do Mapa-múndi (lote 7, parte 5c).** Com um mapa mostrado aos jogadores, o mestre vê em "A cena" o clima de
  hoje de lá ("Hoje no Mapa-múndi: Chuva" — o de onde o grupo comum está; senão, o do mundo: `climaDoMundo`, lendo
  `mundo:indice` e a projeção `mundo:pub:<id>`) e "Usar na cena" põe no desenho o clima daqui que mais se parece
  (`CLIMA_MUNDO`). No descanso longo, a noite nesse clima vem como proposta, marcada: "A noite de chuva no Mapa-múndi:
  Conforto −5" (`CLIMA_MUNDO[k].conf`: chuva, ventania e calor −5; tempestade, neve e frio −10; os outros, nada) soma no
  Conforto de quem descansa (`planejar(…, { clima })`), aparece na prévia e no resumo ("noite de chuva"); desmarcada, a
  noite não conta. O descanso curto não é a noite.
- **As rações.** Cada descanso serve uma provisão (o mestre escolhe em Provisões, e pode trocar na hora do
  descanso, junto com quantas rações cada um come). A fila das rações é a servida primeiro e depois a lista, de cima
  para baixo; as porções saem dela em rodízio, na ordem da roda — uma ração para cada um, depois mais uma para cada…
  —, e assim a comida da frente se espalha por todos enquanto houver uma para cada (antes, com 10 rações por pessoa,
  o primeiro da roda comia sozinho as 10 de cima). Quem come uma ração com efeito ganha o efeito dela — servida ou
  não; quem come duas diferentes ganha os dois, cada tipo uma vez. A provisão de **banquete** (`todos`) dá o efeito a
  todos que descansam quando pelo menos uma ração dela é comida. Rações a mais ou a menos da estrutura (a cozinha, o
  caçador) são do acampamento inteiro: não mudam quem come o quê.
- **O que vai para a ficha** (da ração que se come, ou de uma melhoria ou equipamento no descanso longo): um bônus em
  `estado.tmp` — até o próximo descanso (`ate: 'descanso'`) ou por rodadas (`r`, que se desconta na ficha; com 0
  para de somar) —, uma barra que recupera (um número, ou dados rolados quando o descanso acontece, a partir do valor
  da barra depois do descanso e dentro dos limites dela) ou sobrevida em `estado.sob` (não soma com a que o
  personagem já tem: fica a maior). Todo descanso, curto ou longo, tira de quem descansa os bônus "até o próximo
  descanso", venham de onde vierem. O Desfazer devolve as fichas como estavam. Sem mesa, o descanso não muda as
  fichas: a prévia mostra o que aplicar.
- **Só para alguns.** Uma melhoria ou um equipamento vale para todos ou só para os personagens e os grupos (das
  fichas) escolhidos.
- **Mexer em todos (lote 7).** "Mexer em todos…" (no Acampamento, quem está no acampamento; nas Cenas, os tokens
  selecionados, em "Fadiga, Conforto e Sanidade…") muda de uma vez a Fadiga (em passos da pilha), o Conforto e a
  Sanidade (de 0 a 100) de várias fichas, para menos ou para mais. Vêm marcados os personagens dos jogadores (dá para
  desmarcar e marcar os outros); a lista mostra o antes e o depois de cada um; o que a ficha não usa fica como está e
  os valores param nos limites; o motivo vai para a mesa ao vivo. As contas são de `TC.rules.mexerNaMente`. Um passo de
  desfazer, que volta só as chaves que mudaram em cada ficha (o resto, como está agora).
- **A aura.** A emoção de cada personagem fica na ficha (`estado.emo`): quem muda é o dono e quem mestra as Fichas. O
  programa do mestre a copia para a roda do acampamento (`roda[].emo`), que é como ela chega a quem não vê a ficha.
- **A caravana** fica no documento do acampamento (`caravana`): os veículos e animais (tipo, quanto levam, estado), a
  carga (quantos, o peso de cada um, em que veículo vai), quem viaja junto sem ficha e onde vai cada personagem
  (`vai`). Os veículos e animais aparecem desenhados na fogueira (`verCaravana`: dá para esconder); o barco fica no
  mar quando o acampamento é na beira-mar e, em terra, numa carreta.
- **Quanto cada um come** (`comer`): por raça (o campo "Raça / classe" da ficha, sem diferença de maiúsculas e
  acentos) e por personagem, que vale mais que a raça; sem nada anotado, a regra. Vale para o descanso longo
  (`N.quantoCome`); na hora do descanso, o mestre ainda muda pessoa por pessoa, só para aquele descanso
  (`planejar(..., { porPessoa })`), e cada linha do plano diz quanto a pessoa ia comer (`quer`).
- **As áreas e as construções.** O acampamento tem quatro áreas, em abas acima da cena: a Fogueira, as Oficinas, o
  Convívio e a Guarda e Cuidado. Cada um está numa (`area`: sem nada anotado, a fogueira) — é assim que os suportes
  ficam trabalhando nas oficinas, por exemplo. As construções são melhorias de um tipo do catálogo (`N.ESTRUTURAS`:
  a forja, a bancada de alquimista, o canto do bardo, a paliçada, a enfermaria…): cada tipo tem uma categoria
  (Ofícios, Convívio, Proteção, Cuidado e estudo), a área onde é desenhado e três níveis — simples, boa, excelente —,
  e o que cada nível faz fica na própria melhoria (`nv: [{ ef, fx }]`; o `ef` e o `fx` dela são sempre os do nível em
  que está, e por isso o resto do acampamento continua contando como antes). O desenho é de `desenhos.js`
  (`AcampDesenhos.cena`): o lugar, a área em vista, as construções de pé nela (lado a lado, maiores quando são
  poucas) e, na fogueira, a caravana. A imagem de fundo do mestre, quando há, é a da fogueira.
- **O lugar e o clima** (`lugar`, `clima`): floresta, montanha, deserto, neve, beira-mar ou caverna mudam o desenho;
  chuva, tempestade, neve, neblina e ventania passam por cima da cena (só enfeite: os cliques passam; quem pede menos
  movimento no aparelho vê tudo parado).
- **As linhas de relação.** Escolhendo alguém na cena, uma linha tracejada vai até cada um da mesma área com quem há
  relação; a metade de perto de cada pessoa é o que ela sente pela outra — verde gosta, vermelho não gosta, rosa é
  romance —, com o número. Quem mestra vê tudo, até o que está escondido; os jogadores, só o que está aberto, nas
  fichas que veem.
- **A Sanidade e o Conforto pelo mestre**, no cartão de cada um (aba Grupo): de 1 em 1 ou digitando; ficam na ficha, e
  o desfazer volta só aquela barra. **O momento** entre dois personagens mexe no Relacionamento de cada um pelo
  outro, nos corações do romance, na Sanidade e no Conforto de cada um e na emoção (a aura) com que cada um sai — numa
  tabela com a prévia, e com um passo só de desfazer.
- **O jogador com o acampamento.** No menu da mesa, em "Permissões…", o mestre deixa um jogador mexer no acampamento
  (`mesa_membros.acamp`, mudado só por `acamp_do_jogador`). Ele muda as provisões, a estrutura, a caravana, os
  lugares e as áreas e o diário; o descanso, as regras, os momentos, quem está no acampamento, o nome, a hora, os
  bônus, o lugar e o clima continuam com quem mestra (`N.SO_MESTRE`). O banco confere: a regra de escrita dos
  documentos aceita a gravação dele no acampamento da mesa ou de uma campanha de que ele participa
  (`privado.edita_acamp`), e o gatilho `privado.acamp_guarda` recusa a que mude alguma parte do mestre. A tela dele
  grava só as partes dele, com as do mestre exatamente como estão no banco (`N.paraJogador`). Criar o acampamento
  continua sendo de quem mestra.
- **Dois mexendo ao mesmo tempo.** O acampamento é gravado conferindo a versão (como as cenas): se o mestre e o jogador
  gravam no mesmo instante, a casca junta as duas mudanças em vez de pôr uma por cima da outra. O desfazer volta só o
  que aquele passo mudou, por cima do que está lá agora (a junta em três vias da casca): o que outra pessoa mexeu
  nesse meio-tempo fica.

### O programa das Cenas do mestre

Quem aplica na cena o que os jogadores fazem (os "pedidos"), escreve o que eles veem (a projeção) e acerta as barras
dos tokens pelas fichas é o programa das Cenas do mestre. Com a mesa aberta, ele roda em qualquer aba do site: se o
mestre está nas Fichas, a casca abre as Cenas em segundo plano (escondidas), um instante depois — desde que a mesa
já tenha cenas; numa mesa sem cenas nada abre sozinho, e nada é criado.

- **Ao abrir a mesa**, os tokens ligados a fichas são acertados pelas fichas como estão agora: o que mudou nelas com
  as Cenas fechadas (uma poção usada pela ficha, um HP corrigido) aparece nos tokens. O mesmo quando uma cena entra
  no ar.
- **Só um aparelho do mestre transmite** a cena que está no ar (ver `07d-nuvem.js`). Quem abre a mesa passa a
  transmitir — com duas exceções: outra aba deste mesmo navegador, aberta e viva, continua com a transmissão; e uma
  página aberta **em segundo plano** não toma a transmissão de outro aparelho: só acompanha, e assume se os pedidos
  dos jogadores ficarem sem resposta, ou quando o mestre vier para as Cenas nela. Se quem transmitia era uma página
  deste mesmo navegador que já não existe (o mestre recarregou), a página nova assume na hora — cada navegador
  anota os códigos das páginas que abriu (`tinycats:cenas:paginas:<mesa>`).

### O que o mestre guarda só para ele

Três coisas da ficha podem ficar escondidas dos jogadores, e nenhuma delas chega ao aparelho de quem não é o mestre
(não é a tela que deixa de mostrar: o banco não entrega):

- **O valor de um relacionamento.** A linha fica na ficha só com o nome (`oc`); o número e a trilha de romance ficam
  em `fichas:segredos`. O jogador vê que o relacionamento existe, sem saber quanto.
- **O que um NPC sente.** Os relacionamentos de uma ficha sem dono ficam inteiros em `fichas:segredos` — mesmo que a
  ficha esteja aberta a todos. (Os que já estavam na ficha no formato antigo passam para lá na primeira mudança; e
  na hora em que o mestre abre as fichas, se a ficha está — ou fica — aberta a todos.)
- **Uma missão que o mestre ainda não revelou.** Toda missão criada por ele nasce escondida, em `fichas:segredos`;
  "Revelar" a passa para `fichas:missoes` (do grupo) ou para o `estado` da ficha (de um personagem). O jogador cria as
  dele direto na própria ficha, e só nessas ele mexe.

### O mestre auxiliar

No banco, quem é quem está em `mesa_membros`: o **cargo** (`papel`: `mestre`, `auxiliar`, `jogador`), o modo do
auxiliar (`jogando`) e as abas dele (`abas`). Três perguntas decidem tudo, e são funções do banco:

- `privado.e_mestre(mesa)` — é O mestre: administra (renomear, código de convite, tirar gente, nomear auxiliares).
- `privado.mestrando(mesa)` — o mestre, ou o auxiliar que não está jogando: rola em segredo, mexe na linha dos outros
  na mesa ao vivo, envia imagens para a pasta da mesa e mexe nas fichas que os jogadores veem.
- `privado.mestra(mesa, aba)` — o mestre, ou o auxiliar mestrando com a aba liberada. Cada documento é de uma aba,
  pelo nome (`cena:`/`cenas:` → Cenas, `mundo:` → Mapa-múndi, `acampamento` → Acampamento, `fichas:` → Fichas,
  `arvore:` → Árvore, `rol:` → Rolador, `jornal:` → Jornal, `medit:` → Meditação, `cla:` → Clã): só quem mestra a aba recebe e grava os documentos de
  mestre dela. As fichas
  escondidas (e trocar dono, visibilidade ou apagar uma ficha) são da aba Fichas.

Quem nomeia é o mestre (`definir_auxiliar`); quem alterna entre mestrar e jogar é o próprio auxiliar
(`auxiliar_jogar`). Ninguém muda o próprio papel direto na tabela.

No site, o núcleo guarda de cada participante o `cargo` e o `papel` — o que a pessoa está fazendo agora: o auxiliar
mestrando conta como `mestre`; jogando, como `jogador`. A casca entrega a cada sistema o papel de quem usa **naquela
aba** (`TC.ponte.estado.papel`) e o que ele mestra, aba por aba (`TC.ponte.mestra(aba)`): um sistema não precisa
saber que existe auxiliar, a não ser quando mexe no que é de outra aba. Os casos em que isso acontece:

- **A biblioteca das árvores** (`arvore:biblioteca`) só chega a quem mestra a Árvore; os outros usam o pacote
  publicado (`arvore:pacote`), como os jogadores.
- **Os segredos das fichas** (`fichas:segredos`) só chegam a quem mestra as Fichas. O Acampamento, sem ela, não os
  lê nem grava — e o "Momento", que mexe nos relacionamentos, fica de fora.
- **Token ligado a uma ficha escondida**, nas Cenas, para quem não mestra as Fichas: o token está na cena (com as
  barras dele), a ficha não chega. O dano e a cura dados ali vão para a ficha "às cegas" (`barras_do_token`: só o
  valor atual e a sobrevida das barras que a ficha tem, sem devolver nada dela) — sem isso seriam desfeitos quando o
  aparelho do mestre acertasse o token pela ficha.

O personagem e os tokens do auxiliar continuam dele quando ele mestra: ele aparece em "Jogador que controla" e
como dono do token. Só a defesa é que não é pedida a ele enquanto mestra (quem mestra rola pelo token).

Quando o papel de alguém muda com a mesa aberta (nomeado, abas trocadas, devolvido a jogador, ou alternando entre
mestrar e jogar), o aparelho dele percebe, abre a mesa de novo e recarrega os sistemas — o que ele pode ver é outro.

### As campanhas

A mesa é um mundo aberto, com vários grupos jogando — e gerações: a de um personagem é uma campanha, a seguinte é
outra. **De que campanha é cada coisa** fica na linha dela, no banco:

| O quê | Onde fica a campanha | Como passa de uma para outra |
|---|---|---|
| Ficha | `personagens.campanha` | Pelos **grupos**: a campanha é dona dos grupos; "⇄" no grupo o passa inteiro para outra campanha (ou para o mundo), e arrastar uma ficha para um grupo de outra campanha a leva junto. |
| Conversa e rolagens | `registro.campanha` | Não passa: cada linha fica na campanha em que foi dita (a que estava em vista). |
| Acampamento, missões do grupo, ordem dos grupos | No nome do documento: `acampamento@<campanha>`, `fichas:missoes@<campanha>`, `fichas:grupos@<campanha>` (as missões do grupo que o mestre ainda esconde: `fichas:segredos`, em `mis.gc.<campanha>`) | Cada campanha tem o seu. |
| Cena | `documentos.campanhas` de `cena:<id>:m` e `:v` (uma campanha, ou nenhuma) | "Campanha desta cena…", no menu das cenas. A projeção da cena que está no ar (`cena:pub:*`) leva a campanha dela: só os jogadores dessa campanha a recebem. |
| Mapa | `documentos.campanhas` de `mundo:mapa:<id>` e de `mundo:pub:<id>` (uma **ou mais**) | "Campanhas deste mapa…", no menu de mapas. Para cada geração ter a sua versão do mapa, duplica-se o mapa. |

O que não tem campanha é **do mundo** e aparece em todas: um mercador, um mapa do continente, um aviso geral. As
árvores de habilidade, as tabelas base das fichas, os históricos do Rolador e o auditor dos dados são da mesa inteira.

**Quem vê o quê** é o banco que decide (`privado.ve_campanha`, `privado.ve_campanhas`): o jogador recebe o que é do
mundo e o que é das campanhas de que participa (`campanha_membros`) — a ficha dele, sempre. Quem mestra (o mestre, e
o auxiliar enquanto mestra) recebe tudo. O jogador não fica sabendo das campanhas de que não participa; quem não
está em nenhuma sabe só que elas existem (`mesas.campanhas`) e vê o que é do mundo.

**Só o mestre da mesa organiza**, por funções do banco que conferem isso: `campanha_criar`, `campanha_mudar`
(renomear, encerrar, reabrir), `campanha_ordenar`, `campanha_participa`, `campanha_apagar` e `campanha_desfazer`.
**Passar uma ficha (ou um grupo), uma cena ou um mapa de uma campanha para outra** também é organizar: só o mestre
da mesa (`privado.tocar` recusa a mudança de campanha de quem não é ele). O mestre auxiliar mestra **dentro** das
campanhas que existem — cria ficha, cena e mapa na campanha em vista, mexe em tudo o que as abas dele alcançam —, e
as telas dele não oferecem o "⇄" dos grupos, "Campanha desta cena…" nem "Campanhas deste mapa…". A projeção (o que
os jogadores recebem da cena no ar e de cada mapa) acompanha a campanha da cena ou do mapa, e quem a regrava é o
aparelho que transmite, seja de quem for.

- **A primeira campanha recebe o que a mesa já tinha** (`campanha_criar` com `p_adotar`): as fichas, a conversa, o
  acampamento, as missões do grupo, as cenas e os mapas passam para ela, e quem já jogava passa a participar. Antes,
  a casca mostra a lista do que vai passar, e só passa depois do OK. Enquanto ela é a única, "Desfazer as
  campanhas…" (`campanha_desfazer`) devolve tudo à mesa inteira — com mais de uma isso mostraria a uns o que é dos
  outros, e por isso não vale. As outras campanhas nascem vazias.
- **Campanha encerrada** fica guardada, só para consulta: a conversa, as fichas, o acampamento e as missões do grupo
  dela não mudam mais, para ninguém — o mestre também — até ele reabrir. O banco recusa (`privado.campanha_aberta`);
  o núcleo nem tenta (devolve a linha como estava, com um aviso); e as telas dizem o porquê. As cenas e os mapas dela
  continuam com o mestre: são o preparo dele.
- **Apagar** só vale para a campanha que não guarda nada (sem fichas, conversa, cenas nem mapas): a que foi jogada se
  encerra. O que ela deixa para trás — fichas e documentos dela que já estavam apagados, e a projeção da cena no ar,
  se ainda dizia ser dela — **não passa a ser do mundo** (seria entregue a todos os jogadores da mesa): a ficha
  apagada fica só com o mestre, e os documentos continuam dizendo de que campanha eram, que é como nenhum jogador os
  recebe. A projeção, o aparelho do mestre regrava com a campanha certa quando as Cenas dele abrem de novo.
- **O mestre coloca os jogadores** (`campanha_participa`). Quando ele dá uma ficha de uma campanha a quem não
  participa dela — ou passa para outra campanha um grupo com a ficha de alguém de fora —, a casca pergunta se é para
  incluir essa pessoa. Sem participar, ela vê só a própria ficha.

No site, o núcleo (`tc/tc.js`) guarda as campanhas que a pessoa vê e a **campanha em vista** deste aparelho (por
mesa; lembrada no navegador). Trocar de campanha é escolher outra no menu da mesa: a conversa passa a ser a dela e os
sistemas abrem de novo — cada um lê a campanha em vista uma vez, na partida (`TC.ponte.estado.campanha`). Quem mestra
tem sempre uma campanha em vista: o que ele cria nasce nela (com a campanha em vista encerrada, a ficha nova nasce
no mundo: numa campanha encerrada nada nasce). "Campanha em evidência" (`TC.agruparPorCampanha`, igual
em `tc/tc.js` e em `tc/ponte.js`) é a ordem de toda lista onde se escolhe algo: o que é da campanha em vista, depois o
que é do mundo, depois o das outras.

No Mapa-múndi, o índice (`mundo:indice`, que a mesa inteira recebe) só leva os nomes dos mapas do mundo: os de
campanha, cada jogador conhece pelas projeções que recebe. O mapa "mostrado aos jogadores" é um só para a mesa — se
for de uma campanha, quem não participa dela continua no mapa que tinha aberto. Um atalho de um mapa para outro só
vai para os jogadores quando todos os que veem o primeiro podem ver o segundo.

Nas Cenas, a cena que está no ar é uma só para a mesa. O jogador que participa de mais de uma campanha e está com
outra em vista não a recebe na tela: vê um aviso dizendo de qual campanha é a cena no ar, e que é só trocar de
campanha no menu da mesa.

Um banco de antes das campanhas (sem essas tabelas e colunas) continua servindo ao site: o núcleo percebe pela linha
da mesa e, aí, nem pergunta por campanhas. E um aparelho com o site de antes das campanhas ainda aberto continua
servindo à mesa: o que ele grava sem dizer a campanha é do mundo — menos a fala e a rolagem de um jogador que
participa de uma campanha só, que o banco põe nela (`privado.registro_antes`), para não aparecer às outras.

### A busca rápida (lote 7, parte 6)

A lupa na barra de cima (ou **Ctrl+K** — **⌘K** no Mac —, na casca ou de dentro de qualquer sistema) abre uma janela
de busca. A pessoa digita parte do nome, sem se preocupar com acento ou maiúscula, e a lista mostra, em grupos, o que
tem esse nome: **fichas e NPCs**, **cenas**, o que tem nome no **Mapa-múndi** (marcadores, regiões, grupos, eventos,
zonas, rotas, linhas, textos e as facções), as **receitas** da Meditação, os **itens** das fichas (os equipamentos e o
que está na bolsa) e as **matérias** do Jornal. Todas as palavras digitadas precisam aparecer (no nome ou na linha de
baixo, que diz de quem é ou onde fica); o nome que começa com a primeira palavra vem antes, e o grupo do que mais se
parece vem primeiro. ↑↓ escolhem, Enter abre, Esc fecha; o mouse também serve. Até 40 resultados. A janela fica presa
no alto da tela: enquanto a lista muda, o campo não sai do lugar.

Escolher **vai direto**: a casca abre a aba e entrega ao sistema um alvo (`TC.ponte.aoIr`). O que foi pedido aparece
na tela, marcado por um instante — nada se edita sozinho.
- Fichas: `{ pc }` abre a ficha; `{ pc, item }` também tira os filtros dos equipamentos daquela ficha e abre a seção do
  item; `{ pc, bolsa }` abre, na bolsa, a aba do tipo dele.
- Cenas: `{ cena }` (o mesmo que o Mapa-múndi e o Acampamento já usavam).
- Mapa-múndi: `{ mapa }` abre o mapa; `{ mapa, obj }` seleciona e centraliza (na tela larga, o painel mostra a
  Seleção); `{ mapa, fac }` abre a aba Facções com ela aberta.
- Meditação: `{ receita }` (quem mestra) abre "Receitas e símbolos" com ela no editor; `{ achado, pc }` (quem joga)
  mostra, na prática do personagem, a receita que ele descobriu.
- Jornal: `{ materia }` mostra a matéria no jornal publicado; `{ materia, rascunho: true }` (quem mestra), no editor.

**Só o que a pessoa pode abrir.** Numa mesa, a busca lê o que este aparelho já recebeu do banco — e o banco só entrega a
cada um o que ele pode ver —, e ainda deixa de fora o que só quem mestra abre: quem não mestra as Cenas não acha cena
nenhuma; quem não mestra o Mapa-múndi acha só o que os jogadores veem dos mapas mostrados (`mundo:pub:`); quem não
mestra a Meditação acha só as receitas que os personagens dele descobriram; o rascunho do Jornal é só de quem mestra o
Jornal. O mestre auxiliar acha como mestre o que ele mestra. Numa mesa com campanhas, a cena ou o mapa de outra
campanha aparece com o nome dela (e, no empate, depois do que está em vista); escolher explica que é preciso trocar de
campanha no menu da mesa — nada troca sozinho. A ficha de outra campanha diz de qual é e abre normalmente, como na aba
Fichas. Sem mesa, a busca lê o que cada sistema guardou neste navegador (cada um é o próprio mestre).

A conta — o índice e a busca — fica em `tc/busca.js`, sem navegador: `indexar(fonte)`, `fonteLocal(ler)` e
`buscar(indice, consulta, max)`.

### Redesenhar sem atrapalhar quem está usando

A ficha é redesenhada inteira quando algo muda — por quem a está usando, ou por outra pessoa da mesa. Três cuidados
para isso não atrapalhar (em `fichas/mesa.js` e `fichas/extras.js`):

- **Quem está digitando não perde o campo.** "Digitando" é ter o cursor num campo em que algo foi escrito desde o
  último desenho (ou numa lista que acabou de abrir): o desenho espera a pessoa sair dali, e enquanto isso só os
  quadros em que ela não está são atualizados no lugar. Com o cursor só parado num campo, a ficha é redesenhada e o
  cursor volta para o mesmo campo, com a mesma seleção.
- **O clique que vem depois de um campo pega de primeira.** Um campo de número só avisa que mudou quando o cursor
  sai dele — isto é, no meio do clique em outra coisa. O que mudou é guardado na hora, e o desenho espera o clique
  terminar (ou, saindo pelo Tab, o cursor chegar ao campo seguinte; ou, se o clique abriu uma lista, a escolha).
- **Uma mudança que chega de fora no meio de um clique** espera o botão do mouse subir.

Os valores das barras que mudam no meio do jogo (lote 8) só valem com Enter ou saindo do campo:

- **Nas Cenas**, o painel do lado é redesenhado a cada mudança da cena (alguém mexeu num token, a vez passou). Ao
  trocar o campo em que se está digitando, o navegador dispara o `change` (e o `blur`) com o valor pela metade — o
  "-1" de um "-15" virava dano. Enquanto o painel troca (`trocandoPainel`, em `10-ui.js`), esses eventos são barrados
  na captura; o que foi digitado vai para o campo novo, com o cursor e a seleção. Só o Enter ou sair do campo
  confirmam.
- **Na ficha**, o campo "Atual" das barras (`confirmarAtual`) vale com Enter ou ao sair, e aceita "-8" e "+5" (para
  tirar e pôr; o dano gasta primeiro a sobrevida), além do valor novo. Esc desfaz o que foi digitado. Fica entre o
  mínimo da barra e o máximo, com um aviso quando a barra não desce mais.

A Árvore segue a mesma ideia (`arvore/mesa.js`): o que chega da mesa só espera por quem está digitando de verdade
(ou com uma janela aberta). Com o cursor parado num campo — a busca, o total de pontos —, entra na hora, o cursor
volta para o mesmo campo, o nódulo selecionado continua selecionado e a câmera fica onde estava.

**A ficha e a árvore são a mesma informação** (`skills`, no personagem): o que é distribuído na aba Árvore aparece na
aba Skills da ficha, e o contrário. O que o personagem aprendeu aparece também em "Passivas e Habilidades", só para
leitura — não é uma cópia: é a própria árvore, lida na hora.

### Para nada ficar para trás

Cada sistema entrega as mudanças à casca na hora (chamada direta: são páginas do mesmo site), e a casca as manda ao
banco logo em seguida, só os campos que mudaram. Ao fechar a página, a casca pede a cada sistema o que ele ainda
segurava e envia tudo de um jeito que o navegador termina mesmo com a página fechada (`keepalive`, até 64 KB). Se
algo não couber nisso, o navegador pergunta antes de sair. Fechar ou trocar de mesa, e sair da conta, esperam o que
faltava subir.

### Limites conhecidos

- **Duas pessoas mestrando a mesma cena no mesmo instante** (o mestre e o auxiliar, ou o mestre em dois aparelhos):
  o que cada um faz é juntado (ver "Duas pessoas mestrando a mesma cena"). Só na mesma coisa — o mesmo token
  arrastado pelos dois, a mesma barra — fica uma das duas. As barras de um mesmo token são uma lista só: um mudando
  o HP e o outro o SP do mesmo token, no mesmo segundo, fica a lista de quem gravou por último (se o token segue uma
  ficha, a ficha guarda as duas e acerta o token). Um aparelho só transmite a cena que está no ar; os pedidos
  recentes dos jogadores não se perdem numa troca: cada um guarda os dele por dois minutos depois de confirmados.
- **Uma campanha de cada vez.** A campanha em vista é de cada aparelho, mas a cena no ar e o mapa mostrado são um
  só para a mesa: o mestre joga com um grupo por vez. Pôr no ar uma cena de outra campanha tira do ar a que estava.
- **Até 40 campanhas por mesa** (as encerradas contam; as vazias podem ser apagadas).
- **Uma ficha é de uma campanha só** (ou do mundo). Um personagem que aparece em duas campanhas fica no mundo — aí
  todos o veem — ou ganha uma cópia em cada uma. As barras de relacionamento entre personagens de jogador só nascem
  sozinhas entre os da mesma campanha (ou do mundo).
- **O que sai de uma campanha some da tela de quem não a vê em até uns 10 segundos**, não na hora: o banco deixa de
  entregar a linha, mas não avisa disso; cada aparelho confere de tempos em tempos o que ainda pode ver.
- **Apagar uma campanha** (que só vale para a vazia) leva junto o acampamento e as missões do grupo que ela tiver, e
  isso não tem desfazer. Para guardar, é "Encerrar".
- **Com a campanha encerrada**, o mestre ainda mexe nas cenas e nos mapas dela (é o preparo dele), mas um token
  ligado a uma ficha dela não leva dano nem cura para a ficha: a ficha está só para consulta.
- **O Rolador e o auditor dos dados são da mesa inteira**: os históricos do mestre não se dividem por campanha, e o
  auditor conta as rolagens de todas (é a conta do dado, não da campanha).
- **O mestre auxiliar e as imagens.** As imagens da mesa ficam numa pasta só, e têm endereço público (quem tem o
  endereço abre). O auxiliar mestrando pode listar a pasta inteira — inclusive imagens de abas que ele não mestra.
- **O mestre auxiliar com a Árvore e sem as Fichas** cria, pela aba Árvore, só personagens dele mesmo (personagem sem
  dono é coisa de quem mestra as Fichas). Com as Fichas e sem a Árvore, usa as árvores do pacote publicado.
- **Jogar como jogador vale para a conta**, não para um aparelho: todos os aparelhos do auxiliar mudam juntos. E é
  uma proteção contra ver sem querer, não contra o próprio auxiliar — ele volta a mestrar quando quiser.
- **Quem aplica o que os jogadores fazem é o programa do mestre** — que roda com a mesa aberta, em qualquer aba do
  site (ver "O programa das Cenas do mestre"). Com o mestre fora do site (ou com o aparelho dormindo), os pedidos
  esperam; valem quando ele volta.
- **Sem a ligação em tempo real**, a mesa lê o banco a cada 3 segundos: tudo funciona, com esse atraso.
- **A mesma barra mudada por duas pessoas no mesmo instante** fica com o valor de quem gravou por último (barras
  diferentes do mesmo personagem não se atropelam; ver "Duas pessoas mexendo na mesma ficha").
- **A ficha em si** (`ficha`: atributos, itens, o cadastro das bolsas) é gravada inteira por quem a edita. Mestre e
  jogador editando o cadastro da mesma ficha no mesmo segundo: fica o de quem gravou por último, e o outro vê na hora.
- **`fichas:missoes` e `fichas:segredos` são documentos inteiros**, e só o mestre os escreve: com o mestre em dois
  aparelhos mexendo em missões do grupo (ou em valores escondidos) no mesmo segundo, fica o de quem gravou por último.
- **Missão de um personagem numa ficha aberta a todos**: depois de revelada, mora no `estado` da ficha, e quem vê a
  ficha vê a missão. Para uma missão que só o dono deve ver, a ficha não pode estar aberta a todos.
- **O som das rolagens** começa desligado em cada aparelho, e o navegador só o deixa tocar depois de um clique na
  página. O efeito segue o "reduzir movimento" do aparelho. A fixa digitada na telinha de dados fica no aparelho: não
  muda a ficha.
- **O auditor** confere o que foi rolado pelo site; de um dado rolado fora dele, não tem como saber. Dos duelos
  antigos do Rolador só ficaram os totais, e eles não entram nas contas.
- **O ataque com defesa** só existe dentro do site, com uma mesa aberta (ele usa as defesas das fichas). A fixa com
  que o mestre rola a defesa de alguém é a do token (a do turno, a que ele digitou, ou a da ficha). Quem confere a
  resposta de um jogador é a janela do mestre: com a janela fechada (ou a página recarregada), o pedido fica sem
  efeito e expira. O banco não impede um jogador de escrever uma rolagem com o recado de outro pedido; a janela é
  que não a aceita.
- **O terreno é só visual**: não pesa na régua nem muda a visão. A altura do token é a da área sob o centro dele.
- **O sinal de ferido no token** aparece para o mestre em qualquer token ligado a uma ficha; para os jogadores, só nos
  tokens de jogador cuja ficha eles podem ver. Um token do mestre não diz aos jogadores a que ficha está ligado (isso
  entregaria um disfarce), então os ferimentos de um NPC não aparecem para eles na cena.
- **Poção usada com o mestre fora do site**: a ficha muda na hora; a barra do token é acertada quando o mestre abre
  a mesa (é o programa dele que acerta os tokens pela ficha).
- **As paredes valem para o jogador na tela dele**: o banco não confere por onde um token passou.
- **A Meditação tem uma cena só para a mesa** (não uma por campanha): quem está meditando aparece para toda a mesa.
  O aviso da receita descoberta vai para o mestre da mesa (o auxiliar que mestra a Meditação vê a descoberta na aba,
  sem o aviso). O jogador vê só os símbolos — as receitas, nem chegam ao aparelho dele.
- **Os clãs são da mesa toda** (não de uma campanha). O líder que mexe nos cargos é o do clã dos jogadores (num clã
  de NPC, o líder é só um nome no alto da hierarquia). As facções que um clã cita vêm dos mapas do Mapa-múndi: uma
  facção escondida no mapa, se o mestre a puser numa relação à mostra, aparece para os jogadores (a lista do mestre
  avisa "escondida no mapa").
- **A missão ligada a uma missão das Fichas** (lote 9) só aparece numa mesa (fora dela não há Fichas da mesa para
  ligar), e liga só às missões do grupo (as de cada personagem continuam nas fichas deles: para elas, o texto curto).
- **Desfazer o Duplicado** (lote 9) tira o gêmeo da cena, mas a ficha dele, que mora nas Fichas, continua lá: apague
  por lá, se não for usar.
- **A batalha aberta fica na página** (lote 8, parte 6): com dados rolados e ainda sem aplicar, ela some se a página
  for recarregada (o que foi aplicado está no histórico). Os exércitos que se encontraram no caminho também ficam só
  na página (o aviso e a lista da aba Guerra).
- **Imagens que foram trocadas** (um retrato, o fundo de uma cena) continuam no Storage até a mesa ser apagada.
  Apagar a mesa apaga a pasta dela; a função `faxina` (em `supabase/functions/`) apaga as pastas de mesas que não
  existem mais — o que sobrou de antes disso, ou de um apagar que parou no meio.

## Testes

```
cd src/cenas && ./build.sh && cd test && for f in unit unit2 unit3 unit4 unit5 unit6 unit7 v3 v4 v5 e2e ui2 faixa negativa combate lote6 lote6b; do node $f.js; done
cd src/tests && for f in dice rules auditoria juntar campanhas busca lote8-nucleo mundo-nucleo acampamento-nucleo site busca-casca fichas fichas-regras fichas-quadros fichas-lote8 arvore arvore-lote6 mundo mundo-campanhas mundo-terreno mundo-desenho mundo-lote6 mundo-lote6b mundo-lote7 mundo-lote7b mundo-lote7c mundo-lote7d mundo-lote8 acampamento acampamento-racoes auditor jornal-nucleo jornal meditacao-nucleo meditacao cla-nucleo cla; do node $f.test.js; done
```

Os testes que usam o banco de verdade precisam das contas de teste (criadas na primeira vez, com a senha guardada
fora do repositório): `banco`, `mesa`, `fichas-mesa`, `fichas-novas`, `token-ficha`, `arvore-mesa`, `mundo-mesa`,
`acampamento-mesa`, `cenas-mesa`, `rolador-mesa`, `fundo.rede`, `auxiliar.rede` (o mestre auxiliar: no banco, o que
cada papel lê e grava, aba por aba; na tela, o menu da mesa, as abas e o botão de jogar/mestrar), `versao.rede` (o
mestre e o auxiliar na mesma cena, no mesmo instante), `ordem.rede` (a mesa ao vivo quando duas linhas ficam visíveis
fora de ordem no banco, e quando alguém fala logo depois de outra pessoa, antes da primeira leitura), `dados.rede` (a telinha de dados, o som e o efeito, a
iniciativa oferecida ao mestre, os dados guardados por todo caminho de rolagem e o auditor), `combate.rede` (puxar o
grupo, terreno, F e C, a fixa de cada turno e o ataque com defesa, com o pedido de defesa entre o mestre e um
jogador), `estado.rede` (duas
pessoas na mesma ficha, o mestre em dois aparelhos), `bolsa.rede` (barras negativas, bolsas e o sinal de ferido na cena) e `social.rede` (o que o mestre
esconde, missões, ferimentos, Ascensão e XP entre mestre e jogadores) e `campanhas.rede` (as campanhas: no banco,
quem organiza, o que cada um recebe, a primeira campanha levando o que a mesa tinha, desfazer, encerrar, apagar; na
tela, com o mestre e dois jogadores, da criação da primeira campanha até o jogador que fica sem nenhuma — `SO=banco`
ou `SO=tela` roda só uma das partes) e `campanhas-sistemas.rede` (uma mesa com duas campanhas, sistema por sistema:
as cenas e a que está no ar, os mapas, as missões do grupo, a ficha nova e a que muda de campanha, a roda do
acampamento, a campanha encerrada, a Árvore, "falar como" e limpar a mesa ao vivo) e `lote5.rede` (com o mestre e
duas jogadoras: as barras especiais no token, o cadeado dos ferimentos, os relacionamentos de uma vez, o personagem
ativo, a poção em outra personagem pelo banco — e a recusa quando a bolsa não é de quem pede —, a poção num token sem
ficha pela cena no ar, os bônus da telinha e a mesa ao vivo fechada e aberta de novo) e `acampamento-jogadores.rede`
(o mestre dá e tira o acampamento de um jogador — e o aviso para esperar quando a mesa ainda não tem acampamento —;
o que ele muda e o que o banco recusa: cada parte do mestre, outro documento da mesa, dar a permissão a si mesmo; o
acampamento gravado pela versão de antes do site; a outra jogadora sem a permissão; o mestre e o jogador gravando no
mesmo instante, e o desfazer que volta só o próprio passo; a Sanidade e o Conforto pelo cartão; o momento com
corações e emoção; e as linhas de relação de quem joga e de quem mestra) e `cenas-lote6.rede` (com o mestre e uma
jogadora: a janelinha E gravando na ficha, a Postura que a jogadora liga, a linha invisível e o "turno com o mestre",
N e Shift+N, a rolagem geral pedida à jogadora — o cartão dela, "Rolar pelos NPCs", "Cancelar o pedido", "Rolar por
ele" —, as pastas no índice da mesa (e em outro aparelho do mestre), o ícone do Mapa-múndi e o vilarejo gerado numa
mesa, com o fundo no Storage, chegando à jogadora) e `arvore-lote6.rede` (com o mestre e dois jogadores: o caminho
trancado fora do pacote, "Aberto para" levando a cópia às skills, o aviso só para o dono — e o abrir desfeito, que
não avisa —, o jogador aprendendo o caminho, as contas e o custo de uso com os números da ficha, na Árvore e nas
fichas do mestre e do jogador, o mestre mudando o caminho, fechando e abrindo de novo — o bônus deixa de contar e
volta —, e no banco quem escreve e quem lê a linha "para" alguém) e `jornal.rede` (com o mestre e dois jogadores: a
aba Jornal primeiro, as cartas antes da primeira edição — e o mestre vendo-as chegar enquanto escreve —, "Pôr no
jornal" e "Não publicar", publicar com a data do mapa, o Jornal abrindo sozinho para quem está nas Fichas, a bolinha e
o "Ler" para quem está escrevendo, o site em segundo plano e o site fechado, desfazer a publicação e, no banco, quem
lê e quem escreve cada documento do Jornal) e `meditacao.rede` (com o mestre e dois jogadores: o lugar e as receitas
do mestre, a prática do jogador — o panteão indo para a ficha, a imagem meditando enviada à mesa —, entrar na
meditação e o que cada um vê, as tentativas liberadas, o erro, a receita que é de outro personagem, a descoberta com o
aviso só para o jogador e o mestre, tirar e desfazer, o treinamento que só o mestre vê, o personagem que muda de
dono levando a prática e as receitas; e, no banco, quem lê e quem escreve cada documento da Meditação, as três funções,
o mestre auxiliar com e sem a aba e os documentos acompanhando o dono — `SO=banco` roda só essa parte) e `cla.rede`
(com o mestre e dois jogadores: os clãs criados pelo mestre, o jogador que lidera mexendo nos cargos pelo banco — e
desfazendo —, o salão de quem não lidera, um clã de NPC mostrado e escondido, o respeito no mundo, passar a liderança,
os nomes dos níveis; e, no banco, quem lê e quem escreve cada documento do Clã, o que o banco monta para os jogadores
— conferido contra a conta da página —, a função do líder e o mestre auxiliar com e sem a aba — `SO=banco` roda só
essa parte). `vivo.js` confere o site publicado.

Com `TC_PARAR=1`, um teste para na primeira verificação que falha (passando ainda pelos `finally` dele, que apagam a
mesa de teste) — é como os mutantes rodam os testes longos de rede.

Todo teste que abre o site no navegador também fica de olho em **texto solto** na tela — "null", "undefined", "NaN"
ou "[object Object]" como o texto inteiro de um pedaço da página, que é o que o navegador escreve quando um valor vazio
vai parar num `append` — em toda página e moldura que abrir (`src/tests/lib.js`): achou, o teste falha.

**Sem tocar no projeto de verdade:** `src/tests/local/banco.sh ligar` sobe o banco local de ensaio, e
`TC_LOCAL=https://127.0.0.1:54331 node <teste>` faz qualquer um desses testes falar com ele. É onde uma migração nova
roda primeiro (`banco.sh aplicar <arquivo.sql>`). O que ele não tem é a ligação em tempo real. Ver
`src/tests/local/LEIA.md`.

`campanhas` confere a regra da "campanha em evidência" (a mesma tabela de casos na casca e na ponte dos sistemas) e
`mundo-campanhas`, o Mapa-múndi numa mesa com campanhas, com a casca falsa em vários aparelhos: o mestre com cada
campanha em vista e jogadores de uma, da outra, das duas e de nenhuma — de que campanha nasce cada mapa, a quem a
projeção chega, o que vai no índice e os atalhos entre mapas de campanhas diferentes.

`fichas-quadros` também confere os gestos com o mouse, o teclado e o toque de verdade (o botão desce, espera e sobe):
o clique que vem depois de um campo, o Tab, o Enter e a lista aberta. `fundo.rede` confere o programa das Cenas do
mestre em segundo plano (a poção e o token, o pedido do jogador com o mestre em outra aba, dois aparelhos do mestre),
e `src/cenas/test/unit6.js` roda as mesmas regras com vários aparelhos de mentira. `auditoria` confere as contas do
auditor (inclusive que ele não acusa dados honestos mais vezes do que o combinado) e `auditor`, a janela dele.
`src/cenas/test/combate.js` confere, sem o site, as contas do combate, a ferramenta Terreno, a janelinha de atributos
num token sem ficha e a disputa; `src/cenas/test/lote6.js`, as teclas novas, a janelinha E (com uma ficha de mentira),
a Postura, o contador em vários tokens e a linha invisível (com a prévia "como jogador"); `src/cenas/test/lote6b.js`,
a rolagem geral sem mesa, as pastas (a janela, o menu, guardar neste navegador), o vilarejo (a janela, a cena criada
e 60 sorteios conferidos — aldeia e vila, os quatro terrenos, com e sem rio e paliçada: a mesma semente dá o mesmo
vilarejo; casas dentro da área, sem grudar, fora da rua, da praça e do rio; uma porta em cada, no lado certo; móveis
dentro, sem um em cima do outro e sem tapar a porta) e o item
complementar na janelinha E; `src/cenas/test/lote7.js`, as 20 condições novas (a janela, os ícones, a Ventania), o
Escudado (o número no painel, na barrinha e no mapa; sair quando a sobrevida acaba, no mesmo Desfazer; o que chega de
fora; o aparelho do jogador, que não acerta), o Agigantado e o Encolhido (os limites, a borda da cena, as rodadas, o
que chega de fora) e a faixa de cinema (o mestre, o jogador da vez e os outros, "Rodada N", o lado pela ficha, a
faixa cancelada, os sons com a chave ligada e desligada, a tela estreita e o movimento reduzido); e
`cenas-lote7.rede`, numa mesa com o mestre e um jogador: "Sua vez!" no aparelho dele, o Agigantado que ele põe no
token dele, e o Escudado que sai com o dano do mestre e com o dele. `src/cenas/test/lote7b.js` confere as 19 zonas
novas (a biblioteca, a Fumaça e a Muralha na visão e na passagem, os pontos da muralha, o Portal, as Runas, as zonas de
condição e de lembrete no começo da vez, as combinações, trocar o tipo, o efeito de um jogador), e `cenas-lote7b.rede`,
com o mestre e um jogador: o portal que o jogador usa, a fumaça na tela dele, as runas escondidas e o fogo dele no
óleo do mestre. `src/cenas/test/lote7c.js` confere as famílias de cenas (arrastar, a lista "Onde fica", sem voltas e
até seis níveis, o menu que abre e fecha, a pasta da família, duplicar, apagar, recarregar), as passagens (os
marcadores, o painel, os dois cliques, "Uma cena nova, dentro desta…", a cena apagada, a prévia como jogador), a janela
"Gerar um lugar" (o estilo, a hora, travar com o mouse e com o teclado, "Gerar outro", "Soltar tudo", a semente, os
modelos e a cena que sai) e as regras do plano em 72 sorteios nos seis estilos e em 36 com partes travadas (com
`SO=familias`, `passagens`, `gerador` ou `regras`, roda só uma parte); `cenas-lote7c.rede`, numa mesa: a família e o
modelo no índice (a jogadora não recebe; outro aparelho do mestre encontra), a vila oriental de noite com chuva na
tela da jogadora e a passagem que não diz aonde leva. `src/cenas/test/lote7d.js` confere a aba Cidade (as escolhas,
travar um prédio e o traçado, "Gerar outro", o tamanho que solta a trava, o modelo, a cena completa de noite com as
paredes, os marcadores, as lanternas e as tochas, o relevo e as formas, e a chave que deixa tudo plano), o mapa de
bairros (os marcadores, os dados da cidade, "Gerar este bairro…" e a cena do bairro, sem nada passando da borda), o
interior (pelo marcador e por uma Entrada posta à mão, de dia e de noite) e as regras dos planos — a cidade em 30
sorteios e em 18 com partes travadas, o interior em 512 plantas (com `SO=cidade`, `bairros`, `interior` ou `regras`);
`cenas-lote7d.rede`, numa mesa: o mapa de bairros na tela da jogadora sem os dados da cidade nem os marcadores, outro
aparelho do mestre gerando o bairro com os mesmos prédios, e o interior de um templo na tela da jogadora.
`src/cenas/test/lote7e.js` confere a aba Encontro (os doze terrenos e as situações, a Surpresa, o caminho, os tamanhos,
travar o traçado clicando na prévia, "Gerar outro" e "Soltar tudo", os marcadores), as cenas que saem (a carroça de
dia, a palafita de noite com neblina, o rio de lava sem o relevo), o navio (a amurada de mureta, a escotilha e o porão
com as cabines), a mureta (a visão passa, a passagem não) e o relevo leve desenhado, o que o Mapa-múndi manda para a
janela e as regras dos planos em 144 sorteios (marcadores onde se pisa e longe um do outro, paredes de visão só junto
do que é grande, a trava, a Surpresa variando) e os eventos do Mapa-múndi na cena (a chave com os nomes e o que levam,
o chão seco no mesmo traçado, a zona cobrindo a cena, a chave desligada, cada aba com o que vale nela; com
`SO=encontro`, `cena`, `navio`, `mureta`, `mapa`, `regras` ou `eventos`);
`mundo-cenas` confere o que "Gerar a cena aqui" e "Gerar este lugar…" mandam (o terreno, o caminho, a hora, o
clima, o estilo, o nome e o atalho; e o que os eventos levam: o clima, o breu do eclipse, as zonas e o chão seco; e o
clima do dia, sem evento, e o da região com ajuste; desde o lote 14, o hexágono e a Região preenchida, e a janela
abrindo nas Cenas com eles), numa moldura que faz o papel da casca; `cenas-lote7e.rede`, numa mesa: o grupo
no mapa gerando o encontro (de noite, com chuva, nórdico; com a seca e a assombração, o chão seco e a Névoa de
espíritos), a janela já aberta que não é atropelada, a vila do
marcador (cancelar, gerar de novo, abrir) e a jogadora sem os botões nem o estilo da região. `src/cenas/test/lote7f.js` confere a aba Tribo (as moradias, os tamanhos, os terrenos, as três chaves, travar clicando na praça, as escolhas guardadas, o modelo e o pedido já preenchido), a cena da aldeia (as paredes — o portão, a cerca, a paliçada e as moradias —, as Entradas ocultas que sabem a moradia e a do chefe, as fogueiras, os totens, as tochas, o relevo das torres e do fosso, o portão que abre), a tenda do chefe por dentro (pelos dois cliques na Entrada), as plantas de dentro de todas as moradias, a aldeia das palafitas (sobre o lago, os deques, o píer, a passarela, as portas para ela) e as regras dos planos em 120 sorteios (a do chefe, as moradias separadas e dentro da paliçada, a porta para a praça, a cabana de frente, as torres longe do portão, o riacho fora da aldeia, a trava; com `SO=aba`, `cena`, `interior`, `plantas`, `palafitas`, `regras` ou `pintores`); `cenas-lote7f.rede`, numa mesa: a aldeia dos iglus vai para a jogadora sem as Entradas, e o iglu do chefe por dentro, com o estrado de neve. `src/cenas/test/lote7g.js` confere a aba Porto (os dois lugares, os tamanhos, os terrenos, as três chaves e o terreno, que não mexem no traçado — nem os barcos — e não soltam a trava, travar clicando no navio, a trava que só vale no mesmo lugar e no mesmo tamanho, as escolhas guardadas e o pedido já preenchido do Mapa-múndi), a cena do porto (as paredes — os prédios, o farol, que tapa a visão, e a amurada dos navios —, as Entradas ocultas dos prédios e das escotilhas, os lampiões, o relevo do mar, dos molhes, do convés — debaixo dos castelos — e da galeria do farol, a luz do farol, a passagem pela prancha), o porão do navio (pelos dois cliques na escotilha), a vila de pescadores (o barco na cabeça em T ou ao lado do píer comprido, a praia, o mercado do peixe, a ponta de pedras), as regras dos planos em 120 sorteios (os prédios separados e de frente para o mar, a frente da porta livre, a taverna, os navios nos lugares deles com a prancha na abertura — desenhada e por onde se passa —, os barcos fora dos lugares dos navios, a estrada que sai, nada de árvore no mar; e poucas árvores entre as casas, com a mata cheia para dentro da terra), o desenho do mar (fundo e escuro longe da beira) e a Cidade com mar (sem o mar, os planos de antes, conferidos pelo resumo; com ele, a muralha aberta, sem portão para o mar, os navios, o bairro do porto, a rua do porto, o rio, o recorte do porto até a borda do mapa do lado do mar e a cena; com `SO=aba`, `cena`, `porao`, `vila`, `regras`, `desenho` ou `cidade`); `cenas-lote7g.rede`, numa mesa: o porto grande vai para a jogadora sem as Entradas (com a amurada do navio), e o navio por dentro. `src/cenas/test/lote7h.js` confere as masmorras: as regras dos planos em 144 sorteios (os quatro tipos, os três tamanhos, com e sem os segredos e a escada de descida: o mesmo sorteio dá o mesmo nível; as escadas no chão e ligadas uma à outra; todo o chão alcançável; as portas entre casas abertas; os objetos no chão, sem um em cima do outro; as runas escondidas e só com os segredos; o que cada tipo tem), a janela "Gerar o nível" (pela Entrada posta à mão), a cena (no breu, as paredes, as portas trancadas e secretas, as runas escondidas, a Saída e a Entrada do nível 2; quem joga não vê as Entradas nem as runas), o nível 2 (dentro do nível 1), o desenho dos quatro tipos e a aba Masmorra do "Gerar um lugar…" (sem a hora e o clima, o nível escolhido, "Embaixo de" na ordem das famílias, a cena solta com a Saída sem destino, a cena dentro da de cima com a Saída de volta, o nome e o id pedidos pelo Mapa-múndi; com `SO=regras`, `janela`, `cena`, `descer`, `desenho` ou `aba`); `cenas-lote7h.rede`, numa mesa: a jogadora recebe a masmorra com a porta secreta como parede comum, sem as runas nem as Entradas, e a porta vira porta quando o mestre revela. `src/cenas/test/lote7i.js` confere a aba Ruínas (os cinco lugares, os tamanhos, os terrenos e as duas chaves, que não mexem no traçado, travar clicando nas ruínas, a trava que só vale no mesmo lugar e no mesmo tamanho e vai embora ao trocar o lugar, as escolhas guardadas e o pedido já preenchido do Mapa-múndi), as regras dos planos em 150 sorteios (o mesmo sorteio dá o mesmo lugar; as chaves e o terreno não mexem no traçado; a entrada da masmorra só com a chave, na escada ou na boca, no chão, alcançável andando de uma borda e sabendo o nível de baixo; as paredes que não se cruzam; o que cada lugar tem; a hera só com o mato, e nunca no telhado), a cena do templo (as paredes em ruína e as de visão das colunas, o relevo, a Entrada oculta da cripta), a cripta embaixo (pelos dois cliques na Entrada) e o desenho dos cinco lugares (com `SO=aba`, `regras`, `cena` ou `desenho`); `cenas-lote7i.rede`, numa mesa: o forte em ruínas vai para a jogadora com as paredes e o relevo, sem a Entrada da masmorra, e o mestre desce ao nível 1. `arvore-lote6` confere a Árvore sem mesa: a chave "Trancado", "Aberto para" e a
cópia do ramo, o modo jogador de cada personagem (e a tranca de dentro aberta antes da de fora, que não aparece
solta), o pacote sem o caminho, o custo de uso no editor e as contas escritas; `rules` confere, numa árvore com
trancas umas dentro das outras e caminhos que se juntam ("e" e "ou"), que o jogador (pacote + ramos) e o mestre
(a biblioteca toda) chegam à mesma biblioteca. Com `FOTOS=<pasta>`, eles guardam fotos das telas. `mundo-lote6` confere o
Mapa-múndi do lote 6 pela interface: a marcha em tempos ("Andar 1 tempo", "Andar 1 dia" com os tempos que faltam,
pela aba Hoje também; "Passar o dia" e "Ir para a data" começando no primeiro tempo), as bolinhas da travessia no mapa
e no painel (para o mestre e, prontas, para quem joga; o custo da montanha mudando no meio da travessia), o ajuste à
mão sem passar o tempo, os tempos de marcha de um dia, a largura do mapa em cubos (o terreno refeito na grade nova) e
as regiões de dentro (a sugestão da mais de dentro, a facção e a cor herdadas, a de dentro por cima, os nomes sem se
encavalar, a lista em árvore). `mundo-lote6b` confere os terrenos novos (e a oferta num mapa de antes), o desenho em
cada hexágono (no canvas: cada um com o seu, o mesmo sempre igual, só a cor quando desligado, o mesmo para quem
joga), a honra (o estilo, − e +, o motivo, o selo de −5 a +5, o histórico corrigido e tirado, quem joga vendo) e o
painel da facção (recursos, população, apoio, o histórico automático, o que os jogadores veem). `mundo-lote7` confere
a pintura por hexágono de verdade (a tinta cobrindo, com textura, sem fresta entre dois terrenos e com a borda macia
por fora), a força da tinta, a grade separada da tinta, os dias da semana e o tempo para todos (+1 tempo, Próximo dia,
o ◀ só na data, Desfazer, quem joga e a tela estreita). `mundo-lote7b` confere os eventos novos (lote 7, parte 5a):
a ferramenta com os 36 tipos, o peso de começo, o painel "Na viagem" (os cubos com vírgula, a chance, fechar, voltar
ao de começo, desligar, trocar o tipo), a viagem com o "+1 tempo" (os hexágonos mais caros, a dica do Terreno, o aviso
de quem entra, o grupo parado antes da ponte caída sem sair do lugar, a lista da aba Hoje, abrir a passagem,
Desfazer), o cartão do encontro com a conta dos eventos, o desenho de cada tipo novo (animado ou parado) com a chave
"Animar os eventos" e o que quem joga recebe (os eventos sem o peso e sem a lista). `mundo-lote7c` confere os grupos do
mundo (lote 7, parte 5b): a ferramenta Grupo com o tipo (a caravana escondida, com o desenho dela), "Os jogadores veem",
o "Traçar entre dois marcadores" (a prévia, nada mudando antes de usar, a rota escondida no mapa e fina na seleção),
ida e volta com o "Próximo dia" (o aviso do encontro no tempo certo, a volta, Desfazer), as paradas (o clique pedido, a
bandeirinha, o tempo e o nome, parar e seguir, tirar), "Desenhar a rota" de uma patrulha, o evento que anda, a aba Hoje
("Pelo mapa") e quem joga (sem os escondidos e as rotas escondidas; a caravana mostrada sem a rota, o jeito de andar e
as paradas). `mundo-lote7d` confere o clima do dia e as zonas de perigo (lote 7, parte 5c): o clima junto da data e
a aba Hoje (sorteado, trocar o de hoje só por um dia, Desfazer), a tabela do clima (mudar a chance, a soma, um mês sem
nenhuma, outro mês, voltar à de começo), o ajuste da região (nunca chuva, muito mais calor), a zona de perigo pela
ferramenta Frente (o tipo, o desenho, os números, voltar aos do tipo), o "Próximo dia" com o grupo no frio (sem mesa, o
aviso) e quem joga (o clima pronto, a zona sem os números); `mundo-lote7d.rede`, numa mesa: a proposta da zona de frio no
"Próximo dia" (o personagem do jogador marcado, com o antes e o depois; "Aplicar" mexendo na ficha; o Desfazer) e o
clima do mapa mostrado no Acampamento ("Usar na cena", a noite de chuva no descanso longo) e na Meditação ("Usar no
fundo da cena"). `mundo-mesa` confere
também, pela mesa, as bolinhas, a honra e o recorte do painel da facção chegando ao jogador. `jornal-nucleo` confere a
lógica do Jornal sem navegador (o rascunho e o publicado, as cartas e o que houve com cada uma, a marcação de negrito e
itálico) e `jornal`, a página sozinha pela interface (o editor e a folha ao lado, o teclado e o mouse de verdade, uma
mudança de fora no meio da digitação, desfazer, publicar, os três modos, recarregar e a tela estreita).
`meditacao-nucleo` confere a lógica da Meditação sem navegador (a cena, quem medita, os símbolos, as receitas e a que
casa com a tentativa, as repetidas, o treinamento, a prática, o que a meditação guarda e o entrar, liberar e tentar
feitos sem o banco) e `meditacao`, a página sozinha pela interface (o lugar, a imagem própria, chamar e liberar, a
prática, as receitas e os avisos, os símbolos, os pilares — errar, a receita de outro ambiente, acertar —, o
treinamento, desfazer, recarregar e a tela estreita). `cla-nucleo` confere a lógica do Clã sem navegador (os nomes dos
níveis, o brasão, a árvore de cargos e o que o líder manda ao banco, as construções e o subir de nível, os recursos,
o respeito, as relações, o histórico com as mudanças seguidas juntas e a projeção) e `cla`, a página sozinha pela
interface (os clãs, os cargos — arrastando e pela janela —, passar a liderança, os recursos, as construções, o
respeito e os nomes dos níveis, as relações, o brasão, o que os jogadores veem de um clã de NPC, o salão, apagar e
desfazer, recarregar e a tela estreita). `juntar` confere a conta que junta duas gravações do mesmo documento (com centenas
de rodadas ao acaso). `busca` confere a busca rápida sem navegador (o que entra para quem mestra, para o auxiliar com
uma aba só e para quem joga; as campanhas; o que vem do navegador sem mesa; a ordem dos resultados) e `busca-casca`,
pela casca sem mesa (a lupa, o Ctrl+K na casca e de dentro de um sistema, Esc, a busca de antes de volta, ↑↓ e Enter,
cada alvo — a ficha, o item nos equipamentos e na bolsa, o marcador, a facção, as matérias publicada e do rascunho, a
receita, a cena —, a janela presa em cima e a tela estreita); `busca.rede`, numa mesa, o que o jogador acha e o que não
acha (o NPC, o marcador e a facção escondidos, a receita que ele não descobriu, o rascunho, as cenas) e para onde cada
escolha leva, para ele e para o mestre.

Lote 8: `src/cenas/test/lote8.js` confere, com `SO=defeitos`, o painel do token que não aplica o valor pela metade
quando é redesenhado no meio da digitação (e só o Enter, ou sair do campo, confirma), o "Encerrar" que zera a
iniciativa de todos (com Desfazer) e a faixa nova que não leva quem já está em outra; com `SO=ferida`, a Ferida
permanente (a janela e a prévia, a ponta podre, a cura que para no teto por todo caminho, o dano que continua, o pedido
de um jogador, a proporção para os jogadores, mudar, tirar e desfazer); com `SO=clone`, o Clone (a janela, as cópias
iguais e os lugares, a coroa, o dano numa cópia e no real, o que muda no real indo para as cópias, "Este é o real",
sortear, escolher no mapa e o Esc, a condição que acaba — tirada, pelas rodadas, o real apagado —, o grupo para o anel
da vez e o que vai para os jogadores). `fichas.test.js` e `fichas-regras` conferem o "Atual" da ficha com Enter, Esc,
−8 e +5; `fichas-lote8`, o Limite de dano e a ficha com a barra podre; `mundo-lote8`, a textura dos hexágonos (com os
desenhos de longe, lisa de perto, e de volta sem o desenho de cada hexágono); `lote8-nucleo`, as contas da ferida
(nas regras e no descanso do Acampamento) e o Limite de dano fora das contas; `cenas-lote8.rede`, numa mesa, a ferida
de um token ligado indo e voltando da ficha e o Clone de um token ligado (as cópias fora da sincronização; o dano no
real e o que vem da ficha). Na parte 3, `cla-nucleo` confere as escalas de −10 a +10 (os valores de antes ficam, os
nomes de antes vão para o meio); `cla.test`, a escala de 21 no painel, os nomes, as relações e o recurso novo na
construção (com 0, no custo, num passo de desfazer, e o nome igual que usa o de antes); `mundo-nucleo`, a honra até
±10, a facção do grupo e a bandeira conferida na projeção; `mundo-lote8` com `SO=honra`, o selo de −10 a +10, e com
`SO=bandeiras`, as bandeiras nas regiões, nos grupos, nas zonas e frentes de guerra e na aba Facções;
`mundo-lote8.rede`, numa mesa, a bandeira do clã escondido chegando ao jogador e acompanhando o brasão e o clã. Na parte 4,
`mundo-camadas` confere as camadas pela tela: a janelinha (as dez, quanto há de cada uma, C e Esc), esconder (o que
some, guardado ao recarregar, o ponto no botão), travar (o clique que passa para a região embaixo), a lista do painel
e a seleção, criar numa camada escondida ou travada (a ferramenta, o clique, o arrasto, o menu do mapa), os atalhos
com o Desfazer, o terreno e a grade, quem joga e a tela do celular. Na parte 5, `src/cenas/test/gerador8.js` confere o
traçado dos geradores: com `SO=ouro`, os 159 lugares de antes, iguais; com `SO=cidade`, os portões na rosa, a muralha
redonda e irregular (e com o mar), o rio da rosa (longe da praça), a largura e as curvas, o afluente e o lago, a praça
perto do rio e de um portão, as pontes (nenhuma dentro do lago; com mar, a do cais), o relevo natural, a cena e o bairro
recortado; com `SO=vila`, os portões e as ruas, a paliçada pelo contorno (os vãos, aberta na água, as casas dentro), o
rio que vem antes e a praça no seco, as pontes, as travas pela semente e a cena; com `SO=tribo`, os portões (o chefe de
frente para o primeiro, as palafitas sem portão para o lago), as formas, o riacho e a aldeia no lugar seco maior (as
moradias cabem), as pontes das trilhas e o relevo; com `SO=encontro`, o rio da situação pela rosa (com a travessia), a
largura e as curvas, o rio novo, o lago longe da estrada, as pontes, os caminhos da rosa, o relevo e as 48 situações com
tudo ligado; com `SO=janela` e `SO=vilajanela`, a seção Traçado das quatro abas (a rosa, a forma, o rio, a praça, as
pontes, o relevo, o resumo, o modelo, voltar ao automático, travar o rio e a cena). Na parte 6, `guerra-nucleo` confere
as contas da Guerra sem navegador (o mapa de antes igual; o que fica guardado — os tipos, as unidades, o exército, a
fortificação, as fases da frente, o histórico e os hexágonos, com os limites —; a escala nova levando as fases; a
projeção sem números nem segredos; os lados e cada bônus de cada momento; os bônus do mestre; a resumida e a detalhada
com os dados dados, o momento-chave e os tamanhos; parar; o depois e o aplicar; a frente que anda; os mantimentos do
dia e os exércitos que se encontram) e `mundo-guerra`, pela tela: a aba (as seis abas cabendo, também a 800 px e no
celular), os tipos de tropa, as unidades, a fortificação, a resumida (o bônus do mestre, rolar de novo, a trégua,
recomeçar), a detalhada (o momento-chave, o bônus no próprio momento, rolar de novo, escrever, a janela que não pula
para o topo, fechar e voltar), o depois e o aplicar (com o Desfazer), o histórico, os hexágonos (e o botão direito), as
fases da frente, o encontro no caminho com o aviso e a proposta dos mantimentos, o que quem joga vê e o celular. A
ajuda da batalha (`mundo-guerra`, o passo "a ajuda da batalha"): o "?" do alto (o guia ao lado, a batalha aberta), o do
Choque (levado até ele, à vista, com os bônus e os dados desta batalha), o de Números (a força de cada lado e por que deu
+2; "Ver a conta" fechado e aberto), o Esc e o × (fecham só a ajuda), o do resultado, o do depois (as perdas, a moral e a
frente desta batalha) e, no celular, a ajuda por cima da batalha.

Lote 9: na parte 1, `fichas-lote9` confere o Limite de dano na ficha da distribuição livre (a linha depois das defesas,
escrever, o que não é número, decimal com vírgula, vazio, fora das contas) e a poção que não oferece o Duplicado;
`src/cenas/test/lote9.js` com `SO=duplicado`, o Duplicado sem mesa (a janela, as barras cheias — sem sobrevida, podre
e condições — e como estão — com as condições e a ferida permanente —, o gêmeo sem o dono do original, o lugar ao lado,
a ordem de turnos com a mesma iniciativa, o painel do gêmeo, o que vai para os jogadores, o gêmeo que cai e o aviso,
tirar da cena, tirar a condição, desfazer, um token de cada vez, objetos, zonas, a marca que só vale com o id de outro
token e o cerco sem lugar); `cenas-lote9.rede`, numa mesa, a ficha do gêmeo (a cópia só do mestre, do lado Inimigo, na
mesma campanha, com as barras cheias ou como estão), o dano no gêmeo indo para a ficha dele e não para a original, o
gêmeo que cai pela ficha dele (o aviso), a ficha nova nas Fichas do mestre e o gêmeo para os jogadores. Na parte 2,
`lote9-nucleo` confere a missão nas contas (o texto curto, a ligação, `ver`, `ok`, a situação pronta, os objetos que
têm missão, o que sai, a projeção só com a mostrada); `mundo-lote9` com `SO=bandeiras`, o tamanho das bandeiras neste
aparelho (Médias de começo, Pequenas, Grandes, em todas, a base no lugar, guardado no aparelho, sem mexer no mapa), e
com `SO=missoes`, a missão no mapa (marcar, o "!" nos quatro tipos, só do mestre e mostrada, concluir e reabrir, trocar,
tirar com desfazer, a lista da aba Hoje, o que quem joga lê, duplicar sem ela, e a ligada às Fichas — o nome e a
situação de lá, a escondida que não vai, a concluída que vira ✓, a que saiu); `mundo-lote9.rede`, numa mesa, a missão
ligada a uma missão do grupo das Fichas (escondida: o "!" só do mestre; revelada: o jogador vê, com o nome; concluída:
✓ para os dois). Na parte 3, `lote9-nucleo` confere o descanso (a janela, virando a noite, o grupo dos jogadores que só
para, o do mundo que vai dormir no ponto de descanso — o marcador ou o dele — se chega até a metade, senão acampa, a
parada no descanso, o ponto que não segura fora do descanso, a projeção) e a volta pela mesma rota; `mundo-lote9` com
`SO=descanso`, o descanso pela interface (marcar, "descansando agora", o "zZ", o "+1 tempo"), o "Ponto de descanso" do
marcador (a caravana segue até ele e dorme lá), o ponto da própria caravana, as paradas e o fim da rota no grupo dos
jogadores e a volta pela mesma rota (o botão, andando de volta, o aviso ao chegar). Na parte 4, `lote9-nucleo` confere o clima
que muda a cada N tempos (os trechos, o 1º igual ao sorteio do dia, os passos só para os vizinhos, a chance do mês, o
escolhido à mão até a próxima mudança, o clima de agora, uma vez por dia como antes, a região e a projeção);
`mundo-lote9` com `SO=clima`, "O clima muda" no calendário, os climas do dia na aba Hoje, o clima de agora junto da data
e o trocado à mão.

Lote 10: na parte 1, `lote10-nucleo` confere a facção dos jogadores (uma só, na projeção), as províncias e as
sub-regiões (em árvore), os hexágonos de uma região contra a conta de força bruta (nas duas orientações da grade e com
a grade deslocada), os próprios, o terreno de cada um e o Livro do reino (a sub-região de outro dono leva os hexágonos
dela; a projeção sem os números dos exércitos); `mundo-lote10` com `SO=subregioes`, a camada Sub-regiões (escondida, as
de dentro somem e as províncias ficam; os atalhos); com `SO=reinos`, a aba Reinos, a facção dos jogadores (só uma, o
aviso, desfazer), a lista com as províncias e o Livro do reino (e, para quem joga, "vocês" e sem o livro); com
`SO=provincia`, a seção Província e a Sub-região (a árvore, o terreno, ir e voltar) e a descrição; com `SO=modos`, os
modos do mapa (Clima com o escolhido à mão numa região, Perigo, Terreno, a legenda e o botão que volta, o que fica
neste aparelho, e sem o Perigo para quem joga). Na parte 2, `lote10-nucleo` confere a economia normalizada (os
recursos, as tabelas, os níveis, o assentamento, a produção do mestre, sem a economia o que não fica, a projeção sem
ela), a de começo, ligar (o recurso de mesmo nome, a semana, sem repetir; ligar de novo a guardada) e a produção (a parte
própria, a província que soma, por facção, os assentamentos de dentro, o que dá zero sai, desligada); `mundo-lote10`
com `SO=economia`, ligar pela janela (e desfazer), os recursos (renomear, o papel, criar, tirar), as tabelas (com
vírgula), os níveis, o assentamento (e deixar de ser, com desfazer), a produção da província (uma linha por recurso,
com a do mestre), o Livro, a facção (e a nova, que já nasce com os recursos do mundo), o modo Economia (a cor inteira
na região que mais produz, o topo da escala, trocar o recurso, que fica neste aparelho mesmo recarregando) e
desligar. Na parte 3, `lote10-nucleo` confere o catálogo normalizado e o pronto (pelos recursos e terrenos do mapa), os
espaços, as exigências, começar a obra (paga na hora, com o histórico), terminar, subir de nível, cancelar (devolve),
demolir, o que falta, de graça, a produção e o gasto, a defesa (até 20; desligada, nada), as construções normalizadas
e a sede do clã (para a facção ligada ao clã; sem ela, para a dona do lugar; a construção que o clã não tem mais não
conta); `mundo-lote10` com `SO=construcoes`, o catálogo (mostrar, editar — o erro de um número, um nível a mais,
desfazer —, criar, tirar), construir (a janela: o que não dá, o custo, o estoque, quem paga), as semanas, terminar,
subir de graça, cancelar, o que falta (e sem pagar), a Paliçada na Fortificação e na batalha, a produção na província e
a sede do clã (com um clã deste navegador: a produção da Forja no Livro do Vale). Na parte 4, `lote10-nucleo` confere
a semana (vira de domingo para segunda; as pendentes), a manutenção (por tipo, na proporção; a das sem tipo), a prévia
(o estoque, a produção, a manutenção, o que fica — nunca abaixo de zero —, o que falta, as construções que param, as
consequências, as obras) e aplicar (com o que o mestre recusou, as regras desligadas, uma semana de cada vez);
`mundo-lote10` com `SO=semana`, a caixa da semana, a tabela da manutenção (sem negativo), as regras, a prévia que abre
sozinha no "+7 dias" (a tabela, as consequências, recusar as obras paradas), aplicar, desfazer, fechar pelo botão e
duas pendentes. Na parte 5, `lote10-nucleo` confere os estratos normalizados (os de começo no mapa de antes, a lista
vazia que fica vazia), a divisão por nível, as pessoas de cada estrato (só dos que existem; a de antes vira Camponeses,
ou o primeiro estrato; sem nenhum, fica como estava; normalizar de novo não muda nada), a produção pela população (quem
consome tira), o "Distribuir" (os maiores restos, o empate, o nível sem divisão; a soma sempre é o total) e os lembretes
na prévia (aplicar não mexe na população); `mundo-lote10` com `SO=populacao`, os estratos na Economia do mundo
(mostrar, editar, criar, tirar — o com gente pergunta —, a divisão por nível), a janela da população (Distribuir, que só
enche os campos; Cancelar; o erro; no celular; salvar, a barra, a lista e o que produzem; desfazer) e os lembretes na
prévia da semana; a parte da economia passou a pôr 100 pessoas numa vila pelo Distribuir. Na parte 5b, `lote10-nucleo`
confere o catálogo e as guildas da cidade normalizados (os modelos sem o que é de cada cidade; o nome, o ícone, o
estrato que não existe, os recursos do mundo, os limites da influência e da relação, os serviços; o marcador que só tem
guilda continua assentamento; normalizar de novo não muda nada), o catálogo pronto (pelo papel, pelos estratos, a moeda
renomeada), a guilda a partir de um modelo (uma cópia), a parte da facção e a da guilda, a produção (como "guildas", na
região e na facção) e a semana (o estoque recebe a parte da guilda e paga o gasto; o que falta só aparece); `mundo-lote10`
com `SO=guildas`, o catálogo (mostrar, editar um modelo), a guilda nova a partir de um modelo (o limite de membros, o
líder, a influência, a relação, um serviço novo, no celular), o cartão, a produção na província, editar (a parte da
facção, o estoque, tirar um serviço), Cancelar, tirar e desfazer, o aviso de membros demais e a semana. No pente
fino, `lote10-nucleo` confere juntar pelo nome (a soma, o histórico que vai junto, o "jogadores veem", a facção sem o
estoque, o que não é o caso) e a população da facção (a soma; na projeção com a economia ligada e desligada);
`mundo-lote10` com `SO=pentefino`, as duas listas da facção, juntar (a conta antes, desfazer), o número novo com o nome
de um recurso do mundo, a população só para ler, o aviso do clã dos jogadores (marcar), o exército (os mantimentos e a
manutenção), o nível que sugere o ícone (usar, agora não), as construções da cidade e as do clã e a relação da guilda;
`mundo-lote8.rede`, numa mesa, o Cofre do clã e o estoque da facção ligada. A bandeira própria da facção:
`lote10-nucleo` confere a bandeira normalizada (o que não serve volta ao
de começo ou sai), ao lado da do clã, e na projeção (a da facção escondida não vai); `mundo-lote10` com `SO=bandeira`,
criar (a janela com a de começo, as escolhas e a prévia; nada muda antes de criar; no celular, cabe), no mapa, na lista,
no editor e no Livro, editar e cancelar (ou Esc), salvar e desfazer, a imagem e "Voltar ao desenho", a do clã valendo
antes (a própria guardada), quem joga vê, na prévia da semana, tirar e desfazer; `mundo-lote8.rede`, numa mesa, a
bandeira própria chegando ao jogador (no mapa e na aba Reinos), a do clã valendo antes (e a própria voltando quando ele
sai) e a imagem enviada à mesa (um PNG de 480 px no lado maior) que o jogador vê. Na parte 6 (o que os jogadores veem),
`lote10-nucleo` confere a caixa de cada cidade (guardada só quando o mestre mexe; o padrão pela facção dos jogadores), o
que vai de dentro (o nível, a população, as construções prontas, as guildas que não são secretas), a economia da facção
deles (o estoque, as fontes somando a produção do Livro, por província, a escondida e a coberta pela névoa sem nome, a
manutenção, a linha do Livro só com o que eles veem, sem os clãs), o estoque das outras facções que não vai, a
economia desligada, o que chega da mesa normalizado e o resumo da semana (o saldo, as obras prontas, o que a falta
trouxe, o que o mestre recusou); `mundo-lote10` com `SO=jogadores`, a caixa na cidade (o padrão, marcar, desfazer), a
caixa travada do estoque na facção, o Livro de quem joga ("De onde vem", que continua aberto; a sede do clã quando os
clãs chegam), a cidade aberta e a fechada, e o resumo na prévia da semana (a prévia que acompanha as recusas, aplicar,
desfazer, refazer, a página Jornal com ele, desmarcada não manda); `mundo-lote8.rede`, numa mesa, a projeção com a
economia e a cidade aberta, a sede do clã quando só o clã muda, o jogador vendo o Livro e a cidade, e o resumo no
rascunho do Jornal da mesa (que o jogador não recebe). No Lote 11, parte 1a (a corte), `lote11-nucleo` confere os
personagens e as casas normalizados (os campos, o gênero, as datas pelo calendário — o mês que não existe sai, o dia
que passa do mês fica no último —, os limites, os cargos de cada facção), as referências (a facção, a casa, o cargo da
facção ou os de começo, o lugar de um tipo que bata, os pais e os cônjuges que existem, os cônjuges dos dois lados e
até quatro, ninguém antepassado de si mesmo, o chefe da casa), a projeção (só os conhecidos, sem a nota nem a ficha, os
laços entre conhecidos, o lugar escondido fora, a facção escondida fora, a casa com conhecidos, os cargos das facções
que vão) e as contas (os cargos, a idade antes e depois do aniversário e na morte, a data em texto, os pais, os filhos,
os descendentes, quem está aqui, os membros, os laços pelo gênero); `mundo-lote11` com `SO=corte`, a aba (as sete abas
cabem, também com o número da seleção), a casa nova, o personagem novo (o cartão, os cargos da facção, os erros das
datas), a lista (a idade, o cargo, o lugar, "conhecido"), o filho morto em "Mortos" (que continua aberto), os cônjuges
dos dois lados (tirar dos dois), os pais sem os descendentes, a casa (o chefe, o brasão, Cancelar), os cargos
(renomear, tirar, criar, voltar aos de começo), o filtro, quem está aqui, quem joga, tirar o personagem e a casa e o
cartão no celular; `mundo-lote8.rede`, numa mesa, a projeção só com os conhecidos (sem as notas) e a aba Corte do
jogador. Na parte 1b (a árvore), `lote11-nucleo` confere quem entra, as gerações, quem casou ao lado, a ordem dos
filhos pelo meio dos pais, os casais (o dos primos também), os filhos pendurados nos pais que estão na árvore, o
tamanho, a casa vazia e a projeção; `mundo-lote11` com `SO=arvore`, a janela (as pessoas, os casais, os filhos, o morto,
quem casou, as gerações), "+", "Ajustar", clicar que abre o cartão (salvar refaz a árvore), "Fechar", quem joga (só os
conhecidos) e o celular. Na parte 2a (os títulos), `lote11-nucleo` confere os graus e os títulos normalizados (os campos,
os limites, a maioridade; só um título, os graus ou a maioridade já fazem a corte), as referências (o grau, a terra do
tipo certo, o reino, as pessoas; o herdeiro escolhido, o regente e os pretendentes não são o titular; sem titular, sem
o "desde"; o titular de antes que saiu fica com o nome), as contas (o nome do título e o de quem tem, pelo gênero; os
títulos de alguém e de uma terra, por grau; o maior junto do nome; o governante, também com o maior título vago; a
maioridade e quem é menor; os papéis de alguém nos títulos) e a projeção (as terras que eles veem e os conhecidos; a
terra escondida e a facção escondida não; a névoa com o nome pronto; as pessoas só as conhecidas; sem a nota; ninguém
conhecido: os títulos das terras vão mesmo assim); `mundo-lote11` com `SO=titulos`, "Casas | Títulos", os graus e a
maioridade (renomear, subir, os erros, voltar aos de começo), os títulos novos da região, da sub-região, da facção (o
governante), sem terra e da cidade (o grau e o reino que seguem a terra até você mexer; a prévia; os erros), trocar o
titular (a caixa, o "desde" que vira hoje, salvar de novo sem mexer, desmarcada não entra), o herdeiro escolhido, o
regente, os pretendentes, os titulares de antes, o maior título junto do nome (nas casas e em quem está aqui), os
títulos no cartão do personagem, tirar um grau usado, o filtro, quem joga, tirar o título, tirar da corte a titular e o
celular; `mundo-lote8.rede`, numa mesa, a projeção com o título do reino (sem a nota, sem o de quem eles não conhecem),
o título junto do nome, a lista "Títulos" e o governante do jogador. Na parte 2b (a sucessão), `lote11-nucleo` confere
as regras normalizadas (as dos reinos que existem, a do título), a regra de cada título (a dele, a do reino, a de
começo) e em texto, a linha de sucessão por regra (primogenitura e ultimogenitura, cada gênero, antiguidade e a volta à
primogenitura, "o mestre escolhe", o herdeiro escolhido vivo, o título vago pelo último titular de antes; os laços), a
sucessão de quem morreu (a partilha entre os filhos vivos, o herdeiro escolhido na partilha, a herdeira menor de idade
com o regente, o chefe da casa) e o aplicar (os titulares de antes, a data, o vago, o regente, a lista cheia, a
chefia), e a projeção sem as regras; `mundo-lote11` com `SO=sucessao`, a regra do reino na facção, a regra e a linha
no cartão do título (que muda na hora), a morte sem título (sem prévia), a prévia que abre sozinha, "Agora não",
"Fazer a sucessão…" no título e no morto, a herdeira menor com regente, aplicar com a notícia no Jornal, desfazer e
refazer (o Jornal junto) e o celular. Na parte 3a (a diplomacia), `lote11-nucleo` confere os tipos, os tratados e a opinião
normalizados (as partes que existem — duas ou mais —, o prazo pelo calendário, os motivos de −100 a +100, os limites),
as contas (o dia de uma data, o estado do tratado hoje, os tratados de uma facção e entre duas, a opinião com os motivos
vencidos) e a projeção (os públicos sem facção escondida, sem a nota; sem a opinião); `mundo-lote11` com
`SO=diplomacia`, as abas em duas fileiras (cabem; as de quem joga), os pares, a relação dos dois lados, a opinião (os
motivos com prazo, a soma na hora, os erros), os tratados (os erros, três partes, o vencido), os tipos, encerrar e
reabrir, tirar com Desfazer, o filtro, quem joga e o celular; `mundo-lote8.rede`, numa mesa, o tratado público na
projeção (sem a nota, sem o secreto nem a opinião) e a aba Diplomacia do jogador. Na parte 3b (a vassalagem),
`lote11-nucleo` confere a vassalagem e as trocas normalizadas (uma suserana por vassala, sem círculo, o tributo e as
trocas de um recurso da economia e entre as partes, os limites), as contas (a vassalagem de uma facção, o círculo, o que
vai numa semana, os tratados e os motivos que vencem nela, as decisões), a semana (o tributo e as trocas com o que
sobrou, o desmarcado não vai, as decisões junto), a economia dos jogadores, o resumo para o Jornal e a projeção;
`mundo-lote11` com `SO=vassalagem`, a janela da vassalagem (os erros, criar, mudar, Desfazer, tirar), as trocas no
cartão do tratado, a prévia da semana (a coluna "Trocas", desmarcar refaz as contas, renovar com o erro do prazo, o
motivo que vence, aplicar e desfazer num passo), quem joga e o celular; `mundo-lote8.rede`, a vassalagem sem o tributo
na projeção, o tributo e a troca na economia do jogador e o que ele vê. Na parte 3c (a guerra e a paz), `lote11-nucleo`
confere os motivos de guerra normalizados (contra outra facção que existe, o título e o pretendente que existem, os
limites), as sugestões pelos pretendentes, os tratados que ainda valem entre duas, declarar a guerra, fazer a paz, as
notícias e a projeção sem os motivos; `mundo-lote11` com `SO=guerrapaz`, a sugestão e "Usar…", os erros, "não vale
mais", a prévia da guerra (quem declara e o motivo dele, os tratados, a vassalagem, a notícia), Desfazer com o Jornal, a
paz (a relação, o prazo, o erro, a notícia), o tratado novo com a notícia, quem joga e o celular; `mundo-lote8.rede`, os
motivos de guerra fora da projeção. Na parte 4a (os segredos), `lote11-nucleo` confere os segredos normalizados (os
campos, o boato e o falso, quem sabe, o dono de cada tipo, o que não existe mais, os limites), as contas (o dono e o
nome dele, as escolhas de dono, as facções de um segredo, a notícia), a projeção (só os revelados; o dono só se eles o
veem) e a regra de sucessão de cada título na projeção; `mundo-lote11` com `SO=segredos`, a aba (as nove abas), o
segredo novo (os erros, quem sabe, boato e falso), mudar e Desfazer, revelar (o que eles vão ler, Cancelar, a notícia),
o dono que eles não conhecem, quem joga (os revelados; a regra de sucessão), esconder, o filtro, tirar e o celular;
`mundo-lote8.rede`, o segredo revelado na projeção e na aba do jogador. Na parte 4b (as intrigas), `lote11-nucleo`
confere as intrigas normalizadas (os campos, o estado, quem trama, os alvos sem tratado, os passos, os segredos que
usa, quem sabe, "os jogadores veem" só com o texto, o que não existe mais, os limites), as contas (o nome, quem trama e
os alvos em texto, os passos feitos, as que usam um segredo, as facções de uma intriga, as em andamento, mostrar as
marcadas), a projeção (só as mostradas, com o texto e o estado) e a semana (a prévia lembra; aplicar mostra);
`mundo-lote11` com `SO=intrigas`, a intriga nova (os erros, quem trama, os alvos com "+ Alvo" e o ×, os passos, os
segredos, quem sabe), a lista, "Usado nas intrigas", mudar e Desfazer, a prévia da semana (as caixas, aplicar, Desfazer
junto), quem joga (com o filtro), "Os jogadores veem" no cartão, as encerradas, o filtro, tirar e o celular;
`mundo-lote8.rede`, a intriga mostrada na projeção e na aba do jogador. No Lote 12, parte 12a (o dia da campanha),
`lote12-nucleo` confere as regras da campanha normalizadas (os limites, os terrenos e os meses que existem; as de
começo, com o inverno pela estação), a forragem guardada, onde cada exército está (casa, aliada pela relação e pelo
tratado, inimiga, neutra, sem dono, alheia), o terreno duro e o inverno (o mês e a zona do evento), o dia da campanha
(reabastecer até o teto, do estoque, na ordem; a forragem; comer; a fome; o desgaste só fora de casa para o terreno e
o inverno; vários dias; as recusas), aplicar e a semana (a produção de comida forrageada cai; a forragem da semana sai
ao fechar); `mundo-lote12` com `SO=dia`, as regras na aba Guerra (os erros, salvar, Desfazer, "Voltar às de começo"),
onde está cada exército, a janela do dia (os textos, desmarcar refaz as contas, o desmarcado fica como está), aplicar e
Desfazer, de domingo para segunda (o dia antes da semana), a forragem na prévia da semana e o celular; `mundo-guerra`, o
dia da campanha sem forragem nem desgaste. Na parte 12b (a ocupação), `lote12-nucleo` confere a ocupação normalizada (de
uma facção que existe e não é a dona; na região e no marcador; a contagem dos dias), quem controla, onde o exército está
na ocupada, a projeção (de uma facção escondida, sem a facção), a contagem do dia (sem defensor — a dona ou uma aliada —,
sem fortificação de pé — também a das construções —, a região de dentro à parte, os dias de antes, a recusa, libertar),
aplicar, a produção para quem ocupa (o Livro e a população, da dona), a forragem na ocupada, anexar, devolver, ocupar à
mão, as terras na paz e as notícias; `mundo-lote12` com `SO=ocupacao`, as propostas no dia (desmarcar sem nada mudar de
lugar, a notícia com a prévia, aplicar, Desfazer e Refazer), as listras, a seção da região (tirar, anexar com a notícia,
marcar), a aba Guerra e a regra dos dias, quem joga (também com a facção escondida), a paz com as terras e o celular;
`mundo-lote8.rede`, a ocupação na projeção (sem a contagem) e no mapa do jogador. Na parte 12c (a vida das tropas),
`lote12-nucleo` confere a Enfermaria no catálogo (a cura de cada nível, as que faltam, a cura da cidade até 100%), a
Enfermaria perto (casa, aliada, ocupada, colada, sem a grade), a cura no dia (os médicos e a Enfermaria, vários dias,
desmarcada, os médicos que acabam, a ferida do desgaste), o desgaste no HP e aplicar; `guerra-nucleo`, a unidade
normalizada (o HP de cada tropa, a ferida, a cura), a força pelas tropas e a perda da batalha no HP (as tropas uma a
uma, a ferida); `mundo-lote12` com `SO=vida`, "Pôr as novas do catálogo pronto", o editor (a cura), a nota da cidade,
o HP da unidade e "Curar a ferida", a cura no exército e no dia (desmarcar, aplicar, Desfazer) e o celular;
`mundo-guerra`, os campos novos da unidade e a ferida. Na parte 12d (as máquinas de cerco), `guerra-nucleo` confere os
tipos (os de começo, a tabela normalizada, até 40, a vazia), as máquinas da unidade e da fortificação (só dos tipos que
existem), a soma, o lado com as máquinas, o bônus da Abertura (a raiz, até 6; as da fortificação para quem defende), a
fortificação sem tirar da DEF, o dano no HP (o dobro vencendo; os tipos somam) e a projeção sem elas; `mundo-lote12` com
`SO=maquinas`, a seção da aba Guerra (as de começo, mudar e Desfazer, o acerto, um tipo novo, tirar em uso e "Voltar às
de começo", com a pergunta), os campos da unidade e da fortificação, o resumo, a batalha (a tabela, o bônus, o "?", a
Abertura, o dano no depois) e o celular; `mundo-guerra`, os campos das máquinas na unidade. Na parte 12e (o cerco),
`lote12-nucleo` confere a reserva, a milícia e o cerco normalizados, a projeção (sem a facção escondida; os números só
para a facção dos jogadores), os lugares para cercar, cercar, quem cerca e quem está dentro, o dia (as máquinas de fora,
os tiros de dentro com o sorteio fixo, a reserva que alimenta, o desgaste do cerco, as recusas, vários dias), a rendição,
aplicar, ninguém cercando, a queda (ocupar e libertar), levantar, a milícia, o cerco na batalha e as notícias;
`mundo-lote12` com `SO=cerco`, "Cercar…", o cerco no exército, no lugar e na aba Guerra, o anel, o dia (desmarcar,
aplicar, Desfazer), o assalto com a queda no depois, a milícia, a rendição, o fim sem ninguém cercando, "Levantar o
cerco…", quem joga e o celular; `mundo-lote8.rede`, o cerco na projeção e no mapa do jogador. Na parte 5, `lote9-nucleo` confere os heróis nas contas (o bônus sugerido, o teto de +10 na Virada e
na resumida, a ação heroica fora do teto e no momento certo, os ferimentos pelo tamanho do resultado, `exe.herois`
guardado e a projeção sem eles); `mundo-herois`, numa página com fichas de mentira (a coleção `personagens` sem o
banco, que guarda o que se grava), os heróis do exército (o sugerido, o escrito, Tirar), os da batalha (só nesta
batalha, o bônus à mão, o teto, a linha da comparação), a ação heroica (com o dado trocado: o dobro e a falha, tirar a
ação), a Virada com os heróis, os ferimentos (a prévia, aplicar no HP das fichas, o Desfazer e o Refazer — o do aviso e o
de cima — a partir do HP de agora) e a batalha sem ferir; `mundo-herois.rede`, numa mesa, a ficha feita nas Fichas como
herói do exército (o bônus pelas contas dela), a batalha e o ferimento que sobe para a mesa (e o Desfazer e o Refazer).

Lote 13: na parte 13a, `src/cenas/test/lote13.js` confere o motor de biomas e a Região livre: com `SO=motor`, a tabela
dos treze biomas e dos vizinhos, a mesma semente (o mesmo chão), a Mistura (pouca < média < muita, um ou dois vizinhos
da tabela), a costa (o mar num lado, a praia, o rio que deságua nele), o rio pela rosa (do oeste para o leste, descendo),
o rio sem a rosa em trinta sementes (atravessa a região, sai por outro lado, desce), o rio que acaba no lago, o lago no
caminho do rio, o afluente no trecho do meio, as curvas, o lago sozinho, sem água, os patamares longe da água e da borda
(o pântano quase plano, a montanha cheia deles) e o tempo da conta; com `SO=regiao`, o plano (de começo, os tamanhos e
os pontos de interesse nos treze biomas, os marcadores onde se pisa e com os nomes, o vau só com rio, as quatro águas
com as três misturas, a mesma semente, a trava do traçado, a Surpresa, o caminho e a rosa, as pontes e sem elas, a costa,
a lava e o gelo, a seca, as árvores com a paleta e a neve, o nome, o resumo e sem os marcadores); com `SO=pintura`, o
chão misto (a passagem gradual), o lago sem a beira, a tundra, o fundo e as estrelas da prévia; com `SO=janela`, a aba
(as escolhas, o Traçado sem o relevo natural, o rio só com água de rio, o mar na costa, travar pela prévia e gerar outro,
o modelo), a cena (os marcadores ocultos com os nomes, a chegada sem a emboscada, o relevo, o fundo, o aviso) e quem joga
não vê os marcadores. Na parte 13b, `src/cenas/test/lote13b.js` confere o Encontro no chão novo e os terrenos novos: com
`SO=chao`, os modelos de antes (dez encontros com as impressões da versão de antes: o rio da rosa, o relevo natural, os
caminhos, a seca), o pântano, a água e a gruta dos cristais como eram, os vizinhos da tabela (sem a costa) com as manchas, a Mistura, os
vizinhos longe do meio da situação, os patamares fora do meio, do caminho e das construções dela, as árvores, a
densidade, os enfeites, as pedrinhas e a mata de cada bioma, o rio da rosa pelo relevo (nasce no lado pedido; na costa,
acaba no mar; desvia das construções), o lago longe dos caminhos (também nas situações da estrada) e em duas demãos —
e, direto no motor, nascendo e crescendo fora da área da situação —, sem o relevo natural, a trava, a
seca, o resumo e o tempo; com `SO=novos`, os quinze terrenos, as doze situações nos três tamanhos (cada uma com o que
tem de seu: a baía da enseada, a face e a escada da falésia, o navio fora do mar, as armadilhas ocultas, o caminho ao lado da
ossada…), a cachoeira
da falésia, o mar do naufrágio, a chegada fora do mar e os nomes; com `SO=pintura`, a fonte quente, os desenhos novos e
a areia no navio encalhado; com `SO=janela`, a aba (os quinze terrenos, a Mistura, sem o relevo natural; o pântano sem
a Mistura; a costa), o modelo de antes (o mesmo lugar, o aviso, "Usar o chão novo" e o Desfazer), o modelo novo, o
Mapa-múndi e a cena (as armadilhas ocultas, a fogueira acesa). O `lote7e.js` e o `gerador8.js` passaram a contar os
quinze terrenos (as regras dos planos valem para as situações novas). Na parte 13c, `src/cenas/test/lote13c.js` confere as estações, a história do lugar e
os achados: com `SO=estacoes`, a lista e as regras, o verão igual ao de sem estação (nos cinco lugares de fora), a
primavera e o outono no mesmo lugar, o inverno congelando o lago (o tipo, a segunda demão, as casas, a fundura, a zona
cobrindo o gelo), as poças e o pântano inteiro, e não o rio, o mar, a fonte quente, a lava e o oásis; o desenho (as
estações diferentes; o deserto igual; a mancha sem estação igual por dentro; as copas do outono quentes, as do inverno
com neve, as da primavera floridas; a neve nas pedras, nos telhados e nos penhascos) e o resumo; com `SO=historia`,
cada história com o que tem de seu, longe do meio, fora do caminho, só a área dela mudando e limpa, as quatro juntas, o
encolher no mapa pequeno, o "sem lugar", a árvore queimada sem brasas e os marcadores na cena; com `SO=achados`, a
frequência, os cinco, longe do meio, o lugar de sempre sem achado, nunca sem pedir, a Região livre e o marcador na
cena; com `SO=janela`, a Estação (nos lugares de fora, lembrada, no modelo, vinda do Mapa-múndi), a História do lugar e
os Achados raros (no estado, no plano, lembrados, no modelo; o modelo de antes sem eles; na água e no pântano, sem) e a
cena criada. O `mundo-cenas.test.js` confere a estação do calendário no pedido da cena. Na parte 14a do lote 14,
`src/tests/lote14-nucleo.test.js` (sem navegador) confere o tijolo do hexágono: as seis direções de cada orientação, os
tijolos cobrindo o mundo sem sobrar nem sobrepor (pontos sorteados), o lado de cada vizinho (inteiro ou a metade), o
pedido (sem grade, nada; o terreno dele e dos vizinhos; o número do mapa), o recorte (a ordem do mapa, as pontas na
borda ou dentro, a linha em cima da borda e a que só toca o canto de fora, a rota em cima da estrada uma vez só, as
rotas que não são caminho), o ENCAIXE (o ponto por onde o rio e a estrada saem de um é o ponto por onde entram no
vizinho, nas duas orientações) e os limites. O `src/cenas/test/lote14a.js` confere a cena: com `SO=motor`, o pedido
conferido, os lados, o par, o chão (os vizinhos pelas bordas deles, até a fundura; a água; a Mistura; os de mesmo bioma
não), o ENCAIXE do chão (a linha é a mesma conta dos dois lados, com o sinal trocado; as casas da borda de cá e de lá
nunca se contradizem), a linha sumindo nas pontas (e a água seguindo na quina), sem pedacinhos soltos, a altura do rio,
as pontas e a frase; com `SO=regiao`, a Região no hexágono (os vizinhos, o mar com a praia passando da borda, o rio pela
ponta exata até a água, os caminhos pelas pontas, os patamares longe da borda, a Água escolhida sem rio no mapa, o rio
que vem da água, o que acaba num lago, o que nasce ali, o afluente) e o ENCAIXE do rio e da estrada entre duas Regiões
vizinhas de tamanhos diferentes; com `SO=encontro`, o Encontro (o chão novo, os vizinhos, o rio do mapa no lugar do
riacho, os caminhos até as pontas, sem o da situação também, a água fora das casas, o pântano e a água como sempre,
todas as situações sem erro, a trava, o rio acabando na água, a rosa, as manchas pelas bordas, os patamares); com
`SO=janela`, a caixa no alto e a frase, o Traçado, a Região preenchida sem mexer no que a janela lembra, as notas, a
chave desligada e ligada, o pântano, o modelo sem o hexágono, a cena criada e os avisos do hexágono de água e do sem
terreno; com `SO=robusto`, pedidos sorteados nos dois lugares (sem erro e rápido). O `mundo-cenas.test.js` confere o
hexágono e a Região preenchida no pedido da cena — e, de ponta a ponta, a janela abrindo nas Cenas com ele. Na parte 14b,
o `lote14-nucleo.test.js` confere também a guerra do hexágono: sem guerra, nada (o pedido fica como era); a batalha mais
nova (no mesmo dia, a última do histórico; a de depois de hoje, com 0 dias), as cores dos lados (a bandeira da facção,
a do clã antes dela, a cor escura com o tom claro, a do grupo, as neutras) e as tropas; a marca; os exércitos juntos
pela facção (o nome do maior, os maiores primeiro, até dois e o resto contado, sem os que não têm tropas, a caravana e
o de fora), as máquinas pelo desenho (com os tipos do mestre) e o escondido; o cerco (o lugar no tijolo, quem cerca, os
dias, as máquinas a até um hexágono com as da aliada), quem está dentro (o dono e a aliada dele) e o lugar ocupado. O
`src/cenas/test/lote14b.js` confere a cena: com `SO=dados`, a guerra conferida, os botões (o escondido desligado, a
batalha antiga), a escolha, a história com a batalha antiga e as tendas pelas tropas; com `SO=igual`, as marcas
desligadas dando o plano de sem guerra (nos dois lugares e nas duas orientações); com `SO=batalha`, as brasas (a zona, a
luz e o chão) no dia e no seguinte, os corvos, as covas, menos caídos a cada fase, os caídos só nas casas do campo e
longe da borda, mais de quem perdeu, os estandartes (e no empate), o marcador e o resumo, a Batalha antiga com 8 dias e,
no Encontro, o campo longe do meio da situação; com `SO=marca`, o destruído (a cinza, as árvores carbonizadas, sem
arbustos, a casa queimada com a chaminé, o marcador, a fuligem nas construções) e o corrompido (a terra roxa, os veios,
as árvores mortas e roxas, os cristais com a luz); com `SO=acampamento`, dois acampamentos (as tendas, as tendas do
comando, as fogueiras, as paredes de visão contadas; sem se encostar, longe da borda, fora do caminho; as cores; as
provisões; as catapultas paradas; os marcadores; o resumo), mais tropas com mais tendas e fogueiras (até 16), o
escondido só quando ligado e, no Encontro, as tendas fora do que a situação usa (e o resumo quando não cabe tudo); com
`SO=cerco`, a trincheira no lado do lugar (leste, oeste, norte e sul), as máquinas atrás dela e viradas para ele (o
aríete na frente), as estacas, o acampamento de quem cerca, quem está dentro sem acampar, o marcador, o posto, sem
máquinas e o cerco desligado; com `SO=janela`, os botões no bloco do hexágono, desligar um nas duas abas, a chave
desligada, a cena criada (os marcadores ocultos com o nome, as fogueiras acesas), a nota do cerco, a batalha antiga sem
mexer na História e o escondido; com `SO=robusto`, guerras sorteadas nos dois lugares (sem erro e rápido). O
`mundo-cenas.test.js` confere a guerra no pedido da cena e, de ponta a ponta, os botões das marcas nas Cenas. Na parte
14c, o `lote14-nucleo.test.js` confere o pedido do marcador: o cerco do próprio lugar marcado (aqui), o do outro lugar
cercado do mesmo hexágono primeiro quando é ele quem pede, o marcador que não está cercado (o cerco do outro, sem a
marca), o marcador que não existe e o resto do pedido igual. O `src/cenas/test/lote14c.js` confere os arredores: com
`SO=dados`, os níveis, as passagens de uma linha pela beira (a que corre rente vai junto) e o pedido do marcador; com
`SO=igual`, o Nenhum dando o plano, a prévia e o resumo de sempre (e o lugar de dentro igual ao de sempre) nos cinco
lugares, e a Cidade de bairros sem os arredores; com `SO=anel`, o tamanho, o lugar bloqueado e limpo, a faixa sem
árvores, o rio e os caminhos continuados até a borda, o rio longe do lugar, os morros e as manchas longe dele, as cores
e a largura do lugar no que continua, o relevo do rio continuado um só; com `SO=emenda`, o rio e os caminhos de cada lugar dentro da beira dele (a tela
só do lugar, nas pontas de fora); com `SO=hex`, o chão do hexágono, o lugar preenchido (o rio do mapa e os portões), o
rio pelo ponto do mapa, as pontas dos caminhos, a água dos vizinhos fora do lugar, a clareira do lugar de outro chão, o
rio do mapa em volta do lugar sem rio, os caminhos que sobram (e a ponta que cai no mar) e a estrada da Cidade
pintada com as cores dela, nas duas orientações; com `SO=mar`, o mar do Porto e da
Cidade no lado da água, de borda a borda, sem árvore nele; com `SO=guerra`, o cerco em volta (a trincheira nos quatro
lados, as máquinas viradas para o meio, o aríete no portão do forte, as flechas, o marcador, o acampamento do lado de
fora da trincheira e o do Médio que não cabe), o cerco de outro lugar fora da cena, as casas queimadas na vila, na
cidade e na tribo (as redondas na forma delas), o corrompido em volta, os acampamentos no Muito e a batalha fresca;
com `SO=janela`, a escolha (o Médio de começo, o Muito lembrado, o Nenhum com a nota do hexágono), a história e os
achados, o Traçado com o rio e os portões do mapa, as abas que têm os arredores, a Cidade de bairros e os modelos; com
`SO=cena`, a cena criada pela janela (o id e o nome do marcador, o tamanho, o fundo esticado, as paredes, os tokens e as
luzes deslocados, os marcadores ocultos, a entrada da masmorra no forte, o aviso); com `SO=robusto`, lugares, níveis e
sementes sorteados, com e sem o hexágono (sem erro, nada do anel no lugar, rápido). O `mundo-cenas.test.js` confere o
hexágono no pedido do marcador (o cerco do forte marcado; a masmorra sem ele) e, de ponta a ponta, o Vilarejo abrindo
nas Cenas com os arredores e o hexágono. Os testes de antes dos arredores conferem o lugar sozinho: o apoio dos testes
das Cenas (`src/cenas/test/lib.js`) abre a página com os arredores em Nenhum (também depois de recarregar; o
`lote14c.js` pede `arredores: true` e encontra o Médio de começo), e os testes da mesa escolhem Nenhum na janela.
No lote 15, o `src/cenas/test/lote15.js` (com um site de mentira em `window.TC`: a ponte de um mestre, os personagens
na memória e as regras de verdade; o apoio dos testes ganhou `opt.init`) confere o máximo da barra ligada indo para a
ficha (a ficha vazia sem pergunta, o valor de agora anotado, o dano que desconta, o Desfazer; a ficha preenchida com a
pergunta, Cancelar e Trocar, o número já número, o Desfazer que não passa por cima; a barra especial e o zero; o token
sem ficha; a ficha escondida), as barras especiais só ao passar o mouse (pelos pixels: escondida, com o mouse, com o
token selecionado, o HP no mesmo lugar, a escolha nas opções, o Ctrl+Z, a marca que vai para os jogadores), a
porcentagem (do máximo, para cima e para baixo, sem sinal, com espaços, os limites, o arredondamento, a sobrevida, a
faixa de baixo, a barra ligada e vários tokens) e o Descanso curto das Cenas (quem vai, com e sem escolha, o aviso e o
menu do mapa). O `fichas-lote15.test.js` confere a porcentagem no valor atual da ficha; o `mundo-lote15.test.js`, a
força em cima do token (os números, os selinhos, o título, quem joga não vê, o número que acompanha) e a Batalha entre os
dois (Shift + clique, os lados, sem unidades, com outra coisa, com três); o `lote15.rede.test.js` (com `SO=estaque` ou
`SO=descanso`), o Estaque escondido entre o mestre e o jogador (o banco, os segredos, a aba, recarregar, mostrar de
novo) e o Descanso curto (a equipe ativa longe da fogueira, o inativo, o longo, e o botão das Cenas abrindo o
Acampamento com a cena marcada, até as fichas e as rações).

**Lote 16 (fichas, grupo e árvore)**: o `fichas-lote16.test.js` (sem mesa) confere a ficha em abas (as cinco, o resumo
com as barras que se editam ali, os selos que levam à aba certa, a aba lembrada ao recarregar e ao trocar de ficha, a
ficha nova em Atributos), o aniversário (os meses de começo, o dia que não cabe, o ano, apagar), a caixinha nesta tela (a
prévia, os botões apagados, pôr, pegar, o achado, a despesa, o extrato, o Desfazer, a ficha sem grupo) e a aba Skills
(os cartões, o bônus da única que conta, sem "Abrir na Árvore" sem mesa, "Passar para skills únicas…" com a prévia e o
Desfazer); o `arvore-lote16.test.js`, a busca (o texto dos graus, as outras árvores, levar até lá, Esc, nada
encontrado), o filtro dos tipos de uso e as skills únicas (criar, o custo que não vale, o cartão, o ↺/↻, editar, a
busca, apagar); o `guia.test.js`, o guia na casca (abrir, um assunto de cada vez, Esc e ×, reabrir no mesmo, "Mostrar
onde fica" com a aba da ficha e o contorno, o aviso do que não está à vista, acompanhar a aba, e os assuntos de todas as
abas com seletores que valem); o `lote16-nucleo.test.js`, as contas (o aniversário, as únicas no bônus, os aniversários
do Jornal); o `lote16.rede.test.js` (com `SO=equipe` ou `SO=caixa`), os dois blocos do elenco (arrastar para os
inativos e de volta, o Desfazer, a caixa da ficha, o jogador sem os blocos) e a caixinha pelo banco (o jogador põe e
pega, o mestre vê ao vivo, o achado e a despesa, a ficha do jogador "pelo mestre", o que o banco recusa, o grupo que
muda de nome levando a caixinha); e o `lote16b.rede.test.js` (com `SO=aniv`, `SO=corte`, `SO=unicas` ou `SO=guia`), o
aniversário no calendário do mapa da mesa e no Jornal, o titular da Corte escolhido entre as fichas e o governante na
Diplomacia com "Abrir a ficha", as skills únicas do mestre chegando ao jogador (a Árvore, a ficha, o bônus, "Abrir na
Árvore") e o guia de cada papel.

**Lote 17 (mapa-múndi e guerra)**: o `lote17-nucleo.test.js` confere as contas — o que se guarda (a seta, a seta da
marcha, a produção do lugar, as ligações por mar, a zona e o ajuste, a tabela da defesa, a zona pronta e os recursos por
hexágono, com os limites), a zona de guerra automática (a fronteira dos dois lados, os ocupados, o ajuste, a linha do
front, desligada, sem guerra e sem grade), as viagens por mar (a ligação de cada par, o caminho que vai por mar quando
chega antes, a viagem nos dias da ligação) e a seta da marcha, a projeção (quem vê cada seta, a zona pronta fora da
névoa, sem o que é do mestre), a economia (os recursos dos hexágonos, os lugares que produzem para quem controla, a
fonte "lugares" para os jogadores), a defesa do terreno e dos lugares e o bônus na batalha, a terra devastada do dia da
campanha e os terrenos e ícones novos; o `mundo-lote17.test.js` (sem mesa), o mapa — a zona e o pincel do ajuste (pôr,
tirar, Desfazer, a aba Guerra, desligar), a seta livre e a da marcha, vendo como jogador, ligar dois portos e o
"Traçar" por mar, o pincel dos recursos, a mina que produz, o castelo e a tabela da defesa, o terreno na batalha, os
terrenos e ícones novos, a terra devastada no Próximo dia e a caneta (a que some, a que fica, a cor, desfazer, limpar,
guardada neste navegador); e o `lote17.rede.test.js`, numa mesa com dois jogadores, o que quem joga vê da guerra (a
zona pronta, as setas da facção dele, a do Vale só depois de mostrada) e a caneta entre as contas (o documento de
cada um, o que some sumindo para todos, o outro jogador que não apaga — nem pelo banco —, "Limpar os meus", "Limpar
desenhos" com Desfazer).

**Lote 18 (cenas e acampamento)**: nas Cenas, o `lote18.js` (por partes: `SO=relevo`, `subsolo`, `arena`, `campo`) confere
o relevo (a tabela e os limites, a subida e o penhasco na régua e no arrastar, a queda que sugere o dano com Aplicar e
Desfazer, o bônus de cima e de baixo, a visão pelo relevo), a caverna embaixo da cena (o tamanho, a subida embaixo da
entrada, o rio de baixo, os biomas, o achado e o ninho, descer mais), as arenas (a aba Arena: os tipos, o tamanho, as
fases que ligam, desligam e trocam; a cena com o chefe, os reforços ocultos e as fases só do mestre; acionar com a
prévia, o Desfazer, a aba Cena e o menu do mapa; o coliseu com os reforços, os espinhos, o chão que desaba e a grade; a
sala do chefe da masmorra) e o campo de batalha (o bloco na janela, os soldados por bloco, quem move, os blocos frente
a frente na cor de cada facção, a leitura — flanco, terreno alto, cobertura, reserva — e as perdas que voltam aos blocos);
o `mundo-lote18.test.js` (numa moldura que faz a casca) a janela da Batalha — o pedido do campo para as Cenas, a
leitura que volta como bônus sugeridos ("Somar", "Somar todas") e as perdas que vão para o campo ao aplicar; o
`mundo-cenas.test.js` também confere o "Gerar a arena do chefe…"; e o `acampamento-lote18.test.js` as barracas, os
abrigos, os veículos e o estado no desenho, a caça (as rolagens, as rações sugeridas, as regras) e o quadro de
distribuir (arrastar, as setas, o Desfazer).

**Lote 19 (as condições das raças)**: nas Cenas, o `lote19.js` confere a lista (as 53 no grupo Raças, em ordem, com o
ícone e a raça), o seletor (a aba Raças, a raça embaixo do nome), o de começo ao pôr (o Frio com 1, o Selo de Ocre com 2
rodadas), o contador que para no máximo e a sugestão no limite (o Frio no 5: Congelado e zera; a Contagem no zero: a
Sentença), com Aplicar e Desfazer, a janela do lado dos membros perdidos e as zonas (as 19 no grupo Raças, a forma e a
duração de começo na ferramenta, o painel com a raça e a regra, o Totem com os pontos de vida, a Arapuca escondida que
avisa quem entra); o `lote19.rede.test.js`, numa mesa, os membros na ficha (a mão amputada do lado certo, as costelas no
peito, desmarcar ao tirar, o Desfazer, a marca feita à mão que fica); e o `rules.test.js` confere que a lista de TC.rules
continua igual à das Cenas (123).
