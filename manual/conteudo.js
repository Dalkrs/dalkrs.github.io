/* Tiny Cats · o conteúdo do Manual (lote 51).
   O Manual (manual/index.html) é a wiki do site: o que cada aba tem e o que dá para fazer com ela. Ele abre pelo menu
   da conta, numa janela por cima do site. Quem mestra vê tudo; quem joga vê só as partes de quem joga.
   A CADA LOTE, este arquivo acompanha o que mudou (o teste manual.test.js confere que toda aba da barra tem página).

   Formato:
     sistemas: as páginas por aba. { id (o id da aba na casca, ou 'mesa' para a barra de cima), nome, grupo, soMestre?,
       resumo, img?: { arq, legenda, marcas: [{ sel, t }] } (a captura em manual/img/, com os números marcados — ver
       src/tests/manual-fotos.js), jogador: [secao], mestre: [secao] }
     secao: { t, txt, passos?: [..], tecla?, ir? }
     ir ("Me leve até lá"): { aba, g?: o título de um assunto do guia daquela aba (tc/guia.js — o lugar vem de lá),
       sel?, sub?, nada? } ou { casca: seletor de um botão da barra de cima }
     tarefas ("Como eu faço…"): { id, t, papel: 'mestre' | 'jogador' | 'todos', sistema, passos: [..], ir?, dica? }
     roteiro: { mestre: { antes, durante, depois }, jogador: { antes, durante, depois } } — cada item: { t, txt, ir?, tarefa? }
     sabia ("Você sabia?"): { t, txt, papel, sistema, ir? }
   Só texto: nada aqui muda nada. */
