// Lote 131: as aptidões (TC.aptidoes e a aba Aptidões da ficha, fora de uma mesa: quem usa mestra) e os lembretes do
// mestre (TC.lembretes, a checklist do dia).
// Uso: node src/tests/aptidoes.test.js   (TC_SCRATCH=pasta guarda as fotos)
const { start, checker } = require('./lib');
const { ok, end } = checker();
const A = require('../../tc/aptidoes.js');
const L = require('../../tc/lembretes.js');
const R = require('../../tc/rules.js');
const j = JSON.stringify;

/* ---------------- a conta ---------------- */
ok(A.conta('+15 -4') === 11 && A.conta('15') === 15 && A.conta('−3') === -3 && A.conta('+2+2') === 4 && A.conta('abc') === null && A.conta('') === null, 'a conta do XP: "+15 -4", "15", "−3"');
let r = A.mudar([], { t: 'nova', id: 'ap_r', n: ' Rastreio ', d: 'Seguir pegadas.', max: 10, teto: 3, tx: { 1: 'Rastro de 1 dia', 2: 'Rastro de 2 dias', 9: 'fora' } });
ok(r.mudou && r.a.n === 'Rastreio' && r.a.nv === 1 && r.a.xp === 0 && j(Object.keys(r.a.tx)) === j(['1', '2']), 'nova aptidão: nível 1, barra vazia, o texto de cada nível (até o máximo)');
ok(!A.mudar(r.lista, { t: 'nova', id: 'ap_r', n: 'X' }).mudou, 'não cria duas com o mesmo id');
r = A.mudar(r.lista, { t: 'xp', id: 'ap_r', d: 7 });
ok(r.a.xp === 7 && !r.pronta, '+7: 7 de 10');
r = A.mudar(r.lista, { t: 'xp', id: 'ap_r', d: 5 });
ok(r.a.xp === 12 && r.pronta && A.pronta(r.a), '+5: a barra encheu (o aviso)');
ok(!A.mudar(r.lista, { t: 'xp', id: 'ap_r', d: 1 }).pronta, 'já cheia: não avisa de novo');
r = A.mudar(r.lista, { t: 'subir', id: 'ap_r' });
ok(r.a.nv === 2 && r.a.xp === 2 && A.textoDoNivel(r.a) === 'Rastro de 2 dias', 'subir de nível: nível 2, o que passou (2) fica na barra');
ok(!A.mudar(r.lista, { t: 'subir', id: 'ap_r' }).mudou, 'sem a barra cheia, não sobe');
r = A.mudar(r.lista, { t: 'xp', id: 'ap_r', d: -50 });
ok(r.a.xp === 0, 'a barra não fica abaixo de zero');
r = A.mudar(r.lista, { t: 'editar', id: 'ap_r', nv: 3, xp: 40 });
ok(r.a.nv === 3 && A.noTeto(r.a) && !A.pronta(r.a) && A.fracao(r.a) === 1, 'no nível máximo: a barra fica cheia e não sobe mais');
r = A.mudar(r.lista, { t: 'nova', id: 'ap_s', n: 'Olho na sombra', oc: true });
ok(j(A.publica(r.lista)) === j([{ id: 'ap_r', n: 'Rastreio', d: 'Seguir pegadas.', nv: 3 }]), 'o jogador vê só as não secretas: nome, descrição e nível (sem barra, sem texto)');
ok(j(A.doJogador({ apt: [{ id: 'ap_r', n: 'Rastreio', nv: 3, xp: 99, tx: { 3: 'x' } }, { id: '!!', n: 'mal' }] })) === j([{ id: 'ap_r', n: 'Rastreio', d: '', nv: 3 }]), 'a lista do jogador é lida com cuidado');
r = A.mudar(r.lista, { t: 'tirar', id: 'ap_s' });
ok(r.lista.length === 1, 'tirar');

