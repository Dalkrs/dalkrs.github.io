/* ---------------------------------------------------------------
   7j. AS ROUPAS E OS DISFARCES (lote 133) — para as missões de furtividade.
   O token veste uma roupa: o retrato continua, e a roupa é desenhada por cima (o chapéu, o elmo, o capuz… em cima; a
   gola, o tabardo, o avental, o manto… embaixo; a capa, atrás) e a borda ganha a cor dela. Todos veem a roupa.
     t.roupa = { k: o id da roupa, d: true se é disfarce }
   O dono do token (o jogador) e o mestre vestem; a roupa que o jogador põe no próprio personagem é disfarce. A do NPC é a
   roupa de verdade dele (o noviço do templo, o cozinheiro do castelo), e o mestre pode marcar que também é disfarce.
   Nas rondas: quem está disfarçado, no cone de quem ronda, nunca fica "visto" (!) — só "pode ter notado" (?).
   "Noviço encontra noviço": um disfarçado perto (até App.opt.disfPerto quadrados, 3 de começo) e à vista de um NPC com a
   roupa de verdade igual ganha o "??" em cima (só o mestre vê) e o mestre recebe um aviso. O teste, o mestre rola na mão.
   O disfarce só cai quando alguém tira.
   --------------------------------------------------------------- */
