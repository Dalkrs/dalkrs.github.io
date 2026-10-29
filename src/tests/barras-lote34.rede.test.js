// Barras de raça, classe e linhagem (lote 34), numa mesa de verdade (banco local de ensaio ou o projeto real), só o
// mestre (Bruno):
//   · o token do Dain (Anão da Forja, a Fornalha no 3º grau) tem o Calor da Forja depois do HP; a Vampira tem a Fome;
//     o Lobo (Licantropo, Sangue Inquieto +2) tem a Barra Bestial;
//   · a barra especial que vira comum na ficha (a Ira do Kai) continua a mesma barra no token (sem outra igual);
//   · "Iniciar" o combate pergunta onde começa a Barra Bestial; com "5": o Lobo vai a 7 (5 + 2 dos nós), o Calor do
//     Dain a 9 (5 + 4), a Fome fica — num passo só, que o Desfazer volta; a ficha acompanha;
//   · "Agora não": só as de sempre vão para o início.
// + as condições novas (Semente de Sangue, Cria da Noite, Fera Solta, Poça do Roedor, Na Toca) na aba Raças.
const { start, checker } = require('./lib');
const { contas, entrar, loginTela, criarMesaTela, apagarMesaTela } = require('./contas');
const { ok, end } = checker();
const j = JSON.stringify;

