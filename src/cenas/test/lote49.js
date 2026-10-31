// Bateria do lote 49 nas Cenas: os lugares novos e o lugar povoado.
//   · as abas novas do "Gerar um lugar…": Catacumbas (quatro jeitos), Castelo (inteiro, sitiado, em ruínas; com fosso),
//     Cemitério (com a igreja, os mausoléus e as catacumbas embaixo);
//   · as entradas: a escada do calabouço no castelo, a escada da cripta no cemitério (dois cliques abrem o nível com o
//     jeito certo); o porão, a cisterna e o calabouço também saem como níveis;
//   · "Povoar o lugar": as luzes da hora, os inimigos ocultos (sem Bestiário, com o nome), os moradores com o gerador
//     de NPC, o saque nos baús; e o nível da Entrada povoado também.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;

(async () => {
  const t = await open({ w: 1440, h: 950 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png'), clip }); } };
  const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
  const criar = async () => { await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(600); };
  const cena = () => ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, W: sc.cols, H: sc.rows, walls: sc.walls.length, portas: sc.walls.filter(x => x.k === 'door').length, muretas: sc.walls.filter(x => x.k === 'mureta').length,
    props: sc.tokens.filter(k => k.prop).map(k => k.prop), entradas: sc.tokens.filter(k => k.prop === 'entrada').map(k => ({ n: k.name, gera: k.gera, hidden: k.hidden })), agua: sc.shapes.filter(s => s.ter && s.ter.t === 'agua').length,
    gente: sc.tokens.filter(k => !k.prop).map(k => ({ n: k.name, hidden: k.hidden, notas: (k.notes || '').length, best: !!k.best })), saque: sc.tokens.filter(k => k.saque).length, luzOn: sc.tokens.filter(k => k.prop && k.light && Props_luz(k)).map(k => k.prop + ':' + (k.light.on !== false)) };
    function Props_luz(k) { return !!(__tc.Props.P[k.prop] || {}).luz; } });
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));

  /* ---------- as abas ---------- */
  await ev(() => __tc.Gerador.abrir('castelo')); await w(900);
  const abas = await page.locator('#ger-lugar .seg-b').allInnerTexts();
  ok(['Catacumbas', 'Castelo', 'Cemitério'].every(x => abas.includes(x)), 'as abas novas: Catacumbas, Castelo e Cemitério — ' + abas.join(' / '));
  let E = await G();
  ok(E.plano && E.plano.lugar === 'castelo' && E.plano.paredes.length > 60 && E.plano.objetos.some(o => o.id === 'grade') && E.plano.entradas.length === 1 && E.plano.entradas[0].gera.m === 'calabouco', 'o castelo: as muralhas, a grade levadiça e a escada do calabouço');
  await foto('l49-castelo-inteiro');
  await page.locator('.sw', { has: page.locator('#cas-fosso') }).click(); await w(600);
  E = await G();
  ok(E.plano.fosso && E.plano.objetos.some(o => o.id === 'ponteLevadica') && E.plano.relevo.filter(r => r.t === 'agua').length === 4, 'com fosso: o anel de água e a ponte levadiça');
  await foto('l49-castelo-fosso');
  await page.locator('#cas-est .seg-b', { hasText: 'Sitiado' }).click(); await w(600);
  E = await G();
  ok(E.plano.estado === 'sitiado' && E.plano.objetos.filter(o => o.id === 'catapulta').length === 2 && E.plano.objetos.some(o => o.id === 'ariete') && E.plano.objetos.filter(o => o.id === 'barraca').length >= 3, 'sitiado: o acampamento de fora, as catapultas e o aríete');
  await foto('l49-castelo-sitiado');
  const paredesSit = E.plano.paredes.length;
  await page.locator('#cas-est .seg-b', { hasText: 'Em ruínas' }).click(); await w(600);
  E = await G();
  ok(E.plano.estado === 'ruinas' && E.plano.paredes.length < paredesSit * 0.85 && E.plano.objetos.some(o => o.id === 'arvore') && !E.plano.objetos.some(o => o.id === 'grade'), 'em ruínas: muralhas caídas, o mato e sem a grade — ' + [E.plano.paredes.length, paredesSit]);
  await foto('l49-castelo-ruinas');
  // criar o castelo inteiro, de noite, povoado
  await page.locator('#cas-est .seg-b', { hasText: 'Inteiro' }).click(); await w(400);
  await page.locator('#ger-hora .seg-b', { hasText: 'Noite' }).click(); await w(200);
  await page.locator('.sw', { has: page.locator('#ger-povoar') }).click(); await w(300);
  ok(await page.locator('#ger-perigo').count() === 1 && await page.locator('#ger-pov-inim').count() === 1 && await page.locator('#ger-pov-mor').count() === 1, 'ligado o “Povoar”, aparecem o perigo e o que entra');
  await page.locator('#ger-perigo .seg-b', { hasText: 'Difícil' }).click(); await w(200);
  await foto('l49-janela-povoar');
  await criar();
  let c = await cena();
  ok(c.nome === 'Castelo' && c.walls > 60 && c.props.includes('grade') && c.props.includes('ponteLevadica'), 'a cena do castelo, com a grade e a ponte');
  ok(c.entradas.length === 1 && c.entradas[0].hidden && c.entradas[0].gera.m === 'calabouco', 'a escada do calabouço: oculta, gera o calabouço — ' + j(c.entradas));
  const mor = c.gente.filter(g => !/ \d+$/.test(g.n));
  ok(c.gente.length >= 7 && c.gente.every(g => g.hidden), 'povoado: inimigos e moradores, todos ocultos — ' + c.gente.length);
  ok(mor.length >= 3 && mor.every(g => g.notas > 40), 'os moradores têm nome e notas do gerador de NPC — ' + j(mor.slice(0, 2)));
  ok(c.luzOn.filter(x => x.endsWith(':true')).length >= 4, 'de noite, as tochas acesas — ' + c.luzOn.join(','));
  ok(/Povoado: .*inimigos.*moradores/.test(await avisos()), 'o aviso diz o que entrou — ' + (await avisos()).slice(0, 300));
  await ev(() => { __tc.App.view.z = 0.45; __tc.Render.fit && __tc.Render.fit(); __tc.Render.request(); }); await w(500);
  await foto('l49-castelo-cena');
  // a escada do calabouço: dois cliques abrem o nível com o calabouço escolhido
  await ev(() => { const t = __tc.Store.scene().tokens.find(k => k.prop === 'entrada'); __tc.Masmorra.abrir(t); }); await w(800);
  ok(await page.locator('#mas-tipo .seg-b.on').innerText() === 'Calabouço', 'a janela do nível abre no calabouço — ' + await page.locator('#mas-tipo .seg-b.on').allInnerTexts().catch(() => 'sem'));
  const nivel = await ev(() => JSON.parse(JSON.stringify(__tc.Masmorra.vivo ? null : null)));
  await foto('l49-calabouco');
  await page.keyboard.press('Escape'); await w(300);

  /* ---------- o cemitério ---------- */
  await ev(() => __tc.Gerador.abrir('cemiterio')); await w(900);
  E = await G();
  ok(E.plano.lugar === 'cemiterio' && E.plano.igreja && E.plano.objetos.filter(o => o.id === 'tumulo').length >= 20 && E.plano.objetos.some(o => o.id === 'portao') && E.plano.entradas.length >= 1, 'o cemitério: a igreja, os túmulos, o portão e a escada da cripta');
  await page.locator('#cem-cat .seg-b', { hasText: 'Cripta nobre' }).click(); await w(500);
  E = await G();
  ok(E.plano.entradas.every(e => e.gera.m === 'nobre'), 'as catacumbas embaixo: a cripta nobre');
  await foto('l49-cemiterio');
  await page.locator('.sw', { has: page.locator('#cem-igreja') }).click(); await w(500);
  E = await G();
  ok(!E.plano.igreja && E.plano.entradas.length === 1 && E.plano.salas.some(q => q.papel === 'mausoleu'), 'sem igreja: a cripta fica num mausoléu');
  await page.locator('.sw', { has: page.locator('#cem-igreja') }).click(); await w(400);
  await criar();
  c = await cena();
  ok(c.muretas > 40 && c.props.filter(p => p === 'tumulo').length >= 20 && c.entradas.length >= 1 && c.entradas[0].gera.m === 'nobre', 'a cena do cemitério: o muro baixo, os túmulos e a cripta — ' + j([c.muretas, c.props.filter(p => p === 'tumulo').length, c.entradas]));
  ok(c.gente.some(g => !/ \d+$/.test(g.n) && g.notas > 100) && c.gente.some(g => / \d+$/.test(g.n)), 'povoado: moradores (o padre, o coveiro…) e mortos-vivos — ' + j(c.gente));
  ok(c.gente.filter(g => / \d+$/.test(g.n)).every(g => /Esqueleto|Zumbi|Carniçal|Espectro|Fantasma|Aparição/.test(g.n)), 'sem Bestiário, os inimigos do cemitério vêm com nomes de mortos-vivos — ' + c.gente.filter(g => / \d+$/.test(g.n)).map(g => g.n).join(', '));
  await ev(() => { __tc.Render.fit && __tc.Render.fit(); __tc.Render.request(); }); await w(400);
  await foto('l49-cemiterio-cena');

  /* ---------- as catacumbas ---------- */
  await ev(() => __tc.Gerador.abrir('catacumbas')); await w(900);
  const jeitos = await page.locator('#mas-tipo .seg-b').allInnerTexts();
  ok(j(jeitos) === j(['Ossuário antigo', 'Catacumba de culto', 'Catacumba inundada', 'Cripta nobre']), 'a aba Catacumbas: os quatro jeitos — ' + jeitos.join(' / '));
  const marcas = { 'Ossuário antigo': p => p.objetos.some(o => o.id === 'nichoOssos' || o.id === 'sarcofago') || p.pintados.some(x => x.k === 'ossos'), 'Catacumba de culto': p => p.objetos.some(o => o.id === 'circulo'),
    'Catacumba inundada': p => p.relevo.some(r => r.t === 'agua'), 'Cripta nobre': p => p.objetos.some(o => o.id === 'portao') && p.objetos.some(o => o.id === 'sarcofago') };
  for (const jt of jeitos) {
    await page.locator('#mas-tipo .seg-b', { hasText: jt }).click(); await w(700);
    E = await G();
    ok(E.plano.salas.length >= 3 && marcas[jt](E.plano), `${jt}: as salas e o que é dele`);
    if (jt === 'Cripta nobre') await foto('l49-catacumba-nobre');
    if (jt === 'Catacumba de culto') await foto('l49-catacumba-culto');
  }
  await page.keyboard.press('Escape'); await w(300);
  // o porão, a cisterna e o calabouço também saem
  const sub = await ev(() => ['porao', 'cisterna', 'calabouco'].map(tipo => { const p = __tc.Masmorra.gerar({ tipo, tamanho: 'pequeno', seed: 99 }); return [tipo, p.tipo, p.salas.length, p.objetos.length]; }));
  ok(sub.every(([a, b, s, o]) => a === b && s >= 2 && o > 3), 'o porão, a cisterna e o calabouço: níveis de verdade — ' + j(sub));

  /* ---------- a vila povoada: o poço e o alçapão ---------- */
  await ev(() => __tc.Gerador.abrir('vila')); await w(1200);
  await page.locator('#ger-perigo .seg-b', { hasText: 'Fácil' }).click(); await w(200);
  await criar();
  c = await cena();
  const desce = c.entradas.map(e => e.gera.m);
  ok(desce.includes('porao'), 'na vila povoada, o alçapão desce ao porão' + (desce.includes('cisterna') ? ' e o poço, à cisterna' : '') + ' — ' + j(desce));
  ok(c.gente.length >= 3, 'e a vila ganha moradores e inimigos — ' + c.gente.length);

  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 4).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
