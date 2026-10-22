/* Tiny Cats · Mapa-múndi · a guerra no painel (lote 8, parte 6).
   A aba Guerra (a batalha, os exércitos que se encontraram, os exércitos, os tipos de tropa, os hexágonos marcados e o
   histórico), a seção Exército do grupo (o comandante, a moral, os mantimentos e as unidades), a Fortificação do
   marcador, as fases da frente, a leitura dos jogadores (só os nomes), a janela da batalha (a resumida no d100 e a
   detalhada no d20, em momentos, com o mestre mexendo em cada um) com o depois (a prévia, e aplicar num passo de
   desfazer), os exércitos que se encontram no caminho e os mantimentos de cada dia.
   (lote 12, parte 12a) O dia da campanha: no "Próximo dia", a janela com cada exército — o que ele come, o
   reabastecimento do estoque da facção (na terra dela e das aliadas), a forragem (na terra inimiga ou sem dono) e o
   desgaste —, cada um com a caixa (desmarcar refaz as contas); na aba Guerra, as regras da campanha (os números, os
   terrenos duros e os meses de inverno); no exército, onde ele está e o que vale ali.
   (lote 12, parte 12b) A ocupação: no dia da campanha, as contagens e as propostas (ocupar, libertar), com a notícia para
   o rascunho do Jornal (a caixa desmarcada); na região, quem ocupa e desde quando, "Marcar como ocupada…", "Anexar…" e
   "Tirar a ocupação…"; na aba Guerra, as terras ocupadas e as contagens; nas regras, os dias sem defensor.
   (lote 12, parte 12d) As máquinas de cerco: na aba Guerra, os tipos (o dano contra estrutura e contra exército e o
   acerto; os de começo: Aríete, Catapulta e Trabuco); quantas de cada tipo em cada unidade e na fortificação.
   Usa as ferramentas do painel (MundoPainel.kit): nada aqui muda o mapa direto, tudo passa por App.mudar. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const G = () => window.MundoGuerra;
  const CA = () => window.MundoCampanha || null;          // (lote 12) a campanha: o dia, as regras
  const DP = () => window.MundoDiplomaciaPainel || null;  // (lote 12, parte 12b) a notícia no rascunho do Jornal
  const N = () => window.MundoNucleo;
  const app = () => kit().app();
  const NOME_HEX = { d: 'Destruído', c: 'Corrompido' };
  const MORAIS = ['em fuga', 'à beira da fuga', 'abalada', 'nervosa', 'cansada', 'firme', 'confiante', 'animada', 'feroz', 'heroica', 'inabalável'];
  const MOM_NOME = { ab: 'Abertura', ch: 'Choque', vi: 'Virada', de: 'Desfecho' };
  const MOM_DICA = { ab: 'arqueiros e magos', ch: 'o choque das tropas', vi: 'a moral, o comandante e os heróis', de: 'quem aguenta até o fim' };
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
    return { id: novoId('un'), nome: 'Unidade ' + (n + 1), tipo: tipo || null, tropas: 100, hpT: 1, fer: 0, atq: 0, def: 0, magos: 0, cura: 0, maq: {}, equip: [] };
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
    if (CA()) { const sc = secCercos(m); if (sc) out.push(sc); out.push(secOcupadas(m), secRegras(m)); }     // (parte 12e) os cercos
    out.push(secZona(m), secDefesa(m));                         // (lote 17) a zona de guerra automática e a tabela da defesa
    out.push(secTipos(m), secMaquinas(m), secHexes(m), secHistorico(m));
    return out;
  }

  /* ---- (lote 17) a zona de guerra automática: ligada ou não, o que tem agora e o ajuste do mestre ---- */
  function secZona(m) {
    const { h, botao, nota, secao, linha, caixa, plural } = kit(), A = app(), Z = (m.guerra && m.guerra.zona) || {}, out = [];
    if (!N().temGrade(m)) return secao('Zona de guerra', nota('A zona de guerra automática precisa da grade de hexágonos (aba Terreno). Sem ela, as regiões ocupadas ficam listradas nas cores de quem ocupa.'));
    out.push(caixa('gu:zona-on', 'Mostrar a zona de guerra automática', !Z.off, v => A.mudar(v ? 'mostrar a zona de guerra automática' : 'esconder a zona de guerra automática', d => {
      const g = guerraDe(d), z = g.zona || {};
      if (!!z.off === !v) return false;
      if (v) delete z.off; else z.off = true;
      if (Object.keys(z).length) g.zona = z; else delete g.zona;
    }), { dica: 'Os hexágonos ocupados e a fronteira entre facções em guerra, listrados, com a linha do front. Todos veem; nenhuma regra muda por ela.' }));
    if (!Z.off) {
      const zg = N().zonaDeGuerra(m), nh = zg ? zg.h.size : 0, nf = zg ? zg.f.length : 0, add = (Z.add || []).length, tira = (Z.tira || []).length;
      out.push(h('p', { class: 'note', 'data-k': 'gu:zona-txt', text: nh ? plural(nh, 'hexágono', 'hexágonos') + ' na zona' + (nf ? ', com ' + plural(nf, 'lado', 'lados') + ' de hexágono na linha do front' : '') + '.'
        : 'Nenhum hexágono agora: a zona aparece com uma região ocupada, ou na fronteira entre duas facções em guerra (aba Facções).' }));
      if (add || tira) out.push(h('p', { class: 'note', 'data-k': 'gu:zona-ajuste', text: 'Seu ajuste: ' + [add ? plural(add, 'hexágono posto', 'hexágonos postos') : '', tira ? plural(tira, 'hexágono tirado', 'hexágonos tirados') : ''].filter(Boolean).join(' e ') + ' à mão.' }));
      out.push(linha(
        botao('Ajustar no mapa', () => { if (!A.opt) A.opt = {}; A.opt.freModo = 'ajuste'; A.usarFerramenta('f'); }, { c: 'sm', k: 'gu:zona-ajustar', title: 'A ferramenta Frente, no modo "Ajustar a zona": pinte para pôr ou tirar hexágonos' }),
        add || tira ? botao('Voltar ao automático', () => { if (A.mudar('voltar a zona de guerra ao automático', d => { const g = guerraDe(d); if (!g.zona || (!g.zona.add && !g.zona.tira)) return false; delete g.zona.add; delete g.zona.tira; if (!Object.keys(g.zona).length) delete g.zona; }) !== false) kit().avisoDesfazer('A zona de guerra voltou a ser só a automática.'); }, { c: 'sm', k: 'gu:zona-auto' }) : null));
    }
    return secao('Zona de guerra', out);
  }

  /* ---- (lote 17) a defesa do terreno e dos lugares, na batalha ---- */
  function secDefesa(m) {
    const { h, botao, nota, secao, linha } = kit(), N_ = N(), prop = !!(m.guerra && m.guerra.def);
    const ters = (m.terrenos || []).map(t => [t.nome, N_.defesaDoTerreno(m, t.id)]).filter(x => x[1]), ics = ['castelo', 'forte'].concat(Object.keys((m.guerra && m.guerra.def && m.guerra.def.ic) || {}).filter(k => k !== 'castelo' && k !== 'forte'))
      .map(k => [(N_.ICONES[k] || {}).nome || k, N_.defesaDoIcone(m, k)]).filter(x => x[1]);
    const txt = l => l.map(([n, v]) => n + ' ' + sinal(v)).join(' · ') || 'nenhum';
    return secao('Defesa do terreno e dos lugares',
      h('p', { class: 'note', 'data-k': 'gu:def-ter', text: 'Terreno (para quem defende o hexágono da batalha): ' + txt(ters) + '.' }),
      h('p', { class: 'note', 'data-k': 'gu:def-ic', text: 'Lugares (somam na fortificação): ' + txt(ics) + '.' }),
      nota(prop ? 'A tabela é a sua.' : 'A tabela é a de começo.' + ' Na batalha, a lista dos bônus mostra de onde veio cada um.'),
      linha(botao('Mudar a tabela…', () => janelaDefesa(), { c: 'sm', k: 'gu:def-mudar' })));
  }
  async function janelaDefesa() {
    const A = app(), m = A.mapa;
    if (!m || !A.podeEditar()) return;
    const v = await dialogoDefesa(m);
    if (!v || !kit().mesmoMapa(m.id)) return;
    if (v.comeco) {
      if (A.mudar('voltar à tabela de defesa de começo', d => { if (!d.guerra || !d.guerra.def) return false; delete d.guerra.def; }) !== false) kit().avisoDesfazer('A tabela da defesa voltou à de começo.');
      return;
    }
    if (A.mudar('mudar a tabela da defesa', d => { const g = guerraDe(d), ant = JSON.stringify(g.def || null); g.def = v.def; if (JSON.stringify(v.def) === ant) return false; }) !== false) kit().avisoDesfazer('A tabela da defesa está salva.');
  }
  // a janela da tabela: um número para cada terreno do mapa e para o castelo e o forte → { def } | { comeco: true } | null
  function dialogoDefesa(m) {
    const { h } = kit(), N_ = N();
    return new Promise(resolve => {
      const prop = !!(m.guerra && m.guerra.def), ICS = ['castelo', 'forte'];
      const campo = (k, rot, v0) => { const i = h('input', { type: 'number', min: -10, max: 10, step: 1, class: 'num', 'data-k': 'gd:' + k, value: String(v0 || 0) }); return { k, i, rot, el: h('label', null, rot, i) }; };
      const ters = (m.terrenos || []).map(t => campo('t:' + t.id, t.nome, N_.defesaDoTerreno(m, t.id))), ics = ICS.map(k => campo('i:' + k, N_.ICONES[k].nome, N_.defesaDoIcone(m, k)));
      const titulo = h('h2', { text: 'A defesa do terreno e dos lugares' });
      titulo.id = 'dl-gd-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bComeco = prop ? h('button', { type: 'button', class: 'btn', 'data-k': 'gd:comeco', text: 'Voltar à de começo' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'gd:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'gd:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'De −10 a +10, no d20 (no d100 vale 5 vezes). O terreno ajuda quem defende o hexágono da batalha; o castelo e o forte somam na fortificação do lugar. Nada muda até você salvar.' }),
        h('div', { class: 'cr-sec' }, h('span', { class: 'ps-rot', text: 'O terreno' }), h('div', { class: 'cr-nums gd-nums' }, ters.map(c => c.el))),
        h('div', { class: 'cr-sec' }, h('span', { class: 'ps-rot', text: 'Os lugares' }), h('div', { class: 'cr-nums gd-nums' }, ics.map(c => c.el))),
        err, h('div', { class: 'pe' }, bComeco, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl cr-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const def = { ter: {}, ic: {} };
        for (const c of ters.concat(ics)) {
          const n0 = Number(String(c.i.value).replace(',', '.'));
          if (!Number.isInteger(n0) || n0 < -10 || n0 > 10) { err.textContent = c.rot + ': um número inteiro de −10 a +10.'; c.i.focus(); return; }
          if (n0) def[c.k[0] === 't' ? 'ter' : 'ic'][c.k.slice(2)] = n0;
        }
        fim({ def });
      });
      if (bComeco) bComeco.addEventListener('click', () => fim({ comeco: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (ters[0] || ics[0]).i.focus();
    });
  }

  /* ---- (lote 12, parte 12d) as máquinas de cerco: os tipos (sem a lista do mestre, os de começo) ---- */
  const maquinasDe = m => N().maquinasDe(m);
  // muda a lista dos tipos (a primeira mudança guarda os de começo no mapa)
  const mudarMaqs = (rot, fn) => app().mudar(rot, d => { const g = guerraDe(d); if (!Array.isArray(g.maqs)) g.maqs = N().MAQUINAS_PADRAO.map(t => Object.assign({}, t)); return fn(g.maqs, d); });
  // quantas máquinas de cerco um tipo tem nas unidades e nas fortificações do mapa
  function usosDaMaquina(m, tid) {
    let n = 0;
    for (const o of m.objs) {
      if (o.k === 'g' && o.exe && !o.exe.pub) for (const u of o.exe.unid) n += (u.maq && u.maq[tid]) || 0;
      if (o.k === 'm' && o.estr && o.estr.maq) n += o.estr.maq[tid] || 0;
    }
    return n;
  }
  function secMaquinas(m) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero } = kit(), ts = maquinasDe(m), proprias = !!(m.guerra && Array.isArray(m.guerra.maqs)), out = [];
    const mudarTipo = (tid, rot, fn) => mudarMaqs(rot, l => { const t = l.find(x => x.id === tid); if (!t) return false; return fn(t); });
    out.push(nota('Estrutura: o dano de cada máquina no HP da fortificação (depois da batalha e em cada dia de cerco). Exército: o dano nas tropas — na batalha, a raiz da soma vira o bônus da Abertura (até +6, como os magos); no cerco, o de cada tiro de dentro. Acerto: o mínimo no d20 para um tiro acertar as tropas (vazio: não atira nelas).'));
    if (!ts.length) out.push(nota('Nenhum tipo de máquina.'));
    for (const t of ts) {
      out.push(h('div', { class: 'gu-maq', 'data-k': 'gu:maq:' + t.id },
        h('div', { class: 'row' },
          campoTexto('gu:maq:' + t.id + ':nome', 'Nome', t.nome, v => mudarTipo(t.id, 'mudar o nome da máquina', x => { if (!v.trim() || x.nome === v.trim()) return false; x.nome = v.trim(); }), { max: 60 }),
          h('button', { type: 'button', class: 'ib', title: 'Tirar o tipo de máquina', 'aria-label': 'Tirar a máquina ' + t.nome, 'data-k': 'gu:maq:' + t.id + ':x', onclick: () => tirarMaquina(t.id) }, kit().glifo(kit().X_SVG, 14))),
        h('div', { class: 'row gu-nums' },
          campoNumero('gu:maq:' + t.id + ':est', 'Estrutura', t.est, n => mudarTipo(t.id, 'mudar a máquina', x => { if (x.est === n) return false; x.est = n; }), { min: 0, max: 1000 }),
          campoNumero('gu:maq:' + t.id + ':exe', 'Exército', t.exe, n => mudarTipo(t.id, 'mudar a máquina', x => { if (x.exe === n) return false; x.exe = n; }), { min: 0, max: 1000 }),
          campoNumero('gu:maq:' + t.id + ':ac', 'Acerto (d20)', t.ac, n => mudarTipo(t.id, 'mudar a máquina', x => { if (x.ac === n) return false; x.ac = n; }), { min: 1, max: 20, vazio: null, ph: '—' }))));
    }
    const max = (N().LIMITES && N().LIMITES.maquinas) || 40;
    out.push(linha(botao('Novo tipo de máquina', () => {
      const id = novoId('mq');
      if (mudarMaqs('criar um tipo de máquina', l => { if (l.length >= max) return false; l.push({ id, nome: 'Máquina ' + (l.length + 1), est: 1, exe: 0, ac: null }); }) !== false) kit().focar('gu:maq:' + id + ':nome');
    }, { c: 'sm', k: 'gu:maq:nova', off: ts.length >= max }),
      proprias ? botao('Voltar às de começo', () => voltarMaquinas(), { c: 'sm', k: 'gu:maq:comeco' }) : null));
    return secao('Máquinas de cerco', out);
  }
  async function tirarMaquina(tid) {
    const K = kit(), m = app().mapa, t = maquinasDe(m).find(x => x.id === tid);
    if (!t) return;
    const usos = usosDaMaquina(m, tid);
    if (usos) {
      const ok = await K.confirmar({ titulo: 'Tirar a máquina ' + t.nome + '?', ok: 'Tirar', perigo: true,
        texto: (usos === 1 ? 'A máquina dela que está numa unidade ou fortificação sai junto.' : 'As ' + usos + ' máquinas dela nas unidades e fortificações saem junto.') + ' Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
    }
    if (mudarMaqs('tirar o tipo de máquina', l => { const i = l.findIndex(x => x.id === tid); if (i < 0) return false; l.splice(i, 1); }) !== false) K.avisoDesfazer('A máquina "' + t.nome + '" saiu.');
  }
  async function voltarMaquinas() {
    const K = kit(), m = app().mapa, ids = new Set(N().MAQUINAS_PADRAO.map(t => t.id)), usos = maquinasDe(m).filter(t => !ids.has(t.id)).reduce((s0, t) => s0 + usosDaMaquina(m, t.id), 0);
    if (usos) {
      const ok = await K.confirmar({ titulo: 'Voltar às máquinas de começo?', ok: 'Voltar', perigo: true, texto: 'As máquinas dos tipos que você criou (' + usos + ') saem das unidades e fortificações. Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
    }
    if (app().mudar('voltar às máquinas de começo', d => { if (!d.guerra || !Array.isArray(d.guerra.maqs)) return false; delete d.guerra.maqs; }) !== false) K.avisoDesfazer('As máquinas voltaram às de começo.');
  }
  /* os campos de quantas máquinas de cada tipo (numa unidade ou numa fortificação): gravar(tipo, n) */
  function camposMaq(k, maq, gravar, m, rot) {
    const { h, campoNumero, nota } = kit(), ts = maquinasDe(m);
    if (!ts.length) return nota('Sem tipos de máquina de cerco (aba Guerra).');
    return h('div', { class: 'gu-maqs', 'data-k': k },
      h('span', { class: 'ps-rot', text: rot || 'Máquinas de cerco' }),
      h('div', { class: 'row gu-nums' }, ts.map(t => campoNumero(k + ':' + t.id, t.nome, (maq && maq[t.id]) || 0, n => gravar(t.id, n), { min: 0, max: (N().LIMITES && N().LIMITES.maqPorTipo) || 1e4 }))));
  }
  // grava quantas de um tipo numa tabela { tipo: quantas } (zero sai) → false se não mudou
  const porMaq = (x, tid, n) => { const t = x || {}, n0 = t[tid] || 0; if (n0 === n) return false; if (n) t[tid] = n; else delete t[tid]; return t; };
  // "Aríete 2 · Catapulta 1" (ou '')
  const txtMaq = (m, maq) => maquinasDe(m).filter(t => maq && maq[t.id]).map(t => t.nome + ' ' + maq[t.id]).join(' · ');

  /* ---- (lote 12, parte 12b) as terras ocupadas e as contagens (na aba Guerra) ---- */
  const nomeFacDe = (m, id) => { const f = id ? kit().facDe(m, id) : null; return f ? kit().nomeFac(f) : 'uma facção'; };
  const corFacDe = (m, id) => { const f = id ? kit().facDe(m, id) : null; return f ? f.cor : '#9aa3b5'; };
  function secOcupadas(m) {
    const { h, nota, secao, plural, nomeDe, dataTxt } = kit(), rg = CA().regrasDe(m), pres = (m.guerra && m.guerra.pres) || {};
    const ocs = m.objs.filter(o => o.k === 'r' && o.ocup && o.ocup.fac), cont = m.objs.filter(o => o.k === 'r' && pres[o.id]);
    const ir = o => { kit().abrirAba('selecao'); kit().irPara(o.id); };
    const out = [];
    if (!ocs.length && !cont.length) out.push(nota('Nenhuma terra ocupada. Um exército de uma facção em guerra que fica ' + plural(rg.ocupar, 'dia', 'dias') + ' numa região da outra, sem defensor e sem fortificação de pé, traz a proposta no “Próximo dia”. Dá também para marcar à mão, na região.'));
    if (ocs.length) out.push(h('div', { class: 'lista' }, ocs.map(o => h('button', { type: 'button', class: 'li clic', 'data-k': 'gu:ocup:' + o.id, onclick: () => ir(o) },
      h('i', { class: 'bola gu-ocup-bola', style: { background: corFacDe(m, o.ocup.fac) } }),
      h('span', { class: 'tx' }, h('b', { text: nomeDe(o, m) }), h('small', { text: 'de ' + nomeFacDe(m, N().facDaRegiao(m, o)) + ', ocupada por ' + nomeFacDe(m, o.ocup.fac) + ' desde ' + dataTxt(m, o.ocup.d) }))))));
    if (cont.length) out.push(h('div', { class: 'gu-conta', 'data-k': 'gu:contas' }, h('span', { class: 'ps-rot', text: 'Contando os dias' }),
      cont.map(o => h('p', { class: 'note', 'data-k': 'gu:conta:' + o.id, text: nomeDe(o, m) + ': ' + nomeFacDe(m, pres[o.id].fac) + ', ' + pres[o.id].n + ' de ' + plural(rg.ocupar, 'dia', 'dias') + (pres[o.id].lib ? ' para libertar.' : ' sem defensor.') }))));
    return secao('Terras ocupadas', out);
  }

  /* ================= (lote 12, parte 12b) a região: a ocupação ================= */
  function secOcupacao(o, m) {
    const { h, botao, nota, secao, linha, plural, dataTxt } = kit(), C = CA();
    if (!C || !m.faccoes.length) return null;
    const id = o.id, dono = N().facDaRegiao(m, o), oc = o.ocup && o.ocup.fac ? o.ocup : null, out = [];
    if (!dono && !oc) return null;                                // (a terra sem dona não se ocupa: dê a ela uma facção)
    const pres = m.guerra && m.guerra.pres ? m.guerra.pres[id] : null, rg = C.regrasDe(m), nF = fid => nomeFacDe(m, fid);
    if (oc) {
      out.push(h('p', { class: 'status', 'data-k': 'o:' + id + ':ocup' }, h('i', { class: 'bola', style: { background: corFacDe(m, oc.fac) } }), ' Ocupada por ' + nF(oc.fac) + ' desde ' + dataTxt(m, oc.d) + '.'));
      out.push(nota('A produção daqui vai para ' + nF(oc.fac) + (dono ? '; o Livro do reino e a população continuam de ' + nF(dono) : '') + '. As listras aparecem no mapa, também para os jogadores.'));
      if (pres && pres.lib) out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':ocup-nota', text: nF(pres.fac) + ' está aqui sem as tropas de ' + nF(oc.fac) + ': ' + pres.n + ' de ' + plural(rg.ocupar, 'dia', 'dias') + ' para libertar (a proposta vem no “Próximo dia”).' }));
      out.push(linha(dono ? botao('Anexar…', () => janelaOcupacao(id, 'anexar'), { c: 'sm', k: 'o:' + id + ':ocup-anexar', title: 'A região passa a ser de ' + nF(oc.fac) }) : null,
        botao('Tirar a ocupação…', () => janelaOcupacao(id, 'tirar'), { c: 'sm', k: 'o:' + id + ':ocup-tirar' })));
    } else {
      out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':ocup-nota', text: pres && !pres.lib ? nF(pres.fac) + ' está aqui sem defensor: ' + pres.n + ' de ' + plural(rg.ocupar, 'dia', 'dias') + ' para ocupar (a proposta vem no “Próximo dia”).'
        : 'Um exército de uma facção em guerra com ' + nF(dono) + ' que fica aqui ' + plural(rg.ocupar, 'dia', 'dias') + ' sem defensor (e sem fortificação de pé) traz a proposta no “Próximo dia”.' }));
      out.push(linha(botao('Marcar como ocupada…', () => janelaOcupacao(id, 'ocupar'), { c: 'sm', k: 'o:' + id + ':ocup-marcar', off: m.faccoes.length < 2 })));
    }
    const dentro = m.objs.filter(x => x.k === 'r' && x.pai === id).length;
    if (dentro) out.push(nota('Vale só para esta região: ' + (dentro === 1 ? 'a de dentro tem a sua.' : 'as ' + dentro + ' de dentro têm a sua.')));
    return secao('Ocupação', out);
  }
  // marcar como ocupada, anexar ou tirar a ocupação (com a confirmação e a notícia) — tudo num passo de Desfazer
  async function janelaOcupacao(rid, modo) {
    const A = app(), K = kit(), m = A.mapa, C = CA(), r = m ? K.achar(m, rid) : null;
    if (!A.podeEditar() || !r || r.k !== 'r' || !C || (modo !== 'ocupar' && !(r.ocup && r.ocup.fac))) return;
    const v = await dialogoOcupacao(m, r, modo, !!(A.temJornal && A.temJornal() && DP()));
    if (!v || !K.mesmoMapa(m.id)) return;
    const nome = K.nomeDe(r, m), dono = N().facDaRegiao(m, r), quem = modo === 'ocupar' ? v.fac : r.ocup.fac;
    // a notícia vem do mapa de antes (a ocupação e a dona de antes)
    const nt = !v.jornal ? null : modo === 'ocupar' ? C.noticiaOcupacao(m, rid, v.fac) : modo === 'anexar' ? C.noticiaAnexacao(m, rid) : C.noticiaLibertacao(m, rid, quem);
    const rot = { ocupar: 'marcar a região como ocupada', anexar: 'anexar a região', tirar: 'tirar a ocupação' }[modo];
    if (A.mudar(rot, d => { if (!(modo === 'ocupar' ? C.ocupar(d, rid, v.fac) : modo === 'anexar' ? C.anexar(d, rid) : C.devolver(d, rid))) return false; }) === false) return;
    const jtxt = nt ? DP().porNoJornal('mt_oc_', nt) : '';
    K.avisoDesfazer((modo === 'ocupar' ? nome + ' fica ocupada por ' + nomeFacDe(m, quem) + '.' : modo === 'anexar' ? nome + ' passa a ser de ' + nomeFacDe(m, quem) + '.'
      : nome + ' não está mais ocupada' + (dono ? ': volta a ser só de ' + nomeFacDe(m, dono) : '') + '.') + jtxt);
  }
  /* → { fac (ao ocupar), jornal } ou null */
  function dialogoOcupacao(m, r, modo, jornal) {
    const K = kit(), { h } = K, C = CA();
    return new Promise(resolve => {
      const nome = K.nomeDe(r, m), dono = N().facDaRegiao(m, r), quem = r.ocup && r.ocup.fac ? r.ocup.fac : null;
      // ao ocupar: quem ocupa (de começo, a primeira em guerra com a dona)
      const outras = modo === 'ocupar' ? m.faccoes.filter(f => f.id !== dono && f.id !== quem) : [];
      const guerra = outras.find(f => dono && C.emGuerra(m, f.id, dono));
      const sel = modo === 'ocupar' ? h('select', { 'data-k': 'oc:fac' }, outras.map(f => h('option', { value: f.id, text: K.nomeFac(f) + (f.oculta ? ' (escondida)' : '') }))) : null;
      if (sel) sel.value = (guerra || outras[0] || {}).id || '';
      const cj = jornal ? DP().caixaJornal(K, 'oc:jornal') : null;
      const noticia = () => (modo === 'ocupar' ? C.noticiaOcupacao(m, r.id, sel.value) : modo === 'anexar' ? C.noticiaAnexacao(m, r.id) : C.noticiaLibertacao(m, r.id, quem));
      const pintarJ = () => { if (cj && (modo !== 'ocupar' || sel.value)) cj.pintar(noticia()); };
      const T = {
        ocupar: ['Marcar ' + nome + ' como ocupada', 'A dona continua a mesma' + (dono ? ' (' + nomeFacDe(m, dono) + ')' : '') + '; quem ocupa fica com a produção daqui, e o mapa mostra as listras dela. Nada muda até “Ocupar” (e dá para desfazer).', 'Ocupar'],
        anexar: ['Anexar ' + nome + '?', nome + ' passa a ser de ' + nomeFacDe(m, quem) + ' (a facção da região muda) e a ocupação acaba. Dá para desfazer.', 'Anexar'],
        tirar: ['Tirar a ocupação de ' + nome + '?', nome + ' volta a ser só de ' + nomeFacDe(m, dono) + ', com a produção. Dá para desfazer.', 'Tirar a ocupação'] }[modo];
      const titulo = h('h2', { text: T[0] });
      titulo.id = 'dl-oc-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'oc:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'oc:ok', text: T[2] });
      const form = h('form', { class: 'dl', novalidate: true }, titulo, h('p', { class: 'note', text: T[1] }),
        sel ? h('label', null, 'Quem ocupa', sel) : null, cj ? cj.el : null, err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl oc-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('change', pintarJ);
      pintarJ();
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        if (sel && !sel.value) { err.textContent = 'Escolha quem ocupa.'; return; }
        fim({ fac: sel ? sel.value : null, jornal: !!(cj && cj.cx.checked) });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (sel || bOk).focus();
    });
  }

  /* ================= (lote 12, parte 12e) o cerco ================= */
  const nomeLugarDe = (m, id) => { const mk = id ? kit().achar(m, id) : null; return mk ? kit().nomeDe(mk, m) : 'o lugar'; };
  // os exércitos de uma lista de ids, com a facção quando ela não é a de quem cerca nem a do dono ("Frota (Ilhas)")
  const nomesDosExercitos = (m, ids, c) => ids.map(id => kit().achar(m, id)).filter(Boolean)
    .map(g => kit().nomeDe(g, m) + (g.fac && c && g.fac !== c.fac && g.fac !== c.dono ? ' (' + nomeFacDe(m, g.fac) + ')' : '')).join(', ');
  // "Cercado por Aldar desde 5 de Alvorada (há 3 dias) · reserva: 27 de 30 dias · a muralha: 85 de 100." (fora: quem cerca)
  function textoCerco(m, c, fora) {
    const { plural, dataTxt } = kit();
    return (fora ? 'Cercando ' + nomeLugarDe(m, c.m) : 'Cercado por ' + nomeFacDe(m, c.fac)) + ' desde ' + dataTxt(m, c.d) + (c.dias ? ' (há ' + plural(c.dias, 'dia', 'dias') + ')' : ' (desde hoje)')
      + ' · ' + (fora ? 'a reserva de lá: ' : 'reserva: ') + c.res + ' de ' + plural(c.resMax, 'dia', 'dias') + (c.hpMax ? ' · a muralha: ' + c.hp + ' de ' + c.hpMax : '') + '.';
  }
  // o cerco de um lugar (no marcador, ou no exército que cerca — gid): a situação, quem cerca e quem está dentro, Assaltar e Levantar
  function blocoCerco(m, mk, gid) {
    const { h, botao, linha, plural } = kit(), C = CA(), c = C.cercoDe(m, mk), k = 'o:' + (gid || mk.id);
    if (!c) return null;
    return h('div', { class: 'gu-cerco', 'data-k': k + ':cerco' },
      h('p', { class: 'status', 'data-k': k + ':cerco-txt' }, h('i', { class: 'bola', style: { background: corFacDe(m, c.fac) } }), ' ' + textoCerco(m, c, !!gid)),
      h('p', { class: 'note', 'data-k': k + ':cerco-quem' }, 'Quem cerca: ' + (nomesDosExercitos(m, c.cercam, c) || 'ninguém agora (no “Próximo dia”, o cerco acaba)') + '. Dentro: '
        + (nomesDosExercitos(m, c.dentro, c) || (c.mil > 0 ? 'ninguém — no assalto, a milícia (' + plural(c.mil, 'tropa', 'tropas') + ') defende' : 'ninguém, e sem milícia')) + '.'),
      linha(botao('Assaltar…', () => assaltar(mk.id, gid), { c: 'sm pri', k: k + ':assaltar', off: !c.cercam.length, title: c.cercam.length ? 'Abre a batalha contra quem está dentro, com a fortificação' : 'Ninguém cerca agora' }),
        botao('Levantar o cerco…', () => levantarCerco(mk.id), { c: 'sm', k: k + ':levantar' })));
  }
  // no exército: o cerco dele (cercando, ou cercado), ou os lugares que ele pode cercar
  function secCercoDoExercito(o, m) {
    const { h, botao, linha, plural } = kit(), C = CA(), x = C.cercoDoExercito(m, o);
    if (x && x.lado === 'fora') return blocoCerco(m, kit().achar(m, x.c.m), o.id);
    if (x) return h('p', { class: 'note gu-cerco-dentro', 'data-k': 'o:' + o.id + ':cercado' }, h('i', { class: 'bola', style: { background: corFacDe(m, x.c.fac) } }),
      ' Cercado em ' + nomeLugarDe(m, x.c.m) + ' por ' + nomeFacDe(m, x.c.fac) + (x.c.dias ? ' (há ' + plural(x.c.dias, 'dia', 'dias') + ')' : ' (desde hoje)')
        + ': não reabastece; quando os mantimentos acabam, come da reserva da cidade (' + plural(x.c.res, 'dia', 'dias') + ').');
    const ls = C.lugaresParaCercar(m, o);
    return ls.length ? linha(...ls.map(l => botao('Cercar ' + nomeLugarDe(m, l.m) + '…', () => cercarLugar(l.m, o.id), { c: 'sm', k: 'o:' + o.id + ':cercar:' + l.m }))) : null;
  }
  // as facções dos exércitos que podem cercar o lugar (a do exército que pediu, primeiro)
  function quemPodeCercar(m, mkId, gid) {
    const C = CA(), out = [];
    for (const g of m.objs) if (g.k === 'g' && g.fac && !out.includes(g.fac) && C.lugaresParaCercar(m, g).some(x => x.m === mkId)) out.push(g.fac);
    const g0 = gid ? kit().achar(m, gid) : null;
    if (g0 && out.includes(g0.fac)) { out.splice(out.indexOf(g0.fac), 1); out.unshift(g0.fac); }
    return out;
  }
  async function cercarLugar(mkId, gid) {
    const A = app(), m = A.mapa, C = CA(), K = kit(), mk = K.achar(m, mkId), facs = mk ? quemPodeCercar(m, mkId, gid) : [];
    if (!facs.length) return;
    const v = await dialogoCerco(m, mk, facs, !!(A.temJornal && A.temJornal() && DP()));
    if (!v || !K.mesmoMapa(m.id)) return;
    const nt = v.jornal ? C.noticiaCerco(m, mkId, v.fac) : null;
    if (A.mudar('cercar ' + K.nomeDe(mk, m), d => { if (!C.cercar(d, mkId, v.fac)) return false; }) === false) return;
    K.avisoDesfazer(nomeFacDe(m, v.fac) + ' cerca ' + K.nomeDe(mk, m) + '.' + (nt ? DP().porNoJornal('mt_ce_', nt) : ''));
  }
  /* a janela "Cercar…": quem cerca (a facção, se há mais de uma), quem está dentro, a reserva e a muralha, o aviso sem guerra
     (a linha fica sempre lá) e a notícia → { fac, jornal } ou null */
  function dialogoCerco(m, mk, facs, jornal) {
    const K = kit(), { h, plural } = K, C = CA();
    return new Promise(resolve => {
      const nome = K.nomeDe(mk, m), dono = C.donoDoLugar(m, mk), e = mk.estr || null;
      const res = e && e.res != null ? e.res : N().RESERVA_PADRAO, mil = e && e.mil != null ? e.mil : N().MILICIA_PADRAO;
      const sel = facs.length > 1 ? h('select', { 'data-k': 'ce:fac' }, facs.map(f => h('option', { value: f, text: nomeFacDe(m, f) }))) : null;
      const facAgora = () => (sel ? sel.value : facs[0]);
      const txt = h('p', { class: 'note', 'data-k': 'ce:txt' }), guerra = h('p', { class: 'note', 'data-k': 'ce:guerra' });
      const cj = jornal ? DP().caixaJornal(K, 'ce:jornal') : null;
      const pintar = () => {
        const fac = facAgora(), cercam = C.quemCerca(m, mk, fac).map(g => g.id), dentro = C.quemDentro(m, mk, fac).map(g => g.id), c = { fac, dono };
        txt.textContent = 'Quem cerca: ' + (nomesDosExercitos(m, cercam, c) || 'ninguém') + '. Dentro: ' + (nomesDosExercitos(m, dentro, c) || 'ninguém de ' + nomeFacDe(m, dono) + (mil > 0 ? ' — no assalto, a milícia (' + plural(mil, 'tropa', 'tropas') + ') defende' : ''))
          + '. A reserva da cidade: ' + plural(res, 'dia', 'dias') + (e ? '; a muralha: ' + e.hp + ' de ' + e.hpMax : '') + '. A cada “Próximo dia”, as máquinas de fora batem na muralha, as de dentro atiram, a reserva cai 1 e o desgaste do cerco vale para os dois lados. Dá para desfazer.';
        const emG = C.emGuerra(m, fac, dono);
        guerra.textContent = emG ? nomeFacDe(m, fac) + ' e ' + nomeFacDe(m, dono) + ' estão em guerra.' : 'Atenção: ' + nomeFacDe(m, fac) + ' e ' + nomeFacDe(m, dono) + ' não estão em guerra.';
        guerra.classList.toggle('aviso', !emG);
        if (cj) cj.pintar(C.noticiaCerco(m, mk.id, fac));
      };
      const titulo = h('h2', { text: 'Cercar ' + nome + '?' });
      titulo.id = 'dl-ce-' + Date.now().toString(36);
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'ce:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'ce:ok', text: 'Cercar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo, sel ? h('label', null, 'Quem cerca', sel) : null, txt, guerra, cj ? cj.el : null, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl ce-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('change', pintar);
      pintar();
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (er) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => { ev.preventDefault(); fim({ fac: facAgora(), jornal: !!(cj && cj.cx.checked) }); });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (sel || bOk).focus();
    });
  }
  /* uma pergunta com a notícia do Jornal (Levantar o cerco, Tomar o lugar): → { jornal } ou null */
  function perguntaComNoticia(o) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const cj = o.noticia ? DP().caixaJornal(K, o.k + ':jornal') : null;
      if (cj) cj.pintar(o.noticia);
      const titulo = h('h2', { text: o.titulo });
      titulo.id = 'dl-' + o.k + '-' + Date.now().toString(36);
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': o.k + ':nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn ' + (o.perigo ? 'per' : 'pri'), 'data-k': o.k + ':ok', text: o.ok });
      const form = h('form', { class: 'dl', novalidate: true }, titulo, h('p', { class: 'note', 'data-k': o.k + ':txt', text: o.texto }), cj ? cj.el : null, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (er) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => { ev.preventDefault(); fim({ jornal: !!(cj && cj.cx.checked) }); });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (o.perigo ? bNao : bOk).focus();
    });
  }
  async function levantarCerco(mkId) {
    const A = app(), m = A.mapa, C = CA(), K = kit(), mk = K.achar(m, mkId), c = mk ? C.cercoDe(m, mk) : null;
    if (!c) return;
    const jornal = !!(A.temJornal && A.temJornal() && DP()), nome = K.nomeDe(mk, m);
    const v = await perguntaComNoticia({ k: 'lev', titulo: 'Levantar o cerco de ' + nome + '?', ok: 'Levantar o cerco',
      texto: nomeFacDe(m, c.fac) + ' deixa de cercar ' + nome + '. Os exércitos ficam onde estão, e a reserva da cidade enche de novo (' + kit().plural(c.resMax, 'dia', 'dias') + '). Dá para desfazer.',
      noticia: jornal ? C.noticiaFimDoCerco(m, mkId, 'levantou') : null });
    if (!v || !K.mesmoMapa(m.id)) return;
    const nt = v.jornal ? C.noticiaFimDoCerco(m, mkId, 'levantou') : null;
    if (A.mudar('levantar o cerco', d => { if (!C.levantar(d, mkId)) return false; }) === false) return;
    K.avisoDesfazer('O cerco de ' + nome + ' acabou.' + (nt ? DP().porNoJornal('mt_ce_', nt) : ''));
  }
  /* "Assaltar…": a batalha de quem cerca (o exército que pediu, ou o maior) contra quem está dentro (o maior), com a
     fortificação. Sem ninguém dentro, a milícia vira um exército no lugar (pergunta antes); sem milícia, tomar o lugar. */
  async function assaltar(mkId, gid) {
    const A = app(), m = A.mapa, C = CA(), K = kit(), mk = K.achar(m, mkId), c = mk ? C.cercoDe(m, mk) : null;
    if (!c) return;
    const maior = ids => ids.map(id => K.achar(m, id)).filter(Boolean).sort((p0, q0) => N().tropasDe(q0.exe) - N().tropasDe(p0.exe))[0];
    const a = gid && c.cercam.includes(gid) ? gid : (maior(c.cercam) || {}).id;
    if (!a) { A.toast('Ninguém cerca ' + K.nomeDe(mk, m) + ' agora.'); return; }
    let b = (maior(c.dentro) || {}).id;
    const nome = K.nomeDe(mk, m);
    if (!b && !(c.mil > 0)) {
      const jornal = !!(A.temJornal && A.temJornal() && DP());
      const v = await perguntaComNoticia({ k: 'tomar', titulo: 'Tomar ' + nome + '?', ok: 'Tomar o lugar',
        texto: 'Ninguém defende ' + nome + ' (nem exército dentro, nem milícia): sem batalha, o lugar cai para ' + nomeFacDe(m, c.fac) + ' — ' + textoQueda(m, c) + ' Dá para desfazer.',
        noticia: jornal ? C.noticiaQueda(m, mkId, 'assalto') : null });
      if (!v || !K.mesmoMapa(m.id)) return;
      const nt = v.jornal ? C.noticiaQueda(m, mkId, 'assalto') : null;
      if (A.mudar('tomar o lugar', d => { if (!C.cair(d, mkId)) return false; }) === false) return;
      K.avisoDesfazer(nome + ' caiu para ' + nomeFacDe(m, c.fac) + '.' + (nt ? DP().porNoJornal('mt_ce_', nt) : ''));
      return;
    }
    if (!b) {
      const ok = await K.confirmar({ titulo: 'Chamar a milícia de ' + nome + '?', ok: 'Chamar a milícia',
        texto: 'Ninguém de ' + nomeFacDe(m, c.dono) + ' está dentro: a milícia (' + K.plural(c.mil, 'tropa', 'tropas') + ') defende. Ela entra no mapa como um exército, “Milícia de ' + nome + '”, e fica lá. Depois vem a batalha. Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      let nid = null;
      if (A.mudar('chamar a milícia', d => { nid = C.chamarMilicia(d, mkId); if (!nid) return false; }) === false || !nid) return;
      b = nid;
    }
    abrirBatalha({ a, b, estr: { m: mkId, lado: 'b' } });
  }
  // o que a queda faz: "fica ocupado por Aldar (e Vale Fundo também); saem do mapa: Guarda do Vale."
  function textoQueda(m, c) {
    const N_ = N(), mk = kit().achar(m, c.m), r = mk ? N_.regiaoEm(m, mk.x, mk.y) : null, dona = r ? N_.facDaRegiao(m, r) : null, libera = !!dona && (dona === c.fac || CA().aliadas(m, c.fac, dona));
    const fora = nomesDosExercitos(m, c.dentro || c.sairam || [], c);
    return (libera ? 'volta para ' + nomeFacDe(m, dona) + (r ? ' (e ' + kit().nomeDe(r, m) + ' fica livre)' : '') : 'fica ocupado por ' + nomeFacDe(m, c.fac) + (r ? ' (e ' + kit().nomeDe(r, m) + ' também)' : ''))
      + (fora ? '; saem do mapa: ' + fora : '') + '.';
  }
  // a aba Guerra: os cercos
  function secCercos(m) {
    const { h, secao } = kit(), C = CA(), cs = C.cercosDe(m);
    if (!cs.length) return null;
    return secao('Cercos', h('div', { class: 'lista' }, cs.map(c => h('button', { type: 'button', class: 'li clic', 'data-k': 'gu:cerco:' + c.m, onclick: () => { kit().abrirAba('selecao'); kit().irPara(c.m); } },
      h('i', { class: 'bola gu-ocup-bola', style: { background: corFacDe(m, c.fac) } }),
      h('span', { class: 'tx' }, h('b', { text: nomeLugarDe(m, c.m) }), h('small', { text: textoCerco(m, c, false).replace(/\.$/, '') }))))));
  }

  /* ---- (lote 12, parte 12a) as regras da campanha: o resumo e "Mudar as regras…" ---- */
  const nomesMeses = m => N().mesesDe(m.cal).map((x, i) => String(x.nome || '').trim() || 'Mês ' + (i + 1));
  function secRegras(m) {
    const { h, botao, secao, linha, fmt } = kit(), rg = CA().regrasDe(m), ms = nomesMeses(m);
    const duros = (m.terrenos || []).filter(t => rg.duros.includes(t.id)).map(t => t.nome), inv = rg.meses.map(i => ms[i]).filter(Boolean);
    return secao('Regras da campanha',
      h('p', { class: 'note', 'data-k': 'gu:regras', text: 'Reabastece até ' + rg.teto + (rg.teto === 1 ? ' dia' : ' dias') + ' de comida (cada mantimento custa ' + fmt(rg.custo, 2) + ' do estoque) · forragem: '
        + fmt(rg.forr, 1) + '% do que come · desgaste por dia: sem comida ' + fmt(rg.fome, 1) + '%, em terreno duro ' + fmt(rg.terreno, 1) + '%, no inverno +' + fmt(rg.inverno, 1) + '% (o terreno e o inverno, só fora de casa).' }),
      h('p', { class: 'note', 'data-k': 'gu:regras-onde', text: 'Terrenos duros: ' + (duros.join(', ') || 'nenhum') + '. Inverno: ' + (inv.join(', ') || 'nenhum mês') + ' e a zona do evento Inverno rigoroso.' }),
      h('p', { class: 'note', 'data-k': 'gu:regras-ocup', text: 'Ocupação: ' + rg.ocupar + (rg.ocupar === 1 ? ' dia' : ' dias') + ' sem defensor (e sem fortificação de pé) para a proposta; o mesmo para libertar.' }),
      linha(botao('Mudar as regras…', () => janelaRegras(), { c: 'sm', k: 'gu:regras-mudar' })));
  }
  async function janelaRegras() {
    const A = app(), m = A.mapa;
    if (!m || !A.podeEditar() || !CA()) return;
    const v = await dialogoRegras(m);
    if (!v || !kit().mesmoMapa(m.id)) return;
    if (v.comeco) {
      if (A.mudar('voltar às regras de começo da campanha', d => { if (!d.guerra || !d.guerra.regras) return false; delete d.guerra.regras; }) !== false) kit().avisoDesfazer('As regras da campanha voltaram às de começo.');
      return;
    }
    if (A.mudar('mudar as regras da campanha', d => { const g = guerraDe(d), ant = JSON.stringify(g.regras || null); g.regras = v.regras; if (JSON.stringify(v.regras) === ant) return false; }) !== false) kit().avisoDesfazer('As regras da campanha estão salvas.');
  }
  /* a janela das regras: os números, os terrenos duros e os meses de inverno → { regras } | { comeco: true } | null */
  function dialogoRegras(m) {
    const { h } = kit();
    return new Promise(resolve => {
      const rg = CA().regrasDe(m), proprias = !!(m.guerra && m.guerra.regras);
      const num = (k, rot, v0, o) => { const i = h('input', { type: 'text', inputmode: 'decimal', 'data-k': 'cr:' + k, value: kit().fmtCampo(v0, 2), autocomplete: 'off' }); return { k, i, rot, o, el: h('label', null, rot, i) }; };
      const campos = [num('teto', 'Teto (dias de comida)', rg.teto, { min: 1, max: 365, int: true }), num('custo', 'Custo de cada mantimento', rg.custo, { min: 0, max: 1000 }),
        num('forr', 'Forragem (% do que come)', rg.forr, { min: 0, max: 100 }), num('fome', 'Sem comida (% por dia)', rg.fome, { min: 0, max: 100 }),
        num('terreno', 'Terreno duro (% por dia)', rg.terreno, { min: 0, max: 100 }), num('inverno', 'Inverno (+% por dia)', rg.inverno, { min: 0, max: 100 }),
        num('ocupar', 'Dias sem defensor para ocupar', rg.ocupar, { min: 1, max: 365, int: true })];      // (parte 12b)
      const caixas = (k, lista, marcados) => h('div', { class: 'cr-ops', 'data-k': 'cr:' + k }, lista.map(([id, nome]) => h('label', { class: 'op cr-op' }, h('input', { type: 'checkbox', value: String(id), 'data-k': 'cr:' + k + ':' + id, checked: marcados.includes(id) ? true : null }), h('span', { text: nome }))));
      const duros = caixas('duros', (m.terrenos || []).map(t => [t.id, t.nome]), rg.duros), meses = caixas('meses', nomesMeses(m).map((n, i) => [i, n]), rg.meses);
      const titulo = h('h2', { text: 'As regras da campanha' });
      titulo.id = 'dl-cr-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bComeco = proprias ? h('button', { type: 'button', class: 'btn', 'data-k': 'cr:comeco', text: 'Voltar às de começo' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'cr:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'cr:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'Valem para a proposta do "Próximo dia" (nada muda sem você aplicar). O terreno duro e o inverno só desgastam fora das terras da facção e das aliadas.' }),
        h('div', { class: 'cr-nums' }, campos.map(c => c.el)),
        h('div', { class: 'cr-sec' }, h('span', { class: 'ps-rot', text: 'Os terrenos duros' }), duros),
        h('div', { class: 'cr-sec' }, h('span', { class: 'ps-rot', text: 'Os meses de inverno' }), meses),
        err, h('div', { class: 'pe' }, bComeco, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl cr-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const regras = Object.assign({}, rg);
        for (const c of campos) {
          const n0 = kit().lerNum(c.i.value);
          if (!Number.isFinite(n0) || n0 < c.o.min || n0 > c.o.max || (c.o.int && !Number.isInteger(n0))) { err.textContent = c.rot + ': ' + (c.o.int ? 'um número inteiro' : 'um número') + ' de ' + c.o.min + ' a ' + c.o.max + '.'; c.i.focus(); return; }
          regras[c.k] = n0;
        }
        regras.duros = [...duros.querySelectorAll('input:checked')].map(x => x.value);
        regras.meses = [...meses.querySelectorAll('input:checked')].map(x => Number(x.value));
        fim({ regras });
      });
      if (bComeco) bComeco.addEventListener('click', () => fim({ comeco: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      campos[0].i.focus();
    });
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
    out.push(h('p', { class: 'status' }, h('b', { text: plural(tr, 'tropa', 'tropas') }), ' · ATQ ' + fmt(L.atq, 1) + ' · DEF ' + fmt(L.def, 1)
      + (L.magos ? ' · ' + plural(L.magos, 'mago', 'magos') : '') + (L.maqN ? ' · ' + plural(L.maqN, 'máquina de cerco', 'máquinas de cerco') : '')));
    // o comandante
    out.push(h('div', { class: 'row' },
      campoTexto('o:' + id + ':cmd', 'Comandante', e.cmd.nome, v => mudarObj(id, 'mudar o comandante', x => { x.exe.cmd.nome = v.trim(); }), { max: 80, ph: comandanteDaFicha(e) || 'Quem comanda' }),
      campoNumero('o:' + id + ':cmdb', 'Bônus (d20)', e.cmd.b, n => mudarObj(id, 'mudar o bônus do comandante', x => { x.exe.cmd.b = n; }), { min: -20, max: 20 })));
    const ficha = fichaDoComandante(o);
    if (ficha) out.push(ficha);
    // a moral e os mantimentos
    out.push(h('div', { class: 'row' },
      campoNumero('o:' + id + ':moral', 'Moral (0 a 10)', e.moral, n => mudarObj(id, 'mudar a moral', x => { x.exe.moral = n; }), { min: 0, max: 10, erro: 'A moral vai de 0 (em fuga) a 10 (inabalável); 5 é firme.' }),
      campoNumero('o:' + id + ':mant', 'Mantimentos (comida na estrada)', e.mant, n => mudarObj(id, 'mudar os mantimentos', x => { x.exe.mant = n; if (n > 0) x.exe.fome = 0; }), { min: 0, max: 1e9 }),
      campoNumero('o:' + id + ':cons', 'Por dia', e.cons == null ? '' : e.cons, n => mudarObj(id, 'mudar o consumo', x => { x.exe.cons = n; }), { min: 1, max: 1e7, vazio: null, ph: String(Math.ceil(tr / 100) || 0) })));
    out.push(nota('Moral ' + e.moral + ': ' + textoMoral(e.moral) + '. ' + (cons > 0 ? 'Comem ' + fmt(cons, 0) + ' por dia' + (e.cons == null ? ' (um por cem soldados)' : '') + ': dá para ' + plural(dias, 'dia', 'dias') + '.' : 'Sem consumo.')
      + (e.fome ? ' Sem mantimentos há ' + plural(e.fome, 'dia', 'dias') + ': a moral cai 1 por dia, e a fome tira ATQ nas batalhas.' : ' No "Próximo dia", vem a proposta do dia da campanha; quando acabam, a moral cai e a fome tira ATQ.'),
      e.fome ? 'aviso' : null));
    // (lote 12, parte 12a) onde ele está e o que vale ali no "Próximo dia"
    if (CA()) out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':campanha', text: textoOnde(m, o) }));
    // (lote 12, parte 12e) o cerco: o que ele cerca, ou onde está cercado; senão, os lugares que ele pode cercar
    if (CA()) { const ce = secCercoDoExercito(o, m); if (ce) out.push(ce); }
    // (lote 10, pente fino) a manutenção da economia é outra coisa: o que a facção paga por semana por este exército
    const Rn = window.MundoReino;
    if (Rn && m.eco && m.eco.on) {
      const u = Rn.manutencaoDe(m, o), txt = m.eco.rec.filter(r => u[r.id]).map(r => r.nome + ' ' + kit().fmt(u[r.id], 2)).join(' · '), f = o.fac ? kit().facDe(m, o.fac) : null;
      out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':manut', text: !txt ? 'Manutenção (na Economia do mundo): este exército não custa nada por semana à facção.'
        : f ? 'Manutenção: custa a ' + kit().nomeFac(f) + ' por semana ' + txt + ' (na Economia do mundo; é outra coisa que os mantimentos, a comida que ele leva).'
          : 'Manutenção: ' + txt + ' por semana, mas sem facção ninguém paga (os mantimentos são a comida que ele leva).' }));
    }
    return [secao('Exército', out), secHeroisDoExercito(o, m), secUnidades(o, m),
      linha(botao('Abrir uma batalha com este exército…', () => abrirBatalha({ a: id }), { k: 'o:' + id + ':batalha', off: !comUnidades(o), title: 'Este exército de um lado; o outro, você escolhe. (Shift + clique em outro exército, no mapa, escolhe os dois de uma vez: “Batalha entre os dois”.)' }))];
  }
  // (lote 12, parte 12a) "Em Terra Alta, terra de Aldar: no "Próximo dia", reabastece do estoque de Aldar até 10 dias."
  const OCUP_LADO = { aliada: 'aliada', inimiga: 'inimiga', neutra: 'neutra' };   // (parte 12b) na ocupada, o lado de quem ocupa
  function textoOnde(m, g) {
    const { achar, nomeDe, facDe, nomeFac, fmt } = kit(), C = CA(), rg = C.regrasDe(m), on = C.ondeEsta(m, g), r = on.r ? achar(m, on.r) : null;
    const nf = id => { const f = id ? facDe(m, id) : null; return f ? nomeFac(f) : 'outra facção'; };
    const ONDE = { casa: ', terra de ' + nf(on.dono), aliada: ', terra aliada (' + nf(on.dono) + ')', inimiga: ', terra inimiga (' + nf(on.dono) + ')', semdono: r ? ', sem dono' : '', alheia: ', terra de ' + nf(on.dono), neutra: ', terra neutra (' + nf(on.dono) + ')' };
    // (parte 12b) a ocupada: por quem, e o que ela é para ele
    if (on.ocup) ONDE[on.tipo] = ', ocupada por ' + nf(on.dono) + (OCUP_LADO[on.tipo] ? ' (' + OCUP_LADO[on.tipo] + ')' : '');
    const casa = C.REABASTECE.includes(on.tipo), partes = [];
    if (casa) partes.push(C.recComida(m) && g.fac ? 'no "Próximo dia", reabastece do estoque de ' + nf(g.fac) + ' até ' + rg.teto + (rg.teto === 1 ? ' dia' : ' dias') : 'em casa (sem a economia ligada, sem estoque para reabastecer)');
    else if (C.FORRAGEIA.includes(on.tipo) && rg.forr > 0) partes.push('colhe ' + fmt(rg.forr, 1) + '% do que come (forragem)');
    else partes.push('vive do que leva');
    if (!casa) {
      const t = C.terrenoDuro(m, g, rg);
      if (t && rg.terreno > 0) partes.push('terreno duro (' + t.nome + '): −' + fmt(rg.terreno, 1) + '% das tropas por dia');
      if (rg.inverno > 0 && C.invernoEm(m, g.x, g.y, m.cal.dia, rg)) partes.push('inverno: −' + fmt(rg.inverno, 1) + '% por dia');
    }
    // (parte 12c) a cura: a dos médicos (em qualquer lugar) e a da Enfermaria da cidade
    const med = Math.min(100, (g.exe && !g.exe.pub ? g.exe.unid : []).reduce((s0, u) => s0 + (u.tropas > 0 ? u.cura || 0 : 0), 0)), enf = C.enfermariaPerto(m, g);
    if (med || enf) partes.push('cura ' + Math.min(100, med + (enf ? enf.pct : 0)) + '% do HP que falta por dia (' + [med ? 'médicos ' + med + '%' : '', enf ? 'Enfermaria de ' + enf.nome + ' ' + enf.pct + '%' : ''].filter(Boolean).join(', ') + ')');
    return (r ? 'Em ' + nomeDe(r, m) : 'Fora das regiões') + ONDE[on.tipo] + ': ' + partes.join(' · ') + '.';
  }
  /* ---- (lote 9) os heróis ----
     As fichas da mesa (os do grupo, os NPCs) que lutam junto: as do exército (exe.herois) e as que o mestre põe só numa
     batalha. O bônus de cada um: o que o mestre escreveu, senão o sugerido pela ficha (a média de +1 a cada 5 níveis e de
     +1 a cada 13 pontos do maior atributo). Na batalha, somam na Virada (e na resumida), até +10 por lado; nos
     momentos-chave, a ação heroica; no depois, os ferimentos no HP da ficha. */
  const ROLAVEIS = ['FOR', 'DES', 'VIT', 'CAN', 'AGI', 'ESQ', 'FUR', 'PER', 'EMB', 'DFF', 'DFM', 'BLQ'];
  const docDados = id => { const TC = window.TC, D = TC && TC.dados && TC.dados.col('documentos'), l = D && D.pegar(id); return l && !l.apagado && l.dados ? l.dados : null; };
  // as contas da ficha (como nas Cenas): os atributos, o HP, a fixa e o nível
  function contasDaFicha(l) {
    const R = window.TC && window.TC.rules;
    if (!R || !l || l.ficha == null) return null;
    try {
      const cfgD = docDados('fichas:cfg'), cfg = (cfgD && cfgD.v) || R.cfgPadrao();
      const bibD = docDados('arvore:biblioteca') || docDados('arvore:pacote'), bib = bibD && Array.isArray(bibD.arvores) ? bibD : null;
      const pc = Object.assign({}, l.ficha || {}, { id: l.id, nome: l.nome }), extra = { arvore: R.bonusDaArvore(l.skills, bib), temp: l.estado && l.estado.tmp, fer: l.estado && l.estado.fer };
      const res = R.resumo(pc, cfg, extra, l.estado || {}), calc = R.calcular(pc, cfg, Object.assign({}, extra));
      const maior = Math.max(0, ...R.ATRIBS.map(a => Number(res.attrs[a.k]) || 0));
      const hp = res.recursos.find(r => /^(hp|vida|pv)$/i.test(String(r.nome || '').trim()) && r.max != null) || res.recursos.find(r => r.max != null) || null;
      const valor = k => Math.max(0, Math.round(R.valorDoAtributo(calc, k, res.fonte) || 0));
      return { nivel: Math.max(1, Math.round(Number(pc.level) || 1)), maior: Math.round(maior), hp, fixa: res.fixa || 0, valor, nomes: R.NOMES || {} };
    } catch (e) { return null; }
  }
  // um herói: { ficha, nome, sug, b (o do mestre), v (o que vale), contas } — null se a ficha não está aqui
  function heroiDe(ps, h) {
    const l = ps ? ps.find(x => x.id === h.ficha) : null;
    if (!l) return null;
    const c = contasDaFicha(l), sug = c ? G().bonusSugerido(c.nivel, c.maior) : 0, b = h.b == null ? null : h.b;
    return { ficha: l.id, nome: l.nome || 'Sem nome', sug, b, v: b == null ? sug : b, contas: c, linha: l };
  }
  function secHeroisDoExercito(o, m) {
    const { h, nota, campoNumero, campoEscolha, mudarObj, secao, botao } = kit(), id = o.id, e = o.exe, ps = personagens(), hs = e.herois || [], out = [];
    if (!ps) return hs.length ? secao('Heróis', nota(hs.length === 1 ? '1 herói (a ficha aparece dentro do site, na mesa).' : hs.length + ' heróis (as fichas aparecem dentro do site, na mesa).')) : null;
    for (const x of hs) {
      const hr = heroiDe(ps, x), num = campoNumero('o:' + id + ':heroi-b:' + x.ficha, null, x.b == null ? '' : x.b, n => mudarObj(id, 'mudar o bônus do herói', y => {
        const z = (y.exe.herois || []).find(q => q.ficha === x.ficha); if (!z) return false; if (n == null) delete z.b; else z.b = n;
      }), { min: -20, max: 20, vazio: null, ph: hr ? sinal(hr.sug) : '0' });
      num.setAttribute('aria-label', 'Bônus de ' + (hr ? hr.nome : 'herói') + ' (vazio: o sugerido pela ficha)');
      out.push(h('div', { class: 'row gu-heroi', 'data-k': 'o:' + id + ':heroi:' + x.ficha },
        h('b', { class: 'gu-heroi-nome', text: hr ? hr.nome : 'A ficha saiu da mesa' }), num,
        botao('Tirar', () => mudarObj(id, 'tirar o herói', y => { const l = y.exe.herois || [], k = l.findIndex(q => q.ficha === x.ficha); if (k < 0) return false; l.splice(k, 1); if (!l.length) delete y.exe.herois; }), { c: 'sm', k: 'o:' + id + ':heroi-x:' + x.ficha }),
        h('small', { class: 'note', text: hr && hr.contas ? 'sugerido ' + sinal(hr.sug) + ' (nível ' + hr.contas.nivel + ', maior atributo ' + hr.contas.maior + ')' + (x.b != null ? ' · vale o seu, ' + sinal(x.b) : '') : '' })));
    }
    const livres = ps.filter(l => !hs.some(x => x.ficha === l.id));
    if (livres.length && hs.length < ((N().LIMITES && N().LIMITES.herois) || 12)) {
      const sel = campoEscolha('o:' + id + ':heroi-novo', null, '', [['', '+ Herói (uma ficha da mesa)…']].concat(livres.map(l => [l.id, l.nome || 'Sem nome'])),
        v => (v ? mudarObj(id, 'pôr um herói', y => { y.exe.herois = (y.exe.herois || []).concat([{ ficha: v }]); }) : false), { rotulo: 'Pôr um herói no exército' });
      out.push(sel);
    }
    out.push(nota('Os heróis lutam junto: somam na Virada (e na resumida), até +10 por lado. O bônus vem da ficha (nível e maior atributo); escreva outro se quiser. Nos momentos-chave, podem fazer uma ação heroica; no fim, podem sair feridos.'));
    return secao('Heróis', out);
  }
  // os heróis de um lado na batalha: os do exército e os só desta batalha (cada ficha uma vez só, no primeiro lado)
  function heroisDoLado(m, q) {
    const ps = personagens(), g = kit().achar(m, bat[q]), out = [];
    if (!ps) return out;
    const vistos = new Set(q === 'b' ? heroisDoLado(m, 'a').map(x => x.ficha) : []);          // quem já luta do lado A não luta do B
    for (const [x, de] of (((g && g.exe && !g.exe.pub && g.exe.herois) || []).map(x => [x, 'exe'])).concat((bat.herois[q] || []).map(x => [x, 'bat']))) {
      if (vistos.has(x.ficha)) continue;
      const hr = heroiDe(ps, x);
      if (!hr) continue;
      vistos.add(x.ficha);
      out.push(Object.assign(hr, { de, lado: q }));
    }
    return out;
  }
  const somaHerois = hs => Math.max(-G().MAX_HEROIS_BONUS, Math.min(G().MAX_HEROIS_BONUS, hs.reduce((t, x) => t + x.v, 0)));
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
    const num = (u, campo, rot, o2) => campoNumero('o:' + id + ':u:' + u.id + ':' + campo, rot, u[campo], n => mudarUnid(id, u.id, 'mudar a unidade', x => { if (x[campo] === n) return false; x[campo] = n; if (campo === 'hpT') x.fer = 0; }), o2);
    for (const u of e.unid) {
      const aberta = unidAbertas.has(u.id), tn = tipoNome(m, u.tipo), eqB = u.equip.reduce((s, q) => s + q.atq, 0), eqD = u.equip.reduce((s, q) => s + q.def, 0);
      // (lote 12, parte 12c) o HP da unidade: a soma das tropas (a ferida, à parte)
      const H = N().hpDaUnidade(u);
      const maqN = N().somaDasMaquinas(m, u.maq).n;
      const resumo = plural(u.tropas, 'tropa', 'tropas') + (tn ? ' · ' + tn : '') + ' · ATQ ' + (u.atq + eqB) + ' · DEF ' + (u.def + eqD) + (u.hpT > 1 ? ' · ' + u.hpT + ' HP cada' : '') + (u.fer ? ' · 1 ferida' : '')
        + (u.cura ? ' · cura ' + u.cura + '%' : '') + (maqN ? ' · ' + plural(maqN, 'máquina', 'máquinas') : '') + (u.oc ? ' · escondida' : '');
      const corpo = aberta ? h('div', { class: 'gu-unid-corpo' },
        h('div', { class: 'row' },
          campoTexto('o:' + id + ':u:' + u.id + ':nome', 'Nome', u.nome, v => mudarUnid(id, u.id, 'mudar o nome da unidade', x => { if (!v.trim()) return false; x.nome = v.trim(); }), { max: 80 }),
          campoEscolha('o:' + id + ':u:' + u.id + ':tipo', 'Tipo', u.tipo || '', opsTipo, v => mudarUnid(id, u.id, 'mudar o tipo da unidade', x => { x.tipo = v || null; }))),
        h('div', { class: 'row gu-nums' },
          num(u, 'tropas', 'Tropas', { min: 0, max: 1e7 }), num(u, 'hpT', 'HP de cada tropa', { min: 1, max: (N().LIMITES && N().LIMITES.hpTropa) || 1e6 })),
        h('p', { class: 'note gu-hp', 'data-k': 'o:' + id + ':u:' + u.id + ':hp' }, 'HP da unidade: ' + kit().fmt(H.hp, 0) + (u.fer ? ' de ' + kit().fmt(H.max, 0) + ' · uma tropa ferida (' + (u.hpT - u.fer) + ' de ' + u.hpT + ')' : '') + ' — a soma das tropas: o dano mata uma a uma.',
          u.fer ? ' ' : null, u.fer ? botao('Curar a ferida', () => mudarUnid(id, u.id, 'curar a ferida', x => { if (!x.fer) return false; x.fer = 0; }), { c: 'sm', k: 'o:' + id + ':u:' + u.id + ':curar' }) : null),
        h('div', { class: 'row gu-nums' },
          num(u, 'atq', 'ATQ', { min: -99, max: 99 }), num(u, 'def', 'DEF', { min: -99, max: 99 })),
        h('div', { class: 'row gu-nums' },
          num(u, 'magos', 'Magos', { min: 0, max: 1e7 }), num(u, 'cura', 'Cura (%)', { min: 0, max: 100 })),
        camposMaq('o:' + id + ':u:' + u.id + ':maq', u.maq, (tid, n) => mudarUnid(id, u.id, 'mudar as máquinas da unidade', x => { const t = porMaq(x.maq, tid, n); if (!t) return false; x.maq = t; }), m),
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

  /* (lote 10, parte 3) a defesa que as construções do assentamento somam na fortificação (a Paliçada, a Muralha…), e
     a fortificação de um marcador na batalha: { def (até 20), hp, hpMax } — null se ele não protege ninguém */
  const defCons = (m, mk) => (window.MundoReino && m && mk ? window.MundoReino.defDoAssentamento(m, mk) : 0);
  // (lote 17) a defesa que o ícone do lugar soma (o castelo, o forte: a tabela da aba Guerra)
  const defIc = (m, mk) => (mk && N().defesaDoIcone ? N().defesaDoIcone(m, mk.ic) : 0);
  function fortDe(m, mk) {
    const dc = defCons(m, mk), di = defIc(m, mk);
    if (!mk || (!mk.estr && !(dc > 0) && !(di > 0))) return null;
    // (lote 12, parte 12d) as máquinas da fortificação (o dano contra exército delas entra na Abertura de quem defende)
    const sm = N().somaDasMaquinas(m, mk.estr ? mk.estr.maq : null);
    return { def: Math.max(0, Math.min(20, (mk.estr ? mk.estr.def : 0) + dc + di)), hp: mk.estr ? mk.estr.hp : 1, hpMax: mk.estr ? mk.estr.hpMax : 1, cons: dc, ic: di, maqN: sm.n, maqExe: sm.exe, maq: mk.estr && mk.estr.maq ? mk.estr.maq : {} };
  }
  /* ================= o marcador: a Fortificação ================= */
  function secFortificacao(o, m) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero, mudarObj } = kit(), id = o.id, e = o.estr, dc = defCons(m, o), di = defIc(m, o);
    const notaCons = dc > 0 ? nota('As construções daqui (aba Seleção, Assentamento) somam ' + sinal(dc) + ' de defesa' + (e ? ' na DEF da fortificação.' : ': quem defende aqui já ganha isso na batalha.')) : null;
    // (lote 17) o castelo e o forte somam pela tabela da aba Guerra
    const notaIc = di ? nota('O ícone (' + ((N().ICONES[o.ic] || {}).nome || 'lugar') + ') soma ' + sinal(di) + ' de defesa' + (e ? ' na DEF da fortificação' : ': quem defende aqui já ganha isso na batalha') + ' (a tabela fica na aba Guerra).') : null;
    // (lote 12, parte 12e) o cerco: a situação, Assaltar e Levantar; sem cerco, "Cercar…" (com um exército de outra facção perto)
    const C = CA(), sob = C && o.cerco ? blocoCerco(m, o, null) : null, podem = C && !o.cerco && (e || dc > 0) ? quemPodeCercar(m, id, null) : [];
    const cercar = podem.length ? botao('Cercar…', () => cercarLugar(id, null), { c: 'sm', k: 'o:' + id + ':cercar' }) : null;
    if (!e) return secao('Fortificação', sob, nota('Uma muralha, um forte, uma paliçada: quem defende aqui ganha a DEF dela na batalha, e as máquinas de cerco do outro lado a danificam.'), notaCons, notaIc,
      linha(botao('Pôr uma fortificação', () => mudarObj(id, 'pôr uma fortificação', x => { x.estr = { nome: '', def: 3, hp: 100, hpMax: 100 }; }), { c: 'sm', k: 'o:' + id + ':estr' }), cercar));
    const RP = N().RESERVA_PADRAO, MP = N().MILICIA_PADRAO;
    const porPadrao = (campo, pad, rot) => n => mudarObj(id, rot, x => { const v0 = x.estr[campo] != null ? x.estr[campo] : pad; if (v0 === n) return false; if (n === pad) delete x.estr[campo]; else x.estr[campo] = n; });
    const defT = Math.max(0, Math.min(20, e.def + dc + di));
    const est = e.hp <= 0 ? 'em ruínas: não protege' : e.hp < e.hpMax ? 'danificada (' + Math.round(e.hp / e.hpMax * 100) + '%)' : 'intacta';
    return secao('Fortificação', sob,
      h('div', { class: 'row' },
        campoTexto('o:' + id + ':estr-nome', 'Nome', e.nome, v => mudarObj(id, 'mudar a fortificação', x => { x.estr.nome = v.trim(); }), { max: 80, ph: 'Muralhas' }),
        campoNumero('o:' + id + ':estr-def', 'DEF (d20)', e.def, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.def = n; }), { min: 0, max: 20 })),
      h('div', { class: 'row' },
        campoNumero('o:' + id + ':estr-hp', 'HP', e.hp, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.hp = n; }), { min: 0, max: e.hpMax }),
        campoNumero('o:' + id + ':estr-hpmax', 'HP máx.', e.hpMax, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.hpMax = n; if (x.estr.hp > n) x.estr.hp = n; }), { min: 1, max: 1e6 })),
      // (lote 12, parte 12e) a reserva de comida da cidade (dias) e a milícia
      h('div', { class: 'row' },
        campoNumero('o:' + id + ':estr-res', 'Reserva (dias)', e.res != null ? e.res : RP, porPadrao('res', RP, 'mudar a reserva da cidade'), { min: 0, max: (N().LIMITES && N().LIMITES.reserva) || 3650 }),
        campoNumero('o:' + id + ':estr-mil', 'Milícia (tropas)', e.mil != null ? e.mil : MP, porPadrao('mil', MP, 'mudar a milícia'), { min: 0, max: 1e7 })),
      nota('A reserva: os dias de comida da cidade num cerco (enche de novo quando ele acaba). A milícia: quem defende no assalto, sem exército dentro.'),
      notaCons, notaIc,
      h('p', { class: 'status' }, h('span', { class: 'tag' + (e.hp < e.hpMax ? ' guerra' : ''), text: est }), ' · protege com ' + sinal(Math.round(defT * e.hp / e.hpMax)) + ' quem defende aqui'),
      // (lote 12, parte 12d) as máquinas da fortificação
      camposMaq('o:' + id + ':estr-maq', e.maq, (tid, n) => mudarObj(id, 'mudar as máquinas da fortificação', x => { const t = porMaq(x.estr.maq, tid, n); if (!t) return false; x.estr.maq = t; }), m, 'Máquinas da fortificação (atiram em quem cerca e entram na batalha de quem defende)'),
      linha(botao('Consertar', () => mudarObj(id, 'consertar a fortificação', x => { if (x.estr.hp === x.estr.hpMax) return false; x.estr.hp = x.estr.hpMax; }), { c: 'sm', k: 'o:' + id + ':estr-conserta', off: e.hp >= e.hpMax }),
        botao('Tirar', () => { const comCerco = !!o.cerco && !(dc > 0); if (mudarObj(id, 'tirar a fortificação', x => { delete x.estr; if (comCerco) delete x.cerco; }) !== false) kit().avisoDesfazer('A fortificação saiu' + (comCerco ? ' (e o cerco acabou)' : '') + '.'); }, { c: 'sm per', k: 'o:' + id + ':estr-tirar' }), cercar));
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
  /* a proposta do "Próximo dia" — (lote 12, parte 12a) o dia da campanha: cada exército com o que come, o reabastecimento,
     a forragem e o desgaste, cada um com a caixa (desmarcar refaz as contas); aplicar vale num passo de Desfazer */
  async function proporMantimentos(dias) {
    const A = app(), m = A.mapa, C = CA();
    if (!m || !C) return;
    // (parte 12e) o sorteio dos tiros de cada cerco: o mesmo a cada conta refeita (as caixas)
    const seqs = {}, rngDe = id => { const q = seqs[id] || (seqs[id] = []); let i = 0; return () => { if (i >= q.length) q.push(rng()); return q[i++]; }; };
    const base = C.diaDaCampanha(m, dias, [], rngDe);
    if (!base.linhas.length && !(base.cercos || []).length && !(base.devast || []).length) return;
    // (o pior caso, sem reabastecer nem forragem: as linhas do desgaste que podem aparecer ficam no lugar desde o começo)
    const pior = C.diaDaCampanha(m, dias, base.linhas.flatMap(L => ['reab:' + L.g, 'forr:' + L.g]), rngDe);
    const res = await dialogoDia(m, base, pior, rec => C.diaDaCampanha(m, dias, rec, rngDe), !!(A.temJornal && A.temJornal() && DP()));
    if (!res || !kit().mesmoMapa(m.id)) return;
    let n = 0;
    // (parte 12b) as notícias da ocupação e da libertação marcadas vêm do mapa de antes (parte 12e: e as dos cercos)
    const nts = res.jornal ? propostasMarcadas(res).map(x => (x.lib ? C.noticiaLibertacao(m, x.r, x.quem, x.fac) : C.noticiaOcupacao(m, x.r, x.fac))).concat(noticiasDosCercos(m, res)) : [];
    if (A.mudar('o dia da campanha', d => { n = C.aplicarDia(d, res); if (!n) return false; }) !== false && n) kit().avisoDesfazer(avisoDoDia(m, res) + (nts.length ? DP().porNoJornal('mt_oc_', nts) : ''));
  }
  const propostasMarcadas = res => (res.regioes || []).filter(x => (x.tipo === 'ocupar' || x.tipo === 'libertar') && !x.recusado);
  // (parte 12e) as notícias dos cercos que acabam (ninguém cercando) e dos que caem (a rendição), as marcadas
  const noticiasDosCercos = (m, res) => (res.cercos || []).flatMap(X => (X.fim && !X.recFim ? [CA().noticiaFimDoCerco(m, X.m, 'saiu')] : X.rend && !X.recRend ? [CA().noticiaQueda(m, X.m, 'rendicao')] : []));
  const nomeComida = (m, rec) => (rec && m.eco ? (m.eco.rec.find(r => r.id === rec) || {}).nome || 'comida' : 'comida');
  function avisoDoDia(m, res) {
    const { plural, fmt } = kit(), ls = res.linhas.filter(L => !L.fora), perdas = ls.reduce((s0, L) => s0 + (L.desg ? L.desg.tropas0 - L.desg.tropas1 : 0), 0);
    const gasto = Object.values(res.estoque).reduce((s0, E) => s0 + (E.de - E.para), 0), forr = ls.reduce((s0, L) => s0 + (L.forr ? L.forr.n : 0), 0), curou = ls.reduce((s0, L) => s0 + (L.cura ? L.cura.hp : 0), 0);
    const nR = id => { const r = kit().achar(m, id); return r ? kit().nomeDe(r, m) : 'A região'; };
    return (res.dias > 1 ? 'Os ' + res.dias + ' dias da campanha' : 'O dia da campanha') + ': ' + (ls.length ? ls.map(L => L.nome).join(', ') : 'nenhum exército') + '.'
      + (gasto > 0 ? ' Saíram ' + fmt(gasto, 2) + ' ' + nomeComida(m, res.rec) + ' do estoque.' : '') + (forr > 0 ? ' Forragem: ' + plural(forr, 'mantimento', 'mantimentos') + '.' : '')
      + (perdas > 0 ? ' Desgaste: −' + plural(perdas, 'tropa', 'tropas') + '.' : '')
      + (curou > 0 ? ' Cura: +' + plural(curou, 'HP', 'HP') + '.' : '')
      + propostasMarcadas(res).map(x => ' ' + nR(x.r) + (x.lib ? ' livre de novo.' : ' ocupada por ' + nomeFacDe(m, x.fac) + '.')).join('')
      // (lote 17) a terra devastada marcada
      + ((n0 => (n0 ? ' ' + (n0 === 1 ? '1 hexágono virou' : n0 + ' hexágonos viraram') + ' Terra devastada.' : ''))((res.devast || []).filter(x => !x.recusado).length))
      // (parte 12e) os cercos
      + (res.cercos || []).map(X => {
        const nL = nomeLugarDe(m, X.m);
        if (X.fim) return X.recFim ? '' : ' O cerco de ' + nL + ' acabou.';
        if (X.rend && !X.recRend) return ' ' + nL + ' se rendeu.';
        const ac = X.tiros.filter(t => t.acertou && t.dano > 0).length;
        return ' ' + nL + ':' + (X.dano > 0 ? ' a muralha −' + X.dano + (ac ? ';' : '.') : '') + (ac ? ' ' + (ac === 1 ? '1 tiro de dentro acertou.' : ac + ' tiros de dentro acertaram.') : X.dano > 0 ? '' : ' a reserva cai para ' + plural(X.res1, 'dia', 'dias') + '.');
      }).join('');
  }
  /* a janela do dia: por exército, a caixa dele (desmarcado: fica como está) e as linhas — o que come; o reabastecimento,
     a forragem e o desgaste, cada um com a caixa. As linhas ficam no lugar (as de base e as do pior caso); os números
     acompanham as caixas. (parte 12b) Depois, a ocupação: as contagens (só o texto) e as propostas — ocupar e libertar —,
     cada uma com a caixa (marcada; desmarcada, a contagem recomeça), e a caixa das notícias para o rascunho do Jornal
     (desmarcada; jornal: se dá para escrever lá). → a conta final (para MundoCampanha.aplicarDia, com jornal) ou null */
  function dialogoDia(m, base, pior, refazer, jornal) {
    const { h, fmt, plural, achar, nomeDe, facDe, nomeFac } = kit(), C = CA();
    return new Promise(resolve => {
      const rg = base.regras, nomeR = nomeComida(m, base.rec);
      const nomeF = id => { const f = id ? facDe(m, id) : null; return f ? nomeFac(f) : 'a facção'; }, nomeReg = id => { const r = id ? achar(m, id) : null; return r ? nomeDe(r, m) : ''; };
      const ONDE = { casa: 'terra de ', aliada: 'terra aliada: ', inimiga: 'terra inimiga: ', alheia: 'terra de ', neutra: 'terra neutra: ' };
      const ondeTxt = on => { const r = nomeReg(on.r); return (r ? 'em ' + r : 'fora das regiões') + (on.tipo === 'semdono' ? (r ? ', sem dono' : '')
        : on.ocup ? ', ocupada por ' + nomeF(on.dono) + (OCUP_LADO[on.tipo] ? ' (' + OCUP_LADO[on.tipo] + ')' : '') : ', ' + ONDE[on.tipo] + nomeF(on.dono)); };   // (parte 12b) a ocupada
      const motivos = X => [X.dias.fome ? 'sem comida' + (base.dias > 1 ? ' em ' + plural(X.dias.fome, 'dia', 'dias') : '') : '', X.dias.terreno ? 'terreno duro: ' + X.ter : '', X.dias.inverno ? 'inverno' : '', X.dias.cerco ? 'cerco' : ''].filter(Boolean).join(', ');
      // (parte 12e) os cercos: o nome do lugar e se o exército cerca ou está dentro
      const nomeLugar = id => nomeLugarDe(m, id), comCerco = B => (B.cerco ? (B.cerco.lado === 'fora' ? ' · cercando ' : ' · cercado em ') + nomeLugar(B.cerco.m) : '');
      const acabam = X => { const l = X.unid.filter(u => u.acaba).map(u => u.nome); return l.length ? ' · ' + (l.length === 1 ? 'acaba ' : 'acabam ') + l.join(', ') : ''; };
      let res = base;
      const cxs = [], pintores = [];
      const recusadas = () => cxs.filter(([, cb]) => !cb.checked).map(([id]) => id);
      const blocoDe = B => {
        const P = pior.linhas.find(x => x.g === B.g) || B, cb = h('input', { type: 'checkbox', 'data-k': 'dia:g:' + B.g, checked: true });
        cxs.push(['g:' + B.g, cb]);
        const come = h('p', { class: 'dia-come', 'data-k': 'dia:come:' + B.g });
        const linha = (k, tem) => {
          if (!tem) return null;
          const x = h('input', { type: 'checkbox', 'data-k': 'dia:' + k + ':' + B.g, checked: true }), t = h('span');
          cxs.push([k + ':' + B.g, x]);
          return { el: h('label', { class: 'op dia-op', 'data-k': 'dia:' + k + '-linha:' + B.g }, x, t), t, x };
        };
        // (o reabastecimento: quem pode, mesmo sem nada hoje — o estoque pode ficar para ele quando outro é desmarcado)
        const dentro = !!(B.cerco && B.cerco.lado === 'dentro');      // (parte 12e: quem está dentro do cerco não reabastece)
        const reab = linha('reab', !dentro && !!(base.rec && B.fac && B.cons > 0 && C.REABASTECE.includes(B.onde.tipo))), forr = linha('forr', !!B.forr), desg = linha('desg', !!(B.desg || P.desg));
        // (parte 12e) os tiros de dentro do cerco nas unidades dele (a caixa é a do cerco)
        const alvo = !!(B.cerco && B.cerco.lado === 'fora' && (base.cercos || []).some(X => X.m === B.cerco.m && X.atiram.length));
        const tiros = alvo ? h('p', { class: 'dia-come', 'data-k': 'dia:tiros:' + B.g }) : null;
        // (parte 12c) a cura: quem tem cura (médicos, Enfermaria) e pode ter ferida hoje (a de antes ou a do desgaste)
        const cura = linha('cura', B.curaPct > 0 && !!(B.cura || P.cura || B.desg || P.desg));
        const el = h('div', { class: 'dia-ex', 'data-k': 'dia:ex:' + B.g },
          h('label', { class: 'op dia-cab' }, cb, h('span', { class: 'tx' }, h('b', { text: B.nome }), h('small', { text: ondeTxt(B.onde) + comCerco(B) }))),
          come, reab ? reab.el : null, forr ? forr.el : null, desg ? desg.el : null, tiros, cura ? cura.el : null);
        pintores.push(() => {
          const L = res.linhas.find(x => x.g === B.g) || B, fora = !cb.checked, Q = fora ? B : L;
          el.classList.toggle('fora', fora);
          for (const l of [reab, forr, desg, cura]) if (l) l.x.disabled = fora;
          const dura = Q.cons > 0 ? Math.floor(Q.mant1 / Q.cons) : Infinity;
          come.textContent = fora ? 'Fica como está: nada muda para ele hoje.' : 'Come ' + fmt(Q.cons, 0) + ' por dia: ' + fmt(Q.mant0, 0) + ' → ' + fmt(Q.mant1, 0)
            + (dura === Infinity ? '' : dura > 0 ? ' (dá para mais ' + plural(dura, 'dia', 'dias') + ')' : Q.mant1 > 0 ? ' (não dá para mais um dia)' : ' (acabou)')
            + (Q.fomeDias ? '; ' + plural(Q.fomeDias, 'dia', 'dias') + ' sem comida: moral ' + Q.moral0 + ' → ' + Q.moral1 + ', e a fome tira ATQ' : '') + '.'
            + (!fora && Q.daReserva ? ' A reserva da cidade alimentou em ' + plural(Q.daReserva, 'dia', 'dias') + '.' : '');
          come.classList.toggle('aviso', !fora && Q.fomeDias > 0);
          if (reab) {
            const X = (!fora && L.reab) || B.reab, E = res.estoque[B.fac];
            reab.t.textContent = X ? 'Reabastece ' + plural(X.n, 'mantimento', 'mantimentos') + ' (' + fmt(X.gasto, 2) + ' ' + nomeR + ' do estoque de ' + nomeF(B.fac) + (!fora && L.reab && E ? ', que fica em ' + fmt(E.para, 2) : '') + ').'
              : 'Reabastece: nada' + (E && E.para < Math.max(rg.custo, 0.01) ? ' (o estoque de ' + nomeR + ' de ' + nomeF(B.fac) + ' acabou).' : ' (já leva o que precisa).');
          }
          if (forr) { const X = (!fora && L.forr) || B.forr; forr.t.textContent = 'Forragem: colhe ' + plural(X.n, 'mantimento', 'mantimentos') + (nomeReg(X.r) ? ' em ' + nomeReg(X.r) : ' na terra sem dono') + (base.rec && B.onde.dono ? ' (a produção de ' + nomeR + ' de lá cai nesta semana)' : '') + '.'; }
          if (desg) {
            const X = (!fora && L.desg) || B.desg || P.desg;
            desg.t.textContent = !fora && desg.x.checked && !L.desg ? 'Desgaste: nenhum, com o que está marcado.' : 'Desgaste: −' + plural(X.tropas0 - X.tropas1, 'tropa', 'tropas') + ' (' + motivos(X) + '): ' + fmt(X.tropas0, 0) + ' → ' + fmt(X.tropas1, 0) + acabam(X) + '.';
          }
          if (tiros) {
            const X = !fora && L.tiros;
            tiros.textContent = fora ? 'Fica como está: os tiros de dentro não o acertam hoje.' : X ? 'Tiros de dentro do cerco: −' + plural(X.hp, 'HP', 'HP') + ' (' + X.unid.map(u => u.nome + ' ' + fmt(u.t0, 0) + ' → ' + fmt(u.t1, 0) + (u.acaba ? ', acaba' : '')).join('; ') + ').' : 'Tiros de dentro do cerco: nenhum acertou, com o que está marcado.';
          }
          if (cura) {
            const X = (!fora && L.cura) || B.cura, quem = X ? [X.med ? 'médicos ' + X.med + '%' : '', X.enf ? 'Enfermaria de ' + X.enf.nome + ' ' + X.enf.pct + '%' : ''].filter(Boolean).join(', ') : '';
            cura.t.textContent = X && (fora || !cura.x.checked || L.cura) ? 'Cura ' + X.pct + '% (' + quem + '): +' + plural(X.hp, 'HP', 'HP') + ' na tropa ferida de ' + X.unid.map(u => u.nome).join(', ') + '.'
              : 'Cura ' + B.curaPct + '%: nenhuma tropa ferida, com o que está marcado.';
          }
        });
        return el;
      };
      // (parte 12b) a ocupação: as regiões ficam as mesmas com qualquer caixa (o exército desmarcado continua lá)
      const regs = base.regioes || [], props = regs.filter(x => x.tipo === 'ocupar' || x.tipo === 'libertar');
      const nomeForte = id => { const o = id ? achar(m, id) : null; return o ? 'a fortificação de ' + nomeDe(o, m) : 'uma fortificação'; };
      const blocoReg = x => {
        const nR = nomeReg(x.r) || 'A região';
        if (x.tipo === 'conta') return h('p', { class: 'dia-reg', 'data-k': 'dia:reg:' + x.r, text: nR + ': ' + nomeF(x.fac) + ' está lá sem ' + (x.lib ? 'as tropas de ' + nomeF(x.quem) : 'defensor') + ' — ' + x.n + ' de ' + plural(x.de, 'dia', 'dias') + (x.lib ? ' para libertar.' : ' para ocupar.') });
        if (x.tipo === 'forte') return h('p', { class: 'dia-reg', 'data-k': 'dia:reg:' + x.r, text: nR + ': ' + nomeF(x.fac) + ' está lá, mas ' + nomeForte(x.forte) + ' está de pé — para ocupar, primeiro o cerco.' });
        // (o texto fica o mesmo: desmarcada, a linha só esmaece — nada muda de lugar)
        const k = (x.lib ? 'lib:' : 'ocup:') + x.r, cb = h('input', { type: 'checkbox', 'data-k': 'dia:' + k, checked: true });
        const el = h('label', { class: 'op dia-op dia-reg-op', 'data-k': 'dia:' + k + '-linha' }, cb, h('span', { text: (x.lib ? 'Libertar ' : 'Ocupar ') + nR + ': '
          + (x.lib ? 'volta para ' + nomeF(x.dono) + (x.fac !== x.dono ? ', com as tropas de ' + nomeF(x.fac) : '') + ' (' + plural(x.n, 'dia', 'dias') + ' sem as tropas de ' + nomeF(x.quem) + ').'
            : 'fica ocupada por ' + nomeF(x.fac) + ' (' + plural(x.n, 'dia', 'dias') + ' sem defensor); a produção de lá vai para ' + nomeF(x.fac) + '.') }));
        cxs.push([k, cb]);
        pintores.push(() => el.classList.toggle('nao', !cb.checked));
        return el;
      };
      /* (parte 12e) os cercos: o lugar com as linhas do dia — as máquinas de fora na muralha e os tiros de dentro (cada um
         com a caixa; desmarcada, a linha só esmaece), a reserva (o texto) e a rendição (a caixa, marcada); sem ninguém
         cercando, a linha do fim (marcada; desmarcada, o cerco espera) */
      const cercos = base.cercos || [], cprops = cercos.filter(X => X.fim || X.rend);
      const textoTiros = Z => {
        const partes = Z.atiram.map(a0 => { const ts = Z.tiros.filter(t => t.tipo === a0.tipo), ac = ts.filter(t => t.acertou).length, ds = ts.map(t => t.d20);
          return a0.nome + ' ×' + a0.n + ' (acerto ' + a0.ac + '): saiu ' + (ds.length > 12 ? ds.slice(0, 12).join(', ') + '…' : ds.join(', ')) + ' — ' + (ac ? (ac === 1 ? '1 acertou' : ac + ' acertaram') : 'nenhum acertou'); });
        const porU = new Map();
        for (const t of Z.tiros) if (t.alvo && t.dano) { const k = t.alvo.g + '|' + t.alvo.u; porU.set(k, (porU.get(k) || 0) + t.dano); }
        const alvos = [...porU].map(([k, v0]) => { const [gid, uid] = k.split('|'), g = achar(m, gid), u = g && g.exe && !g.exe.pub ? g.exe.unid.find(q => q.id === uid) : null; return (u ? u.nome : 'uma unidade') + ' −' + v0 + ' HP'; });
        return 'Tiros de dentro: ' + partes.join('; ') + (alvos.length ? '. No alvo: ' + alvos.join(', ') : '') + '.';
      };
      const blocoCercoDia = X => {
        const nL = nomeLugar(X.m);
        const linhaC = (k, tem) => {
          if (!tem) return null;
          const x = h('input', { type: 'checkbox', 'data-k': 'dia:' + k + ':' + X.m, checked: true }), t = h('span');
          cxs.push([k + ':' + X.m, x]);
          return { el: h('label', { class: 'op dia-op', 'data-k': 'dia:' + k + '-linha:' + X.m }, x, t), t, x };
        };
        if (X.fim) {
          const f = linhaC('cfim', true);
          f.t.textContent = 'O cerco de ' + nL + ' acaba: ninguém de ' + nomeF(X.fac) + ' cerca mais (a reserva enche de novo).';
          f.el.classList.add('dia-reg-op');
          pintores.push(() => f.el.classList.toggle('nao', !f.x.checked));
          return h('div', { class: 'dia-ex dia-cerco', 'data-k': 'dia:cerco:' + X.m }, f.el);
        }
        const maq = linhaC('cmaq', X.est > 0 && X.hp0 != null && X.hp0 > 0), tiro = linhaC('ctiro', X.atiram.length > 0), rend = X.rend ? linhaC('rend', true) : null;
        const reserva = h('p', { class: 'dia-come', 'data-k': 'dia:cres:' + X.m, text: 'A reserva da cidade: ' + X.res0 + ' → ' + plural(X.res1, 'dia', 'dias') + (X.res1 > 0 ? ' (alimenta quem está dentro quando os mantimentos acabam).' : ': acabou.') });
        if (maq) maq.t.textContent = 'As máquinas de fora batem na muralha: ' + X.hp0 + ' → ' + X.hp1 + ' (' + X.est + ' por dia)' + (X.hp1 <= 0 ? ': a muralha caiu (não protege mais).' : '.');
        if (rend) { rend.t.textContent = 'Rendição: ' + nL + ' se rende (sem comida, e a moral de quem está dentro em 2 ou menos) — ' + textoQueda(m, X); rend.el.classList.add('dia-reg-op'); }
        pintores.push(() => {
          const Y = (res.cercos || []).find(z => z.m === X.m) || X;
          if (maq) maq.el.classList.toggle('nao', !maq.x.checked);
          if (tiro) { tiro.t.textContent = textoTiros(tiro.x.checked ? Y : X); tiro.el.classList.toggle('nao', !tiro.x.checked); }
          if (rend) rend.el.classList.toggle('nao', !rend.x.checked);
        });
        return h('div', { class: 'dia-ex dia-cerco', 'data-k': 'dia:cerco:' + X.m },
          h('div', { class: 'dia-cab' }, h('span', { class: 'tx' }, h('b', { text: nL }), h('small', { text: 'cercado por ' + nomeF(X.fac) + (X.dias ? ' há ' + plural(X.dias, 'dia', 'dias') : ' desde hoje') }))),
          maq ? maq.el : null, tiro ? tiro.el : null, reserva, rend ? rend.el : null);
      };
      const nProps = props.length + cprops.length;
      const cbJ = jornal && nProps ? h('input', { type: 'checkbox', 'data-k': 'dia:jornal' }) : null, verJ = cbJ ? h('div', { class: 'sem-jornal-txt', 'data-k': 'dia:jornal:txt' }) : null;
      const marcada = x => { const c = cxs.find(([k]) => k === (x.lib ? 'lib:' : 'ocup:') + x.r); return !!c && c[1].checked; };
      const marcadaC = X => { const c = cxs.find(([k]) => k === (X.fim ? 'cfim:' : 'rend:') + X.m); return !!c && c[1].checked; };
      if (verJ) pintores.push(() => {
        const l = props.filter(marcada).map(x => (x.lib ? C.noticiaLibertacao(m, x.r, x.quem, x.fac) : C.noticiaOcupacao(m, x.r, x.fac)))
          .concat(cprops.filter(marcadaC).map(X => (X.fim ? C.noticiaFimDoCerco(m, X.m, 'saiu') : C.noticiaQueda(m, X.m, 'rendicao'))));
        verJ.replaceChildren(...(l.length ? l.flatMap(r => [h('b', { text: r.tit }), h('p', { text: r.txt })]) : [h('p', { text: 'Nenhuma: as propostas estão desmarcadas.' })]));
      });
      const caixaJ = cbJ ? h('div', { class: 'sem-jornal', 'data-k': 'dia:jornal-caixa' }, h('label', { class: 'op' }, cbJ, h('span', { text: nProps > 1 ? 'Escrever as notícias no rascunho do Jornal' : 'Escrever a notícia no rascunho do Jornal' })),
        h('details', { class: 'sem-jornal-ver', 'data-k': 'dia:jornal:ver' }, h('summary', { text: nProps > 1 ? 'Ver as notícias' : 'Ver a notícia' }), verJ)) : null;
      const secCer = cercos.length ? h('div', { class: 'dia-regs', 'data-k': 'dia:cercos' }, h('b', { class: 'dia-regs-tit', text: cercos.length > 1 ? 'Os cercos' : 'O cerco' }), cercos.map(blocoCercoDia),
        h('small', { class: 'dia-nota', text: 'Desmarcada, a linha não vale hoje.' }), regs.length ? null : caixaJ) : null;
      const secReg = regs.length ? h('div', { class: 'dia-regs', 'data-k': 'dia:regs' }, h('b', { class: 'dia-regs-tit', text: 'A ocupação' }), regs.map(blocoReg),
        props.length ? h('small', { class: 'dia-nota', text: 'Desmarcada, a proposta não vale agora e a contagem recomeça do zero.' }) : null,
        caixaJ) : null;
      // (lote 17) a terra devastada: onde houve batalha ou cerco, a sugestão vem DESMARCADA (o mestre marca a que vale)
      const devs = base.devast || [];
      const blocoDev = x => {
        const cb = h('input', { type: 'checkbox', 'data-k': 'dia:dev:' + x.k });
        cxs.push(['dev:' + x.k, cb]);
        const el = h('label', { class: 'op dia-op dia-reg-op nao', 'data-k': 'dia:dev-linha:' + x.k }, cb, h('span', { text: 'Marcar como Terra devastada o hexágono ' + (x.por === 'batalha' ? 'da batalha' + (x.nome ? ' “' + x.nome + '”' : '') : 'do cerco de ' + (x.nome || 'o lugar')) + ' (' + x.k + ').' }));
        pintores.push(() => el.classList.toggle('nao', !cb.checked));
        return el;
      };
      const secDev = devs.length ? h('div', { class: 'dia-regs', 'data-k': 'dia:devs' }, h('b', { class: 'dia-regs-tit', text: 'A terra devastada' }), devs.map(blocoDev),
        h('small', { class: 'dia-nota', text: 'Só uma sugestão: marque o que vale. O terreno muda (o custo próprio do hexágono fica); dá para desfazer.' })) : null;
      const titulo = h('h2', { text: base.dias > 1 ? 'Os ' + base.dias + ' dias da campanha' : 'O dia da campanha' });
      titulo.id = 'dl-dia-' + Date.now().toString(36);
      const lista = h('div', { class: 'dia-lista', 'data-k': 'dia:lista' }, base.linhas.map(blocoDe));
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'dia:nao', text: 'Agora não' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'dia:ok', text: 'Aplicar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'Cada exército come pelo tamanho da tropa. Desmarque o que não vale; nada muda até você aplicar.' }),
        lista, secCer, secReg, secDev,
        h('small', { class: 'ajuda', text: 'As regras (o teto de ' + plural(rg.teto, 'dia', 'dias') + ', a forragem, o desgaste, os terrenos duros, o inverno e os dias para ocupar) ficam na aba Guerra.' }),
        h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl dia-dl', 'aria-labelledby': titulo.id }, form);
      const pintar = () => { for (const p0 of pintores) p0(); };
      form.addEventListener('change', ev => { if (ev.target && ev.target.type === 'checkbox') { res = refazer(recusadas()); pintar(); } });
      pintar();
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => { ev.preventDefault(); fim(Object.assign(refazer(recusadas()), { jornal: !!(cbJ && cbJ.checked) })); });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
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
      // (lote 12, parte 12e) o assalto: a fortificação do lugar cercado, com quem está dentro
      if (o.estr && !temRolagem() && fortDe(m, kit().achar(m, o.estr.m))) bat.estr = { m: o.estr.m, lado: o.estr.lado };
    }
    if (!bat) return;
    mostrarJanela();
  }
  function novaBatalha(m, a, b) {
    const x = { a, b, estr: null, hex: null, mestre: [], modo: null, res: null, moms: [], fim: null, notas: [], tela: 'montar', frente: null, hexEst: null, form: null, formAberto: false, formM: null,
      herois: { a: [], b: [] }, acoes: [], formH: null, ferir: true,          // (lote 9) os heróis só desta batalha, as ações heroicas e os ferimentos
      terLado: null };                                                       // (lote 17) quem defende o terreno (null: o de sempre)
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
        if (mk.k !== 'm' || !fortDe(m, mk)) continue;           // (lote 10) ou as construções com defesa
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
    if (bat.estr) { const mk = kit().achar(m, bat.estr.m), ft = fortDe(m, mk); if (ft) estr = { lado: bat.estr.lado, def: ft.def, hp: ft.hp, hpMax: ft.hpMax, maqExe: ft.maqExe }; }
    // (lote 9) os heróis (o bônus de cada um) e as ações heroicas
    const hv = q => heroisDoLado(m, q).map(x => ({ nome: x.nome, v: x.v }));
    const out = { estr, mestre: bat.mestre, herois: { a: hv('a'), b: hv('b') }, acoes: bat.acoes };
    // (lote 17) o terreno do hexágono da batalha, para quem defende ali
    const t = terrenoDaBatalha(m);
    if (t && t.lado) out.terreno = { lado: t.lado, v: t.v, nome: t.terreno.nome || 'terreno' };
    return out;
  }
  /* (lote 17) o terreno do hexágono da batalha: { terreno, v (a defesa da tabela), lado (quem defende: o escolhido; sem
     escolha, o da fortificação, senão B — o lado atacado) } | null */
  function terrenoDaBatalha(m) {
    const d = bat && bat.hex && N().defesaNoHex ? N().defesaNoHex(m, bat.hex) : null;
    if (!d) return null;
    const lado = bat.terLado === 'a' || bat.terLado === 'b' ? bat.terLado : bat.terLado === '-' ? null : bat.estr ? bat.estr.lado : 'b';
    return Object.assign({ lado }, d);
  }
  const lados = m => [G().lado(m, kit().achar(m, bat.a)), G().lado(m, kit().achar(m, bat.b))];

  /* ---- a ajuda da batalha: o "?" de cada parte e o painel ao lado (o conteúdo vem de guerra-ajuda.js) ----
     ajuda = null (fechada) ou { sec } — a parte pedida. O painel acompanha a batalha (os números de agora). */
  let ajuda = null;
  const Q_SVG = '<circle cx="12" cy="12" r="9.2"/><path d="M9.5 9.4a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9"/><path d="M12 17.2h.01"/>';
  const AJ = () => window.MundoGuerraAjuda || null;
  function q(sec, rotulo) {
    if (!AJ()) return null;
    const t = rotulo || 'O que é isto?';
    return el('button', { type: 'button', class: 'aj-q', 'data-k': 'gb:ajuda:' + sec, title: t, 'aria-label': t, onclick: ev => { ev.preventDefault(); abrirAjuda(sec); } }, kit().glifo(Q_SVG, 16));
  }
  // o título de uma parte da janela, com o "?" dela
  const tit = (texto, sec, rotulo) => el('div', { class: 'gb-sec-tit' }, el('b', { text: texto }), q(sec, rotulo));
  // a lista dos bônus ("Números +2 · Moral +1"), cada um com o "?" dele
  const qBonus = k => q(k === 'heroica' ? 'b:heroica' : 'b:' + k, 'O que é ' + ((G().NOMES && G().NOMES[k]) || (k === 'heroica' ? 'a ação heroica' : 'este bônus')) + '?');
  const listaBonusEl = bs => (bs.length ? bs.flatMap((b, i) => [i ? ' · ' : null, b.nome + ' ' + sinal(b.v), qBonus(b.k)]).filter(x => x != null) : ['nenhum']);
  function dadosAjuda(m) {
    const [A_, B_] = lados(m), ctx = contexto(m), mk = bat.estr ? kit().achar(m, bat.estr.m) : null, ft = mk ? fortDe(m, mk) : null;
    const hs = q0 => heroisDoLado(m, q0).map(x => ({ nome: x.nome, v: x.v }));
    return { h: kit().h, fmt: kit().fmt, plural: kit().plural, sinal, textoMoral, nomeA: A_.nome, nomeB: B_.nome, A: A_, B: B_, ctx, modo: bat.modo, res: bat.res, moms: bat.moms, fim: bat.fim,
      fort: ft ? Object.assign({ lado: bat.estr.lado, nome: (mk.estr && mk.estr.nome) || kit().nomeDe(mk, m) }, ft) : null, herois: { a: hs('a'), b: hs('b') }, mestre: bat.mestre };
  }
  function abrirAjuda(sec) {
    if (!dl || !bat || !AJ()) return;
    ajuda = { sec: sec || 'geral' };
    pintarAjuda(true);
  }
  function fecharAjuda() {
    ajuda = null;
    if (!dl) return;
    dl.classList.remove('com-ajuda');
    const as = dl.querySelector('.gb-ajuda');
    if (as) { as.hidden = true; as.replaceChildren(); }
    const c = dl.querySelector('.gb-corpo');
    if (c) c.focus({ preventScroll: true });
  }
  function pintarAjuda(levar) {
    const as = dl && dl.querySelector('.gb-ajuda'), m = app().mapa;
    if (!as || !ajuda || !bat || !m) return;
    const velho = as.querySelector('.aj-corpo'), rolagem = velho && !levar ? velho.scrollTop : 0;
    const corpo = el('div', { class: 'aj-corpo', 'data-k': 'gb:ajuda-corpo', tabindex: '-1' }, AJ().montar(dadosAjuda(m)));
    for (const b of corpo.querySelectorAll('[data-aj]')) b.addEventListener('click', () => levarA(corpo, b.getAttribute('data-aj')));
    as.replaceChildren(el('div', { class: 'aj-topo' }, el('b', { text: 'Como funciona a batalha' }),
      el('button', { type: 'button', class: 'ib', 'data-k': 'gb:ajuda-x', title: 'Fechar a ajuda (Esc)', 'aria-label': 'Fechar a ajuda', onclick: fecharAjuda }, kit().glifo(kit().X_SVG, 14))), corpo);
    as.hidden = false;
    dl.classList.add('com-ajuda');
    if (levar) levarA(corpo, ajuda.sec); else corpo.scrollTop = rolagem;
  }
  // leva o painel até uma parte do guia (e a marca por um instante)
  function levarA(corpo, sec) {
    const alvo = sec === 'geral' ? null : corpo.querySelector('[data-sec="' + AJ().ondeMora(sec) + '"]');
    if (!alvo) { corpo.scrollTop = 0; corpo.focus({ preventScroll: true }); return; }
    corpo.scrollTop = Math.max(0, alvo.offsetTop - corpo.offsetTop - 8);
    alvo.classList.remove('aj-alvo'); void alvo.offsetWidth; alvo.classList.add('aj-alvo');
    corpo.focus({ preventScroll: true });
  }

  // a janela: criada uma vez por batalha; Esc ou fechar com dados rolados pergunta antes
  function mostrarJanela() {
    if (!dl) {
      const corpo = document.createElement('div');
      corpo.className = 'gb-corpo';
      dl = document.createElement('dialog');
      dl.className = 'mundo-dl gb';
      dl.setAttribute('aria-label', 'Batalha');
      corpo.tabIndex = -1;
      const as = document.createElement('aside');                // a ajuda (o "?"), ao lado
      as.className = 'gb-ajuda';
      as.hidden = true;
      as.setAttribute('aria-label', 'Como funciona a batalha');
      dl.append(corpo, as);
      dl.addEventListener('cancel', ev => { ev.preventDefault(); if (ajuda) fecharAjuda(); else fecharJanela(); });
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
    dl.remove(); dl = null; ajuda = null;
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
    if (ajuda) pintarAjuda(false);                             // a ajuda acompanha os números de agora
  }
  const el = (tag, attrs, ...kids) => kit().h(tag, attrs, ...kids);
  function bt(texto, fn, o = {}) { return el('button', { type: 'button', class: 'btn' + (o.c ? ' ' + o.c : ''), 'data-k': o.k, title: o.title, disabled: o.off, onclick: fn }, texto); }

  function telaBatalha(m) {
    const [A_, B_] = lados(m), ctx = contexto(m), out = [];
    const nomeA = A_.nome, nomeB = B_.nome, rolou = temRolagem();
    out.push(el('div', { class: 'gb-topo' }, el('h2', { text: 'Batalha' }), q('geral', 'Como funciona a batalha'), el('span', { class: 'note', text: kit().dataTxt(m, m.cal.dia) + (bat.hex ? ' · hexágono ' + bat.hex : '') }),
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
      out.push(el('label', { class: 'field' }, el('span', { class: 'gb-rot-q' }, 'Fortificação', q('b:estrutura', 'Como a fortificação ajuda')),
        el('select', { class: 'in', 'data-k': 'gb:estr', disabled: rolou || null, onchange: ev => { const v = ev.target.value; bat.estr = v ? { m: v.split('|')[0], lado: v.split('|')[1] } : null; pintarBatalha(); } },
          [el('option', { value: '', text: 'Ninguém defende uma fortificação', selected: !bat.estr ? true : null })].concat(fts.map(f => { const mk = kit().achar(m, f.m); return el('option', { value: f.m + '|' + f.lado, selected: bat.estr && bat.estr.m === f.m && bat.estr.lado === f.lado ? true : null, text: nomeL(f.lado) + ' defende ' + ((mk.estr && mk.estr.nome) || kit().nomeDe(mk, m)) }); })))));
    }
    // (lote 17) o terreno do hexágono: quem defende ganha a defesa dele (a tabela da aba Guerra)
    const tb = terrenoDaBatalha(m);
    if (tb) {
      const val = bat.terLado === 'a' || bat.terLado === 'b' || bat.terLado === '-' ? bat.terLado : '';
      const op = (v, t) => el('option', { value: v, selected: val === v ? true : null, text: t });
      out.push(el('label', { class: 'field' }, el('span', { class: 'gb-rot-q' }, 'Terreno: ' + (tb.terreno.nome || 'terreno') + ' (' + sinal(tb.v) + ')', q('b:terreno', 'Como o terreno ajuda')),
        el('select', { class: 'in', 'data-k': 'gb:terreno', disabled: rolou || null, onchange: ev => { bat.terLado = ev.target.value || null; pintarBatalha(); } },
          op('', 'Quem defende: ' + (bat.estr ? (bat.estr.lado === 'a' ? nomeA : nomeB) + ' (o da fortificação)' : nomeB + ' (o atacado)')),
          op(bat.estr && bat.estr.lado === 'a' ? 'b' : 'a', (bat.estr && bat.estr.lado === 'a' ? nomeB : nomeA) + ' defende o terreno'),
          op('-', 'Ninguém (campo aberto)'))));
    }
    if (rolou && !bat.fim) out.push(el('p', { class: 'note', text: 'Para trocar os lados, a fortificação ou o terreno, recomece a batalha.' }));
    // a comparação
    out.push(comparacao(m, A_, B_));
    // (lote 9) os heróis
    { const sh = secHeroisBatalha(m, nomeA, nomeB); if (sh) out.push(sh); }
    // os bônus do mestre
    out.push(secMestre(m, nomeA, nomeB));
    // a rolagem
    if (!bat.modo) {
      out.push(el('div', { class: 'gb-sec' }, tit('Rolar', 'modos', 'Resumida ou detalhada: como cada uma funciona'),
        el('div', { class: 'row gb-modos' },
          el('span', { class: 'gb-com-q' }, bt('Resumida (d100)', () => { bat.modo = 'd100'; rolarResumida(); }, { c: 'pri', k: 'gb:d100', title: 'Um d100 de cada lado, mais 5 vezes os bônus' }), q('resumida', 'Como funciona a resumida')),
          el('span', { class: 'gb-com-q' }, bt('Detalhada (d20, em momentos)', () => { bat.modo = 'd20'; rolarMomento(); }, { k: 'gb:d20', title: 'Um d20 de cada lado em cada momento: Abertura, Choque, Virada e Desfecho' }), q('detalhada', 'Como funciona a detalhada'))),
        bonusTotais(A_, B_, ctx)));
    } else if (bat.modo === 'd100') out.push(...telaResumida(nomeA, nomeB, A_, B_, ctx));
    else out.push(...telaDetalhada(nomeA, nomeB));
    // o fim
    if (bat.fim) out.push(el('div', { class: 'gb-fim', 'data-k': 'gb:fim' }, el('div', { class: 'gb-fim-tit' }, el('b', { text: G().textoFim(bat.fim, nomeA, nomeB) }), q('resultado', 'O que o resultado quer dizer')),
      el('div', { class: 'row' }, bt('Ver o depois…', () => { bat.tela = 'depois'; if (bat.frente && bat.frente.n == null) bat.frente.n = bat.fim.vence ? G().AVANCO[bat.fim.tam] : 0; pintarBatalha(); }, { c: 'pri', k: 'gb:depois' }),
        bt('Recomeçar', recomecar, { k: 'gb:recomecar' }))));
    else if (rolou) out.push(el('div', { class: 'row gb-pe' }, bt('Recomeçar', recomecar, { c: 'sm', k: 'gb:recomecar' })));
    // escrever (geral)
    out.push(secNotas());
    return out;
  }
  function recomecar() { const m = app().mapa, hs = bat.herois; Object.assign(bat, novaBatalha(m, bat.a, bat.b), { herois: hs }); pintarBatalha(); }
  // a tabela dos dois lados
  function comparacao(m, A_, B_) {
    const { fmt, plural } = kit(), ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b), ea = ga.exe, eb = gb.exe;
    const lin = (rot, va, vb) => el('div', null, el('span', { text: rot }), el('b', { text: va }), el('b', { text: vb }));
    const mant = e => { if (!e || e.pub) return '—'; const d = N().diasDeMantimento(e); return e.fome ? 'sem há ' + plural(e.fome, 'dia', 'dias') : d === Infinity ? '—' : plural(d, 'dia', 'dias'); };
    // (lote 12, parte 12d) as máquinas de cada lado (as da fortificação, com quem defende ali)
    const fe = bat.estr ? (mk => (mk ? fortDe(m, mk) : null))(kit().achar(m, bat.estr.m)) : null;
    const maqDe = (q, X) => [txtMaq(m, X.maq), fe && bat.estr.lado === q && fe.maqN ? 'fortificação: ' + txtMaq(m, fe.maq) : ''].filter(Boolean).join(' · ') || '—';
    return el('div', { class: 'gb-sec' }, tit('Os dois lados', 'bonus', 'Como os bônus são contados'),
      el('div', { class: 'gb-tab' },
        el('div', { class: 'gb-cab' }, el('span'), el('b', { text: A_.nome }), el('b', { text: B_.nome })),
        lin('Tropas', fmt(A_.tropas, 0), fmt(B_.tropas, 0)),          // (lote 12, parte 12c: a força são as tropas)
        lin('ATQ / DEF médios', fmt(A_.atq, 1) + ' / ' + fmt(A_.def, 1), fmt(B_.atq, 1) + ' / ' + fmt(B_.def, 1)),
        lin('Magos', fmt(A_.magos, 0), fmt(B_.magos, 0)),
        lin('À distância (força)', fmt(A_.dist, 0), fmt(B_.dist, 0)),
        lin('Máquinas de cerco', maqDe('a', A_), maqDe('b', B_)),
        lin('Moral', A_.moral + ' · ' + textoMoral(A_.moral), B_.moral + ' · ' + textoMoral(B_.moral)),
        lin('Comandante', (A_.cmdNome || '—') + ' (' + sinal(A_.cmd) + ')', (B_.cmdNome || '—') + ' (' + sinal(B_.cmd) + ')'),
        ...(() => { const ha = heroisDoLado(m, 'a'), hb = heroisDoLado(m, 'b'); return ha.length || hb.length ? [lin('Heróis', ha.length + ' (' + sinal(somaHerois(ha)) + ')', hb.length + ' (' + sinal(somaHerois(hb)) + ')')] : []; })(),
        lin('Mantimentos', mant(ea), mant(eb))));
  }
  // (lote 9) os heróis na batalha: os de cada lado (do exército e só desta batalha), o bônus de cada um e o teto
  function secHeroisBatalha(m, nomeA, nomeB) {
    const ps = personagens();
    if (!ps) return null;
    const rolou = temRolagem(), usados = new Set(heroisDoLado(m, 'a').concat(heroisDoLado(m, 'b')).map(x => x.ficha)), col = [];
    for (const q of ['a', 'b']) {
      const hs = heroisDoLado(m, q), soma = hs.reduce((t, x) => t + x.v, 0), teto = somaHerois(hs);
      const itens = hs.map(x => x.de === 'exe'
        ? el('span', { class: 'chip gb-chip sem-x', 'data-k': 'gb:heroi:' + q + ':' + x.ficha, title: 'O bônus muda no exército (no painel)' },
          el('b', { text: x.nome + ' ' + sinal(x.v) }), el('small', { text: (x.b == null ? 'pela ficha' : 'escrito por você') + ' · do exército' }))
        : el('span', { class: 'chip gb-chip', 'data-k': 'gb:heroi:' + q + ':' + x.ficha },
          el('b', { text: x.nome }),
          el('input', { class: 'num', type: 'number', min: -20, max: 20, step: 1, value: x.b == null ? '' : String(x.b), placeholder: sinal(x.sug), 'data-k': 'gb:heroi-b:' + q + ':' + x.ficha,
            'aria-label': 'Bônus de ' + x.nome + ' nesta batalha (vazio: o sugerido pela ficha, ' + sinal(x.sug) + ')', title: 'Vazio: o sugerido pela ficha (' + sinal(x.sug) + ')',
            onchange: ev => {
              const t = String(ev.target.value).trim(), n = t === '' ? null : Math.round(Number(t)), z = (bat.herois[q] || []).find(y => y.ficha === x.ficha);
              if (!z) return;
              if (n != null && !(Number.isFinite(n) && n >= -20 && n <= 20)) { app().toast('Use um número de −20 a 20 (vazio: o sugerido pela ficha).'); ev.target.value = z.b == null ? '' : String(z.b); return; }
              if (n == null) delete z.b; else z.b = n;
              recalcular();
            } }),
          el('small', { text: 'só nesta batalha' }),
          el('button', { type: 'button', class: 'ib', 'aria-label': 'Tirar ' + x.nome + ' desta batalha', title: 'Tirar desta batalha', 'data-k': 'gb:heroi-x:' + q + ':' + x.ficha,
            onclick: () => { bat.herois[q] = bat.herois[q].filter(y => y.ficha !== x.ficha); recalcular(); } }, kit().glifo(kit().X_SVG, 12))));
      const livres = ps.filter(l => !usados.has(l.id));
      col.push(el('div', { class: 'gb-herois-lado' }, el('b', { text: q === 'a' ? nomeA : nomeB }),
        itens.length ? el('div', { class: 'gb-chips' }, itens) : el('p', { class: 'note', text: 'Nenhum herói.' }),
        hs.length ? el('p', { class: 'note', 'data-k': 'gb:herois-soma:' + q, text: 'Somam ' + sinal(teto) + (soma !== teto ? ' (passaram de ' + sinal(soma) + ': o teto é ' + sinal(G().MAX_HEROIS_BONUS) + ')' : '') + ' na Virada' + (bat.modo === 'd100' ? ' e na resumida' : '') + '.' }) : null,
        livres.length ? el('select', { class: 'in', 'data-k': 'gb:heroi-novo:' + q, 'aria-label': 'Pôr um herói em ' + (q === 'a' ? nomeA : nomeB) + ' nesta batalha',
          onchange: ev => { const v = ev.target.value; if (!v) return; bat.herois[q] = (bat.herois[q] || []).concat([{ ficha: v }]); recalcular(); } },
          [el('option', { value: '', text: '+ Herói nesta batalha…' })].concat(livres.map(l => el('option', { value: l.id, text: l.nome || 'Sem nome' })))) : null));
    }
    return el('div', { class: 'gb-sec', 'data-k': 'gb:herois' }, tit('Heróis', 'herois', 'Como os heróis entram na batalha'), el('div', { class: 'gb-herois' }, col),
      el('p', { class: 'note', text: 'Os heróis somam na Virada (e na resumida), até ' + sinal(G().MAX_HEROIS_BONUS) + ' por lado. Nos momentos-chave da detalhada, um herói pode tentar uma ação heroica.' + (rolou ? ' Mudar os heróis muda o resultado (os dados ficam).' : '') }));
  }
  // (lote 9) a ação heroica num momento-chave: o herói rola um atributo da ficha contra a dificuldade
  function formHeroica(m, x, i) {
    const f = bat.formH, hs = heroisDoLado(m, 'a').concat(heroisDoLado(m, 'b')), nome = q => kit().nomeDe(kit().achar(m, bat[q]), m);
    if (!hs.length) return el('p', { class: 'note', text: 'Nenhum herói na batalha: ponha um na seção Heróis.' });
    if (!f.ficha || !hs.some(h0 => h0.ficha === f.ficha)) f.ficha = hs[0].ficha;
    const hr = hs.find(h0 => h0.ficha === f.ficha), c = hr.contas;
    const rot = (t, c) => el('label', { class: 'gb-f-campo' }, el('small', { text: t }), c);
    const sel = (k, t, val, ops, set) => rot(t, el('select', { class: 'in', 'data-k': 'gb:fh-' + k, onchange: ev => { set(ev.target.value); pintarBatalha(); } }, ops.map(([v, tx]) => el('option', { value: v, text: tx, selected: String(v) === String(val) ? true : null }))));
    const rolar = () => {
      const dif = Math.round(Number(f.dif) || 0);
      if (!(dif >= 1)) { app().toast('Escolha a dificuldade (1 ou mais).'); return; }
      const valor = c ? c.valor(f.attr) : 0;
      if (!(valor >= 1)) { app().toast((c && c.nomes[f.attr]) || f.attr + ': não há o que rolar.'); return; }
      const D = window.TC && window.TC.dice, r = D && typeof D.rollFixaMais === 'function' ? D.rollFixaMais(valor, c.fixa, null) : { ok: true, total: valor, dieValue: 0, fixa: 0 };
      if (!r.ok) { app().toast(r.error || 'Não deu para rolar.'); return; }
      const v = G().resultadoHeroico(r.total, dif);
      bat.acoes.push({ mom: x.k, i, lado: hr.lado, ficha: hr.ficha, nome: hr.nome, attr: f.attr, valor, d: r.dieValue, fixa: r.fixa, total: r.total, dif, v });
      bat.formH = null;
      recalcular();
    };
    return el('div', { class: 'gb-form gb-form-mom gb-form-h', 'data-k': 'gb:fh-form' },
      el('p', { class: 'note gb-f-tit', text: 'Ação heroica ' + EM[x.k] + ' ' + MOM_NOME[x.k] + ': o herói rola um atributo da ficha contra a dificuldade — passou, +5; passou pelo dobro, +10; falhou, −2.' }),
      sel('heroi', 'Quem', f.ficha, hs.map(h0 => [h0.ficha, h0.nome + ' (' + nome(h0.lado) + ')']), v => { f.ficha = v; }),
      sel('attr', 'Atributo', f.attr, ROLAVEIS.map(k => [k, ((c && c.nomes[k]) || k) + (c ? ' ' + c.valor(k) : '')]), v => { f.attr = v; }),
      rot('Dificuldade', el('input', { class: 'in', type: 'number', min: 1, max: 999, step: 1, value: String(f.dif), 'data-k': 'gb:fh-dif', oninput: ev => { f.dif = Math.round(Number(ev.target.value) || 0); },
        onkeydown: ev => { if (ev.key === 'Enter') { ev.preventDefault(); rolar(); } } })),
      el('div', { class: 'gb-f-bts' }, bt('Cancelar', () => { bat.formH = null; pintarBatalha(); }, { c: 'sm', k: 'gb:fh-cancelar' }), bt('Rolar', rolar, { c: 'sm pri', k: 'gb:fh-rolar' })));
  }
  const textoAcao = a => 'Ação heroica de ' + a.nome + ': ' + a.attr + ' ' + a.valor + ' (' + (a.d != null ? 'd' + Math.max(0, a.valor - (a.fixa || 0)) + ' ' + a.d + ' + ' + (a.fixa || 0) + ' = ' : '') + a.total + ') contra ' + a.dif + ' — ' + (a.v >= 10 ? 'passou pelo dobro' : a.v > 0 ? 'passou' : 'falhou') + ': ' + sinal(a.v);
  // (lote 9) os ferimentos dos heróis no depois: o HP de cada um (antes e depois), pelo tamanho do resultado
  function feridasDosHerois(m) {
    const out = [];
    for (const q of ['a', 'b']) for (const hr of heroisDoLado(m, q)) {
      const hp = hr.contas && hr.contas.hp;
      if (!hp || !(hp.max > 0)) { out.push({ hr, q, sem: true }); continue; }
      const pct = G().feridaDoHeroi(bat.fim, q), dano = Math.round(hp.max * pct / 100);
      const R = window.TC.rules, novo = R.aplicarDelta(hr.linha.estado || {}, hp.id, hp.max, -dano, hp.min, hp.inicio), depois = novo && novo.rec ? novo.rec[hp.id] : hp.atual;
      out.push({ hr, q, pct, dano, hp, antes: hp.atual, depois, estado: novo });
    }
    return out;
  }
  const listaBonus = bs => (bs.length ? bs.map(b => b.nome + ' ' + sinal(b.v)).join(' · ') : 'nenhum');
  function bonusTotais(A_, B_, ctx) {
    const ba = G().bonus(A_, B_, ctx, 'a', 'd100'), bb = G().bonus(B_, A_, ctx, 'b', 'd100');
    return el('div', { class: 'gb-bonus' },
      el('p', null, el('b', { text: A_.nome + ': ' + sinal(G().total(ba)) }), ' ', el('small', null, ...listaBonusEl(ba))),
      el('p', null, el('b', { text: B_.nome + ': ' + sinal(G().total(bb)) }), ' ', el('small', null, ...listaBonusEl(bb))),
      el('p', { class: 'note', text: 'Os bônus na escala do d20. Na resumida, cada ponto vale 5 no d100; na detalhada, cada momento soma só os dele.' }));
  }
  // os bônus do mestre: tática, terreno, reforço, magia (e outro), de um lado, na batalha toda ou num momento
  function secMestre(m, nomeA, nomeB) {
    const f = bat.form || (bat.form = { lado: 'a', tipo: 'tatica', v: 2, mom: '', txt: '' });
    const chips = bat.mestre.map((b, i) => el('span', { class: 'chip gb-chip', 'data-k': 'gb:mestre:' + i },
      (b.lado === 'a' ? nomeA : nomeB) + ': ' + G().BONUS_MESTRE[b.tipo] + ' ' + sinal(b.v) + (b.mom ? ' (' + MOM_NOME[b.mom] + ')' : '') + (b.txt ? ' — ' + b.txt : ''),
      el('button', { type: 'button', class: 'ib', 'aria-label': 'Tirar o bônus', title: 'Tirar o bônus', 'data-k': 'gb:mestre-x:' + i, onclick: () => { bat.mestre.splice(i, 1); recalcular(); } }, kit().glifo(kit().X_SVG, 12))));
    return el('div', { class: 'gb-sec' }, tit('Bônus do mestre', 'b:mestre', 'O que são os bônus do mestre'),
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
    const linhaLado = (nome, d, bs, t) => el('p', null, el('b', { text: nome + ': ' + t }), ' ', el('small', null, 'd100 ' + d + ' + 5 × ' + sinal(G().total(bs)) + ' (', ...listaBonusEl(bs), ')'));
    out.push(el('div', { class: 'gb-sec gb-res', 'data-k': 'gb:res' }, tit('Resumida (d100)', 'resumida', 'Como funciona a resumida'),
      linhaLado(nomeA, r.da, r.ba, r.ta), linhaLado(nomeB, r.db, r.bb, r.tb),
      el('p', { class: 'gb-margem', text: 'Margem ' + Math.abs(r.m) + ': ' + (r.vence ? G().TAMANHOS[r.tam].toLocaleLowerCase('pt-BR') + ' de ' + (r.vence === 'a' ? nomeA : nomeB) : 'empate') + '.' }),
      el('div', { class: 'row' }, bt('Rolar de novo', rolarResumida, { c: 'sm', k: 'gb:d100-de-novo' }), botaoParar('gb:res-parar'), q('parar', 'O que é recuo, rendição e trégua'))));
    return out;
  }
  // a detalhada: os momentos rolados e o próximo
  function rolarMomento(refazer) {
    const m = app().mapa, [A_, B_] = lados(m), ctx = contexto(m);
    if (refazer) { const ult = bat.moms.pop(); if (!ult) return; bat.acoes = bat.acoes.filter(a0 => a0.mom !== ult.k); ctx.acoes = bat.acoes; bat.moms.push(G().momento(ult.k, A_, B_, ctx, rng)); }
    else { const k = G().MOMENTOS[bat.moms.length]; if (!k) return; bat.moms.push(G().momento(k, A_, B_, ctx, rng)); }
    bat.fim = bat.moms.length === G().MOMENTOS.length ? G().fimDetalhada(bat.moms) : null;
    bat.formM = null; bat.formH = null;
    bat.mostrar = bat.fim ? 'gb:fim' : 'gb:proximo';
    pintarBatalha();
  }
  function telaDetalhada(nomeA, nomeB) {
    const out = [], ult = bat.moms.length - 1, placar = bat.moms.reduce((s, x) => s + x.m, 0);
    const cards = bat.moms.map((x, i) => {
      const ganhou = x.m > 0 ? nomeA : x.m < 0 ? nomeB : null, porque = x.chave ? (x.da === 20 || x.db === 20 ? 'saiu 20' : x.da === 1 || x.db === 1 ? 'saiu 1' : 'disputa apertada') : '';
      return el('div', { class: 'gb-mom' + (x.chave ? ' chave' : ''), 'data-k': 'gb:mom:' + i },
        el('div', { class: 'gb-mom-tit' }, el('b', { text: MOM_NOME[x.k] }), q('m:' + x.k, 'O que é ' + ARTIGO[x.k] + ' ' + MOM_NOME[x.k]), el('small', { text: MOM_DICA[x.k] }),
          x.chave ? el('span', { class: 'gb-com-q' }, el('span', { class: 'tag tensao', text: 'momento-chave · ' + porque }), q('chave', 'O que é um momento-chave')) : null),
        el('p', null, el('b', { text: nomeA + ' ' + x.ta }), el('small', null, ' (d20 ' + x.da + ', ', ...listaBonusEl(x.ba), ')')),
        el('p', null, el('b', { text: nomeB + ' ' + x.tb }), el('small', null, ' (d20 ' + x.db + ', ', ...listaBonusEl(x.bb), ')')),
        el('p', { class: 'gb-margem', text: ganhou ? ganhou + ' leva o momento, por ' + Math.abs(x.m) + '.' : 'Empatado.' }),
        x.nota ? el('p', { class: 'gb-nota', text: '“' + x.nota + '”' }) : null,
        // (lote 9) as ações heroicas deste momento
        ...bat.acoes.map((a0, j) => [a0, j]).filter(([a0]) => a0.mom === x.k).map(([a0, j]) => el('p', { class: 'gb-acao' + (a0.v > 0 ? ' boa' : ' ruim'), 'data-k': 'gb:acao:' + j }, textoAcao(a0) + ' ',
          i === ult && !bat.fim ? el('button', { type: 'button', class: 'ib', 'aria-label': 'Tirar a ação heroica', title: 'Tirar a ação heroica', 'data-k': 'gb:acao-x:' + j, onclick: () => { bat.acoes.splice(j, 1); recalcular(); } }, kit().glifo(kit().X_SVG, 12)) : null)),
        i === ult && !(bat.fim && bat.fim.como !== 'dados') ? acoesDoMomento(x, i) : null,
        i === ult && bat.formH && bat.formH.i === i ? formHeroica(app().mapa, x, i) : null,
        i === ult && bat.formM && bat.formM.i === i ? formBonus(nomeA, nomeB, bat.formM, 'gb:fm-', x.k, () => { bat.formM = null; pintarBatalha(); }) : null);
    });
    out.push(el('div', { class: 'gb-sec' }, tit('Detalhada (d20) · placar ' + sinal(placar) + ' (para ' + (placar > 0 ? nomeA : placar < 0 ? nomeB : 'ninguém') + ')', 'detalhada', 'Como funciona a detalhada'), cards,
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
      // (lote 9) a ação heroica: só nos momentos-chave, com heróis na batalha
      x.chave && (heroisDoLado(app().mapa, 'a').length || heroisDoLado(app().mapa, 'b').length) ? bt('Ação heroica…', () => {
        bat.formH = bat.formH && bat.formH.i === i ? null : { i, ficha: '', attr: 'FOR', dif: 30 };
        bat.formM = null; bat.mostrar = bat.formH ? 'gb:fh-form' : null;
        pintarBatalha();
      }, { c: 'sm', k: 'gb:mom-heroica:' + i, title: 'Um herói rola um atributo da ficha contra a dificuldade (passou, +5; pelo dobro, +10; falhou, −2)' }) : null,
      x.chave && (heroisDoLado(app().mapa, 'a').length || heroisDoLado(app().mapa, 'b').length) ? q('b:heroica', 'O que é a ação heroica') : null,
      bt('Escrever', async () => {
        const v = await escreverNota('O que aconteceu ' + EM[x.k] + ' ' + MOM_NOME[x.k] + '?', x.nota || '');
        if (v == null) return;
        if (bat.moms[i]) { if (v) bat.moms[i].nota = v; else delete bat.moms[i].nota; }
        pintarBatalha();
      }, { c: 'sm', k: 'gb:mom-nota:' + i }),
      botaoParar('gb:mom-parar:' + i), q('parar', 'O que é recuo, rendição e trégua'));
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
    out.push(el('div', { class: 'gb-topo' }, el('h2', { text: 'Depois da batalha' }), q('depois', 'Como as perdas e o resto são contados'), el('span', { class: 'note', text: G().textoFim(bat.fim, nA, nB) }), bt('Fechar', () => fecharJanela(), { c: 'sm', k: 'gb:fechar' })));
    out.push(el('p', { class: 'note', text: 'Confira o que muda. Nada muda no mapa até "Aplicar" — e depois dá para desfazer.' }));
    for (const q of ['a', 'b']) {
      const L = prev.lados[q];
      if (!L) continue;
      out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:' + q }, el('b', { text: L.nome + ' — perde ' + Math.round(L.perda * 100) + '%' }),
        el('div', { class: 'gb-tab gb-tab3' },
          el('div', { class: 'gb-cab' }, el('span', { text: 'Unidade' }), el('b', { text: 'Tropas' }), el('b', { text: 'HP' })),
          L.unid.map(u => el('div', { class: u.acaba ? 'acaba' : null }, el('span', { text: u.nome + (u.acaba ? ' — acaba (sai do exército)' : '') }), el('b', { text: fmt(u.tropas0, 0) + ' → ' + fmt(u.tropas1, 0) }), el('b', { text: fmt(u.hp0, 0) + ' → ' + fmt(u.hp1, 0) })))),
        el('p', null, 'Moral ' + L.moral0 + ' → ', el('b', { text: String(L.moral1) }), ' (' + textoMoral(L.moral1) + ') · mantimentos ' + fmt(L.mant0, 0) + ' → ', el('b', { text: fmt(L.mant1, 0) }), ' (um dia de batalha)')));
    }
    if (prev.estr) out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:estr' }, el('b', { text: 'Fortificação: ' + prev.estr.nome }),
      el('p', null, 'HP ' + prev.estr.hp0 + ' → ', el('b', { text: String(prev.estr.hp1) }), ' de ' + prev.estr.hpMax + (prev.estr.hp1 <= 0 ? ' — em ruínas' : prev.estr.dano ? ' (dano ' + prev.estr.dano + ')' : ''))));
    // (lote 12, parte 12e) o cerco: a queda (quem cerca venceu quem estava dentro) ou o socorro (o cerco acaba), com a caixa
    const sc = cercoDaBatalha(m);
    if (sc) {
      const c = CA().cercoDe(m, kit().achar(m, sc.m)), jornal = !!(app().temJornal && app().temJornal() && DP()), nL = nomeLugarDe(m, sc.m);
      const txt = sc.tipo === 'queda' ? nL + ' cai — ' + textoQueda(m, Object.assign({}, c, { dentro: sc.sairam })) : 'O socorro venceu: o cerco de ' + nL + ' acaba (a reserva enche de novo).';
      out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:cerco' }, el('b', { text: sc.tipo === 'queda' ? 'O cerco: a queda' : 'O cerco: o socorro' }),
        el('label', { class: 'op' }, el('input', { type: 'checkbox', 'data-k': 'gb:dep:cerco-x', checked: bat.cercoX !== false ? true : null, onchange: ev => { bat.cercoX = !!ev.target.checked; } }), el('span', { 'data-k': 'gb:dep:cerco-txt', text: txt })),
        jornal ? el('label', { class: 'op' }, el('input', { type: 'checkbox', 'data-k': 'gb:dep:cerco-jornal', checked: bat.cercoJ ? true : null, onchange: ev => { bat.cercoJ = !!ev.target.checked; } }),
          el('span', { text: 'Escrever a notícia no rascunho do Jornal' })) : null));
    }
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
    // (lote 9) os heróis: o HP da ficha de cada um (a batalha fere)
    const fer = feridasDosHerois(m);
    if (fer.length) out.push(el('div', { class: 'gb-sec', 'data-k': 'gb:dep:herois' }, el('b', { text: 'Os heróis' }),
      el('label', { class: 'op' }, el('input', { type: 'checkbox', 'data-k': 'gb:ferir', checked: bat.ferir !== false ? true : null, onchange: ev => { bat.ferir = !!ev.target.checked; pintarBatalha(); } }), el('span', { text: 'Ferir os heróis (no HP da ficha)' })),
      el('div', { class: 'gb-tab gb-tab3' + (bat.ferir === false ? ' apagada' : '') },
        el('div', { class: 'gb-cab' }, el('span', { text: 'Herói' }), el('b', { text: 'HP' }), el('b', { text: 'Ferida' })),
        fer.map(f => f.sem ? el('div', null, el('span', { text: f.hr.nome }), el('b', { text: '—' }), el('b', { text: 'sem HP na ficha' }))
          : el('div', { 'data-k': 'gb:dep:heroi:' + f.hr.ficha }, el('span', { text: f.hr.nome + ' (' + (f.q === 'a' ? nA : nB) + ')' }), el('b', { text: f.antes + ' → ' + f.depois }), el('b', { text: '−' + f.dano + ' (' + f.pct + '%)' })))),
      el('p', { class: 'note', text: 'Quem perde: de 10% a 40% do HP máximo, pelo tamanho da derrota; quem vence, até 10%; empate ou trégua, 5%. Vai para a ficha de cada um ao aplicar (e o Desfazer volta).' })));
    out.push(el('div', { class: 'row gb-pe' }, bt('Voltar', () => { bat.tela = 'montar'; pintarBatalha(); }, { k: 'gb:voltar' }), bt('Aplicar', aplicarBatalha, { c: 'pri', k: 'gb:aplicar' })));
    return out;
  }
  // (lote 12, parte 12e) o cerco desta batalha: a queda ou o socorro (MundoCampanha.cercoNaBatalha) — ou null
  const cercoDaBatalha = m => (CA() && bat && bat.fim ? CA().cercoNaBatalha(m, { a: bat.a, b: bat.b, fim: bat.fim, estr: bat.estr }) : null);
  function aplicarBatalha() {
    const A = app(), m = A.mapa, ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b);
    if (!ga || !gb || !bat.fim) return;
    const sc = cercoDaBatalha(m), comCerco = !!sc && bat.cercoX !== false, nL = sc ? nomeLugarDe(m, sc.m) : '';
    const ntC = comCerco && bat.cercoJ && DP() ? (sc.tipo === 'queda' ? CA().noticiaQueda(m, sc.m, 'assalto') : CA().noticiaFimDoCerco(m, sc.m, 'socorro')) : null;
    const prev = G().depois(m, configDepois()), nA = kit().nomeDe(ga, m), nB = kit().nomeDe(gb, m);
    const mom = bat.modo === 'd100' && bat.res ? [{ k: 'ch', da: bat.res.da, db: bat.res.db, ta: bat.res.ta, tb: bat.res.tb }]
      : bat.moms.map(x => Object.assign({ k: x.k, da: x.da, db: x.db, ta: x.ta, tb: x.tb }, x.chave ? { chave: true } : {}, x.nota ? { nota: x.nota } : {}));
    // (lote 9) as ações heroicas vão para o histórico, como notas
    const notas = bat.notas.slice().concat(bat.acoes.map(a0 => textoAcao(a0) + ' (' + MOM_NOME[a0.mom] + ').')).slice(0, (N().LIMITES && N().LIMITES.notasBatalha) || 20);
    const reg = { id: novoId('bt'), d: m.cal.dia, nome: nA + ' × ' + nB, a: { nome: nA, g: ga.id, fac: ga.fac || null }, b: { nome: nB, g: gb.id, fac: gb.fac || null },
      modo: bat.modo === 'd20' ? 'd20' : 'd100', mom, fim: { vence: bat.fim.vence, tam: bat.fim.tam, como: bat.fim.como }, notas, hex: bat.hex || undefined };
    const texto = G().textoFim(bat.fim, nA, nB);
    const feridas = bat.ferir !== false ? feridasDosHerois(m).filter(f => !f.sem && f.dano > 0) : [];
    if (A.mudar('a batalha ' + nA + ' × ' + nB, d => { G().aplicar(d, prev, reg); if (comCerco) { if (sc.tipo === 'queda') CA().cair(d, sc.m); else CA().levantar(d, sc.m); } }) === false) { A.toast('Nada mudou.'); return; }
    const nj = ntC ? DP().noticiasDoPasso('mt_ce_', ntC) : null;
    // (lote 9) os ferimentos dos heróis, no HP da ficha de cada um. O Desfazer e o Refazer deste passo (o do aviso, os de
    // cima) levam junto: devolvem (ou tiram de novo) o que a batalha tirou, a partir do HP de agora — o que mudou na
    // ficha depois (uma cura, um dano numa cena) fica.
    const P = feridas.length && window.TC && window.TC.dados ? window.TC.dados.col('personagens') : null, feitas = [];
    if (P) for (const f of feridas) { const l = P.pegar(f.hr.ficha); if (!l) continue; P.gravar(l.id, { estado: f.estado }); feitas.push({ id: l.id, hp: f.hp, tirou: Math.max(0, (f.antes || 0) - (f.depois || 0)) }); }
    // (parte 12e: a notícia do cerco entra no mesmo "fora do passo" — um só por passo)
    if ((feitas.length || (nj && nj.posto)) && typeof A.foraDoPasso === 'function') {
      const mexer = s => () => {
        const R = window.TC && window.TC.rules;
        if (R) for (const x of feitas) { const l = P.pegar(x.id); if (l) P.gravar(x.id, { estado: R.aplicarDelta(l.estado || {}, x.hp.id, x.hp.max, s * x.tirou, x.hp.min, x.hp.inicio) }); }
      };
      A.foraDoPasso({ desfazer: () => { if (feitas.length) mexer(1)(); if (nj && nj.posto) nj.tirar(); }, refazer: () => { if (feitas.length) mexer(-1)(); if (nj && nj.posto) nj.por(); } });
    }
    bat.tela = 'aplicada';
    bat = null;
    fecharJanela(true);
    kit().avisoDesfazer('Batalha aplicada: ' + texto + '.' + (feitas.length ? ' ' + (feitas.length === 1 ? 'Um herói ferido' : feitas.length + ' heróis feridos') + ' (na ficha).' : '')
      + (comCerco ? (sc.tipo === 'queda' ? ' ' + nL + ' caiu para ' + nomeFacDe(m, sc.fac) + '.' : ' O cerco de ' + nL + ' acabou.') : '') + ' Fica no histórico (aba Guerra).' + (nj ? nj.texto : ''));
  }

  window.MundoGuerraPainel = { abaGuerra, secExercito, secFortificacao, secFasesFrente, leituraExercito, ofertarBatalhas, proporMantimentos, menuHex, abrirBatalha, comUnidades,
    secOcupacao, janelaOcupacao,                                 // (lote 12, parte 12b) a ocupação da região
    get batalha() { return bat; }, get encontros() { return encontros.slice(); } };
})();
