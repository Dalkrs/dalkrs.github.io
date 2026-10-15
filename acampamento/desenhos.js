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
  const TINTA = { floresta: null, montanha: '#7a7f8a', deserto: '#c9a063', neve: '#dfe8f2', mar: '#c8b48a', caverna: '#4a4440' };

  /* ---------------- o fundo: céu, horizonte do lugar, chão ---------------- */
  function fundo(lugar) {
    const r = sorte(20261003), p = [], tinta = TINTA[lugar] || null;
    const mix = (v, pct) => (tinta ? `color-mix(in srgb, var(${v}) ${pct}%, ${tinta})` : `var(${v})`);
    p.push('<defs><linearGradient id="gCeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ceu1)"/><stop offset=".6" style="stop-color:var(--ceu2)"/><stop offset="1" style="stop-color:var(--ceu3)"/></linearGradient>'
      + '<radialGradient id="gFogo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb04a" stop-opacity=".85"/><stop offset=".45" stop-color="#ff7a2a" stop-opacity=".28"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="gLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="gChao" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#c8763a" stop-opacity=".42"/><stop offset="1" stop-color="#c8763a" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="gMar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3a5c"/><stop offset="1" stop-color="#0e2238"/></linearGradient></defs>');
    // o céu continua para cima da cena: em tela estreita é ele que aparece no alto do palco
    p.push('<rect x="0" y="-1100" width="1600" height="1101" style="fill:var(--ceu1)"/><rect x="0" y="0" width="1600" height="570" fill="url(#gCeu)"/>');
    if (lugar !== 'caverna') {
      for (let i = 0; i < 70; i++) p.push(`<circle class="estrela" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 400).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`);
      for (let i = 0; i < 150; i++) p.push(`<circle class="estrela" cx="${(r() * 1600).toFixed(0)}" cy="${(-r() * 1050).toFixed(0)}" r="${(0.7 + r() * 1.4).toFixed(1)}" style="animation-delay:-${(r() * 4).toFixed(1)}s"/>`);
      p.push('<circle cx="1240" cy="150" r="96" style="fill:var(--astro)" opacity=".1"/><circle cx="1240" cy="150" r="44" style="fill:var(--astro)"/>');
    }
    const pinheiro = (x, y, a, l, neve) => `<path d="M${f(x)} ${f(y - a)}l${f(l)} ${f(a * 0.42)}h-${f(l * 0.45)}l${f(l * 0.75)} ${f(a * 0.32)}h-${f(l * 0.5)}l${f(l * 0.8)} ${f(a * 0.26)}h-${f(l * 3.2)}l${f(l * 0.8)} -${f(a * 0.26)}h-${f(l * 0.5)}l${f(l * 0.75)} -${f(a * 0.32)}h-${f(l * 0.45)}Z" style="fill:var(--mata)"/>`
      + (neve ? `<path d="M${f(x)} ${f(y - a)}l${f(l * 0.55)} ${f(a * 0.23)}l-${f(l * 0.3)} ${f(a * 0.05)}l-${f(l * 0.25)} -${f(a * 0.06)}l-${f(l * 0.25)} ${f(a * 0.06)}l-${f(l * 0.3)} -${f(a * 0.05)}Z" fill="#eef3f8" opacity=".85"/>` : '');
    if (lugar === 'floresta' || lugar === 'neve') {
      p.push(`<path d="M0 470C200 400 400 440 620 420S1000 380 1200 430s300-30 400 10V570H0Z" style="fill:${mix('--mata', 80)}" opacity=".55"/>`);
      for (let x = -30; x < 1640; x += 30 + r() * 34) { const a = 90 + r() * 120, l = 26 + r() * 22, y = 548 + r() * 14; p.push(pinheiro(x, y, a, l, lugar === 'neve')); }
    } else if (lugar === 'montanha') {
      p.push('<path d="M-40 560L180 250L300 360L470 170L640 380L760 300L930 120L1110 360L1240 260L1420 200L1640 470V570H-40Z" fill="#2a3040" opacity=".9"/>');
      p.push('<path d="M470 170L420 240L455 232L480 258L505 228L530 246ZM930 120L870 200L905 196L935 226L960 190L990 206ZM1420 200L1370 262L1402 256L1425 280L1450 252L1474 262Z" fill="#dfe6ee" opacity=".8"/>');
      p.push('<path d="M-20 560L140 420L260 500L380 400L520 520L660 440L820 530L980 430L1140 520L1300 420L1460 510L1620 450V570H-20Z" style="fill:var(--mata)" opacity=".85"/>');
      for (let x = 20; x < 1600; x += 90 + r() * 120) { const a = 60 + r() * 50, l = 18 + r() * 12; p.push(pinheiro(x, 556 + r() * 8, a, l, false)); }
    } else if (lugar === 'deserto') {
      p.push('<path d="M0 500C180 450 330 470 520 440S860 470 1040 430 1380 470 1600 445V570H0Z" fill="#6b5236" opacity=".55"/>');
      p.push('<path d="M0 540C220 500 420 520 640 505S1060 530 1260 500 1500 520 1600 512V570H0Z" fill="#4e3b27" opacity=".9"/>');
      const cacto = (x, y, a) => `<path d="M${x - 9} ${y}V${y - a}a9 9 0 0 1 18 0V${y}Z" fill="#2f3b25"/><path d="M${x - 9} ${y - a * 0.45}h-14v-${f(a * 0.3)}a7 7 0 0 1 14 0ZM${x + 9} ${y - a * 0.6}h14v-${f(a * 0.25)}a7 7 0 0 0-14 0Z" fill="#2f3b25"/>`;
      p.push(cacto(230, 560, 90), cacto(1420, 556, 70), cacto(1090, 552, 50));
    } else if (lugar === 'mar') {
      p.push('<rect x="0" y="430" width="1600" height="140" fill="url(#gMar)"/>');
      p.push('<path d="M1180 440h120M1150 462h180M1200 486h80M1120 512h240" style="stroke:var(--astro)" stroke-width="3" stroke-linecap="round" opacity=".35"/>');
      for (let i = 0; i < 9; i++) { const y = 448 + i * 13, x = (r() * 1400) | 0; p.push(`<path d="M${x} ${y}h${(40 + r() * 80).toFixed(0)}" stroke="#7fa6c9" stroke-width="2" stroke-linecap="round" opacity=".25"/>`); }
      // um píer de madeira entrando no mar
      p.push('<path d="M60 552L140 470H210L150 552Z" fill="#3a2a1d"/><path d="M140 470v26M175 470v30M205 470v22" stroke="#2a1f16" stroke-width="5"/>');
    } else if (lugar === 'caverna') {
      // a parede da caverna por cima, com estalactites, e o fundo de pedra
      p.push('<rect x="0" y="-1100" width="1600" height="1670" fill="#15120f"/>');
      p.push('<path d="M0 -1100H1600V300C1480 260 1440 330 1320 290S1120 240 1000 280 760 230 640 270 420 230 300 280 120 250 0 300Z" fill="#221d18"/>');
      for (let x = 60; x < 1600; x += 70 + r() * 90) { const a = 40 + r() * 110; p.push(`<path d="M${(x - 14).toFixed(0)} ${(260 + r() * 30).toFixed(0)}L${x.toFixed(0)} ${(290 + a).toFixed(0)}L${(x + 14).toFixed(0)} ${(262 + r() * 30).toFixed(0)}Z" fill="#2c2620"/>`); }
      p.push('<path d="M0 560C120 470 240 520 380 470S640 520 800 480 1100 520 1240 470 1480 520 1600 480V570H0Z" fill="#2a241e"/>');
    }
    p.push(`<rect x="0" y="545" width="1600" height="1155" style="fill:${mix('--chao', 55)}"/>`);           // o chão continua para baixo da cena
    p.push(`<ellipse cx="800" cy="690" rx="640" ry="190" style="fill:${mix('--chao2', 55)}"/>`);
    return p.join('');
  }

  /* ---------------- a fogueira: as barracas, os troncos e o fogo ---------------- */
  const barraca = (cx, base, larg, alt, vira) => {
    const e = cx - larg / 2, d = cx + larg / 2, t = base - alt, porta = larg * 0.16;
    return `<path d="M${e} ${base}L${cx} ${t}L${d} ${base}Z" fill="#3d352b"/><path d="M${cx} ${t}L${vira ? e : d} ${base}H${cx}Z" fill="#6a5a41"/>`
      + `<path d="M${cx} ${t + alt * 0.3}L${cx + porta} ${base}H${cx - porta}Z" fill="#15110d"/><path d="M${cx} ${t - 14}V${t + 6}" stroke="#2a221a" stroke-width="5" stroke-linecap="round"/>`;
  };
  function fogueira() {
    const r = sorte(7), p = [];
    p.push('<ellipse cx="800" cy="660" rx="520" ry="150" fill="url(#gChao)"/>');
    p.push(barraca(300, 610, 320, 190, false), barraca(1310, 600, 280, 165, true));
    p.push('<rect x="520" y="668" width="170" height="30" rx="15" fill="#3a2a1d"/><circle cx="535" cy="683" r="15" fill="#6b5138"/><circle cx="535" cy="683" r="8" fill="#55402c"/>');
    p.push('<rect x="910" y="668" width="170" height="30" rx="15" fill="#3a2a1d"/><circle cx="1065" cy="683" r="15" fill="#6b5138"/><circle cx="1065" cy="683" r="8" fill="#55402c"/>');
    p.push('<circle class="brilho" cx="800" cy="600" r="430" fill="url(#gFogo)"/>');
    p.push('<g transform="rotate(16 800 628)"><rect x="716" y="619" width="168" height="18" rx="9" fill="#2a1c13"/></g><g transform="rotate(-16 800 628)"><rect x="716" y="619" width="168" height="18" rx="9" fill="#36241a"/></g>');
    p.push('<ellipse cx="800" cy="626" rx="62" ry="12" fill="#c24a1e" opacity=".85"/>');
    p.push('<path class="chama" d="M800 470C850 540 882 570 860 614C845 640 755 640 740 614C720 570 770 548 800 470Z" fill="#f08a2b"/>');
    p.push('<path class="chama b" d="M800 520C832 565 850 586 838 614C826 632 774 632 762 614C750 586 782 570 800 520Z" fill="#ffc04d"/>');
    p.push('<path class="chama c" d="M800 566C815 588 824 600 817 616C810 626 790 626 783 616C776 600 790 590 800 566Z" fill="#fff1b8"/>');
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
    horta: [[-80, 80], [-120, 182], [-150, 224]],
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
  const veiculos = {
    carroca: (x, y, o) => `${sombra(x, y, 80)}<path d="M${x - 70} ${y - 30}h140v-40h-140Z" fill="${madeira}"/><path d="M${x - 66} ${y - 70}Q${x} ${y - 140} ${x + 66} ${y - 70}Z" fill="#d8ccb0"/><path d="M${x - 30} ${y - 70}Q${x - 26} ${y - 120} ${x - 10} ${y - 126}M${x + 30} ${y - 70}Q${x + 26} ${y - 120} ${x + 10} ${y - 126}" stroke="#a89878" stroke-width="3" fill="none"/>`
      + `<circle cx="${x - 40}" cy="${y - 18}" r="20" fill="none" stroke="${madeiraE}" stroke-width="6"/><circle cx="${x + 40}" cy="${y - 18}" r="20" fill="none" stroke="${madeiraE}" stroke-width="6"/><path d="M${x + 70 * o} ${y - 34}l${36 * o} 14" stroke="${madeiraE}" stroke-width="5"/>`,
    carruagem: (x, y, o) => `${sombra(x, y, 80)}<rect x="${x - 60}" y="${y - 110}" width="120" height="76" rx="14" fill="#3d2f4f"/><rect x="${x - 40}" y="${y - 96}" width="32" height="28" rx="4" fill="#ffd27a" opacity=".7"/><rect x="${x + 8}" y="${y - 96}" width="32" height="28" rx="4" fill="#ffd27a" opacity=".7"/>`
      + `<path d="M${x - 66} ${y - 112}h132" stroke="#c7955a" stroke-width="5"/><circle cx="${x - 40}" cy="${y - 20}" r="22" fill="none" stroke="${madeiraE}" stroke-width="6"/><circle cx="${x + 40}" cy="${y - 20}" r="22" fill="none" stroke="${madeiraE}" stroke-width="6"/>`,
    barco: (x, y, o) => `<path d="M${x - 80} ${y - 40}h160l-24 34h-112Z" fill="${madeira}"/><path d="M${x - 70} ${y - 34}h140" stroke="${madeiraC}" stroke-width="4"/><path d="M${x} ${y - 40}v-110" stroke="${madeiraE}" stroke-width="5"/><path d="M${x + 4} ${y - 146}l${50 * o} 80h-${50 * o}Z" fill="#e8dcc0"/>`,
    // o barco em terra: numa carreta de duas rodas, com a vela recolhida
    barcoTerra: (x, y, o) => `${sombra(x, y, 80)}<path d="M${x - 76} ${y - 30}h152" stroke="${madeiraE}" stroke-width="6"/><circle cx="${x - 30}" cy="${y - 16}" r="16" fill="none" stroke="${madeiraE}" stroke-width="5"/><circle cx="${x + 30}" cy="${y - 16}" r="16" fill="none" stroke="${madeiraE}" stroke-width="5"/>`
      + `<path d="M${x - 80} ${y - 70}h160l-24 36h-112Z" fill="${madeira}"/><path d="M${x - 70} ${y - 64}h140" stroke="${madeiraC}" stroke-width="4"/><path d="M${x} ${y - 70}v-80" stroke="${madeiraE}" stroke-width="5"/><path d="M${x - 4} ${y - 146}h8v70h-8Z" fill="#e8dcc0"/><path d="M${x + 76 * o} ${y - 30}l${30 * o} 10" stroke="${madeiraE}" stroke-width="5"/>`,
    montaria: (x, y, o) => `${sombra(x, y, 50)}<path d="M${x - 40 * o} ${y - 60}q${40 * o} -14 ${70 * o} 0l${12 * o} -26q${10 * o} -6 ${16 * o} 4l${-8 * o} 34q${-6 * o} 10 ${-18 * o} 10h${-70 * o}Z" fill="#6b4a2e"/>`
      + `<path d="M${x - 34 * o} ${y - 50}v50M${x - 18 * o} ${y - 50}v50M${x + 18 * o} ${y - 50}v50M${x + 30 * o} ${y - 50}v50" stroke="#4a3220" stroke-width="7"/><path d="M${x - 44 * o} ${y - 58}q${-14 * o} 10 ${-10 * o} 28" stroke="#2a1c12" stroke-width="5" fill="none"/><path d="M${x - 10 * o} ${y - 64}h${24 * o}v-8h${-24 * o}Z" fill="#8f3d4a"/>`,
    animal: (x, y, o) => `${sombra(x, y, 50)}<path d="M${x - 36 * o} ${y - 54}q${36 * o} -12 ${60 * o} 0l${10 * o} -20q${10 * o} -6 ${14 * o} 4l${-6 * o} 30q${-6 * o} 8 ${-16 * o} 8h${-62 * o}Z" fill="#7d7468"/>`
      + `<path d="M${x - 30 * o} ${y - 46}v46M${x - 16 * o} ${y - 46}v46M${x + 14 * o} ${y - 46}v46M${x + 26 * o} ${y - 46}v46" stroke="#5a5248" stroke-width="7"/><rect x="${x - 26 * o - (o < 0 ? 44 : 0)}" y="${y - 84}" width="44" height="30" rx="6" fill="${lona}"/><rect x="${x - 4 * o - (o < 0 ? 30 : 0)}" y="${y - 76}" width="30" height="22" rx="5" fill="${lonaE}"/>`,
    outro: (x, y) => `${sombra(x, y, 60)}<rect x="${x - 50}" y="${y - 40}" width="44" height="40" fill="${madeiraC}" stroke="${madeiraE}" stroke-width="3"/><rect x="${x}" y="${y - 30}" width="40" height="30" fill="${madeira}" stroke="${madeiraE}" stroke-width="3"/><rect x="${x - 34}" y="${y - 72}" width="36" height="32" fill="${madeira}" stroke="${madeiraE}" stroke-width="3"/>`,
  };
  function caravana(lista, lugar) {
    const out = [];
    let k = 0;
    let noMar = 0;
    for (const v of (lista || []).slice(0, 6)) {
      const tipo = veiculos[v.tipo] && v.tipo !== 'barcoTerra' ? v.tipo : 'outro';
      if (tipo === 'barco' && lugar === 'mar') { out.push(`<g class="veiculo" data-tipo="barco">${veiculos.barco(1300 - noMar++ * 230, 500, 1)}</g>`); continue; }
      const [x, y, o, e] = CANTOS[k++ % CANTOS.length], desenho = tipo === 'barco' ? veiculos.barcoTerra : veiculos[tipo];
      // (cada um desenhado em volta da origem e posto no canto dele, na escala do canto: os de trás, menores)
      out.push(`<g class="veiculo" data-tipo="${tipo}" transform="translate(${x} ${y}) scale(${e})">${desenho(0, 0, o)}</g>`);
    }
    return out.join('');
  }

  /* A cena inteira: { lugar, area, construcoes: [{ tipo, nivel }], caravana: [{ tipo }] } → o conteúdo do SVG.
     A paliçada e as lanternas ficam atrás das outras construções (são do fundo da área). */
  function cena(o) {
    const x = o || {}, area = x.area || 'fogueira', lugar = x.lugar || 'floresta', cs = Array.isArray(x.construcoes) ? x.construcoes : [];
    const p = [fundo(lugar)];
    for (const c of cs) if (FUNDO_DA_AREA.has(c.tipo)) p.push(construcao(c.tipo, c.nivel));
    if (area === 'fogueira') { p.push(caravana(x.caravana, lugar)); p.push(fogueira()); }
    else p.push(decorDaArea(area));
    p.push(arrumar(cs.filter(c => !FUNDO_DA_AREA.has(c.tipo))));
    return p.join('');
  }
  /* Uma construção sozinha, num quadrinho (o cartão da aba Estrutura e a janela de construir): um svg inteiro. */
  function miniatura(tipo, nivel) {
    if (!desenhos[tipo]) return '';
    const vb = FUNDO_DA_AREA.has(tipo) ? '0 360 1600 300' : '500 360 600 310';
    return `<svg viewBox="${vb}" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><defs><radialGradient id="gLuz" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd27a" stop-opacity=".7"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>`
      + `<rect x="0" y="0" width="1600" height="900" fill="#111a2b"/><rect x="0" y="652" width="1600" height="250" fill="#1b2532"/>${construcao(tipo, nivel)}</svg>`;
  }
  const AcampDesenhos = { cena, construcao, miniatura, caravana, tipos: Object.keys(desenhos) };
  if (typeof module === 'object' && module && module.exports) module.exports = AcampDesenhos;
  if (typeof window !== 'undefined') window.AcampDesenhos = AcampDesenhos;
})();
