/* =======================================================================
   TC.conquistas — as conquistas da mesa (lote 117). Lógica pura (Node e navegador).

   Três documentos:
     conq:lista        (vis mestre)  o catálogo inteiro: { v, itens: [{ id, nome, desc, ic, rar, oculta, premio }] }
     conq:pub          (vis mesa)    o que todos podem ver: as visíveis inteiras; das ocultas, só a raridade e quem ganhou
                                     { v, itens: [{ id, rar, oculta, ic?, nome?, desc?, premio?, quem: [{ u, em }] }],
                                       log: [{ k, c, u, em }] (os anúncios, os 30 últimos) }
     conq:j:<usuário>  (vis mestre, dono = o jogador)  as conquistas dele, inteiras (as ocultas também)
                                     { v, itens: [{ id, nome, desc, ic, rar, premio, em }] }
   As conquistas são do jogador (a conta), não do personagem. O mestre libera (conceder) ou tira; a casca do site toca
   a fanfarra e mostra o anúncio a quem estiver no site (a comum, inteira; a rara, a épica e a lendária, só a raridade —
   o nome só para quem ganhou).

     navegador   <script src="../tc/conquistas.js"></script> → window.TC.conquistas
     Node        const C = require('./tc/conquistas.js')
   ======================================================================= */
