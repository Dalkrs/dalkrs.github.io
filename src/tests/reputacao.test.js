// Lote 126: a reputação de cada personagem com cada facção do Mapa-múndi. A conta (TC.reputacao), o painel da ficha
// (sem mesa: as facções dos mapas deste navegador) e a recompensa das missões (tc/missoes.js).
// Uso: node src/tests/reputacao.test.js   (TC_SCRATCH=pasta guarda as fotos)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const RP = require('../../tc/reputacao.js');
const MI = require('../../tc/missoes.js');
const R = require('../../tc/rules.js');
const j = JSON.stringify;

/* ---------------- a conta ---------------- */
ok(j(RP.NIVEIS.map(n => n.n)) === j(['Venerado', 'Honrado', 'Amigo', 'Neutro', 'Hostil', 'Odiado']), 'os seis níveis');
ok(RP.nivel(-100).n === 'Odiado' && RP.nivel(-60).n === 'Odiado' && RP.nivel(-59).n === 'Hostil' && RP.nivel(0).n === 'Neutro' && RP.nivel(20).n === 'Amigo' && RP.nivel(60).n === 'Honrado' && RP.nivel(90).n === 'Venerado' && RP.nivel(500).n === 'Venerado', 'as faixas de −100 a +100');
const facs = [{ id: 'coroa', nome: 'Coroa' }, { id: 'tec', nome: 'Tecelões do destino', oculta: true }];
let r = RP.mudar({}, {}, { t: 'mais', f: 'coroa', d: 25 }, facs[0]);
ok(r.mudou && r.estado.rep.coroa.v === 25 && r.estado.rep.coroa.n === 'Coroa', '+25 com a Coroa: no estado (o jogador vê)');
ok(RP.mudar(r.estado, r.seg, { t: 'valor', f: 'coroa', v: 400 }, facs[0]).v === 100, 'não passa de +100');
let m = RP.linhas(r.estado, {}, facs, true);
ok(m.length === 2 && m[1].f === 'tec' && m[1].oc && m[1].v === 0, 'uma facção escondida no mapa começa escondida do jogador');
ok(j(RP.linhas(r.estado, null, [facs[0]], false).map(l => [l.f, l.v])) === j([['coroa', 25]]), 'o jogador vê só a Coroa');
r = RP.mudar(r.estado, r.seg, { t: 'esconder', f: 'coroa' }, facs[0]);
ok(!r.estado.rep && j(r.estado.repOc) === j(['coroa']) && r.seg.coroa.v === 25, 'esconder: o valor vai para o mestre, a ficha guarda só que está escondida');
ok(RP.linhas(r.estado, null, [facs[0]], false).length === 0, 'escondida: o jogador não vê');
r = RP.mudar(r.estado, r.seg, { t: 'mais', f: 'coroa', d: -10 }, facs[0]);
ok(r.seg.coroa.v === 15 && !r.estado.rep, 'mexer na escondida muda só o valor do mestre');
r = RP.mudar(r.estado, r.seg, { t: 'mostrar', f: 'coroa' }, facs[0]);
ok(r.estado.rep.coroa.v === 15 && !r.estado.repOc && !r.seg.coroa, 'mostrar: o valor volta para a ficha');
const fora = RP.mudar({}, null, { t: 'esconder', f: 'coroa', n: 'Coroa' }, null);
ok(fora.estado.rep.coroa && j(fora.estado.repOc) === j(['coroa']), 'fora da mesa (sem mestre): tudo fica no estado');
const mis = MI.missao({ t: 'X', rep: [{ f: 'coroa', n: 'Coroa', v: 15 }, { f: 'coroa', v: 3 }, { f: 'tec', v: 0 }, { f: 'mal feito!', v: 4 }] });
ok(j(mis.rep) === j([{ f: 'coroa', n: 'Coroa', v: 15 }]), 'a recompensa de reputação da missão (sem repetidas, sem zero)');
ok(!('rep' in MI.missao({ t: 'X' })), 'sem reputação, a missão não ganha o campo');

/* ---------------- a tela ---------------- */
const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', nome: 'Dain', estado: { rep: { coroa: { v: 30, n: 'Coroa' } } } });
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
const mapa = { id: 'mp_r', nome: 'Ilha', larg: 1000, alt: 800, faccoes: [{ id: 'coroa', nome: 'Coroa', cor: '#c0503a' }, { id: 'kits', nome: 'Corte lunar', cor: '#3f7fbf' }, { id: 'tec', nome: 'Tecelões', cor: '#8a5cc0', oculta: true }], objs: [] };
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'rep', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado, 'tinycats:mundo:v1': j({ atual: 'mp_r', mapas: { mp_r: mapa } }) } });
  const w = ms => P.waitForTimeout(ms), E = fn => P.evaluate(fn);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await passo('o painel', async () => {
    await P.locator('[data-abaficha="social"]').first().click(); await w(300);
    ok(await P.locator('#painelRep').isVisible(), 'a aba Social tem a Reputação com as facções');
    const linhas = await E(() => [...document.querySelectorAll('#painelRep .reprow')].map(r => r.dataset.rep + ':' + r.querySelector('.repnivel').textContent));
    ok(j(linhas) === j(['coroa:Amigo', 'kits:Neutro', 'tec:Neutro']), 'uma linha por facção do mapa (a Coroa em +30, Amigo): ' + j(linhas));
    await P.locator('[data-repstep="kits|-5"]').click(); await w(150);
    await P.locator('[data-repstep="kits|-5"]').click(); await w(150);
    ok(await E(() => S.personagens[0].estado.rep.kits.v) === -10 && await E(() => S.personagens[0].estado.rep.kits.n) === 'Corte lunar', '−5 duas vezes: −10 com a Corte lunar');
    await P.locator('[data-repval="tec"]').fill('-70'); await P.locator('[data-repval="tec"]').press('Enter'); await w(250);
    ok(await E(() => document.querySelector('[data-rep="tec"] .repnivel').textContent) === 'Odiado', 'escrever −70: Odiado');
    if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.locator('#painelRep').screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', 'rep-ficha.png') }); }
  });
  await passo('a missão', async () => {
    const { page: Q } = await t.device({ name: 'rep-mis', w: 1300, h: 900 });
    await Q.goto(t.base + 'missoes/?debug', { waitUntil: 'load' }); await Q.waitForTimeout(1000);
    await Q.evaluate(() => window.__mis.editar(null)); await Q.waitForTimeout(300);
    ok(/Reputação quando for cumprida/.test(await Q.locator('.form').innerText()) && /numa mesa/.test(await Q.locator('#fReps').innerText()), 'o editor da missão tem a reputação (fora da mesa: o aviso)');
  });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
