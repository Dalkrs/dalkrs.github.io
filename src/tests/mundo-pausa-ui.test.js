// Lote 170, pela interface: o mestre para a caravana ("Parar"), ela não anda com o "+1 tempo" nem com o "Andar", o
// painel e o token mostram que está parada, o aviso lembra; "Retomar" volta a andar de onde parou. Os jogadores não
// veem a marca.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(250); }
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(220); };
const obj = (a, id) => A(a, id => { const o = __mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id); return o ? JSON.parse(JSON.stringify(o)) : null; }, id);
const avisos = a => A(a, () => document.getElementById('toasts').innerText);

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'pausa', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar', m => { m.grade.tam = 40; m.cal.tpd = 10; m.cal.tempo = 0; m.objs.push(Object.assign(N.objNovo('t', { pts: [[100, 1300], [1300, 1300]] }), { id: 'rd', nome: 'Estrada' })); });
      App.mudar('a caravana', m => { const v = N.viagem(m, { rota: 'rd' }), c = N.centroHex(m, v.cam[0].q, v.cam[0].r); m.objs.push(Object.assign(N.objNovo('g', { x: c.x, y: c.y, sigla: 'CAR' }), { id: 'gc', nome: 'Caravana do Sal', tipo: 'caravana', rota: 'rd', pt: 10 })); });
    });
    await A(L, () => window.MundoTela.centrar({ x: 400, y: 1300 })); await espera(300);
  });
  await passo('parar e retomar', async () => {
    const pos = async () => { const o = await obj(L, 'gc'); return Math.round(o.x) + ',' + Math.round(o.y); };
    await aba(L, 'selecao'); await selecionar(L, 'gc');
    ok((await campo(L, 'o:gc:pausa').innerText()).trim() === 'Parar', 'o painel da caravana tem "Parar"');
    await botao(L, 'o:gc:pausa');
    ok((await obj(L, 'gc')).pausado === true && /Caravana do Sal parou/.test(await avisos(L)), 'Parar: fica parada, com o aviso');
    ok((await campo(L, 'o:gc:pausa').innerText()).trim() === 'Retomar' && /Parado pelo mestre/.test(await L.F.locator('#pane').innerText()), 'o botão vira "Retomar", e o painel diz que está parada');
    ok(await campo(L, 'o:andar').isDisabled(), '"Andar 1 tempo" fica apagado');
    ok(await A(L, () => !!document.querySelector('#mundo svg [data-id="gc"] .pausado')), 'o token mostra a marca de parado');
    const p0 = await pos();
    await aba(L, 'hoje'); await botao(L, 'hoje:tempo');
    ok((await pos()) === p0, '"+1 tempo": a caravana parada não anda');
    ok(/Caravana do Sal — parado/.test(await avisos(L)), 'o aviso do tempo lembra que está parada: ' + await avisos(L));
    ok(await A(L, () => { __mundo.App.comoJogador = true; const v = __mundo.App.vista(); __mundo.App.comoJogador = false; return !!v; }), '(a vista dos jogadores abre)');
    await aba(L, 'selecao'); await selecionar(L, 'gc');
    await botao(L, 'o:gc:pausa');
    ok(!('pausado' in (await obj(L, 'gc'))) && /retomou a rota/.test(await avisos(L)), 'Retomar: tira a marca');
    await aba(L, 'hoje'); await botao(L, 'hoje:tempo');
    ok((await pos()) !== p0, '"+1 tempo": volta a andar de onde parou');
    if (process.env.FOTOS) { await A(L, () => __mundo.App.mudar('parar de novo', m => { m.objs.find(o => o.id === 'gc').pausado = true; })); await aba(L, 'selecao'); await selecionar(L, 'gc'); await espera(300); await L.P.screenshot({ path: path.join(process.env.FOTOS, 'l168-pausa.png') }); }
  });
  await t.close(); end();
})();
