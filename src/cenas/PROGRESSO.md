# Cenas · Tiny Cats — correções v3 (checklist de trabalho)

Arquivo de acompanhamento: o que já foi feito, o que foi decidido e o que vem a seguir.
Atualizado ao fim de cada item. Se o trabalho for interrompido, retomar pelo primeiro item `[ ]`.

Regra de trabalho: UM item por vez → `./build.sh` → testes do item + os existentes que ele toca → atualizar este arquivo.

## Linha de base (antes de qualquer edição)

Rodado em `test/`, com `node <arquivo>`:

| arquivo | resultado |
|---|---|
| unit.js | 61 verificações |
| unit2.js | 89 |
| e2e.js | 72 |
| ui2.js | 65 |
| stress.js | 7 |
| v2.js | 140 |
| v2b.js | 47 |
| v2c.js | 23 |
| reduce2.js | 3 |
| tour-sizes.js | 21 |
| narrow2.js | 22 |
| ui.js (v1, antigo) | 22 passos "ok", saída 0 |
| fuzz.js | ok, 1500 ações |
| perf2.js | sem erros no console |

`./build.sh` é reprodutível (o md5 de `cenas-de-urgm.html` e `test/page.html` não muda).

## Ordem e estado

- [x] 5 — desenho/texto travado: selecionar com dois cliques e apagar
      `09-tools.js`: `lockedAt`, `hover` (dica), `T.select.down` (gesto `stuck`), `T.select.dbl`, `Tools.hint`; `10-ui.js`: `UI.hint`, textos do painel do desenho.
      Testes: `v3.js` seção "5 travado" (25); `e2e.js` 72 e `ui2.js` 65 continuam passando.
- [x] 7 — número flutuante com o nome da barra
      `07-app.js`: `floatDelta` (nome na frente: "Vida −8"); `11-boot.js`: `barFloats` passa o nome sempre.
      Testes: `v3.js` seção "7 flutuante" (10); `unit2.js` 89, `v2.js` 140, `v2c.js` 23, `reduce2.js` 3.
- [x] 6 — abertura sobre parede "corta" a parede (ajudante com cache)
      Novo `src/js/03b-walls.js`: `Walls.of(sc)` → `{ stamp, sight, curtains, sightAll, move, pieces, openings }`,
      `Walls.blocksMove`, `Walls.dist`, `Walls.invalidate`. `01-base.js`: `isOpening`. `05-vision.js`: `segsOf` usa `sightAll`.
      `09-tools.js`: `blockedPath` e `hitWall` (só os restos da parede; empilhadas alternam a cada clique).
      `08-render.js`: `drawWalls` desenha só os restos. `11-boot.js`: `Walls` no apoio de teste.
      Testes: `unit3.js` (42), `v3.js` seção "6 abertura sobre parede" (16); unit 61, unit2 89, e2e 72, ui2 65, stress 7, v2 140, v2c 23, ui 22, fuzz ok.
- [x] 8 + 9 — janela e cortina abrem e fecham; cortina fechada só deixa ver quem está encostado
      `01-base.js`: `wallOpen`, `wallBlocksSight`, `wallBlocksMove` (tabela nova), `OPENING_NAMES`, ícones `windowOpen` e `veilOpen`,
      rótulo da permissão `portas`, `normalizeScene` (open/locked/secret viram sim/não).
      `03b-walls.js`: `curtainNear`, `sightFor(sc, token)`. `05-vision.js`: `computeVis(sc, quem, …)` usa `Walls.sightFor` por token; luz usa `sightAll`.
      `07-app.js`: `doorSpots` (ícones, com afastamento quando empilhados), `Act.toggleDoor` (porta, janela, cortina; avisos).
      `08-render.js`: `drawOpening` (era `drawDoor`), traço das abertas em `drawWalls`. `09-tools.js`: `hitDoor` por `doorSpots`.
      `10-ui.js`: `wallPanel` (interruptor `#wl-open` com rótulo de estado e `#wl-lock` para os três tipos), `WALL_SEG`, `WALL_NOTES`.
      Testes: `unit3.js` (64 no total), `v3.js` seções "8 abrir e fechar" (41), "9 cortina" (17), "8 9 janela e cortina juntas" (7);
      e2e 72, ui2 65, stress 7, v2 140, v2b 47, v2c 23, ui 22, fuzz ok. Capturas: `v3/03a`, `03b`, `04`.
