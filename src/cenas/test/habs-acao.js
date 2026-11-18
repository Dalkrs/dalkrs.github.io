// (lote 185) As habilidades agem no mapa: a mira, os clones pelo nível, a condição com o teste, a zona e o dano.
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a); const w = ms => page.waitForTimeout(ms);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const ids = await ev(() => {
    const { Store, newToken } = __tc, sc = Store.scene();
    const a = newToken(sc, 8 * sc.cell, 6 * sc.cell, { name: 'Dain' }), b = newToken(sc, 11 * sc.cell, 6 * sc.cell, { name: 'Bandido' });
    b.bars[0] = Object.assign({}, b.bars[0], { n: 'Vida', v: 30, m: 30, on: true });
    Store.tx('Criar', () => { Store.add('tokens', a); Store.add('tokens', b); });
    return { a: a.id, b: b.id };
  });
  const usar = (hid, grau, nome) => ev(([ids, hid, grau, nome]) => {
    const { Store, HabAcao } = __tc, tok = Store.get('tokens', ids.a);
    window.__gastou = 0;
    return HabAcao.comecar({}, tok, { v: 20 }, { id: hid, nome, grau, custo: 4, desc: nome }, () => { window.__gastou++; });
  }, [ids, hid, grau, nome]);
  const centro = id => ev(id => { const { Store } = __tc, sc = Store.scene(), t = Store.get('tokens', id); return { x: t.x + t.size * sc.cell / 2, y: t.y + t.size * sc.cell / 2 }; }, id);

  // 1. Clone de Sombra, nível 2: dois clones, na hora (sem mira)
  chk(await usar('n_ninja_ab1', 2, 'Clone de Sombra'), 'o Clone de Sombra tem regra');
  await w(200);
  const cl = await ev(id => { const { Store } = __tc, sc = Store.scene(); return { n: sc.tokens.filter(t => t.clone === id).length, d: (Store.get('tokens', id).cinfo.clone || {}).d, g: window.__gastou }; }, ids.a);
  chk(cl.n === 2 && cl.d === 2 && cl.g === 1, 'nível 2: duas cópias do personagem, com o Clone por 2 turnos — ' + JSON.stringify(cl));
  await ev(id => { const { Store, Act } = __tc; Act.cloneDesfazer && Act.cloneDesfazer(id); }, ids.a); await w(100);

  // 2. Sombra que Segura: a mira; clicar no alvo abre a janela (teste de Vigor) e Aplicar põe Preso
  chk(await usar('n_ninja_axa', 1, 'Sombra que Segura'), 'a Sombra que Segura tem regra');
  chk(await ev(() => __tc.HabAcao.ativa()) && await ev(() => window.__gastou) === 0, 'mira ligada, e a barra ainda não foi gasta');
  const pb = await centro(ids.b);
  await ev(p => __tc.HabAcao.clique(p), pb); await w(250);
  chk(await page.locator('.ha-janela').count() === 1, 'a janela Resolver abriu');
  chk(/Teste de Vigor/.test(await page.locator('.ha-janela').innerText()), 'mostra o teste de Vigor');
  await page.locator('.ha-janela .modal-a button', { hasText: 'Aplicar' }).click(); await w(200);
  chk(await ev(id => __tc.Store.get('tokens', id).conds.includes('preso'), ids.b), 'quem falhou ficou Preso');

  // 3. Esc cancela a mira sem gastar
  await usar('n_ninja_axa', 1, 'Sombra que Segura');
  await page.keyboard.press('Escape'); await w(100);
  chk(!(await ev(() => __tc.HabAcao.ativa())) && await ev(() => window.__gastou) === 0, 'Esc cancela, sem gastar a barra');

  // 4. Bomba de Fumaça: clicar num lugar põe a fumaça por 2 turnos
  await usar('n_ninja_f2', 1, 'Bomba de Fumaça');
  const pa = await centro(ids.a);
  await ev(p => __tc.HabAcao.clique({ x: p.x + 80, y: p.y }), pa); await w(250);
  chk(await ev(() => __tc.Store.scene().effects.some(e => e.fx === 'fumaca' && e.dur === 2)), 'a fumaça ficou no chão, 2 turnos');

  // 5. Lança Verde: o dano que o mestre escreve sai da Vida
  await usar('n_kitsune_nirus_acab', 1, 'Lança Verde');
  await ev(p => __tc.HabAcao.clique(p), pb); await w(250);
  await page.locator('.ha-janela .ha-n').fill('7');
  if (process.env.FOTOS) await page.screenshot({ path: process.env.FOTOS + '/habs-janela.png' });
  await page.locator('.ha-janela .modal-a button', { hasText: 'Aplicar' }).click(); await w(200);
  chk(await ev(id => __tc.Store.get('tokens', id).bars[0].v, ids.b) === 23, 'Dano 7: a Vida foi de 30 para 23');

  // 6. Tempestade dos Pilares: a área no lugar clicado empurra quem falhou
  const antes = await ev(id => __tc.Store.get('tokens', id).x, ids.b);
  await usar('n_kare_ma_bya', 1, 'Tempestade dos Pilares');
  await page.mouse.move(10, 10);
  await ev(p => __tc.HabAcao.clique({ x: p.x - 40, y: p.y }), pb); await w(250);
  await page.locator('.ha-janela .modal-a button', { hasText: 'Aplicar' }).click(); await w(200);
  chk(await ev(id => __tc.Store.get('tokens', id).x, ids.b) !== antes, 'empurrado para fora da área');

  // 7. O pedido de um jogador: a janela do mestre, com "Pedido de", e Aplicar põe a condição
  await ev(ids => { const { Store } = __tc; Store.tx('dono', () => Store.upd('tokens', ids.a, { owner: 'p1' })); }, ids);
  chk(await ev(ids => __tc.HabAcao.pedidoDe('p1', { t: 'hab', de: ids.a, hab: { id: 'n_ninja_axa', nome: 'Sombra que Segura', grau: 1, texto: 'x' }, x: 0, y: 0, alvos: [ids.b] }, __tc.Store.scene()), ids), 'o pedido do dono do token vale');
  chk(!(await ev(ids => __tc.HabAcao.pedidoDe('p2', { t: 'hab', de: ids.a, hab: { id: 'n_ninja_axa', nome: 'x', grau: 1 }, alvos: [ids.b] }, __tc.Store.scene()), ids)), 'o pedido de outro jogador não vale');
  await w(200);
  chk(/Pedido de/.test(await page.locator('.ha-janela').innerText()), 'a janela diz de quem é o pedido');
  await page.locator('.ha-janela .modal-a button', { hasText: 'Recusar' }).click(); await w(100);
  chk(!(await page.locator('.ha-janela').count()), 'Recusar fecha sem aplicar');

  const errs = t.errs ? t.errs.filter(e => !/favicon|net::|404/.test(e)) : [];
  chk(!errs.length, 'sem erros na página: ' + errs.join(' | '));
  console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
  await t.close(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