(() => {
  'use strict';
  const sistemas = [
    {
      id: 'mesa', nome: 'A mesa e a barra de cima', grupo: 'comeco',
      resumo: 'A mesa é o lugar onde o grupo joga junto. A barra de cima é igual em todas as abas: as abas em grupos, a busca, a mesa ao vivo e o menu da conta.',
      img: { arq: 'mesa.jpg', legenda: 'A barra de cima, em qualquer aba.', marcas: [
        { casca: '#tabs', t: 'As abas, em grupos com cor: Jogar, Mundo, Descanso e Mestre. Clique no nome do grupo para recolher.' },
        { casca: '#btnGuia', t: 'O guia rápido da aba aberta (“Mostrar onde fica”).' },
        { casca: '#btnBusca', t: 'A busca rápida (Ctrl+K): fichas, cenas, lugares, itens, receitas, matérias.' },
        { casca: '#btnConta', t: 'O menu da conta e da mesa: o Manual, as Novidades, o tema, as permissões.' },
      ] },
      jogador: [
        { t: 'Entrar numa mesa', txt: 'O mestre passa o código de convite. No menu da conta, “Escolher ou criar mesa…” → cole o código. A mesa que você abriu por último abre sozinha da próxima vez.' },
        { t: 'As abas em grupos', txt: 'Jogar (Cenas, Fichas, Árvore), Mundo (Mapa-múndi, Jornal, Clã) e Descanso (Acampamento, Meditação). Algumas aparecem só quando servem: a Loja, quando o seu grupo para numa loja; as Pistas, quando você recebe uma; o Bestiário, quando o livro do seu clã é liberado.', ir: { casca: '#tabs' } },
        { t: 'A busca rápida', txt: 'A lupa (ou Ctrl+K, de qualquer aba) acha pelo nome fichas, lugares do mapa, receitas, itens e matérias do Jornal. Sem acento e sem maiúscula: “dain” acha “Dáin”. Enter abre direto no lugar certo.', tecla: 'Ctrl+K', ir: { casca: '#btnBusca' } },
        { t: 'A mesa ao vivo', txt: 'O painel da direita, com as rolagens e a conversa da mesa. “Dados” rola pela ficha, sem digitar comando, com os campos “+ atributo” e “+ resultado” para um bônus só naquela rolagem. Os pedidos de defesa e de rolagem geral chegam aqui como cartões.', ir: { casca: '#btnVivo' } },
        { t: 'O guia de cada aba', txt: 'O “?” da barra abre os assuntos da aba aberta, com “Mostrar onde fica”. É a versão curta deste Manual.', ir: { casca: '#btnGuia' } },
        { t: 'Campanhas', txt: 'Uma mesa pode ter várias campanhas. A campanha em vista aparece ao lado do nome da mesa; quem joga em mais de uma escolhe qual ver no menu da mesa. O que não é de nenhuma campanha é “do mundo” e aparece em todas.' },
        { t: 'O bloco de notas', txt: 'O caderno da barra de cima abre o bloco em qualquer aba. “Meu caderno” é o seu: você e o mestre leem. “Do grupo” é de todos: cada um lê e muda o que o grupo escreveu (pistas, nomes de NPC, o que falta fazer). Capítulos com tags, campanha e personagem, busca, negrito e listas; @ liga a uma ficha e # a um lugar. Salva sozinho.', ir: { casca: '#btnNotas' } },
        { t: 'O tema e as novidades', txt: 'No menu da conta: tema escuro, claro ou do aparelho, e as Novidades de cada versão (a bolinha avisa quando há algo novo).', ir: { casca: '#btnConta' } },
      ],
      mestre: [
        { t: 'Criar a mesa e convidar', txt: 'Menu da conta → “Escolher ou criar mesa…” → criar. O código de convite fica no menu da mesa; passe aos jogadores.' },
        { t: 'Permissões de cada um', txt: 'No menu da mesa, ao lado de cada pessoa, “Permissões…”: jogador ou mestre auxiliar (nas abas que você marcar), se vê a mesa ao vivo e se mexe no acampamento. “Ficha…” dá uma ficha para o jogador criar o personagem passo a passo.' },
        { t: 'Campanhas', txt: 'Menu da mesa → “Campanhas…”: criar, renomear, ordenar, encerrar e reabrir, e escolher quem joga em cada uma. Campanha encerrada fica guardada só para consulta.' },
        { t: 'O bloco de notas', txt: 'O caderno da barra abre as suas notas em qualquer aba — só você vê. Em “Dos jogadores” você lê o caderno de cada jogador, e “Do grupo” é o caderno que o grupo escreve junto. Capítulos com tags e campanha, busca, e links: @ liga a uma ficha ou NPC, # a uma cena, um lugar do mapa, uma habilidade ou outro capítulo. Clicar no link leva até lá.', ir: { casca: '#btnNotas' } },
        { t: 'O roteiro na barra', txt: 'O botão do roteiro mostra a sessão do Escudo ao lado, em qualquer aba: você joga com os passos à vista e marca cada um.', ir: { casca: '#btnRoteiro' } },
        { t: 'A mesa ao vivo', txt: 'Rolagens, conversa e os avisos do site. Você pode limpar a mesa ao vivo (com Desfazer) e fechar a mesa ao vivo para um jogador em “Permissões…”.', ir: { casca: '#btnVivo' } },
      ],
    },
    {
      id: 'cenas', nome: 'Cenas', grupo: 'jogar',
      resumo: 'O mapa de batalha: tokens, paredes, luz, névoa, zonas, turnos e o gerador de lugares. É a aba mais usada durante a sessão.',
      img: { arq: 'cenas.jpg', legenda: 'As Cenas com a cena de exemplo.', marcas: [
        { sel: '#sceneBtn', t: 'Trocar de cena, criar, organizar em pastas e “Gerar um lugar…”.' },
        { sel: '#rail', t: 'As ferramentas, em grupos: Jogo, Peças, Desenho, Mapa e Mestre.' },
        { sel: '#stage', t: 'O mapa: clique para selecionar, arraste para mover, botão direito abre o menu.' },
        { sel: '#side', t: 'O painel: Seleção, Turnos, Efeitos, Cena e Jogadores (teclas 1 a 5).' },
      ] },
      jogador: [
        { t: 'Mover o seu token', txt: 'Arraste o seu personagem. Ele para na parede enquanto você arrasta, e a sua visão segue o que ele vê. A régua mostra a distância, a subida e o penhasco.', ir: { aba: 'cenas', g: 'A cena' } },
        { t: 'O painel do token', txt: 'Selecione o seu token para ver as barras (digite −8, +5 ou −10%), as condições e a Postura. Enter confirma.', ir: { aba: 'cenas', g: 'O painel' } },
        { t: 'Rolar pela cena', txt: 'Com o mouse sobre o seu token, F abre a janelinha de rolagem com os atributos da ficha e os campos de bônus só desta rolagem. E abre os equipamentos (equipar e guardar com um clique).', tecla: 'F · E' },
        { t: 'A sua vez', txt: 'No combate, a faixa “Sua vez!” aparece no meio da tela, com dois toques de som. A ordem fica na faixa de baixo.', ir: { aba: 'cenas', g: 'Os turnos' } },
        { t: 'O painel de barras', txt: 'No seu turno abre, no canto do mapa, o painel da barra da sua raça ou classe: as escolhas (postura, forma, compasso…) e os ganhos da rodada. Cada toque vai para a ficha e para a mesa ao vivo; “Desfazer” volta o último. Fora da vez, ele vira uma moeda.', ir: { aba: 'cenas', g: 'O painel de barras' } },
        { t: 'O cinto de poções (Yanato)', txt: 'Com a escola Yanato, o painel de barras mostra o cinto: um vidro por laço (3, e mais um por grau do Bornal de Cinza). Toque num vidro para usar. O Frasco de Cinza é o de arremessar; as poções de beber somam Toxicidade (de 0 a 20: 10 Enjoado, 15 Intoxicado, 20 o corpo cede), que baixa 1 por turno. “Arrumar o cinto” escolhe o que vai em cada laço; “Descanso longo” enche tudo e zera a Toxicidade.', ir: { aba: 'cenas', g: 'O painel de barras' } },
        { t: 'Poção em outra pessoa', txt: 'No painel, “Em quem” deixa usar a poção em qualquer token — um aliado, um NPC. O mestre aplica em seguida.' },
        { t: 'Tirar uma condição', txt: 'Na faixa de baixo, um clique na condição do seu token tira ela, com Desfazer.' },
      ],
      mestre: [
        { t: 'Trocar e organizar as cenas', txt: 'O botão da cena abre a lista: pastas (“Organizar em pastas…”), famílias (a cidade, o bairro, a casa — uma cena dentro da outra) e as cenas ligadas ao Mapa-múndi.', ir: { aba: 'cenas', g: 'Trocar de cena' } },
        { t: 'Gerar um lugar', txt: 'No botão de cenas, “Gerar um lugar…”. À esquerda, os lugares em grupos: Povoados (Vilarejo, Cidade, Tribo, Porto), Natureza (Encontro, Região livre), Água e penhasco (Lago, Praia, Penhasco, Desfiladeiro), Fortes e ruínas (Castelo, Ruínas, Cemitério), Subterrâneo (Masmorra, Catacumbas) e Especiais (Cena do crime, Arena). No meio, a prévia grande: clique numa parte para travar e “Gerar outro” sorteia só o resto. À direita, os blocos: o lugar, o Ambiente (estilo, hora, clima, estação), Povoar (luzes, inimigos do Bestiário, moradores, saque) e Mistério — tudo oculto até você revelar. A cena gerada num hexágono do Mapa-múndi segue o mapa: a margem da água (areia, junco, falésia ou gelo) e, no desfiladeiro, a direção da fenda, o rio no fundo e a ponte onde a estrada cruza. Os lugares já vêm com a feira na praça, o bote no rio, a forja com a pedra de amolar, o quadro de missões na taverna, os bonecos de treino do castelo, as pontes de madeira ou de pedra e, nas catacumbas, túneis cavados na rocha.', ir: { aba: 'cenas', g: 'Povoar o lugar' } },
        { t: 'A cena do crime', txt: 'A aba Cena do crime gera a mansão, a taverna, o beco, a cripta ou a clareira da lua cheia. Em qualquer lugar, o bloco Mistério põe um caso do Escudo (ou um caso novo) na cena: o corpo coberto (ou o lugar revirado) e uma marca de pista oculta para cada vestígio e documento, perto de onde ela costuma ficar. Dois cliques numa marca a revelam e entregam a pista à mesa.', ir: { aba: 'cenas', g: 'A cena do crime e as pistas' } },
        { t: 'As ferramentas', txt: 'Na barra da esquerda: selecionar, mover, régua, tokens, objetos (J), desenho (paredes, portas, janelas, relevo), luz, névoa (U), efeitos de magia (Y) e o grupo Mestre (a vez, os momentos, os lembretes, a cura e as energias).', ir: { aba: 'cenas', g: 'As ferramentas' } },
        { t: 'Os turnos', txt: 'Na aba Turnos: puxe o grupo, role a iniciativa (com faixas de grupo para muitos inimigos), comece o combate. N passa a vez, Shift+N volta. Atrasar, pular, entrar no combate, surpresa e o olho que esconde um combatente dos jogadores.', tecla: 'N', ir: { aba: 'cenas', g: 'Atrasar, pular, entrar' } },
        { t: 'Ataque e rolagem geral', txt: 'K sobre um token abre o ataque com defesa (o jogador recebe o pedido de defesa na mesa ao vivo). Shift+F rola o mesmo atributo para vários tokens — a Percepção do grupo — pedindo aos jogadores ou rolando por todos.', tecla: 'K · Shift+F' },
        { t: 'Condições e zonas', txt: 'Mais de 150 condições em abas (com busca) e dezenas de zonas no chão. Zona com dano pergunta “Aplicar” ou “Pular” no começo da vez de quem está dentro — nada acontece sozinho. Fogo no óleo, raio na água: o site sugere a combinação.', ir: { aba: 'cenas', g: 'As condições das raças' } },
        { t: 'Momentos preparados', txt: 'Na aba Cena: junte tokens que aparecem, luzes que acendem, a névoa, um som para todos e uma narração. Na hora, “Soltar” faz tudo de uma vez, com Desfazer.', ir: { aba: 'cenas', g: 'Momentos preparados' } },
        { t: 'Lembretes por rodada e reforços', txt: '“Rodada 3: reforços chegam” — na rodada certa, só você vê o lembrete e “Fazer” revela os tokens. O Ponto de reforço guarda tokens escondidos que chegam depois de X rodadas, em ondas ou numa fase da arena.', ir: { aba: 'cenas', g: 'Lembretes por rodada' } },
        { t: 'Objetos vivos', txt: 'Dois cliques num objeto trocam o estado: o baú abre, a alavanca puxa (e abre o portão ligado), a armadilha dispara, a tocha apaga. Portões barram como portas, grades deixam ver.', ir: { aba: 'cenas', g: 'Objetos com estado' } },
        { t: 'O fim do combate', txt: '“Encerrar” zera a iniciativa e roda o fim de cada barra do painel; o aviso oferece “Restaurar” as energias de quem lutou. A Cura total enche HP e SP. Barras com o cadeado “Só à mão” ninguém mexe.', ir: { aba: 'cenas', g: 'O fim do combate e as barras' } },
      ],
    },
    {
      id: 'fichas', nome: 'Fichas', grupo: 'jogar',
      resumo: 'Os personagens: atributos, barras, itens, skills, relações, missões e tropas. Tudo o que muda na cena muda aqui também.',
      img: { arq: 'fichas.jpg', legenda: 'Uma ficha aberta.', marcas: [
        { sel: '#lista', t: 'O elenco: Ativos, Inativos e Toldo, por grupo.' },
        { sel: '#resumo', t: 'O resumo fixo: barras, atributos, defesas, lapros, ferimentos.' },
        { sel: '#ficha .abasficha', t: 'As abas da ficha: Atributos, Bolsas e itens, Social, Skills, Notas (e Tropas).' },
      ] },
      jogador: [
        { t: 'O resumo de cima', txt: 'Fica fixo enquanto você troca de aba. Nas barras, digite −8 para tirar, +5 para pôr, 50% para deixar na metade; Enter confirma, Esc desfaz. O quadro “Agora” mostra os bônus que estão valendo neste momento.', ir: { aba: 'fichas', g: 'A sua ficha' } },
        { t: 'Simples e Completo', txt: 'O modo Simples (o padrão) mostra só o que se usa na sessão. O Completo traz as tags, o aniversário e os outros campos.' },
        { t: 'Equipamentos e itens', txt: 'Em Bolsas e itens: cartões por tipo, a chave de equipado, grupos de troca (equipar uma espada guarda as outras), itens com níveis (◂ Nv ▸) e itens que só funcionam juntos. Poções com vários efeitos; “Usar” deixa escolher em quem.' },
        { t: 'A caixinha do grupo', txt: 'Os lapros que o grupo guarda junto. Você põe e pega com os lapros da ficha; o extrato mostra quem fez o quê.', ir: { aba: 'fichas', g: 'A caixinha do grupo' } },
        { t: 'Skills e favoritas', txt: 'A aba Skills é uma lista com ícones (ofensiva, defensiva, suporte…), o custo e o efeito na barra (▼ gasta, ▲ enche). O filtro de um toque e a estrela das favoritas, que sobem para o topo.', ir: { aba: 'fichas', g: 'O filtro de um toque e as favoritas' } },
        { t: 'Rolar pela ficha', txt: 'A rolagem rápida da ficha tem “+ atributo” e “+ resultado”; eles ficam guardados para a próxima até você zerar no ×.' },
        { t: 'Missões, aniversário e relações', txt: 'Em Notas, as missões do grupo; em Atributos, o aniversário no calendário do mundo; em Social, os relacionamentos que o mestre revelou.', ir: { aba: 'fichas', g: 'As missões' } },
        { t: 'As tropas', txt: 'Se o seu personagem comanda uma tropa, a aba Tropas mostra cada unidade em carta. Em “Editar o que é seu” você escolhe os nomes, os brasões, os equipamentos e os soldados com nome.', ir: { aba: 'fichas', g: 'As tropas' } },
        { t: 'Perícias e veterania das tropas', txt: 'Cada unidade tem perícias de 0 a 10 (Investigação, Caçada, Rastreio, Emboscada…): o botão d20 rola 1d20 + os pontos. A veterania vai de Recruta a Elite e depois vira estrela: Lendária (★) e Mítica (★★). Os soldados com nome ganham o nascimento, e a idade cresce com o calendário do mundo.', ir: { aba: 'fichas', g: 'As perícias das tropas' } },
      ],
      mestre: [
        { t: 'O elenco', txt: 'Ativos (na aventura), Inativos (fora desta sessão) e Toldo (longe da aventura, fora do “Puxar o grupo”). Arraste para mudar de aba, ou “Vários” para mover várias fichas de uma vez.', ir: { aba: 'fichas', g: 'O elenco e os grupos' } },
        { t: 'Quem vê e quem controla', txt: 'Em cada ficha: o dono e se os outros jogadores veem. Ferimentos com cadeado, Estaque escondido, relações escondidas ou reveladas uma a uma.', ir: { aba: 'fichas', g: 'Quem vê e quem controla' } },
        { t: 'Criar o personagem com o jogador', txt: 'No menu da mesa, “Ficha…” ao lado do jogador. Ele recebe o aviso e cria passo a passo (raça, classe, atributos, primeiras habilidades); você confere depois. “Criar background” faz os NPCs da história dele.' },
        { t: 'Tabelas base', txt: 'As regras que valem para a mesa: os tipos de equipamento, a corrupção, as listas das tropas e o bônus da veterania.' },
        { t: 'A corrupção', txt: 'Vampírica, licantropa ou demoníaca, em cinco estágios. O painel fica em cima da ficha, só para você e o dono.', ir: { aba: 'fichas', g: 'A corrupção' } },
        { t: 'Dar uma tropa', txt: '“+ Tropas”, no fim das abas. Você define os números (tropas, HP, ATQ, DEF, veterania), registra batalhas e liga a tropa a um exército do Mapa-múndi.', ir: { aba: 'fichas', g: 'As tropas' } },
        { t: 'As perícias das tropas', txt: 'Nas Tabelas base, a lista das perícias (renomeie, tire, ponha outras) e duas chaves: os jogadores distribuem os pontos, e a rolagem soma o bônus da veterania. Os pontos de cada unidade ficam em “Pontos…”, na carta.', ir: { aba: 'fichas', g: 'As perícias das tropas' } },
      ],
    },
    {
      id: 'arvore', nome: 'Árvore', grupo: 'jogar',
      resumo: 'As árvores de habilidade do seu personagem: o que ele já aprendeu, o que pode aprender e quanto custa.',
      jogador: [
        { t: 'O seu personagem na árvore', txt: 'O painel mostra os pontos de cada tipo (Raça, Classe, Escola, Linhagem…) e o teto do nível. Clique num nó para ler e aprender.', ir: { aba: 'arvore', g: 'O seu personagem' } },
        { t: 'A busca', txt: 'Acha pelo nome e pelo texto de cada grau, em todas as árvores. Um clique leva até lá; “← Voltar” volta.', ir: { aba: 'arvore', g: 'A busca' } },
        { t: 'Os ícones dos nós', txt: 'O ícone diz o papel (espada ofensiva, escudo defensiva, cruz suporte…), o canto diz quando entra (o raio da reação, o anel da passiva), e ▼ ▲ dizem o que faz com a barra especial.', ir: { aba: 'arvore', g: 'Os ícones dos nós' } },
        { t: 'Contas e links', txt: 'Números como {FOR*2 + 10} viram o número do seu personagem (passe o mouse para ver a conta). O nome de outra habilidade no texto é um link.' },
        { t: 'Favoritar', txt: 'No painel de uma habilidade que você já tem, “Favoritar” a leva para o topo das Skills da ficha.' },
      ],
      mestre: [
        { t: 'A Árvore de quem mestra é a Oficina', txt: 'Quem mestra monta as árvores na aba Oficina (grupo Mestre). Veja a página da Oficina.' },
      ],
    },
    {
      id: 'oficina', nome: 'Oficina', grupo: 'mestre', soMestre: true,
      resumo: 'Onde quem mestra monta e edita as árvores de habilidade da mesa.',
      img: { arq: 'oficina.jpg', legenda: 'A Oficina com uma árvore aberta.', marcas: [
        { sel: '.seg[aria-label="Modo"]', t: 'Mestre (editar) e Jogador (ver como o personagem vê).' },
        { sel: '#busca', t: 'A busca pelo nome e pelo texto dos graus.' },
      ] },
      jogador: [],
      mestre: [
        { t: 'Selecionar árvore', txt: '“Selecionar árvore” (ou a tecla A) abre Raças, Linhagens, Classes, Escolas, Profissões e Outros, com busca e as últimas abertas.', tecla: 'A' },
        { t: 'Editar um nó', txt: 'Clique num nó: o texto de cada grau, o custo de uso, o papel (os 8 ícones), o efeito na barra, “Trancado” (só para quem você abrir) e as contas com os números da ficha.', ir: { aba: 'oficina', g: 'O papel e o efeito na barra' } },
        { t: 'Mestre e Jogador', txt: 'O modo Jogador mostra a árvore como um personagem vê, e é onde você cria skills únicas para ele.', ir: { aba: 'oficina', g: 'Mestre e Jogador' } },
        { t: 'A barra da raça e da classe', txt: 'Cada árvore de raça, classe ou linhagem mostra a barra que traz para a ficha, já preenchida pelo guia de barras. “Voltar ao guia” desfaz o que você mudou.', ir: { aba: 'oficina', g: 'A barra da raça e da classe' } },
        { t: 'Tags', txt: 'O botão Tags: a explicação das condições, efeitos e recursos que aparece ao passar o mouse em qualquer texto do site.' },
        { t: 'Tipos de ponto e teto', txt: 'Em Tipos de ponto, a coluna “Por nível” define o teto de cada tipo (3 em Raça e Classe). A ficha mostra o teto, mas não trava.' },
      ],
    },
    {
      id: 'rolador', nome: 'Rolador', grupo: 'jogar', soMestre: true,
      resumo: 'A ferramenta de dados do mestre: rolagens com fixa, dados livres, tabelas e duelos, com histórico por sessão.',
      img: { arq: 'rolador.jpg', legenda: 'O Rolador.', marcas: [
        { sel: '#fAtr', t: 'O atributo e quanto fixar (ou Dados, Tabela, Duelo nas abas de cima).' },
        { sel: '#rollBtn', t: 'Rolar: o resultado aparece grande ao lado.' },
        { sel: '#histBtn', t: 'O histórico de cada sessão.' },
      ] },
      jogador: [],
      mestre: [
        { t: 'Rolar', txt: 'Fixa (o atributo e quanto fixar), Dados, Tabela ou Duelo. O resultado aparece grande e vai para o histórico.', ir: { aba: 'rolador', g: 'Rolar' } },
        { t: 'Tabelas', txt: 'Monte tabelas suas (encontros, tesouros, clima) e role nelas.', ir: { aba: 'rolador', g: 'As tabelas' } },
        { t: 'Histórico e resumo', txt: 'Cada sessão tem o seu histórico, com separadores e filtro.' },
      ],
    },
    {
      id: 'loja', nome: 'Loja', grupo: 'jogar',
      resumo: 'Aparece quando o grupo do seu personagem para no lugar de uma loja do Mapa-múndi.',
      jogador: [
        { t: 'Quando a Loja aparece', txt: 'Ela surge na barra quando um personagem seu está no hexágono de uma loja aberta pelo mestre.', ir: { aba: 'loja', g: 'A loja por perto' } },
        { t: 'Comprar', txt: 'Os lapros saem da ficha e o item vai para a bolsa. Cada compra tem Desfazer por 15 minutos.', ir: { aba: 'loja', g: 'Comprar' } },
      ],
      mestre: [
        { t: 'Abrir uma loja', txt: 'Na aba Itens → Lojas: cada loja fica num lugar do Mapa-múndi, com o preço e o estoque. No mapa, o grupo precisa ter os personagens que andam com ele (painel do grupo).' },
        { t: 'Ver as compras', txt: 'As compras aparecem no Jornal, com “Desfazer a compra”.' },
      ],
    },
    {
      id: 'pistas', nome: 'Pistas', grupo: 'jogar',
      resumo: 'O que o mestre entregou: imagens, cartas e puzzles — e os casos, com o mural do grupo. Aparece quando você recebe a primeira.',
      jogador: [
        { t: 'As pistas', txt: 'Quando chega uma pista, abre uma janela. Tudo fica guardado na aba, com busca.', ir: { aba: 'pistas', g: 'As pistas' } },
        { t: 'Resolver juntos', txt: 'Os puzzles são resolvidos em grupo: cada lance aparece para os outros na hora, e a mesa ao vivo avisa quando resolvem. Alguns têm cronômetro.', ir: { aba: 'pistas', g: 'Os puzzles' } },
        { t: 'Os casos e o mural', txt: 'Quando o mestre abre um mistério, ele aparece em Casos. Cada pista é um cartão preso no mural do grupo: arrastem, liguem com fio o que se conecta (“Ligar com fio” e dois cartões) e colem notas. Tudo aparece para os outros na hora.', ir: { aba: 'pistas', g: 'Os casos e o mural' } },
        { t: 'Interrogatório e acusação', txt: 'Ao lado do mural, os suspeitos que o mestre mostrou, com a aparência (os traços que as pistas apontam) e o que cada um disse no interrogatório. “Acusar…” aponta o culpado e diz por quê; o mestre confirma ou não, e o veredito aparece para o grupo.' },
      ],
      mestre: [
        { t: 'Entregar', txt: 'Handouts e puzzles são criados no Escudo do mestre → Handouts e puzzles, e entregues à mesa toda ou só a alguns. Você revela partes escondidas aos poucos.' },
        { t: 'Os casos', txt: 'Os mistérios abertos à mesa no Escudo (aba Mistérios) aparecem em Casos, com o mural do grupo. Você entrega cada pista (no Escudo ou revelando a marca na cena do crime), mostra os suspeitos e confirma a acusação.' },
      ],
    },
    {
      id: 'mundo', nome: 'Mapa-múndi', grupo: 'mundo',
      resumo: 'O mundo inteiro: o mapa, a data e o clima, as viagens, os reinos, a corte, a diplomacia, a guerra e a economia.',
      img: { arq: 'mundo.jpg', legenda: 'O Mapa-múndi com um mapa em branco.', marcas: [
        { sel: '#btMapa', t: 'Trocar de mapa e o menu do mapa.' },
        { sel: '#rail', t: 'As ferramentas: Sessão, Traçar, Preparar.' },
        { sel: '#tabs', t: 'As abas do painel: Sessão, Política e Preparar (teclas 1 a 6).' },
      ] },
      jogador: [
        { t: 'O mapa', txt: 'Arraste para andar, a roda para aproximar. Você vê o que o mestre deixou à vista; o resto fica sob a névoa.', ir: { aba: 'mundo', g: 'O mapa' } },
        { t: 'Rios e estradas', txt: 'Os rios correm de hexágono em hexágono até o lago ou o mar; as estradas (de terra, de pedra e pavimentada) deixam a viagem mais rápida, e a ponte aparece onde a estrada cruza o rio.' },
        { t: 'Costas, lagos e desfiladeiros', txt: 'A beira da água mostra o que há nela: praia, junco, o paredão da falésia ou o gelo. O desfiladeiro é uma fenda funda; atravessar sem ponte é lento, e a ponte suspensa da estrada é o atalho.', ir: { aba: 'mundo', g: 'O mapa' } },
        { t: 'A data, a hora e o clima', txt: 'Junto da data: o dia da semana, o tempo de marcha (“4º tempo de 10”) e o clima de agora. Clicar na data mostra a campanha que está no mapa.', ir: { aba: 'mundo', g: 'A data do mundo' } },
        { t: 'O painel', txt: 'Hoje (eventos, viagem), Reinos (a sua facção, o Livro do reino), Corte (quem vocês conhecem, árvores de família, títulos), Diplomacia e Intrigas (os segredos descobertos).', ir: { aba: 'mundo', g: 'O painel' } },
        { t: 'Camadas', txt: 'O botão Camadas (tecla C) mostra e esconde cidades, estradas, eventos, regiões, guerra… só no seu aparelho. Atalhos Viagem, Política, Guerra e Tudo.', tecla: 'C' },
        { t: 'A caneta', txt: 'Desenhe para a mesa inteira ver na hora. A que some apaga sozinha; a que fica, até limpar.', ir: { aba: 'mundo', g: 'A caneta' } },
      ],
      mestre: [
        { t: 'Criar o mapa', txt: 'Uma imagem sua ou papel em branco. Na aba Terreno, a grade de hexágonos (cada um vale 5 cubos), os tipos de terreno com o custo, e o pincel para pintar.', ir: { aba: 'mundo', g: 'Trocar de mapa' } },
        { t: 'Rios e estradas por hexágono', txt: 'No pincel por hexágono (Terreno, H): Rio, Estrada de terra (4 cubos), Estrada de pedra (3) e Estrada pavimentada (2). O fundo pega o terreno dos vizinhos e a água ou a estrada liga sozinha às do lado. Pinte a estrada por cima do rio: o rio fica e a ponte aparece, custando o da estrada. Sem ponte, atravessar o rio custa 10. Num mapa de antes, a aba Terreno oferece “Acrescentar”.', ir: { aba: 'mundo', g: 'Rios e estradas' } },
        { t: 'Lagos, mares e desfiladeiros', txt: 'Pinte a Água, a Água rasa, o Mar profundo ou o Lago (água doce, 10 cubos): a água vira um corpo só e a margem sai sozinha do terreno vizinho (areia, junco, falésia ou gelo), com o raso clareando perto da terra. O Desfiladeiro liga aos vizinhos como o rio; o rio corre no fundo dele e a estrada que o atravessa ganha uma ponte suspensa. Os montes vizinhos viram cordilheira.', ir: { aba: 'mundo', g: 'Lagos, mares e desfiladeiros' } },
        { t: 'Ferramentas', txt: 'Marcadores (cidades, portos, ruínas, lojas…), Grupos (o dos jogadores, caravanas, patrulhas, exércitos), Rotas, Regiões, Desenho com carimbos, Terreno (H), Frente (guerra e zonas de perigo) e Eventos.', ir: { aba: 'mundo', g: 'As ferramentas' } },
        { t: 'Passar o tempo e viajar', txt: '“+1 tempo” leva todos os grupos com rota; ▶ passa o dia. O clima muda aos poucos, os eventos pesam na viagem e as caravanas andam sozinhas. Tudo tem Desfazer.', ir: { aba: 'mundo', g: 'A data do mundo' } },
        { t: 'Ver como jogador', txt: 'A chave “Ver como jogador” mostra o mapa exatamente como a mesa vê.', ir: { aba: 'mundo', g: 'Ver como jogador' } },
        { t: 'Gerar a cena aqui', txt: 'No grupo: abre o gerador das Cenas já com o terreno do hexágono, os vizinhos, o rio, a hora, o clima, a estação e as marcas da guerra. Nos marcadores, “Gerar este lugar…” gera a cidade, o castelo, a masmorra.' },
        { t: 'Sortear encontro', txt: 'Usa a tabela da região ou do bioma (Escudo → Encontros), mostra a dificuldade contra o grupo e “Puxar para a cena”.' },
        { t: 'Política e guerra', txt: 'Reinos (facções, bandeiras, economia, construções, guildas), Corte (casas, títulos, sucessão), Diplomacia (opinião, tratados, vassalagem, guerra e paz), Intrigas e Guerra (exércitos, batalhas resumidas ou detalhadas, cerco, ocupação).', ir: { aba: 'mundo', g: 'A guerra no mapa' } },
        { t: 'Linha do tempo', txt: 'Cada campanha numa data. “Parou aqui” e “Terminar a sessão…” guardam onde cada linha parou; quem está atrás é avisado do que o mundo já tem depois.' },
      ],
    },
    {
      id: 'jornal', nome: 'Jornal', grupo: 'mundo',
      resumo: 'O jornal da mesa, com cara de jornal antigo: a edição de agora, os boatos, os anúncios e as cartas dos leitores.',
      img: { arq: 'jornal.jpg', legenda: 'O Jornal no modo de escrever.', marcas: [
        { sel: '#modos', t: 'Escrever, “Como os jogadores verão” e Publicado.' },
        { sel: '#btPublicar', t: 'Publicar a edição (pergunta antes, com Desfazer).' },
      ] },
      jogador: [
        { t: 'Ler', txt: 'Quando sai uma edição nova, a aba ganha uma bolinha e o Jornal abre para você (com “Voltar”).', ir: { aba: 'jornal', g: 'O jornal' } },
        { t: 'Cartas ao jornal', txt: 'Escreva assinando por um personagem seu ou anônima. Você vê se a carta saiu, se espera ou se não saiu.' },
      ],
      mestre: [
        { t: 'Escrever e publicar', txt: 'O nome do jornal, a data do mundo, o clima, as matérias (a primeira é a manchete), boatos e anúncios — vendo ao lado como os jogadores verão.', ir: { aba: 'jornal', g: 'Ler e escrever' } },
        { t: 'Sugestões prontas', txt: 'O rascunho recebe o que o mundo manda: o resumo da semana, a guerra declarada, os aniversários, o resumo da sessão do roteiro. Você revisa antes de publicar.', ir: { aba: 'jornal', g: 'Sugestões no rascunho' } },
        { t: 'As cartas', txt: '“Pôr no jornal” (corrigindo antes) ou “Não publicar”.' },
      ],
    },
    {
      id: 'cla', nome: 'Clã', grupo: 'mundo',
      resumo: 'O clã dos jogadores e os clãs de NPC: hierarquia, construções, cofre, respeito, sede e tropas.',
      img: { arq: 'cla.jpg', legenda: 'O Clã com um clã criado.', marcas: [
        { sel: '[data-k="novo-cla"]', t: 'Criar os clãs: o dos jogadores e os de NPC.' },
        { sel: '[data-k="c:brasao"]', t: 'O brasão (forma, divisão, cores e símbolo).' },
        { sel: '[data-k="sec:sede"]', t: 'A Sede: as plantas dos prédios, que viram cena.' },
      ] },
      jogador: [
        { t: 'O salão do clã', txt: 'As bandeiras do brasão e as abas: Hierarquia (a árvore de cargos), Construções, Cofre, Respeito e relações, Sede, Tropas e Histórico.', ir: { aba: 'cla', g: 'O clã' } },
        { t: 'Os membros', txt: 'A aba Membros lista todo mundo do clã, com cargo ou sem: o nome, a raça, a classe e a idade, que cresce com o calendário do mundo.', ir: { aba: 'cla', g: 'Os membros do clã' } },
        { t: 'Se você é o líder', txt: 'Você cria, renomeia, move e preenche os cargos abaixo do seu.' },
        { t: 'As tropas do clã', txt: 'Quem lidera o clã vê todas; quem lidera uma tropa vê a dela.', ir: { aba: 'cla', g: 'As tropas do clã' } },
      ],
      mestre: [
        { t: 'Criar os clãs', txt: 'O dos jogadores e os de NPC, com o brasão. Dos de NPC, você escolhe parte por parte o que os jogadores veem.', ir: { aba: 'cla', g: 'Os clãs da mesa' } },
        { t: 'Os membros do clã', txt: 'No cartão Membros, “+ Membro”: o nome (ou uma ficha, que traz o nome e o aniversário), a raça, a classe, o nascimento no calendário do mapa principal e o cargo — ou sem cargo. No rol você muda tudo e tira do clã (o respeito fica guardado).', ir: { aba: 'cla', g: 'Os membros do clã' } },
        { t: 'A foto e o clã na cena', txt: 'Clique no avatar de um membro para pôr a foto. Nas Cenas, “Puxar o clã…” cria os tokens dos membros que você marcar, com o nome, a foto e a borda na cor do brasão.', ir: { aba: 'cla', g: 'A foto dos membros e o clã na cena' } },
        { t: 'Membros ligados', txt: '“Ficha…” liga um membro a uma ficha; “Das fichas…” traz um grupo das Fichas ou uma campanha de uma vez; “Das tropas…” traz os soldados com nome das tropas do clã. Membro e soldado ficam ligados: o que muda num muda no outro.', ir: { aba: 'cla', g: 'Membros ligados às fichas e às tropas' } },
        { t: 'A Sede', txt: 'Arraste plantas prontas para o terreno; “Editar no construtor” monta os cômodos; “Ver nas Cenas” cria a cena da sede.', ir: { aba: 'cla', g: 'A Sede' } },
        { t: 'Construções, cofre e respeito', txt: '“Subir de nível” desconta do cofre. Respeito no mundo, relações e respeito de cada membro, com o motivo indo para o histórico.' },
      ],
    },
    {
      id: 'livro', nome: 'Bestiário do clã', grupo: 'mundo',
      resumo: 'O livro de caça do clã, escrito à mão: o que o clã já descobriu de cada criatura.',
      jogador: [
        { t: 'O livro do clã', txt: 'Cada página tem o desenho, o que se sabe, as fraquezas e resistências e o que a criatura deixa cair. O que ainda não se sabe aparece borrado.', ir: { aba: 'livro', g: 'O livro do clã' } },
        { t: 'Anotar na margem', txt: 'Anotações assinadas com o nome do seu personagem; você muda ou apaga a sua.', ir: { aba: 'livro', g: 'Anotar na margem' } },
      ],
      mestre: [
        { t: 'Montar o livro', txt: 'Página por página, ou “Enviar ao livro do clã” na gaveta do Bestiário. Revele parte por parte e libere o livro quando quiser.', ir: { aba: 'livro', g: 'Uma página nova' } },
        { t: 'Como o clã vê', txt: 'Mostra exatamente o que chega aos jogadores.', ir: { aba: 'livro', g: 'Como o clã vê' } },
      ],
    },
    {
      id: 'acampamento', nome: 'Acampamento', grupo: 'descanso',
      resumo: 'Onde o grupo descansa: rações, áreas, construções, caravana, caça, bancada e os momentos em volta da fogueira.',
      img: { arq: 'acampamento.jpg', legenda: 'O Acampamento à noite.', marcas: [
        { sel: '#areas', t: 'As áreas: Fogueira, Oficinas, Convívio, Guarda e Cuidado, Caça.' },
        { sel: '#acoes', t: 'Descanso curto e Descanso longo (com prévia).' },
      ] },
      jogador: [
        { t: 'A emoção do personagem', txt: 'Escolha a emoção (Calmo, Alegre, Com raiva…): um brilho na cor dela aparece em volta do retrato, para todos.' },
        { t: 'As áreas', txt: 'Cada personagem fica numa área; os suportes podem trabalhar nas oficinas.', ir: { aba: 'acampamento', g: 'O acampamento' } },
        { t: 'Caça e bancada', txt: 'Quem caça rola no descanso longo. Na Bancada, as receitas: os ingredientes saem da bolsa e o resultado entra.', ir: { aba: 'acampamento', g: 'A bancada' } },
        { t: 'Linhas de relação', txt: 'Clique num personagem na cena para ver o que cada um sente pelo outro (o que está aberto).' },
      ],
      mestre: [
        { t: 'Os descansos', txt: 'Curto e longo, com a prévia de quem come o quê, o que cada barra recupera e os bônus que acabam. Nada muda até aplicar.', ir: { aba: 'acampamento', g: 'Os descansos' } },
        { t: 'Provisões', txt: 'Rações com efeito (Conforto, Sanidade, bônus, barras), banquete, quanto cada raça come.', ir: { aba: 'acampamento', g: 'As rações' } },
        { t: 'Estrutura e caravana', txt: 'Construções em três níveis (forja, enfermaria, torre de vigia…), lugar e clima, veículos e carga.' },
        { t: 'Momentos e todos de uma vez', txt: 'O momento em volta da fogueira mexe nos corações, na Sanidade, no Conforto e na emoção, numa tabela com prévia. “Mexer em todos” muda Fadiga, Conforto e Sanidade do grupo inteiro.', ir: { aba: 'acampamento', g: 'Momentos e todos de uma vez' } },
      ],
    },
    {
      id: 'meditacao', nome: 'Meditação', grupo: 'descanso',
      resumo: 'Onde os personagens meditam, descobrem receitas combinando símbolos e palavras, e guardam o dicionário.',
      img: { arq: 'meditacao.jpg', legenda: 'A Meditação no templo da montanha.', marcas: [
        { sel: '#ambientes', t: 'O ambiente, a hora e o clima da cena.' },
        { sel: '#painel', t: 'Quem medita, a prática de cada um e as palavras.' },
      ] },
      jogador: [
        { t: 'Meditar', txt: 'A prática do seu personagem (objeto, mantra, panteão e a imagem meditando) e o botão “Meditar”.', ir: { aba: 'meditacao', g: 'Meditar' } },
        { t: 'Os pilares', txt: 'Quando o mestre libera, combine de 2 a 5 símbolos ou palavras. Acertou uma receita? Você descobre o efeito.', ir: { aba: 'meditacao', g: 'Palavras nos pilares' } },
        { t: 'O dicionário', txt: 'As palavras que o personagem recebeu, com sentido, nota, busca e estrela.', ir: { aba: 'meditacao', g: 'O dicionário' } },
      ],
      mestre: [
        { t: 'A cena', txt: 'Oito ambientes desenhados ou uma imagem sua, a hora e o clima. Chame e tire quem medita e libere tentativas.', ir: { aba: 'meditacao', g: 'Os ambientes' } },
        { t: 'Receitas e palavras', txt: 'Escreva as receitas (sequência, efeito, para quem). “Dar uma palavra…” entrega palavras a um ou mais personagens.', ir: { aba: 'meditacao', g: 'As palavras' } },
      ],
    },
    {
      id: 'bestiario', nome: 'Bestiário', grupo: 'mestre', soMestre: true,
      resumo: 'Os inimigos do mestre em cartas, com os números pela regra das fichas, e a bandeja que monta o encontro.',
      img: { arq: 'bestiario.jpg', legenda: 'O Bestiário com um inimigo.', marcas: [
        { sel: '#btNovo', t: '“+ Inimigo”: tier, level, tags, números e equipamento.' },
        { sel: '#bandeja', t: 'A bandeja do encontro, com a dificuldade contra o grupo.' },
      ] },
      jogador: [],
      mestre: [
        { t: 'Um inimigo novo', txt: 'Tier e level; os números saem pela regra (ou à mão), a árvore se distribui pelas prioridades. Tags de bioma, tipo, papel e facção.', ir: { aba: 'bestiario', g: 'Um inimigo novo' } },
        { t: 'Montar o encontro', txt: 'Ponha os inimigos na bandeja: ela mostra a dificuldade contra o grupo e puxa as cópias para a cena.', ir: { aba: 'bestiario', g: 'O encontro' } },
        { t: 'Na cena', txt: 'Os tokens rolam e defendem com os números do Bestiário (F e K), mostram o lembrete de comportamento e “Rolar o saque”.' },
        { t: 'Usado em outros lugares', txt: 'As tabelas de encontro do Escudo, o “Povoar o lugar” das Cenas e o livro de caça do clã usam os inimigos daqui.' },
      ],
    },
    {
      id: 'itens', nome: 'Itens', grupo: 'mestre', soMestre: true,
      resumo: 'O catálogo de itens da mesa, as lojas do mundo e as receitas da bancada.',
      img: { arq: 'itens.jpg', legenda: 'O catálogo de Itens.', marcas: [
        { sel: '#aba-catalogo', t: 'O catálogo: itens da bolsa e equipamentos, com o preço.' },
        { sel: '#aba-lojas', t: 'As lojas, cada uma num lugar do Mapa-múndi.' },
        { sel: '#aba-receitas', t: 'As receitas da bancada do Acampamento.' },
      ] },
      jogador: [],
      mestre: [
        { t: 'O catálogo', txt: 'Itens da bolsa e equipamentos com preço. “Dar a…” põe um item na ficha de alguém.', ir: { aba: 'itens', g: 'O catálogo' } },
        { t: 'As lojas', txt: 'Cada loja num lugar do Mapa-múndi, com preço e estoque. A aba Loja aparece para quem estiver lá.', ir: { aba: 'itens', g: 'As lojas' } },
        { t: 'As receitas', txt: 'Ingredientes, resultado e o teste — e o que acontece se falhar.', ir: { aba: 'itens', g: 'As receitas' } },
      ],
    },
    {
      id: 'escudo', nome: 'Escudo do mestre', grupo: 'mestre', soMestre: true,
      resumo: 'A preparação da sessão: o roteiro, os relógios de ameaça, os handouts e puzzles, os NPCs, as tabelas de encontro e os mistérios.',
      img: { arq: 'escudo.jpg', legenda: 'O Escudo, na aba Roteiro.', marcas: [
        { sel: '[data-k="aba:roteiro"]', t: 'O Roteiro: cada sessão é uma lista de passos que fazem a ação.' },
        { sel: '[data-k="aba:relogios"]', t: 'Os relógios de ameaça.' },
        { sel: '[data-k="aba:handouts"]', t: 'Handouts e puzzles.' },
        { sel: '[data-k="aba:npcs"]', t: 'O gerador de NPCs e as raças da mesa.' },
        { sel: '[data-k="aba:encontros"]', t: 'As tabelas de encontro por bioma.' },
        { sel: '[data-k="aba:misterios"]', t: 'Os mistérios: o caso, os suspeitos e as pistas.' },
      ] },
      jogador: [],
      mestre: [
        { t: 'O roteiro', txt: 'Cada sessão é uma lista de passos; cada passo pode abrir uma cena, um lugar do mapa, um encontro, um handout ou um relógio — o botão do passo faz a ação. Ao fechar, o que sobrou vai para a próxima e sai o resumo para o Jornal.', ir: { aba: 'escudo', g: 'O roteiro' } },
        { t: 'Os relógios', txt: 'Gomos que enchem até a consequência (só você vê). Os relógios à vista aparecem num cantinho das Cenas.', ir: { aba: 'escudo', g: 'Os relógios' } },
        { t: 'Handouts e puzzles', txt: 'Imagens e cartas com trechos escondidos, revelados aos poucos. Mais de 20 puzzles com solução garantida, em três dificuldades, testáveis na prévia; acertar pode revelar outro handout ou abrir uma porta das Cenas.', ir: { aba: 'escudo', g: 'Handouts' } },
        { t: 'NPCs', txt: '“Gerar NPC” dá três opções (nome no estilo do povo, aparência, jeito, segredo, gancho). Um clique: virar ficha, token na cena ou pôr no roteiro.', ir: { aba: 'escudo', g: 'Os NPCs' } },
        { t: 'Encontros por bioma', txt: 'Uma tabela por bioma, com chance e resultados com peso. O Mapa-múndi usa quando os grupos andam.', ir: { aba: 'escudo', g: 'Encontros por bioma' } },
        { t: 'Os mistérios', txt: '“+ Caso” sorteia o mistério pelo tipo (assassinato, roubo ou sumiço, desaparecimento, maldição, licantropo, vampiro, íncubo ou súcubo, criaturas sombrias): a verdade (culpado, motivo, método), 3 a 5 suspeitos com álibi e segredo, e três pistas para cada conclusão — de jeitos diferentes, para o grupo não travar —, mais a pista falsa e a reviravolta. Tudo se edita.', ir: { aba: 'escudo', g: 'Os mistérios' } },
        { t: 'Conduzir o caso', txt: '“Abrir à mesa” põe o caso nas Pistas, com o mural do grupo. Entregue cada pista quando o grupo a achar, mostre os suspeitos e anote as respostas do interrogatório. Quando o grupo acusar, o aviso chega e você responde “Acertaram” ou “Não foi”. “Gerar a cena do crime…” leva o caso para as Cenas.' },
      ],
    },
    {
      id: 'admin', nome: 'Administração', grupo: 'site', soMestre: true, soAdmin: true,
      resumo: 'Só para quem administra o site: as contas, as mesas e o registro de tudo o que foi feito.',
      jogador: [],
      mestre: [
        { t: 'Contas', txt: 'Trocar a senha de alguém (provisória), mudar nome e e-mail, apagar uma conta, abrir ou fechar o cadastro.' },
        { t: 'Mesas', txt: 'O que há em cada mesa, entrar sem aparecer, baixar a cópia, passar para outro dono, tirar alguém e mudar o papel.' },
        { t: 'O registro', txt: 'Tudo o que foi feito na administração fica registrado.' },
      ],
    },
  ];

  const tarefas = [
    // ---- preparar
    { id: 'roteiro', t: 'Preparar o roteiro da sessão', papel: 'mestre', sistema: 'escudo', passos: ['Abra o Escudo do mestre → Roteiro → “+ Sessão”.', 'Escreva um passo para cada momento: a cena de abertura, o encontro, a revelação.', 'Ligue cada passo ao que ele abre (cena, lugar do mapa, encontro, handout, relógio).', 'Na sessão, abra o roteiro pelo botão da barra de cima e use o botão de cada passo.'], ir: { aba: 'escudo', g: 'O roteiro' }, dica: 'Ao fechar a sessão, os passos que sobraram vão para a próxima sozinhos.' },
    { id: 'gerar', t: 'Gerar uma cena pronta (vila, masmorra, castelo…)', papel: 'mestre', sistema: 'cenas', passos: ['Nas Cenas, botão da cena → “Gerar um lugar…”.', 'Escolha a aba do lugar, o estilo, o tamanho, a estação e o clima.', 'Clique numa parte da prévia para travar; “Gerar outro” sorteia o resto.', 'Marque “Povoar o lugar” e o perigo.', '“Criar a cena”.'], ir: { aba: 'cenas', g: 'Povoar o lugar' } },
    { id: 'cenaMapa', t: 'Gerar a cena do lugar onde o grupo está', papel: 'mestre', sistema: 'mundo', passos: ['No Mapa-múndi, selecione o grupo.', '“Gerar a cena aqui”.', 'Confira a frase do alto (o que veio do hexágono) e crie.'], ir: { aba: 'mundo' }, dica: 'Duas cenas de hexágonos vizinhos se encaixam pelas bordas.' },
    { id: 'encontro', t: 'Montar um encontro de combate', papel: 'mestre', sistema: 'bestiario', passos: ['No Bestiário, crie os inimigos (“+ Inimigo”).', 'Ponha na bandeja e confira a dificuldade contra o grupo.', 'Puxe para a cena.', 'Guarde o encontro para ligar a um passo do roteiro.'], ir: { aba: 'bestiario', g: 'O encontro' } },
    { id: 'momento', t: 'Preparar uma revelação dramática', papel: 'mestre', sistema: 'cenas', passos: ['Nas Cenas, aba Cena → Momentos preparados → novo.', 'Junte os tokens escondidos que vão aparecer, as luzes, a névoa, um som e a narração.', 'Na hora, “Soltar”. Tudo tem Desfazer.'], ir: { aba: 'cenas', g: 'Momentos preparados' } },
    { id: 'reforco', t: 'Fazer reforços chegarem no meio do combate', papel: 'mestre', sistema: 'cenas', passos: ['Ponha um Ponto de reforço no mapa (os jogadores não veem).', 'Arraste os tokens para dentro dele, ou “Cópias de um modelo”.', 'Escolha quando chegam: agora, depois de X rodadas ou em ondas.', 'Ou use um lembrete por rodada na aba Turnos.'], ir: { aba: 'cenas', g: 'Lembretes por rodada' } },
    { id: 'misterio', t: 'Montar um mistério para o grupo', papel: 'mestre', sistema: 'escudo', passos: ['Escudo → Mistérios → “+ Caso”: escolha o tipo e quantos suspeitos.', 'Sorteie de novo até gostar; guarde o caso e ajuste os textos.', '“Gerar a cena do crime…”: as Cenas abrem com o caso no bloco Mistério.', 'Na sessão, “Abrir à mesa” e entregue as pistas conforme o grupo acha (dois cliques nas marcas da cena).', 'Mostre os suspeitos e anote o interrogatório; responda à acusação.'], ir: { aba: 'escudo', g: 'Os mistérios' }, dica: 'Cada conclusão tem três pistas de jeitos diferentes: se o grupo perder uma, ainda há duas.' },
    { id: 'investigar', t: 'Investigar um caso no mural', papel: 'jogador', sistema: 'pistas', passos: ['Pistas → Casos.', 'Arraste os cartões para organizar; “Ligar com fio” e clique em dois cartões para ligar.', '“+ Nota” cola uma teoria no mural.', 'Leia os suspeitos ao lado e o que disseram.', '“Acusar…” quando o grupo tiver certeza.'], ir: { aba: 'pistas', g: 'Os casos e o mural' } },
    { id: 'npc', t: 'Criar um NPC na hora', papel: 'mestre', sistema: 'escudo', passos: ['Escudo → NPCs → “Gerar NPC”.', 'Escolha raça, papel e onde vive; das três opções, fique com uma.', '↻ sorteia de novo só um campo.', 'Virar ficha, token na cena ou pôr no roteiro.'], ir: { aba: 'escudo', g: 'Os NPCs' } },
    { id: 'handout', t: 'Entregar uma carta ou um puzzle', papel: 'mestre', sistema: 'escudo', passos: ['Escudo → Handouts e puzzles.', 'Crie a carta (com áreas escondidas) ou sorteie um puzzle e teste na prévia.', '“Entregar” à mesa toda ou a alguns.', 'Revele as partes escondidas quando quiser.'], ir: { aba: 'escudo', g: 'Entregar' } },
    { id: 'relogio', t: 'Usar um relógio de ameaça', papel: 'mestre', sistema: 'escudo', passos: ['Escudo → Relógios → novo: os gomos e a consequência.', 'Marque se os jogadores veem (aparece num canto das Cenas).', 'Avance quando a ameaça crescer; o Mapa-múndi sugere ao passar o dia.'], ir: { aba: 'escudo', g: 'Os relógios' } },
    { id: 'ficha', t: 'Dar uma ficha para um jogador criar o personagem', papel: 'mestre', sistema: 'mesa', passos: ['Menu da mesa → “Ficha…” ao lado do jogador.', 'Escolha a campanha, o level e as raças e classes que valem.', 'O jogador cria passo a passo; confira nas Fichas.'], ir: { casca: '#btnConta' } },
    // ---- durante
    { id: 'combate', t: 'Começar um combate', papel: 'mestre', sistema: 'cenas', passos: ['Nas Cenas, aba Turnos → “Puxar o grupo” (só os ativos vêm marcados).', 'Ponha os inimigos; para muitos iguais, use uma faixa de grupo.', 'Role a iniciativa e ligue o combate.', 'N passa a vez; a faixa de cinema anuncia cada um.'], ir: { aba: 'cenas', g: 'O começo do combate' } },
    { id: 'atacar', t: 'Atacar um personagem e pedir a defesa', papel: 'mestre', sistema: 'cenas', passos: ['Mouse sobre o alvo (ou selecionado): tecla K.', 'Escolha o ataque e role.', 'O jogador recebe o cartão de defesa na mesa ao vivo e rola.', 'Aplique o dano pelo resultado.'], ir: { aba: 'cenas', g: 'Os turnos' } },
    { id: 'geral', t: 'Pedir a Percepção (ou outro teste) do grupo todo', papel: 'mestre', sistema: 'cenas', passos: ['Selecione os tokens.', 'Shift+F e escolha o atributo.', 'Peça aos jogadores ou role por todos.', 'A janela diz quem tirou mais.'] },
    { id: 'condicao', t: 'Pôr ou tirar uma condição', papel: 'todos', sistema: 'cenas', passos: ['Selecione o token.', 'No painel, “Condição” → escolha (abas por categoria, com busca).', 'Para tirar, um clique na condição na faixa de baixo.'], ir: { aba: 'cenas', g: 'O painel' } },
    { id: 'dano', t: 'Dar dano ou curar vários de uma vez', papel: 'mestre', sistema: 'cenas', passos: ['Selecione os tokens (arraste no vazio).', 'No painel, digite −8 ou +10 (ou −10%) na barra.', 'Para todos do combate: a tela das barrinhas, na aba Turnos.'] },
    { id: 'rolar', t: 'Rolar um atributo do meu personagem', papel: 'jogador', sistema: 'cenas', passos: ['Nas Cenas, mouse sobre o seu token e tecla F — ou, na mesa ao vivo, “Dados”.', 'Escolha o atributo; ponha “+ atributo” ou “+ resultado” se tiver bônus.', 'Rolar. O resultado aparece na mesa ao vivo.'] },
    { id: 'defesa', t: 'Defender quando o mestre ataca', papel: 'jogador', sistema: 'mesa', passos: ['O cartão de defesa chega na mesa ao vivo.', 'Escolha a defesa (Esquiva, Bloqueio…) e ponha um bônus se tiver.', '“Rolar”.'], ir: { casca: '#btnVivo' } },
    { id: 'pocao', t: 'Usar uma poção (em mim ou em outro)', papel: 'jogador', sistema: 'fichas', passos: ['Na ficha, Bolsas e itens → a poção → “Usar”.', 'Escolha em quem.', 'Nas Cenas, use “Em quem” no painel do token.'] },
    { id: 'equipar', t: 'Trocar de arma no meio da luta', papel: 'jogador', sistema: 'cenas', passos: ['Mouse sobre o seu token: tecla E.', 'Um clique equipa ou guarda; os do mesmo grupo de troca se revezam.'] },
    { id: 'viagem', t: 'Fazer o grupo viajar no mapa', papel: 'mestre', sistema: 'mundo', passos: ['No Mapa-múndi, selecione o grupo e desenhe a rota (ou trace entre dois marcadores).', '“+1 tempo” anda um tempo de marcha; ▶ passa o dia.', 'Quando houver chance, o mapa pergunta se sorteia encontro.'], ir: { aba: 'mundo', g: 'A data do mundo' } },
    { id: 'notas', t: 'Anotar algo durante a sessão', papel: 'todos', sistema: 'mesa', passos: ['Abra o bloco de notas na barra de cima.', 'Escolha o caderno: o seu ou o do grupo.', '“+ Capítulo” e escreva; @ liga a uma ficha, # a uma cena ou lugar.', 'Marque o personagem do capítulo para filtrar depois.'], ir: { casca: '#btnNotas' } },
    { id: 'buscar', t: 'Achar qualquer coisa rápido', papel: 'todos', sistema: 'mesa', passos: ['Ctrl+K (ou a lupa).', 'Digite o nome, sem acento.', 'Enter abre direto no lugar.'], ir: { casca: '#btnBusca' } },
    // ---- depois
    { id: 'fim', t: 'Encerrar o combate', papel: 'mestre', sistema: 'cenas', passos: ['Aba Turnos → “Encerrar”.', 'No aviso, “Restaurar” as energias de quem lutou (ou depois, em “Restaurar energias…”).'], ir: { aba: 'cenas', g: 'O fim do combate e as barras' } },
    { id: 'descanso', t: 'Fazer o grupo descansar', papel: 'mestre', sistema: 'acampamento', passos: ['No Acampamento, chame os personagens.', '“Descanso curto” ou “Descanso longo”.', 'Confira a prévia (rações, barras, bônus que acabam) e aplique.'], ir: { aba: 'acampamento', g: 'Os descansos' } },
    { id: 'fecharSessao', t: 'Fechar a sessão', papel: 'mestre', sistema: 'escudo', passos: ['No roteiro, “Fechar a sessão”: o que sobrou vai para a próxima.', 'Mande o resumo ao rascunho do Jornal.', 'No Mapa-múndi, “Terminar a sessão…” marca onde cada linha do tempo parou.'], ir: { aba: 'escudo', g: 'Abrir e fechar a sessão' } },
    { id: 'jornal', t: 'Publicar o jornal da semana', papel: 'mestre', sistema: 'jornal', passos: ['No Jornal, revise o rascunho e as sugestões.', 'Ponha ou recuse as cartas dos leitores.', '“Publicar…”.'], ir: { aba: 'jornal', g: 'Publicar' } },
    { id: 'pontos', t: 'Gastar os pontos na árvore', papel: 'jogador', sistema: 'arvore', passos: ['Na Árvore, confira os pontos de cada tipo no painel.', 'Clique no nó e aprenda.', 'A ficha recebe na hora.'], ir: { aba: 'arvore', g: 'O seu personagem' } },
    { id: 'carta', t: 'Mandar uma carta ao Jornal', papel: 'jogador', sistema: 'jornal', passos: ['No Jornal, “Escrever uma carta”.', 'Assine por um personagem ou anônima.', 'Acompanhe se saiu.'], ir: { aba: 'jornal' } },
  ];

  const roteiro = {
    mestre: {
      antes: [
        { t: 'Escreva o roteiro', txt: 'No Escudo, os passos da sessão ligados às cenas, encontros e handouts. É o que impede de esquecer as ideias boas no meio do jogo.', tarefa: 'roteiro' },
        { t: 'Deixe as cenas prontas', txt: 'Gere os lugares com “Povoar o lugar” e prepare os momentos (as revelações) e os lembretes por rodada (os reforços).', tarefa: 'gerar' },
        { t: 'Monte os encontros', txt: 'No Bestiário, com a dificuldade contra o grupo à vista.', tarefa: 'encontro' },
        { t: 'Relógios e handouts', txt: 'Uma ameaça que cresce dá pressão; uma carta na mão dos jogadores dá mistério.', tarefa: 'relogio' },
        { t: 'Arrume o elenco', txt: 'Nas Fichas, quem está Ativo, Inativo ou no Toldo — o “Puxar o grupo” traz só os ativos.', ir: { aba: 'fichas', g: 'O elenco e os grupos' } },
        { t: 'Confira o mundo', txt: 'A data, a linha do tempo da campanha e o Jornal publicado.', ir: { aba: 'mundo', g: 'A data do mundo' } },
      ],
      durante: [
        { t: 'Roteiro aberto ao lado', txt: 'O botão do roteiro na barra de cima mostra os passos em qualquer aba.', ir: { casca: '#btnRoteiro' } },
        { t: 'Use as teclas', txt: 'K ataca, Shift+F rola o grupo, N passa a vez, J objetos, U névoa. Poupa cliques e mantém o ritmo.', tarefa: 'atacar' },
        { t: 'Solte os momentos', txt: 'A revelação preparada sai num clique: tokens, luz, som e narração juntos.', tarefa: 'momento' },
        { t: 'Deixe o site lembrar por você', txt: 'Zonas perguntam no começo da vez, lembretes aparecem na rodada certa, a faixa de cinema anuncia cada turno.' },
        { t: 'Entregue pistas', txt: 'Handouts e puzzles chegam na aba Pistas de cada um.', tarefa: 'handout' },
        { t: 'Anote', txt: 'O bloco de notas com @ e # guarda o que você improvisou.', tarefa: 'notas' },
      ],
      depois: [
        { t: 'Encerre o combate', txt: 'E restaure as energias.', tarefa: 'fim' },
        { t: 'Descanso no Acampamento', txt: 'Com a prévia de cada um.', tarefa: 'descanso' },
        { t: 'Feche a sessão', txt: 'O resumo vai para o Jornal; o mapa marca onde parou.', tarefa: 'fecharSessao' },
        { t: 'Publique o Jornal', txt: 'Os jogadores leem entre as sessões — é o mundo vivendo.', tarefa: 'jornal' },
      ],
    },
    jogador: {
      antes: [
        { t: 'Confira a ficha', txt: 'Barras, equipamentos e o quadro “Agora”.', ir: { aba: 'fichas', g: 'A sua ficha' } },
        { t: 'Favorite as skills', txt: 'As que você mais usa ficam no topo da lista.', ir: { aba: 'fichas', g: 'O filtro de um toque e as favoritas' } },
        { t: 'Leia o Jornal', txt: 'Os boatos costumam virar ganchos.', ir: { aba: 'jornal' } },
        { t: 'Releia as notas', txt: 'O seu caderno e o do grupo, no bloco de notas da barra de cima.', ir: { casca: '#btnNotas' } },
      ],
      durante: [
        { t: 'Na sua vez', txt: 'O painel de barras abre no canto; F rola, E troca de arma.', tarefa: 'rolar' },
        { t: 'Defenda pela mesa ao vivo', txt: 'O cartão de defesa chega lá.', tarefa: 'defesa' },
        { t: 'Ajude os outros', txt: 'Poções em quem precisar; puzzles se resolvem juntos.', tarefa: 'pocao' },
      ],
      depois: [
        { t: 'Descanse no Acampamento', txt: 'A emoção do personagem, a caça, a bancada.', ir: { aba: 'acampamento', g: 'O acampamento' } },
        { t: 'Gaste os pontos', txt: 'Na Árvore, quando subir de level.', tarefa: 'pontos' },
        { t: 'Escreva ao Jornal', txt: 'Uma carta assinada pelo personagem.', tarefa: 'carta' },
      ],
    },
  };

  const sabia = [
    { t: 'Tudo tem Desfazer', txt: 'Quase toda mudança no site mostra um aviso com “Desfazer”. Pode testar sem medo.', papel: 'todos', sistema: 'mesa' },
    { t: 'Ctrl+K acha qualquer coisa', txt: 'Fichas, cenas, lugares do mapa, itens, receitas e matérias, de qualquer aba.', papel: 'todos', sistema: 'mesa', ir: { casca: '#btnBusca' } },
    { t: 'A tecla K faz o ataque com defesa', txt: 'Mouse sobre o alvo e K: o jogador recebe o pedido de defesa sem você falar nada.', papel: 'mestre', sistema: 'cenas' },
    { t: 'Shift+F rola o grupo todo', txt: 'A Percepção de todos de uma vez, pedindo aos jogadores ou rolando por eles.', papel: 'mestre', sistema: 'cenas' },
    { t: 'Momentos preparados', txt: 'A emboscada, o teto que desaba, o vilão que aparece: prepare antes e solte num clique.', papel: 'mestre', sistema: 'cenas', ir: { aba: 'cenas', g: 'Momentos preparados' } },
    { t: 'O site lembra os reforços', txt: 'Lembretes por rodada e Pontos de reforço trazem os inimigos na hora certa.', papel: 'mestre', sistema: 'cenas', ir: { aba: 'cenas', g: 'Lembretes por rodada' } },
    { t: 'O roteiro fica na barra de cima', txt: 'Em qualquer aba, os passos da sessão ao lado.', papel: 'mestre', sistema: 'escudo', ir: { casca: '#btnRoteiro' } },
    { t: 'Notas com links', txt: 'No bloco de notas, @ liga uma ficha e # uma cena ou lugar. Clicar leva até lá.', papel: 'mestre', sistema: 'mesa', ir: { casca: '#btnNotas' } },
    { t: 'Povoar o lugar', txt: 'O gerador põe luzes, inimigos do Bestiário, moradores com segredo e saque — tudo escondido até você revelar.', papel: 'mestre', sistema: 'cenas', ir: { aba: 'cenas', g: 'Povoar o lugar' } },
    { t: 'A estrada passa por cima do rio', txt: 'No Mapa-múndi, pinte a estrada por cima do rio: o rio fica e a ponte aparece sozinha.', papel: 'mestre', sistema: 'mundo', ir: { aba: 'mundo', g: 'Rios e estradas' } },
    { t: 'A cena nasce do mapa', txt: '“Gerar a cena aqui”, no grupo do Mapa-múndi, já traz o terreno, o rio, o clima, a estação e a guerra.', papel: 'mestre', sistema: 'mundo' },
    { t: 'Ver como jogador', txt: 'No Mapa-múndi, a chave mostra o mapa exatamente como a mesa vê.', papel: 'mestre', sistema: 'mundo', ir: { aba: 'mundo', g: 'Ver como jogador' } },
    { t: 'A linha invisível na ordem', txt: 'O olho de uma linha da ordem de turnos esconde aquele combatente dos jogadores.', papel: 'mestre', sistema: 'cenas', ir: { aba: 'cenas', g: 'Atrasar, pular, entrar' } },
    { t: 'A tela das barrinhas', txt: 'Todos do combate com um campo ± em cada barra; “Aplicar” faz tudo de uma vez.', papel: 'mestre', sistema: 'cenas' },
    { t: 'Combinações de zonas', txt: 'Fogo no óleo, raio na água, gelo na água: o site sugere a explosão e você aplica ou pula.', papel: 'mestre', sistema: 'cenas' },
    { t: 'Clone e gêmeo maligno', txt: 'As condições Clone e Duplicado fazem as cópias e o gêmeo do personagem, com o real escondido.', papel: 'mestre', sistema: 'cenas' },
    { t: 'Alavanca ligada ao portão', txt: 'No painel da alavanca, ligue a uma porta ou portão: puxar abre.', papel: 'mestre', sistema: 'cenas', ir: { aba: 'cenas', g: 'A alavanca e os portões' } },
    { t: 'Os sons dos avisos', txt: 'O sino no alto das Cenas toca um som para zonas, condições e o urgente (HP abaixo de zero, armadilha).', papel: 'mestre', sistema: 'cenas' },
    { t: 'Porcentagem nas barras', txt: '−10% tira um décimo do máximo, 50% deixa na metade. Vale na ficha e nas Cenas.', papel: 'todos', sistema: 'fichas' },
    { t: 'Bônus só nesta rolagem', txt: '“+ atributo” muda o dado antes de rolar; “+ resultado” soma no total. Ficam guardados até você zerar.', papel: 'todos', sistema: 'mesa' },
    { t: 'Camadas do mapa', txt: 'A tecla C esconde o que atrapalha (só no seu aparelho).', papel: 'todos', sistema: 'mundo' },
    { t: 'A caneta do mapa', txt: 'Desenhe no Mapa-múndi para todos verem na hora — ótimo para planejar a rota.', papel: 'todos', sistema: 'mundo', ir: { aba: 'mundo', g: 'A caneta' } },
    { t: 'O caderno do grupo', txt: 'No bloco de notas, “Do grupo” é um caderno que todos escrevem juntos: as pistas e os nomes ficam num lugar só.', papel: 'jogador', sistema: 'mesa', ir: { casca: '#btnNotas' } },
    { t: 'Favoritas no topo', txt: 'A estrela de uma skill a leva para o topo da lista da ficha.', papel: 'jogador', sistema: 'fichas', ir: { aba: 'fichas', g: 'O filtro de um toque e as favoritas' } },
    { t: 'E abre os equipamentos', txt: 'Nas Cenas, a tecla E sobre o seu token troca a arma sem ir à ficha.', papel: 'jogador', sistema: 'cenas' },
    { t: 'A emoção no acampamento', txt: 'A aura da emoção aparece em volta do retrato para todos — dá para interpretar sem falar.', papel: 'jogador', sistema: 'acampamento' },
    { t: 'Encontros por bioma', txt: 'Com as tabelas do Escudo, o mapa sorteia o encontro quando o grupo anda.', papel: 'mestre', sistema: 'escudo', ir: { aba: 'escudo', g: 'Encontros por bioma' } },
    { t: 'Mistérios prontos', txt: 'O Escudo sorteia um caso inteiro — culpado, suspeitos, pistas pela regra das três — e as Cenas põem o corpo e as marcas de pista no mapa.', papel: 'mestre', sistema: 'escudo', ir: { aba: 'escudo', g: 'Os mistérios' } },
    { t: 'O mural do grupo', txt: 'Nos casos das Pistas, o grupo monta a teoria junto: cartões, fios vermelhos e notas, ao vivo para todos.', papel: 'jogador', sistema: 'pistas', ir: { aba: 'pistas', g: 'Os casos e o mural' } },
    { t: 'O Jornal escreve sozinho', txt: 'O resumo da semana, da sessão, das guerras e os aniversários chegam prontos ao rascunho.', papel: 'mestre', sistema: 'jornal', ir: { aba: 'jornal', g: 'Sugestões no rascunho' } },
  ];

  window.TC_MANUAL = { versao: 9, sistemas, tarefas, roteiro, sabia };
})();
