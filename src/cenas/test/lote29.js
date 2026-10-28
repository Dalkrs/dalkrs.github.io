// Bateria do lote 29 nas Cenas (a página do site, sem mesa: o Bestiário deste navegador):
//   · puxar o encontro: os tokens nascem ligados ao inimigo (t.best), com o nome numerado, o tamanho, a cor, as barras
//     das fórmulas e a iniciativa; ocultos, se pedido; um Desfazer tira todos;
//   · os números (ao lado do nome e no painel, só para ler), a janelinha F e as defesas do ataque vêm do Bestiário;
//   · o painel: o lembrete, "Rolar o saque" (a janela com o que caiu, os dados; deixar no chão: o baú ao lado, com o saque
//     dentro, e o painel do baú), "Abrir no Bestiário"; o inimigo que saiu do Bestiário: o aviso;
//   · na vez do inimigo, o lembrete de comportamento para o mestre (um cartão por inimigo; Ok fecha);
//   · o que vai para os jogadores não leva o inimigo nem o saque; normalizeScene guarda os dois só onde valem.
const { open } = require('./lib');
const path = require('path');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const R = require('../../../tc/rules.js');
global.TC = { rules: R, dice: require('../../../tc/dice.js') };
const B = require('../../../tc/bestiario.js');
const gob = B.novo('Goblin batedor', { cor: '#3f8f5a', tags: ['Floresta'], ficha: { tier: 'C', level: 4, ini: 'AGI/5', tiers: { FOR: 'C', DES: 'A', VIT: 'D', CAN: 'E', AGI: 'B' }, defesas: { DFF: 3, DFM: 1 } },
  comp: { lembrete: 'Flanqueia; foge com 25% de HP', texto: '' }, saque: { itens: [{ nome: 'Adaga enferrujada', chance: 30, qtd: '1', tipo: 'equip' }, { nome: 'Erva', chance: 80, qtd: '3', tipo: 'material' }], lapros: '7' } });
