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
   Usa as ferramentas do painel (MundoPainel.kit): nada aqui muda o mapa direto, tudo passa por App.mudar. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const G = () => window.MundoGuerra;
  const CA = () => window.MundoCampanha || null;          // (lote 12) a campanha: o dia, as regras
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
    if (CA()) out.push(secRegras(m));
    out.push(secTipos(m), secHexes(m), secHistorico(m));
    return out;
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
        num('terreno', 'Terreno duro (% por dia)', rg.terreno, { min: 0, max: 100 }), num('inverno', 'Inverno (+% por dia)', rg.inverno, { min: 0, max: 100 })];
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
      campoNumero('o:' + id + ':mant', 'Mantimentos (comida na estrada)', e.mant, n => mudarObj(id, 'mudar os mantimentos', x => { x.exe.mant = n; if (n > 0) x.exe.fome = 0; }), { min: 0, max: 1e9 }),
      campoNumero('o:' + id + ':cons', 'Por dia', e.cons == null ? '' : e.cons, n => mudarObj(id, 'mudar o consumo', x => { x.exe.cons = n; }), { min: 1, max: 1e7, vazio: null, ph: String(Math.ceil(tr / 100) || 0) })));
    out.push(nota('Moral ' + e.moral + ': ' + textoMoral(e.moral) + '. ' + (cons > 0 ? 'Comem ' + fmt(cons, 0) + ' por dia' + (e.cons == null ? ' (um por cem soldados)' : '') + ': dá para ' + plural(dias, 'dia', 'dias') + '.' : 'Sem consumo.')
      + (e.fome ? ' Sem mantimentos há ' + plural(e.fome, 'dia', 'dias') + ': a moral cai 1 por dia, e a fome tira ATQ nas batalhas.' : ' No "Próximo dia", vem a proposta do dia da campanha; quando acabam, a moral cai e a fome tira ATQ.'),
      e.fome ? 'aviso' : null));
    // (lote 12, parte 12a) onde ele está e o que vale ali no "Próximo dia"
    if (CA()) out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':campanha', text: textoOnde(m, o) }));
    // (lote 10, pente fino) a manutenção da economia é outra coisa: o que a facção paga por semana por este exército
    const Rn = window.MundoReino;
    if (Rn && m.eco && m.eco.on) {
      const u = Rn.manutencaoDe(m, o), txt = m.eco.rec.filter(r => u[r.id]).map(r => r.nome + ' ' + kit().fmt(u[r.id], 2)).join(' · '), f = o.fac ? kit().facDe(m, o.fac) : null;
      out.push(h('p', { class: 'note', 'data-k': 'o:' + id + ':manut', text: !txt ? 'Manutenção (na Economia do mundo): este exército não custa nada por semana à facção.'
        : f ? 'Manutenção: custa a ' + kit().nomeFac(f) + ' por semana ' + txt + ' (na Economia do mundo; é outra coisa que os mantimentos, a comida que ele leva).'
          : 'Manutenção: ' + txt + ' por semana, mas sem facção ninguém paga (os mantimentos são a comida que ele leva).' }));
    }
    return [secao('Exército', out), secHeroisDoExercito(o, m), secUnidades(o, m),
      linha(botao('Abrir uma batalha com este exército…', () => abrirBatalha({ a: id }), { k: 'o:' + id + ':batalha', off: !comUnidades(o) }))];
  }
  // (lote 12, parte 12a) "Em Terra Alta, terra de Aldar: no "Próximo dia", reabastece do estoque de Aldar até 10 dias."
  function textoOnde(m, g) {
    const { achar, nomeDe, facDe, nomeFac, fmt } = kit(), C = CA(), rg = C.regrasDe(m), on = C.ondeEsta(m, g), r = on.r ? achar(m, on.r) : null;
    const nf = id => { const f = id ? facDe(m, id) : null; return f ? nomeFac(f) : 'outra facção'; };
    const ONDE = { casa: ', terra de ' + nf(on.dono), aliada: ', terra aliada (' + nf(on.dono) + ')', inimiga: ', terra inimiga (' + nf(on.dono) + ')', semdono: r ? ', sem dono' : '', alheia: ', terra de ' + nf(on.dono), neutra: ', terra neutra (' + nf(on.dono) + ')' };
    const casa = C.REABASTECE.includes(on.tipo), partes = [];
    if (casa) partes.push(C.recComida(m) && g.fac ? 'no "Próximo dia", reabastece do estoque de ' + nf(g.fac) + ' até ' + rg.teto + (rg.teto === 1 ? ' dia' : ' dias') : 'em casa (sem a economia ligada, sem estoque para reabastecer)');
    else if (C.FORRAGEIA.includes(on.tipo) && rg.forr > 0) partes.push('colhe ' + fmt(rg.forr, 1) + '% do que come (forragem)');
    else partes.push('vive do que leva');
    if (!casa) {
      const t = C.terrenoDuro(m, g, rg);
      if (t && rg.terreno > 0) partes.push('terreno duro (' + t.nome + '): −' + fmt(rg.terreno, 1) + '% das tropas por dia');
      if (rg.inverno > 0 && C.invernoEm(m, g.x, g.y, m.cal.dia, rg)) partes.push('inverno: −' + fmt(rg.inverno, 1) + '% por dia');
    }
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

  /* (lote 10, parte 3) a defesa que as construções do assentamento somam na fortificação (a Paliçada, a Muralha…), e
     a fortificação de um marcador na batalha: { def (até 20), hp, hpMax } — null se ele não protege ninguém */
  const defCons = (m, mk) => (window.MundoReino && m && mk ? window.MundoReino.defDoAssentamento(m, mk) : 0);
  function fortDe(m, mk) {
    const dc = defCons(m, mk);
    if (!mk || (!mk.estr && !(dc > 0))) return null;
    return { def: Math.min(20, (mk.estr ? mk.estr.def : 0) + dc), hp: mk.estr ? mk.estr.hp : 1, hpMax: mk.estr ? mk.estr.hpMax : 1, cons: dc };
  }
  /* ================= o marcador: a Fortificação ================= */
  function secFortificacao(o, m) {
    const { h, botao, nota, secao, linha, campoTexto, campoNumero, mudarObj } = kit(), id = o.id, e = o.estr, dc = defCons(m, o);
    const notaCons = dc > 0 ? nota('As construções daqui (aba Seleção, Assentamento) somam ' + sinal(dc) + ' de defesa' + (e ? ' na DEF da fortificação.' : ': quem defende aqui já ganha isso na batalha.')) : null;
    if (!e) return secao('Fortificação', nota('Uma muralha, um forte, uma paliçada: quem defende aqui ganha a DEF dela na batalha, e as máquinas de cerco do outro lado a danificam.'), notaCons,
      linha(botao('Pôr uma fortificação', () => mudarObj(id, 'pôr uma fortificação', x => { x.estr = { nome: '', def: 3, hp: 100, hpMax: 100 }; }), { c: 'sm', k: 'o:' + id + ':estr' })));
    const defT = Math.min(20, e.def + dc);
    const est = e.hp <= 0 ? 'em ruínas: não protege' : e.hp < e.hpMax ? 'danificada (' + Math.round(e.hp / e.hpMax * 100) + '%)' : 'intacta';
    return secao('Fortificação',
      h('div', { class: 'row' },
        campoTexto('o:' + id + ':estr-nome', 'Nome', e.nome, v => mudarObj(id, 'mudar a fortificação', x => { x.estr.nome = v.trim(); }), { max: 80, ph: 'Muralhas' }),
        campoNumero('o:' + id + ':estr-def', 'DEF (d20)', e.def, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.def = n; }), { min: 0, max: 20 })),
      h('div', { class: 'row' },
        campoNumero('o:' + id + ':estr-hp', 'HP', e.hp, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.hp = n; }), { min: 0, max: e.hpMax }),
        campoNumero('o:' + id + ':estr-hpmax', 'HP máx.', e.hpMax, n => mudarObj(id, 'mudar a fortificação', x => { x.estr.hpMax = n; if (x.estr.hp > n) x.estr.hp = n; }), { min: 1, max: 1e6 })),
      notaCons,
      h('p', { class: 'status' }, h('span', { class: 'tag' + (e.hp < e.hpMax ? ' guerra' : ''), text: est }), ' · protege com ' + sinal(Math.round(defT * e.hp / e.hpMax)) + ' quem defende aqui'),
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
  /* a proposta do "Próximo dia" — (lote 12, parte 12a) o dia da campanha: cada exército com o que come, o reabastecimento,
     a forragem e o desgaste, cada um com a caixa (desmarcar refaz as contas); aplicar vale num passo de Desfazer */
  async function proporMantimentos(dias) {
    const A = app(), m = A.mapa, C = CA();
    if (!m || !C) return;
    const base = C.diaDaCampanha(m, dias, []);
    if (!base.linhas.length) return;
    // (o pior caso, sem reabastecer nem forragem: as linhas do desgaste que podem aparecer ficam no lugar desde o começo)
    const pior = C.diaDaCampanha(m, dias, base.linhas.flatMap(L => ['reab:' + L.g, 'forr:' + L.g]));
    const res = await dialogoDia(m, base, pior, rec => C.diaDaCampanha(m, dias, rec));
    if (!res || !kit().mesmoMapa(m.id)) return;
    let n = 0;
    if (A.mudar('o dia da campanha', d => { n = C.aplicarDia(d, res); if (!n) return false; }) !== false && n) kit().avisoDesfazer(avisoDoDia(m, res));
  }
  const nomeComida = (m, rec) => (rec && m.eco ? (m.eco.rec.find(r => r.id === rec) || {}).nome || 'comida' : 'comida');
  function avisoDoDia(m, res) {
    const { plural, fmt } = kit(), ls = res.linhas.filter(L => !L.fora), perdas = ls.reduce((s0, L) => s0 + (L.desg ? L.desg.tropas0 - L.desg.tropas1 : 0), 0);
    const gasto = Object.values(res.estoque).reduce((s0, E) => s0 + (E.de - E.para), 0), forr = ls.reduce((s0, L) => s0 + (L.forr ? L.forr.n : 0), 0);
    return (res.dias > 1 ? 'Os ' + res.dias + ' dias da campanha' : 'O dia da campanha') + ': ' + ls.map(L => L.nome).join(', ') + '.'
      + (gasto > 0 ? ' Saíram ' + fmt(gasto, 2) + ' ' + nomeComida(m, res.rec) + ' do estoque.' : '') + (forr > 0 ? ' Forragem: ' + plural(forr, 'mantimento', 'mantimentos') + '.' : '')
      + (perdas > 0 ? ' Desgaste: −' + plural(perdas, 'tropa', 'tropas') + '.' : '');
  }
  /* a janela do dia: por exército, a caixa dele (desmarcado: fica como está) e as linhas — o que come; o reabastecimento,
     a forragem e o desgaste, cada um com a caixa. As linhas ficam no lugar (as de base e as do pior caso); os números
     acompanham as caixas. → a conta final (para MundoCampanha.aplicarDia) ou null */
  function dialogoDia(m, base, pior, refazer) {
    const { h, fmt, plural, achar, nomeDe, facDe, nomeFac } = kit(), C = CA();
    return new Promise(resolve => {
      const rg = base.regras, nomeR = nomeComida(m, base.rec);
      const nomeF = id => { const f = id ? facDe(m, id) : null; return f ? nomeFac(f) : 'a facção'; }, nomeReg = id => { const r = id ? achar(m, id) : null; return r ? nomeDe(r, m) : ''; };
      const ONDE = { casa: 'terra de ', aliada: 'terra aliada: ', inimiga: 'terra inimiga: ', alheia: 'terra de ', neutra: 'terra neutra: ' };
      const ondeTxt = on => { const r = nomeReg(on.r); return (r ? 'em ' + r : 'fora das regiões') + (on.tipo === 'semdono' ? (r ? ', sem dono' : '') : ', ' + ONDE[on.tipo] + nomeF(on.dono)); };
      const motivos = X => [X.dias.fome ? 'sem comida' + (base.dias > 1 ? ' em ' + plural(X.dias.fome, 'dia', 'dias') : '') : '', X.dias.terreno ? 'terreno duro: ' + X.ter : '', X.dias.inverno ? 'inverno' : ''].filter(Boolean).join(', ');
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
        const reab = linha('reab', !!(base.rec && B.fac && B.cons > 0 && C.REABASTECE.includes(B.onde.tipo))), forr = linha('forr', !!B.forr), desg = linha('desg', !!(B.desg || P.desg));
        const el = h('div', { class: 'dia-ex', 'data-k': 'dia:ex:' + B.g },
          h('label', { class: 'op dia-cab' }, cb, h('span', { class: 'tx' }, h('b', { text: B.nome }), h('small', { text: ondeTxt(B.onde) }))),
          come, reab ? reab.el : null, forr ? forr.el : null, desg ? desg.el : null);
        pintores.push(() => {
          const L = res.linhas.find(x => x.g === B.g) || B, fora = !cb.checked, Q = fora ? B : L;
          el.classList.toggle('fora', fora);
          for (const l of [reab, forr, desg]) if (l) l.x.disabled = fora;
          const dura = Q.cons > 0 ? Math.floor(Q.mant1 / Q.cons) : Infinity;
          come.textContent = fora ? 'Fica como está: nada muda para ele hoje.' : 'Come ' + fmt(Q.cons, 0) + ' por dia: ' + fmt(Q.mant0, 0) + ' → ' + fmt(Q.mant1, 0)
            + (dura === Infinity ? '' : dura > 0 ? ' (dá para mais ' + plural(dura, 'dia', 'dias') + ')' : Q.mant1 > 0 ? ' (não dá para mais um dia)' : ' (acabou)')
            + (Q.fomeDias ? '; ' + plural(Q.fomeDias, 'dia', 'dias') + ' sem comida: moral ' + Q.moral0 + ' → ' + Q.moral1 + ', e a fome tira ATQ' : '') + '.';
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
        });
        return el;
      };
      const titulo = h('h2', { text: base.dias > 1 ? 'Os ' + base.dias + ' dias da campanha' : 'O dia da campanha' });
      titulo.id = 'dl-dia-' + Date.now().toString(36);
      const lista = h('div', { class: 'dia-lista', 'data-k': 'dia:lista' }, base.linhas.map(blocoDe));
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'dia:nao', text: 'Agora não' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'dia:ok', text: 'Aplicar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'Cada exército come pelo tamanho da tropa. Desmarque o que não vale; nada muda até você aplicar.' }),
        lista,
        h('small', { class: 'ajuda', text: 'As regras (o teto de ' + plural(rg.teto, 'dia', 'dias') + ', a forragem, o desgaste, os terrenos duros e o inverno) ficam na aba Guerra.' }),
        h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl dia-dl', 'aria-labelledby': titulo.id }, form);
      const pintar = () => { for (const p0 of pintores) p0(); };
      form.addEventListener('change', ev => { if (ev.target && ev.target.type === 'checkbox') { res = refazer(recusadas()); pintar(); } });
      pintar();
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => { ev.preventDefault(); fim(refazer(recusadas())); });
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
    }
    if (!bat) return;
    mostrarJanela();
  }
  function novaBatalha(m, a, b) {
    const x = { a, b, estr: null, hex: null, mestre: [], modo: null, res: null, moms: [], fim: null, notas: [], tela: 'montar', frente: null, hexEst: null, form: null, formAberto: false, formM: null,
      herois: { a: [], b: [] }, acoes: [], formH: null, ferir: true };          // (lote 9) os heróis só desta batalha, as ações heroicas e os ferimentos
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
    if (bat.estr) { const mk = kit().achar(m, bat.estr.m), ft = fortDe(m, mk); if (ft) estr = { lado: bat.estr.lado, def: ft.def, hp: ft.hp, hpMax: ft.hpMax }; }
    // (lote 9) os heróis (o bônus de cada um) e as ações heroicas
    const hv = q => heroisDoLado(m, q).map(x => ({ nome: x.nome, v: x.v }));
    return { estr, mestre: bat.mestre, herois: { a: hv('a'), b: hv('b') }, acoes: bat.acoes };
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
    if (rolou && !bat.fim) out.push(el('p', { class: 'note', text: 'Para trocar os lados ou a fortificação, recomece a batalha.' }));
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
    return el('div', { class: 'gb-sec' }, tit('Os dois lados', 'bonus', 'Como os bônus são contados'),
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
  function aplicarBatalha() {
    const A = app(), m = A.mapa, ga = kit().achar(m, bat.a), gb = kit().achar(m, bat.b);
    if (!ga || !gb || !bat.fim) return;
    const prev = G().depois(m, configDepois()), nA = kit().nomeDe(ga, m), nB = kit().nomeDe(gb, m);
    const mom = bat.modo === 'd100' && bat.res ? [{ k: 'ch', da: bat.res.da, db: bat.res.db, ta: bat.res.ta, tb: bat.res.tb }]
      : bat.moms.map(x => Object.assign({ k: x.k, da: x.da, db: x.db, ta: x.ta, tb: x.tb }, x.chave ? { chave: true } : {}, x.nota ? { nota: x.nota } : {}));
    // (lote 9) as ações heroicas vão para o histórico, como notas
    const notas = bat.notas.slice().concat(bat.acoes.map(a0 => textoAcao(a0) + ' (' + MOM_NOME[a0.mom] + ').')).slice(0, (N().LIMITES && N().LIMITES.notasBatalha) || 20);
    const reg = { id: novoId('bt'), d: m.cal.dia, nome: nA + ' × ' + nB, a: { nome: nA, g: ga.id, fac: ga.fac || null }, b: { nome: nB, g: gb.id, fac: gb.fac || null },
      modo: bat.modo === 'd20' ? 'd20' : 'd100', mom, fim: { vence: bat.fim.vence, tam: bat.fim.tam, como: bat.fim.como }, notas, hex: bat.hex || undefined };
    const texto = G().textoFim(bat.fim, nA, nB);
    const feridas = bat.ferir !== false ? feridasDosHerois(m).filter(f => !f.sem && f.dano > 0) : [];
    if (A.mudar('a batalha ' + nA + ' × ' + nB, d => { G().aplicar(d, prev, reg); }) === false) { A.toast('Nada mudou.'); return; }
    // (lote 9) os ferimentos dos heróis, no HP da ficha de cada um. O Desfazer e o Refazer deste passo (o do aviso, os de
    // cima) levam junto: devolvem (ou tiram de novo) o que a batalha tirou, a partir do HP de agora — o que mudou na
    // ficha depois (uma cura, um dano numa cena) fica.
    const P = feridas.length && window.TC && window.TC.dados ? window.TC.dados.col('personagens') : null, feitas = [];
    if (P) for (const f of feridas) { const l = P.pegar(f.hr.ficha); if (!l) continue; P.gravar(l.id, { estado: f.estado }); feitas.push({ id: l.id, hp: f.hp, tirou: Math.max(0, (f.antes || 0) - (f.depois || 0)) }); }
    if (feitas.length && typeof A.foraDoPasso === 'function') {
      const mexer = s => () => {
        const R = window.TC && window.TC.rules;
        if (R) for (const x of feitas) { const l = P.pegar(x.id); if (l) P.gravar(x.id, { estado: R.aplicarDelta(l.estado || {}, x.hp.id, x.hp.max, s * x.tirou, x.hp.min, x.hp.inicio) }); }
      };
      A.foraDoPasso({ desfazer: mexer(1), refazer: mexer(-1) });
    }
    bat.tela = 'aplicada';
    bat = null;
    fecharJanela(true);
    kit().avisoDesfazer('Batalha aplicada: ' + texto + '.' + (feitas.length ? ' ' + (feitas.length === 1 ? 'Um herói ferido' : feitas.length + ' heróis feridos') + ' (na ficha).' : '') + ' Fica no histórico (aba Guerra).');
  }

  window.MundoGuerraPainel = { abaGuerra, secExercito, secFortificacao, secFasesFrente, leituraExercito, ofertarBatalhas, proporMantimentos, menuHex, abrirBatalha,
    get batalha() { return bat; }, get encontros() { return encontros.slice(); } };
})();
