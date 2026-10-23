// Lote 20 (2ª parte), numa mesa (TC_LOCAL=… no banco local): o mundo compartilhado — cada campanha na data dela.
// O mestre e dois jogadores: o Dalmo só na primeira campanha, o Visitante só na segunda. Um mapa do mundo (das duas).
//   · a linha do tempo: a Geração do Dain no dia 120, a Geração 2 no 100; a projeção de cada campanha
//     (mundo:pubc:<mapa>@<campanha>) leva a data dela, e o banco a entrega só a quem é dela;
//   · cada jogador vê a data da campanha dele (e o evento que só começa no dia 110 só existe para quem está à frente);
//   · o mestre troca a linha: as datas ficam; o Desfazer volta;
//   · a linha do tempo não vai para os jogadores (nem na projeção de sempre).
const { start, checker, espiarBanco } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;
(async () => {
  const t = await start({ net: true });
  const c = contas();
  let ids = {};
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); const m = await entrar(d.page, c.mestre, c.senha, 'Bruno'), a = await entrar(d.page, c.jog1, c.senha, 'Dalmo'), jj = await entrar(d.page, c.jog2, c.senha, 'Visitante'); ids = { m: m.uid, a: a.uid, j: jj.uid }; await d.ctx.close(); }
  const novo = async (name, o) => { const d = await t.device(Object.assign({ name, seed: { 'tinycats:aba': 'mundo', 'tinycats-tour': '1' } }, o)); await espiarBanco(d.ctx); d.page.setDefaultTimeout(15000); return d.page; };
  const TM = await novo('mestre'), TA = await novo('A', { w: 1280, h: 860 }), TJ = await novo('J', { w: 1280, h: 860 });
  const w = (ms, p) => (p || TM).waitForTimeout(ms);
  const ate = async (fn, ms = 20000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* a moldura está abrindo de novo */ } if (Date.now() - t0 > ms) return false; await new Promise(r => setTimeout(r, 300)); } };
  const noBanco = (fn, arg) => TM.evaluate(fn, arg);
  const linhaDoc = id => noBanco(async ([mesa, id]) => (await window.__sb.from('documentos').select('id,vis,campanhas,apagado,dados').eq('mesa_id', mesa).eq('id', id).maybeSingle()).data, [mesa, id]);
  const leDoBanco = (p, pre) => p.evaluate(async ([mesa, pre]) => ((await window.__sb.from('documentos').select('id,apagado').eq('mesa_id', mesa).like('id', pre + '%')).data || []).filter(x => !x.apagado).map(x => x.id).sort(), [mesa, pre]);
  const moldura = async (p, re, pronto) => { let f = null; await ate(async () => { f = p.frames().find(x => x !== p.mainFrame() && re.test(x.url())) || null; return !!f && await f.evaluate(pronto); }, 30000); return f; };
  const mundoDe = p => moldura(p, /\/mundo\//, () => !!window.__mundo && __mundo.App.pronto);
  let mesa = null;

  await TM.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(TM, c.mestre, c.senha);
  const codigo = await criarMesaTela(TM, 'Linha do tempo ' + Date.now().toString(36));
  mesa = await TM.evaluate(() => TC.mesas.atual.id);
  try {
    for (const [p, email, nome] of [[TA, c.jog1, 'Dalmo'], [TJ, c.jog2, 'Visitante']]) { await p.goto(t.base + '?debug', { waitUntil: 'load' }); await loginTela(p, email, c.senha); await entrarMesaTela(p, codigo, nome); }
    const prep = await noBanco(async ([mesa, jj]) => {
      const sb = window.__sb, e = [];
      const c1 = await sb.rpc('campanha_criar', { p_mesa: mesa, p_nome: 'Geração do Dain', p_adotar: true }); if (c1.error) e.push(c1.error.message);
      const c2 = await sb.rpc('campanha_criar', { p_mesa: mesa, p_nome: 'Geração 2' }); if (c2.error) e.push(c2.error.message);
      const C1 = c1.data && c1.data.id, C2 = c2.data && c2.data.id;
      for (const [camp, quem, sim] of [[C1, jj, false], [C2, jj, true]]) { const r = await sb.rpc('campanha_participa', { p_mesa: mesa, p_id: camp, p_usuario: quem, p_sim: sim }); if (r.error) e.push(r.error.message); }
      return { e, C1, C2 };
    }, [mesa, ids.j]);
    ok(prep.e.length === 0 && prep.C1 && prep.C2, 'as duas campanhas (o Dalmo na primeira, o Visitante só na segunda)' + (prep.e.length ? ' — ' + prep.e.join(' · ') : ''));
    const { C1, C2 } = prep;
    // ---------- o mestre: o mapa do mundo e a linha do tempo ----------
    for (const p of [TM, TA, TJ]) await p.reload({ waitUntil: 'load' });
    await TM.locator('#tab-mundo').click().catch(() => {});
    let WM = await mundoDe(TM);
    ok(await ate(async () => { WM = await mundoDe(TM); return await WM.evaluate(c1 => __mundo.App.naMesa && __mundo.App.papel === 'mestre' && __mundo.App.campanha() === c1, C1); }, 30000), 'o Mapa-múndi do mestre, com a Geração do Dain em vista');
    const mp = await WM.evaluate(([c1, c2]) => {
      const { App, N } = __mundo, m = App.criarMapa('Terras Comuns', { larg: 1000, alt: 700 });
      App.definirCampanhas(m.id, []);
      App.mudar('montar', x => {
        x.cal.dia = 120;
        x.objs.push(Object.assign(N.objNovo('e', { x: 500, y: 300 }), { id: 'e_cometa', nome: 'O Cometa', ini: 110, r: 60 }));
        N.linhaComecar(x, { nome: 'Geração do Dain', camp: c1 });
        N.linhaNova(x, { nome: 'Geração 2', camp: c2, dia: 100 });
      });
      App.mostrarAosJogadores(m.id);
      return m.id;
    }, [C1, C2]);
    ok(await ate(async () => { const d = await linhaDoc('mundo:mapa:' + mp); return d && d.campanhas.length === 0 && d.dados.linha && d.dados.linha.lin.length === 2; }), 'o mapa é do mundo e tem as duas linhas');
    ok(await ate(async () => {
      const a = await linhaDoc('mundo:pubc:' + mp + '@' + C1), b = await linhaDoc('mundo:pubc:' + mp + '@' + C2), p = await linhaDoc('mundo:pub:' + mp);
      return a && b && p && a.dados.cal.dia === 120 && b.dados.cal.dia === 100 && a.campanhas.join() === C1 && b.campanhas.join() === C2 && !a.dados.linha && !b.dados.linha && !p.dados.linha;
    }, 25000), 'a projeção de cada campanha na data dela (120 e 100), só para ela; nenhuma leva a linha do tempo');
    // ---------- os jogadores ----------
    const WA = await mundoDe(TA), WJ = await mundoDe(TJ);
    ok(await ate(async () => await WA.evaluate(() => !!__mundo.App.mapa && __mundo.App.mapa.cal.dia === 120), 30000), 'o Dalmo (Geração do Dain) vê o dia 120');
    ok(await ate(async () => await WJ.evaluate(() => !!__mundo.App.mapa && __mundo.App.mapa.cal.dia === 100), 30000), 'o Visitante (Geração 2) vê o dia 100');
    if (process.env.TC_SCRATCH) { const fs = require('fs'), path = require('path'), dir = path.join(process.env.TC_SCRATCH, 'fotos'); fs.mkdirSync(dir, { recursive: true }); await TA.screenshot({ path: path.join(dir, 'l20b-jogador-geracao-dain.png') }); await TJ.screenshot({ path: path.join(dir, 'l20b-jogador-geracao-2.png') }); }
    const cometa = p => p.evaluate(() => { const { App, N } = __mundo; return N.eventosDoDia(App.mapa, App.mapa.cal.dia).some(e => e.id === 'e_cometa'); });
    ok(await cometa(WA) === true && await cometa(WJ) === false, 'o Cometa (do dia 110) já passa para o Dalmo; para o Visitante, ainda não');
    ok((await leDoBanco(TA, 'mundo:pubc:')).join() === 'mundo:pubc:' + mp + '@' + C1 && (await leDoBanco(TJ, 'mundo:pubc:')).join() === 'mundo:pubc:' + mp + '@' + C2, 'do banco, cada um só lê a projeção da campanha dele');
    // ---------- o mestre troca de linha ----------
    const lin = await WM.evaluate(() => __mundo.App.mapa.linha.lin.map(l => l.id));
    await WM.evaluate(id => { const { App, N } = __mundo; App.mudar('ir', m => { N.linhaTrocar(m, id); }); App.mudar('andar', m => { m.cal.dia += 3; }); }, lin[1]); await w(300);
    ok(await ate(async () => { const a = await linhaDoc('mundo:pubc:' + mp + '@' + C1), b = await linhaDoc('mundo:pubc:' + mp + '@' + C2); return a.dados.cal.dia === 120 && b.dados.cal.dia === 103; }, 25000), 'na linha da Geração 2, o mestre anda 3 dias: a Geração 2 vai a 103 e a Geração do Dain fica em 120');
    ok(await ate(async () => await WJ.evaluate(() => __mundo.App.mapa.cal.dia === 103) && await WA.evaluate(() => __mundo.App.mapa.cal.dia === 120), 30000), 'cada jogador acompanha só a data da campanha dele');
  } finally {
    const x = await TM.evaluate(async mesa => { const r = await window.__sb.from('mesas').delete().eq('id', mesa).select('id'); return r.error ? r.error.message : (r.data || []).length; }, mesa).catch(e => String(e.message).split('\n')[0]);
    ok(x === 1, 'a mesa de teste é apagada no fim: ' + x);
  }
  const inesperados = t.errs.filter(e => !/WebSocket|realtime|ERR_|Failed to load resource/i.test(e));
  if (inesperados.length) console.log(inesperados.slice(0, 10).join('\n'));
  ok(inesperados.length === 0, 'sem erros inesperados no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
