// As campanhas dentro de cada sistema, numa mesa de verdade: as Cenas (a lista de cada campanha, a cena no ar que só
// os jogadores dela veem, "Campanha desta cena…"), o Mapa-múndi (o mapa de uma campanha, o de duas), as missões do
// grupo nas Fichas, a Árvore — e, na casca, "falar como" e limpar a mesa ao vivo de uma campanha.
// O mestre e dois jogadores: o Dalmo só na primeira campanha, o Visitante só na segunda.
// (A janela das campanhas, as Fichas em blocos, o acampamento e o que o banco deixa cada um ver: campanhas.rede.)
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela } = require('./contas');
const { ok, end } = checker();
(async () => {
  const t = await start({ net: true });
  const c = contas();
  let ids = {};
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); const m = await entrar(d.page, c.mestre, c.senha, 'Bruno'), a = await entrar(d.page, c.jog1, c.senha, 'Dalmo'), j = await entrar(d.page, c.jog2, c.senha, 'Visitante'); ids = { m: m.uid, a: a.uid, j: j.uid }; await d.ctx.close(); }
  ok(ids.m && ids.a && ids.j, 'as três contas existem');
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name, seed: { 'tinycats:aba': 'cenas', 'tinycats-tour': '1' } }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const TM = await novo('mestre'), TA = await novo('A', { w: 1280, h: 860 }), TJ = await novo('J', { w: 1280, h: 860 });
  const w = (ms, p) => (p || TM).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura está abrindo de novo */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const feed = p => p.locator('#feed');
  const noFeed = (p, texto, ms) => ate(async () => (await feed(p).innerText()).includes(texto), ms);
  const foraDoFeed = async (p, texto) => !(await feed(p).innerText()).includes(texto);
  const avisos = async p => (await p.locator('#toasts .toast').allInnerTexts()).join(' | ');
  const comAviso = (p, re, ms) => ate(async () => re.test(await avisos(p)), ms);
  const falar = async (p, texto) => { await p.locator('#msg').fill(texto); await p.locator('#msg').press('Enter'); };
  const abrirMenu = async p => { if (await p.locator('#menu').isHidden()) await p.locator('#btnConta').click(); await p.locator('#menu').waitFor({ state: 'visible' }); await p.waitForTimeout(200); };
  const fecharMenu = async p => { if (await p.locator('#menu').isVisible()) await p.keyboard.press('Escape'); await p.waitForTimeout(150); };
  const estado = p => p.evaluate(() => { const a = TC.mesas.atual; return a ? { vista: a.campanha, lista: a.campanhas.map(x => x.nome), ids: a.campanhas.map(x => x.id) } : null; });
  const barra = async p => ((await p.locator('#contaCamp').count()) ? (await p.locator('#contaCamp').innerText()).trim() : '');
  const semPendencia = p => p.evaluate(() => TC.dados.pendentes === 0);
  const noBanco = (fn, arg) => TM.evaluate(fn, arg);                       // (pelo cliente do banco do mestre, por fora do programa)
  const comoJ = (fn, arg) => TJ.evaluate(fn, arg), comoA = (fn, arg) => TA.evaluate(fn, arg);
  // a linha de um documento, como está no banco (para o mestre)
  const linhaDoc = id => noBanco(async ([mesa, id]) => (await window.__sb.from('documentos').select('id,vis,campanhas,apagado,dados').eq('mesa_id', mesa).eq('id', id).maybeSingle()).data, [mesa, id]);
  // o que um jogador consegue ler direto do banco (os nomes dos documentos, sem os apagados)
  const leDoBanco = (quem, pre) => quem(async ([mesa, pre]) => ((await window.__sb.from('documentos').select('id,apagado').eq('mesa_id', mesa).like('id', pre + '%')).data || []).filter(x => !x.apagado).map(x => x.id).sort(), [mesa, pre]);
  const moldura = async (p, re, pronto) => { let f = null; await ate(async () => { f = p.frames().find(x => x !== p.mainFrame() && re.test(x.url())) || null; return !!f && await f.evaluate(pronto); }, 30000); return f; };
  const cenasDe = p => moldura(p, /\/cenas\//, () => !!window.__tc && !!__tc.Nuvem && __tc.Nuvem.modo() !== 'local');
  const mundoDe = p => moldura(p, /\/mundo\//, () => !!window.__mundo && __mundo.App.pronto);
  const trocarCampanha = async (p, id, nome) => { await abrirMenu(p); await p.locator(`#mn-camp .cv[data-camp="${id}"]`).click(); return ate(async () => (await barra(p)) === nome); };
  let mesa = null;

  // ---------- a mesa, as fichas e as duas campanhas ----------
  await TM.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TM, c.mestre, c.senha);
  const nomeMesa = 'Campanhas Sistemas ' + Date.now().toString(36);
  const codigo = await criarMesaTela(TM, nomeMesa);
  mesa = await TM.evaluate(() => TC.mesas.atual.id);
  try {
    let CM = await cenasDe(TM);
    ok(!!CM && await ate(async () => await CM.evaluate(() => __tc.Nuvem.modo() === 'mestre' && __tc.Store.S.order.length === 1) && await semPendencia(TM)), 'a mesa nova começa com uma cena (ainda sem campanha nenhuma)');
    const cena1 = await CM.evaluate(() => __tc.Store.S.current);
    for (const [p, email, nome] of [[TA, c.jog1, 'Dalmo'], [TJ, c.jog2, 'Visitante']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(p, email, c.senha); await entrarMesaTela(p, codigo, nome); }
    const prep = await noBanco(async ([mesa, a, j]) => {
      const sb = window.__sb, e = [];
      const p = await sb.from('personagens').insert([
        { mesa_id: mesa, id: 'pc_a', nome: 'Selene', dono_id: a, vis: 'mesa', ordem: 1, ficha: { nome: 'Selene', grupo: 'Heróis' }, estado: {} },
        { mesa_id: mesa, id: 'pc_j', nome: 'Dain', dono_id: j, vis: 'mesa', ordem: 2, ficha: { nome: 'Dain', grupo: 'Heróis' }, estado: {} },
      ]); if (p.error) e.push(p.error.message);
      const c1 = await sb.rpc('campanha_criar', { p_mesa: mesa, p_nome: 'Geração do Dain', p_adotar: true }); if (c1.error) e.push(c1.error.message);
      const c2 = await sb.rpc('campanha_criar', { p_mesa: mesa, p_nome: 'Geração 2' }); if (c2.error) e.push(c2.error.message);
      const C1 = c1.data && c1.data.id, C2 = c2.data && c2.data.id;
      for (const [camp, quem, sim] of [[C1, j, false], [C2, j, true]]) { const r = await sb.rpc('campanha_participa', { p_mesa: mesa, p_id: camp, p_usuario: quem, p_sim: sim }); if (r.error) e.push(r.error.message); }
      const mv = await sb.from('personagens').update({ campanha: C2 }).eq('mesa_id', mesa).eq('id', 'pc_j').select('id'); if (mv.error || !mv.data.length) e.push('mover pc_j');
      const n = await sb.from('personagens').insert({ mesa_id: mesa, id: 'npc_mundo', nome: 'Mercador', vis: 'mesa', ordem: 3, ficha: { nome: 'Mercador', grupo: '' }, estado: {} }); if (n.error) e.push(n.error.message);
      return { e, C1, C2 };
    }, [mesa, ids.a, ids.j]);
    ok(prep.e.length === 0 && prep.C1 && prep.C2, 'duas fichas, a primeira campanha (com o que a mesa tinha), a segunda, o Visitante só na segunda, o Dain com ele, e um Mercador do mundo' + (prep.e.length ? ' — ' + prep.e.join(' · ') : ''));
    const C1 = prep.C1, C2 = prep.C2;
    ok(await ate(async () => (await barra(TM)) === 'Geração do Dain' && (await estado(TM)).lista.length === 2, 30000), 'o mestre fica com a primeira campanha em vista');
    ok(await ate(async () => (await barra(TA)) === 'Geração do Dain' && (await estado(TA)).lista.join() === 'Geração do Dain', 30000), 'o Dalmo, só com a primeira');
    ok(await ate(async () => (await barra(TJ)) === 'Geração 2' && (await estado(TJ)).lista.join() === 'Geração 2', 30000), 'o Visitante, só com a segunda');

    /* ===================== Cenas ===================== */
    CM = await cenasDe(TM);
    ok(await ate(async () => await CM.evaluate(([c1, s]) => __tc.Nuvem.comCampanhas() && __tc.Nuvem.campanha() === c1 && __tc.Store.S.current === s && __tc.Nuvem.campanhasDaCena(s).join() === c1, [C1, cena1])), 'nas Cenas, a cena que a mesa tinha passou para a primeira campanha, e é a que está aberta');
    await CM.locator('#sceneBtn').click(); await w(250);
    let itens = await CM.locator('.menu > *').evaluateAll(els => els.map(e => e.textContent.trim()).filter(Boolean));
    ok(itens[0] === 'Cenas · Geração do Dain' && itens.includes('Campanha desta cena…') && !itens.includes('Do mundo'), 'o menu de cenas diz de que campanha é a lista e oferece "Campanha desta cena…": ' + JSON.stringify(itens.slice(0, 4)));
    await TM.keyboard.press('Escape'); await CM.evaluate(() => document.querySelectorAll('.menu').forEach(m => m.remove())); await w(200);
    // uma cena nova nasce na campanha em vista
    const ponte = await CM.evaluate(() => { const u = __tc, sc = u.newScene('Ponte'); u.Store.addScene(sc); u.Persist.scene(sc.id); u.Persist.meta(); u.UI.switchScene(sc.id); return sc.id; });
    ok(await ate(async () => { const m = await linhaDoc('cena:' + ponte + ':m'), v = await linhaDoc('cena:' + ponte + ':v'); return m && v && m.campanhas.join() === C1 && v.campanhas.join() === C1; }), 'a cena nova nasce na campanha em vista (os dois documentos dela)');
    // no ar: só os jogadores da campanha dela a recebem
    await CM.locator('#airBtn').click(); await w(250);
    await CM.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(300);
    ok(/Os jogadores da campanha Geração do Dain agora veem "Ponte"\./.test(await CM.locator('.toast').last().innerText()), 'pôr no ar diz quem passa a ver: ' + await CM.locator('.toast').last().innerText());
    ok(await ate(async () => { const m = await linhaDoc('cena:pub:m'), v = await linhaDoc('cena:pub:v'); return m && v && m.vis === 'mesa' && m.campanhas.join() === C1 && v.campanhas.join() === C1 && m.dados.name === 'Ponte'; }), 'a projeção da cena no ar leva a campanha dela');
    const CA = await cenasDe(TA);
    ok(await ate(async () => await CA.evaluate(() => __tc.Nuvem.jogador() && !__tc.Nuvem.semCena() && __tc.Store.scene().name === 'Ponte'), 30000), 'o Dalmo (da primeira campanha) vê a cena que está no ar');
    const CJ = await cenasDe(TJ);
    await w(7000);
    ok(await CJ.evaluate(() => __tc.Nuvem.jogador() && __tc.Nuvem.semCena()), 'o Visitante (só da segunda) continua sem cena');
    ok((await leDoBanco(comoJ, 'cena:')).length === 0, 'e o banco não lhe entrega a projeção: ' + JSON.stringify(await leDoBanco(comoJ, 'cena:')));
    ok((await leDoBanco(comoA, 'cena:')).join() === 'cena:pub:m,cena:pub:v', 'ao Dalmo, só a projeção: ' + JSON.stringify(await leDoBanco(comoA, 'cena:')));

    // o mestre passa para a segunda campanha: a lista de cenas é outra
    ok(await trocarCampanha(TM, C2, 'Geração 2'), 'o mestre passa a ver a Geração 2');
    CM = await cenasDe(TM);
    ok(await ate(async () => await CM.evaluate(c2 => __tc.Nuvem.campanha() === c2 && !!__tc.Store.scene() && __tc.Nuvem.naVista(__tc.Store.S.current), C2)), 'as Cenas abrem de novo, numa cena da Geração 2');
    const naC2 = await CM.evaluate(c2 => ({ id: __tc.Store.S.current, nome: __tc.Store.scene().name, camps: __tc.Nuvem.campanhasDaCena(__tc.Store.S.current), daVista: __tc.Store.S.order.filter(id => __tc.Nuvem.naVista(id)).length, ar: __tc.Nuvem.noAr() }), C2);
    ok(naC2.camps.join() === C2 && naC2.daVista === 1 && naC2.id !== ponte && naC2.id !== cena1, 'ela não tinha cena nenhuma: nasce uma, vazia, que é dela — as da outra campanha não entram na lista: ' + JSON.stringify(naC2));
    ok(naC2.ar === ponte && /No ar: Ponte/.test(await CM.locator('#airBtn').innerText()) && /uma cena de outra campanha/.test(await CM.locator('#airBtn').getAttribute('title')), 'a barra avisa que a cena no ar é de outra campanha: ' + await CM.locator('#airBtn').getAttribute('title'));
    await CM.locator('#airBtn').click(); await w(250);
    const arItens = await CM.locator('.menu > *').evaluateAll(els => els.map(e => e.textContent.trim()).filter(Boolean));
    ok(/No ar: "Ponte", de outra campanha/.test(arItens[0]) && !arItens.includes('Ir para a cena que está no ar'), 'o menu do "no ar" diz o mesmo, e não oferece ir até ela (está na lista da outra campanha): ' + JSON.stringify(arItens));
    await CM.locator('.menu-i', { hasText: 'Mostrar esta cena aos jogadores' }).click(); await w(300);
    ok(/Os jogadores da campanha Geração 2 agora veem/.test(await CM.locator('.toast').last().innerText()), 'pôr no ar a cena da Geração 2: ' + await CM.locator('.toast').last().innerText());
    ok(await ate(async () => { const m = await linhaDoc('cena:pub:m'); return m && m.campanhas.join() === C2 && m.dados.name === naC2.nome; }), 'a projeção passa a ser da Geração 2');
    ok(await ate(async () => await CJ.evaluate(n => !__tc.Nuvem.semCena() && __tc.Store.scene().name === n, naC2.nome), 30000), 'agora é o Visitante quem vê a cena no ar');
    ok(await ate(async () => (await leDoBanco(comoA, 'cena:')).length === 0), 'e o banco deixa de entregá-la ao Dalmo');
    ok(await ate(async () => await CA.evaluate(() => __tc.Nuvem.semCena()), 30000), 'em instantes, a tela do Dalmo fica sem cena');

    // "Campanha desta cena…": do mundo (todos veem), e desfazer
    await CM.locator('#sceneBtn').click(); await w(250);
    await CM.locator('.menu-i', { hasText: 'Campanha desta cena…' }).click(); await w(300);
    ok(await CM.locator('#sc-camp-' + C2).isChecked() && await CM.locator('#sc-camp-mundo').count() === 1 && await CM.locator('#sc-camp-' + C1).count() === 1, 'a janela mostra a campanha da cena marcada, e oferece o mundo e a outra campanha');
    await CM.locator('#sc-camp-mundo').check();
    await CM.locator('.modal .btn.primary').click(); await w(300);
    ok(/agora é do mundo: aparece em todas as campanhas\./.test(await CM.locator('.toast').last().innerText()), 'passada para o mundo: ' + await CM.locator('.toast').last().innerText());
    ok(await ate(async () => { const m = await linhaDoc('cena:' + naC2.id + ':m'), v = await linhaDoc('cena:' + naC2.id + ':v'), p = await linhaDoc('cena:pub:m'); return m.campanhas.length === 0 && v.campanhas.length === 0 && p.campanhas.length === 0; }), 'os documentos da cena — e a projeção, que está no ar — ficam sem campanha');
    ok(await ate(async () => await CA.evaluate(n => !__tc.Nuvem.semCena() && __tc.Store.scene().name === n, naC2.nome), 30000), 'e o Dalmo passa a vê-la também');
    await CM.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(300);
    ok(await ate(async () => { const m = await linhaDoc('cena:' + naC2.id + ':m'), p = await linhaDoc('cena:pub:m'); return m.campanhas.join() === C2 && p.campanhas.join() === C2; }), '"Desfazer" a devolve à Geração 2 (com a projeção)');
    ok(await ate(async () => await CA.evaluate(() => __tc.Nuvem.semCena()), 30000), 'e ela sai da tela do Dalmo de novo');
    // passada para a OUTRA campanha, ela sai da lista daqui (e outra cena abre no lugar)
    await CM.locator('#sceneBtn').click(); await w(250);
    await CM.locator('.menu-i', { hasText: 'Campanha desta cena…' }).click(); await w(300);
    await CM.locator('#sc-camp-' + C1).check();
    await CM.locator('.modal .btn.primary').click(); await w(400);
    ok(/agora é da campanha Geração do Dain\. Ela saiu desta lista: está na daquela campanha\./.test(await CM.locator('.toast').last().innerText()), 'passada para a outra campanha: ' + await CM.locator('.toast').last().innerText());
    ok(await CM.evaluate(s => __tc.Store.S.current !== s && __tc.Nuvem.naVista(__tc.Store.S.current) && !__tc.Nuvem.naVista(s), naC2.id), 'ela sai da lista da Geração 2, e outra cena (da lista daqui) fica aberta');
    await CM.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(400);
    ok(await ate(async () => await CM.evaluate(s => __tc.Store.S.current === s && __tc.Nuvem.naVista(s), naC2.id)), '"Desfazer" a traz de volta e a reabre');
    // quem joga nas duas campanhas vê a cena no ar quando ela é da campanha que ele tem em vista
    ok(await ate(async () => { const m = await linhaDoc('cena:pub:m'); return m && m.campanhas.join() === C2; }), '(a cena no ar é da Geração 2)');
    const participa = (camp, quem, sim) => noBanco(async ([mesa, camp, quem, sim]) => { const r = await window.__sb.rpc('campanha_participa', { p_mesa: mesa, p_id: camp, p_usuario: quem, p_sim: sim }); return r.error ? r.error.message : null; }, [mesa, camp, quem, sim]);
    ok(!(await participa(C2, ids.a, true)) && await ate(async () => (await estado(TA)).lista.length === 2 && (await estado(TA)).vista === C1, 30000), 'o Dalmo passa a participar das duas campanhas (e continua com a primeira em vista)');
    let CA2 = await cenasDe(TA);
    ok(await ate(async () => await CA2.evaluate(() => __tc.Nuvem.semCena() && __tc.Nuvem.arDeFora().length === 1), 30000), 'com a primeira em vista, a cena no ar (que é da segunda) não aparece para ele');
    ok(/A cena que está no ar é da campanha Geração 2\. Para vê-la, troque de campanha no menu da mesa\./.test(await CA2.locator('#bannerText').innerText()), 'e a faixa diz de que campanha ela é, e como vê-la: ' + await CA2.locator('#bannerText').innerText());
    ok(await trocarCampanha(TA, C2, 'Geração 2'), 'ele passa para a Geração 2');
    CA2 = await cenasDe(TA);
    ok(await ate(async () => await CA2.evaluate(n => !__tc.Nuvem.semCena() && __tc.Store.scene().name === n, naC2.nome), 30000), 'e aí a cena no ar aparece');
    ok(!(await participa(C2, ids.a, false)) && await ate(async () => (await estado(TA)).lista.join() === 'Geração do Dain' && (await barra(TA)) === 'Geração do Dain', 30000), '(o Dalmo volta a participar só da primeira)');

    // as fichas, para ligar a um token: as da campanha em vista primeiro; a de outra campanha, com o nome dela
    const fichas = await CM.evaluate(() => __tc.Fichas.chars().map(x => __tc.Fichas.rotulo(x)));
    ok(fichas.length === 3 && /^Dain/.test(fichas[0]) && /^Mercador/.test(fichas[1]) && /^Selene/.test(fichas[2]) && /Geração do Dain/.test(fichas[2]) && !/Geração/.test(fichas[0]), 'na lista de fichas das Cenas: a da campanha em vista, a do mundo, e a da outra campanha (que diz de onde é): ' + JSON.stringify(fichas));

    /* ===================== Mapa-múndi ===================== */
    await TM.locator('#tab-mundo').click();
    let WM = await mundoDe(TM);
    ok(await WM.evaluate(c2 => __mundo.App.naMesa && __mundo.App.papel === 'mestre' && __mundo.App.campanha() === c2 && __mundo.App.mapas.length === 0, C2), 'o Mapa-múndi do mestre abre com a Geração 2 em vista, sem mapas');
    const vale = await WM.evaluate(() => { const m = __mundo.App.criarMapa('Vale da Lira', { larg: 1000, alt: 700 }); return m.id; });
    ok(await ate(async () => { const d = await linhaDoc('mundo:mapa:' + vale); return d && d.vis === 'mestre' && d.campanhas.join() === C2; }), 'o mapa novo é da campanha em vista');
    await WM.evaluate(() => __mundo.App.mostrarAosJogadores());
    ok(await ate(async () => { const p = await linhaDoc('mundo:pub:' + vale), i = await linhaDoc('mundo:indice'); return p && p.vis === 'mesa' && p.campanhas.join() === C2 && i && i.campanhas.length === 0 && JSON.stringify(i.dados) === JSON.stringify({ mapas: [], mostrado: vale }); }),
      'mostrado: a projeção é da campanha, e o índice (da mesa inteira) não leva o nome do mapa');
    await TJ.locator('#tab-mundo').click();
    const WJ = await mundoDe(TJ);
    ok(await ate(async () => await WJ.evaluate(() => !!__mundo.App.mapa && __mundo.App.mapa.nome === 'Vale da Lira'), 30000), 'o Visitante (da Geração 2) abre o mapa mostrado');
    await TA.locator('#tab-mundo').click();
    const WA = await mundoDe(TA);
    await w(7000);
    ok(await WA.evaluate(() => __mundo.App.mapa === null && __mundo.App.mapas.length === 0), 'o Dalmo (da primeira campanha) não tem mapa nenhum');
    ok((await leDoBanco(comoA, 'mundo:')).join() === 'mundo:indice' && !JSON.stringify(await comoA(async mesa => (await window.__sb.from('documentos').select('dados').eq('mesa_id', mesa).eq('id', 'mundo:indice').maybeSingle()).data, mesa)).includes('Vale'), 'do banco, ele só lê o índice — que não diz o nome do mapa');
    // o mapa em duas campanhas
    await WM.locator('#btMapa').click(); await w(200);
    await WM.locator('#menuMapas button', { hasText: 'Campanhas deste mapa…' }).click();
    const dl = WM.locator('dialog.mundo-dl[open]'); await dl.waitFor();
    ok(await dl.locator(`input[type="checkbox"][value="${C2}"]`).isChecked() && !(await dl.locator(`input[type="checkbox"][value="${C1}"]`).isChecked()), 'a janela "Campanhas deste mapa" mostra a campanha dele marcada');
    await dl.locator(`input[type="checkbox"][value="${C1}"]`).check();
    await dl.locator('button[type="submit"]').click(); await w(300);
    ok(/agora é das campanhas Geração do Dain e Geração 2\./.test(await avisosDe(WM)), 'o mapa passa a ser das duas: ' + await avisosDe(WM));
    ok(await ate(async () => { const d = await linhaDoc('mundo:mapa:' + vale), p = await linhaDoc('mundo:pub:' + vale); return d.campanhas.slice().sort().join() === [C1, C2].sort().join() && p.campanhas.slice().sort().join() === [C1, C2].sort().join(); }), 'o mapa e a projeção, no banco');
    ok(await ate(async () => await WA.evaluate(() => __mundo.App.mapas.map(m => m.nome).join() === 'Vale da Lira'), 30000), 'e o Dalmo passa a tê-lo na lista');

    /* ===================== missões do grupo (Fichas) ===================== */
    await TM.locator('#tab-fichas').click();
    const FM = await moldura(TM, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.length === 3);
    await FM.locator('#lista .pc', { hasText: 'Dain' }).click(); await w(400);
    await FM.locator('#ficha [data-sub="missoes"]').click(); await w(300);
    await FM.locator('[data-misnova="g"]').click(); await w(300);
    const gid = await FM.evaluate(c2 => Object.keys(((S.segredos.mis || {}).gc || {})[c2] || {})[0] || null, C2);
    ok(!!gid, 'a missão do grupo criada na ficha de um personagem da Geração 2 nasce (escondida) como missão dessa campanha');
    await FM.locator(`[data-mist="g|${gid}"]`).fill('Atravessar o vale'); await FM.locator(`[data-mist="g|${gid}"]`).press('Tab'); await w(300);
    await FM.locator(`[data-misrevelar="g|${gid}"]`).click(); await w(500);
    ok(await ate(async () => { const d = await linhaDoc('fichas:missoes@' + C2); return d && d.vis === 'mesa' && d.campanhas.join() === C2 && d.dados.v[gid] && d.dados.v[gid].t === 'Atravessar o vale'; }), 'revelada, vai para o documento das missões do grupo da Geração 2');
    ok((await linhaDoc('fichas:missoes@' + C1)) === null || !JSON.stringify(await linhaDoc('fichas:missoes@' + C1)).includes('Atravessar'), 'e não para o da primeira campanha');
    await TJ.locator('#tab-fichas').click();
    const FJ = await moldura(TJ, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.length >= 1);
    await FJ.locator('#lista .pc', { hasText: 'Dain' }).click(); await w(400);
    await FJ.locator('#ficha [data-sub="missoes"]').click(); await w(300);
    ok(await ate(async () => (await FJ.locator(`[data-mis="g|${gid}"]`).count()) === 1 && /Atravessar o vale/.test(await FJ.locator(`[data-mis="g|${gid}"]`).innerText()), 30000), 'o Visitante vê a missão do grupo dele');
    await TA.locator('#tab-fichas').click();
    const FA = await moldura(TA, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.length >= 1);
    await FA.locator('#lista .pc', { hasText: 'Selene' }).click(); await w(400);
    await FA.locator('#ficha [data-sub="missoes"]').click(); await w(300);
    await w(6000);
    ok(await FA.locator('.miscard').count() === 0 && (await leDoBanco(comoA, 'fichas:missoes')).every(x => x !== 'fichas:missoes@' + C2), 'o Dalmo, da outra campanha, não a vê (nem o banco lhe entrega o documento)');

    /* ===================== Fichas: a ficha nova, o seletor de grupo e os relacionamentos ===================== */
    const linhaPc = id => noBanco(async ([mesa, id]) => (await window.__sb.from('personagens').select('*').eq('mesa_id', mesa).eq('id', id).maybeSingle()).data, [mesa, id]);
    ok(!JSON.stringify((await linhaPc('pc_a')).estado).includes('pc_j') && !JSON.stringify((await linhaPc('pc_j')).estado).includes('pc_a'), 'a Selene e o Dain, de campanhas diferentes, não ganham barra de relacionamento um com o outro');
    await FM.locator('#btnNew').click();
    const novoPc = await FM.evaluate(() => S.sel);
    // (na hora, antes de qualquer resposta da mesa: a ficha já aparece no bloco da campanha em vista)
    ok(await FM.evaluate(id => { const li = document.querySelector('#lista .pcrow[data-id="' + id + '"]'), ul = li && li.closest('[data-lista]'); return !!ul && ul.dataset.camp; }, novoPc) === C2, 'a ficha que o mestre cria já aparece no bloco da campanha em vista');
    await w(600);
    ok(await ate(async () => { const l = await linhaPc(novoPc); return !!l && l.campanha === C2; }), 'e nasce na campanha em vista');
    // (…e continua nela depois de a mesa responder e de a ficha ser mexida: não era só de passagem)
    await FM.locator('#f_nome').fill('Recruta'); await FM.locator('#f_nome').press('Tab');
    ok(await ate(async () => (await linhaPc(novoPc)).nome === 'Recruta') && (await w(2500), true) && (await linhaPc(novoPc)).campanha === C2 && await FM.evaluate(id => S.personagens.find(p => p.id === id)._camp, novoPc) === C2, 'mexida, a ficha continua na campanha em que nasceu');
    const opcoes = await FM.locator('#f_grupo optgroup').evaluateAll(gs => gs.map(g => g.label + ' → ' + [...g.querySelectorAll('option')].map(o => o.value).join(' | ')));
    ok(opcoes.length === 3 && /^Geração 2 → /.test(opcoes[0]) && /^Do mundo → /.test(opcoes[1]) && /^Geração do Dain → /.test(opcoes[2]) && opcoes[2].includes(C1 + '/Heróis'), 'o seletor de grupo da ficha mostra os grupos de cada campanha (a em vista primeiro): ' + JSON.stringify(opcoes));
    await FM.locator('#f_grupo').selectOption(C1 + '/Heróis'); await w(500);
    ok(/passou para a campanha Geração do Dain\./.test(await FM.locator('.toast').innerText()), 'escolher um grupo de outra campanha leva a ficha para ela (com aviso e desfazer): ' + await FM.locator('.toast').innerText());
    await FM.locator('.toast', { hasText: 'Desfazer' }).hover();      // (o aviso espera com o ponteiro em cima: o banco de verdade e os outros aparelhos podem demorar mais que ele)
    ok(await ate(async () => { const l = await linhaPc(novoPc); return l.campanha === C1 && l.ficha.grupo === 'Heróis'; }), 'no banco, a ficha passou para a primeira campanha, no grupo escolhido');
    await FM.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(500);
    ok(await ate(async () => { const l = await linhaPc(novoPc); return l.campanha === C2; }), '"Desfazer" a devolve à Geração 2');

    /* ----- arrastar a ficha, na lista, para um grupo de outro bloco: com o mouse de verdade ----- */
    // (o botão desce na alça da ficha, o ponteiro anda até a linha de destino e o botão sobe)
    const arrastar = async (F, id, sobre, onde, P) => {
      P = P || TM;
      const de = await F.locator(`#lista [data-grab="${id}"]`).boundingBox(), para = await F.locator(sobre).first().boundingBox();
      if (!de || !para) return 'sem onde pegar ou soltar: ' + JSON.stringify({ de, para });
      await P.mouse.move(de.x + de.width / 2, de.y + de.height / 2); await P.mouse.down();
      await P.mouse.move(de.x + de.width / 2, de.y + de.height / 2 + 6, { steps: 2 });
      await P.mouse.move(para.x + para.width / 2, para.y + para.height * (onde || 0.75), { steps: 12 });
      await w(120); await P.mouse.up(); await w(400);
      return null;
    };
    const blocoNaTela = (F, id) => F.evaluate(id => { const li = document.querySelector('#lista .pcrow[data-id="' + id + '"]'), ul = li && li.closest('[data-lista]'); return ul ? ul.dataset.camp : null; }, id);
    const ordemNaTela = () => FM.evaluate(() => S.personagens.map(p => p.id).join(','));
    await FM.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    const ordemAntes = await ordemNaTela();
    await FM.locator('#lista [data-btoggle=""]').click(); await w(200);                // (o bloco "Do mundo" começa recolhido: abre)
    ok(await FM.locator('#lista .pcrow[data-id="npc_mundo"]').isVisible(), 'aberto o bloco "Do mundo", aparece o Mercador');
    const erroArr = await arrastar(FM, novoPc, '#lista .pcrow[data-id="npc_mundo"]');
    ok(!erroArr && await blocoNaTela(FM, novoPc) === '', 'arrastada para junto do Mercador, a ficha passa para o bloco "Do mundo"' + (erroArr ? ' — ' + erroArr : ''));
    ok(/^Recruta passou para o mundo \(aparece em todas as campanhas\)\./.test(await FM.locator('.toast').innerText().catch(() => '')), 'com aviso e desfazer: ' + await FM.locator('.toast').innerText().catch(() => '(sem aviso)'));
    await FM.locator('.toast', { hasText: 'Desfazer' }).hover(); await w(9500);
    ok(/^Recruta passou para o mundo/.test(await FM.locator('.toast').innerText().catch(() => '')), 'com o ponteiro em cima, o aviso das Fichas continua lá depois dos 9 s dele');
    ok(await ate(async () => (await linhaPc(novoPc)).campanha === null), 'no banco, a ficha ficou sem campanha (do mundo)');
    await FM.locator('.toast button', { hasText: 'Desfazer' }).click(); await w(400);
    ok(await blocoNaTela(FM, novoPc) === C2 && await ordemNaTela() === ordemAntes, '"Desfazer" a devolve ao bloco da Geração 2, na ordem em que estava');
    ok(await ate(async () => (await linhaPc(novoPc)).campanha === C2), 'e, no banco, à campanha');

    /* ===================== Acampamento: a roda é a da campanha ===================== */
    await TM.locator('#tab-acampamento').click();
    const ACM = await moldura(TM, /\/acampamento\//, () => !!window.__acamp && __acamp.pronto && __acamp.modo === 'mesa');
    ok(await ate(async () => await ACM.evaluate(() => __acamp.camp.presentes.includes('pc_j') && !__acamp.camp.presentes.includes('pc_a'))), 'no acampamento da Geração 2 entra sozinho o personagem do jogador dela — não o da outra campanha: ' + JSON.stringify(await ACM.evaluate(() => __acamp.camp.presentes)));
    const chamar = await ACM.locator('#chamar optgroup').evaluateAll(gs => gs.map(g => g.label + ': ' + [...g.querySelectorAll('option')].map(o => o.textContent.trim()).join(',')));
    ok(chamar.some(x => /^Do mundo: .*Mercador/.test(x)) && chamar.some(x => /^Geração do Dain: .*Selene/.test(x)) && chamar.findIndex(x => /^Do mundo/.test(x)) < chamar.findIndex(x => /^Geração do Dain/.test(x)), 'quem dá para chamar à roda vem em grupos: os do mundo antes dos da outra campanha — ' + JSON.stringify(chamar));
    ok(await ate(async () => { const d = await linhaDoc('acampamento@' + C2); return !!d && d.campanhas.join() === C2 && d.dados.roda.some(r => r.id === 'pc_j') && !d.dados.roda.some(r => r.id === 'pc_a'); }), 'e é o acampamento da Geração 2 que fica guardado com essa roda');

    // "Mapa tático": as cenas para onde o acampamento pode ir são as da campanha dele (e as do mundo) — não as das outras
    const cenasDoBanco = await noBanco(async mesa => ((await window.__sb.from('documentos').select('id,dados,campanhas,apagado').eq('mesa_id', mesa).like('id', 'cena:%:m')).data || []).filter(x => !x.apagado && !/^cena:(pub|pedido)/.test(x.id)).map(x => ({ nome: (x.dados && x.dados.name) || 'Cena', camps: x.campanhas || [] })), mesa);
    await ACM.locator('#btCena').click(); await w(300);
    const noMenuTatico = (await ACM.locator('#menuCena [role="menuitem"]').allInnerTexts()).map(x => x.trim()).filter(x => !/^\+ Criar uma cena nova/.test(x)).sort();
    const esperadas = cenasDoBanco.filter(x => !x.camps.length || x.camps.includes(C2)).map(x => x.nome).sort();
    ok(cenasDoBanco.some(x => x.camps.includes(C1)) && esperadas.length >= 1 && JSON.stringify(noMenuTatico) === JSON.stringify(esperadas), '"Mapa tático" oferece as cenas da Geração 2 (e as do mundo), não as da outra campanha: ' + JSON.stringify({ noMenu: noMenuTatico, noBanco: cenasDoBanco.map(x => x.nome + (x.camps.includes(C1) ? ' [1ª]' : x.camps.includes(C2) ? ' [2ª]' : ' [mundo]')) }));
    await TM.mouse.click(5, 5); await ACM.evaluate(() => { const m = document.getElementById('menuCena'); if (m) m.remove(); }); await w(200);

    /* ===================== campanha encerrada: o núcleo recusa antes de o banco recusar ===================== */
    const encerrar = (camp, sim) => noBanco(async ([mesa, camp, sim]) => { const r = await window.__sb.rpc('campanha_mudar', { p_mesa: mesa, p_id: camp, p_encerrada: sim }); return r.error ? r.error.message : null; }, [mesa, camp, sim]);
    ok(!(await encerrar(C1, true)) && await ate(() => TM.evaluate(c1 => TC.mesas.encerrada(c1), C1), 30000), 'o mestre encerra a primeira campanha (o aparelho dele fica sabendo)');
    await TM.evaluate(() => document.getElementById('toasts').replaceChildren());
    const gravacoes = await TM.evaluate(c1 => {
      const recusas = []; TC.dados.on('recusado', (nome, id, msg) => recusas.push(nome + ':' + id + ':' + msg));
      const P = TC.dados.col('personagens'), D = TC.dados.col('documentos');
      P.gravar('pc_a', { nome: 'Mexida' }); D.gravar('acampamento@' + c1, { dados: { nome: 'mexido' }, vis: 'mesa' }); P.gravar('npc_mundo', { campanha: c1 });
      return { recusas, selene: P.pegar('pc_a').nome, mercador: P.pegar('npc_mundo').campanha || null, pendentes: TC.dados.pendentes };
    }, C1);
    ok(gravacoes.recusas.length === 3 && gravacoes.recusas.every(x => /Esta campanha está encerrada: só consulta\. Para mexer nela, o mestre a reabre no menu da mesa\./.test(x)) && gravacoes.selene === 'Selene' && gravacoes.mercador === null && gravacoes.pendentes === 0,
      'mexer numa ficha dela, no acampamento dela ou pôr uma ficha nela: o núcleo recusa na hora, com o motivo, e nada fica por subir — ' + JSON.stringify(gravacoes));
    ok(await comAviso(TM, /Esta campanha está encerrada: só consulta/), 'e a casca avisa (uma vez só)');
    ok((await TM.locator('#toasts .toast').count()) === 1, 'três recusas seguidas, um aviso só: ' + await avisos(TM));
    await w(1500);
    ok((await linhaPc('pc_a')).nome === 'Selene' && (await linhaPc('npc_mundo')).campanha === null && !JSON.stringify(await linhaDoc('acampamento@' + C1)).includes('mexido'), 'no banco, nada mudou');
    // com a campanha encerrada, a lista das Fichas não deixa arrastar para ela (nem dela)
    // (encerrar uma campanha abre os sistemas de novo: a moldura das Fichas é outra)
    await TM.locator('#tab-fichas').click();
    const FE = await moldura(TM, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.length >= 4 && !!document.querySelector('#lista .bloco'));
    ok(await ate(async () => (await FE.locator(`#lista .bloco[data-bloco="${C1}"] .blocotag`).innerText().catch(() => '')).trim().toLowerCase() === 'encerrada', 20000), 'nas Fichas, o bloco da campanha encerrada diz "encerrada"');
    await FE.locator(`#lista [data-btoggle="${C1}"]`).click(); await w(200);
    ok(await FE.locator('#lista .pcrow[data-id="pc_a"]').isVisible() && await FE.locator('#lista .pcrow[data-id="pc_a"] [data-grab]').count() === 0, 'a ficha de uma campanha encerrada não tem por onde arrastar');
    await FE.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    const erroArr2 = await arrastar(FE, novoPc, '#lista .pcrow[data-id="pc_a"]');
    ok(!erroArr2 && /Campanha encerrada: as fichas dela não saem, e nenhuma entra\./.test(await FE.locator('.toast').innerText().catch(() => '')), 'arrastar uma ficha para a campanha encerrada: a lista recusa e diz por quê' + (erroArr2 ? ' — ' + erroArr2 : ''));
    ok(await blocoNaTela(FE, novoPc) === C2 && (await w(1500), true) && (await linhaPc(novoPc)).campanha === C2, 'e a ficha fica onde estava (na tela e no banco)');
    ok(!(await encerrar(C1, false)) && await ate(() => TM.evaluate(c1 => !TC.mesas.encerrada(c1), C1), 30000), '(a campanha é reaberta)');

    /* ===================== Árvore ===================== */
    await TJ.locator('#tab-arvore').click();
    const AJ = await moldura(TJ, /\/arvore\//, () => typeof ArvoreMesa === 'object' && ArvoreMesa.ativo() && typeof doc === 'object' && !!doc && doc.personagens.length >= 1);
    const novato = await AJ.evaluate(() => { registrar('novo personagem'); const p = personagemNovo('Novato', bib()); doc.personagens.push(p); ui.personagem = p.id; salvar(); pintarTudo(); return p.id; });
    ok(await ate(async () => { const l = await noBanco(async ([mesa, id]) => (await window.__sb.from('personagens').select('id,campanha,dono_id').eq('mesa_id', mesa).eq('id', id).maybeSingle()).data, [mesa, novato]); return l && l.campanha === C2 && l.dono_id === ids.j; }), 'o personagem que o jogador cria pela Árvore nasce na campanha que ele tem em vista');
    await TM.locator('#tab-arvore').click();
    const AM = await moldura(TM, /\/arvore\//, () => typeof ArvoreMesa === 'object' && ArvoreMesa.ativo() && typeof doc === 'object' && !!doc);
    ok(await ate(async () => await AM.evaluate(n => doc.personagens.some(p => p.id === n), novato), 30000), 'e chega à Árvore do mestre');
    const etiquetas = await AM.evaluate(n => ({ dain: ArvoreMesa.etiqueta('pc_j'), novato: ArvoreMesa.etiqueta(n), selene: ArvoreMesa.etiqueta('pc_a'), mercador: ArvoreMesa.etiqueta('npc_mundo'), ordem: doc.personagens.map(p => p.nome) }), novato);
    ok(etiquetas.dain === '' && etiquetas.novato === '' && etiquetas.selene === 'Geração do Dain' && etiquetas.mercador === 'mundo', 'na Árvore do mestre, a aba de cada personagem diz de onde ele é quando não é da campanha em vista: ' + JSON.stringify(etiquetas));
    ok(etiquetas.ordem.indexOf('Dain') < etiquetas.ordem.indexOf('Mercador') && etiquetas.ordem.indexOf('Mercador') < etiquetas.ordem.indexOf('Selene'), 'e os da campanha em vista vêm primeiro: ' + JSON.stringify(etiquetas.ordem));

    /* ===================== a casca: falar como, e limpar a mesa ao vivo de uma campanha ===================== */
    await TM.locator('#como').click(); await w(250);
    const como = await TM.locator('#comoLista > *').evaluateAll(els => els.map(e => (e.classList.contains('rot') ? '# ' : '') + e.textContent.trim()));
    ok(JSON.stringify(como.slice(0, 2)) === JSON.stringify(['# Falar como', 'Mestre (sem personagem)']) && como.indexOf('# Geração 2') < como.indexOf('# Do mundo') && como.indexOf('# Do mundo') < como.indexOf('# Geração do Dain') && como.indexOf('Dain') === como.indexOf('# Geração 2') + 1,
      '"falar como": os personagens da campanha em vista, depois os do mundo, depois os das outras — ' + JSON.stringify(como));
    await TM.keyboard.press('Escape'); await w(200);
    // a conversa: uma fala em cada campanha e uma do mundo (de quem não tem campanha em vista não há aqui: a do mundo vem do banco)
    await falar(TA, 'fala da primeira'); await falar(TJ, 'fala da segunda');
    const mundo = await noBanco(async mesa => { const r = await window.__sb.from('registro').insert({ mesa_id: mesa, id: 'm_mundo', tipo: 'fala', secreta: false, dados: { texto: 'aviso do mundo' } }); return r.error ? r.error.message : null; }, mesa);
    ok(!mundo && await noFeed(TM, 'fala da segunda') && await noFeed(TM, 'aviso do mundo') && await foraDoFeed(TM, 'fala da primeira'), 'o mestre, com a Geração 2 em vista, vê a conversa dela e a do mundo');
    ok(await noFeed(TA, 'aviso do mundo') && await noFeed(TA, 'fala da primeira') && await foraDoFeed(TA, 'fala da segunda'), 'o Dalmo, a da primeira e a do mundo');
    await abrirMenu(TM);
    await TM.locator('#mn-limpar').click();
    ok(await ate(async () => /Limpar a mesa ao vivo da campanha Geração 2\?/.test(await TM.locator('dialog[open] h2').innerText())), 'limpar a mesa ao vivo diz de que campanha: ' + await TM.locator('dialog[open] h2').innerText());
    const textoLimpar = await TM.locator('dialog[open] p').first().innerText();
    ok(/desta campanha somem do painel de quem participa dela/.test(textoLimpar) && /fora de qualquer campanha/.test(textoLimpar) && /A conversa das outras campanhas não muda/.test(textoLimpar) && /Dá para desfazer/.test(textoLimpar), 'e o que sai (e o que não sai): ' + textoLimpar);
    await TM.locator('dialog[open] button[type="submit"]').click();
    ok(await ate(async () => (await foraDoFeed(TM, 'fala da segunda')) && (await foraDoFeed(TM, 'aviso do mundo'))), 'a conversa da Geração 2 (e a do mundo, que aparece nela) sai do painel');
    await TM.locator('#toasts .toast', { hasText: 'Desfazer' }).last().hover();      // (o aviso espera com o ponteiro em cima: o banco de verdade e os outros aparelhos podem demorar mais que ele)
    const sobrou = await noBanco(async mesa => ((await window.__sb.from('registro').select('id,campanha,apagado,dados').eq('mesa_id', mesa)).data || []).filter(x => !x.apagado && x.dados && x.dados.texto).map(x => x.dados.texto).sort(), mesa);
    ok(JSON.stringify(sobrou) === JSON.stringify(['fala da primeira']), 'a da primeira campanha fica como estava: ' + JSON.stringify(sobrou));
    ok(await noFeed(TA, 'fala da primeira') && await ate(async () => foraDoFeed(TA, 'aviso do mundo')), 'na tela do Dalmo: a fala da campanha dele continua; o aviso do mundo, que foi limpo, sai');
    await TM.locator('#toasts .toast button', { hasText: 'Desfazer' }).click();
    ok(await noFeed(TM, 'fala da segunda') && await noFeed(TM, 'aviso do mundo') && await noFeed(TA, 'aviso do mundo'), '"Desfazer" traz de volta o que a limpeza tirou');

    /* ===================== Fichas: o jogador só troca de grupo dentro da campanha da ficha ===================== */
    await TJ.locator('#tab-fichas').click();
    const FJ2 = await moldura(TJ, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.some(p => p.id === 'pc_j'));
    const opsDoJogador = await FJ2.evaluate(() => { const d = document.createElement('select'); d.innerHTML = opcoesDeGrupo(S.personagens.find(p => p.id === 'pc_j')); return { grupos: d.querySelectorAll('optgroup').length, valores: [...d.querySelectorAll('option')].map(o => o.value) }; });
    ok(opsDoJogador.grupos === 0 && opsDoJogador.valores.length >= 1 && opsDoJogador.valores.every(v => v.startsWith(C2 + '/')), 'na ficha dele, o jogador só escolhe entre os grupos da campanha da ficha (nada de passar a ficha para outra campanha): ' + JSON.stringify(opsDoJogador));

    /* ===================== o mestre auxiliar: mestra dentro das campanhas, mas não passa nada de uma para outra ===================== */
    const nomearAux = sim => noBanco(async ([mesa, j, sim]) => { const r = await window.__sb.rpc('definir_auxiliar', { p_mesa: mesa, p_usuario: j, p_auxiliar: sim }); return r.error ? r.error.message : null; }, [mesa, ids.j, sim]);
    ok(!(await nomearAux(true)) && await ate(() => TJ.evaluate(() => TC.mesas.atual && TC.mesas.atual.cargo === 'auxiliar' && !TC.mesas.atual.jogando && TC.mesas.atual.campanhas.length === 2), 40000), 'o mestre nomeia o Visitante mestre auxiliar: mestrando, ele passa a ver as duas campanhas');
    ok((await estado(TJ)).vista === C2 && await barra(TJ) === 'Geração 2', 'e continua na campanha que estava vendo (a mesa não o leva para outra sem ele pedir): ' + await barra(TJ));
    await w(3000, TJ);                                    // (a casca dele abre os sistemas de novo: é outro papel)
    await TJ.locator('#tab-fichas').click();
    const fichasDoAux = () => moldura(TJ, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.length >= 3 && typeof FichasMesa === 'object' && FichasMesa.mestre() && !!document.querySelector('#lista .bloco'));
    let FX = await fichasDoAux();
    await w(1500);
    if (FX.isDetached()) FX = await fichasDoAux();
    const noAux = await FX.evaluate(() => { const d = document.createElement('select'); d.innerHTML = opcoesDeGrupo(S.personagens.find(p => p.id === 'pc_j')); return { mestra: FichasMesa.mestre(), organiza: FichasMesa.organiza(), setas: document.querySelectorAll('#lista [data-gcamp]').length, blocos: [...document.querySelectorAll('#lista > .bloco .bloconome')].map(x => x.textContent.trim()), optgroups: d.querySelectorAll('optgroup').length, novo: !!document.getElementById('btnNew') && !document.getElementById('btnNew').disabled }; });
    ok(noAux.mestra === true && noAux.organiza === false && noAux.novo, 'nas Fichas ele mestra (cria e mexe em ficha), mas não organiza as campanhas: ' + JSON.stringify(noAux));
    ok(noAux.setas === 0 && noAux.optgroups === 0, 'não tem o "⇄" de passar o grupo, e o campo de grupo da ficha só mostra os grupos da campanha dela');
    await FX.locator(`#lista [data-btoggle="${C1}"]`).click(); await w(250);
    await FX.evaluate(() => document.querySelectorAll('.toast').forEach(t => t.remove()));
    const oQueHa = await FX.evaluate(() => ({ alcas: [...document.querySelectorAll('#lista [data-grab]')].map(x => x.dataset.grab), linhas: [...document.querySelectorAll('#lista .pcrow')].map(x => x.dataset.id + (x.offsetParent ? '' : ' (escondida)')), largura: innerWidth }));
    const erroArrAux = await arrastar(FX, 'pc_j', '#lista .pcrow[data-id="pc_a"]', 0.75, TJ);
    if (erroArrAux) console.log('  (na lista do auxiliar: ' + JSON.stringify(oQueHa) + ')');
    ok(!erroArrAux && /^Só o mestre da mesa passa fichas de uma campanha para outra\.$/.test((await FX.locator('.toast').innerText().catch(() => '')).trim()), 'arrastar uma ficha para outra campanha: a lista recusa e diz que isso é do mestre da mesa' + (erroArrAux ? ' — ' + erroArrAux : ': ' + await FX.locator('.toast').innerText().catch(() => '(sem aviso)')));
    ok(await blocoNaTela(FX, 'pc_j') === C2 && (await w(1500), true) && (await linhaPc('pc_j')).campanha === C2 && await TJ.evaluate(() => TC.dados.pendentes === 0 && !TC.dados.erro), 'a ficha fica onde estava (na tela e no banco), e nada fica por subir');
    /* A gravação de uma ficha pelo auxiliar nunca leva troca de campanha — mesmo que a tela dele, por qualquer caminho,
       dissesse outra: o banco recusaria a gravação inteira, e o resto do que ele mexeu se perderia junto. */
    await FX.evaluate(c1 => { const pc = S.personagens.find(p => p.id === 'pc_j'); pc._camp = c1; pc.notas = 'anotação do auxiliar'; save(); }, C1);
    ok(await ate(async () => { const l = await linhaPc('pc_j'); return l.campanha === C2 && !!l.ficha && l.ficha.notas === 'anotação do auxiliar'; }, 20000) && await TJ.evaluate(() => TC.dados.pendentes === 0 && !TC.dados.erro),
      'o que o auxiliar mexe numa ficha é gravado, e a campanha dela fica como está (a gravação dele nunca leva troca de campanha): ' + JSON.stringify(await linhaPc('pc_j').then(l => [l.campanha === C2 ? 'na Geração 2' : l.campanha, l.ficha && l.ficha.notas])));
    await FX.evaluate(c2 => { const pc = S.personagens.find(p => p.id === 'pc_j'); pc._camp = c2; }, C2);
    // as Cenas e o Mapa-múndi dele: mestra, sem "Campanha desta cena…" nem "Campanhas deste mapa…"
    await TJ.locator('#tab-cenas').click();
    const CX = await cenasDe(TJ);
    ok(await ate(() => CX.evaluate(() => __tc.Nuvem.modo() === 'mestre' && __tc.Nuvem.comCampanhas() && !__tc.Nuvem.podeOrganizar())), 'nas Cenas ele mestra, numa mesa com campanhas, sem organizá-las');
    await CX.locator('#sceneBtn').click(); await w(250);
    const itensAux = await CX.locator('.menu > *').evaluateAll(els => els.map(e => e.textContent.trim()).filter(Boolean));
    ok(itensAux.includes('Renomear') && itensAux.includes('Nova cena') && !itensAux.includes('Campanha desta cena…'), 'o menu de cenas dele cria e renomeia, mas não oferece "Campanha desta cena…": ' + JSON.stringify(itensAux));
    await TJ.keyboard.press('Escape'); await CX.evaluate(() => document.querySelectorAll('.menu').forEach(m => m.remove())); await w(200);
    await TJ.locator('#tab-mundo').click();
    const WX = await mundoDe(TJ);
    ok(await WX.evaluate(() => __mundo.App.papel === 'mestre' && __mundo.App.organizaCampanhas() === false), 'e no Mapa-múndi também: mestra, sem dizer de que campanha é cada mapa');
    ok(!(await nomearAux(false)) && await ate(() => TJ.evaluate(() => TC.mesas.atual && TC.mesas.atual.cargo === 'jogador' && TC.mesas.atual.campanhas.length === 1), 40000), '(o Visitante volta a ser jogador)');

    /* ===================== Fichas: "Apagar dados" apaga só as fichas da campanha em vista ===================== */
    const fichasVivas = () => noBanco(async mesa => ((await window.__sb.from('personagens').select('id,campanha,apagado').eq('mesa_id', mesa)).data || []).filter(x => !x.apagado).map(x => x.id + ':' + (x.campanha || 'mundo')).sort(), mesa);
    await TM.locator('#tab-fichas').click();
    const FF = await moldura(TM, /\/fichas\//, () => typeof S === 'object' && !!S && Array.isArray(S.personagens) && S.personagens.length >= 4 && !!document.querySelector('#lista .bloco'));
    await w(800);
    const antesDoFlush = await fichasVivas();
    ok(antesDoFlush.some(x => x.endsWith(':' + C2)) && antesDoFlush.some(x => x.endsWith(':' + C1)) && antesDoFlush.some(x => x.endsWith(':mundo')), '(há fichas da Geração 2, da outra campanha e do mundo: ' + JSON.stringify(antesDoFlush) + ')');
    await FF.locator('button', { hasText: 'Apagar dados' }).first().click(); await w(300);
    const dscFlush = (await FF.locator('.flushitem', { hasText: 'Personagens' }).innerText()).replace(/\s+/g, ' ');
    ok(new RegExp('^Personagens ' + antesDoFlush.filter(x => x.endsWith(':' + C2)).length + ' ficha\\(s\\) da campanha Geração 2 ').test(dscFlush) && /e também os grupos dela$/.test(dscFlush), '"Apagar dados" diz quantas fichas vão, e que são as da campanha em vista: ' + dscFlush);
    await FF.locator('[data-alvo="personagens"]').check(); await FF.locator('#flushNext').click(); await w(300);
    ok(/da campanha Geração 2/.test(await FF.locator('.avisobox').innerText()), 'e a confirmação final repete de que campanha são');
    await FF.locator('#f2Palavra').fill('APAGAR'); await FF.locator('#f2Go').click(); await w(600);
    let depoisDoFlush = [];
    ok(await ate(async () => { depoisDoFlush = await fichasVivas(); return JSON.stringify(depoisDoFlush) === JSON.stringify(antesDoFlush.filter(x => !x.endsWith(':' + C2))); }, 25000) && depoisDoFlush.length >= 2,
      'foram apagadas as fichas da Geração 2 — e só elas: as da outra campanha e as do mundo continuam: ' + JSON.stringify(depoisDoFlush));
  } finally {
    const x = await TM.evaluate(async mesa => { const r = await window.__sb.from('mesas').delete().eq('id', mesa).select('id'); return r.error ? r.error.message : (r.data || []).length; }, mesa).catch(e => String(e.message).split('\n')[0]);
    ok(x === 1, 'a mesa de teste é apagada no fim: ' + x);
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();

  async function avisosDe(f) { return f.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).join(' | ')); }
})().catch(e => { console.error(e); process.exit(1); });
