// "Juntar em três vias" (TC.dados.remendo.juntar3): o que o núcleo faz quando duas pessoas gravam o mesmo documento
// no mesmo instante — o mestre e o mestre auxiliar na mesma cena. Sem rede: só a conta, na página da casca.
const { start, checker } = require('./lib');
const { ok, end } = checker();
(async () => {
  const t = await start();
  const { page } = await t.device({ name: 'casca' });
  await page.goto(t.base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.TC && TC.dados && TC.dados.remendo && typeof TC.dados.remendo.juntar3 === 'function', null, { timeout: 15000 });
  const r = await page.evaluate(() => {
    const J = TC.dados.remendo.juntar3, igual = TC.dados.remendo.igual, out = [];
    // (a ordem das chaves de um objeto não importa — o banco as reordena mesmo; a das listas, sim)
    const caso = (nome, base, meu, deles, esperado) => { let saiu; try { saiu = J(base, meu, deles); } catch (e) { saiu = 'ERRO: ' + e.message; } out.push({ nome, ok: igual(saiu, esperado) && igual(esperado, saiu), saiu: JSON.stringify(saiu), esperado: JSON.stringify(esperado) }); };
    const copia = x => JSON.parse(JSON.stringify(x));

    // ---------- valores simples ----------
    caso('ninguém mexeu', 1, 1, 1, 1);
    caso('só eu mexi', 1, 2, 1, 2);
    caso('só o outro mexeu', 1, 1, 3, 3);
    caso('os dois mexeram igual', 1, 5, 5, 5);
    caso('os dois mexeram diferente: vale o daqui', 1, 2, 3, 2);
    caso('texto: os dois mexeram', 'a', 'b', 'c', 'b');
    caso('lista simples: só o outro mexeu', [1, 2], [1, 2], [1, 2, 3], [1, 2, 3]);
    caso('lista simples: os dois mexeram, vale a daqui', [1, 2], [2, 1], [1, 2, 3], [2, 1]);
    caso('tipo trocado dos dois lados: vale o daqui', { a: 1 }, [1], 'x', [1]);

    // ---------- objetos: chave por chave ----------
    caso('chaves diferentes: as duas mudanças ficam', { a: 1, b: 1 }, { a: 2, b: 1 }, { a: 1, b: 3 }, { b: 3, a: 2 });
    caso('eu incluí uma chave, o outro incluiu outra', { a: 1 }, { a: 1, m: 1 }, { a: 1, t: 2 }, { a: 1, t: 2, m: 1 });
    caso('eu apaguei uma chave que o outro não tocou', { a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2 }, { a: 1 });
    caso('o outro apagou uma chave que eu não toquei', { a: 1, b: 2 }, { a: 1, b: 2 }, { a: 1 }, { a: 1 });
    caso('eu apaguei, o outro mudou: vale o daqui (apagada)', { a: 1, b: 2 }, { a: 1 }, { a: 1, b: 9 }, { a: 1 });
    caso('o outro apagou, eu mudei: vale o daqui (fica)', { a: 1, b: 2 }, { a: 1, b: 9 }, { a: 1 }, { a: 1, b: 9 });
    caso('objeto dentro de objeto', { p: { x: 1, y: 1 }, q: 1 }, { p: { x: 5, y: 1 }, q: 1 }, { p: { x: 1, y: 7 }, q: 2 }, { p: { x: 5, y: 7 }, q: 2 });
    caso('sem base (os dois criaram): chave por chave, o daqui por cima', undefined, { a: 1, b: 1 }, { b: 2, c: 3 }, { b: 1, c: 3, a: 1 });
    caso('null e "não veio" são a mesma coisa', { a: null }, {}, { a: null, b: 1 }, { b: 1 });

    // ---------- listas de objetos com id: objeto por objeto ----------
    const T = (id, x, hp) => ({ id, x, hp });
    caso('cada um mexeu num token', [T('a', 0, 10), T('b', 0, 10)], [T('a', 5, 10), T('b', 0, 10)], [T('a', 0, 10), T('b', 9, 10)], [T('a', 5, 10), T('b', 9, 10)]);
    caso('o mesmo token, campos diferentes', [T('a', 0, 10)], [T('a', 5, 10)], [T('a', 0, 3)], [T('a', 5, 3)]);
    caso('o mesmo token, o mesmo campo: vale o daqui', [T('a', 0, 10)], [T('a', 5, 10)], [T('a', 8, 10)], [T('a', 5, 10)]);
    caso('eu incluí um, o outro incluiu outro', [T('a', 0, 1)], [T('a', 0, 1), T('m', 1, 1)], [T('a', 0, 1), T('t', 2, 1)], [T('a', 0, 1), T('t', 2, 1), T('m', 1, 1)]);
    caso('eu apaguei um, o outro mexeu em outro', [T('a', 0, 1), T('b', 0, 1)], [T('b', 0, 1)], [T('a', 0, 1), T('b', 4, 1)], [T('b', 4, 1)]);
    caso('o outro apagou um, eu mexi em outro', [T('a', 0, 1), T('b', 0, 1)], [T('a', 3, 1), T('b', 0, 1)], [T('a', 0, 1)], [T('a', 3, 1)]);
    caso('eu apaguei o que o outro mexeu: fica apagado', [T('a', 0, 1), T('b', 0, 1)], [T('b', 0, 1)], [T('a', 7, 1), T('b', 0, 1)], [T('b', 0, 1)]);
    caso('o outro apagou o que eu mexi: fica o daqui', [T('a', 0, 1), T('b', 0, 1)], [T('a', 7, 1), T('b', 0, 1)], [T('b', 0, 1)], [T('a', 7, 1), T('b', 0, 1)]);
    caso('os dois apagaram o mesmo', [T('a', 0, 1), T('b', 0, 1)], [T('b', 0, 1)], [T('b', 0, 1)], [T('b', 0, 1)]);
    caso('a lista ficou vazia dos dois lados', [T('a', 0, 1)], [], [], []);
    caso('eu esvaziei, o outro incluiu', [T('a', 0, 1)], [], [T('a', 0, 1), T('n', 1, 1)], [T('n', 1, 1)]);
    // a ordem
    caso('só eu mudei a ordem', [T('a', 0, 1), T('b', 0, 1), T('c', 0, 1)], [T('c', 0, 1), T('a', 0, 1), T('b', 0, 1)], [T('a', 0, 1), T('b', 5, 1), T('c', 0, 1)], [T('c', 0, 1), T('a', 0, 1), T('b', 5, 1)]);
    caso('só o outro mudou a ordem', [T('a', 0, 1), T('b', 0, 1), T('c', 0, 1)], [T('a', 9, 1), T('b', 0, 1), T('c', 0, 1)], [T('b', 0, 1), T('c', 0, 1), T('a', 0, 1)], [T('b', 0, 1), T('c', 0, 1), T('a', 9, 1)]);
    caso('os dois mudaram a ordem: vale a daqui', [T('a', 0, 1), T('b', 0, 1), T('c', 0, 1)], [T('c', 0, 1), T('b', 0, 1), T('a', 0, 1)], [T('b', 0, 1), T('a', 0, 1), T('c', 0, 1)], [T('c', 0, 1), T('b', 0, 1), T('a', 0, 1)]);
    caso('o que o outro incluiu entra depois do vizinho que tinha lá', [T('a', 0, 1), T('b', 0, 1)], [T('a', 0, 1), T('b', 0, 1), T('m', 0, 1)], [T('a', 0, 1), T('t', 0, 1), T('b', 0, 1)], [T('a', 0, 1), T('t', 0, 1), T('b', 0, 1), T('m', 0, 1)]);
    caso('o que o outro incluiu no começo entra no começo', [T('a', 0, 1)], [T('a', 2, 1)], [T('t', 0, 1), T('a', 0, 1)], [T('t', 0, 1), T('a', 2, 1)]);
    // listas com objetos sem id (ou com id repetido) valem inteiras
    caso('objetos sem id: a lista vale inteira (a daqui)', [{ n: 1 }], [{ n: 2 }], [{ n: 1 }, { n: 3 }], [{ n: 2 }]);
    caso('ids repetidos: a lista vale inteira (a daqui)', [T('a', 0, 1)], [T('a', 1, 1), T('a', 2, 1)], [T('a', 0, 1), T('b', 0, 1)], [T('a', 1, 1), T('a', 2, 1)]);
    caso('lista de listas (pontos de um desenho) vale inteira', [[0, 0], [1, 1]], [[0, 0], [2, 2]], [[0, 0], [1, 1], [3, 3]], [[0, 0], [2, 2]]);
    // listas de nomes sem repetição: nome por nome
    caso('nomes: eu incluí um, o outro incluiu outro', ['a', 'b'], ['a', 'b', 'm'], ['a', 't', 'b'], ['a', 't', 'b', 'm']);
    caso('nomes: eu tirei um, o outro incluiu outro', ['a', 'b'], ['b'], ['a', 'b', 't'], ['b', 't']);
    caso('nomes: só eu mudei a ordem, o outro incluiu', ['a', 'b', 'c'], ['c', 'b', 'a'], ['a', 'b', 'c', 'd'], ['c', 'd', 'b', 'a']);
    caso('nomes: condições de um token — as duas entram', ['caido'], ['caido', 'cego'], ['caido', 'envenenado'], ['caido', 'envenenado', 'cego']);
    caso('nomes: lista vazia na base', [], ['x'], ['y'], ['y', 'x']);
    caso('nomes repetidos: a lista vale inteira (a daqui)', ['a'], ['a', 'a'], ['a', 'b'], ['a', 'a']);
    caso('nomes de um lado e objetos do outro: vale o daqui', ['a'], ['a', 'b'], [{ id: 'a' }], ['a', 'b']);

    // ---------- uma cena de verdade, em miniatura ----------
    const base = { v: 1, id: 'c1', nome: 'Guarita', tokens: [{ id: 't1', x: 0, y: 0, bars: [{ n: 'HP', v: 10, m: 10 }], conds: [] }, { id: 't2', x: 64, y: 0, bars: [{ n: 'HP', v: 20, m: 20 }], conds: [] }], fx: [], turn: { on: false, order: [], cur: 0, round: 1 }, ack: { j1: 3 } };
    const meu = copia(base), deles = copia(base);
    meu.tokens[0].x = 128; meu.tokens[0].y = 64; meu.fx.push({ id: 'f1', k: 'fogo' }); meu.turn.on = true; meu.ack.j1 = 4;
    deles.tokens[1].bars[0].v = 7; deles.tokens.push({ id: 't3', x: 0, y: 128, bars: [], conds: [] }); deles.nome = 'A Guarita em Ruínas'; deles.turn.round = 2; deles.ack.j2 = 1;
    const cena = J(base, meu, deles);
    out.push({ nome: 'cena: o que cada um fez fica (mover um token, dar dano em outro, incluir token e efeito, nome, turno, contas)', ok:
      cena.tokens.length === 3 && cena.tokens[0].x === 128 && cena.tokens[0].y === 64 && cena.tokens[1].bars[0].v === 7 && cena.tokens[2].id === 't3' && cena.fx.length === 1 && cena.nome === 'A Guarita em Ruínas'
      && cena.turn.on === true && cena.turn.round === 2 && cena.ack.j1 === 4 && cena.ack.j2 === 1, saiu: JSON.stringify(cena), esperado: '(ver o teste)' });
    out.push({ nome: 'nada do que entrou foi alterado (a conta não mexe nos documentos que recebe)', ok: igual(base.tokens[0], { id: 't1', x: 0, y: 0, bars: [{ n: 'HP', v: 10, m: 10 }], conds: [] }) && meu.tokens.length === 2 && deles.fx.length === 0, saiu: '', esperado: '' });

    // ---------- muitas rodadas ao acaso: o que cada lado fez em lugares diferentes tem de aparecer no fim ----------
    let seed = 20261007;
    const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    let ruins = 0, primeiro = null;
    for (let volta = 0; volta < 400; volta++) {
      const n = 3 + rnd(6), b = { tokens: [], shapes: [], meta: { nome: 'n' + rnd(9), grade: rnd(3) } };
      for (let i = 0; i < n; i++) b.tokens.push({ id: 't' + i, x: rnd(50), y: rnd(50), hp: rnd(30), nome: 'tok' + i });
      for (let i = 0; i < 2 + rnd(3); i++) b.shapes.push({ id: 's' + i, pts: [[rnd(9), rnd(9)], [rnd(9), rnd(9)]], cor: rnd(5) });
      const m = copia(b), d = copia(b), meus = [], dele = [];
      // eu: tokens de índice par (campo x) e inclusões; o outro: tokens de índice ímpar (campo hp), desenhos e nome
      for (let i = 0; i < n; i += 2) if (rnd(2)) { m.tokens[i].x = 100 + rnd(900); meus.push(['x', 't' + i, m.tokens[i].x]); }
      for (let i = 1; i < n; i += 2) if (rnd(2)) { d.tokens[i].hp = 100 + rnd(900); dele.push(['hp', 't' + i, d.tokens[i].hp]); }
      // os dois no MESMO token, em campos diferentes
      const k = rnd(n); m.tokens[k].y = 5000 + volta; d.tokens[k].nome = 'renomeado' + volta;
      if (rnd(2)) { m.tokens.push({ id: 'novoM' + volta, x: 1, y: 1, hp: 1, nome: 'm' }); meus.push(['tem', 'novoM' + volta]); }
      if (rnd(2)) { d.tokens.splice(rnd(d.tokens.length + 1), 0, { id: 'novoD' + volta, x: 2, y: 2, hp: 2, nome: 'd' }); dele.push(['tem', 'novoD' + volta]); }
      if (rnd(2)) { d.shapes[0].cor = 77; dele.push(['cor']); }
      if (rnd(2)) { d.meta.nome = 'outro' + volta; dele.push(['nome', d.meta.nome]); }
      if (rnd(2)) { m.meta.grade = 9; meus.push(['grade']); }
      const antes = [JSON.stringify(b), JSON.stringify(m), JSON.stringify(d)];
      const f = J(b, m, d), tok = id => f.tokens.find(x => x.id === id);
      let bom = new Set(f.tokens.map(x => x.id)).size === f.tokens.length && tok('t' + k).y === 5000 + volta && tok('t' + k).nome === 'renomeado' + volta;
      for (const x of meus) bom = bom && (x[0] === 'x' ? tok(x[1]).x === x[2] : x[0] === 'tem' ? !!tok(x[1]) : f.meta.grade === 9);
      for (const x of dele) bom = bom && (x[0] === 'hp' ? tok(x[1]).hp === x[2] : x[0] === 'tem' ? !!tok(x[1]) : x[0] === 'cor' ? f.shapes[0].cor === 77 : f.meta.nome === x[1]);
      // as três leis: juntar com quem não mexeu devolve o outro; juntar duas vezes dá o mesmo; quem entra não é alterado
      bom = bom && igual(J(b, m, b), m) && igual(J(b, b, d), d) && igual(J(b, f, d), f) && igual(J(b, m, f), f);
      bom = bom && antes[0] === JSON.stringify(b) && antes[1] === JSON.stringify(m) && antes[2] === JSON.stringify(d);
      if (!bom) { ruins++; if (!primeiro) primeiro = { volta, b, m, d, f }; }
    }
    out.push({ nome: '400 rodadas ao acaso: o que cada lado fez aparece no fim, sem token repetido, e valem as três leis', ok: ruins === 0, saiu: ruins + ' ruins; a primeira: ' + JSON.stringify(primeiro), esperado: '0 ruins' });

    // ---------- documentos grandes e fundos não travam ----------
    const grande = { tokens: [] };
    for (let i = 0; i < 3000; i++) grande.tokens.push({ id: 'g' + i, x: i, y: i, bars: [{ n: 'HP', v: i, m: 9999 }], nome: 'Token número ' + i });
    const gm = copia(grande), gd = copia(grande);
    for (let i = 0; i < 3000; i += 2) gm.tokens[i].x = -i;
    for (let i = 1; i < 3000; i += 2) gd.tokens[i].y = -i;
    const t0 = performance.now(), gf = J(grande, gm, gd), ms = performance.now() - t0;
    out.push({ nome: 'cena com 3000 tokens, metade mexida de cada lado: junta certo e depressa', ok: gf.tokens.length === 3000 && gf.tokens[10].x === -10 && gf.tokens[11].y === -11 && ms < 3000, saiu: Math.round(ms) + ' ms', esperado: 'menos de 3 s' });
    let fundo = { v: 0 }, fm, fd;
    for (let i = 0; i < 40; i++) fundo = { dentro: fundo, n: i };
    fm = copia(fundo); fd = copia(fundo); fm.n = 'm'; fd.dentro.n = 'd';
    let ff; try { ff = J(fundo, fm, fd); } catch (e) { ff = null; }
    out.push({ nome: 'objeto com 40 níveis: não estoura (o que está fundo demais vale inteiro)', ok: !!ff && ff.n === 'm' && ff.dentro.n === 'd', saiu: ff ? 'ok' : 'erro', esperado: 'ok' });
    return out;
  });
  for (const x of r) ok(x.ok, x.nome + (x.ok ? '' : ' — saiu ' + x.saiu + ' · esperado ' + x.esperado));
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
