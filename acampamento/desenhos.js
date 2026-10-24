/* Tiny Cats · Acampamento: os desenhos da cena (sem página: só monta o SVG, em texto).
   Uma cena de 1600×900 (a mesma da página), presa embaixo: o céu, o horizonte do lugar (floresta, montanha, deserto,
   neve, beira-mar, caverna), o chão e — conforme a área — a fogueira com as barracas, as oficinas, o convívio ou a
   guarda e o cuidado, com as construções que estão de pé, cada uma do jeito do nível dela (simples, boa, excelente),
   e os veículos e animais da caravana.
   As cores do céu e do chão vêm das variáveis da página (a hora do dia); o lugar só tinge.
   Roda igual no navegador (window.AcampDesenhos) e no Node (testes). */
(() => {
  'use strict';
  // um gerador de números "sorteados", sempre os mesmos para a mesma semente (o desenho não muda a cada pintura)
  function sorte(semente) { let a = semente >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f = n => (Math.round(n * 10) / 10).toString();
  // (os tons de cada lugar: o chão e o mato puxam para eles)
  const TINTA = { floresta: null, montanha: '#7a7f8a', deserto: '#c9a063', neve: '#dfe8f2', mar: '#c8b48a', caverna: '#4d3f33' };

  /* ---------------- o fundo: céu, horizonte do lugar, chão ----------------
     (lote 25) No jeito das ilustrações dos personagens: o céu com o brilho do horizonte, nuvens macias e a lua com halo;
     o horizonte em camadas, cada uma mais apagada pela névoa quanto mais longe (a perspectiva do ar); árvores grandes
     emoldurando os lados; o chão com textura; a luz da lua contornando as bordas do lado dela. As cores continuam
     vindo das variáveis da página (a hora do dia); o lugar só tinge. */
  const cm = (a, pct, b) => `color-mix(in srgb, ${a} ${pct}%, ${b})`;
  function defsFundo() {
    return '<defs><linearGradient id="gCeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ceu1)"/><stop offset=".6" style="stop-color:var(--ceu2)"/><stop offset="1" style="stop-color:var(--ceu3)"/></linearGradient>'
      + '<radialGradient id="gFogo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb04a" stop-opacity=".85"/><stop offset=".45" stop-color="#ff7a2a" stop-opacity=".28"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="gLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="gChao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a4a" stop-opacity=".5"/><stop offset=".55" stop-color="#c8763a" stop-opacity=".18"/><stop offset="1" stop-color="#c8763a" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="gMar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb, var(--ceu3) 30%, #1d3a5c)"/><stop offset=".35" stop-color="#16304e"/><stop offset="1" stop-color="#0a1a2c"/></linearGradient>'
      + '<radialGradient id="gHalo" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--astro)" stop-opacity=".55"/><stop offset=".25" style="stop-color:var(--astro)" stop-opacity=".2"/><stop offset="1" style="stop-color:var(--astro)" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="gAstro" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".55" style="stop-color:var(--astro)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--astro) 70%, var(--ceu3))"/></radialGradient>'
      + '<radialGradient id="gHorizonte" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--ceu3)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--ceu3)" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="gNevoa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ceu3)" stop-opacity="0"/><stop offset=".5" style="stop-color:var(--ceu3)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--ceu3)" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="gChaoT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb, var(--chao2) 70%, var(--ceu3))"/><stop offset=".18" style="stop-color:var(--chao2)"/><stop offset="1" style="stop-color:var(--chao)"/></linearGradient>'
      + '<linearGradient id="gRaio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--astro)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--astro)" stop-opacity="0"/></linearGradient>'
      + '<radialGradient id="gVinheta" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>'
      + '<radialGradient id="gVaga" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8"/><stop offset=".3" stop-color="#ffd86a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb84a" stop-opacity="0"/></radialGradient>'
      + '<filter id="fMacio" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="10"/></filter>'
      + '<filter id="fNevoa" x="-10%" y="-80%" width="120%" height="260%"><feGaussianBlur stdDeviation="22"/></filter>'
      + '<filter id="fBrilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>';
  }
  // a estrela grande que cintila em cruz (como nos céus das ilustrações)
  const cruz = (x, y, t) => `<path class="estrela" d="M${f(x)} ${f(y - t)}Q${f(x + t * 0.16)} ${f(y - t * 0.16)} ${f(x + t)} ${f(y)}Q${f(x + t * 0.16)} ${f(y + t * 0.16)} ${f(x)} ${f(y + t)}Q${f(x - t * 0.16)} ${f(y + t * 0.16)} ${f(x - t)} ${f(y)}Q${f(x - t * 0.16)} ${f(y - t * 0.16)} ${f(x)} ${f(y - t)}Z" style="animation-delay:-${f((x * 7) % 4)}s"/>`;
  // uma nuvem macia: bolotas borradas, com a barriga acesa pela cor do horizonte
  const nuvem = (x, y, l, r) => {
    let s = `<g class="nuvem" filter="url(#fMacio)" opacity=".55">`;
    for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * l * 0.17 + (r() - 0.5) * l * 0.1, ry = l * (0.09 + r() * 0.07); s += `<ellipse cx="${f(x + dx)}" cy="${f(y - ry * 0.4)}" rx="${f(l * (0.14 + r() * 0.08))}" ry="${f(ry)}" style="fill:${cm('var(--ceu2)', 70, 'var(--astro)')}"/>`; }
    return s + `<ellipse cx="${f(x)}" cy="${f(y + l * 0.03)}" rx="${f(l * 0.5)}" ry="${f(l * 0.05)}" style="fill:var(--ceu3)" opacity=".8"/></g>`;
  };
  // o pinheiro em camadas de galhos caídos (a beira de baixo de cada camada em pontas), com a beira do lado da lua
  // acesa (luz de recorte) e, na neve, a neve por cima de cada camada
  const pinheiro = (x, y, a, l, cor, neve, luz, r) => {
    const n = 5, camadas = [], lit = [], nv = [], j = () => (r ? (r() - 0.5) * 0.12 : 0);
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1.25) / n, w = l * (0.3 + Math.min(1, t1) * 0.85), y0 = y - a + a * t0 * 0.86, y1 = Math.min(y, y - a + a * t1 * 0.86), h = y1 - y0;
      camadas.push(`M${f(x)} ${f(y0)}Q${f(x + w * 0.3)} ${f(y0 + h * 0.6)} ${f(x + w)} ${f(y1)}L${f(x + w * (0.62 + j()))} ${f(y1 - h * 0.14)}L${f(x + w * 0.32)} ${f(y1 + h * 0.04)}L${f(x)} ${f(y1 - h * 0.12)}L${f(x - w * 0.32)} ${f(y1 + h * 0.04)}L${f(x - w * (0.62 + j()))} ${f(y1 - h * 0.14)}L${f(x - w)} ${f(y1)}Q${f(x - w * 0.3)} ${f(y0 + h * 0.6)} ${f(x)} ${f(y0)}Z`);
      if (luz) lit.push(`M${f(x + 1)} ${f(y0 + 2)}Q${f(x + w * 0.3)} ${f(y0 + h * 0.6)} ${f(x + w)} ${f(y1)}L${f(x + w * 0.7)} ${f(y1 - h * 0.12)}Q${f(x + w * 0.2)} ${f(y0 + h * 0.62)} ${f(x + 1)} ${f(y0 + 2)}Z`);
      if (neve) nv.push(`M${f(x - w * 0.15)} ${f(y0 + h * 0.18)}Q${f(x - w * 0.5)} ${f(y0 + h * 0.62)} ${f(x - w * 0.86)} ${f(y1 - h * 0.1)}Q${f(x - w * 0.4)} ${f(y0 + h * 0.6)} ${f(x)} ${f(y0 + h * 0.08)}Q${f(x + w * 0.4)} ${f(y0 + h * 0.6)} ${f(x + w * 0.86)} ${f(y1 - h * 0.1)}Q${f(x + w * 0.5)} ${f(y0 + h * 0.62)} ${f(x + w * 0.15)} ${f(y0 + h * 0.18)}Z`);
    }
    let s = `<path d="M${f(x - l * 0.1)} ${f(y)}h${f(l * 0.2)}v-${f(a * 0.2)}h-${f(l * 0.2)}Z" style="fill:${cor}"/><path d="${camadas.join('')}" style="fill:${cor}"/>`;
    if (luz) s += `<path d="${lit.join('')}" style="fill:var(--astro)" opacity="${luz}"/>`;
    if (neve) s += `<path d="${nv.join('')}" fill="#eef3f8" opacity=".85"/>`;
    return s;
  };
  // uma fileira de pinheiros de ponta a ponta, numa altura do horizonte
  const fileira = (r, y, a0, a1, passo, cor, neve, luz) => {
    let s = '';
    for (let x = -40; x < 1660; x += passo * (0.6 + r() * 0.8)) { const a = a0 + r() * (a1 - a0); s += pinheiro(x, y + r() * 10, a, a * (0.22 + r() * 0.07), cor, neve, luz, r); }
    return s;
  };
  // a faixa de névoa entre duas camadas do horizonte
  const nevoa = (y, alt, op) => `<rect x="-60" y="${f(y - alt / 2)}" width="1720" height="${f(alt)}" fill="url(#gNevoa)" opacity="${op}" filter="url(#fNevoa)"/>`;
  // a serra: a face da sombra e a face acesa pela lua, com a neve nos picos
  const serra = (pts, cor, luz, neve) => {
    const d = 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join('L') + 'V620H-60Z';
    let s = `<path d="${d}" style="fill:${cor}"/>`;
    let acesa = '';
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], [x2, y2] = pts[i + 1];
      if (y < pts[i - 1][1] && y < y2) acesa += `M${f(x)} ${f(y)}L${f(x2)} ${f(y2)}L${f(x + (x2 - x) * 0.35)} ${f(y2 + 40)}Z`;
    }
    if (luz && acesa) s += `<path d="${acesa}" style="fill:var(--astro)" opacity="${luz}"/>`;
    if (neve) for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i]; if (!(y < pts[i - 1][1] && y < pts[i + 1][1]) || y > 330) continue;
      const w = (330 - y) * 0.42 + 26;
      s += `<path d="M${f(x)} ${f(y)}L${f(x - w * 0.55)} ${f(y + w * 0.6)}l${f(w * 0.18)} -${f(w * 0.1)}l${f(w * 0.14)} ${f(w * 0.16)}l${f(w * 0.2)} -${f(w * 0.2)}l${f(w * 0.18)} ${f(w * 0.12)}l${f(w * 0.2)} -${f(w * 0.08)}Z" fill="#e9eef5" opacity=".88"/>`
        + `<path d="M${f(x)} ${f(y)}L${f(x + w * 0.4)} ${f(y + w * 0.48)}l-${f(w * 0.12)} -${f(w * 0.04)}l-${f(w * 0.12)} ${f(w * 0.1)}Z" fill="#fff" opacity=".9"/>`;
    }
    return s;
  };
  // um tufo de folhas de beira recortada (a borda não é um círculo liso: são pontas de folha)
  const tufo = (cx, cy, rr, r) => {
    const n = 22, pts = [];
    for (let i = 0; i < n; i++) { const ang = (i / n) * Math.PI * 2, k = i % 2 ? 0.8 + r() * 0.1 : 0.96 + r() * 0.12; pts.push(f(cx + Math.cos(ang) * rr * k) + ' ' + f(cy + Math.sin(ang) * rr * k * 0.72)); }
    return 'M' + pts.join('L') + 'Z';
  };
  // a árvore grande que emoldura um lado da cena: a copa em tufos (a beira de cima acesa pela lua), o tronco com a
  // luz de recorte, as listras da casca, o musgo e os galhos — baixos, para não tapar a lua
  const moldura = (lado, lugar, r) => {
    const x = lado < 0 ? 40 : 1560, dir = -lado, cor = cm('var(--mata)', 78, '#000'), meio = cm('var(--mata)', 88, 'var(--ceu3)'), neve = lugar === 'neve';
    let s = `<g class="moldura" data-lado="${lado < 0 ? 'e' : 'd'}">`;
    if (lugar !== 'floresta' && lugar !== 'neve') return '';
    // o tronco e os galhos
    s += `<path d="M${f(x - 74)} 900C${f(x - 62)} 700 ${f(x - 44)} 420 ${f(x - 30)} 80L${f(x + 40)} 70C${f(x + 52)} 420 ${f(x + 72)} 700 ${f(x + 94)} 900Z" style="fill:${cor}" stroke="#000" stroke-width="3" stroke-opacity=".5"/>`
      + `<path d="M${f(x + dir * 30)} 360C${f(x + dir * 120)} 340 ${f(x + dir * 180)} 300 ${f(x + dir * 240)} 300" style="stroke:${cor}" stroke-width="20" stroke-linecap="round" fill="none"/>`
      + `<path d="M${f(x + dir * 130)} 336C${f(x + dir * 160)} 360 ${f(x + dir * 190)} 366 ${f(x + dir * 214)} 396" style="stroke:${cor}" stroke-width="8" stroke-linecap="round" fill="none"/>`
      + `<path d="M${f(x + 40)} 70C${f(x + 52)} 420 ${f(x + 72)} 700 ${f(x + 94)} 900" stroke="var(--astro)" stroke-width="4" fill="none" opacity="${lado < 0 ? '.24' : '.07'}"/>`
      + `<path d="M${f(x - 20)} 860C${f(x - 14)} 700 ${f(x - 6)} 520 ${f(x)} 360M${f(x + 22)} 880C${f(x + 26)} 720 ${f(x + 24)} 560 ${f(x + 18)} 400M${f(x - 44)} 640c8-30 10-60 6-90" stroke="#000" stroke-width="3" fill="none" opacity=".4"/>`;
    if (!neve) s += `<path d="M${f(x - 66)} 780C${f(x - 52)} 700 ${f(x - 34)} 690 ${f(x - 22)} 630C${f(x - 42)} 690 ${f(x - 58)} 704 ${f(x - 70)} 820Z" fill="#6f8a3e" opacity=".55"/><path d="M${f(x + 30)} 520c10 30 30 40 26 80" stroke="#6f8a3e" stroke-width="5" fill="none" opacity=".4"/>`;
    // a copa: de trás (mais clara, perto da névoa) para a frente (escura), saindo pela borda de cima
    for (const [cam, cc, k] of [[0, meio, 1.1], [1, cor, 1]]) {
      for (let i = 0; i < 9; i++) {
        const cx = x + dir * (r() * 210 - 50), cy = -30 + r() * 250, rr = (50 + r() * 50) * k;
        s += `<path d="${tufo(cx, cy, rr, r)}" style="fill:${cc}"/>`;
        if (cam) s += neve ? `<path d="M${f(cx - rr * 0.75)} ${f(cy - rr * 0.3)}Q${f(cx)} ${f(cy - rr * 0.92)} ${f(cx + rr * 0.75)} ${f(cy - rr * 0.3)}Q${f(cx)} ${f(cy - rr * 0.58)} ${f(cx - rr * 0.75)} ${f(cy - rr * 0.3)}Z" fill="#e7edf5" opacity=".75"/>`
          : `<path d="M${f(cx - rr * 0.6)} ${f(cy - rr * 0.42)}Q${f(cx)} ${f(cy - rr * 0.78)} ${f(cx + rr * 0.6)} ${f(cy - rr * 0.42)}" stroke="var(--astro)" stroke-width="2.5" fill="none" opacity=".16"/>`;
      }
    }
    return s + '</g>';
  };
  function fundo(lugar) {
    const r = sorte(20261003), p = [], tinta = TINTA[lugar] || null;
    const mix = (v, pct) => (tinta ? `color-mix(in srgb, var(${v}) ${pct}%, ${tinta})` : `var(${v})`);
    // as cores de cada camada do horizonte: a de longe quase some na névoa; a de perto é a mata cheia
    const longe = cm('var(--mata)', 45, 'var(--ceu3)'), meio = cm('var(--mata)', 72, 'var(--ceu2)'), perto = 'var(--mata)';
    p.push(defsFundo());
    // o céu continua para cima da cena: em tela estreita é ele que aparece no alto do palco
    p.push('<rect x="0" y="-1100" width="1600" height="1101" style="fill:var(--ceu1)"/><rect x="0" y="0" width="1600" height="570" fill="url(#gCeu)"/>');
    if (lugar !== 'caverna') {
      // o brilho do horizonte, a via láctea (só de noite: --via) e as estrelas
      p.push('<ellipse cx="800" cy="560" rx="1150" ry="280" fill="url(#gHorizonte)" opacity=".75"/>');
      p.push('<g style="opacity:var(--via, 0)"><ellipse cx="760" cy="150" rx="900" ry="70" transform="rotate(-14 760 150)" fill="#cfd8ff" opacity=".13" filter="url(#fNevoa)"/><ellipse cx="760" cy="150" rx="700" ry="26" transform="rotate(-14 760 150)" fill="#e8ecff" opacity=".12" filter="url(#fMacio)"/></g>');
      for (let i = 0; i < 70; i++) p.push(`<circle class="estrela" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 400).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`);
      for (let i = 0; i < 150; i++) p.push(`<circle class="estrela" cx="${(r() * 1600).toFixed(0)}" cy="${(-r() * 1050).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`);
      for (let i = 0; i < 60; i++) { const t = r(); p.push(`<circle class="estrela" cx="${f(60 + t * 1400)}" cy="${f(330 - t * 360 + (r() - 0.5) * 70)}" r="${f(0.5 + r() * 0.9)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`); }
      for (const [x, y, t] of [[180, 70, 9], [520, 40, 7], [690, 190, 6], [1010, 60, 10], [1460, 110, 7], [380, 240, 5]]) p.push(cruz(x, y, t));
      // a lua (ou o sol baixo): o halo largo, o brilho e o disco com as manchas
      p.push('<circle cx="1240" cy="150" r="260" fill="url(#gHalo)"/><circle cx="1240" cy="150" r="70" style="fill:var(--astro)" opacity=".18" filter="url(#fBrilho)"/>'
        + '<circle cx="1240" cy="150" r="46" fill="url(#gAstro)"/><g style="fill:var(--ceu3)" opacity=".16"><circle cx="1228" cy="140" r="9"/><circle cx="1254" cy="164" r="6"/><circle cx="1250" cy="134" r="4"/><circle cx="1222" cy="166" r="5"/></g>');
      // as nuvens, finas e macias
      const rn = sorte(77);
      for (const [x, y, l] of [[260, 250, 420], [880, 300, 520], [1450, 330, 380], [600, 120, 300]]) p.push(nuvem(x, y, l, rn));
    }
    if (lugar === 'floresta' || lugar === 'neve') {
      const neve = lugar === 'neve';
      p.push(serra([[-60, 430], [120, 360], [260, 400], [420, 330], [600, 390], [760, 340], [930, 400], [1080, 350], [1260, 380], [1420, 320], [1660, 400]], longe, 0, neve));
      p.push(nevoa(470, 120, 0.8));
      p.push(fileira(r, 500, 60, 100, 26, cm('var(--mata)', 58, 'var(--ceu3)'), neve, 0));
      p.push(nevoa(520, 90, 0.7));
      p.push(fileira(r, 552, 100, 200, 32, perto, neve, 0.1));
    } else if (lugar === 'montanha') {
      p.push(serra([[-60, 520], [180, 250], [300, 360], [470, 170], [640, 380], [760, 300], [930, 120], [1110, 360], [1240, 260], [1420, 200], [1660, 470]], cm('#2a3040', 60, 'var(--ceu3)'), 0.12, true));
      p.push(nevoa(430, 160, 0.9));
      p.push(serra([[-60, 560], [140, 420], [260, 500], [380, 400], [520, 520], [660, 440], [820, 530], [980, 430], [1140, 520], [1300, 420], [1460, 510], [1660, 450]], meio, 0.08, false));
      p.push(nevoa(530, 80, 0.6));
      p.push(fileira(r, 558, 50, 110, 60, perto, false, 0.08));
    } else if (lugar === 'deserto') {
      // as mesas de pedra lá longe, as dunas em camadas com a crista acesa, e os cactos
      p.push(`<path d="M120 470V410l30-10h140l26 14V470ZM1180 470V380l24-12h110l30 18V470Z" style="fill:${cm('#6b5236', 55, 'var(--ceu3)')}"/>`);
      p.push(nevoa(470, 90, 0.6));
      p.push('<path d="M0 500C180 450 330 470 520 440S860 470 1040 430 1380 470 1600 445V570H0Z" style="fill:' + cm('#6b5236', 75, 'var(--ceu3)') + '"/>');
      p.push('<path d="M0 500C180 450 330 470 520 440S860 470 1040 430" style="stroke:var(--astro)" stroke-width="3" fill="none" opacity=".25"/>');
      p.push('<path d="M0 540C220 500 420 520 640 505S1060 530 1260 500 1500 520 1600 512V570H0Z" fill="#4e3b27"/>');
      p.push('<path d="M640 505S1060 530 1260 500 1500 520 1600 512" style="stroke:var(--astro)" stroke-width="2.5" fill="none" opacity=".2"/>');
      const cacto = (x, y, a) => `<g stroke="#141a10" stroke-width="2.5" stroke-linejoin="round"><path d="M${x - 9} ${y}V${y - a}a9 9 0 0 1 18 0V${y}Z" fill="#2f3b25"/><path d="M${x - 9} ${y - a * 0.45}h-14v-${f(a * 0.3)}a7 7 0 0 1 14 0ZM${x + 9} ${y - a * 0.6}h14v-${f(a * 0.25)}a7 7 0 0 0-14 0Z" fill="#2f3b25"/></g><path d="M${x + 4} ${y - a + 2}V${y - 4}" style="stroke:var(--astro)" stroke-width="2" opacity=".25"/>`;
      p.push(cacto(230, 560, 90), cacto(1420, 556, 70), cacto(1090, 552, 50));
    } else if (lugar === 'mar') {
      // ilhas no horizonte, o mar com o caminho de luz da lua e as ondas acesas
      p.push(`<path d="M1300 432c40-30 90-36 150-8 30-14 60-12 90 8ZM90 434c30-22 70-26 120-4Z" style="fill:${longe}"/>`);
      p.push('<rect x="0" y="430" width="1600" height="140" fill="url(#gMar)"/>');
      p.push(nevoa(436, 30, 0.6));
      for (let i = 0; i < 16; i++) { const y = 440 + i * 8, w = 30 + i * 9 + r() * 30; p.push(`<path d="M${f(1240 - w / 2 + (r() - 0.5) * 30)} ${y}h${f(w)}" style="stroke:var(--astro)" stroke-width="${f(1.5 + i * 0.12)}" stroke-linecap="round" opacity="${f(0.5 - i * 0.022)}"/>`); }
      for (let i = 0; i < 14; i++) { const y = 448 + i * 9, x = (r() * 1400) | 0; p.push(`<path d="M${x} ${y}q${f(20 + r() * 20)} -5 ${(40 + r() * 80).toFixed(0)} 0" stroke="#9fc2e2" stroke-width="2" fill="none" stroke-linecap="round" opacity=".28"/>`); }
      // um píer de madeira entrando no mar, com o contorno
      p.push('<g stroke="#120c08" stroke-width="2.5" stroke-linejoin="round"><path d="M60 552L140 470H210L150 552Z" fill="#3a2a1d"/><path d="M140 470v26M175 470v30M205 470v22" stroke-width="5"/></g><path d="M140 470H210" style="stroke:var(--astro)" stroke-width="2" opacity=".3"/>');
    } else if (lugar === 'caverna') {
      // a parede da caverna por cima, com estalactites, o fundo de pedra e os cristais que brilham
      p.push('<rect x="0" y="-1100" width="1600" height="1670" fill="#15120f"/>');
      p.push('<path d="M0 -1100H1600V300C1480 260 1440 330 1320 290S1120 240 1000 280 760 230 640 270 420 230 300 280 120 250 0 300Z" fill="#221d18"/>');
      for (let x = 60; x < 1600; x += 70 + r() * 90) { const a = 40 + r() * 110, y0 = 260 + r() * 30; p.push(`<path d="M${(x - 14).toFixed(0)} ${y0.toFixed(0)}L${x.toFixed(0)} ${(290 + a).toFixed(0)}L${(x + 14).toFixed(0)} ${(262 + r() * 30).toFixed(0)}Z" fill="#2c2620" stroke="#0e0b09" stroke-width="2"/><path d="M${x.toFixed(0)} ${(y0 + 6).toFixed(0)}L${(x + 2).toFixed(0)} ${(280 + a).toFixed(0)}" stroke="#6a5f52" stroke-width="2" opacity=".35"/>`); }
      p.push('<path d="M0 560C120 470 240 520 380 470S640 520 800 480 1100 520 1240 470 1480 520 1600 480V570H0Z" fill="#2a241e"/>');
      const cristal = (x, y, a, cor) => `<circle cx="${x}" cy="${y - a / 2}" r="${a * 1.4}" fill="${cor}" opacity=".16" filter="url(#fMacio)"/><path d="M${x} ${y}l-${f(a * 0.25)} -${f(a * 0.7)}l${f(a * 0.25)} -${f(a * 0.3)}l${f(a * 0.25)} ${f(a * 0.3)}Z" fill="${cor}" opacity=".85" stroke="#0e0b09" stroke-width="1.5"/><path d="M${x} ${y}V${f(y - a)}" stroke="#fff" stroke-width="1.5" opacity=".5"/>`;
      p.push(cristal(110, 540, 46, '#7fd4ff'), cristal(150, 546, 30, '#a68bff'), cristal(1470, 520, 52, '#7fd4ff'), cristal(1512, 528, 34, '#7fffd0'), cristal(560, 500, 26, '#a68bff'), cristal(1060, 496, 30, '#7fd4ff'));
      // a luz da fogueira batendo na parede e no teto
      p.push('<ellipse cx="800" cy="420" rx="520" ry="200" fill="#ff8a30" opacity=".1" filter="url(#fNevoa)"/>');
    }
    // o chão: o degradê (claro junto do horizonte), a clareira e a textura (capim, pedrinhas, neve ou areia)
    p.push(`<rect x="0" y="545" width="1600" height="1155" fill="url(#gChaoT)"/>`);           // o chão continua para baixo da cena
    if (tinta) p.push(`<rect x="0" y="545" width="1600" height="1155" style="fill:${tinta}" opacity="${lugar === 'caverna' ? '.62' : lugar === 'deserto' ? '.45' : '.35'}"/>`);
    p.push(`<ellipse cx="800" cy="690" rx="640" ry="190" style="fill:${mix('--chao2', 55)}" opacity=".85"/>`);
    const rc = sorte(3101), capim = lugar === 'floresta' || lugar === 'montanha', textura = [];
    for (let i = 0; i < 90; i++) {
      const x = rc() * 1600, y = 560 + Math.pow(rc(), 0.8) * 330, e = 0.5 + (y - 560) / 330;
      if (Math.abs(x - 800) < 200 && y > 600 && y < 700) continue;      // (a roda da fogueira fica limpa)
      if (capim) textura.push(`<path d="M${f(x)} ${f(y)}q-${f(3 * e)} -${f(12 * e)} -${f(8 * e)} -${f(16 * e)}M${f(x)} ${f(y)}q0 -${f(14 * e)} ${f(2 * e)} -${f(20 * e)}M${f(x)} ${f(y)}q${f(4 * e)} -${f(10 * e)} ${f(9 * e)} -${f(14 * e)}" style="stroke:${cm('var(--mata)', 60, 'var(--chao2)')}" stroke-width="${f(1.6 * e)}" fill="none" stroke-linecap="round"/>`);
      else if (lugar === 'neve') textura.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(22 * e)}" ry="${f(4 * e)}" fill="#eef3f8" opacity=".14"/>`);
      else if (lugar === 'deserto' || lugar === 'mar') textura.push(`<path d="M${f(x - 18 * e)} ${f(y)}q${f(18 * e)} -${f(5 * e)} ${f(36 * e)} 0" stroke="#000" stroke-width="${f(1.5 * e)}" fill="none" opacity=".14"/>`);
      if (rc() < 0.25) textura.push(`<ellipse cx="${f(x + 20)}" cy="${f(y + 3)}" rx="${f(5 * e)}" ry="${f(3 * e)}" fill="#000" opacity=".22"/><ellipse cx="${f(x + 19)}" cy="${f(y + 1.5)}" rx="${f(4 * e)}" ry="${f(2.2 * e)}" style="fill:${cm('var(--chao2)', 60, 'var(--astro)')}" opacity=".45"/>`);
    }
    p.push(`<g class="textura">${textura.join('')}</g>`);
    return p.join('');
  }
  // por cima de tudo (menos dos personagens, que a página põe por cima do desenho): as árvores da moldura, os vaga-lumes,
  // os raios de luz do amanhecer e do entardecer e a vinheta que fecha as bordas
  function atmosfera(lugar) {
    const r = sorte(4401), p = [];
    if (lugar === 'floresta' || lugar === 'neve') p.push(moldura(-1, lugar, r), moldura(1, lugar, r));
    if (lugar !== 'caverna') p.push('<g style="opacity:var(--raios, 0)">' + [[1240, 150, 300, 900, 140], [1240, 150, 820, 900, 90], [1240, 150, 1500, 900, 110]].map(([x, y, x2, y2, w]) => `<path d="M${x} ${y}L${x2 - w} ${y2}H${x2 + w}Z" fill="url(#gRaio)" opacity=".18" filter="url(#fMacio)"/>`).join('') + '</g>');
    const n = lugar === 'deserto' ? 6 : lugar === 'caverna' ? 10 : 16;
    for (let i = 0; i < n; i++) {
      const x = 120 + r() * 1360, y = 380 + r() * 300, rr = 2 + r() * 3.5;
      p.push(`<g class="vagalume" style="--vx:${f((r() - 0.5) * 60)}px;--vy:${f(-20 - r() * 40)}px;animation-delay:-${f(r() * 6)}s"><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 5)}" fill="url(#gVaga)" opacity=".55"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 0.6)}" fill="#fff8d8"/></g>`);
    }
    p.push('<rect x="-10" y="-10" width="1620" height="920" fill="url(#gVinheta)" pointer-events="none"/>');
    return p.join('');
  }

  /* ---------------- a fogueira: os abrigos, os troncos e o fogo ----------------
     (lote 18) A barraca com lona de verdade: as costuras, a barra, as cordas até as estacas, a porta aberta (a aba
     presa de lado) e a luz da fogueira no lado virado para ela. "vira": o lado claro é o da esquerda. */
  const LONA_E = '#3d352b', LONA_C = '#6a5a41', COSTURA = '#2c261e', CORDA = '#9a8a68', TRACO = '#120d09';      // (TRACO: o contorno de nanquim, lote 25)
  const estacaCorda = (x1, y1, x2, y2) => `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${CORDA}" stroke-width="2" opacity=".75"/><path d="M${f(x2)} ${f(y2 + 2)}l${x2 > x1 ? 5 : -5} -14" stroke="#2a1f16" stroke-width="5" stroke-linecap="round"/>`;
  const barraca = (cx, base, larg, alt, vira) => {
    const e = cx - larg / 2, d = cx + larg / 2, t = base - alt, porta = larg * 0.16, claro = vira ? e : d, lado = vira ? -1 : 1;
    let s = `<g class="abrigo" data-abrigo="barraca"><ellipse cx="${f(cx)}" cy="${f(base + 4)}" rx="${f(larg * 0.6)}" ry="${f(larg * 0.08)}" fill="#000" opacity=".28"/>`
      + estacaCorda(cx - lado * larg * 0.08, t + alt * 0.12, cx - lado * (larg * 0.5 + 42), base + 8) + estacaCorda(cx + lado * larg * 0.06, t + alt * 0.14, cx + lado * (larg * 0.5 + 38), base + 10)
      + `<path d="M${f(e)} ${f(base)}L${f(cx)} ${f(t)}L${f(d)} ${f(base)}Z" fill="${LONA_E}" stroke="${TRACO}" stroke-width="3" stroke-linejoin="round"/><path d="M${f(cx)} ${f(t)}L${f(claro)} ${f(base)}H${f(cx)}Z" fill="${LONA_C}"/>`
      // (lote 25) a sombra que a lona faz em si mesma, perto do chão, e a crista acesa pela lua
      + `<path d="M${f(e)} ${f(base)}L${f(e + (cx - e) * 0.18)} ${f(base - alt * 0.18)}H${f(d - (d - cx) * 0.18)}L${f(d)} ${f(base)}Z" fill="#000" opacity=".22"/>`
      + `<path d="M${f(cx)} ${f(t)}L${f(d)} ${f(base)}" style="stroke:var(--astro)" stroke-width="2.5" opacity=".28"/>`
      // a luz da fogueira na lona (pulsa com o fogo)
      + `<path class="luz-lona" d="M${f(cx)} ${f(t)}L${f(claro)} ${f(base)}H${f(cx)}Z" fill="#ff9a4a"/>`;
    // as costuras (do alto até a barra) e a barra de baixo
    for (const k of [0.33, 0.66]) s += `<path d="M${f(cx)} ${f(t + 4)}L${f(cx + (e - cx) * k)} ${f(base)}M${f(cx)} ${f(t + 4)}L${f(cx + (d - cx) * k)} ${f(base)}" stroke="${COSTURA}" stroke-width="2" opacity=".45"/>`;
    s += `<path d="M${f(e + 6)} ${f(base - 7)}H${f(d - 6)}" stroke="${COSTURA}" stroke-width="3" opacity=".5"/>`
      // a porta aberta: o escuro de dentro, a aba presa de lado e o laço
      + `<path d="M${f(cx)} ${f(t + alt * 0.3)}L${f(cx + porta)} ${f(base)}H${f(cx - porta)}Z" fill="#15110d" stroke="${TRACO}" stroke-width="2"/><path d="M${f(cx - porta * 0.6)} ${f(base)}L${f(cx)} ${f(t + alt * 0.42)}L${f(cx + porta * 0.6)} ${f(base)}Z" fill="#ff9a4a" opacity=".08"/>`
      + `<path d="M${f(cx)} ${f(t + alt * 0.3)}L${f(cx - lado * porta * 1.9)} ${f(base)}L${f(cx - lado * porta * 1.05)} ${f(base)}Z" fill="#8a7655"/>`
      + `<path d="M${f(cx - lado * porta * 1.25)} ${f(base - alt * 0.32)}l${f(-lado * 10)} 4" stroke="${CORDA}" stroke-width="3" stroke-linecap="round"/>`
      + `<path d="M${f(cx)} ${f(t - 14)}V${f(t + 6)}" stroke="#2a221a" stroke-width="5" stroke-linecap="round"/></g>`;
    return s;
  };
  // a tenda grande (o pavilhão): paredes retas, o teto em ponta, a faixa e a bandeirinha
  const pavilhao = (cx, base, larg, alt, vira) => {
    const e = cx - larg / 2, d = cx + larg / 2, parede = alt * 0.48, topo = base - alt, ombro = base - parede, lado = vira ? -1 : 1;
    return `<g class="abrigo" data-abrigo="tenda"><ellipse cx="${f(cx)}" cy="${f(base + 4)}" rx="${f(larg * 0.62)}" ry="${f(larg * 0.08)}" fill="#000" opacity=".3"/>`
      + estacaCorda(e + 6, ombro + 4, e - 46, base + 8) + estacaCorda(d - 6, ombro + 4, d + 46, base + 8)
      + `<rect x="${f(e)}" y="${f(ombro)}" width="${f(larg)}" height="${f(parede)}" fill="${LONA_E}"/>`
      + `<rect x="${f(vira ? e : cx)}" y="${f(ombro)}" width="${f(larg / 2)}" height="${f(parede)}" fill="${LONA_C}"/>`
      + `<rect class="luz-lona" x="${f(vira ? e : cx)}" y="${f(ombro)}" width="${f(larg / 2)}" height="${f(parede)}" fill="#ff9a4a"/>`
      + `<path d="M${f(e - 14)} ${f(ombro + 2)}L${f(cx)} ${f(topo)}L${f(d + 14)} ${f(ombro + 2)}Z" fill="#5a2f34"/><path d="M${f(cx)} ${f(topo)}L${f(lado > 0 ? d + 14 : e - 14)} ${f(ombro + 2)}H${f(cx)}Z" fill="#7a3d42"/>`
      + `<path d="M${f(e - 14)} ${f(ombro + 2)}H${f(d + 14)}" stroke="#c7955a" stroke-width="4"/>`
      + [0.25, 0.5, 0.75].map(k => `<path d="M${f(e + larg * k)} ${f(ombro)}V${f(base)}" stroke="${COSTURA}" stroke-width="2" opacity=".4"/>`).join('')
      + `<path d="M${f(cx - larg * 0.12)} ${f(base)}V${f(ombro + parede * 0.18)}Q${f(cx)} ${f(ombro)} ${f(cx + larg * 0.12)} ${f(ombro + parede * 0.18)}V${f(base)}Z" fill="#15110d"/>`
      + `<path d="M${f(cx)} ${f(topo)}v-34" stroke="#2a221a" stroke-width="4"/><path d="M${f(cx)} ${f(topo - 34)}h${f(lado * 30)}l${f(-lado * 6)} 8l${f(lado * 6)} 8h${f(-lado * 30)}" fill="#c7955a"/></g>`;
  };
  // o toldo aberto: a lona esticada em dois postes, uma mesa de caixotes embaixo e a lanterna
  const toldo = (cx, base, larg, vira) => {
    const e = cx - larg / 2, d = cx + larg / 2, alto = base - 150, baixo = base - 96, lado = vira ? -1 : 1, fr = lado > 0 ? d : e, tr = lado > 0 ? e : d;
    return `<g class="abrigo" data-abrigo="toldo"><ellipse cx="${f(cx)}" cy="${f(base + 4)}" rx="${f(larg * 0.6)}" ry="${f(larg * 0.08)}" fill="#000" opacity=".26"/>`
      + `<path d="M${f(fr)} ${f(base)}V${f(alto)}M${f(tr)} ${f(base)}V${f(baixo)}" stroke="#3a2a1d" stroke-width="7"/>`
      + estacaCorda(fr, alto + 4, fr + lado * 50, base + 8) + estacaCorda(tr, baixo + 4, tr - lado * 44, base + 8)
      + `<path d="M${f(tr - lado * 10)} ${f(baixo)}L${f(fr + lado * 14)} ${f(alto)}L${f(fr + lado * 14)} ${f(alto + 34)}L${f(tr - lado * 10)} ${f(baixo + 30)}Z" fill="${LONA_C}"/>`
      + `<path class="luz-lona" d="M${f(tr - lado * 10)} ${f(baixo)}L${f(fr + lado * 14)} ${f(alto)}L${f(fr + lado * 14)} ${f(alto + 34)}L${f(tr - lado * 10)} ${f(baixo + 30)}Z" fill="#ff9a4a"/>`
      + [0.25, 0.5, 0.75].map(k => { const x = tr - lado * 10 + (fr - tr + lado * 24) * k, y = baixo + (alto - baixo) * k; return `<path d="M${f(x)} ${f(y + 32)}q${f(lado * 6)} 10 ${f(lado * 14)} 0" stroke="${COSTURA}" stroke-width="2" fill="none" opacity=".5"/>`; }).join('')
      + `<rect x="${f(cx - 46)}" y="${f(base - 40)}" width="40" height="40" fill="#5a4330" stroke="#3a2a1d" stroke-width="3"/><rect x="${f(cx + 2)}" y="${f(base - 30)}" width="34" height="30" fill="#7a5c3e" stroke="#3a2a1d" stroke-width="3"/>`
      + `<rect x="${f(cx - 52)}" y="${f(base - 46)}" width="96" height="8" rx="2" fill="#7a5c3e"/><ellipse cx="${f(cx - 22)}" cy="${f(base - 50)}" rx="12" ry="4" fill="#c7955a"/><rect x="${f(cx + 14)}" y="${f(base - 62)}" width="10" height="16" rx="3" fill="#ffd27a"/>`
      + `<circle cx="${f(cx + 19)}" cy="${f(base - 56)}" r="22" fill="url(#gLuz)" opacity=".7"/></g>`;
  };
  // a rede entre duas árvores (na mata) ou dois postes, com uma manta
  const rede = (cx, base, larg, lugar) => {
    const e = cx - larg / 2, d = cx + larg / 2, y0 = base - 92, arvore = lugar === 'floresta' || lugar === 'neve';
    const tronco = x => (arvore ? `<path d="M${f(x - 10)} ${f(base)}V${f(base - 200)}h20V${f(base)}Z" fill="#2a1f16"/><path d="M${f(x)} ${f(base - 290)}l46 70h-22l34 50h-116l34-50h-22Z" fill="#0f1a14"/>` : `<path d="M${f(x)} ${f(base)}V${f(base - 120)}" stroke="#3a2a1d" stroke-width="8"/>`);
    return `<g class="abrigo" data-abrigo="rede"><ellipse cx="${f(cx)}" cy="${f(base + 4)}" rx="${f(larg * 0.55)}" ry="${f(larg * 0.07)}" fill="#000" opacity=".22"/>`
      + tronco(e) + tronco(d)
      + `<path d="M${f(e + 8)} ${f(y0)}Q${f(cx)} ${f(y0 + 70)} ${f(d - 8)} ${f(y0)}" stroke="#c7b48a" stroke-width="12" fill="none"/>`
      + `<path d="M${f(e + 8)} ${f(y0)}Q${f(cx)} ${f(y0 + 70)} ${f(d - 8)} ${f(y0)}" stroke="#8a7655" stroke-width="2" stroke-dasharray="6 5" fill="none"/>`
      + `<path d="M${f(cx - 40)} ${f(y0 + 26)}q40 22 84 -4l-6 16q-36 16 -72 0Z" fill="#8f3d4a"/></g>`;
  };
  /* Os abrigos em volta do fogo: as duas barracas de sempre, mais uma ou duas com mais gente (5 e 7), e — pelo que o
     grupo tem no Equipamento — a tenda grande, o toldo e a rede no lugar delas. o: { n (quantos estão na fogueira),
     tipos (Set: 'tenda', 'toldo', 'rede', 'barraca'), lugar } */
  function tiposDeAbrigo(nomes) {
    const t = new Set();
    for (const n of nomes || []) {
      const k = String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      if (/tenda|pavilh/.test(k)) t.add('tenda');
      if (/toldo|lona/.test(k)) t.add('toldo');
      if (/\brede/.test(k)) t.add('rede');
      if (/barraca/.test(k)) t.add('barraca');
    }
    return t;
  }
  const tiposDe = x => (x.tipos instanceof Set ? x.tipos : new Set(Array.isArray(x.tipos) ? x.tipos : []));
  // os dois da frente (a tenda grande no lugar da barraca da esquerda, quando o grupo tem uma)
  function abrigos(o) {
    const tipos = tiposDe(o || {});
    return (tipos.has('tenda') ? pavilhao(300, 612, 330, 200, false) : barraca(300, 610, 320, 190, false)) + barraca(1310, 600, 280, 165, true);
  }
  // os de trás, menores (desenhados antes da caravana: o veículo da beirada fica na frente deles)
  function abrigosTras(o) {
    const x = o || {}, n = Math.max(0, +x.n || 0), tipos = tiposDe(x), lugar = x.lugar || 'floresta', p = [];
    const tras = [];
    if (tipos.has('toldo')) tras.push('toldo');
    if (tipos.has('rede')) tras.push('rede');
    if (n >= 5 || tipos.has('barraca')) tras.push('barraca');
    if (n >= 7) tras.push('barraca');
    // (lá atrás, dos dois lados do fogo: na tela estreita os lados da cena ficam cortados, e a frente é da caravana)
    const VAGAS = [[680, 542, false], [925, 540, true]];
    tras.slice(0, 2).forEach((t, i) => {
      const [cx, base, vira] = VAGAS[i];
      p.push(`<g transform="translate(${cx} ${base}) scale(.5) translate(${-cx} ${-base})">` + (t === 'toldo' ? toldo(cx, base, 230, vira) : t === 'rede' ? rede(cx, base, 230, lugar) : barraca(cx, base, 250, 150, vira)) + '</g>');
    });
    return p.join('');
  }
  const tronco = (x, y, l, cor) => `<g><rect x="${x}" y="${y}" width="${l}" height="30" rx="15" fill="${cor}" stroke="${TRACO}" stroke-width="2.5"/><path d="M${x + 24} ${y + 9}h${l - 60}M${x + 40} ${y + 19}h${l - 80}" stroke="#000" stroke-width="2" opacity=".3" stroke-linecap="round"/><path d="M${x + 18} ${y + 3}h${l - 36}" stroke="#ff9a4a" stroke-width="2" opacity=".3" stroke-linecap="round"/></g>`;
  const ponta = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="15" fill="#6b5138" stroke="${TRACO}" stroke-width="2.5"/><circle cx="${cx}" cy="${cy}" r="9" fill="none" stroke="#3a2a1d" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="3.5" fill="#3a2a1d"/>`;
  function fogueira(o) {
    const r = sorte(7), p = [];
    p.push('<ellipse cx="800" cy="660" rx="560" ry="170" fill="url(#gChao)"/>');
    p.push(abrigos(o));
    p.push(tronco(520, 668, 170, '#3a2a1d') + ponta(535, 683));
    p.push(tronco(910, 668, 170, '#3a2a1d') + ponta(1065, 683));
    p.push('<circle class="brilho" cx="800" cy="600" r="430" fill="url(#gFogo)"/>');
    p.push('<circle cx="800" cy="575" r="120" fill="#ff8a30" opacity=".22" filter="url(#fMacio)"/>');
    // as pedras em roda (as de trás primeiro), acesas do lado do fogo
    for (let i = 0; i < 11; i++) {
      const ang = Math.PI * (1.08 + i * 0.084), x = 800 + Math.cos(ang) * 92, y = 630 + Math.sin(ang) * 22;
      p.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="16" ry="10" fill="#4f4b46" stroke="${TRACO}" stroke-width="2"/><ellipse cx="${f(x + (800 - x) * 0.08)}" cy="${f(y - 3)}" rx="9" ry="4" fill="#ff9a4a" opacity=".35"/>`);
    }
    p.push('<g transform="rotate(16 800 628)"><rect x="716" y="619" width="168" height="18" rx="9" fill="#2a1c13" stroke="#0d0907" stroke-width="2"/><path d="M730 624h140" stroke="#ff7a2a" stroke-width="2" opacity=".55"/></g><g transform="rotate(-16 800 628)"><rect x="716" y="619" width="168" height="18" rx="9" fill="#36241a" stroke="#0d0907" stroke-width="2"/><path d="M730 624h140" stroke="#ff7a2a" stroke-width="2" opacity=".5"/></g>');
    p.push('<ellipse cx="800" cy="626" rx="62" ry="12" fill="#c24a1e" opacity=".85"/><ellipse cx="800" cy="624" rx="40" ry="6" fill="#ffb04a" opacity=".7" filter="url(#fBrilho)"/>');
    for (let i = 0; i < 9; i++) for (const k of [0]) p.push(`<circle cx="${f(752 + r() * 96)}" cy="${f(620 + r() * 12)}" r="${f(2 + r() * 2.5)}" fill="${k ? '' : ['#ff6a1a', '#ffb04a', '#ffd27a'][i % 3]}" opacity=".9"/>`);
    // as línguas de fogo de fora (mais finas, balançando em outro ritmo) e as três de sempre
    p.push('<path class="lingua" d="M770 610C744 580 748 552 764 520C768 552 784 570 790 600Z" fill="#e8642a" opacity=".85"/>');
    p.push('<path class="lingua b" d="M832 608C856 584 856 556 842 528C838 556 820 574 812 600Z" fill="#e8642a" opacity=".85"/>');
    p.push('<path class="chama" d="M800 470C850 540 882 570 860 614C845 640 755 640 740 614C720 570 770 548 800 470Z" fill="#f08a2b"/>');
    p.push('<path class="chama b" d="M800 520C832 565 850 586 838 614C826 632 774 632 762 614C750 586 782 570 800 520Z" fill="#ffc04d"/>');
    p.push('<path class="chama c" d="M800 566C815 588 824 600 817 616C810 626 790 626 783 616C776 600 790 590 800 566Z" fill="#fff1b8"/>');
    p.push('<path d="M800 470C850 540 882 570 860 614" stroke="#fff1b8" stroke-width="3" fill="none" opacity=".35" class="lingua"/>');
    // a fumaça subindo, macia
    p.push('<g opacity=".14" filter="url(#fMacio)"><g class="fumaca"><ellipse cx="806" cy="440" rx="22" ry="44" fill="#c9c2b8"/><ellipse cx="822" cy="360" rx="30" ry="52" fill="#a9a29a"/><ellipse cx="804" cy="270" rx="40" ry="60" fill="#8a847e"/></g></g>');      // (a transparência fica fora: a animação mexe na de dentro)
    for (let i = 0; i < 8; i++) p.push(`<circle class="fagulha" cx="${(778 + r() * 44).toFixed(0)}" cy="${(548 + r() * 20).toFixed(0)}" r="${(1.6 + r() * 1.6).toFixed(1)}" style="--dx:${(-40 + r() * 80).toFixed(0)}px;animation-delay:-${(r() * 3.6).toFixed(1)}s"/>`);
    return p.join('');
  }
  // as outras áreas: o que já está lá antes de qualquer construção (um quintal de trabalho, um canto de estar, um pátio)
  function decorDaArea(area) {
    if (area === 'oficinas') return '<ellipse cx="800" cy="650" rx="560" ry="120" fill="#000" opacity=".12"/>'
      + '<rect x="120" y="600" width="60" height="44" rx="4" fill="#5a4330"/><path d="M120 614h60M120 628h60" stroke="#3a2a1d" stroke-width="3"/><rect x="190" y="616" width="40" height="28" rx="3" fill="#6b5138"/>'
      + '<ellipse cx="1470" cy="640" rx="26" ry="8" fill="#000" opacity=".3"/><rect x="1446" y="590" width="48" height="50" rx="10" fill="#5a4330"/><path d="M1446 604h48M1446 626h48" stroke="#2f2216" stroke-width="4"/>';
    if (area === 'convivio') return '<ellipse cx="800" cy="660" rx="420" ry="110" fill="url(#gChao)" opacity=".7"/>'
      + '<ellipse cx="800" cy="676" rx="230" ry="46" fill="#5b2f3a" opacity=".55"/><ellipse cx="800" cy="676" rx="200" ry="36" fill="none" stroke="#c7955a" stroke-width="3" stroke-dasharray="10 8" opacity=".5"/>'
      + '<circle cx="800" cy="640" r="120" fill="url(#gLuz)" opacity=".5"/><path d="M780 650h40l-6 12h-28Z" fill="#4f4b46"/><path class="chama c" d="M800 612C810 626 814 636 810 646C806 652 794 652 790 646C786 636 790 626 800 612Z" fill="#ffc04d" style="transform-origin:800px 650px"/>';
    // (lote 18) o canto dos caçadores: o toco com o arco e a aljava, a galhada no poste, as armadilhas e a trilha
    if (area === 'caca') return '<ellipse cx="800" cy="660" rx="600" ry="120" fill="#000" opacity=".12"/>'
      + '<path d="M1500 900C1380 760 1260 700 1120 640" stroke="#000" stroke-opacity=".12" stroke-width="70" fill="none"/>'
      + '<ellipse cx="300" cy="648" rx="46" ry="12" fill="#000" opacity=".3"/><path d="M262 648v-46h76v46Z" fill="#5a4330"/><ellipse cx="300" cy="602" rx="38" ry="10" fill="#7a5c3e"/><ellipse cx="300" cy="602" rx="26" ry="6" fill="none" stroke="#5a4330" stroke-width="2"/>'
      + '<path d="M332 600Q368 520 340 430" stroke="#7a4e2c" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M334 598L342 432" stroke="#d8ccb0" stroke-width="1.5"/>'
      + '<path d="M252 604l-14-86h22l6 86Z" fill="#6b4a2e"/><path d="M242 520l-6-26M248 520l2-28M254 520l8-24" stroke="#c7955a" stroke-width="3"/><path d="M232 494l4 -8l4 8ZM248 490l3-8l4 8ZM260 494l5-7l3 9Z" fill="#e8dcc0"/>'
      + '<path d="M460 652V470" stroke="#3a2a1d" stroke-width="9"/><path d="M460 478c-30-10-44-34-40-58M460 478c30-10 44-34 40-58M440 448l-14-10M480 448l14-10M430 430l-10-16M490 430l10-16" stroke="#e0d2b0" stroke-width="6" fill="none" stroke-linecap="round"/>'
      + '<path d="M1180 668h70l-10 -14h-50Z" fill="#4f4b46"/><path d="M1186 654l58 0M1196 654l10 -26l10 26M1226 654l10 -26l10 26" stroke="#8a8f99" stroke-width="3" fill="none"/>'
      + '<path d="M1360 676c18-10 40-10 58 0" stroke="#8a7655" stroke-width="3" fill="none"/><circle cx="1389" cy="672" r="5" fill="none" stroke="#8a7655" stroke-width="2"/>';
    if (area === 'guarda') return '<ellipse cx="800" cy="660" rx="600" ry="120" fill="#000" opacity=".1"/>'
      + '<path d="M760 900C780 760 790 700 800 640" stroke="#000" stroke-opacity=".12" stroke-width="80" fill="none"/>';
    return '';
  }

  /* ---------------- as construções ----------------
     Cada uma num lugar fixo da área dela (x do meio, y do chão); o nível acrescenta coisas ao desenho de baixo. */
  const FUNDO_DA_AREA = new Set(['palicada', 'lanternas']);
  const madeira = '#5a4330', madeiraC = '#7a5c3e', madeiraE = '#3a2a1d', pedra = '#6e6a64', pedraE = '#4f4b46', lona = '#8a7655', lonaE = '#5f513b', metal = '#8a8f99', metalE = '#5d626b';
  const brilho = (x, y, r, op) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gLuz)" opacity="${op || 0.8}"/>`;
  const sombra = (x, y, rx) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${Math.round(rx * 0.22)}" fill="#000" opacity=".28"/>`;
  const frasco = (x, y, cor, alto) => `<path d="M${x - 4} ${y - (alto || 22)}h8v6l6 10v${(alto || 22) - 18}a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-${(alto || 22) - 18}l6-10Z" fill="${cor}" stroke="#1d1b18" stroke-width="1.5"/>`;
  const desenhos = {
    cozinha(x, y, n) {
      let s = sombra(x, y, 110) + `<path d="M${x - 60} ${y}v-46a10 10 0 0 1 10-10h100a10 10 0 0 1 10 10v46Z" fill="${pedra}"/><path d="M${x - 60} ${y - 24}h120M${x - 20} ${y - 56}v22M${x + 20} ${y - 56}v22" stroke="${pedraE}" stroke-width="4"/>`
        + `<path d="M${x - 26} ${y - 56}h52l-6 26h-40Z" fill="#2b2b2e"/><ellipse cx="${x}" cy="${y - 56}" rx="26" ry="6" fill="#3b3b40"/><path d="M${x - 14} ${y - 66}c4-10-4-14 0-24M${x + 6} ${y - 68}c4-10-4-14 0-22" stroke="#c9ced6" stroke-width="3" fill="none" opacity=".45"/>`;
      if (n >= 2) s += `<rect x="${x + 64}" y="${y - 44}" width="90" height="10" rx="3" fill="${madeiraC}"/><path d="M${x + 72} ${y - 34}v34M${x + 146} ${y - 34}v34" stroke="${madeiraE}" stroke-width="6"/>`
        + `<circle cx="${x + 90}" cy="${y - 50}" r="7" fill="#d65a3a"/><circle cx="${x + 106}" cy="${y - 50}" r="6" fill="#e6b54a"/><rect x="${x + 116}" y="${y - 54}" width="26" height="8" rx="2" fill="#a77b4f"/>`
        // o varal das panelas: um poste, a travessa e uma frigideira e uma concha penduradas
        + `<path d="M${x - 92} ${y}v-118M${x - 112} ${y - 112}h44" stroke="${madeiraE}" stroke-width="5"/><path d="M${x - 106} ${y - 112}v10M${x - 76} ${y - 112}v14" stroke="#2a221a" stroke-width="2"/>`
        + `<circle cx="${x - 106}" cy="${y - 92}" r="10" fill="#3b3b40"/><path d="M${x - 106} ${y - 102}v-2" stroke="#3b3b40" stroke-width="4"/><path d="M${x - 76} ${y - 98}v22" stroke="${metal}" stroke-width="3"/><ellipse cx="${x - 76}" cy="${y - 74}" rx="6" ry="4" fill="${metal}"/>`;
      if (n >= 3) s += `<path d="M${x - 100} ${y - 128}L${x + 160} ${y - 120}L${x + 150} ${y - 98}L${x - 92} ${y - 106}Z" fill="${lona}"/><path d="M${x - 92} ${y - 106}v106M${x + 150} ${y - 98}v98" stroke="${madeiraE}" stroke-width="6"/>`
        + `<path d="M${x - 60} ${y - 112}q30 14 60 0q30 14 60 0" stroke="#4b3a26" stroke-width="2" fill="none"/>` + [0, 1, 2, 3, 4].map(i => `<ellipse cx="${x - 52 + i * 28}" cy="${y - 102 + (i % 2) * 4}" rx="5" ry="9" fill="${i % 2 ? '#8b4a2a' : '#6f8f3a'}"/>`).join('')
        + `<rect x="${x + 30}" y="${y - 150}" width="16" height="40" fill="${pedraE}"/><path d="M${x + 38} ${y - 156}c-6-14 8-16 0-30" stroke="#c9ced6" stroke-width="4" fill="none" opacity=".4"/>`;
      return s;
    },
    alquimia(x, y, n) {
      let s = sombra(x, y, 90) + `<rect x="${x - 70}" y="${y - 52}" width="140" height="12" rx="3" fill="${madeiraC}"/><path d="M${x - 60} ${y - 40}v40M${x + 60} ${y - 40}v40" stroke="${madeiraE}" stroke-width="7"/>`
        + frasco(x - 40, y - 52, '#6fd08a') + frasco(x - 12, y - 52, '#c46ad6', 26) + frasco(x + 18, y - 52, '#e6c84a', 18);
      if (n >= 2) s += `<rect x="${x - 76}" y="${y - 140}" width="120" height="8" rx="2" fill="${madeira}"/><path d="M${x - 70} ${y - 132}v80M${x + 38} ${y - 132}v80" stroke="${madeiraE}" stroke-width="5"/>`
        + frasco(x - 58, y - 140, '#5aa8e6', 18) + frasco(x - 34, y - 140, '#e0695f', 20) + frasco(x - 10, y - 140, '#7fc98f', 16) + frasco(x + 14, y - 140, '#e6ab4f', 22)
        + `<path d="M${x + 36} ${y - 52}h22l-4 -14h-14Z" fill="${pedra}"/><path d="M${x + 50} ${y - 66}l8 -14" stroke="${madeiraC}" stroke-width="4"/><path d="M${x + 40} ${y - 52}" stroke="none"/>`
        + `<path d="M${x + 62} ${y - 52}c0-8 6-10 4-16c6 4 6 10 4 16Z" fill="#ffb04a"/>`;
      if (n >= 3) s += brilho(x, y - 70, 120, 0.55) + `<circle cx="${x + 92}" cy="${y - 96}" r="24" fill="#9ad7e6" opacity=".55" stroke="#d8f2f8" stroke-width="2"/><path d="M${x + 100} ${y - 118}c20-18 40-14 46 0l-6 40" stroke="#d8f2f8" stroke-width="5" fill="none" opacity=".8"/>`
        + `<path d="M${x + 80} ${y - 72}h24v20h-24Z" fill="${metalE}"/><path d="M${x + 86} ${y - 72}c2-8 10-8 12 0" fill="#ffb04a"/>`
        + `<path d="M${x - 90} ${y - 160}q40 16 80 0" stroke="#4b3a26" stroke-width="2" fill="none"/>` + [0, 1, 2].map(i => `<path d="M${x - 80 + i * 28} ${y - 158 + i % 2 * 3}l-6 18h12Z" fill="#6f8f3a"/>`).join('');
      return s;
    },
    forja(x, y, n) {
      let s = sombra(x, y, 100) + `<rect x="${x - 22}" y="${y - 40}" width="44" height="40" rx="6" fill="${madeira}"/><path d="M${x - 46} ${y - 52}h70l18 6v8h-24l-6 8h-36Z" fill="#3b3e45"/>`
        + `<path d="M${x + 50} ${y}v-26a24 24 0 0 1 48 0v26Z" fill="${pedraE}"/><path d="M${x + 58} ${y - 22}c6-8 10 0 16-10c4 10 10 6 14 12Z" fill="#ff7a2a"/>`;
      if (n >= 2) s += `<path d="M${x - 140} ${y}v-80h70v80Z" fill="${pedra}"/><path d="M${x - 130} ${y - 80}v-80h50v80Z" fill="${pedraE}"/><path d="M${x - 124} ${y - 40}h38v24h-38Z" fill="#1d120c"/>`
        + `<path d="M${x - 118} ${y - 22}c6-12 12-2 16-14c6 12 12 6 16 14Z" fill="#ff8a2b"/><path d="M${x - 66} ${y - 30}l40 -16l6 10l-40 16Z" fill="${madeiraC}"/><path d="M${x - 30} ${y - 46}l14 -6" stroke="${metal}" stroke-width="4"/>`
        + `<path d="M${x + 110} ${y}v-70M${x + 150} ${y}v-70M${x + 104} ${y - 60}h52" stroke="${madeiraE}" stroke-width="6"/><path d="M${x + 118} ${y - 60}v34M${x + 130} ${y - 60}v28M${x + 142} ${y - 60}v36" stroke="${metal}" stroke-width="4"/>`;
      if (n >= 3) s += brilho(x - 105, y - 30, 110, 0.7) + `<path d="M${x - 170} ${y - 150}L${x + 170} ${y - 150}L${x + 190} ${y - 120}L${x - 190} ${y - 120}Z" fill="#4a3a2a"/><path d="M${x - 180} ${y - 120}v120M${x + 180} ${y - 120}v120" stroke="${madeiraE}" stroke-width="8"/>`
        + `<rect x="${x + 30}" y="${y - 34}" width="30" height="34" rx="4" fill="${madeira}"/><ellipse cx="${x + 45}" cy="${y - 34}" rx="15" ry="4" fill="#4f8fbf"/>`
        + `<path d="M${x + 160} ${y - 20}l18 -70M${x + 172} ${y - 20}l8 -74" stroke="#c9ced6" stroke-width="5"/><path d="M${x + 168} ${y - 88}h18" stroke="#e6ab4f" stroke-width="4"/>`
        + `<path d="M${x - 130} ${y - 160}c-8-16 8-20 0-34M${x - 110} ${y - 162}c-6-14 6-18 0-30" stroke="#c9ced6" stroke-width="4" fill="none" opacity=".35"/>`;
      return s;
    },
    oficina(x, y, n) {
      let s = sombra(x, y, 90) + `<path d="M${x - 60} ${y}l14-40M${x - 30} ${y}l-14-40M${x + 30} ${y}l14-40M${x + 60} ${y}l-14-40" stroke="${madeiraE}" stroke-width="6"/><rect x="${x - 70}" y="${y - 48}" width="140" height="12" rx="2" fill="${madeiraC}"/>`
        + `<path d="M${x + 20} ${y - 48}l20 -10" stroke="${metal}" stroke-width="4"/><path d="M${x - 40} ${y - 52}h24" stroke="${metalE}" stroke-width="5"/>`;
      if (n >= 2) s += `<path d="M${x + 80} ${y}v-110M${x + 150} ${y}v-110M${x + 74} ${y - 104}h82" stroke="${madeiraE}" stroke-width="6"/><path d="M${x + 88} ${y - 104}q12 40-2 70h26q-12-30 0-70Z" fill="#a0683c"/><path d="M${x + 120} ${y - 104}q14 34 0 60h22q-10-30 2-60Z" fill="#7a4e2c"/>`
        + `<path d="M${x - 120} ${y}h60l-10-22h-40Z" fill="${madeira}"/><path d="M${x - 112} ${y - 22}h46" stroke="${madeiraC}" stroke-width="4"/>`;
      if (n >= 3) s += `<path d="M${x - 140} ${y - 150}L${x + 170} ${y - 130}V${y - 112}L${x - 140} ${y - 130}Z" fill="${lona}"/><path d="M${x - 136} ${y - 130}v130M${x + 166} ${y - 112}v112" stroke="${madeiraE}" stroke-width="6"/>`
        + `<path d="M${x - 170} ${y}h44v-12h-44Zm0 -12h44v-12h-44Zm4 -12h36v-12h-36Z" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="2"/>`
        + `<path d="M${x + 20} ${y - 48}c0-18 10-26 22-24l6 24Z" fill="#5a3a22"/><path d="M${x - 12} ${y - 48}v-20h12l4 20Z" fill="#6b4a2e"/>`;
      return s;
    },
    bardo(x, y, n) {
      let s = sombra(x, y, 70) + `<path d="M${x - 24} ${y}v-36M${x + 24} ${y}v-36" stroke="${madeiraE}" stroke-width="6"/><rect x="${x - 32}" y="${y - 44}" width="64" height="10" rx="4" fill="${madeiraC}"/>`
        + `<ellipse cx="${x + 46}" cy="${y - 26}" rx="16" ry="20" fill="#b97a3c" transform="rotate(-18 ${x + 46} ${y - 26})"/><path d="M${x + 52} ${y - 44}l14 -46" stroke="#7a4e2c" stroke-width="6" stroke-linecap="round"/><circle cx="${x + 44}" cy="${y - 24}" r="5" fill="#3a2414"/>`;
      if (n >= 2) s += `<path d="M${x - 110} ${y + 4}v-26h220v26Z" fill="${madeira}"/><path d="M${x - 110} ${y - 22}h220" stroke="${madeiraC}" stroke-width="5"/>`
        + `<path d="M${x - 96} ${y - 22}v-110M${x + 96} ${y - 22}v-110" stroke="${madeiraE}" stroke-width="6"/><path d="M${x - 96} ${y - 126}h192" stroke="#4b3a26" stroke-width="3"/>`
        + `<path d="M${x - 80} ${y - 126}v34l14 -8l14 8v-34Z" fill="#8f3d4a"/><path d="M${x + 52} ${y - 126}v34l14 -8l14 8v-34Z" fill="#3d6a8f"/>`;
      if (n >= 3) s += brilho(x, y - 60, 120, 0.5) + `<path d="M${x - 120} ${y - 150}Q${x} ${y - 196} ${x + 120} ${y - 150}" stroke="#4b3a26" stroke-width="3" fill="none"/>`
        + [0, 1, 2, 3, 4, 5, 6].map(i => { const px = x - 102 + i * 34, py = y - 156 - Math.round(Math.sin(i / 6 * Math.PI) * 24); return `<path d="M${px} ${py}l8 18l8 -18Z" fill="${['#e0695f', '#e6c84a', '#5aa8e6', '#7fc98f', '#c46ad6', '#f39a4a', '#e0695f'][i]}"/>`; }).join('')
        + `<ellipse cx="${x - 60}" cy="${y - 40}" rx="18" ry="14" fill="#8a5a34"/><ellipse cx="${x - 60}" cy="${y - 50}" rx="18" ry="5" fill="#e8dcc0"/>`
        + `<path class="nota" d="M${x + 70} ${y - 100}v-22l12 -4v20" stroke="#ffd27a" stroke-width="3" fill="none"/><circle class="nota" cx="${x + 67}" cy="${y - 100}" r="4" fill="#ffd27a"/>`;
      return s;
    },
    mesa(x, y, n) {
      let s = sombra(x, y, 150) + `<rect x="${x - 140}" y="${y - 50}" width="280" height="12" rx="3" fill="${madeiraC}"/><path d="M${x - 120} ${y - 38}l-12 38M${x - 110} ${y - 38}l12 38M${x + 110} ${y - 38}l-12 38M${x + 120} ${y - 38}l12 38" stroke="${madeiraE}" stroke-width="6"/>`;
      if (n >= 2) s += `<rect x="${x - 150}" y="${y - 22}" width="300" height="8" rx="3" fill="${madeira}" transform="translate(0 4)"/>`
        + [-100, -50, 0, 50, 100].map((d, i) => (i % 2 ? `<rect x="${x + d - 7}" y="${y - 66}" width="14" height="16" rx="2" fill="#a77b4f"/>` : `<ellipse cx="${x + d}" cy="${y - 52}" rx="14" ry="4" fill="#cfc6b4"/>`)).join('')
        + `<rect x="${x - 4}" y="${y - 76}" width="8" height="24" fill="#efe6d0"/><path d="M${x} ${y - 84}c-4 4-2 8 0 8c2 0 4-4 0-8Z" fill="#ffc04d"/>` + brilho(x, y - 78, 60, 0.6);
      if (n >= 3) s += `<path d="M${x - 146} ${y - 50}h292l-10 26h-272Z" fill="#8f3d4a" opacity=".85"/><path d="M${x - 180} ${y}v-150M${x + 180} ${y}v-150M${x - 190} ${y - 146}h380" stroke="${madeiraE}" stroke-width="7"/>`
        + `<path d="M${x - 180} ${y - 146}q60 20 120 0q60 20 120 0q60 20 120 0" stroke="#6f8f3a" stroke-width="5" fill="none"/>`
        + `<ellipse cx="${x + 196}" cy="${y - 22}" rx="22" ry="26" fill="${madeira}"/><path d="M${x + 176} ${y - 32}h40M${x + 176} ${y - 12}h40" stroke="${madeiraE}" stroke-width="3"/>`
        + `<ellipse cx="${x - 70}" cy="${y - 54}" rx="22" ry="8" fill="#b8642e"/><circle cx="${x + 70}" cy="${y - 58}" r="9" fill="#d65a3a"/><circle cx="${x + 84}" cy="${y - 56}" r="7" fill="#e6b54a"/>`;
      return s;
    },
    banho(x, y, n) {
      let s = sombra(x, y, 80) + `<path d="M${x - 56} ${y - 54}h112l-8 54h-96Z" fill="${madeira}"/><path d="M${x - 54} ${y - 40}h108M${x - 50} ${y - 18}h100" stroke="${madeiraE}" stroke-width="4"/><ellipse cx="${x}" cy="${y - 54}" rx="56" ry="10" fill="#4f8fbf"/>`;
      if (n >= 2) s += `<path d="M${x + 70} ${y}v-120l40 6v114ZM${x + 110} ${y}v-114l40 -6v120Z" fill="#c7b8a0" stroke="${madeiraE}" stroke-width="3"/>`
        + `<path d="M${x - 30} ${y - 66}c-8-12 6-16 0-30M${x} ${y - 70}c-8-12 6-16 0-28M${x + 30} ${y - 66}c-8-12 6-16 0-30" stroke="#e8eef4" stroke-width="4" fill="none" opacity=".5"/>`;
      if (n >= 3) s += `<path d="M${x - 100} ${y + 4}h220v-10h-220Z" fill="${madeiraC}"/><path d="M${x - 110} ${y}v-80M${x - 80} ${y}v-80M${x - 114} ${y - 72}h38" stroke="${madeiraE}" stroke-width="5"/><path d="M${x - 108} ${y - 72}v40h24v-40Z" fill="#e6e0d0"/>`
        + `<circle cx="${x + 160}" cy="${y - 10}" r="9" fill="#ec6fa0"/><circle cx="${x + 174}" cy="${y - 16}" r="8" fill="#f2c94c"/><path d="M${x + 166} ${y}v-10" stroke="#3f8a55" stroke-width="3"/>` + brilho(x - 140, y - 90, 50, 0.7)
        + `<path d="M${x - 140} ${y - 90}v-16" stroke="#4b3a26" stroke-width="2"/><rect x="${x - 148}" y="${y - 92}" width="16" height="20" rx="4" fill="#ffd27a"/>`;
      return s;
    },
    lanternas(x, y, n) {
      // um varal de lanternas no alto da área, de um poste a outro
      const cores = ['#e0695f', '#f2c94c', '#5aa8e6', '#7fc98f', '#c46ad6', '#f39a4a'];
      const linha = (y0, qtd, curva, raio) => {
        let s = `<path d="M180 ${y0}Q800 ${y0 + curva} 1420 ${y0}" stroke="#2a221a" stroke-width="3" fill="none"/>`;
        for (let i = 0; i < qtd; i++) { const t = (i + 1) / (qtd + 1), px = 180 + t * 1240, py = y0 + 2 * t * (1 - t) * curva; s += `<path d="M${f(px)} ${f(py)}v8" stroke="#2a221a" stroke-width="2"/>` + (raio > 9 ? brilho(f(px), f(py + 18), raio * 3, 0.45) : '') + `<ellipse cx="${f(px)}" cy="${f(py + 18)}" rx="${raio}" ry="${raio * 1.3}" fill="${cores[i % cores.length]}" opacity=".95"/>`; }
        return s;
      };
      let s = `<path d="M170 650V420M1430 650V420" stroke="${madeiraE}" stroke-width="10"/>` + linha(430, 5, 90, 8);
      if (n >= 2) s += linha(466, 7, 70, 9);
      if (n >= 3) s = `<path d="M170 650V400M1430 650V400" stroke="${madeiraE}" stroke-width="12"/>` + linha(410, 6, 110, 12) + linha(452, 9, 80, 10)
        + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => { const t = (i + 0.5) / 11, px = 180 + t * 1240, py = 500 + 2 * t * (1 - t) * 40; return `<path d="M${f(px - 12)} ${f(py)}l12 20l12 -20Z" fill="${cores[i % cores.length]}" opacity=".9"/>`; }).join('')
        + `<path d="M180 500Q800 540 1420 500" stroke="#2a221a" stroke-width="2" fill="none"/>`;
      return s;
    },
    palicada(x, y, n) {
      // estacas no fundo da área (de pontas, cobrindo mais a cada nível)
      const estaca = (px, alto) => `<path d="M${px - 11} 600v-${alto}l11 -16l11 16v${alto}Z" fill="${madeira}"/><path d="M${px - 11} 600v-${alto}l11 -16" fill="${madeiraC}" opacity=".5"/>`;
      let s = '';
      const trechos = n >= 2 ? [[60, 1540]] : [[80, 560], [1040, 1520]];
      for (const [a, b] of trechos) for (let px = a; px <= b; px += 24) { if (n >= 2 && px > 740 && px < 860) continue; s += estaca(px, 70 + ((px * 7) % 13)); }
      s += `<path d="M60 560H1540" stroke="${madeiraE}" stroke-width="5" opacity=".9"/>`;
      if (n >= 2) s += `<path d="M740 600v-110M860 600v-110M734 496h132" stroke="${madeiraE}" stroke-width="9"/><path d="M748 600v-90h48v90ZM804 600v-90h48v90Z" fill="${madeiraC}" opacity=".9"/>`;
      if (n >= 3) s += `<path d="M60 540H1540" stroke="${madeiraC}" stroke-width="8"/>` + [320, 1280].map(px => brilho(px, 470, 70, 0.8) + `<path d="M${px} 600v-120" stroke="${madeiraE}" stroke-width="6"/><path d="M${px} 480c-8-12 0-22 0-30c8 10 10 20 0 30Z" fill="#ffb04a"/>`).join('')
        + `<path d="M700 470v-60l40 14l-40 14" fill="#8f3d4a" stroke="${madeiraE}" stroke-width="3"/><path d="M900 470v-60l40 14l-40 14" fill="#8f3d4a" stroke="${madeiraE}" stroke-width="3"/>`;
      return s;
    },
    torre(x, y, n) {
      const alto = n >= 3 ? 280 : n >= 2 ? 230 : 190;
      let s = sombra(x, y, 70) + `<path d="M${x - 40} ${y}L${x - 26} ${y - alto}M${x + 40} ${y}L${x + 26} ${y - alto}" stroke="${madeiraE}" stroke-width="8"/>`
        + `<path d="M${x - 36} ${y - 40}L${x + 30} ${y - 100}M${x + 36} ${y - 40}L${x - 30} ${y - 100}M${x - 32} ${y - 110}L${x + 28} ${y - 160}" stroke="${madeira}" stroke-width="5"/>`
        + `<rect x="${x - 44}" y="${y - alto - 8}" width="88" height="12" fill="${madeiraC}"/>`;
      if (n >= 2) s += `<path d="M${x - 44} ${y - alto - 8}v-30M${x + 44} ${y - alto - 8}v-30M${x - 44} ${y - alto - 24}h88" stroke="${madeira}" stroke-width="4"/>`
        + `<path d="M${x - 56} ${y - alto - 38}L${x} ${y - alto - 80}L${x + 56} ${y - alto - 38}Z" fill="${lonaE}"/>`;
      if (n >= 3) s += `<path d="M${x} ${y - alto - 80}v-40" stroke="${madeiraE}" stroke-width="4"/><path d="M${x} ${y - alto - 120}h34l-8 10l8 10h-34" fill="#8f3d4a"/>`
        + brilho(x + 30, y - alto - 20, 50, 0.8) + `<rect x="${x + 24}" y="${y - alto - 30}" width="12" height="16" rx="3" fill="#ffd27a"/>`
        + `<path d="M${x - 28} ${y - alto - 50}a8 8 0 0 1 16 0v8h-16Z" fill="#c7955a"/>`;
      return s;
    },
    alarmes(x, y, n) {
      const sino = (px, py) => `<path d="M${px - 6} ${py + 12}a6 9 0 0 1 12 0h2v3h-16v-3Z" fill="#c7955a"/><circle cx="${px}" cy="${py + 16}" r="2" fill="#5a4330"/>`;
      let s = `<path d="M${x - 70} ${y}v-80M${x + 70} ${y}v-80" stroke="${madeiraE}" stroke-width="6"/><path d="M${x - 70} ${y - 74}Q${x} ${y - 50} ${x + 70} ${y - 74}" stroke="#8a7655" stroke-width="2" fill="none"/>` + sino(x - 26, y - 66) + sino(x + 26, y - 66);
      if (n >= 2) s += sino(x, y - 64) + `<path d="M${x - 70} ${y - 40}Q${x} ${y - 20} ${x + 70} ${y - 40}" stroke="#8a7655" stroke-width="2" fill="none"/>` + sino(x - 36, y - 34) + sino(x + 36, y - 34)
        + [-90, -60, 60, 90].map(d => `<path d="M${x + d - 8} ${y}l8 -22l8 22Z" fill="${madeiraC}"/>`).join('');
      if (n >= 3) s += [-150, -125, 125, 150].map(d => `<path d="M${x + d} ${y + 6}l6 -10l6 10l-6 -4Z" fill="${metal}"/>`).join('')
        + `<path d="M${x - 130} ${y}v-50" stroke="${madeiraE}" stroke-width="4"/><path d="M${x - 152} ${y - 78}h44v28h-44Z" fill="${madeiraC}"/><path d="M${x - 130} ${y - 72}v12M${x - 130} ${y - 56}v2" stroke="#8f3d4a" stroke-width="4"/>`;
      return s;
    },
    enfermaria(x, y, n) {
      const cama = (px, py) => `<rect x="${px - 50}" y="${py - 30}" width="100" height="14" rx="3" fill="${madeira}"/><path d="M${px - 46} ${py - 16}v16M${px + 46} ${py - 16}v16" stroke="${madeiraE}" stroke-width="5"/><rect x="${px - 48}" y="${py - 40}" width="96" height="12" rx="5" fill="#d8d2c4"/><rect x="${px - 48}" y="${py - 42}" width="26" height="12" rx="5" fill="#f0ece2"/>`;
      const caixa = (px, py) => `<rect x="${px - 16}" y="${py - 22}" width="32" height="22" rx="3" fill="#e8e2d2"/><path d="M${px - 6} ${py - 11}h12M${px} ${py - 17}v12" stroke="#4f9a5a" stroke-width="4"/>`;
      if (n < 2) return sombra(x, y, 70) + cama(x, y) + caixa(x + 66, y);
      let s = sombra(x, y, 120) + `<path d="M${x - 110} ${y - 6}L${x} ${y - 160}L${x + 110} ${y - 6}Z" fill="#cfc6b4"/><path d="M${x} ${y - 160}L${x + 110} ${y - 6}H${x}Z" fill="#b5ab97"/><path d="M${x} ${y - 104}L${x + 30} ${y - 6}H${x - 30}Z" fill="#3a3530"/>`
        + `<path d="M${x} ${y - 172}v-26" stroke="${madeiraE}" stroke-width="4"/><path d="M${x} ${y - 198}h36v22h-36Z" fill="#f0ece2"/><path d="M${x + 18} ${y - 193}c-7 4-7 11 0 13c7-2 7-9 0-13Z" fill="#4f9a5a"/>` + cama(x - 20, y + 4) + caixa(x + 84, y);
      if (n >= 3) s += cama(x + 140, y + 4) + brilho(x - 64, y - 74, 60, 0.75) + `<path d="M${x - 64} ${y - 96}v-10" stroke="#4b3a26" stroke-width="2"/><rect x="${x - 71}" y="${y - 96}" width="14" height="18" rx="3" fill="#ffd27a"/>`
        + `<path d="M${x - 96} ${y - 60}q20 -10 40 0" stroke="#4b3a26" stroke-width="2" fill="none"/><path d="M${x - 90} ${y - 58}l-4 12h8ZM${x - 74} ${y - 56}l-4 12h8Z" fill="#6f8f3a"/>`;
      return s;
    },
    estudo(x, y, n) {
      let s = sombra(x, y, 70) + `<rect x="${x - 50}" y="${y - 50}" width="100" height="10" rx="3" fill="${madeiraC}"/><path d="M${x - 40} ${y - 40}v40M${x + 40} ${y - 40}v40" stroke="${madeiraE}" stroke-width="6"/>`
        + `<path d="M${x - 30} ${y - 58}l26 -4v8l-26 4Z M${x - 4} ${y - 62}l26 4v8l-26 -4Z" fill="#e8dcc0" stroke="#7a4e2c" stroke-width="2"/><rect x="${x + 28}" y="${y - 74}" width="7" height="22" fill="#efe6d0"/><path d="M${x + 31} ${y - 82}c-4 4-2 8 0 8c2 0 4-4 0-8Z" fill="#ffc04d"/>`;
      if (n >= 2) s += `<path d="M${x - 130} ${y}v-124h60v124Z" fill="${madeira}"/><path d="M${x - 130} ${y - 42}h60M${x - 130} ${y - 84}h60" stroke="${madeiraE}" stroke-width="4"/>`
        + ['#8f3d4a', '#3d6a8f', '#6f8f3a', '#c7955a'].map((c, i) => `<rect x="${x - 126 + i * 13}" y="${y - 120 + (i % 2) * 4}" width="11" height="${34 - (i % 2) * 4}" fill="${c}"/><rect x="${x - 125 + i * 13}" y="${y - 78}" width="11" height="34" fill="${c}"/>`).join('')
        + `<path d="M${x + 66} ${y}v-112M${x + 136} ${y}v-112" stroke="${madeiraE}" stroke-width="4"/><rect x="${x + 60}" y="${y - 122}" width="82" height="56" fill="#d8c9a4" stroke="${madeiraE}" stroke-width="3"/><path d="M${x + 70} ${y - 104}q18-12 30 4t28-8" stroke="#7a4e2c" stroke-width="2" fill="none"/><circle cx="${x + 120}" cy="${y - 82}" r="4" fill="#8f3d4a"/>`;
      if (n >= 3) s += brilho(x, y - 70, 110, 0.6) + `<path d="M${x - 150} ${y - 160}H${x + 160}L${x + 146} ${y - 138}H${x - 136}Z" fill="#3d4a6a"/><path d="M${x - 146} ${y - 138}v138M${x + 156} ${y - 138}v138" stroke="${madeiraE}" stroke-width="6"/>`
        + `<circle cx="${x - 18}" cy="${y - 74}" r="13" fill="#4f8fbf"/><path d="M${x - 31} ${y - 74}h26M${x - 18} ${y - 87}c-7 8-7 18 0 26" stroke="#7fc98f" stroke-width="2" fill="none"/><path d="M${x - 18} ${y - 61}v8" stroke="#c7955a" stroke-width="3"/>`
        + `<path d="M${x + 150} ${y}l12 -50l9 3l-12 50Z" fill="${metalE}"/><path d="M${x + 158} ${y - 48}l22 -32l7 5l-22 32Z" fill="#c7955a"/>`;
      return s;
    },
    santuario(x, y, n) {
      let s = sombra(x, y, 60) + `<path d="M${x - 30} ${y}h60l-6 -16h-48Z" fill="${pedra}"/><path d="M${x - 22} ${y - 16}h44l-6 -14h-32Z" fill="${pedraE}"/><path d="M${x - 14} ${y - 30}h28l-4 -12h-20Z" fill="${pedra}"/>`
        + `<rect x="${x - 3}" y="${y - 58}" width="6" height="16" fill="#efe6d0"/><path d="M${x} ${y - 66}c-4 4-2 8 0 8c2 0 4-4 0-8Z" fill="#ffc04d"/>`;
      if (n >= 2) s = sombra(x, y, 90) + `<rect x="${x - 60}" y="${y - 50}" width="120" height="50" rx="4" fill="${pedra}"/><rect x="${x - 70}" y="${y - 58}" width="140" height="12" rx="3" fill="${pedraE}"/>`
        + [-40, -14, 14, 40].map((d, i) => `<rect x="${x + d - 3}" y="${y - 78 + (i % 2) * 6}" width="6" height="${20 - (i % 2) * 6}" fill="#efe6d0"/><path d="M${x + d} ${y - 86 + (i % 2) * 6}c-4 4-2 8 0 8c2 0 4-4 0-8Z" fill="#ffc04d"/>`).join('')
        + `<circle cx="${x - 76}" cy="${y - 6}" r="8" fill="#ec6fa0"/><circle cx="${x - 88}" cy="${y - 12}" r="7" fill="#f2c94c"/><circle cx="${x + 80}" cy="${y - 8}" r="8" fill="#a184e0"/>` + brilho(x, y - 80, 70, 0.6);
      if (n >= 3) s += `<path d="M${x - 110} ${y}v-170M${x + 110} ${y}v-170" stroke="${pedraE}" stroke-width="20"/><path d="M${x - 130} ${y - 168}Q${x} ${y - 230} ${x + 130} ${y - 168}" stroke="${pedra}" stroke-width="22" fill="none"/>`
        + [[-60, -130], [60, -140], [0, -170]].map(([dx, dy], i) => `<circle class="orbe" cx="${x + dx}" cy="${y + dy}" r="7" fill="#ffe9a8" style="animation-delay:-${i * 1.3}s"/>` + brilho(x + dx, y + dy, 26, 0.7)).join('');
      return s;
    },
    // (lote 18) o defumadouro: o varal de carne sobre a fumaça; a armação com a pele (2); a cabana de defumar (3)
    defumadouro(x, y, n) {
      const tira = (px, py, a) => `<path d="M${px} ${py}v${a}l-5 6h10l-5 -6" stroke="#7a3a2a" stroke-width="7" stroke-linecap="round" fill="none"/>`;
      const fumaca = (px, py) => `<path class="fumaca" d="M${px} ${py}c-10-18 12-26 0-46c-10-16 10-24 2-40" stroke="#c9ced6" stroke-width="7" fill="none" stroke-linecap="round" opacity=".35"/>`;
      let s = sombra(x, y, 90) + `<path d="M${x - 70} ${y}l14 -110M${x + 70} ${y}l-14 -110M${x - 62} ${y - 104}h124" stroke="${madeiraE}" stroke-width="6"/>`
        + [-40, -16, 8, 32].map((d, i) => tira(x + d, y - 100, 30 + (i % 2) * 10)).join('')
        + `<ellipse cx="${x}" cy="${y - 6}" rx="26" ry="7" fill="#3a2a1d"/><path d="M${x - 10} ${y - 8}c4-10 10-4 10-14c4 8 8 6 10 14Z" fill="#c24a1e"/>` + fumaca(x - 4, y - 18);
      if (n >= 2) s += `<path d="M${x + 110} ${y}V${y - 120}M${x + 190} ${y}V${y - 120}M${x + 104} ${y - 114}h92M${x + 104} ${y - 16}h92" stroke="${madeiraE}" stroke-width="5"/>`
        + `<path d="M${x + 118} ${y - 108}q32 -6 64 0q6 40 -4 84q-28 6 -56 0q-10 -44 -4 -84Z" fill="#b08a5c" stroke="#7a5c3e" stroke-width="2"/>`
        + `<path d="M${x + 118} ${y - 108}l-8 -6M${x + 182} ${y - 108}l8 -6M${x + 122} ${y - 24}l-10 6M${x + 178} ${y - 24}l10 6" stroke="${CORDA}" stroke-width="2"/>`
        + `<path d="M${x - 130} ${y}h40l-6 -30h-28Z" fill="${madeira}"/><path d="M${x - 126} ${y - 22}h32" stroke="${madeiraE}" stroke-width="3"/>`;
      if (n >= 3) s = sombra(x, y, 150) + `<path d="M${x - 90} ${y}V${y - 110}H${x + 50}V${y}Z" fill="#4f3a28"/><path d="M${x - 108} ${y - 106}L${x - 20} ${y - 176}L${x + 68} ${y - 106}Z" fill="#3a2a1d"/>`
        + `<path d="M${x - 90} ${y - 36}h140M${x - 90} ${y - 72}h140" stroke="#3a2a1d" stroke-width="3"/><rect x="${x - 40}" y="${y - 64}" width="40" height="64" fill="#15110d"/>`
        + [-70, -54, 22, 38].map((d, i) => tira(x + d, y - 102, 22 + (i % 2) * 8)).join('') + fumaca(x - 40, y - 180) + fumaca(x - 10, y - 170)
        + `<path d="M${x + 110} ${y}V${y - 120}M${x + 190} ${y}V${y - 120}M${x + 104} ${y - 114}h92M${x + 104} ${y - 16}h92" stroke="${madeiraE}" stroke-width="5"/>`
        + `<path d="M${x + 118} ${y - 108}q32 -6 64 0q6 40 -4 84q-28 6 -56 0q-10 -44 -4 -84Z" fill="#b08a5c" stroke="#7a5c3e" stroke-width="2"/>`
        + `<path d="M${x - 150} ${y}h44v-30h-44Z" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="2"/><path d="M${x - 140} ${y - 30}l6 -14h16l6 14" fill="#7a3a2a"/>`;
      return s;
    },
    horta(x, y, n) {
      const broto = (px, py, cor) => `<path d="M${px} ${py}c-6-10-14-10-16-6c6 4 10 6 16 6Zm0 0c4-12 12-14 16-10c-6 4-10 8-16 10Z" fill="${cor || '#6fbf6f'}"/>`;
      let s = `<ellipse cx="${x}" cy="${y - 6}" rx="80" ry="16" fill="#3b2a1d"/>` + [-50, -20, 10, 40].map(d => broto(x + d, y - 8)).join('');
      if (n >= 2) s = `<rect x="${x - 120}" y="${y - 24}" width="110" height="22" rx="3" fill="${madeira}"/><rect x="${x + 10}" y="${y - 24}" width="110" height="22" rx="3" fill="${madeira}"/>`
        + `<rect x="${x - 114}" y="${y - 28}" width="98" height="8" rx="3" fill="#3b2a1d"/><rect x="${x + 16}" y="${y - 28}" width="98" height="8" rx="3" fill="#3b2a1d"/>`
        + [-100, -76, -52, -28].map((d, i) => broto(x + d, y - 28, i % 2 ? '#7fc98f' : '#5aa85a')).join('') + [30, 54, 78, 102].map((d, i) => `<circle cx="${x + d}" cy="${y - 34}" r="${6 + (i % 2) * 2}" fill="${i % 2 ? '#d65a3a' : '#e6b54a'}"/><path d="M${x + d} ${y - 40}v-6" stroke="#4f9a5a" stroke-width="3"/>`).join('')
        + `<path d="M${x + 136} ${y - 2}h28l4 -26h-36Z" fill="${metal}"/><path d="M${x + 164} ${y - 22}l18 -10" stroke="${metal}" stroke-width="4"/>`;
      if (n >= 3) s += `<path d="M${x - 150} ${y}v-40M${x + 190} ${y}v-40M${x - 150} ${y - 30}H${x + 190}M${x - 150} ${y - 14}H${x + 190}" stroke="${madeiraC}" stroke-width="4"/>`
        + `<path d="M${x + 200} ${y}v-110M${x + 176} ${y - 80}h48" stroke="${madeiraE}" stroke-width="5"/><circle cx="${x + 200}" cy="${y - 118}" r="12" fill="#c7a46a"/><path d="M${x + 184} ${y - 122}h32l-6 -12h-20Z" fill="#7a5c3e"/><path d="M${x + 186} ${y - 80}h28v36h-28Z" fill="#6a7f4a"/>`
        + [-130, -110].map((d, i) => `<circle cx="${x + d}" cy="${y - 52}" r="7" fill="${i ? '#ec6fa0' : '#f2c94c'}"/><path d="M${x + d} ${y - 45}v14" stroke="#3f8a55" stroke-width="3"/>`).join('');
      return s;
    },
  };
  /* Até onde cada construção vai, para a esquerda e para a direita do ponto dela, em cada nível (em px da cena, sem a
     escala): é o que a área usa para arrumar lado a lado as que estão de pé. */
  const EXT = {
    cozinha: [[-60, 60], [-98, 154], [-100, 160]], alquimia: [[-70, 70], [-76, 70], [-90, 146]], forja: [[-46, 98], [-140, 156], [-190, 190]],
    oficina: [[-70, 70], [-120, 156], [-170, 170]], bardo: [[-32, 66], [-110, 110], [-120, 120]], mesa: [[-140, 140], [-150, 150], [-190, 218]],
    banho: [[-56, 56], [-56, 150], [-148, 182]], torre: [[-44, 44], [-56, 56], [-56, 64]], alarmes: [[-70, 70], [-98, 98], [-152, 162]],
    enfermaria: [[-50, 82], [-110, 110], [-110, 190]], estudo: [[-50, 50], [-130, 142], [-150, 187]], santuario: [[-30, 30], [-90, 90], [-130, 130]],
    horta: [[-80, 80], [-120, 182], [-150, 224]], defumadouro: [[-70, 70], [-130, 196], [-150, 196]],
  };
  const ORDEM = Object.keys(EXT);
  const nivelOk = v => Math.max(1, Math.min(3, Math.round(+v) || 1));
  // uma construção desenhada com o chão do meio dela em (x, y), na escala k
  const umaConstrucao = (tipo, n, x, y, k) => `<g class="construcao" data-tipo="${tipo}" data-nivel="${n}" transform="translate(${f(x)} ${f(y)}) scale(${f(k * 100) / 100})">${desenhos[tipo](0, 0, n)}</g>`;
  // a construção sozinha, no meio da cena (para as prévias); a das bandas (paliçada, lanternas) ocupa a largura toda
  function construcao(tipo, nivel) {
    if (!desenhos[tipo]) return '';
    const n = nivelOk(nivel);
    if (FUNDO_DA_AREA.has(tipo)) return `<g class="construcao" data-tipo="${tipo}" data-nivel="${n}">${desenhos[tipo](800, 0, n)}</g>`;
    return umaConstrucao(tipo, n, 800, 650, 1.3);
  }
  /* As construções de pé numa área, lado a lado, na ordem do catálogo: grandes (até 1,35×) quando são poucas, menores
     quando são muitas, sempre dentro da cena. A cozinha tem lugar certo, ao lado da fogueira. */
  function arrumar(cs) {
    const itens = cs.filter(c => desenhos[c.tipo] && EXT[c.tipo]).map(c => ({ tipo: c.tipo, n: nivelOk(c.nivel) }))
      .sort((a, b) => ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo));
    const out = [], soltas = [];
    for (const c of itens) if (c.tipo === 'cozinha') out.push(umaConstrucao('cozinha', c.n, 1040, 650, 1.15)); else soltas.push(c);
    if (!soltas.length) return out.join('');
    const GAP = 36, larg = soltas.reduce((t, c) => t + EXT[c.tipo][c.n - 1][1] - EXT[c.tipo][c.n - 1][0], 0) + GAP * (soltas.length - 1);
    const k = Math.min(1.35, 1380 / larg);
    let cur = 800 - larg * k / 2;
    soltas.forEach((c, i) => {
      const [e, d] = EXT[c.tipo][c.n - 1];
      out.push(umaConstrucao(c.tipo, c.n, cur - e * k, i % 2 ? 660 : 646, k));
      cur += (d - e + GAP) * k;
    });
    return out.join('');
  }

  /* ---------------- a caravana na cena ----------------
     Até seis veículos e animais: atrás, entre as barracas e o fogo, e nas beiradas (o barco fica no mar, quando há
     mar; em terra, vai numa carreta). [x, chão, para que lado olha, escala] */
  const CANTOS = [[575, 556, 1, 0.72], [1040, 552, -1, 0.72], [60, 646, 1, 1], [1540, 646, -1, 1], [380, 540, 1, 0.55], [1240, 538, -1, 0.55]];
  /* (lote 18) As rodas com raios; a quebrada: o aro aberto, raios faltando e um pedaço caído no chão. */
  function roda(cx, cy, r, quebrada) {
    const pt = (a, k) => f(cx + Math.cos(a) * r * k) + ' ' + f(cy + Math.sin(a) * r * k);
    if (!quebrada) {
      let s0 = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="none" stroke="${madeiraE}" stroke-width="6"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r - 4)}" fill="none" stroke="${madeiraC}" stroke-width="1.5" opacity=".6"/>`;
      for (let i = 0; i < 8; i++) s0 += `<path d="M${pt(i * Math.PI / 4, 0.2)}L${pt(i * Math.PI / 4, 0.94)}" stroke="${madeiraE}" stroke-width="3"/>`;
      return s0 + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.22)}" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="2"/>`;
    }
    const a0 = -0.2, a1 = a0 + Math.PI * 1.45;
    let s0 = `<path class="roda-quebrada" d="M${pt(a0, 1)}A${f(r)} ${f(r)} 0 1 1 ${pt(a1, 1)}" fill="none" stroke="${madeiraE}" stroke-width="6" stroke-linecap="round"/>`;
    for (const a of [a0 + 0.6, a0 + 1.9, a0 + 3.4]) s0 += `<path d="M${pt(a, 0.2)}L${pt(a, 0.94)}" stroke="${madeiraE}" stroke-width="3"/>`;
    s0 += `<path d="M${pt(a0 + 4.1, 0.2)}L${pt(a0 + 4.1, 0.55)}" stroke="${madeiraE}" stroke-width="3"/>`;
    // o pedaço do aro e um raio soltos no chão
    return s0 + `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.22)}" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="2"/>`
      + `<path d="M${f(cx + r * 0.9)} ${f(cy + r + 2)}q${f(r * 0.5)} -8 ${f(r)} 0" stroke="${madeiraE}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M${f(cx - r * 1.4)} ${f(cy + r + 1)}l${f(r * 0.8)} -3" stroke="${madeiraE}" stroke-width="3" stroke-linecap="round"/>`;
  }
  // a carga demais: sacos, um barril e caixotes empilhados acima do que cabe, amarrados com corda (em cima de y0)
  function pilha(x, y0, larg) {
    const k = larg / 120;
    return `<g class="carga-demais"><rect x="${f(x - 52 * k)}" y="${f(y0 - 34)}" width="${f(40 * k)}" height="34" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="2"/>`
      + `<ellipse cx="${f(x + 6 * k)}" cy="${f(y0 - 20)}" rx="${f(22 * k)}" ry="20" fill="#c7b48a" stroke="#8a7655" stroke-width="2"/><path d="M${f(x + 6 * k)} ${f(y0 - 40)}v-8" stroke="#8a7655" stroke-width="3"/>`
      + `<rect x="${f(x + 28 * k)}" y="${f(y0 - 40)}" width="${f(26 * k)}" height="40" rx="7" fill="#7a5c3e" stroke="${madeiraE}" stroke-width="2"/><path d="M${f(x + 28 * k)} ${f(y0 - 28)}h${f(26 * k)}M${f(x + 28 * k)} ${f(y0 - 12)}h${f(26 * k)}" stroke="#4f4b46" stroke-width="3"/>`
      + `<ellipse cx="${f(x - 24 * k)}" cy="${f(y0 - 50)}" rx="${f(20 * k)}" ry="16" fill="#b8a27a" stroke="#8a7655" stroke-width="2"/>`
      + `<path d="M${f(x - 58 * k)} ${f(y0 - 18)}Q${f(x)} ${f(y0 - 74)} ${f(x + 58 * k)} ${f(y0 - 18)}" stroke="${CORDA}" stroke-width="2.5" fill="none"/></g>`;
  }
  const inclina = (s0, q, cx, cy) => (q ? `<g transform="rotate(${q} ${f(cx)} ${f(cy)})">${s0}</g>` : s0);
  const veiculos = {
    // (lote 18) e: { quebrado, cheio } — a roda quebrada inclina o veículo para ela; a carga demais vai empilhada em cima
    carroca: (x, y, o, e) => {
      const q = e && e.quebrado, rf = x + 40 * o, rt = x - 40 * o;
      const corpo = `<path d="M${x - 70} ${y - 30}h140v-40h-140Z" fill="${madeira}"/><path d="M${x - 70} ${y - 50}h140M${x - 70} ${y - 40}h140" stroke="${madeiraE}" stroke-width="2" opacity=".6"/>`
        + `<path d="M${x - 66} ${y - 70}Q${x} ${y - 140} ${x + 66} ${y - 70}Z" fill="#d8ccb0"/><path d="M${x - 30} ${y - 70}Q${x - 26} ${y - 120} ${x - 10} ${y - 126}M${x + 30} ${y - 70}Q${x + 26} ${y - 120} ${x + 10} ${y - 126}" stroke="#a89878" stroke-width="3" fill="none"/>`
        + `<path d="M${x - 66} ${y - 70}Q${x} ${y - 140} ${x + 66} ${y - 70}" stroke="#8a7a5a" stroke-width="2" fill="none"/>`
        + (e && e.cheio ? pilha(x, y - 112, 130) : '') + `<path d="M${x + 70 * o} ${y - 34}l${36 * o} 14" stroke="${madeiraE}" stroke-width="5"/>`;
      return `${sombra(x, y, 80)}` + inclina(corpo + roda(rf, y - 18, 20, false), q ? 7 * o : 0, rf, y - 18) + roda(rt, y - (q ? 10 : 18), 20, q);
    },
    carruagem: (x, y, o, e) => {
      const q = e && e.quebrado, rf = x + 42 * o, rt = x - 40 * o;
      const corpo = `<rect x="${x - 60}" y="${y - 110}" width="120" height="76" rx="14" fill="#3d2f4f"/><rect x="${x - 40}" y="${y - 96}" width="32" height="28" rx="4" fill="#ffd27a" opacity=".7"/><rect x="${x + 8}" y="${y - 96}" width="32" height="28" rx="4" fill="#ffd27a" opacity=".7"/>`
        + `<path d="M${x - 66} ${y - 112}h132" stroke="#c7955a" stroke-width="5"/><path d="M${x - 50} ${y - 112}v-8M${x + 50} ${y - 112}v-8M${x - 50} ${y - 120}h100" stroke="#c7955a" stroke-width="3"/>`
        + `<path d="M${x - 2} ${y - 62}v26" stroke="#2a2036" stroke-width="3"/><path d="M${x + 62 * o} ${y - 92}h${16 * o}v-16h${-16 * o}Z" fill="#c7955a"/><circle cx="${x + 70 * o}" cy="${y - 112}" r="7" fill="#ffd27a"/>`
        + (e && e.cheio ? pilha(x, y - 120, 110) : '');
      return `${sombra(x, y, 80)}` + inclina(corpo + roda(rf, y - 18, 18, false), q ? 7 * o : 0, rf, y - 18) + roda(rt, y - (q ? 12 : 22), 22, q);
    },
    barco: (x, y, o, e) => `<path d="M${x - 80} ${y - 40}h160l-24 34h-112Z" fill="${madeira}"/><path d="M${x - 74} ${y - 30}h148M${x - 66} ${y - 18}h132" stroke="${madeiraE}" stroke-width="2" opacity=".6"/><path d="M${x - 70} ${y - 34}h140" stroke="${madeiraC}" stroke-width="4"/>`
      + `<path d="M${x} ${y - 40}v-110" stroke="${madeiraE}" stroke-width="5"/><path d="M${x + 4} ${y - 146}l${50 * o} 80h-${50 * o}Z" fill="#e8dcc0"/><path d="M${x + 4} ${y - 118}l${f(32 * o)} 0" stroke="#8f3d4a" stroke-width="6"/>`
      + `<path d="M${x - 60 * o} ${y - 34}l${-40 * o} 30M${x + 40 * o} ${y - 34}l${30 * o} 30" stroke="${madeiraC}" stroke-width="4"/>` + (e && e.cheio ? pilha(x - 30 * o, y - 40, 90) : ''),
    // o barco em terra: numa carreta de duas rodas, com a vela recolhida
    barcoTerra: (x, y, o, e) => `${sombra(x, y, 80)}<path d="M${x - 76} ${y - 30}h152" stroke="${madeiraE}" stroke-width="6"/>` + roda(x - 30, y - 16, 16, !!(e && e.quebrado)) + roda(x + 30, y - 16, 16, false)
      + `<path d="M${x - 80} ${y - 70}h160l-24 36h-112Z" fill="${madeira}"/><path d="M${x - 70} ${y - 64}h140" stroke="${madeiraC}" stroke-width="4"/><path d="M${x} ${y - 70}v-80" stroke="${madeiraE}" stroke-width="5"/><path d="M${x - 4} ${y - 146}h8v70h-8Z" fill="#e8dcc0"/><path d="M${x + 76 * o} ${y - 30}l${30 * o} 10" stroke="${madeiraE}" stroke-width="5"/>`
      + (e && e.cheio ? pilha(x - 30, y - 70, 90) : ''),
    montaria: (x, y, o, e) => `${sombra(x, y, 50)}<path d="M${x - 40 * o} ${y - 60}q${40 * o} -14 ${70 * o} 0l${12 * o} -26q${10 * o} -6 ${16 * o} 4l${-8 * o} 34q${-6 * o} 10 ${-18 * o} 10h${-70 * o}Z" fill="#6b4a2e"/>`
      + `<path d="M${x + 32 * o} ${y - 84}q${8 * o} 10 ${4 * o} 22" stroke="#2a1c12" stroke-width="6" fill="none"/><path d="M${x + 50 * o} ${y - 84}l${6 * o} -8" stroke="#6b4a2e" stroke-width="4"/>`
      + `<path d="M${x - 34 * o} ${y - 50}v50M${x - 18 * o} ${y - 50}v50M${x + 18 * o} ${y - 50}v50M${x + 30 * o} ${y - 50}v50" stroke="#4a3220" stroke-width="7"/><path d="M${x - 44 * o} ${y - 58}q${-14 * o} 10 ${-10 * o} 28" stroke="#2a1c12" stroke-width="5" fill="none"/>`
      + `<path d="M${x - 14 * o} ${y - 66}q${14 * o} -12 ${30 * o} 0v10h${-30 * o}Z" fill="#8f3d4a"/><path d="M${x} ${y - 56}v22" stroke="#c7955a" stroke-width="2"/><path d="M${x + 58 * o} ${y - 70}l${-26 * o} 6" stroke="#2a1c12" stroke-width="2"/>`
      + (e && e.cheio ? `<ellipse cx="${x - 26 * o}" cy="${y - 50}" rx="16" ry="18" fill="#8a7655" stroke="#5f513b" stroke-width="2"/><ellipse cx="${x - 22 * o}" cy="${y - 86}" rx="20" ry="14" fill="#c7b48a" stroke="#8a7655" stroke-width="2"/>` : ''),
    animal: (x, y, o, e) => `${sombra(x, y, 50)}<path d="M${x - 36 * o} ${y - 54}q${36 * o} -12 ${60 * o} 0l${10 * o} -20q${10 * o} -6 ${14 * o} 4l${-6 * o} 30q${-6 * o} 8 ${-16 * o} 8h${-62 * o}Z" fill="#7d7468"/>`
      + `<path d="M${x + 30 * o} ${y - 76}l${2 * o} -16M${x + 38 * o} ${y - 76}l${8 * o} -14" stroke="#7d7468" stroke-width="5" stroke-linecap="round"/>`
      + `<path d="M${x - 30 * o} ${y - 46}v46M${x - 16 * o} ${y - 46}v46M${x + 14 * o} ${y - 46}v46M${x + 26 * o} ${y - 46}v46" stroke="#5a5248" stroke-width="7"/><rect x="${x - 26 * o - (o < 0 ? 44 : 0)}" y="${y - 84}" width="44" height="30" rx="6" fill="${lona}"/><rect x="${x - 4 * o - (o < 0 ? 30 : 0)}" y="${y - 76}" width="30" height="22" rx="5" fill="${lonaE}"/>`
      + (e && e.cheio ? `<rect x="${x - 22 * o - (o < 0 ? 40 : 0)}" y="${y - 112}" width="40" height="28" rx="6" fill="#b8a27a" stroke="#8a7655" stroke-width="2"/><ellipse cx="${x - 4 * o}" cy="${y - 120}" rx="16" ry="10" fill="#c7b48a" stroke="#8a7655" stroke-width="2"/>` : ''),
    outro: (x, y, o, e) => `${sombra(x, y, 60)}<rect x="${x - 50}" y="${y - 40}" width="44" height="40" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="3"/><rect x="${x}" y="${y - 30}" width="40" height="30" fill="${madeira}" stroke="${madeiraE}" stroke-width="3"/><rect x="${x - 34}" y="${y - 72}" width="36" height="32" fill="${madeira}" stroke="${madeiraE}" stroke-width="3"/>`
      + (e && e.cheio ? pilha(x - 10, y - 72, 90) : ''),
  };
  function caravana(lista, lugar) {
    const out = [];
    let k = 0;
    let noMar = 0;
    for (const v of (lista || []).slice(0, 6)) {
      const tipo = veiculos[v.tipo] && v.tipo !== 'barcoTerra' ? v.tipo : 'outro';
      // (lote 18) o estado no desenho: a roda quebrada e a carga demais
      const est = { quebrado: !!v.quebrado, cheio: !!v.cheio }, marca = (est.quebrado ? ' data-quebrado=""' : '') + (est.cheio ? ' data-cheio=""' : '');
      if (tipo === 'barco' && lugar === 'mar') { out.push(`<g class="veiculo" data-tipo="barco"${marca}>${veiculos.barco(1300 - noMar++ * 230, 500, 1, est)}</g>`); continue; }
      const [x, y, o, e] = CANTOS[k++ % CANTOS.length], desenho = tipo === 'barco' ? veiculos.barcoTerra : veiculos[tipo];
      // (cada um desenhado em volta da origem e posto no canto dele, na escala do canto: os de trás, menores)
      out.push(`<g class="veiculo" data-tipo="${tipo}"${marca} transform="translate(${x} ${y}) scale(${e})">${desenho(0, 0, o, est)}</g>`);
    }
    return out.join('');
  }

  /* A cena inteira: { lugar, area, construcoes: [{ tipo, nivel }], caravana: [{ tipo, quebrado, cheio }], abrigos: { n, tipos } }
     → o conteúdo do SVG.
     A paliçada e as lanternas ficam atrás das outras construções (são do fundo da área). */
  function cena(o) {
    const x = o || {}, area = x.area || 'fogueira', lugar = x.lugar || 'floresta', cs = Array.isArray(x.construcoes) ? x.construcoes : [];
    const p = [fundo(lugar)];
    for (const c of cs) if (FUNDO_DA_AREA.has(c.tipo)) p.push(construcao(c.tipo, c.nivel));
    // (lote 18) os abrigos: o — { n, tipos } — quantos estão na fogueira e o que o grupo tem no Equipamento
    const ab = Object.assign({ lugar }, x.abrigos || {});
    if (area === 'fogueira') { p.push(abrigosTras(ab)); p.push(caravana(x.caravana, lugar)); p.push(fogueira(ab)); }
    else p.push(decorDaArea(area));
    p.push(arrumar(cs.filter(c => !FUNDO_DA_AREA.has(c.tipo))));
    p.push(atmosfera(lugar));
    return p.join('');
  }
  /* Uma construção sozinha, num quadrinho (o cartão da aba Estrutura e a janela de construir): um svg inteiro. */
  function miniatura(tipo, nivel) {
    if (!desenhos[tipo]) return '';
    const vb = FUNDO_DA_AREA.has(tipo) ? '0 360 1600 300' : '500 360 600 310';
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><radialGradient id="gLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>`
      + `<rect x="0" y="0" width="1600" height="900" fill="#111a2b"/><rect x="0" y="652" width="1600" height="250" fill="#1b2532"/>${construcao(tipo, nivel)}</svg>`;
  }
  const AcampDesenhos = { cena, construcao, miniatura, caravana, tiposDeAbrigo, tipos: Object.keys(desenhos) };
  if (typeof module === 'object' && module && module.exports) module.exports = AcampDesenhos;
  if (typeof window !== 'undefined') window.AcampDesenhos = AcampDesenhos;
})();
