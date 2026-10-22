// Mapa-múndi, lote 15 (a página sozinha, no navegador):
//   · em cima do token do exército, para o mestre: quantos soldados ele tem (de qualquer tipo) e, quando há, os selinhos
//     dos magos e das máquinas de cerco; quem joga não vê;
//   · Shift + clique em dois exércitos: a seleção oferece "Batalha entre os dois…", que abre a batalha com os dois lados.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'mundo-l15', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const P = dl.page, F = P.mainFrame();
  const A = (fn, arg) => F.evaluate(fn, arg);
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const forca = id => A(id => { const g = document.querySelector(`[data-id="${id}"] .forca`); if (!g) return null; return { t: [...g.querySelectorAll('text')].map(x => x.textContent), k: [...g.children].filter(x => x.tagName === 'g').map(x => x.getAttribute('class')), titulo: (g.querySelector('title') || {}).textContent || '' }; }, id);
  const campo = k => F.locator(`#pane [data-k="${k}"]`);
  const centro = id => A(id => { const el = document.querySelector(`[data-id="${id}"] .grupo-base`); const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id);

  await passo('o mapa', async () => {
    await P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await A(() => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        const poe = (k, campos, extra) => m.objs.push(Object.assign(N.objNovo(k, campos), extra));
        const un = (id, tropas, o) => Object.assign({ id, nome: id, tipo: null, tropas, hpT: 1, atq: 0, def: 0, magos: 0, maq: {}, equip: [] }, o);
        const exe = unid => ({ cmd: { nome: '', b: 0 }, moral: 5, mant: 10, fome: 0, unid });
        poe('g', { x: 600, y: 500, tipo: 'exercito', sigla: 'ALD' }, { id: 'ga', nome: 'Hoste de Aldar', fac: 'fa', tipo: 'exercito', exe: exe([un('u1', 1200, { magos: 3, maq: { catapulta: 2 } }), un('u2', 50), un('u3', 0, { magos: 9 })]) });
        poe('g', { x: 900, y: 500, tipo: 'exercito', sigla: 'VAL' }, { id: 'gb', nome: 'Legião do Vale', fac: 'fb', tipo: 'exercito', exe: exe([un('v1', 800)]) });
        poe('g', { x: 1200, y: 500, tipo: 'exercito', sigla: 'BAN' }, { id: 'gc', nome: 'Bandoleiros', tipo: 'exercito' });
        poe('g', { x: 600, y: 800, tipo: 'exercito', sigla: 'MAG' }, { id: 'gd', nome: 'Círculo Arcano', tipo: 'exercito', exe: exe([un('w1', 25000, { magos: 1200 })]) });
        poe('g', { x: 900, y: 800, tipo: 'caravana', sigla: 'CAR' }, { id: 'gk', nome: 'Caravana', tipo: 'caravana' });
        poe('m', { x: 1200, y: 800, ic: 'castelo' }, { id: 'cast', nome: 'Forte' });
      });
    });
    await espera(400);
    ok(await A(() => __mundo.App.mapa.objs.find(o => o.id === 'ga').exe.unid.length === 3), '(os exércitos com as unidades)');
  });

  await passo('a força em cima do token', async () => {
    const fa = await forca('ga');
    ok(fa && j(fa.t) === j(['1,2 mil', '3', '2']) && j(fa.k) === j(['forca-tropas', 'forca-magos', 'forca-maq']), 'a Hoste: 1.250 soldados ("1,2 mil"), 3 magos e 2 máquinas (a unidade sem tropas não conta): ' + j(fa));
    ok(fa && /^1\.250 soldados · 3 magos · 2 máquinas de cerco \(só o mestre vê\)$/.test(fa.titulo), 'o título diz por extenso: ' + (fa && fa.titulo));
    const fb = await forca('gb');
    ok(fb && j(fb.t) === j(['800']) && j(fb.k) === j(['forca-tropas']), 'a Legião: 800, sem os selinhos (não tem magos nem máquinas): ' + j(fb));
    ok(await forca('gc') === null && await forca('gk') === null, 'o exército sem unidades e a caravana: nada em cima');
    ok(j((await forca('gd')).t) === j(['25 mil', '1,2 mil']), 'números grandes ficam curtos (25 mil soldados, 1,2 mil magos)');
    // o selo fica acima do token, sem cobrir o desenho dele
    const pos = await A(() => { const g = document.querySelector('[data-id="ga"] .forca').getBoundingClientRect(), b = document.querySelector('[data-id="ga"] .grupo-anel').getBoundingClientRect(); return { fb: g.bottom, at: b.top }; });
    ok(pos.fb <= pos.at + 1, 'a força fica em cima do token, sem cobri-lo: ' + j(pos));
    await A(() => __mundo.App.selecionar([])); await espera(200);
    await foto('l15-mundo-forca');
    // quem joga não vê
    await A(() => { __mundo.App.comoJogador = true; __mundo.App.pintar && __mundo.App.pintar(); }); await espera(400);
    const comoJ = await A(() => document.querySelectorAll('.forca').length);
    await A(() => { __mundo.App.comoJogador = false; __mundo.App.pintar && __mundo.App.pintar(); }); await espera(400);
    ok(comoJ === 0 && await A(() => document.querySelectorAll('.forca').length) === 3, 'vendo como jogador, a força some de todos os tokens (e volta para o mestre)');
    // mudou a unidade: o número acompanha
    await A(() => __mundo.App.mudar('mais tropas', m => { m.objs.find(o => o.id === 'gb').exe.unid[0].tropas = 801; })); await espera(300);
    ok(j((await forca('gb')).t) === j(['801']), 'as tropas mudam, o número acompanha (801)');
  });

  await passo('Shift + clique em dois exércitos', async () => {
    const pa = await centro('ga'), pb = await centro('gb');
    await P.mouse.click(pa[0], pa[1]); await espera(300);
    ok(j(await A(() => __mundo.App.sel)) === j(['ga']) && await campo('varios:batalha').count() === 0, '(um exército escolhido)');
    await P.keyboard.down('Shift'); await P.mouse.click(pb[0], pb[1]); await P.keyboard.up('Shift'); await espera(400);
    ok(j(await A(() => __mundo.App.sel)) === j(['ga', 'gb']), 'Shift + clique soma o segundo exército à seleção');
    ok(await campo('varios:batalha').isVisible() && await campo('varios:batalha').isEnabled() && /Hoste de Aldar de um lado e Legião do Vale do outro/.test(await campo('varios:batalha').getAttribute('title')), 'a seleção oferece "Batalha entre os dois…"');
    await foto('l15-mundo-dois-exercitos');
    await campo('varios:batalha').click(); await espera(500);
    const b = await A(() => { const x = window.MundoGuerraPainel.batalha; return x ? { a: x.a, b: x.b, res: x.res } : null; });
    ok(await A(() => !!document.querySelector('dialog.gb[open]')) && b && b.a === 'ga' && b.b === 'gb' && !b.res, 'abre a batalha com a Hoste de um lado e a Legião do outro, sem rolar nada: ' + j(b));
    await foto('l15-mundo-batalha');
    await P.keyboard.press('Escape'); await espera(300);
    // um dos dois sem unidades: o botão fica apagado, com a explicação
    await A(() => __mundo.App.selecionar(['ga', 'gc'])); await espera(300);
    ok(await campo('varios:batalha').isDisabled() && /precisam ter unidades/.test(await A(() => document.getElementById('pane').innerText)), 'com os Bandoleiros (sem unidades): o botão fica apagado, e a nota explica');
    // um exército e outra coisa: não há batalha
    await A(() => __mundo.App.selecionar(['ga', 'cast'])); await espera(300);
    ok(await campo('varios:batalha').count() === 0, 'um exército e um marcador: sem o botão');
    await A(() => __mundo.App.selecionar(['ga', 'gb', 'gd'])); await espera(300);
    ok(await campo('varios:batalha').count() === 0, 'três exércitos: sem o botão (a batalha é entre dois)');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
