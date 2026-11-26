// (lote 209) Os puzzles novos numa mesa de verdade: o mestre (Bruno) entrega e o Dalmo joga na aba Pistas, cada lance
// pelo banco (pista_jogar) — a palavra secreta escrita pelo mestre (o palpite errado chega ao mestre; o certo, o banco
// confere), a torre dos discos (lance a lance), as pontes (o estado é um objeto) e o encaixe das peças (um objeto por
// peça, com o "a" vazio quando a peça sai do quadro).
const { start, checker, passosPuzzle } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1500, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1366, h: 768, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  M.setDefaultTimeout(12000); Dp.setDefaultTimeout(12000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return passosPuzzle(f); await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 30000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const jogo = (p, hid) => p.evaluate(h => { const l = TC.dados.col('documentos').pegar('pista:jogo:' + h); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, hid);
  const fecharJanela = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (d) d.close(); });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Puzzles 209 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false, EF = null, PD = null, ids = null;
  const NOMES = { pal: 'A senha', tor: 'A torre', pon: 'As ilhas', enc: 'O selo' };
  const abrir = async (hid, cls) => { const nm = NOMES[Object.keys(ids).find(k => ids[k] === hid)]; await PD.click('[data-k^="pi:"]:has-text("' + nm + '")'); await w(500, Dp); return ate(() => PD.locator('.pz-' + cls).count().then(n => n === 1)); };
  const resolvidoNoBanco = hid => ate(async () => { const j = await jogo(M, hid); return !!(j && j.resolvido); }, 30000);
  try {
    await passo('a mesa e os puzzles', async () => {
      const codigo = await codigoDaMesa(M);
      await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp); await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
      await M.locator('#tab-escudo').click();
      ok(await ate(async () => { EF = await quadro(M, /\/escudo\//); return EF && await EF.evaluate(() => !!window.__escudo && __escudo.pronto && __escudo.naMesa && __escudo.bancoOk === true); }, 40000), '(o Escudo do mestre, na mesa)');
      ids = await EF.evaluate(() => {
        const A = __escudo.A;
        const r = {
          pal: A.handoutNovo('puzzle', { nome: 'A senha', puzzle: { tipo: 'palavra', dif: 'facil', seed: 2091, palavra: 'Espada' } }),
          tor: A.handoutNovo('puzzle', { nome: 'A torre', puzzle: { tipo: 'torre', dif: 'facil', seed: 2092 } }),
          pon: A.handoutNovo('puzzle', { nome: 'As ilhas', puzzle: { tipo: 'pontes', dif: 'facil', seed: 2093 } }),
          enc: A.handoutNovo('puzzle', { nome: 'O selo', puzzle: { tipo: 'encaixar', dif: 'facil', seed: 2094 } }),
        };
        __escudo.irAba('handouts');
        return r;
      });
      const entregar = async hid => {
        await EF.evaluate(id => { __escudo.HO.selecionar(id); __escudo.pintar(); }, hid); await w(300);
        await EF.click('[data-k="h:entregar"]'); await w(200); await EF.click('[data-k="en:ok"]');
        return ate(() => EF.evaluate(id => !!__escudo.A.handout(id).entregue, hid));
      };
      let todos = true;
      for (const k of ['pal', 'tor', 'pon', 'enc']) todos = (await entregar(ids[k])) && todos;
      ok(todos, 'o mestre entrega os quatro à mesa (o botão está no passo 3, “Entregar”)');
    });

    await passo('a palavra secreta', async () => {
      ok(await ate(() => Dp.evaluate(() => !document.getElementById('tab-pistas').hidden), 40000), '(a aba Pistas do Dalmo)');
      await fecharJanela(Dp); await fecharJanela(Dp);
      await Dp.locator('#tab-pistas').click();
      ok(await ate(async () => { PD = await quadro(Dp, /\/pistas\//); return PD && await PD.evaluate(() => !!window.__pistas && __pistas.pronto); }, 40000), '(as Pistas)');
      ok(await abrir(ids.pal, 'palavra'), 'o Dalmo vê a palavra secreta');
      const jg = await jogo(Dp, ids.pal);
      ok(!JSON.stringify(jg).includes('ESPADA'), 'a palavra do mestre não está à vista no documento');
      await PD.fill('[data-k="pz:in"]', 'adagas'); await PD.click('[data-k="pz:ok"]');
      ok(await ate(async () => { const j = await jogo(M, ids.pal); return j && Array.isArray(j.estado.g) && j.estado.g[0] === 'ADAGAS'; }), 'o palpite errado chega ao mestre, pelo banco');
      await PD.fill('[data-k="pz:in"]', 'Espada'); await PD.click('[data-k="pz:ok"]');
      ok(await resolvidoNoBanco(ids.pal), 'a palavra certa: o banco confere e marca resolvido');
    });

    await passo('a torre', async () => {
      ok(await abrir(ids.tor, 'torre'), 'o Dalmo vê a torre');
      for (let i = 0; i < 9; i++) {
        const j = await jogo(Dp, ids.tor); if (j.resolvido) break;
        const l = await PD.evaluate(j0 => { const X = TC.escudo.mais3, jg = TC.escudo.normJogo(j0); return X.torLance(X.pinosDe(jg), jg.pub.n, jg.pub.alvo); }, j);
        const n0 = (j.estado.n || 0);
        await PD.click('[data-k="pz:pino' + l.de + '"]'); await w(80, Dp); await PD.click('[data-k="pz:pino' + l.para + '"]');
        await ate(async () => ((await jogo(Dp, ids.tor)).estado.n || 0) > n0 || !!(await jogo(Dp, ids.tor)).resolvido, 10000);
      }
      ok(await resolvidoNoBanco(ids.tor), 'a torre, lance a lance pelo banco, resolvida em 7');
    });

    await passo('as pontes', async () => {
      ok(await abrir(ids.pon, 'pontes'), 'o Dalmo vê as ilhas');
      const sol = await EF.evaluate(id => { const h = __escudo.A.handout(id); return __escudo.E.montarPuzzle(h.puzzle).seg.b; }, ids.pon);
      for (const [k, q] of Object.entries(sol)) {
        const [a, b] = k.split('-');
        for (let v = 0; v < q; v++) {
          const antes = JSON.stringify((await jogo(Dp, ids.pon)).estado.b || {});
          await PD.click('[data-k="pz:i' + a + '"]'); await w(60, Dp); await PD.click('[data-k="pz:i' + b + '"]');
          await ate(async () => JSON.stringify((await jogo(Dp, ids.pon)).estado.b || {}) !== antes || !!(await jogo(Dp, ids.pon)).resolvido, 10000);
        }
      }
      ok(await resolvidoNoBanco(ids.pon), 'as pontes (um objeto no estado), clique a clique, resolvem');
    });

    await passo('o encaixe', async () => {
      ok(await abrir(ids.enc, 'encaixar'), 'o Dalmo vê o quadro e as peças');
      const sol = await EF.evaluate(id => { const h = __escudo.A.handout(id); return __escudo.E.montarPuzzle(h.puzzle).seg.sol; }, ids.enc);
      // uma peça no lugar errado e devolvida: o "a" some no banco (sem valor), e a peça volta para baixo
      await PD.click('[data-k="pz:pc0"]'); await w(80, Dp);
      const outra = sol.find((s, i) => i > 0).a;
      await PD.click('[data-k="pz:b' + outra + '"]');
      const pos = await ate(async () => { const j = await jogo(Dp, ids.enc); return j.estado.q0 && j.estado.q0.a === outra; }, 8000);
      if (pos) { await PD.click('[data-k="pz:b' + outra + '"]'); await ate(async () => { const j = await jogo(Dp, ids.enc); return j.estado.q0 && j.estado.q0.a == null; }, 8000); }
      for (let i = 0; i < sol.length; i++) {
        if (!(await PD.locator('[data-k="pz:pc' + i + '"].sel').count())) await PD.click('[data-k="pz:pc' + i + '"]');
        await w(80, Dp);
        await PD.click('[data-k="pz:b' + sol[i].a + '"]');
        await ate(async () => { const j = await jogo(Dp, ids.enc); return !!j.resolvido || (j.estado['q' + i] && j.estado['q' + i].a === sol[i].a); }, 10000);
      }
      ok(await resolvidoNoBanco(ids.enc), 'as peças, uma a uma, encaixam e resolvem');
    });

    await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0));
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = t.errs.filter(e => !/favicon|fonts\.g|WebSocket|status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
