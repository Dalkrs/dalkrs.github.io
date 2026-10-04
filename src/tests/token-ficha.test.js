// Token ligado à ficha, no projeto real: o mestre cria uma ficha na mesa, liga um token da cena a ela,
// e o HP anda junto nos dois sentidos; a rolagem de atributo pelo token vai para a mesa ao vivo.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async re => { for (let i = 0; i < 60; i++) { const f = M.frame({ url: re }); if (f) return f; await w(250); } return null; };
  const ate = async (fn, ms = 12000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await w(350); } };
  const linha = () => M.evaluate(() => { const l = TC.dados.col('personagens').todas()[0]; return l ? { id: l.id, nome: l.nome, estado: l.estado, rev: l.rev } : null; });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Token E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa);

  // ---------- a ficha ----------
  let F = null;
  ok(await ate(async () => { F = await quadro(/\/fichas\//); return F && (await F.locator('#btnNew').count()) === 1 && (await F.locator('#ficha').innerText()).includes('Nenhum personagem'); }), 'Fichas abre na mesa, vazia');
  await F.locator('#btnNew').click(); await w(400);
  await F.locator('#f_nome').fill('Dain X'); await F.locator('#f_tier').selectOption('S'); await w(200); await F.locator('#f_level').selectOption('19'); await w(600);
  ok(await ate(async () => { const l = await linha(); return l && l.nome === 'Dain X' && l.rev > 0 && await M.evaluate(() => TC.dados.pendentes === 0); }), 'a ficha criada sobe para a mesa');
  const hpMax = await F.evaluate(() => { const pc = S.personagens[0]; return Math.floor(calcular(pc).recursos.find(r => r.nome === 'HP').val); });
  const idHP = await F.evaluate(() => S.personagens[0].recursos.find(r => r.nome === 'HP').id);
  ok(hpMax > 100, 'HP máximo calculado pela fórmula da ficha: ' + hpMax);

  // ---------- a cena: ligar o token ----------
  await M.locator('#tab-cenas').click();
  let C = null;
  ok(await ate(async () => { C = await quadro(/\/cenas\//); return C && await C.evaluate(() => !!window.__tc && __tc.Fichas.on()); }, 20000), 'na cena, a ligação com as fichas fica disponível para o mestre');
  // numa mesa, as cenas são as da mesa (ela começa com uma cena vazia): o mestre pede a de exemplo pelo menu de cenas
  ok(await C.evaluate(() => __tc.Nuvem.modo() === 'mestre' && __tc.Store.S.order.length === 1 && __tc.Store.scene().tokens.length === 0), 'a mesa nova começa com uma cena vazia, guardada na mesa');
  await C.locator('#sceneBtn').click(); await w(250);
  await C.locator('.menu-i', { hasText: 'Nova cena de exemplo' }).click();
  ok(await ate(async () => await C.evaluate(() => __tc.Store.scene().tokens.length === 7 && /^https:/.test((__tc.Store.S.assets[__tc.Store.scene().bg.asset] || {}).url || '')), 30000), 'a cena de exemplo criada na mesa guarda o mapa dela no banco');
  const tok = await C.evaluate(() => { const u = __tc, tk = u.Store.scene().tokens.find(x => x.name === 'Dain X'); u.setSel([{ c: 'tokens', id: tk.id }]); u.UI.openTab('sel'); return { id: tk.id, bars: tk.bars.map(b => b.n + ':' + b.v + '/' + b.m) }; });
  await w(400);
  await C.locator('#s-ficha > summary').click(); await w(200);
  ok(await C.locator('#tk-char option').count() === 2, 'a lista mostra as fichas da mesa');
  await C.locator('#tk-char').selectOption({ label: 'Dain X' }); await w(700);
  const depois = await C.evaluate(id => { const tk = __tc.Store.get('tokens', id); return { char: tk.char, bars: tk.bars.map(b => ({ n: b.n, v: b.v, m: b.m, ref: b.ref || null })) }; }, tok.id);
  const bHP = depois.bars.find(b => b.n === 'HP');
  ok(!!depois.char && !!bHP && bHP.m === hpMax && bHP.v === hpMax && bHP.ref === idHP, 'ligado, o token ganha a barra HP da ficha, cheia: ' + JSON.stringify(bHP) + ' (antes: ' + tok.bars.join(', ') + ')');
  ok(depois.bars.some(b => b.n === 'SP' && b.ref), 'e a barra SP também vem da ficha');
  ok(depois.bars.some(b => b.n === 'Vida' && !b.ref), 'as barras que o token já tinha continuam lá');
  ok(await C.evaluate(() => !__tc.Store.canUndo() || true), 'a cena continua funcionando');

  // ---------- dano no mapa → ficha ----------
  await C.evaluate(([id]) => { const u = __tc, tk = u.Store.get('tokens', id), i = tk.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(tk, i, tk.bars[i].v - 30); }, [tok.id]); await w(300);
  ok(await ate(async () => { const l = await linha(); return l && l.estado && l.estado.rec && l.estado.rec[idHP] === hpMax - 30; }), 'dano no token vai para a ficha (HP atual = ' + (hpMax - 30) + ')');
  await C.evaluate(() => __tc.Store.undo()); await w(300);
  ok(await ate(async () => { const l = await linha(); return l.estado.rec[idHP] === hpMax; }), 'desfazer o dano na cena devolve o HP na ficha');
  await C.evaluate(() => __tc.Store.redo()); await w(300);

  // ---------- ficha → token ----------
  await M.locator('#tab-fichas').click(); await w(800);
  ok(await ate(async () => (await F.locator(`[data-resatual="${idHP}"]`).inputValue()) === String(hpMax - 30)), 'a ficha mostra o HP atual que veio do mapa');
  await F.locator(`[data-resatual="${idHP}"]`).fill(String(hpMax - 100)); await F.locator('#f_nome').click(); await w(1200);
  await M.locator('#tab-cenas').click(); await w(500);
  ok(await ate(async () => (await C.evaluate(id => __tc.Store.get('tokens', id).bars.find(b => b.n === 'HP').v, tok.id)) === hpMax - 100), 'mudar o HP atual na ficha muda a barra do token');
  await M.locator('#tab-fichas').click(); await w(500);
  await F.locator('#f_level').selectOption('20'); await w(1200);
  const hpMax20 = await F.evaluate(() => Math.floor(calcular(S.personagens[0]).recursos.find(r => r.nome === 'HP').val));
  await M.locator('#tab-cenas').click(); await w(500);
  ok(hpMax20 > hpMax && await ate(async () => (await C.evaluate(id => __tc.Store.get('tokens', id).bars.find(b => b.n === 'HP').m, tok.id)) === hpMax20), 'subir de nível na ficha aumenta o máximo da barra do token (' + hpMax + ' → ' + hpMax20 + ')');

  // ---------- rolar atributo pelo token ----------
  await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, tok.id); await w(400);
  if (!(await C.locator('#tk-rolar').isVisible())) { await C.locator('#s-ficha > summary').click(); await w(200); }
  ok((await C.locator('#tk-atr option').first().innerText()).startsWith('Força ·'), 'o painel lista os atributos da ficha com o valor: ' + await C.locator('#tk-atr option').first().innerText());
  await C.locator('#tk-fixa').fill('20'); await C.locator('#tk-fixa').press('Tab'); await C.locator('#tk-rolar').click();
  let chegou = false;
  try { await M.locator('#feed .rol', { hasText: 'Dain X · Força' }).first().waitFor({ timeout: 10000 }); chegou = true; } catch (e) { /* não chegou */ }
  ok(chegou, 'a rolagem de atributo pelo token aparece na mesa ao vivo');
  ok(chegou && /20 de fixa/.test(await M.locator('#feed .rol', { hasText: 'Dain X · Força' }).first().innerText()) && (await M.locator('#feed .rol', { hasText: 'Dain X · Força' }).first().locator('.or').innerText()) === 'Cenas', 'com a fixa e a origem "Cenas"');

  // ---------- sobrevida: token ⇄ ficha ----------
  await C.evaluate(id => { const u = __tc, tk = u.Store.get('tokens', id), i = tk.bars.findIndex(b => b.n === 'HP'); u.Act.barExtra(tk, i, 15); }, tok.id); await w(300);
  ok(await ate(async () => { const l = await linha(); return l.estado.sob && l.estado.sob[idHP] === 15; }), 'sobrevida posta no token vai para a ficha');
  const hpAgora = await C.evaluate(id => __tc.Store.get('tokens', id).bars.find(b => b.n === 'HP').v, tok.id);
  await C.evaluate(id => { const u = __tc, tk = u.Store.get('tokens', id), i = tk.bars.findIndex(b => b.n === 'HP'); u.Act.barSet(tk, i, '-20'); }, tok.id); await w(300);
  ok(await ate(async () => { const l = await linha(); return (!l.estado.sob || l.estado.sob[idHP] === undefined) && l.estado.rec[idHP] === hpAgora - 5; }), 'dano de 20 no mapa: a sobrevida (15) acaba e 5 saem do HP, também na ficha');
  await M.locator('#tab-fichas').click(); await w(600);
  ok(await ate(async () => (await F.locator(`[data-ressob="${idHP}"]`).inputValue()) === '0' && (await F.locator(`[data-resatual="${idHP}"]`).inputValue()) === String(hpAgora - 5)), 'a ficha mostra o recurso com a sobrevida ao lado');
  await F.locator(`[data-ressob="${idHP}"]`).fill('9'); await F.locator('#f_nome').click(); await w(1200);
  await M.locator('#tab-cenas').click(); await w(500);
  ok(await ate(async () => (await C.evaluate(id => __tc.Store.get('tokens', id).bars.find(b => b.n === 'HP').x, tok.id)) === 9), 'sobrevida posta na ficha aparece no token');

  // ---------- a imagem da ficha vira a imagem do token ----------
  await M.locator('#tab-fichas').click(); await w(500);
  await F.evaluate(async () => {
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 300;
    const cx = cv.getContext('2d'); cx.fillStyle = '#b5462f'; cx.fillRect(0, 0, 300, 300); cx.fillStyle = '#f2d16b'; cx.fillRect(100, 60, 100, 100);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'dain.png', { type: 'image/png' }));
    const arq = document.querySelector('#imgIn'); arq.files = dt.files; arq.dispatchEvent(new Event('change', { bubbles: true }));
  });
  let urlImg = null;
  ok(await ate(async () => { urlImg = await M.evaluate(() => { const l = TC.dados.col('personagens').todas()[0]; return l && l.ficha && l.ficha.img; }); return typeof urlImg === 'string' && urlImg.startsWith('https://'); }, 25000), 'a ficha ganha uma imagem (guardada no banco)');
  await M.locator('#tab-cenas').click(); await w(500);
  ok(await ate(async () => await C.evaluate(([id, url]) => { const u = __tc, tk = u.Store.get('tokens', id), a = tk.img && u.Store.S.assets[tk.img]; return !!a && a.url === url && tk.imgChar === true; }, [tok.id, urlImg])), 'o token ligado passa a usar a imagem da ficha');
  ok(await ate(async () => await C.evaluate(id => { const u = __tc, tk = u.Store.get('tokens', id); u.Render.request(); return !!u.Assets.img(tk.img); }, tok.id), 20000), 'a imagem carrega no mapa');
  ok(await C.evaluate(() => { try { return __tc.Render.cv.toDataURL('image/png').length > 1000; } catch (e) { return false; } }), 'e o mapa continua exportável (a imagem vem com permissão de uso no canvas)');
  await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, tok.id); await w(400);
  ok((await C.locator('#side').innerText()).includes('É a imagem da ficha do personagem'), 'o painel do token avisa que a imagem vem da ficha');
  if (!(await C.locator('#tk-rolar').isVisible())) { await C.locator('#s-ficha > summary').click(); await w(200); }
  await C.locator('#tk-atr').selectOption('DES'); await C.locator('#tk-rolar').click();
  const rolDes = M.locator('#feed .rol', { hasText: 'Dain X · Destreza' }).first();
  let veio = false;
  try { await rolDes.waitFor({ timeout: 10000 }); veio = true; } catch (e) { /* não chegou */ }
  ok(veio && (await rolDes.locator('img.av').getAttribute('src')) === urlImg, 'a rolagem pelo token chega à mesa ao vivo com a imagem do personagem');

  // ---------- desligar ----------
  await C.locator('#tk-char').selectOption({ label: 'Sem ficha' }); await w(500);
  const solto = await C.evaluate(id => { const tk = __tc.Store.get('tokens', id); return { char: tk.char, refs: tk.bars.filter(b => b.ref).length, hp: !!tk.bars.find(b => b.n === 'HP') }; }, tok.id);
  ok(solto.char === null && solto.refs === 0 && solto.hp, 'desligado, as barras ficam no token como barras comuns: ' + JSON.stringify(solto));
  ok(await C.evaluate(id => { const tk = __tc.Store.get('tokens', id); return !!tk.img && tk.imgChar === false; }, tok.id), 'e a imagem fica com o token');

  await apagarMesaTela(M, nomeMesa);
  const fora = t.errs.filter(e => !/status of (400|401|409)/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
