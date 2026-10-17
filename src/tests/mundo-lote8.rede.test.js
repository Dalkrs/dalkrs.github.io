// Mapa-múndi, lote 8 (parte 3), numa mesa (TC_LOCAL=… no banco local de ensaio): a bandeira do clã nas facções.
//   · o clã ligado a uma facção (escondido dos jogadores) dá a bandeira dela: o mapa do mestre a mostra no meio da região,
//     junto do grupo e na zona de guerra; a projeção a leva, e o jogador a vê no mapa mostrado — sem receber o clã;
//   · o brasão que muda no Clã muda a bandeira (no mapa do mestre, na projeção e no do jogador);
//   · o clã que deixa a facção leva a bandeira embora.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, entrarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

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
