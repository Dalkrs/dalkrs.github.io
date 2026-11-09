// Lote 89: a regra dos equipamentos (as faixas F1–F4, o material Q1–Q3 e a melhoria +1 a +5), sem mesa:
//   · as regras (tc/rules.js): a faixa pelo nível, a peça do item, o valor da faixa, "Melhorar", o ajuste de um item e o
//     da ficha (com a armadura e a bota que faltam);
//   · na ficha: a etiqueta "F2 · Q2 · +3" ao lado do nome; no "Editar", o bloco Regra (peça, faixa, material, melhoria,
//     "Melhorar +1", o aviso do número da faixa e "Usar o valor da faixa"), tudo com Desfazer;
//   · "Ajustar equipamentos à regra…" no ⋯: a lista por personagem, desmarcar, Aplicar e Desfazer.
const { start, checker } = require('./lib');
const R = require('../../tc/rules.js');
const { ok, end } = checker();
const j = JSON.stringify;
const zero = { FOR: 0, DES: 0, VIT: 0, CAN: 0, AGI: 0 };
const it = (id, nome, o) => Object.assign({ id, nome, equipado: true, bonus: Object.assign({}, zero) }, o);
const pc = (id, nome, level, itens) => ({ id, nome, raca: 'Kitsune', lado: 'Aliado', grupo: '', tags: [], tier: 'C', level, tiers: { FOR: 'E', DES: 'C', AGI: 'B', VIT: 'D', CAN: 'A' }, pctProprio: null, poderes: [],
  skills: { arvores: [], pontos: {}, alocados: {} }, defesas: { DFF: 3, DFM: 6 }, rol: { fixa: 0, fonte: 'total' }, ultRol: null, disputa: { atrA: 'FOR', alvoId: '', atrB: 'FOR', fixaB: 0, valorB: 40 },
  estaque: { a: '', b: '' }, habilidades: [], itens, recursos: [{ id: 'hp', nome: 'HP', fml: '100' }], notas: '' });

// 1) as regras, sem tela
ok(j([1, 5, 6, 10, 11, 20, 21, 30].map(R.faixaDoNivel)) === j([1, 1, 2, 2, 3, 3, 4, 4]), 'a faixa pelo nível: 1–5, 6–10, 11–20, 21–30');
ok(R.pecaDoItem({ nome: 'Espada', bonus: { FOR: 14 } }) === 'arma' && R.pecaDoItem({ nome: 'Bota de couro', bonus: { ESQ: 10 } }) === 'bota' && R.pecaDoItem({ nome: 'Couraça', bonus: { DFF: 9, DFM: 9 } }) === 'armadura'
  && R.pecaDoItem({ nome: 'Broquel', tipo: 'escudo', bonus: { BLQ: 10 } }) === 'escudo' && R.pecaDoItem({ nome: 'Anel', bonus: { CAN: 2 } }) === 'acessorio', 'a peça pelo tipo, pelo nome e pelos números');
