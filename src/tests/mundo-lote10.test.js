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
//     botão da legenda que volta ao Político; fica neste aparelho; para quem joga, sem o Perigo;
//   · (parte 2, SO=economia) ligar a economia (a janela diz os recursos, o de mesmo nome que a facção já tinha e a semana;
//     desfazer volta); os recursos do mundo (renomear — as facções acompanham —, o papel, criar, tirar: a facção fica com
//     o estoque); as tabelas do terreno e da população (janelas); os níveis (criar, tirar); o assentamento no marcador
//     (o nível, a população, onde fica e o que produz); a produção da província e de onde vem (com o valor do mestre); os
//     assentamentos de dentro; o Livro (o que cada facção produz e o estoque); na facção, os recursos do mundo sem
//     renomear nem tirar; o modo Economia (a cor pela produção de um recurso, a legenda com a escolha); desligar.
//   · (parte 3, SO=construcoes) o catálogo de construções (mostrar, editar — com o erro de um número e um nível a mais —,
//     criar, tirar); no assentamento, construir (a janela: o que não dá e por quê, o custo, o estoque, quem paga), a obra
//     (as semanas, terminar), subir de nível (de graça), cancelar (devolve), o que falta (sem pagar, dá), demolir; a
//     defesa na Fortificação e na batalha; a produção na província; a sede do clã (os clãs deste navegador, a produção da
//     construção do clã, para a facção ligada a ele, no Livro).
//   · (parte 4, SO=semana) a semana aberta na Economia do mundo; a manutenção dos exércitos (a tabela, sem número
//     negativo) e as regras da falta; o calendário passa de domingo para segunda ("+7 dias") e a prévia abre sozinha (o
//     estoque, a produção, a manutenção, o que fica e o que falta; as consequências — recusar as obras paradas muda as
//     obras —); aplicar, desfazer, "1 semana para fechar" e fechar pelo botão; duas pendentes, uma de cada vez.
//   · (SO=bandeira) a bandeira própria da facção (sem clã): criar (a janela com a de começo, as escolhas e a prévia; nada
//     muda antes de criar; no celular, cabe), no mapa, na lista, no editor e no Livro; editar e cancelar (ou Esc); salvar
//     e desfazer; a imagem (o mapa a mostra; "Voltar ao desenho"); com um clã ligado, vale a do clã (a própria fica
//     guardada); quem joga vê; na prévia da semana; tirar e desfazer.
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

  if (parte('economia')) await passo('a economia', async () => {
    await A(L, () => __mundo.App.mudar('um recurso da facção', m => { const f = m.faccoes.find(x => x.id === 'fa'); f.rec.push({ id: 'rcx', nome: 'Lapros', n: 40, ver: true }); }));
    await A(L, () => __mundo.App.mudar('uma vila', m => { m.objs.push(Object.assign(__mundo.N.objNovo('m', { x: 800, y: 380, ic: 'vila' }), { id: 'vl', nome: 'Vila Alta' })); }));
    await aba(L, 'faccoes');
    ok(/Economia do mundo/i.test(await textoPane(L)) && await campo(L, 'eco:ligar').count() === 1, 'na aba Reinos: "Economia do mundo", com "Ligar a economia…"');
    await botao(L, 'eco:ligar');
    const txt = await A(L, () => { const d = document.querySelector('dialog.mundo-dl[open]'); return d ? d.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Lapros, Suprimentos, Madeira, Pedra, Orith, Runas/.test(txt) && /Aldar \(Lapros\)/.test(txt) && /hoje vira segunda-feira/.test(txt), 'a janela: os recursos, o de mesmo nome que a facção já tinha e a semana: ' + txt.slice(0, 200));
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    const est = await A(L, () => { const m = __mundo.App.mapa; return { on: m.eco && m.eco.on, recs: m.eco.rec.map(r => r.nome), fa: m.faccoes[0].rec.map(r => r.id + ':' + r.n), fb: m.faccoes[1].rec.length, sem0: m.cal.sem0 }; });
    ok(est.on && est.recs.join() === 'Lapros,Suprimentos,Madeira,Pedra,Orith,Runas' && est.fa[0] === 'lapros:40' && est.fb === 6 && est.sem0 === 0, 'ligada: os seis recursos; o Lapros de Aldar virou o do mundo (com os 40); o Vale ganhou os seis: ' + j(est));
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(await A(L, () => !__mundo.App.mapa.eco && __mundo.App.mapa.faccoes[0].rec[0].id === 'rcx'), 'desfazer: como estava');
    await A(L, () => __mundo.App.refazer()); await espera(300);
    // os recursos do mundo
    await campo(L, 'eco:r:lapros:nome').fill('Lapros de ouro'); await campo(L, 'eco:r:lapros:nome').press('Enter'); await espera(300);
    ok(await A(L, () => __mundo.App.mapa.eco.rec[0].nome === 'Lapros de ouro' && __mundo.App.mapa.faccoes.every(f => f.rec.find(r => r.id === 'lapros').nome === 'Lapros de ouro')), 'renomear o recurso: as facções acompanham');
    await campo(L, 'eco:r:lapros:nome').fill('Lapros'); await campo(L, 'eco:r:lapros:nome').press('Enter'); await espera(300);
    await campo(L, 'eco:r:runas:papel').selectOption(''); await espera(250);
    ok(await A(L, () => !('papel' in __mundo.App.mapa.eco.rec[5])), 'o papel: Runas vira "Outro"');
    await campo(L, 'eco:r:runas:papel').selectOption('magia'); await espera(250);
    await botao(L, 'eco:rec-novo');
    await L.F.fill('dialog.mundo-dl[open] #dl-nome', 'Sal'); await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    const sal = await A(L, () => { const m = __mundo.App.mapa, r = m.eco.rec.find(x => x.nome === 'Sal'); return r ? { id: r.id, nas: m.faccoes.every(f => f.rec.some(x => x.id === r.id && x.n === 0)) } : null; });
    ok(!!sal && sal.nas, 'criar um recurso (Sal): cada facção ganha o estoque dele');
    await botao(L, 'eco:r:' + sal.id + ':x');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, id => !__mundo.App.mapa.eco.rec.some(r => r.id === id) && __mundo.App.mapa.faccoes[0].rec.some(r => r.id === id), sal.id), 'tirar o Sal do mundo: a facção fica com o estoque (como um recurso só dela)');
    // as tabelas
    await botao(L, 'eco:ter');
    await L.F.waitForSelector('dialog.eco-dl[open]');
    ok(await A(L, () => document.querySelectorAll('dialog.eco-dl[open] tbody tr').length) >= 8 && await A(L, () => document.querySelector('dialog.eco-dl[open] [data-k="tab:fl:madeira"]').value) === '2', 'a produção do terreno: uma linha por terreno (a floresta dá 2 de madeira, de começo)');
    await L.F.fill('dialog.eco-dl[open] [data-k="tab:fl:madeira"]', '3'); await L.F.fill('dialog.eco-dl[open] [data-k="tab:fl:runas"]', '0,5');
    await L.F.click('dialog.eco-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.eco.ter.fl)) === j({ suprimentos: 0.5, madeira: 3, runas: 0.5 }), 'salvar: a floresta dá 3 de madeira e 0,5 de runas: ' + await A(L, () => JSON.stringify(__mundo.App.mapa.eco.ter.fl)));
    await botao(L, 'eco:pop');
    await L.F.fill('dialog.mundo-dl[open] #dl-lapros', '10,5'); await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.eco.pop)) === j({ lapros: 10.5 }), 'a produção da população: 10,5 Lapros por mil pessoas (com vírgula)');
    // os níveis
    await botao(L, 'eco:niv-novo');
    await L.F.fill('dialog.mundo-dl[open] #dl-nome', 'Capital'); await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    const niv = await A(L, () => __mundo.App.mapa.eco.niv.map(n => n.nome + ':' + n.esp));
    ok(niv.join() === 'Aldeia:2,Vila:4,Cidade:6,Metrópole:8,Capital:8', 'um nível novo (Capital, 8 espaços), no fim: ' + niv.join());
    const cap = await A(L, () => __mundo.App.mapa.eco.niv[4].id);
    await botao(L, 'eco:n:' + cap + ':x');
    ok(await A(L, () => __mundo.App.mapa.eco.niv.length) === 4, 'tirar o nível (nenhum assentamento usa: sem perguntar)');
    // o assentamento
    await aba(L, 'selecao'); await selecionar(L, 'vl');
    ok(/Assentamento/i.test(await textoPane(L)) && await campo(L, 'o:vl:niv').count() === 1, 'no marcador: a seção Assentamento');
    await campo(L, 'o:vl:niv').selectOption('vila'); await espera(300);
    await campo(L, 'o:vl:pop').fill('2000'); await campo(L, 'o:vl:pop').press('Enter'); await espera(300);
    const pane = await textoPane(L);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.objs.find(o => o.id === 'vl').ass)) === j({ niv: 'vila', pop: 2000 }) && /Fica em Prefeitura do Sul \(província Reino de Aldar\)\./.test(pane) && /Pela população, por semana: Lapros \+21\./.test(pane),
      'a vila: o nível, a população, onde fica e o que produz pela população (10,5 por mil)');
    await campo(L, 'o:vl:niv').selectOption(''); await espera(300);
    ok(await A(L, () => !('ass' in __mundo.App.mapa.objs.find(o => o.id === 'vl'))) && !(await campo(L, 'o:vl:pop').count()), '"Não é assentamento": o marcador deixa de ser (e some a população)');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.objs.find(o => o.id === 'vl').ass)) === j({ niv: 'vila', pop: 2000 }), 'desfazer: a vila de volta, com as 2.000 pessoas');
    // a província
    await selecionar(L, 'p1');
    const esperado = await A(L, () => { const m = __mundo.App.mapa; return window.MundoReino.producaoDaRegiao(m, m.objs.find(o => o.id === 'p1')); });
    const prod = await A(L, () => Array.from(document.querySelectorAll('#pane [data-k="o:p1:prod"] .prod-li')).map(e => e.innerText.replace(/\s+/g, ' ')));
    ok(prod.some(x => x === 'Madeira +' + String(esperado.total.madeira).replace('.', ',') + ' terreno +' + String(esperado.terreno.madeira).replace('.', ',')) && prod.some(x => /^Lapros \+21 população \+21$/.test(x)),
      'a produção da província por semana e de onde vem (o terreno, a população): ' + j(prod));
    const notaProd = await A(L, () => { const e = document.querySelector('#pane [data-k="o:p1:prod"] .note'); return e ? e.textContent : ''; });
    ok(prod.length === Object.values(esperado.total).filter(Boolean).length && notaProd === 'Produção por semana (com as sub-regiões)', 'uma linha por recurso que a província produz (o que não produz não aparece), com as sub-regiões: ' + j([prod.length, notaProd]));
    await botao(L, 'o:p1:prod-mestre');
    await L.F.fill('dialog.mundo-dl[open] #dl-lapros', '7'); await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    const prod2 = await A(L, () => Array.from(document.querySelectorAll('#pane [data-k="o:p1:prod"] .prod-li')).map(e => e.innerText.replace(/\s+/g, ' ')));
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.objs.find(o => o.id === 'p1').prod)) === j({ lapros: 7 }) && prod2.some(x => x === 'Lapros +28 população +21 · do mestre +7'), 'a produção do mestre (7 Lapros): entra na conta: ' + j(prod2));
    ok(/Assentamentos \(1\) Vila Alta Vila · 2\.000 pessoas · em Prefeitura do Sul/.test(await textoPane(L)), 'os assentamentos de dentro da província');
    await A(L, () => { const e = document.querySelector('#pane [data-k="o:p1:prod"]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await semAvisos(L); await foto('l10-producao');
    // o Livro e a facção
    await aba(L, 'faccoes');
    const lv = await A(L, () => { const e = document.querySelector('#pane [data-k="livro:fa"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Produz por semana: Lapros 28 · .*Madeira/.test(lv) && /Estoque: Lapros 40/.test(lv), 'o Livro: o que Aldar produz por semana e o estoque: ' + lv);
    await botao(L, 'fac:fa');
    ok(await campo(L, 'f:fa:r:lapros:n').count() === 1 && !(await campo(L, 'f:fa:r:lapros:nome').count()) && !(await campo(L, 'f:fa:r:lapros:x').count()), 'na facção: o estoque de Lapros (do mundo: sem renomear nem tirar aqui)');
    await botao(L, 'fac:fechar');
    await A(L, () => { const e = document.querySelector('#pane [data-k="livro:fa"]'); if (e) e.scrollIntoView({ block: 'center' }); });
    await semAvisos(L); await foto('l10-economia');
    await botao(L, 'fac:nova');
    const nv = await A(L, () => { const m = __mundo.App.mapa, f = m.faccoes[m.faccoes.length - 1]; return { nome: f.nome, recs: (f.rec || []).map(r => r.id + ':' + r.n).join() }; });
    ok(nv.recs === 'lapros:0,suprimentos:0,madeira:0,pedra:0,orith:0,runas:0', 'uma facção nova já nasce com o estoque de cada recurso do mundo (zero): ' + j(nv));
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // o modo Economia
    await camadas(L, true);
    ok(await naCam(L, 'modo:economia').count() === 1, 'com a economia ligada: o modo Economia');
    await naCam(L, 'modo:economia').click(); await espera(500);
    const cores = await A(L, () => { const m = __mundo.App.vista(), C = window.MundoCamadas; return ['p1', 's2', 'p2'].map(id => (C.modoDaRegiao(m, m.objs.find(o => o.id === id), true) || {}).cor); });
    ok((await fillDe(L, 's2')).fill === cores[1] && /m-economia/.test((await fillDe(L, 's2')).cls) && /m-zero/.test((await fillDe(L, 'p2')).cls) && Number((await fillDe(L, 'p2')).op) === 0, 'Economia: cada região pela produção do recurso (o Ermo, sem produção, só com a borda): ' + j(cores));
    ok((await fillDe(L, 's2')).fill === await A(L, () => __mundo.App.mapa.eco.rec.find(r => r.id === 'lapros').cor), 'a Prefeitura (a que mais produz Lapros: a vila) com a cor inteira do recurso');
    const leg = await A(L, () => document.getElementById('modoLeg').innerText.replace(/\s+/g, ' '));
    const topo = await A(L, () => { const m = __mundo.App.vista(), R = window.MundoReino; return Math.max(...m.objs.filter(o => o.k === 'r').map(o => R.producaoPropria(m, o).total.lapros || 0)); });
    ok(/^Modo do mapa: Economia Político Recurso/.test(leg) && await L.F.locator('#modoLeg [data-k="modo-rec"]').count() === 1 && topo === 21 && leg.includes(' 21 por semana'), 'a legenda: o recurso escolhido e a escala (até a maior parte própria, 21): ' + leg);
    await L.F.locator('#modoLeg [data-k="modo-rec"]').selectOption('madeira'); await espera(500);
    const cm = await A(L, () => { const m = __mundo.App.vista(), C = window.MundoCamadas; return (C.modoDaRegiao(m, m.objs.find(o => o.id === 's2'), true) || {}).rec; });
    ok(cm === 'madeira' && /^Modo do mapa: Economia/.test(await A(L, () => document.getElementById('modoLeg').innerText)), 'trocar o recurso na legenda: a Madeira');
    const fm = await fillDe(L, 's2'), corMad = await A(L, () => __mundo.App.mapa.eco.rec.find(r => r.id === 'madeira').cor);
    ok(fm.fill === corMad && await A(L, () => JSON.parse(localStorage.getItem('tinycats:mundo:camadas')).rec) === 'madeira', 'o mapa pinta pela Madeira (a Prefeitura, com as florestas, é a que mais produz), e a escolha fica neste aparelho: ' + j([fm.fill, corMad]));
    await L.P.reload({ waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto && __mundo.App.mapa && document.getElementById('zCamadas'), null, { timeout: 15000 }); await espera(400);
    ok(await A(L, () => { const C = window.MundoCamadas, r = C.recDoModo(__mundo.App.vista()); return C.modoAtual(true) === 'economia' && !!r && r.id === 'madeira'; }) && (await fillDe(L, 's2')).fill === corMad, 'recarregando a página: o modo Economia, com a Madeira');
    await camadas(L, false);
    await semAvisos(L); await foto('l10-modo-economia');
    // desligar
    await aba(L, 'faccoes');
    await botao(L, 'eco:desligar');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => __mundo.App.mapa.eco.on === false && __mundo.App.mapa.eco.rec.length === 6) && await campo(L, 'eco:ligar').count() === 1, 'desligar: tudo fica guardado, e o botão liga de novo');
    ok(await A(L, () => document.getElementById('modoLeg').hidden) && !(await A(L, () => !!document.querySelector('#mundo svg .reg.m-economia'))), 'desligada: o modo Economia volta ao Político');
    await aba(L, 'selecao'); await selecionar(L, 'vl');
    ok(!/Assentamento/i.test(await textoPane(L)), 'e o marcador sem a seção Assentamento');
    await selecionar(L, null);
  });

  if (parte('construcoes')) await passo('as construções', async () => {
    // a economia ligada, montanhas no Reino, a Cidade Alta (no Reino, fora das sub-regiões) e o estoque de Aldar
    await A(L, () => {
      const { App, N } = __mundo, R = window.MundoReino;
      App.mudar('a economia e a cidade', m => {
        R.ligarEconomia(m);
        if (!m.eco.cons.length) m.eco.cons = R.catalogoPronto(m, m.eco);
        m.objs.push(Object.assign(N.objNovo('m', { x: 700, y: 650, ic: 'castelo' }), { id: 'cid', nome: 'Cidade Alta', ass: { niv: 'cidade', pop: 0 } }));
        const fa = m.faccoes.find(f => f.id === 'fa');
        for (const [id, n] of [['lapros', 200], ['madeira', 100], ['pedra', 100], ['orith', 30]]) fa.rec.find(r => r.id === id).n = n;
      });
      const p1 = App.mapa.objs.find(o => o.id === 'p1'), hp = R.hexesProprios(App.mapa, p1).filter(k => { const c = N.centroHex(App.mapa, +k.split(',')[0], +k.split(',')[1]); return c.y > 560; });
      App.mudar('montanhas', m => { hp.slice(0, 4).forEach(k => { m.hexes[k] = 'mo'; }); });
    });
    // o catálogo
    await aba(L, 'faccoes');
    ok(/Construções do catálogo \(15\)/i.test(await textoPane(L)) && await campo(L, 'eco:cons-ver').count() === 1, 'na Economia do mundo: "Construções do catálogo (15)", com "Mostrar o catálogo"');
    await botao(L, 'eco:cons-ver');
    const mina = await A(L, () => { const e = document.querySelector('#pane [data-k="eco:c:mina"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    ok(await L.F.locator('#pane .eco-cons .cons-li').count() === 15 && /Mina de Orith 1 espaço · 3 níveis · em Colina ou Montanha Nível 1: Orith \+3 · custa Lapros 20 · Madeira 15 · Pedra 10 · 4 semanas/.test(mina), 'o catálogo aberto: as 15, cada uma com os espaços, os níveis, as exigências e o nível 1: ' + mina);
    // editar: o número errado não passa; um nível a mais; salvar (e desfazer)
    await botao(L, 'eco:c:taverna:editar');
    await L.F.waitForSelector('dialog.ct-dl[open]');
    const ct = k => L.F.locator(`dialog.ct-dl[open] [data-k="${k}"]`);
    ok(await ct('ct:nome').inputValue() === 'Taverna' && await ct('ct:1:prod:lapros').inputValue() === '3' && await L.F.locator('dialog.ct-dl[open] fieldset.ct-nivel').count() === 3, 'editar a Taverna: o nome, os 3 níveis (o 1 produz 3 Lapros)');
    await ct('ct:nome').fill('Taverna do Gato'); await ct('ct:1:prod:lapros').fill('4,5'); await ct('ct:2:custo:madeira').fill('abc');
    await ct('ct:ok').click(); await espera(250);
    ok(/Nível 2, custa, Madeira: use um número\./.test(await A(L, () => document.querySelector('dialog.ct-dl[open] .err').textContent)), 'um número que não é número: a janela diz onde, e não fecha');
    await ct('ct:2:custo:madeira').fill('15');
    await ct('ct:niv-novo').click(); await espera(150);
    ok(await L.F.locator('dialog.ct-dl[open] fieldset.ct-nivel').count() === 4 && await ct('ct:4:prod:lapros').inputValue() === await ct('ct:3:prod:lapros').inputValue(), '+ Nível: o 4, começando igual ao 3');
    await ct('ct:4:prod:lapros').fill('12');
    await ct('ct:ok').click(); await espera(400);
    const tav = await A(L, () => JSON.parse(JSON.stringify(__mundo.App.mapa.eco.cons.find(c => c.id === 'taverna'))));
    ok(tav.nome === 'Taverna do Gato' && tav.niveis.length === 4 && tav.niveis[0].prod.lapros === 4.5 && tav.niveis[3].prod.lapros === 12, 'salvar: o nome, 4,5 Lapros no nível 1 e o nível 4: ' + j([tav.nome, tav.niveis.map(x => x.prod)]));
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok(await A(L, () => __mundo.App.mapa.eco.cons.find(c => c.id === 'taverna').nome) === 'Taverna', 'desfazer: a Taverna como era');
    // criar uma construção nova e tirá-la
    await botao(L, 'eco:cons-novo');
    await L.F.waitForSelector('dialog.ct-dl[open]');
    await ct('ct:nome').fill('Moinho'); await ct('ct:ic').selectOption('jardim'); await ct('ct:ter:pl').check(); await ct('ct:cons').selectOption('fazenda');
    await ct('ct:1:custo:madeira').fill('5'); await ct('ct:1:prod:suprimentos').fill('2'); await ct('ct:1:sem').fill('1');
    await semAvisos(L); await foto('l10-catalogo');
    await ct('ct:ok').click(); await espera(400);
    const mo = await A(L, () => { const c = __mundo.App.mapa.eco.cons.find(x => x.nome === 'Moinho'); return c ? JSON.parse(JSON.stringify(c)) : null; });
    ok(!!mo && mo.ic === 'jardim' && j(mo.exige) === j({ niv: null, ter: ['pl'], cons: 'fazenda' }) && j(mo.niveis) === j([{ custo: { madeira: 5 }, sem: 1, prod: { suprimentos: 2 }, gasto: {}, def: 0, ef: '' }]), 'criar o Moinho: o ícone, as exigências (planície, depois da Fazenda) e o nível: ' + j(mo));
    await botao(L, 'eco:c:' + mo.id + ':x');
    ok(await A(L, () => !__mundo.App.mapa.eco.cons.some(c => c.nome === 'Moinho')), 'tirar o Moinho (ninguém usa: sem perguntar)');
    // construir na Cidade Alta
    await aba(L, 'selecao'); await selecionar(L, 'cid');
    ok(/Construções · 0 de 6 espaços/.test(await textoPane(L)) && await campo(L, 'o:cid:construir').count() === 1, 'no assentamento: "Construções · 0 de 6 espaços" e "+ Construir…"');
    await botao(L, 'o:cid:construir');
    await L.F.waitForSelector('dialog.ob-dl[open]');
    const ob = k => L.F.locator(`dialog.ob-dl[open] [data-k="${k}"]`);
    const ops = await A(L, () => Array.from(document.querySelectorAll('dialog.ob-dl[open] [data-k="ob:tipo"] option')).map(o => [o.value, o.disabled, o.textContent]));
    const op = id => ops.find(o => o[0] === id) || [];
    ok(op('porto')[1] === true && /Porto — precisa de Água na região/.test(op('porto')[2]) && op('mina')[1] === false && op('muralha')[1] === false, 'a janela: o Porto não dá (sem água na região); a Mina e a Muralha dão: ' + j([op('porto'), op('mina')]));
    await ob('ob:tipo').selectOption('mina'); await espera(150);
    const det = await A(L, () => document.querySelector('dialog.ob-dl[open] .dl').innerText.replace(/\s+/g, ' '));
    ok(/4 semanas de obra · custa Lapros 20 · Madeira 15 · Pedra 10/.test(det) && /Pronta, por semana: Orith \+3/.test(det) && /Estoque de Aldar: Lapros 200 · Madeira 100 · Pedra 100/.test(det) && await ob('ob:fac').inputValue() === 'fa', 'a Mina: as semanas, o custo, o que faz e o estoque de quem paga (Aldar, a dona do lugar): ' + det.slice(0, 260));
    await semAvisos(L); await foto('l10-obra');
    await ob('ob:ok').click(); await espera(400);
    const st1 = await A(L, () => { const m = __mundo.App.mapa, c = m.objs.find(o => o.id === 'cid').ass.cons[0], fa = m.faccoes.find(f => f.id === 'fa'); return { c, est: ['madeira', 'pedra', 'lapros'].map(id => fa.rec.find(r => r.id === id).n), mot: fa.hist[fa.hist.length - 1].mot }; });
    ok(st1.c.t === 'mina' && st1.c.n === 0 && st1.c.obra.sem === 4 && j(st1.est) === j([85, 90, 180]) && st1.mot === 'Obra: Mina de Orith em Cidade Alta' && /Mina de Orith: a obra começou \(4 semanas\)\./.test(await avisos(L)), 'começar: a obra (4 semanas), o custo saiu do estoque de Aldar (com o motivo no histórico) e o aviso: ' + j(st1));
    const cid0 = st1.c.id;
    await campo(L, 'cons:' + cid0 + ':sem').fill('2'); await campo(L, 'cons:' + cid0 + ':sem').press('Enter'); await espera(300);
    ok(await A(L, () => __mundo.App.mapa.objs.find(o => o.id === 'cid').ass.cons[0].obra.sem) === 2, 'as semanas que faltam: 2');
    await botao(L, 'cons:' + cid0 + ':terminar');
    const li = await A(L, id => { const e = document.querySelector('#pane [data-k="cons:' + id + '"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }, cid0);
    ok(/Mina de Orith nível 1 de 3 · Orith \+3/.test(li) && /Construções · 1 de 6 espaços/.test(await textoPane(L)), 'terminar a obra: a Mina no nível 1, produzindo: ' + li);
    // subir de nível, de graça; cancelar a obra
    await botao(L, 'cons:' + cid0 + ':subir');
    await L.F.waitForSelector('dialog.ob-dl[open]');
    await ob('ob:fac').selectOption('');
    const det2 = await A(L, () => document.querySelector('dialog.ob-dl[open] .dl').innerText.replace(/\s+/g, ' '));
    ok(/Subir Mina de Orith para o nível 2/.test(det2) && /No nível 2, por semana: Orith \+5 \(agora: Orith \+3\)/.test(det2) && /Ninguém paga: a obra sai de graça\./.test(det2), 'subir para o nível 2: o que muda e, sem ninguém pagando, de graça: ' + det2.slice(0, 200));
    await ob('ob:ok').click(); await espera(400);
    ok(await A(L, () => { const m = __mundo.App.mapa, c = m.objs.find(o => o.id === 'cid').ass.cons[0]; return c.n === 1 && c.obra && c.obra.n === 2 && m.faccoes[0].rec.find(r => r.id === 'lapros').n === 180; }), 'a obra do nível 2 começou, e o estoque não mudou');
    await botao(L, 'cons:' + cid0 + ':cancelar');
    ok(/A obra do nível 2 para; Mina de Orith continua no nível 1\./.test(await A(L, () => document.querySelector('dialog.mundo-dl[open]').innerText)), 'cancelar pergunta antes, dizendo o que acontece');
    await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => { const c = __mundo.App.mapa.objs.find(o => o.id === 'cid').ass.cons[0]; return c.n === 1 && !c.obra; }), 'cancelada: a Mina continua no nível 1');
    // o que falta: sem pagar, dá
    await A(L, () => __mundo.App.mudar('pouca pedra', m => { m.faccoes[0].rec.find(r => r.id === 'pedra').n = 5; }));
    await botao(L, 'o:cid:construir');
    await L.F.waitForSelector('dialog.ob-dl[open]');
    await ob('ob:tipo').selectOption('muralha'); await espera(150);
    const falta = await A(L, () => document.querySelector('dialog.ob-dl[open] [data-k="ob:falta"]').textContent);
    ok(/^Falta: Pedra 35\./.test(falta) && await ob('ob:ok').isDisabled(), 'a Muralha sem pedra bastante: diz o que falta, e não começa: ' + falta);
    await ob('ob:fac').selectOption(''); await espera(100);
    ok(!(await ob('ob:ok').isDisabled()), 'escolhendo "Ninguém (de graça)", dá');
    await L.F.click('dialog.ob-dl[open] button.btn:not(.pri)'); await espera(200);
    // a Paliçada, de graça: a defesa na Fortificação e na batalha
    await botao(L, 'o:cid:construir');
    await L.F.waitForSelector('dialog.ob-dl[open]');
    await ob('ob:tipo').selectOption('palicada'); await ob('ob:fac').selectOption(''); await ob('ob:ok').click(); await espera(400);
    const pal = await A(L, () => __mundo.App.mapa.objs.find(o => o.id === 'cid').ass.cons.find(c => c.t === 'palicada').id);
    await botao(L, 'cons:' + pal + ':terminar');
    ok(/As construções daqui \(aba Seleção, Assentamento\) somam \+1 de defesa: quem defende aqui já ganha isso na batalha\./.test(await textoPane(L)), 'a Fortificação: as construções somam +1 de defesa');
    await A(L, () => __mundo.App.mudar('dois exércitos perto da cidade', m => {
      const { N } = __mundo;
      m.objs.push(Object.assign(N.objNovo('g', { x: 700, y: 650, sigla: 'GD' }), { id: 'gd', nome: 'Guarda da Cidade', tipo: 'exercito', fac: 'fa', exe: { moral: 5, mant: 20, unid: [{ id: 'd1', nome: 'Guardas', tropas: 100 }] } }),
        Object.assign(N.objNovo('g', { x: 742, y: 650, sigla: 'IV' }), { id: 'ge', nome: 'Invasores', tipo: 'exercito', fac: 'fb', exe: { moral: 5, mant: 20, unid: [{ id: 'e1', nome: 'Saqueadores', tropas: 100 }] } }));
    }));
    await selecionar(L, 'ge');
    await botao(L, 'o:ge:batalha');
    await L.F.waitForSelector('dialog.gb[open]');
    const fts = await A(L, () => Array.from(document.querySelectorAll('dialog.gb[open] [data-k="gb:estr"] option')).map(o => o.textContent));
    const tb = await A(L, () => document.querySelector('dialog.gb .gb-corpo').innerText.replace(/\s+/g, ' '));
    ok(fts.some(t => /defende Cidade Alta/.test(t)) && /Fortificação \+1/.test(tb), 'na batalha ao lado da cidade: quem defende a Cidade Alta ganha a defesa da Paliçada: ' + j(fts));
    await L.P.keyboard.press('Escape'); await espera(300);
    await A(L, () => { const d = document.querySelector('dialog.gb[open]'); if (d) d.close(); });
    await A(L, () => __mundo.App.mudar('os exércitos saem', m => { m.objs = m.objs.filter(o => o.id !== 'gd' && o.id !== 'ge'); }));
    // a produção da província
    await selecionar(L, 'p1');
    const prod = await A(L, () => Array.from(document.querySelectorAll('#pane [data-k="o:p1:prod"] .prod-li')).map(e => e.innerText.replace(/\s+/g, ' ')));
    ok(prod.some(x => /^Orith \+\d+(,\d+)? terreno \+\d+ · construções \+3$/.test(x)), 'a produção da província: a Mina entra como "construções +3": ' + j(prod));
    // a sede do clã: os clãs deste navegador
    await A(L, () => {
      localStorage.setItem('tinycats:cla:local', JSON.stringify({ 'cla:c:clx': { nome: 'Clã do Gato', faccao: { id: 'fb', nome: 'Vale' }, construcoes: [{ id: 'k1', nome: 'Forja', ico: 'forja', nivel: 2, efeito: 'Armas melhores', prox: {} }] } }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'tinycats:cla:local' }));
    });
    await espera(300);
    await selecionar(L, 'cid');
    ok(await A(L, () => Array.from(document.querySelectorAll('#pane [data-k="o:cid:cla"] option')).map(o => o.textContent).join('|')) === 'Não é sede de clã|Clã do Gato', 'a sede de clã: os clãs deste navegador');
    await campo(L, 'o:cid:cla').selectOption('clx'); await espera(300);
    const sede = await textoPane(L);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.objs.find(o => o.id === 'cid').ass.cla)) === j({ id: 'clx', prod: {} }) && /O que elas produzem vai para Vale \(a facção ligada ao clã\)\./.test(sede) && /Forja nível 2 · não produz Armas melhores/.test(sede), 'a Cidade Alta é a sede do Clã do Gato: a Forja (nível 2), produzindo para o Vale');
    await botao(L, 'cla:k1:prod');
    await L.F.fill('dialog.mundo-dl[open] #dl-orith', '2'); await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.objs.find(o => o.id === 'cid').ass.cla.prod)) === j({ k1: { orith: 2 } }) && /Forja nível 2 · Orith \+2 por semana/.test(await textoPane(L)), 'a produção da Forja: 2 de Orith por semana');
    await A(L, () => { const e = document.querySelector('#pane [data-k="o:cid:esp"]'); if (e) e.scrollIntoView({ block: 'start' }); });
    await semAvisos(L); await foto('l10-construcoes');
    await aba(L, 'faccoes');
    const lvb = await A(L, () => { const e = document.querySelector('#pane [data-k="livro:fb"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/Produz por semana: Orith 2/.test(lvb), 'no Livro, o Vale produz os 2 de Orith da Forja do clã: ' + lvb);
    await A(L, () => localStorage.removeItem('tinycats:cla:local'));
    await aba(L, 'selecao'); await selecionar(L, null);
  });

  if (parte('semana')) await passo('fechar a semana', async () => {
    await A(L, () => {
      const { App, N } = __mundo, R = window.MundoReino;
      App.mudar('a economia e a semana', m => {
        R.ligarEconomia(m);
        if (!m.eco.cons.length) m.eco.cons = R.catalogoPronto(m, m.eco);
        const fa = m.faccoes.find(f => f.id === 'fa');
        fa.apoio = 70;
        for (const [id, n] of [['lapros', 30], ['suprimentos', 20]]) fa.rec.find(r => r.id === id).n = n;
        m.objs.push(Object.assign(N.objNovo('m', { x: 850, y: 700, ic: 'vila' }), { id: 'vs', nome: 'Vila do Sul', ass: { niv: 'vila', pop: 0, cons: [{ id: 'kt', t: 'templo', n: 0, obra: { n: 1, sem: 2, fac: 'fa', pago: {} } }] } }));
      });
    });
    await aba(L, 'faccoes');
    const caixa = () => A(L, () => { const e = document.querySelector('#pane [data-k="eco:sem"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    ok(/^A semana está aberta Ela fecha na virada de domingo \(.+\) para segunda: a prévia abre sozinha\.$/.test(await caixa()) && await campo(L, 'eco:manut').count() === 1 && await campo(L, 'eco:regras').count() === 1,
      'na Economia do mundo: a semana aberta, "Manutenção dos exércitos…" e "Regras da falta…": ' + await caixa());
    // a manutenção dos exércitos (a das unidades sem tipo: 1 de comida e 1 de moeda a cada 10, de começo)
    await botao(L, 'eco:manut');
    await L.F.waitForSelector('dialog.eco-dl[open]');
    ok(await A(L, () => [document.querySelector('dialog.eco-dl[open] [data-k="tab:_:suprimentos"]').value, document.querySelector('dialog.eco-dl[open] [data-k="tab:_:lapros"]').value].join()) === '1,1', 'a tabela da manutenção: as unidades sem tipo, 1 de Suprimentos e 1 de Lapros a cada 10');
    await L.F.fill('dialog.eco-dl[open] [data-k="tab:_:lapros"]', '-1'); await L.F.click('dialog.eco-dl[open] button[type="submit"]'); await espera(200);
    ok(/Sem tipo de tropa, Lapros: use 0 ou mais\./.test(await A(L, () => document.querySelector('dialog.eco-dl[open] .err').textContent)), 'número negativo na manutenção: não passa');
    await L.F.fill('dialog.eco-dl[open] [data-k="tab:_:lapros"]', '2'); await L.F.click('dialog.eco-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa.eco.manut0)) === j({ lapros: 2, suprimentos: 1 }), 'salvar: 2 de Lapros a cada 10 soldados sem tipo: ' + await A(L, () => JSON.stringify(__mundo.App.mapa.eco.manut0)));
    // as regras da falta
    await botao(L, 'eco:regras');
    await L.F.fill('dialog.mundo-dl[open] #dl-fome', '15'); await L.F.click('dialog.mundo-dl[open] button[type="submit"]'); await espera(400);
    ok(await A(L, () => __mundo.App.mapa.eco.regras.fome) === 15, 'as regras da falta: a fome tira 15 de apoio');
    // o calendário passa de domingo para segunda: a prévia abre sozinha
    await aba(L, 'hoje'); await semAvisos(L);
    await L.F.click('#pane [data-k="hoje:+7"]');
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    const esp = await A(L, () => { const { App } = __mundo, R = window.MundoReino, p = R.semanaPrevia(App.mapa, id => App.infoDoCla(id)), pf = p.fac.find(x => x.id === 'fa'); return { pf, cons: p.cons.map(c => c.id), sem: App.mapa.eco.sem }; });
    const linhaFa = await A(L, () => { const e = document.querySelector('dialog.sem-dl[open] [data-k="sem:fac:fa"] tr[data-rec="lapros"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    ok(await A(L, () => /^Fechar a semana De Segunda-Feira, .+ a Domingo, .+\. Nada muda até você aplicar\./.test(document.querySelector('dialog.sem-dl[open] .dl').innerText.replace(/\s+/g, ' ')))
      && new RegExp('^Lapros 30 ' + (esp.pf.prod.lapros ? '\\+[\\d,]+ ' : '— ') + '−84 0 [\\d,]+$').test(linhaFa) && esp.pf.falta.lapros > 0 && esp.pf.falta.suprimentos > 0,
      'a prévia abriu sozinha: Aldar com 30 de Lapros, a manutenção da Hoste (420 sem tipo: −84), fica 0 e falta: ' + linhaFa);
    ok(j(esp.cons) === j(['fome:fa', 'obras:fa', 'moral:ga']) && /Fome: o apoio de Aldar cai 15 \(de 70% para 55%\)\./.test(await A(L, () => document.querySelector('dialog.sem-dl[open] .sem-conss').innerText)), 'as consequências: a fome (apoio 70% → 55%), as obras paradas e a moral da Hoste: ' + j(esp.cons));
    const obra = () => A(L, () => { const e = document.querySelector('dialog.sem-dl[open] [data-k="sem:obra:kt"]'); return e ? e.textContent : ''; });
    ok(await obra() === 'Templo em Vila do Sul: parada (falta moeda)', 'a obra do Templo: parada (falta moeda)');
    await L.F.locator('dialog.sem-dl[open] [data-k="sem:c:obras:fa"]').uncheck(); await espera(100);
    ok(await obra() === 'Templo em Vila do Sul: falta 1 semana', 'desmarcando "as obras param", o Templo anda: ' + await obra());
    await semAvisos(L); await foto('l10-semana');
    await L.F.click('dialog.sem-dl[open] [data-k="sem:aplicar"]'); await espera(500);
    const dep = await A(L, () => { const m = __mundo.App.mapa, fa = m.faccoes.find(f => f.id === 'fa'); return { lap: fa.rec.find(r => r.id === 'lapros').n, sup: fa.rec.find(r => r.id === 'suprimentos').n, apoio: fa.apoio, moral: m.objs.find(o => o.id === 'ga').exe.moral, obra: m.objs.find(o => o.id === 'vs').ass.cons[0].obra.sem, sem: m.eco.sem, pend: window.MundoReino.semanasPendentes(m) }; });
    ok(dep.lap === 0 && dep.sup === 0 && dep.apoio === 55 && dep.moral === 4 && dep.obra === 1 && dep.sem === esp.sem + 1 && dep.pend === 0 && /Semana fechada \(até .+\)\./.test(await avisos(L)) && !(await A(L, () => !!document.querySelector('dialog.sem-dl[open]'))),
      'aplicar: os estoques zerados, o apoio 55%, a moral 4, o Templo andou, a semana fechou (e o aviso): ' + j(dep));
    // desfazer; fechar pelo botão
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    await aba(L, 'faccoes');
    ok(await A(L, () => window.MundoReino.semanasPendentes(__mundo.App.mapa)) === 1 && /^1 semana para fechar de .+ a .+\. Fechar a semana…$/.test(await caixa()), 'desfazer: a semana volta a estar para fechar (com o botão): ' + await caixa());
    await botao(L, 'eco:semana');
    await L.F.waitForSelector('dialog.sem-dl[open]');
    await L.F.click('dialog.sem-dl[open] [data-k="sem:aplicar"]'); await espera(500);
    ok(await A(L, () => __mundo.App.mapa.objs.find(o => o.id === 'vs').ass.cons[0].obra.sem) === 2, 'fechando pelo botão, com tudo valendo: o Templo fica parado');
    // duas semanas pendentes: uma de cada vez
    await A(L, () => __mundo.App.mudar('duas semanas', m => { m.cal.dia += 14; }));
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    ok(/Depois desta, mais 1 semana para fechar\./.test(await A(L, () => document.querySelector('dialog.sem-dl[open] [data-k="sem:quando"]').textContent)), 'duas semanas: a prévia da primeira diz que vem mais uma');
    await L.F.click('dialog.sem-dl[open] [data-k="sem:aplicar"]'); await espera(900);
    ok(await A(L, () => !!document.querySelector('dialog.sem-dl[open]') && !/Depois desta/.test(document.querySelector('dialog.sem-dl[open] [data-k="sem:quando"]').textContent)), 'aplicada a primeira, a prévia da segunda aparece');
    await L.F.click('dialog.sem-dl[open] button.btn:not(.pri)'); await espera(300);
    ok(await A(L, () => window.MundoReino.semanasPendentes(__mundo.App.mapa)) === 1 && /^1 semana para fechar/.test(await caixa()), '"Agora não": a segunda fica para fechar');
    await aba(L, 'selecao');
  });

  // ---------- a bandeira própria da facção (sem clã) ----------
  if (parte('bandeira')) await passo('a bandeira da facção', async () => {
    const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await L.P.route('https://exemplo.invalid/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await A(L, () => { __mundo.App.brasoes = new Map(); __mundo.App.comoJogador = false; __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(250);
    await aba(L, 'faccoes');
    const contar = id => A(L, id => document.querySelectorAll(`#mundo svg [data-id="${id}"] .bandeira`).length, id);
    const desenho = id => A(L, id => { const b = document.querySelector(`#mundo svg [data-id="${id}"] .bandeira`); return b ? b.innerHTML : ''; }, id);
    const bandFb = () => A(L, () => __mundo.App.mapa.faccoes.find(f => f.id === 'fb').band || null);
    ok(await contar('s1') === 0 && await L.F.locator('#pane [data-k="fac:fb"] .fac-band').count() === 0, 'sem bandeira: nada no mapa nem na lista');
    await L.F.click('#pane [data-k="fac:fb"]'); await espera(250);
    ok(/Bandeira Sem bandeira\. Crie uma aqui \(forma, cores e símbolo, como o brasão de um clã\)/.test(await textoPane(L)) && await campo(L, 'f:fb:band').count() === 1 && await campo(L, 'f:fb:band-tirar').count() === 0,
      'no editor do Vale: "Sem bandeira" e "Criar a bandeira…"');
    // a janela: a bandeira de começo
    const D = sel => 'dialog.band-dl[open] ' + sel;
    const estado = () => A(L, () => {
      const d = document.querySelector('dialog.band-dl[open]');
      if (!d) return null;
      const p = s => [...d.querySelectorAll(s + '[aria-pressed="true"]')].map(e => e.getAttribute(s.slice(1, -1)));
      return { esc: [p('[data-forma]'), p('[data-div]'), p('[data-alvo]'), p('[data-cor]'), p('[data-simb]')], previa: d.querySelector('[data-k="band:previa"]').innerHTML, ok: d.querySelector('[data-k="band:ok"]').textContent,
        nota: d.querySelector('[data-k="band:img-nota"]').textContent, img: !d.querySelector('[data-k="band:img"]').hidden, semImg: !d.querySelector('[data-k="band:sem-img"]').hidden, cla: !!d.querySelector('[data-k="band:cla"]'), titulo: d.querySelector('h2').textContent };
    });
    await botao(L, 'f:fb:band');
    await L.F.waitForSelector('dialog.band-dl[open]');
    let e = await estado();
    ok(e.titulo === 'A bandeira de Vale' && j(e.esc) === j([['estandarte'], ['partido'], ['0'], ['#8a2a2a'], ['']]) && /#8a2a2a/i.test(e.previa) && /#d9a441/i.test(e.previa) && e.ok === 'Criar a bandeira' && !e.cla,
      'a janela abre com a de começo: um estandarte partido na cor do Vale e no dourado, sem símbolo: ' + j(e.esc));
    ok(!e.img && !e.semImg && e.nota === 'Uma imagem no lugar do desenho só dá para usar numa mesa.', 'sem mesa: nada de imagem (e o aviso): ' + e.nota);
    // escolher: a forma, a divisão, a segunda cor, o símbolo; a primeira cor em "Outra"
    for (const s of ['[data-forma="escudo"]', '[data-div="cortado"]', '[data-alvo="1"]', '[data-cor="#2f6b45"]', '[data-simb="lua"]']) await L.F.click(D(s));
    await espera(120);
    e = await estado();
    ok(j(e.esc) === j([['escudo'], ['cortado'], ['1'], ['#2f6b45'], ['lua']]) && /#2f6b45/i.test(e.previa) && !/#d9a441/i.test(e.previa), 'a forma, a divisão, a segunda cor e o símbolo: a prévia muda: ' + j(e.esc));
    await L.F.click(D('[data-alvo="0"]')); await L.F.locator(D('[data-k="band:outra"]')).fill('#123456'); await espera(120);
    e = await estado();
    ok(j(e.esc[3]) === '[]' && /#123456/i.test(e.previa), 'a primeira cor em "Outra": nenhuma da paleta marcada, a prévia com ela');
    ok(await contar('s1') === 0 && !(await bandFb()), 'nada muda no mapa antes de criar');
    // no celular, a janela cabe na largura
    await L.P.setViewportSize({ width: 400, height: 820 }); await espera(300);
    const cabe = await A(L, () => { const d = document.querySelector('dialog.band-dl[open]'), r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && d.scrollWidth <= d.clientWidth + 1; });
    ok(cabe, 'no celular (400 px): a janela cabe na largura, sem rolar para o lado');
    await semAvisos(L); await foto('l10-bandeira-celular');
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
    await foto('l10-bandeira-janela');
    await L.F.click(D('[data-k="band:ok"]')); await espera(450);
    ok(j(await bandFb()) === j({ forma: 'escudo', div: 'cortado', cores: ['#123456', '#2f6b45'], simb: 'lua', img: null }) && /A bandeira de Vale está pronta\./.test(await avisos(L)) && !(await estado()),
      'criar a bandeira: fica na facção, a janela fecha e o aviso (com Desfazer): ' + j(await bandFb()));
    ok(await contar('s1') === 1 && /#2f6b45/i.test(await desenho('s1')) && await contar('p1') === 0, 'no mapa: a bandeira no meio da sub-região do Vale (e não na província de Aldar)');
    ok(await L.F.locator('#pane [data-k="fac:fb"] .fac-band').count() === 1 && await L.F.locator('#pane .fac-band-campo .fac-band').count() === 1 && await L.F.locator('#pane [data-k="livro:fb"] .fac-band').count() === 1,
      'na aba Reinos: a bandeira na lista, no editor e no Livro do reino (no lugar da bolinha)');
    ok(/A bandeira desta facção: aparece no meio das regiões dela/.test(await textoPane(L)) && await A(L, () => document.querySelector('#pane [data-k="f:fb:band"]').textContent) === 'Editar a bandeira…' && await campo(L, 'f:fb:band-tirar').count() === 1,
      'o editor: "Editar a bandeira…" e "Tirar a bandeira"');
    await semAvisos(L); await foto('l10-bandeira-reinos');
    await A(L, () => document.querySelector('#pane [data-k="livro:fb"]').scrollIntoView({ block: 'center' })); await espera(150);
    await foto('l10-bandeira-livro');
    // editar e cancelar (ou Esc): nada muda
    await botao(L, 'f:fb:band');
    await L.F.waitForSelector('dialog.band-dl[open]');
    e = await estado();
    ok(e.ok === 'Salvar' && j(e.esc) === j([['escudo'], ['cortado'], ['0'], [], ['lua']]), 'editar: a janela abre com a bandeira de agora ("Salvar"): ' + j(e.esc));
    await L.F.click(D('[data-simb="estrela"]')); await L.F.click(D('[data-simb=""]')); await espera(80);
    ok(j((await estado()).esc[4]) === j(['']), '"Nenhum" tira o símbolo (na prévia)');
    await L.F.click(D('[data-k="band:nao"]')); await espera(250);
    ok(!(await estado()) && (await bandFb()).simb === 'lua', 'Cancelar: a janela fecha e nada muda');
    await botao(L, 'f:fb:band'); await L.F.waitForSelector('dialog.band-dl[open]');
    await L.F.click(D('[data-simb="estrela"]')); await L.P.keyboard.press('Escape'); await espera(250);
    ok(!(await estado()) && (await bandFb()).simb === 'lua', 'Esc: o mesmo');
    // salvar uma mudança: um passo de Desfazer
    await botao(L, 'f:fb:band'); await L.F.waitForSelector('dialog.band-dl[open]');
    await L.F.click(D('[data-simb="estrela"]')); await semAvisos(L); await L.F.click(D('[data-k="band:ok"]')); await espera(400);
    ok((await bandFb()).simb === 'estrela' && /A bandeira de Vale mudou\./.test(await avisos(L)), 'salvar: a estrela no lugar da lua (e o aviso)');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await bandFb()).simb === 'lua', 'Desfazer (no aviso): a lua volta');
    // uma imagem (o que viria de uma mesa): o mapa a mostra; "Voltar ao desenho"
    await A(L, () => __mundo.App.mudar('a imagem', m => { m.faccoes.find(f => f.id === 'fb').band.img = 'https://exemplo.invalid/vale.png'; })); await espera(350);
    ok(await A(L, () => { const i = document.querySelector('#mundo svg [data-id="s1"] .bandeira image'); return !!i && i.getAttribute('href') === 'https://exemplo.invalid/vale.png'; }), 'com uma imagem: o mapa mostra a imagem no lugar do desenho');
    await botao(L, 'f:fb:band'); await L.F.waitForSelector('dialog.band-dl[open]');
    e = await estado();
    ok(e.semImg && !e.img && /<img/.test(e.previa) && /^Com a imagem, a forma, as cores e o símbolo ficam guardados/.test(e.nota), 'a janela: a imagem na prévia e "Voltar ao desenho" (trocar a imagem, só numa mesa)');
    await L.F.click(D('[data-k="band:sem-img"]')); await espera(120);
    e = await estado();
    ok(!e.semImg && /#2f6b45/i.test(e.previa), '"Voltar ao desenho": a prévia volta ao desenho guardado');
    await L.F.click(D('[data-k="band:ok"]')); await espera(400);
    ok((await bandFb()).img === null && /#2f6b45/i.test(await desenho('s1')), 'salvar: sem a imagem, o mapa volta ao desenho');
    // com um clã ligado ao Vale, vale a bandeira do clã; a própria fica guardada
    const BR = { forma: 'redondo', div: 'liso', cores: ['#5b3f8a', '#e8eaf0'], simb: 'coroa', img: null };
    await A(L, br => { __mundo.App.brasoes = new Map([['fb', br]]); __mundo.App.emit('muda', { origem: 'fora' }); }, BR); await espera(400);
    ok(/#5b3f8a/i.test(await desenho('s1')) && !/#2f6b45/i.test(await desenho('s1')), 'com um clã ligado ao Vale: no mapa, vale a bandeira do clã');
    ok(/A do clã ligado a esta facção: .+ A bandeira própria da facção fica guardada: volta a valer se o clã deixar de ser dela\./.test(await textoPane(L))
      && await A(L, () => document.querySelector('#pane [data-k="f:fb:band"]').textContent) === 'Editar a bandeira própria…' && await campo(L, 'f:fb:band-tirar').count() === 0, 'o editor diz de onde vem e que a própria fica guardada ("Editar a bandeira própria…")');
    await botao(L, 'f:fb:band'); await L.F.waitForSelector('dialog.band-dl[open]');
    ok((await estado()).cla, 'a janela também avisa do clã');
    await L.F.click(D('[data-k="band:nao"]')); await espera(200);
    await A(L, () => { __mundo.App.brasoes = new Map(); __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(400);
    ok(/#2f6b45/i.test(await desenho('s1')), 'o clã sai: a bandeira própria volta a valer');
    // quem joga vê
    await comoJogador(L, true);
    const pub = await A(L, () => (__mundo.App.vista().faccoes.find(f => f.id === 'fb') || {}).band || null);
    ok(pub && pub.cores[1] === '#2f6b45' && await contar('s1') === 1 && await L.F.locator('#pane .fac-band[data-k="fac-band:fb"]').count() >= 1, 'quem joga vê a bandeira do Vale (no mapa e na aba Reinos): ' + j(pub));
    await comoJogador(L, false);
    await aba(L, 'faccoes');
    // na prévia da semana
    await A(L, () => {
      const { App } = __mundo, R = window.MundoReino;
      App.mudar('a economia', m => { if (!m.eco || !m.eco.on) R.ligarEconomia(m); const r = m.faccoes.find(f => f.id === 'fb').rec.find(x => x.id === 'lapros'); if (r) r.n = 5; });
      App.mudar('+7', m => { m.cal.dia += 7; });
    });
    await L.F.waitForSelector('dialog.sem-dl[open]', { timeout: 4000 });
    ok(await L.F.locator('dialog.sem-dl[open] [data-k="sem:fac:fb"] .sem-cab .fac-band').count() === 1, 'na prévia da semana: a bandeira no lugar da bolinha');
    await semAvisos(L); await espera(400); await foto('l10-bandeira-semana');
    await L.F.click('dialog.sem-dl[open] button.btn:not(.pri)'); await espera(250);
    // tirar a bandeira (e desfazer)
    await L.F.click('#pane [data-k="fac:fb"]'); await espera(250);
    if (await campo(L, 'f:fb:band-tirar').count() === 0) { await L.F.click('#pane [data-k="fac:fb"]'); await espera(250); }
    await botao(L, 'f:fb:band-tirar'); await espera(250);
    ok(!(await bandFb()) && await contar('s1') === 0 && /A bandeira de Vale saiu\./.test(await avisos(L)) && /Sem bandeira\./.test(await textoPane(L)), 'tirar a bandeira: sai da facção e do mapa (e o aviso)');
    await L.F.locator('#toasts button', { hasText: 'Desfazer' }).click(); await espera(350);
    ok((await bandFb()) && await contar('s1') === 1, 'Desfazer: volta');
    await aba(L, 'selecao');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
