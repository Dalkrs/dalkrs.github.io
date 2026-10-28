/* ---------------------------------------------------------------
   10g8. O ESCUDO DO MESTRE NAS CENAS (lote 31)
   · Os relógios de ameaça que o mestre mostra (o documento escudo:vista — o do mundo e o da campanha em vista): num
     cantinho do mapa, para todo mundo; o cantinho recolhe com um clique (lembrado neste aparelho).
   · A porta que abre com um puzzle: no painel da porta, o mestre a liga a um puzzle do Escudo; quando os jogadores
     resolvem o puzzle (pista:jogo:<id> com "resolvido"), o programa do mestre abre e destranca a porta — em qualquer
     cena dele —, uma vez só (pzOk), com um aviso que tem Desfazer.
   --------------------------------------------------------------- */
const EscudoCenas = (() => {
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const CORES = { vermelho: '#d4574e', ambar: '#e6ab4f', verde: '#5aa469', azul: '#5b8fd9', roxo: '#9a6ad8' };
  const NSV = 'http://www.w3.org/2000/svg';
  let D = null, el = null;
  let aberto = (() => { try { return localStorage.getItem('tinycats:cenas:relogios') !== '0'; } catch (e) { return true; } })();
  const ponteEstado = () => (window.TC && TC.ponte && TC.ponte.estado) || null;
  function vistas() {
    if (!D) return [];
    const est = ponteEstado(), camp = est && est.campanha ? est.campanha.id : null;
    const out = [];
    for (const id of ['escudo:vista'].concat(camp ? ['escudo:vista@' + camp] : [])) {
      const l = D.pegar(id);
      if (!l || l.apagado || !ehObj(l.dados) || !Array.isArray(l.dados.relogios)) continue;
      for (const r of l.dados.relogios.slice(0, 20)) {
        if (!ehObj(r) || typeof r.nome !== 'string') continue;
        const g = Math.max(2, Math.min(12, Math.round(Number(r.gomos) || 6)));
        out.push({ id: String(r.id || ''), nome: r.nome.slice(0, 60), gomos: g, cheio: Math.max(0, Math.min(g, Math.round(Number(r.cheio) || 0))), cor: CORES[r.cor] || CORES.vermelho, progresso: r.tipo === 'progresso' });
      }
    }
    return out;
  }
  function pizza(r, tam) {
    const s = document.createElementNS(NSV, 'svg');
    s.setAttribute('width', tam); s.setAttribute('height', tam); s.setAttribute('viewBox', '-26 -26 52 52'); s.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < r.gomos; i++) {
      const a0 = (i / r.gomos) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / r.gomos) * Math.PI * 2 - Math.PI / 2, R = 23;
      const p = document.createElementNS(NSV, 'path');
      p.setAttribute('d', 'M0 0L' + (R * Math.cos(a0)).toFixed(2) + ' ' + (R * Math.sin(a0)).toFixed(2) + 'A' + R + ' ' + R + ' 0 0 1 ' + (R * Math.cos(a1)).toFixed(2) + ' ' + (R * Math.sin(a1)).toFixed(2) + 'Z');
      p.setAttribute('fill', i < r.cheio ? r.cor : 'rgba(150,158,178,.22)'); p.setAttribute('stroke', '#12151c'); p.setAttribute('stroke-width', '1.6');
      s.append(p);
    }
    const c = document.createElementNS(NSV, 'circle');
    c.setAttribute('r', '23'); c.setAttribute('fill', 'none'); c.setAttribute('stroke', r.cor); c.setAttribute('stroke-width', '1.6');
    s.append(c);
    return s;
  }
  function pintarCanto() {
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (!el) { el = document.createElement('div'); el.className = 'relcanto'; el.id = 'relCanto'; stage.append(el); }
    const rs = vistas();
    el.hidden = !rs.length;
    if (!rs.length) { el.replaceChildren(); return; }
    const cab = h('button', { type: 'button', class: 'relcanto-h', id: 'relCantoAbre', 'aria-expanded': String(aberto), title: aberto ? 'Recolher os relógios' : 'Mostrar os relógios',
      onclick: () => { aberto = !aberto; try { localStorage.setItem('tinycats:cenas:relogios', aberto ? '1' : '0'); } catch (e) { /* sem armazenamento */ } pintarCanto(); } },
      'Relógios', h('span', { class: 'relcanto-n', text: String(rs.length) }));
    el.replaceChildren(cab, aberto ? h('div', { class: 'relcanto-l' }, rs.map(r => h('div', { class: 'relcanto-r' + (r.cheio >= r.gomos ? ' cheio' : ''), title: r.nome + ': ' + r.cheio + ' de ' + r.gomos, 'data-rel': r.id },
      pizza(r, 34), h('span', { class: 'relcanto-t' }, h('b', { text: r.nome }), h('small', { text: r.cheio + ' de ' + r.gomos }))))) : null);
  }

  /* ---- as portas que abrem com um puzzle ---- */
  // os puzzles do Escudo (para o painel da porta): [{ id, nome }]
  function puzzles() {
    if (!D) return [];
    const out = [];
    for (const l of D.todas()) {
      if (!l || l.apagado || typeof l.id !== 'string' || !l.id.startsWith('escudo:handout:') || !ehObj(l.dados) || l.dados.tipo !== 'puzzle') continue;
      out.push({ id: l.id.slice('escudo:handout:'.length), nome: String(l.dados.nome || 'Puzzle').slice(0, 80) });
    }
    return out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function nomeDoPuzzle(id) { const l = D && D.pegar('escudo:handout:' + id); return l && !l.apagado && ehObj(l.dados) ? String(l.dados.nome || 'Puzzle') : 'um puzzle'; }
  // os puzzles resolvidos: id do handout → { por, em }
  function resolvidos() {
    const out = {};
    if (!D) return out;
    for (const l of D.todas()) {
      if (!l || l.apagado || typeof l.id !== 'string' || !l.id.startsWith('pista:jogo:') || !ehObj(l.dados) || !ehObj(l.dados.resolvido)) continue;
      out[l.id.slice('pista:jogo:'.length).split('@')[0]] = l.dados.resolvido;
    }
    return out;
  }
  function resolvido(id) { return !!resolvidos()[id]; }
  let aplicando = false;
  function aplicarPortas() {
    if (aplicando || !D || !Nuvem.mestre()) return;
    const res = resolvidos();
    if (!Object.keys(res).length) return;
    const achadas = [];
    for (const id of Store.S.order) {
      const sc = Store.S.scenes[id];
      if (!sc || !Array.isArray(sc.walls)) continue;
      for (const w of sc.walls) if (w.pz && res[w.pz] && !w.pzOk) achadas.push({ sc: id, w: w.id, pz: w.pz, antes: { open: !!w.open, locked: !!w.locked } });
    }
    if (!achadas.length) return;
    aplicando = true;
    try {
      const cenas = [...new Set(achadas.map(a => a.sc))];
      for (const sid of cenas) {
        const daqui = achadas.filter(a => a.sc === sid);
        if (sid === Store.S.current) Store.tx('Porta aberta pelo puzzle', () => { for (const a of daqui) Store.upd('walls', a.w, { open: true, locked: false, pzOk: 1 }); });
        else { const sc = Store.S.scenes[sid]; for (const a of daqui) { const w = sc.walls.find(x => x.id === a.w); if (w) Object.assign(w, { open: true, locked: false, pzOk: 1 }); } Persist.scene(sid); }
      }
      UI.renderAll();
      const nomes = [...new Set(achadas.map(a => nomeDoPuzzle(a.pz)))];
      UI.toast((achadas.length === 1 ? 'A porta abriu' : achadas.length + ' portas abriram') + ': resolveram “' + nomes.join('”, “') + '”.', {
        long: true, action: 'Desfazer', run: () => {
          for (const sid of cenas) {
            const daqui = achadas.filter(a => a.sc === sid);
            if (sid === Store.S.current) Store.tx('Fechar a porta de novo', () => { for (const a of daqui) Store.upd('walls', a.w, a.antes); });
            else { const sc = Store.S.scenes[sid]; if (!sc) continue; for (const a of daqui) { const w = sc.walls.find(x => x.id === a.w); if (w) Object.assign(w, a.antes); } Persist.scene(sid); }
          }
          UI.renderAll();
        } });
    } finally { aplicando = false; }
  }

  function iniciar() {
    if (!(window.TC && TC.dados && TC.dados.disponivel && TC.dados.disponivel())) return;
    D = TC.dados.col('documentos');
    D.pronta.then(() => { pintarCanto(); aplicarPortas(); }, () => { /* sem os documentos */ });
    let tP = 0;
    D.aoMudar(l => {
      if (!l || typeof l.id !== 'string') return;
      if (l.id.startsWith('escudo:vista')) pintarCanto();
      if (l.id.startsWith('pista:jogo:')) { clearTimeout(tP); tP = setTimeout(aplicarPortas, 200); }
    });
    if (TC.ponte && TC.ponte.aoMudar) TC.ponte.aoMudar(() => pintarCanto());
  }
  return { iniciar, vistas, pintarCanto, puzzles, resolvido, aplicarPortas, nomeDoPuzzle };
})();
