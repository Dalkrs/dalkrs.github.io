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
    m.objs.push(N.objNovo('g', { x: 200, y: 220, nome: 'Os Heróis', sigla: 'HER' }));
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
  ok(visto.nomes === 'Guerra Fria|Mar Raso|Os Heróis|Pico|Praga|Rio Lento|Vila Pública', 'ele vê o que é público (o desenho também): ' + visto.nomes);
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
