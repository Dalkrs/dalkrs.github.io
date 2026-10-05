// A mesa na nuvem com vários aparelhos, sem navegador: o programa de verdade (7c. PROJEÇÃO + 7d. NUVEM) rodando em
// vários "aparelhos" ao mesmo tempo — dois do mestre e os dos jogadores —, ligados a um banco de mentira que entrega
// cada gravação aos outros com atraso, como o banco de verdade. O relógio do programa anda 10 vezes mais rápido.
const fs = require('fs'), path = require('path'), vm = require('vm');
const FILES = ['01-base.js', '02-store.js', '03-geo.js', '03b-walls.js', '07-app.js', '07c-projecao.js', '07d-nuvem.js'];
const FONTE = FILES.map(f => fs.readFileSync(path.join(__dirname, '../src/js', f), 'utf8')).join('\n');
const ESCALA = 10;

let fails = 0, n = 0, cenario = '';
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('FALHOU:', '[' + cenario + ']', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg} — esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`);
const espera = ms => new Promise(r => setTimeout(r, ms));
const ate = async (fn, ms = 4000, passo = 15) => { const t0 = Date.now(); for (;;) { let v = false; try { v = fn(); } catch (e) { v = false; } if (v) return true; if (Date.now() - t0 > ms) return false; await espera(passo); } };
const copia = x => JSON.parse(JSON.stringify(x));

/* ---- o banco de mentira: documentos com dono e visibilidade, entregues aos outros aparelhos com atraso ---- */
function banco() {
  const linhas = new Map(), aparelhos = [];
  let rev = 0;
  const ve = (ap, l) => ap.papel === 'mestre' || l.vis === 'mesa' || l.dono_id === ap.eu;
  return {
    linhas, aparelhos, gravacoes: [],
    // uma gravação chega ao banco: ganha um número (rev) e é entregue a todos os outros que podem vê-la
    aplicar(de, id, campos) {
      const ant = linhas.get(id) || { id, dono_id: null, vis: 'mestre', dados: null, apagado: false };
      const l = Object.assign({}, ant, copia(campos), { rev: ++rev });
      if (!('apagado' in campos)) l.apagado = false;
      linhas.set(id, l);
      this.gravacoes.push(de.nome + ' ' + id + (l.apagado ? ' (apagado)' : ''));
      for (const ap of aparelhos) {
        if (ap === de || ap.morto || !ve(ap, l)) continue;
        if (ap.surdo) { ap.perdidos.add(id); continue; }      // sem ler o banco por um tempo: quando voltar, lê como estiver
        setTimeout(() => { if (!ap.morto) ap.receber(copia(l)); }, ap.atrasoRx);
      }
      return l.rev;
    },
    // um aparelho que ficou um tempo sem ler o banco volta a ler: recebe cada documento como está agora (não as versões do meio)
    ouvir(ap) { ap.surdo = false; for (const id of ap.perdidos) { const l = linhas.get(id); if (l && ve(ap, l)) ap.receber(copia(l)); } ap.perdidos.clear(); },
    // …ou recebe um documento só, como está agora (a ordem em que as notícias chegam a um aparelho não é garantida)
    entregar(ap, id) { ap.perdidos.delete(id); const l = linhas.get(id); if (l && ve(ap, l)) ap.receber(copia(l)); },
    visiveis(ap) { return [...linhas.values()].filter(l => !l.apagado && ve(ap, l)).map(copia); },
    doc(id) { const l = linhas.get(id); return l && !l.apagado ? l.dados : null; },
  };
}

/* ---- um aparelho: o programa das Cenas, com a ponte da mesa ligada ao banco de mentira ----
   No meio do caminho fica o que a casca (tc.js) faz: junta as gravações de cada documento por meio segundo, manda
   uma de cada vez, e — enquanto um documento tem algo daqui por subir — o que chega dele do banco não é entregue ao
   programa (vale o daqui, que vai por cima). O que chega mais velho do que o que já se tem também não. */
function aparelho(DB, { nome, papel, eu, membros, atrasoTx = 30, atrasoRx = 5 }) {
  const ap = { nome, papel, eu, atrasoRx, morto: false, surdo: false, perdidos: new Set(), bloqueado: new Set(), segura: new Set(), avisos: [], alertas: [] };
  const espelho = new Map(DB.visiveis(ap).map(l => [l.id, l])), ouvintes = [];
  const fila = new Map(), emVoo = new Set(), tempo = new Map();
  const mandar = id => {
    tempo.delete(id);
    if (ap.morto || emVoo.has(id) || !fila.has(id)) return;
    if (ap.segura.has(id)) { tempo.set(id, setTimeout(() => mandar(id), 10)); return; }      // a gravação deste documento está demorando a sair
    const campos = fila.get(id); fila.delete(id); emVoo.add(id);
    setTimeout(() => {
      emVoo.delete(id);
      if (ap.morto) return;
      const rev = ap.bloqueado.has(id) ? 0 : DB.aplicar(ap, id, campos);
      const l = espelho.get(id);
      if (l && rev) l.rev = rev;
      if (fila.has(id)) agendarEnvio(id);
    }, atrasoTx);
  };
  const agendarEnvio = id => { if (!tempo.has(id)) tempo.set(id, setTimeout(() => mandar(id), 500 / ESCALA)); };
  ap.receber = l => {
    if (fila.has(l.id) || emVoo.has(l.id)) return;           // há algo daqui por subir neste documento: vale o daqui
    const tenho = espelho.get(l.id);
    if (tenho && (tenho.rev || 0) >= l.rev) return;           // mais velho do que o que este aparelho já tem
    if (l.apagado) espelho.delete(l.id); else espelho.set(l.id, l);
    for (const f of ouvintes.slice()) f(l);
  };
  const D = {
    pronta: Promise.resolve(true),
    todas: () => [...espelho.values()],
    pegar: id => espelho.get(id) || null,
    gravar(id, campos) { const l = Object.assign({}, espelho.get(id) || { id, rev: 0 }, campos); espelho.set(id, l); fila.set(id, Object.assign(fila.get(id) || {}, campos, { apagado: false })); agendarEnvio(id); return l; },
    apagar(id) { espelho.delete(id); fila.set(id, { apagado: true }); agendarEnvio(id); },
    aoMudar(fn) { ouvintes.push(fn); },
  };
  ap.porSubir = () => fila.size + emVoo.size;
  const st = { mesa: { id: 'mesa1', nome: 'Mesa' }, papel, eu, segredo: false, membros };
  const local = {};
  const guarda = o => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); } });
  const sandbox = {
    console: { log() {}, error: (...a) => console.error(...a), warn: (...a) => ap.alertas.push(a.map(String).join(' ')) },
    Math, JSON, Date, Number, String, Object, Array, Map, Set, Uint8Array, Uint32Array, isFinite, parseFloat, parseInt, Promise, Error, RegExp,
    setTimeout: (fn, ms, ...a) => setTimeout(() => { if (!ap.morto) fn(...a); }, (ms || 0) / ESCALA), clearTimeout,
    document: { createElement: () => ({ getContext: () => ({ measureText: () => ({ width: 10 }), isPointInPath: () => false }) }), createElementNS: () => ({ setAttribute() {}, append() {} }) },
    Path2D: function () {}, performance: { now: () => Date.now() * ESCALA },          // (o relógio do programa anda junto com os temporizadores dele)
    Render: { request() {}, fit() {} }, UI: { toast(t) { ap.avisos.push(String(t)); }, setViewer() {}, switchScene() {} }, Tools: { undo() {}, cancel() {}, busy: () => false },
    Vision: { invalidate() {}, resetExplored() {} }, Fichas: { paraFicha() {}, falta: () => false, syncAll() {} }, pruneSel() {},
    FX: { P: { fogo: { n: 'Fogo' } } },
    crypto: { getRandomValues(buf) { buf[0] = Math.floor(Math.random() * 4294967296); return buf; } },
    makeDB: () => ({ open: async () => false, ready: () => false, all: async () => new Map(), write: async () => {} }),
    location: { search: '?casca=1' }, localStorage: guarda(local),
  };
  sandbox.window = { TC: { ponte: { naCasca: true, pronta: Promise.resolve(st), aoMudar() {} }, dados: { disponivel: () => true, col: () => D }, arquivos: {} } };
  vm.createContext(sandbox);
  vm.runInContext(FONTE + '\n;globalThis.T = { Store, Proj, Nuvem, App, newScene, newToken, normalizeScene, cleanBar, clone, uid };', sandbox);
  Object.assign(ap, sandbox.T, { D, espelho });
  DB.aparelhos.push(ap);
  ap.abrir = async () => {
    await ap.Nuvem.iniciar();
    ap.Nuvem.carregar();
    if (papel === 'mestre' && !ap.Store.scene()) { const sc = ap.newScene('Nova cena'); ap.Store.addScene(sc); ap.Store.S.current = sc.id; ap.Nuvem.cena(sc.id); ap.Nuvem.meta(); }
    ap.Store.on('commit', e => { if (ap.Nuvem.mestre()) ap.Nuvem.cena(e.sceneId); });     // (como em 11-boot: Persist.scene → Nuvem.cena)
    return ap;
  };
  ap.fechar = () => { ap.morto = true; };
  ap.tok = nome => { const sc = ap.Nuvem.jogador() ? ap.Store.scene() : ap.Store.S.scenes[ap.cena] || ap.Store.scene(); return sc.tokens.find(t => t.name === nome); };
  return ap;
}

const MEMBROS = [{ id: 'gm', nome: 'Bruno', papel: 'mestre' }, { id: 'u-ana', nome: 'Ana', papel: 'jogador' }, { id: 'u-beto', nome: 'Beto', papel: 'jogador' }];
const par = DB => { const m = DB.doc('cena:pub:m'), v = DB.doc('cena:pub:v'); return { ver: m ? m.ver : null, mv: v ? v.mv : null }; };
const casado = DB => { const p = par(DB); return typeof p.ver === 'string' && p.ver === p.mv; };

// Uma mesa montada: o mestre no aparelho A, com uma cena no ar, e os jogadores que forem pedidos.
async function mesa(jogadores) {
  const DB = banco();
  const A = await aparelho(DB, { nome: 'A', papel: 'mestre', eu: 'gm', membros: MEMBROS }).abrir();
  const sc = A.Store.scene();
  A.cena = sc.id;
  A.Store.tx('preparar', () => {
    A.Store.add('tokens', A.newToken(sc, 64, 64, { name: 'Dain', owner: 'u-ana', bars: [A.cleanBar({ n: 'Vida', v: 20, m: 30 }), A.cleanBar({ n: 'SP', v: 10, m: 10 })] }));
    A.Store.add('tokens', A.newToken(sc, 128, 64, { name: 'Lia', owner: 'u-beto', bars: [A.cleanBar({ n: 'Vida', v: 12, m: 12 })] }));
    A.Store.add('tokens', A.newToken(sc, 320, 64, { name: 'Orc' }));
  });
  A.Nuvem.mostrar(sc.id);
  await ate(() => casado(DB) && !!DB.doc('cenas:indice') && DB.doc('cenas:indice').noAr === sc.id && !A.porSubir());
  const J = {};
  for (const id of jogadores || []) { J[id] = await aparelho(DB, { nome: id, papel: 'jogador', eu: id, membros: MEMBROS }).abrir(); }
  await ate(() => Object.values(J).every(p => !p.Nuvem.semCena()));
  return { DB, A, J, cena: sc.id };
}
const mestre2 = async (DB, nome, cena) => { const B = await aparelho(DB, { nome, papel: 'mestre', eu: 'gm', membros: MEMBROS }).abrir(); B.cena = cena; return B; };
const vida = (ap, nome) => ap.tok(nome).bars[0].v;
const dano = (P, nome, quanto) => P.Store.tx('dano', () => P.Store.upd('tokens', P.tok(nome).id, { bars: P.tok(nome).bars.map((b, i) => (i ? b : Object.assign({}, b, { v: b.v - quanto }))) }));
const quieto = async (DB, ms = 700) => { await ate(() => DB.aparelhos.every(ap => ap.morto || !ap.porSubir())); const n = DB.gravacoes.length; await espera(ms); return DB.gravacoes.slice(n); };
// As gravações param? (uma janela de 6 segundos do relógio do programa sem ninguém gravar nada, em até um minuto)
const assenta = async DB => { for (let i = 0; i < 10; i++) { const g = await quieto(DB, 600); if (!g.length) return true; } return false; };
const quemTransmite = (...aps) => aps.filter(ap => !ap.morto && ap.Nuvem.transmito()).map(ap => ap.nome).join('+');
// Espera um aparelho do mestre estar transmitindo e o outro não; se não acontecer, a falha diz como as coisas ficaram.
const txDe = l => ((l && l.dados) || {}).tx;
const soTransmite = async (DB, quem, outro, msg) => {
  const r = await ate(() => quem.Nuvem.transmito() && !outro.Nuvem.transmito());
  ok(r, msg + (r ? '' : ': ' + JSON.stringify({ transmitem: quemTransmite(quem, outro), banco: (DB.doc('cenas:indice') || {}).tx, [quem.nome]: txDe(quem.espelho.get('cenas:indice')), [outro.nome]: txDe(outro.espelho.get('cenas:indice')), porSubir: [quem.porSubir(), outro.porSubir()], diario: DB.gravacoes.slice(-10) })));
  return r;
};

(async () => {
  /* ============ dois aparelhos do mestre: só um transmite ============ */
  cenario = 'dois aparelhos do mestre: só um transmite';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    ok(A.Nuvem.transmito() && DB.doc('cenas:indice').tx && casado(DB), 'quem põe a cena no ar transmite; as duas metades da projeção combinam');
    eq(P.Store.scene().tokens.map(t => t.name), ['Dain', 'Lia', 'Orc'], 'o jogador recebe a cena');

    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, 'o mestre abre a mesa em outro aparelho: é esse que passa a transmitir, e o primeiro passa a acompanhar');
    await quieto(DB, 100);
    const desdeB = DB.gravacoes.length;
    ok(await ate(() => casado(DB)), 'a projeção continua com as duas metades combinando');

    // o jogador move e gasta vida: vale uma vez só, nos dois aparelhos do mestre
    P.Store.tx('mover', () => P.Store.upd('tokens', P.tok('Dain').id, { x: 192 }));
    ok(await ate(() => A.tok('Dain').x === 192 && B.tok('Dain').x === 192 && P.Nuvem.pendentes() === 0), 'o jogador move o token: o movimento chega aos dois aparelhos do mestre e é confirmado');
    dano(P, 'Dain', 5);
    ok(await ate(() => P.Nuvem.pendentes() === 0 && vida(A, 'Dain') === 15 && vida(B, 'Dain') === 15), 'o jogador tira 5 de Vida: fica 15 nos dois aparelhos');
    await espera(600);
    eq([vida(A, 'Dain'), vida(B, 'Dain'), vida(P, 'Dain')], [15, 15, 15], 'e continua 15 depois de tudo assentar (o pedido não é aplicado duas vezes)');
    const escritores = new Set(DB.gravacoes.slice(desdeB).filter(g => / cena:(pub:|[^p][^ ]*:[mv])/.test(g)).map(g => g.split(' ')[0]));
    eq([...escritores], ['B'], 'quem escreve a projeção (e a cena que está no ar) é só o aparelho que transmite');

    // o mestre mexe no primeiro aparelho: é ele que passa a transmitir
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 448 }));
    ok(await ate(() => A.Nuvem.transmito() && !B.Nuvem.transmito() && P.tok('Orc').x === 448), 'o mestre mexe no primeiro aparelho: ele assume a transmissão e o jogador vê a mudança');
    // muda o mapa duas vezes e os tokens no meio: o jogador nunca fica travado
    A.Store.tx('hora', () => A.Store.scn({ tone: 'noite' }));
    ok(await ate(() => P.Store.scene().tone === 'noite' && casado(DB)), 'mudança no mapa chega ao jogador');
    A.Store.tx('hora', () => A.Store.scn({ tone: 'entardecer' }));
    P.Store.tx('mover', () => P.Store.upd('tokens', P.tok('Dain').id, { x: 256 }));
    ok(await ate(() => P.Store.scene().tone === 'entardecer' && A.tok('Dain').x === 256 && P.Nuvem.pendentes() === 0 && casado(DB)), 'mapa e pedido ao mesmo tempo: os dois valem, e a projeção continua combinando');
    for (let i = 1; i <= 3; i++) {
      A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 448 + 64 * i }));
      ok(await ate(() => P.tok('Orc').x === 448 + 64 * i), 'o mestre move o Orc (' + i + ') e o jogador vê, com o outro aparelho aberto e parado');
    }
    ok(await ate(() => B.tok('Orc').x === 640 && B.Store.scene().tone === 'entardecer'), 'e o aparelho que acompanha recebe as mudanças também');

    // o aparelho que transmite fecha: o outro assume sozinho quando um pedido fica sem resposta
    B.Store.tx('mover', () => B.Store.upd('tokens', B.tok('Lia').id, { x: 512 }));
    ok(await ate(() => B.Nuvem.transmito() && !A.Nuvem.transmito() && P.tok('Lia').x === 512), 'o mestre mexe no segundo aparelho: a transmissão volta para ele');
    B.fechar();
    const t0 = Date.now();
    P.Store.tx('mover', () => P.Store.upd('tokens', P.tok('Dain').id, { x: 320 }));
    await espera(300);
    ok(!A.Nuvem.transmito() && A.tok('Dain').x === 256, 'o aparelho que transmitia fechou: por alguns segundos o pedido do jogador espera (o outro ainda não sabe)');
    ok(await ate(() => A.Nuvem.transmito() && A.tok('Dain').x === 320 && P.Nuvem.pendentes() === 0, 6000), 'depois o aparelho que ficou assume sozinho e aplica o pedido (' + (Date.now() - t0) * ESCALA / 1000 + ' s no relógio do programa)');
    ok(casado(DB), 'com a projeção combinando');
    // tirar do ar pelo aparelho que acompanha
    const C = await mestre2(DB, 'C', cena);
    await soTransmite(DB, C, A, '(um terceiro aparelho abre e passa a transmitir)');
    A.Nuvem.esconder();
    ok(await ate(() => !DB.doc('cena:pub:m') && !DB.doc('cena:pub:v') && P.Nuvem.semCena() && C.Nuvem.noAr() === null && DB.doc('cenas:indice').noAr === null), 'tirar a cena do ar num aparelho vale para todos: a projeção sai e o jogador fica sem cena');
    await espera(500);
    ok(!DB.doc('cena:pub:m') && !DB.doc('cena:pub:v'), 'e a projeção não volta sozinha');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ um pedido malfeito não para os dos outros ============ */
  cenario = 'um pedido malfeito não para os dos outros';
  {
    const { DB, A, J } = await mesa(['u-ana', 'u-beto']);
    const PA = J['u-ana'], PB = J['u-beto'];
    const ruim = JSON.parse('{"toString":1,"valueOf":1}');
    // a Ana escreve direto no documento de pedidos dela (por fora do programa): um pedido que dá erro em quem o lê,
    // um de verdade no mesmo lote, e outro lote com coisas sem pé nem cabeça
    PA.D.gravar('cena:pedido:u-ana', { dono_id: 'u-ana', vis: 'mestre', dados: { cena: A.cena, lote: [
      { n: 1, ops: [{ t: 'upd', c: 'tokens', id: PA.tok('Dain').id, p: { bars: [{ n: 'Vida', v: ruim, x: ruim }], auras: [{ id: ruim, r: ruim, c: ruim }] }, b: { bars: [{ n: 'Vida', v: ruim }] } }, { t: 'add', c: 'shapes', v: { id: 'sx', k: 'text', txt: ruim } }, { t: 'upd', c: 'tokens', id: PA.tok('Dain').id, p: { x: 384 } }] },
      { n: 2, ops: [ruim, null, 7, 'x', { t: ruim, c: ruim }, { t: 'ping', x: ruim, y: 1 }] },
      ruim, { n: ruim, ops: [] }, { n: 3, ops: ruim }] } });
    PB.Store.tx('mover', () => PB.Store.upd('tokens', PB.tok('Lia').id, { x: 256 }));
    ok(await ate(() => A.tok('Lia').x === 256 && PB.Nuvem.pendentes() === 0), 'com um pedido malfeito de outro jogador na fila, o pedido do Beto é aplicado e confirmado do mesmo jeito');
    ok(await ate(() => A.tok('Dain').x === 384 && (DB.doc('cena:pub:v').ack || {})['u-ana'] === 2), 'do lote da Ana, o que dava erro foi pulado, o movimento de verdade valeu, e a conta dela andou');
    eq([vida(A, 'Dain'), A.Store.scene().shapes.length], [20, 0], 'e nada do que era malfeito entrou na cena');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ um mapa grande demais para o banco não trava os tokens ============ */
  cenario = 'um mapa grande demais para o banco não trava os tokens';
  {
    const { DB, A, J } = await mesa(['u-ana']);
    const P = J['u-ana'], verAntes = par(DB).ver;
    A.Store.tx('desenhão', () => A.Store.add('shapes', { id: 'enorme', k: 'text', x: 0, y: 0, txt: 'ç'.repeat(800000), fs: 20, s: '#ffffff', sw: 0, f: null, a: 1, top: false, gm: false, lock: false, by: null }));
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 512 }));
    ok(await ate(() => P.tok('Orc').x === 512), 'com o mapa grande demais para o banco, os tokens continuam chegando ao jogador (com o mapa que já estava lá)');
    eq([par(DB).ver, par(DB).mv, P.Store.scene().shapes.length], [verAntes, verAntes, 0], 'a parte viva continua dizendo que vale para o mapa que está guardado');
    ok(A.avisos.some(t => /grande demais/.test(t)), 'e o mestre é avisado de que a cena ficou grande demais');
    A.Store.tx('apagar', () => A.Store.del('shapes', 'enorme'));
    A.Store.tx('hora', () => A.Store.scn({ tone: 'noite' }));
    ok(await ate(() => P.Store.scene().tone === 'noite' && casado(DB) && par(DB).ver !== verAntes), 'apagado o desenho, o mapa volta a ser gravado e o jogador recebe');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ a conta dos pedidos vai guardada com a cena ============ */
  cenario = 'a conta dos pedidos vai guardada com a cena';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    A.bloqueado.add('cena:pub:v');                          // a projeção do mestre para de chegar ao banco (a rede caiu no meio)
    P.Store.tx('dano', () => P.Store.upd('tokens', P.tok('Dain').id, { bars: P.tok('Dain').bars.map((b, i) => (i ? b : Object.assign({}, b, { v: b.v - 5 }))) }));
    ok(await ate(() => vida(A, 'Dain') === 15 && (DB.doc('cena:' + cena + ':v').ack || {})['u-ana'] === 1), 'o mestre aplica o pedido, e a cena é guardada já dizendo até onde os pedidos valeram');
    ok(!(DB.doc('cena:pub:v').ack || {})['u-ana'] && P.Nuvem.pendentes() === 1, '(a projeção não chegou ao banco: para o jogador, o pedido ainda não foi confirmado)');
    A.fechar();
    const A2 = await mestre2(DB, 'A2', cena);              // o mestre abre a mesa de novo
    ok(await ate(() => P.Nuvem.pendentes() === 0 && (DB.doc('cena:pub:v').ack || {})['u-ana'] === 1), 'o mestre abre a mesa de novo: a projeção é refeita e o pedido aparece confirmado');
    await espera(400);
    eq([vida(A2, 'Dain'), vida(P, 'Dain')], [15, 15], 'sem aplicar o mesmo pedido uma segunda vez (15, e não 10)');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ o mestre mexe num aparelho que não é o que transmite, no meio de um pedido de jogador ============ */
  cenario = 'o mestre mexe num aparelho que não é o que transmite, no meio de um pedido de jogador';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o aparelho B abriu por último: é ele que transmite)');
    // o mestre começa a arrastar o Orc no aparelho A, e ainda não soltou…
    A.Store.begin('arrastar'); A.Store.upd('tokens', A.tok('Orc').id, { x: 704 });
    // …quando o jogador tira 5 de Vida: quem aplica e confirma é o B
    dano(P, 'Dain', 5);
    ok(await ate(() => vida(B, 'Dain') === 15 && P.Nuvem.pendentes() === 0 && !B.porSubir()), 'o aparelho que transmite aplica e confirma o pedido do jogador');
    await espera(150);                                       // (o que o B gravou chega ao A, que está no meio do gesto e deixa para depois)
    eq(vida(A, 'Dain'), 20, '(o aparelho A, no meio do gesto, ainda não recebeu a cena com o pedido aplicado)');
    A.Store.commit();                                        // o mestre solta: o A assume a transmissão
    ok(await ate(() => A.Nuvem.transmito() && !B.Nuvem.transmito() && P.tok('Orc').x === 704 && B.tok('Orc').x === 704), 'o mestre solta: o aparelho dele assume, e o movimento chega ao jogador e ao outro aparelho');
    ok(await assenta(DB), 'e as gravações param (ninguém fica reescrevendo o que o outro escreveu)');
    eq([vida(A, 'Dain'), vida(B, 'Dain'), vida(P, 'Dain'), P.Nuvem.pendentes()], [15, 15, 15, 0], 'o pedido do jogador, já confirmado, não se perde: a cena que chegou e o gesto do mestre valem os dois');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ o aparelho que assume estava com a cena atrasada: o jogador manda de novo ============ */
  cenario = 'o aparelho que assume estava com a cena atrasada: o jogador manda de novo';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o aparelho B transmite)');
    await quieto(DB, 100);
    A.surdo = true;                                          // o aparelho A fica um tempo sem ler o banco: o que acontece no B não chega nele
    dano(P, 'Dain', 5);
    ok(await ate(() => vida(B, 'Dain') === 15 && P.Nuvem.pendentes() === 0 && !B.porSubir()), 'o B aplica e confirma o pedido');
    eq(vida(A, 'Dain'), 20, '(o A ainda não soube)');
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 576 }));      // o mestre mexe no A, que assume com a cópia atrasada
    ok(await ate(() => A.Nuvem.transmito() && P.tok('Orc').x === 576), 'o mestre mexe no A: ele assume e o jogador vê');
    eq([vida(A, 'Dain'), (DB.doc('cena:pub:v').ack || {})['u-ana'] || 0], [20, 0], '(a cópia do A não tinha o pedido: a cena dele vai para o banco sem ele, e a conta volta atrás)');
    ok(await ate(() => P.Nuvem.pendentes() === 1 && vida(P, 'Dain') === 15, 2000), 'o jogador percebe que a conta voltou atrás: o pedido dele volta para a fila e continua valendo na tela dele');
    DB.ouvir(A);                                             // (o A volta a ler o banco: recebe tudo como está agora)
    ok(await ate(() => vida(A, 'Dain') === 15 && vida(P, 'Dain') === 15 && P.Nuvem.pendentes() === 0, 6000), 'o jogador percebe que a conta voltou atrás e manda o pedido de novo: ele vale no aparelho que transmite agora');
    const fimB = await ate(() => vida(B, 'Dain') === 15 && B.tok('Orc').x === 576 && !B.Nuvem.transmito(), 6000);
    ok(fimB, 'e o B acaba com a mesma cena' + (fimB ? '' : ': ' + JSON.stringify({ vidaB: vida(B, 'Dain'), orcB: B.tok('Orc').x, txB: B.Nuvem.transmito(), txA: A.Nuvem.transmito(), vidaA: vida(A, 'Dain'), banco: DB.doc('cena:' + cena + ':v').tokens.map(t => [t.name, t.x, t.bars[0].v]), ack: DB.doc('cena:' + cena + ':v').ack, ult: DB.gravacoes.slice(-12) })));
    await espera(300);
    eq([vida(A, 'Dain'), vida(B, 'Dain'), vida(P, 'Dain')], [15, 15, 15], 'uma vez só (15, nem 20 nem 10)');
    ok(await assenta(DB), 'e as gravações param');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ o aparelho que assume estava atrasado, e o jogador já fez outro pedido ============ */
  cenario = 'o aparelho que assume estava atrasado, e o jogador já fez outro pedido';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o B transmite)');
    await quieto(DB, 100);
    A.surdo = true;
    dano(P, 'Dain', 5);                                      // pedido 1: o B aplica e confirma
    ok(await ate(() => vida(B, 'Dain') === 15 && P.Nuvem.pendentes() === 0 && !B.porSubir() && !P.porSubir()), '(o B aplica e confirma o pedido 1)');
    P.surdo = true;                                          // o jogador fica um instante sem ler o banco…
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 576 }));      // …o mestre mexe no A, que assume sem ter o pedido 1…
    ok(await ate(() => A.Nuvem.transmito() && !A.porSubir()), '(o A assume, com a cópia atrasada)');
    P.Store.tx('mover', () => P.Store.upd('tokens', P.tok('Dain').id, { x: 256 }));      // …e o jogador faz o pedido 2, sem saber de nada disso
    await ate(() => (DB.doc('cena:pedido:u-ana').lote || []).some(b => b.n === 2));
    eq((DB.doc('cena:pedido:u-ana').lote || []).map(b => b.n), [1, 2], 'o documento de pedidos do jogador guarda o pedido novo e também o que já tinha sido confirmado há pouco');
    DB.ouvir(A); DB.ouvir(P);
    const doisValem = await ate(() => vida(A, 'Dain') === 15 && A.tok('Dain').x === 256 && P.Nuvem.pendentes() === 0 && vida(P, 'Dain') === 15 && P.tok('Dain').x === 256, 6000);
    ok(doisValem, 'o aparelho que assumiu aplica os dois, na ordem: nem o pedido antigo se perde, nem o novo' + (doisValem ? '' : ': ' + JSON.stringify({ tx: quemTransmite(A, B), vidaA: vida(A, 'Dain'), vidaB: vida(B, 'Dain'), vidaP: vida(P, 'Dain'), xA: A.tok('Dain').x, pend: P.Nuvem.pendentes(), pedido: (DB.doc('cena:pedido:u-ana').lote || []).map(x => x.n), ackPub: DB.doc('cena:pub:v').ack, ackCena: DB.doc('cena:' + cena + ':v').ack, diario: DB.gravacoes.slice(-14) })));
    await espera(300);
    eq([vida(A, 'Dain'), vida(P, 'Dain'), (DB.doc('cena:pub:v').ack || {})['u-ana']], [15, 15, 2], 'cada um uma vez só');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ quem transmitia tinha aplicado um pedido que ainda não tinha subido, e chega a cena do outro aparelho ============
     O B transmite e tem o pedido 1 aplicado e guardado. O A (com a cópia atrasada, sem o pedido 1) assume e guarda a
     cena dele. Antes de saber disso, o B recebe o pedido 2 e o aplica na cópia dele; e, antes de guardar, recebe a
     cena do A. A cena que chegou não tem o pedido 1: o B não pode refazer só o 2 por cima dela e dar os dois por
     aplicados. (Nas duas ordens: a notícia de que o A transmite chega ao B depois, ou junto com a cena.) */
  cenario = 'quem transmitia tinha aplicado um pedido que ainda não tinha subido, e chega a cena do outro aparelho';
  for (const sabeLogo of [false, true]) {
    const caso = sabeLogo ? ' (a notícia de quem transmite chega junto)' : ' (a notícia de quem transmite chega depois)';
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'], V = 'cena:' + cena + ':v';
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o B transmite)');
    await quieto(DB, 100);
    A.surdo = true;                                          // o A fica sem ler o banco: a cópia dele não vai ter o pedido 1
    dano(P, 'Dain', 5);                                      // pedido 1: o B aplica, guarda e confirma
    ok(await ate(() => vida(B, 'Dain') === 15 && P.Nuvem.pendentes() === 0 && !B.porSubir() && !P.porSubir()), '(o B aplica e confirma o pedido 1)');
    B.surdo = true; P.surdo = true;                          // agora são o B e o jogador que ficam sem ler o banco
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 576 }));      // o mestre mexe no A: ele assume, com a cópia atrasada
    ok(await ate(() => A.Nuvem.transmito() && !A.porSubir() && (DB.doc(V).tokens || []).some(t => t.name === 'Orc' && t.x === 576)), '(o A assume e guarda a cena dele, sem o pedido 1)');
    eq([DB.doc(V).tokens.find(t => t.name === 'Dain').bars[0].v, (DB.doc(V).ack || {})['u-ana'] || 0], [20, 0], '(no banco, a cena do A: Vida 20, nenhum pedido contado)');
    P.Store.tx('mover', () => P.Store.upd('tokens', P.tok('Dain').id, { x: 256 }));      // o jogador faz o pedido 2
    ok(await ate(() => (DB.doc('cena:pedido:u-ana').lote || []).some(b => b.n === 2) && !P.porSubir()), '(o pedido 2 chega ao banco)');
    DB.entregar(B, 'cena:pedido:u-ana');                     // ao B chega primeiro só o pedido: para ele, ainda é ele quem transmite
    ok(await ate(() => B.tok('Dain').x === 256, 2000, 1) && !B.porSubir(), '(o B aplica o pedido 2 na cópia dele, e ainda não guardou)');
    DB.entregar(B, V);                                       // …e, antes de guardar, recebe a cena do A
    if (sabeLogo) DB.entregar(B, 'cenas:indice');
    await quieto(DB, 300);                                   // (o que o B tiver para guardar, guarda)
    const noBanco = DB.doc(V), dainLa = noBanco.tokens.find(t => t.name === 'Dain'), contaLa = (noBanco.ack || {})['u-ana'] || 0;
    ok((contaLa === 0 && dainLa.bars[0].v === 20 && dainLa.x === 64) || (contaLa === 2 && dainLa.bars[0].v === 15 && dainLa.x === 256),
      'a cena guardada no banco nunca diz que tem pedidos que ela não tem' + caso + ': ' + JSON.stringify({ conta: contaLa, vida: dainLa.bars[0].v, x: dainLa.x }));
    DB.ouvir(B); DB.ouvir(A); DB.ouvir(P);
    const certo = () => [A, B, P].every(ap => vida(ap, 'Dain') === 15 && ap.tok('Dain').x === 256 && ap.tok('Orc').x === 576) && P.Nuvem.pendentes() === 0;
    const fim = await ate(certo, 6000);
    ok(fim, 'no fim, os dois pedidos do jogador e o movimento do mestre valem em todos os aparelhos' + caso + (fim ? '' : ': ' + JSON.stringify({ tx: quemTransmite(A, B), A: [vida(A, 'Dain'), A.tok('Dain').x, A.tok('Orc').x], B: [vida(B, 'Dain'), B.tok('Dain').x, B.tok('Orc').x], P: [vida(P, 'Dain'), P.tok('Dain').x, P.tok('Orc').x, P.Nuvem.pendentes()], ackCena: DB.doc(V).ack, ackPub: DB.doc('cena:pub:v').ack, diario: DB.gravacoes.slice(-14) })));
    ok(await assenta(DB), 'as gravações param' + caso);
    eq([/^[AB]$/.test(quemTransmite(A, B)), certo(), (DB.doc(V).ack || {})['u-ana'], (DB.doc('cena:pub:v').ack || {})['u-ana']], [true, true, 2, 2], 'e continua assim: um aparelho só transmite (' + quemTransmite(A, B) + '), cada pedido valeu uma vez' + caso);
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ a projeção chegou ao banco, mas a cena não: quem assume só conta o que a cópia dele tem ============ */
  cenario = 'a projeção chegou ao banco, mas a cena não: quem assume só conta o que a cópia dele tem';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'], V = 'cena:' + cena + ':v';
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o B transmite; o A acompanha)');
    await quieto(DB, 100);
    B.bloqueado.add(V);                                      // a cena do B para de chegar ao banco (a projeção dele continua chegando)
    dano(P, 'Dain', 5);
    ok(await ate(() => vida(B, 'Dain') === 15 && P.Nuvem.pendentes() === 0 && (DB.doc('cena:pub:v').ack || {})['u-ana'] === 1 && !B.porSubir()), '(o B aplica o pedido e a projeção o confirma; a cena dele não chegou ao banco)');
    await espera(100);                                       // (a projeção, com a conta em 1, chega ao A)
    eq([vida(A, 'Dain'), DB.doc(V).tokens.find(t => t.name === 'Dain').bars[0].v], [20, 20], '(no A e no banco, a cena continua sem o pedido)');
    B.fechar();                                              // o aparelho que transmitia some
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 576 }));      // o mestre continua no A, que assume
    ok(await ate(() => A.Nuvem.transmito() && vida(A, 'Dain') === 15 && vida(P, 'Dain') === 15 && P.tok('Orc').x === 576 && P.Nuvem.pendentes() === 0, 6000), 'o A assume contando só o que a cópia dele tem: o pedido que a projeção já confirmava é aplicado na cena dele, e não se perde');
    await espera(300);
    eq([vida(A, 'Dain'), vida(P, 'Dain'), (DB.doc(V).ack || {})['u-ana'], (DB.doc('cena:pub:v').ack || {})['u-ana']], [15, 15, 1, 1], 'uma vez só');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ o que só o mestre pode mudar, refeito por cima da cena que chegou do outro aparelho ============ */
  cenario = 'o que só o mestre pode mudar, refeito por cima da cena que chegou do outro aparelho';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o B transmite)');
    await quieto(DB, 100);
    A.surdo = true;
    dano(P, 'Dain', 5);
    ok(await ate(() => vida(B, 'Dain') === 15 && P.Nuvem.pendentes() === 0 && !B.porSubir()), '(o B aplica um pedido do jogador)');
    // no A, o mestre muda o máximo da Vida do Dain, cria uma barra nele e põe uma aura só dele no Orc…
    const d = A.tok('Dain'), o = A.tok('Orc');
    A.Store.tx('editar', () => {
      A.Store.upd('tokens', d.id, { bars: d.bars.map((b, i) => (i ? b : Object.assign({}, b, { m: 45 }))).concat([A.cleanBar({ n: 'Fôlego', v: 2, m: 6 })]) });
      A.Store.upd('tokens', o.id, { auras: [{ id: 'au_segredo', k: 'circ', r: 3, c: '#ff0000', a: 0.3, ang: 60, dir: 0, pub: false }] });
    });
    DB.ouvir(A);                                             // …e, com isso ainda por salvar, chega a cena do B (com o pedido aplicado)
    ok(await ate(() => A.Nuvem.transmito() && !A.porSubir() && !B.porSubir() && vida(P, 'Dain') === 15 && P.tok('Dain').bars[0].m === 45), 'a cena que chegou e o que o mestre fez valem os dois');
    eq([A.tok('Dain').bars.map(b => [b.n, b.v, b.m]), A.tok('Orc').auras.map(a => [a.id, a.pub]), P.tok('Orc').auras.length, B.tok('Dain').bars.length],
      [[['Vida', 15, 45], ['SP', 10, 10], ['Fôlego', 2, 6]], [['au_segredo', false]], 0, 3],
      'o máximo novo, a barra nova e a aura só do mestre continuam como ele fez (a aura não aparece para o jogador); o pedido do jogador também vale');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ dois aparelhos assumindo quase ao mesmo tempo: sobra um só ============ */
  cenario = 'dois aparelhos assumindo quase ao mesmo tempo: sobra um só';
  {
    const { DB, A, J, cena } = await mesa(['u-ana']);
    const P = J['u-ana'];
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o B transmite)');
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 384 }));
    ok(await ate(() => A.Nuvem.transmito() && !B.Nuvem.transmito() && !A.porSubir() && !B.porSubir()), '(o mestre mexe no A: o A transmite)');
    await quieto(DB, 100);
    // o mestre mexe no B (que assume); a notícia chega ao A justo quando ele tem uma gravação por fazer, e ele mexe de novo logo em seguida
    const n0 = DB.gravacoes.length;
    B.Store.tx('mover', () => B.Store.upd('tokens', B.tok('Lia').id, { x: 448 }));
    await ate(() => DB.gravacoes.slice(n0).includes('B cenas:indice'), 3000);
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 448 }));        // (fica por salvar por um instante)
    await ate(() => { const l = A.espelho.get('cenas:indice'); return !!l && l.dados.tx !== undefined && !A.Nuvem.transmito(); }, 1000);
    A.Store.tx('mover', () => A.Store.upd('tokens', A.tok('Orc').id, { x: 512 }));        // mexe de novo, com a gravação ainda por fazer
    ok(await ate(() => quemTransmite(A, B).length === 1 && !A.porSubir() && !B.porSubir(), 4000), 'no fim, um aparelho só transmite: ' + quemTransmite(A, B));
    const parou = await assenta(DB);
    eq([parou, quemTransmite(A, B).length, DB.doc('cenas:indice').tx === (A.Nuvem.transmito() ? A : B).espelho.get('cenas:indice').dados.tx, A.espelho.get('cenas:indice').dados.tx === B.espelho.get('cenas:indice').dados.tx], [true, 1, true, true], 'o banco e os dois aparelhos concordam sobre quem transmite, e as gravações param');
    ok(await ate(() => P.tok('Orc').x === 512 && P.tok('Lia').x === 448 && A.tok('Lia').x === 448 && B.tok('Orc').x === 512, 4000), 'e os dois movimentos do mestre (um em cada aparelho) chegam a todos');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ outro aparelho abre a mesa com a cena recém-posta no ar: uma parte já está no banco, a outra a caminho ============ */
  cenario = 'outro aparelho abre a mesa com a cena recém-posta no ar: uma parte já está no banco, a outra a caminho';
  {
    const DB = banco();
    const A = await aparelho(DB, { nome: 'A', papel: 'mestre', eu: 'gm', membros: MEMBROS }).abrir();
    const sc = A.Store.scene();
    A.cena = sc.id;
    A.Store.tx('preparar', () => A.Store.add('tokens', A.newToken(sc, 64, 64, { name: 'Dain', owner: 'u-ana', bars: [A.cleanBar({ n: 'Vida', v: 20, m: 30 })] })));
    await ate(() => !A.porSubir() && !!DB.doc('cenas:indice') && !!DB.doc('cena:' + sc.id + ':v'));
    const P = await aparelho(DB, { nome: 'u-ana', papel: 'jogador', eu: 'u-ana', membros: MEMBROS }).abrir();
    const apagou = nome => DB.gravacoes.some(g => g.startsWith(nome + ' cena:pub:') && g.endsWith('(apagado)'));

    // 1) a projeção chega ao banco, o índice ainda não: para quem abre agora, há projeção e nenhuma cena no ar
    A.segura.add('cenas:indice');
    A.Nuvem.mostrar(sc.id);
    ok(await ate(() => casado(DB) && !P.Nuvem.semCena()), '(a projeção chega ao banco e o jogador vê a cena; o índice ainda está a caminho)');
    eq(DB.doc('cenas:indice').noAr || null, null, '(no banco, o índice ainda não diz que há cena no ar)');
    const B = await mestre2(DB, 'B', sc.id);
    await espera(250);                                       // (2,5 s no relógio do programa: menos do que a espera de quem abre a mesa)
    A.segura.delete('cenas:indice');                         // o índice chega
    ok(await ate(() => (DB.doc('cenas:indice') || {}).noAr === sc.id && B.Nuvem.noAr() === sc.id), 'o índice chega: o aparelho que abriu passa a saber que a cena está no ar');
    await espera(600);                                       // (passa a espera)
    eq([apagou('B'), casado(DB), P.Nuvem.semCena(), quemTransmite(A, B)], [false, true, false, 'A'], 'quem abriu a mesa nesse instante não apagou a projeção: o jogador continua vendo a cena, e quem a pôs no ar continua transmitindo');

    // 2) o índice chega ao banco, a cena nova ainda não: para quem abre agora, o índice aponta para uma cena que não está aqui
    const nova = A.newScene('Caverna');
    A.segura.add('cena:' + nova.id + ':m'); A.segura.add('cena:' + nova.id + ':v');
    A.Store.addScene(nova); A.Nuvem.cena(nova.id);
    A.Nuvem.mostrar(nova.id);
    ok(await ate(() => (DB.doc('cenas:indice') || {}).noAr === nova.id && casado(DB) && DB.doc('cena:pub:m').id === nova.id), '(a cena nova vai ao ar: índice e projeção chegam ao banco; os documentos da cena ainda estão a caminho)');
    ok(!DB.doc('cena:' + nova.id + ':m'), '(a cena nova ainda não está no banco)');
    const C = await mestre2(DB, 'C', nova.id);
    await espera(250);
    eq(C.Nuvem.noAr(), null, '(o aparelho que abriu ainda não tem a cena que o índice aponta)');
    A.segura.clear();                                        // a cena chega
    ok(await ate(() => !!DB.doc('cena:' + nova.id + ':m') && C.Nuvem.noAr() === nova.id), 'a cena chega: o aparelho que abriu passa a tê-la, no ar');
    await espera(600);
    C.Nuvem.meta();                                          // (o aparelho que abriu grava o índice por outro motivo: não pode tirar a cena do ar)
    await quieto(DB, 200);
    eq([apagou('C'), casado(DB), DB.doc('cenas:indice').noAr, DB.doc('cena:pub:m').id, quemTransmite(A, B, C)], [false, true, nova.id, nova.id, 'A'], 'e não apagou a projeção nem tirou a cena do ar');

    // 3) sobra de verdade: a cena saiu do ar, mas a projeção ficou no banco (quem a tirava fechou antes de apagar)
    A.bloqueado.add('cena:pub:m'); A.bloqueado.add('cena:pub:v');
    A.Nuvem.esconder();
    ok(await ate(() => DB.doc('cenas:indice').noAr === null && !A.porSubir()), '(a cena sai do ar no índice; a projeção fica no banco)');
    for (const ap of [A, B, C]) ap.fechar();
    ok(!!DB.doc('cena:pub:m') && !P.Nuvem.semCena(), '(o jogador continua vendo a projeção que sobrou)');
    const E = await mestre2(DB, 'E', sc.id);
    await espera(200);
    ok(!!DB.doc('cena:pub:m'), '(quem abre a mesa não limpa na hora)');
    ok(await ate(() => !DB.doc('cena:pub:m') && !DB.doc('cena:pub:v') && P.Nuvem.semCena(), 3000), 'passada a espera, a projeção que sobrou é apagada e o jogador fica sem cena');

    // 4) o índice aponta para uma cena que não existe mais, e há projeção dela: passada a espera, é sobra
    E.fechar();
    const fant = 'cena_fantasma';
    DB.aplicar({ nome: 'x' }, 'cenas:indice', { dono_id: null, vis: 'mestre', dados: Object.assign({}, DB.doc('cenas:indice'), { noAr: fant, tx: 'apvelho000' }) });
    DB.aplicar({ nome: 'x' }, 'cena:pub:m', { dono_id: null, vis: 'mesa', dados: { id: fant, ver: 'v1', name: 'Fantasma' } });
    DB.aplicar({ nome: 'x' }, 'cena:pub:v', { dono_id: null, vis: 'mesa', dados: { id: fant, mv: 'v1', tokens: [] } });
    const F = await mestre2(DB, 'F', sc.id);
    await espera(200);
    ok(!!DB.doc('cena:pub:m') && !F.Nuvem.transmito(), '(quem abre a mesa não limpa na hora, nem transmite uma cena que não tem)');
    ok(await ate(() => !DB.doc('cena:pub:m') && !DB.doc('cena:pub:v') && F.Nuvem.noAr() === null, 3000), 'passada a espera, a projeção de uma cena que não existe mais é apagada');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  /* ============ jogadores pedindo sem parar: quem acompanha não toma a transmissão de quem está respondendo ============ */
  cenario = 'jogadores pedindo sem parar: quem acompanha não toma a transmissão de quem está respondendo';
  {
    const { DB, A, J, cena } = await mesa(['u-ana', 'u-beto']);
    const PA = J['u-ana'], PB = J['u-beto'];
    const B = await mestre2(DB, 'B', cena);
    await soTransmite(DB, B, A, '(o B transmite; o A acompanha)');
    await quieto(DB, 100);
    const n0 = DB.gravacoes.length;
    // 30 segundos (no relógio do programa) de pedidos, um por segundo de cada jogador
    for (let i = 1; i <= 30; i++) {
      PA.Store.tx('mover', () => PA.Store.upd('tokens', PA.tok('Dain').id, { x: 64 + 8 * i }));
      PB.Store.tx('mover', () => PB.Store.upd('tokens', PB.tok('Lia').id, { y: 64 + 8 * i }));
      await espera(1000 / ESCALA);
    }
    ok(await ate(() => PA.Nuvem.pendentes() === 0 && PB.Nuvem.pendentes() === 0 && B.tok('Dain').x === 304 && B.tok('Lia').y === 304 && A.tok('Dain').x === 304), 'todos os pedidos valem');
    eq([quemTransmite(A, B), DB.gravacoes.slice(n0).filter(g => g.startsWith('A ')).length], ['B', 0], 'quem acompanha não assumiu (quem transmite estava respondendo) e não gravou nada');
    for (const ap of DB.aparelhos) ap.fechar();
  }

  console.log(fails ? `${n - fails} verificações passaram, ${fails} falharam` : `${n} verificações passaram`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
