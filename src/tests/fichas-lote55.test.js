// Fichas, lote 55 (sem mesa): a escola Yanato cria a barra de Toxicidade (o cinto de poções nas Cenas).
//   · a ficha que já tinha a Yanato (de antes do lote 55) ganha a Toxicidade uma vez, aberta ou não;
//   · o aviso diz "a barra da escola" (não "raça, classe e linhagem"); o quadro diz "Barra da escola Yanato";
//   · a barra que alguém tirou não volta sozinha.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
const j = JSON.stringify;

const no = (id, nome, pais, desc) => ({ id, nome, tipo: pais.length ? 'notavel' : 'keystone', pais, usos: [], desc, graus: [{ custos: pais.length ? { p1: 1 } : {}, texto: '' }] });
const bib = { nome: 'Bib', pools: [{ id: 'p1', nome: 'Pontos', cor: '#D9A441', padrao: 10 }], usos: [], naturezas: [],
  arvores: [
    { id: 'a5ufrdl1er', nome: 'Yanato', categoria: 'escola', nodes: [no('y1', 'Cinza', [], 'Frascos: máximo 3.'), no('y2', 'Bornal de Cinza', ['y1'], 'Mais laços.')] },
    { id: 'outraesc01', nome: 'Escola do Vento', categoria: 'escola', nodes: [no('e1', 'Vento', [], 'Fôlego: máximo 5.')] },
    { id: 'aasemzgk9a', nome: 'Bárbaro', categoria: 'classe', nodes: [no('b0', 'Ira do Bárbaro', [], 'Ira (barra): máximo 20; começa em 0.')] }] };
const pc = (id, nome, extra) => Object.assign(R.personagemPadrao(nome), { id, nome, level: 8, recursos: [{ id: 'hp' + id, nome: 'HP', fml: '100' }, { id: 'sp' + id, nome: 'SP', fml: '50' }] }, extra);
// a Ana (a aberta) e o Ren (outra ficha): os dois já tinham a Yanato antes do lote 55 (a troca do lote 34 já feita)
const ana = pc('pc_ana', 'Ana', { arvVistas: ['a5ufrdl1er'], barrasArv: 1, skills: { arvores: ['a5ufrdl1er'], pontos: { p1: 10 }, alocados: { y1: 1 } } });
const ren = pc('pc_ren', 'Ren', { arvVistas: ['a5ufrdl1er'], barrasArv: 1, skills: { arvores: ['a5ufrdl1er'], pontos: { p1: 10 }, alocados: { y1: 1 } } });
// a Tai: outra escola (não cria barra) e o Bárbaro já trocado (nada muda)
const tai = pc('pc_tai', 'Tai', { arvVistas: ['outraesc01', 'aasemzgk9a'], barrasArv: 1, recursos: [{ id: 'hppc_tai', nome: 'HP', fml: '100' }, { id: 'ba_aasemzgk9a', nome: 'Ira', fml: '20', comeca: '0', arvs: ['aasemzgk9a'], cat: 'classe', comb: 'zera' }],
  skills: { arvores: ['outraesc01', 'aasemzgk9a'], pontos: { p1: 10 }, alocados: {} } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [ana, ren, tai], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_ana', selSit: null, aba: 'fichas', grupos: [], skillsUI: { equipar: true, distribuir: true } });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas-l55', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms);
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const ficha = id => P.evaluate(id => { const p = S.personagens.find(x => x.id === id);
    return { rec: p.recursos.map(r => ({ id: r.id, nome: r.nome, fml: r.fml, comeca: r.comeca, arvs: r.arvs, comb: r.comb, cat: r.cat })), esc: p.barrasEsc || null }; }, id);
  const aviso = () => P.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1400);

  await passo('as fichas que já tinham a Yanato', async () => {
    const a = await ficha('pc_ana'), r = await ficha('pc_ren'), ti = await ficha('pc_tai');
    const tx = a.rec.find(x => x.nome === 'Toxicidade'), tr = r.rec.find(x => x.nome === 'Toxicidade');
    ok(tx && tx.fml === '20' && tx.comeca === '0' && tx.comb === 'fica' && tx.cat === 'escola' && j(tx.arvs) === j(['a5ufrdl1er']) && j(a.esc) === j(['a5ufrdl1er']),
      'a Ana (aberta): ganhou a Toxicidade (0 a 20, começa em 0, o combate não mexe) — ' + j(a));
    ok(tr && j(tr.arvs) === j(['a5ufrdl1er']) && j(r.esc) === j(['a5ufrdl1er']), 'o Ren (outra ficha): ganhou também — ' + j(r));
    ok(j(ti.rec.map(x => x.nome)) === j(['HP', 'Ira']) && !ti.esc, 'a Tai: a outra escola não cria barra, e nada muda — ' + j(ti));
    const av = await aviso();
    ok(/Toxicidade/.test(av) && /da escola Yanato|barra da escola/.test(av) && !/linhagem Yanato/.test(av), 'o aviso fala da escola — ' + av);
    await foto('l55-fichas-aviso');
  });
  await passo('o quadro dos recursos', async () => {
    await P.locator('#ficha [data-abaficha="atributos"]').click(); await w(300);
    const h = await P.evaluate(() => [...document.querySelectorAll('.barra-arv')].map(x => x.innerText).join(' ¶ '));
    ok(/Barra da escola Yanato\. O combate não mexe nela\./.test(h), 'o quadro diz de onde vem — ' + h);
  });
  await passo('tirar a barra', async () => {
    await P.evaluate(() => { const p = S.personagens.find(x => x.id === 'pc_ren'); p.recursos = p.recursos.filter(r => r.nome !== 'Toxicidade'); save(); barrasDasOutras(); S.sel = 'pc_ren'; render(); }); await w(500);
    await P.evaluate(() => { S.sel = 'pc_ana'; render(); barrasDasOutras(); }); await w(300);
    ok(!(await ficha('pc_ren')).rec.some(x => x.nome === 'Toxicidade'), 'a Toxicidade que alguém tirou não volta sozinha');
  });
  ok(t.errs.length === 0, 'sem erros no console' + (t.errs.length ? ': ' + t.errs.slice(0, 3).join(' | ') : ''));
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
