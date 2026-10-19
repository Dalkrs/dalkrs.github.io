/* Tiny Cats · Mapa-múndi · a diplomacia no painel (lote 11, parte 3a).
   A aba Diplomacia: o filtro de facção; as relações entre as facções (para quem mestra, a relação de cada par — a mesma
   da aba Reinos — e a opinião de cada lado, com "Opinião…": os motivos, cada um com o valor e um prazo); os tratados
   (os em vigor, os vencidos e os que ainda não começaram; os encerrados recolhidos), com "+ Tratado" e "Tipos de
   tratado…". O cartão do tratado: o tipo, as partes (duas ou mais facções), o começo e o prazo pela data do mundo, se
   é público, os termos e a nota; "Encerrar o tratado…" e "Reabrir". Para quem joga, as relações (as que não são
   neutras) e os tratados públicos, só para ler.
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

  const mudarDipl = (rotulo, fn) => app().mudar(rotulo, mm => { if (!mm.dipl) mm.dipl = { tratados: [], opin: [] }; return fn(mm.dipl, mm); });
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
      botao('Tipos de tratado…', () => janelaTipos(), { c: 'sm', k: 'dp:tipos' })));
    if (filtroFac && !K.facDe(v, filtroFac)) filtroFac = '';
    out.push(campoEscolha('dp:fac', 'Facção', filtroFac, [['', 'Todas as facções']].concat(v.faccoes.map(f => [f.id, K.nomeFac(f)])), x => { filtroFac = x; return false; }));
    out.push(secRelacoes(v, ed), secTratados(v, ed));
    if (!ed) out.push(nota('Só o que vocês sabem: as relações e os tratados públicos.'));
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
      const extra = vivos.length ? h('small', { class: 'dp-trat', text: 'tratados: ' + [...new Set(vivos)].join(', ') }) : null;
      if (!ed) { linhas.push(h('div', { class: 'dp-par', 'data-rel': rel, 'data-k': 'par:' + a.id + ':' + b.id }, h('div', { class: 'dp-par-cab' }, nomes, h('span', { class: 'tag ' + rel, text: R[rel] })), extra)); continue; }
      const oab = D().opiniao(v, a.id, b.id).total, oba = D().opiniao(v, b.id, a.id).total;
      const sel = campoEscolha('dprel:' + a.id + ':' + b.id, null, rel, Object.keys(R).map(k => [k, R[k]]), x => mudarRelacao(a.id, b.id, x), { rotulo: 'Relação entre ' + K.nomeFac(a) + ' e ' + K.nomeFac(b) });
      linhas.push(h('div', { class: 'dp-par', 'data-rel': rel, 'data-k': 'par:' + a.id + ':' + b.id },
        h('div', { class: 'dp-par-cab' }, nomes, sel),
        h('div', { class: 'dp-op' }, h('small', { text: 'opinião: ' + K.nomeFac(a) + ' → ' + D().opTxt(oab) + ' · ' + K.nomeFac(b) + ' → ' + D().opTxt(oba) }),
          botao('Opinião…', () => janelaOpiniao(a.id, b.id), { c: 'sm', k: 'op:' + a.id + ':' + b.id })),
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
  function itemTratado(v, t, ed) {
    const K = kit(), { h } = K, est = D().estadoDe(v, t), partes = t.partes.map(id => nomeF(v, id)).join(', ');
    const tagEst = est !== 'ativo' ? h('span', { class: 'tag' + (est === 'vencido' ? ' tensao' : ''), text: D().ESTADOS[est] }) : null;
    if (ed) {
      return h('button', { type: 'button', class: 'li clic dp-t', 'data-k': 'tr:' + t.id, onclick: () => janelaTratado(t.id) },
        h('span', { class: 'tx' }, h('b', { text: D().nomeDoTipo(v, t) + ': ' + partes }), h('small', { text: quandoTxt(v, t) })),
        tagEst, t.pub ? h('span', { class: 'tag', title: 'Os jogadores sabem deste tratado', text: 'público' }) : null);
    }
    return h('div', { class: 'corte-pub dp-t', 'data-k': 'tr:' + t.id },
      h('b', { text: D().nomeDoTipo(v, t) + ': ' + partes }), h('small', { text: quandoTxt(v, t) + (est !== 'ativo' ? ' · ' + D().ESTADOS[est] : '') }),
      t.txt ? h('p', { class: 'publico', text: t.txt }) : null);
  }

  /* ---------------- o cartão do tratado ---------------- */
  async function janelaTratado(id) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !m || m.faccoes.length < 2) return;
    const t = id ? D().tratadoDe(m, id) : null;
    if (id && !t) return;
    const v = await dialogoTratado(m, t);
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
    const nome1 = D().nomeDoTipo(m, v) + ': ' + v.partes.map(x => nomeF(m, x)).join(', ');
    const ok = mudarDipl(t ? 'mudar o tratado' : 'criar o tratado', d => {
      if (!t) { if (d.tratados.length >= (LIM('tratados') || 200)) return false; d.tratados.push(Object.assign({ id: N().novoId('tr'), enc: null }, v)); return; }
      const x = d.tratados.find(y => y.id === t.id);
      if (!x) return false;
      const ant = JSON.stringify(x);
      Object.assign(x, v);
      if (JSON.stringify(x) === ant) return false;
    });
    if (ok !== false) K.avisoDesfazer(t ? 'O tratado ' + nome1 + ': salvo.' : 'O tratado ' + nome1 + ' entrou na diplomacia.');
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
  /* → { tipo, partes, ini, fim, pub, txt, nota }, { tirar }, { encerrar }, { reabrir } ou null */
  function dialogoTratado(m, t) {
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
      const pub = h('input', { type: 'checkbox', 'data-k': 'tr:pub', checked: t && t.pub ? true : null });
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
        h('label', { class: 'op' }, pub, h('span', { text: 'Público (os jogadores sabem deste tratado)' })),
        lbl('Os termos', txt), lbl('Nota do mestre (só você vê)', nota),
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
          fim0({ tipo: tipo.value || null, partes: ps, ini: di, fim: df, pub: pub.checked, txt: txt.value.trim(), nota: nota.value.trim() });
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

  window.MundoDiplomaciaPainel = { abaDiplomacia, janelaTratado, janelaTipos, janelaOpiniao };
})();
