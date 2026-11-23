// (lote 193) As formas grandes do Druida (Urso de Casca, Behemoth, Grande Espírito, Grifo Verde): usar deixa o token
// Transformado e Agigantado (o dobro), com ou sem imagem, e o Agigantado sai junto com o Transformado (à mão ou no fim do
// combate). E o token novo: até quanto o HP pode ficar negativo, na janela "Token novo".
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a); const w = ms => page.waitForTimeout(ms);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const j = JSON.stringify;
  // (lote 205) as árvores refeitas: os nós de verdade, para o leitor do texto (tc/habs-ler.js)
  await ev(fx => { const F = __tc.Fichas, velho = F.arvore; F.arvore = id => fx[id] || velho(id); window.TC.habsLer.usar(F); }, require('./arvores-teste.json'));
  // a regra: o Urso vira "em você", sem o golpe das garras
  const sp = await ev(() => __tc.HabAcao.specDe({ id: 'n_druida_aC', grau: 1, desc: 'Vira urso: Defesa tier II e garras de Dano tier III.' }));
  chk(sp.m === 'si' && !sp.d && ['transformado', 'agigantado'].every(k => sp.c.some(c => c[0] === k && c[3] === 's')), 'o Urso: em você, Transformado e Agigantado — ' + j(sp));
  const beh = await ev(() => __tc.HabAcao.specDe({ id: 'n_druida_a4', grau: 1, desc: '' }));
  chk(beh.c.find(c => c[0] === 'agigantado') && beh.c.find(c => c[0] === 'agigantado')[1] === beh.c.find(c => c[0] === 'transformado')[1] && beh.c.find(c => c[0] === 'caido'), 'o Behemoth: Agigantado pelos turnos da forma, e o resto fica — ' + j(beh.c));
  const lobo = await ev(() => __tc.HabAcao.specDe({ id: 'n_druida_a1', grau: 1, desc: '' }));
  chk(!lobo.c.some(c => c[0] === 'agigantado'), 'o Lobo não fica grande');
  // usar o Urso, sem imagem na ficha
  const id = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene(); const a = newToken(sc, 8 * sc.cell, 6 * sc.cell, { name: 'Druida', size: 1 }); Store.tx('Criar', () => Store.add('tokens', a)); return a.id; });
  const tok = () => ev(id => { const t = __tc.Store.get('tokens', id); return { size: t.size, conds: t.conds, ci: t.cinfo }; }, id);
  const fez = await ev(id => { let gastou = 0; const t = __tc.Store.get('tokens', id); const r = __tc.HabAcao.comecar({}, t, { v: 10 }, { id: 'n_druida_aC', nome: 'Forma do Urso de Casca', grau: 1, custo: 4, desc: 'Vira urso: Defesa tier II e garras de Dano tier III.' }, () => { gastou++; }); return { r, gastou, mira: __tc.HabAcao.ativa() }; }, id);
  await w(150);
  const a = await tok();
  chk(fez.r && fez.gastou === 1 && !fez.mira, 'usou: gastou a barra e não pediu alvo — ' + j(fez));
  chk(a.size === 2 && a.conds.includes('transformado') && a.conds.includes('agigantado'), 'o token fica Transformado e Agigantado, com o dobro do tamanho — ' + j(a));
  // tirar o Transformado à mão: o Agigantado sai junto
  await ev(id => { const { Store } = __tc, t = Store.get('tokens', id); const i = Object.assign({}, t.cinfo); delete i.transformado; Store.tx('tira', () => Store.upd('tokens', id, { conds: t.conds.filter(c => c !== 'transformado'), cinfo: i })); }, id); await w(150);
  const b = await tok();
  chk(b.size === 1 && !b.conds.includes('agigantado'), 'o Transformado saiu: o Agigantado sai junto e o tamanho volta — ' + j(b));
  // um Agigantado posto à mão (não da forma) fica
  await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'agigantado'), id); await w(100);
  await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'transformado'), id); await w(100);
  await ev(id => __tc.Act.condToggle([__tc.Store.get('tokens', id)], 'transformado'), id); await w(100);
  const c = await tok();
  chk(c.conds.includes('agigantado') && c.size === 2, 'o Agigantado posto à mão não sai com o Transformado — ' + j(c));
  // o token novo: o HP negativo até
  await ev(() => { __tc.Tools.set('token'); });
  await page.keyboard.press('Escape').catch(() => {});
  await ev(() => __tc.Tools.set('token')); await w(100);
  const box = await page.locator('#stage, canvas').first().boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6); await w(250);
  chk(await page.locator('#nt-lo').count() === 1, 'a janela do token novo tem o "Negativo até" (só no HP)');
  chk(await page.locator('#nt-lo').inputValue() === '0', 'começa em 0');
  await page.locator('#nt-nome').fill('Ogro');
  await page.locator('#nt-lo').fill('15');
  await page.locator('.modal .btn.primary').click(); await w(200);
  const ogro = await ev(() => { const t = __tc.Store.scene().tokens.find(x => x.name === 'Ogro'); return t && t.bars.map(b => [b.n, b.lo || 0]); });
  chk(ogro && ogro[0][1] === 15 && ogro.slice(1).every(x => !x[1]), 'o token nasce com o HP podendo ir até −15, e as outras barras não — ' + j(ogro));
  if (process.env.FOTO) { await ev(() => __tc.Tools.set('token')); await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5); await w(250); await page.screenshot({ path: process.env.FOTO }); }
  const errs = (t.errs || []).filter(e => !/favicon|net::|404/.test(e));
  chk(!errs.length, 'sem erros: ' + errs.join(' | '));
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
