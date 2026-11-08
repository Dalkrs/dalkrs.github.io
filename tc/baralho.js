/* =======================================================================
   TC.baralho — o Baralho da Cartomante (lote 105), sem DOM. Roda igual no navegador (TC.baralho) e no Node (testes).

   Os documentos da mesa:
     · baralho:cartas      — { v, cartas: [carta] } (o mestre escreve; a mesa lê). Sem ele, valem as 22 cartas padrão daqui.
                             carta = { id, num, nome, tipo, inverte, chance, efeito, invertida, leitura, desenho }
     · baralho:pc:<pc>     — o baralho de um personagem: { v, colecao: [{ u, c, rar }], monte: [u], mao: [{ u, inv }],
                             descarte: [u], armadas: [{ u, inv, onde }], leitura: [{ c, inv }], luta, log: [txt] }.
                             O dono é o dono do personagem (só ele e o mestre o veem: a mão é secreta).
   Regras (respostas do Bruno, 8 nov. 2026): 22 arcanos; começa com algumas cartas e ganha o resto; versões melhores por
   raridade; a carta jogada vai para o descarte e, quando o monte acaba, o descarte volta embaralhado; joga quantas a
   barra Mão deixar; todos veem a carta jogada (só a mão é secreta); fora da luta há a mão de leitura; só algumas cartas
   saem invertidas, e invertida é um efeito diferente (não sempre ruim); armadilha fica escondida na mão ou num quadrado
   das Cenas; invocação vira token com Vida; a leitura usa 1 ou 3 cartas, e Karvevas às vezes mente.
   ======================================================================= */