/* ---------------- os lembretes ---------------- */
ok(L.itensDe(null).length === 10 && L.itensDe(null).some(i => i.k === 'aptidoes') && L.itensDe(null).some(i => i.k === 'descanso'), 'a lista de costume (10 itens, dois com número)');
let d = L.marcar(null, '2026-11-10', 'fichas', true);
ok(j(L.feitosDe(d, '2026-11-10')) === j(['fichas']) && L.feitosDe(d, '2026-11-11').length === 0, 'as marcas valem para o dia');
d = L.comItens(d, [{ id: 'a1', t: '  Ligar o som  ', ir: 'cenas' }, { id: 'a2', t: '', ir: 'fichas' }, { id: 'a3', t: 'X', ir: 'site-mau' }]);
ok(j(L.itensDe(d)) === j([{ id: 'a1', t: 'Ligar o som', ir: 'cenas' }, { id: 'a3', t: 'X', ir: '' }]) && L.feitosDe(d, '2026-11-10').length === 0, 'a lista do mestre: sem vazios, atalho só para abas que existem; a marca de item que saiu some');
ok(L.itensDe(L.comItens(d, null)).length === 10, 'voltar à lista de costume');
const sg = { apt: { pc1: [{ id: 'a', n: 'A', xp: 10, max: 10 }, { id: 'b', n: 'B', xp: 1 }], pc2: [{ id: 'c', n: 'C', xp: 20, max: 5 }], morto: [{ id: 'd', n: 'D', xp: 99 }] } };
ok(L.contaAptidoes(sg, A, new Set(['pc1', 'pc2'])) === 2, 'conta as aptidões prontas (só de quem existe)');
ok(L.pendente({ k: 'aptidoes' }, { aptidoes: 2 }) === '2 aptidões prontas para subir' && L.pendente({ k: 'descanso' }, { descanso: false }) === '', 'o texto do pendente');
ok(L.deveAbrir(null, '2026-11-10') && !L.deveAbrir('2026-11-10', '2026-11-10') && L.deveAbrir('2026-11-09', '2026-11-10'), 'abre uma vez por dia');
ok(/^\d{4}-\d\d-\d\d$/.test(L.hoje()), 'o dia de hoje');

/* ---------------- a tela (fora da mesa: quem usa mestra) ---------------- */
const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', nome: 'Dain' });
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [] });
(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'apt', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => P.waitForTimeout(ms), E = fn => P.evaluate(fn);
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await passo('a aba', async () => {
    ok(await E(() => [...document.querySelectorAll('[data-abaficha]')].map(b => b.dataset.abaficha).join()) === 'atributos,bolsas,social,skills,aptidoes,notas', 'a aba Aptidões, depois das Skills');
    await P.locator('[data-abaficha="aptidoes"]').click(); await w(300);
    ok(await P.locator('#painelApt').isVisible() && /Nenhuma aptidão ainda/.test(await P.locator('#painelApt').innerText()), 'vazia: o convite para criar');
    await P.locator('[data-aptnova]').click(); await w(200);
    await P.locator('[data-aptn]').fill('Rastreio');
    await P.locator('[data-aptd]').fill('Seguir pegadas e sinais.');
    await P.locator('[data-aptmax]').fill('20');
    await P.locator('[data-aptteto]').fill('3'); await P.locator('[data-aptteto]').dispatchEvent('input'); await w(100);
    ok(await P.locator('[data-apttx]').count() === 3, 'um texto para cada nível (até o máximo)');
    await P.locator('[data-apttx="1"]').fill('Rastro de até 1 dia.');
    await P.locator('[data-aptok]').click(); await w(300);
    const ap = await E(() => S.personagens[0].estado.apt);
    ok(ap && ap.length === 1 && ap[0].n === 'Rastreio' && ap[0].max === 20 && ap[0].teto === 3 && ap[0].tx['1'] === 'Rastro de até 1 dia.', 'criada (fora da mesa, a lista inteira fica no estado)');
    const k = 'pc_dain|' + ap[0].id;
    await P.locator(`[data-aptxp="${k}|5"]`).click(); await w(150);
    await P.locator(`[data-aptconta="${k}"]`).fill('+15 -4'); await P.locator(`[data-aptconta="${k}"]`).press('Enter'); await w(250);
    ok(await E(() => S.personagens[0].estado.apt[0].xp) === 16, '+5 e "+15 -4": 16 de 20');
    await P.locator(`[data-aptconta="${k}"]`).fill('+4'); await P.locator(`[data-aptconta="${k}"]`).press('Enter'); await w(250);
    ok(/pode subir de nível/.test(await E(() => (document.querySelector('.toast') || {}).textContent || '')), 'barra cheia: o aviso');
    ok(await P.locator(`[data-aptsobe="${k}"]`).isVisible() && /▲1/.test(await P.locator('#abaficha-aptidoes').innerText()), 'o botão "Subir de nível" e o ▲ na aba');
    await P.locator(`[data-aptsobe="${k}"]`).click(); await w(250);
    ok(await E(() => S.personagens[0].estado.apt[0].nv) === 2 && await E(() => S.personagens[0].estado.apt[0].xp) === 0, 'subiu para o nível 2');
    if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.locator('#painelApt').screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', 'apt-ficha.png') }); }
  });
  await passo('a aba Mesa', async () => {
    await E(() => { S.aba = 'mesa'; save(); render(); }); await w(400);
    const tem = await E(() => !!document.querySelector('#aptMesa') && /Rastreio/.test(document.querySelector('#aptMesa').innerText));
    ok(tem, 'o quadro "Aptidões dos personagens" na aba Mesa');
    if (process.env.TC_SCRATCH) { const pa = require('path'); await P.locator('#aptMesa').screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', 'apt-mesa.png') }); }
  });
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });
