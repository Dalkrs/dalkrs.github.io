# Tiny Cats · Sistema de RPG

Site único com os sistemas da mesa, publicado em <https://dalkrs.github.io/>:

| Aba | O que é |
|---|---|
| **Cenas** | O mapa tático: tokens, barras (com sobrevida e, quando a ficha manda, abaixo de zero), condições, turnos, paredes, luz, névoa, efeitos, terreno com altura, a bolsa do personagem usada pelo token — e o combate: rolar atributo pelo token (F), disputa (C), puxar um grupo das Fichas e o ataque com defesa. |
| **Mapa-múndi** | O mapa do mundo da campanha: o desenho à mão do terreno (com textura), carimbos, textos, rios, estradas e trilhas, a grade de hexágonos com o terreno de cada um, marcadores, grupos viajando (em cubos, de hexágono em hexágono), regiões, facções e zonas de guerra, calendário, névoa e rumores. |
| **Acampamento** | A cena da fogueira: quem está no acampamento (com a aura da emoção de cada um), as provisões (rações com efeito), melhorias e equipamentos (para todos ou só para alguns), a caravana, os descansos e os momentos. |
| **Fichas** | As fichas dos personagens: atributos, as 13 defesas específicas, barras (que podem começar pela metade e ficar negativas), equipamento (que soma em atributo, barra ou defesa), bônus temporários, bolsas (poções, bombas, runas, munições, materiais), rolagens, Lapros, a barra de XP junto do nível, Sanidade, Conforto, Relacionamentos (com a trilha de romance, e com o que o mestre esconde), o quadro de Ascensão (os pontos das árvores), o corpo com os ferimentos e as Missões. |
| **Árvore** | A árvore de habilidades de cada personagem. |
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
| `cenas/`, `mundo/`, `acampamento/`, `fichas/`, `arvore/`, `rolador/` | As páginas dos sistemas (cada uma também abre sozinha, em outra janela). |
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
  - Todos os documentos são escritos pelo mestre (sem dono). A única exceção, e a única coisa que o banco deixa
    um jogador criar, é o `cena:pedido:` dele mesmo.
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
  mudar nome, bônus e quem está nela, ou separar em linhas.
