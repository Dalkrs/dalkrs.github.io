// Bateria do lote 125 (as Cenas): o banheiro e os objetos novos nos geradores.
//   · os seis objetos do banheiro existem (o biombo de pano é outro: o "biombo" continua o oriental, do lote 54);
//   · gerando os lugares de furtividade (cada tamanho, com e sem andares), cada um dos 28 objetos novos (os 22 do lote
//     122 e os 6 do banheiro) aparece em algum lugar; o banheiro sai na mansão e nas casas das ruas.
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
(async () => {
  const t = await open({ w: 1300, h: 850 });
  const r = await t.page.evaluate(async () => {
    const F = __tc.Furtividade, S = __tc.Store.S, P = __tc.Props.P;
    const NOVOS = ['comoda', 'penteadeira', 'escrivaninha', 'relogioPe', 'quadro', 'lustre', 'cofreParede', 'sinoAlarme', 'casinhaCao', 'guizos', 'gradeJanela', 'alcapao', 'escadaMao', 'cordaGancho', 'claraboia', 'chamine', 'canoEsgoto', 'cestoRoupa', 'carrinhoMao', 'pilhaLenha', 'tonel', 'prateleiraVinho', 'banheira', 'latrina', 'lavatorio', 'espelho', 'toalheiro', 'biomboPano'];
    const onde = {}; NOVOS.forEach(k => { onde[k] = new Set(); });
    for (const id of F.IDS) for (const [tam, cima, porao, seed] of [['pequeno', 0, false, 3], ['medio', 1, true, 11], ['grande', 2, true, 29]]) {
      const L = F.LUGARES[id], antes = new Set(S.order);
      await L.criar(L.gerar({ tamanho: tam, guardas: 'normal', alvo: 'sorteio', cima, porao }, { seed }), '', {});
      for (const x of S.order.filter(x => !antes.has(x))) for (const k of S.scenes[x].tokens) if (onde[k.prop]) onde[k.prop].add(id);
    }
    return { faltam: NOVOS.filter(k => !onde[k].size), banho: [...onde.banheira].sort(), existem: ['banheira', 'latrina', 'lavatorio', 'espelho', 'toalheiro', 'biomboPano'].every(k => P[k] && P[k].g === 'banho'), oriental: P.biombo.g === 'oriental' };
  });
  ok(r.existem && r.oriental, 'os seis objetos do banheiro (e o biombo oriental continua o dele): ' + JSON.stringify(r));
  ok(!r.faltam.length, 'os 28 objetos novos aparecem nos geradores — faltam: ' + JSON.stringify(r.faltam));
  ok(JSON.stringify(r.banho) === JSON.stringify(['mansao', 'ruas']), 'o banheiro sai na mansão e nas casas das ruas: ' + JSON.stringify(r.banho));
  const inesperados = t.errs.filter(e => !/favicon/.test(e));
  ok(!inesperados.length, 'sem erros no console: ' + inesperados.slice(0, 3).join(' | '));
  await t.close();
  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
