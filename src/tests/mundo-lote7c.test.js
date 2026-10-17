// Mapa-múndi, lote 7 (parte 5b), pela interface (a página sozinha, no navegador): as caravanas, as patrulhas, os
// exércitos e os eventos que andam.
//   · a ferramenta Grupo com o tipo (a caravana nasce escondida dos jogadores, com o desenho dela no token); o painel
//     do grupo do mundo ("Os jogadores veem" no lugar do "Esconder dos jogadores");
//   · "Traçar entre dois marcadores": a prévia fina no mapa, nada muda até "Usar esta rota"; a rota nasce escondida (não
//     aparece no mapa; fina, com a caravana selecionada) e a caravana vai para o começo dela;
//   · "Ao chegar ao fim" (ida e volta) e o "Próximo dia" levando a caravana até o fim, com o aviso do encontro com Os
//     Heróis (no tempo certo); no tempo seguinte, ela vira ("Voltando pelo mesmo caminho");
//   · as paradas: marcar no mapa (o clique pedido pelo painel), as bandeirinhas, quanto tempo fica, parar nela e seguir;
//   · "Desenhar a rota" de uma patrulha (a ferramenta Rota; a rota vai para ela);
//   · o evento que anda (a migração pela rota), a aba Hoje ("Pelo mapa") e Desfazer;
//   · quem joga: sem os escondidos, sem a rota escondida; mostrada, a caravana chega sem a rota, o jeito de andar e as paradas.
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
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(220); }
async function marcar(a, k) { await campo(a, k).click(); await a.F.waitForTimeout(220); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(250); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function naTela(a, x, y) { const [px, py] = await A(a, ([x, y]) => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(); return [r.left + x * r.width / m.larg, r.top + y * r.height / m.alt]; }, [x, y]); return [px, py]; }
async function clicar(a, x, y) { const [px, py] = await naTela(a, x, y); await a.P.mouse.click(px, py); await a.F.waitForTimeout(250); }
async function ferramenta(a, f) { await a.F.click(`#rail .tool[data-f="${f}"]`); await a.F.waitForTimeout(150); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const sel = a => A(a, () => __mundo.App.sel[0] || null);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const desfazer = async a => { await A(a, () => __mundo.App.desfazer()); await espera(250); };
const painel = a => A(a, () => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
const Y = 346.41;          // a fileira de hexágonos r = 10 (em pé, de 40 unidades): x = 200, 240, … 1000

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote7c', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa e a grade', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    await A(L, Y => __mundo.App.mudar('preparar', m => {
      const N = __mundo.N;
      m.objs.push(Object.assign(N.objNovo('m', { x: 200, y: Y, ic: 'cidade' }), { id: 'mA', nome: 'Vel' }));
      m.objs.push(Object.assign(N.objNovo('m', { x: 1000, y: Y, ic: 'vila' }), { id: 'mB', nome: 'Porto Sal' }));
      // Os Heróis na fileira de baixo, do lado do hexágono de x = 600 (e do de 640)
      m.objs.push(Object.assign(N.objNovo('g', { x: 620, y: Y + 34.64, sigla: 'HER' }), { id: 'her', nome: 'Os Heróis' }));
    }), Y);
    ok((await mapa(L)).grade.tam === 40, '(a grade de 40 unidades, os dois marcadores e Os Heróis)');
  });

  let car = null;
  await passo('a caravana nova', async () => {
    await ferramenta(L, 'g');
    const tipos = await A(L, () => [...document.querySelectorAll('#opts select[aria-label="Tipo"] option')].map(o => o.value + ':' + o.textContent));
    ok(j(tipos) === j([':Grupo', 'caravana:Caravana', 'patrulha:Patrulha', 'exercito:Exército']), 'a ferramenta Grupo com o tipo: ' + j(tipos));
    await L.F.selectOption('#opts select[aria-label="Tipo"]', 'caravana'); await espera(120);
    ok(/pôr a caravana \(nasce escondida dos jogadores\)/.test(await L.F.locator('#dica').innerText()), 'a dica diz que ela nasce escondida');
    await clicar(L, 300, Y + 200);
    car = await sel(L);
    const o = await obj(L, car);
    ok(o && o.tipo === 'caravana' && o.oculto === true && o.sigla === 'CAR' && o.pt === 2 && await rotulo(L) === 'nova caravana', 'a caravana nasce escondida, com a sigla, a cor e o passo dela: ' + j(o && [o.tipo, o.oculto, o.sigla, o.pt]));
    const tok = await A(L, id => { const g = document.querySelector(`#mundo .gru[data-id="${id}"]`); return g ? { mundo: g.classList.contains('gru-mundo'), glifo: !!g.querySelector('.gru-glifo'), sigla: !!g.querySelector('.sigla') } : null; }, car);
    ok(tok && tok.mundo && tok.glifo && !tok.sigla, 'no mapa, o desenho da caravana no lugar da sigla: ' + j(tok));
    await aba(L, 'selecao');
    ok(await campo(L, `o:${car}:ver`).count() === 1 && !(await campo(L, `o:${car}:ver`).isChecked()) && await campo(L, `o:${car}:oculto`).count() === 0, '"Os jogadores veem" (desmarcado) no lugar do "Esconder dos jogadores"');
    await escrever(L, `o:${car}:nome`, 'Caravana de Sal');
    await escrever(L, `o:${car}:pt`, '10');
    ok((await obj(L, car)).pt === 10, '(a caravana anda 10 cubos por tempo: 2 hexágonos)');
  });

  await passo('traçar a rota entre dois marcadores', async () => {
    await botao(L, `o:${car}:tracar`);
    ok(await campo(L, 'tr:de').count() === 1 && await campo(L, 'tr:ver').isDisabled(), 'o "Traçar": De e Para (sem os dois, nada a ver)');
    await escolher(L, 'tr:de', 'mA'); await escolher(L, 'tr:para', 'mB');
    const antes = (await mapa(L)).objs.length;
    await botao(L, 'tr:ver');
    const txt = await painel(L);
    const prev = await A(L, () => document.querySelectorAll('#mundo .sel-rota.previa').length);
    ok(/O caminho: 20 hexágonos \(100 cubos\), cerca de 10 tempos\. Ele aparece no mapa, fino e verde\./.test(txt) && prev === 1 && (await mapa(L)).objs.length === antes, 'a prévia: o caminho e quanto leva, fino no mapa — nada muda: ' + (txt.match(/O caminho:[^.]*\.[^.]*\./) || [''])[0]);
    await foto('lote7c-tracar');
    await botao(L, 'tr:usar');
    const m = await mapa(L), o = m.objs.find(x => x.id === car), rt = m.objs.find(x => x.id === o.rota);
    ok(rt && rt.esc === true && rt.oculto === true && rt.nome === 'De Vel a Porto Sal' && o.x === 200 && Math.abs(o.y - Y) < 0.1 && o.prog === 0 && await rotulo(L) === 'traçar a rota de "Caravana de Sal"', 'usada: a rota nasce escondida, com o nome, e a caravana vai para Vel: ' + j([rt && rt.nome, o.x, o.y]));
    const desenho = await A(L, id => { const g = document.querySelector(`#mundo .rota[data-id="${id}"]`); return { esc: !!g && g.classList.contains('rota-esc'), paths: g ? g.querySelectorAll('path').length : -1, fina: document.querySelectorAll('#mundo .sel-rota:not(.previa)').length, previa: document.querySelectorAll('#mundo .sel-rota.previa').length }; }, rt.id);
    ok(desenho.esc && desenho.paths === 0 && desenho.fina === 1 && desenho.previa === 0, 'a rota escondida não aparece no mapa; fina, com a caravana selecionada: ' + j(desenho));
  });

  await passo('ida e volta, o Próximo dia e o encontro', async () => {
    await escolher(L, `o:${car}:modo`, 'volta');
    ok((await obj(L, car)).modo === 'volta' && await rotulo(L) === 'mudar o que faz no fim da rota', '"Ao chegar ao fim": volta pelo mesmo caminho');
    await semAvisos(L); await L.F.click('#diaMais'); await espera(400);
    const av = await textoDoAviso(L), o = await obj(L, car);
    ok(o.x === 1000 && /Caravana de Sal encontrou Os Heróis \(no 5º tempo\)\./.test(av), 'o Próximo dia leva a caravana até o fim, e o aviso diz quem encontrou quem, e quando: ' + av);
    ok(/2 grupos andaram|1 grupo andou: Caravana de Sal/.test(av), '(e quantos andaram)');
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(300);
    const o2 = await obj(L, car);
    await A(L, id => __mundo.App.selecionar([id]), car); await espera(250);
    ok(o2.x === 920 && o2.sentido === -1 && /Voltando pelo mesmo caminho\./.test(await painel(L)), 'no tempo seguinte, vira e volta: ' + j([o2.x, o2.sentido]));
    await desfazer(L);
    ok((await obj(L, car)).x === 1000 && !('sentido' in (await obj(L, car))), 'Desfazer volta o tempo e a caravana');
  });

  await passo('as paradas', async () => {
    await A(L, id => __mundo.App.selecionar([id]), car); await espera(200);
    await aba(L, 'selecao');
    await botao(L, `o:${car}:parada`);
    ok(/Clique na rota, onde fica a parada\. Esc cancela\./.test(await L.F.locator('#dica').innerText()), 'marcar a parada: a dica pede o clique');
    await clicar(L, 610, Y + 4);       // perto do hexágono de x = 600, na rota
    let o = await obj(L, car);
    ok(j(o.paradas) === j([{ x: 600, y: 346.41, n: 1, u: 'd' }]) && await rotulo(L) === 'marcar uma parada' && await sel(L) === car, 'a parada no hexágono da rota (1 dia, de começo): ' + j(o.paradas));
    ok(await A(L, () => document.querySelectorAll('#mundo .parada').length) === 1, 'a bandeirinha da parada, com a caravana selecionada');
    await clicar(L, 610, Y + 4);
    ok((await obj(L, car)).paradas.length === 1, '(o clique de depois é um clique comum: nada de outra parada)');
    await A(L, id => __mundo.App.selecionar([id]), car); await espera(200);
    await escrever(L, `o:${car}:par0:n`, '2'); await escolher(L, `o:${car}:par0:u`, 't');
    await escrever(L, `o:${car}:par0:nome`, 'Feira de Vel');
    o = await obj(L, car);
    ok(j(o.paradas[0]) === j({ x: 600, y: 346.41, n: 2, u: 't', nome: 'Feira de Vel' }), 'quanto tempo fica (2 tempos) e o nome');
    // a caravana no fim, indo e voltando: 2 hexágonos por tempo — 920, 840, 760, 680, e entra na parada (600)
    for (let k = 0; k < 6; k++) { await semAvisos(L); await L.F.click('#tempoMais'); await espera(250); }
    o = await obj(L, car);
    await A(L, id => __mundo.App.selecionar([id]), car); await espera(200);
    ok(o.x === 600 && o.espera === 1 && /Parado em "Feira de Vel": falta 1 tempo\./.test(await painel(L)), 'para na parada e espera (o painel diz quanto falta): ' + j([o.x, o.espera]));
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(250);
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(250);
    o = await obj(L, car);
    ok(o.x === 520 && !('espera' in o), 'acabada a espera, segue: ' + o.x);
    await foto('lote7c-paradas');
    await A(L, id => __mundo.App.selecionar([id]), car); await espera(200);
    await botao(L, `o:${car}:par0:tirar`);
    ok(!('paradas' in (await obj(L, car))) && await rotulo(L) === 'tirar a parada', 'tirar a parada');
  });

  let pat = null;
  await passo('desenhar a rota de uma patrulha', async () => {
    await ferramenta(L, 'g');
    await L.F.selectOption('#opts select[aria-label="Tipo"]', 'patrulha'); await espera(120);
    await clicar(L, 330, Y + 160);
    pat = await sel(L);
    await aba(L, 'selecao');
    await botao(L, `o:${pat}:desenhar`);
    ok(await A(L, () => __mundo.App.ferramenta) === 't' && /A rota de "Patrulha": clique onde ela começa \(o grupo vai para lá\)/.test(await L.F.locator('#dica').innerText()), '"Desenhar a rota": a ferramenta Rota, com a dica');
    await clicar(L, 280, Y + 173.2); await clicar(L, 760, Y + 173.2);
    await L.P.keyboard.press('Enter'); await espera(300);
    const m = await mapa(L), o = m.objs.find(x => x.id === pat), rt = o && m.objs.find(x => x.id === o.rota);
    ok(rt && rt.esc && rt.oculto && rt.nome === 'Rota de Patrulha' && Math.abs(o.x - rt.pts[0][0]) < 0.01 && await rotulo(L) === 'desenhar a rota de "Patrulha"' && await sel(L) === pat && await A(L, () => __mundo.App.ferramenta) === 'sel',
      'a rota desenhada é da patrulha (escondida), e ela vai para o começo: ' + j(rt && [rt.nome, rt.pts.length]));
  });

  await passo('o evento que anda', async () => {
    const rota = (await obj(L, pat)).rota, rt = await obj(L, rota);
    await A(L, ([x, y]) => __mundo.App.mudar('a migração', m => { m.objs.push(Object.assign(__mundo.N.objNovo('e', { x, y, tipo: 'migracao', r: 50, ini: m.cal.dia, peso: __mundo.N.pesoPadrao('migracao') }), { id: 'mg' })); }), rt.pts[0]);
    await A(L, () => __mundo.App.selecionar(['mg'])); await espera(250);
    await aba(L, 'selecao');
    ok(/Anda pelo mapa/i.test(await painel(L)) && await campo(L, 'o:mg:erota').count() === 1, 'o evento tem "Anda pelo mapa"');
    await escolher(L, 'o:mg:erota', rota);
    await escrever(L, 'o:mg:ept', '10');
    const e0 = await obj(L, 'mg');
    await semAvisos(L); await L.F.click('#tempoMais'); await espera(300);
    const e1 = await obj(L, 'mg');
    const anda = await A(L, ([a, b]) => { const N = __mundo.N, m = __mundo.App.mapa; return N.distHex(N.hexDe(m, a.x, a.y), N.hexDe(m, b.x, b.y)); }, [e0, e1]);
    ok(e0.rota === rota && e0.pt === 10 && anda === 2 && e1.prog === 10, 'com a rota, a migração anda junto com o tempo do mapa (2 hexágonos): ' + j([e0.x, e1.x, anda]));
  });

  await passo('a aba Hoje', async () => {
    await aba(L, 'hoje');
    const pm = await A(L, () => { const s = [...document.querySelectorAll('#pane .sec')].find(x => /Pelo mapa/i.test(x.querySelector('b').innerText)); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
    const gr = await A(L, () => { const s = [...document.querySelectorAll('#pane .sec')].find(x => /Onde está o grupo|Grupos/i.test(x.querySelector('b').innerText)); return s ? s.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Caravana de Sal/.test(pm) && /Patrulha/.test(pm) && /escondida dos jogadores/.test(pm) && /Os Heróis/.test(gr) && !/Caravana de Sal/.test(gr), '"Pelo mapa" com a caravana e a patrulha; os grupos comuns em "Grupos": ' + pm);
  });

  await passo('quem joga', async () => {
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(400);
    let v = await A(L, () => __mundo.App.vista().objs.map(o => o.id));
    const rotas = await A(L, () => __mundo.App.mapa.objs.filter(o => o.k === 't').map(o => o.id));
    ok(!v.includes(car) && !v.includes(pat) && !rotas.some(r => v.includes(r)) && v.includes('her'), 'quem joga não vê os escondidos nem as rotas escondidas');
    await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300);
    await A(L, id => __mundo.App.selecionar([id]), car); await espera(250);
    await aba(L, 'selecao');
    await marcar(L, `o:${car}:ver`);
    ok((await obj(L, car)).oculto === false && await rotulo(L) === 'mostrar aos jogadores', '"Os jogadores veem": mostrada');
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(400);
    const vc = await A(L, id => __mundo.App.vista().objs.find(o => o.id === id) || null, car);
    ok(vc && vc.tipo === 'caravana' && vc.rota === null && !('modo' in vc) && !('paradas' in vc) && !('sentido' in vc) && !('espera' in vc), 'quem joga recebe a caravana (com o desenho dela), sem a rota, o jeito de andar e as paradas: ' + j(vc && Object.keys(vc)));
    await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon|WebSocket|realtime/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
