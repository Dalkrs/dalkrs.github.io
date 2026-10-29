// Bestiário, lote 33 (sem mesa): os números à mão, o equipamento e a conta da dificuldade.
//   · as contas (tc/rules.js e tc/bestiario.js): o atributo digitado é a base (o equipamento soma por cima), o derivado
//     digitado vale no lugar da conta, a barra e a iniciativa com número fixo; o equipamento guardado não soma; a
//     dificuldade pelos atributos de verdade (dos dois lados), com o detalhe; o saque com a peça inteira;
//   · a página: o atributo com "Número", os derivados, a iniciativa e a barra fixas; a aba Equipamento (escrever uma
//     peça com os bônus e a barra, trazer do catálogo da aba Itens — uma cópia —, vem equipado ou guardado, a chance no
//     saque); a gaveta (o ✎ do digitado, o equipamento); o "?" da dificuldade com a conta.
const { start, checker } = require('./lib');
const { ok, end } = checker();
const R = require('../../tc/rules.js');
global.TC = { rules: R, dice: require('../../tc/dice.js') };
const B = require('../../tc/bestiario.js');
const j = JSON.stringify;

// ---------- as contas ----------
{
  const pc = Object.assign(R.personagemPadrao('x'), { tier: 'C', level: 5 });
  const a = R.calcular(pc);
  pc.atrMan = { FOR: 40, DES: '' }; pc.derMan = { ESQ: 12 }; pc.itens = [{ id: 'i', nome: 'Espada', equipado: true, bonus: { FOR: 5, ESQ: 2 } }];
  const b = R.calcular(pc);
  ok(b.nat.FOR === 40 && b.tot.FOR === 45 && b.base.DES === a.base.DES && b.der.ESQ === 14, 'as fichas: o atributo digitado é a base (a espada soma +5), o vazio segue a letra, o derivado digitado vale no lugar da conta (+2 da espada)');
  pc.itens[0].equipado = false;
  ok(R.calcular(pc).tot.FOR === 40, 'a peça guardada não soma');
  const e = B.normalizar({ nome: 'Ogro', ficha: { tier: 'B', level: 4, atrMan: { FOR: '40', DES: '', CAN: 'abc' }, derMan: { ESQ: 3 }, ini: '6', iniFixa: true,
    recursos: [{ id: 'hp', nome: 'HP', fml: '120', fixo: true }, { id: 'sp', nome: 'SP', fml: 'CAN*6', fixo: true }],
    itens: [{ nome: 'Clava', bonus: { FOR: 5 }, rec: { hp: 10, nao: 4 }, chance: 300 }, { nome: 'Elmo', equipado: false, bonus: { DFF: 2 }, def: { FOGO: 3 } }, 'x'] } });
  ok(j(e.ficha.atrMan) === j({ FOR: 40 }) && j(e.ficha.derMan) === j({ ESQ: 3 }) && e.ficha.iniFixa === true && e.ficha.recursos[0].fixo === true && !e.ficha.recursos[1].fixo, 'normalizar: só os números que valem; a barra fixa só com um número (a fórmula fica fórmula)');
  ok(e.ficha.itens.length === 2 && e.ficha.itens[0].equipado === true && e.ficha.itens[0].chance === 100 && j(e.ficha.itens[0].rec) === j({ hp: 10 }) && e.ficha.itens[1].equipado === false && e.ficha.itens[1].chance === 50 && j(e.ficha.itens[1].def) === j({ FOGO: 3 }), 'o equipamento: a chance até 100 (começa em 50), a barra só se existir, o guardado');
  const c = B.contas(e);
  ok(c.rolaveis.find(r => r[0] === 'FOR')[2] === 45 && c.rolaveis.find(r => r[0] === 'ESQ')[2] === 3 && c.barras[0].m === 130 && c.ini === 6 && c.defesas.DFF === 0, 'as contas do inimigo: FOR 40 + 5, ESQ 3, HP 120 + 10 do equipamento, iniciativa 6; o elmo guardado não soma');
  const sq = B.rolarSaque(e, () => 0.2);
  const clava = sq.itens.find(x => x.nome === 'Clava'), elmo = sq.itens.find(x => x.nome === 'Elmo');
  ok(clava && clava.tipo === 'equip' && clava.eq.bonus.FOR === 5 && j(clava.eq.recN) === j({ HP: 10 }) && elmo && j(elmo.eq.def) === j({ FOGO: 3 }) && sq.rolagens.some(r => /Clava \(equipamento\): 21 ≤ 100%/.test(r)), 'o saque: cada peça pela chance dela, inteira (a barra pelo nome: HP)');
  // a dificuldade: os atributos de verdade
  const gob = B.novo('Goblin', { ficha: { tier: 'D', level: 3 } }), forte = B.novo('Goblin forte', { ficha: { tier: 'D', level: 3, itens: [{ nome: 'Machado', bonus: { FOR: 30 } }] } });
  const pj = { nome: 'Lirien', ficha: Object.assign(R.personagemPadrao('Lirien'), { tier: 'C', level: 5 }) };
  const d1 = B.dificuldade([{ e: gob, n: 2 }], [pj], R.cfgPadrao()), d2 = B.dificuldade([{ e: forte, n: 2 }], [pj], R.cfgPadrao());
  const pg = R.calcular(pj.ficha).tot, soma = pg.FOR + pg.DES + pg.VIT + pg.CAN + pg.AGI;
  ok(d1 && d1.grupo === soma && d1.detalhe.grupo[0].nome === 'Lirien' && d1.detalhe.inimigos[0].n === 2 && d1.inimigos === d1.detalhe.inimigos[0].poder * 2, 'o poder: a soma dos cinco atributos finais (Lirien ' + soma + '); o dos inimigos, um por cópia — ' + j(d1));
  ok(d2.inimigos === d1.inimigos + 60 && d2.razao > d1.razao, 'o equipamento conta na dificuldade (o machado +30, nos dois)');
  const d3 = B.dificuldade([{ e: gob, n: 1 }], [{ tier: 'C', level: 5 }], R.cfgPadrao());
  ok(d3 && d3.grupo === soma, 'o grupo escrito só com tier e level ainda vale (as contas de uma ficha assim)');
  ok(B.dificuldade([{ e: gob, n: 1 }], [], R.cfgPadrao()) === null, 'sem grupo, sem dificuldade');
  const faixa = r => { for (const [k, ate] of B.FAIXAS) if (r <= ate) return k; };
  ok(faixa(60) === 'facil' && faixa(61) === 'medio' && faixa(100) === 'medio' && faixa(150) === 'duro' && faixa(151) === 'mortal', 'as faixas: até 60% Fácil, até 100% Médio, até 150% Duro, acima Mortal');
}