ok(R.valorDaFaixa(2, 'arma', 0) === 14 && R.valorDaFaixa(2, 'arma', 3) === 17 && R.valorDaFaixa(3, 'arma', 2) === 26 && R.valorDaFaixa(1, 'armadura', 0) === 18, 'o valor da faixa: F2 arma 14 (+3 = 17); F3 sobe de 2 em 2; a armadura F1 tem 18 no total');
ok(j([1, 2, 3, 4].map(f => [R.valorDaFaixa(f, 'armadura', 0), R.tetoArmadura(f, 0)])) === j([[18, 12], [26, 17], [40, 27], [56, 37]]), 'a armadura: o total para repartir e o teto de 2/3 num lado');
ok(R.valorDaFaixa(1, 'armadura', 2) === 20 && R.valorDaFaixa(3, 'armadura', 1) === 42, 'cada melhoria soma o passo no total (F1 +1, F3 +2)');
let ar = R.itemNaRegra({ nome: 'Couraça', bonus: { DFF: 12, DFM: 6 } }, 3);
ok(ar.valor === 18 && ar.estado === 'no' && !ar.ladoAcima, 'uma armadura F1 12 + 6: no valor, dentro do teto');
ar = R.itemNaRegra({ nome: 'Couraça', bonus: { DFF: 15, DFM: 3 } }, 3);
ok(ar.estado === 'no' && ar.ladoAcima, '15 + 3: o total certo, mas um lado passa do teto (12)');
ok(j(R.melhorarItem({ nome: 'Couraça', faixa: 1, mat: 1, bonus: { DFF: 12, DFM: 6 } }, 3).it.bonus) === j({ DFF: 12, DFM: 7 }), 'Melhorar a armadura: +1 no lado mais baixo');
const mal = R.ajusteDoItem({ nome: 'Malha', bonus: { DFF: 10, DFM: 10 } }, 8);
ok(mal.it.bonus.DFF === 13 && mal.it.bonus.DFM === 13, 'abaixo: a armadura sobe até 26 no total, repartida como estava (13 + 13)');
ok(j(R.ajusteDoItem({ nome: 'Armadura de Kitsune', tipo: 'armadura', bonus: { DFF: 9, DFM: 17 } }, 9).muda) === j(['faixa F2']), '9 + 17 na F2 já está no total (26) e no teto (17): só ganha a faixa');
ok(j(R.repartirArmadura(0, 0, 40, 27)) === j({ DFF: 20, DFM: 20 }) && j(R.repartirArmadura(20, 2, 18, 12)) === j({ DFF: 12, DFM: 6 }), 'repartir: meio a meio sem nada; na proporção, sem passar do teto');
ok(j([1, 2, 3, 4].map(R.elemDaFaixa)) === j([{ max: 3, n: 1 }, { max: 4, n: 1 }, { max: 7, n: 2 }, { max: 10, n: 3 }]), 'o elemento da arma (sugestão): até 3, 4, 7 e 10, em 1, 1, 2 e 3 elementos');
const el = R.itemNaRegra({ nome: 'Espada', bonus: { FOR: 10 }, dano: { FOGO: 3, GELO: 1 } }, 3).elem;
ok(el.soma === 4 && el.acima && j(el.chaves) === j(['FOGO', 'GELO']), 'Fogo 3 + Gelo 1 na F1: acima da sugestão (só aviso)');
ok(R.ELEM_DANO.length === 10 && R.ELEM_DANO.includes('PSI') && !R.ELEM_DANO.includes('CORTE'), 'os tipos: os nove elementos e o psicológico');
const esp = { id: 'e', nome: 'Espada', faixa: 2, mat: 1, bonus: { FOR: 14 } };
let m = R.melhorarItem(esp, 8);
ok(m.ok && m.it.melhoria === 1 && m.it.bonus.FOR === 15 && esp.bonus.FOR === 14, 'Melhorar: +1 e FOR 14 → 15 (sem mexer no item de antes)');
m = R.melhorarItem(R.melhorarItem(m.it, 8).it, 8);
ok(!m.ok && /Q1/.test(m.erro), 'o Q1 para no +2: ' + (m.erro || ''));
ok(!R.melhorarItem({ nome: 'Espada', faixa: 2, bonus: { FOR: 14 } }, 8).ok, 'sem material, não melhora');
const aj = R.ajusteDoItem({ id: 'a', nome: 'Lâmina antiga', bonus: { FOR: 18 } }, 8);
ok(aj.it.faixa === 2 && aj.it.melhoria === 4 && aj.it.mat === 2 && aj.it.bonus.FOR === 18, 'acima da faixa: fica com o número e ganha a melhoria (+4) e o material (Q2) — ' + j(aj.muda));
const ab = R.ajusteDoItem({ id: 'b', nome: 'Faca', bonus: { DES: 9 } }, 8);
ok(ab.it.bonus.DES === 14 && ab.it.faixa === 2, 'abaixo da faixa: sobe até o valor (DES 9 → 14)');
const fi = R.ajusteDaFicha({ level: 12, itens: [{ id: 'x', nome: 'Cajado', equipado: true, bonus: { CAN: 17 } }] });
ok(fi.some(a => a.novo && a.peca === 'armadura') && fi.some(a => a.novo && a.peca === 'bota') && fi.find(a => a.id === 'x').it.bonus.CAN === 22, 'a ficha: o Cajado sobe à F3 (22) e entram a armadura e a bota que faltam');
ok(R.textoEtiquetas({ faixa: 2, mat: 2, melhoria: 3 }) === 'F2 · Q2 · +3' && R.textoEtiquetas({}) === '', 'a etiqueta: "F2 · Q2 · +3"');

// 2) na tela
const ITENS = [it('es', 'Espada longa', { bonus: Object.assign({}, zero, { FOR: 14 }), faixa: 2, mat: 2, melhoria: 1 }),
  it('co', 'Couraça', { bonus: Object.assign({}, zero, { DFF: 9, DFM: 9 }) })];
const estado = j({ v: 1, cfg: R.cfgPadrao(), personagens: [pc('pc_d', 'Dain', 8, ITENS), pc('pc_o', 'Oria', 12, [it('ca', 'Cajado', { bonus: Object.assign({}, zero, { CAN: 17 }) })])],
  situacoes: [], tabelas: [], log: [], bib: null, sel: 'pc_d', selSit: null, aba: 'fichas', grupos: [] });

