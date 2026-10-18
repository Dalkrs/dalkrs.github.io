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
  - Mapa-múndi: `mundo:mapa:<id>` (mestre), `mundo:pub:<id>` (o que os jogadores veem) e `mundo:indice` (os nomes
    dos mapas do mundo que os jogadores podem abrir, e qual está sendo mostrado).
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
    mesmo, as cartas dele ao Jornal (`jornal:cartas:<ele>`) e a prática de um personagem dele na Meditação
    (`medit:pratica:<personagem>`). `jornal:resp:<jogador>` e `medit:achados:<personagem>` têm o jogador como dono
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
  (um por cem soldados, ou o que o mestre escolher) e as unidades (até 40): nome, tipo, tropas, HP e HP máximo, ATQ,
  DEF, magos, máquinas de cerco, equipamentos (até 12, cada um com ATQ e DEF) e "escondida dos jogadores"; duplicar e
  apagar (com Desfazer).
- **A fortificação** é do marcador (`estr`): o nome, a DEF (0 a 20: o bônus de quem defende ali, pelo HP que sobra), o
  HP (danificada, em ruínas) e Consertar. As máquinas de cerco de quem ataca tiram da DEF e danificam.
- **A batalha** (uma janela, aberta pelo exército, pela aba ou pelo aviso do encontro): os dois lados (a força de cada
  unidade é tropas × de 50% a 100%, pelo HP), quem defende uma fortificação a até um hexágono (escolhido sozinho), a
  tabela lado a lado e os bônus de cada um, na escala do d20 — números (+4 a cada vez que dobra o outro, até 10), ATQ
  contra DEF (até ±6), os tipos (a vantagem pesada pela força de cada tipo), a moral (− 5), o comandante, os magos
  (√magos, até 6), à distância (+3 se só um lado tem; com os dois, os números da força de longe, até 6), a fortificação
  e a fome (−1 por dia sem mantimentos, até −3). Os bônus do mestre (tática, terreno, reforço, magia ou outro) valem
  para um lado, na batalha toda ou só num momento.
  - **A resumida (d100)**: um d100 de cada lado mais 5 × os bônus; a margem diz o tamanho (menos de 8, empate; até 24,
    apertada; até 49, vitória; até 79, clara; 80 ou mais, esmagadora).
  - **A detalhada (d20)**: um d20 de cada lado em cada momento — Abertura (magos e à distância), Choque (números, ATQ ×
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
  moral (quem vence sobe, quem perde cai), um dia de mantimentos, a fortificação (o cerco de quem ataca sempre bate;
  vencendo, bate mais), a frente (a dos dois lados, a mais perto; anda de 1 a 4 hexágonos — dá para mudar — para o lado
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
  madeira, montanha pedra e orith…), a da população (5 Lapros por mil pessoas) e os níveis dos assentamentos (Aldeia,
  Vila, Cidade e Metrópole, com 2, 4, 6 e 8 espaços de construção). A janela antes diz o que muda: o recurso que uma
  facção já tinha com o mesmo nome passa a ser o do mundo (o número e o histórico acompanham: `recursosNaFaccao`), e o
  mapa que ainda não contava os dias da semana passa a contar (hoje vira segunda-feira; a semana fecha de domingo
  para segunda). Desligar guarda tudo (`eco.on`). Na seção **Economia do mundo**: os recursos (a cor, o nome — as
  facções acompanham —, o papel — o que ele é para as regras — e tirar: a facção fica com o estoque, como um recurso só
  dela), "+ Recurso" (cada facção ganha o estoque dele), "Produção do terreno…" (uma tabela: um terreno por linha, um
  recurso por coluna, por hexágono e por semana; vírgula vale; negativo gasta), "Produção da população…" (por mil
  pessoas) e os níveis (o nome, os espaços, "+ Nível", tirar — os assentamentos dele ficam sem nível).
- **A produção** (parte 2; `producaoPropria`, `producaoDaRegiao`, `producaoPorFaccao`): a parte própria de uma região
  soma os hexágonos próprios (pelo terreno), os assentamentos dela (os marcadores com assentamento cuja região de mais
  dentro é ela) e o valor do mestre (`r.prod`, "Produção do mestre…", por semana; negativo gasta); a província soma a
  dela e a das sub-regiões; cada facção, a parte própria das regiões dela (a sub-região de outro dono leva a dela). A
  seção Província mostra a produção por semana de cada recurso e de onde vem (o terreno, a população, o do mestre) e os
  assentamentos de dentro. O Livro do reino ganha o que cada facção produz por semana e o estoque (o número de cada
  recurso do mundo nela, em `f.rec`, com o mesmo id; na facção, esses números ficam sem renomear nem tirar).
- **O assentamento** (parte 2; `m.ass = { niv, pop }`): no marcador, a seção Assentamento (com a economia ligada) — o
  nível ("Não é assentamento", ou um dos níveis, com os espaços) e a população (fixa: só muda quando o mestre muda),
  onde ele fica (a região e a província) e o que produz pela população. Fora das províncias, não produz para ninguém.
- **O modo Economia** (parte 2; só o mestre, com a economia ligada): cada região pela produção de um recurso (a parte
  dela), do tom de base à cor do recurso; sem produção dele, só a borda. A legenda tem a escolha do recurso
  (guardada neste aparelho, com o modo) e a escala.
- **Para os jogadores**, a economia, a produção do mestre e os assentamentos não vão na projeção (por enquanto: a
  parte 5 mostra o que for deles).
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
clima do dia, sem evento, e o da região com ajuste), numa moldura que faz o papel da casca; `cenas-lote7e.rede`, numa mesa: o grupo
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
duas pendentes. A bandeira própria da facção: `lote10-nucleo` confere a bandeira normalizada (o que não serve volta ao
de começo ou sai), ao lado da do clã, e na projeção (a da facção escondida não vai); `mundo-lote10` com `SO=bandeira`,
criar (a janela com a de começo, as escolhas e a prévia; nada muda antes de criar; no celular, cabe), no mapa, na lista,
no editor e no Livro, editar e cancelar (ou Esc), salvar e desfazer, a imagem e "Voltar ao desenho", a do clã valendo
antes (a própria guardada), quem joga vê, na prévia da semana, tirar e desfazer; `mundo-lote8.rede`, numa mesa, a
bandeira própria chegando ao jogador (no mapa e na aba Reinos), a do clã valendo antes (e a própria voltando quando ele
sai) e a imagem enviada à mesa (um PNG de 480 px no lado maior) que o jogador vê. Na parte 5, `lote9-nucleo` confere os heróis nas contas (o bônus sugerido, o teto de +10 na Virada e
na resumida, a ação heroica fora do teto e no momento certo, os ferimentos pelo tamanho do resultado, `exe.herois`
guardado e a projeção sem eles); `mundo-herois`, numa página com fichas de mentira (a coleção `personagens` sem o
banco, que guarda o que se grava), os heróis do exército (o sugerido, o escrito, Tirar), os da batalha (só nesta
batalha, o bônus à mão, o teto, a linha da comparação), a ação heroica (com o dado trocado: o dobro e a falha, tirar a
ação), a Virada com os heróis, os ferimentos (a prévia, aplicar no HP das fichas, o Desfazer e o Refazer — o do aviso e o
de cima — a partir do HP de agora) e a batalha sem ferir; `mundo-herois.rede`, numa mesa, a ficha feita nas Fichas como
herói do exército (o bônus pelas contas dela), a batalha e o ferimento que sobe para a mesa (e o Desfazer e o Refazer).
