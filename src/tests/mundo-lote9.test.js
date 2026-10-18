// Mapa-múndi, lote 9, pela interface (a página sozinha, no navegador):
//   · (parte 2, SO=bandeiras) o tamanho das bandeiras neste aparelho (a aba Facções): Médias de começo (maiores que as
//     de antes), Pequenas (as de antes) e Grandes — em todas: as das regiões, dos grupos, das frentes e das zonas de
//     guerra; fica guardado no aparelho (volta ao recarregar) e não mexe no mapa;
//   · (parte 2, SO=missoes) a missão no mapa: marcar (o texto curto), o "!" no ícone (do marcador, do grupo, da região e
//     do evento), nasce só do mestre (tracejada; não vai para os jogadores), mostrar aos jogadores (vai, com o nome),
//     concluir (✓) e reabrir, trocar, tirar (com desfazer), a missão ligada a uma missão das Fichas (o nome e a situação
//     vêm de lá; a escondida nas Fichas não vai; concluída lá, vira ✓; a que saiu das Fichas avisa), a lista "Missões no
//     mapa" (aba Hoje), o que quem joga lê e duplicar sem levar a missão;
//   · (parte 3, SO=descanso) o grupo dos jogadores com "Ao chegar ao fim da rota" e paradas; o descanso (marcar, o
//     painel, "descansando agora", o "zZ", não anda no "+1 tempo", não vai para os jogadores); o marcador "Ponto de
//     descanso" (a lua; a caravana segue até ele e dorme lá; não vai para os jogadores); o ponto de descanso da própria
//     caravana (na rota, no painel, tirar); a volta pela mesma rota (o botão no fim, anda de volta, o aviso ao chegar);
//   · (parte 4, SO=clima) o clima que muda a cada N tempos: "O clima muda" no calendário (2 de começo; 3; uma vez por
//     dia), a aba Hoje com os climas do dia até agora e a próxima mudança, o clima de agora junto da data, e o trocado à
//     mão (vale até a próxima mudança; depois segue aos poucos a partir dele).
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
async function escolher(a, k, v) { await campo(a, k).selectOption(v); await a.F.waitForTimeout(300); }
const selecionar = async (a, id) => { await A(a, x => __mundo.App.selecionar(x ? [x] : []), id); await espera(220); };
const obj = (a, id) => A(a, id => { const o = __mundo.App.mapa && __mundo.App.mapa.objs.find(o => o.id === id); return o ? JSON.parse(JSON.stringify(o)) : null; }, id);
const avisos = a => A(a, () => document.getElementById('toasts').innerText);
const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
const zoom = async (a, z) => { await A(a, z => { window.MundoTela.zoom = z; }, z); await espera(700); };
// a marca da missão de um objeto no mapa: as classes, a dica e o sinal (! ✓ ✕)
const marca = (a, id) => A(a, id => {
  const g = document.querySelector(`#mundo svg [data-id="${id}"] .missao`);
  if (!g) return null;
  const t = g.querySelector('title'), cls = g.getAttribute('class');
  return { cls, dica: t ? t.textContent : '', so: /so-mestre/.test(cls), e: (cls.match(/\bm-(ativa|feita|falhou)\b/) || [])[1] || null };
}, id);
// a janela do painel: escolher, escrever e confirmar
async function janela(a, f) {
  await a.F.waitForSelector('dialog.mundo-dl[open]', { timeout: 4000 });
  await f(a.F.locator('dialog.mundo-dl[open]'));
  await a.F.locator('dialog.mundo-dl[open] button[type="submit"]').click(); await espera(300);
}

