// Lote 79 (sem mesa): as Tabelas base em abas (Níveis e pontos · Tiers · Corrupção · Tropas); o level máximo (corta ou
// estende a tabela; com o Inicial e o Por level de sempre, o que foi mudado à mão fica); as fichas acima do máximo
// aparecem numa janela antes e baixam junto, com Desfazer; a tabela compacta, com o ganho de cada level; a tabela
// padrão vai até o 30.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start();
  const d = await t.device({ name: 'ficha', w: 1300, h: 900, jogando: true, fechado: true });
  const P = d.page;
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const toast = txt => P.locator('.toast', { hasText: txt });
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await P.waitForTimeout(1500);
  ok(await P.evaluate(() => S.cfg.niveis.length === 30 && S.cfg.niveis[29].pts === 277), 'a tabela padrão vai até o level 30 (277 pontos)');
  // uma mesa de antes, com 50 levels, e uma ficha no level 40
  await P.evaluate(() => {
    S.cfg.niveis = []; for (let l = 1; l <= 50; l++) S.cfg.niveis.push({ lvl: l, pts: l === 50 ? 445 : 45 + (l - 1) * 8 });
    S.cfg.niveis[4].pts = 80;                                       // (o level 5 mudado à mão)
    const a = S.personagens[0]; a.nome = 'Velho'; a.level = 40; a.tier = 'C'; save(); render();
  });
  await P.evaluate(() => abrirCfg()); await P.waitForTimeout(300);
  ok(j(await P.locator('.cfgaba').allInnerTexts()) === j(['Níveis e pontos', 'Tiers', 'Corrupção', 'Tropas']), 'as abas das Tabelas base');
  ok(await P.locator('[data-cfgaba="niveis"]').getAttribute('aria-selected') === 'true' && await P.locator('#ptsMax').inputValue() === '50', 'abre em Níveis e pontos, com o level máximo de agora (50)');
  ok(await P.locator('#lvlCols table.lvlcol').count() === 5 && await P.locator('[data-cng="4"]').innerText() === '+11' && await P.locator('[data-cng="5"]').innerText() === '+5', 'a tabela em colunas de 10, com o ganho de cada level (o 5 mudado à mão: +11, e o 6: +5)');
  await foto('l79-niveis');
  // o level máximo: 30
  await P.locator('#ptsMax').fill('30'); await P.locator('#ptsAplicar').click(); await P.waitForTimeout(300);
  ok(await P.locator('.modal[data-lvlmax]').count() === 1 && /Velho/.test(await P.locator('.modal[data-lvlmax]').innerText()) && /level 40 → 30/.test(await P.locator('.modal[data-lvlmax]').innerText()), 'antes de cortar, a janela lista quem está acima do 30 (o Velho, no 40)');
  ok(await P.evaluate(() => S.cfg.niveis.length === 50 && S.personagens[0].level === 40), '(nada muda antes de confirmar)');
  await P.locator('#lvlmaxSim').click(); await P.waitForTimeout(400);
  ok(await P.evaluate(() => S.cfg.niveis.length === 30 && S.cfg.niveis[4].pts === 80 && S.cfg.niveis[29].pts === 277 && S.personagens[0].level === 30), 'a tabela vai até o 30, o level mudado à mão fica, e o Velho baixa para o 30');
  ok(await toast('1 ficha baixou para o level 30').count() === 1, 'o aviso diz quem baixou, com Desfazer');
  await foto('l79-niveis-30');
  await toast('1 ficha baixou').locator('button').click(); await P.waitForTimeout(400);
  ok(await P.evaluate(() => S.cfg.niveis.length === 50 && S.personagens[0].level === 40), 'Desfazer volta a tabela e o level do Velho');
  // cancelar não muda nada
  await P.locator('#ptsMax').fill('20'); await P.locator('#ptsAplicar').click(); await P.waitForTimeout(300);
  await P.locator('#lvlmaxNao').click(); await P.waitForTimeout(200);
  ok(await P.evaluate(() => S.cfg.niveis.length === 50 && S.personagens[0].level === 40), 'Cancelar na janela: nada muda');
  // estender: sem fichas acima, segue o Por level a partir do último
  await P.evaluate(() => { S.personagens[0].level = 3; S.cfg.niveis = S.cfg.niveis.slice(0, 30); save(); const v = document.querySelector('.modal[data-cfg]'); v.remove(); abrirCfg(); }); await P.waitForTimeout(200);
  await P.locator('#ptsMax').fill('32'); await P.locator('#ptsAplicar').click(); await P.waitForTimeout(300);
  ok(await P.evaluate(() => S.cfg.niveis.length === 32 && S.cfg.niveis[30].pts === 285 && S.cfg.niveis[31].pts === 293), 'aumentar o máximo para 32 acrescenta os levels seguindo o +8');
  // mudar um level à mão: o ganho acompanha
  await P.locator('[data-cn="9"]').fill('130'); await P.locator('[data-cn="9"]').press('Tab'); await P.waitForTimeout(200);
  ok(await P.locator('[data-cng="9"]').innerText() === '+21' && await P.locator('[data-cng="10"]').innerText() === '−5', 'um level mudado à mão: o ganho dele e o do seguinte acompanham (+21, −5)');
  // as outras abas
  await P.locator('[data-cfgaba="tiers"]').click(); await P.waitForTimeout(200);
  ok(await P.locator('[data-cm]').count() === 6 && await P.locator('#cfgArred').isVisible(), 'Tiers: os multiplicadores, os percentuais e o arredondamento');
  await foto('l79-tiers');
  await P.locator('[data-cfgaba="tropas"]').click(); await P.waitForTimeout(200);
  const larg = await P.evaluate(() => { const i = document.querySelector('[data-trceqn]'); return i ? i.getBoundingClientRect().width : 0; });
  ok(larg >= 150, 'Tropas: os nomes dos equipamentos cabem (o campo tem ' + Math.round(larg) + ' px)');
  await foto('l79-tropas');
  await P.locator('[data-cfgaba="corr"]').click(); await P.waitForTimeout(200);
  ok(await P.locator('[data-corrcorte]').count() > 0, 'Corrupção: os estágios');
  await P.evaluate(() => { document.querySelector('.modal[data-cfg]').remove(); abrirCfg(); }); await P.waitForTimeout(200);
  ok(await P.locator('[data-cfgaba="corr"]').getAttribute('aria-selected') === 'true', 'reaberta, a janela volta à aba que estava');
  // restaurar padrão (sem a caixa do navegador; com Desfazer)
  await P.locator('[data-cfgaba="niveis"]').click(); await P.waitForTimeout(200);
  await P.locator('#resetLvl').click(); await P.waitForTimeout(300);
  ok(await P.evaluate(() => S.cfg.niveis.length === 30 && S.cfg.niveis[9].pts === 117) && await toast('A tabela voltou à padrão').count() === 1, 'Restaurar padrão: 30 levels, 45 + 8, com Desfazer');
  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
