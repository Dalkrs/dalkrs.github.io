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

  /* Aviso com um botão (Desfazer). Some sozinho. */
  function aviso(texto, acao, fn, ms) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const d = document.createElement('div');
    d.className = 'toast comacao';
    const s = document.createElement('span'); s.textContent = texto; d.append(s);
    if (acao) { const b = document.createElement('button'); b.type = 'button'; b.textContent = acao; b.onclick = () => { d.remove(); fn(); }; d.append(b); }
    document.body.append(d);
    setTimeout(() => d.remove(), ms || (acao ? 8000 : 2600));
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

  /* ======================= equipamentos: passivas e efeitos =======================*/
  const colunasItens = () => 1 + ATRIBS.length + DERIV.length + DEFESAS.length;
  function htmlEfeitoItem(it, pc) {
    return `<tr class="itfx ${it.equipado === false ? 'off' : ''}"><td></td><td colspan="${colunasItens()}">
      ${pc ? htmlMaisDoItem(it, pc) : ''}
      <textarea rows="1" data-itemfx="${it.id}" placeholder="Passivas e efeitos deste item — ex.: +10% de dano contra mortos-vivos · 1×/dia: escudo de luz" aria-label="Passivas e efeitos de ${esc(it.nome || 'item sem nome')}">${esc(it.efeito || '')}</textarea>
    </td><td></td></tr>`;
  }
  const ajustarAltura = t => { t.style.height = 'auto'; t.style.height = Math.max(30, t.scrollHeight + 2) + 'px'; };
  function ligarEfeitos(host, pc) {
    qa(host, '[data-itemfx]').forEach(t => {
      ajustarAltura(t);
      t.oninput = () => { const it = (pc.itens || []).find(x => x.id === t.dataset.itemfx); if (it) { it.efeito = t.value; save(); } ajustarAltura(t); };
    });
  }
  // na aba "Passivas e Habilidades": o que os itens equipados dão, só para leitura (edita-se no próprio item)
  function htmlEfeitosEquipados(pc) {
    const com = (pc.itens || []).filter(it => it.equipado !== false && String(it.efeito || '').trim());
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
            <td class="num vbase">${d.calc(c.base)}</td>
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
        <div class="hint" style="margin-top:6px">Distribuição livre: quem controla a ficha põe os pontos onde quiser. O total vem da tabela de levels (${c.limite} no level ${esc(String(pc.level))}); a ficha avisa se faltar ou passar, mas não trava. Os três derivados usam os atributos <strong>base</strong>; a árvore e os equipamentos somam por cima.</div>
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
  let relConf = null;                       // { pc, id }: a linha que está perguntando "revelar?"
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
    return `<div class="panel" id="painelMente" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Sanidade, conforto e relacionamentos</span>
        ${FichasMesa.deJogador(pc) ? '' : '<span style="margin-left:auto"><button type="button" class="mini" data-mente="parar" title="Esta ficha deixa de mostrar Sanidade, Conforto e Relacionamentos">Deixar de usar</button></span>'}
      </div>
      <div class="bd">
        <div class="mente2">${cartaoMente(pc, 'san')}${cartaoMente(pc, 'conf')}</div>
        <div class="relhd"><span class="mnome">${glifo(REL_SVG)} Relacionamentos</span><span class="hint">o que este personagem sente por cada um — de −100 (hostil) a +100 (leal)${comoMestre() && FichasMesa.ehNpc(pc) ? ' · os de um NPC ficam só com você, mesmo com a ficha aberta aos jogadores' : ''}</span></div>
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
    qa(painel, '[data-relnao]').forEach(b => b.onclick = () => { const id = relConf && relConf.id; relConf = null; pintarMente(pc, id ? '[data-relolho="' + id + '"]' : null); });
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
  const chipItem = (tipo, it, chave, rotulo, v) => `<span class="chipb ${tipo}"><b>${esc(rotulo)}</b>
    <input type="number" step="1" data-itx="${tipo}" data-it="${esc(it.id)}" data-ch="${esc(chave)}" value="${+v || 0}" aria-label="${esc(rotulo)}: quanto ${esc(it.nome || 'este item')} soma">
    <button type="button" class="chipx" data-itxdel="${tipo}" data-it="${esc(it.id)}" data-ch="${esc(chave)}" title="Tirar ${esc(rotulo)} deste item" aria-label="Tirar ${esc(rotulo)} de ${esc(it.nome || 'este item')}">×</button></span>`;
  function htmlMaisDoItem(it, pc) {
    if (!RR()) return '';
    const rs = pc.recursos || [], rec = it.rec && typeof it.rec === 'object' ? it.rec : {}, def = it.def && typeof it.def === 'object' ? it.def : {};
    const chips = rs.filter(r => rec[r.id] != null).map(r => chipItem('rec', it, r.id, r.nome || 'Barra', rec[r.id]))
      .concat(ESP().filter(d => def[d.k] != null).map(d => chipItem('def', it, d.k, 'Def. ' + d.nome, def[d.k])));
    const livresR = rs.filter(r => rec[r.id] == null), livresD = ESP().filter(d => def[d.k] == null);
    return `<div class="itmais">${chips.join('')}
      <select class="itmais-s" data-itmais="${esc(it.id)}" aria-label="${esc(it.nome || 'Este item')} também soma em…" title="O item pode aumentar o máximo de uma barra (HP, SP…) ou uma defesa específica">
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
    qa(host, '[data-itmais]').forEach(s => s.onchange = () => {
      const it = item(s.dataset.itmais), v = s.value, i = v.indexOf(':'); if (!it || i < 0) return;
      const tipo = v.slice(0, i), ch = v.slice(i + 1);
      mapa(it, tipo)[ch] = 0;
      save(); render();
      refocar('[data-itx="' + tipo + '"][data-it="' + CSS.escape(it.id) + '"][data-ch="' + CSS.escape(ch) + '"]');
      const n = document.activeElement; if (n && n.select) n.select();
    });
    qa(host, '[data-itx]').forEach(i => i.onchange = () => {
      const it = item(i.dataset.it); if (!it) return;
      mapa(it, i.dataset.itx)[i.dataset.ch] = Math.round(+i.value) || 0;
      save(); desenhar(render, '[data-itx="' + i.dataset.itx + '"][data-it="' + CSS.escape(i.dataset.it) + '"][data-ch="' + CSS.escape(i.dataset.ch) + '"]');
    });
    qa(host, '[data-itxdel]').forEach(b => b.onclick = () => {
      const it = item(b.dataset.it); if (!it) return;
      delete mapa(it, b.dataset.itxdel)[b.dataset.ch];
      save(); render();
    });
  }

  /* ---- bônus temporários: comida, poções, efeitos que passam ---- */
  function painelTemporarios(pc, c) {
    if (!RR() || !c.temporarios) return '';
    const lista = c.temporarios, ligados = lista.filter(b => !b.off && b.k && b.v).length;
    return `<div class="panel" id="painelTmp" style="margin-bottom:18px">
      <div class="hd"><span class="eyebrow">Bônus temporários</span>
        <span class="hint" style="margin-left:8px">comida, poções e efeitos que passam: somam no atributo enquanto estão ligados${ligados ? ' · ' + ligados + ' somando agora' : ''}</span>
        <span style="margin-left:auto"><button type="button" class="mini primary" data-tmpadd="1">+ Bônus</button></span>
      </div>
      <div class="bd">
        ${lista.length ? `<div class="tmplist">${lista.map(b => `
          <div class="tmprow ${b.off ? 'off' : ''}" data-tmprow="${esc(b.id)}">
            <label class="tmpon" title="${b.off ? 'Desligado: não está somando' : 'Ligado: está somando'}"><input type="checkbox" data-tmpon="${esc(b.id)}" ${b.off ? '' : 'checked'} aria-label="${esc(b.n || 'Bônus')}: ligado"></label>
            <input class="inm tmpn" data-tmpn="${esc(b.id)}" value="${esc(b.n)}" maxlength="60" placeholder="De onde vem — ex.: Ensopado de javali" aria-label="De onde vem o bônus">
            <select data-tmpk="${esc(b.id)}" aria-label="Onde soma">${optBonus(b.k, b.k ? '' : 'onde soma…')}</select>
            <input type="number" step="1" class="tmpv" data-tmpv="${esc(b.id)}" value="${b.v}" aria-label="Quanto soma">
            <input class="inm tmpd" data-tmpd="${esc(b.id)}" value="${esc(b.d)}" maxlength="40" placeholder="Dura — ex.: 3 turnos" aria-label="Quanto dura (anotação)">
            <button type="button" class="mini danger" data-tmpdel="${esc(b.id)}" title="Tirar este bônus" aria-label="Tirar o bônus ${esc(b.n || '')}">×</button>
          </div>`).join('')}</div>`
        : '<div class="hint">Nenhum bônus temporário. Use para o que passa: +3 de Vitalidade do ensopado, +5 de Agilidade da poção. A duração é só uma anotação — quem desliga é você.</div>'}
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
  const qtdDe = (pc, id) => { const v = pc.estado && pc.estado.qtd ? +pc.estado.qtd[id] : 0; return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0; };
  // o que vai acontecer ao usar, em palavras (só as poções fazem alguma coisa sozinhas)
  const previaDoUso = (pc, c, it) => RR().previaDoUso(pc, c, pc.estado, it);
  function painelBolsa(pc, c) {
    const R = RR(); if (!R) return '';
    const itens = R.bolsa(pc, pc.estado), tipos = BOLSAS();
    const aba = tipos.some(b => b.t === S.abaBolsa) ? S.abaBolsa : 'pocao', tipo = tipos.find(b => b.t === aba);
    const total = t => itens.filter(x => x.t === t).reduce((s, x) => s + x.qtd, 0);
    const daAba = itens.filter(x => x.t === aba), rs = (c.recursos || []).filter(r => !r.err && r.val != null);
    const linha = it => {
      const pocao = it.t === 'pocao', ef = pocao ? R.lerEfeito(it.val) : null, pede = bolsaPede === it.id, previa = pede ? previaDoUso(pc, c, it) : [];
      const sumiu = pocao && it.rec && !rs.some(r => r.id === it.rec);
      return `<div class="bolrow ${it.qtd ? '' : 'sem'}" data-bolrow="${esc(it.id)}">
        <div class="bolcab">
          <input class="inm bolnome" data-bolnome="${esc(it.id)}" value="${esc(it.nome)}" maxlength="60" placeholder="Nome ${pocao ? 'da poção' : 'do item'}" aria-label="Nome">
          <span class="bolqtd" title="Quantas há na bolsa">
            <button type="button" class="step" data-bolstep="${esc(it.id)}" data-d="-1" ${it.qtd <= 0 ? 'disabled' : ''} aria-label="Uma a menos de ${esc(it.nome || 'item')}">−</button>
            <input type="number" min="0" step="1" data-bolqtd="${esc(it.id)}" value="${it.qtd}" aria-label="Quantidade de ${esc(it.nome || 'item')}">
            <button type="button" class="step" data-bolstep="${esc(it.id)}" data-d="1" aria-label="Uma a mais de ${esc(it.nome || 'item')}">+</button>
          </span>
          <button type="button" class="mini primary" data-boluse="${esc(it.id)}" ${it.qtd < 1 ? 'disabled' : ''} title="${it.qtd < 1 ? 'Não há nenhuma na bolsa' : pocao ? 'Gasta uma e aplica o efeito (mostra antes o que vai acontecer)' : 'Gasta uma e avisa a mesa. Nada é aplicado sozinho.'}">Usar</button>
          <button type="button" class="mini danger" data-boldel="${esc(it.id)}" title="Tirar da bolsa" aria-label="Tirar ${esc(it.nome || 'item')} da bolsa">×</button>
        </div>
        ${pede ? `<div class="bolconf" role="group" aria-label="Confirmar o uso">
          <span><strong>Usar ${esc(it.nome || 'a poção')}?</strong> ${esc(previa.join(' · ') || 'Gasta uma unidade.')} · ${it.qtd - 1 === 0 ? 'é a última' : it.qtd - 1 === 1 ? 'sobra 1' : 'sobram ' + (it.qtd - 1)}</span>
          <button type="button" class="mini primary" data-bolsim="${esc(it.id)}">Usar agora</button>
          <button type="button" class="mini" data-bolnao="1">Cancelar</button></div>` : ''}
        ${pocao ? `<div class="bolfx">
          <label class="f"><span class="eyebrow">Mexe na barra</span>
            <select data-bolrec="${esc(it.id)}"><option value="">nenhuma</option>${rs.map(r => `<option value="${esc(r.id)}" ${it.rec === r.id ? 'selected' : ''}>${esc(r.nome || 'Barra')}</option>`).join('')}${sumiu ? '<option value="' + esc(it.rec) + '" selected>(barra que saiu da ficha)</option>' : ''}</select></label>
          <label class="f"><span class="eyebrow">Quanto</span>
            <input class="mono ${ef && ef.erro ? 'ruim' : ''}" data-bolval="${esc(it.id)}" value="${esc(it.val)}" maxlength="30" placeholder="30 ou 2d6+3" autocomplete="off" title="Um valor (30) ou dados (2d6+3). Com − na frente, tira em vez de pôr (−10, −1d6)." ${it.rec ? '' : 'disabled'}></label>
          <label class="f"><span class="eyebrow">Dá bônus em</span>
            <select data-bolbk="${esc(it.id)}">${optBonus(it.bk, 'nenhum')}</select></label>
          <label class="f bolbv"><span class="eyebrow">De</span>
            <input type="number" step="1" data-bolbv="${esc(it.id)}" value="${it.bv || 0}" ${it.bk ? '' : 'disabled'}></label>
          <label class="f"><span class="eyebrow">Dura</span>
            <input class="inm" data-bolbd="${esc(it.id)}" value="${esc(it.bd)}" maxlength="40" placeholder="3 turnos" ${it.bk ? '' : 'disabled'}></label>
        </div>${ef && ef.erro ? `<div class="fmlerr">${esc(ef.erro)}</div>` : ''}` : ''}
        <textarea rows="1" data-bolnota="${esc(it.id)}" maxlength="400" placeholder="${pocao ? 'Outros efeitos, gosto, de onde veio…' : 'O que faz, como se usa…'}" aria-label="Anotação de ${esc(it.nome || 'item')}">${esc(it.nota)}</textarea>
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
        : `<div class="hint">${aba === 'pocao' ? 'Nenhuma poção. Cada poção pode mexer numa barra (um valor fixo ou uma rolagem) e dar um bônus temporário; “Usar” gasta uma, aplica o efeito e avisa a mesa.' : 'Nada aqui ainda. “Usar” gasta uma unidade e avisa a mesa; nada é aplicado sozinho.'}</div>`}
        ${daAba.length ? `<div class="hint" style="margin-top:8px">${aba === 'pocao' ? '“Usar” mostra antes o que vai acontecer; depois de usar, dá para desfazer. Com o token ligado a esta ficha, as bolsas também aparecem na cena.' : '“Usar” gasta uma unidade e avisa a mesa — o efeito é com vocês. Dá para desfazer.'}</div>` : ''}
      </div>
    </div>`;
  }
  /* Usa um item: gasta, aplica (poção), registra na mesa e deixa desfazer. */
  function usarDaBolsa(pc, id) {
    const R = RR(), c = calcular(pc), it = R.bolsa(pc, pc.estado).find(x => x.id === id);
    bolsaPede = null;
    if (!it) { render(); return; }
    const ef = it.t === 'pocao' && it.rec ? R.lerEfeito(it.val) : null;
    let rolado = null, conta = '', dd = [];
    if (ef && ef.dados) { try { const r = rolarExpressao(ef.dados); rolado = r.total; dd = r.dd || []; conta = ef.dados + ' → ' + r.detalhe + ' = ' + r.total; } catch (e) { toast(e.message); render(); return; } }
    const antes = pc.estado || {};
    const u = R.usarItem(pc, c, antes, id, rolado, Date.now(), 't' + uid());
    if (!u.ok) { toast(u.erro); render(); return; }
    pc.estado = u.estado;
    const nome = it.nome || (BOLSAS().find(b => b.t === it.t) || {}).um || 'Item', titulo = pc.nome + ' · ' + nome, texto = R.textoDoUso(u);
    logar({ tipo: 'uso', quem: titulo, pc: pc.id, det: 'usou ' + nome + (conta ? ' · ' + conta : '') + ' · ' + texto, total: u.barra && rolado != null ? rolado : null, dd });
    render();
    aviso(nome + ': ' + texto + '.', 'Desfazer', () => {
      // só o que este uso mexeu volta (o que outra pessoa mudou no personagem nesse meio-tempo fica)
      const qtd = mapaDe(pc, 'qtd'); qtd[it.id] = qtdDe(pc, it.id) + 1;
      if (u.barra) {
        const rec = mapaDe(pc, 'rec'), tinha = antes.rec && antes.rec[u.barra.id] != null;
        if (+rec[u.barra.id] === u.barra.para) { if (tinha) rec[u.barra.id] = antes.rec[u.barra.id]; else delete rec[u.barra.id]; }
        else if (rec[u.barra.id] != null) rec[u.barra.id] = Math.round((+rec[u.barra.id] - (u.barra.para - u.barra.de)) * 10) / 10;
      }
      if (u.bonus) delete mapaDe(pc, 'tmp')[u.bonus.id];
      logar({ tipo: 'uso', quem: titulo, pc: pc.id, det: 'desfeito: ' + nome + ' voltou para a bolsa' + (u.barra ? ' e ' + u.barra.nome + ' voltou ao que era' : '') + (u.bonus ? '; o bônus saiu' : ''), total: null });
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
      const id = 'b' + uid(); lista().push({ id, t: b.dataset.boladd, nome: '' }); mapaDe(pc, 'qtd')[id] = 1;
      redesenhar('[data-bolnome="' + id + '"]');
    });
    const texto = (attr, chave, max) => qa(painel, '[data-' + attr + ']').forEach(i => { i.oninput = () => { const it = item(i.dataset[attr]); if (!it) return; const v = i.value.slice(0, max); if (v) it[chave] = v; else delete it[chave]; save(); if (i.tagName === 'TEXTAREA') altura(i); }; });
    const altura = t => { t.style.height = 'auto'; t.style.height = Math.max(30, t.scrollHeight + 2) + 'px'; };
    texto('bolnome', 'nome', 60); texto('bolnota', 'nota', 400); texto('bolbd', 'bd', 40);
    qa(painel, '[data-bolnota]').forEach(altura);
    qa(painel, '[data-bolval]').forEach(i => { i.oninput = () => { const it = item(i.dataset.bolval); if (!it) return; const v = i.value.trim().slice(0, 30); if (v) it.val = v; else delete it.val; save(); }; i.onchange = () => redesenhar('[data-bolval="' + i.dataset.bolval + '"]'); });
    qa(painel, '[data-bolrec]').forEach(s => s.onchange = () => { const it = item(s.dataset.bolrec); if (!it) return; if (s.value) it.rec = s.value; else delete it.rec; redesenhar('[data-bolrec="' + s.dataset.bolrec + '"]'); });
    qa(painel, '[data-bolbk]').forEach(s => s.onchange = () => { const it = item(s.dataset.bolbk); if (!it) return; if (s.value) it.bk = s.value; else delete it.bk; redesenhar('[data-bolbk="' + s.dataset.bolbk + '"]'); });
    qa(painel, '[data-bolbv]').forEach(i => i.onchange = () => { const it = item(i.dataset.bolbv); if (!it) return; const v = Math.round((+i.value || 0) * 10) / 10; if (v) it.bv = v; else delete it.bv; redesenhar('[data-bolbv="' + i.dataset.bolbv + '"]'); });
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
      if (previaDoUso(pc, c, it).length) { bolsaPede = id; render(); refocar('[data-bolsim="' + id + '"]'); }      // poção com efeito: mostra antes o que vai acontecer
      else usarDaBolsa(pc, id);
    });
    qa(painel, '[data-bolsim]').forEach(b => b.onclick = () => usarDaBolsa(pc, b.dataset.bolsim));
    qa(painel, '[data-bolnao]').forEach(b => b.onclick = () => { const id = bolsaPede; bolsaPede = null; render(); if (id) refocar('[data-boluse="' + id + '"]'); });
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
    ligarIdentidade(host, pc); ligarBarras(host, pc); ligarMaisDoItem(host, pc); ligarTemporarios(host, pc); ligarBolsa(host, pc);
  }

  return {
    aviso, imagemOk, iniciais, miniatura,
    htmlRetrato, ligarRetrato, guardarImagem,
    htmlLapros, ligarLapros, laprosDe, lerLapros,
    htmlEfeitoItem, ligarEfeitos, htmlEfeitosEquipados,
    htmlSobrevida, ligarSobrevida, sobrevidaDe,
    ehLivre, tornarLivre, painelAtributosLivre, htmlBotaoModo, ligarAtributos,
    painelMente, ligarMente, usaMente, valorMente, relsDe, MENTE,
    htmlAbasAtr, abaDefesas, painelDefesas, htmlTemp, htmlOpcoesBarra, htmlMaisDoItem, htmlTotaisExtras,
    painelTemporarios, painelBolsa, htmlIdentidade, ligarNovos, icoDef,
    util: { q, qa, glifo, optBonus, refocar, mapaDe, estadoDe, sinalTxt, menos, comoMestre, desenhar }, aoVivo, desenhar,
  };
})();