- [x] 3 — véu do mestre no lugar dos contornos
      `07-app.js`: `veilState(sc)` → `null | { tok }`. `05-vision.js`: saiu `out.outlines`; entraram `out.veil`/`out.veilOf`, `selChanged`,
      `setVeilColor`; `update` virou embrulho de `compute` (falhou no meio → `dirty` volta a ser verdadeiro).
      `08-render.js`: saiu `drawOutlines`; o véu é desenhado depois da névoa e antes da interface; `readTheme` passa `--veil` à visão.
      `10-ui.js`: `setVeil`, `renderVeil` (legenda `#veilchip` com `#veilText` e `#veilOff`), rótulo do interruptor `#sc-showvis`,
      `renderAll` protege a chamada da visão. `11-boot.js`: evento `sel` chama `Vision.selChanged()`.
      `style.css`: token `--veil` (escuro e claro), `.veilchip`, `.foot-r`. `body.html`: `#veilchip` dentro de `.foot-r`, acima de `#status`.
      Testes: `v3.js` seções "3 véu" (31) e "3 véu tema dark/light" (6 + 6); v2 140, v2c 23, e2e 72, ui2 65, stress 7, narrow2 22,
      tour-sizes 21, reduce2 3, ui 22, fuzz ok. Capturas: `v3/01-veu-grupo`, `01b-veu-grupo-tema-claro`, `02-veu-um-token`.
- [x] 1 + 2 + 4 — turnos por rodada, iniciativa 1d20 + bônus, entrada avulsa com janela
      `01-base.js`: `rollDie`, `Ext`, `MAX_TURNS`, `clampTurns`, `clampIni`, ícone `die`, `newToken` (`ini`, `turns`), `normalizeScene`
      (tokens e entradas da ordem). `07-app.js`: `turnEntry`, `turnGroup`, `turnLabel`, `turnName`, `turnBonus`, `rollText`, `turnSort`,
      `turnRenumber`, `turnKeepCur`; `Act.turnAdd`, `turnLoose`, `turnPatch` (vez passa à entrada seguinte), `turnRemove`, `tokenTurns`,
      `turnRoll`; `Act.turnStep` (duração desconta ao sair do turno de menor k); `Act.deleteSel` (vez passa adiante).
      `10-ui.js`: `stepper`, seção "Turnos" do painel do token (`#tk-ini`, `#tk-turns`, `#tk-toturn`), `tabTurn` (linhas com `.turn-t`,
      `.turn-k`, `.turn-r`, dado `#tr-<id>`; `#turnRoll`, `#turnLoose`), `rollToast`, `rollAll`, `looseBox` (`#dlg-in`, `#le-ini`, `#le-turns`),
      rótulo na faixa "Vez de…". `11-boot.js`: `Ext` e `rollDie` no apoio de teste; `buildSample` passa por `normalizeScene`.
      `style.css`: `.turn-t`, `.turn-k`, `.turn-r`, `.turn-d`, `.field > .stp`, `.loose`; linha de turno um pouco mais justa.
      Testes: `unit3.js` (130 no total), `v3.js` seção "1 2 4 turnos" (50); unit 61, unit2 89, e2e 72, ui2 65, v2 140, v2b 47, v2c 23,
      narrow2 22, tour-sizes 21, ui 22, fuzz ok. Capturas: `v3/06-turnos-chefe-e-iniciativas`, `v3/07-entrada-avulsa`.
