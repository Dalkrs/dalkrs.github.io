// Mapa-múndi, lote 8 (parte 4): as camadas, pela interface (a página sozinha, no navegador).
//   · o botão Camadas, na caixa do zoom, abre a janelinha: as camadas (lote 10: com as Sub-regiões; lote 17: a Caneta), com quanto há de cada uma, os atalhos e as
//     travas; C abre e fecha, Esc fecha;
//   · esconder uma camada tira do mapa só o que é dela (o evento some com a área e o selo); fica guardado neste
//     aparelho (volta igual ao recarregar) e o ponto no botão avisa;
//   · travar deixa à vista, mas o clique passa: clicar na cidade pega a região embaixo dela;
//   · a lista do painel marca o que está numa camada escondida e, no clique, oferece "Mostrar a camada" (e então vai);
//   · a seleção sai quando a camada some;
//   · criar numa camada escondida ou travada só avisa, com "Mostrar a camada" ou "Destravar" (nada é criado);
//   · os atalhos (Viagem, Política, Guerra, Tudo) mudam o que aparece de uma vez, com o Desfazer; as travas ficam;
//   · o terreno e a grade também se escondem (a ferramenta Terreno ainda mostra a grade);
//   · quem joga também tem; no celular a janelinha cabe na tela.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const espera = ms => new Promise(r => setTimeout(r, ms));
const j = JSON.stringify;

async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }
const A = (a, fn, arg) => a.F.evaluate(fn, arg);
const campo = (a, k) => a.F.locator(`#pane [data-k="${k}"]`);
async function escrever(a, k, v) { const c = campo(a, k); await c.fill(v); await c.press('Enter'); await a.F.waitForTimeout(160); }
async function aba(a, id) { await a.F.click('#tab-' + id); await a.F.waitForTimeout(160); }
async function semAvisos(a) { await A(a, () => document.getElementById('toasts').replaceChildren()); }
const noPop = async (a, k) => { await a.F.click(`#camPop [data-k="${k}"]`); await a.F.waitForTimeout(220); };
const desenhado = (a, id) => A(a, id => document.querySelectorAll(`#mundo svg [data-id="${id}"]`).length, id);
const avisos = a => A(a, () => [...document.querySelectorAll('#toasts .toast')].map(t => ({ texto: t.querySelector('span').textContent, botao: (t.querySelector('button') || {}).textContent || '' })));
async function apertarAviso(a, rotulo) {
  const b = a.F.locator('#toasts .toast button', { hasText: rotulo }).first();
  await b.click(); await a.F.waitForTimeout(260);
}
const linhas = a => A(a, () => [...document.querySelectorAll('#camPop .cam-li')].map(li => ({ id: li.getAttribute('data-cam'), nome: li.querySelector('.cam-nome > span').textContent,
  n: (li.querySelector('.cam-nome small') || {}).textContent || '', ve: (li.querySelector('.cam-olho') || {}).getAttribute('aria-pressed'), trava: li.querySelector('.cam-trava') ? li.querySelector('.cam-trava').getAttribute('aria-pressed') : null })));
