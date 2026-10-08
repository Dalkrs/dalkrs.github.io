/* ---------------------------------------------------------------
   7e. COMBATE — o que as telas de combate usam e que não depende de tela
   - terreno: qual área (tipo e altura) há num ponto do mapa e debaixo de um token;
   - a fixa de cada turno de quem joga mais de uma vez por rodada (um chefe);
   - a regra da fixa para um valor qualquer (token sem ficha, disputa);
   - as defesas que descontam um ataque e a conta do dano que passa;
   - onde colocar os tokens de um grupo que chega à cena.
   As telas (a janelinha de atributos, a disputa, o ataque, o grupo, a ferramenta Terreno) ficam em 10c-combate.js.
   --------------------------------------------------------------- */
const Combate = (() => {
  /* ================= Terreno ================= */
  let terRev = 0;                        // muda quando um desenho (ou a cena) muda: o que estava guardado deixa de valer
  const terCache = new Map();            // id do token → { key, ref, s }
  Store.on('live', op => { if (op.c === 'shapes' || op.t === 'scn') terRev++; });
  Store.on('scene', () => { terRev++; terCache.clear(); });
  Store.on('meta', () => { terRev++; });

  // O ponto está dentro desta área? (pincel: a faixa pintada; as outras formas: o lado de dentro)
  function inTer(s, x, y) {
    switch (s.k) {
      case 'rect': return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
      case 'ell': {
        const rx = s.w / 2, ry = s.h / 2;
        if (!(rx > 0 && ry > 0)) return false;
        return Math.hypot((x - s.x - rx) / rx, (y - s.y - ry) / ry) <= 1;
      }
      case 'poly': return Array.isArray(s.pts) && s.pts.length >= 6 && Geo.inPoly(x, y, s.pts);
      case 'free': return Array.isArray(s.pts) && s.pts.length >= 2 && Geo.distPolyline(x, y, s.pts, false) <= Math.max(1, (s.sw || 0) / 2);
      default: return false;
    }
  }
  // A área de terreno num ponto do mapa: a que foi feita por último (a de cima) manda. null se não há.
  function terrainAt(sc, x, y) {
    if (!sc || !Array.isArray(sc.shapes)) return null;
    for (let i = sc.shapes.length - 1; i >= 0; i--) {
      const s = sc.shapes[i];
      if (isTer(s) && shapeShown(s) && inTer(s, x, y)) return s;
    }
    return null;
  }
  // A área em que o token está (pelo centro dele). Guardada enquanto nem ele nem os desenhos mudam: o mapa pede isto a cada quadro.
  function terrainOf(t, sc) {
    if (!sc || !sc.shapes.length) return null;
    const key = sc.id + '|' + terRev + '|' + t.x + '|' + t.y + '|' + t.size + '|' + sc.cell;
    const c = terCache.get(t.id);
    if (c && c.key === key && c.ref === sc.shapes) return c.s;
    const [cx, cy] = tokC(t, sc), s = terrainAt(sc, cx, cy);
    if (terCache.size > 600) terCache.clear();
    terCache.set(t.id, { key, ref: sc.shapes, s });
    return s;
  }
  const terDef = s => TERRENO_POR_ID[s.ter.t];
  const unidade = sc => String((sc && sc.grid && sc.grid.unitName) || '').trim();
  // "Morro · altura 3 m", "Fosso · 3 m de fundura", "Água"
  function terText(s, sc) {
    const d = terDef(s), h = Number(s.ter.h) || 0, u = unidade(sc);
    if (!h) return d.n;
    return d.n + ' · ' + (h > 0 ? 'altura ' + fmt(h) + (u ? ' ' + u : '') : fmt(-h) + (u ? ' ' + u : '') + ' de fundura');
  }
  // O selo do token: "▲3 m" em cima de algo, "▼3 m" dentro de um fosso; vazio no terreno sem altura.
  function terBadge(s, sc) {
    const h = s ? Number(s.ter.h) || 0 : 0, u = unidade(sc);
    return h ? (h > 0 ? '▲' : '▼') + fmt(Math.abs(h)) + (u ? ' ' + u : '') : '';
  }
  // Uma área nova, a partir do que a ferramenta desenhou. geo: { k, x, y, w, h } | { k, pts } | { k:'free', pts, sw }.
  // (a cor e a opacidade guardadas são para uma página que ainda não foi atualizada: lá a área aparece como um
  // desenho comum, translúcido; aqui quem pinta é o desenho do terreno, pelo tipo)
  function newTerrain(geo, tipo, altura) {
    const d = TERRENO_POR_ID[tipo] || TERRENOS[0];
    const s = { id: uid('tr'), k: geo.k, s: d.c, sw: geo.k === 'free' ? Math.max(4, geo.sw || 0) : 0, f: geo.k === 'free' ? null : d.c, a: 0.55, top: false, gm: false, lock: false, by: null, ter: cleanTer({ t: d.id, h: altura }) };
    if (geo.pts) s.pts = geo.pts; else { s.x = geo.x; s.y = geo.y; s.w = geo.w; s.h = geo.h; }
    return s;
  }
  // Trocar o tipo troca também a cor (que é a do tipo); a altura fica a que estava, a não ser que venha outra.
  function terPatch(s, tipo, altura) {
    const d = TERRENO_POR_ID[tipo] || terDef(s), p = { ter: cleanTer({ t: d.id, h: altura == null ? s.ter.h : altura }), s: d.c };
    if (s.k !== 'free') p.f = d.c;
    return p;
  }

  /* ================= Fixa ================= */
  /* A fixa do turno que este token está jogando agora: { k, v } — só quando o combate está em andamento, a vez é
     dele e o mestre anotou uma fixa para aquele turno (t.fixas[k − 1]). Senão, null. */
  function fixaDoTurno(t) {
    const sc = Store.scene(), tn = sc && sc.turn;
    if (!t || !tn || !tn.on || !tn.cur || !Array.isArray(t.fixas)) return null;
    const e = tn.list.find(x => x.id === tn.cur);
    if (!e || e.token !== t.id) return null;
    const k = e.k || 1, v = t.fixas[k - 1];
    return v == null || !isFinite(v) ? null : { k, v: Math.max(0, Math.round(v)) };
  }
  // As fixas anotadas de um token, só até o número de turnos que ele tem: [8, 6, null] → [{ k: 1, v: 8 }, { k: 2, v: 6 }]
  function fixasDe(t) {
    const out = [], n = clampTurns(t && t.turns);
    if (!t || !Array.isArray(t.fixas) || n < 2) return out;
    for (let k = 1; k <= n; k++) { const v = t.fixas[k - 1]; if (v != null && isFinite(v)) out.push({ k, v: Math.max(0, Math.round(v)) }); }
    return out;
  }
  /* A regra da fixa para um valor qualquer: um dado de (valor − fixa) lados, mais a fixa. Fixa igual ao valor não
     rola dado. Mesmo formato do TC.dice.rollFixa, com o dado daqui (que é sorteado do mesmo jeito). */
  function rolarFixa(valor, fixa) {
    const a = Math.round(Number(valor) || 0);
    if (!(a >= 1)) return { ok: false, error: 'O valor está em 0: não há o que rolar.' };
    if (a > 100000) return { ok: false, error: 'O valor é grande demais.' };
    const f = clamp(Math.round(Number(fixa) || 0), 0, a), die = a - f, d = die > 0 ? rollDie(die) : 0;
    return { ok: true, atributo: a, fixa: f, die, dieValue: d, total: f + d };
  }
  // Como a rolagem saiu, em poucas palavras: "17 no d40 + 20", "14 no d60", "fixa total"
  const comoSaiu = r => (r.die ? `${r.dieValue} no d${r.die}${r.fixa ? ' + ' + r.fixa : ''}` : 'fixa total');
  // Como vai para a mesa (o mesmo texto das disputas da ficha, que o auditor dos dados sabe ler): "1d40 + 20, dado 17" | "fixo em 12"
  const comoFoi = r => (r.die ? `1d${r.die} + ${r.fixa}, dado ${r.dieValue}` : `fixo em ${r.atributo}`);
  const dadosDe = r => (r && r.die ? [[r.die, r.dieValue]] : []);

  /* ================= Ataque com defesa ================= */
  // As defesas que podem descontar um ataque: as duas gerais e as 13 específicas. Vazio fora do site (sem as regras da ficha).
  function listaDefesas() {
    const R = window.TC && window.TC.rules;
    if (!R || !R.DEFESAS || !R.DEFESAS_ESP) return [];
    return R.DEFESAS.map(d => ({ k: d.k, n: String(d.nome || d.k).replace(/^Defesa\s+/i, ''), g: 'geral' }))
      .concat(R.DEFESAS_ESP.map(d => ({ k: d.k, n: d.nome || d.k, g: d.tipo || 'elemento' })));
  }
  // "Física + Fogo" (na ordem da lista); vazio se nenhuma
  function nomeDasDefesas(chaves) {
    const quer = new Set(chaves || []);
    return listaDefesas().filter(d => quer.has(d.k)).map(d => d.n).join(' + ');
  }
  // A soma das defesas escolhidas de um token com ficha (nunca abaixo de zero); null se ele não tem ficha aqui.
  function defesaDe(t, chaves) {
    const d = Fichas.defesas(t);
    if (!d) return null;
    let soma = 0;
    for (const k of chaves || []) soma += Number(d[k]) || 0;
    return Math.max(0, Math.round(soma));
  }
  /* O dano que passa: o do ataque menos a defesa, e só então o mínimo e o máximo que o mestre definiu.
     min: nunca passa menos que isto (padrão 0); max: nunca passa mais que isto (null = sem teto). */
  function danoFinal(dano, defesa, min, max) {
    const lo = Math.max(0, Number(min) || 0);
    let f = (Number(dano) || 0) - (Number(defesa) || 0);
    if (f < lo) f = lo;
    if (max != null && isFinite(max) && f > Math.max(lo, max)) f = Math.max(lo, max);
    return Math.round(f * 10) / 10;
  }
  // A barra de um token pelo nome (só as que estão em uso)
  const barraDe = (t, nome) => t.bars.findIndex(b => b.on && b.n === nome);
  /* Aplica o ataque: tira de cada token o dano que passou, num passo só de desfazer. A sobrevida gasta primeiro.
     linhas: [{ t, final }]. Devolve [{ t, de, para, sobre }] com quem mudou. */
  function aplicarAtaque(linhas, barra, rotulo) {
    const out = [];
    Store.tx(rotulo || 'Ataque', () => {
      for (const l of linhas) {
        const t = Store.get('tokens', l.t.id), i = t ? barraDe(t, barra) : -1;
        if (i < 0 || !(l.final > 0)) continue;
        const b = t.bars[i], q = barAfter(b, -l.final);
        if (q.v === b.v && q.x === undefined) continue;
        Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? barWith(x, q) : x)) });
        out.push({ t, de: b.v, para: q.v, sobre: q.x !== undefined });
      }
    });
    return out;
  }
  // Quem não é dono vê os números desta barra? (é o que decide se o resultado de um ataque pode ir para a mesa)
  const barraAberta = (t, b) => !t.hidden && ((!!t.owner && (t.owner === '*' || !!playerById(t.owner))) || ((b && b.vis) || t.barVis) === 'num');

  /* ================= O grupo que chega ================= */
  /* n quadrados livres para tokens de tamanho 1, o mais perto possível do ponto (cx, cy): do centro para fora,
     pulando os ocupados e o que fica fora do mapa. Se o mapa não tem lugar, os que sobram ficam no centro. */
  function vagas(sc, n, cx, cy) {
    const cell = sc.cell, occ = new Set();
    for (const t of sc.tokens) {
      const s = Math.max(1, Math.ceil(t.size)), c0 = Math.floor((t.x + 1) / cell), r0 = Math.floor((t.y + 1) / cell);
      for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) occ.add((c0 + i) + ',' + (r0 + j));
    }
    const c0 = clamp(Math.floor(cx / cell), 0, Math.max(0, sc.cols - 1)), r0 = clamp(Math.floor(cy / cell), 0, Math.max(0, sc.rows - 1)), out = [];
    const maxRing = Math.max(sc.cols, sc.rows);
    for (let ring = 0; out.length < n && ring <= maxRing; ring++) {
      for (let dy = -ring; dy <= ring && out.length < n; dy++) {
        for (let dx = -ring; dx <= ring && out.length < n; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const c = c0 + dx, r = r0 + dy;
          if (c < 0 || r < 0 || c >= sc.cols || r >= sc.rows || occ.has(c + ',' + r)) continue;
          occ.add(c + ',' + r); out.push([c * cell, r * cell]);
        }
      }
    }
    while (out.length < n) out.push([c0 * cell, r0 * cell]);
    return out;
  }
  /* Os personagens da mesa, para a janela "Puxar o grupo": cada um com o dono (jogador da mesa ou null), o grupo
     da ficha e se já tem token nesta cena. */
  function elenco(sc) {
    const naCena = new Set(sc.tokens.map(t => t.char).filter(Boolean));
    return Fichas.chars().filter(l => l.ficha != null).map(l => {
      const dono = Fichas.donoDe(l);
      return { id: l.id, nome: l.nome || 'Sem nome', dono, grupo: String((l.ficha && l.ficha.grupo) || '').trim(), lado: String((l.ficha && l.ficha.lado) || ''), aqui: naCena.has(l.id), camp: Fichas.campDa(l) || '' };      // (camp: a campanha da ficha; '' = do mundo)
    });
  }
  /* Cria, num passo só de desfazer, um token para cada personagem pedido (os que já têm token nesta cena ficam de
     fora), em quadrados livres perto de (cx, cy). Devolve os ids dos tokens criados. */
  function trazer(ids, cx, cy, extra) {
    const sc = Store.scene(), ja = new Set(sc.tokens.map(t => t.char).filter(Boolean));
    const quer = ids.filter((id, i) => !ja.has(id) && ids.indexOf(id) === i && Fichas.get(id));
    if (!quer.length) return [];
    const pos = vagas(sc, quer.length, cx, cy), feitos = [];
    Store.tx(quer.length === 1 ? 'Trazer personagem' : 'Trazer o grupo', () => {
      quer.forEach((id, i) => {
        const t = Fichas.novoToken(sc, id, pos[i][0], pos[i][1], extra);
        if (!t) return;
        Store.add('tokens', t);
        feitos.push(t.id);
      });
    });
    // a imagem de cada ficha vai para o token dela (quem manda é a ficha: não entra no desfazer)
    for (const id of feitos) { const t = Store.get('tokens', id); if (t) { try { Fichas.syncToken(t); } catch (e) { console.error(e); } } }
    return feitos;
  }

  return {
    inTer, terrainAt, terrainOf, terText, terBadge, terDef, newTerrain, terPatch,
    fixaDoTurno, fixasDe, rolarFixa, comoSaiu, comoFoi, dadosDe,
    listaDefesas, nomeDasDefesas, defesaDe, danoFinal, barraDe, aplicarAtaque, barraAberta,
    vagas, elenco, trazer,
  };
})();
