/* (lote 43) A lista das skills aprendidas, na aba Skills da ficha (o guia de ícones de 30/10): uma linha por skill —
   o ícone do papel num quadrado (a marca de tempo no canto), o nome, o texto em uma linha e a árvore; à direita, as
   etiquetas da barra (▼ 2 Geada) e a estrela. Tocar na linha abre o texto inteiro (o grau, as contas no número do
   personagem, o bônus, o custo de uso); "Abrir todas" abre ou fecha todas. Ao trocar de ficha, voltam fechadas.
   As favoritas (skills.fav, na ficha: valem em qualquer aparelho) ficam no topo, na ordem que o jogador escolher
   (arrastando a alça, ou Alt e as setas). Quem pode mexer na ficha marca; quem só olha vê as estrelas.
   As contas (papel, tempo, etiquetas) ficam em tc/rules.js; os desenhos, em tc/icones.js. Usa as funções da página
   (habsDaArvore, unicasDaFicha, contasDe, htmlComContas, textoComContas, htmlCustoUso, grausDe, usoArv, BIBX,
   skillsDe, save, renderFicha, FichasMesa, FichasExtras). */
window.FichasSkLista = (() => {
  const R = () => (window.TC && TC.rules) || null;
  const I = () => (window.TC && TC.icones) || null;
  const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ALCA = '<svg viewBox="0 0 8 12" aria-hidden="true">' + [2, 6, 10].map(y => `<circle cx="2" cy="${y}" r="1.15"/><circle cx="6" cy="${y}" r="1.15"/>`).join('') + '</svg>';
  // as linhas abertas, só desta ficha (trocar de ficha fecha todas)
  let doPc = null, abertas = new Set();
  function abertasDe(pc) { if (doPc !== pc.id) { doPc = pc.id; abertas = new Set(); } return abertas; }
  // (FichasMesa e FichasExtras são const da página: não ficam em window)
  const temMesa = () => typeof FichasMesa !== 'undefined' && FichasMesa.ativo && FichasMesa.ativo();
  const podeMexer = pc => !temMesa() || FichasMesa.podeEditar(pc);
  const favDe = pc => (R() && R().favDe ? R().favDe(pc && pc.skills) : []);
  const somaBonus = (n, grau) => grausDe(n).slice(0, grau).reduce((o, g) => { Object.entries((g && g.bonus) || {}).forEach(([x, v]) => { o[x] = (o[x] || 0) + (+v || 0); }); return o; }, {});

  /* Tudo o que a lista mostra: [{ key ("id" do nó; "u:" + id da única), tipo ('arv' | 'unica'), nome, papel, tempo,
     etq (as etiquetas da barra), fav, … }], com as favoritas primeiro (na ordem delas) e o resto como vinha (as da
     árvore, na ordem das árvores; depois as únicas). */
  function itens(pc) {
    const r = R(), k = (typeof contasDe === 'function') ? contasDe(pc) : null, usosBib = ((typeof BIBX === 'function' && BIBX()) || {}).usos, out = [];
    const linhas = (typeof habsDaArvore === 'function') ? habsDaArvore(pc) : [];
    for (const { n, grau, arvore, texto, uso } of linhas) {
      let etq = [];
      try { etq = r ? r.etiquetasDaBarra(n, { grau: grau - 1, uso: uso || null, barra: r.barraDasEtiquetas(arvore), vars: k && k.vars, cfg: k && k.cfg }) : []; } catch (e) { etq = []; }
      out.push({ key: n.id, tipo: 'arv', n, grau, gs: grausDe(n).length, arvore, texto: texto || '', uso: uso || null, nome: n.nome || '(sem nome)', desc: n.desc || '', cor: n.cor || '',
        usos: n.usos || [], bonus: somaBonus(n, grau), papel: r ? r.papelDe(n) : null, tempo: r ? r.tempoDe(n.usos, usosBib) : null, etq });
    }
    const unicas = (typeof unicasDaFicha === 'function') ? unicasDaFicha(pc) : [];
    for (const u of unicas) {
      let etq = [];
      try { etq = r ? r.etiquetasDaBarra({ graus: [{ uso: u.uso || null }], barraEfeito: u.barraEfeito }, { vars: k && k.vars, cfg: k && k.cfg }) : []; } catch (e) { etq = []; }
      out.push({ key: 'u:' + u.id, tipo: 'unica', u, grau: 1, gs: 1, texto: '', uso: u.uso || null, nome: u.nome, desc: u.desc || '', cor: '',
        usos: u.usos || [], bonus: u.bonus || null, papel: r ? r.papelDe(u) : null, tempo: r ? r.tempoDe(u.usos, usosBib) : null, etq });
    }
    const f = favDe(pc), pos = new Map(f.map((x, i) => [x, i]));
    out.forEach((it, i) => { it.fav = pos.has(it.key); it.i = i; });
    return out.sort((a, b) => (a.fav === b.fav ? (a.fav ? pos.get(a.key) - pos.get(b.key) : a.i - b.i) : (a.fav ? -1 : 1)));
  }

  const idCorpo = key => 'sklc-' + String(key).replace(/[^A-Za-z0-9_-]/g, '_');
  function linha(pc, it, k, ed, nFav) {
    const r = R(), ic = I(), ab = abertasDe(pc).has(it.key);
    const fala = r ? r.textoDosIcones(it.papel, it.tempo, it.etq) : '';
    const sel = it.tipo === 'arv' ? `data-habarv="${escH(it.n.id)}"` : `data-habunica="${escH(it.u.id)}"`;
    const resumo = String(textoComContas(it.desc || it.texto || '', k) || '').replace(/\s+/g, ' ').trim();
    const nomesUso = (it.usos || []).map(x => (typeof usoArv === 'function' ? usoArv(x) : null)).filter(Boolean).map(x => x.nome);
    const b = it.bonus && Object.keys(it.bonus).length ? textoDoBonus(it.bonus) : '';
    const custo = it.uso ? htmlCustoUso(it.uso, k) : '';
    const estrela = ic ? ic.svg('estrela') : '★';
    const fav = ed ? `<button type="button" class="skl-fav${it.fav ? ' on' : ''}" data-skfav="${escH(it.key)}" aria-pressed="${it.fav}" title="${it.fav ? 'Favorita: tocar tira das favoritas' : 'Favoritar: a skill fica no topo'}" aria-label="${it.fav ? 'Favorita' : 'Favoritar'}: ${escH(it.nome)}">${estrela}</button>`
      : it.fav ? `<span class="skl-fav on fixa" role="img" title="Favorita" aria-label="Favorita">${estrela}</span>` : '';
    const alca = ed && it.fav && nFav > 1 ? `<span class="skl-alca" tabindex="0" role="button" data-skalca="${escH(it.key)}" title="Arraste para mudar a ordem das favoritas" aria-label="Mudar a ordem de ${escH(it.nome)}: arraste, ou Alt e as setas">${ALCA}</span>` : '';
    return `<div class="skl${it.fav ? ' fav' : ''}${it.tipo === 'unica' ? ' unica' : ''}${ab ? ' aberta' : ''}" ${sel} data-skkey="${escH(it.key)}"${it.cor ? ` style="--skcor:${escH(it.cor)}"` : ''}>
      <button type="button" class="skl-linha" data-sklabrir="${escH(it.key)}" aria-expanded="${ab}" aria-controls="${idCorpo(it.key)}">
        ${ic ? ic.quadro(it.papel, it.tempo, fala) : ''}
        <span class="skl-meio">
          <span class="skl-nome" data-sem-tags>${escH(it.nome)}${it.gs > 1 ? `<span class="mono habgrau">grau ${it.grau}/${it.gs}</span>` : ''}</span>
          ${resumo ? `<span class="skl-desc">${escH(resumo)}</span>` : ''}
          <span class="skl-de">${it.tipo === 'arv' ? escH(it.arvore.nome) : 'Skill única'}</span>
        </span>
      </button>
      <span class="skl-dir">${ic ? ic.etiquetas(it.etq) : ''}${fav}${alca}</span>
      <div class="skl-corpo" id="${idCorpo(it.key)}"${ab ? '' : ' hidden'}>
        ${nomesUso.length || it.papel ? `<div class="skl-tags">${escH([it.papel && r ? r.papelInfo(it.papel).nome : ''].concat(nomesUso).filter(Boolean).join(' · '))}</div>` : ''}
        ${(it.texto || it.desc) ? `<div class="habtexto">${it.texto ? `<strong>${htmlComContas(it.texto, k)}</strong>${it.desc ? ' · ' : ''}` : ''}${htmlComContas(it.desc || '', k)}</div>` : ''}
        ${b ? `<div class="habcusto skbonus">Na ficha: ${escH(b)}</div>` : ''}
        ${custo ? `<div class="habcusto">Custo de uso: ${custo}</div>` : ''}
      </div>
    </div>`;
  }
  function html(pc) {
    const its = itens(pc);
    if (!its.length) return '';
    const k = (typeof contasDe === 'function') ? contasDe(pc) : null, ed = podeMexer(pc), nFav = its.filter(x => x.fav).length;
    return `<div class="skl-lista" id="habsDaArvore">${its.map(it => linha(pc, it, k, ed, nFav)).join('')}</div>`;
  }
  // o botão do cabeçalho "Aprendidas"
  function botaoAbrir(pc) {
    if (!itens(pc).length) return '';
    return `<button type="button" class="mini" data-sklabrirtodas="1">${todasAbertas(pc) ? 'Fechar todas' : 'Abrir todas'}</button>`;
  }
  function todasAbertas(pc) { const its = itens(pc), ab = abertasDe(pc); return its.length > 0 && its.every(it => ab.has(it.key)); }

  function abrir(host, pc, key, sim) {
    const ab = abertasDe(pc);
    if (sim) ab.add(key); else ab.delete(key);
    const row = host.querySelector('.skl[data-skkey="' + CSS.escape(key) + '"]'); if (!row) return;
    row.classList.toggle('aberta', !!sim);
    const bt = row.querySelector('.skl-linha'), c = row.querySelector('.skl-corpo');
    if (bt) bt.setAttribute('aria-expanded', String(!!sim));
    if (c) c.hidden = !sim;
  }
  function pintarBotao(host, pc) { const b = host.querySelector('[data-sklabrirtodas]'); if (b) b.textContent = todasAbertas(pc) ? 'Fechar todas' : 'Abrir todas'; }

  // a ordem nova das favoritas que aparecem; as que não aparecem agora (uma skill solta) continuam guardadas, no fim
  const comAsOutras = (pc, ordem) => ordem.concat(favDe(pc).filter(x => !ordem.includes(x)));
  // grava as favoritas (a lista inteira), com Desfazer
  function gravarFav(pc, lista, aviso) {
    const sk = skillsDe(pc), antes = favDe(pc);
    if (JSON.stringify(lista) === JSON.stringify(antes)) return;
    if (lista.length) sk.fav = lista; else delete sk.fav;
    save(); renderFicha();
    if (aviso && typeof FichasExtras !== 'undefined' && FichasExtras.aviso) FichasExtras.aviso(aviso, 'Desfazer', () => { const s2 = skillsDe(pc); if (antes.length) s2.fav = antes; else delete s2.fav; save(); renderFicha(); }, 7000);
  }
  function alternarFav(pc, key) {
    const f = favDe(pc), it = itens(pc).find(x => x.key === key), nome = it ? it.nome : 'A skill';
    if (f.includes(key)) gravarFav(pc, f.filter(x => x !== key), '“' + nome + '” saiu das favoritas.');
    else {
      // (a nova favorita entra no fim das favoritas que aparecem)
      const vis = itens(pc).filter(x => x.fav).map(x => x.key);
      gravarFav(pc, vis.concat([key]).concat(f.filter(x => !vis.includes(x))), '“' + nome + '” é favorita: fica no topo.');
    }
  }
  const focar = (key, sel) => setTimeout(() => { const el = document.querySelector('.skl[data-skkey="' + CSS.escape(key) + '"] ' + sel); if (el) el.focus(); }, 0);

  function ligar(host, pc) {
    const lista = host.querySelector('.skl-lista');
    host.querySelectorAll('[data-sklabrir]').forEach(b => b.onclick = () => { const k = b.dataset.sklabrir; abrir(host, pc, k, !abertasDe(pc).has(k)); pintarBotao(host, pc); });
    host.querySelectorAll('[data-sklabrirtodas]').forEach(b => b.onclick = () => {
      const todas = todasAbertas(pc);
      itens(pc).forEach(it => abrir(host, pc, it.key, !todas));
      pintarBotao(host, pc);
    });
    host.querySelectorAll('[data-skfav]').forEach(b => b.onclick = () => { const k = b.dataset.skfav; if (!podeMexer(pc)) return; alternarFav(pc, k); focar(k, '[data-skfav]'); });
    if (!lista || !podeMexer(pc)) return;
    // a ordem das favoritas: arrastar a alça (o mouse e o dedo) ou Alt e as setas
    host.querySelectorAll('[data-skalca]').forEach(h => {
      h.onkeydown = e => {
        if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
        e.preventDefault();
        const vis = itens(pc).filter(x => x.fav).map(x => x.key), k = h.dataset.skalca, i = vis.indexOf(k), j = i + (e.key === 'ArrowUp' ? -1 : 1);
        if (i < 0 || j < 0 || j >= vis.length) return;
        vis.splice(i, 1); vis.splice(j, 0, k);
        gravarFav(pc, comAsOutras(pc, vis), null); focar(k, '[data-skalca]');
      };
      h.onpointerdown = e => {
        if (e.button !== 0) return;
        const row = h.closest('.skl'); if (!row) return;
        e.preventDefault();
        // (o ponteiro é seguido na janela: a linha muda de lugar no meio do caminho, e isso solta a captura do elemento)
        const ordem0 = [...lista.querySelectorAll('.skl.fav')].map(x => x.dataset.skkey);
        row.classList.add('arrastando');
        const mover = ev => {
          const outras = [...lista.querySelectorAll('.skl.fav')].filter(x => x !== row && !x.hidden);
          const antes = outras.find(o => { const r = o.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
          if (antes) { if (row.nextElementSibling !== antes) lista.insertBefore(row, antes); }
          else if (outras.length) { const ult = outras[outras.length - 1]; if (ult.nextElementSibling !== row) ult.after(row); }
        };
        const fim = () => {
          window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', fim); window.removeEventListener('pointercancel', fim);
          row.classList.remove('arrastando');
          const nova = [...lista.querySelectorAll('.skl.fav')].map(x => x.dataset.skkey);
          if (JSON.stringify(nova) === JSON.stringify(ordem0)) return;
          const it = itens(pc).find(x => x.key === row.dataset.skkey);
          gravarFav(pc, comAsOutras(pc, nova), 'A ordem das favoritas mudou' + (it ? ' (“' + it.nome + '”)' : '') + '.');
          focar(row.dataset.skkey, '[data-skalca]');
        };
        window.addEventListener('pointermove', mover); window.addEventListener('pointerup', fim); window.addEventListener('pointercancel', fim);
      };
    });
  }
  return { html, ligar, itens, botaoAbrir, favDe, podeMexer };
})();
