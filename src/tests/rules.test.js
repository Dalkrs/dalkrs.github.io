// Regras da ficha (tc/rules.js) contra a calculadora original: o mesmo personagem tem de dar a mesma conta.
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = require('../../tc/rules.js');
let n = 0, bad = 0;
const ok = (c, msg) => { n++; if (!c) { bad++; if (bad <= 25) console.log('FALHOU: ' + msg); } };
const j = x => JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v) ? String(v) : v));

// o miolo sem tela da calculadora original (constantes, fórmulas, padrões e cálculo)
const linhas = fs.readFileSync(path.join(__dirname, '../legado/calculadora-urgm.html'), 'utf8').split('\n');
const ini = linhas.findIndex((l, i) => i > 500 && l.trim() === '<script>') + 1;
const fim = linhas.findIndex(l => l.includes('flor de Lirian'));
const ctx = vm.createContext({ document: {}, window: {}, localStorage: { getItem: () => null, setItem() {} }, crypto: require('crypto').webcrypto, console, setTimeout, clearTimeout });
vm.runInContext(linhas.slice(ini, fim).join('\n') + '\n;globalThis.__o = { calcular, evalFormula, somaPercentuaisUsados, valorDoAtributo: null, set: c => { S.cfg = c; }, cfg: () => S.cfg, personagemPadrao };', ctx);
const O = ctx.__o;
const clone = x => JSON.parse(JSON.stringify(x));

// ---------- 1. exemplo documentado ----------
const cfg0 = R.cfgPadrao();
ok(j(cfg0) === j(clone(O.cfg())), 'a configuração padrão é a mesma da calculadora');
const dain = { id: 'd', nome: 'Dain X', tier: 'S', level: 19, tiers: { FOR: 'A', DES: 'C', AGI: 'D', VIT: 'B', CAN: 'E' }, pctProprio: null, defesas: { DFF: 10, DFM: 4 }, itens: [], recursos: [{ id: 'hp', nome: 'HP', fml: 'VIT*8 + LVL*5' }, { id: 'sp', nome: 'SP', fml: 'CAN*6 + LVL*3' }] };
const c = R.calcular(dain, cfg0);
ok(c.tot.FOR === 63 && c.tot.VIT === 55 && c.tot.DES === 46 && c.tot.AGI === 35 && c.tot.CAN === 10, 'Dain X: atributos ' + j(c.tot));
ok(c.der.ESQ === 35 && c.der.FUR === 58 && c.der.PER === 51, 'Dain X: derivados ' + j(c.der));
ok(c.recursos[0].val === 535 && c.recursos[1].val === 117, 'Dain X: HP 535 e SP 117 — ' + c.recursos.map(r => r.val));

// ---------- 2. equivalência com a original, em muitos personagens ----------
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const pick = a => a[Math.floor(rnd() * a.length)];
const FMLS = ['VIT*8 + LVL*5', 'CAN*6 + LVL*3', 'for + des_b*2 - agi_eq', 'se(VIT > 50; 100; 50) + teto(LVL/3)', 'max(FOR, DES) * 2 + min(ESQ, PER)', 'round(PTS / 7) + MULT*10', '(FOR + DES) ^ 2 % 97', 'sqrt(VITALIDADE) + abs(-3) + pow(2, 3)', 'DFF + DFM + FUR_B + PER_EQ', 'piso(TOTAL/3) + arredondar(NIVEL/2) + raiz(16)', 'VIT *', 'XYZ + 1', '', '1/0', 'se(1;2)', 'FORÇA + CANALIZAÇÃO + MAG + CM', '((VIT))>=10', '-VIT + +FOR', '2^3^2', '10 % 3 + 7 / 2'];
function sorteia(i) {
  const tiers = {}; for (const a of ['FOR', 'DES', 'AGI', 'VIT', 'CAN']) tiers[a] = pick(['A', 'B', 'C', 'D', 'E']);
  const item = () => { const b = {}; for (const k of ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'DFF', 'DFM']) if (rnd() < 0.5) b[k] = Math.round(rnd() * 20 - 5); const it = { id: 'i' + i + Math.round(rnd() * 1e6), nome: 'item', bonus: b }; if (rnd() < 0.7) it.equipado = rnd() < 0.7; return it; };
  return { id: 'p' + i, nome: 'P' + i, tier: pick(['S', 'A', 'B', 'C', 'D', 'E', 'Z', '']), level: pick([1, 2, 5, 19, 30, 49, 50, 60, 0, '7']), tiers,
    pctProprio: rnd() < 0.25 ? { A: 0.4, B: 0.3, C: 0.2, D: 0.07, E: 0.03 } : null, defesas: { DFF: Math.round(rnd() * 30), DFM: Math.round(rnd() * 30) },
    itens: Array.from({ length: Math.floor(rnd() * 4) }, item), recursos: Array.from({ length: Math.floor(rnd() * 4) }, (_, k) => ({ id: 'r' + k, nome: pick(['HP', 'SP', 'Fé', 'EN']), fml: pick(FMLS) })) };
}
for (const modo of ['floor', 'round', 'ceil', 'none']) {
  const cfg = R.cfgPadrao(); cfg.arredondar = modo;
  O.set(clone(cfg));
  for (let i = 0; i < 150; i++) {
    const p = sorteia(i);
    let a, b, ea = null, eb = null;
    try { a = O.calcular(clone(p)); } catch (e) { ea = String(e.message); }
    try { b = R.calcular(clone(p), cfg); } catch (e) { eb = String(e.message); }
    if (ea || eb) { ok(!!ea === !!eb, `(${modo}) personagem ${i}: os dois falham igual — original: ${ea}, novo: ${eb}`); continue; }
    for (const k of Object.keys(a)) {
      // a biblioteca acrescenta coisas (variáveis _ARV/_NAT; "arv" e "max" em cada recurso): tudo o que a original tem precisa bater
      let x = a[k], y = b[k];
      if (k === 'vars') { y = {}; for (const v of Object.keys(x)) y[v] = b.vars[v]; }
      if (k === 'recursos') y = (b.recursos || []).map(r => ({ id: r.id, nome: r.nome, fml: r.fml, val: r.val, err: r.err }));
      ok(j(x) === j(y), `(${modo}) personagem ${i}, campo ${k}: original ${j(x).slice(0, 160)} · novo ${j(y).slice(0, 160)}`);
    }
    ok(O.somaPercentuaisUsados(clone(p)) === R.somaPercentuaisUsados(clone(p), cfg), `(${modo}) personagem ${i}: soma dos percentuais`);
  }
}
// fórmulas, uma a uma
const vars = clone(c.vars);
for (const f of FMLS.concat(['1 + 2 * 3', '(1 + 2) * 3', 'min(1;2;3)', 'max()', 'floor(2.7) + ceil(2.1)', '3 > 2', '3 = 3', '2 != 2', 'vit', 'Vit*2', '1,5 + 1', '1.5 + 1', ')', 'abs(', '2 ** 3', 'se(0; 1; 2)'])) {
  let a, b; try { a = j(O.evalFormula(f, clone(vars))); } catch (e) { a = 'ERRO ' + e.message; } try { b = j(R.evalFormula(f, clone(vars))); } catch (e) { b = 'ERRO ' + e.message; }
  ok(a === b, `fórmula "${f}": original ${a} · novo ${b}`);
}

