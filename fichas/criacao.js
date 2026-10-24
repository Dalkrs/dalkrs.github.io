/* Tiny Cats · Fichas: a criação de personagem (lote 26).
   · O mestre dá uma ficha a um jogador (no menu da mesa, "Ficha…"): as Fichas abrem com o pedido ({ darFicha }),
     o mestre escolhe o level e as raças e classes que valem, e a ficha nasce do jogador, em branco, com a criação
     pendente (ficha.criacao). Os pontos das árvores (o padrão de cada tipo de ponto) já vão com ela: quem dá ponto é o
     mestre.
   · O jogador recebe um aviso (na casca, com som) e cria o personagem passo a passo: a raça, a sub-raça (quando a
     família tem mais de uma), a classe, o nome e a foto, os atributos (os pontos do level, no mínimo 1 em cada) e as
     habilidades (os pontos iniciais nas árvores da raça e da classe). Ao terminar, a ficha fica marcada para o mestre
     conferir ("Nova · conferir", na lista e no alto da ficha).
   · "Criar background" ({ fundo }): o mestre cria os NPCs da história de um jogador — família, companheiros e o
     pessoal do toldo — num passo a passo mais curto. Eles vão para um grupo com o nome do jogador, ficam à vista dos
     jogadores (o jogador vê, não controla) e entram sozinhos no acampamento (ficha.fundo).
   As raças se agrupam pela família como na Oficina: a primeira palavra do nome, ou a Família da árvore; o resto do
   nome é a sub-raça. */
