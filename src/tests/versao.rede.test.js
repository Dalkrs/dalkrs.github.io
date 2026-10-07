// Duas pessoas mestrando a MESMA cena no MESMO instante, numa mesa de verdade (projeto real): o mestre e o mestre
// auxiliar, cada um no seu aparelho. Antes, a gravação de um passava por cima da do outro (a cena é um documento só),
// e o que o primeiro tinha feito sumia para todos. Agora a cena é gravada conferindo a versão: quem chega depois lê o
// que está lá, junta o que fez e grava de novo.
//   · cada um mexe num token: os dois movimentos ficam;
//   · os dois no mesmo token, em coisas diferentes (um move, o outro dá dano): as duas ficam;
//   · os dois na mesma coisa: vale uma só (a de quem gravou por último), igual nos dois aparelhos;
//   · um inclui, o outro apaga; um desenha um terreno, o outro troca o nome da cena; cada um cria uma cena;
//   · uma rajada de mudanças dos dois lados: no fim os dois aparelhos e o banco mostram a mesma cena;
//   · fechar a mesa logo depois de mexer não deixa nada para trás.
// (Neste ambiente o tempo real não liga: cada aparelho só fica sabendo do outro a cada poucos segundos — o pior caso.)
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const semTour = { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' };
  const dM = await t.device({ name: 'mestre', seed: semTour }), M = dM.page;
  const dA = await t.device({ name: 'auxiliar', w: 1300, h: 860, seed: semTour }), A = dA.page;
  await espiarBanco(dM.ctx);
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 30000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const j = JSON.stringify;
  const salvo = async (p, f) => await p.evaluate(() => TC.dados.pendentes === 0) && await f.evaluate(() => __tc.Persist.status() === 'ok');
  // a cena aberta, como cada aparelho a vê: os tokens (posição e HP, por nome, na ordem), o nome e os terrenos
  const retrato = f => f.evaluate(() => { const sc = __tc.Store.scene(); return { nome: sc.name, toks: sc.tokens.map(k => [k.name, k.x, k.y, k.bars[0] ? k.bars[0].v : null].join(':')).join(' '), terrenos: sc.shapes.filter(s => s.ter).length }; });

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Versão E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await A.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, A);
    await loginTela(A, c.jog1, c.senha); await entrarMesaTela(A, codigo, 'Dalmo');
    const auxId = await A.evaluate(() => TC.conta.usuario.id), mesa = await M.evaluate(() => TC.mesas.atual.id);
    ok(await ate(() => M.evaluate(() => TC.mesas.atual.membros.length === 2)), '(o mestre vê o Dalmo na mesa)');
    await M.evaluate(uid => TC.mesas.definirAuxiliar(uid, true), auxId);
    ok(await ate(() => A.evaluate(() => TC.mesas.atual.cargo === 'auxiliar' && TC.mesas.mestra('cenas'))), 'o Dalmo vira mestre auxiliar, com as Cenas');

    // ---------- o mestre monta a cena: quatro tokens ----------
    let CM = null, CA = null;
    ok(await ate(async () => { CM = await quadro(M, /\/cenas\//); return CM && await CM.evaluate(() => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && !!__tc.Store.scene()); }, 40000), '(o mestre está nas Cenas)');
    if (await CM.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const ids = await CM.evaluate(() => {
      const u = __tc, sc = u.Store.scene(), o = { cena: sc.id };
      u.Store.tx('Criar', () => { ['t1', 't2', 't3', 't4'].forEach((n, i) => { const b = u.newToken(sc, sc.cell * (2 + i * 2), sc.cell * 2, { name: n, bars: [u.cleanBar({ n: 'HP', c: '#d6524b', v: 20, m: 20, k: 'bar', on: true, vis: '' })] }); u.Store.add('tokens', b); o[n] = b.id; }); });
      return o;
    });
    ok(await ate(() => salvo(M, CM)), '(a cena do mestre foi salva)');
    await A.locator('#tab-cenas').click();
    ok(await ate(async () => { CA = await quadro(A, /\/cenas\//); return CA && await CA.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Store.S.current === id && __tc.Store.scene().tokens.length === 4, ids.cena); }, 40000), 'o auxiliar abre a mesma cena, com os quatro tokens');
    if (await CA.locator('.modal').count()) { await A.keyboard.press('Escape'); await w(300, A); }
    const noBanco = () => M.evaluate(async ([mesa, cena]) => {
      const r = await __sb.from('documentos').select('id,dados,rev').eq('mesa_id', mesa).in('id', ['cena:' + cena + ':m', 'cena:' + cena + ':v', 'cenas:indice']);
      const d = {}; for (const l of r.data || []) d[l.id.split(':').pop()] = l.dados;
      return { nome: d.m && d.m.name, toks: ((d.v && d.v.tokens) || []).map(k => [k.name, k.x, k.y, k.bars[0] ? k.bars[0].v : null].join(':')).join(' '), terrenos: ((d.m && d.m.shapes) || []).filter(s => s.ter).length };
    }, [mesa, ids.cena]);
    const cenasNoBanco = () => M.evaluate(async mesa => { const r = await __sb.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', 'cenas:indice').maybeSingle(); return r.data && r.data.dados && Array.isArray(r.data.dados.ordem) ? r.data.dados.ordem.length : 0; }, mesa);
    // os dois aparelhos e o banco contam a mesma cena, e nada mais está por salvar
    const iguais = async () => { if (!(await salvo(M, CM)) || !(await salvo(A, CA))) return false; const a = j(await retrato(CM)), b = j(await retrato(CA)), n = j(await noBanco()); return a === b && a === n; };
    const juntos = async (fm, fa, arg) => Promise.all([CM.evaluate(fm, arg), CA.evaluate(fa, arg)]);
    const mover = ([id, x, y]) => { const u = __tc; u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x, y })); };
    const hp = ([id, v]) => { const u = __tc, k = u.Store.get('tokens', id); u.Store.tx('Dano', () => u.Store.upd('tokens', id, { bars: [Object.assign({}, k.bars[0], { v })] })); };
    const tok = (r, n) => { const m = new RegExp('(?:^| )' + n + ':(-?[\\d.]+):(-?[\\d.]+):(-?[\\d.]+)').exec(r.toks); return m ? { x: +m[1], y: +m[2], hp: +m[3] } : null; };
    ok(await ate(iguais), '(os dois começam vendo a mesma cena, a do banco)');

    // ---------- 1. cada um mexe num token, no mesmo instante ----------
    await Promise.all([CM.evaluate(mover, [ids.t1, 1000, 1010]), CA.evaluate(mover, [ids.t2, 2000, 2020])]);
    ok(await ate(iguais, 45000), 'depois de os dois mexerem ao mesmo tempo, os dois aparelhos e o banco voltam a mostrar a mesma cena');
    let r = await retrato(CM);
    ok(j(tok(r, 't1')) === '{"x":1000,"y":1010,"hp":20}' && j(tok(r, 't2')) === '{"x":2000,"y":2020,"hp":20}', 'os DOIS movimentos ficaram (o do mestre no t1 e o do auxiliar no t2): ' + r.toks);
    const juntou1 = (await M.evaluate(() => TC.dados.juntados || 0)) + (await A.evaluate(() => TC.dados.juntados || 0));
    ok(juntou1 >= 1, 'um dos dois chegou depois, leu o que estava no banco e juntou (' + juntou1 + ' vez(es))');

    // ---------- 2. os dois no mesmo token, em coisas diferentes ----------
    await Promise.all([CM.evaluate(mover, [ids.t3, 3000, 3030]), CA.evaluate(hp, [ids.t3, 7])]);
    ok(await ate(iguais, 45000), '(a mesma cena nos dois e no banco)');
    r = await retrato(CA);
    ok(j(tok(r, 't3')) === '{"x":3000,"y":3030,"hp":7}', 'no mesmo token: o movimento do mestre e o dano do auxiliar ficaram os dois: ' + j(tok(r, 't3')));

    // ---------- 3. os dois na mesma coisa: vale uma, a mesma para todos ----------
    await Promise.all([CM.evaluate(mover, [ids.t4, 4111, 4000]), CA.evaluate(mover, [ids.t4, 4222, 4000])]);
    ok(await ate(iguais, 45000), '(a mesma cena nos dois e no banco)');
    r = await retrato(CM);
    ok([4111, 4222].includes(tok(r, 't4').x) && tok(r, 't4').y === 4000, 'os dois moveram o mesmo token: ficou um dos dois lugares, o mesmo nos dois aparelhos e no banco: x=' + tok(r, 't4').x);
    ok(j(tok(r, 't1')) === '{"x":1000,"y":1010,"hp":20}' && j(tok(r, 't3')) === '{"x":3000,"y":3030,"hp":7}', '(e o que já estava feito continua lá)');

    // ---------- 4. um inclui, o outro apaga ----------
    const [t5] = await Promise.all([
      CM.evaluate(() => { const u = __tc, sc = u.Store.scene(); const b = u.newToken(sc, sc.cell * 12, sc.cell * 6, { name: 't5', bars: [u.cleanBar({ n: 'HP', c: '#d6524b', v: 9, m: 9, k: 'bar', on: true, vis: '' })] }); u.Store.tx('Criar', () => u.Store.add('tokens', b)); return b.id; }),
      CA.evaluate(id => { const u = __tc; u.Store.tx('Apagar', () => u.Store.del('tokens', id)); }, ids.t1),
    ]);
    ok(await ate(iguais, 45000), '(a mesma cena nos dois e no banco)');
    r = await retrato(CA);
    ok(!tok(r, 't1') && !!tok(r, 't5') && tok(r, 't5').hp === 9 && !!tok(r, 't2') && !!tok(r, 't3') && !!tok(r, 't4'), 'o token que o mestre incluiu está lá, e o que o auxiliar apagou saiu: ' + r.toks);

    // ---------- 5. o mapa: um desenha um terreno, o outro troca o nome da cena; e cada um cria uma cena ----------
    await Promise.all([
      CM.evaluate(() => { const u = __tc, sc = u.Store.scene(), s = u.Combate.newTerrain({ k: 'rect', x: sc.cell * 3, y: sc.cell * 8, w: sc.cell * 4, h: sc.cell * 3 }, 'morro', 2); u.Store.tx('Terreno', () => u.Store.add('shapes', s)); }),
      CA.evaluate(() => { const u = __tc; u.Store.tx('Nome', () => u.Store.scn({ name: 'A Guarita em Ruínas' })); }),
    ]);
    ok(await ate(iguais, 45000), '(a mesma cena nos dois e no banco)');
    r = await retrato(CM);
    ok(r.terrenos === 1 && r.nome === 'A Guarita em Ruínas', 'no mapa: o terreno do mestre e o nome que o auxiliar deu ficaram os dois — ' + j({ terrenos: r.terrenos, nome: r.nome }));
    await Promise.all([
      CM.evaluate(() => { const u = __tc, sc = u.newScene('Cena do mestre'); u.Store.addScene(sc); u.Persist.scene(sc.id); }),
      CA.evaluate(() => { const u = __tc, sc = u.newScene('Cena do auxiliar'); u.Store.addScene(sc); u.Persist.scene(sc.id); }),
    ]);
    const nomes = f => f.evaluate(() => __tc.Store.S.order.map(id => __tc.Store.S.scenes[id].name).sort().join(' | '));
    ok(await ate(async () => await iguais() && await nomes(CM) === 'A Guarita em Ruínas | Cena do auxiliar | Cena do mestre' && await nomes(CA) === await nomes(CM) && await cenasNoBanco() === 3, 45000),
      'cada um criou uma cena ao mesmo tempo: as duas existem para os dois, e a lista do banco tem as três — ' + await nomes(CM) + ' · ' + await nomes(CA) + ' · ' + await cenasNoBanco());

    // ---------- 6. uma rajada dos dois lados ----------
    const rajada = async ([id, x0]) => { const u = __tc; for (let i = 1; i <= 8; i++) { u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: x0 + i, y: 5000 + i })); await new Promise(r => setTimeout(r, 350)); } };
    await Promise.all([CM.evaluate(rajada, [ids.t2, 6000]), CA.evaluate(rajada, [ids.t3, 7000])]);
    ok(await ate(iguais, 60000), 'depois de uma rajada de mudanças dos dois lados, os dois aparelhos e o banco mostram a mesma cena');
    r = await retrato(CM);
    ok(j(tok(r, 't2')) === '{"x":6008,"y":5008,"hp":20}' && j(tok(r, 't3')) === '{"x":7008,"y":5008,"hp":7}', 'cada token ficou onde o último movimento do dono da rajada o deixou: ' + j([tok(r, 't2'), tok(r, 't3')]));
    await w(8000);
    ok(await iguais(), 'e continua assim alguns segundos depois (ninguém fica regravando por cima do outro)');
    const revs = async () => M.evaluate(async ([mesa, cena]) => (await __sb.from('documentos').select('id,rev').eq('mesa_id', mesa).in('id', ['cena:' + cena + ':m', 'cena:' + cena + ':v'])).data.map(l => l.rev).join(','), [mesa, ids.cena]);
    const r1 = await revs(); await w(7000);
    ok(await revs() === r1, 'com tudo parado, ninguém grava mais nada na cena: ' + r1);

    // ---------- 7. fechar a mesa logo depois de mexer ----------
    await CA.evaluate(mover, [ids.t4, 8000, 8080]);
    await A.locator('#btnConta').click(); await w(300, A);
    await A.locator('#menu .lk', { hasText: 'Fechar a mesa neste navegador' }).click();
    ok(await ate(async () => { const n = await noBanco(); const k = tok(n, 't4'); return !!k && k.x === 8000 && k.y === 8080; }), 'o auxiliar mexe e fecha a mesa em seguida: o que ele fez chegou ao banco');
    ok(await ate(async () => { const k = tok(await retrato(CM), 't4'); return !!k && k.x === 8000; }), 'e o mestre vê');
    ok(await ate(() => salvo(M, CM)), '(tudo salvo)');
    await M.locator('#tab-fichas').click(); await w(400);
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await M.keyboard.press('Escape'); await M.evaluate(async () => { if (TC.mesas.atual) await TC.mesas.apagar(); }); } catch (e) { console.log('(a mesa de teste não pôde ser apagada: ' + String(e.message).split('\n')[0] + ')'); } }
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
