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
// carrega também como script de página
const pg = vm.createContext({}); pg.window = pg; pg.globalThis = pg;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../tc/rules.js'), 'utf8'), pg);
ok(pg.TC && typeof pg.TC.rules.calcular === 'function', 'carrega numa página (window.TC.rules)');

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
