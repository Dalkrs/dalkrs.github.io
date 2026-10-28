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
      // o Bloqueio (lote 5) não existe na original: nas fichas sorteadas (sem bloqueio) ele vale 0 e o resto bate
      if (x && typeof x === 'object' && !Array.isArray(x) && y && typeof y === 'object' && 'BLQ' in y && !('BLQ' in x)) {
        if (y.BLQ !== 0) ok(false, `(${modo}) personagem ${i}, campo ${k}: o bloqueio de quem não tem bloqueio devia ser 0 (veio ${y.BLQ})`);
        y = Object.assign({}, y); delete y.BLQ;
      }
      // o Embate (lote 6) também não existe na original: nos secundários ele é VIT/2, para baixo, + BLOQ (0 nas sorteadas)
      if (x && typeof x === 'object' && !Array.isArray(x) && y && typeof y === 'object' && 'EMB' in y && !('EMB' in x)) {
        const esperado = k === 'der' ? Math.floor(b.base.VIT / 2) : k === 'derAnt' ? Math.floor(b.ant.VIT / 2) : 0;
        if (y.EMB !== esperado) ok(false, `(${modo}) personagem ${i}, campo ${k}: o Embate devia ser ${esperado} (veio ${y.EMB})`);
        y = Object.assign({}, y); delete y.EMB;
      }
      ok(j(x) === j(y),`(${modo}) personagem ${i}, campo ${k}: original ${j(x).slice(0, 160)} · novo ${j(y).slice(0, 160)}`);
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
  ok(j(c3.eq) === j(R.calcular(Object.assign(base(), { itens: [{ id: 'i1', equipado: true, bonus: { VIT: 2 } }] }), cfg0).eq) && Object.keys(c3.eq).length === 12, 'o bônus de sempre dos itens continua com as doze chaves (as dez de antes, o Bloqueio e o Embate)');
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
    ok(R.CHAVE_TODOS === 'ATR' && R.NOMES_BONUS.ATR === 'Todos os atributos' && R.CHAVES_BONUS.indexOf('ATR') < 0 && R.CHAVES_BONUS.length === 12 && R.CHAVES_BONUS[8] === 'EMB' && R.CHAVES_BONUS[11] === 'BLQ', 'a chave "todos os atributos" existe à parte das doze de sempre (o Embate com os secundários; o Bloqueio é a última)');
    ok(j(Tt.soma) === j({ FOR: 6, DES: 3, VIT: 3, CAN: 3, AGI: 3, ESQ: 0, FUR: 0, PER: 0, EMB: 0, DFF: 0, DFM: 0, BLQ: 0 }) && Tt.lista.map(x => x.k).join() === 'ATR,FOR,ATR,ATR', 'soma nos cinco atributos (e só neles): ' + j(Tt.soma));
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
// ---------- poções com vários efeitos, e em outro personagem (lote 5) ----------
{
  const base5 = (id, nome, recs) => ({ id, nome, tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, defesas: { DFF: 0, DFM: 0 }, itens: [], recursos: recs, poderes: [] });
  const ana = base5('ana', 'Ana', [{ id: 'hpA', nome: 'HP', fml: '100' }, { id: 'spA', nome: 'SP', fml: '40' }]);
  ana.poderes = [{ id: 'pdA', nome: 'Poder divino', max: 5, atual: 1 }];
  ana.bolsa = [{ id: 'x1', t: 'pocao', nome: 'Elixir completo', fx: [
    { k: 'barra', rec: 'hpA', val: '30' }, { k: 'barra', rec: 'spA', val: '2d6' }, { k: 'sob', rec: 'hpA', val: '15' },
    { k: 'bonus', bk: 'for', bv: 3, dur: 'descanso' }, { k: 'bonus', bk: 'DFF', bv: 2, dur: 'rodadas', r: 4 }, { k: 'cond', c: 'bencao', r: 3 },
    { k: 'barra', rec: 'pd:pdA', val: '+2' }, { k: 'nada' }, { k: 'bonus', bk: 'XYZ', bv: 1 }] }, { id: 'x2', t: 'bomba', nome: 'Bomba', fx: [{ k: 'barra', rec: 'hpA', val: '30' }] }];
  const bia = base5('bia', 'Bia', [{ id: 'vidaB', nome: 'hp', fml: '80' }]);
  bia.poderes = [{ id: 'pdB', nome: 'PODER DIVINO', max: 3 }];
  const ca = R.calcular(ana, cfg0), cbia = R.calcular(bia, cfg0);
  const estA = { rec: { hpA: 50, spA: 10 }, qtd: { x1: 2, x2: 1 } }, estBia = { rec: { vidaB: 20 }, sob: { vidaB: 30 } };
  const B5 = R.bolsa(ana, estA);
  ok(B5[0].fx.length === 8 && B5[0].fx[3].bk === 'FOR' && B5[0].fx[4].r === 4 && B5[0].fx[7].bk === '' && B5[1].fx.length === 0 && B5[0].rec === 'hpA' && B5[0].bk === 'FOR',
    'a poção lê os efeitos (no máximo 8; tipo desconhecido sai; chave de bônus desconhecida fica vazia); bomba não tem efeito; o primeiro de cada, do jeito de antes — ' + j(B5[0].fx.map(e => e.k)));
  ok(j(R.efeitosDoItem({ rec: 'hp', val: '10', bk: 'des', bv: 2, bd: '1 cena' })) === j([{ k: 'barra', rec: 'hp', val: '10' }, { k: 'bonus', bk: 'DES', bv: 2, dur: '', r: 0, bd: '1 cena' }]), 'a poção de antes vira a lista equivalente');
  // em si mesma
  const u = R.usarItem(ana, ca, estA, 'x1', [null, 7], 500, 'tA');
  ok(u.ok && u.mesmo && u.estado === u.estadoAlvo && u.estado.rec.hpA === 80 && u.estado.rec.spA === 17 && u.estado.sob.hpA === 15 && u.estado.qtd.x1 === 1 && u.estado.pd.pdA === 3,
    'em si mesma: HP +30, SP +7 (o rolado), sobrevida 15, barra especial +2 e uma poção a menos — ' + j(u.estado));
  ok(u.estado.tmp.tA.k === 'FOR' && u.estado.tmp.tA.ate === 'descanso' && u.estado.tmp.tA_1.k === 'DFF' && u.estado.tmp.tA_1.r === 4 && !('d' in u.estado.tmp.tA) && j(u.conds) === j([{ c: 'bencao', r: 3 }]),
    'os dois bônus entram (um até o descanso, outro com 4 rodadas) e a condição volta para quem chama pôr no token — ' + j(u.estado.tmp));
  ok(R.textoDoUso(u) === 'HP 50 → 80 (+30) · SP 10 → 17 (+7) · Sobrevida 15 em HP · Força +3 (até o próximo descanso) · Defesa Física +2 (4 rodadas) · Poder divino 1 → 3 (+2) · Abençoado (3 rodadas) · resta 1', 'o texto do uso: "' + R.textoDoUso(u) + '"');
  ok(R.textoDoUso(u, { semValores: true, semCena: true }) === 'HP +30 · SP +7 · Sobrevida 15 em HP · Força +3 (até o próximo descanso) · Defesa Física +2 (4 rodadas) · Poder divino +2 · Abençoado: só pela cena · resta 1', 'sem os valores de quem recebeu, e com a condição que fica para a cena: "' + R.textoDoUso(u, { semValores: true, semCena: true }) + '"');
  ok(u.barra.id === 'hpA' && u.bonus.k === 'FOR' && u.bonus.d === 'até o próximo descanso' && estA.rec.hpA === 50 && estA.qtd.x1 === 2, 'o primeiro efeito de barra e o primeiro bônus, do jeito de antes; o estado recebido não muda');
  ok(R.calcular(ana, cfg0, { temp: u.estado.tmp }).tot.FOR === ca.tot.FOR + 3 && R.calcular(ana, cfg0, { temp: u.estado.tmp }).def.DFF === ca.def.DFF + 2, 'os bônus da poção contam na ficha');
  // em outra personagem: as barras pelo nome
  const v = R.usarItem(ana, ca, estA, 'x1', [null, 5], 600, 'tB', { pc: bia, calc: cbia, estado: estBia });
  ok(v.ok && !v.mesmo && v.estado.qtd.x1 === 1 && !v.estado.tmp && v.estado.rec.hpA === 50 && v.estadoAlvo.rec.vidaB === 50 && v.estadoAlvo.sob.vidaB === 30 && v.estadoAlvo.pd.pdB === 2 && v.estadoAlvo.tmp.tB.k === 'FOR',
    'em outra: a bolsa de quem usa perde uma; quem recebe ganha +30 no "hp" dela, a sobrevida fica a maior (30), a barra especial de mesmo nome sobe e os bônus vão para ela — ' + j(v.estadoAlvo));
  ok(j(v.faltam) === j(['SP']) && /sem SP/.test(R.textoDoUso(v)) && estBia.rec.vidaB === 20, 'a barra que ela não tem fica de fora (e o texto diz) — ' + R.textoDoUso(v));
  ok(j(R.previaDoUso(ana, ca, estA, B5[0], { pc: bia, calc: cbia, estado: estBia, nome: 'Bia' }, { semCena: true })) === j(['hp 20 → 50 (+30)', 'SP: Bia não tem essa barra', 'Sobrevida 15 em hp (fica a que já tem: 30)', 'Força +3 (até o próximo descanso)', 'Defesa Física +2 (4 rodadas)', 'Condição: Abençoado (3 rodadas) — só pela cena, no token', 'PODER DIVINO 0 → 2 (+2)']),
    'a prévia em outra pessoa: ' + j(R.previaDoUso(ana, ca, estA, B5[0], { pc: bia, calc: cbia, estado: estBia, nome: 'Bia' }, { semCena: true })));
  ok(j(R.faixaDoEfeito('30')) === j([30, 30]) && j(R.faixaDoEfeito('2d6+3')) === j([5, 15]) && j(R.faixaDoEfeito('-1d4')) === j([-4, -1]) && j(R.faixaDoEfeito('d8-2+1d4')) === j([0, 10]) && R.faixaDoEfeito('abc') === null,
    'de quanto a quanto um efeito pode dar (para conferir o que outro aparelho rolou)');
  ok(j(R.faixaDoEfeito('2d6-1d4')) === j([-2, 11]) && j(R.faixaDoEfeito('-2d6+1')) === j([-13, -3]), 'dados de menos no meio da conta (2d6−1d4: de −2 a 11) e o sinal da frente valendo para a conta inteira (−(2d6+1): de −13 a −3)');
  ok(R.efeitosDoItem({ fx: Array.from({ length: 11 }, (_, i) => ({ k: 'barra', rec: 'hp', val: String(i + 1) })) }).length === 8, 'no máximo 8 efeitos, mesmo com mais anotados no item');
  // sem os valores de quem recebe (o jogador não vê a vida de um NPC): só o que muda
  ok(j(R.previaDoUso(ana, ca, estA, B5[0], { pc: bia, calc: cbia, estado: estBia, nome: 'Bia' }, { semValores: true })) === j(['hp +30', 'SP: Bia não tem essa barra', 'Sobrevida 15 em hp', 'Força +3 (até o próximo descanso)', 'Defesa Física +2 (4 rodadas)', 'Condição: Abençoado (3 rodadas)', 'PODER DIVINO +2']),
    'a prévia sem os valores de quem recebe: ' + j(R.previaDoUso(ana, ca, estA, B5[0], { pc: bia, calc: cbia, estado: estBia, nome: 'Bia' }, { semValores: true })));
  ok(R.previaDoUso(ana, ca, estA, B5[0], null, { semValores: true })[1] === 'SP + 2d6, rolado na hora', 'e o efeito com dados diz que rola na hora: ' + R.previaDoUso(ana, ca, estA, B5[0], null, { semValores: true })[1]);
  ok(R.CONDICOES.length === 147 && R.CONDICOES.some(c => c.id === 'grito' && c.n === 'Grito de Batalha') && R.CONDICOES.some(c => c.id === 'ventania' && c.n === 'Ventania' && c.g === 'dano') && R.CONDICOES.some(c => c.id === 'vozVolkhum' && c.n === "Voz de Volkhum'Pansar" && c.g === 'racas') && R.COND_GRUPOS.length === 9 && R.nomeDaCondicao('resfriado') === 'Resfriado' && Object.isFrozen(R.CONDICOES), 'a lista das condições (as mesmas das Cenas; lote 9: com o Duplicado)');
}
// as condições da ficha (para a poção pôr no token) são as mesmas das Cenas: mesmo id, nome e grupo, na mesma ordem
{
  const fonte = fs.readFileSync(path.join(__dirname, '../cenas/src/js/01-base.js'), 'utf8');
  const bloco = (ini) => { const i = fonte.indexOf(ini), k = fonte.indexOf('];', i); return fonte.slice(i, k); };
  // (lote 19: as das raças têm mais campos depois do grupo, e o nome pode ter apóstrofo)
  const cenas = [...bloco('const CONDS = [').matchAll(/\{ id: '(\w+)', n: '((?:[^'\\]|\\.)+)', c: '[^']+', i: '[^']+', g: '(\w+)'/g)].map(m => ({ id: m[1], n: m[2].replace(/\\'/g, "'"), g: m[3] }));
  const grupos = [...bloco('const COND_TAGS = [').matchAll(/\{ id: '(\w+)', n: '[^']+', t: '([^']+)' \}/g)].map(m => ({ id: m[1], n: m[2] }));
  ok(cenas.length === 147 && j(cenas) === j(R.CONDICOES) && j(grupos) === j(R.COND_GRUPOS), 'as condições de TC.rules batem com as das Cenas (' + cenas.length + ')');
}
// ---------- barras especiais (os antigos poderes divinos), no estado ----------
{
  const f = { poderes: [{ id: 'a', nome: 'Fé', max: 3, atual: 2 }, { id: 'b', nome: '', max: 0, atual: 7 }, { id: 'c', nome: 'X', max: '4', atual: 9 }, { nome: 'sem id' }, null] };
  const lg = { rec: 'manual', qc: 1, ql: 2 };      // (lote 24: sem regra anotada, só à mão)
  ok(j(R.especiais(f, {})) === j([Object.assign({ id: 'a', nome: 'Fé', atual: 2, max: 3, inicio: null }, lg), Object.assign({ id: 'b', nome: 'Barra especial', atual: 7, max: 0, inicio: null }, lg), Object.assign({ id: 'c', nome: 'X', atual: 4, max: 4, inicio: null }, lg)]), 'sem nada no estado, vale o atual da ficha (preso no limite; sem nome, "Barra especial")');
  // (lote 23) o "começa em" da barra especial: inteiro, entre 0 e o limite; sem ele, null (cheia)
  ok(j(R.especiais({ poderes: [{ id: 'k', max: 5, inicio: 0 }, { id: 'f', max: 4, inicio: 9 }, { id: 'g', max: 4, inicio: '2.6' }, { id: 'h', max: 4, inicio: 'x' }] }, {}).map(x => x.inicio)) === j([0, 4, 3, null]), 'o "começa em" das barras especiais: 0 fica 0; acima do limite, o limite; arredonda; o que não é número, null');
  ok(R.especiais(f, { pd: { a: 0, b: 12 } })[0].atual === 0 && R.especiais(f, { pd: { a: 0, b: 12 } })[1].atual === 12, 'o estado manda quando tem o valor');
  const e1 = R.mudarEspecial({ rec: { hp: 3 } }, 'a', 9, 3), e2 = R.mudarEspecial(e1, 'b', -4, 0);
  ok(e1.pd.a === 3 && e1.rec.hp === 3 && e2.pd.b === 0 && e2.pd.a === 3, 'mudar: preso entre 0 e o limite (sem limite, só não fica negativo); o resto do estado fica');
  ok(e1.pd.b === undefined && e2 !== e1 && e2.pd !== e1.pd, 'mudar devolve um estado novo: o recebido não muda');
  ok(R.especiais(f, { pd: { a: -2 } })[0].atual === 0 && R.especiais({ poderes: [{ id: 'z', max: 0, atual: -5 }] }, {})[0].atual === 0, 'valor negativo (no estado ou na ficha) fica em 0');
  // (lote 6) a regra de recuperação de cada barra: o padrão é encher no descanso longo (o que valia antes para todas)
  const rg = R.especiais({ poderes: [{ id: 'q', max: 9, rec: 'quantia', qc: '3', ql: 5.6 }, { id: 'w', max: 2, rec: 'qualquer' }, { id: 'm', max: 2, rec: 'manual' }, { id: 'x', max: 2, rec: 'toString' }, { id: 'n', max: 2, rec: 'quantia', qc: -4, ql: 'a' }] }, {});
  ok(j(rg.map(b => [b.rec, b.qc, b.ql])) === j([['quantia', 3, 6], ['qualquer', 1, 2], ['manual', 1, 2], ['manual', 1, 2], ['quantia', 0, 0]]), 'rec, qc e ql saem arrumados (lote 24: regra desconhecida vira "manual", só à mão; quantia inteira, de 0 a 999): ' + j(rg.map(b => [b.rec, b.qc, b.ql])));
  ok(R.REC_ESPECIAL.map(r => r.k).join() === 'longo,qualquer,quantia,manual' && Object.isFrozen(R.REC_ESPECIAL) && Object.isFrozen(R.REC_ESPECIAL[0]), 'as quatro regras, nesta ordem (e ninguém as altera por engano)');
  ok(j(rg.map(R.textoRecEspecial)) === j(['+3 no descanso curto · +6 no longo', 'enche em qualquer descanso', 'só à mão (o descanso não mexe nela)', 'só à mão (o descanso não mexe nela)', 'o descanso não devolve nada'])
    && R.textoRecEspecial({ rec: 'quantia', qc: 0, ql: 4 }) === '+4 no descanso longo' && R.textoRecEspecial({ rec: 'quantia', qc: 2, ql: 0 }) === '+2 no descanso curto' && R.textoRecEspecial({}) === 'só à mão (o descanso não mexe nela)' && R.textoRecEspecial({ rec: 'longo' }) === 'enche no descanso longo', 'cada regra por extenso (lote 24: sem regra, só à mão)');
}
// ---------- a amputação (lote 6): um estado permanente do membro, à parte dos ferimentos ----------
{
  const a = R.amputados({ amp: { bracoE: { c: 5, n: 'na batalha do vau' }, pernaD: 1, cabeca: { c: 1 }, peD: { c: 9 }, maoD: 0, toString: { c: 1 } } });
  ok(j(Object.keys(a).sort()) === j(['bracoE', 'maoE', 'pernaD', 'peD'].sort()), 'só membros contam (a cabeça não; marca vazia não); sem o braço, sem a mão: ' + j(Object.keys(a)));
  ok(a.bracoE.n === 'na batalha do vau' && a.bracoE.c === 5 && a.bracoE.de === null && a.maoE.de === 'bracoE' && a.maoE.c === 5 && a.pernaD.de === null && a.pernaD.c === 0 && a.peD.de === null && a.peD.c === 9,
    'a anotação e o quando ficam; a parte de baixo diz de onde veio (o pé marcado sozinho continua dele)');
  ok(j(R.amputados({})) === '{}' && j(R.amputados(null)) === '{}' && j(R.amputados({ amp: [1] })) === '{}', 'sem nada: nenhum');
  ok(R.AMPUTAVEIS.length === 8 && Object.isFrozen(R.AMPUTAVEIS) && R.ABAIXO.pernaE === 'peE', 'os oito membros, e o que vai junto com cada um');
  const s = R.sinalDeFerido({}), c = R.calcular({ id: 'z', nome: 'Z', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, defesas: {}, itens: [], recursos: [] }, cfg0, { fer: {} });
  ok(s.n === 0 && c.ferimentos.length === 0, 'amputação não é ferimento: o token não ganha o sinal de ferido e as contas não mudam');
}
// ---------- grupos de troca dos equipamentos (lote 6): equipar um guarda os outros do mesmo grupo ----------
{
  const itens = [{ id: 'e1', nome: 'Espada de gelo I', troca: 'Espada de gelo', equipado: true, bonus: { FOR: 2 } }, { id: 'e2', nome: 'Espada de gelo II', troca: ' espada de GELO ', equipado: false },
    { id: 'e3', nome: 'Espada de gelo III', troca: 'Espáda de gelo', equipado: true }, { id: 'el', nome: 'Elmo', equipado: true }, { id: 'ar', nome: 'Arco', troca: 'Arma', equipado: true }, null];
  const r = R.equiparItem(itens, 'e2', true);
  ok(j(r.guardados) === j(['e1', 'e3']) && r.itens[1].equipado === true && r.itens[0].equipado === false && r.itens[2].equipado === false, 'equipar a II guarda a I e a III (o mesmo grupo, sem diferença de maiúsculas, espaços e acentos)');
  ok(r.itens[3] === itens[3] && r.itens[4] === itens[4] && r.itens[5] === null && r.itens[3].equipado && r.itens[4].equipado, 'os sem grupo e os de outro grupo não mudam (nem viram cópia)');
  ok(itens[0].equipado === true && itens[1].equipado === false && r.itens !== itens && r.itens[0] !== itens[0] && r.itens[0].bonus === itens[0].bonus, 'o recebido não muda: os itens que mudam são cópias');
  const d = R.equiparItem(itens, 'e1', false);
  ok(j(d.guardados) === j([]) && d.itens[0].equipado === false && d.itens[2].equipado === true, 'desequipar não mexe nos outros');
  const s = R.equiparItem(itens, 'el', true), x = R.equiparItem(itens, 'nada', true);
  ok(j(s.guardados) === j([]) && s.itens[3].equipado === true && j(x.guardados) === j([]) && x.itens.length === itens.length && x.itens !== itens, 'item sem grupo: só ele; id que não existe: nada muda');
  ok(R.grupoDeTroca({ troca: '  Arma principal ' }) === 'Arma principal' && R.grupoDeTroca({}) === '' && R.grupoDeTroca(null) === '' && R.grupoDeTroca({ troca: 'x'.repeat(60) }).length === 40, 'o nome do grupo, arrumado (até 40 letras)');
  ok(j(R.equiparItem(null, 'a', true)) === j({ itens: [], guardados: [], trocados: [], equipados: [], trocas: [] }), 'sem lista: nada');
  ok(j(r.trocados) === j(['e1', 'e3']) && j(r.equipados) === j([]) && r.itens[1].uso === 1, 'os guardados pelo grupo de troca vêm à parte; o equipado ganha a ordem de uso (1)');
}
// ---------- itens complementares (lote 6): a bainha e a luva só valem com a espada ----------
{
  const it = (id, nome, o) => Object.assign({ id, nome, equipado: false, bonus: {} }, o);
  const base = [
    it('e1', 'Espada do Gelo I', { troca: 'Espada de gelo', equipado: true, bonus: { FOR: 2 }, uso: 3 }),
    it('e2', 'Espada do Gelo II', { troca: 'Espada de gelo', bonus: { FOR: 4 }, uso: 1 }),
    it('b', 'Bainha de Selene', { req: 'g:Espada de gelo', equipado: true, bonus: { DFF: 1 } }),
    it('l', 'Luva da Geada', { req: 'g: espada de GÊLO', equipado: true, bonus: { DES: 1 } }),
    it('a', 'Anel da Bainha', { req: 'i:b', bonus: { CAN: 3 } }),
    it('x', 'Elmo', { equipado: true, bonus: { VIT: 1 } }),
  ];
  const eqs = l => l.filter(x => x && x.equipado !== false).map(x => x.id + (x.volta ? '*' : '')).join(',');
  const marcas = l => l.filter(x => x && x.volta).map(x => x.id).join(',');
  ok(j(R.reqDoItem(base[2])) === j({ t: 'g', g: 'Espada de gelo' }) && j(R.reqDoItem(base[4])) === j({ t: 'i', id: 'b' }) && R.reqDoItem(base[0]) === null && R.reqDoItem({ req: 'g:  ' }) === null && R.reqDoItem({ req: 'z:b' }) === null && R.reqDoItem({ req: 7 }) === null,
    'o que o item precisa: "i:<id>" (um item) ou "g:<grupo>" (um grupo de troca); o resto não vale');
  ok(R.nomeDoReq(base[2], base) === 'Espada de gelo' && R.nomeDoReq(base[4], base) === 'Bainha de Selene' && R.nomeDoReq(base[0], base) === '' && R.nomeDoReq({ req: 'i:sumiu' }, base) === '', 'o nome do requisito, para a tela');
  ok(base.map(x => R.itemAtivo(x, base)).join() === 'true,false,true,true,false,true', 'com a espada (um nível qualquer do grupo), a bainha e a luva valem (sem diferença de maiúsculas e acentos no grupo)');
  // guardar a espada guarda as duas, marcadas para voltar
  let r = R.equiparItem(base, 'e1', false);
  ok(eqs(r.itens) === 'x' && marcas(r.itens) === 'b,l' && j(r.guardados) === j(['b', 'l']) && j(r.trocados) === j([]) && j(r.equipados) === j([]), 'guardar a espada guarda a bainha e a luva (marcadas para voltar): ' + eqs(r.itens));
  ok(R.textoDoEquipar(r.itens, r, 'e1', false) === 'Guardou Espada do Gelo I; guardou junto: Bainha de Selene e Luva da Geada.', 'o aviso diz o que foi junto: ' + R.textoDoEquipar(r.itens, r, 'e1', false));
  ok(base[2].equipado === true && r.itens[5] === base[5], 'o recebido não muda, e o que não mudou continua o mesmo objeto');
  // equipar outro nível da espada: as duas voltam
  let r2 = R.equiparItem(r.itens, 'e2', true);
  ok(eqs(r2.itens) === 'e2,b,l,x' && marcas(r2.itens) === '' && j(r2.equipados) === j(['b', 'l']) && R.textoDoEquipar(r2.itens, r2, 'e2', true) === 'Equipou Espada do Gelo II; junto: Bainha de Selene e Luva da Geada.', 'equipar outro nível da espada traz as duas de volta: ' + R.textoDoEquipar(r2.itens, r2, 'e2', true));
  // trocar de nível não guarda as duas
  let r3 = R.equiparItem(r2.itens, 'e1', true);
  ok(eqs(r3.itens) === 'e1,b,l,x' && j(r3.trocados) === j(['e2']) && j(r3.guardados) === j(['e2']) && R.textoDoEquipar(r3.itens, r3, 'e1', true) === 'Equipou Espada do Gelo I no lugar de Espada do Gelo II.', 'trocar de nível guarda só a outra espada: ' + R.textoDoEquipar(r3.itens, r3, 'e1', true));
  // equipar a bainha sem espada: a espada vem junto (a última usada do grupo)
  const semEspada = R.equiparItem(R.equiparItem(base, 'e1', false).itens, 'l', false).itens;      // (a luva guardada à mão: perde a marca)
  ok(eqs(semEspada) === 'x' && marcas(semEspada) === 'b', '(sem espada; a luva guardada à mão não fica marcada)');
  let r4 = R.equiparItem(semEspada, 'b', true);
  ok(eqs(r4.itens) === 'e1,b,x' && j(r4.equipados) === j(['e1']) && R.textoDoEquipar(r4.itens, r4, 'b', true) === 'Equipou Bainha de Selene; junto: Espada do Gelo I.', 'equipar a bainha equipa a espada usada por último (a I, uso 3) — a luva, guardada à mão, fica: ' + R.textoDoEquipar(r4.itens, r4, 'b', true));
  const usouII = R.equiparItem(R.equiparItem(base, 'e2', true).itens, 'e2', false).itens;
  ok(eqs(R.equiparItem(usouII, 'b', true).itens) === 'e2,b,l,x', 'se a última usada foi a II, é ela que vem (e a luva, que tinha saído junto, volta)');
  // em cadeia: o anel precisa da bainha, que precisa da espada
  let r5 = R.equiparItem(semEspada, 'a', true);
  ok(eqs(r5.itens) === 'e1,b,a,x' && j(r5.equipados) === j(['e1', 'b']) && R.textoDoEquipar(r5.itens, r5, 'a', true) === 'Equipou Anel da Bainha; junto: Espada do Gelo I e Bainha de Selene.', 'em cadeia: o anel traz a bainha, que traz a espada');
  let r6 = R.equiparItem(r5.itens, 'e1', false);
  ok(eqs(r6.itens) === 'x' && marcas(r6.itens) === 'b,a', 'guardar a espada derruba a cadeia toda (as duas marcadas)');
  ok(eqs(R.equiparItem(r6.itens, 'e1', true).itens) === 'e1,b,a,x', 'e a espada de volta traz a cadeia toda');
  // as contas: o complementar sem o requisito não soma
  const pc = { id: 'p', nome: 'P', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, defesas: {}, recursos: [] };
  const conta = itens => { const k = R.calcular(Object.assign({}, pc, { itens }), cfg0); return [k.eq.FOR, k.eq.DFF, k.eq.DES, k.eq.VIT].join(); };
  ok(conta(base) === '2,1,1,1', 'com a espada: a espada, a bainha, a luva e o elmo somam');
  const torto = base.map(x => (x.id === 'e1' ? Object.assign({}, x, { equipado: false }) : x));      // (a bainha "equipada" sem espada: um estado de antes)
  ok(conta(torto) === '0,0,0,1', 'sem espada, a bainha e a luva marcadas como equipadas não somam (só o elmo)');
  const itensDef = [it('s', 'Escudo', { equipado: false, troca: 'Mão' }), it('t', 'Talismã', { req: 'i:s', equipado: true, rec: { hp: 10 }, def: { FOGO: 3 } })];
  const ex = R.calcular(Object.assign({}, pc, { itens: itensDef, recursos: [{ id: 'hp', nome: 'HP', fml: '10' }] }), cfg0);
  ok(ex.recursos[0].val === 10 && ex.defEsp.FOGO === 0, 'nem nas barras nem nas defesas específicas: ' + j({ hp: ex.recursos[0].val, fogo: ex.defEsp.FOGO }));
  // o requisito que entra no lugar de outro: o aviso diz quem entrou no lugar de quem
  const arco = [it('cl', 'Clava', { troca: 'Arma', equipado: true }), it('ar', 'Arco curto', { troca: 'Arma' }), it('al', 'Aljava', { req: 'i:ar' })];
  const ra = R.equiparItem(arco, 'al', true);
  ok(eqs(ra.itens) === 'ar,al' && j(ra.trocas) === j([{ por: 'ar', saiu: 'cl' }]) && R.textoDoEquipar(ra.itens, ra, 'al', true) === 'Equipou Aljava; junto: Arco curto (no lugar de Clava).', 'equipar a aljava traz o arco, que entra no lugar da clava: ' + R.textoDoEquipar(ra.itens, ra, 'al', true));
  // o que não prende: requisito que sumiu, grupo vazio, um precisa do outro
  ok(R.itemAtivo(it('z', 'Z', { req: 'i:sumiu', equipado: true }), base) && R.itemAtivo(it('z', 'Z', { req: 'g:ninguém', equipado: true }), base), 'requisito que não está na ficha não prende');
  const ciclo = [it('p1', 'P1', { req: 'i:p2', equipado: true }), it('p2', 'P2', { req: 'i:p1', equipado: true })];
  ok(R.itemAtivo(ciclo[0], ciclo) && R.itemAtivo(ciclo[1], ciclo) && eqs(R.equiparItem(ciclo, 'p1', false).itens) === '', 'um precisa do outro: equipados, os dois valem; guardar um guarda o outro');
  ok(eqs(R.equiparItem(R.equiparItem(ciclo, 'p1', false).itens, 'p2', true).itens) === 'p1,p2', 'e equipar um traz o outro (sem dar volta para sempre)');
  // o que volta respeita o grupo de troca dele
  const dupla = [it('w', 'Varinha', { troca: 'Mão', equipado: true }), it('k', 'Cristal', { troca: 'Foco', req: 'i:w', equipado: true }), it('f', 'Orbe', { troca: 'Foco' })];
  const sem = R.equiparItem(dupla, 'w', false).itens, comOrbe = R.equiparItem(sem, 'f', true).itens;
  ok(eqs(sem) === '' && marcas(sem) === 'k' && eqs(comOrbe) === 'f' && marcas(comOrbe) === 'k', '(o cristal saiu com a varinha; o orbe, do mesmo grupo de troca, foi equipado)');
  ok(eqs(R.equiparItem(comOrbe, 'w', true).itens) === 'w,f' && marcas(R.equiparItem(comOrbe, 'w', true).itens) === '', 'a varinha de volta não traz o cristal: o orbe ocupa o grupo dele (e a marca sai)');
}
// ---------- os tipos de equipamento (lote 7): a lista pronta, os da mesa, as seções e o palpite pelo nome ----------
{
  ok(R.TIPOS_ITEM.map(t => t.id).join() === 'arma,armadura,escudo,acessorio,vestimenta,ferramenta,outro' && Object.isFrozen(R.TIPOS_ITEM) && Object.isFrozen(R.TIPOS_ITEM[0]) && R.TIPOS_ITEM[3].sec === 'Acessórios',
    'a lista pronta: Arma, Armadura, Escudo, Acessório, Vestimenta, Ferramenta e Outro (com o nome da seção no plural)');
  const cfg = { tiposItem: [{ id: 'tp_tal', nome: '  Talismã ' }, { id: 'tp_x', nome: 'armas' }, { id: 'tp_y', nome: 'TALISMÃ' }, { id: 'ruim', nome: 'Sem prefixo' }, { id: 'tp_tal', nome: 'Repetido' }, { id: 'tp_v', nome: '' }, null, { id: 'tp_rel', nome: 'Relíquia do clã' }] };
  const criados = R.tiposCriados(cfg);
  ok(criados.map(t => t.id + '=' + t.nome).join() === 'tp_tal=Talismã,tp_rel=Relíquia do clã' && criados[0].criado === true && criados[0].sec === 'Talismã',
    'os da mesa, arrumados: id "tp_…", nome sem espaços nas pontas, sem repetir nome (nem o de um pronto, nem no plural) nem id: ' + criados.map(t => t.nome).join());
  const muitos = { tiposItem: Array.from({ length: 40 }, (_, i) => ({ id: 'tp_' + i, nome: 'Tipo ' + i })) };
  ok(R.tiposCriados(muitos).length === R.TIPOS_MAX && R.TIPOS_MAX === 30 && R.tiposCriados({}).length === 0 && R.tiposCriados(null).length === 0 && R.tiposCriados({ tiposItem: 'x' }).length === 0, 'no máximo 30; sem lista, nenhum');
  ok(R.tiposDeItem(cfg).map(t => t.id).join() === 'arma,armadura,escudo,acessorio,vestimenta,ferramenta,tp_tal,tp_rel,outro' && R.tiposDeItem(null).length === 7, 'a ordem das seções: os prontos, os da mesa e o Outro por último');
  ok(R.tipoDoItem({ tipo: 'escudo' }).nome === 'Escudo' && R.tipoDoItem({ tipo: 'tp_tal' }) === null && R.tipoDoItem({ tipo: 'tp_tal' }, R.tiposDeItem(cfg)).nome === 'Talismã' && R.tipoDoItem({}) === null && R.tipoDoItem(null) === null && R.tipoDoItem({ tipo: 'nada' }) === null,
    'o tipo do item: o da lista; sem tipo, ou um que saiu da lista, nenhum');
  const it = (id, tipo, equipado) => ({ id, nome: id, tipo, equipado });
  const lista = [it('a1', 'arma', false), it('t1', 'tp_tal', true), it('s1', undefined, true), it('a2', 'arma', true), null, it('x1', 'tp_sumiu', false), it('o1', 'outro', true), it('a3', 'arma', true), it('v1', 'vestimenta', false)];
  const sec = R.secoesDeItens(lista, cfg), txt = sec.map(s => (s.tipo ? s.tipo.id : '?') + ':' + s.itens.map(x => x.id).join('/')).join(' ');
  ok(txt === 'arma:a2/a3/a1 vestimenta:v1 tp_tal:t1 outro:o1 ?:s1/x1', 'as seções na ordem dos tipos, só as que têm item; em cada uma, os equipados primeiro (na ordem da ficha), depois os guardados; sem tipo (ou com tipo que sumiu), no fim: ' + txt);
  ok(R.secoesDeItens(null, cfg).length === 0 && R.secoesDeItens([], null).length === 0, 'sem itens: nenhuma seção');
  const palp = ['Katana de gelo Nv2', 'Escudo de carvalho', 'Couraça de couro', 'Anel do fogo', 'Manto da noite', 'Kit de ferreiro', 'Martelo de ferreiro', 'Bainha de jade', 'Luvas de seda', 'Elmo alado', 'CAJADO DO VENTO', 'Espada e escudo', 'Kit de flechas', 'Coisa estranha', '', null]
    .map(n => R.tipoPeloNome(n) || '-').join();
  ok(palp === 'arma,escudo,armadura,acessorio,vestimenta,ferramenta,arma,acessorio,vestimenta,armadura,arma,arma,ferramenta,-,-,-', 'o palpite pelo nome: a primeira palavra que diz alguma coisa decide (sem diferença de maiúsculas e acentos); sem palpite, nada: ' + palp);
}
// ---------- itens com níveis (lote 7): a lista de níveis, o nível de agora e o espelho no próprio item ----------
{
  const kat = { id: 'k', nome: 'Katana de gelo', equipado: true, tipo: 'arma', bonus: { FOR: 4, DFF: 1 }, efeito: 'Corte gélido', nv: 2,
    niveis: [{ bonus: { FOR: 2 } }, { bonus: { FOR: 4, DFF: 1 }, efeito: 'Corte gélido' }, { bonus: { FOR: 6, DFF: 2 }, rec: { hp: 10 }, def: { GELO: 2 }, efeito: 'Corte gélido +1 dado' }] };
  ok(R.NIVEIS_MAX === 10 && R.temNiveis(kat) && !R.temNiveis({ niveis: [{}] }) && !R.temNiveis({ niveis: [{}, null] }) && !R.temNiveis({}) && !R.temNiveis(null) && !R.temNiveis({ niveis: 'x' }), 'tem níveis: dois ou mais (um só, ou um só de verdade, é um item comum)');
  ok(R.nivelDoItem(kat) === 2 && R.nivelDoItem(Object.assign({}, kat, { nv: 9 })) === 3 && R.nivelDoItem(Object.assign({}, kat, { nv: 0 })) === 1 && R.nivelDoItem(Object.assign({}, kat, { nv: 'x' })) === 1 && R.nivelDoItem({}) === 1 && R.nivelDoItem(null) === 1,
    'o nível de agora, preso entre 1 e o último (o item comum está no 1)');
  const n3 = R.itemNoNivel(kat, 3);
  ok(n3 !== kat && n3.nv === 3 && JSON.stringify(n3.bonus) === '{"FOR":6,"DFF":2}' && n3.rec.hp === 10 && n3.def.GELO === 2 && n3.efeito === 'Corte gélido +1 dado' && n3.nome === 'Katana de gelo' && n3.tipo === 'arma',
    'no nível 3: o espelho (os números, as barras, as defesas e a passiva daquele nível) vai para o próprio item');
  ok(kat.nv === 2 && kat.bonus.FOR === 4 && kat.rec === undefined, 'o recebido não muda');
  const n1 = R.itemNoNivel(n3, 1);
  ok(n1.nv === 1 && JSON.stringify(n1.bonus) === '{"FOR":2}' && !('rec' in n1) && !('def' in n1) && !('efeito' in n1), 'de volta ao 1: sem barras, defesas nem passiva naquele nível, o item também fica sem');
  ok(R.itemNoNivel(kat, 99).nv === 3 && R.itemNoNivel(kat, -1).nv === 1 && R.itemNoNivel({ id: 'c', bonus: { FOR: 1 } }, 2).nv === undefined, 'o nível pedido fica preso entre 1 e o último; um item comum não muda');
  ok(R.niveisDoItem(kat).length === 3 && R.niveisDoItem(kat)[0].efeito === '' && JSON.stringify(R.niveisDoItem({ bonus: { FOR: 1 }, efeito: 'x' })) === JSON.stringify([{ bonus: { FOR: 1 }, rec: {}, def: {}, efeito: 'x' }]) && R.niveisDoItem(null).length === 0,
    'os níveis, arrumados (o item comum tem um só: o dele)');
  // o espelho que confere volta o mesmo item; o que não confere (mexeram só no item) é refeito pela lista
  const comZeros = Object.assign({}, kat, { bonus: { FOR: 4, DFF: 1, ESQ: 0, BLQ: 0 } });
  ok(R.espelharItem(kat) === kat && R.espelharItem(comZeros) === comZeros && R.espelharItem({ id: 'c' }).id === 'c', 'confere (um zero e a falta da chave contam igual): volta o mesmo item — abrir a ficha não a regrava');
  const torto = Object.assign({}, kat, { bonus: { FOR: 99 } }), certo = R.espelharItem(torto);
  ok(certo !== torto && certo.bonus.FOR === 4 && certo.bonus.DFF === 1 && torto.bonus.FOR === 99, 'não confere: refeito a partir do nível de agora (numa cópia)');
  ok(R.espelharItem(Object.assign({}, kat, { nv: 7 })).nv === 3 && R.espelharItem(Object.assign({}, kat, { efeito: 'outra' })).efeito === 'Corte gélido', 'o nível fora da faixa e a passiva trocada também se acertam');
  // um nível a mais e um a menos
  const comum = { id: 'c', nome: 'Arco', equipado: true, bonus: { DES: 2 }, rec: { sp: 3 }, efeito: 'Tiro certeiro' };
  const dois = R.itemComNivelNovo(comum);
  ok(R.temNiveis(dois) && dois.nv === 1 && dois.niveis.length === 2 && JSON.stringify(dois.niveis[1]) === JSON.stringify({ bonus: { DES: 2 }, rec: { sp: 3 }, def: {}, efeito: 'Tiro certeiro' }) && dois.niveis[1] !== dois.niveis[0] && dois.bonus.DES === 2 && dois.rec.sp === 3 && comum.niveis === undefined,
    'o item comum vira um item de dois níveis, os dois com os números dele (e fica no 1)');
  const quatro = R.itemComNivelNovo(kat);
  ok(quatro.niveis.length === 4 && quatro.nv === 2 && quatro.niveis[3].bonus.FOR === 6 && quatro.niveis[3].efeito === 'Corte gélido +1 dado' && quatro.bonus.FOR === 4, 'o nível novo começa igual ao último; o de agora não muda');
  let dez = kat; for (let i = 0; i < 12; i++) dez = R.itemComNivelNovo(dez);
  ok(dez.niveis.length === 10 && R.itemComNivelNovo(dez) === dez, 'no máximo 10 níveis (com 10, nada muda)');
  ok(R.itemSemNivel(kat, 3).niveis.length === 2 && R.itemSemNivel(kat, 3).nv === 2 && R.itemSemNivel(kat, 1).nv === 1 && R.itemSemNivel(kat, 1).bonus.FOR === 4 && R.itemSemNivel(kat, 2).nv === 1 && R.itemSemNivel(kat, 2).bonus.FOR === 2,
    'sem um nível: quem estava acima desce; sem o de agora, fica o de baixo — o espelho acompanha');
  const volta = R.itemSemNivel(R.itemSemNivel(kat, 1), 2);
  ok(!R.temNiveis(volta) && !('niveis' in volta) && !('nv' in volta) && volta.bonus.FOR === 4 && volta.efeito === 'Corte gélido' && volta.nome === 'Katana de gelo', 'sobrando um nível, volta a ser um item comum, com os números e a passiva daquele nível');
  ok(R.itemSemNivel(kat, 9) === kat && R.itemSemNivel(comum, 1) === comum, 'um nível que não existe, ou um item comum: nada muda');
  ok(R.textoDoNivel(kat, 2, 3) === 'Katana de gelo: Nv 2 → Nv 3' && R.textoDoNivel({}, 1, 2) === 'Item sem nome: Nv 1 → Nv 2', 'o texto da mudança de nível');
  // as contas usam o espelho: o nível de agora é o que soma
  const pc = { id: 'p', nome: 'P', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, defesas: {}, recursos: [{ id: 'hp', nome: 'HP', fml: '10' }] };
  const conta = k => { const c = R.calcular(Object.assign({}, pc, { itens: [k] }), cfg0); return [c.eq.FOR, c.eq.DFF, c.recursos[0].val, c.defEsp.GELO].join(); };
  ok(conta(kat) === '4,1,10,0' && conta(n3) === '6,2,20,2' && conta(n1) === '2,0,10,0', 'as contas seguem o nível de agora: ' + [conta(kat), conta(n3), conta(n1)].join(' | '));
}
// ---------- "Só funciona com…" com vários itens e com o nível mínimo (lote 7) ----------
{
  const it = (id, nome, o) => Object.assign({ id, nome, equipado: false, bonus: {} }, o);
  const katana = it('k', 'Katana de gelo', { equipado: true, uso: 2, nv: 1, niveis: [{ bonus: { FOR: 2 } }, { bonus: { FOR: 4 } }, { bonus: { FOR: 6 } }], bonus: { FOR: 2 } });
  const sabre = it('s', 'Sabre', { uso: 5 }), longa = it('l', 'Espada longa', { troca: 'Lâmina' });
  const bainha = it('b', 'Bainha de jade', { req: ['i:k', 'i:s', 'g:lamina', 'i:k', 'x:nada', 7], equipado: true, bonus: { DES: 1 } });
  const lista = [katana, sabre, longa, bainha];
  ok(JSON.stringify(R.reqsDoItem(bainha)) === JSON.stringify([{ t: 'i', id: 'k' }, { t: 'i', id: 's' }, { t: 'g', g: 'lamina' }]) && j(R.reqDoItem(bainha)) === j({ t: 'i', id: 'k' }),
    'a lista do que o item aceita, arrumada e sem repetir (o primeiro continua sendo o "requisito" de antes)');
  ok(j(R.reqsDoItem({ req: 'i:k@2' })) === j([{ t: 'i', id: 'k', nv: 2 }]) && j(R.reqsDoItem({ req: 'i:k@1' })) === j([{ t: 'i', id: 'k' }]) && j(R.reqsDoItem({ req: 'i:k@40' })) === j([{ t: 'i', id: 'k', nv: 10 }])
    && j(R.reqsDoItem({ req: 'i:a@b' })) === j([{ t: 'i', id: 'a@b' }]) && R.reqsDoItem({ req: [] }).length === 0 && R.reqsDoItem(null).length === 0 && R.reqsDoItem({ req: Array(30).fill(0).map((_, i) => 'i:x' + i) }).length === 20,
    '"i:<id>@<n>": do nível n para cima (o 1 é qualquer nível; até o 10); no máximo 20 na lista');
  ok(R.itemAtivo(bainha, lista) && R.nomeDoReq(bainha, lista) === 'Katana de gelo, Sabre ou lamina', 'vale com qualquer um deles (a katana está equipada): "' + R.nomeDoReq(bainha, lista) + '"');
  const semKatana = lista.map(x => (x === katana ? Object.assign({}, x, { equipado: false }) : x));
  ok(!R.itemAtivo(bainha, semKatana), 'sem nenhum deles equipado, não vale');
  const comLonga = semKatana.map(x => (x === longa ? Object.assign({}, x, { equipado: true }) : x));
  ok(R.itemAtivo(bainha, comLonga), 'qualquer item do grupo também serve (a espada longa, do grupo "Lâmina")');
  ok(R.itemAtivo(it('z', 'Z', { req: ['i:sumiu', 'g:ninguém'], equipado: true }), lista) && !R.itemAtivo(it('z', 'Z', { req: ['i:sumiu', 'i:s'], equipado: true }), lista) && R.nomeDoReq(it('z', 'Z', { req: ['i:sumiu', 'i:s'] }), lista) === 'Sabre',
    'o que saiu da ficha não conta: com todos fora, não prende; com um que ficou, é ele que vale (e o nome mostra só ele)');
  // o nível mínimo
  const pedeNv2 = it('p', 'Bainha real', { req: 'i:k@2', equipado: true, bonus: { DFF: 2 } });
  const l2 = [katana, pedeNv2];
  ok(!R.itemAtivo(pedeNv2, l2) && R.nomeDoReq(pedeNv2, l2) === 'Katana de gelo (Nv 2 ou mais)', 'com a katana no Nv 1, a bainha que pede "Nv 2 ou mais" não vale: "' + R.nomeDoReq(pedeNv2, l2) + '"');
  const k2 = R.itemNoNivel(katana, 2), l3 = [k2, pedeNv2];
  ok(R.itemAtivo(pedeNv2, l3) && R.itemAtivo(pedeNv2, [R.itemNoNivel(katana, 3), pedeNv2]), 'no Nv 2 (e no 3), vale');
  const pcB = { id: 'p', nome: 'P', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, defesas: {}, recursos: [] };
  const soma = l => { const c = R.calcular(Object.assign({}, pcB, { itens: l }), cfg0); return [c.eq.FOR, c.eq.DFF].join(); };
  ok(soma(l2) === '2,0' && soma(l3) === '4,2', 'nas contas também: ' + soma(l2) + ' → ' + soma(l3));
  // equipar o complementar traz, dos que servem, o usado por último — e no nível pedido
  const eqs = l => l.filter(x => x && x.equipado !== false).map(x => x.id).join(',');
  const tudoGuardado = [Object.assign({}, katana, { equipado: false }), Object.assign({}, sabre), Object.assign({}, longa), Object.assign({}, bainha, { equipado: false })];
  const r = R.equiparItem(tudoGuardado, 'b', true);
  ok(eqs(r.itens) === 's,b' && j(r.equipados) === j(['s']) && R.textoDoEquipar(r.itens, r, 'b', true) === 'Equipou Bainha de jade; junto: Sabre.', 'equipar a bainha traz, dos que servem, o usado por último (o sabre, uso 5): ' + R.textoDoEquipar(r.itens, r, 'b', true));
  const r2 = R.equiparItem([Object.assign({}, katana, { equipado: false }), Object.assign({}, pedeNv2, { equipado: false })], 'p', true);
  ok(eqs(r2.itens) === 'p' && j(r2.equipados) === j([]), 'nenhum no nível pedido (a katana no Nv 1): a bainha entra sozinha, sem efeito, e nada vem junto');
  const r3 = R.equiparItem([Object.assign({}, k2, { equipado: false }), Object.assign({}, pedeNv2, { equipado: false })], 'p', true);
  ok(eqs(r3.itens) === 'k,p', 'com a katana no Nv 2, ela vem junto');
  const r4 = R.equiparItem(lista, 'k', false);
  ok(eqs(r4.itens) === '' && r4.itens.find(x => x.id === 'b').volta === true, 'guardar a katana (o único equipado que servia) guarda a bainha, marcada para voltar');
}
// ---------- a fadiga (lote 6): uma pilha de 5 a 0, no estado ----------
{
  ok(R.FAD_MAX === 5 && R.FADIGA.length === 6 && R.FADIGA[5] === 'Descansado' && R.FADIGA[0] === 'Esgotado' && Object.isFrozen(R.FADIGA), 'a pilha vai de 0 (Esgotado) a 5 (Descansado)');
  ok(R.fadiga({}) === 5 && R.fadiga(null) === 5 && R.fadiga({ fad: 2 }) === 2 && R.fadiga({ fad: 9 }) === 5 && R.fadiga({ fad: -3 }) === 0 && R.fadiga({ fad: '3.6' }) === 4 && R.fadiga({ fad: 'x' }) === 5 && R.fadiga({ fad: 0 }) === 0,
    'sem nada anotado, cheia; fora da faixa, presa entre 0 e 5 (e o 0 vale: esgotado)');
  const e0 = { rec: { hp: 3 } }, e1 = R.mudarFadiga(e0, 1), e2 = R.mudarFadiga(e1, 12), e3 = R.mudarFadiga(e1, -1);
  ok(e1.fad === 1 && e2.fad === 5 && e3.fad === 0 && e1.rec.hp === 3 && e0.fad === undefined && e1 !== e0, 'mudar: devolve um estado novo, com a pilha presa entre 0 e 5 (o resto fica)');
  ok(R.usaFadiga({}, true) && !R.usaFadiga({}, false) && R.usaFadiga({ fad: 0 }, false) && !R.usaFadiga({ fad: null }, false) && !R.usaFadiga(null, false) && !R.usaFadiga({ fad: 'x' }, false),
    'em uso: na ficha de um jogador, ou com a fadiga anotada (0 também conta)');
}
// ---------- o Bloqueio (lote 5): valor próprio + itens, árvore e bônus; rola como a Esquiva ----------
{
  const pb = { id: 'b', nome: 'Bruna', tier: 'C', level: 3, tiers: { FOR: 'A', DES: 'B', AGI: 'C', VIT: 'D', CAN: 'E' }, pctProprio: null, defesas: { DFF: 2, DFM: 1, BLQ: 5 },
    itens: [{ id: 'e', nome: 'Escudo', equipado: true, bonus: { BLQ: 3, DFF: 1 } }, { id: 'g', nome: 'Guardado', equipado: false, bonus: { BLQ: 50 } }], recursos: [{ id: 'hp', nome: 'HP', fml: 'BLQ*10 + BLQ_B + BLQ_EQ' }] };
  const cb = R.calcular(pb, cfg0, { arvore: { BLQ: 2 }, temp: { t1: { n: 'Poção de pedra', k: 'BLQ', v: 4 } } });
  ok(cb.def.BLQ === 14 && cb.eq.BLQ === 3 && cb.def.DFF === 3, 'bloqueio = o digitado (5) + o escudo equipado (3) + a árvore (2) + o bônus (4) = 14; o item guardado não conta — ' + j(cb.def));
  ok(cb.vars.BLQ === 14 && cb.vars.BLQ_B === 5 && cb.vars.BLQ_EQ === 3 && cb.recursos[0].val === 148, 'vira variável das fórmulas (BLQ, BLQ_B, BLQ_EQ) — ' + cb.recursos[0].val);
  ok(R.valorDoAtributo(cb, 'BLQ') === 14 && R.ehDefesa('BLQ') && R.NOMES.BLQ === 'Bloqueio' && R.CHAVES_BONUS.includes('BLQ'), 'pode ser rolado (como a Esquiva) e é uma chave de bônus de item, árvore e poção');
  const sem = R.calcular(Object.assign({}, pb, { defesas: { DFF: 2, DFM: 1 }, itens: [] }), cfg0);
  ok(sem.def.BLQ === 0 && sem.vars.BLQ === 0, 'ficha antiga, sem bloqueio: vale 0 (e nada é gravado nela)');
  ok(R.resumo(pb, cfg0, { arvore: { BLQ: 2 } }).def.BLQ === 10, 'o resumo (o que as outras abas leem) traz o bloqueio — ' + j(R.resumo(pb, cfg0, { arvore: { BLQ: 2 } }).def));
  // o Embate (lote 6): VIT/2 (da base, para baixo) + o Bloqueio inteiro; é um secundário — rola, recebe bônus e vira variável
  const vit = cb.base.VIT;
  ok(cb.der.EMB === Math.floor(vit / 2) + 14 && R.ehDerivado('EMB') && R.NOMES.EMB === 'Embate' && R.valorDoAtributo(cb, 'EMB') === cb.der.EMB, 'Embate = VIT ' + vit + '/2, para baixo (' + Math.floor(vit / 2) + '), + o Bloqueio (14) = ' + cb.der.EMB);
  const ce = R.calcular(Object.assign({}, pb, { itens: pb.itens.concat({ id: 'm', nome: 'Manopla', equipado: true, bonus: { EMB: 2 } }), recursos: [{ id: 'r', nome: 'R', fml: 'EMB + EMBATE + EMB_B' }] }), cfg0, { arvore: { BLQ: 2 }, temp: { t1: { n: 'Poção de pedra', k: 'BLQ', v: 4 } } });
  ok(ce.der.EMB === cb.der.EMB + 2 && ce.eq.EMB === 2 && ce.recursos[0].val === 2 * ce.der.EMB + cb.der.EMB, 'um item com Embate +2 soma nele, e ele vira variável (EMB, EMBATE, EMB_B) — ' + ce.recursos[0].val);
  ok(R.calcular(Object.assign({}, pb, { tiers: { FOR: 'E', DES: 'E', AGI: 'E', VIT: 'A', CAN: 'E' }, defesas: {} , itens: [] }), cfg0).der.EMB % 1 === 0, 'sempre um número inteiro');
  ok(R.evalFormula('BLOQUEIO + BLOQ + BLQ_ARV + BLQ_TMP', cb.vars) === 34, 'nas fórmulas, o nome por extenso também vale (BLOQUEIO, BLOQ), e há o pedaço da árvore e o do bônus');
}
// ---------- a árvore (lote 6): os caminhos trancados que o mestre abre, as contas entre chaves e o custo de uso ----------
{
  const bib = { arvores: [{ id: 'a1', nodes: [{ id: 'n1', pais: [], graus: [{ custos: {}, bonus: { FOR: 1 } }] }] }, { id: 'a2', nodes: [] }], pools: [{ id: 'p1', nome: 'Pontos' }], naturezas: [], usos: [] };
  const ramo = { a: 'a1', nodes: [{ id: 'n2', pais: ['n1'], graus: [{ custos: { p9: 2 }, bonus: { FOR: 2, HP: 5 } }] }, { id: 'n1', pais: [], graus: [{ custos: {}, bonus: { FOR: 50 } }] }], defs: { pools: [{ id: 'p9', nome: 'Gelo' }, { id: 'p1', nome: 'outra' }] }, em: 'x' };
  const sk = { arvores: ['a1'], pontos: {}, alocados: { n1: 1, n2: 1 }, ramos: { n2: ramo, lixo: { a: 'a1' }, outro: { a: 'a_sumiu', nodes: [{ id: 'n7', graus: [{ bonus: { FOR: 9 } }] }] } } };
  ok(j(R.ramosDe(sk).map(r => r.id)) === j(['n2', 'outro']) && R.ramosDe({}).length === 0 && R.ramosDe(null).length === 0, 'os ramos abertos nas skills: os que têm árvore e nódulos (o torto fica de fora)');
  const bc = R.bibComRamos(bib, sk);
  ok(bc !== bib && bc.arvores[0].nodes.map(n => n.id).join() === 'n1,n2' && bc.arvores[0].nodes[0] === bib.arvores[0].nodes[0] && bc.arvores[1] === bib.arvores[1] && bib.arvores[0].nodes.length === 1,
    'a biblioteca do personagem: a de todos mais os nódulos do ramo (o que já está nela fica como está; a de todos não muda)');
  ok(j(bc.pools.map(x => x.id)) === j(['p1', 'p9']) && bc.pools[0].nome === 'Pontos', 'os tipos de ponto que só o ramo usa vêm com ele (o que já existe não é trocado)');
  ok(R.bibComRamos(bib, { ramos: {} }) === bib && R.bibComRamos(bib, null) === bib && R.bibComRamos(null, sk) === null, 'sem ramos (ou sem biblioteca), nada muda');
  ok(!bc.arvores.some(a => a.nodes.some(n => n.id === 'n7')), 'o ramo de uma árvore que não está na biblioteca (secreta, ainda trancada) fica de fora');
  ok(j(R.bonusDaArvore(sk, bib)) === j({ FOR: 3, HP: 5 }) && j(R.bonusDaArvore(Object.assign({}, sk, { ramos: undefined }), bib)) === j({ FOR: 1 }), 'os bônus dos graus do ramo aberto contam na ficha (e sem o ramo, não): ' + j(R.bonusDaArvore(sk, bib)));
  // as contas
  const vars = { FOR: 26, CAN: 13, LVL: 3, DFF: 4 };
  const ps = R.partesComContas('Causa {FOR*2 + 10} de dano e {floor(CAN/2)} de gelo; {xyz}{}', vars);
  ok(j(ps.map(x => x.t === 'txt' ? x.s : x.v)) === j(['Causa ', 62, ' de dano e ', 6, ' de gelo; ', null, '{}']) && ps[5].erro === 'Variável desconhecida: xyz' && j(ps[1].usa) === j([['FOR', 26]]),
    'as contas entre chaves viram o número do personagem (a que não dá diz por quê): ' + j(ps.map(x => x.t === 'txt' ? x.s : x.v)));
  ok(j(R.partesComContas('{for*2 + floor(can/2)}', vars)[0].usa) === j([['FOR', 26], ['CAN', 13]]), 'a conta diz as variáveis que usou, mesmo escritas em minúsculas (e sem as funções, como floor)');
  ok(R.textoComContas('Causa {for*2 + 10} de dano', vars) === 'Causa 62 de dano' && R.textoComContas('Causa {FOR*2 + 10}', null) === 'Causa {FOR*2 + 10}' && R.textoComContas(null, vars) === '', 'no texto: sem diferença de maiúsculas; sem personagem, a conta fica escrita');
  ok(R.textoComContas('{CAN/2}', vars, { arredondar: 'round' }) === '7' && R.textoComContas('{CAN/2}', vars) === '6' && R.textoComContas('{CAN/2}', vars, { arredondar: 'ceil' }) === '7', 'arredonda como a mesa manda (para baixo, se nada for dito)');
  ok(R.explicarConta(ps[1]) === 'Conta: FOR*2 + 10 · FOR 26' && /^Conta: xyz — Variável desconhecida/.test(R.explicarConta(ps[5])), 'passando o mouse: a conta e os valores que ela usou');
  // o custo de uso
  ok(j(R.usoLimpo([{ b: ' SP ', v: '10' }, { b: 'Energia', v: '{CAN/2}' }, { b: '', v: '3' }, { b: 'X', v: '' }, 7])) === j([{ b: 'SP', v: '10' }, { b: 'Energia', v: 'CAN/2' }]) && R.usoLimpo([]) === null && R.usoLimpo('x') === null,
    'o custo de uso, limpo: a barra e quanto (sem chaves); o incompleto sai');
  ok(R.usoLimpo([1, 2, 3, 4, 5].map(i => ({ b: 'B' + i, v: String(i) }))).length === R.MAX_USO, 'no máximo ' + R.MAX_USO + ' custos por grau');
  const cu = R.custoDeUso([{ b: 'SP', v: '10' }, { b: 'Energia', v: 'CAN/2' }, { b: 'Gelo', v: '2,5' }], vars);
  ok(j(cu.map(c => [c.barra, c.v, c.conta])) === j([['SP', 10, false], ['Energia', 6, true], ['Gelo', 2.5, false]]) && R.textoDoCusto([{ b: 'SP', v: '10' }, { b: 'Energia', v: 'CAN/2' }], vars) === '10 SP · 6 Energia',
    'o custo: número como está, conta com o número do personagem — ' + R.textoDoCusto([{ b: 'SP', v: '10' }, { b: 'Energia', v: 'CAN/2' }], vars));
  ok(R.textoDoCusto([{ b: 'Energia', v: 'CAN/2' }], null) === 'CAN/2 Energia' && R.custoDeUso(null, vars).length === 0, 'sem personagem, a conta do custo fica escrita');
}
// ---------- a árvore (lote 6): o que cada personagem alcança, com trancas umas dentro das outras e caminhos que se juntam ----------
{
  // o ─┬─ c
  //    ├─ L🔒 ─ g ─┬─ L2🔒 ─ u          Z: pede g E K       W: pede g OU K
  //    └─ M🔒 ─ K ─┴─ Z, W
  const no = (id, pais, extra) => Object.assign({ id, pais, regra: 'e', usos: [], graus: [{ custos: { p1: 1 }, bonus: { FOR: 1 } }] }, extra);
  const nodes = [no('o', []), no('c', ['o']), no('L', ['o'], { tranca: true }), no('g', ['L']), no('L2', ['g'], { tranca: true }), no('u', ['L2'], { graus: [{ custos: { p2: 1 } }] }),
    no('M', ['o'], { tranca: true }), no('K', ['M']), no('Z', ['g', 'K']), no('W', ['g', 'K'], { regra: 'ou' })];
  const bib = { arvores: [{ id: 't', nodes }], pools: [{ id: 'p1' }, { id: 'p2' }], naturezas: [], usos: [] };
  const vis = ab => [...R.visiveis(bib, ab)[0]].sort().join();
  ok(R.temTranca(bib) && !R.temTranca({ arvores: [{ nodes: [no('x', [])] }] }) && !R.temTranca(null), 'temTranca: só a biblioteca com um nódulo trancado');
  ok(vis([]) === 'c,o', 'sem nada aberto, só o que todos alcançam (o W, que pede um OU outro caminho trancado, também some): ' + vis([]));
  ok(vis(['L']) === 'L,W,c,g,o', 'aberto o L: o caminho dele, e o W (pede g OU K) — o Z (pede g E K) e o L2 (trancado) não: ' + vis(['L']));
  ok(vis(['L', 'M']) === 'K,L,M,W,Z,c,g,o' && vis(['L2']) === 'c,o' && vis(['L', 'L2']) === 'L,L2,W,c,g,o,u',
    'os dois abertos: o Z também; o L2 aberto com o L fechado não aparece (não dá para chegar nele)');
  const pac = R.bibVisivel(bib, []);
  ok(pac.arvores[0].nodes.map(n => n.id).join() === 'o,c' && pac.arvores[0].nodes[0] === nodes[0] && bib.arvores[0].nodes.length === 10 && R.bibVisivel(pac, []) === pac,
    'bibVisivel: a biblioteca só com o que se alcança (a original não muda; sem trancas, a mesma)');
  // os ramos como a Árvore os copia: de cada tranca, o que vem depois sem passar por outra tranca (e que não está à vista de todos)
  const copia = ids => ids.map(id => { const c = JSON.parse(JSON.stringify(nodes.find(n => n.id === id))); delete c.tranca; return c; });
  const ramos = { L: { a: 't', nodes: copia(['L', 'g', 'Z', 'W']), defs: {} }, M: { a: 't', nodes: copia(['M', 'K', 'Z', 'W']), defs: {} }, L2: { a: 't', nodes: copia(['L2', 'u']), defs: { pools: [{ id: 'p2' }] } } };
  const so = (...ks) => { const r = {}; ks.forEach(k => { r[k] = ramos[k]; }); return { ramos: r }; };
  const nos = b => b.arvores[0].nodes.map(n => n.id).sort().join();
  const pacote = { arvores: pac.arvores, pools: [{ id: 'p1' }], naturezas: [], usos: [] };
  // no aparelho do jogador (o pacote, sem trancas) e no do mestre (tudo): o mesmo resultado
  for (const ks of [['L'], ['L', 'M'], ['L2'], ['L', 'L2'], ['M'], ['L', 'M', 'L2']]) {
    const esperado = vis(ks), jog = nos(R.bibComRamos(pacote, so(...ks))), mes = nos(R.bibComRamos(bib, so(...ks)));
    ok(jog === esperado && mes === esperado, 'aberto ' + ks.join(' e ') + ': o jogador (pacote + ramos) e o mestre (a biblioteca toda) chegam ao mesmo — ' + jog + ' / ' + mes);
  }
  ok(!R.bibComRamos(pacote, so('L2')).pools.some(p => p.id === 'p2') && R.bibComRamos(pacote, so('L', 'L2')).pools.some(p => p.id === 'p2'),
    'o tipo de ponto do ramo só vem quando algum nódulo dele entra (o L2 aberto sem o L não dá pista)');
  // os bônus: os nódulos que ele tinha num caminho que o mestre fechou não contam (no mestre e no jogador)
  const sk = { arvores: ['t'], alocados: { o: 1, L: 1, g: 1, W: 1 } };
  ok(j(R.bonusDaArvore(Object.assign({}, sk, so('L')), bib)) === j({ FOR: 4 }) && j(R.bonusDaArvore(sk, bib)) === j({ FOR: 1 }) && j(R.bonusDaArvore(sk, pacote)) === j({ FOR: 1 }),
    'os bônus: com o caminho aberto, contam; fechado, os nódulos ficam guardados e não contam — nem na biblioteca do mestre');
}
// (lote 7) "Mexer em todos": a Fadiga em passos da pilha, o Conforto e a Sanidade de 0 a 100, só no que a ficha usa
{
  const U = { mente: true, fadiga: true };
  let r = R.mexerNaMente({ san: 80, conf: 5, fad: 4, rec: { hp: 3 } }, { conf: -10, san: -5, fad: -1 }, U);
  ok(j(r.estado) === j({ san: 75, conf: 0, fad: 3, rec: { hp: 3 } }) && j(r.so) === j(['conf', 'san', 'fad']) && j(r.antes) === j({ conf: 5, san: 80, fad: 4 }) && j(r.depois) === j({ conf: 0, san: 75, fad: 3 }),
    'mexer em todos: tira de cada um (o Conforto para no 0) e guarda o antes e o depois: ' + j(r));
  r = R.mexerNaMente({}, { conf: 10, san: 3, fad: 1 }, U);
  ok(j(r.estado) === j({ conf: 60 }) && j(r.so) === j(['conf']), 'sem nada anotado: Conforto 50 e Sanidade 100 de começo; a Sanidade e a Fadiga já no máximo não mudam: ' + j(r));
  const e0 = { conf: 0, san: 100 };
  r = R.mexerNaMente(e0, { conf: -5, san: 5 }, U);
  ok(r.estado === e0 && r.so.length === 0, 'nada muda (já nos limites): o mesmo objeto, sem chaves');
  r = R.mexerNaMente({ san: 90 }, { san: -5, conf: -5, fad: -2 }, { mente: false, fadiga: true });
  ok(j(r.estado) === j({ san: 90, fad: 3 }) && j(r.so) === j(['fad']) && r.antes.san === null, 'a ficha que não usa Sanidade e Conforto: só a Fadiga muda');
  r = R.mexerNaMente({ conf: 40 }, { conf: -5, fad: -1 }, { mente: true, fadiga: false });
  ok(j(r.estado) === j({ conf: 35 }) && r.antes.fad === null, 'a ficha que não usa a Fadiga: ela não é anotada');
  r = R.mexerNaMente({ conf: 40 }, { conf: 2.9, san: '-4' }, U);
  ok(r.depois.conf === 42 && r.depois.san === 96, 'os passos são inteiros (2,9 vira 2) e aceitam texto com número');
  ok(R.mexerNaMente(null, null, null).so.length === 0, 'sem nada, nada muda');
}
// carrega também como script de página
const pg = vm.createContext({}); pg.window = pg; pg.globalThis = pg;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../tc/rules.js'), 'utf8'), pg);
ok(pg.TC && typeof pg.TC.rules.calcular === 'function', 'carrega numa página (window.TC.rules)');

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
