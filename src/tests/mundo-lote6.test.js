// Mapa-múndi, lote 6, pela interface (a página sozinha, no navegador):
//   · a marcha em tempos: o grupo anda os cubos de um tempo ("Andar 1 tempo"), "Andar 1 dia" anda os tempos que faltam
//     até o fim do dia e passa o dia; as bolinhas da travessia (o hexágono que leva mais de um tempo) no mapa — para o
//     mestre e para quem joga — e no painel; o ajuste à mão (− tempo, + tempo, clicar numa bolinha) sem passar o tempo;
//     os tempos de marcha de um dia, no calendário;
//   · o tamanho do mapa em cubos: a largura muda o tamanho dos hexágonos, e o terreno pintado é refeito na grade nova;
//   · as regiões de dentro (o Condado no Reino): "Dentro de", a sugestão quando ela está desenhada dentro de outra, a
//     facção herdada (e a cor própria), a lista em árvore, o desenho no mapa.
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
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(160); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(200); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(200); };
// as bolinhas do grupo no mapa: [cheias, todas]
const bolinhasNoMapa = (a, id) => A(a, x => { const g = document.querySelector(`#mundo svg [data-id="${x}"]`); return g ? [g.querySelectorAll('.bolinhas .bol.feita').length, g.querySelectorAll('.bolinhas .bol').length] : null; }, id);
const bolinhasNoPainel = a => A(a, () => [...document.querySelectorAll('#pane .bols > *')].map(b => (b.classList.contains('feita') ? '●' : '○')).join(''));
const Y = 346.41;          // a fileira de hexágonos r = 10 (em pé, de 40 unidades): y = 40·1,5/√3·10

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote6', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa, a grade, a rota e o grupo', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    ok((await mapa(L)).grade.tam === 40 && (await mapa(L)).cal.tpd === 10 && (await mapa(L)).cal.tempo === 0, '(a grade de 40 unidades; o dia tem 10 tempos de marcha)');
    // uma rota pela fileira r = 10, com uma montanha de 20 cubos logo no segundo hexágono, e o grupo no começo, a 10 cubos por tempo
    await A(L, Y => __mundo.App.mudar('preparar', m => {
      const N = __mundo.N;
      m.hexes['1,10'] = ['mo', 20];
      m.objs.push(Object.assign(N.objNovo('t', { pts: [[200, Y], [600, Y]] }), { id: 'rt', nome: 'Estrada do Norte' }));
      m.objs.push(Object.assign(N.objNovo('g', { x: 200, y: Y, rota: 'rt', pt: 10, sigla: 'HER' }), { id: 'g', nome: 'Os Heróis' }));
    }), Y);
    await aba(L, 'selecao');
    await selecionar(L, 'g');
    ok(await campo(L, 'o:g:pt').inputValue() === '10' && /Por dia \(10 tempos\): 100 cubos\./.test(await L.F.locator('#pane').innerText()), 'o grupo anda 10 cubos por tempo (o painel diz quanto dá por dia: 100 cubos)');
    ok((await obj(L, 'g')).cubos === 100, '(e guarda os cubos por dia, para o site de antes)');
    const prog = (await L.F.locator('#pane .progresso small').innerText()).trim();
    ok(/^0 de 65 cubos · hexágono 0 de \d+ · faltam cerca de 7 tempos$/.test(prog), 'o progresso, em tempos do grupo (65 cubos a 10 por tempo: cerca de 7 tempos): ' + prog);
  });

  await passo('as bolinhas e a marcha', async () => {
    ok(j(await bolinhasNoMapa(L, 'g')) === '[0,2]' && await bolinhasNoPainel(L) === '○○' && /Atravessando \(Montanha\): 0 de 2 tempos/.test(await L.F.locator('#pane').innerText()),
      'a montanha de 20 cubos, a 10 por tempo: duas bolinhas vazias no mapa, junto do grupo, e no painel');
    await foto('lote6-bolinhas');
    await botao(L, 'o:andar');
    let m = await mapa(L), g = await obj(L, 'g');
    ok(g.prog === 10 && g.x === 200 && m.cal.tempo === 1 && m.cal.dia === 0 && await rotulo(L) === 'andar 1 tempo', 'Andar 1 tempo: metade da montanha (o grupo ainda não entrou nela), e passa um tempo de marcha (o dia não)');
    ok(/^Ainda no caminho do próximo hexágono \(Montanha\): 10 de 20 cubos\. 1 tempo de marcha \(hoje: 1 de 10\)\./.test(await textoDoAviso(L)), 'o aviso diz onde o grupo está e o tempo de hoje: ' + await textoDoAviso(L));
    ok(await ate(async () => j(await bolinhasNoMapa(L, 'g')) === '[1,2]') && await bolinhasNoPainel(L) === '●○', 'uma bolinha cheia (no mapa e no painel)');
    ok(await A(L, () => { const b = document.querySelector('#mundo svg [data-id="g"] .bolinhas .bol.feita'); return getComputedStyle(b).fill; }) === 'rgb(230, 171, 79)', 'a bolinha cheia tem a cor do grupo');
    ok(/Hoje o grupo já marchou 1 tempo de 10\./.test(await L.F.locator('#pane').innerText()), 'o painel diz o tempo de marcha de hoje');
    // o ajuste à mão: o tempo do mundo fica
    await botao(L, 'o:menos');
    g = await obj(L, 'g'); m = await mapa(L);
    ok(g.prog === 0 && m.cal.tempo === 1 && await rotulo(L) === 'voltar um tempo de marcha' && await bolinhasNoPainel(L) === '○○', '− tempo: o grupo volta um tempo na rota, e o tempo do mundo não muda');
    await botao(L, 'o:mais');
    ok((await obj(L, 'g')).prog === 10 && (await mapa(L)).cal.tempo === 1 && await rotulo(L) === 'avançar um tempo de marcha', '+ tempo: avança um tempo, sem passar o tempo');
    await botao(L, 'o:g:bol:1');
    ok((await obj(L, 'g')).prog === 0 && await bolinhasNoPainel(L) === '○○', 'clicar na última bolinha cheia a esvazia');
    await botao(L, 'o:g:bol:2');
    g = await obj(L, 'g');
    ok(g.prog === 20 && g.x === 240 && await rotulo(L) === 'marcar a travessia' && await ate(async () => (await bolinhasNoMapa(L, 'g'))[1] === 0) && await L.F.locator('#pane .bols').count() === 0,
      'clicar na última bolinha: a travessia acaba, o grupo entra na montanha (e as bolinhas somem)');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    ok((await obj(L, 'g')).prog === 0 && (await mapa(L)).cal.tempo === 1, 'Desfazer volta o grupo');
    await botao(L, 'o:g:bol:1');
    ok((await obj(L, 'g')).prog === 10, '(uma bolinha marcada)');
    // Andar 1 dia: os tempos que faltam no dia (9 de 10 cubos) — até o fim da rota — e o dia passa
    await botao(L, 'o:andar-dia');
    g = await obj(L, 'g'); m = await mapa(L);
    ok(g.prog === 65 && g.x === 600 && m.cal.dia === 1 && m.cal.tempo === 0 && await rotulo(L) === 'andar 1 dia' && /e chegou ao fim da rota\. Passou o dia: hoje é 2 de Alvorada, ano 1\./.test(await textoDoAviso(L)),
      'Andar 1 dia: anda os 9 tempos que faltavam (até o fim da rota), e o dia passa: ' + await textoDoAviso(L));
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    ok((await obj(L, 'g')).prog === 10 && (await mapa(L)).cal.dia === 0 && (await mapa(L)).cal.tempo === 1, 'Desfazer volta o grupo, o dia e o tempo de marcha, juntos');
    // o mestre muda o custo da montanha no meio da travessia: as bolinhas acompanham (o grupo não se mexeu)
    await A(L, () => __mundo.App.mudar('custo', m => { m.hexes['1,10'] = ['mo', 30]; }));
    ok(await ate(async () => j(await bolinhasNoMapa(L, 'g')) === '[1,3]'), 'a montanha passa a custar 30: três bolinhas no mapa, uma cheia (o grupo não se mexeu)');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    ok(await ate(async () => j(await bolinhasNoMapa(L, 'g')) === '[1,2]'), '(Desfazer volta as duas bolinhas)');
  });

  await passo('quem joga vê as bolinhas', async () => {
    try {
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(300);
    ok(await ate(async () => j(await bolinhasNoMapa(L, 'g')) === '[1,2]'), 'vendo como jogador (a projeção, sem os custos do mestre): as bolinhas chegam prontas');
    ok(await A(L, () => JSON.stringify(__mundo.App.vista().objs.find(o => o.id === 'g').bol)) === '[1,2]' && await A(L, () => !Array.isArray(__mundo.App.vista().hexes['1,10'])), '(na projeção: bol = [1, 2], e o custo próprio do hexágono não vai)');
    await selecionar(L, 'g');
    ok(await bolinhasNoPainel(L) === '●○' && await L.F.locator('#pane .bols button').count() === 0, 'quem joga vê a fileira no painel do grupo, sem poder clicar');
    await foto('lote6-bolinhas-jogador');
    } finally { await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300); }
  });

  await passo('a aba Hoje', async () => {
    await selecionar(L, null);
    await aba(L, 'hoje');
    ok(await campo(L, 'gr-andar:g').isVisible() && await campo(L, 'gr-andar-dia:g').isVisible() && /Andar 1 tempo/.test(await campo(L, 'gr-andar:g').innerText()) && await L.F.locator('#pane .gr .bols > *').count() === 2,
      'na aba Hoje, cada grupo com "Andar 1 tempo", "Andar 1 dia" e as bolinhas');
    await botao(L, 'gr-andar:g');
    ok((await obj(L, 'g')).prog === 20 && (await mapa(L)).cal.tempo === 2, 'Andar 1 tempo pela aba Hoje');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    await botao(L, 'hoje:+1');
    ok((await mapa(L)).cal.dia === 1 && (await mapa(L)).cal.tempo === 0, '"Passar o dia": o dia novo começa no primeiro tempo de marcha');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    ok((await mapa(L)).cal.tempo === 1, '(Desfazer volta o tempo de marcha de hoje)');
    await botao(L, 'hoje:ir');
    const dl = L.F.locator('dialog.mundo-dl[open]'); await dl.waitFor();
    await dl.locator('#dl-dia').fill('5');
    await dl.locator('button[type="submit"]').click(); await espera(250);
    ok((await mapa(L)).cal.dia === 4 && (await mapa(L)).cal.tempo === 0 && await rotulo(L) === 'ir para a data', '"Ir para a data": o dia escolhido começa no primeiro tempo de marcha');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
  });

  await passo('os tempos de marcha de um dia', async () => {
    await aba(L, 'mapa');
    ok(await campo(L, 'mapa:tpd').inputValue() === '10', 'no calendário do mapa: os tempos de marcha por dia (10)');
    await escrever(L, 'mapa:tpd', '8');
    ok((await mapa(L)).cal.tpd === 8 && (await obj(L, 'g')).cubos === 80 && await rotulo(L) === 'mudar os tempos de marcha do dia', 'com 8 tempos por dia, o grupo de 10 por tempo anda 80 por dia');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
  });

  await passo('o tamanho do mapa em cubos', async () => {
    await A(L, () => __mundo.App.mudar('pintar', m => { m.hexes['8,0'] = 'fl'; m.hexes['9,0'] = ['co', 3]; })); await espera(150);
    await aba(L, 'terreno');
    ok(await campo(L, 'ter:largcubos').inputValue() === '250' && /A altura acompanha a imagem: 175 cubos\./.test(await L.F.locator('#pane').innerText()), 'a largura do mapa em cubos: 250 (2000 unidades em hexágonos de 40), e a altura acompanha (175)');
    const antes = await mapa(L), nAntes = Object.keys(antes.hexes).length;
    await escrever(L, 'ter:largcubos', '500');
    const m = await mapa(L), g = await obj(L, 'g');
    const em = (x, y) => A(L, ([x, y]) => { const N = __mundo.N, mm = __mundo.App.mapa, h = N.hexDe(mm, x, y); return mm.hexes[h.q + ',' + h.r]; }, [x, y]);
    ok(m.grade.tam === 20 && Object.keys(m.hexes).length > nAntes * 3 && j(await em(320, 0)) === '"fl"' && j(await em(360, 0)) === j(['co', 3]) && j(await em(240, Y)) === j(['mo', 20]),
      'largura de 500 cubos: hexágonos de 20, e o terreno pintado refeito na grade nova (no mesmo lugar, com o custo próprio): ' + Object.keys(m.hexes).length + ' hexágonos');
    ok(g.x === 200 && g.y === Y && await rotulo(L) === 'mudar o tamanho do mapa em cubos' && /O mapa agora tem cerca de 500 × 350 cubos/.test(await textoDoAviso(L)), 'o grupo fica onde estava; o aviso diz o tamanho novo: ' + await textoDoAviso(L));
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    ok((await mapa(L)).grade.tam === 40 && j((await mapa(L)).hexes) === j(antes.hexes), 'Desfazer volta a grade e o terreno de antes');
    await escrever(L, 'ter:largcubos', '1');
    ok((await mapa(L)).grade.tam === 40 && /Use um número de cubos/.test(await textoDoAviso(L)), 'uma largura que não dá: nada muda, e o aviso diz por quê');
  });

  await passo('as regiões de dentro', async () => {
    await A(L, () => __mundo.App.mudar('preparar as regiões', m => {
      const N = __mundo.N;
      m.faccoes.push(Object.assign(N.faccaoNova('Aldar', '#c0503a'), { id: 'fa' }));
      // (Brenn desenhada antes do Reino: sem estar dentro dele, fica por baixo)
      m.objs.push(Object.assign(N.objNovo('r', { pts: [[150, 300], [450, 300], [450, 400], [150, 400]] }), { id: 'brenn', nome: 'Brenn' }));
      m.objs.push(Object.assign(N.objNovo('r', { pts: [[100, 250], [700, 250], [700, 450], [100, 450]], fac: 'fa', custo: 8 }), { id: 'reino', nome: 'Reino de Aldar' }));
    })); await espera(200);
    const porCima = () => A(L, () => { const a = document.querySelector('#mundo svg [data-id="reino"] path.reg'), b = document.querySelector('#mundo svg [data-id="brenn"] path.reg'); return !!(a && b) && !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING); });
    ok(await porCima() === false, '(antes de ficar dentro do Reino, Brenn está por baixo dele, desenhada antes)');
    await aba(L, 'selecao');
    await selecionar(L, 'brenn');
    ok(await campo(L, 'o:brenn:pai').inputValue() === '' && /Pôr dentro de Reino de Aldar/.test(await campo(L, 'o:brenn:pai-sugere').innerText()), 'Brenn, desenhada dentro do Reino: o painel sugere "Pôr dentro de Reino de Aldar" (nada muda sozinho)');
    await botao(L, 'o:brenn:pai-sugere');
    ok((await obj(L, 'brenn')).pai === 'reino' && await rotulo(L) === 'pôr a região dentro de Reino de Aldar' && await campo(L, 'o:brenn:pai').inputValue() === 'reino' && await campo(L, 'o:brenn:pai-sugere').count() === 0,
      'um clique: Brenn fica dentro do Reino');
    ok(await ate(porCima), 'no mapa, a região de dentro fica por cima da de fora (mesmo desenhada antes)');
    ok((await L.F.locator('#pane .sub').first().innerText()) === 'Sub-região de Reino de Aldar · Aldar (de Reino de Aldar)' && (await campo(L, 'o:brenn:fac').locator('option').first().innerText()) === 'A de Reino de Aldar (Aldar)',
      'sem facção própria, ela é do Aldar (a do Reino): ' + await L.F.locator('#pane .sub').first().innerText());
    const desenho = () => A(L, () => { const p = document.querySelector('#mundo svg [data-id="brenn"] path.reg'); const n = document.querySelector('#mundo svg .c-nreg [data-id="brenn"] text'); return p && { cls: p.getAttribute('class'), fill: p.getAttribute('fill'), nome: n && n.getAttribute('class') }; });
    ok(await ate(async () => { const d = await desenho(); return d && /subreg/.test(d.cls) && d.fill === '#c0503a' && /rotulo-subreg/.test(d.nome); }), 'no mapa: a borda mais fina da região de dentro, a cor da facção herdada e o nome menor: ' + j(await desenho()));
    // o nome do Reino não cai em cima de Brenn
    const nomes = await A(L, () => ['reino', 'brenn'].map(id => document.querySelector('#mundo svg .c-nreg [data-id="' + id + '"] text').getBoundingClientRect()).map(r => [r.left, r.top, r.right, r.bottom]));
    const cruza = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    ok(!cruza(nomes[0], nomes[1]), 'o nome do Reino fica fora de Brenn (os nomes não se encavalam): ' + j(nomes));
    // uma terceira, desenhada dentro de Brenn (e do Reino): a sugestão é a mais de dentro
    await A(L, () => __mundo.App.mudar('a aldeia', m => { m.objs.push(Object.assign(__mundo.N.objNovo('r', { pts: [[200, 320], [300, 320], [300, 380], [200, 380]] }), { id: 'vau', nome: 'Aldeia do Vau' })); })); await espera(150);
    await selecionar(L, 'vau');
    ok(/Pôr dentro de Brenn$/.test((await campo(L, 'o:vau:pai-sugere').innerText()).trim()), 'desenhada dentro de Brenn (que está no Reino): a sugestão é Brenn, a mais de dentro');
    await botao(L, 'o:vau:pai-sugere');
    const corDe = id => A(L, x => { const p = document.querySelector(`#mundo svg [data-id="${x}"] path.reg`); return p && p.getAttribute('fill'); }, id);
    ok((await obj(L, 'vau')).pai === 'brenn' && await ate(async () => (await corDe('vau')) === '#c0503a'), 'a aldeia, dentro de Brenn, é do Aldar (a facção do Reino, duas regiões acima)');
    // o Reino muda de facção: as de dentro mudam de cor junto
    await A(L, () => __mundo.App.mudar('outra facção', m => { m.faccoes.push(Object.assign(__mundo.N.faccaoNova('Vale', '#55aa55'), { id: 'fb' })); m.objs.find(o => o.id === 'reino').fac = 'fb'; }));
    ok(await ate(async () => (await corDe('brenn')) === '#55aa55' && (await corDe('vau')) === '#55aa55'), 'o Reino muda de facção: Brenn e a aldeia mudam de cor junto');
    for (let i = 0; i < 3; i++) { await A(L, () => __mundo.App.desfazer()); await espera(120); }
    ok(!(await obj(L, 'vau')) && (await obj(L, 'reino')).fac === 'fa' && await ate(async () => (await corDe('brenn')) === '#c0503a'), '(Desfazer tira a aldeia e volta a facção do Reino)');
    await selecionar(L, 'brenn');
    await campo(L, 'o:brenn:cor').fill('#3f7fbf'); await espera(250);
    ok(await ate(async () => (await desenho()).fill === '#3f7fbf') && (await obj(L, 'brenn')).cor === '#3f7fbf', 'a cor própria do Condado vale no lugar da do Reino (para os condados se distinguirem)');
    // o Reino não pode ficar dentro de Brenn (que está dentro dele)
    await selecionar(L, 'reino');
    const ops = await campo(L, 'o:reino:pai').locator('option').evaluateAll(l => l.map(o => o.value));
    ok(!ops.includes('brenn') && !ops.includes('reino'), 'o Reino não pode ficar dentro de Brenn, que está dentro dele (nem dentro de si)');
    // a lista em árvore
    await selecionar(L, null);
    const lista = await A(L, () => [...document.querySelectorAll('#pane .lista .li')].filter(b => /Reino de Aldar|Brenn/.test(b.textContent)).map(b => [b.querySelector('b').textContent, b.classList.contains('dentro')]));
    ok(j(lista) === j([['Reino de Aldar', false], ['Brenn', true]]), 'na lista do mapa, Brenn vem logo embaixo do Reino, para dentro: ' + j(lista));
    await aba(L, 'faccoes');
    ok(/Aldar\s*1 província · 1 sub-região/.test(await L.F.locator('#pane').innerText()), 'a facção conta as duas regiões (a de dentro herda): (lote 10) 1 província e 1 sub-região');
    // o grupo dentro de Brenn
    await A(L, Y => __mundo.App.mudar('mover o grupo', m => { const g = m.objs.find(o => o.id === 'g'); g.x = 200; g.y = Y; }), Y); await espera(150);
    await aba(L, 'hoje');
    ok(/Em Brenn \(Reino de Aldar\)/.test(await L.F.locator('#pane').innerText()), 'onde está o grupo: "Em Brenn (Reino de Aldar)"');
    await foto('lote6-regioes');
  });

  const inesperados = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 8).join('\n'));
  ok(inesperados.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
