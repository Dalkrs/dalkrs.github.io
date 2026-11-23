/* =======================================================================
   ArvLayout — onde cada nó da árvore de habilidades fica no mapa (lote 206).

   Radial arrumado:
   - a origem no centro;
   - os nós soltos da origem (fundamentos, truques) num anel pequeno em volta dela;
   - cada ramo (filho da origem que tem descendentes) ganha uma FATIA própria e cresce para fora em anéis;
   - dentro do ramo, cada nó fica no anel da sua camada: 1 + a camada mais alta entre os pais do mesmo ramo
     (assim a Mestria fica depois das duas trilhas que chegam nela);
   - as vertentes (trilhas que saem da cabeça do ramo: golpe e jutsu do Ninja, os estilos do Espadachim)
     andam lado a lado, em faixas;
   - as pontes (pais em ramos diferentes) ficam no vão entre os ramos;
   - no fim, um passe afasta o que ainda encostar.
   Lógica pura: calc(nodes, opt) → { pos: Map(id → {x, y, prof, principal, ramo, faixa}), aneis: [raios] }.
     opt.pais(n)   os pais do nó que existem nesta árvore (padrão: n.pais)
     opt.raio(n)   o raio do desenho do nó (padrão: 10)
   ======================================================================= */
(function (root) {
  'use strict';
  const PASSO = 104;        // distância entre os anéis de um ramo
  const VAO = 64;           // distância mínima, de lado, entre dois nós da mesma camada (além dos raios)

  const ehJuncao = n => n && (n.forma === 'selo' || /mestria/i.test(String(n.exclusivo || '')));

  function calc(nodes, opt) {
    opt = opt || {};
    const pos = new Map();
    if (!Array.isArray(nodes) || !nodes.length) return { pos, aneis: [] };
    const porId = new Map(nodes.map(n => [n.id, n]));
    const paisDe = n => (opt.pais ? opt.pais(n) : (n.pais || [])).filter(p => porId.has(p) && p !== n.id);
    const raio = n => (opt.raio ? opt.raio(n) : 10) || 10;
    const filhos = new Map(nodes.map(n => [n.id, []]));
    for (const n of nodes) for (const p of paisDe(n)) filhos.get(p).push(n);

    // ---- raízes; o que nenhum caminho alcança (ciclos) também vira raiz
    let raizes = nodes.filter(n => !paisDe(n).length);
    const alc = new Set(raizes.map(n => n.id));
    for (let f = [...raizes], i = 0; i < f.length; i++) for (const c of filhos.get(f[i].id)) if (!alc.has(c.id)) { alc.add(c.id); f.push(c); }
    const soltos = nodes.filter(n => !alc.has(n.id));
    const paisL = new Map(nodes.map(n => [n.id, alc.has(n.id) ? paisDe(n) : []]));
    raizes = raizes.concat(soltos);

    // ---- o centro, os ramos e os fundamentos
    let centro = null, cabecas = [], fundamentos = [];
    if (raizes.length === 1) {
      centro = raizes[0];
      for (const c of filhos.get(centro.id)) {
        if (paisL.get(c.id).length !== 1) continue;               // filho com outro pai: não é cabeça
        (filhos.get(c.id).length ? cabecas : fundamentos).push(c);
      }
      if (!cabecas.length) { cabecas = fundamentos; fundamentos = []; }
    } else cabecas = raizes;                                        // várias raízes: cada uma é um ramo
    const iCab = new Map(cabecas.map((c, i) => [c.id, i]));

    // ---- ordem topológica (só o que foi alcançado)
    const grau = new Map(nodes.map(n => [n.id, paisL.get(n.id).length]));
    const topo = [];
    for (let f = nodes.filter(n => !grau.get(n.id)), i = 0; i < f.length; i++) {
      topo.push(f[i]);
      for (const c of filhos.get(f[i].id)) { grau.set(c.id, grau.get(c.id) - 1); if (!grau.get(c.id)) f.push(c); }
    }
    for (const n of nodes) if (!topo.includes(n)) topo.push(n);   // (segurança)

    // ---- dono de cada nó: um ramo (número) ou uma ponte (string com os ramos)
    const dono = new Map();
    const fixo = new Set([centro && centro.id, ...fundamentos.map(n => n.id)].filter(Boolean));
    for (const n of topo) {
      if (fixo.has(n.id)) continue;
      if (iCab.has(n.id)) { dono.set(n.id, iCab.get(n.id)); continue; }
      const ds = new Set();
      for (const p of paisL.get(n.id)) { if (fixo.has(p)) continue; const d = dono.get(p); if (d === undefined) continue; if (typeof d === 'string') d.split(',').forEach(x => ds.add(+x)); else ds.add(d); }
      if (!ds.size) { dono.set(n.id, 0); continue; }
      dono.set(n.id, ds.size === 1 ? [...ds][0] : [...ds].sort((a, b) => a - b).join(','));
    }

    // ---- camada dentro do ramo
    const cam = new Map();
    for (const n of topo) {
      const d = dono.get(n.id);
      if (typeof d !== 'number') continue;
      if (iCab.has(n.id)) { cam.set(n.id, 0); continue; }
      let c = 0;
      for (const p of paisL.get(n.id)) if (dono.get(p) === d && cam.has(p)) c = Math.max(c, cam.get(p) + 1);
      cam.set(n.id, c);
    }

    // ---- faixas (vertentes): cada filho da cabeça que tem descendentes abre uma faixa.
    // Junção (Mestria) e nó com pais de faixas diferentes ficam no tronco (null). Filho só do tronco:
    // segue a faixa cuja cabeça tem a mesma natureza, se só uma tiver.
    const faixa = new Map(), natFaixa = new Map();
    for (const n of topo) {
      const d = dono.get(n.id);
      if (typeof d !== 'number' || iCab.has(n.id)) continue;
      const ps = paisL.get(n.id).filter(p => dono.get(p) === d);
      if (ps.length === 1 && iCab.has(ps[0])) {                    // filho direto da cabeça
        faixa.set(n.id, n.id); natFaixa.set(n.id, n.natureza || ''); continue;
      }
      if (ehJuncao(n)) { faixa.set(n.id, null); continue; }
      const fs = new Set(ps.map(p => faixa.get(p)).filter(x => x != null));
      if (fs.size === 1) { faixa.set(n.id, [...fs][0]); continue; }
      if (fs.size === 0 && n.natureza) {
        const irmas = [...natFaixa.entries()].filter(([fid]) => dono.get(fid) === d);
        const iguais = irmas.filter(([, nat]) => nat === n.natureza);
        if (iguais.length === 1 && irmas.length > 1) { faixa.set(n.id, iguais[0][0]); continue; }
      }
      faixa.set(n.id, null);
    }
    // as faixas de um ramo, na ordem dos filhos da cabeça; uma faixa só vale se tiver 3 nós ou mais
    const tamFaixa = new Map();
    faixa.forEach(f => { if (f != null) tamFaixa.set(f, (tamFaixa.get(f) || 0) + 1); });
    faixa.forEach((f, id) => { if (f != null && tamFaixa.get(f) < 3) faixa.set(id, null); });
    // faixas pequenas viram tronco; o tronco fica no meio, as faixas grandes dos lados
    const ordemFaixa = new Map();
    cabecas.forEach((c, i) => {
      const fs = filhos.get(c.id).map(x => x.id).filter(id => faixa.get(id) === id);
      const meio = Math.floor(fs.length / 2);
      fs.forEach((f, k) => ordemFaixa.set(f, k < meio ? k - meio - .5 : k - meio + .5));
    });

    // ---- posição lateral (x) em cada camada, por ramo: faixas lado a lado, o resto pelo baricentro dos pais
    const lat = new Map();
    const largura = cabecas.map(() => new Map());                  // ramo → camada → [min, max] de x
    cabecas.forEach((c, ri) => {
      const membros = nodes.filter(n => dono.get(n.id) === ri);
      const porCam = [];
      membros.forEach(n => { const k = cam.get(n.id); (porCam[k] = porCam[k] || []).push(n); });
      const desejo = n => {
        const ps = paisL.get(n.id).filter(p => lat.has(p) && dono.get(p) === ri);
        let x = ps.length ? ps.reduce((s, p) => s + lat.get(p), 0) / ps.length : 0;
        const f = faixa.get(n.id);
        if (f != null && ordemFaixa.has(f)) x = x * .5 + ordemFaixa.get(f) * (VAO + 2 * 10) * 1.6;
        return x;
      };
      const larg = n => 2 * raio(n) + VAO;
      for (let k = 0; k < porCam.length; k++) {
        const camada = (porCam[k] || []).slice();
        if (!camada.length) continue;
        const ds = new Map(camada.map(n => [n.id, desejo(n)]));
        camada.sort((a, b) => ds.get(a.id) - ds.get(b.id) || (ordemFaixa.get(faixa.get(a.id)) || 0) - (ordemFaixa.get(faixa.get(b.id)) || 0) || (a.id < b.id ? -1 : 1));
        // empacota sem encostar e centra no desejo médio
        const xs = [];
        camada.forEach((n, i) => { const want = ds.get(n.id); xs[i] = i ? Math.max(want, xs[i - 1] + (larg(camada[i - 1]) + larg(n)) / 2) : want; });
        for (let i = camada.length - 2; i >= 0; i--) xs[i] = Math.min(xs[i], xs[i + 1] - (larg(camada[i + 1]) + larg(camada[i])) / 2);
        const desl = camada.reduce((s, n, i) => s + ds.get(n.id) - xs[i], 0) / camada.length;
        camada.forEach((n, i) => lat.set(n.id, xs[i] + desl));
        const l0 = Math.min(...camada.map((n, i) => xs[i] + desl - larg(n) / 2)), l1 = Math.max(...camada.map((n, i) => xs[i] + desl + larg(n) / 2));
        largura[ri].set(k, [l0, l1]);
      }
      // um passe de volta: o pai vai para o meio dos filhos (quando não tem irmãos na camada que atrapalhem)
      for (let k = porCam.length - 2; k >= 1; k--) for (const n of porCam[k] || []) {
        const fs = filhos.get(n.id).filter(x => dono.get(x.id) === ri && lat.has(x.id));
        if (!fs.length) continue;
        const alvo = fs.reduce((s, x) => s + lat.get(x.id), 0) / fs.length;
        const viz = (porCam[k] || []).filter(x => x !== n).map(x => lat.get(x.id));
        const lim = 2 * raio(n) + VAO;
        if (viz.every(v => Math.abs(v - alvo) >= lim)) lat.set(n.id, (lat.get(n.id) + alvo) / 2);
      }
    });

    // ---- os anéis e as fatias: cada ramo precisa, em cada camada, de largura/raio de ângulo
    const nFund = fundamentos.length;
    const rFund = nFund ? Math.max(110, (nFund * (2 * 12 + 30)) / (2 * Math.PI)) : 0;
    let r0 = Math.max(200, rFund + 120);
    const raioCam = k => r0 + k * PASSO;
    let meias = [], tot = 0;
    for (let volta = 0; volta < 40; volta++) {
      meias = cabecas.map((c, ri) => {
        let e = .08, d = .08;                                      // meia-fatia à esquerda e à direita (rad)
        largura[ri].forEach(([l0, l1], k) => { const r = raioCam(k); e = Math.max(e, -l0 / r); d = Math.max(d, l1 / r); });
        return [e, d];
      });
      const vao = cabecas.length > 1 ? 70 / r0 : 0;                 // vão entre ramos (cabem as pontes)
      tot = meias.reduce((s, [e, d]) => s + e + d + vao, 0);
      if (tot <= Math.PI * 2 || cabecas.length < 2) break;
      r0 *= 1.12;
    }
    // a sobra de ângulo vai para os vãos entre os ramos (alargar o ramo torce as faixas)
    const vaoBase = cabecas.length > 1 ? 70 / r0 : 0;
    const sobra = Math.max(0, Math.PI * 2 - tot);
    const vao = vaoBase + (cabecas.length ? sobra / cabecas.length : 0);
    const angCab = [];
    let a = -Math.PI / 2 - (meias[0] ? 0 : 0);
    cabecas.forEach((c, ri) => {
      if (ri === 0) { angCab[0] = -Math.PI / 2; a = -Math.PI / 2 + meias[0][1]; return; }
      a += vao + meias[ri][0];
      angCab[ri] = a;
      a += meias[ri][1];
    });

    // ---- posições finais
    const polar = (ang, r) => ({ x: Math.cos(ang) * r, y: Math.sin(ang) * r });
    let maxCam = 0;
    if (centro) pos.set(centro.id, { x: 0, y: 0, prof: 0, principal: null, ramo: null, faixa: null });
    fundamentos.forEach((n, i) => {
      // os fundamentos ficam nos vãos entre os ramos, perto do centro
      const ang = -Math.PI / 2 + (i + .5) * (Math.PI * 2 / nFund);
      pos.set(n.id, Object.assign(polar(ang, rFund), { prof: .5, principal: centro.id, ramo: null, faixa: null }));
    });
    for (const n of nodes) {
      const d = dono.get(n.id);
      if (typeof d !== 'number') continue;
      const k = cam.get(n.id) || 0, r = raioCam(k);
      maxCam = Math.max(maxCam, k);
      const ps = paisL.get(n.id);
      const principal = ps.filter(p => dono.get(p) === d).sort((p, q) => (cam.get(q) || 0) - (cam.get(p) || 0))[0] || ps[0] || null;
      pos.set(n.id, Object.assign(polar(angCab[d] + (lat.get(n.id) || 0) / r, r), { prof: k + 1, principal, ramo: d, faixa: faixa.get(n.id) || null }));
    }
    // pontes: no vão entre dois ramos que fica no caminho mais curto entre os pais (o vão do meio desse caminho),
    // na altura média dos pais. Várias no mesmo vão: uma em cima da outra.
    const norma = x => { while (x <= -Math.PI) x += Math.PI * 2; while (x > Math.PI) x -= Math.PI * 2; return x; };
    const vaos = cabecas.map((c, ri) => norma(angCab[ri] + meias[ri][1] + vao / 2));   // o vão depois do ramo ri
    const usoVao = new Map();
    for (const n of topo) {
      if (typeof dono.get(n.id) !== 'string') continue;
      const ps = paisL.get(n.id).map(p => pos.get(p)).filter(Boolean);
      if (!ps.length) continue;
      const angs = ps.map(q => Math.atan2(q.y, q.x)), rr = ps.reduce((s2, q) => s2 + Math.hypot(q.x, q.y), 0) / ps.length;
      const a0 = angs[0], d01 = norma((angs[1] !== undefined ? angs[1] : a0) - a0);     // caminho mais curto de a0 até a1
      const meio = norma(a0 + d01 / 2);
      let melhor = 0, dm = 1e9;
      vaos.forEach((g, gi) => {
        const t = norma(g - a0);
        const dentro = d01 >= 0 ? t >= -.01 && t <= d01 + .01 : t <= .01 && t >= d01 - .01;
        const dist = Math.abs(norma(g - meio)) + (dentro ? 0 : 10);
        if (dist < dm) { dm = dist; melhor = gi; }
      });
      const k = usoVao.get(melhor) || 0; usoVao.set(melhor, k + 1);
      const r = rr + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * PASSO * .9;
      pos.set(n.id, Object.assign(polar(vaos[melhor], Math.max(rFund + 80, r)), { prof: null, principal: paisL.get(n.id)[0], ramo: null, faixa: null }));
    }

    // ---- afasta o que ainda encostar (gira em volta do centro, sem mudar o anel)
    const ids = nodes.map(n => n.id).filter(id => pos.has(id) && (!centro || id !== centro.id));
    for (let it = 0; it < 60; it++) {
      let mexeu = false;
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
        const A = pos.get(ids[i]), B = pos.get(ids[j]);
        const min = raio(porId.get(ids[i])) + raio(porId.get(ids[j])) + 26;
        const dx = B.x - A.x, dy = B.y - A.y, dist = Math.hypot(dx, dy);
        if (dist >= min) continue;
        mexeu = true;
        const push = (min - dist) / 2 + .5;
        const ux = dist > .01 ? dx / dist : 1, uy = dist > .01 ? dy / dist : 0;
        [[A, -1], [B, 1]].forEach(([P, s]) => {
          const R = Math.hypot(P.x, P.y) || 1;
          let nx = P.x + ux * push * s, ny = P.y + uy * push * s;
          const L = Math.hypot(nx, ny) || 1; P.x = nx / L * R; P.y = ny / L * R;
        });
      }
      if (!mexeu) break;
    }
    const aneis = [];
    if (nFund) aneis.push(rFund);
    for (let k = 0; k <= maxCam; k++) aneis.push(raioCam(k));
    return { pos, aneis };
  }

  const API = { calc, PASSO, VAO };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TC = root.TC || {}; root.TC.arvLayout = API; }
})(typeof window !== 'undefined' ? window : null);
