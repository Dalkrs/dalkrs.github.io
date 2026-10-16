// Lote 7, parte 3a (as Cenas), numa mesa de verdade (banco local de ensaio ou o projeto real), com o mestre e um
// jogador em aparelhos separados:
//   · a faixa de cinema: o mestre vê "Rodada 1" e "Vez de…" (com a cor do lado: a ficha do Goblin diz Inimigo); o
//     jogador vê "Sua vez!" na vez do token dele e, na dos outros, a faixa pequena de sempre; os sons tocam em cada
//     aparelho com a chave de som ligada nele;
//   · o Agigantado que o jogador põe no token dele: o mestre dobra o tamanho (e a mesa leva), e tirar devolve;
//   · o Escudado: o número é a sobrevida (o jogador vê os pontos até no token do mestre que só mostra a proporção) e
//     ele sai quando a sobrevida acaba — com o dano do mestre ou o do jogador.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const ficha = (nome, extra) => Object.assign({ nome, raca: 'Elfa da neve', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, poderes: [],
  defesas: { DFF: 3, DFM: 6 }, defEsp: {}, rol: { fixa: 5, fonte: 'total' }, ini: 'AGI/5', disputa: {}, estaque: { a: '', b: '' }, habilidades: [], notas: '', recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], itens: [] }, extra);
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const seed = { 'tinycats:aba': 'fichas', 'tinycats-tour': '1', 'tinycats:som': '1' };
  const M = (await t.device({ name: 'mestre', seed })).page;
  const J = (await t.device({ name: 'jogador', w: 1300, h: 860, seed })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re, vezes = 60) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(250); } };
  const parado = p => p.evaluate(() => TC.dados.pendentes === 0);
  const foto = async (p, nome) => { if (process.env.FOTOS) await p.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const cine = f => f.evaluate(() => { const c = document.getElementById('cine'), tx = id => (document.getElementById(id) || {}).textContent || ''; return { on: !c.hidden, cls: c.className, k: tx('cineK'), n: tx('cineN'), r: tx('cineR') }; });
  const pequena = f => f.evaluate(() => { const b = document.getElementById('turnb'); return b.hidden ? '' : b.textContent; });
  const tok = (f, id) => f.evaluate(id => JSON.parse(JSON.stringify(__tc.Store.get('tokens', id) || null)), id);
  const escudo = (f, id) => f.evaluate(id => { const k = __tc.Store.get('tokens', id); return k ? { tem: k.conds.includes('escudado'), n: __tc.condNum(k, 'escudado') } : null; }, id);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Cenas L7 E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa, { semCodigo: false });
  let apagada = false;
  try {
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
    const jogId = await J.evaluate(() => TC.conta.usuario.id);
    await M.evaluate(([fs, uid]) => {
      const P = TC.dados.col('personagens'), base = { skills: { arvores: [], pontos: {}, alocados: {} }, estado: {} };
      P.gravar('pc_selene', Object.assign({}, base, { nome: 'Selene', ficha: fs[0], dono_id: uid, vis: 'mesa', ordem: 0 }));
      P.gravar('pc_gob', Object.assign({}, base, { nome: 'Goblin batedor', ficha: fs[1], dono_id: null, vis: 'mestre', ordem: 1 }));
    }, [[ficha('Selene'), ficha('Goblin batedor', { lado: 'Inimigo' })], jogId]);
    ok(await ate(() => parado(M)), '(as fichas sobem para a mesa)');
    await M.locator('#tab-cenas').click();
    let C = null, B = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(id => !!window.__tc && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('pc_gob') && __tc.Store.S.players.some(p => p.id === id), jogId); }, 40000), '(o mestre está nas Cenas, com as fichas e o jogador da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const ids = await C.evaluate(() => {
      const u = __tc, sc = u.Store.scene(), cl = sc.cell;
      const a = u.newToken(sc, cl * 3, cl * 3, { name: 'x' }), g = u.newToken(sc, cl * 7, cl * 3, { name: 'y' }), l = u.newToken(sc, cl * 11, cl * 3, { name: 'Lobo', barVis: 'bar' });
      u.Store.tx('Criar', () => { u.Store.add('tokens', a); u.Store.add('tokens', g); u.Store.add('tokens', l); });
      u.Fichas.link(u.Store.get('tokens', a.id), 'pc_selene'); u.Fichas.link(u.Store.get('tokens', g.id), 'pc_gob');
      return { sel: a.id, gob: g.id, lobo: l.id };
    });
    ok(await C.evaluate(([s, uid]) => { const k = __tc.Store.get('tokens', s); return k.char === 'pc_selene' && k.owner === uid; }, [ids.sel, jogId]), '(o token da Selene é do jogador, ligado à ficha)');
    await C.locator('#airBtn').click(); await w(250);
    await C.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(400);
    await J.locator('#tab-cenas').click();
    ok(await ate(async () => { B = await quadro(J, /\/cenas\//); return B && await B.evaluate(([a, b, l]) => !!window.__tc && __tc.Nuvem.modo() === 'jogador' && !!__tc.Store.get('tokens', a) && !!__tc.Store.get('tokens', b) && !!__tc.Store.get('tokens', l), [ids.sel, ids.gob, ids.lobo]); }, 40000), 'o jogador vê a cena no ar, com os três tokens');
    await J.waitForTimeout(800);
    if (await B.locator('.modal').count()) { await J.keyboard.press('Escape'); await w(300, J); }

    // ---------- a faixa de cinema ----------
    await C.evaluate(i => {
      const u = __tc, ts = [i.sel, i.gob, i.lobo].map(id => u.Store.get('tokens', id));
      u.Act.turnAdd(ts);
      u.Act.turnPatch(x => { const v = { [i.sel]: 15, [i.gob]: 10, [i.lobo]: 5 }; for (const e of x.list) e.init = v[e.token]; u.turnSort(x.list); x.cur = x.list[0].id; }, 'Iniciativas');
      u.setSel([]);
    }, ids); await w(300);
    ok(await ate(async () => await B.evaluate(() => __tc.Store.scene().turn.list.length === 3)), '(a ordem chega ao jogador)');
    await C.evaluate(() => __tc.Act.turnStep(1));            // o combate começa, na vez da Selene
    ok(await ate(async () => { const v = await cine(C); return v.on && v.cls === 'cine rodada' && v.r === 'Rodada1'; }, 3000), 'o mestre começa o combate: "Rodada 1" na tela dele');
    ok(await ate(async () => { const v = await cine(C); return v.n === 'Vez de Selene' && v.cls === 'cine aliado'; }, 4000), '…e então "Vez de Selene", na cor dos aliados');
    ok(await ate(async () => { const v = await cine(B); return v.on && (v.r === 'Rodada1' || v.n === 'Sua vez!'); }, 20000), 'no aparelho do jogador, a faixa de cinema chega também (a vez é do token dele)');
    ok(await ate(async () => { const v = await cine(B); return v.n === 'Sua vez!' && v.cls === 'cine sua' && v.k === 'Rodada 1 · Selene'; }, 4000), '"Sua vez!", com a rodada e o nome da personagem: ' + JSON.stringify(await cine(B)));
    ok(await B.evaluate(() => __tc.Som.ultimo === 'sua') && !(await pequena(B)), 'com a chave de som ligada no aparelho dele, os toques do "Sua vez!" (e nada da faixa pequena)');
    await foto(J, 'l7-sua-vez');
    await w(2600);
    await C.evaluate(() => __tc.Act.turnStep(1));            // a vez do Goblin
    ok(await ate(async () => { const v = await cine(C); return v.n === 'Vez de Goblin batedor' && v.cls === 'cine inimigo'; }, 3000) && await C.evaluate(() => __tc.Som.ultimo === 'inimigo'), 'a vez do Goblin: a ficha dele diz Inimigo — a faixa vermelha e o tambor, no mestre');
    await foto(M, 'l7-vez-do-goblin');
    ok(await ate(async () => /Vez de Goblin batedor/.test(await pequena(B)), 20000) && !(await cine(B)).on, 'o jogador, na vez de outro: a faixa pequena de sempre ("Vez de Goblin batedor"), sem a de cinema');

    // ---------- o Agigantado, pelo jogador ----------
    await B.evaluate(id => { const u = __tc; u.Act.condToggle([u.Store.get('tokens', id)], 'agigantado'); }, ids.sel);
    ok(await ate(async () => { const k = await tok(C, ids.sel); return k.conds.includes('agigantado') && k.size === 2 && k.tam0 === 1; }, 20000), 'o jogador põe o Agigantado na Selene: no mestre, o token dobra (1 → 2)');
    ok(await ate(async () => (await tok(B, ids.sel)).size === 2, 20000), '…e a mesa leva o tamanho novo ao jogador');
    await B.evaluate(id => { const u = __tc; u.Act.condToggle([u.Store.get('tokens', id)], 'agigantado'); }, ids.sel);
    ok(await ate(async () => { const k = await tok(C, ids.sel); return !k.conds.includes('agigantado') && k.size === 1 && !(k.tam0 > 0); }, 20000) && await ate(async () => (await tok(B, ids.sel)).size === 1, 20000), 'ele tira: o tamanho volta a 1, nos dois aparelhos');

    // ---------- o Escudado ----------
    // no Lobo (do mestre; o jogador vê só a proporção da barra): os pontos chegam assim mesmo
    await C.evaluate(id => { const u = __tc; u.Act.barExtra(u.Store.get('tokens', id), 0, 6); u.Act.condToggle([u.Store.get('tokens', id)], 'escudado'); }, ids.lobo);
    ok(JSON.stringify(await escudo(C, ids.lobo)) === '{"tem":true,"n":6}', 'o mestre dá 6 de sobrevida ao Lobo e o Escudado: 6');
    ok(await ate(async () => JSON.stringify(await escudo(B, ids.lobo)) === '{"tem":true,"n":6}', 20000), 'o jogador vê o Escudado do Lobo com 6 (a barra dele vai só em proporção, os pontos do escudo vão): ' + JSON.stringify(await escudo(B, ids.lobo)));
    await C.evaluate(id => { const u = __tc; u.setSel([{ c: 'tokens', id }]); }, ids.lobo); await w(300);
    await C.locator('#hud-b0').fill('-8'); await C.locator('#hud-b0').press('Enter'); await w(300);
    ok(JSON.stringify(await escudo(C, ids.lobo)) === '{"tem":false,"n":0}', 'o mestre tira 8 do Lobo na barrinha: a sobrevida acaba e o Escudado sai');
    ok(await ate(async () => JSON.stringify(await escudo(B, ids.lobo)) === '{"tem":false,"n":0}', 20000), '…e sai também na tela do jogador');
    await C.evaluate(() => __tc.setSel([]));
    // na Selene (do jogador, ligada à ficha): o dano que ele mesmo tira acaba com a sobrevida
    await C.evaluate(id => { const u = __tc; u.Act.barExtra(u.Store.get('tokens', id), 0, 5); u.Act.condToggle([u.Store.get('tokens', id)], 'escudado'); }, ids.sel);
    ok(await ate(async () => JSON.stringify(await escudo(B, ids.sel)) === '{"tem":true,"n":5}', 20000), 'o mestre dá 5 de sobrevida e o Escudado à Selene: o jogador vê 5');
    await foto(J, 'l7-escudado-jogador');
    await B.evaluate(id => { const u = __tc; u.Act.barSet(u.Store.get('tokens', id), 0, '-7'); }, ids.sel);
    ok(await ate(async () => JSON.stringify(await escudo(C, ids.sel)) === '{"tem":false,"n":0}', 20000), 'o jogador tira 7 da Selene: no mestre, a sobrevida acaba e o Escudado sai');
    ok(await ate(async () => { const e = await escudo(B, ids.sel), k = await tok(B, ids.sel); return JSON.stringify(e) === '{"tem":false,"n":0}' && k.bars[0].v === 98; }, 20000), '…e o jogador vê: sem o Escudado, e 2 de dano na Vida (100 → 98): ' + JSON.stringify(await tok(B, ids.sel).then(k => k && k.bars[0])));

    ok(await ate(async () => await parado(M) && await C.evaluate(() => __tc.Persist.status() === 'ok')), '(tudo salvo)');
    // ---------- limpeza ----------
    await M.locator('#tab-fichas').click(); await w(500);
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
