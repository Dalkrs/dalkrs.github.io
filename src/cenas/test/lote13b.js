// Lote 13, parte 13b: o Encontro no chão novo, a Savana, a Costa e a Tundra (a página das Cenas sozinha, no navegador).
//   · (SO=chao) o chão novo do Encontro: os modelos de antes (sem o chão) dão os planos de sempre, iguais aos da versão
//     de antes; o pântano e a água ficam como eram; o novo traz os vizinhos da tabela (sem a costa), as manchas deles
//     (mais com mais Mistura) longe do meio da situação, os patamares onde ela não usa, as árvores dos vizinhos com a
//     paleta deles; o rio da rosa desce pelo relevo (na costa, até o mar) e desvia das construções; sem o relevo natural;
//     a trava (no mesmo chão e na mesma mistura); a seca; o resumo; o tempo;
//   · (SO=novos) os terrenos novos (só no chão novo) e as doze situações, cada uma com o que tem de seu, em três tamanhos;
//     o mar do naufrágio em cima ou embaixo (e não do lado de onde o rio vem); a chegada fora do mar;
//   · (SO=pintura) os desenhos novos (a fonte quente, as pegadas, o cupinzeiro, o baobá, os ossos, o mamute, a falésia,
//     a escada, a poça de maré), a areia entrando no navio encalhado; na cena, a armadilha oculta e a fogueira acesa;
//   · (SO=janela) a aba Encontro: os quinze terrenos, a Mistura (sem a chave do relevo natural; no pântano e na água, sem
//     a Mistura), a costa (o rio deságua no mar), o modelo de antes (fica no chão de sempre, com o botão "Usar o chão
//     novo" e o Desfazer), o modelo novo (guarda o chão e a mistura), o Mapa-múndi (já no chão novo) e a cena criada.
// FOTOS=<pasta> guarda capturas.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;
// (as impressões — FNV-1a do JSON do plano — destes encontros, tiradas na versão de antes da 13b: 2026.10.21-8)
const OURO = { casos: [
  { terreno: 'floresta', situacao: 'riacho', seed: 5, rioDe: 'n', rioPara: 'lago', relevoNat: true, tamanho: 'medio' },
  { terreno: 'campo', situacao: 'moinho', seed: 6, portoes: ['n', 'l'], pontes: 1 },
  { terreno: 'montanha', situacao: 'surpresa', seed: 7, rioDe: 'o', afluente: true },
  { terreno: 'neve', situacao: 'lago', seed: 8, relevoNat: true, tamanho: 'grande' },
  { terreno: 'deserto', situacao: 'oasis', seed: 9, seco: true },
  { terreno: 'estrada', situacao: 'ponte', seed: 10, rioLarg: 'largo', rioCurvas: 9 },
  { terreno: 'lava', situacao: 'rio', seed: 11, rioDe: 's', lago: true },
  { terreno: 'agua', situacao: 'naufragio', seed: 12 },
  { terreno: 'pantano', situacao: 'palafita', seed: 13, rioDe: 'l' },
  { terreno: 'cristais', situacao: 'gruta', seed: 14, estilo: 'anao' },
], impressoes: ['c6111e57', '7b6624a1', '94f565bb', '912d0c17', '1ef9488f', '12326f5b', 'e74054f9', 'd9cadc74', 'a5408ef8', '6b7a0f10'] };

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);

  // ================= o chão novo do Encontro =================
  if (parte('chao')) {
    const r = await ev(OURO => {
      const E = __tc.Encontro, B = __tc.Biomas, M = E.motor, out = {};
      const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
      const area = pts => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
      const noVizinho = (p, x, y) => (p.biomas || []).some(b => b.pts.some(pts => M.dentroPoli(pts, x, y)));
      // os modelos de antes (sem o chão nas escolhas): os mesmos planos da versão de antes
      out.ouro = OURO.casos.map((o, i) => fnv(JSON.stringify(E.gerar(o))) === OURO.impressoes[i]);
      // o pântano e a água cobrem tudo: com o chão novo pedido, o mesmo plano de sempre
      out.cobre = ['pantano', 'agua'].map(ter => JSON.stringify(E.gerar({ terreno: ter, seed: 21, chao: 2 })) === JSON.stringify(E.gerar({ terreno: ter, seed: 21 })));
      // e a gruta dos cristais (a caverna cobre o mapa todo): o mesmo plano, só com a marca do chão novo, sem vizinhos
      out.gruta = [14, 15, 16].map(seed => {
        const a = E.gerar({ terreno: 'cristais', situacao: 'gruta', seed, chao: 2 }), marca = a.chaoNovo === true && a.vizinhos.length === 0;
        delete a.chaoNovo; delete a.mistura; delete a.vizinhos;
        return marca && JSON.stringify(a) === JSON.stringify(E.gerar({ terreno: 'cristais', situacao: 'gruta', seed }));
      });
      // o chão novo: os vizinhos da tabela (nunca a costa: sem o mar ela não faz sentido), as manchas deles, a mistura
      const velhos = ['estrada', 'floresta', 'deserto', 'montanha', 'neve', 'campo', 'selva', 'corrompida', 'lava', 'cristais'], bioDe = { estrada: 'campo' };
      out.novo = { n: 0, chaoNovo: 0, vizOk: 0, manchas: 0, costa: 0 };
      for (const ter of velhos) for (const seed of [1, 2, 3]) {
        const p = E.gerar({ terreno: ter, seed, chao: 2, mistura: 'media' }), BB = B.BIO[bioDe[ter] || ter];
        out.novo.n++;
        if (p.chaoNovo === true && p.mistura === 'media') out.novo.chaoNovo++;
        const bs = p.biomas || [];                                          // (a gruta de cristais cobre tudo: sem manchas)
        if (p.vizinhos.every(v => BB.viz.includes(v)) && j2(bs.map(b => b.id)) === j2(p.vizinhos)) out.novo.vizOk++;
        if (bs.length && bs.every(b => b.pts.length && __tc.Paisagem.PAL[b.pal])) out.novo.manchas++;
        if (p.vizinhos.includes('costa')) out.novo.costa++;
      }
      function j2(x) { return JSON.stringify(x); }
      // quanto da cena é dos vizinhos, pela mistura (oito sementes na floresta)
      const parteViz = mist => { let s = 0, nv = new Set(); for (let k = 1; k <= 8; k++) { const p = E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: k * 13, chao: 2, mistura: mist }); s += p.biomas.reduce((a, b) => a + b.pts.reduce((c, pts) => c + area(pts), 0), 0) / (p.W * p.H); nv.add(p.vizinhos.length); } return { f: +(s / 8).toFixed(3), nv: [...nv].sort() }; };
      out.mistura = { pouca: parteViz('pouca'), media: parteViz('media'), muita: parteViz('muita') };
      // os vizinhos ficam longe do meio da situação: perto dele, menos manchas que longe
      let perto = 0, nPerto = 0, longe = 0, nLonge = 0;
      for (let k = 1; k <= 10; k++) {
        const p = E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: k * 7, chao: 2, mistura: 'muita' }), [fx, fy] = p.foco, R = Math.hypot(p.W, p.H) * 0.18;
        for (let y = 0.5; y < p.H; y += 1) for (let x = 0.5; x < p.W; x += 1) { const d = Math.hypot(x - fx, y - fy), v = noVizinho(p, x, y) ? 1 : 0; if (d < R) { perto += v; nPerto++; } else if (d > R * 1.8) { longe += v; nLonge++; } }
      }
      out.longe = { perto: +(perto / nPerto).toFixed(3), longe: +(longe / nLonge).toFixed(3) };
      // os patamares (os morros, os planaltos, os penhascos) só onde a situação não usa: nem no meio dela, nem no
      // caminho, nem nas construções
      out.patamar = { n: 0, ruins: [] };
      const PROPRIOS = { 'montanha.plato': 1, 'campo.morro': 1, 'savana.rochedo': 1, 'costa.mare': 1 };
      for (const T of E.TERRENOS) for (const s of T.sit) for (const seed of [4, 5]) {
        if (T.id === 'pantano' || T.id === 'agua' || PROPRIOS[T.id + '.' + s[0]]) continue;
        const p = E.gerar({ terreno: T.id, situacao: s[0], seed, chao: 2, mistura: 'muita' });
        const formas = p.pintados.filter(q => q.z === 0 && (q.k === 'morro' || q.k === 'planalto')).map(q => q.pts);
        for (const pts of formas) {
          out.patamar.n++;
          const naRota = p.caminhos.some(c => c.pts.some(([x, y]) => M.dentroPoli(pts, x, y)));
          const naCasa = p.predios.some(k => M.dentroPoli(pts, k.x + k.w / 2, k.y + k.h / 2) || [[k.x, k.y], [k.x + k.w, k.y], [k.x, k.y + k.h], [k.x + k.w, k.y + k.h]].some(([x, y]) => M.dentroPoli(pts, x, y)));
          if (M.dentroPoli(pts, p.foco[0], p.foco[1]) || naRota || naCasa) out.patamar.ruins.push(T.id + '.' + s[0] + '#' + seed);
        }
      }
      // as árvores dos vizinhos trazem a paleta deles (e ficam nas manchas deles)
      let comPal = 0, dentro = 0;
      for (let k = 1; k <= 6; k++) { const p = E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: k * 31, chao: 2, mistura: 'muita' }); for (const a of p.arvores) if (a.pal) { comPal++; if (noVizinho(p, a.x, a.y)) dentro++; } }
      out.arvores = { comPal, dentro };
      // o rio da rosa desce pelo relevo: nasce no lado pedido e vai para outro; na costa, acaba no mar
      out.rio = [];
      for (const [ter, sit, de] of [['floresta', 'clareira', 'o'], ['campo', 'capim', 'n'], ['selva', 'mata', 'ne'], ['deserto', 'dunas', 'l']]) for (const seed of [1, 2]) {
        const p = E.gerar({ terreno: ter, situacao: sit, seed, chao: 2, rioDe: de }), rio = p.aguas.find(a => a.k === 'rio');
        if (!rio) { out.rio.push(null); continue; }
        const a = rio.pts[0], b = rio.pts[rio.pts.length - 1], pb = __tc.Tracado.naBorda(de, p.W, p.H, 0, 0);
        out.rio.push({ ini: +Math.hypot(a[0] - pb[0], a[1] - pb[1]).toFixed(1), longe: +Math.hypot(b[0] - a[0], b[1] - a[1]).toFixed(1), mm: Math.min(p.W, p.H) });
      }
      out.marRio = [];
      for (const sit of ['enseada', 'falesia', 'naufragio', 'mare']) for (const seed of [1, 2, 3]) {
        const p0 = E.gerar({ terreno: 'costa', situacao: sit, seed }), de = { n: 's', s: 'n', o: 'l', l: 'o' }[p0.mar.lado];
        const p = E.gerar({ terreno: 'costa', situacao: sit, seed, rioDe: de }), rio = p.aguas.find(a => a.k === 'rio'), mar = p.aguas.find(a => a.k === 'lago' && a.tipo === 'mar');
        out.marRio.push(!!rio && !!mar && M.dentroPoli(mar.pts, ...rio.pts[rio.pts.length - 1]) && p.pintados.some(q => q.k === 'aguaParada' && q.tipo === 'mar' && q.semBeira));
      }
      // e desvia das construções da situação (o moinho e o celeiro)
      out.desvia = [];
      for (const [ter, sit, de, para] of [['campo', 'moinho', 'o', 'lago'], ['neve', 'cabana', 'n', null], ['campo', 'moinho', 'l', null]]) for (let k = 1; k <= 5; k++) {
        const p = E.gerar({ terreno: ter, situacao: sit, seed: k * 5, chao: 2, rioDe: de, rioPara: para }), rios = p.aguas.filter(a => a.k === 'rio');
        out.desvia.push(rios.length > 0 && rios.every(a => a.pts.every(([x, y]) => !p.predios.some(c => x > c.x + 0.3 && x < c.x + c.w - 0.3 && y > c.y + 0.3 && y < c.y + c.h - 0.3))));
      }
      // o lago do rio (no caminho dele) longe dos caminhos, das construções e das tendas da situação; em duas demãos
      out.lagoLonge = []; out.lagoDemao = [];
      // (e nas da estrada, que cruza o mapa todo: o lago nunca em cima dela)
      for (const [ter, sit] of [['floresta', 'acampamento'], ['floresta', 'clareira'], ['campo', 'plantacao'], ['neve', 'cabana'], ['estrada', 'curva'], ['estrada', 'ponte'], ['estrada', 'encruzilhada']]) for (let k = 1; k <= 4; k++) {
        const p = E.gerar({ terreno: ter, situacao: sit, seed: k * 3, chao: 2, rioDe: ['n', 'o', 'l', 's'][k - 1], lago: true }), lago = p.aguas.find(a => a.k === 'lago' && a.tipo === 'agua');
        if (!lago) { out.lagoLonge.push('sem lago'); continue; }
        const dentro = (x, y) => M.dentroPoli(lago.pts, x, y);
        out.lagoLonge.push(!p.caminhos.some(c => c.pts.some(([x, y]) => dentro(x, y))) && !p.predios.some(c => dentro(c.x + c.w / 2, c.y + c.h / 2)) && !p.pintados.some(q => q.k === 'tenda' && dentro(q.x, q.y)));
        out.lagoDemao.push(p.pintados.some(q => q.k === 'aguaParada' && q.semBeira && q.pts === lago.pts || (q.k === 'aguaParada' && q.semBeira && JSON.stringify(q.pts) === JSON.stringify(lago.pts))));
      }
      // e, direto no motor: o lago no caminho do rio nasce fora do que está perto (no Encontro, a área da situação)
      {
        const W = 40, H = 30, alt = new Float32Array(W * H), perto = q => { const y = Math.floor(q / W); return y >= 15 && y < 24; };
        for (let q = 0; q < W * H; q++) { const x = q % W, y = Math.floor(q / W); alt[q] = 1 - y / H + 0.002 * Math.abs(x - 20); }
        out.lagoFora = [];
        for (const seed of [1, 2, 3, 4]) {
          const A = __tc.Biomas.aguaDe(W, H, alt, seed, 'rio', { de: 'n', para: 's', curvas: 2, hw: 1.2, lago: true }, null, () => false, perto), l = A.lagos[0];
          out.lagoFora.push(A.lagos.length === 1 && !perto(Math.floor(l.centro[1]) * W + Math.floor(l.centro[0])) && [...l.cel].every(q => !perto(q)) && l.cel.size >= 20);
        }
      }
      // cada bioma com o seu: as espécies (a savana tem acácias; os vizinhos, as deles), a densidade (a floresta vizinha
      // do capim alto é cheia), os enfeites e as pedrinhas com a cor do vizinho, a mata onde o bosque fecha
      let outras = 0, dentroN = 0, dentroA = 0, foraN = 0, foraA = 0, enfOutros = 0, pedrasCor = 0, mata = 0;
      for (let k = 1; k <= 8; k++) {
        const ps = E.gerar({ terreno: 'savana', situacao: 'cupinzeiros', seed: k * 11, chao: 2, mistura: 'muita' });
        outras += ps.arvores.filter(a => a.esp !== 'acacia' && a.esp !== 'juncos').length;
        const pd = E.gerar({ terreno: 'campo', situacao: 'capim', seed: k * 11, chao: 2, mistura: 'muita' });
        if (pd.vizinhos.includes('floresta')) {
          const aViz = pd.biomas.reduce((a, b) => a + b.pts.reduce((c, pts) => c + area(pts), 0), 0);
          for (const a of pd.arvores) { if (noVizinho(pd, a.x, a.y)) dentroN++; else foraN++; }
          dentroA += aViz; foraA += pd.W * pd.H - aViz;
        }
        const pl = E.gerar({ terreno: 'lava', situacao: 'basalto', seed: k * 11, chao: 2, mistura: 'muita' });
        enfOutros += pl.objetos.filter(o => o.id !== 'pedra').length;
        pedrasCor += pl.rochas.filter(x => !x.grande && x.cores).length;
        const pf = E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: k * 11, chao: 2, mistura: 'media' });
        if (pf.relevo.some(x => x.t === 'mata' && x.k === 'poly')) mata++;
      }
      out.bioma = { outras, dens: [+(dentroN / Math.max(1, dentroA)).toFixed(3), +(foraN / Math.max(1, foraA)).toFixed(3)], enfOutros, pedrasCor, mata };
      // sem o relevo natural (o chão novo já tem); no chão de antes, ele vale
      out.relNat = [E.gerar({ terreno: 'floresta', seed: 3, chao: 2, relevoNat: true }).pedrasNat === undefined, E.gerar({ terreno: 'floresta', seed: 3, relevoNat: true }).pedrasNat !== undefined];
      // a trava: no mesmo chão e na mesma mistura
      const o = { terreno: 'floresta', situacao: 'riacho', seed: 7, chao: 2, mistura: 'media' }, p1 = E.gerar(o);
      p1.travaTracado = true;
      const tv = E.travaDe(p1), tr = q => JSON.stringify([q.aguas, q.caminhos, q.biomas, q.pintados.filter(x => x.z === 0)]);
      const p2 = E.gerar(Object.assign({}, o, { seed: 99, trava: tv })), p3 = E.gerar(Object.assign({}, o, { seed: 99, trava: tv, mistura: 'muita' })), p4 = E.gerar(Object.assign({}, o, { seed: 99, trava: tv, chao: 1 }));
      out.trava = { tv: tv.chao === 2 && tv.mistura === 'media', mesma: p2.travaTracado && tr(p2) === tr(p1) && JSON.stringify(p2.arvores) !== JSON.stringify(p1.arvores), outraMistura: !p3.travaTracado, outroChao: !p4.travaTracado, velha: !E.gerar(Object.assign({}, o, { trava: { terreno: 'floresta', tamanho: 'medio', caminho: 'trilha', sit: 'riacho', s: 5 } })).travaTracado };
      // a seca: o chão verde dos vizinhos também seca
      const ps = E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: 11, chao: 2, mistura: 'muita', seco: true });
      out.seco = { seco: ps.seco, pals: ps.biomas.map(b => [b.id, b.pal]) };
      out.resumo = E.resumo(E.gerar({ terreno: 'floresta', situacao: 'clareira', seed: 13, chao: 2, mistura: 'muita' }));
      // (o resumo diz os patamares, quando há)
      out.resumoPat = [];
      for (let k = 1; k <= 6; k++) { const p = E.gerar({ terreno: 'montanha', situacao: 'cordas', seed: k, chao: 2, mistura: 'muita' }), pm = p.patamares || {}; if (pm.morros + pm.planaltos + pm.paredoes > 0) out.resumoPat.push(/\d (morros?|planaltos?|penhascos?)/.test(E.resumo(p))); }
      // o tempo (32 × 24)
      const t0 = performance.now();
      for (let k = 0; k < 20; k++) E.gerar({ terreno: ['floresta', 'savana', 'costa', 'tundra'][k % 4], seed: k + 1, chao: 2 });
      out.ms = Math.round((performance.now() - t0) / 20);
      return out;
    }, OURO);
    ok(r.ouro.every(Boolean), 'os modelos de antes (sem o chão nas escolhas) dão os mesmos encontros da versão de antes (com o rio da rosa, o relevo natural, os caminhos, a seca): ' + j(r.ouro));
    ok(r.cobre.every(Boolean), 'o pântano e a água (cobrem o mapa todo) ficam como eram, mesmo pedindo o chão novo');
    ok(r.gruta.every(Boolean), 'a gruta dos cristais (a caverna cobre o mapa todo) fica no chão de antes, mesmo pedindo o novo: ' + j(r.gruta));
    ok(r.novo.chaoNovo === r.novo.n && r.novo.vizOk === r.novo.n && r.novo.manchas >= r.novo.n * 0.8 && r.novo.costa === 0, 'o chão novo nos terrenos de antes: os vizinhos da tabela, com as manchas e a paleta deles; nunca a costa — ' + j(r.novo));
    const m = r.mistura;
    ok(m.pouca.f < m.media.f && m.media.f < m.muita.f && j(m.pouca.nv) === j([1]) && m.muita.nv.includes(2), 'a Mistura: pouca (um vizinho) < média < muita (dois vizinhos) — ' + j(m));
    ok(r.longe.perto < r.longe.longe * 0.6, 'os vizinhos ficam longe do meio da situação: ' + j(r.longe));
    ok(r.patamar.n >= 20 && r.patamar.ruins.length === 0, `os patamares (${r.patamar.n}) nunca no meio da situação, no caminho dela ou nas construções: ` + j(r.patamar.ruins.slice(0, 6)));
    ok(r.arvores.comPal > 20 && r.arvores.dentro >= r.arvores.comPal * 0.85, 'as árvores dos vizinhos com a paleta deles, nas manchas deles: ' + j(r.arvores));
    ok(r.rio.every(x => x && x.ini <= 9 && x.longe > x.mm * 0.5), 'o rio da rosa (no chão novo, pelo relevo) nasce no lado pedido e atravessa o encontro: ' + j(r.rio));
    ok(r.marRio.every(Boolean), 'na costa, o rio da rosa acaba no mar (e o mar, em duas demãos, cobre a foz): ' + j(r.marRio));
    ok(r.desvia.every(Boolean), 'o rio novo (até o lago ou não) desvia das construções (o moinho, o celeiro, a cabana): ' + j(r.desvia));
    ok(r.lagoLonge.every(x => x === true), 'o lago no caminho do rio fica longe dos caminhos, das construções e das tendas da situação: ' + j(r.lagoLonge));
    ok(r.lagoFora.every(x => x === true), 'no motor, o lago no caminho do rio nasce e cresce fora do que está perto (a área da situação): ' + j(r.lagoFora));
    ok(r.lagoDemao.length && r.lagoDemao.every(Boolean), 'o lago do rio em duas demãos (a segunda cobre a ponta do rio): ' + j(r.lagoDemao));
    ok(r.bioma.outras > 10 && r.bioma.dens[0] > r.bioma.dens[1] * 2.5 && r.bioma.enfOutros > 0 && r.bioma.pedrasCor > 0 && r.bioma.mata >= 3, 'cada bioma com o seu: as árvores dos vizinhos na savana, a floresta vizinha cheia no campo (no capim alto, quase sem árvores), os enfeites e as pedrinhas da cor deles na lava, a mata no bosque — ' + j(r.bioma));
    ok(r.resumoPat.length && r.resumoPat.every(Boolean), 'o resumo diz os patamares: ' + j(r.resumoPat));
    ok(j(r.relNat) === j([true, true]), 'no chão novo, sem o relevo natural (ele já tem o dele); no de antes, ele vale');
    ok(Object.values(r.trava).every(Boolean), 'a trava do traçado: guarda o chão e a mistura; o mesmo traçado e o mesmo chão com outra semente; outra mistura ou o outro chão a soltam; a de antes não vale no novo — ' + j(r.trava));
    ok(r.seco.seco === true && r.seco.pals.every(([id, pal]) => !['campo', 'floresta', 'selva', 'pantano'].includes(pal)), 'a seca do Mapa-múndi seca o chão verde dos vizinhos também: ' + j(r.seco));
    ok(/manchas de [a-zà-ú ]+/.test(r.resumo), 'o resumo diz as manchas dos vizinhos (e os patamares): ' + r.resumo);
    ok(r.ms < 80, 'o chão novo é rápido: ' + r.ms + ' ms por encontro');
  }

  // ================= os terrenos novos e as doze situações =================
  if (parte('novos')) {
    const r = await ev(() => {
      const E = __tc.Encontro, M = E.motor, out = {};
      out.ter = E.TERRENOS.map(t => t.id);
      out.sits = Object.fromEntries(['savana', 'costa', 'tundra'].map(id => [id, E.TER[id].sit.map(s => s[1])]));
      out.sempreNovo = ['savana', 'costa', 'tundra'].map(id => E.gerar({ terreno: id, seed: 3 }).chaoNovo === true);
      const conta = (p, k) => p.pintados.filter(q => q.k === k).length;
      const occ = (p, x, y) => p.occ[Math.floor(y) * p.W + Math.floor(x)];
      const mar = p => p.aguas.find(a => a.k === 'lago' && a.tipo === 'mar');
      const CHECA = {
        'savana.bebedouro': p => p.aguas.some(a => a.k === 'lago' && a.tipo === 'agua') && p.zonas.filter(z => z.fx === 'lama').length >= 2 && conta(p, 'pegadas') >= 4 && conta(p, 'ossos') === 1,
        'savana.cupinzeiros': p => conta(p, 'cupinzeiro') >= 5 && p.pintados.filter(q => q.k === 'cupinzeiro').every(q => occ(p, q.x, q.y) === 3) && p.relevo.filter(x => x.t === 'montanha').length >= 5 && p.visao.length > 0,
        'savana.baoba': p => { const b = p.pintados.find(q => q.k === 'baoba' && q.r >= 1.5); return !!b && occ(p, b.x, b.y) === 3 && p.visao.filter(v => Math.hypot((v[0] + v[2]) / 2 - b.x, (v[1] + v[3]) / 2 - b.y) < b.r + 0.5).length >= 6 && p.cobertura.some(c => Math.hypot(c.x - b.x, c.y - b.y) < 0.1); },
        'savana.rochedo': p => p.pintados.some(q => q.k === 'planalto' && q.alt === 3) && conta(p, 'bocaGruta') === 1 && conta(p, 'ossos') === 1 && p.rochas.filter(x => x.grande).length >= 3,
        'costa.enseada': p => {
          const m = mar(p), b = p.mar.baia, l = p.mar.lado, pt = (t, d) => (l === 'n' ? [t, d] : l === 's' ? [t, p.H - d] : l === 'o' ? [d, t] : [p.W - d, t]);
          const fundo = t => { let d = 0; while (d < 30 && M.dentroPoli(m.pts, ...pt(t, d + 0.25))) d += 0.25; return d; };
          return !!m && !!b && fundo(b.t) - (fundo(b.t - b.w * 2.4) + fundo(b.t + b.w * 2.4)) / 2 > b.d * 0.6 && p.massas.length >= 2 && conta(p, 'barco') === 1 && p.zonas.some(z => z.fx === 'correnteza') && p.massas.filter(x => x.pts.some(([x2, y2]) => M.dentroPoli(m.pts, x2, y2))).length >= 2;
        },
        'costa.falesia': p => { const f = p.pintados.find(q => q.k === 'falesia'), d = p.pintados.find(q => q.k === 'escadaPedra'); return !!f && !!d && p.occ.filter(v => v === 7).length > 20 && p.relevo.some(x => x.t === 'fosso' && x.alt === -8) && conta(p, 'bocaGruta') === 1 && occ(p, (d.pts[0][0] + d.pts[1][0]) / 2, (d.pts[0][1] + d.pts[1][1]) / 2) === 1; },
        'costa.naufragio': p => { const m = mar(p), nv = p.navios[0]; return !!m && !!nv && !!(nv.danificado && nv.danificado.chao) && nv.casco.every(([x, y]) => !M.dentroPoli(m.pts, x, y)) && p.pintados.some(q => q.k === 'pegadas' && q.tipo === 'pe') && ['n', 's'].includes(p.mar.lado); },
        'costa.mare': p => p.pintados.some(q => q.k === 'planalto' && q.alt === 1) && conta(p, 'poca') >= 5 && p.aguas.filter(a => a.pal === 'rocha').length === conta(p, 'poca') && p.zonas.some(z => z.fx === 'correnteza'),
        'tundra.fontes': p => p.aguas.filter(a => a.tipo === 'termal').length >= 2 && p.zonas.filter(z => z.fx === 'nevoa').length >= 2,
        'tundra.mamute': p => {
          const q = p.pintados.find(x => x.k === 'mamute'); if (!q) return false;
          const ux = Math.cos(q.ang), uy = Math.sin(q.ang), costelas = __tc.Estilos.retangulo(q.x + ux * q.L * 0.5, q.y + uy * q.L * 0.5, q.L * 0.62, 5, q.ang), presas = __tc.Estilos.retangulo(q.x - ux * 3, q.y - uy * 3, 4.6, 5.8, q.ang);
          const fora = p.caminhos.every(c => c.pts.every(([x, y]) => !M.dentroPoli(costelas, x, y) && !M.dentroPoli(presas, x, y)));
          return occ(p, q.x - ux * 0.3, q.y - uy * 0.3) === 3 && p.cobertura.length >= 2 && p.visao.length >= 8 && fora;
        },
        'tundra.cacadores': p => { const f = p.objetos.find(o => o.id === 'fogueira'), arm = p.objetos.filter(o => o.id === 'armadilha'); return !!f && conta(p, 'tenda') >= 2 && arm.length >= 1 && arm.every(o => o.oculto === true) && p.caminhos.every(c => c.pts.every(([x, y]) => Math.hypot(x - f.x - 0.5, y - f.y - 0.5) > 4)); },
        'tundra.pedras': p => p.rochas.filter(x => x.grande).length >= 8 && p.zonas.some(z => z.fx === 'gelado') && p.aguas.some(a => a.tipo === 'gelo'),
      };
      out.sit = {};
      for (const id of Object.keys(CHECA)) {
        const [ter, sit] = id.split('.'), res = [];
        for (const tamanho of ['pequeno', 'medio', 'grande']) for (const seed of [1, 2]) {
          try { const p = E.gerar({ terreno: ter, situacao: sit, seed, tamanho, caminho: 'trilha' }); res.push(p.sit === sit && CHECA[id](p) ? 1 : 0); } catch (e) { res.push('ERRO ' + e.message); }
        }
        out.sit[id] = res;
      }
      // o rio que chega na beira da falésia cai em cachoeira
      out.cachoeira = [];
      for (const seed of [1, 2, 3, 4]) { const p0 = E.gerar({ terreno: 'costa', situacao: 'falesia', seed }), de = { n: 's', s: 'n', o: 'l', l: 'o' }[p0.mar.lado], p = E.gerar({ terreno: 'costa', situacao: 'falesia', seed, rioDe: de }); if (p.aguas.some(a => a.k === 'rio')) out.cachoeira.push(conta(p, 'cachoeira') >= 1); }
      // o mar do naufrágio: em cima ou embaixo (o navio deitado na praia), e nunca do lado de onde o rio vem
      out.naufLado = [];
      for (const de of ['n', 's', 'o', 'l']) for (const seed of [1, 2, 3]) { const p = E.gerar({ terreno: 'costa', situacao: 'naufragio', seed, rioDe: de }); out.naufLado.push(['n', 's'].includes(p.mar.lado) && p.mar.lado !== de); }
      // a chegada e a emboscada nunca no mar
      let noMar = 0, total = 0;
      for (const sit of ['enseada', 'falesia', 'naufragio', 'mare']) for (let s = 1; s <= 6; s++) { const p = E.gerar({ terreno: 'costa', situacao: sit, seed: s }); for (const k of ['chegada', 'emboscada']) { total++; const m = p.marcas[k]; if (m && occ(p, m[0], m[1]) === 2) noMar++; } }
      out.marcas = { noMar, total };
      out.nomes = ['savana', 'costa', 'tundra'].map(id => E.nomePadrao(E.gerar({ terreno: id, seed: 2 })));
      return out;
    });
    ok(j(r.ter) === j(['estrada', 'floresta', 'deserto', 'montanha', 'pantano', 'neve', 'campo', 'selva', 'corrompida', 'lava', 'cristais', 'savana', 'costa', 'tundra', 'agua']), 'os quinze terrenos, com a Savana, a Costa e a Tundra antes da Água: ' + j(r.ter));
    ok(j(r.sits) === j({ savana: ['Bebedouro', 'Cupinzeiros', 'Baobá gigante', 'Rochedo dos leões'], costa: ['Enseada', 'Falésia', 'Naufrágio na areia', 'Piscinas de maré'], tundra: ['Fontes quentes', 'Ossada de mamute', 'Acampamento de caçadores', 'Campo de pedras'] }), 'as quatro situações de cada um: ' + j(r.sits));
    ok(r.sempreNovo.every(Boolean), 'os terrenos novos nascem sempre no chão novo (mesmo sem pedir)');
    for (const [id, res] of Object.entries(r.sit)) ok(res.every(x => x === 1), `${id}: nos três tamanhos, com o que ela tem de seu — ` + j(res));
    ok(r.cachoeira.length >= 2 && r.cachoeira.every(Boolean), 'na falésia, o rio da rosa cai em cachoeira na beira: ' + j(r.cachoeira));
    ok(r.naufLado.every(Boolean), 'o mar do naufrágio na areia fica em cima ou embaixo (o navio deitado na praia), nunca do lado de onde o rio vem: ' + j(r.naufLado));
    ok(r.marcas.noMar === 0, `a chegada e a emboscada nunca no mar (${r.marcas.total} marcadores)`);
    ok(j(r.nomes) === j(['Encontro na savana', 'Encontro na costa', 'Encontro na tundra']), 'os nomes: ' + j(r.nomes));
  }

  // ================= os desenhos =================
  if (parte('pintura')) {
    const r = await ev(() => {
      const P = __tc.Paisagem, out = {}, c = 40;
      const tela = (w, h) => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d', { willReadFrequently: true }); return cv; };
      const px = (cv, x, y) => Array.from(cv.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data);
      const pintou = cv => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n / (d.length / 4); };
      const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      // a fonte quente: turquesa no meio, o minério (amarelo/ferrugem) na beira
      { const cv = tela(400, 400), g = cv.getContext('2d'), pts = []; for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; pts.push([5 + Math.cos(a) * 3, 5 + Math.sin(a) * 2.5]); } P.lago(g, pts, c, rnd, 'tundra', 'termal'); const m = px(cv, 200, 200), b = px(cv, 200 + 3 * c, 200); out.termal = { meio: m, beira: b }; }
      // cada desenho novo pinta alguma coisa no lugar dele
      const um = (fn, o) => { const cv = tela(480, 480); fn(cv.getContext('2d'), o, c, rnd); return +pintou(cv).toFixed(3); };
      out.pinta = {
        pegadas: um(P.pegadas, { pts: [[1, 6], [11, 6]], tipo: 'casco' }), pata: um(P.pegadas, { pts: [[1, 6], [11, 6]], tipo: 'pata' }), pe: um(P.pegadas, { pts: [[1, 6], [11, 6]], tipo: 'pe' }),
        cupinzeiro: um(P.cupinzeiro, { x: 5, y: 5, r: 1.2, alto: 2 }), baoba: um(P.baoba, { x: 6, y: 6, r: 1.6, copa: 4, oco: 1 }), ossos: um(P.ossos, { x: 6, y: 6, r: 1 }),
        mamute: um(P.mamute, { x: 6, y: 6, ang: 0, L: 5 }), falesia: um(P.falesia, { alto: [[0, 5], [12, 5]], baixo: [[0, 7], [12, 7]] }), escada: um(P.escadaPedra, { pts: [[3, 3], [6, 7]], larg: 1.1 }), poca: um(P.poca, { pts: [[4, 4], [8, 4], [8, 7], [4, 7]] }),
      };
      // a areia entrando no navio encalhado (no afundado, o mar)
      // (a média do vermelho menos o azul, em cinco pontos do convés, junto do lado de onde entra)
      const E = __tc.Encontro, nav = op => { const p = E.gerar(op), n = p.navios[0], cv = E.motor.pintar(p, 20), v = n.danificado.mar === 'n' ? n.y + 0.35 : n.y + n.B - 0.35, d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (const u of [0.12, 0.25, 0.38, 0.62, 0.75]) { const i = (Math.round(v * 20) * cv.width + Math.round((n.x + n.L * u) * 20)) * 4; s += d[i] - d[i + 2]; } return Math.round(s / 5); };
      out.areia = nav({ terreno: 'costa', situacao: 'naufragio', seed: 3 });
      out.marNoNavio = nav({ terreno: 'agua', situacao: 'naufragio', seed: 3 });
      return out;
    });
    const [mr, mg, mb] = r.termal.meio, [br, bg] = r.termal.beira;
    ok(mb > mr + 40 && mg > mr + 30 && br > 150 && bg > 90, 'a fonte quente: turquesa (escura) no meio, a beira de minério clara — ' + j(r.termal));
    ok(Object.values(r.pinta).every(v => v > 0.001), 'os desenhos novos pintam (as pegadas de casco, de pata e de gente, o cupinzeiro, o baobá, os ossos, o mamute, a falésia, a escada, a poça): ' + j(r.pinta));
    ok(r.areia > 20 && r.marNoNavio < -10, 'no navio encalhado entra a areia (no afundado, o mar): vermelho − azul ' + j([r.areia, r.marNoNavio]));
  }

  // ================= a janela =================
  if (parte('janela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    const ctlTxt = async () => (await page.locator('.ger-op').innerText()).replace(/\n+/g, ' | ');
    const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(500); };
    const abrir = async () => { await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700); };
    await abrir();
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(800);
    let g = await G();
    const c0 = await ctlTxt();
    ok(/^Terreno \| Estrada \| Floresta \| Deserto \| Montanha \| Pântano \| Neve \| Campo \| Selva \| Terra corrompida \| Lava \| Cristais \| Savana \| Costa \| Tundra \| Água \| Situação/.test(c0) && /Tamanho \| Pequeno \| Médio \| Grande \| Mistura \| Pouca \| Média \| Muita \| (História do lugar \|.*\| Achados raros.*\| )?Marcar a chegada e a emboscada/.test(c0), 'a aba Encontro: os quinze terrenos e a Mistura depois do tamanho (13c: e a história do lugar e os achados) — ' + c0.slice(0, 320));
    ok(g.op.chao === 2 && g.op.mistura === 'media' && g.plano.chaoNovo === true && await page.locator('#enc-relnat').count() === 0, 'de começo: o chão novo, a mistura média, sem a chave do relevo natural');
    await exato('enc-ter', 'Savana');
    g = await G();
    ok(g.plano.terreno === 'savana' && g.plano.chaoNovo && /Bebedouro \| Cupinzeiros \| Baobá gigante \| Rochedo dos leões \| Surpresa/.test(await ctlTxt()) && await page.locator('#ger-nome').inputValue() === 'Encontro na savana', 'a savana: as situações dela, o chão novo e o nome');
    await exato('enc-mis', 'Muita');
    g = await G();
    ok(g.op.mistura === 'muita' && g.plano.mistura === 'muita', 'a mistura muita: no estado e no plano');
    await exato('enc-ter', 'Pântano');
    ok(!/Mistura/.test(await ctlTxt()), 'no pântano (a água cobre tudo), sem a Mistura');
    await exato('enc-ter', 'Costa');
    if (!(await ev(() => document.getElementById('enc-tr').open))) await page.locator('#enc-tr > summary').click();
    await w(250);
    ok(/Com mar, o rio deságua no mar/.test(await page.locator('#enc-tr').innerText()) && /O rio desce pelo relevo/.test(await page.locator('#enc-tr').innerText()), 'na costa, o rio deságua no mar; no chão novo, ele desce pelo relevo');
    await foto('13b-janela-costa', await page.locator('.modal').boundingBox());
    // um modelo de antes (sem o chão nas escolhas): fica no chão de sempre, com o botão
    await ev(() => { const S = __tc.Store.S; S.prefs.modelos = (S.prefs.modelos || []).concat([{ id: 'md_velho13b', nome: 'Clareira antiga', lugar: 'encontro', o: { terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', tamanho: 'medio', marcas: true, estilo: 'comum', hora: 'dia', clima: '', relevo: true }, seed: 77, trava: null }]); });
    await page.keyboard.press('Escape'); await w(400);
    await abrir();
    await page.locator('#ger-modelo').selectOption({ label: 'Clareira antiga · Encontro' }); await w(900);
    g = await G();
    const velho = await ev(() => JSON.stringify(__tc.Encontro.gerar({ terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', tamanho: 'medio', marcas: true, estilo: 'comum', seed: 77 })));
    ok(g.op.chao === 1 && !g.plano.chaoNovo && j(g.plano) === velho, 'o modelo de antes gera o mesmo lugar de sempre (o chão de antes)');
    ok(/Modelo de antes do chão novo/.test(await ctlTxt()) && await page.locator('#enc-chao').count() === 1 && !/Mistura/.test(await ctlTxt()) && await page.locator('#enc-relnat').count() === 1, 'com o aviso e o botão "Usar o chão novo" (e a chave do relevo natural, que vale nele)');
    await foto('13b-janela-velho', await page.locator('.modal').boundingBox());
    await page.locator('#enc-chao').click(); await w(900);
    g = await G();
    ok(g.op.chao === 2 && g.plano.chaoNovo && /Mistura/.test(await ctlTxt()), '"Usar o chão novo": gera de novo no chão novo, com a Mistura');
    const des = page.locator('.toast', { hasText: 'O chão novo' }).locator('button', { hasText: 'Desfazer' });
    ok(await des.count() === 1, 'o aviso com o Desfazer');
    await des.click(); await w(900);
    g = await G();
    ok(g.op.chao === 1 && !g.plano.chaoNovo && j(g.plano) === velho, 'Desfazer volta ao chão de antes (o mesmo lugar de sempre)');
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    // um modelo novo guarda o chão e a mistura
    await page.locator('#enc-chao').click(); await w(900);
    await exato('enc-mis', 'Pouca');
    await page.locator('#ger-guardar').click(); await w(150);
    await page.locator('#ger-modelo-nome').fill('Clareira nova'); await page.keyboard.press('Enter'); await w(300);
    const mod = await ev(() => __tc.Store.S.prefs.modelos.find(m => m.nome === 'Clareira nova'));
    ok(mod && mod.o.chao === 2 && mod.o.mistura === 'pouca', 'o modelo novo guarda o chão novo e a mistura: ' + j(mod && mod.o));
    await page.locator('#ger-modelo').selectOption({ label: 'Clareira antiga · Encontro' }); await w(800);
    await page.locator('#ger-modelo').selectOption({ label: 'Clareira nova · Encontro' }); await w(800);
    g = await G();
    ok(g.op.chao === 2 && g.op.mistura === 'pouca' && g.plano.chaoNovo, 'e, aberto de novo, volta no chão novo');
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await page.keyboard.press('Escape'); await w(400);
    // o Mapa-múndi (a janela já preenchida): no chão novo
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'tundra', situacao: 'cacadores', caminho: 'trilha' } })); await w(900);
    g = await G();
    ok(g.plano.terreno === 'tundra' && g.plano.sit === 'cacadores' && g.plano.chaoNovo, 'vindo do Mapa-múndi (a tundra, os caçadores): no chão novo');
    // a cena
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(500);
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return { nome: sc.name, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]), armadilhas: sc.tokens.filter(x => x.prop === 'armadilha').map(x => !!x.hidden), fogueira: sc.tokens.filter(x => x.prop === 'fogueira').map(x => !!(x.light && x.light.on)), tendas: sc.walls.length }; });
    ok(s.nome === 'Encontro na tundra' && s.fundo, 'a cena: o nome e o fundo pintado');
    ok(s.armadilhas.length >= 1 && s.armadilhas.every(Boolean), 'as armadilhas dos caçadores nascem ocultas (só o mestre vê): ' + j(s.armadilhas));
    ok(j(s.fogueira) === j([true]), 'a fogueira acesa, com a luz dela');
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(500);
    await foto('13b-cena-tundra');
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
