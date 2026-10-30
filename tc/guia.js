/* Tiny Cats · o guia de cada aba (lote 16).
   O "?" da barra de cima abre o guia da aba aberta: os assuntos dela, cada um com um texto curto e, quando dá,
   "Mostrar onde fica" — a casca pede ao sistema que destaque o lugar (ver TC.ponte, "guia.mostrar"). Quem mestra a aba
   vê o guia do mestre; quem joga, o do jogador (sem mesa, cada um é o mestre de tudo).
   Cada assunto: { t: o título, txt: o texto, onde?: { sel: o lugar (seletor CSS, dentro do sistema), sub?: a parte do
   sistema em que ele fica (nas Fichas, a aba da ficha), nada?: o que dizer quando o lugar não está à vista } }.
   Só texto: nada aqui muda nada. */
(() => {
  'use strict';
  const fichaNada = 'Abra uma ficha primeiro (clique num personagem do elenco).';
  const G = {
    fichas: {
      mestre: [
        { t: 'O elenco e os grupos', txt: 'À esquerda, os personagens por grupo. Na mesa, três abas: Ativos (na aventura), Inativos (fora desta sessão) e Toldo (guardados longe da aventura, fora do “Puxar o grupo” e das listas das Cenas). Arraste pela alça ⠿ para mudar a ordem ou trocar de grupo; solte numa aba para mudar a ficha de lugar, ou use “Vários” para mover várias de uma vez (sempre com Desfazer). A pata ao lado do dono esconde os pets.', onde: { sel: '#lista' } },
        { t: 'O resumo de cima', txt: 'Fica fixo enquanto você troca de aba: o nome, as barras (digite −8 para tirar, +25% para pôr um quarto do máximo), os atributos e as defesas, os lapros, a caixinha do grupo, os ferimentos, a Sanidade e o Conforto. Os selos levam à parte da ficha em que cada coisa fica.', onde: { sel: '#resumo', nada: fichaNada } },
        { t: 'As abas da ficha', txt: 'Atributos · Bolsas e itens · Social · Skills · Notas (e Tropas, nas fichas com tropa). A ficha lembra a aba em que você estava, também ao trocar de personagem.', onde: { sel: '#ficha .abasficha', nada: fichaNada } },
        { t: 'A caixinha do grupo', txt: 'Na aba Bolsas e itens: os lapros que o grupo guarda junto. Põe e pega com os lapros da ficha (a conta aparece antes), e você também lança um achado ou uma despesa sem ficha. O extrato diz quem fez o quê.', onde: { sel: '#painelCaixa', sub: 'bolsas', nada: fichaNada } },
        { t: 'Skills e skills únicas', txt: 'Na aba Skills, um cartão para cada coisa aprendida na árvore. As skills únicas — só daquele personagem, já aprendidas — você cria na Árvore (modo Jogador, no personagem). As habilidades escritas à mão viram skills únicas em “Passar para skills únicas…”.', onde: { sel: '#painelSkills', sub: 'skills', nada: fichaNada } },
        { t: 'O aniversário', txt: 'Em Atributos, no “Quem é”: o dia e o mês no calendário do mundo (o ano é opcional, para a idade). No dia, o resumo avisa, e o Jornal sugere a nota no rascunho — só sai se você publicar.', onde: { sel: '#anivBox', sub: 'atributos', nada: fichaNada } },
        { t: 'Quem vê e quem controla', txt: 'O olho no elenco abre ou esconde a ficha dos jogadores. Em “Quem é”, o dono diz qual jogador controla a ficha; “Personagem ativo” é o mesmo dos dois blocos do elenco (na cena, “Puxar o grupo” traz marcados os ativos).', onde: { sel: '#f_dono', sub: 'atributos', nada: 'Isso só existe numa mesa, com uma ficha aberta.' } },
        { t: 'Estaque, missões e notas', txt: 'Na aba Notas. O Estaque pode ficar escondido do jogador, ficha por ficha (a marca no próprio Estaque).', onde: { sel: '#abafichac-notas', sub: 'notas', nada: fichaNada } },
        // (lote 34)
        { t: 'As barras da raça e da classe', txt: 'A raça, a classe e a linhagem trazem a barra delas (o Calor da Forja, a Ira, a Fome…) como barra comum, logo depois do HP e do SP — com a faixa e o começo definidos na árvore, na Oficina. Os nós que somam ao início (“+1 de Calor inicial”) já entram; o início não passa de 10.', onde: { sel: '#ficha .res', sub: 'atributos', nada: fichaNada } },
        // (lote 37)
        { t: 'A corrupção', txt: 'No painel lilás em cima da ficha (só você vê): Vampírica, Licantropa ou Demoníaca. As duas primeiras crescem com os pontos gastos na árvore que você escolher, em cinco estágios (os cortes ficam nas Tabelas base); − e + ajustam; a demoníaca é à mão. Só o dono do personagem e você veem o efeito — na ficha, no retrato e na aura do token.', onde: { sel: '#corrBarra', nada: fichaNada } },
        // (lote 40)
        { t: 'As tropas', txt: '“+ Tropas”, no fim das abas da ficha, dá uma tropa ao personagem: a guarda pessoal dele, numa aba nova, uma carta por unidade. Você muda os números (“Números…”, a veterania na própria carta, a moral e os mantimentos), põe e tira unidades e registra as batalhas — as baixas e as promoções vão para o diário da tropa. O dono escolhe o nome, a raça e a classe (das árvores), o brasão, os equipamentos e os suprimentos (das listas das Tabelas base). Os outros jogadores não veem a tropa.', onde: { sel: '#tropasAba, [data-trcriar]', sub: 'tropas', nada: fichaNada } },
      ],
      jogador: [
        { t: 'A sua ficha', txt: 'Em cima, o resumo, que fica fixo: as barras (digite −8 para tirar, +25% para pôr um quarto do máximo), os atributos, os lapros, a caixinha do grupo e o que está machucado. Os selos levam à parte da ficha em que cada coisa fica.', onde: { sel: '#resumo', nada: fichaNada } },
        { t: 'As abas da ficha', txt: 'Atributos · Bolsas e itens · Social · Skills · Notas (e Tropas, quando o personagem tem uma). A ficha lembra a aba em que você estava.', onde: { sel: '#ficha .abasficha', nada: fichaNada } },
        { t: 'A caixinha do grupo', txt: 'Na aba Bolsas e itens: os lapros que o grupo guarda junto. Você põe e pega com os lapros da sua ficha — a conta aparece antes, e dá para desfazer. O extrato mostra o que cada um fez.', onde: { sel: '#painelCaixa', sub: 'bolsas', nada: fichaNada } },
        { t: 'Skills', txt: 'Na aba Skills, um cartão para cada coisa que o personagem aprendeu (e as skills únicas que o mestre criou para ele). Para pegar mais, “Abrir na Árvore”.', onde: { sel: '#painelSkills', sub: 'skills', nada: fichaNada } },
        { t: 'O aniversário', txt: 'Em Atributos, no “Quem é”: o dia e o mês no calendário do mundo, e o ano se quiser (para a idade). No dia, a ficha avisa.', onde: { sel: '#anivBox', sub: 'atributos', nada: fichaNada } },
        { t: 'As missões', txt: 'Na aba Notas: as do grupo e as suas, com o que falta fazer.', onde: { sel: '#painelMissoes', sub: 'notas', nada: fichaNada } },
        { t: 'A barra da raça e da classe', txt: 'Em Atributos, junto do HP e do SP: a barra que a sua raça, a sua classe ou a sua linhagem trazem, com onde ela começa o combate.', onde: { sel: '#ficha .res', sub: 'atributos', nada: fichaNada } },
        { t: 'As tropas', txt: 'Quando o mestre dá uma tropa ao seu personagem, a ficha ganha a aba Tropas: a guarda dele, uma carta por unidade. Os números são do mestre; em “Editar o que é seu” você escolhe o nome, a raça, a classe, o brasão, os equipamentos e os suprimentos de cada unidade. O diário guarda as batalhas e as promoções.', onde: { sel: '#tropasAba', sub: 'tropas', nada: 'A aba Tropas só aparece quando o mestre dá uma tropa ao seu personagem.' } },
      ],
    },
    cenas: {
      mestre: [
        { t: 'Trocar de cena', txt: 'O nome da cena, em cima: abre a lista para trocar, criar ou renomear.', onde: { sel: '#sceneBtn' } },
        { t: 'As ferramentas', txt: 'À esquerda: selecionar, desenhar, terreno, luz, névoa, régua… Passe o mouse em cada uma para ver o que faz.', onde: { sel: '#rail' } },
        { t: 'O painel', txt: 'À direita: os tokens, a iniciativa, as condições e o que está selecionado. O botão do painel, em cima, mostra ou esconde.', onde: { sel: '#side' } },
        { t: 'Os turnos', txt: 'Com o combate ligado, a faixa dos turnos mostra de quem é a vez, com o próximo e o anterior.', onde: { sel: '#turnb', nada: 'A faixa dos turnos aparece com o combate ligado.' } },
        { t: 'O relevo', txt: 'Na aba Cena, em Relevo: as regras da altura (subir custa movimento, o penhasco só escalando, a queda sugere o dano, de cima dá bônus) e a chave da visão pelo relevo. Tudo é sugestão: você confirma.', onde: { sel: '#tab-scene' } },
        { t: 'A caverna embaixo', txt: 'Dois cliques numa Entrada (ou na entrada de gruta da Região livre): “Gerar a caverna embaixo…” faz o subsolo alinhado com esta cena, com o rio de cima, o bioma de baixo, um achado e um ninho.', onde: { sel: '#stage' } },
        { t: 'A arena do chefe', txt: 'Em “Gerar um lugar…”, a aba Arena faz a sala da luta com o chefe, com as fases prontas (cada mudança liga, desliga ou troca). São 19 tipos, agrupados por tema; as arenas novas têm mudanças só delas (os caixões que se abrem, o gelo que racha, o portal do fosso). Na cena, a aba Cena mostra as fases: acionar mostra antes o que muda, e o Desfazer volta.', onde: { sel: '#tab-scene' } },
        { t: 'Os objetos de cenário', txt: 'A ferramenta Objetos (J) tem oito grupos: as luzes, os móveis, a natureza, os perigos, a masmorra e o chefe, o clã e a sede, as linhagens e a viagem. No painel do estandarte, do brasão, da mesa de guerra, do quadro de missões e do atril ficam as duas cores; os que vêm da sede do clã já chegam com as cores do brasão.', onde: { sel: '#tool-obj' } },
        { t: 'As condições das raças', txt: 'Nas condições do token, a aba Raças: as das árvores de raça, com a raça junto do nome. Já entram com as rodadas e o contador de começo; o contador para no máximo e, no limite, sugere o que vem (o Frio no 5, Congelado). Os membros perdidos perguntam o lado e marcam a ficha. As zonas e os objetos (o Totem, a Arapuca, a Terra Morta…) ficam na aba Efeitos, no grupo Raças.', onde: { sel: '#tab-fx' } },
        { t: 'O começo do combate', txt: '“Iniciar” (ou o primeiro “Próximo turno”) leva as barras de raça, classe e linhagem de quem luta para o começo delas, com o que os nós somam — num passo só, com Desfazer. A Fome do Vampiro fica como está; a Barra Bestial do Licantropo, a mesa pergunta: Dia, 0, 5, 10 ou 15 na lua cheia.', onde: { sel: '#turnOnOff', nada: 'O botão Iniciar fica na aba Turnos, quando há alguém na ordem.' } },
        { t: 'O campo de batalha', txt: 'Na janela da Batalha do Mapa-múndi, “Abrir no campo de batalha…” faz a cena do hexágono com os dois exércitos em blocos de soldados. O comandante move os blocos dele; na aba Cena, “Levar para a batalha…” leva o flanco, o terreno alto, a cobertura e a reserva como bônus sugeridos.', onde: { sel: '#tab-scene' } },
      ],
      jogador: [
        { t: 'A cena', txt: 'O mapa que o mestre mostra. Seus tokens você move e usa; o resto, só vê.', onde: { sel: '#stage' } },
        { t: 'O painel', txt: 'À direita: os seus personagens, as barras e o que está selecionado.', onde: { sel: '#side' } },
        { t: 'Os turnos', txt: 'No combate, a faixa dos turnos mostra de quem é a vez.', onde: { sel: '#turnb', nada: 'A faixa dos turnos aparece quando o mestre liga o combate.' } },
      ],
    },
    mundo: {
      mestre: [
        { t: 'Trocar de mapa', txt: 'O nome do mapa, em cima: trocar, criar ou renomear.', onde: { sel: '#btMapa' } },
        { t: 'A data do mundo', txt: 'O dia, a hora e o clima. As setas passam o tempo — é a data que o Jornal, a corte e os aniversários usam.', onde: { sel: '#dataTxt' } },
        { t: 'As ferramentas', txt: 'À esquerda: regiões, marcadores, rotas, grupos e exércitos. Shift + clique em dois exércitos oferece a batalha entre os dois.', onde: { sel: '#rail' } },
        { t: 'O painel', txt: 'À direita, por abas: reinos, corte (gente, casas, títulos), diplomacia, guerra, economia… Na Corte, o titular de um título pode ser uma ficha da mesa; na Diplomacia, quem fala por cada facção.', onde: { sel: '#tabs' } },
        { t: 'Ver como jogador', txt: 'Mostra o mapa como os jogadores veem: sem o que é só seu e com a névoa fechada.', onde: { sel: '#comoJogBox' } },
        { t: 'A guerra no mapa', txt: 'A zona de guerra aparece sozinha: as terras ocupadas e a fronteira entre facções em guerra, com a linha do front. A ferramenta Frente ajusta a zona e desenha setas de ofensiva; a tabela da defesa do terreno fica na aba Guerra.', onde: { sel: '#rail [data-f="f"]' } },
        { t: 'A caneta', txt: 'No canto do mapa (ou a tecla W): desenhe para a mesa inteira ver na hora. A caneta que some apaga sozinha em segundos; a que fica, só com “Limpar desenhos”, que apaga a de todos.', onde: { sel: '#zCaneta' } },
      ],
      jogador: [
        { t: 'O mapa', txt: 'O que o mestre mostra do mundo: as regiões e os lugares que vocês conhecem.', onde: { sel: '#palco' } },
        { t: 'A data do mundo', txt: 'O dia, a hora e o clima de agora.', onde: { sel: '#dataTxt' } },
        { t: 'O painel', txt: 'À direita: o que vocês sabem dos reinos, da corte e da diplomacia.', onde: { sel: '#tabs' } },
        { t: 'A caneta', txt: 'No canto do mapa: desenhe para a mesa ver na hora (uma rota, um alvo). A caneta que some apaga sozinha em segundos; a que fica, até alguém limpar — você limpa os seus.', onde: { sel: '#zCaneta' } },
        { t: 'A guerra', txt: 'As listras são a zona de guerra, com a linha do front. As setas mostram as ofensivas da sua facção (e as que o mestre mostrar).', onde: { sel: '#palco' } },
      ],
    },
    acampamento: {
      mestre: [
        { t: 'Os descansos', txt: 'Descanso curto (uma pausa, sem gastar provisões) e longo (a noite: recupera as barras, gasta rações e mexe em Conforto e Sanidade). Sempre com prévia antes.', onde: { sel: '#acoes' } },
        { t: 'As rações', txt: 'A soma das provisões guardadas.', onde: { sel: '#chipRacoes' } },
        { t: 'As áreas', txt: 'As partes do acampamento (a fogueira, as oficinas, o convívio, a guarda e a caça), com quem está em cada uma.', onde: { sel: '#areas' } },
        { t: 'Distribuir pelas áreas', txt: '“Distribuir…” abre um quadro com uma coluna por área: arraste cada retrato para onde o personagem fica (ou use as setas do teclado). Tem Desfazer.', onde: { sel: '#btDistribuir', nada: 'O botão aparece quando há alguém no acampamento.' } },
        { t: 'A caça', txt: 'Quem fica na área Caça caça no descanso longo: cada um rola (a Percepção, de começo) contra a dificuldade do lugar, e o resultado sugere rações. Você confirma; as regras ficam no Diário, em Regras do descanso.', onde: { sel: '#area-tab-caca' } },
        { t: 'Momentos e todos de uma vez', txt: '“Momento…” mexe no relacionamento de dois personagens; “Mexer em todos…”, na Fadiga, no Conforto e na Sanidade de quem está no acampamento, com o antes e o depois.', onde: { sel: '#btMomento' } },
      ],
      jogador: [
        { t: 'O acampamento', txt: 'Quem está em cada área e o que o grupo tem guardado. Com a permissão do mestre, você também mexe nas provisões e nas áreas (“Distribuir…” arruma todos de uma vez).', onde: { sel: '#areas' } },
        { t: 'A caça', txt: 'Quem fica na área Caça sai para caçar no descanso longo: o resultado vira Carne de caça nas provisões.', onde: { sel: '#area-tab-caca' } },
        { t: 'As rações', txt: 'A soma das provisões guardadas.', onde: { sel: '#chipRacoes' } },
      ],
    },
    arvore: {
      mestre: [
        { t: 'Mestre e Jogador', txt: 'Em cima: “Mestre” edita as árvores; “Jogador” mostra cada personagem — os pontos, o que ele pegou e as skills únicas dele.', onde: { sel: '.seg[aria-label="Modo"]' } },
        { t: 'A busca', txt: 'Acha pelo nome e pelo texto dos nódulos (também o de cada grau), em todas as árvores: a lista leva até lá.', onde: { sel: '#busca' } },
        { t: 'Os filtros', txt: 'Em cima da árvore: as naturezas e os tipos de uso (ativa, passiva…). Apagam o que não é daquele tipo.', onde: { sel: '#filtroNat', nada: 'Os filtros aparecem quando a árvore à vista tem naturezas ou tipos de uso.' } },
        { t: 'As skills únicas', txt: 'No modo Jogador, no painel do personagem: “+ Skill única” cria uma skill só dele (o texto, o bônus na ficha, o custo de uso), já aprendida. Aparece na ficha, na aba Skills.', onde: { sel: '#blocoUnicas', nada: 'Passe para o modo Jogador e escolha o personagem.' } },
        // (lote 34)
        { t: 'A barra da raça e da classe', txt: 'Na árvore de raça, de classe ou de linhagem, o bloco Árvore mostra a barra que ela traz para a ficha: o nome, a faixa, o início, o que o combate faz com ela e o resto do guia de barras. Mudar aqui vale para esta mesa (“Voltar ao guia” desfaz). No nó, cada grau diz quanto soma ao início (vem lido do texto).', onde: { sel: '#grupoBarraArv', nada: 'Abra uma árvore de raça, classe ou linhagem no modo Mestre: o bloco Árvore, no painel, mostra a barra dela.' } },
      ],
      jogador: [
        { t: 'O seu personagem', txt: 'À esquerda: os pontos de cada tipo, o que você pegou e as árvores equipadas. Clique num nódulo liberado para aprender.', onde: { sel: '#painel' } },
        { t: 'A busca', txt: 'Acha pelo nome e pelo texto, nas árvores equipadas: a lista leva até lá.', onde: { sel: '#busca' } },
        { t: 'Os filtros', txt: 'Em cima da árvore: as naturezas e os tipos de uso (ativa, passiva…).', onde: { sel: '#filtroNat', nada: 'Os filtros aparecem quando a árvore à vista tem naturezas ou tipos de uso.' } },
        { t: 'As skills únicas', txt: 'As que o mestre criou só para o seu personagem: já vêm aprendidas.', onde: { sel: '#blocoUnicas' } },
      ],
    },
    jornal: {
      mestre: [
        { t: 'Ler e escrever', txt: 'Em cima, o que ver: o jornal publicado ou o rascunho, que só você vê até publicar.', onde: { sel: '#modos', nada: 'Os modos aparecem para quem mestra o Jornal, numa mesa.' } },
        { t: 'Sugestões no rascunho', txt: 'O rascunho sugere notas prontas — os aniversários dos personagens da semana, por exemplo. “Pôr no rascunho” põe; nada sai sem você publicar.', onde: { sel: '#ed', nada: 'As sugestões aparecem no rascunho.' } },
        { t: 'Publicar', txt: 'Mostra antes o que vai sair, e só então publica para a mesa.', onde: { sel: '#btPublicar', nada: 'O botão aparece no rascunho.' } },
      ],
      jogador: [
        { t: 'O jornal', txt: 'O que o mestre publicou: as notícias, os boatos e os anúncios da semana.', onde: { sel: '#leitura' } },
      ],
    },
    meditacao: {
      mestre: [
        { t: 'Os ambientes', txt: 'Onde os personagens meditam, cada um com o que pode ser achado lá.', onde: { sel: '#ambientes', nada: 'Os ambientes aparecem para quem mestra a Meditação.' } },
        { t: 'O painel', txt: 'Quem está meditando, as tentativas liberadas e o que cada um já achou.', onde: { sel: '#painel' } },
      ],
      jogador: [
        { t: 'Meditar', txt: 'No painel: entrar na meditação com o seu personagem e tentar uma combinação nos pilares quando o mestre liberar.', onde: { sel: '#painel' } },
      ],
    },
    cla: {
      mestre: [
        { t: 'Os clãs da mesa', txt: 'O dos jogadores e os de NPC (rivais, aliados). Escolha um para abrir.', onde: { sel: '#mestre', nada: 'A lista dos clãs aparece fora de um clã aberto.' } },
        { t: 'As partes do clã', txt: 'Cargos, construções, recursos, respeito, relações e o histórico. No clã de NPC, você marca o que os jogadores veem.', onde: { sel: '#abas', nada: 'Abra um clã primeiro.' } },
        // (lote 30) a Sede e o construtor
        { t: 'A Sede', txt: 'No painel do clã, “Montar a Sede” (ou “Abrir a Sede”): arraste as plantas prontas (Salão, Quartel, Forja, Templo, Estábulo e Torre, nos níveis 1 a 3) para o terreno, ligue cada prédio a uma construção do clã e ponha a muralha, os portões, as estradas, o poço e os jardins. O chão vem do lugar do clã no Mapa-múndi. “Ver nas Cenas” cria a cena da sede e a de cada andar; pedir de novo atualiza (os tokens, a névoa e as luzes ficam).', onde: { sel: '[data-k="sec:sede"]', nada: 'Abra um clã no painel (Mestre) primeiro.' } },
        { t: 'O construtor', txt: 'Na Sede, escolha um prédio e “Editar no construtor”: faça cômodos (arrastando), ponha portas e janelas (clique na parede), troque o piso, ponha móveis e escadas, e mais andares (ou o porão). “Salvar como planta” guarda para usar de novo, em “Minhas plantas”.' },
      ],
      jogador: [
        { t: 'O clã', txt: 'As partes do clã que vocês veem: os cargos, as construções, os recursos e o histórico. O líder mexe nos outros cargos.', onde: { sel: '#abas', nada: 'O mestre ainda não mostrou um clã.' } },
        { t: 'A sede', txt: 'Na parte Sede do salão, a planta da sede do clã: os prédios, a muralha, as estradas. Quem monta é o mestre; nas sessões, ela vira cena.', onde: { sel: '#abas [data-aba="sede"]', nada: 'O mestre ainda não mostrou a sede deste clã.' } },
      ],
    },
    rolador: {
      mestre: [
        { t: 'Rolar', txt: 'Escreva a rolagem (2d6+3) ou monte pelo formulário: o resultado entra no histórico, com o título que você der.', onde: { sel: '#log' } },
        { t: 'As tabelas', txt: 'Tabelas de eventos para sortear, com o histórico de cada uma.', onde: { sel: '#newTableBtn' } },
      ],
      jogador: [],
    },
    // (lote 29) as abas Bestiário e Itens, do mestre, e a Loja, de quem joga
    bestiario: {
      mestre: [
        { t: 'A lista e as tags', txt: 'O ☰ abre e fecha a lista com o nome de todos os inimigos. A busca acha pelo nome; “Tags” separa por bioma, tipo de criatura, papel no combate e facção.', onde: { sel: '#btLista' } },
        { t: 'Um inimigo novo', txt: '“+ Inimigo” cria e abre a gaveta. Os números saem pela regra das fichas (o tier, o level e onde os pontos caem) e dá para ajustar à mão. Tudo tem Desfazer.', onde: { sel: '#btNovo' } },
        { t: 'A gaveta', txt: 'Clique numa carta: a gaveta mostra os números, a árvore (distribuída pelos nódulos de prioridade), o comportamento e o saque. “Duplicar” faz um parecido num clique.', onde: { sel: '#meio' } },
        { t: 'O encontro', txt: 'O “+” das cartas põe o inimigo na bandeja, embaixo. Ela mostra a dificuldade contra os ativos do grupo (só uma sugestão) e “Puxar para a cena” traz as cópias para a cena aberta. “Guardar encontro” guarda para depois.', onde: { sel: '#bandeja', nada: 'A bandeja aparece quando um inimigo entra no encontro (o “+” da carta).' } },
        { t: 'Os encontros guardados', txt: 'Abre um encontro guardado de volta na bandeja.', onde: { sel: '#btEncontros' } },
        { t: 'Na cena', txt: 'O token puxado do Bestiário rola e defende com os números de lá (a tecla F, o ataque com defesa). No painel dele, o lembrete do comportamento e “Rolar o saque” — para a bolsa de alguém ou num baú no chão. Na vez do inimigo, o lembrete aparece só para você.' },
        // (lote 33) os números à mão, o equipamento e a conta da dificuldade
        { t: 'Números à mão', txt: 'Em Números, cada atributo pode ter a letra ou “Número”: o número digitado é a base, e o equipamento soma por cima. Os derivados (vazios: a conta de sempre), a iniciativa e as barras também aceitam um número fixo.', onde: { sel: '#btNovo' } },
        { t: 'O equipamento', txt: 'Na aba Equipamento do inimigo: escreva uma peça (os bônus, as barras, as defesas específicas) ou traga do catálogo da aba Itens. Cada peça diz se vem equipada e a chance de cair no saque. Nas Cenas, cada token liga e desliga as peças dele, no painel.', onde: { sel: '#btNovo' } },
        { t: 'A dificuldade', txt: 'O “?” ao lado da dificuldade, na bandeja, mostra a conta: o poder de cada inimigo e de cada personagem (a soma dos cinco atributos finais, com o equipamento), os totais, a porcentagem e as faixas.', onde: { sel: '#bandeja', nada: 'A bandeja aparece quando um inimigo entra no encontro (o “+” da carta).' } },
      ],
      jogador: [],
    },
    itens: {
      mestre: [
        { t: 'O catálogo', txt: 'Os itens da bolsa (poção, bomba, runa, munição, material) e os equipamentos, com o preço. “Dar a…” põe o item na ficha de alguém, com Desfazer.', onde: { sel: '#aba-catalogo' } },
        { t: 'As lojas', txt: 'Cada loja fica num lugar do Mapa-múndi, com o preço e o estoque de cada item. Quando o grupo de um jogador para no hexágono desse lugar, a aba Loja aparece para ele. Quem anda com cada grupo você marca no painel do grupo, no Mapa-múndi.', onde: { sel: '#aba-lojas' } },
        { t: 'As receitas', txt: 'O que entra (os ingredientes), o que sai e, se quiser, um teste. Na falha, o padrão é perder os ingredientes; você pode pôr dano numa barra ou uma condição. Com “Só você” marcado, a bancada não mostra a receita.', onde: { sel: '#aba-receitas' } },
        { t: 'As compras', txt: 'Cada compra fica no Jornal, em “Compras nas lojas”, com “Desfazer a compra”.' },
      ],
      jogador: [],
    },
    loja: {
      mestre: [
        { t: 'A loja por perto', txt: 'As lojas no lugar em que o grupo está, com o que cada uma vende.', onde: { sel: '#meio' } },
      ],
      jogador: [
        { t: 'A loja por perto', txt: 'Esta aba aparece quando o grupo do seu personagem para no lugar de uma loja do Mapa-múndi.', onde: { sel: '#meio' } },
        { t: 'Comprar', txt: 'Escolha a quantidade e “Comprar”: os lapros saem da ficha e o item vai para a bolsa. Cada compra tem Desfazer por 15 minutos.', onde: { sel: '#meio' } },
      ],
    },
    // (lote 31) o Escudo do mestre e as Pistas
    escudo: {
      mestre: [
        { t: 'O roteiro', txt: 'Cada sessão é uma lista de passos. Ligue um passo a uma cena, a um lugar do Mapa-múndi, a um encontro do Bestiário, a um handout, a um relógio ou a um NPC: o botão do passo faz a ação.', onde: { sel: '[data-k="aba:roteiro"]' } },
        { t: 'Abrir e fechar a sessão', txt: '“Abrir a sessão” marca o começo. O botão do roteiro, na barra de cima, mostra os passos ao lado em qualquer aba. Ao fechar, você escolhe os passos que passam para a próxima e sai o resumo, que pode ir para o rascunho do Jornal.', onde: { sel: '[data-k="aba:roteiro"]' } },
        { t: 'Os relógios', txt: 'Um círculo com gomos que enchem conforme a ameaça avança. Clique num gomo para encher até ali. Os que você mostrar aparecem num cantinho das Cenas para os jogadores. Marcado “quando passa um dia”, o Mapa-múndi sugere avançar e você confirma.', onde: { sel: '[data-k="aba:relogios"]' } },
        { t: 'Handouts', txt: 'Imagem, carta ou puzzle. Na carta, escreva {{assim}} (ou selecione e “Esconder o trecho”) para um trecho que os jogadores veem como mancha; na imagem, arraste para esconder uma área. “Revelar” mostra aos poucos.', onde: { sel: '[data-k="aba:handouts"]' } },
        { t: 'Os puzzles', txt: 'Cifras, charadas, mecanismos (runas, alavancas, cadeado e placas) e o quebra-cabeça de imagem, sorteados com solução garantida, em fácil, médio ou difícil. A prévia é um teste jogável, com a resposta para você.', onde: { sel: '[data-k="aba:handouts"]' } },
        { t: 'Acertar e errar', txt: 'No puzzle, “Ao acertar” revela parte de outro handout ou entrega outro; “Ao errar” faz um relógio andar. Uma porta das Cenas pode abrir com o puzzle: escolha a porta e ligue-a no painel dela.', onde: { sel: '[data-k="aba:handouts"]' } },
        { t: 'Entregar', txt: 'À mesa toda ou só a alguns. Quem recebe vê uma janela, e o handout fica guardado na aba Pistas dele. Depois de entregar: mandar a versão nova, dar uma dica, recomeçar o puzzle ou tirar dos jogadores.', onde: { sel: '#meio' } },
        // (lote 32) os NPCs e os encontros por bioma
        { t: 'Os NPCs', txt: '“Gerar NPC”: escolha a raça, o papel e onde ele vive, e saem três opções — o nome no estilo do povo dele, a aparência, o jeito, o que quer, o que esconde, o gancho e os números de ficha. Fique com uma e mude o que quiser; o ↻ sorteia outro só para aquele campo.', onde: { sel: '[data-k="aba:npcs"]' } },
        { t: 'As raças', txt: 'O botão Raças monta a lista da mesa: o estilo dos nomes (nórdico, élfico, anão…) e a aparência típica de cada raça e sub-raça. “Trazer as raças das fichas” começa pelas que já estão nas fichas.', onde: { sel: '[data-k="aba:npcs"]' } },
        { t: 'Ficha, token e roteiro', txt: 'No NPC aberto: “Virar ficha” cria a ficha dele nas Fichas; “Token na cena” põe o token na cena aberta; “Pôr no roteiro” liga o NPC a um passo da sessão (no painel do roteiro, o cartão dele abre ali mesmo).', onde: { sel: '#meio' } },
        { t: 'Encontros por bioma', txt: 'Uma tabela para cada bioma do Mapa-múndi: a chance e os resultados com peso — inimigos do Bestiário (com os dados da quantidade), um encontro guardado, um NPC sorteado na hora, um evento ou “nada”. “Sugerir do Bestiário” põe os inimigos com as tags do bioma. Onde a região tem a tabela dela, vale a da região.', onde: { sel: '[data-k="aba:encontros"]' } },
        { t: 'No Mapa-múndi', txt: 'O sorteio mostra a quantidade (com − e + antes de puxar) e a dificuldade contra os personagens do grupo; “Puxar para a cena” leva os inimigos às Cenas. Quando os grupos andam, o Mapa-múndi pergunta se sorteia — uma vez por dia, a cada tempo ou nunca, como você escolher aqui.', onde: { sel: '[data-k="aba:encontros"]' } },
      ],
      jogador: [],
    },
    // (lote 36) o Bestiário do clã: o livro de caça de cada clã
    livro: {
      mestre: [
        { t: 'O livro de cada clã', txt: 'Cada clã tem o livro dele: escolha o clã no alto. O livro começa trancado; com “Liberado para o clã”, quem tem personagem nos cargos do clã passa a ler.', onde: { sel: '#chLiberar', nada: 'Crie um clã na aba Clã: cada clã tem o livro dele.' } },
        { t: 'Uma página nova', txt: '“+ Página” cria uma criatura à mão. Do seu Bestiário, “Enviar ao livro do clã” (na gaveta do inimigo) manda o nome, a imagem, os números aproximados, as fraquezas e o saque. Tudo chega escondido do clã.', onde: { sel: '#btNova', nada: 'Crie um clã na aba Clã: cada clã tem o livro dele.' } },
        { t: 'Revelar o que o clã descobriu', txt: 'Na página, “Mostrar ao clã” mostra a página (o nome). Cada parte tem o botão dela: a ilustração, a descrição, o que sabemos, as fraquezas e o que deixa cair. O que não foi revelado aparece para o clã como tinta borrada, sem o conteúdo. Tudo tem Desfazer.', onde: { sel: '#pagEsq' } },
        { t: 'Editar a página', txt: 'O nome, a ilustração (um desenho a mão, como os do Gemini), a legenda a lápis, a descrição (a primeira letra vira a capitular), os números, as fraquezas e o saque. O que você muda aqui fica, mesmo se enviar de novo do Bestiário.', onde: { sel: '#btEditar', nada: 'O botão aparece com uma página aberta.' } },
        { t: 'Como o clã vê', txt: '“Como o clã vê” mostra o livro exatamente como chega a eles: só as páginas e as partes reveladas, com as anotações.', onde: { sel: '#vistas', nada: 'Crie um clã na aba Clã: cada clã tem o livro dele.' } },
        { t: 'As anotações do clã', txt: 'Quem é do clã anota na margem, com o nome do personagem. Você pode apagar qualquer anotação.', onde: { sel: '#pagEsq' } },
      ],
      jogador: [
        { t: 'O livro do clã', txt: 'O que o clã já descobriu de cada criatura. As partes borradas são o que ainda não se sabe: quando o clã descobrir, o mestre revela.', onde: { sel: '#livro' } },
        { t: 'Folhear', txt: 'As letras na beira do livro, “Anterior” e “Próxima” (ou as setas do teclado). A busca acha pelo nome, pelo texto e pelas anotações.', onde: { sel: '#busca' } },
        { t: 'Anotar na margem', txt: '“Anotar na margem…” deixa uma anotação na página, com o nome do seu personagem. Todo o clã lê; você muda ou apaga a sua quando quiser.', onde: { sel: '#btAnotar', nada: 'O botão aparece com uma página aberta.' } },
      ],
    },
    pistas: {
      mestre: [],
      jogador: [
        { t: 'As pistas', txt: 'O que o mestre entregou: imagens, cartas e puzzles, a mais nova primeiro. As manchas são trechos que o mestre ainda não revelou.', onde: { sel: '#meio' } },
        { t: 'Os puzzles', txt: 'Quem recebeu resolve junto: cada lance aparece para os outros na hora. Na charada, no cadeado e nas placas, errar conta (e o mestre pode ter ligado alguma coisa a isso).', onde: { sel: '#meio' } },
        { t: 'Achar', txt: 'A busca e os filtros (Novas, Puzzles), no alto.', onde: { sel: '#busca' } },
      ],
    },
  };
  // (lote 29) a Bancada do Acampamento, nas receitas
  G.acampamento.mestre.push({ t: 'A bancada', txt: 'Na aba Bancada, as receitas que você criou na aba Itens. Os ingredientes saem da bolsa e o resultado entra; com teste, você pode dispensar o teste na hora. Tem Desfazer.', onde: { sel: '#tab-bancada' } });
  G.acampamento.jogador.push({ t: 'A bancada', txt: 'Na aba Bancada, as receitas: escolha o personagem e “Fazer”. Os ingredientes saem da bolsa e o resultado entra. Se a receita tem teste e ele falhar, acontece o que ela diz.', onde: { sel: '#tab-bancada' } });
  window.TC_GUIA = { abas: G };
})();