const Roupas = (() => {
  /* c: a cor principal; c2: a segunda; topo: o que vai na cabeça; corpo: o que vai embaixo; capa: a capa atrás */
  const LISTA = [
    { id: 'civil', n: 'Civil', g: 'Comuns', c: '#8a6f4e', c2: '#d8c7a4', topo: 'touca', corpo: 'gola' },
    { id: 'guarda', n: 'Guarda', g: 'Comuns', c: '#7d8590', c2: '#9b2f2f', topo: 'elmo', corpo: 'tabardo' },
    { id: 'funcionario', n: 'Funcionário', g: 'Comuns', c: '#5b6b7d', c2: '#d9d2bf', topo: 'bone', corpo: 'colete' },
    { id: 'novico', n: 'Noviço', g: 'Comuns', c: '#ece6d6', c2: '#b8a26a', topo: 'capuz', corpo: 'manto' },
    { id: 'alquimista', n: 'Alquimista', g: 'Comuns', c: '#4f6b3a', c2: '#c9a24a', topo: 'oculos', corpo: 'avental' },
    { id: 'vip', n: 'VIP (nobre)', g: 'Comuns', c: '#6b2a63', c2: '#e2b84a', topo: 'pluma', corpo: 'gola', capa: true },
    { id: 'criado', n: 'Criado ou criada', g: 'Serviço', c: '#2f3442', c2: '#f1ede2', topo: 'touca', corpo: 'avental' },
    { id: 'cozinheiro', n: 'Cozinheiro', g: 'Serviço', c: '#f3f0e8', c2: '#c4b9a3', topo: 'gorro', corpo: 'avental' },
    { id: 'mensageiro', n: 'Mensageiro', g: 'Serviço', c: '#2f5b8a', c2: '#e2b84a', topo: 'bone', corpo: 'faixa' },
    { id: 'mendigo', n: 'Mendigo', g: 'Rua', c: '#6f6352', c2: '#4a4136', topo: 'capuz', corpo: 'trapos' },
    { id: 'mercador', n: 'Mercador ambulante', g: 'Rua', c: '#a0642c', c2: '#e8d6a6', topo: 'chapeu', corpo: 'colete' },
    { id: 'bardo', n: 'Bardo ou artista', g: 'Rua', c: '#3e7d6a', c2: '#d6573f', topo: 'pluma', corpo: 'gola' },
    { id: 'peregrino', n: 'Peregrino', g: 'Fé', c: '#7a6a52', c2: '#c2ab7a', topo: 'chapeu', corpo: 'manto', capa: true },
    { id: 'sacerdote', n: 'Sacerdote da Luz', g: 'Fé', c: '#f4efe0', c2: '#d9b24a', topo: 'mitra', corpo: 'manto' },
    { id: 'monge', n: 'Monge', g: 'Fé', c: '#b0662a', c2: '#5a3a1e', topo: 'nada', corpo: 'manto' },
    { id: 'mercenario', n: 'Mercenário', g: 'Armas', c: '#5a4634', c2: '#8f2b2b', topo: 'bandana', corpo: 'couro' },
    { id: 'soldado', n: 'Soldado da Coroa', g: 'Armas', c: '#9aa3ad', c2: '#c9a24a', topo: 'elmo', corpo: 'tabardo', capa: true },
    { id: 'cacador', n: 'Caçador', g: 'Armas', c: '#4c5b34', c2: '#7a5a34', topo: 'capuz', corpo: 'couro' },
  ];
  const POR_ID = new Map(LISTA.map(r => [r.id, r]));
  const de = t => (t && t.roupa && POR_ID.get(t.roupa.k)) || null;
  const disfarcado = t => !!(de(t) && t.roupa.d);
  const perto = () => clamp(Math.round(Number(App.opt.disfPerto) || 3), 1, 20);

  function limpar(t) {
    const r = t && t.roupa;
    if (!t || t.prop || !r || typeof r !== 'object' || Array.isArray(r) || !POR_ID.has(r.k)) { if (t) delete t.roupa; return; }
    t.roupa = r.d ? { k: r.k, d: true } : { k: r.k };
  }

  /* ---------------- o desenho ---------------- */
  const escuro = 'rgba(12,12,16,0.85)';
  function contorno(c, px, r) { c.lineWidth = Math.max(1 * px, r * 0.05); c.strokeStyle = escuro; c.lineJoin = 'round'; c.stroke(); }
  // a capa: atrás do token (antes do corpo), saindo pelos lados e por baixo
  function atras(c, t, sc, px) {
    const R = de(t);
    if (!R || !R.capa || t.conds.includes('morto')) return;
    const s = t.size * sc.cell, cx = t.x + s / 2, cy = t.y + s / 2, r = s / 2 - s * 0.05;
    c.save(); if (t.hidden) c.globalAlpha = 0.5;
    c.beginPath();
    c.moveTo(cx - r * 0.75, cy - r * 0.35);
    c.quadraticCurveTo(cx - r * 1.25, cy + r * 0.6, cx - r * 0.95, cy + r * 1.18);
    c.lineTo(cx + r * 0.95, cy + r * 1.18);
    c.quadraticCurveTo(cx + r * 1.25, cy + r * 0.6, cx + r * 0.75, cy - r * 0.35);
    c.closePath();
    c.fillStyle = R.c2; c.fill(); contorno(c, px, r);
    c.restore();
  }
  // o que vai embaixo (dentro do token, na parte de baixo) e o que vai na cabeça (por cima, saindo do token)
  function frente(c, t, sc, px) {
    const R = de(t);
    if (!R || t.conds.includes('morto')) return;
    const s = t.size * sc.cell, cx = t.x + s / 2, cy = t.y + s / 2, r = s / 2 - s * 0.05;
    c.save(); if (t.hidden) c.globalAlpha = 0.5;
    // embaixo: cortado pela forma do token
    c.save();
    c.beginPath(); if (t.shape === 'quad') c.rect(cx - r, cy - r, 2 * r, 2 * r); else c.arc(cx, cy, r, 0, TAU); c.clip();
    corpo(c, R, cx, cy, r, px);
    c.restore();
    // a borda na cor da roupa
    c.beginPath(); if (t.shape === 'quad') c.rect(cx - r, cy - r, 2 * r, 2 * r); else c.arc(cx, cy, r, 0, TAU);
    c.lineWidth = Math.max(2 * px, s * 0.05); c.strokeStyle = R.c; c.stroke();
    topo(c, R, cx, cy, r, px);
    c.restore();
  }
  function corpo(c, R, cx, cy, r, px) {
    const y0 = cy + r * 0.42, fill = (cor, f) => { c.fillStyle = cor; f(); c.fill(); contorno(c, px, r); };
    switch (R.corpo) {
      case 'gola': fill(R.c, () => { c.beginPath(); c.moveTo(cx - r, y0 + r * 0.1); c.quadraticCurveTo(cx, y0 - r * 0.12, cx + r, y0 + r * 0.1); c.lineTo(cx + r, cy + r); c.lineTo(cx - r, cy + r); c.closePath(); });
        fill(R.c2, () => { c.beginPath(); c.moveTo(cx - r * 0.32, y0 - r * 0.02); c.lineTo(cx, y0 + r * 0.26); c.lineTo(cx + r * 0.32, y0 - r * 0.02); c.lineTo(cx + r * 0.14, y0 - r * 0.06); c.lineTo(cx, y0 + r * 0.1); c.lineTo(cx - r * 0.14, y0 - r * 0.06); c.closePath(); }); break;
      case 'tabardo': fill(R.c, () => { c.beginPath(); c.rect(cx - r, y0, 2 * r, r); });
        fill(R.c2, () => { c.beginPath(); c.rect(cx - r * 0.24, y0, r * 0.48, r); });
        c.fillStyle = R.c; c.beginPath(); c.arc(cx, y0 + r * 0.26, r * 0.1, 0, TAU); c.fill(); break;
      case 'colete': fill(R.c2, () => { c.beginPath(); c.rect(cx - r, y0, 2 * r, r); });
        fill(R.c, () => { c.beginPath(); c.moveTo(cx - r, y0); c.lineTo(cx - r * 0.12, y0); c.lineTo(cx - r * 0.3, cy + r); c.lineTo(cx - r, cy + r); c.closePath(); });
        fill(R.c, () => { c.beginPath(); c.moveTo(cx + r, y0); c.lineTo(cx + r * 0.12, y0); c.lineTo(cx + r * 0.3, cy + r); c.lineTo(cx + r, cy + r); c.closePath(); }); break;
      case 'avental': fill(R.c, () => { c.beginPath(); c.rect(cx - r, y0, 2 * r, r); });
        fill(R.c2, () => { c.beginPath(); c.moveTo(cx - r * 0.42, y0 - r * 0.04); c.lineTo(cx + r * 0.42, y0 - r * 0.04); c.lineTo(cx + r * 0.5, cy + r); c.lineTo(cx - r * 0.5, cy + r); c.closePath(); });
        c.strokeStyle = escuro; c.lineWidth = Math.max(1 * px, r * 0.04); c.beginPath(); c.moveTo(cx - r * 0.25, y0 + r * 0.3); c.lineTo(cx + r * 0.25, y0 + r * 0.3); c.stroke(); break;
      case 'manto': fill(R.c, () => { c.beginPath(); c.moveTo(cx - r, y0 - r * 0.08); c.quadraticCurveTo(cx, y0 - r * 0.3, cx + r, y0 - r * 0.08); c.lineTo(cx + r, cy + r); c.lineTo(cx - r, cy + r); c.closePath(); });
        c.strokeStyle = R.c2; c.lineWidth = Math.max(1.4 * px, r * 0.09); c.beginPath(); c.moveTo(cx, y0 - r * 0.15); c.lineTo(cx, cy + r); c.stroke(); break;
      case 'faixa': fill(R.c, () => { c.beginPath(); c.rect(cx - r, y0, 2 * r, r); });
        fill(R.c2, () => { c.beginPath(); c.moveTo(cx - r * 0.75, y0); c.lineTo(cx - r * 0.5, y0); c.lineTo(cx + r * 0.75, cy + r); c.lineTo(cx + r * 0.45, cy + r); c.closePath(); }); break;
      case 'trapos': fill(R.c, () => { c.beginPath(); c.moveTo(cx - r, y0); for (let k = 0; k <= 8; k++) c.lineTo(cx - r + k * r / 4, y0 + (k % 2 ? r * 0.12 : -r * 0.05)); c.lineTo(cx + r, cy + r); c.lineTo(cx - r, cy + r); c.closePath(); });
        fill(R.c2, () => { c.beginPath(); c.rect(cx - r * 0.5, y0 + r * 0.25, r * 0.28, r * 0.24); }); break;
      case 'couro': fill(R.c, () => { c.beginPath(); c.rect(cx - r, y0, 2 * r, r); });
        c.strokeStyle = R.c2; c.lineWidth = Math.max(1.6 * px, r * 0.13); c.beginPath(); c.moveTo(cx - r * 0.8, y0); c.lineTo(cx + r * 0.6, cy + r); c.stroke();
        c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(cx - r * 0.1, y0 + r * 0.34, r * 0.07, 0, TAU); c.fill(); break;
      default: break;
    }
  }
  function topo(c, R, cx, cy, r, px) {
    const yt = cy - r + r * 0.14, fill = (cor, f) => { c.fillStyle = cor; f(); c.fill(); contorno(c, px, r); };
    switch (R.topo) {
      case 'elmo':
        fill(R.c, () => { c.beginPath(); c.arc(cx, yt + r * 0.32, r * 0.62, Math.PI, 0); c.closePath(); });
        fill(R.c, () => { c.beginPath(); c.rect(cx - r * 0.78, yt + r * 0.26, r * 1.56, r * 0.14); });
        fill(R.c, () => { c.beginPath(); c.rect(cx - r * 0.06, yt + r * 0.3, r * 0.12, r * 0.34); });
        fill(R.c2, () => { c.beginPath(); c.moveTo(cx - r * 0.08, yt - r * 0.28); c.quadraticCurveTo(cx + r * 0.3, yt - r * 0.5, cx + r * 0.45, yt - r * 0.2); c.lineTo(cx + r * 0.05, yt - r * 0.12); c.closePath(); }); break;
      case 'capuz':
        fill(R.c, () => { c.beginPath(); c.moveTo(cx - r * 0.92, yt + r * 0.85); c.quadraticCurveTo(cx - r * 0.95, yt - r * 0.2, cx, yt - r * 0.32); c.quadraticCurveTo(cx + r * 0.95, yt - r * 0.2, cx + r * 0.92, yt + r * 0.85); c.quadraticCurveTo(cx + r * 0.62, yt + r * 0.1, cx, yt + r * 0.06); c.quadraticCurveTo(cx - r * 0.62, yt + r * 0.1, cx - r * 0.92, yt + r * 0.85); c.closePath(); }); break;
      case 'touca':
        fill(R.c2, () => { c.beginPath(); c.ellipse(cx, yt + r * 0.2, r * 0.6, r * 0.34, 0, Math.PI, 0); c.closePath(); });
        fill(R.c, () => { c.beginPath(); c.rect(cx - r * 0.62, yt + r * 0.14, r * 1.24, r * 0.1); }); break;
      case 'bone':
        fill(R.c, () => { c.beginPath(); c.arc(cx, yt + r * 0.24, r * 0.5, Math.PI, 0); c.closePath(); });
        fill(R.c2, () => { c.beginPath(); c.ellipse(cx + r * 0.42, yt + r * 0.22, r * 0.4, r * 0.09, 0, 0, TAU); }); break;
      case 'chapeu':
        fill(R.c, () => { c.beginPath(); c.ellipse(cx, yt + r * 0.24, r * 1.0, r * 0.2, 0, 0, TAU); });
        fill(R.c, () => { c.beginPath(); c.moveTo(cx - r * 0.42, yt + r * 0.22); c.lineTo(cx - r * 0.34, yt - r * 0.3); c.quadraticCurveTo(cx, yt - r * 0.42, cx + r * 0.34, yt - r * 0.3); c.lineTo(cx + r * 0.42, yt + r * 0.22); c.closePath(); });
        fill(R.c2, () => { c.beginPath(); c.rect(cx - r * 0.4, yt + r * 0.04, r * 0.8, r * 0.12); }); break;
      case 'pluma':
        fill(R.c, () => { c.beginPath(); c.ellipse(cx, yt + r * 0.18, r * 0.75, r * 0.26, -0.15, 0, TAU); });
        fill(R.c2, () => { c.beginPath(); c.moveTo(cx + r * 0.2, yt + r * 0.05); c.quadraticCurveTo(cx + r * 0.95, yt - r * 0.55, cx + r * 0.75, yt - r * 0.7); c.quadraticCurveTo(cx + r * 0.6, yt - r * 0.2, cx + r * 0.05, yt + r * 0.02); c.closePath(); }); break;
      case 'gorro':
        fill(R.c, () => { c.beginPath(); c.rect(cx - r * 0.42, yt - r * 0.05, r * 0.84, r * 0.3); });
        fill(R.c, () => { c.beginPath(); c.arc(cx - r * 0.28, yt - r * 0.2, r * 0.3, 0, TAU); c.arc(cx + r * 0.28, yt - r * 0.2, r * 0.3, 0, TAU); c.arc(cx, yt - r * 0.42, r * 0.34, 0, TAU); }); break;
      case 'oculos':
        fill(R.c2, () => { c.beginPath(); c.rect(cx - r * 0.85, yt + r * 0.32, r * 1.7, r * 0.12); });
        for (const k of [-1, 1]) { fill('#7fc6d9', () => { c.beginPath(); c.arc(cx + k * r * 0.32, yt + r * 0.38, r * 0.2, 0, TAU); }); } break;
      case 'mitra':
        fill(R.c, () => { c.beginPath(); c.moveTo(cx - r * 0.4, yt + r * 0.22); c.lineTo(cx - r * 0.3, yt - r * 0.4); c.lineTo(cx, yt - r * 0.62); c.lineTo(cx + r * 0.3, yt - r * 0.4); c.lineTo(cx + r * 0.4, yt + r * 0.22); c.closePath(); });
        c.strokeStyle = R.c2; c.lineWidth = Math.max(1.4 * px, r * 0.08); c.beginPath(); c.moveTo(cx, yt - r * 0.5); c.lineTo(cx, yt + r * 0.18); c.moveTo(cx - r * 0.18, yt - r * 0.18); c.lineTo(cx + r * 0.18, yt - r * 0.18); c.stroke(); break;
      case 'bandana':
        fill(R.c2, () => { c.beginPath(); c.rect(cx - r * 0.82, yt + r * 0.2, r * 1.64, r * 0.18); });
        fill(R.c2, () => { c.beginPath(); c.moveTo(cx + r * 0.78, yt + r * 0.24); c.lineTo(cx + r * 1.15, yt + r * 0.1); c.lineTo(cx + r * 1.08, yt + r * 0.42); c.closePath(); }); break;
      default: break;
    }
  }

  /* ---------------- noviço encontra noviço ---------------- */
  // [{ d (o disfarçado), n (o NPC da mesma roupa) }]: perto (até disfPerto quadrados) e sem parede no meio
  function encontros(sc) {
    if (!sc) return [];
    const ds = sc.tokens.filter(t => !t.prop && disfarcado(t) && !t.conds.includes('morto'));
    if (!ds.length) return [];
    const npcs = sc.tokens.filter(t => !t.prop && !t.owner && de(t) && !t.roupa.d && !t.conds.includes('morto') && !t.conds.includes('adormecido')), out = [];
    const lim = perto() * sc.cell;
    for (const d of ds) {
      const [dx, dy, dh] = tokC(d, sc);
      for (const n of npcs) {
        if (n.id === d.id || n.roupa.k !== d.roupa.k) continue;
        const [nx, ny, nh] = tokC(n, sc);
        if (Math.max(Math.abs(dx - nx), Math.abs(dy - ny)) > lim + dh + nh - sc.cell) continue;
        const segs = Walls.sightFor(sc, n);
        let barra = false;
        for (let i = 0; i + 3 < segs.length && !barra; i += 4) if (Geo.segHit(nx, ny, dx, dy, segs[i], segs[i + 1], segs[i + 2], segs[i + 3])) barra = true;
        if (!barra) out.push({ d, n });
      }
    }
    return out;
  }
  // o "??" em cima do disfarçado (só o mestre) e o aviso quando um encontro novo aparece
  const avisados = new Set();
  function selos(c, sc, px) {
    if (!isGM()) return;
    const es = encontros(sc), ja = new Set(), agora = new Set();
    for (const e of es) {
      const chave = sc.id + ':' + e.d.id + ':' + e.n.id;
      agora.add(chave);
      if (!avisados.has(chave)) { avisados.add(chave); setTimeout(() => UI.toast(`${e.d.name}, disfarçado de ${POR_ID.get(e.d.roupa.k).n.toLowerCase()}, está perto de ${e.n.name} (${POR_ID.get(e.n.roupa.k).n.toLowerCase()} de verdade): ??. Se quiser, peça um teste.`, { key: 'disfarce', long: true }), 0); }
      if (ja.has(e.d.id)) continue;
      ja.add(e.d.id);
      const [cx, cy, half] = tokC(e.d, sc), x = cx, y = cy - half - 14 * px, r = 11 * px;
      c.save();
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#f0c448'; c.fill(); c.strokeStyle = 'rgba(8,10,16,0.9)'; c.lineWidth = 1.5 * px; c.stroke();
      c.fillStyle = '#16120a'; c.font = `800 ${11 * px}px system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('??', x, y + 0.5 * px);
      c.restore();
    }
    // o encontro que acabou pode avisar de novo da próxima vez
    for (const k of [...avisados]) if (k.startsWith(sc.id + ':') && !agora.has(k)) avisados.delete(k);
  }

  /* ---------------- o painel do token (bloco "Roupa") ---------------- */
  function secao(t, K) {
    if (t.prop) return null;
    const gm = isGM(), meu = ownsTok(t);
    if (!gm && !meu) return de(t) ? K.sec('s-roupa', 'Roupa', false, K.note(`Vestido de ${de(t).n.toLowerCase()}${disfarcado(t) ? ' (disfarce)' : ''}.`)) : null;
    if (!gm && !can('conds', t)) return de(t) ? K.sec('s-roupa', 'Roupa', false, K.note(`Vestido de ${de(t).n.toLowerCase()}.`)) : null;
    const R = de(t), U = (v, l) => Store.tx(l, () => Store.upd('tokens', t.id, { roupa: v }));
    const grupos = [...new Set(LISTA.map(x => x.g))];
    const sel = h('select', { id: 'tk-roupa', 'aria-label': 'A roupa', onchange: e => { const k = e.target.value; U(k ? { k, d: gm ? (t.owner ? true : !!(t.roupa && t.roupa.d)) : true } : null, k ? 'Vestir: ' + POR_ID.get(k).n : 'Tirar a roupa'); } },
      h('option', { value: '', text: 'Sem roupa especial' }),
      grupos.map(g => h('optgroup', { label: g }, LISTA.filter(x => x.g === g).map(x => h('option', { value: x.id, selected: R && R.id === x.id ? true : null, text: x.n })))));
    return K.secR('s-roupa', 'Roupa', !!R, R ? R.n + (disfarcado(t) ? ' · disfarce' : '') : 'nenhuma',
      K.field('Veste', sel, 'stack'),
      R && gm ? K.toggle('tk-roupa-d', !!t.roupa.d, v => U(v ? { k: R.id, d: true } : { k: R.id }, v ? 'É disfarce' : 'Roupa de verdade'), 'É disfarce (no NPC: desmarcado, é a roupa de verdade dele)') : null,
      R ? h('div', { class: 'row' }, K.btn(disfarcado(t) ? 'Tirar o disfarce' : 'Tirar a roupa', () => U(null, 'Tirar a roupa'), { kind: 'small', id: 'tk-roupa-tira' })) : null,
      K.note(gm ? 'Todos veem a roupa. Disfarçado, quem ronda só "pode ter notado" (?). Perto de um NPC com a mesma roupa de verdade, aparece "??" (só você vê).' : 'Todos veem a roupa. Disfarçado, quem ronda tem mais dificuldade de reparar em você.'));
  }
  return { LISTA, POR_ID, de, disfarcado, limpar, atras, frente, encontros, selos, secao, perto };
})();
