// Bestiário, lote 29 (sem mesa): a página e as contas.
//   · as contas (tc/bestiario.js): os números pela regra das fichas (tier, level, onde os pontos caem), as barras pelas
//     fórmulas, a árvore distribuída pelas prioridades (o caminho, os graus, o exclusivo, a sobra), a dificuldade e o saque;
//   · a página: vazia, criar pela janela (o básico, os números com a prévia, a árvore com as prioridades, o comportamento,
//     o saque), a carta e a gaveta, a lista de nomes (abre e fecha), a busca e as tags, duplicar e apagar com Desfazer;
//   · a bandeja do encontro: o "+" da carta, − e +, limpar com Desfazer, guardar o encontro e trazer de volta.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
global.TC = { rules: R, dice: require('../../tc/dice.js') };
const B = require('../../tc/bestiario.js');
const j = JSON.stringify;
// ---------- as contas ----------
const e0 = B.novo('Goblin xamã', { ficha: { tier: 'C', level: 6, tiers: { FOR: 'D', DES: 'C', AGI: 'B', VIT: 'E', CAN: 'A' } } });
const c0 = B.contas(e0), pc = Object.assign(R.personagemPadrao('x'), { tier: 'C', level: 6, tiers: { FOR: 'D', DES: 'C', AGI: 'B', VIT: 'E', CAN: 'A' } }), cr = R.calcular(pc, R.cfgPadrao());
ok(c0.rolaveis.find(r => r[0] === 'CAN')[2] === cr.tot.CAN && c0.rolaveis.find(r => r[0] === 'FOR')[2] === cr.tot.FOR, 'os atributos são os de uma ficha com o mesmo tier, level e percentuais (CAN ' + cr.tot.CAN + ')');
ok(j(c0.barras.map(b => b.n + ':' + b.m)) === j(cr.recursos.map(r => r.nome + ':' + r.max)), 'as barras saem das fórmulas (HP e SP): ' + j(c0.barras.map(b => b.n + ':' + b.m)));
ok(B.contas(B.novo('x', { ficha: { ini: 'AGI/2', level: 5 } })).ini > 0 && B.contas(B.novo('y')).ini === 0, 'a iniciativa pela fórmula (vazia: 0)');
const bib = { pools: [{ id: 'p1', nome: 'Pontos', padrao: 5 }], usos: [{ id: 'at', nome: 'Ativa', sigla: 'At' }], arvores: [{ id: 'a1', nome: 'Feiticeiro', nodes: [
  { id: 'r', nome: 'Raiz', pais: [], graus: [{ custos: {} }] },
  { id: 'n1', nome: 'Raio', pais: ['r'], usos: ['at'], graus: [{ custos: { p1: 1 }, bonus: { CAN: 2 }, texto: 'Dano de raio.' }, { custos: { p1: 2 }, bonus: { CAN: 3 } }] },
  { id: 'n2', nome: 'Totem', pais: ['n1'], graus: [{ custos: { p1: 2 } }] },
  { id: 'n3', nome: 'Escudo', pais: ['r'], exclusivo: 'x', graus: [{ custos: { p1: 1 } }] },
  { id: 'n4', nome: 'Espada', pais: ['r'], exclusivo: 'x', graus: [{ custos: { p1: 1 } }] },
  { id: 'n5', nome: 'Ou', pais: ['n3', 'n1'], regra: 'ou', graus: [{ custos: { p1: 1 } }] }] }] };
