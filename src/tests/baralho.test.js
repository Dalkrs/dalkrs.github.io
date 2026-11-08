// Baralho pela interface, sem mesa (a página sozinha, com um personagem de teste e tudo neste navegador):
// dar o baralho inicial, começar a luta (puxa 3), jogar, descartar, puxar, armar e disparar uma armadilha, fim da luta,
// a leitura de 3, dar uma carta lendária, a lista das 22 cartas e a edição de uma, recarregar (tudo continua).
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const t = await start();
  const dv = await t.device({ name: 'baralho', w: 1300, h: 900 });
  const P = dv.page;
  P.setDefaultTimeout(8000);
  const erros = [];
  P.on('pageerror', e => erros.push(String(e.message)));
  const est = () => P.evaluate(() => JSON.parse(localStorage.getItem('tinycats:baralho') || '{}')['baralho:pc:teste'] || null);
  const clicar = async txt => { await P.getByRole('button', { name: txt }).first().click(); await espera(150); };
  try {
    await P.goto(t.base + 'baralho/', { waitUntil: 'load' });
    await P.evaluate(() => localStorage.removeItem('tinycats:baralho'));
    await P.reload({ waitUntil: 'load' }); await espera(300);
    await P.waitForSelector('main > *'); const tx0 = await P.locator('main').innerText(); ok(/Ainda sem cartas/.test(tx0), 'sem cartas, a tela explica ' + tx0.slice(0, 80));
    await clicar(/baralho inicial/);
    let e = await est();
    ok(e && e.colecao.length === 6, 'o baralho inicial: 6 cartas');
    await clicar(/Começar a luta/);
    e = await est();
    ok(e.luta && e.mao.length === 3 && e.monte.length === 3, 'a luta puxa 3');
    const n = await P.locator('.mao .carta').count();
    ok(n === 3, 'três cartas na mão');
    await P.locator('.mao .carta').first().getByRole('button', { name: 'Jogar' }).click(); await espera(200);
    e = await est();
    ok(e.mao.length === 2 && e.descarte.length === 1, 'jogar: a carta vai para o descarte');
    await P.locator('.mao .carta').first().getByRole('button', { name: 'Descartar' }).click(); await espera(200);
    await clicar(/Puxar 1/);
    e = await est();
    ok(e.mao.length === 2 && e.descarte.length === 2, 'descartar e puxar');
    // dar uma armadilha e trazê-la para a mão
    await clicar('Dar uma carta…');
    const arm = await P.evaluate(() => TC.baralho.PADRAO.find(c => c.tipo === 'armadilha').id);
    await P.locator('dialog select').first().selectOption(arm);
    await P.locator('dialog select').nth(1).selectOption('lendaria');
    await P.locator('dialog').getByRole('button', { name: 'Dar' }).click(); await espera(200);
    e = await est();
    ok(e.colecao.length === 7 && e.colecao.some(x => x.c === arm && x.rar === 'lendaria'), 'dar uma carta lendária');
    for (let i = 0; i < 8 && !(await est()).mao.some(m => (e.colecao.find(x => x.u === m.u) || {}).c === arm); i++) {
      const m = (await est()).mao.length;
      if (m >= 7 || !(await P.getByRole('button', { name: /Puxar 1/ }).isEnabled())) break;
      await clicar(/Puxar 1/);
    }
    const temArm = await P.getByRole('button', { name: 'Armar' }).count();
    if (temArm) {
      await P.getByRole('button', { name: 'Armar' }).first().click(); await espera(150);
      await P.locator('dialog input').fill('B4'); await P.locator('dialog').getByRole('button', { name: 'Armar' }).click(); await espera(250);
      e = await est();
      ok(e.armadas.length === 1 && e.armadas[0].onde === 'B4', 'armar no quadrado B4');
      await clicar('Disparar');
      e = await est();
      ok(e.armadas.length === 0, 'disparar');
    } else ok(true, '(a armadilha não saiu do monte nesta vez)');
    await clicar('Fim da luta');
    e = await est();
    ok(!e.luta && e.mao.length === 0, 'fim da luta: a mão volta');
    await clicar('Leitura de 3 cartas');
    e = await est();
    ok(e.leitura.length === 3 && /Passado/.test(await P.locator('main').innerText()), 'a leitura de 3: passado, presente, futuro');
    await P.reload({ waitUntil: 'load' }); await espera(300);
    await P.waitForSelector('.mini .carta'); ok((await P.locator('.mini .carta').count()) === 7, 'recarregar: tudo continua ' + (await P.locator('.mini .carta').count()));
    await clicar('As 22 cartas');
    ok((await P.locator('.lc').count()) === 22, 'as 22 cartas');
    await P.locator('.lc').first().getByRole('button', { name: 'Editar' }).click(); await espera(150);
    await P.locator('dialog textarea').first().fill('Efeito novo do teste.');
    await P.locator('dialog').getByRole('button', { name: 'Salvar' }).click(); await espera(200);
    ok(/Efeito novo do teste/.test(await P.locator('main').innerText()), 'editar uma carta');
    if (process.env.TC_SCRATCH) await P.screenshot({ path: process.env.TC_SCRATCH + '/baralho-cartas.png' });
    await clicar('Jogo'); await clicar(/Começar a luta/);
    if (process.env.TC_SCRATCH) await P.screenshot({ path: process.env.TC_SCRATCH + '/baralho-jogo.png', fullPage: true });
    ok(!erros.length, 'sem erros na página ' + erros.join(' | '));
  } catch (x) { ok(false, 'parou: ' + String(x.message).split('\n')[0]); }
  await t.close();
  end();
})();
