// As bandeiras (lote 45), sem mesa: o montador do brasão do Clã com os símbolos em grupos (os da Meditação, a
// heráldica, as classes e as raças), as formas e as divisões novas (com a amostra de cada uma); o brasão pronto; e o
// mesmo brasão nas Cenas (o objeto "Brasão" com a divisão nova e o símbolo no lugar da forma nova).
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const j = JSON.stringify;

(async () => {
  const t = await start();
  const dv = await t.device({ name: 'bandeiras', w: 1300, h: 900 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const A = (fn, arg) => P.evaluate(fn, arg);
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  let id = null;

  await passo('o montador do brasão', async () => {
    await P.goto(t.base + 'cla/?debug&tudo', { waitUntil: 'load' });
    await P.waitForFunction(() => window.__cla && __cla.pronto, null, { timeout: 15000 }); await espera(300);
    await P.locator('[data-k="novo-cla"]').click(); await espera(200);
    await P.locator('#dlg [data-k="dl:nome"]').fill('Lâmina do Crepúsculo'); await P.locator('#dlg [data-k="dl:sim"]').click(); await espera(400);
    id = await A(() => __cla.sel);
    await P.locator('[data-k="c:brasao"]').click(); await espera(300);
    const grupos = await P.locator('#dlg .simb-grupo').allInnerTexts();
    ok(j(grupos) === j(['Da Meditação', 'Heráldica', 'Classes', 'Raças']), 'os símbolos em quatro grupos — ' + j(grupos));
    ok(await P.locator('#dlg [data-forma]').count() === 12 && await P.locator('#dlg [data-div]').count() === 16 && await P.locator('#dlg [data-div] .div-am').count() === 16, 'doze formas e dezesseis divisões, cada divisão com a amostra');
    await P.locator('#dlg [data-forma="triangular"]').click(); await espera(150);
    await P.locator('#dlg [data-div="aspa"]').click(); await espera(150);
    await P.locator('#dlg [data-simb="u-samurai"]').scrollIntoViewIfNeeded(); await P.locator('#dlg [data-simb="u-samurai"]').click(); await espera(250);
    const b = await A(i => __cla.doc('cla:c:' + i).brasao, id);
    ok(b.forma === 'triangular' && b.div === 'aspa' && b.simb === 'u-samurai', 'a forma triangular, a aspa e o símbolo do Samurai — ' + j(b));
    ok(/translate\(32 14\) scale\(1\.5\)/.test(await P.locator('#dlg [data-k="br:previa"]').innerHTML()), 'a prévia põe o símbolo no lugar da forma triangular');
    await foto('l45-brasao-montador');
    await P.locator('#dlg [data-forma="gonfalao"]').click(); await P.locator('#dlg [data-div="xadrez"]').click();
    await P.locator('#dlg [data-simb="leao"]').scrollIntoViewIfNeeded(); await P.locator('#dlg [data-simb="leao"]').click(); await espera(250);
    await foto('l45-brasao-gonfalao');
    const b2 = await A(i => __cla.doc('cla:c:' + i).brasao, id);
    ok(b2.forma === 'gonfalao' && b2.div === 'xadrez' && b2.simb === 'leao', 'o gonfalão, o xadrez e o leão');
  });

  await passo('o brasão nas Cenas', async () => {
    const r = await A(() => {
      const N = window.ClaNucleo, f = N.FORMAS.find(x => x.id === 'pendao');
      return { cores: ['#2f6b45', '#d9a441'], div: 'asna', f: f.d, s: N.SIMBOLOS.get('u-selene').d, fl: false, dp: N.DIV_PATH.asna, st: f.st };
    });
    await P.goto(t.base + 'cenas/?debug', { waitUntil: 'load' }); await espera(2000);
    const tk = await A(br => {
      const { Store, newToken } = __tc, sc = Store.scene();
      const tok = newToken(sc, sc.cell * 6, sc.cell * 4, { name: 'Brasão' });
      tok.prop = 'brasao'; tok.cores = br.cores; tok.bras = br; tok.size = 3;
      Store.tx('Brasão', () => Store.add('tokens', tok));
      __tc.UI.renderAll();
      const t2 = Store.get('tokens', tok.id);
      return t2 && t2.bras ? { div: t2.bras.div, dp: !!t2.bras.dp, st: t2.bras.st } : null;
    }, r);
    ok(tk && tk.div === 'asna' && tk.dp && j(tk.st) === j([32, 26, 1.5]), 'o objeto Brasão guarda a divisão nova (o pedaço pronto) e onde fica o símbolo — ' + j(tk));
    await espera(400);
    await foto('l45-brasao-cenas');
  });

  const fora = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  ok(fora.length === 0, 'sem erros no console: ' + fora.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
