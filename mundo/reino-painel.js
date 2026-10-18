/* Tiny Cats · Mapa-múndi · os reinos no painel (lote 10).
   A seção Província (ou Sub-região) da região escolhida: de qual província ela é parte, as sub-regiões de dentro (com o
   dono de cada uma, quando é outro) e os hexágonos por terreno. Na aba Reinos, o Livro do reino: por facção, as
   províncias, as sub-regiões, os hexágonos e os exércitos.
   (parte 2) A economia: na aba Reinos, ligar e desligar, os recursos do mundo (o nome, a cor, o papel), a produção do
   terreno e a da população (janelas) e os níveis dos assentamentos; na província, a produção por semana e de onde ela
   vem (o terreno, a população, o valor do mestre) e os assentamentos de dentro; no marcador, o assentamento (o nível
   e a população, fixa); no Livro do reino, o que cada facção produz e o estoque.
   Usa as ferramentas do painel (MundoPainel.kit): nada aqui muda o mapa direto. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const R = () => window.MundoReino;
  const N = () => window.MundoNucleo;
  const Cam = () => window.MundoCamadas || null;
  const app = () => kit().app();
  const ligada = m => !!(m && m.eco && m.eco.on);
  const sinalN = n => (n > 0 ? '+' : n < 0 ? '−' : '') + kit().fmt(Math.abs(n), 2);
  const CORES_REC = ['#e6ab4f', '#9fbf4a', '#a8743c', '#9aa3b5', '#7fb7e0', '#b39cf0', '#e58a6b', '#6fbf8f', '#f2c14e', '#d0703a', '#5fa8d8', '#c97a3a'];
  function mudarEco(rotulo, fn) { return app().mudar(rotulo, mm => { if (!mm.eco) return false; return fn(mm.eco, mm); }); }
  const papeisOps = () => [['', 'Outro']].concat(Object.entries(N().PAPEIS_REC || {}));

  /* ---------------- a seção Província (ou Sub-região) ---------------- */
  function secProvincia(o, m) {
    const { h, nota, secao, plural, nomeDe, nomeFac, facDe, irPara } = kit();
    if (!R() || !o || o.k !== 'r') return null;
    const ehProv = !o.pai, prov = R().provinciaDe(m, o), out = [];
    const dono = r => N().facDaRegiao(m, r);
    if (!ehProv && prov && prov !== o) {
      out.push(h('div', { class: 'row prov-de' }, h('span', { class: 'note', text: 'Parte da província' }),
        h('button', { type: 'button', class: 'btn sm lnk', 'data-k': 'o:' + o.id + ':prov', title: 'Ir para a província', text: nomeDe(prov, m), onclick: () => irPara(prov.id) })));
    }
    // as sub-regiões de dentro (em árvore), com o dono quando é outro que o desta
    const subs = R().subregioesDe(m, o), meu = dono(o), Cm = Cam(), escondida = !!(Cm && !Cm.visivel('subregioes'));
    if (subs.length) {
      out.push(h('div', { class: 'prov-subs', 'data-k': 'o:' + o.id + ':subs' },
        h('small', { class: 'note', text: (ehProv ? 'Sub-regiões' : 'Dentro dela') + ' (' + subs.length + ')' + (escondida ? ' · a camada Sub-regiões está escondida neste aparelho' : '') }),
        subs.map(({ r, nivel }) => {
          const f = dono(r), outro = f !== meu;
          return h('button', { type: 'button', class: 'li clic prov-sub' + (escondida ? ' fora-cam' : ''), 'data-k': 'sub:' + r.id, style: { 'padding-left': (8 + 14 * (nivel - 1)) + 'px' },
            title: 'Ir para ' + nomeDe(r, m), onclick: () => irPara(r.id) },
            h('span', { class: 'tx' }, h('b', { text: nomeDe(r, m) }), outro ? h('small', { text: f ? 'de ' + nomeFac(facDe(m, f)) : 'sem dono' }) : null));
        })));
    } else if (ehProv) {
      out.push(nota('Nenhuma sub-região. Para um ducado ou uma prefeitura, desenhe uma região aqui dentro e escolha "Dentro de: ' + nomeDe(o, m) + '".'));
    }
    // o terreno: os hexágonos com o centro aqui dentro, por terreno
    if (!N().temGrade(m)) out.push(nota('Sem a grade de hexágonos (aba Mapa), não dá para contar o terreno.'));
    else {
      const t = R().terrenosDaRegiao(m, o);
      out.push(h('div', { class: 'prov-ter', 'data-k': 'o:' + o.id + ':ter' },
        h('b', { text: t.n ? plural(t.n, 'hexágono', 'hexágonos') : 'Nenhum hexágono com o centro aqui dentro' }),
        t.n ? h('ul', null, t.por.map(x => h('li', { 'data-ter': x.id }, h('i', { style: { background: x.cor } }), h('span', { text: x.nome + ' ' + x.n }))),
          t.sem ? h('li', { 'data-ter': '-' }, h('i', { class: 'sem' }), h('span', { text: 'sem terreno ' + t.sem })) : null) : null));
    }
    // (parte 2) a produção por semana e de onde ela vem; os assentamentos de dentro
    if (ligada(m)) out.push(...blocoProducao(o, m));
    return secao(ehProv ? 'Província' : 'Sub-região', out);
  }
  function blocoProducao(o, m) {
    const { h, nota, botao, linha, fmt, irPara, nomeDe } = kit();
    const eco = m.eco, p = R().producaoDaRegiao(m, o), out = [], comSubs = R().subregioesDe(m, o).length > 0;
    const FONTES = [['terreno', 'terreno'], ['pop', 'população'], ['mestre', 'do mestre']];
    const linhas = eco.rec.filter(r => p.total[r.id]).map(r => h('div', { class: 'prod-li', 'data-rec': r.id },
      h('i', { style: { background: r.cor } }), h('b', { text: r.nome + ' ' + sinalN(p.total[r.id]) }),
      h('small', { text: FONTES.filter(([k]) => p[k][r.id]).map(([k, t]) => t + ' ' + sinalN(p[k][r.id])).join(' · ') })));
    out.push(h('div', { class: 'prov-prod', 'data-k': 'o:' + o.id + ':prod' }, h('small', { class: 'note', text: 'Produção por semana' + (comSubs ? ' (com as sub-regiões)' : '') }),
      linhas.length ? linhas : nota('Nada ainda: dê terreno aos hexágonos (aba Terreno), ponha assentamentos com população aqui dentro ou escreva a produção.')));
    out.push(linha(botao('Produção do mestre…', () => janelaProdMestre(o.id), { c: 'sm', k: 'o:' + o.id + ':prod-mestre', title: 'Escrever quanto esta região produz por semana, além do terreno e da população' })));
    const ass = R().assentamentosDaRegiao(m, o);
    if (ass.length) {
      out.push(h('div', { class: 'prov-ass', 'data-k': 'o:' + o.id + ':ass' }, h('small', { class: 'note', text: 'Assentamentos (' + ass.length + ')' }),
        ass.map(a => h('button', { type: 'button', class: 'li clic', 'data-k': 'ass:' + a.o.id, title: 'Ir para ' + nomeDe(a.o, m), onclick: () => irPara(a.o.id) },
          h('span', { class: 'tx' }, h('b', { text: nomeDe(a.o, m) }),
            h('small', { text: (a.nivel ? a.nivel.nome : 'sem nível') + ' · ' + fmt(a.o.ass.pop, 0) + ' pessoas' + (a.r && a.r.id !== o.id ? ' · em ' + nomeDe(a.r, m) : '') }))))));
    }
    return out;
  }
  // o valor do mestre: quanto a região produz por semana, além do terreno e da população
  async function janelaProdMestre(id) {
    const A = app(), m = A.mapa, o = m && kit().achar(m, id);
    if (!o || !ligada(m)) return;
    const recs = m.eco.rec, atual = o.prod || {};
    const v = await kit().janela({ titulo: 'Produção do mestre: ' + kit().nomeDe(o, m), ok: 'Salvar',
      texto: 'Quanto ' + kit().nomeDe(o, m) + ' produz por semana, além do terreno e da população (um número negativo gasta). Vazio ou zero: nada.',
      campos: recs.map((r, i) => ({ id: r.id, rotulo: r.nome, tipo: 'decimal', valor: atual[r.id] ? kit().fmtCampo(atual[r.id]) : '', ph: '0', linha: 'l' + Math.floor(i / 3) })),
      ler: vals => lerTabela(vals, recs) });
    if (v == null || !kit().mesmoMapa(m.id)) return;
    if (kit().mudarObj(id, 'mudar a produção do mestre', x => { const ant = JSON.stringify(x.prod || {}); if (ant === JSON.stringify(v)) return false; if (Object.keys(v).length) x.prod = v; else delete x.prod; }) !== false) kit().avisoDesfazer('Produção do mestre salva.');
  }
  // lê os campos de número de uma tabela de recursos (vírgula ou ponto; vazio é zero) → { recurso: n } sem os zeros
  function lerTabela(vals, recs) {
    const out = {};
    for (const r of recs) {
      const t = String(vals[r.id] == null ? '' : vals[r.id]).trim();
      if (!t) continue;
      const n = kit().lerNum(t);
      if (!Number.isFinite(n) || Math.abs(n) > 1e6) throw new Error(r.nome + ': use um número (de −1.000.000 a 1.000.000).');
      if (n) out[r.id] = Math.round(n * 100) / 100;
    }
    return out;
  }

  /* ---------------- (parte 2) o assentamento, no marcador ---------------- */
  function secAssentamento(o, m) {
    if (!ligada(m) || !o || o.k !== 'm') return null;
    const { h, nota, secao, campoEscolha, campoNumero, mudarObj, nomeDe } = kit();
    const eco = m.eco, a = o.ass || null, out = [];
    out.push(campoEscolha('o:' + o.id + ':niv', 'Nível', a && a.niv ? a.niv : '', [['', 'Não é assentamento']].concat(eco.niv.map(n => [n.id, n.nome + ' (' + n.esp + (n.esp === 1 ? ' espaço de construção)' : ' espaços de construção)')])),
      v => mudarObj(o.id, v ? 'mudar o nível do assentamento' : 'deixar de ser assentamento', x => {
        if (!v) { if (!x.ass) return false; delete x.ass; return; }
        const b = x.ass || { niv: null, pop: 0 };
        if (b.niv === v) return false;
        b.niv = v; x.ass = b;
      })));
    if (a) {
      const pop = campoNumero('o:' + o.id + ':pop', 'População', a.pop, n => mudarObj(o.id, 'mudar a população', x => {
        const b = x.ass || { niv: null, pop: 0 };
        if (b.pop === n) return false;
        b.pop = n; x.ass = b;
      }), { min: 0, max: 1e9, dica: 'Fixa: só muda quando você mudar.' });
      out.push(pop);
      const r = N().regiaoEm(m, o.x, o.y), prov = r ? R().provinciaDe(m, r) : null;
      out.push(nota(r ? 'Fica em ' + nomeDe(r, m) + (prov && prov !== r ? ' (província ' + nomeDe(prov, m) + ')' : '') + '.' : 'Fora das províncias: não produz para ninguém.'));
      const pp = R().somar({}, eco.pop, a.pop / 1000), txt = eco.rec.filter(x => pp[x.id]).map(x => x.nome + ' ' + sinalN(pp[x.id])).join(' · ');
      out.push(nota(txt ? 'Pela população, por semana: ' + txt + '.' : 'A população não produz nada (veja "Produção da população…", na aba Reinos).'));
    } else out.push(nota('Uma cidade, uma vila, um castelo: escolha o nível para ele virar assentamento (com a população e, depois, as construções).'));
    return secao('Assentamento', out);
  }

  /* ---------------- (parte 2) a economia do mundo, na aba Reinos ---------------- */
  function secEconomia(m) {
    const { h, nota, secao, botao, linha, campoTexto, campoNumero, campoEscolha, campoCor, glifo, X_SVG } = kit();
    const eco = m && m.eco, out = [];
    if (!eco || !eco.on) {
      out.push(nota(eco ? 'A economia deste mapa está desligada: tudo o que estava nela continua guardado.'
        : 'A economia do mundo: os recursos que as províncias produzem por semana (pelo terreno, pela população dos assentamentos e pelo que você escrever) e o estoque de cada facção. Nada muda até você ligar.'),
        linha(botao(eco ? 'Ligar de novo…' : 'Ligar a economia…', ligar, { c: 'pri', k: 'eco:ligar' })));
      return secao('Economia do mundo', out);
    }
    out.push(h('small', { class: 'note eco-rot', text: 'Recursos do mundo' }));
    out.push(h('div', { class: 'eco-recs' }, eco.rec.map(r => {
      const papel = campoEscolha('eco:r:' + r.id + ':papel', null, r.papel || '', papeisOps(),
        v => mudarEco('mudar o papel do recurso', e => { const x = e.rec.find(y => y.id === r.id); if (!x || (x.papel || '') === v) return false; if (v) x.papel = v; else delete x.papel; }), { rotulo: 'Papel de ' + r.nome });
      return h('div', { class: 'eco-rec', 'data-rec': r.id },
        campoCor('eco:r:' + r.id + ':cor', 'Cor de ' + r.nome, r.cor, v => mudarEco('mudar a cor do recurso', e => { const x = e.rec.find(y => y.id === r.id); if (!x || x.cor === v) return false; x.cor = v; })),
        campoTexto('eco:r:' + r.id + ':nome', null, r.nome, v => renomearRecurso(r.id, v), { max: 40, rotulo: 'Nome do recurso' }),
        papel,
        h('button', { type: 'button', class: 'ib', 'data-k': 'eco:r:' + r.id + ':x', title: 'Tirar ' + r.nome + ' do mundo', 'aria-label': 'Tirar ' + r.nome + ' do mundo', onclick: () => tirarRecurso(r.id) }, glifo(X_SVG, 14)));
    })));
    out.push(linha(botao('+ Recurso', novoRecurso, { c: 'sm', k: 'eco:rec-novo', off: eco.rec.length >= 24 }),
      botao('Produção do terreno…', janelaTerreno, { c: 'sm', k: 'eco:ter' }),
      botao('Produção da população…', janelaPopulacao, { c: 'sm', k: 'eco:pop' })));
    out.push(nota('O papel diz o que o recurso é para as regras (a moeda, a comida…). O estoque de cada facção fica nos números dela (abra a facção, acima).'));
    out.push(h('small', { class: 'note eco-rot', text: 'Níveis dos assentamentos (do menor ao maior)' }));
    out.push(h('div', { class: 'eco-nivs' }, eco.niv.map(n => {
      const esp = campoNumero('eco:n:' + n.id + ':esp', null, n.esp, v => mudarEco('mudar os espaços do nível', e => { const x = e.niv.find(y => y.id === n.id); if (!x || x.esp === v) return false; x.esp = v; }), { min: 0, max: 40 });
      esp.setAttribute('aria-label', 'Espaços de construção: ' + n.nome);
      return h('div', { class: 'eco-niv', 'data-niv': n.id },
        campoTexto('eco:n:' + n.id + ':nome', null, n.nome, v => mudarEco('renomear o nível', e => { const x = e.niv.find(y => y.id === n.id), t = v.trim(); if (!x || !t || x.nome === t) return false; x.nome = t; }), { max: 40, rotulo: 'Nome do nível' }),
        esp, h('span', { class: 'note', text: 'espaços' }),
        h('button', { type: 'button', class: 'ib', 'data-k': 'eco:n:' + n.id + ':x', title: 'Tirar o nível ' + n.nome, 'aria-label': 'Tirar o nível ' + n.nome, onclick: () => tirarNivel(n.id) }, glifo(X_SVG, 14)));
    })));
    out.push(linha(botao('+ Nível', novoNivel, { c: 'sm', k: 'eco:niv-novo', off: eco.niv.length >= 12 })));
    out.push(linha(botao('Desligar a economia', desligar, { c: 'sm per', k: 'eco:desligar' })));
    return secao('Economia do mundo', out);
  }
  async function ligar() {
    const A = app(), m = A.mapa;
    if (!A.podeEditar() || !m) return;
    const jaTinha = !!m.eco, prev = JSON.parse(JSON.stringify(m)), rel = R().ligarEconomia(prev), K = kit();
    const lig = rel.ligados.length ? ' Os recursos que as facções já tinham com o mesmo nome passam a ser os do mundo: ' + rel.ligados.map(l => K.nomeFac(K.facDe(m, l.fac)) + ' (' + l.nome + ')').join(', ') + '.' : '';
    const sem = rel.semana ? ' O mapa passa a contar os dias da semana: hoje vira segunda-feira (dá para mudar na aba Mapa). A semana fecha de domingo para segunda.' : '';
    const ok = await K.confirmar({ titulo: jaTinha ? 'Ligar de novo a economia?' : 'Ligar a economia deste mapa?', ok: 'Ligar a economia',
      texto: (jaTinha ? 'Tudo volta como estava.' : 'Os recursos do mundo: ' + prev.eco.rec.map(r => r.nome).join(', ') + ' (dá para renomear, tirar e criar outros). Cada província passa a produzir por semana, pelo terreno, pela população dos assentamentos e pelo que você escrever, e cada facção ganha o estoque de cada recurso.') + lig + sem });
    if (!ok || !K.mesmoMapa(m.id)) return;
    if (A.mudar(jaTinha ? 'ligar de novo a economia' : 'ligar a economia', mm => { R().ligarEconomia(mm); }) !== false) K.avisoDesfazer('Economia ligada.');
  }
  async function desligar() {
    const K = kit(), m = app().mapa;
    const ok = await K.confirmar({ titulo: 'Desligar a economia?', ok: 'Desligar', texto: 'A produção some do painel e do mapa, mas tudo fica guardado (os recursos, as tabelas, os assentamentos e os estoques das facções). Dá para ligar de novo quando quiser.' });
    if (!ok || !K.mesmoMapa(m.id)) return;
    if (mudarEco('desligar a economia', e => { if (!e.on) return false; e.on = false; }) !== false) K.avisoDesfazer('Economia desligada (tudo continua guardado).');
  }
  function renomearRecurso(id, v) {
    const t = String(v || '').trim();
    return app().mudar('renomear o recurso', mm => {
      const x = mm.eco && mm.eco.rec.find(y => y.id === id);
      if (!x || !t || x.nome === t) return false;
      x.nome = t;
      for (const f of mm.faccoes) { const y = (f.rec || []).find(z => z.id === id); if (y) y.nome = t; }
    });
  }
  async function novoRecurso() {
    const K = kit(), m = app().mapa;
    const v = await K.janela({ titulo: 'Um recurso novo no mundo', ok: 'Criar', campos: [{ id: 'nome', rotulo: 'Nome', tipo: 'text', valor: '', ph: 'Ex.: Sal', max: 40 }, { id: 'papel', rotulo: 'Papel', tipo: 'select', valor: '', opcoes: papeisOps() }],
      ler: x => { if (!x.nome.trim()) throw new Error('Escreva o nome do recurso.'); return { nome: x.nome.trim(), papel: x.papel }; } });
    if (!v || !K.mesmoMapa(m.id)) return;
    if (mudarEco('criar o recurso', (e, mm) => {
      if (e.rec.length >= 24) return false;
      const usadas = new Set(e.rec.map(r => r.cor)), cor = CORES_REC.find(c => !usadas.has(c)) || CORES_REC[e.rec.length % CORES_REC.length];
      const r = { id: N().novoId('rc'), nome: v.nome, cor };
      if (v.papel) r.papel = v.papel;
      e.rec.push(r);
      for (const f of mm.faccoes) R().recursosNaFaccao(mm, f);
    }) !== false) K.avisoDesfazer(v.nome + ': um recurso novo no mundo (cada facção ganha o estoque dele).');
  }
  async function tirarRecurso(id) {
    const K = kit(), m = app().mapa, r = m.eco && m.eco.rec.find(x => x.id === id);
    if (!r) return;
    const ok = await K.confirmar({ titulo: 'Tirar ' + r.nome + ' do mundo?', ok: 'Tirar do mundo', perigo: true,
      texto: 'A produção dele (no terreno, na população e nas regiões) some. Nas facções, o estoque dele continua, como um recurso só de cada uma. Dá para desfazer.' });
    if (!ok || !K.mesmoMapa(m.id)) return;
    if (mudarEco('tirar o recurso do mundo', e => { const n = e.rec.length; e.rec = e.rec.filter(x => x.id !== id); if (e.rec.length === n) return false; }) !== false) K.avisoDesfazer(r.nome + ' saiu do mundo.');
  }
  async function novoNivel() {
    const K = kit(), m = app().mapa;
    const v = await K.janela({ titulo: 'Um nível novo de assentamento', ok: 'Criar', texto: 'Entra no fim da lista (o maior).',
      campos: [{ id: 'nome', rotulo: 'Nome', tipo: 'text', valor: '', ph: 'Ex.: Capital', max: 40, linha: 'a' }, { id: 'esp', rotulo: 'Espaços de construção', tipo: 'number', valor: '8', min: 0, max: 40, linha: 'a' }],
      ler: x => { const n = Math.round(Number(x.esp)); if (!x.nome.trim()) throw new Error('Escreva o nome do nível.'); if (!(n >= 0 && n <= 40)) throw new Error('Os espaços: de 0 a 40.'); return { nome: x.nome.trim(), esp: n }; } });
    if (!v || !K.mesmoMapa(m.id)) return;
    if (mudarEco('criar o nível', e => { if (e.niv.length >= 12) return false; e.niv.push({ id: N().novoId('nv'), nome: v.nome, esp: v.esp }); }) !== false) K.avisoDesfazer('Nível novo: ' + v.nome + '.');
  }
  async function tirarNivel(id) {
    const K = kit(), m = app().mapa, n = m.eco && m.eco.niv.find(x => x.id === id);
    if (!n) return;
    const usam = (m.objs || []).filter(o => o.k === 'm' && o.ass && o.ass.niv === id).length;
    if (usam) {
      const ok = await K.confirmar({ titulo: 'Tirar o nível ' + n.nome + '?', ok: 'Tirar o nível', perigo: true,
        texto: (usam === 1 ? 'Um assentamento fica' : usam + ' assentamentos ficam') + ' sem nível (a população continua). Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
    }
    if (mudarEco('tirar o nível', e => { const c = e.niv.length; e.niv = e.niv.filter(x => x.id !== id); if (e.niv.length === c) return false; }) !== false) K.avisoDesfazer('O nível ' + n.nome + ' saiu.');
  }
  // a produção da população: quanto cada mil pessoas de um assentamento produzem por semana
  async function janelaPopulacao() {
    const K = kit(), m = app().mapa;
    if (!ligada(m)) return;
    const recs = m.eco.rec;
    const v = await K.janela({ titulo: 'Produção da população', ok: 'Salvar', texto: 'Quanto cada mil pessoas de um assentamento produzem por semana (um número negativo gasta). Vazio ou zero: nada.',
      campos: recs.map((r, i) => ({ id: r.id, rotulo: r.nome, tipo: 'decimal', valor: m.eco.pop[r.id] ? K.fmtCampo(m.eco.pop[r.id]) : '', ph: '0', linha: 'l' + Math.floor(i / 3) })),
      ler: vals => lerTabela(vals, recs) });
    if (v == null || !K.mesmoMapa(m.id)) return;
    if (mudarEco('mudar a produção da população', e => { if (JSON.stringify(e.pop) === JSON.stringify(v)) return false; e.pop = v; }) !== false) K.avisoDesfazer('Produção da população salva.');
  }
  // a produção do terreno: uma tabela (um terreno por linha, um recurso por coluna), por hexágono e por semana
  async function janelaTerreno() {
    const K = kit(), m = app().mapa;
    if (!ligada(m)) return;
    const recs = m.eco.rec, ters = m.terrenos || [];
    const v = await janelaTabela({ titulo: 'Produção do terreno', ok: 'Salvar', texto: 'Quanto cada hexágono produz por semana, pelo terreno dele (um número negativo gasta). Vazio ou zero: nada.',
      linhas: ters, colunas: recs, valores: m.eco.ter });
    if (v == null || !K.mesmoMapa(m.id)) return;
    if (mudarEco('mudar a produção do terreno', e => { if (JSON.stringify(e.ter) === JSON.stringify(v)) return false; e.ter = v; }) !== false) K.avisoDesfazer('Produção do terreno salva.');
  }
  /* Uma janela com uma tabela de números (as linhas e as colunas com nome e cor): → { linha: { coluna: n } } sem os
     zeros, ou null (cancelou). Esc fecha; Enter salva. */
  function janelaTabela(o) {
    const { h } = kit();
    return new Promise(resolve => {
      const ent = {}, err = h('p', { class: 'err', role: 'alert' });
      const cab = h('tr', null, h('th', { scope: 'col', text: '' }), o.colunas.map(c => h('th', { scope: 'col' }, h('i', { style: { background: c.cor } }), h('span', { text: c.nome }))));
      const corpo = o.linhas.map(l => h('tr', { 'data-lin': l.id }, h('th', { scope: 'row' }, h('i', { style: { background: l.cor } }), h('span', { text: l.nome })),
        o.colunas.map(c => {
          const v0 = o.valores && o.valores[l.id] && o.valores[l.id][c.id];
          const inp = h('input', { type: 'text', inputmode: 'decimal', class: 'in', 'data-k': 'tab:' + l.id + ':' + c.id, 'aria-label': l.nome + ', ' + c.nome, value: v0 ? kit().fmtCampo(v0) : '', placeholder: '0', autocomplete: 'off' });
          ent[l.id + '\n' + c.id] = inp;
          return h('td', null, inp);
        })));
      const titulo = h('h2', { text: o.titulo });
      titulo.id = 'dl-tab-' + Date.now().toString(36);
      const bNao = h('button', { type: 'button', class: 'btn', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', text: o.ok || 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo, o.texto ? h('p', { text: o.texto }) : null,
        h('div', { class: 'eco-tab-caixa' }, h('table', { class: 'eco-tab' }, h('thead', null, cab), h('tbody', null, corpo))), err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl eco-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        const out = {};
        for (const l of o.linhas) for (const c of o.colunas) {
          const t = String(ent[l.id + '\n' + c.id].value).trim();
          if (!t) continue;
          const n = kit().lerNum(t);
          if (!Number.isFinite(n) || Math.abs(n) > 1e6) { err.textContent = l.nome + ', ' + c.nome + ': use um número (de −1.000.000 a 1.000.000).'; ent[l.id + '\n' + c.id].focus(); return; }
          if (n) { if (!out[l.id]) out[l.id] = {}; out[l.id][c.id] = Math.round(n * 100) / 100; }
        }
        fim(out);
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      const prim = form.querySelector('input');
      if (prim) { prim.focus(); prim.select(); }
    });
  }

  /* ---------------- o Livro do reino (na aba Reinos) ---------------- */
  function secLivro(v) {
    const { h, nota, secao, fmt, plural, nomeFac, facDe } = kit();
    if (!R() || !v) return null;
    const L = R().livroDoReino(v), out = [];
    // (parte 2) com a economia: o que cada facção produz por semana e o estoque (os recursos do mundo nela)
    const eco = ligada(v) ? v.eco : null, prod = eco ? R().producaoPorFaccao(v) : null;
    const txtRec = t => eco.rec.filter(r => t[r.id]).map(r => r.nome + ' ' + (t[r.id] > 0 ? '' : '−') + fmt(Math.abs(t[r.id]), 2)).join(' · ');
    const linha = (l, nome, cor, f) => h('div', { class: 'livro-li', 'data-k': 'livro:' + (l.fac || '-') },
      h('i', { class: cor ? '' : 'sem', style: cor ? { background: cor } : null }), h('b', { text: nome }),
      h('small', { text: [plural(l.prov, 'província', 'províncias'), plural(l.sub, 'sub-região', 'sub-regiões'), L.grade ? plural(l.hex, 'hexágono', 'hexágonos') : null,
        l.exe ? plural(l.exe, 'exército', 'exércitos') + ' (' + fmt(l.tropas, 0) + ' tropas)' : null].filter(Boolean).join(' · ') }),
      eco ? h('small', { class: 'livro-prod', text: 'Produz por semana: ' + (txtRec(l.fac ? prod.por[l.fac] || {} : prod.sem) || 'nada') }) : null,
      eco && f ? h('small', { class: 'livro-est', text: 'Estoque: ' + (txtRec(Object.fromEntries((f.rec || []).filter(r => eco.rec.some(w => w.id === r.id)).map(r => [r.id, r.n]))) || 'nada') }) : null);
    for (const l of L.linhas) { const f = facDe(v, l.fac); if (f) out.push(linha(l, nomeFac(f), f.cor, f)); }
    const s = L.sem;
    if (s.prov || s.sub || s.hex || s.exe) out.push(linha(s, 'Sem dono', null));
    if (!out.length) out.push(nota('Nada ainda.'));
    if (!L.grade) out.push(nota('Sem a grade de hexágonos (aba Mapa), o livro não conta os hexágonos.'));
    return secao('Livro do reino', out);
  }

  window.MundoReinoPainel = { secProvincia, secLivro, secEconomia, secAssentamento, janelaTerreno, janelaPopulacao, ligar };
})();
