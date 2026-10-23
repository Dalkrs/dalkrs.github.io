// Bateria do lote 7 (parte 3b, as Cenas), no navegador, sem o site: as 19 zonas novas e o que elas fazem.
//   · a biblioteca (51 efeitos, nas quatro categorias), a regra de cada zona no painel;
//   · a Fumaça e a Muralha de cristais tapam a visão de verdade (a muralha também barra a passagem); os pontos de vida
//     da muralha (o dano com sinal, quebrar em zero, "Quebrar", Desfazer) e a barrinha no mapa;
//   · o Portal: nasce com a saída ao lado; o token solto num círculo vai para o outro (no mesmo Desfazer); o que chega de
//     fora atravessa num passo logo depois; arrastar a saída leva só a saída;
//   · as Runas-armadilha: nascem escondidas; Revelar e Esconder; quem pisa nelas avisa o mestre;
//   · as zonas de condição perguntam no começo da vez (a Distorção do tempo com Lento ou Acelerado), e as de lembrete
//     avisam só o mestre, só de quem está dentro;
//   · as combinações: fogo no óleo, raio na água, gelo na água — o cartão, Pular, Aplicar (troca as zonas e abre o
//     dano para quem está dentro), Desfazer;
//   · trocar o tipo da zona no painel e o efeito pedido por um jogador (a saída do portal, os pontos, a condição).
const path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({});
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const ate = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { if (await fn()) return true; await w(50); } return !!(await fn()); };
  const toasts = () => ev(() => Array.from(document.querySelectorAll('.toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const clearToasts = () => ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
  const T = name => ev(nm => JSON.parse(JSON.stringify(__tc.Store.scene().tokens.find(x => x.name === nm) || null)), name);
  const FXd = id => ev(id => JSON.parse(JSON.stringify(__tc.Store.get('effects', id) || null)), id);
  const tela = async (cx, cy) => { const box = await page.locator('#cv').boundingBox(), p = await ev(([x, y]) => __tc.Render.toScreen(x * 64, y * 64), [cx, cy]); return [box.x + p[0], box.y + p[1]]; };
  const longe = async () => { const b = await page.locator('#cv').boundingBox(); await page.mouse.move(b.x + 8, b.y + b.height - 8); await w(100); };
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const sees = (cx, cy) => ev(([cx, cy]) => { const u = __tc, sc = u.Store.scene(); u.Vision.update(sc, u.App.viewer); return u.Vision.canSee(cx * 64, cy * 64); }, [cx, cy]);
  const viewer = v => ev(v => { __tc.UI.setViewer(v); }, v);
  const soltar = async (fx, cx, cy) => {      // a ferramenta de efeitos: um clique solta a zona no tamanho das opções
    await ev(fx => { __tc.App.opt.fx = fx; __tc.App.opt.fxShape = 'circ'; __tc.App.opt.fxR = 2; __tc.Tools.set('fx'); }, fx);
    const [x, y] = await tela(cx, cy); await page.mouse.click(x, y); await w(200);
    return ev(() => { const fs = __tc.Store.scene().effects; return fs[fs.length - 1].id; });
  };
  const add = (o) => ev(o => { const u = __tc; u.Store.tx('prep', () => u.Store.add('effects', Object.assign({ k: 'circ', r: 1.5, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: null, seed: 5, dur: 0, dur0: 0, at: null, apply: null }, o))); return o.id; }, o);
  const mover = (nome, cx, cy) => ev(([nm, x, y]) => { const u = __tc, k = u.Store.scene().tokens.find(t => t.name === nm); u.Store.tx('Mover', () => u.Store.upd('tokens', k.id, { x: x * 64, y: y * 64 })); }, [nome, cx, cy]);
  const desfazer = () => ev(() => __tc.Tools.undo());
  const escritos = txt => ev(x => new Promise(r => {
    const P = CanvasRenderingContext2D.prototype, f = P.fillText; let k = 0;
    P.fillText = function (s, ...a) { if (String(s) === x) k++; return f.call(this, s, ...a); };
    __tc.Render.request(); requestAnimationFrame(() => requestAnimationFrame(() => { P.fillText = f; r(k); }));
  }), txt);

  const ids = await ev(() => {
    const u = __tc, sc = u.newScene('Lote 7b'); u.Store.addScene(sc); u.Store.setCurrent(sc.id);
    u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }, { id: 'p2', name: 'Bruno', color: '#e07a4f' }];
    const c = sc.cell, o = {};
    u.Store.tx('prep', () => {
      u.Store.scn({ cols: 24, rows: 14, fog: { dynamic: false, manual: false, explored: false, shared: true } });
      for (const [nm, x, y, extra] of [['Dain', 2, 5, { owner: 'p1' }], ['Ogro', 10, 1, {}], ['Lia', 2, 9, { owner: 'p2' }], ['Guarda', 5, 12, {}]]) {
        const k = u.newToken(sc, x * c, y * c, Object.assign({ name: nm, vis: { on: true, range: 0, dark: 0 } }, extra)); u.Store.add('tokens', k); o[nm] = k.id;
      }
    });
    u.Render.fit(); u.setSel([]);
    return o;
  });
  await w(300); await longe();

  // ================= a biblioteca =================
  await ev(() => { __tc.setSel([]); __tc.UI.openTab('fx'); }); await w(200);
  const contar = async tag => { await page.locator('#fxt-' + tag).click(); await w(120); return page.locator('#side .fx-card').count(); };
  const nums = { elem: await contar('elem'), magia: await contar('magia'), natureza: await contar('natureza'), sagrado: await contar('sagrado'), racas: await contar('racas'), todos: await contar('todos') };
  ok(j(nums) === j({ elem: 18, magia: 14, natureza: 9, sagrado: 10, racas: 19, todos: 70 }), 'a biblioteca tem 70 efeitos: 18 de Elementos, 14 de Magia, 9 de Natureza, 10 de Sagrado e sombrio e (lote 19) 19 das Raças — ' + j(nums));
  const regras = await ev(() => ['gelado', 'fumaca', 'brasas', 'cristais', 'cinzas', 'correnteza', 'aguaEletrica', 'vortice', 'gravidade', 'tempo', 'portal', 'runas', 'selos', 'oleo', 'lama', 'jardim', 'espiritos', 'santuario', 'luaSangue'].filter(id => !(__tc.FX.P[id] && __tc.FX.P[id].regra)));
  ok(!regras.length, 'cada zona nova diz a regra dela: ' + j(regras));
  await page.locator('#fxt-todos').click(); await w(100);
  await foto('01-biblioteca');

  // ================= a Fumaça tapa a visão =================
  // (a visão de cada jogador, sem a dos outros: só a do Dain conta aqui)
  await ev(() => { const u = __tc; u.Store.tx('Névoa', () => u.Store.scn({ fog: { dynamic: true, manual: false, explored: false, shared: false } })); }); await w(150);
  await viewer('p1'); await w(150);
  ok(await sees(10.5, 5.5), 'sem nada no caminho, o Dain vê do outro lado da sala');
  await viewer('gm');
  await add({ id: 'z_fum', fx: 'fumaca', x: 6.5 * 64, y: 5.5 * 64, r: 1.5 });
  await viewer('p1'); await w(150);
  ok(!(await sees(10.5, 5.5)) && await sees(2.5, 2.5), 'com a Fumaça no meio, o Dain não vê através dela (e continua vendo o resto)');
  ok(!(await sees(6.5, 5.5)), '… nem dentro dela');
  await viewer('gm');
  await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.upd('effects', 'z_fum', { gm: true })); });
  await viewer('p1'); await w(150);
  ok(await sees(10.5, 5.5), 'a fumaça só do mestre não tapa nada (os jogadores nem a veem)');
  await viewer('gm');
  await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.upd('effects', 'z_fum', { gm: false })); });
  await mover('Dain', 6, 5);
  await viewer('p1'); await w(150);
  ok(await sees(6.9, 5.9) && !(await sees(10.5, 5.5)) && !(await sees(2.5, 5.5)), 'quem está dentro da fumaça só vê o que está dentro dela');
  await viewer('gm');
  await mover('Dain', 2, 5);
  await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', 'z_fum')); });
  await viewer('p1'); await w(150);
  ok(await sees(10.5, 5.5), 'tirar a fumaça devolve a visão');
  // (sem forçar a conta: a tela refaz a visão sozinha quando a fumaça entra ou sai)
  const vendo = (cx, cy) => ev(([cx, cy]) => __tc.Vision.canSee(cx * 64, cy * 64), [cx, cy]);
  await add({ id: 'z_fum2', fx: 'fumaca', x: 6.5 * 64, y: 5.5 * 64, r: 1.5 }); await w(300);
  ok(!(await vendo(10.5, 5.5)), 'com a tela aberta, a fumaça que entra tapa a visão na hora, sem mais nada acontecer');
  await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', 'z_fum2')); }); await w(300);
  ok(await vendo(10.5, 5.5), '… e a que sai devolve a visão na hora');
  await viewer('gm');

  // ================= a Muralha de cristais =================
  const nova = await soltar('cristais', 20.5, 11.5);
  ok(j([(await FXd(nova)).pv, (await FXd(nova)).pvm]) === '[30,30]', 'a Muralha de cristais solta pela ferramenta nasce com 30 pontos de vida');
  await ev(id => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', id)); u.setSel([]); }, nova);
  const mur = await add({ id: 'z_mur', fx: 'cristais', k: 'line', x: 6.5 * 64, y: 1 * 64, r: 9, dir: 90, w: 1, pv: 30, pvm: 30 });
  await viewer('p1'); await w(150);
  ok(!(await sees(10.5, 5.5)), 'a Muralha de cristais tapa a visão');
  await viewer('gm');
  ok(await ev(() => __tc.Walls.blocksMove(__tc.Store.scene(), 2.5 * 64, 5.5 * 64, 10.5 * 64, 5.5 * 64)) && !(await ev(() => __tc.Walls.blocksMove(__tc.Store.scene(), 2.5 * 64, 5.5 * 64, 4.5 * 64, 5.5 * 64))), '… e barra a passagem (o caminho que cruza a muralha está barrado; o que não cruza, livre)');
  ok(await ev(() => __tc.Walls.blocksMove(__tc.Store.scene(), 2.5 * 64, 3.5 * 64, 10.5 * 64, 3.5 * 64)) && !(await ev(() => __tc.Walls.blocksMove(__tc.Store.scene(), 2.5 * 64, 12.5 * 64, 10.5 * 64, 12.5 * 64))), '(a muralha vai de cima, no 1, até o 10: abaixo dela, passa)');
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.UI.openTab('sel'); }, mur); await w(200);
  ok(/Barra a passagem e a visão até quebrar/.test(await page.locator('#fx-regra').innerText()), 'o painel diz a regra da zona');
  ok(await page.locator('#fx-pv').inputValue() === '30' && await page.locator('#fx-pvm').inputValue() === '30', 'os pontos de vida: 30 de 30');
  ok(await escritos('30/30') >= 1, 'no mapa, a barrinha da muralha mostra 30/30 (para o mestre)');
  await page.locator('#fx-pv').fill('-8'); await page.locator('#fx-pv').press('Tab'); await w(200);
  ok((await FXd(mur)).pv === 22 && await escritos('22/30') >= 1, 'o dano com sinal ("-8") tira: 22, e a barrinha acompanha');
  await viewer('p1'); await w(100);
  ok(await escritos('22/30') === 0, '(o jogador não vê os pontos da muralha)');
  await viewer('gm');
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.UI.openTab('sel'); }, mur); await w(200);
  await page.locator('#fx-pv').fill('15'); await page.locator('#fx-pv').press('Tab'); await w(200);
  ok((await FXd(mur)).pv === 15, 'o número sozinho vira o valor novo: 15');
  await clearToasts();
  await page.locator('#fx-pv').fill('-20'); await page.locator('#fx-pv').press('Tab'); await w(250);
  ok(!(await FXd(mur)) && /Os pontos acabaram: a muralha quebrou/.test(await toasts()), 'os pontos acabam: a muralha quebra (com o aviso)');
  ok(!(await ev(() => __tc.Walls.blocksMove(__tc.Store.scene(), 2.5 * 64, 5.5 * 64, 10.5 * 64, 5.5 * 64))), '… e a passagem fica livre');
  await page.locator('.toast-a', { hasText: 'Desfazer' }).click(); await w(200);
  ok((await FXd(mur)) && (await FXd(mur)).pv === 15, 'Desfazer devolve a muralha, com os 15 pontos');
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.UI.openTab('sel'); }, mur); await w(200);
  await foto('02-muralha');
  await clearToasts();
  await page.locator('#fx-quebrar').click(); await w(200);
  ok(!(await FXd(mur)) && /A muralha quebrou/.test(await toasts()), '"Quebrar" tira a muralha num clique');
  await desfazer(); await w(150);
  ok(!!(await FXd(mur)), '(desfeito)');
  await ev(id => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', id)); u.setSel([]); }, mur);
  await ev(() => { const u = __tc; u.Store.tx('Névoa', () => u.Store.scn({ fog: { dynamic: false, manual: false, explored: false, shared: true } })); }); await w(100);

  // ================= o Portal =================
  const por = await soltar('portal', 14.5, 3.5);
  let P = await FXd(por);
  ok(P.fx === 'portal' && P.k === 'circ' && !P.token && P.x === 14.5 * 64 && P.y === 3.5 * 64 && P.x2 === 19.5 * 64 && P.y2 === 3.5 * 64, 'soltar o portal cria a entrada e a saída lado a lado (a saída a dois raios e meio): ' + j([P.x / 64, P.y / 64, P.x2 / 64, P.y2 / 64]));
  // o desenho: os dois círculos (o meio da saída fica escuro; um ponto do mapa longe dele, não)
  const pixel = (cx, cy) => ev(([cx, cy]) => new Promise(r => { __tc.Render.request(); requestAnimationFrame(() => requestAnimationFrame(() => {
    const c = __tc.Render.cv, q = __tc.Render.toScreen(cx * 64, cy * 64), k = c.width / c.clientWidth, cp = document.createElement('canvas'); cp.width = cp.height = 1;
    const g = cp.getContext('2d', { willReadFrequently: true }); g.drawImage(c, Math.round(q[0] * k), Math.round(q[1] * k), 1, 1, 0, 0, 1, 1);
    const d = g.getImageData(0, 0, 1, 1).data; r([d[0], d[1], d[2]]);
  })); }), [cx, cy]);
  const dif = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  // (um pouco abaixo dos centros: a linha que liga os dois, com o portal selecionado, passa bem no meio)
  // (o desenho anima: confere em até quatro quadros)
  let fundo, saida, entrada, viu = false;
  for (let q = 0; q < 4 && !viu; q++) { fundo = await pixel(12.2, 6.2); saida = await pixel(19.5, 4.1); entrada = await pixel(14.5, 4.1); viu = dif(saida, fundo) > 30 && dif(entrada, fundo) > 30; if (!viu) await w(120); }
  ok(viu, 'o portal desenha os dois círculos: a entrada e a saída — ' + j([entrada, saida, fundo]));
  await foto('03-portal');
  const pos = async nome => { const k = await T(nome); return [k.x / 64, k.y / 64]; };
  await clearToasts();
  await mover('Ogro', 14, 3);
  ok(j(await pos('Ogro')) === '[19,3]' && /Ogro atravessou o portal/.test(await toasts()), 'o Ogro solto na entrada sai na saída (com o aviso): ' + j(await pos('Ogro')));
  await desfazer(); await w(150);
  ok(j(await pos('Ogro')) === '[10,1]', 'um Desfazer volta o Ogro para onde ele estava antes de andar (era o mesmo passo)');
  await mover('Ogro', 19, 4);
  ok(j(await pos('Ogro')) === '[14,3]', 'solto na saída, ele sai na entrada (o portal vale nos dois sentidos): ' + j(await pos('Ogro')));
  await mover('Ogro', 15, 3);
  ok(j(await pos('Ogro')) === '[15,3]', 'andar dentro do círculo em que já está não atravessa');
  await mover('Ogro', 10, 1);
  // de fora (o pedido de um jogador): atravessa num passo logo depois
  await clearToasts();
  await ev(id => __tc.Store.remote({ t: 'upd', c: 'tokens', id, p: { x: 14 * 64, y: 4 * 64 } }), ids.Lia); await w(250);
  ok(j(await pos('Lia')) === '[19,3]' && /Lia atravessou o portal/.test(await toasts()), 'a Lia, movida por um jogador, atravessa num passo do mestre: ' + j(await pos('Lia')));
  await desfazer(); await w(150);
  ok(j(await pos('Lia')) === '[14,4]', '… e desfazer esse passo a deixa onde o jogador soltou');
  await ev(id => { const u = __tc; u.Store.tx('x', () => u.Store.upd('tokens', id, { x: 2 * 64, y: 9 * 64 })); }, ids.Lia);
  // no aparelho de um jogador, quem atravessa é o mestre
  const noJog = await ev(id => {
    const u = __tc, antes = u.Nuvem.jogador; u.Nuvem.jogador = () => true;
    try { u.Store.tx('Mover', () => u.Store.upd('tokens', id, { x: 14 * 64, y: 3 * 64 })); return [u.Store.get('tokens', id).x / 64, u.Store.get('tokens', id).y / 64]; } finally { u.Nuvem.jogador = antes; }
  }, ids.Dain);
  ok(j(noJog) === '[14,3]', 'no aparelho do jogador o token fica onde ele soltou (o mestre é que faz atravessar)');
  await mover('Dain', 2, 5);
  // arrastar a saída leva só a saída
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.Tools.set('select'); }, por); await w(150);
  { const [x0, y0] = await tela(19.5, 3.5), [x1, y1] = await tela(19.5, 8.5); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await w(200); }
  P = await FXd(por);
  ok(P.x === 14.5 * 64 && P.y === 3.5 * 64 && P.x2 === 19.5 * 64 && P.y2 === 8.5 * 64, 'arrastar o círculo da saída leva só a saída: ' + j([P.x / 64, P.y / 64, P.x2 / 64, P.y2 / 64]));
  await mover('Ogro', 14, 3);
  ok(j(await pos('Ogro')) === '[19,8]', 'e o token passa a sair lá');
  await mover('Ogro', 10, 1);
  await ev(id => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', id)); u.setSel([]); }, por);

  // ================= as Runas-armadilha =================
  const run = await soltar('runas', 6.5, 9.5);
  ok((await FXd(run)).gm === true, 'as runas soltas pelo mestre nascem escondidas dos jogadores');
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.UI.openTab('sel'); }, run); await w(200);
  ok(await page.locator('#fx-revelar').count() === 1, 'o painel delas tem "Revelar aos jogadores"');
  await clearToasts();
  await ev(() => __tc.setSel([]));
  await mover('Lia', 6, 9);
  ok(/Lia pisou nas Runas-armadilha/.test(await toasts()), 'a Lia pisa nas runas escondidas: o mestre fica sabendo — ' + await toasts());
  await clearToasts();
  await mover('Lia', 7, 9);
  ok(!/pisou/.test(await toasts()), 'andar por cima das runas, sem sair delas, não avisa de novo');
  await mover('Lia', 6, 9);
  // (sai e entra de novo: o aviso volta, para o "Revelar" de baixo)
  await clearToasts();
  await mover('Lia', 2, 9); await mover('Lia', 6, 9);
  await page.locator('.toast-a', { hasText: 'Revelar' }).click(); await w(150);
  ok((await FXd(run)).gm === false, '"Revelar", no aviso, mostra as runas aos jogadores');
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.UI.openTab('sel'); }, run); await w(200);
  await page.locator('#fx-esconder').click(); await w(150);
  ok((await FXd(run)).gm === true, '"Esconder de novo", no painel');
  await page.locator('#fx-revelar').click(); await w(150);
  ok((await FXd(run)).gm === false, '"Revelar aos jogadores", no painel');
  await mover('Lia', 2, 9); await clearToasts();
  await mover('Lia', 6, 9);
  ok(!/pisou/.test(await toasts()), 'as runas já reveladas não avisam (todo mundo vê)');
  await mover('Lia', 2, 9);
  await ev(id => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', id)); u.setSel([]); }, run);

  // ================= as zonas de condição e os lembretes, no começo da vez =================
  const nev = await soltar('espiritos', 2.5, 9.5);
  ok(j((await FXd(nev)).apply) === j({ bar: '', amt: '', cond: { id: 'medo', n: 0, d: 0 }, skip: [] }), 'a Névoa de espíritos nasce com a condição dela guardada (Amedrontado)');
  await ev(() => __tc.setSel([]));
  const lama = await add({ id: 'z_lama', fx: 'lama', x: 10.5 * 64, y: 1.5 * 64, r: 1.5 });
  void lama;
  await ev(o => {
    const u = __tc, g = id => u.Store.get('tokens', id);
    u.Act.turnAdd([g(o.Ogro), g(o.Lia), g(o.Guarda)]);
    u.Act.turnPatch(x => { const v = { [o.Ogro]: 20, [o.Lia]: 15, [o.Guarda]: 5 }; for (const e of x.list) e.init = v[e.token]; u.turnSort(x.list); x.cur = x.list[0].id; x.round = 1; }, 'prep');
  }, ids); await w(100);
  await ev(() => __tc.UI.passarTurno(1)); await w(250);
  ok(await page.locator('#zona-z_lama').count() === 1 && /Ogro começa a vez dentro de Lama: só se anda a metade\./.test(await page.locator('#zonas').innerText()), 'o combate começa na vez do Ogro, dentro da Lama: o lembrete — ' + (await page.locator('#zonas').innerText().catch(() => '')).replace(/\s+/g, ' '));
  ok(await page.locator('#zona-z_lama .btn').count() === 1, '(o lembrete só tem Ok: nada muda sozinho)');
  await foto('04-lembrete');
  await page.locator('#zona-ok-z_lama').click(); await w(120);
  ok(await page.locator('#zonas').isHidden(), 'Ok fecha o lembrete');
  await ev(() => __tc.UI.passarTurno(1)); await w(250);
  ok(await page.locator('#zona-' + nev).count() === 1 && /Lia começa a vez dentro de Névoa de espíritos: Amedrontado\./.test(await page.locator('#zonas').innerText()) && await page.locator('#zona-z_lama').count() === 0, 'na vez da Lia, dentro da Névoa: a pergunta "Amedrontado" (e o lembrete da Lama não, ela não está lá)');
  await page.locator('#zona-ok-' + nev).click(); await w(200);
  ok((await T('Lia')).conds.includes('medo'), '"Aplicar": a Lia fica Amedrontada');
  await ev(() => __tc.UI.passarTurno(1)); await w(250);
  ok(await page.locator('#zonas').isHidden(), 'na vez do Guarda, fora das zonas: nenhum aviso');
  // a Distorção do tempo: Lento ou Acelerado
  const tem = await soltar('tempo', 5.5, 12.5);
  ok((await FXd(tem)).apply.cond.id === 'lento', 'a Distorção do tempo nasce com Lento');
  await ev(id => { __tc.setSel([{ c: 'effects', id }]); __tc.UI.openTab('sel'); }, tem); await w(200);
  await page.locator('#fx-cond .seg-b', { hasText: 'Acelerado' }).click(); await w(150);
  ok((await FXd(tem)).apply.cond.id === 'acelerado', 'no painel, "Dentro dela": Acelerado');
  await ev(() => __tc.setSel([]));
  await ev(() => __tc.UI.passarTurno(1)); await ev(() => __tc.UI.passarTurno(1)); await ev(() => __tc.UI.passarTurno(1)); await w(250);
  ok(/Guarda começa a vez dentro de Distorção do tempo: Acelerado\./.test(await page.locator('#zonas').innerText().catch(() => '')), 'o Guarda começa a vez dentro dela: a pergunta diz Acelerado');
  // o jogador não vê os avisos
  await viewer('p1'); await w(150);
  await ev(() => __tc.UI.passarTurno(1)); await w(200);
  ok(await page.locator('#zonas').isHidden(), 'na visão do jogador, nenhum aviso de zona');
  await viewer('gm');
  await ev(o => { const u = __tc; u.Act.turnPatch(x => { x.list = []; x.on = false; x.cur = null; x.round = 1; }, 'limpa'); u.Store.tx('x', () => { for (const id of o) u.Store.del('effects', id); }); }, [nev, 'z_lama', tem]); await w(100);

  // ================= as combinações =================
  await add({ id: 'z_oleo', fx: 'oleo', x: 5.5 * 64, y: 12.5 * 64, r: 1.5 });
  ok(await page.locator('#combos').isHidden(), 'o óleo sozinho: nada a sugerir');
  await add({ id: 'z_fogo', fx: 'fogo', x: 7.5 * 64, y: 12.5 * 64, r: 1 });
  ok(await page.locator('#combos').isVisible() && /Fogo no óleo: explosão\?/.test(await page.locator('#combos').innerText()), 'o fogo encosta no óleo: o cartão "Fogo no óleo: explosão?" — ' + (await page.locator('#combos').innerText().catch(() => '')).replace(/\s+/g, ' '));
  await foto('05-combinacao');
  await page.locator('#combo-no-z_oleo').click(); await w(120);
  ok(await page.locator('#combos').isHidden(), '"Pular" fecha o cartão');
  await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.upd('effects', 'z_fogo', { x: 7 * 64 })); }); await w(120);
  ok(await page.locator('#combos').isHidden(), 'mexer de novo no mesmo par não pergunta outra vez');
  await add({ id: 'z_lava', fx: 'lava', x: 3.5 * 64, y: 12.5 * 64, r: 1 });
  ok(await page.locator('#combo-z_oleo').count() === 1, 'a lava, outra zona de fogo, encosta no óleo: o cartão volta (é outro par)');
  await clearToasts();
  await page.locator('#combo-ok-z_oleo').click(); await w(300);
  let O = await FXd('z_oleo');
  ok(O && O.fx === 'fogo' && !(await FXd('z_lava')) && !!(await FXd('z_fogo')), '"Aplicar": o óleo vira Fogo e a lava, que disparou, sai (o outro fogo fica)');
  ok(/O óleo explodiu em fogo\./.test(await toasts()), 'o aviso, com Desfazer');
  ok(/O óleo explodiu em fogo: quem está dentro/.test(await page.locator('.modal-t').innerText().catch(() => '')) && /Guarda/.test(await page.locator('#ar-lista, .area-list').first().innerText().catch(() => '')) && (await page.locator('#ar-sug').innerText().catch(() => '')) === 'Sugestão: Queimando', 'e abre o dano para quem está dentro (o Guarda), com a sugestão "Queimando"');
  await foto('06-explosao');
  await page.keyboard.press('Escape'); await w(150);
  await desfazer(); await w(200);
  O = await FXd('z_oleo');
  ok(O.fx === 'oleo' && !!(await FXd('z_lava')) && await page.locator('#combos').isHidden(), 'um Desfazer devolve o óleo e a lava (e não pergunta de novo pelo que acabou de ser desfeito)');
  await ev(() => { const u = __tc; u.Store.tx('x', () => { for (const id of ['z_oleo', 'z_fogo', 'z_lava']) u.Store.del('effects', id); }); }); await w(100);
  // raio na água, gelo na água
  await add({ id: 'z_agua', fx: 'agua', x: 14.5 * 64, y: 11.5 * 64, r: 1.5 });
  await add({ id: 'z_raio', fx: 'raio', x: 15.5 * 64, y: 11.5 * 64, r: 1 });
  ok(/Raio na água: eletrificar\?/.test(await page.locator('#combos').innerText().catch(() => '')), 'raio na água: "Raio na água: eletrificar?"');
  await page.locator('#combo-ok-z_agua').click(); await w(200);
  ok((await FXd('z_agua')).fx === 'aguaEletrica' && !(await FXd('z_raio')), '"Aplicar": a água vira Água eletrificada');
  await add({ id: 'z_agua2', fx: 'agua', x: 20.5 * 64, y: 11.5 * 64, r: 1.5 });
  await mover('Guarda', 20, 11);
  await add({ id: 'z_gelo', fx: 'gelo', x: 20.5 * 64, y: 10 * 64, r: 1 });
  ok(/Gelo na água: congelar o chão\?/.test(await page.locator('#combos').innerText().catch(() => '')), 'gelo na água: "Gelo na água: congelar o chão?"');
  await page.locator('#combo-ok-z_agua2').click(); await w(250);
  ok((await FXd('z_agua2')).fx === 'gelado' && !(await FXd('z_gelo')), '"Aplicar": a água vira Chão congelado');
  ok((await page.locator('#ar-sug').innerText().catch(() => '')) === 'Sugestão: Congelado', 'e o dano de quem estava na água vem com a sugestão da combinação (Congelado, não a do Chão congelado)');
  await page.keyboard.press('Escape'); await w(150);
  await mover('Guarda', 5, 12);
  await add({ id: 'z_fogo2', fx: 'fogo', x: 20.5 * 64, y: 3 * 64, r: 1 });
  await add({ id: 'z_oleo2', fx: 'oleo', x: 14.5 * 64, y: 3 * 64, r: 1 });
  ok(await page.locator('#combos').isHidden(), 'fogo e óleo longe um do outro: nada');
  // o que um jogador solta também vale (o cartão aparece para o mestre)
  await ev(() => __tc.Store.remote({ t: 'add', c: 'effects', v: { id: 'z_fogo3', fx: 'fogo', k: 'circ', x: 15.5 * 64, y: 3 * 64, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: false, by: 'p1', seed: 3, dur: 0, dur0: 0, at: null, apply: null } })); await w(150);
  ok(await page.locator('#combo-z_oleo2').count() === 1, 'o fogo que um jogador solta em cima do óleo também gera o cartão, para o mestre');
  await viewer('p1'); await w(150);
  ok(await page.locator('#combos').isHidden(), 'na visão do jogador, o cartão não aparece');
  await viewer('gm');
  await ev(() => { const u = __tc; u.Store.tx('x', () => { for (const id of ['z_agua', 'z_agua2', 'z_fogo2', 'z_oleo2', 'z_fogo3']) if (u.Store.get('effects', id)) u.Store.del('effects', id); }); }); await w(100);
  ok(await page.locator('#combos').isHidden(), 'as zonas saem: o cartão sai junto');

  // ================= trocar o tipo no painel =================
  await add({ id: 'z_troca', fx: 'fogo', x: 10.5 * 64, y: 8.5 * 64, r: 1 });
  await ev(() => { __tc.setSel([{ c: 'effects', id: 'z_troca' }]); __tc.UI.openTab('sel'); }); await w(150);
  await page.locator('#fx-id').selectOption('portal'); await w(150);
  let Z = await FXd('z_troca');
  ok(Z.fx === 'portal' && Number.isFinite(Z.x2) && Number.isFinite(Z.y2) && await page.locator('#fx-k').count() === 0 && await page.locator('#fx-tok').count() === 0, 'virar Portal dá a saída ao efeito (e o painel tira a forma e o "preso a")');
  await page.locator('#fx-id').selectOption('cristais'); await w(150);
  Z = await FXd('z_troca');
  ok(Z.pv === 30 && Z.pvm === 30, 'virar Muralha dá os pontos de vida');
  await page.locator('#fx-id').selectOption('luaSangue'); await w(150);
  Z = await FXd('z_troca');
  ok(Z.apply && Z.apply.cond.id === 'furia', 'virar Lua de sangue dá a condição dela (Fúria)');
  await page.locator('#fx-id').selectOption('agua'); await w(150);
  ok((await FXd('z_troca')).apply === null, 'e virar Água tira a condição que era da Lua de sangue');
  await ev(() => { const u = __tc; u.Store.tx('x', () => u.Store.del('effects', 'z_troca')); u.setSel([]); });

  // ================= o efeito pedido por um jogador =================
  const pedido = await ev(() => {
    const u = __tc, sc = u.Store.scene(), base = { k: 'circ', x: 64, y: 64, r: 1, w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8, token: null, gm: true, by: 'p1', seed: 3, dur: 0 };
    sc.perms = Object.assign({}, sc.perms, { efeitos: true });
    const v = (id, o) => u.Proj.validar({ t: 'add', c: 'effects', v: Object.assign({ id }, base, o) }, 'p1', sc);
    const a = v('j_por', { fx: 'portal', x2: 300, y2: 64, k: 'rect' }), b = v('j_mur', { fx: 'cristais', pv: 12, pvm: 40 }), c = v('j_tem', { fx: 'tempo', apply: { cond: { id: 'acelerado' } } }), d = v('j_run', { fx: 'runas' });
    return { por: a && [a.v.k, a.v.x2, a.v.y2], mur: b && [b.v.pv, b.v.pvm], tem: c && c.v.apply && c.v.apply.cond.id, run: d && d.v.gm };
  });
  ok(j(pedido) === j({ por: ['circ', 300, 64], mur: [12, 40], tem: 'acelerado', run: false }), 'o efeito pedido por um jogador: o portal com a saída (e de círculos), a muralha com os pontos, a Distorção com a escolha dele, as runas à vista — ' + j(pedido));

  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(!inesperados.length, 'sem erros no console');
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
