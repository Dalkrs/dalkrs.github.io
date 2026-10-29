// Bateria do lote 34 nas Cenas (no navegador, sem o site): as condições novas das árvores do Vampiro, do Licantropo e do
// Antro Roedor — Semente de Sangue, Cria da Noite, Fera Solta, Poça do Roedor e Na Toca —, na aba Raças do seletor, em
// ordem alfabética, cada uma com o ícone próprio e quem a traz; o Na Toca e a Poça do Roedor entram com 2 rodadas.
// (O começo do combate, com as barras de raça e classe, precisa de fichas: está em src/tests/barras-lote34.rede.test.js.)
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const NOVAS = ['sementeSangue', 'criaNoite', 'feraSolta', 'pocaRoedor', 'naToca'];

(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);

  const L = await ev(novas => { const { CONDS, ICONS } = __tc; const r = CONDS.filter(c => c.g === 'racas');
    return { total: CONDS.length, ids: new Set(CONDS.map(c => c.id)).size, nomes: r.map(c => c.n), novas: novas.map(id => { const c = CONDS.find(x => x.id === id); return c ? [c.n, c.g, c.r, !!ICONS[c.i], c.dur || 0] : null; }) }; }, NOVAS);
  ok(L.total === 153 && L.ids === 153, 'as 5 novas entram (153 condições ao todo, sem repetir): ' + L.total);
  ok(JSON.stringify(L.novas) === JSON.stringify([['Semente de Sangue', 'racas', 'Vampiro', true, 0], ['Cria da Noite', 'racas', 'Vampiro', true, 0], ['Fera Solta', 'racas', 'Licantropo', true, 0], ['Poça do Roedor', 'racas', 'Antro Roedor', true, 2], ['Na Toca', 'racas', 'Antro Roedor', true, 2]]),
    'cada uma na aba Raças, com quem a traz, o ícone próprio e a duração de começo — ' + JSON.stringify(L.novas));
  const ord = L.nomes.slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  ok(JSON.stringify(ord) === JSON.stringify(L.nomes), 'a aba Raças continua em ordem alfabética');
  const ic = await ev(novas => novas.map(id => { const p = __tc.ICONS['c_' + id]; try { const s = document.createElementNS('http://www.w3.org/2000/svg', 'path'); s.setAttribute('d', p); return !!p && p.length > 20; } catch (e) { return false; } }), NOVAS);
  ok(ic.every(Boolean), 'os cinco ícones existem');

  const id = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene(); const t = newToken(sc, 5 * sc.cell, 5 * sc.cell, { name: 'Roedor' }); Store.tx('Criar', () => Store.add('tokens', t)); return t.id; });
  await w(200);
  await ev(id => __tc.UI.condPicker([__tc.Store.get('tokens', id)]), id); await w(300);
  await page.locator('#cgm-tab-racas').click(); await w(200);
  const txt = await page.locator('.modal').innerText();
  ok(NOVAS.every(k => txt.includes(L.novas[NOVAS.indexOf(k)][0])) && /Antro Roedor/.test(txt) && /Licantropo/.test(txt), 'no seletor, na aba Raças, as cinco (com a raça ou a linhagem embaixo)');
  await page.locator('.modal .chips .chip', { hasText: 'Na Toca' }).first().scrollIntoViewIfNeeded();
  await foto('l34-cenas-condicoes');
  await page.locator('.modal .chips .chip', { hasText: 'Na Toca' }).first().click(); await w(150);
  const tk = await tok(id);
  ok(tk.conds.includes('naToca') && tk.cinfo.naToca && tk.cinfo.naToca.d === 2, 'o Na Toca entra com 2 rodadas (até o próximo turno dele) — ' + JSON.stringify(tk.cinfo));
  await page.keyboard.press('Escape'); await w(150);

  const errs = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  ok(!errs.length, 'sem erros no console: ' + errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})();
