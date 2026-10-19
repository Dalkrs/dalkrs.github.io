// Mapa-múndi, lote 8, pela interface (a página sozinha, no navegador):
//   · (parte 1) a textura dos hexágonos pintados: de longe (os hexágonos miúdos na tela), a tinta tem os desenhos da
//     textura (as árvores da floresta); de perto, quando cada hexágono ganha o seu desenho, a tinta fica só com a cor e
//     as manchas — os desenhos da textura, de outro tamanho, não ficam mais por cima dos de cada hexágono; sem os
//     desenhos de cada hexágono, a textura fica também de perto;
//   · (parte 3, SO=honra) a honra dos grupos de −10 a +10: o selo ganha a segunda volta de raios (+6), as asas (+7), as
//     pedras (+8), o halo (+9) e a estrela (+10); do outro lado, as correntes (−7), a brasa (−8), a outra lasca (−9) e
//     mais rachaduras; os botões param em ±10;
//   · (parte 3, SO=bandeiras) a facção do grupo e as bandeiras dos clãs: no meio das regiões da facção, junto dos grupos
//     dela, nas zonas e frentes de guerra (dos dois lados) e na aba Facções; a projeção as leva (e quem joga as vê); a
//     facção escondida não leva a bandeira.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(160); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(200); }
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(200); };
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
// o selo da honra de um grupo: as classes e o que ele tem desenhado
const selo = (a, id) => A(a, id => {
  const g = document.querySelector(`#mundo svg [data-id="${id}"] .honra`);
  if (!g) return null;
  const racha = g.querySelector('.hon-racha'), n = c => g.querySelectorAll('.' + c).length;
  return { cls: g.getAttribute('class'), num: (g.querySelector('.hon-num') || {}).textContent, raios: n('hon-raios'), raios2: n('hon-raios2'), asas: n('hon-asa'), pedras: n('hon-pedra'), halo: n('hon-halo'), estrela: n('hon-estrela'),
    correntes: n('hon-corrente'), brasa: n('hon-brasa'), lascas: n('hon-lasca'), rachas: racha ? (racha.getAttribute('d').match(/M/g) || []).length : 0, corpo: (g.querySelector('.hon-ico .hb') || { style: {} }).style.fill };
}, id);
const zoom = async (a, z) => { await A(a, z => { window.MundoTela.zoom = z; }, z); await espera(700); };

