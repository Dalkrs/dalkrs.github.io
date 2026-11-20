// (lote 195) As agulhas do Ninja no fluxo das barras: Agulha no Fluxo ganha a metade (para baixo); Fluxo Selado não ganha.
const P = require('../../tc/barras-painel.js');
let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
const ganha = (cs, n) => { const b = P.instancia('ninja', 4); const c = P.ctxDe({ nome: 'X', logar() {}, conds: () => cs, rodada: () => 1 }, b); return [c.ganhar(n, 'teste'), b.v]; };
chk(ganha([], 5)[0] === 5, 'sem agulha: ganha tudo');
chk(ganha(['agulhaFluxo'], 5)[0] === 2, 'Agulha no Fluxo: metade, para baixo');
chk(ganha(['agulhaFluxo'], 1)[0] === 0, 'a metade de 1 é nada');
chk(ganha(['fluxoSelado'], 5)[0] === 0, 'Fluxo Selado: nada');
chk(P.instancia('ninja', 4).def.ganhos.some(g => g.c === 'Pôs Sangramento ou agulha'), 'o Jutsu enche com agulha');
console.log(`${ok} verificações passaram${fail ? ', ' + fail + ' falharam' : ''}`);
process.exit(fail ? 1 : 0);
