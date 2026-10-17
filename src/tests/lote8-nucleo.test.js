// Lote 8, as contas (sem navegador):
//   · (parte 2) a ferida permanente nas regras da ficha: o podre (entre 0 e o máximo), o valor atual preso no teto (o
//     máximo menos o podre) — o anotado e o de quando não há nada anotado (a barra "cheia" fica no teto) —, a cura que
//     para no teto (aplicarDelta: as poções) e o dano que continua valendo;
//   · (parte 2) no Acampamento, o descanso (longo, curto e o de 100%) e o efeito de uma comida param no teto, e a linha
//     do descanso diz quanto apodreceu;
//   · (parte 2) o Limite de dano não entra em conta nenhuma.
const R = require('../../tc/rules.js');
const N = require('../../acampamento/nucleo.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));

/* ---- as regras: o podre e o teto ---- */
{
  const pc = R.personagemPadrao('Dain');
  pc.recursos = [{ id: 'hp', nome: 'HP', fml: '100' }, { id: 'sp', nome: 'SP', fml: '40' }];
  const c = R.calcular(pc);
  eq([R.podreDe({ podre: { hp: 20 } }, 'hp', 100), R.podreDe({ podre: { hp: -5 } }, 'hp', 100), R.podreDe({ podre: { hp: 500 } }, 'hp', 100), R.podreDe({ podre: { hp: 'x' } }, 'hp', 100), R.podreDe({}, 'hp', 100), R.podreDe({ podre: { hp: 20 } }, 'hp', null), R.podreDe({ podre: 'lixo' }, 'hp', 100)],
    [20, 0, 100, 0, 0, 0, 0], 'o podre: entre 0 e o máximo; sem máximo, nada apodrece; lixo vale 0');
  const rs = R.estadoRecursos(pc, c, { podre: { hp: 20 } });
  eq(rs.map(r => [r.id, r.max, r.atual, r.podre]), [['hp', 100, 80, 20], ['sp', 40, 40, 0]], 'sem nada anotado, a barra "cheia" fica no teto (100 − 20 = 80); a outra barra não muda');
  eq(R.estadoRecursos(pc, c, { rec: { hp: 95 }, podre: { hp: 20 } })[0].atual, 80, 'o valor anotado acima do teto fica no teto');
  eq(R.estadoRecursos(pc, c, { rec: { hp: 30 }, podre: { hp: 20 } })[0].atual, 30, 'abaixo do teto, o valor anotado vale');
  eq(R.estadoRecursos(pc, c, { rec: { hp: 95 } })[0].atual, 95, 'sem ferida, nada muda');
  const cura = R.aplicarDelta({ rec: { hp: 50 }, podre: { hp: 20 } }, 'hp', 100, 45, 0, null);
  eq([cura.rec.hp, cura.podre], [80, { hp: 20 }], 'a cura (uma poção: aplicarDelta) para no teto, e o podre fica');
  eq(R.aplicarDelta({ rec: { hp: 50 }, podre: { hp: 20 } }, 'hp', 100, -15, 0, null).rec.hp, 35, 'o dano continua valendo');
  eq(R.aplicarDelta({ rec: { hp: 50 } }, 'hp', 100, 45, 0, null).rec.hp, 95, 'sem ferida, a cura vai até o máximo');
  eq(R.aplicarDelta({ podre: { hp: 100 } }, 'hp', 100, 10, -10, null).rec.hp, 0, 'tudo podre: a cura não passa de zero (o piso negativo continua)');
  // o Limite de dano é só um número de consulta
  const p2 = JSON.parse(JSON.stringify(pc)); p2.limDano = 35;
  eq(JSON.stringify(R.calcular(p2)), JSON.stringify(R.calcular(pc)), 'o Limite de dano não muda conta nenhuma da ficha');
  eq(JSON.stringify(R.resumo(p2, R.cfgPadrao(), {}, {})), JSON.stringify(R.resumo(pc, R.cfgPadrao(), {}, {})), '(nem o resumo)');
}

/* ---- o Acampamento: o descanso e a comida param no teto ---- */
{
  const camp = N.normalizar({ provisoes: [{ id: 'pao', nome: 'Pão', qtd: 9 }] });
  const ana = { id: 'a', nome: 'Ana', recursos: [{ id: 'hp', nome: 'HP', max: 100, atual: 30, podre: 20 }, { id: 'sp', nome: 'SP', max: 40, atual: 10, podre: 0 }], san: null, conf: null, poderes: [] };
  const L = N.planejar(camp, 'longo', [ana]);
  eq(L.linhas[0].recursos, [{ id: 'hp', nome: 'HP', max: 100, de: 30, para: 80, podre: 20 }, { id: 'sp', nome: 'SP', max: 40, de: 10, para: 40 }], 'o descanso longo (100%) enche só até o teto (80) e diz quanto apodreceu');
  const camp2 = N.normalizar({ provisoes: [{ id: 'pao', nome: 'Pão', qtd: 9 }], regras: { curto: { rec: 60, prov: 0 } } });
  const C = N.planejar(camp2, 'curto', [ana]);
  eq(C.linhas[0].recursos[0], { id: 'hp', nome: 'HP', max: 100, de: 30, para: 80, podre: 20 }, 'o descanso curto (60% do máximo: +60) também para no teto');
  const anaCom = { id: 'a', nome: 'Ana', recursos: [{ id: 'hp', nome: 'HP', max: 100, atual: 95, podre: 20 }], san: null, conf: null, poderes: [] };
  eq(N.planejar(camp, 'longo', [anaCom]).linhas[0].recursos[0], { id: 'hp', nome: 'HP', max: 100, de: 80, para: 80, podre: 20 }, 'o valor acima do teto conta como o teto');
  const comInicio = { id: 'a', nome: 'Ana', recursos: [{ id: 'hp', nome: 'HP', max: 100, atual: 10, inicio: 90, podre: 20 }], san: null, conf: null, poderes: [] };
  eq(N.planejar(camp, 'longo', [comInicio]).linhas[0].recursos[0], { id: 'hp', nome: 'HP', max: 100, de: 10, para: 80, inicio: 80, podre: 20 }, 'a barra que começa em 90 volta só até o teto (80)');
}

console.log(bad ? `${n - bad} verificações passaram, ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
