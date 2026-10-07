// Confere o site NO AR (pelo proxy do ambiente): abas, conta, mesa e mesa ao vivo. Uso: node vivo.js
const { chromium } = (() => { for (const p of ['playwright', '/opt/node-tools/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* tenta o próximo */ } } throw new Error('Playwright não encontrado'); })();
const { contas } = require('./contas');
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const browser = await chromium.launch(proxy ? { proxy: { server: proxy } } : {});
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/WebSocket connection|status of (400|401|409)/.test(m.text())) errs.push('[console] ' + m.text()); });
  const c = contas(), out = {};
  await page.goto((process.argv[2] || 'https://dalkrs.github.io/') + '?t=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2500);
  out.titulo = await page.title();
  // a versão publicada: a casca e versao.json dizem a mesma coisa (senão o aviso de "versão nova" apareceria à toa)
  out.versao = await page.evaluate(async () => {
    const ler = (u, como) => fetch(u, { cache: 'no-store' }).then(r => r[como]()).catch(() => null);
    const casca = ((await ler('./?t=' + Date.now(), 'text') || '').match(/VERSAO = '([^']+)'/) || [])[1] || null;
    const simples = ((await ler('./', 'text') || '').match(/VERSAO = '([^']+)'/) || [])[1] || null;
    const arq = (await ler('versao.json?t=' + Date.now(), 'json') || {}).versao || null;
    if (window.__conferirVersao) await window.__conferirVersao();
    const b = document.getElementById('versaoNova');
    return 'casca ' + casca + (simples !== casca ? ' (sem ?t: ' + simples + ')' : '') + ' · versao.json ' + arq + ' · aviso ' + (b ? (b.hidden ? 'escondido' : 'À MOSTRA') : 'não existe');
  });
  for (const id of ['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador']) {
    await page.locator('#tab-' + id).click(); await page.waitForTimeout(2000);
    const f = page.frame({ url: new RegExp('/' + id + '/') });
    out[id] = f ? await f.title() : 'SEM MOLDURA';
  }
  out.botao = (await page.locator('#btnConta').innerText()).trim();
  await page.locator('#btnConta').click();
  await page.locator('#c-email').fill(c.mestre); await page.locator('#c-senha').fill(c.senha); await page.locator('#c-ok').click();
  await page.locator('#m-nome').waitFor({ timeout: 20000 });
  const nome = 'Conferência ' + Date.now().toString(36);
  await page.locator('#m-nome').fill(nome); await page.locator('#m-criar').click();
  await page.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('dialog[open]').waitFor({ state: 'hidden', timeout: 20000 });
  out.mesa = (await page.locator('#btnConta').innerText()).replace(/\s+/g, ' ').trim();
  await page.locator('#msg').fill('/r 2d6+3'); await page.locator('#msg').press('Enter');
  await page.locator('#feed .rol').first().waitFor({ timeout: 15000 });
  out.rolagem = (await page.locator('#feed .rol').first().innerText()).replace(/\s+/g, ' ');
  // o que entrou com "Dados": as chaves de som e efeito, as contas da ficha na casca, os dados guardados na rolagem e o histórico para o auditor
  out.dados = await page.evaluate(async () => {
    const r = TC.aoVivo.itens.filter(l => l.tipo === 'rolagem').pop(), h = await TC.aoVivo.historico().then(x => x.length + ' no histórico', e => 'histórico: ' + e.message);
    return [document.getElementById('chaveSom') && document.getElementById('chaveEfeito') ? 'chaves de som e efeito' : 'SEM AS CHAVES', TC.rules && TC.rules.calcular ? 'regras da ficha na casca' : 'SEM AS REGRAS',
      r && Array.isArray(r.dados.dd) ? 'dd ' + JSON.stringify(r.dados.dd) : 'SEM dd', h, document.getElementById('dados') ? 'telinha ' + (document.getElementById('dados').hidden ? 'escondida (mesa sem fichas)' : 'à mostra') : 'SEM A TELINHA'].join(' · ');
  });
  // as Cenas, dentro da mesa: guardadas no banco, e a cena vai ao ar quando o mestre manda
  await page.locator('#tab-cenas').click(); await page.waitForTimeout(3500);
  const C = page.frame({ url: /\/cenas\// });
  if (C) {
    if (await C.locator('#tour-skip').count()) { await C.locator('#tour-skip').click(); await page.waitForTimeout(400); }
    if (await C.locator('.modal').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    out.cenas_salvas = (await C.locator('#status').innerText()).trim();
    // o que entrou com "Combate": o pedido de defesa na casca, a conversa nova entre a casca e as Cenas, a ferramenta Terreno e o grupo
    out.combate = [await page.evaluate(() => (typeof TC.aoVivo.pedirDefesa === 'function' && typeof TC.aoVivo.responderDefesa === 'function' ? 'pedido de defesa na casca' : 'SEM O PEDIDO')),
      'conversa v' + await C.evaluate(() => (window.TC && TC.ponte ? TC.ponte.estado.v : '?')), await C.locator('#tool-terrain').count() ? 'ferramenta Terreno' : 'SEM O TERRENO', await C.locator('#sel-grupo').count() ? 'puxar o grupo' : 'SEM O GRUPO',
      await C.evaluate(() => (window.TC && TC.ponte && TC.ponte.registro && typeof TC.ponte.registro.pedir === 'function' ? 'ponte com pedido' : 'PONTE ANTIGA'))].join(' · ');
    out.cenas_no_ar = (await C.locator('#airBtn').innerText()).trim();
    await C.locator('#airBtn').click(); await page.waitForTimeout(300);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await page.waitForTimeout(2500);
    out.cenas_depois = (await C.locator('#airBtn').innerText()).trim();
    out.projecao = await page.evaluate(() => TC.dados.col('documentos').todas().filter(l => l.id.startsWith('cena:pub:')).map(l => l.id + ' ' + l.vis + (l.rev > 0 ? ' gravado' : ' pendente')).sort().join(' · '));
  } else out.cenas_salvas = 'SEM MOLDURA';
  await page.locator('#tab-rolador').click(); await page.waitForTimeout(1500);
  const R = page.frame({ url: /\/rolador\// });
  out.aviso_no_rolador = await R.locator('#mesaDest').innerText();
  await page.locator('#btnConta').click(); await page.locator('#menu .lk', { hasText: 'Apagar esta mesa' }).click();
  await page.locator('#a-nome').fill(nome); await page.locator('dialog .btn.per').click();
  await page.locator('#vivo').waitFor({ state: 'hidden', timeout: 20000 });
  await page.locator('#btnConta').click(); await page.locator('#menu .lk', { hasText: 'Sair da conta' }).click(); await page.waitForTimeout(1200);
  out.fim = (await page.locator('#btnConta').innerText()).trim();
  console.log(JSON.stringify(out, null, 1));
  console.log(errs.length ? 'ERROS:\n' + errs.join('\n') : 'sem erros no console');
  await browser.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
