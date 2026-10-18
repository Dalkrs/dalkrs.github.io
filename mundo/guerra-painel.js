/* Tiny Cats · Mapa-múndi · a guerra no painel (lote 8, parte 6).
   A aba Guerra (a batalha, os exércitos que se encontraram, os exércitos, os tipos de tropa, os hexágonos marcados e o
   histórico), a seção Exército do grupo (o comandante, a moral, os mantimentos e as unidades), a Fortificação do
   marcador, as fases da frente, a leitura dos jogadores (só os nomes), a janela da batalha (a resumida no d100 e a
   detalhada no d20, em momentos, com o mestre mexendo em cada um) com o depois (a prévia, e aplicar num passo de
   desfazer), os exércitos que se encontram no caminho e os mantimentos de cada dia.
   Usa as ferramentas do painel (MundoPainel.kit): nada aqui muda o mapa direto, tudo passa por App.mudar. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const G = () => window.MundoGuerra;
  const N = () => window.MundoNucleo;
  const app = () => kit().app();
  const NOME_HEX = { d: 'Destruído', c: 'Corrompido' };
  const MORAIS = ['em fuga', 'à beira da fuga', 'abalada', 'nervosa', 'cansada', 'firme', 'confiante', 'animada', 'feroz', 'heroica', 'inabalável'];
  const MOM_NOME = { ab: 'Abertura', ch: 'Choque', vi: 'Virada', de: 'Desfecho' };
  const MOM_DICA = { ab: 'arqueiros e magos', ch: 'o choque das tropas', vi: 'a moral e o comandante', de: 'quem aguenta até o fim' };
  const ARTIGO = { ab: 'a', ch: 'o', vi: 'a', de: 'o' }, EM = { ab: 'na', ch: 'no', vi: 'na', de: 'no' };
  const FIM_NOME = { recuo: 'Recuo', rendicao: 'Rendição', tregua: 'Trégua' };
  const novoId = p => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const sinal = n => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const rng = () => { const A = app(); return (A && typeof A.rng === 'function' ? A.rng : Math.random)(); };

  let encontros = [];                    // os exércitos que se encontraram no caminho: { a, b, dia }
  const unidAbertas = new Set();         // as unidades abertas na seção Exército (só neste painel)
  let bat = null, dl = null;             // a batalha aberta e a janela dela

  /* ---------------- apoio ---------------- */
  const exercitos = m => (m && m.objs ? m.objs.filter(o => o.k === 'g' && o.tipo === 'exercito') : []);
  const comUnidades = g => !!(g && g.exe && !g.exe.pub && g.exe.unid.some(u => u.tropas > 0));
  const tiposDe = m => (m && m.guerra ? m.guerra.tipos : []);
  const guerraDe = d => { if (!d.guerra) d.guerra = { tipos: [], bats: [], hexes: {} }; return d.guerra; };
  const tipoNome = (m, id) => { const t = tiposDe(m).find(x => x.id === id); return t ? t.nome : ''; };
  function mudarUnid(gid, uid, rotulo, fn) {
    return kit().mudarObj(gid, rotulo, x => { const u = x.exe && x.exe.unid.find(q => q.id === uid); if (!u) return false; return fn(u, x); });
  }
  function exeNovo(m) {
    const t = tiposDe(m)[0];
    return { cmd: { nome: '', b: 0, ficha: null }, moral: 5, mant: 10, cons: null, fome: 0, unid: [unidNova(m, 0, t ? t.id : null)] };
  }
  function unidNova(m, n, tipo) {
    return { id: novoId('un'), nome: 'Unidade ' + (n + 1), tipo: tipo || null, tropas: 100, hp: 100, hpMax: 100, atq: 0, def: 0, magos: 0, cerco: 0, equip: [] };
  }
  const textoMoral = n => MORAIS[Math.max(0, Math.min(10, n))] || '';
  function resumoExercito(m, g) {
    const { fmt, plural } = kit(), e = g.exe;
    if (!e || e.pub) return 'Sem unidades';
    const tr = N().tropasDe(e), dias = N().diasDeMantimento(e);
    return plural(tr, 'tropa', 'tropas') + ' · moral ' + e.moral + ' (' + textoMoral(e.moral) + ')' + (dias === Infinity ? '' : ' · mantimentos para ' + plural(dias, 'dia', 'dias'));
  }
  // o hexágono de um ponto ("q,r") e o centro dele
  function hexDoPonto(m, x, y) { const h = N().temGrade(m) ? N().hexDe(m, x, y) : null; return h ? h.q + ',' + h.r : null; }
  function centroDoHex(m, k) { const h = k ? N().lerChaveHex(k) : null; return h && N().temGrade(m) ? N().centroHex(m, h.q, h.r) : null; }

  /* ================= a aba Guerra ================= */
  function abaGuerra(v) {
    const { h, botao, nota, secao, linha, plural } = kit(), A = app(), m = A.mapa, exs = exercitos(m), out = [h('h3', { text: 'Guerra' })];
    const bats = (m.guerra && m.guerra.bats) || [];
    out.push(h('p', { class: 'sub', text: [plural(exs.length, 'exército', 'exércitos'), plural(bats.length, 'batalha', 'batalhas'), plural(tiposDe(m).length, 'tipo de tropa', 'tipos de tropa')].join(' · ') }));
    const prontos = exs.filter(comUnidades);
    out.push(secao('Batalha',
      linha(botao('Nova batalha…', () => abrirBatalha({}), { c: 'pri', k: 'gu:nova', off: prontos.length < 2, title: prontos.length < 2 ? 'Precisa de dois exércitos com unidades' : 'Escolha os dois exércitos e role' }),
        bat && kit().achar(m, bat.a) && kit().achar(m, bat.b) ? botao('Voltar à batalha aberta', () => abrirBatalha(null), { k: 'gu:voltar' }) : null),
      nota(prontos.length < 2 ? 'Para uma batalha, ponha dois exércitos no mapa (a ferramenta Grupo, tipo Exército) e dê unidades a eles, na seção Exército de cada um.'
        : 'Escolha os dois exércitos e quem defende uma fortificação. Depois role a resumida (um d100 de cada lado) ou a detalhada (um d20 em cada momento: Abertura, Choque, Virada e Desfecho).')));
    // os exércitos que se encontraram no caminho (o "Próximo dia" e o "+1 tempo" avisam)
    encontros = encontros.filter(e => kit().achar(m, e.a) && kit().achar(m, e.b));
    if (encontros.length) out.push(secao('Exércitos que se encontraram', h('div', { class: 'lista' }, encontros.map((e, i) => h('div', { class: 'gu-enc', 'data-k': 'gu:enc:' + e.a + ':' + e.b },
      h('span', { class: 'tx' }, h('b', { text: kit().nomeDe(kit().achar(m, e.a), m) + ' × ' + kit().nomeDe(kit().achar(m, e.b), m) }), h('small', { text: 'no dia ' + kit().dataTxt(m, e.dia) })),
      botao('Abrir a batalha', () => abrirBatalha({ a: e.a, b: e.b }), { c: 'sm pri', k: 'gu:enc-abrir:' + i }),
      h('button', { type: 'button', class: 'ib', title: 'Tirar da lista', 'aria-label': 'Tirar da lista', 'data-k': 'gu:enc-x:' + i, onclick: () => { encontros.splice(i, 1); kit().pintar(); } }, kit().glifo(kit().X_SVG, 14)))))));
    // os exércitos
    out.push(secao('Exércitos', exs.length
      ? h('div', { class: 'lista' }, exs.map(g => h('button', { type: 'button', class: 'li clic', 'data-k': 'gu:ex:' + g.id, onclick: () => { kit().abrirAba('selecao'); kit().irPara(g.id); } },
        kit().icone(g, m), h('span', { class: 'tx' }, h('b', { text: kit().nomeDe(g, m) }), h('small', { text: resumoExercito(m, g) })),
        g.exe && !g.exe.pub && g.exe.fome ? h('span', { class: 'tag guerra', text: 'sem mantimentos' }) : null)))
      : nota('Nenhum exército no mapa. Ponha um grupo (ferramenta Grupo) e escolha o tipo Exército na seção dele.')));
    out.push(secTipos(m), secHexes(m), secHistorico(m));
    return out;
  }

  /* ---- os tipos de tropa: a tabela do mestre (vazia no começo) ---- */
  function secTipos(m) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero, caixa } = kit(), A = app(), tipos = tiposDe(m), out = [];
    const mudarTipo = (id, rot, fn) => A.mudar(rot, d => { const t = guerraDe(d).tipos.find(x => x.id === id); if (!t) return false; return fn(t, d); });
    if (!tipos.length) out.push(nota('Nenhum tipo ainda. Crie os tipos das suas tropas (Infantaria, Cavalaria, Arqueiros…) e diga quem leva vantagem contra quem.'));
    for (const t of tipos) {
      const outros = tipos.filter(x => x.id !== t.id);
      out.push(h('div', { class: 'gu-tipo', 'data-k': 'gu:tipo:' + t.id },
        h('div', { class: 'row' },
          campoTexto('gu:tipo:' + t.id + ':nome', 'Nome', t.nome, v => mudarTipo(t.id, 'mudar o nome do tipo', x => { if (!v.trim()) return false; x.nome = v.trim(); }), { max: 60 }),
          h('button', { type: 'button', class: 'ib', title: 'Apagar o tipo', 'aria-label': 'Apagar o tipo ' + t.nome, 'data-k': 'gu:tipo:' + t.id + ':x',
            onclick: () => { if (A.mudar('apagar o tipo de tropa', d => { const g = guerraDe(d); g.tipos = g.tipos.filter(x => x.id !== t.id); }) !== false) kit().avisoDesfazer('O tipo "' + t.nome + '" saiu: as unidades dele ficaram sem tipo.'); } }, kit().glifo(kit().X_SVG, 14))),
        caixa('gu:tipo:' + t.id + ':dist', 'À distância (arqueiros, besteiros…)', t.dist, v => mudarTipo(t.id, 'mudar o tipo de tropa', x => { x.dist = !!v; }), { dica: 'Entra na Abertura, junto com os magos.' }),
        outros.length ? h('div', { class: 'gu-vant' }, h('span', { class: 'gu-vant-tit', text: 'Vantagem contra' }),
          outros.map(x => campoNumero('gu:tipo:' + t.id + ':v:' + x.id, x.nome, t.vant[x.id] || 0, n => mudarTipo(t.id, 'mudar a vantagem', y => { if ((y.vant[x.id] || 0) === n) return false; if (n) y.vant[x.id] = n; else delete y.vant[x.id]; }), { min: -20, max: 20 }))) : null));
    }
    const max = (N().LIMITES && N().LIMITES.tiposGuerra) || 40;
    out.push(linha(botao('Novo tipo', () => {
      const id = novoId('tp');
      if (A.mudar('criar um tipo de tropa', d => { guerraDe(d).tipos.push({ id, nome: 'Tipo ' + (tipos.length + 1), dist: false, vant: {} }); }) !== false) kit().focar('gu:tipo:' + id + ':nome');
    }, { c: 'sm', k: 'gu:tipo:novo', off: tipos.length >= max })));
    out.push(nota('A vantagem é um bônus no d20 de quem tem aquele tipo, contra o outro tipo (no d100, vale 5 vezes): Lanceiros contra Cavalaria +3, por exemplo. Para menos, use o sinal de menos.'));
    return secao('Tipos de tropa', out);
  }

  /* ---- os hexágonos destruídos e corrompidos ---- */
  function secHexes(m) {
    const { h, nota, secao } = kit(), A = app(), hs = (m.guerra && m.guerra.hexes) || {}, ks = Object.keys(hs), out = [];
    if (!ks.length) out.push(nota('Nenhum hexágono destruído ou corrompido. Marque no depois de uma batalha, ou com o botão direito num hexágono do mapa.'));
    else out.push(h('div', { class: 'lista' }, ks.slice(0, 60).map(k => h('div', { class: 'gu-hex', 'data-k': 'gu:hex:' + k },
      h('i', { class: 'gu-hex-cor gu-hex-' + hs[k] }),
      h('span', { class: 'tx' }, h('b', { text: NOME_HEX[hs[k]] }), h('small', { text: 'hexágono ' + k })),
      kit().botao('Ir até lá', () => { const c = centroDoHex(m, k); if (c && window.MundoTela) window.MundoTela.centrar({ x: c.x, y: c.y }); }, { c: 'sm', k: 'gu:hex-ir:' + k }),
      h('button', { type: 'button', class: 'ib', title: 'Tirar a marca', 'aria-label': 'Tirar a marca do hexágono ' + k, 'data-k': 'gu:hex-x:' + k,
        onclick: () => { if (marcarHex(k, null) !== false) kit().avisoDesfazer('O hexágono voltou ao normal.'); } }, kit().glifo(kit().X_SVG, 14))))));
    if (ks.length) out.push(nota('Aparecem no mapa, na camada Guerra, também para os jogadores.'));
    void A;
    return secao('Hexágonos', out);
  }
  // marca (d, c) ou tira (null) um hexágono
  function marcarHex(k, est) {
    return app().mudar(est ? 'marcar o hexágono' : 'tirar a marca do hexágono', d => {
      const g = guerraDe(d);
      if (est) { if (g.hexes[k] === est) return false; g.hexes[k] = est; } else { if (!g.hexes[k]) return false; delete g.hexes[k]; }
    });
  }
  // (o menu do mapa) o hexágono do ponto: as opções de marcar
  function menuHex(p) {
    const A = app(), m = A.mapa;
    if (!m || !N().temGrade(m) || !A.podeEditar()) return [];
    const k = hexDoPonto(m, p[0], p[1]);
    if (!k) return [];
    const atual = m.guerra && m.guerra.hexes[k];
    const out = [];
    if (atual !== 'd') out.push(['Hexágono destruído', () => { if (marcarHex(k, 'd') !== false) kit().avisoDesfazer('Hexágono destruído (camada Guerra).'); }]);
    if (atual !== 'c') out.push(['Hexágono corrompido', () => { if (marcarHex(k, 'c') !== false) kit().avisoDesfazer('Hexágono corrompido (camada Guerra).'); }]);
    if (atual) out.push(['Tirar a marca do hexágono', () => { if (marcarHex(k, null) !== false) kit().avisoDesfazer('O hexágono voltou ao normal.'); }]);
    return out;
  }

  /* ---- o histórico das batalhas ---- */
  function secHistorico(m) {
    const { h, nota, secao } = kit(), bats = ((m.guerra && m.guerra.bats) || []).slice().reverse(), out = [];
    if (!bats.length) out.push(nota('Nenhuma batalha ainda. Cada batalha aplicada fica aqui, com os dados de cada momento e o que você escreveu.'));
    else out.push(h('div', { class: 'lista' }, bats.slice(0, 30).map(b => h('button', { type: 'button', class: 'li clic', 'data-k': 'gu:bat:' + b.id, onclick: () => verBatalha(b.id) },
      h('span', { class: 'tx' }, h('b', { text: b.nome || (b.a.nome + ' × ' + b.b.nome) }),
        h('small', { text: kit().dataTxt(m, b.d) + ' · ' + (b.modo === 'd20' ? 'detalhada' : 'resumida') + ' · ' + G().textoFim(b.fim, b.a.nome, b.b.nome) }))))));
    return secao('Histórico', out);
  }
  // uma batalha do histórico, para ler (os momentos e as notas) e escrever mais
  async function verBatalha(id) {
    const A = app(), m = A.mapa, b = m.guerra && m.guerra.bats.find(x => x.id === id);
    if (!b) return;
    const linhas = b.mom.map(x => (b.modo === 'd20' ? MOM_NOME[x.k] + ': ' : 'd100: ') + b.a.nome + ' ' + x.ta + ' (dado ' + x.da + ') × ' + b.b.nome + ' ' + x.tb + ' (dado ' + x.db + ')' + (x.chave ? ' · momento-chave' : '') + (x.nota ? ' — ' + x.nota : ''));
    const texto = [kit().dataTxt(m, b.d) + ' · ' + G().textoFim(b.fim, b.a.nome, b.b.nome) + '.'].concat(linhas, b.notas.map(t => '“' + t + '”')).join('\n');
    const v = await kit().janela({ titulo: b.nome || (b.a.nome + ' × ' + b.b.nome), texto, ok: 'Guardar', cancelar: 'Fechar',
      campos: [{ id: 'nota', rotulo: 'Escrever o que aconteceu (fica no histórico)', tipo: 'text', valor: '', max: 600, ph: 'O general caiu na Virada…' }] });
    if (!v || !String(v.nota || '').trim()) return;
    A.mudar('escrever na batalha', d => { const x = guerraDe(d).bats.find(q => q.id === id); if (!x) return false; x.notas.push(String(v.nota).trim().slice(0, 600)); });
  }

  /* ================= o grupo: a seção Exército ================= */
  function secExercito(o, m) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero, fmt, plural, mudarObj } = kit(), id = o.id, e = o.exe && !o.exe.pub ? o.exe : null;
    if (!e) return [secao('Exército', nota('Este exército ainda não tem unidades: as tropas, o HP, o ATQ e a DEF, os magos, as máquinas de cerco e os equipamentos.'),
      linha(botao('Pôr as unidades', () => { if (mudarObj(id, 'pôr as unidades', x => { x.exe = exeNovo(m); }) !== false) { const u = (kit().achar(app().mapa, id) || {}).exe; if (u && u.unid[0]) unidAbertas.add(u.unid[0].id); } }, { c: 'pri sm', k: 'o:' + id + ':exe' })))];
    const L = G().lado(m, o), tr = N().tropasDe(e), cons = N().consumoDe(e), dias = N().diasDeMantimento(e), out = [];
    out.push(h('p', { class: 'status' }, h('b', { text: plural(tr, 'tropa', 'tropas') }), ' · força ' + fmt(L.forca, 0) + ' · ATQ ' + fmt(L.atq, 1) + ' · DEF ' + fmt(L.def, 1)
      + (L.magos ? ' · ' + plural(L.magos, 'mago', 'magos') : '') + (L.cerco ? ' · ' + plural(L.cerco, 'máquina de cerco', 'máquinas de cerco') : '')));
    // o comandante
    out.push(h('div', { class: 'row' },
      campoTexto('o:' + id + ':cmd', 'Comandante', e.cmd.nome, v => mudarObj(id, 'mudar o comandante', x => { x.exe.cmd.nome = v.trim(); }), { max: 80, ph: comandanteDaFicha(e) || 'Quem comanda' }),
      campoNumero('o:' + id + ':cmdb', 'Bônus (d20)', e.cmd.b, n => mudarObj(id, 'mudar o bônus do comandante', x => { x.exe.cmd.b = n; }), { min: -20, max: 20 })));
    const ficha = fichaDoComandante(o);
    if (ficha) out.push(ficha);
    // a moral e os mantimentos
    out.push(h('div', { class: 'row' },
      campoNumero('o:' + id + ':moral', 'Moral (0 a 10)', e.moral, n => mudarObj(id, 'mudar a moral', x => { x.exe.moral = n; }), { min: 0, max: 10, erro: 'A moral vai de 0 (em fuga) a 10 (inabalável); 5 é firme.' }),
      campoNumero('o:' + id + ':mant', 'Mantimentos', e.mant, n => mudarObj(id, 'mudar os mantimentos', x => { x.exe.mant = n; if (n > 0) x.exe.fome = 0; }), { min: 0, max: 1e9 }),
      campoNumero('o:' + id + ':cons', 'Por dia', e.cons == null ? '' : e.cons, n => mudarObj(id, 'mudar o consumo', x => { x.exe.cons = n; }), { min: 1, max: 1e7, vazio: null, ph: String(Math.ceil(tr / 100) || 0) })));
    out.push(nota('Moral ' + e.moral + ': ' + textoMoral(e.moral) + '. ' + (cons > 0 ? 'Comem ' + fmt(cons, 0) + ' por dia' + (e.cons == null ? ' (um por cem soldados)' : '') + ': dá para ' + plural(dias, 'dia', 'dias') + '.' : 'Sem consumo.')
      + (e.fome ? ' Sem mantimentos há ' + plural(e.fome, 'dia', 'dias') + ': a moral cai 1 por dia, e a fome tira ATQ nas batalhas.' : ' No "Próximo dia", vem a proposta de descontar; quando acabam, a moral cai e a fome tira ATQ.'),
      e.fome ? 'aviso' : null));
    return [secao('Exército', out), secUnidades(o, m),
      linha(botao('Abrir uma batalha com este exército…', () => abrirBatalha({ a: id }), { k: 'o:' + id + ':batalha', off: !comUnidades(o) }))];
  }
  // a ficha do comandante (na mesa): o nome e o retrato
  function personagens() {
    const TC = window.TC;
    if (!app().naMesa || !TC || !TC.dados || !TC.dados.disponivel || !TC.dados.disponivel()) return null;
    const P = TC.dados.col('personagens');
    if (!P || typeof P.todas !== 'function') return null;
    if (!P.__guerraEspera) { P.__guerraEspera = true; Promise.resolve(P.pronta).then(() => kit().pintar(), () => {}); }
    const st = (TC.ponte && TC.ponte.estado) || {}, camp = st.campanha ? st.campanha.id : null;
    return P.todas().filter(l => l && !l.apagado && !(l.ficha && l.ficha.petDe) && (!camp || !l.campanha || l.campanha === camp));
  }
  function comandanteDaFicha(e) {
    const ps = e.cmd.ficha ? personagens() : null, l = ps ? ps.find(x => x.id === e.cmd.ficha) : null;
    return l ? l.nome || '' : '';
  }
  function fichaDoComandante(o) {
    const { h, campoEscolha, mudarObj } = kit(), e = o.exe, ps = personagens();
    if (!ps) return e.cmd.ficha ? kit().nota('Ligado a uma ficha (aparece dentro do site, na mesa).') : null;
    const l = e.cmd.ficha ? ps.find(x => x.id === e.cmd.ficha) : null, img = l && l.ficha && typeof l.ficha.img === 'string' && /^(https:|data:image\/)/.test(l.ficha.img) ? l.ficha.img : null;
    return h('div', { class: 'row gu-ficha' },
      img ? h('img', { class: 'gu-retrato', src: img, alt: '', width: 34, height: 34 }) : null,
      campoEscolha('o:' + o.id + ':cmdficha', 'Ficha do comandante', e.cmd.ficha || '', [['', 'Nenhuma']].concat(ps.map(x => [x.id, x.nome || 'Sem nome'])),
        v => mudarObj(o.id, 'ligar o comandante a uma ficha', x => { x.exe.cmd.ficha = v || null; }), { dica: 'Opcional: o nome e o retrato vêm da ficha.' }));
  }

  /* ---- as unidades ---- */
  function secUnidades(o, m) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero, campoEscolha, caixa, plural, mudarObj } = kit(), id = o.id, e = o.exe, tipos = tiposDe(m), out = [];
    const opsTipo = [['', 'Sem tipo']].concat(tipos.map(t => [t.id, t.nome]));
    const num = (u, campo, rot, o2) => campoNumero('o:' + id + ':u:' + u.id + ':' + campo, rot, u[campo], n => mudarUnid(id, u.id, 'mudar a unidade', x => { if (x[campo] === n) return false; x[campo] = n; if (campo === 'hpMax' && x.hp > n) x.hp = n; }), o2);
    for (const u of e.unid) {
      const aberta = unidAbertas.has(u.id), tn = tipoNome(m, u.tipo), eqB = u.equip.reduce((s, q) => s + q.atq, 0), eqD = u.equip.reduce((s, q) => s + q.def, 0);
      const resumo = plural(u.tropas, 'tropa', 'tropas') + (tn ? ' · ' + tn : '') + ' · ATQ ' + (u.atq + eqB) + ' · DEF ' + (u.def + eqD) + (u.hp < u.hpMax ? ' · HP ' + u.hp + '/' + u.hpMax : '') + (u.oc ? ' · escondida' : '');
      const corpo = aberta ? h('div', { class: 'gu-unid-corpo' },
        h('div', { class: 'row' },
          campoTexto('o:' + id + ':u:' + u.id + ':nome', 'Nome', u.nome, v => mudarUnid(id, u.id, 'mudar o nome da unidade', x => { if (!v.trim()) return false; x.nome = v.trim(); }), { max: 80 }),
          campoEscolha('o:' + id + ':u:' + u.id + ':tipo', 'Tipo', u.tipo || '', opsTipo, v => mudarUnid(id, u.id, 'mudar o tipo da unidade', x => { x.tipo = v || null; }))),
        h('div', { class: 'row gu-nums' },
          num(u, 'tropas', 'Tropas', { min: 0, max: 1e7 }), num(u, 'hp', 'HP', { min: 0, max: u.hpMax }), num(u, 'hpMax', 'HP máx.', { min: 1, max: 1e7 })),
        h('div', { class: 'row gu-nums' },
          num(u, 'atq', 'ATQ', { min: -99, max: 99 }), num(u, 'def', 'DEF', { min: -99, max: 99 })),
        h('div', { class: 'row gu-nums' },
          num(u, 'magos', 'Magos', { min: 0, max: 1e7 }), num(u, 'cerco', 'Máquinas de cerco', { min: 0, max: 1e4 })),
        secEquip(o, u),
        caixa('o:' + id + ':u:' + u.id + ':oc', 'Escondida dos jogadores', !!u.oc, v => mudarUnid(id, u.id, 'esconder a unidade', x => { if (v) x.oc = true; else delete x.oc; }), { dica: 'Os jogadores veem o nome e o tipo das outras (nunca os números).' }),
        linha(
          botao('Duplicar', () => { const nid = novoId('un'); if (mudarObj(id, 'duplicar a unidade', x => { const i = x.exe.unid.findIndex(q => q.id === u.id); if (i < 0 || x.exe.unid.length >= ((N().LIMITES && N().LIMITES.unidades) || 40)) return false; x.exe.unid.splice(i + 1, 0, Object.assign(JSON.parse(JSON.stringify(u)), { id: nid, nome: u.nome + ' (cópia)' })); }) !== false) unidAbertas.add(nid); }, { c: 'sm', k: 'o:' + id + ':u:' + u.id + ':dup' }),
          botao('Apagar', () => { if (mudarObj(id, 'apagar a unidade', x => { x.exe.unid = x.exe.unid.filter(q => q.id !== u.id); }) !== false) kit().avisoDesfazer('A unidade "' + u.nome + '" saiu.'); }, { c: 'sm per', k: 'o:' + id + ':u:' + u.id + ':apagar' }))) : null;
      out.push(h('div', { class: 'gu-unid' + (aberta ? ' aberta' : ''), 'data-k': 'o:' + id + ':u:' + u.id },
        h('button', { type: 'button', class: 'gu-unid-tit', 'aria-expanded': aberta ? 'true' : 'false', 'data-k': 'o:' + id + ':u:' + u.id + ':abre',
          onclick: () => { if (unidAbertas.has(u.id)) unidAbertas.delete(u.id); else unidAbertas.add(u.id); kit().pintar(); } },
          h('b', { text: u.nome }), h('small', { text: resumo })),
        corpo));
    }
    const max = (N().LIMITES && N().LIMITES.unidades) || 40;
    out.push(linha(botao('Nova unidade', () => {
      const t = tipos[0], nu = unidNova(m, e.unid.length, t ? t.id : null);
      if (mudarObj(id, 'criar uma unidade', x => { if (x.exe.unid.length >= max) return false; x.exe.unid.push(nu); }) !== false) { unidAbertas.add(nu.id); kit().focar('o:' + id + ':u:' + nu.id + ':nome'); }
    }, { c: 'sm', k: 'o:' + id + ':u:nova', off: e.unid.length >= max })));
    if (!tipos.length) out.push(linha(nota('Sem tipos de tropa ainda: crie na aba Guerra (com as vantagens de um contra o outro).'), botao('Abrir a aba Guerra', () => kit().abrirAba('guerra'), { c: 'sm', k: 'o:' + id + ':ir-guerra' })));
    return secao('Unidades', out);
  }
  function secEquip(o, u) {
    const { h, campoTexto, campoNumero, botao } = kit(), id = o.id, base = 'o:' + id + ':u:' + u.id + ':eq';
    const linhas = u.equip.map((q, i) => h('div', { class: 'row gu-eq', 'data-k': base + ':' + i },
      campoTexto(base + ':' + i + ':nome', 'Equipamento', q.nome, v => mudarUnid(id, u.id, 'mudar o equipamento', x => { if (!x.equip[i] || !v.trim()) return false; x.equip[i].nome = v.trim(); }), { max: 80, rotulo: 'Equipamento' }),
      campoNumero(base + ':' + i + ':atq', 'ATQ', q.atq, n => mudarUnid(id, u.id, 'mudar o equipamento', x => { if (!x.equip[i]) return false; x.equip[i].atq = n; }), { min: -99, max: 99 }),
      campoNumero(base + ':' + i + ':def', 'DEF', q.def, n => mudarUnid(id, u.id, 'mudar o equipamento', x => { if (!x.equip[i]) return false; x.equip[i].def = n; }), { min: -99, max: 99 }),
      h('button', { type: 'button', class: 'ib', title: 'Tirar o equipamento', 'aria-label': 'Tirar ' + q.nome, 'data-k': base + ':' + i + ':x',
        onclick: () => mudarUnid(id, u.id, 'tirar o equipamento', x => { x.equip.splice(i, 1); }) }, kit().glifo(kit().X_SVG, 14))));
    const max = (N().LIMITES && N().LIMITES.equipamentos) || 12;
    return h('div', { class: 'gu-eqs' }, linhas,
      botao('Novo equipamento', () => { if (mudarUnid(id, u.id, 'pôr um equipamento', x => { if (x.equip.length >= max) return false; x.equip.push({ nome: 'Equipamento', atq: 1, def: 0 }); }) !== false) kit().focar(base + ':' + u.equip.length + ':nome'); }, { c: 'sm', k: base + ':novo', off: u.equip.length >= max }));
  }

  /* ================= o marcador: a Fortificação ================= */
  function secFortificacao(o) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero, mudarObj } = kit(), id = o.id, e = o.estr;
    if (!e) return secao('Fortificação', nota('Uma muralha, um forte, uma paliçada: quem defende aqui ganha a DEF dela na batalha, e as máquinas de cerco do outro lado a danificam.'),
      linha(botao('Pôr uma fortificação', () => mudarObj(id, 'pôr uma fortificação', x => { x.estr = { nome: '', def: 3, hp: 100, hpMax: 100 }; }), { c: 'sm', k: 'o:' + id + ':estr' })));
    const est = e.hp <= 0 ? 'em ruínas: não protege' : e.hp < e.hpMax ? 'danificada (' + Math.round(e.hp / e.hpMax * 100) + '%)' : 'intacta';
    return secao('Fortificação',
      h('div', { class: 'row' },
        campoTexto('o:' + id + ':estr-nome', 'Nome', e.nome, v => mudarObj(id, 'mudar a fortificação', x => { x.estr.nome = v.trim(); }), { max: 80, ph: 'Muralhas' }),
        campoNumero('o:' + id + ':estr-def', 'DEF (d20)', e.def, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.def = n; }), { min: 0, max: 20 })),
      h('div', { class: 'row' },
        campoNumero('o:' + id + ':estr-hp', 'HP', e.hp, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.hp = n; }), { min: 0, max: e.hpMax }),
        campoNumero('o:' + id + ':estr-hpmax', 'HP máx.', e.hpMax, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.hpMax = n; if (x.estr.hp > n) x.estr.hp = n; }), { min: 1, max: 1e6 })),
      h('p', { class: 'status' }, h('span', { class: 'tag' + (e.hp < e.hpMax ? ' guerra' : ''), text: est }), ' · protege com ' + sinal(Math.round(e.def * e.hp / e.hpMax)) + ' quem defende aqui'),
      linha(botao('Consertar', () => mudarObj(id, 'consertar a fortificação', x => { if (x.estr.hp === x.estr.hpMax) return false; x.estr.hp = x.estr.hpMax; }), { c: 'sm', k: 'o:' + id + ':estr-conserta', off: e.hp >= e.hpMax }),
        botao('Tirar', () => { if (mudarObj(id, 'tirar a fortificação', x => { delete x.estr; }) !== false) kit().avisoDesfazer('A fortificação saiu.'); }, { c: 'sm per', k: 'o:' + id + ':estr-tirar' })));
  }

  /* ================= a frente: as fases ================= */
  function secFasesFrente(o, m) {
    const { h, botao, nota, secao, linha, dataTxt, mudarObj } = kit(), id = o.id, dia = m.cal.dia, fases = o.fases || [], iHoje = N().faseNoDia(o, dia), temHoje = fases.some(f => f.dia === dia), fs = [];
    fs.push(h('div', { class: 'tabela fases' },
      h('div', null, h('span', { text: 'A linha de partida' }), h('b', { text: iHoje < 0 ? 'hoje' : '' })),
      fases.map((f, i) => h('div', null, h('span', { text: 'A partir de ' + dataTxt(m, f.dia) }), h('b', { text: i === iHoje ? 'hoje' : '' }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'o:' + id + ':ffase-x:' + f.dia, title: 'Tirar esta fase', 'aria-label': 'Tirar a fase de ' + dataTxt(m, f.dia),
          onclick: () => { if (mudarObj(id, 'tirar a fase da frente', x => { x.fases = (x.fases || []).filter(y => y.dia !== f.dia); if (!x.fases.length) delete x.fases; }) !== false) kit().avisoDesfazer('A fase saiu: nesses dias vale a linha de antes.'); } }, kit().glifo(kit().X_SVG, 14))))));
    fs.push(linha(botao('Mudar a linha a partir de hoje', () => {
      const r = mudarObj(id, 'nova fase da frente', x => {
        x.fases = x.fases || [];
        if (x.fases.some(y => y.dia === dia)) return false;
        x.fases.push({ dia, pts: N().copia(N().formaNoDia(x, dia)) });
        x.fases.sort((a, b) => a.dia - b.dia);
      });
      if (r !== false) { app().usarFerramenta('sel'); kit().avisoDesfazer('Nova fase a partir de hoje: arraste os pontos da frente para mudar a linha. Nos dias de antes, vale a linha antiga.'); }
    }, { c: 'sm', k: 'o:' + id + ':ffase', off: temHoje || fases.length >= ((N().LIMITES && N().LIMITES.fases) || 60) })));
    fs.push(nota(temHoje ? 'Uma fase começa hoje: arraste os pontos da frente no mapa para mudar a linha.'
      : 'A frente anda com as batalhas (o depois de cada uma cria a fase de hoje) — ou à mão: crie uma fase hoje e arraste os pontos.'));
    return secao('Fases da frente', fs);
  }

  /* ================= a leitura dos jogadores: o exército sem os números ================= */
  function leituraExercito(o, v) {
    const { h, secao, nota } = kit(), e = o.exe;
    if (!e || !e.unid || !e.unid.length) return null;
    return secao('Exército',
      e.cmd && e.cmd.nome ? nota('Comandante: ' + e.cmd.nome + '.') : null,
      h('div', { class: 'lista' }, e.unid.map(u => h('div', { class: 'li' }, h('span', { class: 'tx' }, h('b', { text: u.nome }), tipoNome(v, u.tipo) ? h('small', { text: tipoNome(v, u.tipo) }) : null)))));
  }

  /* ================= os exércitos que se encontram e os mantimentos (o tempo do mundo) ================= */
  // depois de passar o tempo: os pares novos (que antes não estavam a 1 hexágono) — o aviso oferece abrir a batalha
  function ofertarBatalhas(pares, dia) {
    const A = app(), m = A.mapa;
    for (const [a, b] of pares) if (!encontros.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a))) encontros.push({ a, b, dia });
    if (!pares.length) return;
    const [a, b] = pares[0], ga = kit().achar(m, a), gb = kit().achar(m, b);
    if (ga && gb) A.toast('Exércitos frente a frente: ' + kit().nomeDe(ga, m) + ' e ' + kit().nomeDe(gb, m) + (pares.length > 1 ? ' (e mais ' + (pares.length - 1) + ' na aba Guerra)' : '') + '.', 'Abrir a batalha', () => abrirBatalha({ a, b }), 12000);
  }
  // a proposta do "Próximo dia": descontar os mantimentos de cada exército (e a moral de quem ficou sem)
  async function proporMantimentos(dias) {
    const A = app(), m = A.mapa, props = G().mantimentosDoDia(m, dias);
    if (!props.length) return;
    const { fmt } = kit();
    const linhas = props.map(p => [p.g, p.nome + ': ' + fmt(p.mant0, 0) + ' → ' + fmt(p.mant1, 0) + (p.fome1 > p.fome0 ? ' — acabou: moral ' + p.moral0 + ' → ' + p.moral1 + ', e a fome tira ATQ' : ' (' + (p.dura === 1 ? 'mais 1 dia' : 'mais ' + p.dura + ' dias') + ')')]);
    const v = await kit().janela({ titulo: 'Os mantimentos ' + (dias > 1 ? 'destes ' + dias + ' dias' : 'do dia'), texto: 'Cada exército come pelo tamanho da tropa. Descontar? Desmarque quem não deve.', ok: 'Descontar', cancelar: 'Agora não',
      campos: [{ id: 'quem', rotulo: 'Quem come', tipo: 'caixas', opcoes: linhas, valor: linhas.map(x => x[0]) }] });
    if (!v) return;
    const quem = new Set(Array.isArray(v.quem) ? v.quem : []), escolhidas = props.filter(p => quem.has(p.g));
    if (!escolhidas.length) return;
    if (A.mudar('os mantimentos do dia', d => {
      for (const p of escolhidas) { const g = kit().achar(d, p.g); if (!g || !g.exe) continue; g.exe.mant = p.mant1; g.exe.fome = p.fome1; g.exe.moral = p.moral1; }
    }) !== false) kit().avisoDesfazer('Mantimentos descontados: ' + escolhidas.map(p => p.nome).join(', ') + '.');
  }

  /* ================= a janela da batalha ================= */
  /* bat: { a, b (ids dos exércitos), estr: { m, lado } | null, hex, mestre: [bônus do mestre], modo: null | 'd100' | 'd20',
     res (a resumida), moms (os momentos da detalhada), fim, notas, tela: 'montar' | 'depois', frente: { f, n } | null, hexEst } */
  async function abrirBatalha(o) {
    const A = app(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    if (o) {
      const exs = exercitos(m).filter(comUnidades);
      const a = o.a && exs.some(g => g.id === o.a) ? o.a : (exs[0] || {}).id, b = o.b && exs.some(g => g.id === o.b) && o.b !== a ? o.b : (exs.find(g => g.id !== a) || {}).id;
      if (!a || !b) { A.toast('Para uma batalha, os dois lados precisam ser exércitos com unidades.'); return; }
      // (outra batalha com dados rolados está aberta: pergunta antes de perder o que foi rolado; com os mesmos lados, volta a ela)
      if (bat && temRolagem() && (bat.a !== a || bat.b !== b)) {
        const ok = await kit().confirmar({ titulo: 'Começar outra batalha?', texto: 'A batalha aberta (' + kit().nomeDe(kit().achar(m, bat.a) || {}, m) + ' × ' + kit().nomeDe(kit().achar(m, bat.b) || {}, m) + ') já tem dados rolados e se perde.', ok: 'Começar outra', cancelar: 'Voltar à aberta', perigo: true });
        if (!ok) { mostrarJanela(); return; }
        bat = null;
      }
      if (!bat || bat.a !== a || bat.b !== b) bat = novaBatalha(m, a, b);
    }
    if (!bat) return;
    mostrarJanela();
  }
  function novaBatalha(m, a, b) {
    const x = { a, b, estr: null, hex: null, mestre: [], modo: null, res: null, moms: [], fim: null, notas: [], tela: 'montar', frente: null, hexEst: null, form: null, formAberto: false, formM: null };
    lugarDaBatalha(m, x);
    return x;
  }
  const temRolagem = () => !!(bat && (bat.res || bat.moms.length || bat.fim));
  // onde: o hexágono de quem está sendo atacado (B), se os dois estão perto; senão, o do meio. A fortificação: a de um
  // marcador a até 1 hexágono de um dos lados (quem está perto dela defende)
  function lugarDaBatalha(m, x) {
    const ga = kit().achar(m, x.a), gb = kit().achar(m, x.b);
    if (!ga || !gb) return;
    const N_ = N();
    let hx = null;
    if (N_.temGrade(m)) {
      const ha = N_.hexDe(m, ga.x, ga.y), hb = N_.hexDe(m, gb.x, gb.y);
      hx = ha && hb && N_.distHex(ha, hb) <= 1 ? hb.q + ',' + hb.r : hexDoPonto(m, (ga.x + gb.x) / 2, (ga.y + gb.y) / 2);
    }
    x.hex = hx;
    x.estr = null;
    const ops = fortificacoesPerto(m, x);
    if (ops.length) x.estr = { m: ops[0].m, lado: ops[0].lado };
    x.frente = frentePadrao(m, x);
  }
  function fortificacoesPerto(m, x) {
    const N_ = N(), out = [];
    for (const q of ['b', 'a']) {
      const g = kit().achar(m, x[q]);
      if (!g) continue;
      for (const mk of m.objs) {
        if (mk.k !== 'm' || !mk.estr) continue;
        const perto = N_.temGrade(m) ? (h1 => h1 && (h2 => h2 && N_.distHex(h1, h2) <= 1)(N_.hexDe(m, mk.x, mk.y)))(N_.hexDe(m, g.x, g.y)) : Math.hypot(mk.x - g.x, mk.y - g.y) < 60;
        if (perto && !out.some(o => o.m === mk.id)) out.push({ m: mk.id, lado: q });
      }
    }
    return out;
  }
  // a frente que anda: a dos dois lados (pelas facções); várias, a mais perto da batalha
  function frentePadrao(m, x) {
    const ga = kit().achar(m, x.a), gb = kit().achar(m, x.b), fs = m.objs.filter(o => o.k === 'f');
    if (!ga || !gb || !fs.length) return null;
    const lados = new Set([ga.fac, gb.fac].filter(Boolean));
    const cand = fs.filter(f => lados.size === 2 && lados.has(f.a) && lados.has(f.b));
    if (!cand.length) return null;
    const bx = (ga.x + gb.x) / 2, by = (ga.y + gb.y) / 2, dist = f => Math.min(...N().formaNoDia(f, m.cal.dia).map(([px, py]) => Math.hypot(px - bx, py - by)));
    cand.sort((p, q) => dist(p) - dist(q));
    return { f: cand[0].id, n: null };
  }
  function contexto(m) {
    let estr = null;
    if (bat.estr) { const mk = kit().achar(m, bat.estr.m); if (mk && mk.estr) estr = { lado: bat.estr.lado, def: mk.estr.def, hp: mk.estr.hp, hpMax: mk.estr.hpMax }; }
    return { estr, mestre: bat.mestre };
  }
  const lados = m => [G().lado(m, kit().achar(m, bat.a)), G().lado(m, kit().achar(m, bat.b))];

  // a janela: criada uma vez por batalha; Esc ou fechar com dados rolados pergunta antes
  function mostrarJanela() {
    if (!dl) {
      const corpo = document.createElement('div');
      corpo.className = 'gb-corpo';
      dl = document.createElement('dialog');
      dl.className = 'mundo-dl gb';
      dl.setAttribute('aria-label', 'Batalha');
      dl.append(corpo);
      dl.addEventListener('cancel', ev => { ev.preventDefault(); fecharJanela(); });
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
    }
    pintarBatalha();
    if (!dl.open) dl.showModal();
  }
  function fecharJanela(forcar) {
    if (!dl) return;
    if (!forcar && temRolagem() && bat && bat.tela !== 'aplicada') {
      // (a batalha fica guardada enquanto a página está aberta: "Voltar à batalha aberta", na aba Guerra)
      app().toast('A batalha ficou aberta: volte a ela pela aba Guerra ("Voltar à batalha aberta").');
    } else if (bat && !temRolagem() && !bat.mestre.length && !bat.notas.length) bat = null;   // (sem nada feito, não fica nada guardado)
    try { dl.close(); } catch (e) { /* já fechada */ }
    dl.remove(); dl = null;
    kit().pintar();
  }
  function pintarBatalha() {
    if (!dl || !bat) return;
    const A = app(), m = A.mapa, ga = m && kit().achar(m, bat.a), gb = m && kit().achar(m, bat.b);
    // (um dos exércitos saiu do mapa: a batalha não tem mais como seguir)
    if (!ga || !gb) { bat = null; fecharJanela(true); A.toast('Um dos exércitos desta batalha não está mais no mapa.'); return; }
    const corpo = dl.querySelector('.gb-corpo');
    if (!ga || !gb) { bat = null; fecharJanela(true); A.toast('Um dos exércitos não está mais no mapa.'); return; }
    const foco = document.activeElement && corpo.contains(document.activeElement) ? document.activeElement.getAttribute('data-k') : null;
    const tela = bat.tela, rolagem = corpo.__tela === tela ? corpo.scrollTop : 0;
    corpo.replaceChildren(...(tela === 'depois' ? telaDepois(m) : telaBatalha(m)));
    corpo.__tela = tela;
    corpo.scrollTop = rolagem;                                  // (a janela não pula para o topo a cada dado)
    if (foco) { const el = corpo.querySelector('[data-k="' + foco + '"]'); if (el) el.focus({ preventScroll: true }); }
    if (bat.mostrar) { const el = corpo.querySelector('[data-k="' + bat.mostrar + '"]'); bat.mostrar = null; if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); }
  }
  const el = (tag, attrs, ...kids) => kit().h(tag, attrs, ...kids);
  function bt(texto, fn, o = {}) { return el('button', { type: 'button', class: 'btn' + (o.c ? ' ' + o.c : ''), 'data-k': o.k, title: o.title, disabled: o.off, onclick: fn }, texto); }

  function telaBatalha(m) {
    const [A_, B_] = lados(m), ctx = contexto(m), out = [];
    const nomeA = A_.nome, nomeB = B_.nome, rolou = temRolagem();
    out.push(el('div', { class: 'gb-topo' }, el('h2', { text: 'Batalha' }), el('span', { class: 'note', text: kit().dataTxt(m, m.cal.dia) + (bat.hex ? ' · hexágono ' + bat.hex : '') }),
      bt('Fechar', () => fecharJanela(), { c: 'sm', k: 'gb:fechar' })));
    // os lados (trocar depois de rolar recomeça)
    const exs = exercitos(m).filter(comUnidades), op = (sel, outro) => exs.filter(g => g.id !== outro).map(g => el('option', { value: g.id, selected: g.id === sel ? true : null, text: kit().nomeDe(g, m) }));
    const trocar = q => ev => { bat[q] = ev.target.value; Object.assign(bat, novaBatalha(m, bat.a, bat.b)); pintarBatalha(); };
    out.push(el('div', { class: 'gb-lados' },
      el('label', { class: 'field' }, el('span', { text: 'Lado A' }), el('select', { class: 'in', 'data-k': 'gb:a', disabled: rolou || null, onchange: trocar('a') }, op(bat.a, bat.b))),
      el('b', { class: 'gb-x', text: '×' }),
      el('label', { class: 'field' }, el('span', { text: 'Lado B' }), el('select', { class: 'in', 'data-k': 'gb:b', disabled: rolou || null, onchange: trocar('b') }, op(bat.b, bat.a)))));
    // a fortificação
    const fts = fortificacoesPerto(m, bat);
    if (fts.length) {
      const nomeL = q => (q === 'a' ? nomeA : nomeB);
      out.push(el('label', { class: 'field' }, el('span', { text: 'Fortificação' }),
        el('select', { class: 'in', 'data-k': 'gb:estr', disabled: rolou || null, onchange: ev => { const v = ev.target.value; bat.estr = v ? { m: v.split('|')[0], lado: v.split('|')[1] } : null; pintarBatalha(); } },
          [el('option', { value: '', text: 'Ninguém defende uma fortificação', selected: !bat.estr ? true : null })].concat(fts.map(f => { const mk = kit().achar(m, f.m); return el('option', { value: f.m + '|' + f.lado, selected: bat.estr && bat.estr.m === f.m && bat.estr.lado === f.lado ? true : null, text: nomeL(f.lado) + ' defende ' + (mk.estr.nome || kit().nomeDe(mk, m)) }); })))));
    }
    if (rolou && !bat.fim) out.push(el('p', { class: 'note', text: 'Para trocar os lados ou a fortificação, recomece a batalha.' }));
    // a comparação
    out.push(comparacao(m, A_, B_));
    // os bônus do mestre
    out.push(secMestre(m, nomeA, nomeB));
    // a rolagem
    if (!bat.modo) {
      out.push(el('div', { class: 'gb-sec' }, el('b', { text: 'Rolar' }),
        el('div', { class: 'row' },
          bt('Resumida (d100)', () => { bat.modo = 'd100'; rolarResumida(); }, { c: 'pri', k: 'gb:d100', title: 'Um d100 de cada lado, mais 5 vezes os bônus' }),
          bt('Detalhada (d20, em momentos)', () => { bat.modo = 'd20'; rolarMomento(); }, { k: 'gb:d20', title: 'Um d20 de cada lado em cada momento: Abertura, Choque, Virada e Desfecho' })),
        bonusTotais(A_, B_, ctx)));
    } else if (bat.modo === 'd100') out.push(...telaResumida(nomeA, nomeB, A_, B_, ctx));
    else out.push(...telaDetalhada(nomeA, nomeB));
    // o fim
    if (bat.fim) out.push(el('div', { class: 'gb-fim', 'data-k': 'gb:fim' }, el('b', { text: G().textoFim(bat.fim, nomeA, nomeB) }),
      el('div', { class: 'row' }, bt('Ver o depois…', () => { bat.tela = 'depois'; if (bat.frente && bat.frente.n == null) bat.frente.n = bat.fim.vence ? G().AVANCO[bat.fim.tam] : 0; pintarBatalha(); }, { c: 'pri', k: 'gb:depois' }),
        bt('Recomeçar', recomecar, { k: 'gb:recomecar' }))));
    else if (rolou) out.push(el('div', { class: 'row gb-pe' }, bt('Recomeçar', recomecar, { c: 'sm', k: 'gb:recomecar' })));
    // escrever (geral)
    out.push(secNotas());
    return out;
  }
  function recomecar() { const m = app().mapa; Object.assign(bat, novaBatalha(m, bat.a, bat.b)); pintarBatalha(); }
  // a tabela dos dois lados
  function comparacao(m, A_, B_) {
    const { fmt, plural } = kit(), ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b), ea = ga.exe, eb = gb.exe;
    const lin = (rot, va, vb) => el('div', null, el('span', { text: rot }), el('b', { text: va }), el('b', { text: vb }));
    const mant = e => { if (!e || e.pub) return '—'; const d = N().diasDeMantimento(e); return e.fome ? 'sem há ' + plural(e.fome, 'dia', 'dias') : d === Infinity ? '—' : plural(d, 'dia', 'dias'); };
    return el('div', { class: 'gb-sec' }, el('b', { text: 'Os dois lados' }),
      el('div', { class: 'gb-tab' },
        el('div', { class: 'gb-cab' }, el('span'), el('b', { text: A_.nome }), el('b', { text: B_.nome })),
        lin('Tropas', fmt(A_.tropas, 0), fmt(B_.tropas, 0)),
        lin('Força (tropas × HP)', fmt(A_.forca, 0), fmt(B_.forca, 0)),
        lin('ATQ / DEF médios', fmt(A_.atq, 1) + ' / ' + fmt(A_.def, 1), fmt(B_.atq, 1) + ' / ' + fmt(B_.def, 1)),
        lin('Magos', fmt(A_.magos, 0), fmt(B_.magos, 0)),
        lin('À distância (força)', fmt(A_.dist, 0), fmt(B_.dist, 0)),
        lin('Máquinas de cerco', fmt(A_.cerco, 0), fmt(B_.cerco, 0)),
        lin('Moral', A_.moral + ' · ' + textoMoral(A_.moral), B_.moral + ' · ' + textoMoral(B_.moral)),
        lin('Comandante', (A_.cmdNome || '—') + ' (' + sinal(A_.cmd) + ')', (B_.cmdNome || '—') + ' (' + sinal(B_.cmd) + ')'),
        lin('Mantimentos', mant(ea), mant(eb))));
  }
  const listaBonus = bs => (bs.length ? bs.map(b => b.nome + ' ' + sinal(b.v)).join(' · ') : 'nenhum');
  function bonusTotais(A_, B_, ctx) {
    const ba = G().bonus(A_, B_, ctx, 'a', 'd100'), bb = G().bonus(B_, A_, ctx, 'b', 'd100');
    return el('div', { class: 'gb-bonus' },
      el('p', null, el('b', { text: A_.nome + ': ' + sinal(G().total(ba)) }), ' ', el('small', { text: listaBonus(ba) })),
      el('p', null, el('b', { text: B_.nome + ': ' + sinal(G().total(bb)) }), ' ', el('small', { text: listaBonus(bb) })),
      el('p', { class: 'note', text: 'Os bônus na escala do d20. Na resumida, cada ponto vale 5 no d100; na detalhada, cada momento soma só os dele.' }));
  }
  // os bônus do mestre: tática, terreno, reforço, magia (e outro), de um lado, na batalha toda ou num momento
  function secMestre(m, nomeA, nomeB) {
    const f = bat.form || (bat.form = { lado: 'a', tipo: 'tatica', v: 2, mom: '', txt: '' });
    const chips = bat.mestre.map((b, i) => el('span', { class: 'chip gb-chip', 'data-k': 'gb:mestre:' + i },
      (b.lado === 'a' ? nomeA : nomeB) + ': ' + G().BONUS_MESTRE[b.tipo] + ' ' + sinal(b.v) + (b.mom ? ' (' + MOM_NOME[b.mom] + ')' : '') + (b.txt ? ' — ' + b.txt : ''),
      el('button', { type: 'button', class: 'ib', 'aria-label': 'Tirar o bônus', title: 'Tirar o bônus', 'data-k': 'gb:mestre-x:' + i, onclick: () => { bat.mestre.splice(i, 1); recalcular(); } }, kit().glifo(kit().X_SVG, 12))));
    return el('div', { class: 'gb-sec' }, el('b', { text: 'Bônus do mestre' }),
      chips.length ? el('div', { class: 'gb-chips' }, chips) : el('p', { class: 'note', text: 'Uma tática, o terreno, um reforço que chegou, uma magia: um bônus (ou um menos) para um dos lados.' }),
      bat.formAberto ? formBonus(nomeA, nomeB, f, 'gb:f-', null, () => { bat.formAberto = false; pintarBatalha(); })
        : el('div', { class: 'row' }, bt('Pôr um bônus…', () => {
          bat.formAberto = true; bat.mostrar = 'gb:f-form'; pintarBatalha();
          const c = dl && dl.querySelector('[data-k="gb:f-v"]'); if (c) { c.focus({ preventScroll: true }); c.select(); }
        }, { c: 'sm', k: 'gb:f-abre' })));
  }
  // o formulário de um bônus (o da batalha toda, ou o de um momento, que abre no próprio momento)
  function formBonus(nomeA, nomeB, f, pref, momFixo, cancelar) {
    const sel = (k, rot, val, ops, set, c) => el('select', { class: 'in' + (c ? ' ' + c : ''), 'data-k': pref + k, 'aria-label': rot, onchange: ev => set(ev.target.value) }, ops.map(([v, t]) => el('option', { value: v, text: t, selected: String(v) === String(val) ? true : null })));
    const por = () => {
      if (!f.v) { app().toast('Escolha um número (para menos, use o sinal de menos).'); return; }
      bat.mestre.push({ lado: f.lado, tipo: f.tipo, v: Math.max(-10, Math.min(10, f.v)), mom: momFixo || f.mom || null, txt: f.txt.trim().slice(0, 80) });
      f.txt = '';
      if (momFixo) bat.formM = null; else bat.formAberto = false;
      recalcular();
    };
    const nInput = el('input', { class: 'in', type: 'number', min: -10, max: 10, step: 1, value: String(f.v), 'data-k': pref + 'v', 'aria-label': 'Quanto (de −10 a 10)', oninput: ev => { f.v = Math.round(Number(ev.target.value) || 0); } });
    const tInput = el('input', { class: 'in gb-f-txt', type: 'text', maxlength: 80, value: f.txt, placeholder: 'O porquê (opcional)', 'data-k': pref + 'txt', 'aria-label': 'O porquê', oninput: ev => { f.txt = ev.target.value; },
      onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); por(); } } });
    return el('div', { class: 'gb-form' + (momFixo ? ' gb-form-mom' : ''), 'data-k': pref + 'form' },
      momFixo ? el('p', { class: 'note gb-f-tit', text: 'Um bônus só ' + EM[momFixo] + ' ' + MOM_NOME[momFixo] + ' (o dado fica; o resultado muda na hora):' }) : null,
      sel('lado', 'Para qual lado', f.lado, [['a', nomeA], ['b', nomeB]], v => { f.lado = v; }, 'gb-f-lado'),
      sel('tipo', 'Que bônus', f.tipo, Object.keys(G().BONUS_MESTRE).map(k => [k, G().BONUS_MESTRE[k]]), v => { f.tipo = v; }),
      nInput,
      momFixo ? null : sel('mom', 'Quando', f.mom, [['', 'A batalha toda']].concat(Object.keys(MOM_NOME).map(k => [k, 'Só ' + EM[k] + ' ' + MOM_NOME[k]])), v => { f.mom = v; }, 'gb-f-mom'),
      tInput,
      el('div', { class: 'gb-f-bts' }, cancelar ? bt('Cancelar', cancelar, { c: 'sm', k: pref + 'cancelar' }) : null, bt('Pôr o bônus', por, { c: 'sm', k: pref + 'por' })));
  }
  // os mesmos dados, com os bônus de agora (mudar um bônus muda o momento — o dado fica)
  function recalcular() {
    const m = app().mapa, [A_, B_] = lados(m), ctx = contexto(m);
    if (bat.res) { bat.res = G().resumida(A_, B_, ctx, null, [bat.res.da, bat.res.db]); if (!bat.fim || bat.fim.como === 'dados') bat.fim = { vence: bat.res.vence, tam: bat.res.tam, como: 'dados' }; }
    if (bat.moms.length) {
      bat.moms = bat.moms.map(x => Object.assign(G().momento(x.k, A_, B_, ctx, null, [x.da, x.db]), x.nota ? { nota: x.nota } : {}));
      if (bat.fim && bat.fim.como === 'dados') bat.fim = G().fimDetalhada(bat.moms);
    }
    pintarBatalha();
  }
  function rolarResumida() {
    const m = app().mapa, [A_, B_] = lados(m);
    bat.res = G().resumida(A_, B_, contexto(m), rng);
    bat.fim = { vence: bat.res.vence, tam: bat.res.tam, como: 'dados' };
    bat.mostrar = 'gb:fim';
    pintarBatalha();
  }
  function telaResumida(nomeA, nomeB) {
    const r = bat.res, out = [];
    if (!r) return out;
    const linhaLado = (nome, d, bs, t) => el('p', null, el('b', { text: nome + ': ' + t }), ' ', el('small', { text: 'd100 ' + d + ' + 5 × ' + sinal(G().total(bs)) + ' (' + listaBonus(bs) + ')' }));
    out.push(el('div', { class: 'gb-sec gb-res', 'data-k': 'gb:res' }, el('b', { text: 'Resumida (d100)' }),
      linhaLado(nomeA, r.da, r.ba, r.ta), linhaLado(nomeB, r.db, r.bb, r.tb),
      el('p', { class: 'gb-margem', text: 'Margem ' + Math.abs(r.m) + ': ' + (r.vence ? G().TAMANHOS[r.tam].toLocaleLowerCase('pt-BR') + ' de ' + (r.vence === 'a' ? nomeA : nomeB) : 'empate') + '.' }),
      el('div', { class: 'row' }, bt('Rolar de novo', rolarResumida, { c: 'sm', k: 'gb:d100-de-novo' }), botaoParar('gb:res-parar'))));
    return out;
  }
  // a detalhada: os momentos rolados e o próximo
  function rolarMomento(refazer) {
    const m = app().mapa, [A_, B_] = lados(m), ctx = contexto(m);
    if (refazer) { const ult = bat.moms.pop(); if (!ult) return; bat.moms.push(G().momento(ult.k, A_, B_, ctx, rng)); }
    else { const k = G().MOMENTOS[bat.moms.length]; if (!k) return; bat.moms.push(G().momento(k, A_, B_, ctx, rng)); }
    bat.fim = bat.moms.length === G().MOMENTOS.length ? G().fimDetalhada(bat.moms) : null;
    bat.formM = null;
    bat.mostrar = bat.fim ? 'gb:fim' : 'gb:proximo';
    pintarBatalha();
  }
  function telaDetalhada(nomeA, nomeB) {
    const out = [], ult = bat.moms.length - 1, placar = bat.moms.reduce((s, x) => s + x.m, 0);
    const cards = bat.moms.map((x, i) => {
      const ganhou = x.m > 0 ? nomeA : x.m < 0 ? nomeB : null, porque = x.chave ? (x.da === 20 || x.db === 20 ? 'saiu 20' : x.da === 1 || x.db === 1 ? 'saiu 1' : 'disputa apertada') : '';
      return el('div', { class: 'gb-mom' + (x.chave ? ' chave' : ''), 'data-k': 'gb:mom:' + i },
        el('div', { class: 'gb-mom-tit' }, el('b', { text: MOM_NOME[x.k] }), el('small', { text: MOM_DICA[x.k] }), x.chave ? el('span', { class: 'tag tensao', text: 'momento-chave · ' + porque }) : null),
        el('p', null, el('b', { text: nomeA + ' ' + x.ta }), el('small', { text: ' (d20 ' + x.da + ', ' + listaBonus(x.ba) + ')' })),
        el('p', null, el('b', { text: nomeB + ' ' + x.tb }), el('small', { text: ' (d20 ' + x.db + ', ' + listaBonus(x.bb) + ')' })),
        el('p', { class: 'gb-margem', text: ganhou ? ganhou + ' leva o momento, por ' + Math.abs(x.m) + '.' : 'Empatado.' }),
        x.nota ? el('p', { class: 'gb-nota', text: '“' + x.nota + '”' }) : null,
        i === ult && !(bat.fim && bat.fim.como !== 'dados') ? acoesDoMomento(x, i) : null,
        i === ult && bat.formM && bat.formM.i === i ? formBonus(nomeA, nomeB, bat.formM, 'gb:fm-', x.k, () => { bat.formM = null; pintarBatalha(); }) : null);
    });
    out.push(el('div', { class: 'gb-sec' }, el('b', { text: 'Detalhada (d20) · placar ' + sinal(placar) + ' (para ' + (placar > 0 ? nomeA : placar < 0 ? nomeB : 'ninguém') + ')' }), cards,
      !bat.fim && bat.moms.length < G().MOMENTOS.length ? el('div', { class: 'row' },
        (prox => bt((bat.moms.length && bat.moms[ult].chave ? 'Seguir para ' : 'Rolar ') + ARTIGO[prox] + ' ' + MOM_NOME[prox], () => rolarMomento(false), { c: 'pri', k: 'gb:proximo' }))(G().MOMENTOS[bat.moms.length])) : null,
      bat.moms.length && bat.moms[ult].chave && !bat.fim ? el('p', { class: 'note', text: 'Momento-chave: antes de seguir, você pode mudar um bônus, rolar de novo, escrever o que aconteceu ou parar a batalha.' }) : null));
    return out;
  }
  function acoesDoMomento(x, i) {
    return el('div', { class: 'row gb-acoes' },
      bt('Mudar um bônus', () => {
        bat.formM = bat.formM && bat.formM.i === i ? null : { i, lado: 'a', tipo: 'tatica', v: 2, txt: '' };
        bat.mostrar = bat.formM ? 'gb:fm-form' : null;
        pintarBatalha();
        const c = bat.formM && dl && dl.querySelector('[data-k="gb:fm-v"]'); if (c) { c.focus({ preventScroll: true }); c.select(); }
      }, { c: 'sm', k: 'gb:mom-bonus:' + i, title: 'Põe um bônus neste momento (o dado fica: o resultado muda na hora)' }),
      bt('Rolar de novo', () => rolarMomento(true), { c: 'sm', k: 'gb:mom-de-novo:' + i }),
      bt('Escrever', async () => {
        const v = await escreverNota('O que aconteceu ' + EM[x.k] + ' ' + MOM_NOME[x.k] + '?', x.nota || '');
        if (v == null) return;
        if (bat.moms[i]) { if (v) bat.moms[i].nota = v; else delete bat.moms[i].nota; }
        pintarBatalha();
      }, { c: 'sm', k: 'gb:mom-nota:' + i }),
      botaoParar('gb:mom-parar:' + i));
  }
  // parar a batalha: o recuo ou a rendição de um lado, ou a trégua
  function botaoParar(k) {
    const m = app().mapa, ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b), nA = kit().nomeDe(ga, m), nB = kit().nomeDe(gb, m);
    return el('select', { class: 'in gb-parar', 'data-k': k, 'aria-label': 'Parar a batalha', onchange: ev => {
      const v = ev.target.value;
      if (!v) return;
      const [como, por] = v.split('|');
      bat.fim = G().parar(como, por || null);
      bat.mostrar = 'gb:fim';
      pintarBatalha();
    } },
    el('option', { value: '', text: 'Parar a batalha…' }),
    el('option', { value: 'recuo|a', text: 'Recuo de ' + nA }), el('option', { value: 'recuo|b', text: 'Recuo de ' + nB }),
    el('option', { value: 'rendicao|a', text: 'Rendição de ' + nA }), el('option', { value: 'rendicao|b', text: 'Rendição de ' + nB }),
    el('option', { value: 'tregua|', text: 'Trégua' }));
  }
  function secNotas() {
    return el('div', { class: 'gb-sec' }, el('b', { text: 'O que aconteceu' }),
      bat.notas.length ? el('div', null, bat.notas.map((t, i) => el('p', { class: 'gb-nota', 'data-k': 'gb:nota:' + i }, '“' + t + '” ',
        el('button', { type: 'button', class: 'ib', 'aria-label': 'Tirar a nota', title: 'Tirar a nota', 'data-k': 'gb:nota-x:' + i, onclick: () => { bat.notas.splice(i, 1); pintarBatalha(); } }, kit().glifo(kit().X_SVG, 12))))) : null,
      el('div', { class: 'row' }, bt('Escrever o que aconteceu', async () => { const v = await escreverNota('O que aconteceu na batalha?', ''); if (v) { bat.notas.push(v); pintarBatalha(); } }, { c: 'sm', k: 'gb:escrever' })),
      el('p', { class: 'note', text: 'Fica no histórico da batalha (aba Guerra), com os dados de cada momento.' }));
  }
  // uma pergunta de texto por cima da janela da batalha (o <dialog> do painel fecharia esta)
  function escreverNota(titulo, valor) {
    return new Promise(resolve => {
      const ta = el('textarea', { class: 'in', rows: 3, maxlength: 400, 'data-k': 'gb:nota-in', 'aria-label': titulo }); ta.value = valor;
      const caixa = el('div', { class: 'gb-pergunta', role: 'group', 'aria-label': titulo }, el('b', { text: titulo }), ta,
        el('div', { class: 'row' }, bt('Cancelar', () => fim(null), { c: 'sm', k: 'gb:nota-cancelar' }), bt('Guardar', () => fim(ta.value.trim().slice(0, 400)), { c: 'sm pri', k: 'gb:nota-ok' })));
      const fim = v => { caixa.remove(); resolve(v); };
      ta.addEventListener('keydown', ev => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); fim(ta.value.trim().slice(0, 400)); } if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fim(null); } });
      dl.querySelector('.gb-corpo').append(caixa);
      ta.focus();
    });
  }

  /* ---- o depois: a prévia, e aplicar (um passo de desfazer) ---- */
  function configDepois() { return { a: { g: bat.a }, b: { g: bat.b }, fim: bat.fim, estr: bat.estr, hex: bat.hex, frente: bat.frente && bat.frente.f ? { f: bat.frente.f, n: bat.frente.n || 0 } : null, hexEst: bat.hexEst }; }
  function telaDepois(m) {
    const { fmt } = kit(), prev = G().depois(m, configDepois()), ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b), nA = kit().nomeDe(ga, m), nB = kit().nomeDe(gb, m), out = [];
    out.push(el('div', { class: 'gb-topo' }, el('h2', { text: 'Depois da batalha' }), el('span', { class: 'note', text: G().textoFim(bat.fim, nA, nB) }), bt('Fechar', () => fecharJanela(), { c: 'sm', k: 'gb:fechar' })));
    out.push(el('p', { class: 'note', text: 'Confira o que muda. Nada muda no mapa até "Aplicar" — e depois dá para desfazer.' }));
    for (const q of ['a', 'b']) {
      const L = prev.lados[q];
      if (!L) continue;
      out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:' + q }, el('b', { text: L.nome + ' — perde ' + Math.round(L.perda * 100) + '%' }),
        el('div', { class: 'gb-tab gb-tab3' },
          el('div', { class: 'gb-cab' }, el('span', { text: 'Unidade' }), el('b', { text: 'Tropas' }), el('b', { text: 'HP' })),
          L.unid.map(u => el('div', { class: u.acaba ? 'acaba' : null }, el('span', { text: u.nome + (u.acaba ? ' — acaba (sai do exército)' : '') }), el('b', { text: fmt(u.tropas0, 0) + ' → ' + fmt(u.tropas1, 0) }), el('b', { text: u.hp0 + ' → ' + u.hp1 })))),
        el('p', null, 'Moral ' + L.moral0 + ' → ', el('b', { text: String(L.moral1) }), ' (' + textoMoral(L.moral1) + ') · mantimentos ' + fmt(L.mant0, 0) + ' → ', el('b', { text: fmt(L.mant1, 0) }), ' (um dia de batalha)')));
    }
    if (prev.estr) out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:estr' }, el('b', { text: 'Fortificação: ' + prev.estr.nome }),
      el('p', null, 'HP ' + prev.estr.hp0 + ' → ', el('b', { text: String(prev.estr.hp1) }), ' de ' + prev.estr.hpMax + (prev.estr.hp1 <= 0 ? ' — em ruínas' : prev.estr.dano ? ' (dano ' + prev.estr.dano + ')' : ''))));
    // a frente
    const fs = m.objs.filter(o => o.k === 'f');
    if (fs.length) {
      const fr = bat.frente || { f: '', n: 0 };
      out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:frente' }, el('b', { text: 'A frente' }),
        el('div', { class: 'row' },
          el('label', { class: 'field' }, el('span', { text: 'Qual frente anda' }), el('select', { class: 'in', 'data-k': 'gb:frente', onchange: ev => { bat.frente = ev.target.value ? { f: ev.target.value, n: bat.frente && bat.frente.n != null ? bat.frente.n : bat.fim.vence ? G().AVANCO[bat.fim.tam] : 0 } : null; pintarBatalha(); } },
            [el('option', { value: '', text: 'Nenhuma', selected: !fr.f ? true : null })].concat(fs.map(f => el('option', { value: f.id, text: kit().nomeDe(f, m), selected: f.id === fr.f ? true : null }))))),
          el('label', { class: 'field' }, el('span', { text: 'Anda (hexágonos)' }), el('input', { class: 'in', type: 'number', min: 0, max: 8, step: 1, value: String(fr.f ? fr.n || 0 : 0), disabled: !fr.f || !bat.fim.vence ? true : null, 'data-k': 'gb:frente-n',
            onchange: ev => { if (bat.frente) { bat.frente.n = Math.max(0, Math.min(8, Math.round(Number(ev.target.value) || 0))); pintarBatalha(); } } }))),
        el('p', { class: 'note', text: !bat.fim.vence ? 'Sem vencedor, a frente fica onde está.' : prev.frente ? 'A partir de hoje (fase nova), a linha anda ' + prev.frente.n + ' hexágono' + (prev.frente.n === 1 ? '' : 's') + ' para o lado de quem perdeu, perto da batalha. Depois, dá para ajustar arrastando os pontos.' : 'A frente fica onde está.' })));
    }
    // o hexágono
    if (bat.hex) {
      const radio = (v, t) => el('label', { class: 'op' }, el('input', { type: 'radio', name: 'gb-hex', value: v, checked: (bat.hexEst || '') === v ? true : null, 'data-k': 'gb:hex:' + (v || 'nada'), onchange: () => { bat.hexEst = v || null; pintarBatalha(); } }), el('span', { text: t }));
      out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:hex' }, el('b', { text: 'O hexágono da batalha (' + bat.hex + ')' }),
        el('div', { class: 'gb-radios' }, radio('', 'Fica como está'), radio('d', 'Destruído'), radio('c', 'Corrompido'))));
    }
    out.push(el('div', { class: 'row gb-pe' }, bt('Voltar', () => { bat.tela = 'montar'; pintarBatalha(); }, { k: 'gb:voltar' }), bt('Aplicar', aplicarBatalha, { c: 'pri', k: 'gb:aplicar' })));
    return out;
  }
  function aplicarBatalha() {
    const A = app(), m = A.mapa, ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b);
    if (!ga || !gb || !bat.fim) return;
    const prev = G().depois(m, configDepois()), nA = kit().nomeDe(ga, m), nB = kit().nomeDe(gb, m);
    const mom = bat.modo === 'd100' && bat.res ? [{ k: 'ch', da: bat.res.da, db: bat.res.db, ta: bat.res.ta, tb: bat.res.tb }]
      : bat.moms.map(x => Object.assign({ k: x.k, da: x.da, db: x.db, ta: x.ta, tb: x.tb }, x.chave ? { chave: true } : {}, x.nota ? { nota: x.nota } : {}));
    const reg = { id: novoId('bt'), d: m.cal.dia, nome: nA + ' × ' + nB, a: { nome: nA, g: ga.id, fac: ga.fac || null }, b: { nome: nB, g: gb.id, fac: gb.fac || null },
      modo: bat.modo === 'd20' ? 'd20' : 'd100', mom, fim: { vence: bat.fim.vence, tam: bat.fim.tam, como: bat.fim.como }, notas: bat.notas.slice(), hex: bat.hex || undefined };
    const texto = G().textoFim(bat.fim, nA, nB);
    if (A.mudar('a batalha ' + nA + ' × ' + nB, d => { G().aplicar(d, prev, reg); }) === false) { A.toast('Nada mudou.'); return; }
    bat.tela = 'aplicada';
    bat = null;
    fecharJanela(true);
    kit().avisoDesfazer('Batalha aplicada: ' + texto + '. Fica no histórico (aba Guerra).');
  }

  window.MundoGuerraPainel = { abaGuerra, secExercito, secFortificacao, secFasesFrente, leituraExercito, ofertarBatalhas, proporMantimentos, menuHex, abrirBatalha,
    get batalha() { return bat; }, get encontros() { return encontros.slice(); } };
})();
