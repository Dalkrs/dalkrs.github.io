// Mapa-múndi → Cenas (lote 7, parte 4b), pela interface, numa moldura (a página faz o papel da casca, sem mesa): o que
// "Gerar a cena aqui" (no grupo) e "Gerar este lugar…" (no marcador) mandam para a aba Cenas.
//   · o terreno do hexágono (pelo desenho dele), o caminho da rota (estrada, trilha, mar, rio), a situação que o terreno
//     já diz (a lavoura, a savana) ou a Surpresa;
//   · a hora do tempo de agora (o calendário diz quando escurece), o clima do evento que cobre o lugar (tempestade e
//     inundação: chuva; incêndio: cinzas; magia: vaga-lumes) e o estilo da região mais de dentro que tiver um;
//   · o marcador: o lugar do ícone (cidade, vila, ponte, floresta, montanha), o terreno da vila e o nome; o atalho para a
//     cena que vai nascer (um passo de Desfazer); outros ícones e fora da casca, sem o botão.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const t = await start();
  const d = await t.device({ name: 'moldura', w: 1360, h: 880 });
  const P = d.page;
  P.setDefaultTimeout(8000);
  await P.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' });
  // a "casca": responde ao olá sem mesa e guarda os pedidos de abrir outra aba
  await P.evaluate(() => {
    window.__irs = [];
    addEventListener('message', e => {
      const m = e.data && e.data.tinycats;
      if (!m) return;
      if (m.t === 'ola') e.source.postMessage({ tinycats: { t: 'estado', v: 4, mesa: null, papel: null, cargo: null, jogando: false, mestra: null, segredo: false, eu: null, campanha: null, campanhas: [], temCampanhas: false, membros: [] } }, location.origin);
      if (m.t === 'ir') window.__irs.push({ aba: m.aba, alvo: m.alvo });
    });
    const f = document.createElement('iframe'); f.src = '/mundo/?debug'; f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'; document.body.append(f);
  });
  let F = null;
  for (let i = 0; i < 80 && !F; i++) { F = P.frames().find(f => f !== P.mainFrame() && /\/mundo\//.test(f.url())) || null; if (!F) await espera(100); }
  await F.waitForFunction(() => window.__mundo && __mundo.App.pronto, null, { timeout: 15000 });
  ok(await F.evaluate(() => TC.ponte.naCasca && !__mundo.App.naMesa), '(o Mapa-múndi está na moldura, sem mesa)');
  if (await F.locator('#vazio [data-k="vz:nome"]').count()) { await F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await F.click('#vazio [data-k="vz:papel"]'); await espera(300); }

  // o mapa: uma faixa de cada terreno (fileiras de hexágonos), as rotas, os eventos, as regiões e os marcadores
  const ids = await F.evaluate(() => {
    const { App, N } = __mundo, out = {};
    if (!App.mapa) App.criarMapa('Teste das cenas');
    App.mudar('montar', m => {
      m.grade.tam = 40; m.cal.dia = 10;
      // colunas: 0-1 floresta, 2-3 lavoura, 4-5 savana, 6-7 planície, 8-9 neve, 10-11 água, 12-13 deserto, 14-15 um terreno sem desenho
      m.terrenos.push({ id: 'zz', nome: 'Terra estranha', cor: '#777777', custo: 5 });
      const COL = ['fl', 'fl', 'la', 'la', 'sv', 'sv', 'pl', 'pl', 'ne', 'ne', 'ag', 'ag', 'de', 'de', 'zz', 'zz'];
      for (let q = 0; q < 16; q++) for (let r = -8; r < 20; r++) m.hexes[q + ',' + r] = COL[q];
      const c = (q, r) => N.centroHex(m, q, r);
      const grupo = (nome, q, via) => {
        const a = c(q, 4), b = c(q, 9);
        let rota = null;
        if (via) { const rt = Object.assign(N.objNovo('t', { pts: [[a.x, a.y], [b.x, b.y]] }), { nome: 'Rota ' + nome, via }); m.objs.push(rt); rota = rt.id; }
        const g = N.objNovo('g', { x: a.x, y: a.y, nome, sigla: nome.slice(0, 3).toUpperCase(), rota, prog: 0 }); m.objs.push(g); out[nome] = g.id;
      };
      grupo('floresta-estrada', 0, 'estrada'); grupo('lavoura', 2, null); grupo('savana-trilha', 4, 'trilha'); grupo('planicie-estrada', 6, 'estrada');
      grupo('planicie', 7, null); grupo('neve-selvagem', 8, 'selvagem'); grupo('mar', 10, 'mar'); grupo('rio', 11, 'rio'); grupo('estranha', 14, null);
      // os marcadores (a fileira 14)
      const mk = (nome, q, ic) => { const p = c(q, 14), o = N.objNovo('m', { x: p.x, y: p.y, ic, nome }); m.objs.push(o); out['m:' + ic + ':' + q] = o.id; };
      mk('Areia Alta', 12, 'cidade'); mk('Vila do Campo', 6, 'vila'); mk('Vila Fria', 9, 'vila'); mk('Ponte Velha', 7, 'ponte'); mk('Pico Azul', 8, 'montanha'); mk('Forte', 3, 'castelo'); mk('', 5, 'vila');
      { const o = N.objNovo('m', { x: 120, y: 165, ic: 'floresta', nome: 'Mata Escura' }); m.objs.push(o); out['m:floresta:1'] = o.id; }       // (dentro do Condado)
      // os eventos de hoje: cada um sobre um grupo
      const ev = (tipo, nome, extra) => { const g = m.objs.find(o => o.id === out[nome]); m.objs.push(Object.assign(N.objNovo('e', { x: g.x, y: g.y, tipo, r: 30, ini: m.cal.dia }), extra || {})); };
      ev('tempestade', 'floresta-estrada'); ev('incendio', 'savana-trilha'); ev('magia', 'neve-selvagem'); ev('inundacao', 'rio'); ev('guerra', 'planicie');
      ev('tempestade', 'lavoura', { fim: m.cal.dia - 1, ini: m.cal.dia - 5 });               // já acabou
      // as regiões: o Reino (oriental) com o Condado dentro (sem estilo) e a Mina (anão) dentro do Condado. Os grupos ficam
      // na fileira 4 (y ≈ 139), a 40 unidades um do outro: floresta x 80, lavoura 160, savana 240, planície 320…
      const ret = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const reino = Object.assign(N.objNovo('r', { pts: ret(50, 270, 95, 185) }), { nome: 'Reino', estilo: 'oriental' });
      const condado = Object.assign(N.objNovo('r', { pts: ret(55, 200, 100, 180), pai: reino.id }), { nome: 'Condado' });
      const mina = Object.assign(N.objNovo('r', { pts: ret(140, 180, 120, 158), pai: condado.id }), { nome: 'Mina', estilo: 'anao' });
      m.objs.push(reino, condado, mina);
      m.cal.tempo = 7;                                          // o 8º tempo: entardecer (de fábrica)
    });
    return out;
  });
  const pane = sel => F.locator('#pane ' + sel);
  const selecionar = async id => { await F.evaluate(id => { __mundo.App.selecionar([]); __mundo.App.selecionar([id]); }, id); await espera(250); if (await F.locator('#tab-selecao').count()) { await F.click('#tab-selecao'); await espera(150); } };
  const pedidos = () => P.evaluate(() => window.__irs.splice(0));
  const gerarAqui = async nome => { await selecionar(ids[nome]); await pane('[data-k="o:gerar-cena"]').click(); await espera(250); const l = await pedidos(); return l.length === 1 && l[0].aba === 'cenas' && l[0].alvo && l[0].alvo.gerar ? l[0].alvo.gerar : { erro: l }; };

  // ---------- o grupo ----------
  const ger = {};
  for (const nome of ['floresta-estrada', 'lavoura', 'savana-trilha', 'planicie-estrada', 'planicie', 'neve-selvagem', 'mar', 'rio', 'estranha']) ger[nome] = await gerarAqui(nome);
  const op = nome => j(ger[nome].op);
  ok(ger['floresta-estrada'].lugar === 'encontro' && op('floresta-estrada') === j({ terreno: 'floresta', situacao: 'surpresa', caminho: 'estrada' }), 'na floresta, numa estrada: o encontro na floresta, com a estrada e a situação sorteada: ' + op('floresta-estrada'));
  ok(op('lavoura') === j({ terreno: 'campo', situacao: 'plantacao', caminho: 'nenhum' }), 'na lavoura, fora de rota: o campo, já na plantação: ' + op('lavoura'));
  ok(op('savana-trilha') === j({ terreno: 'campo', situacao: 'capim', caminho: 'trilha' }), 'na savana, numa trilha: o capim alto, com a trilha: ' + op('savana-trilha'));
  ok(op('planicie-estrada') === j({ terreno: 'estrada', situacao: 'surpresa', caminho: 'estrada' }), 'na planície, numa estrada: o encontro na estrada: ' + op('planicie-estrada'));
  ok(op('planicie') === j({ terreno: 'campo', situacao: 'surpresa', caminho: 'nenhum' }), 'na planície, fora de rota: o campo, sem caminho: ' + op('planicie'));
  ok(op('neve-selvagem') === j({ terreno: 'neve', situacao: 'surpresa', caminho: 'nenhum' }), 'na neve, em terreno selvagem: a neve, sem caminho: ' + op('neve-selvagem'));
  ok(op('mar') === j({ terreno: 'agua', situacao: 'navio' }) && op('rio') === j({ terreno: 'agua', situacao: 'barco' }), 'numa rota de mar, o navio; numa de rio, o barco: ' + op('mar') + ' ' + op('rio'));
  ok(op('estranha') === j({ terreno: 'campo', situacao: 'surpresa', caminho: 'nenhum' }), 'num terreno que o mestre criou sem desenho: o campo: ' + op('estranha'));
  ok(Object.values(ger).every(g => g.hora === 'entardecer'), 'a hora do tempo de agora (o 8º de 10): entardecer, em todos');
  const clima = Object.fromEntries(Object.entries(ger).map(([k, g]) => [k, g.clima]));
  ok(clima['floresta-estrada'] === 'chuva' && clima.rio === 'chuva' && clima['savana-trilha'] === 'cinzas' && clima['neve-selvagem'] === 'vagalumes', 'o clima dos eventos: a tempestade e a inundação dão chuva, o incêndio cinzas, a magia vaga-lumes: ' + j(clima));
  ok(clima.planicie === '' && clima.lavoura === '' && clima.mar === '', 'a guerra não muda o clima; o evento que já acabou e o lugar sem evento, nada: ' + j(clima));
  const est = Object.fromEntries(Object.entries(ger).map(([k, g]) => [k, g.estilo === undefined ? '-' : g.estilo]));
  ok(est['floresta-estrada'] === 'oriental' && est.lavoura === 'anao' && est['savana-trilha'] === 'oriental' && est.planicie === '-' && est.mar === '-', 'o estilo: o do Reino passa pelo Condado (sem estilo); a Mina, dentro dele, é anã; fora das regiões, nenhum: ' + j(est));
  // o calendário: a noite mais cedo
  await F.evaluate(() => __mundo.App.mudar('escurecer', m => { m.cal.ent = 5; m.cal.noi = 7; m.cal.tempo = 6; }));
  ok((await gerarAqui('planicie')).hora === 'noite', 'com a noite a partir do 7º tempo, o 7º já é noite');
  await F.evaluate(() => __mundo.App.mudar('clarear', m => { m.cal.tempo = 0; }));
  ok((await gerarAqui('planicie')).hora === 'dia', 'e o 1º tempo é dia');
  ok(await F.evaluate(() => { const m = __mundo.App.mapa; return m.objs.filter(o => o.k === 'g' && o.liga).length === 0; }) && (await pedidos()).length === 0, 'gerar no grupo não muda nada no mapa');

  // ---------- os marcadores ----------
  const lugar = async chave => {
    await selecionar(ids[chave]);
    const b = pane(`[data-k="o:${ids[chave]}:gerar"]`);
    if (!(await b.count())) return null;
    await b.click(); await espera(250);
    const l = await pedidos(), liga = await F.evaluate(id => __mundo.App.mapa.objs.find(o => o.id === id).liga, ids[chave]);
    return l.length === 1 ? Object.assign({ liga }, l[0].alvo) : { erro: l };
  };
  const cid = await lugar('m:cidade:12');
  ok(cid && cid.gerar.lugar === 'cidade' && j(cid.gerar.op) === j({ terreno: 'areia' }) && cid.gerar.nome === 'Areia Alta', 'a cidade no deserto: a aba Cidade, na areia, com o nome do marcador: ' + j(cid && cid.gerar));
  ok(cid && cid.liga && cid.liga.t === 'cena' && /^cena_mundo_[a-z0-9]+$/.test(cid.liga.id) && cid.cena === cid.liga.id && cid.liga.nome === 'Areia Alta', 'o marcador fica ligado à cena que vai nascer, com o id que vai para as Cenas: ' + j(cid && [cid.liga, cid.cena]));
  ok(await F.evaluate(() => __mundo.App.rotuloDesfazer()) === 'ligar o marcador à cena gerada', 'um passo de desfazer');
  await F.evaluate(() => __mundo.App.desfazer()); await espera(250);
  ok(await F.evaluate(id => !__mundo.App.mapa.objs.find(o => o.id === id).liga, ids['m:cidade:12']), 'Desfazer solta o marcador');
  const v1 = await lugar('m:vila:6'), v2 = await lugar('m:vila:9');
  ok(v1 && v1.gerar.lugar === 'vila' && v1.gerar.op.terreno === 'campo' && v2 && v2.gerar.op.terreno === 'neve', 'a vila na planície fica no campo; a da neve, na neve: ' + j([v1 && v1.gerar.op, v2 && v2.gerar.op]));
  const pt = await lugar('m:ponte:7'), fl = await lugar('m:floresta:1'), mo = await lugar('m:montanha:8');
  ok(pt && pt.gerar.lugar === 'encontro' && pt.gerar.op.terreno === 'estrada' && pt.gerar.op.situacao === 'ponte', 'a ponte: o encontro da ponte sobre o rio: ' + j(pt && pt.gerar.op));
  ok(fl && j(fl.gerar.op) === j({ terreno: 'floresta', caminho: 'nenhum' }) && fl.gerar.estilo === 'oriental' && mo && mo.gerar.op.terreno === 'montanha', 'a floresta (no Reino: oriental) e a montanha: ' + j([fl && fl.gerar, mo && mo.gerar.op]));
  const sem = await lugar('m:vila:5');
  ok(sem && !('nome' in sem.gerar) && sem.liga && sem.liga.nome === '', 'um marcador sem nome não manda nome (a janela usa o dela)');
  ok(await lugar('m:castelo:3') === null, 'um ícone que não é lugar gerável (o castelo) não tem o botão');
  // ligado a uma cena que ainda não existe: o botão de seguir oferece gerar de novo, com o mesmo id
  await selecionar(ids['m:vila:6']);
  const seguir = pane(`[data-k="o:${ids['m:vila:6']}:seguir"]`);
  ok(/Gerar este lugar/.test(await seguir.textContent()) && !(await pane(`[data-k="o:${ids['m:vila:6']}:gerar"]`).count()), 'com o atalho para a cena que não nasceu, o botão de abrir vira "Gerar este lugar…"');
  await seguir.click(); await espera(250);
  const de2 = await pedidos();
  ok(de2.length === 1 && de2[0].alvo.cena === v1.liga.id && de2[0].alvo.gerar.lugar === 'vila', 'e pede de novo, com o mesmo id: ' + j(de2.map(x => x.alvo.cena)));
  ok(await F.evaluate(() => __mundo.App.rotuloDesfazer()) !== 'ligar o marcador à cena gerada' || (await F.evaluate(id => __mundo.App.mapa.objs.filter(o => o.id === id && o.liga).length, ids['m:vila:6'])) === 1, '(sem ligar de novo)');

  // ---------- fora da casca: sem os botões ----------
  {
    const d2 = await t.device({ name: 'solto', w: 1300, h: 850 }), P2 = d2.page;
    await P2.goto(t.base + 'mundo/?debug', { waitUntil: 'load' });
    await P2.waitForFunction(() => window.__mundo && __mundo.App.pronto, null, { timeout: 15000 });
    if (await P2.locator('#vazio [data-k="vz:nome"]').count()) { await P2.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await P2.click('#vazio [data-k="vz:papel"]'); await espera(300); }
    const r = await P2.evaluate(() => { const { App, N } = __mundo; App.criarMapa('Solto'); const o = {}; App.mudar('montar', m => { const g = N.objNovo('g', { x: 100, y: 100, nome: 'G' }), mk = N.objNovo('m', { x: 200, y: 100, ic: 'vila', nome: 'V' }); m.objs.push(g, mk); o.g = g.id; o.m = mk.id; }); return o; });
    await P2.evaluate(id => __mundo.App.selecionar([id]), r.g); await espera(250);
    if (await P2.locator('#tab-selecao').count()) { await P2.click('#tab-selecao'); await espera(150); }
    const bg = await P2.locator('#pane [data-k="o:gerar-cena"]').count();
    await P2.evaluate(id => __mundo.App.selecionar([id]), r.m); await espera(250);
    const bm = await P2.locator(`#pane [data-k="o:${r.m}:gerar"]`).count();
    ok(bg === 0 && bm === 0, 'fora do site (o Mapa-múndi sozinho), sem os botões de gerar: ' + j([bg, bm]));
    await d2.ctx.close();
  }

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