- [x] 10 — área de efeito retangular
      `06-fx.js`: `geom` com o ramo `rect` (devolve também `hw`, `hh`, `lab`). `07-app.js`: `App.opt.fxRW`, `fxRH`, `fxDir`.
      `01-base.js`: `normalizeScene` (efeitos ganham `rw`/`rh`). `08-render.js`: `drawDurations` (rótulo junto do lado mais alto do retângulo).
      `09-tools.js`: `fxFromOpt`, `dragRect`, `T.fx` (dica própria, arrasto pela diagonal, rótulo "3 × 2 q"), `handles` (alça `fxbox` no canto),
      `moveHandle` (bolinha gira + largura; canto muda largura e altura). `10-ui.js`: `FX_SHAPES`, `fxSize`, opções da ferramenta
      (`#o-fxrw`, `#o-fxrh`, `#o-fxdir`), painel do efeito (`#fx-rw`, `#fx-rh`, "Rotação (°)"), linha da aba Efeitos.
      Testes: `unit3.js` (132 no total), `v3.js` seção "10 retângulo" (40); unit 61, unit2 89, e2e 72, ui2 65, stress 7, v2 140, v2c 23, ui 22, fuzz ok.
- [x] 11 — "Reaplicar" nas áreas de efeito
      `01-base.js`: `cleanApply`, `normalizeScene` (`e.apply`). `07-app.js`: `applyLabel`, `Act.areaApply(rows, barra, texto, cond, keep, rótulo)`
      (guarda `e.apply` no mesmo passo), `Act.fxReapply(e)` → `{ inside, n }`. `09-tools.js`: `fxFromOpt` (`apply: null`).
      `10-ui.js`: `areaBox(título, tokens, skipId, fx)` (guarda e reabre com a última configuração), `fxApply`, `fxReapply` (avisos),
      painel do efeito (`#fx-reapply` + `#fx-apply`, agora logo abaixo do cabeçalho), linha da aba Efeitos (`#fxr-<id>` ou `#fxa-<id>`),
      menu do botão direito. `style.css`: `.li.li2`, `.li-row`, `.li-x`, `.btn.re`, `.field.tight`.
      Testes: `unit3.js` (144 no total), `v3.js` seção "11 reaplicar" (34); unit 61, unit2 89, e2e 72, ui2 65, v2 140, v2c 23, narrow2 22, ui 22, fuzz ok.
      Captura: `v3/05-retangulo-com-reaplicar`.
- [x] 12 — troca de marca (Tiny Cats)
      `10-ui.js`: marca "Tiny Cats" no topo, `document.title`, `FILE_SCENE`/`FILE_TABLE`/`FILE_VERSION` (grava) e
      `FILE_SCENE_IDS`/`FILE_TABLE_IDS` (aceita na importação), nomes dos arquivos. `10b-tour.js`: `SEEN_KEY` (`tinycats-tour`) e
      `SEEN_KEY_OLD` (`urgm-tour`, só lida). `11-boot.js`: `window.__tc = window.__urgm`. `01-base.js`: cabeçalho. `build.sh`: título.
      Ficam como estavam (internos): banco `cenas-de-urgm` no IndexedDB, saída `cenas-de-urgm.html`, `window.__urgm`.
      Testes: `v3.js` seções "12 marca" (24: varredura do nome antigo em abas, ferramentas, menus, atalhos, tutorial e visão do
      jogador; arquivos novos; importação de `urgm-cena`/`urgm-mesa` v1 gravados pela página da v1 de verdade e v2 feitos à mão;
      formato desconhecido recusado) e "12 tutorial" (6). e2e 72, ui2 65, v2b 47 (com as asserções abaixo trocadas).
