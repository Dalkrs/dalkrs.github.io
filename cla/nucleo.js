/* Tiny Cats · Clã: a lógica pura (sem página, sem DOM). Roda igual no navegador (window.ClaNucleo) e no Node (testes).
   Os documentos da mesa (ver supabase/migrations/0018_cla.sql):
     cla:c:<id>    o clã inteiro (só quem mestra o Clã lê e escreve)
     cla:pub:<id>  o que a mesa vê dele — montado pelo banco a cada mudança no clã; aqui, projetar() faz a mesma conta
                   (para a página aberta sozinha e para os testes conferirem que as duas contas batem)
     cla:nomes     os nomes dos níveis das três escalas (de −10 a +10; até o lote 8, de −5 a +5)
   Um clã: o nome, o lema, o brasão, a facção do Mapa-múndi (uma referência, opcional), se é o clã dos jogadores, o que os
   jogadores veem dele (no de NPC, parte por parte), a árvore de cargos (o líder no alto; cada cargo com uma ou mais
   pessoas, cada uma com o seu respeito dentro do clã), as construções, os recursos, o respeito no mundo, as relações com
   as facções e com os outros clãs, e o histórico. */
(() => {
  'use strict';

  /* ---------------- catálogos ---------------- */
  /* os nomes de começo dos níveis, de −10 a +10 (o mestre renomeia: valem para a mesa toda). (Lote 8) As escalas iam de
     −5 a +5: os nomes de lá continuam no meio (os mesmos), e os níveis novos, de fora, ganharam nomes próprios. */
  const NIVEL_MAX = 10;
  const ESCALAS = {
    mundo: ['Inimigo do mundo', 'Abominado', 'Caçado', 'Proscrito', 'Amaldiçoado',
      'Execrado', 'Odiado', 'Temido', 'Malvisto', 'Desconfiado', 'Desconhecido', 'Notado', 'Respeitado', 'Admirado', 'Honrado', 'Lendário',
      'Mítico', 'Glorioso', 'Venerado', 'Imortal', 'Divino'],
    rel: ['Extermínio', 'Guerra sem trégua', 'Guerra declarada', 'Vingança jurada', 'Rancor antigo',
      'Inimigo mortal', 'Hostil', 'Rival', 'Tenso', 'Frio', 'Neutro', 'Cordial', 'Amigável', 'Parceiro', 'Aliado', 'Irmão de armas',
      'Pacto de sangue', 'Juramento eterno', 'Família', 'Coração do clã', 'Um só povo'],
    membro: ['Inimigo jurado', 'Execrado', 'Condenado', 'Renegado', 'Pária',
      'Traidor', 'Desonrado', 'Suspeito', 'Malvisto', 'Questionado', 'Membro', 'Confiável', 'Respeitado', 'Estimado', 'Honrado', 'Venerado',
      'Lenda viva', 'Pilar do clã', 'Herói do clã', 'Ancestral vivo', 'Alma do clã'],
  };
  const NIVEIS = Array.from({ length: 2 * NIVEL_MAX + 1 }, (_, i) => i - NIVEL_MAX);        // −10 … +10
  const ESCALA_NOME = { mundo: 'Respeito no mundo', rel: 'Relações', membro: 'Respeito dos membros' };
  // as partes de um clã que o mestre mostra (ou não) aos jogadores, num clã de NPC
  const PARTES = [['cargos', 'Cargos e quem ocupa'], ['construcoes', 'Construções do clã'], ['recursos', 'Cofre do clã'], ['respeito', 'Respeito no mundo'], ['relacoes', 'Relações'], ['hist', 'Histórico'],
    ['membros', 'Membros (raça, classe e idade)']];      // (lote 56)
  const PARTE_NOME = Object.fromEntries(PARTES);
  /* o brasão: a forma (numa caixa de 100×120), a divisão, duas cores e um símbolo — ou uma imagem. st: onde o símbolo
     fica na forma ([x, y, escala] da caixa 24×24 do símbolo; sem st, [26, 28, 2]). (Lote 45) Mais sete formas. */
  const ST_PADRAO = [26, 28, 2];
  const FORMAS = [
    ['escudo', 'Escudo', 'M6 6H94V58C94 92 50 114 50 114C50 114 6 92 6 58Z'],
    ['redondo', 'Redondo', 'M6 60A44 44 0 1 0 94 60A44 44 0 1 0 6 60Z'],
    ['losango', 'Losango', 'M50 4L96 60L50 116L4 60Z'],
    ['estandarte', 'Estandarte', 'M10 4H90V116L50 92L10 116Z'],
    ['flamula', 'Flâmula', 'M4 18L96 60L4 102Z', [12, 36, 2]],
    ['bandeira', 'Bandeira', 'M4 14H96V106H4Z'],
    ['cauda', 'Cauda de andorinha', 'M4 14H96L72 60L96 106H4Z', [16, 36, 2]],
    ['gonfalao', 'Gonfalão', 'M8 4H92V90L78 116L64 90L50 116L36 90L22 116L8 90Z', [26, 22, 2]],
    ['pendao', 'Pendão', 'M24 4H76V84L50 116L24 84Z', [32, 26, 1.5]],
    ['oval', 'Oval', 'M50 4C77 4 92 30 92 60S77 116 50 116 8 90 8 60 23 4 50 4Z'],
    ['hexagono', 'Hexágono', 'M50 4L94 30V90L50 116L6 90V30Z'],
    ['triangular', 'Triangular', 'M6 6H94L50 114Z', [32, 14, 1.5]],
  ].map(([id, nome, d, st]) => ({ id, nome, d, st: st || ST_PADRAO }));
  /* A divisão: o pedaço da segunda cor (um caminho na caixa 100×120; a primeira cor é o fundo todo). (Lote 45) Mais
     onze. O Cenas recebe o caminho pronto (bras.dp), para desenhar igual. */
  const DIVISOES = [
    ['liso', 'Liso', ''],
    ['partido', 'Partido', 'M50 0H100V120H50Z'],
    ['cortado', 'Cortado', 'M0 60H100V120H0Z'],
    ['esquartelado', 'Esquartelado', 'M50 0H100V60H50ZM0 60H50V120H0Z'],
    ['faixa', 'Faixa', 'M-10 18L18 -10L110 92L82 120Z'],
    ['contrafaixa', 'Contrafaixa', 'M110 18L82 -10L-10 92L18 120Z'],
    ['pala', 'Pala', 'M35 0H65V120H35Z'],
    ['travessa', 'Travessa', 'M0 45H100V75H0Z'],
    ['cruz', 'Cruz', 'M39 0H61V49H100V71H61V120H39V71H0V49H39Z'],
    ['aspa', 'Aspa', 'M4 -8L108 116L96 128L-8 4ZM96 -8L108 4L4 128L-8 116Z'],
    ['asna', 'Asna', 'M0 80L50 40L100 80V104L50 64L0 104Z'],
    ['chefe', 'Chefe', 'M0 0H100V38H0Z'],
    ['base', 'Base', 'M0 84H100V120H0Z'],
    ['ondado', 'Ondado', 'M0 60Q12.5 48 25 60T50 60T75 60T100 60V120H0Z'],
    ['gironado', 'Gironado', 'M50 60L0 0H50ZM50 60L100 0V60ZM50 60L100 120H50ZM50 60L0 120V60Z'],
    ['xadrez', 'Xadrez', [0, 1, 2, 3, 4].map(l => [0, 1, 2, 3].filter(c => (c + l) % 2 === 1).map(c => `M${c * 25} ${l * 24}h25v24h-25Z`).join('')).join('')],
  ];
  const CORES = ['#24305e', '#d9a441', '#8a2a2a', '#2f6b45', '#5b3f8a', '#c9ccd4', '#1b1b22', '#b8873e', '#3f7fbf', '#e8eaf0', '#7a3b1f', '#5f7f2a'];
  // símbolos do brasão além dos da Meditação (traços numa caixa de 24×24)
  const SIMB_EXTRA = [
    ['torre', 'Torre', 'M7 21V8h2V5h2v3h2V5h2v3h2v13zM5 21h14M10.5 21v-4h3v4M10.5 12h3'],
    ['machado', 'Machado', 'M6 21 15 8M13 4c3.5 0 6.5 2.5 7 6-3 0-5.5-1-7-3M13 4l2 4'],
    ['ancora', 'Âncora', 'M12 3a2 2 0 1 1 0 4 2 2 0 1 1 0-4M12 7v14M8 11h8M4 14c0 4 3.6 7 8 7s8-3 8-7'],
    ['martelo', 'Martelo', 'M5 21l9-9M12 4l8 8-3 3-8-8zM9 7l3-3'],
    ['arco', 'Arco', 'M6 3c7 3 10 9 9 18M6 3l9 18M3 9l9-1 1-5'],
    ['caveira', 'Caveira', 'M12 3c-4.4 0-8 3.1-8 7.5 0 2.5 1.2 4.1 3 5.2V19h10v-3.3c1.8-1.1 3-2.7 3-5.2C20 6.1 16.4 3 12 3zM9 11h.01M15 11h.01M10 19v2M14 19v2'],
    ['chama', 'Chama', 'M12 3c1.8 2.8 5 5.2 5 9.2a5 5 0 0 1-10 0c0-2.2 1.1-3.8 2.2-4.8.2 1.8 1 2.8 2.1 3 .2-2.8-.2-4.8.7-7.4z'],
    ['punho', 'Punho', 'M7 11V7a1.5 1.5 0 0 1 3 0v3M10 10V6a1.5 1.5 0 0 1 3 0v4M13 10V7a1.5 1.5 0 0 1 3 0v4M16 11V9a1.5 1.5 0 0 1 3 0v4c0 4-2.5 7-6.5 7S7 18 7 14v-3a1.5 1.5 0 0 1-2.5-1'],
  ].map(([id, nome, d]) => ({ id, nome, d }));
  // (lote 45) a heráldica: animais, armas, objetos e plantas (traços numa caixa de 24×24)
  const SIMB_HER = [
    ['leao', 'Leão', 'M12 4c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zM12 8c2.2 0 4 1.8 4 4.2 0 2.3-1.8 3.8-4 3.8s-4-1.5-4-3.8C8 9.8 9.8 8 12 8zM10.5 11.5h.01M13.5 11.5h.01M11 14h2M12 14v1.2M5 7 3 5.5M19 7l2-1.5M4 15l-2 1M20 15l2 1'],
    ['aguia', 'Águia', 'M12 5.5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 1 1 0-3.4M12 8.9v8.3M9.5 21l2.5-3.8 2.5 3.8M12 11 3 6.5c.5 3 2.5 5.5 5 6.5l-3.5 1c2 1.5 4.5 1.6 7.5.5M12 11l9-4.5c-.5 3-2.5 5.5-5 6.5l3.5 1c-2 1.5-4.5 1.6-7.5.5'],
    ['urso', 'Urso', 'M7.5 4.5a2.5 2.5 0 1 0 0 5M16.5 4.5a2.5 2.5 0 1 1 0 5M12 6c4 0 6.5 3 6.5 7S15.5 20 12 20s-6.5-3-6.5-7S8 6 12 6zM10 11.5h.01M14 11.5h.01M10.5 15.5c.8.8 2.2.8 3 0M12 14v1.5'],
    ['javali', 'Javali', 'M4 14c0-4 3-7 8-7 3 0 5 1 6.5 3l2.5 2-2 1.5c0 3-2.5 5.5-6.5 5.5H8c-2.5 0-4-2-4-5zM8 19.5 7 21.5M12.5 19.5v2M17.5 13.5c1 .3 1.8 1 2.3 2M14.5 10.5h.01M8 7.5 6.5 4.5'],
    ['cervo', 'Cervo', 'M12 21c-2 0-3.5-2-3.5-5v-3.5h7V16c0 3-1.5 5-3.5 5zM8.5 12.5 6 11M15.5 12.5 18 11M9 10.5C7 8 6 6 6.5 3M6.8 6.5 4.5 5.5M7.8 8.5 5.5 9M15 10.5c2-2.5 3-4.5 2.5-7.5M17.2 6.5l2.3-1M16.2 8.5l2.3.5M10.5 15h.01M13.5 15h.01'],
    ['cavalo', 'Cavalo', 'M8 21c0-4 1-6 1-9 0-4 3-8 8-8l-1 3c2 1 3.5 3 3.5 5.5l-2.5 1-2-1.5c-1.5 1-2 2.5-2 4.5V21M9 9 6.5 7.5M14.5 8.5h.01'],
    ['unicornio', 'Unicórnio', 'M8 21c0-4 1-6 1-9 0-4 3-8 8-8l-1 3c2 1 3.5 3 3.5 5.5l-2.5 1-2-1.5c-1.5 1-2 2.5-2 4.5V21M9 9 6.5 7.5M14.5 8.5h.01M16.5 6 20 1.5'],
    ['touro', 'Touro', 'M4 5c0 3 2 5 4.5 5.5M20 5c0 3-2 5-4.5 5.5M8 10h8l-.5 6.5c-.2 2.4-1.7 4.5-3.5 4.5s-3.3-2.1-3.5-4.5zM10 13h.01M14 13h.01M10.5 18h3'],
    ['morcego', 'Morcego', 'M12 8.5c.9 0 1.5-.8 1.5-1.8l1 1.4c.8-.3 1.6-.3 2.4 0 1.5-1.9 3.5-2.4 5.1-1.9-1.4 1.5-1.4 4-.9 6-1.6-.5-3.1 0-4.1 1.5-1-1-2.6-1-3.6 0L12 17l-1.4-3.3c-1-1-2.6-1-3.6 0-1-1.5-2.5-2-4.1-1.5.5-2 .5-4.5-.9-6 1.6-.5 3.6 0 5.1 1.9.8-.3 1.6-.3 2.4 0l1-1.4c0 1 .6 1.8 1.5 1.8z'],
    ['aranha', 'Aranha', 'M12 8.5a2 2 0 1 1 0 4 2 2 0 1 1 0-4M12 12.5a3 3 0 1 1 0 6 3 3 0 1 1 0-6M10.5 10 7 6.5l-3 1M13.5 10 17 6.5l3 1M10 14l-4-1-2 2M14 14l4-1 2 2M10 17l-3 2-1 2.5M14 17l3 2 1 2.5'],
    ['peixe', 'Peixe', 'M3 12c3-4 8-5 12-2l3.5-3v10L15 14c-4 3-9 2-12-2zM8 11.5h.01'],
    ['asa', 'Asa', 'M4 19c0-7.5 5-13.5 16-15-1 3-3 5-5 6 2 0 3.5-.5 4.5-1-1 3-3.5 5-6.5 5.5 1.5.5 3 .5 4 0-2 2.8-5.5 4.5-13 4.5'],
    ['garras', 'Garras', 'M5 18 12 4M9.5 20.5l7-14M14 21l5.5-10'],
    ['lanca', 'Lança', 'M5 21 17 9M17 9l3.5-5.5L15 7zM8.5 15.5l-2-2M10 14l-2.5-2.5'],
    ['maca', 'Maça', 'M4 20l8-8M15.5 5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7M15.5 2.5V5M21 8.5h-2M15.5 14.5V12M10 8.5h2M19 5l-1.2 1.2M19 12l-1.2-1.2M12 5l1.2 1.2'],
    ['tridente', 'Tridente', 'M12 21V5M6.5 3v4a5.5 5.5 0 0 0 11 0V3M12 3v2M9.5 17h5'],
    ['espadas', 'Espadas cruzadas', 'M5 4l11 11M19 4 8 15M13.8 17.8l4-4M10.2 17.8l-4-4M16 16l3 3M8 16l-3 3'],
    ['adaga', 'Adaga', 'M12 2.5l2 4v8.5h-4V6.5zM7.5 15h9M12 15v4M10.3 21h3.4'],
    ['flecha', 'Flecha', 'M4 20 19 5M19 5h-5M19 5v5M4 20v-4M4 20h4M7 17l-2.5-.3M7 17l.3 2.5'],
    ['elmo', 'Elmo', 'M5 20v-8a7 7 0 0 1 14 0v8zM12 5v15M7.5 12.5h9M8 12.5v4M16 12.5v4'],
    ['foice', 'Foice', 'M6.5 21 13 9M13 9c-2-3-1-6 2-6.5 4-.5 6.5 3 5.5 7-2-2-4.5-2.5-7.5-.5'],
    ['castelo', 'Castelo', 'M3 21V9h3v2h2V9h3V5h2v4h3v2h2V9h3v12zM10 21v-4a2 2 0 0 1 4 0v4'],
    ['navio', 'Navio', 'M3 16h18l-2.5 4h-13zM12 16V3M12 4l6 9h-6M12 6.5 7.5 13H12'],
    ['roda', 'Roda', 'M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 1 1 0-5M12 3v6.5M12 14.5V21M3 12h6.5M14.5 12H21M5.6 5.6l4.6 4.6M13.8 13.8l4.6 4.6M18.4 5.6l-4.6 4.6M10.2 13.8l-4.6 4.6'],
    ['balanca', 'Balança', 'M12 4v16M8 20h8M5 7h14M5 7l-3 7h6zM19 7l-3 7h6zM12 2.5v1.5'],
    ['calice', 'Cálice', 'M7 3h10c0 5-2 8-5 8S7 8 7 3zM12 11v7M8 21h8M9.5 18h5'],
    ['anel', 'Anel', 'M12 9a6 6 0 1 1 0 12 6 6 0 1 1 0-12M12 8.5 9.5 5.5 12 2.5l2.5 3z'],
    ['moeda', 'Moeda', 'M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18M12 6.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 1 1 0-11M12 9.5v5M10 12h4'],
    ['bigorna', 'Bigorna', 'M3 7h13c0 2 1.5 3 5 3v1.5h-6c-1.5 0-2.5 1-2.5 2.5V16h2.5v3.5h-9V16H9v-2c0-1.5-1.5-3-3.5-3C4.1 11 3 9.9 3 8.5z'],
    ['tocha', 'Tocha', 'M10 21l-1-10h6l-1 10zM9 11c-1-2 0-4 1.5-5 0 1.5 1 2 1.5 1 0-1.5.5-3 2-4 .5 2 2 3.5 1 5.5-.4.9-.9 1.6-1.5 2.5'],
    ['trompa', 'Trompa', 'M4 6.5c0 6.5 4.5 10.5 10.5 10.5l5 3.5V11l-5 2.5c-3.5 0-6-2.5-6-7zM4 6.5h4.5'],
    ['pergaminho', 'Pergaminho', 'M8 4h10a2 2 0 0 1 0 4h-1v10a2 2 0 0 1-2 2H5a2 2 0 0 1 0-4h1V6a2 2 0 0 1 2-2zM6 16h9M9.5 8.5h5M9.5 11.5h5'],
    ['corrente', 'Corrente', 'M9.5 8.5H7a3.5 3.5 0 0 0 0 7h2.5a3.5 3.5 0 0 0 0-7zM17 8.5h-2.5a3.5 3.5 0 0 0 0 7H17a3.5 3.5 0 0 0 0-7z'],
    ['ferradura', 'Ferradura', 'M6 4v7a6 6 0 0 0 12 0V4M6 4h3v7a3 3 0 0 0 6 0V4h3M7.5 7.5h.01M7.8 11h.01M16.5 7.5h.01M16.2 11h.01'],
    ['flordelis', 'Flor-de-lis', 'M12 3c-2 2.5-2 5.5 0 9 2-3.5 2-6.5 0-9zM12 12c-1-3-4.5-4.5-7-3 0 3 2.5 4.5 5 4M12 12c1-3 4.5-4.5 7-3 0 3-2.5 4.5-5 4M7 14h10M12 14v7M9.5 21c1-1.5 1.5-3 2.5-4.5M14.5 21c-1-1.5-1.5-3-2.5-4.5'],
    ['rosa', 'Rosa', 'M12 4a5 5 0 1 1 0 10 5 5 0 1 1 0-10M12 7a2 2 0 1 1 0 4M10 9a2 2 0 0 0 2 2M12 14v7M12 17.5c-2 0-3.5-1-4-2.5M12 18.5c1.5 0 3-.8 3.5-2'],
    ['carvalho', 'Carvalho', 'M12 21v-7M9 21h6M12 14c-4.5 0-7-2.5-7-5.5S7.5 3 12 3s7 2.5 7 5.5-2.5 5.5-7 5.5zM12 14l-3-3M12 12l3-2.5'],
    ['trigo', 'Trigo', 'M12 21V8M12 8c-1.5-1-2-3-1-5 1.5 1 2 3 1 5zM12 11.5c-1.5-1.5-3.5-1.5-4.5-.5 1 1.5 3 2 4.5.5zM12 11.5c1.5-1.5 3.5-1.5 4.5-.5-1 1.5-3 2-4.5.5zM12 15.5c-1.5-1.5-3.5-1.5-4.5-.5 1 1.5 3 2 4.5.5zM12 15.5c1.5-1.5 3.5-1.5 4.5-.5-1 1.5-3 2-4.5.5z'],
    ['cruz', 'Cruz', 'M10 3h4v6h6v4h-6v8h-4v-8H4V9h6z'],
    ['montanha', 'Montanha', 'M2 20 9 7l4 6 2.5-3.5L22 20zM7.3 10.2 9 12l1.7-1.6']
  ].map(([id, nome, d]) => ({ id, nome, d }));
  /* (lote 45) as classes e as raças de Urgm: os ícones das barras do guia de barras (tc/barras-painel.js), num caminho
     só (o Cenas desenha o símbolo com um Path2D). O nome é o da árvore. */
  const SIMB_CLASSES = [
    ['u-samurai', 'Samurai', 'M20.6 12A8.6 8.6 0 1 0 3.4 12A8.6 8.6 0 1 0 20.6 12M12 7.4C13.7 9.2 13.7 14.8 12 16.6C10.3 14.8 10.3 9.2 12 7.4ZM8.5 12A0.9 0.9 0 1 0 6.7 12A0.9 0.9 0 1 0 8.5 12M17.3 12A0.9 0.9 0 1 0 15.5 12A0.9 0.9 0 1 0 17.3 12'],
    ['u-monge', 'Monge', 'M17.8 6.4A8 8 0 1 0 19.7 14.2M20.6 11A1 1 0 1 0 18.6 11A1 1 0 1 0 20.6 11'],
    ['u-aegis', 'Aégis', 'M6 3.5H18V14.5C18 17.8 15.4 20 12 21.2C8.6 20 6 17.8 6 14.5ZM12 3.5V21M9.6 6.6A0.8 0.8 0 1 0 8 6.6A0.8 0.8 0 1 0 9.6 6.6M16 6.6A0.8 0.8 0 1 0 14.4 6.6A0.8 0.8 0 1 0 16 6.6M9.6 13.6A0.8 0.8 0 1 0 8 13.6A0.8 0.8 0 1 0 9.6 13.6M16 13.6A0.8 0.8 0 1 0 14.4 13.6A0.8 0.8 0 1 0 16 13.6'],
    ['u-arqueiro', 'Arqueiro', 'M7 3.5C13.5 6.5 13.5 17.5 7 20.5M7 3.5V20.5M3.5 12H20.5M17.6 9.1L20.5 12L17.6 14.9M5.5 10.2L3.5 12L5.5 13.8'],
    ['u-barbaro', 'Bárbaro', 'M12 3.2V21M12 5.2C8.4 4.2 5.4 5.8 4.2 9.8C6.6 8.8 9.4 9.2 12 10.8M12 5.2C15.6 4.2 18.6 5.8 19.8 9.8C17.4 8.8 14.6 9.2 12 10.8'],
    ['u-bardo', 'Bardo', 'M12.39 11.61A4.8 5.4 -45 1 0 5.61 18.39A4.8 5.4 -45 1 0 12.39 11.61M10.5 15A1.5 1.5 0 1 0 7.5 15A1.5 1.5 0 1 0 10.5 15M12.4 11.6L18.6 5.4M17.2 3.6L20.4 6.8'],
    ['u-bruxo', 'Bruxo', 'M4.5 11.5H19.5C19.5 16.1 16.4 19.6 12 19.6S4.5 16.1 4.5 11.5ZM8 21.2H16M13 12L18.6 4'],
    ['u-espadachim', 'Espadachim', 'M12.6 16A4.6 4.6 0 1 0 3.4 16A4.6 4.6 0 1 0 12.6 16M9 16A1 1 0 1 0 7 16A1 1 0 1 0 9 16M20.5 3.5L10.8 13.2M12 9.6L14.4 12M20.5 3.5L17.4 4.3'],
    ['u-feiticeiro', 'Feiticeiro', 'M5.5 3.5H15.5L18.5 6.5V20.5H5.5ZM8.5 8.5H15M8.5 11.5H15M8.5 14.5H11.5M17.6 17.2A2.4 2.4 0 1 0 12.8 17.2A2.4 2.4 0 1 0 17.6 17.2'],
    ['u-mago', 'Mago', 'M12 6.5C10 5 7 4.6 3.5 5V18.5C7 18.1 10 18.6 12 20C14 18.6 17 18.1 20.5 18.5V5C17 4.6 14 5 12 6.5ZM12 6.5V20M6.5 9H9.5M14.5 9H17.5M6.5 12H9.5'],
    ['u-sacerdote', 'Sacerdote', 'M15.8 12A3.8 3.8 0 1 0 8.2 12A3.8 3.8 0 1 0 15.8 12M12 2.8V5.6M12 18.4V21.2M2.8 12H5.6M18.4 12H21.2M5.5 5.5L7.5 7.5M16.5 16.5L18.5 18.5M18.5 5.5L16.5 7.5M7.5 16.5L5.5 18.5'],
    ['u-shaji', 'Shaji', 'M8.4 8.2C5.6 10.2 4.5 13 4.5 15.4C4.5 19 7.6 20.6 12 20.6S19.5 19 19.5 15.4C19.5 13 18.4 10.2 15.6 8.2M8.4 8.2L7 4.2H17L15.6 8.2ZM14.2 14.8A2.2 2.2 0 1 0 9.8 14.8A2.2 2.2 0 1 0 14.2 14.8']
  ].map(([id, nome, d]) => ({ id, nome, d }));
  const SIMB_RACAS = [
    ['u-forja', 'Anão da Forja', 'M2.5 8.5H18.5L21.5 10V12H17.4C16 12.4 15.3 13.4 15.3 14.8V16.4L18 19.2H6L8.7 16.4V14.8C8.7 13.4 7.9 12.4 6.4 12C4.4 11.4 3 10.2 2.5 8.5ZM11 5.4L10.2 3.4M14 5.4L15 3.2'],
    ['u-rocha', 'Anão da Rocha', 'M2.5 20L9 8L12 12.5L15 4.5L21.5 20ZM13.8 20L12.4 16.4L14.8 13.4L13.8 9.8'],
    ['u-mercador', 'Anão Mercador', 'M12 4.6V20M8 20H16M4.5 7H19.5M4.5 7L2.4 13M4.5 7L6.6 13M19.5 7L17.4 13M19.5 7L21.6 13M2 13H7A2.5 2.5 0 0 1 2 13ZM17 13H22A2.5 2.5 0 0 1 17 13ZM13.3 4A1.3 1.3 0 1 0 10.7 4A1.3 1.3 0 1 0 13.3 4'],
    ['u-aviario', 'Antro Aviário', 'M20 3.5C12.5 4 6.5 9.5 6.4 17.6C14.5 17.5 20 11.5 20 3.5ZM3.5 20.5L16 8M10.6 13.6L14.8 14.4M13.4 10.4L18 10.6'],
    ['u-bovino', 'Antro Bovino', 'M3 5.5C3.4 9.6 6 11.2 9 10.6M21 5.5C20.6 9.6 18 11.2 15 10.6M8.5 9.8H15.5L14.8 17.4C14.6 19.3 13.5 20.4 12 20.4S9.4 19.3 9.2 17.4ZM11.5 17.6A0.9 0.9 0 1 0 9.7 17.6A0.9 0.9 0 1 0 11.5 17.6M14.3 17.6A0.9 0.9 0 1 0 12.5 17.6A0.9 0.9 0 1 0 14.3 17.6'],
    ['u-canino', 'Antro Canino', 'M12 12.4C9 12.4 6.6 15.4 6.6 17.5C6.6 19.3 8.1 20.1 9.7 19.7C10.6 19.5 11.2 19.2 12 19.2S13.4 19.5 14.3 19.7C15.9 20.1 17.4 19.3 17.4 17.5C17.4 15.4 15 12.4 12 12.4ZM7 10.6A2.1 2.1 0 1 0 2.8 10.6A2.1 2.1 0 1 0 7 10.6M11.2 6.3A2.2 2.2 0 1 0 6.8 6.3A2.2 2.2 0 1 0 11.2 6.3M17.2 6.3A2.2 2.2 0 1 0 12.8 6.3A2.2 2.2 0 1 0 17.2 6.3M21.2 10.6A2.1 2.1 0 1 0 17 10.6A2.1 2.1 0 1 0 21.2 10.6'],
    ['u-equino', 'Antro Equino', 'M8.4 3.6C5.6 5.8 4 8.8 4 12.4C4 16.9 7.6 20.5 12 20.5S20 16.9 20 12.4C20 8.8 18.4 5.8 15.6 3.6L13.6 5.8C15.2 7.4 16.2 9.6 16.2 12.2C16.2 14.8 14.4 16.8 12 16.8S7.8 14.8 7.8 12.2C7.8 9.6 8.8 7.4 10.4 5.8ZM6.95 11.8A0.95 0.95 0 1 0 5.05 11.8A0.95 0.95 0 1 0 6.95 11.8M18.95 11.8A0.95 0.95 0 1 0 17.05 11.8A0.95 0.95 0 1 0 18.95 11.8M9.55 17.6A0.95 0.95 0 1 0 7.65 17.6A0.95 0.95 0 1 0 9.55 17.6M16.35 17.6A0.95 0.95 0 1 0 14.45 17.6A0.95 0.95 0 1 0 16.35 17.6'],
    ['u-felino', 'Antro Felino', 'M4.6 3.6L9.4 7.8C10.2 7.6 11.1 7.5 12 7.5S13.8 7.6 14.6 7.8L19.4 3.6L19.8 12.6C19.8 17 16.4 20.4 12 20.4S4.2 17 4.2 12.6ZM10.3 13A1.1 1.1 0 1 0 8.1 13A1.1 1.1 0 1 0 10.3 13M15.9 13A1.1 1.1 0 1 0 13.7 13A1.1 1.1 0 1 0 15.9 13M11 16.6L12 17.4L13 16.6'],
    ['u-roedor', 'Antro Roedor', 'M9.4 7.2A3.4 3.4 0 1 0 2.6 7.2A3.4 3.4 0 1 0 9.4 7.2M21.4 7.2A3.4 3.4 0 1 0 14.6 7.2A3.4 3.4 0 1 0 21.4 7.2M8 10.6C8 8.4 9.8 7.4 12 7.4S16 8.4 16 10.6C16 14.4 13.6 18.8 12 20.4C10.4 18.8 8 14.4 8 10.6ZM11.3 12A0.9 0.9 0 1 0 9.5 12A0.9 0.9 0 1 0 11.3 12M14.5 12A0.9 0.9 0 1 0 12.7 12A0.9 0.9 0 1 0 14.5 12'],
    ['u-mazierna', 'Ghoul Mãzier\'na', 'M7.99 13.77L13.74 8.02A2.8 2.8 -45 1 1 17.67 6.31A2.8 2.8 -45 1 1 15.96 10.23L10.21 15.98A2.8 2.8 -45 1 1 6.28 17.69A2.8 2.8 -45 1 1 7.99 13.77Z'],
    ['u-necrosado', 'Ghoul Necrosado', 'M14.6 14.5A5.6 5.6 0 1 0 3.4 14.5A5.6 5.6 0 1 0 14.6 14.5M20.6 7.4A3.4 3.4 0 1 0 13.8 7.4A3.4 3.4 0 1 0 20.6 7.4M20.4 17.6A2.2 2.2 0 1 0 16 17.6A2.2 2.2 0 1 0 20.4 17.6M8.5 12.7A1.2 1.2 0 1 0 6.1 12.7A1.2 1.2 0 1 0 8.5 12.7'],
    ['u-pansona', 'Ghoul Panso\'na', 'M21.4 12A9.4 9.4 0 1 0 2.6 12A9.4 9.4 0 1 0 21.4 12M15 3.3L14.1 9.1L19.3 6.5M21.2 12.2L15.4 13.1L19.5 17.3M14.7 20.8L12 15.6L9.3 20.8M4.5 17.3L8.6 13.1L2.8 12.2M4.7 6.5L9.9 9.1L9 3.3M13.6 12A1.6 1.6 0 1 0 10.4 12A1.6 1.6 0 1 0 13.6 12'],
    ['u-humano-ayto', 'Humano Ayto', 'M12 2.2C14.8 3.8 18.2 6.6 18.4 11.4C18.6 14.4 19.2 16.8 21 18.8V21H3V18.8C4.8 16.8 5.4 14.4 5.6 11.4C5.8 6.6 9.2 3.8 12 2.2ZM12 7C13.9 8.2 15.2 10 15.2 12.4C15.2 14.8 13.8 16.4 12 17C10.2 16.4 8.8 14.8 8.8 12.4C8.8 10 10.1 8.2 12 7Z'],
    ['u-espenas', 'Humano Espenas', 'M10.3 4.8L10.6 1.7L13.4 1.7L13.7 4.8L15.9 5.7L18.3 3.7L20.3 5.7L18.3 8.1L19.2 10.3L22.3 10.6L22.3 13.4L19.2 13.7L18.3 15.9L20.3 18.3L18.3 20.3L15.9 18.3L13.7 19.2L13.4 22.3L10.6 22.3L10.3 19.2L8.1 18.3L5.7 20.3L3.7 18.3L5.7 15.9L4.8 13.7L1.7 13.4L1.7 10.6L4.8 10.3L5.7 8.1L3.7 5.7L5.7 3.7L8.1 5.7ZM14.8 12A2.8 2.8 0 1 0 9.2 12A2.8 2.8 0 1 0 14.8 12'],
    ['u-humano-natuphas', 'Humano Natuphas', 'M3.5 8.5L8 4H20.5V15.5L16 20H3.5ZM3.5 8.5H16V20M16 8.5L20.5 4M6.6 8.5L8.6 11.4L7.6 13.4L10.4 16.4'],
    ['u-sarep', 'Humano Sarep', 'M8 2.8V10A4 4 0 0 0 16 10V2.8M12 14V21.2M4.8 4.4Q3.4 7 4.8 9.6M19.2 4.4Q20.6 7 19.2 9.6'],
    ['u-humano-vas', 'Humano Vas', 'M2.8 19.5L4.2 12.6L8.4 8.6L14.6 8L19.6 11.4L21.2 19.5ZM8.4 8.6L10.6 13.2L8.2 19.4M10.6 13.2L15.6 14.4L17 19.4M14.2 4.2A1.2 1.2 0 1 0 11.8 4.2A1.2 1.2 0 1 0 14.2 4.2M18.6 5.2A1 1 0 1 0 16.6 5.2A1 1 0 1 0 18.6 5.2'],
    ['u-danca', 'Karê Dançarina', 'M12 20L4 9A11 11 0 0 1 20 9ZM12 20L8.2 6.8M12 20V6M12 20L15.8 6.8'],
    ['u-oradora', 'Karê Oradora', 'M4 6.6C4 5.2 5.2 4 6.6 4H17.4C18.8 4 20 5.2 20 6.6V13.4C20 14.8 18.8 16 17.4 16H10.4L6.4 19.8V16H6.6C5.2 16 4 14.8 4 13.4ZM9.6 10A1.2 1.2 0 1 0 7.2 10A1.2 1.2 0 1 0 9.6 10M13.2 10A1.2 1.2 0 1 0 10.8 10A1.2 1.2 0 1 0 13.2 10M16.8 10A1.2 1.2 0 1 0 14.4 10A1.2 1.2 0 1 0 16.8 10'],
    ['u-kitsune-ayto', 'Kitsune Ayto', 'M6 8L5.4 3L9.4 5.6M18 8L18.6 3L14.6 5.6M6 8.6C7.4 6.4 9.6 5.4 12 5.4S16.6 6.4 18 8.6V15C18 18.6 15.4 21 12 21S6 18.6 6 15ZM4.4 10.4H19.6V14.2H4.4ZM10.65 12.3A1.25 1.25 0 1 0 8.15 12.3A1.25 1.25 0 1 0 10.65 12.3M15.85 12.3A1.25 1.25 0 1 0 13.35 12.3A1.25 1.25 0 1 0 15.85 12.3'],
    ['u-hayune', 'Kitsune Hayune', 'M19 13A8 8 0 1 0 3 13A8 8 0 1 0 19 13M6.4 8.8A6.4 6.4 0 0 0 6.4 17.2M19.2 1.8L20.2 4.6L23 5.6L20.2 6.6L19.2 9.4L18.2 6.6L15.4 5.6L18.2 4.6Z'],
    ['u-lotus', 'Kitsune Lótus', 'M12 3.6C14.6 6.8 14.6 12 12 16C9.4 12 9.4 6.8 12 3.6ZM12 16C8.4 15.6 5 13 3.8 8.8C7.6 8.8 10.6 11.4 12 16ZM12 16C15.6 15.6 19 13 20.2 8.8C16.4 8.8 13.4 11.4 12 16ZM5 19.8H19'],
    ['u-merune', 'Kitsune Merunê', 'M15.2 3.4A9 9 0 1 0 20.6 15.8A7.2 7.2 0 0 1 15.2 3.4ZM19.7 6.4A1.1 1.1 0 1 0 17.5 6.4A1.1 1.1 0 1 0 19.7 6.4'],
    ['u-nirus', 'Kitsune Nirus', 'M5 19C5 10.4 10.2 4.6 19.4 4.6C19.4 13.6 13.8 19 5 19ZM5 19L14.6 9.4M9.6 14.4H13.2M11.8 12.2V8.8'],
    ['u-selene', 'Kitsune Selene', 'M12 3V21M4.2 7.5L19.8 16.5M19.8 7.5L4.2 16.5M9.6 4.4L12 6.4L14.4 4.4M9.6 19.6L12 17.6L14.4 19.6M4.4 10.4L6.8 9.6L6.2 7M19.6 13.6L17.2 14.4L17.8 17M19.6 10.4L17.2 9.6L17.8 7M4.4 13.6L6.8 14.4L6.2 17'],
    ['u-konaitos', 'Konaitos', 'M2.5 12C5.2 7.4 8.4 5.4 12 5.4S18.8 7.4 21.5 12C18.8 16.6 15.6 18.6 12 18.6S5.2 16.6 2.5 12ZM12 7.8C13.6 9.6 13.6 14.4 12 16.2C10.4 14.4 10.4 9.6 12 7.8Z'],
    ['u-magiritu', 'Orc Magi\'Ritu', 'M9 8H15V20.5H9ZM9 8L3.5 6.5L5.5 10.5H9M15 8L20.5 6.5L18.5 10.5H15M9.6 8L12 3.5L14.4 8M9 14.2H15M12.95 11.4A0.95 0.95 0 1 0 11.05 11.4A0.95 0.95 0 1 0 12.95 11.4M12.95 17.4A0.95 0.95 0 1 0 11.05 17.4A0.95 0.95 0 1 0 12.95 17.4'],
    ['u-orc-natuphas', 'Orc Natuphas', 'M3.5 4H20.5M5.5 4L7.5 13L9.5 4M10 4L12 20.5L14 4M14.5 4L16.5 11L18.5 4'],
    ['u-rastoroni', 'Orc Rastoroni', 'M3.8 17A8.6 8.6 0 1 1 20.2 17M12 14.5L16.6 8.6M13.5 14.5A1.5 1.5 0 1 0 10.5 14.5A1.5 1.5 0 1 0 13.5 14.5M6.2 11.2L7.4 11.8M12 5.6V7M17.8 11.2L16.6 11.8'],
    ['u-orc-vas', 'Orc Vas', 'M15.2 3.4C9.4 5.2 5 10.6 4.4 19.6L6.6 20.2C8.4 14.8 14 11.2 20.6 10.4M19.48 5.67A2 4.4 -38 1 0 16.32 8.13A2 4.4 -38 1 0 19.48 5.67M8.6 10.6L11.6 13.4'],
    ['u-silk', 'Silk', 'M12 2.5L21.5 12L12 21.5L2.5 12ZM8.8 5.7L18.3 15.2M5.7 8.8L15.2 18.3M5.7 15.2L15.2 5.7M8.8 18.3L18.3 8.8'],
    ['u-magiatach', 'Taekeir Magi\'atach', 'M4.5 20.5C8 16.5 12 12.5 19.5 4.5M8.6 16.2L4.4 13.2M12.6 12L18.4 13.4M15.6 8.7L14.2 3.8'],
    ['u-maritimo', 'Taekeir Marítimo', 'M2.5 15.5C5.5 15.5 6.6 8.2 12 7.4C16.4 6.8 19.2 9.6 18 12.6C17.1 14.8 14 14.6 13.8 12.2M2.5 19.5C5.5 17.7 8.5 21.3 12 19.5S18.5 17.7 21.5 19.5'],
    ['u-nistusatach', 'Taekeir Nistus\'atach', 'M10.2 3.5V9.3A5.8 5.8 0 1 0 13.8 9.3V3.5M8.8 3.5H15.2M11.9 15.8A1.5 1.5 0 1 0 8.9 15.8A1.5 1.5 0 1 0 11.9 15.8M15 13.2A1.1 1.1 0 1 0 12.8 13.2A1.1 1.1 0 1 0 15 13.2'],
    ['u-zierasurper', 'Taekeir Zier\'Asurper', 'M12 2.8C12 2.8 5.4 10.4 5.4 14.6A6.6 6.6 0 0 0 18.6 14.6C18.6 10.4 12 2.8 12 2.8ZM8.8 15A3.3 3.3 0 0 0 12 18.2']
  ].map(([id, nome, d]) => ({ id, nome, d }));
  // os ícones das construções
  const ICONES = [
    ['salao', 'Salão', 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6'],
    ['forja', 'Forja', 'M3 8h13c0 2.5 2 4 5 4v1h-6c-1.5 0-2.5 1-2.5 2.5V17h3v3H8v-3h3v-1.5C11 13.5 9.5 12 7 12c-2.2 0-4-1.8-4-4z'],
    ['torre', 'Torre', 'M8 21V9l4-5 4 5v12M6 21h12M10 13h4'],
    ['muralha', 'Muralha', 'M3 21V8h3v3h3V8h3v3h3V8h3v3h3V8v13zM10 21v-4h4v4'],
    ['templo', 'Templo', 'M3 21h18M5 21V11M9 21V11M15 21V11M19 21V11M3 11h18L12 4z'],
    ['biblioteca', 'Biblioteca', 'M4 5c3-1.5 5.5-1.5 8 0v14c-2.5-1.5-5-1.5-8 0zM12 5c2.5-1.5 5-1.5 8 0v14c-3-1.5-5.5-1.5-8 0'],
    ['quartel', 'Quartel', 'M4 4l11 11M20 4 9 15M6.5 16.5l-3 3M17.5 16.5l3 3M7 13l4 4M17 13l-4 4'],
    ['mercado', 'Mercado', 'M3 10l2-6h14l2 6M3 10h18M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 13v8h14v-8M10 21v-5h4v5'],
    ['estabulo', 'Estábulo', 'M6 4v8a6 6 0 0 0 12 0V4M6 4h3M15 4h3M6 9h2M16 9h2'],
    ['celeiro', 'Celeiro', 'M3 21V10l9-6 9 6v11zM8 21v-6h8v6M8 15l8 6M16 15l-8 6'],
    ['porto', 'Porto', 'M12 3a2 2 0 1 1 0 4 2 2 0 1 1 0-4M12 7v14M8 11h8M4 14c0 4 3.6 7 8 7s8-3 8-7'],
    ['mina', 'Mina', 'M3 8c5-4 13-4 18 0M12 5.5 5 21'],
    ['oficina', 'Oficina', 'M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1'],
    ['jardim', 'Jardim', 'M12 21v-8M12 13c0-4 2.5-7 7-7 0 4.5-3 7-7 7zM12 15c0-3-2-5.5-6-5.5 0 3.5 2.5 5.5 6 5.5zM7 21h10'],
    ['poco', 'Poço', 'M5 10h14M7 10V6h10v4M6 10v11h12V10M12 6V3M12 13v4'],
  ].map(([id, nome, d]) => ({ id, nome, d }));

  const MAX = {
    clas: 40, nome: 60, lema: 160, nomeCargo: 60, nomePessoa: 60, cargos: 60, gente: 30, construcoes: 40, nomeCons: 60,
    efeito: 1000, nivel: 99, custo: 8, recursos: 40, nomeRec: 40, qtd: 1000000000, relacoes: 60, motivo: 200,
    hist: 300, rhist: 200, txt: 300, nomeNivel: 30, avulsos: 300, nomeArv: 40,
  };
  const JANELA = 60000;          // mudanças seguidas na mesma coisa, dentro de um minuto, viram uma linha só do histórico

  /* ---------------- apoio ---------------- */
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const tem = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  function texto(v, max) {
    let s = typeof v === 'string' ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
    s = s.replace(/\r\n?/g, '\n');
    if (s.length > max) { s = s.slice(0, max); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); }
    return s;
  }
  const linha = (v, max) => texto(texto(v, max * 4).replace(/\s+/g, ' ').trim(), max).trim();
  // o mesmo que o banco aceita num id de clã, de cargo, de pessoa (e nos outros ids daqui)
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && v !== '__proto__' ? v : '');
  const pcOk = v => (typeof v === 'string' && v.length >= 1 && v.length <= 64 && !/[:@\s]/.test(v) && v !== '__proto__' ? v : '');
  const urlOk = v => (typeof v === 'string' && ((v.length <= 600 && /^https:\/\/[^\s"'<>]+$/i.test(v))
    || (v.length <= 3000000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v))) ? v : null);
  const corOk = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : null);
  const instante = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);
  const inteiro = (v, def, min, max) => { const n = Number(v); return v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(n) ? Math.max(min, Math.min(max, Math.trunc(n))) : def; };
  const nivel = v => inteiro(v, 0, -NIVEL_MAX, NIVEL_MAX);
  let seq = 0;
  function novoId(pre) { seq = (seq + 1) % 1296; return pre + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + seq.toString(36); }
  function unico(id, vistos, pre) { let r = id || novoId(pre); while (vistos.has(r)) r = novoId(pre); vistos.add(r); return r; }
  const sinal = v => (v > 0 ? '+' + v : v < 0 ? '−' + -v : '0');

  // os símbolos do brasão: os da Meditação (quando ela está carregada) e mais alguns
  const MN = (typeof window !== 'undefined' && window.MeditacaoNucleo)
    || (typeof module === 'object' && module && typeof require === 'function' ? (() => { try { return require('../meditacao/nucleo.js'); } catch (e) { return null; } })() : null);
  const SIMBOLOS = new Map();
  if (MN) {
    for (const g of MN.GRUPOS || []) for (const s of g.itens) SIMBOLOS.set(s.id, { id: s.id, nome: s.nome, d: s.d });
    for (const s of MN.DESENHOS || []) if (!SIMBOLOS.has(s.id)) SIMBOLOS.set(s.id, { id: s.id, nome: s.nome, d: s.d });
  }
  for (const s of SIMB_EXTRA) if (!SIMBOLOS.has(s.id)) SIMBOLOS.set(s.id, s);
  for (const s of [...SIMB_HER, ...SIMB_CLASSES, ...SIMB_RACAS]) if (!SIMBOLOS.has(s.id)) SIMBOLOS.set(s.id, s);
  // (lote 45) os símbolos em grupos, para os seletores: os da Meditação, a heráldica, as classes e as raças
  const SIMB_GRUPOS = [
    { id: 'med', nome: 'Da Meditação', itens: [...SIMBOLOS.keys()].filter(k => !SIMB_EXTRA.some(x => x.id === k) && ![...SIMB_HER, ...SIMB_CLASSES, ...SIMB_RACAS].some(x => x.id === k)) },
    { id: 'her', nome: 'Heráldica', itens: [...SIMB_EXTRA, ...SIMB_HER].map(x => x.id) },
    { id: 'cls', nome: 'Classes', itens: SIMB_CLASSES.map(x => x.id) },
    { id: 'rac', nome: 'Raças', itens: SIMB_RACAS.map(x => x.id) },
  ].filter(g => g.itens.length);
  const FORMA = new Map(FORMAS.map(f => [f.id, f])), DIVISAO = Object.fromEntries(DIVISOES.map(([id, nome]) => [id, nome])), DIV_PATH = Object.fromEntries(DIVISOES.map(([id, , d]) => [id, d])), ICONE = new Map(ICONES.map(i => [i.id, i]));

  /* ---------------- os nomes dos níveis ---------------- */
  /* (lote 8) v: 2 são as listas de −10 a +10 (21 nomes); as de antes (v: 1, de −5 a +5, 11 nomes) vão para o meio: os
     nomes que o mestre deu continuam nos mesmos níveis. */
  function normNomes(d) {
    d = ehObj(d) ? d : {};
    const out = { v: 2 }, antigo = d.v !== 2, desloca = antigo ? NIVEL_MAX - 5 : 0;
    for (const esc of Object.keys(ESCALAS)) {
      const l = Array.isArray(d[esc]) ? d[esc] : [];
      out[esc] = ESCALAS[esc].map((def, i) => linha(l[i - desloca], MAX.nomeNivel) || def);
    }
    return out;
  }
  const nomeNivel = (nomes, esc, v) => normNomes(nomes)[esc][nivel(v) + NIVEL_MAX];
  const nivelTxt = (nomes, esc, v) => sinal(nivel(v)) + ' · ' + nomeNivel(nomes, esc, v);

  /* ---------------- o brasão ---------------- */
  function normBrasao(b) {
    b = ehObj(b) ? b : {};
    const cores = Array.isArray(b.cores) ? b.cores.map(corOk) : [];
    return { forma: FORMA.has(b.forma) ? b.forma : 'escudo', div: tem(DIVISAO, b.div) ? b.div : 'partido',
      cores: [cores[0] || CORES[0], cores[1] || CORES[1]], simb: SIMBOLOS.has(b.simb) ? b.simb : null, img: urlOk(b.img) };
  }
  // o brasão de um clã novo: as cores mudam de um clã para o outro
  function brasaoNovo(i) {
    const n = Math.max(0, Math.trunc(Number(i) || 0)), a = CORES[(n * 2) % CORES.length], b = CORES[(n * 2 + 1) % CORES.length];
    return { forma: 'escudo', div: ['partido', 'cortado', 'esquartelado', 'faixa', 'liso'][n % 5], cores: [a, b], simb: ['lua', 'espada', 'lobo', 'coroa', 'estrela', 'torre'][n % 6], img: null };
  }
  /* O brasão desenhado (um <svg> em texto, só com números e cores conferidos aqui): a forma recortando a divisão nas
     duas cores, o contorno e o símbolo. `sufixo` deixa o id do recorte único na página. */
  function brasaoSvg(b, sufixo) {
    const x = normBrasao(b), f = FORMA.get(x.forma), [c1, c2] = x.cores, id = 'br' + String(sufixo || '0').replace(/[^A-Za-z0-9_-]/g, '');
    const dp = DIV_PATH[x.div];
    const div = `<rect x="-10" y="-10" width="120" height="140" fill="${c1}"/>` + (dp ? `<path d="${dp}" fill="${c2}"/>` : '');
    const s = x.simb && SIMBOLOS.get(x.simb), st = f.st || ST_PADRAO;
    // o símbolo claro sobre o fundo escuro (e escuro quando o fundo todo é claro)
    const tinta = (x.div === 'liso' ? claro(c1) : claro(c1) && claro(c2)) ? '#1b1b22' : '#f6efe2';
    const simb = s ? `<g transform="translate(${st[0]} ${st[1]}) scale(${st[2]})" fill="none" stroke="${tinta}" stroke-width="${+(3.6 / st[2]).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"><path d="${s.d}"/></g>` : '';
    return `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><clipPath id="${id}"><path d="${f.d}"/></clipPath></defs>`
      + `<g clip-path="url(#${id})">${div}${simb}</g><path d="${f.d}" fill="none" stroke="${mistura(c2, '#f3d9a4')}" stroke-width="4"/></svg>`;
  }
  /* (lote 45) A amostra de uma divisão, para os seletores: a caixa clara e o pedaço da segunda cor, em currentColor (as
     cores do brasão mudam; a amostra só mostra o desenho). */
  function divAmostra(div, w, h) {
    const dp = DIV_PATH[div];
    return `<svg class="div-am" viewBox="0 0 100 120" width="${w || 18}" height="${h || 22}" aria-hidden="true" focusable="false"><rect width="100" height="120" fill="currentColor" fill-opacity=".22"/>${dp ? `<path d="${dp}" fill="currentColor"/>` : ''}</svg>`;
  }
  // os símbolos em grupos, prontos para um seletor: [{ id, nome, itens: [{ id, nome, d }] }]
  const simbolosEmGrupos = () => SIMB_GRUPOS.map(g => ({ id: g.id, nome: g.nome, itens: g.itens.map(id => SIMBOLOS.get(id)).filter(Boolean) }));
  function claro(c) { const n = parseInt(c.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 0.299 * r + 0.587 * g + 0.114 * b > 150; }
  function mistura(a, b) { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16); const m = s => Math.round((((x >> s) & 255) + ((y >> s) & 255)) / 2); return '#' + [16, 8, 0].map(s => m(s).toString(16).padStart(2, '0')).join(''); }

  /* ---------------- os cargos ---------------- */
  function normPessoa(p, vistos, semResp) {
    if (!ehObj(p)) return null;
    const pc = pcOk(p.pc) || null, nome = linha(p.nome, MAX.nomePessoa);
    if (!pc && !nome) return null;
    return { id: unico(idOk(p.id), vistos, 'ps'), pc, nome, resp: semResp ? null : nivel(p.resp) };
  }
  /* { lider: { nome, pai: null, ordem: 0, gente: [uma pessoa, no máximo] }, <id>: { nome, pai, ordem, gente } }.
     A árvore sai inteira: um cargo pendurado num que não existe (ou num ciclo) passa para debaixo do líder; ninguém
     aparece duas vezes. semResp: o clã de NPC, como os jogadores o recebem (sem o respeito de cada um). */
  function normCargos(c, semResp) {
    c = ehObj(c) ? c : {};
    const vistos = new Set(), out = {};
    const li = ehObj(c.lider) ? c.lider : {};
    out.lider = { nome: linha(li.nome, MAX.nomeCargo) || 'Líder', pai: null, ordem: 0,
      gente: (Array.isArray(li.gente) ? li.gente : []).map(p => normPessoa(p, vistos, semResp)).filter(Boolean).slice(0, 1) };
    let n = 0;
    for (const k of Object.keys(c)) {
      if (k === 'lider' || !idOk(k) || !ehObj(c[k]) || n >= MAX.cargos) continue;
      const x = c[k];
      out[k] = { nome: linha(x.nome, MAX.nomeCargo) || 'Cargo', pai: idOk(x.pai) || 'lider', ordem: inteiro(x.ordem, 0, 0, 100000),
        gente: (Array.isArray(x.gente) ? x.gente : []).map(p => normPessoa(p, vistos, semResp)).filter(Boolean).slice(0, MAX.gente) };
      n++;
    }
    for (const k of Object.keys(out)) {
      if (k === 'lider') continue;
      let p = out[k].pai, passos = 0;
      while (p !== 'lider' && out[p] && passos <= MAX.cargos + 1) { p = out[p].pai; passos++; }
      if (p !== 'lider') out[k].pai = 'lider';
    }
    return out;
  }
  // os cargos logo abaixo de um, na ordem (e, empatando, pelo nome)
  function filhos(cargos, pai) {
    return Object.keys(cargos).filter(k => k !== 'lider' && cargos[k].pai === pai)
      .sort((a, b) => cargos[a].ordem - cargos[b].ordem || cargos[a].nome.localeCompare(cargos[b].nome, 'pt-BR') || (a < b ? -1 : a > b ? 1 : 0));
  }
  function descendentes(cargos, id) {
    const out = new Set(), fila = [id];
    while (fila.length) { const x = fila.shift(); for (const f of filhos(cargos, x)) if (!out.has(f)) { out.add(f); fila.push(f); } }
    return out;
  }
  function arvore(cargos) { const c = normCargos(cargos), no = id => ({ id, cargo: c[id], filhos: filhos(c, id).map(no) }); return no('lider'); }
  // todas as pessoas, do líder para baixo: [{ pid, cargo, cargoNome, pessoa }]
  function membros(cargos) {
    const c = normCargos(cargos), out = [];
    const anda = id => { for (const p of c[id].gente) out.push({ pid: p.id, cargo: id, cargoNome: c[id].nome, pessoa: p }); for (const f of filhos(c, id)) anda(f); };
    anda('lider');
    return out;
  }
  const lider = cargos => normCargos(cargos).lider.gente[0] || null;
  const totalCargos = cargos => Object.keys(normCargos(cargos)).length - 1;
  function novoCargo(cargos, pai, nome) {
    const c = normCargos(cargos);
    if (!c[pai] || totalCargos(c) >= MAX.cargos) return null;
    const irmaos = filhos(c, pai), id = unico('', new Set(Object.keys(c)), 'cg');
    c[id] = { nome: linha(nome, MAX.nomeCargo) || 'Cargo novo', pai, ordem: irmaos.length ? c[irmaos[irmaos.length - 1]].ordem + 1 : 0, gente: [] };
    return { cargos: c, id };
  }
  function renomearCargo(cargos, id, nome) {
    const c = normCargos(cargos), n = linha(nome, MAX.nomeCargo);
    if (!c[id] || !n || c[id].nome === n) return null;
    c[id].nome = n;
    return c;
  }
  // põe o cargo debaixo de outro (pai), na posição pos entre os irmãos novos (sem pos: no fim)
  function moverCargo(cargos, id, pai, pos) {
    const c = normCargos(cargos);
    if (id === 'lider' || !c[id] || !c[pai] || pai === id || descendentes(c, id).has(pai)) return null;
    const irmaos = filhos(c, pai).filter(k => k !== id);
    const p = Math.max(0, Math.min(irmaos.length, pos == null ? irmaos.length : Math.trunc(Number(pos)) || 0));
    irmaos.splice(p, 0, id);
    c[id].pai = pai;
    irmaos.forEach((k, i) => { c[k].ordem = i; });
    return c;
  }
  // apagar um cargo: as pessoas dele saem do clã; os cargos de baixo sobem para o lugar dele
  function apagarCargo(cargos, id) {
    const c = normCargos(cargos);
    if (id === 'lider' || !c[id]) return null;
    const pai = c[id].pai, irmaos = filhos(c, pai), pos = irmaos.indexOf(id), meus = filhos(c, id);
    const nova = irmaos.slice(0, pos).concat(meus, irmaos.slice(pos + 1));
    for (const f of meus) c[f].pai = pai;
    delete c[id];
    nova.forEach((k, i) => { c[k].ordem = i; });
    return c;
  }
  // uma pessoa num cargo: um personagem da mesa (pc, com o nome dele de agora) ou só um nome
  function porPessoa(cargos, cargo, p) {
    const c = normCargos(cargos);
    if (!c[cargo] || !ehObj(p)) return null;
    if (c[cargo].gente.length >= (cargo === 'lider' ? 1 : MAX.gente)) return null;
    const pc = pcOk(p.pc) || null, nome = linha(p.nome, MAX.nomePessoa);
    if (!pc && !nome) return null;
    const vistos = new Set(membros(c).map(m => m.pid)), id = unico('', vistos, 'ps');
    c[cargo].gente.push({ id, pc, nome, resp: nivel(p.resp) });
    return { cargos: c, id };
  }
  function tirarPessoa(cargos, cargo, pid) {
    const c = normCargos(cargos);
    if (!c[cargo]) return null;
    const n = c[cargo].gente.length;
    c[cargo].gente = c[cargo].gente.filter(p => p.id !== pid);
    return c[cargo].gente.length === n ? null : c;
  }
  /* Passar a liderança: `nova` é uma pessoa do clã ({ pid }, que sai do cargo dela) ou alguém de fora ({ pc, nome }, que
     começa com respeito 0). O líder de antes vai para o cargo `antigoPara` (ou sai do clã, sem ele). */
  function passarLideranca(cargos, nova, antigoPara) {
    const c = normCargos(cargos), velho = c.lider.gente[0] || null;
    if (!ehObj(nova)) return null;
    let p = null;
    if (nova.pid) {
      if (velho && velho.id === nova.pid) return null;
      for (const k of Object.keys(c)) { const i = c[k].gente.findIndex(x => x.id === nova.pid); if (i >= 0) { p = c[k].gente.splice(i, 1)[0]; break; } }
      if (!p) return null;
    } else {
      const pc = pcOk(nova.pc) || null, nome = linha(nova.nome, MAX.nomePessoa);
      if (!pc && !nome) return null;
      p = { id: unico('', new Set(membros(c).map(m => m.pid)), 'ps'), pc, nome, resp: 0 };
    }
    c.lider.gente = [p];
    if (velho && antigoPara && antigoPara !== 'lider' && c[antigoPara] && c[antigoPara].gente.length < MAX.gente) c[antigoPara].gente.push(velho);
    return c;
  }
  /* O que mudou de uma árvore para a outra, cargo por cargo (o que o líder manda ao banco): { <id>: cargo | null }.
     O cargo de líder e o respeito de cada um ficam de fora (o líder não muda nenhum dos dois). */
  function diffCargos(antes, depois) {
    const a = normCargos(antes), d = normCargos(depois), out = {};
    const sem = x => JSON.stringify(Object.assign({}, x, { gente: x.gente.map(p => ({ id: p.id, pc: p.pc, nome: p.nome })) }));
    for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
      if (k === 'lider') continue;
      if (!d[k]) { if (a[k]) out[k] = null; } else if (!a[k] || sem(a[k]) !== sem(d[k])) out[k] = Object.assign({}, d[k], { gente: d[k].gente.map(p => ({ id: p.id, pc: p.pc, nome: p.nome })) });
    }
    return out;
  }
  // aplica um "o que mudou" (como o banco faz: o respeito de quem já estava continua — ou o guardado de quem tinha
  // saído —; quem chega começa no 0)
  function aplicarDiff(cargos, mudar, guardado) {
    const c = normCargos(cargos), resp = new Map([...Object.entries(normGuardado(guardado)), ...membros(c).map(m => [m.pid, m.pessoa.resp])]);
    for (const k of Object.keys(ehObj(mudar) ? mudar : {})) {
      if (k === 'lider' || !idOk(k)) continue;
      if (mudar[k] == null) delete c[k];
      else if (ehObj(mudar[k])) c[k] = Object.assign({}, mudar[k], { gente: (Array.isArray(mudar[k].gente) ? mudar[k].gente : []).map(p => Object.assign({}, p, { resp: resp.has(p && p.id) ? resp.get(p.id) : 0 })) });
    }
    return normCargos(c);
  }

  /* ---------------- (lote 56) os membros ----------------
     membros: { avulsos: [as pessoas sem cargo: { id, pc, nome, resp }], dados: { <id da pessoa>: { raca, racaN, classe,
     classeN, nasc } } } — os dados valem para todos (com cargo ou sem); a raça e a classe como as das tropas (a árvore da
     mesa, ou o nome escrito); nasc: { d, m (de 0), a? } no calendário do mundo. A pessoa ligada a uma ficha (pc) usa o
     nome e o aniversário da ficha (quem mostra é a tela). */
  function normNascM(v) {
    if (!ehObj(v)) return null;
    const d = inteiro(v.d, 0, 0, 99), m = inteiro(v.m, -1, -1, 98);
    if (!d || m < 0) return null;
    const o = { d, m }, a = Number(v.a);
    if (v.a !== null && v.a !== '' && v.a !== undefined && Number.isFinite(a) && Math.abs(a) <= 1e6) o.a = Math.round(a);
    return o;
  }
  // (lote 59) a foto: o endereço da imagem enviada à mesa (https) ou, fora de uma mesa, a imagem embutida (pequena)
  const fotoOk = v => (typeof v === 'string' && ((/^https:\/\/[^\s"'<>]+$/.test(v) && v.length <= 1000) || (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) && v.length <= 300000)) ? v : null);
  function normDadosM(x) {
    if (!ehObj(x)) return null;
    const o = {}, raca = idOk(x.raca), classe = idOk(x.classe), racaN = linha(x.racaN, MAX.nomeArv), classeN = linha(x.classeN, MAX.nomeArv), nasc = normNascM(x.nasc);
    if (raca) o.raca = raca; if (racaN) o.racaN = racaN; if (classe) o.classe = classe; if (classeN) o.classeN = classeN; if (nasc) o.nasc = nasc;
    const img = fotoOk(x.img); if (img) o.img = img;                       // (lote 59) a foto do membro
    // (lote 60) o soldado com nome de uma tropa que é este membro: { pc (o dono da tropa), un (a unidade), sd (o soldado) }
    if (ehObj(x.sold) && pcOk(x.sold.pc) && idOk(x.sold.un) && idOk(x.sold.sd)) o.sold = { pc: x.sold.pc, un: x.sold.un, sd: x.sold.sd };
    return Object.keys(o).length ? o : null;
  }
  /* gente: (só no que a mesa recebe) as pessoas dos cargos, quando os cargos não vão — o nome e a ficha, sem o cargo */
  function normMembros(m, cargos, semResp, comGente) {
    m = ehObj(m) ? m : {};
    const vistos = new Set(membros(cargos).map(x => x.pid));
    const gente = comGente ? (Array.isArray(m.gente) ? m.gente : []).map(p => normPessoa(p, vistos, true)).filter(Boolean).slice(0, MAX.avulsos + MAX.cargos * MAX.gente) : null;
    const avulsos = (Array.isArray(m.avulsos) ? m.avulsos : []).map(p => normPessoa(p, vistos, semResp)).filter(Boolean).slice(0, MAX.avulsos);
    const dados = {};
    const d0 = ehObj(m.dados) ? m.dados : {};
    for (const pid of vistos) { const x = normDadosM(d0[pid]); if (x) dados[pid] = x; }
    return gente ? { avulsos, dados, gente } : { avulsos, dados };
  }
  // todos os membros: os dos cargos (do líder para baixo) e depois os sem cargo: [{ pid, cargo (null sem), cargoNome, pessoa, dados }]
  function membrosDe(cla) {
    const c = ehObj(cla) ? cla : {}, cg = normCargos(c.cargos), mb = ehObj(c.membros) && Array.isArray(c.membros.gente) ? c.membros : normMembros(c.membros, cg);
    // (no que a mesa recebe sem os cargos: as pessoas deles vêm em membros.gente, sem dizer o cargo)
    const dosCargos = Array.isArray(mb.gente) ? mb.gente.map(p => ({ pid: p.id, cargo: null, cargoNome: '', pessoa: p, oculto: true })) : membros(cg);
    return dosCargos.map(x => Object.assign(x, { dados: mb.dados[x.pid] || {} }))
      .concat(mb.avulsos.map(p => ({ pid: p.id, cargo: null, cargoNome: '', pessoa: p, dados: mb.dados[p.id] || {} })));
  }
  // um membro novo (num cargo, ou sem cargo): { nome, pc, raca, racaN, classe, classeN, nasc } → { cla, pid } | null
  function novoMembro(cla, info, cargo) {
    const c = normCla(cla);
    if (!ehObj(info)) return null;
    const pc = pcOk(info.pc) || null, nome = linha(info.nome, MAX.nomePessoa);
    if (!pc && !nome) return null;
    let pid;
    if (cargo) { const r = porPessoa(c.cargos, cargo, { pc, nome, resp: 0 }); if (!r) return null; c.cargos = r.cargos; pid = r.id; }
    else {
      if (c.membros.avulsos.length >= MAX.avulsos) return null;
      pid = unico('', new Set(membrosDe(c).map(x => x.pid)), 'ps');
      c.membros.avulsos.push({ id: pid, pc, nome, resp: 0 });
    }
    const d = normDadosM(info);
    if (d) c.membros.dados[pid] = d;
    return { cla: normCla(c), pid };
  }
  // mudar o nome, a ficha ligada e os dados de um membro (campos: só o que vem)
  function mudarMembroDados(cla, pid, campos) {
    const c = normCla(cla), x = membrosDe(c).find(y => y.pid === pid);
    if (!x || !ehObj(campos)) return null;
    const p = x.cargo ? c.cargos[x.cargo].gente.find(y => y.id === pid) : c.membros.avulsos.find(y => y.id === pid);
    if ('nome' in campos) { const n = linha(campos.nome, MAX.nomePessoa); if (!n && !p.pc) return null; p.nome = n; }
    if ('pc' in campos) { const pc = pcOk(campos.pc) || null; if (!pc && !p.nome) return null; p.pc = pc; }
    const d = Object.assign({}, c.membros.dados[pid] || {});
    for (const k of ['raca', 'racaN', 'classe', 'classeN', 'nasc', 'img', 'sold']) if (k in campos) { if (campos[k] == null || campos[k] === '') delete d[k]; else d[k] = campos[k]; }
    const nd = normDadosM(d);
    if (nd) c.membros.dados[pid] = nd; else delete c.membros.dados[pid];
    return normCla(c);
  }
  // (lote 60) o membro que é o soldado (pc, un, sd) de uma tropa → o pid ou null
  function membroDoSoldado(cla, pc, un, sd) {
    const c = normCla(cla);
    for (const pid of Object.keys(c.membros.dados)) { const s = c.membros.dados[pid].sold; if (s && s.pc === pc && s.un === un && s.sd === sd) return pid; }
    return null;
  }
  // passar um membro para um cargo (ou para nenhum: null), com o respeito dele; o cargo de líder tem um lugar só
  function moverMembro(cla, pid, cargo) {
    const c = normCla(cla), x = membrosDe(c).find(y => y.pid === pid);
    if (!x || (x.cargo || null) === (cargo || null)) return null;
    if (cargo && (!c.cargos[cargo] || c.cargos[cargo].gente.length >= (cargo === 'lider' ? 1 : MAX.gente))) return null;
    if (!cargo && c.membros.avulsos.length >= MAX.avulsos) return null;
    let p;
    if (x.cargo) { const g = c.cargos[x.cargo].gente, i = g.findIndex(y => y.id === pid); p = g.splice(i, 1)[0]; }
    else { const i = c.membros.avulsos.findIndex(y => y.id === pid); p = c.membros.avulsos.splice(i, 1)[0]; }
    if (cargo) c.cargos[cargo].gente.push(p); else c.membros.avulsos.push(p);
    return normCla(c);
  }
  // tirar um membro do clã (o respeito fica guardado, como o de quem sai dos cargos)
  function tirarMembro(cla, pid) {
    const c = normCla(cla), x = membrosDe(c).find(y => y.pid === pid);
    if (!x) return null;
    if (x.cargo) c.cargos[x.cargo].gente = c.cargos[x.cargo].gente.filter(y => y.id !== pid);
    else c.membros.avulsos = c.membros.avulsos.filter(y => y.id !== pid);
    if (x.pessoa.resp != null) c.respGuardado[pid] = x.pessoa.resp;
    delete c.membros.dados[pid];
    return normCla(c);
  }

  /* ---------------- construções, recursos, respeito, relações ---------------- */
  function normCusto(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x) || out.length >= MAX.custo || !idOk(x.rec) || out.some(y => y.rec === x.rec)) continue;
      const qtd = inteiro(x.qtd, 0, 0, MAX.qtd);
      if (qtd > 0) out.push({ rec: x.rec, nome: linha(x.nome, MAX.nomeRec), qtd });
    }
    return out;
  }
  function normConstrucoes(l) {
    const out = [], vistos = new Set();
    for (const k of Array.isArray(l) ? l : []) {
      if (!ehObj(k) || out.length >= MAX.construcoes) continue;
      const prox = ehObj(k.prox) ? k.prox : {};
      out.push({ id: unico(idOk(k.id), vistos, 'ct'), nome: linha(k.nome, MAX.nomeCons) || 'Construção', ico: ICONE.has(k.ico) ? k.ico : 'salao',
        nivel: inteiro(k.nivel, 0, 0, MAX.nivel), efeito: texto(k.efeito, MAX.efeito), prox: { custo: normCusto(prox.custo), efeito: texto(prox.efeito, MAX.efeito) } });
      // (lote 62) a favorita (a estrela) e as etiquetas (até 4, para filtrar: defesa, economia…)
      const z = out[out.length - 1];
      if (k.fav === true) z.fav = true;
      const tags = normTags(k.tags); if (tags.length) z.tags = tags;
    }
    return out;
  }
  // (lote 62) as etiquetas de uma construção: até 4, sem repetir (sem diferença de maiúsculas), de até 24 letras
  function normTags(l) {
    const out = [], vistos = new Set();
    for (const t of Array.isArray(l) ? l : typeof l === 'string' ? l.split(',') : []) {
      const v = linha(t, 24), k = v.toLowerCase();
      if (!v || vistos.has(k) || out.length >= 4) continue;
      vistos.add(k); out.push(v);
    }
    return out;
  }
  /* (lote 62) O que se escreve na quantidade de um recurso: "+50" soma, "-20" (ou "−20") tira, um número sem sinal troca
     o valor. → { delta } | { valor } | null (o que não é número) */
  function lerQtd(txt) {
    const t = String(txt == null ? '' : txt).replace(/\s+/g, '').replace(/\u2212/g, '-').replace(/\./g, '').replace(',', '.');
    const m = /^([+-]?)(\d+(?:\.\d+)?)$/.exec(t);
    if (!m) return null;
    const n = Math.trunc(Number(m[2]));
    if (!Number.isFinite(n)) return null;
    return m[1] === '+' ? { delta: n } : m[1] === '-' ? { delta: -n } : { valor: n };
  }
  function normMud(l) {
    const out = [];
    for (const x of Array.isArray(l) ? l : []) {
      if (!ehObj(x) || out.length >= MAX.custo) continue;
      const d = inteiro(x.d, 0, -MAX.qtd, MAX.qtd);
      if (d) out.push({ rec: idOk(x.rec) || null, n: linha(x.n, MAX.nomeRec) || 'Recurso', d });
    }
    return out;
  }
  function normRecursos(r) {
    r = ehObj(r) ? r : {};
    const lista = [], vistos = new Set();
    for (const x of Array.isArray(r.lista) ? r.lista : []) {
      if (!ehObj(x) || lista.length >= MAX.recursos) continue;
      lista.push({ id: unico(idOk(x.id), vistos, 'rc'), nome: linha(x.nome, MAX.nomeRec) || 'Recurso', qtd: inteiro(x.qtd, 0, 0, MAX.qtd) });
    }
    const hist = [];
    for (const e of Array.isArray(r.hist) ? r.hist : []) {
      if (!ehObj(e) || hist.length >= MAX.rhist) continue;
      const mud = normMud(e.mud);
      if (mud.length) hist.push({ em: instante(e.em), tipo: 'rec', mud, mot: linha(e.mot, MAX.motivo) });
    }
    return { lista, hist };
  }
  function normRespeito(r) {
    r = ehObj(r) ? r : {};
    const hist = [];
    for (const e of Array.isArray(r.hist) ? r.hist : []) {
      if (!ehObj(e) || hist.length >= MAX.rhist) continue;
      hist.push({ em: instante(e.em), tipo: 'resp', de: nivel(e.de), para: nivel(e.para), mot: linha(e.mot, MAX.motivo) });
    }
    return { v: nivel(r.v), hist };
  }
  function normRelacoes(l) {
    const out = [], vistos = new Set();
    for (const r of Array.isArray(l) ? l : []) {
      if (!ehObj(r) || out.length >= MAX.relacoes || (r.tipo !== 'faccao' && r.tipo !== 'cla') || !idOk(r.alvo)) continue;
      if (out.some(x => x.tipo === r.tipo && x.alvo === r.alvo)) continue;
      out.push({ id: unico(idOk(r.id), vistos, 'rl'), tipo: r.tipo, alvo: r.alvo, nome: linha(r.nome, MAX.nome), cor: corOk(r.cor), v: nivel(r.v) });
    }
    return out;
  }
  function normFaccao(f) {
    if (!ehObj(f) || !idOk(f.id)) return null;
    return { id: f.id, nome: linha(f.nome, MAX.nome) || 'Facção', cor: corOk(f.cor) };
  }
  // o histórico do clã: cada linha com o seu tipo (o que a mudança foi), para a página escrever o texto e o banco
  // saber de que parte ela fala
  function normHist(l) {
    const out = [];
    for (const e of Array.isArray(l) ? l : []) {
      if (!ehObj(e) || out.length >= MAX.hist) continue;
      const em = instante(e.em), mot = linha(e.mot, MAX.motivo);
      let x = null;
      if (e.tipo === 'rec') { const mud = normMud(e.mud); if (mud.length) x = { em, tipo: 'rec', mud, mot }; }
      else if (e.tipo === 'cons') x = { em, tipo: 'cons', nome: linha(e.nome, MAX.nomeCons) || 'Construção', nivel: inteiro(e.nivel, 1, 0, MAX.nivel), mud: normMud(e.mud), mot };
      else if (e.tipo === 'resp') x = { em, tipo: 'resp', de: nivel(e.de), para: nivel(e.para), mot };
      else if (e.tipo === 'rel' && (e.alvoTipo === 'cla' || e.alvoTipo === 'faccao') && idOk(e.alvo)) x = { em, tipo: 'rel', alvoTipo: e.alvoTipo, alvo: e.alvo, nome: linha(e.nome, MAX.nome), de: nivel(e.de), para: nivel(e.para), mot };
      else if (e.tipo === 'membro') x = { em, tipo: 'membro', pid: idOk(e.pid) || null, nome: linha(e.nome, MAX.nomePessoa) || 'Alguém', de: nivel(e.de), para: nivel(e.para), mot };
      else if (e.tipo === 'cargo' || e.tipo === 'texto') { const txt = linha(e.txt, MAX.txt); if (txt) x = { em, tipo: e.tipo, txt }; }
      if (x) out.push(x);
    }
    return out;
  }

  /* ---------------- o clã ---------------- */
  function normVer(v) { v = ehObj(v) ? v : {}; const out = { mostrar: v.mostrar === true }; for (const [k] of PARTES) out[k] = v[k] === true; return out; }
  // o respeito de quem saiu dos cargos pela função do líder (o banco guarda: se a pessoa voltar, volta com ele)
  function normGuardado(g) {
    const out = {};
    if (ehObj(g)) for (const k of Object.keys(g).sort().slice(0, 300)) if (idOk(k) && typeof g[k] === 'number' && Number.isFinite(g[k])) out[k] = nivel(g[k]);
    return out;
  }
  function normCla(d) {
    d = ehObj(d) ? d : {};
    return {
      v: 1, nome: linha(d.nome, MAX.nome) || 'Clã sem nome', lema: linha(d.lema, MAX.lema), ordem: inteiro(d.ordem, 0, 0, 100000),
      jogadores: d.jogadores === true, ver: normVer(d.ver), faccao: normFaccao(d.faccao), brasao: normBrasao(d.brasao),
      cargos: normCargos(d.cargos, false), construcoes: normConstrucoes(d.construcoes), recursos: normRecursos(d.recursos),
      respeito: normRespeito(d.respeito), relacoes: normRelacoes(d.relacoes), hist: normHist(d.hist), respGuardado: normGuardado(d.respGuardado),
      membros: normMembros(d.membros, normCargos(d.cargos, false)),           // (lote 56)
    };
  }
  function claNovo(nome, i, jogadores) {
    return normCla({ nome: linha(nome, MAX.nome) || 'Clã novo', ordem: Math.max(0, Math.trunc(Number(i) || 0)), jogadores: !!jogadores, brasao: brasaoNovo(i),
      ver: { mostrar: false }, cargos: { lider: { nome: 'Líder', gente: [] } }, recursos: { lista: [], hist: [] }, respeito: { v: 0, hist: [] } });
  }
  // o que a mesa recebe (cla:pub:<id>), já conferido: null se os jogadores não veem o clã
  function normPub(d) {
    if (!ehObj(d) || d.oculto) return null;
    const jog = d.jogadores === true, vr = ehObj(d.ver) ? d.ver : {}, ver = {};
    for (const [k] of PARTES) ver[k] = vr[k] === true;
    return {
      v: 1, id: idOk(d.id), nome: linha(d.nome, MAX.nome) || 'Clã sem nome', lema: linha(d.lema, MAX.lema), ordem: inteiro(d.ordem, 0, 0, 100000),
      jogadores: jog, ver, faccao: normFaccao(d.faccao), brasao: normBrasao(d.brasao),
      cargos: ver.cargos ? normCargos(d.cargos, !jog) : null, construcoes: ver.construcoes ? normConstrucoes(d.construcoes) : null,
      recursos: ver.recursos ? normRecursos(d.recursos) : null, respeito: ver.respeito ? normRespeito(d.respeito) : null,
      relacoes: ver.relacoes ? normRelacoes(d.relacoes) : null, hist: ver.hist ? normHist(d.hist) : null,
      membros: ver.membros ? normMembros(d.membros, ver.cargos ? normCargos(d.cargos, !jog) : {}, !jog, !ver.cargos) : null,      // (lote 56)
    };
  }
  // a vista do mestre (o clã inteiro) com o mesmo jeito da dos jogadores, para as mesmas telas
  function comoVista(cla, id) { const c = normCla(cla), ver = {}; for (const [k] of PARTES) ver[k] = true; return Object.assign(c, { id: idOk(id), ver, verMestre: c.ver }); }

  /* A mesma conta do banco (privado.cla_pub, na 0018): cla e cada um de todos = { id, apagado, ...os dados do clã }.
     Devolve o documento cla:pub:<id> (sem conferir: é o que o banco gravaria). */
  const visivel = c => ehObj(c) && !c.apagado && (c.jogadores === true || (ehObj(c.ver) && c.ver.mostrar === true));
  function histVai(e, ver, jog, vistos) {
    switch (e.tipo) {
      case 'rec': return ver.recursos;
      case 'cons': return ver.construcoes;
      case 'resp': return ver.respeito;
      case 'rel': return ver.relacoes && (e.alvoTipo !== 'cla' || vistos.has(e.alvo));
      case 'cargo': return ver.cargos;
      case 'membro': return jog;
      default: return true;
    }
  }
  function projetar(cla, todos) {
    if (!visivel(cla)) return { v: 1, oculto: true };
    const d = cla, jog = d.jogadores === true, ver = ehObj(d.ver) ? d.ver : {};
    const vistos = new Map((Array.isArray(todos) ? todos : []).filter(visivel).map(c => [c.id, { nome: c.nome == null ? '' : c.nome, cor: ehObj(c.brasao) && Array.isArray(c.brasao.cores) && c.brasao.cores[0] != null ? c.brasao.cores[0] : null }]));
    const pub = { v: 1, id: d.id, jogadores: jog, nome: d.nome == null ? '' : d.nome, lema: d.lema == null ? '' : d.lema, brasao: d.brasao == null ? null : copia(d.brasao),
      faccao: d.faccao == null ? null : copia(d.faccao), ordem: d.ordem == null ? 0 : d.ordem, ver: {} };
    for (const [k] of PARTES) { const p = jog || ver[k] === true; pub.ver[k] = p; if (p && k in d) pub[k] = copia(d[k]); }
    if (Array.isArray(pub.relacoes)) pub.relacoes = pub.relacoes.filter(r => ehObj(r) && (r.tipo !== 'cla' || vistos.has(r.alvo))).map(r => (r.tipo === 'cla' ? Object.assign({}, r, vistos.get(r.alvo)) : r));
    if (Array.isArray(pub.hist)) pub.hist = pub.hist.filter(e => ehObj(e) && histVai(e, pub.ver, jog, vistos));
    // (lote 56) sem os cargos, as pessoas deles vão na lista de membros (o nome e a ficha, sem o cargo e sem o respeito)
    if (pub.ver.membros && !pub.ver.cargos && ehObj(d.cargos)) {
      if (!ehObj(pub.membros)) pub.membros = {};
      pub.membros.gente = [];          // (na ordem das chaves do banco)
      for (const k of Object.keys(d.cargos).sort((x, y) => x.length - y.length || (x < y ? -1 : x > y ? 1 : 0))) { const c = d.cargos[k]; if (ehObj(c) && Array.isArray(c.gente)) for (const p of c.gente) if (ehObj(p)) pub.membros.gente.push({ id: p.id == null ? null : p.id, pc: p.pc == null ? null : p.pc, nome: p.nome == null ? null : p.nome }); }
    }
    // (lote 56) no clã de NPC, o respeito de quem não tem cargo também fica de fora
    if (!jog && ehObj(pub.membros) && Array.isArray(pub.membros.avulsos)) pub.membros = Object.assign({}, pub.membros, { avulsos: pub.membros.avulsos.map(p => { if (!ehObj(p)) return p; const q = Object.assign({}, p); delete q.resp; return q; }) });
    if (!jog && ehObj(pub.cargos)) for (const k of Object.keys(pub.cargos)) {
      const c = pub.cargos[k];
      if (ehObj(c) && Array.isArray(c.gente)) c.gente = c.gente.map(p => { if (!ehObj(p)) return p; const q = Object.assign({}, p); delete q.resp; return q; });
    }
    return pub;
  }

  /* ---------------- mudanças com histórico ---------------- */
  /* A mesma coisa mudando de novo, dentro de um minuto (e sem um motivo diferente), junta-se à linha anterior — enquanto
     continua indo para o mesmo lado (+1, +1, +1, −1 é uma linha de +2; voltando ao que era, a linha some). Virando para
     o outro lado (+2 e depois −5), é outra mudança: outra linha. */
  function chaveHist(e) {
    if (e.tipo === 'rec') return e.mud.length === 1 ? 'rec:' + e.mud[0].rec : null;
    if (e.tipo === 'resp') return 'resp';
    if (e.tipo === 'rel') return 'rel:' + e.alvoTipo + ':' + e.alvo;
    if (e.tipo === 'membro') return e.pid ? 'membro:' + e.pid : null;
    return null;
  }
  function anotar(lista, e, max) {
    const l = Array.isArray(lista) ? lista.slice() : [], u = l[0], k = chaveHist(e);
    const perto = u && u.em && e.em && Date.parse(e.em) - Date.parse(u.em) >= 0 && Date.parse(e.em) - Date.parse(u.em) <= JANELA;
    if (u && k && chaveHist(u) === k && perto && (!e.mot || !u.mot || e.mot === u.mot)) {
      const antes = e.tipo === 'rec' ? u.mud[0].d : u.para - u.de, depois = e.tipo === 'rec' ? antes + e.mud[0].d : e.para - u.de;
      if (!depois) { l.shift(); return l; }
      if (Math.sign(depois) === Math.sign(antes)) {
        const m = Object.assign({}, u, { em: e.em, mot: u.mot || e.mot });
        if (e.tipo === 'rec') m.mud = [Object.assign({}, e.mud[0], { d: depois })]; else m.para = e.para;
        l[0] = m;
        return l;
      }
    }
    l.unshift(e);
    return l.slice(0, max);
  }
  function mudarRecurso(cla, rec, delta, mot, em) {
    const c = normCla(cla), r = c.recursos.lista.find(x => x.id === rec);
    if (!r) return null;
    const novo = Math.max(0, Math.min(MAX.qtd, r.qtd + Math.trunc(Number(delta) || 0))), d = novo - r.qtd;
    if (!d) return null;
    r.qtd = novo;
    const e = { em: instante(em), tipo: 'rec', mud: [{ rec: r.id, n: r.nome, d }], mot: linha(mot, MAX.motivo) };
    c.recursos.hist = anotar(c.recursos.hist, e, MAX.rhist);
    c.hist = anotar(c.hist, e, MAX.hist);
    return c;
  }
  const definirRecurso = (cla, rec, qtd, mot, em) => { const r = normCla(cla).recursos.lista.find(x => x.id === rec); return r ? mudarRecurso(cla, rec, inteiro(qtd, r.qtd, 0, MAX.qtd) - r.qtd, mot, em) : null; };
  function mudarRespeito(cla, para, mot, em) {
    const c = normCla(cla), de = c.respeito.v, p = nivel(para);
    if (p === de) return null;
    c.respeito.v = p;
    const e = { em: instante(em), tipo: 'resp', de, para: p, mot: linha(mot, MAX.motivo) };
    c.respeito.hist = anotar(c.respeito.hist, e, MAX.rhist);
    c.hist = anotar(c.hist, e, MAX.hist);
    return c;
  }
  // (nome: o nome de quem está do outro lado, para o histórico — o do clã, a página sabe)
  function mudarRelacao(cla, rel, para, mot, em, nome) {
    const c = normCla(cla), r = c.relacoes.find(x => x.id === rel), p = nivel(para);
    if (!r || r.v === p) return null;
    const e = { em: instante(em), tipo: 'rel', alvoTipo: r.tipo, alvo: r.alvo, nome: linha(nome, MAX.nome) || r.nome, de: r.v, para: p, mot: linha(mot, MAX.motivo) };
    r.v = p;
    c.hist = anotar(c.hist, e, MAX.hist);
    return c;
  }
  // (nome: o nome da pessoa como a página mostra — o do personagem, de agora)
  function mudarMembro(cla, pid, para, mot, em, nome) {
    const c = normCla(cla), p = nivel(para);
    for (const lista of Object.keys(c.cargos).map(k => c.cargos[k].gente).concat([c.membros.avulsos])) {        // (lote 56: e quem não tem cargo)
      const x = lista.find(y => y.id === pid);
      if (!x) continue;
      if (x.resp === p) return null;
      const e = { em: instante(em), tipo: 'membro', pid, nome: linha(nome, MAX.nomePessoa) || x.nome || 'Alguém', de: x.resp, para: p, mot: linha(mot, MAX.motivo) };
      x.resp = p;
      c.hist = anotar(c.hist, e, MAX.hist);
      return c;
    }
    return null;
  }
  // o que falta para subir uma construção de nível: [{ rec, nome, qtd }] (vazio: dá para subir)
  function falta(cla, id) {
    const c = normCla(cla), k = c.construcoes.find(x => x.id === id);
    if (!k) return [];
    return k.prox.custo.map(x => { const r = c.recursos.lista.find(y => y.id === x.rec); return { rec: x.rec, nome: r ? r.nome : x.nome || 'Recurso', qtd: x.qtd - (r ? r.qtd : 0) }; }).filter(x => x.qtd > 0);
  }
  /* "Subir de nível": desconta o custo dos recursos, sobe o nível, o efeito novo (se o mestre escreveu um) passa a
     valer e o custo do próximo nível fica em branco (o mestre escreve). Vai para o histórico. → { ok, falta, cla } */
  function subirNivel(cla, id, em) {
    const c = normCla(cla), k = c.construcoes.find(x => x.id === id);
    if (!k || k.nivel >= MAX.nivel) return { ok: false, falta: [], cla: null };
    const f = falta(c, id);
    if (f.length) return { ok: false, falta: f, cla: null };
    const mud = [];
    for (const x of k.prox.custo) { const r = c.recursos.lista.find(y => y.id === x.rec); r.qtd -= x.qtd; mud.push({ rec: r.id, n: r.nome, d: -x.qtd }); }
    k.nivel += 1;
    if (k.prox.efeito.trim()) k.efeito = k.prox.efeito;
    k.prox = { custo: [], efeito: '' };
    const quando = instante(em), mot = k.nivel === 1 ? k.nome + ' foi construída' : k.nome + ' subiu para o nível ' + k.nivel;
    if (mud.length) c.recursos.hist = anotar(c.recursos.hist, { em: quando, tipo: 'rec', mud, mot }, MAX.rhist);
    c.hist = anotar(c.hist, { em: quando, tipo: 'cons', nome: k.nome, nivel: k.nivel, mud, mot: '' }, MAX.hist);
    return { ok: true, falta: [], cla: c };
  }

  /* ---------------- textos ---------------- */
  const qtdTxt = n => Number(n).toLocaleString('pt-BR');
  const custoTxt = (custo, recursos) => (custo || []).map(x => { const r = recursos && recursos.lista ? recursos.lista.find(y => y.id === x.rec) : null; return qtdTxt(x.qtd) + ' ' + (r ? r.nome : x.nome || 'Recurso'); }).join(' · ');
  const mudTxt = mud => (mud || []).map(x => (x.d > 0 ? '+' : '−') + qtdTxt(Math.abs(x.d)) + ' ' + x.n).join(', ');
  const comMotivo = (t, mot) => (mot ? t + ' — ' + mot : t);
  // o texto de uma linha do histórico (com os nomes dos níveis desta mesa)
  function histTxt(e, nomes) {
    switch (e.tipo) {
      case 'rec': return comMotivo(mudTxt(e.mud), e.mot) + '.';
      case 'cons': return (e.nivel <= 1 ? e.nome + ' foi construída' : e.nome + ' subiu para o nível ' + e.nivel) + (e.mud && e.mud.length ? ' (' + mudTxt(e.mud) + ')' : '') + '.';
      case 'resp': return comMotivo('Respeito no mundo: ' + sinal(e.para) + ' (' + nomeNivel(nomes, 'mundo', e.para) + ')', e.mot) + '.';
      case 'rel': return comMotivo('Relação com ' + (e.nome || (e.alvoTipo === 'cla' ? 'um clã' : 'uma facção')) + ': ' + sinal(e.para) + ' (' + nomeNivel(nomes, 'rel', e.para) + ')', e.mot) + '.';
      case 'membro': return comMotivo('Respeito de ' + e.nome + ' no clã: ' + sinal(e.para) + ' (' + nomeNivel(nomes, 'membro', e.para) + ')', e.mot) + '.';
      default: return e.txt || '';
    }
  }

  const ClaNucleo = {
    ESCALAS, ESCALA_NOME, NIVEL_MAX, NIVEIS, PARTES, PARTE_NOME, FORMAS, DIVISOES, DIV_PATH, ST_PADRAO, SIMB_GRUPOS, divAmostra, simbolosEmGrupos, CORES, ICONES, MAX, SIMBOLOS, JANELA,
    novoId, sinal, normNomes, nomeNivel, nivelTxt, normBrasao, brasaoNovo, brasaoSvg,
    normCargos, filhos, descendentes, arvore, membros, lider, totalCargos, novoCargo, renomearCargo, moverCargo, apagarCargo,
    porPessoa, tirarPessoa, passarLideranca, diffCargos, aplicarDiff,
    normMembros, membrosDe, novoMembro, mudarMembroDados, membroDoSoldado, moverMembro, tirarMembro, normNascM,
    normConstrucoes, normRecursos, normRespeito, normRelacoes, normFaccao, normHist, normVer, normCla, claNovo, normPub, comoVista,
    visivel, projetar, anotar, mudarRecurso, definirRecurso, mudarRespeito, mudarRelacao, mudarMembro, falta, subirNivel,
    custoTxt, mudTxt, histTxt, qtdTxt, normTags, lerQtd,
  };
  if (typeof module === 'object' && module && module.exports) module.exports = ClaNucleo;
  if (typeof window !== 'undefined') window.ClaNucleo = ClaNucleo;
})();
