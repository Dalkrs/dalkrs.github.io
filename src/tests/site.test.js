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
    ok(await page.locator('.tab').count() === 6, 'seis abas');
    const nomes = await page.locator('.tab').allInnerTexts();
    ok(nomes.join('|') === 'Cenas|Mapa-múndi|Acampamento|Fichas|Árvore|Rolador', 'nomes das abas: ' + nomes.join('|'));
    const esperado = { cenas: /Cenas · Tiny Cats/, mundo: /Mapa-múndi · Tiny Cats/, acampamento: /Acampamento · Tiny Cats/, fichas: /Fichas · Tiny Cats/, arvore: /Árvore de Habilidades · Tiny Cats/, rolador: /Rolador · Tiny Cats/ };
    for (const id of ['cenas', 'mundo', 'acampamento', 'fichas', 'arvore', 'rolador']) {
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
    ok(await page.locator('iframe').count() === 6, 'as seis molduras continuam vivas depois de visitadas');
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

  // versão nova publicada com o site aberto: um botão discreto na barra; nada recarrega sozinho
  {
    const fs = require('fs'), path = require('path'), { ROOT } = require('./lib');
    const V = /const VERSAO = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))[1];
    ok(JSON.parse(fs.readFileSync(path.join(ROOT, 'versao.json'), 'utf8')).versao === V, 'versao.json diz a mesma versão da casca (' + V + ')');
    // toda publicação diz o que mudou: a lista de novidades começa pela versão da casca
    const nov = JSON.parse(fs.readFileSync(path.join(ROOT, 'novidades.json'), 'utf8'));
    ok(Array.isArray(nov.versoes) && !!nov.versoes[0] && nov.versoes[0].versao === V && nov.versoes[0].itens.length > 0 && nov.versoes[0].itens.every(i => ['novo', 'melhorou', 'consertado'].includes(i.tipo) && typeof i.texto === 'string' && i.texto.trim().length > 0),
      'novidades.json começa pela versão da casca (' + V + '), com o que mudou nela');
    const { page, ctx } = await t.device({ name: 'versao' });
    await page.goto(t.base, { waitUntil: 'load' }); await w(page, 1300);
    await page.evaluate(() => window.__conferirVersao()); await w(page, 300);
    ok(await page.locator('#versaoNova').isHidden() && await page.locator('.toast').count() === 0, 'com a mesma versão publicada, nenhum aviso');
    // a versão nova publicada traz as novidades dela (e a lista publicada continua com as de antes)
    const NOVA = { versao: '9999.01.01-1', data: '9999-01-01', titulo: 'Teste da versão nova', itens: [
      { tipo: 'consertado', texto: 'Conserto de teste.' }, { tipo: 'novo', mestre: true, texto: 'Coisa nova só do mestre.' }, { tipo: 'melhorou', texto: 'Melhoria de teste.' }] };
    await ctx.route('**/novidades.json*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ versoes: [NOVA, ...nov.versoes] }) }));
    await ctx.route('**/versao.json*', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"versao":"9999.01.01-1"}' }));
    let recarregou = false;
    page.on('framenavigated', f => { if (f === page.mainFrame()) recarregou = true; });
    await page.evaluate(() => window.__conferirVersao()); await w(page, 500);
    ok(await page.locator('#versaoNova').isVisible() && /versão nova/i.test(await page.locator('.toast').last().innerText()), 'publicada outra versão: aparece o botão "Versão nova" na barra, e um aviso que passa');
    await page.evaluate(() => window.__conferirVersao()); await w(page, 900);
    ok(!recarregou && await page.locator('.toast').count() === 1, 'nada recarrega sozinho, e o aviso não se repete para a mesma versão');
    await page.locator('#versaoNova').click(); await w(page, 300);
    ok(/Recarregar para a versão nova\?/.test(await page.locator('#dlg').innerText()), 'o botão pergunta antes de recarregar');
    const naJanela = await page.evaluate(([nova, atual]) => {
      const caixa = document.getElementById('nov-nova');
      return { nova: !!caixa && !!caixa.querySelector(`[data-versao="${nova}"]`), atual: !!caixa && !!caixa.querySelector(`[data-versao="${atual}"]`),
        tipos: caixa ? [...caixa.querySelectorAll('.nov-g')].map(g => g.dataset.tipo).join(',') : '', titulo: caixa ? caixa.querySelector('h3').textContent : '',
        mestre: caixa ? [...caixa.querySelectorAll('li')].filter(li => li.querySelector('.pm')).map(li => li.textContent).join('|') : '' };
    }, [NOVA.versao, V]);
    ok(naJanela.nova && !naJanela.atual && naJanela.titulo === NOVA.titulo, 'a pergunta mostra o que a versão nova traz (e não repete o que esta página já tem): ' + JSON.stringify(naJanela));
    ok(naJanela.tipos === 'novo,melhorou,consertado', 'separado em Novo, Melhorou e Consertado, nessa ordem: ' + naJanela.tipos);
    ok(naJanela.mestre === 'Coisa nova só do mestre.para o mestre', 'o que é só do mestre vem marcado "para o mestre": ' + naJanela.mestre);
    ok(await page.evaluate(() => localStorage.getItem('tinycats:novidades')) === NOVA.versao, 'quem já viu o que a versão nova traz não ganha a bolinha por isso depois de recarregar');
    await page.locator('#dlg button', { hasText: 'Depois' }).click(); await w(page, 300);
    ok(!(await page.locator('#dlg').evaluate(d => d.open)) && !recarregou && await page.locator('#versaoNova').isVisible(), '"Depois" fecha a pergunta, e o botão continua na barra');
    await page.locator('#versaoNova').click(); await w(page, 250);
    await page.locator('#dlg button', { hasText: 'Recarregar agora' }).click(); await w(page, 1800);
    ok(recarregou, '"Recarregar agora" recarrega a página');
    await ctx.close();
  }

  // novidades sem conta: um link na janela de entrar abre a lista (sem bolinha nenhuma no botão "Entrar")
  {
    const fs = require('fs'), path = require('path'), { ROOT } = require('./lib');
    const V = /const VERSAO = '([^']+)'/.exec(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'))[1];
    const nov = JSON.parse(fs.readFileSync(path.join(ROOT, 'novidades.json'), 'utf8')).versoes[0];
    const { page, ctx } = await t.device({ name: 'novidades', w: 420, h: 820 });
    await page.goto(t.base, { waitUntil: 'load' }); await w(page, 1500);
    ok(await page.locator('#btnConta > .pt').count() === 0 && !(await page.locator('#dlg').evaluate(d => d.open)), 'sem conta, nada de bolinha, e nada abre sozinho');
    await page.locator('#btnConta').click(); await page.locator('#f-conta').waitFor();
    await page.locator('#c-novidades').click(); await page.locator('#f-novidades').waitFor({ timeout: 8000 });
    const lista = await page.evaluate(v => {
      const s = document.querySelector(`#nov-lista [data-versao="${v}"]`);
      return s ? { titulo: s.querySelector('h3').textContent, quando: s.querySelector('.qd').textContent, itens: s.querySelectorAll('li').length, mestre: s.querySelectorAll('.pm').length } : null;
    }, V);
    const nMestre = nov.itens.filter(i => i.mestre).length;
    ok(!!lista && lista.titulo === nov.titulo && lista.itens === nov.itens.length && lista.mestre === nMestre && lista.quando.includes('versão ' + V),
      '"Novidades do site" mostra a versão ' + V + ' inteira, com ' + nMestre + ' itens marcados para o mestre: ' + JSON.stringify(lista));
    const cabe = await page.evaluate(() => { const d = document.getElementById('dlg').getBoundingClientRect(), l = document.getElementById('nov-lista'); return d.right <= innerWidth && d.bottom <= innerHeight && l.scrollWidth <= l.clientWidth + 1; });
    ok(cabe, 'a janela cabe na tela estreita, e a lista rola por dentro sem estourar para os lados');
    if (process.env.TC_SCRATCH) await page.screenshot({ path: path.join(process.env.TC_SCRATCH, 'shot-novidades-420.png') });     // (para olhar)
    await page.locator('#f-novidades button', { hasText: 'Fechar' }).click(); await w(page, 300);
    ok(!(await page.locator('#dlg').evaluate(d => d.open)), '"Fechar" fecha a lista');
    await ctx.close();
  }

  if (t.errs.length) console.log('ERROS NO CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro no console (' + t.errs.length + ')');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
