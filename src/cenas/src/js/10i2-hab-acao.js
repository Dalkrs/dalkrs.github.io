/* ---------------------------------------------------------------
   10i2. AS HABILIDADES AGEM NO MAPA (lote 185)
   Quando alguém usa uma habilidade no painel de barras, o que ela faz vem de TC.habsAcoes (gerado do texto das
   árvores, por nível — tc/habs-acoes.js) e acontece no mapa:
     · a mira: a habilidade de alvo ou de lugar põe o mapa em modo de mira (o alcance em volta de quem usa e o desenho
       da área no cursor); clicar escolhe, Esc ou o botão direito cancelam (e a barra não é gasta);
     · a de área em volta e a "em você" agem na hora, sem mira;
     · o que ela faz: a zona no chão (com os turnos), as invocações (as cópias do personagem, nos clones), mover
       (empurrar, puxar, saltar, trocar de lugar), as condições (com os turnos) e o Dano ou a Cura;
     · o teste ("escapa quem passar num teste de Vigor"): a janela Resolver, do mestre, mostra cada alvo com os botões
       de rolar o atributo pela ficha e Passou / Falhou; a condição só entra em quem falhou;
     · o Dano e a Cura: a janela tem um campo para cada alvo, com o tier escrito ("Dano tier III"): quem mestra
       decide o número (a régua de quanto vale o tier ainda é com o Bruno);
     · no aparelho do jogador: o que é só dele (a zona, a invocação comum, a condição e o salto do próprio token) vale
       na hora; o resto (os alvos, os clones, o dano) vai como pedido ao mestre, que vê a mesma janela e aplica.
   Sem regra para a habilidade (o texto que o gerador não leu), ela continua como antes (gasta a barra e conta na mesa).
   --------------------------------------------------------------- */
