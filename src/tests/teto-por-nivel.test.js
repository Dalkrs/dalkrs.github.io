// (lote 50) O teto de pontos por nível das árvores (sem mesa):
//   · TC.rules: Raça e Classe sobem 3 por nível a partir do total do nível 1 (o "padrão" do tipo); os outros tipos, o
//     mestre distribui (sem teto); pool.porNivel muda (0 desliga); a conta é sobre o total que o personagem TEM;
//   · Fichas: no quadro de Ascensão, cada tipo mostra o teto do nível — abaixo (faltam), no teto, acima (o
//     extraordinário, em cor própria) ou "o mestre distribui"; mudar o nível ou o total muda a etiqueta; os cartões de
//     pontos da aba Skills mostram o teto só dos tipos que têm;
//   · Árvore: em Tipos de ponto, a coluna "Por nível" (3 em Raça e Classe, 0 nos outros; mudar grava porNivel); na
//     bolsa do personagem (com o nível vindo da ficha da mesa), a etiqueta do teto.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const j = JSON.stringify;
const R = require('../../tc/rules.js');

// ---------- as contas ----------
const raca = { id: 'pr', nome: 'Raça', padrao: 4 }, classe = { id: 'pc', nome: 'Classe', padrao: 6 }, escola = { id: 'pe', nome: 'Escola', padrao: 1 };
ok(R.POR_NIVEL_PADRAO === 3 && R.porNivelDoTipo(raca) === 3 && R.porNivelDoTipo(classe) === 3 && R.porNivelDoTipo({ nome: ' raça ' }) === 3 && R.porNivelDoTipo(escola) === 0 && R.porNivelDoTipo(null) === 0,
  'Raça e Classe sobem 3 por nível (pelo nome, sem acento nem maiúscula); Escola e o resto, 0');
ok(j([1, 7, 9, 10, 30].map(n => R.tetoDoTipo(raca, n))) === j([4, 22, 28, 31, 91]) && j([1, 9, 30].map(n => R.tetoDoTipo(classe, n))) === j([6, 30, 93]),
  'o teto: Raça 4, 22, 28, 31 e 91 nos níveis 1, 7, 9, 10 e 30; Classe 6, 30 e 93 nos níveis 1, 9 e 30');
ok(R.tetoDoTipo(escola, 9) === null && R.tetoDoTipo(Object.assign({}, raca, { porNivel: 0 }), 9) === null && R.tetoDoTipo(Object.assign({}, escola, { porNivel: 2 }), 4) === 7 && R.tetoDoTipo(Object.assign({}, raca, { porNivel: '5' }), 3) === 14,
  'porNivel manda: 0 tira o teto da Raça; 2 dá teto à Escola (1 + 2×3 = 7 no nível 4); "5" (texto) vale 5');
ok(R.tetoDoTipo(raca, 0) === 4 && R.tetoDoTipo(raca, null) === 4 && R.tetoDoTipo(raca, '9') === 28 && R.tetoDoTipo({ nome: 'Raça' }, 3) === 6, 'nível vazio ou 0 conta como 1; o nível em texto vale; sem padrão, 0 no nível 1');
const c1 = R.contaDoTeto(raca, 27, 9), c2 = R.contaDoTeto(raca, 28, 9), c3 = R.contaDoTeto(raca, 31, 9), c4 = R.contaDoTeto(escola, 10, 9), c5 = R.contaDoTeto(raca, 25, 9);
ok(c1.estado === 'abaixo' && c1.d === -1 && c1.txt === '27 de 28 · falta 1' && c5.txt === '25 de 28 · faltam 3' && /Falta 1 ponto para chegar ao teto/.test(c1.dica), 'abaixo do teto: "27 de 28 · falta 1", "25 de 28 · faltam 3"');
ok(c2.estado === 'no' && c2.txt === '28 de 28 · no teto' && /teto do nível 9: 28 \(4 no nível 1, \+3 por nível\)\. Está no teto\./.test(c2.dica), 'no teto: "28 de 28 · no teto", e a dica explica a conta');
ok(c3.estado === 'acima' && c3.d === 3 && c3.txt === '31 · teto 28 · +3 extraordinário' && /3 pontos acima do teto: o extraordinário/.test(c3.dica), 'acima: "31 · teto 28 · +3 extraordinário"');
ok(c4.estado === 'mestre' && c4.teto === null && c4.txt === 'o mestre distribui', 'sem teto: "o mestre distribui"');

// ---------- as Fichas ----------
const no = (id, pool) => ({ id, nome: 'Nó ' + id, pais: [], usos: [], tipo: 'pequeno', graus: [{ custos: { [pool]: 2 }, texto: 'x' }] });
const bib = { nome: 'Teste', pools: [raca, classe, escola], naturezas: [], usos: [], tipos: { pequeno: { nome: 'Pequeno', custo: 1 } },
  arvores: [{ id: 'a1', nome: 'Kitsune Selene', categoria: 'raca', nodes: [no('n1', 'pr')] }, { id: 'a2', nome: 'Samurai', categoria: 'classe', nodes: [no('n2', 'pc')] }, { id: 'a3', nome: 'Yanato', categoria: 'escola', nodes: [no('n3', 'pe')] }] };
