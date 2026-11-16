// Lote 173: as caudas da Kitsune que guardam o poder de um yokai (TC.caudas e o painel na aba Skills da ficha, fora
// de uma mesa: quem usa mestra).
// Uso: node src/tests/caudas.test.js   (TC_SCRATCH=pasta guarda a foto)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const C = require('../../tc/caudas.js');
const R = require('../../tc/rules.js');
const j = JSON.stringify;

/* ---------------- a conta ---------------- */
{
  const l0 = C.norm();
  ok(l0.length === 9 && l0.every(c => c.p === null && c.fer.length === 0), 'nove caudas vazias');
  const g = C.mudar(l0, { t: 'guardar', i: 4, p: { y: 'Kappa', n: 'Pele de Água', e: 'Defesa tier II', f: 'fria para sempre' } });
  ok(g.mudou && g.caudas[4].p.n === 'Pele de Água' && l0[4].p === null, 'guardar numa cauda (sem mexer na lista recebida)');
  ok(!C.mudar(l0, { t: 'guardar', i: 9, p: { n: 'x' } }).mudou && !C.mudar(l0, { t: 'guardar', i: 0, p: { y: 'só o yokai' } }).mudou, 'cauda que não existe ou poder sem nome nem efeito: nada');
  const u = C.mudar(g.caudas, { t: 'usar', i: 4 });
  ok(u.mudou && u.usado.n === 'Pele de Água' && u.caudas[4].p === null && j(u.caudas[4].fer) === j(['fria para sempre']) && u.ferida === 'fria para sempre', 'usar: o poder sai e a ferida fica');
  ok(!C.mudar(u.caudas, { t: 'usar', i: 4 }).mudou, 'cauda vazia: nada para usar');
  const c = C.mudar(u.caudas, { t: 'curar', i: 4, k: 0 });
  ok(c.mudou && c.caudas[4].fer.length === 0, 'o mestre tira a ferida');
  const t = C.mudar(g.caudas, { t: 'tirar', i: 4 });
  ok(t.mudou && t.caudas[4].p === null && t.caudas[4].fer.length === 0, 'tirar: descarta sem usar e sem ferida');
  const e = C.naFicha({ rec: { a: 1 }, pb: { ninja: { s: { selos: 2 } } } }, g.caudas);
  ok(e.rec.a === 1 && e.pb.ninja.s.selos === 2 && C.daFicha(e)[4].p.y === 'Kappa' && C.comPoder(C.daFicha(e)) === 1, 'na ficha: estado.pb.kitsune.s.caudas, sem mexer no resto');
}

/* ---------------- a tela ---------------- */
const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', nome: 'Dain', skills: { arvores: ['a_kitsune'], pontos: {}, alocados: {} } });
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'caudas', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms), E = fn => P.evaluate(fn);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await passo('a aba Skills', async () => {
    await P.locator('[data-abaficha="skills"]').click(); await w(300);
    ok(await P.locator('#painelCaudas').isVisible(), 'quem tem a árvore da Kitsune vê as caudas na aba Skills');
    await P.locator('[data-kguardar]').click(); await w(200);
    await P.locator('[data-kc]').selectOption('2');
    await P.locator('[data-ky]').fill('Tengu');
    await P.locator('[data-kn]').fill('Asas do Vento');
    await P.locator('[data-ke]').fill('Voa 6 cédulas neste turno.');
    await P.locator('[data-kf]').fill('Uma pena negra nasce na cauda.');
    await P.locator('[data-kok]').click(); await w(300);
    const cs = await E(() => TC.caudas.daFicha(S.personagens[0].estado));
    ok(cs[2].p && cs[2].p.y === 'Tengu' && cs[2].p.n === 'Asas do Vento', 'guardado na cauda 3');
    ok(/Asas do Vento/.test(await P.locator('#painelCaudas').innerText()), 'o cartão mostra o poder');
    await P.locator('[data-kusar="2"]').click(); await w(300);
    const d = await E(() => TC.caudas.daFicha(S.personagens[0].estado)[2]);
    ok(!d.p && d.fer[0] === 'Uma pena negra nasce na cauda.', 'usar: o poder sai, a ferida fica');
    ok(/Dain usa Asas do Vento \(Tengu\), da cauda 3/.test(await E(() => (document.querySelector('.toast') || {}).textContent || '')), 'o aviso conta o uso e a ferida');
    if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.locator('#painelCaudas').screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', 'caudas.png') }); }
  });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
