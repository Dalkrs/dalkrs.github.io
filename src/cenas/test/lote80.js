// Bateria do lote 80 nas Cenas:
//   · a vida chega a 0: o token ganha Morto (a vida negativa continua valendo); o aviso pergunta se ele sai da
//     iniciativa ("Tirar da iniciativa", com Desfazer); voltou a ter vida: o Morto sai sozinho;
//   · a iniciativa: rolar as iniciativas com o combate parado põe a vez no topo da ordem (antes ficava com quem tinha
//     entrado primeiro — o token selecionado); depois que a vez já passou, rolar para quem chega não mexe nela.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  const turno = () => ev(() => JSON.parse(JSON.stringify(__tc.Store.scene().turn)));
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const vezDe = async () => { const tn = await turno(); const e = tn.list.find(x => x.id === tn.cur); return e ? e.name : null; };
  const ids = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene();
    const hp = v => [{ n: 'HP', c: '#c8242c', v, m: 20, k: 'bar', on: true, vis: '' }].map(__tc.cleanBar);
    const mk = (nome, x, ini, v) => Object.assign(newToken(sc, x * sc.cell, 4 * sc.cell, { name: nome }), { ini, bars: hp(v) });
    const cora = mk('Cora', 4, 0, 20), ana = mk('Ana', 7, 60, 20), bruto = mk('Bruto', 10, 30, 20), ogro = mk('Ogro', 13, -60, 5);
    Store.tx('Criar', () => { Store.scn({ turn: { on: false, round: 1, cur: null, list: [] } }); for (const k of [cora, ana, bruto, ogro]) Store.add('tokens', k); });
    return { cora: cora.id, ana: ana.id, bruto: bruto.id, ogro: ogro.id };
  });
  await w(250);

  /* ---------- a iniciativa ---------- */
  // a Cora selecionada entra primeiro na ordem (a vez fica com ela), depois os outros
  await ev(o => { const { Act, Store, setSel } = __tc; setSel([{ c: 'tokens', id: o.cora }]); Act.turnAdd([o.cora, o.ana, o.bruto, o.ogro].map(id => Store.get('tokens', id))); }, ids);
  ok(await vezDe() === 'Cora', '(a Cora, selecionada, entrou primeiro: a vez estava com ela)');
  await page.locator('#turnRoll').click().catch(async () => { await ev(() => { __tc.UI.openTab('turn'); }); await w(200); await page.locator('#turnRoll').click(); });
  await w(300);
  let tn = await turno();
  ok(tn.list[0].name === 'Ana' && await vezDe() === 'Ana', 'rolar as iniciativas com o combate parado põe a vez no topo (a Ana, com +60): ' + j(tn.list.map(e => e.name + ' ' + e.init)));
  await ev(() => __tc.Act.turnStep(1)); await w(150);
  ok((await turno()).on && await vezDe() === 'Ana', 'o combate começa pela Ana, a maior iniciativa');
  await ev(() => __tc.Act.turnStep(1)); await w(150);
  const vez2 = await vezDe();
  // alguém novo entra e rola: a vez não muda mais
  const novo = await ev(() => { const { Store, newToken, Act } = __tc, sc = Store.scene(); const k = Object.assign(newToken(sc, 2 * sc.cell, 8 * sc.cell, { name: 'Dain' }), { ini: 90 }); Store.tx('Criar', () => Store.add('tokens', k)); Act.turnAdd([Store.get('tokens', k.id)]); const e = Store.scene().turn.list.find(x => x.token === k.id); Act.turnRoll([e.id]); return k.id; });
  await w(150);
  tn = await turno();
  ok(tn.list[0].name === 'Dain' && await vezDe() === vez2, 'depois que a vez passou, quem chega e rola vai para o lugar dele, sem tirar a vez de quem está jogando (' + vez2 + ')');

  /* ---------- a vida chega a 0 ---------- */
  await ev(id => { const { Store, Combate } = __tc; Combate.aplicarAtaque([{ t: Store.get('tokens', id), final: 8 }], 'HP', 'Dano'); }, ids.ogro); await w(300);
  let k = await tok(ids.ogro);
  ok(k.bars[0].v <= 0 && k.conds.includes('morto'), 'o Ogro leva 8 com 5 de vida: chega a 0 e ganha Morto — ' + j({ v: k.bars[0].v, conds: k.conds }));
  ok(/Ogro chegou a 0 de vida: Morto\. Tirar da iniciativa\?/.test(await avisos()), 'o aviso pergunta se ele sai da iniciativa');
  await foto('l80-morto');
  await page.locator('.toast', { hasText: 'Ogro chegou a 0' }).locator('button', { hasText: 'Tirar da iniciativa' }).click(); await w(250);
  ok(!(await turno()).list.some(e => e.token === ids.ogro) && /Ogro saiu da iniciativa/.test(await avisos()), '"Tirar da iniciativa": o Ogro sai da ordem, com o aviso');
  await page.locator('.toast', { hasText: 'Ogro saiu da iniciativa' }).locator('button', { hasText: 'Desfazer' }).click(); await w(250);
  ok((await turno()).list.some(e => e.token === ids.ogro) && (await tok(ids.ogro)).conds.includes('morto'), 'Desfazer devolve o Ogro à ordem (ainda Morto)');
  // a cura: voltou a ter vida, o Morto sai
  await ev(id => { const { Store } = __tc, t = Store.get('tokens', id); Store.tx('Cura', () => Store.upd('tokens', id, { bars: t.bars.map(b => Object.assign({}, b, { v: 6 })) })); }, ids.ogro); await w(250);
  k = await tok(ids.ogro);
  ok(!k.conds.includes('morto') && /Ogro voltou a ter vida: o Morto saiu/.test(await avisos()), 'curado (6 de vida): o Morto sai sozinho, com o aviso');
  // fora da ordem: o aviso não pergunta
  await ev(o => { const { Store, Combate, Act } = __tc; Act.turnPatch(tn => { tn.list = tn.list.filter(e => e.token !== o.cora); }, 'x'); Combate.aplicarAtaque([{ t: Store.get('tokens', o.cora), final: 30 }], 'HP', 'Dano'); }, ids); await w(300);
  ok((await tok(ids.cora)).conds.includes('morto') && /Cora chegou a 0 de vida: Morto\./.test(await avisos()) && !/Cora chegou a 0 de vida: Morto\. Tirar/.test(await avisos()), 'quem não está na ordem ganha Morto, e o aviso não pergunta nada');
  // um passo que não mexe na vida não mexe no Morto
  await ev(id => { const { Store } = __tc; Store.tx('Mover', () => Store.upd('tokens', id, { x: 0 })); }, ids.cora); await w(150);
  ok((await tok(ids.cora)).conds.includes('morto'), '(mover o token não tira o Morto)');
  ok(!t.errs || !t.errs.length, 'sem erros no console: ' + (t.errs || []).slice(0, 3).join(' | '));
  console.log((fails ? fails + ' falharam, ' : '') + (n - fails) + ' verificações passaram');
  await t.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