- [x] 13 — página do site (`/cenas/index.html`)
      `build.sh`: `head_parts`/`body_parts` montam as três saídas; a nova é `../../cenas/index.html` (documento completo, pt-BR).
      O fragmento e `test/page.html` saem byte a byte iguais ao que saíam. `style.css`: `[hidden] { display: none !important }` e o
      recorte da tela (`:root { padding: env(safe-area…) }`), que antes vinham do esqueleto do publicador. `10-ui.js`: `hosted`,
      `browserDownload`, `saveFile` (sem o recurso do visualizador: Blob + `<a download>`). `test/lib.js`: `open({ root, debug })`.
      Testes: `v3.js` seção "13 página do site" (48): o arquivo gerado, visitante sem `?debug` (tutorial, sem erros, cena desenhada,
      exportar baixa, importar, recarregar), dois temas, tela de celular, dentro de moldura (baixa; e moldura que proíbe downloads →
      "Copiar"), e o visualizador simulado (com o recurso, sem o recurso solto, sem o recurso na moldura).
      Todos os arquivos de teste antigos continuam passando. Capturas: `v3/08-pagina-do-site`, `08b-pagina-do-site-tema-claro`.
- [x] testes `test/v3.js` + `test/unit3.js` fechados, fuzz estendido, capturas em `test/v3/`
      `fuzz.js` ampliado (23 das 24 ações de antes continuam iguais; a que tirava uma entrada da ordem "na mão" virou a ação de
      verdade, `Act.turnRemove`): +31 ações da v3 (turnos por rodada, iniciativa, avulsas, aberturas sobre paredes, cortina com token
      encostado, véu com seleção mista, retângulo, aplicar/reaplicar), 8 delas pela interface (clicam nos botões da aba Turnos e
      dos painéis, preenchem janelas). A cada passo confere:
      os dados (entradas por token = turnos por rodada, k = 1…n, rolagem que fecha com a iniciativa, `apply` bem formado, paredes
      com sim/não), o cache das paredes efetivas contra uma conta do zero, a visão (névoa, véu, escuridão) contra uma conta do zero,
      que a ação virou no máximo UM passo de desfazer, e que desfazer/refazer devolvem a cena exatamente. Semente e passos pela linha
      de comando (`node fuzz.js 7 2000`); os dados e ids seguem a semente. Rodado com 13 sementes (1500 a 2000 passos): limpo.
      O que ele achou e foi corrigido:
        · `Act.areaApply` com "nada a aplicar" (valor vazio/zero, sem condição) apagava a configuração guardada no efeito. Agora não
          mexe. `cleanApply` passou a tratar zero e texto inválido como "sem valor" (`areaAmount` foi para o 01-base.js). `unit3.js`.
          (Pela janela isso não acontecia: ela recusa "nada a aplicar". Era só pela chamada direta.)
        · trocar a forma para Retângulo num efeito que chegasse sem `rw`/`rh` deixava as medidas vazias: o painel completa.
          (Só com dados que não passaram pelo `normalizeScene`.)
      Conferi que as verificações novas pegam erro de verdade quebrando o código de propósito e desfazendo depois (cache das paredes
      sem invalidar, mover token sem refazer a visão, seleção sem avisar o véu, diminuir turnos sem tirar entradas): as quatro acusaram.
      Achados na revisão final (o fuzz NÃO chega neles sozinho; cada um tem teste que falha no código de antes):
        · `pruneSel` encolhia a seleção sem avisar ninguém: com token + efeito selecionados e o véu ligado, apagar o efeito (aba
          Efeitos, desfazer, efeito que acaba) deixava a legenda em "visão de Fulano" e o mapa ainda no véu do grupo.
          Agora `pruneSel` emite `sel` (07-app.js). Teste: `v3.js`, seção do véu.
        · fresta entre a parede e uma abertura fechada desenhada até ~4 px fora da linha dela (ver "Item 6" nas decisões).
          Teste: `unit3.js`.
        · ícone de abertura trancada: o cadeado trocava o desenho do tipo, e janela + cortina trancadas ficavam iguais (ver
          "Item 8 (extra)"). Teste: `v3.js`, seção "janela e cortina juntas"; captura `04b`.

## Estado final (todos rodados depois da última alteração)

