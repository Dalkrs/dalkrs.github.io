// Bestiário, lote 33, numa mesa de verdade (banco local de ensaio ou o projeto real): o mestre (Bruno) e o Dalmo (dono
// da Selene).
//   · a dificuldade pelos números de verdade: o "?" da bandeja mostra o ogro (a Força digitada, com a clava) e a Selene;
//   · o ogro puxado para a cena: os números com o equipamento; desligar a clava num token só;
//   · o saque: a clava cai inteira e vai para a Selene — guardada, com o +5 de Força e o +10 no HP dela (a barra pelo
//     nome); o Desfazer tira.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const Dp = (await t.device({ name: 'dalmo', w: 1300, h: 880, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const linha = (p, id) => p.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify({ ficha: l.ficha, estado: l.estado })) : null; }, id);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const errosDeFora = () => t.errs.filter(e => !/status of (400|401|409)/.test(e));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Bestiário 33 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on()); }, 40000), '(o mestre abre as Cenas da mesa)');
    const codigo = await codigoDaMesa(M);
    await Dp.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1200, Dp);
    await loginTela(Dp, c.jog1, c.senha); await entrarMesaTela(Dp, codigo, 'Dalmo');
    const dalmo = await Dp.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(uid => {
      const f = Object.assign(TC.rules.personagemPadrao('Selene', 'pc_selene'), { tier: 'C', level: 3, recursos: [{ id: 'hpSel', nome: 'HP', fml: '100' }] });
      TC.dados.col('personagens').gravar('pc_selene', { nome: 'Selene', ficha: f, skills: { arvores: [], pontos: {}, alocados: {} }, estado: {}, dono_id: uid, vis: 'mesa', ordem: 0 });
      TC.dados.col('documentos').gravar('best:i:ogro', { vis: 'mestre', dados: { v: 1, nome: 'Ogro da ponte', ficha: { tier: 'B', level: 5, atrMan: { FOR: 40 }, recursos: [{ id: 'mhp', nome: 'HP', fml: '120', fixo: true }],
        itens: [{ id: 'clava', nome: 'Clava cravejada', equipado: true, bonus: { FOR: 5 }, rec: { mhp: 10 }, chance: 100 }] }, saque: { itens: [], lapros: '' } } });
    }, dalmo);
    ok(await ate(() => parado(M)), '(a Selene e o ogro sobem para a mesa)');

    let BF = null;
    await passo('a dificuldade', async () => {
      await M.locator('#tab-bestiario').click();
      ok(await ate(async () => { BF = await quadro(M, /\/bestiario\//); return BF && await BF.evaluate(() => !!window.__best && __best.pronto && __best.naMesa && __best.inimigos().length === 1); }, 40000), '(o Bestiário abre, com o ogro)');
      await BF.locator('.mais[data-mais="ogro"]').click(); await w(300);
      const dif = await BF.locator('#enc-dif').innerText();
      ok(/Dificuldade: (Fácil|Médio|Duro|Mortal) \(\d+% do grupo\)/.test(dif), 'a bandeja: a dificuldade contra a Selene — ' + dif);
      await BF.locator('#enc-dif-ajuda').click(); await w(300);
      const txt = await BF.locator('#dlgDif').innerText();
      const c0 = await BF.evaluate(() => __best.contas('ogro'));
      ok(/Ogro da ponte/.test(txt) && /Selene/.test(txt) && new RegExp('\\b' + c0.poder + '\\b').test(txt) && /÷/.test(txt), 'o "?": o poder do ogro (' + c0.poder + ', com a Força 40 + 5 da clava) e o da Selene, a conta — ' + txt.replace(/\n/g, ' | ').slice(0, 260));
      ok(c0.numeros.FOR === 45, '(a Força do ogro: 45)');
      await foto(M, 'l33-rede-dificuldade');
      await BF.locator('#dlgDif .btn.pri').click(); await w(100);
    });

    let toks = [];
    await passo('na cena', async () => {
      await BF.locator('.mais[data-mais="ogro"]').click(); await w(150);
      await BF.locator('#enc-puxar').click();
      ok(await ate(async () => { toks = await C.evaluate(() => __tc.Store.scene().tokens.filter(x => x.best === 'ogro').map(x => x.id)); return toks.length === 2; }), '“Puxar para a cena”: os dois ogros');
      ok(await C.evaluate(id => __tc.Store.get('tokens', id).bars[0].m, toks[0]) === 130, 'o HP 130 (120 fixo + 10 da clava)');
      await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, toks[0]); await w(400);
      await C.locator('label:has(#tk-eq-clava)').click(); await w(300);
      const r = await C.evaluate(ids => ids.map(id => { const t = __tc.Store.get('tokens', id); return t.bars[0].m + ':' + __tc.Fichas.contasTok(t).numeros.FOR; }), toks);
      ok(j(r) === j(['120:40', '130:45']), 'sem a clava, só o primeiro: HP 120 e FOR 40; o outro continua 130 e 45 — ' + j(r));
      await foto(M, 'l33-rede-token');
    });

    await passo('o saque para a Selene', async () => {
      await C.locator('#tk-saque').click(); await w(300);
      ok(/Clava cravejada/.test(await C.locator('.modal').innerText()), 'a clava cai (100%)');
      await C.locator('#sq-para').selectOption('pc_selene'); await w(100);
      await C.locator('.modal .btn.primary').click();
      ok(await ate(async () => { const l = await linha(M, 'pc_selene'); return !!l && (l.ficha.itens || []).some(x => x.nome === 'Clava cravejada'); }), 'a clava entra nos itens da Selene');
      const cl = (await linha(M, 'pc_selene')).ficha.itens.find(x => x.nome === 'Clava cravejada');
      ok(cl.equipado === false && cl.bonus.FOR === 5 && j(cl.rec) === j({ hpSel: 10 }), 'guardada, com o +5 de Força e o +10 no HP dela (a barra pelo nome) — ' + j(cl));
      const ff = await Dp.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_selene'); const it = l && (l.ficha.itens || []).find(x => x.nome === 'Clava cravejada'); return it ? it.bonus.FOR : null; });
      ok(ff === 5 || await ate(() => Dp.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_selene'); const it = l && (l.ficha.itens || []).find(x => x.nome === 'Clava cravejada'); return !!it && it.bonus.FOR === 5; })), 'o Dalmo vê a clava na ficha dele');
      await C.locator('.toast button', { hasText: 'Desfazer' }).last().click();
      ok(await ate(async () => !(await linha(M, 'pc_selene')).ficha.itens.some(x => x.nome === 'Clava cravejada')), 'o Desfazer tira a clava');
    });

    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