const e1 = B.novo('Mago', { skills: { arvores: ['a1'], prioridade: ['n2', 'n4', 'n3'] } });
const d1 = B.distribuir(e1, bib);
ok(j(d1.alocados) === j({ r: 1, n1: 1, n2: 1, n4: 1 }) && d1.gastos.p1 === 4 && j(d1.faltou) === j(['Escudo']), 'a árvore: o caminho até o Totem (Raiz, Raio), a Espada, e o Escudo não cabe (exclusivo da Espada): ' + j(d1));
ok(j(B.distribuir(B.novo('m', { skills: { arvores: ['a1'], prioridade: ['n1'] } }), bib).alocados) === j({ r: 1, n1: 2 }), 'a prioridade sobe os graus enquanto der (Raio 2)');
ok(j(B.distribuir(B.novo('m', { skills: { arvores: ['a1'], prioridade: ['n5'] } }), bib).alocados) === j({ r: 1, n3: 1, n5: 1 }), 'a regra "ou": pega o caminho mais barato (Escudo, 1)');
ok(B.distribuir(B.novo('m', { skills: { arvores: [], prioridade: ['n1'] } }), bib).faltou.length === 0 && j(B.distribuir(B.novo('m', { skills: { arvores: [], prioridade: ['n1'] } }), bib).alocados) === '{}', 'árvore não equipada: nada');
const e2 = B.novo('m', { skills: { arvores: ['a1'], prioridade: ['n2'], sobra: true, pontos: { p1: 6 } } });
ok(j(B.distribuir(e2, bib).alocados) === j({ r: 1, n1: 1, n2: 1, n3: 1, n5: 1 }) || j(B.distribuir(e2, bib).alocados) === j({ r: 1, n1: 1, n2: 1, n4: 1, n5: 1 }), 'com a sobra (e 6 pontos escritos à mão): os mais baratos que já dá para pegar: ' + j(B.distribuir(e2, bib).alocados));
e1.skills.alocados = d1.alocados;
ok(B.contas(e1, null, bib).numeros.CAN === B.contas(B.novo('Mago'), null, bib).numeros.CAN + 2, 'o que a árvore soma entra nos números (Raio: CAN +2)');
ok(j(B.skills(e1, bib).map(s => s.nome + '|' + s.usos.join())) === j(['Raiz|', 'Raio|At', 'Totem|', 'Espada|']), 'o resumo das skills, com o uso');
const fraco = { tier: 'C', level: 5 }, dif = B.dificuldade([{ e: e0, n: 1 }], [fraco, fraco], R.cfgPadrao()), dif2 = B.dificuldade([{ e: e0, n: 4 }], [fraco, fraco], R.cfgPadrao());
ok(dif.k === 'facil' && dif2.k === 'mortal' && B.dificuldade([{ e: e0, n: 1 }], [], R.cfgPadrao()) === null, 'a dificuldade: um goblin contra dois é Fácil; quatro, Mortal; sem grupo, nada — ' + j([dif, dif2]));
const eq = B.novo('q', { saque: { itens: [{ nome: 'Cajado', chance: 25 }, { nome: 'Erva', chance: 70, qtd: '3' }], lapros: '10' } });
let k = 0; const seq = [0.1, 0.5];
const sq = B.rolarSaque(eq, () => seq[k++ % 2]);
ok(j(sq.itens.map(x => x.nome + ':' + x.qtd)) === j(['Cajado:1', 'Erva:3']) && sq.lapros === 10 && sq.rolagens.length === 3, 'o saque: 11 ≤ 25% (o Cajado cai), 51 ≤ 70% (3 Ervas), 10 lapros — ' + j(sq));
ok(B.rolarSaque(eq, () => 0.99).itens.length === 0, 'com 100 no d100, nada cai');
const n0 = B.normalizar({ nome: '  ', tags: ['a', 'A', 'b'], ficha: { tier: 'Z', level: 500, tiers: { FOR: 'Q' } }, saque: { itens: [{ chance: 900 }] }, img: 'javascript:alert(1)', tam: 7 });
ok(n0.nome === 'Inimigo sem nome' && j(n0.tags) === j(['a', 'b']) && n0.ficha.tier === 'C' && n0.ficha.level === 99 && n0.ficha.tiers.FOR === 'A' && n0.saque.itens[0].chance === 100 && n0.img === null && n0.tam === 1, 'normalizar: nome, tags repetidas, tier, level, percentuais, chance, imagem e tamanho');

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'best', w: 1400, h: 900 });
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.TC_SCRATCH) { const pa = require('path'); require('fs').mkdirSync(pa.join(process.env.TC_SCRATCH, 'fotos'), { recursive: true }); await P.screenshot({ path: pa.join(process.env.TC_SCRATCH, 'fotos', nome + '.png') }); } };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  const toasts = () => E(() => [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ '));
  await P.goto(t.base + 'bestiario/?debug', { waitUntil: 'load' }); await w(700);
  await passo('vazio', async () => {
    ok(await E(() => __best.pronto && !__best.naMesa) && /O Bestiário está vazio/.test(await P.locator('#meio').innerText()), 'fora de uma mesa, o Bestiário abre vazio, com o convite para criar');
  });
  await passo('criar', async () => {
    await P.locator('#btNovo').click(); await w(200);
    ok(await P.locator('dialog#dlg[open]').count() === 1 && await P.locator('#ed-nome').evaluate(x => x === document.activeElement), 'a janela de criar abre com o nome no foco');
    await P.locator('#ed-nome').fill('Goblin batedor');
    await P.locator('[data-edtag="Floresta"]').click(); await P.locator('[data-edtag="Humanoide"]').click(); await P.locator('[data-edtag="Lacaio"]').click();
    await P.locator('#ed-tag').fill('Tribo do Dente'); await P.locator('#ed-tag').press('Enter'); await w(100);
    ok(j(await E(() => __best.ed.e.tags)) === j(['Floresta', 'Humanoide', 'Lacaio', 'Tribo do Dente']), 'as tags: as prontas com um clique e a nova pelo campo');
    await P.locator('#ed-aba-numeros').click(); await w(150);
    await P.locator('#ed-level').fill('4'); await P.locator('#ed-level').press('Tab');
    await P.locator('#ed-t-DES').selectOption('A'); await P.locator('#ed-t-FOR').selectOption('C'); await w(150);
    await P.locator('#ed-d-DFF').fill('3'); await P.locator('#ed-d-DFF').press('Tab'); await w(150);
    const prev = await P.locator('#ed-num').innerText();
    ok(/DES \d+/.test(prev) && /DFF 3/.test(prev), 'os números aparecem enquanto muda (DES em A, DEF física 3): ' + prev);
    await P.locator('#ed-aba-comp').click(); await w(100);
    await P.locator('#ed-lembrete').fill('Flanqueia; foge com 25% de HP');
    await P.locator('#ed-comp').fill('Ataca em bando, sempre pelos lados.');
    await P.locator('#ed-aba-saque').click(); await w(100);
    await P.locator('#ed-sq-mais').click(); await w(100);
    await P.locator('#ed-sq-n-0').fill('Adaga enferrujada'); await P.locator('#ed-sq-n-0').press('Tab');
    await P.locator('#ed-sq-c-0').fill('30'); await P.locator('#ed-sq-c-0').press('Tab');
    await P.locator('#ed-lapros').fill('1d6'); await P.locator('#ed-lapros').press('Tab'); await w(100);
    await foto('l29-best-janela');
    await P.locator('#ed-salvar').click(); await w(300);
    const l = await E(() => __best.inimigos());
    ok(l.length === 1 && l[0].e.nome === 'Goblin batedor' && l[0].e.ficha.level === 4 && l[0].e.ficha.tiers.DES === 'A' && l[0].e.ficha.defesas.DFF === 3 && l[0].e.comp.lembrete === 'Flanqueia; foge com 25% de HP' && l[0].e.saque.itens[0].nome === 'Adaga enferrujada' && l[0].e.saque.itens[0].chance === 30 && l[0].e.saque.lapros === '1d6',
      'criado: o level, os percentuais, a defesa, o lembrete e o saque ficam guardados');
    ok(/Goblin batedor entrou no Bestiário/.test(await toasts()) && await P.locator('#gaveta').isVisible() && await P.locator('#g-nome').innerText() === 'Goblin batedor', 'o aviso, e a gaveta abre com ele');
    ok(await P.locator('.carta[data-best]').count() === 1 && /Tier C · Lvl 4/.test(await P.locator('.carta').innerText()), 'a carta, com o tier e o level');
  });
  await passo('mais inimigos', async () => {
    await E(() => {
      const B = __best.B, mk = (nome, extra) => __best.gravarDoc(B.PRE + B.uid(), B.novo(nome, extra));
      mk('Lobo das sombras', { tags: ['Floresta', 'Fera'], ficha: { tier: 'D', level: 3 } });
      mk('Esqueleto escudeiro', { tags: ['Masmorra', 'Morto-vivo', 'Tanque'], ficha: { tier: 'C', level: 5 } });
      mk('Dragão verde jovem', { tags: ['Floresta', 'Dragão', 'Chefe'], ficha: { tier: 'A', level: 18 } });
      __best.pintar();
    }); await w(200);
    ok(await P.locator('.carta').count() === 4 && await P.locator('#lista .li').count() === 4 && j(await P.locator('#lista .letra').allInnerTexts()) === j(['D', 'E', 'G', 'L']), 'quatro cartas, e a lista por letra (D, E, G, L)');
    await P.locator('#busca').fill('esquel'); await w(150);
    ok(await P.locator('.carta').count() === 1 && await P.locator('#lista .li').count() === 1, 'a busca filtra as cartas e a lista');
    await P.locator('#busca').fill(''); await w(100);
    await P.locator('#btTags').click(); await w(150);
    ok(await P.locator('#popTags').isVisible() && /Bioma \/ lugar/i.test(await P.locator('#popTags').innerText()) && /Tribo do Dente/.test(await P.locator('#popTags').innerText()), 'o painel das tags: os grupos prontos e a tag criada (em Outras)');
    await P.locator('#popTags [data-tag="Floresta"]').click(); await w(150);
    ok(await P.locator('.carta').count() === 3, 'Floresta: três');
    await P.locator('#popTags [data-tag="Chefe"]').click(); await w(150);
    ok(await P.locator('.carta').count() === 1 && /Dragão verde jovem/.test(await P.locator('.carta').innerText()) && /Tags \(2\)/.test(await P.locator('#btTags').innerText()), 'Floresta e Chefe: só o dragão (entre os grupos, todas)');
    await P.keyboard.press('Escape'); await w(100);
    await P.locator('#tagsel .btn', { hasText: 'Limpar' }).click(); await w(150);
    ok(await P.locator('.carta').count() === 4, '"Limpar" volta tudo');
    await P.locator('#btLista').click(); await w(100);
    ok(await P.locator('#lista').isHidden(), 'a lista de nomes fecha');
    await P.locator('#btLista').click(); await w(100);
  });
  await passo('encontro', async () => {
    const id = n => E(n => __best.inimigos().find(x => x.e.nome === n).id, n);
    const gob = await id('Goblin batedor'), lobo = await id('Lobo das sombras');
    await P.locator('.mais[data-mais="' + gob + '"]').click(); await P.locator('.mais[data-mais="' + gob + '"]').click(); await P.locator('.mais[data-mais="' + lobo + '"]').click(); await w(150);
        ok(/Encontro · 3/i.test(await P.locator('#bandeja').innerText()) && /×2/.test(await P.locator('.carta[data-best="' + gob + '"]').innerText()), 'a bandeja: 3 inimigos, e a carta mostra ×2');
    ok(/Dificuldade: —/.test(await P.locator('#enc-dif').innerText()), 'fora de uma mesa, sem grupo: a dificuldade fica em branco');
    await P.locator('[data-enc="' + gob + '"] button', { hasText: '−' }).click(); await w(100);
    ok(/Encontro · 2/i.test(await P.locator('#bandeja').innerText()), 'o − tira um');
    await P.locator('#enc-limpar').click(); await w(150);
    ok(await P.locator('#bandeja').isHidden() && /O encontro foi limpo/.test(await toasts()), 'Limpar: a bandeja some, com Desfazer');
    await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(150);
    ok(/Encontro · 2/i.test(await P.locator('#bandeja').innerText()), 'o Desfazer traz o encontro de volta');
    await foto('l29-best-encontro');
    await P.locator('#enc-guardar').click(); await w(150);
    await P.locator('#pt-txt').fill('Emboscada na trilha'); await P.locator('#pt-ok').click(); await w(200);
    await P.locator('#enc-limpar').click(); await w(150);
    await P.locator('#btEncontros').click(); await w(150);
    await P.locator('#menuEnc button', { hasText: 'Emboscada na trilha' }).click(); await w(200);
    ok(/Encontro · 2/i.test(await P.locator('#bandeja').innerText()), 'o encontro guardado volta para a bandeja pelo menu');
    await P.locator('#enc-puxar').click(); await w(200);
    ok(/abra o Bestiário pelo site/.test(await toasts()), 'fora do site, puxar para a cena explica onde funciona');
  });
  await passo('duplicar e apagar', async () => {
    // (a carta aberta fecha com outro clique; o nome na lista sempre abre)
    await P.locator('.carta', { hasText: 'Lobo das sombras' }).click(); await w(150);
    ok(await P.locator('#g-nome').innerText() === 'Lobo das sombras', 'um clique na carta abre a gaveta dela');
    await P.locator('.carta', { hasText: 'Lobo das sombras' }).click(); await w(150);
    ok(await P.locator('#gaveta').isHidden(), 'outro clique na mesma carta fecha');
    await P.locator('#lista .li', { hasText: 'Goblin batedor' }).click(); await w(150);
    await P.locator('#g-duplicar').click(); await w(200);
    ok(await P.locator('.carta').count() === 5 && await P.locator('#g-nome').innerText() === 'Goblin batedor (cópia)', 'duplicar: a cópia nasce aberta na gaveta');
    await P.locator('#g-apagar').click(); await w(200);
    ok(await P.locator('.carta').count() === 4 && /saiu do Bestiário/.test(await toasts()), 'apagar: sai, com Desfazer');
    await P.locator('#btDesfazer').click(); await w(200);
    ok(await P.locator('.carta').count() === 5, 'o Desfazer de cima traz de volta');
    await P.locator('#lista .li', { hasText: 'Goblin batedor (cópia)' }).click(); await w(150);
    await P.locator('#g-editar').click(); await w(150);
    await P.locator('#ed-nome').fill('Goblin arqueiro'); await P.locator('#ed-salvar').click(); await w(200);
    ok(await P.locator('#g-nome').innerText() === 'Goblin arqueiro', 'editar e guardar muda o nome');
    await foto('l29-best-gaveta');
  });
  await passo('recarregar', async () => {
    await P.reload({ waitUntil: 'load' }); await w(600);
    ok(await P.locator('.carta').count() === 5 && /Encontro · 2/i.test(await P.locator('#bandeja').innerText()), 'ao recarregar: os inimigos e o encontro ficam (neste navegador)');
  });
  // a árvore: a biblioteca das fichas deste navegador (as Fichas sem mesa guardam a biblioteca junto)
  const { page: Q } = await t.device({ name: 'best-arv', w: 1300, h: 900, seed: { urgm_calc_atributos_v1: j({ v: 1, cfg: R.cfgPadrao(), personagens: [], bib }) } });
  await passo('a árvore', async () => {
    await Q.goto(t.base + 'bestiario/?debug', { waitUntil: 'load' }); await Q.waitForTimeout(600);
    await Q.locator('#btNovo').click(); await Q.waitForTimeout(150);
    await Q.locator('#ed-nome').fill('Xamã');
    await Q.locator('#ed-aba-arvore').click(); await Q.waitForTimeout(150);
    ok(/Marque uma árvore/.test(await Q.locator('#dlg').innerText()), 'sem árvore marcada: o convite');
    await Q.locator('[data-arv="a1"]').check(); await Q.waitForTimeout(150);
    ok(await Q.locator('[data-no]').count() === 6 && /gasto 0 de 5/.test(await Q.locator('#dlg').innerText()), 'a árvore marcada mostra os nódulos e os pontos (0 de 5)');
    await Q.locator('[data-no="n2"]').click(); await Q.waitForTimeout(120);
    await Q.locator('[data-no="n4"]').click(); await Q.waitForTimeout(120);
    await Q.locator('[data-no="n3"]').click(); await Q.waitForTimeout(150);
    const pego = await Q.evaluate(() => [...document.querySelectorAll('[data-no]')].map(b => b.dataset.no + ':' + b.className.replace('no', '').trim()).join(' '));
    ok(pego === 'r:al n1:al n2:pri n3:pri n4:pri n5:' && /gasto 4 de 5/.test(await Q.locator('#dlg').innerText()) && /Não couberam .*: Escudo\./.test(await Q.locator('#ed-faltou').innerText()), 'as prioridades (★1 Totem, ★2 Espada, ★3 Escudo): o caminho pego em verde, e o Escudo não coube — ' + pego);
    await Q.locator('[data-no="n3"]').click(); await Q.waitForTimeout(120);
    ok(await Q.locator('#ed-faltou').count() === 0, 'tirar a prioridade do Escudo tira o aviso');
    await Q.locator('#ed-sobra').check(); await Q.waitForTimeout(150);
    ok(/gasto 5 de 5/.test(await Q.locator('#dlg').innerText()), 'a sobra gasta o último ponto');
    await Q.screenshot({ path: require('path').join(process.env.TC_SCRATCH || require('os').tmpdir(), 'fotos', 'l29-best-arvore.png') }).catch(() => {});
    await Q.locator('#ed-salvar').click(); await Q.waitForTimeout(250);
    const sk = await Q.locator('#g-skills').innerText();
    ok(/Raio/.test(sk) && /Dano de raio\./.test(sk) && /Totem/.test(sk) && /Espada/.test(sk) && /AT/i.test(sk), 'a gaveta mostra as skills pegas, com o texto e o uso — ' + sk.replace(/\n/g, ' | '));
    const id = await Q.evaluate(() => __best.sel);
    ok(await Q.evaluate(id => __best.contas(id).numeros.CAN, id) === B.contas(B.novo('x'), null, bib).numeros.CAN + 2, 'o Raio soma CAN +2 nos números do inimigo');
  });
  if (t.errs && t.errs.length) console.log(t.errs.slice(0, 5).join('\n'));
  await t.close();
  end();
})();
