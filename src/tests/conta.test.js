// Criar conta pela tela (cada rodada cria UMA conta de teste nova: novo-…@tinycats.test).
const { start, checker } = require('./lib');
const { contas } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  const { page } = await t.device({ name: 'novo', w: 1000, h: 760, theme: 'light' });
  const w = ms => page.waitForTimeout(ms);
  await page.goto(t.base, { waitUntil: 'load' }); await w(1200);
  await page.locator('#btnConta').click(); await page.locator('#c-novo').click(); await w(200);
  ok(await page.locator('#c-nome').isVisible(), 'a janela troca para "Criar conta" e pede o nome');
  // e-mail que já existe
  await page.locator('#c-nome').fill('Repetido'); await page.locator('#c-email').fill(c.mestre); await page.locator('#c-senha').fill('uma-senha-qualquer'); await page.locator('#c-ok').click(); await w(3500);
  ok((await page.locator('#c-erro').innerText()).includes('Já existe uma conta'), 'e-mail repetido: ' + await page.locator('#c-erro').innerText());
  // senha curta: o navegador nem envia
  await page.locator('#c-senha').fill('123'); await page.locator('#c-ok').click(); await w(400);
  ok(await page.locator('#c-senha').evaluate(e => !e.validity.valid) && await page.locator('#f-conta').isVisible(), 'senha curta não passa');
  // conta nova
  const email = 'novo-' + Date.now().toString(36) + '@tinycats.test';
  await page.locator('#c-nome').fill('Gata Nova'); await page.locator('#c-email').fill(email); await page.locator('#c-senha').fill('senha-de-teste-9'); await page.locator('#c-ok').click();
  await page.locator('#m-nome').waitFor({ timeout: 20000 });
  ok(true, 'conta criada: entra direto e abre a janela de mesas');
  const vazia = await page.locator('#m-lista').getByText('ainda não participa').waitFor({ timeout: 10000 }).then(() => true, () => false);
  ok(vazia, 'conta nova não tem mesas: ' + await page.locator('#m-lista').innerText());
  ok(await page.locator('#m-meu').inputValue() === 'Gata Nova', 'o nome escolhido já vem preenchido para entrar numa mesa');
  await page.screenshot({ path: 'shot-mesas-claro.png' });
  await page.locator('dialog .pe .btn').click(); await w(300);
  ok((await page.locator('#btnConta').innerText()).trim() === 'Escolher mesa', 'sem mesa, a barra mostra "Escolher mesa"');
  await page.reload({ waitUntil: 'load' }); await w(2500);
  ok((await page.locator('#btnConta').innerText()).trim() === 'Escolher mesa', 'a sessão continua depois de recarregar');
  await page.locator('#btnConta').click(); await w(300);
  ok((await page.locator('#menu').innerText()).includes(email), 'o menu mostra o e-mail da conta');
  await page.locator('#menu .lk', { hasText: 'Sair da conta' }).click(); await w(1500);
  ok((await page.locator('#btnConta').innerText()).trim() === 'Entrar', 'sair da conta');
  const fora = t.errs.filter(e => !/status of (400|401|409)/.test(e));
  if (fora.length) console.log(fora.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
