// Mapa-múndi numa mesa de verdade (projeto real): o mestre cria o mapa, envia a imagem para o banco e mostra aos
// jogadores; o jogador recebe só a projeção pública — e o banco não entrega a ele o mapa do mestre nem aceita imagem dele.
const { start, checker, BANCO } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const SEG = 'Z9917Q';                                   // vai em tudo o que é só do mestre
(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await entrar(d.page, c.jog1, c.senha, 'Dalmo'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', seed: { 'tinycats:aba': 'mundo' } })).page;
  const J = (await t.device({ name: 'jogador', w: 1250, h: 820, seed: { 'tinycats:aba': 'mundo' } })).page;
  const w = (ms, p) => (p || M).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(400); } };
  const quadro = p => p.frame({ url: /\/mundo\// });
  const noMundo = async (p, fn, arg) => quadro(p).evaluate(fn, arg);

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Mundo E2E ' + Date.now().toString(36);
  const codigo = await criarMesaTela(M, nomeMesa);
  ok(await ate(async () => quadro(M) && await noMundo(M, () => window.__mundo && __mundo.App.pronto && __mundo.App.naMesa && __mundo.App.papel === 'mestre')), 'o mestre abre o Mapa-múndi dentro da mesa');
  const mesaId = await M.evaluate(() => TC.mesas.atual.id);

  // ---------- o mestre cria o mapa e envia a imagem ----------
  ok(await noMundo(M, () => !!__mundo.App.criarMapa('Terras do Teste')), 'cria um mapa na mesa');
  const img = await noMundo(M, async () => {
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 400;
    const cx = cv.getContext('2d'); cx.fillStyle = '#35603f'; cx.fillRect(0, 0, 640, 400); cx.fillStyle = '#2b4f7a'; cx.fillRect(320, 0, 320, 400);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const fez = await __mundo.App.definirImagem(new File([blob], 'mapa.png', { type: 'image/png' }));
    return { fez, img: __mundo.App.mapa.img, larg: __mundo.App.mapa.larg };
  });
  ok(img.fez && img.img && img.larg === 640, 'a imagem entra no mapa (640 px de largura): ' + JSON.stringify(img.img));
  ok(img.img && img.img.url.startsWith(BANCO + '/storage/v1/object/public/mesas/' + mesaId + '/'), 'a imagem fica guardada no banco, na pasta da mesa');
  const baixou = await M.evaluate(async u => { const r = await fetch(u); const b = await r.blob(); return { st: r.status, tipo: b.type, tam: b.size }; }, img.img.url);
  ok(baixou.st === 200 && baixou.tipo === 'image/png' && baixou.tam > 200, 'e abre pelo endereço público: ' + JSON.stringify(baixou));

  // ---------- conteúdo: público, escondido e com nota ----------
  ok(await noMundo(M, seg => { const { App, N } = __mundo; return App.mudar('montar', m => {
    m.objs.push(N.objNovo('m', { x: 120, y: 100, nome: 'Vila Pública', txt: 'Uma vila tranquila.', nota: 'nota ' + seg }));
    m.objs.push(N.objNovo('m', { x: 260, y: 100, nome: 'Covil ' + seg, oculto: true }));
    // (lote 6) a honra dos Heróis (todos veem) e o painel de uma facção (os jogadores veem só o que o mestre marcou)
    m.objs.push(N.objNovo('g', { x: 200, y: 220, nome: 'Os Heróis', sigla: 'HER', estilo: 'coroa', honra: 3, hhist: [{ d: 0, de: 2, para: 3, mot: 'Salvaram a vila' }] }));
    m.faccoes.push(Object.assign(N.faccaoNova('Aldar', '#c0503a'), { pop: 12000, apoio: 70, ver: { pop: false, apoio: true, hist: true },
      rec: [{ id: 'ouro', nome: 'Ouro', n: 500, ver: true }, { id: 'sold', nome: 'Soldados ' + seg, n: 300, ver: false }],
      hist: [{ d: 0, mot: 'Fundação', mud: [['r:ouro', 'Ouro', null, 500], ['r:sold', 'Soldados ' + seg, null, 300]] }, { d: 0, mot: 'Plano ' + seg, mud: [['pop', '', null, 12000]] }] }));
    // (lote 6) uma rota com uma montanha de 20 cubos (o custo próprio é do mestre) e os Batedores no meio dela: um tempo de dois
    m.grade.tam = 40; m.hexes['1,5'] = ['mo', 20];
    const rt = Object.assign(N.objNovo('t', { pts: [[100, 173.21], [300, 173.21]] }), { nome: 'Trilha Velha' });
    m.objs.push(rt, N.objNovo('g', { x: 100, y: 173.21, nome: 'Batedores', sigla: 'BAT', rota: rt.id, pt: 10, prog: 10 }));
    m.objs.push(N.objNovo('e', { x: 420, y: 260, nome: 'Praga', tipo: 'praga', r: 60 }));
    // o desenho: uma pincelada de floresta, um carimbo, um texto, um rio e uma zona de guerra (com uma fase que ainda vem)
    m.pintura.ops.push({ t: 'fl', r: 20, pts: [[50, 50], [200, 60]] });
    m.objs.push(N.objNovo('c', { x: 300, y: 300, ic: 'montanha', tam: 30, nome: 'Pico' }));
    m.objs.push(N.objNovo('x', { x: 320, y: 40, nome: 'Mar Raso', tam: 20 }));
    m.objs.push(N.objNovo('l', { pts: [[10, 300], [300, 380]], estilo: 'rio', larg: 8, nome: 'Rio Lento' }));
    m.objs.push(N.objNovo('z', { pts: [[400, 300], [500, 300], [500, 380]], ini: m.cal.dia, nome: 'Guerra Fria', nota: 'plano ' + seg, fases: [{ dia: m.cal.dia + 5, pts: [[0, 0], [1, 0], [1, 1]] }] }));
  }); }, SEG), 'o mestre põe um marcador público (com nota), um escondido, um grupo, um evento e o desenho (pincelada, carimbo, texto, rio e zona de guerra)');
  ok(await noMundo(M, () => __mundo.App.mostrarAosJogadores()), 'e mostra o mapa aos jogadores');
  ok(await ate(async () => await M.evaluate(() => TC.dados.pendentes === 0)), 'tudo sobe para a mesa');
  const docsM = await M.evaluate(() => TC.dados.col('documentos').todas().filter(d => d.id.startsWith('mundo:')).map(d => d.id.replace(/mp_[a-z0-9_]+/, '*') + ':' + d.vis).sort().join());
  ok(docsM === 'mundo:indice:mesa,mundo:mapa:*:mestre,mundo:pub:*:mesa', 'na mesa ficam o mapa (só do mestre), a projeção e o índice: ' + docsM);

  // ---------- o jogador ----------
  await J.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500, J);
  await loginTela(J, c.jog1, c.senha); await entrarMesaTela(J, codigo, 'Dalmo');
  ok(await ate(async () => quadro(J) && await noMundo(J, () => window.__mundo && __mundo.App.pronto && __mundo.App.papel === 'jogador' && __mundo.App.mapa && __mundo.App.mapa.nome === 'Terras do Teste')), 'o jogador abre o Mapa-múndi e recebe o mapa mostrado');
  const visto = await noMundo(J, () => ({ nomes: __mundo.App.mapa.objs.map(o => o.nome).sort().join('|'), tudo: JSON.stringify(__mundo.App.mapa), img: __mundo.App.mapa.img && __mundo.App.mapa.img.url, podeEditar: __mundo.App.podeEditar(), trilho: getComputedStyle(document.getElementById('rail')).display,
    zona: __mundo.App.mapa.objs.find(o => o.k === 'z'), pint: __mundo.App.mapa.pintura.ops.length }));
  ok(visto.nomes === 'Batedores|Guerra Fria|Mar Raso|Os Heróis|Pico|Praga|Rio Lento|Trilha Velha|Vila Pública', 'ele vê o que é público (o desenho também): ' + visto.nomes);
  const bat = await noMundo(J, () => { const g = __mundo.App.mapa.objs.find(o => o.nome === 'Batedores'); return { id: g && g.id, bol: g && g.bol, hex: __mundo.App.mapa.hexes['1,5'] }; });
  ok(JSON.stringify(bat.bol) === '[1,2]' && bat.hex === 'mo', 'os Batedores no meio da montanha: as bolinhas chegam prontas ao jogador (sem o custo próprio do hexágono): ' + JSON.stringify(bat));
  const fv = await noMundo(J, () => { const f = __mundo.App.mapa.faccoes.find(x => x.nome === 'Aldar'), g = __mundo.App.mapa.objs.find(o => o.nome === 'Os Heróis'); return { rec: f && f.rec, pop: f && f.pop, apoio: f && f.apoio, hist: f && f.hist, honra: g && [g.estilo, g.honra, g.hhist.length], gid: g && g.id }; });
  ok(JSON.stringify(fv.rec) === JSON.stringify([{ id: 'ouro', nome: 'Ouro', n: 500, ver: true }]) && fv.pop === null && fv.apoio === 70 && JSON.stringify(fv.hist) === JSON.stringify([{ d: 0, mot: 'Fundação', mud: [['r:ouro', 'Ouro', null, 500]] }]),
    'a facção chega ao jogador só com o que o mestre marcou (o Ouro, o apoio, e do histórico só o do Ouro): ' + JSON.stringify(fv));
  ok(JSON.stringify(fv.honra) === '["coroa",3,1]' && await ate(async () => await noMundo(J, id => { const n = document.querySelector('#mundo svg [data-id="' + id + '"] .honra .hon-num'); return !!n && n.textContent === '+3'; }, fv.gid)),
    'a honra dos Heróis (coroa, +3, com o histórico) chega ao jogador e aparece no mapa dele');
  ok(await ate(async () => await noMundo(J, id => { const g = document.querySelector('#mundo svg [data-id="' + id + '"]'); return !!g && g.querySelectorAll('.bolinhas .bol').length === 2 && g.querySelectorAll('.bolinhas .bol.feita').length === 1; }, bat.id)), 'e aparecem junto do grupo, no mapa dele');
  ok(visto.pint === 1 && !!visto.zona && visto.zona.fases.length === 0 && visto.zona.fim === null, 'o desenho à mão chega inteiro; a zona de guerra chega como está hoje, sem a fase que ainda vem');
  ok(await ate(async () => await noMundo(J, () => { const c = document.querySelector('#mundo canvas.pintura'); return !!c && !c.hidden; })), 'e o desenho à mão aparece na tela dele');
  ok(!visto.tudo.includes(SEG), 'nada do que é só do mestre chega até ele (nem a nota, nem o marcador escondido)');
  ok(visto.img === img.img.url, 'a imagem é a mesma, pelo endereço do banco');
  ok(visto.podeEditar === false && visto.trilho === 'none', 'o jogador não edita o mapa');
  ok(await ate(async () => await noMundo(J, () => { const im = document.querySelector('#mundo img'); return !!im && im.naturalWidth === 640; })), 'e a imagem aparece na tela dele');

  // ---------- o banco, direto: o que o jogador consegue ler e escrever ----------
  const direto = await J.evaluate(async ([mesa, seg]) => {
    const a = supabase.createClient(TC_CONFIG.url, TC_CONFIG.chave);
    const { data: docs } = await a.from('documentos').select('id,vis,dados').eq('mesa_id', mesa);
    const cv = document.createElement('canvas'); cv.width = cv.height = 8;
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const up = await a.storage.from('mesas').upload(mesa + '/invasor.png', blob, { contentType: 'image/png' });
    const lista = await a.storage.from('mesas').list(mesa);
    return { ids: (docs || []).map(d => d.id.replace(/mp_[a-z0-9_]+/, '*')).filter(i => i.startsWith('mundo:')).sort().join(), vazou: JSON.stringify(docs || []).includes(seg), upErro: up.error ? String(up.error.message) : null, lista: (lista.data || []).length };
  }, [mesaId, SEG]);
  ok(direto.ids === 'mundo:indice,mundo:pub:*', 'pelo banco, o jogador só lê a projeção e o índice: ' + direto.ids);
  ok(!direto.vazou, 'e o segredo do mestre não vem em nenhum documento');
  ok(!!direto.upErro, 'o banco recusa imagem enviada por jogador: ' + direto.upErro);

  // ---------- muda ao vivo ----------
  await noMundo(M, () => __mundo.App.mudar('renomear', m => { m.objs.find(o => o.nome === 'Vila Pública').nome = 'Vila Nova'; }));
  ok(await ate(async () => await noMundo(J, () => __mundo.App.mapa.objs.some(o => o.nome === 'Vila Nova'))), 'o que o mestre muda chega ao jogador');
  await noMundo(M, () => __mundo.App.esconderMapa());
  ok(await ate(async () => await noMundo(J, () => !__mundo.App.mapa)), 'mapa escondido pelo mestre some da tela do jogador');

  await apagarMesaTela(M, nomeMesa);
  // esperados: a conta de teste já existe (409 na preparação); o segundo cliente aberto só para a conferência direta;
  // e a recusa do banco à imagem do jogador (400)
  const errs = t.errs.filter(e => !/^\[prep\]/.test(e) && !/Multiple GoTrueClient instances/.test(e) && !/^\[jogador\] \[error\] Failed to load resource: the server responded with a status of 400/.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
