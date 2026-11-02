// Clã, a lógica pura (cla/nucleo.js): os nomes dos níveis, o brasão, a árvore de cargos (e o que o líder manda ao
// banco), as construções, os recursos, o respeito, as relações, o histórico (com as mudanças seguidas juntas numa linha
// só) e a projeção — a mesma conta que o banco faz para montar o que os jogadores veem de cada clã.
'use strict';
const C = require('../../cla/nucleo.js');
let n = 0, ruins = 0;
const ok = (c, m) => { n++; if (!c) { ruins++; console.log('FALHOU: ' + m); } };
const j = JSON.stringify;
const T0 = '2026-10-16T10:00:00.000Z', mais = s => new Date(Date.parse(T0) + s * 1000).toISOString();

/* ---------------- catálogos ---------------- */
ok(j(Object.keys(C.ESCALAS)) === j(['mundo', 'rel', 'membro']) && Object.values(C.ESCALAS).every(l => l.length === 21) && C.NIVEL_MAX === 10 && j(C.NIVEIS.slice(0, 2)) === j([-10, -9]) && C.NIVEIS.length === 21
  && C.ESCALAS.mundo[12] === 'Respeitado' && C.ESCALAS.rel[5] === 'Inimigo mortal' && C.ESCALAS.rel[15] === 'Irmão de armas' && C.ESCALAS.membro[13] === 'Estimado',
  '(lote 8) as três escalas, de −10 a +10, com os nomes do esboço de −5 a +5 no meio');
ok(C.ESCALAS.mundo[0] === 'Inimigo do mundo' && C.ESCALAS.mundo[20] === 'Divino' && C.ESCALAS.rel[0] === 'Extermínio' && C.ESCALAS.rel[20] === 'Um só povo' && C.ESCALAS.membro[0] === 'Inimigo jurado' && C.ESCALAS.membro[20] === 'Alma do clã'
  && Object.values(C.ESCALAS).every(l => new Set(l).size === l.length), '(lote 8) os níveis novos (de −10 a −6 e de +6 a +10) têm nomes próprios, sem repetir na escala');
