// (lote 91) A cópia local dos dados da mesa: recarregar não baixa tudo; o que muda em outro aparelho chega; o apagado e o que o
// mestre esconde somem (antes de aparecer); outra pessoa ou outro papel não reaproveitam a cópia; sair apaga; sem IndexedDB
// (ou com a cópia estragada) cai no download completo, sem erro; a gravação pendente não se perde.
// Roda no banco local; com TC_REAL=1, no projeto de verdade (cria uma mesa de teste e a apaga no fim).
const { start, checker, BANCO } = require('./lib');
const { contas, entrar } = require('./contas');
const { ok, end } = checker();
const DOCS = '/rest/v1/documentos';
const CURTO = { espera: 200 };
const cheio = u => /select=\*/.test(u) && /order=rev/.test(u) && !/rev=gt/.test(u);
// o que está guardado no IndexedDB deste navegador (sem abrir a mesa)
const lerCopia = p => p.evaluate(() => new Promise((s, n) => {
  const r = indexedDB.open('tinycats-copia', 1);
  r.onupgradeneeded = () => { r.result.createObjectStore('metas', { keyPath: 'chave' }); r.result.createObjectStore('linhas', { keyPath: ['chave', 'id'] }); };
  r.onerror = () => n(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction(['metas', 'linhas']), a = tx.objectStore('metas').getAll(), b = tx.objectStore('linhas').getAll();
    tx.oncomplete = () => { r.result.close(); s({ metas: a.result, linhas: b.result.map(x => ({ chave: x.chave, id: x.id, rev: x.linha.rev, dados: x.linha.dados })) }); };
  };
}));
const mexerCopia = (p, fn) => p.evaluate(src => new Promise((s, n) => {
  const r = indexedDB.open('tinycats-copia', 1);
  r.onerror = () => n(r.error);
  r.onsuccess = () => {
    const tx = r.result.transaction(['metas', 'linhas'], 'readwrite'), a = tx.objectStore('metas').getAll(), b = tx.objectStore('linhas').getAll();
    tx.oncomplete = () => { r.result.close(); s(true); };
    b.onsuccess = () => { new Function('metas', 'linhas', 'tx', src)(a.result, b.result, tx); };
  };
}), fn);
(async () => {
  const t = await start({ net: true });
  const c = contas();
  const aparelho = async (nome, extra) => {
    const d = await t.device({ name: nome });
    await d.ctx.addInitScript(x => { window.TC_COPIA = x; }, CURTO);
    if (extra) await d.ctx.addInitScript(extra);
    d.reqs = []; d.todas = [];
    d.ctx.on('request', r => { if (!r.url().startsWith(BANCO)) return; if (r.url().includes(DOCS)) d.reqs.push({ u: r.url(), m: r.method() }); if (r.method() === 'GET') d.todas.push(r.url()); });
    return d;
  };
  const entrarEm = async (d, email, nome) => {
    await d.page.goto(t.base + 'src/tests/vazio.html');
    ok(!(await entrar(d.page, email, c.senha, nome)).erro, nome + ' entra na conta');
    await d.page.goto(t.base, { waitUntil: 'load' });
    await d.page.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 25000 });
    await d.page.evaluate(() => { TC.mesas.sono = 0; });
  };
  const abrirMesa = async (d, id) => {
    await d.page.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 25000 });
    await d.page.evaluate(i => (TC.mesas.atual && TC.mesas.atual.id === i ? null : TC.mesas.abrir(i)), id);
    await d.page.evaluate(() => TC.dados.col('documentos').pronta);
  };
  // (depois de recarregar, a casca abre sozinha a última mesa: abrir aqui ao mesmo tempo trocaria as coleções no meio da leitura)
  const recarregar = async (d, id) => {
    d.reqs.length = 0; await d.page.reload({ waitUntil: 'load' });
    await d.page.waitForFunction(i => window.TC && TC.mesas.atual && TC.mesas.atual.id === i, id, { timeout: 25000 });
    await d.page.evaluate(() => TC.dados.col('documentos').pronta);
  };
  // espera a cópia ficar guardada com a linha pedida (ou sem ela)
  const guardou = async (d, teste) => {
    await d.page.evaluate(() => TC.dados.copiaLocal.salvar());
    for (let i = 0; i < 40; i++) { const k = await lerCopia(d.page); if (teste(k)) return true; await d.page.waitForTimeout(250); await d.page.evaluate(() => TC.dados.copiaLocal.salvar()); }
    return false;
  };
  const baixouTudo = d => d.reqs.some(r => r.m === 'GET' && cheio(r.u));
  const pegar = (d, id) => d.page.evaluate(i => { const l = TC.dados.col('documentos').pegar(i); return l ? l.dados : null; }, id);
  const gravar = async (d, id, dados, vis) => { await d.page.evaluate(([i, x, v]) => { TC.dados.col('documentos').gravar(i, Object.assign({ dados: x }, v ? { vis: v } : {})); }, [id, dados, vis]); };
  const subiu = d => d.page.waitForFunction(() => !TC.dados.pendentes, null, { timeout: 15000 });

  // ---------- o mestre e o jogador ----------
  const A = await aparelho('mestre'), J = await aparelho('jogador');
  await entrarEm(A, c.mestre, 'Bruno'); await entrarEm(J, c.jog1, 'Joana');
  const nomeMesa = 'Cópia E2E ' + Date.now().toString(36);
  const { id: idMesa, codigo } = await A.page.evaluate(async n => { const m = await TC.mesas.criar(n); return { id: m.id, codigo: m.codigo }; }, nomeMesa);
  await A.page.evaluate(() => TC.dados.col('documentos').pronta);
  for (const [i, x] of [['teste:fica', { v: 1 }], ['teste:apaga', { v: 1 }], ['teste:esconde', { segredo: 'visivel' }], ['teste:muda', { v: 1 }]]) await gravar(A, i, x, 'mesa');
  await subiu(A);
  await J.page.evaluate(async ([cd, n]) => { await TC.mesas.entrarComCodigo(cd, n); }, [codigo, 'Joana']);
  J.reqs.length = 0;
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok(!!(await pegar(J, 'teste:fica')), 'o jogador abre a mesa e vê o documento');
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'teste:fica')), 'a primeira abertura guarda a cópia');
  const k0 = await lerCopia(J.page);
  ok(k0.metas.some(m => m.formato === 1 && m.mesa === idMesa && m.cargo === 'jogador' && m.col === 'documentos'), 'a cópia diz o formato, a mesa, o cargo e a coleção');
  ok(await J.page.evaluate(() => !Object.keys(localStorage).some(k => { const v = localStorage.getItem(k) || ''; return k.includes('copia') || v.includes('"segredo":"visivel"'); })), 'nada dos dados vai para o localStorage');

  // ---------- recarregar não baixa tudo ----------
  await recarregar(J, idMesa);
  ok(!baixouTudo(J), 'recarregar não baixa a mesa inteira: ' + J.reqs.filter(r => cheio(r.u)).length);
  ok(J.reqs.some(r => /rev=gt/.test(r.u)), 'recarregar lê só o que passou da revisão guardada');
  ok((await pegar(J, 'teste:fica') || {}).v === 1, 'depois de recarregar, o documento está lá');

  // ---------- as fichas (a outra coleção) também ----------
  const fichasCheias = d => d.todas.filter(r => /\/rest\/v1\/personagens/.test(r) && cheio(r)).length;
  await A.page.evaluate(() => { TC.dados.col('personagens').gravar('p-teste', { nome: 'Ficha', vis: 'mesa', ficha: { v: 1 } }); }); await subiu(A);
  await J.page.evaluate(() => TC.dados.col('personagens').pronta);
  await recarregar(J, idMesa);
  await J.page.evaluate(() => TC.dados.col('personagens').pronta);
  ok(await J.page.waitForFunction(() => TC.dados.col('personagens').pegar('p-teste'), null, { timeout: 8000 }).then(() => true, () => false), 'a ficha chega ao jogador');
  await J.page.evaluate(() => TC.dados.copiaLocal.salvar());
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'p-teste')), 'a ficha entra na cópia');
  J.todas.length = 0; await recarregar(J, idMesa); await J.page.evaluate(() => TC.dados.col('personagens').pronta);
  ok(fichasCheias(J) === 0, 'recarregar não baixa todas as fichas: ' + fichasCheias(J));
  ok(await J.page.evaluate(() => !!TC.dados.col('personagens').pegar('p-teste')), 'depois de recarregar, a ficha está lá');
  // ---------- a mudança feita em outro aparelho chega ----------
  await gravar(A, 'teste:muda', { v: 2 }); await gravar(A, 'teste:novo', { v: 1 }, 'mesa'); await subiu(A);
  await recarregar(J, idMesa);
  ok(!baixouTudo(J), 'a mudança de fora não pede o download completo');
  ok((await pegar(J, 'teste:muda') || {}).v === 2, 'a linha mudada em outro aparelho chega');
  ok((await pegar(J, 'teste:novo') || {}).v === 1, 'a linha nova de outro aparelho chega');

  // ---------- o apagado some, também da cópia ----------
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'teste:apaga')), '(a cópia tem o que será apagado)');
  await A.page.evaluate(() => { TC.dados.col('documentos').apagar('teste:apaga'); }); await subiu(A);
  await recarregar(J, idMesa);
  ok(!baixouTudo(J) && (await pegar(J, 'teste:apaga')) === null, 'o documento apagado some, sem baixar tudo');
  ok(await guardou(J, k => !k.linhas.some(l => l.id === 'teste:apaga')), 'o documento apagado some da cópia');

  // ---------- o que o mestre esconde some, sem nunca aparecer ----------
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'teste:esconde')), '(a cópia tem o que será escondido)');
  await gravar(A, 'teste:mais', { v: 1 }, 'mesa'); await subiu(A);      // (para o escondido não ser a última revisão do jogador)
  await recarregar(J, idMesa);
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'teste:mais')), '(a cópia está em dia)');
  await A.page.evaluate(() => { TC.dados.col('documentos').gravar('teste:esconde', { vis: 'mestre' }); }); await subiu(A);
  await J.ctx.addInitScript(() => {
    window.__viu = [];
    const olhar = () => { try { if (window.TC && TC.mesas.atual && TC.dados.col('documentos').pegar('teste:esconde')) window.__viu.push(Date.now()); } catch (e) { /* ainda abrindo */ } };
    setInterval(olhar, 3);
    addEventListener('load', () => { if (window.TC && window.TC.dados && typeof TC.dados.on === 'function') TC.dados.on('muda', (n, l) => { if (l && l.id === 'teste:esconde' && !l.apagado) window.__viu.push('muda'); }); });
  });
  await recarregar(J, idMesa);
  ok(!baixouTudo(J), 'esconder um documento não pede o download completo');
  ok((await pegar(J, 'teste:esconde')) === null, 'o documento escondido não está para o jogador');
  await J.page.waitForTimeout(600);
  ok((await J.page.evaluate(() => window.__viu.length)) === 0, 'o documento escondido não apareceu nem por um instante');
  ok(await guardou(J, k => !k.linhas.some(l => l.id === 'teste:esconde')), 'o documento escondido sai da cópia');
  // o que volta a ser visível volta (a revisão dele anda)
  await A.page.evaluate(() => { TC.dados.col('documentos').gravar('teste:esconde', { vis: 'mesa' }); }); await subiu(A);
  await recarregar(J, idMesa);
  ok(!!(await pegar(J, 'teste:esconde')), 'o que volta a ser visível volta');
  // escondido sem a revisão chegar a andar para o jogador: a última revisão dele some e a cópia está "à frente"
  await guardou(J, k => k.linhas.some(l => l.id === 'teste:esconde'));
  await A.page.evaluate(() => { TC.dados.col('documentos').gravar('teste:esconde', { vis: 'mestre' }); }); await subiu(A);
  await recarregar(J, idMesa);
  ok((await pegar(J, 'teste:esconde')) === null, 'a última revisão escondida: some também (e baixa tudo: ' + baixouTudo(J) + ')');
  await A.page.evaluate(() => { TC.dados.col('documentos').gravar('teste:esconde', { vis: 'mesa' }); }); await subiu(A);
  await recarregar(J, idMesa);

  // ---------- a conferência falhou: descarta e baixa tudo ----------
  await guardou(J, k => k.linhas.some(l => l.id === 'teste:esconde'));
  await A.page.evaluate(() => { TC.dados.col('documentos').gravar('teste:esconde', { vis: 'mestre' }); TC.dados.col('documentos').gravar('teste:fica', { dados: { v: 2 } }); }); await subiu(A);
  const falha = r => (/select=id%2Crev%2Capagado/.test(r.request().url()) && /order=id/.test(r.request().url()) ? r.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"falha de ensaio"}' }) : r.fallback());
  await J.ctx.route('**' + DOCS + '**', falha);
  await recarregar(J, idMesa);
  await J.ctx.unroute('**' + DOCS + '**', falha);
  ok(baixouTudo(J), 'a conferência falhou: baixa tudo');
  ok((await pegar(J, 'teste:esconde')) === null, 'a conferência falhou: o escondido não aparece');
  ok((await pegar(J, 'teste:fica') || {}).v === 2, 'a conferência falhou: a mesa está em dia');
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'teste:fica') && !k.linhas.some(l => l.id === 'teste:esconde')), 'a conferência falhou: a cópia antiga foi descartada, com o escondido');
  await A.page.evaluate(() => { TC.dados.col('documentos').gravar('teste:esconde', { vis: 'mesa' }); }); await subiu(A);
  await recarregar(J, idMesa);

  // ---------- cópia à frente do banco, de outro formato ou estragada: baixa tudo, sem erro ----------
  const esperaGuardar = () => guardou(J, k => k.metas.length && k.linhas.some(l => l.id === 'teste:fica'));
  ok(await esperaGuardar(), '(a cópia está guardada)');
  for (const [nome, src] of [
    ['à frente do banco', "for (const m of metas) { m.maxRev = m.maxRev + 100000000; tx.objectStore('metas').put(m); }"],
    ['de outro formato', "for (const m of metas) { m.formato = 999; tx.objectStore('metas').put(m); }"],
    ['com a linha estragada', "for (const l of linhas) { l.linha = { oi: 1 }; tx.objectStore('linhas').put(l); }"],
    ['com uma linha à frente do banco', "for (const l of linhas) { l.linha.rev = l.linha.rev + 100000000; tx.objectStore('linhas').put(l); }"],
  ]) {
    await mexerCopia(J.page, src);
    await recarregar(J, idMesa);
    ok(baixouTudo(J), 'cópia ' + nome + ': baixa tudo');
    ok((await pegar(J, 'teste:fica') || {}).v === 2, 'cópia ' + nome + ': a mesa abre certa');
    ok(await esperaGuardar(), 'cópia ' + nome + ': uma cópia boa fica no lugar');
  }

  // ---------- outro papel não reaproveita ----------
  await A.page.evaluate(async id => { await TC.mesas.conferirMembros(); const m = TC.mesas.atual.membros.find(x => x.nome === 'Joana' || x.cargo === 'jogador'); await TC.mesas.definirAuxiliar(m.usuario_id, true); }, idMesa);
  await gravar(A, 'cena:do-mestre', { v: 1 }, 'mestre'); await subiu(A);
  await recarregar(J, idMesa);
  await J.page.waitForFunction(() => TC.mesas.atual && TC.mesas.atual.cargo === 'auxiliar', null, { timeout: 15000 });
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok(baixouTudo(J), 'virou auxiliar: não reaproveita a cópia de jogador');
  ok(await guardou(J, k => k.metas.some(m => m.cargo === 'auxiliar' && !m.jogando) && !k.metas.some(m => m.cargo === 'jogador')), 'a cópia de jogador sai; fica a de auxiliar');
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'cena:do-mestre')), 'a cópia de quem mestra tem o que é do mestre');
  await recarregar(J, idMesa);
  ok(!baixouTudo(J), 'auxiliar mestrando: recarregar também não baixa tudo');
  // o auxiliar "jogando" é jogador: outra cópia, sem o que é do mestre
  await gravar(A, 'cena:depois', { v: 1 }, 'mesa'); await subiu(A);      // (a última revisão é visível: nada de "à frente do banco" para disfarçar)
  await J.page.waitForFunction(() => TC.dados.col('documentos').pegar('cena:depois'), null, { timeout: 15000 });
  ok(await guardou(J, k => k.linhas.some(l => l.id === 'cena:depois')), '(a cópia de quem mestra está em dia)');
  J.reqs.length = 0;
  await J.page.evaluate(() => TC.mesas.jogar(true));
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok(baixouTudo(J), 'auxiliar jogando: não reaproveita a cópia de quem mestra');
  ok((await pegar(J, 'cena:do-mestre')) === null, 'auxiliar jogando: o que é do mestre não aparece');
  ok(await guardou(J, k => { const jog = k.metas.find(m => m.jogando); return jog && k.linhas.some(l => l.chave === jog.chave) && !k.linhas.some(l => l.chave === jog.chave && l.id === 'cena:do-mestre'); }), 'auxiliar jogando: a cópia dele não tem o que é do mestre');
  await recarregar(J, idMesa);
  ok(!baixouTudo(J), 'auxiliar jogando: recarregar não baixa tudo');
  ok((await pegar(J, 'cena:do-mestre')) === null, 'auxiliar jogando: depois de recarregar, continua sem o que é do mestre');
  await J.page.evaluate(() => TC.mesas.jogar(false));
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  await A.page.evaluate(async () => { await TC.mesas.conferirMembros(); const m = TC.mesas.atual.membros.find(x => x.cargo === 'auxiliar'); await TC.mesas.definirAuxiliar(m.usuario_id, false); });
  await J.page.waitForTimeout(300);
  await recarregar(J, idMesa);
  await J.page.waitForFunction(() => TC.mesas.atual && TC.mesas.atual.cargo === 'jogador', null, { timeout: 15000 });
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok((await pegar(J, 'cena:do-mestre')) === null, 'devolvido a jogador: o que era do mestre não aparece');
  ok(await guardou(J, k => k.metas.length && k.metas.every(m => m.cargo === 'jogador') && !k.linhas.some(l => l.id === 'cena:do-mestre')), 'devolvido a jogador: a cópia de auxiliar sai do aparelho');

  // ---------- outra pessoa, no mesmo navegador ----------
  await mexerCopia(J.page, "for (const m of metas) { const c = Object.assign({}, m, { chave: 'outra~' + m.chave, usuario: 'outra-pessoa' }); tx.objectStore('metas').put(c); } for (const l of linhas) { tx.objectStore('linhas').put(Object.assign({}, l, { chave: 'outra~' + l.chave })); }");
  await recarregar(J, idMesa);
  ok(await guardou(J, k => !k.metas.some(m => m.usuario === 'outra-pessoa') && !k.linhas.some(l => l.chave.startsWith('outra~'))), 'a cópia de outra pessoa não é lida e sai do aparelho');

  // ---------- sair da conta apaga; a outra conta não reaproveita ----------
  ok((await lerCopia(J.page)).linhas.length > 0, '(há cópia antes de sair)');
  await J.page.evaluate(() => TC.conta.sair());
  await J.page.waitForTimeout(300);
  let k1 = await lerCopia(J.page);
  ok(k1.metas.length === 0 && k1.linhas.length === 0, 'sair da conta apaga a cópia');
  await entrarEm(J, c.jog2, 'Pedro');
  await J.page.evaluate(async ([cd, n]) => { await TC.mesas.entrarComCodigo(cd, n); }, [codigo, 'Pedro']);
  J.reqs.length = 0;
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok((await pegar(J, 'teste:fica') || {}).v === 2, 'a outra conta abre a mesa');
  ok(await guardou(J, k => k.metas.length && k.metas.every(m => m.mesa === idMesa)), '(a outra conta tem a cópia dela)');

  // ---------- sair da mesa / perder o acesso apagam ----------
  await J.page.evaluate(() => TC.mesas.sair());
  await J.page.waitForTimeout(400);
  k1 = await lerCopia(J.page);
  ok(k1.metas.length === 0 && k1.linhas.length === 0, 'sair da mesa apaga a cópia dela');
  await J.page.evaluate(async ([cd, n]) => { await TC.mesas.entrarComCodigo(cd, n); }, [codigo, 'Pedro']);
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok(await guardou(J, k => k.metas.length > 0), '(voltou à mesa e tem a cópia)');
  const u2 = await J.page.evaluate(() => TC.conta.usuario.id);
  await A.page.evaluate(async u => { await TC.mesas.tirar(u); }, u2);
  await J.page.evaluate(() => TC.mesas.conferirMembros());
  await J.page.waitForFunction(() => !TC.mesas.atual, null, { timeout: 15000 });
  await J.page.waitForTimeout(400);
  k1 = await lerCopia(J.page);
  ok(k1.metas.length === 0 && k1.linhas.length === 0, 'tirado da mesa: a cópia dela some');
  // tirado enquanto estava fora: a lista das mesas não a traz mais
  await J.page.evaluate(async ([cd, n]) => { await TC.mesas.entrarComCodigo(cd, n); }, [codigo, 'Pedro']);
  await J.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok(await guardou(J, k => k.metas.length > 0), '(voltou à mesa de novo)');
  await J.page.goto(t.base + 'src/tests/vazio.html');
  await A.page.evaluate(async u => { await TC.mesas.tirar(u); }, u2);
  await J.page.goto(t.base, { waitUntil: 'load' });
  await J.page.waitForFunction(() => window.TC && TC.conta.usuario, null, { timeout: 25000 });
  await J.page.evaluate(() => TC.mesas.lista());
  await J.page.waitForFunction(() => !TC.mesas.atual, null, { timeout: 15000 }).catch(() => {});
  await J.page.waitForTimeout(600);
  k1 = await lerCopia(J.page);
  ok(k1.metas.length === 0 && k1.linhas.length === 0, 'tirado com o site fechado: a cópia some ao abrir de novo');

  // ---------- sair por inatividade apaga ----------
  const S = await aparelho('sono');
  await S.ctx.addInitScript(() => { window.TC_SONO = { oculta: 3600e3, semUso: 3600e3, resposta: 3600e3, sair: 7000 }; });
  await entrarEm(S, c.mestre, 'Bruno'); await abrirMesa(S, idMesa);
  ok(await guardou(S, k => k.linhas.some(l => l.id === 'teste:fica')), '(o aparelho da inatividade tem a cópia)');
  await S.page.waitForFunction(() => !TC.conta.usuario, null, { timeout: 25000 });
  await S.page.waitForTimeout(400);
  k1 = await lerCopia(S.page);
  ok(k1.metas.length === 0 && k1.linhas.length === 0, 'deslogar por inatividade apaga a cópia');
  await S.ctx.close();

  // ---------- sem IndexedDB: funciona, baixando tudo, sem erro para a pessoa ----------
  for (const [nome, script] of [
    ['sem IndexedDB', () => { Object.defineProperty(window, 'indexedDB', { configurable: true, get: () => undefined }); }],
    ['IndexedDB que dá erro', () => { const o = IDBFactory.prototype.open; IDBFactory.prototype.open = function () { throw new DOMException('recusado', 'SecurityError'); }; void o; }],
    ['IndexedDB que nunca responde', () => { IDBFactory.prototype.open = function () { return {}; }; }],
    ['gravar no IndexedDB falha', () => { IDBObjectStore.prototype.put = function () { throw new DOMException('cheio', 'QuotaExceededError'); }; }],
  ]) {
    const N = await aparelho('n', script);
    await entrarEm(N, c.mestre, 'Bruno');
    await abrirMesa(N, idMesa);
    ok(baixouTudo(N), nome + ': baixa tudo');
    ok((await pegar(N, 'teste:fica') || {}).v === 2, nome + ': a mesa abre');
    await N.page.evaluate(() => TC.dados.copiaLocal.salvar()); await N.page.waitForTimeout(500);
    await gravar(N, 'teste:sem-idb', { v: nome }, 'mesa'); await subiu(N);
    ok(await N.page.evaluate(() => !!TC.dados.col('documentos').pegar('teste:sem-idb').rev), nome + ': gravar continua funcionando');
    await recarregar(N, idMesa);
    ok(baixouTudo(N) && (await pegar(N, 'teste:sem-idb') || {}).v === nome, nome + ': recarregar baixa tudo e vem certo');
    await N.ctx.close();
  }

  // ---------- gravação pendente não se perde e não entra na cópia ----------
  await recarregar(A, idMesa);
  ok(await guardou(A, k => k.linhas.some(l => l.id === 'teste:muda')), '(o mestre tem a cópia)');
  const trava = r => (r.request().method() === 'GET' ? r.fallback() : r.abort());
  await A.ctx.route('**' + DOCS + '**', trava);
  await gravar(A, 'teste:muda', { v: 'pendente' });
  await A.page.waitForTimeout(1200);
  ok(await A.page.evaluate(() => TC.dados.pendentes > 0), 'sem subir: a mudança fica pendente');
  await A.page.evaluate(() => TC.dados.copiaLocal.salvar()); await A.page.waitForTimeout(600);
  const k2 = await lerCopia(A.page);
  ok(k2.linhas.filter(l => l.id === 'teste:muda').every(l => l.dados.v !== 'pendente'), 'o que está por subir não entra na cópia');
  // (a linha que ainda não estava guardada quando a mudança nasceu: é aqui que a mudança poderia entrar como se fosse do banco)
  const D = await aparelho('demora');
  await D.ctx.addInitScript(() => { window.TC_COPIA = { espera: 3600e3 }; });
  await entrarEm(D, c.mestre, 'Bruno'); await abrirMesa(D, idMesa);
  await D.ctx.route('**' + DOCS + '**', trava);
  await gravar(D, 'teste:fica', { v: 'pendente-d' });
  await D.page.waitForTimeout(800);
  ok(await guardou(D, k => k.linhas.some(l => l.id === 'teste:mais')), '(o aparelho guardou o resto)');
  const kd = await lerCopia(D.page);
  ok(!kd.linhas.some(l => l.id === 'teste:fica'), 'a linha com mudança por subir, ainda sem cópia, fica de fora');
  await D.ctx.close();
  await A.page.goto(t.base + 'src/tests/vazio.html');
  await A.page.waitForTimeout(26500);                    // (a fila guardada de uma aba que fechou é trazida depois de 25 s)
  A.reqs.length = 0;
  await A.page.goto(t.base, { waitUntil: 'load' });
  await A.page.waitForFunction(i => window.TC && TC.mesas.atual && TC.mesas.atual.id === i, idMesa, { timeout: 25000 });
  await A.page.evaluate(() => TC.dados.col('documentos').pronta);
  ok(!baixouTudo(A), 'com algo pendente, a reabertura parte da cópia');
  await A.page.waitForTimeout(500);
  ok((await pegar(A, 'teste:muda') || {}).v === 'pendente', 'a mudança pendente vale por cima da cópia');
  await A.ctx.unroute('**' + DOCS + '**', trava);
  await A.page.evaluate(() => TC.dados.descarregar());
  await subiu(A);
  const B = await aparelho('outro'); await entrarEm(B, c.mestre, 'Bruno'); await abrirMesa(B, idMesa);
  ok((await pegar(B, 'teste:muda') || {}).v === 'pendente', 'a mudança pendente chega ao banco');
  ok(await guardou(A, k => k.linhas.some(l => l.id === 'teste:muda' && l.dados.v === 'pendente')), 'depois de subir, entra na cópia');
  await B.ctx.close();

  // ---------- fim: a mesa de teste sai ----------
  await A.page.evaluate(() => TC.mesas.apagar());
  await A.page.waitForTimeout(400);
  k1 = await lerCopia(A.page);
  ok(k1.metas.length === 0 && k1.linhas.length === 0, 'apagar a mesa apaga a cópia dela');
  ok(!t.errs.some(e => /pageerror/.test(e) || /[Cc]ópia|IndexedDB|IDB/.test(e)), 'nenhum erro da cópia chega à página: ' + t.errs.filter(e => /pageerror/.test(e) || /[Cc]ópia|IndexedDB|IDB/.test(e)).join(' | ').slice(0, 300));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
