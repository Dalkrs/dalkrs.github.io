/* ---------------------------------------------------------------
   6. FX — biblioteca de efeitos de magia
   Cada efeito é uma área (círculo, quadrado, cone ou linha) com uma
   animação procedural. A animação não guarda estado: tudo é calculado
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
    const R = Math.max(cell * 0.25, e.r * cell + half);
    const dir = rad(e.dir || 0);
    const cs = Math.cos(dir), sn = Math.sin(dir);
    const p = new Path2D();
    let cx = x, cy = y, inR = R, area, sample;
    if (e.k === 'quad') {
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
    return { path: p, x, y, cx, cy, R, inR, half, cell, dir, cs, sn, area: area / (cell * cell), sample, hx: x + cs * R, hy: y + sn * R, seed: 1 };
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
  };
  const ORDER = ['fogo', 'gelo', 'raio', 'agua', 'vento', 'terra', 'veneno', 'nevoa', 'sombra', 'cura', 'sagrado', 'arcano', 'antimagia', 'tinta'];

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

  return { P, ORDER, geom, draw, thumb, hsh };
})();
