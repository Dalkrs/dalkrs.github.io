// Bateria do lote 33 nas Cenas (a página do site, sem mesa: o Bestiário deste navegador):
//   · o inimigo com números à mão (a Força digitada, a Esquiva digitada, o HP fixo) e equipamento: o token tem os números
//     com o equipamento (a clava soma na Força, o amuleto no HP);
//   · o painel do token mostra o equipamento; desligar uma peça mexe só neste token (os números e o máximo da barra
//     acompanham; a barra cheia continua cheia); o Desfazer volta;
//   · o saque: a peça cai pela chance dela, inteira (os bônus vão junto), e fica assim no baú do chão;
//   · o que vai para os jogadores não leva o equipamento trocado.
const { open } = require('./lib');
const path = require('path');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const R = require('../../../tc/rules.js');
global.TC = { rules: R, dice: require('../../../tc/dice.js') };
const B = require('../../../tc/bestiario.js');
const ogro = B.novo('Ogro da ponte', { ficha: { tier: 'B', level: 5, atrMan: { FOR: 40 }, derMan: { ESQ: 3 }, ini: '4', iniFixa: true,
  recursos: [{ id: 'hp', nome: 'HP', fml: '120', fixo: true }, { id: 'sp', nome: 'SP', fml: 'CAN*6 + LVL*3' }],
  itens: [{ id: 'clava', nome: 'Clava cravejada', equipado: true, bonus: { FOR: 5 }, chance: 100 }, { id: 'amuleto', nome: 'Amuleto de osso', equipado: true, bonus: {}, rec: { hp: 10 }, def: { FOGO: 2 }, chance: 0 }] } });
