// Cenas, lote 26: as ferramentas em grupos e as abas da direita como o mestre encontra (sem a marca dos testes).
//   · o trilho: Jogo, Peças, Desenho (um botão só, com a lista) e Mapa;
//   · no token: barras e condições abertas; Turnos e os "Ajustes do token" fechados, com o resumo no título; as
//     condições: só as ativas, e a lista no botão "Condição";
//   · a aba Cena: os blocos fechados com o resumo (menos o Ambiente), vários abertos ao mesmo tempo;
//   · as teclas 1 a 5 abrem as abas.
const { open } = require('./lib');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FALHOU: ' + m); } };
(async () => {
  const o = await open({ fechado: true, wait: 1400 });
  const P = o.page, E = (f, a) => P.evaluate(f, a), w = ms => P.waitForTimeout(ms);
  const abertos = () => E(() => [...document.querySelectorAll('.tab-body > details.sec')].map(d => d.id + (d.open ? '+' : '-')).join(' '));
  try {
    ok(await E(() => [...document.querySelectorAll('.rail-g')].map(x => x.textContent).join()) === 'Jogo,Peças,Desenho,Mapa,Mestre', 'o trilho em cinco grupos com nome (o Mestre, do lote 47)');
    ok(await E(() => [...document.querySelectorAll('.rail > .tool, .rail .tool.junto')].map(b => b.id.replace('tool-', '')).join()) === 'select,pan,ruler,ping,token,obj,fx,grupo-desenho,wall,light,fog,terrain', 'as ferramentas, com o desenho num botão só');
    await P.click('#tool-grupo-desenho'); await w(100);
    ok(await P.locator('.rail-lista').isVisible() && (await P.locator('.rail-lista').innerText()).replace(/\s+/g, ' ').includes('Retângulo R'), 'o botão do Desenho abre a lista com os nomes e as teclas');
    await P.click('#tool-rect'); await w(100);
    ok(await E(() => __tc.App.tool) === 'rect' && !(await P.locator('.rail-lista').isVisible()) && await E(() => document.querySelector('#tool-grupo-desenho').classList.contains('on')), 'escolher na lista: a ferramenta vale, a lista fecha e o botão fica aceso');
    await P.keyboard.press('Escape'); await P.keyboard.press('Escape'); await w(80);

    // o token selecionado (o da cena de exemplo)
    await E(() => { const t = __tc.Store.scene().tokens.find(x => !x.prop); __tc.App.sel = [{ c: 'tokens', id: t.id }]; __tc.UI.openTab('sel'); }); await w(200);
    const a1 = await abertos();
    ok(/s-bars\+/.test(a1) && /s-cond\+/.test(a1) && /s-turn-/.test(a1) && /s-id-/.test(a1) && /s-gm-/.test(a1) && /s-vis-/.test(a1), 'no token: barras e condições abertas; Turnos, Identidade, Visão e Só do mestre fechados — ' + a1);
    ok(await E(() => { const b = [...document.querySelectorAll('.tab-body > *')].map(x => x.id || x.className); return b.indexOf('s-bars') < b.indexOf('sec-divisa') && b.indexOf('sec-divisa') < b.indexOf('s-id'); }), 'a ordem: o que se usa jogando, a divisa "Ajustes do token" e os ajustes');
    ok(/tamanho/.test(await P.locator('#s-id .sec-res').innerText()) && /turno/.test(await P.locator('#s-turn .sec-res').innerText()), 'o resumo no título dos fechados');
    ok(await P.locator('#cg-list').count() === 0 && await P.locator('#cg-abrir').isVisible(), 'as condições: a lista recolhida no botão');
    await P.click('#cg-abrir'); await w(150);
    ok(await P.locator('#cg-list').isVisible() && await E(() => document.activeElement.id) === 'cg-busca', '"Condição" abre a lista, com o cursor na busca');
    await P.locator('#cg-list .chip', { hasText: 'Sangrando' }).first().click(); await w(150);
    ok(await P.locator('#cg-list').isVisible(), 'pôr uma condição: a lista continua aberta');
    await P.click('#cg-abrir'); await w(120);
    ok(await P.locator('#cg-list').count() === 0 && /Sangrando/.test(await P.locator('#s-cond').innerText()), '"Fechar a lista": à vista, só as ativas');
    await P.click('#s-id summary'); await w(80);
    ok(await P.locator('#tk-name').isVisible() && !(await P.locator('#s-id .sec-res').isVisible()), 'abrir a Identidade: os campos aparecem e o resumo some');

    // a aba Cena e as teclas
    await E(() => { __tc.App.sel = []; document.activeElement.blur(); }); await P.click('#cv', { position: { x: 20, y: 20 } }).catch(() => {});
    await P.keyboard.press('4'); await w(200);
    ok(await E(() => __tc.App.tab) === 'scene', 'a tecla 4 abre a aba Cena');
    ok(await abertos() === 'c-scene- c-bg- c-grid- c-amb+ c-light- c-momentos- c-relevo- c-feridos- c-perm-', 'na aba Cena, só o Ambiente aberto: ' + await abertos());
    await P.click('#c-bg summary'); await P.click('#c-light summary'); await w(120);
    ok(/c-bg\+/.test(await abertos()) && /c-light\+/.test(await abertos()) && /c-amb\+/.test(await abertos()), 'vários blocos abertos ao mesmo tempo');
    await P.keyboard.press('2'); await w(150);
    ok(await E(() => __tc.App.tab) === 'turn', 'a tecla 2 abre Turnos');
    await P.click('#moreBtn'); await w(80); await P.locator('.menu-i', { hasText: 'Atalhos de teclado' }).click(); await w(150);
    ok(/1 a 5/.test(await P.locator('.keys').innerText()), 'as teclas estão na lista de atalhos');
  } catch (e) { ok(false, 'parou: ' + String(e && e.message || e).split('\n')[0]); }
  if (o.errs.length) console.log(o.errs.slice(0, 8).join('\n'));
  ok(o.errs.length === 0, 'sem erros no console');
  await o.close();
  console.log(fail ? `${pass} verificações passaram, ${fail} falharam` : `${pass} verificações passaram`);
  process.exit(fail ? 1 : 0);
})();
