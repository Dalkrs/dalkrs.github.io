// Rolador numa mesa de verdade (projeto real): os históricos e as tabelas guardados no banco (em trechos), a oferta
// de trazer o que o navegador já tinha, a lixeira no navegador, o segundo aparelho do mestre acompanhando — e os
// dados do navegador intactos.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, codigoDaMesa, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();

const T0 = 1790000000000;
const rolagem = (i) => ({ id: 'r_' + i, type: 'roll', mode: 'fixa', title: i === 1 ? 'Ataque do goblin' : 'Rolagem ' + i, description: '', color: i % 2 ? 'vermelho' : null, pinned: false, createdAt: T0 + i * 1000, atributo: 60, fixa: 20, die: 40, dieValue: 1 + (i % 40), total: 21 + (i % 40), check: null });
const antigas = [];
for (let i = 1; i <= 130; i++) antigas.push(rolagem(i));
antigas.splice(50, 0, { id: 's_meio', type: 'sep', text: 'Segunda parte', createdAt: T0 + 50500 });
const legado = JSON.stringify({ version: 1, activeHistoryId: 'h_teste', mode: 'fixa', lastBackupAt: null, trash: [],
  tables: [{ id: 'tb_clima', name: 'Clima', text: 'Céu limpo\nChuva fina\nNevoeiro', createdAt: T0, updatedAt: T0 }],
  histories: [
    { id: 'h_teste', name: 'Sessão antiga do Bruno', createdAt: T0, updatedAt: T0 + 130000, entries: antigas },
    { id: 'h_vazio', name: 'Histórico vazio', createdAt: T0, updatedAt: T0, entries: [] }] });

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'rolador-urgm:dados:v1': legado, 'tinycats:aba': 'rolador' } })).page;
  const M2 = (await t.device({ name: 'mestre-2', seed: { 'tinycats:aba': 'rolador' } })).page;          // o mesmo mestre, em outro aparelho
  const J = (await t.device({ name: 'jogador', seed: { 'tinycats:aba': 'fichas' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);
  const docs = p => p.evaluate(() => TC.dados.col('documentos').todas().filter(l => l.id.startsWith('rol:')).map(l => ({ id: l.id, vis: l.vis, rev: l.rev, n: l.dados && l.dados.e ? l.dados.e.length : null })).sort((a, b) => (a.id < b.id ? -1 : 1)));
  const local = p => p.evaluate(() => { const s = JSON.parse(localStorage.getItem('rolador-urgm:dados:v1')); return s.histories.map(x => x.name + ':' + x.entries.length).join('|') + ' · ' + s.tables.length; });
  const rolar = async R => { await R.locator('#fAtr').fill('60'); await R.locator('#fFixa').fill('20'); await R.locator('#rollBtn').click(); };

  // ---------- fora da mesa: o Rolador de sempre ----------
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1800);
  let R = await quadro(M, /\/rolador\//);
  ok(!!R && (await R.locator('#histName').innerText()).includes('Sessão antiga do Bruno') && (await R.locator('#saveStatus').innerText()).includes('Salvo no navegador'), 'sem mesa, o Rolador abre com os históricos do navegador');
  const antes = await local(M);

  // ---------- o mestre abre a mesa: o Rolador passa a guardar na mesa ----------
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Rolador E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);
  ok(await ate(async () => { R = await quadro(M, /\/rolador\//); return R && (await R.locator('#saveStatus').innerText()).includes('Salvo na mesa'); }), 'com a mesa aberta, o Rolador recarrega e passa a dizer "Salvo na mesa"');
  ok(await ate(async () => await R.locator('#bringDlg').evaluate(d => d.open)), 'a mesa não tem históricos: o Rolador oferece trazer os do navegador');
  const linhas = await R.locator('#bringList .check').allInnerTexts();
  ok(linhas.length === 3 && /Sessão antiga do Bruno/.test(linhas[0]) && /130 rolagens/.test(linhas[0]) && /Histórico vazio/.test(linhas[1]) && /Clima/.test(linhas[2]) && /3 itens/.test(linhas[2]), 'a lista mostra os históricos e as tabelas do navegador: ' + JSON.stringify(linhas));
  const marcas = await R.locator('#bringList input').evaluateAll(els => els.map(e => e.checked));
  ok(marcas.join() === 'true,false,true', 'o que tem conteúdo vem marcado; o histórico vazio, não');
  ok((await R.locator('#histName').innerText()).startsWith('Sessão de ') && await R.locator('#log li').count() === 0, 'por trás, a mesa começa com um histórico vazio (nada entra sozinho)');
  // recusar não perde nada
  await R.locator('#bringDlg [data-close]').click(); await w(400);
  ok((await R.locator('#toast').innerText()).includes('Menu > Trazer históricos deste navegador'), 'recusando, um aviso diz onde a opção fica');
  await R.locator('#menuBtn').click(); await w(250);
  ok(/Nesta mesa, os históricos e as tabelas ficam guardados no banco/.test(await R.locator('#mainMenu').innerText()) && !/Espaço usado/.test(await R.locator('#mainMenu').innerText()), 'o menu explica onde as coisas ficam (sem a conta de espaço do navegador)');
  await R.locator('#mainMenu .dd-item', { hasText: 'Trazer históricos deste navegador' }).click(); await w(300);
  ok(await R.locator('#bringDlg').evaluate(d => d.open), 'e o item do menu abre a mesma escolha');
  await R.locator('#bringOk').click(); await w(500);
  ok((await R.locator('#toast').innerText()).includes('Entrou na mesa: 1 histórico, 130 rolagens e 1 tabela'), 'trazer avisa o que entrou: ' + await R.locator('#toast').innerText());
  ok((await R.locator('#histName').innerText()).includes('Sessão antiga do Bruno') && (await R.locator('#log').innerText()).includes('Rolagem 130'), 'o histórico trazido vira o histórico aberto (o vazio do começo sai)');
  ok(await ate(async () => await semPendencia(M), 30000), 'tudo sobe para o banco');
  let d1 = await docs(M);
  ok(d1.length === 6 && d1.every(d => d.vis === 'mestre' && d.rev > 0), 'no banco: o estado, o histórico, três trechos de rolagens e a tabela — tudo só do mestre: ' + JSON.stringify(d1.map(d => d.id.replace(/h_[a-z0-9_]+/, 'h…') + (d.n != null ? '(' + d.n + ')' : ''))));
  ok(d1.filter(d => d.n != null).map(d => d.n).join() === '60,60,11', 'as 131 entradas (130 rolagens e um separador) em trechos de 60');
  ok(await local(M) === antes, 'os dados do navegador continuam exatamente como estavam: ' + antes);

  // ---------- rolar: só o último trecho é regravado ----------
  await rolar(R); await w(400);
  ok(await ate(async () => { const d = await docs(M); return d.filter(x => x.n != null).map(x => x.n).join() === '60,60,12' && await semPendencia(M); }), 'uma rolagem nova entra no último trecho');
  const d2 = await docs(M);
  const rev = (lista, fim) => lista.find(x => x.id.endsWith(fim)).rev;
  ok(rev(d2, ':0') === rev(d1, ':0') && rev(d2, ':1') === rev(d1, ':1') && rev(d2, ':2') > rev(d1, ':2'), 'os trechos antigos não são regravados (só o último mudou)');
  ok(await local(M) === antes, 'e a rolagem feita na mesa não vai para os dados do navegador');

  // ---------- o jogador não tem acesso ----------
  const codigo = await codigoDaMesa(M);
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  const vistoJ = await J.evaluate(async mesa => { const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave); const { data } = await a.from('documentos').select('id').eq('mesa_id', mesa); return (data || []).map(x => x.id); }, mesaId);
  ok(vistoJ.every(id => !id.startsWith('rol:')) && await J.locator('#tab-rolador').isHidden(), 'o jogador não vê a aba Rolador nem recebe os documentos dele do banco');

  // ---------- lixeira: no navegador; restaurar devolve à mesa ----------
  await R.locator('#log li').first().click(); await w(300);
  await R.locator('#eDelete').click(); await w(400);
  ok(await ate(async () => { const d = await docs(M); return d.filter(x => x.n != null).map(x => x.n).join() === '60,60,11' && await semPendencia(M); }), 'apagar a rolagem tira ela do banco');
  ok(await M.evaluate(mesa => JSON.parse(localStorage.getItem('rolador-urgm:lixeira:' + mesa) || '[]').length === 1, mesaId), 'e ela fica na lixeira deste navegador');
  await R.locator('#menuBtn').click(); await w(250);
  await R.locator('#mainMenu .dd-item', { hasText: 'Lixeira' }).click(); await w(300);
  await R.locator('#trashList .btn', { hasText: 'Restaurar' }).click(); await w(400);
  if (await R.locator('#trashDlg').evaluate(d => d.open)) { await R.locator('#trashDlg [data-close]').click(); await w(200); }
  ok(await ate(async () => { const d = await docs(M); return d.filter(x => x.n != null).map(x => x.n).join() === '60,60,12' && await semPendencia(M); }), 'restaurar devolve a rolagem ao trecho dela');

  // ---------- o mesmo mestre em outro aparelho ----------
  await M2.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, M2);
  await loginTela(M2, c.mestre, c.senha);
  await M2.locator('#m-lista button', { hasText: nomeMesa }).click();
  await M2.locator('#vivo').waitFor({ state: 'visible', timeout: 20000 });
  let R2 = null;
  ok(await ate(async () => { R2 = await quadro(M2, /\/rolador\//); return R2 && (await R2.locator('#saveStatus').innerText()).includes('Salvo na mesa') && (await R2.locator('#histName').innerText()).includes('Sessão antiga do Bruno'); }, 30000), 'em outro aparelho, o mestre abre a mesa e o Rolador já vem com o histórico');
  ok(await R2.locator('#bringDlg').evaluate(d => !d.open) && (await R2.locator('#logCount').innerText()).includes('131'), 'sem oferta (a mesa já tem históricos) e com as 131 rolagens: ' + await R2.locator('#logCount').innerText());
  const revAntes = (await docs(M2)).map(d => d.rev).join();
  await w(1500, M2);
  ok((await docs(M2)).map(d => d.rev).join() === revAntes && await semPendencia(M2), 'abrir em outro aparelho não regrava nada no banco');
  await R.locator('#fTitle').fill('Rolagem do primeiro aparelho'); await rolar(R);
  ok(await ate(async () => (await R2.locator('#log').innerText()).includes('Rolagem do primeiro aparelho'), 25000), 'o que o mestre rola num aparelho aparece no outro');
  await R2.locator('#fTitle').fill('Rolagem do segundo aparelho'); await rolar(R2);
  ok(await ate(async () => (await R.locator('#log').innerText()).includes('Rolagem do segundo aparelho') && (await R.locator('#log').innerText()).includes('Rolagem do primeiro aparelho'), 25000), 'e a do segundo aparece no primeiro, sem apagar a outra');

  // ---------- tabelas e novo histórico ----------
  await R.locator('#histBtn').click(); await w(250);
  await R.locator('#histMenu .dd-item', { hasText: '+ Novo histórico' }).click(); await w(300);
  await R.locator('#promptInput').fill('Sessão nova'); await R.locator('#promptOk').click(); await w(400);
  ok(await ate(async () => { const d = await docs(M); return d.filter(x => x.id.startsWith('rol:h:')).length === 2 && await semPendencia(M); }), 'um histórico novo vira um documento novo');
  ok(await ate(async () => { const e = await M.evaluate(() => TC.dados.col('documentos').pegar('rol:est').dados); const h = await M.evaluate(() => TC.dados.col('documentos').todas().filter(l => l.id.startsWith('rol:h:') && l.dados.name === 'Sessão nova')[0].id.slice(6)); return e.ativo === h; }), 'e o estado guarda qual é o histórico aberto');

  // ---------- recarregar ----------
  await M.reload({ waitUntil: 'load' });
  ok(await ate(async () => { R = await quadro(M, /\/rolador\//); return R && (await R.locator('#saveStatus').innerText()).includes('Salvo na mesa') && (await R.locator('#histName').innerText()).includes('Sessão nova'); }, 40000), 'recarregando, o Rolador volta no histórico que estava aberto');
  await R.locator('#histBtn').click(); await w(250);
  ok(/Sessão antiga do Bruno/.test(await R.locator('#histMenu').innerText()) && /13[23] rolagens/.test(await R.locator('#histMenu').innerText()), 'com o outro histórico e todas as rolagens dele: ' + (await R.locator('#histMenu').innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await M.keyboard.press('Escape');
  ok(await R.locator('#bringDlg').evaluate(d => !d.open), 'sem oferecer de novo');

  // ---------- apagar a mesa: de volta aos dados do navegador ----------
  await apagarMesaTela(M, nomeMesa);
  ok(await ate(async () => { R = await quadro(M, /\/rolador\//); return R && (await R.locator('#saveStatus').innerText()).includes('Salvo no navegador') && (await R.locator('#histName').innerText()).includes('Sessão antiga do Bruno'); }, 30000), 'fora da mesa, o Rolador volta aos históricos do navegador');
  ok(await local(M) === antes, 'que continuam como eram: ' + antes);

  const fora = t.errs.filter(e => !/status of (400|401|409)|Multiple GoTrueClient instances/.test(e));
  if (fora.length) console.log('CONSOLE:\n' + fora.join('\n') + '\nRESPOSTAS DE ERRO:\n' + t.ruins.join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
