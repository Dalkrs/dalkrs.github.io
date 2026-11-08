// Lote 115: cada mês guarda a sua estação (cal.meses[i].est). O mundo do Bruno: 8 meses de 30 dias, 2 de cada estação,
// começando na primavera. A estação escolhe a tabela de começo do clima e aparece na data.
const N = require('../../mundo/nucleo.js');
const { checker } = require('./lib');
const { ok, end } = checker();
const EST = [['Degelo', 'primavera'], ['Florada', 'primavera'], ['Verdor', 'verao'], ['Solar', 'verao'], ['Colheita', 'outono'], ['Brumas', 'outono'], ['Geada', 'inverno'], ['Noite Longa', 'inverno']];
const m = N.normalizarMapa({ cal: { dia: 4, ano0: 620, meses: EST.map(([nome, est]) => ({ nome, dias: 30, est })) }, objs: [] });
ok(N.diasNoAno(m.cal) === 240, 'o ano tem 240 dias');
ok(m.cal.meses.every((x, i) => x.est === EST[i][1]), 'a estação de cada mês sobrevive à normalização');
ok(N.textoData(m.cal, 4) === '5 de Degelo (primavera), ano 620', 'a data mostra a estação: ' + N.textoData(m.cal, 4));
ok(N.textoData(m.cal, 239) === '30 de Noite Longa (inverno), ano 620' && N.textoData(m.cal, 240).startsWith('1 de Degelo (primavera), ano 621'), 'o ano vira depois de Noite Longa');
ok(EST.every(([, e], i) => N.estacaoDe(m.cal, i) === e), 'estacaoDe segue o mês, não a posição');
ok(N.chancesDoClima(m, 0).neve === 0 && N.chancesDoClima(m, 6).neve === 25 && N.chancesDoClima(m, 3).calor === 20, 'o clima de começo: primavera sem neve, inverno com neve, verão com calor');
ok(N.tabelaPadraoDoMes(0, 8, m.cal).chuva === 25 && N.tabelaPadraoDoMes(0, 8).neve === 25, 'sem o calendário, vale a posição (o 1º mês é inverno), como antes');
const sem = N.normalizarMapa({ cal: { meses: [{ nome: 'A', dias: 30, est: 'chuva' }] }, objs: [] });
ok(!('est' in sem.cal.meses[0]), 'estação inválida sai');
const reg = { clima: { neve: 'muito', calor: 'nunca' } };
ok(N.chancesDoClima(m, 6, reg).neve === 25 * 4 + 15 && N.chancesDoClima(m, 3, reg).calor === 0, 'o ajuste da região (Norte gelado) vale por cima da estação');
end();
