/* ---------------------------------------------------------------
   10gw. AS ZONAS DESENHADAS À MÃO (lote 154) — o mestre arrasta retângulos na prévia do "Gerar um lugar…" e o gerador
   obedece:
     · Casa: onde fica a casa, e de que tamanho (a mansão, o casarão, o sob medida);
     · Sala: um cômodo da casa, com o uso (o quarto, a cozinha…); o que sobrar dentro da casa vira corredor; na masmorra,
       uma sala naquele lugar (o uso, o gerador decide);
     · Água (um lago), Mata (as árvores e os arbustos), Pátio (o chão de pedra, sem mato);
     · Vazio: a área fica sem nada (o mestre monta depois); na masmorra, nem sala nem corredor passam ali.
   As zonas ficam guardadas por lugar (App.opt.zonas[lugar]). A casa e as salas mudam o plano por dentro (o gerador lê
   o.zonas); a água, a mata, o pátio e o vazio, por fora (pos, depois de gerar), na Furtividade e no Sob medida; na
   masmorra, por dentro (10g2).
   --------------------------------------------------------------- */
const Zonas = (() => {
  const TIPOS = { casa: { n: 'Casa', cor: '#e6ab4f' }, sala: { n: 'Sala', cor: '#ffd34d' }, agua: { n: 'Água', cor: '#5bb4e6' }, mata: { n: 'Mata', cor: '#6cc46a' }, patio: { n: 'Pátio', cor: '#c9c2b4' }, vazio: { n: 'Vazio', cor: '#f05c4e' } };
  const CASA_OK = new Set(['mansao', 'casarao', 'sobmedida']);
  const tiposDe = id => (id === 'masmorra' ? ['sala', 'agua', 'vazio'] : CASA_OK.has(id) ? ['casa', 'sala', 'agua', 'mata', 'patio', 'vazio'] : ['agua', 'mata', 'patio', 'vazio']);
  const vale = L => !!L && (L.id === 'masmorra' || L.id === 'sobmedida' || Furtividade.IDS.includes(L.id));
  // os usos que uma sala da casa pode ter
  const USOS = () => [['', 'O gerador escolhe']].concat(['sala', 'vestibulo', 'quarto', 'quartoSenhor', 'cozinha', 'banheiro', 'despensa', 'escritorio', 'biblioteca', 'salao', 'galeria', 'capela', 'criados', 'deposito', 'misteriosa', 'secreta', 'corredor'].map(k => [k, PlantaAndares.NOMES[k] || (k === 'corredor' ? 'Corredor' : k)]));
  const limpa = l => (Array.isArray(l) ? l : []).filter(z => z && TIPOS[z.k] && [z.x, z.y, z.w, z.h].every(Number.isFinite) && z.w >= 1 && z.h >= 1).slice(0, 40)
    .map(z => Object.assign({ k: z.k, x: Math.round(z.x), y: Math.round(z.y), w: Math.round(z.w), h: Math.round(z.h) }, z.k === 'sala' && typeof z.papel === 'string' ? { papel: z.papel } : null));
  const de = id => { const t = App.opt.zonas && typeof App.opt.zonas === 'object' ? App.opt.zonas : {}; return limpa(t[id]); };
  const guarda = (id, l) => { const t = Object.assign({}, App.opt.zonas && typeof App.opt.zonas === 'object' ? App.opt.zonas : {}); t[id] = limpa(l); App.opt.zonas = t; };
  let estado = { ativo: false, tipo: 'casa', papel: '' };

  /* ---------------- para os geradores ---------------- */
  // a casa (ou null), presa entre os limites e com o tamanho mínimo
  function casa(o, lim) {
    const z = limpa(o && o.zonas).filter(x => x.k === 'casa').pop();
    if (!z) return null;
    const w = clamp(z.w, 8, lim.x1 - lim.x0), h = clamp(z.h, 7, lim.y1 - lim.y0);
    return { x: clamp(z.x, lim.x0, lim.x1 - w), y: clamp(z.y, lim.y0, lim.y1 - h), w, h };
  }
  // as salas desenhadas dentro da casa, em coordenadas da casa
  function salas(o, rect) {
    const out = [];
    for (const z of limpa(o && o.zonas).filter(x => x.k === 'sala')) {
      const x0 = Math.max(z.x, rect.x), y0 = Math.max(z.y, rect.y), x1 = Math.min(z.x + z.w, rect.x + rect.w), y1 = Math.min(z.y + z.h, rect.y + rect.h);
      if (x1 - x0 >= 2 && y1 - y0 >= 2) out.push({ x: x0 - rect.x, y: y0 - rect.y, w: x1 - x0, h: y1 - y0, papel: z.papel || '' });
    }
    return out.length ? out : null;
  }
  // a água, a mata, o pátio e o vazio, depois de gerar (no plano da Furtividade e do Sob medida)
  const FIXOS = new Set(['escada', 'alcapao', 'portao', 'chegada', 'alvoMissao', 'escadaMao']);
  function pos(p, zonas) {
    const zs = limpa(zonas).filter(z => ['agua', 'mata', 'patio', 'vazio'].includes(z.k));
    if (!zs.length || !p || !Array.isArray(p.objetos)) return p;
    const r = mulberry(((p.seed || 1) ^ 0x2b0e5) >>> 0);
    const dentro = (z, x, y, fw, fh) => x + (fw || 1) > z.x && y + (fh || 1) > z.y && x < z.x + z.w && y < z.y + z.h;
    // o que está dentro de uma casa (as salas) não sai: a zona é do lado de fora
    const naSala = (x, y) => (p.salas || []).some(q => x >= q.x && y >= q.y && x < q.x + q.w && y < q.y + q.h);
    const tira = (z, deixa) => {
      p.objetos = p.objetos.filter(o => FIXOS.has(o.id) || naSala(o.x, o.y) || !dentro(z, o.x, o.y, o.fw || o.s, o.fh || o.s) || (deixa && deixa(o)));
      if (z.k === 'vazio') { for (const k of ['npcs', 'marcas']) if (Array.isArray(p[k])) p[k] = p[k].filter(o => o.id === 'alvoMissao' || !dentro(z, o.x, o.y)); }
    };
    for (const z of zs) {
      if (z.k === 'vazio') { tira(z); continue; }
      if (z.k === 'agua') {
        tira(z);
        p.pintados.push({ k: 'lago', x: z.x, y: z.y, w: z.w, h: z.h });
        if (Array.isArray(p.relevo)) p.relevo.push({ t: 'agua', alt: -1, k: 'ell', x: z.x + 0.3, y: z.y + 0.3, w: z.w - 0.6, h: z.h - 0.6 });
        continue;
      }
      if (z.k === 'patio') {
        tira(z, o => !['arbusto', 'arvore', 'flores', 'pedra'].includes(o.id));
        p.pintados.push({ k: 'piso', x: z.x, y: z.y, w: z.w, h: z.h, tipo: 'calcada' });
        continue;
      }
      if (z.k === 'mata') {
        tira(z, o => !['flores'].includes(o.id));
        const ocup = new Set(); for (const o of p.objetos) ocup.add(Math.floor(o.x) + ',' + Math.floor(o.y));
        for (let y = z.y; y < z.y + z.h; y++) for (let x = z.x; x < z.x + z.w; x++) {
          if (ocup.has(x + ',' + y) || naSala(x, y) || r() > 0.42) continue;
          const id = r() < 0.45 ? 'arvore' : r() < 0.8 ? 'arbusto' : 'flores';
          if (Props.P[id]) { p.objetos.push({ id, x, y, s: 1 }); ocup.add(x + ',' + y); }
        }
      }
    }
    // os guardas parados dentro do vazio ou da água saem; as rondas que passam ficam (o mestre ajusta)
    if (Array.isArray(p.guardas)) p.guardas = p.guardas.filter(g => !((g.ronda && (g.ronda.pts || []).length <= 1) && zs.some(z => (z.k === 'vazio' || z.k === 'agua') && dentro(z, g.x, g.y))));
    return p;
  }

  /* ---------------- a prévia: os retângulos, o desenho ao vivo ---------------- */
  function desenhar(g, zonas, cell, vivo) {
    const zs = limpa(zonas).concat(vivo ? [vivo] : []);
    if (!zs.length) return;
    g.save();
    for (const z of zs) {
      const T = TIPOS[z.k] || TIPOS.vazio, x = z.x * cell, y = z.y * cell, w = z.w * cell, h = z.h * cell;
      g.fillStyle = T.cor + (z.k === 'vazio' ? '30' : '22'); g.fillRect(x, y, w, h);
      g.strokeStyle = T.cor; g.lineWidth = 2; g.setLineDash(z.k === 'sala' ? [5, 3] : []); g.strokeRect(x + 1, y + 1, w - 2, h - 2); g.setLineDash([]);
      const txt = z.k === 'sala' && z.papel ? (PlantaAndares.NOMES[z.papel] || z.papel) : T.n;
      g.font = '600 11px system-ui, sans-serif'; g.textBaseline = 'top';
      const tw = g.measureText(txt).width + 8;
      g.fillStyle = 'rgba(12,12,16,0.8)'; g.fillRect(x + 3, y + 3, tw, 16);
      g.fillStyle = T.cor; g.fillText(txt, x + 7, y + 5);
    }
    g.restore();
  }
  /* Prende o desenho no canvas da prévia: com o modo ligado, arrastar cria uma zona. ponto(e): o mouse em quadrados;
     redesenhar(vivo): repinta a prévia (com o retângulo ao vivo); pronto(): a zona entrou (gerar de novo). */
  function prender(cv, ponto, lugarDe, redesenhar, pronto) {
    let ini = null, vivo = null;
    const rect = (a, b) => ({ k: estado.tipo, x: Math.floor(Math.min(a[0], b[0])), y: Math.floor(Math.min(a[1], b[1])), w: Math.max(1, Math.ceil(Math.max(a[0], b[0])) - Math.floor(Math.min(a[0], b[0]))), h: Math.max(1, Math.ceil(Math.max(a[1], b[1])) - Math.floor(Math.min(a[1], b[1]))) });
    cv.addEventListener('pointerdown', e => {
      if (!estado.ativo || e.button !== 0) return;
      e.preventDefault(); e.stopImmediatePropagation();
      ini = ponto(e); vivo = null; cv.setPointerCapture(e.pointerId);
    }, true);
    cv.addEventListener('pointermove', e => {
      if (!estado.ativo) return;
      e.stopImmediatePropagation();
      if (!ini) return;
      vivo = Object.assign(rect(ini, ponto(e)), estado.tipo === 'sala' && estado.papel ? { papel: estado.papel } : null);
      redesenhar(vivo);
    }, true);
    // (lote 157) a zona debaixo do mouse (a de cima, a última desenhada)
    const zonaEm = (id, [x, y]) => { const l = de(id); for (let i = l.length - 1; i >= 0; i--) { const z = l[i]; if (x >= z.x && y >= z.y && x < z.x + z.w && y < z.y + z.h) return i; } return -1; };
    const tirar = (id, i) => { const l = de(id), z = l[i]; l.splice(i, 1); guarda(id, l); pronto(); UI.toast(`Zona tirada: ${(TIPOS[z.k] || {}).n || 'zona'}.`, { key: 'zonas', action: 'Desfazer', run: () => { guarda(id, de(id).concat([z])); pronto(); } }); };
    const fim = e => {
      if (!estado.ativo || !ini) return;
      e.stopImmediatePropagation();
      const z = vivo, p0 = ini; ini = null; vivo = null;
      const id = lugarDe();
      if (z && z.w >= 2 && z.h >= 2) {
        // (lote 157) a casa é uma só: a nova fica no lugar da de antes
        const l = z.k === 'casa' ? de(id).filter(x => x.k !== 'casa') : de(id);
        guarda(id, l.concat([z])); pronto();
        if (de(id).length === 1) UI.toast('Para tirar uma zona: clique nela (com "Desenhar" ligado), clique com o botão direito, ou use o × da lista.', { key: 'zonas', long: true });
        return;
      }
      // um clique (sem arrastar) numa zona: tira
      const i = zonaEm(id, p0);
      if (i >= 0) tirar(id, i); else redesenhar(null);
    };
    // o botão direito numa zona tira (com ou sem o desenho ligado)
    cv.addEventListener('contextmenu', e => { const id = lugarDe(), i = zonaEm(id, ponto(e)); if (i < 0) return; e.preventDefault(); e.stopImmediatePropagation(); tirar(id, i); }, true);
    cv.addEventListener('pointerup', fim, true);
    cv.addEventListener('pointercancel', fim, true);
    cv.addEventListener('click', e => { if (estado.ativo) e.stopImmediatePropagation(); }, true);
  }

  /* ---------------- os controles (o bloco "Zonas") ---------------- */
  function controles(L, K, mudou) {
    const id = L.id, tipos = tiposDe(id), zs = de(id);
    if (!tipos.includes(estado.tipo)) estado.tipo = tipos[0];
    const set = o => { Object.assign(estado, o); mudou(false); };
    return h('div', { class: 'ger-zonas', id: 'ger-zonas' },
      K.toggle('ger-zonas-on', estado.ativo, v => set({ ativo: v }), 'Desenhar na prévia (arraste para criar; clique numa zona para tirar)'),
      estado.ativo ? K.field('O que desenhar', K.seg('ger-zonas-tipo', estado.tipo, tipos.map(k => [k, TIPOS[k].n]), v => set({ tipo: v })), 'stack') : null,
      estado.ativo && estado.tipo === 'sala' && id !== 'masmorra' ? K.field('O uso da sala', K.inSelect('ger-zonas-uso', estado.papel, USOS(), v => set({ papel: v })), 'stack') : null,
      zs.length ? h('ul', { class: 'list ger-zonas-l' }, zs.map((z, i) => h('li', { class: 'ger-zl' },
        h('span', { class: 'ger-zl-cor', style: { background: TIPOS[z.k].cor } }),
        h('span', { class: 'ger-zl-n', text: (z.k === 'sala' && z.papel ? (PlantaAndares.NOMES[z.papel] || z.papel) : TIPOS[z.k].n) + ` · ${z.w} × ${z.h}` }),
        h('button', { type: 'button', class: 'and-x', id: 'ger-zl-x-' + i, 'aria-label': 'Tirar a zona', onclick: () => { const l = de(id); l.splice(i, 1); guarda(id, l); mudou(true); } }, '×')))) : null,
      zs.length ? h('div', { class: 'row' }, K.btn('Tirar todas', () => { guarda(id, []); mudou(true); }, { kind: 'small', id: 'ger-zonas-limpar' })) : null,
      K.note(id === 'masmorra' ? 'Sala: uma sala naquele lugar. Água: o chão vira água. Vazio: nem sala nem corredor passam ali.'
        : CASA_OK.has(id) ? 'Casa: onde a casa fica, e o tamanho. Sala: um cômodo dentro dela (o resto vira corredor). Água, Mata e Pátio mudam o terreno; Vazio fica sem nada.'
          : 'Água, Mata e Pátio mudam o terreno; Vazio fica sem nada. (A casa e as salas valem na mansão, no casarão e no sob medida.)'));
  }
  const resumoBloco = L => { const n = de(L.id).length; return n ? n + (n === 1 ? ' zona' : ' zonas') : 'nenhuma'; };
  return { TIPOS, tiposDe, vale, de, guarda, limpa, casa, salas, pos, desenhar, prender, controles, resumoBloco, estado: () => estado, ativo: () => estado.ativo, desligar() { estado.ativo = false; } };
})();