// ---------- a página ----------
(async () => {
  const t = await start();
  const cat = { docs: { 'itens:catalogo': { v: 1, itens: [{ id: 'cEl', t: 'equip', nome: 'Elmo de ferro', nota: 'Pesado.', equip: { tipo: '', bonus: { DFF: 2 }, def: { CORTE: 1 } } }, { id: 'cPo', t: 'pocao', nome: 'Poção' }] } } };
  const { page: P } = await t.device({ name: 'l33', w: 1360, h: 900, seed: { 'tinycats:itens:local': JSON.stringify(cat) } });
  P.setDefaultTimeout(8000);
  const w = ms => P.waitForTimeout(ms);
  const E = (fn, a) => P.evaluate(fn, a);
  const foto = async nome => { if (process.env.FOTOS) await P.screenshot({ path: process.env.FOTOS + '/' + nome + '.png' }); };
  const passo = async (nome, fn) => { try { await fn(); } catch (e) { ok(false, nome + ' — parou: ' + String((e && e.message) || e).split('\n')[0]); } };
  await P.goto(t.base + 'bestiario/?debug', { waitUntil: 'load' }); await w(700);

  await passo('os números à mão', async () => {
    await P.locator('#btNovo').click(); await w(200);
    await P.locator('#ed-nome').fill('Ogro da ponte');
    await P.locator('#ed-aba-numeros').click(); await w(150);
    await P.locator('#ed-tier').selectOption('B'); await w(100);
    await P.locator('#ed-t-FOR').selectOption('mao'); await w(150);
    ok(await P.locator('#ed-m-FOR').count() === 1, 'a Força em "Número": aparece o campo');
    await P.locator('#ed-m-FOR').fill('40'); await P.locator('#ed-m-FOR').press('Tab'); await w(150);
    await P.locator('#ed-dm-ESQ').fill('3'); await P.locator('#ed-dm-ESQ').press('Tab'); await w(150);
    await P.locator('#ed-ini-modo').selectOption('fixa'); await w(150);
    await P.locator('#ed-ini').fill('5'); await P.locator('#ed-ini').press('Tab'); await w(150);
    await P.locator('#ed-r-m-0').selectOption('fixo'); await w(150);
    await P.locator('#ed-r-f-0').fill('120'); await P.locator('#ed-r-f-0').press('Tab'); await w(150);
    const f = await E(() => __best.ed.e.ficha);
    ok(j(f.atrMan) === j({ FOR: 40 }) && j(f.derMan) === j({ ESQ: 3 }) && f.iniFixa === true && f.ini === '5' && f.recursos[0].fixo === true && f.recursos[0].fml === '120', 'a Força 40, a Esquiva 3, a iniciativa 5 e o HP 120: ' + j({ atrMan: f.atrMan, derMan: f.derMan, ini: f.ini, hp: f.recursos[0] }));
    ok(/FOR 40/.test(await P.locator('#ed-num').innerText()) && /ESQ 3/.test(await P.locator('#ed-num').innerText()), 'a prévia: ' + await P.locator('#ed-num').innerText());
    ok(/^\d+$/.test(await P.locator('#ed-dm-FUR').getAttribute('placeholder')), 'o derivado vazio mostra a conta: ' + await P.locator('#ed-dm-FUR').getAttribute('placeholder'));
    await foto('l33-best-numeros');
  });

  await passo('o equipamento', async () => {
    await P.locator('#ed-aba-equip').click(); await w(150);
    ok(/Sem equipamento/.test(await P.locator('.dl-c').innerText()), 'a aba Equipamento começa vazia');
    await P.locator('#ed-eq-mao').click(); await w(200);
    const id = await E(() => __best.ed.e.ficha.itens[0].id);
    await P.locator('#ed-eq-n-' + id).fill('Clava cravejada'); await P.locator('#ed-eq-n-' + id).press('Tab'); await w(100);
    await P.locator('#ed-eq-b-' + id + '-FOR').fill('5'); await P.locator('#ed-eq-b-' + id + '-FOR').press('Tab'); await w(150);
    const hp = await E(() => __best.ed.e.ficha.recursos[0].id);
    await P.locator('#ed-eq-r-' + id + '-' + hp).fill('10'); await P.locator('#ed-eq-r-' + id + '-' + hp).press('Tab'); await w(150);
    await P.locator('#ed-eq-c-' + id).fill('100'); await P.locator('#ed-eq-c-' + id).press('Tab'); await w(150);
    ok(/FOR \+5, HP \+10/.test(await P.locator('#ed-eq-r-' + id).innerText()), 'a peça escrita à mão: o resumo dos bônus (a Força e o HP)');
    ok(/FOR 45/.test(await P.locator('#ed-eq-previa').innerText()), 'a prévia já soma a clava: ' + await P.locator('#ed-eq-previa').innerText());
    await P.locator('#ed-eq-cat').click(); await w(200);
    const menu = await P.locator('#menu-cat').innerText();
    ok(/Elmo de ferro/.test(menu) && !/Poção/.test(menu), 'do catálogo da aba Itens: só os equipamentos — ' + menu.replace(/\n/g, ' | '));
    await P.locator('#menu-cat [data-cat="cEl"]').click(); await w(200);
    const it = await E(() => __best.ed.e.ficha.itens[1]);
    ok(it && it.nome === 'Elmo de ferro' && it.bonus.DFF === 2 && it.def.CORTE === 1 && it.cat === 'cEl' && it.efeito === 'Pesado.', 'o elmo vem do catálogo (uma cópia, com os bônus e a nota): ' + j(it));
    await P.locator('#ed-eq-on-' + it.id).uncheck(); await w(150);
    ok(await E(() => __best.ed.e.ficha.itens[1].equipado) === false, '“Vem equipado” desmarcado: guardado');
    await foto('l33-best-equip');
    await P.locator('#ed-salvar').click(); await w(300);
    const e = await E(() => __best.inimigos()[0].e);
    ok(e.ficha.itens.length === 2 && e.ficha.itens[0].rec && e.ficha.atrMan.FOR === 40, 'guardado com o equipamento e os números');
  });

  await passo('a gaveta', async () => {
    const atrs = await P.locator('#g-atrs').innerText();
    ok(/FOR ✎\s*45/.test(atrs), 'a gaveta marca o atributo digitado (✎) e mostra o total com a clava: ' + atrs.replace(/\n/g, ' '));
    const eq = await P.locator('#g-equip').innerText();
    ok(/Clava cravejada/.test(eq) && /saque 100%/.test(eq) && /Elmo de ferro \(guardado\)/.test(eq), 'a gaveta mostra o equipamento: ' + eq.replace(/\n/g, ' | '));
    ok(/HP/.test(await P.locator('#gaveta').innerText()) && /130/.test(await P.locator('#gaveta').innerText()), 'o HP 130 (120 fixo + 10 da clava)');
  });

  await passo('o "?" da dificuldade', async () => {
    await P.locator('#g-mais').click(); await w(200);
    await P.locator('#enc-dif-ajuda').click(); await w(200);
    const txt = await P.locator('#dlgDif').innerText();
    ok(/Como a dificuldade é calculada/.test(txt) && /soma dos cinco atributos finais/.test(txt) && /Ogro da ponte/.test(txt) && /Fora de uma mesa não há grupo/.test(txt) && /Fácil: até 60%/.test(txt) && /Mortal: acima de 150%/.test(txt), 'a janela explica a conta, com o poder do ogro e as faixas: ' + txt.replace(/\n/g, ' | ').slice(0, 300));
    await foto('l33-best-dificuldade');
    await P.locator('#dlgDif .btn.pri').click(); await w(100);
  });

  const erros = t.errs;
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 8).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  await t.close(); end();
})();
