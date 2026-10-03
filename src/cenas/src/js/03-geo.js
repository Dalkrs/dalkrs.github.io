/* ---------------------------------------------------------------
   3. GEO — geometria pura
   --------------------------------------------------------------- */
const Geo = (() => {
  // Os dois segmentos se cruzam?
  function segHit(ax, ay, bx, by, cx, cy, dx, dy) {
    const rx = bx - ax, ry = by - ay, sx = dx - cx, sy = dy - cy;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-9) return false;
    const t = ((cx - ax) * sy - (cy - ay) * sx) / den;
    const u = ((cx - ax) * ry - (cy - ay) * rx) / den;
    return t > 1e-6 && t < 1 - 1e-6 && u >= 0 && u <= 1;
  }

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function distPolyline(px, py, pts, closed) {
    let best = Infinity;
    const n = pts.length / 2;
    if (n === 1) return Math.hypot(px - pts[0], py - pts[1]);
    for (let i = 0; i < n - 1; i++) best = Math.min(best, distSeg(px, py, pts[i * 2], pts[i * 2 + 1], pts[i * 2 + 2], pts[i * 2 + 3]));
    if (closed && n > 2) best = Math.min(best, distSeg(px, py, pts[(n - 1) * 2], pts[(n - 1) * 2 + 1], pts[0], pts[1]));
    return best;
  }

  function inPoly(px, py, pts) {
    let inside = false;
    const n = pts.length / 2;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function bboxPts(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] < x0) x0 = pts[i]; if (pts[i] > x1) x1 = pts[i];
      if (pts[i + 1] < y0) y0 = pts[i + 1]; if (pts[i + 1] > y1) y1 = pts[i + 1];
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  // Simplificação de traço (Ramer–Douglas–Peucker).
  function simplify(pts, eps) {
    const n = pts.length / 2;
    if (n < 3) return pts.slice();
    const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
    const stack = [[0, n - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      let far = -1, fd = eps;
      for (let i = a + 1; i < b; i++) {
        const d = distSeg(pts[i * 2], pts[i * 2 + 1], pts[a * 2], pts[a * 2 + 1], pts[b * 2], pts[b * 2 + 1]);
        if (d > fd) { fd = d; far = i; }
      }
      if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
    }
    const out = [];
    for (let i = 0; i < n; i++) if (keep[i]) out.push(Math.round(pts[i * 2] * 10) / 10, Math.round(pts[i * 2 + 1] * 10) / 10);
    return out;
  }

  /* Polígono de visão a partir de (px,py).
     segs: lista plana [x1,y1,x2,y2, ...] das paredes que bloqueiam.
     A caixa (x0,y0)-(x1,y1) limita o alcance e precisa conter a origem. */
  function visPoly(px, py, segs, x0, y0, x1, y1) {
    const S = [x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0];
    for (let i = 0; i < segs.length; i += 4) {
      const ax = segs[i], ay = segs[i + 1], bx = segs[i + 2], by = segs[i + 3];
      if (Math.max(ax, bx) < x0 || Math.min(ax, bx) > x1 || Math.max(ay, by) < y0 || Math.min(ay, by) > y1) continue;
      S.push(ax, ay, bx, by);
    }
    const seen = new Set();
    const ang = [];
    for (let i = 0; i < S.length; i += 2) {
      const key = Math.round(S[i] * 4) + ',' + Math.round(S[i + 1] * 4);
      if (seen.has(key)) continue;
      seen.add(key);
      const a = Math.atan2(S[i + 1] - py, S[i] - px);
      ang.push(a - 1e-4, a, a + 1e-4);
    }
    ang.sort((a, b) => a - b);
    const out = new Array(ang.length * 2);
    const ns = S.length;
    for (let k = 0; k < ang.length; k++) {
      const dx = Math.cos(ang[k]), dy = Math.sin(ang[k]);
      let best = Infinity;
      for (let i = 0; i < ns; i += 4) {
        const ax = S[i], ay = S[i + 1];
        const sx = S[i + 2] - ax, sy = S[i + 3] - ay;
        const den = dx * sy - dy * sx;
        if (den > -1e-12 && den < 1e-12) continue;
        const qx = ax - px, qy = ay - py;
        const t = (qx * sy - qy * sx) / den;
        if (t <= 1e-7 || t >= best) continue;
        const u = (qx * dy - qy * dx) / den;
        if (u < -1e-9 || u > 1 + 1e-9) continue;
        best = t;
      }
      if (best === Infinity) best = 0;
      out[k * 2] = px + dx * best;
      out[k * 2 + 1] = py + dy * best;
    }
    return out;
  }

  return { segHit, distSeg, distPolyline, inPoly, bboxPts, simplify, visPoly };
})();
