// Mapa-múndi, lote 20 (numa moldura que faz o papel da casca, com duas campanhas e sem mesa): a linha do tempo.
//   · a aba Linha do tempo (só quem mestra): começar dá uma linha a cada campanha, na data de hoje; a da campanha em vista
//     fica "agora no mapa";
//   · cada linha anda sozinha: passar dias numa não mexe na outra; "Ir para esta linha" troca a data do mapa (pergunta se
//     marca a de agora), e o Desfazer volta;
//   · "Parou aqui" guarda a marca no histórico; "Terminar a sessão…" marca as que andaram;
//   · o aviso do que o mundo já tem depois da data da linha atrasada (o evento que começa no meio-tempo);
//   · separar um grupo: a linha própria, com o grupo do mapa; o "+1 tempo" da outra linha não o leva; "Juntar ao grupo";
//   · a projeção dos jogadores não leva a linha; na data de cada campanha, os eventos daquela data.
// TC_SCRATCH=<pasta> guarda capturas em <pasta>/fotos.
const path = require('path');
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const espera = ms => new Promise(r => setTimeout(r, ms));
async function passo(nome, fn) { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } }

(async () => {
  const t = await start();
  const d = await t.device({ name: 'moldura-l20', w: 1400, h: 900 });
  const P = d.page;
  P.setDefaultTimeout(8000);
  await P.goto(t.base + 'src/tests/vazio.html', { waitUntil: 'load' });
  await P.evaluate(() => {
    const f = document.createElement('iframe'); f.id = 'mf'; f.src = '/mundo/?debug'; f.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0'; document.body.append(f);
  });
  let F = null;
  for (let i = 0; i < 80 && !F; i++) { F = P.frames().find(f => f !== P.mainFrame() && /\/mundo\//.test(f.url())) || null; if (!F) await espera(100); }
  await F.waitForFunction(() => window.__mundo && __mundo.App.pronto, null, { timeout: 15000 });
  if (await F.locator('#vazio [data-k="vz:nome"]').count()) { await F.fill('#vazio [data-k="vz:nome"]', 'Urgm'); await F.click('#vazio [data-k="vz:papel"]'); await espera(300); }
  const A = (fn, arg) => F.evaluate(fn, arg);
  const foto = async nome => { if (process.env.TC_SCRATCH) { require('fs').mkdirSync(path.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: path.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const k = s => F.locator(`[data-k="${s}"]`);
  const dlg = () => F.locator('dialog[open]');
  const mapa = () => A(() => JSON.parse(JSON.stringify(__mundo.App.mapa)));
  const toasts = () => A(() => Array.from(document.querySelectorAll('#toasts .toast')).map(x => x.innerText.replace(/\s+/g, ' ')).join(' ¶ '));
  const limparToasts = () => A(() => document.querySelectorAll('#toasts .toast').forEach(x => x.remove()));

  // a moldura: duas campanhas (Aurora em vista, e Brasa); quem usa é o mestre
  await A(() => {
    const { App } = __mundo;
    App.naMesa = true;
    App.campanhas = () => [{ id: 'aurora', nome: 'Aurora', encerrada: false }, { id: 'brasa', nome: 'Brasa', encerrada: false }];
    App.campanha = () => 'aurora';
    if (!App.mapa) App.criarMapa('Mundo');
    App.mudar('montar', m => {
      m.cal.dia = 100;
      m.grade = Object.assign({}, m.grade, { tam: 50, x: 25, y: 25, on: true });
      m.objs.push(Object.assign(__mundo.N.objNovo('g', { x: 300, y: 300 }), { id: 'g_kairo', nome: 'Kairo' }));
      m.objs.push(Object.assign(__mundo.N.objNovo('e', { x: 600, y: 400 }), { id: 'e_peste', nome: 'A Peste Cinza', ini: 104, r: 80 }));
    });
  });
  const abrirLinha = async () => { await A(() => window.MundoPainel.abrirAba('linha')); await espera(300); };

  await passo('começar', async () => {
    await abrirLinha();
    ok(await k('ln:comecar').count() === 1, 'a aba Linha do tempo, com o "Começar a linha do tempo"');
    await k('ln:comecar').click(); await espera(300);
    const m = await mapa();
    ok(m.linha && m.linha.lin.length === 2 && m.linha.lin[0].nome === 'Aurora' && m.linha.lin[0].camp === 'aurora' && m.linha.lin[1].camp === 'brasa' && m.linha.ativa === m.linha.lin[0].id,
      'cada campanha ganha a linha dela; a em vista (Aurora) fica no mapa: ' + j(m.linha && m.linha.lin.map(l => [l.nome, l.camp, l.dia])));
    ok(await k('ln-agora:' + m.linha.lin[0].id).count() === 1 && /Ainda sem marca/.test(await k('ln-marca:' + m.linha.lin[0].id).innerText()), 'Aurora "agora no mapa", ainda sem marca');
  });

  let la = null, lb = null;
  await passo('cada linha anda sozinha', async () => {
    const m0 = await mapa(); la = m0.linha.lin[0].id; lb = m0.linha.lin[1].id;
    // Aurora anda 6 dias
    await A(() => { const { App } = __mundo; App.mudar('passar', m => { m.cal.dia += 6; }); }); await espera(200);
    // vai para Brasa: pergunta se marca Aurora
    await limparToasts();
    await k('ln-ir:' + lb).click(); await espera(300);
    ok(await dlg().count() === 1 && /Marcar “Parou aqui” em Aurora/.test(await dlg().innerText()), 'ir para Brasa pergunta se marca Aurora (marcado de começo)');
    await foto('l20-mundo-trocar');
    await dlg().locator('button[type=submit]').click(); await espera(300);
    let m = await mapa();
    const a = m.linha.lin.find(l => l.id === la);
    ok(m.linha.ativa === lb && m.cal.dia === 100 && a.dia === 106 && a.paradas.length === 1 && a.paradas[0].dia === 106, 'o mapa vai para a data de Brasa (100); Aurora guarda 106, com a marca: ' + j({ dia: m.cal.dia, a: [a.dia, a.paradas.length] }));
    ok(/O mapa está em Brasa/.test(await toasts()), 'o aviso diz onde o mapa está, com o Desfazer: ' + await toasts());
    // Brasa anda 2 dias: Aurora fica em 106
    await A(() => __mundo.App.mudar('passar', m => { m.cal.dia += 2; })); await espera(200);
    m = await mapa();
    ok(m.cal.dia === 102 && m.linha.lin.find(l => l.id === la).dia === 106, 'Brasa anda sozinha (102); Aurora continua em 106');
    // Desfazer duas vezes: volta para Aurora em 106
    await A(() => { __mundo.App.desfazer(); __mundo.App.desfazer(); }); await espera(250);
    m = await mapa();
    ok(m.linha.ativa === la && m.cal.dia === 106, 'o Desfazer volta o mapa para Aurora (106): ' + j({ at: m.linha.ativa === la, dia: m.cal.dia }));
    await A(() => { __mundo.App.refazer(); __mundo.App.refazer(); }); await espera(250);
  });

  await passo('o aviso do que já aconteceu', async () => {
    await abrirLinha();
    const txt = await k('ln:depois').innerText();
    ok(/Brasa está 4 dias atrás de Aurora/.test(txt) && /A Peste Cinza/.test(txt) && /começa em/.test(txt), 'na linha atrasada (Brasa, 102), o aviso: 4 dias atrás de Aurora, e a Peste que começa no meio-tempo — ' + txt.replace(/\s+/g, ' '));
    await foto('l20-mundo-linha');
  });

  await passo('parou aqui e o fim da sessão', async () => {
    await k('ln-parou:' + lb).click(); await espera(250);
    await dlg().locator('input').fill('acamparam antes da ponte');
    await dlg().locator('button[type=submit]').click(); await espera(300);
    let m = await mapa(), b = m.linha.lin.find(l => l.id === lb);
    ok(b.paradas.length === 1 && b.paradas[0].dia === 102 && b.paradas[0].nota === 'acamparam antes da ponte' && b.paradas[0].em > 0, '"Parou aqui": a marca com a data, a hora em que foi marcada e a nota');
    ok(await k('ln-hist:' + lb).count() === 1, 'o histórico da linha aparece');
    await A(() => __mundo.App.mudar('passar', m => { m.cal.tempo = 2; })); await espera(200);
    await k('ln:fim').click(); await espera(250);
    ok(await dlg().count() === 1 && /Brasa/.test(await dlg().innerText()) && !/Aurora —/.test(await dlg().innerText()), '"Terminar a sessão…": oferece só as que andaram (Brasa)');
    await dlg().locator('button[type=submit]').click(); await espera(300);
    m = await mapa(); b = m.linha.lin.find(l => l.id === lb);
    ok(b.paradas.length === 2 && b.paradas[1].tempo === 2, 'marca Brasa no 3º tempo');
  });

  await passo('separar e juntar', async () => {
    await k('ln:separar').click(); await espera(250);
    await dlg().locator('#dl-nome').fill('Kairo sozinho');
    await dlg().locator('input[type=checkbox][value="g_kairo"]').check();
    await dlg().locator('button[type=submit]').click(); await espera(300);
    let m = await mapa();
    const s = m.linha.lin.find(l => l.nome === 'Kairo sozinho');
    ok(s && s.sep && s.camp === 'brasa' && j(s.grupos) === j(['g_kairo']) && s.dia === 102, 'separar: a linha própria (da campanha Brasa), com o grupo Kairo, na data de agora: ' + j(s));
    // dá uma rota ao Kairo: o "+1 tempo" de Brasa não o leva
    const antes = await A(() => { const { App, N } = __mundo; App.mudar('rota', m => { const r = N.objNovo('t', { pts: [[300, 300], [900, 300]] }); m.objs.push(r); const g = m.objs.find(o => o.id === 'g_kairo'); g.rota = r.id; g.pt = 10; }); const g = App.mapa.objs.find(o => o.id === 'g_kairo'); return [g.x, g.y]; });
    await A(() => window.MundoPainel.abrirAba('hoje')); await espera(300);
    ok(/Na linha Kairo sozinho/.test(await k('gr-linha:g_kairo').innerText()) && await k('gr-andar:g_kairo').isDisabled(), 'na aba Hoje, Kairo diz de que linha é, e o "Andar" dele fica para a linha dele');
    await k('hoje:tempo').click(); await espera(400);
    const depois = await A(() => { const g = __mundo.App.mapa.objs.find(o => o.id === 'g_kairo'); return [g.x, g.y]; });
    ok(j(antes) === j(depois), 'o "+1 tempo" de Brasa não leva o grupo de outra linha: ' + j([antes, depois]));
    // (a prova: na linha dele, o mesmo "+1 tempo" leva o Kairo)
    const sid = s.id;
    await A(id => { const { App, N } = __mundo; App.mudar('ir', m => { N.linhaTrocar(m, id); }); }, sid); await espera(200);
    await A(() => window.MundoPainel.abrirAba('hoje')); await espera(300);
    await k('hoje:tempo').click(); await espera(400);
    const naDele = await A(() => { const g = __mundo.App.mapa.objs.find(o => o.id === 'g_kairo'); return [g.x, g.y, g.prog || 0]; });
    ok(naDele[2] > 0, 'na linha dele, o "+1 tempo" leva o Kairo: ' + j(naDele));
    await A(() => __mundo.App.desfazer()); await A(() => __mundo.App.desfazer()); await espera(200);
    await abrirLinha();
    await k('ln-juntar:' + s.id).click(); await espera(250);
    await dlg().locator('button[type=submit]').click(); await espera(300);
    m = await mapa();
    ok(!m.linha.lin.some(l => l.id === s.id) && m.linha.lin.find(l => l.id === lb).grupos.includes('g_kairo'), '"Juntar ao grupo": a linha sai e o Kairo volta para Brasa');
  });

  await passo('a projeção dos jogadores', async () => {
    const r = await A(([la, lb]) => {
      const { App, N } = __mundo, m = App.mapa, p = N.projetar(m), na = N.naDataDe(m, 'aurora'), nb = N.naDataDe(m, 'brasa');
      const peste = mm => N.eventosDoDia(N.projetar(mm), N.projetar(mm).cal.dia).some(e => e.id === 'e_peste');
      return { linha: 'linha' in p, a: na.cal.dia, b: nb.cal.dia, pa: peste(na), pb: peste(nb) };
    }, [la, lb]);
    ok(!r.linha, 'a projeção dos jogadores não leva a linha do tempo');
    ok(r.a === 106 && r.b === 102 && r.pa === true && r.pb === false, 'na data de cada campanha: Aurora (106) vê a Peste; Brasa (102), ainda não — ' + j(r));
  });

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 10).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