const pc = Object.assign(R.personagemPadrao('Dain'), { id: 'pc_dain', level: 9, modoAtr: 'livre', atrLivre: { FOR: 10, DES: 10, VIT: 10, CAN: 10, AGI: 10 },
  skills: { arvores: ['a1', 'a2', 'a3'], pontos: { pr: 31, pc: 30, pe: 7 }, alocados: { n1: 1 } } });
const estado = JSON.stringify({ v: 1, cfg: R.cfgPadrao(), personagens: [pc], situacoes: [], tabelas: [], log: [], bib, sel: 'pc_dain', selSit: null, aba: 'fichas', grupos: [], skillsUI: { equipar: false, distribuir: true } });

(async () => {
  const t = await start();
  const passo = async (P, nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const { page: F } = await t.device({ name: 'fichas-teto', w: 1320, h: 900, seed: { urgm_calc_atributos_v1: estado } });
  const w = ms => F.waitForTimeout(ms);
  const teto = async id => { const l = F.locator('#painelAsc [data-teto="' + id + '"]'); return (await l.count()) ? { txt: (await l.innerText()).trim(), cls: await l.getAttribute('class'), dica: await l.getAttribute('title') } : null; };
  await F.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await passo(F, 'o quadro de Ascensão', async () => {
    await F.locator('#ficha [data-abaficha="skills"]').click(); await w(300);
    const r = await teto('pr'), c = await teto('pc'), e = await teto('pe');
    ok(r && r.txt === '31 · teto 28 · +3 extraordinário' && /\bextra\b/.test(r.cls) && /teto do nível 9: 28/.test(r.dica), 'Raça no nível 9: 31 pontos, teto 28 → "+3 extraordinário", na cor do extraordinário — ' + j(r));
    ok(c && c.txt === '30 de 30 · no teto' && /\bcerto\b/.test(c.cls), 'Classe: 30 de 30, no teto (a cor de "certo") — ' + j(c));
    ok(e && e.txt === 'o mestre distribui' && /\bmestre\b/.test(e.cls), 'Escola: "o mestre distribui", sem teto — ' + j(e));
    ok((await F.locator('#painelAsc [data-asc="pr"] .ascconta').innerText()).replace(/\s+/g, ' ') === '2 gastos · 29 livres', 'a conta de gastos e livres continua a mesma, ao lado');
    await F.locator('[data-ascstep="pc|-1"]').click(); await w(300);
    const c2 = await teto('pc');
    ok(c2 && c2.txt === '29 de 30 · falta 1' && /\bfalta\b/.test(c2.cls), 'tirar um ponto de Classe: "29 de 30 · falta 1" (a cor de "falta") — ' + j(c2));
    const css = await F.evaluate(() => { const g = s => getComputedStyle(document.querySelector(s)).color; return { extra: g('#painelAsc [data-teto="pr"]'), falta: g('#painelAsc [data-teto="pc"]'), roxo: getComputedStyle(document.documentElement).getPropertyValue('--roxo').trim() }; });
    ok(css.extra !== css.falta, 'o extraordinário tem cor própria (não é a de "falta" nem a de erro) — ' + j(css));
  });
  await passo(F, 'o nível muda o teto', async () => {
    await F.evaluate(() => { const p = S.personagens[0]; p.level = 11; save(); render(); }); await w(400);
    const r = await teto('pr');
    ok(r && r.txt === '31 de 34 · faltam 3', 'no nível 11 o teto da Raça é 34: "31 de 34 · faltam 3" — ' + j(r));
  });
  await passo(F, 'os cartões da aba Skills', async () => {
    const cart = await F.evaluate(() => [...document.querySelectorAll('.poolbar .poolcard')].map(c => { const tt = c.querySelector('.ascteto'); return [c.querySelector('.poolnome').textContent, tt ? tt.textContent.trim() : null]; }));
    ok(j(cart) === j([['Raça', '31 de 34 · faltam 3'], ['Classe', '29 de 36 · faltam 7'], ['Escola', null]]), 'os cartões de pontos mostram o teto de Raça e Classe, e a Escola fica sem — ' + j(cart));
  });

  // ---------- a Árvore ----------
  const docArv = JSON.stringify({ formato: 'urgm-skilltree-doc', versao: 4,
    biblioteca: Object.assign({}, bib, { tipos: { pequeno: { nome: 'Pequeno', raio: 10, custo: 1, forma: 'circulo' }, notavel: { nome: 'Notável', raio: 18, custo: 2, forma: 'circulo' }, keystone: { nome: 'Keystone', raio: 27, custo: 4, forma: 'hexagono' } },
      arvores: bib.arvores.map(a => Object.assign({ secreta: false, senha: '' }, a, { nodes: a.nodes.map(n => Object.assign({ regra: 'e', tipo: 'pequeno', forma: 'circulo', glifo: '', cor: '', natureza: '', desc: '', exclusivo: '', escola: null }, n)) })), cofres: [] }),
    personagens: [{ id: 'c_dain', nome: 'Dain', arvores: ['a1', 'a2', 'a3'], arvoreAtual: 'a1', pontos: { pr: 27, pc: 30, pe: 7 }, alocados: {}, ordemLivre: true }] });
  const { page: A } = await t.device({ name: 'arvore-teto', w: 1400, h: 900, seed: { 'urgm.arvore.v4': docArv, 'urgm.arvore.ui.v4': JSON.stringify({ modo: 'mestre', tema: 'pedra', arvoreMestre: 'a1' }) } });
  await A.goto(t.base + 'arvore/', { waitUntil: 'load' }); await A.waitForTimeout(900);
  await passo(A, 'Tipos de ponto', async () => {
    await A.evaluate(() => { ui.abertos = Object.assign(ui.abertos || {}, { pools: true }); pintarPainel(); }); await A.waitForTimeout(250);
    const v = await A.evaluate(() => [...document.querySelectorAll('.lista-ed.pool')].map(r => [r.querySelector('.pool-nome').value, r.querySelector('.pool-padrao').value, r.querySelector('.pool-nivel').value]));
    ok(j(v) === j([['Raça', '4', '3'], ['Classe', '6', '3'], ['Escola', '1', '0']]), 'a coluna "Por nível": 3 em Raça e Classe, 0 na Escola — ' + j(v));
    ok(/Nível 1 \+ Por nível × \(N − 1\)/.test(await A.locator('details[data-chave="pools"] .nota').first().innerText()), 'a nota explica a conta do teto');
    await A.locator('.lista-ed.pool[data-id="pe"] .pool-nivel').fill('2'); await A.locator('.lista-ed.pool[data-id="pe"] .pool-nivel').press('Tab'); await A.waitForTimeout(250);
    await A.locator('.lista-ed.pool[data-id="pr"] .pool-nivel').fill('0'); await A.locator('.lista-ed.pool[data-id="pr"] .pool-nivel').press('Tab'); await A.waitForTimeout(250);
    const p = await A.evaluate(() => bib().pools.map(x => [x.id, 'porNivel' in x ? x.porNivel : 'sem']));
    ok(j(p) === j([['pr', 0], ['pc', 'sem'], ['pe', 2]]), 'mudar grava porNivel (Escola 2, Raça 0); a Classe, sem mexer, fica sem o campo — ' + j(p));
    await A.locator('.lista-ed.pool[data-id="pr"] .pool-nivel').fill('3'); await A.locator('.lista-ed.pool[data-id="pr"] .pool-nivel').press('Tab'); await A.waitForTimeout(250);
  });
  await passo(A, 'a bolsa do personagem', async () => {
    await A.evaluate(() => { ui.modo = 'jogador'; ui.personagem = 'c_dain'; pintarTudo(); }); await A.waitForTimeout(300);
    ok(await A.locator('.bolsa-teto').count() === 0, 'sem mesa (sem o nível da ficha), a bolsa não mostra teto');
    await A.evaluate(() => { ArvoreMesa.ativo = () => true; ArvoreMesa.nivelDe = () => 9; pintarPainel(); }); await A.waitForTimeout(300);
    const b = await A.evaluate(() => [...document.querySelectorAll('.bolsa-teto')].map(e => [e.dataset.teto, e.className.replace('bolsa-teto', '').trim(), e.textContent.trim()]));
    ok(j(b) === j([['pr', 'abaixo', '27 de 28 · falta 1'], ['pc', 'no', '30 de 30 · no teto'], ['pe', 'abaixo', '7 de 17 · faltam 10']]), 'com o nível 9 da ficha: Raça "27 de 28 · falta 1", Classe no teto, e a Escola (agora com 2 por nível) "7 de 17 · faltam 10" — ' + j(b));
    await A.locator('#tot_pr').fill('30'); await A.locator('#tot_pr').press('Tab'); await A.waitForTimeout(300);
    const r = await A.evaluate(() => { const e = document.querySelector('.bolsa-teto[data-teto="pr"]'); return [e.className, e.textContent.trim(), getComputedStyle(e).color]; });
    ok(/acima/.test(r[0]) && r[1] === '30 · teto 28 · +2 extraordinário', 'dar mais que o teto: "+2 extraordinário" — ' + j(r));
    await foto(A, 'arvore-teto');
  });
  await foto(F, 'fichas-teto');

  if (t.errs.length) console.log(t.errs.slice(0, 10).join('\n'));
  ok(t.errs.length === 0, 'sem erros no console');
  await t.close();
  end();
})().catch(e => { console.error(e); process.exit(1); });

async function foto(P, nome) { if (process.env.TC_FOTOS) await P.screenshot({ path: require('path').join(process.env.TC_FOTOS, nome + '.png'), fullPage: false }); }
