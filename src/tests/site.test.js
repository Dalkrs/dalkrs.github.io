// A casca do site: abas, sistemas embutidos, marca nova e os dados antigos do Rolador.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const legado = JSON.stringify({ version: 1, activeHistoryId: 'h_teste', mode: 'fixa', lastBackupAt: null, tables: [], trash: [],
  histories: [{ id: 'h_teste', name: 'Sessão antiga do Bruno', createdAt: 1790000000000, updatedAt: 1790000100000, entries: [
    { id: 'r_um', type: 'roll', mode: 'fixa', title: 'Ataque do goblin', description: '', color: 'vermelho', pinned: false, createdAt: 1790000050000, atributo: 60, fixa: 20, die: 40, dieValue: 8, total: 28, check: null }] }] });
(async () => {
  const t = await start();
  const w = (p, ms) => p.waitForTimeout(ms || 300);

  // 1. visitante novo: cai em Cenas; todas as abas abrem sem erro
  {
    const { page } = await t.device({ name: 'novo' });
    await page.goto(t.base, { waitUntil: 'load' }); await w(page, 1500);
    ok(await page.title() === 'Cenas · Tiny Cats', 'visitante novo abre em Cenas: ' + await page.title());
    ok((await page.locator('.brand').innerText()).trim() === 'Tiny Cats', 'marca Tiny Cats na barra');
    ok(await page.locator('.tab').count() === 4, 'quatro abas');
    const nomes = await page.locator('.tab').allInnerTexts();
    ok(nomes.join('|') === 'Cenas|Fichas|Árvore|Rolador', 'nomes das abas: ' + nomes.join('|'));
    const esperado = { cenas: /Cenas · Tiny Cats/, fichas: /Fichas · Tiny Cats/, arvore: /Árvore de Habilidades · Tiny Cats/, rolador: /Rolador · Tiny Cats/ };
    for (const id of ['cenas', 'fichas', 'arvore', 'rolador']) {
      await page.locator('#tab-' + id).click(); await w(page, 1300);
      ok(page.url().endsWith('#/' + id), `aba ${id}: endereço com #/${id}`);
      ok(await page.locator('#tab-' + id).getAttribute('aria-selected') === 'true', `aba ${id} marcada`);
      const f = page.frame({ url: new RegExp('/' + id + '/') });
      ok(!!f, `aba ${id}: moldura criada`);
      if (!f) continue;
      ok(esperado[id].test(await f.title()), `aba ${id}: título da página — ${await f.title()}`);
      ok(await page.locator('#f-' + id).isVisible(), `aba ${id}: moldura visível`);
      const outras = await page.locator('iframe:visible').count();
      ok(outras === 1, `aba ${id}: só uma moldura visível (${outras})`);
      const texto = await f.locator('body').innerText();
      ok(!/urgm|lirian/i.test(texto), `aba ${id}: sem o nome antigo no que aparece`);
      ok(texto.length > 80, `aba ${id}: a página desenhou conteúdo`);
    }
    ok(await page.locator('iframe').count() === 4, 'as quatro molduras continuam vivas depois de visitadas');
    // estado preservado ao trocar de aba: escreve no Rolador, sai e volta
    const fr = page.frame({ url: /\/rolador\// });
    await fr.locator('#fTitle').fill('Teste de permanência');
    await page.locator('#tab-cenas').click(); await w(page, 300);
    await page.locator('#tab-rolador').click(); await w(page, 300);
    ok(await fr.locator('#fTitle').inputValue() === 'Teste de permanência', 'o Rolador mantém o que estava digitado ao trocar de aba');
    // a aba lembrada na próxima visita
    await page.goto(t.base, { waitUntil: 'load' }); await w(page, 1200);
    ok(await page.title() === 'Rolador · Tiny Cats', 'a última aba é lembrada: ' + await page.title());
    ok((await page.locator('#pop').getAttribute('href')) === 'rolador/', 'o botão de outra janela aponta para o sistema aberto');
    // endereço direto de um sistema
    await page.goto(t.base + '#/arvore', { waitUntil: 'load' }); await w(page, 1200);
    ok(await page.title() === 'Árvore · Tiny Cats', 'endereço com #/arvore abre a Árvore');
    await page.context().close();
  }

  // 2. quem já usava o Rolador neste endereço: cai nele, com o histórico antigo
  {
    const { page } = await t.device({ name: 'bruno', seed: { 'rolador-urgm:dados:v1': legado } });
    await page.goto(t.base, { waitUntil: 'load' }); await w(page, 1800);
    ok(await page.title() === 'Rolador · Tiny Cats', 'quem tem dados do Rolador abre nele: ' + await page.title());
    const fr = page.frame({ url: /\/rolador\// });
    ok(!!fr, 'moldura do Rolador');
    if (fr) {
      ok((await fr.locator('#histName').innerText()).includes('Sessão antiga do Bruno'), 'o histórico antigo aparece');
      ok((await fr.locator('#log').innerText()).includes('Ataque do goblin'), 'a rolagem antiga aparece no registro');
      // rolar de novo continua funcionando e grava na mesma chave
      await fr.locator('#fAtr').fill('60'); await fr.locator('#fFixa').fill('20'); await fr.locator('#rollBtn').click(); await w(page, 500);
      const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem('rolador-urgm:dados:v1')).histories[0].entries.length);
      ok(salvo === 2, 'a rolagem nova entra no mesmo histórico (' + salvo + ' entradas)');
    }
    await page.context().close();
  }

  // 3. tela estreita e tema claro: a barra não estoura
  for (const [wd, theme] of [[400, 'dark'], [1100, 'light']]) {
    const { page } = await t.device({ name: 'tela' + wd, w: wd, h: 800, theme });
    await page.goto(t.base, { waitUntil: 'load' }); await w(page, 1300);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.bar').scrollWidth <= window.innerWidth + 1);
    ok(fits, `barra cabe em ${wd} px (${theme})`);
    await page.screenshot({ path: `shot-casca-${wd}.png` });
    await page.context().close();
  }

  if (t.errs.length) console.log('ERROS NO CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro no console (' + t.errs.length + ')');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
