/* ---------------------------------------------------------------
   10h. GERADOR — a janela "Gerar um lugar…" (lote 7)
   Uma janela com uma aba por lugar (o Vilarejo, a Cidade, a Tribo, o Encontro, a Região livre, as Ruínas, a Masmorra e o Porto), as escolhas de cada um e, embaixo, o que vale
   para todos: o estilo (Comum, Oriental, Nórdico, Desértico, Élfico, Anão), a hora do dia, o clima da cena, a estação
   (lote 13, parte 13c: só nos lugares de fora — L.aceitaEstacao) e o relevo (as áreas de terreno com altura e as formas
   de enfeite; desligado, o lugar sai plano). A prévia
   mostra o lugar; um clique numa parte dela (uma casa, o rio, as ruas e a praça) trava a parte, e "Gerar outro"
   sorteia só o resto. A semente fica à mostra (a mesma semente, com as mesmas escolhas, dá o mesmo lugar) e o lugar
   pode ser guardado como modelo, para gerar outros parecidos (os modelos são do mestre: na mesa, vão no índice das
   cenas). Nada muda nas cenas que já existem até "Criar a cena".
   --------------------------------------------------------------- */
const Gerador = (() => {
  const LUGARES = [Vila.LUGAR, Cidade.LUGAR, Tribo.LUGAR, Encontro.LUGAR, Regiao.LUGAR, Ruinas.LUGAR, Masmorra.LUGAR, Porto.LUGAR];
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  const lugar = id => LUGARES.find(l => l.id === id) || null;
  const modelos = () => Proj.normModelos(Store.S.prefs.modelos);
  const guardarModelos = lista => { Store.S.prefs.modelos = Proj.normModelos(lista); Persist.meta(); };
  let aberta = null;                                       // (a janela aberta, para os testes: a aba, o estado e o plano)

  /* Desenha um cadeado pequeno em (x, y) (o canto de cima, à esquerda, da marca). */
  function cadeado(g, x, y, s) {
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(20,16,10,0.85)'; g.beginPath(); g.arc(s * 0.5, s * 0.55, s * 0.72, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#f3d28a'; g.lineWidth = Math.max(1.5, s * 0.14); g.beginPath(); g.arc(s * 0.5, s * 0.42, s * 0.22, Math.PI, 0); g.stroke();
    g.fillStyle = '#e6ab4f'; g.fillRect(s * 0.18, s * 0.42, s * 0.64, s * 0.5);
    g.fillStyle = '#3a2a12'; g.fillRect(s * 0.46, s * 0.55, s * 0.08, s * 0.2);
    g.restore();
  }
  // o desenho de uma parte (em quadrados) na prévia: o contorno, o círculo ou a linha grossa
  function caminho(g, f, cell) {
    g.beginPath();
    if (f.k === 'circ') g.arc(f.x * cell, f.y * cell, f.r * cell, 0, Math.PI * 2);
    else f.pts.forEach(([x, y], i) => (i ? g.lineTo(x * cell, y * cell) : g.moveTo(x * cell, y * cell)));
    if (f.k === 'poli') g.closePath();
  }
  // onde vai o cadeado da parte: no canto da casa, no meio da praça, no meio do rio
  function ancora(f) {
    if (f.k === 'circ') return [f.x, f.y];
    if (f.k === 'poli') return [Math.min(...f.pts.map(p => p[0])), Math.min(...f.pts.map(p => p[1]))];
    const p = f.pts[Math.floor(f.pts.length / 2)];
    return [p[0], p[1]];
  }

  /* (lote 7, parte 5a) A chave dos eventos do Mapa-múndi: os nomes deles e o que levam para a cena. */
  function textoEventos(ev) {
    const leva = [];
    if (ev.seco) leva.push('o chão seco');
    for (const k of ev.fx) leva.push('a zona ' + FX.P[k].n + ' cobrindo a cena');
    return 'Com os eventos do Mapa-múndi' + (ev.nomes.length ? ' (' + ev.nomes.join(', ') + ')' : '') + ': ' + leva.join(' e ');
  }
  // as zonas dos eventos cobrindo a cena toda (leves: o véu e o contorno), à mostra para todos; um passo de criar
  function cobrirComZonas(sc, fxs) {
    const c = sc.cell, W = sc.cols, H = sc.rows;
    for (const k of fxs) sc.effects.push({ id: uid('fx'), fx: k, k: 'circ', x: W * c / 2, y: H * c / 2, r: Math.ceil(Math.hypot(W, H) / 2) + 1, w: 1, rw: 2, rh: 2, ang: 0, dir: 0, pow: 0.6, token: null, gm: false, leve: true, by: null, seed: 1 + Math.floor(Math.random() * 997), dur: 0, dur0: 0, at: null, apply: null });
    normalizeScene(sc); Persist.scene(sc.id);
  }
  /* Abre a janela. lugarId: a aba que abre ('vila'); pre: escolhas que já vêm feitas ({ op, estilo, hora, clima, relevo }) e,
     quando quem pede é o Mapa-múndi, o nome da cena (nome) e o id que ela vai ter (id: o marcador do mapa já leva a ele). */
  function abrir(lugarId, pre) {
    if (!isGM()) return;
    const K = UI.kit, { field, seg, btn, note, iconBtn } = K;
    let L = lugar(lugarId) || lugar(App.opt.genLugar) || LUGARES[0];
    const comum = { estilo: Estilos.valido(App.opt.genEstilo), hora: TONES.some(t => t.id === App.opt.genHora) ? App.opt.genHora : 'dia', clima: WEATHERS.some(w => w[0] === App.opt.genClima) ? App.opt.genClima : '', relevo: App.opt.genRelevo !== false, estacao: Estacoes.valida(App.opt.genEstacao) };
    const lembrarComum = () => { App.opt.genEstilo = comum.estilo; App.opt.genHora = comum.hora; App.opt.genClima = comum.clima; App.opt.genRelevo = comum.relevo; App.opt.genEstacao = comum.estacao; App.opt.genLugar = L.id; };
    // (lote 13, parte 13c) a estação vai só para os lugares de fora (os outros não a conhecem)
    const comEstacao = (l, o) => (l.aceitaEstacao ? Object.assign(o, { estacao: comum.estacao }) : o);
    // o estado de cada aba (as escolhas, a semente, o que está travado e o plano na tela): trocar de aba não perde nada
    const estados = {};
    const estadoDe = l => estados[l.id] || (estados[l.id] = { op: l.padrao(), seed: novaSemente(), trava: null, base: null, plano: null });
    if (pre && typeof pre === 'object') {
      if (pre.op) L.aplicarOpcoes(estadoDe(L).op, pre.op);
      if (pre.estilo) comum.estilo = Estilos.valido(pre.estilo);
      if (TONES.some(t => t.id === pre.hora)) comum.hora = pre.hora;
      if (WEATHERS.some(w => w[0] === pre.clima)) comum.clima = pre.clima;
      if (typeof pre.relevo === 'boolean') comum.relevo = pre.relevo;
      if (Estacoes.LISTA.some(e => e[0] === pre.estacao)) comum.estacao = pre.estacao;
    }
    /* (lote 7, parte 5a) o que os eventos do Mapa-múndi levam para a cena (o clima e a hora já vêm nas escolhas de baixo):
       o chão seco (a seca) e as zonas que cobrem a cena (a Lua de sangue, a Névoa de espíritos). Uma chave tira. */
    const evPedido = pre && typeof pre === 'object' && (pre.seco === true || (Array.isArray(pre.fx) && pre.fx.some(k => FX.P[k])))
      ? { seco: pre.seco === true, fx: (Array.isArray(pre.fx) ? pre.fx : []).filter(k => FX.P[k]).slice(0, 4), nomes: (Array.isArray(pre.eventos) ? pre.eventos : []).filter(x => typeof x === 'string').slice(0, 6) } : null;
    comum.comEventos = !!evPedido;
    // o que vale em cada aba: o chão seco só onde o gerador sabe secar (L.aceitaSeco: o Encontro); lá embaixo
    // (L.semHora: a masmorra), nada
    const evDaAba = l => !evPedido || l.semHora ? null : { seco: evPedido.seco && !!l.aceitaSeco, fx: evPedido.fx, nomes: evPedido.nomes };
    const temEv = l => { const e = evDaAba(l); return !!e && (e.seco || e.fx.length > 0); };
    const usaEv = l => comum.comEventos && temEv(l);
    /* (lote 14, parte 14a) O hexágono do Mapa-múndi ("Gerar a cena aqui"): o chão dele e dos vizinhos nas bordas, o rio e
       os caminhos do mapa pelos pontos certos — nas abas que aceitam (o Encontro, nos terrenos de chão de bioma, e a
       Região livre). Uma chave tira. As outras abas também vêm preenchidas (pre.ops: a Região livre com o bioma, a água e
       o caminho do hexágono), sem mexer no que a janela lembra para a próxima vez. */
    const hexPedido = pre && typeof pre === 'object' ? HexCena.valida(pre.hex) : null;
    comum.comHex = !!hexPedido;
    // (lote 14, parte 14b) as marcas da guerra do hexágono: os botões no bloco dele (de começo, todas — menos o exército
    // escondido no mapa)
    comum.guerra = hexPedido && hexPedido.guerra ? MarcasGuerra.padrao(hexPedido.guerra) : null;
    const hexDaAba = l => (hexPedido && l.aceitaHex && l.aceitaHex(estadoDe(l).op, hexPedido) ? hexPedido : null);
    const usaHex = l => (comum.comHex ? hexDaAba(l) : null);
    const comHex = (l, o) => { const hx = usaHex(l); return hx ? Object.assign(o, { hex: hx }, hx.guerra ? { guerra: comum.guerra } : null) : o; };
    if (pre && pre.ops && typeof pre.ops === 'object') {
      const lembrado = Object.assign({}, App.opt);
      for (const id of Object.keys(pre.ops)) { const l = lugar(id); if (l && l !== L && pre.ops[id] && typeof pre.ops[id] === 'object') l.aplicarOpcoes(estadoDe(l).op, pre.ops[id]); }
      for (const k of Object.keys(App.opt)) if (!(k in lembrado)) delete App.opt[k];
      Object.assign(App.opt, lembrado);
    }
    let nomeMexido = !!(pre && typeof pre.nome === 'string' && pre.nome.trim()), foco = -1, sobre = null, modeloNovo = false;
    const idPedido = pre && typeof pre.id === 'string' && /^[A-Za-z0-9_-]{1,60}$/.test(pre.id) ? pre.id : null;
    const cv = h('canvas', { class: 'ger-cv', id: 'ger-prev', width: 460, height: 330, tabindex: 0, 'data-enter': 'proprio', 'aria-label': 'Prévia do lugar. Clique numa parte para travar; com o teclado, as setas escolhem a parte e Enter trava.' });
    const fundo = document.createElement('canvas');
    let cell = 10;
    const ctl = h('div', { class: 'ger-op' }), abas = h('div', { class: 'ger-ab' }), resumo = h('p', { class: 'note', id: 'ger-resumo', role: 'status' }), dica = h('p', { class: 'note ger-dica', id: 'ger-dica' });
    const inNome = h('input', { id: 'ger-nome', class: 'in', type: 'text', maxlength: 60, autocomplete: 'off', 'aria-label': 'Nome da cena', oninput: () => { nomeMexido = true; } });
    if (nomeMexido) inNome.value = pre.nome.trim().slice(0, 60);
    const inSemente = h('input', { id: 'ger-semente', class: 'in num', type: 'number', min: 1, max: 2147483647, step: 1, 'data-enter': 'proprio', 'aria-label': 'A semente do sorteio',
      title: 'A mesma semente, com as mesmas escolhas, dá o mesmo lugar',
      onchange: () => { const v = Math.round(Number(inSemente.value)); if (v >= 1 && v <= 2147483647) { const E = estadoDe(L); E.base = E.plano ? L.baseDe(E.plano) : null; E.seed = v; refazer(); } else inSemente.value = estadoDe(L).seed; },
      onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); inSemente.dispatchEvent(new Event('change')); } } });
    const btOutro = btn('Gerar outro', () => { const E = estadoDe(L); E.base = E.plano ? L.baseDe(E.plano) : null; E.seed = novaSemente(); refazer(); }, { icon: 'reset', id: 'ger-outro', title: 'Sorteia de novo, com as mesmas escolhas; o que está travado fica igual' });
    const btSoltar = btn('Soltar tudo', () => soltarTudo(), { icon: 'unlock', id: 'ger-soltar', title: 'Solta todas as partes travadas (o lugar na tela não muda)' });
    const md = h('div', { class: 'ger-md', id: 'ger-md' }), nota = note(L.nota);

    /* ---- a prévia e as partes ---- */
    const partes = () => (estadoDe(L).plano ? L.partes(estadoDe(L).plano) : []);
    function desenhar() {
      const E = estadoDe(L), p = E.plano;
      if (!p) return;
      if (cv.width !== fundo.width || cv.height !== fundo.height) { cv.width = fundo.width; cv.height = fundo.height; }
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height); g.drawImage(fundo, 0, 0);
      // a hora do dia escolhida tinge a prévia (como na cena) — menos no lugar sem hora (a masmorra, lá embaixo)
      const tom = L.semHora ? null : TONES.find(t => t.id === comum.hora);
      if (tom && tom.tint) { g.fillStyle = tom.tint; g.fillRect(0, 0, cv.width, cv.height); if (tom.id === 'breu') { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, cv.width, cv.height); } }
      const marcar = (parte, modo) => {
        const fs = L.formaDaParte(p, parte);
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        for (const f of fs) {
          caminho(g, f, cell);
          if (f.k === 'linha') {
            g.strokeStyle = modo === 'trava' ? 'rgba(230,171,79,0.35)' : 'rgba(255,255,255,0.22)'; g.lineWidth = (f.hw * 2 + 0.4) * cell; g.stroke();
          } else { g.fillStyle = modo === 'trava' ? 'rgba(230,171,79,0.22)' : 'rgba(255,255,255,0.16)'; g.fill(); }
          if (f.k !== 'linha') { g.strokeStyle = modo === 'trava' ? '#e6ab4f' : '#ffffff'; g.lineWidth = Math.max(2, cell * 0.2); g.setLineDash(modo === 'trava' ? [] : [Math.max(3, cell * 0.4), Math.max(3, cell * 0.3)]); g.stroke(); g.setLineDash([]); }
        }
        g.restore();
        if (modo === 'trava' && fs.length) { const [ax, ay] = ancora(fs[0]), s = Math.max(10, cell * 0.9); cadeado(g, ax * cell + 2, ay * cell + 2, s); }
      };
      for (const parte of partes()) if (L.travada(p, parte)) marcar(parte, 'trava');
      const alvo = sobre || (foco >= 0 ? partes()[foco] : null);
      if (alvo) marcar(alvo, 'sobre');
    }
    function mostrarDica() {
      const E = estadoDe(L), p = E.plano, alvo = sobre || (foco >= 0 ? partes()[foco] : null);
      dica.textContent = alvo && p ? `Clique para ${L.travada(p, alvo) ? 'soltar' : 'travar'} ${L.nomeDaParte(p, alvo)}.` : L.dica || 'Clique numa parte da prévia (uma casa, o rio, as ruas e a praça) para travar: ela fica igual quando você gera outro.';
      cv.classList.toggle('parte', !!sobre);
    }
    function mostrarResumo() {
      const E = estadoDe(L), p = E.plano, n = L.quantasTravadas(p);
      resumo.textContent = L.resumo(p) + (n ? ` ${n === 1 ? 'Uma parte travada' : n + ' partes travadas'}.` : '') + (p.soltas ? ` ${p.soltas === 1 ? 'Uma casa travada não coube e saiu' : p.soltas + ' casas travadas não couberam e saíram'}.` : '');
      btSoltar.disabled = !n;
    }
    function refazer() {
      const E = estadoDe(L);
      E.plano = L.gerar(E.op, comHex(L, comEstacao(L, { estilo: comum.estilo, seed: E.seed, trava: E.trava, base: E.base, seco: usaEv(L) && evDaAba(L).seco })));
      E.trava = L.travaDe(E.plano);                // (o que não coube sai da trava)
      try { const r = L.previa(fundo, E.plano, 460, 330, { relevo: comum.relevo }); cell = r.cell; } catch (e) { console.error(e); }
      sobre = null; foco = -1;
      desenhar(); mostrarDica(); mostrarResumo();
      inSemente.value = E.seed;
      if (!nomeMexido) inNome.value = L.nomePadrao(E.plano);
    }
    function alternar(parte) {
      const E = estadoDe(L);
      if (!E.plano || !parte) return;
      E.trava = L.alternar(E.plano, parte, E.trava);
      desenhar(); mostrarDica(); mostrarResumo();
    }
    function soltarTudo() {
      const E = estadoDe(L);
      if (!E.plano) return;
      for (const parte of partes()) if (L.travada(E.plano, parte)) E.trava = L.alternar(E.plano, parte, E.trava);
      E.trava = null;
      desenhar(); mostrarDica(); mostrarResumo();
    }
    // o ponto do mouse em quadrados do plano (a prévia fica centrada na caixa dela, sem esticar)
    const parteNoPonto = e => {
      const E = estadoDe(L), r = cv.getBoundingClientRect();
      if (!E.plano || !r.width || !cv.width) return null;
      const k = Math.min(r.width / cv.width, r.height / cv.height), ox = (r.width - cv.width * k) / 2, oy = (r.height - cv.height * k) / 2;
      return L.parteEm(E.plano, (e.clientX - r.left - ox) / k / cell, (e.clientY - r.top - oy) / k / cell);
    };
    cv.addEventListener('pointermove', e => { const pt = parteNoPonto(e); if (pt !== sobre) { sobre = pt; foco = -1; desenhar(); mostrarDica(); } });
    cv.addEventListener('pointerleave', () => { if (sobre) { sobre = null; desenhar(); mostrarDica(); } });
    cv.addEventListener('click', e => alternar(parteNoPonto(e)));
    cv.addEventListener('keydown', e => {
      const ps = partes();
      if (!ps.length) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { foco = (foco + 1) % ps.length; sobre = null; }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { foco = (foco - 1 + ps.length) % ps.length; sobre = null; }
      else if ((e.key === 'Enter' || e.key === ' ') && foco >= 0) { e.preventDefault(); e.stopPropagation(); alternar(ps[foco]); return; }
      else return;
      e.preventDefault(); desenhar(); mostrarDica();
    });
    cv.addEventListener('blur', () => { if (foco >= 0) { foco = -1; desenhar(); mostrarDica(); } });

    /* ---- os modelos ---- */
    function pintarModelos(focoId) {
      const lista = modelos();
      if (modeloNovo) {
        const inM = h('input', { id: 'ger-modelo-nome', class: 'in', type: 'text', maxlength: 40, autocomplete: 'off', 'data-enter': 'proprio', 'data-esc': 'proprio', placeholder: 'Nome do modelo', 'aria-label': 'Nome do modelo',
          onkeydown: e => { if (e.key === 'Enter') { e.preventDefault(); guardarModelo(inM.value); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); modeloNovo = false; pintarModelos('ger-guardar'); } } });
        md.replaceChildren(inM, btn('Guardar', () => guardarModelo(inM.value), { kind: 'small', id: 'ger-modelo-ok' }), btn('Cancelar', () => { modeloNovo = false; pintarModelos('ger-guardar'); }, { kind: 'small', id: 'ger-modelo-nao' }));
        inM.value = inNome.value.trim().slice(0, 40);
        setTimeout(() => { inM.focus(); inM.select(); }, 0);
        return;
      }
      const sel = h('select', { id: 'ger-modelo', class: 'in', 'aria-label': 'Abrir um modelo guardado', disabled: !lista.length, value: '',
        onchange: e => { const v = e.target.value; e.target.blur(); if (v) abrirModelo(v); } },
        h('option', { value: '', text: lista.length ? 'Abrir um modelo…' : 'Nenhum modelo guardado' }),
        ...lista.map(m => h('option', { value: m.id, text: m.nome + (lugar(m.lugar) && LUGARES.length > 1 ? ' · ' + lugar(m.lugar).n : '') })));
      md.replaceChildren(...[sel,
        btn('Guardar como modelo', () => { if (modelos().length >= 30) { UI.toast('Já são 30 modelos: apague um para guardar outro.'); return; } modeloNovo = true; pintarModelos(); }, { icon: 'plus', kind: 'small', id: 'ger-guardar', title: 'Guarda as escolhas, a semente e as partes travadas, para gerar outros parecidos' }),
        lista.length ? iconBtn('trash', 'Apagar um modelo…', () => apagarModeloMenu(), { size: 15, id: 'ger-apagar' }) : null].filter(Boolean));
      if (focoId) { const n = document.getElementById(focoId); if (n) n.focus(); }
    }
    function guardarModelo(nome) {
      nome = String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!nome) { UI.toast('Dê um nome ao modelo.'); return; }
      const E = estadoDe(L), lista = modelos();
      const m = { id: uid('md'), nome, lugar: L.id, o: comEstacao(L, Object.assign(L.opcoesDe(E.op), { estilo: comum.estilo, hora: comum.hora, clima: comum.clima, relevo: comum.relevo })), seed: E.seed, trava: L.travaDe(E.plano) };
      guardarModelos(lista.concat([m]));
      modeloNovo = false; pintarModelos('ger-guardar');
      UI.toast(`Modelo "${nome}" guardado: as escolhas, a semente ${E.seed} e as partes travadas.`, { action: 'Desfazer', run: () => { guardarModelos(modelos().filter(x => x.id !== m.id)); if (md.isConnected) pintarModelos(); } });
    }
    function abrirModelo(id) {
      const m = modelos().find(x => x.id === id), l = m && lugar(m.lugar);
      if (!m || !l) { UI.toast('Esse modelo é de um lugar que esta janela não gera.'); pintarModelos(); return; }
      const antes = { L, comum: Object.assign({}, comum), E: JSON.parse(JSON.stringify(Object.assign({}, estadoDe(l), { plano: null }))) };
      L = l;
      const E = estadoDe(L);
      L.aplicarOpcoes(E.op, m.o, { modelo: true });                 // (lote 13, parte 13b: o modelo de antes do chão novo fica no de antes)
      comum.estilo = Estilos.valido(m.o.estilo);
      if (TONES.some(t => t.id === m.o.hora)) comum.hora = m.o.hora;
      if (WEATHERS.some(w => w[0] === m.o.clima)) comum.clima = m.o.clima;
      if (typeof m.o.relevo === 'boolean') comum.relevo = m.o.relevo;
      if (L.aceitaEstacao) comum.estacao = Estacoes.valida(m.o.estacao);       // (o modelo de antes das estações: o verão)
      E.seed = m.seed; E.trava = m.trava; E.base = null;
      lembrarComum(); pintar(); refazer();
      UI.toast(`Modelo "${m.nome}" aberto: a semente ${m.seed} e as partes travadas dele. "Gerar outro" sorteia outros parecidos.`, { action: 'Desfazer', run: () => {
        if (!cv.isConnected) return;
        L = antes.L; Object.assign(comum, antes.comum); estados[l.id] = Object.assign(antes.E, { plano: null }); lembrarComum(); pintar(); refazer();
      } });
    }
    function apagarModeloMenu() {
      const b = document.getElementById('ger-apagar'), r = b ? b.getBoundingClientRect() : { left: 0, bottom: 0 };
      const items = [{ head: 'Apagar qual modelo?' }].concat(modelos().map(m => ({ label: m.nome, icon: 'trash', danger: true, run: () => {
        const lista = modelos();
        guardarModelos(lista.filter(x => x.id !== m.id)); pintarModelos();
        UI.toast(`Modelo "${m.nome}" apagado.`, { action: 'Desfazer', run: () => { guardarModelos(lista); if (md.isConnected) pintarModelos(); } });
      } })));
      UI.menuEm(r.left, r.bottom + 4, items);
    }

    /* ---- as escolhas ---- */
    function pintar() {
      const a = document.activeElement, fid = a && a.id && ctl.contains(a) ? a.id : null;
      const E = estadoDe(L);
      abas.replaceChildren(...(LUGARES.length > 1 ? [seg('ger-lugar', L.id, LUGARES.map(l => [l.id, l.n]), v => { L = lugar(v) || L; lembrarComum(); nomeMexido = false; pintar(); refazer(); })] : []));
      // (lote 14, parte 14a) o hexágono do Mapa-múndi, no alto: a chave e o que vem dele (na aba que não aceita, o porquê)
      const blocoHex = hexDaAba(L) ? h('div', { class: 'ger-hex', id: 'ger-hex-bloco' },
        K.toggle('ger-hex', comum.comHex, v => { comum.comHex = v; const E2 = estadoDe(L); E2.trava = null; E2.base = null; pintar(); refazer(); }, 'Com o hexágono do Mapa-múndi: os vizinhos nas bordas, o rio e os caminhos pelos lados certos'),
        (n => { n.id = 'ger-hex-txt'; return n; })(note(HexCena.texto(hexPedido, L.biomaDe ? L.biomaDe(E.op) : null))),
        comum.comHex && hexPedido.guerra ? MarcasGuerra.campo(hexPedido.guerra, comum.guerra, K, v => { comum.guerra = v; const E2 = estadoDe(L); E2.base = E2.plano ? L.baseDe(E2.plano) : null; pintar(); refazer(); }) : null)
        : hexPedido && L.aceitaHex ? h('div', { class: 'ger-hex', id: 'ger-hex-bloco' }, (n => { n.id = 'ger-hex-nao'; return n; })(note(!HexCena.aceita(hexPedido)
          ? (hexPedido.ter === 'agua' ? 'O hexágono do Mapa-múndi é de água: os vizinhos, o rio e os caminhos dele não entram aqui.' : 'O hexágono do Mapa-múndi não tem terreno: pinte o terreno dele (na aba Terreno do Mapa-múndi) para os vizinhos, o rio e os caminhos entrarem.')
          : 'O hexágono do Mapa-múndi não entra no pântano nem na água: eles cobrem a cena toda.'))) : null;
      ctl.replaceChildren(...[blocoHex,
        L.controles(E.op, K, (regerar, o) => { if (o && o.soltar) { E.trava = null; E.base = null; } else E.base = E.plano ? L.baseDe(E.plano) : null; pintar(); if (regerar) refazer(); }, { hex: usaHex(L) }),
        h('div', { class: 'ger-cm' },
          field('Estilo', seg('ger-est', comum.estilo, Estilos.LISTA.map(([k, n]) => [k, n]), v => { comum.estilo = v; lembrarComum(); const E2 = estadoDe(L); E2.base = E2.plano ? L.baseDe(E2.plano) : null; pintar(); refazer(); }), 'stack'),
          L.semHora ? null : field('Hora do dia', seg('ger-hora', comum.hora, TONES.map(t => [t.id, t.n]), v => { comum.hora = v; lembrarComum(); pintar(); desenhar(); }), 'stack'),
          L.semHora ? null : field('Clima', seg('ger-clima', comum.clima, WEATHERS.map(([k, n]) => [k, n]), v => { comum.clima = v; lembrarComum(); pintar(); }), 'stack'),
          L.aceitaEstacao ? field('Estação', seg('ger-estacao', comum.estacao, Estacoes.LISTA, v => { comum.estacao = v; lembrarComum(); pintar(); refazer(); }), 'stack') : null,
          K.toggle('ger-relevo', comum.relevo, v => { comum.relevo = v; lembrarComum(); pintar(); refazer(); }, L.relevoTxt || 'Com relevo e formas (água, plataformas, torres, bandeirinhas)'),
          temEv(L) ? K.toggle('ger-eventos', comum.comEventos, v => { comum.comEventos = v; pintar(); refazer(); }, textoEventos(evDaAba(L))) : null)].filter(Boolean));
      nota.textContent = L.nota;
      if (fid) { const n = document.getElementById(fid); if (n) n.focus({ preventScroll: true }); }
    }
    pintar(); refazer(); pintarModelos();
    aberta = { get lugar() { return L.id; }, get estado() { return estadoDe(L); }, comum, cell: () => cell };
    const body = h('div', { class: 'ger' },
      abas,
      h('div', { class: 'ger-g' },
        ctl,
        h('div', { class: 'ger-pv' }, cv, h('div', { class: 'row' }, btOutro, btSoltar), dica, resumo)),
      h('div', { class: 'ger-b' },
        h('div', { class: 'ger-sem' }, field('Semente', inSemente, 'stack')),
        h('div', { class: 'ger-mds' }, h('span', { class: 'lb', text: 'Modelos' }), md)),
      field('Nome da cena', inNome, 'stack'),
      nota);
    UI.modal({
      title: 'Gerar um lugar', xl: true, body,
      actions: [{ label: 'Cancelar' }, {
        label: 'Criar a cena', kind: 'primary', keep: true, run: () => {
          const b = UI.kit.card() && UI.kit.card().querySelector('.modal-a .btn.primary');
          if (b) { b.disabled = true; b.textContent = 'Criando…'; }
          const E = estadoDe(L), p = E.plano, l = L;
          l.criar(p, inNome.value, { hora: comum.hora, clima: comum.clima, relevo: comum.relevo, id: idPedido, op: E.op, o: comEstacao(l, Object.assign(l.opcoesDe(E.op), { estilo: comum.estilo, relevo: comum.relevo })) }).then(sc => {
            if (usaEv(l) && evDaAba(l).fx.length) cobrirComZonas(sc, evDaAba(l).fx);
            UI.closeModal();
            UI.switchScene(sc.id);
            UI.toast(l.feito(sc, p), { long: true });
          }, err => { console.error(err); if (b) { b.disabled = false; b.textContent = 'Criar a cena'; } UI.toast('Não deu para criar a cena: ' + ((err && err.message) || 'falha ao guardar o fundo') + '.'); });
          return false;
        },
      }],
    });
  }
  return { LUGARES, abrir, vivo: () => (aberta && document.getElementById('ger-prev') ? aberta : null) };
})();
