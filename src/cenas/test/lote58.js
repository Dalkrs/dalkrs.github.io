// Bateria do lote 58 nas Cenas: os lugares de água e penhasco (o Lago, a Praia, o Penhasco e o Desfiladeiro).
//   · as quatro abas na janela, no grupo "Água e penhasco";
//   · cada situação sai sem erro, igual para a mesma semente, com o que ela promete (o lago e o píer, a ilha, a cabana,
//     as cabanas dos pescadores, o paredão com a escada e as grutas, a garganta, o rio no fundo, a ponte de corda);
//   · o hexágono do Mapa-múndi: a beira da água vem do mapa (o junco no lago, a falésia na montanha, o gelo na neve) e o
//     desfiladeiro segue a fenda (com a ponte onde a estrada cruza);
//   · as cenas criadas não dão erro no console.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;

(async () => {
  const t = await open({ w: 1400, h: 950 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  await w(600);
  // o plano de um lugar (sem criar) e o resumo do que saiu
  const plano = (id, op, seed, hex) => ev(({ id, op, seed, hex }) => {
    const L = __tc.Gerador.LUGARES.find(l => l.id === id), E = Object.assign(L.padrao(), op);
    const p = L.gerar(E, Object.assign({ estilo: 'comum', seed }, hex ? { hex } : null)), q = L.gerar(E, Object.assign({ estilo: 'comum', seed }, hex ? { hex } : null));
    const conta = {}; for (const o of p.pintados) conta[o.k] = (conta[o.k] || 0) + 1;
    return { igual: JSON.stringify(p) === JSON.stringify(q), sit: p.sit, terreno: p.terreno, lugar: p.terrenoLugar, aguas: p.aguas.map(a => a.k + ':' + a.tipo), predios: p.predios.length, massas: p.massas.length, abismos: p.abismos.length,
      conta, zonas: p.zonas.map(z => z.fx), caminhos: p.caminhos.length, nome: L.nomePadrao(p), resumo: L.resumo(p), relevo: p.relevo.map(r => r.t) };
  }, { id, op, seed, hex });
  const criar = (id, op, seed, hex) => ev(async ({ id, op, seed, hex }) => {
    const L = __tc.Gerador.LUGARES.find(l => l.id === id), E = Object.assign(L.padrao(), op), comum = Object.assign({ estilo: 'comum', seed }, hex ? { hex } : null), p = L.gerar(E, comum);
    const sc = await L.criar(p, L.nomePadrao(p), { hora: 'dia', clima: '', relevo: true, op: E, o: Object.assign(L.opcoesDe(E), { estilo: 'comum', relevo: true }) });
    __tc.Store.setCurrent(sc.id); __tc.Render.fit();
    return { id: sc.id, tokens: sc.tokens.length, walls: sc.walls.length, shapes: sc.shapes.length };
  }, { id, op, seed, hex });

  /* ---------- as abas ---------- */
  const abas = await ev(() => __tc.Gerador.LUGARES.map(l => l.id));
  ok(['lago', 'praia', 'penhasco', 'desfiladeiro'].every(id => abas.includes(id)), 'as quatro abas novas: ' + j(abas));

  /* ---------- o Lago ---------- */
  for (const sit of ['margem', 'ilha', 'cabana', 'congelado']) {
    const p = await plano('lago', { situacao: sit }, 11);
    ok(p.igual && p.sit === sit && p.lugar === 'lago', 'lago/' + sit + ': sai igual para a mesma semente');
    if (sit !== 'congelado') ok(p.aguas.includes('lago:agua') && p.terreno === 'floresta', 'lago/' + sit + ': o lago no chão da floresta — ' + j(p.aguas));
    if (sit === 'margem') ok(p.conta.passarela >= 1 && p.conta.barco >= 1, 'a margem: o píer e o barco — ' + j(p.conta));
    if (sit === 'ilha') ok(p.relevo.includes('morro') && (p.conta.pedras >= 1 || p.conta.barco >= 1), 'a ilha no meio (o chão mais alto) e as pedras de atravessar ou o barco — ' + j(p.conta));
    if (sit === 'cabana') ok(p.predios === 1 && p.conta.passarela >= 1, 'a cabana do pescador com o píer');
    if (sit === 'congelado') ok(p.aguas.includes('lago:gelo') && p.terreno === 'neve', 'o lago congelado, na neve');
  }
  ok(/Ilha no meio \(lago\)/.test((await plano('lago', { situacao: 'ilha' }, 5)).nome), 'o nome da cena: "Ilha no meio (lago)"');
  await criar('lago', { situacao: 'margem' }, 11); await w(900); await foto('l58-lago-margem');
  await criar('lago', { situacao: 'ilha' }, 7); await w(900); await foto('l58-lago-ilha');

  /* ---------- a Praia ---------- */
  for (const sit of ['enseada', 'pescadores', 'naufragio', 'mare']) {
    const p = await plano('praia', { situacao: sit }, 3);
    ok(p.igual && p.sit === sit && p.aguas.some(a => /mar/.test(a)), 'praia/' + sit + ': o mar da costa — ' + j(p.aguas));
    if (sit === 'pescadores') ok(p.predios >= 2 && p.conta.passarela >= 1 && p.conta.barco >= 2, 'a vila de pescadores: as cabanas, o píer e os barcos — ' + j({ predios: p.predios, c: p.conta }));
  }
  await criar('praia', { situacao: 'pescadores' }, 3); await w(900); await foto('l58-praia-pescadores');

  /* ---------- o Penhasco ---------- */
  for (const sit of ['precipicio', 'falesia', 'encosta']) {
    const p = await plano('penhasco', { situacao: sit }, 21);
    ok(p.igual && p.sit === sit, 'penhasco/' + sit + ': sai igual');
    if (sit === 'precipicio') ok(p.conta.falesia === 1 && p.conta.escadaPedra === 1 && p.conta.bocaGruta >= 1 && p.relevo.includes('fosso'), 'a beira do precipício: o paredão, a escada, as grutas e o chão de baixo — ' + j(p.conta));
    if (sit === 'falesia') ok(p.conta.falesia === 1 && p.aguas.some(a => /mar/.test(a)), 'a falésia no mar');
  }
  await criar('penhasco', { situacao: 'precipicio' }, 21); await w(900); await foto('l58-penhasco');

  /* ---------- o Desfiladeiro ---------- */
  for (const sit of ['garganta', 'rio', 'ponte', 'canion']) {
    const p = await plano('desfiladeiro', { situacao: sit }, 9);
    ok(p.igual && p.sit === sit, 'desfiladeiro/' + sit + ': sai igual');
    if (sit === 'garganta') ok(p.massas >= 2, 'a garganta: os dois paredões');
    if (sit === 'rio') ok(p.massas >= 2 && p.aguas.some(a => a.startsWith('rio')), 'o rio no fundo, entre os paredões');
    if (sit === 'ponte') ok(p.abismos === 1 && p.conta.ponte === 1, 'a ponte suspensa sobre o abismo');
    if (sit === 'canion') ok(p.terreno === 'deserto' && p.massas >= 2, 'o cânion de arenito, no deserto');
  }
  await criar('desfiladeiro', { situacao: 'rio' }, 9); await w(900); await foto('l58-desfiladeiro-rio');

  /* ---------- mais variedade na floresta ---------- */
  const ru = await plano('encontro', { terreno: 'floresta', situacao: 'ruinas' }, 13);
  ok(ru.igual && ru.massas >= 6 && ru.relevo.includes('mata'), 'floresta/ruínas no mato: os pedaços de muro e a mata fechada — ' + ru.massas);
  const lg = await plano('encontro', { terreno: 'floresta', situacao: 'lagoa' }, 13);
  ok(lg.igual && lg.aguas.includes('lago:agua'), 'floresta/lagoa na clareira: a água parada');
  await criar('encontro', { terreno: 'floresta', situacao: 'ruinas' }, 13); await w(900); await foto('l58-floresta-ruinas');

  /* ---------- o hexágono do Mapa-múndi ---------- */
  // a beira: o vizinho de água a leste, com o junco (lago), e a oeste com a falésia
  const hexBase = { q: 3, r: 4, orient: 'pe', sem: 77, ter: 'floresta', nome: 'Floresta', viz: { l: 'agua', ne: 'floresta', no: 'floresta', o: 'floresta', so: 'floresta', se: 'floresta' }, rios: [], caminhos: [] };
  const junco = await plano('encontro', { terreno: 'floresta', situacao: 'clareira' }, 4, Object.assign({}, hexBase, { margem: { l: 'junco' }, lago: { l: true } }));
  ok(junco.aguas.includes('lago:agua') && !junco.conta.praia && !junco.conta.espuma, 'no hexágono, a água de lago com junco: sem a areia nem a espuma — ' + j({ ag: junco.aguas, c: junco.conta }));
  const rocha = await plano('regiao', { bioma: 'montanha' }, 4, Object.assign({}, hexBase, { ter: 'montanha', margem: { l: 'rocha' } }));
  ok(rocha.conta.falesia >= 1, 'na montanha com o mar ao lado, a falésia na beira — ' + j(rocha.conta));
  const gelo = await plano('regiao', { bioma: 'neve' }, 4, Object.assign({}, hexBase, { ter: 'neve', margem: { l: 'gelo' } }));
  ok(gelo.zonas.includes('gelado'), 'na neve, a borda de gelo (escorrega)');
  // a fenda: do noroeste ao sudeste do tijolo, com o caminho cruzando de oeste a leste
  const fenda = { pecas: [{ pts: [[0.25, 0], [0.45, 0.4], [0.55, 0.6], [0.75, 1]], ini: true, fim: true }], comRio: false, ponte: true };
  const hexF = Object.assign({}, hexBase, { ter: 'montanha', viz: { l: 'montanha', ne: 'montanha', no: 'montanha', o: 'montanha', so: 'montanha', se: 'montanha' }, fenda, caminhos: [{ t: 'estrada', pts: [[0, 0.5], [0.5, 0.5], [1, 0.5]], ini: true, fim: true }] });
  const pf = await plano('desfiladeiro', { situacao: 'ponte' }, 4, hexF);
  ok(pf.abismos === 1 && pf.conta.ponte === 1, 'no hexágono com a fenda e a estrada, a ponte de corda sobre o abismo');
  const pg = await plano('desfiladeiro', { situacao: 'garganta' }, 4, hexF);
  ok(pg.massas >= 2 && /hexágono|Mapa-múndi/i.test(pg.resumo), 'a garganta no hexágono, com o resumo dizendo o hexágono: ' + pg.resumo.slice(-80));
  await criar('desfiladeiro', { situacao: 'ponte' }, 4, hexF); await w(900); await foto('l58-fenda-hex');

  /* ---------- a janela ---------- */
  await ev(() => __tc.Gerador.abrir('lago')); await w(500);
  ok(await page.locator('#ger-prev').count() === 1 && /Margem com junco/.test(await page.locator('.modal').innerText()), 'a aba Lago abre com as situações');
  await foto('l58-janela');
  await page.keyboard.press('Escape'); await w(200);

  const erros = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 8).join('\n'));
  ok(!erros.length, 'sem erros no console');
  console.log((fails ? fails + ' de ' : '') + n + ' verificações ' + (fails ? 'falharam' : 'passaram'));
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
