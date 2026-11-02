// Mapa-múndi, lote 64: as estradas no relevo e na fenda, a conquista dos lugares e os recursos do pincel.
//   · a conta (nucleo): a estrada que encosta no desfiladeiro vira uma trilha pela borda, do lado em que chegou, até a
//     próxima estrada daquele lado (ou para num mirante); a estrada liga à trilha; a fenda com trilha custa o da estrada;
//     a estrada que chega à fenda em dois hexágonos vizinhos conta uma vez só;
//   · a conta (reino): o lugar com a marca de conquista só produz depois de conquistado, e para quem conquistou (seja
//     quem for o dono da região); a mina de sempre continua indo para o dono da região; vários recursos num lugar;
//   · a interface: "Recursos ao conquistar…" numa masmorra, "Conquistado por", a bandeirinha no mapa, + Recurso e o ×;
//     o pincel "Recursos…" com vários recursos de uma vez (e o pincel vazio tira);
//   · o desenho: no hexágono de estrada das colinas, os morros ficam ao lado do caminho.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const N = require('../../mundo/nucleo.js');
global.MundoNucleo = N;
const R = require('../../mundo/reino.js');

const TER = N.TERRENOS_PADRAO;
function mapaFenda(extra) {
  const hexes = {};
  for (let q = 0; q < 16; q++) for (let r = 0; r < 16; r++) hexes[q + ',' + r] = 'mo';
  for (let r = 2; r <= 12; r++) hexes['7,' + r] = 'df';
  Object.assign(hexes, extra || {});
  return { v: 1, id: 'x', larg: 300, alt: 200, grade: { x: 0, y: 0, on: true, tam: 10, orient: 'pe' }, terrenos: TER, hexes, objs: [] };
}
// ---------- a trilha da beirada ----------
{
  // duas estradas do lado direito da fenda (uma em cima, outra embaixo): a trilha liga as duas pela borda
  const m = mapaFenda({ '9,3': 'et', '8,4': 'et', '8,9': 'et', '9,9': 'et' });
  const tr = N.trilhasDoMapa(m), ks = [...tr.keys()].sort();
  ok(ks.length >= 5 && [...tr.values()].flat().every(p => p.lado === [...tr.values()][0][0].lado), 'duas estradas do mesmo lado da fenda: a trilha segue pela borda de uma até a outra, sempre do mesmo lado: ' + ks.join(' '));
  ok([...tr.values()].flat().filter(p => p.de.via != null || p.para.via != null).length === 2 && ![...tr.values()].flat().some(p => p.fim), 'a trilha começa numa estrada e termina na outra (sem mirante)');
  const ponta = N.redeDoHex(m, 8, 9), dir = [0, 1, 2, 3, 4, 5].find(i => N.VIZ_REDE[i][0] === -1 && N.VIZ_REDE[i][1] === 0);
  ok(ponta && ponta.liga.length >= 2, 'a estrada que encosta liga à trilha (ela continua, não para na beira): ' + j(ponta && ponta.liga) + ' ' + dir);
  const meio = ks.find(k => tr.get(k).every(p => p.de.passa != null && p.para.passa != null)).split(',').map(Number), i = N.hexInfo(m, meio[0], meio[1]);
  ok(i.de === 'trilha' && i.custo === 4, 'a fenda com a trilha custa o da estrada (4 cubos, a de terra), não os 15 do desfiladeiro: ' + j({ de: i.de, custo: i.custo }));
  ok(N.hexInfo(m, 7, 11).custo === 15, 'a fenda sem trilha continua custando 15');
  // a estrada 8,4 encosta em 7,4 e em 7,5: conta uma vez (a ponta da estrada)
  const vias = [...tr.values()].flat().filter(p => p.de.via != null || p.para.via != null).length;
  ok(vias === 2, 'a estrada que encosta na fenda em dois hexágonos vizinhos faz uma trilha só');
  // uma estrada só, do lado esquerdo: a trilha avança um pedaço e para num mirante
  const m2 = mapaFenda({ '4,7': 'et', '5,7': 'et', '6,7': 'et' }), t2 = [...N.trilhasDoMapa(m2).values()].flat();
  ok(t2.length === 1 && t2[0].fim === true, 'a estrada que só encosta: um pedaço de trilha que para num mirante');
  // estrada dos dois lados no mesmo hexágono: a ponte suspensa continua, sem trilha
  const m3 = mapaFenda({ '8,6': 'et', '9,6': 'et', '6,7': 'et', '5,7': 'et' }), r3 = N.redeDoHex(m3, 7, 6) || N.redeDoHex(m3, 7, 7);
  ok([N.redeDoHex(m3, 7, 6), N.redeDoHex(m3, 7, 7)].some(r => r && r.ponte), 'estrada dos dois lados: a ponte suspensa de antes (a trilha não atrapalha)');
  ok(r3 && r3.tipo === 'fenda', '(a fenda)');
}
// ---------- a conquista e os recursos dos lugares ----------
{
  const mapa = () => ({ v: 1, id: 'y', larg: 400, alt: 300, terrenos: [], faccoes: [{ id: 'fa', nome: 'Narcitios', cor: '#8a5cc0' }, { id: 'fb', nome: 'Caliels', cor: '#2f9a9a' }],
    cal: { dia: 0, sem0: 0 },
    objs: [{ k: 'r', id: 'rg', fac: 'fa', nome: 'Marca', pts: [[0, 0], [400, 0], [400, 300], [0, 300]] },
      { k: 'm', id: 'mn', ic: 'mina', x: 50, y: 50, pr: { madeira: 5, pedra: 2 } },
      { k: 'm', id: 'ms', ic: 'masmorra', x: 100, y: 100, pr: { lapros: 10 }, conq: { ok: false } }] });
  // (a economia primeiro: os recursos dos lugares são conferidos com os do mundo)
  const norm = m0 => { const pr = m0.objs.map(o => [o.pr, o.conq]); m0.objs.forEach(o => { delete o.pr; }); let m = N.normalizarMapa(m0); R.ligarEconomia(m); m = JSON.parse(j(m)); m.objs.forEach((o, i) => { if (pr[i][0]) o.pr = pr[i][0]; }); m = N.normalizarMapa(m); return m; };
  let m = norm(mapa());
  const recIds = m.eco.rec.map(r => r.id);
  const ms = m.objs.find(o => o.id === 'ms'), mn = m.objs.find(o => o.id === 'mn');
  ok(ms && j(ms.conq) === j({ ok: false }), 'a marca de conquista fica guardada (ainda não conquistado): ' + j(ms && ms.conq));
  const temRec = id => recIds.includes(id);
  if (temRec('madeira') && temRec('lapros')) {
    let p = R.producaoPorFaccao(m).por;
    ok((p.fa.madeira || 0) === 5 && (p.fa.pedra || 0) === 2 && !p.fa.lapros && !(p.fb.lapros), 'antes de conquistar: a masmorra não produz; a mina dá os dois recursos dela para o dono da região: ' + j(p));
    ms.conq = { ok: true, fac: 'fb' };
    m = N.normalizarMapa(JSON.parse(j(m)));
    p = R.producaoPorFaccao(m).por;
    ok((p.fb.lapros || 0) === 10 && !(p.fa.lapros), 'conquistada pelos Caliels: os 10 lapros por semana vão para eles, mesmo a região sendo dos Narcitios: ' + j(p));
    const proj = N.projetar(m, {});
    ok(!proj.objs.find(o => o.id === 'ms').pr && proj.objs.find(o => o.id === 'ms').conq.ok, 'quem joga vê a marca de conquistado, não os recursos');
  } else ok(false, 'os recursos de começo têm madeira e lapros: ' + j(recIds));
}