const FichasCriacao = (() => {
  'use strict';
  const ATR = [
    ['FOR', 'Força', 'golpes e carregar peso'], ['DES', 'Destreza', 'mira, precisão e Percepção'], ['VIT', 'Vitalidade', 'Vida e resistência'],
    ['CAN', 'Canalização Mágica', 'magia e SP'], ['AGI', 'Agilidade', 'Esquiva e Furtividade'],
  ];
  const TIERS = ['S', 'A', 'B', 'C', 'D', 'E'];
  const e = s => esc(s);
  const norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const bib = () => (S.bib && Array.isArray(S.bib.arvores) ? S.bib : { arvores: [], pools: [] });
  const pools = () => (Array.isArray(bib().pools) ? bib().pools : []);
  const arvorePorId = id => bib().arvores.find(a => a.id === id) || null;
  const pendente = pc => !!(pc && pc.criacao && pc.criacao.pendente);
  const paraConferir = pc => !!(pc && pc.criacao && pc.criacao.conferir);

  /* ---------- as árvores: famílias, sub-raças e o texto da raiz ---------- */
  function caminho(a) {
    const nome = String(a.nome || '').trim();
    let fam = String(a.familia || '').trim(), resto;
    if (fam) resto = norm(nome).startsWith(norm(fam)) ? nome.slice(fam.length).replace(/^[\s\-–·:]+/, '') : nome;
    else { const m = nome.match(/^(\S+)\s+(.+)$/); fam = m ? m[1] : nome; resto = m ? m[2] : ''; }
    return { fam, resto };
  }
  function familias(lista) {
    const m = new Map();
    for (const a of lista) {
      const c = caminho(a), k = norm(c.fam);
      if (!m.has(k)) m.set(k, { k, nome: c.fam, arvores: [] });
      m.get(k).arvores.push({ a, rotulo: c.resto && !/^[a-zà-ú]/.test(c.resto) ? c.resto : a.nome });
    }
    return [...m.values()].sort((x, y) => x.nome.localeCompare(y.nome, 'pt'));
  }
  const ehRaiz = (a, n) => !(n.pais || []).some(p => a.nodes.some(m => m.id === p));
  const raizDe = a => (a && a.nodes || []).find(n => ehRaiz(a, n)) || null;
  function textoDe(a, max) {
    const r = raizDe(a), t = String(r && r.desc || '').split(/\n\s*\n/)[0].trim();
    return max && t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t;
  }
  const valem = (cat, ids) => bib().arvores.filter(a => a.categoria === cat && !a.secreta && (!ids || !ids.length || ids.includes(a.id)));

  /* ---------- as habilidades (as regras de alocação da Árvore) ---------- */
  function indice(ids) {
    const porId = new Map(), arvDe = new Map();
    for (const id of ids) { const a = arvorePorId(id); if (a) for (const n of a.nodes) { porId.set(n.id, n); arvDe.set(n.id, a); } }
    return { porId, arvDe };
  }
  function gasto(ix, aloc, poolId) {
    let s = 0;
    for (const id in aloc) { const n = ix.porId.get(id); if (!n) continue; const g = Math.min(aloc[id], n.graus.length); for (let k = 0; k < g; k++) s += (n.graus[k].custos || {})[poolId] || 0; }
    return s;
  }
  const satisfeito = (n, aloc) => !(n.pais || []).length || (n.regra === 'ou' ? n.pais.some(x => aloc[x] > 0) : n.pais.every(x => aloc[x] > 0));
  const custoDo = (n, k) => (n.graus[k - 1] && n.graus[k - 1].custos) || {};
  function exclusivoFechado(ix, aloc, n) {
    const g = norm(n.exclusivo); if (!g) return null;
    for (const id in aloc) { if (id === n.id || !(aloc[id] > 0)) continue; const m = ix.porId.get(id); if (m && norm(m.exclusivo) === g) return m; }
    return null;
  }
  function podeComprar(ix, w, n) {
    const k = (w.aloc[n.id] || 0) + 1;
    if (k > n.graus.length) return 'Já está no grau máximo.';
    if (!satisfeito(n, w.aloc)) return 'Antes, escolha o que vem antes dela.';
    const ex = exclusivoFechado(ix, w.aloc, n); if (ex) return 'Não combina com ' + ex.nome + '.';
    const c = custoDo(n, k), falta = pools().filter(p => (c[p.id] || 0) > (w.pontos[p.id] || 0) - gasto(ix, w.aloc, p.id));
    return falta.length ? 'Faltam pontos de ' + falta.map(p => p.nome).join(', ') + '.' : '';
  }
  function podeTirar(ix, w, n) {
    const g = w.aloc[n.id] || 0;
    if (!g) return 'Não está escolhida.';
    if (g > 1) return '';
    if (ehRaiz(ix.arvDe.get(n.id), n)) return 'É o começo da árvore.';
    const sem = Object.assign({}, w.aloc); delete sem[n.id];
    const dep = [...ix.porId.values()].find(m => sem[m.id] > 0 && (m.pais || []).includes(n.id) && !satisfeito(m, sem));
    return dep ? 'Antes, tire ' + dep.nome + '.' : '';
  }
  const custoTxt = c => { const t = pools().filter(p => c[p.id] > 0).map(p => c[p.id] + ' de ' + p.nome); return t.length ? t.join(' · ') : 'de graça'; };

  /* ---------- a janela ---------- */
  let w = null, veu = null;
  function fechar() { if (veu) veu.remove(); veu = null; w = null; document.removeEventListener('keydown', tecla, true); }
  function tecla(ev) {
    if (!w) return;
    if (ev.key === 'Escape' && !ev.defaultPrevented) { ev.preventDefault(); ev.stopPropagation(); pedirFechar(); }
  }
  function pedirFechar() {
    if (w && w.mexeu && !confirm(w.modo === 'fundo' ? 'Fechar sem criar este NPC?' : 'Fechar a criação? O que você escolheu até aqui não fica guardado.')) return;
    fechar();
  }
  function passos() {
    const p = ['raca'];
    const f = w.fam && familias(valem('raca', w.racas)).find(x => x.k === w.fam);
    if (!f || f.arvores.length > 1) p.push('sub');
    if (w.modo === 'fundo') p.push('papel', 'nome', 'fim');
    else p.push('classe', 'nome', 'atr', 'skills', 'fim');
    return p;
  }
  const NOMES = { raca: 'Raça', sub: 'Sub-raça', classe: 'Classe', papel: 'Papel', nome: 'Nome e foto', atr: 'Atributos', skills: 'Habilidades', fim: 'Pronto' };
  function pronto(passo) {
    if (passo === 'raca') return w.fam ? '' : 'Escolha uma raça.';
    if (passo === 'sub') return w.raca ? '' : 'Escolha a sub-raça.';
    if (passo === 'classe') return w.classe ? '' : 'Escolha uma classe.';
    if (passo === 'papel') return w.papel ? (w.papel === 'familia' || w.principal ? '' : w.papel === 'toldo' ? 'Escolha a profissão.' : 'Escolha a classe.') : 'Escolha o papel na história.';
    if (passo === 'nome') return String(w.nome || '').trim() ? '' : 'Dê um nome.';
    if (passo === 'atr') { const r = restoAtr(); return r > 0 ? 'Ainda faltam ' + r + ' pontos para distribuir.' : r < 0 ? 'Passou ' + (-r) + ' pontos do total.' : ''; }
    return '';
  }
  const totalAtr = () => ptsDoLevel(w.level);
  const restoAtr = () => totalAtr() - ATR.reduce((s, [k]) => s + (+w.atr[k] || 0), 0);

  function pintar() {
    if (!w || !veu) return;
    const ps = passos(), i = Math.max(0, ps.indexOf(w.passo)), passo = ps[i], falta = pronto(passo);
    const titulo = w.modo === 'fundo' ? 'Background de ' + e(w.jogadorNome) + ' · NPC ' + (w.feitos + 1) : 'Criar personagem';
    veu.querySelector('.cria-caixa').innerHTML = `
      <header class="cria-topo"><h2>${titulo}</h2>${w.modo === 'fundo' && FichasMesa.campanhas().length ? `<label class="cria-camp">Campanha
        <select data-cr-camp aria-label="Campanha do background">${FichasMesa.campanhas().filter(c => !c.encerrada || c.id === w.camp).map(c => `<option value="${e(c.id)}" ${c.id === w.camp ? 'selected' : ''}>${e(c.nome)}</option>`).join('')}
          <option value="" ${!w.camp ? 'selected' : ''}>Do mundo (sem campanha)</option></select></label>` : ''}<button type="button" class="ghost" data-cr="fechar" aria-label="Fechar" title="Fechar (Esc)">✕</button></header>
      <ol class="cria-passos">${ps.map((p, j) => `<li class="${j < i ? 'feito' : j === i ? 'agora' : ''}"><span>${j + 1}</span>${NOMES[p]}</li>`).join('')}</ol>
      <div class="cria-corpo" data-passo="${passo}">${corpo(passo)}</div>
      <footer class="cria-pe">
        ${i > 0 ? '<button type="button" data-cr="voltar">← Voltar</button>' : '<span></span>'}
        <span class="cria-falta" role="status">${falta ? e(falta) : ''}</span>
        ${passo === 'fim'
          ? (w.modo === 'fundo' ? '<button type="button" data-cr="outro">Criar e fazer outro</button><button type="button" class="primary" data-cr="criar">Criar e fechar</button>' : '<button type="button" class="primary" data-cr="criar">Criar personagem</button>')
          : `<button type="button" class="primary" data-cr="proximo" ${falta ? 'aria-disabled="true"' : ''}>Próximo →</button>`}
      </footer>`;
    ligar(passo);
  }
  function irPasso(d) {
    const ps = passos(), i = ps.indexOf(w.passo);
    if (d > 0 && pronto(w.passo)) return;
    w.passo = ps[Math.min(ps.length - 1, Math.max(0, i + d))];
    pintar();
    const c = veu && veu.querySelector('.cria-corpo'); if (c) c.scrollTop = 0;
    const f = veu && veu.querySelector('[data-foco]'); if (f) f.focus();
  }

  function cartao(attrs, titulo, sub, texto, on) {
    return `<button type="button" class="cria-card${on ? ' on' : ''}" ${attrs} aria-pressed="${!!on}"><b>${e(titulo)}</b>${sub ? `<small>${e(sub)}</small>` : ''}${texto ? `<span class="cria-txt">${e(texto)}</span>` : ''}</button>`;
  }
  function detalhe(a) {
    if (!a) return '';
    const r = raizDe(a), t = String(r && r.desc || '').trim();
    return `<div class="cria-detalhe"><h3>${e(a.nome)}</h3>${r && r.nome ? `<p class="cria-raiz">${e(r.nome)}</p>` : ''}${t.split(/\n\s*\n/).map(p => `<p>${e(p)}</p>`).join('')}</div>`;
  }
  function corpo(passo) {
    if (passo === 'raca') {
      const fs = familias(valem('raca', w.racas));
      if (!fs.length) return '<p class="cria-vazio">Nenhuma raça disponível. Fale com o mestre.</p>';
      return `<p class="cria-dica">${w.modo === 'fundo' ? 'De que povo é este NPC?' : 'De que povo é o seu personagem?'} Escolha a raça; depois vem a sub-raça.</p>
        <div class="cria-grade">${fs.map(f => cartao(`data-fam="${e(f.k)}"`, f.nome, f.arvores.length > 1 ? f.arvores.length + ' sub-raças: ' + f.arvores.map(x => x.rotulo).join(', ') : '', f.arvores.length === 1 ? textoDe(f.arvores[0].a, 180) : '', w.fam === f.k)).join('')}</div>
        ${w.fam && familias(valem('raca', w.racas)).find(f => f.k === w.fam).arvores.length === 1 ? detalhe(arvorePorId(w.raca)) : ''}`;
    }
    if (passo === 'sub') {
      const f = familias(valem('raca', w.racas)).find(x => x.k === w.fam);
      return `<p class="cria-dica">Qual sub-raça de ${e(f ? f.nome : '')}? Clique para ler sobre ela.</p>
        <div class="cria-grade">${(f ? f.arvores : []).map(x => cartao(`data-raca="${e(x.a.id)}"`, x.rotulo, '', textoDe(x.a, 140), w.raca === x.a.id)).join('')}</div>${detalhe(arvorePorId(w.raca))}`;
    }
    if (passo === 'classe') {
      const cs = valem('classe', w.classes).sort((x, y) => x.nome.localeCompare(y.nome, 'pt'));
      if (!cs.length) return '<p class="cria-vazio">Nenhuma classe disponível. Fale com o mestre.</p>';
      return `<p class="cria-dica">Como o seu personagem luta? Clique numa classe para ler sobre ela.</p>
        <div class="cria-grade">${cs.map(a => cartao(`data-classe="${e(a.id)}"`, a.nome, '', textoDe(a, 140), w.classe === a.id)).join('')}</div>${detalhe(arvorePorId(w.classe))}`;
    }
    if (passo === 'papel') {
      const P = [['familia', 'Família', 'Pais, irmãos, filhos… Ficam no acampamento.'], ['companheiro', 'Companheiro', 'Luta junto com o grupo: tem uma classe.'], ['toldo', 'Toldo', 'Trabalha no acampamento e não luta: tem uma profissão.']];
      const cat = w.papel === 'companheiro' ? 'classe' : 'profissao', lista = w.papel ? valem(cat).sort((x, y) => x.nome.localeCompare(y.nome, 'pt')) : [];
      return `<p class="cria-dica">Quem é este NPC na história de ${e(w.jogadorNome)}?</p>
        <div class="cria-grade tres">${P.map(([k, n, t]) => cartao(`data-papel="${k}"`, n, '', t, w.papel === k)).join('')}</div>
        ${w.papel ? `<h3 class="cria-sub">${w.papel === 'companheiro' ? 'A classe' : w.papel === 'toldo' ? 'A profissão' : 'Uma profissão (se tiver)'}</h3>
          ${lista.length ? `<div class="cria-chips">${w.papel === 'familia' ? `<button type="button" class="cria-chip${!w.principal ? ' on' : ''}" data-principal="">Nenhuma</button>` : ''}${lista.map(a => `<button type="button" class="cria-chip${w.principal === a.id ? ' on' : ''}" data-principal="${e(a.id)}">${e(a.nome)}</button>`).join('')}</div>`
            : `<p class="cria-vazio">${cat === 'profissao' ? 'Ainda não há árvores de Profissão. Na Oficina, "Selecionar árvore" › Profissões traz as prontas.' : 'Nenhuma classe.'}</p>`}` : ''}`;
    }
    if (passo === 'nome') {
      const tem = FichasExtras.imagemOk(w.img);
      return `<div class="cria-nome">
        <div class="cria-foto"><button type="button" class="cria-quadro" data-cr="foto" title="Pôr uma imagem">${tem ? `<img src="${e(w.img)}" alt="">` : '<span>+ foto</span>'}</button>
          <input type="file" id="criaFoto" accept="image/png,image/jpeg,image/webp" hidden>${tem ? '<button type="button" class="mini danger" data-cr="semfoto">Tirar a foto</button>' : '<small>opcional</small>'}</div>
        <div class="cria-campos">
          <label class="f"><span class="eyebrow">Nome</span><input id="criaNome" data-foco maxlength="80" value="${e(w.nome || '')}" placeholder="${w.modo === 'fundo' ? 'Ex.: Mira, a irmã mais velha' : 'Como o seu personagem se chama?'}" autocomplete="off"></label>
          ${w.modo === 'fundo' ? `
          <label class="f"><span class="eyebrow">Relação com o personagem de ${e(w.jogadorNome)}</span><input id="criaRel" maxlength="120" value="${e(w.relacao || '')}" placeholder="Ex.: irmã mais velha, mentor, a cozinheira da família"></label>
          <div class="f"><span class="eyebrow">Tier</span><div class="cria-chips">${TIERS.map(t => `<button type="button" class="cria-chip${w.tier === t ? ' on' : ''}" data-tier="${t}">${t}</button>`).join('')}</div></div>
          <label class="f cria-lvl"><span class="eyebrow">Level</span><input id="criaLvl" type="number" min="1" max="50" value="${w.level}"></label>` : ''}
        </div></div>`;
    }
    if (passo === 'atr') {
      const r = restoAtr();
      return `<p class="cria-dica">Você tem <b>${totalAtr()}</b> pontos (level ${w.level}). Cada atributo começa em 1; ponha os outros onde quiser.</p>
        <div class="cria-sobra ${r === 0 ? 'ok' : r < 0 ? 'passou' : ''}">Faltam <b id="criaResto">${r}</b> pontos</div>
        <div class="cria-atrs">${ATR.map(([k, n, d]) => `<div class="cria-atr c-${k.toLowerCase()}"><div><b>${n}</b><small>${d}</small></div>
          <button type="button" data-atr="${k}" data-d="-5" title="5 a menos">−5</button><button type="button" data-atr="${k}" data-d="-1" aria-label="${n}: 1 a menos">−</button>
          <input type="number" min="1" data-atrv="${k}" value="${w.atr[k]}" aria-label="${n}">
          <button type="button" data-atr="${k}" data-d="1" aria-label="${n}: 1 a mais">+</button><button type="button" data-atr="${k}" data-d="5" title="5 a mais">+5</button></div>`).join('')}</div>
        <div class="cria-linha"><button type="button" data-cr="igual">Dividir igual</button><button type="button" data-cr="zerar">Recomeçar</button></div>`;
    }
    if (passo === 'skills') {
      const ids = [w.raca, w.classe], ix = indice(ids);
      const usados = pools().filter(p => ids.some(id => { const a = arvorePorId(id); return a && a.nodes.some(n => n.graus.some(g => (g.custos || {})[p.id] > 0)); }));
      const blocos = ids.map(arvorePorId).filter(Boolean).map(a => {
        const nos = a.nodes.filter(n => !ehRaiz(a, n) && ((w.aloc[n.id] || 0) > 0 || (satisfeito(n, w.aloc) && !exclusivoFechado(ix, w.aloc, n))));
        const linha = n => {
          const g = w.aloc[n.id] || 0, k = g + 1, maisNao = podeComprar(ix, w, n), menosNao = podeTirar(ix, w, n);
          return `<li class="cria-no${g ? ' on' : ''}"><details><summary><b>${e(n.nome)}</b>${n.graus.length > 1 ? `<small>grau ${g} de ${n.graus.length}</small>` : ''}<small class="cria-custo">${k <= n.graus.length ? 'próximo: ' + custoTxt(custoDo(n, k)) : 'completo'}</small></summary>
            <p>${e(n.desc || '')}</p>${n.graus.some(x => x.texto) ? `<ol class="cria-graus">${n.graus.map((x, j) => `<li class="${j < g ? 'tem' : ''}">${e(x.texto || '—')}</li>`).join('')}</ol>` : ''}</details>
            <div class="cria-pm"><button type="button" data-no="${e(n.id)}" data-d="-1" ${menosNao ? `disabled title="${e(menosNao)}"` : ''} aria-label="Tirar ${e(n.nome)}">−</button><button type="button" class="${g ? '' : 'primary'}" data-no="${e(n.id)}" data-d="1" ${maisNao ? `disabled title="${e(maisNao)}"` : ''} aria-label="Escolher ${e(n.nome)}">${g ? '+' : 'Escolher'}</button></div></li>`;
        };
        return `<section class="cria-arv"><h3>${e(a.nome)}</h3><p class="cria-txt">${e(textoDe(a, 220))}</p><ul>${nos.map(linha).join('') || '<li class="cria-vazio">Nada para escolher ainda.</li>'}</ul></section>`;
      });
      return `<p class="cria-dica">Gaste os pontos iniciais nas árvores da raça e da classe. Aparecem só as habilidades que você já pode pegar; escolher uma abre as seguintes. Clique no nome para ler. O que sobrar dá para gastar depois, na aba Árvore.</p>
        <div class="cria-pontos">${usados.map(p => { const r = (w.pontos[p.id] || 0) - gasto(ix, w.aloc, p.id); return `<span style="--c:${e(p.cor || '#888')}"><b>${r}</b> de ${w.pontos[p.id] || 0} pontos de ${e(p.nome)}</span>`; }).join('')}</div>
        <div class="cria-arvs">${blocos.join('')}</div>`;
    }
    // fim
    const raca = arvorePorId(w.raca), classe = arvorePorId(w.modo === 'fundo' ? w.principal : w.classe), ix = indice([w.raca, w.classe]);
    const nos = Object.keys(w.aloc).map(id => ix.porId.get(id)).filter(n => n && !ehRaiz(ix.arvDe.get(n.id), n));
    return `<div class="cria-fim">
      <div class="cria-foto">${FichasExtras.imagemOk(w.img) ? `<img src="${e(w.img)}" alt="">` : `<span class="cria-ini">${e(FichasExtras.iniciais(w.nome))}</span>`}</div>
      <div><h3>${e(w.nome)}</h3><p>${e([raca && raca.nome, classe && classe.nome].filter(Boolean).join(' · '))}${w.modo === 'fundo' ? ' · ' + ({ familia: 'Família', companheiro: 'Companheiro', toldo: 'Toldo' }[w.papel]) + ' · Tier ' + w.tier + ' · Level ' + w.level : ' · Level ' + w.level}</p>
      ${w.modo === 'fundo' ? `<p>${w.relacao ? e(w.relacao.trim().charAt(0).toUpperCase() + w.relacao.trim().slice(1)) + ' de ' : 'Da história de '}${e(w.jogadorNome)}. Vai para o grupo “${e(w.grupo)}” e entra no acampamento; ${e(w.jogadorNome)} vê a ficha, mas não controla.</p>`
        : `<p class="cria-fimatr">${ATR.map(([k, n]) => `<span class="c-${k.toLowerCase()}">${k} <b>${w.atr[k]}</b></span>`).join('')}</p>
           <p>${nos.length ? 'Habilidades: ' + nos.map(n => e(n.nome) + (w.aloc[n.id] > 1 ? ' (' + w.aloc[n.id] + ')' : '')).join(', ') + '.' : 'Nenhuma habilidade escolhida ainda (dá para escolher depois, na aba Árvore).'}</p>
           <p class="cria-dica">Depois de criar, o mestre dá uma olhada na ficha. Você continua podendo mudar o que quiser.</p>`}
      </div></div>`;
  }

  function ligar(passo) {
    const cx = veu.querySelector('.cria-caixa'), qa = s => cx.querySelectorAll(s);
    cx.querySelector('[data-cr="fechar"]').onclick = pedirFechar;
    const sc = cx.querySelector('[data-cr-camp]');
    if (sc) sc.onchange = () => { w.camp = sc.value || null; const pc = pcDoJogadorEm(w.jogador, w.camp); w.pcDoJogador = pc ? pc.nome : ''; pintar(); };
    const v = cx.querySelector('[data-cr="voltar"]'); if (v) v.onclick = () => irPasso(-1);
    const p = cx.querySelector('[data-cr="proximo"]'); if (p) p.onclick = () => { const f = pronto(w.passo); if (f) { toast(f); return; } irPasso(1); };
    const c = cx.querySelector('[data-cr="criar"]'); if (c) c.onclick = () => concluir(false);
    const o = cx.querySelector('[data-cr="outro"]'); if (o) o.onclick = () => concluir(true);
    qa('[data-fam]').forEach(b => b.onclick = () => {
      w.mexeu = true;
      const f = familias(valem('raca', w.racas)).find(x => x.k === b.dataset.fam);
      if (w.fam !== f.k) { w.fam = f.k; w.raca = f.arvores.length === 1 ? f.arvores[0].a.id : null; w.aloc = raizes(); }
      if (f.arvores.length === 1) pintar(); else irPasso(1);
    });
    qa('[data-raca]').forEach(b => b.onclick = () => { w.mexeu = true; if (w.raca !== b.dataset.raca) { w.raca = b.dataset.raca; w.aloc = raizes(); } pintar(); });
    qa('[data-classe]').forEach(b => b.onclick = () => { w.mexeu = true; if (w.classe !== b.dataset.classe) { w.classe = b.dataset.classe; w.aloc = raizes(); } pintar(); });
    qa('[data-papel]').forEach(b => b.onclick = () => { w.mexeu = true; if (w.papel !== b.dataset.papel) { w.papel = b.dataset.papel; w.principal = null; } pintar(); });
    qa('[data-principal]').forEach(b => b.onclick = () => { w.principal = b.dataset.principal || null; pintar(); });
    qa('[data-tier]').forEach(b => b.onclick = () => { w.tier = b.dataset.tier; pintar(); });
    const nome = cx.querySelector('#criaNome');
    if (nome) {
      nome.oninput = () => { w.nome = nome.value; w.mexeu = true; const f = pronto(w.passo); cx.querySelector('.cria-falta').textContent = f; const bp = cx.querySelector('[data-cr="proximo"]'); if (bp) bp.setAttribute('aria-disabled', String(!!f)); };
      nome.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); irPasso(1); } };
    }
    const rel = cx.querySelector('#criaRel'); if (rel) rel.oninput = () => { w.relacao = rel.value; };
    const lvl = cx.querySelector('#criaLvl'); if (lvl) lvl.onchange = () => { w.level = Math.max(1, Math.min(50, Math.round(+lvl.value) || 1)); lvl.value = w.level; };
    const foto = cx.querySelector('[data-cr="foto"]'), arq = cx.querySelector('#criaFoto');
    if (foto && arq) {
      foto.onclick = () => arq.click();
      arq.onchange = async () => {
        const f = arq.files && arq.files[0]; if (!f) return;
        if (!/^image\/(png|jpeg|webp)$/.test(f.type || '')) { toast('Escolha uma imagem PNG, JPG ou WebP.'); return; }
        foto.innerHTML = '<span>Enviando…</span>';
        try { w.img = await FichasExtras.guardarImagem(f); w.mexeu = true; } catch (er) { toast((er && er.message) || 'Não deu para usar esta imagem.'); }
        pintar();
      };
    }
    const sf = cx.querySelector('[data-cr="semfoto"]'); if (sf) sf.onclick = () => { w.img = null; pintar(); };
    qa('[data-atr]').forEach(b => b.onclick = () => { const k = b.dataset.atr; w.atr[k] = Math.max(1, (+w.atr[k] || 1) + (+b.dataset.d)); w.mexeu = true; pintar(); });
    qa('[data-atrv]').forEach(i => i.onchange = () => { w.atr[i.dataset.atrv] = Math.max(1, Math.round(+i.value) || 1); w.mexeu = true; pintar(); const n = veu.querySelector(`[data-atrv="${i.dataset.atrv}"]`); if (n) n.focus(); });
    const ig = cx.querySelector('[data-cr="igual"]');
    if (ig) ig.onclick = () => { const t = totalAtr(), base = Math.floor(t / 5); let sobra = t - base * 5; ATR.forEach(([k]) => { w.atr[k] = Math.max(1, base + (sobra-- > 0 ? 1 : 0)); }); pintar(); };
    const zr = cx.querySelector('[data-cr="zerar"]'); if (zr) zr.onclick = () => { ATR.forEach(([k]) => { w.atr[k] = 1; }); pintar(); };
    qa('[data-no]').forEach(b => b.onclick = () => {
      const ix = indice([w.raca, w.classe]), n = ix.porId.get(b.dataset.no); if (!n) return;
      if (+b.dataset.d > 0) { const nao = podeComprar(ix, w, n); if (nao) { toast(nao); return; } w.aloc[n.id] = (w.aloc[n.id] || 0) + 1; }
      else { const nao = podeTirar(ix, w, n); if (nao) { toast(nao); return; } if (w.aloc[n.id] > 1) w.aloc[n.id]--; else delete w.aloc[n.id]; }
      w.mexeu = true;
      const corpoEl = veu.querySelector('.cria-corpo'), rolou = corpoEl ? corpoEl.scrollTop : 0;
      pintar();
      const c2 = veu.querySelector('.cria-corpo'); if (c2) c2.scrollTop = rolou;
      const de = veu.querySelector(`[data-no="${CSS.escape(n.id)}"][data-d="${b.dataset.d}"]`) || veu.querySelector(`[data-no="${CSS.escape(n.id)}"]`); if (de) de.focus();
    });
  }
  // as raízes das árvores escolhidas já vêm escolhidas (são de graça e abrem o resto)
  function raizes() {
    const o = {};
    for (const id of [w.raca, w.modo === 'fundo' ? w.principal : w.classe]) { const a = arvorePorId(id), r = raizDe(a); if (r && !Object.values(custoDo(r, 1)).some(v => v > 0)) o[r.id] = 1; }
    return o;
  }

  function abrirJanela() {
    if (veu) veu.remove();
    document.removeEventListener('keydown', tecla, true);
    veu = document.createElement('div');
    veu.className = 'cria-veu';
    veu.innerHTML = '<div class="cria-caixa" role="dialog" aria-modal="true" aria-label="Criação de personagem"></div>';
    veu.addEventListener('click', ev => { if (ev.target === veu) pedirFechar(); });
    document.body.append(veu);
    document.addEventListener('keydown', tecla, true);
  }

  /* O jogador (ou o mestre, para ver) cria o personagem desta ficha. */
  function abrir(pc) {
    if (!pc) return;
    const c = pc.criacao || {};
    const totalPts = {};
    pools().forEach(p => { totalPts[p.id] = (pc.skills && pc.skills.pontos && pc.skills.pontos[p.id] != null) ? +pc.skills.pontos[p.id] : (+p.padrao || 0); });
    w = { modo: 'jogador', pc, passo: 'raca', fam: null, raca: null, classe: null, nome: pendente(pc) && /^Ficha (de|para) /.test(pc.nome || '') ? '' : (pc.nome || ''), img: pc.img || null,
      level: Math.max(1, +c.level || +pc.level || 1), racas: c.racas || [], classes: c.classes || [], atr: { FOR: 1, DES: 1, VIT: 1, CAN: 1, AGI: 1 }, aloc: {}, pontos: totalPts, mexeu: false };
    abrirJanela(); pintar();
  }
  function concluir(outro) {
    if (!w) return;
    const ps = passos();
    for (const p of ps) { const f = pronto(p); if (f) { w.passo = p; pintar(); toast(f); return; } }
    if (w.modo === 'fundo') return criarNpc(outro);
    const pc = w.pc, raca = arvorePorId(w.raca), classe = arvorePorId(w.classe);
    pc.nome = String(w.nome).trim();
    if (w.img) pc.img = w.img; else delete pc.img;
    pc.raca = [raca && raca.nome, classe && classe.nome].filter(Boolean).join(' · ');
    pc.level = w.level;
    pc.modoAtr = 'livre'; pc.atrLivre = Object.assign({}, w.atr);
    pc.skills = pc.skills || {};
    pc.skills.arvores = [...new Set([w.raca, w.classe, ...(pc.skills.arvores || [])].filter(Boolean))];
    pc.skills.pontos = Object.assign({}, w.pontos, pc.skills.pontos || {});
    pc.skills.alocados = Object.assign({}, pc.skills.alocados || {}, w.aloc);
    pc.criacao = { conferir: true, feita: Date.now(), raca: w.raca, classe: w.classe };
    S.sel = pc.id; S.aba = 'fichas';
    fechar(); save(); render(); window.scrollTo({ top: 0 });
    FichasExtras.aviso('Personagem criado! O mestre vai dar uma olhada na ficha.');
  }

  /* ---------- o mestre: dar a ficha ---------- */
  function darFicha(o) {
    if (!FichasMesa.mestre()) { toast('Quem dá ficha é o mestre.'); return; }
    const racas = valem('raca'), classes = valem('classe');
    w = { modo: 'dar', mexeu: false };
    abrirJanela();
    const dados = { level: 1, racas: new Set(racas.map(a => a.id)), classes: new Set(classes.map(a => a.id)) };
    const caixa = veu.querySelector('.cria-caixa');
    const chips = (lista, sel, attr) => familias(lista).map(f => `<div class="cria-fam"><b>${e(f.nome)}</b>${f.arvores.map(x => `<label class="cria-chk"><input type="checkbox" ${attr}="${e(x.a.id)}" ${sel.has(x.a.id) ? 'checked' : ''}>${e(f.arvores.length > 1 ? x.rotulo : x.a.nome)}</label>`).join('')}</div>`).join('');
    const pint = () => {
      caixa.innerHTML = `<header class="cria-topo"><h2>Ficha para ${e(o.nome || 'o jogador')}</h2><button type="button" class="ghost" data-cr="fechar" aria-label="Fechar">✕</button></header>
        <div class="cria-corpo">
          <p class="cria-dica">${e(o.nome || 'O jogador')} recebe um aviso e cria o personagem passo a passo: raça, sub-raça, classe, nome e foto, atributos e habilidades.${o.camp ? ' A ficha nasce na campanha ' + e(FichasMesa.nomeDaCampanha(o.camp) || '') + '.' : ''}</p>
          <label class="f cria-lvl"><span class="eyebrow">Level inicial</span><input id="dfLvl" type="number" min="1" max="50" value="${dados.level}"></label>
          <p class="cria-sub">${dados.level ? ptsDoLevel(dados.level) + ' pontos de atributo nesse level.' : ''}</p>
          <h3 class="cria-sub">Raças que valem <button type="button" class="mini" data-todas="r">todas</button> <button type="button" class="mini" data-nenhuma="r">nenhuma</button></h3>
          <div class="cria-fams">${racas.length ? chips(racas, dados.racas, 'data-dr') : '<p class="cria-vazio">Nenhuma árvore de Raça na mesa.</p>'}</div>
          <h3 class="cria-sub">Classes que valem <button type="button" class="mini" data-todas="c">todas</button> <button type="button" class="mini" data-nenhuma="c">nenhuma</button></h3>
          <div class="cria-chips">${classes.map(a => `<label class="cria-chk"><input type="checkbox" data-dc="${e(a.id)}" ${dados.classes.has(a.id) ? 'checked' : ''}>${e(a.nome)}</label>`).join('') || '<p class="cria-vazio">Nenhuma árvore de Classe na mesa.</p>'}</div>
        </div>
        <footer class="cria-pe"><button type="button" data-cr="fechar2">Cancelar</button><span class="cria-falta"></span><button type="button" class="primary" data-cr="dar">Dar a ficha</button></footer>`;
      caixa.querySelector('[data-cr="fechar"]').onclick = fechar; caixa.querySelector('[data-cr="fechar2"]').onclick = fechar;
      const lv = caixa.querySelector('#dfLvl'); lv.onchange = () => { dados.level = Math.max(1, Math.min(50, Math.round(+lv.value) || 1)); pint(); caixa.querySelector('#dfLvl').focus(); };
      caixa.querySelectorAll('[data-dr]').forEach(i => i.onchange = () => { if (i.checked) dados.racas.add(i.dataset.dr); else dados.racas.delete(i.dataset.dr); });
      caixa.querySelectorAll('[data-dc]').forEach(i => i.onchange = () => { if (i.checked) dados.classes.add(i.dataset.dc); else dados.classes.delete(i.dataset.dc); });
      caixa.querySelectorAll('[data-todas]').forEach(b => b.onclick = () => { const s = b.dataset.todas === 'r' ? dados.racas : dados.classes; (b.dataset.todas === 'r' ? racas : classes).forEach(a => s.add(a.id)); pint(); });
      caixa.querySelectorAll('[data-nenhuma]').forEach(b => b.onclick = () => { (b.dataset.nenhuma === 'r' ? dados.racas : dados.classes).clear(); pint(); });
      caixa.querySelector('[data-cr="dar"]').onclick = () => {
        if (racas.length && !dados.racas.size) { toast('Marque pelo menos uma raça.'); return; }
        if (classes.length && !dados.classes.size) { toast('Marque pelo menos uma classe.'); return; }
        const p = personagemPadrao('Ficha de ' + (o.nome || 'jogador'), '', 'C', dados.level);
        FichasExtras.tornarLivre(p, true);
        p._dono = o.jogador || null; p._camp = o.camp || null; p._vis = 'mestre';
        const todas = (lista, sel) => (sel.size === lista.length ? [] : [...sel]);
        p.criacao = { pendente: true, level: dados.level, racas: todas(racas, dados.racas), classes: todas(classes, dados.classes), em: Date.now() };
        p.skills = { arvores: [], pontos: Object.fromEntries(pools().map(pl => [pl.id, +pl.padrao || 0])), alocados: {} };
        S.personagens.push(FichasMesa.nascer(p)); S.sel = p.id; S.aba = 'fichas';
        fechar(); save(); render(); window.scrollTo({ top: 0 });
        FichasExtras.aviso('Ficha dada a ' + (o.nome || 'o jogador') + '. Ele recebe um aviso para criar o personagem.');
      };
    };
    pint();
  }

  /* ---------- o mestre: o background (os NPCs da história de um jogador) ---------- */
  /* (lote 27) A campanha do background: a que o mestre está vendo, se o jogador participa dela (ou tem ficha nela — também
     a ficha ainda por criar); senão, a da ficha do jogador; senão, a única campanha de que ele participa; por fim, a em
     vista. (Antes, a ficha ainda por criar não contava e o background ia para a campanha de uma ficha antiga do jogador.)
     O mestre vê a campanha no alto da janela e pode trocar. */
  function campDoJogador(jogador) {
    const vista = FichasMesa.campEmVista(), abertas = new Set(FichasMesa.campanhas().filter(c => !c.encerrada).map(c => c.id));
    const dele = S.personagens.filter(p => p._dono === jogador && !p.petDe);
    const m = ((window.TC && TC.ponte && TC.ponte.estado && TC.ponte.estado.membros) || []).find(x => x.id === jogador);
    const participa = (m && Array.isArray(m.campanhas) ? m.campanhas : []).filter(id => abertas.has(id));
    let camp;
    if (vista && abertas.has(vista) && (participa.includes(vista) || dele.some(p => p._camp === vista))) camp = vista;
    else {
      const pc0 = dele.find(p => !pendente(p) && (!p._camp || abertas.has(p._camp))) || dele[0];
      camp = pc0 ? (pc0._camp || null) : participa.length === 1 ? participa[0] : (FichasMesa.encerrada(vista) ? null : vista);
    }
    return { camp, pc: pcDoJogadorEm(jogador, camp) };
  }
  // a ficha do jogador numa campanha (a que já foi criada, de preferência): o nome dela vai nas notas do NPC
  function pcDoJogadorEm(jogador, camp) {
    const l = S.personagens.filter(p => p._dono === jogador && !p.petDe && (p._camp || null) === (camp || null));
    return l.find(p => !pendente(p)) || l[0] || null;
  }
  function fundo(o) {
    if (!FichasMesa.mestre()) { toast('O background é do mestre.'); return; }
    const c = campDoJogador(o.jogador);
    w = { modo: 'fundo', passo: 'raca', fam: null, raca: null, papel: null, principal: null, nome: '', img: null, relacao: '', tier: 'C', level: 1, aloc: {},
      racas: [], jogador: o.jogador, jogadorNome: o.nome || 'jogador', camp: c.camp, pcDoJogador: c.pc ? c.pc.nome : '', grupo: o.nome || 'Background', feitos: 0, mexeu: false };
    abrirJanela(); pintar();
  }
  function criarNpc(outro) {
    const raca = arvorePorId(w.raca), princ = arvorePorId(w.principal);
    const p = personagemPadrao(String(w.nome).trim(), [raca && raca.nome, princ && princ.nome].filter(Boolean).join(' · '), w.tier, w.level);
    p._dono = null; p._vis = 'mesa'; p._camp = w.camp;
    p.grupo = w.grupo; p.lado = 'Aliado';
    if (w.img) p.img = w.img;
    p.fundo = { de: w.jogador, papel: w.papel, relacao: String(w.relacao || '').trim() };
    if (p.fundo.relacao) p.notas = 'Relação: ' + p.fundo.relacao + (w.pcDoJogador ? ' de ' + w.pcDoJogador : '') + '.';
    const arv = [w.raca, w.principal].filter(Boolean);
    p.skills = { arvores: arv, pontos: Object.fromEntries(pools().map(pl => [pl.id, +pl.padrao || 0])), alocados: (() => { const o = {}; arv.forEach(id => { const r = raizDe(arvorePorId(id)); if (r && !Object.values(custoDo(r, 1)).some(v => v > 0)) o[r.id] = 1; }); return o; })() };
    fixarGrupos(); const l = gruposDe(w.camp || ''); if (!l.includes(w.grupo)) l.push(w.grupo);
    S.personagens.push(FichasMesa.nascer(p));
    save(); render();
    const nome = p.nome;
    if (outro) {
      Object.assign(w, { passo: 'raca', fam: null, raca: null, papel: null, principal: null, nome: '', img: null, relacao: '', aloc: {}, feitos: w.feitos + 1, mexeu: false });
      pintar(); FichasExtras.aviso(nome + ' criado. Agora o próximo.');
    } else { const n = w.feitos + 1; S.sel = p.id; fechar(); save(); render(); FichasExtras.aviso(n === 1 ? nome + ' entrou no background.' : n + ' NPCs entraram no background.'); }
  }

  /* ---------- na lista e no alto da ficha ---------- */
  function selo(pc) {
    if (pendente(pc)) return '<span class="cria-selo esp" title="Esperando o jogador criar o personagem">a criar</span>';
    if (paraConferir(pc) && FichasMesa.mestre()) return '<span class="cria-selo" title="O jogador criou: confira a ficha">nova · conferir</span>';
    return '';
  }
  function htmlAviso(pc) {
    if (pendente(pc)) {
      const meu = !FichasMesa.mestre();      // (o jogador só recebe a ficha dele; sem mesa, quem está aqui cria)
      return meu ? `<div class="cria-aviso"><div><b>Esta ficha está esperando você criar o personagem.</b><span>Raça, classe, nome, atributos e habilidades — passo a passo.</span></div><button type="button" class="primary" data-criar="${e(pc.id)}">Criar personagem</button></div>`
        : `<div class="cria-aviso esp"><div><b>Esperando ${e(FichasMesa.nomeDoDono(pc) || 'o jogador')} criar o personagem.</b><span>Level ${e(pc.criacao.level || 1)}. Quando ele terminar, a ficha aparece aqui marcada para você conferir.</span></div></div>`;
    }
    if (paraConferir(pc) && FichasMesa.mestre()) return `<div class="cria-aviso conf"><div><b>${e(FichasMesa.nomeDoDono(pc) || 'O jogador')} criou este personagem.</b><span>Confira os atributos e as habilidades; o que precisar, você muda aqui mesmo.</span></div><button type="button" data-conferido="${e(pc.id)}">Conferido</button></div>`;
    return '';
  }
  function ligarAviso(host, pc) {
    const b = host.querySelector('[data-criar]'); if (b) b.onclick = () => abrir(pc);
    const c = host.querySelector('[data-conferido]');
    if (c) c.onclick = () => { if (pc.criacao) delete pc.criacao.conferir; save(); render(); FichasExtras.aviso('Ficha conferida.', 'Desfazer', () => { pc.criacao = Object.assign(pc.criacao || {}, { conferir: true }); save(); render(); }); };
  }
  // o pedido que veio de outra aba (a casca): { criar }, { darFicha }, { fundo }
  function pedido(a) {
    if (!a) return false;
    if (a.criar) { const pc = S.personagens.find(p => p.id === a.criar); if (!pc) { toast('Esta ficha ainda não chegou a este aparelho. Tente de novo em instantes.'); return true; } S.sel = pc.id; render(); abrir(pc); return true; }
    if (a.darFicha) { darFicha(a.darFicha); return true; }
    if (a.fundo) { fundo(a.fundo); return true; }
    return false;
  }
  return { abrir, darFicha, fundo, pedido, selo, htmlAviso, ligarAviso, pendente, paraConferir, familias, caminho, aberto: () => !!w };
})();
