/* Tiny Cats · Meditação: os desenhos da cena (sem página: só monta o SVG, em texto).
   Uma cena de 1600×900, presa embaixo: o céu (com o sol ou a lua no lugar da hora), o ambiente e um chão na frente,
   onde ficam os personagens que meditam (a página os põe por cima). As cores vêm das variáveis da página (a hora do
   dia: .hora-manha, .hora-tarde, .hora-por, .hora-noite, .hora-madrugada); o desenho muda só com o ambiente e a hora.
   Roda igual no navegador (window.MeditacaoDesenhos) e no Node (testes). */
(() => {
  'use strict';
  function sorte(semente) { let a = semente >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const f = n => (Math.round(n * 10) / 10).toString();
  const v = nome => `var(--${nome})`;
  // onde fica o astro em cada hora (o sol de dia, a lua de noite)
  const ASTRO = { manha: [330, 300, 46], tarde: [820, 150, 44], por: [1130, 470, 52], noite: [1220, 170, 40], madrugada: [1360, 330, 34] };

  function ceu(hora, r, comAstro) {
    const p = ['<defs><linearGradient id="mCeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ceu1)"/><stop offset=".62" style="stop-color:var(--ceu2)"/><stop offset="1" style="stop-color:var(--ceu3)"/></linearGradient>'
      + '<radialGradient id="mBrilho" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--astro)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--astro)" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="mAgua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--agua)"/><stop offset="1" style="stop-color:var(--perto)"/></linearGradient>'
      + '<filter id="mNevoa" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>'
      // (lote 25) os degradês e os desfoques do jeito de ilustração
      + '<radialGradient id="mHoriz" cx=".5" cy=".5" r=".5"><stop offset="0" style="stop-color:var(--ceu3)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--ceu3)" stop-opacity="0"/></radialGradient>'
      + '<radialGradient id="mAstroG" cx=".4" cy=".36" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".6" style="stop-color:var(--astro)"/><stop offset="1" style="stop-color:color-mix(in srgb, var(--astro) 72%, var(--ceu3))"/></radialGradient>'
      + '<linearGradient id="mRaio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--astro)" stop-opacity=".9"/><stop offset="1" style="stop-color:var(--astro)" stop-opacity="0"/></linearGradient>'
      + '<radialGradient id="mVinheta" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>'
      + '<radialGradient id="mVagaG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8"/><stop offset=".3" stop-color="#ffe07a" stop-opacity=".7"/><stop offset="1" stop-color="#ffc04a" stop-opacity="0"/></radialGradient>'
      + '<filter id="mMacio" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="9"/></filter></defs>'];
    p.push('<rect x="0" y="-1100" width="1600" height="1101" style="fill:var(--ceu1)"/><rect width="1600" height="900" fill="url(#mCeu)"/>');
    p.push('<ellipse cx="800" cy="600" rx="1150" ry="300" fill="url(#mHoriz)" opacity=".7"/>');
    const est = [];
    for (let i = 0; i < 110; i++) est.push(`<circle cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 520).toFixed(0)}" r="${(0.6 + r() * 1.5).toFixed(1)}"/>`);
    for (let i = 0; i < 90; i++) est.push(`<circle cx="${(r() * 1600).toFixed(0)}" cy="${(-r() * 1050).toFixed(0)}" r="${(0.6 + r() * 1.4).toFixed(1)}"/>`);
    // (lote 25) as estrelas grandes que cintilam em cruz
    for (const [x, y, t] of [[160, 80, 9], [470, 46, 7], [700, 210, 6], [980, 70, 10], [1480, 120, 7], [360, 260, 5]]) est.push(`<path d="M${x} ${y - t}Q${f(x + t * 0.16)} ${f(y - t * 0.16)} ${x + t} ${y}Q${f(x + t * 0.16)} ${f(y + t * 0.16)} ${x} ${y + t}Q${f(x - t * 0.16)} ${f(y + t * 0.16)} ${x - t} ${y}Q${f(x - t * 0.16)} ${f(y - t * 0.16)} ${x} ${y - t}Z"/>`);
    p.push(`<g class="estrelas" fill="#fff" style="opacity:var(--estrelas)">${est.join('')}</g>`);
    // as nuvens macias, com a barriga acesa pela cor do horizonte (somem um pouco de noite)
    const rn = sorte(91), nuvens = [];
    for (const [x, y, l] of [[260, 260, 420], [900, 300, 520], [1460, 340, 380], [620, 130, 300]]) {
      for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * l * 0.17 + (rn() - 0.5) * l * 0.1, ry = l * (0.09 + rn() * 0.07); nuvens.push(`<ellipse cx="${f(x + dx)}" cy="${f(y - ry * 0.4)}" rx="${f(l * (0.14 + rn() * 0.08))}" ry="${f(ry)}" style="fill:color-mix(in srgb, var(--ceu2) 60%, var(--astro))"/>`); }
      nuvens.push(`<ellipse cx="${x}" cy="${f(y + l * 0.03)}" rx="${f(l * 0.5)}" ry="${f(l * 0.05)}" style="fill:var(--ceu3)" opacity=".8"/>`);
    }
    p.push(`<g filter="url(#mMacio)" style="opacity:calc(.6 - .35 * var(--estrelas))">${nuvens.join('')}</g>`);
    if (comAstro) {
      const [x, y, raio] = ASTRO[hora] || ASTRO.por;
      p.push(`<circle cx="${x}" cy="${y}" r="${raio * 5.5}" fill="url(#mBrilho)" style="opacity:calc(var(--brilho) * .5)"/><circle cx="${x}" cy="${y}" r="${raio * 3.2}" fill="url(#mBrilho)" style="opacity:var(--brilho)"/><circle class="astro" cx="${x}" cy="${y}" r="${raio}" fill="url(#mAstroG)"/>`);
      if (hora === 'noite' || hora === 'madrugada') p.push(`<circle cx="${x + raio * 0.38}" cy="${y - raio * 0.18}" r="${raio * 0.86}" style="fill:var(--ceu1)" opacity=".9"/>`);       // a lua crescente
    }
    return p.join('');
  }
  const nevoa = (y, op) => `<path d="M0 ${y} C260 ${y - 30} 520 ${y + 18} 800 ${y - 6} S1340 ${y - 26} 1600 ${y} L1600 ${y + 70} C1300 ${y + 58} 1000 ${y + 84} 700 ${y + 66} S200 ${y + 58} 0 ${y + 74}Z" style="fill:var(--nevoa)" opacity="${op}" filter="url(#mNevoa)"/>`;
  const terraco = () => '<path d="M0 690 C320 664 640 672 900 680 S1400 668 1600 688 V900 H0Z" style="fill:var(--pedra)"/>'
    + '<path d="M0 690 C320 664 640 672 900 680 S1400 668 1600 688 V706 C1400 688 1200 698 900 700 S300 686 0 710Z" style="fill:var(--perto)" opacity=".35"/>'
    + '<path d="M80 760 H1520 M30 812 H1570 M0 862 H1600 M400 700 L330 900 M800 700 V900 M1200 700 L1270 900" style="stroke:var(--perto)" stroke-width="3" opacity=".35"/>';
  const lanterna = (x, y, e) => `<g transform="translate(${x} ${y}) scale(${e})"><rect x="-14" y="-6" width="28" height="70" rx="3" style="fill:var(--perto)"/><path d="M-30 -6 H30 L18 -26 H-18Z" style="fill:var(--perto)"/><rect x="-20" y="-64" width="40" height="40" rx="4" style="fill:var(--perto)"/><rect x="-10" y="-56" width="20" height="22" rx="2" fill="#f3b562" style="opacity:var(--janela)"/><path d="M-34 -64 H34 L20 -86 H-20Z" style="fill:var(--perto)"/><circle cx="0" cy="-45" r="70" fill="#f3b562" filter="url(#mMacio)" style="opacity:calc(var(--janela) * .22)"/></g>`;      // (lote 25: e o brilho em volta, de noite)

  /* ---------------- os ambientes ---------------- */
  const AMB = {
    templo(r) {
      const p = [];
      p.push('<path d="M0 520 L150 400 L270 460 L420 330 L560 450 L700 360 L880 480 L1020 380 L1220 470 L1380 390 L1600 470 V900 H0Z" style="fill:var(--longe)" opacity=".9"/>');
      p.push('<path d="M0 600 L130 540 L250 580 L390 510 L540 590 L660 552 L820 610 L980 540 L1140 600 L1300 545 L1460 595 L1600 560 V900 H0Z" style="fill:var(--meio)"/>');
      p.push(nevoa(560, 0.3));
      // o penhasco com o templo, à direita
      p.push('<path d="M1060 900 L1080 610 L1170 572 L1320 566 L1420 584 L1600 600 V900Z" style="fill:var(--perto)"/>');
      const t = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" style="fill:var(--perto)"/>`, tel = (x, y, w, a) => `<path d="M${x - a} ${y} H${x + w + a} L${x + w + a * 0.4} ${y - 18} H${x - a * 0.4}Z" style="fill:var(--perto)" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
      p.push(t(1240, 500, 96, 70), tel(1240, 502, 96, 28), t(1256, 446, 64, 40), tel(1256, 448, 64, 24), t(1268, 406, 40, 28), tel(1268, 408, 40, 20), '<path d="M1288 388 V360" style="stroke:var(--perto)" stroke-width="4"/>');
      p.push('<g fill="#f3b562" style="opacity:var(--janela)"><rect x="1262" y="524" width="12" height="20"/><rect x="1300" y="524" width="12" height="20"/><rect x="1280" y="458" width="14" height="14"/></g>');
      p.push(terraco(), lanterna(170, 690, 1), lanterna(1450, 694, 0.9));
      return p.join('');
    },
    montanha(r) {
      const p = [];
      p.push('<path d="M-40 640 L240 300 L380 430 L600 200 L820 450 L980 330 L1180 140 L1400 420 L1520 320 L1660 480 V900 H-40Z" style="fill:var(--longe)"/>');
      // (lote 25) o volume de cada pico: a face de um lado acesa, a do outro na sombra
      // (recortado pelo contorno da serra: a luz e a sombra não passam para o céu)
      p.push('<clipPath id="mSerra"><path d="M-40 640 L240 300 L380 430 L600 200 L820 450 L980 330 L1180 140 L1400 420 L1520 320 L1660 480 V900 H-40Z"/></clipPath><g clip-path="url(#mSerra)">');
      for (const [x, y, e, d] of [[240, 300, 140, 160], [600, 200, 220, 230], [1180, 140, 260, 260], [1520, 320, 120, 140]]) p.push(`<path d="M${x} ${y}L${x - e} ${y + e * 1.3}L${x - e * 0.2} ${y + e * 1.4}Z" style="fill:var(--astro)" opacity=".12"/><path d="M${x} ${y}L${x + d} ${y + d * 1.25}L${x + d * 0.25} ${y + d * 1.4}Z" fill="#000" opacity=".14"/>`);
      p.push('</g>');
      p.push('<path d="M600 200 L540 290 L585 280 L612 312 L640 276 L672 296Z M1180 140 L1112 236 L1156 228 L1186 262 L1214 222 L1248 240Z M240 300 L196 362 L228 356 L248 382 L268 352 L292 362Z" fill="#eef3f8" opacity=".85"/>');
      p.push('<path d="M-20 700 L160 560 L300 640 L460 540 L620 660 L780 580 L960 680 L1120 570 L1290 660 L1440 580 L1620 650 V900 H-20Z" style="fill:var(--meio)"/>');
      p.push(nevoa(620, 0.25));
      // a corda das bandeirinhas
      const cores = ['#d65a4a', '#e6ab4f', '#5c9e6a', '#5a8fd0', '#eef0f4'];
      p.push('<path d="M120 610 Q500 690 860 640" style="stroke:var(--perto)" stroke-width="2.5" fill="none"/>');
      for (let i = 0; i < 12; i++) { const t = (i + 0.5) / 12, x = 120 + 740 * t, y = 610 + (1 - t) * t * 4 * 52 + (640 - 610) * t; p.push(`<path d="M${f(x - 14)} ${f(y)} L${f(x + 14)} ${f(y)} L${f(x)} ${f(y + 30)}Z" fill="${cores[i % 5]}" opacity=".85"/>`); }
      p.push('<path d="M0 720 C260 690 520 702 800 708 S1320 690 1600 716 V900 H0Z" style="fill:var(--pedra)"/>');
      for (let i = 0; i < 9; i++) { const x = r() * 1600, w = 40 + r() * 90, ya = 760 + r() * 60, yb = 780 + r() * 50; p.push(`<path d="M${f(x)} 900 L${f(x + w * 0.2)} ${f(ya)} L${f(x + w)} ${f(yb)} L${f(x + w * 1.2)} 900Z" style="fill:var(--perto)" opacity=".7" stroke="#0a0c12" stroke-width="2.5" stroke-linejoin="round" stroke-opacity=".5"/><path d="M${f(x + w * 0.2)} ${f(ya)} L${f(x + w)} ${f(yb)}" style="stroke:var(--astro)" stroke-width="2.5" opacity=".3"/>`); }
      return p.join('');
    },
    floresta(r) {
      const p = [];
      // (lote 25) o pinheiro em camadas de galhos caídos, com a beira do lado da luz acesa
      const arvore = (x, y, a, l, cor, op) => {
        const n = 6, cam = [], lit = [];
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1.3) / n, w = l * (0.25 + Math.min(1, t1) * 0.85), y0 = y - a + a * t0 * 0.84, y1 = Math.min(y - a * 0.12, y - a + a * t1 * 0.84), h = y1 - y0, j = (r() - 0.5) * 0.12;
          cam.push(`M${f(x)} ${f(y0)}Q${f(x + w * 0.3)} ${f(y0 + h * 0.6)} ${f(x + w)} ${f(y1)}L${f(x + w * (0.62 + j))} ${f(y1 - h * 0.14)}L${f(x + w * 0.32)} ${f(y1 + h * 0.04)}L${f(x)} ${f(y1 - h * 0.12)}L${f(x - w * 0.32)} ${f(y1 + h * 0.04)}L${f(x - w * (0.62 - j))} ${f(y1 - h * 0.14)}L${f(x - w)} ${f(y1)}Q${f(x - w * 0.3)} ${f(y0 + h * 0.6)} ${f(x)} ${f(y0)}Z`);
          lit.push(`M${f(x + 1)} ${f(y0 + 2)}Q${f(x + w * 0.3)} ${f(y0 + h * 0.6)} ${f(x + w)} ${f(y1)}L${f(x + w * 0.7)} ${f(y1 - h * 0.12)}Q${f(x + w * 0.2)} ${f(y0 + h * 0.62)} ${f(x + 1)} ${f(y0 + 2)}Z`);
        }
        return `<g opacity="${op}"><rect x="${f(x - l * 0.06)}" y="${f(y - a * 0.16)}" width="${f(l * 0.12)}" height="${f(a * 0.16)}" style="fill:var(--${cor === 'mata' ? 'perto' : cor})"/><path d="${cam.join('')}" style="fill:var(--${cor})"/><path d="${lit.join('')}" style="fill:var(--astro)" opacity="${cor === 'mata' ? '.12' : '.06'}"/></g>`;
      };
      for (let x = -40; x < 1660; x += 70 + r() * 60) p.push(arvore(x, 600 + r() * 30, 300 + r() * 160, 60 + r() * 30, 'longe', 0.9));
      p.push(nevoa(560, 0.18));
      for (let x = -60; x < 1680; x += 110 + r() * 90) { if (x > 420 && x < 1180) continue; p.push(arvore(x, 700 + r() * 20, 420 + r() * 200, 90 + r() * 40, 'mata', 1)); }
      p.push('<path d="M0 700 C280 676 560 690 820 694 S1360 680 1600 706 V900 H0Z" style="fill:var(--chao)"/>');
      p.push('<path d="M560 760 C640 742 760 744 880 752 L900 776 C780 770 650 770 560 784Z" style="fill:var(--perto)" opacity=".6"/>');       // o tronco caído
      const vaga = [];
      for (let i = 0; i < 26; i++) vaga.push(`<circle class="vagalume" cx="${(r() * 1600).toFixed(0)}" cy="${(420 + r() * 330).toFixed(0)}" r="${(2 + r() * 2).toFixed(1)}" style="animation-delay:-${(r() * 6).toFixed(1)}s"/>`);
      p.push(`<g fill="#f6e27a" style="opacity:var(--vaga)">${vaga.join('')}</g>`);
      return p.join('');
    },
    cachoeira(r) {
      const p = [];
      p.push('<path d="M0 560 L180 470 L330 520 L520 430 L660 500 L940 500 L1080 430 L1260 510 L1420 450 L1600 520 V900 H0Z" style="fill:var(--longe)" opacity=".85"/>');
      // os paredões e a queda d'água no meio
      p.push('<path d="M0 900 V300 C120 280 240 330 360 320 S560 360 640 380 L700 900Z" style="fill:var(--meio)"/>');
      p.push('<path d="M1600 900 V280 C1480 270 1360 320 1240 310 S1040 350 960 372 L900 900Z" style="fill:var(--meio)"/>');
      // (lote 25) os paredões com camadas de pedra, rachaduras, a beira acesa e o musgo em cima
      for (const lado of [-1, 1]) {
        const x0 = lado < 0 ? 0 : 1600, b = lado < 0 ? 640 : 960;
        for (let k = 0; k < 6; k++) { const y = 380 + k * 64 + r() * 20; p.push(`<path d="M${x0} ${f(y)}C${f(x0 - lado * 200)} ${f(y - 12)} ${f(x0 - lado * 420)} ${f(y + 10)} ${f(b + lado * 6)} ${f(y + 4)}" style="stroke:var(--perto)" stroke-width="3" fill="none" opacity=".35"/>`); }
        for (let k = 0; k < 5; k++) { const x = lado < 0 ? 80 + r() * 520 : 1000 + r() * 520, y = 420 + r() * 260; p.push(`<path d="M${f(x)} ${f(y)}l${f(8 - r() * 16)} ${f(20 + r() * 30)}l${f(10 - r() * 20)} ${f(20 + r() * 30)}" style="stroke:var(--perto)" stroke-width="2.5" fill="none" opacity=".45"/>`); }
        p.push(`<path d="M${b} 380 L${b + lado * 20} 720" style="stroke:var(--astro)" stroke-width="4" opacity=".25"/>`);
      }
      p.push('<path d="M0 300 C120 280 240 330 360 320 S560 360 640 380 L640 396 C560 378 460 352 360 338 S120 300 0 318Z M1600 280 C1480 270 1360 320 1240 310 S1040 350 960 372 L960 388 C1040 368 1140 340 1240 328 S1480 290 1600 300Z" style="fill:var(--mata)"/>');
      p.push('<path d="M660 372 C720 360 880 360 940 370 L960 720 H640Z" style="fill:var(--agua)" opacity=".9"/>');
      p.push('<path d="M660 372 C720 360 880 360 940 370 L944 440 H656Z" fill="#fff" opacity=".18"/>');
      for (let i = 0; i < 14; i++) { const x = 664 + i * 21 + r() * 8; p.push(`<path class="queda" d="M${f(x)} 372 V${f(700 + r() * 20)}" stroke="#eef7fb" stroke-width="${(2 + r() * 3).toFixed(1)}" stroke-linecap="round" opacity="${(0.35 + r() * 0.4).toFixed(2)}" style="animation-delay:-${(r() * 1.6).toFixed(2)}s"/>`); }
      p.push('<path d="M0 760 C320 720 600 728 800 732 S1300 716 1600 750 V900 H0Z" fill="url(#mAgua)"/>');
      p.push('<ellipse cx="800" cy="736" rx="240" ry="26" fill="#eef7fb" opacity=".35" filter="url(#mNevoa)"/><ellipse cx="800" cy="700" rx="200" ry="60" fill="#eef7fb" opacity=".22" filter="url(#mNevoa)"/>');
      for (let i = 0; i < 16; i++) p.push(`<circle cx="${f(650 + r() * 300)}" cy="${f(690 + r() * 60)}" r="${f(2 + r() * 4)}" fill="#fff" opacity="${f(0.4 + r() * 0.4)}"/>`);      // (lote 25) a espuma
      p.push('<path d="M0 800 C200 780 420 788 560 800 L520 900 H0Z M1600 806 C1420 784 1200 790 1060 804 L1100 900 H1600Z" style="fill:var(--pedra)"/>');
      p.push('<path d="M560 840 C680 820 920 820 1060 840 L1080 900 H540Z" style="fill:var(--pedra)" opacity=".9"/>');
      return p.join('');
    },
    caverna(r) {
      const p = [];
      // a boca da caverna, no alto, deixa ver o céu; o resto é pedra
      p.push('<path d="M0 -1100 H1600 V900 H0Z M520 300 C560 180 700 110 820 120 S1060 200 1080 320 C1000 360 900 372 800 370 S600 360 520 300Z" fill="#141018" fill-rule="evenodd"/>');
      p.push('<path d="M0 -1100 H1600 V420 C1450 380 1380 450 1240 410 S1020 380 900 420 680 380 560 420 300 380 0 430Z M520 300 C560 180 700 110 820 120 S1060 200 1080 320 C1000 360 900 372 800 370 S600 360 520 300Z" fill="#221c26" fill-rule="evenodd"/>');
      for (let x = 40; x < 1600; x += 80 + r() * 90) { if (x > 500 && x < 1100) continue; const a = 50 + r() * 120; p.push(`<path d="M${(x - 16).toFixed(0)} ${(400 + r() * 30).toFixed(0)}L${x.toFixed(0)} ${(430 + a).toFixed(0)}L${(x + 16).toFixed(0)} ${(402 + r() * 30).toFixed(0)}Z" fill="#2c2430"/>`); }
      // o facho de luz que entra pela boca
      p.push('<path d="M560 320 L1060 320 L1180 760 L420 760Z" style="fill:var(--astro)" opacity=".08"/>');
      p.push('<path d="M0 720 C240 680 480 700 720 704 S1240 690 1600 720 V900 H0Z" fill="#2a2330"/>');
      // os cristais
      const cristal = (x, y, a, cor) => `<path d="M${f(x - a * 0.22)} ${f(y)} L${f(x - a * 0.16)} ${f(y - a * 0.7)} L${f(x)} ${f(y - a)} L${f(x + a * 0.16)} ${f(y - a * 0.7)} L${f(x + a * 0.22)} ${f(y)}Z" fill="${cor}" opacity=".85"/><path d="M${f(x)} ${f(y - a)} L${f(x)} ${f(y)}" stroke="#ffffff" stroke-opacity=".35" stroke-width="2"/>`;
      p.push('<g class="cristais">');
      [[200, 780, 120, '#7fd3e8'], [250, 786, 80, '#a98ce8'], [1360, 776, 140, '#7fd3e8'], [1420, 790, 90, '#a98ce8'], [1300, 794, 70, '#9fe8d0'], [130, 800, 60, '#9fe8d0']].forEach(c => p.push(cristal(...c)));
      p.push('</g><ellipse cx="220" cy="770" rx="160" ry="60" fill="#7fd3e8" opacity=".12" filter="url(#mNevoa)"/><ellipse cx="1380" cy="768" rx="170" ry="64" fill="#a98ce8" opacity=".12" filter="url(#mNevoa)"/>');
      return p.join('');
    },
    jardim(r) {
      const p = [];
      p.push('<path d="M0 560 L200 500 L380 540 L560 480 L760 540 L980 490 L1180 540 L1400 495 L1600 540 V900 H0Z" style="fill:var(--longe)" opacity=".7"/>');
      p.push('<rect x="0" y="560" width="1600" height="70" style="fill:var(--meio)"/><path d="M0 560 H1600" style="stroke:var(--perto)" stroke-width="6"/>');       // o muro
      for (let x = 30; x < 1600; x += 160) p.push(`<rect x="${x}" y="566" width="120" height="56" rx="4" style="fill:var(--perto)" opacity=".18"/>`);
      // as cerejeiras
      const cerejeira = (x, y, e) => `<path d="M${x} ${y} C${x + 4} ${y - 70 * e} ${x - 30 * e} ${y - 130 * e} ${x - 10 * e} ${y - 190 * e}M${x - 4 * e} ${y - 120 * e} C${x + 40 * e} ${y - 150 * e} ${x + 60 * e} ${y - 170 * e} ${x + 80 * e} ${y - 210 * e}" style="stroke:var(--perto)" stroke-width="${f(14 * e)}" fill="none" stroke-linecap="round"/>`
        // (lote 25) a copa em tufos de flor: o contorno, o volume (clara em cima à esquerda) e as florzinhas acesas
        + (() => {
          const bol = [[-60, -210, 90], [40, -240, 100], [110, -200, 80], [-10, -280, 85], [-110, -170, 70]], tufo = (cx, cy, rr) => { const n = 20, pts = []; for (let i = 0; i < n; i++) { const an = (i / n) * Math.PI * 2, k = i % 2 ? 0.86 + r() * 0.06 : 0.98 + r() * 0.08; pts.push(f(cx + Math.cos(an) * rr * k) + ' ' + f(cy + Math.sin(an) * rr * k)); } return 'M' + pts.join('L') + 'Z'; };
          let s = '';
          for (const [dx, dy, rr] of bol) s += `<path d="${tufo(x + dx * e, y + dy * e, rr * e + 4)}" fill="#6a3348" opacity=".85"/>`;
          for (const [dx, dy, rr] of bol) s += `<path d="${tufo(x + dx * e, y + dy * e, rr * e)}" fill="#e7a3bb"/>`;
          for (const [dx, dy, rr] of bol) s += `<path d="${tufo(x + dx * e + rr * e * 0.12, y + dy * e + rr * e * 0.18, rr * e * 0.7)}" fill="#c97a96" opacity=".55"/><path d="${tufo(x + dx * e - rr * e * 0.22, y + dy * e - rr * e * 0.26, rr * e * 0.45)}" fill="#ffd3e1" opacity=".75"/>`;
          for (let i = 0; i < 22; i++) { const [dx, dy, rr] = bol[i % bol.length], an = r() * Math.PI * 2, d = r() * rr * e * 0.85; s += `<circle cx="${f(x + dx * e + Math.cos(an) * d)}" cy="${f(y + dy * e + Math.sin(an) * d)}" r="${f(2.5 + r() * 2.5)}" fill="#fff4f8" opacity=".85"/>`; }
          return s;
        })();
      p.push(cerejeira(200, 700, 1.1), cerejeira(1420, 696, 1.2));
      p.push('<path d="M0 640 H1600 V900 H0Z" fill="#d9cfb8" opacity=".95"/>');          // a areia rastelada
      for (let k = 0; k < 9; k++) p.push(`<path d="M0 ${660 + k * 26} C400 ${650 + k * 26} 1200 ${670 + k * 26} 1600 ${660 + k * 26}" stroke="#b9ad93" stroke-width="2.5" fill="none"/>`);
      const pedra = (x, y, rx, ry) => [1, 2, 3].map(i => `<ellipse cx="${x}" cy="${y + 6}" rx="${rx + i * 28}" ry="${ry + i * 12}" stroke="#b9ad93" stroke-width="2.5" fill="#d9cfb8"/>`).reverse().join('') + `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" style="fill:var(--pedra)"/>`;
      p.push(pedra(520, 700, 46, 24), pedra(1120, 690, 60, 30));
      p.push('<path d="M0 640 H1600 V900 H0Z" style="fill:var(--tinta-noite)"/>');       // (a areia escurece de noite)
      p.push(lanterna(800, 642, 0.8));
      return p.join('');
    },
    deserto(r) {
      const p = [];
      p.push('<path d="M120 640 V520 H180 V480 H300 V640Z M1260 640 V500 H1330 V450 H1460 V640Z" style="fill:var(--longe)" opacity=".85"/>');       // as mesas de pedra
      p.push('<path d="M0 620 C200 580 380 600 560 590 S900 560 1100 600 1400 570 1600 600 V900 H0Z" style="fill:var(--areia)" opacity=".75"/>');
      p.push('<path d="M0 690 C260 650 520 670 760 664 S1240 640 1600 680 V900 H0Z" style="fill:var(--areia)"/>');
      p.push('<path d="M0 690 C260 650 520 670 760 664 S1240 640 1600 680 V900 H0Z" style="fill:var(--tinta-noite)"/>');
      p.push('<path d="M300 760 C500 730 700 740 900 750" stroke="rgba(0,0,0,.12)" stroke-width="3" fill="none"/><path d="M820 820 C1000 790 1200 800 1420 812" stroke="rgba(0,0,0,.1)" stroke-width="3" fill="none"/>');
      for (let i = 0; i < 5; i++) { const x = 100 + r() * 1400, w = 30 + r() * 40; p.push(`<ellipse cx="${f(x)}" cy="${f(800 + r() * 60)}" rx="${f(w)}" ry="${f(w * 0.4)}" style="fill:var(--perto)" opacity=".45"/>`); }
      return p.join('');
    },
    ceu(r) {
      const p = [];
      // a faixa da Via Láctea (some de dia)
      const via = [];
      for (let i = 0; i < 260; i++) { const t = r(), x = t * 1600, y = 120 + t * 260 + (r() - 0.5) * 120; via.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${(0.5 + r() * 1.1).toFixed(1)}"/>`); }
      p.push(`<g fill="#fff" style="opacity:var(--estrelas)"><path d="M0 70 C400 160 900 300 1600 430 L1600 520 C900 400 400 260 0 170Z" fill="#c9c4ff" opacity=".16" filter="url(#mMacio)"/><path d="M0 105 C400 195 900 335 1600 465 L1600 485 C900 365 400 225 0 130Z" fill="#e8e6ff" opacity=".1" filter="url(#mMacio)"/>${via.join('')}</g>`);
      p.push('<path d="M0 660 C200 630 360 646 520 640 S860 620 1000 636 1300 620 1600 640 V900 H0Z" style="fill:var(--longe)"/>');
      p.push('<path d="M0 720 C300 700 600 712 900 714 S1400 702 1600 720 V900 H0Z" style="fill:var(--chao)"/>');
      p.push('<path d="M0 720 C300 700 600 712 900 714 S1400 702 1600 720 V900 H0Z" style="fill:var(--tinta-noite)"/>');
      for (let x = 0; x < 1600; x += 22 + r() * 30) p.push(`<path d="M${f(x)} ${f(724 + r() * 10)} l${f(3 + r() * 4)} -${f(10 + r() * 14)}" style="stroke:var(--perto)" stroke-width="2" opacity=".5"/>`);
      return p.join('');
    },
  };

  /* (lote 25) Por cima de tudo: os raios de luz que vêm do astro (--raios, pela hora), o que flutua no ar (as pétalas no
     jardim, o pó dourado de dia, os vaga-lumes de noite — fora da floresta, que já tem os dela) e a vinheta. */
  function atmosfera(amb, hora, r) {
    const p = [], [ax, ay] = ASTRO[hora] || ASTRO.por;
    if (amb !== 'caverna') p.push('<g style="opacity:var(--raios, 0)">' + [[-260, 140], [120, 110], [520, 150]].map(([dx, w]) => `<path d="M${ax} ${ay}L${f(ax + dx - w)} 900H${f(ax + dx + w)}Z" fill="url(#mRaio)" opacity=".16" filter="url(#mMacio)"/>`).join('') + '</g>');
    if (amb === 'jardim') { const pt = []; for (let i = 0; i < 22; i++) pt.push(`<path class="petala" d="M${f(r() * 1600)} ${f(r() * 640)}c3-5 9-5 10 0c-1 5-7 6-10 0Z" fill="#f4bfd0" style="animation-delay:-${f(r() * 9)}s;--px:${f(-60 - r() * 120)}px"/>`); p.push(`<g>${pt.join('')}</g>`); }
    const po = [];
    for (let i = 0; i < 18; i++) { const x = 80 + r() * 1440, y = (amb === 'ceu' ? 560 : 360) + r() * (amb === 'ceu' ? 200 : 380), rr = 2 + r() * 3; po.push(`<g class="poeira" style="animation-delay:-${f(r() * 7)}s;--vx:${f((r() - 0.5) * 50)}px;--vy:${f(-15 - r() * 35)}px"><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 5)}" fill="url(#mVagaG)" opacity=".5"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(rr * 0.6)}" fill="#fff8d8"/></g>`); }
    p.push(`<g style="opacity:${amb === 'floresta' ? 'var(--poeira, 0)' : 'max(var(--poeira, 0), var(--vaga, 0))'}">${po.join('')}</g>`);
    p.push('<rect x="-10" y="-10" width="1620" height="920" fill="url(#mVinheta)"/>');
    return p.join('');
  }
  /* A cena inteira: o céu e o ambiente (sem a imagem do mestre, que a página põe por baixo quando há). */
  // (sufixo: cada desenho na mesma página com os próprios nomes de degradê e de desfoque)
  function cena(o) {
    const amb = AMB[o && o.amb] ? o.amb : 'templo', hora = ASTRO[o && o.hora] ? o.hora : 'por', suf = String((o && o.sufixo) || '').replace(/[^A-Za-z0-9_-]/g, '');
    const r = sorte(amb.length * 7919 + 20261015);
    return ('<svg class="desenho" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">'
      + ceu(hora, r, amb !== 'caverna') + AMB[amb](r) + atmosfera(amb, hora, sorte(amb.length * 31 + 7)) + '</svg>').replace(/\bm(Ceu|Brilho|Agua|Nevoa|Horiz|AstroG|Raio|Vinheta|VagaG|Macio|Serra)\b/g, 'm$1' + suf);
  }
  /* Uma miniatura do ambiente, para a lista do mestre (o mesmo desenho, menor). */
  const miniatura = (amb, hora) => cena({ amb, hora, sufixo: 'mini' + amb }).replace('class="desenho"', 'class="mini"').replace('xMidYMax slice', 'xMidYMid slice');
  /* Onde ficam os personagens na cena, para n deles: { x, y } em % (no chão da frente, de lado a lado). */
  function lugares(n) {
    const out = [];
    if (!n) return out;
    const porFila = n <= 6 ? n : Math.ceil(n / 2), filas = Math.ceil(n / porFila);
    for (let i = 0; i < n; i++) {
      const fila = Math.floor(i / porFila), naFila = Math.min(porFila, n - fila * porFila), k = i - fila * porFila;
      const larg = Math.min(80, 16 * naFila), x0 = 50 - larg / 2;
      out.push({ x: naFila === 1 ? 50 : x0 + (larg * k) / (naFila - 1), y: filas === 1 ? 80 : fila === 0 ? 76 : 88, fila });
    }
    return out;
  }
  const MeditacaoDesenhos = { cena, miniatura, lugares, AMBIENTES: Object.keys(AMB) };
  if (typeof module === 'object' && module && module.exports) module.exports = MeditacaoDesenhos;
  if (typeof window !== 'undefined') window.MeditacaoDesenhos = MeditacaoDesenhos;
})();
