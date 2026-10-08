// Mapa-múndi: a grade de hexágonos, o terreno e a viagem em cubos, pela interface (a página sozinha, no navegador).
// A grade pela régua e pelos campos (tamanho, orientação, setas, mostrar, linhas), os tipos de terreno (nome, custo,
// novo, tirar), o pincel de terreno (terreno, tamanho, custo próprio, sem terreno), a régua em hexágonos e cubos, o
// custo de uma região e o grupo que anda de hexágono em hexágono e passa o dia.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

const ate = async (fn, ms = 6000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* recarregando */ } if (Date.now() - t0 > ms) return false; await espera(100); } };
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
async function naTela(a, x, y) {
  const [px, py] = await A(a, ([x, y]) => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(); return [r.left + x * r.width / m.larg, r.top + y * r.height / m.alt]; }, [x, y]);
  return [px, py];
}
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function clicar(a, x, y) { await semAvisos(a); const [px, py] = await naTela(a, x, y); await a.P.mouse.click(px, py); await a.F.waitForTimeout(160); }
async function arrastar(a, de, para) {
  await semAvisos(a);
  const [x0, y0] = await naTela(a, de[0], de[1]), [x1, y1] = await naTela(a, para[0], para[1]);
  await a.P.mouse.move(x0, y0); await a.P.mouse.down(); await a.P.mouse.move(x1, y1, { steps: 12 }); await a.P.mouse.up(); await a.F.waitForTimeout(220);
}
async function pairar(a, x, y) { const [px, py] = await naTela(a, x, y); await a.P.mouse.move(px, py, { steps: 3 }); await a.F.waitForTimeout(120); }
async function ferramenta(a, f) { await a.F.click(`#rail .tool[data-f="${f}"]`); await a.F.waitForTimeout(120); }
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function alternar(a, k) { await campo(a, k).click(); await a.F.waitForTimeout(160); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(160); }
async function botao(a, k) { await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(200); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function pincel(a, valor) { await a.F.selectOption('#opts select[aria-label="O que o pincel faz"]', valor); await a.F.waitForTimeout(120); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const sel = a => A(a, () => __mundo.App.sel[0] || null);
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const dica = a => a.F.locator('#dica').innerText();
// o hexágono de um ponto do mapa, e o que está guardado nele
const hexDe = (a, x, y) => A(a, ([x, y]) => __mundo.N.chaveHex(__mundo.N.hexDe(__mundo.App.mapa, x, y)), [x, y]);
const noHex = async (a, x, y) => A(a, k => (__mundo.App.mapa.hexes || {})[k], await hexDe(a, x, y));

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'terreno', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const id = {};

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Hexes'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    const m = await mapa(L);
    ok(!!m && m.grade.tam === 0 && m.terrenos.length === 8 && j(m.hexes) === '{}', 'um mapa novo: sem grade, com os oito terrenos de começo, nenhum hexágono pintado');
    ok(await L.F.locator('#tab-terreno').isVisible() && (await L.F.locator('#tabs .tab:not([hidden])').allInnerTexts()).join('|').replace(/\s+/g, '') === 'Seleção|Hoje|Facções|Terreno|Mapa', 'o painel ganha a aba Terreno, entre Facções e Mapa');
  });

  await passo('sem grade', async () => {
    await aba(L, 'terreno');
    ok(/Sem grade, o mapa não tem escala/.test(await L.F.locator('#pane').innerText()) && await campo(L, 'ter:pincel').isDisabled(), 'sem grade: a aba diz que não há escala, e o pincel espera a grade');
    await aba(L, 'selecao');
    await ferramenta(L, 'h');
    ok(await L.F.locator('#opts').innerText().then(x => /Definir a grade de hexágonos/.test(x)), 'a ferramenta Terreno sem grade oferece definir a grade');
    await clicar(L, 500, 500);
    ok(/Defina a grade de hexágonos primeiro/.test(await textoDoAviso(L)) && await L.F.locator('#tab-terreno').getAttribute('aria-selected') === 'true' && j((await mapa(L)).hexes) === '{}', 'e o clique no mapa avisa e abre a aba Terreno, sem pintar nada');
  });

  await passo('a grade pela régua', async () => {
    await botao(L, 'ter:medir');
    ok(await A(L, () => __mundo.App.ferramenta) === 'd' && /alguns hexágonos da imagem/.test(await textoDoAviso(L)), 'medir com a régua: a ferramenta Régua liga, e o aviso diz o que fazer');
    await arrastar(L, [100, 100], [300, 100]);
    const d = L.F.locator('dialog.mundo-dl[open]');
    await d.waitFor();
    ok(/A linha mede 200 unidades do mapa\. Um hexágono tem 5 cubos\./.test(await d.innerText()), 'a janela pergunta quanto tem a linha: ' + (await d.innerText()).replace(/\s+/g, ' ').slice(0, 120));
    // em cubos: 40 cubos em 200 unidades = 8 hexágonos de 25
    await d.locator('#dl-n').fill('40');
    await d.locator('#dl-u').selectOption('cubos');
    await d.locator('button[type="submit"]').click(); await espera(300);
    ok((await mapa(L)).grade.tam === 25 && /Grade definida: cada hexágono tem 25 unidades do mapa \(5 cubos\)\./.test(await textoDoAviso(L)), 'a linha em cubos: 40 cubos em 200 unidades são 8 hexágonos de 25: ' + j((await mapa(L)).grade));
    // de novo, em hexágonos
    await botao(L, 'ter:medir');
    await arrastar(L, [100, 100], [300, 100]);
    await d.waitFor();
    await d.locator('#dl-n').fill('4');
    await d.locator('button[type="submit"]').click(); await espera(300);
    const g = (await mapa(L)).grade;
    ok(g.tam === 50 && g.on === false && await rotulo(L) === 'definir a grade', 'quatro hexágonos em 200 unidades: cada hexágono tem 50 (= 5 cubos): ' + j(g));
    ok(/Grade definida: cada hexágono tem 50 unidades do mapa \(5 cubos\)\. Para ver a grade, marque "Mostrar a grade"\./.test(await textoDoAviso(L)), 'o aviso diz a grade e lembra de mostrar');
    ok(/O mapa tem cerca de 40 × 28 hexágonos \(200 × 140 cubos\)\./.test(await L.F.locator('#pane').innerText()), 'a aba diz o tamanho do mapa em hexágonos e cubos');
    ok(await A(L, () => __mundo.App.ferramenta) === 'h' && await A(L, () => getComputedStyle(document.querySelector('#mundo svg .c-hex')).display !== 'none'), 'de volta à ferramenta Terreno, o mestre vê a grade mesmo escondida');
    await ferramenta(L, 'sel');
    ok(await A(L, () => getComputedStyle(document.querySelector('#mundo svg .c-hex')).display === 'none'), 'fora dela, a grade escondida não aparece no mapa (mas já mede)');
  });

  await passo('a grade pelos campos', async () => {
    await alternar(L, 'ter:on');
    const pad = () => A(L, () => { const p = document.querySelector('#mundoGradeHex'); return ['x', 'y', 'width', 'height'].map(k => Number(p.getAttribute(k))); });
    ok((await mapa(L)).grade.on === true && await A(L, () => getComputedStyle(document.querySelector('#mundo svg .c-hex')).display !== 'none'), 'mostrar a grade: ela aparece no mapa');
    let p = await pad();
    ok(Math.abs(p[2] - 50) < 1e-6 && Math.abs(p[3] - 3 * 50 / Math.sqrt(3)) < 1e-3 && Math.abs(p[1] + 50 / Math.sqrt(3)) < 1e-3, 'hexágonos em pé: o ladrilho do desenho tem 50 de largura e 3 raios de altura: ' + j(p));
    await escolher(L, 'ter:orient', 'deitado');
    p = await pad();
    ok((await mapa(L)).grade.orient === 'deitado' && Math.abs(p[3] - 50) < 1e-6 && Math.abs(p[2] - 3 * 50 / Math.sqrt(3)) < 1e-3, 'deitados: o ladrilho vira (x e y trocados): ' + j(p));
    await escolher(L, 'ter:orient', 'pe');
    await botao(L, 'ter:baixo'); await botao(L, 'ter:dir'); await botao(L, 'ter:dir');
    let g = (await mapa(L)).grade;
    ok(g.x === 10 && g.y === 5 && /cada toque: 5 unidades/.test(await L.F.locator('#pane').innerText()) && await rotulo(L) === 'deslocar a grade', 'as setas encaixam a grade, um décimo de hexágono por toque: ' + j({ x: g.x, y: g.y }));
    await botao(L, 'ter:esq'); await botao(L, 'ter:esq'); await botao(L, 'ter:cima');
    await escolher(L, 'ter:alfa', '0.6');
    g = (await mapa(L)).grade;
    ok(g.x === 0 && g.y === 0 && g.alfa === 0.6 && await A(L, () => document.querySelector('#mundo svg rect.grade').style.opacity) === '0.6', 'as linhas da grade mais fortes: ' + j(g));
    await foto('terreno-grade');
  });

  await passo('os tipos de terreno', async () => {
    ok(await L.F.locator('#pane .ter-linha').count() === 8, 'oito tipos de terreno na lista');
    await escrever(L, 'ter:fl:nome', 'Mata Fechada');
    await escrever(L, 'ter:mo:custo', '20');
    let m = await mapa(L);
    ok(m.terrenos.find(x => x.id === 'fl').nome === 'Mata Fechada' && m.terrenos.find(x => x.id === 'mo').custo === 20 && await rotulo(L) === 'mudar o custo de Montanha', 'nome e custo de um tipo pelo painel (um passo de desfazer cada)');
    await escrever(L, 'ter:mo:custo', '0');
    ok((await mapa(L)).terrenos.find(x => x.id === 'mo').custo === 20 && /Use um custo de 0,1 a 9999 cubos/.test(await textoDoAviso(L)), 'custo zero não entra (o aviso explica)');
    await botao(L, 'ter:novo');
    m = await mapa(L);
    ok(m.terrenos.length === 9 && m.terrenos[8].id === 't1' && m.terrenos[8].nome === 'Terreno 1' && m.terrenos[8].custo === 5 && await A(L, () => document.activeElement && document.activeElement.dataset.k === 'ter:t1:nome'), 'um tipo novo, com o cursor no nome');
    await escrever(L, 'ter:t1:nome', 'Lava');
    await L.F.click('#pane [data-k="ter:ne:x"]'); await espera(200);
    ok(!(await mapa(L)).terrenos.some(x => x.id === 'ne') && /Neve saiu da lista\./.test(await textoDoAviso(L)), 'tirar um tipo (Neve) avisa, com desfazer');
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(200);
    ok((await mapa(L)).terrenos.some(x => x.id === 'ne'), 'e o Desfazer devolve');
  });

  await passo('o pincel de terreno', async () => {
    await botao(L, 'ter:pincel');
    ok(await A(L, () => __mundo.App.ferramenta) === 'h' && await L.F.locator('#rail .tool[data-f="h"]').getAttribute('aria-pressed') === 'true', 'o botão da aba liga a ferramenta Terreno (H)');
    ok(await L.F.locator('#opts select[aria-label="O que o pincel faz"] option').count() === 12, 'o pincel oferece os 9 terrenos, "Sem terreno", "Custo próprio" e "Tirar o custo próprio"');
    await pairar(L, 125, 325);
    ok(/Arraste sobre os hexágonos para pintar: Mata Fechada\. Aqui: sem terreno · 5 cubos \(sem terreno\)\./.test(await dica(L)), 'a dica diz o que o pincel pinta e o que há embaixo do cursor: ' + await dica(L));
    ok(await L.F.locator('#mundo svg .pincel-hex').count() === 1, 'o hexágono embaixo do cursor aparece contornado');
    await arrastar(L, [100, 325], [400, 325]);
    let m = await mapa(L);
    const pintados = Object.entries(m.hexes);
    ok(pintados.length >= 6 && pintados.every(([, v]) => v === 'fl') && await rotulo(L) === 'pintar o terreno', 'arrastar pinta os hexágonos do caminho de Mata Fechada (um passo de desfazer): ' + pintados.length);
    ok(await L.F.locator('#mundo svg .hex-ter[data-ter="fl"]').count() === 1 && await A(L, () => document.querySelector('#mundo svg .c-tra').childElementCount) === 0, 'a tinta do terreno aparece; a prévia do traço some ao soltar');
    await pincel(L, 'ter:mo');
    await L.F.selectOption('#opts select[aria-label="Tamanho"]', '1'); await espera(100);
    await clicar(L, 1000, 700);
    m = await mapa(L);
    const mont = Object.values(m.hexes).filter(v => v === 'mo').length;
    ok(mont === 7, 'o pincel de 7 hexágonos: o do meio e os seis vizinhos de Montanha: ' + mont);
    await L.F.selectOption('#opts select[aria-label="Tamanho"]', '0'); await espera(100);
    await pairar(L, 1000, 700);
    ok(/Aqui: Montanha · 20 cubos\./.test(await dica(L)), 'a dica com o custo do terreno: ' + await dica(L));
    // o custo próprio de um hexágono
    await pincel(L, 'custo');
    await L.F.fill('#opts input[aria-label="Custo próprio, em cubos por hexágono"]', '25'); await L.F.press('#opts input[aria-label="Custo próprio, em cubos por hexágono"]', 'Enter'); await espera(120);
    await clicar(L, 1000, 700);
    ok(j(await noHex(L, 1000, 700)) === j(['mo', 25]) && await rotulo(L) === 'dar custo próprio aos hexágonos', 'custo próprio: o hexágono continua Montanha, mas custa 25');
    ok(await L.F.locator('#mundo svg .hex-custo text').allTextContents().then(x => x.join()) === '25', 'enquanto pinta, o mestre vê o custo próprio no hexágono');
    await pairar(L, 1000, 700);
    ok(/Aqui: Montanha · 25 cubos \(custo próprio\)\./.test(await dica(L)), 'a dica diz que o custo é próprio: ' + await dica(L));
    await pincel(L, 'ter:co');
    await clicar(L, 1000, 700);
    ok(j(await noHex(L, 1000, 700)) === j(['co', 25]), 'pintar outro terreno por cima: o custo próprio fica: ' + j(await noHex(L, 1000, 700)));
    await pincel(L, 'semcusto');
    await clicar(L, 1000, 700);
    ok(await noHex(L, 1000, 700) === 'co' && await rotulo(L) === 'tirar o custo próprio', 'tirar o custo próprio: volta o do terreno');
    await pincel(L, 'nada');
    await clicar(L, 1000, 700);
    ok(await noHex(L, 1000, 700) === undefined && Object.values((await mapa(L)).hexes).filter(v => v === 'mo').length === 6, 'sem terreno: o hexágono sai');
    await pincel(L, 'ter:fl');
    await foto('terreno-pincel');
  });

  await passo('a régua em hexágonos', async () => {
    await ferramenta(L, 'd');
    await arrastar(L, [100, 325], [400, 325]);
    const [esperado, texto] = await Promise.all([
      A(L, () => { const r = __mundo.N.medirHex(__mundo.App.mapa, [100, 325], [400, 325]); return [r.hexes, r.cubos, r.terreno]; }),
      L.F.locator('#mundo svg .regua-txt').textContent()]);
    ok(esperado[0] === 6 && esperado[1] === 30 && esperado[2] === 60 && texto === '6 hexágonos · 30 cubos · pelo terreno: 60 cubos', 'a régua: hexágonos em linha reta, cubos e quanto dá pelo terreno: ' + texto);
    ok(await L.F.locator('#mundo svg .regua-hex').count() === 1 && /pelo terreno: 60 cubos\. Nada é gravado\./.test(await dica(L)), 'os hexágonos da régua aparecem contornados; a dica repete a medida');
    await foto('terreno-regua');
    await L.P.keyboard.press('Escape'); await espera(100);
  });

  await passo('o custo de uma região', async () => {
    await ferramenta(L, 'r');
    for (const [x, y] of [[1300, 300], [1600, 300], [1600, 600], [1300, 600], [1300, 300]]) await clicar(L, x, y);
    id.reg = await sel(L);
    await escrever(L, `o:${id.reg}:custo`, '12');
    const info = await A(L, () => { const N = __mundo.N, m = __mundo.App.mapa, h = N.hexDe(m, 1450, 450), i = N.hexInfo(m, h.q, h.r); return [i.custo, i.de]; });
    ok((await obj(L, id.reg)).custo === 12 && j(info) === j([12, 'regiao']) && await rotulo(L) === 'mudar o custo da região', 'a região com custo: cada hexágono dentro dela custa 12');
    await escrever(L, `o:${id.reg}:custo`, '');
    ok((await obj(L, id.reg)).custo === null, 'apagar o campo volta ao custo do terreno');
    await escrever(L, `o:${id.reg}:custo`, '12');
  });

  await passo('a viagem de hexágono em hexágono', async () => {
    await ferramenta(L, 't');
    await clicar(L, 100, 325); await clicar(L, 1450, 325);
    await L.F.locator('#opts .chip', { hasText: 'Terminar' }).click(); await espera(250);
    id.rota = await sel(L);
    ok(/hexágonos · \d+ cubos pelo terreno, de ponta a ponta/.test(await L.F.locator('#pane').innerText()), 'a rota diz quantos hexágonos tem e quanto custa pelo terreno');
    await ferramenta(L, 'g');
    await clicar(L, 100, 325);
    id.g = await sel(L);
    await escrever(L, `o:${id.g}:cubos`, '20');
    await escolher(L, `o:${id.g}:rota`, id.rota);
    const g = await obj(L, id.g);
    ok(g.cubos === 20 && g.rota === id.rota && /^0 de \d+ cubos · hexágono 0 de \d+ · faltam cerca de [\d,]+ dias$/.test((await L.F.locator('#pane .progresso small').innerText()).trim()), 'o grupo anda 20 cubos por dia, na rota: ' + await L.F.locator('#pane .progresso small').innerText());
    const dia0 = (await mapa(L)).cal.dia;
    await botao(L, 'o:andar');
    const g1 = await obj(L, id.g);
    ok(g1.prog === 20 && (await mapa(L)).cal.dia === dia0 + 1 && await rotulo(L) === 'andar 1 dia', 'Andar 1 dia: 20 cubos de mata (10 cada): dois hexágonos, e o dia passa');
    ok(/^Andou 2 hexágonos \(20 cubos\); faltam \d+ hexágonos \(\d+ cubos\)\. Passou o dia: hoje é 2 de Alvorada, ano 1\./.test(await textoDoAviso(L)), 'o aviso: ' + await textoDoAviso(L));
    const centro = await A(L, ([x, y]) => { const N = __mundo.N, m = __mundo.App.mapa, h = N.hexDe(m, x, y); return N.centroHex(m, h.q, h.r); }, [g1.x, g1.y]);
    ok(Math.abs(centro.x - g1.x) < 0.02 && Math.abs(centro.y - g1.y) < 0.02, 'o grupo fica no centro de um hexágono');
    await L.F.locator('#toasts .toast button', { hasText: 'Desfazer' }).last().click(); await espera(200);
    ok((await obj(L, id.g)).prog === 0 && (await mapa(L)).cal.dia === dia0, 'o Desfazer devolve o grupo e o dia, juntos');
    // dois grupos viajando: andam juntos, num dia só
    await ferramenta(L, 'g'); await clicar(L, 100, 325);
    id.g2 = await sel(L);
    await escolher(L, `o:${id.g2}:rota`, id.rota);
    await aba(L, 'hoje');
    ok(await campo(L, 'gr-andar-todos').isVisible() && /"Andar 1 dia com todos" leva todos no mesmo dia/.test(await L.F.locator('#pane').innerText()), 'com dois grupos viajando, a aba Hoje oferece "Andar 1 dia com todos"');
    const d1 = (await mapa(L)).cal.dia;
    await botao(L, 'gr-andar-todos');
    const a1 = await obj(L, id.g), a2 = await obj(L, id.g2);
    ok(a1.prog === 20 && a2.prog === 30 && (await mapa(L)).cal.dia === d1 + 1 && await rotulo(L) === 'andar 1 dia com todos' && /2 grupos andaram\. Passou o dia/.test(await textoDoAviso(L)),
      'os dois andam (20 e 30 cubos, cada um o seu) e o dia passa uma vez só: ' + j([a1.prog, a2.prog]));
    await aba(L, 'selecao');
    await foto('terreno-viagem');
  });

  await passo('tela estreita', async () => {
    await A(L, () => __mundo.App.selecionar([]));
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(300);
    if (await L.F.locator('#side.fechado').count()) { await L.F.click('#btPainel'); await espera(250); }
    await aba(L, 'terreno');
    const cabe = await A(L, () => { const p = document.getElementById('pane'); return p.scrollWidth <= p.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth; });
    ok(cabe && await L.F.locator('#pane .ter-linha').first().isVisible(), 'na tela estreita a aba Terreno cabe, sem rolar para os lados');
    await foto('terreno-400');
  });

  if (t.errs.length) console.log('ERROS NO CONSOLE:\n' + t.errs.join('\n'));
  ok(t.errs.length === 0, 'nenhum erro no console (' + t.errs.length + ')');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