ok(j(C.PARTES.map(p => p[0])) === j(['cargos', 'construcoes', 'recursos', 'respeito', 'relacoes', 'hist', 'membros']) && C.PARTE_NOME.hist === 'Histórico', 'as sete partes que o mestre mostra (ou não) de um clã de NPC (lote 56: e os membros)');
ok(C.FORMAS.length === 12 && C.DIVISOES.length === 16 && C.CORES.every(c => /^#[0-9a-f]{6}$/.test(c)), '(lote 45) doze formas, dezesseis divisões e a paleta de cores');
{
  // (lote 45) os símbolos novos: a heráldica, as classes e as raças, em grupos; os caminhos que o Cenas aceita
  const caminhoOk = v => typeof v === 'string' && v.length <= 1500 && /^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/.test(v);
  const g = Object.fromEntries(C.SIMB_GRUPOS.map(x => [x.id, x.itens.length]));
  ok(g.her >= 45 && g.cls === 12 && g.rac === 35 && C.SIMB_GRUPOS.reduce((t, x) => t + x.itens.length, 0) === C.SIMBOLOS.size, 'os símbolos em grupos: a heráldica, as 12 classes e as 35 raças, sem sobrar nenhum — ' + j(g));
  ok([...C.SIMBOLOS.values()].every(x => caminhoOk(x.d) && x.nome), 'todo símbolo é um caminho só, que o Cenas desenha');
  ok(C.DIVISOES.every(([id, nome, d]) => nome && (id === 'liso' ? d === '' : caminhoOk(d))) && C.FORMAS.every(f => caminhoOk(f.d) && f.st.length === 3), 'toda divisão tem o pedaço da segunda cor; toda forma, onde o símbolo fica');
  ok(C.SIMBOLOS.get('u-samurai').nome === 'Samurai' && C.SIMBOLOS.get('u-selene').nome === 'Kitsune Selene' && C.SIMBOLOS.has('leao') && C.SIMBOLOS.has('flordelis'), 'o Samurai, a Kitsune Selene, o leão, a flor-de-lis');
  const t = C.brasaoSvg({ forma: 'triangular', div: 'aspa', cores: ['#24305e', '#d9a441'], simb: 'u-samurai' }, 't');
  ok(t.includes('translate(32 14) scale(1.5)') && t.includes(C.DIV_PATH.aspa) && t.includes('stroke-width="2.4"'), 'a forma triangular põe o símbolo menor e mais alto (com o mesmo traço); a aspa desenha');
  ok(C.normBrasao({ forma: 'gonfalao', div: 'xadrez' }).forma === 'gonfalao' && C.normBrasao({ div: 'xadrez' }).div === 'xadrez' && C.normBrasao({ div: 'nada' }).div === 'partido', 'as formas e divisões novas valem; a desconhecida vira a de começo');
  ok(/class="div-am"/.test(C.divAmostra('cruz')) && C.simbolosEmGrupos()[0].itens[0].d, 'a amostra da divisão e os grupos prontos para os seletores');
}
{
  const ids = C.ICONES.map(i => i.id);
  ok(new Set(ids).size === ids.length && C.ICONES.every(i => /^[a-z]+$/.test(i.id) && /^M[\d.]/.test(i.d) && !/[<>"]/.test(i.d)), 'os ícones das construções: ids simples, desenho só de traço');
  ok(C.SIMBOLOS.has('lua') && C.SIMBOLOS.has('fogo') && C.SIMBOLOS.has('chave') && C.SIMBOLOS.has('torre') && C.SIMBOLOS.has('ancora')
    && [...C.SIMBOLOS.values()].every(s => /^[A-Za-z0-9_-]+$/.test(s.id) && /^M[\d.]/.test(s.d) && !/[<>"]/.test(s.d)), 'os símbolos do brasão: os da Meditação e mais alguns');
}

/* ---------------- os nomes dos níveis ---------------- */
{
  const d = C.normNomes(null);
  ok(j(d.mundo) === j(C.ESCALAS.mundo) && j(d.rel) === j(C.ESCALAS.rel) && d.v === 2, 'sem documento: os nomes de começo (v: 2, de −10 a +10)');
  const x = C.normNomes({ mundo: ['  Pária  ', '', 7, null, 'x'.repeat(50)], rel: 'torto' });
  ok(x.mundo[5] === 'Pária' && x.mundo[6] === 'Odiado' && x.mundo[7] === '7' && x.mundo[8] === 'Malvisto' && x.mundo[9].length === C.MAX.nomeNivel && x.mundo[0] === 'Inimigo do mundo' && j(x.rel) === j(C.ESCALAS.rel),
    'os nomes do mestre de antes (de −5 a +5) vão para o meio, nos mesmos níveis; o que está vazio volta ao de começo');
  const y = C.normNomes({ v: 2, mundo: ['Fim do mundo'], membro: Array.from({ length: 21 }, (_, i) => 'n' + (i - 10)) });
  ok(y.mundo[0] === 'Fim do mundo' && y.mundo[1] === 'Abominado' && y.membro[0] === 'n-10' && y.membro[20] === 'n10' && j(C.normNomes(y)) === j(y), 'os nomes de agora (v: 2): de −10 a +10, sem mudar de lugar');
  ok(C.nivelTxt(null, 'mundo', 2) === '+2 · Respeitado' && C.nivelTxt(null, 'rel', -3) === '−3 · Rival' && C.nivelTxt(null, 'membro', 0) === '0 · Membro'
    && C.nivelTxt(null, 'mundo', 9) === '+9 · Imortal' && C.nivelTxt(null, 'mundo', 15) === '+10 · Divino' && C.nivelTxt(null, 'rel', -7) === '−7 · Vingança jurada'
    && C.nomeNivel({ rel: ['A', 'B'] }, 'rel', -4) === 'B', 'o texto de um nível: o sinal e o nome (até ±10)');
}

/* ---------------- o brasão ---------------- */
{
  ok(j(C.normBrasao(null)) === j({ forma: 'escudo', div: 'partido', cores: ['#24305e', '#d9a441'], simb: null, img: null }), 'o brasão de começo');
  const b = C.normBrasao({ forma: 'losango', div: 'faixa', cores: ['#ABCDEF', 'vermelho', '#123456'], simb: 'lobo', img: 'https://x.co/b.png' });
  ok(j(b) === j({ forma: 'losango', div: 'faixa', cores: ['#abcdef', '#d9a441'], simb: 'lobo', img: 'https://x.co/b.png' }), 'o brasão: forma, divisão, as duas cores, símbolo e imagem');
  ok(C.normBrasao({ forma: 'x', div: 'y', simb: 'nao', img: 'javascript:1' }).forma === 'escudo' && C.normBrasao({ simb: 'nao' }).simb === null && C.normBrasao({ img: 'http://x/a.png' }).img === null
    && C.normBrasao({ img: 'data:image/png;base64,iVBOR=' }).img === 'data:image/png;base64,iVBOR=', 'o que não existe volta ao de começo (imagem só https ou embutida)');
  const n0 = C.brasaoNovo(0), n1 = C.brasaoNovo(1);
  ok(j(n0.cores) !== j(n1.cores) && n0.div !== n1.div && C.SIMBOLOS.has(n0.simb) && C.SIMBOLOS.has(n1.simb), 'o brasão de um clã novo muda de um clã para o outro');
  const s = C.brasaoSvg({ div: 'esquartelado', cores: ['#8a2a2a', '#c9ccd4'], simb: 'lua' }, 'cl_1"><x');
  ok(/^<svg viewBox="0 0 100 120"/.test(s) && s.includes('clipPath id="brcl_1x"') && s.includes('url(#brcl_1x)') && (s.match(/<rect /g) || []).length === 1 && s.includes(C.DIV_PATH.esquartelado)
    && s.includes('#8a2a2a') && s.includes('#c9ccd4') && s.includes(C.SIMBOLOS.get('lua').d) && !/<script|on\w+=/i.test(s), 'o brasão desenhado: o recorte com id único, o fundo e o pedaço da segunda cor, o símbolo (e nada além de números e cores)');
  ok((C.brasaoSvg({ div: 'liso' }, 'a').match(/<rect /g) || []).length === 1 && C.brasaoSvg({ div: 'faixa' }, 'a').includes('<path d="M-10 18') && !C.brasaoSvg({ simb: null }, 'a').includes('scale(2)'),
    'liso, faixa e sem símbolo');
  ok(C.brasaoSvg({ div: 'liso', cores: ['#e8eaf0', '#e8eaf0'], simb: 'lua' }, 'a').includes('stroke="#1b1b22"') && C.brasaoSvg({ div: 'liso', cores: ['#1b1b22', '#e8eaf0'], simb: 'lua' }, 'a').includes('stroke="#f6efe2"'),
    'o símbolo escuro no fundo claro, claro no escuro');
}

/* ---------------- os cargos ---------------- */
const CARGOS = {
  lider: { nome: 'Líder', gente: [{ id: 'p1', pc: 'pc_a', nome: 'Selene', resp: 3 }, { id: 'pX', nome: 'Outro líder' }] },
  k1: { nome: 'Conselheira', pai: 'lider', ordem: 0, gente: [{ id: 'p2', pc: 'pc_b', nome: 'Brisa', resp: 2 }] },
  k2: { nome: 'Mestre de armas', pai: 'lider', ordem: 1, gente: [{ id: 'p3', pc: 'pc_c', nome: 'Dain', resp: 1 }] },
  k3: { nome: 'Batedores', pai: 'k1', ordem: 0, gente: [{ id: 'p4', nome: 'Tobias', resp: 2 }, { id: 'p5', nome: 'Rin', resp: 0 }] },
  k4: { nome: 'Guardas', pai: 'k2', ordem: 0, gente: [{ id: 'p6', nome: 'Kael' }, { id: 'p7', nome: 'Mira', resp: -1 }] },
};
{
  const c = C.normCargos(CARGOS);
  ok(j(Object.keys(c)) === j(['lider', 'k1', 'k2', 'k3', 'k4']) && c.lider.gente.length === 1 && c.lider.gente[0].nome === 'Selene' && c.lider.pai === null && c.k4.gente[0].resp === 0,
    'os cargos: o líder no alto (uma pessoa só), cada cargo com a sua gente; o respeito de começo é 0');
  ok(j(C.normCargos(null)) === j({ lider: { nome: 'Líder', pai: null, ordem: 0, gente: [] } }), 'sem cargos: só o líder, vazio');
  const t = C.normCargos({ a: { nome: 'A', pai: 'b' }, b: { nome: 'B', pai: 'a' }, c: { nome: 'C', pai: 'nada' }, d: { nome: '', pai: 'lider', gente: [{ id: 'q', nome: 'X' }, { id: 'q', nome: 'Y' }, { nome: '' }, 'z'] }, 'e f': { nome: 'E' } });
  const subeAoLider = k => { let p = t[k].pai, i = 0; while (p !== 'lider' && i++ < 10) p = t[p].pai; return p === 'lider'; };
  ok(['a', 'b', 'c', 'd'].every(subeAoLider) && t.c.pai === 'lider' && !t['e f'] && t.d.nome === 'Cargo' && t.d.gente.length === 2 && t.d.gente[0].id === 'q' && t.d.gente[1].id !== 'q',
    'a árvore sai inteira: o ciclo e o cargo pendurado no nada vão para o líder; ninguém repetido; id torto fica de fora');
  const sem = C.normCargos(CARGOS, true);
  ok(sem.k1.gente[0].resp === null && sem.lider.gente[0].resp === null, 'o clã de NPC, como os jogadores o recebem: sem o respeito de cada um');
  const muitos = {}; for (let i = 0; i < 70; i++) muitos['c' + i] = { nome: 'C' + i, pai: 'lider' };
  ok(C.totalCargos(muitos) === C.MAX.cargos, 'no máximo 60 cargos abaixo do líder');
  ok(j(C.filhos(c, 'lider')) === j(['k1', 'k2']) && j(C.filhos(c, 'k1')) === j(['k3']) && j([...C.descendentes(c, 'k1')]) === j(['k3']) && C.descendentes(c, 'lider').size === 4, 'os filhos, na ordem, e os de baixo');
  const a = C.arvore(c);
  ok(a.id === 'lider' && a.filhos.length === 2 && a.filhos[0].filhos[0].id === 'k3' && a.filhos[1].filhos[0].cargo.nome === 'Guardas', 'a árvore para desenhar');
  ok(j(C.membros(c).map(m => m.pid)) === j(['p1', 'p2', 'p4', 'p5', 'p3', 'p6', 'p7']) && C.membros(c)[2].cargoNome === 'Batedores' && C.lider(c).pc === 'pc_a', 'todas as pessoas, do líder para baixo; o líder');
}
{
  let c = C.normCargos(CARGOS);
  const r = C.novoCargo(c, 'k2', '  Arqueiros ');
  ok(r && /^cg_/.test(r.id) && r.cargos[r.id].nome === 'Arqueiros' && r.cargos[r.id].pai === 'k2' && r.cargos[r.id].ordem === 1 && j(r.cargos[r.id].gente) === j([]), 'um cargo novo, no fim dos irmãos');
  ok(C.novoCargo(c, 'nada', 'X') === null && (x => x.cargos[x.id].nome === 'Cargo novo')(C.novoCargo(c, 'lider', '')), 'só debaixo de um cargo que existe (sem nome: "Cargo novo")');
  ok(C.renomearCargo(c, 'k3', 'Batedores do Vale').k3.nome === 'Batedores do Vale' && C.renomearCargo(c, 'k3', '  ') === null && C.renomearCargo(c, 'k3', 'Batedores') === null, 'renomear');
  const m = C.moverCargo(c, 'k3', 'lider', 1);
  ok(m && m.k3.pai === 'lider' && j(C.filhos(m, 'lider')) === j(['k1', 'k3', 'k2']), 'mover os Batedores para debaixo do líder, entre os dois');
  ok(C.moverCargo(c, 'k1', 'k3') === null && C.moverCargo(c, 'k1', 'k1') === null && C.moverCargo(c, 'lider', 'k1') === null, 'não move para debaixo de si mesmo (nem de quem está abaixo), nem o líder');
  ok(j(C.filhos(C.moverCargo(c, 'k2', 'lider', 0), 'lider')) === j(['k2', 'k1']), 'trocar a ordem de dois irmãos');
  const ap = C.apagarCargo(c, 'k2');
  ok(ap && !ap.k2 && ap.k4.pai === 'lider' && j(C.filhos(ap, 'lider')) === j(['k1', 'k4']) && !C.membros(ap).some(x => x.pid === 'p3') && C.apagarCargo(c, 'lider') === null,
    'apagar um cargo: a gente dele sai; os de baixo sobem para o lugar dele');
  const pp = C.porPessoa(c, 'k3', { nome: ' Ilo ' });
  ok(pp && pp.cargos.k3.gente.length === 3 && pp.cargos.k3.gente[2].nome === 'Ilo' && pp.cargos.k3.gente[2].resp === 0 && /^ps_/.test(pp.id), 'pôr uma pessoa (só um nome)');
  ok(C.porPessoa(c, 'k3', { pc: 'pc_d', nome: 'Oswin' }).cargos.k3.gente[2].pc === 'pc_d' && C.porPessoa(c, 'k3', { nome: '' }) === null && C.porPessoa(c, 'lider', { nome: 'Outro' }) === null,
    'um personagem da mesa; sem nome, não; o líder já tem alguém');
  ok(C.tirarPessoa(c, 'k3', 'p5').k3.gente.length === 1 && C.tirarPessoa(c, 'k3', 'p9') === null, 'tirar uma pessoa');
  const pl = C.passarLideranca(c, { pid: 'p2' }, 'k1');
  ok(pl.lider.gente[0].id === 'p2' && pl.lider.gente[0].resp === 2 && pl.k1.gente.length === 1 && pl.k1.gente[0].id === 'p1', 'passar a liderança à Brisa: ela sobe com o respeito dela; a Selene vai para o cargo da Brisa');
  const pl2 = C.passarLideranca(c, { pc: 'pc_z', nome: 'Zara' }, null);
  ok(pl2.lider.gente[0].nome === 'Zara' && pl2.lider.gente[0].resp === 0 && !C.membros(pl2).some(x => x.pid === 'p1') && C.passarLideranca(c, { pid: 'p1' }, null) === null,
    'alguém de fora vira líder (com 0); o de antes sai do clã; passar para quem já é, não');
}
{
  const antes = C.normCargos(CARGOS);
  let depois = C.novoCargo(antes, 'k1', 'Espiões');
  const novo = depois.id;
  depois = C.porPessoa(depois.cargos, novo, { nome: 'Vesna', resp: 5 }).cargos;
  depois = C.renomearCargo(depois, 'k2', 'Capitão');
  depois = C.apagarCargo(depois, 'k4');
  depois.k1.gente[0].resp = -5;                                       // (o líder não muda o respeito: nem vai)
  depois.lider.nome = 'Rainha';                                       // (nem o cargo de líder)
  const d = C.diffCargos(antes, depois);
  ok(j(Object.keys(d).sort()) === j(['k2', 'k4', novo].sort()) && d.k4 === null && d.k2.nome === 'Capitão' && d[novo].gente[0].nome === 'Vesna' && !('resp' in d[novo].gente[0]) && !('lider' in d),
    'o que o líder manda: só os cargos que mudaram (o apagado como null), sem o respeito e sem o cargo de líder');
  const ap = C.aplicarDiff(antes, d);
  ok(ap.k2.nome === 'Capitão' && !ap.k4 && ap[novo].gente[0].resp === 0 && ap.k1.gente[0].resp === 2 && ap.lider.gente[0].nome === 'Selene' && ap.lider.nome === 'Líder', 'aplicar como o banco: o respeito de quem já estava continua; quem chega começa no 0');
  ok(j(C.diffCargos(antes, C.normCargos(CARGOS))) === j({}), 'nada mudou: nada a mandar');
  const sai = C.aplicarDiff(antes, { k1: Object.assign({}, antes.k1, { gente: [] }) }), volta = C.aplicarDiff(sai, { k1: antes.k1 }, { p2: 2 });
  ok(sai.k1.gente.length === 0 && volta.k1.gente[0].resp === 2 && C.aplicarDiff(sai, { k1: antes.k1 }).k1.gente[0].resp === 0, 'quem sai e volta (o líder desfazendo) volta com o respeito guardado pelo banco');
  ok(j(C.normCla({ respGuardado: { p2: 2, 'x y': 1, p3: 19, p4: 'a' } }).respGuardado) === j({ p2: 2, p3: 10 }) && j(C.normCla(null).respGuardado) === j({}), 'o respeito guardado continua no clã (o mestre gravando não o apaga)');
  ok(!('respGuardado' in C.projetar(Object.assign({ id: 'x', jogadores: true, respGuardado: { p2: 2 } }, {}), [])), 'e não vai para os jogadores');
}

/* ---------------- construções, recursos, respeito, relações, histórico ---------------- */
{
  const k = C.normConstrucoes([{ id: 'f1', nome: 'Forja', ico: 'forja', nivel: 2, efeito: 'Armas.', prox: { custo: [{ rec: 'r1', nome: 'Ferro', qtd: 45 }, { rec: 'r1', qtd: 9 }, { rec: 'r2', qtd: 0 }, { rec: 'x y', qtd: 3 }], efeito: 'E à noite.' } },
    { nome: '', ico: 'nada', nivel: 500 }, 'x']);
  ok(k.length === 2 && j(k[0].prox.custo) === j([{ rec: 'r1', nome: 'Ferro', qtd: 45 }]) && k[0].prox.efeito === 'E à noite.' && k[1].nome === 'Construção' && k[1].ico === 'salao' && k[1].nivel === 99 && /^ct_/.test(k[1].id),
    'as construções: nome, ícone, nível, efeito e o próximo nível (custo sem repetir recurso, sem zero)');
  const r = C.normRecursos({ lista: [{ id: 'r1', nome: 'Ouro', qtd: 240.7 }, { nome: '', qtd: -5 }, { id: 'r1', nome: 'Dup', qtd: 1 }], hist: [{ em: T0, mud: [{ rec: 'r1', n: 'Ouro', d: 120 }, { rec: 'r1', n: 'x', d: 0 }], mot: ' a escolta ' }, { mud: [] }] });
  ok(r.lista.length === 3 && r.lista[0].qtd === 240 && r.lista[1].nome === 'Recurso' && r.lista[1].qtd === 0 && r.lista[2].id !== 'r1' && r.hist.length === 1 && j(r.hist[0]) === j({ em: T0, tipo: 'rec', mud: [{ rec: 'r1', n: 'Ouro', d: 120 }], mot: 'a escolta' }),
    'os recursos: nome e quantidade (inteira, de 0 para cima) e o que mudou');
  ok(j(C.normRespeito({ v: 19, hist: [{ em: T0, de: 1, para: 2, mot: 'x' }] })) === j({ v: 10, hist: [{ em: T0, tipo: 'resp', de: 1, para: 2, mot: 'x' }] }) && C.normRespeito(null).v === 0 && C.normRespeito({ v: -9 }).v === -9, 'o respeito no mundo, de −10 a +10');
  const rl = C.normRelacoes([{ id: 'y1', tipo: 'faccao', alvo: 'fc_vale', nome: 'Liga do Vale', cor: '#5A8FD0', v: 3 }, { tipo: 'cla', alvo: 'var', v: -19 }, { tipo: 'cla', alvo: 'var', v: 1 }, { tipo: 'outro', alvo: 'z' }, { tipo: 'cla', alvo: 'a b' }]);
  ok(rl.length === 2 && rl[0].cor === '#5a8fd0' && rl[1].v === -10 && rl[1].nome === '' && /^rl_/.test(rl[1].id), 'as relações: com uma facção ou com um clã (uma por alvo), de −10 a +10');
  ok(j(C.normFaccao({ id: 'fc_vale', nome: 'Liga do Vale', cor: '#5a8fd0' })) === j({ id: 'fc_vale', nome: 'Liga do Vale', cor: '#5a8fd0' }) && C.normFaccao({ nome: 'sem id' }) === null && C.normFaccao(null) === null,
    'a facção do Mapa-múndi: uma referência (ou nenhuma)');
  const h = C.normHist([{ em: T0, tipo: 'rec', mud: [{ rec: 'r1', n: 'Ouro', d: 5 }] }, { tipo: 'rec', mud: [] }, { tipo: 'cons', nome: 'Forja', nivel: 3, mud: [{ rec: 'r1', n: 'Ferro', d: -45 }] },
    { tipo: 'resp', de: 1, para: 2, mot: 'm' }, { tipo: 'rel', alvoTipo: 'cla', alvo: 'var', nome: 'Casa Varonil', de: 0, para: -3 }, { tipo: 'rel', alvoTipo: 'x', alvo: 'var' },
    { tipo: 'membro', pid: 'p7', nome: 'Mira', de: 0, para: -1 }, { tipo: 'cargo', txt: ' Selene (líder): criou o cargo X. ' }, { tipo: 'texto', txt: '' }, { tipo: 'outro', txt: 'x' }]);
  ok(j(h.map(e => e.tipo)) === j(['rec', 'cons', 'resp', 'rel', 'membro', 'cargo']) && h[5].txt === 'Selene (líder): criou o cargo X.' && h[1].nivel === 3, 'o histórico: cada linha com o seu tipo (as tortas ficam de fora)');
}

/* ---------------- o clã, o que a mesa recebe e a projeção ---------------- */
const LAM = { id: 'lam', nome: 'Lâmina do Crepúsculo', lema: 'Onde a luz termina', ordem: 1, jogadores: true, ver: {}, brasao: { cores: ['#24305e', '#d9a441'] }, faccao: { id: 'fc_vale', nome: 'Liga do Vale', cor: '#5a8fd0' },
  cargos: CARGOS, construcoes: [{ id: 'f1', nome: 'Forja', nivel: 2 }], recursos: { lista: [{ id: 'r1', nome: 'Ferro', qtd: 18 }], hist: [] }, respeito: { v: 2, hist: [] },
  relacoes: [{ id: 'y1', tipo: 'faccao', alvo: 'fc_vale', nome: 'Liga do Vale', cor: '#5a8fd0', v: 3 }, { id: 'y2', tipo: 'cla', alvo: 'var', v: -3 }, { id: 'y3', tipo: 'cla', alvo: 'cor', v: -1 }],
  hist: [{ em: T0, tipo: 'rel', alvoTipo: 'cla', alvo: 'cor', nome: 'Ordem', de: 0, para: -1 }, { em: T0, tipo: 'rel', alvoTipo: 'cla', alvo: 'var', nome: 'Casa Varonil', de: 0, para: -3 }, { em: T0, tipo: 'membro', pid: 'p2', nome: 'Brisa', de: 0, para: 2 }] };
const VAR = { id: 'var', nome: 'Casa Varonil', lema: 'Ferro e honra', ordem: 2, jogadores: false, ver: { mostrar: true, cargos: true, respeito: true, hist: true }, brasao: { cores: ['#8a2a2a', '#c9ccd4'] },
  cargos: { lider: { nome: 'Lorde', gente: [{ id: 'v1', nome: 'Lorde Aster', resp: 3 }] }, s1: { nome: 'Espiã-mor', pai: 'lider', gente: [{ id: 'v2', nome: 'Vesna', resp: 1 }] } },
  construcoes: [{ id: 'k1', nome: 'Muralha', nivel: 2 }], recursos: { lista: [{ id: 'r1', nome: 'Ouro', qtd: 900 }], hist: [] }, respeito: { v: 1, hist: [] }, relacoes: [{ id: 'x1', tipo: 'cla', alvo: 'lam', v: -3 }],
  hist: [{ em: T0, tipo: 'membro', pid: 'v2', nome: 'Vesna', de: 0, para: 1 }, { em: T0, tipo: 'resp', de: 0, para: 1 }, { em: T0, tipo: 'rec', mud: [{ rec: 'r1', n: 'Ouro', d: 100 }] }, { em: T0, tipo: 'cargo', txt: 'O mestre: criou o cargo Espiã-mor.' }, { em: T0, tipo: 'texto', txt: 'Fundada.' }] };
const COR = { id: 'cor', nome: 'Ordem do Corvo', jogadores: false, ver: { mostrar: false, cargos: true }, brasao: { cores: ['#1b1b22', '#e8eaf0'] }, cargos: { lider: { nome: 'Grão-mestre', gente: [{ id: 'q1', nome: 'Corvo Branco', resp: 5 }] } } };
{
  const c = C.normCla(null);
  ok(c.nome === 'Clã sem nome' && c.jogadores === false && j(c.ver) === j({ mostrar: false, cargos: false, construcoes: false, recursos: false, respeito: false, relacoes: false, hist: false, membros: false }) && j(c.membros) === j({ avulsos: [], dados: {} })
    && c.faccao === null && j(c.cargos) === j({ lider: { nome: 'Líder', pai: null, ordem: 0, gente: [] } }) && j(c.recursos) === j({ lista: [], hist: [] }) && c.respeito.v === 0, 'o clã de começo');
  const nv = C.claNovo('  Casa Nova ', 3, false);
  ok(nv.nome === 'Casa Nova' && nv.ordem === 3 && nv.ver.mostrar === false && nv.brasao.simb !== null && C.claNovo('', 0, true).jogadores === true && C.claNovo('', 0, true).nome === 'Clã novo', 'um clã novo (escondido dos jogadores, até o mestre mostrar)');
  const todos = [LAM, VAR, COR];
  const pl = C.projetar(LAM, todos), pv = C.projetar(VAR, todos), pc = C.projetar(COR, todos);
  ok(j(Object.keys(pl).sort()) === j(['brasao', 'cargos', 'construcoes', 'faccao', 'hist', 'id', 'jogadores', 'lema', 'nome', 'ordem', 'recursos', 'relacoes', 'respeito', 'v', 'ver'])
    && Object.values(pl.ver).every(x => x === true) && pl.cargos.k1.gente[0].resp === 2, 'o clã dos jogadores vai inteiro (com o respeito de cada membro)');
  ok(j(pl.relacoes.map(r => r.alvo)) === j(['fc_vale', 'var']) && pl.relacoes[1].nome === 'Casa Varonil' && pl.relacoes[1].cor === '#8a2a2a', 'as relações: a Ordem (escondida) fica de fora; a Varonil leva nome e cor');
  ok(j(pl.hist.map(e => e.alvo || e.pid)) === j(['var', 'p2']), 'o histórico sem a linha sobre a Ordem');
  ok(j(Object.keys(pv).sort()) === j(['brasao', 'cargos', 'faccao', 'hist', 'id', 'jogadores', 'lema', 'nome', 'ordem', 'respeito', 'v', 'ver']) && pv.ver.construcoes === false && pv.ver.cargos === true,
    'a Varonil (NPC): a base e as partes marcadas');
  ok(!('resp' in pv.cargos.s1.gente[0]) && pv.cargos.s1.gente[0].nome === 'Vesna' && !('resp' in pv.cargos.lider.gente[0]), 'no clã de NPC, as pessoas vão sem o respeito');
  ok(j(pv.hist.map(e => e.tipo)) === j(['resp', 'cargo', 'texto']), 'o histórico da Varonil só fala das partes à mostra (sem o respeito dos membros, sem os recursos)');
  ok(j(pc) === j({ v: 1, oculto: true }) && j(C.projetar(Object.assign({}, VAR, { apagado: true }), todos)) === j({ v: 1, oculto: true }), 'o clã escondido (ou apagado): nada vai');
  ok(C.projetar(LAM, [LAM, VAR, Object.assign({}, COR, { ver: { mostrar: true } })]).relacoes.length === 3, 'mostrando a Ordem, a relação com ela aparece');
  const np = C.normPub(pv);
  ok(np.cargos.s1.gente[0].resp === null && np.construcoes === null && np.recursos === null && np.respeito.v === 1 && np.hist.length === 3 && C.normPub({ v: 1, oculto: true }) === null && C.normPub(null) === null,
    'o que a mesa recebe, conferido (as partes que não vieram ficam vazias)');
  const vi = C.comoVista(LAM, 'lam');
  ok(Object.values(vi.ver).every(x => x === true) && vi.verMestre.mostrar === false && vi.id === 'lam' && vi.cargos.k1.gente[0].resp === 2, 'a vista do mestre: o clã inteiro');
}

/* ---------------- as mudanças com histórico ---------------- */
{
  let c = C.normCla(LAM);
  c = C.mudarRecurso(c, 'r1', 5, 'a mina', T0);
  ok(c.recursos.lista[0].qtd === 23 && j(c.recursos.hist[0]) === j({ em: T0, tipo: 'rec', mud: [{ rec: 'r1', n: 'Ferro', d: 5 }], mot: 'a mina' }) && c.hist[0].tipo === 'rec', 'somar um recurso: no histórico dos recursos e no do clã');
  c = C.mudarRecurso(c, 'r1', 3, '', mais(20));
  ok(c.recursos.hist.length === 1 && c.recursos.hist[0].mud[0].d === 8 && c.recursos.hist[0].mot === 'a mina' && c.recursos.hist[0].em === mais(20), 'outra mudança no mesmo recurso, dentro de um minuto: a mesma linha (+8)');
  c = C.mudarRecurso(c, 'r1', -8, '', mais(40));
  ok(c.recursos.hist.length === 0 && c.recursos.lista[0].qtd === 18, 'voltando ao que era: a linha some');
  c = C.mudarRecurso(c, 'r1', 2, 'x', mais(50));
  c = C.mudarRecurso(c, 'r1', 2, 'outro motivo', mais(55));
  ok(c.recursos.hist.length === 2, 'com um motivo diferente: outra linha');
  c = C.mudarRecurso(c, 'r1', 1, '', mais(200));
  ok(c.recursos.hist.length === 3, 'depois de um minuto: outra linha');
  ok(C.mudarRecurso(c, 'r1', -1000, '', mais(300)).recursos.lista[0].qtd === 0 && C.mudarRecurso(c, 'r1', -1000, '', mais(300)).recursos.hist[0].mud[0].d === -23 && C.mudarRecurso(c, 'nada', 1) === null,
    'não fica abaixo de zero (o histórico diz o que saiu de verdade)');
  ok(C.definirRecurso(c, 'r1', 100, 'contagem', mais(300)).recursos.hist[0].mud[0].d === 77 && C.definirRecurso(c, 'r1', 23) === null, 'escrever a quantidade: o histórico leva a diferença');
  let r = C.mudarRespeito(c, 3, 'a escolta', T0);
  r = C.mudarRespeito(r, 4, '', mais(10));
  ok(r.respeito.v === 4 && r.respeito.hist.length === 1 && j(r.respeito.hist[0]) === j({ em: mais(10), tipo: 'resp', de: 2, para: 4, mot: 'a escolta' }) && C.mudarRespeito(c, 2) === null && C.mudarRespeito(c, 99, '', T0).respeito.v === 10,
    'o respeito no mundo: de 2 para 4 numa linha só');
  ok(C.mudarRespeito(C.mudarRespeito(c, 3, '', T0), 2, '', mais(5)).respeito.hist.length === 0, 'subiu e voltou: a linha some');
  const vira = C.mudarRespeito(C.mudarRespeito(c, 4, 'a escolta', T0), -3, '', mais(5));
  ok(vira.respeito.hist.length === 2 && j(vira.respeito.hist.map(e => [e.de, e.para, e.mot])) === j([[4, -3, ''], [2, 4, 'a escolta']]), 'virou para o outro lado (de +4 para −3): outra linha, sem levar o motivo da anterior');
  const quase = C.mudarRespeito(C.mudarRespeito(C.mudarRespeito(c, 5, '', T0), 4, '', mais(2)), 3, '', mais(4));
  ok(quase.respeito.hist.length === 1 && quase.respeito.hist[0].de === 2 && quase.respeito.hist[0].para === 3, '+3 e depois −2 (ainda para cima): a mesma linha, de +2 a +3');
  const rv = C.mudarRecurso(C.mudarRecurso(c, 'r1', 5, '', T0), 'r1', -9, '', mais(3));
  ok(rv.recursos.hist.length === c.recursos.hist.length + 2 && rv.recursos.hist[0].mud[0].d === -9 && rv.recursos.hist[1].mud[0].d === 5, 'um recurso que sobe 5 e depois desce 9: duas linhas');
  const rl = C.mudarRelacao(c, 'y2', -4, 'o duelo', T0, 'Casa Varonil');
  ok(rl.relacoes[1].v === -4 && j(rl.hist[0]) === j({ em: T0, tipo: 'rel', alvoTipo: 'cla', alvo: 'var', nome: 'Casa Varonil', de: -3, para: -4, mot: 'o duelo' }) && C.mudarRelacao(c, 'y2', -3) === null && C.mudarRelacao(c, 'zz', 1) === null,
    'uma relação: o valor e a linha no histórico');
  const mb = C.mudarMembro(c, 'p7', -2, '', T0, 'Mira');
  ok(C.membros(mb.cargos).find(m => m.pid === 'p7').pessoa.resp === -2 && j(mb.hist[0]) === j({ em: T0, tipo: 'membro', pid: 'p7', nome: 'Mira', de: -1, para: -2, mot: '' }) && C.mudarMembro(c, 'nada', 1) === null && C.mudarMembro(c, 'p7', -1) === null,
    'o respeito de um membro');
  ok(C.anotar([], { em: T0, tipo: 'cargo', txt: 'a' }, 2).length === 1 && C.anotar([{ em: T0, tipo: 'cargo', txt: 'a' }], { em: T0, tipo: 'cargo', txt: 'a' }, 9).length === 2
    && C.anotar([1, 2, 3].map(i => ({ em: T0, tipo: 'texto', txt: 't' + i })), { em: T0, tipo: 'texto', txt: 't0' }, 3).length === 3, 'as linhas de cargo não se juntam; o histórico tem um limite');
}
{
  const cla = C.normCla({ construcoes: [{ id: 'f1', nome: 'Forja', nivel: 2, efeito: 'Armas.', prox: { custo: [{ rec: 'r1', nome: 'Ferro', qtd: 45 }, { rec: 'r2', nome: 'Madeira', qtd: 20 }], efeito: 'Armas e armaduras.' } },
    { id: 'b1', nome: 'Biblioteca', nivel: 0, prox: { custo: [{ rec: 'r2', nome: 'Madeira', qtd: 10 }] } }, { id: 's1', nome: 'Salão', nivel: 1, efeito: 'Abriga 20.' }, { id: 'x1', nome: 'Velha', nivel: 1, prox: { custo: [{ rec: 'rz', nome: 'Pedra', qtd: 5 }] } }],
    recursos: { lista: [{ id: 'r1', nome: 'Ferro', qtd: 18 }, { id: 'r2', nome: 'Madeira', qtd: 55 }] } });
  ok(j(C.falta(cla, 'f1')) === j([{ rec: 'r1', nome: 'Ferro', qtd: 27 }]) && j(C.falta(cla, 'b1')) === j([]) && j(C.falta(cla, 'x1')) === j([{ rec: 'rz', nome: 'Pedra', qtd: 5 }]), 'o que falta para subir (o recurso que não existe mais conta inteiro)');
  ok(!C.subirNivel(cla, 'f1', T0).ok && C.subirNivel(cla, 'f1', T0).falta.length === 1, 'sem recurso: não sobe');
  const r = C.subirNivel(cla, 'b1', T0);
  ok(r.ok && r.cla.construcoes[1].nivel === 1 && r.cla.recursos.lista[1].qtd === 45 && j(r.cla.construcoes[1].prox) === j({ custo: [], efeito: '' }) && r.cla.construcoes[1].efeito === ''
    && j(r.cla.recursos.hist[0]) === j({ em: T0, tipo: 'rec', mud: [{ rec: 'r2', n: 'Madeira', d: -10 }], mot: 'Biblioteca foi construída' }) && r.cla.hist[0].tipo === 'cons' && r.cla.hist[0].nivel === 1,
    'subir a Biblioteca para o nível 1: desconta, o custo do próximo fica em branco, e vai para os dois históricos');
  const rico = C.normCla(Object.assign({}, cla, { recursos: { lista: [{ id: 'r1', nome: 'Ferro', qtd: 100 }, { id: 'r2', nome: 'Madeira', qtd: 55 }] } }));
  const f = C.subirNivel(rico, 'f1', T0);
  ok(f.ok && f.cla.construcoes[0].nivel === 3 && f.cla.construcoes[0].efeito === 'Armas e armaduras.' && f.cla.recursos.lista[0].qtd === 55 && f.cla.recursos.lista[1].qtd === 35
    && C.histTxt(f.cla.hist[0], null) === 'Forja subiu para o nível 3 (−45 Ferro, −20 Madeira).', 'subir a Forja: o efeito novo passa a valer');
  const s = C.subirNivel(cla, 's1', T0);
  ok(s.ok && s.cla.construcoes[2].nivel === 2 && s.cla.construcoes[2].efeito === 'Abriga 20.' && s.cla.recursos.hist.length === 0 && C.histTxt(s.cla.hist[0], null) === 'Salão subiu para o nível 2.', 'sem custo: sobe sem descontar nada');
  ok(!C.subirNivel(cla, 'nada', T0).ok, 'a construção que não existe');
}

/* ---------------- os textos ---------------- */
{
  const nomes = { mundo: ['m-5', 'm-4', 'm-3', 'm-2', 'm-1', 'm0', 'm1', 'm2', 'm3', 'm4', 'm5'] };
  ok(C.histTxt({ tipo: 'rec', mud: [{ n: 'Ouro', d: 1200 }, { n: 'Ferro', d: -5 }], mot: 'a escolta' }) === '+1.200 Ouro, −5 Ferro — a escolta.', 'recursos (com o motivo)');
  ok(C.histTxt({ tipo: 'resp', de: 1, para: 2, mot: '' }, nomes) === 'Respeito no mundo: +2 (m2).' && C.histTxt({ tipo: 'resp', de: 1, para: 2, mot: 'x' }, null) === 'Respeito no mundo: +2 (Respeitado) — x.', 'o respeito no mundo, com os nomes da mesa');
  ok(C.histTxt({ tipo: 'rel', alvoTipo: 'cla', nome: 'Casa Varonil', para: -3, mot: 'o duelo' }) === 'Relação com Casa Varonil: −3 (Rival) — o duelo.' && C.histTxt({ tipo: 'rel', alvoTipo: 'faccao', nome: '', para: 0 }) === 'Relação com uma facção: 0 (Neutro).',
    'uma relação');
  ok(C.histTxt({ tipo: 'membro', nome: 'Mira', para: -1 }) === 'Respeito de Mira no clã: −1 (Questionado).' && C.histTxt({ tipo: 'cons', nome: 'Biblioteca', nivel: 1, mud: [] }) === 'Biblioteca foi construída.'
    && C.histTxt({ tipo: 'cargo', txt: 'Selene (líder): criou o cargo X.' }) === 'Selene (líder): criou o cargo X.', 'um membro, uma construção, os cargos');
  ok(C.custoTxt([{ rec: 'r1', nome: 'Velho', qtd: 45 }, { rec: 'r9', nome: 'Pedra', qtd: 2000 }], { lista: [{ id: 'r1', nome: 'Ferro' }] }) === '45 Ferro · 2.000 Pedra' && C.mudTxt([{ n: 'Ouro', d: -3 }]) === '−3 Ouro',
    'o custo (com o nome de agora do recurso) e o que mudou');
}

/* ---------------- (lote 60) o membro ligado: a ficha e o soldado ---------------- */
{
  const c0 = C.normCla({ v: 1, nome: 'X', cargos: { lider: { nome: 'Líder', gente: [] } } });
  const r = C.novoMembro(c0, { nome: 'Ilya', racaN: 'Elfo', sold: { pc: 'pc_nyx', un: 'un_1', sd: 'sd_ilya' } }, null);
  ok(r && j(r.cla.membros.dados[r.pid].sold) === j({ pc: 'pc_nyx', un: 'un_1', sd: 'sd_ilya' }) && C.membroDoSoldado(r.cla, 'pc_nyx', 'un_1', 'sd_ilya') === r.pid && C.membroDoSoldado(r.cla, 'pc_nyx', 'un_1', 'sd_x') === null,
    'o membro que é um soldado: a ligação guardada e achada pelo soldado');
  { const k = C.novoMembro(c0, { nome: 'Kel', racaN: 'Anão', sold: { pc: 'pc_nyx', un: 'un 1', sd: 'sd' } }, null); ok(k && !k.cla.membros.dados[k.pid].sold, 'a ligação com id ruim não entra'); }
  const c2 = C.mudarMembroDados(r.cla, r.pid, { pc: 'pc_selene', nome: 'Selene', sold: null }), m2 = C.membrosDe(c2).find(x => x.pid === r.pid);
  ok(m2.pessoa.pc === 'pc_selene' && !m2.dados.sold && m2.dados.racaN === 'Elfo', 'ligar à ficha: a ficha manda, a ligação com o soldado sai, a raça anotada fica');
  const c3 = C.mudarMembroDados(c2, r.pid, { pc: null, nome: 'Selene' }), m3 = C.membrosDe(c3).find(x => x.pid === r.pid);
  ok(!m3.pessoa.pc && m3.pessoa.nome === 'Selene', 'desligar: fica o nome anotado');
}

/* ---------------- (lote 62) o cofre (+50 / -20), as etiquetas e a favorita ---------------- */
{
  ok(j([C.lerQtd('+50'), C.lerQtd('-20'), C.lerQtd('−7'), C.lerQtd(' 1.240 '), C.lerQtd('0'), C.lerQtd('abc'), C.lerQtd('+')]) === j([{ delta: 50 }, { delta: -20 }, { delta: -7 }, { valor: 1240 }, { valor: 0 }, null, null]),
    'a quantidade: +50 soma, -20 (ou −7) tira, um número troca (o ponto dos milhares vale); o resto não é número');
  ok(j(C.normTags('defesa, Economia, DEFESA, a, b, c')) === j(['defesa', 'Economia', 'a', 'b']) && j(C.normTags(null)) === '[]', 'as etiquetas: até 4, sem repetir (sem diferença de maiúsculas)');
  const k = C.normCla({ construcoes: [{ nome: 'Forja', fav: true, tags: ['defesa'] }, { nome: 'Salão', fav: 'sim' }] }).construcoes;
  ok(k[0].fav === true && j(k[0].tags) === j(['defesa']) && !('fav' in k[1]) && !('tags' in k[1]), 'a favorita e as etiquetas ficam na construção (só quando há)');
}

console.log(ruins ? n - ruins + ' verificações passaram, ' + ruins + ' falharam' : n + ' verificações passaram');
process.exit(ruins ? 1 : 0);
