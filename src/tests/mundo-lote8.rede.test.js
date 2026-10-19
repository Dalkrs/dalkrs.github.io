// Mapa-múndi, lote 8 (parte 3), numa mesa (TC_LOCAL=… no banco local de ensaio): a bandeira do clã nas facções.
//   · o clã ligado a uma facção (escondido dos jogadores) dá a bandeira dela: o mapa do mestre a mostra no meio da região,
//     junto do grupo e na zona de guerra; a projeção a leva, e o jogador a vê no mapa mostrado — sem receber o clã;
//   · o brasão que muda no Clã muda a bandeira (no mapa do mestre, na projeção e no do jogador);
//   · o clã que deixa a facção leva a bandeira embora.
//   · (lote 10, pente fino) no Clã ligado a uma facção com a economia ligada: o "Cofre do clã" e o estoque da facção (só
//     para ler).
//   · (lote 10) a bandeira própria de uma facção sem clã: feita na janela, vai na projeção e o jogador a vê; com um clã
//     ligado, vale a do clã (a própria volta quando ele sai); a imagem (só numa mesa) vai para o banco e o jogador a vê.
//   · (lote 10, parte 6) o que os jogadores veem: a projeção leva a economia da facção deles e o que tem dentro da cidade
//     aberta (sem a guilda secreta, sem o estoque das outras facções); o jogador vê a linha deles no Livro do reino e a
//     cidade por dentro; fechar a semana põe o resumo no rascunho do Jornal da mesa (o jogador não o recebe).
//   · (lote 11, parte 1a) a corte: a projeção leva só os personagens conhecidos (sem as notas); o jogador os vê na aba
//     Corte. (parte 2a) Os títulos: a projeção leva o do reino (sem a nota) e não o de quem eles não conhecem; o jogador
//     vê o título junto do nome, a lista "Títulos" e o governante em Reinos. (parte 3a) A diplomacia: a projeção leva o
//     tratado público (sem a nota), não o secreto nem a opinião; o jogador o vê na aba Diplomacia.
const zlib = require('zlib');
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function png(w, h, cor) {
  const pedaco = (tipo, dados) => { const tam = Buffer.alloc(4), td = Buffer.concat([Buffer.from(tipo, 'latin1'), dados]), c = Buffer.alloc(4); tam.writeUInt32BE(dados.length); c.writeUInt32BE(crc32(td)); return Buffer.concat([tam, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const linha = 1 + w * 3, cru = Buffer.alloc(linha * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = cor(x, y), i = y * linha + 1 + x * 3; cru[i] = r; cru[i + 1] = g; cru[i + 2] = b; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', zlib.deflateSync(cru)), pedaco('IEND', Buffer.alloc(0))]);
}

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'mundo' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'mundo' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const quadro = async (p, re) => { for (let i = 0; i < 60; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const doc = (p, id) => p.evaluate(id => { const l = TC.dados.col('documentos').pegar(id); return l && !l.apagado ? l.dados : null; }, id);
  const BR = { forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: 'lua', img: null };
  const clan = br => ({ v: 1, nome: 'Lâmina de Aldar', lema: '', ordem: 0, jogadores: false, ver: { mostrar: false }, faccao: { id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, brasao: br,
    cargos: { lider: { nome: 'Líder', gente: [] } }, construcoes: [], recursos: { lista: [], hist: [] }, respeito: { v: 0, hist: [] }, relacoes: [], hist: [] });
  let nomeMesa = null;
  try {
    // ---------- a mesa e o jogador ----------
    await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
    await loginTela(M, c.mestre, c.senha);
    nomeMesa = 'Bandeira E2E ' + Date.now().toString(36);
    const codigo = await criarMesaTela(M, nomeMesa);
    await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
    await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');

    // ---------- o mapa: Aldar e o Vale, a região, o grupo e a zona de guerra ----------
    await M.locator('#tab-mundo').click();
    let W = null;
    ok(await ate(async () => { W = await quadro(M, /\/mundo\//); return W && await W.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre'); }), 'o mestre abre o Mapa-múndi da mesa');
    const mapa = await W.evaluate(() => {
      const { App, N } = __mundo;
      App.criarMapa('Terras de Aldar');
      App.mudar('montar', m => {
        m.faccoes.push({ id: 'fa', nome: 'Aldar', cor: '#3f7fbf' }, { id: 'fb', nome: 'Vale', cor: '#8a2a2a' });
        m.objs.push(Object.assign(N.objNovo('r', { pts: [[300, 300], [800, 300], [800, 700], [300, 700]] }), { id: 'reg', nome: 'Reino de Aldar', fac: 'fa' }),
          Object.assign(N.objNovo('g', { x: 500, y: 900, sigla: 'EXE' }), { id: 'gb', nome: 'Hoste de Aldar', fac: 'fa' }),
          Object.assign(N.objNovo('z', { tipo: 'guerra', pts: [[900, 300], [1300, 300], [1300, 700], [900, 700]], ini: m.cal.dia }), { id: 'zg', nome: 'Campos de Sangue', a: 'fa', b: 'fb' }));
      });
      App.mostrarAosJogadores(App.mapa.id);
      return App.mapa.id;
    });
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa); return !!(p && p.faccoes && p.faccoes.length === 2) && await M.evaluate(() => TC.dados.pendentes === 0); }), '(o mapa mostrado aos jogadores, com as duas facções e sem bandeira)');
    ok(!((await doc(M, 'mundo:pub:' + mapa)).faccoes.find(f => f.id === 'fa').br), '(sem clã ligado: a projeção vai sem bandeira)');

    // ---------- o clã (escondido dos jogadores) ligado a Aldar ----------
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:lam', { dados: d, vis: 'mestre' }), clan(BR));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), f = p && p.faccoes.find(x => x.id === 'fa'); return !!(f && f.br && f.br.cores[0] === '#24305e'); }), 'o clã ligado a Aldar: a projeção do mapa leva a bandeira (o brasão do clã)');
    const contar = (F, id) => F.evaluate(id => document.querySelectorAll(`#mundo svg [data-id="${id}"] .bandeira`).length, id);
    ok(await ate(async () => (await contar(W, 'reg')) === 1 && (await contar(W, 'gb')) === 1 && (await contar(W, 'zg')) === 1), 'no mapa do mestre: a bandeira no meio da região, junto do grupo e na zona de guerra');
    let JW = null;
    ok(await ate(async () => { JW = await quadro(J, /\/mundo\//); return JW && await JW.evaluate(() => !!window.__mundo && __mundo.App.pronto && __mundo.App.papel !== 'mestre' && !!__mundo.App.mapa); }), 'o jogador abre o mapa mostrado');
    ok(await ate(async () => (await contar(JW, 'reg')) === 1 && (await contar(JW, 'gb')) === 1), 'o jogador vê a bandeira de Aldar no mapa');
    const cl = await doc(J, 'cla:pub:lam');
    ok(!cl || cl.oculto === true, 'sem receber o clã (ele está escondido): ' + j(cl));
    ok(await JW.evaluate(() => /#24305e/i.test((document.querySelector('#mundo svg [data-id="reg"] .bandeira svg') || {}).innerHTML || '')), 'com as cores do brasão');

    // ---------- o brasão muda no Clã: a bandeira acompanha ----------
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:lam', { dados: d }, null, { cas: true }), clan(Object.assign({}, BR, { cores: ['#5f7f2a', '#e8eaf0'], div: 'cortado' })));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), f = p && p.faccoes.find(x => x.id === 'fa'); return !!(f && f.br && f.br.cores[0] === '#5f7f2a' && f.br.div === 'cortado'); }), 'o brasão novo: a projeção leva a bandeira nova');
    ok(await ate(async () => await JW.evaluate(() => /#5f7f2a/i.test((document.querySelector('#mundo svg [data-id="reg"] .bandeira svg') || {}).innerHTML || ''))), 'e o jogador vê a bandeira nova');

    // ---------- o clã sai da facção: a bandeira some ----------
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:lam', { dados: Object.assign(d, { faccao: null }) }, null, { cas: true }), clan(BR));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa); return !p.faccoes.find(x => x.id === 'fa').br; }), 'sem clã ligado de novo: a projeção vai sem bandeira');
    ok(await ate(async () => (await contar(JW, 'reg')) === 0 && (await contar(W, 'reg')) === 0), 'e a bandeira some dos dois mapas');

    // ---------- (lote 10) a bandeira própria do Vale, sem clã ----------
    await W.evaluate(() => { const { App, N } = __mundo; App.mudar('o Vale', m => { m.objs.push(Object.assign(N.objNovo('r', { pts: [[1400, 300], [1800, 300], [1800, 700], [1400, 700]] }), { id: 'regv', nome: 'Vale Verde', fac: 'fb' })); }); });
    await W.click('#tab-faccoes'); await w(300);
    await W.click('#pane [data-k="fac:fb"]'); await w(300);
    await W.click('#pane [data-k="f:fb:band"]');
    await W.waitForSelector('dialog.band-dl[open]');
    const D = s => 'dialog.band-dl[open] ' + s;
    ok(await W.evaluate(() => { const d = document.querySelector('dialog.band-dl[open]'); return !d.querySelector('[data-k="band:img"]').hidden && d.querySelector('[data-k="band:img"]').textContent === 'Usar uma imagem…' && d.querySelector('[data-k="band:img-nota"]').textContent === 'Ou use uma imagem (PNG, JPG ou WebP): ela fica no lugar do desenho.'; }),
      'numa mesa, a janela da bandeira oferece "Usar uma imagem…"');
    await W.click(D('[data-simb="torre"]')); await W.click(D('[data-k="band:ok"]')); await w(400);
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), f = p && p.faccoes.find(x => x.id === 'fb'); return !!(f && f.band && f.band.simb === 'torre' && !f.band.img && !f.br); }), 'a bandeira própria do Vale vai na projeção');
    ok(await ate(async () => (await contar(JW, 'regv')) === 1 && await JW.evaluate(() => /#8a2a2a/i.test((document.querySelector('#mundo svg [data-id="regv"] .bandeira svg') || {}).innerHTML || ''))), 'o jogador vê a bandeira do Vale (na cor dele)');
    // com um clã ligado ao Vale, vale a do clã; ele sai, a própria volta
    const clanV = d => Object.assign(clan(Object.assign({}, BR, { cores: ['#5b3f8a', '#e8eaf0'] })), { nome: 'Guarda do Vale', faccao: d });
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:gva', { dados: d, vis: 'mestre' }), clanV({ id: 'fb', nome: 'Vale', cor: '#8a2a2a' }));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), f = p && p.faccoes.find(x => x.id === 'fb'); return !!(f && f.br && f.br.cores[0] === '#5b3f8a' && f.band && f.band.simb === 'torre'); }), 'com um clã ligado ao Vale: a projeção leva as duas (a do clã e a própria)');
    ok(await ate(async () => await JW.evaluate(() => /#5b3f8a/i.test((document.querySelector('#mundo svg [data-id="regv"] .bandeira svg') || {}).innerHTML || ''))), 'e o jogador vê a do clã');
    await JW.click('#tab-faccoes'); await w(300, J);
    const listaJ = () => JW.evaluate(() => (document.querySelector('#pane [data-k="fac-band:fb"]') || {}).innerHTML || '');
    ok(await ate(async () => /#5b3f8a/i.test(await listaJ())), 'na aba Reinos do jogador, também a do clã');
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:gva', { dados: d }, null, { cas: true }), clanV(null));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), f = p && p.faccoes.find(x => x.id === 'fb'); return !!(f && !f.br && f.band); }) && await ate(async () => await JW.evaluate(() => /#8a2a2a/i.test((document.querySelector('#mundo svg [data-id="regv"] .bandeira svg') || {}).innerHTML || ''))),
      'o clã sai: o jogador volta a ver a bandeira própria do Vale');
    ok(await ate(async () => /#8a2a2a/i.test(await listaJ())), '(também na aba Reinos dele)');
    // a imagem: vai para o banco e o jogador a vê
    await W.click('#pane [data-k="f:fb:band"]');
    await W.waitForSelector('dialog.band-dl[open]');
    await W.locator(D('[data-k="band:arquivo"]')).setInputFiles({ name: 'vale.png', mimeType: 'image/png', buffer: png(900, 1080, (x, y) => [40 + (x >> 3), 120, 60 + (y >> 4)]) });
    ok(await ate(async () => await W.evaluate(() => { const d = document.querySelector('dialog.band-dl[open]'); return !!d && !!d.querySelector('[data-k="band:previa"] img') && !d.querySelector('[data-k="band:ok"]').disabled; })), 'a imagem escolhida sobe para a mesa e aparece na prévia');
    await W.click(D('[data-k="band:ok"]')); await w(400);
    let url = null;
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), f = p && p.faccoes.find(x => x.id === 'fb'); url = f && f.band && f.band.img; return /^https:\/\//.test(url || ''); }), 'a projeção leva o endereço da imagem (https): ' + url);
    ok(await ate(async () => await JW.evaluate(u => { const i = document.querySelector('#mundo svg [data-id="regv"] .bandeira image'); return !!i && i.getAttribute('href') === u; }, url)), 'e o jogador vê a imagem no lugar do desenho');
    const tam = await M.evaluate(async u => { const r = await fetch(u); const b = await r.blob(); const bm = await createImageBitmap(b); return [r.status, b.type, bm.width, bm.height]; }, url);
    ok(tam[0] === 200 && tam[1] === 'image/png' && tam[2] === 400 && tam[3] === 480, 'a imagem guardada é um PNG reduzido (480 px no lado maior): ' + j(tam));

    // ---------- (lote 10, pente fino) no Clã: o cofre do clã e o estoque da facção ligada (só para ler) ----------
    await W.evaluate(() => { const { App } = __mundo, R = window.MundoReino; App.mudar('a economia', m => { R.ligarEconomia(m); m.faccoes.find(f => f.id === 'fa').rec.find(r => r.id === 'lapros').n = 25; }); });
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:lam', { dados: d }, null, { cas: true }), clan(BR));
    ok(await ate(async () => { const d = await doc(M, 'mundo:mapa:' + mapa); return !!(d && d.eco && d.eco.on && d.faccoes.find(f => f.id === 'fa').rec.some(r => r.id === 'lapros' && r.n === 25)); }), '(a economia ligada no mapa, com 25 Lapros em Aldar)');
    await M.locator('#tab-cla').click();
    let CW = null;
    ok(await ate(async () => { CW = await quadro(M, /\/cla\//); return CW && await CW.evaluate(() => !!window.__cla && __cla.pronto && __cla.naMesa); }), 'o Clã da mesa abre');
    await CW.evaluate(() => { if (__cla.vista !== 'mestre') { const b = document.querySelector('[data-vista="mestre"]'); if (b) b.click(); } });
    await ate(async () => (await CW.locator('[data-cla="lam"]').count()) > 0);
    await CW.locator('[data-cla="lam"]').first().click();
    const caixaFac = () => CW.evaluate(() => { const e = document.querySelector('[data-k="rec:fac"]'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    ok(await ate(async () => /^Estoque de Aldar \(Mapa-múndi\) .*Lapros 25.* Só para ler: é o estoque da facção ligada ao clã/.test(await caixaFac())), 'no Clã ligado a Aldar: o estoque da facção, só para ler: ' + await caixaFac());
    ok(await CW.evaluate(() => document.querySelector('[data-k="sec:rec"] h2').textContent === 'Cofre do clã' && document.querySelector('[data-k="sec:cons"] h2').textContent === 'Construções do clã'), 'e o cofre e as construções com o nome do clã');

    // ---------- (lote 10, parte 6) o que os jogadores veem: a economia da facção deles, a cidade aberta e o resumo no Jornal ----------
    await M.locator('#tab-mundo').click(); await w(500);
    await W.evaluate(() => {
      const { App, N } = __mundo;
      App.mudar('o que os jogadores veem', m => {
        m.faccoes.find(f => f.id === 'fa').jog = true;
        Object.assign(m.faccoes.find(f => f.id === 'fb').rec.find(r => r.id === 'lapros'), { n: 9, ver: true });
        m.objs.push(Object.assign(N.objNovo('m', { x: 550, y: 500, ic: 'vila' }), { id: 'cv', nome: 'Vila Alta', ass: { niv: 'vila', pop: 0, estr: { camponeses: 25 },
          guildas: [{ id: 'gv', nome: 'Caçadores', ic: 'arco', txt: 'Na mata.', serv: [{ id: 'sv1', tipo: 'contrato', nome: 'Caçar o lobo', preco: '10 Lapros' }] }, { id: 'gs', nome: 'Sombra', secreta: true }],
          cla: { id: 'lam', prod: { forja: { lapros: 4 } } } } }));
      });
    });
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa), c0 = p && p.objs.find(o => o.id === 'cv'); return !!(p && p.ecoJ && p.ecoJ.fac === 'fa' && p.ecoJ.est.lapros === 25 && c0 && c0.dentro && c0.dentro.pop === 25 && c0.dentro.guildas.length === 1 && !('ass' in c0) && !p.faccoes.find(f => f.id === 'fb').rec.some(r => r.id === 'lapros')); }),
      'a projeção leva a economia da facção dos jogadores e o que tem dentro da cidade deles (sem a guilda secreta; sem o estoque do Vale)');
    ok(!('lapros' in (await doc(M, 'mundo:pub:' + mapa)).ecoJ.prod.cla), '(a sede do clã na Vila Alta: o clã ainda não tem a Forja, nada a produzir)');
    // só o clã muda (a Forja fica pronta no Clã; o brasão é o mesmo): quem mestra publica de novo, com a produção da sede
    await M.evaluate(d => TC.dados.col('documentos').gravar('cla:c:lam', { dados: Object.assign(d, { construcoes: [{ id: 'forja', nome: 'Forja', ico: 'forja', nivel: 1 }] }) }, null, { cas: true }), clan(BR));
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa); return !!(p && p.ecoJ && p.ecoJ.prod.cla.lapros === 4); }), 'a Forja do clã fica pronta: a projeção acompanha (a sede produz para Aldar)');
    await JW.click('#tab-faccoes'); await w(300, J);
    const livJ = () => JW.evaluate(() => Array.from(document.querySelectorAll('#pane .livro-li')).map(e => e.innerText.replace(/\s+/g, ' ')).join(' / '));
    ok(await ate(async () => /^Aldar .+ Produz por semana: .+ Estoque: Lapros 25/.test(await livJ())), 'o jogador vê, no Livro do reino, só a linha de Aldar com a produção e o estoque: ' + await livJ());
    await JW.click('#tab-selecao'); await w(200, J);
    await JW.evaluate(() => __mundo.App.selecionar(['cv'])); await w(400, J);
    const dentroJ = await JW.evaluate(() => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
    ok(/Vila · 25 pessoas/.test(dentroJ) && /Caçadores Na mata\. Contrato Caçar o lobo · 10 Lapros/.test(dentroJ) && !/Sombra/.test(dentroJ), 'e, na Vila Alta, o que tem dentro (a guilda secreta, não): ' + dentroJ.slice(0, 200));
    // a semana fecha: o resumo vai para o rascunho do Jornal da mesa (o jogador não o recebe)
    await W.evaluate(() => { __mundo.App.mudar('+7', m => { m.cal.dia += 7; }); });
    await W.waitForSelector('dialog.sem-dl[open]', { timeout: 6000 });
    ok(await W.locator('dialog.sem-dl[open] [data-k="sem:jornal"]').isChecked(), 'na prévia da semana, "Mandar o resumo da semana para o rascunho do Jornal" já marcada');
    await W.click('dialog.sem-dl[open] [data-k="sem:aplicar"]'); await w(500);
    let ras = null;
    ok(await ate(async () => { ras = await doc(M, 'jornal:rascunho'); return !!(ras && ras.materias && ras.materias.some(x => /^Aldar: a semana até /.test(x.tit) && /^\*\*O saldo:\*\* /.test(x.txt))); }), 'fechar a semana: o resumo vai para o rascunho do Jornal da mesa');
    ok(!(await doc(J, 'jornal:rascunho')), 'o jogador não recebe o rascunho');
    await M.locator('#tab-jornal').click();
    let JRW = null;
    ok(await ate(async () => { JRW = await quadro(M, /\/jornal\//); return JRW && await JRW.evaluate(() => !!window.__jornal && __jornal.pronto && __jornal.ras.materias.some(x => /^Aldar: a semana até /.test(x.tit))); }), 'na página Jornal, o mestre vê o resumo no rascunho (para revisar e publicar)');

    // ---------- (lote 11, parte 1a) a corte: o jogador recebe só os personagens conhecidos ----------
    await W.evaluate(() => {
      __mundo.App.mudar('a corte', m => {
        m.corte = { casas: [{ id: 'kv', nome: 'Casa do Vale', lema: 'Firmes' }], cargos: {},
          pessoas: [{ id: 'pa', nome: 'Ana do Vale', gen: 'm', casa: 'kv', fac: 'fa', cargo: 'marechal', nasc: { a: -30 }, onde: { t: 'm', id: 'cv' }, ver: true, txt: 'A marechal.', nota: 'Trama contra o rei.' },
            { id: 'pb', nome: 'Bento Oculto', casa: 'kv', fac: 'fa', pais: ['pa'], ver: false, nota: 'Herdeiro secreto.' }],
          // (parte 2a) os títulos: o do reino (a titular conhecida) e um sem terra de quem eles não conhecem
          titulos: [{ id: 'tr', grau: 'reino', preso: { t: 'f', id: 'fa' }, fac: 'fa', tit: 'pa', txt: 'A coroa de Aldar.', nota: 'Usurpou o trono.' },
            { id: 'tx', nome: 'Mão Oculta', tit: 'pb', nota: 'O culto.' }] };
      });
    });
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa); return !!(p && p.corte && p.corte.pessoas.length === 1 && p.corte.pessoas[0].id === 'pa' && p.corte.pessoas[0].nota === '' && p.corte.casas.length === 1); }),
      'a projeção leva só a personagem conhecida (sem a nota) e a casa dela');
    ok(!/Herdeiro secreto|Bento Oculto|Trama contra o rei/.test(JSON.stringify(await doc(J, 'mundo:pub:' + mapa))), 'o jogador não recebe o desconhecido nem as notas');
    await JW.click('#tab-corte'); await w(300, J);
    const corteJ = () => JW.evaluate(() => document.getElementById('pane').innerText.replace(/\s+/g, ' '));
    ok(await ate(async () => /Casa do Vale/.test(await corteJ()) && /Ana do Vale/.test(await corteJ()) && /Marechal de Aldar/.test(await corteJ()) && !/Bento/.test(await corteJ())), 'o jogador vê, na aba Corte, a Ana (com o cargo) e não o Bento: ' + (await corteJ()).slice(0, 160));
    // (parte 2a) os títulos: a projeção leva o do reino (sem a nota), não o de quem eles não conhecem; o jogador vê o título e o governante
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa); return !!(p && p.corte && j(p.corte.titulos.map(x => [x.id, x.tit, x.nota])) === j([['tr', 'pa', '']])); }), 'a projeção leva o título do reino (com a titular conhecida, sem a nota), não o sem terra de quem eles não conhecem');
    ok(!/Usurpou|Mão Oculta|O culto/.test(JSON.stringify(await doc(J, 'mundo:pub:' + mapa))), 'o jogador não recebe a nota nem o título escondido');
    ok(await ate(async () => /Ana do Vale, Rainha de Aldar/.test(await corteJ())), 'o jogador vê, nas casas, o título junto do nome da Ana');
    await JW.click('#pane [data-k="corte:vista:titulos"]'); await w(300, J);
    ok(await ate(async () => /Reino de Aldar Ana do Vale A coroa de Aldar\./.test(await corteJ()) && !/Mão Oculta/.test(await corteJ())), 'e, em "Títulos", o título do reino com a titular e o texto: ' + (await corteJ()).slice(0, 200));
    await JW.click('#tab-faccoes'); await w(300, J);
    ok(await ate(async () => /Governante: Ana do Vale, Rainha de Aldar/.test(await corteJ())), 'na aba Reinos, o jogador vê o governante');
    // (parte 3a) a diplomacia: a projeção leva o tratado público (sem a nota), não o secreto nem a opinião; o jogador vê na aba Diplomacia
    await W.evaluate(() => {
      __mundo.App.mudar('a diplomacia', m => {
        m.dipl = { tratados: [{ id: 'tp', tipo: 'alianca', partes: ['fa', 'fb'], pub: true, txt: 'Juntos contra o norte.', nota: 'Aldar quer trair.' }, { id: 'ts', tipo: 'paz', partes: ['fa', 'fb'], pub: false, nota: 'Pacto secreto.' }],
          opin: [{ de: 'fa', sobre: 'fb', motivos: [{ id: 'm1', txt: 'Inveja das minas', v: -40 }] }] };
      });
    });
    ok(await ate(async () => { const p = await doc(M, 'mundo:pub:' + mapa); return !!(p && p.dipl && j(p.dipl.tratados.map(x => [x.id, x.nota])) === j([['tp', '']]) && !p.dipl.opin.length); }), 'a projeção leva o tratado público (sem a nota), não o secreto nem a opinião');
    ok(!/Aldar quer trair|Pacto secreto|Inveja das minas/.test(JSON.stringify(await doc(J, 'mundo:pub:' + mapa))), 'o jogador não recebe a nota, o tratado secreto nem a opinião');
    await JW.click('#tab-diplomacia'); await w(300, J);
    ok(await ate(async () => /Aliança: Aldar, Vale/.test(await corteJ()) && /Juntos contra o norte\./.test(await corteJ()) && !/Paz ou trégua/.test(await corteJ())), 'na aba Diplomacia, o jogador vê o tratado público: ' + (await corteJ()).slice(0, 200));
  } catch (e) {
    ok(false, 'parou: ' + String((e && e.message) || e).split('\n')[0]);
  } finally {
    if (nomeMesa) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste:', e.message); } }
    const erros = (t.errs || []).filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/status of (400|401|403|409)/.test(e));
    if (erros.length) console.log(erros.slice(0, 8).join('\n'));
    ok(erros.length === 0, 'sem erros inesperados no console');
    await t.close();
    end();
  }
})().catch(e => { console.error(e); process.exit(1); });
