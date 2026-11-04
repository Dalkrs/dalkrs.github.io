// (lote 84) O sono da mesa: a aba escondida não gasta, a esquecida para, o aviso, a volta sem carregar tudo e a saída por
// inatividade. Roda no banco local; com TC_REAL=1, confere também o tempo real (o canal fecha ao dormir e reabre ao voltar).
const { start, checker, LOCAL, BANCO } = require('./lib');
const { contas, entrar } = require('./contas');
const { ok, end } = checker();
const rest = u => u.startsWith(BANCO) && (u.includes('/rest/') || u.includes('/auth/') || u.includes('/storage/'));
const ocultavel = () => { let o = false; Object.defineProperty(document, 'hidden', { configurable: true, get: () => o }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (o ? 'hidden' : 'visible') }); window.__ocultar = v => { o = v; document.dispatchEvent(new Event('visibilitychange')); }; };
(async () => {
  const t = await start({ net: true });
  const c = contas();
  const abrir = async (nome, cfg) => {
    const d = await t.device({ name: nome });
    await d.ctx.addInitScript(ocultavel);
    await d.ctx.addInitScript(x => { window.TC_SONO = x; }, cfg);
    d.reqs = []; d.ws = [];
    d.ctx.on('request', r => { if (rest(r.url())) d.reqs.push({ u: r.url(), m: r.method() }); });
    d.page.on('websocket', w => { const reg = { aberto: true }; d.ws.push(reg); w.on('close', () => { reg.aberto = false; }); });
    return d;
  };
  const LONGE = 3600e3;
  // ---------- o mestre cria a mesa ----------
  const A = await abrir('a', { oculta: 2500, semUso: LONGE, resposta: LONGE, sair: LONGE * 8 }), P = A.page;
  await P.goto(t.base + 'src/tests/vazio.html');
  ok(!(await entrar(P, c.mestre, c.senha, 'Bruno')).erro, 'a conta de teste entra');
  await P.goto(t.base, { waitUntil: 'load' });
  await P.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 15000 });
  const idMesa = await P.evaluate(async n => (await TC.mesas.criar(n)).id || TC.mesas.atual.id, 'Sono E2E ' + Date.now().toString(36));
  await P.waitForFunction(() => TC.mesas.atual, null, { timeout: 15000 });
  await P.evaluate(() => TC.dados.col('documentos').pronta); await P.waitForTimeout(1500);
  ok(!!idMesa, 'a mesa abre');

  // ---------- à vista, ainda lê; escondida, não ----------
  A.reqs.length = 0; await P.waitForTimeout(7000);
  ok(!LOCAL || A.reqs.filter(r => r.m === 'GET').length > 0, 'à vista, sem tempo real, continua lendo: ' + A.reqs.length);
  const wsAntes = A.ws.filter(w => w.aberto).length;
  await P.evaluate(() => window.__ocultar(true));
  await P.waitForTimeout(500); A.reqs.length = 0;
  await P.waitForTimeout(1500);
  ok(await P.evaluate(() => TC.sono.estado) === 'acordado', 'escondida há pouco: ainda não dormiu');
  await P.waitForTimeout(2000);
  ok(await P.evaluate(() => TC.sono.estado) === 'dormindo', 'escondida além do prazo: entra em pausa');
  await P.waitForTimeout(6000);
  ok(A.reqs.length === 0, 'escondida, nenhuma requisição ao banco: ' + A.reqs.length);
  if (!LOCAL) ok(wsAntes >= 1 && A.ws.filter(w => w.aberto).length === 0, 'dormindo, o tempo real fecha: antes ' + wsAntes);

  // ---------- gravar com a aba escondida sobe; outro aparelho muda; ao voltar, só o novo ----------
  A.reqs.length = 0;
  await P.evaluate(() => { TC.dados.col('documentos').gravar('teste:escondida', { dados: { a: 1 }, vis: 'mesa' }); });
  await P.waitForTimeout(1500);
  ok(A.reqs.some(r => r.m !== 'GET' && r.u.includes('/documentos')), 'o que se grava escondido sobe mesmo assim');
  const B = await abrir('b', { oculta: LONGE, semUso: LONGE, resposta: LONGE, sair: LONGE * 8 }), Q = B.page;
  await Q.goto(t.base + 'src/tests/vazio.html'); await entrar(Q, c.mestre, c.senha, 'Bruno');
  await Q.goto(t.base, { waitUntil: 'load' });
  await Q.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 20000 }); await Q.evaluate(id => TC.mesas.abrir(id), idMesa); await Q.waitForFunction(() => TC.mesas.atual, null, { timeout: 20000 });
  await Q.evaluate(() => TC.dados.col('documentos').pronta);
  await Q.evaluate(() => { TC.dados.col('documentos').gravar('teste:de-fora', { dados: { b: 2 }, vis: 'mesa' }); });
  await Q.waitForTimeout(1500);
  ok(await P.evaluate(() => !TC.dados.col('documentos').pegar('teste:de-fora')), 'dormindo, a mudança de fora ainda não chegou');
  A.reqs.length = 0;
  await P.evaluate(() => window.__ocultar(false));
  await P.waitForFunction(() => TC.dados.col('documentos').pegar('teste:de-fora'), null, { timeout: 8000 }).catch(() => {});
  ok(await P.evaluate(() => !!TC.dados.col('documentos').pegar('teste:de-fora')), 'ao voltar, a mudança de fora chega');
  ok(await P.evaluate(() => TC.sono.estado) === 'acordado', 'ao voltar, acorda sozinha');
  ok(!A.reqs.some(r => r.m === 'GET' && r.u.includes('/documentos') && r.u.includes('offset=0')), 'ao voltar, não baixa a mesa inteira de novo');
  if (!LOCAL) { await P.waitForTimeout(3000); ok(A.ws.filter(w => w.aberto).length >= 1 && await P.evaluate(() => TC.aoVivo.conectado), 'ao voltar, o tempo real reabre'); }

  // ---------- o intervalo do mapa ----------
  const mapa = 'mundo:mapa:teste';
  await P.evaluate(id => { TC.dados.col('documentos').gravar(id, { dados: { v: 0 }, vis: 'mestre' }); }, mapa);
  await P.waitForTimeout(1500);
  A.reqs.length = 0;
  for (let i = 1; i <= 8; i++) { await P.evaluate(([id, v]) => { TC.dados.col('documentos').gravar(id, { dados: { v }, vis: 'mestre' }); }, [mapa, i]); await P.waitForTimeout(350); }
  const gravs = () => A.reqs.filter(r => r.m !== 'GET' && r.m !== 'OPTIONS' && r.u.includes('mundo%3Amapa%3Ateste')).length;
  ok(gravs() === 0, 'mudanças em sequência no mapa ainda não subiram: ' + gravs());
  await P.waitForTimeout(4500);
  ok(gravs() === 1, '8 mudanças em 3 s viram uma gravação só: ' + gravs());
  const pend = await P.evaluate(async id => { TC.dados.col('documentos').apagar(id); await new Promise(r => setTimeout(r, 1200)); return TC.dados.pendentes; }, mapa);
  ok(pend === 0, 'apagar uma projeção (esconder o mapa) não espera os 5 s: pendentes ' + pend);

  // ---------- à vista, sem uso: pergunta, responde, dorme, volta ----------
  const V = await abrir('v', { oculta: LONGE, semUso: 4000, resposta: 3000, sair: LONGE * 8 }), R = V.page;
  await R.goto(t.base + 'src/tests/vazio.html'); await entrar(R, c.mestre, c.senha, 'Bruno');
  await R.goto(t.base, { waitUntil: 'load' });
  await R.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 20000 }); await R.evaluate(id => TC.mesas.abrir(id), idMesa); await R.waitForFunction(() => TC.mesas.atual, null, { timeout: 20000 });
  await R.locator('#sono-ok').waitFor({ state: 'visible', timeout: 9000 });
  ok((await R.locator('#sono').innerText()).includes('Ainda está aí?'), 'sem uso: pergunta se ainda está aí');
  await R.mouse.move(200, 200);                              // (basta mexer: o aviso some antes mesmo do clique)
  await R.waitForTimeout(300);
  ok(await R.locator('#sono').isHidden() && await R.evaluate(() => TC.sono.estado) === 'acordado', 'mexer ou Continuar: o aviso some');
  await R.waitForFunction(() => TC.sono.estado === 'dormindo', null, { timeout: 12000 });
  ok((await R.locator('#sono').innerText()).includes('Mesa em pausa'), 'sem resposta: a mesa entra em pausa e diz isso');
  await R.waitForTimeout(500); V.reqs.length = 0; await R.waitForTimeout(5000);
  ok(V.reqs.length === 0, 'em pausa à vista, nenhuma requisição: ' + V.reqs.length);
  await R.mouse.move(300, 300); await R.mouse.move(310, 310);
  await R.waitForTimeout(800);
  ok(await R.evaluate(() => TC.sono.estado) === 'acordado' && V.reqs.length > 0, 'mexer acorda e volta a ler: ' + V.reqs.length);

  // ---------- usar dentro da moldura e em outra aba conta ----------
  const fr = await R.evaluate(() => { const f = [...document.querySelectorAll('iframe')].find(x => x.offsetWidth > 0); return f ? f.id : null; });
  ok(!!fr, 'há uma moldura aberta: ' + fr);
  const box = await R.locator('#' + fr).boundingBox();
  let semPergunta = true;
  for (let i = 0; i < 12; i++) { await R.mouse.move(box.x + 50 + i * 5, box.y + 80); await R.waitForTimeout(500); if (await R.evaluate(() => TC.sono.estado) !== 'acordado') semPergunta = false; }
  ok(semPergunta, 'mexer dentro da moldura conta como uso');
  const R2 = await V.ctx.newPage();
  await R2.goto(t.base + 'src/tests/vazio.html');
  let semPergunta2 = true;
  for (let i = 0; i < 12; i++) { await R2.evaluate(() => localStorage.setItem('tinycats:uso', String(Date.now()))); await R.waitForTimeout(500); if (await R.evaluate(() => TC.sono.estado) !== 'acordado') semPergunta2 = false; }
  ok(semPergunta2, 'o uso em outra aba vale para esta');
  await R2.close();

  // ---------- a saída por inatividade ----------
  const S = await abrir('s', { oculta: 1500, semUso: LONGE, resposta: LONGE, sair: 9000 }), U = S.page;
  await U.goto(t.base + 'src/tests/vazio.html'); await entrar(U, c.mestre, c.senha, 'Bruno');
  await U.goto(t.base, { waitUntil: 'load' });
  await U.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 20000 }); await U.evaluate(id => TC.mesas.abrir(id), idMesa); await U.waitForFunction(() => TC.mesas.atual, null, { timeout: 20000 });
  await U.evaluate(() => TC.dados.col('documentos').pronta);
  await U.evaluate(() => window.__ocultar(true));
  await S.ctx.setOffline(true);
  await U.evaluate(() => { TC.dados.col('documentos').gravar('teste:sem-rede', { dados: { c: 3 }, vis: 'mesa' }); });
  await U.waitForTimeout(12000);
  ok(await U.evaluate(() => !!TC.conta.usuario && TC.dados.pendentes > 0), 'com algo por subir e sem rede, não sai da conta');
  await S.ctx.setOffline(false);
  S.reqs.length = 0;
  await U.waitForFunction(() => !TC.conta.usuario, null, { timeout: 25000 }).catch(() => {});
  ok(await U.evaluate(() => !TC.conta.usuario), 'passado o prazo, sai da conta');
  const saida = S.reqs.find(r => r.u.includes('/logout'));
  ok(!!saida && saida.u.includes('scope=local'), 'sai só deste navegador: ' + (saida && saida.u.split('/auth')[1]));
  ok(S.reqs.some(r => r.m !== 'GET' && r.u.includes('/documentos')), 'o que faltava subir subiu antes de sair');
  await U.evaluate(() => window.__ocultar(false)); await U.waitForTimeout(400);
  ok((await U.locator('#toasts').innerText()).includes('inatividade'), 'ao voltar para a aba, avisa por que saiu');

  // ---------- com o tempo real: a presença a cada 60 s sem reler tudo ----------
  if (!LOCAL) {
    A.reqs.length = 0; await P.mouse.move(10, 10);
    await P.waitForTimeout(70000);
    const pres = A.reqs.filter(r => r.u.includes('marcar_presenca')).length, mem = A.reqs.filter(r => r.m === 'GET' && r.u.includes('/mesa_membros')).length, tudo = A.reqs.filter(r => r.m !== 'OPTIONS').length;
    ok(pres <= 2, 'presença em 70 s: ' + pres);
    ok(mem <= 2, 'releituras de membros em 70 s: ' + mem);
    console.log('   requisições em 70 s à vista: ' + tudo);
    await P.evaluate(async () => { try { await TC.mesas.apagar(); } catch (e) { console.log(e); } });
  }
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