(async () => {
  const t = await start({ net: true });
  const c = contas();
  { const d = await t.device({ name: 'prep' }); await d.page.goto(t.base + 'src/tests/vazio.html'); await entrar(d.page, c.mestre, c.senha, 'Bruno'); await d.ctx.close(); }
  const M = (await t.device({ name: 'mestre', w: 1440, h: 950, seed: { 'tinycats:aba': 'fichas', 'tinycats-tour': '1' } })).page;
  const w = ms => M.waitForTimeout(ms);
  const quadro = async (p, re, vezes = 80) => { for (let i = 0; i < vezes; i++) { const f = p.frame({ url: re }); if (f) return f; await p.waitForTimeout(250); } return null; };
  const ate = async (fn, ms = 25000) => { const t0 = Date.now(); for (;;) { try { if (await fn()) return true; } catch (e) { /* moldura recarregando */ } if (Date.now() - t0 > ms) return false; await M.waitForTimeout(350); } };
  const parado = () => M.evaluate(() => TC.dados.pendentes === 0);
  const foto = async nome => { if (process.env.FOTOS) await M.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const errosDeFora = () => t.errs.filter(e => !/status of (400|401|409)/.test(e));

  await M.goto(t.base + '?debug', { waitUntil: 'load' }); await w(1500);
  await loginTela(M, c.mestre, c.senha);
  const nomeMesa = 'Barras 34 E2E ' + Date.now().toString(36);
  await criarMesaTela(M, nomeMesa, { semCodigo: true });
  let apagada = false;
  try {
    await M.evaluate(() => {
      const no = (id, nome, pais, desc, graus) => ({ id, nome, tipo: 'notavel', pais, usos: [], desc, graus: graus || [{ custos: {}, texto: '' }] });
      const bib = { nome: 'Urgm', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 10 }], usos: [], naturezas: [], tipos: { notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' } }, cofres: [],
        arvores: [
          { id: 'aaj23w9sif', nome: 'Anão da Forja', categoria: 'raca', nodes: [no('f0', 'Calor da Forja', [], 'Calor da Forja: máximo 20; começa com 5.'),
            no('f1', 'Fornalha Acesa', ['f0'], 'Mais Calor.', [{ custos: {}, texto: '+1 de Calor inicial' }, { custos: {}, texto: '+2 de Calor inicial' }, { custos: {}, texto: '+4 de Calor inicial' }])] },
          { id: 'a7va7rq14q', nome: 'Licantropo', categoria: 'linhagem', nodes: [no('l0', 'Barra Bestial', [], 'Barra Bestial: só à noite; máximo 20.'),
            no('l1', 'Sangue Inquieto', ['l0'], 'A barra começa mais alta.', [{ custos: {}, texto: '+1 de barra inicial' }, { custos: {}, texto: '+2 de barra inicial' }])] },
          { id: 'ayfvz27k70', nome: 'Vampiro', categoria: 'linhagem', nodes: [no('v0', 'Fome', [], 'Fome: máximo 20.')] },
          { id: 'aasemzgk9a', nome: 'Bárbaro', categoria: 'classe', nodes: [no('b0', 'Ira', [], 'Ira (barra): máximo 20; começa em 0.')] }] };
      TC.dados.col('documentos').gravar('arvore:biblioteca', { vis: 'mestre', dados: bib });
      const R = TC.rules, P = TC.dados.col('personagens');
      const ficha = (id, nome, recs, extra) => Object.assign(R.personagemPadrao(nome, id), { tier: 'C', level: 3, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }].concat(recs) }, extra || {});
      P.gravar('pc_dain', { nome: 'Dain', ficha: ficha('pc_dain', 'Dain', [{ id: 'ba_aaj23w9sif', nome: 'Calor da Forja', fml: '20', comeca: '5', arvs: ['aaj23w9sif'], cat: 'raca', comb: 'inicio' }], { barrasArv: 1 }),
        skills: { arvores: ['aaj23w9sif'], pontos: {}, alocados: { f0: 1, f1: 3 } }, estado: { rec: { ba_aaj23w9sif: 2 } }, dono_id: null, vis: 'mestre', ordem: 0 });
      P.gravar('pc_lobo', { nome: 'Lobo', ficha: ficha('pc_lobo', 'Lobo', [{ id: 'ba_a7va7rq14q', nome: 'Barra Bestial', fml: '20', comeca: '0', arvs: ['a7va7rq14q'], cat: 'linhagem', comb: 'pergunta' }], { barrasArv: 1 }),
        skills: { arvores: ['a7va7rq14q'], pontos: {}, alocados: { l0: 1, l1: 2 } }, estado: { rec: { ba_a7va7rq14q: 18 } }, dono_id: null, vis: 'mestre', ordem: 1 });
      P.gravar('pc_vamp', { nome: 'Vampira', ficha: ficha('pc_vamp', 'Vampira', [{ id: 'ba_ayfvz27k70', nome: 'Fome', fml: '20', comeca: '', arvs: ['ayfvz27k70'], cat: 'linhagem', comb: 'fica' }], { barrasArv: 1 }),
        skills: { arvores: ['ayfvz27k70'], pontos: {}, alocados: { v0: 1 } }, estado: { rec: { ba_ayfvz27k70: 6 } }, dono_id: null, vis: 'mestre', ordem: 2 });
      // o Kai ainda com a Ira especial (a troca, aqui, o teste faz à mão: barrasArv 1 segura as Fichas)
      P.gravar('pc_kai', { nome: 'Kai', ficha: ficha('pc_kai', 'Kai', [{ id: 'en', nome: 'Energia', fml: '10' }], { barrasArv: 1, poderes: [{ id: 'pa_aasemzgk9a', nome: 'Ira', max: 20, atual: 0, inicio: 0 }] }),
        skills: { arvores: ['aasemzgk9a'], pontos: {}, alocados: { b0: 1 } }, estado: { pd: { pa_aasemzgk9a: 4 } }, dono_id: null, vis: 'mestre', ordem: 3 });
      // o Rui também, mas sem a marca: as Fichas abertas do mestre fazem a troca sozinhas
      P.gravar('pc_rui', { nome: 'Rui', ficha: ficha('pc_rui', 'Rui', [], { poderes: [{ id: 'pa_aasemzgk9a', nome: 'Ira', max: 20, atual: 0 }] }),
        skills: { arvores: ['aasemzgk9a'], pontos: {}, alocados: { b0: 1 } }, estado: { pd: { pa_aasemzgk9a: 6 } }, dono_id: null, vis: 'mestre', ordem: 4 });
    });
    ok(await ate(() => parado()), '(as fichas e a biblioteca sobem para a mesa)');
    ok(await ate(() => M.evaluate(() => { const l = TC.dados.col('personagens').pegar('pc_rui'), r = l && l.ficha && (l.ficha.recursos || []).find(x => x.nome === 'Ira');
      return !!r && Array.isArray(r.arvs) && r.arvs[0] === 'aasemzgk9a' && !(l.ficha.poderes || []).length && l.estado.rec && l.estado.rec[r.id] === 6 && l.ficha.barrasArv === 1; }), 30000),
      'as Fichas abertas do mestre trocam a Ira especial do Rui pela comum, com o 6, e a mesa recebe');
    await M.locator('#tab-cenas').click();
    let C = null;
    ok(await ate(async () => { C = await quadro(M, /\/cenas\//); return C && await C.evaluate(() => !!window.__tc && !!__tc.Store.scene() && __tc.Nuvem.modo() === 'mestre' && __tc.Fichas.on() && !!__tc.Fichas.get('pc_kai')); }, 40000), '(o mestre abre as Cenas da mesa)');
    if (await C.locator('.modal').count()) { await M.keyboard.press('Escape'); await w(300); }
    const ids = {};
    const bars = id => C.evaluate(id => __tc.Store.get('tokens', id).bars.map(b => b.n + ':' + b.v + '/' + b.m + (b.k === 'pts' ? '·pts' : '')), id);
    const linha = id => M.evaluate(id => { const l = TC.dados.col('personagens').pegar(id); return l ? JSON.parse(JSON.stringify(l.estado || {})) : null; }, id);

    await passo('os tokens', async () => {
      await C.evaluate(() => __tc.Combate.trazer(['pc_dain', 'pc_lobo', 'pc_vamp', 'pc_kai'], 0, 0)); await w(600);
      Object.assign(ids, await C.evaluate(() => { const o = {}; for (const k of __tc.Store.scene().tokens) o[k.char] = k.id; return o; }));
      ok(j(await bars(ids.pc_dain)) === j(['HP:100/100', 'Calor da Forja:2/20']), 'o Dain: o HP e o Calor da Forja (2 agora) — ' + j(await bars(ids.pc_dain)));
      ok(j(await bars(ids.pc_kai)) === j(['HP:100/100', 'Energia:10/10', 'Ira:4/20·pts']) && await C.evaluate(id => __tc.Store.get('tokens', id).bars[2].ref, ids.pc_kai) === 'pd:pa_aasemzgk9a', 'o Kai ainda com a Ira especial (em bolinhas, no fim, ligada à barra especial) — ' + j(await bars(ids.pc_kai)));
      ok(await C.evaluate(id => __tc.Store.get('tokens', id).bars[1].st, ids.pc_dain) === 9, 'o começo da barra no token: 9 (5 + 4 dos nós)');
    });
    await passo('a especial vira comum', async () => {
      await M.evaluate(() => { const P = TC.dados.col('personagens'), l = P.pegar('pc_kai');
        const rs = l.ficha.recursos.slice(); rs.splice(1, 0, { id: 'pa_aasemzgk9a', nome: 'Ira', fml: '20', comeca: '0', arvs: ['aasemzgk9a'], cat: 'classe', comb: 'inicio' });      // (como as Fichas: depois do HP)
        const f = Object.assign({}, l.ficha, { poderes: [], recursos: rs });
        P.gravar('pc_kai', { ficha: f, estado: Object.assign({}, l.estado, { pd: {}, rec: { pa_aasemzgk9a: 4 } }) }); });
      ok(await ate(async () => j(await bars(ids.pc_kai)) === j(['HP:100/100', 'Ira:4/20', 'Energia:10/10']) && await C.evaluate(id => __tc.Store.get('tokens', id).bars[1].ref, ids.pc_kai) === 'pa_aasemzgk9a'),
        'a ficha trocou a Ira para barra comum: no token, a mesma barra (agora barra, ligada à comum, logo depois do HP), com o 4, sem outra igual — ' + j(await bars(ids.pc_kai)));
    });
    await passo('iniciar o combate', async () => {
      await C.evaluate(ids => { const u = __tc; u.Act.turnAdd(Object.values(ids).map(id => u.Store.get('tokens', id)).filter(Boolean)); u.UI.openTab('turn'); }, ids); await w(400);
      await C.locator('#turnOnOff').click(); await w(500);
      const txt = await C.locator('.modal').innerText();
      ok(/Barra Bestial: onde ela começa\?/.test(txt) && /Lobo/.test(txt) && /os nós somam \+2/.test(txt) && /Dia/.test(txt) && /15 · lua cheia/.test(txt), 'a mesa pergunta onde começa a Barra Bestial (Dia, 0, 5, 10, 15) — ' + txt.replace(/\n/g, ' | ').slice(0, 220));
      ok(j(await bars(ids.pc_dain)) === j(['HP:100/100', 'Calor da Forja:2/20']), '(antes da resposta, nada mudou)');
      await foto('l34-rede-bestial');
      await C.locator('.modal .btn', { hasText: /^5$/ }).click(); await w(500);
      ok(j(await bars(ids.pc_lobo)) === j(['HP:100/100', 'Barra Bestial:7/20']) && j(await bars(ids.pc_dain)) === j(['HP:100/100', 'Calor da Forja:9/20']) && j(await bars(ids.pc_kai)) === j(['HP:100/100', 'Ira:0/20', 'Energia:10/10']) && j(await bars(ids.pc_vamp)) === j(['HP:100/100', 'Fome:6/20']),
        'com 5: o Lobo vai a 7 (5 + 2), o Calor a 9, a Ira a 0; a Fome fica em 6 — ' + j([await bars(ids.pc_lobo), await bars(ids.pc_dain), await bars(ids.pc_kai), await bars(ids.pc_vamp)]));
      const tt = await C.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
      ok(/Combate: as barras de raça e classe foram para o início — .*Dain: Calor da Forja 9/.test(tt) && /Barra Bestial \(à noite\) — Lobo: Barra Bestial 7/.test(tt), 'o aviso diz o que mudou — ' + tt.slice(0, 260));
      await foto('l34-rede-inicio');
      ok(await ate(async () => (await linha('pc_dain')).rec.ba_aaj23w9sif === 9 && (await linha('pc_lobo')).rec.ba_a7va7rq14q === 7), 'as fichas acompanham (Calor 9, Bestial 7)');
      await C.evaluate(() => __tc.Tools.undo()); await w(400);
      ok(j(await bars(ids.pc_dain)) === j(['HP:100/100', 'Calor da Forja:2/20']) && j(await bars(ids.pc_lobo)) === j(['HP:100/100', 'Barra Bestial:18/20']) && j(await bars(ids.pc_kai)) === j(['HP:100/100', 'Ira:4/20', 'Energia:10/10']), 'um Desfazer volta as três (um passo só)');
      ok(await C.evaluate(() => __tc.Store.scene().turn.on), '(e o combate continua começado)');
    });
    await passo('agora não', async () => {
      await C.locator('#turnOnOff').click(); await w(400);     // encerrar
      await C.locator('#turnOnOff').click(); await w(500);     // e começar de novo
      await C.locator('.modal .btn', { hasText: 'Agora não' }).click(); await w(500);
      ok(j(await bars(ids.pc_dain)) === j(['HP:100/100', 'Calor da Forja:9/20']) && j(await bars(ids.pc_lobo)) === j(['HP:100/100', 'Barra Bestial:18/20']), '"Agora não": o Calor vai ao início; a Barra Bestial fica (18)');
    });
    await passo('as condições novas', async () => {
      await C.evaluate(id => { __tc.setSel([{ c: 'tokens', id }]); __tc.UI.openTab('sel'); }, ids.pc_lobo); await w(300);
      const n = await C.evaluate(() => ['sementeSangue', 'criaNoite', 'feraSolta', 'pocaRoedor', 'naToca'].map(id => { const c = __tc.CONDS.find(x => x.id === id); return c ? c.n + '·' + c.g + '·' + (c.r || '') + '·' + (c.dur || 0) : null; }));
      ok(j(n) === j(['Semente de Sangue·racas·Vampiro·0', 'Cria da Noite·racas·Vampiro·0', 'Fera Solta·racas·Licantropo·0', 'Poça do Roedor·racas·Antro Roedor·2', 'Na Toca·racas·Antro Roedor·2']), 'as cinco condições, na aba Raças, com quem as traz — ' + j(n));
      await C.evaluate(id => { const u = __tc; u.Act.condToggle([u.Store.get('tokens', id)], 'feraSolta'); u.Act.condToggle([u.Store.get('tokens', id)], 'naToca'); }, ids.pc_lobo); await w(300);
      const tk = await C.evaluate(id => { const t = __tc.Store.get('tokens', id); return { conds: t.conds, info: t.cinfo }; }, ids.pc_lobo);
      ok(tk.conds.includes('feraSolta') && tk.conds.includes('naToca') && tk.info.naToca && tk.info.naToca.d === 2, 'a Fera Solta e o Na Toca no Lobo (o Na Toca com 2 rodadas) — ' + j(tk));
      await foto('l34-rede-condicoes');
    });
    await apagarMesaTela(M, nomeMesa); apagada = true;
  } finally {
    if (!apagada) { try { await apagarMesaTela(M, nomeMesa); } catch (e) { console.log('não deu para apagar a mesa de teste: ' + e.message); } }
  }
  const fora = errosDeFora();
  if (fora.length) console.log('CONSOLE:\n' + fora.slice(0, 12).join('\n'));
  ok(fora.length === 0, 'sem erros inesperados no console');
  await t.close(); end();
})();
