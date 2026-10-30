// Bateria do lote 44 nas Cenas (no navegador, sem o site): o painel de barras, do lado do mestre.
//   · NPC sem ficha: no painel do token, "Barra especial" (as 49 do guia) põe uma barra no token (o número) e o estado
//     do painel; o aviso tem Desfazer; "Nenhuma" tira;
//   · os selos nos tokens com barra (e um clique no selo abre o painel do NPC);
//   · no combate: o painel do NPC da vez abre sozinho; um toque ("Golpe sofrido") e o Desfazer do painel; a tela das
//     barrinhas não abre na vez de quem tem painel (abre na de quem não tem);
//   · Encerrar: cada barra faz o fim dela (o Frenesi volta ao início, o Compasso também), com Desfazer;
//   · o interruptor da aba Turnos: desligado, sem painel, sem selos, sem a seção no token, e as barrinhas voltam a abrir;
//   · no celular, o painel vira uma gaveta embaixo, da largura da tela.
// (O lado do jogador e a ligação com as fichas estão em src/tests/painel-barras.rede.test.js.)
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;

(async () => {
  let t = await open();
  let { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const tok = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id))), id);
  const barraPb = async id => { const k = await tok(id); return (k.bars || []).find(b => b.ref && b.ref.startsWith('pb:')) || null; };
  const avisos = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const quem = () => page.locator('#pbHost .pb:not(.moeda) .pb-quem').allInnerTexts();
  const selecionar = id => ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id);

  ok(await ev(() => !!(window.TC && TC.painelBarras && TC.painelBarras.BARRAS.length === 49) && typeof __tc.PainelBarras === 'object'), 'o motor das 49 barras chega às Cenas');
  ok(await ev(() => __tc.PainelBarras.ligado()), 'o painel começa ligado');

  const ids = await ev(() => { const { Store, newToken } = __tc, sc = Store.scene();
    const a = newToken(sc, 6 * sc.cell, 5 * sc.cell, { name: 'Rastoroni' }), b = newToken(sc, 9 * sc.cell, 5 * sc.cell, { name: 'Karênie' }), c = newToken(sc, 12 * sc.cell, 7 * sc.cell, { name: 'Bandido' });
    Store.tx('Criar', () => { Store.add('tokens', a); Store.add('tokens', b); Store.add('tokens', c); }); return { rast: a.id, kare: b.id, band: c.id }; });
  await w(200);

  /* ---------- a barra especial do NPC sem ficha ---------- */
  await selecionar(ids.rast); await w(300);
  const ops = await page.locator('#pb-escolher option').count();
  ok(ops === 50, 'no painel do token, "Barra especial": Nenhuma e as 49 do guia — ' + ops);
  await page.locator('#pb-escolher').selectOption('rastoroni'); await w(300);
  let b = await barraPb(ids.rast), k = await tok(ids.rast);
  ok(b && b.n === 'Frenesi' && b.v === 6 && b.m === 20 && b.ref === 'pb:rastoroni' && k.pb && k.pb.rastoroni, 'Orc Rastoroni: o token ganha a barra Frenesi (6 de 20) e o estado do painel — ' + j([b, k.pb]));
  ok(/Rastoroni: Frenesi \(Orc Rastoroni\)\. O painel abre no turno dele\./.test(await avisos()), 'o aviso diz o que mudou');
  await page.locator('.toast', { hasText: 'O painel abre no turno dele' }).locator('button', { hasText: 'Desfazer' }).click(); await w(250);
  k = await tok(ids.rast);
  ok(!(await barraPb(ids.rast)) && !k.pb, 'Desfazer: o token volta sem a barra');
  await selecionar(ids.rast); await w(200);
  await page.locator('#pb-escolher').selectOption('rastoroni'); await w(250);
  await selecionar(ids.kare); await w(250);
  await page.locator('#pb-escolher').selectOption('danca'); await w(250);
  b = await barraPb(ids.kare);
  ok(b && b.n === 'Compasso' && b.v === 0 && b.m === 10 && b.lo === 10, 'Karê Dançarina: o Compasso (de −10 a +10, começa em 0) — ' + j(b));
  await foto('l44-cenas-escolher');
  await selecionar(ids.band); await w(250);
  await page.locator('#pb-escolher').selectOption('samurai'); await w(250);
  await page.locator('#pb-escolher').selectOption(''); await w(250);
  ok(!(await barraPb(ids.band)) && !(await tok(ids.band)).pb && /Bandido ficou sem barra especial/.test(await avisos()), '"Nenhuma" tira a barra especial');

  /* ---------- os selos ---------- */
  await ev(() => __tc.UI.renderAll()); await w(250);
  const selos = await ev(() => { const o = {}; for (const [k, v] of __tc.PainelBarras._selos()) o[k] = v.partes.map(p => p.id + ':' + p.n); return o; });
  ok(j(selos[ids.rast]) === j(['rastoroni:6']) && j(selos[ids.kare]) === j(['danca:0']) && !selos[ids.band], 'o selo no token de quem tem barra (o Bandido não tem) — ' + j(selos));
  ok((await ev(() => __tc.PainelBarras._hits().length)) === 2, 'os dois selos desenhados no mapa (e clicáveis)');
  ok((await page.locator('#pbHost .pb').count()) === 0, 'fora do combate, nenhum painel aberto');

  /* ---------- o combate ---------- */
  await ev(ids => { const { Act, Store } = __tc; Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.cur = null; }, 'Limpar'); Act.turnAdd([ids.rast, ids.kare, ids.band].map(id => Store.get('tokens', id)));
    Store.S.prefs.barrinhas = { combate: false, rodada: false, vez: true }; }, ids);
  await ev(() => __tc.UI.openTab('turn')); await w(250);
  ok(await page.locator('#pb-ligado').isChecked(), 'na aba Turnos, "Painel de barras: Ligado"');
  await page.locator('#turnOnOff').click(); await w(500);
  ok(j(await quem()) === j(['Rastoroni NPC']), 'Iniciar: na vez do Rastoroni, o painel dele abre — ' + j(await quem()));
  ok((await page.locator('.modal').count()) === 0, 'e a tela das barrinhas não abre (ele tem painel)');
  await foto('l44-cenas-npc');
  await page.locator('#pbHost .pb-chip', { hasText: 'Golpe sofrido' }).click(); await w(250);
  ok((await barraPb(ids.rast)).v === 7, '"Golpe sofrido": o Frenesi vai a 7, no token');
  ok(/Desfazer/.test(await page.locator('#pbHost .pb-rodape').innerText()), 'o painel ganha o Desfazer');
  await page.locator('#pbHost [data-a="__desfazer"]').click(); await w(250);
  ok((await barraPb(ids.rast)).v === 6, 'Desfazer: volta a 6');
  await page.locator('#turnNext').click(); await w(500);
  ok(j(await quem()) === j(['Karênie NPC']), 'a vez da Karênie: o painel dela (o do Rastoroni fecha) — ' + j(await quem()));
  ok((await page.locator('.modal').count()) === 0, '(sem as barrinhas)');
  await page.locator('#turnNext').click(); await w(500);
  ok((await page.locator('#pbHost .pb:not(.moeda)').count()) === 0, 'a vez do Bandido: nenhum painel');
  ok((await page.locator('.modal').count()) === 1, 'e a tela das barrinhas abre na vez dele (ele não tem painel)');
  await page.keyboard.press('Escape'); await w(250);
  // um clique no selo do Rastoroni abre o painel dele
  await ev(() => __tc.UI.renderAll()); await w(250);
  const hr = (await ev(() => __tc.PainelBarras._hits())).find(h => h.tok === ids.rast);
  const ponto = await ev(h => { const [x, y] = __tc.Render.toScreen(h.x + h.w / 2, h.y + h.h / 2); const r = document.getElementById('cv').getBoundingClientRect(); return [r.left + x, r.top + y]; }, hr);
  await page.mouse.click(ponto[0], ponto[1]); await w(350);
  ok(j(await quem()) === j(['Rastoroni NPC']), 'um clique no selo do Rastoroni abre o painel dele — ' + j(await quem()));
  await foto('l44-cenas-selo');

  /* ---------- encerrar: o fim de cada barra ---------- */
  await ev(ids => __tc.Store.tx('Mexer', () => { for (const [id, v] of [[ids.rast, 15], [ids.kare, -4]]) { const t = __tc.Store.get('tokens', id); __tc.Store.upd('tokens', id, { bars: t.bars.map(b => b.ref && b.ref.startsWith('pb:') ? Object.assign({}, b, { v }) : b) }); } }), ids); await w(250);
  await ev(() => __tc.UI.openTab('turn')); await w(200);
  await page.locator('#turnOnOff').click(); await w(400);
  ok((await barraPb(ids.rast)).v === 6 && (await barraPb(ids.kare)).v === 0, 'Encerrar: o Frenesi (15) volta a 6, o Compasso (−4) a 0 — ' + j([(await barraPb(ids.rast)).v, (await barraPb(ids.kare)).v]));
  const av = await avisos();
  ok(/Fim do combate no painel de barras: 2 personagens\./.test(av), 'o aviso do fim — ' + av);
  await page.locator('.toast', { hasText: 'Fim do combate no painel' }).locator('button', { hasText: 'Desfazer' }).click(); await w(300);
  ok((await barraPb(ids.rast)).v === 15 && (await barraPb(ids.kare)).v === -4, 'Desfazer: as duas voltam (15 e −4)');
  ok((await page.locator('#pbHost .pb').count()) === 0, 'fora do combate, o painel fecha');

  /* ---------- o interruptor ---------- */
  await page.locator('.sw', { has: page.locator('#pb-ligado') }).click(); await w(300);
  ok(await ev(() => __tc.Store.S.prefs.painelBarras === false && !__tc.PainelBarras.ligado() && __tc.PainelBarras._selos().size === 0), 'desligado: sem selos');
  ok(/Painel de barras desligado para a mesa/.test(await avisos()), 'o aviso: "Painel de barras desligado para a mesa."');
  await page.locator('#turnOnOff').click(); await w(500);
  ok((await page.locator('#pbHost .pb').count()) === 0, 'desligado: na vez do Rastoroni, nenhum painel');
  ok((await page.locator('.modal').count()) === 1, 'e as barrinhas voltam a abrir na vez dele');
  await page.keyboard.press('Escape'); await w(250);
  await selecionar(ids.rast); await w(250);
  ok((await page.locator('#pb-escolher').count()) === 0, 'e o token não mostra a seção do painel');
  await ev(() => __tc.UI.openTab('turn')); await w(200);
  await page.locator('.sw', { has: page.locator('#pb-ligado') }).click(); await w(400);
  ok(await ev(() => __tc.Store.S.prefs.painelBarras === true) && j(await quem()) === j(['Rastoroni NPC']), 'ligado de novo, no meio do combate: o painel do NPC da vez volta');
  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 4).join(' | '));
  await t.close();

  /* ---------- no celular ---------- */
  t = await open({ w: 390, h: 844 }); page = t.page;
  const id2 = await page.evaluate(() => { const { Store, newToken, Act } = __tc, sc = Store.scene(); const a = newToken(sc, 3 * sc.cell, 3 * sc.cell, { name: 'Rastoroni' });
    Store.tx('Criar', () => Store.add('tokens', a)); Act.turnPatch(x => { x.list = []; x.on = false; x.round = 1; x.cur = null; }, 'Limpar'); Act.turnAdd([Store.get('tokens', a.id)]); return a.id; });
  await page.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, id2); await page.waitForTimeout(300);
  await page.locator('#pb-escolher').selectOption('samurai'); await page.waitForTimeout(250);
  await page.evaluate(() => { __tc.UI.openTab('turn'); }); await page.waitForTimeout(250);
  await page.locator('#turnOnOff').click(); await page.waitForTimeout(500);
  if (await page.evaluate(() => __tc.App.sideOpen)) { await page.locator('#panelBtn').click(); await page.waitForTimeout(300); }
  const caixa = await page.locator('#pbHost .pb:not(.moeda)').boundingBox(), palco = await page.locator('#stage').boundingBox();
  ok(caixa && palco && caixa.width >= palco.width - 20 && caixa.x >= palco.x && caixa.x + caixa.width <= palco.x + palco.width && Math.abs(caixa.y + caixa.height - (palco.y + palco.height)) < 2 && caixa.height <= 844 * 0.63,
    'no celular, o painel é uma gaveta embaixo, da largura do mapa (até 62% da altura) — ' + j([caixa, palco]));
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'sem rolagem para o lado');
  ok(await page.evaluate(() => !document.getElementById('hud').offsetParent && !document.querySelector('.dock .foot').offsetParent && !!document.querySelector('#toasts .toast')), 'com a gaveta aberta, a faixa do token e a dica saem da base (os avisos ficam)');
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'l44-cenas-celular.png') }); }
  ok(t.errs.length === 0, 'sem erros no console (celular): ' + t.errs.slice(0, 4).join(' | '));
  await t.close();

  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
