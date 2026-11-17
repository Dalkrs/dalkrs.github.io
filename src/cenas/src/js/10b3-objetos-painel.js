/* ---------------------------------------------------------------
   10b3. O PAINEL DE OBJETOS (lote 179) — a barra de cima da ferramenta Objetos, organizada:
   · a busca: pelo nome e por apelidos ("cadeira" acha o banco, o trono e a poltrona; "fogo" acha a fogueira, a lareira e
     o braseiro), sem ligar para acento; procura em todas as categorias. Enter escolhe o primeiro achado; Esc limpa;
   · as 7 seções (Casa e móveis, Cidade e comércio, Natureza e clima, Masmorra e perigo, Magia e templo, Viagem e guerra,
     Missão e mistério); cada uma abre as suas categorias. Uma categoria nova que ninguém pôs numa seção cai em "Outros";
   · os usados por último (os 8 últimos postos no mapa) e os favoritos (a estrela no canto de cada miniatura), guardados
     neste aparelho.
   Digitar na busca só troca as miniaturas (a barra não se refaz, então o cursor fica na caixa).
   --------------------------------------------------------------- */
const ObjPainel = (() => {
  const SECOES = [
    ['casa', 'Casa e móveis', ['luz', 'movel', 'nobre', 'banho', 'taverna']],
    ['cidade', 'Cidade e comércio', ['mercado', 'povo', 'diaadia', 'forja', 'teatro', 'oriental']],
    ['natureza', 'Natureza e clima', ['natureza', 'fantastica', 'fazenda', 'inverno', 'deserto', 'pantano']],
    ['masmorra', 'Masmorra e perigo', ['perigo', 'masmorra', 'prisao', 'esgoto', 'ruinas', 'portao']],
    ['magia', 'Magia e templo', ['templo', 'escola', 'portais', 'linhagem']],
    ['viagem', 'Viagem e guerra', ['viagem', 'militar', 'conves', 'treino', 'cla']],
    ['missao', 'Missão e mistério', ['missao', 'trama', 'misterio', 'furtiv', 'base']],
  ];
  // os apelidos: cada linha é uma família de palavras que se acham umas às outras
  const APELIDOS = [
    'cadeira banco trono poltrona sofa assento banquinho almofada tamborete espreguicadeira',
    'mesa escrivaninha balcao bancada carteira aparador escrivaninha',
    'cama beliche catre leito dormir colchao',
    'fogo fogueira lareira braseiro tocha vela lampiao fornalha forno brasa chama incendio',
    'luz lampiao lanterna lustre vela tocha candelabro orbe poste iluminacao',
    'agua poco fonte tina balde banheira pia lago bebedouro jarro cocho rio',
    'arvore arbusto palmeira pinheiro bonsai planta flores flor vaso juncos floreira ervas mato',
    'pedra rocha pedregulho estatua coluna obelisco seixo',
    'bau caixote caixa cofre barril tonel saco sacos cesto carga contrabando',
    'arma espada lanca machado armas cavalete armadura escudo canhao catapulta balista faca',
    'porta portao grade porteira cortina alcapao passagem entrada',
    'livro livros estante diario pergaminho papel papeis carta mapa quadro bilhete',
    'animal cachorro cao gato cavalo camelo sapo galinha porco rato ratos bicho',
    'morte morto corpo ossada osso ossos cranio caveira tumulo caixao sarcofago cadaver',
    'armadilha estacas buraco dardos pendulo fosso pressao guizos',
    'magia magico runa runas portal circulo cristal orbe varinha feitico arcano alquimia',
    'comida fruta frutas abobora graos caneca canecas banquete panela caldeirao fogao peixe pao',
    'musica alaude harpa tambor gongo palco sino instrumento',
    'barco bote navio leme mastro ancora prancha redes porto',
    'dinheiro ouro moeda moedas tesouro cofre riqueza',
    'crime pista sangue faca veneno corpo lupa assassinato detetive',
    'religiao templo altar igreja oferenda pulpito incensario capela padre sagrado',
    'escada degrau degraus escadaria subida',
    'cerca muro mureta palicada barricada divisa',
    'roupa varal lavar arara figurino tecido pano',
    'neve gelo inverno frio iglu treno congelado',
    'sujeira lixo esgoto cano canos bueiro',
    'festa bandeirola bandeirolas fitas palco danca festival',
    'guarda soldado quartel militar acampamento tenda barraca',
  ].map(l => l.split(' '));
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const GUARDA = 'tinycats:cenas:objetos';
  let busca = '', lembra = null;
  function guardado() {
    if (lembra) return lembra;
    try { const o = JSON.parse(localStorage.getItem(GUARDA) || '{}'); lembra = { fav: Array.isArray(o.fav) ? o.fav : [], rec: Array.isArray(o.rec) ? o.rec : [] }; } catch (e) { lembra = { fav: [], rec: [] }; }
    return lembra;
  }
  const salvar = () => { try { localStorage.setItem(GUARDA, JSON.stringify(lembra)); } catch (e) { /* sem armazenamento */ } };
  const existe = id => !!Props.P[id] && Props.ORDER.includes(id);
  const favoritos = () => guardado().fav.filter(existe);
  const recentes = () => guardado().rec.filter(existe);
  // posto no mapa: entra na frente dos usados por último (até 8)
  function usou(id) { const g = guardado(); g.rec = [id].concat(g.rec.filter(x => x !== id)).slice(0, 8); salvar(); }
  function favorito(id) { const g = guardado(), i = g.fav.indexOf(id); if (i >= 0) g.fav.splice(i, 1); else g.fav.push(id); salvar(); }

  /* ---- as seções e as categorias ---- */
  function secoes() {
    const ids = new Set(Props.G.map(g => g.id)), usadas = new Set(), out = [];
    for (const [id, n, gs] of SECOES) { const cs = gs.filter(g => ids.has(g)); cs.forEach(g => usadas.add(g)); if (cs.length) out.push([id, n, cs]); }
    const resto = Props.G.map(g => g.id).filter(g => !usadas.has(g));
    if (resto.length) out.push(['outros', 'Outros', resto]);
    return out;
  }
  const secaoDe = cat => (secoes().find(s => s[2].includes(cat)) || secoes()[0])[0];
  const nomeCat = g => (Props.G.find(x => x.id === g) || { n: g }).n;

  /* ---- a busca ---- */
  const textoDe = id => { const d = Props.P[id]; return norm([d.n, d.tags || '', nomeCat(d.g), id.replace(/([A-Z])/g, ' $1')].join(' ')); };
  function achar(q) {
    const ps = norm(q).split(/[^a-z0-9]+/).filter(w => w.length >= 2);
    if (!ps.length) return [];
    const exp = ps.map(w => { const e = new Set([w]); for (const fam of APELIDOS) if (fam.some(t => t.startsWith(w) || (w.length >= 4 && w.startsWith(t)))) fam.forEach(t => e.add(t)); return [...e]; });
    const out = [];
    for (const id of Props.ORDER) {
      const d = Props.P[id], nome = norm(d.n), tx = textoDe(id);
      let nota = 0, ok = true;
      ps.forEach((w, i) => {
        if (!ok) return;
        if (nome.startsWith(w) || nome.includes(' ' + w)) nota += 0;
        else if (nome.includes(w)) nota += 1;
        else if (tx.includes(w)) nota += 2;
        else if (exp[i].some(e => nome.includes(e))) nota += 3;
        else if (exp[i].some(e => tx.includes(e))) nota += 4;
        else ok = false;
      });
      if (ok) out.push([id, nota]);
    }
    return out.sort((a, b) => a[1] - b[1] || Props.P[a[0]].n.localeCompare(Props.P[b[0]].n, 'pt')).map(x => x[0]);
  }

  /* ---- as miniaturas (o desenho guardado: digitar na busca não redesenha tudo) ---- */
  const cache = new Map();
  function mini(id) {
    let base = cache.get(id);
    if (!base) { base = document.createElement('canvas'); base.width = base.height = 64; try { Props.thumb(base, id, 1.3); } catch (e) { /* desenho que precisa do token */ } cache.set(id, base); }
    const cv = h('canvas', { width: 64, height: 64 }); cv.getContext('2d').drawImage(base, 0, 0); return cv;
  }
  // a miniatura com a estrela: um clique escolhe; a estrela marca o favorito
  function botao(id, o, escolher, repintar, comCat, pre) {
    pre = pre || 'o-obj-';      // (os atalhos têm outro prefixo: o mesmo objeto pode estar na grade e nos atalhos)
    const d = Props.P[id], fav = guardado().fav.includes(id);
    return h('span', { class: 'o-objw' + (fav ? ' fav' : '') },
      h('button', { type: 'button', class: 'o-obj' + (o.obj === id ? ' on' : ''), id: pre + id, title: d.n + (comCat ? ' · ' + nomeCat(d.g) : '') + (d.luz ? ' (com luz que tremula)' : ''), 'aria-label': d.n, 'aria-pressed': String(o.obj === id), onclick: () => escolher(id) }, mini(id)),
      h('button', { type: 'button', class: 'o-fav', id: (pre === 'o-obj-' ? 'o-' : pre) + 'fav-' + id, title: fav ? 'Tirar dos favoritos' : 'Marcar como favorito', 'aria-label': (fav ? 'Tirar dos favoritos: ' : 'Marcar como favorito: ') + d.n, 'aria-pressed': String(fav), onclick: e => { e.stopPropagation(); favorito(id); repintar(); }, text: fav ? '★' : '☆' }));
  }

  /* ---- a barra: monta os pedaços (o que a ferramenta Objetos mostra em cima) ---- */
  function montar(o, optSet) {
    const K = UI.kit, ss = secoes();
    const cat = Props.G.some(g => g.id === o.objCat) ? o.objCat : 'luz', sec = secaoDe(cat), cats = (ss.find(s => s[0] === sec) || ss[0])[2];
    const escolher = id => { const g = Props.P[id].g; if (!busca) o.objCat = g; optSet('obj', id, true); };
    const daCat = g => { o.objCat = g; const ids = Props.ORDER.filter(id => Props.P[id].g === g); if (!ids.includes(o.obj)) o.obj = ids[0]; optSet('objCat', g, true); };
    const grade = h('div', { class: 'o-objs', id: 'o-objs', role: 'group', 'aria-label': 'Objetos' }), conta = h('span', { class: 'o-achados', id: 'o-achados', 'aria-live': 'polite' });
    const atalhos = h('div', { class: 'o-atalhos', id: 'o-atalhos' }), filtros = h('div', { class: 'o-filtros' });
    const pintarAtalhos = () => {
      const rec = recentes(), fav = favoritos(), bloco = (id, rot, ids) => ids.length ? h('div', { class: 'o-atal', id }, h('span', { class: 'o-atal-l', text: rot }), ids.map(x => botao(x, o, escolher, repintar, true, id + '-'))) : null;
      atalhos.replaceChildren(...[bloco('o-recentes', 'Últimos', rec), bloco('o-favoritos', '★ Favoritos', fav)].filter(Boolean));
      atalhos.hidden = !rec.length && !fav.length;
    };
    const pintarGrade = () => {
      const q = busca.trim();
      if (q) {
        const ids = achar(q);
        conta.textContent = ids.length ? `${ids.length} ${ids.length === 1 ? 'objeto achado' : 'objetos achados'}${ids.length > 60 ? ' (mostrando 60)' : ''}` : 'Nada com esse nome. Tente outra palavra.';
        grade.replaceChildren(...ids.slice(0, 60).map(id => botao(id, o, escolher, repintar, true)));
      } else {
        conta.textContent = '';
        grade.replaceChildren(...Props.ORDER.filter(id => Props.P[id].g === cat).map(id => botao(id, o, escolher, repintar, false)));
      }
      filtros.hidden = !!q;
      for (const b of secs ? secs.querySelectorAll('.seg-b') : []) { const on = !q && b.textContent === (ss.find(x => x[0] === sec) || [])[1]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    };
    function repintar() { pintarAtalhos(); pintarGrade(); }
    const caixa = h('input', { id: 'o-busca', class: 'in o-busca', type: 'search', placeholder: 'Buscar objeto…', value: busca, autocomplete: 'off', 'aria-label': 'Buscar objeto pelo nome ou por uma palavra parecida',
      oninput: e => { busca = e.target.value; pintarGrade(); },
      onkeydown: e => {
        if (e.key === 'Escape' && busca) { e.preventDefault(); e.stopPropagation(); busca = ''; e.target.value = ''; pintarGrade(); }
        else if (e.key === 'Enter') { const ids = achar(busca); if (ids.length) { e.preventDefault(); const id = ids[0]; o.objCat = Props.P[id].g; optSet('obj', id, true); } }
      } });
    // (a seção na linha da busca; escolher uma seção ou categoria limpa a busca)
    const secs = K.seg('o-osec', busca.trim() ? '' : sec, ss.map(([id, n]) => [id, n]), v => { busca = ''; const s = ss.find(x => x[0] === v); if (s) daCat(s[2][0]); });
    filtros.append(K.seg('o-oc', cat, cats.map(g => [g, nomeCat(g)]), g => { busca = ''; daCat(g); }));
    repintar();
    return [h('div', { class: 'o-objtopo' }, h('label', { class: 'o-buscaw' }, icon('search', 14), caixa), secs, conta, atalhos), filtros, grade];      // (os atalhos na linha da busca: a barra não cresce)
  }
  return { montar, usou, favorito, favoritos, recentes, achar, secoes, SECOES, APELIDOS, limparBusca: () => { busca = ''; } };
})();
