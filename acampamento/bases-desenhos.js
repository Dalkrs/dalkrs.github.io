/* Tiny Cats · Bases: os desenhos da casa e do esconderijo (lote 125). Sem página: só monta o SVG, em texto.
   A mesma cena de 1600×900 do acampamento (o céu e o chão vêm do AcampDesenhos.fundo, com as cores da hora do dia),
   com a base atrás de onde as pessoas ficam:
     · a casa, numa rua de cidade, em 8 níveis: barraco, casebre, casa simples, casa de família, sobrado, casarão, solar
       e mansão — cada nível maior e mais caprichado que o anterior;
     · o esconderijo, do tipo dele (porão, casa velha, armazém, caverna, ruína, fortaleza escondida), com mais coisa a
       cada nível (as luzes, os caixotes, a vigia, as bandeiras…).
   O traço é o do acampamento: contorno de nanquim, o lado da lua aceso, as janelas com a luz quente de dentro.
   Roda igual no navegador (window.BasesDesenhos) e no Node (testes). */
(() => {
  'use strict';
  const AD = (typeof window !== 'undefined' && window.AcampDesenhos) || (typeof require === 'function' ? require('./desenhos.js') : null);
  const f = n => (Math.round(n * 10) / 10).toString();
  const TR = '#120d09';                      // o contorno de nanquim
  const lua = (d, op) => `<path d="${d}" style="stroke:var(--astro)" stroke-width="2.5" fill="none" opacity="${op || 0.3}"/>`;
  const sombra = (cx, y, rx) => `<ellipse cx="${f(cx)}" cy="${f(y + 6)}" rx="${f(rx)}" ry="${f(Math.max(10, rx * 0.07))}" fill="#000" opacity=".3"/>`;
  const sorte = AD ? AD.sorte : (s => () => 0.5);

  /* ---------------- as peças ---------------- */
  // a janela: o vão escuro (ou aceso), a moldura, a cruz e — se acesa — o brilho em volta
  function janela(x, y, w, h, o) {
    const acesa = !(o && o.apagada), tabuas = o && o.tabuas, arco = o && o.arco;
    const vao = arco ? `M${f(x)} ${f(y + h)}V${f(y + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w)} ${f(y + w / 2)}V${f(y + h)}Z` : `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;
    let s = acesa ? `<rect x="${f(x - w * 0.8)}" y="${f(y - h * 0.5)}" width="${f(w * 2.6)}" height="${f(h * 2)}" fill="url(#gLuz)" opacity=".55"/>` : '';
    s += `<path d="${vao}" fill="${acesa ? '#ffcf73' : '#14100c'}" stroke="${TR}" stroke-width="3"/>`;
    if (acesa) s += `<path d="${vao}" fill="#ff9a3a" opacity=".35"/>`;
    if (!tabuas) s += `<path d="M${f(x + w / 2)} ${f(y + (arco ? 4 : 0))}V${f(y + h)}M${f(x)} ${f(y + h * 0.5)}H${f(x + w)}" stroke="#3a2a1d" stroke-width="3"/>`;
    else s += `<path d="M${f(x - 6)} ${f(y + h * 0.25)}L${f(x + w + 6)} ${f(y + h * 0.4)}M${f(x - 4)} ${f(y + h * 0.75)}L${f(x + w + 5)} ${f(y + h * 0.6)}" stroke="#6a5038" stroke-width="9" stroke-linecap="square"/>`;
    if (o && o.floreira) s += `<rect x="${f(x - 4)}" y="${f(y + h)}" width="${f(w + 8)}" height="9" fill="#5a3d24" stroke="${TR}" stroke-width="2"/><g fill="#c94a5a">${[0.2, 0.5, 0.8].map(k => `<circle cx="${f(x + w * k)}" cy="${f(y + h - 2)}" r="5"/>`).join('')}</g><g fill="#3f6b3a">${[0.35, 0.65].map(k => `<circle cx="${f(x + w * k)}" cy="${f(y + h)}" r="5"/>`).join('')}</g>`;
    if (o && o.persiana) s += `<path d="M${f(x - w * 0.45)} ${f(y)}h${f(w * 0.42)}v${f(h)}h${f(-w * 0.42)}ZM${f(x + w * 1.03)} ${f(y)}h${f(w * 0.42)}v${f(h)}h${f(-w * 0.42)}Z" fill="#2f4a5a" stroke="${TR}" stroke-width="2"/>`;
    return s;
  }
  // a porta: de tábua (com a maçaneta), em arco ou dupla; com o degrau
  function porta(cx, base, w, h, o) {
    const x = cx - w / 2, arco = o && o.arco, cor = (o && o.cor) || '#4a3020';
    const d = arco ? `M${f(x)} ${f(base)}V${f(base - h + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 1 ${f(x + w)} ${f(base - h + w / 2)}V${f(base)}Z` : `M${f(x)} ${f(base)}V${f(base - h)}H${f(x + w)}V${f(base)}Z`;
    let s = `<path d="${d}" fill="${cor}" stroke="${TR}" stroke-width="3"/>`;
    for (let i = 1; i < (o && o.dupla ? 2 : 3); i++) s += `<path d="M${f(x + w * i / (o && o.dupla ? 2 : 3))} ${f(base - h + (arco ? w * 0.18 : 4))}V${f(base - 3)}" stroke="#2a1a10" stroke-width="2" opacity=".7"/>`;
    s += `<circle cx="${f(x + w * (o && o.dupla ? 0.44 : 0.78))}" cy="${f(base - h * 0.45)}" r="3.5" fill="#d9b46a"/>`;
    if (o && o.degrau) s += `<rect x="${f(x - 10)}" y="${f(base)}" width="${f(w + 20)}" height="8" fill="#6d6458" stroke="${TR}" stroke-width="2"/>`;
    if (o && o.lampiao) s += lampiao(x + w + 16, base - h * 0.75);
    return s;
  }
  const lampiao = (x, y) => `<circle cx="${f(x)}" cy="${f(y + 10)}" r="46" fill="url(#gLuz)" opacity=".8"/><path d="M${f(x - 10)} ${f(y - 8)}h14" stroke="#2a1f16" stroke-width="3"/><path d="M${f(x - 7)} ${f(y)}h14l-2 20h-10Z" fill="#ffd27a" stroke="${TR}" stroke-width="2.5"/><path d="M${f(x - 9)} ${f(y)}h18l-9 -8Z" fill="#2a1f16"/>`;
  // a parede (reboco, tábua, pedra ou madeira escura), com o lado da lua um pouco mais claro e o enxaimel
  function parede(x, y, w, h, o) {
    const tipo = (o && o.tipo) || 'reboco';
    const cores = { reboco: ['#b9a37c', '#cbb68f'], tabua: ['#6a5038', '#7d5f43'], pedra: ['#6f6a62', '#827c72'], escura: ['#4a3a2e', '#5a4636'], barro: ['#9a7a54', '#ab8a62'], tijolo: ['#8a4a36', '#9c5640'], branco: ['#d8d2c4', '#e6e0d2'] }[tipo] || ['#b9a37c', '#cbb68f'];
    let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${cores[0]}" stroke="${TR}" stroke-width="3"/><rect x="${f(x + w * 0.55)}" y="${f(y + 2)}" width="${f(w * 0.45 - 2)}" height="${f(h - 4)}" fill="${cores[1]}" opacity=".55"/>`;
    if (tipo === 'tabua') for (let i = 1; i < w / 22; i++) s += `<path d="M${f(x + i * 22)} ${f(y + 3)}V${f(y + h - 3)}" stroke="#3a2a1d" stroke-width="2" opacity=".6"/>`;
    if (tipo === 'pedra' || tipo === 'tijolo') {
      const r = sorte(Math.round(x * 7 + y)), a = tipo === 'tijolo' ? 14 : 22, l = tipo === 'tijolo' ? 30 : 44;
      for (let yy = y + a; yy < y + h - 4; yy += a) s += `<path d="M${f(x + 3)} ${f(yy)}H${f(x + w - 3)}" stroke="#000" stroke-width="1.5" opacity=".25"/>`;
      for (let yy = y, k = 0; yy < y + h - a / 2; yy += a, k++) for (let xx = x + (k % 2 ? l / 2 : l) + r() * 6; xx < x + w - 6; xx += l) s += `<path d="M${f(xx)} ${f(yy + 2)}V${f(Math.min(y + h - 2, yy + a))}" stroke="#000" stroke-width="1.5" opacity=".22"/>`;
    }
    if (o && o.enxaimel) s += `<g stroke="#3a2618" stroke-width="7" opacity=".9"><path d="M${f(x + 4)} ${f(y + h * 0.48)}H${f(x + w - 4)}"/>${[0.25, 0.5, 0.75].map(k => `<path d="M${f(x + w * k)} ${f(y + 4)}V${f(y + h - 4)}"/>`).join('')}<path d="M${f(x + 6)} ${f(y + 6)}L${f(x + w * 0.25)} ${f(y + h * 0.48)}M${f(x + w - 6)} ${f(y + 6)}L${f(x + w * 0.75)} ${f(y + h * 0.48)}"/></g>`;
    if (o && o.base) s += `<rect x="${f(x - 6)}" y="${f(y + h - 22)}" width="${f(w + 12)}" height="22" fill="#5d574e" stroke="${TR}" stroke-width="3"/>`;
    return s + lua(`M${f(x + w - 2)} ${f(y + 3)}V${f(y + h - 3)}`, 0.25);
  }
  // o telhado: de duas águas (telha, palha, zinco remendado ou ardósia), com a beira
  function telhado(x, y, w, a, o) {
    const tipo = (o && o.tipo) || 'telha', b = 18, cx = x + w / 2;
    const cor = { telha: ['#7a3424', '#93412c'], palha: ['#8a7244', '#a3885a'], zinco: ['#5e6670', '#737c86'], ardosia: ['#2f3540', '#3c4350'], tabua: ['#4a3626', '#5a4430'] }[tipo];
    const d = (o && o.reto) ? `M${f(x - b)} ${f(y)}L${f(x + b)} ${f(y - a)}H${f(x + w - b)}L${f(x + w + b)} ${f(y)}Z` : `M${f(x - b)} ${f(y)}L${f(cx)} ${f(y - a)}L${f(x + w + b)} ${f(y)}Z`;
    let s = `<path d="${d}" fill="${cor[0]}" stroke="${TR}" stroke-width="3" stroke-linejoin="round"/>`;
    s += (o && o.reto) ? `<path d="M${f(cx)} ${f(y - a)}H${f(x + w - b)}L${f(x + w + b)} ${f(y)}H${f(cx)}Z" fill="${cor[1]}" opacity=".6"/>` : `<path d="M${f(cx)} ${f(y - a)}L${f(x + w + b)} ${f(y)}H${f(cx)}Z" fill="${cor[1]}" opacity=".6"/>`;
    if (tipo === 'telha' || tipo === 'ardosia') for (let i = 1; i < 5; i++) { const yy = y - a + a * i / 5, k = (yy - (y - a)) / a, hw = (o && o.reto) ? (w / 2 - b) + (b * 2) * k : (w / 2 + b) * k; s += `<path d="M${f(cx - hw)} ${f(yy)}H${f(cx + hw)}" stroke="#000" stroke-width="2" opacity=".22"/>`; }
    if (tipo === 'palha') for (let i = 0; i < w / 14; i++) s += `<path d="M${f(x - b + 6 + i * 14)} ${f(y - 2)}l3 -14" stroke="#5a4628" stroke-width="2" opacity=".5"/>`;
    if (tipo === 'zinco') s += `<rect x="${f(cx - w * 0.3)}" y="${f(y - a * 0.55)}" width="${f(w * 0.22)}" height="${f(a * 0.3)}" fill="#7d5a3a" stroke="${TR}" stroke-width="2" transform="rotate(-8 ${f(cx)} ${f(y)})"/>`;
    s += `<path d="M${f(x - b - 4)} ${f(y)}H${f(x + w + b + 4)}" stroke="#2a1a10" stroke-width="6"/>`;
    return s + lua((o && o.reto) ? `M${f(cx)} ${f(y - a)}H${f(x + w - b)}L${f(x + w + b)} ${f(y)}` : `M${f(cx)} ${f(y - a)}L${f(x + w + b)} ${f(y)}`, 0.32);
  }
  const chamine = (x, y, h, fumaca) => `<rect x="${f(x)}" y="${f(y - h)}" width="28" height="${f(h)}" fill="#6a5f55" stroke="${TR}" stroke-width="3"/><rect x="${f(x - 4)}" y="${f(y - h - 6)}" width="36" height="9" fill="#4d453d" stroke="${TR}" stroke-width="2"/>`
    + (fumaca ? `<g class="fumaca" opacity=".35"><circle cx="${f(x + 18)}" cy="${f(y - h - 24)}" r="13" fill="#9aa0aa" filter="url(#fMacio)"/><circle cx="${f(x + 32)}" cy="${f(y - h - 52)}" r="18" fill="#9aa0aa" filter="url(#fMacio)"/><circle cx="${f(x + 52)}" cy="${f(y - h - 86)}" r="24" fill="#9aa0aa" filter="url(#fMacio)"/></g>` : '');
  const bandeira = (x, y, cor) => `<path d="M${f(x)} ${f(y)}v-70" stroke="#2a1f16" stroke-width="4"/><path d="M${f(x)} ${f(y - 70)}q26 -6 50 4q-24 10 -50 4Z" fill="${cor || '#8e2b2b'}" stroke="${TR}" stroke-width="2"/>`;
  const cerca = (x0, x1, base, cor) => { let s = `<path d="M${f(x0)} ${f(base - 30)}H${f(x1)}M${f(x0)} ${f(base - 14)}H${f(x1)}" stroke="${cor || '#6a5038'}" stroke-width="5"/>`; for (let x = x0; x <= x1; x += 26) s += `<path d="M${f(x)} ${f(base)}V${f(base - 42)}l5 -6l5 6V${f(base)}Z" fill="${cor || '#7d5f43'}" stroke="${TR}" stroke-width="2"/>`; return s; };
  const muro = (x0, x1, base, alt) => { let s = `<rect x="${f(x0)}" y="${f(base - alt)}" width="${f(x1 - x0)}" height="${f(alt)}" fill="#7a746a" stroke="${TR}" stroke-width="3"/><rect x="${f(x0 - 4)}" y="${f(base - alt - 8)}" width="${f(x1 - x0 + 8)}" height="10" fill="#8d877c" stroke="${TR}" stroke-width="2"/>`; for (let x = x0 + 30; x < x1; x += 46) s += `<path d="M${f(x)} ${f(base - alt + 6)}V${f(base - 4)}" stroke="#000" stroke-width="1.5" opacity=".25"/>`; return s; };
  const arbusto = (x, y, r) => `<ellipse cx="${f(x)}" cy="${f(y - r * 0.6)}" rx="${f(r)}" ry="${f(r * 0.7)}" fill="#24402c" stroke="${TR}" stroke-width="2.5"/><ellipse cx="${f(x + r * 0.3)}" cy="${f(y - r * 0.85)}" rx="${f(r * 0.5)}" ry="${f(r * 0.35)}" fill="#33583c"/>`;
  const arvore = (x, base, a) => `<path d="M${f(x - 8)} ${f(base)}V${f(base - a * 0.45)}h16V${f(base)}Z" fill="#3a2a1d" stroke="${TR}" stroke-width="2"/><circle cx="${f(x)}" cy="${f(base - a * 0.62)}" r="${f(a * 0.3)}" fill="#1f3a28" stroke="${TR}" stroke-width="2.5"/><circle cx="${f(x + a * 0.1)}" cy="${f(base - a * 0.72)}" r="${f(a * 0.16)}" fill="#2d5038"/>`;
  const poste = (x, base) => `<path d="M${f(x)} ${f(base)}V${f(base - 150)}" stroke="#2a2a2e" stroke-width="6"/><path d="M${f(x)} ${f(base - 150)}h18" stroke="#2a2a2e" stroke-width="4"/>` + lampiao(x + 18, base - 146);
  const caixote = (x, base, l) => `<rect x="${f(x)}" y="${f(base - l)}" width="${f(l)}" height="${f(l)}" fill="#7a5c3e" stroke="${TR}" stroke-width="2.5"/><path d="M${f(x + 3)} ${f(base - l + 3)}L${f(x + l - 3)} ${f(base - 3)}M${f(x + l - 3)} ${f(base - l + 3)}L${f(x + 3)} ${f(base - 3)}" stroke="#4a3626" stroke-width="2.5"/>`;
  const barril = (x, base, l) => `<rect x="${f(x)}" y="${f(base - l * 1.3)}" width="${f(l)}" height="${f(l * 1.3)}" rx="${f(l * 0.25)}" fill="#6a4a2e" stroke="${TR}" stroke-width="2.5"/><path d="M${f(x)} ${f(base - l * 0.35)}h${f(l)}M${f(x)} ${f(base - l * 0.95)}h${f(l)}" stroke="#2c2c2c" stroke-width="3"/>`;
  const tocha = (x, y) => `<circle cx="${f(x)}" cy="${f(y - 18)}" r="60" fill="url(#gLuz)" opacity=".9"/><path d="M${f(x)} ${f(y)}v-24" stroke="#3a2a1d" stroke-width="6"/><path class="chama" d="M${f(x - 7)} ${f(y - 24)}q7 -26 14 0q-7 6 -14 0Z" fill="#ffb04a" stroke="#d2541e" stroke-width="2"/>`;

  /* ---------------- a rua (o fundo da cidade) ---------------- */
  function cidade(semente) {
    const r = sorte(semente || 919), p = [];
    // as casas da cidade lá longe: telhados e torres, apagados pela névoa, com uma janela acesa aqui e ali
    const longe = 'color-mix(in srgb, var(--mata) 55%, var(--ceu3))', meio = 'color-mix(in srgb, var(--mata) 75%, var(--ceu2))';
    let d = 'M-20 560', x = -20;
    while (x < 1640) { const w = 50 + r() * 70, h = 50 + r() * 90; d += `V${f(560 - h)}l${f(w / 2)} ${f(-20 - r() * 20)}l${f(w / 2)} ${f(20 + r() * 20)}`; x += w; d += `H${f(x)}`; if (r() < 0.12) { d += `V${f(560 - h - 90)}h18V${f(560 - h)}`; x += 18; } }
    p.push(`<path d="${d}V560Z" style="fill:${longe}"/>`);
    for (let i = 0; i < 26; i++) p.push(`<rect x="${f(r() * 1600)}" y="${f(480 + r() * 60)}" width="5" height="7" fill="#ffcf73" opacity="${f(0.25 + r() * 0.4)}"/>`);
    let d2 = 'M-20 575', x2 = -20;
    while (x2 < 1640) { const w = 90 + r() * 90, h = 40 + r() * 60; d2 += `V${f(575 - h)}L${f(x2 + w / 2)} ${f(575 - h - 36)}L${f(x2 + w)} ${f(575 - h)}`; x2 += w; }
    p.push(`<path d="${d2}V580H-20Z" style="fill:${meio}"/>`);
    // a rua de pedra na frente
    p.push('<path d="M0 640Q800 600 1600 640V900H0Z" fill="#000" opacity=".18"/>');
    const rc = sorte(31);
    for (let i = 0; i < 70; i++) { const yy = 650 + rc() * 240, e = 0.6 + (yy - 650) / 300, xx = rc() * 1600; p.push(`<ellipse cx="${f(xx)}" cy="${f(yy)}" rx="${f(16 * e)}" ry="${f(6 * e)}" fill="none" stroke="#000" stroke-width="${f(1.4 * e)}" opacity=".2"/>`); }
    return p.join('');
  }

  /* ---------------- a casa, nível por nível ---------------- */
  const B = 600;              // onde a casa toca o chão (as pessoas ficam na frente, mais embaixo)
  function casa(nivel) {
    const n = Math.max(1, Math.min(8, Math.round(nivel) || 1)), p = [];
    if (n === 1) {          // o barraco: tábuas tortas, o zinco remendado, a janela de tábua
      p.push(sombra(800, B, 170), `<g transform="rotate(-1.5 800 ${B})">`, parede(690, B - 140, 220, 140, { tipo: 'tabua' }), telhado(690, B - 140, 220, 46, { tipo: 'zinco', reto: true }),
        janela(712, B - 108, 44, 40, { tabuas: true, apagada: true }), porta(840, B, 50, 100, { cor: '#5a4632' }), '</g>',
        `<path d="M640 ${B}c10 -24 26 -24 34 0M940 ${B}c8 -18 20 -18 26 0" stroke="#3f5a3a" stroke-width="5" fill="none"/>`, barril(950, B, 30));
    } else if (n === 2) {   // o casebre: pau a pique, telhado de palha, a fumacinha
      p.push(sombra(800, B, 200), parede(660, B - 150, 280, 150, { tipo: 'barro', enxaimel: true }), chamine(880, B - 150 - 40, 40, true), telhado(660, B - 150, 280, 90, { tipo: 'palha' }),
        janela(690, B - 115, 50, 44), porta(820, B, 56, 108, { degrau: true }), cerca(560, 650, B + 10), arbusto(990, B + 6, 28));
    } else if (n === 3) {   // a casa simples: base de pedra, enxaimel, telha, duas janelas e a chaminé
      p.push(sombra(800, B, 230), parede(630, B - 180, 340, 180, { tipo: 'reboco', enxaimel: true, base: true }), chamine(890, B - 180 - 50, 60, true), telhado(630, B - 180, 340, 110, { tipo: 'telha' }),
        janela(660, B - 140, 56, 54, { persiana: true }), janela(890, B - 140, 56, 54, { persiana: true }), porta(800, B, 60, 116, { degrau: true, lampiao: true }), arbusto(600, B + 4, 30), arbusto(1010, B + 4, 34));
    } else if (n === 4) {   // a casa de família: o puxado do lado, as floreiras, a cerca na frente
      p.push(sombra(800, B, 300), parede(940, B - 120, 150, 120, { tipo: 'tabua' }), telhado(940, B - 120, 150, 50, { tipo: 'telha', reto: true }), janela(985, B - 96, 46, 40),
        parede(560, B - 200, 380, 200, { tipo: 'reboco', enxaimel: true, base: true }), chamine(620, B - 200 - 60, 70, true), telhado(560, B - 200, 380, 120, { tipo: 'telha' }),
        janela(585, B - 160, 58, 56, { floreira: true, persiana: true }), janela(855, B - 160, 58, 56, { floreira: true, persiana: true }), janela(735, B - 278, 34, 30),
        porta(750, B, 64, 122, { degrau: true, lampiao: true, cor: '#5a2f24' }), cerca(470, 700, B + 40), cerca(800, 1120, B + 40), arvore(1180, B + 10, 160));
    } else if (n === 5) {   // o sobrado: dois andares, a sacada, a chaminé alta
      p.push(sombra(800, B, 300), parede(590, B - 170, 420, 170, { tipo: 'pedra', base: true }), parede(590, B - 330, 420, 160, { tipo: 'reboco', enxaimel: true }),
        `<rect x="580" y="${B - 174}" width="440" height="10" fill="#4a3626" stroke="${TR}" stroke-width="2"/>`, chamine(920, B - 330 - 60, 80, true), telhado(590, B - 330, 420, 120, { tipo: 'telha' }),
        janela(615, B - 130, 60, 60, { arco: true }), janela(925, B - 130, 60, 60, { arco: true }), janela(620, B - 300, 56, 64, { persiana: true }), janela(924, B - 300, 56, 64, { persiana: true }),
        janela(770, B - 300, 60, 64), `<path d="M745 ${B - 230}h110v-6h-110Z" fill="#3a2a1d" stroke="${TR}" stroke-width="2"/><path d="M748 ${B - 232}v-34M765 ${B - 232}v-34M783 ${B - 232}v-34M800 ${B - 232}v-34M818 ${B - 232}v-34M835 ${B - 232}v-34M852 ${B - 232}v-34M745 ${B - 266}h110" stroke="#3a2a1d" stroke-width="3"/>`,
        porta(800, B, 70, 128, { arco: true, degrau: true, lampiao: true, cor: '#4a2a20' }), arbusto(560, B + 6, 34), arbusto(1040, B + 6, 34), poste(470, B + 40));
    } else if (n === 6) {   // o casarão: a frente larga com a empena no meio, a ala do lado, o muro com o portão
      p.push(sombra(800, B, 420), parede(470, B - 260, 200, 260, { tipo: 'branco', base: true }), telhado(470, B - 260, 200, 90, { tipo: 'telha' }),
        parede(930, B - 260, 200, 260, { tipo: 'branco', base: true }), telhado(930, B - 260, 200, 90, { tipo: 'telha' }),
        parede(660, B - 320, 280, 320, { tipo: 'branco', base: true }), telhado(660, B - 320, 280, 130, { tipo: 'telha' }), chamine(500, B - 260 - 40, 70, true), chamine(1080, B - 260 - 40, 70, false),
        janela(500, B - 200, 54, 66, { persiana: true }), janela(590, B - 200, 54, 66, { persiana: true }), janela(960, B - 200, 54, 66, { persiana: true }), janela(1050, B - 200, 54, 66, { persiana: true }),
        janela(500, B - 100, 54, 62), janela(1050, B - 100, 54, 62), janela(690, B - 270, 50, 70, { arco: true }), janela(860, B - 270, 50, 70, { arco: true }), `<circle cx="800" cy="${B - 380}" r="22" fill="#ffcf73" stroke="${TR}" stroke-width="3"/>`,
        porta(800, B, 86, 140, { arco: true, dupla: true, degrau: true, lampiao: true, cor: '#3d2418' }), muro(340, 700, B + 50, 46), muro(900, 1260, B + 50, 46),
        `<path d="M700 ${B + 50}V${B - 30}M900 ${B + 50}V${B - 30}" stroke="#5d574e" stroke-width="18"/>`, lampiao(700, B - 60), lampiao(900, B - 60), arvore(300, B + 20, 200), arvore(1310, B + 20, 220));
    } else if (n === 7) {   // o solar: a torre de um lado, ardósia, as janelas em fileira, as sebes
      p.push(sombra(800, B, 480), parede(1010, B - 420, 150, 420, { tipo: 'pedra' }), `<path d="M990 ${B - 420}L1085 ${B - 560}L1180 ${B - 420}Z" fill="#2f3540" stroke="${TR}" stroke-width="3"/>`, bandeira(1085, B - 560, '#2b4a8e'),
        janela(1060, B - 360, 46, 64, { arco: true }), janela(1060, B - 250, 46, 64, { arco: true }),
        parede(400, B - 290, 610, 290, { tipo: 'pedra', base: true }), telhado(400, B - 290, 610, 120, { tipo: 'ardosia', reto: true }), chamine(470, B - 290 - 40, 90, true), chamine(900, B - 290 - 40, 90, true),
        ...[440, 540, 640, 810, 910].map(x => janela(x, B - 250, 52, 70, { arco: true })), ...[440, 540, 860, 940].map(x => janela(x, B - 130, 52, 66, { persiana: true })),
        `<path d="M660 ${B - 160}h170v-14h-170Z" fill="#5d574e" stroke="${TR}" stroke-width="2"/>`, `<path d="M670 ${B}V${B - 160}M820 ${B}V${B - 160}" stroke="#8d877c" stroke-width="16"/>`,
        porta(745, B, 90, 148, { arco: true, dupla: true, degrau: true, cor: '#3d2418' }), lampiao(650, B - 120), lampiao(840, B - 120),
        ...[260, 330, 1240, 1310].map(x => arbusto(x, B + 30, 34)), `<rect x="200" y="${B + 4}" width="190" height="30" rx="14" fill="#24402c" stroke="${TR}" stroke-width="2.5"/><rect x="1210" y="${B + 4}" width="190" height="30" rx="14" fill="#24402c" stroke="${TR}" stroke-width="2.5"/>`, poste(140, B + 60), poste(1460, B + 60));
    } else {                // a mansão: as duas alas, a torre central com a bandeira, as colunas e a escadaria
      p.push(sombra(800, B, 620), parede(230, B - 280, 300, 280, { tipo: 'branco', base: true }), telhado(230, B - 280, 300, 110, { tipo: 'ardosia', reto: true }),
        parede(1070, B - 280, 300, 280, { tipo: 'branco', base: true }), telhado(1070, B - 280, 300, 110, { tipo: 'ardosia', reto: true }),
        parede(720, B - 500, 160, 200, { tipo: 'branco' }), `<path d="M700 ${B - 500}L800 ${B - 600}L900 ${B - 500}Z" fill="#2f3540" stroke="${TR}" stroke-width="3"/>`, `<circle cx="800" cy="${B - 440}" r="30" fill="#e8e0c8" stroke="${TR}" stroke-width="3"/><path d="M800 ${B - 440}v-18M800 ${B - 440}l12 8" stroke="${TR}" stroke-width="3"/>`,
        bandeira(380, B - 390, '#7a1f2e'), bandeira(1220, B - 390, '#7a1f2e'),
        parede(530, B - 320, 540, 320, { tipo: 'branco', base: true }), telhado(530, B - 320, 540, 110, { tipo: 'ardosia', reto: true }),
        chamine(300, B - 280 - 40, 90, true), chamine(1270, B - 280 - 40, 90, true), chamine(560, B - 320 - 40, 100, false),
        ...[260, 350, 440, 1100, 1190, 1280].map(x => janela(x, B - 230, 50, 72, { arco: true })), ...[260, 440, 1100, 1280].map(x => janela(x, B - 120, 50, 70, { persiana: true })),
        ...[560, 980].map(x => janela(x, B - 270, 52, 76, { arco: true })), ...[560, 980].map(x => janela(x, B - 140, 52, 72, { persiana: true })),
        `<path d="M660 ${B - 210}L800 ${B - 290}L940 ${B - 210}Z" fill="#e6e0d2" stroke="${TR}" stroke-width="3"/>`, ...[680, 740, 860, 920].map(x => `<rect x="${x - 9}" y="${B - 210}" width="18" height="190" fill="#efe9dc" stroke="${TR}" stroke-width="2.5"/>`),
        porta(800, B - 20, 96, 150, { arco: true, dupla: true, cor: '#3d2418' }), `<path d="M650 ${B - 20}h300v10h20v10h20v12H610v-12h20v-10h20Z" fill="#a8a196" stroke="${TR}" stroke-width="2.5"/>`,
        lampiao(660, B - 190), lampiao(940, B - 190), ...[150, 210, 1390, 1450].map(x => arbusto(x, B + 40, 36)), arvore(80, B + 40, 240), arvore(1520, B + 40, 250), poste(560, B + 80), poste(1040, B + 80));
    }
    return p.join('');
  }

  /* ---------------- os esconderijos ---------------- */
  // o porão por dentro: a parede de pedra, a abóbada, a janelinha com grade e o raio da lua
  function porao(n) {
    const p = ['<rect x="0" y="-1100" width="1600" height="2000" fill="#16120f"/>', parede(-10, 120, 1620, 560, { tipo: 'pedra' }),
      '<rect x="-10" y="120" width="1620" height="560" fill="#1a1410" opacity=".55"/>', '<path d="M-10 120H1610V240C1300 140 300 140 -10 240Z" fill="#100c0a"/>', '<path d="M0 680H1600V900H0Z" fill="#241d17"/>',
      janela(1180, 200, 90, 50, { apagada: true }), '<path d="M1195 200v50M1215 200v50M1235 200v50M1255 200v50" stroke="#2a2a2e" stroke-width="5"/>',
      '<path d="M1180 250L980 680H1300L1270 250Z" style="fill:var(--astro)" opacity=".08"/>', barril(120, 690, 70), barril(200, 690, 70), barril(160, 600, 60), caixote(1380, 690, 90)];
    if (n >= 2) p.push(`<rect x="600" y="600" width="260" height="14" fill="#5a4330" stroke="${TR}" stroke-width="2.5"/><path d="M620 614v70M840 614v70" stroke="#5a4330" stroke-width="10"/><path d="M640 592l90 -10 80 12 -10 6 -150 2Z" fill="#d8c7a0" stroke="${TR}" stroke-width="2"/>`, tocha(700, 590), caixote(1290, 690, 70));
    if (n >= 3) p.push(tocha(380, 360), tocha(1000, 360), '<path d="M1420 300v260M1460 300v260" stroke="#3a2a1d" stroke-width="6"/><path d="M1415 340h50M1415 400h50M1415 460h50" stroke="#a8a8b0" stroke-width="4"/>', `<path d="M260 690h260l-20 -40h-220Z" fill="#5c3b48" stroke="${TR}" stroke-width="2.5"/>`);
    return p.join('');
  }
  // a casa velha: a fachada caindo aos pedaços (que melhora por dentro a cada nível)
  function casaVelha(n) {
    const p = [sombra(800, B, 260), parede(600, B - 200, 400, 200, { tipo: 'escura', enxaimel: true }), telhado(600, B - 200, 400, 120, { tipo: 'tabua' }),
      `<path d="M700 ${B - 290}l40 30 -30 20Z" fill="#100c0a"/>`, janela(630, B - 160, 58, 56, { tabuas: n < 3, apagada: n < 2 }), janela(910, B - 160, 58, 56, { tabuas: true, apagada: true }),
      porta(800, B, 64, 118, { cor: '#3a2a20' }), `<path d="M560 ${B}c20 -40 40 -50 50 -10M1010 ${B}c10 -30 30 -40 40 0" stroke="#2f4a2a" stroke-width="6" fill="none"/>`];
    if (n >= 2) p.push(`<path d="M630 ${B - 160}h58v56h-58Z" fill="#000" opacity=".25"/>`);
    if (n >= 3) p.push(lampiao(850, B - 92), `<path d="M905 ${B - 166}h68v6h-68Z" fill="#7a2a2a"/>`);
    if (n >= 4) p.push(`<path d="M920 ${B - 330}v-40h36v40" fill="none" stroke="#3a2a1d" stroke-width="5"/><path d="M914 ${B - 370}h48l-24 -20Z" fill="#3a2a1d" stroke="${TR}" stroke-width="2"/>`, janela(926, B - 362, 24, 18));
    return p.join('');
  }
  // o armazém: o galpão de portas grandes, os caixotes na frente, a roldana
  function armazem(n) {
    const p = [sombra(800, B, 380), parede(480, B - 260, 640, 260, { tipo: 'tabua' }), telhado(480, B - 260, 640, 110, { tipo: 'zinco' }),
      `<path d="M680 ${B}V${B - 190}H920V${B}Z" fill="#4a3626" stroke="${TR}" stroke-width="3"/><path d="M800 ${B - 190}V${B}M690 ${B - 180}L790 ${B - 10}M910 ${B - 180}L810 ${B - 10}" stroke="#2a1a10" stroke-width="4"/>`,
      `<rect x="700" y="${B - 250}" width="200" height="40" fill="#2a1f16" stroke="${TR}" stroke-width="2"/>`, caixote(1150, B, 70), caixote(1220, B, 60), caixote(1180, B - 70, 56), barril(420, B, 44)];
    if (n >= 3) p.push(`<path d="M800 ${B - 300}v-60M770 ${B - 360}h60" stroke="#2a1f16" stroke-width="6"/><circle cx="800" cy="${B - 300}" r="12" fill="#5d574e" stroke="${TR}" stroke-width="2"/><path d="M800 ${B - 288}v110" stroke="#c7b48a" stroke-width="3"/>`, janela(520, B - 220, 60, 46), janela(1040, B - 220, 60, 46));
    if (n >= 4) p.push(lampiao(950, B - 160), lampiao(650, B - 160), caixote(330, B, 70), caixote(350, B - 70, 50));
    if (n >= 5) p.push(bandeira(1100, B - 260, '#2a2a2a'), poste(1350, B + 40));
    return p.join('');
  }
  // a caverna (o fundo de pedra do acampamento) com a entrada e o que cresce lá dentro
  function caverna(n) {
    const p = [`<path d="M560 ${B}Q560 ${B - 300} 800 ${B - 330}Q1040 ${B - 300} 1040 ${B}Z" fill="#0b0907" stroke="${TR}" stroke-width="4"/>`, tocha(600, B - 120), `<path d="M640 ${B}h120l-10 -20h-100Z" fill="#5c3b48"/>`];
    if (n >= 2) p.push(tocha(1000, B - 120), `<path d="M860 ${B}h140l-10 -20h-120Z" fill="#3b4a5c"/>`, barril(1060, B, 40));
    if (n >= 3) p.push(`<rect x="740" y="${B - 70}" width="130" height="10" fill="#5a4330" stroke="${TR}" stroke-width="2"/><path d="M750 ${B - 60}v60M860 ${B - 60}v60" stroke="#5a4330" stroke-width="8"/>`, caixote(470, B, 60));
    if (n >= 4) { let s = ''; for (let x = 500; x <= 1100; x += 24) if (x < 700 || x > 900) s += `<path d="M${x} ${B + 30}V${B - 40}l6 -10 6 10V${B + 30}Z" fill="#6a5038" stroke="${TR}" stroke-width="2"/>`; p.push(s); }
    if (n >= 5) p.push(bandeira(560, B - 40, '#2b4a2b'), bandeira(1040, B - 40, '#2b4a2b'));
    return p.join('');
  }
  // a ruína: as paredes quebradas e as colunas, com o que o grupo foi consertando
  function ruina(n) {
    const p = [sombra(800, B, 400), `<path d="M480 ${B}V${B - 260}l30 20 20 -50 40 30V${B}Z" fill="#6f6a62" stroke="${TR}" stroke-width="3"/>`, `<path d="M1040 ${B}V${B - 220}l40 -30 30 40 20 -20V${B}Z" fill="#6f6a62" stroke="${TR}" stroke-width="3"/>`,
      ...[640, 760, 880].map((x, i) => `<rect x="${x}" y="${B - 300 + i * 30}" width="40" height="${300 - i * 30}" fill="#8d877c" stroke="${TR}" stroke-width="3"/><path d="M${x - 8} ${B - 300 + i * 30}h56v-14h-56Z" fill="#a8a196" stroke="${TR}" stroke-width="2"/>`),
      `<path d="M590 ${B - 150}c30 30 10 80 40 120M1060 ${B - 180}c-20 40 10 70 -10 120" stroke="#2f4a2a" stroke-width="6" fill="none"/>`];
    if (n >= 3) p.push(`<path d="M600 ${B - 270}L800 ${B - 330}L1000 ${B - 270}" fill="none" stroke="#6a5a41" stroke-width="10"/><path d="M620 ${B - 266}L800 ${B - 320}L980 ${B - 266}V${B - 250}H620Z" fill="#6a5a41" opacity=".85"/>`, tocha(700, B - 40));
    if (n >= 4) p.push(muro(1130, 1300, B + 10, 70), tocha(940, B - 40));
    if (n >= 5) p.push(`<path d="M300 ${B}V${B - 300}h80V${B}Z" fill="#6f6a62" stroke="${TR}" stroke-width="3"/><path d="M290 ${B - 300}h100v-20h-100Z" fill="#8d877c" stroke="${TR}" stroke-width="2"/>`, janela(325, B - 270, 30, 30));
    if (n >= 6) p.push(bandeira(340, B - 320, '#5a2a6e'));
    return p.join('');
  }
  // a fortaleza escondida: no meio do mato, as muralhas e as torres que crescem a cada nível
  function fortaleza(n) {
    const torre = (x, a) => `<rect x="${x - 50}" y="${B - a}" width="100" height="${a}" fill="#5d5a52" stroke="${TR}" stroke-width="3"/><path d="M${x - 58} ${B - a}h116v-20h-14v10h-14v-10h-16v10h-14v-10h-16v10h-14v-10h-14Z" fill="#6f6a62" stroke="${TR}" stroke-width="2"/>` + janela(x - 14, B - a + 40, 28, 40, { arco: true });
    const p = [sombra(800, B, 460)];
    if (n >= 5) p.push(`<g transform="translate(0 -60)">${torre(800, 420)}</g>`, bandeira(800, B - 500, '#1f3a2b'));          // (a torre do meio, atrás da muralha)
    p.push(muro(420, 1180, B, 200), `<path d="M740 ${B}V${B - 130}A60 60 0 0 1 860 ${B - 130}V${B}Z" fill="#3a2a1d" stroke="${TR}" stroke-width="3"/>`, torre(420, 300), torre(1180, 300));
    if (n >= 6) p.push(tocha(700, B - 140), tocha(900, B - 140), janela(560, B - 160, 40, 40), janela(1000, B - 160, 40, 40));
    if (n >= 7) p.push(torre(250, 220), torre(1350, 220), muro(250, 420, B, 140), muro(1180, 1350, B, 140));
    if (n >= 8) p.push(bandeira(420, B - 320, '#1f3a2b'), bandeira(1180, B - 320, '#1f3a2b'));
    // o mato na frente esconde a base
    let mato = '';
    const r = sorte(808);
    for (let x = 160; x < 1460; x += 60 + r() * 40) mato += arbusto(x, B + 50 + r() * 20, 40 + r() * 20);
    p.push(mato);
    return p.join('');
  }
  const ESC = { porao: { fundo: null, f: porao }, casavelha: { fundo: 'cidade', f: casaVelha }, armazem: { fundo: 'cidade', f: armazem }, caverna: { fundo: 'caverna', f: caverna }, ruina: { fundo: 'floresta', f: ruina }, fortaleza: { fundo: 'montanha', f: fortaleza } };

  /* A cena inteira da base: o — { tipo: 'casa' | 'esconderijo', nivel, esc } */
  function cena(o) {
    const x = o || {}, n = Math.max(1, Math.min(8, Math.round(x.nivel) || 1));
    if (!AD) return '';
    if (x.tipo === 'esconderijo') {
      const e = ESC[x.esc] || ESC.casavelha;
      if (!e.fundo) return AD.fundo('caverna') + e.f(n) + AD.atmosfera('caverna');          // (o porão cobre o fundo inteiro: só ficam as definições)
      const base = e.fundo === 'cidade' ? AD.fundo('cidade') + cidade(17) : AD.fundo(e.fundo);
      return base + e.f(n) + AD.atmosfera(e.fundo === 'cidade' ? 'deserto' : e.fundo);
    }
    return AD.fundo('cidade') + cidade(919 + n) + casa(n) + AD.atmosfera('deserto');
  }
  /* Um quadrinho da base (a lista de níveis e o seletor): um svg inteiro, sem gente. */
  function miniatura(o) {
    return `<svg viewBox="0 140 1600 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" class="hora-noite-mini">${cena(o)}</svg>`;
  }
  const BasesDesenhos = { cena, miniatura, casa, ESC: Object.keys(ESC) };
  if (typeof module === 'object' && module && module.exports) module.exports = BasesDesenhos;
  if (typeof window !== 'undefined') window.BasesDesenhos = BasesDesenhos;
})();
