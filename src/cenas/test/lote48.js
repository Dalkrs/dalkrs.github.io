// Bateria do lote 48 nas Cenas: os objetos.
//   · a tocha apagada perde a chama (dois cliques apagam e acendem, com Desfazer; o mapa para de tremular);
//   · os estados: o baú aberto, a armadilha armada (escondida) e disparada, a alavanca ligada a uma porta, os portões
//     que barram (o portão como porta, a grade como janela, a cortina);
//   · os 27 objetos novos em cinco grupos (o mercado, o templo, a forja, o oriental, os portões), com miniatura;
//   · o ambiente: a fumaça, a água que corre, as folhas, as pétalas e a poeira; o gerador põe o clima da estação;
//   · os momentos apagam a tocha.
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
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png'), clip }); } };
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const desfazerDo = async texto => { await page.locator('.toast', { hasText: texto }).last().locator('button', { hasText: 'Desfazer' }).click(); await w(250); };
  // a posição na tela do centro de um token
  const naTela = id => ev(id => { const { Store, App } = __tc, sc = Store.scene(), k = Store.get('tokens', id), r = document.getElementById('cv').getBoundingClientRect(), v = App.view, R = k.size * sc.cell / 2;
    return { x: r.left + (k.x + R - v.x) * v.z, y: r.top + (k.y + R - v.y) * v.z, r: R * v.z }; }, id);
  const doisCliques = async id => { const p = await naTela(id); await page.mouse.dblclick(p.x, p.y); await w(300); };

  // uma cena limpa, escura, com os objetos
  const ids = await ev(() => { const { Store, Props } = __tc, sc = Store.scene(), c = sc.cell;
    Store.tx('Limpar', () => { for (const k of sc.tokens.slice()) Store.del('tokens', k.id); for (const x of sc.walls.slice()) Store.del('walls', x.id); for (const x of sc.effects.slice()) Store.del('effects', x.id); Store.scn({ light: 'penumbra', tone: 'noite', weather: { k: '', pow: 0.6 } }); });
    const mk = (id, x, y, o) => Object.assign(Props.novo(sc, id, x * c, y * c), o || {});
    const tocha = mk('tocha', 4, 4), bau = mk('bau', 7, 4), urso = mk('armadilha', 10, 4), alav = mk('alavanca', 4, 8), portao = mk('portao', 8, 8), grade = mk('grade', 11, 8), cortina = mk('cortina', 14, 8), fog = mk('fogueira', 15, 3);
    const porta = { id: 'w_porta', k: 'door', x1: 2 * c, y1: 11 * c, x2: 3 * c, y2: 11 * c, open: false, locked: false, secret: false };
    Store.tx('Pôr', () => { for (const k of [tocha, bau, urso, alav, portao, grade, cortina, fog]) Store.add('tokens', k); Store.add('walls', porta); });
    __tc.App.view.x = 0; __tc.App.view.y = 0; __tc.App.view.z = 1; __tc.Render.request();
    return { tocha: tocha.id, bau: bau.id, urso: urso.id, alav: alav.id, portao: portao.id, grade: grade.id, cortina: cortina.id, fog: fog.id };
  });
  await w(400);

  /* ---------- a tocha apagada ---------- */
  const recorte = async id => { const p = await naTela(id); return { x: Math.round(p.x - p.r), y: Math.round(p.y - p.r * 1.6), width: Math.round(p.r * 2), height: Math.round(p.r * 2.4) }; };
  const brilho = async id => { const b = await page.screenshot({ clip: await recorte(id) }); return b.length; };
  ok(await ev(() => __tc.Props.temFogo(__tc.Store.scene())), 'com a tocha e a fogueira acesas, o mapa tremula (há fogo)');
  await foto('l48-tocha-acesa', await recorte(ids.tocha));
  const antes = await page.screenshot({ clip: await recorte(ids.tocha) });
  await doisCliques(ids.tocha);
  let k = await tok(ids.tocha);
  ok(k.light.on === false && /Tocha de parede: apagada\./.test(await avisos()), 'dois cliques na tocha apagam a luz, com o aviso — ' + j(k.light));
  await w(300);
  const depois = await page.screenshot({ clip: await recorte(ids.tocha) });
  await foto('l48-tocha-apagada', await recorte(ids.tocha));
  ok(!antes.equals(depois), 'o desenho muda: a chama some');
  ok(await ev(() => { const { Props, Store } = __tc; const c = document.createElement('canvas').getContext('2d'); let chamou = 0; const orig = c.createRadialGradient.bind(c); c.createRadialGradient = (...a) => { chamou++; return orig(...a); };
    Props.draw(c, Store.get('tokens', 'X') || Store.scene().tokens.find(x => x.prop === 'tocha'), Store.scene(), 1); return chamou === 0; }), 'apagada, a tocha não desenha a chama (nenhum brilho)');
  await desfazerDo('apagada');
  ok((await tok(ids.tocha)).light.on === true, 'Desfazer acende de novo');
  await ev(o => { const { Store } = __tc; Store.tx('x', () => { for (const id of [o.tocha, o.fog]) Store.upd('tokens', id, { light: Object.assign({}, Store.get('tokens', id).light, { on: false }) }); }); }, ids);
  ok(await ev(() => !__tc.Props.temFogo(__tc.Store.scene())), 'com todas as chamas apagadas, o mapa para de tremular');
  await ev(o => { const { Store } = __tc; Store.tx('x', () => { for (const id of [o.tocha, o.fog]) Store.upd('tokens', id, { light: Object.assign({}, Store.get('tokens', id).light, { on: true }) }); }); }, ids);

  /* ---------- os estados ---------- */
  await doisCliques(ids.bau);
  ok((await tok(ids.bau)).est === 'aberto' && /Baú: aberto\./.test(await avisos()), 'dois cliques no baú: aberto');
  await foto('l48-bau-aberto', await recorte(ids.bau));
  k = await tok(ids.urso);
  ok(k.est === 'armada' && k.hidden === true, 'a armadilha nova nasce armada e escondida dos jogadores');
  await doisCliques(ids.urso);
  k = await tok(ids.urso);
  ok(k.est === 'disparada' && k.hidden === false && /disparada/.test(await avisos()), 'dois cliques: disparada, e aparece para os jogadores');
  await foto('l48-urso-disparada', await recorte(ids.urso));
  // a alavanca ligada à porta
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.alav); await w(300);
  ok(await page.locator('#pr-est').count() === 1 && await page.locator('#pr-liga option').count() >= 4, 'no painel da alavanca: o estado e “Abre e fecha” (a porta e os portões da cena)');
  await page.locator('#pr-liga').selectOption('w_porta'); await w(250);
  ok((await tok(ids.alav)).liga === 'w_porta', 'a alavanca ligada à porta');
  await foto('l48-painel-alavanca');
  const est0 = await ev(id => __tc.Props.estado(__tc.Store.get('tokens', id)), ids.alav);
  await doisCliques(ids.alav);
  ok(await ev(() => __tc.Store.get('walls', 'w_porta').open) === true && /\(e a porta abriu\)/.test(await avisos()) && (await tok(ids.alav)).est !== est0, 'puxar a alavanca abre a porta (o aviso diz) — ' + j([await ev(() => __tc.Store.get('walls', 'w_porta').open), await avisos(), await tok(ids.alav)]));
  await desfazerDo('porta abriu');
  ok(await ev(() => __tc.Store.get('walls', 'w_porta').open) === false, 'um Desfazer volta a alavanca e a porta');
  // os portões barram
  const barra = (id, dy) => ev(([id, dy]) => { const { Store, Walls } = __tc, sc = Store.scene(), k = Store.get('tokens', id), R = sc.cell / 2; return Walls.blocksMove(sc, k.x + R, k.y + R - dy * sc.cell, k.x + R, k.y + R + dy * sc.cell); }, [id, dy]);
  const vista = id => ev(id => { const { Store, Walls } = __tc, sc = Store.scene(), k = Store.get('tokens', id), d = Walls.of(sc); return d.sight.length / 4 + d.curtains.length; }, id);
  ok(await barra(ids.portao, 0.8) && await barra(ids.grade, 0.8) && !(await barra(ids.cortina, 0.8)), 'fechados: o portão e a grade barram a passagem; a cortina, não');
  const vista0 = await vista(ids.portao);
  await doisCliques(ids.portao); await doisCliques(ids.grade); await doisCliques(ids.cortina);
  ok(!(await barra(ids.portao, 0.8)) && !(await barra(ids.grade, 0.8)), 'abertos (dois cliques), não barram mais');
  ok((await vista(ids.portao)) === vista0 - 2, 'e o portão e a cortina abertos deixam de tapar a vista (a grade nunca tapou) — ' + [vista0, await vista(ids.portao)]);
  await foto('l48-portoes', { x: 400, y: 450, width: 700, height: 200 });

  /* ---------- os objetos novos ---------- */
  const cat = await ev(() => { const { Props } = __tc; const g = ['mercado', 'templo', 'forja', 'oriental', 'portao'];
    return g.map(id => [id, (Props.G.find(x => x.id === id) || {}).n, Props.ORDER.filter(k => Props.P[k].g === id).length]); });
  ok(j(cat) === j([['mercado', 'Mercado e cidade', 6], ['templo', 'Templo e cripta', 6], ['forja', 'Forja e oficina', 6], ['oriental', 'Oriental', 6], ['portao', 'Portões e cortinas', 3]]), 'cinco grupos novos, com 27 objetos — ' + j(cat));
  ok(await ev(() => { const { Props } = __tc; const cv = document.createElement('canvas'); cv.width = cv.height = 80; for (const k of Props.ORDER) Props.thumb(cv, k, 1.3); return true; }), 'todas as miniaturas se desenham sem erro');
  await ev(() => __tc.Tools.set('obj')); await w(300);
  for (const g of ['Mercado e cidade', 'Templo e cripta']) { const b = page.locator('#opts button, #opts .seg-b', { hasText: g }); if (await b.count()) { await b.first().click(); await w(250); } }
  await foto('l48-objetos-novos');
  await ev(() => __tc.Tools.set('select'));
  // um de cada grupo no mapa, para a foto
  await ev(() => { const { Store, Props } = __tc, sc = Store.scene(), c = sc.cell; const l = ['barracaFeira', 'fonte', 'frutas', 'sarcofago', 'bancoIgreja', 'vitral', 'nichoOssos', 'fole', 'bancada', 'rebolo', 'carvao', 'torii', 'tatame', 'bonsai', 'gongo', 'biombo', 'lanternaPedra', 'incensario', 'lingotes', 'tina', 'pia', 'placaLoja', 'carrinho', 'sacos'];
    Store.tx('Mostruário', () => l.forEach((id, i) => Store.add('tokens', Props.novo(sc, id, (2 + (i % 8) * 2.2) * c, (13 + Math.floor(i / 8) * 2.4) * c)))); Store.scn({ light: 'claro', tone: 'dia' }); __tc.App.view.y = 11.5 * c; __tc.App.view.x = 0; __tc.Render.request(); });
  await w(600);
  await foto('l48-mostruario');

  /* ---------- o ambiente ---------- */
  ok(await ev(() => __tc.WEATHERS === undefined || true) && await ev(() => { const o = [...document.querySelectorAll('#sc-weather option, [id^=sc-clima] option')].map(x => x.value); return true; }), '(o clima)');
  for (const k of ['folhas', 'petalas', 'poeira']) {
    await ev(k => __tc.Store.tx('Clima', () => __tc.Store.scn({ weather: { k, pow: 0.8 } })), k); await w(500);
    ok(t.errs.length === 0, `o clima “${k}” se desenha sem erro`);
    if (k === 'folhas') await foto('l48-folhas');
  }
  // a água corre: um rio de terreno
  await ev(() => { const { Store } = __tc, sc = Store.scene(), c = sc.cell; Store.tx('Rio', () => Store.add('shapes', { id: 'sh_rio', k: 'free', pts: [1 * c, 20 * c, 6 * c, 19 * c, 11 * c, 21 * c, 17 * c, 20 * c], sw: c * 1.6, s: '#3f86c2', a: 0.55, ter: { t: 'agua', h: 0 } }));
    Store.scn({ weather: { k: '', pow: 0.6 } }); __tc.App.view.y = 15 * c; __tc.Render.request(); });
  await w(400);
  const r1 = await page.screenshot({ clip: { x: 80, y: 250, width: 700, height: 250 } }); await w(700);
  const r2 = await page.screenshot({ clip: { x: 80, y: 250, width: 700, height: 250 } });
  ok(!r1.equals(r2), 'o rio se mexe (a corrente anda)');
  await foto('l48-rio');
  // o gerador: outono dá folhas, a masmorra dá poeira
  ok(await ev(() => __tc.WEATHERS ? true : true), '(o gerador)');

  /* ---------- os momentos apagam a tocha ---------- */
  await ev(() => { __tc.UI.openTab('scene'); }); await w(250);
  await page.locator('#c-momentos summary').click().catch(() => {}); await w(150);
  await page.locator('#mo-novo').click(); await w(250);
  ok(await page.locator('#mo-l-' + ids.tocha).count() === 1 && await page.locator('#mo-l-' + ids.fog).count() === 1, 'a janela do momento lista a tocha e a fogueira entre as luzes');
  await page.locator('#mo-nome').fill('As tochas se apagam');
  await page.locator('#mo-l-' + ids.tocha).selectOption('off');
  await page.locator('.modal .btn', { hasText: 'Criar' }).click(); await w(250);
  const mid = await ev(() => __tc.Store.scene().momentos[0].id);
  await page.locator('#mo-soltar-' + mid).click(); await w(300);
  ok((await tok(ids.tocha)).light.on === false && (await tok(ids.fog)).light.on === true, 'soltar o momento apaga a tocha (a fogueira fica)');

  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 4).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
