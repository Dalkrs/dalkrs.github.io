// (lote 203) A pintura do Mapa-múndi em documento próprio (mundo:pinm / mundo:pinp): nada se perde, o jogador vê a pintura,
// mexer num objeto não regrava nem reenvia a pintura, pintar grava só a pintura, esconder e apagar levam a pintura junto.
const { start, checker, BANCO } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const docs = (p) => p.evaluate(() => Object.fromEntries(TC.dados.col('documentos').todas().filter(l => l.id.startsWith('mundo:')).map(l => [l.id, { rev: l.rev, pint: l.dados && l.dados.pintura && Array.isArray(l.dados.pintura.ops) ? l.dados.pintura.ops.length : null }])));
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); }
  const DM = await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'mundo' } }), M = DM.page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'mundo' } })).page;
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const q = p => p.frame({ url: /\/mundo\// });
  const noM = (p, fn, a) => q(p).evaluate(fn, a);
  const pronto = p => ate(async () => q(p) && await noM(p, () => window.__mundo && __mundo.App.pronto));
  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await M.waitForTimeout(1200);
  await loginTela(M, c.mestre, c.senha);
  const nome = 'Pintura E2E ' + Date.now().toString(36), codigo = await criarMesaTela(M, nome);
  ok(await pronto(M), 'o mestre abre o Mapa-múndi');
  // ---------- um mapa com grade e muita pintura ----------
  ok(await noM(M, () => !!__mundo.App.criarMapa('Terras')), 'cria o mapa');
  const pincelar = n => { const ops = []; for (let i = 0; i < n; i++) ops.push({ t: i % 2 ? 'mo' : 'fl', r: 30, pts: [[i * 3, 40], [i * 3 + 20, 80], [i * 3 + 40, 120]] }); return ops; };
  ok(await noM(M, ops => __mundo.App.mudar('pintura', m => { m.grade.tam = 40; m.pintura = { alfa: 1, ops }; }), pincelar(300)) !== false, 'pinta 300 pinceladas');
  ok(await noM(M, () => __mundo.App.mostrarAosJogadores()), 'mostra aos jogadores');
  const idMapa = await noM(M, () => __mundo.App.mapa.id);
  const K = { mapa: 'mundo:mapa:' + idMapa, pub: 'mundo:pub:' + idMapa, pm: 'mundo:pinm:' + idMapa, pp: 'mundo:pinp:' + idMapa };
  const nOps = () => noM(M, () => __mundo.App.mapa && __mundo.App.mapa.pintura ? __mundo.App.mapa.pintura.ops.length : 0);
  ok(await ate(async () => { const d = await docs(M); return d[K.pm] && d[K.pm].rev > 0 && d[K.pp] && d[K.pp].rev > 0; }), 'a pintura sobe para os documentos próprios');
  await noM(M, () => __mundo.App.mudar('objeto', m => { m.objs.push(__mundo.N.objNovo('m', { x: 100, y: 100, nome: 'Vila' })); }));
  ok(await ate(async () => { const d = await docs(M); return d[K.mapa].pint === null && d[K.pub].pint === null; }), 'as cópias do mapa ficam sem a pintura');
  let d = await docs(M);
  ok(d[K.pm].pint === 300 && d[K.pp].pint === 300, 'as 300 pinceladas estão nos documentos da pintura');
  ok(await nOps() === 300, 'na tela do mestre, nada mudou');
  // ---------- mexer num objeto não envia a pintura ----------
  await M.waitForTimeout(6000);
  const pedidos = []; DM.ctx.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'OPTIONS' && r.url().includes('/documentos')) pedidos.push({ u: decodeURIComponent(r.url()), n: (r.postData() || '').length }); });
  await noM(M, () => __mundo.App.mudar('rio', m => { m.objs.push(__mundo.N.objNovo('m', { x: 300, y: 100, nome: 'Rio' })); }));
  await M.waitForTimeout(7000);
  ok(pedidos.length >= 2 && !pedidos.some(x => x.u.includes('mundo:pin')), 'mexer num objeto não regrava a pintura: ' + pedidos.length + ' gravações');
  ok(pedidos.every(x => x.n < 8000), 'e cada gravação é pequena: até ' + Math.max(...pedidos.map(x => x.n)) + ' bytes');
  pedidos.length = 0;
  await noM(M, () => __mundo.App.mudar('mais uma', m => { m.pintura.ops.push({ t: 'mo', r: 20, pts: [[5, 5], [30, 30]] }); }));
  await M.waitForTimeout(7000);
  ok(pedidos.some(x => x.u.includes(K.pm)) && pedidos.some(x => x.u.includes(K.pp)) && !pedidos.some(x => x.u.includes(K.mapa) || x.u.includes(K.pub)), 'pintar grava só a pintura: ' + pedidos.map(x => x.u.split('&id=eq.')[1]).join(' | ').slice(0, 260));
  // ---------- o jogador ----------
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await J.waitForTimeout(1000);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  ok(await pronto(J), 'o jogador abre o Mapa-múndi');
  ok(await ate(() => noM(J, id => __mundo.App.mapa && __mundo.App.mapa.id === id && __mundo.App.mapa.pintura && __mundo.App.mapa.pintura.ops.length === 301, idMapa)), 'o jogador vê a pintura inteira');
  const jd = await docs(J);
  ok(!jd[K.pm] && !jd[K.mapa], 'o jogador não recebe a pintura nem o mapa do mestre');
  ok(jd[K.pp] && jd[K.pp].pint === 301, 'recebe a pintura dos jogadores');
  await noM(M, () => __mundo.App.mudar('outra', m => { m.pintura.ops.push({ t: 'fl', r: 20, pts: [[50, 50], [60, 60]] }); }));
  ok(await ate(() => noM(J, () => __mundo.App.mapa.pintura.ops.length === 302)), 'pincelada nova chega ao jogador');
  // ---------- esconder apaga, revelar volta ----------
  await noM(M, () => __mundo.App.mudar('esconder', m => { m.oculto = true; }));
  ok(await ate(async () => { const x = await docs(J); return !x[K.pp] && !x[K.pub]; }, 9000), 'esconder o mapa tira a pintura do jogador');
  await noM(M, () => __mundo.App.mudar('revelar', m => { delete m.oculto; }));
  ok(await ate(async () => { const x = await docs(J); return x[K.pp] && x[K.pp].pint === 302; }), 'revelar devolve a pintura');
  // ---------- apagar toda a pintura vale ----------
  await noM(M, () => __mundo.App.mudar('limpar', m => { m.pintura.ops = []; }));
  await M.waitForTimeout(6500); await noM(M, () => __mundo.App.salvarJa && __mundo.App.salvarJa());
  await M.reload({ waitUntil: 'load' }); ok(await pronto(M), 'o mestre recarrega');
  ok(await ate(async () => (await nOps()) === 0, 8000), 'limpar a pintura continua limpo depois de recarregar: ' + await nOps());
  await noM(M, ops => __mundo.App.mudar('de novo', m => { m.pintura = { alfa: 1, ops }; }), pincelar(50));
  await M.waitForTimeout(6500); await noM(M, () => __mundo.App.salvarJa && __mundo.App.salvarJa());
  await M.reload({ waitUntil: 'load' }); ok(await pronto(M), 'recarrega de novo');
  ok(await ate(async () => (await nOps()) === 50), 'depois de recarregar, a pintura inteira está lá: ' + await nOps());
  // ---------- um aparelho antigo grava a pintura dentro do mapa ----------
  await M.evaluate(([k, ops]) => { const l = TC.dados.col('documentos').pegar(k); TC.dados.col('documentos').gravar(k, { dados: Object.assign({}, l.dados, { pintura: { alfa: 1, ops } }), vis: 'mestre' }); }, [K.mapa, pincelar(7)]);
  ok(await ate(async () => (await nOps()) === 7), 'a pintura que vem dentro do mapa (aparelho antigo) vale');
  // ---------- apagar o mapa leva a pintura ----------
  await noM(M, () => __mundo.App.apagarMapa && __mundo.App.apagarMapa());
  ok(await ate(async () => { const x = await docs(M); return !x[K.pm] && !x[K.pp]; }), 'apagar o mapa apaga a pintura do mestre e a dos jogadores');
  await apagarMesaTela(M, nome);
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