const HabAcao = (() => {
  const A = () => (window.TC && window.TC.habsAcoes) || null;
  const COR = '#e6ab4f';
  const NOME_TESTE = { vigor: 'Vigor (FOR ou VIT)', candes: 'CAN ou DES', CAN: 'CAN', DES: 'DES', VIT: 'VIT', FOR: 'FOR', AGI: 'AGI' };
  const ATR_TESTE = { vigor: ['FOR', 'VIT'], candes: ['CAN', 'DES'], CAN: ['CAN'], DES: ['DES'], VIT: ['VIT'], FOR: ['FOR'], AGI: ['AGI'] };
  const ROM = ['', 'I', 'II', 'III', 'IV', 'V'];
  let mira = null;                     // { ator, tok, h, sp, fazer, p (o cursor) }
  const fila = [];                     // os pedidos dos jogadores esperando a janela
  let janelaAberta = false;

  const tirarAviso = () => { for (const x of document.querySelectorAll('.toast[data-k="hab-mira"]')) x.remove(); };
  const specDe = h => { const a = A(); return a && h && h.id ? formaGrande(h, a.de(h.id, h.grau || 1)) : null; };
  /* (lote 193) a forma grande (TC.formas.grande): Transformado e Agigantado em quem usa, pelos mesmos turnos (sem número,
     até alguém tirar). Quando o texto ("Vira urso: … garras de Dano tier III") virou um golpe num alvo, ele vira a forma
     em você: as garras são da forma, não um ataque na hora de vestir. fg marca as duas condições como da forma. */
  function formaGrande(h, sp) {
    const fm = window.TC && window.TC.formas;
    if (!fm || !fm.grande || !fm.grande(h.id)) return sp;
    const o = Object.assign({}, sp || {}), c = (o.c || []).slice(), tf = c.find(x => x[0] === 'transformado');
    if (!tf && (o.m === 'alvo' || !o.m)) { delete o.d; delete o.q; delete o.al; delete o.mx; o.m = 'si'; }
    const tur = tf ? tf[1] : fm.turnosDe(h.desc || '');
    if (!tf) c.push(['transformado', tur, null, 's']);
    if (!c.some(x => x[0] === 'agigantado')) c.push(['agigantado', tur, null, 's']);
    o.c = c; o.fg = 1;
    return o;
  }
  const temAcao = h => !!specDe(h);
  const cellsDe = sc => sc.cell;
  const centro = (t, sc) => { const [x, y] = tokC(t, sc); return [x, y]; };
  const meio = (t, sc) => (Math.max(1, t.size || 1) * sc.cell) / 2;
  const nomeDe = t => (t ? tokName(t) : '?');
  const ladoDe = t => (typeof PainelBarras !== 'undefined' && PainelBarras.deJogador ? PainelBarras.deJogador(t) : !!(t && t.owner));

  /* ---------------- a geometria: a área do efeito (o mesmo objeto da zona, para usar FX.geom) ---------------- */
  function areaDe(sp, de, x, y, sc) {
    const [cx, cy] = centro(de, sc), r = Math.max(0.5, Number(sp.r) || 1), dir = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    if (sp.m === 'volta') return { k: 'circ', x: cx, y: cy, r: r + (Math.max(1, de.size || 1) - 1) / 2, w: 1, ang: 60, dir: 0 };
    if (sp.f === 'cone') return { k: 'cone', x: cx, y: cy, r, w: 1, ang: 60, dir };
    if (sp.f === 'line') {
      if (sp.al > 0) {   // a parede: atravessada no lugar clicado
        const d2 = dir + 90, rr = d2 * Math.PI / 180, L = r * sc.cell / 2;
        return { k: 'line', x: x - Math.cos(rr) * L, y: y - Math.sin(rr) * L, r, w: 1, ang: 60, dir: d2 };
      }
      return { k: 'line', x: cx, y: cy, r, w: 1, ang: 60, dir };
    }
    if (sp.f === 'circ') return { k: 'circ', x, y, r, w: 1, ang: 60, dir: 0 };
    return null;
  }
  function dentro(area, sc, de, sp) {
    if (!area) return [];
    const g = FX.geom(Object.assign({ token: null }, area), sc);
    let l = tokensIn(g.path, sc).filter(t => !t.hidden || isGM());
    const meuLado = ladoDe(de);
    if (sp.q === 'i') l = l.filter(t => t.id !== de.id && ladoDe(t) !== meuLado);
    else if (sp.q === 'a') l = l.filter(t => ladoDe(t) === meuLado);
    else l = l.filter(t => t.id !== de.id || sp.m === 'volta' && sp.q === 'a');
    l = l.filter(t => !t.clone || t.id === de.id);
    if (sp.mx > 0) { const [cx, cy] = centro(de, sc); l.sort((a, b) => Math.hypot(...centro(a, sc).map((v, i) => v - [cx, cy][i])) - Math.hypot(...centro(b, sc).map((v, i) => v - [cx, cy][i]))); l = l.slice(0, sp.mx); }
    return l;
  }
  const alcancePx = (sp, de, sc) => (sp.al >= 30 ? Infinity : (Math.max(1, sp.al || 1) + 0.5) * sc.cell + meio(de, sc));

  /* ---------------- começar: com mira ou na hora ---------------- */
  /* ator, t (o token de quem usa), h (a habilidade: { id, nome, grau, custo, desc }), fazer() gasta a barra e conta na
     mesa. → true se a habilidade é desta regra (quem chamou não faz mais nada). */
  function comecar(ator, t, b, h, fazer) {
    const sp = specDe(h), sc = Store.scene();
    if (!sp || !t || !sc) return false;
    if (h.patamar && b.v < h.patamar) return false;                     // o painel avisa (exige o patamar)
    if (!h.inverso && h.custo > b.v) return false;                     // o painel avisa (falta barra)
    if (sp.m === 'alvo' || sp.m === 'ponto') {
      cancelar(true);
      mira = { ator, tok: t.id, h, sp, fazer, p: null };
      UI.toast(`${h.nome}: ${sp.m === 'alvo' ? 'clique no alvo' : 'clique no lugar'}${sp.al && sp.al < 30 ? ' (até ' + sp.al + ' cédula' + (sp.al === 1 ? '' : 's') + ')' : ''}. Esc cancela.`, { key: 'hab-mira', long: true });
      Render.request();
      return true;
    }
    const [x, y] = centro(t, sc);
    fazer();
    planejar({ de: t, h, sp, x, y, alvo: null });
    return true;
  }
  function cancelar(quieto) {
    if (!mira) return false;
    mira = null; Render.request(); tirarAviso();
    if (!quieto) UI.toast('Habilidade cancelada: a barra não foi gasta.', { key: 'hab-mira' });
    return true;
  }
  // o clique no mapa, com a mira ligada → true (o clique é da mira)
  function clique(p) {
    if (!mira) return false;
    const sc = Store.scene(), de = Store.get('tokens', mira.tok);
    if (!sc || !de) { cancelar(); return true; }
    const { sp, h } = mira, [cx, cy] = centro(de, sc);
    let x = p.x, y = p.y, alvo = null;
    if (sp.m === 'alvo') {
      const ht = Tools.hitTest(p, { tokensOnly: true, noProps: true });
      alvo = ht ? Store.get('tokens', ht.id) : null;
      if (!alvo) { UI.toast('Clique num token (ou Esc para cancelar).', { key: 'hab-mira' }); return true; }
      [x, y] = centro(alvo, sc);
      const lim = alcancePx(sp, de, sc) + meio(alvo, sc);
      if (Math.hypot(x - cx, y - cy) > lim) { UI.toast(`Longe demais: ${h.nome} alcança ${sp.al} cédula${sp.al === 1 ? '' : 's'}.`, { key: 'hab-mira' }); return true; }
    } else if (sp.al > 0 && Math.hypot(x - cx, y - cy) > alcancePx(sp, de, sc)) {
      UI.toast(`Longe demais: ${h.nome} alcança ${sp.al} cédula${sp.al === 1 ? '' : 's'}.`, { key: 'hab-mira' }); return true;
    }
    const m = mira; mira = null; Render.request(); tirarAviso();
    m.fazer();
    planejar({ de, h: m.h, sp: m.sp, x, y, alvo });
    return true;
  }
  function mover(p) { if (mira) { mira.p = { x: p.x, y: p.y }; Render.request(); } }
  document.addEventListener('keydown', e => { if (mira && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelar(); } }, true);

  // o desenho da mira: o alcance em volta de quem usa, a área no cursor e quem ela pega
  function desenhar(ctx, px, sc) {
    if (!mira) return;
    const de = sc.tokens.find(t => t.id === mira.tok);
    if (!de) { mira = null; return; }
    const { sp } = mira, [cx, cy] = centro(de, sc);
    ctx.save();
    const R = alcancePx(sp, de, sc);
    if (isFinite(R)) {
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU);
      ctx.fillStyle = hexA(COR, 0.07); ctx.fill();
      ctx.strokeStyle = hexA(COR, 0.85); ctx.lineWidth = 2 * px; ctx.setLineDash([8 * px, 6 * px]); ctx.stroke(); ctx.setLineDash([]);
    }
    const p = mira.p;
    if (p) {
      const fora = sp.al > 0 && Math.hypot(p.x - cx, p.y - cy) > R;
      if (sp.m === 'alvo') {
        const ht = Tools.hitTest(p, { tokensOnly: true, noProps: true }), t = ht ? sc.tokens.find(x => x.id === ht.id) : null;
        if (t) { const [tx, ty] = centro(t, sc); ctx.beginPath(); ctx.arc(tx, ty, meio(t, sc) + 4 * px, 0, TAU); ctx.strokeStyle = fora ? '#ff6b5b' : COR; ctx.lineWidth = 3 * px; ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p.x, p.y); ctx.strokeStyle = hexA(fora ? '#ff6b5b' : COR, 0.7); ctx.lineWidth = 1.5 * px; ctx.stroke();
      } else {
        const area = areaDe(sp, de, p.x, p.y, sc);
        if (area) {
          const g = FX.geom(Object.assign({ token: null }, area), sc);
          ctx.fillStyle = hexA(fora ? '#ff6b5b' : COR, 0.22); ctx.fill(g.path);
          ctx.strokeStyle = fora ? '#ff6b5b' : COR; ctx.lineWidth = 2 * px; ctx.stroke(g.path);
          for (const t of dentro(area, sc, de, sp)) { const [tx, ty] = centro(t, sc); ctx.beginPath(); ctx.arc(tx, ty, meio(t, sc) + 3 * px, 0, TAU); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * px; ctx.stroke(); }
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, sc.cell * 0.45, 0, TAU); ctx.strokeStyle = fora ? '#ff6b5b' : COR; ctx.lineWidth = 2.5 * px; ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  /* ---------------- o plano: quem pega, o que faz ---------------- */
  function planejar({ de, h, sp, x, y, alvo }) {
    const sc = Store.scene();
    const area = sp.m === 'volta' || sp.f ? areaDe(sp, de, x, y, sc) : null;
    let alvos = [];
    if (sp.m === 'alvo' && alvo) alvos = [alvo];
    else if (area && (sp.d || sp.cu || (sp.c || []).some(c => c[3] === 'a') || (sp.mv && sp.mv.k !== 'salta') || sp.lp)) alvos = dentro(area, sc, de, sp);
    const plano = { de: de.id, hab: { id: h.id, nome: h.nome, grau: h.grau || 1, texto: String(h.desc || '').split('\n')[0] }, sp, x: Math.round(x), y: Math.round(y), area, alvos: alvos.map(t => t.id) };
    if (isGM()) return decidir(plano, null);
    // o jogador: o que é só dele vale agora; o resto vai ao mestre
    const local = soMeu(plano, de);
    if (local) aplicar(plano, padrao(plano), { soLocal: true });
    if (precisaMestre(plano)) {
      const ok = typeof Nuvem !== 'undefined' && Nuvem.usarHab && Nuvem.usarHab({ t: 'hab', de: de.id, hab: plano.hab, x: plano.x, y: plano.y, alvos: plano.alvos });
      UI.toast(ok ? `${h.nome}: o pedido foi para o mestre.` : `${h.nome}: o mestre aplica na mesa (a cena precisa estar no ar).`, { key: 'hab-ped' });
    }
  }
  const soMeu = (pl, de) => !!(pl.sp.z || (pl.sp.inv && !pl.sp.inv.clone) || (pl.sp.c || []).some(c => c[3] === 's') || (pl.sp.mv && pl.sp.mv.k === 'salta'));
  const precisaMestre = pl => !!(pl.alvos.length || (pl.sp.inv && pl.sp.inv.clone));
  // precisa da janela: teste, dano ou cura em alguém, ou um pedido de jogador
  const precisaJanela = pl => !!(pl.alvos.length && (pl.sp.d || pl.sp.cu || (pl.sp.c || []).some(c => c[2] && c[3] === 'a') || pl.sp.lp || escolhas(pl.sp).length));
  /* (lote 195) a escolha: as condições marcadas com 'e' (o 5º campo) são opções, e o alvo leva só sp.um delas (1, se não
     disser) — a agulha cravada "num ponto à escolha". A janela traz marcadas as primeiras; marcar outra desmarca a mais antiga. */
  const escolhas = sp => (sp && sp.c || []).filter(c => c[3] === 'a' && c[4] === 'e').map(c => c[0]);
  const condsPadrao = sp => { const es = escolhas(sp), lim = Math.max(1, sp.pad || sp.um || 1);   // pad: quantas vêm marcadas (o Ponto Vital 2 deixa 2, mas começa com 1)
    return (sp.c || []).filter(c => c[3] === 'a' && (c[4] !== 'e' || es.indexOf(c[0]) < lim)).map(c => c[0]); };

  // o que vem marcado na janela
  function padrao(pl) {
    const sp = pl.sp, sc = Store.scene(), o = { zona: !!sp.z, inv: !!sp.inv, mv: !!sp.mv, si: (sp.c || []).filter(c => c[3] === 's').map(c => c[0]), alvos: {} };
    for (const id of pl.alvos) {
      const t = sc.tokens.find(x => x.id === id);
      if (!t) continue;
      o.alvos[id] = { on: true, falhou: true, n: '', conds: condsPadrao(sp), lp: !!sp.lp };
    }
    return o;
  }

  /* ---------------- a janela Resolver (do mestre) ---------------- */
  function decidir(pl, quem) {
    if (!precisaJanela(pl) && !quem) return aplicar(pl, padrao(pl));
    if (janelaAberta) { fila.push({ pl, quem }); UI.toast(`Mais uma habilidade esperando: ${pl.hab.nome}.`, { key: 'hab-fila' }); return; }
    abrirJanela(pl, quem);
  }
  function abrirJanela(pl, quem, esc0) {
    const sc = Store.scene(), de = sc.tokens.find(t => t.id === pl.de), sp = pl.sp, esc = esc0 || padrao(pl);
    if (!de) return;
    janelaAberta = true;
    const linhas = [], tierTxt = sp.d ? 'Dano tier ' + ROM[sp.d] : sp.cu ? 'Cura tier ' + ROM[sp.cu] : '';
    const condTxt = id => (COND_BY_ID[id] || {}).n || id;
    const temTeste = (sp.c || []).find(c => c[2] && c[3] === 'a');
    for (const id of pl.alvos) {
      const t = sc.tokens.find(x => x.id === id), e = esc.alvos[id];
      if (!t || !e) continue;
      const nIn = tierTxt ? h('input', { class: 'in num ha-n', type: 'number', min: 0, max: 999, step: 1, placeholder: tierTxt, value: e.n || '', 'aria-label': tierTxt + ' em ' + nomeDe(t), oninput: ev => { e.n = ev.target.value; } }) : null;
      const res = h('span', { class: 'ha-res', text: e.disp || '' });
      // (lote 185) a mesma Disputa do mestre (tecla C): quem usou × o alvo; quem perder sofre
      const disp = typeof Luta !== 'undefined' && Luta.disputa ? h('button', { type: 'button', class: 'btn sm ha-disp', text: 'Disputa', title: `Abre a Disputa: ${nomeDe(de)} × ${nomeDe(t)}`, onclick: () => {
        Luta.disputa([Store.get('tokens', de.id), Store.get('tokens', id)].filter(Boolean), { titulo: `Disputa · ${pl.hab.nome}`, aoFechar: r => {
          if (r) { const ganhou = r.a.total > r.b.total; e.falhou = ganhou; e.disp = `${ganhou ? nomeDe(de) : nomeDe(t)} venceu (${r.a.total} × ${r.b.total})`; }
          abrirJanela(pl, quem, esc);
        } });
      } }) : null;
      const teste = temTeste ? h('div', { class: 'ha-teste' },
        h('span', { class: 'ha-tl', text: 'Teste de ' + NOME_TESTE[temTeste[2]] + ':' }),
        ...(ATR_TESTE[temTeste[2]] || []).map(k => (Fichas.podeRolar && Fichas.podeRolar(t) ? h('button', { type: 'button', class: 'btn ghost sm', text: 'Rolar ' + k, onclick: () => {
          const r = Fichas.rolar(t, k, Fichas.fixaPadrao(t));
          res.textContent = r && r.ok !== false && r.total != null ? `${k}: ${r.total}` : (r && r.error) || 'Não deu para rolar.';
        } }) : null)),
        res,
        h('label', { class: 'cl-op' }, h('input', { type: 'radio', name: 'ha-t-' + id, checked: e.falhou, onchange: () => { e.falhou = true; } }), h('span', { text: 'Falhou' })),
        h('label', { class: 'cl-op' }, h('input', { type: 'radio', name: 'ha-t-' + id, checked: !e.falhou, onchange: () => { e.falhou = false; } }), h('span', { text: 'Passou' }))) : null;
      const todasC = (sp.c || []).filter(c => c[3] === 'a').map(c => c[0]);
      const cs = todasC.length ? h('div', { class: 'ha-conds' }, ...todasC.map(cid => h('label', { class: 'cl-op' }, h('input', { type: 'checkbox', checked: e.conds.includes(cid), onchange: ev => {
        e.conds = ev.target.checked ? e.conds.concat(cid) : e.conds.filter(x => x !== cid);
        // (lote 195) a escolha: passou do limite, a mais antiga sai (e a caixa dela desmarca)
        const es = escolhas(sp);
        if (ev.target.checked && es.includes(cid)) {
          const lim = Math.max(1, sp.um || 1), marcadas = e.conds.filter(x => es.includes(x));
          if (marcadas.length > lim) { const sai = marcadas[0]; e.conds = e.conds.filter(x => x !== sai); const cx = ev.target.closest('.ha-conds').querySelector(`input[data-cid="${sai}"]`); if (cx) cx.checked = false; }
        }
      }, 'data-cid': cid }), h('span', { text: (escolhas(sp).includes(cid) ? '◇ ' : '') + condTxt(cid) + ((sp.c.find(c => c[0] === cid) || [])[1] ? ' (' + sp.c.find(c => c[0] === cid)[1] + ' t)' : '') })))) : null;
      linhas.push(h('div', { class: 'ha-alvo' },
        h('label', { class: 'cl-op ha-nome' }, h('input', { type: 'checkbox', checked: e.on, onchange: ev => { e.on = ev.target.checked; } }), h('b', { text: nomeDe(t) })),
        disp, temTeste ? null : (e.disp ? h('span', { class: 'ha-res', text: e.disp }) : null), nIn, teste, cs,
        sp.lp ? h('label', { class: 'cl-op' }, h('input', { type: 'checkbox', checked: e.lp, onchange: ev => { e.lp = ev.target.checked; } }), h('span', { text: 'Tirar as condições ruins' })) : null));
    }
    const extra = [];
    if (sp.z) extra.push(h('label', { class: 'cl-op' }, h('input', { type: 'checkbox', checked: esc.zona, onchange: ev => { esc.zona = ev.target.checked; } }), h('span', { text: `Pôr a zona ${(FX.P[sp.z.fx] || {}).n || sp.z.fx} (${sp.z.t} turno${sp.z.t === 1 ? '' : 's'})` })));
    if (sp.inv) extra.push(h('label', { class: 'cl-op' }, h('input', { type: 'checkbox', checked: esc.inv, onchange: ev => { esc.inv = ev.target.checked; } }), h('span', { text: sp.inv.clone ? `Pôr ${sp.inv.n} clone${sp.inv.n === 1 ? '' : 's'} de ${nomeDe(de)} (${sp.inv.t} turnos)` : `Pôr ${sp.inv.n} × ${sp.inv.nome} (${sp.inv.t} turnos)` })));
    if (sp.mv) extra.push(h('label', { class: 'cl-op' }, h('input', { type: 'checkbox', checked: esc.mv, onchange: ev => { esc.mv = ev.target.checked; } }), h('span', { text: { empurra: `Empurrar ${sp.mv.d} cédula${sp.mv.d === 1 ? '' : 's'} (quem falhar no teste)`, puxa: `Puxar ${sp.mv.d} cédula${sp.mv.d === 1 ? '' : 's'}`, salta: `${nomeDe(de)} vai até o lugar`, troca: 'Trocar de lugar' }[sp.mv.k] })));
    for (const cid of (sp.c || []).filter(c => c[3] === 's').map(c => c[0])) extra.push(h('label', { class: 'cl-op' }, h('input', { type: 'checkbox', checked: esc.si.includes(cid), onchange: ev => { esc.si = ev.target.checked ? esc.si.concat(cid) : esc.si.filter(x => x !== cid); } }), h('span', { text: `${condTxt(cid)} em ${nomeDe(de)}` })));
    const fechar = () => { janelaAberta = false; const prox = fila.shift(); if (prox) setTimeout(() => abrirJanela(prox.pl, prox.quem), 60); };
    UI.modal({
      title: `${pl.hab.nome}${pl.hab.grau > 1 ? ' (nível ' + pl.hab.grau + ')' : ''} — ${nomeDe(de)}`,
      cls: 'ha-janela',
      body: h('div', { class: 'ha-box' },
        quem ? h('p', { class: 'ha-ped', text: `Pedido de ${(playerById(quem) || {}).name || 'um jogador'}.` }) : null,
        pl.hab.texto ? h('p', { class: 'ha-txt', text: pl.hab.texto }) : null,
        linhas.length ? h('div', { class: 'ha-alvos' }, ...linhas) : h('p', { class: 'ha-vazio', text: 'Nenhum alvo na área.' }),
        extra.length ? h('div', { class: 'ha-extra' }, ...extra) : null,
        tierTxt ? h('p', { class: 'ha-nota', text: `${tierTxt}: escreva quanto foi em cada alvo (vazio não muda a Vida).` }) : null),
      actions: [{ label: quem ? 'Recusar' : 'Cancelar', run: () => { fechar(); } }, { label: 'Aplicar', kind: 'primary', run: () => { aplicar(pl, esc); fechar(); } }],
      onCancel: fechar,
    });
  }

  /* ---------------- aplicar: um passo de desfazer ---------------- */
  function aplicar(pl, esc, o = {}) {
    const sc = Store.scene(), de = sc && sc.tokens.find(t => t.id === pl.de);
    if (!sc || !de) return;
    const sp = pl.sp, cell = sc.cell, vez = sc.turn && Array.isArray(sc.turn.list) ? sc.turn.list.find(e => e.token === de.id) : null;
    const quem = de.owner && de.owner !== '*' ? de.owner : null, local = !!o.soLocal;
    let clones = 0;
    const limites = [];                                     // (lote 195) contadores que chegaram ao máximo
    Store.tx(pl.hab.nome, () => {
      // a zona no chão
      if (esc.zona && sp.z && pl.area) {
        const a = pl.area;
        Store.add('effects', { id: uid('fx'), fx: FX.P[sp.z.fx] ? sp.z.fx : 'fogo', k: a.k, x: a.x, y: a.y, r: a.r, w: a.w || 1, rw: 3, rh: 2, ang: a.ang || 60, dir: a.dir || 0, pow: 0.8,
          token: null, gm: false, by: quem || undefined, pb: true, seed: Math.floor(Math.random() * 99998) + 1, dur: clamp(sp.z.t || 1, 1, 20), dur0: clamp(sp.z.t || 1, 1, 20), at: vez ? vez.id : null, apply: null });
      } else if (esc.zona && sp.z && !pl.area) {
        Store.add('effects', { id: uid('fx'), fx: FX.P[sp.z.fx] ? sp.z.fx : 'fogo', k: 'circ', x: pl.x, y: pl.y, r: Math.max(0.5, Number(sp.r) || 1), w: 1, rw: 3, rh: 2, ang: 60, dir: 0, pow: 0.8,
          token: null, gm: false, by: quem || undefined, pb: true, seed: Math.floor(Math.random() * 99998) + 1, dur: clamp(sp.z.t || 1, 1, 20), dur0: clamp(sp.z.t || 1, 1, 20), at: vez ? vez.id : null, apply: null });
      }
      // a invocação comum: no lugar clicado (ou em volta de quem usa)
      if (esc.inv && sp.inv && !sp.inv.clone) {
        const n = clamp(sp.inv.n || 1, 1, 6), tam = [0.5, 1, 2].includes(sp.inv.tam) ? sp.inv.tam : 1;
        const [bx, by] = sp.m === 'ponto' ? [pl.x, pl.y] : centro(de, sc);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * TAU + 0.6, dist = n > 1 ? cell * (0.8 + tam / 2) : 0;
          const bars = barDefaults().map((b, j) => (j === 0 && sp.inv.vida > 0 ? Object.assign({}, b, { v: sp.inv.vida, m: sp.inv.vida, on: true }) : Object.assign({}, b, { on: false })));
          const [sx, sy] = snapPt(sc, bx + Math.cos(ang) * dist - tam * cell / 2, by + Math.sin(ang) * dist - tam * cell / 2, false, 1);
          Store.add('tokens', newToken(sc, sx, sy, { name: String(sp.inv.nome).slice(0, 40), color: sp.inv.cor, size: tam, owner: quem, bars, barVis: sp.inv.vida > 0 ? 'bar' : 'none',
            inv: { d: clamp(sp.inv.t || 3, 1, 20), at: vez ? vez.id : null, de: de.id } }));
        }
      }
      // você: as condições em quem usou
      const condEm = (t, cid, tur, n, forma) => {
        const t0 = Store.get('tokens', t.id) || t, conds = t0.conds.includes(cid) ? t0.conds : t0.conds.concat(cid), info = Object.assign({}, t0.cinfo);
        const cur = Object.assign({}, info[cid]);
        if (tur > 0) { cur.d = tur; cur.d0 = tur; }
        if (forma) cur.f = 1;                              // (lote 193) da forma: sai com ela
        const cd = COND_BY_ID[cid];
        if (n > 0) cur.n = cd && cd.max ? Math.min(cd.max, (cur.n || 0) + n) : (cur.n || 0) + n;
        if (n > 0 && cd && cd.max && cd.lim && cd.lim.em === 'max' && cur.n >= cd.max) limites.push([t0.id, cd]);   // (lote 195)
        if (Object.keys(cur).length) info[cid] = cur;
        Store.upd('tokens', t0.id, { conds, cinfo: info });
      };
      for (const cid of esc.si || []) { const c = (sp.c || []).find(x => x[0] === cid); condEm(de, cid, c ? c[1] : 1, 0, !!sp.fg && (cid === 'transformado' || cid === 'agigantado')); }
      // mover quem usou (o salto, o bote: para perto do alvo)
      if (esc.mv && sp.mv && sp.mv.k === 'salta') {
        const s = Math.max(1, de.size || 1), [cx, cy] = centro(de, sc);
        let tx = pl.x, ty = pl.y;
        const alvo = pl.alvos.length === 1 && sp.m === 'alvo' ? sc.tokens.find(t => t.id === pl.alvos[0]) : null;
        if (alvo) { const [ax, ay] = centro(alvo, sc), d = Math.hypot(ax - cx, ay - cy) || 1, perto = meio(alvo, sc) + s * cell / 2; tx = ax - (ax - cx) / d * perto; ty = ay - (ay - cy) / d * perto; }
        const [nx, ny] = snapPt(sc, tx - s * cell / 2, ty - s * cell / 2, false, 1);
        Store.upd('tokens', de.id, { x: clamp(nx, 0, sc.cols * cell - s * cell), y: clamp(ny, 0, sc.rows * cell - s * cell) });
      }
      if (local) return;
      // os alvos
      for (const id of pl.alvos) {
        const e = esc.alvos[id], t = Store.get('tokens', id);
        if (!e || !e.on || !t) continue;
        // o Dano e a Cura: o número que o mestre escreveu
        const n = Math.round(Number(String(e.n).replace(',', '.')) || 0);
        if (n > 0 && (sp.d || sp.cu)) {
          const vida = barraDaVida(t.bars), i = vida ? t.bars.indexOf(vida) : -1;
          if (i >= 0) { const q = barAfter(t.bars[i], sp.cu && !sp.d ? n : -n); Store.upd('tokens', t.id, { bars: t.bars.map((x, j) => (j === i ? barWith(x, q) : x)) }); }
        }
        if (e.lp) {
          const t2 = Store.get('tokens', id), ruins = new Set(['veneno', 'sangue', 'hemorragia', 'fogo', 'gelo', 'cego', 'medo', 'abalado', 'maldicao', 'confuso', 'enfeiticado', 'preso', 'lento', 'fraco', 'vulneravel', 'atordoado', 'paralisia', 'sonolento', 'adormecido', 'silencio', 'doente']);
          const info = Object.assign({}, t2.cinfo); for (const k of Object.keys(info)) if (ruins.has(k)) delete info[k];
          Store.upd('tokens', id, { conds: t2.conds.filter(c => !ruins.has(c)), cinfo: info });
        }
        const testa = (sp.c || []).some(c => c[2] && c[3] === 'a');
        if (testa && !e.falhou) continue;                   // passou no teste: nem a condição nem o empurrão
        for (const cid of e.conds || []) { const c = (sp.c || []).find(x => x[0] === cid); condEm(t, cid, c ? c[1] : 1, cid === 'sangue' || (COND_BY_ID[cid] || {}).max ? 1 : 0); }
        if (esc.mv && sp.mv && (sp.mv.k === 'empurra' || sp.mv.k === 'puxa')) empurrar(sc, de, Store.get('tokens', id), sp.mv.k === 'empurra' ? sp.mv.d : -sp.mv.d);
        if (esc.mv && sp.mv && sp.mv.k === 'troca') { const a = Store.get('tokens', de.id), b = Store.get('tokens', id); Store.upd('tokens', a.id, { x: b.x, y: b.y }); Store.upd('tokens', b.id, { x: a.x, y: a.y }); }
      }
    });
    for (const [tid, cd] of limites) setTimeout(() => { if (UI.sugerirLimite) UI.sugerirLimite(tid, cd); }, 80);   // (lote 195) Agulhas no Corpo chegou a 3: o teste e o Corpo Travado
    // os clones: as cópias do personagem (o sistema de Clone), com a condição durando os turnos da habilidade
    if (!local && esc.inv && sp.inv && sp.inv.clone) {
      const t = Store.get('tokens', de.id);
      if (t && !t.clone) {
        const r = Act.cloneCriar(t, clamp(sp.inv.n || 1, 1, MAX_CLONES), Math.max(2, Math.min(10, sp.al || 3)), false);
        clones = r.n || 0;
        const t2 = Store.get('tokens', de.id);
        if (clones && t2) Act.condSet(t2, 'clone', { d: clamp(sp.inv.t || 2, 1, 20) }, 'Clone: a duração');
        if (!clones) UI.toast(`Não há lugar livre perto de ${nomeDe(de)} para os clones.`);
      }
    }
    Render.request();
  }
  // empurra (d > 0) ou puxa (d < 0) o token na linha de quem usou, de cédula em cédula, sem atravessar parede
  function empurrar(sc, de, t, d) {
    if (!t || !d) return;
    const cell = sc.cell, [cx, cy] = centro(de, sc), [tx, ty] = centro(t, sc), L = Math.hypot(tx - cx, ty - cy) || 1;
    const ux = (tx - cx) / L, uy = (ty - cy) / L, s = Math.max(1, t.size || 1), passos = Math.abs(d), sinal = Math.sign(d);
    let x = tx, y = ty;
    for (let k = 0; k < passos; k++) {
      const nx = x + ux * cell * sinal, ny = y + uy * cell * sinal;
      if (sinal < 0 && Math.hypot(nx - cx, ny - cy) < meio(de, sc) + s * cell / 2) break;          // puxar: para colado
      if (Walls.blocksMove(sc, x, y, nx, ny)) break;
      x = nx; y = ny;
    }
    const [px0, py0] = snapPt(sc, x - s * cell / 2, y - s * cell / 2, false, 1);
    Store.upd('tokens', t.id, { x: clamp(px0, 0, sc.cols * cell - s * cell), y: clamp(py0, 0, sc.rows * cell - s * cell) });
  }

  /* ---------------- (lote 188) as formas: a imagem do token na transformação ----------------
     A ficha guarda a imagem de cada habilidade de transformação (ficha.formas[id]). Usou a habilidade: o token troca de
     imagem e fica Transformado (pelos turnos do texto; sem número, até alguém tirar). Quando a condição sai (o prazo, à
     mão, ou o Encerrar do combate), acertarCondicoes devolve a imagem de antes (t.tf). */
  const F = () => (window.TC && window.TC.formas) || null;
  function urlDaForma(t, h) {
    if (!t || !t.char || !h || !h.id || typeof Fichas === 'undefined') return null;
    const l = Fichas.get(t.char), fm = l && l.ficha && F() ? F().normFormas(l.ficha.formas) : {};
    return fm[h.id] || null;
  }
  const temForma = (t, h) => !!urlDaForma(t, h);
  function turnosDaForma(h) {
    const sp = specDe(h), c = sp && (sp.c || []).find(x => x[0] === 'transformado');
    if (c && c[1] > 0 && c[1] < 10) return c[1];
    return F() ? F().turnosDe(h.desc || '') : 0;
  }
  function forma(tokId, h) {
    const sc = Store.scene(), t = sc && sc.tokens.find(x => x.id === tokId), url = urlDaForma(t, h);
    if (!t || !url) return false;
    if (!isGM()) {
      if (typeof Nuvem !== 'undefined' && Nuvem.usarHab) Nuvem.usarHab({ t: 'hab', de: t.id, hab: { id: h.id, nome: h.nome, grau: h.grau || 1, texto: String(h.desc || '').split('\n')[0] }, forma: 1, alvos: [] });
      return true;
    }
    vestir(t, h, url);
    return true;
  }
  function vestir(t, h, url) {
    const a = Assets.register(url, 0, 0, 'token', h.nome || 'Forma'), tur = turnosDaForma(h);
    const tf = t.tf && typeof t.tf === 'object' ? t.tf : { img: t.img || null, imgChar: !!t.imgChar };
    const info = Object.assign({}, t.cinfo), cur = Object.assign({}, info.transformado);
    if (tur > 0) { cur.d = tur; cur.d0 = tur; } else { delete cur.d; delete cur.d0; }
    if (Object.keys(cur).length) info.transformado = cur; else delete info.transformado;
    Store.tx('Forma: ' + (h.nome || ''), () => Store.upd('tokens', t.id, { img: a.id, imgChar: false, tf: Object.assign({}, tf, { h: h.id }), conds: t.conds.includes('transformado') ? t.conds : t.conds.concat('transformado'), cinfo: info }));
  }

  /* ---------------- o pedido de um jogador, no aparelho do mestre ---------------- */
  // op = { t: 'hab', de: token, hab: { id, nome, grau, texto }, x, y, alvos }
  function pedidoDe(quem, op, sc) {
    if (!op || typeof op.de !== 'string' || !op.hab || typeof op.hab.id !== 'string') return false;
    const de = sc.tokens.find(t => t.id === op.de);
    if (!de || !(de.owner === quem || de.owner === '*')) return false;              // só o token dele
    // (lote 188) a forma: a imagem da ficha dele, na hora (sem janela)
    if (op.forma) { const u = urlDaForma(de, { id: op.hab.id }); if (u) setTimeout(() => vestir(Store.get('tokens', de.id) || de, { id: op.hab.id, nome: String(op.hab.nome || 'Forma').slice(0, 60), desc: String(op.hab.texto || '') }, u), 0); return !!u; }
    const grau = clamp(Math.floor(Number(op.hab.grau) || 1), 1, 9), sp = A() && A().de(op.hab.id, grau);
    if (!sp) return false;
    const x = typeof op.x === 'number' && isFinite(op.x) ? op.x : centro(de, sc)[0], y = typeof op.y === 'number' && isFinite(op.y) ? op.y : centro(de, sc)[1];
    const alvos = (Array.isArray(op.alvos) ? op.alvos : []).filter(id => typeof id === 'string' && sc.tokens.some(t => t.id === id && !t.hidden)).slice(0, 12);
    const nome = String(op.hab.nome || 'Habilidade').slice(0, 60), texto = String(op.hab.texto || '').slice(0, 400);
    const area = sp.m === 'volta' || sp.f ? areaDe(sp, de, x, y, sc) : null;
    // o que já valeu no aparelho do jogador (a zona, a invocação comum, o que é dele) não se repete
    const sp2 = Object.assign({}, sp); delete sp2.z; if (sp2.inv && !sp2.inv.clone) delete sp2.inv; if (sp2.mv && sp2.mv.k === 'salta') delete sp2.mv; sp2.c = (sp.c || []).filter(c => c[3] === 'a');
    const pl = { de: de.id, hab: { id: op.hab.id, nome, grau, texto }, sp: sp2, x, y, area, alvos };
    if (!pl.alvos.length && !(sp2.inv && sp2.inv.clone)) return false;
    setTimeout(() => decidir(pl, quem), 0);
    return true;
  }

  // as formas com imagem que o personagem do token tem (para virar pelo menu: a Pele de Raposa, que não gasta barra)
  function formasDoToken(t) {
    if (!t || !t.char || typeof Fichas === 'undefined' || !F()) return [];
    const l = Fichas.get(t.char), fm = l && l.ficha ? F().normFormas(l.ficha.formas) : {}, ids = Object.keys(fm), out = [];
    if (!ids.length) return out;
    const arvs = l.skills && Array.isArray(l.skills.arvores) ? l.skills.arvores : [];
    for (const aid of arvs) {
      const a = Fichas.arvore ? Fichas.arvore(aid) : null;
      for (const n of (a && a.nodes) || []) if (ids.includes(n.id)) {
        const tx = (n.graus || []).map(g => (g && g.texto) || '').join(' ');
        out.push({ id: n.id, nome: /_o$/.test(n.id) ? ((/^([^:]{3,40}):/.exec(tx) || [, n.nome])[1]) : n.nome, desc: tx });
      }
    }
    return out;
  }
  return { formasDoToken, forma, temForma, comecar, cancelar, clique, mover, desenhar, ativa: () => !!mira, temAcao, specDe, pedidoDe, aplicar, padrao, planejar, _plano: o => planejar(o) };
})();