| arquivo | resultado |
|---|---|
| unit.js | 61 |
| unit2.js | 89 |
| unit3.js (novo) | 153 |
| e2e.js | 72 |
| ui2.js | 65 |
| stress.js | 7 |
| v2.js | 140 |
| v2b.js | 47 |
| v2c.js | 23 |
| reduce2.js | 3 |
| tour-sizes.js | 21 |
| narrow2.js | 22 |
| ui.js | 22 passos "ok", saída 0 |
| v3.js (novo) | 368: travado 25 · flutuante 10 · abertura sobre parede 16 · abrir e fechar 41 · cortina 17 · janela e cortina juntas 10 · véu 33 + 7 + 7 · turnos 50 · retângulo 40 · reaplicar 34 · marca 24 · tutorial 6 · página do site 48 |
| fuzz.js | ok, 1500 ações (e mais 12 sementes) |
| perf2.js | sem erros no console; quadro de 0,7 a 3,3 ms; véu na cena 100 × 80: ~25 ms por recálculo |

Capturas em `test/v3/` (refeitas a cada rodada do `v3.js`): `01-veu-grupo`, `01b-veu-grupo-tema-claro`, `02-veu-um-token`,
`03a-cortina-encostado`, `03b-cortina-um-quadrado-longe`, `04-janela-e-cortina` (de perto, 2×), `04b-trancadas-janela-fechada-cortina-aberta`
(de perto), `05-retangulo-com-reaplicar`, `06-turnos-chefe-e-iniciativas`, `07-entrada-avulsa`, `08-pagina-do-site`, `08b-pagina-do-site-tema-claro`.

## Asserções existentes que mudam de propósito (anotar ao mexer)

- `unit2.js` (1): `floatDelta(A, 5, 'SP')` passou de `'+5 SP'` para `'SP +5'` (item 7: nome na frente).
- `v2.js` (4): textos dos números flutuantes — `'−12,−6'` → `'Vida −12,Vida −6'`; `'+1'` → `'Vida +1'`;
  `'−4 SP'` → `'SP −4'`; `'−2'` → `'Vida −2'` (item 7: toda barra leva o nome, inclusive a primeira).
- `v2.js` (3 + 1 texto): `Vision.out.outlines.length === 0` → `Vision.out.veil === null` (desligado por padrão);
  `outlines.length === 1` → `!!out.veil && out.veilOf === '*'` (ligado: véu do grupo; a preferência salva é a mesma);
  jogador: `outlines.length === 0` → `out.veil === null`. A mensagem do teste de recarga trocou "contorno" por "véu" (a conta é a mesma).
- `perf2.js` (não é teste, só sonda): rótulos "contorno" → "véu".
- `e2e.js` (2): o arquivo exportado é `format === 'tinycats-cena'` (era `'urgm-cena'`) e se chama
  `tinycats-cena-cena-de-exemplo.json` (era `cena-cena-de-exemplo.json`) — item 12.
- `ui2.js` (1): exportar tudo dá `format === 'tinycats-mesa'` (era `'urgm-mesa'`) — item 12.
- `v2b.js` (1): o arquivo novo é `'tinycats-mesa'` com `version === 3` (era `'urgm-mesa'`, versão 2). A parte desse teste que
  IMPORTA um arquivo gravado pela v1 (`urgm-*`, versão 1) não mudou e continua passando — item 12.

## Decisões tomadas no desenho (o que a especificação não fechou)

Tomadas na leitura do código; valem para os itens abaixo, salvo nota em contrário quando o item for feito.

- **Item 5**: arrastar um desenho travado e selecionado usa o mesmo gesto "stuck" dos tokens travados
  (aviso `Travado: destrave para mover`); a linha de dica mostra o mesmo texto enquanto o cursor está
  sobre ele. Texto travado: dois cliques selecionam (não abre a edição). Shift+clique no travado selecionado
  tira-o da seleção. O rótulo do interruptor virou só "Travado" (antes "Travado (não seleciona com clique)").
