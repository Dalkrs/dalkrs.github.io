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
    const k = e.fx === 'portal' ? 'circ' : e.k;          // (o portal é sempre de círculos)
    if (k === 'rect') {
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
    } else if (k === 'quad') {
      const pts = [[-R, -R], [R, -R], [R, R], [-R, R]].map(([a, b]) => [x + cs * a - sn * b, y + sn * a + cs * b]);
      p.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) p.lineTo(pts[i][0], pts[i][1]); p.closePath();
      area = 4 * R * R;
      sample = (u, v) => { const a = (u * 2 - 1) * R, b = (v * 2 - 1) * R; return [x + cs * a - sn * b, y + sn * a + cs * b]; };
    } else if (k === 'cone') {
      const ang = rad(clamp(e.ang || 60, 10, 340));
      p.moveTo(x, y); p.arc(x, y, R, dir - ang / 2, dir + ang / 2); p.closePath();
      area = R * R * ang / 2;
      const s2 = Math.sin(Math.min(ang, Math.PI) / 2);
      inR = R * s2 / (1 + s2);
      cx = x + cs * (R - inR); cy = y + sn * (R - inR);
      sample = (u, v) => { const rr = R * Math.sqrt(u), a = dir + (v - 0.5) * ang; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; };
    } else if (k === 'line') {
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
    // (lote 7) o Portal: o segundo círculo, a saída, do mesmo tamanho, onde o mestre o deixou (x2, y2)
    let x2 = null, y2 = null;
    if (e.fx === 'portal' && Number.isFinite(e.x2) && Number.isFinite(e.y2)) {
      x2 = e.x2; y2 = e.y2;
      p.moveTo(x2 + R, y2); p.arc(x2, y2, R, 0, TAU);
      area *= 2;
    }
    // hw/hh: meia largura e meia altura; lab: âncora do rótulo de duração (os dois só existem no retângulo)
    return {
      path: p, x, y, cx, cy, R, inR, half, cell, dir, cs, sn, area: area / (cell * cell), sample,
      hx: hx == null ? x + cs * R : hx, hy: hy == null ? y + sn * R : hy, hw, hh, lab, seed: 1, x2, y2,
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

    /* ---------- Lote 7: zonas novas ----------
       Além do desenho, cada uma diz a regra (regra: o texto do painel). As que são só lembrete (lembra) avisam o mestre
       quando alguém começa a vez dentro delas; as de condição (cond) já nascem com ela guardada, para a pergunta do
       começo da vez; bloqueia e barra viram parede de visão e de passagem; pv são os pontos de vida da muralha. */
    gelado: {
      n: 'Chão congelado', tint: '#bfe6ff', base: 0.3, edge: '#f0faff', g: 'elem', sug: 'caido', lembra: true,
      regra: 'o chão escorrega: quem corre pode cair',
      draw(c, g, t, pow) {
        const m = cnt(g, 0.8, 2, 10, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x + Math.sin(t * 0.25 + i) * g.cell * 0.4, y, g.cell * (0.9 + hsh(i, 13, g.seed) * 0.7), '#ffffff', (0.14 + 0.06 * Math.sin(t * 0.6 + i)) * pow);
        }
        // as rachaduras no gelo (fixas, pela semente)
        c.strokeStyle = '#ffffff'; c.lineCap = 'round'; c.lineJoin = 'round';
        const n = cnt(g, 1.4, 3, 18, pow);
        for (let i = 0; i < n; i++) {
          let [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), a = hsh(i, 3, g.seed) * TAU;
          c.globalAlpha = 0.55 * pow; c.lineWidth = Math.max(0.6, g.cell * 0.018);
          c.beginPath(); c.moveTo(x, y);
          for (let s = 0; s < 5; s++) { a += (hsh(i * 7 + s, 4, g.seed) - 0.5) * 1.2; const L = g.cell * (0.15 + hsh(i * 7 + s, 5, g.seed) * 0.25); x += Math.cos(a) * L; y += Math.sin(a) * L; c.lineTo(x, y); }
          c.stroke();
        }
        // brilhos que piscam
        c.globalCompositeOperation = 'lighter';
        const b = cnt(g, 2, 3, 26, pow);
        for (let i = 0; i < b; i++) {
          const tw = Math.max(0, Math.sin(t * (1.3 + hsh(i, 7, g.seed)) + hsh(i, 8, g.seed) * TAU));
          if (tw < 0.2) continue;
          const [x, y] = g.sample(hsh(i, 9, g.seed), hsh(i, 10, g.seed)), s = g.cell * 0.08 * tw;
          c.globalAlpha = tw * 0.9 * pow; c.lineWidth = Math.max(0.6, g.cell * 0.02);
          c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
        }
      },
    },
    fumaca: {
      n: 'Fumaça', tint: '#4d5258', base: 0.62, edge: '#a3aab3', g: 'elem', bloqueia: true,
      regra: 'tapa a visão de todos: ninguém enxerga através dela',
      draw(c, g, t, pow) {
        // rolos de fumaça, em dois tons, girando devagar e subindo
        const n = cnt(g, 2.6, 6, 44, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const sp = (0.1 + hsh(i, 3, g.seed) * 0.12) * (i % 2 ? 1 : -1);
          const dx = Math.cos(t * sp + i * 1.9) * g.cell * 0.55, dy = Math.sin(t * sp + i * 1.9) * g.cell * 0.4 - ((t * 0.05 + hsh(i, 4, g.seed)) % 1) * g.cell * 0.2;
          blob(c, x + dx, y + dy, g.cell * (0.8 + hsh(i, 5, g.seed) * 0.9), i % 3 ? '#8a9098' : '#3c4046', (0.32 + 0.1 * Math.sin(t * 0.4 + i)) * pow);
        }
      },
    },
    brasas: {
      n: 'Brasas', tint: '#2a1208', base: 0.5, edge: '#ff8a3a', glow: true, g: 'elem', sug: 'fogo', lembra: true,
      regra: 'queimam quem pisa',
      draw(c, g, t, pow) {
        // carvão em pedaços
        const m = cnt(g, 2.5, 4, 40, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), r = g.cell * (0.1 + hsh(i, 3, g.seed) * 0.12);
          c.globalAlpha = 0.8 * pow; c.fillStyle = hsh(i, 4, g.seed) > 0.5 ? '#1a0a05' : '#2e1408';
          c.beginPath();
          for (let k = 0; k <= 5; k++) { const a = k / 5 * TAU + hsh(i, 5, g.seed), rr = r * (0.7 + 0.3 * hsh(i * 5 + (k % 5), 6, g.seed)); if (k) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          c.closePath(); c.fill();
        }
        // o brilho das brasas, pulsando
        c.globalCompositeOperation = 'lighter';
        const n = cnt(g, 4, 6, 60, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 7, g.seed), hsh(i, 8, g.seed)), p = 0.5 + 0.5 * Math.sin(t * (1.2 + hsh(i, 9, g.seed) * 1.8) + i);
          blob(c, x, y, g.cell * (0.1 + 0.08 * p), p > 0.6 ? '#ffb347' : '#ff5a1a', (0.35 + 0.5 * p) * pow);
        }
        // fagulhas subindo
        const f = cnt(g, 1.6, 2, 24, pow);
        for (let i = 0; i < f; i++) {
          const ph = t * (0.5 + hsh(i, 11, g.seed) * 0.5) + hsh(i, 12, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 7, 13, g.seed), hsh(i + cyc * 7, 14, g.seed));
          blob(c, x + Math.sin(t * 4 + i) * g.cell * 0.05, y - life * g.cell * 0.6, g.cell * 0.04, '#ffd27a', Math.sin(life * Math.PI) * 0.9 * pow);
        }
      },
    },
    cristais: {
      n: 'Muralha de cristais de gelo', tint: '#8fd4ff', base: 0.42, edge: '#effaff', glow: true, g: 'elem', bloqueia: true, barra: true, pv: 30,
      regra: 'barra a passagem e a visão até quebrar',
      draw(c, g, t, pow) {
        // prismas compridos, apertados, com a luz correndo neles
        const n = cnt(g, 3.2, 5, 70, pow);
        c.lineJoin = 'round';
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const a = -Math.PI / 2 + (hsh(i, 3, g.seed) - 0.5) * 1.1, L = g.cell * (0.35 + hsh(i, 4, g.seed) * 0.4), w = L * (0.22 + hsh(i, 5, g.seed) * 0.12);
          const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
          const pts = [[x - vx * w, y - vy * w], [x + ux * L * 0.75 - vx * w * 0.8, y + uy * L * 0.75 - vy * w * 0.8], [x + ux * L, y + uy * L], [x + ux * L * 0.75 + vx * w * 0.8, y + uy * L * 0.75 + vy * w * 0.8], [x + vx * w, y + vy * w]];
          c.globalAlpha = 0.75 * pow; c.fillStyle = hsh(i, 6, g.seed) > 0.5 ? '#bfe8ff' : '#7fc4ee';
          c.beginPath(); pts.forEach((q, k) => (k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]))); c.closePath(); c.fill();
          c.globalAlpha = 0.6 * pow; c.strokeStyle = '#ffffff'; c.lineWidth = Math.max(0.6, g.cell * 0.018); c.stroke();
          c.globalAlpha = (0.3 + 0.4 * Math.max(0, Math.sin(t * 1.2 + i * 0.7))) * pow;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + ux * L, y + uy * L); c.stroke();
        }
        c.globalCompositeOperation = 'lighter';
        const b = cnt(g, 1.5, 3, 20, pow);
        for (let i = 0; i < b; i++) { const tw = Math.max(0, Math.sin(t * (1.1 + hsh(i, 7, g.seed)) + i * 2)), [x, y] = g.sample(hsh(i, 8, g.seed), hsh(i, 9, g.seed)); blob(c, x, y, g.cell * 0.12 * tw, '#ffffff', tw * 0.8 * pow); }
      },
    },
    cinzas: {
      n: 'Cinzas vulcânicas', tint: '#302a26', base: 0.42, edge: '#a39282', g: 'elem', sug: 'ofuscado', lembra: true,
      regra: 'o ar arde: difícil de ver e de respirar',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.6, 3, 20, pow);
        for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed)); blob(c, x + Math.sin(t * 0.2 + i) * g.cell * 0.4, y, g.cell * (0.8 + hsh(i, 13, g.seed) * 0.6), i % 2 ? '#1e1a17' : '#5a524a', 0.3 * pow); }
        // flocos de cinza caindo, levados de leve
        const n = cnt(g, 7, 10, 100, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (0.18 + hsh(i, 3, g.seed) * 0.2) + hsh(i, 4, g.seed)) % 1, [x0, y0] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.7 * pow; c.fillStyle = hsh(i, 5, g.seed) > 0.7 ? '#e8e0d8' : '#8a8078';
          c.beginPath(); c.arc(x0 + Math.sin(t * 0.8 + i) * g.cell * 0.15, y0 + (ph - 0.5) * g.cell * 1.2, Math.max(0.6, g.cell * (0.015 + hsh(i, 6, g.seed) * 0.025)), 0, TAU); c.fill();
        }
        // uma brasa ou outra
        c.globalCompositeOperation = 'lighter';
        const b = cnt(g, 0.6, 1, 8, pow);
        for (let i = 0; i < b; i++) { const ph = (t * 0.35 + hsh(i, 7, g.seed)) % 1, [x, y] = g.sample(hsh(i, 8, g.seed), hsh(i, 9, g.seed)); blob(c, x, y + (ph - 0.5) * g.cell, g.cell * 0.05, '#ff8a3a', Math.sin(ph * Math.PI) * 0.8 * pow); }
      },
    },
    correnteza: {
      n: 'Correnteza', tint: '#1c5f92', base: 0.34, edge: '#8fd0ff', g: 'elem', lembra: true,
      regra: 'empurra para o lado da seta (a bolinha da borda gira a seta)',
      draw(c, g, t, pow) {
        // a água correndo na direção do efeito
        c.strokeStyle = '#cfeaff'; c.lineCap = 'round';
        const n = cnt(g, 4, 8, 60, pow), span = g.R * 2.2;
        for (let i = 0; i < n; i++) {
          const sp = 0.4 + hsh(i, 3, g.seed) * 0.4, ph = (t * sp + hsh(i, 4, g.seed)) % 1;
          const off = (hsh(i, 1, g.seed) - 0.5) * span, along = (ph - 0.5) * span;
          const bx = g.cx + g.cs * along - g.sn * off, by = g.cy + g.sn * along + g.cs * off;
          const len = g.cell * (0.4 + hsh(i, 5, g.seed) * 0.6), wv = Math.sin(t * 3 + i) * g.cell * 0.05;
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.55 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.035);
          c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(bx + g.cs * len * 0.5 - g.sn * wv, by + g.sn * len * 0.5 + g.cs * wv, bx + g.cs * len, by + g.sn * len); c.stroke();
        }
        // a seta, de leve, no meio
        const L = Math.min(g.inR * 1.2, g.cell * 2.2), ax = g.cx + g.cs * L * 0.5, ay = g.cy + g.sn * L * 0.5, bx = g.cx - g.cs * L * 0.5, by = g.cy - g.sn * L * 0.5, s = L * 0.25;
        c.globalAlpha = (0.3 + 0.1 * Math.sin(t * 2)) * pow; c.strokeStyle = '#e8f6ff'; c.lineWidth = Math.max(1.2, g.cell * 0.07); c.lineJoin = 'round';
        c.beginPath(); c.moveTo(bx, by); c.lineTo(ax, ay);
        c.moveTo(ax - g.cs * s - g.sn * s * 0.7, ay - g.sn * s + g.cs * s * 0.7); c.lineTo(ax, ay); c.lineTo(ax - g.cs * s + g.sn * s * 0.7, ay - g.sn * s - g.cs * s * 0.7); c.stroke();
      },
    },
    aguaEletrica: {
      n: 'Água eletrificada', tint: '#1c4f8a', base: 0.32, edge: '#cfe0ff', glow: true, g: 'elem', sug: 'eletrizado', lembra: true,
      regra: 'dá choque em quem está dentro',
      draw(c, g, t, pow) {
        // as ondas da água
        const n = cnt(g, 0.8, 2, 12, pow);
        c.strokeStyle = '#bfe2ff';
        for (let i = 0; i < n; i++) {
          const ph = t * (0.25 + hsh(i, 3, g.seed) * 0.2) + hsh(i, 4, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 13, 1, g.seed), hsh(i + cyc * 13, 2, g.seed));
          c.globalAlpha = (1 - life) * 0.45 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.03);
          c.beginPath(); c.arc(x, y, life * g.cell, 0, TAU); c.stroke();
        }
        // faíscas correndo pela água
        c.globalCompositeOperation = 'lighter'; c.lineCap = c.lineJoin = 'round';
        const fr = Math.floor(t * 9), k = cnt(g, 1.2, 2, 14, pow);
        for (let i = 0; i < k; i++) {
          if (hsh(i, fr, g.seed) < 0.4) continue;
          const a = g.sample(hsh(i, fr + 1, g.seed), hsh(i, fr + 2, g.seed)), L = g.cell * (0.4 + hsh(i, fr + 3, g.seed) * 0.5), ang = hsh(i, fr + 4, g.seed) * TAU;
          c.beginPath(); c.moveTo(a[0], a[1]);
          for (let s = 1; s <= 4; s++) { const f = s / 4; c.lineTo(a[0] + Math.cos(ang) * L * f + (hsh(i * 5 + s, fr, g.seed) - 0.5) * g.cell * 0.25, a[1] + Math.sin(ang) * L * f + (hsh(i * 5 + s, fr + 7, g.seed) - 0.5) * g.cell * 0.25); }
          c.globalAlpha = 0.3 * pow; c.strokeStyle = '#7aa2ff'; c.lineWidth = g.cell * 0.09; c.stroke();
          c.globalAlpha = 0.9 * pow; c.strokeStyle = '#f0f5ff'; c.lineWidth = Math.max(0.8, g.cell * 0.025); c.stroke();
        }
      },
    },
    vortice: {
      n: 'Vórtice', tint: '#1e2a48', base: 0.32, edge: '#9ab8ff', glow: true, g: 'magia', lembra: true,
      regra: 'puxa para o centro',
      draw(c, g, t, pow) {
        blob(c, g.cx, g.cy, g.inR * 0.45, '#05070f', 0.6 * pow);
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        // os braços da espiral, girando
        for (let k = 0; k < 5; k++) {
          c.globalAlpha = 0.5 * pow; c.strokeStyle = k % 2 ? '#7fa2ff' : '#c9d8ff'; c.lineWidth = Math.max(0.8, g.cell * 0.04);
          c.beginPath();
          for (let s = 0; s <= 24; s++) { const f = s / 24, r = g.inR * (0.12 + 0.88 * f), a = t * 1.1 + k / 5 * TAU + (1 - f) * 3.2; if (s) c.lineTo(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r); else c.moveTo(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r); }
          c.stroke();
        }
        // o que está sendo puxado
        const n = cnt(g, 3.5, 6, 56, pow);
        for (let i = 0; i < n; i++) {
          const life = (t * (0.25 + hsh(i, 3, g.seed) * 0.3) + hsh(i, 4, g.seed)) % 1, d = g.inR * (1 - life * life), a = hsh(i, 1, g.seed) * TAU + life * 4 + t * 0.6;
          blob(c, g.cx + Math.cos(a) * d, g.cy + Math.sin(a) * d, g.cell * (0.06 + 0.04 * (1 - life)), '#dfe8ff', Math.sin(life * Math.PI) * 0.8 * pow);
        }
      },
    },
    gravidade: {
      n: 'Gravidade pesada', tint: '#241a36', base: 0.38, edge: '#b08aff', g: 'magia', sug: 'lento', lembra: true,
      regra: 'tudo pesa: anda-se a metade, sem pular nem voar',
      draw(c, g, t, pow) {
        // anéis que afundam para o meio
        c.strokeStyle = '#c9a8ff';
        for (let k = 0; k < 5; k++) {
          const f = ((k / 5) + t * 0.18) % 1, r = g.inR * (1 - f);
          c.globalAlpha = (0.15 + f * 0.35) * pow; c.lineWidth = Math.max(1, g.cell * 0.05 * (1 - f * 0.6));
          c.beginPath(); c.arc(g.cx, g.cy, Math.max(1, r), 0, TAU); c.stroke();
        }
        blob(c, g.cx, g.cy, g.inR * 0.5, '#0e0818', 0.35 * pow);
        // pedrinhas caindo depressa
        c.fillStyle = '#e2d4ff';
        const n = cnt(g, 3, 5, 44, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (1.4 + hsh(i, 3, g.seed)) + hsh(i, 4, g.seed)) % 1, [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          c.globalAlpha = Math.sin(ph * Math.PI) * 0.6 * pow;
          c.fillRect(x - g.cell * 0.015, y + (ph - 0.5) * g.cell * 0.8, Math.max(0.8, g.cell * 0.03), g.cell * 0.12);
        }
      },
    },
    tempo: {
      n: 'Distorção do tempo', tint: '#1f3340', base: 0.24, edge: '#9ff0e0', glow: true, g: 'magia', cond: 'lento', conds: ['lento', 'acelerado'],
      regra: 'quem começa a vez dentro fica Lento ou Acelerado (o mestre confirma)',
      draw(c, g, t, pow) {
        const a0 = g.fxe && g.fxe.apply && g.fxe.apply.cond, v = a0 && a0.id === 'acelerado' ? 2.4 : -0.35;     // acelerado: os ponteiros correm; lento: andam para trás
        c.globalCompositeOperation = 'lighter';
        blob(c, g.cx, g.cy, g.inR * 0.9, '#6fe0d0', (0.1 + 0.05 * Math.sin(t)) * pow);
        // o mostrador: a volta, as doze marcas e os ponteiros com o rastro
        const r = g.inR * 0.86;
        c.strokeStyle = '#c8fff4'; c.lineCap = 'round';
        c.globalAlpha = 0.55 * pow; c.lineWidth = Math.max(1, g.cell * 0.035);
        c.beginPath(); c.arc(g.cx, g.cy, r, 0, TAU); c.stroke();
        for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.globalAlpha = (i % 3 ? 0.35 : 0.7) * pow; c.beginPath(); c.moveTo(g.cx + Math.cos(a) * r * 0.86, g.cy + Math.sin(a) * r * 0.86); c.lineTo(g.cx + Math.cos(a) * r * 0.97, g.cy + Math.sin(a) * r * 0.97); c.stroke(); }
        const pont = (a, L, w, al) => { c.globalAlpha = al * pow; c.lineWidth = Math.max(1, g.cell * w); c.beginPath(); c.moveTo(g.cx, g.cy); c.lineTo(g.cx + Math.cos(a) * L, g.cy + Math.sin(a) * L); c.stroke(); };
        for (let k = 3; k >= 0; k--) { const tt = t - k * 0.12; pont(tt * v - Math.PI / 2, r * 0.75, 0.05, k ? 0.12 : 0.8); pont(tt * v / 12 - Math.PI / 2, r * 0.5, 0.07, k ? 0.1 : 0.7); }
        // grãos de areia flutuando
        const n = cnt(g, 2, 4, 30, pow);
        for (let i = 0; i < n; i++) {
          const a = hsh(i, 1, g.seed) * TAU + t * v * 0.2 * (0.5 + hsh(i, 3, g.seed)), d = g.inR * (0.2 + hsh(i, 2, g.seed) * 0.75);
          blob(c, g.cx + Math.cos(a) * d, g.cy + Math.sin(a) * d, g.cell * 0.05, '#e8fff9', (0.4 + 0.4 * Math.sin(t * 2 + i)) * pow);
        }
      },
    },
    portal: {
      n: 'Portal', tint: '#2a1648', base: 0.3, edge: '#d7a6ff', glow: true, g: 'magia', portal: true,
      regra: 'o token solto num círculo sai no outro',
      draw(c, g, t, pow) {
        const anel = (x, y, cor, cor2, sent) => {
          blob(c, x, y, g.R * 0.95, '#0a0414', 0.5 * pow);
          c.globalCompositeOperation = 'lighter';
          blob(c, x, y, g.R * 1.05, cor, (0.18 + 0.06 * Math.sin(t * 2)) * pow);
          c.lineCap = 'round';
          for (let k = 0; k < 4; k++) {
            c.globalAlpha = 0.55 * pow; c.strokeStyle = k % 2 ? cor : cor2; c.lineWidth = Math.max(0.8, g.cell * 0.05);
            c.beginPath();
            for (let s = 0; s <= 20; s++) { const f = s / 20, r = g.R * (0.15 + 0.8 * f), a = sent * t * 1.6 + k / 4 * TAU + (1 - f) * 2.6; if (s) c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
            c.stroke();
          }
          c.globalAlpha = (0.6 + 0.2 * Math.sin(t * 3)) * pow; c.strokeStyle = cor2; c.lineWidth = Math.max(1, g.cell * 0.06);
          c.beginPath(); c.arc(x, y, g.R * 0.95, 0, TAU); c.stroke();
          c.globalCompositeOperation = 'source-over';
        };
        anel(g.x, g.y, '#b27aff', '#f0dcff', 1);                    // a entrada, roxa
        if (g.x2 != null) anel(g.x2, g.y2, '#5fd0ff', '#d6f6ff', -1);   // a saída, azul
      },
    },
    runas: {
      n: 'Runas-armadilha', tint: '#1a1006', base: 0.14, edge: '#ffb347', glow: true, g: 'magia', oculta: true,
      regra: 'escondidas dos jogadores até você revelar; quem pisa nelas avisa você',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const p = 0.5 + 0.5 * Math.sin(t * 1.6);
        blob(c, g.cx, g.cy, g.inR * 0.8, '#ff9a3a', (0.08 + 0.08 * p) * pow);
        runeRing(c, g, t * 0.08, '#ffc77a', (0.45 + 0.3 * p) * pow, 7, 3);
        // os glifos riscados no chão, acendendo um de cada vez
        c.strokeStyle = '#ffd59a'; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = Math.max(0.8, g.cell * 0.035);
        const n = cnt(g, 1.5, 3, 16, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed) * 0.8, hsh(i, 2, g.seed)), s = g.cell * 0.16, tipo = Math.floor(hsh(i, 4, g.seed) * 4);
          c.globalAlpha = (0.2 + 0.7 * Math.max(0, Math.sin(t * 1.3 + hsh(i, 3, g.seed) * TAU))) * pow;
          c.beginPath();
          if (tipo === 0) { c.moveTo(x, y - s); c.lineTo(x, y + s); c.moveTo(x, y - s * 0.3); c.lineTo(x + s * 0.7, y - s); }
          else if (tipo === 1) { c.moveTo(x - s * 0.6, y + s); c.lineTo(x, y - s); c.lineTo(x + s * 0.6, y + s); c.moveTo(x - s * 0.3, y + s * 0.2); c.lineTo(x + s * 0.3, y + s * 0.2); }
          else if (tipo === 2) { c.moveTo(x - s * 0.6, y - s); c.lineTo(x + s * 0.6, y + s); c.moveTo(x + s * 0.6, y - s); c.lineTo(x - s * 0.6, y + s); }
          else { c.moveTo(x, y - s); c.lineTo(x + s * 0.6, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.6, y); c.closePath(); }
          c.stroke();
        }
      },
    },
    selos: {
      n: 'Formação de selos', tint: '#2a0a0a', base: 0.16, edge: '#ff6a5a', glow: true, g: 'magia', sug: 'agarrado', lembra: true,
      regra: 'prende ou protege quem está dentro',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        blob(c, g.cx, g.cy, g.inR * 0.9, '#ff4a3a', (0.08 + 0.05 * Math.sin(t * 1.4)) * pow);
        // o octógono e a estrela por dentro
        c.strokeStyle = '#ff8a7a'; c.lineCap = 'round'; c.lineJoin = 'round';
        const r = g.inR * 0.8, rot = t * 0.1;
        c.globalAlpha = 0.6 * pow; c.lineWidth = Math.max(1, g.cell * 0.035);
        c.beginPath(); for (let k = 0; k <= 8; k++) { const a = rot + k / 8 * TAU; if (k) c.lineTo(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r); else c.moveTo(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r); } c.stroke();
        c.globalAlpha = 0.4 * pow;
        c.beginPath(); for (let k = 0; k <= 8; k++) { const a = rot + (k * 3) / 8 * TAU; if (k) c.lineTo(g.cx + Math.cos(a) * r * 0.95, g.cy + Math.sin(a) * r * 0.95); else c.moveTo(g.cx + Math.cos(a) * r * 0.95, g.cy + Math.sin(a) * r * 0.95); } c.stroke();
        // os talismãs, girando na volta de fora
        c.globalCompositeOperation = 'source-over';
        const rt = g.inR * 0.9, w = g.cell * 0.14, h2 = g.cell * 0.3;
        for (let k = 0; k < 8; k++) {
          const a = -rot * 2 + k / 8 * TAU;
          c.save(); c.translate(g.cx + Math.cos(a) * rt, g.cy + Math.sin(a) * rt); c.rotate(a + Math.PI / 2);
          c.globalAlpha = 0.85 * pow; c.fillStyle = '#f2dca0'; c.fillRect(-w / 2, -h2 / 2, w, h2);
          c.strokeStyle = '#b8261a'; c.lineWidth = Math.max(0.6, g.cell * 0.02);
          c.beginPath(); c.moveTo(0, -h2 * 0.35); c.lineTo(0, h2 * 0.35); c.moveTo(-w * 0.3, -h2 * 0.1); c.lineTo(w * 0.3, -h2 * 0.1); c.moveTo(-w * 0.3, h2 * 0.15); c.lineTo(w * 0.3, h2 * 0.15); c.stroke();
          c.restore();
        }
      },
    },
    oleo: {
      n: 'Óleo derramado', tint: '#15140f', base: 0.55, edge: '#6b6250', g: 'natureza', sug: 'oleo', lembra: true,
      regra: 'escorrega, e pega fogo com uma faísca',
      draw(c, g, t, pow) {
        // poças escuras e lisas
        const n = cnt(g, 1.2, 3, 16, pow);
        c.fillStyle = '#0a0906';
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed)), r = g.cell * (0.35 + hsh(i, 3, g.seed) * 0.4);
          c.globalAlpha = 0.6 * pow;
          c.beginPath();
          for (let k = 0; k <= 12; k++) { const a = k / 12 * TAU, rr = r * (0.8 + 0.25 * hsh(i * 13 + (k % 12), 4, g.seed)); if (k) c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); else c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
          c.closePath(); c.fill();
        }
        // o furta-cor escorrendo devagar por cima
        c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        const cores = ['#7a3f9a', '#2f7f8a', '#8a7a2a'], m = cnt(g, 1.5, 3, 20, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 5, g.seed), hsh(i, 6, g.seed)), r = g.cell * (0.2 + hsh(i, 7, g.seed) * 0.3), a0 = t * (0.1 + hsh(i, 8, g.seed) * 0.15) + i;
          c.globalAlpha = (0.18 + 0.1 * Math.sin(t * 0.7 + i)) * pow; c.strokeStyle = cores[i % 3]; c.lineWidth = Math.max(0.8, g.cell * 0.05);
          c.beginPath(); c.ellipse(x, y, r, r * 0.55, 0, a0, a0 + 2.2); c.stroke();
        }
      },
    },
    lama: {
      n: 'Lama', tint: '#4f3720', base: 0.58, edge: '#8a6a42', g: 'natureza', sug: 'lento', lembra: true,
      regra: 'só se anda a metade',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.6, 3, 20, pow);
        for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed)); blob(c, x, y, g.cell * (0.6 + hsh(i, 13, g.seed) * 0.6), i % 2 ? '#3a2814' : '#6a4a2a', 0.35 * pow); }
        // sulcos
        c.strokeStyle = '#2a1c0e'; c.lineCap = 'round';
        const s = cnt(g, 1.2, 2, 14, pow);
        for (let i = 0; i < s; i++) {
          const [x, y] = g.sample(hsh(i, 21, g.seed), hsh(i, 22, g.seed)), a = hsh(i, 23, g.seed) * TAU, L = g.cell * (0.3 + hsh(i, 24, g.seed) * 0.4);
          c.globalAlpha = 0.45 * pow; c.lineWidth = Math.max(0.8, g.cell * 0.04);
          c.beginPath(); c.moveTo(x - Math.cos(a) * L, y - Math.sin(a) * L); c.quadraticCurveTo(x + Math.cos(a + 1.5) * L * 0.2, y + Math.sin(a + 1.5) * L * 0.2, x + Math.cos(a) * L, y + Math.sin(a) * L); c.stroke();
        }
        // bolhas que estouram devagar
        c.strokeStyle = '#a8865a';
        const b = cnt(g, 1, 2, 14, pow);
        for (let i = 0; i < b; i++) {
          const ph = t * (0.2 + hsh(i, 7, g.seed) * 0.2) + hsh(i, 8, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 9, 9, g.seed), hsh(i + cyc * 9, 10, g.seed));
          c.globalAlpha = (life < 0.8 ? 0.6 : (1 - life) / 0.2 * 0.6) * pow; c.lineWidth = Math.max(0.6, g.cell * 0.025);
          c.beginPath(); c.arc(x, y, g.cell * 0.1 * (0.3 + life * 0.7), Math.PI, TAU); c.stroke();
        }
      },
    },
    jardim: {
      n: 'Jardim florescendo', tint: '#2a5226', base: 0.26, edge: '#a8e890', g: 'natureza', sug: 'regen', lembra: true,
      regra: 'cura quem está dentro',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.2, 3, 16, pow);
        for (let i = 0; i < m; i++) { const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed)); blob(c, x, y, g.cell * (0.6 + hsh(i, 13, g.seed) * 0.5), '#5fa84a', 0.25 * pow); }
        // as flores abrindo e fechando, cada uma no seu tempo
        const cores = ['#ff8fc0', '#ffe27a', '#ffffff', '#c9a0ff'], n = cnt(g, 2.4, 4, 36, pow);
        for (let i = 0; i < n; i++) {
          const [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          const ab = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (0.5 + hsh(i, 3, g.seed) * 0.5) + hsh(i, 4, g.seed) * TAU));
          const r = g.cell * (0.08 + hsh(i, 5, g.seed) * 0.07) * ab, rot = hsh(i, 6, g.seed) * TAU + t * 0.1;
          c.globalAlpha = 0.85 * pow; c.fillStyle = cores[i % 4];
          for (let k = 0; k < 5; k++) { const a = rot + k / 5 * TAU; c.beginPath(); c.ellipse(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.9, r * 0.5, a, 0, TAU); c.fill(); }
          c.fillStyle = '#f2b02a'; c.beginPath(); c.arc(x, y, r * 0.45, 0, TAU); c.fill();
        }
        // brilhos verdes subindo
        c.globalCompositeOperation = 'lighter';
        const p = cnt(g, 1.5, 2, 20, pow);
        for (let i = 0; i < p; i++) {
          const ph = t * (0.2 + hsh(i, 7, g.seed) * 0.2) + hsh(i, 8, g.seed), life = ph % 1, cyc = Math.floor(ph);
          const [x, y] = g.sample(hsh(i + cyc * 5, 9, g.seed), hsh(i + cyc * 5, 10, g.seed));
          blob(c, x + Math.sin(t + i) * g.cell * 0.1, y - life * g.cell * 0.5, g.cell * 0.06, '#9fffb0', Math.sin(life * Math.PI) * 0.6 * pow);
        }
      },
    },
    espiritos: {
      n: 'Névoa de espíritos', tint: '#16262e', base: 0.32, edge: '#9ff0ff', glow: true, g: 'sagrado', cond: 'medo',
      regra: 'quem começa a vez dentro fica Amedrontado (o mestre confirma)',
      draw(c, g, t, pow) {
        const m = cnt(g, 1.6, 3, 20, pow);
        for (let i = 0; i < m; i++) {
          const [x, y] = g.sample(hsh(i, 11, g.seed), hsh(i, 12, g.seed));
          blob(c, x + Math.sin(t * 0.2 + i) * g.cell * 0.5, y + Math.cos(t * 0.17 + i) * g.cell * 0.3, g.cell * (0.8 + hsh(i, 13, g.seed) * 0.6), '#bfefff', (0.1 + 0.05 * Math.sin(t * 0.5 + i)) * pow);
        }
        // os espíritos: rostos pálidos com um rastro, rodando
        const n = cnt(g, 0.9, 2, 12, pow);
        for (let i = 0; i < n; i++) {
          const sp = (0.15 + hsh(i, 3, g.seed) * 0.2) * (i % 2 ? 1 : -1), a = hsh(i, 1, g.seed) * TAU + t * sp, d = g.inR * (0.25 + hsh(i, 2, g.seed) * 0.6);
          const x = g.cx + Math.cos(a) * d, y = g.cy + Math.sin(a) * d + Math.sin(t * 1.3 + i) * g.cell * 0.08, s = g.cell * (0.16 + hsh(i, 4, g.seed) * 0.08);
          const fade = 0.45 + 0.35 * Math.sin(t * 0.9 + i * 1.7);
          c.globalCompositeOperation = 'lighter';
          for (let k = 1; k <= 4; k++) { const ak = a - sp * k * 0.35; blob(c, g.cx + Math.cos(ak) * d, g.cy + Math.sin(ak) * d, s * (1 - k * 0.15), '#a8f0ff', fade * 0.15 * pow); }
          blob(c, x, y, s * 1.5, '#dffaff', fade * 0.8 * pow);
          blob(c, x, y, s * 0.9, '#ffffff', fade * 0.5 * pow);
          c.globalCompositeOperation = 'source-over';
          c.globalAlpha = fade * 0.85 * pow; c.fillStyle = '#0a1a22';
          c.beginPath(); c.arc(x - s * 0.3, y - s * 0.1, s * 0.13, 0, TAU); c.arc(x + s * 0.3, y - s * 0.1, s * 0.13, 0, TAU); c.fill();
          c.beginPath(); c.ellipse(x, y + s * 0.35, s * 0.14, s * 0.22, 0, 0, TAU); c.fill();
        }
      },
    },
    santuario: {
      n: 'Santuário', tint: '#fff0c0', base: 0.12, edge: '#fff8de', glow: true, g: 'sagrado', lembra: true,
      regra: 'ninguém ataca dentro',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        const p = 0.5 + 0.5 * Math.sin(t * 0.8);
        blob(c, g.cx, g.cy, g.inR * 1.1, '#fff2c8', (0.14 + 0.06 * p) * pow);
        // a cúpula: a borda clara, por dentro
        c.strokeStyle = '#fff8e0';
        for (let k = 0; k < 3; k++) { c.globalAlpha = (0.18 + 0.1 * Math.sin(t * 1.2 + k)) * pow; c.lineWidth = Math.max(1, g.cell * (0.08 - k * 0.02)); c.beginPath(); c.arc(g.cx, g.cy, g.inR * (0.97 - k * 0.05), 0, TAU); c.stroke(); }
        // a flor de lótus no meio
        c.fillStyle = '#fffbe8';
        const r = g.inR * 0.22;
        for (let k = 0; k < 8; k++) { const a = k / 8 * TAU + t * 0.05; c.globalAlpha = (0.25 + 0.15 * p) * pow; c.beginPath(); c.ellipse(g.cx + Math.cos(a) * r * 0.6, g.cy + Math.sin(a) * r * 0.6, r * 0.6, r * 0.25, a, 0, TAU); c.fill(); }
        // poeira de luz subindo devagar
        const n = cnt(g, 2, 4, 30, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (0.1 + hsh(i, 3, g.seed) * 0.12) + hsh(i, 4, g.seed)) % 1, [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          blob(c, x, y - ph * g.cell * 0.4, g.cell * 0.06, '#fffaf0', Math.sin(ph * Math.PI) * 0.7 * pow);
        }
      },
    },
    luaSangue: {
      n: 'Lua de sangue', tint: '#3a060c', base: 0.34, edge: '#ff4a5a', glow: true, g: 'sagrado', cond: 'furia',
      regra: 'quem começa a vez dentro entra em Fúria (o mestre confirma)',
      draw(c, g, t, pow) {
        c.globalCompositeOperation = 'lighter';
        // a luz vermelha da lua, de cima
        const p = 0.5 + 0.5 * Math.sin(t * 0.7), my = g.cy - g.inR * 0.25;
        blob(c, g.cx, my, g.inR * 1.2, '#ff2a3a', (0.14 + 0.06 * p) * pow);
        blob(c, g.cx, my, g.inR * 0.35, '#ff8a8a', (0.35 + 0.1 * p) * pow);
        c.save(); c.translate(g.cx, my); c.rotate(t * 0.05);
        c.fillStyle = '#ff6a6a';
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, w = 0.06; c.globalAlpha = (0.06 + 0.04 * Math.sin(t * 1.3 + i)) * pow; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - w) * g.inR * 1.3, Math.sin(a - w) * g.inR * 1.3); c.lineTo(Math.cos(a + w) * g.inR * 1.3, Math.sin(a + w) * g.inR * 1.3); c.closePath(); c.fill(); }
        c.restore();
        // gotas de luz caindo
        const n = cnt(g, 2.4, 4, 36, pow);
        for (let i = 0; i < n; i++) {
          const ph = (t * (0.3 + hsh(i, 3, g.seed) * 0.3) + hsh(i, 4, g.seed)) % 1, [x, y] = g.sample(hsh(i, 1, g.seed), hsh(i, 2, g.seed));
          blob(c, x, y + (ph - 0.5) * g.cell * 0.6, g.cell * 0.05, '#ff9a9a', Math.sin(ph * Math.PI) * 0.7 * pow);
        }
      },
    },
  };
  /* As categorias da biblioteca (para as abas), e cada efeito antigo na dele */
  const TAGS = [{ id: 'elem', n: 'Elementos' }, { id: 'magia', n: 'Magia' }, { id: 'natureza', n: 'Natureza' }, { id: 'sagrado', n: 'Sagrado e sombrio' }];
  for (const [id, gr] of [['fogo', 'elem'], ['gelo', 'elem'], ['raio', 'elem'], ['agua', 'elem'], ['vento', 'elem'], ['terra', 'elem'], ['veneno', 'natureza'], ['nevoa', 'natureza'],
    ['sombra', 'sagrado'], ['cura', 'sagrado'], ['sagrado', 'sagrado'], ['arcano', 'magia'], ['antimagia', 'magia'], ['tinta', 'magia']]) P[id].g = gr;
  P.fogo.sug = 'fogo'; P.gelo.sug = 'gelo'; P.raio.sug = 'atordoado'; P.agua.sug = 'molhado'; P.veneno.sug = 'veneno'; P.cura.sug = 'regen'; P.sagrado.sug = 'bencao'; P.sombra.sug = 'medo'; P.tinta.sug = 'cego';
  const ORDER = ['fogo', 'gelo', 'raio', 'agua', 'vento', 'terra', 'lava', 'areia', 'tempestade', 'nevasca', 'acida',
    'gelado', 'fumaca', 'brasas', 'cristais', 'cinzas', 'correnteza', 'aguaEletrica',
    'arcano', 'antimagia', 'tinta', 'escuridao', 'teia', 'barreira', 'circulo', 'silencio',
    'vortice', 'gravidade', 'tempo', 'portal', 'runas', 'selos',
    'veneno', 'nevoa', 'toxica', 'espinhos', 'esporos', 'pantano', 'oleo', 'lama', 'jardim',
    'cura', 'sagrado', 'aura', 'consagrado', 'sombra', 'chamasNegras', 'maldicao', 'espiritos', 'santuario', 'luaSangue'];

  function draw(ctx, e, g, t, px) {
    const pr = P[e.fx] || P.fogo;
    const pow = clamp(e.pow == null ? 0.8 : e.pow, 0.2, 1);
    /* (lote 7, parte 4b) A zona "leve" (a dos lugares gerados, por cima de um fundo que já desenha a lava, a lama, o
       gelo): só um véu fraco da cor dela, o movimento mais discreto e o contorno tracejado. */
    const leve = !!e.leve;
    g.seed = e.seed || 1;
    g.fxe = e;                                       // (o efeito inteiro, para o desenho que depende dele: a Distorção do tempo)
    ctx.save();
    ctx.clip(g.path);
    ctx.fillStyle = hexA(pr.tint, pr.base * (0.5 + pow * 0.6) * (leve ? 0.3 : 1) * (0.88 + 0.12 * Math.sin(t * 1.2 + g.seed)));
    ctx.fill(g.path);
    pr.draw(ctx, g, t, leve ? Math.max(0.2, pow * 0.5) : pow);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = pr.edge; ctx.lineJoin = 'round';
    if (leve) { ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5 * px; ctx.setLineDash([7 * px, 5 * px]); ctx.stroke(g.path); }
    else {
      ctx.globalAlpha = 0.2 + 0.2 * pow; ctx.lineWidth = 5 * px; ctx.stroke(g.path);
      ctx.globalAlpha = 0.8; ctx.lineWidth = 1.5 * px; ctx.stroke(g.path);
    }
    ctx.restore();
  }

  /* ---- (lote 7) o que as zonas fazem na cena ---- */
  // O contorno de uma área em pontos (o círculo em 28 lados): é o que vira parede de visão e de passagem.
  function contorno(e, sc) {
    const g = geom(e, sc), out = [], k = e.fx === 'portal' ? 'circ' : e.k;
    const gira = (a, b) => [g.x + g.cs * a - g.sn * b, g.y + g.sn * a + g.cs * b];
    if (k === 'rect') for (const [a, b] of [[-g.hw, -g.hh], [g.hw, -g.hh], [g.hw, g.hh], [-g.hw, g.hh]]) out.push(gira(a, b));
    else if (k === 'quad') for (const [a, b] of [[-g.R, -g.R], [g.R, -g.R], [g.R, g.R], [-g.R, g.R]]) out.push(gira(a, b));
    else if (k === 'cone') {
      const ang = rad(clamp(e.ang || 60, 10, 340));
      out.push([g.x, g.y]);
      for (let i = 0; i <= 16; i++) { const a = g.dir - ang / 2 + ang * i / 16; out.push([g.x + Math.cos(a) * g.R, g.y + Math.sin(a) * g.R]); }
    } else if (k === 'line') {
      const hw = Math.max(sc.cell * 0.25, (e.w || 1) * sc.cell) / 2;
      out.push([g.x + g.sn * hw, g.y - g.cs * hw], [g.x + g.cs * g.R + g.sn * hw, g.y + g.sn * g.R - g.cs * hw], [g.x + g.cs * g.R - g.sn * hw, g.y + g.sn * g.R + g.cs * hw], [g.x - g.sn * hw, g.y + g.cs * hw]);
    } else for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; out.push([g.x + Math.cos(a) * g.R, g.y + Math.sin(a) * g.R]); }
    return out;
  }
  const ehBarreira = e => !!e && !!P[e.fx] && !!(P[e.fx].bloqueia || P[e.fx].barra);
  /* As zonas que tapam a visão (Fumaça, Muralha de cristais) e as que barram a passagem (a Muralha), como trechos de
     parede: { vista: [x1, y1, x2, y2, …], passo: […] }. A zona só do mestre não barra nada (os jogadores nem a veem). */
  function barreiras(sc) {
    const vista = [], passo = [];
    for (const e of sc.effects || []) {
      const pr = P[e.fx];
      if (!pr || e.gm || !(pr.bloqueia || pr.barra)) continue;
      const pts = contorno(e, sc);
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if (pr.bloqueia) vista.push(a[0], a[1], b[0], b[1]);
        if (pr.barra) passo.push(a[0], a[1], b[0], b[1]);
      }
    }
    return { vista, passo };
  }
  // Esta operação do Store mexe em alguma barreira? (para as paredes e a visão serem refeitas só quando precisa)
  function mexeNaBarreira(op, inv) {
    if (!op) return false;
    if (op.c === 'effects') {
      if (op.t === 'add') return ehBarreira(op.v);
      if (op.t === 'del') return ehBarreira(inv && inv.v);
      if (op.t === 'upd') return ehBarreira(Store.get('effects', op.id)) || (!!inv && !!inv.p && 'fx' in inv.p && ehBarreira({ fx: inv.p.fx }));
      return false;
    }
    if (op.c === 'tokens' && op.t === 'upd' && op.p && ('x' in op.p || 'y' in op.p || 'size' in op.p)) return (Store.scene().effects || []).some(e => e.token === op.id && ehBarreira(e));
    return false;
  }
  /* As combinações: uma zona que dispara (o fogo) em cima de outra que muda (o óleo). O site sugere; o mestre confirma,
     e a zona que muda vira o resultado (a que disparou sai). sug: a condição sugerida para quem estava dentro. */
  const COMBOS = [
    { gat: ['fogo', 'lava', 'chamasNegras', 'brasas'], base: ['oleo'], res: 'fogo', titulo: 'Fogo no óleo: explosão?', feito: 'O óleo explodiu em fogo', sug: 'fogo' },
    { gat: ['raio', 'tempestade'], base: ['agua', 'pantano', 'correnteza'], res: 'aguaEletrica', titulo: 'Raio na água: eletrificar?', feito: 'A água ficou eletrificada', sug: 'eletrizado' },
    { gat: ['gelo', 'nevasca'], base: ['agua', 'correnteza'], res: 'gelado', titulo: 'Gelo na água: congelar o chão?', feito: 'A água congelou', sug: 'gelo' },
  ];
  let riscador = null;
  const pontoEm = (path, x, y) => { if (!riscador) riscador = document.createElement('canvas').getContext('2d'); return riscador.isPointInPath(path, x, y); };
  // As duas áreas se tocam? (pontos de cada uma, numa grade, caindo dentro da outra)
  function seTocam(a, b, sc) {
    const ga = geom(a, sc), gb = geom(b, sc);
    for (const [g1, g2] of [[ga, gb], [gb, ga]]) {
      if (pontoEm(g2.path, g1.cx, g1.cy)) return true;
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const [x, y] = g1.sample(i / 6, j / 6); if (pontoEm(g2.path, x, y)) return true; }
    }
    return false;
  }
  // As combinações que envolvem as zonas de `ids` (as que acabaram de mudar): [{ gat, base, regra }]
  function combinacoes(sc, ids) {
    const out = [], quer = new Set(ids || []);
    for (const r of COMBOS) {
      for (const a of sc.effects || []) {
        if (!r.gat.includes(a.fx)) continue;
        for (const b of sc.effects || []) {
          if (b === a || !r.base.includes(b.fx) || !(quer.has(a.id) || quer.has(b.id))) continue;
          if (seTocam(a, b, sc)) out.push({ gat: a, base: b, regra: r });
        }
      }
    }
    return out;
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

  return { P, ORDER, TAGS, geom, draw, thumb, hsh, blob, contorno, barreiras, mexeNaBarreira, ehBarreira, COMBOS, combinacoes, seTocam, pontoEm };
})();
