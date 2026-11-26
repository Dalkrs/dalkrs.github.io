/* Tiny Cats · o guia dos puzzles (lote 209): o catálogo que a galeria do Escudo mostra (a família, o desenho, como se
   joga numa frase, as regras em três, o que o mestre ajusta, o tempo de mesa) e o tutorial do "?": uma telinha que
   joga o puzzle sozinha, passo a passo, com um cursor que aponta onde clicar — quase um vídeo, feito com o próprio
   puzzle (o Fácil, sempre o mesmo). TC.puzzlesGuia = { FAM, CAT, cat, icone, tags, niveisTexto, abrirTutorial }. */
(() => {
  'use strict';
  const T = window.TC = window.TC || {};
  const E = T.escudo, U = T.dom;
  if (!E || !U) return;
  const { h, svg } = U;

  // as famílias (os filtros da galeria): a chave, o nome, a frase e a cor
  const FAM = [
    ['palavras', 'Palavras e códigos', 'Ler, decifrar, escrever.', '#e6ab4f'],
    ['logica', 'Lógica e dedução', 'Pensar com pistas e números.', '#5b8fd9'],
    ['caminhos', 'Caminhos e mapas', 'Achar o caminho certo.', '#5aa469'],
    ['mecanismos', 'Mecanismos', 'Mexer nas peças até funcionar.', '#d4574e'],
    ['desenho', 'Desenho e encaixe', 'Imagens, peças e traços.', '#9a6ad8'],
    ['memoria', 'Olhos e memória', 'Prestar atenção e lembrar.', '#3fb8c4'],
    ['fechadura', 'Fechaduras', 'Abrir portas com gazua.', '#c9a36b'],
  ];
  const NOVOS = ['deducao', 'guardas', 'nonograma', 'somas', 'magico', 'contacifrada', 'guardas8', 'campo', 'tesouro', 'palavra', 'espelhada', 'ordem', 'diferencas',
    'torre', 'jarros', 'travessia', 'canos', 'sokoban', 'gelo', 'restaum', 'pontes', 'trilhos', 'constelacao', 'encaixar', 'bussola', 'cavalo'];
  /* tipo: [família, minutos, desenho, como se joga, [as regras em três frases], o que o mestre ajusta, o mestre escreve?] */
  const C = {
    cifra: ['palavras', '5–15', 'M4 6h16v12H4zM8 10h2M12 10h4M8 14h6', 'Cada símbolo é uma letra: descubram qual e leiam a mensagem.', ['A mensagem vem em símbolos.', 'Escrevam embaixo de cada símbolo a letra que acham.', 'Quando a mensagem faz sentido, resolveu.'], 'Você escreve a mensagem e escolhe a cifra (runas, letras trocadas ou letras andadas).', true],
    charada: ['palavras', '2–5', 'M9 9a3 3 0 1 1 4.5 2.6c-1 .6-1.5 1.2-1.5 2.4M12 17.5v.5', 'Uma charada: escrevam a resposta.', ['Leiam a charada.', 'Escrevam a resposta e confiram.', 'Resposta errada conta um erro.'], 'Sorteie do banco ou escreva a sua, com as respostas aceitas e as dicas.', true],
    luzes: ['mecanismos', '3–8', 'M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z', 'Tocar uma runa acende ou apaga ela e as vizinhas. Acendam todas.', ['Toquem uma runa.', 'Ela e as vizinhas (cima, baixo, lados) trocam de estado.', 'Todas acesas: resolvido.'], 'Só a dificuldade.', false],
    alavancas: ['mecanismos', '3–8', 'M6 20V10M12 20V6M18 20v-8M4 20h16M6 10l-2-3M12 6l2-3M18 12l2-3', 'Cada alavanca abre ou fecha certas grades. Abram todas.', ['Puxem uma alavanca e vejam quais grades mudam.', 'Uma alavanca mexe em mais de uma grade.', 'Todas as grades abertas ao mesmo tempo: resolvido.'], 'Só a dificuldade.', false],
    cadeado: ['logica', '5–10', 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 14.5v2', 'Palpites antigos dizem quantos símbolos estavam certos. Achem a combinação.', ['Leiam os palpites riscados na parede.', 'Cada um diz quantos símbolos estavam no lugar certo.', 'Montem a combinação e abram. Errar conta um erro.'], 'Sorteie, ou monte você: os discos, a combinação e os palpites.', true],
    placas: ['logica', '5–10', 'M3 17h6v3H3zM9 13h6v3H9zM15 9h6v3h-6z', 'Pisem nas placas na ordem certa; as inscrições dão as pistas.', ['Leiam as inscrições.', 'Pisem nas placas na ordem que elas dizem.', 'Ordem errada conta um erro.'], 'Sorteie, ou monte você: a ordem e as inscrições.', true],
    imagem: ['desenho', '3–10', 'M4 5h16v14H4zM12 5v14M4 12h16', 'A imagem em peças embaralhadas: troquem as peças até montar.', ['Cliquem numa peça.', 'Cliquem em outra: as duas trocam de lugar.', 'Imagem montada: resolvido.'], 'Você escolhe a imagem (um mapa, um retrato, uma pista).', true],
    cruzadas: ['palavras', '10–20', 'M4 9h16M9 4v16M4 4h5v5H4zM15 9h5v5h-5z', 'Preencham a grade com as palavras das dicas.', ['Leiam as dicas: na horizontal e na vertical.', 'Escrevam uma letra por casa.', 'Grade completa e certa: resolvido.'], 'Escolha o tema ou escreva as suas palavras com as dicas.', true],
    caca: ['palavras', '5–10', 'M4.5 10.5a6 6 0 1 0 12 0 6 6 0 1 0-12 0M15 15l5 5', 'Achem as palavras da lista na grade.', ['Procurem a palavra na grade (em reta, para qualquer lado).', 'Toquem a primeira letra e depois a última.', 'Todas achadas: resolvido.'], 'Escolha o tema ou escreva as suas palavras.', true],
    anagrama: ['palavras', '3–8', 'M4 17l3-10 3 10M5 13.5h4M14 7h4a2.5 2.5 0 0 1 0 5h-4zM14 12h4.5a2.5 2.5 0 0 1 0 5H14z', 'As letras estão embaralhadas: escrevam a palavra certa.', ['Olhem as letras de cada palavra.', 'Escrevam a palavra e confiram.', 'Errar conta um erro.'], 'Escolha o tema ou escreva as suas palavras.', true],
    labirinto: ['caminhos', '3–8', 'M4 4h16v16H4zM8 4v8h4M16 8v12M8 16h4v-4', 'Levem a marca da entrada até a saída.', ['Usem as setas ou cliquem na casa vizinha.', 'Paredes não deixam passar.', 'Chegou à bandeira: resolvido.'], 'Só a dificuldade (o difícil tem névoa).', false],
    espelhos: ['caminhos', '5–10', 'M3 12h7l6-6M16 6l4 4M10 12l3 3', 'Girem os espelhos até a luz chegar ao cristal.', ['A luz sai da fonte, à esquerda.', 'Cada clique gira um espelho e desvia a luz.', 'Luz em todos os cristais: resolvido.'], 'Só a dificuldade.', false],
    fios: ['caminhos', '5–10', 'M5 6c6 0 8 12 14 12M5 18c3 0 5-6 7-6s4-6 7-6', 'Liguem cada par de pontas da mesma cor, sem cruzar.', ['Cliquem numa ponta e puxem o fio casa a casa.', 'Os fios não se cruzam.', 'Todos ligados: resolvido.'], 'Só a dificuldade.', false],
    sudoku: ['logica', '10–20', 'M4 4h16v16H4zM9.3 4v16M14.6 4v16M4 9.3h16M4 14.6h16', 'Cada runa uma vez só em cada linha, coluna e caixa.', ['Escolham uma casa vazia.', 'Ponham uma runa que não repete na linha, na coluna nem na caixa.', 'Grade cheia e certa: resolvido.'], 'Só a dificuldade.', false],
    falsa: ['logica', '5–10', 'M12 4v16M5 7h14M5 7l-3 6h6zM19 7l-3 6h6zM8 20h8', 'Uma pedra pesa diferente. Pesem poucas vezes e apontem a falsa.', ['Ponham pedras nos dois pratos e pesem.', 'A balança diz qual lado pesa mais.', 'Apontem a falsa. Errar conta um erro.'], 'Só a dificuldade.', false],
    equilibrar: ['logica', '3–8', 'M12 4v15M4 8h16M4 8l-2 5h4zM20 8l-2 5h4zM9 19h6', 'Ponham pesos nos pratos até equilibrar o objeto.', ['Cliquem num peso para pôr num prato.', 'Somem os pesos de cada lado.', 'Soltem a balança só quando tiverem certeza.'], 'Só a dificuldade.', false],
    deslizante: ['desenho', '5–15', 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z', 'Deslizem as peças pelo espaço vazio até montar o desenho.', ['Toquem uma peça ao lado do vazio.', 'Ela escorrega para o vazio.', 'Tudo no lugar: resolvido.'], 'Runas ou uma imagem sua.', true],
    pares: ['memoria', '3–8', 'M4 6h7v12H4zM13 6h7v12h-7zM7.5 12h.01M16.5 12h.01', 'Virem as cartas de duas em duas e achem os pares.', ['Virem duas cartas.', 'Iguais ficam abertas; diferentes voltam.', 'Errar um par já visto conta um erro.'], 'Só a dificuldade.', false],
    sequencia: ['memoria', '2–5', 'M5 12h.01M11 12h.01M17 12h.01M3 18h18', 'As runas acendem em ordem. Repitam a sequência.', ['Apertem “Ver a sequência”.', 'Repitam tocando as runas na mesma ordem.', 'A cada rodada, ela cresce.'], 'Só a dificuldade.', false],
    fechadura: ['fechadura', '1–5', 'M12 3a4 4 0 0 0-2 7.5L9 20h6l-1-9.5A4 4 0 0 0 12 3z', 'Abrir uma fechadura com gazuas.', ['Escolham o jeito de abrir (girar, pinos ou um jogo de pensar).', 'Errar quebra gazua e faz barulho.', 'A aptidão da ficha ajuda ou atrapalha.'], 'O nível, o jeito, as gazuas, a aptidão e o que acontece ao errar.', false],
    deducao: ['logica', '10–20', 'M4 4h16v16H4zM4 10h16M10 4v16M13 13l2 2 3-4', 'Pelas pistas, descubram quem fez o quê.', ['Leiam as pistas.', 'Marquem ✕ no que não pode e ✓ no que é.', 'Quadro completo: apertem Conferir.'], 'Sorteie, ou escreva os nomes (seus NPCs!) e a resposta: o site escreve as pistas.', true],
    guardas: ['logica', '5–10', 'M5 13a7 7 0 0 1 14 0v3H5zM12 6V3M4 16h16v2H4z', 'Uns guardas sempre mentem. Pelo que dizem, achem a porta segura.', ['Leiam o que cada guarda diz.', 'Testem: “e se este mentir?”.', 'Abram a porta segura. Errar conta um erro.'], 'Sorteie, ou escreva as portas, os guardas e qual é a porta segura.', true],
    nonograma: ['logica', '10–25', 'M4 4h16v16H4zM8 8h4v4H8zM12 12h4v4h-4z', 'Os números dizem os blocos pintados. Pintem até o desenho aparecer.', ['Cada número é um bloco seguido de casas pintadas.', 'Pintem o que é certo; marquem ✕ o que é vazio.', 'Linhas e colunas batendo: resolvido.'], 'Só o nível.', false],
    somas: ['logica', '5–15', 'M6 9h6M9 6v6M14 15h6M14 18h6', 'Cada runa vale um número; as somas dizem quanto.', ['Olhem as somas das linhas e colunas.', 'Descubram quanto vale cada runa.', 'Tudo batendo: Conferir. Errar conta um erro.'], 'Só o nível.', false],
    magico: ['logica', '5–15', 'M4 4h16v16H4zM4 12h16M12 4v16M6 18L18 6', 'Todas as linhas, colunas e diagonais com a mesma soma.', ['Ponham os números que faltam.', 'Cada número uma vez só.', 'Todas as somas iguais: resolvido.'], 'Só o nível.', false],
    contacifrada: ['logica', '10–20', 'M4 7h6M7 4v6M4 17h16M14 7l4 4M18 7l-4 4', 'Uma conta de somar em runas. Cada runa é um algarismo.', ['Comecem pela coluna da direita.', 'Runas diferentes são algarismos diferentes.', 'Todas as runas: Conferir.'], 'Só o nível.', false],
    guardas8: ['logica', '5–15', 'M5 19h14M7 19v-3h10v3M8 16l-1-7 3 2 2-4 2 4 3-2-1 7', 'Ponham os guardas sem que nenhum veja o outro.', ['Cliquem para pôr ou tirar um guarda.', 'Um guarda vê a linha, a coluna e as diagonais.', 'Todos escondidos: resolvido.'], 'Só o nível.', false],
    campo: ['logica', '5–15', 'M12 3a7.5 7.5 0 0 0-5 13.1V20h10v-3.9A7.5 7.5 0 0 0 12 3zM9 11.5h.01M15 11.5h.01', 'Cada número conta as armadilhas em volta. Marquem todas.', ['Um número diz quantas armadilhas há nas 8 casas em volta.', 'Marquem as armadilhas e as casas seguras.', 'Todas marcadas: resolvido.'], 'Só o nível.', false],
    tesouro: ['logica', '5–15', 'M4 10h16v9H4zM4 10a8 5 0 0 1 16 0M11 12h2v3h-2z', 'Os números das bordas contam as casas com tesouro.', ['Linha com 0: só areia.', 'Os baús não se encostam, nem na diagonal.', 'Todos os baús: resolvido.'], 'Só o nível.', false],
    palavra: ['palavras', '3–8', 'M3 8h5v8H3zM9.5 8h5v8h-5zM16 8h5v8h-5z', 'Adivinhem a palavra; as cores dizem o que está certo.', ['Escrevam um palpite.', 'Verde: no lugar. Amarelo: em outro lugar. Cinza: não tem.', 'Acabaram as tentativas? Conta um erro e recomeça.'], 'Sorteie do tema ou escreva a palavra (de 4 a 8 letras).', true],
    espelhada: ['palavras', '3–10', 'M12 3v18M4 7h5M4 12h4M4 17h5M20 7h-5M20 12h-4M20 17h-5', 'A mensagem foi escrita torta. Desfaçam o truque.', ['Leiam a frase que conta o truque.', 'Desfaçam o truque (de trás para a frente, letras falsas, zigue-zague).', 'Escrevam a mensagem. Errar conta um erro.'], 'Sorteie ou escreva a mensagem.', true],
    ordem: ['palavras', '5–15', 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', 'Ponham os acontecimentos na ordem, pelas pistas.', ['Leiam as pistas (antes, depois, entre).', 'Subam e desçam os cartões.', 'Ordem montada: Conferir.'], 'Sorteie uma história ou escreva a sua (o site escreve as pistas).', true],
    diferencas: ['memoria', '3–8', 'M3 5h8v14H3zM13 5h8v14h-8zM7 12h.01M17 12h.01', 'Os dois quadros têm diferenças. Achem todas.', ['Comparem os dois quadros.', 'Cliquem onde está diferente.', 'Do nível Difícil em diante, clicar errado conta erro.'], 'Só o nível.', false],
    torre: ['mecanismos', '3–15', 'M12 4v14M7 18h10M9 15h6M10.5 12h3M4 20h16', 'Levem a pilha para o pino marcado, um disco por vez.', ['Cliquem num pino para pegar o disco de cima.', 'Cliquem no pino de destino.', 'Disco grande nunca em cima de pequeno.'], 'Só o nível.', false],
    jarros: ['mecanismos', '5–10', 'M7 4h10l-1 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7zM8 13h8', 'Encham e passem água até chegar à medida.', ['Os jarros não têm marcas: só cheio ou vazio.', 'Passem água de um para outro.', 'Chegaram à medida: resolvido.'], 'Só o nível.', false],
    travessia: ['mecanismos', '5–15', 'M3 14h18l-3 5H6zM12 14V4l6 7h-6', 'Levem todos para a outra margem sem quebrar a regra.', ['Escolham quem embarca.', 'Atravessem; às vezes, alguém volta.', 'Quebrar a regra conta um erro.'], 'Só o nível (cada nível é uma travessia diferente).', false],
    canos: ['mecanismos', '5–15', 'M3 9h8V4M3 15h12v5M15 15V8h6', 'Girem os canos até a água chegar a todos.', ['A água sai da fonte.', 'Cada clique gira um cano.', 'Tudo ligado, sem vazar: resolvido.'], 'Só o nível.', false],
    sokoban: ['mecanismos', '5–20', 'M12 3.4a2.6 2.6 0 1 0 .01 0M8.5 20v-6.5l3.5-3 3.5 3V20M6.5 20h11', 'Empurrem as estátuas até as placas.', ['Andem com as setas.', 'Estátua só se empurra, nunca se puxa.', 'Errou? “Voltar um lance”.'], 'Só o nível.', false],
    gelo: ['mecanismos', '3–10', 'M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9', 'No gelo, só se para quando bate. Parem na saída.', ['Escolham a direção.', 'O deslize vai até bater em algo.', 'Parem em cima da bandeira.'], 'Só o nível.', false],
    restaum: ['mecanismos', '3–10', 'M4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM6 8c2-4 6-4 8 0', 'Um pino pula o vizinho e o tira. Sobre um só.', ['Escolham um pino.', 'Ele pula o vizinho e cai no buraco logo depois.', 'Sobrou um: resolvido.'], 'Só o nível.', false],
    pontes: ['caminhos', '5–15', 'M5 5v.01M19 5v.01M5 19v.01M7 5h10M5 7v10', 'Liguem as ilhas com pontes; o número diz quantas.', ['Cliquem numa ilha e depois noutra na mesma linha.', 'No máximo 2 pontes entre duas ilhas; elas não se cruzam.', 'Todas ligadas e certas: resolvido.'], 'Só o nível.', false],
    trilhos: ['caminhos', '5–15', 'M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10', 'Montem o trilho; os números contam as casas com trilho.', ['O trem entra pela casa verde e sai pela vermelha.', 'Cliquem para pôr trilho.', 'Uma linha só, sem encostar nela mesma.'], 'Só o nível.', false],
    constelacao: ['desenho', '3–10', 'M4 18L9 8l6 4 5-7', 'Tracem todas as linhas sem tirar a pena.', ['Cliquem numa estrela para começar.', 'Cliquem na próxima estrela ligada.', 'Nenhuma linha repete.'], 'Só o nível.', false],
    encaixar: ['desenho', '5–15', 'M4 4h8v6H4zM12 4h8v10h-4V10h-4zM4 10h6v10H4zM10 14h10v6H10z', 'Encham o quadro com as peças.', ['Escolham uma peça.', 'Girem se precisar e cliquem no quadro.', 'Sem sobrar buraco: resolvido.'], 'Só o nível.', false],
    bussola: ['caminhos', '3–8', 'M12 3a9 9 0 1 0 .01 0M15 9l-2 5-4 1 2-5z', 'Sigam as instruções no mapa e achem o tesouro.', ['Comecem no marco dito.', 'Sigam cada instrução, uma de cada vez.', 'Cliquem onde está o tesouro. Errar conta um erro.'], 'Sorteie, ou escreva o caminho (direção e passos).', true],
    cavalo: ['caminhos', '5–15', 'M7 20h11M8 20c0-4 2-6 4-8-2 0-4 1-5 0 0-3 3-7 7-8l1 2c2 2 3 5 2 8-1 2-2 4-2 6', 'Com o pulo do cavalo, passem por todas as casas.', ['O cavalo anda em “L”.', 'Cada casa uma vez só.', 'Todas as casas: resolvido.'], 'Só o nível.', false],
  };
  const NIV3 = {
    cifra: ['Dita quantas casas andou, ou várias letras já dadas.', 'Menos ajuda.', 'Nenhuma ajuda.'], charada: ['Charadas fáceis.', 'Médias.', 'Difíceis.'],
    luzes: ['Grade 3×3.', 'Grade 4×4.', 'Grade 5×5.'], alavancas: ['4 alavancas.', '5 alavancas.', '6 alavancas.'], cadeado: ['3 símbolos.', '4 símbolos.', '5 símbolos.'], placas: ['3 placas.', '4 placas.', '5 ou 6 placas.'],
    imagem: ['3×3 peças.', '4×4 peças.', '5×5 peças.'], cruzadas: ['Poucas palavras.', '7 palavras.', 'Mais palavras.'], caca: ['Grade pequena.', 'Média, também na diagonal.', 'Grande, também de trás para a frente.'],
    anagrama: ['Palavras curtas, com começo.', 'Médias.', 'Longas.'], labirinto: ['Pequeno.', 'Médio.', 'Grande, com névoa.'], espelhos: ['1 cristal.', 'Mais espelhos.', 'Espelhos ligados e mais cristais.'],
    fios: ['5×5, 3 fios.', '6×6, 4 fios.', '7×7, 5 fios.'], sudoku: ['4×4.', '6×6.', '9×9.'], falsa: ['4 pedras, 2 pesagens.', '8 pedras.', '12 pedras; pode ser mais leve ou mais pesada.'],
    equilibrar: ['Pesos num prato só.', 'Pesos nos dois pratos.', 'Mais pesos.'], deslizante: ['3×3.', '3×3 mais embaralhado.', '4×4.'], pares: ['Poucas cartas.', 'Mais cartas.', 'Muitas cartas.'],
    sequencia: ['Sequência curta.', 'Média.', 'Longa.'], fechadura: ['O nível vem da própria fechadura.', '', ''],
  };
  const cat = tipo => {
    const c = C[tipo] || ['memoria', '5–10', 'M4 4h16v16H4z', (E.PUZZLES[tipo] || {}).desc || '', [], '', false];
    return { tipo, fam: c[0], min: c[1], ico: c[2], como: c[3], regras: c[4], mestre: c[5], escreve: !!c[6], novo: NOVOS.includes(tipo), nome: (E.PUZZLES[tipo] || {}).nome || tipo, erra: !!(E.PUZZLES[tipo] || {}).erra };
  };
  const famDe = k => FAM.find(f => f[0] === k) || FAM[0];
  const icone = (tipo, tam) => svg(tam || 22, '<path d="' + cat(tipo).ico + '"/>', '1.7');
  const niveisTexto = tipo => { const x = E.EXTRA[tipo]; return x && x.niv ? x.niv : NIV3[tipo] || []; };
  const tags = tipo => { const c = cat(tipo), n = E.niveisDe(tipo).length; return [['⏱ ' + c.min + ' min', ''], [n + ' níveis', ''], c.erra ? ['errar custa', 'erra'] : null, c.escreve ? ['✎ você escreve', 'escreve'] : null].filter(Boolean); };

  /* ---------------- os passos dos puzzles de antes (os novos trazem o seu "demo") ---------------- */
  const seq = n => [...Array(n).keys()];
  function demoAntigo(tipo, m, jg) {
    const X = E.mais || {}, s = m.seg || {}, p = m.pub;
    switch (tipo) {
      case 'cruzadas': { const tudo = {}; seq(s.sol.length).forEach(i => { if (p.mask[i] === '.') tudo['c' + i] = s.sol[i]; }); const i0 = [...p.mask].indexOf('.');
        return [{ txt: 'Leiam as dicas embaixo da grade: horizontal e vertical.', alvo: 'c' + i0 }, { txt: 'Cliquem numa casa e escrevam uma letra. O cursor pula sozinho para a próxima.', alvo: 'c' + i0, mudas: { ['c' + i0]: s.sol[i0] } }, { txt: 'Grade completa e certa: resolvido!', mudas: tudo, fim: true }]; }
      case 'caca': { const f = s.pos.map(q => [q[0], q[1], X.palavraNaLinha(p, q[0], q[1])]);
        return [{ txt: 'As palavras da lista estão escondidas na grade, em linha reta.', alvo: 'g' + s.pos[0][0] }, { txt: 'Toquem a primeira letra e depois a última da palavra.', alvo: 'g' + s.pos[0][1], mudas: { f: f.slice(0, 1) } }, { txt: 'Todas achadas: resolvido!', mudas: { f }, fim: true }]; }
      case 'anagrama': { const tudo = {}; s.ks.forEach((k, i) => { tudo['r' + i] = k; });
        return [{ txt: 'Cada linha é uma palavra com as letras embaralhadas.', alvo: 'r0' }, { txt: 'Escrevam a palavra certa e apertem Conferir. Errar conta um erro.', alvo: 'ok0' }, { txt: 'Todas certas: resolvido!', mudas: tudo, fim: true }]; }
      case 'labirinto': { const cam = X.caminhoLab ? X.caminhoLab(p, p.ini, p.fim) : null;
        return [{ txt: 'A bolinha é vocês; a bandeira é a saída.', alvo: 'm' + p.ini }, { txt: 'Cliquem na casa vizinha (ou nas setas) para andar. Paredes não deixam passar.', alvo: cam && cam[1] != null ? 'm' + cam[1] : null, mudas: cam && cam[2] != null ? { p: cam[2] } : null }, { txt: 'Chegaram: resolvido!', mudas: { p: p.fim }, fim: true }]; }
      case 'espelhos': return [{ txt: 'A luz sai da fonte, na esquerda, e bate nos espelhos.', alvo: 'e0' }, { txt: 'Cada clique num espelho gira ele e muda o caminho da luz.', alvo: 'e0' }, { txt: 'Luz no cristal: resolvido!', mudas: { o: s.sol }, fim: true }];
      case 'fios': { const tudo = {}; s.caminhos.forEach((c, i) => { tudo['f' + i] = c; }); return [{ txt: 'Cada cor tem duas pontas.', mudas: { f0: s.caminhos[0].slice(0, 2) } }, { txt: 'Cliquem numa ponta e puxem o fio, casa a casa, até a outra ponta da mesma cor. Fios não se cruzam.', mudas: { f0: s.caminhos[0] } }, { txt: 'Todos ligados: resolvido!', mudas: tudo, fim: true }]; }
      case 'sudoku': { const tudo = {}, d = String(p.dadas).split(',').map(Number); s.sol.forEach((v, i) => { if (!d[i]) tudo['c' + i] = v; }); const i0 = d.findIndex(v => !v);
        return [{ txt: 'Cada runa aparece uma vez só em cada linha, coluna e caixa.', alvo: 's' + i0 }, { txt: 'Escolham uma casa vazia e depois a runa.', alvo: 's' + i0, mudas: { ['c' + i0]: s.sol[i0] } }, { txt: 'Grade cheia e certa: resolvido!', mudas: tudo, fim: true }]; }
      case 'falsa': return [{ txt: 'Uma pedra pesa diferente das outras.', alvo: 'pesar' }, { txt: 'Ponham pedras nos dois pratos e pesem. As pesagens são poucas.', alvo: 'pesar' }, { txt: 'Apontem a falsa. Acertaram: resolvido!', fim: true }];
      case 'equilibrar': { const w = {}; for (const i in s.sol) w['w' + i] = s.sol[i];
        return [{ txt: 'Cada clique num peso muda o prato em que ele fica.', alvo: 'w0' }, { txt: 'Somem os dois lados. Equilibrou?', alvo: 'soltar', mudas: w }, { txt: 'Soltaram e equilibrou: resolvido!', fim: true }]; }
      case 'deslizante': { const pp = Array.isArray(jg.estado.p) ? jg.estado.p : seq(p.n * p.n), e = pp.indexOf(p.n * p.n - 1), v = e % p.n > 0 ? e - 1 : e + 1, v2 = e >= p.n ? e - p.n : e + p.n;
        return [{ txt: 'Toquem uma peça ao lado do espaço vazio: ela escorrega.', alvo: 'd' + v }, { txt: 'Montem a ordem de cima.', alvo: 'd' + v2 }, { txt: 'Tudo no lugar: resolvido!', mudas: { p: seq(p.n * p.n) }, fim: true }]; }
      case 'pares': return [{ txt: 'Virem duas cartas.', alvo: 'c0', mudas: { a: 0 } }, { txt: 'Iguais ficam abertas. Errar um par que já tinham visto conta um erro.', alvo: 'c1' }, { txt: 'Todos os pares: resolvido!', mudas: { m: seq(p.n), a: null }, fim: true }];
      case 'sequencia': return [{ txt: 'Apertem “Ver a sequência”: as runas acendem em ordem.', alvo: 'ver' }, { txt: 'Repitam tocando as runas. A cada rodada, ela cresce.', alvo: 'r0' }, { txt: 'Repetiram tudo: resolvido!', fim: true }];
      case 'cifra': { const tudo = {}; (p.simbolos || []).forEach((_, i) => { if (m.letras) tudo['c' + i] = m.letras[i]; });
        return [{ txt: 'Cada símbolo é sempre a mesma letra.', alvo: 'c0' }, { txt: 'Escrevam na chave a letra de cada símbolo. As palavras vão aparecendo.', alvo: 'c0', mudas: m.letras ? { c0: m.letras[0] } : null }, { txt: 'A mensagem completa: resolvido!', mudas: tudo, fim: true }]; }
      case 'charada': return [{ txt: 'Leiam a charada com calma.', alvo: 'resp' }, { txt: 'Escrevam a resposta. Errar conta um erro.', alvo: 'responder' }, { txt: 'Acertaram: resolvido!', fim: true }];
      case 'luzes': return [{ txt: 'Tocar uma runa troca ela e as vizinhas: acesa vira apagada, e vice-versa.', alvo: 'l0' }, { txt: 'O segredo é a ordem dos toques.', alvo: 'l' + Math.floor(p.n * p.n / 2) }, { txt: 'Todas acesas: resolvido!', mudas: { l: '1'.repeat(p.n * p.n) }, fim: true }];
      case 'alavancas': { let sol = null; for (let mask = 0; mask < 1 << p.n && !sol; mask++) { const est = {}; for (let i = 0; i < p.n; i++) est['a' + i] = (mask >> i) & 1 ? '1' : '0'; if (E.gradesDe(p, est) === '1'.repeat(p.m)) sol = est; }
        return [{ txt: 'Puxem uma alavanca e vejam quais grades abrem ou fecham.', alvo: 'a0' }, { txt: 'Uma alavanca mexe em várias grades.', alvo: 'a1' }, { txt: 'Todas abertas: resolvido!', mudas: sol, fim: true }]; }
      case 'cadeado': return [{ txt: 'Os palpites riscados na parede dizem quantos símbolos estavam certos.', alvo: null }, { txt: 'Montem a combinação nos discos e abram. Errar conta um erro.', alvo: 'abrir' }, { txt: 'Abriu: resolvido!', fim: true }];
      case 'placas': return [{ txt: 'As inscrições dizem a ordem das placas.', alvo: 'p0' }, { txt: 'Pisem na ordem. Errar conta um erro.', alvo: 'p1' }, { txt: 'Ordem certa: resolvido!', fim: true }];
    }
    return null;
  }

  /* ---------------- o tutorial: a telinha que joga sozinha ---------------- */
  const CURSOR = '<path d="M5 3l14 8-6 1.6L10 19z" fill="#fff" stroke="#1b1f28"/>';
  function passosDe(tipo) {
    const PUI = T.pistasUI;
    if (!PUI || tipo === 'imagem' || tipo === 'fechadura' || !E.PUZZLES[tipo]) return null;
    const niv = E.niveisDe(tipo);
    const pz = { tipo, dif: niv[0], seed: 7 };
    if (tipo === 'cifra') { pz.msg = 'A chave esta na torre'; pz.metodo = 'troca'; }
    if (tipo === 'charada') pz.idx = E.sortearCharada('facil', E.mulberry(7));
    if (['cruzadas', 'caca', 'anagrama'].includes(tipo)) pz.tema = 'taverna';
    const hh = E.normHandout({ tipo: 'puzzle', nome: cat(tipo).nome, puzzle: pz });
    const m = E.montarPuzzle(hh.puzzle), jg0 = E.normJogo(E.jogoNovo('tut', hh));
    if (!m || !jg0) return null;
    const x = E.EXTRA[tipo];
    let passos = null;
    try { passos = x && x.demo ? x.demo(m, jg0) : demoAntigo(tipo, m, jg0); } catch (e) { passos = null; }
    if (!passos || !passos.length) return null;
    let jg = jg0;
    return passos.map(ps => {
      if (ps.mudas) { const est = Object.assign({}, jg.estado); for (const k in ps.mudas) { if (ps.mudas[k] === null) delete est[k]; else est[k] = ps.mudas[k]; } jg = Object.assign({}, jg, { estado: est }); }
      const j2 = ps.fim ? Object.assign({}, jg, { resolvido: { por: null, em: new Date().toISOString() } }) : jg;
      return { txt: ps.txt, alvo: ps.alvo || null, jg: j2 };
    });
  }
  /* abrirTutorial(J, tipo, { usar }): J é o kit das janelas (tc/dom.js janelas); usar(tipo), se vier, é o botão
     "Usar este puzzle". */
  function abrirTutorial(J, tipo, op) {
    op = op || {};
    const c = cat(tipo), f = famDe(c.fam), PUI = T.pistasUI;
    const passos = passosDe(tipo);
    let k = 0, tocando = true, timer = 0;
    const palco = h('div', { class: 'tut-palco', 'aria-hidden': 'true' }), cursor = h('div', { class: 'tut-cursor' }, svg(26, CURSOR, '1.4'));
    const leg = h('div', { class: 'tut-leg', 'aria-live': 'polite' }), pontos = h('div', { class: 'tut-pontos' });
    const btPlay = h('button', { type: 'button', class: 'btn sm', 'data-k': 'tut:play' });
    const parar = () => { if (timer) clearTimeout(timer); timer = 0; };
    const agendar = () => { parar(); if (tocando && passos) timer = setTimeout(() => { k = (k + 1) % passos.length; mostrar(); }, k === passos.length - 1 ? 3600 : 3200); };
    function mostrar() {
      if (!passos) return;
      const ps = passos[k];
      let el;
      try { el = PUI.puzzle(ps.jg, { chave: 'demo:', aviso: () => {}, escolher: () => {}, jogar: () => Promise.resolve() }); } catch (e) { el = h('p', { class: 'ajuda', text: 'Não deu para mostrar este puzzle aqui.' }); }
      palco.replaceChildren(el, cursor);
      leg.replaceChildren(h('span', { class: 'tut-n', text: 'Passo ' + (k + 1) + ' de ' + passos.length }), h('p', { text: ps.txt }));
      pontos.replaceChildren(...passos.map((_, i) => h('button', { type: 'button', class: 'tut-pt' + (i === k ? ' at' : ''), 'aria-label': 'Passo ' + (i + 1), onclick: () => { k = i; mostrar(); } })));
      btPlay.textContent = tocando ? '❚❚ Pausar' : '▶ Continuar';
      const alvo = ps.alvo ? palco.querySelector('[data-k="demo:' + ps.alvo + '"]') : null;
      if (alvo) {
        alvo.classList.add('tut-alvo');
        requestAnimationFrame(() => {
          const r = alvo.getBoundingClientRect(), rp = palco.getBoundingClientRect();
          if (r.top < rp.top || r.bottom > rp.bottom) palco.scrollTop += r.top - rp.top - rp.height / 2 + r.height / 2;
          const r2 = alvo.getBoundingClientRect();
          cursor.style.opacity = '1';
          cursor.style.transform = 'translate(' + (r2.left - rp.left + r2.width / 2) + 'px,' + (r2.top - rp.top + palco.scrollTop + r2.height / 2) + 'px)';
        });
      } else cursor.style.opacity = '0';
      agendar();
    }
    btPlay.onclick = () => { tocando = !tocando; mostrar(); };
    const ir = d => { if (!passos) return; k = (k + d + passos.length) % passos.length; mostrar(); };
    const lado = h('div', { class: 'tut-lado' },
      h('div', { class: 'tut-sec' }, h('b', { text: 'Em 3 frases' }), h('ol', null, c.regras.map(t => h('li', { text: t })))),
      h('div', { class: 'tut-sec' }, h('b', { text: 'Os níveis' }), h('ul', { class: 'tut-niv' }, niveisTexto(tipo).filter(Boolean).map((t, i) => h('li', null, h('span', { class: 'tut-nv', text: E.DIF[E.niveisDe(tipo)[i]] || '' }), ' ' + t)))),
      h('div', { class: 'tut-sec' }, h('b', { text: 'O que você ajusta' }), h('p', { text: c.mestre })),
      h('p', { class: 'tut-meta' }, '⏱ ' + c.min + ' min de mesa · ' + (c.erra ? 'errar conta erro (pode mover um relógio)' : 'errar não custa nada')));
    const conteudo = [
      h('div', { class: 'tut-cab' }, h('span', { class: 'tut-ico', style: { color: f[3], borderColor: f[3] } }, icone(tipo, 26)), h('div', null, h('h2', { text: c.nome }), h('span', { class: 'tut-fam', style: { color: f[3] }, text: f[1] + (c.novo ? ' · novo' : '') })), h('span', { class: 'grow' })),
      h('p', { class: 'tut-como', text: c.como }),
      h('div', { class: 'tut-corpo' },
        passos ? h('div', { class: 'tut-video' }, palco, leg, h('div', { class: 'tut-ctl' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'tut:ant', onclick: () => ir(-1) }, '◀'), btPlay, h('button', { type: 'button', class: 'btn sm', 'data-k': 'tut:prox', onclick: () => ir(1) }, '▶'), pontos))
          : h('div', { class: 'tut-video sem' }, h('p', { text: tipo === 'imagem' ? 'O quebra-cabeça usa uma imagem sua. Escolha a imagem e teste na prévia, ao lado: é o jeito mais rápido de ver.' : 'A fechadura tem vários jeitos de abrir. Escolha um e teste na prévia, ao lado: é o jeito mais rápido de ver.' })),
        lado),
      J.pe(h('button', { type: 'button', class: 'btn', 'data-k': 'tut:fechar', onclick: () => { parar(); J.fechar(); } }, 'Fechar'),
        op.usar ? h('button', { type: 'button', class: 'btn pri', 'data-k': 'tut:usar', onclick: () => { parar(); J.fechar(); op.usar(tipo); } }, 'Usar este puzzle') : null),
    ];
    J.abrir('largo tut', conteudo, parar);
    if (passos) mostrar();
  }

  T.puzzlesGuia = { FAM, CAT: C, NOVOS, cat, famDe, icone, tags, niveisTexto, abrirTutorial, passosDe, demoAntigo };
})();