- **Textos da especificação**: os avisos e rótulos citados na especificação entram exatamente como escritos
  (inclusive sem ponto final quando ela não põe), para um teste de igualdade exata passar.
- **Item 6**: ajudante `Walls` num arquivo novo `src/js/03b-walls.js` (entra na ordem depois de `03-geo.js`).
  Cache por cena, invalidado pelos eventos `live` do Store em `walls` (e por `Walls.invalidate()`).
  Tolerâncias proporcionais ao quadrado: 4 px e 2 px valem para o quadrado padrão de 64 px.
  Aberturas não cortam umas às outras; só a parede comum é cortada. Sobra de parede menor que a tolerância
  (um "caco" de 2 px na ponta) é descartada. Parede totalmente coberta não é clicável enquanto a abertura existir.
  Porta ABERTA sobre parede também passou a liberar o vão (antes a parede de baixo barrava): mesma regra.
  Onde a abertura corta, o resto da parede termina NA PONTA DA ABERTURA (não no ponto da linha da parede em frente a ela).
  Motivo: a regra aceita abertura até ~4 px fora da linha; com o resto terminando na linha, sobrava entre a parede e a porta
  FECHADA uma fresta por onde a visão passava (e, em dois passos livres, um token). Com abertura exatamente em cima da parede
  (o caso comum, tudo encaixado na grade) o resultado é idêntico ao de antes. Testes em `unit3.js` (falham no corte antigo).
- **Item 8**: o interruptor `#wl-open` continua sendo um interruptor (o teste `ui2.js` usa), com o rótulo
  mostrando o estado (Aberta / Fechada). Porta também passa a avisar "Porta aberta/fechada", por coerência.
  Ícones empilhados se afastam ao longo do trecho (24 px de tela entre centros).
- **Item 9**: luz não é "quem olha": cortina fechada sempre barra a luz (encostado nela, o outro lado só aparece
  se estiver iluminado por lá ou se o token enxergar no escuro).
- **Item 8 (extra)**: o ícone diz sempre o tipo e o estado (aro claro = fechada, verde = aberta). Trancada, só para o mestre:
  um cadeado pequeno no canto do ícone, e o aro vermelho enquanto está fechada. Antes (nas portas) o cadeado TROCAVA o desenho;
  com janela e cortina trancadas uma em cima da outra os dois ícones ficavam iguais e não dava para ver se a trancada estava aberta.
  `normalizeScene` zera `secret` em quem não é porta. Nota da cortina no painel deixou de citar "parede ilusória"
  (agora ela tem ícone clicável que os jogadores veem).
- **Item 3**: com um token selecionado que NÃO enxerga (`vis.on` desligado), o véu fica no modo grupo.
  Cor do véu vem de um token de tema `--veil` (escuro: `rgba(6,9,20,.52)`; claro: `rgba(16,24,48,.5)`).
  O × da legenda desliga e avisa "Véu desligado." com "Desfazer" (é preferência, não entra no desfazer da cena).
  A legenda fica no canto de BAIXO à direita do mapa, acima da linha de estado: no canto de cima ela cobria a segunda
  linha das opções da ferramenta em telas de ~1100 px. Estando no fluxo da base, não cobre nada.
  O véu inclui o que a névoa manual revela e exclui o que ela esconde (é a mesma conta do jogador).
