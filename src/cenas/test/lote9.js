// Bateria do lote 9, no navegador, sem o site (SO=duplicado,... roda só umas partes):
//   · (parte 1, SO=duplicado) o Duplicado — o gêmeo maligno: a janela (as barras cheias ou como estão; entrar na ordem
//     de turnos logo depois do copiado; o aviso de que vai sem ficha), o gêmeo ao lado do copiado (igual: nome, imagem,
//     tamanho, cor; sem dono; com a condição Duplicado e a marca de quem ele copia), as barras cheias (sem sobrevida,
//     podre e condições) e como estão (com as condições e a ferida), a ordem de turnos (logo depois, com a mesma iniciativa), o
//     painel do gêmeo (de quem é cópia, ir até o original, tirar da cena), o gêmeo que cai (o aviso oferece tirar da
//     cena; nada some sozinho), tirar a condição (vira um token comum), desfazer, o que vai para os jogadores (igual ao
//     original: sem a marca e sem a condição), um token de cada vez e só tokens, as zonas que não aplicam a condição e a
//     marca que só vale com o id de outro token.
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  const toastTxt = () => ev(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
  const limparToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const tok = id => ev(id => { const t = __tc.Store.get('tokens', id); return t ? JSON.parse(JSON.stringify(t)) : null; }, id);
  const desfazer = async () => { await ev(() => __tc.Tools.undo()); await w(220); };
  const abrir = async id => { await ev(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.App.tab = 'sel'; __tc.App.sideOpen = true; __tc.UI.renderAll(); }, id); await w(250); };
  const gemeos = id => ev(id => __tc.Store.scene().tokens.filter(x => x.dup === id).map(x => x.id), id);
  // uma cena nova, com tokens (nome, x em quadrados) — devolve os ids
  const novaCena = nomes => ev(nomes => {
    const u = __tc, sc = u.newScene('Lote 9');
    u.Store.addScene(sc); u.Store.S.current = sc.id; u.UI.renderAll();
    const out = [];
    u.Store.tx('tokens', () => nomes.forEach((nm, i) => {
      const k = u.newToken(sc, (3 + 4 * i) * sc.cell, 3 * sc.cell, { name: nm });
      k.bars = [{ n: 'HP', v: 30, m: 30, c: '#d65a5a', on: true, k: 'bar' }, { n: 'SP', v: 10, m: 10, c: '#5a8ad6', on: true, k: 'bar' }];
      u.Store.add('tokens', k); out.push(k.id);
    }));
    return out;
  }, nomes);

  if (parte('duplicado')) {
    const [ana, boss] = await novaCena(['Ana', 'Sombra']);
    // Ana: machucada (HP 12, sobrevida 4), envenenada, com uma ferida permanente (2 do SP apodreceram), com cor e
    // tamanho próprios, de um jogador
    await ev(id => { const u = __tc; u.Store.tx('preparar', () => u.Store.upd('tokens', id, { color: '#3f7fbf', size: 1, owner: 'u1', bars: [{ n: 'HP', v: 12, m: 30, c: '#d65a5a', on: true, k: 'bar', x: 4 }, { n: 'SP', v: 3, m: 10, c: '#5a8ad6', on: true, k: 'bar', pod: 2 }], conds: ['veneno', 'ferida'], cinfo: { veneno: { n: 2, d: 3, d0: 3 } } })); }, ana);
    ok(await ev(() => __tc.CONDS.some(c => c.id === 'duplicado' && c.n === 'Duplicado' && c.g === 'mente')), 'a condição Duplicado existe (no grupo da mente)');
    await abrir(ana); await limparToasts();
    await page.fill('#cg-busca', 'dupli'); await w(200);
    await page.locator('#cg-list .chip', { hasText: 'Duplicado' }).click(); await w(300);
    const janela = await ev(() => { const m = document.querySelector('.modal'); return m ? { tit: (m.querySelector('h2, .modal-title, header') || {}).textContent || '', txt: m.textContent.replace(/\s+/g, ' '), cheias: !!(document.getElementById('dp-barras-cheias') || {}).checked, turno: !!document.getElementById('dp-turnos') } : null; });
    ok(janela && /Duplicado de Ana/.test(janela.txt) && janela.cheias && !janela.turno && /Como estão agora \(HP 12 de 30\)/.test(janela.txt), 'a janela: "Duplicado de Ana", as barras cheias de começo (ou como estão: HP 12 de 30); fora da ordem, sem a opção dos turnos: ' + j(janela && [janela.cheias, janela.turno]));
    ok(/Este token não tem ficha: o gêmeo vai só como token/.test(janela.txt) && /Quando o gêmeo cair \(HP 0\)/.test(janela.txt), 'e diz que vai sem ficha (o token não tem) e o que acontece quando ele cair');
    await foto('l9-duplicado-janela');
    await page.locator('.modal .btn.primary', { hasText: 'Criar o gêmeo' }).click(); await w(350);
    let gs = await gemeos(ana);
    ok(gs.length === 1, 'um gêmeo: ' + gs.length);
    let g = await tok(gs[0]), a = await tok(ana);
    ok(g.name === 'Ana' && g.color === a.color && g.size === a.size && g.shape === a.shape && g.img === a.img && g.owner === null && a.owner === 'u1' && g.dup === ana, 'o gêmeo é igual à Ana para quem vê (nome, cor, tamanho, forma, imagem), sem dono (a Ana é de um jogador; o gêmeo, só do mestre), com a marca de quem ele copia');
    ok(j(g.bars.map(b => [b.n, b.v, b.m, b.x || 0, b.pod || 0])) === j([['HP', 30, 30, 0, 0], ['SP', 10, 10, 0, 0]]) && j(g.conds) === j(['duplicado']), 'cheias: as barras no máximo (sem a sobrevida e sem o podre) e só a condição Duplicado (sem o veneno e sem a ferida): ' + j([g.bars, g.conds]));
    const longe = Math.max(Math.abs(Math.round(g.x / 64) - Math.round(a.x / 64)), Math.abs(Math.round(g.y / 64) - Math.round(a.y / 64)));
    ok(longe === 1, 'nasceu ao lado da Ana (a 1 quadrado): ' + longe);
    ok(await ev(id => __tc.App.sel.length === 1 && __tc.App.sel[0].id === id, gs[0]) && /O gêmeo de Ana nasceu ao lado dele/.test(await toastTxt()), 'o gêmeo fica escolhido, e o aviso: ' + await toastTxt());
    // o painel do gêmeo
    await abrir(gs[0]);
    const sec = await ev(() => { const s = document.getElementById('s-dup'); return s ? s.innerText.replace(/\s+/g, ' ') : null; });
    ok(sec && /Gêmeo de Ana \(só você sabe\)/.test(sec) && /Sem ficha: só o token/.test(sec) && /gêmeo de Ana/.test(await page.locator('#cd-duplicado-n').innerText()), 'o painel do gêmeo diz de quem ele é cópia (e a condição também): ' + sec);
    if (SHOTS) { await ev(id => { const u = __tc, t = u.Store.get('tokens', id), sc = u.Store.scene(); u.App.view.z = 1.6; u.Render.centerOn(t.x + sc.cell / 2, t.y + sc.cell / 2); u.Render.request(); }, ana); await w(300); }
    await foto('l9-duplicado');
    await page.locator('#tk-dp-orig').click(); await w(250);
    ok(await ev(id => __tc.App.sel.length === 1 && __tc.App.sel[0].id === id, ana), '"Ir até o original" escolhe a Ana');
    // o que vai para os jogadores
    const pub = await ev(() => { const u = __tc; return u.Proj.projetar(u.Store.scene(), u.Store.S.assets || {}, new Set()).v.tokens.map(x => ({ n: x.name, dup: x.dup || null, conds: x.conds, cor: x.color })); });
    const anas = pub.filter(x => x.n === 'Ana');
    ok(anas.length === 2 && anas.every(x => !x.dup && !x.conds.includes('duplicado') && x.cor === '#3f7fbf'), 'para os jogadores, os dois são iguais: sem a marca de cópia e sem a condição Duplicado: ' + j(anas));
    // desfazer
    await desfazer();
    ok((await gemeos(ana)).length === 0, 'Desfazer tira o gêmeo');
    // como estão agora, com a ordem de turnos
    await ev(([a, b]) => { const u = __tc, sc = u.Store.scene(); u.Act.turnAdd([u.Store.get('tokens', a), u.Store.get('tokens', b)]); const tn = JSON.parse(JSON.stringify(u.Store.scene().turn)); tn.list.forEach((e, i) => { e.init = i === 0 ? 15 : 9; }); u.Store.tx('ini', () => u.Store.scn({ turn: tn })); }, [ana, boss]); await w(200);
    await abrir(ana);
    await page.fill('#cg-busca', 'dupli'); await w(200);
    await page.locator('#cg-list .chip', { hasText: 'Duplicado' }).click(); await w(300);
    ok(await page.locator('#dp-turnos').isChecked(), 'com a Ana na ordem de turnos, a janela oferece entrar logo depois dela (marcado)');
    await page.locator('#dp-barras-agora').check();
    await page.locator('.modal .btn.primary', { hasText: 'Criar o gêmeo' }).click(); await w(350);
    gs = await gemeos(ana); g = await tok(gs[0]);
    ok(j(g.bars.map(b => [b.v, b.x || 0, b.pod || 0])) === j([[12, 4, 0], [3, 0, 2]]) && j(g.conds) === j(['veneno', 'ferida', 'duplicado']) && j(g.cinfo.veneno) === j({ n: 2, d: 3, d0: 3 }), 'como estão: as barras de agora (com a sobrevida e o podre) e as condições (o veneno, com o contador e as rodadas, e a ferida permanente, que anda com o podre): ' + j([g.bars, g.conds, g.cinfo]));
    const ordem = await ev(() => __tc.Store.scene().turn.list.map(e => [__tc.Store.get('tokens', e.token).name + (__tc.Store.get('tokens', e.token).dup ? '*' : ''), e.init]));
    ok(j(ordem) === j([['Ana', 15], ['Ana*', 15], ['Sombra', 9]]), 'na ordem de turnos, logo depois da Ana, com a mesma iniciativa: ' + j(ordem));
    // o gêmeo que cai: o aviso oferece tirar da cena (nada some sozinho)
    await limparToasts();
    await ev(id => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, '-20'), gs[0]); await w(300);
    ok((await tok(gs[0])) && /O gêmeo \(Duplicado\) de Ana caiu\. Tirar da cena\?/.test(await toastTxt()), 'o gêmeo que cai (HP 0) continua na cena, e o aviso oferece tirá-lo: ' + await toastTxt());
    await foto('l9-duplicado-caiu');
    await page.locator('.toast button', { hasText: 'Tirar da cena' }).click(); await w(300);
    ok(!(await tok(gs[0])) && /O gêmeo saiu da cena/.test(await toastTxt()) && !(await ev(id => __tc.Store.scene().turn.list.some(e => e.token === id), gs[0])), '"Tirar da cena": o gêmeo sai (e sai da ordem de turnos)');
    await desfazer();
    ok(!!(await tok(gs[0])), '(desfazer traz o gêmeo de volta)');
    // dano que não derruba não avisa; o original que cai também não
    await limparToasts();
    await ev(id => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, '+10'), gs[0]); await w(200);
    await ev(id => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, '-3'), gs[0]); await w(200);
    await ev(id => __tc.Act.barSet(__tc.Store.get('tokens', id), 0, '-40'), ana); await w(200);
    ok(!/caiu/.test(await toastTxt()), 'só a queda do gêmeo avisa (o dano que não derruba, e a Ana caindo, não): ' + await toastTxt());
    // tirar a condição: vira um token comum
    await abrir(gs[0]); await limparToasts();
    await page.locator('#cd-duplicado-x').click(); await w(250);
    g = await tok(gs[0]);
    ok(g && !g.conds.includes('duplicado') && !g.dup && /A condição Duplicado saiu de Ana: agora é um token comum/.test(await toastTxt()), 'tirar a condição: o gêmeo vira um token comum (continua na cena)');
    await desfazer();
    ok((await tok(gs[0])).dup === ana, '(desfazer traz a marca de volta)');
    // "Tirar da cena" pelo painel
    await abrir(gs[0]); await limparToasts();
    await page.locator('#tk-dp-tirar').click(); await w(250);
    ok(!(await tok(gs[0])) && /O gêmeo saiu da cena/.test(await toastTxt()), '"Tirar da cena" pelo painel do gêmeo');
    // um token de cada vez; só tokens
    await ev(ids => { __tc.setSel(ids.map(id => ({ c: 'tokens', id }))); __tc.App.tab = 'sel'; __tc.UI.renderAll(); }, [ana, boss]); await w(250);
    const multi = await ev(() => { const c = [...document.querySelectorAll('.chip')].find(x => x.textContent.trim() === 'Duplicado'); return c ? [c.disabled, c.title] : null; });
    ok(multi && multi[0] && /um token de cada vez/.test(multi[1]), 'com vários tokens, o Duplicado fica para um de cada vez: ' + j(multi));
    const prop = await ev(() => { const u = __tc, sc = u.Store.scene(); const k = u.newToken(sc, 9 * sc.cell, 9 * sc.cell, { name: 'Baú', prop: 'bau' }); u.Store.tx('baú', () => u.Store.add('tokens', k)); return u.Act.duplicadoCriar(u.Store.get('tokens', k.id), {}); });
    ok(prop && prop.erro === 'só tokens', 'um objeto de cenário não se duplica: ' + j(prop));
    // as zonas e o dano em área não aplicam a condição
    const limpo = await ev(() => { const c = __tc.newScene('x'); c.effects = [{ id: 'fx1', fx: 'fogo', k: 'circ', x: 0, y: 0, r: 1, apply: { bar: 'HP', amt: '', cond: { id: 'duplicado', n: 0, d: 0 }, skip: [] } }]; __tc.normalizeScene(c); return c.effects[0].apply; });
    ok(limpo === null, 'uma zona que tentasse aplicar o Duplicado fica sem a condição: ' + j(limpo));
    // a marca do gêmeo, ao abrir uma cena: só fica o id de outro token
    const marcas = await ev(() => {
      const u = __tc, c = u.newScene('marcas');
      const a = u.newToken(c, 0, 0, { name: 'a' }), b = u.newToken(c, 64, 0, { name: 'b' }), d = u.newToken(c, 128, 0, { name: 'd' });
      a.dup = a.id; b.dup = 'não vale!'; d.dup = a.id; c.tokens = [a, b, d]; u.normalizeScene(c);
      return c.tokens.map(t => t.dup === undefined ? null : t.dup === a.id ? 'a' : t.dup);
    });
    ok(j(marcas) === j([null, null, 'a']), 'ao abrir a cena, a marca de cópia só fica quando é o id de outro token (a de si mesmo, ou um texto qualquer, sai): ' + j(marcas));
    // sem lugar livre perto: não cria
    const preso = await ev(() => {
      const u = __tc, sc = u.newScene('Lote 9 — sem lugar');
      u.Store.addScene(sc); u.Store.S.current = sc.id; u.UI.renderAll();
      let id = null;
      u.Store.tx('montar', () => { for (let x = 0; x < 7; x++) for (let y = 0; y < 7; y++) { const k = u.newToken(sc, x * sc.cell, y * sc.cell, { name: x === 3 && y === 3 ? 'Ana' : 'Pedra' }); u.Store.add('tokens', k); if (x === 3 && y === 3) id = k.id; } });
      return u.Act.duplicadoCriar(u.Store.get('tokens', id), {});
    });
    ok(preso && preso.erro === 'sem lugar', 'cercado (sem lugar a até 3 quadrados), o gêmeo não nasce: ' + j(preso));
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
