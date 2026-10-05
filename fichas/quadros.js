/* Tiny Cats · Fichas: a barra de XP e os quadros de Ascensão, Corpo e Missões.
     · XP         a barra junto do nível: XP, mínimo e máximo sempre editáveis; cheia, oferece "Subir de nível"
     · Ascensão   os pontos de cada tipo (os mesmos de Skills) num quadro para dar e tirar; gastar continua na árvore
     · Corpo      o boneco em 12 partes e os ferimentos abertos; a penalidade de um ferimento conta como um bônus
                  temporário enquanto ele existir (as contas são de TC.rules)
     · Missões    as do grupo (um documento da mesa, que o mestre escreve), as de cada personagem (no estado da
                  ficha: dadas pelo mestre ou criadas pelo jogador) e as que o mestre ainda não revelou (com ele)
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
  function htmlXp(pc) {
    if (!usaXp(pc)) return '';
    const R = RR(), x = R.xpDe(pc.estado, pc.level), pode = FichasMesa.podeEditar(pc);
    const prox = (+pc.level || 1) + 1, temProx = S.cfg.niveis.some(r => +r.lvl === prox);
    const depois = R.xpDe(R.subirNivelXp(pc.estado || {}, pc.level), prox), sobra = x.v > x.max;
    return `<div class="xpbox" id="xpBox">
      <div class="xprow">
        <span class="eyebrow">XP</span>
        <div class="xpbar ${x.cheia ? 'cheia' : ''}" role="img" aria-label="XP: ${nx(x.v)} de ${nx(x.max)}${x.cheia ? ', barra cheia' : ', faltam ' + nx(x.falta)}"><i style="width:${Math.round(x.fracao * 100)}%"></i></div>
        <span class="xpval"><input type="text" inputmode="numeric" id="f_xp" autocomplete="off" value="${nx(x.v)}" aria-label="XP atual" title="O XP do personagem. Digite o valor, ou +50 e −20 para somar e subtrair do que ele tem."><small>/ ${nx(x.max)}</small></span>
        <span class="xpfalta">${x.cheia ? 'cheia' : 'faltam ' + nx(x.falta)}</span>
        <span class="xplim"><label>mín <input type="number" step="1" id="f_xpmin" value="${x.min}" aria-label="XP mínimo da barra"></label>
          <label>máx <input type="number" step="1" id="f_xpmax" value="${x.max}" aria-label="XP máximo da barra" title="${x.maxProprio ? 'Apague o campo para voltar ao de costume (10 por nível)' : 'O de costume: 10 por nível. Digite outro se quiser.'}"></label></span>
        ${x.cheia && pode ? `<button type="button" class="mini primary" id="xpSubir" ${temProx ? '' : 'disabled'} title="${temProx ? 'A barra está cheia' : 'A tabela de níveis vai só até o ' + esc(pc.level)}">Subir de nível</button>` : ''}
      </div>
      ${xpConf === pc.id && x.cheia && temProx && pode ? `<div class="relconf" role="group" aria-label="Confirmar a subida de nível">
        <span>Subir ${esc(pc.nome)} do nível ${esc(pc.level)} para o ${prox}? O XP ${sobra ? 'fica em ' + nx(depois.v) + ' (o que passou de ' + nx(x.max) + ')' : 'volta a ' + nx(depois.v)} e o máximo passa a ${nx(depois.max)}.</span>
        <button type="button" class="mini primary" id="xpSim">Subir</button><button type="button" class="mini" id="xpNao">Cancelar</button></div>` : ''}
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
    const pintar = focar => trocar('xpBox', htmlXp(pc), ligarXp, pc, focar);
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
        xp().v = total; xpConf = null; guardarCampo('#f_xp');
        const d = agora();
        if (r.delta != null) aviso('XP de ' + pc.nome + ': ' + nx(antes.v) + (r.delta < 0 ? ' − ' : ' + ') + nx(Math.abs(r.delta)) + ' = ' + nx(d.v) + (d.cheia ? ' — barra cheia.' : ' (faltam ' + nx(d.falta) + ').'), 'Desfazer', () => { if (guardado === undefined) delete xp().v; else xp().v = guardado; guardar(); });
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
      save(); render(); U().refocar('#f_xp');
      const d = agora();
      aviso(pc.nome + ' subiu para o nível ' + prox + '. XP: ' + nx(d.v) + ' de ' + nx(d.max) + '.', 'Desfazer', () => {
        pc.level = antes.level; if (antes.xp) U().estadoDe(pc).xp = antes.xp; else if (pc.estado) delete pc.estado.xp;
        save(); render();
      }, 12000);
    };
  }

  /* ======================= Ascensão ======================= */
  const tiposDePonto = () => (S.bib && Array.isArray(S.bib.pools) ? S.bib.pools.filter(p => p && p.id) : []);
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
      <div class="bd"><div class="asclist">${tipos.map(pl => {
        const total = Math.max(0, Math.round(+sk.pontos[pl.id] || 0)), gasto = gastosPool(pc, pl.id), livre = total - gasto, id = esc(pl.id), nome = esc(pl.nome || pl.id);
        return `<div class="ascrow" data-asc="${id}">
          <span class="ascnome"><span class="pooldot" style="background:${esc(pl.cor || '#888')}"></span>${nome}</span>
          <span class="ascpts">
            <button type="button" class="mini" data-ascstep="${id}|-1" title="Tirar 1 ponto" aria-label="Tirar 1 ponto de ${nome}" ${total <= 0 ? 'disabled' : ''}>−</button>
            <input type="number" min="0" step="1" data-asctot="${id}" value="${total}" aria-label="Pontos de ${nome} que o personagem tem">
            <button type="button" class="mini" data-ascstep="${id}|1" title="Dar 1 ponto" aria-label="Dar 1 ponto de ${nome}">+</button>
          </span>
          <span class="ascconta ${livre < 0 ? 'warn' : ''}">${plural(gasto, 'gasto', 'gastos')} · <strong>${livre}</strong> ${livre === 1 ? 'livre' : 'livres'}${livre < 0 ? ' — gastou mais do que tem' : ''}</span>
        </div>`;
      }).join('')}</div></div>
    </div>`;
  }
  function ligarAscensao(host, pc) {
    const painel = U().q(host, '#painelAsc'); if (!painel) return;
    const sk = () => skillsDe(pc);
    // (com Skills aberta logo abaixo, os mesmos números aparecem lá: a ficha é redesenhada inteira)
    const pintar = () => { if ((S.abaFicha || 'estaque') === 'skills') renderFicha(); else trocar('painelAsc', painelAscensao(pc), ligarAscensao, pc); };
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
    U().qa(painel, '[data-ascir]').forEach(b => b.onclick = () => {
      S.abaFicha = 'skills'; save(); renderFicha();
      const alvo = document.querySelector('#ficha .subtabs'); if (alvo) alvo.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      U().refocar('#ficha [data-sub="skills"]');
    });
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
  const corpoUI = { pc: null, parte: null, aberto: null };       // o que está escolhido nesta tela
  const uiDe = pc => { if (corpoUI.pc !== pc.id) { corpoUI.pc = pc.id; corpoUI.parte = null; corpoUI.aberto = null; } return corpoUI; };
  const feridasDe = pc => (RR() ? RR().ferimentos(pc.estado && pc.estado.fer).lista : []);
  const usaCorpo = pc => !!RR() && (FichasMesa.deJogador(pc) || !!pc.usaCorpo || feridasDe(pc).length > 0);
  const nomeParte = k => { const p = RR().PARTES.find(x => x.k === k); return p ? p.nome : k; };
  const GRAV = ['', 'leve', 'médio', 'grave'];
  function htmlBoneco(pc, lista, ui) {
    const por = {};
    lista.forEach(f => { (por[f.p] || (por[f.p] = [])).push(f); });
    return `<svg viewBox="0 0 140 300" role="group" aria-label="Corpo de ${esc(pc.nome)}">${RR().PARTES.map(p => {
      const fs = por[p.k] || [], g = fs.reduce((m, f) => Math.max(m, f.g), 0), [forma, cx, cy] = FORMAS[p.k];
      const rot = p.nome + ': ' + (fs.length ? plural(fs.length, 'ferimento', 'ferimentos') + ' (o mais grave: ' + GRAV[g] + ')' : 'sem ferimentos');
      return `<g class="parte ${g ? 'g' + g : ''} ${ui.parte === p.k ? 'sel' : ''}" data-parte="${p.k}" tabindex="0" role="button" aria-pressed="${ui.parte === p.k}" aria-label="${esc(rot)}"><title>${esc(rot)}</title>${forma}${
        fs.length ? `<circle class="pb" cx="${cx}" cy="${cy}" r="7.5"/><text class="pn" x="${cx}" y="${cy}">${fs.length}</text>` : ''}</g>`;
    }).join('')}<text class="plado" x="17" y="297">dir.</text><text class="plado" x="123" y="297">esq.</text></svg>`;
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
  function painelCorpo(pc) {
    if (!RR()) return '';
    if (!usaCorpo(pc)) {
      return `<div class="panel" id="painelCorpo" style="margin-bottom:18px"><div class="bd menteoff">
        <span class="hint">Corpo e ferimentos não estão em uso nesta ficha.</span>
        <button type="button" class="mini" data-corpo="usar">Usar nesta ficha</button></div></div>`;
    }
    const lista = feridasDe(pc), ui = uiDe(pc), pode = FichasMesa.podeEditar(pc);
    const visiveis = ui.parte ? lista.filter(f => f.p === ui.parte) : lista;
    const pesam = lista.filter(f => f.k && f.v).length;
    return `<div class="panel" id="painelCorpo" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Corpo e ferimentos</span>
        <span class="hint" style="margin-left:8px">${lista.length ? plural(lista.length, 'ferimento aberto', 'ferimentos abertos') + (pesam ? ' · ' + plural(pesam, 'com penalidade somando agora', 'com penalidade somando agora') : '') : 'clique numa parte do corpo para marcar um ferimento'}</span>
        ${FichasMesa.deJogador(pc) ? '' : '<span style="margin-left:auto"><button type="button" class="mini" data-corpo="parar" title="Esta ficha deixa de mostrar o corpo (os ferimentos saem)">Deixar de usar</button></span>'}
      </div>
      <div class="bd corpo2">
        <div class="boneco">${htmlBoneco(pc, lista, ui)}</div>
        <div class="ferlado">
          <div class="ferhd">
            <span class="fertit">${ui.parte ? esc(nomeParte(ui.parte)) : 'Todos os ferimentos'}</span>
            ${ui.parte ? '<button type="button" class="mini" data-fertodos="1">Ver todos</button>' : ''}
            ${pode ? `<button type="button" class="mini primary" data-fernovo="1" style="margin-left:auto" ${ui.parte ? '' : 'disabled title="Escolha antes uma parte do corpo, no boneco"'}>+ Ferimento</button>` : ''}
          </div>
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
    U().qa(painel, '[data-corpo]').forEach(b => b.onclick = () => {
      if (b.dataset.corpo === 'usar') { pc.usaCorpo = 1; guardar(); return; }
      const antes = { usa: pc.usaCorpo, fer: pc.estado && pc.estado.fer };
      delete pc.usaCorpo; if (pc.estado) delete pc.estado.fer;
      guardar(null, true);
      aviso('O corpo e os ferimentos saíram desta ficha.', 'Desfazer', () => { if (antes.usa) pc.usaCorpo = antes.usa; if (antes.fer) U().estadoDe(pc).fer = antes.fer; if (!antes.usa && !antes.fer) pc.usaCorpo = 1; guardar(null, true); });
    });
    const escolher = k => { ui.parte = ui.parte === k ? null : k; ui.aberto = null; pintar('[data-parte="' + k + '"]'); };
    U().qa(painel, '[data-parte]').forEach(g => {
      g.onclick = () => escolher(g.dataset.parte);
      g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); escolher(g.dataset.parte); } };
    });
    U().qa(painel, '[data-fertodos]').forEach(b => b.onclick = () => { ui.parte = null; ui.aberto = null; pintar(); });
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
  const misUI = { abertas: new Set() };
  const mapa = (o, k) => (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k]) ? o[k] : (o[k] = {}));
  const ler = (o, ...ks) => { for (const k of ks) { if (!o || typeof o !== 'object') return null; o = o[k]; } return o && typeof o === 'object' && !Array.isArray(o) ? o : null; };
  /* Onde mora cada missão:  grupo → S.missoes (todos leem) · do personagem → estado.mis da ficha dele ·
     ainda escondida → com o mestre (S.segredos.mis.g, ou .p[idDoPersonagem]) */
  const lugar = (pc, esc0, oculta, criar) => {
    if (esc0 === 'g') return oculta ? (criar ? mapa(mapa(mapa(S, 'segredos'), 'mis'), 'g') : ler(S.segredos, 'mis', 'g')) : (criar ? mapa(S, 'missoes') : ler(S, 'missoes'));
    return oculta ? (criar ? mapa(mapa(mapa(mapa(S, 'segredos'), 'mis'), 'p'), pc.id) : ler(S.segredos, 'mis', 'p', pc.id)) : (criar ? mapa(U().estadoDe(pc), 'mis') : ler(pc.estado, 'mis'));
  };
  function missoesDe(pc, esc0) {
    const R = RR(); if (!R) return [];
    const a = R.missoes(lugar(pc, esc0, false)).map(m => Object.assign(m, { esc: esc0, oculta: false }));
    const b = mestre() ? R.missoes(lugar(pc, esc0, true)).map(m => Object.assign(m, { esc: esc0, oculta: true })) : [];
    const peso = { ativa: 0, feita: 1, falhou: 2 };
    return a.concat(b).sort((x, y) => (peso[x.e] - peso[y.e]) || (x.c - y.c) || (x.id < y.id ? -1 : 1));
  }
  // quem pode mudar a missão: fora de uma mesa, qualquer um; na mesa, o mestre — e o dono da ficha, nas que ele mesmo criou
  const podeMissao = (pc, m) => !FichasMesa.ativo() || mestre() || (m.esc === 'p' && m.de === 'j' && FichasMesa.podeEditar(pc));
  const contaAtivas = pc => missoesDe(pc, 'g').concat(missoesDe(pc, 'p')).filter(m => m.e === 'ativa').length;
  const chaveDe = m => m.esc + '|' + m.id;
  function htmlMissao(pc, m) {
    const R = RR(), k = esc(chaveDe(m)), aberta = misUI.abertas.has(chaveDe(m)), pode = podeMissao(pc, m);
    const est = R.MIS_ESTADOS.find(x => x.k === m.e) || R.MIS_ESTADOS[0];
    const cab = `<button type="button" class="mishd" data-misabrir="${k}" aria-expanded="${aberta}">
      <span class="caret">${aberta ? '▾' : '▸'}</span>
      <span class="mistit">${esc(m.t || 'Missão sem título')}</span>
      ${m.total ? `<span class="misprog" title="Objetivos feitos">${m.feitos}/${m.total}</span>` : ''}
      <span class="misest e-${m.e}">${est.nome}</span>
      ${m.oculta ? '<span class="tagseg" title="Só você vê esta missão, até revelar">escondida</span>' : ''}
      ${m.esc === 'p' && m.de === 'j' ? '<span class="misde">pessoal</span>' : ''}
    </button>`;
    if (!aberta) return `<div class="miscard e-${m.e} ${m.oculta ? 'oculta' : ''}" data-mis="${k}">${cab}</div>`;
    const dono = FichasMesa.nomeDoDono(pc);
    const corpo = pode ? `
        <label class="f"><span class="eyebrow">Título</span><input class="inm" data-mist="${k}" value="${esc(m.t)}" maxlength="120" placeholder="Ex.: Encontrar o ferreiro desaparecido"></label>
        <label class="f"><span class="eyebrow">Descrição</span><textarea class="entrada" rows="3" data-misd="${k}" maxlength="2000" placeholder="O que se sabe, quem pediu, onde começar…">${esc(m.d)}</textarea></label>
        <div class="misobjs"><span class="eyebrow">Objetivos</span>
          ${m.objs.map(o => `<div class="misobj"><input type="checkbox" data-misok="${k}|${esc(o.id)}" ${o.ok ? 'checked' : ''} aria-label="Feito: ${esc(o.t || 'objetivo')}">
            <input class="inm" data-misot="${k}|${esc(o.id)}" value="${esc(o.t)}" maxlength="200" placeholder="Um passo da missão">
            <button type="button" class="mini danger" data-misodel="${k}|${esc(o.id)}" title="Tirar este objetivo" aria-label="Tirar o objetivo ${esc(o.t)}">×</button></div>`).join('')}
          <div><button type="button" class="mini" data-misoadd="${k}">+ Objetivo</button></div>
        </div>
        <div class="mispe">
          <label class="f"><span class="eyebrow">Recompensa</span><input class="inm" data-misr="${k}" value="${esc(m.r)}" maxlength="300" placeholder="Ex.: 200 lapros e a gratidão da vila"></label>
          <label class="f"><span class="eyebrow">Situação</span><select data-mise="${k}">${R.MIS_ESTADOS.map(x => `<option value="${x.k}" ${m.e === x.k ? 'selected' : ''}>${x.nome}</option>`).join('')}</select></label>
        </div>
        <div class="misacoes">
          ${mestre() ? (m.oculta
            ? `<button type="button" class="mini primary" data-misrevelar="${k}">${m.esc === 'g' ? 'Revelar aos jogadores' : dono ? 'Revelar a ' + esc(dono) : 'Pôr na ficha'}</button><span class="hint">${m.esc === 'g' ? 'Por enquanto só você vê.' : dono ? 'Por enquanto só você vê.' : 'Por enquanto fica só com você (quem vê a ficha não vê).'}</span>`
            : `<button type="button" class="mini" data-misesconder="${k}" title="A missão volta a ficar só com você">Esconder de novo</button>`) : ''}
          ${mestre() && m.esc === 'p' ? `<select data-miscopiar="${k}" aria-label="Copiar esta missão para outro personagem"><option value="">Copiar para…</option>${S.personagens.filter(p => p.id !== pc.id).map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select>` : ''}
          <button type="button" class="mini danger" data-misdel="${k}" style="margin-left:auto">Excluir</button>
        </div>` : `
        ${m.d ? `<p class="misdesc">${esc(m.d)}</p>` : ''}
        ${m.objs.length ? `<ul class="misobjs ro">${m.objs.map(o => `<li class="${o.ok ? 'ok' : ''}"><span class="mischeck" aria-hidden="true">${o.ok ? '✓' : '○'}</span><span>${esc(o.t)}</span><span class="sr">${o.ok ? ' (feito)' : ' (por fazer)'}</span></li>`).join('')}</ul>` : ''}
        ${m.r ? `<p class="misrec"><span class="eyebrow">Recompensa</span> ${esc(m.r)}</p>` : ''}
        ${!m.d && !m.objs.length && !m.r ? '<p class="hint">Sem detalhes ainda.</p>' : ''}`;
    return `<div class="miscard aberta e-${m.e} ${m.oculta ? 'oculta' : ''}" data-mis="${k}">${cab}<div class="misbd">${corpo}</div></div>`;
  }
  function blocoMissoes(pc) {
    if (!RR()) return '<div class="hint">As missões precisam das regras do site.</div>';
    const g = missoesDe(pc, 'g'), p = missoesDe(pc, 'p'), naMesa = FichasMesa.ativo(), m = mestre(), dono = FichasMesa.podeEditar(pc);
    const secao = (titulo, dica, lista, botao, vazio) => `<div class="missec">
      <div class="mishead"><span class="eyebrow">${titulo}</span><span class="hint">${dica}</span>${botao ? `<span style="margin-left:auto">${botao}</span>` : ''}</div>
      ${lista.length ? `<div class="mislist">${lista.map(x => htmlMissao(pc, x)).join('')}</div>` : `<div class="hint">${vazio}</div>`}</div>`;
    return `<div id="blocoMissoes">
      ${secao('Do grupo', naMesa ? 'as mesmas para a mesa toda' + (m ? '' : ' · quem escreve é o mestre') : 'valem para todos os personagens',
        g, !naMesa || m ? '<button type="button" class="mini primary" data-misnova="g">+ Missão do grupo</button>' : '', 'Nenhuma missão do grupo ainda.')}
      ${secao('De ' + esc(pc.nome), naMesa ? (m ? 'as que você deu a este personagem e as que o jogador criou' : 'as que o mestre deu e as que você criou') : 'só deste personagem',
        p, !naMesa || m ? `<button type="button" class="mini primary" data-misnova="p">+ Missão para ${esc(pc.nome)}</button>` : dono ? '<button type="button" class="mini primary" data-misnova="p">+ Missão pessoal</button>' : '', 'Nenhuma missão deste personagem ainda.')}
      ${m ? '<p class="hint misdica">Uma missão criada por você nasce escondida: só aparece para os jogadores quando você clicar em “Revelar”.</p>' : ''}
    </div>`;
  }
  function ligarMissoes(host, pc) {
    const bloco = U().q(host, '#blocoMissoes'); if (!bloco) return;
    const pintar = focar => { trocar('blocoMissoes', blocoMissoes(pc), ligarMissoes, pc, focar); pintarMarca(pc); };
    const guardar = focar => { save(); pintar(focar); };
    const achar = k => { const [e0, id] = k.split('|'); for (const oc of [false, true]) { const l = lugar(pc, e0, oc); if (l && l[id] && typeof l[id] === 'object') return { esc: e0, id, oculta: oc, onde: l, m: l[id] }; } return null; };
    U().qa(bloco, '[data-misnova]').forEach(b => b.onclick = () => {
      const e0 = b.dataset.misnova, id = 'm' + uid(), doMestre = !FichasMesa.ativo() || mestre();
      // (na mesa, a missão do mestre nasce escondida: ele revela quando quiser)
      lugar(pc, e0, mestre(), true)[id] = { t: '', e: 'ativa', de: doMestre ? 'm' : 'j', c: Date.now() };
      misUI.abertas.add(e0 + '|' + id);
      guardar('[data-mist="' + e0 + '|' + id + '"]');
    });
    U().qa(bloco, '[data-misabrir]').forEach(b => b.onclick = () => { const k = b.dataset.misabrir; if (misUI.abertas.has(k)) misUI.abertas.delete(k); else misUI.abertas.add(k); pintar('[data-misabrir="' + k + '"]'); });
    // textos: guardados enquanto se escreve. Nada é redesenhado (o campo não perde o cursor, e o clique seguinte — em
    // "+ Objetivo", por exemplo — não cai no vazio); o título, no cabeçalho da missão, acompanha no lugar.
    const texto = (attr, chave, max) => U().qa(bloco, '[' + attr + ']').forEach(i => {
      i.oninput = () => {
        const a = achar(i.getAttribute(attr)); if (!a) return;
        const t = i.value.slice(0, max); if (t) a.m[chave] = t; else delete a.m[chave]; save();
        if (chave === 't') { const cartao = i.closest('.miscard'), tit = cartao && cartao.querySelector('.mistit'); if (tit) tit.textContent = t || 'Missão sem título'; }
      };
    });
    texto('data-mist', 't', 120); texto('data-misd', 'd', 2000); texto('data-misr', 'r', 300);
    U().qa(bloco, '[data-mise]').forEach(s => s.onchange = () => { const a = achar(s.dataset.mise); if (!a) return; a.m.e = s.value; guardar('[data-mise="' + s.dataset.mise + '"]'); });
    const objDe = v => { const [e0, id, oid] = v.split('|'), a = achar(e0 + '|' + id); return a ? { a, oid, o: a.m.o && a.m.o[oid] } : null; };
    U().qa(bloco, '[data-misoadd]').forEach(b => b.onclick = () => {
      const a = achar(b.dataset.misoadd); if (!a) return;
      const objs = mapa(a.m, 'o'), oid = 'o' + uid(), n = Object.keys(objs).reduce((mx, k) => Math.max(mx, +(objs[k] && objs[k].n) || 0), 0) + 1;
      objs[oid] = { t: '', n };
      guardar('[data-misot="' + b.dataset.misoadd + '|' + oid + '"]');
    });
    U().qa(bloco, '[data-misok]').forEach(c => c.onchange = () => { const x = objDe(c.dataset.misok); if (!x || !x.o) return; if (c.checked) x.o.ok = 1; else delete x.o.ok; guardar('[data-misok="' + c.dataset.misok + '"]'); });
    U().qa(bloco, '[data-misot]').forEach(i => { i.oninput = () => {
      const x = objDe(i.dataset.misot); if (!x || !x.o) return;
      x.o.t = i.value.slice(0, 200); save();
      // (a caixinha e o "×" ao lado continuam dizendo de que objetivo são, para quem usa leitor de tela)
      const linha = i.closest('.misobj'), c = linha && linha.querySelector('[data-misok]'), d = linha && linha.querySelector('[data-misodel]');
      if (c) c.setAttribute('aria-label', 'Feito: ' + (x.o.t || 'objetivo'));
      if (d) d.setAttribute('aria-label', 'Tirar o objetivo ' + x.o.t);
    }; });
    U().qa(bloco, '[data-misodel]').forEach(b => b.onclick = () => { const x = objDe(b.dataset.misodel); if (!x || !x.o) return; delete x.a.m.o[x.oid]; if (!Object.keys(x.a.m.o).length) delete x.a.m.o; guardar('[data-misoadd="' + chaveDe(x.a) + '"]'); });
    const mover = (k, paraOculta) => {
      const a = achar(k); if (!a || a.oculta === paraOculta) return null;
      lugar(pc, a.esc, paraOculta, true)[a.id] = a.m; delete a.onde[a.id];
      return a;
    };
    U().qa(bloco, '[data-misrevelar]').forEach(b => b.onclick = () => {
      const a = mover(b.dataset.misrevelar, false); if (!a) return;
      guardar('[data-misabrir="' + b.dataset.misrevelar + '"]');
      const dono = FichasMesa.nomeDoDono(pc), titulo = a.m.t || 'A missão';
      aviso(a.esc === 'g' ? '“' + titulo + '” agora aparece para todos os jogadores.' : dono ? '“' + titulo + '” agora aparece para ' + dono + '.' : '“' + titulo + '” agora está na ficha de ' + pc.nome + '.');
    });
    U().qa(bloco, '[data-misesconder]').forEach(b => b.onclick = () => { if (!mover(b.dataset.misesconder, true)) return; guardar('[data-misabrir="' + b.dataset.misesconder + '"]'); aviso('A missão voltou a ficar só com você.'); });
    U().qa(bloco, '[data-miscopiar]').forEach(s => s.onchange = () => {
      const a = achar(s.dataset.miscopiar), outro = S.personagens.find(p => p.id === s.value); s.value = '';
      if (!a || !outro) return;
      const nid = 'm' + uid(), oculta = a.oculta;
      lugar(outro, 'p', oculta, true)[nid] = Object.assign(JSON.parse(JSON.stringify(a.m)), { c: Date.now() });
      save();
      aviso('Missão copiada para ' + outro.nome + (oculta ? ' (também escondida).' : '.'), 'Desfazer', () => { const l = lugar(outro, 'p', oculta, false); if (l) delete l[nid]; save(); });
    });
    U().qa(bloco, '[data-misdel]').forEach(b => b.onclick = () => {
      const a = achar(b.dataset.misdel); if (!a) return;
      delete a.onde[a.id]; misUI.abertas.delete(b.dataset.misdel);
      guardar();
      aviso('Missão “' + (a.m.t || 'sem título') + '” excluída.', 'Desfazer', () => { lugar(pc, a.esc, a.oculta, true)[a.id] = a.m; guardar(); });
    });
  }
  // a marca da aba (quantas missões ativas), sem redesenhar a ficha
  function pintarMarca(pc) {
    const b = document.querySelector('#ficha [data-sub="missoes"]'); if (!b) return;
    const n = contaAtivas(pc); let mk = b.querySelector('.mk');
    if (!n) { if (mk) mk.remove(); return; }
    if (!mk) { mk = document.createElement('span'); mk.className = 'mk'; b.append(' ', mk); }
    mk.textContent = n;
  }

  /* Chegou mudança de fora enquanto a pessoa digita noutro lugar da ficha: os quadros em que ela não está são
     redesenhados no lugar (o que ela está usando espera ela sair). */
  function aoVivo(pc) {
    const foco = document.activeElement, livre = id => { const n = document.getElementById(id); return !!n && !n.contains(foco); };
    if (livre('xpBox')) trocar('xpBox', htmlXp(pc), ligarXp, pc);
    if (livre('painelAsc')) trocar('painelAsc', painelAscensao(pc), ligarAscensao, pc);
    if (livre('painelCorpo')) trocar('painelCorpo', painelCorpo(pc), ligarCorpo, pc);
    if (livre('blocoMissoes')) trocar('blocoMissoes', blocoMissoes(pc), ligarMissoes, pc);
    pintarMarca(pc);
  }
  function ligar(host, pc) { ligarXp(host, pc); ligarAscensao(host, pc); ligarCorpo(host, pc); if ((S.abaFicha || 'estaque') === 'missoes') ligarMissoes(host, pc); }
  return { htmlXp, painelAscensao, painelCorpo, htmlPenalidades, blocoMissoes, contaAtivas, ligar, aoVivo, usaCorpo, usaXp };
})();