- **Itens 1/2/4**: entradas novas (por `turns` maior) entram no fim da ordem, sem iniciativa.
  Duração de condição desconta ao sair do turno de MENOR `k` do token (igual a k = 1 nos dados coerentes).
  Quando a entrada da vez some, a vez passa para a seguinte; se era a última, vai para a primeira sem mudar a rodada
  (vale para `turnPatch`, `turnRemove`, `tokenTurns` e apagar token; antes ia sempre para a primeira).
  O dado da linha não fica dentro de `.turn-a` (o `ui2.js` conta os botões dali por posição).
  O "Ordenar por iniciativa" passou a usar a mesma regra da rolagem (empate: maior bônus; depois a ordem que estava).
  Digitar a iniciativa à mão apaga o detalhe da rolagem daquela linha (`roll = null`) e NÃO reordena sozinho.
  O detalhe "(12 + 5)" aparece só para o mestre; o jogador vê o total. Tirar um turno extra pelo × avisa
  "Capitão agora tem 1 turno por rodada." com Desfazer. Botões da aba em duas linhas: Rolar iniciativa, Iniciar/Encerrar /
  Ordenar por iniciativa, Limpar. A cena de exemplo NÃO ganhou chefe de 2 turnos (os testes antigos contam 6 entradas).
  `Ext.roll` é chamado depois de a rolagem estar gravada, uma vez por entrada; erro de quem escuta é registrado e ignorado.
  `normalizeScene` só mantém o detalhe `roll` de uma entrada se ele fecha com a iniciativa (d + b = init); senão vira valor digitado.
  Não dá para APAGAR uma iniciativa esvaziando o campo (o campo volta ao valor de antes): já era assim, não mexi.
- **Item 10**: retângulo usa campos próprios `rw` e `rh` (não reaproveita `w`, que é a largura da linha).
  Centro em `x,y`; preso a token, fica centrado nele (sem somar o meio-token). Um clique solta no tamanho das opções,
  centrado no ponto; arrastar desenha de canto a canto (preso a token: cresce a partir do centro). A rotação vem das
  opções (`fxDir`, de 15 em 15°); a diagonal arrastada é lida nos eixos do retângulo girado, e o canto onde o botão
  desceu continua sendo um canto. Efeito antigo ganha `rw = rh = 2 × r` (a caixa do que ele já era).
  Selecionado, tem duas alças: bolinha no meio do lado (gira + largura) e quadradinho no canto (largura + altura, centro parado).
- **Item 11**: `e.apply = { bar, amt, cond: { id, n, d } | null, skip: [ids] }`. `skip` = quem foi desmarcado na janela
  (continua de fora no reaplicar; é o que evita queimar o dono de um efeito preso a ele). O ½ NÃO é guardado: é por
  evento (quem resistiu daquela vez); o reaplicar dá o valor inteiro a todos os de dentro.
  Com configuração guardada: painel e menu mostram o Reaplicar E a entrada normal (para poder mudar a configuração);
  a linha da aba Efeitos mostra só o Reaplicar (numa segunda linha). Sem configuração: a entrada normal nos três lugares
  (a linha da aba Efeitos ganhou um botão de ícone para isso; antes não tinha nenhum).
  A janela de aplicar, aberta de um efeito que já tem configuração, reabre preenchida com ela.
  "em N tokens" conta quem mudou de fato. Se ninguém muda: "Fogo: nada mudou em quem está dentro da área." (sem passo de desfazer).
  As ações de aplicar/reaplicar subiram para o alto do painel do efeito (antes ficavam no fim, abaixo da dobra em telas baixas).
  Rótulo com condição: "Reaplicar −8 Vida + Queimando"; só condição: "Reaplicar Queimando".
- **Item 12**: formato novo `tinycats-cena` / `tinycats-mesa`, `version: 3`; arquivos
  `tinycats-cena-<nome>.json` e `tinycats-cenas.json`. Chave nova do tutorial: `tinycats-tour` (a antiga é lida, nunca mais escrita).
  Nome do IndexedDB e `cenas-de-urgm.html` (saída do build) ficam como estão. A versão do arquivo subiu para 3 porque os dados
  ganharam campos (turnos, iniciativa, `rw`/`rh`, `apply`); a importação não olha a versão, só o formato: `normalizeScene` completa.
  A versão ANTIGA da mesa não abre arquivo novo (o formato mudou de nome): só importa o caminho velho → novo.
