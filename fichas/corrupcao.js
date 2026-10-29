/* Tiny Cats · Fichas: a corrupção (lote 37).
   A ficha corrompida por uma linhagem — vampírica, licantropa ou demoníaca —, em cinco estágios: a corrupção invade o
   resumo da ficha pelas bordas (as veias, as garras, as rachaduras), toma o retrato e, nos últimos estágios, a ficha
   inteira; sem tapar os números. A conta do estágio está em tc/corrupcao.js.
   Quem mestra as Fichas escolhe o tipo e a árvore que conta, e ajusta o estágio (a demoníaca é só à mão), no painel
   lilás em cima da ficha. O dono vê a corrupção do próprio personagem (e, quando o estágio sobe, a ficha pulsa e
   avisa); os outros jogadores não a recebem. */
const FichasCorr = (() => {
  'use strict';
  const C = () => (window.TC && window.TC.corrupcao) || null;
  const mestreAqui = () => !FichasMesa.ativo() || FichasMesa.mestre();
  const bibAqui = () => (typeof S !== 'undefined' && S.bib && Array.isArray(S.bib.arvores) ? S.bib : null);
  const cfgAqui = () => (typeof S !== 'undefined' ? S.cfg : null);
  const reduz = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function estadoDe(pc) {
    const c = C(), d = pc ? FichasMesa.corrDe(pc) : null;
    return c && d ? c.estado(d, pc.skills || {}, bibAqui(), cfgAqui()) : null;
  }

  /* ---------------- os desenhos (num quadro de 1000 × 300, esticado sobre o resumo) ---------------- */
  // [o estágio em que aparece, o caminho]
  const VEIAS = [
    [1, 'M0,0 Q40,40 90,22 T170,70'], [2, 'M0,10 Q26,70 70,110 T130,150'], [2, 'M1000,300 Q930,262 880,286 T790,226'],
    [3, 'M0,0 Q70,12 120,60 T250,40 T330,92'], [3, 'M1000,300 Q955,210 890,190 T810,110'], [4, 'M1000,0 Q960,60 982,120 T930,212'],
    [4, 'M0,300 Q60,250 40,190 T110,120'], [5, 'M420,0 Q440,40 410,72 T444,140'], [5, 'M1000,150 Q930,160 900,118 T820,140'], [5, 'M240,300 Q260,250 230,220 T280,170'],
  ];
  // as garras: três riscos paralelos (x, y de cima, comprimento, inclinação)
  const GARRAS = [[1, 930, 10, 90, 18], [2, 70, 200, 80, -14], [3, 900, -10, 330, 60], [4, 140, -10, 240, -40], [5, 560, 160, 160, 30]];
  const RACHAS = [
    [1, 'M0,300 L38,262 L30,240 L56,214'], [2, 'M1000,300 L962,262 L976,240 L944,210 L952,186'], [3, 'M200,300 L222,268 L206,250 L236,226 L228,200 L262,170'],
    [3, 'M0,150 L40,160 L58,138 L92,146'], [4, 'M1000,120 L962,132 L950,110 L916,118 L902,96'], [4, 'M620,300 L640,262 L624,244 L660,216'],
    [5, 'M420,300 L436,250 L412,226 L446,190 L432,160 L470,128'], [5, 'M760,0 L748,40 L772,62 L752,100'],
  ];
  // as runas (pequenos traços) e as brasas
  const RUNAS = ['M0,0 L0,14 M0,4 L6,0 M0,8 L6,4', 'M0,0 L0,14 M0,0 L6,4 L0,8', 'M3,0 L3,14 M0,4 L6,8', 'M0,14 L3,0 L6,14 M1,8 L5,8', 'M0,0 L6,14 M6,0 L0,14', 'M0,7 L3,0 L6,7 L3,14 Z'];
  function svgDe(tipo, n) {
    let corpo = '';
    if (tipo === 'vamp') {
      corpo = VEIAS.filter(v => v[0] <= n).map(v => `<path class="cv" d="${v[1]}"/>`).join('');
    } else if (tipo === 'lica') {
      for (const [e, x, y, l, inc] of GARRAS) {
        if (e > n) continue;
        for (let k = 0; k < 3; k++) {
          const dx = k * 22, x2 = x + dx + inc, y2 = y + l;
          corpo += `<path class="cg-f" d="M${x + dx},${y} L${x2},${y2}"/><path class="cg" d="M${x + dx},${y} L${x2},${y2}"/>`;
        }
      }
      if (n >= 3) corpo += '<g class="cp" transform="translate(40 228) scale(.5) rotate(-20)"><circle cx="20" cy="15" r="8"/><circle cx="40" cy="5" r="9"/><circle cx="60" cy="5" r="9"/><circle cx="80" cy="15" r="8"/><path d="M35,35 Q50,20 65,35 Q70,55 50,60 Q30,55 35,35 Z"/></g>';
    } else if (tipo === 'demo') {
      corpo = RACHAS.filter(r => r[0] <= n).map(r => `<path class="cr" d="${r[1]}"/>`).join('');
      if (n >= 3) corpo += [[90, 250], [300, 276], [700, 262], [880, 240], [520, 284], [960, 200]].slice(0, n + 1).map(([x, y], i) => `<circle class="cb" style="animation-delay:${(i * 0.7).toFixed(1)}s" cx="${x}" cy="${y}" r="2.2"/>`).join('');
      if (n >= 4) corpo += RUNAS.concat(RUNAS).map((d, i) => `<path class="cu" transform="translate(${360 + i * 26} 10)" d="${d}"/>`).join('');
    }
    return `<svg class="corr-fx" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true" focusable="false">${corpo}</svg>`;
  }

  /* ---------------- o painel de quem mestra ---------------- */
  function htmlBarra(pc) {
    const c = C();
    if (!c || !pc || !mestreAqui()) return '';
    const conf = c.normConf(FichasMesa.corrDe(pc)), e = estadoDe(pc), T = conf.tipo ? c.TIPOS[conf.tipo] : null;
    const seg = [['', 'Nenhuma']].concat(c.ORDEM.map(k => [k, c.TIPOS[k].nome]));
    const arvs = T && !T.manual ? c.arvoresParaEscolher(bibAqui(), pc.skills) : [];
    const arvNome = id => { const a = arvs.find(x => x.id === id); return a ? a.nome : 'nenhuma árvore'; };
    const linha2 = !e ? 'O efeito aparece para o dono do personagem e para você; os outros jogadores não o veem.'
      : e.manual ? 'A demoníaca é à mão: use − e + para mudar o estágio.'
      : `${e.pts} ${e.pts === 1 ? 'ponto' : 'pontos'} em ${esc(arvNome(conf.arv))}${e.prox != null ? ' · o próximo estágio com ' + e.prox : ' · no fim da escala'}${e.ajuste ? ' · ajuste ' + (e.ajuste > 0 ? '+' : '−') + Math.abs(e.ajuste) : ''}`;
    return `<div class="corr-barra${T ? ' corr-' + conf.tipo : ''}" id="corrBarra" role="group" aria-label="Corrupção (só quem mestra vê este painel)">
      <span class="corr-so" title="Só quem mestra vê este painel">Só o mestre</span>
      <strong class="corr-tit">Corrupção</strong>
      <div class="corr-seg" role="radiogroup" aria-label="O tipo de corrupção">${seg.map(([k, nome]) => `<button type="button" role="radio" data-corrtipo="${k}" aria-checked="${(conf.tipo || '') === k}">${nome}</button>`).join('')}</div>
      ${T && !T.manual ? `<label class="corr-arv"><span class="sr">A árvore que conta</span><select id="corrArv" title="A árvore cujos pontos gastos fazem a corrupção crescer">
        ${conf.arv ? '' : '<option value="" selected>Escolha a árvore…</option>'}${arvs.map(a => `<option value="${esc(a.id)}" ${a.id === conf.arv ? 'selected' : ''}>${esc(a.nome)}${a.linhagem ? '' : ' (não é de linhagem)'}${a.equipada ? '' : ' (não equipada)'}</option>`).join('')}</select></label>` : ''}
      ${e ? `<div class="corr-dir"><div class="corr-est"><b>Estágio ${e.n} <small>de ${c.MAX}</small>${e.n ? ' · ' + esc(e.nome) : ''}</b><span>${linha2}</span></div>
        <span class="corr-pm"><button type="button" class="step" data-corrpm="-1" aria-label="${e.manual ? 'Um estágio a menos' : 'Ajuste: um estágio a menos'}" ${e.n <= 0 ? 'disabled' : ''}>−</button><button type="button" class="step" data-corrpm="1" aria-label="${e.manual ? 'Um estágio a mais' : 'Ajuste: um estágio a mais'}" ${e.n >= c.MAX ? 'disabled' : ''}>+</button></span></div>`
        : `<span class="corr-dica">${linha2}</span>`}
    </div>`;
  }
  // a etiqueta da corrupção no resumo (o dono e quem mestra)
  function htmlEtiqueta(pc) {
    const e = estadoDe(pc), c = C();
    if (!e || !e.n) return '';
    return `<span class="corr-chip corr-${e.tipo}" title="${esc(c.rotulo(e))}">${esc(c.TIPOS[e.tipo].nome)} · ${esc(e.nome)} <small>${e.n}/${c.MAX}</small></span>`;
  }

  function mudar(pc, rotulo, fn) {
    const c = C(), antes = FichasMesa.corrDe(pc), novo = c.normConf(JSON.parse(JSON.stringify(antes || {})));
    if (fn(novo) === false) return;
    const vazio = !novo.tipo;
    FichasMesa.gravarCorr(pc, vazio ? null : novo);
    if (!FichasMesa.ativo()) save();
    renderFicha();
    const e = estadoDe(pc);
    FichasExtras.aviso(rotulo + (e ? ' Agora: estágio ' + e.n + (e.n ? ' (' + e.nome + ')' : '') + '.' : ''), 'Desfazer', () => {
      FichasMesa.gravarCorr(pc, antes ? JSON.parse(JSON.stringify(antes)) : null);
      if (!FichasMesa.ativo()) save();
      renderFicha();
    });
  }
  function ligarBarra(host, pc) {
    const c = C(), bar = host.querySelector('#corrBarra');
    if (!c || !bar) return;
    bar.querySelectorAll('[data-corrtipo]').forEach(b => b.onclick = () => {
      const k = b.dataset.corrtipo || null;
      mudar(pc, k ? 'Corrupção ' + c.TIPOS[k].curto + ' em ' + (pc.nome || 'o personagem') + '.' : 'Sem corrupção em ' + (pc.nome || 'o personagem') + '.', x => {
        if ((x.tipo || null) === k) return false;
        x.tipo = k;
        if (k && !c.TIPOS[k].manual && !x.arv) x.arv = c.arvorePadrao(bibAqui(), pc.skills, k);
      });
    });
    const sel = bar.querySelector('#corrArv');
    if (sel) sel.onchange = () => mudar(pc, 'A árvore da corrupção mudou.', x => { if (x.arv === (sel.value || null)) return false; x.arv = sel.value || null; });
    bar.querySelectorAll('[data-corrpm]').forEach(b => b.onclick = () => {
      const d = +b.dataset.corrpm;
      mudar(pc, d > 0 ? 'A corrupção avançou um estágio.' : 'A corrupção recuou um estágio.', x => {
        if (!x.tipo) return false;
        if (c.TIPOS[x.tipo].manual) { const n = Math.max(0, Math.min(c.MAX, x.estagio + d)); if (n === x.estagio) return false; x.estagio = n; }
        else { const e = c.estado(x, pc.skills || {}, bibAqui(), cfgAqui()); if ((d < 0 && e.n <= 0) || (d > 0 && e.n >= c.MAX)) return false; x.ajuste = Math.max(-c.AJUSTE, Math.min(c.AJUSTE, x.ajuste + d)); }
      });
    });
  }

  /* ---------------- o efeito na ficha ---------------- */
  const CLASSES = ['corr-vamp', 'corr-lica', 'corr-demo', 'corr-e1', 'corr-e2', 'corr-e3', 'corr-e4', 'corr-e5', 'corr-tomada'];
  function aplicar(host, pc) {
    host.classList.remove(...CLASSES);
    const e = estadoDe(pc);
    const resumo = host.querySelector('#resumo');
    if (resumo) resumo.querySelectorAll('.corr-fx').forEach(x => x.remove());
    ligarBarra(host, pc);
    if (!e || !e.n) return;
    host.classList.add('corr-' + e.tipo, 'corr-e' + e.n);
    if (e.n >= 4) host.classList.add('corr-tomada');
    if (resumo) resumo.insertAdjacentHTML('afterbegin', svgDe(e.tipo, e.n));
    // o retrato: o tom da corrupção (a imagem é tingida); sem imagem, a partir do estágio 3, os olhos
    const q = host.querySelector('.retrato .quadro');
    if (q) {
      q.classList.add('corr-q', 'corr-' + e.tipo, 'corr-e' + e.n);
      if (e.n >= 3 && !q.querySelector('img')) q.insertAdjacentHTML('beforeend', '<span class="olhos" aria-hidden="true"><i></i><i></i></span>');
    }
    momento(host, pc, e);
  }
  /* Quando o estágio sobe, o dono vê a ficha pulsar (2 segundos) e um aviso. A conta do "já vi" fica neste aparelho. */
  function momento(host, pc, e) {
    if (mestreAqui()) return;
    const k = 'tinycats:corr:visto:' + (FichasMesa.ativo() && window.TC && TC.ponte && TC.ponte.estado && TC.ponte.estado.mesa ? TC.ponte.estado.mesa.id : 'local') + ':' + pc.id;
    let antes = null;
    try { antes = localStorage.getItem(k); localStorage.setItem(k, String(e.n)); } catch (x) { return; }
    if (antes == null || !(e.n > +antes)) return;
    const r = host.querySelector('#resumo');
    if (r && !reduz()) { r.classList.remove('corr-sobe'); void r.offsetWidth; r.classList.add('corr-sobe'); setTimeout(() => r.classList.remove('corr-sobe'), 2300); }
    FichasExtras.aviso('A corrupção avança: ' + e.nome + '.');
  }

  /* ---------------- os cortes (nas tabelas base) ---------------- */
  function htmlCortes() {
    const c = C();
    if (!c) return '';
    return `<div>
      <span class="eyebrow">Corrupção → pontos de cada estágio</span>
      <table class="cfg corr-cortes"><tbody>
        ${c.ORDEM.filter(k => !c.TIPOS[k].manual).map(k => `<tr><td>${c.TIPOS[k].nome}</td>${c.cortesDe(S.cfg, k).map((v, i) => `<td><input type="number" min="1" step="1" data-corrcorte="${k}|${i}" value="${v}" aria-label="${c.TIPOS[k].nome}: pontos do estágio ${i + 1}" style="width:54px"></td>`).join('')}</tr>`).join('')}
      </tbody></table>
      <div class="hint" style="margin-top:5px">Os pontos gastos na árvore escolhida em cada ficha. A demoníaca é à mão. Valem para a mesa toda.</div>
    </div>`;
  }
  function ligarCortes(m) {
    const c = C();
    if (!c) return;
    m.querySelectorAll('[data-corrcorte]').forEach(i => i.onchange = ev => {
      const [k, ix] = ev.target.dataset.corrcorte.split('|');
      const l = c.cortesDe(S.cfg, k);
      l[+ix] = Math.max(1, Math.round(+ev.target.value) || 1);
      const ok = c.normCortes(l);
      if (ok.join() !== l.join()) { toast('Cada estágio precisa de mais pontos que o anterior.'); ev.target.value = c.cortesDe(S.cfg, k)[+ix]; return; }
      S.cfg.corr = Object.assign({}, S.cfg.corr || {}, { [k]: ok });
      save();
    });
  }

  return { htmlBarra, htmlEtiqueta, aplicar, htmlCortes, ligarCortes, estadoDe, svgDe };
})();