(function (root) {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const txt = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 200);
  const longo = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').trim().slice(0, max || 1200);
  const idOk = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s);
  const inteiro = (v, lo, hi, pad) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : pad; };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const CARTAS_DOC = 'baralho:cartas', PRE_PC = 'baralho:pc:';
  const TIPOS = [['invocacao', 'Invocação'], ['magia', 'Magia'], ['armadilha', 'Armadilha'], ['arcano', 'Arcano']];
  const RARIDADES = [['comum', 'Comum', ''], ['rara', 'Rara', 'Rara: +2 nos números da carta, ou dura 1 turno a mais.'], ['lendaria', 'Lendária', 'Lendária: +4 nos números, e você escolhe se ela sai invertida ou não.']];
  const MAO_INICIO = 3, MAO_MAX = 7, LOG_MAX = 30;

  /* As 22 cartas padrão (o Claude criou; o Bruno corta). O desenho é um traço simples num quadro 24×24. */
  const PADRAO = [
    { id: 'louco', num: 0, nome: 'O Louco', tipo: 'arcano', inverte: true, chance: 25,
      efeito: 'Embaralhe a mão inteira de volta no monte e puxe a mesma quantidade + 1. Você anda 3 de graça.',
      invertida: 'Puxe 3 cartas ao acaso do descarte para a mão; descarte 1 escolhida por você.',
      leitura: 'Um começo sem plano. Um salto no escuro. Liberdade, e o risco dela.',
      desenho: 'M5 20l4-9 3 3 4-8 3 14M9 6a2 2 0 1 0 0-.01M15 4l2-2' },
    { id: 'mago', num: 1, nome: 'O Mago', tipo: 'invocacao', inverte: false, chance: 0,
      efeito: 'Invocação: o Mago sai da carta e luta 3 turnos (token com Vida {CAN*2}; magia de {CAN/2+3} a 6).',
      invertida: '',
      leitura: 'Você tem o que precisa nas mãos. Habilidade, vontade, começo.',
      desenho: 'M12 3v4M10 5h4M7 21l2-10h6l2 10M5 11h14M9 16h6' },
    { id: 'sacerdotisa', num: 2, nome: 'A Sacerdotisa', tipo: 'arcano', inverte: false, chance: 0,
      efeito: 'O mestre diz uma fraqueza ou um segredo do inimigo à vista que você escolher.',
      invertida: '',
      leitura: 'Algo escondido. Intuição. O que não foi dito ainda.',
      desenho: 'M6 21V8a6 6 0 0 1 12 0v13M12 6v6M9 12h6M9 4l3 2 3-2' },
    { id: 'imperatriz', num: 3, nome: 'A Imperatriz', tipo: 'invocacao', inverte: false, chance: 0,
      efeito: 'Invocação: a Imperatriz cura um aliado por turno ({CAN/3+3}) por 3 turnos (token com Vida {CAN*2}).',
      invertida: '',
      leitura: 'Cuidado, fartura, algo que cresce. Uma mãe, uma terra boa.',
      desenho: 'M12 21c-5 0-7-4-7-8 0-3 3-5 7-5s7 2 7 5c0 4-2 8-7 8zM8 6l2-3 2 2 2-2 2 3' },
    { id: 'imperador', num: 4, nome: 'O Imperador', tipo: 'invocacao', inverte: false, chance: 0,
      efeito: 'Invocação: o Imperador dá ordens por 3 turnos: aliados +2 de dano e +1 de Defesa (token com Vida {CAN*2}).',
      invertida: '',
      leitura: 'Ordem, regra, um chefe. Quem manda aqui.',
      desenho: 'M5 21V9l3 2 4-6 4 6 3-2v12zM9 15h6' },
    { id: 'papa', num: 5, nome: 'O Papa', tipo: 'magia', inverte: false, chance: 0,
      efeito: 'Bênção: aliados a 4 ganham +2 de Defesa e ficam sem medo por 3 turnos.',
      invertida: '',
      leitura: 'Tradição, fé, um mestre. A regra antiga.',
      desenho: 'M12 3v18M8 7h8M7 11h10M9 15h6M12 21' },
    { id: 'enamorados', num: 6, nome: 'Os Enamorados', tipo: 'magia', inverte: false, chance: 0,
      efeito: 'Dois aliados ficam ligados por 3 turnos: cada um dá +2 de dano no outro, e a cura de um cura o outro pela metade.',
      invertida: '',
      leitura: 'Uma escolha entre dois caminhos. Laço, paixão, aliança.',
      desenho: 'M8 10a3 3 0 1 0 0-.01M16 10a3 3 0 1 0 0-.01M5 20c0-4 2-6 3-6s3 2 4 2 3-2 4-2 3 2 3 6' },
    { id: 'carro', num: 7, nome: 'O Carro', tipo: 'invocacao', inverte: false, chance: 0,
      efeito: 'Invocação: um carro de guerra atravessa uma linha de 6: {CAN/2+FOR/3+4} em todos e derruba. Some depois.',
      invertida: '',
      leitura: 'Avançar com força. Vitória pela vontade. Viagem.',
      desenho: 'M4 15h16l-2-6H6zM7 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01M10 9V5h4v4' },
    { id: 'forca', num: 8, nome: 'A Força', tipo: 'invocacao', inverte: false, chance: 0,
      efeito: 'Invocação: uma leoa sai da carta e luta 3 turnos ({CAN/2+5} por golpe; token com Vida {CAN*3}).',
      invertida: '',
      leitura: 'Coragem calma. Domar o que é selvagem. Paciência.',
      desenho: 'M6 14c0-4 3-7 6-7s6 3 6 7-3 6-6 6-6-2-6-6zM9 13h.01M15 13h.01M10 17h4M8 7 6 4M16 7l2-3' },
    { id: 'eremita', num: 9, nome: 'O Eremita', tipo: 'invocacao', inverte: false, chance: 0,
      efeito: 'O Eremita ergue a lanterna: quem está escondido ou invisível num círculo de 4 é revelado; aliados +2 de Percepção 3 turnos.',
      invertida: '',
      leitura: 'Procurar sozinho. Uma luz pequena no escuro. Um conselho velho.',
      desenho: 'M9 21l2-12h2l2 12M15 7h3v4h-3zM16.5 11v2M12 9V5a2 2 0 0 0-4 0' },
    { id: 'roda', num: 10, nome: 'A Roda da Fortuna', tipo: 'armadilha', inverte: true, chance: 25,
      efeito: 'Armadilha. Quando dispara, role 1d6: 1-2 o inimigo erra o próximo golpe; 3-4 você puxa 2 cartas; 5-6 um aliado age agora.',
      invertida: 'A roda gira para o outro lado: role 1d6: 1-2 você erra o próximo golpe; 3-4 o inimigo perde 2 de Defesa; 5-6 você puxa 3 cartas.',
      leitura: 'O destino muda. Sorte que vem e vai. Um ciclo.',
      desenho: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4' },
    { id: 'justica', num: 11, nome: 'A Justiça', tipo: 'armadilha', inverte: true, chance: 25,
      efeito: 'Armadilha. Quando um inimigo te acerta, metade do dano volta para ele.',
      invertida: 'A balança pende: o próximo golpe que você der faz o dobro, mas o próximo que você levar também.',
      leitura: 'O que é justo. Causa e efeito. Um julgamento.',
      desenho: 'M12 3v18M7 21h10M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z' },
    { id: 'enforcado', num: 12, nome: 'O Enforcado', tipo: 'armadilha', inverte: true, chance: 25,
      efeito: 'Armadilha. Quem pisar no quadrado (ou te atacar, se estiver na mão) fica pendurado de cabeça para baixo 1 turno (teste de CAN; chefes só perdem a reação).',
      invertida: 'Você mesmo para no tempo: 1 turno sem agir, mas sem levar dano; volta com 2 cartas a mais.',
      leitura: 'Esperar. Ver de outro ângulo. Um sacrifício que ensina.',
      desenho: 'M4 3h16M12 3v5M12 14a3 3 0 1 0 0-6 3 3 0 1 0 0 6M12 14v4M9 21l3-3 3 3' },
    { id: 'morte', num: 13, nome: 'A Morte', tipo: 'arcano', inverte: true, chance: 25,
      efeito: 'Um inimigo com menos de um quarto da Vida cai. Chefe: não cai; leva +metade do próximo golpe.',
      invertida: 'A Morte olha para você: perde 10 de Vida, mas puxa 3 cartas e a próxima carta não gasta a Mão.',
      leitura: 'Um fim que abre outra porta. Mudança que não volta.',
      desenho: 'M8 21V11a4 4 0 0 1 8 0v10M10 13h.01M14 13h.01M18 3 9 12M18 3l2 5' },
    { id: 'temperanca', num: 14, nome: 'A Temperança', tipo: 'magia', inverte: false, chance: 0,
      efeito: 'Aliados a 3 recuperam {CAN/3+3} e saem de uma condição ruim.',
      invertida: '',
      leitura: 'Equilíbrio, calma, a mistura certa. Ir com cuidado.',
      desenho: 'M7 5h4v6H7zM13 13h4v6h-4zM11 8c3 0 4 2 4 5' },
    { id: 'diabo', num: 15, nome: 'O Diabo', tipo: 'armadilha', inverte: true, chance: 25,
      efeito: 'Armadilha. Quem dispara fica preso a você por correntes 2 turnos: não se afasta (teste de CAN).',
      invertida: 'As correntes se soltam: você e os aliados a 3 saem de qualquer prisão, agarrão ou controle.',
      leitura: 'Uma corrente que você mesmo aceitou. Tentação, vício, um pacto.',
      desenho: 'M6 4l3 4M18 4l-3 4M7 21V12a5 5 0 0 1 10 0v9M10 13h.01M14 13h.01M9 17h6' },
    { id: 'torre', num: 16, nome: 'A Torre', tipo: 'magia', inverte: true, chance: 25,
      efeito: 'Um raio derruba tudo num círculo de 1: {CAN+4}, e quem cair fica caído.',
      invertida: 'A Torre cai em você: você e quem estiver a 1 levam {CAN/2}, mas os inimigos perto perdem a reação.',
      leitura: 'Algo vai desabar de repente. Uma verdade que quebra o que estava firme.',
      desenho: 'M8 21V7h8v14M7 7l1-3h8l1 3M11 21v-4h2v4M16 2l-3 5h3l-3 5' },
    { id: 'estrela', num: 17, nome: 'A Estrela', tipo: 'magia', inverte: true, chance: 25,
      efeito: 'Cura um aliado em {CAN/2+4} e ele ganha +2 em tudo no próximo turno.',
      invertida: 'A estrela cai: cura todos a 2 em {CAN/4+2}, inclusive inimigos.',
      leitura: 'Esperança depois da tempestade. Cura, guia, fé.',
      desenho: 'M12 2l2.6 6.4L21 9l-5 4.4L17.5 20 12 16.6 6.5 20 8 13.4 3 9l6.4-.6z' },
    { id: 'lua', num: 18, nome: 'A Lua', tipo: 'magia', inverte: true, chance: 25,
      efeito: 'Uma névoa de ilusão num círculo de 2 por 2 turnos: quem está dentro tem -3 para acertar.',
      invertida: 'A névoa mostra o que estava escondido: inimigos invisíveis e ilusões num círculo de 4 somem.',
      leitura: 'Ilusão, medo, um caminho que engana. Nem tudo é o que parece.',
      desenho: 'M15 3a8 8 0 1 0 6 13 7 7 0 0 1-6-13z' },
    { id: 'sol', num: 19, nome: 'O Sol', tipo: 'magia', inverte: true, chance: 25,
      efeito: 'Um clarão: todos os inimigos a 2 levam {CAN/2+4} e ficam cegos 1 turno (teste de VIT).',
      invertida: 'O sol nasce para os seus: aliados a 4 ganham +2 de dano e luz por 3 turnos.',
      leitura: 'Alegria, clareza, sucesso. Tudo à luz do dia.',
      desenho: 'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2' },
    { id: 'julgamento', num: 20, nome: 'O Julgamento', tipo: 'arcano', inverte: false, chance: 0,
      efeito: 'Todas as cartas da sua mão são jogadas de uma vez, com o efeito dobrado. Preço: as próximas 3 cartas puxadas saem invertidas (se puderem).',
      invertida: '',
      leitura: 'Um chamado. A hora de responder pelo que fez. Renascer.',
      desenho: 'M4 9l8-5 8 5M6 9v3M18 9v3M8 21v-5h8v5M12 12v4' },
    { id: 'mundo', num: 21, nome: 'O Mundo', tipo: 'arcano', inverte: false, chance: 0,
      efeito: 'Por 2 turnos, toda carta que você joga sai sem gastar a Mão. Preço: Karvevas cobra; por um dia o baralho sai ao acaso (as cartas vêm invertidas no dobro da chance).',
      invertida: '',
      leitura: 'Um ciclo que fecha. Tudo no lugar. O fim de uma viagem.',
      desenho: 'M12 3c5 0 7 4 7 9s-2 9-7 9-7-4-7-9 2-9 7-9zM12 7v10M8 12h8' },
  ];

  /* ---------------- normalizar ---------------- */
  function carta(x) {
    x = ehObj(x) ? x : {};
    const tipo = TIPOS.some(t => t[0] === x.tipo) ? x.tipo : null;
    return { id: idOk(x.id) ? x.id : 'c' + uid(), num: inteiro(x.num, -1, 999, -1), nome: txt(x.nome, 60) || 'Carta', tipo,
      inverte: x.inverte === true, chance: inteiro(x.chance, 0, 100, x.inverte === true ? 25 : 0),
      efeito: longo(x.efeito, 600), invertida: longo(x.invertida, 600), leitura: longo(x.leitura, 400),
      desenho: typeof x.desenho === 'string' && /^[MLHVCSQTAZmlhvcsqtaz0-9 .,-]{0,800}$/.test(x.desenho) ? x.desenho : '' };
  }
  function cartas(d) {
    const l = ehObj(d) && Array.isArray(d.cartas) && d.cartas.length ? d.cartas : PADRAO;
    const out = [], ids = new Set();
    for (const c of l.slice(0, 200)) { const n = carta(c); if (ids.has(n.id)) continue; ids.add(n.id); out.push(n); }
    return { v: 1, cartas: out.sort((a, b) => a.num - b.num || a.nome.localeCompare(b.nome, 'pt-BR')) };
  }
  const rarOk = r => (RARIDADES.some(x => x[0] === r) ? r : 'comum');
  function estado(d) {
    d = ehObj(d) ? d : {};
    const col = (Array.isArray(d.colecao) ? d.colecao : []).filter(ehObj).slice(0, 120)
      .map(x => ({ u: idOk(x.u) ? x.u : uid(), c: idOk(x.c) ? x.c : '', rar: rarOk(x.rar) })).filter(x => x.c);
    const tem = new Set(col.map(x => x.u)), usados = new Set();
    const so = l => (Array.isArray(l) ? l : []).filter(u => typeof u === 'string' && tem.has(u) && !usados.has(u) && usados.add(u));
    const comInv = l => (Array.isArray(l) ? l : []).filter(x => ehObj(x) && tem.has(x.u) && !usados.has(x.u) && usados.add(x.u)).map(x => ({ u: x.u, inv: x.inv === true }));
    const mao = comInv(d.mao), armadas = comInv(d.armadas).map((x, i) => Object.assign(x, { onde: txt((d.armadas[i] || {}).onde, 40) }));
    const descarte = so(d.descarte), monte = so(d.monte);
    // o que ficou de fora (carta nova da coleção) entra no monte
    for (const x of col) if (!usados.has(x.u)) { monte.push(x.u); usados.add(x.u); }
    return { v: 1, colecao: col, monte, mao, descarte, armadas,
      leitura: (Array.isArray(d.leitura) ? d.leitura : []).filter(ehObj).slice(0, 3).map(x => ({ c: idOk(x.c) ? x.c : '', inv: x.inv === true })).filter(x => x.c),
      luta: d.luta === true, proxInv: inteiro(d.proxInv, 0, 9, 0),
      log: (Array.isArray(d.log) ? d.log : []).filter(x => typeof x === 'string').slice(-LOG_MAX) };
  }

  /* ---------------- o jogo ---------------- */
  function embaralhar(l, rnd) { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor((rnd || Math.random)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const cartaDe = (e, cs, u) => { const x = e.colecao.find(y => y.u === u); return x ? { x, c: cs.cartas.find(c => c.id === x.c) || null } : null; };
  function logar(e, t) { e.log.push(t); if (e.log.length > LOG_MAX) e.log.splice(0, e.log.length - LOG_MAX); }
  // sai invertida? (só as cartas que podem; o Julgamento força as próximas)
  function sortearInv(c, rar, e, rnd) {
    if (!c || !c.inverte) return false;
    if (e.proxInv > 0) { e.proxInv--; return true; }
    if (rar === 'lendaria') return false;        // a lendária: quem joga escolhe (vira na mão)
    return (rnd || Math.random)() * 100 < c.chance;
  }
  /* puxar n cartas do monte para a mão (até o máximo); quando o monte acaba, o descarte volta embaralhado → quantas puxou */
  function puxar(e, cs, n, rnd) {
    let k = 0;
    for (let i = 0; i < n && e.mao.length < MAO_MAX; i++) {
      if (!e.monte.length) { if (!e.descarte.length) break; e.monte = embaralhar(e.descarte, rnd); e.descarte = []; logar(e, 'O descarte voltou embaralhado para o monte.'); }
      const u = e.monte.shift(), cc = cartaDe(e, cs, u);
      e.mao.push({ u, inv: sortearInv(cc && cc.c, cc && cc.x.rar, e, rnd) });
      k++;
    }
    return k;
  }
  function comecarLuta(e, cs, rnd) {
    e.monte = embaralhar(e.colecao.map(x => x.u), rnd); e.mao = []; e.descarte = []; e.armadas = []; e.luta = true;
    const n = puxar(e, cs, MAO_INICIO, rnd);
    logar(e, 'Começou a luta: embaralhou e puxou ' + n + '.');
    return n;
  }
  function fimDaLuta(e) {
    e.monte = e.colecao.map(x => x.u); e.mao = []; e.descarte = []; e.armadas = []; e.luta = false; e.proxInv = 0;
    logar(e, 'A luta acabou: todas as cartas voltaram ao baralho.');
  }
  /* jogar uma carta da mão: vai para o descarte (a armadilha, armada, sai da mão e fica escondida) → { carta, inv, rar } */
  function jogar(e, cs, u, armar, onde) {
    const i = e.mao.findIndex(x => x.u === u);
    if (i < 0) return null;
    const m = e.mao.splice(i, 1)[0], cc = cartaDe(e, cs, u);
    if (armar) { e.armadas.push({ u, inv: m.inv, onde: txt(onde, 40) }); logar(e, 'Armou uma armadilha' + (onde ? ' em ' + txt(onde, 40) : '') + '.'); }
    else { e.descarte.push(u); logar(e, 'Jogou ' + (cc && cc.c ? cc.c.nome : 'uma carta') + (m.inv ? ' (invertida)' : '') + '.'); }
    if (cc && cc.c && cc.c.id === 'julgamento' && !armar) e.proxInv = 3;
    return cc ? { carta: cc.c, inv: m.inv, rar: cc.x.rar } : null;
  }
  function disparar(e, cs, u) {
    const i = e.armadas.findIndex(x => x.u === u);
    if (i < 0) return null;
    const a = e.armadas.splice(i, 1)[0], cc = cartaDe(e, cs, u);
    e.descarte.push(u);
    logar(e, 'Disparou ' + (cc && cc.c ? cc.c.nome : 'uma armadilha') + '.');
    return cc ? { carta: cc.c, inv: a.inv, rar: cc.x.rar } : null;
  }
  function descartar(e, cs, u) {
    const i = e.mao.findIndex(x => x.u === u);
    if (i < 0) return false;
    e.mao.splice(i, 1); e.descarte.push(u);
    const cc = cartaDe(e, cs, u); logar(e, 'Descartou ' + (cc && cc.c ? cc.c.nome : 'uma carta') + '.');
    return true;
  }
  // a lendária na mão: quem joga vira (invertida ou não, se a carta pode)
  function virar(e, cs, u) {
    const m = e.mao.find(x => x.u === u), cc = m && cartaDe(e, cs, u);
    if (!m || !cc || !cc.c || !cc.c.inverte || cc.x.rar !== 'lendaria') return false;
    m.inv = !m.inv; return true;
  }
  /* a leitura fora da luta: 1 ou 3 cartas da coleção inteira. Karvevas às vezes mente: quem decide é o mestre, ao
     interpretar (nada disso fica gravado aqui, porque o jogador lê este documento). */
  function ler(e, cs, n, rnd) {
    const r = rnd || Math.random;
    const pool = embaralhar(e.colecao.map(x => x.u), r).slice(0, n === 3 ? 3 : 1);
    e.leitura = pool.map(u => { const cc = cartaDe(e, cs, u); return { c: cc.x.c, inv: !!(cc.c && cc.c.inverte && r() * 100 < 50) }; });
    logar(e, 'Leitura de ' + e.leitura.length + (e.leitura.length === 1 ? ' carta.' : ' cartas.'));
    return { cartas: e.leitura.slice() };
  }
  function dar(e, cartaId, rar) { const u = uid(); e.colecao.push({ u, c: cartaId, rar: rarOk(rar) }); e.monte.push(u); return u; }
  function tirar(e, u) {
    const i = e.colecao.findIndex(x => x.u === u); if (i < 0) return false;
    e.colecao.splice(i, 1);
    e.monte = e.monte.filter(x => x !== u); e.descarte = e.descarte.filter(x => x !== u);
    e.mao = e.mao.filter(x => x.u !== u); e.armadas = e.armadas.filter(x => x.u !== u);
    return true;
  }
  // o baralho inicial de uma Cartomante (as cabeças dos três ramos da árvore, mais duas)
  const INICIAL = ['mago', 'torre', 'estrela', 'enforcado', 'forca', 'lua'];
  // o texto que vai para a mesa ao vivo
  function anuncio(quem, r) {
    if (!r || !r.carta) return null;
    const c = r.carta, rar = RARIDADES.find(x => x[0] === r.rar);
    const ef = r.inv && c.invertida ? c.invertida : c.efeito;
    return { titulo: quem + ' jogou ' + c.nome + (r.inv ? ' (invertida)' : '') + (r.rar && r.rar !== 'comum' ? ' · ' + rar[1] : ''), resumo: ef + (rar && rar[2] ? ' ' + rar[2] : '') };
  }
  const nomeTipo = t => { const x = TIPOS.find(y => y[0] === t); return x ? x[1] : 'Sem tipo'; };
  const romano = n => { if (n === 0) return '0'; if (!(n > 0)) return ''; const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]; let s = ''; for (const [v, r] of t) while (n >= v) { s += r; n -= v; } return s; };

  const api = { CARTAS_DOC, PRE_PC, TIPOS, RARIDADES, MAO_INICIO, MAO_MAX, PADRAO, INICIAL, carta, cartas, estado, embaralhar, puxar, comecarLuta, fimDaLuta, jogar, disparar, descartar, virar, ler, dar, tirar, anuncio, nomeTipo, romano, cartaDe };
  (root.TC || (root.TC = {})).baralho = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