// ---------- 3. o que é novo: bônus da árvore, iniciativa, valores atuais ----------
const lib = { arvores: [{ id: 'a1', nodes: [{ id: 'n1', graus: [{ custos: {}, texto: '', bonus: { FOR: 2, HP: 10 } }, { custos: {}, texto: '', bonus: { for: 1, 'hp ': 5, ESQ: 3 } }] }, { id: 'n2', graus: [{ custos: {}, texto: '', bonus: { VIT: 4, Fe: 7, DFF: 1, lixo: 'x' } }] }] }, { id: 'a2', nodes: [{ id: 'n9', graus: [{ custos: {}, texto: '', bonus: { FOR: 100 } }] }] }] };
const bon = R.bonusDaArvore({ arvores: ['a1'], pontos: {}, alocados: { n1: 2, n2: 1, n9: 1, sumiu: 3 } }, lib);
ok(bon.FOR === 3 && bon.ESQ === 3 && bon.VIT === 4 && bon.DFF === 1, 'bônus da árvore: graus somam, árvore não equipada e nódulo sumido ficam de fora — ' + j(bon));
const chaveHP = Object.keys(bon).find(k => R.normNome(k) === R.normNome('HP'));
ok(chaveHP && bon[chaveHP] === 15, 'recurso com o mesmo nome (maiúsculas e espaços à parte) soma numa chave só: ' + j(bon));
const semExtra = R.calcular(dain, cfg0), comExtra = R.calcular(dain, cfg0, { arvore: bon });
ok(comExtra.base.FOR === semExtra.base.FOR + 3 && comExtra.tot.FOR === semExtra.tot.FOR + 3 && comExtra.nat.FOR === semExtra.base.FOR, 'o bônus de atributo entra na base (FOR ' + semExtra.tot.FOR + ' → ' + comExtra.tot.FOR + ')');
ok(comExtra.base.VIT === semExtra.base.VIT + 4 && comExtra.recursos[0].val === (semExtra.base.VIT + 4) * 8 + 19 * 5 + 15, 'HP usa a VIT nova e ainda ganha o bônus de HP: ' + comExtra.recursos[0].val);
ok(comExtra.der.ESQ === semExtra.der.ESQ + 3 && comExtra.def.DFF === semExtra.def.DFF + 1, 'derivado e defesa recebem o próprio bônus');
ok(j(R.calcular(dain, cfg0, {}).tot) === j(semExtra.tot) && j(R.calcular(dain, cfg0, { arvore: {} }).recursos.map(r => r.val)) === j(semExtra.recursos.map(r => r.val)), 'sem bônus, nada muda');
ok(R.iniciativa(Object.assign({}, dain, { ini: 'AGI/5' }), cfg0).val === 7 && R.iniciativa(Object.assign({}, dain, { ini: '3' }), cfg0).val === 3 && R.iniciativa(dain, cfg0).val === 0, 'iniciativa por fórmula (AGI/5 = 7), número fixo e vazia (0)');
ok(R.iniciativa(Object.assign({}, dain, { ini: 'AGI /' }), cfg0).err && R.iniciativa(Object.assign({}, dain, { ini: 'AGI /' }), cfg0).val === 0, 'fórmula de iniciativa errada: erro e 0');
const er = R.estadoRecursos(dain, semExtra, { rec: { hp: 212, sp: 9999 } });
ok(er[0].atual === 212 && er[0].max === 535 && er[1].atual === 117, 'valores atuais: o anotado vale; acima do máximo fica no máximo — ' + j(er));
ok(R.estadoRecursos(dain, semExtra, {})[0].atual === 535, 'sem anotação, está cheio');
const e0 = { rec: { hp: 100 } }, e1 = R.aplicarDelta(e0, 'hp', 535, -30), e2 = R.aplicarDelta({}, 'hp', 535, -30), e3 = R.aplicarDelta(e0, 'hp', 535, 9999), e4 = R.aplicarDelta(e0, 'hp', 535, -9999);
ok(e1.rec.hp === 70 && e0.rec.hp === 100 && e2.rec.hp === 505 && e3.rec.hp === 535 && e4.rec.hp === 0, 'dano e cura: não mexe no original, sem anotação parte do máximo, fica entre 0 e o máximo');
const rs = R.resumo(Object.assign({}, dain, { rol: { fixa: 20, fonte: 'base' }, lado: 'Aliado', ini: '2' }), cfg0, null, { rec: { hp: 400 } });
ok(rs.nome === 'Dain X' && rs.attrs.FOR === 63 && rs.recursos[0].atual === 400 && rs.recursos[0].max === 535 && rs.ini === 2 && rs.fixa === 20 && rs.fonte === 'base', 'resumo para os outros sistemas: ' + j(rs).slice(0, 200));
ok(R.valorDoAtributo(semExtra, 'FOR', 'total') === 63 && R.valorDoAtributo(semExtra, 'ESQ', 'base') === 35 && R.valorDoAtributo(semExtra, 'DFF', 'total') === 10, 'valor de atributo, derivado e defesa para rolar');

