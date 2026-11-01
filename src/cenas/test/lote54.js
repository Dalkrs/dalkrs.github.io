// Bateria do lote 54 nas Cenas (o gerador de lugares mais caprichado):
//   · os objetos que nenhum gerador punha agora entram: a feira em volta da praça do vilarejo, a placa do armazém e da
//     loja, o bote no rio e no porto, a forja (a pedra de amolar e os lingotes), o quadro de missões, o castelo (os
//     bonecos, o alvo, o troféu), o trono de ossos e o buraco nas masmorras, o torii e a lanterna de pedra no Oriental;
//   · as pontes do vilarejo e da cidade são plataformas leves por cima da ponte desenhada (a de pedra também), e a água
//     dos dois fica leve: o desenho do fundo aparece;
//   · as catacumbas têm túneis cavados (as casas cavadas, a parede tremida, tudo ligado);
//   · as cenas criadas não dão erro no console.
const fs = require('fs'), path = require('path');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const j = JSON.stringify;

(async () => {
  const t = await open({ w: 1400, h: 950 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 150);
  const foto = async nome => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  await w(600);
  // cria a cena de um lugar e devolve a contagem dos objetos novos, as áreas leves e a cena
  const criar = (id, op, seed, estilo, ver) => ev(async ({ id, op, seed, estilo, ver }) => {
    const L = __tc.Gerador.LUGARES.find(l => l.id === id), E = Object.assign(L.padrao(), op), p = L.gerar(E, { estilo: estilo || 'comum', seed });
    const sc = await L.criar(p, 'Lote 54 ' + id, { hora: 'dia', clima: '', relevo: true, op: E, o: Object.assign(L.opcoesDe(E), { estilo: estilo || 'comum', relevo: true }) });
    if (ver) { __tc.Store.setCurrent(sc.id); __tc.Render.fit(); }
    const conta = {};
    for (const k of sc.tokens) if (k.prop) conta[k.prop] = (conta[k.prop] || 0) + 1;
    const ter = sc.shapes.filter(s => s.ter).map(s => ({ t: s.ter.t, h: s.ter.h, a: s.a }));
    return { conta, ter, pontes: (p.pontes || (p.ponte ? [p.ponte] : [])).map(b => [b.x, b.y]), feira: (p.feira || []).map(e => e.id), escavado: (p.escavado || []).length, cell: sc.cell, id: sc.id };
  }, { id, op, seed, estilo, ver });
  const perto = async (x, y, z) => { await ev(([x, y, z]) => { __tc.App.view.z = z; __tc.Render.centerOn(x * 64, y * 64); }, [x, y, z || 1.3]); await w(700); };

  /* ---------- o vilarejo: a feira, a placa, o bote e a ponte ---------- */
  const v = await criar('vila', { rio: true, tamanho: 'vila' }, 11, 'comum', true);
  ok(v.conta.barracaFeira >= 1 && (v.conta.frutas || 0) + (v.conta.sacos || 0) + (v.conta.carrinho || 0) >= 2, 'o vilarejo: a feira em volta da praça — ' + j(v.feira));
  ok(v.conta.bote === 1, 'o bote no rio (longe da ponte)');
  ok(v.conta.quadroMissoes >= 1 && v.conta.rebolo >= 1, 'a taverna com o quadro de missões e a ferraria com a pedra de amolar: ' + j({ q: v.conta.quadroMissoes, r: v.conta.rebolo }));
  const agV = v.ter.filter(x => x.t === 'agua'), plV = v.ter.filter(x => x.t === 'plataforma');
  ok(agV.length && agV.every(x => x.a < 0.5) && plV.length >= v.pontes.length && plV.every(x => x.a < 0.5 && x.h > 0), 'a água e a ponte ficam leves (o desenho do fundo aparece), e a ponte continua acima da água');
  await w(800); await foto('l54-vila-feira');
  await perto(v.pontes[0][0], v.pontes[0][1], 1.4); await foto('l54-ponte-vila');

  /* ---------- a cidade: a ponte de pedra também é plataforma; a placa da loja ---------- */
  const c = await criar('cidade', { rio: true }, 3333, 'comum', true);
  ok(c.ter.filter(x => x.t === 'plataforma' && x.h >= 2).length >= c.pontes.length && c.pontes.length > 0, 'a cidade: cada ponte (a de pedra também) é uma plataforma — ' + c.pontes.length);
  ok(c.conta.placaLoja >= 1, 'a placa na frente da loja e do armazém: ' + c.conta.placaLoja);
  await perto(c.pontes[0][0], c.pontes[0][1], 1.3); await foto('l54-ponte-cidade');

  /* ---------- o oriental ---------- */
  const o = await criar('vila', { rio: false }, 222, 'oriental');
  ok((o.conta.lanternaPedra || 0) + (o.conta.bonsai || 0) + (o.conta.torii || 0) >= 1, 'o vilarejo oriental: o torii, a lanterna de pedra ou o bonsai — ' + j({ t: o.conta.torii, l: o.conta.lanternaPedra, b: o.conta.bonsai }));

  /* ---------- o castelo, o porto, a masmorra ---------- */
  const k = await criar('castelo', {}, 11, 'comum', true);
  ok(k.conta.boneco >= 1 && k.conta.alvo === 1 && k.conta.trofeu === 1 && k.conta.rebolo === 1, 'o castelo: os bonecos e o alvo do treino, o troféu e a pedra de amolar — ' + j({ b: k.conta.boneco, a: k.conta.alvo, t: k.conta.trofeu }));
  await w(800); await foto('l54-castelo');
  const pt = await criar('porto', {}, 11);
  ok(pt.conta.bote === 1, 'o porto: o bote na água');
  let ossos = 0, buracos = 0;
  for (const s of [11, 222, 3333, 44444, 555, 6666]) { const m = await criar('masmorra', {}, s); ossos += m.conta.tronoOssos || 0; buracos += m.conta.buraco || 0; }
  ok(ossos >= 1 && buracos >= 1, 'as masmorras: o trono de ossos e o buraco aparecem — ' + j({ ossos, buracos }));

  /* ---------- as catacumbas cavadas ---------- */
  const cat = await criar('catacumbas', {}, 44444, 'comum', true);
  ok(cat.escavado > 10, 'as catacumbas: os túneis cavados — ' + cat.escavado + ' casas');
  const paredes = await ev(id => { const sc = __tc.Store.S.scenes[id]; return { tortas: sc.walls.filter(w => w.k === 'wall' && w.x1 !== w.x2 && w.y1 !== w.y2).length, retas: sc.walls.filter(w => w.k === 'wall' && (w.x1 === w.x2 || w.y1 === w.y2)).length }; }, cat.id);
  ok(paredes.tortas > 20 && paredes.retas > 20, 'a parede tremida dos túneis e a de cantaria do resto: ' + j(paredes));
  await w(800); await foto('l54-catacumbas');
  await perto(15, 14, 1.3); await foto('l54-catacumbas-perto');

  const erros = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 8).join('\n'));
  ok(!erros.length, 'sem erros no console');
  console.log((fails ? fails + ' de ' : '') + n + ' verificações ' + (fails ? 'falharam' : 'passaram'));
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
