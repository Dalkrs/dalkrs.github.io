/* Tiny Cats · Fichas: a barra de XP e os quadros de Ascensão, Corpo e Missões.
     · XP         a barra junto do nível: XP, mínimo e máximo sempre editáveis; cheia, oferece "Subir de nível"
     · Ascensão   os pontos de cada tipo (os mesmos de Skills) num quadro para dar e tirar; gastar continua na árvore
     · Corpo      o boneco em 12 partes e os ferimentos abertos; a penalidade de um ferimento conta como um bônus
                  temporário enquanto ele existir (as contas são de TC.rules)
     · Missões    (lote 123) só o resumo das em andamento do personagem; o quadro, as do grupo e as de cada
                  personagem moram na aba Missões (tc/missoes.js)
   Como o resto de extras.js, isto lê as variáveis da calculadora (S, save, render, esc, uid…) só na hora de usar. */
const FichasQuadros = (() => {
  'use strict';
  const U = () => FichasExtras.util;
  const RR = () => (window.TC && TC.rules && TC.rules.ferimentos ? TC.rules : null);
  const aviso = (...a) => FichasExtras.aviso(...a);
  const mestre = () => FichasMesa.ativo() && FichasMesa.mestre();
  const trocar = (id, html, ligar, pc, focar) => {
    const velho = document.getElementById(id); if (!velho) return;
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const novo = tmp.firstElementChild; if (!novo) { velho.remove(); return; }
    velho.replaceWith(novo); ligar(novo.parentNode, pc);
    if (focar) { const el = novo.querySelector(focar); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  };
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

  /* ======================= a barra de XP ======================= */
  // (a de quem joga: a ficha de um jogador da mesa, ou a ficha em distribuição livre; e qualquer uma que já tenha XP)
  const usaXp = pc => !!RR() && !!RR().xpDe && (FichasMesa.deJogador(pc) || FichasExtras.ehLivre(pc) || !!(pc.estado && pc.estado.xp));
  const nx = v => String(Math.round(v * 10) / 10).replace('-', '−');
  let xpConf = null;                          // o personagem cuja barra está perguntando "subir de nível?"
  /* (lote 136, pedido do Dalmo) O histórico do XP: cada mudança fica em estado.xpHist (as 100 últimas), com a hora, o
     quanto, de quanto para quanto, e a subida de nível. Quem joga e o mestre veem (debaixo da barra, "Histórico"). */
  const HIST_MAX = 100;
  let xpHistAberto = null;                    // o personagem com o histórico aberto
  function registrarXp(pc, linha) {
    const e = U().estadoDe(pc), h = Array.isArray(e.xpHist) ? e.xpHist : [];
    h.push(Object.assign({ t: Date.now() }, linha));
    e.xpHist = h.slice(-HIST_MAX);
  }
  const quando = t => { const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function linhaXp(l) {
    const de = Number.isFinite(+l.a) && Number.isFinite(+l.v) ? ' (de ' + nx(+l.a) + ' para ' + nx(+l.v) + ')' : '';
    if (l.nv != null) return (l.desf ? 'Voltou para o nível ' : 'Subiu para o nível ') + esc(l.nv) + (de ? ' · XP' + de : '') + (l.desf ? ' — desfeito' : '');
    const d = +l.d || 0;
    return '<b class="' + (d < 0 ? 'neg' : 'pos') + '">' + (d < 0 ? '− ' : '+ ') + nx(Math.abs(d)) + ' XP</b>' + de + (l.desf ? ' — desfeito' : '');
  }
  function htmlHist(pc) {
    const h = pc.estado && Array.isArray(pc.estado.xpHist) ? pc.estado.xpHist.filter(l => l && typeof l === 'object' && Number.isFinite(+l.t)) : [];
    const aberto = xpHistAberto === pc.id;
    if (!h.length) return '<div class="xphist"><span class="hint">Histórico do XP: nada ainda. Cada XP dado ou tirado aparece aqui, com a hora.</span></div>';
    return `<div class="xphist"><button type="button" class="mini" id="xpHistBt" aria-expanded="${aberto}">${aberto ? '▾' : '▸'} Histórico do XP (${h.length})</button>
      ${aberto ? `<ol class="xphl">${h.slice().reverse().map(l => `<li><span class="xphq">${quando(+l.t)}</span> ${linhaXp(l)}</li>`).join('')}</ol>` : ''}</div>`;
  }
  // (lote 77) jog: a barra no modo Jogando (junto das barras; o mínimo e o máximo ficam no Editar; quem não mexe na
  // ficha só vê o número)
  function htmlXp(pc, jog) {
    if (!usaXp(pc)) return '';
    const R = RR(), x = R.xpDe(pc.estado, pc.level), pode = FichasMesa.podeEditar(pc);
    const prox = (+pc.level || 1) + 1, temProx = S.cfg.niveis.some(r => +r.lvl === prox);
    const depois = R.xpDe(R.subirNivelXp(pc.estado || {}, pc.level), prox), sobra = x.v > x.max;
    return `<div class="xpbox${jog ? ' xpjog' : ''}" id="xpBox" data-jog="${jog ? 1 : 0}">
      <div class="xprow">
        <span class="eyebrow">XP</span>
        <div class="xpbar ${x.cheia ? 'cheia' : ''}" role="img" aria-label="XP: ${nx(x.v)} de ${nx(x.max)}${x.cheia ? ', barra cheia' : ', faltam ' + nx(x.falta)}"><i style="width:${Math.round(x.fracao * 100)}%"></i></div>
        <span class="xpval"><input type="text" inputmode="numeric" id="f_xp" autocomplete="off" value="${nx(x.v)}" aria-label="XP atual" ${pode ? '' : 'readonly '}title="${pode ? 'O XP do personagem. Digite o valor, ou +50 e −20 para somar e subtrair do que ele tem.' : 'O XP do personagem'}"><small>/ ${nx(x.max)}</small></span>
        <span class="xpfalta">${x.cheia ? 'cheia' : 'faltam ' + nx(x.falta)}</span>
        <span class="xplim"><label>mín <input type="number" step="1" id="f_xpmin" value="${x.min}" aria-label="XP mínimo da barra"></label>
          <label>máx <input type="number" step="1" id="f_xpmax" value="${x.max}" aria-label="XP máximo da barra" title="${x.maxProprio ? 'Apague o campo para voltar ao de costume (10 por nível)' : 'O de costume: 10 por nível. Digite outro se quiser.'}"></label></span>
        ${x.cheia && pode ? `<button type="button" class="mini primary" id="xpSubir" ${temProx ? '' : 'disabled'} title="${temProx ? 'A barra está cheia' : 'A tabela de níveis vai só até o ' + esc(pc.level)}">Subir de nível</button>` : ''}
      </div>
      ${xpConf === pc.id && x.cheia && temProx && pode ? `<div class="relconf" role="group" aria-label="Confirmar a subida de nível">
        <span>Subir ${esc(pc.nome)} do nível ${esc(pc.level)} para o ${prox}? O XP ${sobra ? 'fica em ' + nx(depois.v) + ' (o que passou de ' + nx(x.max) + ')' : 'volta a ' + nx(depois.v)} e o máximo passa a ${nx(depois.max)}.</span>
        <button type="button" class="mini primary" id="xpSim">Subir</button><button type="button" class="mini" id="xpNao">Cancelar</button></div>` : ''}
      ${htmlHist(pc)}
    </div>`;
  }
  /* "35" troca o XP; "+50" e "−20" somam e subtraem. → { total, delta } ou null (não é número). */
  function lerXp(texto, atual) {
    const t = String(texto || '').replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(',', '.');
    const m = /^([+-]?)(\d+(?:\.\d+)?)$/.exec(t);
    if (!m) return null;
    const n = Math.round(+m[2] * 10) / 10;
    return m[1] ? { total: atual + (m[1] === '-' ? -n : n), delta: m[1] === '-' ? -n : n } : { total: n, delta: null };
  }
  function ligarXp(host, pc) {
    const box = U().q(host, '#xpBox'); if (!box) return;
    const R = RR(), xp = () => U().mapaDe(pc, 'xp'), agora = () => R.xpDe(pc.estado, pc.level);
    const pintar = focar => trocar('xpBox', htmlXp(pc, box.dataset.jog === '1'), ligarXp, pc, focar);
    const arrumar = () => { const e = U().estadoDe(pc); if (e.xp && !Object.keys(e.xp).length) delete e.xp; };
    const guardar = focar => { arrumar(); save(); pintar(focar); };
    // (o que muda ao sair de um campo é desenhado sem atrapalhar o clique ou o Tab que tirou o cursor dali)
    const guardarCampo = focar => { arrumar(); save(); U().desenhar(() => pintar(), focar); };
    const campo = U().q(box, '#f_xp');
    if (campo) {
      campo.onchange = () => {
        const antes = agora(), r = lerXp(campo.value, antes.v);
        if (!r) { U().desenhar(() => pintar(), '#f_xp'); return; }             // (o que não é número: o campo volta a mostrar o XP)
        const total = Math.max(antes.min, r.total);
        if (total === antes.v) { U().desenhar(() => pintar(), '#f_xp'); return; }
        const guardado = pc.estado && pc.estado.xp ? pc.estado.xp.v : undefined;
        xp().v = total; xpConf = null;
        registrarXp(pc, { d: Math.round((total - antes.v) * 10) / 10, a: antes.v, v: total });       // (lote 136)
        guardarCampo('#f_xp');
        const d = agora();
        const desfazer = () => { const ag = agora().v; if (guardado === undefined) delete xp().v; else xp().v = guardado; const vv = agora().v; if (vv !== ag) registrarXp(pc, { d: Math.round((vv - ag) * 10) / 10, a: ag, v: vv, desf: 1 }); guardar(); };
        aviso('XP de ' + pc.nome + ': ' + nx(antes.v) + (d.v - antes.v < 0 ? ' − ' : ' + ') + nx(Math.abs(d.v - antes.v)) + ' = ' + nx(d.v) + (d.cheia ? ' — barra cheia.' : ' (faltam ' + nx(d.falta) + ').'), 'Desfazer', desfazer);
      };
    }
    // mínimo e máximo: sempre à mão. Campo vazio volta ao de costume (mínimo 0; máximo 10 por nível).
    const limite = (sel, chave) => { const i = U().q(box, sel); if (!i) return; i.onchange = () => {
      const t = i.value.trim(), n = Math.round(+t * 10) / 10;
      if (t === '' || !Number.isFinite(n)) delete xp()[chave]; else xp()[chave] = n;
      const x = pc.estado.xp;                                   // (o máximo não fica abaixo do mínimo)
      if (x && Number.isFinite(+x.max) && +x.max < (Number.isFinite(+x.min) ? +x.min : 0)) x.max = Number.isFinite(+x.min) ? +x.min : 0;
      xpConf = null; guardarCampo(sel);
    }; };
    limite('#f_xpmin', 'min'); limite('#f_xpmax', 'max');
    const hb = U().q(box, '#xpHistBt');
    if (hb) hb.onclick = () => { xpHistAberto = xpHistAberto === pc.id ? null : pc.id; pintar('#xpHistBt'); };
    const subir = U().q(box, '#xpSubir');
    if (subir) subir.onclick = () => { xpConf = xpConf === pc.id ? null : pc.id; pintar(xpConf ? '#xpSim' : '#xpSubir'); };
    const nao = U().q(box, '#xpNao'); if (nao) nao.onclick = () => { xpConf = null; pintar('#xpSubir'); };
    const sim = U().q(box, '#xpSim');
    if (sim) sim.onclick = () => {
      const x = agora(), prox = (+pc.level || 1) + 1;
      xpConf = null;
      if (!x.cheia || !S.cfg.niveis.some(r => +r.lvl === prox)) { pintar(); return; }
      const antes = { level: pc.level, xp: pc.estado && pc.estado.xp ? JSON.parse(JSON.stringify(pc.estado.xp)) : null };
      pc.estado = R.subirNivelXp(pc.estado || {}, pc.level); pc.level = prox;
      registrarXp(pc, { nv: prox, a: x.v, v: agora().v });       // (lote 136)
      save(); render(); U().refocar('#f_xp');
      const d = agora();
      aviso(pc.nome + ' subiu para o nível ' + prox + '. XP: ' + nx(d.v) + ' de ' + nx(d.max) + '.', 'Desfazer', () => {
        const ag = agora().v;
        pc.level = antes.level; if (antes.xp) U().estadoDe(pc).xp = antes.xp; else if (pc.estado) delete pc.estado.xp;
        registrarXp(pc, { nv: antes.level, a: ag, v: agora().v, desf: 1 });
        save(); render();
      }, 12000);
    };
  }

  /* ======================= Ascensão ======================= */
  const tiposDePonto = () => (S.bib && Array.isArray(S.bib.pools) ? S.bib.pools.filter(p => p && p.id) : []);
  /* (lote 50) O teto do nível (TC.rules.contaDoTeto): Raça e Classe têm um teto que sobe com o nível; o que passa dele é o
     extraordinário (a ficha mostra, não trava). Os tipos sem teto, o mestre distribui: no quadro de Ascensão aparecem
     assim (comMestre); nos cartões da aba Skills, não aparecem. */
  const CLS_TETO = { abaixo: 'falta', no: 'certo', acima: 'extra', mestre: 'mestre' };
  function tetoHtml(pl, total, pc, comMestre) {
    const R = window.TC && TC.rules && TC.rules.contaDoTeto ? TC.rules : null;
    if (!R || !pl) return '';
    const c = R.contaDoTeto(pl, total, pc && pc.level);
    if (c.estado === 'mestre' && !comMestre) return '';
    return `<span class="ptscont ascteto ${CLS_TETO[c.estado]}" data-teto="${esc(pl.id)}" title="${esc(c.dica)}">${esc(c.txt)}</span>`;
  }
  /* (lote 108) A regra dos pontos, à vista: quanto cada tipo com teto dá no nível 1, quanto sobe por nível e o teto no
     nível do personagem — para o mestre conferir a ficha sem fazer conta. */
  function regraDosPontos(tipos, pc) {
    const R = window.TC && TC.rules && TC.rules.contaDoTeto ? TC.rules : null;
    if (!R) return '';
    const com = tipos.map(pl => ({ pl, c: R.contaDoTeto(pl, 0, pc && pc.level) })).filter(x => x.c.teto != null);
    if (!com.length) return '';
    const n = com[0].c.nivel;
    const regra = com.map(({ pl, c }) => `${esc(pl.nome || pl.id)}: ${Math.max(0, Math.floor(+pl.padrao || 0))} no nível 1, +${c.porNivel} por nível`).join(' · ');
    const agora = com.map(({ pl, c }) => `${esc(pl.nome || pl.id)} <strong>${c.teto}</strong>`).join(', ');
    return `<p class="hint ascregra" data-ascregra="1"><strong>Regra dos pontos.</strong> ${regra}. No nível ${n}, o teto é: ${agora}. Passar do teto só por feito extraordinário.</p>`;
  }
  function painelAscensao(pc) {
    const tipos = tiposDePonto();
    if (!tipos.length) {
      return FichasMesa.ativo() ? `<div class="panel" id="painelAsc" style="margin-bottom:18px"><div class="bd menteoff">
        <span class="hint"><strong>Ascensão.</strong> Esta mesa ainda não tem tipos de ponto: eles nascem com as árvores de habilidade, na aba Árvore.</span></div></div>` : '';
    }
    const sk = skillsDe(pc);
    return `<div class="panel" id="painelAsc" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Ascensão</span>
        <span class="hint" style="margin-left:8px">os pontos que o personagem tem para gastar nas árvores de habilidade</span>
        <span style="margin-left:auto"><button type="button" class="mini" data-ascir="1" title="Abrir Skills, onde os pontos são gastos">Gastar em Skills</button></span>
      </div>
      <div class="bd">${regraDosPontos(tipos, pc)}<div class="asclist">${tipos.map(pl => {
        const total = Math.max(0, Math.round(+sk.pontos[pl.id] || 0)), gasto = gastosPool(pc, pl.id), livre = total - gasto, id = esc(pl.id), nome = esc(pl.nome || pl.id);
        const teto = tetoHtml(pl, total, pc, true);
        return `<div class="ascrow" data-asc="${id}">
          <span class="ascnome"><span class="pooldot" style="background:${esc(pl.cor || '#888')}"></span>${nome}</span>
          <span class="ascpts">
            <button type="button" class="mini" data-ascstep="${id}|-1" title="Tirar 1 ponto" aria-label="Tirar 1 ponto de ${nome}" ${total <= 0 ? 'disabled' : ''}>−</button>
            <input type="number" min="0" step="1" data-asctot="${id}" value="${total}" aria-label="Pontos de ${nome} que o personagem tem">
            <button type="button" class="mini" data-ascstep="${id}|1" title="Dar 1 ponto" aria-label="Dar 1 ponto de ${nome}">+</button>
          </span>
          <span class="ascconta ${livre < 0 ? 'warn' : ''}">${plural(gasto, 'gasto', 'gastos')} · <strong>${livre}</strong> ${livre === 1 ? 'livre' : 'livres'}${livre < 0 ? ' — gastou mais do que tem' : ''}</span>${teto}
        </div>`;
      }).join('')}</div></div>
    </div>`;
  }
  function ligarAscensao(host, pc) {
    const painel = U().q(host, '#painelAsc'); if (!painel) return;
    const sk = () => skillsDe(pc);
    // (com Skills aberta logo abaixo, os mesmos números aparecem lá: a ficha é redesenhada inteira)
    // (lote 16: a Ascensão fica na aba Skills, junto das skills da árvore, que mostram os mesmos números: a ficha é redesenhada)
    const pintar = () => renderFicha();
    const guardar = (focar, campo) => { save(); if (campo) U().desenhar(pintar, focar && '#painelAsc ' + focar); else { pintar(); if (focar) U().refocar('#painelAsc ' + focar); } };
    const por = (pid, n, focar, campo) => {
      const antes = Math.max(0, Math.round(+sk().pontos[pid] || 0)), depois = Math.max(0, Math.round(+n || 0));
      if (antes === depois) { guardar(focar, campo); return; }
      sk().pontos[pid] = depois; guardar(focar, campo);
      const pl = tiposDePonto().find(x => x.id === pid), livre = depois - gastosPool(pc, pid);
      aviso((pl ? pl.nome : 'Pontos') + ' de ' + pc.nome + ': ' + antes + ' → ' + depois + ' (' + (livre === 1 ? '1 livre' : livre + ' livres') + ')', 'Desfazer', () => { sk().pontos[pid] = antes; guardar(); });
    };
    U().qa(painel, '[data-ascstep]').forEach(b => b.onclick = () => { const [pid, d] = b.dataset.ascstep.split('|'); por(pid, (+sk().pontos[pid] || 0) + (+d), '[data-ascstep="' + b.dataset.ascstep + '"]'); });
    U().qa(painel, '[data-asctot]').forEach(i => i.onchange = () => por(i.dataset.asctot, i.value, '[data-asctot="' + i.dataset.asctot + '"]', true));
    U().qa(painel, '[data-ascir]').forEach(b => b.onclick = () => { irParaAba('skills', '#painelSkills'); U().refocar('#ficha [data-abaficha="skills"]'); });
  }

  /* ======================= Corpo e ferimentos ======================= */
  /* O boneco, de frente: a direita do personagem fica à esquerda de quem olha. Cada parte: a forma e o centro
     (onde vai a conta dos ferimentos). */
  const FORMAS = {
    cabeca:  ['<ellipse class="pf" cx="70" cy="26" rx="17" ry="20"/>', 70, 26],
    pescoco: ['<rect class="pf" x="62" y="48" width="16" height="11" rx="4"/>', 70, 53.5],
    peito:   ['<path class="pf" d="M41 62H99Q108 62 107 71L102 113H38L33 71Q32 62 41 62Z"/>', 70, 88],
    abdomen: ['<path class="pf" d="M38 117H102L104 150Q104 160 95 160H45Q36 160 36 150Z"/>', 70, 139],
    bracoD:  ['<path class="pf" d="M21 65Q29 62 32 69L26 141H11Z"/>', 22, 104],
    maoD:    ['<ellipse class="pf" cx="17" cy="157" rx="9" ry="12"/>', 17, 157],
    bracoE:  ['<path class="pf" d="M119 65Q111 62 108 69L114 141H129Z"/>', 118, 104],
    maoE:    ['<ellipse class="pf" cx="123" cy="157" rx="9" ry="12"/>', 123, 157],
    pernaD:  ['<path class="pf" d="M38 164H68L64 258H44Z"/>', 53, 211],
    peD:     ['<path class="pf" d="M43 262H65L66 279Q66 286 59 286H35Q28 286 31 279Z"/>', 49, 274],
    pernaE:  ['<path class="pf" d="M102 164H72L76 258H96Z"/>', 87, 211],
    peE:     ['<path class="pf" d="M97 262H75L74 279Q74 286 81 286H105Q112 286 109 279Z"/>', 91, 274],
  };
  const corpoUI = { pc: null, parte: null, aberto: null, ampConf: null };       // o que está escolhido nesta tela
  const uiDe = pc => { if (corpoUI.pc !== pc.id) { corpoUI.pc = pc.id; corpoUI.parte = null; corpoUI.aberto = null; corpoUI.ampConf = null; } return corpoUI; };
  const feridasDe = pc => (RR() ? RR().ferimentos(pc.estado && pc.estado.fer).lista : []);
  // as partes amputadas (lote 6): um estado permanente do membro, que não é ferimento (as contas são de TC.rules)
  const ampDe = pc => (RR() && RR().amputados ? RR().amputados(pc.estado) : {});
  const usaCorpo = pc => !!RR() && (FichasMesa.deJogador(pc) || !!pc.usaCorpo || feridasDe(pc).length > 0 || Object.keys(ampDe(pc)).length > 0);
  const nomeParte = k => { const p = RR().PARTES.find(x => x.k === k); return p ? p.nome : k; };
  const FEM = { cabeca: 1, maoE: 1, maoD: 1, pernaE: 1, pernaD: 1 };
  const amputadoA = k => (FEM[k] ? 'amputada' : 'amputado');
  const GRAV = ['', 'leve', 'médio', 'grave'];
  function htmlBoneco(pc, lista, ui) {
    const por = {}, amp = ampDe(pc);
    lista.forEach(f => { (por[f.p] || (por[f.p] = [])).push(f); });
    // (o membro amputado fica só no contorno tracejado, hachurado; a parte de baixo que foi junto, também)
    return `<svg viewBox="0 0 140 300" role="group" aria-label="Corpo de ${esc(pc.nome)}"><defs><pattern id="hachuraAmp" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" class="ph"/></pattern></defs>${RR().PARTES.map(p => {
      const fs = por[p.k] || [], g = fs.reduce((m, f) => Math.max(m, f.g), 0), [forma, cx, cy] = FORMAS[p.k], a = amp[p.k];
      const rot = p.nome + ': ' + (a ? amputadoA(p.k) + (a.de ? ' (junto com ' + nomeParte(a.de).toLowerCase() + ')' : '') + (fs.length ? ' · ' : '') : '') + (fs.length ? plural(fs.length, 'ferimento', 'ferimentos') + ' (o mais grave: ' + GRAV[g] + ')' : a ? '' : 'sem ferimentos');
      return `<g class="parte ${g ? 'g' + g : ''} ${a ? 'amp' : ''} ${ui.parte === p.k ? 'sel' : ''}" data-parte="${p.k}" tabindex="0" role="button" aria-pressed="${ui.parte === p.k}" aria-label="${esc(rot)}"><title>${esc(rot)}</title>${forma}${
        fs.length ? `<circle class="pb" cx="${cx}" cy="${cy}" r="7.5"/><text class="pn" x="${cx}" y="${cy}">${fs.length}</text>` : ''}</g>`;
    }).join('')}<text class="plado" x="17" y="297">dir.</text><text class="plado" x="123" y="297">esq.</text></svg>`;
  }
  /* A amputação da parte escolhida: o que ela é (amputada, ou junto com a de cima) e, para quem mexe no corpo, marcar
     (pergunta antes: diz o que vai junto e quais ferimentos abertos saem) ou tirar a marca (com Desfazer). */
  function htmlAmputacao(pc, ui, pode, lista) {
    const R = RR(), k = ui.parte;
    if (!k || !R.AMPUTAVEIS || R.AMPUTAVEIS.indexOf(k) < 0) return '';
    const a = ampDe(pc)[k], nome = nomeParte(k);
    if (a && a.de) return `<div class="ampbox" data-ampde="${esc(k)}"><span class="amptag">${esc(amputadoA(k))}</span> junto com ${esc(nomeParte(a.de).toLowerCase())}</div>`;
    if (a) return `<div class="ampbox" data-ampsel="${esc(k)}"><span class="amptag">${esc(amputadoA(k))}</span>${a.n ? ` <span class="fernota">— ${esc(a.n)}</span>` : ''}
      <span class="hint">um estado permanente: não conta como ferimento, e o token não mostra o sinal de ferido por ele</span>
      ${pode ? `<button type="button" class="mini" data-ampdel="${esc(k)}" title="Tirar a marca de ${amputadoA(k)} (dá para desfazer)">Tirar a marca</button>` : ''}</div>`;
    if (!pode) return '';
    if (ui.ampConf !== k) return '';
    const baixo = R.ABAIXO[k], partes = [k].concat(baixo ? [baixo] : []), saem = lista.filter(f => partes.indexOf(f.p) >= 0);
    return `<div class="ampconf" role="group" aria-label="Confirmar a amputação">
      <span>Marcar ${FEM[k] ? 'a' : 'o'} ${esc(nome.toLowerCase())} como ${amputadoA(k)}? É um estado permanente: não conta como ferimento, e o token não mostra o sinal de ferido por ele.${baixo ? ' ' + (FEM[baixo] ? 'A ' : 'O ') + esc(nomeParte(baixo).toLowerCase()) + ' vai junto.' : ''}${saem.length ? ' ' + (saem.length === 1 ? 'O ferimento aberto daqui sai da lista' : 'Os ' + saem.length + ' ferimentos abertos daqui saem da lista') + ' (' + saem.map(f => esc(R.textoDoFerimento(f, true))).join('; ') + ').' : ''} Dá para desfazer.</span>
      <label class="f fnota"><span class="eyebrow">Anotação (se quiser)</span><input class="inm" data-ampnota="1" maxlength="200" placeholder="Como foi…"></label>
      <span class="ampbts"><button type="button" class="mini primary" data-ampsim="${esc(k)}">Marcar como ${amputadoA(k)}</button><button type="button" class="mini" data-ampnao="1">Cancelar</button></span>
    </div>`;
  }
  function htmlFerimento(pc, f, ui, pode) {
    const R = RR(), id = esc(f.id), aberto = ui.aberto === f.id && pode;
    const cab = `<div class="fercab">
      <span class="fergrav g${f.g}" aria-hidden="true"></span>
      <span class="fertxt">${esc(R.textoDoFerimento(f, ui.parte === f.p))}${f.n ? ` <span class="fernota">— ${esc(f.n)}</span>` : ''}</span>
      ${pode ? `<span class="ferbts"><button type="button" class="mini" data-ferabrir="${id}" aria-expanded="${aberto}">${aberto ? 'Fechar' : 'Editar'}</button>
        <button type="button" class="mini" data-fercura="${id}" title="O ferimento sarou: sai da lista (dá para desfazer)">Curado</button></span>` : ''}
    </div>`;
    if (!aberto) return `<div class="ferrow" data-fer="${id}">${cab}</div>`;
    const sel = (attr, lista, atual, rot) => `<label class="f"><span class="eyebrow">${rot}</span><select ${attr}="${id}">${lista.map(x => `<option value="${x.k}" ${String(atual) === String(x.k) ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</select></label>`;
    return `<div class="ferrow aberta" data-fer="${id}">${cab}
      <div class="fered">
        ${sel('data-ferp', R.PARTES, f.p, 'Onde')}
        ${sel('data-fert', R.TIPOS_FER, f.t, 'Tipo')}
        ${sel('data-ferg', R.GRAVIDADES, f.g, 'Gravidade')}
        <label class="f fpen"><span class="eyebrow">Penalidade</span><span class="penbox"><select data-ferk="${id}" aria-label="Onde a penalidade pesa">${U().optBonus(f.k, 'sem penalidade')}</select>
          <span class="penmenos" aria-hidden="true">−</span><input type="number" min="0" step="1" data-ferv="${id}" value="${Math.abs(f.v)}" aria-label="De quanto é a penalidade" ${f.k ? '' : 'disabled'}></span></label>
        <div class="ferest" role="group" aria-label="Estado do ferimento">${R.ESTADOS_FER.map(e => `<label class="chk"><input type="checkbox" data-fers="${id}|${e.k}" ${f.s[e.k] ? 'checked' : ''}> <span>${esc(e.nome)}</span></label>`).join('')}</div>
        <label class="f fnota"><span class="eyebrow">Anotação</span><input class="inm" data-fern="${id}" value="${esc(f.n)}" maxlength="200" placeholder="Como foi, o que já foi feito…"></label>
      </div>
    </div>`;
  }
  /* O cadeado dos ferimentos (o mestre, ficha por ficha): travado, só ele põe, edita e tira (cura) ferimentos. Fica no
     estado da ficha (estado.ferTrava), que se junta campo a campo: o que o jogador grava na ficha não o desfaz. */
  const LACRE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const ferTravado = pc => !!(pc && pc.estado && pc.estado.ferTrava);
  const mestreAqui = () => FichasMesa.ativo() && FichasMesa.mestre();
  function painelCorpo(pc) {
    if (!RR()) return '';
    if (!usaCorpo(pc)) {
      return `<div class="panel" id="painelCorpo" style="margin-bottom:18px"><div class="bd menteoff">
        <span class="hint">Corpo e ferimentos não estão em uso nesta ficha.</span>
        <button type="button" class="mini" data-corpo="usar">Usar nesta ficha</button></div></div>`;
    }
    const trava = ferTravado(pc), lista = feridasDe(pc), ui = uiDe(pc), pode = FichasMesa.podeEditar(pc) && (!trava || mestreAqui());
    const visiveis = ui.parte ? lista.filter(f => f.p === ui.parte) : lista;
    const pesam = lista.filter(f => f.k && f.v).length;
    const amp = ampDe(pc), nAmp = Object.keys(amp).filter(k => !amp[k].de).length, aqui = ui.parte ? amp[ui.parte] : null;
    const resumo = [lista.length ? plural(lista.length, 'ferimento aberto', 'ferimentos abertos') + (pesam ? ' · ' + plural(pesam, 'com penalidade somando agora', 'com penalidade somando agora') : '') : '', nAmp ? plural(nAmp, 'membro amputado', 'membros amputados') : ''].filter(Boolean).join(' · ');
    return `<div class="panel" id="painelCorpo" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Corpo e ferimentos</span>
        <span class="hint" style="margin-left:8px">${resumo || 'clique numa parte do corpo para marcar um ferimento'}</span>
        <span style="margin-left:auto;display:flex;gap:6px;align-items:center">
          ${mestreAqui() ? `<button type="button" class="mini ${trava ? 'on' : ''}" data-fertrava="1" aria-pressed="${trava}" title="${trava ? 'Travado: só você põe, edita e tira ferimentos desta ficha. Clique para destravar.' : 'Travar: só você vai poder pôr, editar e tirar ferimentos desta ficha.'}">${LACRE} ${trava ? 'Travado' : 'Travar'}</button>`
            : trava ? `<span class="tagseg" title="Só o mestre põe, edita e tira ferimentos desta ficha">${LACRE} travado pelo mestre</span>` : ''}
          ${FichasMesa.deJogador(pc) ? '' : '<button type="button" class="mini" data-corpo="parar" title="Esta ficha deixa de mostrar o corpo (os ferimentos saem)">Deixar de usar</button>'}
        </span>
      </div>
      <div class="bd corpo2">
        <div class="boneco">${htmlBoneco(pc, lista, ui)}</div>
        <div class="ferlado">
          <div class="ferhd">
            <span class="fertit">${ui.parte ? esc(nomeParte(ui.parte)) : 'Todos os ferimentos'}</span>
            ${ui.parte ? '<button type="button" class="mini" data-fertodos="1">Ver todos</button>' : ''}
            ${pode && ui.parte && !aqui && RR().AMPUTAVEIS && RR().AMPUTAVEIS.indexOf(ui.parte) >= 0 ? `<button type="button" class="mini" data-ampini="${esc(ui.parte)}" style="margin-left:auto" aria-expanded="${ui.ampConf === ui.parte}" title="Marcar este membro como ${amputadoA(ui.parte)}: um estado permanente, que não é ferimento (pergunta antes)">${FEM[ui.parte] ? 'Amputada…' : 'Amputado…'}</button>` : ''}
            ${pode ? `<button type="button" class="mini primary" data-fernovo="1" style="margin-left:${pode && ui.parte && !aqui && RR().AMPUTAVEIS && RR().AMPUTAVEIS.indexOf(ui.parte) >= 0 ? '0' : 'auto'}" ${!ui.parte ? 'disabled title="Escolha antes uma parte do corpo, no boneco"' : aqui && aqui.de ? 'disabled title="Esta parte foi amputada junto com a de cima"' : ''}>+ Ferimento</button>` : ''}
          </div>
          ${htmlAmputacao(pc, ui, pode, lista)}
          ${visiveis.length ? `<div class="ferlist">${visiveis.map(f => htmlFerimento(pc, f, ui, pode)).join('')}</div>`
            : `<div class="hint">${ui.parte ? 'Nenhum ferimento aqui.' + (pode ? ' Use “+ Ferimento” para marcar um.' : '') : 'Sem ferimentos. Clique numa parte do boneco para escolher onde, e então em “+ Ferimento”.'}</div>`}
          ${pesam ? '<div class="hint fernota2">A penalidade de um ferimento conta nos atributos enquanto ele estiver aberto (aparece na coluna “Temp.”). “Curado” tira o ferimento e a penalidade.</div>' : ''}
        </div>
      </div>
    </div>`;
  }
  function ligarCorpo(host, pc) {
    const painel = U().q(host, '#painelCorpo'); if (!painel) return;
    const ui = uiDe(pc), fer = () => U().mapaDe(pc, 'fer');
    const pintar = focar => trocar('painelCorpo', painelCorpo(pc), ligarCorpo, pc, focar);
    // o que mexe nas contas (penalidade, ferimento que entra ou sai) redesenha a ficha; o resto, só o quadro
    const guardar = (focar, contas, campo) => {
      const e = U().estadoDe(pc); if (e.fer && !Object.keys(e.fer).length) delete e.fer;
      save();
      if (campo) U().desenhar(contas ? render : () => pintar(), focar && '#painelCorpo ' + focar);      // (saindo de um campo: sem atrapalhar o clique ou o Tab)
      else if (contas) { render(); if (focar) U().refocar('#painelCorpo ' + focar); } else pintar(focar);
    };
    U().qa(painel, '[data-fertrava]').forEach(b => b.onclick = () => {
      if (!mestreAqui()) return;
      const travar = on => { const e = U().estadoDe(pc); if (on) e.ferTrava = 1; else delete e.ferTrava; save(); pintar('[data-fertrava]'); };
      const on = !ferTravado(pc);
      travar(on);
      aviso(on ? 'Ferimentos de ' + pc.nome + ' travados: só você põe, edita e tira.' : 'Ferimentos de ' + pc.nome + ' destravados: quem controla a ficha também mexe neles.', 'Desfazer', () => travar(!on));
    });
    U().qa(painel, '[data-corpo]').forEach(b => b.onclick = () => {
      if (b.dataset.corpo === 'usar') { pc.usaCorpo = 1; guardar(); return; }
      const antes = { usa: pc.usaCorpo, fer: pc.estado && pc.estado.fer, amp: pc.estado && pc.estado.amp };
      delete pc.usaCorpo; if (pc.estado) { delete pc.estado.fer; delete pc.estado.amp; }
      guardar(null, true);
      aviso('O corpo e os ferimentos saíram desta ficha.', 'Desfazer', () => { if (antes.usa) pc.usaCorpo = antes.usa; if (antes.fer) U().estadoDe(pc).fer = antes.fer; if (antes.amp) U().estadoDe(pc).amp = antes.amp; if (!antes.usa && !antes.fer && !antes.amp) pc.usaCorpo = 1; guardar(null, true); });
    });
    // a amputação: perguntar (com o que vai junto e os ferimentos que saem), marcar, tirar a marca — tudo com Desfazer
    const copiaJ = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
    const repor = antes => { const e = U().estadoDe(pc); if (antes.amp === undefined) delete e.amp; else e.amp = antes.amp; if (antes.fer === undefined) delete e.fer; else e.fer = antes.fer; guardar(null, true); };
    U().qa(painel, '[data-ampini]').forEach(b => b.onclick = () => { const k = b.dataset.ampini; ui.ampConf = ui.ampConf === k ? null : k; pintar(ui.ampConf ? '[data-ampnota]' : '[data-ampini]'); });
    U().qa(painel, '[data-ampnao]').forEach(b => b.onclick = () => { ui.ampConf = null; pintar('[data-ampini]'); });
    U().qa(painel, '[data-ampsim]').forEach(b => b.onclick = () => {
      const k = b.dataset.ampsim, R = RR(); if (!R.AMPUTAVEIS || R.AMPUTAVEIS.indexOf(k) < 0) return;
      const e = U().estadoDe(pc), antes = { amp: copiaJ(e.amp), fer: copiaJ(e.fer) };
      const nota = ((U().q(painel, '[data-ampnota]') || {}).value || '').trim().slice(0, 200);
      const partes = [k].concat(R.ABAIXO[k] ? [R.ABAIXO[k]] : []);
      e.amp = Object.assign({}, e.amp && typeof e.amp === 'object' ? e.amp : {}, { [k]: nota ? { c: Date.now(), n: nota } : { c: Date.now() } });
      let saiu = 0;
      if (e.fer && typeof e.fer === 'object') for (const id of Object.keys(e.fer)) if (e.fer[id] && partes.indexOf(e.fer[id].p) >= 0) { delete e.fer[id]; saiu++; }
      ui.ampConf = null; ui.aberto = null;
      guardar(null, true);
      aviso((FEM[k] ? 'A ' : 'O ') + nomeParte(k).toLowerCase() + ' de ' + (pc.nome || 'quem joga') + ' ficou marcad' + (FEM[k] ? 'a' : 'o') + ' como ' + amputadoA(k) + (saiu ? (saiu === 1 ? '; o ferimento aberto dali saiu' : '; os ' + saiu + ' ferimentos abertos dali saíram') : '') + '.', 'Desfazer', () => repor(antes));
    });
    U().qa(painel, '[data-ampdel]').forEach(b => b.onclick = () => {
      const k = b.dataset.ampdel, e = U().estadoDe(pc); if (!e.amp || !e.amp[k]) return;
      const antes = { amp: copiaJ(e.amp), fer: copiaJ(e.fer) };
      const amp = Object.assign({}, e.amp); delete amp[k];
      if (Object.keys(amp).length) e.amp = amp; else delete e.amp;
      guardar(null, true);
      aviso('A marca de ' + amputadoA(k) + ' saiu d' + (FEM[k] ? 'a ' : 'o ') + nomeParte(k).toLowerCase() + '.', 'Desfazer', () => repor(antes));
    });
    const escolher = k => { ui.parte = ui.parte === k ? null : k; ui.aberto = null; ui.ampConf = null; pintar('[data-parte="' + k + '"]'); };
    U().qa(painel, '[data-parte]').forEach(g => {
      g.onclick = () => escolher(g.dataset.parte);
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(g.dataset.parte); } };
    });
    U().qa(painel, '[data-fertodos]').forEach(b => b.onclick = () => { ui.parte = null; ui.aberto = null; ui.ampConf = null; pintar(); });
    U().qa(painel, '[data-fernovo]').forEach(b => b.onclick = () => {
      if (!ui.parte) return;
      const id = 'f' + uid(); fer()[id] = { p: ui.parte, t: 'corte', g: 1, c: Date.now() }; ui.aberto = id;
      guardar('[data-fert="' + id + '"]', false);
    });
    U().qa(painel, '[data-ferabrir]').forEach(b => b.onclick = () => { ui.aberto = ui.aberto === b.dataset.ferabrir ? null : b.dataset.ferabrir; pintar('[data-ferabrir="' + b.dataset.ferabrir + '"]'); });
    U().qa(painel, '[data-fercura]').forEach(b => b.onclick = () => {
      const id = b.dataset.fercura, fora = fer()[id]; if (!fora) return;
      const texto = RR().textoDoFerimento(RR().ferimentos({ x: fora }).lista[0] || { t: 'corte', g: 1, p: fora.p, s: {} });
      delete fer()[id]; if (ui.aberto === id) ui.aberto = null;
      guardar(null, !!(fora.k && fora.v));
      aviso('Curado: ' + texto + '.', 'Desfazer', () => { fer()[id] = fora; guardar(null, !!(fora.k && fora.v)); });
    });
    const campo = (attr, fn, contas) => U().qa(painel, '[' + attr + ']').forEach(el => el.onchange = () => { const f = fer()[el.getAttribute(attr).split('|')[0]]; if (!f) return; fn(f, el); guardar('[' + attr + '="' + el.getAttribute(attr) + '"]', contas, el.tagName === 'INPUT' && el.type !== 'checkbox'); });
    campo('data-ferp', (f, el) => { f.p = el.value; if (ui.parte) ui.parte = el.value; });
    campo('data-fert', (f, el) => { f.t = el.value; });
    campo('data-ferg', (f, el) => { f.g = Math.min(3, Math.max(1, +el.value || 1)); });
    campo('data-ferk', (f, el) => { if (el.value) { f.k = el.value; if (!f.v) f.v = -1; } else { delete f.k; delete f.v; } }, true);
    campo('data-ferv', (f, el) => { const n = Math.min(999, Math.abs(Math.round((+el.value || 0) * 10) / 10)); if (n) f.v = -n; else delete f.v; }, true);
    campo('data-fers', (f, el) => { const k = el.dataset.fers.split('|')[1], s = f.s && typeof f.s === 'object' ? f.s : (f.s = {}); if (el.checked) s[k] = 1; else delete s[k]; if (!Object.keys(s).length) delete f.s; });
    // a anotação é guardada enquanto se escreve, e a linha do ferimento acompanha no lugar (nada é redesenhado: o
    // campo não perde o cursor, e o clique seguinte não cai no vazio)
    U().qa(painel, '[data-fern]').forEach(i => { i.oninput = () => {
      const f = fer()[i.dataset.fern]; if (!f) return;
      const t = i.value.slice(0, 200); if (t) f.n = t; else delete f.n; save();
      const linha = i.closest('.ferrow'), txt = linha && linha.querySelector('.fertxt'); if (!txt) return;
      let nota = txt.querySelector('.fernota');
      if (!t) { if (nota) nota.remove(); return; }
      if (!nota) { nota = document.createElement('span'); nota.className = 'fernota'; txt.append(' ', nota); }
      nota.textContent = '— ' + t;
    }; });
  }
  // para o quadro de bônus temporários: o que os ferimentos estão tirando agora
  function htmlPenalidades(c) {
    if (!RR() || !c || !c.ferimentos) return '';
    const com = c.ferimentos.filter(f => f.k && f.v);
    if (!com.length) return '';
    return `<div class="tmpfer"><span class="eyebrow">Dos ferimentos</span>${com.map(f => `<span class="chipfer" title="Conta enquanto o ferimento estiver aberto (quadro Corpo e ferimentos)">${esc(RR().textoDoFerimento(f))}</span>`).join('')}</div>`;
  }

  /* ======================= Missões ======================= */
  /* (lote 123) As missões moram na aba Missões (o quadro da campanha, as do grupo e as de cada personagem: ver
     tc/missoes.js). A ficha mostra só o resumo — as em andamento deste personagem, com os objetivos — e o caminho
     para a aba. Enquanto quem mestra ainda não abriu a aba Missões (as de antes ainda não foram copiadas para lá), o
     resumo é o das que estavam na ficha (as à mostra). */
  const MM = () => (window.TC && window.TC.missoes) || null;
  const naMesaMis = () => FichasMesa.ativo() && !!(window.TC && TC.dados && TC.dados.disponivel && TC.dados.disponivel());
  function lerMis() {
    if (naMesaMis()) { const D = TC.dados.col('documentos'); return id => { const d = D.pegar(id); return d && !d.apagado ? d.dados : null; }; }
    let l = {}; try { l = JSON.parse(localStorage.getItem('tinycats:missoes:local') || '{}') || {}; } catch (e) { l = {}; }
    return id => l[id] || null;
  }
  // com campanhas, as missões do grupo são as da campanha da ficha (a ficha do mundo: as da campanha em vista)
  const campDasMissoes = pc => { const cs = FichasMesa.campanhas(); if (!cs.length) return ''; const c = (pc && pc._camp) || FichasMesa.campEmVista() || ''; return cs.some(x => x.id === c) ? c : ''; };
  function resumoDe(pc) {
    const M = MM(); if (!M || !pc) return [];
    const ler = lerMis(), c = campDasMissoes(pc), Q = ler(M.comCamp(M.QUADRO, c));
    const Pd = ler(M.PRE_PC + pc.id);
    if (Q && Q.mig && Pd && Pd.mig) return M.resumo(Q, Pd, pc.id);
    // (o que ainda não veio — o quadro, ou as deste personagem — entra como estava na ficha)
    const grupo = Q && Q.mig ? null : c ? (S.missoesCamp && S.missoesCamp[c]) : S.missoes;
    const r = M.migrar({ grupo, pcs: [{ id: pc.id, mis: Pd && Pd.mig ? null : pc.estado && pc.estado.mis }] }, Q, null, { [pc.id]: Pd });
    return M.resumo(r.quadro, r.pcs[pc.id], pc.id);
  }
  const contaAtivas = pc => resumoDe(pc).length;
  const DE_ONDE = { grupo: 'do grupo', pc: 'da história', um: 'do quadro', todos: 'do quadro' };
  function blocoMissoes(pc) {
    if (!MM()) return '<div id="blocoMissoes" class="hint">As missões precisam do site inteiro.</div>';
    const l = resumoDe(pc);
    return `<div id="blocoMissoes">
      ${l.length ? `<div class="mislist">${l.map(m => `<div class="miscard e-ativa"><div class="mishd misres">
          <span class="mistit">${esc(m.t)}</span>${m.total ? `<span class="misprog" title="Objetivos feitos">${m.feitos}/${m.total}</span>` : ''}<span class="misde">${DE_ONDE[m.quem] || ''}</span></div>
          ${m.objs.length ? `<ul class="misobjs ro">${m.objs.map(o => `<li class="${o.ok ? 'ok' : ''}"><span class="mischeck" aria-hidden="true">${o.ok ? '✓' : '○'}</span><span>${esc(o.t)}</span><span class="sr">${o.ok ? ' (feito)' : ' (por fazer)'}</span></li>`).join('')}</ul>` : ''}
        </div>`).join('')}</div>` : '<div class="hint">Nenhuma missão em andamento.</div>'}
      <div class="misacoes"><button type="button" class="mini primary" data-misir>Abrir as missões</button><span class="hint">O quadro, as do grupo e as de cada personagem ficam na aba Missões.</span></div>
    </div>`;
  }
  let pcMis = null, ouvindoMis = false;
  function ligarMissoes(host, pc) {
    const bloco = U().q(host, '#blocoMissoes'); if (!bloco) return;
    pcMis = pc;
    const ir = U().q(bloco, '[data-misir]');
    if (ir) ir.onclick = () => { const P = window.TC && TC.ponte; if (!(P && P.ir && P.ir('missoes', { pc: pc.id }))) window.open('../missoes/', '_blank'); };
    // o que muda na aba Missões (ou em outro aparelho) chega aqui: o resumo e a marca da aba acompanham
    if (!ouvindoMis && naMesaMis()) {
      ouvindoMis = true;
      TC.dados.col('documentos').aoMudar(l => {
        if (!l || typeof l.id !== 'string' || !l.id.startsWith('fichas:mis:') || !pcMis) return;
        if (document.getElementById('blocoMissoes')) trocar('blocoMissoes', blocoMissoes(pcMis), ligarMissoes, pcMis);
        pintarMarca(pcMis);
      });
    }
  }
  // a marca da aba (quantas missões ativas), sem redesenhar a ficha
  function pintarMarca(pc) {
    const b = document.querySelector('#ficha [data-abaficha="notas"]'); if (!b) return;
    const n = contaAtivas(pc); let mk = b.querySelector('.mk');
    if (!n) { if (mk) mk.remove(); return; }
    if (!mk) { mk = document.createElement('span'); mk.className = 'mk'; b.append(' ', mk); }
    mk.textContent = n;
  }

  /* Chegou mudança de fora enquanto a pessoa digita noutro lugar da ficha: os quadros em que ela não está são
     redesenhados no lugar (o que ela está usando espera ela sair). */
  function aoVivo(pc) {
    const foco = document.activeElement, livre = id => { const n = document.getElementById(id); return !!n && !n.contains(foco); };
    if (livre('xpBox')) trocar('xpBox', htmlXp(pc, document.getElementById('xpBox').dataset.jog === '1'), ligarXp, pc);
    if (livre('painelAsc')) trocar('painelAsc', painelAscensao(pc), ligarAscensao, pc);
    if (livre('painelCorpo')) trocar('painelCorpo', painelCorpo(pc), ligarCorpo, pc);
    if (livre('blocoMissoes')) trocar('blocoMissoes', blocoMissoes(pc), ligarMissoes, pc);
    pintarMarca(pc);
  }
  function ligar(host, pc) { ligarXp(host, pc); ligarAscensao(host, pc); ligarCorpo(host, pc); ligarMissoes(host, pc); }
  // (lote 16) os ferimentos abertos, por extenso, para o resumo da ficha
  const feridasAbertas = pc => feridasDe(pc).map(f => RR().textoDoFerimento(f));
  return { htmlXp, painelAscensao, tetoHtml, painelCorpo, htmlPenalidades, blocoMissoes, contaAtivas, ligar, aoVivo, usaCorpo, usaXp, feridasAbertas };
})();