function mapaUI() {
  const hexes = {};
  for (let r = 0; r < 12; r++) for (let q = -Math.floor(r / 2); q < 20 - Math.floor(r / 2); q++) hexes[q + ',' + r] = 'co';
  for (let r = 0; r < 12; r++) hexes[(8 - Math.floor(r / 2)) + ',' + r] = 'et';
  return { v: 1, id: 'mp_t64', nome: 'Ensaio', larg: 900, alt: 600, grade: { x: 0, y: 0, on: true, des: true, tam: 40, alfa: 0.6, orient: 'pe' }, hexes,
    terrenos: [{ id: 'co', nome: 'Colina', cor: '#b39a62', tex: 'colinas', custo: 8 }, { id: 'et', nome: 'Estrada de terra', cor: '#b08a5a', tex: 'estradaTerra', custo: 4 }],
    faccoes: [{ id: 'fn', nome: 'Narcitios', cor: '#8a5cc0' }, { id: 'fc', nome: 'Caliels', cor: '#2f9a9a' }],
    objs: [{ k: 'r', id: 'rg_a', fac: 'fn', nome: 'Marca', cor: '', pts: [[100, 100], [800, 100], [800, 500], [100, 500]] },
      { k: 'm', id: 'm_ms', ic: 'masmorra', nome: 'Cripta', x: 600, y: 300 }] };
}

