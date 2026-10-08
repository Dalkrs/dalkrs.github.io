/* ---------------------------------------------------------------
   10c. LUTA — as telas de combate (as contas ficam em 07e-combate.js)
   - F ........ a janelinha de atributos do token: rola com a regra da fixa e mostra o resultado;
   - a fixa de cada turno de quem joga mais de uma vez por rodada (painel do token);
   - C ........ a disputa entre dois tokens (ou contra um valor avulso);
   - o grupo .. cria de uma vez os tokens de um grupo de personagens das Fichas;
   - o ataque . dano com defesa: o mestre escolhe a defesa que desconta, quem defende pode rolar,
                a janela mostra o que vai acontecer e nada muda antes de "Aplicar";
   - o painel de uma área de terreno.
   Nada aqui age sozinho: toda mudança na cena passa por um botão e vira um passo de desfazer.
   --------------------------------------------------------------- */
const Luta = (() => {
  const K = UI.kit;
  const { field, inNum, inSelect, toggle, seg, btn, iconBtn, sec, note, tokenAvatar } = K;
  const toast = (t, o) => UI.toast(t, o);
  const ponte = () => (window.TC && window.TC.ponte) || null;
  /* A casca do site (a página de fora) pode ser de antes desta atualização — se a pessoa ainda não a recarregou e só
     agora abriu as Cenas. Aí ela não conhece a disputa nem a defesa: a rolagem aparece aqui, mas não chega à mesa
     ao vivo. Avisamos uma vez, dizendo o que fazer. */
  let avisouVelha = false;
  function mesaEntende() {
    const P = ponte();
    if (!P || !P.estado || !P.estado.mesa || P.estado.v >= 2) return true;
    if (!avisouVelha) { avisouVelha = true; UI.toast('O resultado apareceu aqui, mas não foi para a mesa ao vivo: o site foi atualizado. Recarregue a página quando puder.', { long: true }); }
    return false;
  }
  const int = (v, pad) => { const n = Math.round(parseFloat(String(v == null ? '' : v).replace(',', '.'))); return isFinite(n) ? n : pad; };
  // o rótulo curto de um atributo, como na ficha ("FOR", "DEF F")
  const rot = k => { const R = window.TC && window.TC.rules, d = R && R.DEFESAS ? R.DEFESAS.find(x => x.k === k) : null; return (d && d.rot) || k; };

  /* ================= A fixa de agora =================
     Para cada token, a fixa que os campos "Fixando" mostram: a que o mestre digitou por último (lembrada enquanto a
     página está aberta); sem isso, a da ficha. Quem tem uma fixa anotada para o turno que está jogando começa por
     ela — e o que for digitado nesse turno vale só para ele. */
  const fixaMem = new Map();
  function chaveFixa(t) {
    const sc = Store.scene(), tf = Combate.fixaDoTurno(t);
    return t.id + (tf ? '|' + sc.turn.cur + '|' + sc.turn.round : '');
  }
  function fixaAtual(t) {
    const k = chaveFixa(t);
    if (fixaMem.has(k)) return fixaMem.get(k);
    const tf = Combate.fixaDoTurno(t);
    return tf ? tf.v : t.char && Fichas.get(t.char) ? Fichas.fixaPadrao(t) : 0;
  }
  function guardarFixa(t, v) {
    if (fixaMem.size > 400) fixaMem.clear();
    fixaMem.set(chaveFixa(t), clamp(int(v, 0), 0, 99999));
  }

  // No painel do token (seção Turnos): a fixa de cada turno, para quem tem mais de um por rodada.
  function fixasBox(t) {
    const n = clampTurns(t.turns);
    if (n < 2) return null;
    const cur = cleanFixas(t.fixas);
    const set = (i, v) => {
      const f = [];
      for (let k = 0; k < Math.max(n, cur.length); k++) f.push(k === i ? v : cur[k] == null ? null : cur[k]);
      Store.tx('Fixa de cada turno', () => Store.upd('tokens', t.id, { fixas: cleanFixas(f) }));
    };
    return [
      h('div', { class: 'field stack', id: 'tk-fixas' }, h('span', { class: 'lb', text: 'Fixa de cada turno' }),
        h('div', { class: 'fixas' }, Array.from({ length: n }, (_, i) => h('label', { class: 'fixa-t' }, h('span', { text: `${i + 1}º` }),
          h('input', { id: `tk-fixa-${i + 1}`, type: 'number', class: 'in num cnt', min: 0, max: 9999, step: 1, value: cur[i] == null ? '' : cur[i], placeholder: '–',
            'aria-label': `Fixa do ${i + 1}º turno`, title: `Quanto ele fixa no ${i + 1}º turno da rodada. Vazio: a fixa de sempre.`,
            onchange: e => { const raw = String(e.target.value).trim(); set(i, raw === '' ? null : clamp(int(raw, 0), 0, 9999)); } }))))),
      note('Na vez dele, rolar atributo (tecla F) já começa fixando o valor daquele turno. Vazio: a fixa de sempre.'),
    ];
  }

  /* ================= F: a janelinha de atributos =================
     Abre ao lado do token (o que está sob o cursor; senão, o único selecionado) e fica aberta até fechar: Esc, F de
     novo, o × ou um clique fora. Com ficha: um botão por atributo, com o valor de agora. Sem ficha: um valor
     digitado. Tudo com a regra da fixa; a rolagem vai para a mesa ao vivo como as outras. */
  let pop = null;                        // { el, tokId, res, grid, fx, chips, out, valor }
  const valorMem = new Map();            // token sem ficha: o último valor rolado por ele
  function modoDoF(t) {
    if (!t) return null;
    if (t.char && Fichas.get(t.char)) return Fichas.podeRolar(t) ? 'ficha' : null;
    if (isGM()) return 'avulso';
    return ownsTok(t) && !t.char ? 'avulso' : null;
  }
  const podeAtributos = t => !!modoDoF(t);
  function alvoDoF() {
    const hit = App.mouse.inside ? Tools.hitTest(App.mouse, { tokensOnly: true }) : null;
    if (hit) return Store.get('tokens', hit.id) || null;
    const sel = selOf('tokens');
    return sel.length === 1 ? sel[0] : null;
  }
  function fecharPop() { if (pop) { pop.el.remove(); pop = null; } }
  function atributos(tokArg) {
    const t = tokArg || alvoDoF();
    if (pop && !tokArg && (!t || t.id === pop.tokId)) { fecharPop(); return; }       // F de novo fecha
    if (!t) { toast('Para rolar um atributo, passe o mouse sobre um token (ou selecione um) e aperte F.'); return; }
    if (!tokShown(t, Store.scene())) return;
    if (!modoDoF(t)) { toast(isGM() ? 'Não dá para rolar por este token.' : 'Você rola pelos tokens do seu personagem.'); return; }
    abrirPop(t);
  }
  function lerFixaDoPop() { return clamp(int(pop.fx.value, 0), 0, 99999); }
  function rolarDoPop(k) {
    const t = pop ? Store.get('tokens', pop.tokId) : null;
    if (!t) { fecharPop(); return; }
    const fixa = lerFixaDoPop();
    let r, nome;
    if (k === '@valor') {
      const v = clamp(int(pop.valor.value, 0), 0, 100000);
      valorMem.set(t.id, v);
      r = Combate.rolarFixa(v, fixa); nome = 'Valor ' + v;
      if (r.ok && Ext.roll) { try { Ext.roll({ kind: 'atributo', name: t.name, tokenId: t.id, attr: '', attrNome: 'valor avulso', atributo: r.atributo, fixa: r.fixa, d: r.dieValue, total: r.total }); } catch (e) { console.error(e); } }
    } else { r = Fichas.rolar(t, k, fixa); nome = r.nome || k; }
    pop.res = r.ok ? { ok: true, total: r.total, txt: nome, det: Combate.comoSaiu(r) } : { ok: false, txt: r.error };
    pintarPop();
  }
  function pintarPop() {
    if (!pop) return;
    const sc = Store.scene(), t = Store.get('tokens', pop.tokId), modo = t ? modoDoF(t) : null;
    if (!t || !modo || !tokShown(t, sc)) { fecharPop(); return; }
    const a = document.activeElement, fid = a && a.id && pop.el.contains(a) ? a.id : null;
    pop.nome.textContent = tokName(t);
    if (document.activeElement !== pop.fx) pop.fx.value = fixaAtual(t);
    const fixa = lerFixaDoPop();
    // as fixas anotadas por turno: um toque põe o valor no campo
    const tf = Combate.fixaDoTurno(t), fs = Combate.fixasDe(t);
    pop.chips.hidden = !fs.length;
    pop.chips.replaceChildren(...(fs.length ? [h('span', { class: 'pop-l', text: 'Por turno' })].concat(fs.map(f => h('button', { type: 'button', class: 'chip' + (tf && tf.k === f.k ? ' on' : ''), id: `fp-t${f.k}`, title: `Fixa do ${f.k}º turno: ${f.v}` + (tf && tf.k === f.k ? ' (é o turno de agora)' : ''), text: `${f.k}º · ${f.v}`,
      onclick: () => { guardarFixa(t, f.v); pop.fx.value = f.v; pintarPop(); } }))) : []));
    const como = v => (v < 1 ? 'nada a rolar' : fixa >= v ? 'fixa total: ' + v : '1d' + (v - fixa) + (fixa ? ' + ' + fixa : ''));
    if (modo === 'ficha') {
      pop.grid.className = 'pop-g';
      pop.grid.replaceChildren(...Fichas.rolaveis(t).map(([k, nome, v]) => h('button', { type: 'button', class: 'pop-b', id: 'fp-' + k, 'data-k': k, disabled: v < 1, title: `${nome} ${v}: ${como(v)}`, 'aria-label': `Rolar ${nome}, ${v}: ${como(v)}`, onclick: () => rolarDoPop(k) },
        h('small', { text: rot(k) }), h('b', { text: String(v) }))));
    } else {
      // (o campo do valor é feito uma vez só: redesenhar tiraria o foco de quem está digitando)
      if (!pop.valor) {
        pop.valor = h('input', { id: 'fp-valor', type: 'number', class: 'in num', min: 1, max: 100000, step: 1, value: valorMem.has(t.id) ? valorMem.get(t.id) : 40, 'aria-label': 'Valor a rolar',
          oninput: () => pintarPop(), onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); rolarDoPop('@valor'); } } });
        pop.grid.className = 'pop-v';
        pop.grid.replaceChildren(h('label', { class: 'pop-l', for: 'fp-valor', text: 'Valor' }), pop.valor, btn('Rolar', () => rolarDoPop('@valor'), { icon: 'die', kind: 'primary', id: 'fp-rolar' }));
      }
      const v = clamp(int(pop.valor.value, 0), 0, 100000);
      const b = pop.grid.querySelector('#fp-rolar');
      b.title = 'Rola ' + como(v); b.disabled = v < 1;
    }
    const r = pop.res;
    pop.out.hidden = !r;
    pop.out.className = 'pop-r' + (r && !r.ok ? ' erro' : '');
    pop.out.replaceChildren(...(r ? (r.ok ? [h('b', { class: 'pop-tot', id: 'fp-total', text: String(r.total) }), h('span', { text: r.txt }), h('small', { text: r.det })] : [h('span', { text: r.txt })]) : []));
    if (fid && fid !== 'fp-fixa' && fid !== 'fp-valor') { const n = document.getElementById(fid); if (n && !n.disabled) n.focus({ preventScroll: true }); else pop.el.focus({ preventScroll: true }); }
  }
  function abrirPop(t) {
    fecharPop(); UI.closeMenus();
    const fx = h('input', { id: 'fp-fixa', type: 'number', class: 'in num', min: 0, max: 99999, step: 1, value: fixaAtual(t), 'aria-label': 'Quanto fixar', title: 'Regra da fixa: rola um dado de (atributo − fixa) lados e soma a fixa',
      oninput: () => { const cur = pop && Store.get('tokens', pop.tokId); if (cur) { guardarFixa(cur, fx.value); pintarPop(); } },
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); fx.blur(); pop.el.focus({ preventScroll: true }); } } });
    const nome = h('strong', { class: 'pop-n' }), grid = h('div', { class: 'pop-g' }), chips = h('div', { class: 'pop-c', hidden: true }), out = h('div', { class: 'pop-r', id: 'fp-res', role: 'status', hidden: true });
    const el = h('div', { class: 'pop', id: 'fpop', role: 'dialog', 'aria-label': 'Rolar atributo de ' + tokName(t), tabindex: '-1' },
      h('div', { class: 'pop-h' }, tokenAvatar(t, 26), nome, iconBtn('x', 'Fechar (Esc ou F)', fecharPop, { size: 15, id: 'fp-x' })),
      h('div', { class: 'pop-f' }, h('label', { class: 'pop-l', for: 'fp-fixa', text: 'Fixando' }), fx), chips, grid, out);
    K.layer.append(el);
    pop = { el, tokId: t.id, res: null, grid, fx, chips, out, nome, valor: null };
    pintarPop();
    if (!pop) return;
    // ao lado do token (à direita; se não couber, à esquerda), sem sair da tela — e ali fica, mesmo que o mapa ande
    const sc = Store.scene(), r = Render.cv.getBoundingClientRect(), [sx, sy] = Render.toScreen(t.x, t.y), lado = t.size * sc.cell * App.view.z;
    const w = el.offsetWidth, hh = el.offsetHeight;
    let left = r.left + sx + lado + 14;
    if (left + w > window.innerWidth - 8) left = r.left + sx - w - 14;
    el.style.left = clamp(left, 8, Math.max(8, window.innerWidth - w - 8)) + 'px';
    el.style.top = clamp(r.top + sy - 6, 8, Math.max(8, window.innerHeight - hh - 8)) + 'px';
    el.focus({ preventScroll: true });
  }
  // o botão da faixa do token (para quem não usa o teclado): abre e, de novo, fecha
  function alternar(t) { if (pop && t && pop.tokId === t.id) fecharPop(); else atributos(t); }
  document.addEventListener('pointerdown', e => { if (pop && !pop.el.contains(e.target) && !(e.target.closest && e.target.closest('#hud-rolar'))) fecharPop(); }, true);
  document.addEventListener('keydown', e => {
    if (!pop || e.key !== 'Escape' || UI.modalOpen()) return;
    fecharPop(); e.stopPropagation(); e.preventDefault();
  }, true);

  /* ================= C: a disputa =================
     Dois lados, cada um com um token da cena (ou um valor avulso, sem token). Lado com ficha: escolhe o atributo;
     sem ficha: digita o valor. Cada lado rola com a regra da fixa; quem tirar mais vence. O resultado aparece na
     janela e vai para a mesa ao vivo (em segredo, se um dos tokens está oculto ou com o nome escondido). */
  const atrMem = new Map();              // o último atributo usado por cada token numa disputa
  function ladoDe(t) {
    if (!t) return { tok: '', nome: 'NPC', valor: 40, fixa: 0, atr: '' };
    const comFicha = !!(t.char && Fichas.get(t.char) && Fichas.podeRolar(t));
    const itens = comFicha ? Fichas.rolaveis(t) : [];
    const atr = comFicha ? (itens.some(x => x[0] === atrMem.get(t.id)) ? atrMem.get(t.id) : itens[0][0]) : '';
    return { tok: t.id, nome: t.name, valor: valorMem.has(t.id) ? valorMem.get(t.id) : 40, fixa: fixaAtual(t), atr };
  }
  function disputa(toksArg) {
    if (!isGM()) { toast('A disputa pelo mapa é do mestre. Na sua ficha, o botão "Disputar" faz o mesmo.'); return; }
    fecharPop();
    const sc = Store.scene(), sel = (toksArg && toksArg.length ? toksArg : selOf('tokens')).slice();
    const hit = App.mouse.inside ? Tools.hitTest(App.mouse, { tokensOnly: true }) : null, sob = hit ? Store.get('tokens', hit.id) : null;
    const a0 = sel[0] || sob || null;
    let b0 = sel.find(t => a0 && t.id !== a0.id) || null;
    if (!b0) { const mira = sc.targets.find(x => x.by === App.viewer && (!a0 || x.t !== a0.id)); if (mira) b0 = Store.get('tokens', mira.t) || null; }
    if (!b0 && sob && a0 && sob.id !== a0.id) b0 = sob;
    const st = { a: ladoDe(a0), b: ladoDe(b0), res: null };
    const corpo = h('div', { class: 'dis' });
    const tokDe = L => (L.tok ? Store.get('tokens', L.tok) : null);
    const comFicha = t => !!(t && t.char && Fichas.get(t.char) && Fichas.podeRolar(t));
    // o que cada lado vai rolar agora: { nome, rotulo, valor, fixa, tok }
    const conta = L => {
      const t = tokDe(L);
      if (comFicha(t)) { const it = Fichas.rolaveis(t).find(x => x[0] === L.atr) || Fichas.rolaveis(t)[0]; return { t, nome: t.name, rotulo: rot(it[0]), valor: it[2], fixa: Math.min(L.fixa, it[2]) }; }
      const v = clamp(int(L.valor, 0), 0, 100000);
      return { t, nome: (t ? t.name : String(L.nome || '').trim()) || 'NPC', rotulo: 'valor', valor: v, fixa: Math.min(L.fixa, v) };
    };
    const opcoes = [['', 'Avulso (sem token)']].concat(sc.tokens.map(t => [t.id, t.name + (t.hidden ? ' (oculto)' : '')]));
    const lado = (L, p, titulo) => {
      const t = tokDe(L), ficha = comFicha(t);
      const trocar = v => { const novo = ladoDe(v ? Store.get('tokens', v) : null); Object.assign(L, novo); st.res = null; paint(); };
      return h('div', { class: 'dis-l' }, h('div', { class: 'dis-t', text: titulo }),
        field('Quem', inSelect(`dis-${p}-tok`, L.tok, opcoes, trocar), 'stack'),
        ficha ? field('Atributo', inSelect(`dis-${p}-atr`, L.atr, Fichas.rolaveis(t).map(x => [x[0], `${x[1]} · ${x[2]}`]), v => { L.atr = v; atrMem.set(t.id, v); st.res = null; paint(); }), 'stack')
          : [t ? null : field('Nome', h('input', { id: `dis-${p}-nome`, class: 'in', type: 'text', maxlength: 40, value: L.nome, autocomplete: 'off', oninput: e => { L.nome = e.target.value; } }), 'stack'),
            field('Valor', h('input', { id: `dis-${p}-valor`, class: 'in num', type: 'number', min: 1, max: 100000, step: 1, value: L.valor, oninput: e => { L.valor = clamp(int(e.target.value, 0), 0, 100000); if (t) valorMem.set(t.id, L.valor); } }), 'stack')],
        field('Fixando', h('input', { id: `dis-${p}-fixa`, class: 'in num', type: 'number', min: 0, max: 99999, step: 1, value: L.fixa, oninput: e => { L.fixa = clamp(int(e.target.value, 0), 0, 99999); if (t) guardarFixa(t, L.fixa); } }), 'stack'),
        t && Combate.fixaDoTurno(t) ? note(`É o ${Combate.fixaDoTurno(t).k}º turno dele: fixa anotada ${Combate.fixaDoTurno(t).v}.`) : null);
    };
    const paint = () => {
      const a = document.activeElement, fid = a && a.id && corpo.contains(a) ? a.id : null;
      const r = st.res;
      corpo.replaceChildren(...[
        h('div', { class: 'dis-2' }, lado(st.a, 'a', 'Um lado'), h('div', { class: 'dis-x', 'aria-hidden': 'true', text: '×' }), lado(st.b, 'b', 'O outro')),
        r ? h('div', { class: 'dis-r', id: 'dis-res', role: 'status' },
          h('div', { class: 'dis-n' }, h('span', { class: r.a.total > r.b.total ? 'v' : '', text: `${r.na} ${r.a.total}` }), h('span', { class: 'dis-x', text: '×' }), h('span', { class: r.b.total > r.a.total ? 'v' : '', text: `${r.b.total} ${r.nb}` })),
          h('div', { class: 'dis-v', id: 'dis-veredito', text: r.veredito }),
          h('div', { class: 'dis-d', text: `${Combate.comoSaiu(r.a)}  ·  ${Combate.comoSaiu(r.b)}` })) : null].filter(Boolean));
      if (fid) { const n = document.getElementById(fid); if (n) n.focus({ preventScroll: true }); }
      const b = K.card() && K.card().querySelector('.btn.primary span'); if (b) b.textContent = st.res ? 'Rolar de novo' : 'Rolar disputa';
    };
    const rolar = () => {
      const ca = conta(st.a), cb = conta(st.b);
      if (ca.t && cb.t && ca.t.id === cb.t.id) { toast('Os dois lados são o mesmo token. Escolha outro num deles.'); return false; }
      const ra = Combate.rolarFixa(ca.valor, ca.fixa), rb = Combate.rolarFixa(cb.valor, cb.fixa);
      if (!ra.ok || !rb.ok) { toast((!ra.ok ? ca.nome : cb.nome) + ': ' + (!ra.ok ? ra.error : rb.error)); return false; }
      const empate = ra.total === rb.total, venceuA = ra.total > rb.total;
      const veredito = empate ? 'Empate em ' + ra.total
        : `${venceuA ? ca.nome : cb.nome} venceu ${venceuA ? cb.nome : ca.nome} por ${Math.abs(ra.total - rb.total)} (${Math.max(ra.total, rb.total)} × ${Math.min(ra.total, rb.total)})`;
      st.res = { a: ra, b: rb, na: ca.nome, nb: cb.nome, veredito };
      if (Ext.roll) {
        const esconde = t => !!(t && (t.hidden || t.showName === false));
        // na mesa ao vivo, o veredito sai verde ou vermelho só quando um dos lados (e só um) é de jogador: é a vitória ou a derrota dele
        const deJog = t => !!(t && t.owner && (t.owner === '*' || playerById(t.owner)));
        const passou = empate || deJog(ca.t) === deJog(cb.t) ? null : deJog(ca.t) ? venceuA : !venceuA;
        mesaEntende();
        try {
          Ext.roll({ kind: 'disputa', titulo: `Disputa · ${ca.nome} × ${cb.nome}`, tokenId: ca.t ? ca.t.id : null, oculto: esconde(ca.t) || esconde(cb.t),
            resumo: `${ca.nome}: ${ca.rotulo} ${ca.valor} (${Combate.comoFoi(ra)}) = ${ra.total}  ·  ${cb.nome}: ${cb.rotulo} ${cb.valor} (${Combate.comoFoi(rb)}) = ${rb.total}`,
            veredito, passou, dd: Combate.dadosDe(ra).concat(Combate.dadosDe(rb)) });
        } catch (e) { console.error(e); }
      }
      paint();
      return false;                        // a janela fica aberta: dá para rolar de novo
    };
    UI.modal({ title: 'Disputa', wide: true, body: corpo, focusPrimary: true, actions: [{ label: 'Fechar' }, { label: 'Rolar disputa', kind: 'primary', run: rolar }] });
    paint();
  }

  /* ================= Puxar o grupo =================
     Cria de uma vez os tokens de vários personagens das Fichas, já ligados a elas (nome, barras, iniciativa,
     imagem e dono). O mestre vê a lista antes e marca quem vem; quem já tem token nesta cena fica de fora. */
  function grupo(onde) {
    if (!isGM() || !Fichas.on()) { toast('Puxar o grupo funciona dentro do site, com uma mesa aberta.'); return; }
    fecharPop();
    const sc = Store.scene(), lista = Combate.elenco(sc);
    if (!lista.length) { toast('Esta mesa ainda não tem fichas. Crie na aba Fichas.'); return; }
    const conjuntos = [];
    /* Numa mesa com campanhas, a campanha em vista fica em evidência: os conjuntos dela vêm primeiro (os personagens
       dos jogadores dela, os grupos dela); depois os do mundo e, por fim, cada uma das outras campanhas. */
    const vista = Fichas.vista(), comCamp = !!vista && Nuvem.comCampanhas();
    const base = comCamp ? lista.filter(x => x.camp === vista) : lista, ids = l => l.map(x => x.id);
    const grupos = (l, prefixo, rotulo) => {
      const nomes = [...new Set(l.map(x => x.grupo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
      for (const g of nomes) conjuntos.push({ id: prefixo + g, n: rotulo + 'Grupo: ' + g, ids: ids(l.filter(x => x.grupo === g)) });
      return nomes.length;
    };
    const jog = base.filter(x => x.dono);
    if (jog.length) conjuntos.push({ id: '@jog', n: 'Personagens dos jogadores', ids: ids(jog) });
    const nGrupos = grupos(base, 'g:', '');
    const soltos = base.filter(x => !x.grupo);
    if (nGrupos && soltos.length) conjuntos.push({ id: '@sem', n: 'Sem grupo', ids: ids(soltos) });
    if (comCamp) {
      if (base.length) conjuntos.push({ id: '@camp', n: 'Toda a campanha ' + Fichas.nomeDaCampanha(vista), ids: ids(base) });
      const mundo = lista.filter(x => !x.camp);
      grupos(mundo, 'm:', 'Do mundo · ');
      if (mundo.length) conjuntos.push({ id: '@mundo', n: 'Todas as fichas do mundo', ids: ids(mundo) });
      for (const c of Nuvem.campanhas()) { const dela = c.id === vista ? [] : lista.filter(x => x.camp === c.id); if (dela.length) conjuntos.push({ id: 'c:' + c.id, n: 'Outra campanha: ' + c.nome, ids: ids(dela) }); }
    }
    conjuntos.push({ id: '@todos', n: 'Todas as fichas da mesa', ids: ids(lista) });
    const st = { cj: App.opt.grupoCj && conjuntos.some(c => c.id === App.opt.grupoCj) ? App.opt.grupoCj : conjuntos[0].id, marcados: new Set(), oculto: false };
    const porId = new Map(lista.map(x => [x.id, x]));
    const doConjunto = () => conjuntos.find(c => c.id === st.cj).ids.map(id => porId.get(id));
    const marcarTodos = on => { st.marcados = new Set(on ? doConjunto().filter(x => !x.aqui).map(x => x.id) : []); };
    marcarTodos(true);
    const ul = h('ul', { class: 'area-list', id: 'gr-lista' }), conta = h('span', { class: 'area-count', id: 'gr-conta' });
    const paint = () => {
      const a = document.activeElement, fid = a && a.id && ul.contains(a) ? a.id : null;
      const itens = doConjunto(), livres = itens.filter(x => !x.aqui).length;
      conta.textContent = livres ? `${st.marcados.size} de ${livres} marcados` : 'Todos já estão nesta cena';
      ul.replaceChildren(...itens.map((x, k) => {
        const l = Fichas.get(x.id), img = l ? Fichas.imagemDe(l) : null, on = st.marcados.has(x.id);
        const sub = (x.dono ? 'de ' + x.dono.name : 'NPC') + (x.grupo ? ' · ' + x.grupo : '');
        return h('li', { class: 'area-row' + (on ? '' : ' off') },
          h('label', { class: 'area-who' },
            h('input', { type: 'checkbox', class: 'ck', id: `gr-on-${k}`, checked: on, disabled: x.aqui, 'aria-label': 'Trazer ' + x.nome, onchange: e => { if (e.target.checked) st.marcados.add(x.id); else st.marcados.delete(x.id); paint(); } }),
            h('span', { class: 'av', 'aria-hidden': 'true', style: Object.assign({ width: '26px', height: '26px', fontSize: '10px', backgroundColor: 'var(--hover)', color: 'var(--fg-2)', borderColor: x.dono ? x.dono.color : 'var(--line-strong)' }, img ? { backgroundImage: `url("${img}")` } : {}) }, img ? null : initials(x.nome)),
            h('span', { class: 'area-n', text: x.nome })),
          h('span', { class: 'area-res', text: x.aqui ? 'já está na cena' : sub }));
      }));
      if (fid) { const n = document.getElementById(fid); if (n) n.focus({ preventScroll: true }); }
    };
    paint();
    const sel = inSelect('gr-cj', st.cj, conjuntos.map(c => [c.id, `${c.n} (${c.ids.length})`]), v => { st.cj = v; App.opt.grupoCj = v; marcarTodos(true); paint(); });
    UI.modal({
      title: 'Puxar o grupo', wide: true, focusPrimary: true,
      text: 'Cria um token para cada personagem marcado, já ligado à ficha dele: nome, barras, iniciativa, imagem e dono.',
      body: h('div', { class: 'area' },
        field('De onde', sel, 'stack'),
        h('div', { class: 'area-bar' }, conta, h('span', { class: 'spacer' }), btn('Todos', () => { marcarTodos(true); paint(); }, { kind: 'small' }), btn('Nenhum', () => { marcarTodos(false); paint(); }, { kind: 'small' })),
        ul,
        toggle('gr-oculto', st.oculto, v => { st.oculto = v; }, 'Criar ocultos dos jogadores'),
        note('Os tokens entram em quadrados livres, a partir ' + (onde ? 'do ponto clicado' : 'do meio da tela') + '. Quem já tem token nesta cena fica de fora. Um Desfazer tira todos de uma vez.')),
      actions: [{ label: 'Cancelar' }, {
        label: 'Trazer', kind: 'primary', run: () => {
          const ids = doConjunto().filter(x => !x.aqui && st.marcados.has(x.id)).map(x => x.id);
          if (!ids.length) { toast('Marque pelo menos um personagem.'); return false; }
          const [cw, ch] = Render.size();
          const cx = onde ? onde.x : App.view.x + cw / (2 * App.view.z), cy = onde ? onde.y : App.view.y + ch / (2 * App.view.z);
          const feitos = Combate.trazer(ids, cx, cy, st.oculto ? { hidden: true } : null);
          if (!feitos.length) { toast('Nenhum token foi criado: as fichas marcadas saíram da mesa.'); return; }
          setSel(feitos.map(id => ({ c: 'tokens', id })));
          if (App.tool !== 'select') Tools.set('select');
          toast(feitos.length === 1 ? 'Um token criado, ligado à ficha.' : `${feitos.length} tokens criados, ligados às fichas.`, { action: 'Desfazer', run: Tools.undo });
        },
      }],
    });
  }

  /* ================= Painel de uma área de terreno ================= */
  function terrainPanel(shapes) {
    const sc = Store.scene(), s = shapes[0], many = shapes.length > 1, u = String(sc.grid.unitName || '').trim(), passo = sc.grid.unit || 1;
    const all = (fn, label) => Store.tx(label, () => shapes.forEach(x => { const cur = Store.get('shapes', x.id); if (cur && isTer(cur)) Store.upd('shapes', cur.id, fn(cur)); }));
    const tipo = shapes.every(x => x.ter.t === s.ter.t) ? s.ter.t : '', alt = shapes.every(x => x.ter.h === s.ter.h) ? s.ter.h : '';
    const ids = shapes.map(x => x.id);
    return [
      h('div', { class: 'p-head' }, h('span', { class: 'av', style: { width: '44px', height: '44px', backgroundColor: tipo ? TERRENO_POR_ID[tipo].c : 'var(--hover)', color: '#fff', borderColor: 'var(--line-strong)' } }, icon('terrain', 22)),
        h('div', { class: 'p-head-t' }, h('h3', { class: 'p-title', text: many ? `${shapes.length} áreas de terreno` : Combate.terDef(s).n }), h('div', { class: 'p-sub', text: many ? 'O que você mudar aqui vale para todas.' : 'Arraste para mover; puxe as alças para esticar.' }))),
      sec('s-ter', 'Terreno', true,
        field('Tipo', inSelect('tr-tipo', tipo, (tipo ? [] : [['', 'Vários']]).concat(TERRENOS.map(x => [x.id, x.n])), v => { if (v) all(x => Combate.terPatch(x, v), 'Tipo de terreno'); })),
        field('Altura' + (u ? ` (${u})` : ''), h('input', { id: 'tr-alt', type: 'number', class: 'in num', step: passo, min: -9999, max: 9999, value: alt, placeholder: alt === '' ? 'várias' : '',
          onchange: e => { const v = parseFloat(String(e.target.value).replace(',', '.')); if (isFinite(v)) all(x => Combate.terPatch(x, x.ter.t, v), 'Altura do terreno'); else e.target.value = alt; } })),
        !many && s.k === 'free' ? field('Largura (q)', inNum('tr-larg', Math.round(s.sw / sc.cell * 100) / 100, v => all(() => ({ sw: v * sc.cell }), 'Largura da faixa'), { min: 0.25, max: 12, step: 0.25 })) : null,
        note('O token que estiver em cima mostra a altura (▲). Negativa é um buraco, e mostra ▼. Com zero, a área só tem o nome (água rasa, mata). Passando o mouse, o mapa diz o que é.')),
      h('div', { class: 'row' },
        btn('Duplicar', Act.duplicateSel, { icon: 'copy' }),
        btn('Frente', () => Act.toFront('shapes', ids, true), { icon: 'front', title: 'Onde duas áreas se cruzam, vale a que está na frente' }),
        btn('Trás', () => Act.toFront('shapes', ids, false), { icon: 'back' }),
        btn('Apagar', K.deleteSelToast, { icon: 'trash', kind: 'danger', id: 'tr-apagar' })),
    ];
  }

  /* ================= Ataque com defesa =================
     O mestre diz o dano, a barra e quais defesas descontam (uma ou mais: elas se somam; nenhuma: o dano entra
     inteiro). Para cada alvo com ficha a janela mostra a defesa e o que vai sobrar na barra. Quem defende pode
     rolar a defesa com a regra da fixa: os jogadores recebem o pedido na mesa ao vivo e rolam de lá; o mestre vê
     quem já rolou, pode rolar por quem demorar (ou valer a defesa inteira) e só então aplica. O mínimo e o máximo
     valem depois do desconto. Token sem ficha: o mestre diz quanto de dano ele tomou. */
  let atq = null, atqRelogio = 0;
  const podeAtaque = () => isGM() && Fichas.on() && Combate.listaDefesas().length > 0;
  function encerrarPedido(fim) {
    const p = atq && atq.pedido;
    if (!p || p.fim) return;
    p.fim = fim;
    try { const P = ponte(); if (P && P.registro && P.registro.encerrar) P.registro.encerrar(p.id, fim); } catch (e) { console.error(e); }
  }
  function fecharAtaque(fim) {
    if (!atq) return;
    encerrarPedido(fim || 'cancelado');
    atq = null;
    clearInterval(atqRelogio); atqRelogio = 0;
  }
  function ataque(toks, pre) {
    if (!podeAtaque()) { toast('O ataque com defesa funciona dentro do site, com uma mesa aberta (ele usa as defesas das fichas).'); return; }
    const alvos = (toks || []).filter(Boolean);
    if (!alvos.length) { toast('Selecione no mapa quem recebe o ataque.'); return; }
    fecharPop(); fecharAtaque('cancelado');
    const o = pre || {}, P = ponte();
    const names = [];
    for (const t of alvos) for (const b of t.bars) if (b.on && !names.includes(b.n)) names.push(b.n);
    if (!names.length) { toast('Nenhum destes tokens tem uma barra em uso.'); return; }
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    const barra0 = names.includes(o.barra) ? o.barra : names.find(n => norm(n) === 'hp') || names.find(n => norm(n) === 'vida') || names[0];
    const fora = new Set(o.fora || []);
    const defs = Combate.listaDefesas();
    const st = atq = {
      rows: alvos.map(t => ({ id: t.id, on: !fora.has(t.id), st: '', r: null, manual: null })),
      defs: new Set((App.opt.atqDefs || []).filter(k => defs.some(d => d.k === k))),
      modo: App.opt.atqModo === 'rolam' ? 'rolam' : 'nao',
      avisar: App.opt.atqAvisar == null ? !(P && P.estado && P.estado.segredo) : !!App.opt.atqAvisar,
      pedido: null, pedindo: false, card: null, cena: Store.S.current,
    };
    const dano0 = String(o.dano == null ? '' : o.dano).replace(/^[+-]/, '').trim();
    const inNome = h('input', { id: 'at-nome', class: 'in', type: 'text', maxlength: 40, placeholder: 'Ataque', autocomplete: 'off', 'aria-label': 'Nome do ataque (opcional)' });
    const inDano = h('input', { id: 'at-dano', class: 'in bar-v', type: 'text', inputmode: 'decimal', placeholder: '30', autocomplete: 'off', 'data-focus': '', value: /^\d+([.,]\d+)?$/.test(dano0) ? dano0 : '', 'aria-label': 'Dano do ataque' });
    const selBar = h('select', { id: 'at-barra', class: 'in' }, names.map(n => h('option', { value: n, text: n })));
    selBar.value = barra0;
    const inMin = h('input', { id: 'at-min', class: 'in num', type: 'number', min: 0, max: 99999, step: 1, value: App.opt.atqMin > 0 ? App.opt.atqMin : 0, 'aria-label': 'Dano mínimo, depois do desconto', title: 'Mesmo com a defesa alta, passa pelo menos isto' });
    const inMax = h('input', { id: 'at-max', class: 'in num', type: 'number', min: 0, max: 99999, step: 1, value: '', placeholder: '–', 'aria-label': 'Dano máximo, depois do desconto', title: 'Nunca passa mais que isto. Vazio: sem teto' });
    const chips = h('div', { class: 'chips atq-defs', id: 'at-defs', role: 'group', 'aria-label': 'Defesas que descontam' });
    const linhaModo = h('div', { class: 'atq-modo' }), lista = h('ul', { class: 'area-list atq-list', id: 'at-lista' }), conta = h('span', { class: 'area-count', id: 'at-conta' }), pedidoEl = h('div', { class: 'atq-ped', id: 'at-pedido' });
    const num = el => { const s = String(el.value || '').trim().replace(',', '.'); return /^\d+(\.\d+)?$/.test(s) ? Number(s) : null; };
    const dano = () => num(inDano);
    const minimo = () => Math.max(0, num(inMin) || 0);
    const maximo = () => { const v = num(inMax); return v == null ? null : Math.max(minimo(), v); };
    const chaves = () => defs.filter(d => st.defs.has(d.k)).map(d => d.k);
    const rolando = () => st.modo === 'rolam' && st.defs.size > 0;
    // tudo o que a janela precisa saber de uma linha, com a cena como está agora
    const ver = r => {
      const t = Store.get('tokens', r.id);
      if (!t) return null;
      const i = Combate.barraDe(t, selBar.value), b = i >= 0 ? t.bars[i] : null, def = Combate.defesaDe(t, chaves()), comFicha = def != null, d = dano();
      const dono = comFicha ? Fichas.donoQueJoga(t) : null;        // (quem rola a defesa: o jogador dono — se não está mestrando)
      let usada = 0, falta = false, como = '';
      if (comFicha && st.defs.size) {
        if (!rolando()) { usada = def; como = 'defesa ' + def; }
        else if (r.st === 'rolou') { usada = r.r.total; como = `rolou ${r.r.total} de ${def}` + (r.r.det ? ` (${r.r.det})` : '') + (r.r.por ? ` · ${r.r.por}` : ''); }
        else if (r.st === 'inteira') { usada = def; como = 'defesa inteira: ' + def; }
        else { falta = true; como = (st.pedido && !st.pedido.fim && dono && st.pedido.chars.has(t.char) ? `esperando ${dono.name}` : 'falta rolar') + ` · defesa ${def}`; }
      } else if (comFicha) como = 'sem desconto';
      const final = !comFicha ? (r.manual != null ? r.manual : d == null ? null : Combate.danoFinal(d, 0, minimo(), maximo())) : d == null || falta ? null : Combate.danoFinal(d, usada, minimo(), maximo());
      return { t, b, def, comFicha, dono, usada, falta, como, final };
    };
    const fixaDaDefesa = (t, def) => Math.min(fixaAtual(t), def);
    // o mestre rola a defesa de um alvo (dele mesmo, ou por um jogador que demorou)
    const rolarPor = r => {
      const v = ver(r);
      if (!v || !v.comFicha || !st.defs.size) return;
      const nomeDef = Combate.nomeDasDefesas(chaves());
      let res = { ok: true, atributo: 0, fixa: 0, die: 0, dieValue: 0, total: 0 };
      if (v.def >= 1) res = Combate.rolarFixa(v.def, fixaDaDefesa(v.t, v.def));
      if (!res.ok) { toast(res.error); return; }
      r.st = 'rolou'; r.r = { total: res.total, det: v.def >= 1 ? Combate.comoSaiu(res) : '', por: v.dono ? 'pelo mestre' : '' };
      if (Ext.roll && v.def >= 1) {
        try { Ext.roll({ kind: 'defesa', name: v.t.name, tokenId: v.t.id, defNome: nomeDef, atributo: res.atributo, fixa: res.fixa, d: res.dieValue, total: res.total, pedido: st.pedido && !st.pedido.fim && v.dono ? st.pedido.id : null, alvo: v.t.char || null }); }
        catch (e) { console.error(e); }
      }
    };
    const zerarRolagens = () => { for (const r of st.rows) { r.st = ''; r.r = null; } };
    const paint = () => {
      if (atq !== st) return;
      const a = document.activeElement, card = K.card(), fid = a && a.id && card && card.contains(a) && (lista.contains(a) || chips.contains(a) || linhaModo.contains(a) || pedidoEl.contains(a)) ? a.id : null;
      const travado = !!(st.pedido && !st.pedido.fim);
      const cs = [];
      defs.forEach((d, k) => {
        if (k > 0 && defs[k - 1].g !== d.g) cs.push(h('span', { class: 'atq-sep', 'aria-hidden': 'true' }));
        cs.push(h('button', { type: 'button', class: 'chip' + (st.defs.has(d.k) ? ' on' : ''), id: 'at-d-' + d.k, 'aria-pressed': String(st.defs.has(d.k)), disabled: travado, title: travado ? 'O pedido aos jogadores já foi feito com estas defesas' : (d.g === 'geral' ? 'Defesa ' : 'Defesa contra ') + d.n,
          onclick: () => { if (st.defs.has(d.k)) st.defs.delete(d.k); else st.defs.add(d.k); App.opt.atqDefs = [...st.defs]; zerarRolagens(); paint(); } }, d.n));
      });
      chips.replaceChildren(...cs);
      linhaModo.replaceChildren(...[
        h('span', { class: 'lb', text: 'Quem defende rola?' }),
        seg('at-modo', st.modo, [['nao', 'Não', null, 'Desconta a defesa inteira'], ['rolam', 'Rola a defesa', null, 'Cada um rola a defesa com a regra da fixa: desconta o que sair']], v => { if (travado) { toast('Há um pedido em aberto. Cancele o pedido para mudar.'); return; } st.modo = v; App.opt.atqModo = v; zerarRolagens(); paint(); }),
        !st.defs.size ? h('span', { class: 'note', text: 'Sem defesa marcada, o dano entra inteiro.' }) : null].filter(Boolean));
      const vs = st.rows.map(r => ({ r, v: ver(r) })).filter(x => x.v);
      const dentro = vs.filter(x => x.r.on);
      conta.textContent = `${dentro.length} de ${vs.length} marcados`;
      const faltam = dentro.filter(x => x.v.falta && x.v.b);
      const deJogador = faltam.filter(x => x.v.dono);
      // o pedido aos jogadores e os atalhos de quem falta
      const filhos = [];
      if (rolando()) {
        if (!st.pedido || st.pedido.fim) {
          filhos.push(btn(st.pedindo ? 'Pedindo…' : 'Pedir aos jogadores que rolem', pedir, { icon: 'users', kind: 'small', id: 'at-pedir', disabled: st.pedindo || !deJogador.length,
            title: deJogador.length ? 'Manda o pedido para a mesa ao vivo: cada jogador rola a defesa do personagem dele' : 'Nenhum dos alvos que faltam é de jogador: role você mesmo' }));
        } else {
          filhos.push(h('span', { class: 'note', text: deJogador.length ? 'Pedido feito: os jogadores rolam pela mesa ao vivo.' : 'Pedido feito.' }),
            btn('Cancelar o pedido', () => { encerrarPedido('cancelado'); zerarRolagens(); paint(); }, { kind: 'small', id: 'at-despedir', title: 'Encerra o pedido na mesa ao vivo (para mudar as defesas, por exemplo). As rolagens já feitas deixam de valer.' }));
        }
        if (faltam.length) filhos.push(btn('Rolar por quem falta', () => { for (const x of faltam) rolarPor(x.r); paint(); }, { icon: 'die', kind: 'small', id: 'at-rolar-todos', title: 'Você rola agora a defesa de todos os que ainda não rolaram' }));
      }
      pedidoEl.hidden = !filhos.length;
      pedidoEl.replaceChildren(...filhos);
      lista.replaceChildren(...vs.map(({ r, v }, k) => {
        const t = v.t, b = v.b;
        let res = '';
        if (!r.on) res = 'fica de fora';
        else if (!b) res = 'sem ' + selBar.value;
        else if (v.final == null) res = `${fmtV(b.v)}/${fmt(b.m)}`;
        else { const q = barAfter(b, -v.final); res = `−${fmt(v.final)} · ${fmtV(b.v)} → ${fmtV(q.v)}` + (q.x !== undefined ? ` · sobrevida ${fmt(barX(b))} → ${fmt(q.x)}` : ''); }
        const acoes = [];
        if (r.on && b && v.comFicha && rolando()) {
          if (v.falta) acoes.push(btn(v.dono ? 'Rolar por ele' : 'Rolar', () => { rolarPor(r); paint(); document.getElementById(`at-de-novo-${k}`) && document.getElementById(`at-de-novo-${k}`).focus(); }, { icon: 'die', kind: 'small', id: `at-rolar-${k}` }),
            btn('Inteira', () => { r.st = 'inteira'; r.r = null; paint(); }, { kind: 'small', id: `at-inteira-${k}`, title: 'Não rola: desconta a defesa inteira' }));
          else acoes.push(btn(r.st === 'rolou' ? 'Descartar' : 'Voltar', () => { r.st = ''; r.r = null; paint(); }, { kind: 'small', id: `at-de-novo-${k}`, title: r.st === 'rolou' ? 'Descarta esta rolagem: o alvo volta a ficar sem defesa decidida' : 'Volta atrás: o alvo fica de novo sem defesa decidida' }));
        }
        const manual = r.on && b && !v.comFicha ? h('label', { class: 'atq-man' }, h('span', { text: 'tomou' }),
          h('input', { id: `at-man-${k}`, class: 'in num', type: 'number', min: 0, max: 99999, step: 1, value: v.final == null ? '' : v.final, placeholder: '–', 'aria-label': `Dano que ${t.name} tomou`, title: 'Este token não tem ficha: diga quanto de dano ele tomou',
            onchange: e => { const n = String(e.target.value).trim() === '' ? null : Math.max(0, Number(String(e.target.value).replace(',', '.')) || 0); r.manual = n; paint(); } })) : null;
        return h('li', { class: 'area-row atq-row' + (r.on ? '' : ' off') },
          h('div', { class: 'atq-1' },
            h('label', { class: 'area-who' },
              h('input', { type: 'checkbox', class: 'ck', id: `at-on-${k}`, checked: r.on, 'aria-label': 'Incluir ' + t.name, onchange: e => { r.on = e.target.checked; paint(); } }),
              tokenAvatar(t, 26), h('span', { class: 'area-n', text: t.name + (t.hidden ? ' (oculto)' : '') })),
            h('span', { class: 'area-res', id: `at-res-${k}`, text: res })),
          r.on && b ? h('div', { class: 'atq-2' }, h('span', { class: 'atq-como' + (v.falta ? ' falta' : ''), id: `at-como-${k}`, text: v.comFicha ? v.como : 'sem ficha' }), manual, acoes) : null);
      }));
      if (fid) { const n = document.getElementById(fid); if (n && !n.disabled) n.focus({ preventScroll: true }); }
    };
    function pedir() {
      const Pt = ponte();
      if (!Pt || !Pt.registro || !Pt.registro.pedir) { toast('Esta mesa ainda não recebe pedidos. Recarregue a página e tente de novo.'); return; }
      const vistos = new Set(), lst = [];
      for (const r of st.rows) {
        const v = ver(r);
        if (!v || !r.on || !v.b || !v.comFicha || !v.dono || !v.falta || vistos.has(v.t.char)) continue;
        vistos.add(v.t.char); lst.push({ c: v.t.char, n: String((Fichas.get(v.t.char) || {}).nome || v.t.name).slice(0, 60) });
      }
      if (!lst.length) return;
      st.pedindo = true; paint();
      Pt.registro.pedir({ rot: inNome.value.trim().slice(0, 40), defs: chaves(), alvos: lst }).then(res => {
        st.pedindo = false;
        if (atq !== st) { try { Pt.registro.encerrar(res.id, 'cancelado'); } catch (e) { /* a janela já fechou */ } return; }
        st.pedido = { id: res.id, fim: null, chars: new Set(lst.map(x => x.c)) };
        toast(lst.length === 1 ? `Pedido enviado: ${lst[0].n} rola a defesa pela mesa ao vivo.` : `Pedido enviado: ${lst.length} personagens rolam a defesa pela mesa ao vivo.`);
        paint();
      }, err => { st.pedindo = false; if (atq === st) { toast((err && err.message) || 'O pedido não chegou à mesa. Tente de novo.'); paint(); } });
    }
    // a defesa que um jogador rolou pela mesa ao vivo, a pedido (ver daMesa)
    st.chegou = (l, s) => {
      if (!st.pedido || st.pedido.fim || s.p !== st.pedido.id || !l.nova || typeof s.c !== 'string') return;
      const Pt = ponte(), eu = Pt ? Pt.estado.eu : null, ficha = Fichas.get(s.c);
      if (!ficha || !(l.autor_id === eu || (ficha.dono_id && ficha.dono_id === l.autor_id))) return;
      const total = Math.round(Number(s.v));
      let mudou = false;
      for (const r of st.rows) {
        const v = ver(r);
        if (!v || v.t.char !== s.c || !v.comFicha || r.st === 'rolou' || r.st === 'inteira') continue;
        if (!isFinite(total) || total < 0 || total > v.def) { toast(`A rolagem de ${v.t.name} (${isFinite(total) ? total : '?'}) não cabe na defesa dele agora (${v.def}). Role por ele, ou use a defesa inteira.`); continue; }
        const dado = Math.round(Number(s.d)), fx = Math.round(Number(s.f)), at = Math.round(Number(s.a));
        r.st = 'rolou'; r.r = { total, det: at === v.def && dado >= 1 && fx >= 0 && fx + dado === total ? `${dado} no d${at - fx}${fx ? ' + ' + fx : ''}` : '', por: l.autor_id === eu ? 'pelo mestre' : '' };
        mudou = true;
      }
      if (mudou) paint();
    };
    const aplicar = () => {
      const d = dano();
      if (d == null || !(d > 0)) { toast('Em "Dano", digite um número maior que zero.'); inDano.focus(); return false; }
      const vs = st.rows.map(r => ({ r, v: ver(r) })).filter(x => x.v && x.r.on && x.v.b);
      if (!vs.length) { toast('Marque pelo menos um token que tenha a barra escolhida.'); return false; }
      const falta = vs.filter(x => x.v.falta);
      if (falta.length) { toast(falta.length === 1 ? `Falta a defesa de ${falta[0].v.t.name}: role por ele ou use a defesa inteira.` : `Faltam ${falta.length} defesas: role por eles ou use a defesa inteira.`); return false; }
      App.opt.atqMin = minimo(); App.opt.atqAvisar = st.avisar;
      const nome = inNome.value.trim().slice(0, 40), rotulo = 'Ataque' + (nome ? ': ' + nome : ''), barra = selBar.value, nomeDef = Combate.nomeDasDefesas(chaves());
      const linhas = vs.map(x => ({ t: x.v.t, final: x.v.final, v: x.v, r: x.r }));
      const feitos = Combate.aplicarAtaque(linhas, barra, rotulo);
      fecharAtaque('aplicado');
      // o resultado, para a mesa: só de quem os jogadores podem ver com números (nunca de um token oculto)
      let avisou = false;
      const titulo = rotulo.replace(':', ' ·');
      if (st.avisar && Ext.roll) {
        const partes = [];
        for (const l of linhas) {
          const t = l.t, i = Combate.barraDe(t, barra);
          if (i < 0 || !Combate.barraAberta(t, t.bars[i])) continue;
          const quem = t.showName === false ? '???' : t.name;
          const def = l.v.comFicha && st.defs.size ? ` (defesa ${l.v.usada}${l.r.st === 'rolou' ? ', rolada' : ''})` : '';
          partes.push(l.final > 0 ? `${quem} −${fmt(l.final)} ${barra}${def}` : `${quem}: nada passou${def}`);
        }
        if (partes.length) {
          const regra = [`Dano ${fmt(d)}`, nomeDef ? 'defesa: ' + nomeDef : 'sem defesa', minimo() > 0 ? 'mínimo ' + fmt(minimo()) : '', maximo() != null ? 'máximo ' + fmt(maximo()) : ''].filter(Boolean).join(' · ');
          try { Ext.roll({ kind: 'aviso', titulo, resumo: regra + '. ' + partes.join('; ') + '.' }); avisou = true; } catch (e) { console.error(e); }
        }
      }
      const desfazer = () => {
        const e = Store.undo();
        if (!e) return;
        pruneSel();
        toast('Desfeito' + (e.label ? ': ' + e.label.toLowerCase() : '') + '.');
        if (avisou && e.label === rotulo && Ext.roll) { try { Ext.roll({ kind: 'aviso', titulo, resumo: 'Desfeito: as barras voltaram ao que eram antes deste ataque.' }); } catch (err) { console.error(err); } }
      };
      if (feitos.length) toast(`${rotulo}: aplicado em ${feitos.length} ${feitos.length === 1 ? 'token' : 'tokens'}.`, { action: 'Desfazer', run: desfazer });
      else toast('Nada mudou: nenhum dano passou.');
    };
    for (const el of [inDano, inMin, inMax]) el.addEventListener('input', paint);
    selBar.addEventListener('change', paint);
    const todos = on => { st.rows.forEach(r => { r.on = on; }); paint(); };
    const card = UI.modal({
      title: o.titulo ? 'Ataque com defesa · ' + String(o.titulo).replace(/^Aplicar a /, '') : 'Ataque com defesa', wide: true,
      onCancel: () => fecharAtaque('cancelado'),
      body: h('div', { class: 'area atq' },
        h('div', { class: 'atq-top' }, field('Dano', inDano, 'stack'), field('Barra', selBar, 'stack'), field('Nome (opcional)', inNome, 'stack')),
        h('div', { class: 'field stack' }, h('span', { class: 'lb', text: 'Defesa que desconta' }), chips,
          note('Marque uma ou mais: elas se somam. Vale para os alvos com ficha.')),
        linhaModo,
        h('div', { class: 'atq-mm' }, field('Mínimo', inMin, 'stack'), field('Máximo', inMax, 'stack'), h('span', { class: 'note', text: 'O mínimo e o máximo valem depois do desconto.' })),
        pedidoEl,
        h('div', { class: 'area-bar' }, conta, h('span', { class: 'spacer' }), btn('Todos', () => todos(true), { kind: 'small' }), btn('Nenhum', () => todos(false), { kind: 'small' })),
        lista,
        toggle('at-avisar', st.avisar, v => { st.avisar = v; }, 'Avisar a mesa do resultado'),
        note('O aviso lista só quem os jogadores podem ver com números; token oculto nunca entra. Nada muda antes de "Aplicar", e dá para desfazer.')),
      actions: [{ label: 'Cancelar', run: () => fecharAtaque('cancelado') }, { label: 'Aplicar', kind: 'primary', run: aplicar }],
    });
    st.card = card;
    K.live(paint);
    paint();
    // se a janela sumir por outro caminho (outra janela por cima, a página trocando de cena), o pedido não fica aberto
    atqRelogio = setInterval(() => { if (atq === st && !document.body.contains(card)) fecharAtaque('cancelado'); }, 1500);
  }
  // Chegou da mesa ao vivo uma linha com recado para as Cenas (ver 11-boot.js): a defesa rolada a pedido.
  function daMesa(l) {
    const s = l && l.dados && l.dados.sis;
    if (!s || typeof s !== 'object' || s.t !== 'rd' || !atq || !isGM()) return;
    try { atq.chegou(l, s); } catch (e) { console.error(e); }
  }
  window.addEventListener('pagehide', () => { if (atq) encerrarPedido('cancelado'); });
  // a cena aberta passou a ser outra: os alvos eram da cena de antes, então a janela do ataque fecha (e o pedido, se havia, é cancelado)
  Store.on('scene', () => {
    if (atq && atq.cena !== Store.S.current) { const c = atq.card; fecharAtaque('cancelado'); if (c && K.card() && K.card().contains(c)) UI.closeModal(); }
    if (pop) { try { pintarPop(); } catch (e) { fecharPop(); } }
  });

  // A cada redesenho geral: a janelinha de atributos acompanha (valores da ficha, turno, token que saiu).
  function refresh() { if (pop) { try { pintarPop(); } catch (e) { console.error(e); fecharPop(); } } }

  return { atributos, alternar, podeAtributos, disputa, grupo, ataque, podeAtaque, terrainPanel, fixasBox, fixaAtual, guardarFixa, daMesa, refresh, fechar: fecharPop, aberto: () => !!pop };
})();