const local = JSON.stringify({ docs: { 'best:i:ogro': ogro } });
(async () => {
  const t = await open({ w: 1360, h: 900, root: path.join(__dirname, '..', '..', '..'), file: 'cenas/index.html',
    init: `try { localStorage.setItem('tinycats:bestiario:local', ${JSON.stringify(local)}); } catch (e) {}` });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const j = JSON.stringify;
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await w(400);
  const c0 = B.contas(B.normalizar(ogro));
  ok(c0.rolaveis.find(r => r[0] === 'FOR')[2] === 45 && c0.rolaveis.find(r => r[0] === 'ESQ')[2] === 3 && c0.barras[0].m === 130 && c0.ini === 4, '(as contas: FOR 40 + 5 da clava, ESQ 3, HP 120 + 10 do amuleto, iniciativa 4)');
  let ids = [];
  await passo('puxar', async () => {
    await ev(() => __tc.Best.trazer({ itens: [{ id: 'ogro', n: 2 }] })); await w(250);
    ids = await ev(() => __tc.Store.scene().tokens.filter(x => x.best).map(x => x.id));
    const tk = await ev(id => { const t = __tc.Store.get('tokens', id); return { bars: t.bars.map(b => b.n + ':' + b.v + '/' + b.m), ini: t.ini }; }, ids[0]);
    ok(ids.length === 2 && tk.bars[0] === 'HP:130/130' && tk.ini === 4, 'os dois ogros: HP 130 (o fixo mais o amuleto), iniciativa 4 — ' + j(tk));
    const nums = await ev(id => __tc.Fichas.numeros(__tc.Store.get('tokens', id)), ids[0]);
    ok(nums && JSON.stringify(nums).includes('45'), 'os números do token têm a Força com a clava (45): ' + j(nums).slice(0, 120));
  });
  await passo('trocar o equipamento num token só', async () => {
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids[0]); await w(300);
    const txt = await page.locator('#tk-best-eq').innerText();
    ok(/Clava cravejada · FOR \+5/.test(txt) && /Amuleto de osso · .*HP \+10/.test(txt), 'o painel do token mostra o equipamento, com os bônus — ' + txt.replace(/\n/g, ' | '));
    await foto('l33-token-equip');
    await page.locator('label:has(#tk-eq-clava)').click(); await w(250);
    await page.locator('label:has(#tk-eq-amuleto)').click(); await w(250);
    const a = await ev(id => { const t = __tc.Store.get('tokens', id); return { eq: t.bestEq, hp: t.bars[0].v + '/' + t.bars[0].m, c: __tc.Fichas.contasTok(t).rolaveis.find(r => r[0] === 'FOR')[2] }; }, ids[0]);
    const b = await ev(id => { const t = __tc.Store.get('tokens', id); return { eq: t.bestEq || null, hp: t.bars[0].v + '/' + t.bars[0].m, c: __tc.Fichas.contasTok(t).rolaveis.find(r => r[0] === 'FOR')[2] }; }, ids[1]);
    ok(j(a.eq) === j({ clava: false, amuleto: false }) && a.c === 40 && a.hp === '120/120', 'sem a clava e o amuleto: FOR 40 e HP 120/120 (a barra cheia continua cheia) — ' + j(a));
    ok(b.eq === null && b.c === 45 && b.hp === '130/130', 'o outro ogro continua com tudo — ' + j(b));
    await ev(() => __tc.Tools.undo()); await w(200);
    const a2 = await ev(id => { const t = __tc.Store.get('tokens', id); return { eq: t.bestEq || null, hp: t.bars[0].v + '/' + t.bars[0].m }; }, ids[0]);
    ok(j(a2.eq) === j({ clava: false }) && a2.hp === '130/130', 'o Desfazer devolve o amuleto (HP 130) — ' + j(a2));
    // o machucado: com HP 50 de 130, guardar o amuleto deixa 50 de 120
    await ev(id => { __tc.Store.tx('x', () => __tc.Store.upd('tokens', id, { bars: __tc.Store.get('tokens', id).bars.map((b, i) => (i === 0 ? Object.assign({}, b, { v: 50 }) : b)) })); }, ids[0]); await w(100);
    await page.locator('label:has(#tk-eq-amuleto)').click(); await w(250);
    ok(await ev(id => { const b = __tc.Store.get('tokens', id).bars[0]; return b.v + '/' + b.m; }, ids[0]) === '50/120', 'machucado (50 de 130), guardar o amuleto: 50 de 120');
    const pub = await ev(id => { const p = __tc.Proj.projetar(__tc.Store.scene(), {}, new Set()); return JSON.stringify(p.v.tokens.find(x => x.id === id) || null); }, ids[0]);
    ok(pub !== 'null' && !/bestEq/.test(pub) && !/"best"/.test(pub), 'para os jogadores, o token não leva o inimigo nem o equipamento');
    const limpo = await ev(id => { const t = JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))); t.bestEq = { clava: 1, 'x y': true, amuleto: 0 }; const sc = __tc.normalizeScene({ name: 't', tokens: [t] }); return sc.tokens[0].bestEq; }, ids[0]);
    ok(j(limpo) === j({ clava: true, amuleto: false }), 'o equipamento do token, arrumado (só ids válidos, sim ou não): ' + j(limpo));
  });
  await passo('o saque com o equipamento', async () => {
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids[1]); await w(250);
    await page.locator('#tk-saque').click(); await w(300);
    const txt = await page.locator('.modal').innerText();
    ok(/Clava cravejada/.test(txt) && !/Amuleto de osso/.test(txt.split('Os dados')[0]), 'a clava (100%) cai; o amuleto (0%) nem rola — ' + txt.replace(/\n/g, ' | ').slice(0, 200));
    await foto('l33-saque');
    await page.locator('.modal .btn.primary').click(); await w(300);
    const bau = await ev(() => { const b = __tc.Store.scene().tokens.find(x => x.prop === 'bau' && x.saque); return b ? b.saque : null; });
    const clava = bau && bau.itens.find(x => x.nome === 'Clava cravejada');
    ok(clava && clava.tipo === 'equip' && clava.eq && clava.eq.bonus.FOR === 5, 'no baú do chão, a clava inteira (FOR +5) — ' + j(clava));
    const sq = await ev(() => __tc.cleanSaque({ itens: [{ nome: 'Elmo', tipo: 'equip', eq: { bonus: { DFF: 2, 'x;y': 3 }, recN: { HP: 10 }, def: { FOGO: 1 } } }, { nome: 'Erva', tipo: 'material', eq: { bonus: { FOR: 1 } } }] }));
    ok(j(sq.itens[0].eq) === j({ bonus: { DFF: 2 }, def: { FOGO: 1 }, recN: { HP: 10 } }) && !sq.itens[1].eq, 'o saque arrumado: só o equipamento leva os bônus (e só chaves válidas) — ' + j(sq.itens));
  });

  const errs = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  ok(!errs.length, 'sem erros no console: ' + errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})();
