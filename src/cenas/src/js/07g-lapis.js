/* ---------------------------------------------------------------
   7g. LÁPIS (lote 65) — o rabisco de agora, que todos na cena veem
   Como a caneta do Mapa-múndi: cada pessoa desenha por cima da cena, e a mesa inteira vê na hora. Dois jeitos: o traço
   que some sozinho em poucos segundos e o que fica até alguém limpar (cada um limpa os seus; o mestre, os de todos).
   É de todos (quem joga também), sem depender da permissão de desenhar: o rabisco não mexe na cena nem no desfazer dela.
   Os traços moram no mesmo documento da caneta do Mapa-múndi ("mundo:rabisco:<pessoa>", com ela como dona e a mesa
   inteira lendo — o banco já deixa cada um gravar o seu), marcados com a cena: mp = "cena:<id da cena>". Assim não
   precisa de nada novo no banco, e um não apaga o do outro (cada um regrava a lista inteira, com os traços do Mapa-múndi
   junto). Sem mesa, os traços ficam neste navegador.
   --------------------------------------------------------------- */
const Lapis = (() => {
  const PRE = 'mundo:rabisco:', LOCAL = 'tinycats:cenas:rabiscos', PREF = 'tinycats:cenas:lapis';
  const TEMPO_SOME = 8000, VELHO = 60000, MAX_TRACOS = 300, MAX_PTS_TRACO = 600, MAX_PTS_DOC = 20000;
  const CORES = ['#e6ab4f', '#f0786e', '#7fbf7a', '#7fb7e0', '#b39cf0', '#f2c14e', '#f3ead2', '#2a2118'];
  const idOk = k => typeof k === 'string' && k.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(k) && k !== '__proto__';
  const corOk = c => (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c : null);
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  let D = null, eu = null, naMesa = false, local = null, tLimpa = 0;
  const vistos = new Map();                    // id do traço → { n (pontos), t (quando mudou, aqui) }
  const ouvintes = [];
  const avisar = () => {
    for (const f of ouvintes) { try { f(); } catch (e) { console.error(e); } }
    if (typeof Render !== 'undefined') Render.request();
    if (typeof App !== 'undefined' && App.tool === 'lapis' && typeof UI !== 'undefined' && UI.refresh) UI.refresh();      // (as contas das opções)
  };

  function norm(v) {
    const out = [], ja = new Set();
    let pts = 0;
    for (const x of v && Array.isArray(v.t) ? v.t.slice(-MAX_TRACOS) : []) {
      if (!ehObj(x) || !idOk(x.id) || ja.has(x.id) || !idOk(x.mp) || !Array.isArray(x.p)) continue;
      const p = x.p.slice(0, MAX_PTS_TRACO).filter(q => Array.isArray(q) && isFinite(q[0]) && isFinite(q[1])).map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
      if (!p.length || pts + p.length > MAX_PTS_DOC) continue;
      ja.add(x.id); pts += p.length;
      out.push({ id: x.id, mp: x.mp, c: corOk(x.c) || CORES[0], s: x.s ? 1 : 0, em: isFinite(x.em) ? x.em : 0, p });
    }
    return out;
  }
  const lerJ = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const gravarJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
  const meuDoc = () => (naMesa ? (eu ? PRE + eu : null) : 'local');
  const cacheDoc = new WeakMap();
  const dosDados = l => { const d = l && !l.apagado && ehObj(l.dados) ? l.dados : null; if (!d) return []; if (!cacheDoc.has(d)) cacheDoc.set(d, norm(d)); return cacheDoc.get(d); };
  function docs() {
    if (!naMesa) { if (!local) local = { t: norm(lerJ(LOCAL)) }; return [{ dono: 'local', doc: 'local', t: local.t }]; }
    if (!D) return [];
    return D.todas().filter(l => typeof l.id === 'string' && l.id.startsWith(PRE) && idOk(l.id.slice(PRE.length)) && l.dono_id === l.id.slice(PRE.length))
      .map(l => ({ dono: l.id.slice(PRE.length), doc: l.id, t: dosDados(l) }));
  }
  function meus() { const id = meuDoc(); const d = id ? docs().find(x => x.doc === id) : null; return d ? d.t.slice() : []; }
  function gravar(t) {
    const id = meuDoc();
    if (!id) return;
    if (!naMesa) { local = { t }; gravarJ(LOCAL, { v: 1, t: t.filter(x => !x.s) }); }
    else D.gravar(id, { dados: { v: 1, t }, vis: 'mesa', dono_id: eu });
    avisar();
  }
  // o traço que some sai do documento de quem desenhou depois do tempo dele (os do Mapa-múndi também: o tempo é o mesmo)
  function agendarLimpeza() {
    clearTimeout(tLimpa);
    const t = meus().filter(x => x.s);
    if (!t.length) return;
    const prox = Math.min(...t.map(x => (x.em || 0) + TEMPO_SOME + 1500)) - Date.now();
    tLimpa = setTimeout(() => {
      const agora = Date.now(), ms = meus(), fica = ms.filter(x => !x.s || (x.em || 0) + TEMPO_SOME + 1000 > agora);
      if (fica.length !== ms.length) gravar(fica);
      agendarLimpeza();
    }, Math.max(500, prox));
  }
  const prefs = () => { const v = lerJ(PREF); return ehObj(v) ? v : {}; };
  const mpDe = cena => 'cena:' + cena;

  // a mesa (chamado pela Nuvem quando a cena abre dentro de uma mesa)
  function ligar(dados, quem) {
    D = dados; eu = quem || null; naMesa = !!D;
    if (D && D.aoMudar) D.aoMudar(l => { if (l && typeof l.id === 'string' && l.id.startsWith(PRE)) avisar(); });
  }
  // sem mesa: os traços que outra aba deste navegador deixou
  window.addEventListener('storage', ev => { if (!naMesa && (ev.key === LOCAL || ev.key === null)) { local = null; avisar(); } });

  const pode = () => !naMesa || !!eu;
  function modo(v) { if (v === 'some' || v === 'fica') { gravarJ(PREF, Object.assign(prefs(), { modo: v })); avisar(); return v; } return prefs().modo === 'fica' ? 'fica' : 'some'; }
  // a cor de quem desenha: a escolhida neste aparelho, senão a de quem joga (a da mesa), senão uma da lista
  function cor() {
    const c = corOk(prefs().cor);
    if (c) return c;
    const p = eu && typeof playerById === 'function' ? playerById(eu) : null;
    if (p && corOk(p.color)) return p.color;
    if (typeof isGM === 'function' && isGM()) return CORES[0];
    let h0 = 0;
    for (const ch of String(eu || 'local')) h0 = (h0 * 31 + ch.charCodeAt(0)) >>> 0;
    return CORES[h0 % (CORES.length - 2)];
  }
  function mudarCor(c) { if (corOk(c)) { gravarJ(PREF, Object.assign(prefs(), { cor: c })); avisar(); } }
  /* um traço: novo, ou o mesmo crescendo (parcial: ainda sendo desenhado) */
  function rabiscar(cena, tr, parcial) {
    if (!pode() || !cena || !tr || !idOk(tr.id) || !Array.isArray(tr.p) || !tr.p.length) return;
    const t = meus().filter(x => x.id !== tr.id), novo = { id: tr.id, mp: mpDe(cena), c: corOk(tr.c) || cor(), s: tr.s ? 1 : 0, em: Date.now(), p: tr.p.slice(0, MAX_PTS_TRACO) };
    t.push(novo);
    while (t.length > MAX_TRACOS) t.shift();
    vistos.set(novo.id, { n: novo.p.length, t: Date.now() });
    gravar(t);
    if (!parcial && novo.s) agendarLimpeza();
  }
  const quantosMeus = cena => meus().filter(x => x.mp === mpDe(cena)).length;
  function desfazer(cena) { const t = meus(); for (let i = t.length - 1; i >= 0; i--) if (t[i].mp === mpDe(cena)) { t.splice(i, 1); gravar(t); return true; } return false; }
  /* limpar: os meus traços nesta cena, ou (quem mestra) os de todos — o aviso deixa desfazer */
  function limpar(cena, todos, mestra) {
    const mp = mpDe(cena), antes = [];
    for (const d of docs()) {
      const mine = d.doc === meuDoc();
      if (!mine && !(todos && mestra)) continue;
      const fica = d.t.filter(x => x.mp !== mp);
      if (fica.length === d.t.length) continue;
      antes.push({ doc: d.doc, t: d.t });
      if (mine) gravar(fica); else if (D) D.gravar(d.doc, { dados: { v: 1, t: fica } });
    }
    if (!antes.length) return false;
    avisar();
    if (typeof UI !== 'undefined') UI.toast(todos && mestra ? 'Os rabiscos desta cena foram limpos (de todos).' : 'Os seus rabiscos nesta cena saíram.', { action: 'Desfazer', long: true, run: () => {
      for (const a of antes) {
        const volta = a.t.filter(x => x.mp === mp && !x.s);
        if (a.doc === meuDoc()) { const atual = meus(), ids = new Set(atual.map(x => x.id)); gravar(atual.concat(volta.filter(x => !ids.has(x.id)))); }
        else if (D) { const atual = dosDados(D.pegar(a.doc)), ids = new Set(atual.map(x => x.id)); D.gravar(a.doc, { dados: { v: 1, t: atual.concat(volta.filter(x => !ids.has(x.id))) } }); }
      }
      avisar();
    } });
    return true;
  }
  /* os traços de uma cena para desenhar: [{ id, c, s, p, idade }] — o que some, só enquanto ainda está no tempo */
  function daCena(cena) {
    const agora = Date.now(), mp = mpDe(cena), out = [];
    for (const d of docs()) for (const x of d.t) {
      if (x.mp !== mp) continue;
      let v = vistos.get(x.id);
      if (!v || v.n !== x.p.length) { v = { n: x.p.length, t: agora }; vistos.set(x.id, v); }
      if (x.s) {
        const idade = agora - v.t;
        if (idade >= TEMPO_SOME || (x.em && x.em < agora - VELHO)) continue;
        out.push({ id: x.id, c: x.c, s: 1, p: x.p, idade });
      } else out.push({ id: x.id, c: x.c, s: 0, p: x.p });
    }
    if (vistos.size > 4000) { const ids = new Set(); for (const d of docs()) for (const x of d.t) ids.add(x.id); for (const k of [...vistos.keys()]) if (!ids.has(k)) vistos.delete(k); }
    return out;
  }
  // o desenho, por cima de tudo (da névoa também: é um recado para a mesa); devolve se ainda há traço sumindo (animação)
  function desenhar(ctx, sc, px, rasc) {
    if (!sc) return false;
    const lista = daCena(sc.id);
    if (rasc && rasc.p.length) lista.push(rasc);
    if (!lista.length) return false;
    let anima = false;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const t of lista) {
      let a = 1;
      if (t.s && t.idade != null) { const resta = TEMPO_SOME - t.idade; a = resta < 1500 ? Math.max(0, resta / 1500) : 1; anima = true; }
      if (a <= 0) continue;
      ctx.beginPath();
      ctx.moveTo(t.p[0][0], t.p[0][1]);
      if (t.p.length === 1) ctx.lineTo(t.p[0][0] + 0.01, t.p[0][1]);
      for (let i = 1; i < t.p.length; i++) ctx.lineTo(t.p[i][0], t.p[i][1]);
      ctx.globalAlpha = a * 0.55; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 7 * px; ctx.stroke();
      ctx.globalAlpha = a; ctx.strokeStyle = t.c; ctx.lineWidth = 4 * px; ctx.stroke();
      if (t.s) { ctx.globalAlpha = a * 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2 * px; ctx.stroke(); }
    }
    ctx.restore();
    return anima;
  }
  return { ligar, pode, modo, cor, mudarCor, CORES, rabiscar, quantosMeus, desfazer, limpar, daCena, desenhar, TEMPO_SOME, aoMudar: f => ouvintes.push(f) };
})();
