/* Tiny Cats · Mapa-múndi: a lógica pura do mundo (sem página, sem DOM).
   O modelo do mapa, o calendário, a geometria, a grade de hexágonos e o terreno, as viagens, os encontros, a névoa e
   — o que mais importa — a projeção pública: o recorte do mapa que os jogadores recebem. Roda igual no navegador
   (window.MundoNucleo) e no Node (testes).
   Unidades do mapa = pixels da imagem original. A distância do mundo é em cubos: um hexágono da grade tem 5 cubos de
   um centro ao outro, e é a grade que diz quantas unidades do mapa dá um cubo (sem grade, não há escala). */
(() => {
  'use strict';

  /* ---------------- catálogos ---------------- */
  // Glifos desenhados numa caixa 24×24, só traço (o CSS pinta .glifo sem preenchimento, sobre o selo colorido).
  const ICONES = {
    cidade: { nome: 'Cidade', cor: '#e6ab4f', svg: '<path d="M3 21h18M5 21V11l4-3 4 3v10M13 21V6l3-2 3 2v15M8 14h2M8 17h2M15 9h2M15 13h2M15 17h2"/>' },
    vila: { nome: 'Vila', cor: '#d9b77a', svg: '<path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M10 20v-5h4v5"/>' },
    castelo: { nome: 'Castelo', cor: '#b9a3e3', svg: '<path d="M4 21V8h3v3h3V8h4v3h3V8h3v13zM10 21v-4a2 2 0 0 1 4 0v4M3 21h18"/>' },
    ruina: { nome: 'Ruína', cor: '#b3ab98', svg: '<path d="M3 21h18M6 21V9M4.5 9h3M10 21v-6l1.5-1M15 21V7M13.5 7h3.5l-1 2M19 21v-3"/>' },
    masmorra: { nome: 'Masmorra', cor: '#94a5bd', svg: '<path d="M3 21h18M5 21V11a7 7 0 0 1 14 0v10M9 21v-7a3 3 0 0 1 6 0v7M9 17.5h6"/>' },
    templo: { nome: 'Templo', cor: '#f0d27a', svg: '<path d="M3 9l9-5 9 5zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 18h18M2 21h20"/>' },
    porto: { nome: 'Porto', cor: '#7fb7e0', svg: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10h8M4 13a8 8 0 0 0 16 0M4 13l-1 2M20 13l1 2"/>' },
    torre: { nome: 'Torre', cor: '#c9a0dc', svg: '<path d="M8 21l1-12h6l1 12zM7 9V4h2v2h2V4h2v2h2V4h2v5zM6 21h12M11 13h2"/>' },
    acampamento: { nome: 'Acampamento', cor: '#d79a62', svg: '<path d="M2 20h20M4 20 12 6l8 14M12 20l-3-6M12 20l3-6M12 6 10 3M12 6l2-3"/>' },
    caverna: { nome: 'Caverna', cor: '#a89c8c', svg: '<path d="M2 20h20M3 20c1-7 4-12 9-12s8 5 9 12M8 20c0-3 1.8-5.5 4-5.5s4 2.5 4 5.5"/>' },
    floresta: { nome: 'Floresta', cor: '#7fbf7a', svg: '<path d="M8 3 4 10h2.5L3.5 15h9l-3-5H12zM8 15v6M17 8l-3.5 6h7zM17 14v7M3 21h18"/>' },
    montanha: { nome: 'Montanha', cor: '#b5b0a5', svg: '<path d="M2 20 9 6l5 8 2.5-3.5L22 20zM7 10l2 2 2-2"/>' },
    ponte: { nome: 'Ponte', cor: '#c7a77c', svg: '<path d="M2 9h20M4 9v11M20 9v11M7 20a5 5 0 0 1 10 0M12 9v6M8 9v3M16 9v3"/>' },
    mina: { nome: 'Mina', cor: '#a7b3c2', svg: '<path d="M4 20 15 9M9.5 4.5c3.5-1 7 0 10 4M13 7l4 4M15 21h6v-4"/>' },
    tesouro: { nome: 'Tesouro', cor: '#f2c14e', svg: '<path d="M3 10h18v10H3zM3 10c0-3 4-5 9-5s9 2 9 5M3 14h18M11 13h2v3h-2z"/>' },
    perigo: { nome: 'Perigo', cor: '#f0786e', svg: '<path d="M12 3 2 20h20zM12 9v5M12 17v.01"/>' },
    misterio: { nome: 'Mistério', cor: '#b39cf0', svg: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.7-.8 1.2V14M12 17v.01"/>' },
    bandeira: { nome: 'Bandeira', cor: '#e58a6b', svg: '<path d="M5 21V3M5 4h12l-3 4 3 4H5"/>' },
  };
  const EVENTOS = {
    guerra: { nome: 'Guerra', cor: '#e05a4f', svg: '<path d="M4 4l10 10M11 17l6-6M15 15l4 4M20 4 10 14M7 11l6 6M9 15l-4 4"/>' },
    conflito: { nome: 'Conflito', cor: '#e58a4f', svg: '<path d="M3 12h7M7 8l4 4-4 4M21 12h-7M17 8l-4 4 4 4"/>' },
    praga: { nome: 'Praga', cor: '#9fbf4a', svg: '<path d="M12 3c3.5 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 2.5-6.5 6-11zM10 13v.01M14 15v.01M11.5 17.5v.01"/>' },
    fome: { nome: 'Fome', cor: '#c8a060', svg: '<path d="M3 11h18c0 5-4 9-9 9s-9-4-9-9zM11 11l1.5 3-1.5 2M8 7c0-1.5 1-1.5 1-3M15 7c0-1.5 1-1.5 1-3"/>' },
    festival: { nome: 'Festival', cor: '#f2c14e', svg: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>' },
    tempestade: { nome: 'Tempestade', cor: '#7fa8e0', svg: '<path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 6a4.5 4.5 0 0 1 .5 9M13 12l-2.5 4.5h3.5L11.5 21"/>' },
    magia: { nome: 'Magia', cor: '#b39cf0', svg: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>' },
    monstro: { nome: 'Monstro', cor: '#d0703a', svg: '<path d="M6 4c2.5 5 2.5 11 0 16M12 3c2.5 6 2.5 12 0 18M18 4c2.5 5 2.5 11 0 16"/>' },
    revolta: { nome: 'Revolta', cor: '#e07a5a', svg: '<path d="M9 21h6M10 21l-1-9h6l-1 9M12 3c2 2 3.5 3.5 3.5 5.5a3.5 3.5 0 0 1-7 0C8.5 6.5 10 5 12 3z"/>' },
    incendio: { nome: 'Incêndio', cor: '#f08a3a', svg: '<path d="M12 3c4 4 6.5 7 6.5 11a6.5 6.5 0 0 1-13 0c0-3 1.7-5.2 3.2-6.5.1 2 1.1 3.3 2.3 3.5 0-3.5.2-5.6 1-8z"/>' },
    inundacao: { nome: 'Inundação', cor: '#5fa8d8', svg: '<path d="M2 8c2.5-2 4.5-2 6.5 0s4.5 2 6.5 0 4.5-2 6.5 0M2 13c2.5-2 4.5-2 6.5 0s4.5 2 6.5 0 4.5-2 6.5 0M2 18c2.5-2 4.5-2 6.5 0s4.5 2 6.5 0 4.5-2 6.5 0"/>' },
    descoberta: { nome: 'Descoberta', cor: '#6fbf8f', svg: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l6 6M10.5 7.5v6M7.5 10.5h6"/>' },
    // (lote 7, parte 5a) os eventos novos: a estrada, o céu e a terra, a política, o mistério e a fartura
    caravana: { nome: 'Caravana mercante', cor: '#d9a441', svg: '<path d="M2 15V8h11v7M13 11h4l3 3v1M2 15h18M4 8c0-2 2-3 4.5-3S13 6 13 8"/><circle cx="6" cy="17.5" r="2"/><circle cx="16" cy="17.5" r="2"/>' },
    peregrinacao: { nome: 'Peregrinação', cor: '#e6d38a', svg: '<circle cx="10" cy="4.5" r="1.8"/><path d="M10 7l-1 6 2 3 1 5M9 13l-3 7M10 8l3 3M16 3v18M16 3l2 2"/>' },
    bandidos: { nome: 'Bandidos na estrada', cor: '#a8643c', svg: '<path d="M3 10c3-2 15-2 18 0-1 4-4 5-9 5s-8-1-9-5zM7.5 11.5h2.5M14 11.5h2.5M6 15l-1 5M18 15l1 5"/>' },
    ponte: { nome: 'Ponte caída', cor: '#8f8170', svg: '<path d="M2 9h8M14 9h8M4 9v11M20 9v11M10 9l1 3M14 9l-1 3M6.5 20a5 5 0 0 1 3.5-4.5M17.5 20a5 5 0 0 0-3.5-4.5"/>' },
    migracao: { nome: 'Migração de monstros', cor: '#c97a3a', svg: '<path d="M3 17l5-5-5-5M10 17l5-5-5-5M17 17l4-5-4-5"/>' },
    eclipse: { nome: 'Eclipse', cor: '#7b74b8', svg: '<circle cx="12" cy="12" r="5"/><path d="M14.5 8.2a5 5 0 1 0 0 7.6 4 4 0 0 1 0-7.6zM12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>' },
    meteoros: { nome: 'Chuva de meteoros', cor: '#f0a35a', svg: '<circle cx="17" cy="17" r="3"/><path d="M15 15 5 5M19.5 13.5 12 6M13.5 19.5 6 12"/>' },
    luaSangue: { nome: 'Lua de sangue', cor: '#c0392b', svg: '<path d="M15 3a9 9 0 1 0 6 13.5A7.5 7.5 0 0 1 15 3zM8.5 9v.01M10.5 14v.01M7 16v.01"/>' },
    tribulacao: { nome: 'Tribulação celestial', cor: '#e8d870', svg: '<path d="M13 2 6 13h5l-2 9 8-12h-5zM3 5l2 2M21 5l-2 2M2 11h2M20 11h2"/>' },
    seca: { nome: 'Seca', cor: '#d6b46a', svg: '<circle cx="12" cy="8" r="3.5"/><path d="M12 2v1.5M5.5 8H4M20 8h-1.5M7.4 3.4l1 1M16.6 3.4l-1 1M3 17h18M7 17l2 2-1 2M13 17l-1 2 2 2M18 17l1 2"/>' },
    terremoto: { nome: 'Terremoto', cor: '#9a7b5f', svg: '<path d="M2 20h20M12 3l-2 5 3 3-3 4 2 5M5 9l2 2M19 9l-2 2M4 14h2M18 14h2"/>' },
    erupcao: { nome: 'Erupção', cor: '#d2522e', svg: '<path d="M3 20l6-9h6l6 9zM9 11c1 1 5 1 6 0M12 8c-2-1-1.5-3 .5-3.5C12.5 3 14 2 15.5 3.5"/>' },
    inverno: { nome: 'Inverno rigoroso', cor: '#a9cbe8', svg: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5"/>' },
    torneio: { nome: 'Torneio das seitas', cor: '#e5b84f', svg: '<path d="M5 3l9.5 9.5M19 3 9.5 12.5M7 15l-3 3 2 2 3-3M17 15l3 3-2 2-3-3M8.5 12.5l3 3M15.5 12.5l-3 3"/>' },
    coroacao: { nome: 'Coroação ou casamento real', cor: '#f2d16b', svg: '<path d="M3 18h18M4 18 3 7l5 4 4-6 4 6 5-4-1 11M12 14.5v.01"/>' },
    golpe: { nome: 'Golpe', cor: '#b0413e', svg: '<path d="M14 3l7 7-9 9-4 1 1-4zM5 19l-2 2M8.5 15.5l-3 3M11 9l4 4"/>' },
    cerco: { nome: 'Cerco', cor: '#c05a46', svg: '<path d="M9 21V10h6v11M9 10V7h1.5v1.5h1.5V7h1.5v1.5H15V7M3 21h18M3.5 14l2-1.5M20.5 14l-2-1.5M5 8l1.5 1M19 8l-1.5 1"/>' },
    leilao: { nome: 'Leilão de tesouros', cor: '#e0b450', svg: '<path d="M14 4l6 6M11 7l6 6M12.5 5.5l-5 5M18.5 11.5l-5 5M10 13l-7 7M3 21h8"/>' },
    assombracao: { nome: 'Assombração', cor: '#9fb3d6', svg: '<path d="M6 21V10a6 6 0 0 1 12 0v11l-2-2-2 2-2-2-2 2-2-2zM10 10v.01M14 10v.01"/>' },
    reino: { nome: 'Reino secreto aberto', cor: '#9b7fe0', svg: '<path d="M5 21V10a7 7 0 0 1 14 0v11M3 21h18M12 9l1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-.5z"/>' },
    dragao: { nome: 'Dragão avistado', cor: '#d0603a', svg: '<path d="M3 15c3-1 5-4 6-9 1 3 3 4 5 4-1 2 0 4 2 5 2-2 4-2 5-1-3 1-5 3-7 6-2-2-5-3-11-5zM9 6l1 4"/>' },
    seita: { nome: 'Seita ou culto', cor: '#7f5aa8', svg: '<path d="M12 3 2 20h20zM8 14c2-2.5 6-2.5 8 0-2 2.5-6 2.5-8 0zM12 14v.01"/>' },
    cacada: { nome: 'Caçada a um procurado', cor: '#c9963a', svg: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5M12 12v.01"/>' },
    colheita: { nome: 'Colheita farta', cor: '#a8c060', svg: '<path d="M12 21V8M12 8c-2-1-3-3-3-5 2 1 3 3 3 5zM12 8c2-1 3-3 3-5-2 1-3 3-3 5zM12 13c-2-1-3-3-3-5 2 1 3 3 3 5zM12 13c2-1 3-3 3-5-2 1-3 3-3 5zM12 18c-2-1-3-3-3-5 2 1 3 3 3 5zM12 18c2-1 3-3 3-5-2 1-3 3-3 5z"/>' },
  };
  /* (lote 7, parte 5a) O que cada tipo de evento pesa na viagem, de começo (o mestre muda em cada evento): custo = os
     cubos a mais para entrar num hexágono dentro dele; enc = os pontos a mais (ou a menos) na chance do "Sortear
     encontro" de um grupo dentro dele; fecha = ninguém entra nos hexágonos dele (o grupo para antes). */
  const PESO_EVENTO = {
    guerra: { custo: 5, enc: 20, fecha: false }, conflito: { custo: 0, enc: 10, fecha: false }, praga: { custo: 0, enc: 0, fecha: false },
    fome: { custo: 0, enc: 0, fecha: false }, festival: { custo: 0, enc: 0, fecha: false }, tempestade: { custo: 5, enc: 0, fecha: false },
    magia: { custo: 0, enc: 10, fecha: false }, monstro: { custo: 0, enc: 20, fecha: false }, revolta: { custo: 0, enc: 10, fecha: false },
    incendio: { custo: 5, enc: 0, fecha: false }, inundacao: { custo: 10, enc: 0, fecha: false }, descoberta: { custo: 0, enc: 0, fecha: false },
    caravana: { custo: 0, enc: 0, fecha: false }, peregrinacao: { custo: 0, enc: 0, fecha: false }, bandidos: { custo: 0, enc: 30, fecha: false },
    ponte: { custo: 0, enc: 0, fecha: true }, migracao: { custo: 0, enc: 30, fecha: false }, eclipse: { custo: 0, enc: 10, fecha: false },
    meteoros: { custo: 0, enc: 0, fecha: false }, luaSangue: { custo: 0, enc: 20, fecha: false }, tribulacao: { custo: 5, enc: 0, fecha: false },
    seca: { custo: 0, enc: 0, fecha: false }, terremoto: { custo: 5, enc: 0, fecha: true }, erupcao: { custo: 10, enc: 0, fecha: false },
    inverno: { custo: 5, enc: 0, fecha: false }, torneio: { custo: 0, enc: 0, fecha: false }, coroacao: { custo: 0, enc: 0, fecha: false },
    golpe: { custo: 0, enc: 15, fecha: false }, cerco: { custo: 0, enc: 20, fecha: true }, leilao: { custo: 0, enc: 0, fecha: false },
    assombracao: { custo: 0, enc: 15, fecha: false }, reino: { custo: 0, enc: 10, fecha: false }, dragao: { custo: 0, enc: 25, fecha: false },
    seita: { custo: 0, enc: 10, fecha: false }, cacada: { custo: 0, enc: 5, fecha: false }, colheita: { custo: 0, enc: -10, fecha: false },
  };
  /* (lote 7, parte 5a) O que cada tipo de evento leva para a cena gerada dentro dele (o "Gerar a cena aqui" e o "Gerar
     este lugar…" do Mapa-múndi): o clima, a hora, a zona de efeito que cobre a cena (fx) e o chão seco. */
  const CENA_EVENTO = {
    tempestade: { clima: 'chuva' }, inundacao: { clima: 'chuva' }, incendio: { clima: 'cinzas' }, magia: { clima: 'vagalumes' },
    inverno: { clima: 'neve' }, erupcao: { clima: 'cinzas' }, meteoros: { clima: 'cinzas' }, tribulacao: { clima: 'chuva' },
    assombracao: { clima: 'neblina', fx: 'espiritos' }, reino: { clima: 'vagalumes' }, eclipse: { hora: 'breu' },
    luaSangue: { hora: 'noite', fx: 'luaSangue' }, seca: { seco: true },
  };
  // Cores de facção: médias, para a região (preenchida a 20%) e a frente lerem bem no tema escuro e no claro.
  const CORES = ['#c0503a', '#3f7fbf', '#3f9a5c', '#c9922e', '#8a5cc0', '#c0457f', '#2f9a9a', '#8a9a3a', '#a0623a', '#5a6fd0'];
  // O tipo do caminho de uma rota é só o desenho dela: quanto o grupo anda é ele quem diz (cubos por tempo de marcha),
  // e o que pesa no caminho é o terreno de cada hexágono.
  const VIAS = {
    estrada: { nome: 'Estrada' }, trilha: { nome: 'Trilha' }, selvagem: { nome: 'Terreno selvagem' },
    rio: { nome: 'Rio (barco)' }, mar: { nome: 'Mar (navio)' },
  };
  // os ritmos dos mapas de antes viram cubos por dia (eram km por dia: 1 km vira 1 cubo)
  const RITMO_ANTIGO = { lento: 20, normal: 30, rapido: 40 };
  const CUBOS_HEX = 5;                            // um hexágono da grade, de um centro ao vizinho
  const CUBOS_DIA = 30;                           // o quanto um grupo novo anda por dia (3 cubos por tempo, num dia de 10)
  /* (lote 6) A marcha é contada em tempos: um dia tem TEMPOS_DIA tempos de marcha (o mestre muda, no calendário do
     mapa), e o grupo anda os cubos de um tempo (pt) a cada um. O calendário do mundo continua contando dias. */
  const TEMPOS_DIA = 10, MAX_TEMPOS = 100;
  /* Os tipos de terreno de um mapa novo. custo = quantos cubos se gastam para atravessar um hexágono dele (o mestre
     muda; sem terreno, um hexágono custa os 5 cubos dele). Os ids curtos deixam o terreno dos hexágonos pequeno. */
  const TERRENOS_PADRAO = [
    { id: 'pl', nome: 'Planície', cor: '#a3bf6a', custo: 5, tex: 'mato' },
    { id: 'fl', nome: 'Floresta', cor: '#3f7a46', custo: 10, tex: 'arvores' },
    { id: 'co', nome: 'Colina', cor: '#b39a62', custo: 8, tex: 'colinas' },
    { id: 'mo', nome: 'Montanha', cor: '#8b8178', custo: 15, tex: 'montes' },
    { id: 'pa', nome: 'Pântano', cor: '#5f7d5c', custo: 15, tex: 'juncos' },
    { id: 'de', nome: 'Deserto', cor: '#e0c07a', custo: 10, tex: 'areia' },
    { id: 'ne', nome: 'Neve', cor: '#e3ecf2', custo: 15, tex: 'neve' },
    { id: 'ag', nome: 'Água', cor: '#4f86c0', custo: 10, tex: 'ondas' },
  ];
  /* (lote 6) Os terrenos novos, cada um com o seu desenho. Um mapa novo já vem com eles; num mapa de antes, a aba
     Terreno oferece acrescentá-los (nada muda sozinho). */
  const TERRENOS_NOVOS = [
    { id: 'la', nome: 'Lavoura', cor: '#cdb85e', custo: 6, tex: 'lavoura' },
    { id: 'ru', nome: 'Ruínas', cor: '#a99f8b', custo: 8, tex: 'ruinas' },
    { id: 'lv', nome: 'Lava', cor: '#8c3a22', custo: 30, tex: 'lava' },
    { id: 'cr', nome: 'Cristais', cor: '#8db7d6', custo: 12, tex: 'cristais' },
    { id: 'se', nome: 'Selva', cor: '#2d6a3a', custo: 15, tex: 'selva' },
    { id: 'sv', nome: 'Savana', cor: '#c6b26a', custo: 6, tex: 'savana' },
    { id: 'tu', nome: 'Tundra', cor: '#b7c3b5', custo: 10, tex: 'tundra' },
    { id: 'tc', nome: 'Terra corrompida', cor: '#5d4166', custo: 12, tex: 'corrompida' },
  ];
  TERRENOS_PADRAO.push(...TERRENOS_NOVOS);
  // A textura de cada terreno no desenho à mão: o desenho miúdo que se repete dentro da pincelada (a tela é quem
  // desenha; aqui ficam os nomes). Um terreno de antes, sem textura, fica com a do terreno de começo de mesmo id.
  const TEXTURAS = {
    liso: { nome: 'Lisa' }, mato: { nome: 'Capim' }, arvores: { nome: 'Árvores' }, colinas: { nome: 'Colinas' },
    montes: { nome: 'Montes' }, juncos: { nome: 'Juncos' }, areia: { nome: 'Areia' }, neve: { nome: 'Neve' },
    ondas: { nome: 'Ondas' }, pedras: { nome: 'Pedras' },
    lavoura: { nome: 'Lavoura' }, ruinas: { nome: 'Ruínas' }, lava: { nome: 'Lava' }, cristais: { nome: 'Cristais' },
    selva: { nome: 'Selva' }, savana: { nome: 'Savana' }, tundra: { nome: 'Tundra' }, corrompida: { nome: 'Corrompida' },
  };
  const TEX_PADRAO = Object.fromEntries(TERRENOS_PADRAO.map(t => [t.id, t.tex]));
  /* Carimbos: desenhos para enfeitar o mapa (arte própria, numa caixa 24×24). Na tela, .cc é preenchido com a cor do
     carimbo, .tc é um traço nessa cor, e o resto é traço de tinta escura. */
  const CARIMBOS = {
    arvore: { nome: 'Árvore', cor: '#5d9a4e', svg: '<path class="cc" d="M12 3.2c2.7 0 4.7 2 4.7 4.4 1.6.6 2.7 2.1 2.7 3.9 0 2.5-2.1 4.3-4.6 4.3H8.6C6 15.8 4 14 4 11.5c0-1.8 1-3.3 2.7-3.9 0-2.4 2.1-4.4 5.3-4.4z"/><path d="M12 15.8V21M12 18.2l-2.2-1.6M12 17.6l2-1.4M9 9.5c.5-1 1.4-1.6 2.4-1.7"/>' },
    pinheiro: { nome: 'Pinheiro', cor: '#3f7a46', svg: '<path class="cc" d="M12 2.5 7.6 8.8h2.3L6 14.2h3.1L5.2 19.6h13.6l-3.9-5.4H18l-3.9-5.4h2.3z"/><path d="M12 19.6v2.4M10 12.2l2 1.2 2-1.2"/>' },
    bosque: { nome: 'Bosque', cor: '#4f8a4a', svg: '<path class="cc" d="M6.5 4.5 3.6 9.2h1.7l-2.6 4.1h7.6L7.7 9.2h1.7z"/><path class="cc" d="M17.5 3.5l-3.1 4.8h1.7l-2.7 4.3h8.2l-2.7-4.3h1.7z"/><path class="cc" d="M12 8.8 8.9 13.6h1.7l-2.9 4.8h8.6l-2.9-4.8h1.7z"/><path d="M6.5 13.3v2.2M17.5 12.6v2.2M12 18.4v2.8"/>' },
    montanha: { nome: 'Montanha', cor: '#a39a8c', svg: '<path class="cc" d="M2.5 20 10 5.5l3.4 5.6 1.9-2.6L21.5 20z"/><path d="M10 5.5l.9 4.2-1.5 2.3 1.3 2.5-.7 5.5M7.6 10.4l2.4 1.1 1.1-.9M15.3 8.5l.5 3-1 1.6"/>' },
    serra: { nome: 'Serra', cor: '#988f82', svg: '<path class="cc" d="M1.5 20 6.8 9.8l2.7 4.1L14 6.5l4 6.2 1.6-2.2L22.5 20z"/><path d="M14 6.5l.7 4-1.3 2.1.9 3.2M6.8 9.8l.6 3-.9 2.2M12.3 9.3l1.7 1.2 1.2-1"/>' },
    colinas: { nome: 'Colinas', cor: '#b9a26a', svg: '<path class="cc" d="M1.8 19.5c1.5-5.2 4.6-7.8 7.7-7.8s6.2 2.6 7.2 7.8z"/><path class="cc" d="M9.8 19.5c1.2-4.1 3.7-6.2 6.2-6.2s5 2.1 6.2 6.2z"/><path d="M5.6 15.8c.9-1 2-1.5 3.1-1.7M13.8 16.6c.7-.7 1.5-1.1 2.3-1.2"/>' },
    vulcao: { nome: 'Vulcão', cor: '#8d6e63', svg: '<path class="cc" d="M2.8 20.5 9.4 10.2h5.2L21.2 20.5z"/><path d="M9.4 10.2c.9 1 4.3 1 5.2 0M11.8 12.4l-.6 3 1 2.2-.5 2.9M12 8.4c-1.6-1.1-1.2-2.9.4-3.4-.1-1.6 1.7-2.5 3-1.5 1.2-.9 3 0 2.8 1.6"/>' },
    rochas: { nome: 'Rochas', cor: '#9e9a92', svg: '<path class="cc" d="M2.8 19.5 4.6 14l3.8-2.4 3.4 2.6 1.4 5.3z"/><path class="cc" d="M11.6 19.5l2.3-6.4 3.7-1.8 3.4 3.6.4 4.6z"/><path d="M8.4 11.6l-.6 3.8M17.6 11.3l-1 4.2M4.6 14l2.2 1.4"/>' },
    ondas: { nome: 'Ondas', cor: '#4f86c0', svg: '<path class="tc" d="M2.5 8.5c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0M9 13.5c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0M3.5 18.5c1.6-1.6 3.2-1.6 4.8 0s3.2 1.6 4.8 0"/>' },
    juncos: { nome: 'Juncos', cor: '#6f8f5a', svg: '<path class="tc" d="M6 19.5c0-4 .5-7 1.6-9.2M9 19.5c0-3.1-.4-5.7-1.2-7.6M12 19.5c0-5 .8-8.6 2.1-11.2M15.2 19.5c0-3 .5-5.1 1.6-6.6M18.2 19.5c0-2-.3-3.6-1.1-4.6"/><path class="cc" d="M13.6 8.6c.5-1.7 1.4-2.3 1.9-1.9.5.4.1 1.8-1.2 2.8z"/><path d="M3 19.5h18M4.5 21.5h4M14 21.5h5"/>' },
    dunas: { nome: 'Dunas', cor: '#e0c07a', svg: '<path class="cc" d="M1.8 18.5c3-4.2 6.1-5.8 9.2-5.8 2 0 3.6 1 5.1 2.6 1.6-1.1 3.3-1.1 6.1 1v2.9H1.8z"/><path d="M11 12.7c-1 2-1.3 4.1-.8 6.5M16.1 15.3c-.4 1-.5 2.5-.2 3.9"/>' },
    navio: { nome: 'Navio', cor: '#b0844f', svg: '<path class="cc" d="M3.8 14.6h16.4l-2.6 4.1H6.4z"/><path class="cc" d="M12 4.2v9.4H6.2z"/><path d="M12 3.2v11.4M12 5.4l4.6 7.4H12"/><path class="tc" d="M2.5 21c1.6-1 3.2-1 4.8 0s3.2 1 4.8 0 3.2-1 4.8 0 3.2 1 4.8 0"/>' },
    casario: { nome: 'Casario', cor: '#c98f5a', svg: '<path class="cc" d="M2.8 20v-6.2l3.6-3.1 3.6 3.1V20zM10 20v-8.2l4-3.6 4 3.6V20zM18 20v-4.6l2-1.8 2 1.8V20z"/><path d="M1.8 20h20.6M5.4 20v-2.6h2V20M13 20v-3h2v3M14 11.4v.01"/>' },
    ruinas: { nome: 'Ruínas', cor: '#b3ab98', svg: '<path class="cc" d="M4 20v-9.5h3V20zM10.5 20v-5.5l2.2-1.5.8 1V20zM17 20V8.5h3V20z"/><path d="M2.5 20h19M3.5 10.5h4M16.5 8.5h4M18.5 8.5l-.8-1.5"/>' },
  };
  // As linhas do mapa (geografia, não viagem): o rio engrossa da nascente (o primeiro ponto) até a foz (o último);
  // a estrada é tracejada; a trilha, pontilhada. A cor de cada uma vem daqui, se o mestre não escolher outra.
  const LINHAS = { rio: { nome: 'Rio', cor: '#4f86c0' }, estrada: { nome: 'Estrada', cor: '#8a5a2b' }, trilha: { nome: 'Trilha', cor: '#6b4a2b' } };
  // As letras dos textos livres (a tela diz qual fonte é cada uma)
  const FONTES = { mapa: { nome: 'De mapa antigo' }, classica: { nome: 'Clássica, inclinada' }, simples: { nome: 'Simples' } };
  const RELACOES = { alianca: 'Aliança', neutra: 'Neutra', tensao: 'Tensão', guerra: 'Guerra' };
  // (lote 7, parte 4b) os estilos das cenas geradas (os da aba Cenas): a região diz qual vale para o que é gerado nela
  const ESTILOS_CENA = { comum: 'Comum', oriental: 'Oriental', nordico: 'Nórdico', desertico: 'Desértico', elfico: 'Élfico', anao: 'Anão' };
  /* (lote 6) A honra de um grupo, de −10 a +10 (até o lote 8, de −5 a +5), com um ícone junto dele no mapa (o estilo) — mais enfeitado quanto
     maior, rachado e escuro quando negativa. Sem estilo, o grupo não mostra honra. */
  const HONRA = { elmo: 'Elmo medieval', kabuto: 'Kabuto', katana: 'Katana', turbante: 'Turbante', coroa: 'Coroa',
    escudo: 'Escudo com brasão', cajado: 'Cajado de mago', mascara: 'Máscara tribal' };
  /* (lote 7, parte 5b) Os grupos do mundo: as caravanas, as patrulhas e os exércitos, que andam sozinhos pelas rotas
     deles com o tempo do mapa (o grupo comum, sem tipo, é o de sempre: os jogadores, ou quem o mestre quiser). Nascem
     escondidos dos jogadores. pt: os cubos de um tempo de marcha de começo. */
  const TIPOS_GRUPO = {
    caravana: { nome: 'Caravana', sigla: 'CAR', cor: '#c9963a', pt: 2, svg: '<path d="M2 15V8h11v7M13 11h4l3 3v1M2 15h18M4 8c0-2 2-3 4.5-3S13 6 13 8"/><circle cx="6" cy="17.5" r="2"/><circle cx="16" cy="17.5" r="2"/>' },
    patrulha: { nome: 'Patrulha', sigla: 'PAT', cor: '#5a8fc0', pt: 4, svg: '<path d="M17 2v20M15 5l2-3 2 3M3 7h9v5c0 4-2.5 6.5-4.5 8C5.5 18.5 3 16 3 12z"/>' },
    exercito: { nome: 'Exército', sigla: 'EXE', cor: '#c0503a', pt: 2, svg: '<path d="M5 22V2M5 3h13l-3.5 4.5L18 12H5M9 16l3 3M12 16l-3 3"/>' },
  };
  /* (lote 7, parte 5c) O clima do dia: os mesmos do Jornal e da Meditação (o mesmo desenho). conf: o que uma noite nele
     mexe no Conforto de quem acampa (a proposta do Acampamento); cena: o clima da cena gerada (os das Cenas); acamp: o
     clima do desenho do Acampamento. */
  const CLIMAS = {
    sol: { nome: 'Ensolarado', conf: 0, cena: '', acamp: 'limpo', svg: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>' },
    nublado: { nome: 'Nublado', conf: 0, cena: '', acamp: 'limpo', svg: '<path d="M7 18.5a4.2 4.2 0 0 1-.4-8.4A5.6 5.6 0 0 1 17.4 9a4.3 4.3 0 0 1 .3 8.6z"/>' },
    chuva: { nome: 'Chuva', conf: -5, cena: 'chuva', acamp: 'chuva', svg: '<path d="M7 14.5a4 4 0 0 1-.4-8A5.4 5.4 0 0 1 17 5.6a4.1 4.1 0 0 1 .3 8.2"/><path d="M8.5 17l-1 2.6M12.5 17l-1 2.6M16.5 17l-1 2.6"/>' },
    tempestade: { nome: 'Tempestade', conf: -10, cena: 'chuva', acamp: 'tempestade', svg: '<path d="M7 14a4 4 0 0 1-.4-8A5.4 5.4 0 0 1 17 5.1a4.1 4.1 0 0 1 .3 8.2"/><path d="M12.5 12.5 10 17h3.4l-2.2 4.4"/>' },
    neve: { nome: 'Neve', conf: -10, cena: 'neve', acamp: 'neve', svg: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4"/>' },
    nevoa: { nome: 'Névoa', conf: 0, cena: 'neblina', acamp: 'neblina', svg: '<path d="M4 8.5h16M3 12.5h13M7 16.5h14M5 20h9"/>' },
    vento: { nome: 'Ventania', conf: -5, cena: '', acamp: 'vento', svg: '<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7"/>' },
    calor: { nome: 'Calor', conf: -5, cena: '', acamp: 'limpo', svg: '<path d="M12 3c1.6 2 1.6 3.6 0 5.6s-1.6 3.6 0 5.6M7 5.5c1.2 1.6 1.2 2.9 0 4.5s-1.2 2.9 0 4.5M17 5.5c1.2 1.6 1.2 2.9 0 4.5s-1.2 2.9 0 4.5M5 20h14"/>' },
    frio: { nome: 'Frio', conf: -10, cena: '', acamp: 'limpo', svg: '<path d="M12 3v10.5M9.5 5.5H12M9.5 8.5H12M9.5 11.5H12"/><circle cx="12" cy="17" r="3.6"/><path d="M12 13.5v3.5"/>' },
  };
  /* A chance de cada clima (%) nas estações de um mundo temperado: a tabela de começo de cada mês vem da estação dele
     (pela posição do mês no ano: o primeiro e o último são de inverno). O mestre muda mês a mês. */
  const CLIMA_ESTACOES = {
    inverno: { sol: 20, nublado: 20, chuva: 10, tempestade: 5, neve: 25, nevoa: 10, vento: 0, calor: 0, frio: 10 },
    primavera: { sol: 30, nublado: 25, chuva: 25, tempestade: 5, neve: 0, nevoa: 10, vento: 5, calor: 0, frio: 0 },
    verao: { sol: 45, nublado: 15, chuva: 10, tempestade: 10, neve: 0, nevoa: 0, vento: 0, calor: 20, frio: 0 },
    outono: { sol: 25, nublado: 25, chuva: 20, tempestade: 5, neve: 0, nevoa: 15, vento: 5, calor: 0, frio: 5 },
  };
  // o ajuste de uma região, clima por clima: quanto ela muda a chance do mundo (×) — "mais" e "muito mais" também somam
  // um pouco (+), para valerem até no mês em que o mundo não tem aquele clima (o deserto tem calor no inverno)
  const AJUSTES_CLIMA = { nunca: { nome: 'Nunca', x: 0, mais: 0 }, menos: { nome: 'Menos', x: 0.5, mais: 0 }, mais: { nome: 'Mais', x: 2, mais: 5 }, muito: { nome: 'Muito mais', x: 4, mais: 15 } };
  /* (lote 7, parte 5c) As zonas de perigo (como a de guerra: uma área desenhada, com começo e fim): o que passar o dia
     dentro mexe na Fadiga (em passos da pilha), no Conforto e na Sanidade de quem está nela — a proposta do "Próximo
     dia". O mestre muda os números de cada zona. */
  const ZONAS = {
    guerra: { nome: 'Zona de guerra' },
    tempestade: { nome: 'Tempestade', cor: '#5f87c9', ef: { fad: -1, conf: -10, san: 0 } },
    praga: { nome: 'Praga', cor: '#8fa83f', ef: { fad: -1, conf: -5, san: -2 } },
    frio: { nome: 'Frio extremo', cor: '#9cc7e8', ef: { fad: -1, conf: -10, san: 0 } },
    maldita: { nome: 'Terra amaldiçoada', cor: '#7a4f9a', ef: { fad: 0, conf: -5, san: -5 } },
    monstro: { nome: 'Território de monstro', cor: '#b5652f', ef: { fad: -1, conf: -5, san: -2 } },
  };
  // o que quem anda faz no fim da rota
  const MODOS_ROTA = { ida: 'Para no fim (só ida)', volta: 'Volta pelo mesmo caminho (ida e volta)', circuito: 'Recomeça do começo (circuito)' };
  const MAX_PARADAS = 30;
  /* (lote 7) Os dias da semana: o mestre diz que dia da semana é hoje, e o resto segue. sem0 = o dia da semana do dia 0
     do mundo (0 = Segunda-Feira … 6 = Domingo); null = o mapa ainda não conta a semana. */
  const SEMANA = ['Segunda-Feira', 'Terça-Feira', 'Quarta-Feira', 'Quinta-Feira', 'Sexta-Feira', 'Sábado', 'Domingo'];
  const CAL_PADRAO = {
    dia: 0, ano0: 1, era: '', tpd: TEMPOS_DIA, tempo: 0, sem0: null,
    meses: ['Alvorada', 'Degelo', 'Semeadura', 'Florada', 'Verdor', 'Solar', 'Colheita', 'Âmbar', 'Brumas', 'Geada', 'Vigília', 'Noite Longa']
      .map(nome => ({ nome, dias: 30 })),
  };

  /* ---------------- limites ---------------- */
  const MAX_OBJS = 2000, MAX_OPS = 4000, MAX_TXT = 4000, MAX_FAC = 500, MAX_PTS = 2000, MAX_COORD = 1e6;
  const MAX_HEX = 20000, MAX_TER = 40, MAX_CUSTO = 9999;
  // o desenho à mão: quantas pinceladas e quantos pontos ao todo (o documento do mapa tem limite de tamanho)
  const MAX_PINC = 4000, MAX_PONTOS_PINT = 60000, MAX_FASES = 60;
  const MAX_NIVEL = 10;                           // regiões dentro de regiões: até quantos níveis (Reino → Condado → …)
  // (lote 6) a honra (lote 8: de −10 a +10) e o histórico dela; o painel das facções: recursos, números, histórico
  const MAX_HONRA = 10, MAX_HIST = 100, MAX_MOTIVO = 200, MAX_REC = 40, MAX_FHIST = 200, MAX_MUD = 40, MAX_NUM = 1e12;
  const PREFIXO = { m: 'mc', g: 'gr', r: 'rg', e: 'ev', t: 'rt', f: 'fr', z: 'zg', l: 'ln', c: 'cb', x: 'tx' };
  const PADROES = {
    m: { x: 0, y: 0, ic: 'cidade', cor: '', rumor: false, falso: false, liga: null },
    g: { x: 0, y: 0, cor: '#e6ab4f', sigla: 'GR', cubos: CUBOS_DIA, rota: null, prog: 0, estilo: '', honra: 0, hhist: [], fac: null },   // (lote 8: fac — a facção do grupo)
    r: { pts: [], fac: null, cor: '', custo: null, enc: { chance: 0, itens: [] }, pai: null },
    e: { x: 0, y: 0, tipo: 'guerra', r: 80, ini: null, fim: null, cresce: 0, forca: 1 },   // ini null = "hoje" ao entrar no mapa
    t: { pts: [], via: 'trilha' },
    f: { pts: [], a: null, b: null, ativa: true },
    // zona de guerra: a área das duas facções; muda de forma com o tempo (fases: a partir de tal dia, tal forma)
    z: { pts: [], a: null, b: null, ini: null, fim: null, fases: [] },
    l: { pts: [], estilo: 'rio', larg: 10, cor: '' },                  // linha: rio, estrada ou trilha
    c: { x: 0, y: 0, ic: 'arvore', tam: 40, cor: '', vira: false },    // carimbo (tam: a largura, em unidades do mapa)
    x: { x: 0, y: 0, fonte: 'mapa', tam: 28, cor: '', rot: 0, esp: 0 }, // texto livre: o texto é o nome
  };

  /* ---------------- apoio ---------------- */
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  // Número só se for número de verdade ou texto numérico ("12"); true, [], null e lixo não viram 0 por acaso.
  const num = (v, padrao) => {
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : padrao;
  };
  const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
  const inteiro = (v, padrao, a, b) => { const n = num(v, NaN); return Number.isFinite(n) ? limitar(Math.round(n), a, b) : padrao; };
  const arred = n => Math.round(n * 100) / 100 || 0;          // duas casas bastam (são pixels) e o JSON fica curto; sem -0
  const coord = v => { const n = num(v, NaN); return Number.isFinite(n) ? arred(limitar(n, -MAX_COORD, MAX_COORD)) : null; };
  function texto(v, padrao = '', max = MAX_TXT) {
    let s = typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : padrao;
    if (s.length > max) { s = s.slice(0, max); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); }
    return s;
  }
  const sim = v => v === true || v === 1 || (typeof v === 'string' && /^(true|1|sim)$/i.test(v.trim()));
  // Para o que esconde dos jogadores, na dúvida esconde: só um "não" claro conta como não.
  const talvez = v => !(v === false || v == null || v === 0 || (typeof v === 'string' && /^(|false|0|n[aã]o|no)$/i.test(v.trim())));
  function cor(v, padrao) {
    if (typeof v !== 'string') return padrao;
    const s = v.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(s)) return s;
    if (/^#[0-9a-f]{3}$/.test(s)) return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
    return padrao;
  }
  const idOk = v => (typeof v === 'string' && v.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(v) && v !== '__proto__' ? v : '');
  /* O atalho de um marcador: para onde ele leva quem clica em "abrir".
       { t: 'cena', id, nome }   uma cena da aba Cenas (o nome fica guardado para quem não tem a lista de cenas)
       { t: 'mapa', id, nome }   outro mapa do Mapa-múndi
       { t: 'acampamento' }      o acampamento da mesa */
  function normLiga(v) {
    if (!ehObj(v)) return null;
    if (v.t === 'acampamento') return { t: 'acampamento' };
    if ((v.t === 'cena' || v.t === 'mapa') && idOk(v.id)) return { t: v.t, id: v.id, nome: texto(v.nome, '', 80) };
    return null;
  }
  function unico(id, vistos) {
    let r = id, n = 2;
    while (vistos.has(r)) r = id + '_' + n++;
    vistos.add(r);
    return r;
  }
  function copia(x) {
    if (x === undefined) return undefined;
    try { if (typeof structuredClone === 'function') return structuredClone(x); } catch (e) { /* algo que não clona: cai no JSON */ }
    return JSON.parse(JSON.stringify(x));
  }
  const novoId = prefixo => (prefixo || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const xy = p => (Array.isArray(p) ? { x: num(p[0], 0), y: num(p[1], 0) } : ehObj(p) ? { x: num(p.x, 0), y: num(p.y, 0) } : { x: 0, y: 0 });

  /* ---------------- geometria ---------------- */
  function dist(a, b) { const p = xy(a), q = xy(b); return Math.hypot(q.x - p.x, q.y - p.y); }
  function compPolilinha(pts) {
    if (!Array.isArray(pts)) return 0;
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += dist(pts[i - 1], pts[i]);
    return s;
  }
  // O ponto a s unidades do começo da linha; fim = chegou (ou passou) do último ponto. i = trecho onde caiu.
  function pontoNaPolilinha(pts, s) {
    if (!Array.isArray(pts) || !pts.length) return { x: 0, y: 0, fim: true, i: 0 };
    const total = compPolilinha(pts), ult = xy(pts[pts.length - 1]);
    s = s === Infinity ? total : num(s, 0);                  // "até o fim" também vale (num() não aceita infinito)
    if (s >= total) return { x: ult.x, y: ult.y, fim: true, i: Math.max(0, pts.length - 2) };
    if (s <= 0) { const p = xy(pts[0]); return { x: p.x, y: p.y, fim: false, i: 0 }; }
    for (let i = 1; i < pts.length; i++) {
      const a = xy(pts[i - 1]), b = xy(pts[i]), d = Math.hypot(b.x - a.x, b.y - a.y);
      if (s <= d) { const t = d ? s / d : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, fim: false, i: i - 1 }; }
      s -= d;
    }
    return { x: ult.x, y: ult.y, fim: true, i: Math.max(0, pts.length - 2) };
  }
  // O ponto da linha mais perto de p: onde fica, a que distância (d) e quanto da linha vem antes dele (s).
  function maisPerto(pts, p) {
    const q = xy(p);
    let melhor = null, s0 = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = xy(pts[i - 1]), b = xy(pts[i]), dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
      const t = L ? limitar(((q.x - a.x) * dx + (q.y - a.y) * dy) / (L * L), 0, 1) : 0;
      const x = a.x + dx * t, y = a.y + dy * t, d = Math.hypot(q.x - x, q.y - y);
      if (!melhor || d < melhor.d) melhor = { x, y, d, s: s0 + L * t };
      s0 += L;
    }
    if (melhor) return melhor;
    const a = xy(pts[0]);
    return { x: a.x, y: a.y, d: Math.hypot(q.x - a.x, q.y - a.y), s: 0 };
  }
  function dentroPoligono(p, pts) {
    if (!Array.isArray(pts) || pts.length < 3) return false;
    const { x, y } = xy(p);
    let dentro = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = xy(pts[i]), b = xy(pts[j]);
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) dentro = !dentro;
    }
    return dentro;
  }
  // Centro de massa do polígono (onde vai o nome da região); polígono achatado: a média dos pontos.
  function centroide(pts) {
    if (!Array.isArray(pts) || !pts.length) return { x: 0, y: 0 };
    let A = 0, cx = 0, cy = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = xy(pts[j]), b = xy(pts[i]), f = a.x * b.y - b.x * a.y;
      A += f; cx += (a.x + b.x) * f; cy += (a.y + b.y) * f;
    }
    if (Math.abs(A) < 1e-9) {
      let sx = 0, sy = 0;
      for (const p of pts) { const q = xy(p); sx += q.x; sy += q.y; }
      return { x: sx / pts.length, y: sy / pts.length };
    }
    return { x: cx / (3 * A), y: cy / (3 * A) };
  }
  function distSegmento(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const t = l2 ? limitar(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  }
  // A linha suave que passa por todos os pontos (Catmull-Rom), amostrada mais ou menos a cada `passo` unidades.
  function suavizar(pts, passo) {
    const p = Array.isArray(pts) ? pts.map(q => { const v = xy(q); return [v.x, v.y]; }) : [];
    if (p.length < 3) return p;
    const out = [], P = i => p[limitar(i, 0, p.length - 1)], d = Math.max(0.5, num(passo, 8));
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const n = limitar(Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / d), 2, 64);
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(c => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(p[p.length - 1].slice());
    return out;
  }
  // Um número de 0 a 1 que só depende do texto: a ondulação de cada rio fica sempre igual, em qualquer aparelho.
  function semente(s) {
    let h = 2166136261;
    for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967296;
  }
  /* O contorno do rio (um polígono): engrossa da nascente (o primeiro ponto, um quinto da largura) até a foz (o
     último, a largura toda), com uma ondulação leve nas margens e no curso — sempre a mesma para o mesmo rio. */
  function contornoRio(pts, larg, id) {
    const w0 = Math.max(0.5, num(larg, 10)), c = suavizar(pts, Math.max(1, w0 * 0.8)), n = c.length;
    if (n < 2) return [];
    const s = [0];
    for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
    const S = s[n - 1] || 1, f1 = semente(id) * 2 * Math.PI, f2 = semente(id + '~') * 2 * Math.PI, esq = [], dir = [];
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
      let nx = a[1] - b[1], ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l; ny /= l;
      const t = s[i] / S, meia = w0 * (0.2 + 0.8 * Math.pow(t, 0.75)) * (1 + 0.12 * Math.sin(s[i] / (w0 * 2.2) + f1)) / 2;
      const curso = w0 * 0.12 * Math.sin(s[i] / (w0 * 3.7) + f2) * Math.min(1, t * 4);    // (a nascente fica onde foi posta)
      const x = c[i][0] + nx * curso, y = c[i][1] + ny * curso;
      esq.push([arred(x + nx * meia), arred(y + ny * meia)]);
      dir.push([arred(x - nx * meia), arred(y - ny * meia)]);
    }
    return esq.concat(dir.reverse());
  }

  /* ---------------- calendário ---------------- */
  const mesesDe = cal => (ehObj(cal) && Array.isArray(cal.meses) && cal.meses.some(ehObj) ? cal.meses.filter(ehObj) : CAL_PADRAO.meses);
  const diasDoMes = m => inteiro(m.dias, 30, 1, 1000);
  function diasNoAno(cal) { return mesesDe(cal).reduce((s, m) => s + diasDoMes(m), 0); }
  function dataDe(cal, dia) {
    const meses = mesesDe(cal), total = diasNoAno(cal), d = Math.max(0, Math.floor(num(dia, 0)));
    const ano = inteiro(ehObj(cal) ? cal.ano0 : 1, 1, -1e6, 1e6) + Math.floor(d / total);
    let r = d % total;
    for (let i = 0; i < meses.length; i++) {
      const n = diasDoMes(meses[i]);
      if (r < n) return { ano, mes: i, diaMes: r + 1, nomeMes: texto(meses[i].nome, '') || 'Mês ' + (i + 1) };
      r -= n;
    }
    return { ano, mes: 0, diaMes: 1, nomeMes: texto(meses[0].nome, '') || 'Mês 1' };   // não chega aqui
  }
  function textoData(cal, dia) {
    const d = dataDe(cal, dia), era = ehObj(cal) ? texto(cal.era, '').trim() : '';
    return d.diaMes + ' de ' + d.nomeMes + ', ano ' + d.ano + (era ? ' ' + era : '');
  }
  // (lote 7) o dia da semana de um dia do mundo (índice 0 a 6, ou -1 sem a semana) e o nome dele ('' sem a semana)
  function semanaDe(cal, dia) {
    const s0 = ehObj(cal) && Number.isInteger(cal.sem0) && cal.sem0 >= 0 && cal.sem0 <= 6 ? cal.sem0 : -1;
    if (s0 < 0) return -1;
    return (((s0 + Math.floor(num(dia, 0))) % 7) + 7) % 7;
  }
  const diaDaSemana = (cal, dia) => { const i = semanaDe(cal, dia); return i < 0 ? '' : SEMANA[i]; };
  // "Segunda-Feira, 12 de Degelo, ano 3" (sem a semana: só a data)
  const textoDataSemana = (cal, dia) => { const s = diaDaSemana(cal, dia); return (s ? s + ', ' : '') + textoData(cal, dia); };
  // o sem0 que faz o dia `dia` cair no dia da semana `i` (0 a 6); i fora disso: null (o mapa deixa de contar a semana)
  const sem0Para = (dia, i) => (Number.isInteger(i) && i >= 0 && i <= 6 ? (((i - Math.floor(num(dia, 0))) % 7) + 7) % 7 : null);

  /* ---------------- eventos ---------------- */
  // Raio no dia: cresce (ou encolhe) desde o começo; antes de começar, o raio de partida. Nunca negativo.
  function raioNoDia(e, dia) {
    const r = num(e && e.r, 80), ini = num(e && e.ini, 0), cresce = num(e && e.cresce, 0);
    return Math.max(0, r + cresce * Math.max(0, num(dia, 0) - ini));
  }
  // Ativo: já começou, não terminou (o dia do fim conta) e ainda tem tamanho (encolher até sumir também termina).
  function eventoAtivo(e, dia) {
    if (!e) return false;
    dia = num(dia, 0);
    const ini = num(e.ini, 0), fim = e.fim == null || e.fim === '' ? null : num(e.fim, null);
    return dia >= ini && (fim == null || dia <= fim) && raioNoDia(e, dia) > 0;
  }
  function eventosDoDia(mapa, dia) {
    const objs = ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs : [];
    if (dia == null) dia = ehObj(mapa) && ehObj(mapa.cal) ? mapa.cal.dia : 0;
    return objs.filter(o => ehObj(o) && o.k === 'e' && eventoAtivo(o, dia));
  }
  const diaDe = (mapa, dia) => (dia != null ? num(dia, 0) : ehObj(mapa) && ehObj(mapa.cal) ? num(mapa.cal.dia, 0) : 0);
  const nomeEvento = e => (ehObj(e) ? texto(e.nome).trim() || (EVENTOS[e.tipo] || EVENTOS.guerra).nome : 'Evento');
  /* (lote 7, parte 5a) Os eventos de hoje que pesam na viagem (com o peso ligado e algum efeito), guardados por mapa e
     dia (toda mudança no mapa faz outro objeto; o dia pode mudar dentro de um rascunho, por isso ele entra na conta). */
  const pesadosDe = typeof WeakMap === 'function' ? new WeakMap() : null;
  function eventosPesados(mapa, dia) {
    const d = diaDe(mapa, dia);
    if (pesadosDe && ehObj(mapa)) { const c = pesadosDe.get(mapa); if (c && c.d === d) return c.l; }
    const l = eventosDoDia(mapa, d).filter(e => ehObj(e.peso) && (num(e.peso.custo, 0) || num(e.peso.enc, 0) || e.peso.fecha));
    if (pesadosDe && ehObj(mapa)) pesadosDe.set(mapa, { d, l });
    return l;
  }
  /* O que os eventos de hoje pesam num ponto (o raio do dia): os cubos a mais, os pontos de encontro a mais (ou a
     menos), o primeiro que fecha a passagem (ou null) e todos os que pesam ali. */
  function pesoNoPonto(mapa, x, y, dia) {
    const d = diaDe(mapa, dia), out = { custo: 0, enc: 0, fecha: null, eventos: [] };
    for (const e of eventosPesados(mapa, d)) {
      if (Math.hypot(num(x, 0) - e.x, num(y, 0) - e.y) > raioNoDia(e, d)) continue;
      out.custo += num(e.peso.custo, 0); out.enc += num(e.peso.enc, 0);
      if (e.peso.fecha && !out.fecha) out.fecha = e;
      out.eventos.push(e);
    }
    out.custo = Math.round(out.custo * 10) / 10;
    return out;
  }
  /* (lote 7, parte 5a) O que os eventos de hoje levam para a cena gerada num ponto (CENA_EVENTO): o clima do primeiro
     que dá clima, a hora (o breu do eclipse vence a noite da lua de sangue), as zonas de efeito (sem repetir) e o chão
     seco. Vale com ou sem o peso ligado. */
  function cenaNoPonto(mapa, x, y, dia) {
    const d = diaDe(mapa, dia), out = { clima: '', hora: '', fx: [], seco: false, eventos: [] };
    for (const e of eventosDoDia(mapa, d)) {
      const c = CENA_EVENTO[e.tipo];
      if (!c || Math.hypot(num(x, 0) - e.x, num(y, 0) - e.y) > raioNoDia(e, d)) continue;
      if (c.clima && !out.clima) out.clima = c.clima;
      if (c.hora && (!out.hora || c.hora === 'breu')) out.hora = c.hora;
      if (c.fx && !out.fx.includes(c.fx)) out.fx.push(c.fx);
      if (c.seco) out.seco = true;
      out.eventos.push(e);
    }
    return out;
  }

  /* ---------------- (lote 7, parte 5c) o clima do dia ----------------
     A tabela do mundo dá a chance de cada clima em cada mês (a de começo vem da estação do mês); uma região pode ajustar
     clima por clima (nunca, menos, mais, muito mais). O sorteio do dia é um número só para o mapa inteiro (do id do mapa
     e do dia: sai igual em todo aparelho e não muda ao repintar), e cada região o lê com as chances dela — um dia de
     tempestade tende a ser de tempestade em todo lugar, e no deserto vira calor. O mestre troca o de hoje à mão. */
  function estacaoDoMes(i, n) { const f = (i + 0.5) / Math.max(1, n); return f < 1 / 6 || f >= 11 / 12 ? 'inverno' : f < 5 / 12 ? 'primavera' : f < 2 / 3 ? 'verao' : 'outono'; }
  const tabelaPadraoDoMes = (i, n) => Object.assign({}, CLIMA_ESTACOES[estacaoDoMes(i, n)]);
  // a chance de cada clima num mês (a da tabela do mapa, ou a de começo), com o ajuste da região
  function chancesDoClima(mapa, mes, regiao) {
    const n = mesesDe(ehObj(mapa) ? mapa.cal : null).length, tab = ehObj(mapa) && ehObj(mapa.clima) && Array.isArray(mapa.clima.tab) ? mapa.clima.tab : null;
    const base = tab && ehObj(tab[mes]) ? tab[mes] : tabelaPadraoDoMes(mes, n), out = {};
    for (const k of Object.keys(CLIMAS)) { const aj = ehObj(regiao) && ehObj(regiao.clima) ? AJUSTES_CLIMA[regiao.clima[k]] : null; out[k] = Math.max(0, num(base[k], 0)) * (aj ? aj.x : 1) + (aj ? aj.mais : 0); }
    return out;
  }
  // o número do dia, de 0 a 1 (o mesmo para o mapa inteiro)
  function sorteioDoDia(mapa, dia) {
    let h = 2166136261;
    for (const ch of String((ehObj(mapa) && mapa.id) || 'mapa') + ':' + Math.floor(num(dia, 0))) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function climaSorteado(mapa, dia, regiao) {
    const d = diaDe(mapa, dia), mes = dataDe(ehObj(mapa) ? mapa.cal : null, d).mes, ch = chancesDoClima(mapa, mes, regiao), ks = Object.keys(CLIMAS);
    const soma = ks.reduce((t, k) => t + ch[k], 0);
    if (!(soma > 0)) return 'sol';
    let r = sorteioDoDia(mapa, d) * soma, ult = 'sol';
    for (const k of ks) { if (!(ch[k] > 0)) continue; ult = k; if (r < ch[k]) return k; r -= ch[k]; }
    return ult;
  }
  /* (lote 9) O clima muda ao longo do dia: a cada N tempos (o mestre escolhe no calendário do mapa: clima.cada; sem
     escolher, a cada 2; 0 = uma vez por dia). O dia fica em trechos de N tempos: o primeiro é o sorteio do dia (como
     antes); cada trecho seguinte anda aos poucos a partir do anterior — fica no mesmo, ou vai para um vizinho (do sol ao
     nublado, do nublado à chuva, da chuva à tempestade…), pesado pela tabela do mês (e pelo ajuste da região). O número
     de cada trecho vem do mapa, do dia e do trecho: sai igual em todo aparelho. O escolhido à mão vale para o trecho em
     que foi escolhido (até a próxima mudança); o trecho seguinte continua a partir dele. */
  const CADA_CLIMA = 2;
  const VIZINHOS_CLIMA = {
    sol: ['nublado', 'calor', 'vento'], nublado: ['sol', 'chuva', 'nevoa', 'vento', 'frio'], chuva: ['nublado', 'tempestade', 'nevoa'],
    tempestade: ['chuva', 'vento'], neve: ['frio', 'nublado'], nevoa: ['nublado', 'chuva', 'sol'], vento: ['sol', 'nublado', 'tempestade'],
    calor: ['sol'], frio: ['nublado', 'neve', 'sol'],
  };
  // de quantos em quantos tempos o clima muda (0: uma vez por dia)
  const cadaDe = mapa => { const c = ehObj(mapa) && ehObj(mapa.clima) ? mapa.clima.cada : undefined; return c == null || c === '' ? CADA_CLIMA : inteiro(c, CADA_CLIMA, 0, MAX_TEMPOS); };
  // o trecho do dia de um tempo (0 = o 1º tempo; com o clima a cada 2 tempos, o 1º e o 2º são o trecho 0)
  function trechoDoTempo(mapa, tempo) { const n = cadaDe(mapa), t = Math.max(0, Math.floor(num(tempo, 0))); return n > 0 ? Math.floor(t / n) : 0; }
  const trechoAgora = mapa => trechoDoTempo(mapa, ehObj(mapa) && ehObj(mapa.cal) ? mapa.cal.tempo : 0);
  // quantos trechos tem o dia, e o tempo (1º, 2º…) em que um trecho começa
  function trechosDoDia(mapa) { const n = cadaDe(mapa); return n > 0 ? Math.ceil(tpdDe(ehObj(mapa) ? mapa.cal : null) / n) : 1; }
  const comecoDoTrecho = (mapa, tr) => (cadaDe(mapa) > 0 ? Math.max(0, Math.floor(num(tr, 0))) * cadaDe(mapa) : 0) + 1;
  // o número de um trecho, de 0 a 1 (o mesmo para o mapa inteiro)
  function sorteioDoTrecho(mapa, dia, tr) {
    let h = 2166136261;
    for (const ch of String((ehObj(mapa) && mapa.id) || 'mapa') + ':' + Math.floor(num(dia, 0)) + ':t' + Math.floor(num(tr, 0))) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  // um passo do clima: fica (o mais provável) ou vai para um vizinho, pela chance do mês (o que não tem chance, não vem)
  function passoDoClima(k, ch, r) {
    const cand = [k].concat(VIZINHOS_CLIMA[k] || []), peso = c => (c === k ? 2 * Math.max(0, num(ch[c], 0)) + 20 : Math.max(0, num(ch[c], 0)));
    const soma = cand.reduce((t, c) => t + peso(c), 0);
    let x = limitar(num(r, 0), 0, 0.999999) * soma;
    for (const c of cand) { const p = peso(c); if (x < p) return c; x -= p; }
    return k;
  }
  // o clima de um trecho sem o escolhido à mão para ele: o sorteio do dia (o primeiro) ou o passo a partir do anterior
  function climaSorteadoDoTrecho(mapa, dia, tr, regiao) {
    const d = diaDe(mapa, dia), t = Math.max(0, Math.floor(num(tr, 0)));
    if (t === 0) return climaSorteado(mapa, d, regiao);
    const antes = climaDoTrecho(mapa, d, t - 1, regiao).k, mes = dataDe(ehObj(mapa) ? mapa.cal : null, d).mes;
    return passoDoClima(antes, chancesDoClima(mapa, mes, regiao), sorteioDoTrecho(mapa, d, t));
  }
  // o escolhido à mão (o do mundo: clima.mao; o da região: chj) — { d, k } e, depois do 1º trecho, t
  const maoDe = (mapa, regiao) => (regiao ? (ehObj(regiao) ? regiao.chj : null) : ehObj(mapa) && ehObj(mapa.clima) ? mapa.clima.mao : null);
  function climaDoTrecho(mapa, dia, tr, regiao) {
    const d = diaDe(mapa, dia), t = Math.max(0, Math.floor(num(tr, 0))), mao = maoDe(mapa, regiao);
    if (ehObj(mao) && mao.d === d && (mao.t || 0) === t && tem(CLIMAS, mao.k)) return { k: mao.k, mao: true };
    // (na projeção — quem joga —, o clima de agora vem pronto: ch nas regiões e nos grupos, hoje no mundo)
    if (regiao && tem(CLIMAS, regiao.ch) && !regiao.clima) return { k: regiao.ch, mao: false };
    if (!regiao && ehObj(mapa) && ehObj(mapa.clima) && tem(CLIMAS, mapa.clima.hoje) && !Array.isArray(mapa.clima.tab)) return { k: mapa.clima.hoje, mao: false };
    return { k: climaSorteadoDoTrecho(mapa, d, t, regiao), mao: false };
  }
  /* O clima de um dia (no mundo, ou numa região) — (lote 9) no trecho de agora, se o dia é hoje (no começo do dia, se é
     outro dia), ou no trecho pedido (tr). O que o mestre escolheu à mão, senão o sorteado (e os passos do dia). Na
     projeção (quem joga), o clima de agora já vem pronto (clima.hoje, e ch nas regiões e nos grupos). */
  function climaDoDia(mapa, dia, regiao, tr) {
    const d = diaDe(mapa, dia), hoje = ehObj(mapa) && ehObj(mapa.cal) ? num(mapa.cal.dia, 0) : 0;
    return climaDoTrecho(mapa, d, tr != null ? tr : d === hoje ? trechoAgora(mapa) : 0, regiao);
  }
  // (lote 9) os climas do dia, trecho a trecho (até o de agora, ou o dia inteiro): [{ t, de (o 1º tempo), k, mao }]
  function climasDoDia(mapa, dia, regiao, ate) {
    const d = diaDe(mapa, dia), n = ate != null ? Math.min(trechosDoDia(mapa) - 1, Math.max(0, Math.floor(num(ate, 0)))) : trechosDoDia(mapa) - 1, out = [];
    for (let t = 0; t <= n; t++) out.push(Object.assign({ t, de: comecoDoTrecho(mapa, t) }, climaDoTrecho(mapa, d, t, regiao)));
    return out;
  }
  // a região que manda no clima de um ponto: a mais de dentro com ajuste (ou com o clima de hoje escolhido à mão)
  function regiaoDoClima(mapa, x, y, dia) {
    const d = diaDe(mapa, dia), manda = r => !!(r.clima || (r.chj && r.chj.d === d) || tem(CLIMAS, r.ch));
    // (a de dentro sem ajuste usa a de fora: sobe pelos pais)
    for (const r0 of regioesEm(mapa, x, y)) {
      let r = r0, n = 0;
      while (r && n <= MAX_NIVEL) { if (manda(r)) return r; r = r.pai ? objDe(mapa, r.pai, 'r') : null; n++; }
    }
    return null;
  }
  function climaNoPonto(mapa, x, y, dia) { const reg = regiaoDoClima(mapa, x, y, dia); return Object.assign(climaDoDia(mapa, dia, reg), { regiao: reg }); }
  /* (lote 7, parte 5c) As zonas de perigo acontecendo num ponto (a forma do dia), e o que elas mexem juntas. */
  function zonasNoPonto(mapa, x, y, dia) {
    const d = diaDe(mapa, dia);
    return (ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs : []).filter(z => z.k === 'z' && z.tipo && z.tipo !== 'guerra' && zonaAtiva(z, d) && dentroPoligono([num(x, 0), num(y, 0)], formaNoDia(z, d)));
  }
  function efeitoDasZonas(zs) {
    const ef = { fad: 0, conf: 0, san: 0 };
    for (const z of zs || []) { const e = ehObj(z.ef) ? z.ef : (ZONAS[z.tipo] || {}).ef || {}; ef.fad += num(e.fad, 0); ef.conf += num(e.conf, 0); ef.san += num(e.san, 0); }
    return ef;
  }

  /* ---------------- zonas de guerra ---------------- */
  // A fase da zona que vale no dia (a última que já começou), ou -1: antes de qualquer fase vale a forma de partida.
  function faseNoDia(z, dia) {
    const d = num(dia, 0), fases = ehObj(z) && Array.isArray(z.fases) ? z.fases : [];
    let i = -1, melhor = -Infinity;
    fases.forEach((f, k) => { const fd = ehObj(f) ? num(f.dia, NaN) : NaN; if (fd <= d && fd >= melhor && Array.isArray(f.pts)) { melhor = fd; i = k; } });
    return i;
  }
  function formaNoDia(z, dia) {
    const i = faseNoDia(z, dia);
    return i >= 0 ? z.fases[i].pts : ehObj(z) && Array.isArray(z.pts) ? z.pts : [];
  }
  // Ativa: já começou e não terminou (o dia do fim conta).
  function zonaAtiva(z, dia) {
    if (!ehObj(z)) return false;
    const d = num(dia, 0), ini = num(z.ini, 0), fim = z.fim == null || z.fim === '' ? null : num(z.fim, null);
    return d >= ini && (fim == null || d <= fim);
  }

  /* ---------------- a grade de hexágonos ----------------
     grade = { tam, x, y, orient, on, alfa }: tam é a distância entre os centros de dois hexágonos vizinhos, em
     unidades do mapa (0 = sem grade); (x, y) é o centro do hexágono (0, 0); orient 'pe' (com a ponta para cima) ou
     'deitado' (com um lado em cima). Coordenadas axiais (q, r), como as de quem joga com hexágonos. */
  const R3 = Math.sqrt(3);
  const gradeDe = m => (ehObj(m) && ehObj(m.grade) ? m.grade : null);
  const temGrade = m => { const g = gradeDe(m); return !!g && num(g.tam, 0) > 0; };
  const objDe = (mapa, id, k) => (ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs.find(o => ehObj(o) && o.id === id && (!k || o.k === k)) || null : null);
  // o hexágono de coordenadas fracionárias mais perto (arredonda em cubo: a soma q + r + s fica zero)
  function arredHex(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r);
    const rs = Math.round(s), dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
    return { q: rq + 0, r: rr + 0 };                           // (+ 0: sem -0)
  }
  // O hexágono onde cai o ponto (x, y). Sem grade: null.
  function hexDe(m, x, y) {
    if (!temGrade(m)) return null;
    const g = m.grade, s = num(g.tam, 0) / R3, px = num(x, 0) - num(g.x, 0), py = num(y, 0) - num(g.y, 0);
    if (g.orient === 'deitado') return arredHex((2 / 3 * px) / s, (-1 / 3 * px + R3 / 3 * py) / s);
    return arredHex((R3 / 3 * px - 1 / 3 * py) / s, (2 / 3 * py) / s);
  }
  function centroHex(m, q, r) {
    const g = gradeDe(m) || {}, s = num(g.tam, 0) / R3, gx = num(g.x, 0), gy = num(g.y, 0);
    if (g.orient === 'deitado') return { x: gx + s * 1.5 * q, y: gy + s * (R3 / 2 * q + R3 * r) };
    return { x: gx + s * (R3 * q + R3 / 2 * r), y: gy + s * 1.5 * r };
  }
  // os 6 cantos (para desenhar o hexágono)
  function cantosHex(m, q, r) {
    const g = gradeDe(m) || {}, s = num(g.tam, 0) / R3, c = centroHex(m, q, r), a0 = g.orient === 'deitado' ? 0 : -30;
    const out = [];
    for (let i = 0; i < 6; i++) { const a = (a0 + 60 * i) * Math.PI / 180; out.push([c.x + s * Math.cos(a), c.y + s * Math.sin(a)]); }
    return out;
  }
  const distHex = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
  const chaveHex = h => h.q + ',' + h.r;
  function lerChaveHex(k) {
    const m = /^(-?\d{1,6}),(-?\d{1,6})$/.exec(String(k));
    return m ? { q: Number(m[1]) + 0, r: Number(m[2]) + 0 } : null;
  }
  // Os hexágonos de a até b, cada um vizinho do anterior: a linha reta da grade.
  function linhaHex(a, b) {
    const n = distHex(a, b), out = [];
    // (o empurrãozinho deixa o ponto que cai bem na aresta sempre do mesmo lado)
    for (let i = 0; i <= n; i++) { const t = n ? i / n : 0; out.push(arredHex(a.q + (b.q - a.q) * t + 1e-6, a.r + (b.r - a.r) * t + 1e-6)); }
    return out;
  }
  // Os hexágonos por onde passa uma linha (a rota), do começo ao fim, cada um vizinho do anterior.
  function caminhoHex(m, pts) {
    if (!temGrade(m) || !Array.isArray(pts) || !pts.length) return [];
    const out = [];
    let ant = null;
    for (const p of pts) {
      const q = xy(p), h = hexDe(m, q.x, q.y);
      for (const x of ant ? linhaHex(ant, h) : [h]) { const u = out[out.length - 1]; if (!u || u.q !== x.q || u.r !== x.r) out.push(x); }
      ant = h;
    }
    return out;
  }
  // Distâncias: um hexágono = 5 cubos. Sem grade não há escala (0).
  const cubosDe = (m, unidades) => (temGrade(m) ? num(unidades, 0) * CUBOS_HEX / num(m.grade.tam, 1) : 0);
  const unidadesDeCubos = (m, cubos) => (temGrade(m) ? num(cubos, 0) * num(m.grade.tam, 0) / CUBOS_HEX : 0);

  /* ---------------- o terreno ----------------
     O custo de entrar num hexágono, do mais forte para o mais fraco: o custo próprio dele (o mestre mudou só ali), o
     da região que tem custo e cobre o centro dele, o do terreno dele, e os 5 cubos de um hexágono sem nada. */
  const terrenoDe = (m, id) => (ehObj(m) && Array.isArray(m.terrenos) && id ? m.terrenos.find(t => t.id === id) || null : null);
  // (a de cima é a desenhada por último; uma região de dentro de outra sem custo não usa o da de fora: regioesEm)
  function regiaoComCusto(m, x, y) { return regioesEm(m, x, y).find(o => o.custo != null) || null; }
  /* O terreno que o desenho à mão dá a cada hexágono ("q,r" → id): as pinceladas em ordem; o hexágono cujo centro
     cai dentro de uma pincelada (a até r da linha dela) fica com o terreno dela — a borracha tira. Guardado por mapa
     (toda mudança no mapa faz outro objeto, então o guardado nunca fica velho). */
  const pintadoDe = typeof WeakMap === 'function' ? new WeakMap() : null;
  const SEM_PINTURA = new Map();
  function terrenoPintado(m) {
    if (!temGrade(m) || !ehObj(m.pintura) || !Array.isArray(m.pintura.ops) || !m.pintura.ops.length) return SEM_PINTURA;
    if (pintadoDe && pintadoDe.has(m)) return pintadoDe.get(m);
    const out = new Map();
    for (const op of m.pintura.ops) if (ehObj(op) && Array.isArray(op.pts) && op.pts.length) pincelarHexes(m, op, out);
    if (pintadoDe) pintadoDe.set(m, out);
    return out;
  }
  function pincelarHexes(m, op, out) {
    const r = num(op.r, 0), pts = op.pts;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    x0 -= r; y0 -= r; x1 += r; y1 += r;
    // os hexágonos que podem ter o centro na caixa da pincelada (q e r variam em linha reta com x e y: os cantos bastam)
    const cs = [hexDe(m, x0, y0), hexDe(m, x1, y0), hexDe(m, x0, y1), hexDe(m, x1, y1)];
    const q0 = Math.min(...cs.map(h => h.q)) - 1, q1 = Math.max(...cs.map(h => h.q)) + 1;
    const r0 = Math.min(...cs.map(h => h.r)) - 1, r1 = Math.max(...cs.map(h => h.r)) + 1;
    if ((q1 - q0 + 1) * (r1 - r0 + 1) > 1e6) return;            // (hexágonos minúsculos sob uma pincelada do tamanho do mundo)
    for (let q = q0; q <= q1; q++) for (let rr = r0; rr <= r1; rr++) {
      const c = centroHex(m, q, rr);
      if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
      let dentro = pts.length === 1 && Math.hypot(c.x - pts[0][0], c.y - pts[0][1]) <= r;
      for (let i = 1; i < pts.length && !dentro; i++) dentro = distSegmento(c.x, c.y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) <= r;
      if (!dentro) continue;
      if (op.t) out.set(q + ',' + rr, op.t); else out.delete(q + ',' + rr);
    }
  }
  /* Tudo sobre um hexágono: o terreno, o custo e de onde ele vem ('hex', 'regiao', 'terreno' ou 'base'). O terreno é
     o que o mestre deu ao hexágono ('-' = nenhum, mesmo com o desenho por baixo), senão o do desenho à mão (desenho:
     true). */
  function hexInfoBase(m, q, r) {
    const k = q + ',' + r, v = ehObj(m) && ehObj(m.hexes) ? m.hexes[k] : undefined;
    const ex = typeof v === 'string' ? v : Array.isArray(v) ? v[0] : '', proprio = Array.isArray(v) && v[1] != null ? num(v[1], null) : null;
    const t = ex === '-' ? null : terrenoDe(m, ex || terrenoPintado(m).get(k) || ''), desenho = !ex && !!t;
    if (proprio != null) return { q, r, terreno: t, custo: proprio, de: 'hex', regiao: null, desenho };
    const c = centroHex(m, q, r), reg = regiaoComCusto(m, c.x, c.y);
    if (reg) return { q, r, terreno: t, custo: reg.custo, de: 'regiao', regiao: reg, desenho };
    if (t) return { q, r, terreno: t, custo: t.custo, de: 'terreno', regiao: null, desenho };
    return { q, r, terreno: null, custo: CUBOS_HEX, de: 'base', regiao: null, desenho };
  }
  /* (lote 7, parte 5a) Os eventos de hoje que cobrem o centro do hexágono somam o peso deles por cima de tudo (até do
     custo próprio): custo (o total), custoBase (sem os eventos), eventos (os ids), extra (os cubos dos eventos) e
     fechado (o id do evento que fecha a passagem ali, ou null). */
  function hexInfo(m, q, r) {
    const i = hexInfoBase(m, q, r);
    if (!eventosPesados(m).length) return i;
    const c = centroHex(m, q, r), p = pesoNoPonto(m, c.x, c.y);
    if (!p.eventos.length) return i;
    return Object.assign(i, { custo: Math.round((i.custo + p.custo) * 10) / 10, custoBase: i.custo, extra: p.custo, eventos: p.eventos.map(e => e.id), fechado: p.fecha ? p.fecha.id : null });
  }
  const custoHex = (m, q, r) => hexInfo(m, q, r).custo;
  // Medir de um ponto a outro: hexágonos em linha reta, os cubos disso e quanto custa pelo terreno de cada um.
  function medirHex(m, a, b) {
    if (!temGrade(m)) return null;
    const p = xy(a), q = xy(b), ha = hexDe(m, p.x, p.y), hb = hexDe(m, q.x, q.y), linha = linhaHex(ha, hb);
    let terreno = 0;
    for (let i = 1; i < linha.length; i++) terreno += custoHex(m, linha[i].q, linha[i].r);
    return { hexes: linha.length - 1, cubos: (linha.length - 1) * CUBOS_HEX, terreno: arred(terreno), linha };
  }

  /* ---------------- viagem ---------------- */
  const n1 = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const plHex = n => (n === 1 ? '1 hexágono' : n + ' hexágonos');
  // o custo acumulado até cada hexágono do caminho (o primeiro é de onde se sai: 0)
  function custosDoCaminho(m, cam) {
    const acum = [0];
    for (let i = 1; i < cam.length; i++) acum.push(acum[i - 1] + custoHex(m, cam[i].q, cam[i].r));
    return acum;
  }
  // A rota de quem anda (um grupo, ou um evento que anda: lote 7, parte 5b) em hexágonos: o caminho, o custo acumulado e
  // o total (null sem rota ou sem grade). O caminho é o do sentido de agora: indo e voltando, na volta é a rota ao
  // contrário; em circuito, a rota fechada (do último ponto de volta ao primeiro).
  function ptsDaRota(rota, o) {
    const pts = rota.pts;
    if (ehObj(o) && o.modo === 'circuito') { const a = pts[0], b = pts[pts.length - 1]; return a[0] === b[0] && a[1] === b[1] ? pts : pts.concat([a]); }
    // (na volta: indo e voltando, ou — lote 9 — "Voltar pela mesma rota" de quem só ia)
    if (ehObj(o) && o.modo !== 'circuito' && o.sentido === -1) return pts.slice().reverse();
    return pts;
  }
  function viagem(mapa, g) {
    const rota = g && g.rota ? objDe(mapa, g.rota, 't') : null;
    if (!rota || !Array.isArray(rota.pts) || rota.pts.length < 2 || !temGrade(mapa)) return null;
    const cam = caminhoHex(mapa, ptsDaRota(rota, g)), acum = custosDoCaminho(mapa, cam);
    return { rota, cam, acum, total: acum[acum.length - 1] };
  }
  /* Em que hexágono do caminho o grupo está: o dele, se o caminho passa por ali (passando mais de uma vez, o que bate
     com o que ele já andou); fora do caminho, o mais perto — e a distância até ele, em hexágonos. */
  function ondeNoCaminho(mapa, g, v) {
    const aqui = hexDe(mapa, g.x, g.y), prog = num(g.prog, 0);
    let i = -1, melhor = Infinity, k0 = 0, d0 = Infinity;
    v.cam.forEach((h, k) => {
      const d = distHex(h, aqui);
      if (d === 0 && Math.abs(v.acum[k] - prog) < melhor) { melhor = Math.abs(v.acum[k] - prog); i = k; }
      if (d < d0) { d0 = d; k0 = k; }
    });
    return i >= 0 ? { i, longe: 0 } : { i: k0, longe: d0 };
  }
  /* ---------------- a marcha, em tempos (lote 6) ----------------
     O grupo anda pela rota de hexágono em hexágono: tem os cubos de um tempo (pt) por tempo de marcha e gasta, para
     entrar em cada hexágono, o custo do terreno de lá. O que sobra rumo ao próximo (que custa mais do que sobrou) fica
     guardado no andado (prog, em cubos): atravessar uma montanha de 20 cubos andando 10 por tempo leva dois tempos — as
     "bolinhas" do grupo. Nada aqui muda o mapa: as funções devolvem onde o grupo fica, e quem chama aplica (e passa o
     tempo, se for o caso) com App.mudar. */
  const tpdDe = cal => inteiro(ehObj(cal) ? cal.tpd : null, TEMPOS_DIA, 1, MAX_TEMPOS);
  // os cubos de um tempo de marcha do grupo (um grupo de antes só tinha os cubos por dia)
  const passoDe = (g, tpd) => { const n = num(g && g.pt, NaN); return Number.isFinite(n) && n > 0 ? n : num(g && g.cubos, CUBOS_DIA) / (tpd || TEMPOS_DIA); };
  // Passar n tempos de marcha no calendário: a cada tpd tempos, um dia. → { dia, tempo, dias (quantos dias passaram) }
  function passarTempos(cal, n) {
    const tpd = tpdDe(cal), t0 = inteiro(ehObj(cal) ? cal.tempo : 0, 0, 0, tpd - 1), dia0 = inteiro(ehObj(cal) ? cal.dia : 0, 0, 0, 1e9);
    const tot = t0 + Math.max(0, Math.floor(num(n, 0))), dias = Math.floor(tot / tpd);
    return { dia: dia0 + dias, tempo: tot % tpd, dias };
  }
  /* (lote 7, parte 5b) Quem anda pelo mapa: os grupos e os eventos com rota. O estado de quem anda: onde está, o andado
     no sentido de agora (prog), o sentido (na volta, −1) e a espera numa parada (em tempos de marcha). */
  const objQueAnda = (mapa, id) => { const o = objDe(mapa, id); return o && (o.k === 'g' || o.k === 'e') ? o : null; };
  const estadoDe = o => ({ x: o.x, y: o.y, prog: num(o.prog, 0), sentido: o.sentido === -1 ? -1 : 1, espera: inteiro(o.espera, 0, 0, 1e9) });
  // os tempos de uma parada (marcada em tempos ou em dias)
  const temposDaParada = (p, tpd) => inteiro(p && p.n, 1, 0, 1e6) * (p && p.u === 'd' ? tpd : 1);
  /* Onde o grupo está na rota, conferido com o lugar dele: o hexágono do caminho (i), o andado de verdade (antes) e o
     resto. Fora da rota (mais de um hexágono longe), não anda. (est: um estado no lugar do que está no mapa.) */
  function naRota(mapa, grupoId, est) {
    const g0 = objQueAnda(mapa, grupoId);
    if (!g0) return { erro: 'Grupo não encontrado' };
    const g = est ? Object.assign({}, g0, est) : g0;
    const rota = g.rota ? objDe(mapa, g.rota, 't') : null;
    if (!rota || !Array.isArray(rota.pts) || rota.pts.length < 2) return { g, erro: 'Sem rota' };
    if (!temGrade(mapa)) return { g, erro: 'Defina a grade de hexágonos do mapa primeiro (aba Terreno)' };
    const v = viagem(mapa, g), onde = ondeNoCaminho(mapa, g, v);
    // longe da rota não anda (seria um salto pelo mapa); no hexágono vizinho dela, segue do mais perto
    if (onde.longe > 1) return { g, v, erro: (g.k === 'e' ? 'O evento' : 'O grupo') + ' está fora da rota (a ' + plHex(onde.longe) + ' dela). Arraste-o para a rota ou use "Pôr no começo da rota"' };
    const i = onde.i, ult = v.cam.length - 1;
    // o que já tinha andado rumo ao próximo hexágono (num tempo que não deu para entrar nele) continua valendo
    const sobra = onde.longe || i >= ult ? 0 : limitar(num(g.prog, 0) - v.acum[i], 0, Math.max(0, v.acum[i + 1] - v.acum[i] - 1e-6));
    return { g, v, i, ult, antes: v.acum[i] + sobra, sobra };
  }
  // o grupo levado até o andado `prog` da rota: o hexágono onde ele fica (o último em que já entrou)
  function noAndado(mapa, v, prog) {
    const p = limitar(num(prog, 0), 0, v.total), ult = v.cam.length - 1;
    let j = 0;
    while (j < ult && v.acum[j + 1] <= p + 1e-9) j++;
    const c = centroHex(mapa, v.cam[j].q, v.cam[j].r);
    return { j, x: arred(c.x), y: arred(c.y), prog: arred(p), chegou: j === ult };
  }
  // (lote 7, parte 5b) a parada marcada num hexágono do caminho (a primeira, se houver duas no mesmo), com o número dela
  function paradaNoHex(mapa, g, h) {
    const ps = Array.isArray(g.paradas) ? g.paradas : [];
    for (let k = 0; k < ps.length; k++) { const p = ps[k], ph = hexDe(mapa, p.x, p.y); if (ph && ph.q === h.q && ph.r === h.r) return { p, k }; }
    return null;
  }
  // o nome de uma parada: o que o mestre deu, senão o do marcador do hexágono dela, senão "a parada 2"
  function nomeDaParada(mapa, p, k) {
    const nome = texto(p && p.nome).trim();
    if (nome) return nome;
    const h = hexDe(mapa, p.x, p.y), m = h && Array.isArray(mapa.objs) ? mapa.objs.find(o => o.k === 'm' && texto(o.nome).trim() && (ph => ph && ph.q === h.q && ph.r === h.r)(hexDe(mapa, o.x, o.y))) : null;
    return m ? texto(m.nome).trim() : 'a parada ' + (k + 1);
  }
  const MAX_PERNAS = 8;                           // quantas vezes uma marcha pode virar (ou recomeçar) no fim da rota
  /* Andar `cubos` pela rota. (lote 7, parte 5b) No fim do caminho: só ida, para; indo e voltando, vira e segue no outro
     sentido com o que sobrou; em circuito, recomeça. Ao entrar no hexágono de uma parada, fica ali (o resto se perde) e
     a espera começa (espera: os tempos da parada). pass: os hexágonos por onde passou ("q,r"), para os encontros. */
  function marchar(mapa, grupoId, cubos, est0, opc) {
    const o = objQueAnda(mapa, grupoId), est = est0 || (o ? estadoDe(o) : null), modo = o ? o.modo || 'ida' : 'ida';
    const base = { ok: false, cubos: 0, hexes: 0, x: est ? est.x : null, y: est ? est.y : null, prog: est ? est.prog : 0, chegou: false };
    const r0 = naRota(mapa, grupoId, est0);
    if (r0.erro) return Object.assign(base, { msg: r0.erro });
    const tpd = tpdDe(mapa.cal), h0 = hexDe(mapa, est.x, est.y), pass = h0 ? [chaveHex(h0)] : [];
    const cur = { x: est.x, y: est.y, prog: est.prog, sentido: est.sentido, espera: est.espera };
    let resto = Math.max(0, num(cubos, 0)), gasto = 0, hexes = 0, voltas = 0, parou = null, parada = null, chegou = false, ultimo = null, msgFim = null, noDescanso = false;
    const paraEm = opc && opc.paraEm instanceof Set && opc.paraEm.size ? opc.paraEm : null;     // (lote 9) os pontos de descanso
    for (let perna = 0; perna < MAX_PERNAS; perna++) {
      const r = perna ? naRota(mapa, grupoId, cur) : r0;
      if (r.erro) break;
      const { v, i, ult, antes } = r;
      if (i >= ult) {
        const anda = resto > 1e-9 && ult > 0;
        if (anda && modo === 'volta') { cur.sentido = -cur.sentido; cur.prog = 0; voltas++; continue; }
        if (anda && modo === 'circuito') { cur.prog = 0; voltas++; continue; }
        const c = centroHex(mapa, v.cam[ult].q, v.cam[ult].r);
        Object.assign(cur, { x: arred(c.x), y: arred(c.y), prog: arred(v.total) });
        chegou = modo === 'ida';
        if (!perna) msgFim = 'Chegou ao fim da rota';
        break;
      }
      // (lote 7, parte 5a) um evento que fecha a passagem: o grupo não entra no primeiro hexágono fechado do caminho —
      // para no de antes, sem guardar andado rumo a ele
      let lim = ult, fechou = null;
      if (eventosPesados(mapa).length) for (let k = i + 1; k <= ult; k++) { const f = hexInfo(mapa, v.cam[k].q, v.cam[k].r).fechado; if (f) { lim = k - 1; fechou = objDe(mapa, f, 'e'); break; } }
      // (lote 7, parte 5b) a primeira parada do caminho, até onde dá para ir
      let kPar = -1, par = null;
      if (Array.isArray(o.paradas) && o.paradas.length) for (let k = i + 1; k <= lim; k++) { const pp = paradaNoHex(mapa, o, v.cam[k]); if (pp) { kPar = k; par = pp; break; } }
      // (lote 9) indo dormir: o primeiro ponto de descanso do caminho
      let kDes = -1;
      if (paraEm) for (let k = i + 1; k <= lim; k++) if (paraEm.has(chaveHex(v.cam[k]))) { kDes = k; break; }
      if (fechou && lim <= i) {
        const n0 = noAndado(mapa, v, v.acum[i]);
        Object.assign(cur, { x: n0.x, y: n0.y, prog: n0.prog });
        parou = { id: fechou.id, nome: nomeEvento(fechou) };
        break;
      }
      const kAlvo = Math.min(kPar >= 0 ? kPar : lim, kDes >= 0 ? kDes : lim);
      const n = noAndado(mapa, v, Math.min(v.acum[kAlvo], antes + resto)), j = n.j, anda = j - i;
      for (let k = i + 1; k <= j; k++) pass.push(chaveHex(v.cam[k]));
      gasto += n.prog - antes; resto -= n.prog - antes; hexes += anda;
      Object.assign(cur, { x: n.x, y: n.y, prog: n.prog });
      ultimo = { v, j, ult, n };
      if (kPar >= 0 && j >= kPar) { parada = { k: par.k, nome: nomeDaParada(mapa, par.p, par.k), t: temposDaParada(par.p, tpd) }; cur.espera = parada.t; break; }
      if (kDes >= 0 && j >= kDes) { noDescanso = true; break; }
      if (fechou && j >= lim) { parou = { id: fechou.id, nome: nomeEvento(fechou) }; break; }
      if (j >= ult && modo !== 'ida' && resto > 1e-9) continue;          // vira (ou recomeça) na próxima perna
      chegou = j >= ult && modo === 'ida';
      break;
    }
    if (msgFim && !voltas) return Object.assign(base, { x: cur.x, y: cur.y, prog: cur.prog, chegou: true, msg: msgFim }, cur.sentido === -1 ? { sentido: -1 } : {});
    // a mensagem: a de antes, quando só andou (ou parou na passagem fechada); as voltas e as paradas, acrescentadas
    let msg;
    if (hexes > 0) {
      msg = 'Andou ' + plHex(hexes) + ' (' + n1(gasto) + ' cubos)';
      if (voltas) msg += modo === 'volta' ? ' e virou no fim da rota' : ' e recomeçou a rota';
      if (parada) msg += ' e parou em "' + parada.nome + '" por ' + (parada.t === 1 ? '1 tempo' : parada.t + ' tempos');
      else if (parou) msg += ' e parou: "' + parou.nome + '" fecha a passagem';
      else if (chegou) msg += ' e chegou ao fim da rota';
      else if (ultimo && modo === 'ida') msg += '; faltam ' + plHex(ultimo.ult - ultimo.j) + ' (' + n1(ultimo.v.total - ultimo.n.prog) + ' cubos)';
    } else if (parou) msg = 'Parou: "' + parou.nome + '" fecha a passagem';
    else if (ultimo && ultimo.j < ultimo.ult) {
      const { v, j, n } = ultimo, prox = hexInfo(mapa, v.cam[j + 1].q, v.cam[j + 1].r);
      msg = 'Ainda no caminho do próximo hexágono' + (prox.terreno ? ' (' + (prox.terreno.nome || 'terreno') + ')' : '') + ': ' + n1(n.prog - v.acum[j]) + ' de ' + n1(v.acum[j + 1] - v.acum[j]) + ' cubos';
    } else msg = voltas ? (modo === 'volta' ? 'Virou no fim da rota' : 'Recomeçou a rota') : 'Não saiu do lugar';
    const out = { ok: true, cubos: arred(gasto), hexes, x: cur.x, y: cur.y, prog: cur.prog, chegou, msg, pass };
    if (parou) out.parou = parou;
    if (parada) out.parada = parada;
    if (noDescanso) out.descanso = true;
    if (modo === 'volta' || cur.sentido === -1) out.sentido = cur.sentido;
    if (cur.espera) out.espera = cur.espera;
    if (voltas) out.voltas = voltas;
    return out;
  }
  /* n tempos de marcha pela rota (os cubos de um tempo do grupo, n vezes). (lote 7, parte 5b) Com paradas (ou parado
     numa), tempo a tempo: a espera desconta um tempo por vez e, acabada, o grupo segue no tempo seguinte. */
  /* (lote 9) O descanso do grupo: a janela de tempos do dia em que ele não anda (g.desc = { de, ate }, do 1º ao último
     tempo; pode virar a noite: de 9 a 2). → a janela no dia de agora ({ de, ate, n: quantos tempos }) ou null */
  function janelaDeDescanso(g, tpd) {
    const d = ehObj(g) && ehObj(g.desc) ? g.desc : null, t = Math.max(1, Math.floor(num(tpd, TEMPOS_DIA)));
    if (!d) return null;
    const de = limitar(inteiro(d.de, 1, 1, MAX_TEMPOS), 1, t), ate = limitar(inteiro(d.ate, de, 1, MAX_TEMPOS), 1, t);
    return { de, ate, n: de <= ate ? ate - de + 1 : t - de + 1 + ate };
  }
  // o tempo t (1º, 2º… do dia) está no descanso? → quantos tempos do descanso já passaram antes dele (0…), ou -1
  function noDescanso(j, t, tpd) {
    if (!j) return -1;
    if (j.de <= j.ate) return t >= j.de && t <= j.ate ? t - j.de : -1;
    return t >= j.de ? t - j.de : t <= j.ate ? tpd - j.de + t : -1;
  }
  // descansando agora (o próximo tempo de marcha cai no descanso)?
  function descansandoAgora(mapa, g) {
    const tpd = tpdDe(ehObj(mapa) ? mapa.cal : null), t = inteiro(ehObj(mapa) && ehObj(mapa.cal) ? mapa.cal.tempo : 0, 0, 0, tpd - 1) + 1;
    return noDescanso(janelaDeDescanso(g, tpd), t, tpd) >= 0;
  }
  /* os pontos de descanso: os marcadores marcados (valem para todos os grupos do mundo) e os do próprio grupo (g.pdesc)
     → as chaves dos hexágonos */
  function pontosDeDescanso(mapa, g) {
    const out = new Set();
    if (!temGrade(mapa)) return out;
    for (const o of mapa.objs || []) if (o.k === 'm' && o.desc) { const h = hexDe(mapa, o.x, o.y); if (h) out.add(chaveHex(h)); }
    for (const p of (ehObj(g) && Array.isArray(g.pdesc) ? g.pdesc : [])) { const h = hexDe(mapa, p.x, p.y); if (h) out.add(chaveHex(h)); }
    return out;
  }
  // o nome de um ponto de descanso (o do marcador do hexágono, se houver)
  function nomeDoDescanso(mapa, x, y) {
    const h = hexDe(mapa, x, y), m = h ? (mapa.objs || []).find(o => o.k === 'm' && (ph => ph && ph.q === h.q && ph.r === h.r)(hexDe(mapa, o.x, o.y)) && (o.desc || texto(o.nome).trim())) : null;
    return m && texto(m.nome).trim() ? texto(m.nome).trim() : 'o ponto de descanso';
  }
  /* dá para chegar a um ponto de descanso andando no máximo `tempos` tempos (parando ao entrar nele)? → o nome dele, ou null */
  function chegaAoDescanso(mapa, grupoId, est, tempos, pt, paraEm) {
    let e = Object.assign({}, est);
    for (let k = 0; k < tempos; k++) {
      const r = marchar(mapa, grupoId, pt, e, { paraEm });
      if (!r.ok) return null;
      if (r.descanso) return nomeDoDescanso(mapa, r.x, r.y);
      if (r.chegou || r.parada || r.parou || !(r.hexes > 0 || r.cubos > 0)) return null;
      e = { x: r.x, y: r.y, prog: r.prog, sentido: r.sentido || e.sentido, espera: 0 };
    }
    return null;
  }
  /* n tempos de marcha pela rota (os cubos de um tempo do grupo, n vezes). (lote 7, parte 5b) Com paradas (ou parado
     numa), tempo a tempo: a espera desconta um tempo por vez e, acabada, o grupo segue no tempo seguinte.
     (lote 9) O descanso: nos tempos da janela do grupo ele não anda (a espera de uma parada também passa). O grupo do
     mundo (caravana, patrulha, exército) dorme num ponto de descanso: em cada tempo da janela, se ainda dá para chegar a
     um andando até a metade do descanso (para dormir pelo menos a outra metade), segue até lá; senão, acampa onde está
     (a conta é a mesma tempo a tempo e de uma vez: quem acampou não sai, porque parado não chega mais perto). O
     grupo dos jogadores só para. Os tempos são contados a partir do tempo de agora do mapa (cal.tempo). */
  function andarTempos(mapa, grupoId, n) {
    const g = objQueAnda(mapa, grupoId), N_ = Math.max(0, Math.floor(num(n, 1)));
    if (!g) return marchar(mapa, grupoId, 0);
    const tpd = tpdDe(mapa && mapa.cal), pt = passoDe(g, tpd), jan = g.k === 'g' ? janelaDeDescanso(g, tpd) : null;
    if (!(Array.isArray(g.paradas) && g.paradas.length) && !(g.espera > 0) && !jan) return marchar(mapa, grupoId, pt * N_);
    const t0 = inteiro(mapa && ehObj(mapa.cal) ? mapa.cal.tempo : 0, 0, 0, tpd - 1);
    const paraEm = jan && g.tipo ? pontosDeDescanso(mapa, g) : null;
    let est = estadoDe(g), r = null, cubos = 0, hexes = 0, esperou = 0, parada = null, parou = null, voltas = 0, chegou = false, msg = '';
    let descansou = 0, foiDormir = null, rumo = null;
    const pass = [];
    for (let k = 0; k < N_; k++) {
      const t = (t0 + k) % tpd + 1, pos = noDescanso(jan, t, tpd);
      if (pos >= 0) {
        // indo dormir: o grupo do mundo segue até o ponto de descanso, se ainda chega com metade do descanso pela frente
        const aqui = hexDe(mapa, est.x, est.y), noPonto = !!(paraEm && aqui && paraEm.has(chaveHex(aqui)));
        const resta = Math.floor(jan.n / 2) - pos;
        const alvo = paraEm && paraEm.size && !noPonto && !(est.espera > 0) && resta > 0 ? chegaAoDescanso(mapa, grupoId, est, resta, pt, paraEm) : null;
        if (alvo) {
          r = marchar(mapa, grupoId, pt, est, { paraEm });
          if (r.ok) {
            cubos += r.cubos; hexes += r.hexes; pass.push(...(pass.length ? r.pass.slice(1) : r.pass));
            est = { x: r.x, y: r.y, prog: r.prog, sentido: r.sentido || est.sentido, espera: 0 };
            if (r.descanso) foiDormir = nomeDoDescanso(mapa, est.x, est.y); else rumo = alvo;
            continue;
          }
        }
        if (est.espera > 0) est.espera--;
        descansou++;
        continue;
      }
      if (est.espera > 0) { est.espera--; esperou++; continue; }
      r = marchar(mapa, grupoId, pt, est);
      if (!r.ok) { if (!cubos && !esperou && !hexes && !descansou) return r; chegou = !!r.chegou; break; }
      cubos += r.cubos; hexes += r.hexes; voltas += r.voltas || 0; pass.push(...(pass.length ? r.pass.slice(1) : r.pass));
      est = { x: r.x, y: r.y, prog: r.prog, sentido: r.sentido || est.sentido, espera: r.espera || 0 };
      if (r.parada) parada = r.parada;
      if (r.parou) parou = r.parou;
      chegou = !!r.chegou;
      if (chegou) break;
    }
    // a mensagem: quanto andou, a parada (onde está parado agora, ou por onde passou), as voltas e o fim
    const nomeEm = (x, y) => { const h = hexDe(mapa, x, y), pp = h ? paradaNoHex(mapa, g, h) : null; return pp ? nomeDaParada(mapa, pp.p, pp.k) : 'a parada'; };
    const tempos = n => (n === 1 ? '1 tempo' : n + ' tempos'), falta = (est.espera === 1 ? 'falta ' : 'faltam ') + tempos(est.espera);
    // (lote 9) o descanso: descansando agora (o próximo tempo cai na janela), e onde dorme
    const tFim = (t0 + N_) % tpd + 1, dorme = noDescanso(jan, tFim, tpd) >= 0;
    const hFim = paraEm ? hexDe(mapa, est.x, est.y) : null, noPontoFim = !!(hFim && paraEm.has(chaveHex(hFim)));
    const ondeDorme = foiDormir ? ' em "' + foiDormir + '"' : noPontoFim ? ' em "' + nomeDoDescanso(mapa, est.x, est.y) + '"' : '';
    if (hexes > 0) {
      msg = 'Andou ' + plHex(hexes) + ' (' + n1(cubos) + ' cubos)';
      if (esperou && g.espera > 0) msg += ', depois de ' + tempos(esperou) + ' parado em "' + nomeEm(g.x, g.y) + '"';
      if (voltas) msg += g.modo === 'volta' ? ', virou no fim da rota' : ', recomeçou a rota';
      if (est.espera > 0 && !dorme) msg += ' e parou em "' + nomeEm(est.x, est.y) + '": ' + falta;
      else if (parada) msg += ', com a parada em "' + parada.nome + '"';
      if (!(est.espera > 0)) msg += parou ? ' e parou: "' + parou.nome + '" fecha a passagem' : chegou ? ' e chegou ao fim da rota' : '';
      if (descansou || foiDormir) msg += foiDormir ? ' e foi dormir' + ondeDorme : dorme ? ' e parou para descansar' : ' (e descansou ' + tempos(descansou) + ')';
      else if (rumo) msg += ', a caminho de "' + rumo + '" para dormir';
    } else if (descansou) msg = dorme ? 'Descansando' + ondeDorme + ' (do ' + jan.de + 'º ao ' + jan.ate + 'º tempo)' : 'Descansou ' + tempos(descansou);
    else if (est.espera > 0) msg = 'Parado em "' + nomeEm(est.x, est.y) + '": ' + falta;
    else if (esperou) msg = 'Parado em "' + nomeEm(est.x, est.y) + '": segue no próximo tempo';
    else msg = r ? r.msg : 'Não saiu do lugar';
    const out = { ok: true, cubos: arred(cubos), hexes, x: est.x, y: est.y, prog: est.prog, chegou, msg, pass: pass.length ? pass : (h => (h ? [chaveHex(h)] : []))(hexDe(mapa, est.x, est.y)), espera: est.espera };
    if (g.modo === 'volta' || est.sentido === -1) out.sentido = est.sentido;
    if (parada) out.parada = parada;
    if (parou) out.parou = parou;
    if (voltas) out.voltas = voltas;
    if (esperou) out.esperou = esperou;
    if (descansou) out.descansou = descansou;
    if (foiDormir) out.dormiu = foiDormir;
    return out;
  }
  // um dia inteiro de marcha (todos os tempos do dia)
  function andarUmDia(mapa, grupoId) { return andarTempos(mapa, grupoId, tpdDe(ehObj(mapa) ? mapa.cal : null)); }
  /* (lote 7, parte 5b) Os campos de um grupo novo do tipo (caravana, patrulha, exército): a sigla, a cor, o passo de
     começo e escondido dos jogadores. O grupo comum (tipo '') não muda nada. */
  function camposDoTipo(tipo) {
    const t = TIPOS_GRUPO[tipo];
    return t ? { tipo, sigla: t.sigla, cor: t.cor, pt: t.pt, oculto: true } : {};
  }
  /* (lote 7, parte 5b) Traçar uma rota de um ponto a outro (de um marcador a outro) pelos hexágonos: o caminho mais
     barato pelo custo de entrar em cada hexágono (o terreno, a região, os eventos de hoje), mais barato ainda nas estradas
     (×0,4) e nas trilhas (×0,7) desenhadas no mapa, sem entrar onde um evento fecha a passagem, dentro do mapa.
     → { ok, pts: os cantos do caminho (os centros dos hexágonos onde ele muda de direção), hexes, custo (em cubos, sem
     o desconto das estradas), via: 'estrada' | 'trilha' (a que mais aparece no caminho; sem nenhuma, trilha), msg } */
  const VIZ = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const MAX_NOS = 200000;
  function tracarRota(mapa, de, para) {
    if (!temGrade(mapa)) return { ok: false, msg: 'Defina a grade de hexágonos do mapa primeiro (aba Terreno)' };
    const a = xy(de), b = xy(para), ha = hexDe(mapa, a.x, a.y), hb = hexDe(mapa, b.x, b.y);
    if (ha.q === hb.q && ha.r === hb.r) return { ok: false, msg: 'Os dois pontos ficam no mesmo hexágono' };
    const tam = num(mapa.grade.tam, 1), L = num(mapa.larg, 0), A = num(mapa.alt, 0);
    const noMapa = h => { const c = centroHex(mapa, h.q, h.r); return c.x >= -tam && c.y >= -tam && c.x <= L + tam && c.y <= A + tam; };
    const fator = new Map(), tipoVia = new Map();
    for (const o of mapa.objs) {
      if (o.k !== 'l' || (o.estilo !== 'estrada' && o.estilo !== 'trilha')) continue;
      const f = o.estilo === 'estrada' ? 0.4 : 0.7;
      for (const h of caminhoHex(mapa, o.pts)) { const k = chaveHex(h); if (!fator.has(k) || fator.get(k) > f) { fator.set(k, f); tipoVia.set(k, o.estilo); } }
    }
    const custoDe = new Map();
    const passo = h => {
      const k = chaveHex(h);
      if (custoDe.has(k)) return custoDe.get(k);
      const i = hexInfo(mapa, h.q, h.r), c = i.fechado ? Infinity : Math.max(0.01, num(i.custo, CUBOS_HEX)) * (fator.get(k) || 1);
      custoDe.set(k, c);
      return c;
    };
    // a menor parte de um passo, para a estimativa nunca passar do custo de verdade
    let menor = Infinity;
    for (const t of mapa.terrenos || []) menor = Math.min(menor, num(t.custo, CUBOS_HEX));
    menor = Math.max(0.01, Math.min(menor, CUBOS_HEX, ...mapa.objs.filter(o => o.k === 'r' && o.custo != null).map(o => o.custo)) * (fator.size ? 0.4 : 1));
    for (const [k] of fator) { const h = lerChaveHex(k); menor = Math.min(menor, Math.max(0.01, hexInfoBase(mapa, h.q, h.r).custo) * fator.get(k)); }
    // A*, com uma fila de prioridade (heap)
    const heap = [], push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const kA = chaveHex(ha), kB = chaveHex(hb), g = new Map([[kA, 0]]), veio = new Map(), feito = new Set();
    push(distHex(ha, hb) * menor, kA);
    let nos = 0, achou = false;
    while (heap.length) {
      const [, k] = pop();
      if (feito.has(k)) continue;
      if (k === kB) { achou = true; break; }
      feito.add(k);
      if (++nos > MAX_NOS) break;
      const h = lerChaveHex(k), gk = g.get(k);
      for (const [dq, dr] of VIZ) {
        const n = { q: h.q + dq, r: h.r + dr }, kn = chaveHex(n);
        if (feito.has(kn) || (kn !== kB && !noMapa(n))) continue;
        const c = passo(n);
        if (!Number.isFinite(c)) continue;
        const ng = gk + c;
        if (ng < (g.has(kn) ? g.get(kn) : Infinity)) { g.set(kn, ng); veio.set(kn, k); push(ng + distHex(n, hb) * menor, kn); }
      }
    }
    if (!achou) return { ok: false, msg: nos > MAX_NOS ? 'O mapa é grande demais para traçar este caminho' : 'Não há caminho: um evento fecha a passagem' };
    const cam = [hb];
    for (let k = kB; veio.has(k);) { k = veio.get(k); cam.push(lerChaveHex(k)); }
    cam.reverse();
    // os cantos: onde o caminho muda de direção (a linha reta da grade entre dois cantos passa pelos mesmos hexágonos)
    const pts = [], c0 = centroHex(mapa, cam[0].q, cam[0].r);
    pts.push([arred(c0.x), arred(c0.y)]);
    for (let i = 1; i < cam.length - 1; i++) {
      const d1 = [cam[i].q - cam[i - 1].q, cam[i].r - cam[i - 1].r], d2 = [cam[i + 1].q - cam[i].q, cam[i + 1].r - cam[i].r];
      if (d1[0] !== d2[0] || d1[1] !== d2[1]) { const c = centroHex(mapa, cam[i].q, cam[i].r); pts.push([arred(c.x), arred(c.y)]); }
    }
    const cn = centroHex(mapa, hb.q, hb.r);
    pts.push([arred(cn.x), arred(cn.y)]);
    let custo = 0, est = 0, tri = 0;
    for (let i = 1; i < cam.length; i++) { const k = chaveHex(cam[i]); custo += custoHex(mapa, cam[i].q, cam[i].r); if (tipoVia.get(k) === 'estrada') est++; else if (tipoVia.get(k) === 'trilha') tri++; }
    const hexes = cam.length - 1;
    return { ok: true, pts, cam, hexes, custo: arred(custo), via: est >= tri && est ? 'estrada' : 'trilha', naVia: est + tri, msg: plHex(hexes) + ' (' + n1(custo) + ' cubos)' + (est + tri ? ', ' + plHex(est + tri) + ' por estrada ou trilha' : '') };
  }
  /* (lote 7, parte 5b) Os encontros no caminho: um grupo do mundo (caravana, patrulha, exército) e um grupo comum que
     passaram a até 1 hexágono um do outro. pass: id → os hexágonos por onde cada um passou ("q,r"; quem não está ali, o
     lugar dele). → [[id do grupo do mundo, id do grupo comum]] */
  function encontrosNoCaminho(mapa, pass) {
    if (!temGrade(mapa)) return [];
    const grupos = mapa.objs.filter(o => o.k === 'g'), out = [];
    const hexesDe = g => (pass && Array.isArray(pass[g.id]) ? pass[g.id] : (h => (h ? [chaveHex(h)] : []))(hexDe(mapa, g.x, g.y))).map(lerChaveHex).filter(Boolean);
    const comuns = grupos.filter(g => !g.tipo).map(g => [g, hexesDe(g)]);
    for (const w of grupos.filter(g => g.tipo)) {
      const hw = hexesDe(w);
      for (const [c, hc] of comuns) if (hw.some(a => hc.some(b => distHex(a, b) <= 1))) out.push([w.id, c.id]);
    }
    return out;
  }
  /* Mexer no andado à mão, sem passar o tempo do mundo: delta em tempos de marcha (+1 anda um, −1 volta um), ou
     marcar a bolinha k do hexágono de agora (k tempos andados rumo a ele; a última leva o grupo para dentro dele). */
  function ajustarMarcha(mapa, grupoId, o) {
    const r = naRota(mapa, grupoId), g = r.g;
    if (r.erro) return { ok: false, msg: r.erro };
    const { v, i, ult, antes } = r, pt = passoDe(g, tpdDe(mapa.cal));
    let alvo;
    if (ehObj(o) && o.bolinha != null) {
      if (i >= ult) return { ok: false, msg: 'Chegou ao fim da rota' };
      alvo = v.acum[i] + Math.max(0, Math.floor(num(o.bolinha, 0))) * pt;
      if (alvo >= v.acum[i + 1] - 1e-9) alvo = v.acum[i + 1];
    } else alvo = antes + Math.trunc(num(ehObj(o) ? o.tempos : o, 0)) * pt;
    const n = noAndado(mapa, v, alvo);
    if (Math.abs(n.prog - num(g.prog, 0)) < 1e-9 && n.x === g.x && n.y === g.y) return { ok: false, msg: 'Nada mudou' };
    return { ok: true, x: n.x, y: n.y, prog: n.prog, chegou: n.chegou, msg: '' };
  }
  /* As bolinhas de progresso: quando o próximo hexágono da rota custa mais do que o grupo anda num tempo, quantos
     tempos a travessia pede (total) e quantos já foram andados (feitas). null: sem rota, no fim dela, fora dela, ou o
     próximo hexágono se atravessa num tempo só. */
  function bolinhas(mapa, g) {
    if (!ehObj(g) || !g.rota) return null;
    const r = naRota(mapa, g.id);
    if (r.erro || r.i >= r.ult) return null;
    const { v, i, sobra } = r, pt = passoDe(g, tpdDe(mapa.cal)), C = v.acum[i + 1] - v.acum[i];
    if (!(pt > 0) || C <= pt + 1e-9) return null;
    const total = Math.min(100000, Math.ceil(C / pt - 1e-9)), faltam = Math.ceil((C - sobra) / pt - 1e-9);
    const prox = hexInfo(mapa, v.cam[i + 1].q, v.cam[i + 1].r);
    return { total, feitas: limitar(total - faltam, 0, total - 1), terreno: prox.terreno ? prox.terreno.nome || '' : '' };
  }
  /* ---------------- regiões dentro de regiões (lote 6) ----------------
     Uma região pode ficar dentro de outra (pai: o Condado dentro do Reino). Sem facção, ela é da facção do pai (e do
     avô…). Para o encontro e o custo de viagem, vale a mais de dentro: o Condado sem custo não usa o do Reino. */
  function facDaRegiao(mapa, r) {
    let p = ehObj(r) ? r : null, n = 0;
    while (p && n <= MAX_NIVEL) { if (p.fac) return p.fac; p = p.pai ? objDe(mapa, p.pai, 'r') : null; n++; }
    return null;
  }
  /* (lote 12, parte 12b) quem controla a região: quem a ocupa, ou a dona (a facção dela ou a da região de fora). Na
     projeção, a ocupação de uma facção que os jogadores não veem fica sem a facção (null: a região é da dona, ocupada). */
  function controleDaRegiao(mapa, r) { const oc = ehObj(r) && ehObj(r.ocup) ? r.ocup : null; return oc && oc.fac ? oc.fac : facDaRegiao(mapa, r); }
  // (lote 12, parte 12b) a ocupação de uma região ou de um marcador: { fac (quem ocupa), d (o dia em que começou) }
  const normOcup = v => (ehObj(v) ? { fac: idRef(v.fac), d: inteiro(v.d, 0, -1e9, 1e9) } : null);
  // os ids dos pais, avós… de uma região
  function acimaDe(mapa, r) {
    const out = new Set();
    let p = ehObj(r) && r.pai ? objDe(mapa, r.pai, 'r') : null, n = 0;
    while (p && n <= MAX_NIVEL && !out.has(p.id)) { out.add(p.id); p = p.pai ? objDe(mapa, p.pai, 'r') : null; n++; }
    return out;
  }
  // As regiões com o ponto dentro, da de cima (desenhada por último) para a de baixo — sem as que só estão ali por
  // serem pai (ou avô…) de outra da lista: a de dentro vale.
  function regioesEm(mapa, x, y) {
    const objs = ehObj(mapa) && Array.isArray(mapa.objs) ? mapa.objs : [], todas = [];
    for (let i = objs.length - 1; i >= 0; i--) { const o = objs[i]; if (ehObj(o) && o.k === 'r' && dentroPoligono([x, y], o.pts)) todas.push(o); }
    if (todas.length < 2) return todas;
    const acima = new Set();
    for (const o of todas) for (const id of acimaDe(mapa, o)) acima.add(id);
    return todas.filter(o => !acima.has(o.id));
  }
  function regiaoEm(mapa, x, y) { return regioesEm(mapa, x, y)[0] || null; }
  /* Um número de 0 (inclusive) a 1 (exclusive), do gerador criptográfico do navegador — o mesmo dos dados do site.
     Sem ele (um ambiente de teste, um navegador muito antigo), vale o Math.random. */
  function sorteio() {
    const c = typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function' ? crypto : null;
    if (!c) return Math.random();
    const b = new Uint32Array(1);
    c.getRandomValues(b);
    return b[0] / 4294967296;
  }
  // extra: (lote 7, parte 5a) os pontos que os eventos de hoje somam (ou tiram) da chance da região, onde o grupo está
  function sortearEncontro(regiao, rng = sorteio, extra = 0) {
    const enc = ehObj(regiao) && ehObj(regiao.enc) ? regiao.enc : {};
    const chance = limitar(inteiro(enc.chance, 0, 0, 100) + Math.round(num(extra, 0)), 0, 100);
    const itens = (Array.isArray(enc.itens) ? enc.itens : []).filter(ehObj).map(it => ({ p: inteiro(it.p, 1, 1, 1e6), txt: texto(it.txt, '') }));
    const total = itens.reduce((s, it) => s + it.p, 0);
    const d100 = limitar(1 + Math.floor(num(rng(), 0) * 100), 1, 100);
    const houve = d100 <= chance;
    let item = null, peso = 0;
    if (houve && total > 0) {
      let s = num(rng(), 0) * total;
      for (const it of itens) { if (s < it.p) { item = it.txt; peso = it.p; break; } s -= it.p; }
      if (item === null) { const it = itens[itens.length - 1]; item = it.txt; peso = it.p; }
    }
    return { houve, d100, chance, base: inteiro(enc.chance, 0, 0, 100), extra: Math.round(num(extra, 0)), item, peso, total };
  }

  /* ---------------- névoa ---------------- */
  // As operações valem em ordem sobre "tudo coberto": a última que pega o ponto decide.
  function cobertoPor(ops, x, y) {
    for (let i = ops.length - 1; i >= 0; i--) {
      const o = ops[i], dx = x - o.x, dy = y - o.y;
      if (dx * dx + dy * dy <= o.r * o.r) return o.t === '-';
    }
    return true;
  }
  function nevoaCobre(mapa, x, y) {
    const n = ehObj(mapa) && ehObj(mapa.nevoa) ? mapa.nevoa : null;
    if (!n || n.on !== true) return false;
    const px = num(x, NaN), py = num(y, NaN);
    if (!Number.isFinite(px) || !Number.isFinite(py)) return true;
    return cobertoPor(Array.isArray(n.ops) ? n.ops.filter(ehObj) : [], px, py);
  }
  // O círculo que envolve dois círculos.
  function envolver(a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d + b.r <= a.r) return { t: a.t, x: a.x, y: a.y, r: a.r };
    if (d + a.r <= b.r) return { t: a.t, x: b.x, y: b.y, r: b.r };
    const r = (d + a.r + b.r) / 2, k = (r - a.r) / d;
    return { t: a.t, x: arred(a.x + (b.x - a.x) * k), y: arred(a.y + (b.y - a.y) * k), r: arred(r) };
  }
  /* Passou do limite. A regra de ouro: o que estava coberto continua coberto (nada escondido vaza para os jogadores).
     1) some quem uma operação posterior cobre por inteiro (não muda nada no desenho);
     2) as mais antigas, vizinhas e do mesmo tipo, se fundem num círculo. "Cobrir" pode fundir num círculo que envolve
        as duas (cobre a mais, nunca a menos; só quando ele não fica maior que as duas somadas). Duas revelações só se
        fundem quando uma já contém a outra: envolver as duas abriria área que estava coberta;
     3) em último caso, as mais antigas saem (o que elas abriam volta a ficar coberto — nunca o contrário). */
  function enxugarOps(ops) {
    if (ops.length > MAX_OPS && ops.length <= MAX_OPS * 3) ops = semCobrirNoComeco(semRedundantes(ops));
    if (ops.length > MAX_OPS) {
      let sobra = ops.length - MAX_OPS;
      const r = [];
      for (const o of ops) {
        const u = r[r.length - 1];
        if (sobra > 0 && u && u.t === o.t) {
          const e = envolver(u, o);
          const contem = (e.x === u.x && e.y === u.y && e.r === u.r) || (e.x === o.x && e.y === o.y && e.r === o.r);
          if (o.t === '-' ? e.r * e.r <= u.r * u.r + o.r * o.r : contem) { r[r.length - 1] = e; sobra--; continue; }
        }
        r.push(o);
      }
      ops = semCobrirNoComeco(r);
    }
    if (ops.length > MAX_OPS) ops = semCobrirNoComeco(ops.slice(ops.length - MAX_OPS));
    return ops;
  }
  /* Passo 1 sem comparar todas com todas (milhares de pinceladas travariam a página a cada traço): as operações
     posteriores ficam numa grade pelo centro, em células do tamanho dos raios comuns; as muito grandes ("revelar
     tudo", pincel com o zoom afastado) ficam numa lista à parte, curta. Só quem tem raio maior contém outra, e com
     os dois raios até o tamanho da célula os centros caem em células vizinhas. */
  function semRedundantes(ops) {
    const raios = ops.map(o => o.r).sort((a, b) => a - b);
    const T = Math.max(1, raios[Math.floor(raios.length * 0.9)] || 1);
    const grade = new Map(), grandes = [], fica = [];
    for (let i = ops.length - 1; i >= 0; i--) {
      const a = ops[i], contem = b => Math.hypot(b.x - a.x, b.y - a.y) + a.r <= b.r;
      const cx = Math.floor(a.x / T), cy = Math.floor(a.y / T);
      let coberta = grandes.some(contem);
      if (!coberta && a.r <= T) {
        for (let dx = -1; dx <= 1 && !coberta; dx++) for (let dy = -1; dy <= 1 && !coberta; dy++) {
          const l = grade.get((cx + dx) + ',' + (cy + dy));
          if (l) coberta = l.some(contem);
        }
      }
      if (coberta) continue;
      fica.push(a);
      if (a.r > T) grandes.push(a);
      else { const k = cx + ',' + cy; if (grade.has(k)) grade.get(k).push(a); else grade.set(k, [a]); }
    }
    return fica.reverse();
  }
  // Cobrir antes de qualquer revelação não muda nada (tudo começa coberto).
  function semCobrirNoComeco(ops) { let i = 0; while (i < ops.length && ops[i].t === '-') i++; return i ? ops.slice(i) : ops; }
  function normOps(v) {
    const ops = [];
    for (const o of Array.isArray(v) ? v : []) {
      if (!ehObj(o) || (o.t !== '+' && o.t !== '-')) continue;
      const x = coord(o.x), y = coord(o.y), r = num(o.r, NaN);
      if (x == null || y == null || !(r > 0)) continue;
      ops.push({ t: o.t, x, y, r: arred(Math.min(r, MAX_COORD * 4)) });
    }
    return enxugarOps(semCobrirNoComeco(ops));
  }

  /* ---------------- normalização ---------------- */
  function pontos(v, min) {
    if (!Array.isArray(v)) return min ? null : [];
    const r = [];
    for (const p of v) {
      if (r.length >= MAX_PTS) break;
      const q = Array.isArray(p) ? [coord(p[0]), coord(p[1])] : ehObj(p) ? [coord(p.x), coord(p.y)] : [null, null];
      if (q[0] != null && q[1] != null) r.push(q);
    }
    return r.length >= min ? r : null;
  }
  const sigla = v => { const s = Array.from(texto(v, '', 40).trim().toUpperCase()).slice(0, 3).join(''); return s || 'GR'; };
  // um custo em cubos (de 0,1 a 9999, com uma casa); vazio ou inválido = nenhum (null)
  const custoOuNada = v => { if (v == null || v === '') return null; const n = num(v, NaN); return Number.isFinite(n) && n > 0 ? Math.round(limitar(n, 0.1, MAX_CUSTO) * 10) / 10 : null; };
  /* (lote 7, parte 5a) o que um evento pesa na viagem: { custo (cubos a mais por hexágono, 0 a 999, uma casa), enc
     (pontos a mais ou a menos na chance de encontro, −100 a 100), fecha }; sem o campo (os eventos de antes da 5a, ou o
     mestre desligou), null: o evento não pesa. */
  function normPeso(v) {
    if (!ehObj(v)) return null;
    const c = num(v.custo, 0), e = num(v.enc, 0);
    return { custo: Number.isFinite(c) ? Math.round(limitar(c, 0, 999) * 10) / 10 : 0, enc: Number.isFinite(e) ? Math.round(limitar(e, -100, 100)) : 0, fecha: sim(v.fecha) };
  }
  // o peso de começo de um tipo de evento (uma cópia)
  const pesoPadrao = tipo => Object.assign({}, PESO_EVENTO[tipo] || PESO_EVENTO.guerra);
  // os cubos por dia de um grupo (um grupo de antes tinha o ritmo, em km por dia)
  const cubosDoDia = o => { const n = num(o.cubos, NaN); return Number.isFinite(n) && n > 0 ? Math.round(limitar(n, 1, MAX_CUSTO) * 10) / 10 : (tem(RITMO_ANTIGO, o.ritmo) ? RITMO_ANTIGO[o.ritmo] : CUBOS_DIA); };
  /* A grade. Um mapa de antes (sem grade, com a escala em km) ganha a grade que dá a mesma escala, com 1 km = 1 cubo,
     escondida: nada muda na tela de quem já tinha o mapa. */
  function normGrade(v, escalaAntiga) {
    const g = ehObj(v) ? v : null;
    let tam = g ? num(g.tam, 0) : 0;
    if (!g) { const k = ehObj(escalaAntiga) ? num(escalaAntiga.kmPorUn, 0) : 0; if (k > 0) tam = CUBOS_HEX / k; }
    return {
      tam: tam > 0 ? arred(limitar(tam, 4, 20000)) : 0,
      x: g ? coord(g.x) || 0 : 0, y: g ? coord(g.y) || 0 : 0,
      orient: g && g.orient === 'deitado' ? 'deitado' : 'pe',
      on: !!g && sim(g.on),
      alfa: g ? Math.round(limitar(num(g.alfa, 0.35), 0.05, 1) * 100) / 100 : 0.35,
      // (lote 6) o desenho do terreno em cada hexágono pintado (desligado: só a cor, como antes)
      des: !(g && (g.des === false || g.des === 0 || g.des === 'false')),
    };
  }
  // Os tipos de terreno. Sem a lista (mapa de antes), os padrões; uma lista vazia é a escolha do mestre.
  function normTerrenos(v) {
    if (!Array.isArray(v)) return copia(TERRENOS_PADRAO);
    const out = [], vistos = new Set();
    for (const t of v) {
      if (!ehObj(t) || out.length >= MAX_TER) continue;
      const id = idOk(t.id);
      if (!id || id.length > 12 || vistos.has(id)) continue;
      vistos.add(id);
      out.push({ id, nome: texto(t.nome, '', 40).trim() || 'Terreno', cor: cor(t.cor, '#9aa3b5'), custo: custoOuNada(t.custo) || CUBOS_HEX,
        tex: escolha(TEXTURAS, t.tex, TEX_PADRAO[id] || 'liso') });
    }
    return out;
  }
  /* O terreno de cada hexágono: "q,r" → id do terreno, ou [id, custo] quando o mestre mudou o custo ali (id '' = o
     do desenho à mão, se houver; '-' = nenhum terreno, mesmo com o desenho por baixo). Terreno que não existe mais
     some (o custo próprio fica); o que não diz nada sai. */
  function normHexes(v, terrenos) {
    const out = {};
    if (!ehObj(v)) return out;
    const ids = new Set(terrenos.map(t => t.id));
    let n = 0;
    for (const k of Object.keys(v)) {
      if (n >= MAX_HEX) break;
      const h = lerChaveHex(k);
      if (!h) continue;
      const x = v[k], tid = typeof x === 'string' ? x : Array.isArray(x) && typeof x[0] === 'string' ? x[0] : '';
      const t = tid === '-' || ids.has(tid) ? tid : '', c = Array.isArray(x) ? custoOuNada(x[1]) : null;
      if (!t && c == null) continue;
      out[chaveHex(h)] = c == null ? t : [t, c];
      n++;
    }
    return out;
  }
  /* O desenho à mão do terreno: pinceladas em ordem, cada uma com o terreno (ou '' = borracha), o raio e a linha (em
     pontos inteiros: são pixels da imagem). Pincelada de um terreno que não existe mais sai; borracha antes de
     qualquer tinta não apaga nada (sai também). alfa = a força do desenho por cima da imagem. */
  function normPintura(v, terrenos) {
    const p = ehObj(v) ? v : {}, ids = new Set(terrenos.map(t => t.id)), ops = [];
    let total = 0;
    for (const op of Array.isArray(p.ops) ? p.ops : []) {
      if (ops.length >= MAX_PINC) break;
      if (!ehObj(op) || !Array.isArray(op.pts)) continue;
      const t = op.t === '' ? '' : typeof op.t === 'string' && ids.has(op.t) ? op.t : null, r = num(op.r, NaN);
      if (t === null || !(r > 0) || (!t && !ops.length)) continue;
      const pts = [];
      for (const q of op.pts) {
        if (pts.length >= MAX_PTS) break;
        const x = Array.isArray(q) ? num(q[0], NaN) : NaN, y = Array.isArray(q) ? num(q[1], NaN) : NaN;
        if (Number.isFinite(x) && Number.isFinite(y)) pts.push([Math.round(limitar(x, -MAX_COORD, MAX_COORD)) + 0, Math.round(limitar(y, -MAX_COORD, MAX_COORD)) + 0]);
      }
      if (!pts.length) continue;
      if (total + pts.length > MAX_PONTOS_PINT) break;
      total += pts.length;
      ops.push({ t, r: arred(limitar(r, 0.5, MAX_COORD)), pts });
    }
    return { alfa: Math.round(limitar(num(p.alfa, 1), 0.1, 1) * 100) / 100, ops };
  }
  // As fases de uma zona de guerra: [{ dia, pts }], na ordem dos dias, um dia só uma vez (vale a que vem depois).
  // (lote 8, parte 6: a frente também tem fases — é uma linha, com dois pontos ou mais)
  function normFases(v, min) {
    const por = new Map();
    for (const f of Array.isArray(v) ? v : []) {
      if (!ehObj(f)) continue;
      const dia = inteiro(f.dia, null, 0, 1e9), pts = pontos(f.pts, min || 3);
      if (dia != null && pts) por.set(dia, pts);
    }
    return [...por.keys()].sort((a, b) => a - b).slice(0, MAX_FASES).map(dia => ({ dia, pts: por.get(dia) }));
  }
  const idRef = v => idOk(v) || null;
  const escolha = (cat, v, padrao) => (tem(cat, v) ? v : padrao);
  // Um objeto do mapa com todos os campos do tipo, na mesma ordem sempre (o JSON sai igual para a mesma entrada).
  // null = inválido (tipo desconhecido, sem posição, linha curta). leve = aceita linha ainda curta (objNovo).
  // o passo do grupo (cubos por tempo de marcha): o dele, ou o de antes (cubos por dia) dividido pelos tempos do dia
  const passoNorm = (o, tpd) => { const n = num(o.pt, NaN); return Math.round(limitar(Number.isFinite(n) && n > 0 ? n : cubosDoDia(o) / tpd, 0.1, MAX_CUSTO) * 100) / 100; };
  // as bolinhas de um grupo, como vão para os jogadores: [feitas, total]
  /* (lote 7, parte 5b) o jeito de andar (só quando não é o de sempre, para o mapa ficar curto): o que faz no fim da rota,
     o sentido (na volta), as paradas (o ponto, quanto tempo — em tempos ou dias — e o nome, opcional) e a espera */
  function normParadas(v) {
    return (Array.isArray(v) ? v : []).filter(ehObj).slice(0, MAX_PARADAS).map(p => {
      const x = coord(p.x), y = coord(p.y);
      if (x == null || y == null) return null;
      const out = { x, y, n: inteiro(p.n, 1, 1, 9999), u: p.u === 'd' ? 'd' : 't' };
      const nome = texto(p.nome, '', 80).trim();
      if (nome) out.nome = nome;
      return out;
    }).filter(Boolean);
  }
  /* (lote 7, parte 5c) o clima: a tabela (um mês por linha, só quando o mestre mudou; sem ela, a de começo), o de hoje
     escolhido à mão ({ d, k }) e, na projeção, o de hoje pronto (hoje). O ajuste de uma região: clima → nunca, menos,
     mais ou muito. */
  // (lote 9: e o trecho do dia — t, só depois do 1º —, para o clima que muda a cada N tempos)
  const normDiaK = v => {
    if (!(ehObj(v) && tem(CLIMAS, v.k) && Number.isFinite(num(v.d, NaN)))) return null;
    const out = { d: inteiro(v.d, 0, 0, 1e9), k: v.k }, t = inteiro(v.t, 0, 0, MAX_TEMPOS);
    if (t > 0) out.t = t;
    return out;
  };
  function normPesosClima(v) {
    if (!ehObj(v)) return null;
    const out = {};
    let soma = 0;
    for (const k of Object.keys(CLIMAS)) { out[k] = inteiro(v[k], 0, 0, 100); soma += out[k]; }
    return soma > 0 ? out : null;
  }
  function normClima(v, nMeses) {
    const c = ehObj(v) ? v : {}, out = {};
    if (Array.isArray(c.tab) && c.tab.length) out.tab = Array.from({ length: nMeses }, (_, i) => normPesosClima(c.tab[i]) || tabelaPadraoDoMes(i, nMeses));
    const mao = normDiaK(c.mao);
    if (mao) out.mao = mao;
    if (tem(CLIMAS, c.hoje)) out.hoje = c.hoje;
    // (lote 9) de quantos em quantos tempos o clima muda (sem ele, a cada 2; 0 = uma vez por dia)
    if (c.cada != null && c.cada !== '') { const n = inteiro(c.cada, CADA_CLIMA, 0, MAX_TEMPOS); if (n !== CADA_CLIMA) out.cada = n; }
    return out;
  }
  function normAjusteClima(v) {
    if (!ehObj(v)) return null;
    const out = {};
    for (const k of Object.keys(CLIMAS)) if (tem(AJUSTES_CLIMA, v[k])) out[k] = v[k];
    return Object.keys(out).length ? out : null;
  }
  function normEfZona(v, tipo) {
    const p = (ZONAS[tipo] || {}).ef || { fad: 0, conf: 0, san: 0 }, e = ehObj(v) ? v : p;
    return { fad: inteiro(e.fad, p.fad, -5, 5), conf: inteiro(e.conf, p.conf, -100, 100), san: inteiro(e.san, p.san, -100, 100) };
  }
  /* (lote 9) A missão marcada num objeto (marcador, grupo, região, evento): o "!" no ícone. t: o texto curto que o mestre
     escreveu; ref: o id de uma missão do grupo nas Fichas (o nome e a situação vêm de lá); ver: os jogadores veem (nasce
     só do mestre); ok: concluída à mão (o texto curto vira ✓ até o mestre tirar a missão). Na projeção (quem joga), a
     missão vem pronta: t (o nome) e e (a situação: ativa, feita ou falhou). → null se não tem nem texto nem ligação */
  const MIS_E = { ativa: 'Ativa', feita: 'Concluída', falhou: 'Falhou' };
  const COM_MISSAO = { m: 1, g: 1, r: 1, e: 1 };
  function normMis(v) {
    if (!ehObj(v)) return null;
    const t = texto(v.t, '', 120).trim(), ref = idRef(v.ref);
    if (!t && !ref) return null;
    const out = { t, ref };
    if (sim(v.ver)) out.ver = true;
    if (sim(v.ok)) out.ok = true;
    if (tem(MIS_E, v.e)) out.e = v.e;
    return out;
  }
  // a situação de uma missão do mapa: a da missão ligada nas Fichas (daFicha: { e }), a que veio pronta (projeção) ou a do
  // texto curto (concluída à mão: feita)
  function situacaoDaMissao(mis, daFicha) {
    if (!ehObj(mis)) return null;
    if (mis.ref && ehObj(daFicha)) return tem(MIS_E, daFicha.e) ? daFicha.e : 'ativa';
    if (tem(MIS_E, mis.e)) return mis.e;
    return mis.ok ? 'feita' : 'ativa';
  }
  function normAndar(o, out, comParadas) {
    if (o.modo === 'volta' || o.modo === 'circuito') out.modo = o.modo;
    // (na volta: indo e voltando, ou — lote 9 — "Voltar pela mesma rota" de quem só ia; o circuito não volta)
    if (out.modo !== 'circuito' && num(o.sentido, 1) < 0) out.sentido = -1;
    if (!comParadas) return out;
    const ps = normParadas(o.paradas);
    if (ps.length) out.paradas = ps;
    const esp = inteiro(o.espera, 0, 0, 1e6);
    if (esp > 0) out.espera = esp;
    // (lote 9) o descanso (a janela de tempos do dia em que não anda) e os pontos de descanso do grupo, na rota dele
    if (ehObj(o.desc)) { const de = inteiro(o.desc.de, null, 1, MAX_TEMPOS), ate = inteiro(o.desc.ate, null, 1, MAX_TEMPOS); if (de != null && ate != null) out.desc = { de, ate }; }
    const pd = (Array.isArray(o.pdesc) ? o.pdesc : []).filter(ehObj).slice(0, MAX_PARADAS).map(p => { const x = coord(p.x), y = coord(p.y); return x == null || y == null ? null : { x, y }; }).filter(Boolean);
    if (pd.length) out.pdesc = pd;
    return out;
  }
  const bolNorm = v => { if (!Array.isArray(v)) return null; const f = inteiro(v[0], -1, 0, 100000), t = inteiro(v[1], 0, 0, 100000); return t >= 2 && f >= 0 && f < t ? [f, t] : null; };
  function normObj(o, dia, leve, tpd) {
    if (!ehObj(o) || !tem(PREFIXO, o.k)) return null;
    const b = { id: idOk(o.id), k: o.k, nome: texto(o.nome), txt: texto(o.txt), nota: texto(o.nota), oculto: talvez(o.oculto) };
    if (COM_MISSAO[o.k]) { const mi = normMis(o.mis); if (mi) b.mis = mi; }         // (lote 9) a missão: o "!" no ícone
    const lugar = () => { const x = coord(o.x), y = coord(o.y); if (x == null || y == null) return false; b.x = x; b.y = y; return true; };
    switch (o.k) {
      case 'm': {
        if (!lugar()) return null;
        const mc = Object.assign(b, { ic: escolha(ICONES, o.ic, 'cidade'), cor: cor(o.cor, ''), rumor: sim(o.rumor), falso: sim(o.falso), liga: normLiga(o.liga) });
        if (sim(o.desc)) mc.desc = true;                          // (lote 9) ponto de descanso (os grupos do mundo dormem aqui)
        const estr = normEstr(o.estr);                            // (lote 8, parte 6) a fortificação: a DEF de quem defende ali
        if (estr) mc.estr = estr;
        const ass = normAss(o.ass);                               // (lote 10) o assentamento: o nível e a população
        if (ass) mc.ass = ass;
        const dt = normDentro(o.dentro);                          // (parte 6) na projeção: o que os jogadores veem dentro
        if (dt) mc.dentro = dt;
        const oc = normOcup(o.ocup);                              // (lote 12, parte 12b) ocupado por outra facção (a fortificação que caiu)
        if (oc) mc.ocup = oc;
        const ce = normCerco(o.cerco);                            // (lote 12, parte 12e) o cerco do lugar
        if (ce) mc.cerco = ce;
        return mc;
      }
      case 'g':
        if (!lugar()) return null;
        // (cubos: os por dia, para quem ainda tem o site de antes; quem vale é o pt, os cubos de um tempo de marcha)
        const t = inteiro(tpd, TEMPOS_DIA, 1, MAX_TEMPOS), pt = passoNorm(o, t);
        const g = Object.assign(b, { cor: cor(o.cor, '#e6ab4f'), sigla: sigla(o.sigla), pt, cubos: Math.round(limitar(pt * t, 0.1, MAX_CUSTO * MAX_TEMPOS) * 10) / 10, rota: idRef(o.rota), prog: arred(Math.max(0, num(o.prog, 0))),
          estilo: escolha(HONRA, o.estilo, ''), honra: inteiro(o.honra, 0, -MAX_HONRA, MAX_HONRA), hhist: normHonras(o.hhist), fac: idRef(o.fac) });
        const bol = bolNorm(o.bol);
        if (bol) g.bol = bol;
        if (tem(TIPOS_GRUPO, o.tipo)) g.tipo = o.tipo;           // (lote 7, parte 5b) caravana, patrulha, exército
        if (tem(CLIMAS, o.ch)) g.ch = o.ch;                       // (lote 7, parte 5c) na projeção: o clima de hoje onde ele está
        // (lote 8, parte 6) o exército: as unidades, o comandante, a moral e os mantimentos
        if (g.tipo === 'exercito') { const exe = normExe(o.exe); if (exe) g.exe = exe; }
        return normAndar(o, g, true);
      case 'r': {
        const pts = pontos(o.pts, leve ? 0 : 3);
        if (!pts) return null;
        const enc = ehObj(o.enc) ? o.enc : {};
        const itens = (Array.isArray(enc.itens) ? enc.itens : []).filter(ehObj).slice(0, 200).map(it => ({ p: inteiro(it.p, 1, 1, 1e6), txt: texto(it.txt) }));
        const r = Object.assign(b, { pts, fac: idRef(o.fac), cor: cor(o.cor, ''), custo: custoOuNada(o.custo), enc: { chance: inteiro(enc.chance, 0, 0, 100), itens }, pai: idRef(o.pai) });
        if (tem(ESTILOS_CENA, o.estilo)) r.estilo = o.estilo;          // (lote 7, parte 4b) o estilo das cenas geradas aqui
        // (lote 7, parte 5c) o clima: o ajuste da região, o de hoje escolhido à mão e (na projeção) o de hoje pronto
        const aj = normAjusteClima(o.clima), chj = normDiaK(o.chj);
        if (aj) r.clima = aj;
        if (chj) r.chj = chj;
        if (tem(CLIMAS, o.ch)) r.ch = o.ch;
        const prod = normTabProd(o.prod);                         // (lote 10) a produção que o mestre escreve, por semana
        if (Object.keys(prod).length) r.prod = prod;
        const oc = normOcup(o.ocup);                              // (lote 12, parte 12b) ocupada por outra facção
        if (oc) r.ocup = oc;
        return r;
      }
      case 'e': {
        if (!lugar()) return null;
        const ini = o.ini == null || o.ini === '' ? (dia == null ? null : dia) : inteiro(o.ini, dia == null ? 0 : dia, 0, 1e9);
        let fim = o.fim == null || o.fim === '' ? null : inteiro(o.fim, null, 0, 1e9);
        if (fim != null && ini != null && fim < ini) fim = ini;
        const ev = Object.assign(b, { tipo: escolha(EVENTOS, o.tipo, 'guerra'), r: arred(limitar(num(o.r, 80), 1, MAX_COORD)), ini, fim,
          cresce: arred(limitar(num(o.cresce, 0), -MAX_COORD, MAX_COORD)), forca: inteiro(o.forca, 1, 1, 3) });
        // (lote 7, parte 5a) o que ele pesa na viagem (só quando tem: os eventos de antes não pesam até o mestre ligar)
        const peso = normPeso(o.peso);
        if (peso) ev.peso = peso;
        // (lote 7, parte 5b) o evento que anda: o centro dele vai pela rota, com o tempo do mapa, enquanto acontece
        const rota = idRef(o.rota);
        if (rota) {
          const pt = num(o.pt, NaN);
          Object.assign(ev, { rota, prog: arred(Math.max(0, num(o.prog, 0))), pt: Number.isFinite(pt) && pt > 0 ? Math.round(limitar(pt, 0.1, MAX_CUSTO) * 10) / 10 : 2 });
          normAndar(o, ev, false);
        }
        return ev;
      }
      case 't': {
        const pts = pontos(o.pts, leve ? 0 : 2);
        if (!pts) return null;
        const t = Object.assign(b, { pts, via: escolha(VIAS, o.via, 'trilha') });
        if (sim(o.esc)) t.esc = true;           // (lote 7, parte 5b) escondida no mapa: só aparece, fina, ao selecionar
        return t;
      }
      case 'f': {
        const pts = pontos(o.pts, leve ? 0 : 2);
        if (!pts) return null;
        const fr = Object.assign(b, { pts, a: idRef(o.a), b: idRef(o.b), ativa: o.ativa === undefined ? true : sim(o.ativa) });
        // (lote 8, parte 6) a frente que anda: as fases (a partir de tal dia, tal linha), como a zona de guerra
        const fs = normFases(o.fases, 2);
        if (fs.length) fr.fases = fs;
        return fr;
      }
      case 'z': {
        const pts = pontos(o.pts, leve ? 0 : 3);
        if (!pts) return null;
        const ini = o.ini == null || o.ini === '' ? (dia == null ? null : dia) : inteiro(o.ini, dia == null ? 0 : dia, 0, 1e9);
        let fim = o.fim == null || o.fim === '' ? null : inteiro(o.fim, null, 0, 1e9);
        if (fim != null && ini != null && fim < ini) fim = ini;
        const z = Object.assign(b, { pts, a: idRef(o.a), b: idRef(o.b), ini, fim, fases: normFases(o.fases) });
        // (lote 7, parte 5c) a zona de perigo: o tipo e o que ela mexe (a zona de guerra continua sem tipo)
        // (sem os números, valem os de começo do tipo: efeitoDasZonas)
        if (tem(ZONAS, o.tipo) && o.tipo !== 'guerra') { z.tipo = o.tipo; if (ehObj(o.ef)) z.ef = normEfZona(o.ef, o.tipo); }
        return z;
      }
      case 'l': {
        const pts = pontos(o.pts, leve ? 0 : 2);
        if (!pts) return null;
        return Object.assign(b, { pts, estilo: escolha(LINHAS, o.estilo, 'rio'), larg: arred(limitar(num(o.larg, 10), 0.5, MAX_COORD)), cor: cor(o.cor, '') });
      }
      case 'c':
        if (!lugar()) return null;
        return Object.assign(b, { ic: escolha(CARIMBOS, o.ic, 'arvore'), tam: arred(limitar(num(o.tam, 40), 1, MAX_COORD)), cor: cor(o.cor, ''), vira: sim(o.vira) });
      case 'x':
        if (!lugar()) return null;
        return Object.assign(b, { fonte: escolha(FONTES, o.fonte, 'mapa'), tam: arred(limitar(num(o.tam, 28), 1, MAX_COORD)), cor: cor(o.cor, ''),
          rot: inteiro(o.rot, 0, -180, 180), esp: Math.round(limitar(num(o.esp, 0), 0, 1) * 100) / 100 });
    }
    return null;
  }
  function normCal(c) {
    c = ehObj(c) ? c : {};
    let meses = (Array.isArray(c.meses) ? c.meses : []).filter(ehObj).slice(0, 100)
      .map((m, i) => ({ nome: texto(m.nome).trim() || 'Mês ' + (i + 1), dias: diasDoMes(m) }));
    if (!meses.length) meses = copia(CAL_PADRAO.meses);
    const tpd = inteiro(c.tpd, TEMPOS_DIA, 1, MAX_TEMPOS);
    const sem0 = Number.isInteger(c.sem0) && c.sem0 >= 0 && c.sem0 <= 6 ? c.sem0 : null;
    const out = { dia: inteiro(c.dia, 0, 0, 1e9), ano0: inteiro(c.ano0, 1, -1e6, 1e6), era: texto(c.era), meses, tpd, tempo: inteiro(c.tempo, 0, 0, tpd - 1), sem0 };
    // (lote 7, parte 4b) quando escurece: o tempo em que começa o entardecer e o da noite (sem eles, os de fábrica)
    if (c.ent != null && c.ent !== '') out.ent = inteiro(c.ent, null, 1, MAX_TEMPOS + 1);
    if (c.noi != null && c.noi !== '') out.noi = inteiro(c.noi, null, 1, MAX_TEMPOS + 1);
    if (out.ent == null) delete out.ent;
    if (out.noi == null) delete out.noi;
    return out;
  }
  /* (lote 7, parte 4b) A hora de um tempo do dia, para as cenas: o entardecer começa no 8º tempo de 10 e a noite no
     9º (o mestre muda, no calendário do mapa). Um dia com menos de 4 tempos não tem entardecer nem noite de fábrica. */
  const entDe = tpd => (tpd >= 4 ? tpd - 2 : tpd + 1);
  const noiDe = tpd => (tpd >= 4 ? tpd - 1 : tpd + 1);
  function quandoEscurece(cal) {
    const tpd = tpdDe(cal), ent = ehObj(cal) && Number.isInteger(cal.ent) ? cal.ent : entDe(tpd), noi = ehObj(cal) && Number.isInteger(cal.noi) ? cal.noi : noiDe(tpd);
    return { ent, noi, padraoEnt: entDe(tpd), padraoNoi: noiDe(tpd) };
  }
  // 'dia', 'entardecer' ou 'noite', pelo tempo de agora (1º, 2º… do dia)
  function horaDoTempo(cal) {
    const tpd = tpdDe(cal), t = inteiro(ehObj(cal) ? cal.tempo : 0, 0, 0, tpd - 1) + 1, q = quandoEscurece(cal);
    return t >= q.noi ? 'noite' : t >= q.ent ? 'entardecer' : 'dia';
  }
  function normImg(v, larg, alt) {
    if (!ehObj(v) || typeof v.url !== 'string' || v.url.length > 2048 || !/^(https?:\/\/|idb:)/i.test(v.url)) return null;
    return { url: v.url, w: inteiro(v.w, inteiro(larg, 2000, 1, 100000), 1, 100000), h: inteiro(v.h, inteiro(alt, 1400, 1, 100000), 1, 100000) };
  }
  /* ---------------- (lote 8, parte 6) a guerra ----------------
     O exército (o grupo do tipo Exército): as unidades (o tipo, as tropas, o HP, o ATQ e a DEF, os magos, as máquinas
     de cerco e os equipamentos — lote 12, parte 12c: o HP é o de cada tropa, hpT, e o HP da unidade é a soma das tropas;
     fer = o que falta na tropa ferida, que conta como viva; cura = a % do HP que falta que a unidade, de médicos ou
     alquimistas, cura por dia no exército; parte 12d: maq = as máquinas de cerco, { tipo: quantas } — o número de
     antes, cerco, sai), o comandante (o bônus que o mestre escreve, e a ficha dele, se quiser), a moral (0 a 10;
     5 é firme) e os mantimentos (o estoque, o consumo por dia — sem número, pelo tamanho da tropa — e os dias sem eles).
     A fortificação dos marcadores (a DEF de quem defende ali e o HP: pode ser danificada). Os tipos de tropa (o mestre
     cria, com as vantagens de um contra o outro, na escala do d20), o histórico das batalhas e os hexágonos destruídos
     ou corrompidos. Os números são do mestre: na projeção, os jogadores recebem só os nomes. */
  const MAX_UNID = 40, MAX_EQUIP = 12, MAX_TIPOS_G = 40, MAX_BATS = 60, MAX_MOM = 12, MAX_NOTAS = 20, MAX_TROPAS = 1e7, MAX_ATR = 99, MAX_BONUS = 20, MAX_HP_TROPA = 1e6;
  const HEX_GUERRA = { d: 'Destruído', c: 'Corrompido' };
  const MOMENTOS = { ab: 'Abertura', ch: 'Choque', vi: 'Virada', de: 'Desfecho' };
  const FINS = { dados: 'Nos dados', recuo: 'Recuo', rendicao: 'Rendição', tregua: 'Trégua' };
  const atr = v => inteiro(v, 0, -MAX_ATR, MAX_ATR);
  function normEquip(v) {
    return (Array.isArray(v) ? v : []).filter(ehObj).slice(0, MAX_EQUIP).map(e => ({ nome: texto(e.nome, '', 80).trim() || 'Equipamento', atq: atr(e.atq), def: atr(e.def) }));
  }
  function normUnid(u, i, vistos) {
    // (lote 12, parte 12c) o HP de cada tropa (1 de começo; a unidade de antes, com o HP separado, começa inteira) e o
    // que falta na ferida (menos que o HP de uma tropa)
    const tropas = inteiro(u.tropas, 100, 0, MAX_TROPAS), hpT = inteiro(u.hpT, 1, 1, MAX_HP_TROPA);
    const out = { id: unico(idOk(u.id) || 'un_' + i, vistos), nome: texto(u.nome, '', 80).trim() || 'Unidade ' + (i + 1), tipo: idRef(u.tipo),
      tropas, hpT, fer: tropas > 0 ? inteiro(u.fer, 0, 0, hpT - 1) : 0, atq: atr(u.atq), def: atr(u.def), magos: inteiro(u.magos, 0, 0, MAX_TROPAS),
      cura: inteiro(u.cura, 0, 0, 100), maq: normTabMaq(u.maq), equip: normEquip(u.equip) };
    if (sim(u.oc)) out.oc = true;                                // escondida dos jogadores (até o nome)
    return out;
  }
  /* (lote 12, parte 12d) As máquinas de cerco: os tipos (o mestre muda; sem a lista, os de começo) — o dano contra
     estrutura (por máquina: no HP da fortificação, em cada dia de cerco e depois da batalha), o dano contra exército (na
     batalha, o bônus da Abertura; no cerco, o tiro de quem está dentro) e o acerto (o mínimo no d20 para o tiro acertar;
     null: não atira em tropas). A unidade e a fortificação levam { tipo: quantas }. */
  const MAX_MAQS = 40, MAX_MAQ_N = 1e4, MAX_DANO_MAQ = 1000;
  const RESERVA_PADRAO = 30, MILICIA_PADRAO = 100, MAX_RESERVA = 3650;   // (parte 12e) a reserva da cidade (dias) e a milícia
  const MAQUINAS_PADRAO = [{ id: 'ariete', nome: 'Aríete', est: 3, exe: 0, ac: null }, { id: 'catapulta', nome: 'Catapulta', est: 2, exe: 5, ac: 11 }, { id: 'trabuco', nome: 'Trabuco', est: 4, exe: 3, ac: 13 }];
  function normMaqs(v) {
    const out = [], vistos = new Set();
    for (const t of Array.isArray(v) ? v : []) {
      if (!ehObj(t) || out.length >= MAX_MAQS) continue;
      const id = idOk(t.id);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      out.push({ id, nome: texto(t.nome, '', 60).trim() || 'Máquina', est: inteiro(t.est, 0, 0, MAX_DANO_MAQ), exe: inteiro(t.exe, 0, 0, MAX_DANO_MAQ), ac: inteiro(t.ac, null, 1, 20) });
    }
    return out;
  }
  // as máquinas de uma unidade ou de uma fortificação: { tipo: quantas } (sem os zeros)
  function normTabMaq(v) {
    const out = {};
    for (const k of ehObj(v) ? Object.keys(v).slice(0, MAX_MAQS * 2) : []) { const n = inteiro(v[k], 0, 0, MAX_MAQ_N); if (idOk(k) && n) out[k] = n; }
    return out;
  }
  // os tipos de máquina que valem: os do mestre, ou os de começo
  const maquinasDe = mapa => (ehObj(mapa) && ehObj(mapa.guerra) && Array.isArray(mapa.guerra.maqs) ? mapa.guerra.maqs : MAQUINAS_PADRAO.map(t => Object.assign({}, t)));
  /* A soma das máquinas (a tabela { tipo: quantas }): { n (quantas), est (o dano contra estrutura), exe (o contra
     exército) }, pelos tipos do mapa (o tipo que não existe não conta) */
  function somaDasMaquinas(mapa, maq) {
    const ts = maquinasDe(mapa), out = { n: 0, est: 0, exe: 0 };
    for (const k of ehObj(maq) ? Object.keys(maq) : []) { const t = ts.find(x => x.id === k), n = Number(maq[k]) || 0; if (!t || !(n > 0)) continue; out.n += n; out.est += n * t.est; out.exe += n * t.exe; }
    return out;
  }
  /* (lote 12, parte 12c) O HP da unidade: { hp (a soma das tropas, menos o que falta na ferida), max (as vivas inteiras) } */
  function hpDaUnidade(u) {
    const t = ehObj(u) ? Math.max(0, Number(u.tropas) || 0) : 0, hpT = ehObj(u) ? Math.max(1, Number(u.hpT) || 1) : 1, fer = t > 0 ? Math.max(0, Number(u.fer) || 0) : 0;
    return { hp: Math.max(0, t * hpT - fer), max: t * hpT };
  }
  /* As tropas de uma unidade com um HP (a soma): as que morreram saem uma a uma; a ferida conta como viva.
     → { tropas, fer } */
  function tropasComHp(hpT, hp) {
    const t1 = Math.max(1, Number(hpT) || 1), h = Math.max(0, Math.round(Number(hp) || 0)), tropas = Math.ceil(h / t1);
    return { tropas, fer: tropas * t1 - h };
  }
  function normExe(v) {
    if (!ehObj(v)) return null;
    const cmd = ehObj(v.cmd) ? v.cmd : {}, vistos = new Set();
    const unid = (Array.isArray(v.unid) ? v.unid : []).filter(ehObj).slice(0, MAX_UNID);
    // (na projeção: só os nomes, sem os números)
    if (v.pub) return { pub: true, cmd: { nome: texto(cmd.nome, '', 80).trim() }, unid: unid.map((u, i) => ({ id: unico(idOk(u.id) || 'un_' + i, vistos), nome: texto(u.nome, '', 80).trim() || 'Unidade ' + (i + 1), tipo: idRef(u.tipo) })) };
    const cons = v.cons == null || v.cons === '' ? null : inteiro(v.cons, null, 1, MAX_TROPAS);
    const out = { cmd: { nome: texto(cmd.nome, '', 80).trim(), b: inteiro(cmd.b, 0, -MAX_BONUS, MAX_BONUS), ficha: idRef(cmd.ficha) }, moral: inteiro(v.moral, 5, 0, 10),
      mant: inteiro(v.mant, 0, 0, 1e9), cons, fome: inteiro(v.fome, 0, 0, 1e4), unid: unid.map((u, i) => normUnid(u, i, vistos)) };
    // (lote 9) os heróis do exército: as fichas que lutam junto (o bônus do mestre, quando ele escreveu um)
    const hs = normHerois(v.herois);
    if (hs.length) out.herois = hs;
    return out;
  }
  // (lote 9) os heróis: { ficha, b? } — uma vez cada ficha; o b (o bônus do mestre) só quando escrito
  const MAX_HEROIS = 12;
  function normHerois(v) {
    const out = [], vistos = new Set();
    for (const h of Array.isArray(v) ? v : []) {
      if (!ehObj(h) || out.length >= MAX_HEROIS) continue;
      const f = idRef(h.ficha);
      if (!f || vistos.has(f)) continue;
      vistos.add(f);
      const x = { ficha: f };
      if (h.b != null && h.b !== '' && Number.isFinite(num(h.b, NaN))) x.b = inteiro(h.b, 0, -MAX_BONUS, MAX_BONUS);
      out.push(x);
    }
    return out;
  }
  function normEstr(v) {
    if (!ehObj(v)) return null;
    const hpMax = inteiro(v.hpMax, 100, 1, 1e6), out = { nome: texto(v.nome, '', 80).trim(), def: inteiro(v.def, 3, 0, MAX_BONUS), hp: inteiro(v.hp, hpMax, 0, hpMax), hpMax };
    const maq = normTabMaq(v.maq);                               // (lote 12, parte 12d) as máquinas da fortificação
    if (Object.keys(maq).length) out.maq = maq;
    // (lote 12, parte 12e) a reserva de comida da cidade, em dias (no cerco), e a milícia (as tropas que defendem sem
    // exército dentro) — só quando não são as de começo
    const res = inteiro(v.res, RESERVA_PADRAO, 0, MAX_RESERVA), mil = inteiro(v.mil, MILICIA_PADRAO, 0, MAX_TROPAS);
    if (res !== RESERVA_PADRAO) out.res = res;
    if (mil !== MILICIA_PADRAO) out.mil = mil;
    return out;
  }
  /* (lote 12, parte 12e) O cerco do lugar (no marcador): { fac (quem cerca), d (o dia em que começou), res (os dias de
     comida que sobram na cidade) }. Na projeção, sem a facção escondida; a reserva e o HP da muralha (hp, hpMax) só para a
     facção dos jogadores, quando ela cerca ou é cercada ali. */
  function normCerco(v) {
    if (!ehObj(v)) return null;
    const out = { fac: idRef(v.fac), d: inteiro(v.d, 0, -1e9, 1e9) };
    if (v.res != null) out.res = inteiro(v.res, RESERVA_PADRAO, 0, MAX_RESERVA);
    if (v.hpMax != null) { out.hpMax = inteiro(v.hpMax, 1, 1, 1e6); out.hp = inteiro(v.hp, out.hpMax, 0, out.hpMax); }
    return out;
  }
  function normTiposGuerra(v) {
    const out = [], vistos = new Set();
    for (const t of Array.isArray(v) ? v : []) {
      if (!ehObj(t) || out.length >= MAX_TIPOS_G) continue;
      const id = idOk(t.id);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      const vant = {};
      if (ehObj(t.vant)) for (const k of Object.keys(t.vant)) { const n = inteiro(t.vant[k], 0, -MAX_BONUS, MAX_BONUS); if (idOk(k) && n) vant[k] = n; }
      out.push({ id, nome: texto(t.nome, '', 60).trim() || 'Tipo', dist: sim(t.dist), vant });
    }
    // (a vantagem contra um tipo que não existe sai)
    for (const t of out) for (const k of Object.keys(t.vant)) if (!vistos.has(k) || k === t.id) delete t.vant[k];
    return out;
  }
  // um lado da batalha, como ficou no histórico (o nome, o grupo e a facção)
  const normLadoBat = l => (ehObj(l) ? { nome: texto(l.nome, '', 120).trim() || 'Lado', g: idRef(l.g), fac: idRef(l.fac) } : { nome: 'Lado', g: null, fac: null });
  function normBatalhas(v) {
    const out = [], vistos = new Set();
    for (const b of Array.isArray(v) ? v.slice(-MAX_BATS) : []) {         // (as mais novas ficam, como no aplicar)
      if (!ehObj(b)) continue;
      const fim = ehObj(b.fim) ? b.fim : {};
      const bat = { id: unico(idOk(b.id) || 'bt_' + out.length, vistos), d: inteiro(b.d, 0, 0, 1e9), nome: texto(b.nome, '', 160).trim(), a: normLadoBat(b.a), b: normLadoBat(b.b),
        modo: b.modo === 'd20' ? 'd20' : 'd100',
        mom: (Array.isArray(b.mom) ? b.mom : []).filter(ehObj).slice(0, MAX_MOM).map(m => {
          const x = { k: escolha(MOMENTOS, m.k, 'ch'), da: inteiro(m.da, 1, 1, 100), db: inteiro(m.db, 1, 1, 100), ta: inteiro(m.ta, 0, -999, 999), tb: inteiro(m.tb, 0, -999, 999) };
          if (sim(m.chave)) x.chave = true;
          const nota = texto(m.nota, '', 400).trim();
          if (nota) x.nota = nota;
          return x;
        }),
        fim: { vence: fim.vence === 'a' || fim.vence === 'b' ? fim.vence : null, tam: inteiro(fim.tam, 0, 0, 4), como: escolha(FINS, fim.como, 'dados') },
        notas: (Array.isArray(b.notas) ? b.notas : []).map(t => texto(t, '', 600).trim()).filter(Boolean).slice(0, MAX_NOTAS) };
      const h = typeof b.hex === 'string' ? lerChaveHex(b.hex) : null;
      if (h) bat.hex = chaveHex(h);
      out.push(bat);
    }
    return out;
  }
  function normHexGuerra(v) {
    const out = {};
    if (!ehObj(v)) return out;
    let n = 0;
    for (const k of Object.keys(v)) {
      if (n >= MAX_HEX) break;
      const h = lerChaveHex(k);
      if (!h || !tem(HEX_GUERRA, v[k])) continue;
      out[chaveHex(h)] = v[k];
      n++;
    }
    return out;
  }
  // a guerra do mapa (só quando tem algo: o mapa de antes fica igual)
  /* ---------------- (lote 10) a economia do mundo ----------------
     eco = { on, rec: [{ id, nome, cor, papel }], ter: { terreno: { recurso: n } }, niv: [{ id, nome, esp, dist }] }:
     os recursos do mundo (o papel diz o que ele é para as regras: a moeda, a comida…), a produção por semana de cada
     hexágono pelo terreno e os níveis dos assentamentos (com os espaços de construção). Desligada (on: false), tudo fica
     guardado. Na região, prod = o valor do mestre por semana; no marcador, ass = { niv, pop } (o assentamento: o nível e
     a população, que o mestre muda).
     (parte 5) A população por pessoa: eco.estr = os estratos [{ id, nome, cor, prod (por pessoa, por semana; negativo
     consome), lembra (o lembrete que a prévia da semana mostra: "rumores", "apoio"…) }] — sem a lista guardada, os de
     começo —; em cada nível, dist = { estrato: % } (a divisão que o "Distribuir…" sugere; sem ela, a de começo); no
     assentamento, ass.estr = { estrato: pessoas } e ass.pop = a soma (a população de antes, sem estratos, vira
     Camponeses).
     (parte 5b) As guildas da cidade (não são clãs): ass.guildas = [{ id, nome, ic, txt (a descrição), estr (o estrato de
     onde vêm os membros), membros, lider: { nome, ficha (uma ficha das Fichas, opcional) }, infl (a influência, −10 a
     +10, só para ler), rel (a relação com o grupo, −10 a +10, como a do clã), prod e gasto (por semana), pct (quantos % do que ela produz
     vão para a facção dona da cidade; o resto fica no estoque dela), est (o estoque da guilda; o gasto sai dele), serv:
     [{ id, tipo (contrato, item, info), nome, preco (texto), desc }], secreta }]; eco.guildas = o catálogo (os modelos:
     sem membros, líder, influência, relação nem estoque).
     (parte 3) eco.cons = o catálogo de construções: [{ id, nome, ic (o ícone), esp (os espaços que ocupa), exige: { niv
     (o nível mínimo do assentamento), ter: [terrenos: um deles na região], cons (outra construção pronta antes) },
     niveis: [{ custo, sem (as semanas de obra), prod, gasto (por semana), def (a defesa que soma na fortificação), ef (o
     efeito escrito), cura (lote 12, parte 12c: a % do HP que falta que os exércitos na cidade curam por dia; só quando
     há) }] }]. No assentamento, ass.cons = [{ id, t (o tipo), n (o nível pronto; 0 = ainda na obra do 1º),
     obra: { n (o nível que a obra faz), sem (as semanas que faltam), fac (quem pagou), pago } | null }] e ass.cla = {
     id (o clã da página Clã: este é a sede dele), prod: { construção do clã: { recurso: n } } } — os números que o
     mestre dá às construções do clã.
     (parte 4) A semana: eco.sem = a primeira semana ainda não fechada (o número da semana: (sem0 + dia) / 7, a semana vira
     de domingo para segunda); eco.manut = { tipo de tropa: { recurso: n } } e eco.manut0 (as unidades sem tipo) = o que
     cada 10 soldados custam por semana; eco.regras = { fome (o apoio que cai por semana de fome), moral (a moral que cada
     exército perde sem moeda), obras (sem moeda, as obras param), outro (sem outro recurso, as construções que gastam
     dele param), moralOutro (e os exércitos que o usam na manutenção perdem de moral) }.
     (parte 6) O que os jogadores veem: ass.ver = a caixa "os jogadores veem o que tem dentro" (true ou false; sem ela, as
     cidades da facção dos jogadores começam marcadas e as outras, desmarcadas). Na projeção (só para os jogadores), o
     marcador aberto leva dentro (ver normDentro) e o mapa leva ecoJ, a economia da facção deles (ver normEcoJ). */
  const PAPEIS_REC ={ moeda: 'Moeda', comida: 'Comida', madeira: 'Madeira', pedra: 'Pedra', metal: 'Metal', magia: 'Magia' };
  const MAX_REC_MUNDO = 24, MAX_NIV = 12, MAX_PROD = 1e6, MAX_POP_ASS = 1e9;
  const MAX_CONS = 40, MAX_NIV_CONS = 5, MAX_CONS_ASS = 16, MAX_SEM_OBRA = 104, MAX_DEF_CONS = 20, MAX_ESP_CONS = 6, MAX_EF_CONS = 200;
  const numProd = v => { const n = num(v, NaN); return Number.isFinite(n) ? Math.round(limitar(n, -MAX_PROD, MAX_PROD) * 100) / 100 + 0 : null; };
  // uma tabela { recurso: n }: só os ids válidos (e, com a lista, só os que existem), sem os zeros
  function normTabProd(t, ids) {
    const out = {};
    if (!ehObj(t)) return out;
    for (const k of Object.keys(t).slice(0, MAX_REC_MUNDO * 2)) {
      if (!idOk(k) || (ids && !ids.has(k))) continue;
      const n = numProd(t[k]);
      if (n) out[k] = n;
    }
    return out;
  }
  // (parte 3) uma tabela só com números acima de zero (o custo, o gasto)
  function normTabPos(t, ids) { const out = normTabProd(t, ids); for (const k of Object.keys(out)) if (!(out[k] > 0)) delete out[k]; return out; }
  // (parte 3) o catálogo de construções (ver acima): os recursos, os terrenos e os níveis que existem
  function normCatalogo(v, ids, terIds, nivIds) {
    const out = [], vistos = new Set();
    for (const c of Array.isArray(v) ? v : []) {
      if (!ehObj(c) || out.length >= MAX_CONS) continue;
      const id = idOk(c.id);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      const ex = ehObj(c.exige) ? c.exige : {}, niveis = [], ter = [];
      for (const n of Array.isArray(c.niveis) ? c.niveis : []) {
        if (!ehObj(n) || niveis.length >= MAX_NIV_CONS) continue;
        const nv = { custo: normTabPos(n.custo, ids), sem: inteiro(n.sem, 1, 0, MAX_SEM_OBRA), prod: normTabProd(n.prod, ids), gasto: normTabPos(n.gasto, ids),
          def: inteiro(n.def, 0, 0, MAX_DEF_CONS), ef: texto(n.ef, '', MAX_EF_CONS).trim() };
        const cura = inteiro(n.cura, 0, 0, 100);                  // (lote 12, parte 12c) a cura da Enfermaria: a % por dia, na cidade
        if (cura) nv.cura = cura;
        niveis.push(nv);
      }
      if (!niveis.length) niveis.push({ custo: {}, sem: 1, prod: {}, gasto: {}, def: 0, ef: '' });
      for (const t of Array.isArray(ex.ter) ? ex.ter : []) if (terIds.has(t) && !ter.includes(t)) ter.push(t);
      out.push({ id, nome: texto(c.nome, '', 40).trim() || 'Construção', ic: typeof c.ic === 'string' && /^[a-z0-9_-]{1,20}$/.test(c.ic) ? c.ic : 'salao',
        esp: inteiro(c.esp, 1, 0, MAX_ESP_CONS), exige: { niv: nivIds.has(ex.niv) ? ex.niv : null, ter, cons: idRef(ex.cons) }, niveis });
    }
    // a outra construção que se exige tem de existir no catálogo (e não ser ela mesma)
    const cids = new Set(out.map(c => c.id));
    for (const c of out) if (c.exige.cons && (!cids.has(c.exige.cons) || c.exige.cons === c.id)) c.exige.cons = null;
    return out;
  }
  const REGRAS_FALTA = { fome: 10, moral: 1, obras: true, outro: true, moralOutro: 1 };
  // (parte 5) os estratos de começo (por pessoa, por semana; a produção pelo papel do recurso) e a divisão de começo por nível
  const MAX_ESTR = 16, MAX_PESSOAS = 1e6, MAX_LEMBRA = 80;
  const ESTRATOS_INICIAIS = [
    { id: 'camponeses', nome: 'Camponeses', cor: '#9fbf4a', prod: { comida: 0.6 }, lembra: '' },
    { id: 'artesaos', nome: 'Artesãos', cor: '#a8743c', prod: { madeira: 0.2, pedra: 0.2 }, lembra: '' },
    { id: 'mercadores', nome: 'Mercadores', cor: '#e6ab4f', prod: { moeda: 1 }, lembra: '' },
    { id: 'aventureiros', nome: 'Aventureiros', cor: '#e58a6b', prod: { moeda: 0.3 }, lembra: 'rumores' },
    { id: 'clero', nome: 'Clero e sábios', cor: '#b39cf0', prod: { magia: 0.2 }, lembra: 'apoio' },
    { id: 'guarda', nome: 'Guarda', cor: '#7fb7e0', prod: { comida: -0.4 }, lembra: 'defesa' },
    { id: 'nobreza', nome: 'Nobreza', cor: '#f2c14e', prod: { moeda: -1 }, lembra: 'apoio' },
    { id: 'idosos', nome: 'Idosos', cor: '#9aa3b5', prod: { comida: -0.3 }, lembra: '' },
    { id: 'criancas', nome: 'Crianças', cor: '#6fbf8f', prod: { comida: -0.3 }, lembra: '' },
  ];
  const DIST_INICIAL = {
    aldeia: { camponeses: 55, artesaos: 6, mercadores: 2, aventureiros: 2, clero: 2, guarda: 3, idosos: 10, criancas: 20 },
    vila: { camponeses: 42, artesaos: 10, mercadores: 5, aventureiros: 3, clero: 3, guarda: 5, nobreza: 1, idosos: 11, criancas: 20 },
    cidade: { camponeses: 28, artesaos: 15, mercadores: 9, aventureiros: 5, clero: 4, guarda: 7, nobreza: 2, idosos: 12, criancas: 18 },
    metropole: { camponeses: 20, artesaos: 17, mercadores: 12, aventureiros: 6, clero: 5, guarda: 8, nobreza: 3, idosos: 12, criancas: 17 },
  };
  // os estratos de começo para estes recursos (a produção vai para o recurso de cada papel; o papel que não há, sai)
  function estratosDeComeco(rec) {
    const porPapel = {};
    for (const r of Array.isArray(rec) ? rec : []) if (r && r.papel && !porPapel[r.papel]) porPapel[r.papel] = r.id;
    return ESTRATOS_INICIAIS.map(s => { const prod = {}; for (const p of Object.keys(s.prod)) if (porPapel[p]) prod[porPapel[p]] = s.prod[p]; return { id: s.id, nome: s.nome, cor: s.cor, prod, lembra: s.lembra }; });
  }
  // a divisão de começo de um nível (a dos níveis de começo pelo id; outro nível, a da Vila), só dos estratos que existem
  function distDeComeco(nivId, estrIds) {
    const base = DIST_INICIAL[nivId] || DIST_INICIAL.vila, out = {};
    for (const k of Object.keys(base)) if (estrIds.has(k)) out[k] = base[k];
    return out;
  }
  // (parte 5b) as guildas (ver acima): os serviços e uma guilda (cat: o modelo do catálogo, sem o que é de cada cidade)
  const TIPOS_SERV = { contrato: 'Contrato', item: 'Item', info: 'Informação' };
  const MAX_GUILDAS = 12, MAX_GUILDAS_CAT = 24, MAX_SERV = 20, MAX_TXT_GUILDA = 400;
  function normServicos(v) {
    const out = [], vistos = new Set();
    for (const s of Array.isArray(v) ? v : []) {
      if (!ehObj(s) || out.length >= MAX_SERV) continue;
      const nome = texto(s.nome, '', 60).trim();
      if (!nome) continue;
      out.push({ id: unico(idOk(s.id) || 'sv', vistos), tipo: tem(TIPOS_SERV, s.tipo) ? s.tipo : 'contrato', nome, preco: texto(s.preco, '', 40).trim(), desc: texto(s.desc, '', 200).trim() });
    }
    return out;
  }
  function normGuilda(g, cat, vistos) {
    if (!ehObj(g)) return null;
    const x = { id: unico(idOk(g.id) || 'gd', vistos), nome: texto(g.nome, '', 60).trim() || 'Guilda', ic: typeof g.ic === 'string' && /^[a-z0-9_-]{1,20}$/.test(g.ic) ? g.ic : 'salao',
      txt: texto(g.txt, '', MAX_TXT_GUILDA).trim(), estr: idRef(g.estr) };
    if (!cat) {
      const l = ehObj(g.lider) ? g.lider : {};
      Object.assign(x, { membros: inteiro(g.membros, 0, 0, MAX_PESSOAS), lider: { nome: texto(l.nome, '', 60).trim(), ficha: idRef(l.ficha) }, infl: inteiro(g.infl, 0, -10, 10), rel: inteiro(g.rel, 0, -10, 10) });
    }
    Object.assign(x, { prod: normTabProd(g.prod), gasto: normTabPos(g.gasto), pct: inteiro(g.pct, 50, 0, 100) });
    if (!cat) x.est = normTabPos(g.est);
    x.serv = normServicos(g.serv);
    x.secreta = sim(g.secreta);
    return x;
  }
  function normGuildas(v, cat, max) {
    const out = [], vistos = new Set();
    for (const g of Array.isArray(v) ? v : []) { if (out.length >= max) break; const x = normGuilda(g, cat, vistos); if (x) out.push(x); }
    return out;
  }
  // as referências de uma guilda com a economia: o estrato que existe, só os recursos do mundo
  function conferirGuilda(g, recIds, estrIds) {
    if (g.estr && !estrIds.has(g.estr)) g.estr = null;
    g.prod = normTabProd(g.prod, recIds); g.gasto = normTabPos(g.gasto, recIds);
    if (g.est) g.est = normTabPos(g.est, recIds);
  }
  function normEco(v, terrenos, tiposG, cal) {
    if (!ehObj(v)) return null;
    const rec = [], vistos = new Set();
    for (const r of Array.isArray(v.rec) ? v.rec : []) {
      if (!ehObj(r) || rec.length >= MAX_REC_MUNDO) continue;
      const id = idOk(r.id);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      const x = { id, nome: texto(r.nome, '', 40).trim() || 'Recurso', cor: cor(r.cor, '#9aa3b5') };
      if (tem(PAPEIS_REC, r.papel)) x.papel = r.papel;
      rec.push(x);
    }
    const ids = new Set(rec.map(r => r.id)), terIds = new Set((terrenos || []).map(t => t.id)), ter = {};
    if (ehObj(v.ter)) for (const k of Object.keys(v.ter)) if (terIds.has(k)) { const t = normTabProd(v.ter[k], ids); if (Object.keys(t).length) ter[k] = t; }
    // (parte 5) os estratos (sem a lista guardada, os de começo)
    const estr = [], ve = new Set();
    for (const s of Array.isArray(v.estr) ? v.estr : estratosDeComeco(rec)) {
      if (!ehObj(s) || estr.length >= MAX_ESTR) continue;
      const id = idOk(s.id);
      if (!id || ve.has(id)) continue;
      ve.add(id);
      estr.push({ id, nome: texto(s.nome, '', 40).trim() || 'Estrato', cor: cor(s.cor, '#9aa3b5'), prod: normTabProd(s.prod, ids), lembra: texto(s.lembra, '', MAX_LEMBRA).trim() });
    }
    const niv = [], vn = new Set();
    for (const n of Array.isArray(v.niv) ? v.niv : []) {
      if (!ehObj(n) || niv.length >= MAX_NIV) continue;
      const id = idOk(n.id);
      if (!id || vn.has(id)) continue;
      vn.add(id);
      niv.push({ id, nome: texto(n.nome, '', 40).trim() || 'Nível', esp: inteiro(n.esp, 2, 0, 40), dist: ehObj(n.dist) ? normTabPos(n.dist, ve) : distDeComeco(id, ve) });
    }
    const eco = { on: sim(v.on), rec, ter, estr, niv, cons: normCatalogo(v.cons, ids, terIds, vn), guildas: normGuildas(v.guildas, true, MAX_GUILDAS_CAT) };
    for (const g of eco.guildas) conferirGuilda(g, ids, ve);           // (parte 5b) o catálogo de guildas
    // (parte 4) a semana: sem o número guardado, a de hoje (nenhuma pendente); sem os dias da semana no mapa, nenhuma
    const semHoje = ehObj(cal) && Number.isInteger(cal.sem0) ? Math.floor((cal.sem0 + Math.floor(num(cal.dia, 0))) / 7) : null;
    // (a guardada fica mesmo à frente de hoje: o calendário que volta e depois anda não reabre as semanas já fechadas)
    eco.sem = semHoje == null ? null : Number.isInteger(v.sem) ? limitar(v.sem, -1e7, 1e7) : semHoje;
    // a manutenção dos exércitos: por tipo de tropa (só os que existem) e a das unidades sem tipo (sem ela guardada: a de
    // começo, 1 de comida e 1 de moeda a cada 10 soldados)
    const tipos = new Set(tiposG || []), manut = {};
    if (ehObj(v.manut)) for (const k of Object.keys(v.manut)) if (tipos.has(k)) { const t = normTabPos(v.manut[k], ids); if (Object.keys(t).length) manut[k] = t; }
    let manut0 = ehObj(v.manut0) ? normTabPos(v.manut0, ids) : null;
    if (!manut0) { manut0 = {}; for (const p of ['comida', 'moeda']) { const r = rec.find(x => x.papel === p); if (r) manut0[r.id] = 1; } }
    const rg = ehObj(v.regras) ? v.regras : {};
    eco.manut0 = manut0;
    eco.manut = manut;
    eco.regras = { fome: inteiro(rg.fome, REGRAS_FALTA.fome, 0, 100), moral: inteiro(rg.moral, REGRAS_FALTA.moral, 0, 10), obras: rg.obras === undefined ? REGRAS_FALTA.obras : sim(rg.obras),
      outro: rg.outro === undefined ? REGRAS_FALTA.outro : sim(rg.outro), moralOutro: inteiro(rg.moralOutro, REGRAS_FALTA.moralOutro, 0, 10) };
    return eco;
  }
  /* O assentamento do marcador: o nível (um dos da economia) e a população (o mestre muda); (parte 3) as construções e a
     sede do clã. Sem nada disso, nada. (As referências ao catálogo e às facções se conferem depois, com o mapa todo.) */
  function normAss(v) {
    if (!ehObj(v)) return null;
    const niv = idRef(v.niv), out = { niv, pop: inteiro(v.pop, 0, 0, MAX_POP_ASS) }, cons = [], vistos = new Set();
    // (parte 5) as pessoas de cada estrato (a soma é a população)
    if (ehObj(v.estr)) {
      const estr = {};
      for (const k of Object.keys(v.estr).slice(0, MAX_ESTR * 2)) { const n = idOk(k) ? inteiro(v.estr[k], 0, 0, MAX_PESSOAS) : 0; if (n) estr[k] = n; }
      out.pop = Object.keys(estr).reduce((s, k) => s + estr[k], 0);
      if (out.pop) out.estr = estr;
    }
    const pop = out.pop;
    for (const c of Array.isArray(v.cons) ? v.cons : []) {
      if (!ehObj(c) || cons.length >= MAX_CONS_ASS || !idRef(c.t)) continue;
      const o = ehObj(c.obra) ? c.obra : null;
      const x = { id: unico(idOk(c.id) || 'ct', vistos), t: c.t, n: inteiro(c.n, 0, 0, MAX_NIV_CONS),
        obra: o ? { n: inteiro(o.n, 1, 1, MAX_NIV_CONS), sem: inteiro(o.sem, 0, 0, MAX_SEM_OBRA), fac: idRef(o.fac), pago: normTabPos(o.pago) } : null };
      if (x.obra && x.obra.n !== x.n + 1) x.obra.n = x.n + 1;
      if (x.n || x.obra) cons.push(x);
    }
    if (cons.length) out.cons = cons;
    if (ehObj(v.cla) && idRef(v.cla.id)) {
      const prod = {};
      if (ehObj(v.cla.prod)) for (const k of Object.keys(v.cla.prod).slice(0, 60)) { const t = idOk(k) ? normTabProd(v.cla.prod[k]) : {}; if (Object.keys(t).length) prod[k] = t; }
      out.cla = { id: v.cla.id, prod };
    }
    const gs = normGuildas(v.guildas, false, MAX_GUILDAS);             // (parte 5b) as guildas da cidade
    if (gs.length) out.guildas = gs;
    if (v.ver === true || v.ver === false) out.ver = v.ver;           // (parte 6) os jogadores veem o que tem dentro
    return niv || pop || out.cons || out.cla || out.guildas ? out : null;
  }
  /* (parte 3) As construções de um assentamento com o mapa todo: só os tipos do catálogo (o nível até o último deles; a
     obra só com o nível seguinte, que exista), quem pagou só uma facção que existe, o pago só dos recursos do mundo; a
     produção do clã só dos recursos do mundo. */
  function conferirAss(a, eco, facs) {
    const tipos = new Map(eco ? eco.cons.map(c => [c.id, c]) : []), recIds = new Set(eco ? eco.rec.map(r => r.id) : []);
    // (parte 5) as pessoas só dos estratos que existem (a soma é a população); a população sem estratos vira Camponeses
    // (ou o primeiro estrato, sem eles); o assentamento fica com as chaves na ordem de sempre
    if (eco) {
      const eids = eco.estr.map(s => s.id);
      if (a.estr) {
        for (const k of Object.keys(a.estr)) if (!eids.includes(k)) delete a.estr[k];
        a.pop = Object.keys(a.estr).reduce((s, k) => s + a.estr[k], 0);
        if (!a.pop) delete a.estr;
      } else if (a.pop > 0 && eids.length) {
        a.estr = { [eids.includes('camponeses') ? 'camponeses' : eids[0]]: Math.min(a.pop, MAX_PESSOAS) };
        a.pop = Math.min(a.pop, MAX_PESSOAS);
        for (const k of ['cons', 'cla', 'guildas', 'ver']) if (k in a) { const x = a[k]; delete a[k]; a[k] = x; }
      }
    }
    if (a.cons) {
      a.cons = a.cons.filter(c => {
        const t = tipos.get(c.t);
        if (!t) return false;
        if (c.n > t.niveis.length) c.n = t.niveis.length;
        if (c.obra) {
          if (c.n >= t.niveis.length) c.obra = null;
          else { c.obra.n = c.n + 1; if (c.obra.fac && !facs.has(c.obra.fac)) c.obra.fac = null; c.obra.pago = normTabPos(c.obra.pago, recIds); }
        }
        return c.n > 0 || !!c.obra;
      });
      if (!a.cons.length) delete a.cons;
    }
    if (a.cla) for (const k of Object.keys(a.cla.prod)) { const t = normTabProd(a.cla.prod[k], recIds); if (Object.keys(t).length) a.cla.prod[k] = t; else delete a.cla.prod[k]; }
    if (a.guildas && eco) { const eids = new Set(eco.estr.map(s => s.id)); for (const g of a.guildas) conferirGuilda(g, recIds, eids); }
  }
  /* (parte 6) O que os jogadores veem dentro de uma cidade que o mestre abriu para eles (só na projeção): dentro = { nivel
     (o nome do nível), pop (o total, sem os estratos), cons: [{ nome, ic, n }] (as construções prontas, com o nível; sem
     as obras nem os números), guildas: [{ id, nome, ic, txt, serv }] (as que não são secretas: a descrição e os serviços
     com o preço; sem o líder, os membros, a influência nem a relação) }. Sem nada disso, nada. */
  const icOk = v => (typeof v === 'string' && /^[a-z0-9_-]{1,20}$/.test(v) ? v : 'salao');
  function normDentro(v) {
    if (!ehObj(v)) return null;
    const cons = [], guildas = [], vistos = new Set();
    for (const c of Array.isArray(v.cons) ? v.cons : []) {
      if (!ehObj(c) || cons.length >= MAX_CONS_ASS) continue;
      const nome = texto(c.nome, '', 40).trim();
      if (nome) cons.push({ nome, ic: icOk(c.ic), n: inteiro(c.n, 1, 1, MAX_NIV_CONS) });
    }
    for (const g of Array.isArray(v.guildas) ? v.guildas : []) {
      if (!ehObj(g) || guildas.length >= MAX_GUILDAS) continue;
      guildas.push({ id: unico(idOk(g.id) || 'gd', vistos), nome: texto(g.nome, '', 60).trim() || 'Guilda', ic: icOk(g.ic), txt: texto(g.txt, '', MAX_TXT_GUILDA).trim(), serv: normServicos(g.serv) });
    }
    const out = { nivel: texto(v.nivel, '', 40).trim(), pop: inteiro(v.pop, 0, 0, MAX_POP_ASS), cons, guildas };
    return out.nivel || out.pop || cons.length || guildas.length ? out : null;
  }
  /* (parte 6) A economia da facção dos jogadores, como eles a veem (só na projeção): ecoJ = { fac (a facção deles), rec:
     [{ id, nome, cor }] (os recursos do mundo), est (o estoque), prod: { terreno, pop, cons (com o gasto delas), guilda,
     cla (a sede do clã), mestre, total } (por semana), manut (a manutenção dos exércitos, por semana), prov: [{ id (a
     província; null: as terras que eles não veem e o que fica fora das províncias), nome, prod }], livro: { prov, sub,
     hex, exe, grade } (a linha deles no Livro do reino), trocas (lote 11, parte 3b: o tributo e as trocas dela por semana,
     [{ tipo ('trib' | 'troca'), sentido ('envia' | 'recebe'), com (a outra facção; null: uma que eles não veem), rec, q }]) }. */
  const FONTES_J = ['terreno', 'pop', 'cons', 'guilda', 'cla', 'mestre', 'total'], MAX_TROCAS_J = 100;
  function normEcoJ(v) {
    if (!ehObj(v) || !idOk(v.fac)) return null;
    const rec = [], vistos = new Set();
    for (const r of Array.isArray(v.rec) ? v.rec : []) {
      if (!ehObj(r) || rec.length >= MAX_REC_MUNDO) continue;
      const id = idOk(r.id);
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      rec.push({ id, nome: texto(r.nome, '', 40).trim() || 'Recurso', cor: cor(r.cor, '#9aa3b5') });
    }
    const ids = new Set(rec.map(r => r.id)), est = {};
    const fontes = p => { const o = {}; for (const k of FONTES_J) o[k] = normTabProd(ehObj(p) ? p[k] : null, ids); return o; };
    if (ehObj(v.est)) for (const k of Object.keys(v.est).slice(0, MAX_REC_MUNDO * 2)) { if (!ids.has(k)) continue; const n = Math.round(limitar(num(v.est[k], 0), -1e12, 1e12) * 100) / 100 + 0; if (n) est[k] = n; }
    const prov = [];
    for (const x of Array.isArray(v.prov) ? v.prov : []) if (ehObj(x) && prov.length < 200) prov.push({ id: idRef(x.id), nome: texto(x.nome, '', 120).trim(), prod: fontes(x.prod) });
    const l = ehObj(v.livro) ? v.livro : {}, trocas = [];
    for (const x of Array.isArray(v.trocas) ? v.trocas : []) {
      const rec = ehObj(x) ? idOk(x.rec) : '', q = rec ? qtdDipl(x.q) : 0;
      if (ids.has(rec) && q && trocas.length < MAX_TROCAS_J) trocas.push({ tipo: x.tipo === 'trib' ? 'trib' : 'troca', sentido: x.sentido === 'envia' ? 'envia' : 'recebe', com: idRef(x.com), rec, q });
    }
    return { fac: v.fac, rec, est, prod: fontes(v.prod), manut: normTabPos(v.manut, ids), prov,
      livro: { prov: inteiro(l.prov, 0, 0, 1e6), sub: inteiro(l.sub, 0, 0, 1e6), hex: inteiro(l.hex, 0, 0, 1e9), exe: inteiro(l.exe, 0, 0, 1e6), grade: sim(l.grade) }, trocas };
  }

  /* ---------------- (lote 11, parte 1) a corte: os personagens do mundo e as casas ----------------
     corte = { pessoas: [{ id, nome, gen ('h' homem, 'm' mulher, 'o' outro; '' sem dizer), casa, fac, cargo (um dos cargos
     da corte da facção dele), nasc e morte (a data do mundo: { a (o ano), m (o mês, de 0; opcional), d (o dia do mês;
     opcional, só com o mês) }; sem a morte, vivo), pais (até dois), conj (os cônjuges, até quatro; vale para os dois
     lados), onde ({ t: 'm' (um marcador) | 'g' (um grupo), id }: onde ele está; sem, só na lista), ficha (uma ficha das
     Fichas, opcional), txt (o que os jogadores sabem), nota (do mestre), ver (os jogadores conhecem) }], casas: [{ id,
     nome, br (o brasão, como a bandeira), lema, chefe (um personagem da casa) }], cargos: { facção: [{ id, nome }] } (os
     cargos da corte de cada facção; sem a lista guardada, os de começo) }. Só quando há algo (o mapa de antes fica igual).
     Ninguém é antepassado de si mesmo (o pai que fecharia um círculo sai).
     (parte 2a) Os títulos: titulos: [{ id, grau (um dos graus; sem ele, o nome livre), de (o "de quê": "da Terra Alta";
     vazio, "de" + o nome da terra), nome (o do título sem grau: "Grão-Mestre da Ordem"), preso ({ t: 'r' (uma região) |
     'm' (um marcador) | 'f' (uma facção), id }; sem, o título sem terra), fac (o reino: para a regra e a lista), tit (o
     titular), desde (a data em que ele ficou com o título), herd (o herdeiro escolhido), reg (o regente), pret
     (os pretendentes: [{ p, mot (o motivo) }]), hist (os titulares de antes: [{ p (o personagem; null: só o nome), nome,
     de, ate }]), txt, nota }]; graus: [{ id, nome (Ducado), h (Duque), m (Duquesa), o (o de outro; vazio, o de homem) }],
     do maior para o menor (sem a lista guardada, os de começo); maior: a maioridade (sem ela, 16). */
  const GENEROS = { h: 'Homem', m: 'Mulher', o: 'Outro' };
  const CARGOS_INICIAIS = [{ id: 'conselheiro', nome: 'Conselheiro' }, { id: 'marechal', nome: 'Marechal' }, { id: 'tesoureiro', nome: 'Tesoureiro' },
    { id: 'espiao', nome: 'Espião-mestre' }, { id: 'sacerdote', nome: 'Sacerdote' }, { id: 'embaixador', nome: 'Embaixador' }];
  const MAX_PESSOAS_CORTE = 400, MAX_CASAS = 80, MAX_CARGOS = 16, MAX_CONJ = 4, MAX_TXT_CORTE = 600;
  const GRAUS_INICIAIS = [{ id: 'imperio', nome: 'Império', h: 'Imperador', m: 'Imperatriz', o: '' }, { id: 'reino', nome: 'Reino', h: 'Rei', m: 'Rainha', o: '' },
    { id: 'ducado', nome: 'Ducado', h: 'Duque', m: 'Duquesa', o: '' }, { id: 'condado', nome: 'Condado', h: 'Conde', m: 'Condessa', o: '' },
    { id: 'baronia', nome: 'Baronia', h: 'Barão', m: 'Baronesa', o: '' }];
  const MAX_TITULOS = 200, MAX_GRAUS = 12, MAX_PRET = 8, MAX_HIST_TIT = 40, MAIORIDADE = 16, MAX_MAIORIDADE = 100;
  /* (parte 2b) a sucessão: a regra de cada reino (corte.regras: { facção: { forma, gen } }; sem ela, a de começo) e a de
     um título (titulo.regra; sem ela, a do reino). A forma: primogenitura (o mais velho e a linha dele), ultimogenitura
     (o mais novo), antiguidade (o mais velho da casa), partilha (os títulos divididos entre os filhos) ou o mestre
     escolhe; o gênero: igual, homens primeiro, só homens, mulheres primeiro ou só mulheres. */
  const FORMAS_SUC = { primo: 'Primogenitura', ultimo: 'Ultimogenitura', antig: 'Antiguidade', partilha: 'Partilha', eletiva: 'O mestre escolhe' };
  const GENEROS_SUC = { igual: 'Homens e mulheres por igual', homens: 'Homens primeiro', sohomens: 'Só homens', mulheres: 'Mulheres primeiro', somulheres: 'Só mulheres' };
  const REGRA_PADRAO = { forma: 'primo', gen: 'igual' };
  const normRegra = v => (ehObj(v) && tem(FORMAS_SUC, v.forma) ? { forma: v.forma, gen: tem(GENEROS_SUC, v.gen) ? v.gen : 'igual' } : null);
  // a data de um personagem: o ano e, se souber, o mês e o dia (o dia só com o mês)
  function normDataP(v, cal) {
    if (!ehObj(v)) return null;
    const a = inteiro(v.a, NaN, -1e6, 1e6);
    if (!Number.isFinite(a)) return null;
    // (o mês que não existe no calendário sai, e o dia com ele; o dia que passa do mês fica no último)
    const out = { a }, meses = mesesDe(cal), mi = Number.isInteger(v.m) && v.m >= 0 && v.m < meses.length ? v.m : -1;
    if (mi >= 0) { out.m = mi; const d = inteiro(v.d, 0, 0, diasDoMes(meses[mi])); if (d >= 1) out.d = d; }
    return out;
  }
  function normCorte(v, cal) {
    if (!ehObj(v)) return null;
    const casas = [], vc = new Set(), pessoas = [], vp = new Set(), cargos = {};
    for (const c of Array.isArray(v.casas) ? v.casas : []) {
      if (!ehObj(c) || casas.length >= MAX_CASAS) continue;
      const id = idOk(c.id);
      if (!id || vc.has(id)) continue;
      vc.add(id);
      casas.push({ id, nome: texto(c.nome, '', 60).trim() || 'Casa', br: normBr(c.br), lema: texto(c.lema, '', 120).trim(), chefe: idRef(c.chefe) });
    }
    const lista = (l, max) => [...new Set((Array.isArray(l) ? l : []).map(idOk).filter(Boolean))].slice(0, max);
    for (const p of Array.isArray(v.pessoas) ? v.pessoas : []) {
      if (!ehObj(p) || pessoas.length >= MAX_PESSOAS_CORTE) continue;
      const id = idOk(p.id);
      if (!id || vp.has(id)) continue;
      vp.add(id);
      const on = ehObj(p.onde) && (p.onde.t === 'm' || p.onde.t === 'g') && idOk(p.onde.id) ? { t: p.onde.t, id: p.onde.id } : null;
      pessoas.push({ id, nome: texto(p.nome, '', 80).trim() || 'Sem nome', gen: tem(GENEROS, p.gen) ? p.gen : '', casa: idRef(p.casa), fac: idRef(p.fac), cargo: idRef(p.cargo),
        nasc: normDataP(p.nasc, cal), morte: normDataP(p.morte, cal), pais: lista(p.pais, 2), conj: lista(p.conj, MAX_CONJ), onde: on, ficha: idRef(p.ficha),
        txt: texto(p.txt, '', MAX_TXT_CORTE).trim(), nota: texto(p.nota, '', MAX_TXT_CORTE).trim(), ver: sim(p.ver) });
    }
    if (ehObj(v.cargos)) for (const k of Object.keys(v.cargos).slice(0, 200)) {
      if (!idOk(k) || !Array.isArray(v.cargos[k])) continue;
      const l = [], vk = new Set();
      for (const c of v.cargos[k]) {
        if (!ehObj(c) || l.length >= MAX_CARGOS) continue;
        const id = idOk(c.id);
        if (!id || vk.has(id)) continue;
        vk.add(id);
        l.push({ id, nome: texto(c.nome, '', 40).trim() || 'Cargo' });
      }
      cargos[k] = l;
    }
    // (parte 2a) os graus (do maior para o menor), os títulos e a maioridade
    let graus = null;
    if (Array.isArray(v.graus)) {
      graus = [];
      const vg = new Set();
      for (const g of v.graus) {
        if (!ehObj(g) || graus.length >= MAX_GRAUS) continue;
        const id = idOk(g.id);
        if (!id || vg.has(id)) continue;
        vg.add(id);
        graus.push({ id, nome: texto(g.nome, '', 40).trim() || 'Grau', h: texto(g.h, '', 40).trim(), m: texto(g.m, '', 40).trim(), o: texto(g.o, '', 40).trim() });
      }
    }
    const titulos = [], vt = new Set();
    for (const t of Array.isArray(v.titulos) ? v.titulos : []) {
      if (!ehObj(t) || titulos.length >= MAX_TITULOS) continue;
      const id = idOk(t.id);
      if (!id || vt.has(id)) continue;
      vt.add(id);
      const pr = ehObj(t.preso) && (t.preso.t === 'r' || t.preso.t === 'm' || t.preso.t === 'f') && idOk(t.preso.id) ? { t: t.preso.t, id: t.preso.id } : null;
      const pret = [], vpr = new Set(), hist = [];
      for (const x of Array.isArray(t.pret) ? t.pret : []) {
        if (!ehObj(x) || pret.length >= MAX_PRET) continue;
        const p = idOk(x.p);
        if (!p || vpr.has(p)) continue;
        vpr.add(p);
        pret.push({ p, mot: texto(x.mot, '', 120).trim() });
      }
      for (const x of Array.isArray(t.hist) ? t.hist : []) {
        if (!ehObj(x) || hist.length >= MAX_HIST_TIT) continue;
        const p = idRef(x.p), nome = texto(x.nome, '', 80).trim();
        if (!p && !nome) continue;
        hist.push({ p, nome, de: normDataP(x.de, cal), ate: normDataP(x.ate, cal) });
      }
      titulos.push({ id, grau: idRef(t.grau), de: texto(t.de, '', 80).trim(), nome: texto(t.nome, '', 80).trim(), preso: pr, fac: idRef(t.fac), tit: idRef(t.tit), desde: normDataP(t.desde, cal),
        herd: idRef(t.herd), reg: idRef(t.reg), regra: normRegra(t.regra), pret, hist, txt: texto(t.txt, '', MAX_TXT_CORTE).trim(), nota: texto(t.nota, '', MAX_TXT_CORTE).trim() });
    }
    const maior = v.maior == null ? NaN : inteiro(v.maior, NaN, 0, MAX_MAIORIDADE);
    // (parte 2b) as regras de sucessão de cada reino
    const regras = {};
    if (ehObj(v.regras)) for (const k of Object.keys(v.regras).slice(0, 200)) { const r = idOk(k) ? normRegra(v.regras[k]) : null; if (r) regras[k] = r; }
    if (!pessoas.length && !casas.length && !Object.keys(cargos).length && !titulos.length && !graus && !Number.isFinite(maior) && !Object.keys(regras).length) return null;
    const out = { pessoas, casas, cargos, titulos };
    if (Object.keys(regras).length) out.regras = regras;
    if (graus) out.graus = graus;
    if (Number.isFinite(maior)) out.maior = maior;
    return out;
  }
  // a corte com o mapa todo: só a facção, a casa, o cargo (da facção dele), o lugar (um marcador ou um grupo) e as pessoas que existem
  function conferirCorte(c, facs, objs) {
    const casas = new Set(c.casas.map(x => x.id)), ps = new Map(c.pessoas.map(p => [p.id, p])), lugares = new Map(objs.filter(o => o.k === 'm' || o.k === 'g').map(o => [o.id, o.k]));
    for (const k of Object.keys(c.cargos)) if (!facs.has(k)) delete c.cargos[k];
    const cargosDa = f => c.cargos[f] || CARGOS_INICIAIS;
    for (const p of c.pessoas) {
      if (p.fac && !facs.has(p.fac)) p.fac = null;
      if (p.casa && !casas.has(p.casa)) p.casa = null;
      if (p.cargo && (!p.fac || !cargosDa(p.fac).some(x => x.id === p.cargo))) p.cargo = null;
      if (p.onde && lugares.get(p.onde.id) !== p.onde.t) p.onde = null;
      p.pais = p.pais.filter(id => id !== p.id && ps.has(id));
      p.conj = p.conj.filter(id => id !== p.id && ps.has(id));
    }
    // os cônjuges valem para os dois lados (até quatro: o que não cabe do outro lado sai dos dois)
    for (const p of c.pessoas) for (const id of p.conj) { const q = ps.get(id); if (!q.conj.includes(p.id) && q.conj.length < MAX_CONJ) q.conj.push(p.id); }
    for (const p of c.pessoas) p.conj = p.conj.filter(id => ps.get(id).conj.includes(p.id));
    // ninguém é antepassado de si mesmo: o pai que fecharia um círculo sai
    const sobe = (de, alvo) => { const vistos = new Set(), fila = [de]; while (fila.length) { const x = fila.shift(); if (x === alvo) return true; if (vistos.has(x)) continue; vistos.add(x); const q = ps.get(x); if (q) fila.push(...q.pais); } return false; };
    for (const p of c.pessoas) p.pais = p.pais.filter(id => !sobe(id, p.id));
    for (const x of c.casas) { const q = x.chefe ? ps.get(x.chefe) : null; if (!q || q.casa !== x.id) x.chefe = null; }
    /* (parte 2a) os títulos: o grau (um dos graus), a terra (do tipo certo), o reino e as pessoas têm de existir; o
       herdeiro escolhido, o regente e os pretendentes não são o próprio titular; sem titular, sem o "desde"; o titular
       de antes que saiu da corte fica só com o nome (o nome dos que estão vem da corte) */
    // (parte 2b) as regras de sucessão: só dos reinos que existem
    if (c.regras) { for (const k of Object.keys(c.regras)) if (!facs.has(k)) delete c.regras[k]; if (!Object.keys(c.regras).length) delete c.regras; }
    const graus = new Set((c.graus || GRAUS_INICIAIS).map(g => g.id)), terras = { r: new Set(), m: new Set(), f: facs };
    for (const o of objs) if (o.k === 'r' || o.k === 'm') terras[o.k].add(o.id);
    for (const t of c.titulos) {
      if (t.grau && !graus.has(t.grau)) t.grau = null;
      if (t.preso && !terras[t.preso.t].has(t.preso.id)) t.preso = null;
      if (t.fac && !facs.has(t.fac)) t.fac = null;
      for (const k of ['tit', 'herd', 'reg']) if (t[k] && !ps.has(t[k])) t[k] = null;
      if (t.herd && t.herd === t.tit) t.herd = null;
      if (t.reg && t.reg === t.tit) t.reg = null;
      if (!t.tit) t.desde = null;
      t.pret = t.pret.filter(x => ps.has(x.p) && x.p !== t.tit);
      for (const x of t.hist) { if (x.p && !ps.has(x.p)) x.p = null; if (x.p) x.nome = ps.get(x.p).nome; }
      t.hist = t.hist.filter(x => x.p || x.nome);
    }
  }

  /* ---------------- (lote 11, parte 3a) a diplomacia: os tratados e a opinião entre as facções ----------------
     dipl = { tipos: [{ id, nome }] (os tipos de tratado; sem a lista guardada, os de começo), tratados: [{ id, tipo,
     partes (as facções: duas ou mais), ini (o começo, pela data do mundo), fim (o prazo; sem ele, sem prazo), pub (os
     jogadores sabem), txt (os termos), nota (do mestre), enc (a data em que foi encerrado; sem ela, vale) }], opin: [{ de,
     sobre (as facções), motivos: [{ id, txt, v (de −100 a +100), ate (o prazo do motivo; sem ele, fica) }] }] (a opinião
     de uma facção sobre outra: a soma dos motivos, de −100 a +100) }. Só quando há algo (o mapa de antes fica igual).
     (parte 3b) vassalos: [{ vas (a facção vassala), sus (a suserana), desde, trib ({ rec, q }: o tributo por semana, um
     recurso da economia; sem ele, sem tributo) }] (uma suserana por vassala; ninguém é suserano de si mesmo pela cadeia);
     e, em cada tratado, trocas: [{ de, para (duas das partes), rec, q }] (o que vai de uma para a outra por semana).
     (parte 3c) motivosGuerra: [{ id, de (a facção que tem o motivo), contra (a outra), txt (o motivo), vale (ainda vale),
     tit e p (o título e o pretendente de onde veio a sugestão; null sem ela) }] (só do mestre). */
  const TIPOS_TRATADO = [{ id: 'alianca', nome: 'Aliança' }, { id: 'paz', nome: 'Paz ou trégua' }, { id: 'comercio', nome: 'Comércio' }, { id: 'passagem', nome: 'Passagem livre' }];
  const MAX_TRATADOS = 200, MAX_TIPOS_TRAT = 16, MAX_PARTES = 12, MAX_OPIN = 600, MAX_MOTIVOS_OP = 20, MAX_TXT_DIPL = 600;
  const MAX_VASSALOS = 100, MAX_TROCAS = 12, MAX_QTD_DIPL = 1e9, MAX_MOT_GUERRA = 300, MAX_TXT_MOT_GUERRA = 160;
  // (parte 3b) uma quantidade por semana (o tributo, a troca): positiva, com duas casas; 0 se não serve
  const qtdDipl = v => { const n = num(v, 0); return n > 0 ? arred(Math.min(n, MAX_QTD_DIPL)) : 0; };
  function normDipl(v, cal) {
    if (!ehObj(v)) return null;
    let tipos = null;
    if (Array.isArray(v.tipos)) {
      tipos = [];
      const vt = new Set();
      for (const t of v.tipos) {
        if (!ehObj(t) || tipos.length >= MAX_TIPOS_TRAT) continue;
        const id = idOk(t.id);
        if (!id || vt.has(id)) continue;
        vt.add(id);
        tipos.push({ id, nome: texto(t.nome, '', 40).trim() || 'Tratado' });
      }
    }
    const tratados = [], vtr = new Set();
    for (const t of Array.isArray(v.tratados) ? v.tratados : []) {
      if (!ehObj(t) || tratados.length >= MAX_TRATADOS) continue;
      const id = idOk(t.id);
      if (!id || vtr.has(id)) continue;
      vtr.add(id);
      const partes = [...new Set((Array.isArray(t.partes) ? t.partes : []).map(idOk).filter(Boolean))].slice(0, MAX_PARTES);
      // (parte 3b) as trocas por semana
      const trocas = [];
      for (const y of Array.isArray(t.trocas) ? t.trocas : []) {
        if (!ehObj(y) || trocas.length >= MAX_TROCAS) continue;
        const de = idOk(y.de), para = idOk(y.para), rec = idOk(y.rec), q = qtdDipl(y.q);
        if (de && para && de !== para && rec && q) trocas.push({ de, para, rec, q });
      }
      tratados.push({ id, tipo: idRef(t.tipo), partes, ini: normDataP(t.ini, cal), fim: normDataP(t.fim, cal), pub: sim(t.pub), txt: texto(t.txt, '', MAX_TXT_DIPL).trim(),
        nota: texto(t.nota, '', MAX_TXT_DIPL).trim(), enc: normDataP(t.enc, cal), trocas });
    }
    const opin = [], vo = new Set();
    for (const o of Array.isArray(v.opin) ? v.opin : []) {
      if (!ehObj(o) || opin.length >= MAX_OPIN) continue;
      const de = idOk(o.de), sobre = idOk(o.sobre);
      if (!de || !sobre || de === sobre || vo.has(de + '>' + sobre)) continue;
      const motivos = [], vm = new Set();
      for (const x of Array.isArray(o.motivos) ? o.motivos : []) {
        if (!ehObj(x) || motivos.length >= MAX_MOTIVOS_OP) continue;
        const mid = idOk(x.id);
        if (!mid || vm.has(mid)) continue;
        vm.add(mid);
        motivos.push({ id: mid, txt: texto(x.txt, '', 120).trim() || 'Sem motivo', v: inteiro(x.v, 0, -100, 100), ate: normDataP(x.ate, cal) });
      }
      if (!motivos.length) continue;
      vo.add(de + '>' + sobre);
      opin.push({ de, sobre, motivos });
    }
    // (parte 3b) a vassalagem: uma suserana por vassala
    const vassalos = [], vv = new Set();
    for (const x of Array.isArray(v.vassalos) ? v.vassalos : []) {
      if (!ehObj(x) || vassalos.length >= MAX_VASSALOS) continue;
      const vas = idOk(x.vas), sus = idOk(x.sus);
      if (!vas || !sus || vas === sus || vv.has(vas)) continue;
      vv.add(vas);
      const q = ehObj(x.trib) ? qtdDipl(x.trib.q) : 0, rec = ehObj(x.trib) ? idOk(x.trib.rec) : '';
      vassalos.push({ vas, sus, desde: normDataP(x.desde, cal), trib: rec && q ? { rec, q } : null });
    }
    // (parte 3c) os motivos de guerra de cada facção contra outra
    const motivosGuerra = [], vg = new Set();
    for (const x of Array.isArray(v.motivosGuerra) ? v.motivosGuerra : []) {
      if (!ehObj(x) || motivosGuerra.length >= MAX_MOT_GUERRA) continue;
      const id = idOk(x.id), de = idOk(x.de), contra = idOk(x.contra);
      if (!id || vg.has(id) || !de || !contra || de === contra) continue;
      vg.add(id);
      motivosGuerra.push({ id, de, contra, txt: texto(x.txt, '', MAX_TXT_MOT_GUERRA).trim() || 'Sem motivo', vale: x.vale == null ? true : sim(x.vale), tit: idRef(x.tit), p: idRef(x.p) });
    }
    if (!tipos && !tratados.length && !opin.length && !vassalos.length && !motivosGuerra.length) return null;
    const out = { tratados, opin, vassalos, motivosGuerra };
    if (tipos) out.tipos = tipos;
    return out;
  }
  // a diplomacia com o mapa todo: só as facções que existem (o tratado com menos de duas sai); o tipo, um dos tipos
  function conferirDipl(d, facs, recs, corte) {
    const tipos = new Set((d.tipos || TIPOS_TRATADO).map(t => t.id));
    for (const t of d.tratados) { t.partes = t.partes.filter(f => facs.has(f)); if (t.tipo && !tipos.has(t.tipo)) t.tipo = null; }
    d.tratados = d.tratados.filter(t => t.partes.length >= 2);
    d.opin = d.opin.filter(o => facs.has(o.de) && facs.has(o.sobre));
    /* (parte 3b) as trocas: entre duas das partes, de um recurso da economia; a vassalagem: entre facções que existem,
       sem círculo (a que fecharia o círculo sai), com o tributo de um recurso da economia */
    for (const t of d.tratados) t.trocas = t.trocas.filter(y => t.partes.includes(y.de) && t.partes.includes(y.para) && recs.has(y.rec));
    d.vassalos = d.vassalos.filter(x => facs.has(x.vas) && facs.has(x.sus));
    const sus = new Map();                                      // as aceitas até aqui (sem círculo: a cadeia sempre acaba)
    d.vassalos = d.vassalos.filter(x => {
      for (let p = x.sus; p; p = sus.get(p)) if (p === x.vas) return false;
      sus.set(x.vas, x.sus);
      return true;
    });
    for (const x of d.vassalos) if (x.trib && !recs.has(x.trib.rec)) x.trib = null;
    // (parte 3c) os motivos de guerra: entre facções que existem; o título e o pretendente, só os que existem
    const tits = new Set(corte ? corte.titulos.map(t => t.id) : []), pess = new Set(corte ? corte.pessoas.map(q => q.id) : []);
    d.motivosGuerra = d.motivosGuerra.filter(x => facs.has(x.de) && facs.has(x.contra));
    for (const x of d.motivosGuerra) { if (!tits.has(x.tit)) x.tit = null; if (!pess.has(x.p)) x.p = null; }
  }

  /* ---------------- (lote 11, parte 4a) as intrigas e os segredos ----------------
     intr = { segredos: [{ id, txt (o segredo), de ({ t, id }: de quem é — 'p' um personagem, 'c' uma casa, 'f' uma facção,
     't' um título, 'tr' um tratado, 'r' uma região, 'm' um lugar do mapa; null: um segredo do mundo), sabem ({ p, f }: os
     personagens e as facções que sabem), jog (os jogadores sabem: o mestre revelou), boato (é boato: talvez seja verdade,
     talvez não), falso (é falso; só com boato), nota (do mestre) }] }. Só quando há algo (o mapa de antes fica igual).
     (parte 4b) intrigas: [{ id, nome, estado ('plano' | 'andamento' | 'descoberta' | 'concluida' | 'fracassou'), quem
     ({ p: os personagens que tramam, f: a facção por trás, ou null }), alvos ([{ t, id }]: um personagem, uma casa, uma
     facção, um título, uma região ou um lugar), obj (o objetivo), passos ([{ id, txt, feito }]), segredos (os segredos
     que ela usa), sabem ({ p, f }: quem já sabe), txtJ (o texto para os jogadores), ver (os jogadores veem; só com o
     texto), nota }]. */
  const TIPOS_DONO = ['p', 'c', 'f', 't', 'tr', 'r', 'm'], TIPOS_ALVO = ['p', 'c', 'f', 't', 'r', 'm'];
  const ESTADOS_INTRIGA = ['plano', 'andamento', 'descoberta', 'concluida', 'fracassou'];
  const MAX_SEGREDOS = 300, MAX_SABEM = 24, MAX_TXT_INTR = 600, MAX_INTRIGAS = 200, MAX_PASSOS = 20, MAX_ALVOS = 8, MAX_QUEM = 12, MAX_SEG_INTRIGA = 12;
  const normDono = v => (ehObj(v) && TIPOS_DONO.includes(v.t) && idOk(v.id) ? { t: v.t, id: v.id } : null);
  const listaIds = (v, max) => [...new Set((Array.isArray(v) ? v : []).map(idOk).filter(Boolean))].slice(0, max);
  const normSabem = v => ({ p: listaIds(ehObj(v) ? v.p : null, MAX_SABEM), f: listaIds(ehObj(v) ? v.f : null, MAX_SABEM) });
  function normIntr(v) {
    if (!ehObj(v)) return null;
    const segredos = [], vs = new Set();
    for (const x of Array.isArray(v.segredos) ? v.segredos : []) {
      if (!ehObj(x) || segredos.length >= MAX_SEGREDOS) continue;
      const id = idOk(x.id);
      if (!id || vs.has(id)) continue;
      vs.add(id);
      const boato = sim(x.boato);
      segredos.push({ id, txt: texto(x.txt, '', MAX_TXT_INTR).trim() || 'Segredo sem texto', de: normDono(x.de), sabem: normSabem(x.sabem), jog: sim(x.jog), boato,
        falso: boato && sim(x.falso), nota: texto(x.nota, '', MAX_TXT_INTR).trim() });
    }
    // (parte 4b) as intrigas
    const intrigas = [], vi = new Set();
    for (const x of Array.isArray(v.intrigas) ? v.intrigas : []) {
      if (!ehObj(x) || intrigas.length >= MAX_INTRIGAS) continue;
      const id = idOk(x.id);
      if (!id || vi.has(id)) continue;
      vi.add(id);
      const q = ehObj(x.quem) ? x.quem : {}, alvos = [], va = new Set(), passos = [], vp = new Set();
      for (const a of Array.isArray(x.alvos) ? x.alvos : []) {
        const d = ehObj(a) && TIPOS_ALVO.includes(a.t) ? normDono(a) : null;
        if (!d || alvos.length >= MAX_ALVOS || va.has(d.t + ':' + d.id)) continue;
        va.add(d.t + ':' + d.id);
        alvos.push(d);
      }
      for (const y of Array.isArray(x.passos) ? x.passos : []) {
        if (!ehObj(y) || passos.length >= MAX_PASSOS) continue;
        const pid = idOk(y.id);
        if (!pid || vp.has(pid)) continue;
        vp.add(pid);
        passos.push({ id: pid, txt: texto(y.txt, '', 160).trim() || 'Passo sem texto', feito: sim(y.feito) });
      }
      const txtJ = texto(x.txtJ, '', MAX_TXT_INTR).trim();          // sem o texto para eles, os jogadores não veem
      intrigas.push({ id, nome: texto(x.nome, '', 80).trim(), estado: ESTADOS_INTRIGA.includes(x.estado) ? x.estado : 'plano', quem: { p: listaIds(q.p, MAX_QUEM), f: idRef(q.f) },
        alvos, obj: texto(x.obj, '', MAX_TXT_INTR).trim(), passos, segredos: listaIds(x.segredos, MAX_SEG_INTRIGA), sabem: normSabem(x.sabem),
        txtJ, ver: sim(x.ver) && !!txtJ, nota: texto(x.nota, '', MAX_TXT_INTR).trim() });
    }
    return segredos.length || intrigas.length ? { segredos, intrigas } : null;
  }
  /* as intrigas e os segredos com o mapa todo: o dono que não existe mais sai (o segredo fica, do mundo); quem sabe, só os
     personagens e as facções que existem */
  function conferirIntr(d, mapa) {
    const c = mapa.corte, ids = l => new Set((l || []).map(x => x.id));
    const ex = { p: ids(c && c.pessoas), c: ids(c && c.casas), f: ids(mapa.faccoes), t: ids(c && c.titulos), tr: ids(mapa.dipl && mapa.dipl.tratados),
      r: ids(mapa.objs.filter(o => o.k === 'r')), m: ids(mapa.objs.filter(o => o.k === 'm')) };
    for (const s of d.segredos) {
      if (s.de && !ex[s.de.t].has(s.de.id)) s.de = null;
      s.sabem = { p: s.sabem.p.filter(id => ex.p.has(id)), f: s.sabem.f.filter(id => ex.f.has(id)) };
    }
    // (parte 4b) as intrigas: quem trama, os alvos, os segredos e quem sabe, só os que existem
    const sgs = ids(d.segredos);
    for (const x of d.intrigas) {
      x.quem = { p: x.quem.p.filter(id => ex.p.has(id)), f: ex.f.has(x.quem.f) ? x.quem.f : null };
      x.alvos = x.alvos.filter(a => ex[a.t].has(a.id));
      x.segredos = x.segredos.filter(id => sgs.has(id));
      x.sabem = { p: x.sabem.p.filter(id => ex.p.has(id)), f: x.sabem.f.filter(id => ex.f.has(id)) };
    }
  }

  function normGuerra(v, terrenos, nMeses) {
    if (!ehObj(v)) return null;
    const g = { tipos: normTiposGuerra(v.tipos), bats: normBatalhas(v.bats), hexes: normHexGuerra(v.hexes) };
    // (lote 12, parte 12a) as regras da campanha e a forragem (só quando há: o mapa de antes fica igual)
    const regras = normRegrasCampanha(v.regras, terrenos, nMeses);
    if (regras) g.regras = regras;
    const forr = normForragem(v.forr);
    if (forr.length) g.forr = forr;
    const pres = normPresenca(v.pres);                           // (parte 12b) os dias contados para a ocupação (e a libertação)
    if (Object.keys(pres).length) g.pres = pres;
    if (Array.isArray(v.maqs)) g.maqs = normMaqs(v.maqs);        // (parte 12d) os tipos de máquina do mestre (sem eles, os de começo)
    return g.tipos.length || g.bats.length || Object.keys(g.hexes).length || g.regras || g.forr || g.pres || g.maqs ? g : null;
  }
  /* (lote 12, parte 12b) os dias contados para a ocupação de cada região (e, com lib, para a libertação): { região: { fac
     (quem conta), n (os dias seguidos), lib } } */
  const MAX_PRES = 2000;
  function normPresenca(v) {
    const out = {};
    let k = 0;
    for (const id of ehObj(v) ? Object.keys(v) : []) {
      const x = v[id], r = idOk(id), fac = ehObj(x) ? idRef(x.fac) : null, n = ehObj(x) ? inteiro(x.n, 0, 0, 1e6) : 0;
      if (!r || !fac || !(n > 0) || k >= MAX_PRES) continue;
      out[r] = { fac, n };
      if (sim(x.lib)) out[r].lib = true;
      k++;
    }
    return out;
  }
  /* (lote 12, parte 12a) As regras da campanha (o mestre muda; sem elas, as de começo): teto (os dias de comida que o
     exército leva ao se reabastecer), custo (quanto do recurso de comida da facção custa cada mantimento), forr (a % do
     que ele come que colhe na terra inimiga ou sem dono), fome, terreno e inverno (a % das tropas que se perde por dia:
     sem comida, em terreno duro e, a mais, no inverno), cerco (a % por dia de cerco, dos dois lados), duros (os terrenos
     duros), meses (os meses de inverno; null: os da estação do calendário) e ocupar (os dias sem defensor para a
     proposta de ocupação). */
  const CAMPANHA_PADRAO = { teto: 10, custo: 1, forr: 50, fome: 2, terreno: 1, inverno: 1, cerco: 1, duros: ['mo', 'pa', 'de', 'ne', 'se', 'lv', 'tu', 'tc'], meses: null, ocupar: 3 };
  const MAX_FORR = 500;
  function normRegrasCampanha(v, terrenos, nMeses) {
    if (!ehObj(v)) return null;
    const P = CAMPANHA_PADRAO, pct = (x, p) => Math.round(limitar(num(x, p), 0, 100) * 10) / 10;
    const ters = new Set((Array.isArray(terrenos) ? terrenos : TERRENOS_PADRAO).map(t => t.id)), n = Number.isInteger(nMeses) && nMeses > 0 ? nMeses : 12;
    return { teto: inteiro(v.teto, P.teto, 1, 365), custo: Math.round(limitar(num(v.custo, P.custo), 0, 1000) * 100) / 100, forr: pct(v.forr, P.forr),
      fome: pct(v.fome, P.fome), terreno: pct(v.terreno, P.terreno), inverno: pct(v.inverno, P.inverno), cerco: pct(v.cerco, P.cerco),
      duros: (Array.isArray(v.duros) ? listaIds(v.duros, MAX_TER) : P.duros.slice()).filter(id => ters.has(id)),
      meses: Array.isArray(v.meses) ? [...new Set(v.meses.map(x => inteiro(x, -1, -1, 999)).filter(x => x >= 0 && x < n))].sort((a, b) => a - b) : null,
      ocupar: inteiro(v.ocupar, P.ocupar, 1, 365) };
  }
  /* A forragem que os exércitos fizeram, por região e por semana (a semana da economia tira da produção de comida da
     região): [{ r, s, n }], uma linha por região e semana (as repetidas somam). */
  function normForragem(v) {
    const out = [], por = new Map();
    for (const x of Array.isArray(v) ? v : []) {
      if (!ehObj(x)) continue;
      const r = idOk(x.r), s = inteiro(x.s, NaN, -1e6, 1e6), n = Math.round(limitar(num(x.n, 0), 0, 1e9) * 100) / 100;
      if (!r || !Number.isFinite(s) || !(n > 0)) continue;
      const k = r + '|' + s;
      if (por.has(k)) { const y = por.get(k); y.n = Math.round((y.n + n) * 100) / 100; continue; }
      if (out.length >= MAX_FORR) continue;
      const y = { r, s, n };
      por.set(k, y); out.push(y);
    }
    return out;
  }
  // as tropas do exército, o consumo de mantimentos por dia (o escolhido, ou um por cem soldados) e quantos dias duram
  const tropasDe = exe => (exe && Array.isArray(exe.unid) ? exe.unid.reduce((s, u) => s + (u.tropas || 0), 0) : 0);
  const consumoDe = exe => (!exe ? 0 : exe.cons != null ? exe.cons : Math.ceil(tropasDe(exe) / 100));
  const diasDeMantimento = exe => { const c = consumoDe(exe); return c > 0 ? Math.floor((exe.mant || 0) / c) : Infinity; };

  /* ---------------- a honra dos grupos (lote 6) ----------------
     Cada mudança fica no histórico do grupo: a data do mundo (d), de quanto para quanto e o motivo — todos veem. */
  function normHonras(v) {
    const out = [];
    for (const e of Array.isArray(v) ? v.slice(-MAX_HIST) : []) {
      if (!ehObj(e)) continue;
      const de = inteiro(e.de, NaN, -MAX_HONRA, MAX_HONRA), para = inteiro(e.para, NaN, -MAX_HONRA, MAX_HONRA);
      if (!Number.isFinite(de) || !Number.isFinite(para) || de === para) continue;
      out.push({ d: inteiro(e.d, 0, 0, 1e9), de, para, mot: texto(e.mot, '', MAX_MOTIVO).trim() });
    }
    return out;
  }
  // A honra nova de um grupo (no rascunho de App.mudar): o valor e a linha do histórico. false: nada mudou.
  function mudarHonra(g, para, dia, mot) {
    if (!ehObj(g)) return false;
    const de = inteiro(g.honra, 0, -MAX_HONRA, MAX_HONRA), p = inteiro(para, de, -MAX_HONRA, MAX_HONRA);
    if (p === de) return false;
    g.honra = p;
    g.hhist = (Array.isArray(g.hhist) ? g.hhist : []).concat([{ d: inteiro(dia, 0, 0, 1e9), de, para: p, mot: texto(mot, '', MAX_MOTIVO).trim() }]).slice(-MAX_HIST);
    return true;
  }

  /* ---------------- o painel das facções (lote 6) ----------------
     Recursos (uma lista livre: nome e número), população e apoio geral (%). Cada mudança nesses números entra sozinha
     no histórico da facção: a data do mundo, o motivo e o que mudou ([campo, nome, de, para]; campo 'pop', 'apoio' ou
     'r:' + o id do recurso; de null = o recurso nasceu, para null = saiu). No mesmo dia e com o mesmo motivo, as
     mudanças juntam numa linha só. Tudo começa só com o mestre: ele marca o que os jogadores veem. */
  const numFac = v => { const n = num(v, NaN); return Number.isFinite(n) ? Math.round(limitar(n, -MAX_NUM, MAX_NUM) * 100) / 100 || 0 : null; };
  const numPop = v => { const n = num(v, NaN); return Number.isFinite(n) ? Math.round(limitar(n, 0, MAX_NUM)) : null; };
  const numApoio = v => { const n = num(v, NaN); return Number.isFinite(n) ? Math.round(limitar(n, 0, 100)) : null; };
  function normRecursos(v) {
    const out = [], vistos = new Set();
    for (const r of Array.isArray(v) ? v : []) {
      if (!ehObj(r) || out.length >= MAX_REC) continue;
      const n = numFac(r.n);
      out.push({ id: unico(idOk(r.id) || 'rc' + out.length, vistos), nome: texto(r.nome, '', 60), n: n == null ? 0 : n, ver: sim(r.ver) });
    }
    return out;
  }
  const campoFac = c => (c === 'pop' || c === 'apoio' ? c : typeof c === 'string' && c.slice(0, 2) === 'r:' && idOk(c.slice(2)) ? c : '');
  function normHistFac(v) {
    const out = [];
    for (const e of Array.isArray(v) ? v.slice(-MAX_FHIST) : []) {
      if (!ehObj(e) || !Array.isArray(e.mud)) continue;
      const mud = [];
      for (const x of e.mud) {
        if (!Array.isArray(x) || mud.length >= MAX_MUD) continue;
        const campo = campoFac(x[0]), de = numFac(x[2]), para = numFac(x[3]);
        if (!campo || de === para || mud.some(y => y[0] === campo)) continue;
        mud.push([campo, texto(x[1], '', 60), de, para]);
      }
      if (mud.length) out.push({ d: inteiro(e.d, 0, 0, 1e9), mot: texto(e.mot, '', MAX_MOTIVO).trim(), mud });
    }
    return out;
  }
  // Uma mudança no histórico da facção (no rascunho): junta com a última linha quando é do mesmo dia e motivo.
  function anotarFac(f, campo, nome, de, para, dia, mot) {
    if (!Array.isArray(f.hist)) f.hist = [];
    const d = inteiro(dia, 0, 0, 1e9), m = texto(mot, '', MAX_MOTIVO).trim(), u = f.hist[f.hist.length - 1];
    if (u && u.d === d && u.mot === m && Array.isArray(u.mud)) {
      const x = u.mud.find(y => y[0] === campo);
      if (x) { x[1] = nome || x[1]; x[3] = para; if (x[2] === x[3]) u.mud.splice(u.mud.indexOf(x), 1); }
      else if (de !== para && u.mud.length < MAX_MUD) u.mud.push([campo, nome || '', de, para]);
      if (!u.mud.length) f.hist.pop();
    } else if (de !== para) f.hist.push({ d, mot: m, mud: [[campo, nome || '', de, para]] });
    if (f.hist.length > MAX_FHIST) f.hist.splice(0, f.hist.length - MAX_FHIST);
  }
  /* Mudar um número da facção (no rascunho de App.mudar): campo 'pop', 'apoio' ou 'r:' + id do recurso. O valor vai
     para o histórico sozinho. false: nada mudou (ou o campo não existe). */
  function facMudar(f, campo, valor, dia, mot) {
    if (!ehObj(f)) return false;
    if (campo === 'pop' || campo === 'apoio') {
      const de = f[campo] == null ? null : f[campo], para = campo === 'pop' ? numPop(valor) : numApoio(valor);
      if (de === para) return false;
      f[campo] = para;
      anotarFac(f, campo, '', de, para, dia, mot);
      return true;
    }
    const r = campoFac(campo) && Array.isArray(f.rec) ? f.rec.find(x => 'r:' + x.id === campo) : null, para = numFac(valor);
    if (!r || para == null || r.n === para) return false;
    const de = r.n;
    r.n = para;
    anotarFac(f, campo, r.nome, de, para, dia, mot);
    return true;
  }
  // Um recurso novo na facção (no rascunho): entra no histórico como nascido (de nada para o número). → o id
  function facNovoRecurso(f, nome, n, dia, mot) {
    if (!ehObj(f)) return null;
    if (!Array.isArray(f.rec)) f.rec = [];
    if (f.rec.length >= MAX_REC) return null;
    const vistos = new Set(f.rec.map(r => r.id)), id = unico(novoId('rc'), vistos), v = numFac(n);
    const r = { id, nome: texto(nome, '', 60).trim() || 'Recurso', n: v == null ? 0 : v, ver: false };
    f.rec.push(r);
    anotarFac(f, 'r:' + id, r.nome, null, r.n, dia, mot);
    return id;
  }
  // Tirar um recurso (no rascunho): o histórico guarda que ele saiu (do número para nada).
  function facTirarRecurso(f, id, dia, mot) {
    const i = ehObj(f) && Array.isArray(f.rec) ? f.rec.findIndex(r => r.id === id) : -1;
    if (i < 0) return false;
    const r = f.rec[i];
    f.rec.splice(i, 1);
    anotarFac(f, 'r:' + id, r.nome, r.n, null, dia, mot);
    return true;
  }
  // Os terrenos novos que o mapa ainda não tem (nem com o mesmo id, nem com o mesmo nome), cabendo no limite.
  function terrenosQueFaltam(mapa) {
    const ts = ehObj(mapa) && Array.isArray(mapa.terrenos) ? mapa.terrenos : [];
    const ids = new Set(ts.map(t => t.id)), nomes = new Set(ts.map(t => String(t.nome || '').trim().toLowerCase()));
    return TERRENOS_NOVOS.filter(t => !ids.has(t.id) && !nomes.has(t.nome.toLowerCase())).slice(0, Math.max(0, MAX_TER - ts.length)).map(t => copia(t));
  }
  /* (lote 8) A bandeira do clã ligado à facção, como a projeção a leva aos jogadores (f.br): a forma, a divisão, as duas
     cores, o símbolo e a imagem (só a do banco, https). Quem desenha (ClaNucleo.brasaoSvg) confere tudo de novo. */
  const palavraBr = v => (typeof v === 'string' && /^[a-z]{2,16}$/.test(v) ? v : null);
  function normBr(b) {
    if (!ehObj(b)) return null;
    const cs = Array.isArray(b.cores) ? b.cores.map(x => cor(x, null)) : [];
    if (!cs[0] || !cs[1]) return null;
    return { forma: palavraBr(b.forma) || 'escudo', div: palavraBr(b.div) || 'partido', cores: [cs[0], cs[1]],
      simb: typeof b.simb === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(b.simb) ? b.simb : null,
      img: typeof b.img === 'string' && b.img.length <= 600 && /^https:\/\/[^\s"'<>]+$/i.test(b.img) ? b.img : null };
  }
  function normFaccoes(v) {
    const out = [], vistos = new Set(), crus = [];
    (Array.isArray(v) ? v : []).forEach((f, i) => {
      if (!ehObj(f) || out.length >= MAX_FAC) return;
      const ver = ehObj(f.ver) ? f.ver : {};
      const fac = { id: unico(idOk(f.id) || 'fc_' + i, vistos), nome: texto(f.nome), cor: cor(f.cor, CORES[i % CORES.length]), txt: texto(f.txt), nota: texto(f.nota), oculta: talvez(f.oculta), rel: {},
        rec: normRecursos(f.rec), pop: numPop(f.pop), apoio: numApoio(f.apoio), ver: { pop: sim(ver.pop), apoio: sim(ver.apoio), hist: sim(ver.hist) }, hist: normHistFac(f.hist) };
      const br = normBr(f.br);
      if (br) fac.br = br;
      const band = normBr(f.band);                               // a bandeira própria da facção (sem clã; a do clã vale antes)
      if (band) fac.band = band;
      if (sim(f.jog) && !out.some(x => x.jog)) fac.jog = true;    // (lote 10) a facção dos jogadores (uma só): as terras deles (vai na projeção)
      out.push(fac);
      crus.push(ehObj(f.rel) ? f.rel : {});
    });
    // Relação vale para os dois lados; se um lado só tem, vale para os dois; se discordam, vale o da facção que vem antes.
    const ids = new Set(out.map(f => f.id)), par = new Map(), chave = (a, b) => (a < b ? a + '\n' + b : b + '\n' + a);
    out.forEach((f, i) => {
      for (const k of Object.keys(crus[i])) {
        const r = crus[i][k];
        if (k === f.id || !ids.has(k) || !tem(RELACOES, r)) continue;
        if (!par.has(chave(f.id, k))) par.set(chave(f.id, k), r);
      }
    });
    for (const f of out) for (const g of out) if (g !== f && par.has(chave(f.id, g.id))) f.rel[g.id] = par.get(chave(f.id, g.id));
    return out;
  }
  function normalizar(x) {
    const m = ehObj(x) ? x : {};
    const img = normImg(m.img, m.larg, m.alt);
    const cal = normCal(m.cal);
    const nev = ehObj(m.nevoa) ? m.nevoa : {};
    const mapa = {
      v: 1, id: idOk(m.id) || novoId('mp'), nome: texto(m.nome, 'Mundo conhecido').trim() || 'Mapa sem nome', oculto: talvez(m.oculto),
      img, larg: img ? img.w : inteiro(m.larg, 2000, 100, 30000), alt: img ? img.h : inteiro(m.alt, 1400, 100, 30000),
      grade: normGrade(m.grade, m.escala), terrenos: null, hexes: null, pintura: null,
      cal, nevoa: { on: sim(nev.on), ops: normOps(nev.ops) },
      faccoes: normFaccoes(m.faccoes), objs: [],
    };
    // (lote 7, parte 5c) o clima (só quando há algo: o mapa de antes fica igual)
    const clima = normClima(m.clima, mesesDe(cal).length);
    if (Object.keys(clima).length) mapa.clima = clima;
    mapa.terrenos = normTerrenos(m.terrenos);
    mapa.hexes = normHexes(m.hexes, mapa.terrenos);
    mapa.pintura = normPintura(m.pintura, mapa.terrenos);
    const guerra = normGuerra(m.guerra, mapa.terrenos, mesesDe(cal).length);   // (lote 8, parte 6) os tipos de tropa, as batalhas, os hexágonos (lote 12: as regras da campanha, a forragem)
    if (guerra) mapa.guerra = guerra;
    const eco = normEco(m.eco, mapa.terrenos, mapa.guerra ? mapa.guerra.tipos.map(t => t.id) : [], cal);   // (lote 10) a economia do mundo (só quando há: o mapa de antes fica igual)
    if (eco) mapa.eco = eco;
    const ecoJ = normEcoJ(m.ecoJ);                               // (parte 6) na projeção: a economia da facção dos jogadores
    if (ecoJ) mapa.ecoJ = ecoJ;
    const corte = normCorte(m.corte, cal);                       // (lote 11) a corte: os personagens do mundo e as casas
    if (corte) mapa.corte = corte;
    const dipl = normDipl(m.dipl, cal);                          // (lote 11, parte 3a) a diplomacia: os tratados e a opinião
    if (dipl) mapa.dipl = dipl;
    const intr = normIntr(m.intr);                               // (lote 11, parte 4a) as intrigas e os segredos
    if (intr) mapa.intr = intr;
    const vistos = new Set();
    (Array.isArray(m.objs) ? m.objs : []).forEach((o, i) => {
      if (mapa.objs.length >= MAX_OBJS) return;
      const n = normObj(o, cal.dia, false, cal.tpd);
      if (!n) return;
      n.id = unico(n.id || PREFIXO[n.k] + '_' + i, vistos);
      mapa.objs.push(n);
    });
    // referências para o que não existe viram null
    const facs = new Set(mapa.faccoes.map(f => f.id)), rotas = new Map(), tiposG = new Set(mapa.guerra ? mapa.guerra.tipos.map(t => t.id) : []);
    const recIds = new Set(mapa.eco ? mapa.eco.rec.map(r => r.id) : []), nivIds = new Set(mapa.eco ? mapa.eco.niv.map(n => n.id) : []);
    if (mapa.ecoJ && !mapa.faccoes.some(f => f.jog && f.id === mapa.ecoJ.fac)) delete mapa.ecoJ;     // (parte 6) é a da facção dos jogadores
    if (mapa.ecoJ) for (const x of mapa.ecoJ.trocas) if (!facs.has(x.com)) x.com = null;       // (lote 11, parte 3b) com quem: uma que existe
    for (const o of mapa.objs) if (o.k === 't') rotas.set(o.id, o);
    for (const o of mapa.objs) {
      if (o.k === 'r' && !facs.has(o.fac)) o.fac = null;
      if (o.k === 'f' || o.k === 'z') { if (!facs.has(o.a)) o.a = null; if (!facs.has(o.b)) o.b = null; }
      if (o.k === 'g') {
        if (!facs.has(o.fac)) o.fac = null;                   // (lote 8) a facção do grupo tem de existir
        if (!rotas.has(o.rota)) o.rota = null;
        if (!o.rota) { o.prog = 0; delete o.bol; delete o.sentido; delete o.espera; }
      }
      // (lote 7, parte 5b) o evento que andava por uma rota que não existe mais fica parado onde está
      if (o.k === 'e' && o.rota && !rotas.has(o.rota)) { delete o.rota; delete o.prog; delete o.pt; delete o.modo; delete o.sentido; }
      // (lote 8, parte 6) a unidade de um tipo que não existe mais fica sem tipo
      if (o.k === 'g' && o.exe) for (const u of o.exe.unid) if (u.tipo && !tiposG.has(u.tipo)) u.tipo = null;
      // (lote 10) a produção do mestre só dos recursos do mundo; o nível do assentamento, só um dos da economia
      if (o.k === 'r' && o.prod) { const p = normTabProd(o.prod, recIds); if (Object.keys(p).length) o.prod = p; else delete o.prod; }
      if (o.k === 'm' && o.ass) {
        if (o.ass.niv && !nivIds.has(o.ass.niv)) o.ass.niv = null;
        conferirAss(o.ass, mapa.eco, facs);                     // (parte 3) as construções e a sede do clã
        if (!o.ass.niv && !o.ass.pop && !o.ass.cons && !o.ass.cla && !o.ass.guildas) delete o.ass;
      }
    }
    if (mapa.corte) conferirCorte(mapa.corte, facs, mapa.objs);   // (lote 11) as referências da corte
    if (mapa.dipl) conferirDipl(mapa.dipl, facs, recIds, mapa.corte);   // (lote 11, parte 3a) as facções dos tratados e da opinião (3b: os recursos; 3c: a corte)
    if (mapa.intr) conferirIntr(mapa.intr, mapa);                // (lote 11, parte 4a) os donos dos segredos e quem sabe
    if (mapa.guerra && mapa.guerra.forr) {                        // (lote 12, parte 12a) a forragem, só nas regiões que existem
      const rs = new Set(mapa.objs.filter(o => o.k === 'r').map(o => o.id));
      mapa.guerra.forr = mapa.guerra.forr.filter(x => rs.has(x.r));
      if (!mapa.guerra.forr.length) delete mapa.guerra.forr;
      if (!mapa.guerra.tipos.length && !mapa.guerra.bats.length && !Object.keys(mapa.guerra.hexes).length && !mapa.guerra.regras && !mapa.guerra.forr && !mapa.guerra.pres && !mapa.guerra.maqs) delete mapa.guerra;
    }
    // a região de dentro de outra: o pai tem de existir (e ser região), e subindo pelos pais não se volta a ela
    const regs = new Map();
    for (const o of mapa.objs) if (o.k === 'r') regs.set(o.id, o);
    for (const o of mapa.objs) {
      if (o.k !== 'r' || !o.pai) continue;
      if (o.pai === o.id || !regs.has(o.pai)) { o.pai = null; continue; }
      let p = o, n = 0;
      while (p && p.pai && n <= MAX_NIVEL) { p = regs.get(p.pai); n++; if (p === o) break; }
      if (p === o || n > MAX_NIVEL) o.pai = null;
    }
    // (lote 12, parte 12b) a ocupação: de uma facção que existe e que não é a dona (sem a facção: só na projeção, ocupada
    // por quem os jogadores não veem); a contagem dos dias, só nas regiões e com as facções que existem
    for (const o of mapa.objs) {
      if (!o.ocup) continue;
      const dono = o.k === 'r' ? facDaRegiao(mapa, o) : (r => (r ? facDaRegiao(mapa, r) : null))(regiaoEm(mapa, o.x, o.y));
      if ((o.ocup.fac && !facs.has(o.ocup.fac)) || (o.ocup.fac && o.ocup.fac === dono)) delete o.ocup;
    }
    // (lote 12, parte 12e) o cerco: de uma facção que existe (sem a facção: só na projeção)
    for (const o of mapa.objs) if (o.k === 'm' && o.cerco && o.cerco.fac && !facs.has(o.cerco.fac)) delete o.cerco;
    // (lote 12, parte 12d) as máquinas das unidades e das fortificações: só dos tipos que existem
    const tiposMaq = new Set(maquinasDe(mapa).map(t => t.id));
    for (const o of mapa.objs) {
      const tabs = o.k === 'g' && o.exe && !o.exe.pub ? o.exe.unid.map(u => u.maq) : o.k === 'm' && o.estr && o.estr.maq ? [o.estr.maq] : [];
      for (const t of tabs) for (const k of Object.keys(t)) if (!tiposMaq.has(k)) delete t[k];
      if (o.k === 'm' && o.estr && o.estr.maq && !Object.keys(o.estr.maq).length) delete o.estr.maq;
    }
    if (mapa.guerra && mapa.guerra.pres) {
      for (const id of Object.keys(mapa.guerra.pres)) if (!regs.has(id) || !facs.has(mapa.guerra.pres[id].fac)) delete mapa.guerra.pres[id];
      if (!Object.keys(mapa.guerra.pres).length) delete mapa.guerra.pres;
      if (!mapa.guerra.tipos.length && !mapa.guerra.bats.length && !Object.keys(mapa.guerra.hexes).length && !mapa.guerra.regras && !mapa.guerra.forr && !mapa.guerra.pres && !mapa.guerra.maqs) delete mapa.guerra;
    }
    return mapa;
  }
  // Nunca lança: com qualquer coisa na entrada sai um mapa válido.
  function normalizarMapa(x) {
    try { return normalizar(x); } catch (e) {
      return { v: 1, id: novoId('mp'), nome: 'Mapa sem nome', oculto: false, img: null, larg: 2000, alt: 1400, grade: normGrade(null),
        terrenos: copia(TERRENOS_PADRAO), hexes: {}, pintura: { alfa: 1, ops: [] }, cal: copia(CAL_PADRAO), nevoa: { on: false, ops: [] }, faccoes: [], objs: [] };
    }
  }

  /* ---------------- criação ---------------- */
  function mapaNovo(nome, o) {
    o = ehObj(o) ? o : {};
    const img = ehObj(o.img) ? o.img : null;
    return normalizarMapa({ v: 1, id: novoId('mp'), nome: typeof nome === 'string' && nome.trim() ? nome.trim() : 'Mundo conhecido', oculto: false,
      img, larg: img ? img.w : o.larg, alt: img ? img.h : o.alt, grade: null, terrenos: copia(TERRENOS_PADRAO), hexes: {}, pintura: null, cal: copia(CAL_PADRAO), nevoa: { on: false, ops: [] }, faccoes: [], objs: [] });
  }
  // Objeto novo com os padrões do tipo. Evento sem `ini` fica com null: ao entrar no mapa, começa "hoje".
  function objNovo(k, campos) {
    if (!tem(PREFIXO, k)) return null;
    const o = Object.assign({ id: novoId(PREFIXO[k]), k, nome: '', txt: '', nota: '', oculto: false }, copia(PADROES[k]), ehObj(campos) ? copia(campos) : {});
    o.k = k;
    if (!idOk(o.id)) o.id = novoId(PREFIXO[k]);
    return normObj(o, null, true) || o;
  }
  function faccaoNova(nome, c) {
    return { id: novoId('fc'), nome: texto(nome).trim() || 'Nova facção', cor: cor(c, CORES[0]), txt: '', nota: '', oculta: false, rel: {},
      rec: [], pop: null, apoio: null, ver: { pop: false, apoio: false, hist: false }, hist: [] };
  }

  /* ---------------- ajuste de escala (troca de imagem) ---------------- */
  /* Imagem nova de outro tamanho: tudo o que estava desenhado acompanha (fica no mesmo lugar relativo), e a grade
     também — os hexágonos continuam nos mesmos lugares, com o mesmo terreno, e as distâncias em cubos, as mesmas. */
  function escalarMapa(mapa, sx, sy) {
    const m = normalizarMapa(mapa);
    sx = num(sx, 1); sy = num(sy, 1);
    if (!(sx > 0) || !(sy > 0) || (sx === 1 && sy === 1)) return m;
    const s = Math.sqrt(sx * sy), P = p => [arred(p[0] * sx), arred(p[1] * sy)];
    for (const o of m.objs) {
      if ('x' in o) { o.x = arred(o.x * sx); o.y = arred(o.y * sy); }
      if (o.pts) o.pts = o.pts.map(P);
      if (o.k === 'e') { o.r = arred(o.r * s); o.cresce = arred(o.cresce * s); }
      if ((o.k === 'z' || o.k === 'f') && Array.isArray(o.fases)) o.fases = o.fases.map(f => ({ dia: f.dia, pts: f.pts.map(P) }));   // (a frente também tem fases: lote 8, parte 6)
      if (o.k === 'l') o.larg = arred(o.larg * s);
      if (o.k === 'c' || o.k === 'x') o.tam = arred(o.tam * s);
    }
    m.nevoa.ops = m.nevoa.ops.map(o => ({ t: o.t, x: arred(o.x * sx), y: arred(o.y * sy), r: arred(o.r * s) }));
    m.pintura.ops = m.pintura.ops.map(o => ({ t: o.t, r: arred(o.r * s), pts: o.pts.map(p => [Math.round(p[0] * sx), Math.round(p[1] * sy)]) }));
    if (m.grade.tam > 0) m.grade.tam = arred(m.grade.tam * s);
    m.grade.x = arred(m.grade.x * sx); m.grade.y = arred(m.grade.y * sy);
    if (!m.img) { m.larg = Math.round(m.larg * sx); m.alt = Math.round(m.alt * sy); }
    return normalizarMapa(m);
  }

  /* ---------------- o tamanho do mapa em cubos (lote 6) ----------------
     A grade com outro tamanho de hexágono (cada um continua com 5 cubos): o terreno pintado hexágono por hexágono é
     refeito na grade nova — cada hexágono novo fica com o terreno (e o custo próprio) do hexágono velho que tem o centro
     dele. Os grupos ficam onde estão, e o andado na rota passa a ser o do hexágono onde cada um está. O desenho à mão,
     as rotas, as regiões e o resto ficam como estão (são em unidades do mapa). Muda o mapa que recebe (o rascunho de
     App.mudar). → { ok, hexes } ou { ok: false, msg } (o terreno passaria do limite de hexágonos). */
  function regradear(mapa, tam) {
    if (!temGrade(mapa)) return { ok: false, msg: 'Defina a grade de hexágonos primeiro' };
    const novoTam = arred(limitar(num(tam, 0), 4, 20000));
    if (!(novoTam > 0) || novoTam === mapa.grade.tam) return { ok: false, msg: 'O tamanho é o mesmo' };
    const velho = { grade: Object.assign({}, mapa.grade) }, novo = { grade: Object.assign({}, mapa.grade, { tam: novoTam }) };
    const antes = ehObj(mapa.hexes) ? mapa.hexes : {}, ks = Object.keys(antes), hexes = {};
    if (ks.length) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const k of ks) { const h = lerChaveHex(k); if (!h) continue; for (const c of cantosHex(velho, h.q, h.r)) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } }
      const cs = [hexDe(novo, x0, y0), hexDe(novo, x1, y0), hexDe(novo, x0, y1), hexDe(novo, x1, y1)];
      const q0 = Math.min(...cs.map(h => h.q)) - 1, q1 = Math.max(...cs.map(h => h.q)) + 1, r0 = Math.min(...cs.map(h => h.r)) - 1, r1 = Math.max(...cs.map(h => h.r)) + 1;
      if ((q1 - q0 + 1) * (r1 - r0 + 1) > 4e6) return { ok: false, msg: 'Hexágonos pequenos demais para refazer o terreno' };
      let n = 0;
      for (let q = q0; q <= q1; q++) for (let r = r0; r <= r1; r++) {
        const c = centroHex(novo, q, r);
        if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
        const h = hexDe(velho, c.x, c.y), v = antes[h.q + ',' + h.r];
        if (v === undefined) continue;
        if (++n > MAX_HEX) return { ok: false, msg: 'Com hexágonos desse tamanho, o terreno pintado hexágono por hexágono passaria de ' + MAX_HEX.toLocaleString('pt-BR') + ' hexágonos (o limite do mapa)' };
        hexes[q + ',' + r] = copia(v);
      }
    }
    // o andado de cada grupo: o do hexágono onde ele está na rota nova (passando mais de uma vez, o mais perto de onde ele ia)
    const fracao = new Map();
    for (const g of mapa.objs) if (ehObj(g) && g.k === 'g' && g.rota) { const v = viagem(mapa, g); fracao.set(g.id, v && v.total > 0 ? limitar(num(g.prog, 0) / v.total, 0, 1) : 0); }
    mapa.grade.tam = novoTam;
    mapa.hexes = hexes;
    for (const g of mapa.objs) {
      if (!ehObj(g) || g.k !== 'g' || !g.rota) continue;
      const v = viagem(mapa, g);
      if (!v) { g.prog = 0; continue; }
      const aqui = hexDe(mapa, g.x, g.y), alvo = (fracao.get(g.id) || 0) * v.total;
      let melhor = null;
      v.cam.forEach((h, k) => { if (h.q === aqui.q && h.r === aqui.r && (melhor == null || Math.abs(v.acum[k] - alvo) < Math.abs(v.acum[melhor] - alvo))) melhor = k; });
      g.prog = melhor == null ? 0 : arred(v.acum[melhor]);
    }
    return { ok: true, hexes: Object.keys(hexes).length };
  }

  /* ---------------- projeção pública ---------------- */
  /* O que os jogadores recebem. Tudo o que é só do mestre sai aqui — e nada além deste recorte vai para eles:
     notas, o "escondido" do mapa, objetos e facções escondidos, o "é falso" dos boatos, a tabela de encontros,
     eventos e zonas de guerra fora do dia de hoje (e o futuro dos de hoje: quando acabam, quanto crescem, as fases
     que vêm), os custos que o mestre deu a um hexágono ou a uma região, e o que a névoa cobre (menos os grupos: são
     os próprios jogadores) — inclusive o terreno dos hexágonos cobertos. O desenho à mão vai inteiro: é a arte do
     mapa, como a imagem (a névoa cobre os dois na tela). */
  function projetar(mapa, opts) {
    const m = normalizarMapa(mapa);                          // já é uma cópia
    const dia = m.cal.dia, nevoa = m.nevoa.on, ops = m.nevoa.ops;
    const coberto = (x, y) => nevoa && cobertoPor(ops, x, y);
    const todoCoberto = pts => nevoa && pts.every(p => cobertoPor(ops, p[0], p[1]));
    delete m.oculto;
    delete m.ecoJ;
    // (lote 11, parte 2a) as terras dos títulos como o mestre as vê (o nome e o "escondido"), antes dos recortes
    const terrasAntes = new Map(m.objs.filter(o => o.k === 'r' || o.k === 'm').map(o => [o.id, o])), nomesFac = new Map(m.faccoes.map(f => [f.id, f.nome]));
    /* (lote 10, parte 6) o que os jogadores veem da economia, contado antes de tudo (no mapa inteiro, com o terreno de
       cada hexágono): a facção deles por inteiro (o estoque e a produção, com de onde vem) e o que tem dentro das cidades
       que o mestre abriu para eles. opts.clas: os clãs, para a produção das sedes (como em MundoReino.producaoPorFaccao). */
    const vai = o => !o.oculto && (o.k === 'r' ? !todoCoberto(o.pts) : o.k === 'g' || !coberto(o.x, o.y));
    const Rn = m.eco && m.eco.on ? reino() : null, dentro = new Map();
    const ecoJ = Rn ? Rn.economiaDosJogadores(m, opts && opts.clas, vai) : null;
    if (Rn) for (const o of m.objs) if (o.k === 'm' && o.ass && vai(o) && Rn.verDentro(m, o)) { const d = Rn.dentroParaJogadores(m, o); if (d) dentro.set(o.id, d); }
    const W = m.eco && m.eco.on ? new Set(m.eco.rec.map(r => r.id)) : null;     // os recursos do mundo
    const hexes = {};
    for (const k of Object.keys(m.hexes)) {
      const v = m.hexes[k], t = typeof v === 'string' ? v : v[0], h = lerChaveHex(k);
      if (!t || t === '-' || !h || !temGrade(m)) continue;
      const c = centroHex(m, h.q, h.r);
      if (!coberto(c.x, c.y)) hexes[k] = t;
    }
    m.hexes = hexes;
    // (lote 8, parte 6) a guerra: os jogadores recebem os nomes dos tipos de tropa e os hexágonos destruídos ou
    // corrompidos (fora da névoa); as vantagens e o histórico das batalhas são do mestre
    if (m.guerra) {
      const hg = {};
      for (const k of Object.keys(m.guerra.hexes)) { const h = lerChaveHex(k), c = h && temGrade(m) ? centroHex(m, h.q, h.r) : null; if (c && !coberto(c.x, c.y)) hg[k] = m.guerra.hexes[k]; }
      m.guerra = { tipos: m.guerra.tipos.map(t => ({ id: t.id, nome: t.nome })), bats: [], hexes: hg };
    }
    // (lote 6) as bolinhas dos grupos e a facção que cada região herda são contadas aqui, no mapa inteiro: os custos e
    // as regiões de cima podem não ir para os jogadores
    const bols = new Map(), facEf = new Map();
    // (lote 7, parte 5c) o clima de hoje: no mundo, nas regiões com ajuste (ou com o de hoje escolhido à mão) e onde cada
    // grupo está — pronto, porque a tabela e os ajustes são do mestre
    const chMundo = climaDoDia(m, dia, null).k, chReg = new Map(), chGru = new Map();
    for (const o of m.objs) {
      if (o.k === 'g') { const b = bolinhas(m, o); if (b) bols.set(o.id, [b.feitas, b.total]); chGru.set(o.id, climaNoPonto(m, o.x, o.y, dia).k); }
      else if (o.k === 'r') { facEf.set(o.id, facDaRegiao(m, o)); if (o.clima || (o.chj && o.chj.d === dia)) chReg.set(o.id, climaDoDia(m, dia, o).k); }
    }
    m.clima = { hoje: chMundo };
    // (lote 10, pente fino) com a economia ligada, a população de cada facção é a soma dos assentamentos dela (o número
    // escrito à mão fica para a economia desligada); vai para os jogadores só se o mestre marcou que eles veem
    if (m.eco && m.eco.on) {
      const soma = {};
      for (const o of m.objs) if (o.k === 'm' && o.ass && o.ass.pop > 0) { const r = regiaoEm(m, o.x, o.y), fid = r ? facDaRegiao(m, r) : null; if (fid) soma[fid] = (soma[fid] || 0) + o.ass.pop; }
      for (const f of m.faccoes) f.pop = soma[f.id] || 0;
    }
    delete m.eco;                                              // (lote 10) a economia é do mestre
    const escondidas = new Set(m.faccoes.filter(f => f.oculta).map(f => f.id)), jogP = (m.faccoes.find(f => f.jog) || {}).id || null;
    m.faccoes = m.faccoes.filter(f => !f.oculta);
    for (const f of m.faccoes) {
      delete f.nota;
      for (const k of Object.keys(f.rel)) if (escondidas.has(k)) delete f.rel[k];
      // (lote 6) o painel da facção: só o que o mestre marcou para os jogadores (o histórico, só do que eles veem)
      // (lote 10, parte 6) com a economia ligada, os recursos do mundo não seguem a caixa: o estoque da facção dos
      // jogadores vai inteiro; o das outras facções, nunca (os outros números de cada uma seguem a caixa)
      const ve = r => (W && W.has(r.id) ? !!f.jog : r.ver);
      const vistos = new Set(f.rec.filter(ve).map(r => 'r:' + r.id));
      const pode = c => (c === 'pop' ? f.ver.pop : c === 'apoio' ? f.ver.apoio : vistos.has(c));
      f.rec = f.rec.filter(ve);
      if (!f.ver.pop) f.pop = null;
      if (!f.ver.apoio) f.apoio = null;
      f.hist = f.ver.hist ? f.hist.map(e => ({ d: e.d, mot: e.mot, mud: e.mud.filter(x => pode(x[0])) })).filter(e => e.mud.length) : [];
    }
    const objs = [];
    for (const o of m.objs) {
      if (o.oculto) continue;
      delete o.nota;
      // (lote 9) a missão: só a que o mestre mostrou; a de texto vai com a situação pronta (a ligada, quem publica troca
      // pelo nome e pela situação das Fichas — e tira a que ainda está escondida lá)
      if (o.mis) { if (!o.mis.ver) delete o.mis; else if (!o.mis.ref) o.mis = { t: o.mis.t, ref: null, ver: true, e: situacaoDaMissao(o.mis) }; else delete o.mis.ok; }
      if (o.k === 'm') {
        const est0 = o.estr;
        delete o.falso; delete o.estr; delete o.desc; delete o.ass; delete o.dentro;
        if (coberto(o.x, o.y)) continue;
        // (lote 12, parte 12e) o cerco: quem cerca (sem a facção escondida) e desde quando; a reserva e o HP da muralha
        // só para a facção dos jogadores, quando ela cerca ou é cercada ali
        if (o.cerco) {
          const dono = o.ocup && o.ocup.fac ? o.ocup.fac : (r => (r ? facDaRegiao(m, r) : null))(regiaoEm(m, o.x, o.y)), c = { fac: escondidas.has(o.cerco.fac) ? null : o.cerco.fac, d: o.cerco.d };
          if (jogP && (o.cerco.fac === jogP || dono === jogP)) Object.assign(c, { res: o.cerco.res }, est0 ? { hp: est0.hp, hpMax: est0.hpMax } : {});
          o.cerco = c;
        }
        if (o.ocup && escondidas.has(o.ocup.fac)) o.ocup = { fac: null, d: o.ocup.d };   // (lote 12, parte 12b)
        if (dentro.has(o.id)) o.dentro = dentro.get(o.id);       // (lote 10, parte 6) a cidade aberta: o que tem dentro
      }
      else if (o.k === 'g') {
        if (bols.has(o.id)) o.bol = bols.get(o.id); else delete o.bol;
        // (lote 7, parte 5b) o jeito de andar e as paradas são do mestre
        delete o.modo; delete o.sentido; delete o.paradas; delete o.espera;
        delete o.desc; delete o.pdesc;                           // (lote 9) o descanso e os pontos de descanso também
        if (escondidas.has(o.fac)) o.fac = null;                 // (lote 8) a facção escondida não vai
        // (lote 8, parte 6) o exército: os nomes (o comandante, as unidades que não estão escondidas e o tipo delas), sem os números
        if (o.exe) o.exe = { pub: true, cmd: { nome: o.exe.cmd.nome }, unid: o.exe.unid.filter(u => !u.oc).map(u => ({ id: u.id, nome: u.nome, tipo: u.tipo })) };

        if (chGru.has(o.id)) o.ch = chGru.get(o.id);
      }
      else if (o.k === 'e') {
        if (!eventoAtivo(o, dia) || coberto(o.x, o.y)) continue;
        // o evento como ele está hoje: o fim planejado, o quanto ainda vai crescer e o peso na viagem são do mestre
        o.r = raioNoDia(o, dia); o.cresce = 0; o.fim = null; delete o.peso;
        delete o.rota; delete o.prog; delete o.pt; delete o.modo; delete o.sentido;     // (lote 7, parte 5b) a rota é do mestre
      }
      else if (o.k === 'r') { delete o.clima; delete o.chj; delete o.prod; if (chReg.has(o.id)) o.ch = chReg.get(o.id); delete o.enc; delete o.estilo; o.custo = null; o.fac = facEf.get(o.id) || null; if (escondidas.has(o.fac)) o.fac = null; if (todoCoberto(o.pts)) continue;
        if (o.ocup && escondidas.has(o.ocup.fac)) o.ocup = { fac: null, d: o.ocup.d }; }   // (lote 12, parte 12b) ocupada por quem eles não veem: sem a facção
      else if (o.k === 't' && o.esc) continue;                  // (lote 7, parte 5b) a rota escondida é do mestre
      else if (o.k === 't' || o.k === 'l') { if (todoCoberto(o.pts)) continue; }
      else if (o.k === 'f') {
        // (lote 8, parte 6) a frente como ela está hoje: as fases que vêm são do mestre
        if (o.fases) { o.pts = formaNoDia(o, dia); delete o.fases; }
        if (escondidas.has(o.a)) o.a = null; if (escondidas.has(o.b)) o.b = null; if (todoCoberto(o.pts)) continue;
      }
      else if (o.k === 'z') {
        // a zona como ela está hoje: as fases que vêm (e o fim planejado) são do mestre
        if (!zonaAtiva(o, dia)) continue;
        o.pts = formaNoDia(o, dia); o.fases = []; o.fim = null;
        delete o.ef;                                             // (lote 7, parte 5c) o que a zona de perigo mexe é do mestre
        if (escondidas.has(o.a)) o.a = null;
        if (escondidas.has(o.b)) o.b = null;
        if (todoCoberto(o.pts)) continue;
      }
      else if (o.k === 'c' || o.k === 'x') { if (coberto(o.x, o.y)) continue; }
      objs.push(o);
    }
    const rotas = new Set(objs.filter(o => o.k === 't').map(o => o.id));
    for (const o of objs) if (o.k === 'g' && o.rota && !rotas.has(o.rota)) { o.rota = null; o.prog = 0; delete o.bol; }
    m.objs = objs;
    if (ecoJ) m.ecoJ = ecoJ;                                    // (lote 10, parte 6) a economia da facção dos jogadores
    /* (lote 11, parte 1) a corte: só os personagens que os jogadores conhecem — sem a nota nem a ficha; os laços, só entre
       conhecidos; o lugar, só se eles o veem; a facção escondida não vai. A casa vai se algum membro é conhecido (o chefe,
       só se conhecido); os cargos, só os das facções que vão. */
    if (m.corte) {
      const con = new Set(m.corte.pessoas.filter(p => p.ver).map(p => p.id)), noMapa = new Set(objs.map(o => o.id));
      const pessoas = m.corte.pessoas.filter(p => p.ver).map(p => Object.assign({}, p, { fac: escondidas.has(p.fac) ? null : p.fac, cargo: escondidas.has(p.fac) ? null : p.cargo,
        pais: p.pais.filter(id => con.has(id)), conj: p.conj.filter(id => con.has(id)), onde: p.onde && noMapa.has(p.onde.id) ? p.onde : null, ficha: null, nota: '' }));
      const casasVistas = new Set(pessoas.map(p => p.casa).filter(Boolean)), facsVistas = new Set(pessoas.map(p => p.fac).filter(Boolean)), cargos = {};
      for (const k of Object.keys(m.corte.cargos)) if (facsVistas.has(k)) cargos[k] = m.corte.cargos[k];
      /* (parte 2a) os títulos: os das terras que eles veem (a região ou a cidade que vai; a facção que não está
         escondida) e os dos personagens conhecidos (se a terra não foi escondida pelo mestre: a névoa só esconde o
         lugar — o título vai com o nome pronto, sem a terra). As pessoas do título (o titular, o herdeiro escolhido, o
         regente, os pretendentes, os titulares de antes), só as conhecidas; sem a nota. (parte 2b) As regras de sucessão
         dos reinos são do mestre; (parte 4a) o título vai com a regra que vale para ele (a dele, a do reino ou a de
         começo), para o texto curto. */
      const conhecida = id => (id && con.has(id) ? id : null), titulos = [];
      for (const t of m.corte.titulos) {
        const pr = t.preso, terraVai = !!pr && (pr.t === 'f' ? nomesFac.has(pr.id) && !escondidas.has(pr.id) : noMapa.has(pr.id));
        const terraEscondida = !!pr && (pr.t === 'f' ? escondidas.has(pr.id) : !!(terrasAntes.get(pr.id) || {}).oculto);
        if (!terraVai && !(conhecida(t.tit) && !terraEscondida)) continue;
        let de = t.de, preso = pr;
        if (pr && !terraVai) {
          const o = terrasAntes.get(pr.id), n = pr.t === 'f' ? (nomesFac.get(pr.id) || '').trim() : o ? (o.nome || '').trim() || (pr.t === 'm' ? (ICONES[o.ic] || ICONES.cidade).nome : '') : '';
          de = t.de || (n ? 'de ' + n : '');
          preso = null;
        }
        titulos.push(Object.assign({}, t, { de, preso, fac: escondidas.has(t.fac) ? null : t.fac, tit: conhecida(t.tit), herd: conhecida(t.herd), reg: conhecida(t.reg),
          pret: t.pret.filter(x => con.has(x.p)), hist: t.hist.filter(x => !x.p || con.has(x.p)), regra: t.regra || (m.corte.regras || {})[t.fac] || REGRA_PADRAO, nota: '' }));
      }
      if (pessoas.length || titulos.length) {
        const c = { pessoas, casas: m.corte.casas.filter(c0 => casasVistas.has(c0.id)).map(c0 => Object.assign({}, c0, { chefe: con.has(c0.chefe) ? c0.chefe : null })), cargos, titulos };
        if (m.corte.graus) c.graus = m.corte.graus;
        if (m.corte.maior != null) c.maior = m.corte.maior;
        m.corte = c;
      } else delete m.corte;
    }
    /* (lote 11, parte 3a) a diplomacia: os tratados públicos entre facções que eles veem (sem a nota), com os tipos (para
       os nomes); a opinião é do mestre. (parte 3b) A vassalagem entre facções que eles veem, sem o tributo; e os tratados,
       sem as trocas (o tributo e as trocas da facção deles vão na economia deles, em ecoJ). (parte 3c) Os motivos de
       guerra são do mestre. */
    if (m.dipl) {
      const vistas = new Set(m.faccoes.map(f => f.id));
      const tratados = m.dipl.tratados.filter(t => t.pub && t.partes.every(f => vistas.has(f))).map(t => Object.assign({}, t, { nota: '', trocas: [] }));
      const vassalos = m.dipl.vassalos.filter(x => vistas.has(x.vas) && vistas.has(x.sus)).map(x => Object.assign({}, x, { trib: null }));
      if (tratados.length || vassalos.length) { const d = { tratados, opin: [], vassalos, motivosGuerra: [] }; if (m.dipl.tipos) d.tipos = m.dipl.tipos; m.dipl = d; } else delete m.dipl;
    }
    /* (lote 11, parte 4a) os segredos: só os revelados, sem quem sabe, sem o "é falso" e sem a nota. O dono que eles não
       veem (o personagem desconhecido, o título, o tratado, a casa, a região e o lugar que não vão, a facção escondida)
       sai na normalização do fim, que confere os donos com o que vai; sem nenhum revelado, a lista vazia também sai lá. */
    /* (parte 4b) as intrigas: só as que o mestre mostrou, com o texto para eles e o estado (o nome, quem trama, os alvos, o
       objetivo, os passos, os segredos, quem sabe e a nota são do mestre) */
    if (m.intr) {
      m.intr = { segredos: m.intr.segredos.filter(s => s.jog).map(s => Object.assign({}, s, { sabem: { p: [], f: [] }, falso: false, nota: '' })),
        intrigas: m.intr.intrigas.filter(x => x.ver).map(x => ({ id: x.id, nome: '', estado: x.estado, quem: { p: [], f: null }, alvos: [], obj: '', passos: [], segredos: [], sabem: { p: [], f: [] }, txtJ: x.txtJ, ver: true, nota: '' })) };
    }
    return normalizarMapa(m);
  }
  // (lote 10, parte 6) as contas da economia (mundo/reino.js), para a projeção: no navegador, as que a página carregou
  const reino = () => (typeof window !== 'undefined' && window.MundoReino) || (typeof require === 'function' ? require('./reino.js') : null);

  const MundoNucleo = {
    ICONES, EVENTOS, PESO_EVENTO, CENA_EVENTO, pesoPadrao, normPeso, pesoNoPonto, cenaNoPonto, nomeEvento, CORES, VIAS, RELACOES, CAL_PADRAO, CUBOS_HEX, CUBOS_DIA, TERRENOS_PADRAO, TEXTURAS, CARIMBOS, LINHAS, FONTES,
    novoId, mapaNovo, objNovo, faccaoNova, normalizarMapa,
    diasNoAno, dataDe, textoData, SEMANA, semanaDe, diaDaSemana, textoDataSemana, sem0Para,
    dist, compPolilinha, pontoNaPolilinha, maisPerto, dentroPoligono, centroide, suavizar, contornoRio,
    eventoAtivo, raioNoDia, eventosDoDia, faseNoDia, formaNoDia, zonaAtiva,
    temGrade, hexDe, centroHex, cantosHex, distHex, chaveHex, lerChaveHex, linhaHex, caminhoHex, cubosDe, unidadesDeCubos,
    terrenoDe, terrenoPintado, hexInfo, custoHex, medirHex, viagem, ondeNoCaminho, andarUmDia, regiaoEm, sortearEncontro,
    TEMPOS_DIA, passoDe, passarTempos, andarTempos, ajustarMarcha, bolinhas, regradear, regioesEm, facDaRegiao, controleDaRegiao, acimaDe,
    TIPOS_GRUPO, MODOS_ROTA, MAX_PARADAS, camposDoTipo, tracarRota, encontrosNoCaminho, temposDaParada, nomeDaParada, marchar,
    CLIMAS, CLIMA_ESTACOES, AJUSTES_CLIMA, ZONAS, estacaoDoMes, tabelaPadraoDoMes, chancesDoClima, climaSorteado, climaDoDia, regiaoDoClima, climaNoPonto, zonasNoPonto, efeitoDasZonas, sorteioDoDia,
    HONRA, TERRENOS_NOVOS, mudarHonra, facMudar, facNovoRecurso, facTirarRecurso, terrenosQueFaltam,
    nevoaCobre, projetar, copia, escalarMapa, ESTILOS_CENA, quandoEscurece, horaDoTempo,
    normBr,
    MIS_E, situacaoDaMissao,
    CADA_CLIMA, VIZINHOS_CLIMA, cadaDe, trechoDoTempo, trechoAgora, trechosDoDia, comecoDoTrecho, climaDoTrecho, climaSorteadoDoTrecho, climasDoDia, passoDoClima,
    janelaDeDescanso, noDescanso, descansandoAgora, pontosDeDescanso, nomeDoDescanso,
    HEX_GUERRA, MOMENTOS, FINS, tropasDe, consumoDe, diasDeMantimento, CAMPANHA_PADRAO, mesesDe, hpDaUnidade, tropasComHp, MAQUINAS_PADRAO, maquinasDe, somaDasMaquinas, RESERVA_PADRAO, MILICIA_PADRAO,
    normHerois,
    PAPEIS_REC, normEco, normAss, REGRAS_FALTA, ESTRATOS_INICIAIS, DIST_INICIAL, estratosDeComeco, distDeComeco, TIPOS_SERV, normGuilda,
    GENEROS, CARGOS_INICIAIS, normCorte, GRAUS_INICIAIS, MAIORIDADE, FORMAS_SUC, GENEROS_SUC, REGRA_PADRAO,
    TIPOS_TRATADO, normDipl, TIPOS_DONO, TIPOS_ALVO, ESTADOS_INTRIGA,
    LIMITES: { herois: MAX_HEROIS, honra: MAX_HONRA, historico: MAX_HIST, motivo: MAX_MOTIVO, recursos: MAX_REC, historicoFac: MAX_FHIST, niveis: MAX_NIVEL, tempos: MAX_TEMPOS, objs: MAX_OBJS, ops: MAX_OPS, texto: MAX_TXT, hexes: MAX_HEX, terrenos: MAX_TER, pinceladas: MAX_PINC, pontosPintura: MAX_PONTOS_PINT, pontos: MAX_PTS, fases: MAX_FASES, unidades: MAX_UNID, equipamentos: MAX_EQUIP, tiposGuerra: MAX_TIPOS_G, batalhas: MAX_BATS, momentos: MAX_MOM, notasBatalha: MAX_NOTAS, tropas: MAX_TROPAS, atributo: MAX_ATR, bonus: MAX_BONUS,
      construcoes: MAX_CONS, niveisConstrucao: MAX_NIV_CONS, construcoesAss: MAX_CONS_ASS, semanasObra: MAX_SEM_OBRA, defesaConstrucao: MAX_DEF_CONS, espacosConstrucao: MAX_ESP_CONS, efeitoConstrucao: MAX_EF_CONS,
      estratos: MAX_ESTR, pessoas: MAX_PESSOAS, lembrete: MAX_LEMBRA, guildas: MAX_GUILDAS, guildasCatalogo: MAX_GUILDAS_CAT, servicos: MAX_SERV, textoGuilda: MAX_TXT_GUILDA,
      personagens: MAX_PESSOAS_CORTE, casas: MAX_CASAS, cargos: MAX_CARGOS, conjuges: MAX_CONJ, textoCorte: MAX_TXT_CORTE,
      titulos: MAX_TITULOS, graus: MAX_GRAUS, pretendentes: MAX_PRET, titularesAntes: MAX_HIST_TIT, maioridade: MAX_MAIORIDADE,
      tratados: MAX_TRATADOS, tiposTratado: MAX_TIPOS_TRAT, partes: MAX_PARTES, opinioes: MAX_OPIN, motivosOpiniao: MAX_MOTIVOS_OP, textoDipl: MAX_TXT_DIPL,
      vassalos: MAX_VASSALOS, trocas: MAX_TROCAS, qtdDipl: MAX_QTD_DIPL, motivosGuerra: MAX_MOT_GUERRA, textoMotivoGuerra: MAX_TXT_MOT_GUERRA,
      segredos: MAX_SEGREDOS, sabem: MAX_SABEM, textoIntriga: MAX_TXT_INTR, intrigas: MAX_INTRIGAS, passos: MAX_PASSOS, alvos: MAX_ALVOS, quemTrama: MAX_QUEM, segredosDaIntriga: MAX_SEG_INTRIGA,
      forragem: MAX_FORR, contagens: MAX_PRES, hpTropa: MAX_HP_TROPA, maquinas: MAX_MAQS, maqPorTipo: MAX_MAQ_N, danoMaq: MAX_DANO_MAQ, reserva: MAX_RESERVA },
  };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoNucleo;
  if (typeof window !== 'undefined') window.MundoNucleo = MundoNucleo;
})();
