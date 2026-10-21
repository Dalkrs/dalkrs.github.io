// Lote 13, parte 13c: as estações, a história do lugar e os achados raros (a página das Cenas sozinha, no navegador).
//   · (SO=estacoes) a lista e as regras (os chãos que têm estação); o verão é o lugar de sempre (o plano e o desenho
//     iguais aos de sem estação, nos cinco lugares de fora); na primavera e no outono, o mesmo lugar (só a marca da
//     estação); no inverno, a água parada e rasa congela (o lago, a segunda demão, as casas, a fundura, a zona Gelado; a
//     poça do pântano e a lama; o pântano inteiro) e o rio, o mar, a fonte quente, a lava e o oásis do deserto não; o
//     desenho (as estações pintam diferente; o deserto no inverno pinta igual; a mancha de um bioma sem estação fica como
//     era); o resumo;
//   · (SO=historia) a história do lugar: cada uma com o que tem de seu, longe do meio da situação e fora do caminho; só a
//     área dela muda; as quatro juntas, longe umas das outras; sem lugar, o resumo diz; os marcadores na cena;
//   · (SO=achados) os achados raros: uma em cada quatro cenas (a semente decide), os cinco, longe do meio; sem pedir, nunca;
//     só o lugar dele muda; o marcador oculto na cena; na Região livre também;
//   · (SO=janela) a Estação na janela (nos lugares de fora; lembrada; no modelo; vinda do Mapa-múndi), a História do
//     lugar (caixas, várias juntas; lembrada; no modelo; o modelo de antes sem ela) e os Achados raros; a cena criada.
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

  // ================= as estações =================
  if (parte('estacoes')) {
    const r = await ev(() => {
      const u = __tc, ES = u.Estacoes, M = u.Encontro.motor, out = {};
      const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i += 7) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
      const sem = p => { const q = JSON.parse(JSON.stringify(p)); delete q.estacao; delete q.estacaoMuda; delete q.gelos; return JSON.stringify(q); };
      out.lista = ES.LISTA.map(e => e[0]);
      out.valida = [ES.valida('outono'), ES.valida('x'), ES.valida()];
      out.tem = { campo: ES.LISTA.map(e => ES.tem('campo', e[0])), areia: ES.LISTA.map(e => ES.tem('areia', e[0])), tundra: ES.LISTA.map(e => ES.tem('tundra', e[0])), corrompida: ES.LISTA.map(e => ES.tem('corrompida', e[0])), neve: ES.LISTA.map(e => ES.tem('neve', e[0])) };
      // os cinco lugares de fora: o verão é o de sempre; na primavera e no outono, o mesmo lugar (só a estação marcada)
      const G = [
        ['enc1', o => u.Encontro.gerar(Object.assign({ terreno: 'floresta', situacao: 'clareira', seed: 3, rioDe: 'n', lago: true }, o))],
        ['enc2', o => u.Encontro.gerar(Object.assign({ terreno: 'campo', situacao: 'moinho', seed: 4, chao: 2, mistura: 'muita', rioDe: 'o' }, o))],
        ['reg', o => u.Regiao.gerar(Object.assign({ bioma: 'pantano', seed: 5, agua: 'lago' }, o))],
        ['tri', o => u.Tribo.gerar(Object.assign({ terreno: 'campo', seed: 6 }, o))],
        ['rui', o => u.Ruinas.gerar(Object.assign({ terreno: 'floresta', tipo: 'templo', seed: 7 }, o))],
        ['por', o => u.Porto.gerar(Object.assign({ terreno: 'campo', seed: 8 }, o))],
      ];
      out.verao = {}; out.mesmo = {}; out.marca = {};
      for (const [k, f] of G) {
        const p0 = f({}), pv = f({ estacao: 'verao' }), pp = f({ estacao: 'primavera' }), po = f({ estacao: 'outono' }), pi = f({ estacao: 'inverno' });
        out.verao[k] = JSON.stringify(p0) === JSON.stringify(pv) && !('estacao' in p0);
        out.mesmo[k] = sem(pp) === JSON.stringify(p0) && sem(po) === JSON.stringify(p0);
        out.marca[k] = [pp.estacao, po.estacao, pi.estacao, pi.estacaoMuda];
      }
      // no inverno: o lago congela (o tipo, a segunda demão, as casas, a fundura, a zona); o rio, não
      {
        const p0 = u.Encontro.gerar({ terreno: 'floresta', situacao: 'clareira', seed: 3, chao: 2, rioDe: 'n', lago: true }), p = u.Encontro.gerar({ terreno: 'floresta', situacao: 'clareira', seed: 3, chao: 2, rioDe: 'n', lago: true, estacao: 'inverno' });
        const L0 = p0.aguas.filter(a => a.k === 'lago' && a.tipo === 'agua'), L = p.aguas.filter(a => a.k === 'lago');
        const casas = l => { const c = []; for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) if (M.dentroPoli(l.pts, x + 0.5, y + 0.5)) c.push(p.occ[y * p.W + x]); return c; };
        out.lago = {
          antes: L0.length, gelo: L.filter(a => a.tipo === 'gelo').length, agua: L.filter(a => a.tipo === 'agua').length,
          casas: L.filter(a => a.tipo === 'gelo').every(l => casas(l).every(v => v !== 2)),
          demao: p.pintados.filter(q => q.k === 'aguaParada' && q.semBeira).every(q => q.tipo === 'gelo'),
          fundura: L.filter(a => a.tipo === 'gelo').every(l => !p.relevo.some(rr => rr.t === 'agua' && rr.k === 'poly' && JSON.stringify(rr.pts) === JSON.stringify(l.pts))),
          zona: L.filter(a => a.tipo === 'gelo').every(l => p.zonas.some(z => z.fx === 'gelado' && M.dentroPoli(l.pts, z.x, z.y))),
          rio: p.aguas.filter(a => a.k === 'rio').length > 0 && p.aguas.filter(a => a.k === 'rio').every(a => a.tipo === 'agua'),
          gelos: p.gelos, resumo: u.Encontro.resumo(p),
        };
      }
      // a Região: o lago congelado no resumo; as poças do pântano congelam e a lama delas some
      {
        const p0 = u.Regiao.gerar({ bioma: 'campo', seed: 9, agua: 'lago' }), p = u.Regiao.gerar({ bioma: 'campo', seed: 9, agua: 'lago', estacao: 'inverno' });
        out.regLago = [p0.lagos.map(l => l.tipo), p.lagos.map(l => l.tipo), /lago congelado/.test(u.Regiao.resumo(p)), /no inverno, com a água congelada/.test(u.Regiao.resumo(p))];
        let pocas = 0, geladas = 0, lama0 = 0, lama = 0;
        for (const s of [11, 12, 13, 14]) {
          const a = u.Regiao.gerar({ bioma: 'pantano', seed: s, agua: 'nenhuma' }), b = u.Regiao.gerar({ bioma: 'pantano', seed: s, agua: 'nenhuma', estacao: 'inverno' });
          pocas += a.aguas.filter(x => x.k === 'lago' && x.tipo === 'agua').length; geladas += b.aguas.filter(x => x.k === 'lago' && x.tipo === 'gelo').length;
          lama0 += a.zonas.filter(z => z.fx === 'lama').length; lama += b.zonas.filter(z => z.fx === 'lama').length;
        }
        out.pocas = { pocas, geladas, lama0, lama };
      }
      // o pântano inteiro: o gelo por todo o mapa, a zona cobrindo tudo, sem a lama
      {
        const p0 = u.Encontro.gerar({ terreno: 'pantano', situacao: 'ilhas', seed: 3 }), p = u.Encontro.gerar({ terreno: 'pantano', situacao: 'ilhas', seed: 3, estacao: 'inverno' });
        const z = p.zonas.filter(x => x.fx === 'gelado');
        out.pantano = { tipo: p.aguaToda.tipo, tipo0: p0.aguaToda.tipo, cobre: z.some(x => x.r >= Math.hypot(p.W, p.H) / 2), lama: p.zonas.filter(x => x.fx === 'lama').length, lama0: p0.zonas.filter(x => x.fx === 'lama').length };
      }
      // o que não congela: o mar, a fonte quente, a lava, o oásis do deserto; e o lago que já era gelo fica gelo
      {
        const tipos = p => p.aguas.filter(a => a.k === 'lago').map(a => a.tipo).sort().join(',');
        const casos = [{ terreno: 'costa', situacao: 'enseada', seed: 3 }, { terreno: 'tundra', situacao: 'fontes', seed: 3 }, { terreno: 'lava', situacao: 'rio', seed: 3, lago: true, rioDe: 'n' }, { terreno: 'deserto', situacao: 'oasis', seed: 3 }, { terreno: 'neve', situacao: 'lago', seed: 3 }];
        out.naoCongela = casos.map(o => tipos(u.Encontro.gerar(o)) === tipos(u.Encontro.gerar(Object.assign({ estacao: 'inverno' }, o))));
        out.oasisMuda = u.Encontro.gerar({ terreno: 'deserto', situacao: 'oasis', seed: 3, estacao: 'inverno' }).estacaoMuda;
        out.oasisResumo = u.Encontro.resumo(u.Encontro.gerar({ terreno: 'deserto', situacao: 'oasis', seed: 3, estacao: 'inverno' }));
      }
      // o desenho: o verão igual ao de sem estação; as outras, diferentes; o deserto no inverno, igual
      {
        const pinta = p => fnv(M.pintar(p, 10).toDataURL());
        const base = { terreno: 'floresta', situacao: 'clareira', seed: 5, chao: 2, tamanho: 'pequeno' };
        const h0 = pinta(u.Encontro.gerar(base)), hs = ES.LISTA.map(e => pinta(u.Encontro.gerar(Object.assign({ estacao: e[0] }, base))));
        out.pintura = { verao: hs[1] === h0, outras: [hs[0], hs[2], hs[3]].every(x => x !== h0) && new Set(hs).size === 4 };
        const d = { terreno: 'deserto', situacao: 'dunas', seed: 5, tamanho: 'pequeno' };
        out.desertoIgual = pinta(u.Encontro.gerar(d)) === pinta(u.Encontro.gerar(Object.assign({ estacao: 'inverno' }, d)));
        out.outrosPintam = [u.Tribo.gerar({ terreno: 'campo', seed: 6 }), u.Ruinas.gerar({ terreno: 'campo', tipo: 'torre', seed: 7, tamanho: 'pequeno' }), u.Porto.gerar({ terreno: 'floresta', seed: 8, tamanho: 'pequeno' })].map((p, i) => {
          const L = [u.Tribo, u.Ruinas, u.Porto][i], o = [{ terreno: 'campo', seed: 6 }, { terreno: 'campo', tipo: 'torre', seed: 7, tamanho: 'pequeno' }, { terreno: 'floresta', seed: 8, tamanho: 'pequeno' }][i];
          return pinta(p) !== pinta(L.gerar(Object.assign({ estacao: 'inverno' }, o)));
        });
      }
      // a zona Gelado cobre o lago congelado (quase todas as casas dele)
      {
        const cob = p => p.aguas.filter(a => a.k === 'lago' && a.tipo === 'gelo').map(l => {
          let n0 = 0, n1 = 0;
          for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) { if (!M.dentroPoli(l.pts, x + 0.5, y + 0.5)) continue; n0++; if (p.zonas.some(z => z.fx === 'gelado' && Math.hypot(z.x - x - 0.5, z.y - y - 0.5) <= z.r)) n1++; }
          return +(n1 / Math.max(1, n0)).toFixed(2);
        });
        out.cobertura = [].concat(cob(u.Encontro.gerar({ terreno: 'floresta', situacao: 'clareira', seed: 3, chao: 2, rioDe: 'n', lago: true, estacao: 'inverno' })), cob(u.Regiao.gerar({ bioma: 'campo', seed: 9, agua: 'lago', estacao: 'inverno' })), cob(u.Regiao.gerar({ bioma: 'floresta', seed: 4, agua: 'lago', estacao: 'inverno', tamanho: 'grande' })));
      }
      // o desenho de perto: as copas do outono quentes, as do inverno com neve, as da primavera floridas; a neve nas
      // pedras, nos telhados e nos penhascos
      {
        const c = 10, img = p => { const cv = M.pintar(p, c); return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); };
        const at = (im, x, y) => { const i = (Math.floor(y) * im.width + Math.floor(x)) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
        const luz = ([r, g, b]) => (r + g + b) / 3;
        const base = { terreno: 'floresta', situacao: 'clareira', seed: 5, chao: 2, tamanho: 'pequeno' };
        const ps = {}; for (const e of ES.LISTA) ps[e[0]] = u.Encontro.gerar(Object.assign({ estacao: e[0] }, base));
        const im = {}; for (const k in ps) im[k] = img(ps[k]);
        const folhosas = ps.verao.arvores.filter(a => (!a.esp || a.esp === 'folhosa') && ES.tem(a.pal || ps.verao.pal, 'outono'));
        const amostras = a => { const o = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) o.push([(a.x + dx * a.r * 0.18) * c, (a.y + dy * a.r * 0.18) * c]); return o; };
        const frac = (m, f) => +(folhosas.filter(a => amostras(a).some(([x, y]) => f(at(m, x, y)))).length / Math.max(1, folhosas.length)).toFixed(2);
        const quente = ([r, g, b]) => r > g + 25 && r > b + 40, branco = ([r, g, b]) => r > 225 && g > 230 && b > 232, flor = ([r, g, b]) => r > 225 && g > 140 && b > 160 && (r - g > 25 || g > 238);
        out.copas = { n: folhosas.length, quenteV: frac(im.verao, quente), quenteO: frac(im.outono, quente), brancoV: frac(im.verao, branco), brancoI: frac(im.inverno, branco), florV: frac(im.verao, flor), florP: frac(im.primavera, flor) };
        const po = { terreno: 'campo', seed: 8, tamanho: 'pequeno' }, pv = u.Porto.gerar(po), pi = u.Porto.gerar(Object.assign({ estacao: 'inverno' }, po)), iv = img(pv), ii = img(pi);
        const tel = pv.predios.filter(k => !k.aberto);
        out.telhados = { n: tel.length, mais: +(tel.filter(k => luz(at(ii, (k.x + k.w / 2) * c, (k.y + k.h / 2) * c)) - luz(at(iv, (k.x + k.w / 2) * c, (k.y + k.h / 2) * c)) >= 30).length / Math.max(1, tel.length)).toFixed(2) };
        const mo = { terreno: 'montanha', situacao: 'desfiladeiro', seed: 5, tamanho: 'pequeno' }, mv = u.Encontro.gerar(mo), mi = u.Encontro.gerar(Object.assign({ estacao: 'inverno' }, mo)), jv = img(mv), ji = img(mi);
        const pen = mv.massas.map(m => u.Paisagem.centro(m.pts)).filter(([x, y]) => M.dentroPoli(mv.massas.find(m => M.dentroPoli(m.pts, x, y)) ? mv.massas.find(m => M.dentroPoli(m.pts, x, y)).pts : [[0, 0]], x, y));
        out.penhascos = { n: pen.length, mais: +(pen.filter(([x, y]) => luz(at(ji, x * c, y * c)) - luz(at(jv, x * c, y * c)) >= 20).length / Math.max(1, pen.length)).toFixed(2) };
        // (as pedras da montanha: a capa de neve em cima de cada uma, menos das que uma árvore cobre)
        const pedras = mv.rochas.filter(r => !r.grande && !mv.arvores.some(a => Math.hypot(a.x - r.x, a.y - r.y) < a.r + r.r));
        const capa = m => +(pedras.filter(r => branco(at(m, (r.x - r.r * 0.1) * c, (r.y - r.r * 0.38) * c))).length / Math.max(1, pedras.length)).toFixed(2);
        out.pedras = { n: pedras.length, verao: capa(jv), inverno: capa(ji) };
      }
      // a mancha de um bioma sem estação (o deserto, a savana) no meio de um com estação: no inverno, igual por dentro
      const manchaSem = sit => {
        let achou = null;
        for (let s = 1; s <= 60 && !achou; s++) {
          const o = { terreno: 'campo', situacao: sit, seed: s, chao: 2, mistura: 'muita', tamanho: 'grande' }, p = u.Encontro.gerar(o);
          const b = (p.biomas || []).find(x => ['deserto', 'savana'].includes(x.id) && !ES.tem(x.pal, 'inverno'));
          if (!b) continue;
          // a casa mais funda da mancha (longe da beira), sem árvore nem pedra perto
          let melhor = null;
          for (let y = 1; y < p.H - 1; y++) for (let x = 1; x < p.W - 1; x++) {
            const cx = x + 0.5, cy = y + 0.5;
            if (!b.pts.some(pts => M.dentroPoli(pts, cx, cy))) continue;
            let dmin = Infinity;
            for (const pts of b.pts) for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; dmin = Math.min(dmin, M.distLinha([a, c], cx, cy)); }
            if (p.arvores.some(a => Math.hypot(a.x - cx, a.y - cy) < a.r + 1) || p.rochas.some(rr => Math.hypot(rr.x - cx, rr.y - cy) < rr.r + 1) || p.objetos.some(q => Math.hypot(q.x + 0.5 - cx, q.y + 0.5 - cy) < 1.5)) continue;
            if (!melhor || dmin > melhor.d) melhor = { x: cx, y: cy, d: dmin };
          }
          if (melhor && melhor.d >= 3) achou = { o, x: melhor.x, y: melhor.y, d: melhor.d };
        }
        if (!achou) return null;
        const cor = p => { const cv = M.pintar(p, 10), g = cv.getContext('2d'), d = g.getImageData(Math.floor(achou.x * 10), Math.floor(achou.y * 10), 1, 1).data; return [d[0], d[1], d[2]]; };
        const a = cor(u.Encontro.gerar(achou.o)), b = cor(u.Encontro.gerar(Object.assign({ estacao: 'inverno' }, achou.o)));
        return { pal: u.Encontro.gerar(achou.o).pal, d: +achou.d.toFixed(1), dif: Math.max(...a.map((v, i) => Math.abs(v - b[i]))) };
      };
      // (o capim alto é savana, sem estação, com manchas que têm; o moinho e o morro são campo, com manchas que não têm)
      out.mancha = [manchaSem('capim'), manchaSem('moinho') || manchaSem('morro')];
      // o pântano congelado: a água vira gelo claro no desenho
      {
        const pinta = p => { const cv = M.pintar(p, 10); return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height); };
        const o = { terreno: 'pantano', situacao: 'ilhas', seed: 3 }, pv = u.Encontro.gerar(o), pi = u.Encontro.gerar(Object.assign({ estacao: 'inverno' }, o)), iv = pinta(pv), ii = pinta(pi);
        let soma = 0, n0 = 0;
        for (let y = 1; y < pv.H - 1; y++) for (let x = 1; x < pv.W - 1; x++) {
          if (pv.occ[y * pv.W + x] !== 2 || pv.chao.some(m => M.dentroPoli(m.pts, x + 0.5, y + 0.5)) || pv.arvores.some(a => Math.hypot(a.x - x - 0.5, a.y - y - 0.5) < a.r + 0.5) || pv.aguas.some(a => a.k === 'rio' && M.distLinha(a.pts, x + 0.5, y + 0.5) < a.hw + 0.6)) continue;
          const i = ((y * 10 + 5) * iv.width + x * 10 + 5) * 4, l = k => (k.data[i] + k.data[i + 1] + k.data[i + 2]) / 3;
          soma += l(ii) - l(iv); n0++;
        }
        out.geloRaso = { n: n0, mais: +(soma / Math.max(1, n0)).toFixed(1) };
      }
      return out;
    });
    ok(j(r.lista) === j(['primavera', 'verao', 'outono', 'inverno']) && j(r.valida) === j(['outono', 'verao', 'verao']), 'as quatro estações (o verão de começo): ' + j([r.lista, r.valida]));
    ok(j(r.tem.campo) === j([true, false, true, true]) && r.tem.areia.every(x => !x) && r.tem.neve.every(x => !x) && j(r.tem.tundra) === j([false, false, false, true]) && j(r.tem.corrompida) === j([false, false, false, true]), 'os chãos com estação: o campo nas três (o verão é o de sempre); o deserto e a neve, nenhuma; a tundra e a terra corrompida, só o inverno: ' + j(r.tem));
    ok(Object.values(r.verao).every(Boolean), 'no verão, o lugar de sempre (o mesmo plano de sem estação) nos cinco lugares de fora: ' + j(r.verao));
    ok(Object.values(r.mesmo).every(Boolean), 'na primavera e no outono, o mesmo lugar (só a estação marcada): ' + j(r.mesmo));
    ok(Object.values(r.marca).every(m => m[0] === 'primavera' && m[1] === 'outono' && m[2] === 'inverno' && m[3] === true), 'a estação fica marcada no plano (e muda o lugar: o chão tem estação): ' + j(r.marca));
    const L = r.lago;
    ok(L.antes >= 1 && L.gelo === L.antes && L.agua === 0 && L.casas && L.demao && L.fundura && L.zona, 'no inverno, o lago congela: o gelo, a segunda demão, as casas de andar, sem a fundura, com a zona Gelado: ' + j(L));
    ok(L.rio && L.gelos >= 1 && /no inverno, com a água congelada/.test(L.resumo), 'o rio corre (não congela); o resumo diz: ' + j([L.rio, L.gelos, L.resumo]));
    ok(j(r.regLago[0]) === j(['agua']) && j(r.regLago[1]) === j(['gelo']) && r.regLago[2] && r.regLago[3], 'na Região livre, o lago congelado (e o resumo diz): ' + j(r.regLago));
    ok(r.pocas.pocas >= 2 && r.pocas.geladas === r.pocas.pocas && r.pocas.lama0 > r.pocas.lama, 'as poças do pântano congelam, e a lama delas some: ' + j(r.pocas));
    ok(r.pantano.tipo0 === 'agua' && r.pantano.tipo === 'gelo' && r.pantano.cobre && r.pantano.lama === 0, 'o pântano inteiro congela: o gelo, a zona cobrindo tudo, sem a lama: ' + j(r.pantano));
    ok(r.naoCongela.every(Boolean), 'não congelam: o mar, a fonte quente, a lava, o oásis do deserto; o lago de gelo fica gelo: ' + j(r.naoCongela));
    ok(r.oasisMuda === false && /no inverno \(este chão não muda com a estação\)/.test(r.oasisResumo), 'no deserto a estação não muda nada (e o resumo diz): ' + j([r.oasisMuda, r.oasisResumo]));
    ok(r.pintura.verao && r.pintura.outras, 'o desenho: o verão igual ao de sem estação; a primavera, o outono e o inverno, cada um diferente: ' + j(r.pintura));
    ok(r.desertoIgual, 'o deserto no inverno pinta igual ao do verão');
    ok(r.outrosPintam.every(Boolean), 'a Tribo, as Ruínas e o Porto pintam o inverno: ' + j(r.outrosPintam));
    ok(r.mancha[0] && r.mancha[0].dif <= 2 && r.mancha[1] && r.mancha[1].pal === 'campo' && r.mancha[1].dif <= 2, 'a mancha de um bioma sem estação (no inverno) fica como era por dentro — no chão sem estação e no com: ' + j(r.mancha));
    ok(r.geloRaso.n >= 30 && r.geloRaso.mais >= 105, 'o pântano congelado: a água vira gelo claro no desenho: ' + j(r.geloRaso));
    ok(r.cobertura.length >= 3 && r.cobertura.every(x => x >= 0.85), 'a zona Gelado cobre o lago congelado: ' + j(r.cobertura));
    const C = r.copas;
    ok(C.n >= 8 && C.quenteV <= 0.1 && C.quenteO >= 0.6, 'no outono, as copas amarelas, laranja e vermelhas: ' + j(C));
    ok(C.brancoV <= 0.05 && C.brancoI >= 0.6, 'no inverno, a neve nas copas: ' + j(C));
    ok(C.florV <= 0.02 && C.florP >= 0.06, 'na primavera, parte das árvores florida: ' + j(C));
    ok(r.pedras.n >= 5 && r.pedras.verao <= 0.05 && r.pedras.inverno >= 0.3, 'no inverno, a neve em cima das pedras: ' + j(r.pedras));
    ok(r.telhados.n >= 3 && r.telhados.mais >= 0.7, 'no inverno, a neve nos telhados (o Porto): ' + j(r.telhados));
    ok(r.penhascos.n >= 1 && r.penhascos.mais >= 0.7, 'no inverno, a neve no alto dos penhascos (a montanha): ' + j(r.penhascos));
  }

  // ================= a história do lugar =================
  if (parte('historia')) {
    const r = await ev(() => {
      const u = __tc, H = u.Historia, M = u.Encontro.motor, out = {};
      out.lista = H.LISTA.map(x => x[0]);
      out.valida = [H.valida(['ruinas', 'x', 'batalha']), H.valida('batalha'), H.valida()];
      const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const G = { enc: o => u.Encontro.gerar(Object.assign({ terreno: 'floresta', situacao: 'clareira', chao: 2, tamanho: 'grande' }, o)), reg: o => u.Regiao.gerar(Object.assign({ bioma: 'floresta', tamanho: 'grande' }, o)) };
      const tem = {
        batalha: p => { const a = p.pintados.find(q => q.k === 'armasVelhas'); return !!a && a.itens.length >= 4 && p.objetos.some(o => o.id === 'tumulo') && p.pintados.some(q => q.k === 'estandarteRasgado') && p.pintados.some(q => q.k === 'ossos'); },
        acampamento: p => p.pintados.some(q => q.k === 'fogueiraApagada') && p.pintados.some(q => q.k === 'tenda' && q.rasgada) && p.objetos.some(o => o.id === 'caixote' || o.id === 'barril'),
        incendio: p => p.chao.some(m => m.cores[0] === '#2e2924') && p.arvores.filter(a => a.esp === 'queimada').length >= 3,
        ruinas: p => p.pintados.some(q => q.k === 'lajes') && p.pintados.filter(q => q.k === 'paredeRuina').length >= 2 && (p.paredes || []).length >= 2,
      };
      out.cada = {}; out.longe = {}; out.area = {}; out.fora = {};
      for (const [g, f] of Object.entries(G)) for (const k of out.lista) for (const s of [3, 4]) {
        const p0 = f({ seed: s }), p = f({ seed: s, historia: [k] }), h = (p.historia || [])[0], kk = g + '.' + k + '#' + s;
        out.cada[kk] = !!h && h.k === k && tem[k](p);
        if (!h) continue;
        // longe do meio da situação (no Encontro) e fora do caminho e do que ela usa
        out.longe[kk] = g === 'reg' || dist([h.cx, h.cy], p.foco) >= Math.hypot(p.W, p.H) * 0.08;
        let ruim = 0;
        for (let y = Math.floor(h.cy - h.R); y <= h.cy + h.R; y++) for (let x = Math.floor(h.cx - h.R); x <= h.cx + h.R; x++) {
          if (x < 0 || y < 0 || x >= p.W || y >= p.H || Math.hypot(x + 0.5 - h.cx, y + 0.5 - h.cy) > h.R) continue;
          const v = p0.occ[y * p.W + x]; if (v !== 0 && v !== 4) ruim++;
        }
        out.fora[kk] = ruim;
        // (a área fica limpa: as árvores da vegetação saem — no incêndio, só as queimadas ficam)
        out.limpa = out.limpa || {};
        out.limpa[kk] = p.arvores.filter(a => a.esp !== 'queimada' && Math.hypot(a.x - h.cx, a.y - h.cy) < h.R).length === 0;
        // só a área dela muda: as árvores, as pedras e os objetos longe dela são os mesmos
        const longe = q => Math.hypot(q.x - h.cx, q.y - h.cy) > h.R + 1.5;
        const mesmo = (a, b) => JSON.stringify(a.filter(longe)) === JSON.stringify(b.filter(longe));
        out.area[kk] = mesmo(p0.arvores, p.arvores) && mesmo(p0.rochas, p.rochas) && mesmo(p0.objetos.map(o => Object.assign({}, o, { x: o.x + 0.5, y: o.y + 0.5 })), p.objetos.map(o => Object.assign({}, o, { x: o.x + 0.5, y: o.y + 0.5 })));
      }
      // as quatro juntas, longe umas das outras
      out.juntas = [];
      for (const [g, f] of Object.entries(G)) for (const s of [5, 6]) {
        const p = f({ seed: s, historia: out.lista }), hs = p.historia || [];
        let dmin = Infinity; for (let a = 0; a < hs.length; a++) for (let b = a + 1; b < hs.length; b++) dmin = Math.min(dmin, dist([hs[a].cx, hs[a].cy], [hs[b].cx, hs[b].cy]) - hs[a].R - hs[b].R);
        out.juntas.push({ g, s, n: hs.length, dmin: +dmin.toFixed(1), resumo: (g === 'enc' ? u.Encontro : u.Regiao).resumo(p) });
      }
      // no mapa pequeno, a história encolhe para caber
      {
        const R0 = { ruinas: 3.4, incendio: 3.6, batalha: 2.8, acampamento: 2.4 };
        let menor = 0, total = 0;
        for (let s = 1; s <= 12; s++) for (const ter of ['floresta', 'campo']) { const p = u.Encontro.gerar({ terreno: ter, situacao: ter === 'campo' ? 'moinho' : 'acampamento', seed: s, chao: 2, tamanho: 'pequeno', historia: out.lista }); for (const h of p.historia || []) { total++; if (h.R < R0[h.k] - 0.01) menor++; } }
        out.encolhe = { menor, total };
      }
      // a árvore queimada do incêndio antigo não tem as brasas da carbonizada
      {
        const brasas = esp => { const cv = document.createElement('canvas'); cv.width = cv.height = 60; const g = cv.getContext('2d'); let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; u.Paisagem.arvore(g, { x: 3, y: 3, r: 2.4 }, 10, rnd, esp, 'floresta', false); const d = g.getImageData(0, 0, 60, 60).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] > 90 && d[i + 1] < 170 && d[i + 2] < 110 && d[i + 3] > 100) n++; return n; };
        out.brasas = { carbonizada: brasas('carbonizada'), queimada: brasas('queimada') };
      }
      // sem pedir, nada muda; sem lugar (o capim alto toma o mapa pequeno), o resumo diz
      out.semPedir = JSON.stringify(G.enc({ seed: 3 })) === JSON.stringify(G.enc({ seed: 3, historia: [] })) && JSON.stringify(G.reg({ seed: 3 })) === JSON.stringify(G.reg({ seed: 3, historia: [] }));
      {
        let fora = null;
        for (let s = 1; s <= 30 && !fora; s++) { const p = u.Encontro.gerar({ terreno: 'campo', situacao: 'capim', seed: s, chao: 2, tamanho: 'pequeno', historia: out.lista }); if (p.historiaFora && p.historiaFora.length) fora = { s, fora: p.historiaFora, resumo: u.Encontro.resumo(p) }; }
        out.semLugar = fora;
      }
      // na água e na gruta, não há onde
      out.agua = !('historia' in u.Encontro.gerar({ terreno: 'agua', situacao: 'navio', seed: 3, historia: ['batalha'] })) && !('historia' in u.Encontro.gerar({ terreno: 'cristais', situacao: 'gruta', seed: 3, chao: 2, historia: ['batalha'] }));
      return out;
    });
    ok(j(r.lista) === j(['batalha', 'acampamento', 'incendio', 'ruinas']) && j(r.valida) === j([['batalha', 'ruinas'], [], []]), 'as quatro histórias: ' + j([r.lista, r.valida]));
    ok(Object.values(r.cada).every(Boolean), 'cada história com o que tem de seu (as armas, o túmulo, o estandarte e os ossos; a fogueira fria, a tenda rasgada e as caixas; o chão queimado e as árvores carbonizadas; as lajes e os pedaços de parede), no Encontro e na Região: ' + j(r.cada));
    ok(Object.values(r.longe).every(Boolean), 'longe do meio da situação: ' + j(r.longe));
    ok(Object.values(r.fora).every(v => v === 0), 'fora do caminho, da água e do que a situação usa: ' + j(r.fora));
    ok(Object.values(r.area).every(Boolean), 'só a área dela muda (as árvores, as pedras e os enfeites longe dela ficam iguais): ' + j(r.area));
    ok(Object.values(r.limpa).every(Boolean), 'a área fica limpa (as árvores da vegetação saem; no incêndio, só as queimadas ficam): ' + j(r.limpa));
    ok(r.encolhe.total >= 10 && r.encolhe.menor >= 1, 'no mapa pequeno, a história encolhe para caber: ' + j(r.encolhe));
    ok(r.brasas.carbonizada > 0 && r.brasas.queimada === 0, 'a árvore queimada de um incêndio antigo, sem as brasas: ' + j(r.brasas));
    ok(r.juntas.every(x => x.n === 4 && x.dmin >= 0 && /a história: ruínas pequenas, incêndio antigo, batalha antiga e acampamento abandonado/.test(x.resumo)), 'as quatro juntas, cada uma no seu lugar (o resumo diz): ' + j(r.juntas));
    ok(r.semPedir, 'sem pedir a história, o lugar de sempre');
    ok(r.semLugar && /sem lugar para/.test(r.semLugar.resumo), 'sem lugar (a situação ocupa o mapa), o resumo diz: ' + j(r.semLugar));
    ok(r.agua, 'na água e na gruta dos cristais, não há onde');
    // na cena: os marcadores ocultos, com o nome
    const c = await ev(async () => {
      const p = __tc.Encontro.gerar({ terreno: 'floresta', situacao: 'clareira', chao: 2, tamanho: 'grande', seed: 5, historia: ['batalha', 'ruinas'] });
      const sc = await __tc.Encontro.criar(p, 'Teste da história', { hora: 'dia', relevo: true });
      return { nomes: sc.tokens.filter(t => t.prop === 'interesse').map(t => [t.name, t.hidden]), paredes: sc.walls.length, hist: p.historia.map(h => h.n) };
    });
    ok(c.nomes.length === 2 && c.nomes.every(([nm, hid]) => hid && c.hist.includes(nm)) && c.paredes > 0, 'na cena: o marcador oculto de cada história, com o nome; as paredes das ruínas: ' + j(c));
  }

  // ================= os achados raros =================
  if (parte('achados')) {
    const r = await ev(() => {
      const u = __tc, out = { n: 0, tipos: {}, longe: true, mesmo: true, coisa: {}, nada: 0, area: true };
      const tem = {
        bau: p => p.objetos.some(o => o.id === 'bau'), altar: p => p.objetos.some(o => o.id === 'altar'), runa: p => p.objetos.some(o => o.id === 'runa'),
        arvore: p => p.arvores.some(a => a.r >= 1.9 && Math.hypot(a.x - p.achado.cx, a.y - p.achado.cy) < 0.1),
        esqueleto: p => p.pintados.some(q => q.k === 'esqueleto') && p.pintados.some(q => q.k === 'bolsa'),
      };
      for (let s = 1; s <= 200; s++) {
        const o = { terreno: 'campo', situacao: 'capim', seed: s, chao: 2 }, p = u.Encontro.gerar(Object.assign({ achados: true }, o));
        if (!p.achado) { if (s <= 60 && JSON.stringify(p) !== JSON.stringify(u.Encontro.gerar(o))) out.mesmo = false; continue; }
        out.n++; out.tipos[p.achado.k] = (out.tipos[p.achado.k] || 0) + 1;
        out.coisa[p.achado.k] = (out.coisa[p.achado.k] !== false) && tem[p.achado.k](p);
        if (Math.hypot(p.achado.cx - p.W / 2, p.achado.cy - p.H / 2) < Math.hypot(p.W, p.H) * 0.3 * 0.45) out.longe = false;
        out.bemLonge = (out.bemLonge || 0) + (Math.hypot(p.achado.cx - p.W / 2, p.achado.cy - p.H / 2) >= Math.hypot(p.W, p.H) * 0.3 ? 1 : 0);
        // (o lugar dele limpo: nenhuma árvore da vegetação colada nele — a árvore antiga é a dele)
        if (p.arvores.some(a => Math.hypot(a.x - p.achado.cx, a.y - p.achado.cy) < (p.achado.k === 'arvore' ? 2.2 : 1.2) && Math.hypot(a.x - p.achado.cx, a.y - p.achado.cy) > 0.05)) out.sujo = (out.sujo || 0) + 1;
        if (s <= 60) {
          const p0 = u.Encontro.gerar(o), longe = q => Math.hypot(q.x - p.achado.cx, q.y - p.achado.cy) > p.achado.R + 1.5;
          if (JSON.stringify(p0.arvores.filter(longe)) !== JSON.stringify(p.arvores.filter(longe))) out.area = false;
        }
      }
      for (let s = 1; s <= 60; s++) if (u.Encontro.gerar({ terreno: 'campo', situacao: 'capim', seed: s, chao: 2 }).achado || u.Encontro.gerar({ terreno: 'campo', situacao: 'capim', seed: s, chao: 2, achados: false }).achado) out.nada++;
      // na Região livre também (a mesma semente, a mesma sorte)
      out.reg = 0; for (let s = 1; s <= 80; s++) if (u.Regiao.gerar({ bioma: 'floresta', seed: s, achados: true }).achado) out.reg++;
      out.resumo = u.Encontro.resumo(u.Encontro.gerar({ terreno: 'campo', situacao: 'capim', seed: 2, chao: 2, achados: true }));
      return out;
    });
    ok(r.n >= 30 && r.n <= 70, 'um achado em cada quatro cenas, mais ou menos (a semente decide): ' + r.n + ' em 200');
    ok(Object.keys(r.tipos).length === 5, 'os cinco achados (o baú, o altar, a árvore antiga, a pedra rúnica, o esqueleto com a bolsa): ' + j(r.tipos));
    ok(Object.values(r.coisa).every(Boolean), 'cada achado com o que é: ' + j(r.coisa));
    ok(r.longe && r.bemLonge >= r.n * 0.8, 'longe do meio do mapa (quase todos a três décimos da diagonal ou mais): ' + j([r.bemLonge, r.n]));
    ok(!r.sujo, 'o lugar do achado fica limpo (sem árvore colada nele): ' + (r.sujo || 0));
    ok(r.mesmo && r.area, 'sem achado, o lugar de sempre; com ele, só o lugar dele muda');
    ok(r.nada === 0, 'sem pedir os achados (o modelo de antes), nunca: ' + r.nada);
    ok(r.reg >= 10 && r.reg <= 30, 'na Região livre também: ' + r.reg + ' em 80');
    ok(/um achado raro \(esqueleto com uma bolsa\)/.test(r.resumo), 'o resumo diz o achado: ' + r.resumo);
    const c = await ev(async () => {
      const p = __tc.Encontro.gerar({ terreno: 'campo', situacao: 'capim', seed: 26, chao: 2, achados: true });
      const sc = await __tc.Encontro.criar(p, 'Teste do achado', { hora: 'dia', relevo: true });
      return { a: sc.tokens.filter(t => t.prop === 'achado').map(t => [t.name, t.hidden]), bau: sc.tokens.some(t => t.prop === 'bau'), k: p.achado && p.achado.k };
    });
    ok(c.k === 'bau' && c.bau && c.a.length === 1 && c.a[0][1] === true && c.a[0][0] === 'Achado: baú escondido', 'na cena: o baú e o marcador oculto do achado, com o nome: ' + j(c));
  }

  // ================= a janela =================
  if (parte('janela')) {
    const G = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().estado)));
    const C = () => ev(() => JSON.parse(JSON.stringify(__tc.Gerador.vivo().comum)));
    const exato = async (grupo, txt) => { await page.locator(`#${grupo} button`).filter({ hasText: new RegExp('^' + txt + '$') }).click(); await w(500); };
    const abrir = async () => { await page.locator('#sceneBtn').click(); await w(200); await page.locator('.menu-i', { hasText: 'Gerar um lugar' }).click(); await w(700); };
    await abrir();
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(700);
    const segTxt = async id => (await page.locator('#' + id).innerText()).replace(/\n+/g, ' | ');
    ok(await segTxt('ger-estacao') === 'Primavera | Verão | Outono | Inverno' && await page.locator('#ger-estacao .seg-b.on').innerText() === 'Verão', 'a Estação na janela (de começo, o verão): ' + await segTxt('ger-estacao'));
    await exato('ger-estacao', 'Inverno');
    let g = await G();
    ok(g.plano.estacao === 'inverno' && (await C()).estacao === 'inverno' && await ev(() => __tc.App.opt.genEstacao) === 'inverno' && /no inverno/.test(await page.locator('#ger-resumo').innerText()), 'o inverno: no plano, lembrado, no resumo');
    // nos lugares de fora, sim; no Vilarejo, na Cidade e na Masmorra, não
    const temEst = {};
    for (const aba of ['Vilarejo', 'Cidade', 'Tribo', 'Região livre', 'Ruínas', 'Masmorra', 'Porto']) { await page.locator('#ger-lugar button', { hasText: aba }).click(); await w(600); temEst[aba] = await page.locator('#ger-estacao').count() === 1; }
    ok(j(temEst) === j({ Vilarejo: false, Cidade: false, Tribo: true, 'Região livre': true, 'Ruínas': true, Masmorra: false, Porto: true }), 'a Estação só nos lugares de fora: ' + j(temEst));
    g = await G();
    ok(g.plano.estacao === 'inverno', 'e ela vai junto (o Porto no inverno)');
    await page.locator('#ger-lugar button', { hasText: 'Encontro' }).click(); await w(700);
    // a história do lugar (caixas: várias juntas) e os achados
    ok(await segTxt('enc-hist') === 'Batalha antiga | Acampamento abandonado | Incêndio | Ruínas pequenas' && await page.locator('#enc-achados').isChecked(), 'a História do lugar (as quatro caixas) e os Achados raros (ligados de começo)');
    await exato('enc-ter', 'Floresta'); await exato('enc-tam', 'Grande');
    await page.locator('#enc-hist button', { hasText: 'Batalha antiga' }).click(); await w(500);
    await page.locator('#enc-hist button', { hasText: 'Incêndio' }).click(); await w(600);
    g = await G();
    ok(j(g.op.historia) === j(['batalha', 'incendio']) && (g.plano.historia || []).length === 2 && j(await ev(() => __tc.App.opt.encHist)) === j(['batalha', 'incendio']) && await page.locator('#enc-hist .seg-b.on').count() === 2, 'duas juntas: no estado, no plano e lembradas: ' + j([g.op.historia, (g.plano.historia || []).map(h => h.k)]));
    await foto('13c-janela', await page.locator('.modal').boundingBox());
    if (SHOTS) { await page.locator('#ger-estacao').scrollIntoViewIfNeeded(); await w(300); await foto('13c-janela-estacao', await page.locator('.modal').boundingBox()); }
    await page.locator('#enc-hist button', { hasText: 'Batalha antiga' }).click(); await w(500);
    g = await G();
    ok(j(g.op.historia) === j(['incendio']) && (g.plano.historia || []).length === 1, 'clicar de novo tira: ' + j(g.op.historia));
    await page.locator('.sw', { has: page.locator('#enc-achados') }).click(); await w(500);
    g = await G();
    ok(g.op.achados === false && !g.plano.achado && await ev(() => __tc.App.opt.encAchados) === false, 'os achados desligados: nunca');
    await page.locator('.sw', { has: page.locator('#enc-achados') }).click(); await w(400);
    // um modelo novo guarda a estação, a história e os achados; o de antes abre no verão, sem eles
    await page.locator('#ger-guardar').click(); await w(150);
    await page.locator('#ger-modelo-nome').fill('Floresta de inverno'); await page.keyboard.press('Enter'); await w(300);
    const mod = await ev(() => __tc.Store.S.prefs.modelos.find(m => m.nome === 'Floresta de inverno'));
    ok(mod && mod.o.estacao === 'inverno' && j(mod.o.historia) === j(['incendio']) && mod.o.achados === true, 'o modelo guarda a estação, a história e os achados: ' + j(mod && mod.o));
    await ev(() => { const S = __tc.Store.S; S.prefs.modelos = (S.prefs.modelos || []).concat([{ id: 'md_velho13c', nome: 'Floresta antiga', lugar: 'encontro', o: { terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', tamanho: 'medio', marcas: true, chao: 2, mistura: 'media', estilo: 'comum', hora: 'dia', clima: '', relevo: true }, seed: 77, trava: null }]); });
    await page.keyboard.press('Escape'); await w(400);
    await abrir();
    await page.locator('#ger-modelo').selectOption({ label: 'Floresta antiga · Encontro' }); await w(900);
    g = await G();
    const velho = await ev(() => JSON.stringify(__tc.Encontro.gerar({ terreno: 'floresta', situacao: 'clareira', caminho: 'trilha', tamanho: 'medio', marcas: true, chao: 2, mistura: 'media', estilo: 'comum', seed: 77 })));
    ok((await C()).estacao === 'verao' && j(g.op.historia) === j([]) && g.op.achados === false && j(g.plano) === velho, 'o modelo de antes: no verão, sem a história e sem os achados — o mesmo lugar de sempre');
    await page.locator('#ger-modelo').selectOption({ label: 'Floresta de inverno · Encontro' }); await w(900);
    g = await G();
    ok((await C()).estacao === 'inverno' && j(g.op.historia) === j(['incendio']) && g.op.achados === true && g.plano.estacao === 'inverno', 'o modelo novo abre como foi guardado');
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    // na água, sem a história e sem os achados
    await exato('enc-ter', 'Água');
    ok(await page.locator('#enc-hist').count() === 0 && await page.locator('#enc-achados').count() === 0, 'na água (e no pântano), sem a história e sem os achados');
    await exato('enc-ter', 'Pântano');
    ok(await page.locator('#enc-hist').count() === 0, 'no pântano também');
    await page.keyboard.press('Escape'); await w(400);
    // vindo do Mapa-múndi: a estação do calendário
    await ev(() => __tc.Gerador.abrir('encontro', { op: { terreno: 'campo', situacao: 'capim', caminho: 'trilha' }, estacao: 'outono' })); await w(900);
    g = await G();
    ok((await C()).estacao === 'outono' && g.plano.estacao === 'outono' && await page.locator('#ger-estacao .seg-b.on').innerText() === 'Outono', 'vindo do Mapa-múndi, a estação do calendário (o outono)');
    await page.keyboard.press('Escape'); await w(400);
    // a Região livre: a história e os achados também
    await abrir();
    await page.locator('#ger-lugar button', { hasText: 'Região livre' }).click(); await w(800);
    ok(await page.locator('#reg-hist').count() === 1 && await page.locator('#reg-achados').count() === 1, 'na Região livre, a História do lugar e os Achados raros');
    await page.locator('#reg-hist button', { hasText: 'Ruínas pequenas' }).click(); await w(700);
    g = await G();
    ok(j(g.op.historia) === j(['ruinas']) && (g.plano.historia || []).some(h => h.k === 'ruinas'), 'as ruínas pequenas na Região livre');
    // a cena criada: no inverno, com a história
    await exato('ger-estacao', 'Inverno');
    await page.locator('.modal .btn.primary', { hasText: 'Criar a cena' }).click(); await page.waitForFunction(() => !document.querySelector('.modal'), null, { timeout: 60000 }); await w(500);
    const sc = await ev(() => { const u = __tc, sc = u.Store.scene(); return { nome: sc.name, fundo: !!(sc.bg.asset && u.Store.S.assets[sc.bg.asset]), marc: sc.tokens.filter(t => t.prop === 'interesse' && t.hidden).map(t => t.name) }; });
    ok(sc.fundo && sc.marc.includes('Ruínas pequenas'), 'a cena criada: o fundo pintado e o marcador oculto das ruínas pequenas: ' + j(sc));
    await ev(() => document.querySelectorAll('.toast').forEach(x => x.remove()));
    await ev(() => { __tc.Render.fit(); __tc.Render.request(); }); await w(500);
    await foto('13c-cena');
  }

  const erros = t.errs.filter(e => !/favicon/i.test(e));
  if (erros.length) console.log(erros.slice(0, 10).join('\n'));
  ok(erros.length === 0, 'sem erros no console');
  console.log(fails ? `${n - fails}/${n} ok — ${fails} falharam` : `${n}/${n} ok`);
  await t.close();
  process.exit(fails ? 1 : 0);
})();
