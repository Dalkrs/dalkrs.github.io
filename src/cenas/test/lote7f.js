// Bateria do lote 7 (parte 4b-2), no navegador, sem o site:
//   · a aba Tribo da janela "Gerar um lugar": as moradias (Tendas, Cabanas, Iurtes, Palafitas, Iglus), os três tamanhos,
//     os seis terrenos e as três chaves (a paliçada com o portão, as torres e o fosso; os lugares sagrados; o dia a
//     dia), travar o traçado clicando na prévia ("Gerar outro" troca só os detalhes) e as escolhas guardadas;
//   · a cena da aldeia: as moradias fechadas com o marcador de Entrada (oculto) na porta, o portão da paliçada (uma
//     porta), a cerca do cercado (mureta), as paredes de visão da paliçada, a fogueira, os totens, as tochas e o relevo
//     leve (as torres de 4 m, o fosso);
//   · o interior das moradias (dois cliques na Entrada): uma sala só, redonda nas tendas, nas iurtes e nos iglus, com a
//     fogueira bem no meio, as peles, os baús e os jarros; na do chefe, o assento, as armas e o totem; o estrado de neve
//     do iglu; a janela da cabana e da palafita;
//   · a aldeia das palafitas: as moradias sobre o lago, cada uma com o deque, o píer e a passarela comprida;
//   · as regras dos planos da tribo em muitos sorteios (todas as moradias, tamanhos, terrenos e chaves).
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const foto = async (nome, clip) => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
  const ctlTxt = async () => (await page.locator('.ger-op').innerText()).replace(/\n+/g, ' | ');
  const resumo = () => page.locator('#ger-resumo').innerText();
  const naPrevia = (x, y) => ev(([x, y]) => { const c = document.getElementById('ger-prev'), r = c.getBoundingClientRect(), cell = __tc.Gerador.vivo().cell(), k = Math.min(r.width / c.width, r.height / c.height), ox = (r.width - c.width * k) / 2, oy = (r.height - c.height * k) / 2; return [r.left + ox + x * cell * k, r.top + oy + y * cell * k]; }, [x, y]);
  const abrirGerador = async () => { await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700); };
  const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(450); };
  const chave = async id => { await page.locator('.sw', { has: page.locator('#' + id) }).click(); await w(450); };
  const semente = async v => { const f = page.locator('#ger-semente'); await f.fill(String(v)); await f.press('Enter'); await w(450); };
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(400); };
  const doisCliques = async id => {
    await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); u.Render.centerOn(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await w(150);
    const box = await page.locator('#cv').boundingBox();
    const p2 = await ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Store.get('tokens', id); return u.Render.toScreen(tk.x + sc.cell * tk.size / 2, tk.y + sc.cell * tk.size / 2); }, id);
    await page.mouse.dblclick(box.x + p2[0], box.y + p2[1]); await w(300);
  };

  // ================= a aba Tribo =================
  if (parte('aba')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Tribo' }).click(); await w(700);
    const g0 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'tribo' && g0.plano.lugar === 'tribo' && g0.plano.W === 44 && g0.plano.H === 36, 'a aba Tribo: a aldeia média, de 44 × 36 quadrados');
    const c0 = await ctlTxt();
    ok(/Moradias \| Tendas \| Cabanas \| Iurtes \| Palafitas \| Iglus \| Tamanho \| Pequena \| Média \| Grande \| Terreno \| Campo \| Floresta \| Selva \| Deserto \| Neve \| Pântano \| Paliçada com o portão, as torres de vigia e o fosso com estacas \| Lugares sagrados \(o círculo de pedras com a fogueira dos ancestrais, o mastro com crânios, os totens\) \| O dia a dia \(o cercado com os bichos, os secadores, o forno, o tear, a lenha, o riacho e as canoas\)/.test(c0), 'as escolhas: as moradias, o tamanho, o terreno e as três chaves — ' + c0.slice(0, 300));
    ok(j(g0.op) === j({ moradias: 'tenda', tamanho: 'media', terreno: 'floresta', palicada: true, sagrados: true, vida: true }), 'de começo: as tendas, a média, a floresta e tudo ligado: ' + j(g0.op));
    ok(/^Tendas · \d+ moradias \(com a do chefe\) · 44 × 36 quadrados · paliçada, \d torres e fosso · o círculo de pedras · o cercado\.$/.test(await resumo()), 'o resumo diz as moradias, as medidas, a paliçada, o círculo e o cercado: ' + await resumo());
    ok(await page.locator('#ger-nome').inputValue() === 'Aldeia das tendas', 'o nome da cena: "Aldeia das tendas"');
    ok(/Clique no traçado da prévia \(a praça, as moradias, a paliçada, a água\)/.test(await page.locator('#ger-dica').innerText()) && /marcador de Entrada na porta \(só você vê\)/.test(await page.locator('.modal').innerText()), 'a dica (travar o traçado) e a nota (o que sai) são as da tribo');
    ok(/Com relevo e formas \(as torres de vigia, o fosso, a água, os deques e as passarelas\)/.test(await page.locator('.modal').innerText()), 'a chave do relevo fala das torres e do fosso');
    ok(g0.plano.predios.length >= 7 && g0.plano.predios.every(k => k.desenho === 'tenda' && !k.aberto) && g0.plano.predios.filter(k => k.chefe).length === 1, 'as tendas: todas fechadas, uma delas a do chefe: ' + g0.plano.predios.length);
    await foto('01-aba-tribo');
    // cada moradia muda o nome e o desenho
    for (const [b, mor, nome] of [['Cabanas', 'cabana', 'Aldeia das cabanas'], ['Iurtes', 'iurte', 'Aldeia das iurtes'], ['Palafitas', 'palafita', 'Aldeia das palafitas'], ['Iglus', 'iglu', 'Aldeia dos iglus'], ['Tendas', 'tenda', 'Aldeia das tendas']]) {
      await exato('tri-mor', b);
      const g = await G();
      ok(g.op.moradias === mor && g.plano.moradias === mor && g.plano.predios.every(k => k.desenho === mor && k.interior === mor) && await page.locator('#ger-nome').inputValue() === nome && new RegExp('^' + b + ' · ').test(await resumo()), b + ': o plano, o nome e o resumo acompanham — ' + await resumo());
    }
    // os tamanhos
    await exato('tri-tam', 'Pequena');
    const gp = await G();
    await exato('tri-tam', 'Grande');
    const gg = await G();
    ok(gp.plano.W === 36 && gp.plano.H === 30 && gg.plano.W === 52 && gg.plano.H === 42 && gg.plano.predios.length > gp.plano.predios.length, 'a pequena 36 × 30 e a grande 52 × 42, com mais moradias: ' + j([gp.plano.predios.length, gg.plano.predios.length]));
    ok((await page.locator('#tri-tam button', { hasText: 'Grande' }).getAttribute('title')) === 'Até 13 moradias · 52 × 42 quadrados', 'a dica do tamanho diz quantas moradias cabem');
    await exato('tri-tam', 'Média');
    // o terreno
    await exato('tri-ter', 'Neve');
    ok((await G()).plano.terreno === 'neve' && (await G()).plano.pal === 'neve', 'na neve: o chão de neve');
    await exato('tri-ter', 'Floresta');
    // as chaves
    await chave('tri-pal');
    const sp = await G();
    ok(sp.op.palicada === false && !sp.plano.palicada && !sp.plano.paredes.some(x => x.k === 'door') && sp.plano.visao.length === 0 && !sp.plano.relevo.some(r => r.t === 'fosso' || r.alt === 4) && !/paliçada/.test(await resumo()), 'sem a paliçada: nem o portão, nem as torres, nem o fosso, nem as paredes de visão — ' + await resumo());
    await chave('tri-pal');
    await chave('tri-sag');
    const ss = await G();
    ok(!ss.plano.sagrado && !ss.plano.pintados.some(o => o.k === 'mastroCranios' || o.k === 'anelAncestral') && ss.plano.objetos.filter(o => o.id === 'totem').length === 1 && ss.plano.objetos.filter(o => o.id === 'fogueira').length === 1, 'sem os lugares sagrados: só o totem e a fogueira da praça');
    await chave('tri-sag');
    await chave('tri-vida');
    const sv = await G();
    ok(!sv.plano.cercado && !sv.plano.riacho && !sv.plano.paredes.some(x => x.k === 'mureta') && !sv.plano.pintados.some(o => ['cercado', 'secador', 'fornoBarro', 'tear', 'canoa', 'lenha'].includes(o.k)), 'sem o dia a dia: nem o cercado, nem o riacho, nem os secadores, o forno, o tear, a lenha e as canoas');
    await chave('tri-vida');
    const sc0 = await G();
    ok(sc0.plano.cercado && sc0.plano.riacho && sc0.plano.paredes.filter(x => x.k === 'mureta').length === 5 && sc0.plano.pintados.some(o => o.k === 'secador'), 'com o dia a dia: o cercado (a cerca em cinco pedaços: a porteira fica aberta), o riacho e os secadores');
    // travar o traçado: um clique na praça
    await semente(4242);
    const a = await G();
    ok(!a.plano.travaTracado && await page.locator('#ger-soltar').isDisabled(), 'nada travado de começo');
    { const [sx, sy] = await naPrevia(a.plano.centro[0], a.plano.centro[1]); await page.mouse.click(sx, sy); await w(450); }
    const b = await G();
    ok(b.plano.travaTracado === true && b.trava && b.trava.moradias === 'tenda' && b.trava.s === b.plano.sT && !(await page.locator('#ger-soltar').isDisabled()), 'um clique na praça trava o traçado: ' + j(b.trava));
    await page.locator('#ger-outro').click(); await w(500);
    const c = await G();
    const lay = p => j([p.predios.map(k => [k.x, k.y, k.w, k.h, k.porta.lado, !!k.chefe]), p.palicada, p.caminhos[0], p.aguas, p.sagrado, p.cercado, p.torres]);
    ok(c.seed !== b.seed && lay(c.plano) === lay(b.plano) && c.plano.travaTracado, '"Gerar outro" com o traçado travado: as moradias, a paliçada, a trilha, a água, o círculo e o cercado ficam iguais');
    ok(j(c.plano.arvores) !== j(b.plano.arvores) && j(c.plano.pintados.filter(o => o.k === 'secador')) !== j(b.plano.pintados.filter(o => o.k === 'secador')), 'e as árvores e as coisas do dia a dia mudam');
    await foto('02-travado');
    await exato('tri-mor', 'Iurtes');
    ok(!(await G()).plano.travaTracado, 'trocar as moradias solta a trava (o traçado não cabe igual)');
    await exato('tri-mor', 'Tendas');
    // cancelar não cria nada; as escolhas ficam guardadas
    await exato('tri-ter', 'Deserto');
    const antes = await ev(() => Object.keys(__tc.Store.S.scenes).length);
    await page.locator('.modal .btn', { hasText: 'Cancelar' }).click(); await w(300);
    ok(await ev(n => Object.keys(__tc.Store.S.scenes).length === n && !document.querySelector('.modal'), antes), 'cancelar não cria cena');
    await abrirGerador();
    const g4 = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'tribo' && g4.op.terreno === 'deserto' && g4.op.moradias === 'tenda', 'a janela reabre na Tribo, com as últimas escolhas: ' + j(g4.op));
    // guardar como modelo e abrir de novo
    await page.locator('#ger-guardar').click(); await w(200);
    await page.locator('#ger-modelo-nome').fill('Aldeia do deserto'); await page.locator('#ger-modelo-ok').click(); await w(300);
    const opcoes = await page.locator('#ger-modelo option').allTextContents();
    ok(opcoes.includes('Aldeia do deserto · Tribo'), 'o modelo guardado diz que é da Tribo: ' + j(opcoes));
    const sem = (await G()).seed;
    await exato('tri-ter', 'Neve'); await page.locator('#ger-outro').click(); await w(400);
    await page.locator('#ger-modelo').selectOption({ label: 'Aldeia do deserto · Tribo' }); await w(500);
    const g5 = await G();
    ok(g5.op.terreno === 'deserto' && g5.seed === sem && g5.plano.terreno === 'deserto', 'abrir o modelo volta o deserto e a semente dele');
    await page.keyboard.press('Escape'); await w(300);
    // o que o Mapa-múndi (ou quem mais) manda: as escolhas, já preenchidas
    await ev(() => __tc.Gerador.abrir('tribo', { op: { moradias: 'iglu', terreno: 'neve', tamanho: 'pequena', vida: false } })); await w(700);
    const g6 = await G();
    ok(g6.op.moradias === 'iglu' && g6.op.terreno === 'neve' && g6.op.tamanho === 'pequena' && g6.op.vida === false && !g6.plano.cercado, 'aberta já preenchida (os iglus na neve, sem o dia a dia): ' + j(g6.op));
    await page.keyboard.press('Escape'); await w(300);
    await ev(() => { const o = __tc.App.opt; o.triMor = 'tenda'; o.triTer = 'floresta'; o.triTam = 'media'; o.triVida = true; });
  }

  // ================= a cena da aldeia =================
  let cenaTri = null;
  if (parte('cena') || parte('interior')) {
    await abrirGerador();
    await page.locator('#ger-lugar button', { hasText: 'Tribo' }).click(); await w(600);
    await exato('tri-mor', 'Tendas'); await exato('tri-tam', 'Média'); await exato('tri-ter', 'Floresta');
    await semente(11);
    await page.locator('#ger-hora button', { hasText: 'Noite' }).click(); await w(300);
    const p = (await G()).plano;
    await criar();
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return {
      id: sc.id, nome: sc.name, cols: sc.cols, rows: sc.rows, tom: sc.tone, din: sc.fog.dynamic, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]),
      tipos: sc.walls.reduce((a, x) => (a[x.k] = (a[x.k] || 0) + 1, a), {}), ent: sc.tokens.filter(x => x.prop === 'entrada').map(x => ({ id: x.id, oculto: !!x.hidden, gera: x.gera })),
      obj: sc.tokens.filter(x => x.prop && x.prop !== 'entrada').map(x => x.prop).sort(), ter: sc.shapes.filter(x => x.ter).map(x => [x.ter.t, x.ter.h, x.a]), formas: sc.shapes.filter(x => !x.ter).length,
      luzes: sc.tokens.filter(x => x.prop && x.light && x.light.on).length, icones: u.doorSpots(sc).length, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    cenaTri = s;
    const casaParedes = await ev(p => p.predios.reduce((n, k) => n + __tc.Estilos.paredesDaCasa(Object.assign({}, k, { porta: null, janelas: [] })).length, 0), p);
    ok(s.nome === 'Aldeia das tendas' && s.cols === 44 && s.rows === 36 && s.tom === 'noite' && s.din && s.fundo, 'a cena: o nome da aldeia, 44 × 36, de noite, com a névoa dinâmica e o fundo pintado: ' + j([s.nome, s.cols, s.rows, s.tom]));
    ok(s.tipos.door === 1 && s.tipos.mureta === 5 && s.tipos.wall === p.visao.length + casaParedes && Object.keys(s.tipos).length === 3, 'as paredes: o portão (uma porta), a cerca do cercado (mureta), a paliçada (as de visão) e as moradias (fechadas): ' + j(s.tipos));
    ok(s.icones === 1, 'só o portão tem o ícone de abrir (as moradias são fechadas: entra-se pela Entrada)');
    ok(s.ent.length === p.predios.length && s.ent.every(e => e.oculto && e.gera.t === 'tenda' && e.gera.f === 'oct' && e.gera.e === 'comum') && s.ent.filter(e => e.gera.c === true).length === 1, 'uma Entrada oculta em cada moradia, que sabe que é uma tenda (e qual é a do chefe): ' + j(s.ent.slice(0, 2).map(e => e.gera)));
    const chefe = s.ent.find(e => e.gera.c), kc = p.predios.find(k => k.chefe);
    ok(chefe.gera.w === kc.w && chefe.gera.h === kc.h && chefe.gera.p === kc.porta.lado && kc.w === 5, 'a do chefe: 5 × 5, com a porta do lado da praça: ' + j(chefe.gera));
    ok(s.obj.filter(x => x === 'fogueira').length === 2 && s.obj.filter(x => x === 'totem').length >= 2 && s.obj.filter(x => x === 'tocha').length === 2, 'a fogueira da praça e a dos ancestrais, os totens e as duas tochas do portão: ' + j(s.obj.filter(x => ['fogueira', 'totem', 'tocha'].includes(x))));
    ok(s.luzes >= 4, 'de noite, a fogueira, a dos ancestrais e as tochas iluminam: ' + s.luzes);
    const torres = s.ter.filter(x => x[0] === 'plataforma' && x[1] === 4).length, fosso = s.ter.filter(x => x[0] === 'fosso' && x[1] === -1.5).length;
    ok(s.ter.length === p.relevo.length && torres === p.torres.length && torres === 4 && fosso >= 1 && s.ter.every(x => x[2] > 0 && x[2] < 0.5), 'o relevo leve: as quatro torres de vigia a 4 m, o fosso, o riacho, a ponte: ' + j([torres, fosso, s.ter.length]));
    ok(/"Aldeia das tendas" criada: Tendas · 9 moradias \(com a do chefe\) · 44 × 36 quadrados · paliçada, 4 torres e fosso · o círculo de pedras · o cercado\. Tudo é editável\./.test(s.toast), 'o aviso diz o que foi criado: ' + s.toast);
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('03-cena-aldeia');
    // quem joga não vê as Entradas; a cerca do cercado deixa ver e não deixa passar; o portão abre
    const vis = await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }]; u.UI.setViewer('p1'); const r = sc.tokens.filter(x => x.prop === 'entrada').map(x => u.tokShown(x, sc)); u.UI.setViewer('gm'); return r; });
    ok(vis.length === p.predios.length && vis.every(v => v === false), 'quem joga não vê as Entradas das moradias');
    const vw = await ev(() => { const u = __tc, sc = u.Store.scene(), d = u.Walls.of(sc), mur = sc.walls.filter(x => x.k === 'mureta').length, wall = sc.walls.filter(x => x.k === 'wall').length; return { sight: d.sight.length, move: d.move.length, mur, wall }; });
    ok(vw.move - vw.sight === vw.mur * 4, 'a cerca do cercado barra a passagem, não a visão: ' + j(vw));
    const porta = await ev(() => { const u = __tc, sc = u.Store.scene(), d = sc.walls.find(x => x.k === 'door'), c = sc.cell, mx = (d.x1 + d.x2) / 2, my = (d.y1 + d.y2) / 2, dx = d.y2 - d.y1, dy = -(d.x2 - d.x1), L = Math.hypot(dx, dy) || 1; const a = u.Walls.blocksMove(sc, mx + dx / L * c, my + dy / L * c, mx - dx / L * c, my - dy / L * c); u.Store.tx('abre', () => u.Store.upd('walls', d.id, { open: true })); const b = u.Walls.blocksMove(sc, mx + dx / L * c, my + dy / L * c, mx - dx / L * c, my - dy / L * c); u.Tools.undo(); return [a, b, sc.walls.find(x => x.k === 'door').open]; });
    ok(j(porta) === j([true, false, false]), 'o portão fechado barra a passagem; aberto, deixa passar (Desfazer fecha de novo): ' + j(porta));
  }

  // ================= o interior das moradias =================
  if (parte('interior')) {
    const ent = cenaTri.ent.find(e => e.gera.c);
    await doisCliques(ent.id);
    const menu = (await page.locator('.menu').innerText()).replace(/\n/g, ' | ');
    ok(/Gerar o interior/.test(menu), 'os dois cliques na Entrada da tenda oferecem "Gerar o interior…": ' + menu);
    await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    const tipos = await ev(() => [...document.querySelectorAll('#int-tipo button')].map(b => b.textContent.trim()));
    ok(j(tipos) === j(['Tenda']) && await page.locator('#int-tam').count() === 0, 'a janela do interior: o tipo é só "Tenda" (o tamanho é o da moradia): ' + j(tipos));
    ok(/no dobro do tamanho da moradia: a fogueira no meio, as peles para dormir em volta, os baús e os jarros/.test(await page.locator('.modal').innerText()), 'a nota fala da fogueira, das peles e dos baús');
    ok(await page.locator('#int-nome').inputValue() === 'Tenda do chefe — por dentro' && /^1 sala · \d+ móveis · 10 × 10 quadrados\.$/.test(await page.locator('#int-resumo').innerText()), 'o nome e o resumo: a tenda do chefe, uma sala de 10 × 10: ' + await page.locator('#int-resumo').innerText());
    await foto('04-janela-interior');
    await criar();
    const it = await ev(id => { const u = __tc, sc = u.Store.scene(), fora = u.Store.S.scenes[id], e = fora.tokens.find(x => x.prop === 'entrada' && x.gera && x.gera.c), c = sc.cell; return {
      id: sc.id, nome: sc.name, mae: u.Store.S.pastas.mae[sc.id], liga: e.cena, cols: sc.cols, rows: sc.rows, tom: sc.tone, salaLuz: sc.lights.length,
      diagonais: sc.walls.filter(x => x.x1 !== x.x2 && x.y1 !== x.y2).length, corte: sc.walls.filter(x => x.x1 !== x.x2 && x.y1 !== x.y2).map(x => Math.round(Math.abs(x.x2 - x.x1) / c)), portas: sc.walls.filter(x => x.k === 'door').length, janelas: sc.walls.filter(x => x.k === 'window').length,
      fogo: sc.tokens.filter(x => x.prop === 'fogueira').map(x => [x.x / c, x.y / c]), props: sc.tokens.filter(x => x.prop).map(x => x.prop), saida: (sc.tokens.find(x => x.prop === 'saida') || {}).cena,
      toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; }, cenaTri.id);
    ok(it.nome === 'Tenda do chefe — por dentro' && it.mae === cenaTri.id && it.liga === it.id && it.saida === cenaTri.id, 'a tenda por dentro é uma cena dentro da aldeia; a Entrada leva a ela, e a Saída volta: ' + j([it.nome, it.mae === cenaTri.id, it.liga === it.id]));
    ok(it.cols === 14 && it.rows === 14 && it.diagonais === 4 && it.corte.every(v => v === 3) && it.portas === 1 && it.janelas === 0, 'redonda (as quatro paredes cortadas do octógono, de 3 quadrados), com a porta e sem janela: ' + j([it.cols, it.diagonais, it.corte, it.portas, it.janelas]));
    ok(j(it.fogo) === j([[6.5, 6.5]]), 'a fogueira bem no meio (2 de margem + 4,5): ' + j(it.fogo));
    const conta = id => it.props.filter(x => x === id).length;
    ok(conta('pele') >= 5 && conta('almofada') === 1 && conta('armas') === 1 && conta('totem') === 1 && conta('bau') === 2 && conta('jarro') === 2, 'as peles, o assento, as armas, o totem, os baús e os jarros do chefe: ' + j(it.props));
    ok(it.tom === 'noite' && it.salaLuz === 0, 'de noite, a fogueira é que ilumina (nenhuma luz de sala a mais)');
    ok(/"Tenda do chefe — por dentro" criada, dentro de "Aldeia das tendas": uma sala\./.test(it.toast), 'o aviso diz "uma sala": ' + it.toast);
    await clearToasts();
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(400);
    await foto('05-tenda-do-chefe');
    // uma Entrada posta à mão (sem moradia): as moradias da tribo não aparecem na lista dos prédios
    const mao = await ev(() => { const u = __tc, sc = u.newScene('Entrada à mão'); u.Store.addScene(sc); u.Store.setCurrent(sc.id); const tk = u.Props.novo(sc, 'entrada', 3 * sc.cell, 3 * sc.cell, 1, true); u.Store.tx('x', () => u.Store.add('tokens', tk)); u.Render.fit(); return tk.id; });
    await w(300);
    await ev(id => { const u = __tc, t2 = u.Store.get('tokens', id); u.UI.passagem(t2, 500, 300); }, mao); await w(300);
    await page.locator('.menu-i', { hasText: 'Gerar o interior' }).click(); await w(700);
    const lista = await ev(() => [...document.querySelectorAll('#int-tipo button')].map(b => b.textContent.trim()));
    ok(j(lista) === j(['Casa', 'Loja', 'Taverna', 'Ferraria', 'Armazém', 'Templo', 'Casa do senhor', 'Quartel']), 'numa Entrada posta à mão, a lista dos prédios fica sem as moradias da tribo (e sem o navio): ' + j(lista));
    await page.keyboard.press('Escape'); await w(300);
  }

  // ================= as plantas de dentro (conta pura) =================
  if (parte('plantas')) {
    const r = await ev(() => {
      const I = __tc.Interior, out = {};
      const pl = o => I.gerar(Object.assign({ estilo: 'comum', seed: 5, f: 'oct' }, o));
      for (const tipo of ['tenda', 'iurte', 'iglu', 'cabana', 'palafita']) for (const c of [false, true]) {
        const w = { tenda: c ? 5 : 3, iurte: c ? 5 : 4, iglu: c ? 5 : 3, cabana: c ? 6 : 4, palafita: c ? 5 : 4 }[tipo], h = { tenda: c ? 5 : 3, iurte: c ? 5 : 4, iglu: c ? 5 : 3, cabana: c ? 4 : 3, palafita: c ? 4 : 3 }[tipo];
        for (const p of ['n', 's', 'o', 'l']) {
          const a = pl({ tipo, w, h, p, c }), b = pl({ tipo, w, h, p, c });
          const m = a.salas[0].moveis, fogo = m.find(x => x.id === 'fogueira' || x.id === 'braseiro');
          const dentro = (i, j) => { const k = a.corte || 0; return i >= 0 && j >= 0 && i < a.W && j < a.H && (!k || (i + j >= k && (a.W - 1 - i) + j >= k && i + (a.H - 1 - j) >= k && (a.W - 1 - i) + (a.H - 1 - j) >= k)); };
          const usadas = new Set();
          let sobre = 0, fora = 0;
          for (const x of m) { if (x === fogo) continue; for (let jj = 0; jj < x.s; jj++) for (let ii = 0; ii < x.s; ii++) { const k = (x.x + ii) + ',' + (x.y + jj); if (usadas.has(k)) sobre++; usadas.add(k); if (!dentro(x.x + ii, x.y + jj)) fora++; } }
          const ch = Math.floor(a.W / 2 - 1) + ',' + Math.floor(a.H / 2 - 1);
          out[tipo + (c ? '*' : ' ') + p] = { W: a.W, H: a.H, forma: a.forma, corte: a.corte, igual: JSON.stringify(a) === JSON.stringify(b), fogo: fogo && [fogo.id, fogo.x, fogo.y], peles: m.filter(x => x.id === 'pele').length, bau: m.filter(x => x.id === 'bau').length, jarro: m.filter(x => x.id === 'jarro').length,
            chefe: ['almofada', 'armas', 'totem'].map(id => m.filter(x => x.id === id).length).join(''), sobre, fora, porta: usadas.has(a.entra[0] + ',' + a.entra[1]), meio: usadas.has(ch), janelas: a.janelas.length, relevo: a.relevo.length, formas: a.formas.length, piso: a.piso, parede: a.parede && a.parede.tipo, lado: a.porta.lado, nome: a.nome, entra: a.entra };
        }
      }
      out.tipos = I.PLANTAS.tenda.so && I.PLANTAS.iglu.so && I.PLANTAS.tenda.fogo;
      return out;
    });
    const todos = Object.entries(r).filter(([k]) => k !== 'tipos');
    ok(todos.every(([, v]) => v.igual), 'a planta de uma moradia é uma conta (a mesma semente dá a mesma planta)');
    ok(todos.every(([k, v]) => v.fogo && v.fogo[1] === v.W / 2 - 0.5 && v.fogo[2] === v.H / 2 - 0.5 && v.fogo[0] === (k.startsWith('iglu') ? 'braseiro' : 'fogueira')), 'a fogueira (no iglu, o braseiro) bem no meio de todas: ' + j(todos.map(([k, v]) => [k, v.fogo]).slice(0, 4)));
    ok(todos.every(([, v]) => v.sobre === 0 && v.fora === 0 && !v.meio && !v.porta), 'nenhum móvel em cima de outro, fora da sala (nem nos cantos cortados), em cima da fogueira ou na entrada');
    ok(todos.every(([k, v]) => (/^(tenda|iurte|iglu)/.test(k) ? v.forma === 'oct' && v.corte >= 1 && v.janelas === 0 : v.forma === 'ret' && v.janelas === 1)), 'redondas (o octógono) a tenda, a iurte e o iglu; a cabana e a palafita retas, com uma janela');
    ok(todos.every(([k, v]) => v.peles >= 2 && v.bau >= 1 && v.jarro >= 1 && (k.includes('*') ? v.chefe === '111' && v.bau === 2 && v.jarro === 2 && v.peles >= 4 : v.chefe === '000')), 'as peles, os baús e os jarros; na do chefe, o assento, as armas e o totem: ' + j(todos.map(([k, v]) => [k, v.peles, v.chefe]).slice(0, 6)));
    ok(todos.every(([k, v]) => (k.startsWith('iglu') ? v.relevo === 1 && v.formas === 1 && v.piso === 'neve' && v.parede === 'gelo' : v.relevo === 0 && v.formas === 0)), 'o iglu tem o estrado de neve (a área de meio metro e a forma clara por cima), o chão de neve e as paredes de gelo');
    ok(r['tenda s'].W === 6 && r['tenda*n'].W === 10 && r['cabana*o'].W === 12 && r['cabana*o'].H === 8 && r['tenda s'].piso === 'terra' && r['cabana s'].piso === 'esteira' && r['tenda s'].parede === 'couro' && r['iurte s'].parede === 'feltro' && r['cabana s'].parede === 'troncos', 'o dobro das medidas da moradia; o chão de terra (tenda) ou de esteira (cabana); as paredes de couro, feltro ou troncos');
    ok(r['tenda*n'].nome === 'Tenda do chefe' && r['iglu s'].nome === 'Iglu' && r['palafita*l'].nome === 'Palafita do chefe' && r['tenda s'].lado === 's' && r['tenda*n'].lado === 'n', 'o nome e a porta (do lado de onde se entra)');
    ok(r.tipos === true, 'as moradias só aparecem no marcador delas (não na lista dos prédios da cidade), e a fogueira já ilumina');
  }

  // ================= a aldeia das palafitas =================
  if (parte('palafitas')) {
    const r = await ev(() => {
      const u = __tc, out = [];
      for (const tam of ['pequena', 'media', 'grande']) for (const seed of [3, 11, 21, 40, 77, 123]) {
        const p = u.Tribo.gerar({ moradias: 'palafita', tamanho: tam, terreno: 'pantano', seed }), lago = p.aguas.find(a => a.k === 'lago');
        const dp = u.Encontro.motor.dentroPoli, [ux, uy] = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] }[p.ladoPortao];
        out.push({ tam, seed, n: p.predios.length, lago: !!lago, naAgua: p.predios.every(k => dp(lago.pts, k.x + k.w / 2, k.y + k.h / 2)), deques: p.predios.every(k => k.deque && k.deque.x === k.x - 1 && k.deque.y === k.y - 1 && k.deque.w === k.w + 2 && k.deque.h === k.h + 2),
          relevoDeque: p.relevo.filter(r => r.t === 'plataforma' && r.alt === 1 && r.k === 'rect').length, passarelas: p.pintados.filter(o => o.k === 'passarela').length, riacho: !!p.riacho,
          chefe: (() => { const k = p.predios.find(q => q.chefe); return k ? k.porta.lado === p.ladoPortao && Math.abs((k.x + k.w / 2 - p.centro[0]) * uy) + Math.abs((k.y + k.h / 2 - p.centro[1]) * ux) < 0.6 : false; })(),
          portas: p.predios.every(k => k.porta.lado === p.ladoPortao || k.porta.lado === { s: 'n', n: 's', o: 'l', l: 'o' }[p.ladoPortao]),
          // (da porta, dois passos para fora: o deque e, logo depois, a passarela)
          passarela: p.predios.every(k => { const pt = k.porta, [dx, dy] = { s: [0, 1], n: [0, -1], o: [-1, 0], l: [1, 0] }[pt.lado], fx = (pt.lado === 'o' ? pt.x1 - 1 : pt.x1) + dx, fy = (pt.lado === 'n' ? pt.y1 - 1 : pt.y1) + dy; return p.occ[fy * p.W + fx] === 1; }),
          seca: (p.palicada || []).every(tr => tr.every(([x, y]) => !dp(lago.pts, x, y))) && p.relevo.filter(x => x.t === 'fosso').every(x => x.pts.every(([x2, y2]) => !dp(lago.pts, x2, y2))) });
      }
      return out;
    });
    ok(r.every(x => x.lago && !x.riacho), 'a aldeia das palafitas fica na beira do lago (sem o riacho)');
    ok(r.every(x => x.naAgua && x.deques && x.relevoDeque >= x.n), 'as moradias sobre a água, cada uma com o deque em volta (1 m acima): ' + j(r.map(x => x.n)));
    ok(r.every(x => x.passarelas === 2), 'o píer (da praça até a passarela) e a passarela comprida');
    ok(r.every(x => x.chefe), 'a do chefe do lado de lá, bem na frente do píer, com a porta para ele');
    ok(r.every(x => x.portas && x.passarela), 'as portas dão para a passarela (dos dois lados): da porta, o deque e logo a passarela');
    ok(r.every(x => x.seca), 'a paliçada e o fosso acabam na beira do lago (não entram na água)');
    ok(r.filter(x => x.tam === 'media').every(x => x.n === 9) && r.filter(x => x.tam === 'pequena').every(x => x.n === 6), 'a média com 9 moradias e a pequena com 6: ' + j(r.map(x => x.tam + ':' + x.n)));
  }

  // ================= as regras, em muitos sorteios =================
  if (parte('regras')) {
    const r = await ev(() => {
      const u = __tc, T = u.Tribo, bad = {}, add = (k, m) => { (bad[k] = bad[k] || []).length < 4 && bad[k].push(m); };
      let total = 0, comSag = 0, sag = 0, comVida = 0, cerc = 0, comMastro = 0, mastro = 0;
      const MO2 = u.Encontro.motor;
      const MOR = ['tenda', 'cabana', 'iurte', 'palafita', 'iglu'], TER = ['campo', 'floresta', 'selva', 'deserto', 'neve', 'pantano'];
      for (const mor of MOR) for (const tam of ['pequena', 'media', 'grande']) for (let i = 0; i < 8; i++) {
        const seed = 1 + i * 7919 + mor.length * 31 + tam.length, ter = TER[(i + mor.length) % 6], com = { palicada: i % 4 !== 3, sagrados: i % 5 !== 4, vida: i % 3 !== 2 };
        const o = Object.assign({ moradias: mor, tamanho: tam, terreno: ter, estilo: ['comum', 'oriental', 'nordico', 'desertico', 'elfico', 'anao'][i % 6], seed }, com);
        const p = T.gerar(o), id = mor + '/' + tam + '/s' + seed;
        total++;
        if (JSON.stringify(T.gerar(o)) !== JSON.stringify(p)) add('conta', id);
        if (p.predios.filter(k => k.chefe).length !== 1) add('chefe', id);
        for (let a = 0; a < p.predios.length; a++) {
          const A = p.predios[a];
          if (A.x < 1 || A.y < 1 || A.x + A.w > p.W - 1 || A.y + A.h > p.H - 1) add('fora', id);
          for (let b = a + 1; b < p.predios.length; b++) { const B = p.predios[b]; if (A.x < B.x + B.w + 1 && B.x < A.x + A.w + 1 && A.y < B.y + B.h + 1 && B.y < A.y + A.h + 1) add('juntas', id); }
          const pt = A.porta, fx = pt.lado === 'o' ? pt.x1 - 1 : pt.x1, fy = pt.lado === 'n' ? pt.y1 - 1 : pt.y1;
          if (p.occ[fy * p.W + fx] !== 1) add('porta', id + ' ' + p.occ[fy * p.W + fx]);
          if (p.cercado && A.x < p.cercado.x + p.cercado.w && p.cercado.x < A.x + A.w && A.y < p.cercado.y + p.cercado.h && p.cercado.y < A.y + A.h) add('cercado', id);
          if (p.sagrado && Math.hypot(Math.max(A.x - p.sagrado.x, 0, p.sagrado.x - A.x - A.w), Math.max(A.y - p.sagrado.y, 0, p.sagrado.y - A.y - A.h)) < p.sagrado.r) add('circulo', id);
          // a porta dá para a praça (nas palafitas, para a passarela); a cabana fica com o lado comprido de frente
          const md = [(pt.x1 + pt.x2) / 2, (pt.y1 + pt.y2) / 2];
          if (mor !== 'palafita' && Math.hypot(md[0] - p.centro[0], md[1] - p.centro[1]) >= Math.hypot(A.x + A.w / 2 - p.centro[0], A.y + A.h / 2 - p.centro[1])) add('porta-fora', id);
          if (mor === 'cabana' && ((pt.lado === 'n' || pt.lado === 's') ? A.w < A.h : A.h < A.w)) add('cabana-de-lado', id);
          if (mor !== 'palafita' && p.raios && [[A.x, A.y], [A.x + A.w, A.y], [A.x, A.y + A.h], [A.x + A.w, A.y + A.h]].some(([x, y]) => ((x - p.centro[0]) / (p.raios[0] - 0.5)) ** 2 + ((y - p.centro[1]) / (p.raios[1] - 0.5)) ** 2 > 1)) add('paliçada-casa', id);
        }
        const portas = p.paredes.filter(x => x.k === 'door').length, muretas = p.paredes.filter(x => x.k === 'mureta').length;
        if (com.palicada !== (portas === 1)) add('portao', id + ' ' + portas);
        if (com.palicada !== !!(p.palicada && p.palicada.length) || com.palicada !== (p.visao.length > 0)) add('palicada', id);
        if (com.palicada && (!p.torres || p.torres.length < 2 || p.relevo.filter(x => x.t === 'plataforma' && x.alt === 4).length !== p.torres.length || !p.relevo.some(x => x.t === 'fosso'))) add('torres', id);
        if (!com.palicada && (p.relevo.some(x => x.alt === 4 || x.t === 'fosso') || p.torres)) add('sem-palicada', id);
        const porta = p.paredes.find(x => x.k === 'door');
        if (porta) {
          const ds = (x, y) => { const dx = porta.x2 - porta.x1, dy = porta.y2 - porta.y1, l = dx * dx + dy * dy, tt = Math.max(0, Math.min(1, ((x - porta.x1) * dx + (y - porta.y1) * dy) / l)); return Math.hypot(x - porta.x1 - tt * dx, y - porta.y1 - tt * dy); };
          if (p.torres.some(q => ds(q.x + 1, q.y + 1) < 1.4)) add('torre-no-portao', id);
          if (!p.pintados.some(o => o.k === 'ponteTroncos')) add('ponte', id);
          if (MO2.distLinha(p.caminhos[0].pts, (porta.x1 + porta.x2) / 2, (porta.y1 + porta.y2) / 2) > 1) add('trilha-portao', id);
          if (com.sagrados) { comMastro++; if (p.pintados.some(o => o.k === 'mastroCranios')) mastro++; }
        }
        if (p.riacho && p.palicada && p.palicada.some(tr => tr.some(([x, y]) => MO2.distLinha(p.riacho.pts, x, y) < 2))) add('riacho-palicada', id);
        if (p.cercado) { const pc = p.pintados.find(o => o.k === 'cercado'); if (!pc || pc.bichos.length < 4 || pc.x !== p.cercado.x) add('bichos', id); }
        if (mor !== 'palafita' && p.caminhos.length - 1 < Math.floor(p.predios.length / 2)) add('trilhas-das-portas', id + ' ' + (p.caminhos.length - 1));
        if (com.sagrados) { comSag++; if (p.sagrado) sag++; }
        else if (p.sagrado || p.pintados.some(x => x.k === 'mastroCranios' || x.k === 'anelAncestral') || p.objetos.filter(x => x.id === 'totem').length !== 1) add('sem-sagrados', id);
        if (com.vida) { comVida++; if (p.cercado) cerc++; if (p.cercado && muretas !== 5) add('mureta', id); }
        else if (p.cercado || muretas || p.riacho || p.pintados.some(x => ['cercado', 'secador', 'fornoBarro', 'tear', 'canoa', 'lenha'].includes(x.k))) add('sem-vida', id);
        if ((mor === 'palafita') !== p.aguas.some(a => a.k === 'lago')) add('lago', id);
        if (!p.caminhos.length || p.caminhos[0].tipo !== 'trilha') add('trilha', id);
        if (!p.objetos.some(x => x.id === 'fogueira' && x.s === 1 && x.x === Math.floor(p.centro[0]) && x.y === Math.floor(p.centro[1]))) add('fogueira', id);
        if (!p.tracado.length || !p.raios) add('tracado', id);
        if (T.LUGAR.parteEm(p, p.centro[0], p.centro[1]) !== 'tracado') add('praca', id);
        if (p.predios.some(k => k.desenho !== mor || k.interior !== mor || (['tenda', 'iurte', 'iglu'].includes(mor) ? k.forma !== 'oct' || !(k.corte >= 1) : k.forma !== 'ret'))) add('moradia', id);
        if (JSON.stringify(p, (k, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'X!' : v)).includes('X!')) add('numero', id);
        // a trava do traçado: a mesma conta, com outra semente, dá o mesmo traçado
        const tv = T.travaDe(Object.assign({}, p, { travaTracado: true })), q = T.gerar(Object.assign({}, o, { seed: seed + 1000, trava: tv }));
        const lay = x => JSON.stringify([x.predios.map(k => [k.x, k.y, k.w, k.h]), x.palicada, x.caminhos[0], x.sagrado, x.cercado]);
        if (lay(q) !== lay(p) || !q.travaTracado) add('trava', id);
        if (T.limparTrava(tv, Object.assign({ tamanho: tam, moradias: mor, terreno: ter }, com, { vida: !com.vida })) !== null || T.limparTrava(tv, Object.assign({ tamanho: tam, moradias: mor === 'tenda' ? 'iglu' : 'tenda', terreno: ter }, com)) !== null) add('limpar', id);
      }
      // a pequena (onde aperta): em 300 sorteios, nada por cima de nada — o cercado, o círculo de pedras, as moradias, as
      // torres e a trilha
      const cruza = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
      const longe = (q, rr) => Math.hypot(Math.max(rr[0] - q.x, 0, q.x - rr[0] - rr[2]), Math.max(rr[1] - q.y, 0, q.y - rr[1] - rr[3]));
      for (let k = 1; k <= 300; k++) {
        const mor = MOR[k % 5], o = { moradias: mor, tamanho: 'pequena', terreno: TER[k % 6], seed: k * 101 + 7 }, p = T.gerar(o), id = mor + '/pequena/s' + o.seed;
        const rs = p.predios.map(q => [q.x, q.y, q.w, q.h]).concat((p.torres || []).map(q => [q.x, q.y, 2, 2]));
        const pc = p.cercado && [p.cercado.x, p.cercado.y, p.cercado.w, p.cercado.h];
        if (pc && rs.some(rr => cruza(rr, pc))) add('cercado-sobre', id);
        if (pc && p.sagrado && longe(p.sagrado, pc) < p.sagrado.r) add('cercado-circulo', id);
        if (pc && p.caminhos.length && p.caminhos[0].pts.some(([x, y]) => x > pc[0] - 0.3 && x < pc[0] + pc[2] + 0.3 && y > pc[1] - 0.3 && y < pc[1] + pc[3] + 0.3)) add('cercado-trilha', id);
        if (pc && Math.hypot(pc[0] + pc[2] / 2 - p.centro[0], pc[1] + pc[3] / 2 - p.centro[1]) < T.TAMANHOS.pequena.praca + 2) add('cercado-praca', id);
        if (p.sagrado && rs.some(rr => longe(p.sagrado, rr) < p.sagrado.r)) add('circulo-sobre', id);
      }
      return { bad, total, comSag, sag, comVida, cerc, comMastro, mastro };
    });
    ok(Object.keys(r.bad).length === 0, 'as regras dos planos (' + r.total + ' aldeias): a conta, a do chefe, as moradias dentro do mapa e separadas, a porta livre, fora do cercado e do círculo, o portão só com a paliçada, as torres e o fosso, a trilha, a fogueira no meio, o traçado e a trava — ' + j(r.bad));
    ok(r.sag >= r.comSag * 0.95 && r.cerc >= r.comVida * 0.95 && r.mastro >= r.comMastro * 0.8, 'o círculo de pedras, o cercado e o mastro com crânios quase sempre cabem: ' + j([r.sag, r.comSag, r.cerc, r.comVida, r.mastro, r.comMastro]));
  }

  // ================= os desenhos e os objetos novos =================
  if (parte('pintores')) {
    const r = await ev(() => {
      const u = __tc, out = { erros: [] };
      for (const mor of ['tenda', 'cabana', 'iurte', 'palafita', 'iglu']) for (const est of ['comum', 'oriental', 'nordico', 'desertico', 'elfico', 'anao']) {
        try { const p = u.Tribo.gerar({ moradias: mor, tamanho: 'pequena', terreno: 'campo', estilo: est, seed: 9 }); const cv = u.Encontro.motor.pintar(p, 8); if (!cv.width) out.erros.push(mor + est + ' vazio'); }
        catch (e) { out.erros.push(mor + '/' + est + ': ' + e.message); }
      }
      { const P = u.Encontro.motor.PINTORES, orig = { m: P.moradia, p: P.palicada }, conta = { m: 0, p: 0 };
        P.moradia = function () { conta.m++; return orig.m.apply(this, arguments); }; P.palicada = function () { conta.p++; return orig.p.apply(this, arguments); };
        try { const p = u.Tribo.gerar({ moradias: 'tenda', tamanho: 'pequena', terreno: 'campo', seed: 9 }); u.Encontro.motor.pintar(p, 6); out.chamadas = [conta.m, p.predios.length, conta.p]; } finally { P.moradia = orig.m; P.palicada = orig.p; } }
      out.pintores = ['moradia', 'assentos', 'palicada', 'ponteTroncos', 'torreVigia', 'fossoEstacas', 'mastroCranios', 'anelAncestral', 'cercado', 'secador', 'fornoBarro', 'tear', 'canoa'].filter(k => typeof u.Encontro.motor.PINTORES[k] !== 'function');
      out.props = ['pele', 'armas', 'totem'].map(id => u.Props.P[id] && [u.Props.P[id].g, u.Props.P[id].size]);
      return out;
    });
    ok(r.erros.length === 0, 'as cinco moradias pintam em todos os estilos: ' + j(r.erros));
    ok(r.chamadas[0] === r.chamadas[1] && r.chamadas[2] === 1, 'cada moradia é pintada pelo desenho dela, e a paliçada pelo dela: ' + j(r.chamadas));
    ok(r.pintores.length === 0, 'os desenhos da tribo ficam no motor (as moradias, a paliçada, a ponte de troncos, a torre, o fosso, o mastro, o cercado, o secador, o forno, o tear, a canoa): ' + j(r.pintores));
    ok(j(r.props) === j([['movel', 1], ['movel', 1], ['perigo', 1]]), 'a pele e as armas são móveis; o totem é um marco: ' + j(r.props));
    // na ferramenta de objetos: as armas e a pele, em Móveis; o totem, em Perigos
    await ev(() => { const u = __tc, sc = u.newScene('Objetos'); u.Store.addScene(sc); u.Store.setCurrent(sc.id); u.Render.fit(); u.setSel([]); });
    await page.keyboard.press('j'); await w(200);
    await page.locator('#o-oc .seg-b', { hasText: 'Móveis' }).click(); await w(150);
    ok(await page.locator('#o-obj-armas').count() === 1 && await page.locator('#o-obj-pele').count() === 1, 'na ferramenta de objetos, em Móveis: a pele e as armas');
    await page.locator('#o-oc .seg-b', { hasText: 'Perigos' }).click(); await w(150);
    ok(await page.locator('#o-obj-totem').count() === 1, 'e o totem, em Perigos e marcos');
    await page.keyboard.press('Escape'); await w(150);
  }

  console.log('erros do console:', t.errs.length ? t.errs.slice(0, 5).join(' | ') : 'nenhum');
  ok(!t.errs.length, 'nenhum erro no console');
  console.log(`${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
