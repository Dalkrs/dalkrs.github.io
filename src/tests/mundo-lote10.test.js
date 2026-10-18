// Mapa-múndi, lote 10, pela interface:
//   · (parte 1, SO=subregioes) a camada Sub-regiões: na janelinha das camadas, com a conta; escondida, as regiões de dentro
//     somem do mapa (a área e o nome) e as províncias ficam; os atalhos (Viagem esconde, Política mostra);
//   · (parte 1, SO=reinos) a aba Reinos (era Facções): a facção dos jogadores (uma só: marcar outra tira a primeira, com o
//     aviso; desfazer volta), a etiqueta; o Livro do reino (por facção: províncias, sub-regiões, hexágonos, exércitos; a
//     linha sem dono); para quem joga, "vocês" na facção deles e sem o livro;
//   · (parte 1, SO=provincia) a seção Província (as sub-regiões em árvore, com o dono quando é outro; os hexágonos por
//     terreno; ir para a sub-região) e a Sub-região (parte da província, com o botão que volta); a descrição de cada uma;
//   · (parte 1, SO=modos) os modos do mapa (na janelinha das camadas): Clima (a cor do clima de agora em cada região, a
//     legenda), Perigo (pela chance de encontro: do verde ao vermelho; só o mestre), Terreno (sem o preenchimento), o
//     botão da legenda que volta ao Político; fica neste aparelho; para quem joga, sem o Perigo.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(180); }
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
async function botao(a, k) { await semAvisos(a); await a.F.click(`#pane [data-k="${k}"]`); await a.F.waitForTimeout(220); }
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(250); };
const avisos = a => A(a, () => document.getElementById('toasts').innerText);
const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
const textoPane = a => A(a, () => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
const desenhada = (a, id) => A(a, id => !!document.querySelector(`#mundo svg [data-id="${id}"] .reg`), id);
const fillDe = (a, id) => A(a, id => { const p = document.querySelector(`#mundo svg [data-id="${id}"] .reg`); return p ? { fill: p.getAttribute('fill'), cls: p.getAttribute('class'), op: getComputedStyle(p).fillOpacity } : null; }, id);
async function camadas(a, abrir) {
  const aberta = await A(a, () => !document.getElementById('camPop').hidden);
  if (aberta !== abrir) { await a.F.click('#zCamadas'); await espera(200); }
}
const naCam = (a, k) => a.F.locator(`#camPop [data-k="${k}"]`);
const comoJogador = async (a, sim) => { await A(a, s => { __mundo.App.comoJogador = s; __mundo.App.emit('muda', { origem: 'fora' }); }, sim); await espera(400); };
const quad = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote10', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await A(L, q => {
      const { App, N } = __mundo, quad = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      App.mudar('montar', m => {
        m.grade.tam = 40; m.grade.on = true;
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('r', { pts: quad(200, 200, 1000, 800) }), { id: 'p1', nome: 'Reino de Aldar', fac: 'fa' }),
          Object.assign(N.objNovo('r', { pts: quad(240, 240, 580, 500) }), { id: 's1', nome: 'Ducado do Vale', fac: 'fb', pai: 'p1' }),
          Object.assign(N.objNovo('r', { pts: quad(620, 240, 960, 500) }), { id: 's2', nome: 'Prefeitura do Sul', pai: 'p1' }),
          Object.assign(N.objNovo('r', { pts: quad(1150, 200, 1550, 600) }), { id: 'p2', nome: 'Ermo', enc: { chance: 60, itens: [{ p: 1, txt: 'Lobos' }] } }),
          Object.assign(N.objNovo('g', { x: 400, y: 650, sigla: 'EXE' }), { id: 'ga', nome: 'Hoste', tipo: 'exercito', fac: 'fa', exe: { cmd: { nome: 'Rei', b: 0 }, moral: 5, mant: 50, unid: [{ id: 'u1', nome: 'Lanceiros', tropas: 300 }, { id: 'u2', nome: 'Arqueiros', tropas: 120 }] } }));
      });
      // o terreno: a Prefeitura com floresta em parte dos hexágonos
      const R = window.MundoReino, s2 = App.mapa.objs.find(o => o.id === 's2'), hs = R.hexesDaRegiao(App.mapa, s2);
      App.mudar('terreno', m => { hs.slice(0, 6).forEach(k => { m.hexes[k] = 'fl'; }); hs.slice(6, 9).forEach(k => { m.hexes[k] = 'pl'; }); });
    });
    ok(await A(L, () => !!__mundo.App.mapa && __mundo.App.mapa.objs.length === 5), '(o mapa: duas províncias, duas sub-regiões e um exército)');
  });

  if (parte('subregioes')) await passo('a camada Sub-regiões', async () => {
    await camadas(L, true);
    const li = await A(L, () => { const e = document.querySelector('#camPop [data-cam="subregioes"]'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
    ok(!!li && /Sub-regiões 2/.test(li) && /Regiões 2/.test(await A(L, () => document.querySelector('#camPop [data-cam="regioes"]').innerText.replace(/\s+/g, ' '))), 'na janelinha das camadas: "Sub-regiões" (2), separada das Regiões (2): ' + li);
    await naCam(L, 'olho:subregioes').click(); await espera(400);
    ok(!(await desenhada(L, 's1')) && !(await desenhada(L, 's2')) && await desenhada(L, 'p1') && await desenhada(L, 'p2'), 'escondida: as sub-regiões somem do mapa e as províncias ficam');
    ok(await A(L, () => !Array.from(document.querySelectorAll('#mundo svg .rotulo-subreg')).length), 'e o nome delas também');
    await foto('l10-subregioes-escondidas');
    await naCam(L, 'olho:subregioes').click(); await espera(400);
    ok(await desenhada(L, 's1') && await desenhada(L, 's2'), 'mostrar: elas voltam');
    await naCam(L, 'at:viagem').click(); await espera(400);
    ok(!(await desenhada(L, 's1')) && !(await desenhada(L, 'p1')), 'o atalho Viagem esconde as regiões e as sub-regiões');
    await naCam(L, 'at:politica').click(); await espera(400);
    ok(await desenhada(L, 's1') && await desenhada(L, 'p1'), 'o atalho Política mostra as duas');
    await naCam(L, 'at:tudo').click(); await espera(300);
    await camadas(L, false);
  });

  if (parte('reinos')) await passo('a aba Reinos', async () => {
    ok((await L.F.locator('#tab-faccoes').innerText()).trim() === 'Reinos', 'a aba Facções agora se chama Reinos');
    await aba(L, 'faccoes');
    ok(/^Reinos/.test(await textoPane(L)), 'o título da aba: Reinos');
    await botao(L, 'fac:fa');
    ok(await campo(L, 'f:fa:jog').count() === 1 && !(await campo(L, 'f:fa:jog').isChecked()), 'no editor da facção: "Facção dos jogadores", desmarcada');
    await campo(L, 'f:fa:jog').check(); await espera(300);
    ok(await A(L, () => __mundo.App.mapa.faccoes.find(f => f.id === 'fa').jog === true) && await L.F.locator('#pane [data-k="fac:fa"] .tag.jog').count() === 1, 'marcar: Aldar é a facção dos jogadores (com a etiqueta)');
    await botao(L, 'fac:fb');
    await semAvisos(L);
    await campo(L, 'f:fb:jog').check(); await espera(300);
    const js = await A(L, () => __mundo.App.mapa.faccoes.map(f => !!f.jog));
    ok(j(js) === j([false, true]) && /Aldar deixou de ser a facção dos jogadores/.test(await avisos(L)), 'marcar o Vale: só uma pode ser — Aldar deixa de ser, e o aviso diz: ' + j(js));
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(j(await A(L, () => __mundo.App.mapa.faccoes.map(f => !!f.jog))) === j([true, false]), 'desfazer: volta a ser Aldar');
    // o Livro do reino
    const esperado = await A(L, () => { const R = window.MundoReino, Lv = R.livroDoReino(__mundo.App.mapa); return { fa: Lv.linhas[0], fb: Lv.linhas[1], sem: Lv.sem }; });
    const livro = await A(L, () => Array.from(document.querySelectorAll('#pane .livro-li')).map(e => [e.getAttribute('data-k'), e.innerText.replace(/\s+/g, ' ')]));
    const lin = k => (livro.find(x => x[0] === 'livro:' + k) || [])[1] || '';
    ok(livro.length === 3 && new RegExp('Aldar 1 província · 1 sub-região · ' + esperado.fa.hex + ' hexágonos · 1 exército \\(420 tropas\\)').test(lin('fa')), 'o Livro do reino: Aldar — 1 província, 1 sub-região (a Prefeitura), os hexágonos e o exército: ' + lin('fa'));
    ok(new RegExp('Vale 0 províncias · 1 sub-região · ' + esperado.fb.hex + ' hexágonos').test(lin('fb')) && /exército/.test(lin('fb')) === false, 'o Vale: só o ducado: ' + lin('fb'));
    ok(new RegExp('Sem dono 1 província · 0 sub-regiões · ' + esperado.sem.hex + ' hexágonos').test(lin('-')), 'sem dono: o Ermo: ' + lin('-'));
    await botao(L, 'fac:fechar');
    const itemFa = (await L.F.locator('#pane [data-k="fac:fa"]').innerText()).replace(/\s+/g, ' '), itemFb = (await L.F.locator('#pane [data-k="fac:fb"]').innerText()).replace(/\s+/g, ' ');
    ok(/1 província · 1 sub-região/.test(itemFa) && /1 sub-região/.test(itemFb) && !/província/.test(itemFb), 'na lista: as províncias e as sub-regiões de cada facção: ' + j([itemFa, itemFb]));
    await A(L, () => { const e = document.querySelector('#pane .livro-li'); if (e) e.scrollIntoView({ block: 'center' }); });
    await semAvisos(L); await foto('l10-livro');
    // quem joga
    await comoJogador(L, true);
    const pj = await textoPane(L);
    ok(await L.F.locator('#pane [data-fac="fa"] .tag.jog').count() === 1 && /vocês/.test(pj) && !(await L.F.locator('#pane .livro-li').count()), 'para quem joga: "vocês" na facção deles, e sem o livro');
    await comoJogador(L, false);
  });

  if (parte('provincia')) await passo('a seção Província', async () => {
    await aba(L, 'selecao');
    await selecionar(L, 'p1');
    ok((await L.F.locator('#pane .sub').first().innerText()) === 'Província · Aldar', 'a descrição: "Província · Aldar"');
    const subs = await A(L, () => Array.from(document.querySelectorAll('#pane .prov-sub')).map(e => e.innerText.replace(/\s+/g, ' ')));
    ok(j(subs) === j(['Ducado do Vale de Vale', 'Prefeitura do Sul']), 'a seção Província: as sub-regiões, com o dono quando é outro: ' + j(subs));
    const ter = await A(L, () => { const e = document.querySelector('#pane [data-k="o:p1:ter"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    const n1 = await A(L, () => window.MundoReino.hexesDaRegiao(__mundo.App.mapa, __mundo.App.mapa.objs.find(o => o.id === 'p1')).length);
    ok(new RegExp('^' + n1 + ' hexágonos Floresta 6 Planície 3 sem terreno ' + (n1 - 9) + '$').test(ter), 'os hexágonos por terreno: ' + ter);
    await A(L, () => { const e = document.querySelector('#pane [data-k="o:p1:ter"]'); if (e) e.scrollIntoView({ block: 'end' }); });
    await semAvisos(L); await foto('l10-provincia');
    await botao(L, 'sub:s1');
    ok(await A(L, () => JSON.stringify(__mundo.App.sel) === '["s1"]'), 'clicar numa sub-região: vai para ela');
    ok((await L.F.locator('#pane .sub').first().innerText()) === 'Sub-região de Reino de Aldar · Vale', 'a descrição: "Sub-região de Reino de Aldar · Vale"');
    ok(/Sub-região Parte da província Reino de Aldar/i.test(await textoPane(L)), 'a seção Sub-região: parte da província');
    await botao(L, 'o:s1:prov');
    ok(await A(L, () => JSON.stringify(__mundo.App.sel) === '["p1"]'), 'o botão da província: volta para ela');
    await selecionar(L, 'p2');
    ok(/Nenhuma sub-região\. Para um ducado ou uma prefeitura, desenhe uma região aqui dentro e escolha "Dentro de: Ermo"\./.test(await textoPane(L)), 'a província sem sub-regiões: o jeito de criar uma');
    await selecionar(L, null);
  });

  if (parte('modos')) await passo('os modos do mapa', async () => {
    await camadas(L, true);
    const chips = await A(L, () => Array.from(document.querySelectorAll('#camPop .cam-modos .chip')).map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')));
    ok(j(chips) === j(['Político*', 'Terreno', 'Clima', 'Perigo']), 'na janelinha das camadas: o modo do mapa (Político de começo): ' + j(chips));
    ok(await A(L, () => document.getElementById('modoLeg').hidden), 'no Político, sem legenda');
    // Clima (o Ermo com uma tempestade escolhida à mão: cada região com o dela)
    await A(L, () => __mundo.App.mudar('tempestade no Ermo', m => { m.objs.find(o => o.id === 'p2').chj = { d: m.cal.dia, k: 'tempestade' }; }));
    await naCam(L, 'modo:clima').click(); await espera(500);
    const esp = await A(L, () => { const { App, N } = __mundo, C = window.MundoCamadas; return ['p1', 's1', 'p2'].map(id => C.CLIMA_COR[N.climaDoDia(App.mapa, App.mapa.cal.dia, App.mapa.objs.find(o => o.id === id)).k]); });
    const f1 = await fillDe(L, 'p1'), f2 = await fillDe(L, 'p2');
    ok(f1.fill === esp[0] && f2.fill === esp[2] && /m-clima/.test(f1.cls), 'Clima: cada região com a cor do clima de agora: ' + j([f1.fill, f2.fill, esp]));
    const leg = await A(L, () => { const e = document.getElementById('modoLeg'); return e.hidden ? null : e.innerText.replace(/\s+/g, ' '); });
    const nomeClima = await A(L, () => { const { App, N } = __mundo; return N.CLIMAS[N.climaDoDia(App.mapa, App.mapa.cal.dia, null).k].nome; });
    ok(!!leg && /^Modo do mapa: Clima Político/.test(leg) && leg.includes(nomeClima) && leg.includes('Tempestade') && f2.fill === '#7b5fc7', 'a legenda: o modo e os climas (o do mundo e a tempestade do Ermo): ' + leg);
    await camadas(L, false);
    await semAvisos(L); await foto('l10-modo-clima');
    await camadas(L, true);
    // Perigo
    await naCam(L, 'modo:perigo').click(); await espera(500);
    const p2 = await fillDe(L, 'p2'), p1 = await fillDe(L, 'p1'), cor60 = await A(L, () => window.MundoCamadas.corPerigo(60));
    ok(p2.fill === cor60 && p1.fill === '#4caf6a' && /m-perigo/.test(p2.cls), 'Perigo: o Ermo (60%) entre o amarelo e o vermelho; o Reino (0%) verde: ' + j([p2.fill, p1.fill]));
    ok(/^Modo do mapa: Perigo Político 0% 50% 100%/.test(await A(L, () => document.getElementById('modoLeg').innerText.replace(/\s+/g, ' '))), 'a legenda do Perigo: de 0% a 100%');
    // Terreno
    await naCam(L, 'modo:terreno').click(); await espera(500);
    const t1 = await fillDe(L, 'p1');
    ok(t1.fill === '#3f7fbf' && /m-terreno/.test(t1.cls) && Number(t1.op) === 0, 'Terreno: a região sem o preenchimento (a borda fica, com a cor da facção): ' + j(t1));
    ok(await A(L, () => JSON.parse(localStorage.getItem('tinycats:mundo:camadas')).modo) === 'terreno', 'o modo fica neste aparelho');
    // quem joga: sem o Perigo
    await naCam(L, 'modo:perigo').click(); await espera(300);
    await comoJogador(L, true);
    const cj = await A(L, () => Array.from(document.querySelectorAll('#camPop .cam-modos .chip')).map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')));
    ok(j(cj) === j(['Político*', 'Terreno', 'Clima']) && await A(L, () => document.getElementById('modoLeg').hidden), 'para quem joga: sem o Perigo (o modo do mestre vira o Político, sem legenda): ' + j(cj));
    await comoJogador(L, false);
    await camadas(L, false);
    // o botão da legenda volta ao Político
    ok(/^Modo do mapa: Perigo/.test(await A(L, () => document.getElementById('modoLeg').innerText)), '(de volta ao mestre: o Perigo)');
    await L.F.click('#modoLeg [data-k="modo-voltar"]'); await espera(400);
    const fp = await fillDe(L, 'p1');
    ok(fp.fill === '#3f7fbf' && !/m-/.test(fp.cls) && await A(L, () => document.getElementById('modoLeg').hidden), 'o botão "Político" da legenda: volta às cores das facções, e a legenda some');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