- **Esperando para reagir** (`reac` na entrada): a marca de quem segurou a vez para agir fora de ordem. O botão fica
  na linha de quem está jogando (e na de quem está esperando, para dizer que reagiu); a marca sai sozinha quando a
  vez dele volta.
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
- **Condições por categoria.** São 47, cada uma com uma categoria (`CONDS[].g`: Dano, Controle, Combate, Mente,
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
- **Zonas de efeito**: 32, em quatro categorias (Elementos, Magia, Natureza, Sagrado e sombrio). Na primeira vez em
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
  F fecha a do E, e vice-versa.
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
- **Pastas na lista de cenas** (`S.pastas = { lista: [{ id, nome }], de: { idDaCena: idDaPasta } }`, só do mestre:
  numa mesa, no índice das cenas; sem mesa, neste navegador): a janela "Organizar em pastas…" (arrastar a cena, ou
  escolher a pasta ao lado dela; criar, renomear e apagar pastas — as cenas voltam para "Sem pasta"), com Desfazer.
  Na lista do botão de cenas, cada pasta abre e fecha (lembrado neste aparelho). A cena que um marcador do Mapa-múndi
  abre ganha o ícone do mundo (`Nuvem.noMundo`, lido dos mapas da mesa).
- **Gerar um vilarejo…** (`Vila`, `10d-vila.js`): tamanho (aldeia ou vila), terreno, rio, paliçada e quantas casas,
  com a prévia e "Gerar outro". O plano é uma conta pura (`Vila.gerar`, pela semente); a cena nova sai com o fundo
  pintado (na mesa, vira arquivo no Storage) e, por cima, tudo editável: as paredes de cada casa com uma porta, os
  móveis (objetos de cenário), o nome em cima (um texto), o poço e os lampiões da praça, a paliçada com os portões
  abertos. A névoa dinâmica vem ligada (as paredes bloqueiam a visão).
- **Os itens complementares na janelinha E**: o "com Espada de gelo" numa linha embaixo do nome, e "sem efeito ·
  precisa de …" quando está equipado sem o requisito.

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
  andando 10 por tempo, leva dois tempos. Com mais de um grupo viajando, "com todos" leva todos no mesmo tempo.
  "Passar o dia" (e ir para uma data) começa o dia no primeiro tempo de marcha. O grupo de antes (só com os cubos por
  dia) anda um décimo disso por tempo; `cubos` (por dia) continua no grupo, para o site de antes.
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
- **O desenho em cada hexágono** (lote 6, `grade.des`, ligado de começo): o terreno pintado hexágono por hexágono vai
  para um canvas entre o desenho à mão e as camadas do mapa — a cor (meio transparente, como antes) e a composição do
  terreno (as árvores da floresta, os picos da montanha, as fileiras da lavoura, as rachaduras da lava…), variada de
  um hexágono para outro: a semente é o lugar do hexágono, então o mesmo sai sempre igual, para o mestre e para quem
  joga. Não são carimbos (não contam como objetos). Desligado ("Desenho em cada hexágono", aba Terreno), só a cor.
  Como antes, aparece com a grade (e, para o mestre, com a ferramenta Terreno).
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
- **A ordem das camadas** (de baixo para cima): hexágonos, regiões, linhas, carimbos, zonas de guerra, os nomes das
  regiões (`c-nreg`), textos, frentes, rotas, eventos, marcadores, névoa, grupos. A área da região fica por baixo das
  estradas, dos rios e dos carimbos; o nome dela, por cima.
- **A zona de guerra** (ferramenta Frente → "Zona de guerra", `k: 'z'`): a área das duas facções, em listras nas
  cores delas, com começo e fim (como o evento); pulsa enquanto acontece. As fases (`fases: [{ dia, pts }]`) mudam a
  forma com o tempo: vale a da última fase que já começou; "Mudar a forma a partir de hoje" cria uma, e as alças do
  mapa mexem na forma do dia que está na tela. Os jogadores só recebem a zona ativa, com a forma de hoje — sem as
  fases que vêm, sem o fim planejado e sem facção escondida.

### O acampamento

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
  `arvore:` → Árvore, `rol:` → Rolador): só quem mestra a aba recebe e grava os documentos de mestre dela. As fichas
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
- **Imagens que foram trocadas** (um retrato, o fundo de uma cena) continuam no Storage até a mesa ser apagada.
  Apagar a mesa apaga a pasta dela; a função `faxina` (em `supabase/functions/`) apaga as pastas de mesas que não
  existem mais — o que sobrou de antes disso, ou de um apagar que parou no meio.

## Testes

```
cd src/cenas && ./build.sh && cd test && for f in unit unit2 unit3 unit4 unit5 unit6 unit7 v3 v4 v5 e2e ui2 faixa negativa combate lote6 lote6b; do node $f.js; done
cd src/tests && for f in dice rules auditoria juntar campanhas mundo-nucleo acampamento-nucleo site fichas fichas-regras fichas-quadros arvore arvore-lote6 mundo mundo-campanhas mundo-terreno mundo-desenho mundo-lote6 mundo-lote6b acampamento acampamento-racoes auditor; do node $f.test.js; done
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
volta —, e no banco quem escreve e quem lê a linha "para" alguém). `vivo.js` confere o site publicado.

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
complementar na janelinha E. `arvore-lote6` confere a Árvore sem mesa: a chave "Trancado", "Aberto para" e a
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
painel da facção (recursos, população, apoio, o histórico automático, o que os jogadores veem). `mundo-mesa` confere
também, pela mesa, as bolinhas, a honra e o recorte do painel da facção chegando ao jogador. `juntar` confere a conta que junta duas gravações do mesmo documento (com centenas
de rodadas ao acaso).
