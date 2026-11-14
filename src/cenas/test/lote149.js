// Bateria do lote 149 (as Cenas): (1) o "Gerar o interior" virou a aba Interior do "Gerar um lugar…" — pela Entrada de
// um prédio, a janela abre nessa aba com o prédio, o estilo, a semente e a hora da cena de fora; a cena sai dentro dela,
// com a Saída, e a Entrada fica ligada; pelo menu, a aba escolhe o prédio e o tamanho. (2) A aba Guardas do painel da
// direita (só o mestre): a lista, os botões de todos, os cones para os jogadores e criar guarda.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1500, h: 950 });
  const p = t.page, w = ms => p.waitForTimeout(ms);
  // (1) a Entrada de uma taverna nórdica, de noite
  await p.evaluate(() => { const u = __tc, sc = u.newScene('Fora'); sc.tone = 'noite'; u.Store.addScene(sc); u.Persist.scene(sc.id); u.UI.switchScene(sc.id); const tk = u.Props.novo(u.Store.scene(), 'entrada', 6 * 64, 6 * 64, 1, false); tk.gera = { t: 'taverna', w: 6, h: 5, p: 's', f: 'ret', e: 'nordico', s: 77 }; u.Store.tx('x', () => u.Store.add('tokens', tk)); window.__tk = tk.id; u.Interior.abrir(u.Store.get('tokens', tk.id)); });
  await w(800);
  ok(await p.locator('.modal-t').innerText() === 'Gerar um lugar' && await p.locator('#ger-lugar .seg-b.on').innerText() === 'Interior', 'a Entrada abre o "Gerar um lugar…" na aba Interior');
  ok(await p.locator('#int-tipo .seg-b.on').innerText() === 'Taverna' && await p.locator('#int-tam').count() === 0 && await p.locator('#ger-est .seg-b.on').innerText() === 'Nórdico' && await p.locator('#ger-hora .seg-b.on').innerText() === 'Noite' && await p.inputValue('#ger-semente') === '77', 'com o prédio (o tipo, as medidas), o estilo, a hora da cena de fora e a semente');
  ok(await p.inputValue('#ger-nome') === 'Taverna — por dentro' && /^\d+ salas? · \d+ móveis · 12 × 10 quadrados\.$/.test(await p.locator('#ger-resumo').innerText()), 'o nome e o resumo — ' + await p.locator('#ger-resumo').innerText());
  await p.locator('.modal-a .btn.primary').click(); await w(2500);
  const r1 = await p.evaluate(() => { const u = __tc, S = u.Store.S, sc = u.Store.scene(), fora = Object.values(S.scenes).find(x => x.name === 'Fora'), tk = fora.tokens.find(x => x.id === window.__tk); return { nome: sc.name, tone: sc.tone, saida: sc.tokens.some(x => x.prop === 'saida' && x.cena === fora.id), ligada: tk.cena === sc.id }; });
  ok(r1.nome === 'Taverna — por dentro' && r1.tone === 'noite' && r1.saida && r1.ligada, 'a cena sai dentro da de fora, de noite, com a Saída, e a Entrada fica ligada — ' + JSON.stringify(r1));
  // pelo menu: o tipo e o tamanho
  await p.evaluate(() => __tc.Gerador.abrir('interior')); await w(700);
  await p.locator('#int-tipo .seg-b', { hasText: 'Templo' }).click(); await w(300);
  ok(await p.locator('#int-tam').count() === 1 && /^2 salas/.test(await p.locator('#ger-resumo').innerText()) && await p.inputValue('#ger-nome') === 'Templo — por dentro', 'pelo menu: o tipo e o tamanho; o Templo, com a nave e a sacristia');
  await p.locator('.modal-a .btn.primary').click(); await w(2500);
  ok(await p.evaluate(() => { const sc = __tc.Store.scene(); return sc.name === 'Templo — por dentro' && !sc.tokens.some(x => x.prop === 'saida'); }), 'sem Entrada, a cena sai solta (sem a Saída)');
  // (2) a aba Guardas
  await p.evaluate(async () => { const F = __tc.Furtividade, L = F.LUGARES.casarao; const pl = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'documento' }, { seed: 7, estilo: 'comum' }); const sc = await L.criar(pl, 'Casarão', { hora: 'noite' }); __tc.UI.switchScene(sc.id); __tc.Store.S.players = [{ id: 'j1', name: 'Dain' }, { id: 'j2', name: 'Lia' }]; __tc.UI.refresh(); });
  await w(800);
  ok(await p.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map(b => b.textContent).join(',')) === 'Seleção,Turnos,Guardas,Efeitos,Cena,Jogadores', 'a aba Guardas, ao lado de Turnos');
  await p.click('#tab-guard'); await w(400);
  ok(await p.locator('.gd-li').count() === 6, 'a lista: os 6 guardas do casarão');
  await p.click('#gd-desconf'); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene()).every(t => t.alerta === 'desconfiado')), 'todos desconfiados');
  await p.locator('#gd-ver-c-j1').check({ force: true }); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene()).every(t => t.ronda.ver && t.ronda.ver.para.join() === 'j1' && !t.ronda.ver.rotas.length)), 'os cones de todos à vista de um jogador');
  await p.locator('#gd-ver-r-j1').check({ force: true }); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene()).every(t => t.ronda.ver.rotas.join() === 'j1')), 'a rota para o mesmo jogador');
  await p.click('#gd-ver-fim'); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene()).every(t => !t.ronda.ver)), '"Esconder de todos"');
  await p.click('#gd-novo'); await w(300);
  ok(await p.evaluate(() => { const g = __tc.Rondas.guardas(__tc.Store.scene()); return g.length === 7 && __tc.App.tool === 'ronda' && g[6].name === 'Guarda 7'; }), '"Novo guarda": no meio da tela, já desenhando a ronda');
  await p.keyboard.press('Escape'); await w(200);
  await p.locator('.gd-est').first().selectOption('alerta'); await w(300);
  ok(await p.evaluate(() => __tc.Rondas.guardas(__tc.Store.scene())[0].alerta === 'alerta'), 'o estado de um guarda, pela lista');
  await p.locator('.gd-nome').nth(2).click(); await w(300);
  ok(await p.evaluate(() => __tc.App.sel.length === 1 && __tc.Rondas.ehGuarda(__tc.Store.get('tokens', __tc.App.sel[0].id))), 'o nome seleciona o guarda');
  ok(!t.errs.filter(e => !/favicon/.test(e)).length, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
