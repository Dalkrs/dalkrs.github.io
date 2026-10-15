// Mapa-múndi, lote 6 (segunda leva), pela interface (a página sozinha, no navegador):
//   · os terrenos novos (lavoura, ruínas, lava, cristais, selva, savana, tundra, terra corrompida): um mapa novo já
//     vem com eles; num mapa de antes, a aba Terreno oferece acrescentá-los;
//   · o desenho em cada hexágono pintado (no canvas, por baixo das camadas do mapa): cada hexágono com o seu, variado
//     de um para o outro; desligado, só a cor; some com a grade;
//   · a honra do grupo: o estilo, − e +, o motivo, o selo no mapa (aro, louros e raios quando alta; rachado e escuro
//     quando negativa), o histórico (corrigir o motivo, tirar a linha) — e quem joga vendo tudo isso;
//   · o painel da facção: recursos (nome e número), população, apoio, o histórico automático com a data do mundo e o
//     motivo (o mesmo dia e motivo numa linha só), e o que os jogadores veem (só o que o mestre marcou).
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

const ate = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await espera(100); } };
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function digitar(a, k, v) { const c = campo(a, k); await c.fill(v); await a.F.waitForTimeout(80); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(160); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(200); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const fac = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.faccoes.find(f => f.id === id)) || null, id);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(200); };
const desfazer = async a => { await A(a, () => __mundo.App.desfazer()); await espera(200); };
async function janela(a) { const d = a.F.locator('dialog.mundo-dl[open]'); await d.waitFor({ timeout: 5000 }); return d; }
// o desenho de um hexágono no canvas: os pixels de um quadrado no meio dele (quantos pintados, e um resumo deles)
const pixels = (a, q, r) => A(a, ([q, r]) => {
  const cv = document.querySelector('#mundo canvas.hex-desenho'), N = __mundo.N, m = __mundo.App.vista();
  if (!cv || cv.hidden) return null;
  const k = cv.width / m.larg, c = N.centroHex(m, q, r), lado = Math.max(4, Math.round(m.grade.tam * 0.66 * k));
  // (lido numa cópia: ler o canvas do mapa várias vezes deixaria um aviso no console)
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = lado;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(cv, Math.round(c.x * k - lado / 2), Math.round(c.y * k - lado / 2), lado, lado, 0, 0, lado, lado);
  const d = tc.getImageData(0, 0, lado, lado).data;
  let cheios = 0, hs = 7;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) cheios++; hs = (hs * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2] + d[i + 3] * 11) % 1000000007; }
  // e um resumo grosso (a claridade média em 6 × 6 pedaços): o mesmo desenho em outro lugar dá quase o mesmo resumo,
  // por mais que os pixels mudem um pouco com a posição
  const n = 6, sig = [];
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    let soma = 0, cont = 0;
    for (let y = Math.floor(gy * lado / n); y < Math.floor((gy + 1) * lado / n); y++) for (let x = Math.floor(gx * lado / n); x < Math.floor((gx + 1) * lado / n); x++) { const i = (y * lado + x) * 4; soma += (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * d[i + 3] / 255; cont++; }
    sig.push(cont ? soma / cont : 0);
  }
  return { cheios, total: d.length / 4, hs, sig };
}, [q, r]);
const selo = (a, id) => A(a, id => {
  const g = document.querySelector(`#mundo svg [data-id="${id}"] .honra`);
  if (!g) return null;
  const racha = g.querySelector('.hon-racha');
  return { cls: g.getAttribute('class'), num: (g.querySelector('.hon-num') || {}).textContent, raios: !!g.querySelector('.hon-raios'), louros: (g.querySelector('.hon-louro') ? (g.querySelector('.hon-louro').getAttribute('d').match(/M/g) || []).length : 0),
    rachas: racha ? (racha.getAttribute('d').match(/M/g) || []).length : 0, corpo: (g.querySelector('.hon-ico .hb') || { style: {} }).style.fill };
}, id);

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote6b', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa e os terrenos novos', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    let m = await mapa(L);
    ok(m.terrenos.length === 16 && j(m.terrenos.slice(8).map(t => t.nome)) === j(['Lavoura', 'Ruínas', 'Lava', 'Cristais', 'Selva', 'Savana', 'Tundra', 'Terra corrompida']) && await campo(L, 'ter:novos').count() === 0,
      'um mapa novo já vem com os dezesseis terrenos (os oito novos com o desenho deles), sem a oferta');
    ok(await L.F.locator('#pane .ter-linha').count() === 16 && /Textura: Lavoura/.test(await campo(L, 'ter:la:tex').locator('option:checked').innerText()), 'a aba Terreno lista os dezesseis, cada um com a sua textura');
    // um mapa de antes (só os oito de começo, um deles renomeado)
    await A(L, () => __mundo.App.mudar('mapa de antes', mm => { mm.terrenos = mm.terrenos.slice(0, 8); mm.terrenos[0].nome = 'Campos'; }));
    await espera(200);
    ok(/Terrenos novos: Lavoura, Ruínas, Lava, Cristais, Selva, Savana, Tundra, Terra corrompida\./.test(await L.F.locator('#pane').innerText()) && /Acrescentar os 8/.test(await campo(L, 'ter:novos').innerText()),
      'num mapa de antes, a aba Terreno oferece os oito terrenos novos (nada muda sozinho)');
    await botao(L, 'ter:novos');
    m = await mapa(L);
    ok(m.terrenos.length === 16 && m.terrenos[0].nome === 'Campos' && await rotulo(L) === 'acrescentar os terrenos novos' && await campo(L, 'ter:novos').count() === 0, 'um clique acrescenta os oito (os de antes ficam como estavam)');
  });

  await passo('o desenho em cada hexágono', async () => {
    const ters = ['pl', 'fl', 'co', 'mo', 'pa', 'de', 'ne', 'ag', 'la', 'ru', 'lv', 'cr', 'se', 'sv', 'tu', 'tc'];
    await A(L, ters => __mundo.App.mudar('pintar', mm => {
      ters.forEach((t, i) => { mm.hexes[(4 + (i % 8) * 2) + ',' + (4 + Math.floor(i / 8) * 3)] = t; });
      mm.hexes['4,10'] = 'fl'; mm.hexes['6,10'] = 'fl'; mm.hexes['8,10'] = 'fl';
    }), ters);
    await espera(250);
    // sem a grade à mostra (nem a ferramenta Terreno), o terreno pintado não aparece
    ok(await A(L, () => { const c = document.querySelector('#mundo canvas.hex-desenho'); return !c || c.hidden; }), 'com a grade escondida, o terreno de cada hexágono não aparece (como antes)');
    await campo(L, 'ter:on').check(); await espera(300);
    const info = await A(L, () => { const c = document.querySelector('#mundo canvas.hex-desenho'), s = document.querySelector('#mundo svg.camadas'); return c && { ters: c.dataset.ters, des: c.dataset.des, antes: !!(c.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING), svg: document.querySelectorAll('#mundo svg .hex-ter').length }; });
    ok(info && info.des === '1' && info.ters.split(',').length === 16 && /(^|,)fl:4(,|$)/.test(info.ters) && info.antes && info.svg === 0,
      'com a grade à mostra: cada hexágono pintado no canvas do terreno (por baixo das camadas do mapa), com o desenho: ' + j(info));
    const fl = [await pixels(L, 4, 10), await pixels(L, 6, 10), await pixels(L, 8, 10)];
    const dif = (a, b) => a.sig.reduce((t, v, i) => t + Math.abs(v - b.sig[i]), 0) / a.sig.length;
    const difs = [dif(fl[0], fl[1]), dif(fl[0], fl[2]), dif(fl[1], fl[2])].map(x => Math.round(x * 10) / 10);
    ok(fl.every(p => p && p.cheios === p.total) && difs.every(x => x > 4), 'três hexágonos de floresta: cada um com o seu desenho (diferentes entre si, de longe também): ' + j(difs));
    const mesmo = await pixels(L, 4, 10);
    ok(mesmo.hs === fl[0].hs, '(o mesmo hexágono sai sempre igual: a semente é o lugar dele)');
    const todos = [];
    for (let i = 0; i < 16; i++) todos.push((await pixels(L, 4 + (i % 8) * 2, 4 + Math.floor(i / 8) * 3)).hs);
    ok(new Set(todos).size === 16, 'os dezesseis terrenos com desenhos diferentes');
    await foto('lote6b-hexagonos');
    // a grade escondida esconde o terreno dos hexágonos; mostrada de novo, ele volta (o mesmo desenho)
    await campo(L, 'ter:on').uncheck(); await espera(300);
    ok(await A(L, () => document.querySelector('#mundo canvas.hex-desenho').hidden), 'escondendo a grade, o terreno dos hexágonos some junto');
    await campo(L, 'ter:on').check(); await espera(300);
    ok(await A(L, () => !document.querySelector('#mundo canvas.hex-desenho').hidden) && (await pixels(L, 6, 10)).hs === fl[1].hs, 'mostrando de novo, ele volta igual');
    // uma pincelada à mão: o canvas dela fica por baixo do terreno dos hexágonos
    await A(L, () => __mundo.App.mudar('pincelada', mm => { mm.pintura.ops.push({ t: 'fl', r: 30, pts: [[100, 900], [400, 950]] }); })); await espera(300);
    ok(await A(L, () => { const p = document.querySelector('#mundo canvas.pintura'), c = document.querySelector('#mundo canvas.hex-desenho'); return !!p && !p.hidden && !!(p.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); }),
      'a pintura à mão fica por baixo do terreno pintado por hexágono (como antes)');
    await desfazer(L);
    // desligado: só a cor (os três de floresta ficam iguais)
    await campo(L, 'ter:des').uncheck(); await espera(300);
    const lisos = [await pixels(L, 4, 10), await pixels(L, 6, 10), await pixels(L, 8, 10)];
    ok((await mapa(L)).grade.des === false && await rotulo(L) === 'tirar o desenho dos hexágonos' && new Set(lisos.map(p => p.hs)).size === 1 && lisos[0].cheios === lisos[0].total,
      '"Desenho em cada hexágono" desligado: só a cor (os três de floresta iguais)');
    await desfazer(L);
    ok((await mapa(L)).grade.des === true && (await pixels(L, 6, 10)).hs === fl[1].hs, 'Desfazer volta o desenho');
    // quem joga vê o mesmo desenho
    try {
      await A(L, () => { __mundo.App.comoJogador = true; }); await espera(350);
      ok((await pixels(L, 6, 10)).hs === fl[1].hs && (await pixels(L, 8, 4)).hs === todos[2], 'vendo como jogador: os mesmos desenhos');
    } finally { await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300); }
  });

  await passo('a honra do grupo', async () => {
    await A(L, () => __mundo.App.mudar('o grupo', mm => { mm.objs.push(Object.assign(__mundo.N.objNovo('g', { x: 900, y: 700, sigla: 'HER' }), { id: 'g', nome: 'Os Heróis' })); }));
    await aba(L, 'selecao');
    await selecionar(L, 'g');
    ok(await campo(L, 'o:g:estilo').inputValue() === '' && await selo(L, 'g') === null && await campo(L, 'o:honra-mais').count() === 0 && /Escolha um estilo para o grupo mostrar a honra/.test(await L.F.locator('#pane').innerText()),
      'um grupo novo: sem estilo, sem honra no mapa');
    await escolher(L, 'o:g:estilo', 'kabuto');
    let s = await selo(L, 'g');
    ok((await obj(L, 'g')).estilo === 'kabuto' && await rotulo(L) === 'mudar o estilo da honra' && s && /\bh0\b/.test(s.cls) && s.num === '0' && !s.raios && !s.louros && !s.rachas && s.corpo === 'rgb(185, 187, 190)',
      'Kabuto: o selo aparece junto do grupo, na honra 0 (aço, sem enfeite): ' + j(s));
    await digitar(L, 'o:honra-motivo', 'Salvaram a vila');
    await botao(L, 'o:honra-mais');
    let g = await obj(L, 'g');
    ok(g.honra === 1 && j(g.hhist) === j([{ d: 0, de: 0, para: 1, mot: 'Salvaram a vila' }]) && await rotulo(L) === 'subir a honra' && await campo(L, 'o:honra-motivo').inputValue() === ''
      && /Honra 0 → \+1 \(Salvaram a vila\)\./.test(await textoDoAviso(L)), '+: a honra sobe, o histórico guarda a data e o motivo (e o campo do motivo esvazia)');
    s = await selo(L, 'g');
    ok(/h-pos/.test(s.cls) && s.num === '+1' && await campo(L, 'o:honra').innerText() === '+1', 'o selo e o painel dizem +1');
    for (let i = 0; i < 4; i++) await botao(L, 'o:honra-mais');
    s = await selo(L, 'g');
    ok((await obj(L, 'g')).honra === 5 && s.raios && s.louros === 8 && /\bh5\b/.test(s.cls) && s.corpo === 'rgb(240, 203, 76)' && await campo(L, 'o:honra-mais').isDisabled(),
      '+5: dourado, com louros dos dois lados e raios (e o + para no limite): ' + j(s));
    await foto('lote6b-honra-5');
    await botao(L, 'o:honra-menos'); await botao(L, 'o:honra-menos');
    s = await selo(L, 'g');
    ok(s.louros === 4 && !s.raios && s.num === '+3', '+3: os louros de um lado só, sem os raios');
    for (let i = 0; i < 6; i++) await botao(L, 'o:honra-menos');
    s = await selo(L, 'g');
    ok((await obj(L, 'g')).honra === -3 && /h-neg/.test(s.cls) && /\bhm3\b/.test(s.cls) && s.rachas === 2 && s.num === '−3' && s.corpo === 'rgb(97, 90, 83)', '−3: escuro e rachado: ' + j(s));
    await botao(L, 'o:honra-menos'); await botao(L, 'o:honra-menos');
    s = await selo(L, 'g');
    ok(s.rachas === 3 && await campo(L, 'o:honra-menos').isDisabled() && await A(L, () => !!document.querySelector('#mundo svg [data-id="g"] .honra .hon-lasca')), '−5: mais rachado, lascado (e o − para no limite)');
    await foto('lote6b-honra-menos5');
    // o histórico: o mais novo em cima; corrigir o motivo; tirar a linha
    g = await obj(L, 'g');
    const lis = await L.F.locator('#pane .honra-hist li').count();
    ok(g.hhist.length === 15 && lis === 6 && /−4 → −5/.test(await L.F.locator('#pane .honra-hist li').first().innerText()) && /Mostrar todas \(15\)/.test(await campo(L, 'hh:tudo').innerText()),
      'o histórico mostra as seis últimas mudanças, da mais nova para a mais antiga (e "Mostrar todas")');
    await botao(L, 'hh:14:mot');
    let d = await janela(L);
    await d.locator('#dl-mot').fill('Fugiram do duelo');
    await d.locator('button[type="submit"]').click(); await espera(250);
    ok((await obj(L, 'g')).hhist[14].mot === 'Fugiram do duelo' && await rotulo(L) === 'mudar o motivo da honra' && /Fugiram do duelo/.test(await L.F.locator('#pane .honra-hist li').first().innerText()), 'corrigir o motivo de uma linha');
    await botao(L, 'hh:14:x');
    g = await obj(L, 'g');
    ok(g.hhist.length === 14 && g.honra === -5 && /a honra continua −5/.test(await textoDoAviso(L)), 'tirar uma linha do histórico (a honra não muda)');
    await desfazer(L);
    // quem joga: a honra e o histórico, sem botões
    try {
      await A(L, () => { __mundo.App.comoJogador = true; }); await espera(350);
      await selecionar(L, 'g');
      const txt = await L.F.locator('#pane').innerText();
      ok(/Honra\s*−5\s*Kabuto/i.test(txt) && /Fugiram do duelo/.test(txt) && await L.F.locator('#pane .honra-hist li').count() === 6 && await L.F.locator('#pane .honra-hist button').count() === 0 && (await selo(L, 'g')).num === '−5',
        'vendo como jogador: o selo no mapa, a honra e o histórico no painel (sem botões)');
    } finally { await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300); }
  });

  await passo('o painel da facção', async () => {
    await A(L, () => __mundo.App.mudar('a facção', mm => { mm.faccoes.push(Object.assign(__mundo.N.faccaoNova('Aldar', '#c0503a'), { id: 'fa' })); }));
    await selecionar(L, null);
    await aba(L, 'faccoes');
    await botao(L, 'fac:fa');
    ok(/Recursos e números/i.test(await L.F.locator('#pane').innerText()) && /Nenhum ainda/.test(await L.F.locator('#pane').innerText()), 'o editor da facção tem "Recursos e números"');
    await digitar(L, 'f:fa:motivo', 'A fundação');
    await botao(L, 'f:fa:rec-novo');
    let d = await janela(L);
    await d.locator('#dl-nome').fill('Ouro'); await d.locator('#dl-n').fill('1000');
    await d.locator('button[type="submit"]').click(); await espera(250);
    let f = await fac(L, 'fa');
    const ouro = f.rec[0] && f.rec[0].id;
    ok(f.rec.length === 1 && f.rec[0].nome === 'Ouro' && f.rec[0].n === 1000 && f.rec[0].ver === false && j(f.hist) === j([{ d: 0, mot: 'A fundação', mud: [['r:' + ouro, 'Ouro', null, 1000]] }]) && await rotulo(L) === 'pôr o recurso Ouro',
      'um recurso novo (Ouro, 1000): entra no histórico com o dia e o motivo; os jogadores não veem de começo');
    await escrever(L, 'f:fa:pop', '12000');
    f = await fac(L, 'fa');
    ok(f.pop === 12000 && f.hist.length === 1 && j(f.hist[0].mud[1]) === j(['pop', '', null, 12000]) && /População: 12\.000/.test(await L.F.locator('#pane .fac-hist').innerText()),
      'a população: no mesmo dia e com o mesmo motivo, na mesma linha do histórico');
    // outro dia, outro motivo
    await aba(L, 'hoje'); await botao(L, 'hoje:+1');
    await aba(L, 'faccoes');
    if (!(await campo(L, 'f:fa:motivo').count())) await botao(L, 'fac:fa');
    await digitar(L, 'f:fa:motivo', 'Pagaram os mercenários');
    await escrever(L, `f:fa:r:${ouro}:n`, '850');
    await escrever(L, 'f:fa:apoio', '55');
    f = await fac(L, 'fa');
    ok(f.rec[0].n === 850 && f.apoio === 55 && f.hist.length === 2 && j(f.hist[1]) === j({ d: 1, mot: 'Pagaram os mercenários', mud: [['r:' + ouro, 'Ouro', 1000, 850], ['apoio', '', null, 55]] })
      && /Pagaram os mercenários/.test(await L.F.locator('#pane .fac-hist li').first().innerText()) && /Ouro: 1\.000 → 850/.test(await L.F.locator('#pane .fac-hist li').first().innerText()),
      'outro dia e outro motivo: outra linha (a mais nova em cima): ' + j(f.hist[1]));
    await escrever(L, 'f:fa:apoio', '140');
    ok((await fac(L, 'fa')).apoio === 55 && /0 a 100%/.test(await textoDoAviso(L)), 'apoio fora de 0 a 100%: não muda, e o aviso diz por quê');
    // o que os jogadores veem: o Ouro e o histórico (a população e o apoio, não)
    await campo(L, `f:fa:r:${ouro}:ver`).check(); await espera(200);
    await campo(L, 'f:fa:ver-hist').check(); await espera(200);
    f = await fac(L, 'fa');
    ok(f.rec[0].ver === true && f.ver.hist === true && f.ver.pop === false && await rotulo(L) === 'mostrar o histórico aos jogadores', 'o mestre marca o Ouro e o histórico para os jogadores');
    await foto('lote6b-faccao');
    try {
      await A(L, () => { __mundo.App.comoJogador = true; }); await espera(350);
      await aba(L, 'faccoes');
      const num = await L.F.locator('#pane .fac-num').innerText();
      await L.F.locator('#pane details.fac-hist-pub summary').click(); await espera(150);
      const hist = await L.F.locator('#pane details.fac-hist-pub').innerText();
      ok(num === 'Ouro: 850' && /Ouro: 1\.000 → 850/.test(hist) && !/População|Apoio|55/.test(hist) && /Pagaram os mercenários/.test(hist) && /A fundação/.test(hist),
        'vendo como jogador: só o Ouro, e do histórico só o que é do Ouro: ' + j([num, hist]));
    } finally { await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300); }
    // tirar o recurso: o histórico guarda que ele saiu
    await aba(L, 'faccoes');
    if (!(await campo(L, `f:fa:r:${ouro}:x`).count())) await botao(L, 'fac:fa');
    await botao(L, `f:fa:r:${ouro}:x`);
    f = await fac(L, 'fa');
    ok(!f.rec.length && j(f.hist[1].mud[0]) === j(['r:' + ouro, 'Ouro', 1000, null]) && /Ouro: saiu \(1\.000\)/.test(await L.F.locator('#pane .fac-hist').innerText()),
      'tirar o Ouro no mesmo dia e motivo: a linha do dia diz que ele saiu (de 1.000, o que tinha no começo do dia)');
    await desfazer(L);
    ok((await fac(L, 'fa')).rec.length === 1, 'Desfazer devolve o Ouro');
  });

  await passo('tela estreita', async () => {
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(300);
    if (await L.F.locator('#side.fechado').count()) { await L.F.click('#btPainel'); await espera(250); }
    await aba(L, 'faccoes');
    if (!(await campo(L, 'f:fa:motivo').count())) await botao(L, 'fac:fa');
    const cabe = await A(L, () => { const p = document.getElementById('pane'); return p.scrollWidth <= p.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; });
    ok(cabe, 'na tela estreita o painel da facção cabe, sem rolar para os lados');
    await foto('lote6b-faccao-400');
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
