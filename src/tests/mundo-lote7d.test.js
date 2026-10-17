// Mapa-múndi, lote 7 (parte 5c), pela interface (a página sozinha, no navegador): o clima do dia e as zonas de perigo.
//   · o clima de hoje junto da data (para todos), a aba Hoje ("O clima de hoje": sorteado, trocar o de hoje, as regiões),
//     a tabela do clima na aba Mapa (mês a mês, a soma, voltar à de começo) e o ajuste da região (nunca, mais…);
//   · a ferramenta Frente com a zona de perigo (o tipo), o desenho dela, o painel (o tipo, os números, voltar aos do tipo);
//   · o "Próximo dia" com o grupo dentro da zona: a proposta (sem mesa, o aviso de que as fichas não mudam);
//   · quem joga: o clima de hoje pronto, a zona sem os números.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(180); }
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(220); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(250); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function naTela(a, x, y) { const [px, py] = await A(a, ([x, y]) => { const m = __mundo.App.vista(), r = document.querySelector('#mundo svg.camadas').getBoundingClientRect(); return [r.left + x * r.width / m.larg, r.top + y * r.height / m.alt]; }, [x, y]); return [px, py]; }
async function clicar(a, x, y) { const [px, py] = await naTela(a, x, y); await a.P.mouse.click(px, py); await a.F.waitForTimeout(200); }
async function ferramenta(a, f) { await a.F.click(`#rail .tool[data-f="${f}"]`); await a.F.waitForTimeout(150); }
const mapa = a => A(a, () => __mundo.App.mapa);
const rotulo = a => A(a, () => __mundo.App.rotuloDesfazer());
const obj = (a, id) => A(a, id => (__mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id)) || null, id);
const sel = a => A(a, () => __mundo.App.sel[0] || null);
const textoDoAviso = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).join(' | '));
const desfazer = async a => { await A(a, () => __mundo.App.desfazer()); await espera(250); };
const painel = a => A(a, () => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
const chip = a => A(a, () => { const c = document.getElementById('climaTxt'); return c && !c.hidden ? c.innerText.trim() : null; });

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote7d', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    ok((await mapa(L)).grade.tam === 40, '(a grade de 40 unidades)');
  });

  await passo('o clima de hoje', async () => {
    const k = await A(L, () => __mundo.N.climaDoDia(__mundo.App.mapa).k), nome = await A(L, k => __mundo.N.CLIMAS[k].nome, k);
    ok(await chip(L) === nome, 'junto da data, o clima de hoje (o sorteado): ' + nome);
    await L.F.click('#climaTxt'); await espera(250);
    ok(await A(L, () => document.getElementById('tab-hoje').getAttribute('aria-selected')) === 'true', 'clicar no clima abre a aba Hoje');
    const txt = await painel(L);
    ok(/O clima de hoje/i.test(txt) && new RegExp(nome + ' sorteado pela tabela de Alvorada').test(txt), 'a aba Hoje: o clima de hoje, sorteado pela tabela do mês');
    const outro = k === 'neve' ? 'chuva' : 'neve';
    await escolher(L, 'hoje:clima-mao', outro);
    const m = await mapa(L);
    ok(j(m.clima.mao) === j({ d: 0, k: outro }) && await rotulo(L) === 'trocar o clima de hoje' && await chip(L) === await A(L, k => __mundo.N.CLIMAS[k].nome, outro) && /escolhido por você/.test(await painel(L)), 'trocar o de hoje: vale só hoje, junto da data também');
    await semAvisos(L); await L.F.click('#diaMais'); await espera(350);
    ok(await A(L, () => !__mundo.N.climaDoDia(__mundo.App.mapa).mao), 'no dia seguinte, o sorteado de novo');
    await desfazer(L); await desfazer(L);
    ok(!(await mapa(L)).clima || !(await mapa(L)).clima.mao, '(Desfazer)');
  });

  await passo('a tabela do clima', async () => {
    await aba(L, 'mapa');
    ok(await campo(L, 'clima:mes').inputValue() === '0' && /Somam 100%/.test(await painel(L)), 'a aba Mapa: a tabela do mês de hoje (a de começo soma 100%)');
    // o mês de hoje só com chuva: o clima de hoje vira chuva
    for (const k of ['sol', 'nublado', 'tempestade', 'neve', 'nevoa', 'frio']) await escrever(L, 'clima:0:' + k, '0');
    await escrever(L, 'clima:0:chuva', '50');
    let m = await mapa(L);
    ok(m.clima.tab.length === 12 && m.clima.tab[0].chuva === 50 && m.clima.tab[0].sol === 0 && await rotulo(L) === 'mudar a tabela do clima' && /Somam 50%/.test(await painel(L)), 'mudar a chance (o mês vira só chuva; soma 50%, valendo na proporção)');
    ok(await A(L, () => __mundo.N.climaDoDia(__mundo.App.mapa).k) === 'chuva' && await chip(L) === 'Chuva', 'o clima de hoje segue a tabela');
    await escrever(L, 'clima:0:chuva', '0');
    ok(/Pelo menos um clima precisa ter chance/.test(await textoDoAviso(L)) && (await mapa(L)).clima.tab[0].chuva === 50, 'sem nenhuma chance no mês: não deixa');
    await escolher(L, 'clima:mes', '6');
    ok(await campo(L, 'clima:6:calor').inputValue() === '20', 'outro mês: a tabela dele (o verão, com calor)');
    await escolher(L, 'clima:mes', '0');
    await botao(L, 'clima:padrao');
    m = await mapa(L);
    ok(j(m.clima.tab[0]) === j(await A(L, () => __mundo.N.tabelaPadraoDoMes(0, 12))), 'voltar à de começo neste mês');
    await botao(L, 'clima:padrao-todos');
    ok(!(await mapa(L)).clima, 'voltar à de começo em todos os meses: a tabela some do mapa');
    // de volta: chuva certa neste mês, para o resto do teste
    for (const k of ['sol', 'nublado', 'tempestade', 'neve', 'nevoa', 'frio']) await escrever(L, 'clima:0:' + k, '0');
  });

  await passo('o ajuste da região', async () => {
    await A(L, () => __mundo.App.mudar('a região', m => { m.objs.push(Object.assign(__mundo.N.objNovo('r', { pts: [[600, 100], [1000, 100], [1000, 500], [600, 500]] }), { id: 'rd', nome: 'Deserto de Sal' })); }));
    await A(L, () => __mundo.App.selecionar(['rd'])); await espera(250);
    await aba(L, 'selecao');
    ok(/Chuva o do mundo/.test(await painel(L)) && /O clima desta região: como o do mundo\./.test(await painel(L)), 'a região sem ajuste: o clima do mundo');
    await botao(L, 'o:rd:ajustar');
    await escolher(L, 'o:rd:aj:chuva', 'nunca');
    await escolher(L, 'o:rd:aj:calor', 'muito');
    const r = await obj(L, 'rd');
    ok(j(r.clima) === j({ chuva: 'nunca', calor: 'muito' }) && await rotulo(L) === 'ajustar o clima da região', 'o ajuste, clima por clima');
    const txt = await painel(L);
    ok(/Calor com o ajuste desta região/.test(txt) && /O clima desta região: nunca chuva, muito mais calor\./.test(txt), 'hoje, na região: calor (a chuva nunca vem aqui): ' + (txt.match(/Clima .{0,80}/) || [''])[0]);
    await aba(L, 'hoje');
    ok(/Nas regiões: Deserto de Sal, calor\./.test(await painel(L)), 'a aba Hoje lista as regiões com clima próprio');
  });

  let zp = null;
  await passo('a zona de perigo', async () => {
    await ferramenta(L, 'f');
    await L.F.click('#opts .chip:has-text("Zona de perigo")'); await espera(150);
    await L.F.selectOption('#opts select[aria-label="Tipo"]', 'frio'); await espera(120);
    ok(/primeiro ponto da zona de perigo \(frio extremo\)/.test(await L.F.locator('#dica').innerText()), 'a ferramenta Frente: a zona de perigo, com o tipo');
    for (const [x, y] of [[100, 600], [400, 600], [400, 900], [100, 900]]) await clicar(L, x, y);
    await L.P.keyboard.press('Enter'); await espera(300);
    zp = await sel(L);
    const z = await obj(L, zp);
    ok(z && z.tipo === 'frio' && !('ef' in z) && z.a === null && z.ini === 0 && await rotulo(L) === 'nova zona de perigo', 'a zona nasce com o tipo (os números do tipo valem): ' + j(z && [z.tipo, z.ini]));
    const d = await A(L, id => { const g = document.querySelector(`#mundo .zon[data-id="${id}"]`); return g ? { perigo: g.classList.contains('zon-perigo'), nome: (g.querySelector('.rotulo') || {}).textContent } : null; }, zp);
    ok(d && d.perigo && d.nome === 'FRIO EXTREMO', 'no mapa: a área do frio, com o nome do tipo');
    await aba(L, 'selecao');
    ok(await campo(L, `o:${zp}:zfad`).inputValue() === '-1' && await campo(L, `o:${zp}:zconf`).inputValue() === '-10' && await campo(L, `o:${zp}:a`).count() === 0, 'o painel: os números do tipo (Fadiga −1, Conforto −10), sem os lados');
    await escrever(L, `o:${zp}:zsan`, '-3');
    ok(j((await obj(L, zp)).ef) === j({ fad: -1, conf: -10, san: -3 }) && await campo(L, `o:${zp}:zpadrao`).count() === 1, 'mudar a Sanidade: a zona ganha os números dela, e aparece "Voltar aos números do tipo"');
    await botao(L, `o:${zp}:zpadrao`);
    ok(!('ef' in (await obj(L, zp))), 'voltar aos números do tipo');
    await escrever(L, `o:${zp}:zsan`, '-3');
  });

  await passo('a proposta no Próximo dia', async () => {
    await A(L, () => __mundo.App.mudar('o grupo no frio', m => { m.objs.push(Object.assign(__mundo.N.objNovo('g', { x: 250, y: 750, sigla: 'HER' }), { id: 'her', nome: 'Os Heróis' })); }));
    await semAvisos(L); await L.F.click('#diaMais'); await espera(500);
    const av = await textoDoAviso(L);
    ok(/Um dia em "Frio extremo" \(Os Heróis\): Fadiga −1 passo, Conforto −10, Sanidade −3\. Sem mesa, as fichas não mudam/.test(av), 'sem mesa: o aviso do que o dia na zona faria: ' + av);
    await foto('lote7d-clima-zona');
  });

  await passo('quem joga', async () => {
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(400);
    const v = await A(L, id => { const m = __mundo.App.vista(); return { clima: m.clima, z: m.objs.find(o => o.id === id) || null, r: m.objs.find(o => o.id === 'rd') || null }; }, zp);
    ok(v.clima && v.clima.hoje && v.z && v.z.tipo === 'frio' && !('ef' in v.z) && v.r && v.r.ch === 'calor' && !('clima' in v.r) && await chip(L), 'quem joga: o clima de hoje pronto (junto da data), a zona sem os números, a região com o clima de hoje: ' + j([v.clima, v.r && v.r.ch]));
    await A(L, () => { __mundo.App.comoJogador = false; }); await espera(300);
  });

  const erros = t.errs.filter(e => !/favicon|WebSocket|realtime/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
