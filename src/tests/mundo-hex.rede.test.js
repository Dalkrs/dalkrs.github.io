// (lote 87) A grade de hexágonos em documento próprio: nada se perde, o jogador vê o terreno, a névoa e o esconder continuam
// protegendo, e mexer no mapa sem mexer na grade não regrava nem reenvia a grade.
const { start, checker, BANCO } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const docs = (p) => p.evaluate(() => Object.fromEntries(TC.dados.col('documentos').todas().filter(l => l.id.startsWith('mundo:')).map(l => [l.id, { rev: l.rev, hex: l.dados && l.dados.hexes ? Object.keys(l.dados.hexes).length : null }])));
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
  const nome = 'Hex E2E ' + Date.now().toString(36), codigo = await criarMesaTela(M, nome);
  ok(await pronto(M), 'o mestre abre o Mapa-múndi');
  // ---------- um mapa com grade grande ----------
  ok(await noM(M, () => !!__mundo.App.criarMapa('Terras')), 'cria o mapa');
  ok(await noM(M, () => __mundo.App.mudar('grade', m => { m.grade.tam = 40; for (let q = 0; q < 40; q++) for (let r = 0; r < 40; r++) m.hexes[q + ',' + r] = q % 2 ? 'mo' : ['fl', 5]; })), 'pinta 1.600 hexágonos');
  ok(await noM(M, () => __mundo.App.mostrarAosJogadores()), 'mostra aos jogadores');
  const idMapa = await noM(M, () => __mundo.App.mapa.id);
  const K = { mapa: 'mundo:mapa:' + idMapa, pub: 'mundo:pub:' + idMapa, hm: 'mundo:hexm:' + idMapa, hp: 'mundo:hexp:' + idMapa };
  ok(await ate(async () => { const d = await docs(M); return d[K.hm] && d[K.hm].rev > 0 && d[K.hp] && d[K.hp].rev > 0; }), 'a grade sobe para os documentos próprios');
  // o primeiro gesto depois disso já leva as cópias sem a grade
  await noM(M, () => __mundo.App.mudar('objeto', m => { m.objs.push(__mundo.N.objNovo('m', { x: 100, y: 100, nome: 'Vila' })); }));
  ok(await ate(async () => { const d = await docs(M); return d[K.mapa].hex === null && d[K.pub].hex === null; }), 'as cópias do mapa ficam sem a grade');
  let d = await docs(M);
  ok(d[K.hm].hex === 1600 && d[K.hp].hex === 1600, 'as 1.600 estão nos documentos da grade');
  ok(await noM(M, () => Object.keys(__mundo.App.mapa.hexes).length === 1600 && JSON.stringify(__mundo.App.mapa.hexes['0,0']) === '["fl",5]'), 'na tela do mestre, nada mudou');
  // ---------- gesto sem grade não envia a grade ----------
  await M.waitForTimeout(6000);
  const pedidos = []; DM.ctx.on('request', r => { if (r.method() !== 'GET' && r.method() !== 'OPTIONS' && r.url().includes('/documentos')) pedidos.push({ u: decodeURIComponent(r.url()), n: (r.postData() || '').length }); });
  await noM(M, () => __mundo.App.mudar('rio', m => { m.objs.push(__mundo.N.objNovo('m', { x: 300, y: 100, nome: 'Rio' })); }));
  await M.waitForTimeout(7000);
  ok(pedidos.length >= 2 && !pedidos.some(x => x.u.includes('mundo:hex')), 'mexer num objeto não regrava a grade: ' + pedidos.length + ' gravações');
  ok(pedidos.every(x => x.n < 8000), 'e cada gravação é pequena: até ' + Math.max(...pedidos.map(x => x.n)) + ' bytes');
  pedidos.length = 0;
  await noM(M, () => __mundo.App.mudar('um hex', m => { m.hexes['0,1'] = 'mo'; }));
  await M.waitForTimeout(7000);
  ok(pedidos.some(x => x.u.includes(K.hm)) && pedidos.some(x => x.u.includes(K.hp)) && !pedidos.some(x => x.u.includes(K.mapa) || x.u.includes(K.pub)), 'pintar um hexágono grava só a grade: ' + pedidos.map(x => x.u.split('&id=eq.')[1]).join(' | ').slice(0, 260));
  // ---------- o jogador ----------
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await J.waitForTimeout(1000);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  ok(await pronto(J), 'o jogador abre o Mapa-múndi');
  ok(await ate(() => noM(J, id => __mundo.App.mapa && __mundo.App.mapa.id === id && Object.keys(__mundo.App.mapa.hexes).length === 1600, idMapa)), 'o jogador vê o terreno: ' + await noM(J, () => __mundo.App.mapa && Object.keys(__mundo.App.mapa.hexes).length));
  ok(await noM(J, () => __mundo.App.mapa.hexes['0,1'] === 'mo'), 'e o hexágono que acabou de mudar');
  await noM(M, () => __mundo.App.mudar('outro hex', m => { m.hexes['2,2'] = 'mo'; }));
  ok(await ate(() => noM(J, () => __mundo.App.mapa.hexes['2,2'] === 'mo')), 'pintura nova chega ao jogador');
  // o banco não entrega ao jogador a grade do mestre
  const jd = await docs(J);
  ok(!jd[K.hm] && !jd[K.mapa], 'o jogador não recebe a grade nem o mapa do mestre');
  ok(jd[K.hp] && jd[K.hp].hex === 1600, 'recebe a grade dos jogadores');
  // ---------- névoa ----------
  ok(await noM(M, () => __mundo.App.mudar('névoa', m => { m.nevoa.on = true; m.nevoa.ops = [{ t: '-', k: 'r', x: -9999, y: -9999, w: 99999, h: 99999 }]; })) !== false, 'o mestre cobre o mapa com névoa');
  const coberto = await noM(M, () => { const p = __mundo.N.projetar(__mundo.App.mapa, {}); return Object.keys(p.hexes).length; });
  ok(await ate(async () => { const x = await docs(M); return x[K.hp] && x[K.hp].hex === coberto; }), 'a grade dos jogadores acompanha a névoa: ' + coberto);
  ok(await ate(async () => { const x = await docs(J); return x[K.hp] && x[K.hp].hex === coberto; }), 'e é só isso que chega ao jogador');
  await noM(M, () => __mundo.App.mudar('sem névoa', m => { m.nevoa.on = false; m.nevoa.ops = []; }));
  // ---------- esconder apaga, revelar volta ----------
  await noM(M, () => __mundo.App.mudar('esconder', m => { m.oculto = true; }));
  ok(await ate(async () => { const x = await docs(J); return !x[K.hp] && !x[K.pub]; }, 9000), 'esconder o mapa tira a grade do jogador, sem esperar');
  await noM(M, () => __mundo.App.mudar('revelar', m => { delete m.oculto; }));
  ok(await ate(() => noM(J, id => __mundo.App.mapa && __mundo.App.mapa.id === id && Object.keys(__mundo.App.mapa.hexes).length > 1500, idMapa)) || await ate(async () => { const x = await docs(J); return x[K.hp] && x[K.hp].hex > 1500; }), 'revelar devolve o terreno');
  // ---------- recarregar ----------
  await M.waitForTimeout(6500); await noM(M, () => __mundo.App.salvarJa && __mundo.App.salvarJa());
  await M.reload({ waitUntil: 'load' }); ok(await pronto(M), 'o mestre recarrega');
  ok(await ate(() => noM(M, () => __mundo.App.mapa && Object.keys(__mundo.App.mapa.hexes).length === 1600)), 'depois de recarregar, a grade inteira está lá: ' + await noM(M, () => __mundo.App.mapa && Object.keys(__mundo.App.mapa.hexes).length));
  // ---------- a cópia de antes, e um aparelho antigo que grava só o que mexeu ----------
  const leg = 'mp_legado1';
  await M.evaluate(id => { TC.dados.col('documentos').gravar('mundo:mapa:' + id, { dados: { v: 1, id, nome: 'Antigo', larg: 800, alt: 600, grade: { tam: 40, x: 0, y: 0, orient: 'pontuda', des: 0 }, hexes: { '1,1': 'mo', '2,2': 'mo' }, objs: [] }, vis: 'mestre' }); }, leg);
  ok(await ate(() => noM(M, id => __mundo.App.mapas.some(x => x.id === id), leg)), 'um mapa no formato antigo aparece na lista');
  ok(await noM(M, id => { const m = __mundo.App.carregarMapa ? __mundo.App.carregarMapa(id) : null; return !m || Object.keys(m.hexes).length === 2; }, leg), 'e abre com a grade dentro');
  const kA = K.mapa;
  await M.evaluate(([k]) => { const l = TC.dados.col('documentos').pegar(k); TC.dados.col('documentos').gravar(k, { dados: Object.assign({}, l.dados, { hexes: { '99,99': 'fl' } }), vis: 'mestre' }); }, [kA]);
  ok(await ate(() => noM(M, () => __mundo.App.mapa && __mundo.App.mapa.hexes['99,99'] === 'fl' && Object.keys(__mundo.App.mapa.hexes).length === 1601)), 'aparelho antigo grava só um hexágono: os outros continuam lá');
  // ---------- apagar o mapa leva a grade ----------
  await noM(M, () => __mundo.App.apagarMapa && __mundo.App.apagarMapa());
  ok(await ate(async () => { const x = await docs(M); return !x[K.hm]; }), 'apagar o mapa apaga a grade do mestre');
  ok(await ate(async () => { const x = await docs(M); return !x[K.hp]; }), 'e a dos jogadores');
  await apagarMesaTela(M, nome);
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
