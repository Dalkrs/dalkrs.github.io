// Bateria do lote 30 nas Cenas (a página do site, sem mesa): as cenas da Sede do clã.
//   · os móveis novos (lareira, fornalha, estandarte, feno, cocho, escada) no catálogo; a lareira e a fornalha com fogo;
//   · pedir a sede cria a cena de fora (o terreno, os telhados, as paredes dos prédios, a Entrada de cada um, a muralha
//     cortada pelo portão, o poço, as plantas do jardim) e a de cada andar (o fundo pintado, as paredes, as portas e as
//     janelas, os móveis, a Saída de volta e as escadas entre os andares; a torre segue o contorno oitavado);
//   · pedir de novo atualiza: a janela antes; o que a Sede pôs troca, o resto fica (o token do mestre, a luz dele, a
//     névoa); o Desfazer volta as cenas e tira as novas;
//   · as cenas dos andares ficam dentro da de fora (a família), e um pedido que não vale não faz nada.
const { open } = require('./lib');
const path = require('path');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const S = require('../../../tc/sede.js');
(async () => {
  const t = await open({ w: 1360, h: 900, root: path.join(__dirname, '..', '..', '..'), file: 'cenas/index.html' });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 160);
  const j = JSON.stringify;
  const foto = async nome => { if (SHOTS) { require('fs').mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await w(500);

  // a sede: o Salão (nível 3: porão, térreo, 1º), a Forja e a Torre; a muralha com o portão, a estrada, o poço e o jardim
  const sede = S.sedeNova();
  sede.W = 44; sede.H = 32; sede.terreno = 'campo';
  const put = (tipo, nv, x, y, seed) => { const p = S.predioNovo(tipo, nv, seed); p.x = x; p.y = y; sede.predios.push(p); return p; };
  put('salao', 3, 13, 3, 11); put('forja', 2, 2, 4, 5); put('torre', 2, 30, 18, 8);
  sede.estruturas.push({ id: 'mu1', k: 'muralha', pts: [[1, 31], [43, 31]] }, { id: 'pt1', k: 'portao', x: 20, y: 30 }, { id: 'es1', k: 'estrada', pts: [[21.5, 31], [21.5, 16]] }, { id: 'po1', k: 'poco', x: 26, y: 18 }, { id: 'ja1', k: 'jardim', x: 8, y: 14, w: 5, h: 3 });
  const s = S.normSede(sede), [sal, forja, torre] = s.predios;
  const id = (pr, a) => S.cenaDoAndar('cl_teste', pr.id, a);
  const todas = [S.cenaDeFora('cl_teste')].concat(s.predios.flatMap(p => p.planta.andares.map(a => id(p, a.id))));

  await passo('os móveis novos', async () => {
    const m = await ev(() => ['lareira', 'fornalha', 'estandarte', 'feno', 'cocho', 'escada'].map(k => { const P = __tc.Props.P[k]; return P ? [P.n, P.size, !!P.fogo] : null; }));
    ok(j(m) === j([['Lareira', 2, true], ['Fornalha', 2, true], ['Estandarte', 1, false], ['Feno', 1, false], ['Cocho', 2, false], ['Escada', 1, false]]), 'os móveis da Casa do clã no catálogo das Cenas: ' + j(m));
    ok(await ev(() => Object.keys(window.TC.sede.MOVEIS).every(k => !!__tc.Props.P[k])), 'todo móvel da Sede existe nas Cenas');
  });

  await passo('criar', async () => {
    ok(await ev(() => __tc.SedeCenas.aplicar({ cla: 'x y', sede: {} })) === null, 'um pedido que não vale (o id do clã) não faz nada');
    const r = await ev(sd => __tc.SedeCenas.aplicar({ cla: 'cl_teste', nome: 'Lobos de Urgm', sede: sd, ir: 'fora' }), s);
    await w(600);
    ok(r && j(r.criadas.slice().sort()) === j(todas.slice().sort()) && !r.atualizadas.length, 'cria a cena de fora e a de cada andar: ' + (r ? r.criadas.length : 0) + ' de ' + todas.length);
    ok(await ev(() => __tc.Store.S.current) === S.cenaDeFora('cl_teste'), 'e abre a de fora');
    const fora = await ev(() => { const sc = __tc.Store.scene(); return { nome: sc.name, cols: sc.cols, rows: sc.rows, bg: !!sc.bg.asset, ent: sc.tokens.filter(t => t.prop === 'entrada').map(t => [t.name, t.cena, t.hidden]), poco: sc.tokens.filter(t => t.prop === 'poco').length, plantas: sc.tokens.filter(t => t.prop === 'flores' || t.prop === 'arbusto').length, portao: sc.walls.filter(w => w.k === 'door' && w.sede).length, muralha: sc.walls.filter(w => w.sede && w.k === 'wall' && w.y1 === 31 * sc.cell && w.y2 === 31 * sc.cell).map(w => [w.x1 / sc.cell, w.x2 / sc.cell]) }; });
    ok(fora.nome === 'Sede de Lobos de Urgm' && fora.cols === 44 && fora.rows === 32 && fora.bg, 'a cena de fora: o nome, o terreno inteiro e o fundo pintado');
    ok(fora.ent.length === 3 && fora.ent.every(([n0, c, hid]) => /^Entrada: /.test(n0) && /-t$/.test(c) && hid), 'uma Entrada (do mestre) na porta de cada prédio, levando ao térreo dele');
    ok(fora.poco === 1 && fora.plantas >= 3, 'o poço e as plantas do jardim');
    ok(fora.portao >= 4 && j(fora.muralha) === j([[1, 19.5], [23.5, 43]]), 'o portão (fechado) e a muralha cortada nele: ' + j(fora.muralha));
    await foto('l30-sede-fora');
  });

  await passo('os andares', async () => {
    const ter = await ev(i => { const sc = __tc.Store.S.scenes[i]; return { nome: sc.name, cols: sc.cols, bg: !!sc.bg.asset, sai: sc.tokens.filter(t => t.prop === 'saida').map(t => t.cena), esc: sc.tokens.filter(t => t.prop === 'escada').map(t => [t.cena, t.name, t.hidden]), moveis: sc.tokens.filter(t => t.sede && t.prop && !['saida', 'escada'].includes(t.prop)).length, portas: sc.walls.filter(w => w.k === 'door').length, janelas: sc.walls.filter(w => w.k === 'window').length, fogo: sc.tokens.some(t => t.prop === 'lareira' && t.light && t.light.on) }; }, id(sal, 't'));
    ok(ter.nome === 'Salão do clã — Térreo' && ter.cols === 18 + 4 && ter.bg, 'o térreo do Salão: o nome, o tamanho (com a margem) e o fundo');
    ok(j(ter.sai) === j([S.cenaDeFora('cl_teste')]), 'a Saída leva de volta à sede');
    ok(ter.esc.length === 2 && ter.esc.some(([c, n0]) => c === id(sal, '1') && /sobe: 1º andar/.test(n0)) && ter.esc.some(([c, n0]) => c === id(sal, 'p') && /desce: Porão/.test(n0)) && ter.esc.every(x => !x[2]), 'as escadas: uma sobe ao 1º andar, outra desce ao porão (à vista dos jogadores)');
    ok(ter.moveis >= 15 && ter.portas >= 5 && ter.janelas >= 3 && ter.fogo, 'os móveis (a lareira acesa), as portas e as janelas — ' + j(ter));
    const plano = S.plantaPronta('salao', 3, sal.seed).andares.find(a => a.id === 't');
    ok(ter.moveis === plano.moveis.length, 'os móveis são os da planta (a mesma conta da aba Clã)');
    const porao = await ev(i => { const sc = __tc.Store.S.scenes[i]; return { esc: sc.tokens.filter(t => t.prop === 'escada').map(t => t.cena), luzes: sc.lights.filter(l => l.sede).length }; }, id(sal, 'p'));
    ok(j(porao.esc) === j([id(sal, 't')]) && porao.luzes >= 1, 'o porão: a escada sobe ao térreo; e tem luz (é escuro)');
    const tor = await ev(i => { const sc = __tc.Store.S.scenes[i]; return sc.walls.filter(w => w.sede && w.x1 !== w.x2 && w.y1 !== w.y2).length; }, id(torre, 't'));
    ok(tor >= 4, 'a torre: as paredes de fora seguem o contorno oitavado (' + tor + ' em diagonal)');
    const familia = await ev(([f, l]) => l.every(i => __tc.Store.S.pastas && __tc.Store.S.pastas.mae[i] === f), [S.cenaDeFora('cl_teste'), todas.slice(1)]);
    ok(familia, 'as cenas dos andares ficam dentro da de fora');
    await ev(i => __tc.UI.switchScene(i), id(sal, 't')); await w(700);
    await foto('l30-sede-salao');
    await ev(i => __tc.UI.switchScene(i), id(torre, 't')); await w(700);
    await foto('l30-sede-torre');
  });

  await passo('atualizar', async () => {
    const f = S.cenaDeFora('cl_teste');
    await ev(i => __tc.UI.switchScene(i), f); await w(300);
    // o que o mestre pôs na cena de fora (fica)
    await ev(() => { const sc = __tc.Store.scene(), t = __tc.newToken(sc, 128, 128, { name: 'Sentinela' }); t.id = 'tk_sent'; sc.tokens.push(t); sc.lights.push({ id: 'lz_mestre', name: 'Lampião', x: 200, y: 200, bright: 2, dim: 4, c: '#ffcc88', on: true }); sc.fogOps.push({ t: 'revelar', x: 100, y: 100, r: 50 }); __tc.Persist.scene(sc.id); });
    // a sede muda: a Forja sai; o Salão vai para o nível 1 (sem porão nem 1º andar)
    const s2 = JSON.parse(JSON.stringify(s));
    s2.predios = s2.predios.filter(p => p.id !== forja.id);
    const sal2 = s2.predios.find(p => p.id === sal.id); sal2.nivel = 1; sal2.planta = S.plantaPronta('salao', 1, sal.seed);
    const pr = ev(sd => __tc.SedeCenas.aplicar({ cla: 'cl_teste', nome: 'Lobos de Urgm', sede: sd, ir: 'fora' }), s2);
    await w(400);
    const modal = await ev(() => (document.querySelector('.modal') || {}).innerText || '');
    ok(/Atualizar as cenas da Sede\?/.test(modal) && /Os tokens, a névoa, as luzes e o que você desenhou à mão ficam/.test(modal), 'pedir de novo: a janela diz o que muda e o que fica');
    ok(/cenas de prédios que saíram da sede ficam/.test(modal), 'e avisa das cenas que ficam (a Forja e os andares que saíram)');
    await page.locator('.modal .btn.primary', { hasText: 'Atualizar' }).click();
    const r = await pr; await w(600);
    ok(r && !r.criadas.length && r.atualizadas.length === 1 + 1 + torre.planta.andares.length, 'atualiza as cenas que continuam (a de fora, o térreo do Salão e os da Torre)');
    const fora = await ev(() => { const sc = __tc.Store.S.scenes['sede-cl_teste']; return { tk: !!sc.tokens.find(t => t.id === 'tk_sent'), lz: !!sc.lights.find(l => l.id === 'lz_mestre'), fog: sc.fogOps.length, ent: sc.tokens.filter(t => t.prop === 'entrada').length }; });
    ok(fora.tk && fora.lz && fora.fog === 1, 'o token, a luz e a névoa do mestre ficam');
    ok(fora.ent === 2, 'a Entrada da Forja sai (o prédio saiu da sede)');
    const ter = await ev(i => __tc.Store.S.scenes[i].tokens.filter(t => t.prop === 'escada').length, id(sal, 't'));
    ok(ter === 0, 'o térreo do Salão (nível 1) fica sem escadas');
    ok(await ev(i => !!__tc.Store.S.scenes[i], id(forja, 't')), 'a cena da Forja fica (o mestre apaga se quiser)');
    await page.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(400);
    const volta = await ev(([i, f]) => ({ esc: __tc.Store.S.scenes[i].tokens.filter(t => t.prop === 'escada').length, ent: __tc.Store.S.scenes[f].tokens.filter(t => t.prop === 'entrada').length }), [id(sal, 't'), f]);
    ok(volta.esc === 2 && volta.ent === 3, 'o Desfazer volta as cenas como estavam');
  });

  await passo('desfazer o que nasceu', async () => {
    const s3 = JSON.parse(JSON.stringify(s));
    const nova = S.predioNovo('estabulo', 1, 3); nova.x = 2; nova.y = 22; s3.predios.push(nova);
    const pr = ev(sd => __tc.SedeCenas.aplicar({ cla: 'cl_teste', nome: 'Lobos de Urgm', sede: sd, ir: 'fora' }), S.normSede(s3));
    await w(300);
    await page.locator('.modal .btn.primary', { hasText: 'Atualizar' }).click();
    const r = await pr; await w(400);
    const novaId = S.cenaDoAndar('cl_teste', nova.id, 't');
    ok(r && j(r.criadas) === j([novaId]) && await ev(i => !!__tc.Store.S.scenes[i], novaId), 'um prédio novo: a cena dele nasce');
    await page.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(400);
    ok(await ev(i => !__tc.Store.S.scenes[i] && !__tc.Store.S.order.includes(i), novaId), 'e o Desfazer a tira');
  });

  const errs = t.errs.filter(e => !/favicon/i.test(e));
  if (errs.length) console.log(errs.slice(0, 6).join('\n'));
  ok(errs.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
