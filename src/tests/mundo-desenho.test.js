// Mapa-múndi: o desenho, pela interface (a página sozinha, no navegador).
// O pincel livre do terreno (com textura, borracha, desfazer, sem grade e com ela: o terreno de cada hexágono vem do
// desenho, e o hexágono pintado corrige), a força e o "Apagar o desenho"; a ferramenta Desenho: carimbos (um clique,
// espalhar arrastando, escolher), textos (a janela, o painel), rios, estradas e trilhas (o rio engrossa, o nome vai
// ao longo); e a zona de guerra (as listras das duas facções, o pulso, as fases com o tempo, a aba Hoje, o jogador).
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
async function naTela(a, x, y) {
  return A(a, ([x, y]) => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(); return [r.left + x * r.width / m.larg, r.top + y * r.height / m.alt]; }, [x, y]);
}
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function clicar(a, x, y) { await semAvisos(a); const [px, py] = await naTela(a, x, y); await a.P.mouse.click(px, py); await a.F.waitForTimeout(160); }
async function arrastar(a, ...pts) {
  await semAvisos(a);
  const tela = [];
  for (const p of pts) tela.push(await naTela(a, p[0], p[1]));
  await a.P.mouse.move(tela[0][0], tela[0][1]); await a.P.mouse.down();
  for (const [x, y] of tela.slice(1)) await a.P.mouse.move(x, y, { steps: 12 });
  await a.P.mouse.up(); await a.F.waitForTimeout(220);
}
async function pairar(a, x, y) { const [px, py] = await naTela(a, x, y); await a.P.mouse.move(px, py, { steps: 3 }); await a.F.waitForTimeout(120); }
async function ferramenta(a, f) { await a.F.click(`#rail .tool[data-f="${f}"]`); await a.F.waitForTimeout(120); }
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(160); }
async function botao(a, k) { await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(200); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function chip(a, texto) { await a.F.locator('#opts .chip', { hasText: texto }).first().click(); await a.F.waitForTimeout(140); }
async function opcao(a, rotulo, valor) { await a.F.selectOption(`#opts select[aria-label="${rotulo}"]`, valor); await a.F.waitForTimeout(140); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const sel = a => A(a, () => (__mundo.App.sel || []).slice());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const doTipo = (a, k) => A(a, k => __mundo.App.mapa.objs.filter(o => o.k === k), k);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const dica = a => a.F.locator('#dica').innerText();
// o pixel do desenho à mão num ponto do mapa (a opacidade, de 0 a 255)
const pixel = (a, x, y) => A(a, ([x, y]) => {
  const c = document.querySelector('#mundo canvas.pintura');
  if (!c || c.hidden) return -1;
  const k = c.width / __mundo.App.mapa.larg, um = document.createElement('canvas');
  um.width = um.height = 1;
  const cx = um.getContext('2d', { willReadFrequently: true });
  cx.drawImage(c, Math.round(x * k), Math.round(y * k), 1, 1, 0, 0, 1, 1);
  return cx.getImageData(0, 0, 1, 1).data[3];
}, [x, y]);
const desfazer = async a => { await a.F.click('#btDesfazer'); await a.F.waitForTimeout(200); };

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'desenho', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const id = {};

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Desenho'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    const m = await mapa(L);
    ok(!!m && j(m.pintura) === j({ alfa: 1, ops: [] }) && await L.F.locator('#rail .tool[data-f="p"]').isVisible(), 'um mapa novo sem desenho à mão; o trilho tem a ferramenta Desenho');
  });

  await passo('o pincel livre, sem grade', async () => {
    await ferramenta(L, 'h');
    ok(await L.F.locator('#opts .chip', { hasText: 'Pincel livre' }).getAttribute('aria-pressed') === 'true', 'sem grade, a ferramenta Terreno começa no pincel livre');
    ok(await L.F.locator('#opts select[aria-label="Com o que o pincel pinta"] option').count() === 9, 'o pincel livre oferece os 8 terrenos e a borracha');
    await opcao(L, 'Com o que o pincel pinta', 'fl');
    await pairar(L, 300, 300);
    ok(/Arraste para pintar à mão: Floresta\./.test(await dica(L)) && await L.F.locator('#mundo svg .c-rasc .pincel').count() === 1, 'a dica diz o que o pincel pinta; o círculo do pincel segue o cursor: ' + await dica(L));
    await arrastar(L, [200, 300], [500, 300], [700, 450]);
    let m = await mapa(L);
    ok(m.pintura.ops.length === 1 && m.pintura.ops[0].t === 'fl' && m.pintura.ops[0].pts.length >= 2 && await rotulo(L) === 'pintar à mão', 'arrastar pinta uma pincelada de Floresta (um passo de desfazer): ' + j(m.pintura.ops[0]).slice(0, 120));
    ok(await pixel(L, 350, 300) === 255 && await pixel(L, 350, 700) === 0, 'a tinta aparece no canvas do desenho (e só onde passou o pincel)');
    await opcao(L, 'Com o que o pincel pinta', '-');
    ok(/Arraste para apagar o desenho à mão\./.test(await dica(L)), 'a borracha: a dica diz que apaga');
    await arrastar(L, [350, 200], [350, 400]);
    m = await mapa(L);
    ok(m.pintura.ops.length === 2 && m.pintura.ops[1].t === '' && await rotulo(L) === 'apagar o desenho' && await pixel(L, 350, 300) === 0 && await pixel(L, 450, 300) === 255,
      'a borracha tira o que estava pintado (só por onde passa)');
    await desfazer(L);
    ok((await mapa(L)).pintura.ops.length === 1 && await pixel(L, 350, 300) === 255, 'desfazer devolve o que a borracha tirou');
    await opcao(L, 'Com o que o pincel pinta', 'mo');
    await L.F.locator('#opts input[aria-label="Tamanho do pincel livre"]').fill('60'); await espera(80);
    await arrastar(L, [1100, 500], [1300, 700]);
    m = await mapa(L);
    ok(m.pintura.ops.length === 2 && m.pintura.ops[1].t === 'mo' && m.pintura.ops[1].r > m.pintura.ops[0].r, 'outro terreno, com o pincel maior: ' + j(m.pintura.ops.map(o => [o.t, o.r])));
    await foto('desenho-pincel');
  });

  await passo('o desenho dá o terreno dos hexágonos', async () => {
    await aba(L, 'terreno');
    ok(/2 pinceladas\. Com a grade de hexágonos, cada hexágono ganha o terreno do desenho\./.test(await L.F.locator('#pane').innerText()) && await campo(L, 'ter:livre').isVisible(),
      'a aba Terreno conta as pinceladas e diz o que a grade faz com elas');
    await escrever(L, 'ter:tam', '50');
    const info = await A(L, () => { const N = __mundo.N, m = __mundo.App.mapa, h = N.hexDe(m, 450, 300), i = N.hexInfo(m, h.q, h.r); return [i.terreno && i.terreno.id, i.desenho, i.custo]; });
    ok(j(info) === j(['fl', true, 10]), 'com a grade, o hexágono pintado à mão é Floresta (custa 10): ' + j(info));
    await aba(L, 'selecao');
    await ferramenta(L, 'h');
    await pairar(L, 450, 300);
    ok(/Aqui: Floresta \(do desenho\) · 10 cubos\./.test(await dica(L)), 'a dica do pincel livre diz o terreno do hexágono e que ele vem do desenho: ' + await dica(L));
    await chip(L, 'Por hexágono');
    ok(await L.F.locator('#opts select[aria-label="O que o pincel faz"] option[value="desenho"]').count() === 1, 'por hexágono, com desenho: aparece "Seguir o desenho"');
    await opcao(L, 'O que o pincel faz', 'nada');
    await clicar(L, 450, 300);
    const k = await A(L, () => { const N = __mundo.N, m = __mundo.App.mapa; return N.chaveHex(N.hexDe(m, 450, 300)); });
    let m = await mapa(L);
    ok(m.hexes[k] === '-' && await A(L, k => { const N = __mundo.N, m = __mundo.App.mapa, h = N.lerChaveHex(k); return N.hexInfo(m, h.q, h.r).terreno; }, k) === null && await L.F.locator('#mundo svg .hex-nada').count() === 1,
      '"Sem terreno" num hexágono do desenho guarda "-": o desenho não vale ali (e o mestre vê o hexágono marcado)');
    await opcao(L, 'O que o pincel faz', 'desenho');
    await clicar(L, 450, 300);
    m = await mapa(L);
    ok(!(k in m.hexes) && await rotulo(L) === 'seguir o desenho', '"Seguir o desenho" tira a correção: volta a valer o desenho');
    await clicar(L, 900, 800);
    ok(j((await mapa(L)).hexes) === '{}', '"Seguir o desenho" onde não há correção não muda nada');
    await chip(L, 'Pincel livre');
  });

  await passo('a força e o apagar', async () => {
    await aba(L, 'terreno');
    await escolher(L, 'ter:forca', '0.6');
    ok((await mapa(L)).pintura.alfa === 0.6 && await A(L, () => getComputedStyle(document.querySelector('#mundo canvas.pintura')).opacity) === '0.6', 'a força do desenho deixa a imagem aparecer por baixo');
    await botao(L, 'ter:apagar-desenho');
    const d = L.F.locator('dialog.mundo-dl[open]');
    await d.waitFor();
    ok(/2 pinceladas saem do mapa/.test(await d.innerText()), 'apagar o desenho pede confirmação: ' + (await d.innerText()).replace(/\s+/g, ' ').slice(0, 100));
    await d.locator('button[type="submit"]').click(); await espera(250);
    ok((await mapa(L)).pintura.ops.length === 0 && await A(L, () => document.querySelector('#mundo canvas.pintura').hidden), 'o desenho sai do mapa (e o canvas some)');
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(250);
    ok((await mapa(L)).pintura.ops.length === 2 && await pixel(L, 450, 300) === 255, 'o Desfazer do aviso traz o desenho de volta');
    await aba(L, 'selecao');
  });

  await passo('tirar um terreno usado no desenho', async () => {
    await aba(L, 'terreno');
    await L.F.click('#pane [data-k="ter:mo:x"]'); await espera(250);
    ok((await mapa(L)).pintura.ops.length === 1 && /Montanha saiu da lista\. A pincelada do desenho com ele saiu\./.test(await textoDoAviso(L)),
      'tirar a Montanha: a pincelada dela sai do desenho, e o aviso diz isso: ' + await textoDoAviso(L));
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(250);
    ok((await mapa(L)).pintura.ops.length === 2 && (await mapa(L)).terrenos.some(t => t.id === 'mo') && await pixel(L, 1200, 600) === 255, 'o Desfazer devolve o terreno e a pincelada');
    await aba(L, 'selecao');
  });

  await passo('carimbos', async () => {
    await ferramenta(L, 'p');
    ok(await L.F.locator('#opts .chip', { hasText: 'Carimbo' }).first().getAttribute('aria-pressed') === 'true', 'a ferramenta Desenho começa nos carimbos');
    await pairar(L, 900, 200);
    ok(await L.F.locator('#mundo svg .c-rasc .car.fantasma').count() === 1 && /Clique para pôr árvore; arraste para espalhar vários\./.test(await dica(L)), 'uma prévia clarinha do carimbo segue o cursor: ' + await dica(L));
    await clicar(L, 900, 200);
    let cs = await doTipo(L, 'c');
    ok(cs.length === 1 && cs[0].ic === 'arvore' && Math.abs(cs[0].x - 900) < 1 && await rotulo(L) === 'novo carimbo' && j(await sel(L)) === j([cs[0].id]) && await A(L, () => __mundo.App.ferramenta) === 'p',
      'um clique põe um carimbo (escolhido; a ferramenta continua)');
    await L.F.locator('#opts .chip[aria-haspopup]').click(); await espera(150);
    await L.F.locator('.menu-icones button[aria-label="Montanha"]').click(); await espera(150);
    await opcao(L, 'Tamanho', '64');
    await arrastar(L, [600, 1100], [1300, 1100]);
    cs = await doTipo(L, 'c');
    const novos = cs.filter(c => c.ic === 'montanha');
    ok(novos.length >= 4 && /^espalhar \d+ carimbos$/.test(await rotulo(L)) && (await sel(L)).length === novos.length, 'arrastar espalha montanhas pelo caminho (um passo de desfazer): ' + novos.length);
    await foto('desenho-carimbos');
    await ferramenta(L, 'sel');
    id.c = cs[0].id;
    await A(L, i => __mundo.App.selecionar([i]), id.c);
    await espera(150);
    ok(await L.F.locator('#pane').innerText().then(x => /Carimbo/.test(x) && /Tamanho \(unidades do mapa\)/.test(x)), 'o painel do carimbo: o desenho, o tamanho, a cor e espelhar');
    await botao(L, 'cb:' + id.c + ':pinheiro');
    await escrever(L, 'o:' + id.c + ':tam', '90');
    await campo(L, 'o:' + id.c + ':vira').check(); await espera(150);
    const c = await obj(L, id.c);
    ok(c.ic === 'pinheiro' && c.tam === 90 && c.vira === true, 'trocar o desenho, o tamanho e espelhar: ' + j(c));
  });

  await passo('textos', async () => {
    await ferramenta(L, 'p');
    await chip(L, 'Texto');
    await opcao(L, 'Letra', 'classica');
    await clicar(L, 1000, 900);
    const d = L.F.locator('dialog.mundo-dl[open]');
    await d.waitFor();
    await d.locator('#dl-t').fill('Mar das Brumas');
    await d.locator('button[type="submit"]').click(); await espera(250);
    const xs = await doTipo(L, 'x');
    ok(xs.length === 1 && xs[0].nome === 'Mar das Brumas' && xs[0].fonte === 'classica' && await rotulo(L) === 'novo texto' && j(await sel(L)) === j([xs[0].id]) && await A(L, () => __mundo.App.ferramenta) === 'sel',
      'um clique pergunta o texto e o põe no mapa, com a letra escolhida: ' + j(xs[0]));
    id.x = xs[0].id;
    ok(await L.F.locator('#mundo svg .c-txt text.texto-livre').textContent() === 'Mar das Brumas', 'o texto aparece no mapa');
    await escrever(L, 'o:' + id.x + ':rot', '-20');
    await escolher(L, 'o:' + id.x + ':esp', '0.35');
    await campo(L, 'o:' + id.x + ':nome').fill('Mar das\nBrumas'); await campo(L, 'o:' + id.x + ':nome').blur(); await espera(200);
    const x = await obj(L, id.x);
    ok(x.rot === -20 && x.esp === 0.35 && x.nome === 'Mar das\nBrumas' && await L.F.locator('#mundo svg .c-txt text.texto-livre tspan').count() === 2, 'girar, espaçar e quebrar a linha: ' + j(x));
    await foto('desenho-texto');
  });

  await passo('rios, estradas e trilhas', async () => {
    await ferramenta(L, 'p');
    await chip(L, 'Rio e estrada');
    ok(/Clique para pôr o começo do rio \(a nascente; ele engrossa até o último ponto, a foz\)\./.test(await dica(L)), 'a dica do rio: a nascente e a foz');
    await opcao(L, 'Largura', '3');
    for (const [x, y] of [[150, 150], [400, 260], [520, 520], [800, 640], [1200, 1300]]) await clicar(L, x, y);
    await L.P.keyboard.press('Enter'); await espera(250);
    const ls = await doTipo(L, 'l');
    ok(ls.length === 1 && ls[0].estilo === 'rio' && ls[0].pts.length === 5 && ls[0].larg > 0 && await rotulo(L) === 'novo rio', 'o rio: pontos e Enter: ' + j(ls[0]).slice(0, 160));
    id.rio = ls[0].id;
    ok(await L.F.locator('#mundo svg .c-lin .rio').count() === 1, 'o rio é desenhado como uma faixa (que engrossa até a foz)');
    await escrever(L, 'o:' + id.rio + ':nome', 'Rio Azul');
    ok(await L.F.locator('#mundo svg .c-lin text.nome-linha textPath').textContent() === 'Rio Azul', 'o nome vai ao longo do rio');
    const antes = (await obj(L, id.rio)).pts[0];
    await botao(L, 'o:' + id.rio + ':inverter');
    ok(j((await obj(L, id.rio)).pts.slice(-1)[0]) === j(antes), '"Inverter o sentido" troca a nascente e a foz');
    await ferramenta(L, 'p');
    await opcao(L, 'Linha', 'estrada');
    await clicar(L, 1300, 150); await clicar(L, 1700, 300); await clicar(L, 1900, 700);
    await L.P.keyboard.press('Enter'); await espera(250);
    await ferramenta(L, 'p');
    await opcao(L, 'Linha', 'trilha');
    await clicar(L, 1300, 1200); await clicar(L, 1600, 1000);
    await L.P.keyboard.press('Enter'); await espera(250);
    const tr = await A(L, () => [...document.querySelectorAll('#mundo svg .c-lin .lin-traco')].map(p => p.getAttribute('stroke-dasharray')));
    ok((await doTipo(L, 'l')).map(l => l.estilo).join() === 'rio,estrada,trilha' && tr.length === 2 && /^\d/.test(tr[0]) && /^0\.01 /.test(tr[1]), 'a estrada tracejada e a trilha pontilhada: ' + j(tr));
    const lw = (await doTipo(L, 'l')).map(l => l.larg);
    ok(lw[1] < lw[0] / 2 && lw[2] < lw[1], 'na mesma "Larga", o rio (na foz) é bem mais largo que a estrada, e a estrada que a trilha: ' + j(lw));
    await A(L, () => __mundo.App.selecionar([]));
    await foto('desenho-linhas');
  });

  await passo('a zona de guerra', async () => {
    await aba(L, 'faccoes');
    for (let i = 0; i < 2; i++) { await L.F.locator('#pane [data-k="fac:nova"]').click(); await espera(200); }
    const facs = (await mapa(L)).faccoes;
    ok(facs.length === 2, 'duas facções');
    await aba(L, 'selecao');
    await ferramenta(L, 'f');
    await chip(L, 'Zona de guerra');
    await opcao(L, 'Lado A', facs[0].id);
    await opcao(L, 'Lado B', facs[1].id);
    for (const [x, y] of [[1000, 300], [1500, 300], [1500, 800], [1000, 800]]) await clicar(L, x, y);
    await clicar(L, 1000, 300);
    const zs = await doTipo(L, 'z'), dia = (await mapa(L)).cal.dia;
    ok(zs.length === 1 && zs[0].a === facs[0].id && zs[0].b === facs[1].id && zs[0].ini === dia && zs[0].pts.length === 4 && await rotulo(L) === 'nova zona de guerra', 'a zona: clicar os pontos e fechar no primeiro: ' + j(zs[0]).slice(0, 160));
    id.z = zs[0].id;
    ok(await L.F.locator('#mundo svg .c-zon .zona.zona-pulsa').count() === 1 && await L.F.locator('#mundo svg .c-zon pattern rect').count() === 2, 'a zona aparece em listras nas duas cores e pulsa (está acontecendo)');
    // uma fase: a forma muda a partir de amanhã
    await aba(L, 'hoje');
    ok(/Guerras de hoje/i.test(await L.F.locator('#pane').innerText()) && /Desde 1 de Alvorada/.test(await L.F.locator('#pane').innerText()), 'a aba Hoje mostra as guerras de hoje');
    await botao(L, 'hoje:+1');
    await A(L, i => __mundo.App.selecionar([i]), id.z); await aba(L, 'selecao');
    await botao(L, 'o:' + id.z + ':fase');
    let z = await obj(L, id.z);
    ok(z.fases.length === 1 && z.fases[0].dia === dia + 1 && j(z.fases[0].pts) === j(z.pts) && await rotulo(L) === 'nova fase da zona', 'Mudar a forma a partir de hoje: uma fase nova, com a forma de agora');
    const v = await A(L, () => { const a = document.querySelector('#mundo svg .c-sel [data-alca="v"][data-i="2"]'); const r = a.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await L.P.mouse.move(v[0], v[1]); await L.P.mouse.down(); await L.P.mouse.move(v[0] + 120, v[1] + 60, { steps: 8 }); await L.P.mouse.up(); await espera(250);
    z = await obj(L, id.z);
    ok(z.fases[0].pts[2][0] > 1500 && z.pts[2][0] === 1500, 'arrastar um ponto muda só a forma da fase de hoje (a de antes fica): ' + j([z.pts[2], z.fases[0].pts[2]]));
    await aba(L, 'hoje'); await botao(L, 'hoje:-1'); await aba(L, 'selecao');
    const formaOntem = await A(L, () => document.querySelector('#mundo svg .c-zon .zona').getAttribute('d'));
    ok(/1500 800/.test(formaOntem), 'no dia de antes, a zona volta à forma antiga: ' + formaOntem);
    await campo(L, 'o:' + id.z + ':semfim').uncheck(); await espera(150);
    await escrever(L, 'o:' + id.z + ':dura', '1');
    await aba(L, 'hoje'); await botao(L, 'hoje:+1'); await botao(L, 'hoje:+1'); await aba(L, 'selecao');
    await A(L, i => __mundo.App.selecionar([i]), id.z); await espera(150);
    ok(await L.F.locator('#mundo svg .c-zon .zon.inativa').count() === 1 && /terminou/.test(await L.F.locator('#pane').innerText()), 'depois do fim, a zona fica apagada para o mestre e diz que terminou');
    await aba(L, 'hoje'); await botao(L, 'hoje:-1'); await botao(L, 'hoje:-1'); await aba(L, 'selecao');
    await A(L, () => __mundo.App.selecionar([]));
    await foto('desenho-zona');
  });

  await passo('ver como jogador', async () => {
    await L.F.click('#comoJog'); await espera(300);
    const v = await A(L, () => { const m = __mundo.App.vista(); return { kinds: m.objs.map(o => o.k).sort().join(), z: m.objs.find(o => o.k === 'z'), pint: m.pintura.ops.length }; });
    ok(v.pint === 2 && v.z && v.z.fases.length === 0 && v.z.fim === null && /c/.test(v.kinds) && /x/.test(v.kinds) && /l/.test(v.kinds), 'como jogador: o desenho, os carimbos, o texto, as linhas e a zona de hoje (sem as fases nem o fim): ' + v.kinds);
    await foto('desenho-jogador');
    await L.F.click('#comoJog'); await espera(300);
  });

  await passo('tela estreita', async () => {
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(300);
    await ferramenta(L, 'p');
    const cabe = await A(L, () => document.documentElement.scrollWidth <= innerWidth);
    ok(cabe && await L.F.locator('#opts .chip', { hasText: 'Carimbo' }).first().isVisible(), 'na tela estreita as opções da ferramenta Desenho cabem');
    await foto('desenho-400');
  });

  if (t.errs.length) console.log('ERROS NO CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro no console (' + t.errs.length + ')');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
