/* Tiny Cats · Fichas: as tropas (lote 40).
   A aba Tropas da ficha — só nas fichas com tropa: a guarda pessoal do personagem, em unidades, cada uma uma carta
   (o brasão, o nome, a raça e a classe, a veterania, as tropas e o HP, o ATQ e a DEF, os equipamentos, os suprimentos,
   as informações). Em cima, a faixa da tropa: o brasão e o nome, quantos soldados, a veterania média, a moral e os
   mantimentos. Do lado, o diário da tropa. A conta está em tc/tropas.js.
   Quem mestra as Fichas cria a tropa ("+ Tropas", no fim das abas), muda os números (as tropas, o HP, o ATQ, a DEF, a
   veterania, a moral, os mantimentos), põe e tira unidades e registra as batalhas. O dono do personagem vê tudo e
   escolhe o nome, a raça, a classe, o brasão, os equipamentos, os suprimentos e as informações de cada unidade (e o
   nome, o brasão e as informações da tropa). Os outros jogadores não recebem a tropa. As listas de equipamentos e de
   suprimentos ficam nas tabelas base. */
const FichasTropas = (() => {
  'use strict';
  const T = () => (window.TC && window.TC.tropas) || null;
  const CN = () => window.ClaNucleo || null;
  const mestreAqui = () => !FichasMesa.ativo() || FichasMesa.mestre();
  const bibAqui = () => (typeof S !== 'undefined' && S.bib && Array.isArray(S.bib.arvores) ? S.bib : null);
  const cfgAqui = () => (typeof S !== 'undefined' ? S.cfg : null);
  const copia = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const num = n => Number(n || 0).toLocaleString('pt-BR');
  const sinal = n => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '0');
  const multi = s => esc(s).replace(/\n/g, '<br>');
  const plural = (n, um, varios) => num(n) + ' ' + (n === 1 ? um : varios);
  let seqSvg = 0;

  /* ---------------- o que há ---------------- */
  const cru = pc => (pc ? FichasMesa.tropasDe(pc) : null);
  const tem = pc => !!(T() && cru(pc));
  const contas = pc => { const d = cru(pc), t = T(); return t && d ? t.calc(d, cfgAqui()) : null; };
  // quem faz o quê: o mestre (tudo), o dono (as escolhas), os outros (nem recebem)
  const podeMestre = pc => mestreAqui() && FichasMesa.podeEditar(pc);
  const podeEscolher = pc => FichasMesa.podeEditar(pc);
  function dataJogo() {
    try { const c = FichasMesa.calendario(); return c && c.hoje && c.meses[c.hoje.m] ? c.hoje.d + 'º de ' + c.meses[c.hoje.m].nome + ', ' + c.hoje.a : ''; } catch (e) { return ''; }
  }
  const quando = e => e.dj || (() => { const d = new Date(e.em); return isFinite(d) && d.getTime() > 0 ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; })();

  /* ---------------- os desenhos ---------------- */
  function svgBras(b, cls) {
    const c = CN(), id = 'trb' + (++seqSvg);
    const svg = c && c.brasaoSvg ? c.brasaoSvg(b, id)
      : `<svg viewBox="0 0 100 120" aria-hidden="true"><path d="M6 6H94V58C94 92 50 114 50 114C50 114 6 92 6 58Z" fill="${esc((b && b.cores && b.cores[0]) || '#24305e')}" stroke="#e5cf9f" stroke-width="4"/></svg>`;
    return `<span class="tr-bras${cls ? ' ' + cls : ''}">${svg}</span>`;
  }
  // as divisas da veterania (uma, duas ou três)
  const divisas = (n, cls) => `<svg class="tr-div${cls ? ' ' + cls : ''}" viewBox="0 0 30 30" aria-hidden="true" focusable="false"><path class="${n >= 1 ? 'on' : ''}" d="M5 23l10-6 10 6"/><path class="${n >= 2 ? 'on' : ''}" d="M5 16l10-6 10 6"/><path class="${n >= 3 ? 'on' : ''}" d="M5 9l10-6 10 6"/></svg>`;
  const CADEADO = '<svg class="tr-cad" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const LAPIS = '<svg class="tr-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';

  /* ---------------- as abas: a das Tropas (só com tropa) e o "+ Tropas" de quem mestra ---------------- */
  function marca(pc) { const d = cru(pc); return d && Array.isArray(d.unid) && d.unid.length ? d.unid.length : '•'; }
  function htmlMais(pc) {
    if (!T() || !pc || tem(pc) || !podeMestre(pc) || pc.petDe) return '';
    return `<button type="button" class="abf tr-mais" data-trcriar title="Dar uma tropa a ${esc(pc.nome || 'este personagem')}: uma aba nova na ficha, com as unidades">+ Tropas</button>`;
  }
  function criar(pc) {
    const t = T();
    if (!t || tem(pc) || !podeMestre(pc)) return;
    FichasMesa.gravarTropas(pc, t.nova(pc.nome, new Date().toISOString(), dataJogo()));
    if (!FichasMesa.ativo()) save();
    S.abaFicha = 'tropas'; save();
    renderFicha();
    U.refocar('#ficha [data-abaficha="tropas"]');
    FichasExtras.aviso('Tropa criada para ' + (pc.nome || 'o personagem') + (FichasMesa.ativo() && pc._dono ? '. O dono da ficha já vê a aba Tropas.' : '.'), 'Desfazer', () => {
      FichasMesa.gravarTropas(pc, null);
      if (!FichasMesa.ativo()) save();
      renderFicha();
    });
  }

  /* ---------------- mudar ---------------- */
  function gravar(pc, d) {
    FichasMesa.gravarTropas(pc, d);
    if (!FichasMesa.ativo()) save();
    renderFicha();
  }
  // o mestre: a tropa inteira (normalizada), com Desfazer
  function mudarMestre(pc, rotulo, fn) {
    const t = T(), antes = cru(pc);
    if (!t || !antes || !podeMestre(pc)) return false;
    const x = t.norm(copia(antes));
    if (fn(x) === false) return false;
    const y = t.norm(x);
    gravar(pc, y);
    FichasExtras.aviso(typeof rotulo === 'function' ? rotulo(y) : rotulo, 'Desfazer', () => gravar(pc, copia(antes)));
    return true;
  }
  // as escolhas (o dono, ou o mestre): só as chaves do jogador mudam — o resto vai como estava
  function mudarEscolhas(pc, unidId, esc, rotulo) {
    const t = T(), antes = cru(pc);
    if (!t || !antes || !podeEscolher(pc)) return false;
    let novo = t.comEscolhas(antes, unidId, esc);
    if (!novo) return false;
    if (mestreAqui()) novo = t.norm(novo);
    const u0 = unidId ? (antes.unid || []).find(u => u && u.id === unidId) : null;
    const prev = unidId ? (u0 ? t.escolhasDaUnid(u0) : null) : t.escolhasDaTropa(antes);
    gravar(pc, novo);
    FichasExtras.aviso(rotulo, 'Desfazer', () => {
      const agora = cru(pc), v = prev && agora ? t.comEscolhas(agora, unidId, prev) : null;
      if (v) gravar(pc, mestreAqui() ? t.norm(v) : v);
    });
    return true;
  }

  /* ---------------- a aba ---------------- */
  function htmlAba(pc) {
    const t = T(), c = contas(pc);
    if (!t || !c) return '';
    const d = c.d, M = podeMestre(pc), E = podeEscolher(pc), bib = bibAqui();
    const cartas = c.cartas.slice().sort((a, b) => b.u.vet - a.u.vet);
    const moralPips = Array.from({ length: 10 }, (_, i) => `<i class="${i < d.moral ? 'on' : ''}"></i>`).join('');
    return `<div class="tr-aba" id="tropasAba">
      <section class="tr-faixa" aria-label="A tropa">
        ${svgBras(d.bras, 'tr-bras-g')}
        <div class="tr-id">
          <h2 class="tr-nome">${esc(d.nome)}</h2>
          <p class="tr-sub">${c.unidades ? `<b class="mono">${num(c.tropas)}</b> ${c.tropas === 1 ? 'soldado' : 'soldados'} em <b class="mono">${c.unidades}</b> ${c.unidades === 1 ? 'unidade' : 'unidades'}` : d.unid.length ? 'Nenhuma unidade com soldados agora.' : 'Ainda sem unidades.'}</p>
          ${d.info ? `<p class="tr-info">${multi(d.info)}</p>` : ''}
          <div class="tr-acoes">
            ${E ? `<button type="button" class="mini" data-trtropa>${LAPIS}Nome e brasão</button>` : ''}
            ${M ? `<button type="button" class="mini" data-trnumtropa>Moral e mantimentos…</button>
            <button type="button" class="mini" data-trbatalha ${c.unidades ? '' : 'disabled'}>Registrar batalha…</button>
            <button type="button" class="mini" data-trnova ${d.unid.length >= t.MAX.unid ? 'disabled' : ''}>+ Unidade</button>
            <button type="button" class="mini danger" data-trdispensar title="Tira a tropa da ficha (com Desfazer)">Dispensar</button>` : ''}
          </div>
        </div>
        <div class="tr-medidas">
          <div class="tr-med tr-med-vet" title="A média da veterania das unidades com soldados (Recruta 1, Veterana 2, Elite 3)">
            <span class="tr-rot">Veterania média</span>
            <div class="tr-vetm">${divisas(c.vetN || 0, 'g')}<div><b class="tr-vetnome">${esc(c.vetNome || '—')}</b><small class="mono">média ${t.fmtMedia(c.vetMedia)} de 3</small></div></div>
          </div>
          <div class="tr-med">
            <span class="tr-rot">Moral</span>
            <div class="tr-moral"><b class="mono">${d.moral}</b> <small>de 10</small>${M ? `<span class="tr-pm"><button type="button" class="step" data-trmoral="-1" aria-label="Moral: um a menos" ${d.moral <= 0 ? 'disabled' : ''}>−</button><button type="button" class="step" data-trmoral="1" aria-label="Moral: um a mais" ${d.moral >= 10 ? 'disabled' : ''}>+</button></span>` : ''}</div>
            <span class="tr-pips" aria-hidden="true">${moralPips}</span>
          </div>
          <div class="tr-med" title="${c.consumo ? 'O estoque (' + num(d.mant) + ') dividido pelo consumo de cada dia' + (d.cons == null ? ' — uma ração por 100 soldados' : '') : 'Sem soldados, a tropa não come'}">
            <span class="tr-rot">Mantimentos</span>
            <div><b class="mono">${c.dias == null ? '—' : num(c.dias)}</b> <small>${c.dias === 1 ? 'dia' : 'dias'}</small></div>
            <small class="tr-fraco">${c.consumo ? num(c.consumo) + ' por dia' : 'ninguém para comer'}</small>
          </div>
        </div>
        ${M ? '' : `<p class="tr-trava">${CADEADO}Os números são do mestre. Você escolhe o brasão, o nome, a raça, a classe, os equipamentos, os suprimentos e as informações de cada unidade.</p>`}
      </section>
      <div class="tr-corpo">
        <div class="tr-col">
          <div class="tr-tit"><h3>As unidades</h3>${cartas.length > 1 ? '<span>da mais veterana para a mais nova</span>' : ''}</div>
          ${cartas.length ? `<div class="tr-cartas">${cartas.map(k => htmlCarta(pc, k, c, M, E, bib)).join('')}</div>`
            : `<div class="tr-vazio">${M ? 'Nenhuma unidade ainda. Use “+ Unidade” para pôr a primeira.' : 'O mestre ainda não pôs unidades nesta tropa.'}</div>`}
        </div>
        <aside class="tr-lado">${htmlDiario(pc, d, M)}</aside>
      </div>
    </div>`;
  }
  function htmlCarta(pc, k, c, M, E, bib) {
    const t = T(), u = k.u, raca = t.racaDe(u, bib), classe = t.classeDe(u, bib);
    const pct = k.hpCheio ? Math.max(0, Math.min(100, k.hp / k.hpCheio * 100)) : 0;
    const titAtq = `ATQ ${sinal(k.atq)}: ${sinal(u.atq)} da unidade${k.eqAtq ? ', ' + sinal(k.eqAtq) + ' dos equipamentos' : ''}${k.vb ? ', ' + sinal(k.vb) + ' da veterania' : ''}`;
    const titDef = `DEF ${sinal(k.def)}: ${sinal(u.def)} da unidade${k.eqDef ? ', ' + sinal(k.eqDef) + ' dos equipamentos' : ''}${k.vb ? ', ' + sinal(k.vb) + ' da veterania' : ''}`;
    const eq = e => `<span class="tr-chip">${esc(e.nome)}${e.atq ? ` <b class="mono">ATQ ${sinal(e.atq)}</b>` : ''}${e.def ? ` <b class="mono">DEF ${sinal(e.def)}</b>` : ''}</span>`;
    const sp = s => `<span class="tr-chip tr-chip-s" title="${esc(s.desc || '')}">${esc(s.nome)}${s.q ? ` <b class="mono">${num(s.q)}</b>` : ''}</span>`;
    const extra = [u.magos ? plural(u.magos, 'mago', 'magos') : '', u.cura ? 'cura ' + u.cura + '% por dia' : ''].filter(Boolean).join(' · ');
    return `<article class="tr-carta tr-v${u.vet}${k.vazia ? ' tr-semtropa' : ''}" data-trunid="${esc(u.id)}" aria-label="${esc(u.nome)}">
      <div class="tr-cab">
        ${svgBras(u.bras)}
        <div class="tr-cabt">
          <div class="tr-cabl">
            <h4>${esc(u.nome)}</h4>
            ${M ? `<label class="tr-vetsel" title="A veterania da unidade">${divisas(u.vet)}<span class="sr">Veterania de ${esc(u.nome)}</span><select data-trvet="${esc(u.id)}">${[1, 2, 3].map(n => `<option value="${n}" ${u.vet === n ? 'selected' : ''}>${t.nomeVet(n)}</option>`).join('')}</select></label>`
              : `<span class="tr-vetb" title="Veterania: ${k.nomeVet}">${divisas(u.vet)}<span>${k.nomeVet}</span></span>`}
          </div>
          ${raca || classe ? `<div class="tr-tags">${raca ? `<span class="tr-tag" title="Raça">${esc(raca)}</span>` : ''}${classe ? `<span class="tr-tag" title="Classe">${esc(classe)}</span>` : ''}</div>` : E ? '<div class="tr-tags"><span class="tr-fraco">Sem raça e classe ainda</span></div>' : ''}
        </div>
      </div>
      <div class="tr-num">
        ${M ? '' : `<div class="tr-numcab"><span class="tr-trava-p">${CADEADO}o mestre muda</span></div>`}
        <div class="tr-ngrid">
          <div><span class="tr-rot">Tropas</span><b class="mono">${num(u.tropas)}</b>${k.desfalque ? ` <small class="mono tr-fraco" title="O efetivo completo">de ${num(u.cheio)}</small>` : ''}</div>
          <div title="${esc(titAtq)}"><span class="tr-rot">ATQ</span><b class="mono">${sinal(k.atq)}</b></div>
          <div title="${esc(titDef)}"><span class="tr-rot">DEF</span><b class="mono">${sinal(k.def)}</b></div>
        </div>
        <div class="tr-hp"><span class="tr-rot"><span>HP${k.desfalque ? ' <em>com baixas</em>' : ''}</span><span class="mono">${num(k.hp)} / ${num(k.hpCheio)}</span></span>
          <span class="tr-barra" role="img" aria-label="HP ${num(k.hp)} de ${num(k.hpCheio)}"><i style="width:${pct.toFixed(1)}%"></i></span></div>
        ${extra ? `<div class="tr-extra">${esc(extra)}</div>` : ''}
      </div>
      <div class="tr-listas">
        <div><span class="tr-rot">Equipamentos</span><div class="tr-chips">${k.eqs.length ? k.eqs.map(eq).join('') : '<span class="tr-fraco">Nenhum</span>'}</div></div>
        <div><span class="tr-rot">Suprimentos</span><div class="tr-chips">${k.sps.length ? k.sps.map(sp).join('') : '<span class="tr-fraco">Nenhum</span>'}</div></div>
        ${u.info ? `<p class="tr-info">${multi(u.info)}</p>` : ''}
      </div>
      <footer class="tr-pe">
        <span class="tr-bat">${u.bat ? plural(u.bat, 'batalha', 'batalhas') + ' · ' + plural(u.baixas, 'baixa', 'baixas') : k.vazia ? 'Sem soldados' : 'Nenhuma batalha ainda'}</span>
        <span class="tr-pebt">${M ? `<button type="button" class="mini" data-trnum="${esc(u.id)}">Números…</button>` : ''}${E ? `<button type="button" class="mini" data-tresc="${esc(u.id)}">${LAPIS}${M ? 'Escolhas' : 'Editar o que é seu'}</button>` : ''}</span>
      </footer>
    </article>`;
  }
  function htmlDiario(pc, d, M) {
    const t = T(), l = d.diario, cor = { v: 'tr-dv', d: 'tr-dd', e: 'tr-de' };
    return `<section class="tr-diario" aria-label="Diário da tropa">
      <div class="tr-dcab"><h3>Diário da tropa</h3>${M ? '<button type="button" class="mini" data-trnota>+ Nota</button>' : ''}</div>
      ${l.length ? `<ol class="tr-dlista">${l.map((e, i) => `<li class="${e.r ? cor[e.r] : 'tr-d' + e.k}${i >= 8 ? ' tr-dmais' : ''}"${i >= 8 ? ' hidden' : ''}>
          <span class="tr-dq">${esc(quando(e))}</span>
          <b>${esc(e.t)}</b>
          ${e.r || e.b ? `<span class="tr-dr">${e.r ? `<span class="tr-res">${t.RESULTADOS[e.r]}</span>` : ''}${e.r && e.b ? ' · ' : ''}${e.b ? plural(e.b, 'baixa', 'baixas') : ''}</span>` : ''}
          ${e.x ? `<span class="tr-dx">${esc(e.x)}</span>` : ''}
          ${M ? `<button type="button" class="tr-dtira" data-trtiradi="${esc(e.id)}" aria-label="Tirar do diário: ${esc(e.t)}" title="Tirar do diário">×</button>` : ''}
        </li>`).join('')}</ol>${l.length > 8 ? `<button type="button" class="mini tr-dver" data-trdver>Ver as ${l.length} linhas</button>` : ''}`
        : `<p class="tr-fraco tr-dvazio">${M ? 'As batalhas registradas e as promoções aparecem aqui.' : 'As batalhas da tropa aparecem aqui.'}</p>`}
    </section>`;
  }

  /* ---------------- ligar a aba ---------------- */
  function ligar(host, pc) {
    const b = host.querySelector('[data-trcriar]');
    if (b) b.onclick = () => criar(pc);
    const aba = host.querySelector('#tropasAba');
    if (!aba || !T()) return;
    const t = T(), q1 = s => aba.querySelector(s), qn = s => aba.querySelectorAll(s);
    const x = q1('[data-trtropa]'); if (x) x.onclick = () => janelaEscolhas(pc, null);
    const nt = q1('[data-trnumtropa]'); if (nt) nt.onclick = () => janelaNumTropa(pc);
    const bt = q1('[data-trbatalha]'); if (bt) bt.onclick = () => janelaBatalha(pc);
    const nv = q1('[data-trnova]'); if (nv) nv.onclick = () => {
      let nome = '';
      if (mudarMestre(pc, () => nome + ' entrou na tropa. Use “Números…” para as tropas, o ATQ e a DEF.', d => {
        if (d.unid.length >= t.MAX.unid) return false;
        const u = t.unidadeNova(d.unid.length); nome = u.nome;
        d.unid.push(u);
        d.diario = t.normDiario([{ k: 'unid', t: u.nome + ' entrou na tropa.', em: new Date().toISOString(), dj: dataJogo() }].concat(d.diario));
      })) U.refocar('#tropasAba [data-trunid]:last-child [data-trnum]');
    };
    const ds = q1('[data-trdispensar]'); if (ds) ds.onclick = () => {
      const antes = cru(pc);
      if (!antes || !podeMestre(pc)) return;
      gravar(pc, null);
      FichasExtras.aviso('A tropa de ' + (pc.nome || 'o personagem') + ' foi dispensada. A aba Tropas saiu da ficha.', 'Desfazer', () => { gravar(pc, copia(antes)); });
    };
    qn('[data-trmoral]').forEach(bm => bm.onclick = () => {
      const dlt = +bm.dataset.trmoral;
      mudarMestre(pc, y => 'Moral da tropa: ' + y.moral + ' de 10.', d => { const n = Math.max(0, Math.min(10, d.moral + dlt)); if (n === d.moral) return false; d.moral = n; });
      U.refocar('#tropasAba [data-trmoral="' + dlt + '"]');
    });
    qn('[data-trvet]').forEach(sel => sel.onchange = () => {
      const id = sel.dataset.trvet, n = +sel.value;
      let nome = '', subiu = false;
      const ok = mudarMestre(pc, () => nome + (subiu ? ' virou ' : ' voltou a ') + t.nomeVet(n) + '.', d => {
        const u = d.unid.find(y => y.id === id);
        if (!u || u.vet === n) return false;
        subiu = n > u.vet; nome = u.nome; u.vet = n;
        d.diario = t.normDiario([{ k: 'vet', t: u.nome + (subiu ? ' virou ' : ' voltou a ') + t.nomeVet(n) + '.', em: new Date().toISOString(), dj: dataJogo() }].concat(d.diario));
      });
      if (ok) U.refocar('#tropasAba [data-trvet="' + CSS.escape(id) + '"]');
    });
    qn('[data-trnum]').forEach(bn => bn.onclick = () => janelaNumUnid(pc, bn.dataset.trnum));
    qn('[data-tresc]').forEach(be => be.onclick = () => janelaEscolhas(pc, be.dataset.tresc));
    const no = q1('[data-trnota]'); if (no) no.onclick = () => janelaNota(pc);
    qn('[data-trtiradi]').forEach(bx => bx.onclick = () => {
      const id = bx.dataset.trtiradi;
      mudarMestre(pc, 'A linha saiu do diário.', d => { const n = d.diario.length; d.diario = d.diario.filter(e => e.id !== id); if (d.diario.length === n) return false; });
    });
    const dv = q1('[data-trdver]'); if (dv) dv.onclick = () => { qn('.tr-dmais').forEach(li => { li.hidden = false; }); dv.remove(); };
  }
  // (os pequenos ajudantes de foco das Fichas)
  const U = { refocar: sel => { const n = document.querySelector(sel); if (n && !n.disabled) n.focus({ preventScroll: true }); } };

  /* ---------------- o montador do brasão (o mesmo do clã: forma, divisão, cores, símbolo) ---------------- */
  function htmlMontador(b) {
    const c = CN();
    if (!c) return '<p class="hint">O montador do brasão não carregou. Recarregue a página para escolher o brasão.</p>';
    const icone = d => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="${esc(d)}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return `<div class="tr-mont" data-trmont>
      <div class="tr-mprev" data-mprev>${svgBras(b, 'tr-bras-m')}</div>
      <div class="tr-mcampos">
        <div><span class="eyebrow">Forma</span><div class="tr-escs" role="group" aria-label="Forma do brasão">${c.FORMAS.map(f => `<button type="button" class="tr-esc" data-mforma="${f.id}" aria-pressed="${b.forma === f.id}" title="${esc(f.nome)}" aria-label="${esc(f.nome)}"><svg viewBox="0 0 100 120" width="20" height="24" aria-hidden="true" focusable="false"><path d="${esc(f.d)}" fill="currentColor"/></svg></button>`).join('')}</div></div>
        <div><span class="eyebrow">Divisão</span><div class="tr-escs" role="group" aria-label="Divisão do brasão">${c.DIVISOES.map(([d, nm]) => `<button type="button" class="tr-esc tr-esct" data-mdiv="${d}" aria-pressed="${b.div === d}">${esc(nm)}</button>`).join('')}</div></div>
        <div><span class="eyebrow">Cores (escolha qual e depois a cor)</span>
          <div class="tr-escs" role="group" aria-label="Qual cor">${[0, 1].map(i => `<button type="button" class="tr-esc tr-esct" data-malvo="${i}" aria-pressed="${i === 0}"><i class="tr-amostra" data-mamostra="${i}" style="background:${esc(b.cores[i])}"></i>Cor ${i + 1}</button>`).join('')}</div>
          <div class="tr-escs tr-cores" role="group" aria-label="A cor">${c.CORES.map(cor => `<button type="button" class="tr-esc tr-cor" data-mcor="${cor}" aria-pressed="${b.cores[0] === cor}" title="${cor}" aria-label="Cor ${cor}"><i style="background:${cor}"></i></button>`).join('')}
            <label class="tr-esc tr-esct tr-outra">Outra <input type="color" data-moutra value="${esc(b.cores[0])}" aria-label="Outra cor"></label></div></div>
        <div><span class="eyebrow">Símbolo</span><div class="tr-simbs" role="group" aria-label="Símbolo do brasão">
          <button type="button" class="tr-esc tr-esct tr-nenhum" data-msimb="" aria-pressed="${!b.simb}">Nenhum</button>${[...c.SIMBOLOS.values()].map(s => `<button type="button" class="tr-esc" data-msimb="${esc(s.id)}" aria-pressed="${b.simb === s.id}" title="${esc(s.nome)}" aria-label="${esc(s.nome)}">${icone(s.d)}</button>`).join('')}</div></div>
      </div>
    </div>`;
  }
  // liga o montador: cada escolha muda o brasão (b) na hora e redesenha a prévia (nada é salvo até "Salvar")
  function ligarMontador(root, b, aoMudar) {
    const m = root.querySelector('[data-trmont]');
    if (!m) return;
    let alvo = 0;
    const marcar = (sel, ok) => m.querySelectorAll(sel).forEach(x => x.setAttribute('aria-pressed', String(ok(x))));
    const pintar = () => {
      m.querySelector('[data-mprev]').innerHTML = svgBras(b, 'tr-bras-m');
      marcar('[data-mforma]', x => x.dataset.mforma === b.forma);
      marcar('[data-mdiv]', x => x.dataset.mdiv === b.div);
      marcar('[data-malvo]', x => +x.dataset.malvo === alvo);
      marcar('[data-mcor]', x => x.dataset.mcor === b.cores[alvo]);
      marcar('[data-msimb]', x => (x.dataset.msimb || null) === (b.simb || null));
      m.querySelectorAll('[data-mamostra]').forEach(x => { x.style.background = b.cores[+x.dataset.mamostra]; });
      const o = m.querySelector('[data-moutra]'); if (o) o.value = b.cores[alvo];
      if (aoMudar) aoMudar(b);
    };
    m.querySelectorAll('[data-mforma]').forEach(x => x.onclick = () => { b.forma = x.dataset.mforma; pintar(); });
    m.querySelectorAll('[data-mdiv]').forEach(x => x.onclick = () => { b.div = x.dataset.mdiv; pintar(); });
    m.querySelectorAll('[data-malvo]').forEach(x => x.onclick = () => { alvo = +x.dataset.malvo; pintar(); });
    m.querySelectorAll('[data-mcor]').forEach(x => x.onclick = () => { b.cores[alvo] = x.dataset.mcor; pintar(); });
    m.querySelectorAll('[data-msimb]').forEach(x => x.onclick = () => { b.simb = x.dataset.msimb || null; pintar(); });
    const o = m.querySelector('[data-moutra]');
    if (o) o.onchange = () => { if (/^#[0-9a-f]{6}$/i.test(o.value)) { b.cores[alvo] = o.value.toLowerCase(); pintar(); } };
  }

  /* ---------------- as janelas ---------------- */
  const acoes = (ok, extra) => `<div class="modalacts">${extra || ''}<span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-jok>${ok}</button></span></div>`;
  function campoArvore(rot, cat, idAtual, nomeAtual, k) {
    const l = T().arvoresDe(bibAqui(), cat);
    if (!l.length) return `<label class="f"><span class="eyebrow">${rot}</span><input data-tr${k}n maxlength="40" value="${esc(nomeAtual || '')}" placeholder="A mesa ainda não tem árvores de ${rot.toLowerCase()}" autocomplete="off"></label>`;
    const tem = l.some(a => a.id === idAtual);
    return `<label class="f"><span class="eyebrow">${rot}</span><select data-tr${k}>
      <option value="" ${!tem && !nomeAtual ? 'selected' : ''}>—</option>
      ${!tem && nomeAtual ? `<option value="__fora" selected>${esc(nomeAtual)} (fora das árvores)</option>` : ''}
      ${l.map(a => `<option value="${esc(a.id)}" ${a.id === idAtual ? 'selected' : ''}>${esc(a.nome)}</option>`).join('')}</select></label>`;
  }
  // as escolhas: da tropa (unidId null: o nome, o brasão e as informações) ou de uma unidade (tudo o que é do jogador)
  function janelaEscolhas(pc, unidId) {
    const t = T(), c = contas(pc);
    if (!t || !c || !podeEscolher(pc)) return;
    const u = unidId ? c.d.unid.find(x => x.id === unidId) : null;
    if (unidId && !u) return;
    const alvo = u || c.d, cf = c.cf, b = copia(alvo.bras);
    const titulo = u ? 'As escolhas de ' + u.nome : 'A tropa: nome, brasão e informações';
    const corpo = u ? `<div class="tr-jesc">
        <div class="tr-jcol">
          <label class="f"><span class="eyebrow">Nome da unidade</span><input data-trnome maxlength="${t.MAX.nome}" value="${esc(u.nome)}" autocomplete="off"></label>
          <div class="tr-j2">${campoArvore('Raça', 'raca', u.raca, u.racaN, 'raca')}${campoArvore('Classe', 'classe', u.classe, u.classeN, 'classe')}</div>
          <fieldset class="tr-jlista"><legend class="eyebrow">Equipamentos <span class="tr-fraco">(até ${cf.maxEquip})</span></legend>
            ${cf.equip.length ? cf.equip.map(e => `<label class="tr-jop"><input type="checkbox" data-treq="${esc(e.id)}" ${u.equip.includes(e.id) ? 'checked' : ''}><span>${esc(e.nome)}</span><small class="mono">${[e.atq ? 'ATQ ' + sinal(e.atq) : '', e.def ? 'DEF ' + sinal(e.def) : ''].filter(Boolean).join(' ') || 'sem bônus'}</small></label>`).join('')
              : '<p class="hint">A lista de equipamentos está vazia (o mestre monta nas tabelas base).</p>'}
          </fieldset>
          <fieldset class="tr-jlista"><legend class="eyebrow">Suprimentos <span class="tr-fraco">(o que a unidade leva; a quantidade é do mestre)</span></legend>
            ${cf.supr.length ? cf.supr.map(s => `<label class="tr-jop"><input type="checkbox" data-trsp="${esc(s.id)}" ${u.supr.includes(s.id) ? 'checked' : ''}><span>${esc(s.nome)}</span>${s.desc ? `<small>${esc(s.desc)}</small>` : ''}</label>`).join('')
              : '<p class="hint">A lista de suprimentos está vazia (o mestre monta nas tabelas base).</p>'}
          </fieldset>
          <label class="f"><span class="eyebrow">Informações</span><textarea data-trinfo rows="3" maxlength="${t.MAX.info}" placeholder="De onde vieram, a quem juraram, o que fazem bem">${esc(u.info)}</textarea></label>
        </div>
        <div class="tr-jcol"><span class="eyebrow">Brasão da unidade</span>${htmlMontador(b)}</div>
      </div>`
      : `<div class="tr-jesc">
        <div class="tr-jcol">
          <label class="f"><span class="eyebrow">Nome da tropa</span><input data-trnome maxlength="${t.MAX.nome}" value="${esc(c.d.nome)}" autocomplete="off"></label>
          <label class="f"><span class="eyebrow">Informações</span><textarea data-trinfo rows="4" maxlength="${t.MAX.info}" placeholder="O que a tropa é, o que jurou, por onde anda">${esc(c.d.info)}</textarea></label>
        </div>
        <div class="tr-jcol"><span class="eyebrow">Brasão da tropa</span>${htmlMontador(b)}</div>
      </div>`;
    const { m, fechar } = FichasExtras.janela(titulo, corpo + acoes('Salvar'), 860);
    m.classList.add('tr-janela');
    ligarMontador(m, b);
    const nEq = () => m.querySelectorAll('[data-treq]:checked').length;
    const travarEq = () => m.querySelectorAll('[data-treq]').forEach(x => { x.disabled = !x.checked && nEq() >= cf.maxEquip; });
    m.querySelectorAll('[data-treq]').forEach(x => x.onchange = travarEq);
    travarEq();
    const MAXS = t.MAX.suprUnid, travarSp = () => { const n = m.querySelectorAll('[data-trsp]:checked').length; m.querySelectorAll('[data-trsp]').forEach(x => { x.disabled = !x.checked && n >= MAXS; }); };
    m.querySelectorAll('[data-trsp]').forEach(x => x.onchange = travarSp);
    travarSp();
    const val = s => { const e = m.querySelector(s); return e ? e.value : undefined; };
    m.querySelector('[data-jok]').onclick = () => {
      const e = { nome: val('[data-trnome]'), info: val('[data-trinfo]'), bras: b };
      if (u) {
        const arv = (k, cat) => {
          const sel = m.querySelector('[data-tr' + k + ']');
          if (sel) {
            if (sel.value === '__fora') return [null, u[k + 'N'] || ''];
            const a = sel.value ? t.arvoresDe(bibAqui(), cat).find(x => x.id === sel.value) : null;
            return a ? [a.id, a.nome] : [null, ''];
          }
          return [null, val('[data-tr' + k + 'n]') || ''];
        };
        [e.raca, e.racaN] = arv('raca', 'raca');
        [e.classe, e.classeN] = arv('classe', 'classe');
        e.equip = [...m.querySelectorAll('[data-treq]:checked')].map(x => x.dataset.treq);
        e.supr = [...m.querySelectorAll('[data-trsp]:checked')].map(x => x.dataset.trsp);
      }
      fechar();
      mudarEscolhas(pc, unidId, e, u ? 'As escolhas de ' + (String(e.nome || '').trim() || u.nome) + ' foram salvas.' : 'A tropa foi salva.');
    };
    const pri = m.querySelector('[data-trnome]'); if (pri) pri.focus();
  }
  // os números de uma unidade (só quem mestra)
  function janelaNumUnid(pc, unidId) {
    const t = T(), c = contas(pc);
    if (!t || !c || !podeMestre(pc)) return;
    const u = c.d.unid.find(x => x.id === unidId);
    if (!u) return;
    const k = c.cartas.find(x => x.u.id === unidId), cf = c.cf;
    const n = (rot, campo, v, min, max, dica) => `<label class="f"><span class="eyebrow">${rot}</span><input type="number" step="1" min="${min}" max="${max}" data-trn="${campo}" value="${v}"${dica ? ` title="${esc(dica)}"` : ''}></label>`;
    const corpo = `<div class="tr-jnum">
        ${n('Tropas', 'tropas', u.tropas, 0, t.MAX.tropas, 'Quantos soldados a unidade tem agora')}
        ${n('Efetivo completo', 'cheio', u.cheio, 0, t.MAX.tropas, 'Quantos soldados a unidade tem cheia: a barra de HP mostra o que falta')}
        ${n('HP de cada soldado', 'hpT', u.hpT, 1, t.MAX.hpT)}
        ${n('ATQ da unidade', 'atq', u.atq, -t.MAX.atr, t.MAX.atr, 'Sem os equipamentos e a veterania (eles somam por cima)')}
        ${n('DEF da unidade', 'def', u.def, -t.MAX.atr, t.MAX.atr, 'Sem os equipamentos e a veterania (eles somam por cima)')}
        <label class="f"><span class="eyebrow">Veterania</span><select data-trn="vet">${[1, 2, 3].map(v => `<option value="${v}" ${u.vet === v ? 'selected' : ''}>${t.nomeVet(v)}${v > 1 && cf.vet[v] ? ' (+' + cf.vet[v] + ' no ATQ e na DEF)' : ''}</option>`).join('')}</select></label>
        ${n('Batalhas', 'bat', u.bat, 0, t.MAX.bat)}
        ${n('Baixas (todas)', 'baixas', u.baixas, 0, t.MAX.tropas)}
        ${n('Magos', 'magos', u.magos, 0, t.MAX.magos)}
        ${n('Cura (% por dia)', 'cura', u.cura, 0, 100, 'Quanto do HP que falta os médicos da unidade curam por dia')}
      </div>
      ${k.sps.length ? `<fieldset class="tr-jlista"><legend class="eyebrow">Quantidade dos suprimentos (o jogador escolheu)</legend><div class="tr-jnum">${k.sps.map(s => `<label class="f"><span class="eyebrow">${esc(s.nome)}</span><input type="number" step="1" min="0" max="${t.MAX.suprQ}" data-trq="${esc(s.id)}" value="${s.q || 0}"></label>`).join('')}</div></fieldset>` : ''}
      <p class="hint tr-jprev" data-trprev></p>`;
    const { m, fechar } = FichasExtras.janela('Os números de ' + u.nome, corpo + acoes('Salvar', '<button type="button" class="danger" data-trtira>Dispensar a unidade</button>'), 640);
    m.classList.add('tr-janela');
    const ler = () => { const o = {}; m.querySelectorAll('[data-trn]').forEach(x => { o[x.dataset.trn] = x.value; }); const q = {}; m.querySelectorAll('[data-trq]').forEach(x => { q[x.dataset.trq] = x.value; }); o.suprQ = Object.assign({}, u.suprQ, q); return o; };
    const prev = () => {
      const o = ler(), x = t.normUnid(Object.assign({}, u, o), 0, new Set()), kk = t.contaUnid(x, cf);
      m.querySelector('[data-trprev]').textContent = `Fica: ${num(x.tropas)} ${x.tropas === 1 ? 'soldado' : 'soldados'}, HP ${num(kk.hp)} de ${num(kk.hpCheio)}, ATQ ${sinal(kk.atq)} e DEF ${sinal(kk.def)} (com os equipamentos e a veterania).`;
    };
    m.querySelectorAll('input, select').forEach(x => { x.oninput = prev; x.onchange = prev; });
    prev();
    m.querySelector('[data-jok]').onclick = () => {
      const o = ler();
      fechar();
      let vetAntes = null, nome = u.nome;
      mudarMestre(pc, 'Os números de ' + u.nome + ' mudaram.', d => {
        const i = d.unid.findIndex(y => y.id === unidId);
        if (i < 0) return false;
        const y = d.unid[i]; vetAntes = y.vet; nome = y.nome;
        const novo = t.normUnid(Object.assign({}, y, o), i, new Set());
        if (JSON.stringify(novo) === JSON.stringify(y)) return false;
        d.unid[i] = novo;
        if (novo.vet !== vetAntes) d.diario = t.normDiario([{ k: 'vet', t: nome + (novo.vet > vetAntes ? ' virou ' : ' voltou a ') + t.nomeVet(novo.vet) + '.', em: new Date().toISOString(), dj: dataJogo() }].concat(d.diario));
      });
    };
    m.querySelector('[data-trtira]').onclick = () => {
      fechar();
      mudarMestre(pc, u.nome + ' saiu da tropa.', d => {
        const n0 = d.unid.length; d.unid = d.unid.filter(y => y.id !== unidId);
        if (d.unid.length === n0) return false;
        d.diario = t.normDiario([{ k: 'unid', t: u.nome + ' saiu da tropa.', em: new Date().toISOString(), dj: dataJogo() }].concat(d.diario));
      });
    };
    m.querySelector('[data-trn="tropas"]').focus();
  }
  // a moral e os mantimentos da tropa (só quem mestra)
  function janelaNumTropa(pc) {
    const t = T(), c = contas(pc);
    if (!t || !c || !podeMestre(pc)) return;
    const d = c.d, pelo = c.tropas > 0 ? Math.ceil(c.tropas / 100) : 0;
    const corpo = `<div class="tr-jnum">
        <label class="f"><span class="eyebrow">Moral (0 a 10)</span><input type="number" min="0" max="10" step="1" data-trm="moral" value="${d.moral}" title="5 é firme"></label>
        <label class="f"><span class="eyebrow">Mantimentos (o estoque)</span><input type="number" min="0" step="1" data-trm="mant" value="${d.mant}"></label>
        <label class="f"><span class="eyebrow">Consumo por dia</span><input type="number" min="1" step="1" data-trm="cons" value="${d.cons == null ? '' : d.cons}" placeholder="${pelo} (pelo tamanho)"></label>
      </div>
      <p class="hint">Sem um consumo escrito, a tropa come uma ração por 100 soldados por dia (agora, ${num(pelo)}).</p>
      <p class="hint tr-jprev" data-trprev></p>`;
    const { m, fechar } = FichasExtras.janela('A moral e os mantimentos de ' + d.nome, corpo + acoes('Salvar'), 520);
    m.classList.add('tr-janela');
    const ler = () => { const o = {}; m.querySelectorAll('[data-trm]').forEach(x => { o[x.dataset.trm] = x.value; }); return o; };
    const prev = () => { const x = t.calc(Object.assign({}, d, ler()), cfgAqui()); m.querySelector('[data-trprev]').textContent = x.dias == null ? 'Fica: sem soldados para comer.' : `Fica: moral ${x.d.moral} de 10; mantimentos para ${plural(x.dias, 'dia', 'dias')} (${num(x.consumo)} por dia).`; };
    m.querySelectorAll('input').forEach(x => { x.oninput = prev; });
    prev();
    m.querySelector('[data-jok]').onclick = () => {
      const o = ler();
      fechar();
      mudarMestre(pc, 'A moral e os mantimentos da tropa mudaram.', x => {
        const y = t.norm(Object.assign({}, x, o));
        if (y.moral === x.moral && y.mant === x.mant && y.cons === x.cons) return false;
        x.moral = y.moral; x.mant = y.mant; x.cons = y.cons;
      });
    };
    m.querySelector('[data-trm="moral"]').focus();
  }
  // registrar uma batalha: as baixas de cada unidade, o resultado, a moral depois; uma linha no diário
  function janelaBatalha(pc) {
    const t = T(), c = contas(pc);
    if (!t || !c || !podeMestre(pc)) return;
    const d = c.d, vivas = d.unid.filter(u => u.tropas > 0);
    if (!vivas.length) return;
    const corpo = `<label class="f"><span class="eyebrow">Onde, contra quem</span><input data-trbt maxlength="${t.MAX.titulo}" placeholder="ex.: Emboscada na Ponte Velha" autocomplete="off"></label>
      <div class="tr-jres" role="radiogroup" aria-label="O resultado">${Object.entries(t.RESULTADOS).map(([k, nm], i) => `<button type="button" role="radio" class="tr-esc tr-esct" data-trres="${k}" aria-checked="${i === 0}">${nm[0].toUpperCase() + nm.slice(1)}</button>`).join('')}</div>
      <table class="tr-jbx"><thead><tr><th>Unidade</th><th>Soldados</th><th>Baixas</th></tr></thead><tbody>
        ${vivas.map(u => `<tr><td>${esc(u.nome)}</td><td class="mono">${num(u.tropas)}</td><td><input type="number" min="0" max="${u.tropas}" step="1" value="0" data-trbx="${esc(u.id)}" aria-label="Baixas de ${esc(u.nome)}"></td></tr>`).join('')}
      </tbody></table>
      <label class="f tr-jmoral"><span class="eyebrow">Moral depois (0 a 10)</span><input type="number" min="0" max="10" step="1" data-trbm value="${d.moral}"></label>
      <p class="hint tr-jprev" data-trprev></p>`;
    const { m, fechar } = FichasExtras.janela('Registrar uma batalha de ' + d.nome, corpo + acoes('Registrar'), 600);
    m.classList.add('tr-janela');
    let res = 'v';
    m.querySelectorAll('[data-trres]').forEach(b => b.onclick = () => { res = b.dataset.trres; m.querySelectorAll('[data-trres]').forEach(x => x.setAttribute('aria-checked', String(x === b))); });
    const ler = () => { const bx = {}; m.querySelectorAll('[data-trbx]').forEach(x => { bx[x.dataset.trbx] = x.value; }); return { t: m.querySelector('[data-trbt]').value, r: res, baixas: bx, moral: m.querySelector('[data-trbm]').value }; };
    const prev = () => {
      const x = t.registrarBatalha(d, ler()), tot = x.diario[0] ? x.diario[0].b || 0 : 0, sobra = x.unid.reduce((s, u) => s + u.tropas, 0);
      m.querySelector('[data-trprev]').textContent = `${tot ? plural(tot, 'baixa', 'baixas') + ' no total' : 'Nenhuma baixa'}; a tropa fica com ${plural(sobra, 'soldado', 'soldados')}. Cada unidade com soldados conta uma batalha.`;
    };
    m.querySelectorAll('input').forEach(x => { x.oninput = prev; });
    prev();
    m.querySelector('[data-jok]').onclick = () => {
      const b = ler();
      if (!String(b.t || '').trim()) { const i = m.querySelector('[data-trbt]'); i.focus(); i.setAttribute('aria-invalid', 'true'); m.querySelector('[data-trprev]').textContent = 'Escreva onde foi a batalha (ou contra quem) para ela ir ao diário.'; return; }
      fechar();
      mudarMestre(pc, y => { const tot = y.diario[0] ? y.diario[0].b || 0 : 0; return 'Batalha registrada: ' + (tot ? plural(tot, 'baixa', 'baixas') : 'nenhuma baixa') + '.'; },
        x => { Object.assign(x, t.registrarBatalha(x, b, new Date().toISOString(), dataJogo())); });
    };
    m.querySelector('[data-trbt]').focus();
  }
  function janelaNota(pc) {
    const t = T();
    if (!t || !podeMestre(pc)) return;
    const { m, fechar } = FichasExtras.janela('Uma nota no diário da tropa', `<label class="f"><span class="eyebrow">A nota</span><input data-trnt maxlength="${t.MAX.titulo}" placeholder="ex.: Acamparam no Passo do Corvo" autocomplete="off"></label>` + acoes('Pôr no diário'), 460);
    m.classList.add('tr-janela');
    const inp = m.querySelector('[data-trnt]');
    const ok = () => {
      const v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      fechar();
      mudarMestre(pc, 'A nota foi para o diário.', d => { d.diario = t.normDiario([{ k: 'nota', t: v, em: new Date().toISOString(), dj: dataJogo() }].concat(d.diario)); });
    };
    m.querySelector('[data-jok]').onclick = ok;
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } };
    inp.focus();
  }

  /* ---------------- as tabelas base: as listas do mestre ---------------- */
  function htmlCfg() {
    const t = T();
    if (!t) return '';
    const cf = t.normCfg(S.cfg);
    return `<div class="tr-cfg">
      <span class="eyebrow">Tropas → equipamentos</span>
      <table class="cfg"><thead><tr><th>Nome</th><th>ATQ</th><th>DEF</th><th></th></tr></thead><tbody>
        ${cf.equip.map(e => `<tr><td><input data-trceqn="${esc(e.id)}" value="${esc(e.nome)}" maxlength="${t.MAX.nome}" aria-label="Nome do equipamento"></td><td><input type="number" step="1" data-trceqa="${esc(e.id)}" value="${e.atq}" style="width:54px" aria-label="ATQ de ${esc(e.nome)}"></td><td><input type="number" step="1" data-trceqd="${esc(e.id)}" value="${e.def}" style="width:54px" aria-label="DEF de ${esc(e.nome)}"></td><td><button class="mini danger" data-trceqx="${esc(e.id)}" aria-label="Tirar ${esc(e.nome)}">×</button></td></tr>`).join('')}
      </tbody></table>
      <button class="mini" data-trceqmais style="margin-top:6px" ${cf.equip.length >= t.MAX.lista ? 'disabled' : ''}>+ Equipamento</button>
      <label class="f" style="margin-top:8px"><span class="eyebrow">Equipamentos por unidade</span><input type="number" min="1" max="${t.MAX.equipUnid}" step="1" data-trcmax value="${cf.maxEquip}" style="width:64px"></label>
      <span class="eyebrow" style="display:block;margin-top:12px">Tropas → suprimentos</span>
      <table class="cfg"><thead><tr><th>Nome</th><th>Para que serve</th><th></th></tr></thead><tbody>
        ${cf.supr.map(s => `<tr><td><input data-trcspn="${esc(s.id)}" value="${esc(s.nome)}" maxlength="${t.MAX.nome}" aria-label="Nome do suprimento"></td><td><input data-trcspd="${esc(s.id)}" value="${esc(s.desc)}" maxlength="${t.MAX.det}" aria-label="Para que serve ${esc(s.nome)}"></td><td><button class="mini danger" data-trcspx="${esc(s.id)}" aria-label="Tirar ${esc(s.nome)}">×</button></td></tr>`).join('')}
      </tbody></table>
      <button class="mini" data-trcspmais style="margin-top:6px" ${cf.supr.length >= t.MAX.lista ? 'disabled' : ''}>+ Suprimento</button>
      <span class="eyebrow" style="display:block;margin-top:12px">Tropas → bônus da veterania (no ATQ e na DEF)</span>
      <table class="cfg"><tbody>
        <tr><td>Veterana</td><td><input type="number" min="0" max="${t.MAX.bonus}" step="1" data-trcvet="2" value="${cf.vet[2]}" style="width:54px" aria-label="Bônus da Veterana"></td></tr>
        <tr><td>Elite</td><td><input type="number" min="0" max="${t.MAX.bonus}" step="1" data-trcvet="3" value="${cf.vet[3]}" style="width:54px" aria-label="Bônus da Elite"></td></tr>
      </tbody></table>
      <div class="hint" style="margin-top:5px">O jogador escolhe os equipamentos e os suprimentos de cada unidade nestas listas; você põe as quantidades. Valem para a mesa toda.</div>
    </div>`;
  }
  function ligarCfg(m, reabrir) {
    const t = T();
    if (!t) return;
    const pegar = () => { const cf = t.normCfg(S.cfg); return (S.cfg.tropas = { equip: cf.equip, supr: cf.supr, vet: cf.vet, maxEquip: cf.maxEquip }); };
    const salvar = () => { S.cfg.tropas = (({ equip, supr, vet, maxEquip }) => ({ equip, supr, vet, maxEquip }))(t.normCfg(S.cfg)); save(); };
    const em = (sel, fn) => m.querySelectorAll(sel).forEach(i => i.onchange = () => fn(i));
    em('[data-trceqn]', i => { const e = pegar().equip.find(x => x.id === i.dataset.trceqn); if (e) { e.nome = i.value; salvar(); } });
    em('[data-trceqa]', i => { const e = pegar().equip.find(x => x.id === i.dataset.trceqa); if (e) { e.atq = +i.value || 0; salvar(); } });
    em('[data-trceqd]', i => { const e = pegar().equip.find(x => x.id === i.dataset.trceqd); if (e) { e.def = +i.value || 0; salvar(); } });
    em('[data-trcspn]', i => { const s = pegar().supr.find(x => x.id === i.dataset.trcspn); if (s) { s.nome = i.value; salvar(); } });
    em('[data-trcspd]', i => { const s = pegar().supr.find(x => x.id === i.dataset.trcspd); if (s) { s.desc = i.value; salvar(); } });
    em('[data-trcmax]', i => { pegar().maxEquip = +i.value || 1; salvar(); i.value = t.normCfg(S.cfg).maxEquip; });
    em('[data-trcvet]', i => { pegar().vet[i.dataset.trcvet] = +i.value || 0; salvar(); i.value = t.normCfg(S.cfg).vet[i.dataset.trcvet]; });
    const tirar = (lista, id, rot) => {
      const tp = pegar(), l = tp[lista], ix = l.findIndex(x => x.id === id);
      if (ix < 0) return;
      const [it] = l.splice(ix, 1);
      salvar(); reabrir();
      FichasExtras.aviso(rot + ' “' + it.nome + '” saiu da lista.', 'Desfazer', () => { const tp2 = pegar(); if (!tp2[lista].some(x => x.id === it.id)) tp2[lista].splice(Math.min(ix, tp2[lista].length), 0, it); salvar(); reabrir(); });
    };
    m.querySelectorAll('[data-trceqx]').forEach(b => b.onclick = () => tirar('equip', b.dataset.trceqx, 'O equipamento'));
    m.querySelectorAll('[data-trcspx]').forEach(b => b.onclick = () => tirar('supr', b.dataset.trcspx, 'O suprimento'));
    const mais = (lista, pre, novo, foco) => { const tp = pegar(); if (tp[lista].length >= t.MAX.lista) return; const id = pre + uid(); tp[lista].push(Object.assign({ id }, novo)); salvar(); reabrir(); const n = document.querySelector('[' + foco + '="' + id + '"]'); if (n) { n.focus(); n.select(); } };
    const be = m.querySelector('[data-trceqmais]'); if (be) be.onclick = () => mais('equip', 'eq_', { nome: 'Equipamento novo', atq: 0, def: 0 }, 'data-trceqn');
    const bs = m.querySelector('[data-trcspmais]'); if (bs) bs.onclick = () => mais('supr', 'sp_', { nome: 'Suprimento novo', desc: '' }, 'data-trcspn');
  }

  return { tem, marca, htmlMais, htmlAba, ligar, criar, contas, htmlCfg, ligarCfg, htmlMontador, ligarMontador };
})();
