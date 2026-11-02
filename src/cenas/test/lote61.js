// Bateria do lote 61 nas Cenas: a variedade dos povoados e das masmorras.
//   · o Vilarejo: os formatos (beira de estrada, encruzilhada, na encosta, palafitas), os prédios a mais (a lavoura com o
//     moinho, o celeiro e os campos; a estalagem com o estábulo; a torre de vigia e as guaritas), as situações (dia de
//     feira, festa, atacada, abandonada) e os detalhes pelo chão (pouco, normal, muito);
//   · a Cidade: os banhos, a guilda e a escola, as situações (as ruínas acompanham o bairro recortado);
//   · a Masmorra: os tipos novos (caverna de gelo, vulcânica, colmeia, tumba do deserto), as salas especiais (o enigma, a
//     fonte, a ponte sobre o abismo, o chefe), as armadilhas (escondidas, com o efeito no nome; a alavanca abre a parede
//     falsa) e as variações do traçado (salas redondas, o rio subterrâneo, os desníveis, os corredores irregulares);
//   · sem escolher nada disso, o lugar sai igual a antes; as cenas criadas não dão erro no console.
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
  const plano = (id, op, seed) => ev(({ id, op, seed }) => {
    const L = __tc.Gerador.LUGARES.find(l => l.id === id), E = Object.assign(L.padrao(), op);
    const p = L.gerar(E, { estilo: 'comum', seed }), q = L.gerar(E, { estilo: 'comum', seed });
    const ids = {}; for (const o of (p.sit ? p.sit.itens : []).concat(p.objetos || [])) ids[o.id] = (ids[o.id] || 0) + 1;
    return { igual: JSON.stringify(p) === JSON.stringify(q), json: JSON.stringify(p), resumo: L.resumo(p), ids, tipos: (p.casas || p.predios || []).map(k => k.tipo),
      sit: p.sit ? { k: p.sit.k, det: p.sit.det, ruinas: Object.keys(p.sit.ruinas).length, formas: p.sit.formas.length, chao: p.sit.chao.map(m => m.k) } : null,
      formato: p.formato || null, campos: (p.campos || []).length, encosta: p.encosta ? p.encosta.cortes.length : 0, palafitas: !!p.palafitas, pranchas: p.palafitas ? p.palafitas.pranchas.length : 0,
      relevo: (p.relevo || []).map(r => r.t), salas: (p.salas || []).map(q => q.papel), marcadores: (p.marcadores || []).map(m => m.n), chefe: !!p.chefeEm, rio: !!p.rio61, falsa: !!p.paredeFalsa,
      grade: p.grade || '', lavas: (p.lavas || []).length, gelos: (p.gelos || []).length, zonas: (p.zonas || []).map(z => z.fx), pintados: (p.pintados || []).map(o => o.k),
      objetos: (p.objetos || []).filter(o => o.n).map(o => ({ id: o.id, n: o.n, oculto: !!o.oculto, liga: o.liga })) };
  }, { id, op, seed });
  const criar = (id, op, seed, hora) => ev(async ({ id, op, seed, hora }) => {
    const L = __tc.Gerador.LUGARES.find(l => l.id === id), E = Object.assign(L.padrao(), op), p = L.gerar(E, { estilo: 'comum', seed });
    const sc = await L.criar(p, L.nomePadrao(p), { hora: hora || 'dia', clima: '', relevo: true, op: E, o: Object.assign(L.opcoesDe(E), { estilo: 'comum', relevo: true }) });
    __tc.Store.setCurrent(sc.id); __tc.Render.fit();
    return { id: sc.id, tokens: sc.tokens.map(t => ({ prop: t.prop || null, name: t.name, hidden: !!t.hidden, liga: t.liga || null, size: t.size, turns: t.turns || 1 })), walls: sc.walls.map(x => ({ id: x.id, k: x.k, secret: !!x.secret, open: !!x.open })), lights: sc.lights.length, shapes: sc.shapes.length };
  }, { id, op, seed, hora });

  /* ---------- sem as escolhas novas, igual a antes ---------- */
  for (const [id, op] of [['vila', { tamanho: 'vila', casas: 10 }], ['cidade', { tamanho: 'pequena' }], ['masmorra', { tipo: 'pedra' }]]) {
    const a = await plano(id, op, 4), b = await plano(id, Object.assign({}, op, { situacao: 'normal', detalhe: 'normal' }, id === 'vila' ? { formato: 'padrao', predios: [] } : id === 'masmorra' ? { especiais: [], variantes: [], armadilhas: false } : { publicos: false }), 4);
    ok(a.igual && a.json === b.json && !/"sit"|"formato"|"especiais"|"variantes"|"armadilhas"/.test(a.json), id + ': sem as escolhas novas, o plano sai como antes');
  }

  /* ---------- o Vilarejo: os formatos e os prédios a mais ---------- */
  const est = await plano('vila', { tamanho: 'vila', casas: 10, formato: 'estrada', predios: ['estalagem', 'vigia'] }, 7);
  ok(est.igual && est.formato === 'estrada' && est.tipos.includes('estalagem') && est.tipos.includes('estabulo') && est.tipos.includes('torre') && est.tipos.includes('guarita') && /beira de estrada/.test(est.resumo),
    'beira de estrada, com a estalagem, o estábulo, a torre e as guaritas — ' + j(est.tipos));
  const cruz = await plano('vila', { tamanho: 'vila', casas: 10, formato: 'encruzilhada' }, 7);
  ok(cruz.formato === 'encruzilhada' && cruz.tipos.includes('estalagem') && /encruzilhada/.test(cruz.resumo), 'a encruzilhada já traz a estalagem');
  const lav = await plano('vila', { tamanho: 'vila', casas: 8, predios: ['lavoura'] }, 7);
  ok(lav.tipos.includes('moinho') && lav.tipos.includes('celeiro') && lav.campos >= 1, 'a lavoura: o moinho, o celeiro e os campos — ' + lav.campos + ' campos · ' + j(lav.tipos));
  const enc = await plano('vila', { tamanho: 'vila', casas: 10, formato: 'encosta' }, 7);
  ok(enc.encosta >= 2 && enc.relevo.filter(r => r === 'morro').length >= 2, 'na encosta: os patamares (os muros de arrimo) com o relevo de cada um, sem cortar a praça');
  const pal = await plano('vila', { tamanho: 'vila', casas: 10, formato: 'palafitas', rio: true }, 7);
  ok(pal.palafitas && pal.relevo.includes('agua') && pal.relevo.filter(r => r === 'plataforma').length >= 6 && pal.pranchas >= 3, 'as palafitas: a água, as casas em cima das estacas e as pranchas até as passarelas');

  /* ---------- o Vilarejo: as situações e os detalhes ---------- */
  const feira = await plano('vila', { tamanho: 'vila', casas: 10, situacao: 'feira' }, 5);
  ok(feira.sit && feira.sit.k === 'feira' && (feira.ids.barracaFeira || 0) >= 2 && feira.sit.formas > 0 && /dia de feira/.test(feira.resumo), 'o dia de feira: as barracas e as bandeirinhas — ' + j(feira.ids));
  const festa = await plano('vila', { tamanho: 'vila', casas: 10, situacao: 'festa' }, 5);
  ok(festa.ids.fogueira >= 1 && festa.ids.palco === 1 && (festa.ids.mesaLonga || 0) >= 1 && festa.sit.formas > 4, 'a festa: a fogueira, o palco, as mesas compridas e as bandeirinhas nas ruas — ' + j(festa.ids));
  const ataque = await plano('vila', { tamanho: 'vila', casas: 12, situacao: 'atacada' }, 9);
  ok(ataque.sit.ruinas >= 1 && ataque.sit.chao.includes('cinzas') && (ataque.ids.escombros || 0) >= 1 && /queimad/.test(ataque.resumo), 'atacada: as casas queimadas, a cinza e o entulho — ' + ataque.resumo);
  const aband = await plano('vila', { tamanho: 'vila', casas: 10, situacao: 'abandonada' }, 5);
  ok(aband.sit.ruinas === 10 && aband.sit.chao.includes('mato') && /em ruína/.test(aband.resumo), 'abandonada: todas as casas em ruína e o mato nas ruas');
  const pouco = await plano('vila', { tamanho: 'vila', casas: 10, detalhe: 'pouco' }, 5), muito = await plano('vila', { tamanho: 'vila', casas: 10, detalhe: 'muito' }, 5);
  ok((muito.ids.carroca || 0) >= 1 && Object.values(muito.ids).reduce((a, b) => a + b, 0) > 6 && /muitos detalhes/.test(muito.resumo) && /poucos detalhes/.test(pouco.resumo), 'os detalhes pelo chão: o muito traz as carroças, os barris e os varais — ' + j(muito.ids));

  /* ---------- a Cidade ---------- */
  const cid = await plano('cidade', { tamanho: 'pequena', publicos: true, situacao: 'atacada' }, 5);
  ok(cid.tipos.includes('guilda') && cid.tipos.includes('banhos') && cid.tipos.includes('escola') && cid.sit.ruinas >= 3, 'a cidade: os banhos, a guilda e a escola; atacada, com os prédios queimados — ' + cid.resumo);
  const recorte = await ev(() => { const C = __tc.Gerador.LUGARES.find(l => l.id === 'cidade'), p = C.gerar(Object.assign(C.padrao(), { tamanho: 'media', situacao: 'abandonada' }), { estilo: 'comum', seed: 5 }); const b = __tc.Cidade.recorte(p, 'centro'); return b && b.sit ? { n: b.predios.length, r: Object.keys(b.sit.ruinas).length } : null; });
  ok(recorte && recorte.n > 0 && recorte.r === recorte.n, 'o bairro recortado leva a situação: as ruínas acompanham os prédios dele — ' + j(recorte));

  /* ---------- a Masmorra ---------- */
  for (const [tipo, seed] of [['gelo', 5], ['vulcanica', 6], ['colmeia', 7], ['tumba', 8]]) {
    const p = await plano('masmorra', { tipo }, seed);
    ok(p.igual && p.salas.length >= 3 && !/undefined/.test(p.resumo), 'o tipo novo ' + tipo + ' sai, igual para a mesma semente: ' + p.resumo.slice(0, 70));
    if (tipo === 'gelo') ok(p.gelos >= 1 && p.zonas.includes('gelado'), 'a caverna de gelo: o lago congelado e o chão que escorrega');
    if (tipo === 'vulcanica') ok(p.lavas >= 1 && p.pintados.includes('brasa'), 'a vulcânica: a lava e as rachaduras em brasa');
    if (tipo === 'colmeia') ok((p.ids.casulo || 0) >= 4 && p.zonas.includes('teia'), 'a colmeia: os casulos e as teias');
    if (tipo === 'tumba') ok(p.pintados.includes('areia') && p.salas.includes('jazigo'), 'a tumba do deserto: o jazigo e a areia que escorre');
  }
  const tudo = await plano('masmorra', { tipo: 'pedra', armadilhas: true, especiais: ['enigma', 'fonte', 'ponte', 'chefe'], variantes: ['redondas', 'rio', 'desnivel', 'irregular'] }, 5);
  ok(tudo.igual && tudo.salas.includes('chefe') && tudo.chefe && tudo.salas.includes('enigma') && tudo.salas.includes('fonteSagrada'), 'as salas especiais: o chefe, o enigma e a fonte — ' + j(tudo.salas));
  ok(tudo.marcadores.some(m => /^O enigma/.test(m)) && tudo.marcadores.some(m => /^A fonte/.test(m)), 'o enigma e a fonte têm o marcador do mestre com a resposta e o efeito');
  const arm = tudo.objetos.filter(o => ['placaPressao', 'dardos', 'pendulo', 'fossoEspetos'].includes(o.id));
  ok(arm.some(o => o.id === 'placaPressao') && arm.some(o => o.id === 'dardos') && arm.some(o => o.id === 'fossoEspetos') && tudo.falsa && tudo.objetos.some(o => o.id === 'alavanca' && o.oculto && o.liga != null), 'as armadilhas (com o efeito no nome) e a alavanca escondida da parede falsa — ' + j(arm.map(o => o.id)));
  ok(tudo.rio && tudo.grade.includes('3') && tudo.relevo.some(r => r === 'plataforma' || r === 'fosso') && tudo.pintados.includes('patamar'), 'o rio subterrâneo e os desníveis');
  const ponte = await plano('masmorra', { tipo: 'pedra', tamanho: 'grande', especiais: ['ponte'] }, 11);
  ok(ponte.salas.includes('ponteAbismo') && ponte.grade.includes('4') && ponte.grade.includes('6') && /ponte sobre o abismo/.test(ponte.resumo), 'a ponte sobre o abismo: a sala cortada, com a ponte');
  const cav = await plano('masmorra', { tipo: 'caverna', armadilhas: true, especiais: ['chefe', 'fonte', 'enigma'] }, 5);
  ok(cav.chefe && (cav.ids.fonteSagrada || 0) === 1 && cav.marcadores.some(m => /^O enigma/.test(m)), 'na caverna: o chefe, a fonte e o enigma nas câmaras');

  /* ---------- as cenas ---------- */
  const scF = await criar('vila', { tamanho: 'vila', casas: 10, situacao: 'festa' }, 5, 'noite'); await w(900); await foto('l61-vila-festa');
  ok(scF.tokens.some(x => x.prop === 'palco') && scF.tokens.some(x => x.prop === 'mesaLonga') && scF.shapes > 5, 'a cena da festa: o palco, as mesas e as bandeirinhas');
  const scA = await criar('vila', { tamanho: 'vila', casas: 12, situacao: 'atacada' }, 9, 'noite'); await w(900); await foto('l61-vila-atacada');
  ok(scA.tokens.some(x => x.prop === 'escombros') && scA.tokens.some(x => x.prop === 'barricada' || x.prop === 'carroca') && scA.walls.some(x => x.k === 'door' && x.open), 'a cena atacada: o entulho, a barricada e as portas arrombadas abertas');
  await criar('vila', { tamanho: 'vila', casas: 10, situacao: 'feira', detalhe: 'muito', predios: ['lavoura'] }, 5); await w(900); await foto('l61-vila-feira');
  await criar('vila', { tamanho: 'vila', casas: 10, formato: 'palafitas' }, 7); await w(900); await foto('l61-vila-palafitas');
  await criar('vila', { tamanho: 'vila', casas: 10, formato: 'encosta', predios: ['vigia'] }, 7); await w(900); await foto('l61-vila-encosta');
  await criar('cidade', { tamanho: 'pequena', publicos: true, situacao: 'atacada' }, 5); await w(1200); await foto('l61-cidade-atacada');
  const scM = await criar('masmorra', { tipo: 'pedra', armadilhas: true, especiais: ['enigma', 'fonte', 'ponte', 'chefe'], variantes: ['redondas', 'rio', 'desnivel', 'irregular'] }, 5); await w(1200); await foto('l61-masmorra');
  const alav = scM.tokens.find(x => x.prop === 'alavanca' && x.hidden && x.liga);
  ok(alav && scM.walls.some(x => x.id === alav.liga && x.secret), 'na cena: a alavanca escondida liga na parede falsa (secreta)');
  ok(scM.tokens.some(x => x.prop === 'placaPressao' && x.hidden && /dispara/.test(x.name)) && scM.tokens.some(x => x.size === 2 && x.turns === 2 && !x.prop), 'na cena: a placa escondida com o efeito no nome e o chefe (2 quadrados, 2 turnos)');
  await criar('masmorra', { tipo: 'vulcanica', especiais: ['ponte'] }, 6); await w(1200); await foto('l61-vulcanica');
  await criar('masmorra', { tipo: 'tumba', armadilhas: true, especiais: ['enigma'] }, 8); await w(1200); await foto('l61-tumba');

  /* ---------- a janela ---------- */
  await ev(() => __tc.Gerador.abrir('vila')); await w(500);
  ok(await page.locator('#vila-formato').count() === 1 && await page.locator('#vila-sit').count() === 1 && await page.locator('#vila-det').count() === 1, 'a aba Vilarejo: o formato, a situação e os detalhes');
  await foto('l61-janela-vila');
  await page.keyboard.press('Escape'); await w(200);
  await ev(() => __tc.Gerador.abrir('masmorra')); await w(500);
  ok(await page.locator('#mas-arm').count() === 1 && await page.locator('#mas-esp-chefe').count() === 1 && await page.locator('#mas-var-rio').count() === 1 && /Tumba do deserto/.test(await page.locator('.modal').innerText()), 'a aba Masmorra: os tipos novos, as armadilhas, as salas especiais e as variações');
  await foto('l61-janela-masmorra');
  await page.keyboard.press('Escape'); await w(200);

  const erros = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 8).join('\n'));
  ok(!erros.length, 'sem erros no console');
  console.log((fails ? fails + ' de ' : '') + n + ' verificações ' + (fails ? 'falharam' : 'passaram'));
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
