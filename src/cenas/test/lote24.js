// Bateria do lote 24 nas Cenas (no navegador, sem o site): os valores digitados no painel não se perdem.
//   · com o painel se redesenhando o tempo todo (jogadores na mesa, combate andando — aqui, uma mudança "de fora" a cada
//     250 ms), digitar devagar o nome do token e os valores das barras, e confirmar com Enter, Tab ou clicando no mapa:
//     tudo fica gravado (antes, o campo redesenhado não avisava a mudança e o valor voltava ao antigo);
//   · o que chega de fora enquanto se digita (o SP mudado por um jogador) não é desfeito ao confirmar o campo;
//   · confirmado o campo, o painel volta a acompanhar a cena;
//   · a Cura total enche a Vida e o SP, mas não as barras especiais da ficha (Ki, Fúria…: elas voltam pelo Restaurar energias).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open();
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  await w(500);
  const id = await ev(() => { const u = __tc, sc = u.Store.scene(), bar = (n, v, m) => u.cleanBar({ n, c: '#d6524b', v, m, k: 'bar', on: true, vis: '' });
    const b = u.newToken(sc, sc.cell * 5, sc.cell * 5, { name: 'Bandido', bars: [bar('Vida', 20, 20), bar('Fé', 3, 10)] }); u.Store.tx('b', () => u.Store.add('tokens', b));
    u.setSel([{ c: 'tokens', id: b.id }]); u.UI.openTab('sel'); return b.id; });
  await w(300);
  // uma mudança de fora a cada 250 ms (outro token mexe), como numa sessão com jogadores
  await ev(() => { const u = __tc, sc = u.Store.scene(), o = sc.tokens.find(t => t.name !== 'Bandido' && !t.prop); let k = 0; window.__iv = setInterval(() => { u.Store.remoteIn(sc.id, [{ t: 'upd', c: 'tokens', id: o.id, p: { x: o.x + (k++ % 2) } }]); }, 250); });
  const st = () => ev(id => { const k = __tc.Store.get('tokens', id); return k.name + ' ' + k.bars.map(b => b.n + ':' + b.v).join(','); }, id);
  const digita = async (sel, val, tecla) => { const x = page.locator(sel); await x.click(); await x.press('Control+A'); await x.type(val, { delay: 180 }); if (tecla) await x.press(tecla); await w(400); };
  await digita('#tk-name', 'Capitão Rubro', 'Tab');
  ok(/^Capitão Rubro /.test(await st()), 'o nome digitado devagar, com Tab, fica gravado: ' + await st());
  await digita('#tk-b0-v', '15', 'Enter');
  ok(/Vida:15,/.test(await st()), 'o valor da barra, com Enter, fica gravado: ' + await st());
  await digita('#tk-b1-v', '7', 'Tab');
  ok(/Fé:7$/.test(await st()), 'a segunda barra, com Tab: ' + await st());
  await digita('#tk-b0-v', '-4', 'Enter');
  ok(/Vida:11,/.test(await st()) && await page.locator('#tk-b0-v').inputValue() === '11', 'o "-4" desconta uma vez só (15 → 11), e o campo mostra o novo valor');
  { const x = page.locator('#tk-b1-v'); await x.click(); await x.press('Control+A'); await x.type('9', { delay: 180 }); const b = await page.locator('#cv').boundingBox(); await page.mouse.click(b.x + 20, b.y + b.height - 20); await w(400); }
  ok(/Fé:9$/.test(await st()), 'digitar e clicar no mapa também confirma: ' + await st());
  // enquanto digita o nome, um jogador muda a Fé (de fora): os dois ficam
  await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id); await w(300);
  { const x = page.locator('#tk-b0-v'); await x.click(); await x.press('Control+A'); await x.type('1', { delay: 120 });
    await ev(id => { const u = __tc, k = u.Store.get('tokens', id); u.Store.remoteIn(u.Store.scene().id, [{ t: 'upd', c: 'tokens', id, p: { bars: k.bars.map((b, i) => (i === 1 ? Object.assign({}, b, { v: 4 }) : b)) } }]); }, id);
    await x.type('2', { delay: 120 }); await x.press('Enter'); await w(400); }
  ok(/Vida:12,Fé:4$/.test(await st()), 'a Fé que chegou de fora (4) fica, e a Vida digitada (12) também: ' + await st());
  ok(await page.locator('#tk-b1-v').inputValue() === '4', 'confirmado o campo, o painel volta a acompanhar (a Fé mostra 4)');
  await ev(() => clearInterval(window.__iv));
  // trocar o que está escolhido (ou a aba) redesenha o painel mesmo com um campo a meio
  { const x = page.locator('#tk-name'); await x.click(); await x.type('xyz', { delay: 40 });
    const outro = await ev(id => { const u = __tc, o = u.Store.scene().tokens.find(k => k.id !== id && !k.prop); u.setSel([{ c: 'tokens', id: o.id }]); u.UI.openTab('sel'); return o.name; }, id); await w(300);
    ok(await page.locator('#tk-name').inputValue() === outro, 'escolher outro token com um campo a meio: o painel mostra o outro (' + outro + ')'); }
  // a Cura total não enche as barras especiais da ficha
  const cura = await ev(() => { const u = __tc, sc = u.Store.scene(), bar = (n, v, m, ref) => Object.assign(u.cleanBar({ n, c: '#d6524b', v, m, k: 'bar', on: true, vis: '' }), ref ? { ref } : {});
    const k = u.newToken(sc, sc.cell * 8, sc.cell * 8, { name: 'Monge', bars: [bar('Vida', 5, 30), bar('SP', 2, 10), bar('Ki', 1, 5, 'pd:ki')] }); u.Store.tx('m', () => u.Store.add('tokens', k));
    u.Act.fullHeal([u.Store.get('tokens', k.id)]); return u.Store.get('tokens', k.id).bars.map(b => b.n + ':' + b.v).join(','); });
  ok(cura === 'Vida:30,SP:10,Ki:1', 'a Cura total enche a Vida e o SP; o Ki (barra especial da ficha) fica: ' + cura);
  if (t.errs.length) console.log(t.errs.slice(0, 5).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
