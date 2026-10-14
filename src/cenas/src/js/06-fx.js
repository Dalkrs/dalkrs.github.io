/* ---------------------------------------------------------------
   6. FX — biblioteca de efeitos de magia
   Cada efeito é uma área (círculo, quadrado, retângulo, cone ou linha)
   com uma animação procedural. A animação não guarda estado: tudo é calculado
   a partir do tempo e de uma semente, então qualquer computador que
   receba o mesmo efeito desenha a mesma coisa.
   --------------------------------------------------------------- */
const FX = (() => {
  const sprites = new Map();
  function sprite(color) {
    let s = sprites.get(color);
    if (!s) {
      s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, hexA(color, 1)); gr.addColorStop(0.35, hexA(color, 0.55)); gr.addColorStop(1, hexA(color, 0));
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      sprites.set(color, s);
    }
    return s;
  }
  function blob(c, x, y, r, color, a) {
    if (a <= 0.01 || r <= 0.2) return;
    c.globalAlpha = a > 1 ? 1 : a;
    c.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
  }
  // Ruído determinístico em [0,1).
  function hsh(i, k, seed) {
    const v = Math.sin(i * 127.1 + k * 311.7 + seed * 74.7) * 43758.5453;
    return v - Math.floor(v);
  }
  const cnt = (g, per, min, max, pow) => clamp(Math.round(g.area * per * pow), min, max);

  /* Geometria de um efeito na cena. */
  function geom(e, sc) {
    const cell = sc.cell;
    let x = e.x, y = e.y, half = 0;
    if (e.token) {
      const t = sc.tokens.find(o => o.id === e.token);
      if (t) { half = t.size * cell / 2; x = t.x + half; y = t.y + half; }
    }
    let R = Math.max(cell * 0.25, (e.r || 0) * cell + half);
    const dir = rad(e.dir || 0);
    const cs = Math.cos(dir), sn = Math.sin(dir);
    const p = new Path2D();
    let cx = x, cy = y, inR = R, area, sample, hw = 0, hh = 0, hx = null, hy = null, lab = null;
    if (e.k === 'rect') {
      // Retângulo: largura (rw) e altura (rh) em quadrados, centrado em (x, y) e girado por dir. Preso a um
      // token, fica centrado nele; as medidas são as do próprio retângulo (não somam o tamanho do token).
      hw = Math.max(cell * 0.25, (e.rw > 0 ? e.rw : 1) * cell) / 2;
      hh = Math.max(cell * 0.25, (e.rh > 0 ? e.rh : 1) * cell) / 2;
      const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b]) => [x + cs * a - sn * b, y + sn * a + cs * b]);
      p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath();
      area = 4 * hw * hh;
      R = Math.max(hw, hh); inR = Math.min(hw, hh);
      hx = x + cs * hw; hy = y + sn * hw;                 // a alça fica no meio do lado "da frente"
      sample = (u, v) => { const a = (u * 2 - 1) * hw, b = (v * 2 - 1) * hh; return [x + cs * a - sn * b, y + sn * a + cs * b]; };
      // onde vai o rótulo de duração: no meio do lado que fica mais alto na tela, e o sentido "para dentro" a partir dali
      let top = null;
      for (const m of [[cs * hw, sn * hw], [-cs * hw, -sn * hw], [-sn * hh, cs * hh], [sn * hh, -cs * hh]]) if (!top || m[1] < top[1] - 1e-9) top = m;
      const tl = Math.hypot(top[0], top[1]) || 1;
      lab = { x: x + top[0], y: y + top[1], nx: -top[0] / tl, ny: -top[1] / tl };
    } else if (e.k === 'quad') {
      const pts = [[-R, -R], [R, -R], [R, R], [-R, R]].map(([a, b]) => [x + cs * a - sn * b, y + sn * a + cs * b]);
      p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath();
      area = 4 * R * R;
      sample = (u, v) => { const a = (u * 2 - 1) * R, b = (v * 2 - 1) * R; return [x + cs * a - sn * b, y + sn * a + cs * b]; };
    } else if (e.k === 'cone') {
      const ang = rad(clamp(e.ang || 60, 10, 340));
      p.moveTo(x, y); p.arc(x, y, R, dir - ang / 2, dir + ang / 2); p.closePath();
      area = R * R * ang / 2;
      const s2 = Math.sin(Math.min(ang, Math.PI) / 2);
      inR = R * s2 / (1 + s2);
      cx = x + cs * (R - inR); cy = y + sn * (R - inR);
      sample = (u, v) => { const rr = R * Math.sqrt(u), a = dir + (v - 0.5) * ang; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; };
    } else if (e.k === 'line') {
      const wd = Math.max(cell * 0.25, (e.w || 1) * cell), hw = wd / 2;
      p.moveTo(x + sn * hw, y - cs * hw); p.lineTo(x + cs * R + sn * hw, y + sn * R - cs * hw);
      p.lineTo(x + cs * R - sn * hw, y + sn * R + cs * hw); p.lineTo(x - sn * hw, y + cs * hw); p.closePath();
      area = R * wd;
      cx = x + cs * R / 2; cy = y + sn * R / 2; inR = Math.min(R, wd) / 2;
      sample = (u, v) => { const a = u * R, b = (v - 0.5) * wd; return [x + cs * a - sn * b, y + sn * a + cs * b]; };
    } else {
      p.arc(x, y, R, 0, TAU);
      area = Math.PI * R * R;
      sample = (u, v) => { const rr = R * Math.sqrt(u), a = v * TAU; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; };
    }
    // hw/hh: meia largura e meia altura; lab: âncora do rótulo de duração (os dois só existem no retângulo)
    return {
      path: p, x, y, cx, cy, R, inR, half, cell, dir, cs, sn, area: area / (cell * cell), sample,
      hx: hx == null ? x + cs * R : hx, hy: hy == null ? y + sn * R : hy, hw, hh, lab, seed: 1,
    };
  }

  // Anel de runas usado por arcano, antimagia e luz sagrada.
  function runeRing(c, g, rot, color, alpha, sides, skip) {
    const r = g.inR * 0.86;
    if (r < g.cell * 0.2) return;
    c.save();
    c.translate(g.cx, g.cy); c.rotate(rot);
    c.globalAlpha = alpha; c.strokeStyle = color; c.lineWidth = Math.max(1, g.cell * 0.03);
    c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
    c.beginPath(); c.arc(0, 0, r * 0.8, 0, TAU); c.stroke();
    c.beginPath();
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; c.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); c.lineTo(Math.cos(a) * r * (i % 3 ? 0.87 : 0.94), Math.sin(a) * r * (i % 3 ? 0.87 : 0.94)); }
    c.stroke();
    c.beginPath();
    for (let i = 0; i <= sides; i++) { const a = (i * skip / sides) * TAU - Math.PI / 2; const px = Math.cos(a) * r * 0.78, py = Math.sin(a) * r * 0.78; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke();
    c.restore();
  }

  const P = {
    fogo: {
      n: 'Fogo', tint: '#ff6a1a', base: 0.22, edge: '#ffb14d', glow: true,
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const n = cnt(g, 7, 10, 90, pow);
        for (let i = 0; i < n; i++) {
          const sp = 0.5 + hsh(i, 3, g.seed) * 0.6, ph = t * sp + hsh(i, 4, g.seed);
          const life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 17, 1, g.seed), hsh(i + cyc * 17, 2, g.seed));
          const r = g.cell * (0.2 + hsh(i, 5, g.seed) * 0.3) * (1 - life * 0.55);
          blob(c, x + Math.sin(t * 3 + i) * g.cell * 0.05, y - life * g.cell * 0.3, r,
            life < 0.35 ? '#ffd98a' : life < 0.7 ? '#ff8a24' : '#d6330f', Math.sin(life * Math.PI) * 0.5 * pow);
        }
      },
    },
    gelo: {
      n: 'Gelo', tint: '#8fd4ff', base: 0.2, edge: '#d9f1ff',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.2, 3, 16, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x + Math.sin(t * 0.3 + i * 2) * g.cell * 0.3, y + Math.cos(t * 0.24 + i) * g.cell * 0.3, g.cell * (0.7 + hsh(i, 13, g.seed) * 0.6), '#e8f7ff', 0.16 * pow);
        }
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = '#ffffff'; c.lineCap = 'round';
        const n = cnt(g, 5, 8, 70, pow);
        for (let i = 0; i < n; i++) {
          const tw = Math.sin(t * (1.1 + hsh(i, 3, g.seed) * 1.6) + hsh(i, 4, g.seed) * TAU);
          const a = tw * tw * 0.8 * pow;
          if (a < 0.05) continue;
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const s = g.cell * (0.05 + hsh(i, 5, g.seed) * 0.09);
          c.globalAlpha = a; c.lineWidth = Math.max(0.6, g.cell * 0.022);
          c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s);
          c.moveTo(x - s * 0.5, y - s * 0.5); c.lineTo(x + s * 0.5, y + s * 0.5); c.moveTo(x + s * 0.5, y - s * 0.5); c.lineTo(x - s * 0.5, y + s * 0.5);
          c.stroke();
        }
      },
    },
    raio: {
      n: 'Raio', tint: '#6f8dff', base: 0.14, edge: '#b9cbff', glow: true,
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        c.lineCap = c.lineJoin = 'round';
        const fr = Math.floor(t * 7), k = clamp(Math.round(Math.sqrt(g.area) * 1.3 * pow) + 1, 2, 9);
        const fade = 1 - (t * 7 - fr) * 0.6;
        for (let i = 0; i < k; i++) {
          if (hsh(i, fr, g.seed) < 0.3) continue;
          const a = g.sample(hsh(i, fr + 1, g.seed), hsh(i, fr + 2, g.seed));
          const b = g.sample(hsh(i, fr + 3, g.seed), hsh(i, fr + 4, g.seed));
          c.beginPath(); c.moveTo(a[0], a[1]);
          for (let s = 1; s < 6; s++) {
            const f = s / 6, j = g.cell * 0.45;
            c.lineTo(a[0] + (b[0] - a[0]) * f + (hsh(i * 7 + s, fr, g.seed) - 0.5) * j, a[1] + (b[1] - a[1]) * f + (hsh(i * 7 + s, fr + 9, g.seed) - 0.5) * j);
          }
          c.lineTo(b[0], b[1]);
          c.globalAlpha = 0.3 * pow * fade; c.strokeStyle = '#7aa2ff'; c.lineWidth = g.cell * 0.13; c.stroke();
          c.globalAlpha = 0.85 * pow * fade; c.strokeStyle = '#f0f5ff'; c.lineWidth = Math.max(0.8, g.cell * 0.035); c.stroke();
        }
      },
    },
    agua: {
      n: 'Água', tint: '#2f8fd6', base: 0.26, edge: '#9bd4ff',
      draw(c, g, t, pow) {
        const n = cnt(g, 0.9, 3, 14, pow);
        c.strokeStyle = '#d6efff';
        for (let i = 0; i < n; i++) {
          const sp = 0.22 + hsh(i, 3, g.seed) * 0.2, ph = t * sp + hsh(i, 4, g.seed);
          const life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 13, 1, g.seed), hsh(i + cyc * 13, 2, g.seed));
          for (let k = 0; k < 2; k++) {
            const l = life - k * 0.18;
            if (l <= 0) continue;
            c.globalAlpha = (1 - l) * 0.5 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.035);
            c.beginPath(); c.arc(x, y, l * g.cell * 1.1, 0, TAU); c.stroke();
          }
        }
      },
    },
    vento: {
      n: 'Vento', tint: '#cfe3e8', base: 0.1, edge: '#e8f4f6',
      draw(c, g, t, pow) {
        c.strokeStyle = '#ffffff'; c.lineCap = 'round';
        const n = cnt(g, 3, 6, 46, pow);
        const span = g.R * 2.2;
        for (let i = 0; i < n; i++) {
          const sp = 0.35 + hsh(i, 3, g.seed) * 0.4, ph = (t * sp + hsh(i, 4, g.seed)) % 1;
          const off = (hsh(i, 1, g.seed) - 0.5) * span;
          const along = (ph - 0.5) * span;
          const bx = g.cx + g.cs * along - g.sn * off;
          const by = g.cy + g.sn * along + g.cs * off;
          const len = g.cell * (0.5 + hsh(i, 5, g.seed) * 0.8);
          const sway = Math.sin(t * 2 + i) * g.cell * 0.08;
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.5 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.03);
          c.beginPath();
          c.moveTo(bx, by);
          c.quadraticCurveTo(bx + g.cs * len * 0.5 - g.sn * sway, by + g.sn * len * 0.5 + g.cs * sway, bx + g.cs * len, by + g.sn * len);
          c.stroke();
        }
      },
    },
    terra: {
      n: 'Terra', tint: '#7a5a3a', base: 0.3, edge: '#b08a5c',
      draw(c, g, t, pow) {
        const n = cnt(g, 4, 6, 60, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const sh = Math.sin(t * (5 + hsh(i, 3, g.seed) * 4) + i) * g.cell * 0.02;
          const s = g.cell * (0.05 + hsh(i, 5, g.seed) * 0.1);
          c.globalAlpha = 0.75 * pow; c.fillStyle = hsh(i, 6, g.seed) > 0.5 ? '#4f3a26' : '#9a7b55';
          c.beginPath();
          c.moveTo(x - s + sh, y - s * 0.4); c.lineTo(x + s * 0.3 + sh, y - s); c.lineTo(x + s + sh, y + s * 0.2); c.lineTo(x + sh, y + s); c.closePath();
          c.fill();
        }
        const d = cnt(g, 1.2, 2, 14, pow);
        for (let i = 0; i < d; i++) {
          const ph = (t * 0.3 + hsh(i, 8, g.seed)) % 1;
          const [x, y] = g.sample(hsh(i + Math.floor(t * 0.3 + hsh(i, 8, g.seed)) * 5, 9, g.seed), hsh(i, 10, g.seed));
          blob(c, x, y, g.cell * (0.3 + ph * 0.5), '#c9ad85', Math.sin(ph * Math.PI) * 0.22 * pow);
        }
      },
    },
    veneno: {
      n: 'Veneno', tint: '#5fae2e', base: 0.24, edge: '#b6e36a',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.2, 3, 14, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x + Math.sin(t * 0.4 + i) * g.cell * 0.25, y + Math.cos(t * 0.33 + i * 2) * g.cell * 0.25, g.cell * (0.6 + hsh(i, 13, g.seed) * 0.5), '#9fe04a', 0.16 * pow);
        }
        const n = cnt(g, 3.5, 6, 50, pow);
        c.strokeStyle = '#d9ff9c'; c.fillStyle = 'rgba(190,255,120,0.18)';
        for (let i = 0; i < n; i++) {
          const sp = 0.3 + hsh(i, 3, g.seed) * 0.5, ph = t * sp + hsh(i, 4, g.seed);
          const life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 19, 1, g.seed), hsh(i + cyc * 19, 2, g.seed));
          const r = g.cell * (0.04 + hsh(i, 5, g.seed) * 0.09) * (0.4 + life * 0.8);
          c.globalAlpha = (life < 0.85 ? 0.7 : (1 - life) / 0.15 * 0.7) * pow; c.lineWidth = Math.max(0.6, g.cell * 0.02);
          c.beginPath(); c.arc(x, y - life * g.cell * 0.12, r, 0, TAU); c.fill(); c.stroke();
        }
      },
    },
    nevoa: {
      n: 'Névoa', tint: '#c9d0d8', base: 0.2, edge: '#e3e8ee',
      draw(c, g, t, pow) {
        const n = cnt(g, 2.2, 5, 34, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const dx = Math.sin(t * (0.12 + hsh(i, 3, g.seed) * 0.15) + i) * g.cell * 0.7;
          const dy = Math.cos(t * (0.1 + hsh(i, 4, g.seed) * 0.13) + i * 1.7) * g.cell * 0.5;
          blob(c, x + dx, y + dy, g.cell * (0.8 + hsh(i, 5, g.seed) * 0.9), '#eef2f6', (0.2 + 0.08 * Math.sin(t * 0.5 + i)) * pow);
        }
      },
    },
    sombra: {
      n: 'Sombra', tint: '#0c0714', base: 0.5, edge: '#7a4fb0',
      draw(c, g, t, pow) {
        const n = cnt(g, 2.4, 5, 36, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const sp = (0.18 + hsh(i, 3, g.seed) * 0.22) * (i % 2 ? 1 : -1);
          const dx = Math.cos(t * sp + i * 2.1) * g.cell * 0.6, dy = Math.sin(t * sp + i * 2.1) * g.cell * 0.6;
          blob(c, x + dx, y + dy, g.cell * (0.6 + hsh(i, 5, g.seed) * 0.8), i % 3 ? '#05030a' : '#3a1f5c', (0.3 + 0.1 * Math.sin(t + i)) * pow);
        }
      },
    },
    cura: {
      n: 'Cura', tint: '#3ddc84', base: 0.16, edge: '#a9f5c8', glow: true,
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const ph = (t * 0.35) % 1;
        blob(c, g.cx, g.cy, g.inR * (0.4 + ph * 0.9), '#6dffa8', (1 - ph) * 0.22 * pow);
        c.strokeStyle = '#d9ffe9'; c.lineCap = 'round';
        const n = cnt(g, 3.5, 6, 54, pow);
        for (let i = 0; i < n; i++) {
          const sp = 0.3 + hsh(i, 3, g.seed) * 0.35, p2 = t * sp + hsh(i, 4, g.seed);
          const life = p2 % 1, cyc = Math.floor(p2);
          const [x, y0] = g.sample(hsh(i + cyc * 23, 1, g.seed), hsh(i + cyc * 23, 2, g.seed));
          const y = y0 - life * g.cell * 0.5;
          const s = g.cell * (0.05 + hsh(i, 5, g.seed) * 0.06);
          const a = Math.sin(life * Math.PI) * 0.85 * pow;
          blob(c, x, y, s * 2.4, '#55f09a', a * 0.5);
          c.globalAlpha = a; c.lineWidth = Math.max(0.8, g.cell * 0.03);
          c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
        }
      },
    },
    sagrado: {
      n: 'Luz sagrada', tint: '#ffd45a', base: 0.16, edge: '#fff0b8', glow: true,
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        blob(c, g.cx, g.cy, g.inR * 1.25, '#ffe9a3', (0.2 + 0.06 * Math.sin(t * 1.4)) * pow);
        c.save();
        c.translate(g.cx, g.cy); c.rotate(t * 0.12);
        c.fillStyle = '#fff3c4';
        const rays = 12, r = g.inR * 0.98;
        for (let i = 0; i < rays; i++) {
          const a = i / rays * TAU, w = 0.07 + (i % 2) * 0.05;
          c.globalAlpha = (0.1 + 0.05 * Math.sin(t * 1.7 + i * 1.3)) * pow;
          c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - w) * r, Math.sin(a - w) * r); c.lineTo(Math.cos(a + w) * r, Math.sin(a + w) * r); c.closePath(); c.fill();
        }
        c.restore();
        runeRing(c, g, -t * 0.1, '#fff3c4', 0.5 * pow, 4, 1);
        const n = cnt(g, 2.5, 5, 40, pow);
        for (let i = 0; i < n; i++) {
          const sp = 0.2 + hsh(i, 3, g.seed) * 0.3, p2 = t * sp + hsh(i, 4, g.seed);
          const life = p2 % 1, cyc = Math.floor(p2);
          const [x, y] = g.sample(hsh(i + cyc * 29, 1, g.seed), hsh(i + cyc * 29, 2, g.seed));
          blob(c, x, y - life * g.cell * 0.45, g.cell * 0.09, '#fff6d6', Math.sin(life * Math.PI) * 0.9 * pow);
        }
      },
    },
    arcano: {
      n: 'Magia arcana', tint: '#3f7dff', base: 0.16, edge: '#a9c6ff', glow: true,
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        runeRing(c, g, t * 0.25, '#cfe0ff', 0.75 * pow, 6, 2);
        runeRing(c, { cx: g.cx, cy: g.cy, inR: g.inR * 0.56, cell: g.cell }, -t * 0.4, '#8fb4ff', 0.6 * pow, 3, 1);
        const n = cnt(g, 3, 6, 46, pow);
        for (let i = 0; i < n; i++) {
          const a0 = (hsh(i, 1, g.seed) + t * (0.03 + hsh(i, 3, g.seed) * 0.05)) % 1;
          const [x, y] = g.sample(hsh(i, 2, g.seed), a0);
          const tw = (0.5 + 0.5 * Math.sin(t * (1.5 + hsh(i, 4, g.seed) * 2) + i)) * Math.min(1, Math.sin(a0 * Math.PI) * 4);
          blob(c, x, y, g.cell * (0.07 + hsh(i, 5, g.seed) * 0.07), i % 4 ? '#7fa8ff' : '#e6eeff', tw * 0.8 * pow);
        }
      },
    },
    antimagia: {
      n: 'Antimagia', tint: '#8a3fd6', base: 0.2, edge: '#d3a6ff', glow: true,
      draw(c, g, t, pow) {
        blob(c, g.cx, g.cy, g.inR * 0.75, '#12061f', 0.5 * pow);
        c.globalCompositeOperation = 'lighter';
        runeRing(c, g, -t * 0.3, '#e2c4ff', 0.7 * pow, 5, 2);
        const n = cnt(g, 3.2, 6, 50, pow);
        for (let i = 0; i < n; i++) {
          const sp = 0.25 + hsh(i, 3, g.seed) * 0.35, p2 = t * sp + hsh(i, 4, g.seed);
          const life = p2 % 1, cyc = Math.floor(p2);
          const [x0, y0] = g.sample(0.55 + hsh(i + cyc * 31, 1, g.seed) * 0.45, hsh(i + cyc * 31, 2, g.seed));
          const k = life * life;                       // acelera em direção ao centro
          const x = x0 + (g.cx - x0) * k, y = y0 + (g.cy - y0) * k;
          blob(c, x, y, g.cell * (0.1 - life * 0.05), '#c58bff', Math.sin(life * Math.PI) * 0.8 * pow);
        }
      },
    },
    tinta: {
      n: 'Tinta', tint: '#07080c', base: 0.34, edge: '#2a2d3a',
      draw(c, g, t, pow) {
        const n = cnt(g, 3, 5, 40, pow);
        c.fillStyle = '#05060a';
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const br = 0.75 + 0.25 * Math.sin(t * (0.4 + hsh(i, 3, g.seed) * 0.5) + hsh(i, 4, g.seed) * TAU);
          const r = g.cell * (0.16 + hsh(i, 5, g.seed) * 0.3) * br;
          c.globalAlpha = 0.82 * pow;
          c.beginPath();
          for (let k = 0; k <= 10; k++) {
            const a = k / 10 * TAU;
            const rr = r * (0.75 + 0.35 * hsh(i * 13 + (k % 10), 6, g.seed) + 0.08 * Math.sin(t * 0.9 + k + i));
            const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
            if (k) c.lineTo(px, py); else c.moveTo(px, py);
          }
          c.closePath(); c.fill();
          for (let k = 0; k < 3; k++) {
            const a = hsh(i * 5 + k, 7, g.seed) * TAU, d = r * (1.3 + hsh(i * 5 + k, 8, g.seed) * 0.9);
            c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (0.08 + hsh(i * 5 + k, 9, g.seed) * 0.14), 0, TAU); c.fill();
          }
        }
        c.globalCompositeOperation = 'lighter';
        const m = cnt(g, 0.7, 2, 10, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 21, g.seed), hsh(i, 22, g.seed));
          blob(c, x, y, g.cell * 0.5, '#3b4a8a', (0.1 + 0.06 * Math.sin(t * 0.8 + i)) * pow);
        }
      },
    },

    /* ---------- Lote 5: zonas novas ---------- */
    lava: {
      n: 'Lava', tint: '#ff4a10', base: 0.55, edge: '#ffb347', glow: true, g: 'elem', sug: 'fogo',
      draw(c, g, t, pow) {
        // a crosta escura em placas, com o brilho da lava pelas rachaduras
        c.globalCompositeOperation = 'lighter';
        const m = cnt(g, 1, 3, 16, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 41, g.seed), hsh(i, 42, g.seed));
          blob(c, x, y, g.cell * (0.6 + 0.2 * Math.sin(t * 0.9 + i)), '#ffb04a', (0.18 + 0.08 * Math.sin(t * 1.3 + i * 2)) * pow);
        }
        c.globalCompositeOperation = 'source-over';
        const n = cnt(g, 3, 5, 60, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const r = g.cell * (0.18 + hsh(i, 3, g.seed) * 0.16);
          c.globalAlpha = 0.82 * pow; c.fillStyle = hsh(i, 4, g.seed) > 0.5 ? '#2a0d06' : '#3a1408';
          c.beginPath();
          for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + hsh(i, 5, g.seed), rr = r * (0.7 + 0.3 * hsh(i * 7 + (k % 6), 6, g.seed)); if (k) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          c.closePath(); c.fill();
        }
        // bolhas que estouram
        c.globalCompositeOperation = 'lighter';
        const b = cnt(g, 0.8, 2, 12, pow);
        for (let i = 0; i < b; i++) {
          const sp = 0.25 + hsh(i, 7, g.seed) * 0.3, ph = t * sp + hsh(i, 8, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 11, 9, g.seed), hsh(i + cyc * 11, 10, g.seed));
          c.globalAlpha = (1 - life) * 0.8 * pow; c.strokeStyle = '#ffd27a'; c.lineWidth = Math.max(0.8, g.cell * 0.03);
          c.beginPath(); c.arc(x, y, g.cell * 0.12 * (0.3 + life), 0, TAU); c.stroke();
        }
      },
    },
    areia: {
      n: 'Areia movediça', tint: '#c9a15a', base: 0.42, edge: '#e8cf98', g: 'elem', sug: 'agarrado',
      draw(c, g, t, pow) {
        // o funil: escuro no meio, e a areia descendo em espiral para lá
        blob(c, g.cx, g.cy, g.inR * 0.6, '#4a3210', 0.55 * pow);
        c.strokeStyle = '#6b4a1a'; c.lineCap = 'round';
        for (let k = 0; k < 6; k++) {
          const f = ((k / 6) + t * 0.06) % 1, r = g.inR * (1 - f) * 0.95, a0 = t * 0.5 + k * 1.1 + f * 4;
          c.globalAlpha = (0.2 + 0.45 * f) * pow; c.lineWidth = Math.max(1, g.cell * 0.06 * (1 - f * 0.5));
          c.beginPath(); c.arc(g.cx, g.cy, Math.max(1, r), a0, a0 + Math.PI * 1.1); c.stroke();
        }
        const n = cnt(g, 6, 10, 90, pow);
        c.fillStyle = '#f6e2b0';
        for (let i = 0; i < n; i++) {
          const f = (((hsh(i, 2, g.seed) - t * 0.04) % 1) + 1) % 1, a0 = hsh(i, 1, g.seed) * TAU + t * 0.5 + f * 4, d = g.inR * 0.95 * f;
          c.globalAlpha = (0.3 + 0.5 * f) * pow;
          c.beginPath(); c.arc(g.cx + Math.cos(a0) * d, g.cy + Math.sin(a0) * d, Math.max(0.7, g.cell * 0.035), 0, TAU); c.fill();
        }
      },
    },
    tempestade: {
      n: 'Tempestade de raios', tint: '#2e3a66', base: 0.32, edge: '#a8b8ff', glow: true, g: 'elem', sug: 'atordoado',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.2, 3, 14, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x + Math.sin(t * 0.3 + i) * g.cell * 0.4, y, g.cell * (0.9 + hsh(i, 13, g.seed) * 0.6), '#1a2040', 0.3 * pow);
        }
        // chuva em diagonal
        c.strokeStyle = '#c9d6ff'; c.lineCap = 'round'; c.lineWidth = Math.max(0.6, g.cell * 0.018);
        const n = cnt(g, 7, 12, 110, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (1.6 + hsh(i, 3, g.seed)) + hsh(i, 4, g.seed)) % 1;
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const dy = (ph - 0.5) * g.cell * 1.2;
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.45 * pow;
          c.beginPath(); c.moveTo(x + dy * 0.3, y + dy); c.lineTo(x + dy * 0.3 - g.cell * 0.08, y + dy - g.cell * 0.22); c.stroke();
        }
        // o raio, de vez em quando, com o clarão
        c.globalCompositeOperation = 'lighter';
        const fr = Math.floor(t * 1.6), on = hsh(fr, 5, g.seed) > 0.45, fase = t * 1.6 - fr;
        if (on && fase < 0.22) {
          const a = g.sample(hsh(fr, 6, g.seed), hsh(fr, 7, g.seed)), b = g.sample(hsh(fr, 8, g.seed), hsh(fr, 9, g.seed));
          const k = 1 - fase / 0.22;
          blob(c, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, g.inR * 1.2, '#9fb4ff', 0.25 * k * pow);
          c.beginPath(); c.moveTo(a[0], a[1]);
          for (let s2 = 1; s2 < 7; s2++) { const f = s2 / 7; c.lineTo(a[0] + (b[0] - a[0]) * f + (hsh(s2, fr, g.seed) - 0.5) * g.cell * 0.6, a[1] + (b[1] - a[1]) * f + (hsh(s2, fr + 3, g.seed) - 0.5) * g.cell * 0.6); }
          c.lineTo(b[0], b[1]);
          c.globalAlpha = 0.35 * k * pow; c.strokeStyle = '#7aa2ff'; c.lineWidth = g.cell * 0.16; c.stroke();
          c.globalAlpha = 0.95 * k * pow; c.strokeStyle = '#f4f7ff'; c.lineWidth = Math.max(1, g.cell * 0.04); c.stroke();
        }
      },
    },
    nevasca: {
      n: 'Nevasca', tint: '#dcecff', base: 0.26, edge: '#ffffff', g: 'elem', sug: 'resfriado',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.3, 3, 16, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x + Math.sin(t * 0.8 + i) * g.cell * 0.6, y + Math.cos(t * 0.6 + i) * g.cell * 0.3, g.cell * (0.8 + hsh(i, 13, g.seed) * 0.6), '#ffffff', (0.16 + 0.06 * Math.sin(t + i)) * pow);
        }
        // flocos levados pelo vento
        c.fillStyle = '#ffffff';
        const n = cnt(g, 9, 14, 140, pow), span = g.R * 2.2;
        for (let i = 0; i < n; i++) {
          const sp = 0.25 + hsh(i, 3, g.seed) * 0.35, ph = (t * sp + hsh(i, 4, g.seed)) % 1;
          const off = (hsh(i, 1, g.seed) - 0.5) * span, along = (ph - 0.5) * span;
          const x = g.cx + along + Math.sin(t * 2 + i) * g.cell * 0.1, y = g.cy + off + along * 0.35;
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.85 * pow;
          c.beginPath(); c.arc(x, y, Math.max(0.6, g.cell * (0.02 + hsh(i, 5, g.seed) * 0.03)), 0, TAU); c.fill();
        }
      },
    },
    acida: {
      n: 'Chuva ácida', tint: '#9acd32', base: 0.18, edge: '#d4ff6a', g: 'elem', sug: 'veneno',
      draw(c, g, t, pow) {
        c.strokeStyle = '#d9ff8a'; c.lineCap = 'round'; c.lineWidth = Math.max(0.6, g.cell * 0.02);
        const n = cnt(g, 6, 10, 90, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (1.3 + hsh(i, 3, g.seed) * 0.8) + hsh(i, 4, g.seed)) % 1;
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const dy = (ph - 0.6) * g.cell * 1.1;
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.6 * pow;
          c.beginPath(); c.moveTo(x, y + dy); c.lineTo(x, y + dy - g.cell * 0.2); c.stroke();
        }
        // respingos que chiam no chão
        const b = cnt(g, 1.6, 3, 24, pow);
        for (let i = 0; i < b; i++) {
          const ph = t * (0.7 + hsh(i, 7, g.seed) * 0.5) + hsh(i, 8, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 7, 9, g.seed), hsh(i + cyc * 7, 10, g.seed));
          c.globalAlpha = (1 - life) * 0.7 * pow; c.strokeStyle = '#eaff9a';
          c.beginPath(); c.ellipse(x, y, g.cell * 0.18 * life + 0.5, g.cell * 0.08 * life + 0.5, 0, 0, TAU); c.stroke();
          blob(c, x, y - life * g.cell * 0.15, g.cell * 0.06, '#c6f06a', (1 - life) * 0.5 * pow);
        }
      },
    },
    escuridao: {
      n: 'Escuridão mágica', tint: '#020104', base: 0.8, edge: '#4a2f7a', g: 'magia', sug: 'cego',
      draw(c, g, t, pow) {
        const n = cnt(g, 2, 4, 30, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(0.6 + hsh(i, 1, g.seed) * 0.4, hsh(i, 2, g.seed) + t * 0.02);
          blob(c, x, y, g.cell * (0.5 + hsh(i, 5, g.seed) * 0.6), i % 3 ? '#000000' : '#2a1648', (0.4 + 0.15 * Math.sin(t * 0.7 + i)) * pow);
        }
        // fiapos roxos girando na borda
        c.strokeStyle = '#6a45a8'; c.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU + t * 0.25;
          c.globalAlpha = (0.2 + 0.15 * Math.sin(t + i)) * pow; c.lineWidth = Math.max(0.8, g.cell * 0.03);
          c.beginPath(); c.arc(g.cx, g.cy, g.inR * (0.75 + 0.15 * Math.sin(t * 0.6 + i)), a, a + 0.7); c.stroke();
        }
      },
    },
    teia: {
      n: 'Teia', tint: '#d8d8d8', base: 0.07, edge: '#f4f4f4', g: 'magia', sug: 'emaranhado',
      draw(c, g, t, pow) {
        // a teia: raios saindo do meio e voltas ligando os raios, que brilham de leve
        const raios = 12, r = g.R * 1.05, brilho = 0.5 + 0.5 * Math.sin(t * 1.4 + g.seed);
        c.strokeStyle = '#f2f2f2'; c.lineCap = 'round';
        c.globalAlpha = (0.45 + 0.15 * brilho) * pow; c.lineWidth = Math.max(0.6, g.cell * 0.018);
        const ang = k => k / raios * TAU + hsh(k, 1, g.seed) * 0.2;
        c.beginPath();
        for (let k = 0; k < raios; k++) { c.moveTo(g.cx, g.cy); c.lineTo(g.cx + Math.cos(ang(k)) * r, g.cy + Math.sin(ang(k)) * r); }
        c.stroke();
        for (let v = 1; v <= 7; v++) {
          const rv = r * v / 7.5;
          c.globalAlpha = (0.3 + 0.2 * brilho) * pow;
          c.beginPath();
          for (let k = 0; k <= raios; k++) {
            const a0 = ang(k % raios), a1 = ang((k + 1) % raios) + (k + 1 === raios ? TAU : 0);
            const p0 = [g.cx + Math.cos(a0) * rv, g.cy + Math.sin(a0) * rv];
            if (!k) c.moveTo(p0[0], p0[1]);
            if (k < raios) { const am = (a0 + a1) / 2, p1 = [g.cx + Math.cos(a1) * rv, g.cy + Math.sin(a1) * rv]; c.quadraticCurveTo(g.cx + Math.cos(am) * rv * 0.9, g.cy + Math.sin(am) * rv * 0.9, p1[0], p1[1]); }
          }
          c.stroke();
        }
        // gotas de orvalho
        const n = cnt(g, 2, 4, 30, pow);
        for (let i = 0; i < n; i++) { const [x, y] = g.sample(hsh(i, 3, g.seed), hsh(i, 4, g.seed)); blob(c, x, y, g.cell * 0.05, '#ffffff', (0.3 + 0.5 * Math.max(0, Math.sin(t * 1.2 + i * 2.3))) * pow); }
      },
    },
    barreira: {
      n: 'Barreira de força', tint: '#5fd0ff', base: 0.1, edge: '#bff0ff', glow: true, g: 'magia', sug: 'escudo',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        // grade de hexágonos, com uma onda de brilho que passa
        const s0 = g.cell * 0.42, w = s0 * Math.sqrt(3), hh = s0 * 1.5, x0 = g.cx - g.R - w, y0 = g.cy - g.R - hh;
        const cols = Math.ceil((g.R * 2 + w * 2) / w) + 1, rows = Math.ceil((g.R * 2 + hh * 2) / hh) + 1;
        c.strokeStyle = '#bff0ff'; c.lineWidth = Math.max(0.6, g.cell * 0.02);
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const x = x0 + i * w + (j % 2) * w / 2, y = y0 + j * hh;
          const d = Math.hypot(x - g.cx, y - g.cy) / Math.max(1, g.R), onda = Math.max(0, Math.sin((d - t * 0.5) * TAU * 1.2));
          c.globalAlpha = (0.12 + 0.45 * onda * onda) * pow;
          c.beginPath();
          for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + Math.PI / 6, px = x + Math.cos(a) * s0 * 0.92, py = y + Math.sin(a) * s0 * 0.92; if (k) c.lineTo(px, py); else c.moveTo(px, py); }
          c.stroke();
        }
        blob(c, g.cx, g.cy, g.inR * 1.1, '#7fdcff', (0.08 + 0.04 * Math.sin(t * 2)) * pow);
      },
    },
    circulo: {
      n: 'Círculo arcano', tint: '#9a4fff', base: 0.1, edge: '#e6c6ff', glow: true, g: 'magia', sug: 'foco',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        blob(c, g.cx, g.cy, g.inR * 0.9, '#b27aff', (0.12 + 0.08 * Math.sin(t * 1.5)) * pow);
        runeRing(c, g, t * 0.15, '#e6c6ff', 0.8 * pow, 5, 2);
        runeRing(c, { cx: g.cx, cy: g.cy, inR: g.inR * 0.62, cell: g.cell }, -t * 0.3, '#c99bff', 0.7 * pow, 6, 1);
        runeRing(c, { cx: g.cx, cy: g.cy, inR: g.inR * 0.3, cell: g.cell }, t * 0.5, '#f2e4ff', 0.6 * pow, 3, 1);
        // glifos que piscam na volta de fora
        const r = g.inR * 0.93;
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU + t * 0.15, tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
          blob(c, g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r, g.cell * 0.12, '#f0dcff', tw * 0.7 * pow);
        }
      },
    },
    silencio: {
      n: 'Silêncio', tint: '#6c7a96', base: 0.16, edge: '#c9d3e6', g: 'magia', sug: 'silencio',
      draw(c, g, t, pow) {
        // anéis que encolhem para o meio: o som sumindo
        c.strokeStyle = '#dfe6f2';
        for (let k = 0; k < 4; k++) {
          const f = ((k / 4) + t * 0.12) % 1, r = g.inR * (1 - f);
          c.globalAlpha = f * 0.35 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.03);
          c.beginPath(); c.arc(g.cx, g.cy, Math.max(1, r), 0, TAU); c.stroke();
        }
        const m = cnt(g, 1, 2, 10, pow);
        for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed)); blob(c, x, y, g.cell * 0.9, '#aab6cc', 0.12 * pow); }
      },
    },
    toxica: {
      n: 'Nuvem tóxica', tint: '#7fbf2a', base: 0.3, edge: '#c6f06a', g: 'natureza', sug: 'veneno',
      draw(c, g, t, pow) {
        const n = cnt(g, 2.6, 5, 40, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const dx = Math.sin(t * (0.15 + hsh(i, 3, g.seed) * 0.15) + i) * g.cell * 0.6, dy = Math.cos(t * (0.12 + hsh(i, 4, g.seed) * 0.1) + i * 1.3) * g.cell * 0.4;
          blob(c, x + dx, y + dy, g.cell * (0.7 + hsh(i, 5, g.seed) * 0.8), i % 3 ? '#cdf274' : '#3e6a12', (0.34 + 0.1 * Math.sin(t * 0.5 + i)) * pow);
        }
        c.fillStyle = '#e6ff9a';
        const b = cnt(g, 2, 3, 24, pow);
        for (let i = 0; i < b; i++) {
          const ph = (t * 0.2 + hsh(i, 7, g.seed)) % 1, [x, y] = g.sample(hsh(i, 8, g.seed), hsh(i, 9, g.seed));
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.5 * pow;
          c.beginPath(); c.arc(x, y - ph * g.cell * 0.4, Math.max(0.6, g.cell * 0.03), 0, TAU); c.fill();
        }
      },
    },
    espinhos: {
      n: 'Espinhos e raízes', tint: '#3d5a2a', base: 0.24, edge: '#8aa85a', g: 'natureza', sug: 'emaranhado',
      draw(c, g, t, pow) {
        const n = cnt(g, 1.6, 3, 22, pow);
        c.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const a = hsh(i, 3, g.seed) * TAU, L = g.cell * (0.8 + hsh(i, 4, g.seed) * 0.9), bal = Math.sin(t * 0.8 + i) * 0.12;
          const ex = x + Math.cos(a + bal) * L, ey = y + Math.sin(a + bal) * L, mx = (x + ex) / 2 + Math.cos(a + 1.6) * L * 0.25, my = (y + ey) / 2 + Math.sin(a + 1.6) * L * 0.25;
          c.globalAlpha = 0.85 * pow; c.strokeStyle = '#4a3218'; c.lineWidth = Math.max(1, g.cell * 0.07);
          c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(mx, my, ex, ey); c.stroke();
          c.strokeStyle = '#6b8f3a'; c.lineWidth = Math.max(0.6, g.cell * 0.025); c.stroke();
          // os espinhos ao longo da raiz
          c.fillStyle = '#d8c79a';
          for (let k = 1; k < 5; k++) {
            const f = k / 5, px = (1 - f) * (1 - f) * x + 2 * (1 - f) * f * mx + f * f * ex, py = (1 - f) * (1 - f) * y + 2 * (1 - f) * f * my + f * f * ey;
            const sa = a + (k % 2 ? 1.57 : -1.57), sz = g.cell * 0.07;
            c.beginPath(); c.moveTo(px + Math.cos(sa + 1.4) * sz * 0.4, py + Math.sin(sa + 1.4) * sz * 0.4); c.lineTo(px + Math.cos(sa) * sz * 1.6, py + Math.sin(sa) * sz * 1.6); c.lineTo(px + Math.cos(sa - 1.4) * sz * 0.4, py + Math.sin(sa - 1.4) * sz * 0.4); c.closePath(); c.fill();
          }
        }
      },
    },
    esporos: {
      n: 'Esporos', tint: '#9a6ac0', base: 0.14, edge: '#e2c2f2', glow: true, g: 'natureza', sug: 'confuso',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const n = cnt(g, 5, 8, 80, pow);
        for (let i = 0; i < n; i++) {
          const sp = 0.08 + hsh(i, 3, g.seed) * 0.12, ph = t * sp + hsh(i, 4, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 13, 1, g.seed), hsh(i + cyc * 13, 2, g.seed));
          const dx = Math.sin(t * 0.9 + i) * g.cell * 0.15;
          blob(c, x + dx, y - life * g.cell * 0.6, g.cell * (0.05 + hsh(i, 5, g.seed) * 0.07), i % 3 ? '#e9b8ff' : '#b8ffdf', Math.sin(life * Math.PI) * 0.75 * pow);
        }
      },
    },
    pantano: {
      n: 'Pântano', tint: '#3f4a22', base: 0.46, edge: '#7a8a4a', g: 'natureza', sug: 'lento',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.4, 3, 18, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x, y, g.cell * (0.6 + hsh(i, 13, g.seed) * 0.6), i % 2 ? '#2a3418' : '#5a6a2a', 0.3 * pow);
        }
        // folhas e lodo boiando
        const f = cnt(g, 1, 2, 14, pow);
        for (let i = 0; i < f; i++) {
          const [x, y] = g.sample(hsh(i, 21, g.seed), hsh(i, 22, g.seed));
          c.globalAlpha = 0.7 * pow; c.fillStyle = '#5f8a3a';
          c.beginPath(); c.arc(x + Math.sin(t * 0.2 + i) * g.cell * 0.05, y, g.cell * 0.13, 0.4, TAU - 0.4); c.lineTo(x, y); c.closePath(); c.fill();
        }
        // bolhas de gás
        const b = cnt(g, 1.2, 3, 18, pow);
        c.strokeStyle = '#b8c98a';
        for (let i = 0; i < b; i++) {
          const ph = t * (0.3 + hsh(i, 7, g.seed) * 0.3) + hsh(i, 8, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 9, 9, g.seed), hsh(i + cyc * 9, 10, g.seed));
          c.globalAlpha = (life < 0.85 ? 0.6 : (1 - life) / 0.15 * 0.6) * pow; c.lineWidth = Math.max(0.6, g.cell * 0.02);
          c.beginPath(); c.arc(x, y, g.cell * 0.09 * (0.3 + life * 0.7), 0, TAU); c.stroke();
        }
      },
    },
    aura: {
      n: 'Aura sagrada', tint: '#ffe9a0', base: 0.12, edge: '#fff4c8', glow: true, g: 'sagrado', sug: 'bencao',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const p = 0.5 + 0.5 * Math.sin(t * 1.1);
        blob(c, g.cx, g.cy, g.inR * (1.05 + 0.1 * p), '#ffe7a0', (0.22 + 0.1 * p) * pow);
        blob(c, g.cx, g.cy, g.inR * 0.5, '#fff6d6', 0.2 * pow);
        const n = cnt(g, 2, 4, 30, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (0.15 + hsh(i, 3, g.seed) * 0.15) + hsh(i, 4, g.seed)) % 1;
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          blob(c, x, y - ph * g.cell * 0.5, g.cell * 0.07, '#fff8de', Math.sin(ph * Math.PI) * 0.8 * pow);
        }
      },
    },
    consagrado: {
      n: 'Chão consagrado', tint: '#f5d98a', base: 0.13, edge: '#fff1c2', glow: true, g: 'sagrado', sug: 'bencao',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        // marcas sagradas no chão, em grade, acendendo uma de cada vez
        const passo = g.cell * 0.9, i0 = Math.floor((g.cx - g.R) / passo), i1 = Math.ceil((g.cx + g.R) / passo), j0 = Math.floor((g.cy - g.R) / passo), j1 = Math.ceil((g.cy + g.R) / passo);
        c.strokeStyle = '#fff1c2'; c.lineCap = 'round'; c.lineWidth = Math.max(0.8, g.cell * 0.03);
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const x = (i + 0.5) * passo, y = (j + 0.5) * passo, k = hsh(i, j, g.seed);
          const a = (0.15 + 0.55 * Math.max(0, Math.sin(t * 0.9 + k * TAU))) * pow, s = g.cell * 0.12;
          c.globalAlpha = a;
          c.beginPath(); c.moveTo(x, y - s * 1.3); c.lineTo(x, y + s * 1.3); c.moveTo(x - s, y - s * 0.4); c.lineTo(x + s, y - s * 0.4); c.stroke();
        }
        blob(c, g.cx, g.cy, g.inR, '#ffe6a0', (0.1 + 0.05 * Math.sin(t)) * pow);
      },
    },
    chamasNegras: {
      n: 'Chamas negras', tint: '#1a0626', base: 0.32, edge: '#a35cff', glow: true, g: 'sagrado', sug: 'fogo',
      draw(c, g, t, pow) {
        const n = cnt(g, 6, 10, 80, pow);
        // primeiro o escuro das chamas; depois a borda roxa que brilha
        for (let pass = 0; pass < 2; pass++) {
          c.globalCompositeOperation = pass ? 'lighter' : 'source-over';
          for (let i = 0; i < n; i++) {
            const sp = 0.5 + hsh(i, 3, g.seed) * 0.6, ph = t * sp + hsh(i, 4, g.seed), life = ph % 1, cyc = Math.floor(ph);
            const [x, y] = g.sample(hsh(i + cyc * 17, 1, g.seed), hsh(i + cyc * 17, 2, g.seed));
            const r = g.cell * (0.2 + hsh(i, 5, g.seed) * 0.28) * (1 - life * 0.55);
            if (pass) blob(c, x, y - life * g.cell * 0.3, r * 0.7, life < 0.5 ? '#c78bff' : '#7a2fd6', Math.sin(life * Math.PI) * 0.35 * pow);
            else blob(c, x + Math.sin(t * 3 + i) * g.cell * 0.05, y - life * g.cell * 0.3, r, '#08020e', Math.sin(life * Math.PI) * 0.7 * pow);
          }
        }
      },
    },
    maldicao: {
      n: 'Maldição', tint: '#3a0f2c', base: 0.3, edge: '#d0407a', g: 'sagrado', sug: 'maldicao',
      draw(c, g, t, pow) {
        const n = cnt(g, 2, 4, 30, pow);
        for (let i = 0; i < n; i++) {
          const ang = hsh(i, 1, g.seed) * TAU + t * (0.2 + hsh(i, 3, g.seed) * 0.2) * (i % 2 ? 1 : -1), d = g.inR * (0.3 + hsh(i, 2, g.seed) * 0.7);
          blob(c, g.cx + Math.cos(ang) * d, g.cy + Math.sin(ang) * d, g.cell * (0.5 + hsh(i, 5, g.seed) * 0.5), i % 3 ? '#1a0410' : '#6a1838', (0.3 + 0.1 * Math.sin(t + i)) * pow);
        }
        c.globalCompositeOperation = 'lighter';
        runeRing(c, g, -t * 0.12, '#e0506a', (0.45 + 0.15 * Math.sin(t * 1.7)) * pow, 7, 3);
      },
    },
  };
  /* As categorias da biblioteca (para as abas), e cada efeito antigo na dele */
  const TAGS = [{ id: 'elem', n: 'Elementos' }, { id: 'magia', n: 'Magia' }, { id: 'natureza', n: 'Natureza' }, { id: 'sagrado', n: 'Sagrado e sombrio' }];
  for (const [id, gr] of [['fogo', 'elem'], ['gelo', 'elem'], ['raio', 'elem'], ['agua', 'elem'], ['vento', 'elem'], ['terra', 'elem'], ['veneno', 'natureza'], ['nevoa', 'natureza'],
    ['sombra', 'sagrado'], ['cura', 'sagrado'], ['sagrado', 'sagrado'], ['arcano', 'magia'], ['antimagia', 'magia'], ['tinta', 'magia']]) P[id].g = gr;
  P.fogo.sug = 'fogo'; P.gelo.sug = 'gelo'; P.raio.sug = 'atordoado'; P.agua.sug = 'molhado'; P.veneno.sug = 'veneno'; P.cura.sug = 'regen'; P.sagrado.sug = 'bencao'; P.sombra.sug = 'medo'; P.tinta.sug = 'cego';
  const ORDER = ['fogo', 'gelo', 'raio', 'agua', 'vento', 'terra', 'lava', 'areia', 'tempestade', 'nevasca', 'acida',
    'arcano', 'antimagia', 'tinta', 'escuridao', 'teia', 'barreira', 'circulo', 'silencio',
    'veneno', 'nevoa', 'toxica', 'espinhos', 'esporos', 'pantano',
    'cura', 'sagrado', 'aura', 'consagrado', 'sombra', 'chamasNegras', 'maldicao'];

  function draw(ctx, e, g, t, px) {
    const pr = P[e.fx] || P.fogo;
    const pow = clamp(e.pow == null ? 0.8 : e.pow, 0.2, 1);
    g.seed = e.seed || 1;
    ctx.save();
    ctx.clip(g.path);
    ctx.fillStyle = hexA(pr.tint, pr.base * (0.5 + pow * 0.6) * (0.88 + 0.12 * Math.sin(t * 1.2 + g.seed)));
    ctx.fill(g.path);
    pr.draw(ctx, g, t, pow);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = pr.edge; ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.2 + 0.2 * pow; ctx.lineWidth = 5 * px; ctx.stroke(g.path);
    ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5 * px; ctx.stroke(g.path);
    ctx.restore();
  }

  // Miniatura para a biblioteca.
  function thumb(cv, id, t) {
    const g2 = cv.getContext('2d');
    const w = cv.width, hh = cv.height;
    g2.setTransform(1, 0, 0, 1, 0, 0);
    g2.clearRect(0, 0, w, hh);
    const cell = w / 3.2;
    const e = { fx: id, k: 'circ', x: w / 2, y: hh / 2, r: 1.35, dir: 0, pow: 1, seed: 3 };
    const g = geom(e, { cell, tokens: [] });
    draw(g2, e, g, t, w / 56);
  }

  return { P, ORDER, TAGS, geom, draw, thumb, hsh, blob };
})();
