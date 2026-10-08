# Tiny Cats · Sistema de RPG

Site único com os sistemas da mesa, publicado em <https://dalkrs.github.io/>:

| Aba | O que é |
|---|---|
| **Cenas** | O mapa tático: tokens, barras (com sobrevida e, quando a ficha manda, abaixo de zero), condições, turnos, paredes, luz, névoa, efeitos, terreno com altura, a bolsa do personagem usada pelo token — e o combate: rolar atributo pelo token (F), disputa (C), puxar um grupo das Fichas e o ataque com defesa. |
| **Mapa-múndi** | O mapa do mundo da campanha: a grade de hexágonos com o terreno de cada um, marcadores, grupos viajando (em cubos, de hexágono em hexágono), regiões e facções, calendário, névoa e rumores. |
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
- **Mestre auxiliar.** No menu da mesa, o mestre pode dar a um jogador o papel de mestre auxiliar ("Papel…") e
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
  a defesa do personagem dele.

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
  `auxiliar` ou `jogador`; o auxiliar tem ainda `jogando` (está jogando como jogador) e `abas` (as que ele mestra).
- `campanhas` e `campanha_membros`: as campanhas da mesa (nome, ordem, encerrada) e quem participa de cada uma. De
  que campanha é cada coisa fica na linha dela: `personagens.campanha` e `registro.campanha` (uma, ou nenhuma) e
  `documentos.campanhas` (uma lista: um mapa pode ser de mais de uma). Sem campanha = do mundo. `mesas.campanhas`
  é quantas a mesa tem (para quem não participa de nenhuma saber que elas existem). Ver "As campanhas".
- `registro`: a mesa ao vivo (rolagens e conversa).
- `personagens`: uma linha por ficha, em três colunas: `ficha` (o que o personagem é: atributos, barras, itens,
  bolsas…), `skills` (a árvore: as árvores equipadas, os pontos que o personagem tem em `pontos` e onde gastou em
  `alocados`) e `estado` (o que muda no meio do jogo: o valor atual das barras em `rec`, a sobrevida em `sob`, as
  quantidades das bolsas em `qtd`, os bônus temporários em `tmp`, as moedas, Sanidade e Conforto, os
  relacionamentos em `rels`, os ferimentos em `fer`, as missões do personagem em `mis`, o XP em `xp` e a emoção — a
  aura no Acampamento — em `emo`).
- `documentos`: o resto, um documento por assunto. Cada documento é "só do mestre" ou "da mesa":
  - Mapa-múndi: `mundo:mapa:<id>` (mestre), `mundo:pub:<id>` (o que os jogadores veem) e `mundo:indice` (os nomes
    dos mapas do mundo que os jogadores podem abrir, e qual está sendo mostrado).
  - Acampamento: `acampamento` — numa mesa com campanhas, um por campanha: `acampamento@<campanha>`.
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
- **A fixa de cada turno.** Quem joga mais de uma vez por rodada (um chefe) pode ter uma fixa para cada turno
  (`token.fixas`, no painel do token, em Turnos). Na vez dele, o "Fixando" da janelinha e do painel já vem com a
  fixa daquele turno. A fixa que o mestre digita fica lembrada por token enquanto a página está aberta; não muda a
  ficha. Para os jogadores, o token de um NPC vai sem as fixas.
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
- **Terreno** (ferramenta Q, só o mestre): áreas com tipo (morro, montanha, plataforma, fosso, água, mata) e altura
  na unidade da cena, pintadas com pincel, retângulo, elipse ou polígono. É um desenho da cena com o campo
  `ter = { t, h }`, pintado logo acima do fundo, e é só visual: o token que está em cima mostra a altura junto do
  nome (▲3 m; ▼ num fosso), e o rodapé e a dica do mapa dizem o que há sob o mouse — para o jogador, só onde a névoa
  não cobre. Fora da ferramenta Terreno, a área não se deixa selecionar (é parte do mapa). Um desenho de jogador
  nunca vira terreno (`Proj.formaLimpa` não deixa passar o campo).

A casca avisa os sistemas da versão da conversa com ela (`TC.ponte.estado.v`): uma aba das Cenas aberta numa casca
que ainda não foi recarregada depois desta atualização avisa que a disputa não chegou à mesa, em vez de calar.

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
- **A viagem**: cada grupo anda os cubos por dia dele (`cubos`); o tipo de caminho da rota é só o desenho. "Andar
  1 dia" leva o grupo pelos hexágonos da rota, gastando o custo de cada um, e passa o dia (um passo de desfazer
  só). O que sobra rumo ao próximo hexágono fica guardado no andado (`prog`, em cubos): uma montanha de 15 cubos,
  andando 10 por dia, leva dois dias. A régua mede em hexágonos, em cubos e pelo terreno.
- **Para os jogadores** vão a grade, os tipos de terreno e o terreno dos hexágonos que a névoa não cobre — sem os
  custos próprios (de hexágono e de região), que são do mestre.

### O acampamento

- **As rações.** Cada descanso serve uma provisão (o mestre escolhe em Provisões, e pode trocar na hora do
  descanso, junto com quantas rações cada um come). A fila das rações é a servida primeiro e depois a lista, de cima
  para baixo; a porção de cada personagem sai dela, na ordem da roda. Quem come uma ração com efeito ganha o efeito
  dela — servida ou não; quem come duas diferentes ganha os dois, cada tipo uma vez. Rações a mais ou a menos da
  estrutura (a cozinha, o caçador) são do acampamento inteiro: não mudam quem come o quê.
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
  (`vai`). Só quem mestra o acampamento mexe; todos veem.

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
cd src/cenas && ./build.sh && cd test && for f in unit unit2 unit3 unit4 unit5 unit6 unit7 v3 v4 e2e ui2 faixa negativa combate; do node $f.js; done
cd src/tests && for f in dice rules auditoria juntar campanhas mundo-nucleo acampamento-nucleo site fichas fichas-regras fichas-quadros arvore mundo mundo-campanhas mundo-terreno acampamento acampamento-racoes auditor; do node $f.test.js; done
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
acampamento, a campanha encerrada, a Árvore, "falar como" e limpar a mesa ao vivo). `vivo.js` confere o site
publicado.

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
num token sem ficha e a disputa. `juntar` confere a conta que junta duas gravações do mesmo documento (com centenas
de rodadas ao acaso).
