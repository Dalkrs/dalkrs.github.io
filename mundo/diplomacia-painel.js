/* Tiny Cats · Mapa-múndi · a diplomacia no painel (lote 11, parte 3a).
   A aba Diplomacia: o filtro de facção; as relações entre as facções (para quem mestra, a relação de cada par — a mesma
   da aba Reinos — e a opinião de cada lado, com "Opinião…": os motivos, cada um com o valor e um prazo); os tratados
   (os em vigor, os vencidos e os que ainda não começaram; os encerrados recolhidos), com "+ Tratado" e "Tipos de
   tratado…". O cartão do tratado: o tipo, as partes (duas ou mais facções), o começo e o prazo pela data do mundo, se
   é público, os termos e a nota; "Encerrar o tratado…" e "Reabrir". Para quem joga, as relações (as que não são
   neutras) e os tratados públicos, só para ler.
   (parte 3b) A vassalagem ("+ Vassalagem": a vassala, a suserana, desde quando e o tributo por semana — um recurso da
   economia), as trocas por semana no cartão do tratado, a vassalagem na aba Reinos ("vassala de …") e a parte da
   diplomacia na prévia da semana (o tributo e as trocas, que o mestre desmarca; os tratados e os motivos que vencem).
   Quem joga vê a vassalagem (sem o tributo).
   (parte 3c) Os motivos de guerra de cada facção (só o mestre; as sugestões pelos pretendentes dos títulos), "Declarar
   guerra…" e "Fazer a paz…" no par de facções, com prévia, e a notícia para o rascunho do Jornal (a caixa desmarcada)
   ao declarar guerra, fazer a paz e assinar um tratado.
   Nada muda até "Salvar" (ou "Criar"); tudo vale num passo de Desfazer. Usa as ferramentas do painel (MundoPainel.kit). */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const D = () => window.MundoDiplomacia;
  const N = () => window.MundoNucleo;
  const C = () => window.MundoCorte;
  const app = () => kit().app();
  const LIM = k => (N().LIMITES || {})[k];
  let filtroFac = '';                        // a facção da aba ('' = todas; só nesta página)
  let encerradosAbertos = false;             // os tratados encerrados à mostra (só nesta página)

  const mudarDipl = (rotulo, fn) => app().mudar(rotulo, mm => { if (!mm.dipl) mm.dipl = { tratados: [], opin: [], vassalos: [], motivosGuerra: [] }; return fn(mm.dipl, mm); });
  // (parte 3b) os recursos da economia (para o tributo e as trocas) e o nome de um
  const recsDe = m => (m.eco && Array.isArray(m.eco.rec) ? m.eco.rec : []);
  const nomeRec = (m, id) => (recsDe(m).find(r => r.id === id) || { nome: 'um recurso que não existe mais' }).nome;
  const qtdTxt = (m, q, rec) => kit().fmt(q, 2) + ' ' + nomeRec(m, rec);
  const dataTxt = (m, dt) => (C() ? C().dataTxt(m, dt) : '');
  const hoje = m => (C() ? C().hoje(m) : { a: 1 });
  const nomeF = (m, id) => { const K = kit(), f = K.facDe(m, id); return f ? K.nomeFac(f) : 'facção que não existe mais'; };
  const bola = f => kit().h('i', { class: 'dp-bola', style: { background: f.cor }, 'aria-hidden': 'true' });

  /* ---------------- a aba ---------------- */
  function abaDiplomacia(v) {
    const K = kit(), { h, nota, botao, linha, campoEscolha } = K, ed = app().podeEditar(), out = [h('h3', { text: 'Diplomacia' })];
    if (v.faccoes.length < 2) {
      out.push(nota(ed ? 'Crie pelo menos duas facções (aba Reinos) para ter diplomacia: as relações, os tratados e a opinião de uma sobre a outra.' : 'Nada da diplomacia ainda.'));
      return out;
    }
    if (ed) out.push(linha(botao('+ Tratado', () => janelaTratado(null), { c: 'pri sm', k: 'dp:novo', off: D().diplDe(v).tratados.length >= (LIM('tratados') || 200) }),
      botao('+ Vassalagem', () => janelaVassalagem(null), { c: 'sm', k: 'dp:vas-novo', off: D().diplDe(v).vassalos.length >= (LIM('vassalos') || 100) }),
      botao('Tipos de tratado…', () => janelaTipos(), { c: 'sm', k: 'dp:tipos' })));
    if (filtroFac && !K.facDe(v, filtroFac)) filtroFac = '';
    out.push(campoEscolha('dp:fac', 'Facção', filtroFac, [['', 'Todas as facções']].concat(v.faccoes.map(f => [f.id, K.nomeFac(f)])), x => { filtroFac = x; return false; }));
    out.push(secRelacoes(v, ed), secVassalagem(v, ed), secTratados(v, ed), ed ? secMotivosGuerra(v) : null);
    if (!ed) out.push(nota('Só o que vocês sabem: as relações, a vassalagem e os tratados públicos.'));
    return out;
  }
  // as relações de cada par de facções (quem joga: só as que não são neutras), com a opinião de cada lado
  function secRelacoes(v, ed) {
    const K = kit(), { h, secao, nota, botao, campoEscolha } = K, R = N().RELACOES, pares = [];
    v.faccoes.forEach((a, i) => v.faccoes.slice(i + 1).forEach(b => { if (!filtroFac || a.id === filtroFac || b.id === filtroFac) pares.push([a, b]); }));
    const linhas = [];
    for (const [a, b] of pares) {
      const rel = (a.rel && a.rel[b.id]) || 'neutra';
      if (!ed && rel === 'neutra') continue;
      const nomes = h('span', { class: 'dp-par-nomes' }, bola(a), h('b', { text: K.nomeFac(a) }), h('span', { class: 'dp-x', text: '⇄' }), bola(b), h('b', { text: K.nomeFac(b) }));
      const vivos = D().tratadosEntre(v, a.id, b.id).filter(t => D().estadoDe(v, t) === 'ativo').map(t => D().nomeDoTipo(v, t));
      // (parte 3b) a vassalagem entre os dois (de um lado ou do outro)
      const vx = [D().vassalagemDe(v, a.id), D().vassalagemDe(v, b.id)].find(x => x && (x.sus === a.id || x.sus === b.id));
      const extra = vivos.length || vx ? h('small', { class: 'dp-trat', text: [vx ? nomeF(v, vx.vas) + ' é vassala de ' + nomeF(v, vx.sus) : '', vivos.length ? 'tratados: ' + [...new Set(vivos)].join(', ') : ''].filter(Boolean).join(' · ') }) : null;
      if (!ed) { linhas.push(h('div', { class: 'dp-par', 'data-rel': rel, 'data-k': 'par:' + a.id + ':' + b.id }, h('div', { class: 'dp-par-cab' }, nomes, h('span', { class: 'tag ' + rel, text: R[rel] })), extra)); continue; }
      const oab = D().opiniao(v, a.id, b.id).total, oba = D().opiniao(v, b.id, a.id).total;
      const sel = campoEscolha('dprel:' + a.id + ':' + b.id, null, rel, Object.keys(R).map(k => [k, R[k]]), x => mudarRelacao(a.id, b.id, x), { rotulo: 'Relação entre ' + K.nomeFac(a) + ' e ' + K.nomeFac(b) });
      linhas.push(h('div', { class: 'dp-par', 'data-rel': rel, 'data-k': 'par:' + a.id + ':' + b.id },
        h('div', { class: 'dp-par-cab' }, nomes, sel),
        h('div', { class: 'dp-op' }, h('small', { text: 'opinião: ' + K.nomeFac(a) + ' → ' + D().opTxt(oab) + ' · ' + K.nomeFac(b) + ' → ' + D().opTxt(oba) }),
          h('span', { class: 'dp-bts' }, botao('Opinião…', () => janelaOpiniao(a.id, b.id), { c: 'sm', k: 'op:' + a.id + ':' + b.id }),
            // (parte 3c) a guerra e a paz, com prévia
            rel === 'guerra' ? botao('Fazer a paz…', () => janelaPaz(a.id, b.id), { c: 'sm', k: 'paz:' + a.id + ':' + b.id }) : botao('Declarar guerra…', () => janelaGuerra(a.id, b.id), { c: 'sm', k: 'gu:' + a.id + ':' + b.id }))),
        extra));
    }
    return secao('Relações', linhas.length ? h('div', { class: 'dp-pares', 'data-k': 'dp:pares' }, linhas) : nota(ed ? 'Nenhum par de facções.' : 'Nenhuma relação além de neutra.'),
      ed ? nota('A relação vale para os dois lados (é a mesma da aba Reinos). A opinião é de cada lado: a soma dos motivos, de −100 a +100.') : null);
  }
  function mudarRelacao(a, b, x) {
    const K = kit();
    return app().mudar('mudar a relação', mm => {
      const fa = K.facDe(mm, a), fb = K.facDe(mm, b);
      if (!fa || !fb || ((fa.rel[b] || 'neutra') === x)) return false;
      if (x === 'neutra') { delete fa.rel[b]; delete fb.rel[a]; } else { fa.rel[b] = x; fb.rel[a] = x; }
    });
  }
  // os tratados (com o filtro): os que valem primeiro; os encerrados recolhidos
  function secTratados(v, ed) {
    const K = kit(), { h, secao, nota } = K, ts = D().tratadosDe(v, filtroFac || null);
    const abertos = ts.filter(t => D().estadoDe(v, t) !== 'encerrado'), enc = ts.filter(t => D().estadoDe(v, t) === 'encerrado');
    const corpo = abertos.map(t => itemTratado(v, t, ed));
    if (enc.length) {
      corpo.push(h('details', { class: 'corte-mortos', 'data-k': 'dp:encerrados', open: encerradosAbertos || null },
        h('summary', { text: 'Encerrados (' + enc.length + ')', onclick: function (ev) { ev.preventDefault(); encerradosAbertos = !this.parentNode.open; this.parentNode.open = encerradosAbertos; } }),
        enc.map(t => itemTratado(v, t, ed))));
    }
    return secao('Tratados', corpo.length ? h('div', { class: 'dp-tratados', 'data-k': 'dp:tratados' }, corpo) : nota(ed ? 'Nenhum tratado ainda.' : 'Nenhum tratado público.'));
  }
  function quandoTxt(v, t) {
    return [t.ini ? 'desde ' + dataTxt(v, t.ini) : '', t.fim ? 'até ' + dataTxt(v, t.fim) : 'sem prazo', t.enc ? 'encerrado em ' + dataTxt(v, t.enc) : ''].filter(Boolean).join(' · ');
  }
  // (parte 3b) as trocas por semana de um tratado em texto: "Arvel → Vale: 3 Madeira · …"
  const trocasTxt = (v, t) => t.trocas.map(y => nomeF(v, y.de) + ' → ' + nomeF(v, y.para) + ': ' + qtdTxt(v, y.q, y.rec)).join(' · ');
  function itemTratado(v, t, ed) {
    const K = kit(), { h } = K, est = D().estadoDe(v, t), partes = t.partes.map(id => nomeF(v, id)).join(', ');
    const tagEst = est !== 'ativo' ? h('span', { class: 'tag' + (est === 'vencido' ? ' tensao' : ''), text: D().ESTADOS[est] }) : null;
    if (ed) {
      return h('button', { type: 'button', class: 'li clic dp-t', 'data-k': 'tr:' + t.id, onclick: () => janelaTratado(t.id) },
        h('span', { class: 'tx' }, h('b', { text: D().nomeDoTipo(v, t) + ': ' + partes }), h('small', { text: quandoTxt(v, t) }),
          t.trocas.length ? h('small', { class: 'dp-trocas', text: 'por semana: ' + trocasTxt(v, t) }) : null),
        tagEst, t.pub ? h('span', { class: 'tag', title: 'Os jogadores sabem deste tratado', text: 'público' }) : null);
    }
    return h('div', { class: 'corte-pub dp-t', 'data-k': 'tr:' + t.id },
      h('b', { text: D().nomeDoTipo(v, t) + ': ' + partes }), h('small', { text: quandoTxt(v, t) + (est !== 'ativo' ? ' · ' + D().ESTADOS[est] : '') }),
      t.txt ? h('p', { class: 'publico', text: t.txt }) : null);
  }

  /* ---------------- (parte 3b) a vassalagem ---------------- */
  // "vassala de Arvel" (a aba Reinos); '' se a facção não é vassala
  const vassalaTxt = (v, fid) => { const x = D().vassalagemDe(v, fid); return x ? 'vassala de ' + nomeF(v, x.sus) : ''; };
  // a vassalagem (com o filtro): quem é vassala de quem, desde quando e o tributo (quem joga: sem o tributo)
  function secVassalagem(v, ed) {
    const K = kit(), { h, secao, nota } = K, vs = D().diplDe(v).vassalos.filter(x => !filtroFac || x.vas === filtroFac || x.sus === filtroFac);
    if (!ed && !vs.length) return null;
    const itens = vs.map(x => {
      const tit = nomeF(v, x.vas) + ' é vassala de ' + nomeF(v, x.sus), sub = [x.desde ? 'desde ' + dataTxt(v, x.desde) : '', ed ? (x.trib ? 'tributo: ' + qtdTxt(v, x.trib.q, x.trib.rec) + ' por semana' : 'sem tributo') : ''].filter(Boolean).join(' · ');
      if (!ed) return h('div', { class: 'corte-pub dp-v', 'data-k': 'vas:' + x.vas }, h('b', { text: tit }), sub ? h('small', { text: sub }) : null);
      return h('button', { type: 'button', class: 'li clic dp-t dp-v', 'data-k': 'vas:' + x.vas, onclick: () => janelaVassalagem(x.vas) },
        h('span', { class: 'tx' }, h('b', { text: tit }), h('small', { text: sub })));
    });
    return secao('Vassalagem', itens.length ? h('div', { class: 'dp-tratados', 'data-k': 'dp:vassalos' }, itens) : nota('Nenhuma facção é vassala de outra.'));
  }
  async function janelaVassalagem(vas) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || m.faccoes.length < 2) return;
    const x = vas ? D().vassalagemDe(m, vas) : null;
    if (vas && !x) return;
    const v = await dialogoVassalagem(m, x);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.tirar) {
      const nome0 = nomeF(m, x.vas) + ' vassala de ' + nomeF(m, x.sus);
      const ok = await K.confirmar({ titulo: 'Tirar a vassalagem?', ok: 'Tirar', perigo: true, texto: nome0 + ': a vassalagem sai (e o tributo junto). Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarDipl('tirar a vassalagem', d => { const n = d.vassalos.length; d.vassalos = d.vassalos.filter(y => y.vas !== x.vas); if (d.vassalos.length === n) return false; }) !== false) K.avisoDesfazer(nomeF(m, x.vas) + ' não é mais vassala de ' + nomeF(m, x.sus) + '.');
      return;
    }
    const ok = mudarDipl(x ? 'mudar a vassalagem' : 'criar a vassalagem', d => {
      const ant = JSON.stringify(d.vassalos), i = x ? d.vassalos.findIndex(y => y.vas === x.vas) : -1;
      if (x && i < 0) return false;
      if (!x && d.vassalos.length >= (LIM('vassalos') || 100)) return false;
      if (i >= 0) d.vassalos.splice(i, 1, v); else d.vassalos.push(v);
      if (JSON.stringify(d.vassalos) === ant) return false;
    });
    if (ok !== false) K.avisoDesfazer(nomeF(m, v.vas) + ' é vassala de ' + nomeF(m, v.sus) + (x ? ': salvo.' : '.'));
  }
  /* → { vas, sus, desde, trib }, { tirar } ou null */
  function dialogoVassalagem(m, x) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const meses = mesesDe(m), recs = recsDe(m), ligada = !!(m.eco && m.eco.on);
      const opcoes = (k, val) => { const s0 = h('select', { 'data-k': k }, [h('option', { value: '', text: 'Escolha…' })].concat(m.faccoes.map(f => h('option', { value: f.id, text: K.nomeFac(f) })))); s0.value = val || ''; return s0; };
      const vas = opcoes('vs:vas', x ? x.vas : filtroFac), sus = opcoes('vs:sus', x ? x.sus : '');
      const desde = campoData('vs:desde', x ? x.desde : hoje(m), meses);
      const temTrib = h('input', { type: 'checkbox', 'data-k': 'vs:trib', checked: x && x.trib ? true : null });
      const rec = h('select', { 'data-k': 'vs:rec', 'aria-label': 'O recurso do tributo' }, recs.map(r => h('option', { value: r.id, text: r.nome })));
      if (x && x.trib) rec.value = x.trib.rec;
      const q = h('input', { type: 'text', 'data-k': 'vs:q', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Quanto', 'aria-label': 'Quanto por semana', value: x && x.trib ? K.fmtCampo(x.trib.q) : '' });
      const campos = h('div', { class: 'vs-trib', 'data-k': 'vs:trib-campos' }, rec, q, h('span', { class: 'vs-sem', text: 'por semana' }));
      const verTrib = () => { campos.hidden = !temTrib.checked; };
      temTrib.addEventListener('change', verTrib);
      verTrib();
      const titulo = h('h2', { text: x ? 'A vassalagem: ' + nomeF(m, x.vas) : 'Uma vassalagem nova' });
      titulo.id = 'dl-vs-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = x ? h('button', { type: 'button', class: 'btn per', 'data-k': 'vs:tirar', text: 'Tirar a vassalagem…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'vs:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'vs:ok', text: x ? 'Salvar' : 'Criar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('label', null, 'A vassala', vas), h('label', null, 'A suserana', sus),
        h('div', null, h('span', { class: 'ps-rot', text: 'Desde' }), desde.el),
        recs.length ? h('div', { class: 'vs-trib-caixa' }, h('label', { class: 'op' }, temTrib, h('span', { text: 'Paga tributo' })), campos,
          h('small', { class: 'ajuda', text: 'O tributo sai do estoque da vassala e vai para o da suserana quando a semana fecha (na prévia, você confere).' + (ligada ? '' : ' Só vale com a economia ligada.') }))
          : h('small', { class: 'ajuda', 'data-k': 'vs:sem-eco', text: 'O tributo usa os recursos da economia: ligue a economia na aba Reinos para cobrar tributo.' }),
        err, h('div', { class: 'pe' }, bTirar, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl vs-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const a = vas.value, b = sus.value;
          if (!a || !b) throw new Error('Escolha a vassala e a suserana.');
          if (a === b) throw new Error('A suserana tem de ser outra facção.');
          const ja = D().vassalagemDe(m, a);
          if (ja && (!x || x.vas !== a)) throw new Error(nomeF(m, a) + ' já é vassala de ' + nomeF(m, ja.sus) + ' (abra a vassalagem dela).');
          // (o círculo sem a vassalagem que está sendo mudada)
          const sem = x ? Object.assign({}, m, { dipl: Object.assign({}, m.dipl, { vassalos: m.dipl.vassalos.filter(y => y.vas !== x.vas) }) }) : m;
          if (D().fechaCirculo(sem, a, b)) throw new Error('Assim fecharia um círculo: ' + nomeF(m, b) + ' já é vassala de ' + nomeF(m, a) + ' (direto ou pela cadeia).');
          let trib = null;
          if (recs.length && temTrib.checked) {
            const n = K.lerNum(String(q.value).trim());
            if (!(n > 0)) throw new Error('O tributo: a quantidade por semana é maior que zero.');
            trib = { rec: rec.value, q: n };
          }
          fim({ vas: a, sus: b, desde: lerData(desde, 'Desde', meses), trib });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      vas.focus();
    });
  }

  /* ---------------- o cartão do tratado ---------------- */
  async function janelaTratado(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || m.faccoes.length < 2) return;
    const t = id ? D().tratadoDe(m, id) : null;
    if (id && !t) return;
    const v = await dialogoTratado(m, t, !t && !!(A.temJornal && A.temJornal()));
    if (!v || !K.mesmoMapa(m.id)) return;
    const nome0 = t ? D().nomeDoTipo(m, t) + ': ' + t.partes.map(x => nomeF(m, x)).join(', ') : '';
    if (v.tirar) {
      const ok = await K.confirmar({ titulo: 'Tirar o tratado ' + nome0 + '?', ok: 'Tirar', perigo: true, texto: 'Sai da diplomacia (para encerrar e guardar o que houve, use “Encerrar o tratado…”). Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarDipl('tirar o tratado', d => { const n = d.tratados.length; d.tratados = d.tratados.filter(x => x.id !== t.id); if (d.tratados.length === n) return false; }) !== false) K.avisoDesfazer('O tratado ' + nome0 + ' saiu.');
      return;
    }
    if (v.encerrar || v.reabrir) {
      if (v.encerrar) {
        const ok = await K.confirmar({ titulo: 'Encerrar o tratado ' + nome0 + '?', ok: 'Encerrar', texto: 'Fica guardado como encerrado hoje (' + dataTxt(m, hoje(m)) + '). Dá para desfazer (ou reabrir depois).' });
        if (!ok || !K.mesmoMapa(m.id)) return;
      }
      if (mudarDipl(v.encerrar ? 'encerrar o tratado' : 'reabrir o tratado', (d, mm) => { const x = d.tratados.find(y => y.id === t.id); if (!x) return false; x.enc = v.encerrar ? hoje(mm) : null; }) !== false)
        K.avisoDesfazer(v.encerrar ? 'O tratado ' + nome0 + ' foi encerrado.' : 'O tratado ' + nome0 + ' voltou a valer.');
      return;
    }
    const jornal = !!v.jornal;                                   // (parte 3c) o tratado novo: a notícia no rascunho do Jornal
    delete v.jornal;
    const nome1 = D().nomeDoTipo(m, v) + ': ' + v.partes.map(x => nomeF(m, x)).join(', ');
    const ok = mudarDipl(t ? 'mudar o tratado' : 'criar o tratado', d => {
      if (!t) { if (d.tratados.length >= (LIM('tratados') || 200)) return false; d.tratados.push(Object.assign({ id: N().novoId('tr'), enc: null }, v)); return; }
      const x = d.tratados.find(y => y.id === t.id);
      if (!x) return false;
      const ant = JSON.stringify(x);
      Object.assign(x, v);
      if (JSON.stringify(x) === ant) return false;
    });
    if (ok === false) return;
    const jtxt = !t && jornal ? porNoJornal('mt_tr_', D().noticiaTratado(A.mapa, D().diplDe(A.mapa).tratados.slice(-1)[0])) : '';
    K.avisoDesfazer((t ? 'O tratado ' + nome1 + ': salvo.' : 'O tratado ' + nome1 + ' entrou na diplomacia.') + jtxt);
  }
  // (parte 3c) a notícia no rascunho do Jornal (o Desfazer do passo de antes tira, o Refazer põe de novo) → o texto do aviso
  function porNoJornal(pre, r) {
    const A = app(), mat = { id: pre + Date.now().toString(36), tit: r.tit, txt: r.txt, ass: '', dest: false }, MAXM = ((window.JornalNucleo && window.JornalNucleo.MAX) || {}).materias || 30;
    let cheio = false;
    const por = () => A.mudarRascunhoJornal(jx => { if (jx.materias.some(x => x.id === mat.id)) return false; if (jx.materias.length >= MAXM) { cheio = true; return false; } jx.materias.push(Object.assign({}, mat)); });
    const tirar = () => A.mudarRascunhoJornal(jx => { const n0 = jx.materias.length; jx.materias = jx.materias.filter(x => x.id !== mat.id); if (jx.materias.length === n0) return false; });
    if (por()) { A.foraDoPasso({ desfazer: tirar, refazer: por }); return ' A notícia foi para o rascunho do Jornal.'; }
    return ' A notícia não foi para o Jornal' + (cheio ? ': o rascunho já tem ' + MAXM + ' matérias.' : '.');
  }
  // os campos de uma data do mundo (o ano, o mês e o dia) e a leitura deles (null sem o ano)
  function campoData(k, dt, meses) {
    const { h } = kit();
    const a = h('input', { type: 'text', 'data-k': k + ':ano', value: dt ? String(dt.a) : '', inputmode: 'numeric', placeholder: 'Ano', 'aria-label': 'Ano', autocomplete: 'off', class: 'ano' });
    const ms = h('select', { 'data-k': k + ':mes', 'aria-label': 'Mês' }, [h('option', { value: '', text: 'Mês —' })].concat(meses.map((x, i) => h('option', { value: String(i), text: String(x.nome || 'Mês ' + (i + 1)) }))));
    ms.value = dt && dt.m != null ? String(dt.m) : '';
    const d = h('input', { type: 'text', 'data-k': k + ':dia', value: dt && dt.d ? String(dt.d) : '', inputmode: 'numeric', placeholder: 'Dia', 'aria-label': 'Dia', autocomplete: 'off', class: 'dia' });
    return { a, ms, d, el: h('div', { class: 'ps-data' }, a, ms, d) };
  }
  function lerData(d, rot, meses) {
    const K = kit(), a0 = String(d.a.value).trim(), mi = d.ms.value, d0 = String(d.d.value).trim();
    if (!a0) { if (mi || d0) throw new Error(rot + ': escreva o ano.'); return null; }
    const a = K.lerNum(a0);
    if (!Number.isInteger(a) || Math.abs(a) > 1e6) throw new Error(rot + ': o ano é um número inteiro (pode ser negativo).');
    const out = { a };
    if (mi !== '') out.m = Number(mi);
    if (d0) {
      if (mi === '') throw new Error(rot + ': o dia precisa do mês.');
      const dd = K.lerNum(d0), max = Math.max(1, Math.round(Number(meses[out.m].dias) || 30));
      if (!Number.isInteger(dd) || dd < 1 || dd > max) throw new Error(rot + ': o dia vai de 1 a ' + max + '.');
      out.d = dd;
    }
    return out;
  }
  const mesesDe = m => (m.cal && m.cal.meses && m.cal.meses.length ? m.cal.meses : N().CAL_PADRAO.meses);
  /* → { tipo, partes, ini, fim, pub, txt, nota, trocas, jornal }, { tirar }, { encerrar }, { reabrir } ou null. jornal: a caixa
     da notícia (só no tratado novo, numa mesa com o Jornal) */
  function dialogoTratado(m, t, jornal) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const meses = mesesDe(m), tipos = D().tiposDe(m);
      const tipo = h('select', { 'data-k': 'tr:tipo' }, (t && !t.tipo ? [h('option', { value: '', text: 'Tratado (sem tipo)' })] : []).concat(tipos.map(x => h('option', { value: x.id, text: x.nome }))));
      tipo.value = t ? t.tipo || '' : tipos[0] ? tipos[0].id : '';
      const pre = t ? t.partes : filtroFac ? [filtroFac] : [];
      const partes = h('div', { class: 'dp-partes', 'data-k': 'tr:partes' }, m.faccoes.map(f => h('label', { class: 'op dp-parte' },
        h('input', { type: 'checkbox', 'data-k': 'tr:parte:' + f.id, value: f.id, checked: pre.includes(f.id) || null }), bola(f), h('span', { text: K.nomeFac(f) }))));
      const ini = campoData('tr:ini', t ? t.ini : hoje(m), meses), fim = campoData('tr:fim', t ? t.fim : null, meses);
      const prazo = h('input', { type: 'checkbox', 'data-k': 'tr:prazo', checked: t && t.fim ? true : null });
      const verPrazo = () => { fim.el.hidden = !prazo.checked; };
      prazo.addEventListener('change', verPrazo);
      verPrazo();
      /* (parte 3b) as trocas por semana (com os recursos da economia): de uma facção do tratado para outra. As escolhas
         são as facções marcadas; a que sai do tratado deixa a troca sem ela ("—"), até marcar de novo */
      const recs = recsDe(m), maxT = LIM('trocas') || 12, listaT = h('div', { class: 'tt-trocas', 'data-k': 'tr:trocas' }), linhasT = [];
      const bTroca = recs.length ? h('button', { type: 'button', class: 'btn sm', 'data-k': 'tr:troca-nova', text: '+ Troca' }) : null;
      const marcadas = () => [...partes.querySelectorAll('input:checked')].map(i => i.value);
      const refazerOpcoes = () => {
        const ps = marcadas();
        for (const l of linhasT) for (const sel of [l.de, l.para]) {
          sel.replaceChildren(...[h('option', { value: '', text: '—' })].concat(ps.map(id => h('option', { value: id, text: nomeF(m, id) }))));
          sel.value = ps.includes(sel.dataset.v) ? sel.dataset.v : '';
        }
        if (bTroca) bTroca.disabled = ps.length < 2 || linhasT.length >= maxT;
      };
      const linhaT = y => {
        const de = h('select', { 'data-k': 'tr:troca:de', 'aria-label': 'De' }), para = h('select', { 'data-k': 'tr:troca:para', 'aria-label': 'Para' });
        de.dataset.v = y.de; para.dataset.v = y.para;
        for (const s0 of [de, para]) s0.addEventListener('change', () => { s0.dataset.v = s0.value; });
        const rec = h('select', { 'data-k': 'tr:troca:rec', 'aria-label': 'O recurso' }, recs.map(r => h('option', { value: r.id, text: r.nome })));
        if (y.rec) rec.value = y.rec;
        const q = h('input', { type: 'text', 'data-k': 'tr:troca:q', inputmode: 'decimal', autocomplete: 'off', placeholder: 'Quanto', 'aria-label': 'Quanto por semana', value: y.q ? K.fmtCampo(y.q) : '' });
        const bx = h('button', { type: 'button', class: 'ib', 'data-k': 'tr:troca:x', title: 'Tirar', 'aria-label': 'Tirar a troca' }, K.glifo(K.X_SVG, 13));
        const l = { de, para, rec, q, el: h('div', { class: 'tt-troca' }, de, h('span', { class: 'dp-x', text: '→' }), para, rec, q, bx) };
        bx.addEventListener('click', () => { l.el.remove(); linhasT.splice(linhasT.indexOf(l), 1); refazerOpcoes(); });
        linhasT.push(l);
        listaT.append(l.el);
        return l;
      };
      if (recs.length) for (const y of t ? t.trocas : []) linhaT(y);
      partes.addEventListener('change', refazerOpcoes);
      if (bTroca) bTroca.addEventListener('click', () => {
        const ps = marcadas();
        if (ps.length < 2 || linhasT.length >= maxT) return;
        const l = linhaT({ de: ps[0], para: ps[1], rec: '', q: 0 });
        refazerOpcoes();
        l.q.focus();
      });
      refazerOpcoes();
      const pub = h('input', { type: 'checkbox', 'data-k': 'tr:pub', checked: t && t.pub ? true : null });
      const cxJ = jornal ? h('input', { type: 'checkbox', 'data-k': 'tr:jornal' }) : null;      // (parte 3c) desmarcada
      const area = (k, v0, ph) => { const x = h('textarea', { 'data-k': k, rows: 3, maxlength: LIM('textoDipl') || 600, placeholder: ph }); x.value = v0 || ''; return x; };
      const txt = area('tr:txt', t ? t.txt : '', 'O que o tratado diz (os jogadores leem, se for público)…'), nota = area('tr:nota', t ? t.nota : '', 'O que só você sabe: quem quer romper, o que foi prometido por baixo…');
      const est = t ? D().estadoDe(m, t) : '';
      const titulo = h('h2', { text: t ? D().nomeDoTipo(m, t) + ': ' + t.partes.map(x => nomeF(m, x)).join(', ') : 'Um tratado novo' });
      titulo.id = 'dl-tr-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = t ? h('button', { type: 'button', class: 'btn per', 'data-k': 'tr:tirar', text: 'Tirar…' }) : null;
      const bEnc = t ? h('button', { type: 'button', class: 'btn', 'data-k': est === 'encerrado' ? 'tr:reabrir' : 'tr:encerrar', text: est === 'encerrado' ? 'Reabrir' : 'Encerrar o tratado…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'tr:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'tr:ok', text: t ? 'Salvar' : 'Criar' });
      const lbl = (tx, ...el) => h('label', null, tx, ...el);
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        est && est !== 'ativo' ? h('p', { class: 'note', 'data-k': 'tr:estado', text: 'Este tratado está ' + D().ESTADOS[est] + (t.enc ? ' (' + dataTxt(m, t.enc) + ').' : '.') }) : null,
        lbl('Tipo', tipo),
        h('div', { class: 'tt-caixa' }, h('span', { class: 'ps-rot', text: 'As facções do tratado (duas ou mais)' }), partes),
        h('div', { class: 'ps-datas' }, h('div', null, h('span', { class: 'ps-rot', text: 'Começo' }), ini.el),
          h('div', null, h('label', { class: 'op' }, prazo, h('span', { text: 'Tem prazo' })), fim.el)),
        h('small', { class: 'ajuda', text: 'A data do mundo: o ano basta. Passado o prazo, o tratado fica “vencido” (a semana avisa).' }),
        recs.length ? h('div', { class: 'tt-caixa', 'data-k': 'tr:trocas-caixa' }, h('span', { class: 'ps-rot', text: 'Trocas por semana' }), listaT, h('div', { class: 'row' }, bTroca),
          h('small', { class: 'ajuda', text: 'O que uma facção do tratado manda para outra quando a semana fecha (na prévia, você confere).' + (m.eco.on ? '' : ' Só vale com a economia ligada.') })) : null,
        h('label', { class: 'op' }, pub, h('span', { text: 'Público (os jogadores sabem deste tratado)' })),
        lbl('Os termos', txt), lbl('Nota do mestre (só você vê)', nota),
        cxJ ? h('label', { class: 'op' }, cxJ, h('span', { text: 'Escrever a notícia no rascunho do Jornal' })) : null,
        err, h('div', { class: 'pe' }, bTirar, bEnc, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl tr-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim0 = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const ps = [...partes.querySelectorAll('input:checked')].map(i => i.value);
          if (ps.length < 2) throw new Error('Escolha pelo menos duas facções.');
          const di = lerData(ini, 'O começo', meses), df = prazo.checked ? lerData(fim, 'O prazo', meses) : null;
          if (prazo.checked && !df) throw new Error('O prazo: escreva ao menos o ano.');
          if (di && df && D().diaDe(m, df, true) < D().diaDe(m, di, false)) throw new Error('O prazo vem antes do começo.');
          const trocas = linhasT.map(l => {
            const n = K.lerNum(String(l.q.value).trim());
            if (!l.de.value || !l.para.value || l.de.value === l.para.value) throw new Error('Cada troca vai de uma facção do tratado para outra.');
            if (!(n > 0)) throw new Error('A quantidade de cada troca é maior que zero.');
            return { de: l.de.value, para: l.para.value, rec: l.rec.value, q: n };
          });
          fim0({ tipo: tipo.value || null, partes: ps, ini: di, fim: df, pub: pub.checked, txt: txt.value.trim(), nota: nota.value.trim(), trocas, jornal: !!(cxJ && cxJ.checked) });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      if (bTirar) bTirar.addEventListener('click', () => fim0({ tirar: true }));
      if (bEnc) bEnc.addEventListener('click', () => fim0(est === 'encerrado' ? { reabrir: true } : { encerrar: true }));
      bNao.addEventListener('click', () => fim0(null));
      dl.addEventListener('close', () => fim0(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      tipo.focus();
    });
  }

  /* ---------------- os tipos de tratado ---------------- */
  async function janelaTipos() {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const v = await dialogoTipos(m);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (mudarDipl('mudar os tipos de tratado', d => {
      const ant = JSON.stringify(d.tipos || null);
      if (!v.lista) delete d.tipos; else d.tipos = v.lista;
      if (JSON.stringify(d.tipos || null) === ant) return false;
    }) !== false) K.avisoDesfazer('Os tipos de tratado estão salvos.');
  }
  // → { lista: [{ id, nome }] | null (os de começo) } ou null
  function dialogoTipos(m) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const max = LIM('tiposTratado') || 16, caixa = h('div', { class: 'cg-lista', 'data-k': 'tp:lista' });
      const bNovo = h('button', { type: 'button', class: 'btn sm', 'data-k': 'tp:novo', text: '+ Tipo' }), bComeco = h('button', { type: 'button', class: 'btn sm', 'data-k': 'tp:comeco', text: 'Voltar aos de começo' });
      let comeco = false;
      const travar = () => { bNovo.disabled = caixa.children.length >= max; };
      const linhaT = x => {
        const i = h('input', { type: 'text', 'data-k': 'tp:nome', value: x.nome, maxlength: 40, autocomplete: 'off', 'aria-label': 'Nome do tipo' });
        i.dataset.id = x.id;
        i.addEventListener('input', () => { comeco = false; });
        const bx = h('button', { type: 'button', class: 'ib', 'data-k': 'tp:x', title: 'Tirar', 'aria-label': 'Tirar o tipo' }, K.glifo(K.X_SVG, 13));
        const l = h('div', { class: 'cg-linha' }, i, bx);
        bx.addEventListener('click', () => { l.remove(); comeco = false; travar(); });
        return l;
      };
      caixa.append(...D().tiposDe(m).map(linhaT));
      travar();
      bNovo.addEventListener('click', () => { if (caixa.children.length >= max) return; const l = linhaT({ id: N().novoId('tp'), nome: '' }); caixa.append(l); comeco = false; travar(); l.querySelector('input').focus(); });
      bComeco.addEventListener('click', () => { caixa.replaceChildren(...N().TIPOS_TRATADO.map(linhaT)); comeco = true; travar(); });
      const titulo = h('h2', { text: 'Tipos de tratado' });
      titulo.id = 'dl-tp-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'tp:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'tp:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo, caixa, h('div', { class: 'row' }, bNovo, bComeco),
        h('small', { class: 'ajuda', text: 'Os tipos que aparecem no cartão do tratado. O tratado de um tipo que sair fica como “Tratado”.' }),
        err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl cg-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const lista = [...caixa.querySelectorAll('input')].map(i => ({ id: i.dataset.id, nome: i.value.trim() }));
        if (lista.some(x => !x.nome)) { err.textContent = 'Dê um nome a cada tipo (ou tire o que está vazio).'; return; }
        fim({ lista: comeco || JSON.stringify(lista) === JSON.stringify(N().TIPOS_TRATADO) ? null : lista });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (caixa.querySelector('input') || bNovo).focus();
    });
  }

  /* ---------------- a opinião (os dois lados de um par) ---------------- */
  async function janelaOpiniao(a, b) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || !K.facDe(m, a) || !K.facDe(m, b)) return;
    const v = await dialogoOpiniao(m, a, b);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (mudarDipl('mudar a opinião entre ' + nomeF(m, a) + ' e ' + nomeF(m, b), d => {
      const ant = JSON.stringify(d.opin);
      for (const [de, sobre, motivos] of [[a, b, v.ab], [b, a, v.ba]]) {
        d.opin = d.opin.filter(o => !(o.de === de && o.sobre === sobre));
        if (motivos.length) d.opin.push({ de, sobre, motivos });
      }
      if (JSON.stringify(d.opin) === ant) return false;
    }) !== false) K.avisoDesfazer('A opinião entre ' + nomeF(m, a) + ' e ' + nomeF(m, b) + ' está salva.');
  }
  // → { ab: [motivos], ba: [motivos] } ou null
  function dialogoOpiniao(m, a, b) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const meses = mesesDe(m), max = LIM('motivosOpiniao') || 20, lados = [];
      const lado = (de, sobre) => {
        const op = D().opiniao(m, de, sobre), caixa = h('div', { class: 'op-lista', 'data-k': 'opl:' + de + ':' + sobre });
        const total = h('b', { class: 'op-total', 'data-k': 'opt:' + de + ':' + sobre });
        const bNovo = h('button', { type: 'button', class: 'btn sm', 'data-k': 'op-novo:' + de + ':' + sobre, text: '+ Motivo' });
        const somar = () => {
          let s = 0;
          for (const l of caixa.children) { const n = K.lerNum(String(l.querySelector('.op-v').value).trim()); if (Number.isInteger(n)) s += n; }
          total.textContent = D().opTxt(Math.max(-100, Math.min(100, s)));
          bNovo.disabled = caixa.children.length >= max;
        };
        const linhaM = x => {
          const t0 = h('input', { type: 'text', class: 'op-txt', 'data-k': 'op:txt', value: x ? x.txt : '', maxlength: 120, autocomplete: 'off', placeholder: 'O motivo (ex.: tomaram Valmor)', 'aria-label': 'O motivo' });
          const v0 = h('input', { type: 'text', class: 'op-v', 'data-k': 'op:v', value: x ? String(x.v) : '', inputmode: 'numeric', autocomplete: 'off', placeholder: '±', 'aria-label': 'O valor (de −100 a +100)' });
          const ate = campoData('op:ate', x ? x.ate : null, meses);
          const bx = h('button', { type: 'button', class: 'ib', 'data-k': 'op:x', title: 'Tirar', 'aria-label': 'Tirar o motivo' }, K.glifo(K.X_SVG, 13));
          const l = h('div', { class: 'op-linha' + (x && x.vencido ? ' vencido' : '') }, t0, v0, bx, h('span', { class: 'op-ate' }, h('span', { class: 'op-ate-rot', text: 'até' }), ate.el), x && x.vencido ? h('span', { class: 'tag tensao', text: 'vencido' }) : null);
          l._ate = ate; l._id = x ? x.id : N().novoId('om');
          v0.addEventListener('input', somar);
          bx.addEventListener('click', () => { l.remove(); somar(); });
          return l;
        };
        caixa.append(...op.motivos.map(linhaM));
        bNovo.addEventListener('click', () => { if (caixa.children.length >= max) return; const l = linhaM(null); caixa.append(l); somar(); l.querySelector('input').focus(); });
        somar();
        lados.push({ de, sobre, caixa });
        return h('div', { class: 'op-lado', 'data-k': 'op-lado:' + de + ':' + sobre }, h('div', { class: 'op-cab' }, h('span', { text: nomeF(m, de) + ' sobre ' + nomeF(m, sobre) + ': ' }), total), caixa, h('div', { class: 'row' }, bNovo));
      };
      const titulo = h('h2', { text: 'A opinião: ' + nomeF(m, a) + ' e ' + nomeF(m, b) });
      titulo.id = 'dl-op-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'op:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'op:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('small', { class: 'ajuda', text: 'Cada lado tem a sua: a soma dos motivos, de −100 a +100. O prazo é opcional: vencido, o motivo continua contando até você tirar (a semana avisa).' }),
        lado(a, b), lado(b, a), err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl op-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const ler = ld => [...ld.caixa.children].map(l => {
            const txt = l.querySelector('.op-txt').value.trim(), n = K.lerNum(String(l.querySelector('.op-v').value).trim());
            if (!txt) throw new Error('Escreva cada motivo (ou tire a linha).');
            if (!Number.isInteger(n) || n < -100 || n > 100) throw new Error('O valor de cada motivo vai de −100 a +100.');
            return { id: l._id, txt, v: n, ate: lerData(l._ate, 'O prazo do motivo', meses) };
          });
          fim({ ab: ler(lados[0]), ba: ler(lados[1]) });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
  }

  /* ---------------- (parte 3c) os motivos de guerra ---------------- */
  // os motivos de guerra de cada facção (com o filtro), as sugestões pelos pretendentes e "+ Motivo de guerra" (só o mestre)
  function secMotivosGuerra(v) {
    const K = kit(), { h, secao, nota, botao, linha } = K, naFiltro = x => !filtroFac || x.de === filtroFac || x.contra === filtroFac;
    const todos = D().diplDe(v).motivosGuerra.filter(naFiltro);
    const grupos = v.faccoes.filter(f => todos.some(x => x.de === f.id)).map(f => h('div', { class: 'dp-mg-fac', 'data-k': 'mg:fac:' + f.id },
      h('div', { class: 'dp-mg-cab' }, bola(f), h('b', { text: K.nomeFac(f) })),
      todos.filter(x => x.de === f.id).map(x => h('button', { type: 'button', class: 'li clic dp-t' + (x.vale ? '' : ' dp-mg-velho'), 'data-k': 'mg:' + x.id, onclick: () => janelaMotivoGuerra(x.id, null) },
        h('span', { class: 'tx' }, h('b', { text: 'contra ' + nomeF(v, x.contra) }), h('small', { text: x.txt })),
        x.vale ? null : h('span', { class: 'tag', text: 'não vale mais' })))));
    const sug = D().sugestoesDeGuerra(v).filter(naFiltro);
    const sugs = sug.length ? h('div', { class: 'dp-mg-sug', 'data-k': 'mg:sugestoes' }, h('small', { class: 'note', text: 'Sugestões pelos pretendentes' }),
      sug.map(x => h('div', { class: 'dp-mg-s', 'data-k': 'mg:sug:' + x.tit + ':' + x.p },
        h('span', { class: 'tx' }, h('b', { text: nomeF(v, x.de) + ' contra ' + nomeF(v, x.contra) }), h('small', { text: x.txt })),
        botao('Usar…', () => janelaMotivoGuerra(null, x), { c: 'sm', k: 'mg:usar:' + x.tit + ':' + x.p })))) : null;
    return secao('Motivos de guerra', linha(botao('+ Motivo de guerra', () => janelaMotivoGuerra(null, null), { c: 'sm', k: 'mg:novo', off: D().diplDe(v).motivosGuerra.length >= (LIM('motivosGuerra') || 300) })),
      grupos.length ? h('div', { class: 'dp-tratados', 'data-k': 'dp:motivos-guerra' }, grupos) : nota('Nenhum motivo de guerra ainda.'), sugs,
      nota('Só você vê os motivos de guerra. Quem pretende um título do reino de outra facção vira sugestão.'));
  }
  // um motivo de guerra (id: o da lista; pre: a sugestão de onde ele vem, para começar)
  async function janelaMotivoGuerra(id, pre) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || m.faccoes.length < 2) return;
    const x = id ? D().motivoGuerraDe(m, id) : null;
    if (id && !x) return;
    const v = await dialogoMotivoGuerra(m, x, pre);
    if (!v || !K.mesmoMapa(m.id)) return;
    if (v.tirar) {
      const ok = await K.confirmar({ titulo: 'Tirar o motivo de guerra?', ok: 'Tirar', perigo: true, texto: nomeF(m, x.de) + ' contra ' + nomeF(m, x.contra) + ': “' + x.txt + '”. Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
      if (mudarDipl('tirar o motivo de guerra', d => { const n = d.motivosGuerra.length; d.motivosGuerra = d.motivosGuerra.filter(y => y.id !== x.id); if (d.motivosGuerra.length === n) return false; }) !== false) K.avisoDesfazer('O motivo de guerra saiu.');
      return;
    }
    const ok = mudarDipl(x ? 'mudar o motivo de guerra' : 'criar o motivo de guerra', d => {
      if (!x) { if (d.motivosGuerra.length >= (LIM('motivosGuerra') || 300)) return false; d.motivosGuerra.push(Object.assign({ id: N().novoId('mg') }, v)); return; }
      const y = d.motivosGuerra.find(z => z.id === x.id);
      if (!y) return false;
      const ant = JSON.stringify(y);
      Object.assign(y, v);
      if (JSON.stringify(y) === ant) return false;
    });
    if (ok !== false) K.avisoDesfazer(x ? 'O motivo de guerra está salvo.' : 'O motivo de guerra de ' + nomeF(m, v.de) + ' contra ' + nomeF(m, v.contra) + ' entrou na lista.');
  }
  /* → { de, contra, txt, vale, tit, p }, { tirar } ou null */
  function dialogoMotivoGuerra(m, x, pre) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const base = x || pre || null;
      const opcoes = (k, val) => { const s0 = h('select', { 'data-k': k }, [h('option', { value: '', text: 'Escolha…' })].concat(m.faccoes.map(f => h('option', { value: f.id, text: K.nomeFac(f) })))); s0.value = val || ''; return s0; };
      const de = opcoes('mg:de', base ? base.de : filtroFac), contra = opcoes('mg:contra', base ? base.contra : '');
      const txt = h('input', { type: 'text', 'data-k': 'mg:txt', maxlength: LIM('textoMotivoGuerra') || 160, autocomplete: 'off', placeholder: 'O motivo (ex.: tomaram Valmor; a coroa é nossa)', value: base ? base.txt : '' });
      const vale = h('input', { type: 'checkbox', 'data-k': 'mg:vale', checked: !x || x.vale ? true : null });
      const titulo = h('h2', { text: x ? 'O motivo de guerra' : 'Um motivo de guerra novo' });
      titulo.id = 'dl-mg-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bTirar = x ? h('button', { type: 'button', class: 'btn per', 'data-k': 'mg:tirar', text: 'Tirar…' }) : null;
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'mg:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'mg:ok', text: x ? 'Salvar' : 'Criar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin mg-lin' }, h('label', null, 'A facção', de), h('label', null, 'Contra', contra)),
        h('label', null, 'O motivo', txt),
        h('label', { class: 'op' }, vale, h('span', { text: 'Ainda vale' })),
        h('small', { class: 'ajuda', text: 'Só você vê. Na hora de declarar guerra, a prévia mostra os motivos que ainda valem.' }),
        err, h('div', { class: 'pe' }, bTirar, h('span', { class: 'esp' }), bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl mg-dl', 'aria-labelledby': titulo.id }, form);
      form.addEventListener('input', () => { err.textContent = ''; });
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          if (!de.value || !contra.value) throw new Error('Escolha a facção e contra quem.');
          if (de.value === contra.value) throw new Error('O motivo é contra outra facção.');
          if (!txt.value.trim()) throw new Error('Escreva o motivo.');
          fim({ de: de.value, contra: contra.value, txt: txt.value.trim(), vale: vale.checked, tit: base ? base.tit || null : null, p: base ? base.p || null : null });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      if (bTirar) bTirar.addEventListener('click', () => fim({ tirar: true }));
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (base ? txt : de).focus();
    });
  }

  /* ---------------- (parte 3c) declarar a guerra e fazer a paz ---------------- */
  // a caixa da notícia (desmarcada) com "Ver a notícia" (o texto acompanha o que muda na janela)
  function caixaJornal(K, k) {
    const { h } = K, cx = h('input', { type: 'checkbox', 'data-k': k }), txt = h('div', { class: 'sem-jornal-txt', 'data-k': k + ':txt' });
    const el = h('div', { class: 'sem-jornal', 'data-k': k + '-caixa' }, h('label', { class: 'op' }, cx, h('span', { text: 'Escrever a notícia no rascunho do Jornal' })),
      h('details', { class: 'sem-jornal-ver', 'data-k': k + ':ver' }, h('summary', { text: 'Ver a notícia' }), txt));
    const pintar = r => txt.replaceChildren(h('b', { text: r.tit }), ...r.txt.split('\n\n').map(p0 => h('p', { text: p0.replace(/\*\*/g, '') })));
    return { cx, el, pintar };
  }
  async function janelaGuerra(a, b) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || !K.facDe(m, a) || !K.facDe(m, b)) return;
    const v = await dialogoGuerra(m, a, b, !!(A.temJornal && A.temJornal()));
    if (!v || !K.mesmoMapa(m.id)) return;
    const dt = hoje(m), nomes = v.encerrar.map(id => D().nomeDoTipo(m, D().tratadoDe(m, id)));
    let n = -1;
    const ok = mudarDipl('declarar guerra', (d, mm) => { n = D().declararGuerra(mm, v.de, v.contra, v.encerrar, dt); if (n < 0) return false; });
    if (ok === false || n < 0) return;
    const jtxt = v.jornal ? porNoJornal('mt_gu_', D().noticiaGuerra(A.mapa, v.de, v.contra, v.motivo, nomes, dt)) : '';
    K.avisoDesfazer(nomeF(m, v.de) + ' declarou guerra a ' + nomeF(m, v.contra) + '.' + (n ? ' ' + (n === 1 ? '1 tratado acabou.' : n + ' tratados acabaram.') : '') + jtxt);
  }
  /* → { de, contra, motivo (o texto; '' sem motivo), encerrar: [os ids dos tratados], jornal } ou null */
  function dialogoGuerra(m, a, b, jornal) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const valem = (de, contra) => D().motivosGuerraDe(m, de, contra).filter(x => x.vale), nm = 'gu-de-' + Date.now().toString(36);
      // quem declara: de começo, a primeira do par (ou a outra, se só ela tem motivo que vale)
      const ini = !valem(a, b).length && valem(b, a).length ? b : a;
      const quem = [a, b].map(id => { const r = h('input', { type: 'radio', name: nm, value: id, 'data-k': 'gu:de:' + id, checked: id === ini || null }); return { r, el: h('label', { class: 'op' }, r, h('span', { text: nomeF(m, id) + ' declara guerra a ' + nomeF(m, id === a ? b : a) })) }; });
      const de = () => quem.find(x => x.r.checked).r.value, contra = () => (de() === a ? b : a);
      const motivo = h('select', { 'data-k': 'gu:motivo' }), motivoTxt = () => { const x = D().motivoGuerraDe(m, motivo.value); return x ? x.txt : ''; };
      const opcoesMotivo = () => {
        const l = valem(de(), contra());
        motivo.replaceChildren(...l.map(x => h('option', { value: x.id, text: x.txt })), h('option', { value: '', text: l.length ? 'Sem motivo' : 'Sem motivo (nenhum na lista)' }));
        motivo.value = l.length ? l[0].id : '';
      };
      // o que muda: a relação, os tratados entre as duas (os de paz, marcados para acabar), a vassalagem (só o aviso)
      const rel0 = K.facDe(m, a).rel[b] || 'neutra', R = N().RELACOES;
      const cxs = D().tratadosVivosEntre(m, a, b).map(t => { const cb = h('input', { type: 'checkbox', 'data-k': 'gu:enc:' + t.id, checked: t.tipo === 'paz' || null }); return { t, cb, el: h('label', { class: 'op gu-enc' }, cb, h('span', { text: 'Acaba: ' + D().nomeDoTipo(m, t) + ': ' + t.partes.map(x => nomeF(m, x)).join(', ') })) }; });
      const vx = [D().vassalagemDe(m, a), D().vassalagemDe(m, b)].find(x => x && (x.sus === a || x.sus === b));
      const cj = jornal ? caixaJornal(K, 'gu:jornal') : null;
      const pintarJ = () => { if (cj) cj.pintar(D().noticiaGuerra(m, de(), contra(), motivoTxt(), cxs.filter(c => c.cb.checked).map(c => D().nomeDoTipo(m, c.t)), hoje(m))); };
      for (const q of quem) q.r.addEventListener('change', () => { opcoesMotivo(); pintarJ(); });
      motivo.addEventListener('change', pintarJ);
      for (const c of cxs) c.cb.addEventListener('change', pintarJ);
      opcoesMotivo(); pintarJ();
      const titulo = h('h2', { text: 'Declarar guerra' });
      titulo.id = 'dl-gu-' + Date.now().toString(36);
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'gu:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'gu:ok', text: 'Declarar guerra' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'Nada muda até “Declarar guerra” (e dá para desfazer).' }),
        h('fieldset', { class: 'gu-quem', 'data-k': 'gu:quem' }, h('legend', { text: 'Quem declara' }), quem.map(x => x.el)),
        h('label', null, 'O motivo', motivo),
        h('div', { class: 'gu-muda', 'data-k': 'gu:muda' }, h('small', { class: 'note', text: 'O que muda' }),
          h('p', { 'data-k': 'gu:rel', text: 'A relação entre ' + nomeF(m, a) + ' e ' + nomeF(m, b) + ': ' + R[rel0] + ' → Guerra (dos dois lados).' }),
          cxs.length ? h('fieldset', { class: 'gu-encs', 'data-k': 'gu:tratados' }, h('legend', { text: 'Os tratados entre as duas (marque os que acabam hoje)' }), cxs.map(c => c.el)) : h('p', { text: 'Nenhum tratado entre as duas.' }),
          vx ? h('small', { class: 'note', 'data-k': 'gu:vas', text: nomeF(m, vx.vas) + ' é vassala de ' + nomeF(m, vx.sus) + ': a vassalagem continua (tire na Diplomacia, se for o caso).' }) : null),
        cj ? cj.el : null,
        h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl gu-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        fim({ de: de(), contra: contra(), motivo: motivoTxt(), encerrar: cxs.filter(c => c.cb.checked).map(c => c.t.id), jornal: !!(cj && cj.cx.checked) });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
  }
  async function janelaPaz(a, b) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || !K.facDe(m, a) || !K.facDe(m, b)) return;
    if (D().diplDe(m).tratados.length >= (LIM('tratados') || 200)) { A.toast('A diplomacia já tem ' + (LIM('tratados') || 200) + ' tratados: tire um para fazer a paz.'); return; }
    const v = await dialogoPaz(m, a, b, !!(A.temJornal && A.temJornal()));
    if (!v || !K.mesmoMapa(m.id)) return;
    let novo = null;
    const ok = mudarDipl('fazer a paz', (d, mm) => { novo = D().fazerPaz(mm, a, b, v.rel, Object.assign({ id: N().novoId('tr'), ini: hoje(mm) }, v.t)); if (!novo) return false; });
    if (ok === false || !novo) return;
    const jtxt = v.jornal ? porNoJornal('mt_paz_', D().noticiaPaz(A.mapa, a, b, novo)) : '';
    K.avisoDesfazer(nomeF(m, a) + ' e ' + nomeF(m, b) + ' fizeram a paz.' + jtxt);
  }
  /* → { rel ('neutra' | 'tensao'), t: { tipo, fim, pub, txt } (o tratado de paz), jornal } ou null */
  function dialogoPaz(m, a, b, jornal) {
    const K = kit(), { h } = K;
    return new Promise(resolve => {
      const meses = mesesDe(m), tipos = D().tiposDe(m), nm = 'paz-rel-' + Date.now().toString(36);
      const rels = [['neutra', 'Neutra'], ['tensao', 'Tensão']].map(([k, t0], i) => { const r = h('input', { type: 'radio', name: nm, value: k, 'data-k': 'paz:rel:' + k, checked: !i || null }); return { r, el: h('label', { class: 'op' }, r, h('span', { text: t0 })) }; });
      const tipo = h('select', { 'data-k': 'paz:tipo' }, tipos.map(x => h('option', { value: x.id, text: x.nome })));
      tipo.value = tipos.some(x => x.id === 'paz') ? 'paz' : tipos[0] ? tipos[0].id : '';
      const prazo = h('input', { type: 'checkbox', 'data-k': 'paz:prazo' }), fim = campoData('paz:fim', null, meses);
      const verPrazo = () => { fim.el.hidden = !prazo.checked; };
      prazo.addEventListener('change', verPrazo);
      verPrazo();
      const pub = h('input', { type: 'checkbox', 'data-k': 'paz:pub', checked: true });
      const txt = h('textarea', { 'data-k': 'paz:txt', rows: 3, maxlength: LIM('textoDipl') || 600, placeholder: 'O que a paz diz (os jogadores leem, se for pública)…' });
      const cj = jornal ? caixaJornal(K, 'paz:jornal') : null;
      const rel = () => rels.find(x => x.r.checked).r.value;
      // o tratado como vai ficar (o prazo que não serve ainda, sem prazo na prévia da notícia)
      const tratado = () => { let f = null; try { f = prazo.checked ? lerData(fim, 'O prazo', meses) : null; } catch (e) { f = null; } return { tipo: tipo.value || null, ini: hoje(m), fim: f, pub: pub.checked, txt: txt.value.trim() }; };
      const pintarJ = () => { if (cj) cj.pintar(D().noticiaPaz(m, a, b, tratado())); };
      const titulo = h('h2', { text: 'Fazer a paz: ' + nomeF(m, a) + ' e ' + nomeF(m, b) });
      titulo.id = 'dl-paz-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'paz:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'paz:ok', text: 'Fazer a paz' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('p', { class: 'note', text: 'A relação sai de Guerra e nasce um tratado de paz entre as duas, a partir de hoje. Nada muda até “Fazer a paz” (e dá para desfazer).' }),
        h('fieldset', { class: 'paz-rel', 'data-k': 'paz:rels' }, h('legend', { text: 'A relação fica' }), h('div', { class: 'row' }, rels.map(x => x.el))),
        h('label', null, 'O tratado', tipo),
        h('div', null, h('label', { class: 'op' }, prazo, h('span', { text: 'Tem prazo' })), fim.el),
        h('label', { class: 'op' }, pub, h('span', { text: 'Pública (os jogadores sabem do tratado)' })),
        h('label', null, 'Os termos', txt),
        cj ? cj.el : null,
        err, h('div', { class: 'pe' }, bNao, bOk));
      form.addEventListener('input', () => { err.textContent = ''; pintarJ(); });
      form.addEventListener('change', pintarJ);
      pintarJ();
      const dl = h('dialog', { class: 'mundo-dl paz-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim0 = v0 => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v0); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const df = prazo.checked ? lerData(fim, 'O prazo', meses) : null;
          if (prazo.checked && !df) throw new Error('O prazo: escreva ao menos o ano.');
          if (df && D().diaDe(m, df, true) < D().hojeDia(m)) throw new Error('O prazo já passou.');
          const t = tratado();
          fim0({ rel: rel(), t: { tipo: t.tipo, fim: df, pub: t.pub, txt: t.txt }, jornal: !!(cj && cj.cx.checked) });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      bNao.addEventListener('click', () => fim0(null));
      dl.addEventListener('close', () => fim0(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
  }

  /* ---------------- (parte 3b) a diplomacia na prévia da semana ---------------- */
  // o prazo novo sugerido para renovar um tratado: o mesmo dia, um ano depois
  const umAnoDepois = dt => Object.assign({}, dt, { a: dt.a + 1 });
  /* A parte da diplomacia na prévia da semana (mundo/reino-painel.js): o tributo e as trocas (cada um com a caixa;
     desmarcado, não vai nesta semana), os tratados que vencem nela (encerrar, renovar até um prazo novo ou deixar
     vencido) e os motivos de opinião que vencem nela (tirar: marcado). prev: a prévia (MundoReino.semanaPrevia);
     aoMudar(): uma caixa do tributo ou das trocas mudou (quem chama refaz a prévia e chama pintar). → { fluxos, vencem,
     motivos (os blocos; null sem nada), recusados() (os ids desmarcados), pintar(prev) (o texto de cada um, com a prévia
     nova), ler() (as decisões, como em MundoDiplomacia.aplicarDecisoes; erro se um prazo novo não serve) } */
  function secSemana(m, prev, aoMudar) {
    const K = kit(), { h } = K, meses = mesesDe(m), caixas = [], decTr = [], decMo = [];
    // o tributo e as trocas
    const fluxos = prev.fluxos.length ? h('fieldset', { class: 'sem-flxs', 'data-k': 'sem:fluxos' }, h('legend', { text: 'Tributo e trocas (desmarque o que não vale nesta semana)' }),
      prev.fluxos.map(x => {
        const cb = h('input', { type: 'checkbox', 'data-k': 'sem:f:' + x.id, checked: !x.recusado, onchange: () => aoMudar() }), tx = h('span'), el = h('label', { class: 'op sem-flx', 'data-k': 'sem:fl:' + x.id }, cb, tx);
        caixas.push({ id: x.id, cb, tx, el });
        return el;
      }), h('small', { class: 'ajuda', text: 'Cada facção manda do que sobrou da semana dela; o que ela recebe na mesma semana não entra na conta.' })) : null;
    function pintar(p) {
      for (const c of caixas) {
        const x = p.fluxos.find(y => y.id === c.id);
        if (!x) continue;
        const t = D().tratadoDe(m, x.ref), trib = x.tipo === 'trib', verbo = trib ? 'paga' : 'manda', qt = qtdTxt(m, x.q, x.rec);
        const base = trib ? nomeF(m, x.de) + ' paga ' + qt + ' de tributo a ' + nomeF(m, x.para) : nomeF(m, x.de) + ' manda ' + qt + ' para ' + nomeF(m, x.para) + (t ? ' (' + D().nomeDoTipo(m, t) + ')' : '');
        const falta = !x.recusado && x.pago < x.q ? (x.pago > 0 ? ' Só tem ' + K.fmt(x.pago, 2) + ': ' + verbo + ' isso.' : ' Não tem: não ' + verbo + ' nada.') : '';
        c.tx.textContent = base + '.' + falta;
        c.el.classList.toggle('falta', !!falta);
      }
    }
    pintar(prev);
    // os tratados que vencem
    const itensTr = prev.vencem.map(id => D().tratadoDe(m, id)).filter(Boolean).map(t => {
      const nome = D().nomeDoTipo(m, t) + ': ' + t.partes.map(x => nomeF(m, x)).join(', '), nm = 'sem-tr-' + t.id + '-' + Date.now().toString(36);
      const radio = (val, txt, chk) => { const r = h('input', { type: 'radio', name: nm, value: val, 'data-k': 'sem:tr:' + t.id + ':' + val, checked: chk || null }); return { r, el: h('label', { class: 'op' }, r, h('span', { text: txt })) }; };
      const enc = radio('encerrar', 'Encerrar', true), ren = radio('renovar', 'Renovar até'), dei = radio('deixar', 'Deixar vencido');
      const novo = campoData('sem:tr:' + t.id + ':ate', umAnoDepois(t.fim), meses);
      for (const ev of ['input', 'change']) novo.el.addEventListener(ev, () => { ren.r.checked = true; });
      decTr.push({ t, nome, rs: [enc.r, ren.r, dei.r], novo });
      return h('div', { class: 'sem-tr', 'data-k': 'sem:tr:' + t.id },
        h('div', { class: 'sem-tr-cab' }, h('b', { text: nome }), h('small', { text: 'o prazo: ' + dataTxt(m, t.fim) })),
        h('div', { class: 'sem-tr-ops' }, enc.el, h('div', { class: 'sem-tr-ren' }, ren.el, novo.el), dei.el));
    });
    const vencem = itensTr.length ? h('div', { class: 'sem-trs', 'data-k': 'sem:vencem' }, h('small', { class: 'note', text: 'Tratados que vencem nesta semana' }), itensTr) : null;
    // os motivos de opinião que vencem
    const motivos = prev.motivos.length ? h('fieldset', { class: 'sem-mos', 'data-k': 'sem:motivos' }, h('legend', { text: 'Motivos de opinião que vencem nesta semana (desmarque o que fica)' }),
      prev.motivos.map(x => {
        const cb = h('input', { type: 'checkbox', 'data-k': 'sem:mo:' + x.de + ':' + x.sobre + ':' + x.id, checked: true });
        decMo.push({ x, cb });
        return h('label', { class: 'op sem-mo' }, cb, h('span', { text: 'Tirar: ' + nomeF(m, x.de) + ' sobre ' + nomeF(m, x.sobre) + ', “' + x.txt + '” (' + D().opTxt(x.v) + ').' }));
      })) : null;
    function ler() {
      const tratados = {};
      for (const d of decTr) {
        const val = (d.rs.find(r => r.checked) || {}).value;
        if (val === 'encerrar') tratados[d.t.id] = 'encerrar';
        if (val !== 'renovar') continue;
        const nd = lerData(d.novo, 'O prazo novo (' + d.nome + ')', meses);
        if (!nd) throw new Error('O prazo novo (' + d.nome + '): escreva ao menos o ano.');
        if (D().diaDe(m, nd, true) <= prev.ate) throw new Error('O prazo novo (' + d.nome + ') tem de ser depois desta semana.');
        tratados[d.t.id] = nd;
      }
      return { tratados, motivos: decMo.filter(d => d.cb.checked).map(d => ({ de: d.x.de, sobre: d.x.sobre, id: d.x.id })) };
    }
    return { fluxos, vencem, motivos, recusados: () => caixas.filter(c => !c.cb.checked).map(c => c.id), pintar, ler };
  }

  window.MundoDiplomaciaPainel = { abaDiplomacia, janelaTratado, janelaTipos, janelaOpiniao, janelaVassalagem, vassalaTxt, secSemana, janelaMotivoGuerra, janelaGuerra, janelaPaz };
})();
