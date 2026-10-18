/* Tiny Cats · Mapa-múndi · os reinos no painel (lote 10).
   A seção Província (ou Sub-região) da região escolhida: de qual província ela é parte, as sub-regiões de dentro (com o
   dono de cada uma, quando é outro) e os hexágonos por terreno. Na aba Reinos, o Livro do reino: por facção, as
   províncias, as sub-regiões, os hexágonos e os exércitos.
   (parte 2) A economia: na aba Reinos, ligar e desligar, os recursos do mundo (o nome, a cor, o papel), a produção do
   terreno e a da população (janelas) e os níveis dos assentamentos; na província, a produção por semana e de onde ela
   vem (o terreno, a população, o valor do mestre) e os assentamentos de dentro; no marcador, o assentamento (o nível
   e a população, fixa); no Livro do reino, o que cada facção produz e o estoque.
   (parte 3) As construções: o catálogo (na Economia do mundo: mostrar, criar, editar — o nome, o ícone, os espaços, as
   exigências e os níveis, com o custo, as semanas, o que produz, o que gasta, a defesa e o efeito —, tirar, pôr o
   pronto); no assentamento, as construções dele (os espaços, construir, subir de nível, terminar, cancelar, demolir) e
   a sede do clã (as construções do clã, com a produção que o mestre dá a cada uma).
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
  // (parte 3) os ícones das construções: os do Clã (ClaNucleo.ICONES) e mais alguns do mundo
  const ICONES_MUNDO = [
    { id: 'fazenda', nome: 'Fazenda', d: 'M12 21V5M12 8 9 5M12 8l3-3M12 12 9 9M12 12l3-3M12 16l-3-3M12 16l3-3' },
    { id: 'serraria', nome: 'Serraria', d: 'M3 20h18M5 20c0-2 1.6-3 3.5-3h7c1.9 0 3.5 1 3.5 3M13 4l7 7M14.5 5.5 8 12M16 3l5 5' },
    { id: 'runa', nome: 'Runa', d: 'M7 21 6 9l6-6 6 6-1 12zM12 8v9M12 11l3-2M12 14l-3-2' },
    { id: 'taverna', nome: 'Taverna', d: 'M5 8h10v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 11h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2M7 4.5c1-.8 2 .3 3-.5s2 .3 3 0' },
    { id: 'palicada', nome: 'Paliçada', d: 'M4 21V8l2-3 2 3v13M10 21V8l2-3 2 3v13M16 21V8l2-3 2 3v13M3 13h18' },
  ];
  function icones() {
    const C = window.ClaNucleo, base = C && Array.isArray(C.ICONES) ? C.ICONES : [];
    return base.concat(ICONES_MUNDO.filter(i => !base.some(b => b.id === i.id)));
  }
  const glifoIc = (id, tam) => { const l = icones(), i = l.find(x => x.id === id) || l[0]; return kit().glifo(i ? '<path d="' + i.d + '"/>' : '', tam || 18); };
  const nomesOu = l => (l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' ou ' + l[l.length - 1]);
  const pl = (n, um, varios) => kit().plural(n, um, varios);
  // uma tabela de recursos em texto ("Orith +3 · Lapros 2"); sinal: com o + e o − (sem: o número como está)
  const txtTab = (m, t, sinal) => m.eco.rec.filter(r => t && t[r.id]).map(r => r.nome + ' ' + (sinal ? sinalN(t[r.id]) : kit().fmt(t[r.id], 2))).join(' · ');
  // o que um nível faz por semana: "Orith +3 · gasta Lapros 2 · defesa +1"
  function txtNivel(m, nv) {
    if (!nv) return '';
    const p = txtTab(m, nv.prod, true), g = txtTab(m, nv.gasto, false);
    return [p, g ? 'gasta ' + g : '', nv.def ? 'defesa +' + nv.def : ''].filter(Boolean).join(' · ');
  }
  // as exigências de uma construção, em texto ("a partir de Vila · em Colina ou Montanha · depois de Templo")
  function txtExige(m, t) {
    const out = [], nv = t.exige.niv ? m.eco.niv.find(n => n.id === t.exige.niv) : null;
    if (nv) out.push('a partir de ' + nv.nome);
    if (t.exige.ter.length) out.push('em ' + nomesOu(t.exige.ter.map(id => (N().terrenoDe(m, id) || { nome: id }).nome)));
    if (t.exige.cons) { const o2 = R().tipoDe(m, t.exige.cons); if (o2) out.push('depois de ' + o2.nome); }
    return out.join(' · ');
  }
  let catAberto = false;                     // o catálogo de construções aberto na aba Reinos (só nesta página)

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
    const FONTES = [['terreno', 'terreno'], ['pop', 'população'], ['cons', 'construções'], ['gasto', 'manutenção'], ['mestre', 'do mestre']];
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
            h('small', { text: (a.nivel ? a.nivel.nome : 'sem nível') + ' · ' + fmt(a.o.ass.pop, 0) + ' pessoas' + (a.o.ass.cons ? ' · ' + pl(a.o.ass.cons.length, 'construção', 'construções') : '') + (a.r && a.r.id !== o.id ? ' · em ' + nomeDe(a.r, m) : '') }))))));
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
      out.push(...blocoConstrucoes(o, m), ...blocoSede(o, m));        // (parte 3)
    } else out.push(nota('Uma cidade, uma vila, um castelo: escolha o nível para ele virar assentamento (com a população e as construções).'));
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
    // (parte 3) o catálogo de construções
    out.push(h('small', { class: 'note eco-rot', text: 'Construções do catálogo (' + eco.cons.length + ')' }));
    if (!eco.cons.length) out.push(nota('Nenhuma construção no catálogo: crie as suas ou ponha as 15 prontas (produção, defesa e cívico).'));
    else if (catAberto) out.push(h('div', { class: 'eco-cons' }, eco.cons.map(t => linhaTipo(m, t))));
    out.push(linha(eco.cons.length ? botao(catAberto ? 'Esconder o catálogo' : 'Mostrar o catálogo', () => { catAberto = !catAberto; kit().pintar(); }, { c: 'sm', k: 'eco:cons-ver', expandido: catAberto })
      : botao('Pôr o catálogo pronto', porCatalogoPronto, { c: 'sm', k: 'eco:cons-pronto' }),
      botao('+ Construção', () => janelaTipo(null), { c: 'sm', k: 'eco:cons-novo', off: eco.cons.length >= ((N().LIMITES && N().LIMITES.construcoes) || 40) })));
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

  /* ---------------- (parte 3) as construções, no assentamento ---------------- */
  function blocoConstrucoes(o, m) {
    const { h, nota, botao, linha } = kit(), a = o.ass, eco = m.eco, out = [], cs = a.cons || [], e = R().espacosDe(m, o);
    out.push(h('small', { class: 'note eco-rot', 'data-k': 'o:' + o.id + ':esp', text: 'Construções' + (e.total ? ' · ' + e.usados + ' de ' + pl(e.total, 'espaço', 'espaços') : '') }));
    if (cs.length) out.push(h('div', { class: 'cons-lista' }, cs.map(c => linhaConstrucao(o, m, c))));
    else out.push(nota(e.total ? 'Nenhuma construção ainda.' : 'Escolha um nível com espaços de construção para construir aqui.'));
    if (!eco.cons.length) out.push(nota('O catálogo de construções está vazio (aba Reinos, Economia do mundo).'));
    const lim = (N().LIMITES && N().LIMITES.construcoesAss) || 16;
    if (e.total || cs.length) out.push(linha(botao('+ Construir…', () => janelaObra(o.id, null), { c: 'sm', k: 'o:' + o.id + ':construir', off: !eco.cons.length || cs.length >= lim })));
    const ef = R().efeitoDasConstrucoes(m, o), txt = [txtTab(m, ef.prod, true), txtTab(m, ef.gasto, true), ef.def ? 'defesa +' + ef.def : ''].filter(Boolean).join(' · ');
    if (txt) out.push(nota('Pelas construções prontas, por semana: ' + txt + '.'));
    return out;
  }
  function linhaConstrucao(o, m, c) {
    const { h, botao, campoNumero, glifo, X_SVG } = kit(), t = R().tipoDe(m, c.t), prox = R().proximoNivel(m, c), id = o.id;
    if (!t) return null;
    const meta = [c.n ? 'nível ' + c.n + (t.niveis.length > 1 ? ' de ' + t.niveis.length : '') : 'em obra', c.n ? txtNivel(m, t.niveis[c.n - 1]) : ''].filter(Boolean).join(' · ');
    let obra = null;
    if (c.obra) {
      const sem = campoNumero('cons:' + c.id + ':sem', null, c.obra.sem, n => app().mudar('mudar as semanas da obra', mm => {
        const x = consDoRasc(mm, id, c.id);
        if (!x || !x.obra || x.obra.sem === n) return false;
        x.obra.sem = n;
      }), { min: 0, max: (N().LIMITES && N().LIMITES.semanasObra) || 104 });
      sem.setAttribute('aria-label', 'Semanas que faltam na obra de ' + t.nome);
      obra = h('div', { class: 'cons-obra' }, h('span', { class: 'tag obra', text: 'obra do nível ' + c.obra.n }), h('span', { text: 'faltam' }), sem, h('span', { text: c.obra.sem === 1 ? 'semana' : 'semanas' }));
    }
    const ef = c.n && t.niveis[c.n - 1].ef ? h('small', { class: 'cons-ef', text: t.niveis[c.n - 1].ef }) : null;
    return h('div', { class: 'cons-li' + (c.obra ? ' em-obra' : ''), 'data-k': 'cons:' + c.id },
      h('span', { class: 'ico' }, glifoIc(t.ic, 20)),
      h('div', { class: 'tx' }, h('b', { text: t.nome }), h('small', { text: meta }), ef, obra,
        h('div', { class: 'row cons-acoes' },
          prox ? botao('Subir para o nível ' + prox.n + '…', () => janelaObra(id, c.id), { c: 'sm', k: 'cons:' + c.id + ':subir' }) : null,
          c.obra ? botao('Terminar a obra', () => terminar(id, c.id), { c: 'sm', k: 'cons:' + c.id + ':terminar', title: 'O nível da obra passa a valer agora' }) : null,
          c.obra ? botao('Cancelar a obra…', () => cancelar(id, c.id), { c: 'sm', k: 'cons:' + c.id + ':cancelar' }) : null)),
      h('button', { type: 'button', class: 'ib', 'data-k': 'cons:' + c.id + ':x', title: 'Demolir ' + t.nome, 'aria-label': 'Demolir ' + t.nome, onclick: () => demolirCons(id, c.id) }, glifo(X_SVG, 14)));
  }
  const consDoRasc = (mm, oId, cId) => { const o = (mm.objs || []).find(x => x.id === oId); return o && o.ass && Array.isArray(o.ass.cons) ? o.ass.cons.find(x => x.id === cId) || null : null; };
  // o nome da construção e o do assentamento (para os avisos e o motivo no histórico da facção)
  function nomesDe(m, oId, cId) {
    const o = kit().achar(m, oId), c = o && o.ass && (o.ass.cons || []).find(x => x.id === cId), t = c ? R().tipoDe(m, c.t) : null;
    return t ? { o, c, t, onde: kit().nomeDe(o, m) } : null;
  }
  function terminar(oId, cId) {
    const x = nomesDe(app().mapa, oId, cId);
    if (!x || !x.c.obra) return;
    const n = x.c.obra.n;
    if (app().mudar('terminar a obra', mm => (R().terminarObra(mm, oId, cId) ? undefined : false)) !== false) kit().avisoDesfazer(x.t.nome + (n > 1 ? ' subiu para o nível ' + n : ' ficou pronta') + '.');
  }
  async function cancelar(oId, cId) {
    const K = kit(), m = app().mapa, x = nomesDe(m, oId, cId);
    if (!x || !x.c.obra) return;
    const f = x.c.obra.fac ? K.facDe(m, x.c.obra.fac) : null, volta = txtTab(m, x.c.obra.pago, false);
    const ok = await K.confirmar({ titulo: 'Cancelar a obra de ' + x.t.nome + '?', ok: 'Cancelar a obra', cancelar: 'Voltar', perigo: true,
      texto: (x.c.n ? 'A obra do nível ' + x.c.obra.n + ' para; ' + x.t.nome + ' continua no nível ' + x.c.n + '.' : x.t.nome + ' sai de ' + x.onde + '.') + (f && volta ? ' Volta para ' + K.nomeFac(f) + ': ' + volta + '.' : '') + ' Dá para desfazer.' });
    if (!ok || !K.mesmoMapa(m.id)) return;
    if (app().mudar('cancelar a obra', mm => (R().cancelarObra(mm, oId, cId, 'Obra cancelada: ' + x.t.nome + ' em ' + x.onde) ? undefined : false)) !== false) K.avisoDesfazer('Obra cancelada' + (f && volta ? ' (o que foi pago voltou).' : '.'));
  }
  async function demolirCons(oId, cId) {
    const K = kit(), m = app().mapa, x = nomesDe(m, oId, cId);
    if (!x) return;
    const f = x.c.obra && x.c.obra.fac ? K.facDe(m, x.c.obra.fac) : null, volta = x.c.obra ? txtTab(m, x.c.obra.pago, false) : '';
    const ok = await K.confirmar({ titulo: 'Demolir ' + x.t.nome + '?', ok: 'Demolir', perigo: true,
      texto: x.t.nome + ' sai de ' + x.onde + ' (o espaço fica livre).' + (f && volta ? ' A obra em andamento devolve para ' + K.nomeFac(f) + ': ' + volta + '.' : '') + ' Dá para desfazer.' });
    if (!ok || !K.mesmoMapa(m.id)) return;
    if (app().mudar('demolir ' + x.t.nome, mm => (R().demolir(mm, oId, cId, 'Demolida: ' + x.t.nome + ' em ' + x.onde) ? undefined : false)) !== false) K.avisoDesfazer(x.t.nome + ' foi demolida.');
  }
  /* A janela da obra: construir (cId null: escolher a construção) ou subir de nível (cId: a construção). Mostra o custo,
     as semanas, o que a construção faz, o que não deixa, quem paga (o estoque dele e o que falta). Começar paga na hora. */
  async function janelaObra(oId, cId) {
    const A = app(), m = A.mapa, o = m && kit().achar(m, oId);
    if (!o || !o.ass || !ligada(m)) return;
    const c = cId ? (o.ass.cons || []).find(x => x.id === cId) : null;
    if (cId && (!c || !R().proximoNivel(m, c))) return;
    const r = N().regiaoEm(m, o.x, o.y), dono = r ? N().facDaRegiao(m, r) : null;
    const res = await dialogoObra(m, o, c, dono);
    if (!res || !kit().mesmoMapa(m.id)) return;
    const t = R().tipoDe(m, res.tipo), alvo = c ? c.n + 1 : 1, onde = kit().nomeDe(o, m);
    if (!t) return;
    const mot = 'Obra: ' + t.nome + (c ? ' (nível ' + alvo + ')' : '') + ' em ' + onde;
    let feito = null;
    const ok = A.mudar(c ? 'subir ' + t.nome + ' de nível' : 'construir ' + t.nome, mm => {
      feito = c ? R().subirNivel(mm, oId, cId, res.fac, mot) : R().comecarObra(mm, oId, res.tipo, res.fac, mot);
      if (!feito) return false;
    });
    if (ok === false || !feito) return;
    kit().avisoDesfazer(feito.obra ? t.nome + ': a obra ' + (c ? 'do nível ' + alvo + ' ' : '') + 'começou (' + pl(feito.obra.sem, 'semana', 'semanas') + ').' : t.nome + (c ? ' subiu para o nível ' + alvo : ' ficou pronta') + '.');
  }
  function dialogoObra(m, o, c, dono) {
    const { h, nomeDe, nomeFac, fmt } = kit();
    return new Promise(resolve => {
      const tipos = m.eco.cons, cTipo = c ? R().tipoDe(m, c.t) : null, facs = m.faccoes || [];
      const motivos = t => (c ? [] : R().exigenciasDe(m, o, t));
      let sel = cTipo || tipos.find(t => !motivos(t).length) || tipos[0] || null;
      const titulo = h('h2', { text: c ? 'Subir ' + cTipo.nome + ' para o nível ' + (c.n + 1) : 'Construir em ' + nomeDe(o, m) });
      titulo.id = 'dl-ob-' + Date.now().toString(36);
      const selTipo = c ? null : h('select', { 'data-k': 'ob:tipo' }, tipos.map(t => { const mt = motivos(t); return h('option', { value: t.id, text: t.nome + (mt.length ? ' — ' + mt.map(x => x.txt).join('; ') : ''), disabled: mt.length ? true : null }); }));
      if (selTipo && sel) selTipo.value = sel.id;
      const selFac = h('select', { 'data-k': 'ob:fac' }, [h('option', { value: '', text: 'Ninguém (de graça)' })].concat(facs.map(f => h('option', { value: f.id, text: nomeFac(f) }))));
      selFac.value = dono && facs.some(f => f.id === dono) ? dono : '';
      const det = h('div', { class: 'ob-det', 'data-k': 'ob:det' }), est = h('p', { class: 'ob-est', 'data-k': 'ob:est' }), err = h('p', { class: 'err', role: 'alert', 'data-k': 'ob:falta' });
      const bNao = h('button', { type: 'button', class: 'btn', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'ob:ok', text: 'Começar a obra' });
      const alvo = () => (c ? c.n + 1 : 1);
      function pintarObra() {
        const nv = sel ? sel.niveis[alvo() - 1] : null;
        det.replaceChildren(); est.textContent = ''; err.textContent = '';
        if (!nv) { bOk.disabled = true; return; }
        const mt = motivos(sel), linhas = [];
        if (!c) linhas.push('Ocupa ' + pl(sel.esp, 'espaço', 'espaços') + (sel.niveis.length > 1 ? ' · tem ' + pl(sel.niveis.length, 'nível', 'níveis') : ''));
        linhas.push((nv.sem ? pl(nv.sem, 'semana', 'semanas') + ' de obra' : 'Fica pronta na hora') + ' · custa ' + (txtTab(m, nv.custo, false) || 'nada'));
        const faz = txtNivel(m, nv);
        if (c) { const antes = txtNivel(m, cTipo.niveis[c.n - 1]); linhas.push('No nível ' + alvo() + ', por semana: ' + (faz || 'nada') + (antes ? ' (agora: ' + antes + ')' : '')); }
        else linhas.push('Pronta, por semana: ' + (faz || 'nada'));
        if (nv.ef) linhas.push('Efeito: ' + nv.ef);
        det.append(...linhas.map(t => h('p', { text: t })));
        const fid = selFac.value, f = facs.find(x => x.id === fid), ids = m.eco.rec.filter(w => nv.custo[w.id]).map(w => w.id);
        if (f && ids.length) est.textContent = 'Estoque de ' + nomeFac(f) + ': ' + ids.map(id => { const rr = (f.rec || []).find(x => x.id === id), w = m.eco.rec.find(x => x.id === id); return (w ? w.nome : id) + ' ' + fmt(rr ? rr.n : 0, 2); }).join(' · ');
        else if (!f && ids.length) est.textContent = 'Ninguém paga: a obra sai de graça.';
        const falta = f ? R().faltaPara(m, fid, nv.custo) : [];
        if (mt.length) err.textContent = 'Não dá: ' + mt.map(x => x.txt).join('; ') + '.';
        else if (falta.length) err.textContent = 'Falta: ' + falta.map(x => x.nome + ' ' + fmt(x.falta, 2)).join(' · ') + '. (Para não pagar, escolha "Ninguém".)';
        bOk.disabled = !!mt.length || !!falta.length;
        bOk.textContent = nv.sem ? 'Começar a obra' : c ? 'Subir agora' : 'Construir agora';
      }
      if (selTipo) selTipo.addEventListener('change', () => { sel = tipos.find(t => t.id === selTipo.value) || null; pintarObra(); });
      selFac.addEventListener('change', pintarObra);
      const form = h('form', { class: 'dl', novalidate: true }, titulo, selTipo ? h('label', null, 'Construção', selTipo) : null, det,
        h('label', null, 'Quem paga', selFac), est, err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl ob-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      form.addEventListener('submit', ev => { ev.preventDefault(); if (bOk.disabled || !sel) return; fim({ tipo: sel.id, fac: selFac.value || null }); });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      pintarObra();
      dl.showModal();
      (selTipo || selFac).focus();
    });
  }

  /* ---------------- (parte 3) a sede do clã, no assentamento ---------------- */
  function blocoSede(o, m) {
    const { h, nota, campoEscolha, botao, mudarObj, nomeFac, facDe } = kit(), A = app(), a = o.ass, out = [], todos = A.clas instanceof Map ? A.clas : new Map(), atual = a.cla ? a.cla.id : '';
    const ops = [['', 'Não é sede de clã']].concat([...todos.values()].map(c => [c.id, c.nome]));
    if (atual && !todos.has(atual)) ops.push([atual, '(um clã que este aparelho não vê)']);
    out.push(campoEscolha('o:' + o.id + ':cla', 'Sede de clã', atual, ops, v => mudarObj(o.id, v ? 'pôr a sede do clã' : 'tirar a sede do clã', x => {
      const b = x.ass;
      if (!b) return false;
      if (!v) { if (!b.cla) return false; delete b.cla; return; }
      if (b.cla && b.cla.id === v) return false;
      b.cla = { id: v, prod: {} };
    }), { dica: todos.size || atual ? null : 'Os clãs vêm da página Clã (na mesa, os que você mestra).' }));
    if (!a.cla) return out;
    const c = todos.get(a.cla.id);
    if (!c) { out.push(nota('Este aparelho não vê este clã agora: a produção da sede vai para a dona do lugar.')); return out; }
    const r = N().regiaoEm(m, o.x, o.y), dono = r ? N().facDaRegiao(m, r) : null, ligada0 = c.fac && facDe(m, c.fac) ? c.fac : null, fid = ligada0 || dono;
    out.push(nota('As construções do clã (as da página Clã) não ocupam espaços. O que elas produzem vai para ' + (fid ? nomeFac(facDe(m, fid)) : 'ninguém (fora das províncias)') +
      (ligada0 ? ' (a facção ligada ao clã).' : ' (o clã não tem facção ligada deste mapa: a dona do lugar).')));
    if (!c.cons.length) { out.push(nota('O clã ainda não tem construções.')); return out; }
    out.push(h('div', { class: 'cons-lista cla', 'data-k': 'o:' + o.id + ':cla-cons' }, c.cons.map(k => {
      const p = a.cla.prod[k.id] || {}, txt = txtTab(m, p, true);
      return h('div', { class: 'cons-li', 'data-k': 'cla:' + k.id },
        h('span', { class: 'ico' }, glifoIc(k.ico, 20)),
        h('div', { class: 'tx' }, h('b', { text: k.nome }), h('small', { text: 'nível ' + k.nivel + ' · ' + (txt ? txt + ' por semana' : 'não produz') }), k.efeito ? h('small', { class: 'cons-ef', text: k.efeito }) : null,
          h('div', { class: 'row cons-acoes' }, botao('Produção…', () => janelaProdCla(o.id, k.id), { c: 'sm', k: 'cla:' + k.id + ':prod', title: 'Quanto ' + k.nome + ' produz por semana' }))));
    })));
    return out;
  }
  async function janelaProdCla(oId, kId) {
    const A = app(), m = A.mapa, o = m && kit().achar(m, oId), cl = o && o.ass && o.ass.cla, c = cl && A.clas instanceof Map ? A.clas.get(cl.id) : null, k = c && c.cons.find(x => x.id === kId);
    if (!k || !ligada(m)) return;
    const recs = m.eco.rec, atual = cl.prod[kId] || {};
    const v = await kit().janela({ titulo: k.nome + ' (' + c.nome + ')', ok: 'Salvar',
      texto: 'Quanto ' + k.nome + ' (nível ' + k.nivel + ') produz por semana (um número negativo gasta). Vazio ou zero: nada.',
      campos: recs.map((r, i) => ({ id: r.id, rotulo: r.nome, tipo: 'decimal', valor: atual[r.id] ? kit().fmtCampo(atual[r.id]) : '', ph: '0', linha: 'l' + Math.floor(i / 3) })),
      ler: vals => lerTabela(vals, recs) });
    if (v == null || !kit().mesmoMapa(m.id)) return;
    if (kit().mudarObj(oId, 'mudar a produção da construção do clã', x => {
      const b = x.ass && x.ass.cla;
      if (!b) return false;
      if (JSON.stringify(b.prod[kId] || {}) === JSON.stringify(v)) return false;
      if (Object.keys(v).length) b.prod[kId] = v; else delete b.prod[kId];
    }) !== false) kit().avisoDesfazer('Produção de ' + k.nome + ' salva.');
  }

  /* ---------------- (parte 3) o catálogo de construções, na Economia do mundo ---------------- */
  function linhaTipo(m, t) {
    const { h, botao, glifo, X_SVG } = kit(), ex = txtExige(m, t), faz = txtNivel(m, t.niveis[0]);
    return h('div', { class: 'cons-li tipo', 'data-k': 'eco:c:' + t.id },
      h('span', { class: 'ico' }, glifoIc(t.ic, 20)),
      h('div', { class: 'tx' }, h('b', { text: t.nome }),
        h('small', { text: [pl(t.esp, 'espaço', 'espaços'), pl(t.niveis.length, 'nível', 'níveis'), ex].filter(Boolean).join(' · ') }),
        h('small', { text: 'Nível 1: ' + (faz || 'só o efeito') + ' · custa ' + (txtTab(m, t.niveis[0].custo, false) || 'nada') + ' · ' + pl(t.niveis[0].sem, 'semana', 'semanas') }),
        h('div', { class: 'row cons-acoes' }, botao('Editar…', () => janelaTipo(t.id), { c: 'sm', k: 'eco:c:' + t.id + ':editar' }))),
      h('button', { type: 'button', class: 'ib', 'data-k': 'eco:c:' + t.id + ':x', title: 'Tirar ' + t.nome + ' do catálogo', 'aria-label': 'Tirar ' + t.nome + ' do catálogo', onclick: () => tirarTipo(t.id) }, glifo(X_SVG, 14)));
  }
  function porCatalogoPronto() {
    let n = 0;
    if (mudarEco('pôr o catálogo pronto', (e, mm) => { if (e.cons.length) return false; e.cons = R().catalogoPronto(mm, e); n = e.cons.length; }) !== false) { catAberto = true; kit().avisoDesfazer('O catálogo pronto entrou: ' + pl(n, 'construção', 'construções') + '.'); }
  }
  async function tirarTipo(id) {
    const K = kit(), m = app().mapa, t = R().tipoDe(m, id);
    if (!t) return;
    const usam = (m.objs || []).reduce((s, o) => s + (o.k === 'm' && o.ass && o.ass.cons ? o.ass.cons.filter(c => c.t === id).length : 0), 0);
    const pedem = m.eco.cons.filter(x => x.exige.cons === id);
    if (usam || pedem.length) {
      const ok = await K.confirmar({ titulo: 'Tirar ' + t.nome + ' do catálogo?', ok: 'Tirar do catálogo', perigo: true,
        texto: [usam ? (usam === 1 ? 'A construção dela que está num assentamento sai junto' : 'As ' + usam + ' construções dela nos assentamentos saem junto') + ' (as obras em andamento não devolvem nada).' : '',
          pedem.length ? 'Deixa de ser pedida antes por: ' + pedem.map(x => x.nome).join(', ') + '.' : '', 'Dá para desfazer.'].filter(Boolean).join(' ') });
      if (!ok || !K.mesmoMapa(m.id)) return;
    }
    if (mudarEco('tirar a construção do catálogo', e => { const n = e.cons.length; e.cons = e.cons.filter(x => x.id !== id); if (e.cons.length === n) return false; }) !== false) K.avisoDesfazer(t.nome + ' saiu do catálogo.');
  }
  async function janelaTipo(id) {
    const m = app().mapa;
    if (!ligada(m)) return;
    const t = id ? R().tipoDe(m, id) : null;
    if (id && !t) return;
    const v = await dialogoTipo(m, t);
    if (!v || !kit().mesmoMapa(m.id)) return;
    const ok = mudarEco(t ? 'mudar a construção ' + t.nome : 'criar a construção ' + v.nome, e => {
      if (t) {
        const x = e.cons.find(y => y.id === t.id);
        if (!x) return false;
        const ant = JSON.stringify(x);
        Object.assign(x, v);
        if (JSON.stringify(x) === ant) return false;
        return;
      }
      if (e.cons.length >= ((N().LIMITES && N().LIMITES.construcoes) || 40)) return false;
      e.cons.push(Object.assign({ id: N().novoId('cs') }, v));
    });
    if (ok !== false) { if (!t) catAberto = true; kit().avisoDesfazer(t ? v.nome + ': salva.' : v.nome + ': entrou no catálogo.'); }
  }
  /* O editor de uma construção do catálogo (t null: uma nova): o nome, o ícone, os espaços, as exigências e os níveis
     (as semanas de obra, a defesa, o custo, o que produz e o que gasta por semana — uma tabela por nível — e o efeito).
     → a construção sem o id, ou null (cancelou). */
  function dialogoTipo(m, t) {
    const { h, lerNum, fmtCampo } = kit();
    return new Promise(resolve => {
      const recs = m.eco.rec, ters = m.terrenos || [], outros = m.eco.cons.filter(x => !t || x.id !== t.id);
      const KS = [['custo', 'Custa'], ['prod', 'Produz por semana'], ['gasto', 'Gasta por semana']];
      const inp = (k, v, o2) => h('input', Object.assign({ type: 'text', 'data-k': k, value: v == null ? '' : String(v), autocomplete: 'off' }, o2 || {}));
      const nome = inp('ct:nome', t ? t.nome : '', { maxlength: 40, placeholder: 'Ex.: Moinho' });
      const ic = h('select', { 'data-k': 'ct:ic' }, icones().map(i => h('option', { value: i.id, text: i.nome })));
      ic.value = t ? t.ic : 'salao';
      const icVer = h('span', { class: 'ct-ic', 'aria-hidden': 'true' }), pintarIc = () => icVer.replaceChildren(glifoIc(ic.value, 24));
      ic.addEventListener('change', pintarIc); pintarIc();
      const esp = inp('ct:esp', t ? t.esp : 1, { inputmode: 'numeric' });
      const selNiv = h('select', { 'data-k': 'ct:niv' }, [h('option', { value: '', text: 'Qualquer' })].concat(m.eco.niv.map(n => h('option', { value: n.id, text: n.nome + ' ou maior' }))));
      selNiv.value = t && t.exige.niv ? t.exige.niv : '';
      const terCx = ters.map(x => h('label', { class: 'op ct-ter' }, h('input', { type: 'checkbox', 'data-k': 'ct:ter:' + x.id, value: x.id, checked: t && t.exige.ter.includes(x.id) ? true : null }), h('span', { text: x.nome })));
      const selCons = h('select', { 'data-k': 'ct:cons' }, [h('option', { value: '', text: 'Nenhuma' })].concat(outros.map(x => h('option', { value: x.id, text: x.nome }))));
      selCons.value = t && t.exige.cons ? t.exige.cons : '';
      const fmtC = v => (v ? fmtCampo(v) : '');
      const valsDe = n => { const o2 = { sem: String(n.sem), def: String(n.def || 0), ef: n.ef || '' }; for (const [k] of KS) { o2[k] = {}; for (const r of recs) o2[k][r.id] = fmtC(n[k][r.id]); } return o2; };
      function fsNivel(i, v) {
        const linhas = KS.map(([k, rot]) => h('tr', { 'data-lin': k }, h('th', { scope: 'row', text: rot }),
          recs.map(r => h('td', null, inp('ct:' + i + ':' + k + ':' + r.id, v[k][r.id], { inputmode: 'decimal', class: 'in', placeholder: '0', 'aria-label': 'Nível ' + i + ', ' + rot + ', ' + r.nome })))));
        return h('fieldset', { class: 'ct-nivel', 'data-niv': String(i) }, h('legend', { text: 'Nível ' + i }),
          h('div', { class: 'lin' }, h('label', null, 'Semanas de obra', inp('ct:' + i + ':sem', v.sem, { inputmode: 'numeric' })), h('label', null, 'Defesa', inp('ct:' + i + ':def', v.def, { inputmode: 'numeric' }))),
          h('div', { class: 'eco-tab-caixa' }, h('table', { class: 'eco-tab' },
            h('thead', null, h('tr', null, h('th', { scope: 'col', text: '' }), recs.map(r => h('th', { scope: 'col' }, h('i', { style: { background: r.cor } }), h('span', { text: r.nome }))))),
            h('tbody', null, linhas))),
          h('label', null, 'Efeito (escrito, opcional)', inp('ct:' + i + ':ef', v.ef, { maxlength: 200, placeholder: 'Ex.: os exércitos daqui recuperam a moral mais rápido' })));
      }
      const caixaNiveis = h('div', { class: 'ct-niveis' });
      (t ? t.niveis : [{ custo: {}, sem: 2, prod: {}, gasto: {}, def: 0, ef: '' }]).forEach((n, i) => caixaNiveis.append(fsNivel(i + 1, valsDe(n))));
      const valsDoFs = (fs, i) => { const q = k => { const e0 = fs.querySelector('[data-k="ct:' + i + ':' + k + '"]'); return e0 ? e0.value : ''; }; const o2 = { sem: q('sem'), def: q('def'), ef: q('ef') }; for (const [k] of KS) { o2[k] = {}; for (const r of recs) o2[k][r.id] = q(k + ':' + r.id); } return o2; };
      const bMais = h('button', { type: 'button', class: 'btn sm', 'data-k': 'ct:niv-novo', text: '+ Nível' }), bMenos = h('button', { type: 'button', class: 'btn sm', 'data-k': 'ct:niv-tirar', text: 'Tirar o último nível' });
      const maxN = (N().LIMITES && N().LIMITES.niveisConstrucao) || 5, contar = () => caixaNiveis.children.length, pintarBotoes = () => { bMais.disabled = contar() >= maxN; bMenos.disabled = contar() <= 1; };
      bMais.addEventListener('click', () => { const n = contar(); if (n >= maxN) return; caixaNiveis.append(fsNivel(n + 1, valsDoFs(caixaNiveis.lastElementChild, n))); pintarBotoes(); });
      bMenos.addEventListener('click', () => { if (contar() <= 1) return; caixaNiveis.lastElementChild.remove(); pintarBotoes(); });
      pintarBotoes();
      const titulo = h('h2', { text: t ? 'Construção: ' + t.nome : 'Uma construção nova' });
      titulo.id = 'dl-ct-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'ct:ok', text: t ? 'Salvar' : 'Criar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        h('div', { class: 'lin ct-cab' }, h('label', null, 'Nome', nome), h('label', null, 'Ícone', ic), icVer, h('label', null, 'Espaços', esp)),
        h('fieldset', { class: 'ct-exige' }, h('legend', { text: 'Exige (o que não marcar, não exige)' }),
          h('div', { class: 'lin' }, h('label', null, 'Nível do assentamento', selNiv), h('label', null, 'Outra construção antes', selCons)),
          ters.length ? h('div', null, h('small', { class: 'ajuda', text: 'Terreno na região (um deles):' }), h('div', { class: 'ct-ters' }, terCx)) : null),
        caixaNiveis, h('div', { class: 'row' }, bMais, bMenos), err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl eco-dl ct-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      const inteiroDe = (txt, a, b, msg) => { const s0 = String(txt).trim(); const n = s0 === '' ? 0 : lerNum(s0); if (!Number.isFinite(n) || Math.round(n) !== n || n < a || n > b) throw new Error(msg); return n; };
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const n0 = nome.value.trim();
          if (!n0) throw new Error('Escreva o nome da construção.');
          const e0 = inteiroDe(esp.value, 0, (N().LIMITES && N().LIMITES.espacosConstrucao) || 6, 'Os espaços: um número inteiro de 0 a 6.');
          const nvs = [...caixaNiveis.children].map((fs, j0) => {
            const i = j0 + 1, v = valsDoFs(fs, i);
            const out = { custo: {}, sem: inteiroDe(v.sem, 0, 104, 'Nível ' + i + ': as semanas de obra, um número inteiro de 0 a 104.'), prod: {}, gasto: {},
              def: inteiroDe(v.def, 0, 20, 'Nível ' + i + ': a defesa, um número inteiro de 0 a 20.'), ef: String(v.ef || '').trim().slice(0, 200) };
            for (const [k, rot] of KS) for (const r of recs) {
              const s0 = String(v[k][r.id] || '').trim();
              if (!s0) continue;
              const x = lerNum(s0);
              if (!Number.isFinite(x) || Math.abs(x) > 1e6) throw new Error('Nível ' + i + ', ' + rot.toLowerCase() + ', ' + r.nome + ': use um número.');
              if (k !== 'prod' && x < 0) throw new Error('Nível ' + i + ', ' + rot.toLowerCase() + ', ' + r.nome + ': use 0 ou mais.');
              if (x) out[k][r.id] = Math.round(x * 100) / 100;
            }
            return out;
          });
          fim({ nome: n0, ic: ic.value, esp: e0, exige: { niv: selNiv.value || null, ter: terCx.map(l => l.querySelector('input')).filter(x => x.checked).map(x => x.value), cons: selCons.value || null }, niveis: nvs });
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      nome.focus(); nome.select();
    });
  }

  /* ---------------- o Livro do reino (na aba Reinos) ---------------- */
  function secLivro(v) {
    const { h, nota, secao, fmt, plural, nomeFac, facDe } = kit();
    if (!R() || !v) return null;
    const L = R().livroDoReino(v), out = [];
    // (parte 2) com a economia: o que cada facção produz por semana e o estoque (os recursos do mundo nela)
    const eco = ligada(v) ? v.eco : null, prod = eco ? R().producaoPorFaccao(v, id => (app().infoDoCla ? app().infoDoCla(id) : null)) : null;
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

  window.MundoReinoPainel = { secProvincia, secLivro, secEconomia, secAssentamento, janelaTerreno, janelaPopulacao, ligar, janelaObra, janelaTipo, icones };
})();
