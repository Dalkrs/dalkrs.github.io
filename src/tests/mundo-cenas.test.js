// Mapa-múndi → Cenas (lote 7, parte 4b), pela interface, numa moldura (a página faz o papel da casca, sem mesa): o que
// "Gerar a cena aqui" (no grupo) e "Gerar este lugar…" (no marcador) mandam para a aba Cenas.
//   · o terreno do hexágono (pelo desenho dele; a savana e a tundra, desde o lote 13, nos terrenos delas), o caminho da
//     rota (estrada, trilha, mar, rio), a situação que o terreno já diz (a lavoura) ou a Surpresa;
//   · a hora do tempo de agora (o calendário diz quando escurece), o clima do evento que cobre o lugar (tempestade e
//     inundação: chuva; incêndio: cinzas; magia: vaga-lumes), o estilo da região mais de dentro que tiver um e (lote 13,
//     parte 13c) a estação do mês de hoje (com o Inverno rigoroso em cima, inverno);
//   · (lote 14, parte 14b) a guerra do hexágono vai junto, e a janela das Cenas mostra os botões das marcas;
//   · (lote 14, parte 14a) o hexágono do grupo (o terreno dele e dos vizinhos, os rios e os caminhos que passam ali, em
//     pedaços) e a Região livre já preenchida com ele (o bioma, a água, o caminho); no mar, o hexágono sem a Região;
//   · o marcador: o lugar do ícone (cidade, vila, ponte, floresta, montanha, porto; as ruínas: ruína, templo, torre, castelo,
//     masmorra, caverna, mina), o terreno da vila e o nome; o atalho para a
//     cena que vai nascer (um passo de Desfazer); outros ícones e fora da casca, sem o botão;
//   · (lote 14, parte 14c) o marcador leva o hexágono dele (menos a masmorra), com o cerco do próprio lugar marcado; nas
//     Cenas, a janela abre no lugar com os arredores (o Médio) e o bloco do hexágono.
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
      // (lote 7, parte 5c) o clima do dia: sol o ano inteiro (a cena sem clima), para os casos de antes valerem
      m.clima = { tab: m.cal.meses.map(() => ({ sol: 100 })) };
      // colunas: 0-1 floresta, 2-3 lavoura, 4-5 savana, 6-7 planície, 8-9 neve, 10-11 água, 12-13 deserto, 14-15 um terreno sem desenho,
      // 16-17 ruínas
      m.terrenos.push({ id: 'zz', nome: 'Terra estranha', cor: '#777777', custo: 5 });
      const COL = ['fl', 'fl', 'la', 'la', 'sv', 'sv', 'pl', 'pl', 'ne', 'ne', 'ag', 'ag', 'de', 'de', 'zz', 'zz', 'ru', 'ru'];
      for (let q = 0; q < 18; q++) for (let r = -8; r < 20; r++) m.hexes[q + ',' + r] = COL[q];
      const c = (q, r) => N.centroHex(m, q, r);
      const grupo = (nome, q, via) => {
        const a = c(q, 4), b = c(q, 9);
        let rota = null;
        if (via) { const rt = Object.assign(N.objNovo('t', { pts: [[a.x, a.y], [b.x, b.y]] }), { nome: 'Rota ' + nome, via }); m.objs.push(rt); rota = rt.id; }
        const g = N.objNovo('g', { x: a.x, y: a.y, nome, sigla: nome.slice(0, 3).toUpperCase(), rota, prog: 0 }); m.objs.push(g); out[nome] = g.id;
      };
      grupo('floresta-estrada', 0, 'estrada'); grupo('lavoura', 2, null); grupo('savana-trilha', 4, 'trilha'); grupo('planicie-estrada', 6, 'estrada');
      grupo('planicie', 7, null); grupo('neve-selvagem', 8, 'selvagem'); grupo('mar', 10, 'mar'); grupo('rio', 11, 'rio'); grupo('estranha', 14, null);
      grupo('ruinas', 16, null);
      // os marcadores (a fileira 14)
      const mk = (nome, q, ic) => { const p = c(q, 14), o = N.objNovo('m', { x: p.x, y: p.y, ic, nome }); m.objs.push(o); out['m:' + ic + ':' + q] = o.id; };
      mk('Areia Alta', 12, 'cidade'); mk('Vila do Campo', 6, 'vila'); mk('Vila Fria', 9, 'vila'); mk('Ponte Velha', 7, 'ponte'); mk('Pico Azul', 8, 'montanha'); mk('Forte', 3, 'castelo'); mk('', 5, 'vila'); mk('Porto Azul', 13, 'porto');
      // (lote 7, parte 4b-3) as ruínas
      mk('Templo Velho', 1, 'templo'); mk('Torre Negra', 9, 'torre'); mk('Ruína', 2, 'ruina'); mk('Covil', 4, 'caverna'); mk('Mina Funda', 13, 'mina'); mk('Masmorra', 10, 'masmorra'); mk('Tesouro', 3, 'tesouro');
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
  ok(op('savana-trilha') === j({ terreno: 'savana', situacao: 'surpresa', caminho: 'trilha' }), 'na savana, numa trilha (lote 13: o terreno Savana), com a trilha e a situação sorteada: ' + op('savana-trilha'));
  ok(op('planicie-estrada') === j({ terreno: 'estrada', situacao: 'surpresa', caminho: 'estrada' }), 'na planície, numa estrada: o encontro na estrada: ' + op('planicie-estrada'));
  ok(op('planicie') === j({ terreno: 'campo', situacao: 'surpresa', caminho: 'nenhum' }), 'na planície, fora de rota: o campo, sem caminho: ' + op('planicie'));
  ok(op('neve-selvagem') === j({ terreno: 'neve', situacao: 'surpresa', caminho: 'nenhum' }), 'na neve, em terreno selvagem: a neve, sem caminho: ' + op('neve-selvagem'));
  ok(op('mar') === j({ terreno: 'agua', situacao: 'navio' }) && op('rio') === j({ terreno: 'agua', situacao: 'barco' }), 'numa rota de mar, o navio; numa de rio, o barco: ' + op('mar') + ' ' + op('rio'));
  ok(op('estranha') === j({ terreno: 'campo', situacao: 'surpresa', caminho: 'nenhum' }), 'num terreno que o mestre criou sem desenho: o campo: ' + op('estranha'));
  // (lote 14, parte 14a) o hexágono do grupo (o terreno dele e dos vizinhos, os rios e os caminhos que passam ali) e a
  // Região livre já preenchida com ele
  {
    const hx = ger['floresta-estrada'].hex, hl = ger.lavoura.hex;
    ok(hx && hx.k === '0,4' && hx.orient === 'pe' && hx.ter === 'floresta' && hx.viz.l === 'floresta' && hx.viz.o === null && hx.viz.se === 'floresta', 'o hexágono vai junto: a chave, a floresta, o vizinho igual e o de fora do terreno (nenhum): ' + j(hx && [hx.k, hx.ter, hx.viz]));
    ok(hx && hx.caminhos.length === 1 && hx.caminhos[0].t === 'estrada' && hx.caminhos[0].ini === false && hx.caminhos[0].fim === true && hx.rios.length === 0, 'a rota de estrada do grupo, que sai do meio do hexágono (acaba dentro de um lado, sai pela borda do outro): ' + j(hx && hx.caminhos.map(c => [c.t, c.ini, c.fim])));
    ok(j(ger['floresta-estrada'].ops) === j({ regiao: { bioma: 'floresta', agua: 'nenhuma', caminho: 'estrada' } }), 'a Região livre preenchida: o bioma, sem rio no mapa (nenhuma água a mais), a estrada: ' + j(ger['floresta-estrada'].ops));
    ok(hl && hl.ter === 'campo' && hl.viz.o === 'floresta' && hl.viz.l === 'campo' && j(ger.lavoura.ops) === j({ regiao: { bioma: 'campo', agua: 'nenhuma', caminho: 'nenhum' } }), 'na lavoura: o campo, a floresta a oeste, sem caminho: ' + j(hl && [hl.ter, hl.viz, ger.lavoura.ops]));
    ok(ger['savana-trilha'].hex.caminhos.some(c => c.t === 'trilha') && ger['savana-trilha'].ops.regiao.caminho === 'trilha' && ger['savana-trilha'].ops.regiao.bioma === 'savana', 'na savana, a trilha do grupo: ' + j(ger['savana-trilha'].ops));
    ok(ger.mar.hex && ger.mar.hex.ter === 'agua' && !('ops' in ger.mar), 'no mar: o hexágono (de água) vai, sem a Região livre preenchida');
    await F.evaluate(id => __mundo.App.mudar('um rio', m => { const N = __mundo.N, g = m.objs.find(o => o.id === id), a = N.centroHex(m, 6, 3), b = N.centroHex(m, 8, 5); m.objs.push(Object.assign(N.objNovo('l', { pts: [[a.x, a.y - 30], [g.x + 3, g.y - 2], [b.x, b.y + 30]] }), { estilo: 'rio', nome: 'Rio 14' })); }), ids.planicie);
    const gp = await gerarAqui('planicie');
    ok(gp.hex.rios.length === 1 && gp.hex.rios[0].ini && gp.hex.rios[0].fim && gp.hex.rios[0].pts[0][1] === 0 && gp.ops.regiao.agua === 'rio', 'com um rio do mapa passando ali: o rio (entra por cima, sai por baixo) e a Região com o rio: ' + j(gp.hex.rios.map(r => [r.pts[0], r.pts[r.pts.length - 1]])));
    await F.evaluate(() => __mundo.App.mudar('sem o rio', m => { m.objs = m.objs.filter(o => o.nome !== 'Rio 14'); }));
    // (lote 14, parte 14b) a guerra no hexágono do grupo: a batalha de dois dias atrás e o hexágono destruído vão junto
    await F.evaluate(() => __mundo.App.mudar('a guerra', m => { m.guerra = { tipos: [], hexes: { '0,4': 'd' }, bats: [{ id: 'bt14b', d: m.cal.dia - 2, nome: 'Batalha da Mata', a: { nome: 'Azul' }, b: { nome: 'Verde' }, fim: { vence: 'a', tam: 2 }, hex: '0,4' }] }; }));
    const gg = await gerarAqui('floresta-estrada');
    ok(gg.hex && gg.hex.guerra && gg.hex.guerra.bat && gg.hex.guerra.bat.nome === 'Batalha da Mata' && gg.hex.guerra.bat.dias === 2 && gg.hex.guerra.marca === 'd', 'a guerra do hexágono vai junto (a batalha de dois dias atrás e o destruído): ' + j(gg.hex && gg.hex.guerra));
    await F.evaluate(() => __mundo.App.mudar('sem a guerra', m => { delete m.guerra; }));
    // de ponta a ponta: o pedido chega às Cenas (a página do site, numa moldura da mesma casca) e a janela "Gerar um
    // lugar" abre no Encontro, com a chave do hexágono ligada e a Região livre já preenchida
    await P.evaluate(() => { const f = document.createElement('iframe'); f.id = 'cenasF'; f.src = '/cenas/?debug'; f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2'; document.body.append(f); });
    let CF = null;
    for (let i = 0; i < 100 && !CF; i++) { CF = P.frames().find(f => /\/cenas\//.test(f.url())) || null; if (!CF) await espera(100); }
    await CF.waitForFunction(() => window.__tc && __tc.Gerador && __tc.Store && __tc.Store.S, null, { timeout: 20000 });
    await espera(800);
    await P.evaluate(alvo => document.getElementById('cenasF').contentWindow.postMessage({ tinycats: { t: 'alvo', alvo } }, location.origin), { gerar: ger['floresta-estrada'] });
    await CF.waitForFunction(() => !!__tc.Gerador.vivo(), null, { timeout: 15000 }).catch(() => null);
    const nas = await CF.evaluate(() => { const V = __tc.Gerador.vivo(); if (!V) return null; const E = V.estado; return { lugar: V.lugar, comHex: V.comum.comHex, hex: E.plano && E.plano.hex ? E.plano.hex.k : null, chave: !!document.getElementById('ger-hex'), txt: (document.getElementById('ger-hex-txt') || {}).textContent || '' }; });
    ok(nas && nas.lugar === 'encontro' && nas.comHex === true && nas.hex === '0,4' && nas.chave && /^Floresta \(hexágono 0, 4\)/.test(nas.txt), 'de ponta a ponta: nas Cenas, a janela abre no Encontro, com o hexágono do grupo: ' + j(nas));
    await CF.evaluate(() => __tc.UI.closeModal());
    // (lote 14, parte 14b) a guerra no hexágono do grupo (pedida antes, com o mapa à mostra): a janela mostra os botões das
    // marcas (ligados)
    await P.evaluate(alvo => document.getElementById('cenasF').contentWindow.postMessage({ tinycats: { t: 'alvo', alvo } }, location.origin), { gerar: gg });
    await CF.waitForFunction(() => !!__tc.Gerador.vivo() && !!document.getElementById('ger-guerra'), null, { timeout: 15000 }).catch(() => null);
    const gu = await CF.evaluate(() => { const V = __tc.Gerador.vivo(); return V ? { bts: [...document.querySelectorAll('#ger-guerra button')].map(b => [b.dataset.guerra, b.getAttribute('aria-pressed')]), info: !!(V.estado.plano && V.estado.plano.guerraInfo) } : null; });
    ok(gu && j(gu.bts) === j([['bat', 'true'], ['marca', 'true']]) && gu.info, 'de ponta a ponta: nas Cenas, os botões das marcas da guerra, ligados, e o lugar com elas: ' + j(gu));
    await CF.evaluate(() => __tc.UI.closeModal());
    await P.evaluate(() => document.getElementById('cenasF').remove());
  }
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
  // (lote 7, parte 5a) o que os eventos novos levam para a cena: o eclipse escurece (vence a noite da lua de sangue), o
  // inverno neva, a lua de sangue cobre a cena com a zona dela, a seca deixa o chão seco; os nomes vão junto
  const comEventos = async tipos => {
    await F.evaluate(([tipos, id]) => __mundo.App.mudar('eventos novos', m => {
      const N = __mundo.N, g = m.objs.find(o => o.id === id);
      m.objs = m.objs.filter(o => !(o.k === 'e' && /^ev5_/.test(o.nome)));
      for (const tp of tipos) m.objs.push(N.objNovo('e', { x: g.x, y: g.y, tipo: tp, r: 30, ini: m.cal.dia, nome: 'ev5_' + tp }));
    }), [tipos, ids.planicie]);
    return gerarAqui('planicie');
  };
  const e1 = await comEventos(['luaSangue', 'seca', 'eclipse', 'inverno']);
  ok(e1.hora === 'breu' && e1.clima === 'neve' && j(e1.fx) === j(['luaSangue']) && e1.seco === true && j(e1.eventos) === j(['ev5_luaSangue', 'ev5_seca', 'ev5_eclipse', 'ev5_inverno']), 'os eventos no pedido da cena: o breu do eclipse, a neve do inverno, a zona da lua de sangue, o chão seco e os nomes: ' + j([e1.hora, e1.clima, e1.fx, e1.seco, e1.eventos]));
  const e2 = await comEventos(['luaSangue']);
  ok(e2.hora === 'noite' && e2.clima === '' && !('seco' in e2), 'a lua de sangue, de dia, faz noite: ' + j([e2.hora, e2.clima]));
  const e3 = await comEventos(['assombracao']);
  ok(e3.clima === 'neblina' && j(e3.fx) === j(['espiritos']) && e3.hora === 'dia', 'a assombração: neblina e a Névoa de espíritos: ' + j([e3.clima, e3.fx]));
  const e4 = await comEventos([]);
  ok(!('fx' in e4) && !('seco' in e4) && !('eventos' in e4) && e4.hora === 'dia', 'sem os eventos novos, o pedido de antes: ' + j(e4));
  // (lote 13, parte 13c) a estação do mês de hoje no calendário; com o Inverno rigoroso em cima, inverno
  ok(Object.values(ger).every(g => g.estacao === 'inverno') && e4.estacao === 'inverno', 'a estação do mês de hoje (o dia 10: o primeiro mês, inverno), em todos: ' + j(Object.values(ger).map(g => g.estacao)));
  await F.evaluate(() => __mundo.App.mudar('o outono', m => { const N = __mundo.N, n = N.mesesDe(m.cal).length; let d = 0; while (d < 4000 && N.estacaoDoMes(N.dataDe(m.cal, d).mes, n) !== 'outono') d++; m.cal.dia = d; }));
  const e5 = await comEventos([]), e6 = await comEventos(['inverno']);
  ok(e5.estacao === 'outono' && e6.estacao === 'inverno', 'no mês de outono, o outono; com o Inverno rigoroso em cima, o inverno: ' + j([e5.estacao, e6.estacao]));
  await comEventos([]);
  await F.evaluate(() => __mundo.App.mudar('de volta ao dia 10', m => { m.cal.dia = 10; }));
  // (lote 7, parte 5c) sem evento, o clima do dia: a neve neva; a névoa vira neblina; o calor não tem clima de cena; o
  // evento vence o clima do dia; a região com ajuste manda no clima dela
  const comClima = async (k, extra) => { await F.evaluate(([k, extra]) => __mundo.App.mudar('o clima do dia', m => { m.clima = { tab: m.cal.meses.map(() => ({ [k]: 100 })) }; if (extra) extra(m); }), [k, null]); return gerarAqui('planicie'); };
  const c1 = await comClima('neve'), c2 = await comClima('nevoa'), c3 = await comClima('calor');
  ok(c1.clima === 'neve' && c2.clima === 'neblina' && c3.clima === '', 'sem evento, o clima do dia: neve, neblina, nada (o calor): ' + j([c1.clima, c2.clima, c3.clima]));
  const c4 = await comEventos(['tempestade']);
  ok(c4.clima === 'chuva', 'o evento vence o clima do dia (a tempestade, com o calor do dia): ' + c4.clima);
  await comEventos([]);
  await F.evaluate(id => __mundo.App.mudar('a região fria', m => { const g = m.objs.find(o => o.id === id); m.objs.push(Object.assign(__mundo.N.objNovo('r', { pts: [[g.x - 50, g.y - 50], [g.x + 50, g.y - 50], [g.x + 50, g.y + 50], [g.x - 50, g.y + 50]] }), { id: 'rfria', clima: { calor: 'nunca', neve: 'muito' } })); }), ids.planicie);
  const c5 = await gerarAqui('planicie');
  ok(c5.clima === 'neve', 'na região com ajuste (nunca calor, muito mais neve): neve: ' + c5.clima);
  await F.evaluate(() => __mundo.App.mudar('sem a região fria', m => { m.objs = m.objs.filter(o => o.id !== 'rfria'); m.clima = { tab: m.cal.meses.map(() => ({ sol: 100 })) }; }));
  // (lote 7, parte 4b-3) no terreno Ruínas: a aba Ruínas
  const gr = await gerarAqui('ruinas');
  ok(gr.lugar === 'ruinas' && j(gr.op) === j({ terreno: 'campo' }) && gr.hora === 'dia', 'no terreno Ruínas, o grupo gera as ruínas (a aba Ruínas), e não um encontro: ' + j(gr));
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
  // (lote 14, parte 14c) os lugares do marcador levam o hexágono dele (o chão dele vai nos arredores do lugar)
  ok(v1 && v1.gerar.hex && v1.gerar.hex.k === '6,14' && v1.gerar.hex.ter === 'campo' && v2.gerar.hex.ter === 'neve' && cid && cid.gerar.hex && cid.gerar.hex.k === '12,14' && cid.gerar.hex.ter === 'deserto' && !('guerra' in v1.gerar.hex), 'os lugares do marcador levam o hexágono dele (o chão dos arredores): ' + j([v1 && v1.gerar.hex && [v1.gerar.hex.k, v1.gerar.hex.ter], cid && cid.gerar.hex && cid.gerar.hex.k]));
  const pt = await lugar('m:ponte:7'), fl = await lugar('m:floresta:1'), mo = await lugar('m:montanha:8');
  ok(pt && pt.gerar.lugar === 'encontro' && pt.gerar.op.terreno === 'estrada' && pt.gerar.op.situacao === 'ponte', 'a ponte: o encontro da ponte sobre o rio: ' + j(pt && pt.gerar.op));
  ok(fl && j(fl.gerar.op) === j({ terreno: 'floresta', caminho: 'nenhum' }) && fl.gerar.estilo === 'oriental' && mo && mo.gerar.op.terreno === 'montanha', 'a floresta (no Reino: oriental) e a montanha: ' + j([fl && fl.gerar, mo && mo.gerar.op]));
  ok(pt.gerar.hex && pt.gerar.hex.k === '7,14' && fl.gerar.hex && fl.gerar.hex.ter === 'floresta' && mo.gerar.hex && mo.gerar.hex.k === '8,14', 'o encontro do marcador também leva o hexágono (a ponte, a floresta, a montanha): ' + j([pt.gerar.hex && pt.gerar.hex.k, mo.gerar.hex && mo.gerar.hex.k]));
  // (14c) o cerco do forte: o pedido do marcador dele leva o cerco marcado (a cena é o próprio lugar cercado)
  await F.evaluate(id => __mundo.App.mudar('o cerco do forte', m => { const N = __mundo.N, f = Object.assign(N.faccaoNova('Ferro', '#b03a2e'), { id: 'fc_ferro14c' }); m.faccoes = (m.faccoes || []).concat([f]); m.objs.find(o => o.id === id).cerco = { fac: f.id, d: m.cal.dia - 3 }; }), ids['m:castelo:3']);
  const po = await lugar('m:porto:13');
  ok(po && po.gerar.lugar === 'porto' && j(po.gerar.op) === j({ terreno: 'areia' }) && po.gerar.nome === 'Porto Azul' && po.liga && po.liga.t === 'cena', 'o porto (lote 7, parte 4b-2b): a aba Porto, no terreno do hexágono (o deserto), com o nome do marcador: ' + j(po && po.gerar));
  const sem = await lugar('m:vila:5');
  ok(sem && !('nome' in sem.gerar) && sem.liga && sem.liga.nome === '', 'um marcador sem nome não manda nome (a janela usa o dela)');
  // (lote 7, parte 4b-3) os marcadores das ruínas: a aba Ruínas, já no lugar do ícone e no terreno do hexágono
  const ru = {}, gerou = {};
  for (const k of ['m:castelo:3', 'm:templo:1', 'm:torre:9', 'm:ruina:2', 'm:caverna:4', 'm:mina:13', 'm:masmorra:10']) { const l = await lugar(k); gerou[k] = l && l.gerar; ru[k] = l && l.gerar.lugar === 'ruinas' ? j(l.gerar.op) : null; }
  ok(ru['m:castelo:3'] === j({ tipo: 'forte', terreno: 'campo' }) && ru['m:templo:1'] === j({ tipo: 'templo', terreno: 'floresta' }) && ru['m:torre:9'] === j({ tipo: 'torre', terreno: 'neve' }) && ru['m:ruina:2'] === j({ terreno: 'campo' }), 'o castelo (o forte em ruínas), o templo (o templo caído, na floresta), a torre (na neve) e a ruína: ' + j(ru));
  ok(ru['m:caverna:4'] === j({ tipo: 'circulo', terreno: 'areia' }) && ru['m:mina:13'] === j({ tipo: 'mina', terreno: 'areia' }) && ru['m:masmorra:10'] === null, 'a caverna (o círculo de pedras com a boca) e a mina (a boca da mina): ' + j(ru));
  // (4b-3c) a masmorra: a aba Masmorra (o nível 1), com o nome do marcador
  ok(gerou['m:masmorra:10'] && gerou['m:masmorra:10'].lugar === 'masmorra' && gerou['m:masmorra:10'].nome === 'Masmorra', 'o marcador Masmorra abre a aba Masmorra, com o nome do marcador: ' + j(gerou['m:masmorra:10']));
  const fo = gerou['m:castelo:3'] && gerou['m:castelo:3'].hex;
  ok(fo && fo.k === '3,14' && fo.guerra && fo.guerra.cerco && fo.guerra.cerco.nome === 'Forte' && fo.guerra.cerco.aqui === true && fo.guerra.cerco.dias === 3 && !('hex' in gerou['m:masmorra:10']), 'o forte cercado: o hexágono com o cerco dele, marcado (aqui); a masmorra, sem o hexágono: ' + j(fo && fo.guerra));
  await F.evaluate(id => __mundo.App.mudar('sem o cerco', m => { delete m.objs.find(o => o.id === id).cerco; m.faccoes = m.faccoes.filter(f => f.id !== 'fc_ferro14c'); }), ids['m:castelo:3']);
  // (14c) de ponta a ponta: o pedido da vila chega às Cenas e a janela abre no Vilarejo, com os arredores (o Médio) e o
  // bloco do hexágono; o Traçado diz os portões do mapa (o caminho que passa ali: nenhum — a rosa fica)
  {
    await P.evaluate(() => { const f = document.createElement('iframe'); f.id = 'cenasF2'; f.src = '/cenas/?debug'; f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;z-index:2'; document.body.append(f); });
    let CF = null;
    for (let i = 0; i < 100 && !CF; i++) { CF = P.frames().find(f => /\/cenas\//.test(f.url())) || null; if (!CF) await espera(100); }
    await CF.waitForFunction(() => window.__tc && __tc.Gerador && __tc.Store && __tc.Store.S, null, { timeout: 20000 });
    await espera(800);
    await P.evaluate(alvo => document.getElementById('cenasF2').contentWindow.postMessage({ tinycats: { t: 'alvo', alvo } }, location.origin), { cena: v1.cena, gerar: v1.gerar });
    await CF.waitForFunction(() => !!__tc.Gerador.vivo(), null, { timeout: 15000 }).catch(() => null);
    const na = await CF.evaluate(() => { const V = __tc.Gerador.vivo(); if (!V) return null; const p = V.estado.plano; return { lugar: V.lugar, arr: p.arredores || null, hex: p.anel && p.anel.hex ? p.anel.hex.k : null, bts: [...document.querySelectorAll('#ger-arredores button')].map(b => [b.textContent, b.getAttribute('aria-pressed')]), chave: !!document.getElementById('ger-hex'), txt: (document.getElementById('ger-hex-txt') || {}).textContent || '', resumo: (document.getElementById('ger-resumo') || {}).textContent || '' }; });
    ok(na && na.lugar === 'vila' && na.arr === 'medio' && na.hex === '6,14' && na.chave && j(na.bts.find(b => b[1] === 'true')) === j(['Médio', 'true']) && /^Planície \(hexágono 6, 14\)/.test(na.txt) && /os arredores Médio/.test(na.resumo), 'de ponta a ponta: o marcador da vila abre o Vilarejo com os arredores (o Médio) e o hexágono dele: ' + j(na && [na.lugar, na.arr, na.hex, na.txt]));
    await CF.evaluate(() => __tc.UI.closeModal());
    await P.evaluate(() => document.getElementById('cenasF2').remove());
  }
  ok(await lugar('m:tesouro:3') === null, 'um ícone que não é lugar gerável (o tesouro) não tem o botão');
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
