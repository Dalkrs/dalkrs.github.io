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
  function htmlEfeitoItem(it) {
    return `<tr class="itfx ${it.equipado === false ? 'off' : ''}"><td></td><td colspan="${colunasItens()}">
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
      <div class="hd"><span class="eyebrow">Atributos</span>
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
            <td class="num vequip">${c.eq[a.k] ? (c.eq[a.k] > 0 ? '+' : '') + c.eq[a.k] : '—'}</td>
            <td class="num vtot">${c.tot[a.k]}</td>
          </tr>`; }).join('')}
          ${DERIV.map(d => `<tr class="derived">
            <td><span class="aname">${d.nome}</span> <span class="mono" style="color:var(--ink-soft);font-size:11px">${d.k}</span></td>
            <td><span class="mono" style="font-size:10.5px;color:var(--ink-soft)">${d.desc}</span></td>
            <td class="num vbase">${d.calc(c.base)}</td>
            <td class="num vequip">${c.eq[d.k] ? (c.eq[d.k] > 0 ? '+' : '') + c.eq[d.k] : '—'}</td>
            <td class="num vtot">${c.der[d.k]}</td>
          </tr>`).join('')}
          ${DEFESAS.map(d => `<tr class="defesa">
            <td><span class="aname">${d.nome}</span> <span class="mono" style="color:var(--ink-soft);font-size:11px">${d.rot}</span></td>
            <td><span class="mono" style="font-size:10.5px;color:var(--ink-soft)">manual</span></td>
            <td><input type="number" class="defbase" data-defesa="${d.k}" value="${(+((pc.defesas || {})[d.k]) || 0)}"></td>
            <td class="num vequip">${c.eq[d.k] ? (c.eq[d.k] > 0 ? '+' : '') + c.eq[d.k] : '—'}</td>
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
    const mudar = (k, v) => { const c = calcular(pc), pts = pontosDe(pc, c); pts[k] = Math.max(0, inteiro(v)); pc.atrLivre = pts; save(); render(); };
    qa(host, '[data-pts]').forEach(i => i.onchange = () => { const k = i.dataset.pts; mudar(k, i.value); const de = document.querySelector('[data-pts="' + k + '"]'); if (de) de.focus(); });
    qa(host, '[data-ptsstep]').forEach(b => b.onclick = () => {
      const [k, d] = b.dataset.ptsstep.split('|'), c = calcular(pc);
      mudar(k, pontosDe(pc, c)[k] + (+d));
      const de = document.querySelector('[data-ptsstep="' + b.dataset.ptsstep + '"]'); if (de && !de.disabled) de.focus();
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
  const glifo = d => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const valorMente = (pc, k) => { const v = pc.estado && pc.estado[k]; return v != null && v !== '' && Number.isFinite(+v) ? limitar(inteiro(v), 0, 100) : MENTE[k].padrao; };
  const faixaMente = (k, v) => MENTE[k].faixas.find(f => v >= f[0])[1];
  const nivelMente = v => (v >= 50 ? 'bom' : v >= 25 ? 'medio' : 'ruim');
  const faixaRel = v => REL_FAIXAS.find(f => v >= f[0])[1];
  const nivelRel = v => (v >= 20 ? 'bom' : v <= -20 ? 'ruim' : 'medio');
  const relsDe = pc => (pc.estado && Array.isArray(pc.estado.rel) ? pc.estado.rel.filter(e => e && typeof e === 'object' && e.id) : []);
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
  function linhaRel(pc, e) {
    const v = limitar(inteiro(e.v), -100, 100), outro = e.alvo ? S.personagens.find(p => p.id === e.alvo) : null;
    const nome = (outro && outro.nome) || e.nome || 'Sem nome';
    return `<div class="relrow n-${nivelRel(v)}">
      <span class="relnome">${outro ? miniatura(outro) : `<span class="avmini semimg" aria-hidden="true">${esc(iniciais(nome))}</span>`}<span>${esc(nome)}</span></span>
      <div class="relbar" role="img" aria-label="Relacionamento com ${esc(nome)}: ${sinal(v)}, ${faixaRel(v)}"><i style="${v >= 0 ? 'left:50%;width:' + (v / 2) + '%' : 'right:50%;width:' + (-v / 2) + '%'}"></i></div>
      <span class="relval"><input type="number" min="-100" max="100" step="1" data-relval="${esc(e.id)}" value="${v}" aria-label="Relacionamento com ${esc(nome)}, de −100 a 100"></span>
      <span class="relfaixa">${faixaRel(v)}</span>
      <span class="mbts">${passos('data-relstep', esc(e.id))}</span>
      <button type="button" class="mini danger" data-reldel="${esc(e.id)}" title="Tirar este relacionamento" aria-label="Tirar o relacionamento com ${esc(nome)}">×</button>
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
        <div class="relhd"><span class="mnome">${glifo(REL_SVG)} Relacionamentos</span><span class="hint">o que este personagem sente por cada um — de −100 (hostil) a +100 (leal)</span></div>
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
      const antes = { san: est().san, conf: est().conf, rel: est().rel };
      delete est().san; delete est().conf; delete est().rel; guardar();
      aviso('Sanidade, Conforto e Relacionamentos saíram desta ficha.', 'Desfazer', () => { for (const k in antes) if (antes[k] !== undefined) est()[k] = antes[k]; guardar(); });
    });
    qa(painel, '[data-mval]').forEach(i => i.onchange = () => { const k = i.dataset.mval; est()[k] = limitar(inteiro(i.value), 0, 100); guardar('[data-mval="' + k + '"]'); });
    qa(painel, '[data-mstep]').forEach(b => b.onclick = () => { const [k, d] = b.dataset.mstep.split('|'); est()[k] = limitar(valorMente(pc, k) + (+d), 0, 100); guardar('[data-mstep="' + b.dataset.mstep + '"]'); });
    const acha = id => relsDe(pc).find(e => e.id === id);
    qa(painel, '[data-relval]').forEach(i => i.onchange = () => { const e = acha(i.dataset.relval); if (!e) return; e.v = limitar(inteiro(i.value), -100, 100); guardar('[data-relval="' + i.dataset.relval + '"]'); });
    qa(painel, '[data-relstep]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.relstep.split('|'), e = acha(id); if (!e) return; e.v = limitar(inteiro(e.v) + (+d), -100, 100); guardar('[data-relstep="' + b.dataset.relstep + '"]'); });
    qa(painel, '[data-reldel]').forEach(b => b.onclick = () => {
      const lista = relsDe(pc), i = lista.findIndex(e => e.id === b.dataset.reldel); if (i < 0) return;
      const [fora] = lista.splice(i, 1); est().rel = lista; guardar();
      aviso('Relacionamento com ' + (fora.nome || 'o personagem') + ' tirado.', 'Desfazer', () => { const l = relsDe(pc); l.splice(Math.min(i, l.length), 0, fora); est().rel = l; guardar(); });
    });
    const novo = q(painel, '#relNovo');
    if (novo) novo.onchange = () => {
      const v = novo.value; if (!v) return;
      let entrada = null;
      if (v === '__nome__') { const n = (prompt('Relacionamento com quem? (um nome)', '') || '').trim(); if (n) entrada = { id: uid(), alvo: null, nome: n.slice(0, 80), v: 0 }; }
      else { const p = S.personagens.find(x => x.id === v); if (p) entrada = { id: uid(), alvo: p.id, nome: p.nome, v: 0 }; }
      if (!entrada) { novo.value = ''; return; }
      est().rel = relsDe(pc).concat([entrada]);
      if (est().san == null) est().san = valorMente(pc, 'san');          // a ficha passa a usar o painel de vez
      guardar('[data-relval="' + entrada.id + '"]');
    };
  }

  return {
    aviso, imagemOk, iniciais, miniatura,
    htmlRetrato, ligarRetrato, guardarImagem,
    htmlLapros, ligarLapros, laprosDe, lerLapros,
    htmlEfeitoItem, ligarEfeitos, htmlEfeitosEquipados,
    htmlSobrevida, ligarSobrevida, sobrevidaDe,
    ehLivre, tornarLivre, painelAtributosLivre, htmlBotaoModo, ligarAtributos,
    painelMente, ligarMente, usaMente, valorMente, relsDe, MENTE,
  };
})();
