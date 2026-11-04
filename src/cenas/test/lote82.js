// Bateria do lote 82 nas Cenas — os andares mais rápidos (sem mesa: o mestre, neste navegador):
//   · Andares.chegada (unit): andares alinhados com 5 escadas — cada token chega na escada que usou (na mesma casa);
//     casa ocupada ou com parede — a casa livre mais perto da escada de volta; nunca em cima de outro token nem de
//     uma passagem; andares de tamanhos diferentes — ao lado da escada de volta, em proporção; 4 tokens mantêm a formação;
//   · "Levar 4 para…" no menu do token, com Desfazer;
//   · "Leva ao pisar": o mestre põe o token na escada e ele muda de andar (com o aviso e o Desfazer);
//   · PageUp / PageDown: sobe e desce pelo campo "Andar";
//   · a barra de andares do mestre: os andares do prédio, com quantos tokens em cada um; um clique abre o andar.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));

  /* ---------- o prédio: Térreo e 2º andar, 20 × 14, com 5 escadas ligando um ao outro nas mesmas casas ---------- */
  const P = await ev(() => {
    const { Store, newScene, newToken, Props, Persist, normalizeScene } = __tc;
    const mk = (nome, nivel) => { const sc = normalizeScene(Object.assign(newScene(nome), { cols: 20, rows: 14, cell: 64, nivel })); Store.addScene(sc); Persist.scene(sc.id); return sc; };
    const A = mk('Térreo', 0), B = mk('2º andar', 1);
    const escadas = [[2, 2], [17, 2], [10, 7], [2, 11], [17, 11]];
    const ea = [], eb = [];
    escadas.forEach(([c, r], i) => {
      const pa = Object.assign(Props.novo(A, 'escada', c * 64, r * 64, 1, false), { cena: B.id, name: 'Escada ' + (i + 1) });
      const pb = Object.assign(Props.novo(B, 'escada', c * 64, r * 64, 1, false), { cena: A.id, name: 'Escada ' + (i + 1) });
      A.tokens.push(pa); B.tokens.push(pb); ea.push(pa.id); eb.push(pb.id);
    });
    // um token ao lado de cada escada do térreo (uma casa à direita)
    const toks = escadas.map(([c, r], i) => { const k = newToken(A, (c + 1) * 64, r * 64, { name: 'T' + (i + 1) }); A.tokens.push(k); return k.id; });
    Store.setCurrent(A.id);
    return { A: A.id, B: B.id, ea, eb, toks, escadas };
  });
  await w(250);

  // 1) unit: cada token, pela escada mais perto, chega na mesma casa no 2º andar
  const r1 = await ev(P => {
    const { Store, Andares } = __tc, A = Store.S.scenes[P.A], B = Store.S.scenes[P.B];
    return P.toks.map(id => { const t = A.tokens.find(x => x.id === id), u = Andares.usadaPor(A, [t], B.id); return { u: u.name, c: Andares.chegada(A, B, [t], u)[0] }; });
  }, P);
  ok(r1.every((x, i) => x.u === 'Escada ' + (i + 1)), 'cada token usa a escada ao lado dele: ' + j(r1.map(x => x.u)));
  ok(r1.every((x, i) => x.c.x === (P.escadas[i][0] + 1) * 64 && x.c.y === P.escadas[i][1] * 64), 'alinhados: cada um chega na mesma casa (ao lado da escada que usou) — ' + j(r1.map(x => [x.c.x / 64, x.c.y / 64])));

  // 2) unit: a casa de chegada ocupada (por outro token) e outra com parede — a casa livre mais perto da escada de volta
  const r2 = await ev(P => {
    const { Store, Andares, newToken } = __tc, A = Store.S.scenes[P.A], B = Store.S.scenes[P.B];
    const ocupa = newToken(B, 3 * 64, 2 * 64, { name: 'Já estava' }); B.tokens.push(ocupa);           // na casa ao lado da Escada 1
    B.walls.push({ id: 'wl_teste', x1: 18 * 64 + 32, y1: 2 * 64 - 10, x2: 18 * 64 + 32, y2: 3 * 64 + 10, open: false, locked: false, k: 'wall', secret: false });   // corta a casa ao lado da Escada 2
    const t1 = A.tokens.find(x => x.id === P.toks[0]), t2 = A.tokens.find(x => x.id === P.toks[1]);
    const c1 = Andares.chegada(A, B, [t1])[0], c2 = Andares.chegada(A, B, [t2])[0];
    const naEscada = (c, p) => c.x === p[0] * 64 && c.y === p[1] * 64;
    const d1 = Math.max(Math.abs(c1.x / 64 - 2), Math.abs(c1.y / 64 - 2)), d2 = Math.max(Math.abs(c2.x / 64 - 17), Math.abs(c2.y / 64 - 2));
    const out = { c1: [c1.x / 64, c1.y / 64], c2: [c2.x / 64, c2.y / 64], d1, d2, emCima: naEscada(c1, P.escadas[0]) || naEscada(c2, P.escadas[1]), igual: c1.x === ocupa.x && c1.y === ocupa.y, parede: Andares.temParede(B, c2.x / 64, c2.y / 64, 1) };
    B.tokens = B.tokens.filter(x => x.id !== ocupa.id); B.walls = B.walls.filter(x => x.id !== 'wl_teste');
    return out;
  }, P);
  ok(!r2.igual && r2.d1 === 1 && !r2.emCima, 'casa ocupada: chega numa casa livre colada na Escada 1, não em cima do outro token nem da escada — ' + j(r2));
  ok(!r2.parede && r2.d2 === 1, 'casa com parede: chega numa casa sem parede colada na Escada 2 — ' + j(r2));

  // 3) unit: andares de tamanhos diferentes (o porão tem a metade) — ao lado da escada de volta mais perto, em proporção
  const r3 = await ev(P => {
    const { Store, Andares, newScene, normalizeScene, Props } = __tc, A = Store.S.scenes[P.A];
    const C = normalizeScene(Object.assign(newScene('Porão'), { cols: 10, rows: 7, cell: 64 }));
    const v1 = Object.assign(Props.novo(C, 'escada', 1 * 64, 1 * 64, 1, false), { cena: A.id }), v2 = Object.assign(Props.novo(C, 'escada', 8 * 64, 5 * 64, 1, false), { cena: A.id });
    C.tokens.push(v1, v2);
    const e5 = A.tokens.find(x => x.id === P.ea[4]); const e5c = e5.cena; e5.cena = C.id;     // a Escada 5 (embaixo à direita) leva ao porão
    const t5 = A.tokens.find(x => x.id === P.toks[4]);
    const c = Andares.chegada(A, C, [t5])[0];
    e5.cena = e5c;
    return { c: [c.x / 64, c.y / 64], d: Math.max(Math.abs(c.x / 64 - 8), Math.abs(c.y / 64 - 5)) };
  }, P);
  ok(r3.d === 1, 'tamanhos diferentes: chega ao lado da escada de volta do canto de baixo à direita (a da proporção) — ' + j(r3));

  // 4) unit: 4 tokens juntos mantêm a formação (andares alinhados e não alinhados)
  const r4 = await ev(P => {
    const { Store, Andares, newToken, newScene, normalizeScene, Props } = __tc, A = Store.S.scenes[P.A], B = Store.S.scenes[P.B];
    const g = [[9, 9], [10, 9], [9, 10], [10, 10]].map(([c, r], i) => newToken(A, c * 64, r * 64, { name: 'G' + i }));
    const al = Andares.chegada(A, B, g);
    const C = normalizeScene(Object.assign(newScene('Torre'), { cols: 30, rows: 30, cell: 64 }));
    C.tokens.push(Object.assign(Props.novo(C, 'escada', 15 * 64, 15 * 64, 1, false), { cena: A.id }));
    const na = Andares.chegada(A, Object.assign(C, {}), g, A.tokens.find(x => x.id === P.ea[2]));
    const rel = l => l.map(p => [(p.x - l[0].x) / 64, (p.y - l[0].y) / 64]);
    return { al: rel(al), na: rel(na), sep: new Set(na.map(p => p.x + ',' + p.y)).size };
  }, P);
  const forma = j([[0, 0], [1, 0], [0, 1], [1, 1]]);
  ok(j(r4.al) === forma, 'alinhados: os 4 chegam na mesma formação — ' + j(r4.al));
  ok(j(r4.na) === forma && r4.sep === 4, 'não alinhados: os 4 chegam juntos, na mesma formação, cada um na sua casa — ' + j(r4.na));

  // 5) "Levar 4 para…": o mestre seleciona os 4 tokens perto da escada do meio e leva pelo menu, com Desfazer
  const g4 = await ev(P => {
    const { Store, newToken, setSel } = __tc, A = Store.scene();
    const g = [[9, 6], [11, 6], [9, 8], [11, 8]].map(([c, r], i) => newToken(A, c * 64, r * 64, { name: 'Grupo ' + (i + 1) }));
    Store.tx('Grupo', () => g.forEach(k => Store.add('tokens', k)));
    setSel(g.map(k => ({ c: 'tokens', id: k.id })));
    return g.map(k => k.id);
  }, P);
  await w(200);
  await ev(id => __tc.UI.levarAndar(__tc.selOf('tokens'), __tc.Store.S.scenes[Object.keys(__tc.Store.S.scenes).find(k => __tc.Store.S.scenes[k].name === '2º andar')].id), g4[0]);
  await w(250);
  const r5 = await ev(P => { const B = __tc.Store.S.scenes[P.B], A = __tc.Store.S.scenes[P.A]; return { noB: B.tokens.filter(t => /^Grupo/.test(t.name)).map(t => [t.x / 64, t.y / 64]), noA: A.tokens.filter(t => /^Grupo/.test(t.name)).length }; }, P);
  ok(r5.noA === 0 && j(r5.noB) === j([[9, 6], [11, 6], [9, 8], [11, 8]]), '"Levar 4 para 2º andar": os 4 vão juntos e chegam na formação (andares alinhados) — ' + j(r5));
  ok(/4 tokens foram para "2º andar"/.test(await avisos()), 'o aviso diz quantos foram e para onde');
  await foto('l82-levar-4');
  await page.locator('.toast', { hasText: '4 tokens foram' }).locator('button', { hasText: 'Desfazer' }).click(); await w(250);
  const r5b = await ev(P => ({ a: __tc.Store.S.scenes[P.A].tokens.filter(t => /^Grupo/.test(t.name)).length, b: __tc.Store.S.scenes[P.B].tokens.filter(t => /^Grupo/.test(t.name)).length }), P);
  ok(r5b.a === 4 && r5b.b === 0, 'Desfazer traz os 4 de volta — ' + j(r5b));

  // 6) o menu do token: com 4 selecionados, "Levar 4 para 2º andar"
  await ev(ids => __tc.setSel(ids.map(id => ({ c: 'tokens', id }))), g4);
  await w(150);
  const cvb = await page.locator('#cv').boundingBox(), sp = await ev(id => { const t = __tc.Store.get('tokens', id); return __tc.Render.toScreen(t.x + 32, t.y + 32); }, g4[0]);
  await page.mouse.click(cvb.x + sp[0], cvb.y + sp[1], { button: 'right' }); await w(250);
  const menuTxt = await ev(() => (document.querySelector('.menu') || {}).innerText || '');
  await page.keyboard.press('Escape'); await w(100);
  ok(/Levar 4 para 2º andar/.test(menuTxt), 'o menu do token com 4 selecionados oferece "Levar 4 para 2º andar" — ' + menuTxt.replace(/\s+/g, ' ').slice(0, 200));

  // 7) "Leva ao pisar": a Escada 3 (do meio) leva quem para nela; o mestre arrasta o T3 para cima dela
  await ev(P => { const { Store } = __tc; Store.tx('Leva ao pisar', () => Store.upd('tokens', P.ea[2], { pisar: true })); }, P);
  await ev(P => { const { Store, Act } = __tc; const t = Store.get('tokens', P.toks[2]); Store.tx('Mover token', () => Store.upd('tokens', t.id, { x: 10 * 64, y: 7 * 64 })); }, P);
  await w(400);
  const r7 = await ev(P => ({ a: !!__tc.Store.S.scenes[P.A].tokens.find(t => t.id === P.toks[2]), b: (__tc.Store.S.scenes[P.B].tokens.find(t => t.id === P.toks[2]) || null) }), P);
  ok(!r7.a && r7.b && !(r7.b.x === 10 * 64 && r7.b.y === 7 * 64), 'parou na escada que "leva ao pisar": o T3 vai sozinho para o 2º andar, numa casa ao lado da escada (não em cima) — ' + j(r7.b && [r7.b.x / 64, r7.b.y / 64]));
  ok(/T3 foi para "2º andar"/.test(await avisos()), 'o aviso de quem foi, com Desfazer');
  await foto('l82-pisar');

  // 8) PageUp / PageDown: o T1 selecionado sobe (nivel 0 → 1) e desce de novo
  await ev(P => __tc.setSel([{ c: 'tokens', id: P.toks[0] }]), P); await w(100);
  await page.mouse.move(700, 450);
  await page.keyboard.press('PageUp'); await w(300);
  const sobe = await ev(P => !!__tc.Store.S.scenes[P.B].tokens.find(t => t.id === P.toks[0]), P);
  ok(sobe, 'PageUp: o T1 sobe para o 2º andar');
  await ev(P => __tc.UI.switchScene(P.B), P); await w(250);
  await ev(P => __tc.setSel([{ c: 'tokens', id: P.toks[0] }]), P); await w(100);
  await page.keyboard.press('PageDown'); await w(300);
  const desce = await ev(P => !!__tc.Store.S.scenes[P.A].tokens.find(t => t.id === P.toks[0]), P);
  ok(desce, 'PageDown: o T1 desce de volta para o Térreo');
  await ev(P => __tc.UI.switchScene(P.A), P); await w(250);
  await ev(P => __tc.setSel([{ c: 'tokens', id: P.toks[0] }]), P); await w(100);
  await page.keyboard.press('PageDown'); await w(200);
  ok(/Nenhuma passagem desta cena leva para baixo/.test(await avisos()), 'sem andar abaixo: o aviso diz que nenhuma passagem leva para baixo');

  // 9) a barra de andares do mestre: os dois andares, com quantos tokens em cada um; um clique abre o outro
  const barra = await ev(() => [...document.querySelectorAll('#andaresGm .andar-b')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  ok(barra.length === 2 && /^2º andar \d+$/.test(barra[0]) && /^Térreo \d+$/.test(barra[1]), 'a barra mostra o prédio (de cima para baixo), com a contagem de tokens — ' + j(barra));
  const cont = await ev(P => [P.B, P.A].map(id => __tc.Store.S.scenes[id].tokens.filter(t => !t.prop).length), P);
  ok(j(barra.map(x => +x.split(' ').pop())) === j(cont), 'as contagens batem com os tokens de cada andar — ' + j(cont));
  await foto('l82-barra');
  await ev(P => __tc.UI.switchScene(P.A), P); await w(250);
  await page.locator('#andaresGm .andar-b', { hasText: '2º andar' }).click(); await w(250);
  ok(await ev(P => __tc.Store.S.current === P.B, P), 'um clique na barra abre o 2º andar');

  // 10) o painel: o campo "Andar" e a regra "Só pela escada" na aba Cena; "Leva ao pisar" no painel da escada
  await ev(() => __tc.UI.openTab('scene')); await w(200);
  ok(await ev(() => !!document.querySelector('#sc-nivel') && !!document.querySelector('#sc-soescada')), 'a aba Cena tem "Andar" e "Só pela escada" (a cena está num prédio)');
  await page.fill('#sc-nivel', '3'); await page.locator('#sc-nivel').dispatchEvent('change'); await w(150);
  ok(await ev(P => __tc.Store.S.scenes[P.B].nivel === 3, P), 'mudar o "Andar" grava o nível da cena');
  await ev(P => { __tc.setSel([{ c: 'tokens', id: P.eb[0] }]); __tc.UI.openTab('sel'); }, P); await w(250);
  ok(await ev(() => !!document.querySelector('#pr-pisar')), 'o painel da escada tem "Leva ao pisar"');

  // 11) o que se grava: o "pisar", o "nivel" e o "soEscada" passam pela normalização; o "pisar" não vai aos jogadores
  const r11 = await ev(P => { const { normalizeScene, Store, Proj } = __tc; const sc = normalizeScene(JSON.parse(JSON.stringify(Object.assign({}, Store.S.scenes[P.A], { nivel: '2', soEscada: 'sim' })))); const e = sc.tokens.find(t => t.id === P.ea[2]); return { nivel: sc.nivel, so: sc.soEscada, pisar: e.pisar }; }, P);
  ok(r11.nivel === 2 && r11.so === undefined && r11.pisar === true, 'normalizar: nivel "2" vira 2; soEscada só true; pisar fica — ' + j(r11));

  ok(!t.errs || !t.errs.length, 'sem erros no console: ' + (t.errs || []).slice(0, 3).join(' | '));
  console.log((fails ? fails + ' falharam, ' : '') + (n - fails) + ' verificações passaram');
  await t.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