const atalhoMarcado = a => A(a, () => { const b = document.querySelector('#camPop .cam-atalhos [aria-pressed="true"]'); return b ? b.getAttribute('data-k') : null; });
const sel = a => A(a, () => __mundo.App.sel.slice());
const quantos = (a, k) => A(a, k => __mundo.App.mapa.objs.filter(o => o.k === k).length, k);
// o meio de um pedaço do desenho de um objeto, na tela
const meio = (a, css) => A(a, css => { const r = document.querySelector(css).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, css);

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'camadas', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };
  const pronto = async () => { await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto && document.getElementById('zCamadas'), null, { timeout: 15000 }); await espera(300); };

  await passo('o mapa com uma coisa de cada camada', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    await aba(L, 'terreno');
    await escrever(L, 'ter:tam', '40');
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        const poe = (k, campos, extra) => m.objs.push(Object.assign(N.objNovo(k, campos), extra));
        poe('r', { pts: [[300, 250], [1000, 250], [1000, 750], [300, 750]] }, { id: 'reg', nome: 'Reino de Aldar', fac: 'fa' });
        poe('m', { x: 600, y: 480, ic: 'cidade' }, { id: 'cid', nome: 'Aldaria' });
        poe('g', { x: 800, y: 560, sigla: 'CAR' }, { id: 'gru', nome: 'Caravana' });
        poe('e', { x: 1300, y: 420, tipo: 'guerra', r: 80, ini: m.cal.dia }, { id: 'eve', nome: 'Saque' });
        poe('t', { pts: [[400, 880], [1250, 900]] }, { id: 'rot', nome: 'Estrada do Sal' });
        poe('l', { pts: [[100, 1000], [700, 1100], [1500, 1050]], estilo: 'rio', larg: 12 }, { id: 'rio', nome: 'Rio Claro' });
        poe('z', { tipo: 'guerra', pts: [[1100, 600], [1500, 600], [1500, 850], [1100, 850]], ini: m.cal.dia }, { id: 'zg', nome: 'Campos de Sangue', a: 'fa', b: 'fb' });
        poe('z', { tipo: 'tempestade', pts: [[1550, 200], [1900, 200], [1900, 500], [1550, 500]], ini: m.cal.dia }, { id: 'zp', nome: 'Tormenta' });
        poe('f', { pts: [[1100, 950], [1600, 1000]] }, { id: 'fr', nome: 'Frente do Rio', a: 'fa', b: 'fb' });
        poe('c', { x: 200, y: 200, ic: 'arvore', tam: 40 }, { id: 'car' });
        poe('x', { x: 1000, y: 1250, tam: 30 }, { id: 'txt', nome: 'Mar das Brumas' });
        const c0 = N.hexDe(m, 1700, 1150);
        for (let q = c0.q - 2; q <= c0.q + 2; q++) for (let r = c0.r - 2; r <= c0.r + 2; r++) m.hexes[q + ',' + r] = 'fl';
        m.pintura = { alfa: 1, ops: [{ t: 'fl', r: 30, pts: [[150, 600], [250, 650]] }] };
        m.grade.on = true;
      });
    });
    await espera(400);
    const ids = ['reg', 'cid', 'gru', 'eve', 'rot', 'rio', 'zg', 'zp', 'fr', 'car', 'txt'], faltam = [];
    for (const id of ids) if (!(await desenhado(L, id))) faltam.push(id);
    ok(!faltam.length, '(o mapa com uma coisa de cada camada, tudo desenhado) ' + j(faltam));
  });

  await passo('o botão e a janelinha', async () => {
    const bt = await A(L, () => { const b = document.getElementById('zCamadas'); return b && { naCaixa: !!b.closest('.zoom'), titulo: b.title, ponto: b.querySelector('.cam-ponto').hidden, exp: b.getAttribute('aria-expanded') }; });
    ok(bt && bt.naCaixa && bt.titulo === 'Camadas (C)' && bt.ponto === true && bt.exp === 'false', 'o botão Camadas fica na caixa do zoom, sem o ponto (nada escondido): ' + j(bt));
    await L.F.click('#zCamadas'); await espera(200);
    ok(await L.F.locator('#camPop').isVisible(), 'o clique abre a janelinha das camadas');
    const ls = await linhas(L);
    ok(j(ls.map(l => l.nome)) === j(['Cidades e grupos', 'Estradas e rios', 'Rotas', 'Eventos', 'Zonas de perigo', 'Regiões', 'Sub-regiões', 'Guerra', 'Textos e carimbos', 'Terreno', 'Grade', 'Caneta']), 'as camadas (lote 10: com as Sub-regiões; lote 17: e a Caneta): ' + j(ls.map(l => l.nome)));
    const n = Object.fromEntries(ls.map(l => [l.id, l.n]));
    ok(n.lugares === '2' && n.linhas === '1' && n.rotas === '1' && n.eventos === '1' && n.perigos === '1' && n.regioes === '1' && n.guerra === '2' && n.enfeites === '2' && n.terreno === '' && n.grade === '',
      'cada uma diz quanto há dela no mapa (a guerra conta a zona e a frente; a tempestade é zona de perigo): ' + j(n));
    ok(ls.every(l => l.ve === 'true') && ls.filter(l => l.trava === null).map(l => l.id).join() === 'grade,desenhos', 'tudo à vista, e todas têm o cadeado (menos a grade e a caneta)');
    ok((await atalhoMarcado(L)) === 'at:tudo', 'o atalho Tudo fica marcado');
    ok(/Só neste aparelho/.test(await L.F.locator('#camPop').innerText()), 'a janelinha diz que vale só neste aparelho');
  });

  await passo('esconder uma camada', async () => {
    await noPop(L, 'olho:eventos');
    ok((await desenhado(L, 'eve')) === 0, 'Eventos escondida: o evento some do mapa (a área e o selo)');
    ok((await desenhado(L, 'cid')) > 0 && (await desenhado(L, 'zp')) > 0 && (await desenhado(L, 'reg')) > 0, 'o resto continua');
    const st = await A(L, () => ({ ls: JSON.parse(localStorage.getItem('tinycats:mundo:camadas')), ponto: document.querySelector('#zCamadas .cam-ponto').hidden, titulo: document.getElementById('zCamadas').title }));
    ok(st.ls && j(st.ls.esc) === j(['eventos']) && j(st.ls.trava) === j([]), 'fica guardado neste aparelho: ' + j(st.ls));
    ok(st.ponto === false && /1 escondida/.test(st.titulo), 'o botão ganha o ponto e diz "1 escondida": ' + st.titulo);
    const l = (await linhas(L)).find(x => x.id === 'eventos');
    ok(l.ve === 'false' && (await atalhoMarcado(L)) === null, 'a linha mostra o olho fechado, e nenhum atalho fica marcado');
    ok(await A(L, () => __mundo.App.mapa.objs.some(o => o.id === 'eve')), 'o evento continua no mapa (só não aparece aqui)');
    // recarregar: continua escondida
    await L.P.reload({ waitUntil: 'load' }); await pronto();
    ok((await desenhado(L, 'eve')) === 0 && (await desenhado(L, 'cid')) > 0, 'recarregando a página, Eventos continua escondida');
    ok(await A(L, () => !document.querySelector('#zCamadas .cam-ponto').hidden && document.getElementById('camPop').hidden), '(o ponto no botão; a janelinha começa fechada)');
  });

  await passo('a lista do painel e a seleção', async () => {
    await semAvisos(L);
    await A(L, () => __mundo.App.selecionar([])); await aba(L, 'selecao');
    const tag = await A(L, () => { const li = document.querySelector('#pane [data-k="li:eve"]'); return li ? (li.querySelector('.tag.cam') || {}).textContent : null; });
    ok(tag === 'camada escondida', 'na lista "O que há no mapa", o evento tem a etiqueta "camada escondida": ' + tag);
    const tagDe = id => A(L, id => { const li = document.querySelector(`#pane [data-k="li:${id}"]`); return li ? (li.querySelector('.tag.cam') || {}).textContent || '' : null; }, id);
    await A(L, () => window.MundoCamadas.mostrar('eventos', true)); await espera(250);
    ok((await tagDe('eve')) === '', 'mostrando a camada, a etiqueta sai da lista na hora');
    await A(L, () => window.MundoCamadas.mostrar('eventos', false)); await espera(250);
    ok((await tagDe('eve')) === 'camada escondida', 'e volta ao esconder');
    await L.F.click('#pane [data-k="li:eve"]'); await espera(260);
    let av = await avisos(L);
    ok(av.some(x => x.texto === 'A camada Eventos está escondida neste aparelho.' && x.botao === 'Mostrar a camada') && (await sel(L)).length === 0,
      'o clique no item avisa que a camada está escondida, com "Mostrar a camada" (nada é escolhido): ' + j(av));
    await apertarAviso(L, 'Mostrar a camada');
    ok((await desenhado(L, 'eve')) > 0 && j(await sel(L)) === j(['eve']), '"Mostrar a camada" mostra os eventos e escolhe o evento');
    // a seleção sai quando a camada some
    await A(L, () => window.MundoCamadas.mostrar('eventos', false)); await espera(250);
    ok((await sel(L)).length === 0, 'escondendo a camada de novo, o evento sai da seleção');
    await A(L, id => __mundo.App.selecionar([id]), 'eve');
    ok((await sel(L)).length === 0, 'e não se escolhe o que está numa camada escondida');
    await A(L, () => window.MundoCamadas.mostrar('eventos', true)); await espera(200);
  });

  await passo('travar', async () => {
    await semAvisos(L);
    await L.F.click('#zCamadas'); await espera(200);
    await noPop(L, 'trava:lugares');
    const st = await A(L, () => ({ cls: document.querySelector('#mundo svg [data-id="cid"]').getAttribute('class'), ls: JSON.parse(localStorage.getItem('tinycats:mundo:camadas')), titulo: document.getElementById('zCamadas').title }));
    ok(/\btrava\b/.test(st.cls) && j(st.ls.trava) === j(['lugares']) && /1 travada/.test(st.titulo), 'Cidades e grupos travada: continua à vista, marcada como travada, e o botão diz "1 travada": ' + j(st));
    ok(await L.F.locator('#camPop [data-k="destravar"]').isVisible(), 'aparece o "Destravar todas"');
    await A(L, () => __mundo.App.selecionar([])); await espera(150);
    await L.F.click('#zCamadas'); await espera(150);                         // (fecha a janelinha)
    const p = await meio(L, '#mundo svg [data-id="cid"] .selo');
    await L.P.mouse.click(p.x, p.y); await espera(300);
    ok(j(await sel(L)) === j(['reg']), 'clicar na cidade travada pega a região embaixo dela: ' + j(await sel(L)));
    await A(L, id => __mundo.App.selecionar([id]), 'cid');
    ok(!(await sel(L)).includes('cid'), 'e a cidade travada não se escolhe: ' + j(await sel(L)));
    // pela lista: avisa e oferece destravar
    await A(L, () => __mundo.App.selecionar([])); await semAvisos(L); await espera(150);
    const tag = await A(L, () => ((document.querySelector('#pane [data-k="li:cid"]') || document.body).querySelector('.tag.cam') || {}).textContent);
    ok(tag === 'camada travada', 'na lista, a cidade tem a etiqueta "camada travada": ' + tag);
    await L.F.click('#pane [data-k="li:cid"]'); await espera(260);
    const av = await avisos(L);
    ok(av.some(x => x.texto === 'A camada Cidades e grupos está travada neste aparelho.' && x.botao === 'Destravar'), 'o clique na cidade da lista avisa que está travada, com "Destravar": ' + j(av));
    await apertarAviso(L, 'Destravar');
    ok(j(await sel(L)) === j(['cid']) && !/\btrava\b/.test(await A(L, () => document.querySelector('#mundo svg [data-id="cid"]').getAttribute('class'))), '"Destravar" destrava a camada e escolhe a cidade');
    await A(L, () => __mundo.App.selecionar([])); await espera(150);
    const p2 = await meio(L, '#mundo svg [data-id="cid"] .selo');                // (o "Destravar" centralizou a cidade)
    await L.P.mouse.click(p2.x, p2.y); await espera(300);
    ok(j(await sel(L)) === j(['cid']), 'destravada, o clique na cidade pega a cidade: ' + j(await sel(L)));
  });

  await passo('criar numa camada escondida ou travada', async () => {
    await A(L, () => __mundo.App.selecionar([])); await semAvisos(L);
    await A(L, () => window.MundoCamadas.mostrar('eventos', false)); await espera(200);
    await A(L, () => __mundo.App.usarFerramenta('e')); await espera(250);
    let av = await avisos(L);
    ok(av.some(x => x.texto === 'A camada Eventos está escondida neste aparelho.' && x.botao === 'Mostrar a camada'), 'escolher a ferramenta Evento com Eventos escondida já avisa: ' + j(av));
    await A(L, () => window.MundoTela.caber()); await espera(300);          // (o mapa inteiro à vista: o ponto vazio fica dentro dele)
    const vazio = await A(L, () => { const r = document.getElementById('palco').getBoundingClientRect(); return { x: r.left + r.width * 0.25, y: r.top + r.height * 0.75 }; });
    ok(await A(L, p => { const q = window.MundoTela.paraMundo(p.x, p.y), m = __mundo.App.mapa; return q.x > 50 && q.y > 50 && q.x < m.larg - 50 && q.y < m.alt - 50; }, vazio), '(o ponto vazio fica dentro do mapa)');
    await semAvisos(L);
    await L.P.mouse.click(vazio.x, vazio.y); await espera(300);
    av = await avisos(L);
    ok((await quantos(L, 'e')) === 1 && av.some(x => x.botao === 'Mostrar a camada'), 'o clique no mapa não cria o evento: só avisa de novo (' + (await quantos(L, 'e')) + ' evento)');
    // arrastar com a ferramenta ainda anda pelo mapa
    const antes = await A(L, () => getComputedStyle(document.getElementById('mundo')).transform);
    await L.P.mouse.move(vazio.x, vazio.y); await L.P.mouse.down(); await L.P.mouse.move(vazio.x + 80, vazio.y - 40, { steps: 6 }); await L.P.mouse.up(); await espera(300);
    ok((await A(L, () => getComputedStyle(document.getElementById('mundo')).transform)) !== antes && (await quantos(L, 'e')) === 1, 'arrastar com a ferramenta continua andando pelo mapa (e não cria nada)');
    await apertarAviso(L, 'Mostrar a camada');
    await L.P.mouse.click(vazio.x, vazio.y); await espera(300);
    ok((await quantos(L, 'e')) === 2, 'mostrada a camada, o clique cria o evento: ' + (await quantos(L, 'e')) + ' ' + j(await avisos(L)) + ' ' + (await A(L, () => __mundo.App.ferramenta + ' ' + window.MundoCamadas.visivel('eventos'))));
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    // travada
    await semAvisos(L);
    await A(L, () => window.MundoCamadas.travar('lugares', true)); await espera(150);
    await A(L, () => __mundo.App.usarFerramenta('m')); await espera(250);
    av = await avisos(L);
    ok(av.some(x => x.texto === 'A camada Cidades e grupos está travada neste aparelho.' && x.botao === 'Destravar'), 'a ferramenta Marcador com Cidades e grupos travada avisa, com "Destravar": ' + j(av));
    await L.P.mouse.click(vazio.x, vazio.y); await espera(300);
    ok((await quantos(L, 'm')) === 1, 'e o clique não cria o marcador');
    await apertarAviso(L, 'Destravar');
    await L.P.mouse.click(vazio.x, vazio.y); await espera(300);
    ok((await quantos(L, 'm')) === 2, 'destravada, o clique cria o marcador');
    await A(L, () => __mundo.App.desfazer()); await espera(200);
    // o menu do mapa (botão direito) também
    await A(L, () => { window.MundoCamadas.mostrar('eventos', false); __mundo.App.usarFerramenta('sel'); }); await semAvisos(L); await espera(200);
    await L.P.mouse.click(vazio.x, vazio.y, { button: 'right' }); await espera(250);
    await L.F.click('.menu button:has-text("Novo evento aqui")'); await espera(300);
    av = await avisos(L);
    ok((await quantos(L, 'e')) === 1 && av.some(x => x.botao === 'Mostrar a camada'), 'o "Novo evento aqui" do menu também só avisa: ' + j(av));
    await A(L, () => window.MundoCamadas.mostrar('eventos', true)); await semAvisos(L); await espera(200);
    // a zona de perigo é da camada Zonas de perigo (a de guerra, da Guerra)
    await A(L, () => { __mundo.App.opt.freModo = 'perigo'; window.MundoCamadas.mostrar('perigos', false); __mundo.App.usarFerramenta('f'); }); await espera(250);
    av = await avisos(L);
    ok(av.some(x => x.texto === 'A camada Zonas de perigo está escondida neste aparelho.'), 'a ferramenta Frente, em "Zona de perigo", avisa da camada Zonas de perigo: ' + j(av));
    await semAvisos(L);
    await A(L, () => { __mundo.App.usarFerramenta('sel'); __mundo.App.opt.freModo = 'linha'; __mundo.App.usarFerramenta('f'); }); await espera(250);
    ok(!(await avisos(L)).length, 'e, em "Linha de frente", não (a camada Guerra está à vista)');
    await A(L, () => { __mundo.App.usarFerramenta('sel'); window.MundoCamadas.mostrar('perigos', true); }); await semAvisos(L); await espera(200);
  });

  await passo('os atalhos', async () => {
    await A(L, () => { window.MundoCamadas.travar('lugares', true); }); await espera(150);
    await L.F.click('#zCamadas'); await espera(200);
    await noPop(L, 'at:viagem');
    let d = {};
    for (const id of ['reg', 'zg', 'fr', 'zp', 'cid', 'eve', 'rot', 'rio', 'car']) d[id] = await desenhado(L, id);
    ok(!d.reg && !d.zg && !d.fr && d.zp && d.cid && d.eve && d.rot && d.rio && d.car, 'Viagem: some a região e a guerra (zona e frente); fica a tempestade, as cidades, os eventos, as rotas, os rios e os carimbos: ' + j(d));
    ok((await atalhoMarcado(L)) === 'at:viagem', 'o atalho Viagem fica marcado');
    let av = await avisos(L);
    ok(av.some(x => x.texto === 'Atalho Viagem: Regiões, Sub-regiões e Guerra ficaram escondidas.' && x.botao === 'Desfazer'), 'o aviso diz o que ficou escondido, com o Desfazer: ' + j(av));
    ok(await A(L, () => window.MundoCamadas.travada('lugares')), 'o atalho não mexe nas travas');
    await apertarAviso(L, 'Desfazer');
    ok((await desenhado(L, 'reg')) > 0 && (await desenhado(L, 'zg')) > 0 && (await atalhoMarcado(L)) === 'at:tudo', 'o Desfazer volta ao que estava (tudo à vista)');
    await semAvisos(L);
    await noPop(L, 'at:politica');
    d = {};
    for (const id of ['reg', 'zg', 'fr', 'zp', 'cid', 'eve', 'rot', 'rio', 'car', 'txt']) d[id] = await desenhado(L, id);
    const gradeVe = await A(L, () => getComputedStyle(document.querySelector('#mundo svg .c-hex')).display !== 'none');
    ok(d.reg && d.zg && d.fr && d.cid && d.rio && d.car && d.txt && !d.zp && !d.eve && !d.rot && !gradeVe, 'Política: as regiões, a guerra, as cidades, os rios e os enfeites; sem rotas, eventos, perigos e grade: ' + j(d) + ' grade ' + gradeVe);
    await noPop(L, 'at:guerra');
    d = {};
    for (const id of ['reg', 'zg', 'fr', 'zp', 'cid', 'eve', 'rot', 'rio', 'car', 'txt']) d[id] = await desenhado(L, id);
    ok(d.reg && d.zg && d.fr && d.cid && d.rio && !d.zp && !d.eve && !d.rot && !d.car && !d.txt, 'Guerra: a guerra, as regiões, as cidades e os rios; sem perigos, eventos, rotas, textos e carimbos: ' + j(d));
    av = (await avisos(L)).filter(x => /^Atalho /.test(x.texto));
    ok(av.length === 1 && /^Atalho Guerra/.test(av[0].texto), 'um aviso de atalho por vez (o da Política saiu): ' + j(av));
    await foto('l8-camadas');
    await noPop(L, 'at:tudo');
    d = {};
    for (const id of ['reg', 'zg', 'fr', 'zp', 'cid', 'eve', 'rot', 'rio', 'car', 'txt']) d[id] = await desenhado(L, id);
    ok(Object.values(d).every(Boolean) && (await atalhoMarcado(L)) === 'at:tudo', 'Tudo: tudo de volta: ' + j(d));
    await noPop(L, 'destravar');
    ok(await A(L, () => !window.MundoCamadas.travada('lugares') && !document.querySelector('#camPop [data-k="destravar"]')), '"Destravar todas" destrava (e o botão some)');
    ok(await A(L, () => document.querySelector('#zCamadas .cam-ponto').hidden), 'sem nada escondido nem travado, o ponto do botão some');
  });

  await passo('o terreno e a grade', async () => {
    const vis = () => A(L, () => ({ pint: !document.querySelector('#mundo canvas.pintura').hidden, hex: !document.querySelector('#mundo canvas.hex-desenho').hidden, grade: getComputedStyle(document.querySelector('#mundo svg .c-hex')).display !== 'none' }));
    let v = await vis();
    ok(v.pint && v.hex && v.grade, '(a tinta à mão, os hexágonos pintados e a grade à vista) ' + j(v));
    await noPop(L, 'olho:terreno');
    v = await vis();
    ok(!v.pint && !v.hex && v.grade, 'Terreno escondida: some a tinta (à mão e dos hexágonos); a grade fica: ' + j(v));
    await noPop(L, 'olho:terreno');
    v = await vis();
    ok(v.pint && v.hex, 'mostrando de novo, a tinta volta: ' + j(v));
    await noPop(L, 'olho:grade');
    v = await vis();
    ok(!v.grade && v.hex, 'Grade escondida: só as linhas somem: ' + j(v));
    await A(L, () => __mundo.App.usarFerramenta('h')); await espera(250);
    ok((await vis()).grade, 'com a ferramenta Terreno, as linhas aparecem (para pintar os hexágonos), como com "Mostrar a grade" desligado');
    await A(L, () => __mundo.App.usarFerramenta('sel')); await espera(250);
    ok(!(await vis()).grade, 'e somem de novo ao largar a ferramenta');
    await noPop(L, 'olho:grade');
  });

  await passo('as teclas', async () => {
    await A(L, () => { window.MundoCamadas.fechar(); document.activeElement && document.activeElement.blur(); });
    await L.P.mouse.move(700, 450);
    await L.P.keyboard.press('c'); await espera(200);
    ok(await L.F.locator('#camPop').isVisible(), 'C abre as camadas');
    ok(await A(L, () => document.getElementById('camPop').contains(document.activeElement)), '(com o foco dentro da janelinha)');
    await L.P.keyboard.press('Escape'); await espera(200);
    ok(!(await L.F.locator('#camPop').isVisible()) && await A(L, () => document.activeElement === document.getElementById('zCamadas')), 'Esc fecha, e o foco volta ao botão');
    await A(L, () => document.activeElement && document.activeElement.blur());
    await L.P.keyboard.press('c'); await espera(150);
    await L.P.keyboard.press('c'); await espera(150);
    ok(!(await L.F.locator('#camPop').isVisible()), 'C de novo fecha');
    await L.F.click('#zCamadas'); await espera(150);
    await L.P.mouse.click(400, 300); await espera(200);
    ok(!(await L.F.locator('#camPop').isVisible()), 'clicar fora fecha a janelinha');
  });

  await passo('quem joga também tem', async () => {
    await A(L, () => { __mundo.App.comoJogador = true; }); await espera(300);
    ok(await L.F.locator('#zCamadas').isVisible(), 'vendo como jogador, o botão Camadas continua lá');
    await L.F.click('#zCamadas'); await espera(200);
    await noPop(L, 'olho:lugares');
    ok((await desenhado(L, 'cid')) === 0 && (await desenhado(L, 'gru')) === 0 && (await desenhado(L, 'reg')) > 0, 'e esconde as cidades e os grupos da tela dele');
    await noPop(L, 'olho:lugares');
    await A(L, () => { __mundo.App.comoJogador = false; window.MundoCamadas.fechar(); }); await espera(300);
  });

  await passo('no celular', async () => {
    await L.P.setViewportSize({ width: 390, height: 800 }); await espera(400);
    await A(L, () => { window.MundoCamadas.mostrar('eventos', false); window.MundoCamadas.travar('regioes', true); window.MundoCamadas.abrir(); }); await espera(300);
    const cx = await A(L, () => { const r = document.getElementById('camPop').getBoundingClientRect(), pc = document.getElementById('palco'); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight, rolaX: document.documentElement.scrollWidth > innerWidth, sx: scrollX, ps: pc.scrollLeft, pl: pc.getBoundingClientRect().left }; });
    ok(cx.l >= 0 && cx.r <= cx.w && cx.t >= 0 && cx.b <= cx.h && !cx.rolaX, 'no celular, a janelinha cabe na tela: ' + j(cx));
    await foto('l8-camadas-celular');
    await A(L, () => { window.MundoCamadas.mostrar('eventos', true); window.MundoCamadas.travar('regioes', false); window.MundoCamadas.fechar(); });
    await L.P.setViewportSize({ width: 1400, height: 900 }); await espera(300);
  });

  const erros = (t.errs || []).filter(e => !/Multiple GoTrueClient instances/.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