const lobo = B.novo('Lobo das sombras', { tam: 2, ficha: { tier: 'D', level: 3 } });
const local = JSON.stringify({ docs: { 'best:i:gob1': gob, 'best:i:lobo1': lobo } });
(async () => {
  const t = await open({ w: 1360, h: 900, root: path.join(__dirname, '..', '..', '..'), file: 'cenas/index.html',
    init: `try { localStorage.setItem('tinycats:bestiario:local', ${JSON.stringify(local)}); } catch (e) {}` });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const toasts = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  const limpaToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await w(400);
  const cg = B.contas(B.normalizar(gob)), cl = B.contas(B.normalizar(lobo));
  const toks = () => ev(() => __tc.Store.scene().tokens.filter(x => x.best).map(x => ({ id: x.id, n: x.name, best: x.best, size: x.size, color: x.color, hidden: x.hidden, ini: x.ini, bars: x.bars.map(b => b.n + ':' + b.v + '/' + b.m) })));

  await passo('puxar', async () => {
    ok(await ev(() => !!window.TC.bestiario && !!__tc.Best), 'a página das Cenas traz o Bestiário (tc/bestiario.js)');
    const feitos = await ev(() => __tc.Best.trazer({ itens: [{ id: 'gob1', n: 2 }, { id: 'lobo1', n: 1 }, { id: 'naoexiste', n: 1 }], ocultos: false }));
    await w(200);
    const l = await toks();
    ok(feitos.length === 3 && j(l.map(x => x.n)) === j(['Goblin batedor 1', 'Goblin batedor 2', 'Lobo das sombras']), 'três tokens, os goblins numerados — ' + j(l.map(x => x.n)));
    ok(l[0].best === 'gob1' && l[0].color === '#3f8f5a' && l[0].size === 1 && l[2].size === 2 && l[0].hidden === false, 'ligados ao inimigo, com a cor e o tamanho (o lobo, 2)');
    ok(j(l[0].bars) === j(cg.barras.map(b => b.n + ':' + b.v + '/' + b.m)) && j(l[2].bars) === j(cl.barras.map(b => b.n + ':' + b.v + '/' + b.m)), 'as barras das fórmulas, cheias — ' + j(l[0].bars));
    ok(l[0].ini === cg.ini && cg.ini > 0 && l[2].ini === 0, 'a iniciativa pela fórmula (AGI/5 = ' + cg.ini + '); sem fórmula, 0');
    const tx = await toasts();
    ok(/3 inimigos na cena \(um dos inimigos saiu do Bestiário\)\./.test(tx) && /Desfazer/.test(tx), 'o aviso, com o que faltou e o Desfazer — ' + tx);
    ok(await ev(() => __tc.App.sel.length) === 3, 'os três ficam escolhidos');
    const sobre = await ev(() => { const sc = __tc.Store.scene(), c = sc.cell, vistos = new Map(), ruim = []; for (const k of sc.tokens) { const s = Math.max(1, Math.ceil(k.size)), c0 = Math.floor((k.x + 1) / c), r0 = Math.floor((k.y + 1) / c); for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) { const q = (c0 + i) + ',' + (r0 + j); if (vistos.has(q) && (k.best || vistos.get(q).best) && !k.prop && !vistos.get(q).prop) ruim.push(k.name + ' × ' + vistos.get(q).name); vistos.set(q, k); } } return ruim; });
    ok(sobre.length === 0, 'cada um num lugar livre (o lobo, de tamanho 2, ocupa 2×2 sem ficar por cima de ninguém) — ' + sobre.join(', '));
    await page.locator('.toast button', { hasText: 'Desfazer' }).first().click(); await w(200);
    ok((await toks()).length === 0, 'o Desfazer tira os três de uma vez');
    await limpaToasts();
    await ev(() => __tc.Best.trazer({ itens: [{ id: 'gob1', n: 1 }], ocultos: true })); await w(150);
    await ev(() => __tc.Best.trazer({ itens: [{ id: 'gob1', n: 1 }, { id: 'lobo1', n: 1 }] })); await w(150);
    const m = await toks();
    ok(j(m.map(x => x.n + (x.hidden ? '*' : ''))) === j(['Goblin batedor*', 'Goblin batedor 2', 'Lobo das sombras']), 'oculto, quando pedido; e o goblin que chega depois continua a conta (2) — ' + j(m.map(x => x.n)));
  });
  const gobId = (await toks())[1] ? (await toks())[1].id : null;
  await passo('números e rolagens', async () => {
    const nums = await ev(id => __tc.Fichas.numeros(__tc.Store.get('tokens', id)), gobId);
    ok(j(nums) === j(cg.numeros), 'os números do token são os do Bestiário — ' + j(nums));
    ok(await ev(id => __tc.Combate.defesaDe(__tc.Store.get('tokens', id), ['DFF', 'DFM']), gobId) === 4, 'o ataque com defesa usa as defesas do Bestiário (física 3 + mágica 1)');
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, gobId); await w(300);
    ok(await page.locator('#tk-num-FOR').innerText() === String(cg.numeros.FOR) && await page.locator('#tk-st-for').count() === 0, 'no painel, os números só para ler');
    ok(await page.locator('#s-best').count() === 1 && /Tier C · Lvl 4/.test(await page.locator('#s-best summary').textContent()) && /Na vez dele: Flanqueia; foge com 25% de HP/.test(await page.locator('#tk-best-lembrete').innerText()), 'o bloco do Bestiário: o tier e o level, o lembrete');
    ok(await page.locator('#s-ficha').count() === 0, '(e não o da ficha)');
    await ev(id => __tc.Luta.atributos(__tc.Store.get('tokens', id)), gobId); await w(250);
    const des = cg.rolaveis.find(r => r[0] === 'DES')[2];
    ok(await page.locator('#fp-DES').count() === 1 && new RegExp('Destreza ' + des).test(await page.locator('#fp-DES').getAttribute('title')), 'a janelinha F tem os atributos do Bestiário (Destreza ' + des + ')');
    await page.locator('#fp-DES').click(); await w(200);
    ok(/Destreza/.test(await ev(() => document.querySelector('.fpop, .pop-f, [id^=fp-]') ? document.body.innerText : '')), 'rolar a Destreza pela janelinha');
    await page.keyboard.press('Escape'); await w(150);
    await ev(() => document.getElementById('s-best').scrollIntoView({ block: 'center' })); await w(120);
    await foto('l29-cenas-painel');
  });
  await passo('saque', async () => {
    await limpaToasts();
    await ev(() => { let k = 0; const seq = [0.1, 0.5]; window.__rnd = Math.random; Math.random = () => seq[k++ % 2]; });
    await page.locator('#tk-saque').click(); await w(250);
    await ev(() => { Math.random = window.__rnd; });
    const txt = await page.locator('.modal').innerText();
    ok(/Saque de Goblin batedor 2/.test(txt) && /Adaga enferrujada/.test(txt) && /3 × Erva/.test(txt) && await page.locator('#sq-lapros').inputValue() === '7', 'a janela do saque: a adaga (11 ≤ 30%), 3 ervas (51 ≤ 80%) e 7 lapros — ' + txt.replace(/\n/g, ' | '));
    ok(/Os dados: Adaga enferrujada: 11 ≤ 30% · Erva: 51 ≤ 80% · Lapros: 7\./.test(await page.locator('#sq-rol').innerText()), 'os dados que saíram');
    ok(await page.locator('#sq-para option').count() === 1 && /Deixar no chão/.test(await page.locator('.modal .btn.primary').innerText()), 'fora de uma mesa, só o chão (e o botão diz)');
    await foto('l29-cenas-saque');
    await page.locator('#sq-i-0').uncheck(); await w(80);
    await page.locator('.modal .btn.primary').click(); await w(250);
    const bau = await ev(() => { const b = __tc.Store.scene().tokens.find(x => x.prop === 'bau' && x.saque); return b ? { id: b.id, name: b.name, saque: b.saque, x: b.x, y: b.y } : null; });
    ok(bau && bau.name === 'Saque de Goblin batedor 2' && j(bau.saque) === j({ itens: [{ nome: 'Erva', qtd: 3, tipo: 'material' }], lapros: 7, de: 'Goblin batedor 2' }), 'no chão: o baú com o saque (sem a adaga, desmarcada) — ' + j(bau));
    ok(/O saque ficou no chão, num baú ao lado de Goblin batedor 2: 3 × Erva e 7 lapros\./.test(await toasts()), 'o aviso, com o Desfazer');
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, bau.id); await w(250);
    ok(/3 × Erva e 7 lapros \(de Goblin batedor 2\)\./.test(await page.locator('#pr-saque').innerText()), 'o painel do baú mostra o saque');
    ok(await page.locator('#pr-entregar').count() === 0 && /Numa mesa/.test(await page.locator('#s-saque').innerText()), 'fora de uma mesa, o baú só guarda (numa mesa, o botão Entregar)');
    await page.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(200);
    ok(await ev(() => !__tc.Store.scene().tokens.some(x => x.saque)), 'o Desfazer tira o baú');
    // com o azar, só os lapros (que não têm chance); e o lobo, sem saque nenhum, nem tem o botão
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, gobId); await w(200);
    await ev(() => { window.__rnd = Math.random; Math.random = () => 0.99; });
    await page.locator('#tk-saque').click(); await w(200);
    await ev(() => { Math.random = window.__rnd; });
    ok(await page.locator('#sq-lista .sq-i').count() === 0 && await page.locator('#sq-lapros').inputValue() === '7', 'com o azar (100 nos dois d100): só os 7 lapros');
    await page.keyboard.press('Escape'); await w(120);
    const loboId = (await toks()).find(x => x.best === 'lobo1').id;
    await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, loboId); await w(200);
    ok(await page.locator('#tk-saque').count() === 0 && /Este inimigo não tem saque\./.test(await page.locator('#s-best').innerText()) && await page.locator('#tk-best-lembrete').count() === 0, 'o lobo, sem saque e sem lembrete: nem o botão');
    await ev(() => { window.__rnd = Math.random; Math.random = () => 0.99; });
    const nada = await ev(() => { const b = window.TC.bestiario; return b.rolarSaque(b.normalizar(b.novo('x', { saque: { itens: [{ nome: 'Y', chance: 10 }] } }))).itens.length; });
    await ev(() => { Math.random = window.__rnd; });
    ok(nada === 0, '(o saque que não cai: nada)');
  });
  await passo('a vez', async () => {
    await limpaToasts();
    await ev(() => { __tc.Store.tx('limpar a ordem', () => __tc.Store.scn({ turn: { on: false, round: 1, cur: null, list: [] } })); const sc = __tc.Store.scene(); __tc.Act.turnAdd(sc.tokens.filter(x => x.best)); });
    await w(150);
    // a ordem: o goblin oculto, o goblin 2 e o lobo (iniciativas iguais: pela ordem da lista) — passa até a vez de um goblin
    let achou = false;
    for (let i = 0; i < 6 && !achou; i++) {
      await ev(() => __tc.UI.passarTurno(1)); await w(200);
      const vez = await ev(() => { const tn = __tc.Store.scene().turn, e = tn.list.find(x => x.id === tn.cur), k = e && e.token ? __tc.Store.get('tokens', e.token) : null; return k ? k.best : null; });
      if (vez === 'gob1') achou = true;
    }
    ok(achou && await page.locator('#best-lembra-gob1').count() === 1 && /Flanqueia; foge com 25% de HP/.test(await page.locator('#best-lembra-gob1').innerText()), 'na vez do goblin, o lembrete de comportamento para o mestre');
    await foto('l29-cenas-vez');
    await page.locator('#best-lembra-ok-gob1').click(); await w(120);
    ok(await page.locator('#best-lembra-gob1').count() === 0, 'Ok fecha o lembrete');
    let lobo = false;
    for (let i = 0; i < 6 && !lobo; i++) {
      await ev(() => __tc.UI.passarTurno(1)); await w(200);
      lobo = await ev(() => { const tn = __tc.Store.scene().turn, e = tn.list.find(x => x.id === tn.cur), k = e && e.token ? __tc.Store.get('tokens', e.token) : null; return !!k && k.best === 'lobo1'; });
    }
    ok(lobo && await page.locator('[id^=best-lembra-]').count() === 0, 'na vez do lobo (sem lembrete), nada');
  });
  await passo('jogadores e normalizar', async () => {
    const pub = await ev(() => { const sc = JSON.parse(JSON.stringify(__tc.Store.scene())); const b = __tc.Props.novo(sc, 'bau', 0, 0, 1, false); b.saque = { itens: [{ nome: 'X', qtd: 1, tipo: 'material' }], lapros: 0 }; sc.tokens.push(b); const p = __tc.Proj.projetar(sc, {}, new Set()); return p.v.tokens.map(x => ('best' in x) + ':' + ('saque' in x)); });
    ok(pub.length > 0 && pub.every(x => x === 'false:false'), 'o que vai para os jogadores não leva o inimigo nem o saque');
    const nz = await ev(() => { const sc = __tc.newScene('x'); const a = __tc.newToken(sc, 0, 0, { best: 'gob1' }), b2 = __tc.newToken(sc, 0, 0, { best: 'ruim id!' }), c = __tc.newToken(sc, 0, 0, { best: 'gob1', char: 'pc_1' }), d = __tc.newToken(sc, 0, 0, { saque: { itens: [{ nome: 'Erva', qtd: 2 }] } });
      const e = __tc.Props.novo(sc, 'bau', 0, 0, 1, false); e.saque = { itens: [{ nome: '', qtd: 0, tipo: 'zzz' }], lapros: -5, de: 'Goblin' };
      const f = __tc.Props.novo(sc, 'bau', 0, 0, 1, false); f.saque = { itens: [] };
      sc.tokens.push(a, b2, c, d, e, f); __tc.normalizeScene(sc); return sc.tokens.map(x => (x.best || '-') + '|' + (x.saque ? JSON.stringify(x.saque) : '-')); });
    ok(j(nz) === j(['gob1|-', '-|-', '-|-', '-|-', '-|{"itens":[{"nome":"Item","qtd":1,"tipo":"material"}],"lapros":0,"de":"Goblin"}', '-|-']), 'normalizar: o inimigo só num token sem ficha e com id bom; o saque só no objeto, arrumado — ' + j(nz));
  });
  await passo('o inimigo que saiu', async () => {
    await ev(() => { const o = JSON.parse(localStorage.getItem('tinycats:bestiario:local')); delete o.docs['best:i:gob1']; localStorage.setItem('tinycats:bestiario:local', JSON.stringify(o)); window.dispatchEvent(new StorageEvent('storage', { key: 'tinycats:bestiario:local' })); });
    await ev(id => { __tc.setSel([]); __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, gobId); await w(250);
    ok(/o inimigo não está aqui/.test(await page.locator('#s-best summary').textContent()) && await page.locator('#tk-saque').count() === 0, 'o inimigo apagado do Bestiário: o bloco avisa, sem o saque');
    ok(await ev(id => __tc.Fichas.numeros(__tc.Store.get('tokens', id)), gobId) === null && await ev(id => __tc.Store.get('tokens', id).bars.length, gobId) === cg.barras.length, 'sem os números; o token fica com as barras');
  });
  const errs = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  ok(!errs.length, 'sem erros no console: ' + errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${fails} de ${n} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})();
