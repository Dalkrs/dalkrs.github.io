// Lote 13, parte 13a: o motor de biomas e a Região livre (a página das Cenas sozinha, no navegador).
//   · (SO=motor) o motor (Biomas.campo), conta pura: a tabela dos treze biomas e dos vizinhos; a mesma semente dá o
//     mesmo chão; a Mistura (pouca, média, muita: um ou dois vizinhos da tabela, cada vez mais cena); a costa (o mar
//     num lado, a praia); o rio que desce pelo relevo (do alto para o baixo, atravessando a região), pela rosa (de onde
//     vem, para onde vai, o lago no fim, o lago no caminho, o afluente no meio dele, as curvas); o lago sozinho; os
//     patamares longe da água e da borda (o pântano quase plano, a montanha cheia deles); o tempo da conta;
//   · (SO=regiao) o plano da Região livre: os tamanhos e os pontos de interesse (1, 2, 3), os marcadores onde se pisa,
//     com os nomes; os treze biomas com as quatro águas; a mesma semente; a trava do traçado; a água (a Surpresa sorteia
//     as quatro); o caminho (sem, trilha, estrada; a rosa); as pontes (e sem elas); a costa; a lava e o gelo; a seca;
//     as árvores com a paleta e a neve do bioma delas; o nome e o resumo; sem os marcadores;
//   · (SO=pintura) o chão misto (a passagem gradual), o lago sem a beira (a segunda demão), a tundra, a prévia com as
//     estrelas dos pontos;
//   · (SO=janela) a aba Região livre da janela "Gerar um lugar…": as escolhas, a seção Traçado (sem o relevo natural; o
//     rio só com água de rio; o mar na costa), travar e gerar outro, o modelo, a cena criada (os marcadores ocultos com
//     o nome, a chegada, o relevo, o fundo) e quem joga não vê os marcadores.
// FOTOS=<pasta> guarda capturas.
const path = require('path'), fs = require('fs');
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const SHOTS = process.env.FOTOS;

