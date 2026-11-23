// (lote 205) As condições novas das classes refeitas (lote 202) e o leitor que tira a ação do texto da árvore na hora
// (tc/habs-ler.js): o que não está no arquivo gerado é lido pelas Fichas.
const { open } = require('./lib');
(async () => {
  const t = await open(); const { page } = t; const ev = (fn, a) => page.evaluate(fn, a);
  let ok = 0, fail = 0; const chk = (c, m) => { if (c) ok++; else { fail++; console.log('FALHOU: ' + m); } };
  const novas = ['noAr', 'cargasVento', 'ponto', 'guardaAberta', 'mira', 'cravada', 'costelas', 'calor', 'compasso', 'acusacoes', 'eloVoto', 'rachado', 'placas', 'armaduraBrasa', 'peso', 'esfera', 'iluminado', 'broto', 'verso', 'par', 'lenda', 'envergonhado'];
  const faltam = await ev(l => l.filter(id => !__tc.COND_BY_ID[id] || !__tc.ICONS[__tc.COND_BY_ID[id].i]), novas);
  chk(!faltam.length, 'as 22 condições novas existem e têm ícone — faltam ' + JSON.stringify(faltam));
  chk(await ev(() => __tc.COND_BY_ID.ponto.tab.length === 4), 'o Ponto tem os 4 lados');
  chk(await ev(() => !!(window.TC && TC.habsLer && TC.habsAcoes.de)), 'o leitor está ligado');
  await ev(fx => { const F = __tc.Fichas, velho = F.arvore; F.arvore = id => fx[id] || velho(id); window.TC.habsLer.usar(F); }, require('./arvores-teste.json'));
  const sp = await ev(() => TC.habsAcoes.de('n_bardo_byb', 1));
  chk(sp && sp.f === 'circ' && sp.r === 2 && sp.mv && sp.mv.k === 'empurra', 'a Dança da Tempestade é lida do texto: círculo de 2 que empurra — ' + JSON.stringify(sp));
  chk(await ev(() => TC.habsAcoes.de('n_nao_existe', 1)) === null, 'um id sem árvore não tem ação');
  console.log(ok + ' verificações passaram' + (fail ? ', ' + fail + ' falharam' : ''));
  await t.close(); process.exit(fail ? 1 : 0);
})();