(async () => {
  const t = await start();
  const dl = await t.device({ name: 'lote9', w: 1400, h: 900 });
  dl.page.setDefaultTimeout(8000);
  const L = { P: dl.page, F: dl.page.mainFrame() };
  const foto = async nome => { if (process.env.TC_SCRATCH) await L.P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); };

  await passo('o mapa', async () => {
    await L.P.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(250);
    await L.F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await L.F.click('#vazio [data-k="vz:papel"]'); await espera(300);
    ok(await A(L, () => !!__mundo.App.mapa), '(o mapa em branco)');
  });

  if (parte('bandeiras')) await passo('o tamanho das bandeiras', async () => {
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar', m => {
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('r', { pts: [[300, 300], [700, 300], [700, 600], [300, 600]] }), { id: 'reg', nome: 'Reino de Aldar', fac: 'fa' }),
          Object.assign(N.objNovo('g', { x: 500, y: 800, sigla: 'EXE' }), { id: 'gb', nome: 'Hoste', fac: 'fa' }),
          Object.assign(N.objNovo('z', { tipo: 'guerra', pts: [[900, 300], [1300, 300], [1300, 600], [900, 600]], ini: m.cal.dia }), { id: 'zg', nome: 'Campos', a: 'fa', b: 'fb' }),
          Object.assign(N.objNovo('f', { pts: [[900, 800], [1300, 850]] }), { id: 'fr', nome: 'Frente', a: 'fa', b: 'fb' }));
      });
      const BR = { forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: 'lua', img: null };
      App.brasoes = new Map([['fa', BR], ['fb', Object.assign({}, BR, { cores: ['#8a2a2a', '#e8eaf0'] })]]); App.emit('muda', { origem: 'fora' });
    });
    await zoom(L, 0.6);
    // a largura de cada bandeira na tela (o svg do brasão dentro do grupo .bandeira), por objeto
    const larguras = () => A(L, () => {
      const w = id => [...document.querySelectorAll(`#mundo svg [data-id="${id}"] .bandeira > svg`)].map(b => Math.round(Number(b.getAttribute('width')) * 10) / 10);
      return { reg: w('reg'), gru: w('gb'), zon: w('zg'), fre: w('fr') };
    });
    const antes = await A(L, () => localStorage.getItem('tinycats:mundo:painel'));
    ok(!antes || !/"band"/.test(antes), '(de começo, nada guardado sobre as bandeiras)');
    let w = await larguras();
    ok(j(w) === j({ reg: [21], gru: [16.8], zon: [19.6, 19.6], fre: [18.2, 18.2] }), 'de começo, Médias: maiores que as de antes (região 21, grupo 16,8, zona 19,6, frente 18,2): ' + j(w));
    await foto('l9-bandeiras-medias');
    await aba(L, 'faccoes');
    const fb = await A(L, () => { const el = document.querySelector('#pane [data-k="fac:band"]'); return { n: document.querySelectorAll('#pane [data-k="fac:band"]').length, v: el ? el.value : null, sec: /Neste aparelho/i.test(document.getElementById('pane').innerText) }; });
    ok(fb.n === 1 && fb.v === 'm' && fb.sec, 'na aba Facções, "Tamanho das bandeiras no mapa", em Médias, na seção "Neste aparelho": ' + j(fb));
    const jMapa = await A(L, () => JSON.stringify(__mundo.App.mapa));
    await escolher(L, 'fac:band', 'p');
    w = await larguras();
    ok(j(w) === j({ reg: [15], gru: [12], zon: [14, 14], fre: [13, 13] }), 'Pequenas: as de antes (15, 12, 14, 13): ' + j(w));
    await escolher(L, 'fac:band', 'g');
    w = await larguras();
    ok(j(w) === j({ reg: [28.5], gru: [22.8], zon: [26.6, 26.6], fre: [24.7, 24.7] }), 'Grandes: quase o dobro (28,5, 22,8, 26,6, 24,7): ' + j(w));
    await foto('l9-bandeiras-grandes');
    // a base da bandeira da região fica no lugar (em cima do nome); a do grupo não encosta no token
    const pos = await A(L, () => {
      const b = document.querySelector('#mundo svg [data-id="reg"] .bandeira'), gb = document.querySelector('#mundo svg [data-id="gb"] .bandeira');
      const tr = el => (el.getAttribute('transform').match(/-?[\d.]+/g) || []).map(Number);
      const [rx, ry] = tr(b), rh = Number(b.querySelector('svg').getAttribute('height'));
      const [gx] = tr(gb), gw = Number(gb.querySelector('svg').getAttribute('width'));
      return { baseReg: Math.round((ry + rh) * 10) / 10, dirGrupo: Math.round((gx + gw) * 10) / 10, rx };
    });
    ok(pos.baseReg === -7 && pos.dirGrupo <= -21.4, 'a bandeira da região continua em cima do nome (a base no mesmo lugar) e a do grupo não encosta no token: ' + j(pos));
    ok(await A(L, () => JSON.stringify(__mundo.App.mapa)) === jMapa && !(await A(L, () => __mundo.App.podeDesfazer() && /bandeira/i.test(__mundo.App.rotuloDesfazer()))), 'o tamanho não mexe no mapa (nem vira um passo de desfazer)');
    ok(/"band":"g"/.test(await A(L, () => localStorage.getItem('tinycats:mundo:painel'))), 'fica guardado neste aparelho');
    await L.P.reload({ waitUntil: 'load' });
    await L.F.waitForFunction(() => window.__mundo && window.__mundo.App.pronto, null, { timeout: 15000 }); await espera(400);
    await A(L, () => { const BR = { forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: 'lua', img: null }; __mundo.App.brasoes = new Map([['fa', BR], ['fb', BR]]); __mundo.App.emit('muda', { origem: 'fora' }); });
    await zoom(L, 0.6);
    w = await larguras();
    ok(j(w.gru) === j([22.8]), 'depois de recarregar, continuam Grandes: ' + j(w));
    await aba(L, 'faccoes');
    ok(await campo(L, 'fac:band').inputValue() === 'g', '(e a escolha também)');
    await escolher(L, 'fac:band', 'm');
  });

  if (parte('missoes')) await passo('a missão no mapa', async () => {
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar as missões', m => {
        m.objs.push(Object.assign(N.objNovo('m', { x: 400, y: 1000, ic: 'cidade' }), { id: 'vila', nome: 'Vila Alta' }),
          Object.assign(N.objNovo('g', { x: 600, y: 1000, sigla: 'PT' }), { id: 'pt', nome: 'Os Heróis' }),
          Object.assign(N.objNovo('r', { pts: [[800, 900], [1100, 900], [1100, 1150], [800, 1150]] }), { id: 'brejo', nome: 'Brejo' }),
          Object.assign(N.objNovo('e', { x: 1300, y: 1000, tipo: 'guerra', ini: m.cal.dia }), { id: 'eve', nome: 'Cerco' }));
      });
    });
    await zoom(L, 1);
    await aba(L, 'selecao'); await selecionar(L, 'vila');
    ok(await campo(L, 'o:vila:mis').count() === 1 && /Marque uma missão aqui/.test(await L.F.locator('#pane').innerText()), 'o marcador tem a seção Missão, com "Marcar missão…"');
    ok(!(await marca(L, 'vila')), '(sem missão, sem marca)');
    await botao(L, 'o:vila:mis');
    await janela(L, async d => {
      ok(/Nasce só sua/.test(await d.innerText()) && await d.locator('#dl-f').count() === 0, 'a janela: o texto curto (sem mesa, nada das Fichas), e que nasce só do mestre');
      await d.locator('#dl-t').fill('Resgatar o ferreiro');
    });
    let o = await obj(L, 'vila');
    ok(j(o.mis) === j({ t: 'Resgatar o ferreiro', ref: null }), 'a missão fica no marcador, só do mestre: ' + j(o.mis));
    let mk = await marca(L, 'vila');
    ok(mk && mk.e === 'ativa' && mk.so && /Missão: Resgatar o ferreiro · só você vê/.test(mk.dica), 'o "!" no ícone, tracejado (só o mestre vê), com o nome na dica: ' + j(mk));
    ok(/Resgatar o ferreiro/.test(await campo(L, 'o:vila:mis-txt').innerText()) && !(await campo(L, 'o:vila:mis-ver').isChecked()), 'o painel mostra a missão, e "Os jogadores veem" desmarcado');
    // não vai para os jogadores
    let pub = await A(L, () => { const p = __mundo.N.projetar(__mundo.App.mapa); return (p.objs.find(o => o.id === 'vila') || {}).mis || null; });
    ok(pub === null, 'na projeção, a missão só do mestre não vai');
    // mostrar
    await campo(L, 'o:vila:mis-ver').check(); await espera(300);
    mk = await marca(L, 'vila');
    ok((await obj(L, 'vila')).mis.ver === true && mk && !mk.so, 'mostrada aos jogadores: a marca deixa de ser tracejada');
    pub = await A(L, () => { const p = __mundo.N.projetar(__mundo.App.mapa); return (p.objs.find(o => o.id === 'vila') || {}).mis || null; });
    ok(j(pub) === j({ t: 'Resgatar o ferreiro', ref: null, ver: true, e: 'ativa' }), 'e vai para os jogadores, com o nome e a situação: ' + j(pub));
    await A(L, () => window.MundoTela.centrar({ x: 800, y: 1000 })); await espera(500);
    await foto('l9-missao');
    // concluir e reabrir
    await botao(L, 'o:vila:mis-ok');
    mk = await marca(L, 'vila');
    ok((await obj(L, 'vila')).mis.ok === true && mk.e === 'feita' && /\(concluída\)/.test(mk.dica), 'Concluir: vira ✓: ' + j(mk));
    await botao(L, 'o:vila:mis-ok');
    ok(!(await obj(L, 'vila')).mis.ok && (await marca(L, 'vila')).e === 'ativa', 'Reabrir: volta o "!"');
    // trocar (o "mostrar" continua)
    await botao(L, 'o:vila:mis-trocar');
    await janela(L, async d => { await d.locator('#dl-t').fill('Achar o ferreiro'); });
    o = await obj(L, 'vila');
    ok(o.mis.t === 'Achar o ferreiro' && o.mis.ver === true, 'Trocar: o texto novo, e continua à mostra');
    // o grupo, a região e o evento
    for (const [id, nome] of [['pt', 'Escoltar a caravana'], ['brejo', 'Limpar o brejo'], ['eve', 'Furar o cerco']]) {
      await selecionar(L, id);
      await botao(L, 'o:' + id + ':mis');
      await janela(L, async d => { await d.locator('#dl-t').fill(nome); });
      const mm = await marca(L, id);
      ok(mm && mm.e === 'ativa' && mm.dica.includes(nome), 'no ' + ({ pt: 'grupo', brejo: 'região', eve: 'evento' })[id] + ': o "!" também: ' + j(mm));
    }
    // a lista "Missões no mapa"
    await aba(L, 'hoje');
    const lista = await A(L, () => [...document.querySelectorAll('#pane [data-k^="mis:"]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
    ok(lista.length === 4 && lista.filter(x => /só você vê/.test(x)).length === 3 && lista.some(x => /Achar o ferreiro/.test(x) && /Vila Alta/.test(x) && !/só você vê/.test(x)), 'na aba Hoje, "Missões no mapa": as quatro, com onde estão (as três só do mestre dizem): ' + j(lista));
    await L.F.click('#pane [data-k="mis:brejo"]'); await espera(300);
    ok(await A(L, () => __mundo.App.sel.join(',')) === 'brejo', 'clicar numa delas escolhe o objeto');
    // quem joga lê
    await A(L, () => { __mundo.App.comoJogador = true; __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(400);
    await aba(L, 'selecao'); await selecionar(L, 'vila');
    const ler = await L.F.locator('#pane').innerText();
    ok(/Missão: Achar o ferreiro/.test(ler), 'vendo como jogador: o painel do marcador diz a missão');
    ok(!!(await marca(L, 'vila')) && !(await marca(L, 'brejo')), 'e no mapa, só a marca da mostrada');
    await aba(L, 'hoje');
    ok(await L.F.locator('#pane [data-k^="mis:"]').count() === 1, 'a lista dos jogadores tem só a mostrada');
    await A(L, () => { __mundo.App.comoJogador = false; __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(400);
    // tirar (com desfazer)
    await aba(L, 'selecao'); await selecionar(L, 'eve');
    await botao(L, 'o:eve:mis-tirar');
    ok(!(await obj(L, 'eve')).mis && !(await marca(L, 'eve')) && /A missão saiu daqui/.test(await avisos(L)), 'Tirar a missão: some, com o aviso');
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    ok((await obj(L, 'eve')).mis && (await obj(L, 'eve')).mis.t === 'Furar o cerco', 'Desfazer traz de volta');
    // duplicar não leva a missão
    await selecionar(L, 'vila');
    await botao(L, 'o:duplicar');
    const copia = await A(L, () => { const id = __mundo.App.sel[0]; const o = __mundo.App.mapa.objs.find(x => x.id === id); return o ? { id, mis: o.mis || null } : null; });
    ok(copia && copia.id !== 'vila' && copia.mis === null, 'Duplicar: a cópia nasce sem a missão: ' + j(copia));
    await A(L, () => __mundo.App.desfazer()); await espera(250);

    // ---- a missão ligada a uma missão das Fichas (o que a mesa diria: aqui, posto à mão) ----
    await A(L, () => {
      const F = new Map([['m1', { t: 'O dragão de Urgm', e: 'ativa', oculta: false, camp: null }], ['m2', { t: 'O traidor', e: 'ativa', oculta: true, camp: null }]]);
      window.__fichas = F;
      __mundo.App.missaoDaFicha = id => (F.has(id) ? Object.assign({}, F.get(id)) : null);
      __mundo.App.missoesDasFichas = () => [...F].map(([id, f]) => Object.assign({ id }, f));
    });
    await selecionar(L, 'pt');
    await botao(L, 'o:pt:mis-trocar');
    await janela(L, async d => {
      ok(await d.locator('#dl-f').count() === 1 && /O traidor · Ativa \(escondida\)/.test(await d.locator('#dl-f').innerText()), 'com as Fichas: a janela oferece as missões do grupo (a escondida diz)');
      await d.locator('input[name="dl-modo"][value="f"]').check();
      await d.locator('#dl-f').selectOption('m1');
    });
    o = await obj(L, 'pt');
    mk = await marca(L, 'pt');
    ok(j(o.mis) === j({ t: '', ref: 'm1' }) && mk && /O dragão de Urgm/.test(mk.dica) && mk.so, 'ligada à missão das Fichas: o nome vem de lá (e nasce só do mestre): ' + j([o.mis, mk]));
    ok(/Das missões do grupo, nas Fichas/.test(await L.F.locator('#pane').innerText()) && await campo(L, 'o:pt:mis-ok').count() === 0, 'o painel diz de onde vem, sem "Concluir" (a situação vem das Fichas)');
    await campo(L, 'o:pt:mis-ver').check(); await espera(300);
    // a projeção (como a mesa publica: comMissoes) — a vista do mestre vendo como jogador usa a mesma
    const vista = () => A(L, () => { __mundo.App.comoJogador = true; const v = __mundo.App.vista(); __mundo.App.comoJogador = false; const p = v.objs.find(o => o.id === 'pt'); return p ? p.mis || null : 'sem grupo'; });
    pub = await vista();
    ok(j(pub) === j({ t: 'O dragão de Urgm', ref: null, ver: true, e: 'ativa' }), 'para os jogadores: o nome e a situação das Fichas, sem a ligação: ' + j(pub));
    // concluída nas Fichas: vira ✓ (sem mexer no mapa)
    await A(L, () => { window.__fichas.get('m1').e = 'feita'; __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(400);
    mk = await marca(L, 'pt');
    ok(mk && mk.e === 'feita', 'concluída nas Fichas: o "!" vira ✓ sozinho: ' + j(mk));
    // ligada a uma escondida nas Fichas: não vai, mesmo "à mostra"
    await botao(L, 'o:pt:mis-trocar');
    await janela(L, async d => { await d.locator('#dl-f').selectOption('m2'); });
    pub = await A(L, () => { __mundo.App.comoJogador = true; const v = __mundo.App.vista(); __mundo.App.comoJogador = false; return (v.objs.find(o => o.id === 'pt') || {}).mis || null; });
    ok((await obj(L, 'pt')).mis.ver === true && pub === null && /escondida nas Fichas/.test(await L.F.locator('#pane').innerText()), 'ligada a uma missão ainda escondida nas Fichas: continua "à mostra", mas não vai para os jogadores (o painel avisa)');
    ok((await marca(L, 'pt')).so, '(no mapa do mestre, tracejada)');
    // a que saiu das Fichas
    await A(L, () => { window.__fichas.delete('m2'); __mundo.App.emit('muda', { origem: 'fora' }); }); await espera(400);
    ok(/A missão ligada não está mais nas Fichas/.test(await L.F.locator('#pane').innerText()) && /perdida/.test((await marca(L, 'pt')).cls), 'a missão que saiu das Fichas: o painel avisa, e a marca fica apagada');
    await A(L, () => window.MundoTela.centrar({ x: 800, y: 1000 })); await espera(500);
    await foto('l9-missao-fichas');
  });

  if (parte('descanso')) await passo('o descanso, os pontos de descanso, as paradas e a volta pela mesma rota', async () => {
    // a estrada, o grupo dos jogadores, a caravana e a estalagem (no 4º hexágono da estrada)
    await A(L, () => {
      const { App, N } = __mundo;
      App.mudar('montar o descanso', m => {
        m.grade.tam = 40; m.cal.tpd = 10; m.cal.tempo = 0;
        m.objs.push(Object.assign(N.objNovo('t', { pts: [[100, 1300], [1300, 1300]] }), { id: 'rd', nome: 'Estrada do Sul' }));
      });
      App.mudar('os grupos', m => {
        const v = N.viagem(m, { rota: 'rd' }), c = k => N.centroHex(m, v.cam[k].q, v.cam[k].r);
        m.objs.push(Object.assign(N.objNovo('g', { x: c(2).x, y: c(2).y, sigla: 'PT' }), { id: 'gp', nome: 'Os Heróis', rota: 'rd', pt: 10, prog: v.acum[2] }),
          Object.assign(N.objNovo('g', { x: c(0).x, y: c(0).y, sigla: 'CAR' }), { id: 'gc', nome: 'Caravana', tipo: 'caravana', rota: 'rd', pt: 10, oculto: false }),
          Object.assign(N.objNovo('m', { x: c(4).x, y: c(4).y, ic: 'vila' }), { id: 'inn', nome: 'Estalagem' }));
      });
    });
    await zoom(L, 0.8);
    await A(L, () => window.MundoTela.centrar({ x: 500, y: 1300 })); await espera(400);
    const hexDe = id => A(L, id => { const { App, N } = __mundo, o = App.mapa.objs.find(x => x.id === id); const h = N.hexDe(App.mapa, o.x, o.y); return h.q + ',' + h.r; }, id);
    const hexK = k => A(L, k => { const { App, N } = __mundo, v = N.viagem(App.mapa, { rota: 'rd' }); return v.cam[k].q + ',' + v.cam[k].r; }, k);
    const relogio = t => A(L, t => __mundo.App.mudar('o relógio', m => { m.cal.tempo = t; }), t);
    // o grupo dos jogadores: "Ao chegar ao fim da rota" e as paradas (antes só os do mundo)
    await aba(L, 'selecao'); await selecionar(L, 'gp');
    ok(await campo(L, 'o:gp:modo').count() === 1 && await campo(L, 'o:gp:parada').count() === 1, 'o grupo dos jogadores tem "Ao chegar ao fim da rota" e as paradas');
    ok(/Sem hora de descanso/.test(await L.F.locator('#pane').innerText()) && await campo(L, 'o:gp:desc').count() === 1, 'a seção Descanso: sem hora de descanso, e "Marcar o descanso…"');
    // marcar o descanso: do 6º ao 10º (o começo que a janela propõe)
    await botao(L, 'o:gp:desc');
    await janela(L, async d => { ok(await d.locator('#dl-de').inputValue() === '6' && await d.locator('#dl-ate').inputValue() === '10', 'a janela propõe do 6º ao 10º tempo (num dia de 10)'); });
    ok(j((await obj(L, 'gp')).desc) === j({ de: 6, ate: 10 }) && /Descansa do 6º ao 10º tempo/.test(await campo(L, 'o:gp:desc-txt').innerText()), 'o descanso fica no grupo, e o painel diz');
    // no 6º tempo: descansando — não anda no "+1 tempo"; o "zZ" no token (só o mestre)
    await relogio(5); await selecionar(L, 'gp');
    ok(/descansando agora/.test(await campo(L, 'o:gp:desc-txt').innerText()) && await A(L, () => !!document.querySelector('#mundo svg [data-id="gp"] .dorme')), 'no 6º tempo: "descansando agora", e o "zZ" junto do token');
    await foto('l9-descanso');
    const antes = await hexDe('gp');
    await aba(L, 'hoje'); await botao(L, 'hoje:tempo');
    ok((await hexDe('gp')) === antes && (await hexDe('gc')) !== (await hexK(0)), '"+1 tempo": o grupo descansando fica (a caravana, sem descanso, anda)');
    ok(await A(L, () => { __mundo.App.comoJogador = true; const v = __mundo.App.vista(); __mundo.App.comoJogador = false; const g = v.objs.find(o => o.id === 'gp'); return !!g && !('desc' in g); }), 'para os jogadores, o descanso não vai');
    // "Próximo dia" do 1º tempo: anda do 1º ao 5º (10 hexágonos) e descansa do 6º ao 10º
    await A(L, () => __mundo.App.mudar('no começo do dia', m => { const { N } = __mundo, g = m.objs.find(o => o.id === 'gp'), v = N.viagem(m, g), c = N.centroHex(m, v.cam[2].q, v.cam[2].r); g.x = c.x; g.y = c.y; g.prog = v.acum[2]; m.cal.tempo = 0; }));
    await botao(L, 'hoje:+1');
    ok((await hexDe('gp')) === (await hexK(12)), '"Próximo dia" do 1º tempo: anda do 1º ao 5º (10 hexágonos) e descansa do 6º ao 10º');
    // a estalagem como ponto de descanso: a caravana vai dormir lá (do 6º: chega no fim do 7º)
    await aba(L, 'selecao'); await selecionar(L, 'inn');
    await campo(L, 'o:inn:desc').check(); await espera(300);
    ok((await obj(L, 'inn')).desc === true && await A(L, () => !!document.querySelector('#mundo svg [data-id="inn"] .pdesc-selo')), 'o marcador "Ponto de descanso": a lua no ícone');
    await A(L, () => __mundo.App.mudar('a caravana no começo', m => { const { N } = __mundo, g = m.objs.find(o => o.id === 'gc'), v = N.viagem(m, g), c = N.centroHex(m, v.cam[0].q, v.cam[0].r); g.x = c.x; g.y = c.y; g.prog = 0; g.desc = { de: 6, ate: 10 }; m.cal.tempo = 5; }));
    await aba(L, 'hoje'); await botao(L, 'hoje:tempo');
    ok((await hexDe('gc')) === (await hexK(2)), 'no 6º, a caravana segue rumo à estalagem (2 hexágonos)');
    await botao(L, 'hoje:tempo');
    ok((await hexDe('gc')) === (await hexK(4)) && (await hexDe('gc')) === (await hexDe('inn')), 'no 7º, chega à estalagem e para nela');
    await botao(L, 'hoje:tempo');
    ok((await hexDe('gc')) === (await hexDe('inn')), 'no 8º, dorme lá (não anda)');
    ok(await A(L, () => { __mundo.App.comoJogador = true; const v = __mundo.App.vista(); __mundo.App.comoJogador = false; const m = v.objs.find(o => o.id === 'inn'); return !!m && !('desc' in m); }), 'para os jogadores, o "Ponto de descanso" do marcador não vai');
    // o ponto de descanso da própria caravana, na rota
    await A(L, () => __mundo.App.mudar('o ponto da caravana', m => { const { N } = __mundo, v = N.viagem(m, { rota: 'rd' }), c = N.centroHex(m, v.cam[8].q, v.cam[8].r); m.objs.find(o => o.id === 'gc').pdesc = [{ x: c.x, y: c.y }]; }));
    await aba(L, 'selecao'); await selecionar(L, 'gc');
    ok(await A(L, () => !!document.querySelector('#mundo svg [data-pdesc="0"]')) && /Ponto de descanso 1/.test(await L.F.locator('#pane').innerText()) && await campo(L, 'o:gc:pdesc').count() === 1,
      'a caravana escolhida: o ponto de descanso dela aparece na rota (a lua) e no painel, com "Marcar outro ponto de descanso na rota"');
    await botao(L, 'o:gc:pd0:tirar');
    ok(!(await obj(L, 'gc')).pdesc, '"Tirar" tira o ponto');
    // tirar o descanso
    await selecionar(L, 'gp');
    await botao(L, 'o:gp:desc-tirar');
    ok(!(await obj(L, 'gp')).desc && /não tem mais hora de descanso/.test(await avisos(L)) && await campo(L, 'o:gp:desc').count() === 1, '"Tirar o descanso": anda em todos os tempos de novo (com o aviso)');
    // a volta pela mesma rota: o grupo no fim (sem descanso agora)
    await A(L, () => __mundo.App.mudar('no fim', m => { const { N } = __mundo, g = m.objs.find(o => o.id === 'gp'), v = N.viagem(m, g), k = v.cam.length - 1, c = N.centroHex(m, v.cam[k].q, v.cam[k].r); g.x = c.x; g.y = c.y; g.prog = v.total; delete g.desc; m.cal.tempo = 0; }));
    await selecionar(L, 'gp');
    ok(await campo(L, 'o:gp:voltar').count() === 1, 'no fim da rota (só ida): o botão "Voltar pela mesma rota"');
    await botao(L, 'o:gp:voltar');
    let g = await obj(L, 'gp');
    ok(g.sentido === -1 && g.prog === 0 && /volta pela mesma rota/.test(await avisos(L)), 'voltando: o sentido vira (e o aviso diz)');
    const fim = await hexDe('gp');
    await botao(L, 'o:andar');
    ok((await hexDe('gp')) !== fim && (await hexDe('gp')) === (await hexK((await A(L, () => __mundo.N.viagem(__mundo.App.mapa, { rota: 'rd' }).cam.length)) - 3)), '"Andar 1 tempo": anda de volta (2 hexágonos para trás)');
    ok(/Voltando pela mesma rota/.test(await L.F.locator('#pane').innerText()), 'o painel diz que está voltando');
    const seta = await A(L, () => { const f = document.querySelector('#mundo svg .sel-rota-seta'); const g = f && f.closest('.fixo'); const rt = __mundo.App.mapa.objs.find(o => o.id === 'rd'); return g ? [Math.round(g.__x), Math.round(rt.pts[0][0])] : null; });
    ok(seta && seta[0] === seta[1], 'a rota do grupo escolhido mostra a seta no começo dela (o sentido da volta): ' + j(seta));
    // chegando ao fim (indo): o aviso oferece voltar
    await A(L, () => __mundo.App.mudar('perto do fim', m => { const { N } = __mundo, g = m.objs.find(o => o.id === 'gp'); delete g.sentido; const v = N.viagem(m, g), k = v.cam.length - 2, c = N.centroHex(m, v.cam[k].q, v.cam[k].r); g.x = c.x; g.y = c.y; g.prog = v.acum[k]; }));
    await selecionar(L, 'gp');
    await botao(L, 'o:andar');
    ok(/Os Heróis — chegou ao fim da rota/.test(await avisos(L)), 'chegou ao fim: o aviso diz e oferece "Voltar pela mesma rota": ' + await avisos(L));
    await L.F.locator('#toasts button', { hasText: 'Voltar pela mesma rota' }).click(); await espera(300);
    ok((await obj(L, 'gp')).sentido === -1, 'pelo aviso: volta pela mesma rota');
    await A(L, () => __mundo.App.mudar('a caravana perto do fim', m => { const { N } = __mundo, g = m.objs.find(o => o.id === 'gc'); delete g.desc; delete g.sentido; const v = N.viagem(m, g), k = v.cam.length - 2, c = N.centroHex(m, v.cam[k].q, v.cam[k].r); g.x = c.x; g.y = c.y; g.prog = v.acum[k]; m.cal.tempo = 0; }));
    await aba(L, 'hoje'); await botao(L, 'hoje:tempo');
    ok(/Caravana — chegou ao fim da rota/.test(await avisos(L)), '"+1 tempo": o aviso de quem chegou ao fim também: ' + await avisos(L));
    await aba(L, 'selecao'); await selecionar(L, 'gp');
    await foto('l9-voltar');
  });

  if (parte('clima')) await passo('o clima muda a cada N tempos', async () => {
    const chip = () => A(L, () => (document.querySelector('#climaTxt .c-nome') || {}).textContent || '');
    const agora = () => A(L, () => { const { App, N } = __mundo; return N.climaDoDia(App.mapa, App.mapa.cal.dia); });
    await A(L, () => __mundo.App.mudar('o começo do dia', m => { m.cal.tempo = 0; m.cal.tpd = 10; }));
    // o calendário: de quantos em quantos tempos (2 de começo)
    await aba(L, 'mapa');
    ok(await campo(L, 'mapa:clima-cada').count() === 1 && await campo(L, 'mapa:clima-cada').inputValue() === '2', 'no calendário (aba Mapa): "O clima muda", a cada 2 tempos de começo');
    await escolher(L, 'mapa:clima-cada', '3');
    ok((await A(L, () => __mundo.App.mapa.clima.cada)) === 3 && await A(L, () => __mundo.App.rotuloDesfazer()) === 'mudar quando o clima muda', 'a cada 3 tempos: fica no mapa (um passo de desfazer)');
    await escolher(L, 'mapa:clima-cada', '2');
    ok(await A(L, () => !__mundo.App.mapa.clima || !('cada' in __mundo.App.mapa.clima)), 'de volta a 2: o de começo (o mapa não guarda)');
    // a aba Hoje: o clima ao longo do dia
    await aba(L, 'hoje');
    let tr = await A(L, () => (document.querySelector('#pane [data-k="hoje:trechos"]') || {}).textContent || '');
    ok(/^Hoje: \S+.* \(desde o 1º, agora\)\. Muda aos poucos a cada 2 tempos: a próxima mudança no 3º tempo\.$/.test(tr), 'a aba Hoje: o clima de agora e quando muda de novo: ' + tr);
    // no 5º tempo: os trechos de hoje até agora
    await A(L, () => __mundo.App.mudar('o 5º tempo', m => { m.cal.tempo = 4; }));
    await L.F.waitForFunction(() => /no 7º tempo/.test((document.querySelector('#pane [data-k="hoje:trechos"]') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});   // (o painel se pinta de novo)
    tr = await A(L, () => (document.querySelector('#pane [data-k="hoje:trechos"]') || {}).textContent || '');
    const esperado = await A(L, () => { const { App, N } = __mundo; const seq = N.climasDoDia(App.mapa, App.mapa.cal.dia, null, 2); let i = seq.length - 1; while (i > 0 && seq[i - 1].k === seq[i].k) i--; return { nomes: seq.map(x => N.CLIMAS[x.k].nome), desde: seq[i].de }; });
    ok(tr.includes('desde o ' + esperado.desde + 'º, agora') && /a próxima mudança no 7º tempo/.test(tr) && esperado.nomes.every(n => tr.includes(n)), 'no 5º tempo: os climas de hoje até agora (os iguais seguidos juntos) e a próxima mudança no 7º: ' + tr);
    ok(await chip(L) === await A(L, () => { const { App, N } = __mundo; return N.CLIMAS[N.climaDoDia(App.mapa, App.mapa.cal.dia).k].nome; }), 'junto da data, o clima de agora');
    // com o mês todo de sol, os trechos iguais seguidos ficam juntos
    await A(L, () => __mundo.App.mudar('só sol', m => { m.clima = Object.assign({}, m.clima, { tab: [...Array(12)].map(() => ({ sol: 100 })) }); }));
    const sol = await A(L, () => __mundo.N.CLIMAS.sol.nome);
    await L.F.waitForFunction(sol => ((document.querySelector('#pane [data-k="hoje:trechos"]') || {}).textContent || '').startsWith('Hoje: ' + sol + ' '), sol, { timeout: 5000 }).catch(() => {});
    tr = await A(L, () => (document.querySelector('#pane [data-k="hoje:trechos"]') || {}).textContent || '');
    ok(tr.startsWith('Hoje: ' + sol + ' (desde o 1º, agora). '), 'com o mês todo de sol, os trechos iguais seguidos ficam juntos: ' + tr);
    await A(L, () => __mundo.App.desfazer()); await espera(300);
    // à mão: vale até a próxima mudança
    const k0 = (await agora()).k, outro = k0 === 'tempestade' ? 'neve' : 'tempestade';
    ok(/Trocar o de agora/.test(await L.F.locator('#pane').innerText()), 'o campo "Trocar o de agora"');
    await escolher(L, 'hoje:clima-mao', outro);
    const dia = await A(L, () => __mundo.App.mapa.cal.dia);
    ok(j((await A(L, () => __mundo.App.mapa.clima.mao))) === j({ d: dia, k: outro, t: 2 }) && await chip(L) === await A(L, k => __mundo.N.CLIMAS[k].nome, outro), 'trocado à mão no 5º tempo (o 3º trecho): fica guardado com o trecho, e junto da data');
    await botao(L, 'hoje:tempo');
    ok((await agora()).k === outro && (await agora()).mao, 'no 6º tempo (o mesmo trecho): continua o escolhido');
    await botao(L, 'hoje:tempo');
    const dep = await agora(), viz = await A(L, k => [k].concat(__mundo.N.VIZINHOS_CLIMA[k]), outro);
    ok(!dep.mao && viz.includes(dep.k), 'no 7º tempo (a próxima mudança): segue aos poucos a partir do escolhido (ele mesmo, ou um vizinho): ' + dep.k);
    await foto('l9-clima');
    // uma vez por dia: como antes
    await aba(L, 'mapa'); await escolher(L, 'mapa:clima-cada', '0');
    await aba(L, 'hoje');
    ok(await L.F.locator('#pane [data-k="hoje:trechos"]').count() === 0 && /Trocar o de hoje/.test(await L.F.locator('#pane').innerText()) && (await agora()).k === await A(L, () => __mundo.N.climaSorteado(__mundo.App.mapa, __mundo.App.mapa.cal.dia)), 'uma vez por dia: sem os trechos, "Trocar o de hoje", e o clima do dia todo é o sorteado');
    await aba(L, 'mapa'); await escolher(L, 'mapa:clima-cada', '2');
  });

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
