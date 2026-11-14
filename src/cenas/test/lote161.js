// Bateria do lote 161 (as Cenas): na janelinha F, as armas à distância da ficha — "Disparar · dano" (gasta 1, mostra o
// dano fixo, com Desfazer) e "Recarregar". A ficha aqui é de mentira (as regras e a gravação têm o teste da aba Fichas).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({});
  const p = t.page, w = ms => p.waitForTimeout(ms || 200);
  const ev = (fn, a) => p.evaluate(fn, a);
  await p.addScriptTag({ path: require('path').join(__dirname, '../../../tc/rules.js') });      // (a página de teste não traz as regras)
  await ev(() => {
    const u = __tc, sc = u.Store.scene(), k = u.newToken(sc, 3 * sc.cell, 3 * sc.cell, { name: 'Dain' });
    u.Store.tx('prep', () => u.Store.add('tokens', k)); u.Store.tx('ligar', () => u.Store.upd('tokens', k.id, { char: 'pc_d' }));
    const R = window.TC.rules, F = u.Fichas;
    window.__arma = { id: 'pi', nome: 'Pistola', equipado: true, dp: 18, dano: { FOGO: 4 }, dist: { k: 'fogo', cap: 6, bal: 1, pen: 1 } };
    window.__desfeito = 0;
    F.ligado = t => !!t && t.char === 'pc_d'; F.podeRolar = F.ligado;
    F.rolaveis = () => [['FOR', 'Força', 30], ['DES', 'Destreza', 20]];
    F.armasDist = t => (t && t.char === 'pc_d' ? [{ id: 'pi', nome: 'Pistola', d: R.distDoItem(window.__arma), tiro: R.danoDoTiro(window.__arma) }] : []);
    F.municao = (t, id, op) => {
      const antes = window.__arma, r = op === 'recarregar' ? R.recarregarDist(antes) : R.dispararDist(antes);
      if (!r.ok) return { ok: false, error: r.erro };
      window.__arma = r.item;
      return { ok: true, nome: 'Pistola', d: r.d, tiro: R.danoDoTiro(antes), desfazer: () => { window.__arma = antes; window.__desfeito++; return true; } };
    };
    u.setSel([{ c: 'tokens', id: k.id }]);
  });
  await w(200);
  const b = await p.locator('#cv').boundingBox(); await p.mouse.move(b.x + 8, b.y + b.height - 8); await w(100);
  await p.keyboard.press('f'); await w(300);
  ok(await p.locator('#fpop #fp-dist').isVisible(), 'a janelinha F mostra as armas à distância');
  ok(/Balas 1\/6 · Pentes 1/.test(await p.locator('#fp-dist').innerText()), 'com a munição: ' + await p.locator('#fp-dist').innerText());
  ok((await p.locator('#fp-tiro-pi').innerText()).trim() === 'Disparar · 18 + Fogo 4', 'o botão diz o dano fixo, com o elemento');
  ok(await p.locator('#fp-recarga-pi').isEnabled(), 'Recarregar livre (há pente e a arma não está cheia)');
  await p.locator('#fp-tiro-pi').click(); await w(300);
  ok(await ev(() => window.__arma.dist.bal === 0), 'Disparar gasta 1');
  ok((await p.locator('#fp-total').innerText()) === '18' && /Dano fixo 18 \+ Fogo 4 · vazia: recarregue/.test(await p.locator('#fp-res').innerText()), 'o resultado: o dano fixo — ' + await p.locator('#fp-res').innerText());
  ok(/disparou Pistola: dano 18 \+ Fogo 4 \(vazia: recarregue\)/.test(await p.locator('.toast').last().innerText()), 'o aviso: ' + await p.locator('.toast').last().innerText());
  ok(await p.locator('#fp-tiro-pi').isDisabled(), 'vazia: não dispara');
  await p.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(300);
  ok(await ev(() => window.__arma.dist.bal === 1 && window.__desfeito === 1), 'Desfazer devolve a bala');
  if (await p.locator('#fpop').count() === 0) { await p.mouse.move(b.x + 8, b.y + b.height - 8); await p.keyboard.press('f'); await w(300); }
  await p.locator('#fp-tiro-pi').click(); await w(300);
  await p.locator('#fp-recarga-pi').click(); await w(300);
  ok(await ev(() => window.__arma.dist.bal === 6 && window.__arma.dist.pen === 0), 'Recarregar: cheia, sem pente');
  ok(/Balas 6\/6 · Pentes 0/.test(await p.locator('#fp-dist').innerText()) && await p.locator('#fp-recarga-pi').isDisabled(), 'a janelinha acompanha, e Recarregar fica parado');
  if (process.env.FOTOS) await p.locator('#fpop').screenshot({ path: process.env.FOTOS + '/l161-pop.png' });
  ok(!t.errs.filter(e => !/favicon|willReadFrequently/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
