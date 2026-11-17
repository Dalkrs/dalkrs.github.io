// Bateria do lote 181 (as Cenas): (1) as velas de cor (a vela, o grupo, o candelabro) e o pole dance (a barra, o palco)
// desenham sem erro; (2) a cor da chama no painel do objeto: a luz vai junto; separar a luz deixa escolher outra; voltar às
// cores de sempre; (3) vale para os outros objetos com fogo (a tocha); os acesos sem fogo ganham a "Cor da luz".
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms), ev = (f, a) => p.evaluate(f, a);
  const r1 = await ev(() => {
    const P = __tc.Props, ids = ['velaCor', 'velasCor', 'candelabroCor', 'poleBarra', 'palcoPole'], cv = document.createElement('canvas'); cv.width = cv.height = 48;
    const erros = []; for (const id of ids) { if (!P.P[id]) { erros.push(id + '?'); continue; } for (const tm of [0, 1.1]) { try { P.thumb(cv, id, tm); } catch (e) { erros.push(id); } } }
    return { erros, grupos: ids.map(id => P.P[id] && P.P[id].g).join(',') };
  });
  ok(!r1.erros.length && r1.grupos === 'luz,luz,luz,noturna,noturna', 'as velas em Luzes, o pole dance na Casa noturna, sem erro: ' + r1.erros.join(',') + ' ' + r1.grupos);
  // (2) pôr a vela e mexer nas cores pelo painel
  const pin = async (id) => ev(id => { const u = __tc, sc = u.Store.scene(), tk = u.Props.novo(sc, id, 3 * sc.cell, 3 * sc.cell, 1, false); u.Store.tx('pôr', () => u.Store.add('tokens', tk)); u.setSel([{ c: 'tokens', id: tk.id }]); u.App.tab = 'sel'; u.App.sideOpen = true; u.UI.renderAll(); return tk.id; }, id);
  const cor = async (sel, v) => { await p.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]); await w(250); };
  const tok = id => ev(id => { const x = __tc.Store.get('tokens', id); return { chama: x.chamaCor, luz: x.light && x.light.c, solta: !!x.luzSolta }; }, id);
  const id1 = await pin('velaCor'); await w(400);
  ok(await p.locator('#pr-chama').count() === 1 && await p.locator('#pr-luzcor').count() === 0 && await p.locator('#pr-luzsolta').count() === 1, 'a vela: "Cor da chama" e a chave de separar a luz (a cor da luz escondida)');
  await cor('#pr-chama', '#3aa0ff');
  let k = await tok(id1);
  ok(k.chama === '#3aa0ff' && k.luz === '#3aa0ff', 'a chama azul, e a luz vai junto: ' + JSON.stringify(k));
  await p.locator('#pr-luzsolta').check({ force: true }); await w(300);
  ok(await p.locator('#pr-luzcor').count() === 1, 'separar a luz mostra a "Cor da luz"');
  await cor('#pr-luzcor', '#ff4a4a');
  k = await tok(id1);
  ok(k.chama === '#3aa0ff' && k.luz === '#ff4a4a' && k.solta, 'a chama azul e a luz vermelha: ' + JSON.stringify(k));
  await cor('#pr-chama', '#3aff7a');
  k = await tok(id1);
  ok(k.chama === '#3aff7a' && k.luz === '#ff4a4a', 'separadas, trocar a chama não mexe na luz');
  await p.click('#pr-luzcor-0'); await w(300);
  k = await tok(id1);
  ok(!k.chama && k.luz === '#ffcf80' && !k.solta, 'voltar às cores de sempre: ' + JSON.stringify(k));
  // (3) a tocha também; o palco com a barra (aceso, sem fogo): só a cor da luz
  const id2 = await pin('tocha'); await w(400);
  await cor('#pr-chama', '#a84aff');
  k = await tok(id2);
  ok(k.chama === '#a84aff' && k.luz === '#a84aff', 'a tocha também muda a cor da chama e da luz');
  await pin('palcoPole'); await w(400);
  ok(await p.locator('#pr-chama').count() === 0 && await p.locator('#pr-luzcor').count() === 1, 'o palco com a barra: só a "Cor da luz"');
  // desenhar a cena com a chama de outra cor: sem erro
  await ev(() => __tc.Render.request()); await w(400);
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros na página: ' + t.errs.slice(0, 3).join(' | '));
  console.log(`lote181: ${n - fails}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
