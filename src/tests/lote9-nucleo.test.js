// Lote 9, as contas do Mapa-múndi (sem navegador):
//   · (parte 2) a missão marcada num objeto (marcador, grupo, região, evento): o texto curto ou a ligação com uma missão
//     do grupo das Fichas, nasce só do mestre (ver), a concluída à mão (ok), a situação pronta da projeção (e); nos
//     outros objetos não fica; sem texto nem ligação, sai; a projeção só leva a que o mestre mostrou (sem a nota dele);
//   · (parte 3) o descanso do grupo (a janela de tempos, virando a noite também): o grupo dos jogadores só para; o do
//     mundo vai dormir no ponto de descanso (o marcador marcado, ou o do próprio grupo) se ainda chega até a metade do
//     descanso, senão acampa onde está; a parada no descanso; fora do descanso, o ponto não segura ninguém; a projeção
//     sem o descanso; a volta pela mesma rota (só ida: o sentido fica, o caminho ao contrário, chega ao começo).
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

/* ---- (parte 3) o descanso, os pontos de descanso, as paradas e a volta pela mesma rota ---- */
{
  const j = JSON.stringify;
  // a rota em hexágonos de 20 (cada um custa 5 cubos): quem anda 10 por tempo anda 2 hexágonos
  const base = (objs, cal) => N.normalizarMapa({ larg: 600, alt: 300, grade: { tam: 20, x: 0, y: 0, orient: 'pe', on: true }, cal: Object.assign({ dia: 5, tpd: 10 }, cal || {}), objs });
  const aplica = (m, id, r, n) => {
    const c = JSON.parse(j(m)), o = c.objs.find(x => x.id === id);
    Object.assign(o, { x: r.x, y: r.y, prog: r.prog, espera: r.espera || 0 });
    if (r.sentido === -1) o.sentido = -1; else delete o.sentido;
    const t = N.passarTempos(c.cal, n); c.cal.dia = t.dia; c.cal.tempo = t.tempo;
    return N.normalizarMapa(c);
  };
  const ROTA = { id: 'rt', k: 't', pts: [[0, 0], [400, 0]] };
  // a normalização
  const nm = N.normalizarMapa({ objs: [{ id: 'g', k: 'g', x: 0, y: 0, desc: { de: 6, ate: 10 }, pdesc: [{ x: 40, y: 0 }, { x: 'x' }] }, { id: 'g2', k: 'g', x: 0, y: 0, desc: { de: 3 } },
    { id: 'm', k: 'm', x: 0, y: 0, desc: 1 }, { id: 'm2', k: 'm', x: 0, y: 0 }, { id: 'e', k: 'e', x: 0, y: 0, desc: { de: 1, ate: 2 } }] }).objs;
  const ob = id => nm.find(o => o.id === id);
  eq([ob('g').desc, ob('g').pdesc], [{ de: 6, ate: 10 }, [{ x: 40, y: 0 }]], 'o grupo: o descanso (do 6º ao 10º) e os pontos de descanso dele (o ponto sem lugar sai)');
  ok(!('desc' in ob('g2')) && !('desc' in ob('e')), 'o descanso sem o fim não fica; no evento, não há descanso');
  ok(ob('m').desc === true && !('desc' in ob('m2')), 'o marcador "Ponto de descanso"');
  // a janela
  const ja = N.janelaDeDescanso({ desc: { de: 6, ate: 10 } }, 10), jb = N.janelaDeDescanso({ desc: { de: 9, ate: 2 } }, 10);
  eq([ja, jb, N.janelaDeDescanso({ desc: { de: 12, ate: 15 } }, 10), N.janelaDeDescanso({}, 10)], [{ de: 6, ate: 10, n: 5 }, { de: 9, ate: 2, n: 4 }, { de: 10, ate: 10, n: 1 }, null],
    'a janela: do 6º ao 10º (5 tempos), virando a noite (do 9º ao 2º: 4 tempos), além do dia (fica no último tempo), sem descanso');
  eq([5, 6, 10].map(t => N.noDescanso(ja, t, 10)).concat([9, 10, 1, 2, 3].map(t => N.noDescanso(jb, t, 10))), [-1, 0, 4, 0, 1, 2, 3, -1], 'em que tempo da janela cada tempo do dia está');
  // o grupo dos jogadores: no descanso, só para
  const pt = { id: 'pt', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10, desc: { de: 6, ate: 10 } };
  const m1 = base([ROTA, pt], { tempo: 4 }), r1 = N.andarTempos(m1, 'pt', 1);
  ok(r1.x === 40 && !r1.descansou && !N.descansandoAgora(m1, m1.objs[1]), 'no 5º tempo, fora do descanso, anda: ' + j([r1.x, r1.msg]));
  const m2 = aplica(m1, 'pt', r1, 1), r2 = N.andarTempos(m2, 'pt', 1);
  ok(N.descansandoAgora(m2, m2.objs[1]) && r2.ok && r2.x === 40 && r2.hexes === 0 && r2.descansou === 1 && r2.msg === 'Descansando (do 6º ao 10º tempo)', 'no 6º tempo: descansando, não anda: ' + j([r2.x, r2.msg]));
  const r3 = N.andarTempos(m2, 'pt', 5);
  ok(r3.x === 40 && r3.descansou === 5 && r3.msg === 'Descansou 5 tempos', 'o resto do dia (do 6º ao 10º): descansa os 5 tempos: ' + r3.msg);
  const rd = N.andarTempos(base([ROTA, pt], { tempo: 0 }), 'pt', 10);
  ok(rd.x === 200 && rd.hexes === 10 && rd.descansou === 5 && rd.msg === 'Andou 10 hexágonos (50 cubos) (e descansou 5 tempos)', 'o dia inteiro: anda do 1º ao 5º e descansa do 6º ao 10º: ' + rd.msg);
  const rn = N.andarTempos(base([ROTA, Object.assign({}, pt, { desc: { de: 9, ate: 2 } })], { tempo: 0 }), 'pt', 10);
  ok(rn.x === 240 && rn.descansou === 4, 'o descanso que vira a noite (do 9º ao 2º): anda do 3º ao 8º: ' + j([rn.x, rn.descansou]));
  const rp = N.andarTempos(base([ROTA, { id: 'inn', k: 'm', x: 40, y: 0, nome: 'Estalagem', desc: true }, pt], { tempo: 5 }), 'pt', 5);
  ok(rp.x === 0 && rp.descansou === 5, 'o grupo dos jogadores não vai até o ponto de descanso: só para onde está');
  // o grupo do mundo vai dormir no ponto de descanso (se chega até a metade do descanso: do 6º ao 10º, até o começo do 8º)
  const car = { id: 'c', k: 'g', x: 0, y: 0, rota: 'rt', pt: 10, tipo: 'caravana', desc: { de: 6, ate: 10 } };
  const inn = x => ({ id: 'inn', k: 'm', x, y: 0, nome: 'Estalagem', desc: true });
  const mc = base([ROTA, inn(60), car], { tempo: 5 });
  const c1 = N.andarTempos(mc, 'c', 1);
  ok(c1.x === 40 && c1.hexes === 2 && !c1.dormiu && c1.msg === 'Andou 2 hexágonos (10 cubos), a caminho de "Estalagem" para dormir', 'no 6º, a caravana segue rumo à estalagem (a 3 hexágonos): ' + j([c1.x, c1.msg]));
  const mc2 = aplica(mc, 'c', c1, 1), c2 = N.andarTempos(mc2, 'c', 1);
  ok(c2.x === 60 && c2.hexes === 1 && c2.dormiu === 'Estalagem' && c2.msg === 'Andou 1 hexágono (5 cubos) e foi dormir em "Estalagem"', 'no 7º, chega e para nela: ' + j([c2.x, c2.msg]));
  const c3 = N.andarTempos(aplica(mc2, 'c', c2, 1), 'c', 1);
  ok(c3.x === 60 && c3.descansou === 1 && c3.msg === 'Descansando em "Estalagem" (do 6º ao 10º tempo)', 'e dorme lá: ' + c3.msg);
  const c5 = N.andarTempos(mc, 'c', 5);
  ok(c5.x === 60 && c5.hexes === 3 && c5.descansou === 3 && c5.dormiu === 'Estalagem', 'de uma vez (o resto do dia): vai e dorme do 8º ao 10º: ' + c5.msg);
  const c80 = N.andarTempos(base([ROTA, inn(80), car], { tempo: 5 }), 'c', 5);
  ok(c80.x === 80 && c80.descansou === 3, 'a 4 hexágonos (chega no fim do 7º, dorme do 8º ao 10º): vai: ' + j([c80.x, c80.descansou]));
  const c100 = N.andarTempos(base([ROTA, inn(100), car], { tempo: 5 }), 'c', 5);
  ok(c100.x === 0 && c100.hexes === 0 && c100.descansou === 5, 'a 5 hexágonos (não dorme nem metade): acampa onde está, no 6º: ' + j([c100.x, c100.descansou]));
  const c7 = N.andarTempos(base([ROTA, inn(100), car], { tempo: 6 }), 'c', 1);
  ok(c7.x === 0 && c7.descansou === 1, '(e no 7º continua acampado: não sai no meio do descanso)');
  const cja = N.andarTempos(base([ROTA, inn(60), Object.assign({}, car, { x: 60, prog: 15, pdesc: [{ x: 100, y: 0 }] })], { tempo: 5 }), 'c', 5);
  ok(cja.x === 60 && cja.hexes === 0 && cja.descansou === 5, 'já no ponto de descanso no começo do descanso: dorme ali (não segue para o próximo): ' + j([cja.x, cja.hexes]));
  const cpd = N.andarTempos(base([ROTA, Object.assign({}, car, { pdesc: [{ x: 60, y: 0 }] })], { tempo: 5 }), 'c', 5);
  ok(cpd.x === 60 && cpd.descansou === 3 && cpd.dormiu === 'o ponto de descanso', 'o ponto de descanso do próprio grupo (na rota dele) vale igual: ' + j([cpd.x, cpd.dormiu]));
  const cnd = N.andarTempos(base([ROTA, inn(60), Object.assign({}, car, { desc: undefined })], { tempo: 5 }), 'c', 1);
  ok(cnd.x === 40 && !cnd.dormiu, 'sem descanso, o ponto de descanso não segura ninguém (passa direto)');
  const cfo = N.andarTempos(base([ROTA, inn(60), car], { tempo: 2 }), 'c', 3);
  ok(cfo.x === 120 && !cfo.dormiu && !cfo.descansou, 'fora do descanso, o ponto de descanso também não segura (só a parada para)');
  // a parada no descanso: a espera também passa
  const pat = { id: 'p', k: 'g', x: 60, y: 0, rota: 'rt', prog: 15, pt: 10, tipo: 'patrulha', espera: 3, paradas: [{ x: 60, y: 0, n: 3, u: 't' }], desc: { de: 6, ate: 10 } };
  const pe = N.andarTempos(base([ROTA, pat], { tempo: 5 }), 'p', 5);
  ok(pe.x === 60 && pe.espera === 0 && pe.descansou === 5, 'parado numa parada no descanso: a espera passa junto (e não sai no meio do descanso): ' + j([pe.x, pe.espera, pe.descansou]));
  // na projeção, o descanso é do mestre
  const pj = N.projetar(base([ROTA, inn(60), Object.assign({}, car, { oculto: false, pdesc: [{ x: 60, y: 0 }] })]));
  ok(!('desc' in pj.objs.find(o => o.id === 'c')) && !('pdesc' in pj.objs.find(o => o.id === 'c')) && !('desc' in pj.objs.find(o => o.id === 'inn')), 'na projeção, o descanso, os pontos do grupo e o "Ponto de descanso" do marcador não vão');
  // a volta pela mesma rota (só ida): no fim, o sentido vira e o grupo anda de volta
  const RC = { id: 'rt', k: 't', pts: [[0, 0], [80, 0]] };
  const mv = base([RC, { id: 'g', k: 'g', x: 80, y: 0, rota: 'rt', pt: 10, prog: 0, sentido: -1 }]);
  ok(mv.objs[1].sentido === -1 && j(N.viagem(mv, mv.objs[1]).cam.map(h => h.q)) === j([4, 3, 2, 1, 0]), 'só ida, voltando: o sentido fica, e o caminho é a rota ao contrário');
  const v1 = N.andarTempos(mv, 'g', 1);
  ok(v1.ok && v1.x === 40 && v1.prog === 10 && v1.sentido === -1, 'anda de volta: ' + j([v1.x, v1.prog, v1.sentido]));
  const v2 = N.andarTempos(aplica(mv, 'g', v1, 1), 'g', 3);
  ok(v2.x === 0 && v2.chegou && /chegou ao fim da rota/.test(v2.msg) && v2.sentido === -1, 'e chega ao começo (o fim da volta): ' + j([v2.x, v2.chegou, v2.msg]));
  ok(!('sentido' in N.normalizarMapa({ objs: [RC, { id: 'g', k: 'g', x: 0, y: 0, rota: 'rt', modo: 'circuito', sentido: -1 }] }).objs[1]), '(no circuito, não há volta)');
  const vd = N.andarTempos(base([RC, { id: 'g', k: 'g', x: 80, y: 0, rota: 'rt', pt: 10, prog: 0, sentido: -1, desc: { de: 6, ate: 10 } }], { tempo: 0 }), 'g', 2);
  ok(vd.x === 0 && vd.sentido === -1, 'voltando, com descanso (tempo a tempo), o sentido também fica: ' + j([vd.x, vd.sentido]));
}

console.log(bad ? `${n - bad}/${n} — ${bad} falharam` : `${n} verificações passaram`);
process.exit(bad ? 1 : 0);