- **Item 13**: sem o visualizador (`window.claude.use` ausente), sempre Blob + `<a download>`, inclusive dentro de moldura.
  Dentro de moldura não dá para saber se o navegador aceitou o download; então o aviso lá é "Download pedido ao navegador."
  com a ação "Não baixou? Copiar" (abre a janela de copiar que já existia). Fora de moldura: "Arquivo enviado para a pasta de
  downloads.", como era. Com o visualizador presente: usa o recurso dele; se ele não der o recurso e a página estiver na moldura
  dele, abre direto a janela de copiar (como antes). A página do site não tem ícone próprio (`<link rel="icon">`): fica para o
  site decidir um para todas as páginas. Tema: sem visualizador, a página segue o tema do sistema (escuro quando não há preferência).
  `[hidden]{display:none!important}` e o recorte da tela passam a morar no `style.css` (antes vinham do esqueleto do publicador).

## Campos novos (preencher conforme forem entrando)

| onde | campo | padrão | normalizado em |
|---|---|---|---|
| token | `ini` (inteiro, −99…99) | 0 | `newToken` + `normalizeScene` (`clampIni`) |
| token | `turns` (inteiro, 1…4) | 1 | `newToken` + `normalizeScene` (`clampTurns`) |
| entrada da ordem | `k` (1…) | 1 | `normalizeScene` |
| entrada da ordem | `roll` (`{ d, b }` ou `null`) | `null` | `normalizeScene` |
| entrada avulsa | `bonus` (−99…99) | 0 | `normalizeScene` |
| entrada avulsa | `grp` (id do grupo ou `null`) | `null` | `normalizeScene` |
| efeito | `rw`, `rh` (quadrados; só valem com `k: 'rect'`) | `2 × r` nos antigos; opções da ferramenta nos novos | `normalizeScene` |
| efeito | `k` aceita `'rect'` | — | — |
| efeito | `apply` (`{ bar, amt, cond: { id, n, d } ou null, skip: [ids] }` ou `null`) | `null` | `normalizeScene` (`cleanApply`: valor zero ou inválido vira `''`; sem valor nem condição vira `null`) |
| parede | `open`, `locked`, `secret` passam a ser sempre sim/não (janela e cortina usam `open`/`locked`) | `false` | `normalizeScene` |

## Frágil / observar

- `cenas/index.html` (página do site) é PRODUTO do `build.sh`: mexeu em `src/`, rodar o build e levar o arquivo junto. Hoje ele
  não está no `.gitignore` (certo: é o que o site serve), mas nada impede de ficar velho se alguém esquecer o build.
- O `.gitignore` da raiz ignora `src/**/test/v2/` e os `*.png`/`*.json` soltos em `test/`, mas não `test/v3/`: as capturas da v3
  entram no repositório se ninguém acrescentar a pasta lá (não mexi: é fora de `src/cenas`).
- Página do site dentro de moldura de outra página: o download é pedido ao navegador e não há como saber se ele aceitou; por isso o
  aviso "Download pedido ao navegador." com "Não baixou? Copiar". O aviso some em 6,5 s; depois disso é exportar de novo.
- A página do site segue o tema do sistema (claro ou escuro). As outras páginas do site hoje são só escuras.

- `doorSpots` roda a cada quadro (e a cada movimento do mouse na ferramenta Selecionar). Medido com 225 aberturas:
  0,14 ms para o mestre; ~0,8 ms para o jogador (duas leituras de pixel por abertura em `doorSeen`). Cena comum: desprezível.
- JÁ EXISTIA, não mexi: a faixa "Vez de…" usa `top: 60px` quando há opções de ferramenta; se as opções quebram em
  duas linhas (tela de ~1100 px, ferramenta de efeito), a faixa fica por cima da segunda linha por alguns segundos.
- Com o véu ligado, a base do mapa ganha uma linha (legenda), e a faixa do token sobe ~36 px.
- O agrupamento de ícones empilhados é por proximidade do ponto médio; três portas coladas em sequência podem,
  depois de afastadas, encostar numa quarta (não tratado).
