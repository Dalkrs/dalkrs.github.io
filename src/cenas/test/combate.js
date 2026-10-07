// No navegador, sem o site: o que o combate faz sozinho na página das Cenas.
//   · as contas (07e-combate.js): o dano que passa, a regra da fixa, a fixa de cada turno, os quadrados livres;
//   · a ferramenta Terreno: pintar (retângulo, elipse, pincel, polígono), ajustar, apagar, desfazer; o que o token
//     e o rodapé mostram; o terreno fora do clique comum; o que o jogador pode e não pode;
//   · F: a janelinha de atributos num token sem ficha; C: a disputa entre dois tokens.
// (Com fichas, pedidos e dois aparelhos, o teste é o src/tests/combate.rede.test.js.)
const { open } = require('./lib');
(async () => {
  let fails = 0, n = 0;
  const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
  const t = await open({ w: 1440, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  // um ponto do mapa, em coordenadas da janela (o mapa muda de lugar quando aparece a faixa "Vendo como…")
  const tela = async (x, y) => { const box = await page.locator('#cv').boundingBox(), p = await ev(([x, y]) => __tc.Render.toScreen(x, y), [x, y]); return [box.x + p[0], box.y + p[1]]; };
  const arrastar = async (x0, y0, x1, y1, passos = 6) => { const a = await tela(x0, y0), b = await tela(x1, y1); await page.mouse.move(a[0], a[1]); await page.mouse.down(); for (let i = 1; i <= passos; i++) await page.mouse.move(a[0] + (b[0] - a[0]) * i / passos, a[1] + (b[1] - a[1]) * i / passos); await page.mouse.up(); await w(); };
  const clicar = async (x, y, o) => { const p = await tela(x, y); await page.mouse.click(p[0], p[1], o); await w(); };
  const pairar = async (x, y) => { const p = await tela(x, y); await page.mouse.move(p[0], p[1]); await w(120); };
  const aviso = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const terrenos = () => ev(() => __tc.Store.scene().shapes.filter(s => s.ter).map(s => JSON.parse(JSON.stringify(s))));
  const C = 64;                                   // o lado de um quadrado da cena de exemplo

  // ================= as contas =================
  const contas = await ev(() => {
    const K = __tc.Combate, o = {};
    o.dano = [K.danoFinal(30, 10, 0, null), K.danoFinal(30, 40, 0, null), K.danoFinal(30, 40, 5, null), K.danoFinal(30, 5, 0, 15), K.danoFinal(30, 0, 10, 4), K.danoFinal(7.5, 2.2, 0, null), K.danoFinal(30, 10), K.danoFinal(30, 10, -5, null), K.danoFinal(30, 0, 0, 0), K.danoFinal('x', 3, 0, null)];
    // a regra da fixa: um dado de (valor − fixa) lados, mais a fixa
    let min = 1e9, max = -1, dadoRuim = 0; const faces = new Set();
    for (let i = 0; i < 3000; i++) { const r = K.rolarFixa(60, 20); if (!r.ok || r.die !== 40 || r.fixa !== 20 || r.atributo !== 60 || r.total !== r.dieValue + 20 || r.dieValue < 1 || r.dieValue > 40) dadoRuim++; min = Math.min(min, r.total); max = Math.max(max, r.total); }
    for (let i = 0; i < 600; i++) faces.add(K.rolarFixa(6, 0).total);
    o.fixa = { min, max, dadoRuim, faces: [...faces].sort().join('') };
    o.total = K.rolarFixa(10, 10); o.passa = K.rolarFixa(10, 99); o.zero = K.rolarFixa(0, 0); o.neg = K.rolarFixa(-4, 0); o.enorme = K.rolarFixa(1e9, 0).ok; o.txt = K.rolarFixa('12', '5');
    o.como = [K.comoSaiu({ die: 40, dieValue: 17, fixa: 20 }), K.comoSaiu({ die: 60, dieValue: 14, fixa: 0 }), K.comoSaiu({ die: 0, dieValue: 0, fixa: 12, atributo: 12 }), K.comoFoi({ die: 40, dieValue: 17, fixa: 20, atributo: 60 }), K.comoFoi({ die: 0, dieValue: 0, fixa: 12, atributo: 12 })];
    o.dd = [K.dadosDe({ die: 40, dieValue: 17 }), K.dadosDe({ die: 0, dieValue: 0 }), K.dadosDe(null)];
    return o;
  });
  ok(JSON.stringify(contas.dano) === '[20,0,5,15,10,5.3,20,20,0,0]', 'o dano que passa: ataque menos defesa, nunca abaixo do mínimo (padrão 0) nem acima do máximo; um máximo menor que o mínimo não vale: ' + JSON.stringify(contas.dano));
  ok(contas.fixa.min === 21 && contas.fixa.max === 60 && contas.fixa.dadoRuim === 0 && contas.fixa.faces === '123456', 'a regra da fixa: 60 fixando 20 dá sempre de 21 a 60 (1d40 + 20), e um d6 mostra as seis faces: ' + JSON.stringify(contas.fixa));
  ok(contas.total.ok && contas.total.total === 10 && contas.total.die === 0 && contas.passa.total === 10 && contas.passa.fixa === 10 && !contas.zero.ok && !contas.neg.ok && contas.enorme === false && contas.txt.atributo === 12 && contas.txt.fixa === 5,
    'fixa igual (ou maior) que o valor não rola dado; valor zero, negativo ou absurdo não rola; texto vira número');
  ok(JSON.stringify(contas.como) === JSON.stringify(['17 no d40 + 20', '14 no d60', 'fixa total', '1d40 + 20, dado 17', 'fixo em 12']) && JSON.stringify(contas.dd) === '[[[40,17]],[],[]]', 'os textos da rolagem e os dados guardados para o auditor: ' + JSON.stringify(contas.como));
  const limpos = await ev(() => {
    const u = __tc, sc = u.normalizeScene(Object.assign(u.newScene('x'), { shapes: [{ id: 'a', k: 'rect', x: 0, y: 0, w: 10, h: 10, ter: { t: 'morro', h: '3' } }, { id: 'b', k: 'rect', x: 0, y: 0, w: 10, h: 10, ter: { t: 'vulcao', h: 3 } }, { id: 'c', k: 'rect', x: 0, y: 0, w: 10, h: 10, ter: { t: 'toString', h: 1 } }, { id: 'd', k: 'rect', x: 0, y: 0, w: 10, h: 10, ter: null }],
      tokens: [{ id: 't1', name: 'Velho', x: 0, y: 0 }, { id: 't2', name: 'Chefe', x: 0, y: 0, turns: 3, fixas: [8, '6', null, 4, 2, 'x'] }, { id: 't3', name: 'Torto', x: 0, y: 0, fixas: 'oi' }] }));
    return { ter: sc.shapes.map(s => (s.ter === undefined ? '-' : s.ter)), fixas: sc.tokens.map(k => k.fixas), limpa: [u.cleanFixas([-3, 2.6, 1e9, '', undefined]), u.cleanTer({ t: 'fosso', h: -1e9 }), u.cleanTer({ t: 'agua' }), u.cleanTer('morro'), u.isTer({ ter: { t: 'mata', h: 0 } }), u.isTer({ ter: { t: 'x' } }), u.isTer({})], novo: u.newToken(sc, 0, 0).fixas };
  });
  ok(JSON.stringify(limpos.ter) === JSON.stringify([{ t: 'morro', h: 3 }, '-', '-', '-']) && JSON.stringify(limpos.fixas) === '[[],[8,6,null,4],[]]' && JSON.stringify(limpos.novo) === '[]',
    'ao abrir uma cena: terreno de tipo desconhecido vira desenho comum; as fixas de um token ficam com no máximo quatro números (ou vazio): ' + JSON.stringify(limpos));
  ok(JSON.stringify(limpos.limpa) === JSON.stringify([[0, 3, 9999, null], { t: 'fosso', h: -9999 }, { t: 'agua', h: 0 }, null, true, false, false]), 'os limites das fixas e da altura: ' + JSON.stringify(limpos.limpa));
  const vagas = await ev(() => {
    const u = __tc, K = u.Combate, sc = u.Store.scene(), cell = sc.cell;
    const occ = new Set(sc.tokens.map(k => Math.floor((k.x + 1) / cell) + ',' + Math.floor((k.y + 1) / cell)));
    const cx = 10.5 * cell, cy = 10.5 * cell, v = K.vagas(sc, 12, cx, cy);
    const chaves = v.map(p => (p[0] / cell) + ',' + (p[1] / cell));
    const dist = v.map(p => Math.max(Math.abs(p[0] / cell - 10), Math.abs(p[1] / cell - 10)));
    const mini = Object.assign(u.newScene('mini'), { cols: 2, rows: 2 }); mini.tokens.push(u.newToken(mini, 0, 0));
    const cheia = K.vagas(mini, 5, 0, 0);
    const borda = K.vagas(sc, 3, -500, 99999);
    return { unicas: new Set(chaves).size, livres: chaves.every(k => !occ.has(k)), dentro: v.every(p => p[0] >= 0 && p[1] >= 0 && p[0] <= (sc.cols - 1) * cell && p[1] <= (sc.rows - 1) * cell), crescente: dist.every((d, i) => !i || d >= dist[i - 1]), primeira: dist[0], cheia: cheia.map(p => p[0] / 64 + ',' + p[1] / 64), borda: borda.map(p => p[0] / cell + ',' + p[1] / cell) };
  });
  ok(vagas.unicas === 12 && vagas.livres && vagas.dentro && vagas.crescente && vagas.primeira <= 1, 'os quadrados para um grupo que chega: um para cada um, todos livres e dentro do mapa, do ponto pedido para fora: ' + JSON.stringify(vagas));
  ok(JSON.stringify(vagas.cheia) === JSON.stringify(['1,0', '0,1', '1,1', '0,0', '0,0']) && vagas.borda[0] === '0,19', 'num mapa sem lugar, os que sobram ficam no ponto pedido; um ponto fora do mapa vale a borda mais próxima: ' + JSON.stringify([vagas.cheia, vagas.borda]));

  // ================= a fixa de cada turno =================
  const ids = await ev(() => { const o = {}; for (const k of __tc.Store.scene().tokens) o[k.name] = k.id; return o; });
  const turno = await ev(id => {
    const u = __tc, K = u.Combate, o = {};
    u.Store.tx('fixas', () => u.Store.upd('tokens', id, { turns: 3, fixas: [8, null, 4] }));
    const k = () => u.Store.get('tokens', id);
    o.de = K.fixasDe(k()); o.parado = K.fixaDoTurno(k());
    u.Act.turnPatch(x => { x.list = []; x.on = false; }, 'limpa');
    u.Act.turnAdd([k(), u.Store.scene().tokens.find(z => z.name === 'Astie')]);
    const vez = n => u.Act.turnPatch(x => { x.on = true; x.cur = x.list.find(e => e.token === id && e.k === n).id; }, 'vez');
    vez(1); o.t1 = K.fixaDoTurno(k()); o.atual1 = u.Luta.fixaAtual(k());
    vez(2); o.t2 = K.fixaDoTurno(k()); o.atual2 = u.Luta.fixaAtual(k());
    vez(3); o.t3 = K.fixaDoTurno(k());
    u.Luta.guardarFixa(k(), 11); o.digitada = u.Luta.fixaAtual(k());
    vez(1); o.volta = u.Luta.fixaAtual(k());
    u.Act.turnPatch(x => { x.cur = x.list.find(e => e.token !== id).id; }, 'vez'); o.outro = K.fixaDoTurno(k());
    u.Act.turnPatch(x => { x.on = false; }, 'para'); o.fim = K.fixaDoTurno(k());
    u.Store.tx('um', () => u.Store.upd('tokens', id, { turns: 1 })); o.umTurno = K.fixasDe(k());
    u.Act.turnPatch(x => { x.list = []; x.on = false; }, 'limpa');
    u.Store.tx('volta', () => u.Store.upd('tokens', id, { turns: 1, fixas: [] }));
    return o;
  }, ids.Bandido);
  ok(JSON.stringify(turno.de) === '[{"k":1,"v":8},{"k":3,"v":4}]' && turno.parado === null && JSON.stringify(turno.t1) === '{"k":1,"v":8}' && turno.t2 === null && JSON.stringify(turno.t3) === '{"k":3,"v":4}' && turno.outro === null && turno.fim === null && JSON.stringify(turno.umTurno) === '[]',
    'a fixa do turno só vale com o combate andando, na vez daquele turno do token, e se o mestre a anotou: ' + JSON.stringify(turno));
  ok(turno.atual1 === 8 && turno.atual2 === 0 && turno.digitada === 11 && turno.volta === 8, 'o "Fixando" começa na fixa do turno; o que for digitado num turno vale só para ele: ' + JSON.stringify([turno.atual1, turno.atual2, turno.digitada, turno.volta]));

  // ================= a ferramenta Terreno =================
  // a cor de um ponto do mapa (copiado para uma folha de um pixel, própria para leitura)
  const pixel = (x, y) => ev(([x, y]) => { const u = __tc, cv = u.Render.cv, k = cv.width / cv.getBoundingClientRect().width, [sx, sy] = u.Render.toScreen(x, y), c = document.createElement('canvas'); c.width = c.height = 1; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(cv, Math.round(sx * k), Math.round(sy * k), 1, 1, 0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data]; }, [x, y]);
  const antesDaTinta = await pixel(C * 23.5, C * 2.5);
  await page.keyboard.press('q'); await w(250);
  ok(await ev(() => __tc.App.tool) === 'terrain' && await page.locator('#tool-terrain.on').count() === 1 && (await page.locator('#tool-terrain').getAttribute('title')) === 'Terreno (Q)', 'a tecla Q liga a ferramenta Terreno, que também está no trilho');
  ok(await page.locator('#o-tm .seg-b.on').innerText() === 'Pintar' && await page.locator('#o-ts .seg-b.on').innerText() === 'Pincel' && await page.locator('#o-tt').inputValue() === 'morro' && await page.locator('#o-th').inputValue() === '3' && await page.locator('#o-tz').count() === 1,
    'ela abre em Pintar, com o pincel, o Morro e a altura de fábrica dele (2 quadrados de 1,5 m = 3)');
  ok((await page.locator('#o-tt option').allInnerTexts()).join() === 'Morro,Montanha,Plataforma,Fosso,Água,Mata', 'os seis tipos: ' + (await page.locator('#o-tt option').allInnerTexts()).join());
  // retângulo: encaixa nos quadrados
  await page.locator('#o-ts button', { hasText: 'Retângulo' }).click(); await w();
  await arrastar(C * 22 + 9, C * 1 + 11, C * 26 - 14, C * 4 - 8);
  let ts = await terrenos();
  ok(ts.length === 1 && ts[0].k === 'rect' && ts[0].x === C * 22 && ts[0].y === C * 1 && ts[0].w === C * 4 && ts[0].h === C * 3 && ts[0].ter.t === 'morro' && ts[0].ter.h === 3 && ts[0].gm === false && ts[0].top === false && ts[0].by === null && ts[0].f === '#9a8552',
    'arrastando com Retângulo, nasce uma área encaixada nos quadrados, com o tipo e a altura escolhidos: ' + JSON.stringify(ts[0]));
  const depoisDaTinta = await pixel(C * 23.5, C * 2.5);
  ok(antesDaTinta.some((v, i) => Math.abs(v - depoisDaTinta[i]) > 12), 'a área aparece pintada no mapa (a cor daquele ponto mudou): ' + antesDaTinta.slice(0, 3) + ' → ' + depoisDaTinta.slice(0, 3));
  // elipse, com outro tipo e a altura digitada
  await page.locator('#o-ts button', { hasText: 'Elipse' }).click(); await w();
  await page.locator('#o-tt').selectOption('fosso'); await w();
  ok(await page.locator('#o-th').inputValue() === '-3', 'trocar o tipo traz a altura de fábrica dele (o fosso é negativo: −3)');
  await page.locator('#o-th').fill('-4.5'); await page.locator('#o-th').press('Tab'); await w();
  await arrastar(C * 1, C * 14, C * 5, C * 18);
  ts = await terrenos();
  ok(ts.length === 2 && ts[1].k === 'ell' && ts[1].w === C * 4 && ts[1].h === C * 4 && ts[1].ter.t === 'fosso' && ts[1].ter.h === -4.5, 'a elipse entra com a altura digitada (−4,5): ' + JSON.stringify(ts[1].ter));
  // pincel
  await page.locator('#o-ts button', { hasText: 'Pincel' }).click(); await w();
  await page.locator('#o-tt').selectOption('agua'); await w();
  await page.locator('#o-tz').fill('3'); await w();
  await arrastar(C * 20, C * 15, C * 27, C * 17, 12);
  ts = await terrenos();
  ok(ts.length === 3 && ts[2].k === 'free' && ts[2].sw === C * 3 && ts[2].f === null && ts[2].pts.length >= 4 && ts[2].ter.t === 'agua' && ts[2].ter.h === 0, 'o pincel pinta uma faixa da largura escolhida (3 quadrados): ' + JSON.stringify({ sw: ts[2].sw, n: ts[2].pts.length / 2, ter: ts[2].ter }));
  // polígono: Backspace desfaz um canto; Esc cancela; Enter fecha
  await page.locator('#o-ts button', { hasText: 'Polígono' }).click(); await w();
  await page.locator('#o-tt').selectOption('mata'); await w();
  await clicar(C * 12, C * 1); await clicar(C * 16, C * 1); await page.keyboard.press('Enter'); await w();
  ok((await terrenos()).length === 3 && /pelo menos três cantos/.test(await aviso()), 'um polígono de dois cantos não vira área (a mesa explica)');
  await clicar(C * 12, C * 1); await clicar(C * 16, C * 1); await clicar(C * 18, C * 3); await page.keyboard.press('Backspace'); await w(); await clicar(C * 16, C * 4); await page.keyboard.press('Escape'); await w();
  ok((await terrenos()).length === 3 && await ev(() => __tc.App.tool) === 'terrain', 'Esc cancela o polígono que estava sendo marcado (e a ferramenta continua na mão)');
  await clicar(C * 12, C * 1); await clicar(C * 16, C * 1); await clicar(C * 18, C * 3); await page.keyboard.press('Backspace'); await w(); await clicar(C * 16, C * 4); await clicar(C * 12, C * 4); await page.keyboard.press('Enter'); await w();
  ts = await terrenos();
  ok(ts.length === 4 && ts[3].k === 'poly' && JSON.stringify(ts[3].pts) === JSON.stringify([C * 12, C, C * 16, C, C * 16, C * 4, C * 12, C * 4]) && ts[3].ter.t === 'mata', 'o polígono fecha com Enter, sem o canto que o Backspace desfez: ' + JSON.stringify(ts[3].pts));
  if (process.env.FOTOS) await page.screenshot({ path: process.env.FOTOS + '/terreno-tipos.png' });
  // o que há em cada ponto
  const onde = await ev(C => {
    const u = __tc, K = u.Combate, sc = u.Store.scene(), nome = (x, y) => { const s = K.terrainAt(sc, x, y); return s ? K.terText(s, sc) : ''; };
    const agua = sc.shapes.find(s => s.ter && s.ter.t === 'agua'), p = agua.pts;
    return { morro: nome(C * 23, C * 2), foraDoMorro: nome(C * 21.9, C * 2), fosso: nome(C * 3, C * 16), cantoDaElipse: nome(C * 1.2, C * 14.2), agua: nome(p[0], p[1] + C * 1.4), foraDaAgua: nome(p[0], p[1] + C * 1.6), mata: nome(C * 14, C * 2), nada: nome(C * 10, C * 10), fora: nome(-50, -50) };
  }, C);
  ok(onde.morro === 'Morro · altura 3 m' && onde.foraDoMorro === '' && onde.fosso === 'Fosso · 4,5 m de fundura' && onde.cantoDaElipse === '' && onde.agua === 'Água' && onde.foraDaAgua === '' && onde.mata === 'Mata' && onde.nada === '' && onde.fora === '',
    'cada ponto do mapa sabe em que terreno está — dentro da elipse (e não no canto da caixa dela), dentro da faixa do pincel (até a metade da largura): ' + JSON.stringify(onde));
  // desfazer e refazer
  await page.keyboard.press('Control+z'); await w();
  ok((await terrenos()).length === 3, 'Ctrl+Z desfaz a última área');
  await page.keyboard.press('Control+Shift+z'); await w();
  ok((await terrenos()).length === 4, 'e Ctrl+Shift+Z a refaz');
  // um token em cima do morro, outro no fosso, outro na água
  await ev(([ids, C]) => { const u = __tc; u.Store.tx('mover', () => { u.Store.upd('tokens', ids['Dain X'], { x: C * 23, y: C * 2 }); u.Store.upd('tokens', ids.Astie, { x: C * 2, y: C * 15 }); u.Store.upd('tokens', ids.Kairo, { x: C * 13, y: C * 2 }); }); }, [ids, C]);
  const selos = await ev(ids => { const u = __tc, sc = u.Store.scene(), s = n => u.Combate.terBadge(u.Combate.terrainOf(u.Store.get('tokens', ids[n]), sc), sc); return [s('Dain X'), s('Astie'), s('Kairo'), s('Bandido')]; }, ids);
  ok(JSON.stringify(selos) === JSON.stringify(['▲3 m', '▼4,5 m', '', '']), 'o token em cima do morro mostra ▲3 m; o do fosso, ▼4,5 m; na mata (altura zero) e fora de terreno, nada: ' + JSON.stringify(selos));
  // a área muda com o token parado em cima dela: a altura que ele mostra acompanha
  const seloDoDain = () => ev(id => { const u = __tc, sc = u.Store.scene(); return u.Combate.terBadge(u.Combate.terrainOf(u.Store.get('tokens', id), sc), sc); }, ids['Dain X']);
  await ev(() => { const u = __tc, s = u.Store.scene().shapes.find(x => x.ter && x.ter.t === 'morro'); u.Store.tx('Altura do terreno', () => u.Store.upd('shapes', s.id, u.Combate.terPatch(s, 'morro', 6))); });
  ok(await seloDoDain() === '▲6 m', 'mudando a altura do morro com o token parado em cima, ele passa a mostrar ▲6 m: ' + await seloDoDain());
  await ev(() => { const u = __tc, s = u.Store.scene().shapes.find(x => x.ter && x.ter.t === 'morro'); u.Store.tx('Apagar', () => u.Store.del('shapes', s.id)); });
  ok(await seloDoDain() === '', 'apagando o morro, a altura some do token');
  await ev(() => { __tc.Store.undo(); __tc.Store.undo(); });
  ok(await seloDoDain() === '▲3 m', 'e desfazendo as duas coisas, volta a ▲3 m');
  await ev(([id, C]) => __tc.Store.tx('mover', () => __tc.Store.upd('tokens', id, { x: C * 9, y: C * 9 })), [ids['Dain X'], C]);
  ok(await ev(id => { const u = __tc, sc = u.Store.scene(); return u.Combate.terBadge(u.Combate.terrainOf(u.Store.get('tokens', id), sc), sc); }, ids['Dain X']) === '', 'saindo do morro, a altura some do token');
  // a de cima manda — e "Frente/Trás" troca quem está em cima
  await page.locator('#o-ts button', { hasText: 'Retângulo' }).click(); await w();
  await page.locator('#o-tt').selectOption('plataforma'); await w();
  await arrastar(C * 24, C * 2, C * 27, C * 5);
  ok(await ev(C => { const u = __tc, sc = u.Store.scene(); return u.Combate.terText(u.Combate.terrainAt(sc, C * 25, C * 3), sc); }, C) === 'Plataforma · altura 1,5 m', 'onde duas áreas se cruzam, vale a que foi feita por último (a de cima)');
  await ev(() => { const u = __tc, s = u.Store.scene().shapes.filter(x => x.ter).pop(); u.Act.toFront('shapes', [s.id], false); });
  ok(await ev(C => { const u = __tc, sc = u.Store.scene(); return u.Combate.terText(u.Combate.terrainAt(sc, C * 25, C * 3), sc); }, C) === 'Morro · altura 3 m', '"Trás" passa a outra para cima');
  // com a ferramenta Selecionar: o rodapé e a dica dizem o que é; o clique e o arrasto não pegam terreno
  await page.keyboard.press('v'); await w();
  await pairar(C * 22.5, C * 3.5);
  ok((await page.locator('#status').innerText()).includes('Coluna 23 · Linha 4') && (await page.locator('#status').innerText()).includes('Morro · altura 3 m') && await page.locator('#cv').getAttribute('title') === 'Morro · altura 3 m', 'passando o mouse, o rodapé diz o que é o terreno, e a dica do mapa também: ' + await page.locator('#status').innerText());
  await pairar(C * 10.5, C * 6.5);
  ok(!(await page.locator('#status').innerText()).includes('Morro') && await page.locator('#cv').getAttribute('title') === '', 'fora do terreno, o aviso some');
  await clicar(C * 22.5, C * 3.5);
  ok(await ev(() => __tc.App.sel.length) === 0, 'com Selecionar, um clique no terreno não seleciona nada');
  await clicar(C * 22.5, C * 3.5, { clickCount: 2 });
  ok(await ev(() => __tc.App.sel.length) === 0, 'nem dois cliques');
  await arrastar(C * 21.5, C * 0.5, C * 27.5, C * 5.5);
  ok(await ev(() => __tc.App.sel.length) === 0, 'e arrastar em volta de uma área (sem tokens dentro) não a seleciona');
  { const p = await tela(C * 22.5, C * 3.5); await page.mouse.click(p[0], p[1], { button: 'right' }); await w(250); }
  ok((await page.locator('.menu .menu-h').textContent()) === 'Mapa' && await page.locator('.menu-i', { hasText: 'Apagar' }).count() === 0, 'o botão direito, ali, abre o menu do mapa (não o de um desenho)');
  await page.keyboard.press('Escape'); await w();
  // Ajustar: selecionar, mover, esticar, trocar, apagar
  await page.keyboard.press('q'); await w();
  await page.locator('#o-tm button', { hasText: 'Ajustar' }).click(); await w();
  await clicar(C * 2.9, C * 16);
  ok(await ev(() => { const u = __tc, s = u.selOf('shapes'); return s.length === 1 && s[0].ter.t === 'fosso'; }) && (await page.locator('.p-title').innerText()) === 'Fosso' && await page.locator('#tr-tipo').inputValue() === 'fosso' && await page.locator('#tr-alt').inputValue() === '-4.5' && await page.locator('#tr-larg').count() === 0,
    'em Ajustar, um clique seleciona a área e o painel mostra o tipo e a altura dela');
  await arrastar(C * 2.9, C * 16, C * 4.9, C * 15);
  ts = await terrenos();
  ok(ts.find(s => s.ter.t === 'fosso').x === C * 3 && ts.find(s => s.ter.t === 'fosso').y === C * 13, 'arrastar move a área, de quadrado em quadrado: ' + JSON.stringify([ts.find(s => s.ter.t === 'fosso').x / C, ts.find(s => s.ter.t === 'fosso').y / C]));
  ok(await ev(() => __tc.Tools.handles().length) === 8, 'a área selecionada tem as oito alças');
  await arrastar(C * 7, C * 17, C * 9, C * 18);           // a alça do canto de baixo, à direita
  ts = await terrenos();
  ok(ts.find(s => s.ter.t === 'fosso').w === C * 6 && ts.find(s => s.ter.t === 'fosso').h === C * 5, 'puxar a alça do canto estica a área: ' + JSON.stringify([ts.find(s => s.ter.t === 'fosso').w / C, ts.find(s => s.ter.t === 'fosso').h / C]));
  await page.locator('#tr-tipo').selectOption('montanha'); await w();
  await page.locator('#tr-alt').fill('12'); await page.locator('#tr-alt').press('Tab'); await w();
  ts = await terrenos();
  ok(ts.some(s => s.ter.t === 'montanha' && s.ter.h === 12 && s.f === '#8b8f99' && s.k === 'ell') && !ts.some(s => s.ter.t === 'fosso'), 'pelo painel, o fosso vira montanha de 12 m (a cor acompanha o tipo)');
  await clicar(C * 23.5, C * 16);                          // a faixa de água
  ok(await page.locator('#tr-larg').inputValue() === '3', 'a faixa do pincel mostra também a largura (3 q)');
  await page.locator('#tr-larg').fill('1.5'); await page.locator('#tr-larg').press('Tab'); await w();
  ok((await terrenos()).find(s => s.k === 'free').sw === C * 1.5, 'e dá para mudar a largura');
  { const p = await tela(C * 23.5, C * 16); await page.mouse.click(p[0], p[1], { button: 'right' }); await w(250); }
  ok((await page.locator('.menu .menu-h').textContent()) === 'Água' && await page.locator('.menu-i', { hasText: 'Apagar a área' }).count() === 1, 'com a ferramenta Terreno, o botão direito numa área abre o menu dela');
  await page.keyboard.press('Escape'); await w();
  const nAntes = (await terrenos()).length;
  await page.keyboard.press('Delete'); await w();
  ok((await terrenos()).length === nAntes - 1 && !(await terrenos()).some(s => s.k === 'free'), 'Delete apaga a área selecionada');
  await page.keyboard.press('Control+z'); await w();
  ok((await terrenos()).length === nAntes, 'e Desfazer a devolve');
  await clicar(C * 14, C * 2);
  await page.keyboard.press('Control+d'); await w();
  ts = await terrenos();
  ok(ts.length === nAntes + 1 && ts.filter(s => s.ter.t === 'mata').length === 2, 'duplicar uma área faz outra área (com o tipo e a altura)');
  await page.keyboard.press('Control+z'); await w();
  await clicar(C * 14, C * 2);
  await page.keyboard.press('v'); await w();
  ok(await ev(() => __tc.App.sel.length) === 0, 'trocando de ferramenta, a área deixa de estar selecionada');
  // o jogador: vê, não mexe
  const jog = await ev(C => {
    const u = __tc, sc = u.Store.scene(), id = u.Store.S.players[0].id;
    u.UI.setViewer(id);
    const o = { ve: !!u.Combate.terrainAt(sc, C * 23, C * 2), ferramenta: u.Tools.allowed('terrain'), clique: u.Tools.hitTest({ x: C * 23, y: C * 2 }, { locked: true }), tecla: null };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }));
    o.tecla = u.App.tool;
    const s = sc.shapes.find(x => x.ter);
    o.forja = u.Proj.validar({ t: 'upd', c: 'shapes', id: s.id, p: { ter: { t: 'agua', h: 0 } } }, id, Object.assign({}, sc, { perms: Object.assign({}, sc.perms, { desenhar: true }) }));
    const nova = u.Proj.validar({ t: 'add', c: 'shapes', v: { id: 'sh_f', k: 'rect', x: 0, y: 0, w: 9, h: 9, s: '#ffffff', sw: 1, ter: { t: 'fosso', h: -9 } } }, id, Object.assign({}, sc, { perms: Object.assign({}, sc.perms, { desenhar: true }) }));
    o.nova = nova ? ('ter' in nova.v) : 'recusada';
    return o;
  }, C);
  await w(300);
  ok(jog.ve === true && jog.ferramenta === false && jog.clique === null && jog.tecla !== 'terrain' && jog.forja === null && jog.nova === false && await page.locator('#tool-terrain').count() === 0,
    'o jogador vê o terreno, mas não tem a ferramenta (nem pela tecla), não o seleciona, não o muda — e um desenho dele nunca vira terreno: ' + JSON.stringify(jog));
  // o que a névoa cobre não é revelado pelo mouse; o que o jogador vê (ou já viu), sim
  await pairar(C * 22.5, C * 3.5);
  const coberto = await ev(C => __tc.Vision.covered(C * 22.5, C * 3.5), C);
  ok(coberto === true && !(await page.locator('#status').innerText()).includes('Morro') && await page.locator('#cv').getAttribute('title') === '', 'para o jogador, o terreno que a névoa cobre não aparece no rodapé nem na dica');
  await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.remote({ t: 'scn', p: { fog: Object.assign({}, sc.fog, { dynamic: false }) } }); u.Vision.invalidate(); u.Render.request(); }); await w(400);
  await pairar(C * 22.6, C * 3.6);
  ok(await ev(C => __tc.Vision.covered(C * 22.5, C * 3.5), C) === false && (await page.locator('#status').innerText()).includes('Morro · altura 3 m') && await page.locator('#cv').getAttribute('title') === 'Morro · altura 3 m', 'sem névoa por cima, passando o mouse o jogador também lê o que é: ' + await page.locator('#status').innerText());
  await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.remote({ t: 'scn', p: { fog: Object.assign({}, sc.fog, { dynamic: true }) } }); u.Vision.invalidate(); u.Render.request(); }); await w(400);

  // ================= F: a janelinha, sem ficha =================
  // (ainda vendo como o jogador Dalmo: o token dele, sem ficha, rola um valor; o de outro, não)
  await pairar(C * 9.5, C * 9.5);                          // Dain X, que é dele
  await page.keyboard.press('f'); await w(250);
  ok(await page.locator('#fpop').count() === 1 && await page.locator('#fp-valor').count() === 1 && (await page.locator('#fpop .pop-n').innerText()) === 'Dain X', 'o jogador aperta F sobre o token dele (sem ficha): a janelinha pede um valor');
  await page.keyboard.press('Escape'); await w();
  const bandido = await ev(id => { const k = __tc.Store.get('tokens', id), s = k.size * 64; return [k.x + s / 2, k.y + s / 2]; }, ids.Bandido);
  await pairar(bandido[0], bandido[1]);
  await page.keyboard.press('f'); await w(250);
  ok(await page.locator('#fpop').count() === 0 && /Você rola pelos tokens do seu personagem/.test(await aviso()), 'sobre o token de outro, nada abre');
  await ev(() => __tc.UI.setViewer('gm')); await w(300);
  const rolagens = [];
  await page.exposeFunction('__anotar', r => { rolagens.push(r); });
  await ev(() => { __tc.Ext.roll = r => window.__anotar(JSON.parse(JSON.stringify(r))); });
  await pairar(bandido[0], bandido[1]);
  await page.keyboard.press('f'); await w(250);
  ok(await page.locator('#fpop').count() === 1 && await page.locator('#fp-fixa').inputValue() === '0' && await page.locator('#fp-valor').inputValue() === '40' && await ev(() => document.activeElement && document.activeElement.id) === 'fpop', 'o mestre aperta F sobre um token sem ficha: valor 40, sem fixa, de início; o foco vai para a janelinha');
  { const r = await page.locator('#fpop').boundingBox(), tk = await tela(bandido[0], bandido[1]); ok(r.x > tk[0] && r.x - tk[0] < 80 && r.y >= 8 && r.x + r.width <= 1440 - 8, 'ela abre ao lado do token, dentro da tela'); }
  await page.locator('#fp-valor').fill('25'); await page.locator('#fp-fixa').fill('5'); await w();
  ok((await page.locator('#fp-rolar').getAttribute('title')) === 'Rola 1d20 + 5', 'o botão diz o que vai rolar (1d20 + 5)');
  await page.locator('#fp-rolar').click(); await w(200);
  ok(rolagens.length === 1 && rolagens[0].kind === 'atributo' && rolagens[0].name === 'Bandido' && rolagens[0].atributo === 25 && rolagens[0].fixa === 5 && rolagens[0].total === rolagens[0].d + 5 && rolagens[0].d >= 1 && rolagens[0].d <= 20 && await page.locator('#fp-total').innerText() === String(rolagens[0].total),
    'a rolagem sai com a regra da fixa e aparece na janelinha: ' + JSON.stringify(rolagens[0]));
  await page.locator('#fp-valor').fill('0'); await w();
  ok(await page.locator('#fp-rolar').isDisabled(), 'com valor zero não há o que rolar');
  await page.locator('#fp-valor').fill('25'); await page.locator('#fp-valor').press('Enter'); await w(200);
  ok(rolagens.length === 2, 'Enter no campo do valor também rola');
  await page.locator('#fp-x').click(); await w();
  ok(await page.locator('#fpop').count() === 0, 'o × fecha');
  await pairar(bandido[0], bandido[1]);
  await page.keyboard.press('f'); await w(250);
  ok(await page.locator('#fp-fixa').inputValue() === '5' && await page.locator('#fp-valor').inputValue() === '25', 'abrindo de novo, a janelinha lembra o valor e a fixa daquele token');
  await clicar(C * 6.5, C * 6.5);
  ok(await page.locator('#fpop').count() === 0, 'um clique fora fecha');
  // para quem não usa o teclado: o botão do dado na faixa do token selecionado abre e fecha a mesma janelinha
  await ev(id => __tc.setSel([{ c: 'tokens', id }]), ids.Bandido); await w(250);
  ok(await page.locator('#hud-rolar').count() === 1, 'com um token selecionado, a faixa dele tem o botão de rolar atributo');
  await page.locator('#hud-rolar').click(); await w(250);
  ok(await page.locator('#fpop').count() === 1 && (await page.locator('#fpop .pop-n').innerText()) === 'Bandido', 'o botão abre a janelinha daquele token');
  await page.locator('#hud-rolar').click(); await w(250);
  ok(await page.locator('#fpop').count() === 0, 'e, de novo, fecha');
  await ev(() => __tc.UI.setViewer(__tc.Store.S.players[0].id)); await w(300);
  await ev(id => __tc.setSel([{ c: 'tokens', id }]), ids.Bandido); await w(250);
  const semBotao = await page.locator('#hud-rolar').count();
  await ev(id => __tc.setSel([{ c: 'tokens', id }]), ids['Dain X']); await w(250);
  ok(semBotao === 0 && await page.locator('#hud-rolar').count() === 1, 'para o jogador, o botão só aparece no token dele');
  await ev(() => __tc.UI.setViewer('gm')); await w(300);
  await pairar(C * 6.5, C * 6.5); await ev(() => __tc.setSel([])); await page.keyboard.press('f'); await w(250);
  ok(await page.locator('#fpop').count() === 0 && /passe o mouse sobre um token/.test(await aviso()), 'sem token sob o cursor nem selecionado, F só explica o que fazer');

  // ================= C: a disputa =================
  await ev(ids => __tc.setSel([{ c: 'tokens', id: ids.Bandido }, { c: 'tokens', id: ids.Bandida }]), ids); await w(200);
  await page.keyboard.press('c'); await w(300);
  ok(await page.locator('.modal .dis').count() === 1 && await page.locator('#dis-a-tok').inputValue() === ids.Bandido && await page.locator('#dis-b-tok').inputValue() === ids.Bandida && await page.locator('#dis-a-valor').inputValue() === '25' && await page.locator('#dis-a-fixa').inputValue() === '5' && await page.locator('#dis-b-valor').inputValue() === '40',
    'C com dois tokens selecionados: um de cada lado, cada um com o valor e a fixa que já vinha usando');
  await page.locator('#dis-b-valor').fill('30'); await page.locator('#dis-b-fixa').fill('30'); await w();
  await page.locator('.modal .btn.primary').click(); await w(250);
  let d = rolagens[rolagens.length - 1];
  ok(rolagens.length === 3 && d.kind === 'disputa' && d.titulo === 'Disputa · Bandido × Bandida' && /^Bandido: valor 25 \(1d20 \+ 5, dado \d+\) = \d+  ·  Bandida: valor 30 \(fixo em 30\) = 30$/.test(d.resumo) && d.veredito === 'Bandida venceu Bandido por ' + (30 - (d.dd[0][1] + 5)) + ' (30 × ' + (d.dd[0][1] + 5) + ')' && d.passou === null && d.oculto === false && d.dd.length === 1 && d.dd[0][0] === 20,
    'a disputa rola os dois lados (o que fixou tudo não rola dado) e diz quem venceu; entre dois NPCs, o veredito não é vitória nem derrota de ninguém: ' + JSON.stringify(d));
  ok(await page.locator('#dis-veredito').innerText() === d.veredito && (await page.locator('.modal .btn.primary').innerText()) === 'Rolar de novo' && await page.locator('.modal').count() === 1, 'o veredito aparece na janela, que fica aberta');
  await page.locator('#dis-b-tok').selectOption(ids.Bandido); await w();
  await page.locator('.modal .btn.primary').click(); await w(200);
  ok(rolagens.length === 3 && /Os dois lados são o mesmo token/.test(await aviso()), 'o mesmo token dos dois lados não rola');
  // um lado avulso (sem token), com nome; o outro, de jogador: aí o veredito é a vitória ou a derrota dele
  await page.locator('#dis-a-tok').selectOption(ids['Dain X']); await w();
  await page.locator('#dis-b-tok').selectOption(''); await w();
  await page.locator('#dis-b-nome').fill('Armadilha'); await page.locator('#dis-b-valor').fill('1'); await page.locator('#dis-b-fixa').fill('1');
  await page.locator('#dis-a-valor').fill('50'); await page.locator('#dis-a-fixa').fill('10'); await w();
  await page.locator('.modal .btn.primary').click(); await w(250);
  d = rolagens[rolagens.length - 1];
  ok(rolagens.length === 4 && d.titulo === 'Disputa · Dain X × Armadilha' && d.passou === true && /^Dain X venceu Armadilha por \d+ \(\d+ × 1\)$/.test(d.veredito) && d.oculto === false, 'contra um valor avulso com nome: o token do jogador vence, e o veredito sai como vitória dele: ' + JSON.stringify([d.titulo, d.veredito, d.passou]));
  // um token oculto num dos lados: a disputa sai marcada para ficar só com o mestre
  await page.locator('#dis-b-tok').selectOption(ids.Arqueira); await w();
  await page.locator('.modal .btn.primary').click(); await w(250);
  d = rolagens[rolagens.length - 1];
  ok(rolagens.length === 5 && d.oculto === true && /Arqueira/.test(d.titulo), 'com um token oculto num dos lados, a disputa sai marcada como oculta');
  await page.keyboard.press('Escape'); await w();
  ok(await page.locator('.modal').count() === 0, 'Esc fecha a disputa');
  // sem seleção: os dois lados vêm para escolher
  await ev(() => __tc.setSel([])); await pairar(C * 6.5, C * 6.5); await page.keyboard.press('c'); await w(300);
  ok(await page.locator('#dis-a-tok').inputValue() === '' && await page.locator('#dis-b-tok').inputValue() === '' && await page.locator('#dis-a-nome').count() === 1, 'sem nada selecionado, a disputa abre com dois lados avulsos, para escolher');
  await page.keyboard.press('Escape'); await w();

  // ================= o que só existe dentro do site =================
  ok(await ev(() => __tc.Luta.podeAtaque()) === false && await page.locator('#sel-grupo').count() === 0, 'fora do site (sem fichas), não há ataque com defesa nem "Puxar o grupo"');
  await ev(ids => __tc.Luta.ataque([__tc.Store.get('tokens', ids.Bandido)]), ids); await w(200);
  ok(await page.locator('.modal').count() === 0 && /funciona dentro do site/.test(await aviso()), 'pedir o ataque aqui só explica');
  await ev(() => __tc.Luta.grupo()); await w(200);
  ok(await page.locator('.modal').count() === 0, 'e o grupo também');
  // a ajuda lista os atalhos novos
  await page.locator('#moreBtn').click(); await w(200);
  if (await page.locator('.menu-i', { hasText: 'Atalhos de teclado' }).count()) {
    await page.locator('.menu-i', { hasText: 'Atalhos de teclado' }).click(); await w(250);
    const ajuda = await page.locator('.modal').innerText();
    ok(/\bQ\b[\s\S]*Terreno/.test(ajuda) && /\bF\b[\s\S]*Atributos do token/.test(ajuda) && /\bC\b[\s\S]*Disputa entre dois tokens/.test(ajuda), 'a janela de atalhos lista Q, F e C');
    await page.keyboard.press('Escape'); await w();
  } else ok(false, 'não achei o item "Atalhos de teclado" no menu');

  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `\n${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
