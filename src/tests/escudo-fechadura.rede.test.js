// A fechadura numa mesa de verdade (lote 120): o Bruno (mestre) entrega uma fechadura Absoluta ao Dalmo.
//   · o Dalmo abre nas Pistas: força fora do ponto duas vezes (duas gazuas quebram; o banco conta os erros);
//   · o barulho passa do limite (2, no Absoluto): o mestre recebe o aviso "Barulho!";
//   · no ponto certo, a fechadura abre (o banco confere o segredo); a Mesa ao vivo: "Fechadura aberta".
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' };
  const M = (await t.device({ name: 'mestre', w: 1500, h: 950, seed })).page, Dp = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed })).page;
  M.setDefaultTimeout(12000); Dp.setDefaultTimeout(12000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 80; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 30000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const jogo = (p, hid) => p.evaluate(h => { const l = TC.dados.col('documentos').pegar('pista:jogo:' + h); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, hid);
  const fecharJanela = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (d) d.close(); });
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Fechadura E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    const codigo = await codigoDaMesa(M);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp); await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    await M.locator('#tab-escudo').click();
    let EF = null, PD = null;
    ok(await ate(async () => { EF = await quadro(M, /\/escudo\//); return EF && await EF.evaluate(() => !!window.__escudo && __escudo.pronto && __escudo.naMesa && __escudo.bancoOk === true); }, 40000), '(o Escudo do mestre, na mesa)');
    const hid = await EF.evaluate(() => { const id = __escudo.A.handoutNovo('puzzle', { nome: 'O cofre do barão', puzzle: { tipo: 'fechadura', nivel: 'absoluto', estilo: 'girar', atr: 'DES', seed: 120, cons: { quebra: true, barulho: true } } }); __escudo.irAba('handouts'); return id; });
    await EF.evaluate(id => { __escudo.HO.selecionar(id); __escudo.pintar(); }, hid); await w(300);
    await EF.click('[data-k="h:entregar"]'); await w(200); await EF.click('[data-k="en:ok"]');
    ok(await ate(() => EF.evaluate(id => !!__escudo.A.handout(id).entregue, hid)), 'o mestre entrega a fechadura');
    ok(await ate(() => Dp.evaluate(() => !document.getElementById('tab-pistas').hidden), 40000), '(a aba Pistas do Dalmo)');
    await fecharJanela(Dp); await fecharJanela(Dp);
    await Dp.locator('#tab-pistas').click();
    ok(await ate(async () => { PD = await quadro(Dp, /\/pistas\//); return PD && await PD.evaluate(() => !!window.__pistas && __pistas.pronto); }, 40000), '(as Pistas)');
    await PD.click('[data-k^="pi:"]:has-text("O cofre do barão")'); await w(600, Dp);
    ok(await ate(() => PD.locator('.fch .fch-svg').count().then(n => n === 1)), 'o Dalmo vê a fechadura de girar');
    ok(/Absoluto/.test(await PD.locator('.fch-info').innerText()) && /Destreza: 0/.test(await PD.locator('.fch-info').innerText()), 'o nível e o atributo (sem ficha, 0): ' + await PD.locator('.fch-info').innerText());
    const sec = await PD.evaluate(j0 => TC.escudo.fechadura.segredoDe(TC.escudo.normJogo(j0)), await jogo(Dp, hid));
    // duas gazuas quebradas, longe do ponto
    const palco = PD.locator('.fch-palco');
    for (let k = 0; k < 2; k++) {
      await palco.focus();
      const longe = sec.c > 0 ? 'ArrowLeft' : 'ArrowRight';
      for (let i = 0; i < 45; i++) await Dp.keyboard.press(longe);
      await Dp.keyboard.down(' '); await w(1600, Dp); await Dp.keyboard.up(' '); await w(600, Dp);
      for (let i = 0; i < 45; i++) await Dp.keyboard.press(longe === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft');
    }
    ok(await ate(async () => { const j0 = await jogo(M, hid); return j0 && j0.erros === 2 && j0.estado.q === 2 && j0.estado.alarme === 1; }), 'duas gazuas quebradas: dois erros no banco e o alarme');
    ok(await ate(() => M.evaluate(() => [...document.querySelectorAll('.toast')].some(x => /Barulho!/.test(x.textContent))), 25000), 'o mestre recebe o aviso: “Barulho!”');
    // o ponto certo (de meio em meio grau)
    await palco.focus();
    const passos = Math.round(sec.c / 0.5);
    for (let i = 0; i < Math.abs(passos); i++) await Dp.keyboard.press((passos < 0 ? 'Shift+ArrowLeft' : 'Shift+ArrowRight'));
    await Dp.keyboard.down(' '); await w(1400, Dp); await Dp.keyboard.up(' ');
    ok(await ate(async () => { const j0 = await jogo(M, hid); return !!(j0 && j0.resolvido); }), 'no ponto certo, a fechadura abre (o banco confere o segredo)');
    ok(await ate(() => M.evaluate(() => TC.aoVivo.itens.some(l => l.dados && l.dados.titulo === 'Fechadura aberta' && /Dalmo abriu “O cofre do barão”/.test(l.dados.resumo || '')))), 'a Mesa ao vivo: “Dalmo abriu O cofre do barão”');
    if (process.env.FOTOS) await Dp.screenshot({ path: process.env.FOTOS + '/l120-dalmo.png' });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally { if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa: ' + e.message); } } }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|403|409)|Multiple GoTrueClient/i.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