// Os pixels da tinta dos hexágonos de floresta do miolo (longe da beirada macia da área pintada), em amostras de meia
// unidade do mapa: "cantos" são as do canto de cada hexágono (fora do círculo de dentro dele, onde o desenho do
// hexágono não chega); "miolo", as de perto do centro. "Escuras" são as do verde das árvores (bem mais escuro que a cor
// da floresta, #3f7a46): as manchas da tinta lisa são de leve e não chegam lá.
const amostrar = a => A(a, () => {
  const { App, N } = __mundo, m = App.mapa, cv = document.querySelector('#mundo canvas.hex-desenho');
  if (!cv || cv.hidden) return null;
  const k = Number(cv.dataset.k), x0 = Number(cv.dataset.x0), y0 = Number(cv.dataset.y0);
  const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height;
  const tc = tmp.getContext('2d', { willReadFrequently: true }); tc.drawImage(cv, 0, 0);
  const img = tc.getImageData(0, 0, cv.width, cv.height).data;
  const c0 = N.hexDe(m, m.larg / 2, m.alt / 2), u = m.grade.tam / 2;
  const dentro = new Set();
  for (const ch of Object.keys(m.hexes)) { const [q, r] = ch.split(',').map(Number); if (N.distHex({ q, r }, c0) <= 3) dentro.add(ch); }
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const ch of dentro) { const [q, r] = ch.split(',').map(Number); for (const [x, y] of N.cantosHex(m, q, r)) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); } }
  const out = { cantos: 0, cantosEscuras: 0, miolo: 0, mioloEscuras: 0, k, liso: cv.dataset.liso, des: cv.dataset.des };
  for (let y = by0; y <= by1; y += 0.5) for (let x = bx0; x <= bx1; x += 0.5) {
    const h = N.hexDe(m, x, y);
    if (!dentro.has(h.q + ',' + h.r)) continue;
    const px = Math.round((x - x0) * k), py = Math.round((y - y0) * k);
    if (px < 0 || py < 0 || px >= cv.width || py >= cv.height) continue;
    const i = (py * cv.width + px) * 4, escura = img[i + 3] > 200 && img[i + 1] < 108;
    const c = N.centroHex(m, h.q, h.r), d = Math.hypot(x - c.x, y - c.y);
    if (d > u * 1.02) { out.cantos++; if (escura) out.cantosEscuras++; }
    else if (d < u * 0.9) { out.miolo++; if (escura) out.mioloEscuras++; }
  }
  return out;
});

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote8', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa e a grade', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    ok((await A(L, () => __mundo.App.mapa.grade.tam)) === 40, '(a grade de 40 unidades)');
  });

  if (parte('textura')) await passo('a textura de longe e de perto', async () => {
    // uma floresta grande no meio do mapa (os hexágonos a até 5 do hexágono do meio)
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('pintar', m => { const c0 = N.hexDe(m, m.larg / 2, m.alt / 2); for (let q = c0.q - 6; q <= c0.q + 6; q++) for (let r = c0.r - 6; r <= c0.r + 6; r++) if (N.distHex({ q, r }, c0) <= 5) m.hexes[q + ',' + r] = 'fl'; });
    });
    await espera(400);
    // de longe: os hexágonos com menos de 12 pixels na tela — a tinta tem as árvores da textura
    await zoom(L, 0.25);
    const longe = await amostrar(L);
    ok(longe && longe.liso === '0' && longe.des === '1', 'de longe, a tinta fica com os desenhos da textura (os hexágonos miúdos não têm o desenho de cada um): ' + j(longe));
    ok(longe && longe.miolo + longe.cantos > 200 && longe.cantosEscuras + longe.mioloEscuras > 0.02 * (longe.miolo + longe.cantos), 'de longe, as árvores da textura aparecem na tinta: ' + j(longe));
    await foto('l8-textura-longe');
    // de perto: cada hexágono tem o seu desenho — a tinta fica só com a cor e as manchas
    await zoom(L, 3);
    const perto = await amostrar(L);
    ok(perto && perto.liso === '1', 'de perto, com o desenho de cada hexágono, a tinta fica lisa: ' + j(perto));
    ok(perto && perto.cantos > 2000 && perto.cantosEscuras === 0, 'de perto, nenhuma árvore da textura no canto dos hexágonos, onde o desenho de cada um não chega (antes, as árvores grandes da textura ficavam por cima): ' + j(perto));
    ok(perto && perto.mioloEscuras > 0.03 * perto.miolo, 'de perto, o desenho de cada hexágono continua lá (as árvores de cada um): ' + j(perto));
    await foto('l8-textura-perto');
    // sem os desenhos de cada hexágono, a textura fica também de perto
    await campo(L, 'ter:des').uncheck(); await espera(500);
    const semDes = await amostrar(L);
    ok(semDes && semDes.liso === '0' && semDes.des === '0' && semDes.cantosEscuras > 0.02 * semDes.cantos, 'sem os desenhos de cada hexágono ("Desenho em cada hexágono" desligado), a textura fica também de perto: ' + j(semDes));
    await campo(L, 'ter:des').check(); await espera(500);
    // e longe de novo: a textura volta (a lisa e a com desenhos não se confundem)
    await zoom(L, 0.25);
    const deNovo = await amostrar(L);
    ok(deNovo && deNovo.liso === '0' && deNovo.cantosEscuras + deNovo.mioloEscuras > 0.02 * (deNovo.miolo + deNovo.cantos), 'afastando de novo, as árvores da textura voltam: ' + j(deNovo));
    await zoom(L, 3);
    const pertoDeNovo = await amostrar(L);
    ok(pertoDeNovo && pertoDeNovo.liso === '1' && pertoDeNovo.cantosEscuras === 0, 'e aproximando de novo, somem: ' + j(pertoDeNovo));
  });

  if (parte('honra')) await passo('a honra de −10 a +10', async () => {
    await zoom(L, 1.5);
    await A(L, () => __mundo.App.mudar('o grupo', mm => { mm.objs.push(Object.assign(__mundo.N.objNovo('g', { x: 1000, y: 700, sigla: 'HER' }), { id: 'gh', nome: 'Os Heróis', estilo: 'kabuto' })); }));
    await aba(L, 'selecao'); await selecionar(L, 'gh');
    let s = await selo(L, 'gh');
    ok(s && s.num === '0', '(o grupo com o selo, na honra 0)');
    const ate = async (alvo, k) => { for (let i = 0; i < 25 && (await obj(L, 'gh')).honra !== alvo; i++) await botao(L, k); return selo(L, 'gh'); };
    s = await ate(5, 'o:honra-mais');
    ok(s.raios === 1 && s.raios2 === 0 && s.asas === 0 && !(await campo(L, 'o:honra-mais').isDisabled()), '+5 como antes (os raios), e o + continua');
    s = await ate(6, 'o:honra-mais');
    ok(s.raios2 === 1 && s.asas === 0 && /\bh6\b/.test(s.cls), '+6: a segunda volta de raios: ' + j(s));
    s = await ate(7, 'o:honra-mais');
    ok(s.asas === 1 && s.pedras === 0, '+7: as asas');
    s = await ate(8, 'o:honra-mais');
    ok(s.pedras === 4 && s.halo === 0, '+8: as quatro pedras no aro');
    s = await ate(9, 'o:honra-mais');
    ok(s.halo === 1 && s.estrela === 0, '+9: o halo');
    s = await ate(10, 'o:honra-mais');
    ok(s.estrela === 1 && s.pedras === 3 && s.num === '+10' && s.corpo === 'rgb(255, 245, 216)' && await campo(L, 'o:honra-mais').isDisabled() && await campo(L, 'o:honra').innerText() === '+10',
      '+10: a estrela no alto (no lugar da pedra de cima), o ouro quase branco, e o + para no limite: ' + j(s));
    await foto('l8-honra-10');
    s = await ate(-5, 'o:honra-menos');
    ok(s.rachas === 3 && s.lascas === 1 && s.correntes === 0 && !(await campo(L, 'o:honra-menos').isDisabled()), '−5 como antes, e o − continua');
    s = await ate(-7, 'o:honra-menos');
    ok(s.correntes === 1 && s.rachas === 4 && s.brasa === 0, '−7: as correntes (e outra rachadura)');
    s = await ate(-8, 'o:honra-menos');
    ok(s.brasa === 1 && s.rachas === 5, '−8: a brasa em volta');
    s = await ate(-10, 'o:honra-menos');
    ok(s.lascas === 2 && s.num === '−10' && s.corpo === 'rgb(20, 18, 16)' && await campo(L, 'o:honra-menos').isDisabled(), '−10: outra lasca, quase preto, e o − para no limite: ' + j(s));
    await foto('l8-honra-menos10');
    ok((await obj(L, 'gh')).hhist.length === 30, 'o histórico guardou as 30 mudanças (de 0 a +10 e de +10 a −10): ' + (await obj(L, 'gh')).hhist.length);
  });

  if (parte('bandeiras')) await passo('a facção do grupo e as bandeiras', async () => {
    const ids = await A(L, () => {
      const { App, N } = __mundo, out = {};
      App.mudar('montar', m => {
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' }, { id: 'fc', nome: 'Segredo', cor: '#5f7f2a', oculta: true });
        const r = Object.assign(N.objNovo('r', { pts: [[300, 300], [700, 300], [700, 600], [300, 600]] }), { id: 'reg', nome: 'Reino de Aldar', fac: 'fa' });
        const r2 = Object.assign(N.objNovo('r', { pts: [[800, 300], [1100, 300], [1100, 600], [800, 600]] }), { id: 'reg2', nome: 'Terra Escondida', fac: 'fc' });
        const g = Object.assign(N.objNovo('g', { x: 500, y: 800, sigla: 'EXE' }), { id: 'gb', nome: 'Hoste de Aldar' });
        const gc = Object.assign(N.objNovo('g', { x: 950, y: 800, sigla: 'SEG' }), { id: 'gc', nome: 'Espiões', fac: 'fc' });
        const z = Object.assign(N.objNovo('z', { tipo: 'guerra', pts: [[300, 900], [700, 900], [700, 1100], [300, 1100]], ini: m.cal.dia }), { id: 'zg', nome: 'Campos de Sangue', a: 'fa', b: 'fb' });
        const f = Object.assign(N.objNovo('f', { pts: [[900, 900], [1300, 950]] }), { id: 'fr', nome: 'Frente do Rio', a: 'fa', b: 'fb' });
        m.objs.push(r, r2, g, gc, z, f);
      });
      return out;
    });
    void ids;
    await zoom(L, 0.6);
    await aba(L, 'selecao'); await selecionar(L, 'gb');
    ok(await campo(L, 'o:gb:gfac').count() === 1, 'o grupo tem o campo Facção');
    await escolher(L, 'o:gb:gfac', 'fa');
    ok((await obj(L, 'gb')).fac === 'fa', 'o grupo passa a ser da facção Aldar');
    const contar = () => A(L, () => {
      const q = sel => document.querySelectorAll('#mundo svg ' + sel).length;
      return { reg: q('[data-id="reg"] .bandeira'), reg2: q('[data-id="reg2"] .bandeira'), gru: q('[data-id="gb"] .bandeira'), gc: q('[data-id="gc"] .bandeira'), zon: q('[data-id="zg"] .bandeira'), fre: q('[data-id="fr"] .bandeira') };
    });
    ok(j(await contar()) === j({ reg: 0, reg2: 0, gru: 0, gc: 0, zon: 0, fre: 0 }), 'sem clã ligado, nenhuma bandeira: ' + j(await contar()));
    // um clã ligado a Aldar (o que a mesa diria: aqui, posto à mão)
    const BR = { forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: 'lua', img: null };
    await A(L, br => { __mundo.App.brasoes = new Map([['fa', br], ['fc', br]]); __mundo.App.emit('muda', { origem: 'fora' }); }, BR); await espera(400);
    let c = await contar();
    ok(c.reg === 1 && c.gru === 1 && c.zon === 1 && c.fre === 1, 'com o clã ligado a Aldar: a bandeira no meio da região dela, junto do grupo dela, e de um lado da zona e da frente de guerra: ' + j(c));
    ok(c.reg2 === 1 && c.gc === 1, 'a região e o grupo da facção escondida também mostram (para o mestre)');
    ok(await A(L, () => { const b = document.querySelector('#mundo svg [data-id="reg"] .bandeira svg'); return !!b && /#24305e/i.test(b.innerHTML) && !!b.querySelector('clipPath'); }), 'a bandeira é o brasão do clã (as cores dele)');
    await A(L, br => { __mundo.App.brasoes = new Map([['fa', br], ['fb', Object.assign({}, br, { cores: ['#8a2a2a', '#e8eaf0'] })], ['fc', br]]); __mundo.App.emit('muda', { origem: 'fora' }); }, BR); await espera(400);
    c = await contar();
    ok(c.zon === 2 && c.fre === 2, 'com um clã também no Vale: as duas bandeiras na zona e na frente de guerra: ' + j(c));
    await foto('l8-bandeiras');
    // a aba Facções
    await aba(L, 'faccoes');
    ok(await L.F.locator('#pane [data-k="fac:fa"] .fac-band').count() === 1 && await L.F.locator('#pane [data-k="fac:fb"] .fac-band').count() === 1, 'na aba Facções, a bandeira no lugar da bolinha de cor (na linha de cada facção)');
    await L.F.click('#pane [data-k="fac:fa"]'); await espera(250);
    ok(/A do clã ligado a esta facção/.test(await L.F.locator('#pane').innerText()) && await L.F.locator('#pane .fac-band-campo .fac-band').count() === 1, 'no editor da facção: a bandeira e de onde ela vem');
    // a projeção leva a bandeira; quem joga vê (a da facção escondida, não)
    const pub = await A(L, () => { __mundo.App.comoJogador = true; const p = __mundo.App.vista(); return { fa: (p.faccoes.find(f => f.id === 'fa') || {}).br || null, fc: p.faccoes.some(f => f.id === 'fc'), reg2: (p.objs.find(o => o.id === 'reg2') || {}).fac }; });
    ok(pub.fa && pub.fa.cores[0] === '#24305e' && !pub.fc && pub.reg2 == null, 'na projeção (o que quem joga recebe): a bandeira de Aldar vai; a facção escondida, não: ' + j(pub));
    await espera(400);
    c = await contar();
    ok(c.reg === 1 && c.gru === 1 && c.zon === 2 && c.reg2 === 0 && c.gc === 0, 'vendo como jogador: as bandeiras de Aldar e do Vale aparecem; a da facção escondida, não (nem na região, nem no grupo): ' + j(c));
    await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
