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
  ok(l0.length === 9 && l0.every(c => c.p === null), 'nove caudas vazias');
  const g = C.mudar(l0, { t: 'guardar', i: 4, p: { y: 'Kappa', n: 'Pele de Água', e: 'Defesa tier II', a: true } });
  ok(g.mudou && g.caudas[4].p.n === 'Pele de Água' && g.caudas[4].p.a && l0[4].p === null, 'guardar numa cauda (sem mexer na lista recebida)');
  ok(!C.mudar(l0, { t: 'guardar', i: 9, p: { n: 'x' } }).mudou && !C.mudar(l0, { t: 'guardar', i: 0, p: { y: 'só o yokai' } }).mudou, 'cauda que não existe ou poder sem nome nem efeito: nada');
  const e1 = C.naFicha({ rec: { a: 1 }, pb: { ninja: { s: { selos: 2 } } } }, g.caudas);
  ok(e1.podre.ba_a_kitsune === 1 && C.podres(C.daFicha(e1)) === 1, '(lote 174) o poder que apodrece: a barra Caudas fica com 1 podre');
  const u = C.mudar(g.caudas, { t: 'usar', i: 4 }), e2 = C.naFicha(e1, u.caudas);
  ok(u.mudou && u.usado.n === 'Pele de Água' && u.caudas[4].p === null && !e2.podre, 'usar: o poder sai e a cauda deixa de estar podre');
  ok(!C.mudar(u.caudas, { t: 'usar', i: 4 }).mudou, 'cauda vazia: nada para usar');
  const t = C.mudar(g.caudas, { t: 'tirar', i: 4 });
  ok(t.mudou && t.caudas[4].p === null, 'tirar: descarta sem usar');
  ok(e1.rec.a === 1 && e1.pb.ninja.s.selos === 2 && C.daFicha(e1)[4].p.y === 'Kappa' && C.comPoder(C.daFicha(e1)) === 1, 'na ficha: estado.pb.kitsune.s.caudas, sem mexer no resto');
  ok(C.bibDaFicha(e2).length === 1 && C.bibDaFicha(e2)[0].y === 'Kappa', '(lote 174) o poder usado continua na biblioteca da ficha');
  ok(C.juntar([C.bibDaFicha(e2), [{ y: 'kappa', n: 'pele de água', e: 'outro' }, { y: 'Tengu', n: 'Asas' }]]).length === 2, '(lote 174) juntar as bibliotecas sem repetir (yokai + nome)');
  ok(C.bibDaFicha(C.semDaBib(e2, { y: 'Kappa', n: 'Pele de Água' })).length === 0, '(lote 174) tirar da biblioteca');
}
{ // (lote 183) a Kitsune Nirus: o mesmo jeito, no seu lugar (pb.nirus) e na sua barra
  const N = C.nirus, g = N.mudar([], { t: 'guardar', i: 1, p: { y: 'Humano, o bandido Joca', n: 'Golpe Baixo', e: 'um truque', a: true } });
  const e = N.naFicha({ pb: { kitsune: { s: { caudas: [{ p: { n: 'X' } }] } } } }, g.caudas);
  ok(N.daFicha(e)[1].p.n === 'Golpe Baixo' && C.daFicha(e)[0].p.n === 'X', '(lote 183) a Nirus guarda em pb.nirus, sem mexer nas caudas da Kitsune lunar');
  ok(e.podre.ba_a_kitsune_nirus === 1 && !e.podre.ba_a_kitsune, '(lote 183) a cauda podre da Nirus vai para a barra dela');
  ok(C.variante('nirus') === N && C.variante('kitsune') === C && /A Kitsune Nirus usa/.test(N.textoUso('', 0, { n: 'a' })), '(lote 183) as duas variantes');
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
    await P.locator('[data-ka]').check();
    await P.locator('[data-kok]').click(); await w(300);
    const cs = await E(() => TC.caudas.daFicha(S.personagens[0].estado));
    ok(cs[2].p && cs[2].p.y === 'Tengu' && cs[2].p.n === 'Asas do Vento' && cs[2].p.a, 'guardado na cauda 3, podre');
    ok(await E(() => S.personagens[0].estado.podre && S.personagens[0].estado.podre.ba_a_kitsune) === 1, '(lote 174) a barra Caudas fica com 1 podre');
    await P.locator('[data-kguardar]').click(); await w(200);
    ok(/Asas do Vento/.test(await P.locator('.kbibl').innerText()), '(lote 174) o poder já está na biblioteca');
    await P.locator('[data-kbib]').first().click(); await w(100);
    ok(await P.locator('[data-kn]').inputValue() === 'Asas do Vento' && await P.locator('[data-ka]').isChecked(), '(lote 174) puxar da biblioteca preenche o poder');
    await P.locator('[data-jcancela]').first().click(); await w(150);
    ok(/Asas do Vento/.test(await P.locator('#painelCaudas').innerText()), 'o cartão mostra o poder');
    await P.locator('[data-kusar="2"]').click(); await w(300);
    const d = await E(() => TC.caudas.daFicha(S.personagens[0].estado)[2]);
    ok(!d.p && !(await E(() => S.personagens[0].estado.podre)), 'usar: o poder sai, e a cauda deixa de estar podre');
    ok(/Dain usa Asas do Vento \(Tengu\), da cauda 3.*volta a servir/.test(await E(() => (document.querySelector('.toast') || {}).textContent || '')), 'o aviso conta o uso');
    if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.locator('#painelCaudas').screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', 'caudas.png') }); }
  });
  // (lote 183) a Nirus vê o painel verde dela, e não o da Kitsune lunar
  await passo('a Nirus', async () => {
    await E(() => { S.personagens[0].skills.arvores = ['a_kitsune_nirus']; render(); }); await w(300);
    ok(await P.locator('#painelCaudasNirus.knirus').isVisible() && !(await P.locator('#painelCaudas').count()), '(lote 183) a Nirus vê o painel dela (verde), não o da Kitsune lunar');
    await P.locator('#painelCaudasNirus [data-kguardar]').click(); await w(200);
    ok(/Pedaço da Vítima/.test(await P.locator('.modal, [role=dialog]').last().innerText().catch(() => '')) || /Pedaço da Vítima/.test(await E(() => document.body.innerText)), '(lote 183) a janela fala do Pedaço da Vítima');
    await P.locator('[data-ky]').fill('Urso-coruja'); await P.locator('[data-kn]').fill('Abraço'); await P.locator('[data-kok]').click(); await w(300);
    ok(await E(() => TC.caudas.nirus.daFicha(S.personagens[0].estado).some(c => c.p && c.p.n === 'Abraço')), '(lote 183) o pedaço fica nas caudas da Nirus');
    if (process.env.TC_SCRATCH) { const pa = require('path'); await P.locator('#painelCaudasNirus').screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', 'nirus.png') }); }
  });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