// ---------- 4. barras negativas, barra que começa pela metade, itens que dão barra e defesa, temporários, bolsas ----------
{
  const base = () => ({ id: 'x', nome: 'Selene', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, defesas: { DFF: 2, DFM: 1 }, itens: [],
    recursos: [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '40' }, { id: 'gelo', nome: 'Gelo de Selene', fml: '20', comeca: '4' }, { id: 'san', nome: 'Sangue', fml: '30', piso: '15' }] });
  const p0 = base(), c0 = R.calcular(p0, cfg0);
  // os campos novos, vazios, não mudam nada
  ok(c0.recursos[0].min === 0 && c0.recursos[0].inicio === null && c0.recursos[0].eq === 0 && c0.recursos[0].errMin === null, 'barra comum: sem piso, sem começo — ' + j(c0.recursos[0]));
  ok(c0.recursos[2].inicio === 4 && c0.recursos[2].max === 20 && c0.recursos[3].min === -15 && c0.recursos[3].inicio === null, 'começa em 4 de 20; pode ir até −15 — ' + j([c0.recursos[2], c0.recursos[3]]));
  const e = R.estadoRecursos(p0, c0, {});
  ok(e[0].atual === 100 && e[2].atual === 4 && e[2].inicio === 4 && e[3].atual === 30 && e[3].min === -15 && e[0].min === 0, 'sem nada anotado: a barra comum está cheia e a que começa em 4 está em 4 — ' + j(e.map(x => x.atual)));
  const e2 = R.estadoRecursos(p0, c0, { rec: { hp: -5, gelo: 25, san: -40 } });
  ok(e2[0].atual === 0 && e2[2].atual === 20 && e2[3].atual === -15, 'anotado fora do limite fica no limite (0, o máximo, o piso negativo) — ' + j(e2.map(x => x.atual)));
  ok(R.estadoRecursos(p0, c0, { rec: { san: -7, gelo: 0 } })[3].atual === -7 && R.estadoRecursos(p0, c0, { rec: { gelo: 0 } })[2].atual === 0, 'dentro do limite, o negativo vale; zero anotado é zero (não volta ao começo)');
  // dano e cura com piso e começo
  let s = R.aplicarDelta({}, 'san', 30, -40, -15, null);
  ok(s.rec.san === -10, 'dano que passa de zero numa barra com piso: 30 − 40 = −10');
  s = R.aplicarDelta(s, 'san', 30, -40, -15, null); ok(s.rec.san === -15, 'e para no piso (−15)');
  s = R.aplicarDelta(s, 'san', 30, 100, -15, null); ok(s.rec.san === 30, 'a cura volta até o máximo');
  ok(R.aplicarDelta({}, 'gelo', 20, 3, 0, 4).rec.gelo === 7 && R.aplicarDelta({}, 'gelo', 20, -9, 0, 4).rec.gelo === 0, 'a barra que começa em 4 parte de 4 (4 + 3 = 7; 4 − 9 = 0)');
  ok(R.aplicarDelta({}, 'hp', 100, -30).rec.hp === 70 && R.aplicarDelta({ rec: { hp: 10 } }, 'hp', 100, -30).rec.hp === 0, 'sem piso nem começo, tudo como antes');
  // número ou fórmula; com erro, a barra segue sem o limite
  const p1 = base(); p1.recursos[2].comeca = 'MAX/2'; p1.recursos[3].piso = 'MAX/2 + LVL'; p1.recursos[0].comeca = 'x +'; p1.recursos[1].piso = '-10';
  const c1 = R.calcular(p1, cfg0);
  ok(c1.recursos[2].inicio === 10 && c1.recursos[3].min === -18, 'fórmulas com MAX e as variáveis da ficha: começa em MAX/2 = 10; piso MAX/2 + LVL = 18 — ' + j([c1.recursos[2].inicio, c1.recursos[3].min]));
  ok(c1.recursos[0].inicio === null && !!c1.recursos[0].errInicio && c1.recursos[0].err === null && c1.recursos[1].min === -10, 'fórmula errada: avisa e a barra fica cheia; piso digitado com sinal de menos vale igual');
  const p2 = base(); p2.recursos[2].comeca = '999'; p2.recursos[3].comeca = '-50';
  const c2 = R.calcular(p2, cfg0);
  ok(c2.recursos[2].inicio === 20 && c2.recursos[3].inicio === -15, 'o começo fica dentro da barra (entre o piso e o máximo)');

  // itens que dão barra e defesa específica
  const p3 = base();
  p3.itens = [{ id: 'i1', nome: 'Amuleto', equipado: true, bonus: { VIT: 2 }, rec: { hp: 25, gelo: 5, sumiu: 9 }, def: { FOGO: 3, GELO: 1, XX: 9 } }, { id: 'i2', nome: 'Capa', equipado: false, bonus: {}, rec: { hp: 100 }, def: { FOGO: 50 } }, { id: 'i3', nome: 'Anel', bonus: {}, rec: { hp: '5' }, def: { FOGO: 2 } }];
  p3.defEsp = { FOGO: 10, CORTE: 4, NADA: 3 };
  const c3 = R.calcular(p3, cfg0);
  ok(c3.recursos[0].val === 130 && c3.recursos[0].max === 130 && c3.recursos[0].eq === 30 && c3.recursos[2].max === 25 && c3.recursos[1].eq === 0, 'itens equipados somam no máximo da barra (HP 100 + 25 + 5; o desequipado não) — ' + j(c3.recursos.map(r => r.max)));
  ok(c3.defEsp.FOGO === 15 && c3.defEsp.GELO === 1 && c3.defEsp.CORTE === 4 && c3.defEsp.LUZ === 0 && c3.eqEsp.FOGO === 5 && c3.baseEsp.FOGO === 10 && Object.keys(c3.defEsp).length === 13, 'defesas específicas: a digitada mais a dos itens equipados — ' + j(c3.defEsp));
  ok(j(c3.eq) === j(R.calcular(Object.assign(base(), { itens: [{ id: 'i1', equipado: true, bonus: { VIT: 2 } }] }), cfg0).eq) && Object.keys(c3.eq).length === 10, 'o bônus de sempre dos itens continua com as dez chaves');
  ok(c3.vars.DEF_FOGO === 15 && R.valorDoAtributo(c3, 'FOGO') === 15 && R.ehDefesaEsp('PSI') && !R.ehDefesaEsp('DFF'), 'a defesa específica vira variável (DEF_FOGO) e pode ser rolada');
  // sem fórmula, a barra continua sem valor (o item não inventa um)
  const p4 = base(); p4.recursos.push({ id: 'vazia', nome: 'Vazia', fml: '' }); p4.itens = [{ id: 'i', bonus: {}, rec: { vazia: 10 } }];
  ok(R.calcular(p4, cfg0).recursos[4].val === null && R.calcular(p4, cfg0).recursos[4].eq === 0, 'barra sem fórmula não ganha valor por causa do item');

  // bônus temporários
  const tmp = { b1: { n: 'Ensopado', k: 'VIT', v: 3, d: 'até o descanso', t: 2 }, b2: { n: 'Poção de agilidade', k: 'agi', v: 5, t: 1 }, b3: { n: 'Desligado', k: 'FOR', v: 9, off: true, t: 3 }, b4: { n: 'Fogo', k: 'FOGO', v: 7, t: 4 }, b5: { n: 'Torto', k: 'ZZZ', v: 4, t: 5 }, b6: 'lixo', b7: { n: 'Esquiva', k: 'ESQ', v: -2, t: 6 }, b8: { n: 'Def', k: 'DFF', v: 1, t: 7 } };
  const T = R.temporarios(tmp);
  ok(T.lista.map(x => x.id).join() === 'b2,b1,b3,b4,b5,b7,b8' && T.soma.VIT === 3 && T.soma.AGI === 5 && T.soma.FOR === 0 && T.esp.FOGO === 7 && T.soma.ESQ === -2 && T.lista[4].k === '', 'temporários: em ordem de chegada; o desligado e o de chave desconhecida não somam — ' + j(T.soma));
  {
    // a duração: anotação (d), até o próximo descanso (ate) ou rodadas (r) — com 0 rodadas, acabou e não soma
    const Td = R.temporarios({ a: { n: 'Forja', k: 'FOR', v: 3, r: 2, t: 1 }, b: { n: 'Acabou', k: 'FOR', v: 9, r: 0, t: 2 }, c: { n: 'Ensopado', k: 'VIT', v: 2, ate: 'descanso', t: 3 }, d: { n: 'Torto', k: 'AGI', v: 1, r: -4.6, ate: 'x', t: 4 } });
    ok(j(Td.lista.map(x => [x.r, x.ate])) === j([[2, ''], [0, ''], [null, 'descanso'], [0, '']]) && Td.soma.FOR === 3 && Td.soma.VIT === 2 && Td.soma.AGI === 0,
      'temporários com duração: as rodadas que faltam e o "até o próximo descanso" vêm na lista; o que tem 0 rodadas (ou menos) acabou e não soma — ' + j(Td.soma));
  }
  const pv = Object.assign(base(), { recursos: [{ id: 'hp', nome: 'HP', fml: 'VIT*10' }] }), cs = R.calcular(pv, cfg0), ct = R.calcular(pv, cfg0, { temp: tmp });
  ok(ct.tot.VIT === cs.tot.VIT + 3 && ct.base.VIT === cs.base.VIT && ct.eq.VIT === cs.eq.VIT && ct.tmp.VIT === 3, 'o temporário soma no total como um equipamento (a base e a coluna de equipamento não mudam)');
  ok(ct.recursos[0].max === cs.recursos[0].max + 30, 'e entra nas fórmulas das barras (HP = VIT*10 sobe 30)');
  ok(ct.der.ESQ === cs.der.ESQ - 2 && ct.derAnt.ESQ === cs.derAnt.ESQ - 2 && ct.def.DFF === cs.def.DFF + 1 && ct.defEsp.FOGO === 7 && ct.tot.AGI === cs.tot.AGI + 5, 'derivado, defesa e defesa específica recebem o próprio temporário');
  ok(ct.der.ESQ - cs.der.ESQ === -2 && ct.vars.VIT_TMP === 3 && ct.vars.VIT === ct.tot.VIT && cs.vars.VIT_TMP === 0, 'AGI temporária não mexe na Esquiva (derivado usa a base); variável VIT_TMP');
  ok(j(R.calcular(pv, cfg0, { temp: {} }).tot) === j(cs.tot) && j(R.calcular(pv, cfg0, { temp: null }).recursos) === j(cs.recursos), 'sem temporários, nada muda');
  const rr = R.resumo(pv, cfg0, null, { tmp }), rr0 = R.resumo(pv, cfg0, null, {});
  ok(rr.attrs.VIT === rr0.attrs.VIT + 3 && rr.recursos[0].max === rr0.recursos[0].max + 30 && rr.defEsp.FOGO === 7 && rr0.defEsp.FOGO === 0, 'o resumo pega os temporários do estado sozinho');
  ok(R.resumo(pv, cfg0, { temp: {} }, { tmp }).attrs.VIT === rr0.attrs.VIT, 'a não ser que quem chama já os tenha passado');
  ok(rr0.recursos[0].min === 0 && rr0.recursos[0].inicio === null, 'no resumo, cada barra diz o piso e o começo');

  // "todos os atributos": uma chave só, que soma nos cinco de uma vez (bônus temporário, poção, ferimento)
  {
    const todos = { a: { n: 'Banquete', k: 'ATR', v: 2, t: 1 }, b: { n: 'Força', k: 'FOR', v: 3, t: 2 }, c: { n: 'minúscula', k: 'atr', v: 1, t: 3 }, d: { n: 'desligado', k: 'ATR', v: 50, off: true, t: 4 } };
    const Tt = R.temporarios(todos), c0t = R.calcular(pv, cfg0), c1t = R.calcular(pv, cfg0, { temp: todos });
    ok(R.CHAVE_TODOS === 'ATR' && R.NOMES_BONUS.ATR === 'Todos os atributos' && R.CHAVES_BONUS.indexOf('ATR') < 0 && R.CHAVES_BONUS.length === 10, 'a chave "todos os atributos" existe à parte das dez de sempre');
    ok(j(Tt.soma) === j({ FOR: 6, DES: 3, VIT: 3, CAN: 3, AGI: 3, ESQ: 0, FUR: 0, PER: 0, DFF: 0, DFM: 0 }) && Tt.lista.map(x => x.k).join() === 'ATR,FOR,ATR,ATR', 'soma nos cinco atributos (e só neles): ' + j(Tt.soma));
    ok(R.ATRIBS.every(a => c1t.tot[a.k] === c0t.tot[a.k] + (a.k === 'FOR' ? 6 : 3) && c1t.base[a.k] === c0t.base[a.k]) && c1t.der.ESQ === c0t.der.ESQ && c1t.def.DFF === c0t.def.DFF && c1t.vars.DES_TMP === 3, 'na ficha: cada atributo sobe o seu tanto, a base não muda, derivados e defesas ficam como estavam');
    ok(c1t.recursos[0].max === c0t.recursos[0].max + 30, 'e as barras que dependem de um atributo acompanham (HP = VIT*10 sobe 30)');
    const ft = R.ferimentos({ x: { p: 'peito', t: 'corte', g: 2, k: 'ATR', v: -2, c: 1 } }), cft = R.calcular(pv, cfg0, { fer: { x: { p: 'peito', t: 'corte', g: 2, k: 'ATR', v: -2, c: 1 } } });
    ok(ft.lista[0].k === 'ATR' && ft.soma.FOR === -2 && ft.soma.AGI === -2 && ft.soma.ESQ === 0 && R.ATRIBS.every(a => cft.tot[a.k] === c0t.tot[a.k] - 2) && R.textoDoFerimento(ft.lista[0]) === 'Corte médio · Peito · −2 em todos os atributos', 'ferimento que pesa em todos os atributos: "' + R.textoDoFerimento(ft.lista[0]) + '"');
    const pbt = Object.assign(base(), { bolsa: [{ id: 'p9', t: 'pocao', nome: 'Elixir do herói', bk: 'atr', bv: 2, bd: '1 cena' }] }), ut = R.usarItem(pbt, R.calcular(pbt, cfg0), { qtd: { p9: 1 } }, 'p9', null, 77, 'tX');
    ok(R.bolsa(pbt, { qtd: { p9: 1 } })[0].bk === 'ATR' && ut.ok && ut.estado.tmp.tX.k === 'ATR' && R.textoDoUso(ut) === 'Todos os atributos +2 (1 cena) · era a última unidade' && R.previaDoUso(pbt, R.calcular(pbt, cfg0), { qtd: { p9: 1 } }, R.bolsa(pbt, { qtd: { p9: 1 } })[0]).join(' | ').includes('Todos os atributos +2'), 'poção que dá bônus em todos os atributos: "' + R.textoDoUso(ut) + '"');
    ok(R.ATRIBS.every(a => R.calcular(pbt, cfg0, { temp: ut.estado.tmp }).tot[a.k] === R.calcular(pbt, cfg0).tot[a.k] + 2), 'e, usada, os cinco sobem 2');
  }

  // bolsas
  const pb = base();
  pb.bolsa = [{ id: 'p1', t: 'pocao', nome: 'Poção de cura', rec: 'hp', val: '30' }, { id: 'p2', t: 'pocao', nome: 'Elixir', rec: 'san', val: '-2d6', bk: 'for', bv: 4, bd: '3 turnos' }, { id: 'b1', t: 'bomba', nome: 'Bomba de fumaça', nota: 'cega por 1 turno' }, { id: 'm1', t: 'coisa', nome: 'Ferro' }, { nome: 'sem id' }, null, { id: 'p3', t: 'pocao', nome: 'Só bônus', bk: 'FOGO', bv: 5 }, { id: 'p4', t: 'pocao', nome: 'Torta', rec: 'hp', val: 'abc' }];
  const estB = { rec: { hp: 60 }, qtd: { p1: 2, p2: 1, b1: 3, p3: '1', p4: 1, m1: -4 } };
  const B = R.bolsa(pb, estB);
  ok(B.length === 6 && B[0].qtd === 2 && B[3].t === 'material' && B[3].qtd === 0 && B[1].bk === 'FOR' && B[4].qtd === 1 && R.bolsa({}, null).length === 0, 'a bolsa arrumada: quantidade do estado (0 se não há), tipo desconhecido vira material — ' + j(B.map(x => [x.id, x.t, x.qtd])));
  ok(j(R.lerEfeito('30')) === j({ fixo: 30 }) && j(R.lerEfeito(' +12,5 ')) === j({ fixo: 12.5 }) && j(R.lerEfeito('−10')) === j({ fixo: -10 }) && j(R.lerEfeito('2d6+3')) === j({ sinal: 1, dados: '2d6+3' }) && j(R.lerEfeito('-D8')) === j({ sinal: -1, dados: 'd8' }) && R.lerEfeito('') === null && !!R.lerEfeito('abc').erro && !!R.lerEfeito('2d').erro, 'o efeito escrito: valor fixo, dados, sinal na frente; vazio; errado');
  const cb = R.calcular(pb, cfg0);
  const u1 = R.usarItem(pb, cb, estB, 'p1');
  ok(u1.ok && u1.estado.rec.hp === 90 && u1.estado.qtd.p1 === 1 && u1.sobra === 1 && u1.barra.de === 60 && u1.barra.para === 90 && u1.barra.delta === 30 && u1.bonus === null && estB.rec.hp === 60 && estB.qtd.p1 === 2, 'usar a poção de cura: +30 na barra, uma a menos, e o estado recebido não muda — ' + j(u1.estado));
  ok(R.textoDoUso(u1) === 'HP 60 → 90 (+30) · resta 1', 'o texto do uso: "' + R.textoDoUso(u1) + '"');
  const u1b = R.usarItem(pb, cb, { rec: { hp: 95 }, qtd: { p1: 1 } }, 'p1');
  ok(u1b.estado.rec.hp === 100 && u1b.sobra === 0 && /era a última/.test(R.textoDoUso(u1b)), 'a cura não passa do máximo; a última unidade avisa');
  const u2 = R.usarItem(pb, cb, estB, 'p2', 9, 1234, 'tNovo');
  ok(u2.ok && u2.estado.rec.san === 21 && u2.barra.delta === -9 && u2.estado.tmp.tNovo.k === 'FOR' && u2.estado.tmp.tNovo.v === 4 && u2.estado.tmp.tNovo.d === '3 turnos' && u2.estado.tmp.tNovo.t === 1234 && u2.bonus.id === 'tNovo' && u2.estado.qtd.p2 === 0 && u2.estado.rec.hp === 60, 'poção com rolagem e bônus: −9 na barra (o sinal vale para a conta) e o bônus temporário entra no estado — ' + j(u2.estado));
  ok(R.textoDoUso(u2) === 'Sangue 30 → 21 (−9) · Força +4 (3 turnos) · era a última unidade', 'texto: "' + R.textoDoUso(u2) + '"');
  ok(R.calcular(pb, cfg0, { temp: u2.estado.tmp }).tot.FOR === cb.tot.FOR + 4, 'e o bônus da poção passa a contar no atributo');
  const u2n = R.usarItem(pb, cb, { qtd: { p2: 1 }, rec: { san: -10 } }, 'p2', 30);
  ok(u2n.estado.rec.san === -15, 'veneno numa barra com piso para no piso');
  const u3 = R.usarItem(pb, cb, estB, 'b1');
  ok(u3.ok && u3.estado.qtd.b1 === 2 && u3.barra === null && u3.bonus === null && j(u3.estado.rec) === j(estB.rec) && R.textoDoUso(u3) === 'restam 2', 'bomba: só gasta uma (nada é aplicado sozinho)');
  const u4 = R.usarItem(pb, cb, estB, 'p3', 0, 5, 'tF');
  ok(u4.ok && u4.barra === null && u4.estado.tmp.tF.k === 'FOGO' && /Defesa: Fogo \+5/.test(R.textoDoUso(u4)), 'poção só de bônus (defesa contra fogo): ' + R.textoDoUso(u4));
  const u5 = R.usarItem(pb, cb, estB, 'p4');
  ok(u5.ok && u5.barra === null && u5.estado.qtd.p4 === 0 && u5.estado.rec.hp === 60, 'efeito escrito errado: a poção é gasta, a barra não muda');
  ok(!R.usarItem(pb, cb, estB, 'm1').ok && /Não há mais Ferro/.test(R.usarItem(pb, cb, estB, 'm1').erro) && !R.usarItem(pb, cb, estB, 'nada').ok && !R.usarItem(pb, cb, {}, 'p1').ok, 'sem unidades (ou sem o item) não há o que usar');
  ok(j(R.previaDoUso(pb, cb, estB, B[0])) === j(['HP 60 → 90 (+30)']) && j(R.previaDoUso(pb, cb, estB, B[1])) === j(['Sangue 30 − 2d6, rolado na hora', 'Força +4 (3 turnos)']) && R.previaDoUso(pb, cb, estB, B[2]).length === 0 && R.previaDoUso(pb, cb, estB, B[5]).length === 0 && j(R.previaDoUso(pb, cb, { rec: { hp: 95 } }, B[0])) === j(['HP 95 → 100 (+30)']), 'a prévia do uso, em palavras: ' + j(B.map(x => R.previaDoUso(pb, cb, estB, x))));
  ok(R.DEFESAS_ESP.length === 13 && R.BOLSAS.length === 5 && R.NOMES_BONUS.FOR === 'Força' && R.NOMES_BONUS.PSI === 'Defesa: Psicológico' && Object.isFrozen(R.DEFESAS_ESP), 'as 13 defesas específicas e os 5 tipos de bolsa');
}
// ---------- ferimentos, relacionamentos (romance e segredo) e missões ----------
{
  const pf = R.personagemPadrao('Ferido');
  pf.defEsp = { FOGO: 4 };
  const c0 = R.calcular(pf, cfg0);
  const fer = { f1: { p: 'bracoE', t: 'corte', g: 3, s: { sg: 1, en: 1 }, n: 'faca', k: 'des', v: 2, c: 20 }, f2: { p: 'peito', t: 'queim', g: 2, k: 'FOGO', v: -3, c: 10 },
    f3: { p: 'cauda', t: 'corte', k: 'FOR', v: 9 }, f4: 'lixo', f5: { p: 'peD', t: 'inventado', g: 9, k: 'NADA', v: 5, c: 30 }, f6: { p: 'maoD', c: 30 } };
  const F = R.ferimentos(fer);
  ok(F.lista.length === 4 && j(F.lista.map(f => f.id)) === j(['f2', 'f1', 'f5', 'f6']), 'ferimentos: só os de partes que existem, do mais antigo para o mais novo — ' + j(F.lista.map(f => f.id)));
  ok(F.lista[1].k === 'DES' && F.lista[1].v === -2 && F.lista[1].s.sg && F.lista[1].s.en && !F.lista[1].s.inf && F.lista[1].n === 'faca', 'a penalidade é sempre para menos (2 vira −2); os estados vêm como sim/não');
  ok(F.lista[2].t === 'corte' && F.lista[2].g === 3 && F.lista[2].k === '' && F.lista[3].g === 1 && F.lista[3].v === 0, 'tipo desconhecido vira corte, gravidade fica entre 1 e 3, chave desconhecida não soma');
  ok(F.soma.DES === -2 && F.soma.FOR === 0 && F.esp.FOGO === -3, 'a soma das penalidades, nas dez chaves e nas defesas específicas');
  const c1 = R.calcular(pf, cfg0, { fer });
  ok(c1.tot.DES === c0.tot.DES - 2 && c1.base.DES === c0.base.DES && c1.defEsp.FOGO === 1 && c1.tmp.DES === -2 && c1.fer.DES === -2 && c1.ferEsp.FOGO === -3 && c1.ferimentos.length === 4 && c1.vars.DES_TMP === -2, 'no cálculo, a penalidade conta como um bônus temporário (e não mexe na base)');
  const c2 = R.calcular(pf, cfg0, { fer, temp: { t1: { n: 'Ensopado', k: 'DES', v: 5 } } });
  ok(c2.tot.DES === c0.tot.DES + 3 && c2.tmp.DES === 3 && c2.fer.DES === -2 && c2.temporarios.length === 1, 'ferimento e bônus temporário na mesma chave se somam (o que é de cada um fica à parte)');
  ok(j(R.calcular(pf, cfg0, { fer: {} })) === j(c0) && j(R.calcular(pf, cfg0, { fer: null })) === j(c0), 'sem ferimentos, a conta é a de sempre');
  ok(R.resumo(pf, cfg0, null, { fer }).attrs.DES === c0.tot.DES - 2 && R.resumo(pf, cfg0, { fer: {} }, { fer }).attrs.DES === c0.tot.DES, 'o resumo pega os ferimentos do estado sozinho (a não ser que quem chama já os tenha passado)');
  ok(R.textoDoFerimento(F.lista[1]) === 'Corte grave · Braço esquerdo · sangrando, enfaixado · −2 Destreza' && R.textoDoFerimento(F.lista[0]) === 'Queimadura média · Peito · −3 Defesa: Fogo' && R.textoDoFerimento(F.lista[3], true) === 'Corte leve', 'o texto de um ferimento: "' + R.textoDoFerimento(F.lista[1]) + '" · "' + R.textoDoFerimento(F.lista[0]) + '"');
  ok(j(R.sinalDeFerido(fer)) === j({ n: 4, grave: 3, sangra: true, inf: false }) && j(R.sinalDeFerido(null)) === j({ n: 0, grave: 0, sangra: false, inf: false }), 'o sinal do token: quantos, o mais grave, se sangra');
  ok(R.PARTES.length === 12 && R.TIPOS_FER.length === 6 && R.GRAVIDADES.length === 3 && R.ESTADOS_FER.length === 5 && Object.isFrozen(R.PARTES), 'o corpo tem 12 partes; 6 tipos, 3 gravidades e 5 estados de ferimento');

  // relacionamentos: o formato antigo (lista) e o novo (mapa), em ordem
  const antigo = { san: 80, rel: [{ id: 'a', alvo: 'pc2', nome: 'Kaito', v: 30 }, { id: 'b', nome: 'Velho do porto', v: -150 }, 'lixo', { nome: 'sem id' }] };
  const L0 = R.relacoes(antigo);
  ok(L0.length === 2 && L0[0].id === 'a' && L0[0].alvo === 'pc2' && L0[0].rom === null && L0[1].v === -100 && L0[1].alvo === null && R.temRelacoes(antigo) && !R.temRelacoes({}) && !R.temRelacoes(null), 'a lista antiga continua sendo lida (valor dentro de −100..100, sem trilha de romance)');
  const novo = { rels: { z: { nome: 'Z', v: 1, o: 0 }, b: { nome: 'B', v: 2, o: 2, rom: 99 }, a: { nome: 'A', alvo: 'pc9', oc: 1, v: 77, rom: 3, o: 1 } }, rel: [{ id: 'velha', nome: 'não conta', v: 1 }] };
  const L1 = R.relacoes(novo);
  ok(j(L1.map(e => e.id)) === j(['z', 'a', 'b']) && L1[2].rom === 10 && L1[1].oc && L1[1].v === 0 && L1[1].rom === null, 'o mapa novo vale no lugar da lista, na ordem guardada; romance entre −10 e +10; a linha de valor escondido não mostra valor mesmo que ele esteja ali');
  // o que o mestre vê
  const seg = { a: { v: 40, rom: -4 }, s1: { l: 1, nome: 'Segredo', alvo: 'pc3', v: -20, rom: 2, o: 5 }, orfa: { v: 9 }, z: { l: 1, nome: 'duplicada', v: 0, o: 9 } };
  const LM = R.relacoesDoMestre(novo, seg);
  ok(j(LM.map(e => e.id + ':' + e.modo)) === j(['z:aberta', 'a:valor', 'b:aberta', 's1:mestre']) && LM[1].v === 40 && LM[1].rom === -4 && LM[3].v === -20 && LM[3].alvo === 'pc3', 'o mestre vê as abertas, a de valor escondido com o valor que ele guarda, e as que só ele tem (o que a ficha já tem não se repete; valor sem linha é ignorado) — ' + j(LM.map(e => e.id + ':' + e.modo)));
  ok(R.relacaoCom(novo, seg, 'pc3').id === 's1' && R.relacaoCom(novo, null, 'pc3') === null && R.relacaoCom(novo, seg, 'pc9').v === 40 && R.relacaoCom(novo, null, 'pc9').v === 0, 'o que o personagem sente por alguém, na visão do mestre e na do jogador');

  // mudanças: nada do que entra é alterado
  const antes = j(antigo);
  let r = R.mexerRelacao(antigo, {}, { t: 'rom', id: 'a', rom: 4 });
  ok(r.mudou && j(antigo) === antes && !('rel' in r.estado) && r.estado.san === 80 && j(r.estado.rels) === j({ a: { nome: 'Kaito', o: 0, alvo: 'pc2', v: 30, rom: 4 }, b: { nome: 'Velho do porto', o: 1, v: -100 } }), 'a primeira mudança passa a lista antiga para o mapa (o resto do estado fica) — ' + j(r.estado));
  let m = R.mexerRelacao(r.estado, r.seg, { t: 'esconder', id: 'a' });
  ok(m.mudou && j(m.estado.rels.a) === j({ nome: 'Kaito', o: 0, alvo: 'pc2', oc: 1 }) && j(m.seg) === j({ a: { v: 30, rom: 4 } }) && j(r.seg) === j({}), 'esconder o valor: na ficha fica só o nome; o valor e o romance vão para o mestre');
  ok(!R.mexerRelacao(m.estado, null, { t: 'valor', id: 'a', v: 99 }).mudou && !R.mexerRelacao(m.estado, null, { t: 'rom', id: 'a', rom: 1 }).mudou && !R.mexerRelacao(m.estado, null, { t: 'tirar', id: 'a' }).mudou && !R.mexerRelacao(m.estado, null, { t: 'revelar', id: 'a' }).mudou, 'quem não é o mestre não muda, não tira nem revela uma linha de valor escondido');
  ok(R.mexerRelacao(m.estado, null, { t: 'valor', id: 'b', v: 12 }).estado.rels.b.v === 12 && R.mexerRelacao(m.estado, null, { t: 'valor', id: 'b', v: 12 }).seg === null, 'mas muda as abertas');
  let m2 = R.mexerRelacao(m.estado, m.seg, { t: 'valor', id: 'a', v: 55 });
  ok(m2.mudou && m2.estado === m.estado && m2.seg.a.v === 55 && m2.seg.a.rom === 4, 'o mestre muda o valor escondido: só o que ele guarda muda (a ficha nem é tocada)');
  let m3 = R.mexerRelacao(m2.estado, m2.seg, { t: 'revelar', id: 'a' });
  ok(j(m3.estado.rels.a) === j({ nome: 'Kaito', o: 0, alvo: 'pc2', v: 55, rom: 4 }) && j(m3.seg) === j({}), 'revelar devolve o valor (o de agora) à ficha e o mestre deixa de guardá-lo');
  ok(!R.mexerRelacao(m3.estado, m3.seg, { t: 'revelar', id: 'a' }).mudou && !R.mexerRelacao(m3.estado, m3.seg, { t: 'valor', id: 'a', v: 55 }).mudou && !R.mexerRelacao(m3.estado, m3.seg, { t: 'valor', id: 'nada', v: 1 }).mudou, 'o que não muda nada diz que não mudou');
  ok(R.mexerRelacao(m3.estado, m3.seg, { t: 'rom', id: 'a', rom: null }).estado.rels.a.rom === undefined && R.mexerRelacao(m3.estado, m3.seg, { t: 'rom', id: 'b', rom: 0 }).estado.rels.b.rom === 0, 'tirar a trilha de romance é diferente de romance zero');
  // NPC: a linha inteira com o mestre
  let n1 = R.mexerRelacao({ rec: { hp: 3 } }, {}, { t: 'nova', id: 'n1', alvo: 'pc2', nome: 'Kaito', comMestre: true });
  ok(n1.mudou && j(n1.estado) === j({ rec: { hp: 3 } }) && j(n1.seg) === j({ n1: { l: 1, nome: 'Kaito', v: 0, o: 0, alvo: 'pc2' } }), 'linha nova de um NPC: nasce só com o mestre; a ficha não muda');
  n1 = R.mexerRelacao(n1.estado, n1.seg, { t: 'nova', id: 'n2', nome: 'Rei', comMestre: true });
  n1 = R.mexerRelacao(n1.estado, n1.seg, { t: 'valor', id: 'n2', v: -40 });
  n1 = R.mexerRelacao(n1.estado, n1.seg, { t: 'rom', id: 'n1', rom: -3 });
  ok(n1.seg.n2.o === 1 && n1.seg.n2.v === -40 && n1.seg.n1.rom === -3 && !R.temRelacoes(n1.estado) && R.relacoesDoMestre(n1.estado, n1.seg).length === 2, 'valor e romance dessas linhas mudam só no que o mestre guarda');
  let n2 = R.mexerRelacao(n1.estado, n1.seg, { t: 'abrir', id: 'n2' });
  ok(j(n2.estado.rels) === j({ n2: { nome: 'Rei', o: 1, v: -40 } }) && !('n2' in n2.seg) && R.relacoesDoMestre(n2.estado, n2.seg).length === 2, 'abrir uma linha aos jogadores passa-a para a ficha');
  let n3 = R.mexerRelacao(n2.estado, n2.seg, { t: 'guardar', id: 'n2' });
  ok(!R.temRelacoes(n3.estado) && !('rels' in n3.estado) && n3.seg.n2.l === 1 && n3.seg.n2.v === -40, 'e guardar de volta tira-a da ficha');
  let n4 = R.mexerRelacao(n3.estado, n3.seg, { t: 'tirar', id: 'n1' });
  ok(j(Object.keys(n4.seg)) === j(['n2']) && !R.mexerRelacao(n3.estado, null, { t: 'tirar', id: 'n1' }).mudou, 'tirar uma linha que só o mestre tem');
  ok(R.mexerRelacao(n3.estado, n3.seg, { t: 'nova', id: 'n2', nome: 'de novo', comMestre: true }).mudou === false && R.mexerRelacao(n3.estado, null, { t: 'nova', id: 'j1', nome: 'Do jogador', comMestre: true }).estado.rels.j1.v === 0, 'id repetido não cria outra; "com o mestre" pedido por quem não é o mestre cria aberta');
  // a lista antiga na ficha de um NPC: conta como do mestre, e passa para ele na primeira mudança
  const npc = { lapros: 4, rel: [{ id: 'k1', alvo: 'pc1', nome: 'Dain', v: 25 }, { id: 'k2', nome: 'A cidade', v: -10 }] };
  ok(j(R.relacoesDoMestre(npc, {}, true).map(e => e.id + ':' + e.modo)) === j(['k1:mestre', 'k2:mestre']) && j(R.relacoesDoMestre(npc, {}, false).map(e => e.modo)) === j(['aberta', 'aberta']) && R.relacaoCom(npc, {}, 'pc1', true).modo === 'mestre', 'na ficha de um NPC, a lista antiga já aparece para o mestre como "só dele"');
  const gl = R.mexerRelacao(npc, {}, { t: 'guardar-legado', npc: true });
  ok(gl.mudou && !('rel' in gl.estado) && !('rels' in gl.estado) && gl.estado.lapros === 4 && j(gl.seg) === j({ k1: { l: 1, nome: 'Dain', v: 25, o: 0, alvo: 'pc1' }, k2: { l: 1, nome: 'A cidade', v: -10, o: 1 } }) && j(npc.rel.length) === '2', 'guardar o que é antigo: as linhas saem da ficha e ficam com o mestre, com os mesmos valores');
  ok(!R.mexerRelacao(gl.estado, gl.seg, { t: 'guardar-legado', npc: true }).mudou && !R.mexerRelacao(npc, {}, { t: 'guardar-legado' }).mudou && !R.mexerRelacao(npc, null, { t: 'guardar-legado', npc: true }).mudou, 'de novo não muda nada; sem ser NPC, ou sem ser o mestre, também não');
  const gv = R.mexerRelacao(npc, {}, { t: 'valor', id: 'k1', v: 60, npc: true });
  ok(gv.mudou && !('rel' in gv.estado) && !('rels' in gv.estado) && gv.seg.k1.v === 60 && gv.seg.k2.v === -10, 'qualquer mudança do mestre na ficha de um NPC leva junto o que era antigo');
  const gn = R.mexerRelacao(npc, {}, { t: 'nova', id: 'k3', nome: 'Novo', comMestre: true, npc: true });
  ok(gn.seg.k3.o === 2 && Object.keys(gn.seg).length === 3 && !R.temRelacoes(gn.estado), 'e a linha nova entra depois das que já existiam');
  const ga = R.mexerRelacao(gl.estado, gl.seg, { t: 'abrir', id: 'k2', npc: true });
  ok(j(ga.estado.rels) === j({ k2: { nome: 'A cidade', o: 1, v: -10 } }) && j(R.relacoesDoMestre(ga.estado, ga.seg, true).map(e => e.id + ':' + e.modo)) === j(['k1:mestre', 'k2:aberta']) && !R.mexerRelacao(ga.estado, ga.seg, { t: 'guardar-legado', npc: true }).mudou, 'uma linha que o mestre abriu (formato novo) fica aberta: não é "antiga"');
  const tn = R.mexerRelacao(m3.estado, m3.seg, { t: 'tirar', id: 'b' }), vn = R.mexerRelacao(tn.estado, tn.seg, { t: 'nova', id: 'b', nome: 'Velho do porto', v: -100, o: 1 });
  ok(j(R.relacoes(vn.estado)) === j(R.relacoes(m3.estado)), 'tirar e pôr de volta (com a ordem que tinha) dá na mesma lista');
  ok(R.ROM_MAX === 10, 'a trilha de romance tem 10 corações');

  // missões
  const mis = { m1: { t: 'Achar a espada', d: 'x'.repeat(3000), r: '50 lapros', e: 'feita', c: 2, de: 'j', o: { a: { t: 'Falar com o ferreiro', ok: 1, n: 1 }, b: { t: 'Ir à forja', n: 0 }, c: 'lixo' } },
    m2: { t: 'Outra', c: 5 }, m3: { t: 'Perdida', e: 'falhou', c: 1 }, m4: { t: 'Primeira', e: 'inventado', c: 3 }, m5: 7 };
  const M = R.missoes(mis);
  ok(j(M.map(x => x.id)) === j(['m4', 'm2', 'm1', 'm3']) && M[0].e === 'ativa' && M[2].de === 'j' && M[0].de === 'm', 'missões em ordem: as ativas primeiro (pela criação), depois as concluídas, depois as que falharam — ' + j(M.map(x => x.id)));
  ok(M[2].total === 2 && M[2].feitos === 1 && j(M[2].objs.map(o => o.id)) === j(['b', 'a']) && M[2].d.length === 2000 && M[2].r === '50 lapros' && M[1].total === 0, 'cada missão traz os objetivos em ordem e quantos estão feitos');
  ok(R.missoes(null).length === 0 && R.missoes([1, 2]).length === 0 && R.MIS_ESTADOS.length === 3, 'sem missões, lista vazia');

  // a barra de XP
  ok(j(R.xpDe(null, 3)) === j({ v: 0, min: 0, max: 30, falta: 30, fracao: 0, cheia: false, minProprio: false, maxProprio: false }) && R.xpDe({}, 1).max === 10 && R.xpDe({}, 'x').max === 10 && R.xpDe({ xp: 'lixo' }, 2).max === 20, 'sem nada guardado: de 0 a 10 por nível, vazia — ' + j(R.xpDe(null, 3)));
  const x1 = R.xpDe({ xp: { v: 45, min: 20, max: 120 } }, 5);
  ok(x1.v === 45 && x1.min === 20 && x1.max === 120 && x1.falta === 75 && x1.fracao === 0.25 && !x1.cheia && x1.minProprio && x1.maxProprio, 'com mínimo e máximo digitados: a fração é entre os dois (25 de 100 → 25%)');
  ok(R.xpDe({ xp: { v: 5, min: 20 } }, 4).v === 20 && R.xpDe({ xp: { v: -3 } }, 1).v === 0, 'o XP não fica abaixo do mínimo');
  const x2 = R.xpDe({ xp: { v: 12 } }, 1);
  ok(x2.v === 12 && x2.cheia && x2.falta === 0 && x2.fracao === 1, 'mas pode passar do máximo (12 de 10: cheia)');
  ok(R.xpDe({ xp: { v: 3, min: 50, max: 10 } }, 1).max === 50 && R.xpDe({ xp: { v: 3, min: 50, max: 10 } }, 1).cheia && R.xpDe({ xp: { min: 5, max: 5 } }, 1).fracao === 1, 'máximo abaixo do mínimo vale o mínimo (e a barra conta como cheia)');
  const e0 = { rec: { hp: 3 }, xp: { v: 12 } }, s1 = R.subirNivelXp(e0, 1);
  ok(j(s1) === j({ rec: { hp: 3 }, xp: { v: 2 } }) && j(e0.xp) === j({ v: 12 }) && R.xpDe(s1, 2).max === 20 && R.xpDe(s1, 2).v === 2, 'subir de nível: o que passou do máximo fica (12 de 10 → 2 de 20); sem máximo digitado, ele acompanha o nível');
  const s2 = R.subirNivelXp({ xp: { v: 100, min: 0, max: 100 } }, 7);
  ok(j(s2.xp) === j({ v: 0, min: 0, max: 110 }), 'com máximo digitado: ganha +10 (100 → 110), o mínimo fica, o XP volta ao mínimo');
  const s3 = R.subirNivelXp({ xp: { v: 57, min: 20, max: 50 } }, 2);
  ok(j(s3.xp) === j({ v: 27, min: 20, max: 60 }), 'com mínimo diferente de zero, a sobra conta a partir dele (57 de 20–50 → 27 de 20–60)');
  ok(R.XP_PASSO === 10, 'o passo do máximo é 10');
}
// carrega também como script de página
const pg = vm.createContext({}); pg.window = pg; pg.globalThis = pg;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../tc/rules.js'), 'utf8'), pg);
ok(pg.TC && typeof pg.TC.rules.calcular === 'function', 'carrega numa página (window.TC.rules)');

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