(async () => {
  const t = await start();
  const { page: P } = await t.device({ name: 'fichas89', w: 1320, h: 960, seed: { urgm_calc_atributos_v1: estado } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const foto = async (nome, sel) => { if (process.env.FOTOS) { if (sel) await P.locator(sel).first().screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); else await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); } };
  const S0 = (fn, a) => P.evaluate(fn, a);
  const item = (pid, id) => S0(([p, i]) => JSON.parse(JSON.stringify(S.personagens.find(x => x.id === p).itens.find(x => x.id === i) || null)), [pid, id]);
  const desfazer = async () => { await P.locator('.toast button', { hasText: 'Desfazer' }).last().click(); await w(350); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n').slice(0,12).join(' / ')); } };

  await P.goto(t.base + 'fichas/', { waitUntil: 'load' }); await w(1200);
  await P.locator('[data-abaficha="bolsas"]').click(); await w(250);

  await passo('a etiqueta', async () => {
    ok((await P.locator('[data-itcard="es"] .itetq').innerText()) === 'F2 · Q2 · +1', 'a etiqueta ao lado do nome: "F2 · Q2 · +1"');
    ok(await P.locator('[data-itcard="co"] .itetq').count() === 0, 'sem etiquetas, nada aparece');
  });

  await passo('o bloco Regra', async () => {
    await P.locator('[data-itemed="es"]').click(); await w(250);
    ok(await P.locator('[data-itcard="es"] .itregra').count() === 1, 'o "Editar" mostra o bloco Regra');
    const av = await P.locator('[data-itcard="es"] .itregaviso').first().innerText();
    ok(/A F2 pede 15 \(com \+1\) em FOR\. Este item: 14, abaixo\./.test(av), 'o aviso: ' + av);
    await foto('l89-regra', '[data-itcard="es"]');
    await P.locator('[data-itregusar="es"]').click(); await w(300);
    ok((await item('pc_d', 'es')).bonus.FOR === 15, '"Usar o valor da faixa": FOR 15');
    await desfazer();
    ok((await item('pc_d', 'es')).bonus.FOR === 14, 'Desfazer volta o 14');
    await P.locator('[data-itregmais="es"]').click(); await w(300);
    let x = await item('pc_d', 'es');
    ok(x.melhoria === 2 && x.bonus.FOR === 15, 'Melhorar +1: +2 e FOR 15');
    ok(/F2 · Q2 · \+2/.test(await P.locator('[data-itcard="es"] .itetq').innerText()), 'a etiqueta acompanha');
    await desfazer();
    x = await item('pc_d', 'es');
    ok(x.melhoria === 1 && x.bonus.FOR === 14, 'Desfazer volta o +1 e o 14');
    if (await P.locator('[data-itregmat="es"]').count() === 0) await P.locator('[data-itemed="es"]').click(), await w(250);
    await P.selectOption('[data-itregmat="es"]', '1'); await w(300);
    ok((await item('pc_d', 'es')).mat === 1, 'o material muda para Q1');
    await P.selectOption('[data-itregmelh="es"]', '2'); await w(300);
    ok(await P.locator('[data-itregmais="es"]').isDisabled(), 'no limite do Q1 (+2), "Melhorar +1" fica apagado');
    await desfazer();
    x = await item('pc_d', 'es');
    ok(x.mat === 1 && x.melhoria === 1, 'Desfazer volta a melhoria (o material fica Q1)');
    // (lote 121) quem joga também acerta a faixa, o material e a melhoria da peça dele; a peça e o dano, só o mestre
    await S0(() => { window.__fm = [FichasMesa.ativo, FichasMesa.mestre, FichasMesa.podeEditar]; FichasMesa.ativo = () => true; FichasMesa.mestre = () => false; FichasMesa.podeEditar = () => true; render(); });
    await w(250);
    if (await P.locator('[data-itregmat="es"]').count() === 0) await P.locator('[data-itemed="es"]').click(), await w(250);
    ok(await P.locator('[data-itregfaixa="es"]').count() === 1 && await P.locator('[data-itregmat="es"]').count() === 1 && await P.locator('[data-itregmelh="es"]').count() === 1, 'o jogador vê a faixa, o material e a melhoria');
    ok(await P.locator('[data-itregpeca="es"]').count() === 0 && await P.locator('[data-itregdano="es"]').count() === 0, '(a peça e o "Dano rola" ficam com o mestre)');
    await P.selectOption('[data-itregmelh="es"]', '2'); await w(300);
    ok((await item('pc_d', 'es')).melhoria === 2, 'o jogador muda a melhoria');
    await desfazer();
    await S0(() => { [FichasMesa.ativo, FichasMesa.mestre, FichasMesa.podeEditar] = window.__fm; render(); }); await w(250);
  });

  await passo('o elemento e a armadura', async () => {
    if (await P.locator('[data-itcard="es"] .itregra').count() === 0) { await P.locator('[data-itemed="es"]').click(); await w(250); }
    ok(/Elemento \(sugestão da F2\): até 4 por cima do dano, em 1 elemento\. Este item não tem/.test(await P.locator('[data-itcard="es"] .itregelem').innerText()), 'a arma mostra a sugestão do elemento');
    await P.selectOption('[data-itmais="es"]', 'dano:FOGO'); await w(300);
    await P.locator('[data-itx="dano"][data-it="es"][data-ch="FOGO"]').fill('3'); await P.locator('[data-itx="dano"][data-it="es"][data-ch="FOGO"]').press('Tab'); await w(300);
    ok((await item('pc_d', 'es')).dano.FOGO === 3, 'o dano de fogo entra no item (it.dano)');
    ok(await P.locator('[data-itcard="es"] .itbon .itelem svg').count() === 1 && /\+3/.test(await P.locator('[data-itcard="es"] .itbon .itelem').innerText()), '(lote 90) o cartão mostra o fogo colado no FOR: "FOR +14 🔥+3"');
    ok(/Este item: Fogo 3\./.test(await P.locator('[data-itcard="es"] .itregelem').innerText()), 'e a sugestão confere');
    await foto('l89-elemento', '[data-itcard="es"]');
    await P.locator('[data-itemed="co"]').click(); await w(250);
    const av = await P.locator('[data-itcard="co"] .itregaviso').first().innerText();
    ok(/A F2 pede 26 no total, repartido entre DEF F e DEF M, até 17 num lado\. Este item: 9 \+ 9 = 18, abaixo\./.test(av), 'a armadura: ' + av);
    await P.locator('[data-itregusar="co"]').click(); await w(300);
    const b = (await item('pc_d', 'co')).bonus;
    ok(b.DFF === 13 && b.DFM === 13, '"Usar o valor da faixa" reparte os 26: 13 + 13');
    await foto('l89-armadura', '[data-itcard="co"]');
    await desfazer();
    ok((await item('pc_d', 'co')).bonus.DFF === 9, 'Desfazer volta o 9 + 9');
  });

  await passo('Ajustar à regra', async () => {
    if (!(await P.locator('#btnRegraEq').isVisible())) { await P.locator('#actsMais summary').click(); await w(150); }
    await P.locator('#btnRegraEq').click(); await w(350);
    const txt = await P.locator('.modal').last().innerText();
    ok(/Dain/.test(txt) && /Oria/.test(txt) && /Cajado/.test(txt), 'a janela lista por personagem (Dain e Oria)');
    await foto('l89-ajustar', '.modal >> nth=-1');
    const antes = await S0(() => S.personagens.map(p => p.itens.length));
    // desmarcar a bota da Oria
    const n = await P.locator('[data-ajreg]').count();
    const botaOria = await S0(() => [...document.querySelectorAll('[data-ajreg]')].findIndex(c => /Bota/.test(c.closest('label').innerText) && /Oria/.test(c.closest('.ajreg-pc').innerText)));
    ok(botaOria >= 0, 'a Oria ganha uma bota (desmarcada a seguir)');
    await P.locator('[data-ajreg]').nth(botaOria).uncheck(); await w(100);
    ok(new RegExp('Aplicar ' + (n - 1) + ' mudanças').test(await P.locator('.modal [data-jok]').last().innerText()), 'o botão conta as marcadas');
    await P.locator('.modal [data-jok]').last().click(); await w(400);
    const o = await S0(() => JSON.parse(JSON.stringify(S.personagens.find(p => p.id === 'pc_o').itens)));
    ok(o.find(i => i.id === 'ca').bonus.CAN === 22 && o.some(i => /Armadura F3/.test(i.nome)) && !o.some(i => /Bota/.test(i.nome)), 'aplicado: o Cajado na F3 (22), a armadura entra e a bota desmarcada não');
    await desfazer();
    ok(j(await S0(() => S.personagens.map(p => p.itens.length))) === j(antes) && (await item('pc_o', 'ca')).bonus.CAN === 17, 'Desfazer volta tudo');
  });

  ok(t.errs.length === 0, 'sem erros no console: ' + t.errs.slice(0, 3).join(' | '));
  await t.close(); end();
})().catch(e => { console.error(e); process.exit(1); });
