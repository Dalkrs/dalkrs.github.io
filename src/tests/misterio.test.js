// Os mistérios (lote 53), a conta pura (tc/misterio.js), sem navegador:
//   · os oito tipos geram um caso coerente: as conclusões do tipo, três pistas por conclusão (vestígio, testemunho e
//     documento — a regra das três pistas), o culpado (menos nas criaturas sombrias), o traço do culpado na aparência
//     dele e nas pistas de "quem", a pista falsa apontando um inocente que mente por outro motivo, os testemunhos com
//     quem sabe (nunca o culpado) e a reviravolta;
//   · a mesma semente dá o mesmo caso;
//   · o que a mesa vê (projetar) só tem as pistas entregues e os suspeitos mostrados — nunca a verdade;
//   · o mural se normaliza (os fios com a chave certa, as cartas dentro do quadro, a acusação de um suspeito).
const { checker } = require('./lib');
const { ok, end } = checker();
const M = require('../../tc/misterio.js');
const N = require('../../tc/npc.js');
const j = JSON.stringify;

for (const tipo of M.ORDEM_TIPOS) {
  const c = M.gerarCaso({ tipo, n: 4 }, 1234, { npc: N });
  const T = M.TIPOS[tipo], cons = T.con;
  ok(c.tipo === tipo && c.titulo.length > 8 && c.suspeitos.length === 4, tipo + ': o caso (“' + c.titulo + '”)');
  const porCon = cons.map(k => c.pistas.filter(p => p.con === k && !p.falsa));
  ok(porCon.every(l => l.length === 3 && new Set(l.map(p => p.jeito)).size === 3), tipo + ': três pistas por conclusão, de jeitos diferentes');
  const cul = M.culpado(c);
  if (cons.includes('quem')) {
    ok(!!cul && c.verdade.quem === cul.id && cul.mente && cul.segredo, tipo + ': o culpado mente e tem o segredo da verdade');
    const tr = M.tracoDe(cul.traco);
    ok(cul.aparencia.toLowerCase().includes(tr.d.split(' ')[0]) && c.pistas.filter(p => p.con === 'quem' && !p.falsa).every(p => p.aponta === cul.id), tipo + ': o traço do culpado está na aparência e as pistas de “quem” apontam para ele');
    const falsa = c.pistas.find(p => p.falsa);
    const inoc = falsa && c.suspeitos.find(s => s.id === falsa.aponta);
    ok(!!falsa && inoc && !inoc.culpado && inoc.mente && /pista falsa/.test(inoc.segredo), tipo + ': a pista falsa aponta um inocente, que mente por outro motivo');
  } else ok(!cul && !c.pistas.some(p => p.falsa), tipo + ': sem culpado e sem pista falsa (não há “quem”)');
  const test = c.pistas.filter(p => p.jeito === 'testemunho');
  ok(test.every(p => p.de && c.suspeitos.some(s => s.id === p.de && !s.culpado && s.sabe.includes(p.id))), tipo + ': cada testemunho tem quem sabe (e nunca é o culpado)');
  ok(c.pistas.filter(p => p.jeito !== 'testemunho').every(p => M.ONDE[p.onde]), tipo + ': os vestígios e os documentos têm onde ficar');
  ok(!!c.reviravolta && c.reviravolta.txt.length > 20 && M.CENAS[c.cena], tipo + ': a reviravolta e a cena do crime sugerida');
}
const a = M.gerarCaso({ tipo: 'vampiro' }, 77, { npc: N }), b = M.gerarCaso({ tipo: 'vampiro' }, 77, { npc: N });
ok(j(a) === j(b), 'a mesma semente dá o mesmo caso');
ok(j(M.gerarCaso({ tipo: 'vampiro' }, 78, { npc: N })) !== j(a), 'outra semente, outro caso');
const sem = M.gerarCaso({ tipo: 'assassinato', falsa: false, reviravolta: false }, 5, { npc: N });
ok(!sem.pistas.some(p => p.falsa) && !sem.reviravolta, 'sem a pista falsa e sem a reviravolta, quando se pede');
ok(M.gerarCaso({ tipo: 'roubo' }, 9).suspeitos.length === 4, 'sem o gerador de NPC, os suspeitos têm nomes simples');

// o que a mesa vê
let c = M.gerarCaso({ tipo: 'assassinato' }, 42, { npc: N });
let pub = M.projetar('c1', c);
ok(pub.pistas.length === 0 && pub.suspeitos.length === 0 && !('verdade' in pub), 'antes de entregar, a mesa não vê nada (e nunca a verdade)');
const t = c.pistas.find(p => p.jeito === 'testemunho');
c = M.entregar(c, c.pistas[0].id, '2026-11-01T10:00:00Z'); c = M.entregar(c, t.id, '2026-11-01T10:05:00Z');
pub = M.projetar('c1', c);
ok(pub.pistas.length === 2 && pub.pistas[1].de && pub.suspeitos.length === 1 && pub.suspeitos[0].id === t.de, 'a pista entregue vai para a mesa; o testemunho mostra quem contou (e mostra o suspeito)');
ok(!JSON.stringify(pub).includes('culpado') && !JSON.stringify(pub).includes(c.suspeitos[0].segredo || '§'), 'o público não leva o culpado nem os segredos');
c = M.recolher(c, c.pistas[0].id);
ok(M.projetar('c1', c).pistas.length === 1, 'recolher tira a pista da mesa');
ok(M.normPub(M.projetar('c1', c)).cid === 'c1', 'o público se normaliza');

// o mural
const mu = M.normMural({ cid: 'c1', cartas: { 'p:p1': { x: 5000, y: -3 }, 'x:zz': { x: 1, y: 1 } }, fios: { 'p:p1|s:s2': { por: 'Dalmo' }, 's:s2|p:p1': {}, 'p:p1|p:p1': {} }, notas: { n1: { x: 10, y: 20, txt: 'O ferreiro mente', por: 'Ana' } }, acusacao: { sid: 's2', por: 'Ana', txt: 'Ele tinha a chave', em: '2026-11-01T10:00:00Z' } });
ok(j(mu.cartas) === j({ 'p:p1': { x: 3000, y: 0 } }), 'as cartas: só as válidas, dentro do quadro');
ok(j(Object.keys(mu.fios)) === j(['p:p1|s:s2']), 'os fios: só com a chave certa (a ordem dos dois cartões) e entre cartões diferentes');
ok(mu.notas.n1.txt === 'O ferreiro mente' && mu.acusacao.sid === 's2', 'as notas e a acusação');
ok(M.chaveFio('s:s2', 'p:p1') === 'p:p1|s:s2', 'a chave do fio é a mesma dos dois lados');
ok(M.cidDe('escudo:mpub:c9@camp1') === 'c9' && M.cidDe('mural:c9') === 'c9' && M.idPub('c9', 'k') === 'escudo:mpub:c9@k', 'os nomes dos documentos');
end();
