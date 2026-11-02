// Lote 54: a varredura de sementes do gerador de lugares (a skill "gerador-de-cenas"). Para cada lugar, 200 sementes (os
// mais pesados, menos), sem a janela: o plano sai sem erro e igual para a mesma semente; nada fica fora do mapa; os
// objetos não caem um em cima do outro; nas masmorras (e nas catacumbas, com os túneis cavados), todo o chão aberto se
// liga; no vilarejo e na cidade, as casas não se sobrepõem e a feira não cai numa casa. A semente que falha aparece no
// aviso (para virar um teste fixo).
const { open } = require('./lib');
let fails = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { fails++; console.log('FALHOU:', m); } };
const N = Number(process.env.SEMENTES || 200);

(async () => {
  const t = await open({ w: 1200, h: 800 });
  const { page } = t;
  await page.waitForTimeout(600);
  const lugares = [['vila', { rio: true }, N], ['vila', { rio: true, tamanho: 'vila', muralha: true }, Math.round(N / 2)], ['cidade', { rio: true }, Math.round(N / 4)], ['tribo', {}, N], ['porto', {}, Math.round(N / 2)],
    ['encontro', {}, N], ['regiao', {}, Math.round(N / 2)], ['castelo', {}, N], ['ruinas', {}, N], ['cemiterio', {}, N], ['masmorra', {}, N], ['masmorra', { tipo: 'caverna' }, Math.round(N / 2)],
    ['catacumbas', {}, N], ['catacumbas', { tipo: 'culto' }, Math.round(N / 2)], ['crime', {}, N], ['arena', {}, Math.round(N / 2)],
    // (lote 58) os lugares de água e penhasco
    ['lago', {}, Math.round(N / 2)], ['praia', {}, Math.round(N / 2)], ['penhasco', {}, Math.round(N / 2)], ['desfiladeiro', {}, Math.round(N / 2)]];
  for (const [id, op, qtd] of lugares) {
    const r = await page.evaluate(({ id, op, qtd }) => {
      const L = __tc.Gerador.LUGARES.find(l => l.id === id), out = { erro: [], fora: [], sobre: [], desligado: [], casas: [], feira: [], difere: [], cavado: 0 };
      const j = x => JSON.stringify(x);
      for (let s = 1; s <= qtd; s++) {
        let p;
        try { p = L.gerar(Object.assign(L.padrao(), op), { estilo: 'comum', seed: s * 7919 }); } catch (e) { out.erro.push(s + ': ' + e.message); continue; }
        if (s <= 3) { const q = L.gerar(Object.assign(L.padrao(), op), { estilo: 'comum', seed: s * 7919 }); if (j(q) !== j(p)) out.difere.push(s); }
        const W = p.W, H = p.H;
        if (!(W > 0 && H > 0)) continue;
        // os objetos: dentro do mapa e sem sobrepor (pela casa de cima, à esquerda, e o tamanho)
        if (Array.isArray(p.objetos)) {
          const oc = new Map();
          for (const o of p.objetos) {
            const sz = Math.max(1, Math.round(o.s || 1));
            if (o.x < -0.01 || o.y < -0.01 || o.x + sz > W + 0.01 || o.y + sz > H + 0.01) { if (out.fora.length < 6) out.fora.push(s + ':' + o.id + '@' + o.x + ',' + o.y); continue; }
            for (let b = 0; b < sz; b++) for (let a = 0; a < sz; a++) { const k = (Math.floor(o.x) + a) + ',' + (Math.floor(o.y) + b); if (oc.has(k) && out.sobre.length < 6) out.sobre.push(s + ':' + o.id + '/' + oc.get(k) + '@' + k); oc.set(k, o.id); }
          }
        }
        // a grade das masmorras: todo o chão aberto ligado (quatro vizinhas)
        if (typeof p.grade === 'string' && p.grade.length === W * H && p.lugar === 'masmorra' && p.tipo !== 'arena') {
          const g = p.grade, aberto = k => g[k] !== '0', vis = new Uint8Array(W * H);
          let ini = -1, total = 0;
          for (let k = 0; k < W * H; k++) if (aberto(k)) { total++; if (ini < 0) ini = k; }
          if (ini >= 0) {
            const fila = [ini]; vis[ini] = 1; let vistos = 1;
            while (fila.length) { const k = fila.pop(), i = k % W, jj = (k - i) / W; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = i + a, y = jj + b, m = y * W + x; if (x >= 0 && y >= 0 && x < W && y < H && !vis[m] && aberto(m)) { vis[m] = 1; vistos++; fila.push(m); } } }
            if (vistos < total && out.desligado.length < 6) out.desligado.push(s + ': ' + (total - vistos) + ' casas soltas');
          }
          if (Array.isArray(p.escavado)) { out.cavado += p.escavado.length ? 1 : 0; if (p.escavado.some(k => g[k] === '0') && out.desligado.length < 6) out.desligado.push(s + ': túnel na rocha'); }
        }
        // o vilarejo e a cidade: as casas sem sobrepor, dentro do mapa; a feira fora das casas
        const casas = p.casas || p.predios || null;
        if (Array.isArray(casas)) {
          for (let a = 0; a < casas.length; a++) {
            const A = casas[a];
            if (A.x < 0 || A.y < 0 || A.x + A.w > W || A.y + A.h > H) { if (out.casas.length < 6) out.casas.push(s + ': casa fora'); }
            for (let b = a + 1; b < casas.length; b++) { const B = casas[b]; if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h && out.casas.length < 6) out.casas.push(s + ': casas ' + a + '/' + b); }
          }
          for (const e of p.feira || []) if (casas.some(A => e.x < A.x + A.w && A.x < e.x + e.s && e.y < A.y + A.h && A.y < e.y + e.s) && out.feira.length < 6) out.feira.push(s + ':' + e.id);
        }
      }
      return out;
    }, { id, op, qtd });
    const nome = id + (Object.keys(op).length ? ' ' + JSON.stringify(op) : '') + ' (' + qtd + ' sementes)';
    ok(!r.erro.length, nome + ': sem erro — ' + r.erro.slice(0, 3).join(' | '));
    ok(!r.difere.length, nome + ': a mesma semente dá o mesmo plano — ' + r.difere.join(','));
    ok(!r.fora.length, nome + ': os objetos dentro do mapa — ' + r.fora.join(' '));
    ok(!r.sobre.length, nome + ': os objetos sem sobrepor — ' + r.sobre.join(' '));
    ok(!r.desligado.length, nome + ': todo o chão aberto se liga — ' + r.desligado.join(' | '));
    ok(!r.casas.length, nome + ': as casas sem sobrepor, dentro do mapa — ' + r.casas.join(' | '));
    ok(!r.feira.length, nome + ': a feira fora das casas — ' + r.feira.join(' '));
    if (id === 'catacumbas') ok(r.cavado > qtd * 0.5, nome + ': as catacumbas com túneis cavados (' + r.cavado + ' de ' + qtd + ')');
  }
  const erros = t.errs.filter(e => !/favicon|fonts\.g/.test(e));
  if (erros.length) console.log('CONSOLE:\n' + erros.slice(0, 8).join('\n'));
  ok(!erros.length, 'sem erros no console');
  console.log((fails ? fails + ' de ' : '') + n + ' verificações ' + (fails ? 'falharam' : 'passaram'));
  await t.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
