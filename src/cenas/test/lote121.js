// Bateria do lote 121 (as Cenas): os objetos compridos, as rondas dos guardas e os lugares de furtividade.
//   · a cama de solteiro é 1 × 2 (um token deita em cima), a estante e o armário são 2 × 1 e ficam rentes à parede; girar
//     mantém o objeto na grade; as medidas mudam no painel; a cena de antes (a cama e a estante num quadrado 2 × 2, com o
//     desenho no meio) é encaixada ao abrir: a cama numa coluna (a do lado da parede), a estante com as costas na parede;
//   · o interior gerado: as camas e as estantes inteiras dentro das salas, as estantes encostadas numa parede;
//   · as rondas: o guarda anda pela rota (ida e volta, em círculo), larga a rota em Alerta; o cone vê quem está na luz,
//     "pode ter notado" quem está na sombra, não vê quem está Oculto nem atrás da parede; os jogadores nunca recebem a
//     ronda, o alerta nem o nível da fechadura;
//   · os seis lugares de furtividade: a cena sai de noite, com os guardas (de ronda e de posto), o alvo, os esconderijos,
//     as entradas escondidas e as marcas do mestre ocultas.
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({ w: 1400, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const j = JSON.stringify;
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };

  /* ---------- os objetos compridos ---------- */
  const r1 = await ev(() => {
    const T = __tc, S = T.Store, P = T.Props;
    const sc = T.newScene('Compridos'); sc.cols = 16; sc.rows = 12; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell, out = {};
    out.defs = ['cama', 'camaCasal', 'estante', 'armario', 'mesa', 'mesaBanquete', 'banco', 'tapete', 'lareira'].map(id => [id, P.P[id] && P.P[id].fw, P.P[id] && P.P[id].fh]);
    // pela ferramenta: a cama nas medidas dela, com o meio no clique
    T.App.opt.obj = 'cama'; T.Tools.set('obj');
    const cv = document.getElementById('cv'), rc = cv.getBoundingClientRect();
    const pt = (x, y) => { const v = T.App.view; return { clientX: rc.left + (x - v.x) * v.z, clientY: rc.top + (y - v.y) * v.z }; };
    const down = (x, y) => { const p = pt(x, y); cv.dispatchEvent(new PointerEvent('pointerdown', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, p))); cv.dispatchEvent(new PointerEvent('pointerup', Object.assign({ bubbles: true, button: 0, pointerId: 1 }, p))); };
    down(4.5 * c, 4 * c);
    const cama = S.scene().tokens.find(x => x.prop === 'cama');
    out.cama = cama && [cama.x / c, cama.y / c, cama.fw, cama.fh, T.tokWH(cama), cama.q0 === undefined];
    // girar: deitada, continua em dois quadrados inteiros
    const g = P.girado(cama, 90, S.scene());
    S.tx('g', () => S.upd('tokens', cama.id, g));
    const cg = S.get('tokens', cama.id);
    out.girada = [cg.x / c, cg.y / c, T.tokWH(cg), Number.isInteger(cg.x / c) && Number.isInteger(cg.y / c)];
    // as medidas: 2 × 2 (de casal, no tamanho)
    S.tx('m', () => S.upd('tokens', cama.id, P.medido(S.get('tokens', cama.id), 2, 2, S.scene())));
    out.medida = T.tokWH(S.get('tokens', cama.id));
    // o clique no meio do retângulo seleciona; fora dele (no quadrado de antes), não
    const hit = T.Tools.hitTest({ x: cg.x + 0.5 * c, y: cg.y + 0.5 * c });
    out.hit = !!(hit && hit.id === cama.id);
    T.Tools.set('select');
    return out;
  });
  ok(j(r1.defs) === j([['cama', 1, 2], ['camaCasal', 2, 2], ['estante', 2, 1], ['armario', 2, 1], ['mesa', 2, 1], ['mesaBanquete', 4, 2], ['banco', 2, 1], ['tapete', 3, 2], ['lareira', 2, 1]]), 'as medidas de fábrica dos compridos: ' + j(r1.defs));
  ok(r1.cama && r1.cama[2] === 1 && r1.cama[3] === 2 && j(r1.cama[4]) === '[1,2]' && r1.cama[5] && Number.isInteger(r1.cama[0]) && Number.isInteger(r1.cama[1]), 'a cama posta à mão: 1 × 2, na grade: ' + j(r1.cama));
  ok(j(r1.girada[2]) === '[2,1]' && r1.girada[3], 'girada de 90°, a cama fica 2 × 1, ainda na grade: ' + j(r1.girada));
  ok(j(r1.medida) === '[2,2]', 'as medidas mudam no painel (Props.medido): ' + j(r1.medida));
  ok(r1.hit, 'o clique dentro do retângulo pega o objeto');

  // a cena de antes: a cama e a estante num quadrado 2 × 2, sem as medidas
  const r2 = await ev(() => {
    const T = __tc, c = 64;
    const cru = { id: 'antiga', name: 'Antiga', cols: 12, rows: 10, cell: c, tokens: [
      { id: 'tk1', name: 'Cama', x: 2 * c, y: 1 * c, size: 2, prop: 'cama', rot: 0 },
      { id: 'tk2', name: 'Cama', x: 7 * c, y: 1 * c, size: 2, prop: 'cama', rot: 180 },
      { id: 'tk3', name: 'Estante', x: 2 * c, y: 5 * c, size: 2, prop: 'estante', rot: 90 },
      { id: 'tk4', name: 'Estante', x: 6 * c, y: 1 * c, size: 2, prop: 'estante', rot: 0 },
      { id: 'tk5', name: 'Mesa', x: 6 * c, y: 6 * c, size: 2, prop: 'mesa', rot: 0 }],
      walls: [{ id: 'w1', k: 'wall', x1: 9 * c, y1: 0, x2: 9 * c, y2: 10 * c }, { id: 'w2', k: 'wall', x1: 0, y1: 1 * c, x2: 12 * c, y2: 1 * c }] };
    const sc = T.normalizeScene(JSON.parse(JSON.stringify(cru)));
    const o = id => { const k = sc.tokens.find(x => x.id === id); return [k.x / c, k.y / c, k.fw, k.fh, T.tokWH(k)]; };
    return { c1: o('tk1'), c2: o('tk2'), e1: o('tk3'), e2: o('tk4'), m: o('tk5'), de2: j2(T.normalizeScene(JSON.parse(JSON.stringify(sc)))) === j2(sc) };
    function j2(x) { return JSON.stringify(x.tokens.map(k => [k.x, k.y, k.fw, k.fh, k.rot])); }
  });
  ok(j(r2.c1) === j([2, 1, 1, 2, [1, 2]]), 'a cama de antes vira de solteiro (1 × 2), sem parede do lado: a coluna da esquerda: ' + j(r2.c1));
  ok(j(r2.c2) === j([8, 1, 1, 2, [1, 2]]), 'com a parede à direita do quadrado, a cama vai para a coluna da parede: ' + j(r2.c2));
  ok(j(r2.e1) === j([3, 5, 2, 1, [1, 2]]), 'a estante girada de 90° fica com as costas à direita (rente à parede daquele lado): ' + j(r2.e1));
  ok(j(r2.e2) === j([6, 1, 2, 1, [2, 1]]), 'a estante de pé fica com as costas em cima, sem vão atrás: ' + j(r2.e2));
  ok(j(r2.m) === j([6, 6, 2, 2, [2, 2]]), 'a mesa de antes fica 2 × 2 (as cadeiras continuam encostadas): ' + j(r2.m));
  ok(r2.de2, 'encaixar de novo não muda nada');

  // o interior gerado: as camas e as estantes inteiras numa sala, as estantes com as costas numa parede
  const r3 = await ev(async () => {
    const T = __tc, ruins = [], n = { cama: 0, estante: 0 };
    for (let s = 1; s <= 24; s++) for (const tipo of ['senhor', 'casa', 'quartel', 'loja']) {
      const p = T.Interior.gerar({ tipo, w: 7, h: 6, p: 's', estilo: 'comum', seed: s * 31 });
      for (const q of p.salas) for (const m of q.moveis) {
        if (!m.fw) continue;
        n[m.id] = (n[m.id] || 0) + 1;
        const [w, h] = T.tokWH({ prop: m.id, fw: m.fw, fh: m.fh, rot: m.rot });
        if (m.x < q.x || m.y < q.y || m.x + w > q.x + q.w || m.y + h > q.y + q.h) ruins.push(tipo + s + ':' + m.id + ' fora da sala');
        if (m.id === 'estante') {
          const r4 = ((Math.round((m.rot || 0) / 90) % 4) + 4) % 4, costas = ['n', 'l', 's', 'o'][r4];
          const rente = costas === 'n' ? m.y === q.y : costas === 's' ? m.y + h === q.y + q.h : costas === 'o' ? m.x === q.x : m.x + w === q.x + q.w;
          if (!rente) ruins.push(tipo + s + ': estante com vão atrás');
        }
      }
    }
    return { ruins: ruins.slice(0, 5), n };
  });
  ok(!r3.ruins.length && r3.n.cama > 10 && r3.n.estante > 10, 'no interior, as camas e as estantes ficam inteiras na sala, e a estante, rente à parede: ' + j(r3));

  /* ---------- as rondas ---------- */
  const r4 = await ev(() => {
    const T = __tc, S = T.Store, R = T.Rondas, out = {};
    const sc = T.newScene('Rondas'); sc.cols = 20; sc.rows = 14; sc.light = 'escuro'; T.normalizeScene(sc); S.addScene(sc); T.UI.switchScene(sc.id);
    const c = sc.cell;
    const g = T.newToken(sc, 2 * c, 2 * c, { name: 'Guarda A' }); g.ronda = R.novaRonda({ pts: [[2, 2], [10, 2]], dir: 0, passo: 3, r: 8 });
    const lia = T.newToken(sc, 9 * c, 2 * c, { name: 'Lia', owner: '*' });
    S.tx('x', () => { S.add('tokens', g); S.add('tokens', lia); });
    // na sombra (sem luz nenhuma, no escuro): "pode ter notado"; com a tocha, visto
    out.sombra = R.quemVe(S.scene()).map(v => v.nivel);
    S.tx('luz', () => S.add('lights', { id: 'lz1', name: 'Tocha', x: 9.5 * c, y: 2.5 * c, bright: 1, dim: 2, c: '#ffc477', on: true }));
    out.luz = R.quemVe(S.scene()).map(v => v.nivel);
    // Oculta: não é vista
    S.tx('o', () => S.upd('tokens', lia.id, { conds: ['oculto'] }));
    out.oculta = R.quemVe(S.scene()).length;
    S.tx('o2', () => S.upd('tokens', lia.id, { conds: [] }));
    // atrás da parede: não é vista
    S.tx('w', () => S.add('walls', { id: 'wx', k: 'wall', x1: 6 * c, y1: 0, x2: 6 * c, y2: 6 * c, open: false, locked: false }));
    out.parede = R.quemVe(S.scene()).length;
    S.tx('w2', () => S.del('walls', 'wx'));
    // andar: 3 por vez, de ida e volta
    const pos = [];
    for (let k = 0; k < 5; k++) { R.avancar(); const a = S.get('tokens', g.id); pos.push(a.x / c); }
    out.pos = pos;
    out.desfaz = (() => { T.Tools.undo(); return S.get('tokens', g.id).x / c; })();
    // em Alerta, larga a rota
    R.mudarEstado([S.get('tokens', g.id)], 'alerta');
    const x0 = S.get('tokens', g.id).x; R.avancar(); out.alerta = S.get('tokens', g.id).x === x0 && S.get('tokens', g.id).alerta === 'alerta';
    // os jogadores nunca recebem a ronda, o alerta nem o nível da fechadura
    S.tx('f', () => S.add('walls', { id: 'wf', k: 'door', x1: 0, y1: 8 * c, x2: c, y2: 8 * c, open: false, locked: true, fech: 'dificil' }));
    const pub = T.Proj.projetar(S.scene(), {}, [], null);
    const gp = pub.v.tokens.find(x => x.id === g.id), wp = pub.m.walls.find(x => x.id === 'wf'), txt = JSON.stringify(pub);
    out.pub = [!!gp, gp && gp.ronda === undefined, gp && gp.alerta === undefined, !!wp && wp.fech === undefined, !/"ronda"|"fech"|"alerta"/.test(txt), S.get('walls', 'wf').fech === 'dificil'];
    return out;
  });
  ok(j(r4.sombra) === j(['sombra']), 'no escuro, sem luz: "pode ter notado" (a sombra): ' + j(r4.sombra));
  ok(j(r4.luz) === j(['visto']), 'na luz da tocha: visto: ' + j(r4.luz));
  ok(r4.oculta === 0, 'quem está Oculto não é visto');
  ok(r4.parede === 0, 'atrás da parede, não é visto');
  ok(j(r4.pos) === j([5, 8, 9, 6, 3]), 'a ronda de ida e volta, 3 quadrados por vez (vira na ponta e segue): ' + j(r4.pos));
  ok(r4.desfaz === 6, 'o Desfazer volta o último passo da ronda: ' + r4.desfaz);
  ok(r4.alerta, 'em Alerta, o guarda larga a rota');
  ok(r4.pub.every(Boolean), 'os jogadores não recebem a ronda, o alerta nem o nível da fechadura (o mestre continua com ele): ' + j(r4.pub));

  /* ---------- os lugares de furtividade ---------- */
  const r5 = await ev(async () => {
    const T = __tc, F = T.Furtividade, out = {};
    for (const id of F.IDS) {
      const L = F.LUGARES[id], p = L.gerar({ tamanho: 'medio', guardas: 'normal', alvo: 'sorteio' }, { seed: 77, estilo: 'comum' });
      const sc = await L.criar(p, '', { hora: 'dia' });
      const gs = sc.tokens.filter(x => x.ronda), marcas = sc.tokens.filter(x => ['esconderijo', 'alvoMissao', 'interesse'].includes(x.prop));
      out[id] = {
        noite: sc.tone === 'noite',
        guardas: gs.length, ronda: gs.filter(x => x.ronda.pts.length > 1).length, posto: gs.filter(x => !x.ronda.pts.length).length,
        visiveis: gs.every(x => !x.hidden),
        marcasOcultas: marcas.length > 0 && marcas.every(x => x.hidden),
        alvo: sc.tokens.some(x => /Alvo da missão/.test(x.notes || '')) || sc.tokens.some(x => x.prop === 'alvoMissao'),
        esconde: sc.tokens.some(x => x.prop === 'esconderijo'),
        fechaduras: sc.walls.filter(w => w.fech).length,
      };
    }
    return out;
  });
  for (const [id, v] of Object.entries(r5)) ok(v.noite && v.guardas >= 3 && v.ronda >= 1 && v.posto >= 1 && v.visiveis && v.marcasOcultas && v.alvo && v.esconde, `${id}: de noite, com guardas de ronda e de posto (à mostra, para a névoa decidir), o alvo, os esconderijos e as marcas ocultas: ` + j(v));
  ok(Object.values(r5).filter(v => v.fechaduras > 0).length >= 4, 'as portas trancadas levam o nível da fechadura: ' + j(Object.fromEntries(Object.entries(r5).map(([k, v]) => [k, v.fechaduras]))));
  await foto('lote121-furtividade');

  // o grupo Furtividade na janela "Gerar um lugar"
  const r6 = await ev(async () => { __tc.Gerador.abrir('fortaleza'); await new Promise(r => setTimeout(r, 400)); const txt = document.querySelector('.modal') ? document.querySelector('.modal').innerText : ''; return { grupo: /Furtividade/.test(txt), lugares: ['Mansão', 'Fortaleza', 'Guilda', 'Acampamento', 'Ruas', 'Torre'].every(n => txt.includes(n)), alvo: /O alvo da missão/.test(txt) }; });
  ok(r6.grupo && r6.lugares && r6.alvo, 'a janela "Gerar um lugar" tem o grupo Furtividade, com os seis lugares e a escolha do alvo: ' + j(r6));
  await foto('lote121-janela');

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(!inesperados.length, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
