// O lugar povoado (lote 49) numa mesa de verdade, com o Bestiário da mesa (só o mestre, Bruno):
//   · o Bestiário tem um morto-vivo das ruínas (o Esqueleto guerreiro) e uma fera da floresta (o Lobo cinzento);
//   · "Gerar um lugar…" → Cemitério, com "Povoar o lugar": os inimigos vêm do Bestiário (o esqueleto, ligado: barras e
//     o nome dele), nenhum lobo; todos ocultos; os moradores com as notas do gerador de NPC.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = () => M.evaluate(() => TC.dados.pendentes === 0);
  const foto = async nome => { if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Povoar 49 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.evaluate(() => {
      const D = TC.dados.col('documentos'), B = { normalizar: x => x };
      const esq = B.normalizar({ v: 1, nome: 'Esqueleto guerreiro', tags: ['Morto-vivo', 'Ruínas', 'Lacaio'], cor: '#8a8a7a', tam: 1, ficha: { tier: 'D', level: 2 } });
      const lobo = B.normalizar({ v: 1, nome: 'Lobo cinzento', tags: ['Fera', 'Floresta'], tam: 1, ficha: { tier: 'D', level: 2 } });
      D.gravar('best:i:esq1', { vis: 'mestre', dados: esq });
      D.gravar('best:i:lobo1', { vis: 'mestre', dados: lobo });
    });
    ok(await ate(() => parado()), '(o Bestiário sobe para a mesa)');
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && __tc.Fichas.listaBest().length === 2); }, 40000), '(o mestre abre as Cenas; o Bestiário chega: 2 inimigos)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    await passo('o cemitério povoado', async () => {
      await C.evaluate(() => { __tc.App.opt.genPovoar = true; __tc.App.opt.genPerigo = 'medio'; __tc.Gerador.abrir('cemiterio'); }); await w(1200);
      await C.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click();
      ok(await ate(() => C.evaluate(() => !document.querySelector('.modal') && __tc.Store.scene().name === 'Cemitério e igreja'), 60000), 'a cena do cemitério nasce');
      await w(600);
      const g = await C.evaluate(() => __tc.Store.scene().tokens.filter(k => !k.prop).map(k => ({ n: k.name, best: k.best || null, hidden: k.hidden, bars: (k.bars || []).length, notas: (k.notes || '').length })));
      const inim = g.filter(x => / \d+$/.test(x.n));
      ok(inim.length >= 4 && inim.every(x => x.best === 'esq1' && x.hidden && /^Esqueleto guerreiro \d+$/.test(x.n)), 'os inimigos vêm do Bestiário: o Esqueleto guerreiro (ligado), nenhum lobo — ' + j(inim));
      ok(g.some(x => !x.best && x.notas > 100 && x.hidden), 'e os moradores, com as notas do gerador de NPC');
      ok(/\(\d+ do Bestiário\)/.test(await C.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' '))), 'o aviso conta os do Bestiário');
      await foto('l49-rede-cemiterio');
    });
    await ate(() => parado());
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
