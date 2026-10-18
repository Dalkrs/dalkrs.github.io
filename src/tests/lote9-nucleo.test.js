// Lote 9, as contas do Mapa-múndi (sem navegador):
//   · (parte 2) a missão marcada num objeto (marcador, grupo, região, evento): o texto curto ou a ligação com uma missão
//     do grupo das Fichas, nasce só do mestre (ver), a concluída à mão (ok), a situação pronta da projeção (e); nos
//     outros objetos não fica; sem texto nem ligação, sai; a projeção só leva a que o mestre mostrou (sem a nota dele).
const N = require('../../mundo/nucleo.js');
let n = 0, bad = 0;
const ok = (c, m) => { n++; if (!c) { bad++; console.log('FALHOU: ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' — esperado ' + JSON.stringify(b) + ', veio ' + JSON.stringify(a));

/* ---- (parte 2) a missão ---- */
{
  const mapa = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, objs: [
    { id: 'm1', k: 'm', x: 100, y: 100, nome: 'Vila', mis: { t: '  Resgatar o ferreiro  ' } },
    { id: 'm2', k: 'm', x: 200, y: 100, mis: { ref: 'mabc', t: 'nome antigo', ver: true } },
    { id: 'g1', k: 'g', x: 300, y: 100, mis: { t: 'Escoltar', ok: 1, ver: 'sim' } },
    { id: 'r1', k: 'r', pts: [[0, 0], [400, 0], [400, 400]], mis: { t: 'Limpar a estrada', ver: false } },
    { id: 'e1', k: 'e', x: 500, y: 100, mis: { t: 'x'.repeat(300) } },
    { id: 't1', k: 't', pts: [[0, 0], [100, 100]], mis: { t: 'Na rota não' } },
    { id: 'm3', k: 'm', x: 600, y: 100, mis: { t: '   ' } },
    { id: 'm4', k: 'm', x: 700, y: 100, mis: { ref: 'nao vale!' } },
    { id: 'm5', k: 'm', x: 800, y: 100, mis: 'texto solto' },
    { id: 'm6', k: 'm', x: 900, y: 100, mis: { t: 'Pronta', e: 'falhou' } },
    { id: 'm7', k: 'm', x: 950, y: 100, mis: { t: 'Lixo', e: 'quase' } },
  ] });
  const o = id => mapa.objs.find(x => x.id === id);
  eq(o('m1').mis, { t: 'Resgatar o ferreiro', ref: null }, 'o texto curto (sem os espaços), sem ligação, só do mestre');
  eq(o('m2').mis, { t: 'nome antigo', ref: 'mabc', ver: true }, 'a ligação com uma missão das Fichas (ref), à mostra');
  eq(o('g1').mis, { t: 'Escoltar', ref: null, ver: true, ok: true }, 'no grupo: concluída à mão (ok) e à mostra (o "sim" vale)');
  eq(o('r1').mis, { t: 'Limpar a estrada', ref: null }, 'na região: ver false não fica');
  eq(o('e1').mis.t.length, 120, 'no evento: o texto fica em até 120 letras');
  ok(!('mis' in o('t1')), 'na rota, a missão não fica (só marcador, grupo, região e evento)');
  ok(!('mis' in o('m3')) && !('mis' in o('m4')) && !('mis' in o('m5')), 'sem texto nem ligação válida, a missão sai (o espaço em branco, a ligação com id ruim, o texto solto)');
  eq(o('m6').mis, { t: 'Pronta', ref: null, e: 'falhou' }, 'a situação pronta (da projeção) fica quando é uma das três');
  eq(o('m7').mis, { t: 'Lixo', ref: null }, 'a situação que não existe sai');
  eq([N.situacaoDaMissao(o('m1').mis), N.situacaoDaMissao(o('g1').mis), N.situacaoDaMissao(o('m6').mis), N.situacaoDaMissao(o('m2').mis, { e: 'feita' }), N.situacaoDaMissao(o('m2').mis, { e: 'xx' }), N.situacaoDaMissao(null)],
    ['ativa', 'feita', 'falhou', 'feita', 'ativa', null], 'a situação: a do texto (ok), a pronta, a da ficha ligada (a que não existe vale ativa)');
  // a projeção: só a que o mestre mostrou
  const p = N.projetar(mapa), po = id => p.objs.find(x => x.id === id);
  ok(!po('m1').mis && !po('r1').mis && !po('e1').mis, 'na projeção, a missão só do mestre não vai');
  eq(po('g1').mis, { t: 'Escoltar', ref: null, ver: true, e: 'feita' }, 'a mostrada vai, com a situação pronta (concluída à mão: feita)');
  eq(po('m2').mis, { t: 'nome antigo', ref: 'mabc', ver: true }, 'a ligada vai com a ligação (quem publica troca pelo nome e a situação das Fichas)');
  // a missão de um objeto escondido não vai (o objeto não vai)
  const m2 = N.normalizarMapa({ nome: 'M', larg: 2000, alt: 1400, objs: [{ id: 'mx', k: 'm', x: 100, y: 100, oculto: true, mis: { t: 'Segredo', ver: true } }] });
  ok(!N.projetar(m2).objs.length, '(o objeto escondido não vai, nem a missão dele)');
  // copiar um objeto com objNovo mantém a missão; o duplicar do painel tira (ali)
  eq(N.objNovo('m', { x: 1, y: 1, mis: { t: 'A' } }).mis, { t: 'A', ref: null }, 'objNovo aceita a missão');
}

console.log(bad ? `${n - bad}/${n} — ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