(function (root) {
  'use strict';
  const LISTA = 'conq:lista', PUB = 'conq:pub', PRE_J = 'conq:j:';
  const RARIDADES = Object.freeze([
    { k: 'comum', n: 'Comum', cor: '#b08a5a' },
    { k: 'rara', n: 'Rara', cor: '#4f8fd8' },
    { k: 'epica', n: 'Épica', cor: '#a65ee0' },
    { k: 'lendaria', n: 'Lendária', cor: '#e6b23a' }]);
  const rarDe = k => RARIDADES.find(r => r.k === k) || RARIDADES[0];
  /* Os ícones (traço de 24×24, sem preenchimento): o mestre escolhe um para cada conquista. */
  const ICONES = Object.freeze({
    espada: '<path d="M14.5 4H20v5.5L9 20.5 3.5 15z"/><path d="M5.5 13l5.5 5.5M3 21l3-3"/>',
    escudo: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
    coroa: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/><path d="M5 19h14"/>',
    caveira: '<path d="M12 3a8 8 0 0 0-8 8c0 3 1.6 5.2 4 6.4V21h8v-3.6c2.4-1.2 4-3.4 4-6.4a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 21v-2M14 21v-2"/>',
    lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    chama: '<path d="M12 21c-4 0-7-2.8-7-6.5 0-3.3 2.5-5.4 3.5-8 1.5 1.6 2 3 2 4.5C11.5 8 13 5 12.5 3c3.5 2.5 6.5 6.3 6.5 11.5 0 3.7-3 6.5-7 6.5z"/>',
    gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    folha: '<path d="M5 19c0-8 5-14 15-15-.5 10-6.5 15-15 15z"/><path d="M5 19l8-8"/>',
    arvore: '<path d="M12 21v-6"/><path d="M12 3l6 7h-3l4 5H5l4-5H6z"/>',
    montanha: '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M7.5 10.5l1.5 1 1.5-1"/>',
    olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chave: '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H22M18 12v3.5M21 12v2.5"/>',
    livro: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5V4.5M8 7h8"/>',
    pergaminho: '<path d="M7 3h11a2 2 0 0 1 2 2v12H9v2a2 2 0 0 1-4 0V5a2 2 0 0 1 2-2z"/><path d="M5 19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2M10 8h6M10 12h6"/>',
    bolsa: '<path d="M8 7l-2-3h12l-2 3"/><path d="M8 7h8c3 3 4.5 6 4.5 9a5 5 0 0 1-5 5h-7a5 5 0 0 1-5-5c0-3 1.5-6 4.5-9z"/><path d="M12 11v6M10 13h3a1 1 0 0 1 0 2h-2"/>',
    moeda: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.5v5"/>',
    taca: '<path d="M7 3h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4M12 12v5M8 21h8M9 17h6v4H9z"/>',
    mapa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    bussola: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    castelo: '<path d="M3 21V9h3V6h3v3h6V6h3v3h3v12z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4M3 9V6h3M18 6h3v3"/>',
    porta: '<path d="M5 21V8a7 7 0 0 1 14 0v13z"/><path d="M3 21h18M15 14v1"/>',
    ponte: '<path d="M2 16h20M4 16v-5M20 16v-5M2 11c5 0 6-4 10-4s5 4 10 4"/><path d="M8 16v-4M12 16V8M16 16v-4"/>',
    navio: '<path d="M3 15l2 5h14l2-5z"/><path d="M12 15V3l7 9h-7M12 5L6 12h6"/>',
    asa: '<path d="M21 4C13 4 4 9 3 20c3-3 6-4 9-4-1.5-1-2.5-1.2-4-1.2C11 14 13 12 14 10c-1.2.2-2.2.2-3 0C15 9 18 7 21 4z"/>',
    garra: '<path d="M5 20c2-6 1-11-1-15M11 20c1.5-6 1-11-1-15M17 20c1-5 1.5-10 3-14"/>',
    presa: '<path d="M4 4h16l-2 5-2.5 11L13 9l-1 1-1-1-2.5 11L6 9z"/>',
    coracao: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    raio: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    floco: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5"/>',
    cristal: '<path d="M12 2l6 6-6 14-6-14z"/><path d="M6 8h12M12 2v20"/>',
    pocao: '<path d="M9 3h6M10 3v5L5 17a3 3 0 0 0 2.6 4h8.8A3 3 0 0 0 19 17l-5-9V3"/><path d="M7 14h10"/>',
    martelo: '<path d="M14 3l7 7-3 3-7-7z"/><path d="M11 9l-8 8 3 3 8-8"/>',
    arco: '<path d="M5 3c8 3 13 8 16 16"/><path d="M5 3l-1 6M21 19l-6 1M5 3l16 16"/>',
    carta: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 8l2 4-2 4-2-4z"/>',
    dado: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="15" cy="9" r="1.2"/><circle cx="9" cy="15" r="1.2"/>',
    sino: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    ampulheta: '<path d="M6 2h12M6 22h12M7 2c0 5 10 5 10 10S7 17 7 22M17 2c0 5-10 5-10 10s10 5 10 10"/>',
    lanterna: '<path d="M9 2h6M10 2v3M14 2v3M7 5h10l-1 13H8z"/><path d="M12 9c-1 1.5-1 3 0 4.5 1-1.5 1-3 0-4.5zM9 21h6"/>',
    pegada: '<ellipse cx="9" cy="14" rx="3" ry="5"/><circle cx="15" cy="5" r="1.4"/><circle cx="18" cy="8" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    corrente: '<rect x="2" y="9" width="9" height="6" rx="3"/><rect x="13" y="9" width="9" height="6" rx="3"/><path d="M9 12h6"/>',
    trono: '<path d="M7 3h10v9H7zM5 12h14v4H5zM7 16v5M17 16v5"/>',
    mao: '<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V4a1.5 1.5 0 0 1 3 0v6M14 10V5.5a1.5 1.5 0 0 1 3 0V14c0 4-2.5 7-6 7-3 0-4.5-1.5-6-4l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 14"/>',
    templo: '<path d="M3 9l9-6 9 6zM4 21h16M6 9v10M10 9v10M14 9v10M18 9v10"/>',
    olhoroxo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><path d="M12 8v8M8 12h8"/>',
    fio: '<path d="M4 4c4 4 12 4 16 0M4 12c4 4 12 4 16 0M4 20c4-4 12-4 16 0"/><path d="M12 2v20"/>',
    lobo: '<path d="M4 3l4 5h8l4-5v9l-3 5-5 4-5-4-3-5z"/><path d="M9 12h.01M15 12h.01M10.5 16l1.5 1 1.5-1"/>',
  });
  const NOMES_ICONES = Object.freeze({ espada: 'Espada', escudo: 'Escudo', coroa: 'Coroa', caveira: 'Caveira', lua: 'Lua', sol: 'Sol', estrela: 'Estrela',
    chama: 'Chama', gota: 'Gota', folha: 'Folha', arvore: 'Árvore', montanha: 'Montanha', olho: 'Olho', chave: 'Chave', livro: 'Livro', pergaminho: 'Pergaminho',
    bolsa: 'Bolsa', moeda: 'Moeda', taca: 'Taça', mapa: 'Mapa', bussola: 'Bússola', castelo: 'Castelo', porta: 'Porta', ponte: 'Ponte', navio: 'Navio', asa: 'Asa',
    garra: 'Garra', presa: 'Presa', coracao: 'Coração', raio: 'Raio', floco: 'Neve', cristal: 'Cristal', pocao: 'Poção', martelo: 'Martelo', arco: 'Arco',
    carta: 'Carta', dado: 'Dado', sino: 'Sino', ampulheta: 'Ampulheta', lanterna: 'Lanterna', pegada: 'Pegada', corrente: 'Corrente', trono: 'Trono',
    mao: 'Mão', templo: 'Templo', olhoroxo: 'Olho de Iroma', fio: 'Fios', lobo: 'Lobo' });
  const OCULTA = '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>';
  const svgDe = (ic, tam, des) => '<svg viewBox="0 0 24 24" width="' + (tam || 32) + '" height="' + (tam || 32) + '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (des || ICONES[ic] || ICONES.estrela) + '</svg>';
  const svgOculta = tam => svgDe(null, tam, OCULTA);

  /* As conquistas de começo (o mundo do Bruno). As comuns ficam à mostra (são metas); as outras, ocultas. */
  const c = (id, rar, ic, nome, desc, premio, oculta) => ({ id, rar, ic, nome, desc, premio: premio || '', oculta: oculta == null ? rar !== 'comum' : !!oculta });
  const PADRAO = Object.freeze([
    c('cq_primeiro_sangue', 'comum', 'espada', 'Primeiro Sangue', 'Vencer a primeira luta.'),
    c('cq_pe_na_estrada', 'comum', 'pegada', 'Pé na Estrada', 'Passar 10 dias de viagem longe de onde começou.'),
    c('cq_guilda', 'comum', 'pergaminho', 'Cliente da Guilda', 'Cumprir o primeiro contrato da guilda de aventureiros.'),
    c('cq_bolso_cheio', 'comum', 'moeda', 'Bolso Cheio', 'Ter 500 lapros de uma vez.'),
    c('cq_sobrevivente', 'comum', 'coracao', 'Sobrevivente', 'Cair a 0 de Vida e viver para contar.'),
    c('cq_ferreiro', 'comum', 'martelo', 'Ferreiro de Primeira Viagem', 'Melhorar um equipamento até +1.'),
    c('cq_alquimista', 'comum', 'pocao', 'Alquimista de Cozinha', 'Fazer a primeira poção na bancada do acampamento.'),
    c('cq_turista', 'comum', 'castelo', 'Turista', 'Conhecer 3 das 5 cidades grandes.'),
    c('cq_devoto', 'comum', 'templo', 'Devoto', 'Deixar uma oferenda num altar à beira do caminho.'),
    c('cq_festeiro', 'comum', 'taca', 'Festeiro', 'Aproveitar uma festa grande: o Ano-Novo ou o Dia da Queda do Dragão Roxo.'),
    c('cq_cacador', 'comum', 'arco', 'Caçador', 'Derrotar 10 monstros da mesma família do Bestiário.'),
    c('cq_lingua_antiga', 'comum', 'livro', 'Língua Antiga', 'Ler uma inscrição no idioma antigo.'),
    c('cq_mapa', 'comum', 'mapa', 'Mapa na Mão', 'Descobrir 10 lugares no Mapa-múndi.'),
    c('cq_amigo_bichos', 'comum', 'garra', 'Amigo dos Bichos', 'Domar uma montaria ou ajudar a converter um monstro.'),
    c('cq_esgoto', 'rara', 'lanterna', 'Rato de Esgoto', 'Descer às Catacumbas de Hemvria.'),
    c('cq_dungeon', 'rara', 'porta', 'Corredor sem Fim', 'Chegar ao fundo de uma dungeon.'),
    c('cq_chefe', 'rara', 'caveira', 'Matador de Chefe', 'Derrotar um chefe de região.', '+1 ponto de árvore'),
    c('cq_mercado_negro', 'rara', 'chave', 'Contato no Escuro', 'Entrar num mercado negro.'),
    c('cq_libertador', 'rara', 'corrente', 'Libertador', 'Libertar escravizados de um comboio Konaito.', 'Reputação com as facções contra a escravidão'),
    c('cq_pedagio', 'rara', 'ponte', 'Pedágio Não', 'Passar por um forte da Coroa sem pagar e sem ser pego.'),
    c('cq_leitura', 'rara', 'carta', 'A Carta Não Mente', 'Receber uma leitura de cartas e vê-la se cumprir.'),
    c('cq_rio_negro', 'rara', 'gota', 'Gole de Esquecimento', 'Beber do Rio Negro (e esquecer algo).'),
    c('cq_prata', 'rara', 'presa', 'Toque de Prata', 'Derrotar um vampiro ou um licantropo.'),
    c('cq_maldito', 'rara', 'lobo', 'Sangue Ruim', 'Ganhar uma condição de linhagem: vampirismo ou licantropia.'),
    c('cq_reliquia', 'rara', 'cristal', 'Trambolho que Funciona', 'Fazer funcionar uma relíquia da tecnologia antiga.'),
    c('cq_rumor', 'rara', 'bussola', 'Era Verdade', 'Seguir um rumor até o lugar e ver que era verdade.'),
    c('cq_rumor_falso', 'rara', 'ampulheta', 'Era Mentira', 'Seguir um rumor falso até o fim.'),
    c('cq_vila_secreta', 'rara', 'olho', 'Gente que Não Existe', 'Encontrar uma vila secreta.'),
    c('cq_teceloes', 'epica', 'fio', 'Os Fios do Reino', 'Descobrir que alguém puxa os fios da Coroa.', '+1 ponto de árvore'),
    c('cq_heroi', 'epica', 'estrela', 'Herói Esquecido', 'Descobrir que Iroma foi um herói.', '+1 ponto de árvore'),
    c('cq_mar', 'epica', 'navio', 'Do Outro Lado do Mar', 'Atravessar o mar.'),
    c('cq_alma_dupla', 'epica', 'mao', 'A Voz que Não Manda', 'Resistir a um comando Konaita com a força que mora dentro de si.'),
    c('cq_dragao', 'epica', 'asa', 'Sobreviveu ao Ninho', 'Sair vivo de um ninho de dragão.'),
    c('cq_ranking', 'epica', 'taca', 'Nome no Ranking', 'Entrar no ranking dos aventureiros famosos.', 'Título de aventureiro famoso'),
    c('cq_deus', 'epica', 'sol', 'Alguém Respondeu', 'Receber a resposta direta de um deus.'),
    c('cq_corte_lunar', 'epica', 'lua', 'Hóspede da Lua', 'Ser recebido pela Corte lunar dos Kitsunes.'),
    c('cq_parte_iroma', 'lendaria', 'olhoroxo', 'Pedaço de Iroma', 'Encontrar uma das partes de Iroma.', '+2 pontos de árvore'),
    c('cq_trono', 'lendaria', 'trono', 'O Trono Vazio', 'Chegar ao Trono Vazio, no extremo norte.', '+2 pontos de árvore'),
    c('cq_dinastia', 'lendaria', 'arvore', 'Dinastia', 'Passar a história a um herdeiro: a próxima geração.', 'O herdeiro começa com um talento de família'),
    c('cq_ascensao', 'lendaria', 'coroa', 'Ascensão', 'Ser reconhecido pelo mundo como um deus.'),
  ]);

  // ---------------- normalizar ----------------
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const txt = (v, n) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim().slice(0, n || 200);
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v);
  function conquista(o) {
    o = ehObj(o) ? o : {};
    const rar = rarDe(o.rar).k;
    return { id: idOk(o.id) ? o.id : 'cq_' + Math.random().toString(36).slice(2, 10), nome: txt(o.nome, 60) || 'Conquista', desc: txt(o.desc, 300),
      ic: ICONES[o.ic] ? o.ic : 'estrela', rar, oculta: o.oculta == null ? rar !== 'comum' : !!o.oculta, premio: txt(o.premio, 120) };
  }
  const lista = d => ({ v: 1, itens: (ehObj(d) && Array.isArray(d.itens) ? d.itens : PADRAO).filter(ehObj).map(conquista) });
  const quemOk = q => (Array.isArray(q) ? q : []).filter(x => ehObj(x) && typeof x.u === 'string' && x.u).map(x => ({ u: x.u, em: Number(x.em) || 0 }));
  function pub(d) {
    d = ehObj(d) ? d : {};
    return { v: 1, itens: (Array.isArray(d.itens) ? d.itens : []).filter(x => ehObj(x) && idOk(x.id)).map(x => {
      const o = { id: x.id, rar: rarDe(x.rar).k, oculta: !!x.oculta, quem: quemOk(x.quem) };
      if (!o.oculta) Object.assign(o, { ic: ICONES[x.ic] ? x.ic : 'estrela', nome: txt(x.nome, 60), desc: txt(x.desc, 300), premio: txt(x.premio, 120) });
      return o;
    }), log: (Array.isArray(d.log) ? d.log : []).filter(x => ehObj(x) && typeof x.k === 'string' && idOk(x.c) && typeof x.u === 'string').slice(-30) };
  }
  const doJogador = d => ({ v: 1, itens: (ehObj(d) && Array.isArray(d.itens) ? d.itens : []).filter(ehObj).map(x => Object.assign(conquista(x), { em: Number(x.em) || 0 })) });

  // ---------------- o que todos veem (o catálogo → conq:pub), guardando quem já ganhou ----------------
  function projetar(lst, pubAntigo) {
    const L = lista(lst), P = pub(pubAntigo);
    const itens = L.itens.map(x => {
      const velho = P.itens.find(y => y.id === x.id);
      const o = { id: x.id, rar: x.rar, oculta: x.oculta, quem: velho ? velho.quem : [] };
      if (!x.oculta) Object.assign(o, { ic: x.ic, nome: x.nome, desc: x.desc, premio: x.premio });
      return o;
    });
    return { v: 1, itens, log: P.log };
  }
  // ---------------- liberar e tirar ----------------
  /* → { lista, pub, jog, erro? }: a conquista `id` vai para o jogador `u` (com a hora `em`); o anúncio entra no log. */
  function conceder(lst, pb, jog, id, u, em) {
    const L = lista(lst), x = L.itens.find(y => y.id === id);
    if (!x) return { erro: 'Esta conquista não existe mais.' };
    if (!u) return { erro: 'Escolha o jogador.' };
    const J = doJogador(jog);
    if (J.itens.some(y => y.id === id)) return { erro: 'Este jogador já tem esta conquista.' };
    em = Number(em) || Date.now();
    const P = projetar(L, pb), item = P.itens.find(y => y.id === id);
    item.quem = item.quem.filter(q => q.u !== u).concat({ u, em });
    P.log = P.log.concat({ k: id + ':' + u + ':' + em, c: id, u, em }).slice(-30);
    J.itens.push(Object.assign({}, x, { em }));
    return { lista: L, pub: P, jog: J };
  }
  function tirar(lst, pb, jog, id, u) {
    const L = lista(lst), P = projetar(L, pb), J = doJogador(jog), item = P.itens.find(y => y.id === id);
    if (item) item.quem = item.quem.filter(q => q.u !== u);
    P.log = P.log.filter(l => !(l.c === id && l.u === u));
    J.itens = J.itens.filter(y => y.id !== id);
    return { lista: L, pub: P, jog: J };
  }
  /* O anúncio de uma linha do log, para quem está vendo (eu): a comum, inteira; as outras, só a raridade — a não ser para
     quem ganhou (com a sua conquista em mãos: jogMeu) ou o mestre (com o catálogo: lst). → { titulo, nome?, desc?, ic?, rar, cor, oculta } */
  function anuncio(linhaLog, pb, eu, jogMeu, lst, nomeDe) {
    const P = pub(pb), it = P.itens.find(y => y.id === linhaLog.c), R = rarDe(it ? it.rar : 'comum');
    const quem = (nomeDe && nomeDe(linhaLog.u)) || 'Alguém';
    let inteira = it && !it.oculta ? it : null;
    if (!inteira && linhaLog.u === eu && jogMeu) inteira = doJogador(jogMeu).itens.find(y => y.id === linhaLog.c) || null;
    if (!inteira && lst) inteira = lista(lst).itens.find(y => y.id === linhaLog.c) || null;
    const meu = linhaLog.u === eu;
    if (inteira) return { titulo: (meu ? 'Você conquistou' : quem + ' conquistou') + ': ' + inteira.nome + '!', nome: inteira.nome, desc: inteira.desc, premio: inteira.premio || '', ic: inteira.ic, rar: R.k, nomeRar: R.n, cor: R.cor, oculta: false };
    return { titulo: quem + ' conquistou uma conquista ' + R.n + '!', rar: R.k, nomeRar: R.n, cor: R.cor, oculta: true };
  }

  const api = { LISTA, PUB, PRE_J, RARIDADES, rarDe, ICONES, NOMES_ICONES, svgDe, svgOculta, PADRAO, conquista, lista, pub, doJogador, projetar, conceder, tirar, anuncio };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TC = root.TC || {}; root.TC.conquistas = api;
})(typeof window !== 'undefined' ? window : globalThis);
