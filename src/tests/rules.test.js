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
// carrega também como script de página
const pg = vm.createContext({}); pg.window = pg; pg.globalThis = pg;
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../tc/rules.js'), 'utf8'), pg);
ok(pg.TC && typeof pg.TC.rules.calcular === 'function', 'carrega numa página (window.TC.rules)');

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