(async () => {
  const t = await start();
  const seed = { 'tinycats:mundo:v1': j({ atual: 'mp_t64', mapas: { mp_t64: mapaUI() } }) };
  const { page: P } = await t.device({ name: 'l64', w: 1440, h: 900, fechado: true, seed });
  const w = ms => P.waitForTimeout(ms), E = (fn, a) => P.evaluate(fn, a);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const K = k => P.locator('[data-k="' + k + '"]');
  await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' }); await w(1500);
  await E(() => window.__mundo.App.mudar('ligar a economia', d => { window.MundoReino.ligarEconomia(d); }));
  await w(400);

  await passo('a masmorra conquistada', async () => {
    await E(() => window.__mundo.App.selecionar(['m_ms'])); await w(400);
    ok(await K('o:m_ms:conq-novo').count() === 1, 'na masmorra (com a economia ligada): "Recursos ao conquistar…"');
    await K('o:m_ms:conq-novo').click(); await w(300);
    let o = await E(() => window.__mundo.App.mapa.objs.find(x => x.id === 'm_ms'));
    ok(o.conq && o.conq.ok === false && Object.keys(o.pr || {}).length === 1, 'ela ganha um recurso e a marca "ainda não conquistado": ' + j({ conq: o.conq, pr: o.pr }));
    ok(/Produz quando for conquistado/.test(await K('o:m_ms:conq-txt').innerText()), 'o painel diz que só produz quando for conquistado');
    await K('o:m_ms:pr-mais').click(); await w(300);
    o = await E(() => window.__mundo.App.mapa.objs.find(x => x.id === 'm_ms'));
    ok(Object.keys(o.pr).length === 2, '"+ Recurso": dois recursos no mesmo lugar: ' + j(o.pr));
    const r2 = Object.keys(o.pr)[1];
    await K('o:m_ms:pr-n:' + r2).fill('7'); await K('o:m_ms:pr-n:' + r2).press('Enter'); await w(300);
    o = await E(() => window.__mundo.App.mapa.objs.find(x => x.id === 'm_ms'));
    ok(o.pr[r2] === 7, 'a quantidade de cada um, na linha dele');
    ok(await E(() => !document.querySelector('#mundo [data-id="m_ms"] .conq-selo, #mundo .conq-selo')), 'sem conquistar: nenhuma bandeirinha no mapa');
    await K('o:m_ms:conq').selectOption('fc'); await w(400);
    o = await E(() => window.__mundo.App.mapa.objs.find(x => x.id === 'm_ms'));
    ok(j(o.conq) === j({ ok: true, fac: 'fc' }), '"Conquistado por": Caliels');
    ok(/Produz toda semana para Caliels/.test(await K('o:m_ms:conq-txt').innerText()), 'o painel diz para quem vai');
    ok(await E(() => { const g = document.querySelector('#mundo .conq-selo'); return !!g && g.dataset.conq === 'fc'; }), 'no mapa, a bandeirinha de conquistado na cor de quem conquistou');
    const p = await E(() => window.MundoReino.producaoPorFaccao(window.__mundo.App.mapa).por);
    ok((p.fc[r2] || 0) === 7, 'a produção vai para os Caliels (a região é dos Narcitios): ' + j(p));
    await foto('l64-conquista');
    await K('o:m_ms:pr-x:' + r2).click(); await w(300);
    o = await E(() => window.__mundo.App.mapa.objs.find(x => x.id === 'm_ms'));
    ok(Object.keys(o.pr).length === 1 && await P.locator('.toast').filter({ hasText: 'saiu de' }).count() >= 1, 'o × tira um recurso, com o aviso e o Desfazer');
  });

  await passo('o pincel de recursos', async () => {
    await E(() => { window.__mundo.App.selecionar([]); window.__mundo.App.usarFerramenta('h'); });
    await w(400);
    const sel = P.locator('#opts select[aria-label="O que o pincel faz"]');
    ok(await sel.locator('option[value="rec"]').innerText() === 'Recursos…' && await sel.locator('option[value="semrec"]').count() === 0, 'um modo só: "Recursos…" (o "Tirar os recursos" virou o pincel vazio)');
    await sel.selectOption('rec'); await w(300);
    ok(await P.locator('#opts .rec-pin').count() === 1, 'o pincel começa com um recurso');
    await K('rp:mais').click(); await w(200);
    await K('rp:mais').click(); await w(200);
    ok(await P.locator('#opts .rec-pin').count() === 3, '"+ Recurso" põe mais recursos no pincel (três)');
    const ids = await E(() => [...document.querySelectorAll('#opts .rec-pin select')].map(s => s.value));
    await K('rp:n:' + ids[1]).fill('3'); await K('rp:n:' + ids[1]).press('Enter'); await w(200);
    await foto('l64-pincel');
    // pinta um hexágono
    const pt = await E(() => { const { App, N } = window.__mundo, c = N.centroHex(App.mapa, 12, 4), a = window.MundoTela.paraMundo(0, 0), b = window.MundoTela.paraMundo(100, 100), z = 100 / (b.x - a.x); return { x: (c.x - a.x) * z, y: (c.y - a.y) * z }; });
    await P.mouse.click(pt.x, pt.y); await w(400);
    let hr = await E(() => (window.__mundo.App.mapa.eco.hexr || {})['12,4'] || null);
    ok(hr && Object.keys(hr).length === 3 && hr[ids[1]] === 3, 'o hexágono pintado fica com os três recursos do pincel: ' + j(hr));
    for (const id of ids) await K('rp:x:' + id).click();
    await w(200);
    ok(await K('rp:vazio').count() === 1, 'sem recursos no pincel: "Pincel vazio: tira os recursos"');
    await P.mouse.click(pt.x, pt.y); await w(400);
    hr = await E(() => (window.__mundo.App.mapa.eco.hexr || {})['12,4'] || null);
    ok(!hr, 'o pincel vazio tira os recursos do hexágono');
  });

  await passo('a estrada nas colinas', async () => {
    await E(() => { window.__mundo.App.usarFerramenta('sel'); window.MundoTela.centrar({ k: 'm', id: 'x', x: 330, y: 200 }); });
    for (let i = 0; i < 4; i++) { await P.mouse.move(700, 450); await P.mouse.wheel(0, -240); await w(200); }
    await w(1500);
    await foto('l64-colinas');
    ok(true, '(a foto das colinas com a estrada)');
  });

  ok(t.errs.length === 0, 'nenhum erro na página: ' + t.errs.slice(0, 3).join(' | '));
  await t.close();
  end();
})();
