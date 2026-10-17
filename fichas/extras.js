/* Tiny Cats · Fichas: o que entrou depois da calculadora original.
     · imagem do personagem (na mesa, vai para o banco; sem mesa, fica neste navegador)
     · Lapros (as moedas) e passivas ou efeitos em cada equipamento
     · distribuição livre de atributos (fichas de jogador não seguem a tabela de tiers)
     · Sanidade, Conforto e Relacionamentos
   A calculadora (index.html) chama estas funções de dentro do desenho da ficha. Tudo aqui lê as variáveis dela
   (S, save, render, esc, uid, toast, calcular, ATRIBS…) só na hora de usar. */
const FichasExtras = (() => {
  'use strict';
  const q = (host, s) => host.querySelector(s);
  const qa = (host, s) => Array.from(host.querySelectorAll(s));
  const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
  const inteiro = v => { const n = Math.round(+v); return Number.isFinite(n) ? n : 0; };

  /* Redesenhar depois de uma mudança num campo, sem atrapalhar o gesto que a causou.
     A mudança de um campo de texto ou de número chega, quase sempre, quando o cursor está saindo dele: a pessoa
     clicou noutro lugar, apertou Tab, tocou em "próximo" no teclado do celular. Trocar o desenho ali mesmo faria o
     clique cair num botão que já não existe (ele "não pega") e deixaria o cursor perdido — ou de volta no campo de
     onde a pessoa acabou de sair. Então, nesse caso, o que mudou é guardado na hora e só o desenho espera: o clique
     terminar, ou o cursor chegar ao campo seguinte. Depois o cursor fica onde o gesto o deixou.
     Quando a mudança chega com o cursor ainda no campo (Enter, as setas de um número), ou vem de uma lista, de uma
     caixinha ou de um botão, o desenho é feito na hora, e o cursor fica em `focar` (ou onde estava). */
  let saindo = false, esperaLista = null;
  const fila = [];
  document.addEventListener('change', e => {              // (antes de quem trata a mudança)
    const t = e.target;
    saindo = !!e.isTrusted && !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') && t.type !== 'checkbox' && t.type !== 'radio' && document.activeElement !== t;
    if (saindo) setTimeout(() => { saindo = false; }, 0);
  }, true);
  document.addEventListener('change', () => { saindo = false; });       // (e depois)
  const marcaDaFicha = () => document.querySelector('#ficha > *');
  function esvaziarFila() {
    if (!fila.length) return;
    const s = FichasMesa.listaEmUso();
    if (s) {                                 // o clique abriu uma lista: o desenho espera a pessoa escolher, ou sair dela
      if (esperaLista === s) return;
      esperaLista = s;
      // (a pessoa pode sair da lista clicando num botão: aí o desenho espera também esse clique)
      const depois = () => { s.removeEventListener('change', depois); s.removeEventListener('blur', depois); if (esperaLista === s) esperaLista = null; if (!FichasMesa.depoisDoGesto(esvaziarFila)) setTimeout(esvaziarFila, 0); };
      s.addEventListener('change', depois); s.addEventListener('blur', depois);
      return;
    }
    // (o que estava à espera quando a ficha inteira foi redesenhada por outro motivo já está desenhado)
    const fs = fila.splice(0).filter(x => !x.marca || x.marca.isConnected);
    if (fs.length) FichasMesa.comCursor(() => fs.forEach(x => { try { x.fn(); } catch (e) { console.error(e); } }));
  }
  function desenhar(fn, focar) {
    const i = fila.findIndex(x => x.fn === fn); if (i >= 0) fila.splice(i, 1);
    if (saindo) {
      fila.push({ fn, marca: marcaDaFicha() });
      if (!FichasMesa.depoisDoGesto(esvaziarFila)) setTimeout(esvaziarFila, 0);
      return;
    }
    if (focar) { fn(); const n = document.querySelector(focar); if (n && !n.disabled) n.focus({ preventScroll: true }); }
    else FichasMesa.comCursor(fn);
  }

  /* Aviso com um botão (Desfazer). Some sozinho — mas não enquanto o ponteiro (ou o teclado) está nele: quem ia clicar
     em "Desfazer" não o perde no caminho. Saindo dele, fica o tempo que faltava (e pelo menos mais um pouco). */
  function aviso(texto, acao, fn, ms) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = 'toast comacao';
    const s = document.createElement('span'); s.textContent = texto; d.append(s);
    if (acao) { const b = document.createElement('button'); b.type = 'button'; b.textContent = acao; b.onclick = () => { d.remove(); fn(); }; d.append(b); }
    document.body.append(d);
    const tempo = ms || (acao ? 8000 : 2600), fim = Date.now() + tempo;
    let relogio = setTimeout(() => d.remove(), tempo), dentro = 0;
    const segura = () => { dentro++; clearTimeout(relogio); };
    const solta = () => { dentro = Math.max(0, dentro - 1); if (!dentro) { clearTimeout(relogio); relogio = setTimeout(() => d.remove(), Math.max(2500, fim - Date.now())); } };
    d.addEventListener('pointerenter', segura); d.addEventListener('pointerleave', solta);
    d.addEventListener('focusin', segura); d.addEventListener('focusout', solta);
  }

  /* ======================= imagem do personagem ======================= */
  const iniciais = nome => { const p = String(nome || '').trim().split(/\s+/).filter(Boolean); return ((p[0] ? Array.from(p[0])[0] : '?') + (p[1] ? Array.from(p[1])[0] : '')).toUpperCase(); };
  // só aceita como imagem o que é imagem: endereço https ou a imagem embutida que esta página mesma gerou
  const imagemOk = u => typeof u === 'string' && (/^https:\/\//.test(u) || /^data:image\/(png|jpeg|webp);base64,/.test(u));
  function htmlRetrato(pc, embaixo) {
    const tem = imagemOk(pc.img);
    return `<div class="retrato">
      <button type="button" class="quadro" id="btnImg" title="${tem ? 'Trocar a imagem' : 'Pôr uma imagem do personagem'}" aria-label="${tem ? 'Trocar a imagem do personagem' : 'Pôr uma imagem do personagem'}">
        ${tem ? `<img src="${esc(pc.img)}" alt="">` : `<span class="ini">${esc(iniciais(pc.nome))}</span>`}
      </button>
      <div class="acoes">
        <button type="button" class="mini" id="btnImg2">${tem ? 'Trocar' : 'Pôr imagem'}</button>
        ${tem ? '<button type="button" class="mini danger" id="btnImgX" title="Tirar a imagem" aria-label="Tirar a imagem">×</button>' : ''}
      </div>
      <input type="file" id="imgIn" accept="image/png,image/jpeg,image/webp" hidden>
      ${embaixo || ''}
    </div>`;
  }
  const miniatura = p => (imagemOk(p.img) ? `<img class="avmini" src="${esc(p.img)}" alt="" loading="lazy">` : `<span class="avmini semimg" aria-hidden="true">${esc(iniciais(p.nome))}</span>`);

  /* Diminui a imagem (o retrato não precisa ser grande) e devolve um arquivo leve: WebP, ou PNG onde o navegador não gera WebP. */
  async function reduzir(arq, lado) {
    let fonte, w, h, fechar = () => {};
    try { const b = await createImageBitmap(arq); fonte = b; w = b.width; h = b.height; fechar = () => { try { b.close(); } catch (e) { /* já fechada */ } }; }
    catch (e) {
      const u = URL.createObjectURL(arq);
      fonte = await new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('Não deu para ler esta imagem.')); im.src = u; });
      w = fonte.naturalWidth; h = fonte.naturalHeight; fechar = () => URL.revokeObjectURL(u);
    }
    try {
      if (!w || !h) throw new Error('Não deu para ler esta imagem.');
      const k = Math.min(1, lado / Math.max(w, h));
      const cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
      cv.getContext('2d').drawImage(fonte, 0, 0, cv.width, cv.height);
      let blob = await new Promise(r => cv.toBlob(r, 'image/webp', 0.86));
      if (!blob || blob.type !== 'image/webp') blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      return blob;
    } finally { fechar(); }
  }
  const paraDataUrl = blob => new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => falha(r.error || new Error('Não deu para ler a imagem.')); r.readAsDataURL(blob); });
  /* Na mesa a imagem vai para o banco (e todos a veem pelo endereço); sem mesa fica embutida na ficha, neste navegador. */
  async function guardarImagem(arq) {
    const naMesa = FichasMesa.ativo();
    const blob = await reduzir(arq, naMesa ? 512 : 256);
    return naMesa ? TC.arquivos.subir(blob) : paraDataUrl(blob);
  }
  async function escolherImagem(pc, arq, botao) {
    if (!arq) return;
    if (!/^image\/(png|jpeg|webp)$/.test(arq.type || '')) { toast('Escolha uma imagem PNG, JPG ou WebP.'); return; }
    const rotulo = botao ? botao.textContent : '';
    if (botao) { botao.disabled = true; botao.textContent = FichasMesa.ativo() ? 'Enviando…' : 'Preparando…'; }
    try {
      const url = await guardarImagem(arq);
      const antes = pc.img || null;
      pc.img = url; save(); render();
      aviso(antes ? 'Imagem trocada.' : 'Imagem do personagem posta.', 'Desfazer', () => { if (antes) pc.img = antes; else delete pc.img; save(); render(); });
    } catch (e) {
      if (botao) { botao.disabled = false; botao.textContent = rotulo; }
      toast((e && e.message) || 'Não deu para usar esta imagem.');
    }
  }
  function ligarRetrato(host, pc) {
    const arq = q(host, '#imgIn'); if (!arq) return;
    const b2 = q(host, '#btnImg2');
    const abrir = () => arq.click();
    q(host, '#btnImg').onclick = abrir;
    if (b2) b2.onclick = abrir;
    arq.onchange = () => { const f = arq.files && arq.files[0]; arq.value = ''; escolherImagem(pc, f, b2); };
    const x = q(host, '#btnImgX');
    if (x) x.onclick = () => { const antes = pc.img; delete pc.img; save(); render(); aviso('Imagem tirada.', 'Desfazer', () => { pc.img = antes; save(); render(); }); };
  }

  /* ======================= Lapros ======================= */
  const MOEDA = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="8" rx="7" ry="3.2"/><path d="M5 8v4c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2V8"/><path d="M5 12v4c0 1.8 3.1 3.2 7 3.2s7-1.4 7-3.2v-4"/></svg>';
  const laprosDe = pc => { const v = pc.estado && pc.estado.lapros; return Number.isFinite(+v) && v !== null && v !== '' ? Math.max(0, inteiro(v)) : 0; };
  function htmlLapros(pc) {
    return `<label class="f lapros"><span class="eyebrow">Lapros</span>${MOEDA}
      <input type="text" inputmode="numeric" id="f_lapros" autocomplete="off" value="${laprosDe(pc)}" title="As moedas do personagem. Digite o valor, ou +30 e −50 para somar e subtrair do que ele tem."></label>`;
  }
  /* O que foi digitado no campo de Lapros: um valor ("120") troca o total; com sinal na frente ("+30", "-50", "−50")
     soma ou subtrai do que o personagem tem. Nunca fica abaixo de zero. Devolve { total, delta } ou null (não é número). */
  function lerLapros(texto, atual) {
    const t = String(texto || '').replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(',', '.');
    const m = /^([+-]?)(\d+(?:\.\d+)?)$/.exec(t);
    if (!m) return null;
    const n = inteiro(m[2]);
    if (!m[1]) return { total: Math.max(0, n), delta: null };
    const delta = m[1] === '-' ? -n : n;
    return { total: Math.max(0, atual + delta), delta };
  }
  function ligarLapros(host, pc) {
    const i = q(host, '#f_lapros'); if (!i) return;
    const valer = () => {
      const antes = laprosDe(pc), r = lerLapros(i.value, antes);
      if (r && r.total !== antes) {
        const est = pc.estado || (pc.estado = {}); est.lapros = r.total; save();
        if (r.delta != null) aviso('Lapros: ' + antes + (r.delta < 0 ? ' − ' : ' + ') + Math.abs(r.delta) + ' = ' + r.total + '.', 'Desfazer', () => { (pc.estado || (pc.estado = {})).lapros = antes; save(); i.value = laprosDe(pc); });
      }
      i.value = laprosDe(pc);
    };
    // Um valor sem sinal vale a cada tecla, como sempre foi. Com sinal na frente, só ao sair do campo ou com Enter:
    // "−5" a caminho de "−50" não pode valer no meio do caminho.
    i.oninput = () => { const t = i.value.trim(); if (/^\d+$/.test(t)) { (pc.estado || (pc.estado = {})).lapros = Math.max(0, inteiro(t)); save(); } };
    i.onchange = valer;
    i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } };
  }

  /* ======================= sobrevida de um recurso ======================= */
  // Pontos por cima de um recurso (HP, por exemplo), que absorvem o dano antes dele. No mapa, aparecem como uma
  // barrinha por cima da barra do token ligado a esta ficha.
  const sobrevidaDe = (pc, r) => { const v = pc.estado && pc.estado.sob && pc.estado.sob[r.id]; return Number.isFinite(+v) && +v > 0 ? Math.round(+v * 10) / 10 : 0; };
  function htmlSobrevida(pc, r) {
    const v = sobrevidaDe(pc, r);
    return `<label class="sobre ${v > 0 ? 'tem' : ''}" title="Pontos por cima de ${esc(r.nome)}: o dano gasta primeiro a sobrevida"><span class="eyebrow">Sobrevida</span>
      <input class="inm" type="number" min="0" step="1" data-ressob="${esc(r.id)}" value="${v}" aria-label="Sobrevida de ${esc(r.nome)}"></label>`;
  }
  function ligarSobrevida(host, pc) {
    qa(host, '[data-ressob]').forEach(i => {
      i.oninput = () => {
        const est = pc.estado || (pc.estado = {}), sob = est.sob || (est.sob = {}), v = Math.max(0, Math.round((+i.value || 0) * 10) / 10);
        if (v > 0) sob[i.dataset.ressob] = v; else delete sob[i.dataset.ressob];
        i.closest('.sobre').classList.toggle('tem', v > 0);
        save();
      };
      i.onchange = () => { i.value = sobrevidaDe(pc, { id: i.dataset.ressob }); };
    });
  }

  /* ======================= equipamentos em cartões (lote 6) =======================
     Cada item é um cartão: a chave de equipado, o nome, só os bônus que ele tem ("FOR +3 · DFF +2") e, quando há, as
     passivas. "Editar" abre os números (atributos, secundários, defesas, barras e defesas específicas), as passivas, a
     relíquia (só um destaque dourado) e o grupo de troca: dos itens do mesmo grupo, um só fica equipado — equipar um
     guarda os outros (a conta é de TC.rules.equiparItem). E o "Só funciona com…" (it.req): um item complementar (a
     bainha da espada) só vale com o item ou um item do grupo de troca escolhido; equipá-lo traz o requisito junto, e
     guardar o requisito guarda os que dependem dele — que voltam quando o requisito voltar.
     (lote 7) Os cartões ficam em seções por tipo (it.tipo: Armas, Armaduras…, e os tipos que quem mestra cria, em
     S.cfg.tiposItem), com os equipados primeiro; as seções se recolhem (o aparelho lembra, em S.itFechadas). Em cima,
     os filtros (tipo, equipados ou guardados, relíquias e a busca pelo nome — só nesta tela, sem gravar nada). A alça
     do cartão arrasta (soltar noutra seção troca o tipo) e, com o teclado, as setas sobem e descem. Um item pode ter
     níveis (Katana de gelo Nv 1, 2, 3): o ◂ Nv ▸ do cartão troca o de agora — o dono e quem mestra; a mesa ao vivo
     fica sabendo — e o "Editar" tem uma aba por nível, cada uma com os números e a passiva dela (as contas são de
     TC.rules: itemNoNivel, itemComNivelNovo, itemSemNivel). O "Só funciona com…" aceita vários (vale com qualquer
     um) e, num item com níveis, um nível mínimo. */
  const itensAbertos = new Set();            // os cartões abertos em edição nesta tela (pelo id do item)
  const nivelAberto = new Map();             // id do item → o nível aberto no "Editar" (sem nada: o de agora)
  const filtros = new Map();                 // id da ficha → { t: '' | id do tipo | '-' (sem tipo), e: '' | 'on' | 'off', r, q }
  const RELIQUIA_SVG = '<svg class="icorel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11l3.5 5.5-9 11.5L3 9z"/><path d="M3 9h18M9.5 3.5 12 9l2.5-5.5M12 9v11.5"/></svg>';
  const TROCA_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>';
  const LIGA_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg>';
  const ALCA_SVG = '<svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="3" r="1.4"/><circle cx="8.5" cy="3" r="1.4"/><circle cx="3.5" cy="8" r="1.4"/><circle cx="8.5" cy="8" r="1.4"/><circle cx="3.5" cy="13" r="1.4"/><circle cx="8.5" cy="13" r="1.4"/></svg>';
  const juntarE = l => (l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  const RQ = () => (window.TC && TC.rules && TC.rules.reqDoItem ? TC.rules : null);
  const R7 = () => (window.TC && TC.rules && TC.rules.secoesDeItens ? TC.rules : null);
  // o item vale (soma nas contas)? — equipado e com o que ele precisa
  const ativoNa = (it, pc) => (RQ() ? RQ().itemAtivo(it, pc.itens || []) : it.equipado !== false);
  const grupoDe = it => (window.TC && TC.rules && TC.rules.grupoDeTroca ? TC.rules.grupoDeTroca(it) : String((it && it.troca) || '').trim().slice(0, 40));
  const normG = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const nomeIt = it => String((it && it.nome) || '').trim();
  // quem cria e arruma os tipos: quem mestra (fora de uma mesa, quem usa a página)
  const quemMestra = () => !FichasMesa.ativo() || FichasMesa.mestre();
  const tiposDaMesa = () => (R7() ? R7().tiposDeItem(S.cfg) : []);
  const chaveTipo = (it, tipos) => { const t = R7() ? R7().tipoDoItem(it, tipos || tiposDaMesa()) : null; return t ? t.id : ''; };
  const nomeDoTipo = (k, tipos) => { const t = (tipos || tiposDaMesa()).find(x => x.id === k); return t ? t.nome : ''; };
  // os filtros desta ficha (só nesta tela)
  const filtroDe = pc => filtros.get(pc.id) || { t: '', e: '', r: false, q: '' };
  const filtrando = f => !!(f.t || f.e || f.r || String(f.q || '').trim());
  const passa = (it, f, tipos) => (!f.t || (f.t === '-' ? !chaveTipo(it, tipos) : chaveTipo(it, tipos) === f.t))
    && (!f.e || (f.e === 'on') === (it.equipado !== false)) && (!f.r || !!it.reliquia) && (!String(f.q || '').trim() || normG(it.nome).includes(normG(f.q)));
  const fechadas = () => new Set(Array.isArray(S.itFechadas) ? S.itFechadas : []);
  // só o que o item soma: as chaves com valor, o máximo de barras e as defesas específicas — [{ rot, v, title }]
  function bonusDoItem(it, pc) {
    const b = it.bonus || {}, out = [];
    ATRIBS.concat(DERIV, DEFESAS).forEach(x => { const v = +b[x.k] || 0; if (v) out.push({ rot: x.rot || x.k, v, title: x.nome }); });
    if (RR()) {
      const rec = it.rec && typeof it.rec === 'object' ? it.rec : {}, def = it.def && typeof it.def === 'object' ? it.def : {};
      (pc.recursos || []).forEach(r => { const v = +rec[r.id] || 0; if (v) out.push({ rot: r.nome || 'Barra', v, title: 'No máximo de ' + (r.nome || 'barra') }); });
      ESP().forEach(d => { const v = +def[d.k] || 0; if (v) out.push({ rot: 'Def. ' + d.nome, v, title: 'Defesa contra ' + d.nome.toLowerCase() }); });
    }
    return out;
  }
  const chipsBonus = lista => lista.map(b => `<span class="itb ${b.v < 0 ? 'neg' : ''}" title="${esc(b.title)}">${esc(b.rot)} ${sinalTxt(b.v)}</span>`).join('<span class="itsep" aria-hidden="true">·</span>');
  // o nível aberto no "Editar" de um item com níveis (0: item comum)
  function nivelEditado(it) {
    const R = R7();
    if (!R || !R.temNiveis(it)) return 0;
    return Math.max(1, Math.min(R.niveisDoItem(it).length, nivelAberto.get(it.id) || R.nivelDoItem(it)));
  }
  function editorItem(it, pc) {
    const R = R7(), k = nivelEditado(it), lv = k ? R.niveisDoItem(it) : null, alvo = k ? lv[k - 1] : it, nvAttr = k ? ` data-nv="${k}"` : '';
    const campo = (x, cls) => `<label class="itn ${cls}"><span>${esc(x.rot || x.k)}</span><input type="number" step="1" data-itembon="${esc(it.id)}|${x.k}"${nvAttr} value="${(+(alvo.bonus || {})[x.k] || 0)}" aria-label="${esc(x.nome)}: quanto ${esc(it.nome || 'este item')} soma${k ? ' no Nv ' + k : ''}"></label>`;
    const tipos = tiposDaMesa(), tAtual = chaveTipo(it, tipos);
    const selTipo = R ? `<label class="f ittipof"><span class="eyebrow">Tipo</span><select data-ittipo="${esc(it.id)}" aria-label="Tipo de ${esc(it.nome || 'item sem nome')}">
        <option value="" ${tAtual ? '' : 'selected'}>Sem tipo</option>
        ${tipos.map(t => `<option value="${esc(t.id)}" ${t.id === tAtual ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}
        ${quemMestra() ? '<option value="+">+ Novo tipo…</option>' : ''}
      </select></label>` : '';
    return `<div class="ited">
      ${R ? `<div class="itcab">${selTipo}${htmlNiveis(it, k, lv)}</div>` : ''}
      <div class="itgrupos">
        <div class="itgrupo"><span class="eyebrow">Atributos</span><div class="itnums">${ATRIBS.map(a => campo(a, 'atr')).join('')}</div></div>
        <div class="itgrupo"><span class="eyebrow">Secundários</span><div class="itnums">${DERIV.map(d => campo(d, 'der')).join('')}</div></div>
        <div class="itgrupo"><span class="eyebrow">Defesas</span><div class="itnums">${DEFESAS.map(d => campo(d, 'def')).join('')}</div></div>
      </div>
      ${htmlMaisDoItem(it, pc, alvo, k)}
      <textarea rows="1" data-itemfx="${esc(it.id)}"${nvAttr} placeholder="${k ? 'Passivas e efeitos do Nv ' + k + ' — ex.: +1 dado de gelo contra quem está molhado' : 'Passivas e efeitos deste item — ex.: +10% de dano contra mortos-vivos · 1×/dia: escudo de luz'}" aria-label="Passivas e efeitos de ${esc(it.nome || 'item sem nome')}${k ? ' no Nv ' + k : ''}">${esc(alvo.efeito || '')}</textarea>
      <div class="itopc">
        <label class="chk"><input type="checkbox" data-itemrel="${esc(it.id)}" ${it.reliquia ? 'checked' : ''}> <span>Relíquia <span class="hint">(o cartão fica dourado)</span></span></label>
        <label class="f ittrocaf"><span class="eyebrow">Grupo de troca</span><input class="inm" data-itemtroca="${esc(it.id)}" value="${esc(String(it.troca == null ? '' : it.troca))}" maxlength="40" list="gruposTroca" placeholder="ex.: Arma principal" autocomplete="off" title="Dos itens do mesmo grupo, um só fica equipado: equipar um guarda os outros"></label>
        ${opcoesReq(it, pc)}
      </div>
    </div>`;
  }
  // as abas dos níveis no "Editar" (ou o "+ nível" de um item comum)
  function htmlNiveis(it, k, lv) {
    const R = R7(), nome = esc(it.nome || 'item sem nome');
    if (!k) return `<div class="itnvacoes"><button type="button" class="mini" data-itnvnovo="${esc(it.id)}" title="Para um item que melhora (Katana Nv 1, 2, 3…): cada nível com os números e a passiva dele. O Nv 2 começa igual ao 1.">+ nível</button><span class="hint">para um item que sobe de nível</span></div>`;
    const atual = R.nivelDoItem(it);
    return `<div class="itnvbloco">
      <div class="itniveis" role="group" aria-label="Níveis de ${nome}">
        ${lv.map((_, i) => `<button type="button" class="itnvaba ${i + 1 === k ? 'on' : ''}" data-itnvaba="${esc(it.id)}" data-nv="${i + 1}" aria-pressed="${i + 1 === k}">Nv ${i + 1}${i + 1 === atual ? '<span class="itagora">agora</span>' : ''}</button>`).join('')}
        ${lv.length < R.NIVEIS_MAX ? `<button type="button" class="mini" data-itnvnovo="${esc(it.id)}" title="Um nível a mais, que começa igual ao último">+ nível</button>` : ''}
      </div>
      <div class="itnvacoes">
        <span class="hint">${k === atual ? 'Nv ' + k + ' é o de agora: é ele que soma na ficha.' : 'Nv ' + k + ' não está em uso.'}</span>
        ${k !== atual ? `<button type="button" class="mini" data-itnvusar="${esc(it.id)}" data-nv="${k}">Usar o Nv ${k}</button>` : ''}
        ${k > 1 ? `<button type="button" class="mini" data-itnvcopia="${esc(it.id)}" data-nv="${k}" title="Os números e a passiva do Nv ${k - 1} no lugar dos do Nv ${k}">Copiar do Nv ${k - 1}</button>` : ''}
        <button type="button" class="mini danger" data-itnvtira="${esc(it.id)}" data-nv="${k}" title="Tira o Nv ${k} (dá para desfazer). Sobrando um nível só, o item volta a ser comum.">Tirar o Nv ${k}</button>
      </div>
    </div>`;
  }
  /* "Só funciona com…": nada, ou um ou mais grupos de troca (qualquer item dele serve) e outros itens da ficha — vale
     com qualquer um deles. Um item com níveis pode pedir um nível mínimo. */
  const reqsBrutos = it => (Array.isArray(it.req) ? it.req.filter(x => typeof x === 'string') : typeof it.req === 'string' && it.req ? [it.req] : []);
  // a lista de volta no item: nenhum (sai), um (texto, como antes) ou vários (lista)
  function porReqs(it, l) { delete it.volta; if (!l.length) delete it.req; else it.req = l.length === 1 ? l[0] : l.slice(); }
  function opcoesReq(it, pc) {
    const R = RQ(), itens = (pc.itens || []).filter(Boolean), outros = itens.filter(x => x.id !== it.id), brutos = reqsBrutos(it);
    const ler = r => (R && R.reqsDoItem ? R.reqsDoItem({ req: r })[0] || null : null);
    const usados = new Set();
    const chips = brutos.map((r, i) => {
      const qq = ler(r);
      let nome = 'Requisito estranho', fora = true, alvo = null;
      if (qq && qq.t === 'g') { nome = 'Grupo de troca: ' + qq.g; fora = !outros.some(x => normG(grupoDe(x)) === normG(qq.g)); usados.add('g:' + normG(qq.g)); }
      else if (qq) { alvo = itens.find(x => String(x.id) === qq.id) || null; nome = alvo ? 'Item: ' + (nomeIt(alvo) || 'sem nome') : 'Item que saiu da ficha'; fora = !alvo; usados.add('i:' + qq.id); }
      const R2 = R7(), comNv = !!alvo && !!R2 && R2.temNiveis(alvo), n = comNv ? Math.max(R2.niveisDoItem(alvo).length, (qq && qq.nv) || 0) : 0;
      const nvSel = comNv ? `<select class="itreqnv" data-itreqnv="${esc(it.id)}" data-i="${i}" aria-label="Nível de ${esc(nomeIt(alvo) || 'item')} para valer">
          <option value="" ${qq.nv ? '' : 'selected'}>qualquer nível</option>
          ${Array.from({ length: n - 1 }, (_, j) => j + 2).map(v => `<option value="${v}" ${qq.nv === v ? 'selected' : ''}>Nv ${v} ou mais</option>`).join('')}</select>` : '';
      return `<span class="chipb itreqc ${fora ? 'fora' : ''}"><b>${esc(nome)}${fora ? ' (não está mais aqui)' : ''}</b>${nvSel}<button type="button" class="chipx" data-itreqdel="${esc(it.id)}" data-i="${i}" title="Tirar do “Só funciona com…”" aria-label="Tirar ${esc(nome)} do “Só funciona com…”">×</button></span>`;
    });
    const grupos = [...new Set(outros.map(grupoDe).filter(Boolean))];
    const ops = grupos.filter(g => !usados.has('g:' + normG(g))).map(g => ['g:' + g, 'Grupo de troca: ' + g])
      .concat(outros.filter(x => !usados.has('i:' + x.id)).map(x => ['i:' + x.id, 'Item: ' + (nomeIt(x) || 'sem nome')]));
    const add = `<select data-itemreq="${esc(it.id)}" title="Um item complementar (a bainha da espada) só vale com o que for escolhido aqui — com qualquer um, quando são vários. Equipá-lo equipa o que ele precisa; guardar o que ele precisa guarda ele junto, e ele volta quando aquilo voltar.">
        <option value="" selected>${brutos.length ? '+ mais um…' : 'Funciona sozinho'}</option>
        ${ops.map(o => `<option value="${esc(o[0])}">${esc(o[1])}</option>`).join('')}</select>`;
    return `<div class="f itreqf"><span class="eyebrow">Só funciona com…</span>
      ${brutos.length ? `<div class="itreqs">${chips.join('')}</div>` : ''}
      ${!brutos.length || ops.length ? add : ''}
      ${brutos.length > 1 ? '<span class="hint">Vale com qualquer um deles.</span>' : ''}</div>`;
  }
  // o ◂ Nv 2 ▸ do cartão
  function htmlNivelCartao(it) {
    const R = R7(), nv = R.nivelDoItem(it), n = R.niveisDoItem(it).length, nome = esc(nomeIt(it) || 'o item');
    return `<span class="itnv" title="Nível de agora: ${nv} de ${n}">
      <button type="button" class="itnvb" data-itnv="${esc(it.id)}" data-d="-1" ${nv <= 1 ? 'disabled' : ''} aria-label="${nv <= 1 ? 'Já está no Nv 1' : 'Descer ' + nome + ' para o Nv ' + (nv - 1)}">◂</button>
      <b>Nv ${nv}</b>
      <button type="button" class="itnvb" data-itnv="${esc(it.id)}" data-d="1" ${nv >= n ? 'disabled' : ''} aria-label="${nv >= n ? 'Já está no último nível' : 'Subir ' + nome + ' para o Nv ' + (nv + 1)}">▸</button></span>`;
  }
  function cartaoItem(it, pc, escondido) {
    const aberto = itensAbertos.has(it.id), on = it.equipado !== false, g = grupoDe(it), fx = String(it.efeito || '').trim(), bon = bonusDoItem(it, pc);
    const req = RQ() ? RQ().nomeDoReq(it, pc.itens || []) : '', semEfeito = on && req && !ativoNa(it, pc);
    const pode = FichasMesa.podeEditar(pc), niv = !!R7() && R7().temNiveis(it);
    const alca = pode && !!R7();
    return `<div class="itcard ${on ? '' : 'guardado'} ${it.reliquia ? 'rel' : ''} ${aberto ? 'aberto' : ''} ${semEfeito ? 'semfx' : ''} ${alca ? 'comalca' : ''}" data-itcard="${esc(it.id)}"${escondido ? ' hidden' : ''}>
      <div class="ittopo">
        ${alca ? `<button type="button" class="itarr" data-itarr="${esc(it.id)}" title="Arraste para mudar a ordem — ou para outra seção, que troca o tipo. Com o teclado: as setas para cima e para baixo." aria-label="Mudar ${esc(nomeIt(it) || 'o item sem nome')} de lugar">${ALCA_SVG}</button>` : ''}
        <label class="itchave" title="${on ? 'Equipado: soma nas contas. Clique para guardar.' : 'Guardado: não soma. Clique para equipar.'}${g ? ' Grupo de troca: ' + esc(g) + '.' : ''}"><input type="checkbox" data-itemon="${esc(it.id)}" ${on ? 'checked' : ''} aria-label="${esc(it.nome || 'Item sem nome')}: equipado"><span class="itsw" aria-hidden="true"></span></label>
        <input class="inm itnome" data-itemnome="${esc(it.id)}" value="${esc(it.nome || '')}" placeholder="Nome do item" aria-label="Nome do item">
        ${niv ? htmlNivelCartao(it) : ''}
        ${it.reliquia ? `<span class="itrel" title="Relíquia">${RELIQUIA_SVG}<span>Relíquia</span></span>` : ''}
        ${g ? `<span class="ittroca" title="Grupo de troca: equipar um item do grupo guarda os outros">${TROCA_SVG}<span>${esc(g)}</span></span>` : ''}
        <span class="itbts"><button type="button" class="mini" data-itemed="${esc(it.id)}" aria-expanded="${aberto}">${aberto ? 'Fechar' : 'Editar'}</button><button type="button" class="mini danger" data-itemdel="${esc(it.id)}" title="Tirar este item (dá para desfazer)" aria-label="Tirar o item ${esc(it.nome || 'sem nome')}">×</button></span>
      </div>
      ${req ? `<div class="itreqlinha"><span class="ittroca itreq ${semEfeito ? 'falta' : ''}" title="${semEfeito ? 'Sem efeito: só vale com ' + esc(req) + ' equipado' : 'Só funciona com ' + esc(req)}">${LIGA_SVG}<span>${semEfeito ? 'sem efeito · ' : 'com '}${esc(req)}</span></span></div>` : ''}
      <div class="itbon">${bon.length ? chipsBonus(bon) : '<span class="hint">sem bônus</span>'}</div>
      ${fx && !aberto ? `<div class="itfxv">${esc(fx)}</div>` : ''}
      ${aberto ? editorItem(it, pc) : ''}
    </div>`;
  }
  const qtdItens = n => (n === 1 ? '1 item' : n + ' itens');
  const qtdEquip = n => (n === 0 ? 'nenhum equipado' : n === 1 ? '1 equipado' : n + ' equipados');
  function painelItens(pc, c) {
    const itens = (pc.itens || []).filter(Boolean), R = R7(), pode = FichasMesa.podeEditar(pc);
    const grupos = [...new Set(itens.map(grupoDe).filter(Boolean))];
    // (um grupo com mais de um item equipado: avisa, sem mexer — o próximo "equipar" do grupo acerta)
    const dobrados = grupos.filter(g => itens.filter(it => it.equipado !== false && normG(grupoDe(it)) === normG(g)).length > 1);
    const tot = ATRIBS.concat(DERIV, DEFESAS).filter(x => c.eq && c.eq[x.k]).map(x => ({ rot: x.rot || x.k, v: c.eq[x.k], title: x.nome }));
    const tipos = tiposDaMesa(), f = filtroDe(pc), filt = filtrando(f), fech = fechadas();
    const secs = R ? R.secoesDeItens(itens, S.cfg) : [{ tipo: null, itens }];
    const semTipo = R ? itens.filter(it => !chaveTipo(it, tipos)) : [];
    const n = (l, p) => l.filter(p).length;
    const fil = (k, rot, qtd, on, titulo) => `<button type="button" class="itf ${on ? 'on' : ''}" data-itfil="${k}" aria-pressed="${on}"${titulo ? ` title="${titulo}"` : ''}>${rot}<span class="mk">${qtd}</span></button>`;
    const htmlFiltros = !R || itens.length < 2 ? '' : `<div class="itfiltros" role="toolbar" aria-label="Filtrar os equipamentos">
        ${fil('t:', 'Todos', itens.length, !f.t)}
        ${secs.map(s => fil('t:' + (s.tipo ? s.tipo.id : '-'), esc(s.tipo ? s.tipo.sec : 'Sem tipo'), s.itens.length, f.t === (s.tipo ? s.tipo.id : '-'))).join('')}
        <span class="itfsep" aria-hidden="true"></span>
        ${fil('e:on', 'Equipados', n(itens, x => x.equipado !== false), f.e === 'on')}
        ${fil('e:off', 'Guardados', n(itens, x => x.equipado === false), f.e === 'off')}
        ${itens.some(x => x.reliquia) ? fil('r:1', 'Relíquias', n(itens, x => !!x.reliquia), !!f.r) : ''}
        <input type="search" class="inm itbusca" data-itbusca value="${esc(f.q || '')}" placeholder="Buscar item…" aria-label="Buscar item pelo nome" autocomplete="off">
        <button type="button" class="mini" data-itfil="limpar"${filt ? '' : ' hidden'}>Limpar filtros</button>
      </div>`;
    const htmlSecao = s => {
      const k = s.tipo ? s.tipo.id : '-', vis = s.itens.filter(it => passa(it, f, tipos)).length, fechada = fech.has(k);
      const rot = `<span class="itseta" aria-hidden="true">${fechada ? '▸' : '▾'}</span><span class="itsecn">${esc(s.tipo ? s.tipo.sec : 'Sem tipo')}</span><span class="itsecq">${qtdItens(s.itens.length)}, ${qtdEquip(n(s.itens, x => x.equipado !== false))}</span>`;
      return `<section class="itsec${fechada ? ' fechada' : ''}${filt ? ' filtrando' : ''}" data-itsec="${esc(k)}"${vis ? '' : ' hidden'}>
        <button type="button" class="itsech" data-itsecbt="${esc(k)}" aria-expanded="${!fechada}" title="${fechada ? 'Mostrar' : 'Recolher'} esta seção">${rot}</button>
        <div class="itcards">${s.itens.map(it => cartaoItem(it, pc, !passa(it, f, tipos))).join('')}</div>
      </section>`;
    };
    const algumVisivel = itens.some(it => passa(it, f, tipos));
    return `<div class="panel" style="margin-bottom:18px" id="painelItens">
      <div class="hd"><span class="eyebrow">Equipamentos</span>
        <span class="hint" style="margin-left:8px">a chave equipa e guarda · “Editar” abre os números, as passivas, os níveis, a relíquia e o grupo de troca</span>
        <span class="itacoes">
          ${R && pode && semTipo.length ? `<button class="mini" data-itseparar title="Sugere o tipo de cada item sem tipo, pelo nome — você confere antes">Separar por tipo…</button>` : ''}
          ${R && quemMestra() ? `<button class="mini" data-ittipos title="Os tipos de equipamento da mesa: os prontos e os que você criar">Tipos…</button>` : ''}
          <button class="mini" data-act="additem">+ Item</button>
        </span>
      </div>
      <div class="bd">
        ${itens.length ? `${htmlFiltros}
        ${R ? secs.map(htmlSecao).join('') : `<div class="itcards">${itens.map(it => cartaoItem(it, pc)).join('')}</div>`}
        <div class="hint" id="itNada"${filt && !algumVisivel ? '' : ' hidden'}>Nenhum item com esse filtro.</div>
        <div class="ittotal" id="itTotal"><span class="eyebrow">Em uso somam</span>${tot.length ? chipsBonus(tot) : '<span class="hint">nada nos atributos</span>'}</div>${htmlTotaisExtras(pc, c)}
        ${dobrados.length ? `<div class="hint itdobro">No grupo de troca ${juntarE(dobrados.map(g => '“' + esc(g) + '”'))} há mais de um item equipado: equipar um deles guarda os outros.</div>` : ''}
        <datalist id="gruposTroca">${grupos.map(g => `<option value="${esc(g)}"></option>`).join('')}</datalist>`
        : '<div class="hint">Sem itens. Os totais são iguais aos valores base.</div>'}
      </div>
    </div>`;
  }
  // um item novo já vem com o cartão aberto (quem chama põe o item na ficha e redesenha)
  const abrirItem = id => { itensAbertos.add(id); };
  /* (lote 7, parte 6) A busca rápida do site pediu um item desta ficha ({ item } nos equipamentos, { bolsa } na bolsa):
     os filtros dela saem, a seção do item abre (na bolsa, a aba do tipo dele) e o cartão aparece no meio da tela,
     marcado por um instante. Nada se edita sozinho. Devolve se achou o item. */
  function mostrarItem(pc, o) {
    if (!pc || !o) return false;
    let sel = null;
    if (typeof o.item === 'string') {
      const itens = (pc.itens || []).filter(Boolean), it = itens.find(x => String(x.id) === o.item);
      if (!it) return false;
      filtros.delete(pc.id);
      const R = R7();
      if (R) {
        const sec = R.secoesDeItens(itens, S.cfg).find(s => s.itens.includes(it)), k = sec ? (sec.tipo ? sec.tipo.id : '-') : null, f = fechadas();
        if (k && f.has(k)) { f.delete(k); S.itFechadas = [...f]; }
      }
      sel = '[data-itcard="' + CSS.escape(String(it.id)) + '"]';
    } else if (typeof o.bolsa === 'string') {
      const R = RR(), it = R ? R.bolsa(pc, pc.estado).find(x => String(x.id) === o.bolsa) : null;
      if (!it) return false;
      S.abaBolsa = it.t;
      sel = '[data-bolrow="' + CSS.escape(String(it.id)) + '"]';
    } else return false;
    render();
    const el = document.querySelector(sel);
    if (!el) return false;
    el.scrollIntoView({ block: 'center' });
    el.classList.add('achado');
    setTimeout(() => el.classList.remove('achado'), 2400);
    return true;
  }
  /* (lote 7) O item novo do "+ Item": com o filtro de um tipo ligado, já vem daquele tipo; os outros filtros (que o
     esconderiam) saem. */
  function itemNovo(pc) {
    const f = filtroDe(pc), b0 = {};
    ATRIBS.forEach(x => { b0[x.k] = 0; });
    const it = { id: uid(), nome: '', equipado: true, bonus: b0 };
    if (f.t && f.t !== '-' && tiposDaMesa().some(t => t.id === f.t)) it.tipo = f.t;
    if (filtrando(f)) filtros.set(pc.id, { t: it.tipo ? f.t : '', e: '', r: false, q: '' });
    itensAbertos.add(it.id);
    return it;
  }

  /* ---- os filtros: na própria tela, sem redesenhar a ficha (a busca não perde o cursor) ---- */
  function aplicarFiltro(painel, pc) {
    const f = filtroDe(pc), tipos = tiposDaMesa(), filt = filtrando(f), itens = (pc.itens || []).filter(Boolean);
    qa(painel, '[data-itfil]').forEach(b => {
      const [k, v] = b.dataset.itfil.split(':');
      if (k === 'limpar') { b.hidden = !filt; return; }
      const on = k === 't' ? f.t === v : k === 'e' ? f.e === v : k === 'r' ? !!f.r : false;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    });
    let vis = 0;
    qa(painel, '[data-itcard]').forEach(cd => { const it = itens.find(x => x.id === cd.dataset.itcard), ok = !!it && passa(it, f, tipos); cd.hidden = !ok; if (ok) vis++; });
    qa(painel, '[data-itsec]').forEach(s => { s.hidden = !s.querySelector('[data-itcard]:not([hidden])'); s.classList.toggle('filtrando', filt); });
    const nada = q(painel, '#itNada'); if (nada) nada.hidden = !(filt && !vis);
  }
  function mudarFiltro(painel, pc, mud) {
    const f = Object.assign({}, filtroDe(pc), mud);
    if (filtrando(f)) filtros.set(pc.id, f); else filtros.delete(pc.id);
    aplicarFiltro(painel, pc);
  }

  /* ---- os níveis ---- */
  const copia = x => JSON.parse(JSON.stringify(x));
  const indiceDe = (pc, id) => (pc.itens || []).findIndex(x => x && x.id === id);
  // troca o item da ficha por outro (o mesmo id) e devolve uma função que volta o de antes
  function trocarItem(pc, id, novo) {
    const i = indiceDe(pc, id); if (i < 0) return null;
    const antes = copia(pc.itens[i]);
    pc.itens[i] = novo;
    return () => { const j = indiceDe(pc, id); if (j >= 0) pc.itens[j] = antes; else pc.itens.push(antes); };
  }
  // mexe num nível (fn recebe uma cópia dele) e refaz o espelho; o item da ficha vira outro objeto (o mesmo id)
  function editarNivel(pc, it, nv, fn) {
    const R = R7(), i = (pc.itens || []).indexOf(it);
    if (!R || i < 0 || !R.temNiveis(it)) return null;
    const niveis = it.niveis.filter(o => o && typeof o === 'object').map(o => Object.assign({}, o)), l = niveis[nv - 1];
    if (!l) return null;
    fn(l);
    return (pc.itens[i] = R.itemNoNivel(Object.assign({}, it, { niveis }), R.nivelDoItem(it)));
  }
  // o ◂ ▸ e o "Usar o Nv k": troca o nível de agora, avisa a mesa ao vivo e deixa desfazer
  function mudarNivel(pc, id, para, foco) {
    const R = R7(), i = indiceDe(pc, id); if (!R || i < 0) return;
    const it = pc.itens[i], de = R.nivelDoItem(it), novo = R.itemNoNivel(it, para), ate = R.nivelDoItem(novo);
    if (ate === de) return;
    pc.itens[i] = novo;
    save(); desenhar(render, foco);
    const quem = String(pc.nome || '').trim() || 'Personagem', texto = R.textoDoNivel(novo, de, ate);
    logar({ tipo: 'uso', quem, pc: pc.id, det: texto, total: null });
    aviso(texto + '.', 'Desfazer', () => {
      const j = indiceDe(pc, id); if (j < 0) return;
      const agora = R.nivelDoItem(pc.itens[j]);
      if (agora === de) return;
      pc.itens[j] = R.itemNoNivel(pc.itens[j], de);
      save(); render();
      logar({ tipo: 'uso', quem, pc: pc.id, det: R.textoDoNivel(pc.itens[j], agora, de) + ' (desfeito)', total: null });
    });
  }

  /* ---- arrastar o cartão (e as setas do teclado na alça) ---- */
  let arrasto = null;
  // move o item para antes/depois de outro (alvo.ref) — ou para o fim da seção alvo.k —, trocando o tipo se a seção é outra
  function moverItem(pc, id, alvo, foco) {
    const lista = (pc.itens || []).slice(), i = lista.findIndex(x => x && x.id === id); if (i < 0) return;
    const it = lista[i], tipos = tiposDaMesa(), deK = chaveTipo(it, tipos) || '-', paraK = alvo.k || '-';
    const antesOrdem = (pc.itens || []).map(x => x && x.id), antesTipo = it.tipo;
    lista.splice(i, 1);
    let pos = lista.length;
    if (alvo.ref) { const j = lista.findIndex(x => x && x.id === alvo.ref); if (j >= 0) pos = alvo.antes ? j : j + 1; }
    else { let ult = -1; lista.forEach((x, j) => { if (x && (chaveTipo(x, tipos) || '-') === paraK) ult = j; }); if (ult >= 0) pos = ult + 1; }
    const novo = paraK !== deK ? Object.assign({}, it) : it;
    if (paraK !== deK) { if (paraK === '-') delete novo.tipo; else novo.tipo = paraK; }
    lista.splice(pos, 0, novo);
    if (paraK === deK && lista.map(x => x && x.id).join('\u0001') === antesOrdem.join('\u0001')) return;
    pc.itens = lista;
    save(); render(); refocar(foco || '[data-itarr="' + CSS.escape(id) + '"]');
    const nome = nomeIt(it) || 'O item sem nome';
    aviso(paraK !== deK ? (paraK === '-' ? nome + ' ficou sem tipo.' : nome + ' agora é ' + nomeDoTipo(paraK, tipos) + '.') : nome + ' mudou de lugar.', 'Desfazer', () => {
      const por = new Map((pc.itens || []).map(x => [x && x.id, x]));
      const volta = antesOrdem.map(k => por.get(k)).filter(Boolean).concat((pc.itens || []).filter(x => x && !antesOrdem.includes(x.id)));
      const k = volta.findIndex(x => x && x.id === id);
      if (k >= 0) { const y = Object.assign({}, volta[k]); if (antesTipo === undefined) delete y.tipo; else y.tipo = antesTipo; volta[k] = y; }
      pc.itens = volta;
      save(); render();
    });
  }
  // as setas na alça: sobe ou desce um lugar, entre os do mesmo jeito (equipados ou guardados) da mesma seção
  function moverComTeclado(pc, id, sobe) {
    const R = R7(); if (!R) return;
    const secs = R.secoesDeItens(pc.itens || [], S.cfg), s = secs.find(x => x.itens.some(y => y.id === id)); if (!s) return;
    const it = s.itens.find(y => y.id === id), mesmos = s.itens.filter(y => (y.equipado !== false) === (it.equipado !== false)), i = mesmos.indexOf(it);
    const viz = mesmos[sobe ? i - 1 : i + 1]; if (!viz) return;
    moverItem(pc, id, { k: s.tipo ? s.tipo.id : '-', ref: viz.id, antes: sobe });
  }
  function fimDoArrasto() {
    const a = arrasto; arrasto = null;
    if (!a) return null;
    window.removeEventListener('pointermove', a.mover); window.removeEventListener('pointerup', a.soltar);
    window.removeEventListener('pointercancel', a.cancelar); window.removeEventListener('keydown', a.esc, true);
    clearInterval(a.rolar);
    a.linha.remove(); a.card.classList.remove('arrastando');
    qa(a.painel, '.itsec.alvo').forEach(s => s.classList.remove('alvo'));
    return a;
  }
  function comecarArrasto(ev, painel, pc, id) {
    if (ev.button !== 0 || !FichasMesa.podeEditar(pc) || arrasto) return;
    const card = q(painel, '[data-itcard="' + CSS.escape(id) + '"]'), it = (pc.itens || []).find(x => x && x.id === id);
    if (!card || !it) return;
    ev.preventDefault();
    const linha = document.createElement('div'); linha.className = 'itlinha'; linha.hidden = true; document.body.append(linha);
    const a = arrasto = { id, pc, painel, card, linha, on: it.equipado !== false, alvo: null, x0: ev.clientX, y0: ev.clientY, mexeu: false, vy: 0 };
    card.classList.add('arrastando');
    a.rolar = setInterval(() => { if (a.vy) window.scrollBy(0, a.vy); }, 30);
    a.mover = e => {
      if (!a.mexeu && Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 5) return;
      a.mexeu = true;
      a.vy = e.clientY < 48 ? -14 : e.clientY > innerHeight - 48 ? 14 : 0;
      qa(painel, '.itsec.alvo').forEach(s => s.classList.remove('alvo'));
      const el = document.elementFromPoint(e.clientX, e.clientY), sec = el && el.closest('[data-itsec]');
      if (!sec || !painel.contains(sec)) { a.alvo = null; linha.hidden = true; return; }
      const itemDe = c => (pc.itens || []).find(x => x && x.id === c.dataset.itcard);
      const mesmos = qa(sec, '[data-itcard]:not([hidden])').filter(c => c !== card && itemDe(c) && (itemDe(c).equipado !== false) === a.on);
      const sob = el.closest('[data-itcard]');
      let ref = null, antes = true;
      if (sob && mesmos.includes(sob)) {
        const r = sob.getBoundingClientRect(), largo = r.width < sec.getBoundingClientRect().width * 0.8;
        ref = sob; antes = largo ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
      } else if (mesmos.length) { if (a.on) { ref = mesmos[mesmos.length - 1]; antes = false; } else { ref = mesmos[0]; antes = true; } }
      a.alvo = { k: sec.dataset.itsec, ref: ref ? ref.dataset.itcard : null, antes };
      if (!ref) { sec.classList.add('alvo'); linha.hidden = true; return; }
      const r = ref.getBoundingClientRect(), largo = r.width < sec.getBoundingClientRect().width * 0.8;
      Object.assign(linha.style, largo
        ? { left: (antes ? r.left - 6 : r.right + 3) + 'px', top: r.top + 'px', width: '3px', height: r.height + 'px' }
        : { left: r.left + 'px', top: (antes ? r.top - 6 : r.bottom + 3) + 'px', width: r.width + 'px', height: '3px' });
      linha.hidden = false;
    };
    a.soltar = () => { const b = fimDoArrasto(); if (b && b.mexeu && b.alvo) moverItem(b.pc, b.id, b.alvo); };
    a.cancelar = () => { fimDoArrasto(); };
    a.esc = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fimDoArrasto(); } };
    window.addEventListener('pointermove', a.mover); window.addEventListener('pointerup', a.soltar);
    window.addEventListener('pointercancel', a.cancelar); window.addEventListener('keydown', a.esc, true);
  }

  /* ---- as janelas: um tipo novo, os tipos da mesa e "Separar por tipo…" ---- */
  function janela(titulo, corpo, largura) {
    const volta = document.activeElement, m = document.createElement('div');
    m.className = 'modal itjanela';
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(titulo)}" style="max-width:${largura || 520}px">
      <div class="hd"><span class="eyebrow">${esc(titulo)}</span><button type="button" class="mini" data-jx style="margin-left:auto">Cancelar</button></div>
      <div class="bd">${corpo}</div></div>`;
    const fechar = () => { m.remove(); document.removeEventListener('keydown', tecla, true); if (volta && volta.isConnected) volta.focus({ preventScroll: true }); };
    const tecla = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); } };
    m.addEventListener('click', e => { if (e.target === m) fechar(); });
    document.addEventListener('keydown', tecla, true);
    document.body.append(m);
    qa(m, '[data-jx], [data-jcancela]').forEach(b => b.onclick = fechar);
    return { m, fechar };
  }
  const tipoNovoId = () => 'tp_' + uid().replace(/[^a-z0-9]/gi, '').slice(0, 12);
  // o nome de um tipo novo (ou renomeado) serve? — devolve o nome arrumado, ou um aviso
  function nomeDeTipo(nome, menos) {
    const n = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 30), R = R7();
    if (!n) return { erro: 'Escreva o nome do tipo.' };
    const usados = R.TIPOS_ITEM.flatMap(t => [t.nome, t.sec]).concat(R.tiposCriados(S.cfg).filter(t => t.id !== menos).map(t => t.nome));
    if (usados.some(x => normG(x) === normG(n))) return { erro: 'Já existe um tipo com esse nome.' };
    return { nome: n };
  }
  // "+ Novo tipo…" (no "Editar" de um item: o item já fica com ele)
  function novoTipo(pc, id) {
    const { m, fechar } = janela('Novo tipo de equipamento', `
      <label class="f"><span class="eyebrow">Nome</span><input class="inm" data-jnome maxlength="30" placeholder="ex.: Talismã" autocomplete="off"></label>
      <p class="hint" style="margin:8px 0 0">Vale para todas as fichas${FichasMesa.ativo() ? ' da mesa' : ''}. Vira uma seção na lista de equipamentos.</p>
      <p class="hint itjerro" data-jerro hidden></p>
      <div class="modalacts"><span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-jok>Criar</button></span></div>`, 420);
    const inp = q(m, '[data-jnome]'), erro = q(m, '[data-jerro]');
    const criar = () => {
      const r = nomeDeTipo(inp.value);
      if (r.erro) { erro.textContent = r.erro; erro.hidden = false; inp.focus(); return; }
      const t = { id: tipoNovoId(), nome: r.nome };
      S.cfg.tiposItem = (Array.isArray(S.cfg.tiposItem) ? S.cfg.tiposItem : []).concat([t]);
      const it = id ? (pc.itens || []).find(x => x && x.id === id) : null, antesTipo = it ? it.tipo : undefined;
      if (it) it.tipo = t.id;
      fechar();
      save(); render(); if (it) refocar('[data-ittipo="' + CSS.escape(id) + '"]');
      aviso('Tipo “' + r.nome + '” criado' + (it ? ' — ' + (nomeIt(it) || 'o item') + ' já é dele' : '') + '.', 'Desfazer', () => {
        S.cfg.tiposItem = (S.cfg.tiposItem || []).filter(x => x.id !== t.id);
        if (!S.cfg.tiposItem.length) delete S.cfg.tiposItem;
        const x = it ? (pc.itens || []).find(y => y && y.id === id) : null;
        if (x && x.tipo === t.id) { if (antesTipo === undefined) delete x.tipo; else x.tipo = antesTipo; }
        save(); render();
      });
    };
    q(m, '[data-jok]').onclick = criar;
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); criar(); } };
    inp.focus();
  }
  // "Tipos…": os prontos (só para ver) e os da mesa — renomear, tirar, criar
  function janelaTipos(pc) {
    const R = R7();
    const quantos = id => (S.personagens || []).reduce((s, p) => s + (p.itens || []).filter(it => it && it.tipo === id).length, 0);
    const corpo = () => {
      const meus = R.tiposCriados(S.cfg);
      return `<p class="hint" style="margin:0 0 10px">Prontos: ${R.TIPOS_ITEM.map(t => esc(t.nome)).join(', ')}.</p>
        <div class="ittiposl">${meus.length ? meus.map(t => `<div class="ittipol" data-jtipo="${esc(t.id)}">
            <input class="inm" data-jren="${esc(t.id)}" value="${esc(t.nome)}" maxlength="30" aria-label="Nome do tipo ${esc(t.nome)}">
            <span class="hint">${quantos(t.id) === 1 ? '1 item' : quantos(t.id) + ' itens'}</span>
            <button type="button" class="mini danger" data-jtira="${esc(t.id)}">Tirar</button></div>`).join('')
          : '<p class="hint" style="margin:0">Nenhum tipo criado ainda.</p>'}</div>
        <div class="ittipon"><input class="inm" data-jnovo maxlength="30" placeholder="Novo tipo (ex.: Talismã)" aria-label="Nome do tipo novo" autocomplete="off"><button type="button" class="mini" data-jcria>Criar</button></div>
        <p class="hint itjerro" data-jerro hidden></p>
        <div class="modalacts"><span style="margin-left:auto"><button type="button" data-jcancela>Fechar</button></span></div>`;
    };
    const { m, fechar } = janela('Tipos de equipamento', corpo(), 520);
    const refazer = foco => {
      q(m, '.bd').innerHTML = corpo(); ligar();
      save(); render();
      const n = foco && q(m, foco); if (n) n.focus();
    };
    const erroEm = t => { const e = q(m, '[data-jerro]'); e.textContent = t; e.hidden = !t; };
    const ligar = () => {
      qa(m, '[data-jcancela]').forEach(b => b.onclick = fechar);
      qa(m, '[data-jren]').forEach(i => {
        const valer = () => {
          const t = (S.cfg.tiposItem || []).find(x => x.id === i.dataset.jren); if (!t) return;
          const r = nomeDeTipo(i.value, t.id);
          if (r.erro) { erroEm(r.erro); i.value = t.nome; return; }
          if (r.nome === t.nome) return;
          const antes = t.nome; t.nome = r.nome; erroEm('');
          refazer('[data-jren="' + CSS.escape(t.id) + '"]');
          aviso('Tipo “' + antes + '” agora é “' + r.nome + '”.', 'Desfazer', () => { const x = (S.cfg.tiposItem || []).find(y => y.id === t.id); if (x) x.nome = antes; save(); render(); });
        };
        i.onchange = valer;
        i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); valer(); } };
      });
      qa(m, '[data-jtira]').forEach(b => b.onclick = () => {
        const id = b.dataset.jtira, t = (S.cfg.tiposItem || []).find(x => x.id === id); if (!t) return;
        const n = quantos(id);
        if (n && b.dataset.certeza !== '1') { b.dataset.certeza = '1'; b.textContent = 'Tirar mesmo?'; erroEm(n === 1 ? '1 item deste tipo vai para “Sem tipo”.' : n + ' itens deste tipo vão para “Sem tipo”.'); return; }
        const lista = S.cfg.tiposItem.slice(), pos = lista.indexOf(t);
        S.cfg.tiposItem = lista.filter(x => x !== t);
        if (!S.cfg.tiposItem.length) delete S.cfg.tiposItem;
        erroEm('');
        refazer('[data-jnovo]');
        aviso('Tipo “' + t.nome + '” tirado' + (n ? ' (os itens dele ficaram em “Sem tipo”)' : '') + '.', 'Desfazer', () => {
          const l = Array.isArray(S.cfg.tiposItem) ? S.cfg.tiposItem.slice() : [];
          if (!l.some(x => x.id === t.id)) l.splice(Math.min(pos, l.length), 0, t);
          S.cfg.tiposItem = l; save(); render();
        });
      });
      const novo = q(m, '[data-jnovo]');
      const criar = () => {
        const r = nomeDeTipo(novo.value);
        if (r.erro) { erroEm(r.erro); novo.focus(); return; }
        S.cfg.tiposItem = (Array.isArray(S.cfg.tiposItem) ? S.cfg.tiposItem : []).concat([{ id: tipoNovoId(), nome: r.nome }]);
        erroEm('');
        refazer('[data-jnovo]');
      };
      q(m, '[data-jcria]').onclick = criar;
      novo.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); criar(); } };
    };
    ligar();
    q(m, '[data-jnovo]').focus();
  }
  // "Separar por tipo…": o palpite de cada item sem tipo, pelo nome; nada muda até "Aplicar"
  function separarPorTipo(pc) {
    const R = R7(), tipos = tiposDaMesa(), lista = (pc.itens || []).filter(it => it && !chaveTipo(it, tipos));
    if (!lista.length) return;
    const palpite = it => R.tipoPeloNome(it.nome);
    const linha = (it, i) => {
      const p = palpite(it), v = p || 'outro';
      return `<div class="itsepl"><span class="itsepn">${esc(nomeIt(it) || 'Item sem nome')}</span>
        <select data-jsep="${i}" aria-label="Tipo de ${esc(nomeIt(it) || 'item sem nome')}">
          <option value="">Sem tipo</option>
          ${tipos.map(t => `<option value="${esc(t.id)}" ${t.id === v ? 'selected' : ''}>${esc(t.nome)}</option>`).join('')}
        </select>${p ? '' : '<span class="hint">sem palpite</span>'}</div>`;
    };
    const { m, fechar } = janela('Separar por tipo', `
      <p style="margin:0 0 10px;font-size:14px">O tipo de cada item, pelo nome. Confira e troque o que não estiver certo — nada muda até você aplicar.</p>
      <div class="itsepls">${lista.map(linha).join('')}</div>
      <div class="modalacts"><span style="margin-left:auto;display:flex;gap:8px"><button type="button" data-jcancela>Cancelar</button><button type="button" class="primary" data-jok>Aplicar</button></span></div>`, 560);
    const ok = q(m, '[data-jok]');
    const contar = () => { const n = qa(m, '[data-jsep]').filter(s => s.value).length; ok.textContent = n ? (n === 1 ? 'Aplicar a 1 item' : 'Aplicar a ' + n + ' itens') : 'Aplicar'; ok.disabled = !n; };
    qa(m, '[data-jsep]').forEach(s => s.onchange = contar);
    contar();
    ok.onclick = () => {
      const mud = qa(m, '[data-jsep]').map(s => [lista[+s.dataset.jsep], s.value]).filter(([, v]) => v);
      if (!mud.length) return;
      const antes = mud.map(([it]) => [it.id, it.tipo]);
      for (const [it, v] of mud) { const x = (pc.itens || []).find(y => y && y.id === it.id); if (x) x.tipo = v; }
      fechar();
      save(); render();
      aviso(mud.length === 1 ? '1 item separado por tipo.' : mud.length + ' itens separados por tipo.', 'Desfazer', () => {
        for (const [id, t] of antes) { const x = (pc.itens || []).find(y => y && y.id === id); if (x) { if (t === undefined) delete x.tipo; else x.tipo = t; } }
        save(); render();
      });
    };
    const s0 = q(m, '[data-jsep]'); if (s0) s0.focus();
  }

  function ligarItens(host, pc) {
    const painel = q(host, '#painelItens'); if (!painel) return;
    const item = id => (pc.itens || []).find(x => x && x.id === id);
    const sel = (attr, id) => '[' + attr + '="' + CSS.escape(id) + '"]';
    qa(painel, '[data-itemon]').forEach(i => i.onchange = () => {
      const it = item(i.dataset.itemon); if (!it) return;
      // (o Desfazer volta, de cada item, a chave de equipado, a marca de "volta junto" e a ordem de uso)
      const on = i.checked, antes = (pc.itens || []).filter(Boolean).map(x => [x.id, x.equipado, x.volta, x.uso]);
      const R = window.TC && TC.rules && TC.rules.equiparItem ? TC.rules : null;
      let r = null;
      if (R) { r = R.equiparItem(pc.itens, it.id, on); pc.itens = r.itens; } else it.equipado = on;
      save(); desenhar(render, sel('data-itemon', it.id));
      if (r && (r.guardados.length || r.equipados.length)) {
        aviso(R.textoDoEquipar ? R.textoDoEquipar(pc.itens, r, it.id, on) : (it.nome || 'O item') + (on ? ' equipado.' : ' guardado.'), 'Desfazer', () => {
          const volta = (x, k, v) => { if (v === undefined) delete x[k]; else x[k] = v; };
          for (const [id, eq, vt, us] of antes) { const x = item(id); if (x) { volta(x, 'equipado', eq); volta(x, 'volta', vt); volta(x, 'uso', us); } }
          save(); render();
        });
      }
    });
    qa(painel, '[data-itemnome]').forEach(i => i.oninput = () => { const it = item(i.dataset.itemnome); if (it) { it.nome = i.value; save(); } });
    qa(painel, '[data-itembon]').forEach(i => i.onchange = () => {
      const [id, k] = i.dataset.itembon.split('|'), it = item(id); if (!it) return;
      const v = +i.value || 0, nv = +i.dataset.nv || 0;
      if (nv && R7() && R7().temNiveis(it)) editarNivel(pc, it, nv, l => { l.bonus = Object.assign({}, l.bonus); l.bonus[k] = v; });
      else { it.bonus = it.bonus || {}; it.bonus[k] = v; }
      save(); desenhar(render, sel('data-itembon', i.dataset.itembon));
    });
    qa(painel, '[data-itemed]').forEach(b => b.onclick = () => {
      const id = b.dataset.itemed;
      if (itensAbertos.has(id)) { itensAbertos.delete(id); nivelAberto.delete(id); } else itensAbertos.add(id);
      render(); refocar(sel('data-itemed', id));
    });
    qa(painel, '[data-itemrel]').forEach(i => i.onchange = () => {
      const it = item(i.dataset.itemrel); if (!it) return;
      if (i.checked) it.reliquia = true; else delete it.reliquia;
      save(); desenhar(render, sel('data-itemrel', it.id));
    });
    // "Só funciona com…": pôr mais um, tirar um, o nível mínimo
    qa(painel, '[data-itemreq]').forEach(i => i.onchange = () => {
      const it = item(i.dataset.itemreq); if (!it || !i.value) return;
      porReqs(it, reqsBrutos(it).concat([i.value]));
      save(); desenhar(render, sel('data-itemreq', it.id));
    });
    qa(painel, '[data-itreqdel]').forEach(b => b.onclick = () => {
      const it = item(b.dataset.itreqdel); if (!it) return;
      const l = reqsBrutos(it); l.splice(+b.dataset.i, 1);
      porReqs(it, l);
      save(); render(); refocar(sel('data-itemreq', it.id));
    });
    qa(painel, '[data-itreqnv]').forEach(s => s.onchange = () => {
      const it = item(s.dataset.itreqnv); if (!it) return;
      const l = reqsBrutos(it), i = +s.dataset.i, base = String(l[i] || '').replace(/@\d+$/, '');
      if (!base.startsWith('i:')) return;
      l[i] = base + (s.value ? '@' + s.value : '');
      porReqs(it, l);
      save(); desenhar(render, '[data-itreqnv="' + CSS.escape(it.id) + '"][data-i="' + i + '"]');
    });
    qa(painel, '[data-itemtroca]').forEach(i => i.onchange = () => {
      const it = item(i.dataset.itemtroca); if (!it) return;
      const v = i.value.trim().slice(0, 40);
      if (v) it.troca = v; else delete it.troca;
      save(); desenhar(render, sel('data-itemtroca', it.id));
    });
    qa(painel, '[data-itemdel]').forEach(b => b.onclick = () => {
      const i = (pc.itens || []).findIndex(x => x && x.id === b.dataset.itemdel); if (i < 0) return;
      const it = pc.itens[i];
      pc.itens = pc.itens.filter(x => x !== it); itensAbertos.delete(it.id); nivelAberto.delete(it.id);
      save(); render();
      aviso('O item ' + (String(it.nome || '').trim() || 'sem nome') + ' saiu da ficha.', 'Desfazer', () => {
        if (!Array.isArray(pc.itens)) pc.itens = [];
        if (!pc.itens.some(x => x.id === it.id)) pc.itens.splice(Math.min(i, pc.itens.length), 0, it);
        save(); render();
      });
    });
    // (lote 7) o tipo
    qa(painel, '[data-ittipo]').forEach(s => s.onchange = () => {
      const it = item(s.dataset.ittipo); if (!it) return;
      if (s.value === '+') { s.value = chaveTipo(it); novoTipo(pc, it.id); return; }
      const antes = it.tipo, tipos = tiposDaMesa();
      if (s.value) it.tipo = s.value; else delete it.tipo;
      if (it.tipo === antes) return;
      save(); desenhar(render, sel('data-ittipo', it.id));
      const nome = nomeIt(it) || 'O item sem nome';
      aviso(s.value ? nome + ' agora é ' + nomeDoTipo(s.value, tipos) + '.' : nome + ' ficou sem tipo.', 'Desfazer', () => {
        const x = item(it.id); if (!x) return;
        if (antes === undefined) delete x.tipo; else x.tipo = antes;
        save(); render();
      });
    });
    const sep = q(painel, '[data-itseparar]'); if (sep) sep.onclick = () => separarPorTipo(pc);
    const tps = q(painel, '[data-ittipos]'); if (tps) tps.onclick = () => janelaTipos(pc);
    // (lote 7) os filtros e as seções
    qa(painel, '[data-itfil]').forEach(b => b.onclick = () => {
      const [k, v] = b.dataset.itfil.split(':'), f = filtroDe(pc);
      if (k === 'limpar') { filtros.delete(pc.id); const bq = q(painel, '[data-itbusca]'); if (bq) bq.value = ''; aplicarFiltro(painel, pc); refocar('[data-itfil="t:"]'); return; }
      mudarFiltro(painel, pc, k === 't' ? { t: v } : k === 'e' ? { e: f.e === v ? '' : v } : { r: !f.r });
    });
    const busca = q(painel, '[data-itbusca]');
    if (busca) {
      busca.oninput = () => mudarFiltro(painel, pc, { q: busca.value });
      busca.onkeydown = e => { if (e.key === 'Escape' && busca.value) { e.preventDefault(); e.stopPropagation(); busca.value = ''; mudarFiltro(painel, pc, { q: '' }); } };
    }
    qa(painel, '[data-itsecbt]').forEach(b => b.onclick = () => {
      const k = b.dataset.itsecbt, set = fechadas(), sec = b.closest('[data-itsec]'), fechar = !set.has(k);
      if (fechar) set.add(k); else set.delete(k);
      S.itFechadas = [...set]; if (!S.itFechadas.length) delete S.itFechadas;
      save();
      if (sec) { sec.classList.toggle('fechada', fechar); b.setAttribute('aria-expanded', String(!fechar)); b.title = (fechar ? 'Mostrar' : 'Recolher') + ' esta seção'; const s = q(sec, '.itseta'); if (s) s.textContent = fechar ? '▸' : '▾'; }
    });
    // (lote 7) arrastar, e as setas do teclado na alça
    qa(painel, '[data-itarr]').forEach(b => {
      b.onpointerdown = e => comecarArrasto(e, painel, pc, b.dataset.itarr);
      b.onkeydown = e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        moverComTeclado(pc, b.dataset.itarr, e.key === 'ArrowUp');
      };
    });
    // (lote 7) os níveis
    qa(painel, '[data-itnv]').forEach(b => b.onclick = () => {
      const it = item(b.dataset.itnv), R = R7(); if (!it || !R) return;
      const para = R.nivelDoItem(it) + (+b.dataset.d), n = R.niveisDoItem(it).length, d = +b.dataset.d;
      // (no último nível o botão fica apagado: o cursor vai para o outro)
      const foco = '[data-itnv="' + CSS.escape(it.id) + '"][data-d="' + ((d > 0 && para >= n) || (d < 0 && para <= 1) ? -d : d) + '"]';
      mudarNivel(pc, it.id, para, foco);
    });
    qa(painel, '[data-itnvusar]').forEach(b => b.onclick = () => mudarNivel(pc, b.dataset.itnvusar, +b.dataset.nv, '[data-itnvaba="' + CSS.escape(b.dataset.itnvusar) + '"][data-nv="' + b.dataset.nv + '"]'));
    qa(painel, '[data-itnvaba]').forEach(b => b.onclick = () => {
      nivelAberto.set(b.dataset.itnvaba, +b.dataset.nv);
      render(); refocar('[data-itnvaba="' + CSS.escape(b.dataset.itnvaba) + '"][data-nv="' + b.dataset.nv + '"]');
    });
    qa(painel, '[data-itnvnovo]').forEach(b => b.onclick = () => {
      const id = b.dataset.itnvnovo, it = item(id), R = R7(); if (!it || !R) return;
      const novo = R.itemComNivelNovo(it); if (novo === it) return;
      const voltar = trocarItem(pc, id, novo), n = R.niveisDoItem(novo).length;
      nivelAberto.set(id, n); itensAbertos.add(id);
      save(); render(); refocar('[data-itnvaba="' + CSS.escape(id) + '"][data-nv="' + n + '"]');
      aviso('Nv ' + n + ' criado, igual ao Nv ' + (n - 1) + '. Mude os números dele.', 'Desfazer', () => { if (voltar) voltar(); nivelAberto.delete(id); save(); render(); });
    });
    qa(painel, '[data-itnvcopia]').forEach(b => b.onclick = () => {
      const id = b.dataset.itnvcopia, it = item(id), R = R7(), k = +b.dataset.nv; if (!it || !R || k < 2) return;
      const de = R.niveisDoItem(it)[k - 2]; if (!de) return;
      const voltar = trocarItem(pc, id, it);
      editarNivel(pc, it, k, l => { const c = copia(de); l.bonus = c.bonus; l.rec = c.rec; l.def = c.def; l.efeito = c.efeito; });
      save(); render(); refocar('[data-itnvaba="' + CSS.escape(id) + '"][data-nv="' + k + '"]');
      aviso('O Nv ' + k + ' agora tem os números e a passiva do Nv ' + (k - 1) + '.', 'Desfazer', () => { if (voltar) voltar(); save(); render(); });
    });
    qa(painel, '[data-itnvtira]').forEach(b => b.onclick = () => {
      const id = b.dataset.itnvtira, it = item(id), R = R7(), k = +b.dataset.nv; if (!it || !R) return;
      const novo = R.itemSemNivel(it, k); if (novo === it) return;
      const voltar = trocarItem(pc, id, novo), resto = R.temNiveis(novo) ? R.niveisDoItem(novo).length : 0;
      if (resto) nivelAberto.set(id, Math.min(k, resto)); else nivelAberto.delete(id);
      save(); render();
      refocar(resto ? '[data-itnvaba="' + CSS.escape(id) + '"][data-nv="' + Math.min(k, resto) + '"]' : '[data-itnvnovo="' + CSS.escape(id) + '"]');
      aviso('Nv ' + k + ' tirado' + (resto ? '' : ': o item voltou a ser comum') + '.', 'Desfazer', () => { if (voltar) voltar(); nivelAberto.set(id, k); save(); render(); });
    });
  }
  const ajustarAltura = t => { t.style.height = 'auto'; t.style.height = Math.max(30, t.scrollHeight + 2) + 'px'; };
  function ligarEfeitos(host, pc) {
    qa(host, '[data-itemfx]').forEach(t => {
      ajustarAltura(t);
      t.oninput = () => {
        const it = (pc.itens || []).find(x => x && x.id === t.dataset.itemfx), nv = +t.dataset.nv || 0;
        if (it) { if (nv && R7() && R7().temNiveis(it)) editarNivel(pc, it, nv, l => { l.efeito = t.value; }); else it.efeito = t.value; save(); }
        ajustarAltura(t);
      };
    });
  }
  // na aba "Passivas e Habilidades": o que os itens equipados dão, só para leitura (edita-se no próprio item)
  function htmlEfeitosEquipados(pc) {
    const com = (pc.itens || []).filter(it => it && ativoNa(it, pc) && String(it.efeito || '').trim());
    if (!com.length) return '';
    return `<div class="fxequip"><span class="eyebrow">Dos equipamentos em uso</span>
      ${com.map(it => `<div class="fxlinha"><strong>${esc(it.nome || 'Item sem nome')}</strong><span>${esc(it.efeito)}</span></div>`).join('')}</div>`;
  }

  /* ======================= atributos: distribuição livre ======================= */
  const podeTrocarModo = () => !FichasMesa.ativo() || FichasMesa.mestre();
  const ehLivre = pc => pc.modoAtr === 'livre';
  // os pontos como estão agora: os que a pessoa pôs; se ainda não distribuiu, os que a tabela dava
  function pontosDe(pc, c) { const o = {}; ATRIBS.forEach(a => { o[a.k] = pc.atrLivre && Number.isFinite(+pc.atrLivre[a.k]) ? Math.max(0, inteiro(pc.atrLivre[a.k])) : Math.max(0, inteiro((c.nat || c.base)[a.k])); }); return o; }
  function tornarLivre(pc, zerado) {
    if (!pc.atrLivre) {
      const o = {};
      if (zerado) ATRIBS.forEach(a => { o[a.k] = 0; });
      else { const c = calcular(Object.assign({}, pc, { modoAtr: undefined })); ATRIBS.forEach(a => { o[a.k] = Math.max(0, inteiro((c.nat || c.base)[a.k])); }); }
      pc.atrLivre = o;
    }
    pc.modoAtr = 'livre';
  }
  function contador(c) {
    const usados = c.usados || 0, limite = c.limite || 0, d = limite - usados;
    const cls = d === 0 ? 'certo' : d > 0 ? 'falta' : 'passou';
    const txt = usados + ' de ' + limite + ' pontos · ' + (d === 0 ? 'tudo distribuído' : d === 1 ? 'falta 1' : d > 0 ? 'faltam ' + d : 'passou ' + (-d));
    return { cls, txt };
  }
  function htmlBotaoModo(pc) {
    if (!podeTrocarModo()) return '';
    if (ehLivre(pc) && FichasMesa.deJogador(pc)) return '';        // ficha de jogador não usa a tabela de tiers
    return ehLivre(pc)
      ? '<button class="mini" data-modo="tabela" title="Volta a calcular os atributos pelos tiers e percentuais da tabela de levels. Os pontos distribuídos ficam guardados.">Usar a tabela</button>'
      : '<button class="mini" data-modo="livre" title="O dono da ficha distribui os pontos do level como quiser (ficha de jogador). Os valores atuais são mantidos como ponto de partida.">Distribuição livre</button>';
  }
  /* O painel de atributos na distribuição livre: cada atributo tem os pontos postos à mão; derivados e defesas como sempre. */
  function painelAtributosLivre(pc, c) {
    const pts = pontosDe(pc, c), k = contador(c);
    return `<div class="panel">
      <div class="hd">${htmlAbasAtr(pc, c)}
        <span class="ptscont ${k.cls}" id="ptsCont" title="Pontos do level ${esc(String(pc.level))} na tabela${c.mult !== 1 ? ' × ' + c.mult + ' do tier' : ''}. O bônus da árvore e dos equipamentos soma por cima e não entra nesta conta.">${k.txt}</span>
        <span style="margin-left:auto">${htmlBotaoModo(pc)}</span>
      </div>
      <div class="bd">
        <table class="attr livre">
          <thead><tr><th>Atributo</th><th>Pontos</th><th>Base</th><th>Equip.</th><th>Total</th></tr></thead>
          <tbody>
          ${ATRIBS.map(a => { const arv = c.arv ? (c.arv[a.k] || 0) : 0; return `<tr>
            <td><span class="aname">${a.nome}</span> <span class="mono" style="color:var(--ink-soft);font-size:11px">${a.k}</span></td>
            <td><span class="ptsin">
              <button type="button" class="step" data-ptsstep="${a.k}|-1" ${pts[a.k] <= 0 ? 'disabled' : ''} aria-label="Tirar um ponto de ${a.nome}">−</button>
              <input type="number" min="0" step="1" data-pts="${a.k}" value="${pts[a.k]}" aria-label="Pontos em ${a.nome}">
              <button type="button" class="step" data-ptsstep="${a.k}|1" aria-label="Pôr um ponto em ${a.nome}">+</button></span></td>
            <td class="num vbase" ${arv ? `title="${pts[a.k]} distribuídos ${arv > 0 ? '+' : '−'} ${Math.abs(arv)} da árvore"` : ''}>${c.base[a.k]}${arv ? `<span class="darv">${arv > 0 ? '+' : '−'}${Math.abs(arv)} árv.</span>` : ''}</td>
            <td class="num vequip">${c.eq[a.k] ? (c.eq[a.k] > 0 ? '+' : '') + c.eq[a.k] : '—'}${htmlTemp(c, a.k)}</td>
            <td class="num vtot">${c.tot[a.k]}</td>
          </tr>`; }).join('')}
          ${DERIV.map(d => `<tr class="derived">
            <td><span class="aname">${d.nome}</span> <span class="mono" style="color:var(--ink-soft);font-size:11px">${d.k}</span></td>
            <td><span class="mono" style="font-size:10.5px;color:var(--ink-soft)">${d.desc}</span></td>
            <td class="num vbase">${d.calc(c.base, c.def)}</td>
            <td class="num vequip">${c.eq[d.k] ? (c.eq[d.k] > 0 ? '+' : '') + c.eq[d.k] : '—'}${htmlTemp(c, d.k)}</td>
            <td class="num vtot">${c.der[d.k]}</td>
          </tr>`).join('')}
          ${DEFESAS.map(d => `<tr class="defesa">
            <td><span class="aname">${d.nome}</span> <span class="mono" style="color:var(--ink-soft);font-size:11px">${d.rot}</span></td>
            <td><span class="mono" style="font-size:10.5px;color:var(--ink-soft)">manual</span></td>
            <td><input type="number" class="defbase" data-defesa="${d.k}" value="${(+((pc.defesas || {})[d.k]) || 0)}"></td>
            <td class="num vequip">${c.eq[d.k] ? (c.eq[d.k] > 0 ? '+' : '') + c.eq[d.k] : '—'}${htmlTemp(c, d.k)}</td>
            <td class="num vtot">${c.def[d.k]}</td>
          </tr>`).join('')}
          </tbody>
        </table>
        <div class="hint" style="margin-top:6px">Distribuição livre: quem controla a ficha põe os pontos onde quiser. O total vem da tabela de levels (${c.limite} no level ${esc(String(pc.level))}); a ficha avisa se faltar ou passar, mas não trava. Os derivados usam os atributos <strong>base</strong> (o Embate soma ainda o Bloqueio inteiro); a árvore e os equipamentos somam por cima.</div>
      </div>
    </div>`;
  }
  function ligarAtributos(host, pc) {
    qa(host, '[data-modo]').forEach(b => b.onclick = () => {
      if (b.dataset.modo === 'livre') { tornarLivre(pc, false); save(); render(); toast('Distribuição livre: os valores atuais ficaram como ponto de partida.'); }
      else { pc.modoAtr = 'tabela'; save(); render(); toast('Atributos de volta à tabela de tiers. Os pontos distribuídos ficaram guardados.'); }
    });
    if (!ehLivre(pc)) return;
    const mudar = (k, v, focar) => { const c = calcular(pc), pts = pontosDe(pc, c); pts[k] = Math.max(0, inteiro(v)); pc.atrLivre = pts; save(); desenhar(render, focar); };
    qa(host, '[data-pts]').forEach(i => i.onchange = () => { const k = i.dataset.pts; mudar(k, i.value, '[data-pts="' + k + '"]'); });
    qa(host, '[data-ptsstep]').forEach(b => b.onclick = () => {
      const [k, d] = b.dataset.ptsstep.split('|'), c = calcular(pc);
      mudar(k, pontosDe(pc, c)[k] + (+d), '[data-ptsstep="' + b.dataset.ptsstep + '"]');
    });
  }

  /* ======================= Sanidade, Conforto e Relacionamentos ======================= */
  const MENTE = {
    san: { nome: 'Sanidade', padrao: 100, faixas: [[80, 'Lúcido'], [50, 'Estável'], [25, 'Abalado'], [1, 'Perturbado'], [0, 'Em colapso']],
      svg: '<path d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>' },
    conf: { nome: 'Conforto', padrao: 50, faixas: [[80, 'Aconchegado'], [50, 'Confortável'], [25, 'Desconfortável'], [1, 'Miserável'], [0, 'No limite']],
      svg: '<path d="M12 3c3.6 3.8 6 6.7 6 10.2a6 6 0 0 1-12 0c0-2.2 1.2-4 2.7-5.3.2 1.9 1 3 2 3.3 0-3.2.3-5.6 1.3-8.2z"/>' },
  };
  const REL_FAIXAS = [[60, 'Leal'], [20, 'Amigável'], [-19, 'Neutro'], [-59, 'Desconfiado'], [-100, 'Hostil']];
  const REL_SVG = '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>';
  const SEGREDO_SVG = '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>';
  const glifo = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const valorMente = (pc, k) => { const v = pc.estado && pc.estado[k]; return v != null && v !== '' && Number.isFinite(+v) ? limitar(inteiro(v), 0, 100) : MENTE[k].padrao; };
  const faixaMente = (k, v) => MENTE[k].faixas.find(f => v >= f[0])[1];
  const nivelMente = v => (v >= 50 ? 'bom' : v >= 25 ? 'medio' : 'ruim');
  const faixaRel = v => REL_FAIXAS.find(f => v >= f[0])[1];
  const nivelRel = v => (v >= 20 ? 'bom' : v <= -20 ? 'ruim' : 'medio');
  /* As linhas de relacionamento que quem está olhando pode ver (as contas e os formatos são de TC.rules). Cada
     uma vem com o `modo`: 'aberta' (está na ficha), 'valor' (o nome na ficha, o valor guardado pelo mestre) ou
     'mestre' (a linha inteira guardada pelo mestre — é assim com os NPCs). */
  const relsDe = pc => FichasMesa.relsDe(pc);
  const comoMestre = () => FichasMesa.ativo() && FichasMesa.mestre();
  const ROM = () => (window.TC && TC.rules && TC.rules.ROM_MAX) || 10;
  const sinal = v => (v > 0 ? '+' + v : v < 0 ? '−' + Math.abs(v) : '0');
  // em uso quando a ficha é de um jogador da mesa, ou quando alguém já ligou (tem algum valor guardado)
  const usaMente = pc => FichasMesa.deJogador(pc) || !!(pc.estado && (pc.estado.san != null || pc.estado.conf != null || relsDe(pc).length));
  const passos = (attr, id) => [-5, -1, 1, 5].map(d => `<button type="button" class="mini" ${attr}="${id}|${d}">${d > 0 ? '+' + d : '−' + Math.abs(d)}</button>`).join('');

  function cartaoMente(pc, k) {
    const m = MENTE[k], v = valorMente(pc, k);
    return `<div class="mcard m-${k} n-${nivelMente(v)}">
      <div class="mtop"><span class="mnome">${glifo(m.svg)} ${m.nome}</span><span class="mfaixa">${faixaMente(k, v)}</span>
        <span class="mval"><input type="number" min="0" max="100" step="1" data-mval="${k}" value="${v}" aria-label="${m.nome}, de 0 a 100"><small>/ 100</small></span></div>
      <div class="mbar" role="img" aria-label="${m.nome}: ${v} de 100, ${faixaMente(k, v)}"><i style="width:${v}%"></i></div>
      <div class="mbts">${passos('data-mstep', k)}</div>
    </div>`;
  }
  /* ---- a trilha de Romance: dez corações, cheios (de +1 a +10) ou partidos (de −1 a −10) ---- */
  const COR_FORMA = 'M12 20.4 4.7 13.1a4.7 4.7 0 0 1 6.6-6.6l.7.7.7-.7a4.7 4.7 0 0 1 6.6 6.6z';
  const coracao = tipo => `<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path class="cf" d="${COR_FORMA}"/>${tipo === 'partido' ? '<path class="cr" d="M12.9 6.6 10.6 10.4l3 2.2-2.2 4.2"/>' : ''}</svg>`;
  const romTexto = v => { const n = Math.abs(v); return v > 0 ? n + (n === 1 ? ' coração' : ' corações') : v < 0 ? n + (n === 1 ? ' coração partido' : ' corações partidos') : 'nenhum coração'; };
  function htmlRomance(e, nome, pode) {
    if (e.rom == null) return '';
    const v = e.rom, n = Math.abs(v), max = ROM(), id = esc(e.id);
    const tipo = i => (i <= n ? (v > 0 ? 'cheio' : 'partido') : 'vazio');
    return `<div class="romrow" data-romrow="${id}">
      <span class="romrot">Romance</span>
      <span class="coracoes" role="img" aria-label="Romance com ${esc(nome)}: ${romTexto(v)} de ${max}">${Array.from({ length: max }, (_, i) =>
        `<button type="button" class="cor ${tipo(i + 1)}" data-rom="${id}|${i + 1}" tabindex="-1" ${pode ? '' : 'disabled'} title="${i + 1} de ${max}" aria-hidden="true">${coracao(tipo(i + 1))}</button>`).join('')}</span>
      <span class="romval ${v < 0 ? 'neg' : ''}">${sinal(v)}</span>
      ${pode ? `<span class="mbts"><button type="button" class="mini" data-romstep="${id}|-1" title="Um coração a menos (abaixo de zero, eles se partem)" aria-label="Romance com ${esc(nome)}: um coração a menos">−</button><button type="button" class="mini" data-romstep="${id}|1" title="Um coração a mais" aria-label="Romance com ${esc(nome)}: um coração a mais">+</button></span>
      <button type="button" class="mini" data-romdel="${id}" title="Tirar a trilha de Romance desta linha">Tirar</button>` : ''}
    </div>`;
  }
  /* ---- o olho de cada linha (só o mestre, numa mesa): o que os jogadores veem dela ---- */
  let relConf = null;                       // { pc, id }: a linha que está perguntando "revelar?"; { pc, todos: true }: "revelar tudo?"
  function olhoDaLinha(pc, e, nome) {
    const npc = FichasMesa.ehNpc(pc), dono = FichasMesa.nomeDoDono(pc) || 'o jogador';
    const [aberto, txt] = e.modo === 'valor' ? [false, dono + ' vê o nome, sem o valor nem os corações. Clique para revelar.']
      : e.modo === 'mestre' ? [false, 'Só você vê esta linha. Clique para mostrá-la a quem vê a ficha.']
      : npc ? [true, 'Quem vê a ficha vê esta linha. Clique para guardá-la só com você.']
      : [true, dono + ' vê o valor. Clique para esconder (o nome continua à vista).'];
    return `<button type="button" class="olho" data-relolho="${esc(e.id)}" aria-pressed="${aberto}" title="${esc(txt)}" aria-label="${esc('Relacionamento com ' + nome + ': ' + txt)}">${aberto ? FichasMesa.OLHO : FichasMesa.OLHO_FECHADO}</button>`;
  }
  function linhaRel(pc, e) {
    const v = limitar(inteiro(e.v), -100, 100), outro = e.alvo ? S.personagens.find(p => p.id === e.alvo) : null;
    const nome = (outro && outro.nome) || e.nome || 'Sem nome', mestre = comoMestre(), id = esc(e.id);
    const quem = `<span class="relnome">${outro ? miniatura(outro) : `<span class="avmini semimg" aria-hidden="true">${esc(iniciais(nome))}</span>`}<span>${esc(nome)}</span></span>`;
    // o valor está com o mestre: quem não é ele vê só com quem é
    if (e.modo === 'valor' && !mestre) return `<div class="relrow guardada sovalor" data-rel="${id}">${quem}<span class="relsegredo">${glifo(SEGREDO_SVG)} o valor está guardado com o mestre</span></div>`;
    const marca = e.modo === 'mestre' ? '<span class="tagseg" title="Esta linha fica guardada com você: os jogadores não a recebem">só você vê</span>' : e.modo === 'valor' ? '<span class="tagseg" title="O jogador vê o nome; o valor e os corações ficam guardados com você">valor escondido</span>' : '';
    const conf = relConf && relConf.pc === pc.id && relConf.id === e.id;
    return `<div class="relrow n-${nivelRel(v)} ${e.modo !== 'aberta' ? 'guardada' : ''}" data-rel="${id}">
      ${quem}
      <div class="relbar" role="img" aria-label="Relacionamento com ${esc(nome)}: ${sinal(v)}, ${faixaRel(v)}"><i style="${v >= 0 ? 'left:50%;width:' + (v / 2) + '%' : 'right:50%;width:' + (-v / 2) + '%'}"></i></div>
      <span class="relval"><input type="number" min="-100" max="100" step="1" data-relval="${id}" value="${v}" aria-label="Relacionamento com ${esc(nome)}, de −100 a 100"></span>
      <span class="relfaixa">${faixaRel(v)}</span>
      <span class="mbts">${passos('data-relstep', id)}</span>
      <span class="relfim">
        ${e.rom == null ? `<button type="button" class="mini romadd" data-romadd="${id}" title="Acrescentar a trilha de Romance (corações)" aria-label="Acrescentar a trilha de Romance com ${esc(nome)}">${coracao('vazio')}</button>` : ''}
        ${mestre ? olhoDaLinha(pc, e, nome) : ''}
        <button type="button" class="mini danger" data-reldel="${id}" title="Tirar este relacionamento" aria-label="Tirar o relacionamento com ${esc(nome)}">×</button>
      </span>
      ${marca ? `<span class="relmarca">${marca}</span>` : ''}
      ${htmlRomance(e, nome, true)}
      ${conf ? `<div class="relconf" role="group" aria-label="Confirmar"><span>${e.modo === 'valor'
        ? `Revelar a ${esc(FichasMesa.nomeDoDono(pc) || 'o jogador')} o valor (${sinal(v)}${e.rom != null ? ' · ' + romTexto(e.rom) : ''})?`
        : 'Mostrar esta linha a quem vê a ficha?'}</span>
        <button type="button" class="mini primary" data-relsim="${id}">${e.modo === 'valor' ? 'Revelar' : 'Mostrar'}</button>
        <button type="button" class="mini" data-relnao="1">Cancelar</button></div>` : ''}
    </div>`;
  }
  function painelMente(pc) {
    if (!usaMente(pc)) {
      return `<div class="panel" id="painelMente" style="margin-bottom:18px"><div class="bd menteoff">
        <span class="hint">Sanidade, Conforto e Relacionamentos não estão em uso nesta ficha.</span>
        <button type="button" class="mini" data-mente="usar">Usar nesta ficha</button></div></div>`;
    }
    const rels = relsDe(pc), ja = new Set(rels.map(e => e.alvo).filter(Boolean));
    const outros = S.personagens.filter(p => p.id !== pc.id && !ja.has(p.id));
    /* Revelar tudo / esconder tudo (só o mestre, numa mesa): todas as linhas desta ficha de uma vez. Esconder é na hora
       (com Desfazer); revelar pergunta antes. */
    const todos = comoMestre() && rels.length ? (() => {
      const npc = FichasMesa.ehNpc(pc), escondidas = rels.filter(e => e.modo !== 'aberta').length, abertas = rels.filter(e => e.modo === 'aberta').length;
      const conf = relConf && relConf.pc === pc.id && relConf.todos;
      const quem = npc ? 'quem vê a ficha' : (FichasMesa.nomeDoDono(pc) || 'o jogador');
      return `<span class="reltodos">
        <button type="button" class="mini" data-reltodos="esconder" ${abertas ? '' : 'disabled'} title="${abertas ? (npc ? 'Guarda só com você todas as linhas deste NPC' : 'Esconde o valor de todas as linhas (os nomes continuam à vista)') : 'Nada à mostra para esconder'}">Esconder tudo</button>
        <button type="button" class="mini" data-reltodos="revelar" ${escondidas ? '' : 'disabled'} aria-expanded="${conf ? 'true' : 'false'}" title="${escondidas ? 'Mostra a ' + esc(quem) + ' todas as linhas escondidas (pergunta antes)' : 'Nada escondido'}">Revelar tudo</button>
      </span>${conf ? `<div class="relconf reltodosconf" role="group" aria-label="Confirmar">
        <span>${npc ? 'Mostrar a quem vê a ficha ' + (escondidas === 1 ? 'a linha guardada' : 'as ' + escondidas + ' linhas guardadas') + '?'
          : 'Revelar a ' + esc(quem) + ' ' + (escondidas === 1 ? 'o valor escondido' : 'os ' + escondidas + ' valores escondidos') + ' (com os corações)?'}</span>
        <button type="button" class="mini primary" data-reltodossim="1">Revelar tudo</button>
        <button type="button" class="mini" data-relnao="1">Cancelar</button></div>` : ''}`;
    })() : '';
    return `<div class="panel" id="painelMente" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Sanidade, conforto e relacionamentos</span>
        ${FichasMesa.deJogador(pc) ? '' : '<span style="margin-left:auto"><button type="button" class="mini" data-mente="parar" title="Esta ficha deixa de mostrar Sanidade, Conforto e Relacionamentos">Deixar de usar</button></span>'}
      </div>
      <div class="bd">
        <div class="mente2">${cartaoMente(pc, 'san')}${cartaoMente(pc, 'conf')}</div>
        <div class="relhd"><span class="mnome">${glifo(REL_SVG)} Relacionamentos</span><span class="hint">o que este personagem sente por cada um — de −100 (hostil) a +100 (leal)${comoMestre() && FichasMesa.ehNpc(pc) ? ' · os de um NPC ficam só com você, mesmo com a ficha aberta aos jogadores' : ''}</span>${todos}</div>
        <div class="rels">${rels.map(e => linhaRel(pc, e)).join('') || '<div class="hint">Nenhum relacionamento ainda.</div>'}</div>
        <div class="relnovo">
          <select id="relNovo" aria-label="Acrescentar um relacionamento">
            <option value="">+ Relacionamento com…</option>
            ${outros.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}
            <option value="__nome__">Outro (escrever o nome)…</option>
          </select>
        </div>
      </div>
    </div>`;
  }
  // redesenha só o painel (os passos −5/+5 são clicados várias vezes seguidas; a ficha inteira não precisa piscar)
  function pintarMente(pc, focar) {
    const velho = document.getElementById('painelMente'); if (!velho) return;
    const tmp = document.createElement('div'); tmp.innerHTML = painelMente(pc);
    const novo = tmp.firstElementChild;
    velho.replaceWith(novo);
    ligarMente(novo.parentNode, pc);
    if (focar) { const el = novo.querySelector(focar); if (el) el.focus(); }
  }
  function ligarMente(host, pc) {
    const painel = q(host, '#painelMente'); if (!painel) return;
    const est = () => pc.estado || (pc.estado = {});
    const guardar = focar => { save(); pintarMente(pc, focar); };
    qa(painel, '[data-mente]').forEach(b => b.onclick = () => {
      if (b.dataset.mente === 'usar') { est().san = MENTE.san.padrao; est().conf = MENTE.conf.padrao; guardar(); return; }
      const antes = { san: est().san, conf: est().conf, rel: est().rel, rels: est().rels }, seg = FichasMesa.segDe(pc);
      delete est().san; delete est().conf; delete est().rel; delete est().rels;
      if (seg) FichasMesa.porSeg(pc, null);
      guardar();
      aviso('Sanidade, Conforto e Relacionamentos saíram desta ficha.', 'Desfazer', () => { for (const k in antes) if (antes[k] !== undefined) est()[k] = antes[k]; if (seg) FichasMesa.porSeg(pc, seg); guardar(); });
    });
    // (o que muda ao sair de um campo é desenhado sem atrapalhar o clique ou o Tab que tirou o cursor dali)
    const guardarCampo = focar => { save(); desenhar(() => pintarMente(pc), focar); };
    qa(painel, '[data-mval]').forEach(i => i.onchange = () => { const k = i.dataset.mval; est()[k] = limitar(inteiro(i.value), 0, 100); guardarCampo('[data-mval="' + k + '"]'); });
    qa(painel, '[data-mstep]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.mstep.split('|'); est()[k] = limitar(valorMente(pc, k) + (+d), 0, 100); guardar('[data-mstep="' + b.dataset.mstep + '"]'); });
    const acha = id => relsDe(pc).find(e => e.id === id);
    const mexe = (op, focar) => { if (FichasMesa.mexerRel(pc, op)) guardar(focar); else pintarMente(pc, focar); };
    qa(painel, '[data-relval]').forEach(i => i.onchange = () => { FichasMesa.mexerRel(pc, { t: 'valor', id: i.dataset.relval, v: limitar(inteiro(i.value), -100, 100) }); guardarCampo('[data-relval="' + i.dataset.relval + '"]'); });
    qa(painel, '[data-relstep]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.relstep.split('|'), e = acha(id); if (!e) return; mexe({ t: 'valor', id, v: limitar(inteiro(e.v) + (+d), -100, 100) }, '[data-relstep="' + b.dataset.relstep + '"]'); });
    // de volta como estava: a linha (com o valor, o romance, a ordem) e onde ela ficava guardada
    const repor = e => { FichasMesa.mexerRel(pc, { t: 'nova', id: e.id, alvo: e.alvo, nome: e.nome, v: e.v, rom: e.rom, o: e.o, comMestre: e.modo === 'mestre' }); if (e.modo === 'valor') FichasMesa.mexerRel(pc, { t: 'esconder', id: e.id }); guardar(); };
    qa(painel, '[data-reldel]').forEach(b => b.onclick = () => {
      const fora = acha(b.dataset.reldel); if (!fora) return;
      if (!FichasMesa.mexerRel(pc, { t: 'tirar', id: fora.id })) return;
      guardar();
      aviso('Relacionamento com ' + (fora.nome || 'o personagem') + ' tirado.', 'Desfazer', () => repor(fora));
    });
    // romance
    qa(painel, '[data-romadd]').forEach(b => b.onclick = () => mexe({ t: 'rom', id: b.dataset.romadd, rom: 0 }, '[data-romstep="' + b.dataset.romadd + '|1"]'));
    qa(painel, '[data-romdel]').forEach(b => b.onclick = () => {
      const e = acha(b.dataset.romdel); if (!e) return;
      if (!FichasMesa.mexerRel(pc, { t: 'rom', id: e.id, rom: null })) return;
      guardar('[data-romadd="' + e.id + '"]');
      if (e.rom) aviso('Trilha de Romance com ' + (e.nome || 'o personagem') + ' tirada.', 'Desfazer', () => { FichasMesa.mexerRel(pc, { t: 'rom', id: e.id, rom: e.rom }); guardar(); });
    });
    qa(painel, '[data-romstep]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.romstep.split('|'), e = acha(id); if (!e || e.rom == null) return; mexe({ t: 'rom', id, rom: limitar(e.rom + (+d), -ROM(), ROM()) }, '[data-romstep="' + b.dataset.romstep + '"]'); });
    // clicar num coração: até ali (no último aceso, apaga-o); os partidos continuam partidos
    qa(painel, '[data-rom]').forEach(b => b.onclick = () => {
      const [id, k] = b.dataset.rom.split('|'), e = acha(id); if (!e || e.rom == null) return;
      const n = Math.abs(e.rom), alvo = (+k === n ? n - 1 : +k);
      mexe({ t: 'rom', id, rom: e.rom < 0 ? -alvo : alvo }, '[data-romstep="' + id + '|1"]');
    });
    // o olho: esconder é na hora; mostrar o que estava escondido pergunta antes
    qa(painel, '[data-relolho]').forEach(b => b.onclick = () => {
      const e = acha(b.dataset.relolho); if (!e) return;
      const foco = '[data-relolho="' + e.id + '"]', quem = FichasMesa.nomeDoDono(pc) || 'O jogador';
      if (e.modo === 'aberta') {
        relConf = null;
        const npc = FichasMesa.ehNpc(pc);
        if (!FichasMesa.mexerRel(pc, { t: npc ? 'guardar' : 'esconder', id: e.id })) return;
        guardar(foco);
        aviso(npc ? 'A linha de ' + e.nome + ' ficou guardada só com você.' : quem + ' continua vendo ' + e.nome + ' na lista, mas não o valor.');
      } else { relConf = relConf && relConf.id === e.id ? null : { pc: pc.id, id: e.id }; pintarMente(pc, relConf ? '[data-relsim="' + e.id + '"]' : foco); }
    });
    qa(painel, '[data-relnao]').forEach(b => b.onclick = () => { const id = relConf && relConf.id, eraTodos = relConf && relConf.todos; relConf = null; pintarMente(pc, id ? '[data-relolho="' + id + '"]' : eraTodos ? '[data-reltodos="revelar"]' : null); });
    // todas as linhas de uma vez: esconder (na hora, com Desfazer) e revelar (pergunta antes, com Desfazer)
    const todasDe = modo => relsDe(pc).filter(e => (modo === 'aberta' ? e.modo === 'aberta' : e.modo !== 'aberta'));
    const esconderLinhas = ids => { const npc = FichasMesa.ehNpc(pc); let n = 0; for (const id of ids) if (FichasMesa.mexerRel(pc, { t: npc ? 'guardar' : 'esconder', id })) n++; return n; };
    const revelarLinhas = lista => { let n = 0; for (const e of lista) if (FichasMesa.mexerRel(pc, { t: e.modo === 'valor' ? 'revelar' : 'abrir', id: e.id })) n++; return n; };
    qa(painel, '[data-reltodos]').forEach(b => b.onclick = () => {
      if (b.dataset.reltodos === 'revelar') { relConf = relConf && relConf.todos ? null : { pc: pc.id, todos: true }; pintarMente(pc, relConf ? '[data-reltodossim]' : '[data-reltodos="revelar"]'); return; }
      relConf = null;
      const ids = todasDe('aberta').map(e => e.id), npc = FichasMesa.ehNpc(pc);
      if (!esconderLinhas(ids)) { pintarMente(pc); return; }
      guardar('[data-reltodos="revelar"]');
      aviso(npc ? 'Todas as linhas deste NPC ficaram guardadas só com você.' : (FichasMesa.nomeDoDono(pc) || 'O jogador') + ' continua vendo os nomes, mas nenhum valor.', 'Desfazer', () => {
        revelarLinhas(relsDe(pc).filter(e => ids.includes(e.id) && e.modo !== 'aberta')); guardar();
      });
    });
    qa(painel, '[data-reltodossim]').forEach(b => b.onclick = () => {
      relConf = null;
      const lista = todasDe('escondida'), como = new Map(lista.map(e => [e.id, e.modo])), npc = FichasMesa.ehNpc(pc);
      if (!revelarLinhas(lista)) { pintarMente(pc); return; }
      guardar('[data-reltodos="esconder"]');
      aviso(npc ? 'Todas as linhas deste NPC agora aparecem para quem vê a ficha.' : (FichasMesa.nomeDoDono(pc) || 'O jogador') + ' agora vê todos os valores.', 'Desfazer', () => {
        // cada linha volta a ficar escondida como estava: só o valor ('valor') ou a linha inteira com o mestre ('mestre')
        for (const e of relsDe(pc)) if (como.has(e.id) && e.modo === 'aberta') FichasMesa.mexerRel(pc, { t: como.get(e.id) === 'valor' ? 'esconder' : 'guardar', id: e.id });
        guardar();
      });
    });
    qa(painel, '[data-relsim]').forEach(b => b.onclick = () => {
      const e = acha(b.dataset.relsim); relConf = null; if (!e) return;
      if (!FichasMesa.mexerRel(pc, { t: e.modo === 'valor' ? 'revelar' : 'abrir', id: e.id })) { pintarMente(pc); return; }
      guardar('[data-relolho="' + e.id + '"]');
      aviso(e.modo === 'valor' ? (FichasMesa.nomeDoDono(pc) || 'O jogador') + ' agora vê o valor do relacionamento com ' + e.nome + '.' : 'A linha de ' + e.nome + ' agora aparece para quem vê a ficha.');
    });
    const novo = q(painel, '#relNovo');
    if (novo) novo.onchange = () => {
      const v = novo.value; if (!v) return;
      let entrada = null;
      if (v === '__nome__') { const n = (prompt('Relacionamento com quem? (um nome)', '') || '').trim(); if (n) entrada = { id: uid(), alvo: null, nome: n.slice(0, 80) }; }
      else { const p = S.personagens.find(x => x.id === v); if (p) entrada = { id: uid(), alvo: p.id, nome: p.nome }; }
      if (!entrada) { novo.value = ''; return; }
      // (o relacionamento de um NPC nasce guardado com o mestre; o de uma ficha de jogador, aberto)
      if (!FichasMesa.mexerRel(pc, Object.assign({ t: 'nova', comMestre: comoMestre() && FichasMesa.ehNpc(pc) }, entrada))) { novo.value = ''; return; }
      if (est().san == null) est().san = valorMente(pc, 'san');          // a ficha passa a usar o painel de vez
      guardar('[data-relval="' + entrada.id + '"]');
    };
  }

  /* Chegou mudança de fora enquanto a pessoa digita noutro lugar da ficha: os quadros em que ela não está (este, e o
     dos bônus temporários) são redesenhados no lugar. */
  function aoVivo(pc) {
    const foco = document.activeElement, m = document.getElementById('painelMente'), t = document.getElementById('painelTmp');
    if (m && !m.contains(foco)) pintarMente(pc);
    if (t && !t.contains(foco)) {
      const tmp = document.createElement('div'); tmp.innerHTML = painelTemporarios(pc, calcular(pc));
      const novo = tmp.firstElementChild;
      if (novo) { t.replaceWith(novo); ligarTemporarios(novo.parentNode, pc); }
    }
  }

  /* ======================= o que entrou com as regras novas =======================
     As barras (onde começam, até onde descem), os itens que dão barra ou defesa, os bônus temporários, as bolsas e
     as 13 defesas específicas. As contas são as de tc/rules.js; aqui é só a tela. Sem a biblioteca de regras (a
     página aberta sozinha e sem ela), nada disto aparece e a ficha segue como sempre foi. */
  const RR = () => (window.TC && TC.rules && TC.rules.DEFESAS_ESP ? TC.rules : null);
  const ESP = () => (RR() ? RR().DEFESAS_ESP : []);
  const sinalTxt = v => (v > 0 ? '+' : '−') + fmt(Math.abs(v));
  const menos = n => fmt(n).replace('-', '−');
  const estadoDe = pc => pc.estado || (pc.estado = {});
  const mapaDe = (pc, k) => { const e = estadoDe(pc); return e[k] && typeof e[k] === 'object' && !Array.isArray(e[k]) ? e[k] : (e[k] = {}); };
  // depois de redesenhar a ficha, o cursor volta para o campo em que a pessoa estava
  const refocar = sel => { const n = document.querySelector(sel); if (n && !n.disabled) n.focus({ preventScroll: true }); };
  const optBonus = (k, vazio) => {
    const g = (rot, lista) => `<optgroup label="${rot}">${lista.map(x => `<option value="${x.k}" ${k === x.k ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</optgroup>`;
    const todos = RR() && RR().CHAVE_TODOS ? [{ k: RR().CHAVE_TODOS, nome: 'Todos os atributos' }] : [];      // (os cinco de uma vez)
    return (vazio ? `<option value="">${vazio}</option>` : '') + g('Atributos', todos.concat(ATRIBS)) + g('Derivados', DERIV) + g('Defesas', DEFESAS) + g('Defesa contra', ESP());
  };

  /* ---- as duas abas do painel de atributos: Atributos | Defesas ---- */
  const ICO_DEF = {
    FOGO: '<path d="M12 2.8c.7 3.1 4.4 4.9 4.4 9.2a4.4 4.4 0 0 1-8.8 0c0-1.9.9-3.2 2-4.3.2 1.6.9 2.4 1.7 2.7-.2-2.9.1-5.3.7-7.6z"/>',
    AGUA: '<path d="M12 3s6 6.3 6 10.6a6 6 0 0 1-12 0C6 9.3 12 3 12 3z"/>',
    PEDRA: '<path d="M3.5 18l3-8.5L11.5 5l6 2 3 7-2 4z"/><path d="M11.5 5l1 6 4.5 3M12.5 11l-5 4"/>',
    GELO: '<path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8M9.8 4.5L12 6.6l2.2-2.1M9.8 19.5l2.2-2.1 2.2 2.1"/>',
    TROVAO: '<path d="M13.5 2.5L5.5 13.5h5l-1 8 8-11h-5z"/>',
    PLANTA: '<path d="M5 19C5 10.5 10.5 5.5 19.5 5c0 9-5.5 14-14.5 14z"/><path d="M5 19c3-5.2 6.2-8.2 10-10"/>',
    VENTO: '<path d="M3 9h10.5a2.8 2.8 0 1 0-2.8-2.8M3 14h14.5a2.8 2.8 0 1 1-2.8 2.8M3 11.5h6"/>',
    LUZ: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
    SOMBRAS: '<path d="M20 14.2A8.5 8.5 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2z"/>',
    PSI: '<path d="M9.5 4.5a3 3 0 0 0-3 3 3 3 0 0 0-1.5 5 3 3 0 0 0 2.5 4.5 2.6 2.6 0 0 0 4.5-1.5v-8.5a2.5 2.5 0 0 0-2.5-2.5zM14.5 4.5a3 3 0 0 1 3 3 3 3 0 0 1 1.5 5 3 3 0 0 1-2.5 4.5 2.6 2.6 0 0 1-4.5-1.5"/>',
    CORTE: '<path d="M4 20l2.5-.5L19.5 6.5V4.5h-2L4.5 17.5z"/><path d="M14 7.5l2.5 2.5M5 21l2-2"/>',
    PERF: '<path d="M4.5 19.5L19 5M19 5h-6M19 5v6M8 13l3 3M5.5 15.5l3 3"/>',
    CONT: '<path d="M13.5 3.5l7 7-3 3-7-7z"/><path d="M12 9L4 17l3 3 8-8"/>',
  };
  const icoDef = k => `<svg class="icodef" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO_DEF[k] || ''}</svg>`;
  /* O título do painel: as duas abas (ou só "Atributos", sem a biblioteca de regras). */
  function htmlAbasAtr(pc, c) {
    if (!RR() || !c.defEsp) return '<span class="eyebrow">Atributos</span>';
    const aba = S.abaAtr === 'def' ? 'def' : 'atr', n = ESP().filter(d => c.defEsp[d.k]).length;
    return `<span class="abasatr" role="tablist" aria-label="Atributos ou defesas">
      <button type="button" class="sub ${aba === 'atr' ? 'on' : ''}" data-abaatr="atr" role="tab" aria-selected="${aba === 'atr'}">Atributos</button>
      <button type="button" class="sub ${aba === 'def' ? 'on' : ''}" data-abaatr="def" role="tab" aria-selected="${aba === 'def'}" title="As defesas contra cada elemento e cada tipo de golpe">Defesas${n ? `<span class="mk">${n}</span>` : ''}</button></span>`;
  }
  const abaDefesas = c => !!RR() && !!c.defEsp && S.abaAtr === 'def';
  // quanto os bônus temporários somam naquela chave, para a coluna de equipamento ("+3 temp.")
  const htmlTemp = (c, k) => { const v = c.tmp ? c.tmp[k] : 0; return v ? `<span class="dtmp" title="Bônus temporário (comida, poção…)">${sinalTxt(v)} temp.</span>` : ''; };
  function painelDefesas(pc, c) {
    let tipo = '';
    const linha = d => {
      const b = c.baseEsp[d.k] || 0, e = c.eqEsp[d.k] || 0, t = c.tmpEsp[d.k] || 0, novo = d.tipo !== tipo; tipo = d.tipo;
      return `<tr class="defesa esp${novo ? ' ini' : ''}${c.defEsp[d.k] ? '' : ' zero'}">
        <td><span class="defnome t-${d.tipo}">${icoDef(d.k)}<span class="aname">${d.nome}</span></span></td>
        <td><input type="number" class="defbase" data-defesp="${d.k}" value="${b}" aria-label="Defesa contra ${d.nome}: valor da ficha"></td>
        <td class="num vequip">${e ? sinalTxt(e) : '—'}</td>
        <td class="num vequip">${t ? sinalTxt(t) : '—'}</td>
        <td class="num vtot">${menos(c.defEsp[d.k])}</td>
        <td class="c"><button type="button" class="mini" data-rolar="${d.k}" title="Rolar a defesa contra ${d.nome}, com a fixa da rolagem rápida" aria-label="Rolar a defesa contra ${d.nome}">Rolar</button></td>
      </tr>`;
    };
    return `<div class="panel" id="painelAtr">
      <div class="hd">${htmlAbasAtr(pc, c)}</div>
      <div class="bd">
        <table class="attr defs">
          <thead><tr><th>Defesa contra</th><th>Ficha</th><th>Equip.</th><th>Temp.</th><th>Total</th><th></th></tr></thead>
          <tbody>${ESP().map(linha).join('')}</tbody>
        </table>
        <div class="hint" style="margin-top:6px">Cada defesa é o valor que você digita aqui, mais o que os equipamentos em uso e os bônus temporários somam. Os itens ganham defesa em <strong>Equipamentos</strong> (“+ barra ou defesa…”).</div>
      </div>
    </div>`;
  }

  /* ---- barras: onde começam e até onde descem ---- */
  const resAbertas = new Set();          // as "opções da barra" que estão abertas nesta tela
  function htmlOpcoesBarra(pc, r) {
    if (!RR() || r.min === undefined) return '';
    const temC = String(r.comeca || '').trim() !== '', temP = String(r.piso || '').trim() !== '';
    const resumo = [temC ? (r.errInicio ? 'começo com erro' : r.inicio != null ? 'começa em ' + menos(r.inicio) : '') : '', temP ? (r.errMin ? 'piso com erro' : r.min < 0 ? 'vai até ' + menos(r.min) : '') : ''].filter(Boolean).join(' · ');
    return `<details class="resopc" data-resopc="${esc(r.id)}" ${resAbertas.has(r.id) ? 'open' : ''}>
      <summary><span class="resopc-t">Opções da barra</span>${resumo ? `<span class="resopc-r">${esc(resumo)}</span>` : ''}</summary>
      <div class="resopc-g">
        <label class="f"><span class="eyebrow">Começa em</span>
          <input class="mono" data-rescomeca="${esc(r.id)}" value="${esc(r.comeca || '')}" placeholder="cheia" maxlength="80" autocomplete="off" title="Onde a barra começa e para onde volta no Encher e no descanso longo. Um número (4) ou uma fórmula (MAX/2). Vazio: começa cheia."></label>
        <label class="f"><span class="eyebrow">Pode ficar negativa até</span>
          <span class="pisoin"><b aria-hidden="true">−</b><input class="mono" data-respiso="${esc(r.id)}" value="${esc(r.piso || '')}" placeholder="não fica" maxlength="80" autocomplete="off" aria-label="Pode ficar negativa até menos…" title="Até quanto abaixo de zero a barra pode ir. Um número (20) ou uma fórmula (MAX/2). Vazio: para em zero."></span></label>
      </div>
      ${r.errInicio ? `<div class="fmlerr">Começa em: ${esc(r.errInicio)}</div>` : ''}${r.errMin ? `<div class="fmlerr">Negativa até: ${esc(r.errMin)}</div>` : ''}
      <div class="hint">“Começa em” é onde a barra nasce e para onde ela volta no Encher e no descanso longo (o descanso curto não mexe nela). Abaixo de zero, a parte negativa aparece riscada, aqui e no token. Os dois campos aceitam número ou fórmula; <code>MAX</code> é o máximo da barra.</div>
    </details>`;
  }
  function ligarBarras(host, pc) {
    qa(host, '[data-resopc]').forEach(d => d.addEventListener('toggle', () => { if (d.open) resAbertas.add(d.dataset.resopc); else resAbertas.delete(d.dataset.resopc); }));
    const campo = (attr, chave) => qa(host, '[data-' + attr + ']').forEach(i => {
      const rec = () => (pc.recursos || []).find(x => x.id === i.dataset[attr]);
      i.oninput = () => { const r = rec(); if (!r) return; const v = i.value.trim().slice(0, 80); if (v) r[chave] = v; else delete r[chave]; save(); };
      i.onchange = () => { if (!rec()) return; save(); desenhar(render, '[data-' + attr + '="' + CSS.escape(i.dataset[attr]) + '"]'); };
    });
    campo('rescomeca', 'comeca'); campo('respiso', 'piso');
  }

  /* ---- equipamentos que somam numa barra ou numa defesa específica ---- */
  // (lote 7) num item com níveis, os números de um nível (k; a fonte deles é `alvo`): os campos levam data-nv
  const chipItem = (tipo, it, chave, rotulo, v, k) => `<span class="chipb ${tipo}"><b>${esc(rotulo)}</b>
    <input type="number" step="1" data-itx="${tipo}" data-it="${esc(it.id)}" data-ch="${esc(chave)}"${k ? ` data-nv="${k}"` : ''} value="${+v || 0}" aria-label="${esc(rotulo)}: quanto ${esc(it.nome || 'este item')} soma${k ? ' no Nv ' + k : ''}">
    <button type="button" class="chipx" data-itxdel="${tipo}" data-it="${esc(it.id)}" data-ch="${esc(chave)}"${k ? ` data-nv="${k}"` : ''} title="Tirar ${esc(rotulo)} deste item" aria-label="Tirar ${esc(rotulo)} de ${esc(it.nome || 'este item')}">×</button></span>`;
  function htmlMaisDoItem(it, pc, alvo, k) {
    if (!RR()) return '';
    const fonte = alvo || it, rs = pc.recursos || [], rec = fonte.rec && typeof fonte.rec === 'object' ? fonte.rec : {}, def = fonte.def && typeof fonte.def === 'object' ? fonte.def : {};
    const chips = rs.filter(r => rec[r.id] != null).map(r => chipItem('rec', it, r.id, r.nome || 'Barra', rec[r.id], k))
      .concat(ESP().filter(d => def[d.k] != null).map(d => chipItem('def', it, d.k, 'Def. ' + d.nome, def[d.k], k)));
    const livresR = rs.filter(r => rec[r.id] == null), livresD = ESP().filter(d => def[d.k] == null);
    return `<div class="itmais">${chips.join('')}
      <select class="itmais-s" data-itmais="${esc(it.id)}"${k ? ` data-nv="${k}"` : ''} aria-label="${esc(it.nome || 'Este item')} também soma em…" title="O item pode aumentar o máximo de uma barra (HP, SP…) ou uma defesa específica">
        <option value="">+ barra ou defesa…</option>
        ${livresR.length ? `<optgroup label="No máximo da barra">${livresR.map(r => `<option value="rec:${esc(r.id)}">${esc(r.nome || 'Barra')}</option>`).join('')}</optgroup>` : ''}
        ${livresD.length ? `<optgroup label="Na defesa contra">${livresD.map(d => `<option value="def:${d.k}">${d.nome}</option>`).join('')}</optgroup>` : ''}
      </select></div>`;
  }
  // embaixo da tabela: o que os itens em uso somam fora das dez colunas
  function htmlTotaisExtras(pc, c) {
    if (!RR() || !c.eqRec) return '';
    const p = (c.recursos || []).filter(r => r.eq).map(r => esc(r.nome || 'Barra') + ' ' + sinalTxt(r.eq)).concat(ESP().filter(d => c.eqEsp[d.k]).map(d => 'Defesa contra ' + d.nome.toLowerCase() + ' ' + sinalTxt(c.eqEsp[d.k])));
    return p.length ? `<div class="hint itextras" id="itExtras">Os itens em uso também somam: ${p.join(' · ')}.</div>` : '';
  }
  function ligarMaisDoItem(host, pc) {
    const item = id => (pc.itens || []).find(x => x.id === id);
    const mapa = (it, tipo) => (it[tipo] && typeof it[tipo] === 'object' ? it[tipo] : (it[tipo] = {}));
    // (lote 7) num item com níveis, mexe no nível do campo (data-nv); o espelho acompanha (editarNivel)
    const noNivel = (it, el, fn) => { const nv = +el.dataset.nv || 0; if (nv && R7() && R7().temNiveis(it)) editarNivel(pc, it, nv, l => fn(l)); else fn(it); };
    const mapaN = (o, tipo) => (o[tipo] = Object.assign({}, o[tipo] && typeof o[tipo] === 'object' ? o[tipo] : {}));
    qa(host, '[data-itmais]').forEach(s => s.onchange = () => {
      const it = item(s.dataset.itmais), v = s.value, i = v.indexOf(':'); if (!it || i < 0) return;
      const tipo = v.slice(0, i), ch = v.slice(i + 1);
      noNivel(it, s, o => { if (o === it) mapa(it, tipo)[ch] = 0; else mapaN(o, tipo)[ch] = 0; });
      save(); render();
      refocar('[data-itx="' + tipo + '"][data-it="' + CSS.escape(it.id) + '"][data-ch="' + CSS.escape(ch) + '"]');
      const n = document.activeElement; if (n && n.select) n.select();
    });
    qa(host, '[data-itx]').forEach(i => i.onchange = () => {
      const it = item(i.dataset.it); if (!it) return;
      const v = Math.round(+i.value) || 0;
      noNivel(it, i, o => { if (o === it) mapa(it, i.dataset.itx)[i.dataset.ch] = v; else mapaN(o, i.dataset.itx)[i.dataset.ch] = v; });
      save(); desenhar(render, '[data-itx="' + i.dataset.itx + '"][data-it="' + CSS.escape(i.dataset.it) + '"][data-ch="' + CSS.escape(i.dataset.ch) + '"]');
    });
    qa(host, '[data-itxdel]').forEach(b => b.onclick = () => {
      const it = item(b.dataset.it); if (!it) return;
      noNivel(it, b, o => { if (o === it) delete mapa(it, b.dataset.itxdel)[b.dataset.ch]; else delete mapaN(o, b.dataset.itxdel)[b.dataset.ch]; });
      save(); render();
    });
  }

  /* ---- bônus temporários: comida, poções, efeitos que passam ---- */
  function painelTemporarios(pc, c) {
    if (!RR() || !c.temporarios) return '';
    const lista = c.temporarios, ligados = lista.filter(b => !b.off && b.k && b.v && b.r !== 0).length;
    return `<div class="panel" id="painelTmp" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Bônus temporários</span>
        <span class="hint" style="margin-left:8px">comida, poções e efeitos que passam: somam no atributo enquanto estão ligados${ligados ? ' · ' + ligados + ' somando agora' : ''}</span>
        <span style="margin-left:auto"><button type="button" class="mini primary" data-tmpadd="1">+ Bônus</button></span>
      </div>
      <div class="bd">
        ${lista.length ? `<div class="tmplist">${lista.map(b => {
          // como o bônus acaba: uma anotação (quem desliga é você), no próximo descanso (o Acampamento tira), ou um
          // contador de rodadas que se desconta na mão (com 0, acabou: não soma mais)
          const modo = b.r != null ? 'rodadas' : b.ate ? 'descanso' : 'nota', acabou = b.r === 0;
          const dur = modo === 'nota' ? `<input class="inm tmpd" data-tmpd="${esc(b.id)}" value="${esc(b.d)}" maxlength="40" placeholder="Dura — ex.: 3 turnos" aria-label="Quanto dura (anotação)">`
            : modo === 'descanso' ? `<span class="tmpate" title="O próximo descanso do Acampamento (curto ou longo) tira este bônus — a não ser que o mestre deixe aquele descanso sem tirar">o Acampamento tira</span>`
            : `<span class="tmprod${acabou ? ' fim' : ''}"><button type="button" class="step" data-tmprod="${esc(b.id)}" data-d="-1" ${acabou ? 'disabled' : ''} aria-label="Uma rodada a menos para ${esc(b.n || 'o bônus')}">−</button><b>${acabou ? 'acabou' : b.r + (b.r === 1 ? ' rodada' : ' rodadas')}</b><button type="button" class="step" data-tmprod="${esc(b.id)}" data-d="1" aria-label="Uma rodada a mais para ${esc(b.n || 'o bônus')}">+</button></span>`;
          return `
          <div class="tmprow ${b.off || acabou ? 'off' : ''}" data-tmprow="${esc(b.id)}">
            <label class="tmpon" title="${b.off ? 'Desligado: não está somando' : acabou ? 'Acabaram as rodadas: não está somando' : 'Ligado: está somando'}"><input type="checkbox" data-tmpon="${esc(b.id)}" ${b.off ? '' : 'checked'} aria-label="${esc(b.n || 'Bônus')}: ligado"></label>
            <input class="inm tmpn" data-tmpn="${esc(b.id)}" value="${esc(b.n)}" maxlength="60" placeholder="De onde vem — ex.: Ensopado de javali" aria-label="De onde vem o bônus">
            <select data-tmpk="${esc(b.id)}" aria-label="Onde soma">${optBonus(b.k, b.k ? '' : 'onde soma…')}</select>
            <input type="number" step="1" class="tmpv" data-tmpv="${esc(b.id)}" value="${b.v}" aria-label="Quanto soma">
            <div class="tmpdur"><select class="tmpmodo" data-tmpmodo="${esc(b.id)}" aria-label="Como o bônus ${esc(b.n || '')} acaba">
              <option value="nota"${modo === 'nota' ? ' selected' : ''}>Anotação</option><option value="descanso"${modo === 'descanso' ? ' selected' : ''}>Até o descanso</option><option value="rodadas"${modo === 'rodadas' ? ' selected' : ''}>Rodadas</option></select>${dur}</div>
            <button type="button" class="mini danger" data-tmpdel="${esc(b.id)}" title="Tirar este bônus" aria-label="Tirar o bônus ${esc(b.n || '')}">×</button>
          </div>`; }).join('')}</div>`
        : '<div class="hint">Nenhum bônus temporário. Use para o que passa: +3 de Vitalidade do ensopado, +5 de Agilidade da poção. A duração pode ser uma anotação (quem desliga é você), até o próximo descanso (o Acampamento tira) ou um contador de rodadas, que você desconta.</div>'}
        ${typeof FichasQuadros !== 'undefined' ? FichasQuadros.htmlPenalidades(c) : ''}
      </div>
    </div>`;
  }
  /* Os números que saem das contas, atualizados no lugar (sem redesenhar a ficha) enquanto alguém digita o valor de
     um bônus: na tabela de atributos, a coluna do equipamento com os temporários e o total; e os botões da rolagem
     rápida. As linhas da tabela estão na ordem de sempre: atributos, derivados, defesas. */
  function contasAoVivo(pc) {
    const c = calcular(pc), chaves = ATRIBS.map(a => a.k).concat(DERIV.map(d => d.k), DEFESAS.map(d => d.k));
    const eAtr = k => ATRIBS.some(a => a.k === k), eDer = k => DERIV.some(d => d.k === k);
    qa(document, '#ficha table.attr:not(.defs) tbody tr').forEach((tr, n) => {
      const k = chaves[n]; if (!k) return;
      const eq = tr.querySelector('.vequip'), tot = tr.querySelector('.vtot');
      if (eq) eq.innerHTML = (c.eq[k] ? (c.eq[k] > 0 ? '+' : '') + c.eq[k] : '—') + htmlTemp(c, k);
      if (tot) tot.textContent = eAtr(k) ? c.tot[k] : eDer(k) ? c.der[k] : c.def[k];
    });
    const fonte = (pc.rol && pc.rol.fonte) || 'total';
    qa(document, '#ficha .rolbox [data-rolar]').forEach(b => {
      const k = b.dataset.rolar, s = b.querySelector('span'); if (!s) return;
      const v = eAtr(k) ? (fonte === 'base' ? c.base[k] : c.tot[k]) : eDer(k) ? c.der[k] : c.def[k];
      if (v == null) return;
      s.textContent = v;
      if (b.title) b.title = b.title.replace(/— .*$/, '— ' + v);
    });
  }
  function ligarTemporarios(host, pc) {
    const painel = q(host, '#painelTmp'); if (!painel) return;
    const tmp = () => mapaDe(pc, 'tmp');
    const redesenhar = sel => { save(); desenhar(render, sel); };
    qa(painel, '[data-tmpadd]').forEach(b => b.onclick = () => { const id = 't' + uid(); tmp()[id] = { n: '', k: 'FOR', v: 0, d: '', t: Date.now() }; redesenhar('[data-tmpn="' + id + '"]'); });
    const texto = (attr, chave, max) => qa(painel, '[data-' + attr + ']').forEach(i => { i.oninput = () => { const b = tmp()[i.dataset[attr]]; if (b) { b[chave] = i.value.slice(0, max); save(); } }; });
    texto('tmpn', 'n', 60); texto('tmpd', 'd', 40);
    qa(painel, '[data-tmpon]').forEach(i => i.onchange = () => { const b = tmp()[i.dataset.tmpon]; if (!b) return; if (i.checked) delete b.off; else b.off = true; redesenhar('[data-tmpon="' + i.dataset.tmpon + '"]'); });
    qa(painel, '[data-tmpk]').forEach(s => s.onchange = () => { const b = tmp()[s.dataset.tmpk]; if (!b || !s.value) return; b.k = s.value; redesenhar('[data-tmpk="' + s.dataset.tmpk + '"]'); });
    const rodadas = r => (r === 0 ? 'acabou' : r + (r === 1 ? ' rodada' : ' rodadas'));
    qa(painel, '[data-tmpmodo]').forEach(s => s.onchange = () => {
      const b = tmp()[s.dataset.tmpmodo]; if (!b) return;
      if (s.value === 'rodadas') { b.r = Number.isFinite(+b.r) && +b.r > 0 ? Math.min(99, Math.round(+b.r)) : 3; delete b.ate; b.d = rodadas(b.r); }
      else if (s.value === 'descanso') { b.ate = 'descanso'; delete b.r; b.d = 'até o próximo descanso'; }
      else { delete b.r; delete b.ate; }
      redesenhar('[data-tmpmodo="' + s.dataset.tmpmodo + '"]');
    });
    qa(painel, '[data-tmprod]').forEach(bt => bt.onclick = () => {
      const id = bt.dataset.tmprod, b = tmp()[id]; if (!b) return;
      const r = Math.max(0, Math.min(99, Math.round(+b.r || 0) + (+bt.dataset.d)));
      b.r = r; b.d = rodadas(r);
      // (com 0 o "−" fica desligado: o cursor vai para o "+")
      redesenhar('[data-tmprod="' + id + '"][data-d="' + (r === 0 ? 1 : bt.dataset.d) + '"]');
    });
    /* O valor vale enquanto é digitado: a rolagem rápida e a tabela de atributos acompanham na hora, sem esperar o
       cursor sair do campo (só o que é um número inteiro vale no meio do caminho: "-" a caminho de "-5" ainda não é
       nada). O resto da ficha é redesenhado quando o cursor sai. */
    qa(painel, '[data-tmpv]').forEach(i => {
      i.oninput = () => { const b = tmp()[i.dataset.tmpv], t = i.value.trim(); if (!b || !/^-?\d+([.,]\d+)?$/.test(t)) return; const v = Math.round((+t.replace(',', '.') || 0) * 10) / 10; if (v === b.v) return; b.v = v; save(); contasAoVivo(pc); };
      i.onchange = () => { const b = tmp()[i.dataset.tmpv]; if (!b) return; b.v = Math.round((+i.value || 0) * 10) / 10; redesenhar('[data-tmpv="' + i.dataset.tmpv + '"]'); };
    });
    qa(painel, '[data-tmpdel]').forEach(b => b.onclick = () => {
      const id = b.dataset.tmpdel, era = tmp()[id]; if (!era) return;
      delete tmp()[id]; redesenhar();
      aviso('Bônus ' + (era.n ? '“' + era.n + '” ' : '') + 'tirado.', 'Desfazer', () => { tmp()[id] = era; redesenhar(); });
    });
  }

  /* ---- bolsas: poções, bombas, runas, munições e materiais ---- */
  const BOLSAS = () => (RR() ? RR().BOLSAS : []);
  let bolsaPede = null;                  // a poção com a prévia aberta, esperando o "Usar agora"
  let bolsaEm = null;                    // { pc, item, alvo }: em quem a poção da prévia vai ser usada (sem isso, em quem a tem)
  const qtdDe = (pc, id) => { const v = pc.estado && pc.estado.qtd ? +pc.estado.qtd[id] : 0; return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0; };
  /* Em quem a poção pode ser usada: em quem a tem e em qualquer outro personagem desta tela (o jogador recebe só as
     fichas que pode ver). Numa mesa com campanhas, os da campanha em vista primeiro. */
  const outrosPcs = pc => FichasMesa.emOrdem(S.personagens.filter(x => x.id !== pc.id));
  const alvoDaPrevia = (pc, it) => { const id = bolsaEm && bolsaEm.pc === pc.id && bolsaEm.item === it.id ? bolsaEm.alvo : null; return id ? S.personagens.find(x => x.id === id) || null : null; };
  const comoAlvo = a => (a ? { pc: a, calc: calcular(a), estado: a.estado || {}, nome: a.nome } : null);
  const semCena = () => true;            // (a ficha não põe condição em token: isso é pela cena)
  // o que vai acontecer ao usar, em palavras (só as poções fazem alguma coisa sozinhas)
  const previaDoUso = (pc, c, it, alvo) => RR().previaDoUso(pc, c, pc.estado, it, comoAlvo(alvo), { semCena: semCena() });
  const TIPOS_FX = [['barra', 'Mexe numa barra'], ['sob', 'Dá sobrevida'], ['bonus', 'Dá um bônus'], ['cond', 'Põe uma condição (no token)']];
  const DURS = [['', 'anotação'], ['descanso', 'até o descanso'], ['rodadas', 'rodadas']];
  // as barras que um efeito pode escolher: as da ficha (com máximo) e, para "mexe numa barra", as barras especiais
  function opcoesDeBarra(pc, c, e, especiaisTambem) {
    const rs = (c.recursos || []).filter(r => !r.err && r.val != null), pds = especiaisTambem && RR().especiais ? RR().especiais(pc, pc.estado).filter(x => x.max > 0) : [];
    const sumiu = e.rec && !rs.some(r => r.id === e.rec) && !pds.some(x => 'pd:' + x.id === e.rec);
    return `<option value="">escolha a barra</option>${rs.map(r => `<option value="${esc(r.id)}" ${e.rec === r.id ? 'selected' : ''}>${esc(r.nome || 'Barra')}</option>`).join('')}`
      + (pds.length ? `<optgroup label="Barras especiais">${pds.map(x => `<option value="pd:${esc(x.id)}" ${e.rec === 'pd:' + x.id ? 'selected' : ''}>${esc(x.nome)}</option>`).join('')}</optgroup>` : '')
      + (sumiu ? `<option value="${esc(e.rec)}" selected>(barra que saiu da ficha)</option>` : '');
  }
  function opcoesDeCondicao(sel) {
    const R = RR(); if (!R || !R.CONDICOES) return '';
    return `<option value="">escolha a condição</option>` + R.COND_GRUPOS.map(g => `<optgroup label="${esc(g.n)}">${R.CONDICOES.filter(x => x.g === g.id && (x.id !== 'ferida' && x.id !== 'clone' || sel === x.id)).map(x => `<option value="${x.id}" ${sel === x.id ? 'selected' : ''}>${esc(x.n)}</option>`).join('')}</optgroup>`).join('');
  }
  function linhaFx(pc, c, it, e, i) {
    const k = esc(it.id) + '|' + i, del = `<button type="button" class="mini danger" data-fxdel="${k}" title="Tirar este efeito" aria-label="Tirar o efeito ${i + 1} de ${esc(it.nome || 'poção')}">×</button>`;
    if (e.k === 'barra' || e.k === 'sob') {
      const ef = RR().lerEfeito(e.val);
      return `<div class="fxrow" data-fx="${k}"><span class="fxk">${e.k === 'barra' ? 'Barra' : 'Sobrevida'}</span>
        <select data-fxrec="${k}" aria-label="${e.k === 'barra' ? 'Em que barra' : 'Sobrevida em que barra'}">${opcoesDeBarra(pc, c, e, e.k === 'barra')}</select>
        <input class="mono ${ef && ef.erro ? 'ruim' : ''}" data-fxval="${k}" value="${esc(e.val)}" maxlength="30" placeholder="${e.k === 'barra' ? '30 ou 2d6+3' : '15 ou 2d6'}" autocomplete="off" aria-label="Quanto" title="${e.k === 'barra' ? 'Um valor (30) ou dados (2d6+3). Com − na frente, tira em vez de pôr (−10, −1d6).' : 'Um valor (15) ou dados (2d6). Se a barra já tem sobrevida, fica a maior das duas.'}">
        ${del}${ef && ef.erro ? `<span class="fmlerr">${esc(ef.erro)}</span>` : ''}</div>`;
    }
    if (e.k === 'bonus') return `<div class="fxrow" data-fx="${k}"><span class="fxk">Bônus</span>
        <select data-fxbk="${k}" aria-label="Em quê">${optBonus(e.bk, 'escolha')}</select>
        <input type="number" step="1" class="fxn" data-fxbv="${k}" value="${e.bv || 0}" aria-label="De quanto">
        <select data-fxdur="${k}" aria-label="Quanto dura">${DURS.map(d => `<option value="${d[0]}" ${e.dur === d[0] ? 'selected' : ''}>${d[1]}</option>`).join('')}</select>
        ${e.dur === 'rodadas' ? `<input type="number" min="1" max="999" step="1" class="fxn" data-fxr="${k}" value="${e.r || 1}" aria-label="Quantas rodadas">`
          : e.dur === 'descanso' ? '<span class="hint">o descanso tira</span>' : `<input class="inm" data-fxbd="${k}" value="${esc(e.bd)}" maxlength="40" placeholder="3 turnos" aria-label="Quanto dura (anotação)">`}
        ${del}</div>`;
    return `<div class="fxrow" data-fx="${k}"><span class="fxk">Condição</span>
        <select data-fxc="${k}" aria-label="Que condição">${opcoesDeCondicao(e.c)}</select>
        <input type="number" min="0" max="999" step="1" class="fxn" data-fxr="${k}" value="${e.r || 0}" aria-label="Rodadas (0: sem contador)" title="Rodadas na condição (0: sem contador)">
        <span class="hint">rodadas · vai para o token, pela cena</span>${del}</div>`;
  }
  function painelBolsa(pc, c) {
    const R = RR(); if (!R) return '';
    const itens = R.bolsa(pc, pc.estado), tipos = BOLSAS();
    const aba = tipos.some(b => b.t === S.abaBolsa) ? S.abaBolsa : 'pocao', tipo = tipos.find(b => b.t === aba);
    const total = t => itens.filter(x => x.t === t).reduce((s, x) => s + x.qtd, 0);
    const daAba = itens.filter(x => x.t === aba), outros = outrosPcs(pc);
    const linha = it => {
      const pocao = it.t === 'pocao', pede = bolsaPede === it.id, alvo = pede ? alvoDaPrevia(pc, it) : null, previa = pede ? previaDoUso(pc, c, it, alvo) : [];
      return `<div class="bolrow ${it.qtd ? '' : 'sem'}" data-bolrow="${esc(it.id)}">
        <div class="bolcab">
          <input class="inm bolnome" data-bolnome="${esc(it.id)}" value="${esc(it.nome)}" maxlength="60" placeholder="Nome ${pocao ? 'da poção' : 'do item'}" aria-label="Nome">
          <span class="bolqtd" title="Quantas há na bolsa">
            <button type="button" class="step" data-bolstep="${esc(it.id)}" data-d="-1" ${it.qtd <= 0 ? 'disabled' : ''} aria-label="Uma a menos de ${esc(it.nome || 'item')}">−</button>
            <input type="number" min="0" step="1" data-bolqtd="${esc(it.id)}" value="${it.qtd}" aria-label="Quantidade de ${esc(it.nome || 'item')}">
            <button type="button" class="step" data-bolstep="${esc(it.id)}" data-d="1" aria-label="Uma a mais de ${esc(it.nome || 'item')}">+</button>
          </span>
          <button type="button" class="mini primary" data-boluse="${esc(it.id)}" ${it.qtd < 1 ? 'disabled' : ''} title="${it.qtd < 1 ? 'Não há nenhuma na bolsa' : pocao ? 'Gasta uma e aplica o efeito (mostra antes o que vai acontecer, e em quem)' : 'Gasta uma e avisa a mesa. Nada é aplicado sozinho.'}">Usar</button>
          <button type="button" class="mini danger" data-boldel="${esc(it.id)}" title="Tirar da bolsa" aria-label="Tirar ${esc(it.nome || 'item')} da bolsa">×</button>
        </div>
        ${pede ? `<div class="bolconf" role="group" aria-label="Confirmar o uso">
          <span><strong>Usar ${esc(it.nome || 'a poção')}</strong>${outros.length ? ` em <select data-bolem="${esc(it.id)}" aria-label="Em quem usar">
              <option value="">${esc(pc.nome || 'quem tem')}</option>${FichasMesa.opcoesDePcs(outros, alvo ? alvo.id : '')}</select>` : ''}?
            ${esc(previa.join(' · ') || 'Gasta uma unidade.')} · ${it.qtd - 1 === 0 ? 'é a última' : it.qtd - 1 === 1 ? 'sobra 1' : 'sobram ' + (it.qtd - 1)}</span>
          <button type="button" class="mini primary" data-bolsim="${esc(it.id)}">Usar agora</button>
          <button type="button" class="mini" data-bolnao="1">Cancelar</button></div>` : ''}
        ${pocao ? `<div class="bolfxs" role="group" aria-label="Efeitos de ${esc(it.nome || 'a poção')}">
          ${it.fx.map((e, i) => linhaFx(pc, c, it, e, i)).join('')}
          ${it.fx.length < 8 ? `<select class="fxadd" data-fxadd="${esc(it.id)}" aria-label="Acrescentar um efeito"><option value="">+ Efeito…</option>${TIPOS_FX.map(t => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select>` : ''}
        </div>` : ''}
        <textarea rows="1" data-bolnota="${esc(it.id)}" maxlength="400" placeholder="${pocao ? 'Gosto, cor, de onde veio…' : 'O que faz, como se usa…'}" aria-label="Anotação de ${esc(it.nome || 'item')}">${esc(it.nota)}</textarea>
      </div>`;
    };
    return `<div class="panel" id="painelBolsa" style="margin-bottom:18px">
      <div class="hd subtabs">
        <span class="eyebrow" style="margin-right:6px">Bolsas</span>
        ${tipos.map(b => { const n = total(b.t); return `<button type="button" class="sub ${aba === b.t ? 'on' : ''}" data-ababolsa="${b.t}">${b.nome}${n ? `<span class="mk">${n}</span>` : ''}</button>`; }).join('')}
        <span style="margin-left:auto"><button type="button" class="mini primary" data-boladd="${aba}">+ ${tipo.um}</button></span>
      </div>
      <div class="bd">
        ${daAba.length ? `<div class="bollist">${daAba.map(linha).join('')}</div>`
        : `<div class="hint">${aba === 'pocao' ? 'Nenhuma poção. Uma poção pode fazer várias coisas de uma vez: mexer em barras, dar sobrevida, dar bônus (até o descanso, por rodadas…) e pôr uma condição no token. “Usar” gasta uma, aplica — em quem tem ou em outro personagem — e avisa a mesa.' : 'Nada aqui ainda. “Usar” gasta uma unidade e avisa a mesa; nada é aplicado sozinho.'}</div>`}
        ${daAba.length ? `<div class="hint" style="margin-top:8px">${aba === 'pocao' ? '“Usar” mostra antes o que vai acontecer e deixa escolher em quem; depois de usar, dá para desfazer. Com o token ligado a esta ficha, as bolsas também aparecem na cena (lá a condição vai para o token).' : '“Usar” gasta uma unidade e avisa a mesa — o efeito é com vocês. Dá para desfazer.'}</div>` : ''}
      </div>
    </div>`;
  }
  /* As mudanças que um uso faz no estado de quem recebe, do jeito que o banco grava "às cegas" (ver usarItemEm): só o
     que mudou — barras, sobrevidas, barras especiais e bônus novos. Com `volta`, o caminho de volta. */
  function mudasDoUso(u, antes, volta) {
    const m = { rec: {}, sob: {}, pd: {}, tmp: {} }, a = antes || {}, d = u.estadoAlvo || {};
    for (const e of u.efeitos) {
      if (e.k === 'barra' && e.tipo === 'rec') m.rec[e.id] = volta ? (a.rec && a.rec[e.id] != null ? a.rec[e.id] : null) : d.rec[e.id];
      else if (e.k === 'barra' && e.tipo === 'pd') m.pd[e.id] = volta ? e.de : d.pd[e.id];
      else if (e.k === 'sob') m.sob[e.id] = volta ? (a.sob && a.sob[e.id] != null ? a.sob[e.id] : null) : (d.sob ? d.sob[e.id] : null);
      else if (e.k === 'bonus') m.tmp[e.id] = volta ? null : d.tmp[e.id];
    }
    for (const k of Object.keys(m)) if (!Object.keys(m[k]).length) delete m[k];
    return m;
  }
  /* Usa um item: gasta, aplica (poção) em quem tem ou em outro personagem, registra na mesa e deixa desfazer. */
  function usarDaBolsa(pc, id) {
    const R = RR(), c = calcular(pc), it = R.bolsa(pc, pc.estado).find(x => x.id === id);
    const alvo = it ? alvoDaPrevia(pc, it) : null;
    bolsaPede = null; bolsaEm = null;
    if (!it) { render(); return; }
    // os dados de cada efeito que rola (um total por efeito, na ordem)
    const rolados = [], contas = [];
    let dd = [];
    for (const e of it.fx) {
      const ef = (e.k === 'barra' || e.k === 'sob') && e.rec ? R.lerEfeito(e.val) : null;
      if (ef && ef.dados) { try { const r = rolarExpressao(ef.dados); rolados.push(r.total); dd = dd.concat(r.dd || []); contas.push(ef.dados + ' → ' + r.detalhe + ' = ' + r.total); } catch (err) { toast(err.message); render(); return; } }
      else rolados.push(null);
    }
    const antes = pc.estado || {}, antesAlvo = alvo ? (alvo.estado || {}) : null;
    const u = R.usarItem(pc, c, antes, id, rolados, Date.now(), 't' + uid(), comoAlvo(alvo));
    if (!u.ok) { toast(u.erro); render(); return; }
    // (na ficha, a condição da poção não vai para token nenhum: o texto diz que ela é só pela cena)
    const nome = it.nome || (BOLSAS().find(b => b.t === it.t) || {}).um || 'Item', titulo = pc.nome + ' · ' + nome + (alvo ? ' em ' + alvo.nome : ''), texto = R.textoDoUso(u, { semCena: true });
    const conds = '';
    const registrar = () => logar({ tipo: 'uso', quem: titulo, pc: pc.id, det: 'usou ' + nome + (alvo ? ' em ' + alvo.nome : '') + (contas.length ? ' · ' + contas.join(' · ') : '') + ' · ' + texto, total: null, dd });
    // em outro personagem cuja ficha esta tela não grava (a de outro jogador, um NPC à mostra): pelo banco, as duas juntas
    if (alvo && !FichasMesa.podeEditar(alvo)) {
      const mudas = mudasDoUso(u, antesAlvo, false);
      if (!TC.ponte || typeof TC.ponte.usarItemEm !== 'function') { toast('Para usar num personagem que não é seu, abra a ficha dentro do site, com a mesa.'); render(); return; }
      TC.ponte.usarItemEm({ de: pc.id, item: it.id, alvo: alvo.id, mudas }).then(() => {
        registrar();
        aviso(nome + ' em ' + alvo.nome + ': ' + texto + '.' + conds, 'Desfazer', () => {
          TC.ponte.usarItemEm({ de: pc.id, item: it.id, alvo: alvo.id, mudas: mudasDoUso(u, antesAlvo, true), volta: true })
            .then(() => logar({ tipo: 'uso', quem: titulo, pc: pc.id, det: 'desfeito: ' + nome + ' voltou para a bolsa e ' + alvo.nome + ' ficou como estava', total: null }))
            .catch(e => toast(e.message));
        });
      }).catch(e => { toast(e.message); render(); });
      return;
    }
    pc.estado = u.estado;
    if (alvo) alvo.estado = u.estadoAlvo;
    registrar();
    render();
    aviso(nome + (alvo ? ' em ' + alvo.nome : '') + ': ' + texto + '.' + conds, 'Desfazer', () => {
      // só o que este uso mexeu volta (o que outra pessoa mudou nos personagens nesse meio-tempo fica)
      const qtd = mapaDe(pc, 'qtd'); qtd[it.id] = qtdDe(pc, it.id) + 1;
      const quem = alvo || pc, a = alvo ? antesAlvo : antes;
      for (const e of u.efeitos) {
        if (e.k === 'barra' && e.tipo === 'rec') {
          const rec = mapaDe(quem, 'rec'), tinha = a.rec && a.rec[e.id] != null;
          if (+rec[e.id] === e.para) { if (tinha) rec[e.id] = a.rec[e.id]; else delete rec[e.id]; }
          else if (rec[e.id] != null) rec[e.id] = Math.round((+rec[e.id] - (e.para - e.de)) * 10) / 10;
        } else if (e.k === 'barra' && e.tipo === 'pd') quem.estado = R.mudarEspecial(quem.estado || {}, e.id, e.de, (R.especiais(quem, quem.estado).find(x => x.id === e.id) || {}).max);
        else if (e.k === 'sob') { const sob = mapaDe(quem, 'sob'); if (a.sob && a.sob[e.id] != null) sob[e.id] = a.sob[e.id]; else delete sob[e.id]; }
        else if (e.k === 'bonus') delete mapaDe(quem, 'tmp')[e.id];
      }
      logar({ tipo: 'uso', quem: titulo, pc: pc.id, det: 'desfeito: ' + nome + ' voltou para a bolsa' + (u.efeitos.length ? ' e ' + (alvo ? alvo.nome : 'o personagem') + ' ficou como estava' : ''), total: null });
      render();
    });
  }
  function ligarBolsa(host, pc) {
    const painel = q(host, '#painelBolsa'); if (!painel) return;
    const lista = () => (Array.isArray(pc.bolsa) ? pc.bolsa : (pc.bolsa = []));
    const item = id => lista().find(x => x && x.id === id);
    const redesenhar = sel => { save(); desenhar(render, sel); };
    qa(painel, '[data-ababolsa]').forEach(b => b.onclick = () => { S.abaBolsa = b.dataset.ababolsa; bolsaPede = null; redesenhar('[data-ababolsa="' + b.dataset.ababolsa + '"]'); });
    qa(painel, '[data-boladd]').forEach(b => b.onclick = () => {
      const id = 'b' + uid(); lista().push(b.dataset.boladd === 'pocao' ? { id, t: 'pocao', nome: '', fx: [] } : { id, t: b.dataset.boladd, nome: '' }); mapaDe(pc, 'qtd')[id] = 1;
      redesenhar('[data-bolnome="' + id + '"]');
    });
    const texto = (attr, chave, max) => qa(painel, '[data-' + attr + ']').forEach(i => { i.oninput = () => { const it = item(i.dataset[attr]); if (!it) return; const v = i.value.slice(0, max); if (v) it[chave] = v; else delete it[chave]; save(); if (i.tagName === 'TEXTAREA') altura(i); }; });
    const altura = t => { t.style.height = 'auto'; t.style.height = Math.max(30, t.scrollHeight + 2) + 'px'; };
    texto('bolnome', 'nome', 60); texto('bolnota', 'nota', 400);
    qa(painel, '[data-bolnota]').forEach(altura);
    /* Os efeitos de uma poção: a poção de antes (efeito e bônus soltos) passa para a lista na primeira mudança. */
    const efeitos = it => { if (!Array.isArray(it.fx)) { it.fx = RR().efeitosDoItem(it); delete it.rec; delete it.val; delete it.bk; delete it.bv; delete it.bd; } return it.fx; };
    const doFx = attr => { const [id, i] = String(attr).split('|'), it = item(id); if (!it) return null; const l = efeitos(it), e = l[+i]; return e ? { it, l, e, i: +i } : null; };
    qa(painel, '[data-fxadd]').forEach(s => s.onchange = () => {
      const it = item(s.dataset.fxadd); if (!it || !s.value) return;
      const l = efeitos(it); if (l.length >= 8) return;
      const novo = s.value === 'barra' || s.value === 'sob' ? { k: s.value, rec: '', val: '' } : s.value === 'bonus' ? { k: 'bonus', bk: '', bv: 0, dur: '', r: 0, bd: '' } : { k: 'cond', c: '', r: 0 };
      l.push(novo);
      const k = it.id + '|' + (l.length - 1);
      redesenhar(novo.k === 'bonus' ? '[data-fxbk="' + k + '"]' : novo.k === 'cond' ? '[data-fxc="' + k + '"]' : '[data-fxrec="' + k + '"]');
    });
    qa(painel, '[data-fxdel]').forEach(b => b.onclick = () => {
      const x = doFx(b.dataset.fxdel); if (!x) return;
      const [era] = x.l.splice(x.i, 1);
      redesenhar('[data-fxadd="' + x.it.id + '"]');
      aviso('Efeito tirado de ' + (x.it.nome || 'a poção') + '.', 'Desfazer', () => { const l = efeitos(x.it); l.splice(Math.min(x.i, l.length), 0, era); redesenhar(); });
    });
    const campoFx = (attr, fn, sel) => qa(painel, '[data-' + attr + ']').forEach(el => el.onchange = () => { const x = doFx(el.dataset[attr.replace(/-([a-z])/g, (m, c) => c.toUpperCase())]); if (!x) return; fn(x.e, el); redesenhar('[data-' + attr + '="' + el.dataset[attr.replace(/-([a-z])/g, (m, c) => c.toUpperCase())] + '"]'); });
    campoFx('fxrec', (e, el) => { e.rec = el.value; });
    campoFx('fxbk', (e, el) => { e.bk = el.value; });
    campoFx('fxbv', (e, el) => { e.bv = Math.round((+el.value || 0) * 10) / 10; });
    campoFx('fxdur', (e, el) => { e.dur = el.value; if (e.dur === 'rodadas' && !(e.r >= 1)) e.r = 1; if (e.dur) e.bd = ''; });
    campoFx('fxr', (e, el) => { e.r = Math.max(e.k === 'bonus' ? 1 : 0, Math.min(999, Math.round(+el.value || 0))); });
    campoFx('fxc', (e, el) => { e.c = el.value; });
    // o valor e a anotação do bônus vão sendo guardados enquanto se escreve (o quadro só é redesenhado ao sair do campo)
    qa(painel, '[data-fxval]').forEach(i => { i.oninput = () => { const x = doFx(i.dataset.fxval); if (!x) return; x.e.val = i.value.trim().slice(0, 30); save(); }; i.onchange = () => redesenhar('[data-fxval="' + i.dataset.fxval + '"]'); });
    qa(painel, '[data-fxbd]').forEach(i => { i.oninput = () => { const x = doFx(i.dataset.fxbd); if (!x) return; x.e.bd = i.value.slice(0, 40); save(); }; });
    const porQtd = (id, n) => { mapaDe(pc, 'qtd')[id] = Math.max(0, Math.min(9999, Math.round(n) || 0)); };
    qa(painel, '[data-bolqtd]').forEach(i => i.onchange = () => { if (!item(i.dataset.bolqtd)) return; porQtd(i.dataset.bolqtd, +i.value); if (bolsaPede === i.dataset.bolqtd) bolsaPede = null; redesenhar('[data-bolqtd="' + i.dataset.bolqtd + '"]'); });
    qa(painel, '[data-bolstep]').forEach(b => b.onclick = () => {
      const id = b.dataset.bolstep; if (!item(id)) return;
      porQtd(id, qtdDe(pc, id) + (+b.dataset.d)); if (bolsaPede === id) bolsaPede = null;
      redesenhar('[data-bolstep="' + id + '"][data-d="' + b.dataset.d + '"]');
      if (document.activeElement === document.body) refocar('[data-bolqtd="' + id + '"]');      // o "−" que chegou a zero fica desabilitado
    });
    qa(painel, '[data-boldel]').forEach(b => b.onclick = () => {
      const id = b.dataset.boldel, i = lista().findIndex(x => x && x.id === id); if (i < 0) return;
      const [era] = lista().splice(i, 1), n = qtdDe(pc, id);
      delete mapaDe(pc, 'qtd')[id]; if (bolsaPede === id) bolsaPede = null;
      redesenhar();
      aviso((era.nome ? '“' + era.nome + '”' : 'O item') + ' saiu da bolsa.', 'Desfazer', () => { lista().splice(Math.min(i, lista().length), 0, era); if (n) mapaDe(pc, 'qtd')[id] = n; redesenhar(); });
    });
    qa(painel, '[data-boluse]').forEach(b => b.onclick = () => {
      const id = b.dataset.boluse, c = calcular(pc), it = RR().bolsa(pc, pc.estado).find(x => x.id === id); if (!it) return;
      bolsaEm = null;
      // poção (com efeito, ou havendo em quem mais usar): mostra antes o que vai acontecer
      if (it.t === 'pocao' && (previaDoUso(pc, c, it, null).length || outrosPcs(pc).length)) { bolsaPede = id; render(); refocar('[data-bolsim="' + id + '"]'); }
      else usarDaBolsa(pc, id);
    });
    qa(painel, '[data-bolem]').forEach(s => s.onchange = () => { bolsaEm = { pc: pc.id, item: s.dataset.bolem, alvo: s.value || null }; render(); refocar('[data-bolem="' + s.dataset.bolem + '"]'); });
    qa(painel, '[data-bolsim]').forEach(b => b.onclick = () => usarDaBolsa(pc, b.dataset.bolsim));
    qa(painel, '[data-bolnao]').forEach(b => b.onclick = () => { const id = bolsaPede; bolsaPede = null; bolsaEm = null; render(); if (id) refocar('[data-boluse="' + id + '"]'); });
  }

  /* ---- identidade: sexo, partes íntimas e panteão ---- */
  const SEXOS = [['', '—'], ['M', 'Masculino'], ['F', 'Feminino'], ['O', 'Outro']];
  function htmlIdentidade(pc) {
    const s = SEXOS.some(x => x[0] === pc.sexo) ? pc.sexo : '';
    // masculino mostra o tamanho do pênis; feminino, o tipo das partes íntimas; "outro" ou sem resposta, os dois
    return `<div class="idcard3">
      <label class="f"><span class="eyebrow">Sexo</span><select id="f_sexo">${SEXOS.map(([v, n]) => `<option value="${v}" ${s === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${s !== 'F' ? `<label class="f"><span class="eyebrow">Tamanho do pênis</span>
        <input id="f_tampenis" maxlength="24" value="${esc(pc.tamPenis || '')}" placeholder="ex.: 15 cm" autocomplete="off"></label>` : ''}
      ${s !== 'M' ? `<label class="f"><span class="eyebrow">Tipo das partes íntimas</span>
        <input id="f_partes" maxlength="40" value="${esc(pc.partes || '')}" autocomplete="off"></label>` : ''}
      <label class="f"><span class="eyebrow">Panteão</span>
        <input id="f_panteao" maxlength="60" value="${esc(pc.panteao || '')}" placeholder="a quem o personagem reza" autocomplete="off"></label>
    </div>`;
  }
  function ligarIdentidade(host, pc) {
    const texto = (sel, chave, max) => { const i = q(host, sel); if (i) i.oninput = () => { const v = i.value.trim().slice(0, max); if (v) pc[chave] = v; else delete pc[chave]; save(); }; };
    texto('#f_tampenis', 'tamPenis', 24); texto('#f_partes', 'partes', 40); texto('#f_panteao', 'panteao', 60);
    const s = q(host, '#f_sexo');
    if (s) s.onchange = () => { if (s.value) pc.sexo = s.value; else delete pc.sexo; save(); render(); refocar('#f_sexo'); };
  }

  /* Tudo o que é novo, ligado de uma vez (a calculadora chama depois de desenhar a ficha). */
  function ligarNovos(host, pc) {
    qa(host, '[data-abaatr]').forEach(b => b.onclick = () => { S.abaAtr = b.dataset.abaatr === 'def' ? 'def' : 'atr'; save(); render(); refocar('[data-abaatr="' + S.abaAtr + '"]'); });
    qa(host, '[data-defesp]').forEach(i => i.onchange = () => {
      const k = i.dataset.defesp, v = Math.round(+i.value) || 0;
      if (!pc.defEsp || typeof pc.defEsp !== 'object') pc.defEsp = {};
      if (v) pc.defEsp[k] = v; else delete pc.defEsp[k];
      save(); desenhar(render, '[data-defesp="' + k + '"]');
    });
    ligarIdentidade(host, pc); ligarBarras(host, pc); ligarItens(host, pc); ligarMaisDoItem(host, pc); ligarTemporarios(host, pc); ligarBolsa(host, pc);
  }

  return {
    aviso, imagemOk, iniciais, miniatura,
    htmlRetrato, ligarRetrato, guardarImagem,
    htmlLapros, ligarLapros, laprosDe, lerLapros,
    painelItens, ligarItens, abrirItem, mostrarItem, itemNovo, bonusDoItem, ligarEfeitos, htmlEfeitosEquipados,
    htmlSobrevida, ligarSobrevida, sobrevidaDe,
    ehLivre, tornarLivre, painelAtributosLivre, htmlBotaoModo, ligarAtributos,
    painelMente, ligarMente, usaMente, valorMente, relsDe, MENTE,
    htmlAbasAtr, abaDefesas, painelDefesas, htmlTemp, htmlOpcoesBarra, htmlMaisDoItem, htmlTotaisExtras,
    painelTemporarios, painelBolsa, htmlIdentidade, ligarNovos, icoDef,
    util: { q, qa, glifo, optBonus, refocar, mapaDe, estadoDe, sinalTxt, menos, comoMestre, desenhar }, aoVivo, desenhar,
  };
})();
