// Bateria do lote 140 (as Cenas): Vantagem e Desvantagem na disputa (C), na janelinha de atributos (F) e na Rolagem
// geral (Shift+F). Rola duas vezes e fica com o maior (vantagem) ou o menor (desvantagem); a outra sai riscada e o dado
// dela vai para a mesa (para o auditor). Marcar uma desmarca a outra; a escolha fica lembrada no token.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1440, h: 900 });
  const { page } = t, ev = (fn, a) => page.evaluate(fn, a), w = ms => page.waitForTimeout(ms || 150);
  // as contas
  const c = await ev(() => {
    const K = __tc.Combate, o = { ruimV: 0, ruimD: 0, vDiff: 0 };
    for (let i = 0; i < 2000; i++) {
      const v = K.rolarFixa(30, 10, 1), d = K.rolarFixa(30, 10, -1);
      if (!(v.vant === 1 && v.total >= v.outro && v.outro === v.outroD + 10 && v.total === v.dieValue + 10)) o.ruimV++;
      if (!(d.vant === -1 && d.total <= d.outro && d.outro === d.outroD + 10)) o.ruimD++;
    }
    let sv = 0, sn = 0; for (let i = 0; i < 3000; i++) { sv += K.rolarFixa(100, 0, 1).total; sn += K.rolarFixa(100, 0).total; }
    o.media = [sv / 3000, sn / 3000];
    o.semDado = K.rolarFixa(20, 20, 1);
    o.dd = K.dadosDe({ die: 20, dieValue: 15, vant: 1, outro: 8, outroD: 8 });
    o.txt = K.comoSaiu({ die: 20, dieValue: 15, fixa: 0, total: 15, vant: 1, outro: 8 });
    return o;
  });
  ok(!c.ruimV && !c.ruimD, 'vantagem fica com o maior, desvantagem com o menor: ' + JSON.stringify([c.ruimV, c.ruimD]));
  ok(c.media[0] > c.media[1] + 10, 'com vantagem, a média sobe (d100: ~67 contra ~50): ' + c.media.map(x => x.toFixed(1)));
  ok(c.semDado.ok && !c.semDado.vant && c.semDado.total === 20, 'fixa total não rola dado: a vantagem não muda nada');
  ok(JSON.stringify(c.dd) === '[[20,15],[20,8]]' && c.txt === '15 no d20 · vantagem: 15 e 8̶', 'os dois dados vão para a conta, e a descartada sai riscada: ' + c.txt);

  // a cena: dois NPCs sem ficha
  const ids = await ev(() => {
    const T = __tc, S = T.Store, sc = T.newScene('Vant'); sc.cols = 12; sc.rows = 8; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const a = T.newToken(S.scene(), 64, 64, { name: 'Ogro' }), b = T.newToken(S.scene(), 256, 64, { name: 'Elfa' });
    S.tx('t', () => { S.add('tokens', a); S.add('tokens', b); });
    T.Render.fit(); localStorage.removeItem('tinycats:cenas:vant');
    window.__rol = []; T.Ext.roll = r => window.__rol.push(JSON.parse(JSON.stringify(r)));
    return { a: a.id, b: b.id };
  });
  const rol = () => ev(() => window.__rol);
  // C: a disputa
  await ev(ids => { __tc.setSel([{ c: 'tokens', id: ids.a }, { c: 'tokens', id: ids.b }]); __tc.Luta.disputa(); }, ids); await w(250);
  ok(await page.locator('#dis-a-vant').count() === 1 && await page.locator('#dis-b-desv').count() === 1, 'cada lado da disputa tem Vantagem e Desvantagem');
  await page.locator('#dis-a-vant').check(); await w();
  await page.locator('#dis-a-desv').check(); await w();
  ok(!(await page.locator('#dis-a-vant').isChecked()) && await page.locator('#dis-a-desv').isChecked(), 'marcar Desvantagem desmarca a Vantagem');
  await page.locator('#dis-a-vant').check(); await page.locator('#dis-b-vant').check(); await w();
  await page.locator('#dis-a-valor').fill('50'); await page.locator('#dis-b-valor').fill('50'); await w();
  await page.locator('.modal .btn.primary').click(); await w(250);
  let d = (await rol()).pop();
  ok(d && d.kind === 'disputa' && d.dd.length === 4 && (d.resumo.match(/vantagem: /g) || []).length === 2 && /̶/.test(d.resumo), 'os dois com vantagem: quatro dados na mesa, cada lado com a sua riscada: ' + JSON.stringify(d && [d.resumo, d.dd]));
  ok(/vantagem: \d+ e /.test(await page.locator('.modal .dis-d').innerText()), 'a janela mostra as duas rolagens');
  await page.locator('#dis-a-vant').uncheck(); await page.locator('#dis-a-desv').check(); await page.locator('#dis-b-vant').uncheck(); await w();
  await page.locator('.modal .btn.primary').click(); await w(250);
  d = (await rol()).pop();
  ok(d.dd.length === 3 && /Ogro: valor 50 \(1d50 \+ 0, dado \d+ · desvantagem: \d+ e /.test(d.resumo) && !/Elfa: valor 50 \(1d50 \+ 0, dado \d+ ·/.test(d.resumo), 'um com desvantagem e o outro normal: ' + d.resumo);
  await page.keyboard.press('Escape'); await w();
  // lembrada no token
  await ev(ids => { __tc.setSel([{ c: 'tokens', id: ids.a }, { c: 'tokens', id: ids.b }]); __tc.Luta.disputa(); }, ids); await w(250);
  ok(await page.locator('#dis-a-desv').isChecked() && !(await page.locator('#dis-b-vant').isChecked()) && await ev(() => localStorage.getItem('tinycats:cenas:vant')).then(x => JSON.parse(x)[ids.a] === -1), 'a escolha fica no token: abrir de novo traz a desvantagem do Ogro');
  await page.locator('#dis-a-desv').uncheck(); await w();
  await page.keyboard.press('Escape'); await w();
  // F: a janelinha
  await ev(ids => { __tc.setSel([{ c: 'tokens', id: ids.b }]); __tc.Luta.atributos(__tc.Store.get('tokens', ids.b)); }, ids); await w(250);
  ok(await page.locator('#fp-vant').count() === 1, 'a janelinha do F tem as caixinhas');
  await page.locator('#fp-vant').check(); await w();
  await page.locator('#fp-valor').fill('40'); await page.locator('#fp-rolar').click(); await w(200);
  let r = (await rol()).pop();
  ok(r.kind === 'atributo' && r.vant === 1 && r.t2 <= r.total && r.d2 >= 1 && r.d2 <= 40 && /vantagem: /.test(await page.locator('#fp-res').innerText()), 'F com vantagem: o outro dado vai para a mesa: ' + JSON.stringify(r));
  await page.keyboard.press('Escape'); await w();
  // Shift+F: a rolagem geral
  await ev(ids => { __tc.setSel([{ c: 'tokens', id: ids.a }, { c: 'tokens', id: ids.b }]); }, ids);
  await ev(() => __tc.Luta.rolagemGeral ? __tc.Luta.rolagemGeral() : null); await w(300);
  if (!(await page.locator('#ger-lista').count())) { await page.mouse.move(700, 450); await page.keyboard.press('Shift+F'); await w(300); }
  ok(await page.locator('#ger-1-vant').isChecked() && !(await page.locator('#ger-0-vant').isChecked()), 'na rolagem geral, a Elfa já vem com a vantagem que ficou nela');
  await page.locator('#ger-0-desv').check(); await w();
  await page.locator('#ger-tudo').click(); await w(250);
  const ult = (await rol()).slice(-2);
  ok(ult.length === 2 && ult.every(x => x.kind === 'atributo' && x.vant) && ult.find(x => x.name === 'Ogro').vant === -1 && ult.find(x => x.name === 'Elfa').vant === 1, 'cada linha rola com a sua: ' + JSON.stringify(ult.map(x => [x.name, x.vant])));
  const errs = t.errs.filter(e => !/favicon/.test(e));
  ok(!errs.length, 'sem erros no console: ' + errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