(async () => {
  const t = await open({ w: 1360, h: 900 });
  const { page } = t;
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const w = ms => page.waitForTimeout(ms || 140);
  const j = JSON.stringify;
  const foto = async (nome, clip) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot(Object.assign({ path: path.join(SHOTS, nome + '.png') }, clip ? { clip } : {})); } };
  const SO = (process.env.SO || '').split(',').filter(Boolean), parte = k => !SO.length || SO.includes(k);

  // ================= o motor =================
  if (parte('motor')) {
    const r = await ev(() => {
      const B = __tc.Biomas, T = __tc.Tracado, P = __tc.Paisagem, out = {};
      const limpo = F => JSON.stringify({ bio: Array.from(F.bio), alt: Array.from(F.alt).map(v => Math.round(v * 1e4)), rios: F.rios.map(r => r.pts), lagos: F.lagos.map(l => l.pts), pl: F.planaltos.map(p => p.pts), pd: F.paredoes.map(p => p.pts), mar: F.mar && F.mar.pts, vizs: F.vizs });
      // a tabela
      out.ids = B.IDS.slice();
      out.tabela = B.LISTA.every(b => b.viz.length === 3 && b.viz.every(v => B.BIO[v] && v !== b.id) && P.PAL[b.pal] && (!b.rocha || P.PEDRA[b.pedra]) && b.alto[0] > b.alto[1] && typeof b.arv === 'function');
      // a mesma semente, o mesmo chão
      const o = { bioma: 'floresta', mistura: 'media', agua: 'rio', rio: { curvas: 5 } };
      out.mesmo = limpo(B.campo(40, 30, 1234, o)) === limpo(B.campo(40, 30, 1234, o));
      out.outro = limpo(B.campo(40, 30, 1234, o)) !== limpo(B.campo(40, 30, 1235, o));
      // a mistura: quanto da cena é dos vizinhos (doze sementes)
      const fracao = mist => { let s = 0, nv = new Set(), viz = true; for (let k = 1; k <= 12; k++) { const F = B.campo(40, 30, k * 17, { bioma: 'floresta', mistura: mist, agua: 'nenhuma' }); s += Array.from(F.bio).filter(v => v !== B.IDX.floresta).length / F.bio.length; nv.add(F.vizs.length); viz = viz && F.vizs.every(v => B.BIO.floresta.viz.includes(v)); } return { media: +(s / 12).toFixed(3), nv: [...nv].sort(), viz }; };
      out.mistura = { pouca: fracao('pouca'), media: fracao('media'), muita: fracao('muita') };
      // a costa: o mar num lado, a praia
      const C = B.campo(40, 30, 77, { bioma: 'costa', agua: 'rio', rio: {} });
      const lado = C.mar && C.mar.lado, prof = lado ? (lado === 'n' || lado === 's' ? 30 : 40) : 1;
      let noMar = 0, foraDoLado = 0;
      for (let q = 0; q < 1200; q++) { const x = q % 40 + 0.5, y = Math.floor(q / 40) + 0.5; if (C.ehMar(x, y)) { noMar++; const d = lado === 'n' ? y : lado === 's' ? 30 - y : lado === 'o' ? x : 40 - x; if (d > prof * 0.6) foraDoLado++; } }
      out.costa = { lado, fracao: +(noMar / 1200).toFixed(2), foraDoLado, praia: !!(C.mar && C.mar.praia.length > 10), destino: C.rios[0] && C.rios[0].destino };
      // o rio pela rosa: do oeste para o leste (começa e acaba fora do mapa, nos lados pedidos), do alto para o baixo
      const R1 = B.campo(40, 30, 31, { bioma: 'floresta', agua: 'rio', rio: { de: 'o', para: 'l' } }), r1 = R1.rios[0];
      out.rosa = r1 ? { ini: r1.pts[0].map(v => +v.toFixed(1)), fim: r1.pts[r1.pts.length - 1].map(v => +v.toFixed(1)), desce: R1.alt[r1.cel[0]] > R1.alt[r1.cel[r1.cel.length - 1]] } : null;
      // de onde vem, nas oito direções: o rio começa perto dela
      out.deOito = [];
      for (const de of T.IDS) for (let s = 1; s <= 3; s++) { const F = B.campo(40, 30, s * 59 + de.length, { bioma: 'floresta', mistura: 'pouca', agua: 'rio', rio: { de } }), r = F.rios[0], pb = T.naBorda(de, 40, 30, 0, 0); out.deOito.push(r ? +Math.hypot(r.pts[0][0] - pb[0], r.pts[0][1] - pb[1]).toFixed(1) : 99); }
      // o afluente chega no trecho do meio do rio, em dez sementes
      out.afMeio = [];
      for (let s = 1; s <= 10; s++) { const F = B.campo(40, 30, s * 83, { bioma: 'floresta', mistura: 'pouca', agua: 'rio', rio: { afluente: true } }), m = F.rios.find(x => !x.afluente), a = F.rios.find(x => x.afluente); if (!m || !a) { out.afMeio.push(null); continue; } const fim = a.pts[a.pts.length - 1], L = T.comprimento(m.pts); let s2 = 0, sm = 0, dm = Infinity; for (let i = 1; i < m.pts.length; i++) { s2 += Math.hypot(m.pts[i][0] - m.pts[i - 1][0], m.pts[i][1] - m.pts[i - 1][1]); const d = Math.hypot(m.pts[i][0] - fim[0], m.pts[i][1] - fim[1]); if (d < dm) { dm = d; sm = s2; } } out.afMeio.push(+(sm / L).toFixed(2)); }
      // o lago no caminho do rio, com as curvas no máximo: o rio passa por ele, em dez sementes
      out.lagoCurvas = 0;
      for (let s = 1; s <= 10; s++) { const F = B.campo(40, 30, s * 97, { bioma: 'floresta', mistura: 'pouca', agua: 'rio', rio: { lago: true, curvas: 10 } }), L = F.lagos[0]; if (L && Math.min(...F.rios[0].pts.map(([x, y]) => Math.hypot(x - L.centro[0], y - L.centro[1]))) < 0.75) out.lagoCurvas++; }
      // a costa vizinha fica na faixa do mar
      out.costaViz = [];
      for (let s = 1; s <= 40 && out.costaViz.length < 6; s++) { const F = B.campo(40, 30, s * 31, { bioma: 'campo', mistura: 'media', agua: 'nenhuma' }); if (!F.vizs.includes('costa') || !F.mar) continue; const lado = F.mar.lado, D = lado === 'n' || lado === 's' ? 30 : 40; let sd = 0, n = 0; for (let q = 0; q < 1200; q++) if (B.LISTA[F.bio[q]].id === 'costa') { const x = q % 40 + 0.5, y = Math.floor(q / 40) + 0.5; sd += (lado === 'n' ? y : lado === 's' ? 30 - y : lado === 'o' ? x : 40 - x) / D; n++; } out.costaViz.push(+(sd / n).toFixed(2)); }
      // sem a rosa, em trinta sementes: o rio atravessa (chega longe das bordas) e não começa e acaba no mesmo lado
      const lados = p => { const [x, y] = p; return x < 0 ? 'o' : x > 40 ? 'l' : y < 0 ? 'n' : y > 30 ? 's' : 'dentro'; };
      let atravessa = 0, mesmoLado = 0, desce = 0, total = 0;
      for (let s = 1; s <= 30; s++) {
        const F = B.campo(40, 30, s * 101, { bioma: B.IDS[s % 13] === 'costa' ? 'floresta' : B.IDS[s % 13], mistura: 'pouca', agua: 'rio', rio: {} }), r = F.rios[0];
        if (!r || F.mar) continue;
        total++;
        if (Math.max(...r.pts.map(([x, y]) => Math.min(x, y, 40 - x, 30 - y))) >= 30 * 0.3) atravessa++;
        if (lados(r.pts[0]) === lados(r.pts[r.pts.length - 1])) mesmoLado++;
        if (F.alt[r.cel[0]] > F.alt[r.cel[r.cel.length - 1]]) desce++;
      }
      out.semRosa = { total, atravessa, mesmoLado, desce };
      // o rio que acaba no lago
      const R2 = B.campo(40, 30, 51, { bioma: 'floresta', agua: 'rio', rio: { de: 'n', para: 'lago' } }), r2 = R2.rios[0];
      out.noLago = R2.lagos.length === 1 && r2 && r2.destino === 'lago' && T.dentro(R2.lagos[0].pts, ...r2.pts[r2.pts.length - 1]);
      out.pecasNoLago = r2 ? r2.pecas.every(pc => pc.slice(1, -1).every(([x, y]) => !T.dentro(R2.lagos[0].pts, x, y) || T.distLinha(R2.lagos[0].pts.concat([R2.lagos[0].pts[0]]), x, y) < 1)) : false;
      // o lago no caminho do rio e o afluente (que chega no trecho do meio)
      const R3 = B.campo(40, 30, 61, { bioma: 'floresta', agua: 'rio', rio: { lago: true, afluente: true } });
      const m3 = R3.rios.find(r => !r.afluente), a3 = R3.rios.find(r => r.afluente);
      out.lagoNoRio = R3.lagos.length === 1 && !!m3 && m3.pts.some(([x, y]) => T.dentro(R3.lagos[0].pts, x, y));
      if (a3 && m3) { const fim = a3.pts[a3.pts.length - 1], L = T.comprimento(m3.pts); let s = 0, sm = 0, dm = Infinity; for (let i = 1; i < m3.pts.length; i++) { s += Math.hypot(m3.pts[i][0] - m3.pts[i - 1][0], m3.pts[i][1] - m3.pts[i - 1][1]); const d = Math.hypot(m3.pts[i][0] - fim[0], m3.pts[i][1] - fim[1]); if (d < dm) { dm = d; sm = s; } } out.afluente = { dist: +dm.toFixed(2), onde: +(sm / L).toFixed(2), hw: a3.hw, hwRio: m3.hw }; }
      else out.afluente = null;
      // as curvas: 0 segue o rumo; 10 serpenteia
      const sinu = c => { const F = B.campo(40, 30, 71, { bioma: 'floresta', agua: 'rio', rio: { de: 'o', para: 'l', curvas: c } }), p = F.rios[0].pts; return T.comprimento(p) / Math.hypot(p[p.length - 1][0] - p[0][0], p[p.length - 1][1] - p[0][1]); };
      out.curvas = [+sinu(0).toFixed(3), +sinu(10).toFixed(3)];
      // sem os pedacinhos soltos (os grupos do mesmo bioma têm seis casas ou mais), e o lago redondo (não escorre pelo vale)
      const areaP = pts => { let s = 0; for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) s += (pts[k][0] + pts[i][0]) * (pts[k][1] - pts[i][1]); return Math.abs(s / 2); };
      let pedacinhos = 0; const redondeza = [];
      for (let s = 1; s <= 12; s++) {
        const F = B.campo(40, 30, s * 37, { bioma: ['campo', 'floresta', 'deserto', 'neve'][s % 4], mistura: 'muita', agua: 'lago' });
        if (F.lagos[0]) redondeza.push(4 * Math.PI * areaP(F.lagos[0].pts) / Math.pow(T.comprimento(F.lagos[0].pts.concat([F.lagos[0].pts[0]])), 2));
        const marca = new Int32Array(1200).fill(-1);
        for (let k = 0; k < 1200; k++) { if (marca[k] >= 0) continue; const v = F.bio[k], fila = [k]; let n = 0; marca[k] = 1; while (fila.length) { const q = fila.pop(); n++; const i = q % 40, j = (q - i) / 40; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= 40 || y >= 30) continue; const m = y * 40 + x; if (marca[m] < 0 && F.bio[m] === v) { marca[m] = 1; fila.push(m); } } } if (n < 6) pedacinhos++; }
      }
      out.pedacinhos = pedacinhos;
      out.redondeza = { media: +(redondeza.reduce((a, b) => a + b, 0) / redondeza.length).toFixed(2), min: +Math.min(...redondeza).toFixed(2), n: redondeza.length };
      // o lago sozinho; sem água
      const L1 = B.campo(40, 30, 81, { bioma: 'campo', agua: 'lago' }), L0 = B.campo(40, 30, 81, { bioma: 'campo', agua: 'nenhuma' });
      out.soLago = L1.lagos.length === 1 && L1.rios.length === 0 && L1.lagos[0].cel.size >= 30;
      out.semAgua = L0.lagos.length === 0 && L0.rios.length === 0;
      // os patamares: longe da água e da borda; o pântano quase plano; a montanha cheia deles
      let patamarNaAgua = 0, naBorda = 0;
      const area = pts => { let s = 0; for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) s += (pts[k][0] + pts[i][0]) * (pts[k][1] - pts[i][1]); return Math.abs(s / 2); };
      const somaArea = (bio, n0) => { let s = 0; for (let k = 1; k <= 8; k++) { const F = B.campo(40, 30, k * 7 + n0, { bioma: bio, mistura: 'pouca', agua: 'rio', rio: {} }); s += F.planaltos.filter(p => p.nivel === 1).reduce((a, p) => a + area(p.pts), 0) + F.paredoes.reduce((a, p) => a + area(p.pts), 0);
        for (const p of F.planaltos.concat(F.paredoes)) { if (F.rios.some(r => r.pts.some(([x, y]) => T.dentro(p.pts, x, y)))) patamarNaAgua++; if (p.pts.some(([x, y]) => x < 0.6 || y < 0.6 || x > 39.4 || y > 29.4)) naBorda++; } } return Math.round(s / 8); };
      out.patamares = { pantano: somaArea('pantano', 1), campo: somaArea('campo', 2), montanha: somaArea('montanha', 3), patamarNaAgua, naBorda };
      // o tempo da conta (a maior: 48 × 36, com tudo)
      const t0 = performance.now();
      for (let k = 0; k < 5; k++) B.campo(48, 36, 900 + k, { bioma: 'montanha', mistura: 'muita', agua: 'rio', rio: { afluente: true, lago: true } });
      out.ms = Math.round((performance.now() - t0) / 5);
      return out;
    });
    ok(j(r.ids) === j(['floresta', 'campo', 'deserto', 'montanha', 'pantano', 'neve', 'selva', 'corrompida', 'lava', 'cristais', 'savana', 'costa', 'tundra']) && r.tabela, 'a tabela: os doze biomas de antes e a savana, a costa e a tundra; cada um com três vizinhos da tabela, a paleta, a pedra (os de pedra) e as alturas');
    ok(r.mesmo && r.outro, 'a mesma semente dá o mesmo chão; outra semente, outro');
    const M = r.mistura;
    ok(M.pouca.media > 0.1 && M.pouca.media < 0.21 && M.media.media > 0.24 && M.media.media < 0.38 && M.muita.media > 0.4 && M.muita.media < 0.56, 'a Mistura: a parte da cena que é dos vizinhos — uns 16% na pouca, 32% na média, 48% na muita: ' + j([M.pouca.media, M.media.media, M.muita.media]));
    ok(j(M.pouca.nv) === j([1]) && j(M.muita.nv) === j([2]) && j(M.media.nv) === j([1, 2]) && M.pouca.viz && M.media.viz && M.muita.viz, 'um vizinho na pouca, dois na muita, um ou dois na média — sempre da tabela: ' + j([M.pouca.nv, M.media.nv, M.muita.nv]));
    ok(r.costa.lado && r.costa.fracao > 0.15 && r.costa.fracao < 0.45 && r.costa.foraDoLado === 0 && r.costa.praia && r.costa.destino === 'mar', 'a costa: o mar num lado (uns 28% do mapa, nada dele longe daquele lado), a praia, e o rio deságua no mar: ' + j(r.costa));
    ok(r.rosa && r.rosa.ini[0] < 0 && r.rosa.fim[0] > 40 && r.rosa.desce, 'o rio pela rosa, do oeste para o leste: entra pela borda da esquerda, sai pela da direita, e desce: ' + j(r.rosa));
    ok(r.semRosa.total >= 25 && r.semRosa.atravessa === r.semRosa.total && r.semRosa.mesmoLado === 0 && r.semRosa.desce === r.semRosa.total, 'sem a rosa, em trinta sementes: o rio atravessa a região (chega a nove quadrados das bordas ou mais), sai por outro lado e desce: ' + j(r.semRosa));
    ok(r.deOito.every(d => d <= 10.5), 'de onde vem o rio, nas oito direções (três sementes cada): ele começa perto dela — ' + j(r.deOito));
    ok(r.afMeio.every(x => x != null && x >= 0.2 && x <= 0.85), 'o afluente chega no trecho do meio do rio, em dez sementes: ' + j(r.afMeio));
    ok(r.lagoCurvas === 10, 'o lago no caminho do rio, com as curvas no máximo: o rio passa pelo meio dele nas dez sementes: ' + r.lagoCurvas);
    ok(r.costaViz.length >= 4 && r.costaViz.every(x => x < 0.25), 'a costa vizinha fica na faixa do mar (a distância média das casas dela ao lado do mar, na medida do mapa): ' + j(r.costaViz));
    ok(r.noLago && r.pecasNoLago, 'para onde vai: o lago — o rio acaba dentro dele, e o desenho do rio não atravessa o lago (fica só a ponta, que o lago cobre)');
    ok(r.lagoNoRio, '"Com lago": o lago no caminho do rio (o rio passa por ele)');
    ok(r.afluente && r.afluente.dist < 1.5 && r.afluente.onde > 0.2 && r.afluente.onde < 0.85 && r.afluente.hw < r.afluente.hwRio, 'o afluente acaba no rio, no trecho do meio dele, e é mais estreito: ' + j(r.afluente));
    ok(r.curvas[0] < 1.12 && r.curvas[1] > r.curvas[0] + 0.05, 'as curvas: 0 segue o rumo; 10 serpenteia (o comprimento sobre a reta): ' + j(r.curvas));
    ok(r.soLago && r.semAgua, '"Lago": só o lago, na parte mais baixa; "Sem água": nem rio nem lago');
    ok(r.pedacinhos === 0, 'sem os pedacinhos soltos: os grupos do mesmo bioma têm seis casas ou mais (na mistura muita, em doze sementes): ' + r.pedacinhos);
    ok(r.redondeza.n === 12 && r.redondeza.media >= 0.62 && r.redondeza.min >= 0.45, 'o lago enche redondo (não escorre comprido pelo vale): ' + j(r.redondeza));
    ok(r.patamares.patamarNaAgua === 0 && r.patamares.naBorda === 0, 'os patamares (os morros, os planaltos, os paredões) ficam longe da água e da borda: ' + j(r.patamares));
    ok(r.patamares.pantano < r.patamares.campo * 0.6 && r.patamares.montanha > r.patamares.campo * 1.5, 'o pântano é quase plano; a montanha, cheia de patamares (a área deles, comparada à do campo): ' + j(r.patamares));
    ok(r.ms < 150, 'a conta do maior (48 × 36, com afluente e lago) leva ' + r.ms + ' ms');
  }

  // ================= o plano da Região livre =================
  if (parte('regiao')) {
    const r = await ev(() => {
      const R = __tc.Regiao, B = __tc.Biomas, T = __tc.Tracado, out = {};
      const PE = new Set([0, 1, 4, 5, 6, 8, 10]);
      // de começo
      const p0 = R.gerar({ seed: 3 });
      out.padrao = { lugar: p0.lugar, v: p0.v, bioma: p0.bioma, W: p0.W, H: p0.H, mistura: p0.mistura, aguaPedida: p0.aguaPedida, caminho: p0.caminho, marcas: p0.comMarcas, semFuncoes: !('dens' in p0) && !('esp' in p0), json: JSON.stringify(p0).length };
      // os tamanhos e os pontos de interesse, nos treze biomas
      const pontos = {}, ruins = [];
      const NOMES = new Set(['Poço velho', 'Árvore antiga', 'Cristal antigo', 'Círculo de pedras', 'Entrada de gruta', 'Ninho', 'Toca', 'Vau', 'Ponte velha', 'Tronco sobre o rio', 'Ponte de pedra velha']);
      for (const tam of ['pequeno', 'medio', 'grande']) for (const b of B.IDS) for (const sd of [5 + b.length, 71 + b.length]) {
        const p = R.gerar({ bioma: b, tamanho: tam, seed: sd });
        (pontos[tam] = pontos[tam] || []).push(p.pontos.length);
        for (const q of p.pontos) {
          if (!(q.x >= 0 && q.y >= 0 && q.x < p.W && q.y < p.H)) ruins.push([b, tam, 'fora', q]);
          else if (!PE.has(p.occ[q.y * p.W + q.x])) ruins.push([b, tam, 'onde não se pisa', q, p.occ[q.y * p.W + q.x]]);
          if (!NOMES.has(q.n)) ruins.push([b, tam, 'nome', q.n]);
          if (q.k === 'vau' && !p.aguas.some(a => a.k === 'rio')) ruins.push([b, tam, 'vau sem rio']);
        }
        if (new Set(p.pontos.map(q => q.x + ',' + q.y)).size !== p.pontos.length) ruins.push([b, tam, 'dois no mesmo lugar']);
        if (p.marcas.chegada && !PE.has(p.occ[p.marcas.chegada[1] * p.W + p.marcas.chegada[0]])) ruins.push([b, tam, 'chegada onde não se pisa']);
      }
      out.pontos = pontos; out.ruins = ruins.slice(0, 6);
      out.medidas = ['pequeno', 'medio', 'grande'].map(k => { const p = R.gerar({ tamanho: k, seed: 9 }); return [p.W, p.H]; });
      // os treze biomas com as quatro águas: sem erro
      const erros = [];
      for (const b of B.IDS) for (const agua of ['surpresa', 'rio', 'lago', 'nenhuma']) for (const s of [1, 2]) { try { const p = R.gerar({ bioma: b, agua, seed: s * 13 + agua.length, mistura: ['pouca', 'media', 'muita'][s % 3] }); if (!R.resumo(p).startsWith(B.BIO[b].n)) erros.push([b, agua, 'resumo']); JSON.stringify(p); } catch (e) { erros.push([b, agua, e.message]); } }
      out.erros = erros.slice(0, 5);
      // a mesma semente
      const a = JSON.stringify(R.gerar({ bioma: 'neve', seed: 44, agua: 'rio' })), b2 = JSON.stringify(R.gerar({ bioma: 'neve', seed: 44, agua: 'rio' })), c = JSON.stringify(R.gerar({ bioma: 'neve', seed: 45, agua: 'rio' }));
      out.semente = a === b2 && a !== c;
      // a trava do traçado: gerar outro troca só as árvores, as pedras e os enfeites
      const q1 = R.gerar({ bioma: 'floresta', seed: 7, agua: 'rio' });
      const trava = R.LUGAR.alternar(q1, 'tracado', null);
      const q2 = R.gerar({ bioma: 'floresta', seed: 999, agua: 'rio', trava });
      const tracado = p => JSON.stringify([p.aguas, p.caminhos, p.relevo.filter(x => x.t !== 'mata' || true), p.massas, p.pontos, p.biomas, p.pintados.filter(o => o.k !== 'mancha' || true)]);
      out.trava = { travou: !!trava && trava.bioma === 'floresta' && q1.travaTracado, igual: tracado(q1) === tracado(q2), arvores: JSON.stringify(q1.arvores) !== JSON.stringify(q2.arvores), travada: q2.travaTracado && R.LUGAR.travada(q2, 'tracado'), outroBioma: R.limparTrava(trava, { bioma: 'campo', tamanho: 'medio', mistura: 'media', agua: 'rio', caminho: 'trilha' }) === null };
      // a água
      const tem = p => ({ rio: p.aguas.some(x => x.k === 'rio'), lago: (p.lagos || []).length > 0, mar: !!p.mar, destino: (p.rios[0] || {}).destino || null });
      out.agua = { rio: tem(R.gerar({ bioma: 'campo', agua: 'rio', seed: 2 })), lago: tem(R.gerar({ bioma: 'campo', agua: 'lago', seed: 2 })), nenhuma: tem(R.gerar({ bioma: 'campo', agua: 'nenhuma', seed: 2 })) };
      const vistos = new Set();
      for (let s = 1; s <= 40; s++) { const p = R.gerar({ bioma: 'floresta', agua: 'surpresa', seed: s }), x = tem(p); vistos.add(x.rio ? (x.destino === 'lago' ? 'rio-lago' : 'rio') : x.lago ? 'lago' : 'nada'); }
      out.surpresa = [...vistos].sort();
      // (uma semente em que a Surpresa não dá rio: com a rosa, dá)
      let sSem = 0;
      for (let s = 1; s <= 40 && !sSem; s++) if (!tem(R.gerar({ bioma: 'floresta', agua: 'surpresa', seed: s })).rio) sSem = s;
      out.surpresaRosa = !!sSem && tem(R.gerar({ bioma: 'floresta', agua: 'surpresa', seed: sSem, rioDe: 'n' })).rio;
      // o caminho
      const cs = k => R.gerar({ bioma: 'floresta', agua: 'nenhuma', caminho: k, seed: 4 }).caminhos;
      const pe = R.gerar({ bioma: 'floresta', agua: 'rio', caminho: 'estrada', seed: 1 }).pintados.filter(o => o.k === 'ponte').map(o => o.larg);
      out.caminho = { pontesEstrada: pe, nenhum: cs('nenhum').length, trilha: [...new Set(cs('trilha').map(x => x.hw))], estrada: [...new Set(cs('estrada').map(x => x.hw))], rosaSem: R.gerar({ bioma: 'floresta', agua: 'nenhuma', caminho: 'nenhum', portoes: ['n'], seed: 4 }).caminhos.length };
      // com o mar no lado oposto, o caminho vai para um lado de través (nunca fica sem); da rosa, o lado do mar não conta
      let semCam = 0, doMar = 0;
      let comTerra = 0;
      for (let s = 1; s <= 16; s++) {
        const p = R.gerar({ bioma: 'costa', agua: 'nenhuma', seed: s }); if (!p.caminhos.length) semCam++;
        const pm = R.gerar({ bioma: 'costa', agua: 'nenhuma', seed: s, portoes: [p.mar.lado] }); if (pm.caminhos.length) doMar++;
        // (a rosa com o lado do mar e o de terra: sai o da terra, e nenhum vem do mar)
        const pt = R.gerar({ bioma: 'costa', agua: 'nenhuma', seed: s, portoes: [p.mar.lado, T.oposta(p.mar.lado)] }), pb = T.naBorda(p.mar.lado, p.W, p.H, 0, 0);
        if (pt.caminhos.length && pt.caminhos.every(cm => [cm.pts[0], cm.pts[cm.pts.length - 1]].every(([x, y]) => Math.hypot(x - pb[0], y - pb[1]) > 6))) comTerra++;
      }
      out.caminhoCosta = { semCam, doMar, comTerra };
      // a rosa dos caminhos: de cada direção, um caminho que entra pelo lado dela
      const pr = R.gerar({ bioma: 'floresta', agua: 'nenhuma', portoes: ['n', 'l', 'so'], seed: 4 });
      const pontas = pr.caminhos.map(cm => [cm.pts[0], cm.pts[cm.pts.length - 1]]).flat();
      const perto = (id) => { const pb = T.naBorda(id, pr.W, pr.H, 0, 0); return pontas.some(([x, y]) => Math.hypot(x - pb[0], y - pb[1]) < Math.min(pr.W, pr.H) * 0.25 + 2.5); };
      out.rosa = { n: perto('n'), l: perto('l'), so: perto('so'), resto: !perto('s') || !perto('o') };
      // as pontes: o caminho que cruza o rio tem a ponte (ou o vau, ou a ponte velha); com 0, nenhuma ponte a mais
      let semPonte = 0, cruzam = 0;
      for (let s = 1; s <= 12; s++) {
        const p = R.gerar({ bioma: 'floresta', agua: 'rio', seed: s }), rios = p.aguas.filter(x => x.k === 'rio').map(x => ({ pts: x.pts, hw: x.hw }));
        for (const cm of p.caminhos) for (const q of T.cruzamentos(cm.pts, { rios, lago: null })) { if (q.x < 0.5 || q.y < 0.5 || q.x > p.W - 0.5 || q.y > p.H - 0.5) continue; cruzam++; if (!p.pintados.some(o => (o.k === 'ponte' && Math.hypot(o.x - q.x, o.y - q.y) < 3) || (o.k === 'pedras' && o.pts.some(pq => Math.hypot(pq[0] - q.x, pq[1] - q.y) < 2.5)))) semPonte++; }
      }
      out.pontes = { cruzam, semPonte };
      let pontes0 = 0, velhas = 0;
      for (let s = 1; s <= 12; s++) { const p = R.gerar({ bioma: 'floresta', agua: 'rio', seed: s, pontes: 0 }); const vau = p.pontos.find(q => q.k === 'vau'); for (const o of p.pintados.filter(x => x.k === 'ponte')) { if (vau && Math.hypot(o.x - vau.cx, o.y - vau.cy) < 1) velhas++; else pontes0++; } if (p.pontesNovas !== 0) pontes0 += 100; }
      out.pontes0 = { pontes0, velhas };
      // a costa: o mar, a praia, a espuma; nada no mar
      const pc = R.gerar({ bioma: 'costa', agua: 'rio', seed: 12 });
      const marLago = pc.aguas.find(x => x.k === 'lago' && x.tipo === 'mar');
      out.costa = { mar: !!pc.mar && !!marLago, praia: pc.pintados.some(o => o.k === 'praia' && o.z === 0), espuma: pc.pintados.some(o => o.k === 'espuma'), demao: pc.pintados.some(o => o.k === 'aguaParada' && o.tipo === 'mar' && o.semBeira), pontoNoMar: pc.pontos.some(q => T.dentro(marLago.pts, q.x + 0.5, q.y + 0.5)), destino: (pc.rios[0] || {}).destino };
      // a lava: o rio de lava com a zona e a luz; o gelo: o lago congelado (anda-se nele), a zona escorregadia
      const pl = R.gerar({ bioma: 'lava', agua: 'rio', seed: 3 });
      out.lava = { rio: pl.aguas.some(x => x.k === 'rio' && x.tipo === 'lava'), zona: pl.zonas.some(z => z.fx === 'lava' && z.k === 'rect'), luz: pl.luzes.length > 0 };
      // a clareira (com o poço ou o círculo de pedras) fica sem árvores; a árvore antiga fica no meio dela
      let comArvore = 0, clareiras = 0;
      for (let s = 1; s <= 30; s++) { const p = R.gerar({ bioma: 'floresta', seed: s, tamanho: 'grande' }); for (const q of p.pontos.filter(x => x.k === 'clareira' && x.n !== 'Árvore antiga' && x.n !== 'Cristal antigo')) { clareiras++; if (p.arvores.some(a => Math.hypot(a.x - q.cx, a.y - q.cy) < 1.6)) comArvore++; } }
      out.clareira = { clareiras, comArvore };
      let gelo = null;
      for (let s = 1; s <= 10 && !gelo; s++) { const p = R.gerar({ bioma: 'tundra', agua: 'lago', mistura: 'pouca', seed: s }); const l = p.aguas.find(x => x.k === 'lago' && x.tipo === 'gelo'); if (l) { const cx = Math.floor(l.pts.reduce((a, q) => a + q[0], 0) / l.pts.length), cy = Math.floor(l.pts.reduce((a, q) => a + q[1], 0) / l.pts.length); gelo = { anda: p.occ[cy * p.W + cx] === 5, zona: p.zonas.some(z => z.fx === 'gelado'), resumo: R.resumo(p) }; } }
      out.gelo = gelo;
      // a seca do Mapa-múndi: o chão verde vira capim seco; o deserto não muda
      const sc = R.gerar({ bioma: 'floresta', seco: true, seed: 1 }), sd = R.gerar({ bioma: 'deserto', seco: true, seed: 6 });
      const verdes = sc.biomas.filter(b => ['campo', 'selva', 'pantano'].includes(b.id));
      out.seco = { pal: sc.pal, seco: sc.seco, resumo: /o chão seco/.test(R.resumo(sc)), deserto: sd.seco === false && sd.pal === 'areia', vizinhos: verdes.length > 0 && verdes.every(b => b.pal === 'savana') };
      // as árvores trazem a paleta e a neve do bioma onde estão
      const pn = R.gerar({ bioma: 'neve', mistura: 'muita', seed: 8 });
      out.arvores = { todas: pn.arvores.every(a => typeof a.pal === 'string' && typeof a.neve === 'boolean'), nevadas: pn.arvores.filter(a => a.neve).length, semNeve: pn.arvores.filter(a => !a.neve).length };
      // o nome e o resumo
      out.nomes = [R.nomePadrao({ bioma: 'floresta' }), R.nomePadrao({ bioma: 'cristais' }), R.nomePadrao({ bioma: 'lava' })];
      out.resumo = R.resumo(R.gerar({ bioma: 'montanha', agua: 'rio', afluente: true, seed: 21, tamanho: 'grande' }));
      // sem os marcadores
      const sm = R.gerar({ bioma: 'campo', marcas: false, seed: 5 });
      out.semMarcas = j(sm.marcas) === '{}' && sm.comMarcas === false && sm.pontos.length === 2;
      return out;
      function j(x) { return JSON.stringify(x); }
    });
    ok(r.padrao.lugar === 'regiao' && r.padrao.v === 1 && r.padrao.bioma === 'floresta' && r.padrao.W === 40 && r.padrao.H === 30 && r.padrao.mistura === 'media' && r.padrao.aguaPedida === 'surpresa' && r.padrao.caminho === 'trilha' && r.padrao.marcas && r.padrao.semFuncoes, 'de começo: a floresta, 40 × 30, a mistura média, a água na Surpresa, a trilha e os marcadores (o plano sem funções): ' + j(r.padrao));
    ok(j(r.medidas) === j([[32, 24], [40, 30], [48, 36]]), 'os tamanhos: 32 × 24, 40 × 30 e 48 × 36: ' + j(r.medidas));
    ok(r.pontos.pequeno.every(x => x === 1) && r.pontos.medio.every(x => x === 2) && r.pontos.grande.every(x => x === 3), 'os pontos de interesse pelo tamanho (1, 2, 3), nos treze biomas: ' + j(r.pontos));
    ok(!r.ruins.length, 'os marcadores (a chegada e os pontos) dentro do mapa, onde se pisa, cada um no seu lugar, com o nome do que há ali; o vau só com rio: ' + j(r.ruins));
    ok(!r.erros.length, 'os treze biomas com as quatro águas e as três misturas: sem erro, e o resumo começa pelo bioma: ' + j(r.erros));
    ok(r.semente, 'a mesma semente dá a mesma região; outra semente, outra');
    ok(r.trava.travou && r.trava.igual && r.trava.arvores && r.trava.travada && r.trava.outroBioma, 'a trava do traçado: com outra semente, a água, o relevo, o caminho e os pontos ficam; as árvores mudam; outro bioma solta: ' + j(r.trava));
    ok(r.agua.rio.rio && !r.agua.lago.rio && r.agua.lago.lago && !r.agua.nenhuma.rio && !r.agua.nenhuma.lago, 'a água: "Rio" (o rio), "Lago" (só o lago), "Sem água" (nada): ' + j(r.agua));
    ok(j(r.surpresa) === j(['lago', 'nada', 'rio', 'rio-lago']) && r.surpresaRosa, 'a Surpresa sorteia o rio, o rio que acaba no lago, só o lago e nada; escolher de onde o rio vem garante o rio: ' + j(r.surpresa));
    ok(r.caminho.nenhum === 0 && j(r.caminho.trilha) === j([0.75]) && j(r.caminho.estrada) === j([1.35]) && r.caminho.rosaSem > 0 && r.caminho.pontesEstrada.length && r.caminho.pontesEstrada.every(x => x > 3), 'o caminho: sem caminho, a trilha, a estrada (mais larga); sem caminho, a rosa ainda põe uma trilha: ' + j(r.caminho));
    ok(r.caminhoCosta.semCam === 0 && r.caminhoCosta.doMar === 0 && r.caminhoCosta.comTerra === 16, 'na costa, sempre há caminho (com o mar do outro lado, ele vai para um lado de través); o caminho da rosa que viria do mar não sai: ' + j(r.caminhoCosta));
    ok(r.rosa.n && r.rosa.l && r.rosa.so && r.rosa.resto, 'a rosa dos caminhos (norte, leste, sudoeste): um caminho entra por cada um desses lados: ' + j(r.rosa));
    ok(r.pontes.cruzam > 3 && r.pontes.semPonte === 0, 'cada vez que o caminho cruza o rio, há a ponte (ou o vau, ou a ponte velha do ponto de interesse): ' + j(r.pontes));
    ok(r.pontes0.pontes0 === 0, '"Nenhuma" ponte: o caminho para na beira (só a ponte velha do ponto de interesse, quando é ela): ' + j(r.pontes0));
    ok(r.costa.mar && r.costa.praia && r.costa.espuma && r.costa.demao && !r.costa.pontoNoMar && r.costa.destino === 'mar', 'a costa: o mar (com a segunda demão por cima da foz), a praia, a espuma; o rio deságua no mar; nenhum ponto no mar: ' + j(r.costa));
    ok(r.lava.rio && r.lava.zona && r.lava.luz, 'na terra de lava, o rio de lava, com a zona ao longo dele e a luz');
    ok(r.clareira.clareiras >= 3 && r.clareira.comArvore === 0, 'a clareira do poço velho e a do círculo de pedras ficam sem árvores no meio: ' + j(r.clareira));
    ok(r.gelo && r.gelo.anda && r.gelo.zona && /lago congelado/.test(r.gelo.resumo), 'na tundra, o lago congelado: dá para andar nele, com a zona escorregadia (e o resumo diz): ' + j(r.gelo));
    ok(r.seco.pal === 'savana' && r.seco.seco && r.seco.resumo && r.seco.deserto && r.seco.vizinhos, 'a seca do Mapa-múndi: o chão verde (e o dos vizinhos) vira o capim seco; o deserto não muda: ' + j(r.seco));
    ok(r.arvores.todas && r.arvores.nevadas > 0 && r.arvores.semNeve > 0, 'as árvores trazem a paleta e a neve do bioma delas (na neve com vizinhos, umas com neve, outras sem): ' + j(r.arvores));
    ok(j(r.nomes) === j(['Região livre na floresta', 'Região livre entre os cristais', 'Região livre na terra de lava']), 'o nome da cena: ' + j(r.nomes));
    ok(/^Montanha com .+ · 48 × 36 quadrados · rio com afluente · trilha · .*3 pontos de interesse \(.+\)\.$/.test(r.resumo), 'o resumo: o bioma e os vizinhos, as medidas, a água, o caminho, o relevo e os pontos: ' + r.resumo);
    ok(r.semMarcas, 'sem os marcadores: o plano sem a chegada (os pontos de interesse continuam lá, sem o marcador)');
  }

  // ================= a pintura =================
  if (parte('pintura')) {
    const r = await ev(() => {
      const P = __tc.Paisagem, R = __tc.Regiao, M = __tc.Encontro.motor, out = {};
      const mulberry = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      // o chão misto: a neve numa mancha retangular sobre o campo; a passagem é gradual
      const c = 20, cv = document.createElement('canvas'); cv.width = 20 * c; cv.height = 10 * c;
      const g = cv.getContext('2d'), rnd = mulberry(5);
      P.chao(g, 20, 10, c, rnd, 'campo');
      P.chaoMisto(g, 20, 10, c, rnd, 'neve', [[[8, -2], [22, -2], [22, 12], [8, 12]]], 1.3);
      const im = g.getImageData(0, 0, cv.width, cv.height).data, px1 = (x, y) => { const k = (y * cv.width + x) * 4; return [im[k], im[k + 1], im[k + 2]]; };
      const lum = x => { let s = 0; for (let y = 3 * c; y < 7 * c; y += 5) { const d = px1(Math.round(x * c), y); s += (d[0] + d[1] + d[2]) / 3; } return s / (4 * c / 5); };
      const xs = [3, 6, 7, 7.5, 8, 8.5, 9, 10, 14];
      out.lum = xs.map(x => Math.round(lum(x)));
      // o lago sem a beira (a segunda demão): a beira não aparece
      const cv2 = document.createElement('canvas'); cv2.width = 200; cv2.height = 100;
      const g2 = cv2.getContext('2d'), pts = [[1, 1], [4, 1], [4, 4], [1, 4]];
      g2.fillStyle = '#fff'; g2.fillRect(0, 0, 200, 100);
      P.lago(g2, pts, 20, mulberry(2), 'campo', 'agua');
      g2.save(); g2.translate(100, 0); P.lago(g2, pts, 20, mulberry(2), 'campo', 'agua', true); g2.restore();
      const im2 = g2.getImageData(0, 0, 200, 100).data, px = (x, y) => { const k = (y * 200 + x) * 4; return [im2[k], im2[k + 1], im2[k + 2]]; };
      out.beira = [px(16, 50), px(116, 50)];
      // a tundra
      out.tundra = !!P.PAL.tundra && P.FIOS.tundra === 'tundra' && !!P.PEDRA.tundra;
      // num plano mínimo do motor: a árvore com a neve dela, a água com a paleta dela, o chão dos vizinhos
      const fnv = s2 => { let h = 0x811c9dc5; for (let i = 0; i < s2.length; i += 5) { h ^= s2.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
      const plano = x => Object.assign({ W: 8, H: 6, pal: 'floresta', terreno: 'floresta', sit: 'regiao', estilo: 'comum', seed: 3, chao: [], pintados: [], abismos: [], aguas: [], caminhos: [], massas: [], predios: [], navios: [], rochas: [], arvores: [] }, x);
      const imp = x => fnv(M.pintar(plano(x), 10).toDataURL());
      const arv = neve => [{ x: 4, y: 3, r: 1, esp: 'pinheiro', neve }];
      out.arvoreNeve = imp({ arvores: arv(true) }) !== imp({ arvores: arv(false) });
      const lagoP = pal => [{ k: 'lago', pts: [[2, 2], [6, 2], [6, 4], [2, 4]], tipo: 'agua', pal }];
      out.aguaPal = imp({ aguas: lagoP('pantano') }) !== imp({ aguas: lagoP(undefined) });
      out.vizinhos = imp({ biomas: [{ id: 'neve', pal: 'neve', pts: [[[3, -1], [9, -1], [9, 7], [3, 7]]] }] }) !== imp({});
      // a cena de uma região: o fundo pintado, a prévia com as estrelas dos pontos
      const p = R.gerar({ bioma: 'savana', seed: 4, tamanho: 'pequeno' });
      const f = M.pintar(p, 12);
      out.fundo = [f.width, f.height, p.W * 12, p.H * 12];
      const pv = document.createElement('canvas'), res = R.LUGAR.previa(pv, p, 460, 330, { relevo: true }), im3 = pv.getContext('2d').getImageData(0, 0, pv.width, pv.height).data;
      // (no meio, o branco da estrela; em volta, o dourado do selo)
      const px3 = (x, y) => { const k = (Math.round(y) * pv.width + Math.round(x)) * 4; return [im3[k], im3[k + 1], im3[k + 2]]; };
      out.estrelas = p.pontos.map(q => { const X = (q.x + 0.5) * res.cell, Y = (q.y + 0.5) * res.cell, R2 = Math.max(5, res.cell * 0.46); return [px3(X, Y), px3(X + R2 * 0.45, Y + R2 * 0.45)]; });
      return out;
    });
    const L = r.lum;
    ok(L[0] < 120 && L[8] > 200 && L[3] > L[1] + 15 && L[5] > L[3] + 15 && L[6] > L[5] && L[5] < L[8] - 10, 'o chão misto: o campo, a passagem gradual (a neve vai chegando ao longo de uns dois quadrados) e a neve: ' + j(L));
    ok(j(r.beira[0]) !== j(r.beira[1]), 'o lago sem a beira (a segunda demão, por cima da ponta do rio): a beira não aparece — ' + j(r.beira));
    ok(r.tundra, 'a tundra tem a paleta, o desenho miúdo e a cor das pedras');
    ok(r.arvoreNeve && r.aguaPal && r.vizinhos, 'no desenho: a árvore com a neve do bioma dela, a água com a paleta dela e o chão dos vizinhos: ' + j([r.arvoreNeve, r.aguaPal, r.vizinhos]));
    ok(r.fundo[0] === r.fundo[2] && r.fundo[1] === r.fundo[3], 'o fundo da região: as medidas da cena: ' + j(r.fundo));
    ok(r.estrelas.length === 1 && r.estrelas.every(([[cr, cg, cb], [dr, dg, db]]) => cr > 200 && cg > 180 && cb > 130 && dr > 180 && dg > 120 && dg < 180 && db < 90), 'a prévia mostra a estrela de cada ponto de interesse (o branco no meio, o dourado em volta): ' + j(r.estrelas));
  }

  // ================= a janela e a cena =================
  if (parte('janela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    const ctlTxt = async () => (await page.locator('.ger-op').innerText()).replace(/\n+/g, ' | ');
    const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(500); };
    const semente = async v => { const f = page.locator('#ger-semente'); await f.fill(String(v)); await f.press('Enter'); await w(500); };
    await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700);
    const abas = await page.locator('#ger-lugar button').allTextContents();
    ok(j(abas) === j(['Vilarejo', 'Cidade', 'Tribo', 'Encontro', 'Região livre', 'Ruínas', 'Masmorra', 'Porto']), 'a aba Região livre, entre o Encontro e as Ruínas: ' + j(abas));
    await page.locator('#ger-lugar button', { hasText: 'Região livre' }).click(); await w(800);
    let g = await G();
    ok(await ev(() => __tc.Gerador.vivo().lugar) === 'regiao' && g.plano.lugar === 'regiao' && g.op.bioma === 'floresta' && g.op.mistura === 'media' && g.op.agua === 'surpresa' && g.op.caminho === 'trilha' && g.op.tamanho === 'medio' && g.op.marcas === true, 'de começo: a floresta, a mistura média, a água na Surpresa, a trilha, o médio e os marcadores: ' + j(g.op));
    const c0 = await ctlTxt();
    ok(/^Bioma \| Floresta \| Campo \| Deserto \| Montanha \| Pântano \| Neve \| Selva \| Terra corrompida \| Lava \| Cristais \| Savana \| Costa \| Tundra \| Mistura \| Pouca \| Média \| Muita \| Tamanho \| Pequeno \| Médio \| Grande \| Água \| Surpresa \| Rio \| Lago \| Sem água \| Caminho \| Sem caminho \| Trilha \| Estrada \| (História do lugar \|.*\| Achados raros.*\| )?Marcar a chegada e os pontos de interesse \(só você vê\)/.test(c0), 'as escolhas: os treze biomas, a mistura, o tamanho, a água, o caminho e os marcadores (13c: e a história do lugar e os achados) — ' + c0.slice(0, 300));
    ok(await page.locator('#reg-tr').count() === 1 && await page.locator('#reg-relnat').count() === 0 && /automático \(como sempre\)/.test(await page.locator('#reg-tr-res').innerText()), 'a seção Traçado, sem a chave do relevo natural (a região já nasce do relevo)');
    ok(/^Floresta/.test(await page.locator('#ger-resumo').innerText()) && await page.locator('#ger-nome').inputValue() === 'Região livre na floresta', 'o resumo e o nome: ' + await page.locator('#ger-resumo').innerText());
    ok(/Clique no traçado da prévia \(a água, os morros, o caminho, os pontos de interesse\)/.test(await page.locator('#ger-dica').innerText()) && /Com relevo, formas e zonas \(a água, os morros e os penhascos, as pontes, o gelo, a lava\)/.test(await page.locator('.modal').innerText()), 'a dica (travar o traçado) e a chave do relevo são as da região');
    // o bioma, a água e o rio
    await exato('reg-bio', 'Tundra');
    g = await G();
    ok(g.plano.bioma === 'tundra' && /^Tundra/.test(await page.locator('#ger-resumo').innerText()) && await page.locator('#ger-nome').inputValue() === 'Região livre na tundra', 'a tundra: o plano, o resumo e o nome mudam');
    if (!(await ev(() => document.getElementById('reg-tr').open))) await page.locator('#reg-tr > summary').click();
    await w(250);
    await exato('reg-agua', 'Lago');
    ok(/Só o lago, sem rio/.test(await page.locator('#reg-tr').innerText()) && await page.locator('#reg-rio-de-n').count() === 0, '"Lago": a seção do rio diz como ter o rio');
    await exato('reg-agua', 'Rio');
    await page.locator('#reg-rio-de-o').click(); await w(500);
    await page.locator('#reg-rio-para-l').click(); await w(500);
    g = await G();
    const rio = g.plano.aguas.filter(a => a.k === 'rio');
    ok(g.op.t.rioDe === 'o' && g.op.t.rioPara === 'l' && rio.length && rio[0].pts[0][0] < 0, '"Rio" e a rosa: do oeste para o leste — ' + j(rio.length && [rio[0].pts[0], rio[rio.length - 1].pts.slice(-1)[0]]));
    ok(/rio de oeste, para leste/.test(await page.locator('#reg-tr-res').innerText()), 'o resumo do traçado: ' + await page.locator('#reg-tr-res').innerText());
    await exato('reg-bio', 'Costa');
    ok(/Com mar, o rio deságua no mar/.test(await page.locator('#reg-tr').innerText()), 'na costa, o rio deságua no mar (sem a rosa de para onde vai)');
    await foto('13a-janela-costa', await page.locator('.modal').boundingBox());
    await page.locator('#reg-tr-auto').click(); await w(500);
    await exato('reg-bio', 'Floresta'); await exato('reg-agua', 'Rio'); await exato('reg-mis', 'Muita');
    await semente(31);
    // travar o traçado clicando na prévia, e gerar outro
    await page.locator('#ger-prev').scrollIntoViewIfNeeded(); await w(200);
    const pr = await ev(() => {
      const cv = document.getElementById('ger-prev'), r = cv.getBoundingClientRect(), p = __tc.Gerador.vivo().estado.plano, c = __tc.Gerador.vivo().cell(), k = Math.min(r.width / cv.width, r.height / cv.height);
      const a = p.aguas.find(x => x.k === 'rio'), pt = a.pts.find(([x, y]) => x > 2 && y > 2 && x < p.W - 2 && y < p.H - 2);
      return { x: r.left + (r.width - cv.width * k) / 2 + pt[0] * c * k, y: r.top + (r.height - cv.height * k) / 2 + pt[1] * c * k };
    });
    await page.mouse.move(pr.x, pr.y); await w(200);
    ok(/Clique para travar o traçado/.test(await page.locator('#ger-dica').innerText()), 'passar o mouse no rio da prévia: "Clique para travar o traçado…"');
    await page.mouse.click(pr.x, pr.y); await w(300);
    g = await G();
    const antes = j([g.plano.aguas, g.plano.caminhos, g.plano.pontos]), arv0 = j(g.plano.arvores);
    ok(g.trava && g.trava.s === g.plano.sT && /Uma parte travada/.test(await page.locator('#ger-resumo').innerText()), 'um clique trava o traçado: ' + j(g.trava));
    await page.locator('#ger-outro').click(); await w(700);
    g = await G();
    ok(j([g.plano.aguas, g.plano.caminhos, g.plano.pontos]) === antes && j(g.plano.arvores) !== arv0, '"Gerar outro" com o traçado travado: a água, o caminho e os pontos ficam; as árvores mudam');
    await foto('13a-janela-floresta', await page.locator('.modal').boundingBox());
    // o modelo
    await page.locator('#ger-guardar').click(); await w(150);
    await page.locator('#ger-modelo-nome').fill('Floresta do rio'); await page.keyboard.press('Enter'); await w(300);
    const mod = await ev(() => __tc.Store.S.prefs.modelos.find(m => m.nome === 'Floresta do rio'));
    ok(mod && mod.lugar === 'regiao' && mod.o.bioma === 'floresta' && mod.o.mistura === 'muita' && mod.o.agua === 'rio' && mod.trava && mod.trava.s, 'o modelo guarda a região: o bioma, a mistura, a água, a trava: ' + j(mod && { o: mod.o, trava: mod.trava }));
    await exato('reg-bio', 'Deserto'); await exato('reg-mis', 'Pouca');
    await page.locator('#ger-modelo').selectOption({ label: 'Floresta do rio · Região livre' }); await w(800);
    g = await G();
    ok(g.op.bioma === 'floresta' && g.op.mistura === 'muita' && j([g.plano.aguas, g.plano.caminhos, g.plano.pontos]) === antes, 'abrir o modelo traz a região de volta (o mesmo traçado)');
    // a cena
    const p = (await G()).plano;
    await page.locator('#ger-hora button', { hasText: 'Dia' }).click(); await w(200);
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(500);
    const s = await ev(() => { const u = __tc, sc = u.Store.scene(); return {
      nome: sc.name, cols: sc.cols, rows: sc.rows, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]), cor: sc.bgColor,
      pontos: sc.tokens.filter(x => x.prop === 'interesse').map(x => ({ n: x.name, oculto: !!x.hidden, x: Math.round(x.x / sc.cell), y: Math.round(x.y / sc.cell) })),
      chegada: sc.tokens.filter(x => x.prop === 'chegada').map(x => !!x.hidden), emboscada: sc.tokens.filter(x => x.prop === 'emboscada').length,
      ter: [...new Set(sc.shapes.filter(x => x.ter).map(x => x.ter.t))].sort(), paredes: sc.walls.length, toast: [...document.querySelectorAll('.toast')].map(x => x.innerText).join(' ¶ ') }; });
    ok(s.nome === 'Região livre na floresta' && s.cols === p.W && s.rows === p.H && s.fundo, 'a cena: o nome, as medidas e o fundo pintado: ' + j([s.nome, s.cols, s.rows]));
    ok(s.pontos.length === p.pontos.length && s.pontos.every(q => q.oculto) && j(s.pontos.map(q => q.n).sort()) === j(p.pontos.map(q => q.n).sort()) && s.pontos.every(q => p.pontos.some(pp => pp.x === q.x && pp.y === q.y)), 'cada ponto de interesse com o marcador oculto, no lugar, com o nome do que há ali: ' + j(s.pontos));
    ok(j(s.chegada) === j([true]) && s.emboscada === 0, 'a chegada, oculta (sem a emboscada: a região é para explorar)');
    ok(s.ter.includes('agua') && (s.ter.includes('morro') || s.ter.includes('mata')), 'o relevo da cena: a água e os morros (ou a mata): ' + j(s.ter));
    ok(/"Região livre na floresta" criada: Floresta com .+\. Tudo é editável\./.test(s.toast), 'o aviso: ' + s.toast);
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(500);
    await foto('13a-cena');
    // quem joga não vê os marcadores
    const vis = await ev(() => { const u = __tc, sc = u.Store.scene(); u.Store.S.players = [{ id: 'p1', name: 'Dalmo', color: '#4fb8e0' }]; u.UI.setViewer('p1'); const r = sc.tokens.filter(x => x.prop === 'interesse' || x.prop === 'chegada').map(x => u.tokShown(x, sc)); u.UI.setViewer('gm'); return r; });
    ok(vis.length >= 2 && vis.every(v => v === false), 'quem joga não vê os marcadores (a chegada e os pontos)');
    const mao = await ev(() => { const u = __tc, sc = u.Store.scene(); return [u.Props.novo(sc, 'interesse', 0, 0).hidden, u.Props.P.interesse.n, u.Props.P.interesse.g]; });
    ok(j(mao) === j([true, 'Ponto de interesse', 'perigo']), 'posto à mão (pela paleta, nos marcos), o ponto de interesse também nasce oculto: ' + j(mao));
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
