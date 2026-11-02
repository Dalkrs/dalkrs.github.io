// Lote 8, parte 5: o traçado dos geradores (a página das Cenas sozinha, no navegador).
//   · (SO=ouro) com as escolhas de sempre, a Cidade, o Vilarejo, a Tribo e o Encontro saem exatamente como antes (as
//     impressões guardadas em gerador8-ouro.json, tiradas antes da mudança): os modelos e os bairros continuam iguais;
//   · (SO=cidade) as escolhas novas na Cidade: os portões na rosa dos ventos (e a rua principal de cada um), a muralha
//     redonda e irregular (e com o mar, cortada na beira), o rio de onde vem e para onde vai (a largura, as curvas, o
//     afluente e o lago; ele não passa pela praça), a praça perto do rio e perto de um portão, quantas pontes (as ruas sem
//     ponte param na beira; com mar, a do cais também conta), o relevo natural (colinas, matas e pedras fora da cidade);
//     a cena montada (os vãos dos portões) e o bairro recortado;
//   · (SO=vila) as escolhas novas no Vilarejo: os portões na rosa (uma rua de cada um até a praça), a paliçada em
//     octógono, redonda e irregular (os portões onde as ruas cruzam o contorno; aberta na água), o rio da rosa (o rio vem
//     antes e a praça fica no seco), o afluente e o lago, a largura e as curvas do rio de sempre, a praça perto do rio e
//     perto de um portão, quantas pontes, o relevo natural, as travas (as ruas e o rio novos travam pela semente), a cena;
//   · (SO=tribo) as escolhas novas na Tribo: os portões na rosa (uma trilha de cada um; o chefe de frente para o
//     primeiro; nas palafitas, nenhum para o lago), a paliçada em octógono e irregular, o riacho da rosa (vem antes; a
//     aldeia fica no lugar seco maior, do lado da praça), o afluente e o lago, a praça na beira do rio, as pontes das
//     trilhas, o relevo natural e a cena;
//   · (SO=encontro) as escolhas novas no Encontro: o rio da situação pela rosa (a travessia dela vai junto), o rio novo
//     quando a situação não tem, a largura e as curvas, as pontes onde o caminho cruza a água nova, os caminhos que chegam
//     de cada direção da rosa, o relevo natural; nenhuma das 60 situações (lote 13: com as da Savana, da Costa e da Tundra) quebra com tudo ligado;
//   · (SO=janela) a seção Traçado da janela: a rosa, a muralha, o rio, a praça, as pontes, o relevo, o resumo, voltar ao
//     automático, o modelo que guarda o traçado, e a cena criada (e a seção no Vilarejo).
// FOTOS=<pasta> guarda capturas.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
const OURO = JSON.parse(fs.readFileSync(path.join(__dirname, 'gerador8-ouro.json'), 'utf8'));

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);
  // um plano da cidade (sem as funções), com umas contas sobre ele
  const cidade = o => ev(o => {
    const p = __tc.Cidade.gerar(o), T = __tc.Tracado;
    const agua = p.rio ? { rios: [p.rio].concat(p.afluente ? [p.afluente] : []), lago: p.lago || null } : null;
    const cruzaSemPonte = agua ? p.ruas.some(ru => T.cruzamentos(ru.pts, agua).some(q => q.lago || !p.pontes.some(b => Math.hypot(b.x - q.x, b.y - q.y) < 3.5))) : false;
    const L = pts => T.comprimento(pts), reto = pts => Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]);
    const fora = r => !p.ring || r.pts.filter(([x, y]) => T.dentro(p.ring, x, y)).length / r.pts.length < 0.2;
    return {
      W: p.W, H: p.H, ring: p.ring ? p.ring.length : 0, muroForma: p.muroForma || null, torres: p.torres ? p.torres.length : null, aberto: p.aberto, portoes: p.portoes.map(g => ({ x: g.x, y: g.y, lado: g.lado, dir: g.dir || null })),
      principais: p.ruas.filter(r => r.k === 'principal').map(r => [r.pts[0], r.pts[r.pts.length - 1]]),
      rio: p.rio ? { ini: p.rio.pts[0], fim: p.rio.pts[p.rio.pts.length - 1], hw: p.rio.hw, sinuoso: L(p.rio.pts) / reto(p.rio.pts) } : null,
      afluente: p.afluente ? { fim: p.afluente.pts[p.afluente.pts.length - 1], dRio: T.distLinha(p.rio.pts, ...p.afluente.pts[p.afluente.pts.length - 1]) } : null,
      lago: p.lago ? { n: p.lago.length, fimDoRio: T.dentro(p.lago, ...p.rio.pts[p.rio.pts.length - 1]) || T.distLinha(p.lago.concat([p.lago[0]]), ...p.rio.pts[p.rio.pts.length - 1]) < 1.5 } : null,
      praca: p.praca, dPracaRio: p.rio ? T.distLinha(p.rio.pts, p.praca.x, p.praca.y) : null, dPracaPortao: p.portoes.length ? Math.min(...p.portoes.map(g => Math.hypot(g.x - p.praca.x, g.y - p.praca.y))) : null,
      pontes: p.pontes.length, cruzaSemPonte, ponteNoLago: !!p.lago && p.pontes.some(b => T.dentro(p.lago, b.x, b.y)),
      relevo: (p.relevo || []).filter(r => r.t === 'morro' || r.t === 'mata').map(r => ({ t: r.t, fora: fora(r) })), pedras: p.pedras ? p.pedras.length : 0,
      pedrasDentro: (p.pedras || []).filter(q => (p.ring ? T.dentro(p.ring, q.x, q.y) : Math.hypot(q.x - p.praca.x, q.y - p.praca.y) < Math.min(p.W, p.H) * 0.36)).length,
      mar: p.mar ? { lado: p.mar.lado, b: p.mar.b, aberto: p.mar.aberto } : null, resumo: __tc.Cidade.LUGAR.resumo(p),
      ringNoMar: p.ring && p.mar ? p.ring.some(([x, y]) => (p.mar.lado === 's' ? y > p.mar.b + 0.01 : p.mar.lado === 'n' ? y < p.mar.b - 0.01 : p.mar.lado === 'l' ? x > p.mar.b + 0.01 : x < p.mar.b - 0.01)) : false,
      dPracaAgua: agua ? T.agua(agua).dist(p.praca.x, p.praca.y) : null, pontesCais: p.pontes.filter(b => b.larg === 4.2).length,
      ruaNoMar: p.mar ? p.ruas.filter(r => r.k === 'principal').some(r => { const [x, y] = r.pts[0], m = p.mar; return m.lado === 's' ? y > m.b : m.lado === 'n' ? y < m.b : m.lado === 'l' ? x > m.b : x < m.b; }) : false,
    };
  }, o);
  const bordaDe = (pt, W, H) => Math.min(pt[0], pt[1], W - pt[0], H - pt[1]);
  // um plano do vilarejo (sem as funções), com umas contas sobre ele
  const vila = o => ev(o => {
    const p = __tc.Vila.gerar(o), T = __tc.Tracado;
    const agua = p.rio ? { rios: [p.rio].concat(p.afluente ? [p.afluente] : []), lago: p.lago || null } : null, ag = agua ? T.agua(agua) : null;
    const pontes = p.pontes || (p.ponte ? [p.ponte] : []);
    const cruzaSemPonte = agua ? p.ruas.some(ru => T.cruzamentos(ru.pts, agua).some(q => q.lago || !pontes.some(b => Math.hypot(b.x - q.x, b.y - q.y) < 3.5))) : false;
    const m = p.muro, anel = m && m.anel;
    const portas = m && m.pecas ? m.pecas.filter(pc => pc.k === 'door') : [];
    // os muros não passam pela água; as casas ficam dentro do contorno; cada porta da paliçada tem uma rua passando
    const muroNaAgua = m && m.pecas && ag ? m.pecas.some(pc => pc.k === 'wall' && pc.pts.some(([x, y], i) => i && ag.dist((x + pc.pts[i - 1][0]) / 2, (y + pc.pts[i - 1][1]) / 2) < 0)) : false;
    const casasDentro = !anel || p.casas.every(k => [[k.x, k.y], [k.x + k.w, k.y], [k.x, k.y + k.h], [k.x + k.w, k.y + k.h]].every(([x, y]) => T.dentro(anel, x, y)));
    const portaComRua = portas.every(pc => { const mid = pc.pts[Math.floor(pc.pts.length / 2)]; return p.ruas.some(ru => T.distLinha(ru.pts, mid[0], mid[1]) < ru.hw + 1.5); });
    const casaNaAgua = ag ? p.casas.some(k => { for (let j = k.y; j < k.y + k.h; j++) for (let i = k.x; i < k.x + k.w; i++) if (ag.dist(i + 0.5, j + 0.5) < 0) return true; return false; }) : false;
    const casaNaRua = p.casas.some(k => { for (let j = k.y; j < k.y + k.h; j++) for (let i = k.x; i < k.x + k.w; i++) if (p.ruas.some(ru => T.distLinha(ru.pts, i + 0.5, j + 0.5) < ru.hw) || Math.hypot(i + 0.5 - p.praca.x, j + 0.5 - p.praca.y) < p.praca.r) return true; return false; });
    return {
      W: p.W, H: p.H, casas: p.casas.length, pedidas: p.pedidas, ruas: p.ruas.map(r => ({ dir: r.dir || null, ini: r.pts[0], fim: r.pts[r.pts.length - 1] })),
      praca: p.praca, dPracaAgua: ag ? ag.dist(p.praca.x, p.praca.y) : null, ruaP: p.ruaP, rioP: p.rioP, travaRuas: p.travaRuas, travaRio: p.travaRio,
      rio: p.rio ? { ini: p.rio.pts[0], fim: p.rio.pts[p.rio.pts.length - 1], hw: p.rio.hw, reto: Math.abs(p.rio.pts[0][0] - p.rio.pts[p.rio.pts.length - 1][0]) } : null,
      afluente: p.afluente ? T.distLinha(p.rio.pts, ...p.afluente.pts[p.afluente.pts.length - 1]) : null, lago: p.lago ? p.lago.length : 0,
      pontes: pontes.length, pontesNovas: !!p.pontes, cruzaSemPonte, ponteNoLago: !!p.lago && pontes.some(b => T.dentro(p.lago, b.x, b.y)), muro: m ? { forma: m.forma || null, anel: anel ? anel.length : 0, portas: m.pecas ? portas.length : m.portoes.length, muroNaAgua, casasDentro, portaComRua, lados: !!m.lados } : null,
      casaNaAgua, casaNaRua, relevo: (p.relevo || []).map(r => r.t), pedras: p.pedras ? p.pedras.length : 0, resumo: __tc.Vila.LUGAR.resumo(p),
    };
  }, o);

  // ================= nada mudou com as escolhas de sempre =================
  if (parte('ouro')) {
    const res = await ev(casos => {
      const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
      const G = { cidade: __tc.Cidade, vila: __tc.Vila, tribo: __tc.Tribo, encontro: __tc.Encontro }, out = {};
      for (const k of Object.keys(casos)) out[k] = casos[k].map(o => { try { return fnv(JSON.stringify(G[k].gerar(o))); } catch (e) { return 'ERRO ' + e.message; } });
      return out;
    }, OURO.casos);
    for (const k of ['cidade', 'vila', 'tribo', 'encontro']) {
      const dif = res[k].map((h, i) => (h === OURO.impressoes[k][i] ? null : i)).filter(i => i != null);
      ok(dif.length === 0, `${k}: os ${res[k].length} lugares com as escolhas de sempre saem iguais aos de antes` + (dif.length ? ' — diferentes: ' + j(dif.slice(0, 5).map(i => OURO.casos[k][i])) : ''));
    }
  }

  // ================= a Cidade =================
  if (parte('cidade')) {
    const base = { tamanho: 'media', rio: true, muralha: true, seed: 7 };
    // os portões na rosa dos ventos
    let c = await cidade(Object.assign({}, base, { portoes: ['n', 'l'] }));
    ok(c.portoes.length === 2 && j(c.portoes.map(g => g.dir)) === j(['n', 'l']), 'os portões escolhidos (norte e leste): só esses dois — ' + j(c.portoes));
    const gn = c.portoes.find(g => g.dir === 'n'), gl = c.portoes.find(g => g.dir === 'l');
    ok(gn && gn.y < c.H * 0.2 && Math.abs(gn.x - c.W / 2) < 6 && gl && gl.x > c.W * 0.8 && Math.abs(gl.y - c.H / 2) < 6, 'cada um na muralha, na direção dele (o do norte em cima, o do leste à direita)');
    ok(c.principais.length === 2 && c.principais.every(([ini]) => bordaDe(ini, c.W, c.H) < 1.5), 'uma rua principal de cada portão, vindo da borda do mapa');
    c = await cidade(Object.assign({}, base, { portoes: ['ne', 'se', 'so', 'no'] }));
    ok(c.portoes.length === 4 && c.portoes.every(g => g.dir.length === 2), 'os portões nas diagonais (nordeste, sudeste, sudoeste, noroeste): ' + j(c.portoes.map(g => g.dir)));
    // a muralha
    c = await cidade(Object.assign({}, base, { muroForma: 'redonda' }));
    ok(c.ring === 28 && c.muroForma === 'redonda' && c.torres >= 8 && c.torres < 28, 'a muralha redonda: 28 lados, com as torres a cada uns dez quadrados (' + c.torres + ')');
    ok(c.portoes.length >= 3 && /muralha redonda com \d portões/.test(c.resumo), 'com os portões de sempre, cada um no ponto da muralha redonda naquele lado — ' + c.resumo);
    c = await cidade(Object.assign({}, base, { muroForma: 'irregular' }));
    ok(c.ring === 32 && c.muroForma === 'irregular' && c.torres === 16, 'a muralha irregular: 16 pontas (com as torres) e os trechos entre elas');
    c = await cidade(Object.assign({}, base, { muroForma: 'redonda', mar: true, seed: 5 }));
    ok(c.mar && c.aberto >= 0 && c.mar.aberto === c.aberto && !c.ringNoMar, 'com mar, a muralha redonda é cortada na beira (nenhum ponto dela no mar), e o lado da água fica aberto (sem muro)');
    c = await cidade(Object.assign({}, base, { mar: true, seed: 5, portoes: ['n', 's', 'o', 'l'] }));
    ok(c.portoes.every(g => g.dir !== c.mar.lado), 'com mar, não há portão para o lado da água: ' + j(c.portoes.map(g => g.dir)) + ' (mar: ' + c.mar.lado + ')');
    c = await cidade(Object.assign({}, base, { muralha: false, mar: true, seed: 5, portoes: ['n', 's', 'o', 'l'] }));
    ok(!c.ruaNoMar, 'sem muralha, também não há rua principal vindo do mar (mar: ' + c.mar.lado + ')');
    // o rio
    c = await cidade(Object.assign({}, base, { rioDe: 'o', rioPara: 'l' }));
    ok(c.rio && c.rio.ini[0] < 1 && c.rio.fim[0] > c.W - 1, 'o rio do oeste para o leste: começa na borda da esquerda e acaba na da direita — ' + j([c.rio.ini, c.rio.fim]));
    c = await cidade(Object.assign({}, base, { rioDe: 'n', rioPara: 'so' }));
    ok(c.rio && c.rio.ini[1] < 1 && (c.rio.fim[1] > c.H - 1 || c.rio.fim[0] < 1) && c.rio.fim[0] < c.W / 2, 'do norte para o sudoeste — ' + j([c.rio.ini, c.rio.fim]));
    let a = await cidade(Object.assign({}, base, { rioDe: 'o', rioPara: 'l', rioLarg: 'riacho', rioCurvas: 0 })), b = await cidade(Object.assign({}, base, { rioDe: 'o', rioPara: 'l', rioLarg: 'largo', rioCurvas: 10 }));
    ok(a.rio.hw === 0.9 && b.rio.hw === 2.6, 'a largura: riacho (0,9 de cada lado do meio) e rio largo (2,6)');
    ok(a.rio.sinuoso < 1.04 && b.rio.sinuoso > 1.12, 'as curvas: 0 quase reto, 10 bem sinuoso — ' + [a.rio.sinuoso.toFixed(3), b.rio.sinuoso.toFixed(3)].join(' / '));
    a = await cidade(Object.assign({}, base, { rioCurvas: 0 }));
    ok(a.rio && Math.abs(a.rio.ini[0] - a.rio.fim[0]) < 0.01, 'as curvas no rio de sempre (de cima a baixo): 0 deixa reto');
    a = await cidade(Object.assign({}, base, { rioLarg: 'largo' }));
    ok(a.rio && a.rio.hw === 2.6 && a.rio.ini[1] < 0 && a.rio.fim[1] > a.H, 'a largura no rio de sempre (de cima a baixo): rio largo (2,6)');
    // o rio da rosa não passa pela praça: se nenhuma tentativa desvia dela, a praça anda para o seco (e as ruas vão até lá)
    let secas = [];
    for (const sd of [1, 2, 3, 4, 5, 6]) { const q = await cidade(Object.assign({}, base, { seed: sd, rioDe: 'o', rioPara: 'l' })); secas.push(+(q.dPracaAgua - q.praca.r).toFixed(1)); }
    ok(secas.every(d => d >= 2.9), 'o rio do oeste para o leste não passa pela praça: ela fica a três quadrados ou mais da água, em seis sementes — ' + j(secas));
    secas = [];
    for (const sd of [1, 2, 3, 4]) { const q = await cidade(Object.assign({}, base, { seed: sd, rioDe: 'o', rioPara: 'l', praca: 'portao' })); secas.push([+(q.dPracaAgua - q.praca.r).toFixed(1), +(q.dPracaPortao - q.praca.r).toFixed(1)]); }
    ok(secas.every(([da, dp]) => da >= 2.9 && dp < 13.5), 'com o rio da rosa, a praça perto de um portão também fica no seco (e perto dele) — ' + j(secas));
    c = await cidade(Object.assign({}, base, { afluente: true }));
    ok(c.afluente && c.afluente.dRio < 1, 'só o afluente (sem escolher de onde vem o rio): o rio da rosa, sorteado, com o afluente');
    c = await cidade(Object.assign({}, base, { lago: true }));
    ok(c.lago && c.lago.n > 20, 'só o lago: o rio da rosa, sorteado, com um lago no caminho');
    c = await cidade(Object.assign({}, base, { rioDe: 'o', rioPara: 'l', afluente: true }));
    ok(c.afluente && c.afluente.dRio < 1, 'o afluente: outro rio que acaba no rio principal (dois rios que se juntam)');
    c = await cidade(Object.assign({}, base, { rioDe: 'n', rioPara: 'lago' }));
    ok(c.lago && c.lago.fimDoRio, 'para onde vai: o lago — o rio acaba no lago, dentro do mapa');
    c = await cidade(Object.assign({}, base, { rioDe: 'o', rioPara: 'l', lago: true }));
    ok(c.lago && c.lago.n > 20 && /lago/.test(c.resumo), 'com lago: um lago no caminho do rio — ' + c.resumo);
    let semPonteNoLago = true;
    for (const sd of [1, 2, 3, 4, 5, 6]) { const q = await cidade(Object.assign({}, base, { seed: sd, rioDe: 'o', rioPara: 'l', lago: true, portoes: ['n', 's', 'ne', 'so', 'se', 'no'] })); if (q.ponteNoLago || q.cruzaSemPonte) semPonteNoLago = false; }
    ok(semPonteNoLago, 'nenhuma ponte dentro do lago (o rio passa por ele, mas ali a rua para na beira)');
    c = await cidade(Object.assign({}, base, { mar: true, seed: 5, rioDe: 'n' }));
    ok(c.rio && c.mar && (c.mar.lado === 's' ? c.rio.fim[1] > c.mar.b - 2 : c.mar.lado === 'n' ? c.rio.fim[1] < c.mar.b + 2 : c.mar.lado === 'l' ? c.rio.fim[0] > c.mar.b - 2 : c.rio.fim[0] < c.mar.b + 2), 'com mar, o rio da rosa deságua no mar (o fim dele fica na beira)');
    // a praça
    c = await cidade(Object.assign({}, base, { praca: 'rio' }));
    ok(c.dPracaRio < c.praca.r + c.rio.hw + 2.5, 'a praça perto do rio: na beira dele (' + c.dPracaRio.toFixed(1) + ' do meio do rio)');
    c = await cidade(Object.assign({}, base, { praca: 'portao' }));
    ok(c.dPracaPortao < c.praca.r + 9.5, 'a praça perto de um portão (' + c.dPracaPortao.toFixed(1) + ' dele)');
    c = await cidade(Object.assign({}, base, { rio: false, praca: 'rio' }));
    ok(Math.abs(c.praca.x - c.W / 2) < 2.1 && Math.abs(c.praca.y - c.H / 2) < 1.6, 'sem rio, "perto do rio" fica no centro');
    // as pontes
    c = await cidade(Object.assign({}, base, { pontes: 0 }));
    ok(c.pontes === 0 && !c.cruzaSemPonte, 'nenhuma ponte: as ruas param na beira (nenhuma rua passa pela água) — ' + c.resumo);
    c = await cidade(Object.assign({}, base, { pontes: 2 }));
    ok(c.pontes <= 2 && c.pontes >= 1 && !c.cruzaSemPonte, 'duas pontes: no máximo duas, e as outras ruas param na beira — ' + c.resumo);
    c = await cidade(Object.assign({}, base, { rioDe: 'o', rioPara: 'l', afluente: true }));
    ok(c.pontes >= 1 && !c.cruzaSemPonte, 'automático com o afluente: uma ponte em cada rua que cruza a água (o rio e o afluente)');
    c = await cidade(Object.assign({}, base, { rioDe: 'n', rioPara: 'lago' }));
    ok(!c.cruzaSemPonte, 'o lago não tem ponte: a rua que passaria por ele para na beira');
    a = await cidade(Object.assign({}, base, { mar: true, seed: 1 })); b = await cidade(Object.assign({}, base, { mar: true, seed: 1, pontes: 0 }));
    ok(a.pontesCais === 1 && b.pontes === 0 && !b.cruzaSemPonte, 'com mar, "nenhuma ponte" vale também para a do cais (no automático, ela existe): ' + j([a.pontesCais, b.pontes]));
    // o relevo natural
    c = await cidade(Object.assign({}, base, { relevoNat: true }));
    ok(c.relevo.some(r => r.t === 'morro') && c.relevo.some(r => r.t === 'mata') && c.relevo.every(r => r.fora) && c.pedras > 0, 'o relevo natural: colinas e matas (fora da muralha) e pedras — ' + j({ n: c.relevo.length, pedras: c.pedras }));
    c = await cidade(Object.assign({}, base, { muralha: false, relevoNat: true }));
    ok(c.relevo.length > 0, 'sem muralha, o relevo natural fica longe da praça (' + c.relevo.length + ' áreas)');
    const dentro = [];
    for (const sd of [3, 5, 7, 9]) for (const mur of [true, false]) { const q = await cidade(Object.assign({}, base, { seed: sd, muralha: mur, relevoNat: true })); dentro.push(q.pedrasDentro); }
    ok(dentro.every(n => n === 0), 'nenhuma pedra do relevo natural dentro da muralha (ou, sem ela, perto da praça): ' + j(dentro));
    // a cena montada: os vãos dos portões na muralha redonda; o bairro recortado leva o afluente e o lago
    const cena = await ev(o => {
      const u = __tc, p = u.Cidade.gerar(o), sc = u.newScene('Cidade redonda');
      u.Cidade.montar(sc, p, sc.cell, { relevo: true });
      const portas = sc.walls.filter(w => w.k === 'door' && w.open), muros = sc.walls.filter(w => w.k === 'wall');
      const longe = portas.filter(d => p.portoes.some(g => Math.hypot((d.x1 + d.x2) / 2 / sc.cell - g.x, (d.y1 + d.y2) / 2 / sc.cell - g.y) < 0.6)).length;
      return { portoes: p.portoes.length, portasNosPortoes: longe, muros: muros.length, terrenos: sc.shapes.filter(s => s.ter).map(s => s.ter.t) };
    }, Object.assign({}, base, { muroForma: 'redonda', portoes: ['n', 'se', 'so'], relevoNat: true }));
    ok(cena.portasNosPortoes === cena.portoes && cena.portoes === 3, 'na cena, cada portão da muralha redonda é um vão com a porta aberta: ' + j(cena));
    ok(cena.terrenos.includes('morro') && cena.terrenos.includes('mata'), 'e o relevo natural vira terreno da cena (morro e mata)');
    const rec = await ev(o => { const u = __tc, p = u.Cidade.gerar(o), r = u.Cidade.recorte(p, 'rio'); return r ? { afluente: !!r.afluente, lago: !!r.lago, x0: r.recorte.x0 } : null; }, Object.assign({}, base, { rioDe: 'o', rioPara: 'l', afluente: true, lago: true }));
    ok(rec && rec.afluente && rec.lago, 'o bairro da beira-rio, recortado, leva o afluente e o lago: ' + j(rec));
  }

  // ================= o Vilarejo =================
  if (parte('vila')) {
    const base = { tamanho: 'vila', rio: true, muralha: true, seed: 7 };
    // os portões na rosa: uma rua de cada um até a praça; na paliçada, um vão onde cada rua passa
    let v = await vila(Object.assign({}, base, { portoes: ['n', 'l', 'so'] }));
    ok(j(v.ruas.map(r => r.dir).filter(Boolean).sort()) === j(['l', 'n', 'so']) && v.ruas.every(r => bordaDe(r.ini, v.W, v.H) < 1.5 && Math.hypot(r.fim[0] - v.praca.x, r.fim[1] - v.praca.y) < 0.6), 'os portões na rosa (norte, leste, sudoeste): uma rua de cada um, da borda do mapa até a praça — ' + j(v.ruas.map(r => r.dir)));
    ok(v.muro && v.muro.portas === 3 && v.muro.portaComRua && !v.muro.lados, 'a paliçada pelo contorno: três vãos, cada um com a rua passando — ' + j(v.muro));
    ok(/paliçada com 3 portões/.test(v.resumo), 'o resumo conta os portões: ' + v.resumo);
    ok(!v.casaNaRua && !v.casaNaAgua && v.muro.casasDentro, 'as casas ficam fora das ruas e da água, dentro da paliçada');
    v = await vila(Object.assign({}, base, { tamanho: 'aldeia', portoes: ['l'] }));
    ok(v.ruas.length === 1 && v.ruas[0].dir === 'l' && v.muro.portas === 1 && /1 portão\b/.test(v.resumo), 'um portão só (a leste): uma rua só, e "1 portão" — ' + v.resumo);
    // a paliçada: o octógono, a redonda e a irregular (os portões de sempre onde as ruas de sempre cruzam o contorno)
    for (const [f, n] of [['oct', 8], ['redonda', 28], ['irregular', 32]]) {
      v = await vila(Object.assign({}, base, { muroForma: f }));
      ok(v.muro && v.muro.forma === f && v.muro.anel === n && v.muro.portas >= 4 && v.muro.portaComRua && !v.muro.muroNaAgua && v.muro.casasDentro, 'a paliçada ' + f + ': o contorno de ' + n + ' pontos, um vão em cada rua (' + v.muro.portas + '), aberta no rio, as casas dentro — ' + v.resumo);
    }
    v = await vila(Object.assign({}, base, { muralha: false, muroForma: 'redonda' }));
    ok(!v.muro, 'sem paliçada, a forma não faz nada');
    // o rio da rosa: vem antes; a praça e as ruas se arrumam em volta (a praça no seco)
    v = await vila(Object.assign({}, base, { rioDe: 'o', rioPara: 'l' }));
    ok(v.rio && v.rio.ini[0] < 1 && v.rio.fim[0] > v.W - 1, 'o rio do oeste para o leste — ' + j([v.rio.ini, v.rio.fim]));
    ok(v.dPracaAgua >= v.praca.r + 1.4 && !v.cruzaSemPonte && v.pontes >= 1 && v.pontesNovas, 'a praça no seco (' + v.dPracaAgua.toFixed(1) + ' da água), uma ponte em cada rua que cruza o rio (' + v.pontes + ')');
    ok(v.muro && !v.muro.muroNaAgua && v.muro.portaComRua && !v.casaNaAgua, 'a paliçada abre onde o rio passa; nenhuma casa na água');
    ok(v.rioP && v.rioP.v === 8 && Number.isInteger(v.rioP.s) && Number.isInteger(v.rioP.k) && v.ruaP && v.ruaP.v === 8, 'o rio da rosa e as ruas novas guardam a semente (para travar): ' + j({ rioP: v.rioP, ruaP: v.ruaP }));
    v = await vila(Object.assign({}, base, { rioDe: 'n', rioPara: 'lago', muralha: false }));
    ok(v.lago > 10 && !v.cruzaSemPonte && /lago/.test(v.resumo), 'para onde vai: o lago (e a rua que passaria por ele para na beira) — ' + v.resumo);
    v = await vila(Object.assign({}, base, { rioDe: 'o', rioPara: 'l', afluente: true }));
    ok(v.afluente != null && v.afluente < 1 && /afluente/.test(v.resumo), 'o afluente acaba no rio — ' + v.resumo);
    let semPonteNoLagoV = true;
    for (const sd of [7, 8, 9, 10]) { const q = await vila({ tamanho: 'aldeia', rio: true, muralha: true, seed: sd, portoes: ['n', 'se', 'so'], muroForma: 'redonda', rioDe: 'o', rioPara: 'l', lago: true, praca: 'rio' }); if (q.ponteNoLago || q.cruzaSemPonte) semPonteNoLagoV = false; }
    ok(semPonteNoLagoV, 'nenhuma ponte dentro do lago (onde o rio passa por ele)');
    // o rio de sempre, com a largura e as curvas
    let a = await vila(Object.assign({}, base, { rioLarg: 'riacho', rioCurvas: 0 })), b = await vila(Object.assign({}, base, { rioLarg: 'largo' }));
    ok(a.rio.hw === 0.9 && a.rio.reto < 0.01 && b.rio.hw === 2.6, 'o rio de sempre: riacho e reto (curvas 0), ou rio largo');
    ok(a.muro && a.muro.forma === 'ret' && !b.muro.muroNaAgua, 'mais largo ou mais sinuoso, a paliçada vai pelo contorno (aberta onde a água encosta)');
    // a praça
    v = await vila(Object.assign({}, base, { praca: 'rio' }));
    ok(v.dPracaAgua < v.praca.r + 2.6 && v.dPracaAgua >= v.praca.r + 0.8, 'a praça perto do rio: na beira (' + v.dPracaAgua.toFixed(1) + ' da água)');
    v = await vila(Object.assign({}, base, { praca: 'portao', rio: false }));
    const dp = Math.min(...v.ruas.map(r => Math.hypot(r.ini[0] - v.praca.x, r.ini[1] - v.praca.y)));
    ok(v.ruas.length === 4 && dp < v.praca.r + 9, 'a praça perto de um portão (as ruas dos lados de sempre vêm até ela): ' + dp.toFixed(1));
    v = await vila(Object.assign({}, base, { rio: false, praca: 'rio' }));
    ok(!v.ruaP.v, 'sem rio, "perto do rio" não muda nada (as ruas de sempre)');
    // as pontes
    v = await vila(Object.assign({}, base, { pontes: 0 }));
    ok(v.pontes === 0 && !v.cruzaSemPonte && /sem pontes/.test(v.resumo), 'nenhuma ponte: a rua para na beira, dos dois lados — ' + v.resumo);
    v = await vila(Object.assign({}, base, { portoes: ['n', 's', 'o', 'l', 'ne', 'so'], rioDe: 'n', rioPara: 's', pontes: 1 }));
    ok(v.pontes <= 1 && !v.cruzaSemPonte, 'uma ponte só: as outras ruas param na beira — ' + v.resumo);
    // o relevo natural
    let achou = null;
    for (const sd of [17, 20, 18]) { v = await vila({ tamanho: 'vila', rio: true, muralha: false, seed: sd, relevoNat: true }); if (v.relevo.includes('morro') && v.relevo.includes('mata') && v.pedras > 0) { achou = sd; break; } }
    ok(achou != null, 'o relevo natural: colinas (morro), matas e pedras, em manchas — ' + j({ relevo: v.relevo, pedras: v.pedras }));
    // as travas: as ruas novas e o rio da rosa ficam iguais quando sorteia de novo
    const tr = await ev(o => {
      const V = __tc.Vila, p = V.gerar(o);
      let t = V.alternar(p, 'ruas', null); t = V.alternar(p, 'rio', t);
      const q = V.gerar(Object.assign({}, o, { seed: o.seed + 1000, trava: JSON.parse(JSON.stringify(t)) }));
      const lt = V.limparTrava({ ruas: { v: 8, s: -3 }, rio: { v: 8, s: 5, k: 99 }, casas: [] }, q.W, q.H, __tc.Estilos.tipos('comum'));
      return { mesmas: JSON.stringify(q.ruas) === JSON.stringify(p.ruas) && JSON.stringify(q.rio) === JSON.stringify(p.rio), travas: [q.travaRuas, q.travaRio], t, ruim: [lt.ruas, lt.rio] };
    }, Object.assign({}, base, { portoes: ['n', 'l', 's'], rioDe: 'o', rioPara: 'l' }));
    ok(tr.mesmas && j(tr.travas) === j([true, true]) && tr.t.ruas.v === 8 && tr.t.rio.v === 8, 'travar as ruas e o rio (novos): com outra semente, ficam iguais — ' + j(tr.t));
    ok(j(tr.ruim) === j([null, null]), 'uma trava nova estragada (de um modelo) não vale');
    const tr2 = await ev(o => { const V = __tc.Vila, p = V.gerar(o), t = V.alternar(p, 'ruas', null), q = V.gerar(Object.assign({}, o, { portoes: ['n', 's'], seed: 99, trava: t })); return { antes: !!p.ruaP.v, depois: q.travaRuas }; }, base);
    ok(tr2.antes === false && tr2.depois === false, 'a trava das ruas de sempre não vale nas ruas novas (escolher os portões traça de novo)');
    // a cena: as paredes da paliçada pelo contorno e os portões abertos
    const cena = await ev(async o => {
      const u = __tc, p = u.Vila.gerar(o), sc = await u.Vila.criar(p, 'Vila redonda', {});
      const portas = sc.walls.filter(w => w.k === 'door' && w.open), muros = sc.walls.filter(w => w.k === 'wall');
      const naPal = portas.filter(d => p.muro.pecas.some(pc => pc.k === 'door' && pc.pts.some(([x, y]) => Math.hypot(d.x1 / sc.cell - x, d.y1 / sc.cell - y) < 0.01))).length;
      const id = sc.id; u.Store.S.scenes[id] && delete u.Store.S.scenes[id];
      return { naPal, nPortas: p.muro.pecas.filter(pc => pc.k === 'door').length, muros: muros.length, ter: sc.shapes.filter(s => s.ter).map(s => s.ter.t) };
    }, Object.assign({}, base, { muroForma: 'redonda', portoes: ['n', 'se', 'so'], rioDe: 'o', rioPara: 'l', lago: true, relevoNat: true }));
    ok(cena.naPal >= cena.nPortas && cena.nPortas === 3 && cena.muros > 20, 'na cena, a paliçada redonda tem as paredes pelo contorno e os três portões abertos: ' + j(cena));
    ok(cena.ter.includes('agua'), 'e a água (o rio e o lago) vira terreno da cena');
    await foto('l8-vila');
  }

  // ================= a Tribo =================
  if (parte('tribo')) {
    const tribo = o => ev(o => {
      const p = __tc.Tribo.gerar(o), T = __tc.Tracado, [cx, cy] = p.centro, W = p.W, H = p.H;
      const rios = p.aguas.filter(a => a.k === 'rio'), lagos = p.aguas.filter(a => a.k === 'lago' && a.tipo === 'agua');
      const agua = rios.length || lagos.length ? T.agua({ rios: rios.map(a => ({ pts: a.pts, hw: a.hw })), lago: lagos[0] ? lagos[0].pts : null }) : null;
      const linhas = rios.map(a => a.pts).concat(lagos.map(l => l.pts.concat([l.pts[0]])));
      const alem = (x, y) => linhas.some(pts => { for (let i = 1; i < pts.length; i++) if (T.cruza([cx, cy], [x, y], pts[i - 1], pts[i])) return true; return false; });
      const portas = p.paredes.filter(w => w.k === 'door');
      const trilhas = p.caminhos.filter(c => c.hw > 0.5);
      const bordaDe = pt => Math.min(pt[0], pt[1], W - pt[0], H - pt[1]);
      const saidas = trilhas.map(c => [c.pts[0], c.pts[c.pts.length - 1]].reduce((a, b) => (bordaDe(a) < bordaDe(b) ? a : b))).filter(pt => bordaDe(pt) < 2).map(pt => T.maisPerto(Math.atan2(pt[1] - cy, pt[0] - cx)));
      const casas = p.predios;
      return {
        W, H, portas: portas.length, saidas: [...new Set(saidas)], muroForma: p.muroForma || null, palicada: (p.palicada || []).length, portoesRosa: p.portoesRosa || null,
        riacho: p.riacho ? { ini: p.riacho.pts[0], fim: p.riacho.pts[p.riacho.pts.length - 1] } : null, rios: rios.length, lagos: lagos.length,
        dPraca: agua ? agua.dist(cx, cy) : null, casas: casas.length, casaAlem: casas.some(k => alem(k.x + k.w / 2, k.y + k.h / 2)), casaNaAgua: agua ? casas.some(k => agua.dist(k.x + k.w / 2, k.y + k.h / 2) < 0) : false,
        chefe: (() => { const k = casas.find(q => q.chefe); return k ? Math.atan2(k.y + k.h / 2 - cy, k.x + k.w / 2 - cx) : null; })(),
        pontes: p.pintados.filter(o => o.k === 'ponte').length, trilhaNaAgua: agua ? trilhas.some(c => c.pts.some(([x, y]) => agua.dist(x, y) < -0.3) && !p.pintados.some(o => o.k === 'ponte' && c.pts.some(([x, y]) => Math.hypot(x - o.x, y - o.y) < o.comp / 2 + 0.5))) : false,
        relevo: p.relevo.map(r => r.t), pedrasNat: p.rochas.filter(r => !r.grande && !r.cores).length, resumo: __tc.Tribo.LUGAR.resumo(p),
        palNaAgua: agua ? (p.palicada || []).some(tr => tr.some(([x, y]) => agua.dist(x, y) < 0)) : false,
      };
    }, o);
    const base = { tamanho: 'media', moradias: 'tenda', terreno: 'floresta', seed: 7 };
    let t2 = await tribo(Object.assign({}, base, { portoes: ['n', 'se', 'so'] }));
    ok(t2.portas === 3 && j(t2.portoesRosa) === j(['n', 'se', 'so']) && /paliçada com 3 portões/.test(t2.resumo), 'os portões na rosa (norte, sudeste, sudoeste): três portas na paliçada — ' + t2.resumo);
    ok(['n', 'se', 'so'].every(d => t2.saidas.includes(d)), 'uma trilha de cada portão até a borda do mapa: ' + j(t2.saidas));
    ok(t2.chefe != null && Math.abs(__difAng(t2.chefe, Math.PI / 2)) < 0.9, 'a moradia do chefe fica do outro lado da praça, de frente para o primeiro portão (o do norte)');
    t2 = await tribo(Object.assign({}, base, { moradias: 'palafita', portoes: ['n', 's', 'l'] }));
    ok(j(t2.portoesRosa) === j(['n', 'l']) && t2.portas === 2, 'nas palafitas (o lago do lado de lá do portão principal), nenhum portão para o lago: ' + j(t2.portoesRosa));
    for (const f of ['oct', 'irregular']) {
      t2 = await tribo(Object.assign({}, base, { muroForma: f }));
      ok(t2.muroForma === f && t2.palicada >= 1 && t2.portas === 1 && t2.casas >= 5, 'a paliçada ' + f + ' (com o portão, a aldeia dentro): ' + t2.resumo);
    }
    t2 = await tribo(Object.assign({}, base, { muroForma: 'oct', palicada: false }));
    ok(t2.palicada === 0 && t2.portas === 0, 'sem paliçada, a forma não faz nada');
    // o riacho da rosa
    t2 = await tribo(Object.assign({}, base, { rioDe: 'n', rioPara: 's' }));
    ok(t2.riacho && t2.riacho.ini[1] < 1 && t2.riacho.fim[1] > t2.H - 1, 'o riacho do norte para o sul: ' + j(t2.riacho));
    ok(t2.dPraca >= 4 + 2.5 && !t2.casaAlem && !t2.casaNaAgua && !t2.palNaAgua, 'a praça no seco, nenhuma moradia do outro lado da água nem dentro dela, e a paliçada abre na água');
    const lugar = [], longe = [];
    for (const sd of [1, 2, 3, 4, 5, 6]) { const q = await tribo(Object.assign({}, base, { seed: sd, rioDe: 'n', rioPara: 's' })); lugar.push(q.casas); longe.push(+(q.dPraca - 4).toFixed(1)); }
    ok(lugar.every(n => n >= 6), 'com o rio da rosa, a aldeia fica no lugar seco maior: as moradias cabem (seis ou mais, de nove) — ' + j(lugar));
    ok(longe.reduce((a, b) => a + b, 0) / longe.length >= 4.5, 'e a praça não fica colada na água (em média, a mais de quatro quadrados e meio dela) — ' + j(longe));
    t2 = await tribo(Object.assign({}, base, { tamanho: 'grande', rioDe: 'o', rioPara: 'l', afluente: true, lago: true }));
    ok(t2.rios === 2 && t2.lagos === 1 && !t2.casaAlem, 'com o afluente e o lago: dois rios e um lago, e a aldeia do lado da praça');
    t2 = await tribo(Object.assign({}, base, { praca: 'rio' }));
    ok(t2.dPraca != null && t2.dPraca < 4 + 3 && t2.dPraca >= 4 + 0.8, 'a praça na beira do riacho (' + (t2.dPraca || 0).toFixed(1) + ' da água)');
    t2 = await tribo(Object.assign({}, base, { vida: false, rioDe: 'n' }));
    ok(t2.rios === 0, 'sem "O dia a dia", não há riacho (o traçado do rio não faz nada)');
    // as pontes das trilhas
    t2 = await tribo(Object.assign({}, base, { portoes: ['n', 's', 'l', 'o'], rioDe: 'o', rioPara: 'l' }));
    ok(t2.pontes >= 1 && !t2.trilhaNaAgua, 'onde uma trilha cruza o riacho, a ponte de tábuas (' + t2.pontes + ')');
    t2 = await tribo(Object.assign({}, base, { portoes: ['n', 's', 'l', 'o'], rioDe: 'o', rioPara: 'l', pontes: 0 }));
    ok(t2.pontes === 0 && !t2.trilhaNaAgua, 'nenhuma ponte: a trilha para na beira');
    // o relevo natural
    t2 = await tribo(Object.assign({}, base, { terreno: 'campo', moradias: 'iurte', seed: 14, relevoNat: true }));
    ok(t2.relevo.includes('morro') && t2.relevo.includes('mata') && t2.pedrasNat > 0, 'o relevo natural: colinas, matas e pedras em manchas, fora da aldeia — ' + j({ pedras: t2.pedrasNat }));
    // a cena: as portas da paliçada (abrem e fecham)
    const cena8 = await ev(async o => { const u = __tc, p = u.Tribo.gerar(o), sc = await u.Tribo.LUGAR.criar(p, 'Tribo dos portões', {}); const n = sc.walls.filter(w => w.k === 'door').length; delete u.Store.S.scenes[sc.id]; return n; }, Object.assign({}, base, { portoes: ['n', 'l', 's'], muroForma: 'oct' }));
    ok(cena8 >= 3, 'na cena, uma porta em cada portão: ' + cena8);
  }

  // ================= o Encontro =================
  if (parte('encontro')) {
    const enc = o => ev(o => {
      const p = __tc.Encontro.gerar(o), T = __tc.Tracado, W = p.W, H = p.H;
      const rios = p.aguas.filter(a => a.k === 'rio'), lagos = p.aguas.filter(a => a.k === 'lago');
      const ag = rios.length || lagos.length ? T.agua({ rios: rios.map(a => ({ pts: a.pts, hw: a.hw })), lago: lagos[0] ? lagos[0].pts : null }) : null;
      const travessias = p.pintados.filter(o => o.k === 'ponte' || o.k === 'pedras' || o.k === 'passarela');
      const perto = (x, y) => travessias.some(o => (o.k === 'ponte' && Math.hypot(o.x - x, o.y - y) < o.comp / 2 + 0.8) || ((o.k === 'pedras' || o.k === 'passarela') && o.pts.some(q => Math.hypot(q[0] - x, q[1] - y) < 1.6)));
      const bordaDe = pt => Math.min(pt[0], pt[1], W - pt[0], H - pt[1]);
      const pontas = p.caminhos.map(c => [c.pts[0], c.pts[c.pts.length - 1]].reduce((a, b) => (bordaDe(a) < bordaDe(b) ? a : b))).filter(pt => bordaDe(pt) < 2).map(pt => T.maisPerto(Math.atan2(pt[1] - H / 2, pt[0] - W / 2)));
      return {
        W, H, sit: p.sit, rios: rios.map(a => ({ ini: a.pts[0], fim: a.pts[a.pts.length - 1], hw: a.hw, tipo: a.tipo, sin: T.comprimento(a.pts) / Math.hypot(a.pts[a.pts.length - 1][0] - a.pts[0][0], a.pts[a.pts.length - 1][1] - a.pts[0][1]) })), lagos: lagos.length,
        pontes: p.pintados.filter(o => o.k === 'ponte').length, pontesNovas: p.pontesNovas, caminhosRosa: p.caminhosRosa || null, pontas: [...new Set(pontas)],
        caminhoNaAgua: ag ? p.caminhos.some(c => c.pts.some(([x, y]) => ag.dist(x, y) < -0.4 && !perto(x, y))) : false,
        relevo: p.relevo.map(r => r.t), pedrasNat: p.pedrasNat || 0, temChao: p.chao.length,
        lagoPerto: lagos.length && p.caminhos.length ? Math.min(...p.caminhos.map(c => Math.min(...c.pts.map(([x, y]) => (T.dentro(lagos[0].pts, x, y) ? -1 : T.distLinha(lagos[0].pts.concat([lagos[0].pts[0]]), x, y)))))) : null,
      };
    }, o);
    const b0 = { tamanho: 'medio', seed: 7 };
    let e = await enc(Object.assign({}, b0, { terreno: 'estrada', situacao: 'ponte', caminho: 'estrada', rioDe: 'n', rioPara: 's' }));
    ok(e.rios.length === 1 && e.rios[0].ini[1] < 1 && e.rios[0].fim[1] > e.H - 1, 'Ponte sobre o rio: o rio da situação vem do norte e vai para o sul — ' + j(e.rios));
    ok(e.pontes >= 1 && !e.caminhoNaAgua, 'e a ponte da situação fica onde a estrada cruza o rio novo');
    e = await enc(Object.assign({}, b0, { terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', rioDe: 'o', rioPara: 'l' }));
    ok(e.rios.length === 1 && e.rios[0].ini[0] < 1 && e.rios[0].fim[0] > e.W - 1 && e.temChao > 0, 'Clareira (sem rio): um rio novo, do oeste para o leste, e a clareira continua');
    e = await enc(Object.assign({}, b0, { terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', rioDe: 'n', rioPara: 's' }));
    ok(e.pontesNovas >= 1 && !e.caminhoNaAgua, 'a trilha que cruza o rio novo ganha uma ponte (' + e.pontesNovas + ')');
    e = await enc(Object.assign({}, b0, { terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', rioDe: 'n', rioPara: 's', pontes: 0 }));
    ok(e.pontesNovas === 0 && e.pontes === 0 && !e.caminhoNaAgua, 'nenhuma ponte: a trilha para na beira');
    e = await enc(Object.assign({}, b0, { terreno: 'floresta', situacao: 'riacho', caminho: 'trilha', rioLarg: 'largo', rioCurvas: 9 }));
    ok(e.rios.length === 1 && e.rios[0].hw === 2.6, 'Riacho: o rio da situação mais largo (2,6)');
    let e0 = await enc(Object.assign({}, b0, { terreno: 'floresta', situacao: 'riacho', caminho: 'trilha', rioCurvas: 0 }));
    ok(e0.rios.length === 1 && e0.rios[0].sin < 1.03 && e.rios[0].sin > e0.rios[0].sin + 0.05, 'e as curvas: 0 deixa quase reto, 9 bem sinuoso — ' + [e0.rios[0].sin, e.rios[0].sin].map(x => x.toFixed(3)).join(' / '));
    e = await enc(Object.assign({}, b0, { terreno: 'lava', situacao: 'rio', caminho: 'trilha', rioDe: 'ne', rioPara: 'so', afluente: true }));
    ok(e.rios.length === 2 && e.rios.every(r => r.tipo === 'lava'), 'Rio de lava: pela rosa, com o afluente (de lava também)');
    e = await enc(Object.assign({}, b0, { terreno: 'estrada', situacao: 'ponte', caminho: 'estrada', rioDe: 'o', rioPara: 'l', lago: true }));
    ok(e.lagos === 1, 'com lago: um lago no caminho do rio');
    const perto = [];
    for (const sd of [7, 8, 9, 10]) { const q = await enc(Object.assign({}, b0, { seed: sd, terreno: 'estrada', situacao: 'ponte', caminho: 'estrada', rioDe: 'ne', rioPara: 'so', rioLarg: 'largo', lago: true })); perto.push(q.lagoPerto == null ? null : +q.lagoPerto.toFixed(1)); }
    ok(perto.every(d => d == null || d > 1.5), 'o lago fica longe da estrada da situação (a travessia dela é no rio, e a estrada não acaba no lago): ' + j(perto));
    // os caminhos da rosa
    e = await enc(Object.assign({}, b0, { terreno: 'campo', situacao: 'plantacao', caminho: 'nenhum', portoes: ['ne', 'so'] }));
    ok(j(e.caminhosRosa) === j(['ne', 'so']) && ['ne', 'so'].every(d => e.pontas.includes(d)), 'sem caminho na situação: os caminhos chegam do nordeste e do sudoeste — ' + j(e.pontas));
    e = await enc(Object.assign({}, b0, { terreno: 'estrada', situacao: 'encruzilhada', caminho: 'estrada', portoes: ['n', 's', 'l', 'o', 'ne'] }));
    ok(e.caminhosRosa && !e.caminhosRosa.includes('o') && e.caminhosRosa.includes('ne') && e.pontas.includes('ne'), 'a direção de onde o caminho da situação já chega não ganha outro; as outras ganham: ' + j(e.caminhosRosa));
    // o relevo natural
    e = await enc(Object.assign({}, b0, { terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', relevoNat: true, tamanho: 'grande' }));
    ok(e.relevo.includes('morro') && e.relevo.includes('mata') && e.pedrasNat > 0, 'o relevo natural: colinas, matas e pedras — ' + j({ pedras: e.pedrasNat }));
    e = await enc(Object.assign({}, b0, { terreno: 'deserto', situacao: 'dunas', caminho: 'trilha', relevoNat: true, tamanho: 'grande' }));
    ok(!e.relevo.includes('mata'), 'no deserto, sem matas');
    // as 60 situações, com tudo ligado: nenhuma quebra, e nenhum caminho passa pela água sem travessia
    const todas = await ev(() => {
      const E = __tc.Encontro, out = [];
      for (const t of E.TERRENOS) for (const [sit] of t.sit) {
        try {
          const p = E.gerar({ terreno: t.id, situacao: sit, caminho: 'trilha', tamanho: 'medio', seed: 31, rioDe: 'n', rioPara: 's', afluente: true, lago: true, portoes: ['ne', 'so'], relevoNat: true, pontes: 2 });
          out.push({ s: t.id + '.' + sit, ok: !!p && Array.isArray(p.caminhos) });
        } catch (er) { out.push({ s: t.id + '.' + sit, ok: false, erro: er.message }); }
      }
      return out;
    });
    const ruins = todas.filter(x => !x.ok);
    ok(todas.length === 62 && !ruins.length, 'as 62 situações (lote 58: e as duas novas da floresta) geram com o traçado todo ligado: ' + (ruins.length ? j(ruins.slice(0, 4)) : 'todas'));
    const agua = await enc(Object.assign({}, b0, { terreno: 'agua', situacao: 'navio', rioDe: 'n', portoes: ['n'] }));
    ok(agua.rios.length === 0 && !agua.caminhosRosa, 'no mar (Um navio), o rio e os caminhos da rosa não valem');
  }

  // ================= a janela =================
  if (parte('janela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700);
    await page.locator('#ger-lugar button', { hasText: 'Cidade' }).click(); await w(700);
    ok(await page.locator('#cid-tr').count() === 1 && /automático \(como sempre\)/.test(await page.locator('#cid-tr-res').innerText()), 'a seção Traçado, fechada, diz "automático (como sempre)"');
    if (!(await ev(() => document.getElementById('cid-tr').open))) await page.locator('#cid-tr > summary').click();
    await w(250);
    // os portões
    await page.locator('#cid-portoes-n').click(); await w(500);
    await page.locator('#cid-portoes-l').click(); await w(500);
    let g = await G();
    ok(j(g.op.t.portoes) === j(['n', 'l']) && g.plano.portoes.length === 2 && /portões: norte e leste/.test(await page.locator('#cid-tr-res').innerText()), 'a rosa: norte e leste ligados — o plano com dois portões, e o resumo diz — ' + await page.locator('#cid-tr-res').innerText());
    await page.locator('#cid-portoes-auto').click(); await w(500);
    ok((await G()).op.t.portoes === null, '"Auto" volta aos portões de sempre');
    await page.locator('#cid-portoes-sortear').click(); await w(500);
    g = await G();
    ok(Array.isArray(g.op.t.portoes) && g.op.t.portoes.length >= 2 && g.op.t.portoes.length <= 4, 'Sortear liga de duas a quatro direções: ' + j(g.op.t.portoes));
    // a muralha
    await page.locator('#cid-forma button', { hasText: 'Redonda' }).click(); await w(500);
    g = await G();
    ok(g.op.t.muroForma === 'redonda' && g.plano.muroForma === 'redonda' && g.plano.ring.length === 28, 'a muralha redonda');
    await page.locator('#cid-forma button', { hasText: 'Sem' }).click(); await w(500);
    g = await G();
    ok(g.op.muralha === false && !g.plano.ring && !(await page.locator('#cid-muro').isChecked()), '"Sem" desliga a muralha (e a chave "Com muralha" acompanha)');
    await page.locator('#cid-forma button', { hasText: 'Irregular' }).click(); await w(500);
    g = await G();
    ok(g.op.muralha === true && g.plano.muroForma === 'irregular' && await page.locator('#cid-muro').isChecked(), 'uma forma liga a muralha de novo');
    // o rio
    await page.locator('#cid-rio-de-o').click(); await w(500);
    await page.locator('#cid-rio-para-l').click(); await w(500);
    await page.locator('#cid-rio-larg button', { hasText: 'Riacho' }).click(); await w(500);
    await page.locator('.sw', { has: page.locator('#cid-rio-af') }).click(); await w(500);
    g = await G();
    ok(g.op.t.rioDe === 'o' && g.op.t.rioPara === 'l' && g.op.t.rioLarg === 'riacho' && g.op.t.afluente && g.plano.afluente && g.plano.rio.hw === 0.9, 'o rio do oeste para o leste, riacho, com afluente');
    await page.locator('#cid-rio-curvas').fill('9'); await page.locator('#cid-rio-curvas').dispatchEvent('change'); await w(500);
    ok((await G()).op.t.rioCurvas === 9, 'as curvas (de reto a sinuoso): 9');
    await page.locator('#cid-rio-para-lago').click(); await w(500);
    g = await G();
    ok(g.op.t.rioPara === 'lago' && g.plano.lago && await page.locator('#cid-rio-lago').isDisabled(), 'para onde vai: o lago (e a chave "Com lago" fica de lado)');
    // a praça, as pontes, o relevo
    await page.locator('#cid-praca button', { hasText: 'Perto do rio' }).click(); await w(500);
    await page.locator('#cid-pontes').selectOption('1'); await w(500);
    await page.locator('.sw', { has: page.locator('#cid-relnat') }).click(); await w(600);
    g = await G();
    ok(g.op.t.praca === 'rio' && g.op.t.pontes === 1 && g.plano.pontes.length <= 1 && g.op.t.relevoNat && g.plano.relevo.some(r => r.t === 'morro'), 'a praça perto do rio, uma ponte e o relevo natural');
    const res = await page.locator('#cid-tr-res').innerText();
    ok(/muralha irregular/.test(res) && /rio de oeste, até um lago, riacho, bem sinuoso, com afluente/.test(res) && /praça perto do rio/.test(res) && /1 ponte/.test(res) && /relevo natural/.test(res), 'o resumo diz tudo o que mudou: ' + res);
    await foto('l8-gerador-tracado', await page.locator('.modal').boundingBox());
    // o modelo guarda o traçado
    await page.locator('#ger-guardar').click(); await w(150);
    await page.locator('#ger-modelo-nome').fill('Cidade do lago'); await page.keyboard.press('Enter'); await w(300);
    const mod = await ev(() => __tc.Store.S.prefs.modelos.find(m => m.nome === 'Cidade do lago'));
    ok(mod && mod.o.rioPara === 'lago' && mod.o.muroForma === 'irregular' && mod.o.relevoNat === true && mod.o.pontes === 1 && j(mod.o.portoes) === j(g.op.t.portoes), 'o modelo guarda o traçado (só o que mudou): ' + j(mod && mod.o));
    // voltar ao automático
    await page.locator('#cid-tr-auto').click(); await w(500);
    g = await G();
    ok(j(__tcSo(g.op.t)) === '{}' && /automático \(como sempre\)/.test(await page.locator('#cid-tr-res').innerText()), 'Voltar ao automático: tudo como sempre');
    // abrir o modelo traz o traçado de volta
    await page.locator('#ger-modelo').selectOption({ label: 'Cidade do lago · Cidade' }); await w(700);
    g = await G();
    ok(g.op.t.rioPara === 'lago' && g.op.t.muroForma === 'irregular' && g.plano.muroForma === 'irregular', 'abrir o modelo traz o traçado dele de volta');
    // criar a cena
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 40000 }); await w(500);
    const sc = await ev(() => { const s = __tc.Store.scene(); return { nome: s.name, portas: s.walls.filter(w => w.k === 'door').length, ter: s.shapes.filter(x => x.ter).map(x => x.ter.t) }; });
    ok(sc.portas > 0 && sc.ter.includes('agua') && sc.ter.includes('morro'), 'a cena criada: com os portões abertos, a água (o rio, o afluente e o lago) e as colinas: ' + j({ portas: sc.portas, ter: [...new Set(sc.ter)] }));
    await foto('l8-cidade-cena');
  }

  // ================= a janela, no Vilarejo =================
  if (parte('vilajanela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700);
    await page.locator('#ger-lugar button', { hasText: 'Vilarejo' }).click(); await w(700);
    await page.locator('#vila-tam button', { hasText: 'Vila' }).click(); await w(500);
    await page.locator('#ger-semente').fill('7'); await page.locator('#ger-semente').press('Enter'); await w(600);
    ok(await page.locator('#vila-tr').count() === 1 && /automático \(como sempre\)/.test(await page.locator('#vila-tr-res').innerText()), 'no Vilarejo, a seção Traçado diz "automático (como sempre)"');
    if (!(await ev(() => document.getElementById('vila-tr').open))) await page.locator('#vila-tr > summary').click();
    await w(250);
    await page.locator('#vila-portoes-n').click(); await w(500);
    await page.locator('#vila-portoes-se').click(); await w(500);
    await page.locator('#vila-portoes-so').click(); await w(500);
    let g = await G();
    ok(j(g.op.t.portoes) === j(['n', 'se', 'so']) && j(g.plano.ruas.map(r => r.dir).filter(Boolean).sort()) === j(['n', 'se', 'so']), 'a rosa: norte, sudeste e sudoeste — uma rua de cada um');
    await page.locator('#vila-forma button', { hasText: 'Redonda' }).click(); await w(500);
    g = await G();
    ok(g.op.muralha === true && g.plano.muro && g.plano.muro.forma === 'redonda' && await page.locator('#vila-muro').isChecked(), 'a paliçada redonda (liga a paliçada, e a chave acompanha)');
    await page.locator('#vila-rio-de-o').click(); await w(500);
    await page.locator('#vila-rio-para-l').click(); await w(500);
    await page.locator('.sw', { has: page.locator('#vila-rio-lago') }).click(); await w(500);
    await page.locator('#vila-praca button', { hasText: 'Perto do rio' }).click(); await w(500);
    await page.locator('.sw', { has: page.locator('#vila-relnat') }).click(); await w(600);
    g = await G();
    ok(g.plano.rioP && g.plano.rioP.v === 8 && g.plano.lago && g.op.t.praca === 'rio' && g.op.t.relevoNat, 'o rio do oeste para o leste, com lago, a praça perto do rio e o relevo natural');
    const res = await page.locator('#vila-tr-res').innerText();
    ok(/portões: norte, sudeste e sudoeste/.test(res) && /paliçada redonda/.test(res) && /rio de oeste, para leste, com lago/.test(res) && /praça perto do rio/.test(res), 'o resumo do traçado: ' + res);
    ok(/paliçada redonda com 3 portões/.test(await page.locator('#ger-resumo').innerText()), 'e o resumo do lugar: ' + await page.locator('#ger-resumo').innerText());
    await foto('l8-vila-janela', await page.locator('.modal').boundingBox());
    // travar o rio e gerar outro: o rio fica
    const rio0 = j(g.plano.rio);
    await ev(() => { const v = __tc.Gerador.vivo(); return v; });
    await page.locator('#ger-prev').scrollIntoViewIfNeeded(); await w(200);
    const pr = await ev(() => {
      const cv = document.getElementById('ger-prev'), r = cv.getBoundingClientRect(), p = __tc.Gerador.vivo().estado.plano, c = __tc.Gerador.vivo().cell(), k = Math.min(r.width / cv.width, r.height / cv.height);
      // um ponto do rio longe das casas, das ruas e das pontes (onde a prévia diz "o rio")
      const pt = p.rio.pts.find(([x, y]) => x > 1 && y > 1 && x < p.W - 1 && y < p.H - 1 && __tc.Vila.parteEm(p, x, y) === 'rio') || p.rio.pts[0];
      return { x: r.left + (r.width - cv.width * k) / 2 + pt[0] * c * k, y: r.top + (r.height - cv.height * k) / 2 + pt[1] * c * k, pt };
    });
    await page.mouse.click(pr.x, pr.y); await w(300);
    g = await G();
    ok(g.trava && g.trava.rio && g.trava.rio.v === 8, 'um clique no rio da prévia trava o rio: ' + j(g.trava && g.trava.rio) + ' ' + j(pr));
    await page.locator('#ger-outro').click(); await w(700);
    g = await G();
    ok(j(g.plano.rio) === rio0, '"Gerar outro" com o rio travado: o rio fica igual');
    await page.locator('#vila-tr-auto').click(); await w(500);
    g = await G();
    ok(j(__tcSo(g.op.t)) === '{}' && g.op.muralha === true, 'Voltar ao automático: o traçado como sempre (a paliçada continua ligada)');
    // a Tribo: a mesma seção (sem "perto de um portão"; o riacho vem com o dia a dia)
    await page.locator('#ger-lugar button', { hasText: 'Tribo' }).click(); await w(800);
    ok(await page.locator('#tri-tr').count() === 1 && await page.locator('#tri-praca button').count() === 2 && !(await page.locator('#tri-praca button', { hasText: 'Perto de um portão' }).count()), 'na Tribo, a seção Traçado (a praça: no centro ou perto do rio)');
    await page.locator('#tri-portoes-n').click(); await w(600); await page.locator('#tri-portoes-l').click(); await w(600);
    await page.locator('#tri-forma button', { hasText: 'Octógono' }).click(); await w(600);
    g = await G();
    ok(j(g.op.t.portoes) === j(['n', 'l']) && g.plano.muroForma === 'oct' && g.plano.paredes.filter(x => x.k === 'door').length === 2, 'portões ao norte e a leste, paliçada em octógono: duas portas');
    await page.locator('#tri-forma button', { hasText: 'Sem' }).click(); await w(600);
    ok(!(await page.locator('#tri-pal').isChecked()), '"Sem" desliga a paliçada (e a chave acompanha)');
    await page.locator('.sw', { has: page.locator('#tri-vida') }).click(); await w(600);
    ok(/O riacho vem com/.test(await page.locator('#tri-tr').innerText()), 'sem o dia a dia, a seção diz que o riacho vem com ele');
    await page.locator('.sw', { has: page.locator('#tri-vida') }).click(); await w(600);
    await page.locator('#tri-tr-auto').click(); await w(600);
    ok(await page.locator('#tri-pal').isChecked(), 'Voltar ao automático liga a paliçada de novo (na Tribo, ela vem ligada)');
    // o Encontro: "Caminhos" em vez de portões; o rio
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(800);
    ok(await page.locator('#enc-tr').count() === 1 && /Caminhos/.test(await page.locator('#enc-tr').innerText()) && await page.locator('#enc-forma').count() === 0, 'no Encontro, a seção Traçado tem "Caminhos" (e não tem muralha)');
    await page.locator('#enc-portoes-ne').click(); await w(600);
    await page.locator('#enc-rio-de-n').click(); await w(600);
    await page.locator('#enc-rio-para-s').click(); await w(600);
    g = await G();
    ok(j(g.op.t.portoes) === j(['ne']) && g.plano.aguas.some(a => a.k === 'rio' && a.pts[0][1] < 1), 'um caminho do nordeste e o rio do norte para o sul');
    await page.locator('#enc-tr-auto').click(); await w(600);
    await page.keyboard.press('Escape'); await w(400);
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

// a diferença entre dois ângulos (de −π a π)
function __difAng(a, b) { let d = (a - b) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }
// o que saiu do automático (como o Tracado.soMudadas, aqui fora)
function __tcSo(t) {
  const p = { portoes: null, muroForma: null, rioDe: null, rioPara: null, rioLarg: null, rioCurvas: null, afluente: false, lago: false, praca: 'centro', pontes: null, relevoNat: false }, out = {};
  for (const k of Object.keys(p)) if (JSON.stringify(t[k]) !== JSON.stringify(p[k])) out[k] = t[k];
  return out;
}
