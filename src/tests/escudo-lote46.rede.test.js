// Os puzzles do lote 46 numa mesa de verdade: o mestre (Bruno) e o Dalmo.
//   · "Repetir a sequência" entregue à mesa: o Dalmo joga nas Pistas (o erro conta pelo banco; a sequência inteira
//     resolve — o banco confere a resposta) e o mestre recebe o aviso;
//   · o labirinto com cronômetro: o tempo acaba, o vigia do mestre conta um erro e o puzzle trava para o Dalmo;
//     "Mais 2 minutos" destrava; "Dar uma dica" mostra os próximos passos para ele.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1500, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 900, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  M.setDefaultTimeout(12000); Dp.setDefaultTimeout(12000);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 30000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async (p, nome) => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await p.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const jogo = (p, hid) => p.evaluate(h => { const l = TC.dados.col('documentos').pegar('pista:jogo:' + h); return l && !l.apagado ? JSON.parse(JSON.stringify(l.dados)) : null; }, hid);
  const fecharJanela = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); if (d) d.close(); });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Puzzles 46 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false, EF = null, PD = null, ids = null;
  try {
    await passo('a mesa e os puzzles', async () => {
      const codigo = await codigoDaMesa(M);
      await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp); await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
      await M.locator('#tab-escudo').click();
      ok(await ate(async () => { EF = await quadro(M, /\/escudo\//); return EF && await EF.evaluate(() => !!window.__escudo && __escudo.pronto && __escudo.naMesa && __escudo.bancoOk === true); }, 40000), '(o Escudo do mestre, na mesa)');
      ids = await EF.evaluate(() => {
        const A = __escudo.A;
        const seq = A.handoutNovo('puzzle', { nome: 'A sequência', puzzle: { tipo: 'sequencia', dif: 'facil', seed: 4646 } });
        const lab = A.handoutNovo('puzzle', { nome: 'O labirinto', puzzle: { tipo: 'labirinto', dif: 'facil', seed: 4647, tempo: 1 } });
        __escudo.irAba('handouts');
        return { seq, lab };
      });
      const entregar = async hid => {
        await EF.evaluate(id => { __escudo.HO.selecionar(id); __escudo.pintar(); }, hid); await w(300);
        await EF.click('[data-k="h:entregar"]'); await w(200); await EF.click('[data-k="en:ok"]');
        return ate(() => EF.evaluate(id => !!__escudo.A.handout(id).entregue, hid));
      };
      ok(await entregar(ids.seq) && await entregar(ids.lab), 'o mestre entrega a sequência e o labirinto (com cronômetro) à mesa');
    });

    await passo('a sequência nas Pistas', async () => {
      ok(await ate(() => Dp.evaluate(() => !document.getElementById('tab-pistas').hidden), 40000), '(a aba Pistas do Dalmo)');
      await fecharJanela(Dp); await fecharJanela(Dp);
      await Dp.locator('#tab-pistas').click();
      ok(await ate(async () => { PD = await quadro(Dp, /\/pistas\//); return PD && await PD.evaluate(() => !!window.__pistas && __pistas.pronto); }, 40000), '(as Pistas)');
      await PD.click('[data-k="pi:' + ids.seq + '"], [data-k^="pi:"]:has-text("A sequência")'); await w(500, Dp);
      ok(await ate(() => PD.locator('.pz-sequencia').count().then(n => n === 1)), 'o Dalmo vê “Repetir a sequência”');
      const jg = await jogo(Dp, ids.seq);
      const s = await PD.evaluate(j0 => TC.escudo.mais.seqDe(TC.escudo.normJogo(j0)), jg);
      ok(Array.isArray(s) && s.length === 5 && !JSON.stringify(jg).includes('"seq"'), 'a sequência chega embaralhada (não à vista no documento)');
      await PD.click('[data-k="pz:r' + ((s[0] + 1) % jg.pub.k) + '"]');
      ok(await ate(async () => (await jogo(M, ids.seq)).erros === 1), 'tocar a errada: o banco conta um erro');
      for (let r = 1; r <= 5; r++) for (let i = 0; i < r; i++) { await PD.click('[data-k="pz:r' + s[i] + '"]'); await w(450, Dp); }
      ok(await ate(async () => { const j0 = await jogo(M, ids.seq); return !!(j0 && j0.resolvido); }), 'a sequência inteira resolve (o banco confere a resposta)');
      ok(await ate(() => M.evaluate(() => [...document.querySelectorAll('.toast')].some(x => /resolveu “A sequência”/.test(x.textContent))), 20000), 'o mestre recebe o aviso: “Dalmo resolveu…”');
      await foto(Dp, 'l46-rede-sequencia');
    });

    await passo('o cronômetro', async () => {
      // (o tempo do labirinto, adiantado: começou há dois minutos)
      const passado = new Date(Date.now() - 2 * 60000).toISOString();
      await Dp.evaluate(([h, t0]) => TC.dados.escudo('jogar', { id: 'pista:jogo:' + h, op: 'jogar', mudas: { t0, _txt: 'teste' } }), [ids.lab, passado]);
      ok(await ate(async () => { const j0 = await jogo(M, ids.lab); return j0 && j0.erros === 1 && j0.estado.fim === 1; }, 30000), 'o tempo acaba: o vigia do mestre conta um erro e trava o puzzle');
      await PD.click('[data-k^="pi:"]:has-text("O labirinto")'); await w(500, Dp);
      ok(await ate(async () => /O tempo acabou/.test(await PD.locator('.pz-labirinto').innerText()) && await PD.locator('.pz-labirinto.esgotado').count() === 1), 'nas Pistas do Dalmo: “O tempo acabou”, o puzzle travado');
      await foto(Dp, 'l46-rede-tempo');
      await EF.evaluate(id => { __escudo.HO.selecionar(id); __escudo.pintar(); }, ids.lab); await w(400);
      await EF.click('[data-k="h:tempo"]');
      ok(await ate(async () => { const j0 = await jogo(M, ids.lab); return j0 && !j0.estado.fim && j0.estado.mais > 0; }), '“Mais 2 minutos” destrava');
      ok(await ate(async () => /Falta [12]:\d\d/.test(await PD.locator('.pz-labirinto').innerText())), 'o Dalmo vê a conta de novo');
      await EF.click('[data-k="h:dica"]');
      ok(await ate(async () => (await PD.locator('.pz-labirinto .lb-c.trilha').count()) > 0), '“Dar uma dica”: os próximos passos aparecem para o Dalmo');
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
