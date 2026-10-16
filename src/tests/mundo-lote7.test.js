// Mapa-múndi, lote 7 (parte 1), pela interface (a página sozinha, no navegador):
//   · a pintura por hexágono de verdade: a tinta do Pincel livre (cor e textura, cobrindo a imagem), as bordas macias
//     entre os terrenos (sem fresta entre um e outro) e na volta da área pintada, a "Força da tinta" (a mesma para o
//     desenho à mão e para os hexágonos) e a grade separada da tinta (escondida, só as linhas somem);
//   · os dias da semana: o mestre escolhe que dia é hoje e o resto segue (na barra de cima e na aba Hoje);
//   · o tempo para todos: "4º tempo de 10" junto da data; "+1 tempo" leva todos os grupos com rota um tempo, cada um no
//     seu passo; o ▶ ("Próximo dia") leva todos o que falta do dia e vai para o 1º tempo de amanhã; o ◀ só volta a
//     data; tudo com Desfazer; e quem joga vê a data e o tempo, sem os botões.
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
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(200); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(220); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const desfazer = async a => { await A(a, () => __mundo.App.desfazer()); await espera(250); };
const topo = a => A(a, () => ({ data: document.querySelector('#dataTxt .dt-longa').textContent, tempo: (document.querySelector('#tempoTxt .t-longo') || {}).textContent || '', curto: (document.querySelector('#tempoTxt .t-curto') || {}).textContent || '', tempoVisivel: !document.getElementById('tempoTxt').hidden }));
// os pixels do canvas dos hexágonos num ponto do mapa (x, y em unidades do mapa): [r, g, b, a]
const pixelHex = (a, x, y) => A(a, ([x, y]) => {
  const cv = document.querySelector('#mundo canvas.hex-desenho');
  if (!cv || cv.hidden) return null;
  const k = Number(cv.dataset.k), x0 = Number(cv.dataset.x0), y0 = Number(cv.dataset.y0);
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = 1;
  const tc = tmp.getContext('2d', { willReadFrequently: true });
  tc.drawImage(cv, Math.round((x - x0) * k), Math.round((y - y0) * k), 1, 1, 0, 0, 1, 1);
  return [...tc.getImageData(0, 0, 1, 1).data];
}, [x, y]);
const Y = 346.41;          // a fileira de hexágonos r = 10 (em pé, de 40 unidades)

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote7', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa e a grade', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    ok((await mapa(L)).grade.tam === 40 && (await mapa(L)).pintura.alfa === 1, '(a grade de 40 unidades; a tinta começa inteira)');
  });

  await passo('a pintura por hexágono de verdade', async () => {
    // um bloco de floresta e, colado nele, um de planície (as colunas 4 a 7 e 8 a 11, nas fileiras 8 a 12)
    await A(L, () => __mundo.App.mudar('pintar', mm => { for (let q = 4; q < 12; q++) for (let r = 8; r < 13; r++) mm.hexes[q + ',' + r] = q < 8 ? 'fl' : 'pl'; }));
    await espera(500);
    const N = { fl: await A(L, () => __mundo.N.centroHex(__mundo.App.mapa, 5, 10)), pl: await A(L, () => __mundo.N.centroHex(__mundo.App.mapa, 10, 10)) };
    const meioFl = await pixelHex(L, N.fl.x, N.fl.y), meioPl = await pixelHex(L, N.pl.x, N.pl.y);
    ok(meioFl && meioFl[3] === 255 && meioPl && meioPl[3] === 255, 'no meio de um hexágono pintado, a tinta cobre a imagem inteira (antes era a cor a 50%): ' + j([meioFl, meioPl]));
    // a tinta tem a textura: no meio de um hexágono de planície, os pixels não são todos da mesma cor — mesmo sem o
    // desenho em cada hexágono (que vem por cima, de perto): a textura é da própria tinta
    await campo(L, 'ter:des').uncheck(); await espera(400);
    const variados = await A(L, ([x, y]) => {
      const cv = document.querySelector('#mundo canvas.hex-desenho'), k = Number(cv.dataset.k), x0 = Number(cv.dataset.x0), y0 = Number(cv.dataset.y0), lado = Math.max(8, Math.round(14 * k));
      const tmp = document.createElement('canvas'); tmp.width = tmp.height = lado; const tc = tmp.getContext('2d', { willReadFrequently: true });
      tc.drawImage(cv, Math.round((x - x0) * k - lado / 2), Math.round((y - y0) * k - lado / 2), lado, lado, 0, 0, lado, lado);
      const d = tc.getImageData(0, 0, lado, lado).data, cores = new Set();
      for (let i = 0; i < d.length; i += 4) cores.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
      return cores.size;
    }, [N.pl.x, N.pl.y]);
    ok(variados > 20, 'a tinta tem a textura do terreno (as manchas e o mato dela), não uma cor lisa — mesmo sem o desenho em cada hexágono: ' + variados + ' cores num pedaço do hexágono');
    await campo(L, 'ter:des').check(); await espera(400);
    // a divisa entre a floresta e a planície: sem fresta (a tinta cobre tudo), com as duas cores se misturando
    const cantos = await A(L, () => __mundo.N.cantosHex(__mundo.App.mapa, 7, 10));
    const xs = cantos.map(c => c[0]), xd = Math.max(...xs), ys = cantos.filter(c => Math.abs(c[0] - xd) < 0.01).map(c => c[1]);
    const divisa = await pixelHex(L, xd, (ys[0] + ys[ys.length - 1]) / 2);
    ok(divisa && divisa[3] === 255, 'na divisa entre a floresta e a planície, a tinta não deixa fresta: ' + j(divisa));
    // a volta da área pintada: a borda é macia (nem cheia, nem vazia, logo depois da beirada)
    const beira = await A(L, () => { const cs = __mundo.N.cantosHex(__mundo.App.mapa, 4, 10); return Math.min(...cs.map(c => c[0])); });
    const fora = [await pixelHex(L, beira + 1.5, N.fl.y), await pixelHex(L, beira - 3, N.fl.y), await pixelHex(L, beira - 20, N.fl.y)];
    ok(fora[0][3] > 0 && fora[1][3] > 0 && fora[1][3] < fora[0][3] && fora[2][3] === 0, 'a volta da área pintada tem a borda macia (a tinta some aos poucos): ' + j(fora.map(p => p[3])));
    await foto('lote7-hexagonos');
    // a grade escondida: só as linhas somem
    await campo(L, 'ter:on').uncheck(); await espera(300);
    ok(await A(L, () => getComputedStyle(document.querySelector('#mundo svg .c-hex')).display === 'none' && !document.querySelector('#mundo canvas.hex-desenho').hidden) && (await pixelHex(L, N.fl.x, N.fl.y))[3] === 255,
      'escondendo a grade, as linhas somem e a tinta fica');
    ok(/o terreno pintado continua no mapa/.test(await L.F.locator('#pane').innerText()), 'a aba Terreno diz isso, junto de "Mostrar a grade"');
    await campo(L, 'ter:on').check(); await espera(300);
    // sem a grade (o tamanho vazio), a tinta dos hexágonos sai junto: eles não têm mais onde ficar; desfazer a traz
    await escrever(L, 'ter:tam', ''); await espera(200);
    ok((await mapa(L)).grade.tam === 0 && await rotulo(L) === 'tirar a grade' && await A(L, () => document.querySelector('#mundo canvas.hex-desenho').hidden),
      'tirando a grade (o tamanho vazio), a tinta dos hexágonos sai junto — eles não têm mais onde ficar');
    await desfazer(L);
    ok((await mapa(L)).grade.tam === 40 && ((await pixelHex(L, N.fl.x, N.fl.y)) || [])[3] === 255, 'desfazer volta a grade e a tinta');
    // o campo do tamanho ainda tem o foco: mostra a grade de volta, e sair dele não a tira de novo
    ok(await campo(L, 'ter:tam').inputValue() === '40' && await A(L, () => !!document.activeElement && document.activeElement.dataset.k === 'ter:tam'),
      'o campo do tamanho, ainda com o foco, mostra o tamanho que voltou (40)');
    await L.F.locator('#pane h3').first().click(); await espera(250);
    ok((await mapa(L)).grade.tam === 40 && await rotulo(L) !== 'tirar a grade', 'e sair do campo depois do desfazer não tira a grade de novo (o texto velho não é gravado outra vez)');
  });

  await passo('a força da tinta', async () => {
    ok(await campo(L, 'ter:forca').count() === 1 && /Tinta do terreno/i.test(await L.F.locator('#pane').innerText()) && /Vale para o desenho à mão e para os hexágonos pintados/.test(await L.F.locator('#pane').innerText()),
      'só com hexágonos pintados (sem desenho à mão), a aba Terreno já mostra a "Força da tinta", que vale para os dois');
    await escolher(L, 'ter:forca', '0.6');
    ok((await mapa(L)).pintura.alfa === 0.6 && await rotulo(L) === 'mudar a força da tinta' && await A(L, () => getComputedStyle(document.querySelector('#mundo canvas.hex-desenho')).opacity) === '0.6',
      'a força 0,6 (meio a meio) deixa a imagem aparecer por baixo dos hexágonos');
    await A(L, () => __mundo.App.mudar('pincelada', mm => { mm.pintura.ops.push({ t: 'fl', r: 30, pts: [[100, 900], [400, 950]] }); })); await espera(300);
    ok(await A(L, () => getComputedStyle(document.querySelector('#mundo canvas.pintura')).opacity) === '0.6', 'e por baixo do desenho à mão também (a mesma força)');
    await desfazer(L); await desfazer(L);
    ok((await mapa(L)).pintura.alfa === 1 && await A(L, () => getComputedStyle(document.querySelector('#mundo canvas.hex-desenho')).opacity) === '1', 'desfazer volta a tinta inteira');
  });

  await passo('os dias da semana', async () => {
    ok(/^1 de Alvorada, ano 1$/.test((await topo(L)).data), 'um mapa novo ainda não conta a semana: só a data');
    await semAvisos(L); await L.F.click('#diaMais'); await espera(250);
    await aba(L, 'mapa');
    await escolher(L, 'mapa:semana', '2');
    let m = await mapa(L);
    ok(m.cal.sem0 === 1 && await rotulo(L) === 'escolher o dia da semana' && (await topo(L)).data === 'Quarta-Feira, 2 de Alvorada, ano 1', 'o mestre diz que hoje (o dia 2) é Quarta-Feira: aparece junto da data, na barra de cima');
    await aba(L, 'hoje');
    ok(/^Quarta-Feira, 2 de Alvorada, ano 1$/.test(await L.F.locator('#pane h3').first().innerText()), 'e na aba Hoje');
    await semAvisos(L); await L.F.click('#diaMais'); await espera(250);
    ok((await topo(L)).data === 'Quinta-Feira, 3 de Alvorada, ano 1', 'o dia seguinte é Quinta-Feira (o resto segue sozinho)');
    for (let i = 0; i < 4; i++) { await L.F.click('#diaMais'); await espera(150); }
    ok((await topo(L)).data === 'Segunda-Feira, 7 de Alvorada, ano 1', 'depois de Domingo, Segunda-Feira de novo');
    await L.F.click('#diaMenos'); await espera(200);
    ok((await topo(L)).data === 'Domingo, 6 de Alvorada, ano 1' && (await mapa(L)).cal.tempo === 0, 'o ◀ volta um dia');
    await aba(L, 'mapa');
    ok(await campo(L, 'mapa:semana').inputValue() === '6', 'no calendário, o dia de hoje (Domingo) aparece escolhido');
    await escolher(L, 'mapa:semana', '-1');
    ok((await mapa(L)).cal.sem0 === null && (await topo(L)).data === '6 de Alvorada, ano 1' && await rotulo(L) === 'tirar o dia da semana', '"Sem dia da semana" tira a semana da data');
    await desfazer(L);
    ok((await mapa(L)).cal.sem0 !== null && /^Domingo, /.test((await topo(L)).data), 'desfazer a traz de volta');
  });

  await passo('o tempo para todos', async () => {
    // duas rotas na fileira r = 10, a 10 e a 5 cubos por tempo (sem terreno: cada hexágono, 5 cubos)
    await A(L, Y => __mundo.App.mudar('preparar', m => {
      const N = __mundo.N;
      for (const k of Object.keys(m.hexes)) delete m.hexes[k];
      m.objs.push(Object.assign(N.objNovo('t', { pts: [[200, Y], [1000, Y]] }), { id: 'rt', nome: 'Estrada do Norte' }));
      m.objs.push(Object.assign(N.objNovo('t', { pts: [[200, Y + 300], [1000, Y + 300]] }), { id: 'rt2', nome: 'Estrada do Sul' }));
      m.objs.push(Object.assign(N.objNovo('g', { x: 200, y: Y, rota: 'rt', pt: 10, sigla: 'HER' }), { id: 'g', nome: 'Os Heróis' }));
      m.objs.push(Object.assign(N.objNovo('g', { x: 200, y: Y + 300, rota: 'rt2', pt: 5, sigla: 'CAR' }), { id: 'g2', nome: 'A Caravana' }));
      m.objs.push(Object.assign(N.objNovo('g', { x: 700, y: 900, sigla: 'ESP' }), { id: 'g3', nome: 'O Espião' }));
    }), Y);
    await espera(300);
    let m = await mapa(L);
    const dia0 = m.cal.dia;
    ok((await topo(L)).tempoVisivel && (await topo(L)).tempo === '· 1º tempo de 10' && /1º tempo de 10/.test(await L.F.locator('#tempoTxt').getAttribute('title').then(x => x + ' ' + (m.cal.tempo + 1) + 'º tempo de 10')),
      'junto da data, o tempo de agora: "1º tempo de 10"');
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(300);
    m = await mapa(L);
    let g = await obj(L, 'g'), g2 = await obj(L, 'g2'), g3 = await obj(L, 'g3');
    ok(m.cal.tempo === 1 && m.cal.dia === dia0 && g.prog === 10 && g2.prog === 5 && g3.x === 700 && await rotulo(L) === 'passar 1 tempo' && (await topo(L)).tempo === '· 2º tempo de 10',
      '"+1 tempo": cada grupo com rota anda um tempo no seu passo (10 e 5 cubos); o sem rota fica; o relógio vai para o 2º tempo');
    ok(/Passou 1 tempo: agora é o 2º tempo de 10\. 2 grupos andaram\./.test(await textoDoAviso(L)), 'o aviso diz o tempo novo e quantos grupos andaram: ' + await textoDoAviso(L));
    await aba(L, 'hoje');
    ok(/2º tempo de 10\./.test(await campo(L, 'hoje:tempo-txt').innerText()) && await campo(L, 'hoje:tempo').isVisible() && /Próximo dia/.test(await campo(L, 'hoje:+1').innerText()),
      'a aba Hoje também diz o tempo e tem "+1 tempo" e "Próximo dia"');
    ok(await campo(L, 'gr-andar-todos').count() === 0, '(os "Andar com todos" saíram: o +1 tempo e o Próximo dia já levam todos)');
    await botao(L, 'hoje:tempo');
    m = await mapa(L);
    ok(m.cal.tempo === 2 && (await obj(L, 'g')).prog === 20, '"+1 tempo" na aba Hoje faz o mesmo');
    await semAvisos(L); await L.F.click('#diaMais'); await espera(300);
    m = await mapa(L); g = await obj(L, 'g'); g2 = await obj(L, 'g2');
    ok(m.cal.dia === dia0 + 1 && m.cal.tempo === 0 && g.prog === 100 && g2.prog === 50 && await rotulo(L) === 'passar o dia' && (await topo(L)).tempo === '· 1º tempo de 10',
      '"Próximo dia" (▶): cada grupo anda os 8 tempos que faltavam no seu passo (80 e 40 cubos a mais), e o relógio vai para o 1º tempo de amanhã: ' + j([g.prog, g2.prog, m.cal]));
    ok(/^Novo dia: .*1º tempo de 10\. 2 grupos andaram\./.test(await textoDoAviso(L)), 'o aviso: "Novo dia…": ' + await textoDoAviso(L));
    await desfazer(L);
    m = await mapa(L);
    ok(m.cal.dia === dia0 && m.cal.tempo === 2 && (await obj(L, 'g')).prog === 20 && (await obj(L, 'g2')).prog === 10, 'desfazer volta o dia, o tempo e os dois grupos');
    await L.F.click('#diaMenos'); await espera(250);
    m = await mapa(L);
    ok(m.cal.dia === dia0 - 1 && (await obj(L, 'g')).prog === 20 && (await obj(L, 'g2')).prog === 10, 'o ◀ só volta a data: os grupos ficam onde estão');
    await desfazer(L);
    // (lote 7, parte 2) com um grupo só andando, o aviso diz qual: "1 grupo andou: Os Heróis."
    await A(L, () => __mundo.App.mudar('uma rota só', mm => { mm.objs.find(o => o.id === 'g2').rota = null; })); await espera(200);
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(250);
    ok(/^Passou 1 tempo: agora é o 4º tempo de 10\. 1 grupo andou: Os Heróis\.(Desfazer)?$/.test((await textoDoAviso(L)).trim()), 'com um grupo só andando, o aviso diz qual: ' + await textoDoAviso(L));
    await desfazer(L); await desfazer(L);
    ok((await mapa(L)).cal.tempo === 2 && (await obj(L, 'g2')).rota === 'rt2', '(de volta: o 3º tempo, e a Caravana com a rota)');
    // sem nenhum grupo com rota, só o relógio passa
    await A(L, () => __mundo.App.mudar('sem rotas', mm => { mm.objs.forEach(o => { if (o.k === 'g') o.rota = null; }); })); await espera(200);
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(250);
    ok((await mapa(L)).cal.tempo === 3 && /^Passou 1 tempo: agora é o 4º tempo de 10\.(Desfazer)?$/.test((await textoDoAviso(L)).trim()), 'sem grupo andando, "+1 tempo" passa só o relógio: ' + await textoDoAviso(L));
    await foto('lote7-tempo');
  });

  await passo('quem joga', async () => {
    try {
      await A(L, () => { __mundo.App.comoJogador = true; }); await espera(400);
      const tp = await topo(L);
      ok(tp.tempoVisivel && /tempo de 10$/.test(tp.tempo) && /^Domingo, /.test(tp.data) && await A(L, () => getComputedStyle(document.getElementById('tempoMais')).display === 'none' || document.getElementById('tempoMais').disabled),
        'vendo como jogador: a data (com o dia da semana) e o tempo, sem o "+1 tempo"');
    } finally { await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300); }
  });

  await passo('tela estreita', async () => {
    await L.P.setViewportSize({ width: 700, height: 860 }); await espera(400);
    ok(await A(L, () => document.documentElement.scrollWidth <= innerWidth + 1) && await A(L, () => getComputedStyle(document.querySelector('#tempoMais span')).display === 'none')
      && await A(L, () => getComputedStyle(document.querySelector('#tempoTxt .t-curto')).display !== 'none' && getComputedStyle(document.querySelector('#tempoTxt .t-longo')).display === 'none') && /^· \d+\/10$/.test((await topo(L)).curto),
      'na tela estreita, o tempo na forma curta ("· 4/10"), o "+1 tempo" só com a ampulheta, e nada passa da tela');
    await foto('lote7-estreita');
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})();
