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
   (parte 4) A semana: na Economia do mundo, a semana aberta (ou as que estão para fechar), a manutenção dos exércitos
   (uma tabela: os tipos de tropa e as unidades sem tipo, por recurso) e as regras da falta; a prévia da semana (por
   facção, o estoque, a produção, a manutenção, o que fica e o que falta; as consequências, cada uma com a caixa para
   recusar; as obras), que abre sozinha quando o calendário passa de domingo para segunda; aplicar (com Desfazer) e a
   próxima pendente.
   (parte 5) A população por estrato: no assentamento, quantas pessoas de cada estrato (a barra, a lista e a janela
   "População…", com o "Distribuir…" que sugere a divisão de um total pelas porcentagens do nível, sem mudar nada até
   salvar); na Economia do mundo, os estratos (o que cada pessoa produz ou consome por semana e o lembrete) e a divisão
   por nível; na prévia da semana, os lembretes dos estratos.
   (parte 5b) As guildas da cidade (não são clãs): no assentamento, a lista (os membros e o estrato, o líder, a influência,
   a relação com o grupo, a produção e o gasto por semana, a parte da facção, o estoque e os serviços) e a janela da
   guilda (criar a partir de um modelo, editar, tirar); na Economia do mundo, o catálogo de guildas (os modelos: mostrar,
   pôr os 8 prontos, criar, editar, tirar); na prévia da semana, o que cada guilda recebe, gasta e guarda.
   A bandeira própria de uma facção (sem clã): a janela com o editor do brasão do Clã (a forma, a divisão, as cores, o
   símbolo; numa mesa, uma imagem); a bandeira no Livro do reino e na prévia da semana (a do clã ligado vale antes).
   (parte 6) O que os jogadores veem: no assentamento, a caixa "Os jogadores veem o que tem dentro"; para quem joga, a
   linha da facção deles no Livro do reino (com a produção, o estoque e "De onde vem": por fonte, a manutenção e por
   província) e, na cidade aberta, o nível, a população, as construções prontas e as guildas que não são secretas; na
   prévia da semana, o resumo para o rascunho do Jornal (com a prévia do texto; vai junto com o Desfazer da semana).
   Usa as ferramentas do painel (MundoPainel.kit): nada aqui muda o mapa direto. */
(() => {
  'use strict';
  const kit = () => window.MundoPainel.kit;
  const R = () => window.MundoReino;
  const N = () => window.MundoNucleo;
  const DP = () => window.MundoDiplomaciaPainel;      // (lote 11, parte 3b) a diplomacia na prévia da semana
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
    // (parte 5b) os das guildas
    { id: 'arco', nome: 'Arco', d: 'M6 3c7 3 10 6 10 9s-3 6-10 9M6 3v18M3 12h17M17 9l3 3-3 3' },
    { id: 'adaga', nome: 'Adaga', d: 'M12 2l2 4v8h-4V6zM7 14h10M12 14v6M10.5 21h3' },
    { id: 'mascara', nome: 'Máscara', d: 'M3 9c3-2 6-2 9 0 3-2 6-2 9 0-1 5-4 7-6 5-1-1-2-2-3-2s-2 1-3 2c-2 2-5 0-6-5zM7.5 11.5h1.5M15 11.5h1.5' },
    { id: 'balanca', nome: 'Balança', d: 'M12 4v16M8 20h8M5 7h14M5 7l-3 6h6zM19 7l-3 6h6z' },
    { id: 'cajado', nome: 'Cajado', d: 'M6 21 15 8M13.5 4.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M20 9l1 1M17.5 11v1.5' },
    { id: 'mapa', nome: 'Mapa', d: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14' },
    { id: 'alaude', nome: 'Alaúde', d: 'M8.5 13.5a4 4 0 1 0 6 5 4 4 0 1 0-6-5zM12 13l6-9M16 3l3 3M11 16.5h.01' },
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
  let estrAberto = false;                    // (parte 5) a lista dos estratos aberta na aba Reinos (só nesta página)
  let gdAberto = false;                      // (parte 5b) o catálogo de guildas aberto na aba Reinos (só nesta página)
  // (pente fino) o ícone do marcador que combina com cada nível de começo, e a sugestão que aparece ao escolher o nível
  const IC_NIVEL = { aldeia: 'vila', vila: 'vila', cidade: 'cidade', metropole: 'cidade' };
  let sugIcone = null;

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
    const FONTES = [['terreno', 'terreno'], ['pop', 'população'], ['cons', 'construções'], ['gasto', 'manutenção'], ['guilda', 'guildas'], ['mestre', 'do mestre']];
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
            h('small', { text: (a.nivel ? a.nivel.nome : 'sem nível') + ' · ' + pl(a.o.ass.pop || 0, 'pessoa', 'pessoas') + (a.o.ass.cons ? ' · ' + pl(a.o.ass.cons.length, 'construção', 'construções') : '') + (a.r && a.r.id !== o.id ? ' · em ' + nomeDe(a.r, m) : '') }))))));
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
      v => {
        const r = mudarObj(o.id, v ? 'mudar o nível do assentamento' : 'deixar de ser assentamento', x => {
          if (!v) { if (!x.ass) return false; delete x.ass; return; }
          const b = x.ass || { niv: null, pop: 0 };
          if (b.niv === v) return false;
          b.niv = v; x.ass = b;
        });
        // (pente fino) o ícone que combina com o nível: a sugestão aparece logo abaixo (um clique; nada muda sozinho)
        const ic = IC_NIVEL[v], nv = eco.niv.find(n => n.id === v);
        sugIcone = r !== false && ic && nv && ic !== o.ic ? { o: o.id, ic, nome: nv.nome } : null;
        return r;
      }));
    if (sugIcone && sugIcone.o === o.id && a) {
      const s0 = sugIcone, nomeIc = (N().ICONES[s0.ic] || {}).nome || s0.ic;
      out.push(h('div', { class: 'row sug-ic', 'data-k': 'o:' + o.id + ':ic-sug' }, h('small', { text: 'Usar o ícone de ' + nomeIc + ' no mapa (combina com ' + s0.nome + ')?' }),
        kit().botao('Usar o ícone', () => { sugIcone = null; if (mudarObj(o.id, 'usar o ícone de ' + nomeIc, x => { if (x.ic === s0.ic) return false; x.ic = s0.ic; }) === false) kit().pintar(); }, { c: 'sm', k: 'o:' + o.id + ':ic-usar' }),
        kit().botao('Agora não', () => { sugIcone = null; kit().pintar(); }, { c: 'sm', k: 'o:' + o.id + ':ic-nao' })));
    }
    if (a) {
      // (parte 6) os jogadores veem o que tem dentro (o nível, a população, as construções prontas e as guildas que não são secretas)
      out.push(kit().caixa('o:' + o.id + ':ver-dentro', 'Os jogadores veem o que tem dentro', R().verDentro(m, o),
        v => mudarObj(o.id, v ? 'mostrar aos jogadores o que tem dentro' : 'esconder dos jogadores o que tem dentro', x => { if (!x.ass || x.ass.ver === !!v) return false; x.ass.ver = !!v; }),
        { dica: 'Ao clicar na cidade, eles veem o nível, a população (o total), as construções prontas e as guildas que não são secretas. As cidades da facção dos jogadores começam marcadas.' + (o.oculto ? ' Agora a cidade está escondida: eles não a veem no mapa.' : '') }));
      out.push(...blocoPopulacao(o, m));                                // (parte 5) as pessoas de cada estrato
      const r = N().regiaoEm(m, o.x, o.y), prov = r ? R().provinciaDe(m, r) : null;
      out.push(nota(r ? 'Fica em ' + nomeDe(r, m) + (prov && prov !== r ? ' (província ' + nomeDe(prov, m) + ')' : '') + '.' : 'Fora das províncias: não produz para ninguém.'));
      const pp = R().producaoDaPopulacao(m, o), txt = txtTab(m, pp, true);
      out.push(nota(txt ? 'Pela população, por semana: ' + txt + '.' : a.pop ? 'A população não produz nada (os estratos dela não têm produção: veja os estratos na Economia do mundo, na aba Reinos).' : 'Sem população ainda: use "População…".'));
      out.push(...blocoConstrucoes(o, m), ...blocoSede(o, m));        // (parte 3)
      out.push(...blocoGuildas(o, m));                                  // (parte 5b)
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
    // (parte 4) a semana
    const wN = R().semanaN(m, m.cal.dia), pend = R().semanasPendentes(m);
    if (wN == null) out.push(nota('O mapa não conta os dias da semana (aba Mapa): sem eles, a semana não fecha.'));
    else {
      const ds = R().diasDaSemana(m, pend ? eco.sem : wN);
      out.push(h('div', { class: 'sem-box' + (pend ? ' pend' : ''), 'data-k': 'eco:sem' },
        h('b', { text: pend ? (pend === 1 ? '1 semana para fechar' : pend + ' semanas para fechar') : 'A semana está aberta' }),
        h('small', { text: pend ? (pend > 1 ? 'A primeira: ' : '') + 'de ' + N().textoData(m.cal, ds.de) + ' a ' + N().textoData(m.cal, ds.ate) + '.' : 'Ela fecha na virada de domingo (' + N().textoData(m.cal, ds.ate) + ') para segunda: a prévia abre sozinha.' }),
        pend ? linha(botao('Fechar a semana…', () => janelaSemana(), { c: 'pri sm', k: 'eco:semana' })) : null));
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
      botao('Manutenção dos exércitos…', janelaManutencao, { c: 'sm', k: 'eco:manut' }),
      botao('Regras da falta…', janelaRegras, { c: 'sm', k: 'eco:regras' })));
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
    // (parte 5) os estratos da população
    const maxE = (N().LIMITES && N().LIMITES.estratos) || 16;
    out.push(h('small', { class: 'note eco-rot', text: 'Estratos da população (' + eco.estr.length + ')' }));
    if (!eco.estr.length) out.push(nota('Nenhum estrato: sem eles, a população não produz. Crie os seus ou ponha os 9 de começo.'));
    else if (estrAberto) out.push(h('div', { class: 'eco-estrs' }, eco.estr.map(s => linhaEstrato(m, s))));
    out.push(linha(eco.estr.length ? botao(estrAberto ? 'Esconder os estratos' : 'Mostrar os estratos', () => { estrAberto = !estrAberto; kit().pintar(); }, { c: 'sm', k: 'eco:estr-ver', expandido: estrAberto })
      : botao('Pôr os 9 de começo', porEstratosProntos, { c: 'sm', k: 'eco:estr-pronto' }),
      botao('+ Estrato', () => janelaEstrato(null), { c: 'sm', k: 'eco:estr-novo', off: eco.estr.length >= maxE }),
      botao('Divisão por nível…', janelaDivisao, { c: 'sm', k: 'eco:dist', off: !eco.estr.length || !eco.niv.length })));
    // (parte 3) o catálogo de construções
    out.push(h('small', { class: 'note eco-rot', text: 'Construções do catálogo (' + eco.cons.length + ')' }));
    if (!eco.cons.length) out.push(nota('Nenhuma construção no catálogo: crie as suas ou ponha as 15 prontas (produção, defesa e cívico).'));
    else if (catAberto) out.push(h('div', { class: 'eco-cons' }, eco.cons.map(t => linhaTipo(m, t))));
    out.push(linha(eco.cons.length ? botao(catAberto ? 'Esconder o catálogo' : 'Mostrar o catálogo', () => { catAberto = !catAberto; kit().pintar(); }, { c: 'sm', k: 'eco:cons-ver', expandido: catAberto })
      : botao('Pôr o catálogo pronto', porCatalogoPronto, { c: 'sm', k: 'eco:cons-pronto' }),
      botao('+ Construção', () => janelaTipo(null), { c: 'sm', k: 'eco:cons-novo', off: eco.cons.length >= ((N().LIMITES && N().LIMITES.construcoes) || 40) })));
    // (parte 5b) o catálogo de guildas (os modelos; cada cidade tem as suas)
    out.push(h('small', { class: 'note eco-rot', text: 'Guildas do catálogo (' + eco.guildas.length + ')' }));
    if (!eco.guildas.length) out.push(nota('Nenhuma guilda no catálogo: crie as suas ou ponha as 8 prontas (caçadores, assassinos, ladrões, mercadores, magos, artesãos, aventureiros e bardos). O catálogo só dá os modelos: cada cidade tem as suas guildas.'));
    else if (gdAberto) out.push(h('div', { class: 'eco-cons' }, eco.guildas.map(t => linhaGuildaCat(m, t))));
    out.push(linha(eco.guildas.length ? botao(gdAberto ? 'Esconder o catálogo de guildas' : 'Mostrar o catálogo de guildas', () => { gdAberto = !gdAberto; kit().pintar(); }, { c: 'sm', k: 'eco:gd-ver', expandido: gdAberto })
      : botao('Pôr as 8 prontas', porGuildasProntas, { c: 'sm', k: 'eco:gd-pronto' }),
      botao('+ Guilda no catálogo', () => janelaGuildaCat(null), { c: 'sm', k: 'eco:gd-novo', off: eco.guildas.length >= ((N().LIMITES && N().LIMITES.guildasCatalogo) || 24) })));
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
    if (mudarEco('criar o nível', e => { if (e.niv.length >= 12) return false; const ult = e.niv[e.niv.length - 1]; e.niv.push({ id: N().novoId('nv'), nome: v.nome, esp: v.esp, dist: ult ? JSON.parse(JSON.stringify(ult.dist || {})) : {} }); }) !== false) K.avisoDesfazer('Nível novo: ' + v.nome + '.');
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
  /* ---------------- (parte 5) os estratos da população, na Economia do mundo ---------------- */
  function linhaEstrato(m, s) {
    const { h, botao, glifo, X_SVG, campoCor } = kit(), pr = txtTab(m, s.prod, true);
    return h('div', { class: 'cons-li estr', 'data-k': 'eco:e:' + s.id },
      campoCor('eco:e:' + s.id + ':cor', 'Cor de ' + s.nome, s.cor, v => mudarEco('mudar a cor do estrato', e => { const x = e.estr.find(y => y.id === s.id); if (!x || x.cor === v) return false; x.cor = v; })),
      h('div', { class: 'tx' }, h('b', { text: s.nome }),
        h('small', { text: (pr ? pr + ' por pessoa' : 'não produz nem consome') + ' (por semana)' }),
        s.lembra ? h('small', { class: 'cons-ef', text: 'Lembrete na prévia da semana: ' + s.lembra }) : null,
        h('div', { class: 'row cons-acoes' }, botao('Editar…', () => janelaEstrato(s.id), { c: 'sm', k: 'eco:e:' + s.id + ':editar' }))),
      h('button', { type: 'button', class: 'ib', 'data-k': 'eco:e:' + s.id + ':x', title: 'Tirar ' + s.nome, 'aria-label': 'Tirar o estrato ' + s.nome, onclick: () => tirarEstrato(s.id) }, glifo(X_SVG, 14)));
  }
  // criar (id null) ou editar um estrato: o nome, o lembrete e o que cada pessoa produz (ou consome) por semana
  async function janelaEstrato(id) {
    const K = kit(), m = app().mapa;
    if (!ligada(m)) return;
    const s = id ? m.eco.estr.find(x => x.id === id) : null, recs = m.eco.rec;
    if (id && !s) return;
    const v = await K.janela({ titulo: s ? 'Estrato: ' + s.nome : 'Um estrato novo', ok: s ? 'Salvar' : 'Criar',
      texto: 'O que cada pessoa deste estrato produz por semana (um número negativo consome; com vírgula: 0,5). O lembrete aparece na prévia da semana, sem mudar nenhum número.',
      campos: [{ id: 'nome', rotulo: 'Nome', tipo: 'text', valor: s ? s.nome : '', ph: 'Ex.: Pescadores', max: 40, linha: 'a' }, { id: 'lembra', rotulo: 'Lembrete (opcional)', tipo: 'text', valor: s ? s.lembra : '', ph: 'Ex.: rumores', max: 80, linha: 'a' }]
        .concat(recs.map((r, i) => ({ id: 'r:' + r.id, rotulo: r.nome, tipo: 'decimal', valor: s && s.prod[r.id] ? K.fmtCampo(s.prod[r.id]) : '', ph: '0', linha: 'l' + Math.floor(i / 3) }))),
      ler: x => {
        if (!x.nome.trim()) throw new Error('Escreva o nome do estrato.');
        const vals = {};
        for (const r of recs) vals[r.id] = x['r:' + r.id];
        return { nome: x.nome.trim(), lembra: x.lembra.trim(), prod: lerTabela(vals, recs) };
      } });
    if (!v || !K.mesmoMapa(m.id)) return;
    const ok = mudarEco(s ? 'mudar o estrato ' + s.nome : 'criar o estrato ' + v.nome, e => {
      if (s) {
        const x = e.estr.find(y => y.id === s.id);
        if (!x || (x.nome === v.nome && x.lembra === v.lembra && JSON.stringify(x.prod) === JSON.stringify(v.prod))) return false;
        Object.assign(x, v);
        return;
      }
      if (e.estr.length >= ((N().LIMITES && N().LIMITES.estratos) || 16)) return false;
      const usadas = new Set(e.estr.map(x => x.cor)), cor = CORES_REC.find(c => !usadas.has(c)) || CORES_REC[e.estr.length % CORES_REC.length];
      e.estr.push({ id: N().novoId('es'), nome: v.nome, cor, prod: v.prod, lembra: v.lembra });
    });
    if (ok !== false) { if (!s) estrAberto = true; K.avisoDesfazer(s ? v.nome + ': salvo.' : v.nome + ': um estrato novo (nos assentamentos, ponha as pessoas dele em "População…").'); }
  }
  async function tirarEstrato(id) {
    const K = kit(), m = app().mapa, s = m.eco && m.eco.estr.find(x => x.id === id);
    if (!s) return;
    const ass = (m.objs || []).filter(o => o.k === 'm' && o.ass && o.ass.estr && o.ass.estr[id] > 0), gente = ass.reduce((t, o) => t + o.ass.estr[id], 0);
    if (gente) {
      const ok = await K.confirmar({ titulo: 'Tirar o estrato ' + s.nome + '?', ok: 'Tirar o estrato', perigo: true,
        texto: (gente === 1 ? 'A pessoa dele' : 'As ' + kit().fmt(gente, 0) + ' pessoas dele') + (ass.length === 1 ? ' (em ' + kit().nomeDe(ass[0], m) + ')' : ' (em ' + ass.length + ' assentamentos)') + ' saem junto: a população diminui. Dá para desfazer.' });
      if (!ok || !K.mesmoMapa(m.id)) return;
    }
    if (mudarEco('tirar o estrato ' + s.nome, e => { const n = e.estr.length; e.estr = e.estr.filter(x => x.id !== id); if (e.estr.length === n) return false; }) !== false) K.avisoDesfazer('O estrato ' + s.nome + ' saiu.');
  }
  function porEstratosProntos() {
    if (mudarEco('pôr os estratos de começo', e => {
      if (e.estr.length) return false;
      e.estr = N().estratosDeComeco(e.rec);
      const ids = new Set(e.estr.map(s => s.id));
      for (const n of e.niv) if (!Object.keys(n.dist || {}).length) n.dist = N().distDeComeco(n.id, ids);
    }) !== false) { estrAberto = true; kit().avisoDesfazer('Os 9 estratos de começo entraram.'); }
  }
  // a divisão por nível: quantos % de cada estrato o "Distribuir…" sugere em cada nível
  async function janelaDivisao() {
    const K = kit(), m = app().mapa;
    if (!ligada(m) || !m.eco.estr.length || !m.eco.niv.length) return;
    const v = await janelaTabela({ titulo: 'Divisão por nível', ok: 'Salvar', positivo: true,
      texto: 'Quantos % de cada estrato o "Distribuir…" sugere, em cada nível de assentamento. Não precisa somar 100: vale a proporção. Vazio ou zero: nenhum.',
      linhas: m.eco.niv, colunas: m.eco.estr, valores: Object.fromEntries(m.eco.niv.map(n => [n.id, n.dist])) });
    if (v == null || !K.mesmoMapa(m.id)) return;
    if (mudarEco('mudar a divisão por nível', e => {
      let mudou = false;
      for (const n of e.niv) { const d = v[n.id] || {}; if (JSON.stringify(n.dist || {}) !== JSON.stringify(d)) { n.dist = d; mudou = true; } }
      if (!mudou) return false;
    }) !== false) K.avisoDesfazer('Divisão por nível salva.');
  }

  /* ---------------- (parte 5b) as guildas da cidade ---------------- */
  const sinalI = n => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const naCasca = () => !!(window.TC && window.TC.ponte && window.TC.ponte.naCasca);
  // as fichas da mesa (para o líder): [{ id, nome }] — null fora de uma mesa
  function fichasDaMesa() {
    const A = app(), TC = window.TC;
    if (!A.naMesa || !TC || !TC.dados || !TC.dados.disponivel || !TC.dados.disponivel()) return null;
    const P = TC.dados.col('personagens');
    if (!P || typeof P.todas !== 'function') return null;
    if (!P.__reinoEspera) { P.__reinoEspera = true; Promise.resolve(P.pronta).then(() => kit().pintar(), () => {}); }
    const st = (TC.ponte && TC.ponte.estado) || {}, camp = st.campanha ? st.campanha.id : null;
    return P.todas().filter(l => l && !l.apagado && !(l.ficha && l.ficha.petDe) && (!camp || !l.campanha || l.campanha === camp)).map(l => ({ id: l.id, nome: l.nome || '' }));
  }
  const nomeDaFicha = id => { const fs = id ? fichasDaMesa() : null, f = fs && fs.find(x => x.id === id); return f ? f.nome || 'Sem nome' : ''; };
  function abrirFicha(id) { if (id && naCasca()) window.TC.ponte.ir('fichas', { pc: id }); }
  const maxGuildas = () => (N().LIMITES && N().LIMITES.guildas) || 12;
  function blocoGuildas(o, m) {
    const { h, nota, botao, linha } = kit(), gs = o.ass.guildas || [], out = [];
    out.push(h('small', { class: 'note eco-rot', 'data-k': 'o:' + o.id + ':guildas', text: 'Guildas' + (gs.length ? ' (' + gs.length + ')' : '') }));
    if (!gs.length) out.push(nota('Nenhuma guilda. As guildas da cidade (os caçadores, os ladrões, os magos…) não são clãs: cada cidade tem as suas.'));
    else out.push(h('div', { class: 'cons-lista' }, gs.map(g => linhaGuilda(o, m, g))));
    out.push(linha(botao('+ Guilda…', () => janelaGuilda(o.id, null), { c: 'sm', k: 'o:' + o.id + ':guilda-nova', off: gs.length >= maxGuildas() })));
    return out;
  }
  function linhaGuilda(o, m, g) {
    const { h, botao, glifo, X_SVG } = kit(), estr = m.eco.estr.find(s => s.id === g.estr), aqui = estr && o.ass.estr ? o.ass.estr[estr.id] || 0 : 0;
    const prod = txtTab(m, g.prod, false), gasto = txtTab(m, g.gasto, false), est = txtTab(m, g.est, false), lider = g.lider.nome || nomeDaFicha(g.lider.ficha);
    return h('div', { class: 'cons-li guilda', 'data-k': 'gd:' + g.id },
      h('span', { class: 'ico' }, glifoIc(g.ic, 20)),
      h('div', { class: 'tx' },
        h('b', null, g.nome, g.secreta ? h('span', { class: 'tag secreta', text: 'secreta' }) : null),
        h('small', { text: pl(g.membros, 'membro', 'membros') + (estr ? ' (' + estr.nome + ')' : '') + ' · ' + (lider ? 'líder: ' + lider : 'sem líder') }),
        estr && g.membros > aqui ? h('small', { class: 'gd-aviso', text: 'Mais membros que ' + estr.nome + ' nesta cidade (' + aqui + ').' }) : null,
        h('small', { text: 'Influência ' + sinalI(g.infl) + ' · relação com o grupo ' + sinalI(g.rel) }),
        h('small', { text: 'Por semana: ' + [prod ? 'produz ' + prod + ' (' + g.pct + '% para a facção)' : 'não produz', gasto ? 'gasta ' + gasto : ''].filter(Boolean).join(' · ') }),
        h('small', { text: 'Estoque da guilda: ' + (est || 'nada') }),
        g.serv.length ? h('small', { class: 'cons-ef', text: (g.serv.length === 1 ? 'Serviço: ' : 'Serviços: ') + g.serv.map(s => s.nome).join(', ') }) : null,
        h('div', { class: 'row cons-acoes' }, botao('Editar…', () => janelaGuilda(o.id, g.id), { c: 'sm', k: 'gd:' + g.id + ':editar' }),
          g.lider.ficha && naCasca() ? botao('Abrir a ficha', () => abrirFicha(g.lider.ficha), { c: 'sm', k: 'gd:' + g.id + ':ficha' }) : null)),
      h('button', { type: 'button', class: 'ib', 'data-k': 'gd:' + g.id + ':x', title: 'Tirar ' + g.nome, 'aria-label': 'Tirar a guilda ' + g.nome, onclick: () => tirarGuilda(o.id, g.id) }, glifo(X_SVG, 14)));
  }
  async function tirarGuilda(oId, gId) {
    const K = kit(), m = app().mapa, o = K.achar(m, oId), g = o && o.ass && (o.ass.guildas || []).find(x => x.id === gId);
    if (!g) return;
    const est = txtTab(m, g.est, false);
    const ok = await K.confirmar({ titulo: 'Tirar ' + g.nome + ' de ' + K.nomeDe(o, m) + '?', ok: 'Tirar a guilda', perigo: true,
      texto: (est ? 'O estoque dela (' + est + ') sai junto. ' : '') + 'Dá para desfazer.' });
    if (!ok || !K.mesmoMapa(m.id)) return;
    if (K.mudarObj(oId, 'tirar a guilda ' + g.nome, x => { const l = x.ass && x.ass.guildas; if (!l) return false; const n = l.length; x.ass.guildas = l.filter(y => y.id !== gId); if (x.ass.guildas.length === n) return false; if (!x.ass.guildas.length) delete x.ass.guildas; }) !== false) K.avisoDesfazer(g.nome + ' saiu de ' + K.nomeDe(o, m) + '.');
  }
  // criar (gId null) ou editar a guilda de uma cidade
  async function janelaGuilda(oId, gId) {
    const K = kit(), m = app().mapa, o = m && K.achar(m, oId);
    if (!o || !o.ass || !ligada(m)) return;
    const g = gId ? (o.ass.guildas || []).find(x => x.id === gId) : null;
    if (gId && !g) return;
    const v = await dialogoGuilda({ m, o, g, cat: false });
    if (!v || !K.mesmoMapa(m.id)) return;
    const ok = K.mudarObj(oId, g ? 'mudar a guilda ' + g.nome : 'pôr a guilda ' + v.nome, x => {
      if (!x.ass) return false;
      const l = x.ass.guildas || [];
      if (g) { const k = l.findIndex(y => y.id === g.id); if (k < 0 || JSON.stringify(l[k]) === JSON.stringify(Object.assign({ id: g.id }, v))) return false; l[k] = Object.assign({ id: g.id }, v); return; }
      if (l.length >= maxGuildas()) return false;
      x.ass.guildas = l.concat([Object.assign({ id: N().novoId('gd') }, v)]);
    });
    if (ok !== false) K.avisoDesfazer(g ? v.nome + ': salva.' : v.nome + ' agora é de ' + K.nomeDe(o, m) + '.');
  }
  // criar (id null) ou editar um modelo do catálogo de guildas
  async function janelaGuildaCat(id) {
    const K = kit(), m = app().mapa;
    if (!ligada(m)) return;
    const t = id ? m.eco.guildas.find(x => x.id === id) : null;
    if (id && !t) return;
    const v = await dialogoGuilda({ m, o: null, g: t, cat: true });
    if (!v || !K.mesmoMapa(m.id)) return;
    const ok = mudarEco(t ? 'mudar a guilda do catálogo ' + t.nome : 'criar a guilda do catálogo ' + v.nome, e => {
      if (t) { const k = e.guildas.findIndex(y => y.id === t.id); if (k < 0 || JSON.stringify(e.guildas[k]) === JSON.stringify(Object.assign({ id: t.id }, v))) return false; e.guildas[k] = Object.assign({ id: t.id }, v); return; }
      if (e.guildas.length >= ((N().LIMITES && N().LIMITES.guildasCatalogo) || 24)) return false;
      e.guildas.push(Object.assign({ id: N().novoId('gc') }, v));
    });
    if (ok !== false) { if (!t) gdAberto = true; K.avisoDesfazer(t ? v.nome + ': salva no catálogo.' : v.nome + ': entrou no catálogo.'); }
  }
  /* A janela de uma guilda: o nome, o ícone, se é secreta, o estrato dos membros e (na cidade) quantos, o líder (o nome e,
     numa mesa, uma ficha), a influência e a relação com o grupo; a descrição; por semana, o que produz e o que gasta, e
     quantos % vão para a facção (o resto fica no estoque da guilda — na cidade, o estoque também); os serviços. Na guilda
     nova de uma cidade, o modelo do catálogo enche os campos. → a guilda sem o id, ou null (cancelou). */
  let seqServ = 0;
  function dialogoGuilda({ m, o, g, cat }) {
    const { h, lerNum, fmtCampo, nomeDe, glifo, X_SVG } = kit(), recs = m.eco.rec, estrs = m.eco.estr, TIPOS = N().TIPOS_SERV || { contrato: 'Contrato', item: 'Item', info: 'Informação' };
    return new Promise(resolve => {
      const vazio = cat ? { nome: '', ic: 'salao', txt: '', estr: null, prod: {}, gasto: {}, pct: 50, serv: [], secreta: false } : R().guildaDoModelo(null, null);
      const base = g ? JSON.parse(JSON.stringify(g)) : vazio;
      const inp = (k, o2) => h('input', Object.assign({ type: 'text', 'data-k': k, autocomplete: 'off' }, o2 || {}));
      const opcoes = (k, lista) => h('select', { 'data-k': k }, lista.map(([v, t]) => h('option', { value: String(v), text: t })));
      const selModelo = !cat && !g && m.eco.guildas.length ? opcoes('gd:modelo', [['', 'Em branco']].concat(m.eco.guildas.map(t => [t.id, t.nome]))) : null;
      const nome = inp('gd:nome', { maxlength: 60, placeholder: 'Ex.: Guilda dos Caçadores' });
      const ic = opcoes('gd:ic', icones().map(i => [i.id, i.nome])), icVer = h('span', { class: 'ct-ic', 'aria-hidden': 'true' });
      const pintarIc = () => icVer.replaceChildren(glifoIc(ic.value, 24));
      ic.addEventListener('change', pintarIc);
      const secreta = h('input', { type: 'checkbox', 'data-k': 'gd:secreta' });
      const selEstr = opcoes('gd:estr', [['', 'Nenhum']].concat(estrs.map(s => [s.id, s.nome])));
      const membros = cat ? null : inp('gd:membros', { inputmode: 'numeric', placeholder: '0' });
      const notaMembros = h('small', { class: 'note', 'data-k': 'gd:membros-nota' });
      const quantos = id => (o && o.ass.estr && id ? o.ass.estr[id] || 0 : 0);
      const pintarMembros = () => {
        const s = estrs.find(x => x.id === selEstr.value);
        notaMembros.textContent = cat ? 'Os membros saem deste estrato (em cada cidade, no máximo as pessoas dele lá).' : s ? 'No máximo ' + quantos(s.id) + ' (as pessoas de ' + s.nome + ' em ' + nomeDe(o, m) + ').' : 'Escolha de qual estrato vêm os membros.';
      };
      selEstr.addEventListener('change', pintarMembros);
      const fichas = cat ? null : fichasDaMesa();
      const liderNome = cat ? null : inp('gd:lider', { maxlength: 60, placeholder: 'Ex.: Mestra Ilsa' });
      const selFicha = fichas ? opcoes('gd:ficha', [['', 'Nenhuma']].concat(fichas.map(f => [f.id, f.nome || 'Sem nome']))) : null;
      const escala = (k, a) => opcoes(k, Array.from({ length: 2 * a + 1 }, (_, i) => a - i).map(n => [n, sinalI(n)]));
      const infl = cat ? null : escala('gd:infl', 10), rel = cat ? null : escala('gd:rel', 10);
      const txt = h('textarea', { 'data-k': 'gd:txt', maxlength: 400, rows: 2, placeholder: 'Quem são, onde se reúnem, o que querem…' });
      const LINHAS = [['prod', 'Produz'], ['gasto', 'Gasta']].concat(cat ? [] : [['est', 'Estoque']]), ent = {};
      const tabela = h('div', { class: 'eco-tab-caixa' }, h('table', { class: 'eco-tab gd-tab' },
        h('thead', null, h('tr', null, h('th', { scope: 'col', text: '' }), recs.map(r => h('th', { scope: 'col' }, h('i', { style: { background: r.cor } }), h('span', { text: r.nome }))))),
        h('tbody', null, LINHAS.map(([k, rot]) => h('tr', { 'data-lin': k }, h('th', { scope: 'row', text: rot }),
          recs.map(r => h('td', null, ent[k + ':' + r.id] = inp('gd:' + k + ':' + r.id, { inputmode: 'decimal', class: 'in', placeholder: '0', 'aria-label': rot + ', ' + r.nome }))))))));
      const pct = inp('gd:pct', { inputmode: 'numeric', placeholder: '50' });
      const servs = h('div', { class: 'gd-servs', 'data-k': 'gd:servs' }), bServ = h('button', { type: 'button', class: 'btn sm', 'data-k': 'gd:serv-novo', text: '+ Serviço' });
      const maxS = (N().LIMITES && N().LIMITES.servicos) || 20;
      function linhaServ(s) {
        const n = ++seqServ, tipo = opcoes('gd:s' + n + ':tipo', Object.entries(TIPOS)), nm = inp('gd:s' + n + ':nome', { maxlength: 60, placeholder: 'Nome', 'aria-label': 'Nome do serviço' });
        const preco = inp('gd:s' + n + ':preco', { maxlength: 40, placeholder: 'Preço', 'aria-label': 'Preço do serviço' }), desc = inp('gd:s' + n + ':desc', { maxlength: 200, placeholder: 'Descrição (opcional)', 'aria-label': 'Descrição do serviço' });
        tipo.setAttribute('aria-label', 'Tipo do serviço'); tipo.value = s.tipo || 'contrato'; nm.value = s.nome || ''; preco.value = s.preco || ''; desc.value = s.desc || '';
        const li = h('div', { class: 'gd-serv', 'data-serv': String(n) }, tipo, nm, preco, desc);
        li.append(h('button', { type: 'button', class: 'ib', 'data-k': 'gd:s' + n + ':x', title: 'Tirar o serviço', 'aria-label': 'Tirar o serviço', onclick: () => { li.remove(); pintarServ(); } }, glifo(X_SVG, 14)));
        li._ler = () => ({ tipo: tipo.value, nome: nm.value.trim(), preco: preco.value.trim(), desc: desc.value.trim() });
        return li;
      }
      const pintarServ = () => { bServ.disabled = servs.children.length >= maxS; };
      bServ.addEventListener('click', () => { if (servs.children.length >= maxS) return; const li = linhaServ({}); servs.append(li); pintarServ(); li.querySelector('input').focus(); });
      // enche os campos com uma guilda (a de agora, a em branco ou a de um modelo)
      function preencher(b) {
        nome.value = b.nome || ''; ic.value = icones().some(i => i.id === b.ic) ? b.ic : 'salao'; pintarIc();
        secreta.checked = !!b.secreta; selEstr.value = b.estr && estrs.some(s => s.id === b.estr) ? b.estr : '';
        if (membros) membros.value = b.membros ? String(b.membros) : '';
        if (liderNome) liderNome.value = (b.lider && b.lider.nome) || '';
        if (selFicha) { const f = b.lider && b.lider.ficha; if (f && !fichas.some(x => x.id === f)) selFicha.append(h('option', { value: f, text: 'A ficha saiu da mesa' })); selFicha.value = f || ''; }
        if (infl) infl.value = String(b.infl || 0);
        if (rel) rel.value = String(b.rel || 0);
        txt.value = b.txt || '';
        for (const [k] of LINHAS) for (const r of recs) { const v = (b[k] || {})[r.id]; ent[k + ':' + r.id].value = v ? fmtCampo(v) : ''; }
        pct.value = String(b.pct == null ? 50 : b.pct);
        servs.replaceChildren(...(b.serv || []).map(linhaServ)); pintarServ();
        pintarMembros();
      }
      if (selModelo) selModelo.addEventListener('change', () => { const t = m.eco.guildas.find(x => x.id === selModelo.value); preencher(t ? R().guildaDoModelo(t, null) : vazio); });
      preencher(base);
      const titulo = h('h2', { text: cat ? (g ? 'Guilda do catálogo: ' + g.nome : 'Uma guilda nova no catálogo') : g ? 'Guilda: ' + g.nome : 'Uma guilda nova em ' + nomeDe(o, m) });
      titulo.id = 'dl-gd-' + Date.now().toString(36);
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'gd:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'gd:ok', text: g ? 'Salvar' : cat ? 'Criar' : 'Pôr a guilda' });
      const campo = (rot, el, cls) => h('label', cls ? { class: cls } : null, rot, el);
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        selModelo ? h('div', { class: 'lin gd-modelo' }, campo('Começar de um modelo do catálogo', selModelo)) : null,
        h('div', { class: 'lin ct-cab' }, campo('Nome', nome), campo('Ícone', ic), icVer),
        h('label', { class: 'op gd-secreta' }, secreta, h('span', { text: 'Secreta (os jogadores não sabem que ela existe)' })),
        h('div', { class: 'lin gd-membros' }, cat ? null : campo('Membros', membros), campo('De qual estrato', selEstr)), notaMembros,
        cat ? null : h('div', { class: 'lin gd-lider' }, campo('Líder', liderNome), selFicha ? campo('Ficha do líder (opcional)', selFicha) : null),
        cat ? null : (selFicha ? null : h('small', { class: 'note', text: 'Numa mesa, dá para ligar o líder a uma ficha das Fichas.' })),
        cat ? null : h('div', { class: 'lin gd-escalas' }, campo('Influência (só para ler)', infl), campo('Relação com o grupo', rel)),
        campo('Descrição', txt, 'gd-txt'),
        h('fieldset', { class: 'gd-semana' }, h('legend', { text: 'Por semana' + (cat ? '' : ' (e o estoque da guilda)') }), tabela,
          h('div', { class: 'lin gd-pct' }, campo('Vai para a facção (%)', pct), h('small', { class: 'note', text: 'Do que a guilda produz, esta parte vai para a facção dona da cidade; o resto fica no estoque da guilda. O que ela gasta sai do estoque dela.' }))),
        h('fieldset', { class: 'gd-serv-caixa' }, h('legend', { text: 'Serviços (contratos, itens, informações)' }), servs, h('div', { class: 'row' }, bServ)),
        err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl eco-dl gd-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      const inteiro = (t, a, b, msg) => { const s0 = String(t).trim(); const n = s0 === '' ? 0 : lerNum(s0); if (!Number.isInteger(n) || n < a || n > b) throw new Error(msg); return n; };
      form.addEventListener('input', () => { err.textContent = ''; });       // o aviso de erro some quando se mexe de novo
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          const n0 = nome.value.trim();
          if (!n0) throw new Error('Escreva o nome da guilda.');
          const estr = selEstr.value || null, out = { nome: n0, ic: ic.value, txt: txt.value.trim(), estr };
          if (!cat) {
            const max = quantos(estr), mb = inteiro(membros.value, 0, 1e6, 'Os membros: um número inteiro.');
            if (mb && !estr) throw new Error('Escolha de qual estrato vêm os membros.');
            if (mb > max) throw new Error('Os membros: no máximo ' + max + ' (as pessoas de ' + estrs.find(s => s.id === estr).nome + ' nesta cidade).');
            Object.assign(out, { membros: mb, lider: { nome: liderNome.value.trim(), ficha: selFicha && selFicha.value ? selFicha.value : (!selFicha && base.lider ? base.lider.ficha || null : null) }, infl: Number(infl.value) || 0, rel: Number(rel.value) || 0 });
          }
          for (const [k, rot] of LINHAS) {
            const t = {};
            for (const r of recs) {
              const s0 = ent[k + ':' + r.id].value.trim();
              if (!s0) continue;
              const x = lerNum(s0);
              if (!Number.isFinite(x) || x < 0 || x > 1e6) throw new Error(rot + ', ' + r.nome + ': use 0 ou mais (com vírgula, se quiser).');
              if (x) t[r.id] = Math.round(x * 100) / 100;
            }
            if (k === 'est') out.est = t; else out[k] = t;
          }
          out.pct = inteiro(pct.value === '' ? '50' : pct.value, 0, 100, 'A parte da facção: um número inteiro de 0 a 100.');
          const ord = {};                                      // a ordem das chaves é a da guilda normalizada
          for (const k of ['nome', 'ic', 'txt', 'estr', 'membros', 'lider', 'infl', 'rel', 'prod', 'gasto', 'pct', 'est']) if (k in out) ord[k] = out[k];
          ord.serv = [...servs.children].map(li => li._ler()).filter(s => s.nome).map((s, i) => Object.assign({ id: 'sv' + (i + 1) }, s));
          ord.secreta = secreta.checked;
          fim(ord);
        } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; }
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      (selModelo || nome).focus();
    });
  }
  // o catálogo de guildas, na Economia do mundo
  function linhaGuildaCat(m, t) {
    const { h, botao, glifo, X_SVG } = kit(), estr = m.eco.estr.find(s => s.id === t.estr), prod = txtTab(m, t.prod, false), gasto = txtTab(m, t.gasto, false);
    return h('div', { class: 'cons-li guilda', 'data-k': 'eco:g:' + t.id },
      h('span', { class: 'ico' }, glifoIc(t.ic, 20)),
      h('div', { class: 'tx' }, h('b', null, t.nome, t.secreta ? h('span', { class: 'tag secreta', text: 'secreta' }) : null),
        h('small', { text: [estr ? 'membros: ' + estr.nome : 'sem estrato', prod ? 'produz ' + prod + ' (' + t.pct + '% para a facção)' : 'não produz', gasto ? 'gasta ' + gasto : ''].filter(Boolean).join(' · ') }),
        t.serv.length ? h('small', { class: 'cons-ef', text: pl(t.serv.length, 'serviço', 'serviços') + ': ' + t.serv.map(s => s.nome).join(', ') }) : null,
        h('div', { class: 'row cons-acoes' }, botao('Editar…', () => janelaGuildaCat(t.id), { c: 'sm', k: 'eco:g:' + t.id + ':editar' }))),
      h('button', { type: 'button', class: 'ib', 'data-k': 'eco:g:' + t.id + ':x', title: 'Tirar ' + t.nome + ' do catálogo', 'aria-label': 'Tirar ' + t.nome + ' do catálogo', onclick: () => tirarGuildaCat(t.id) }, glifo(X_SVG, 14)));
  }
  function tirarGuildaCat(id) {
    const t = app().mapa.eco.guildas.find(x => x.id === id);
    if (t && mudarEco('tirar a guilda do catálogo', e => { const n = e.guildas.length; e.guildas = e.guildas.filter(x => x.id !== id); if (e.guildas.length === n) return false; }) !== false) kit().avisoDesfazer(t.nome + ' saiu do catálogo (as guildas das cidades continuam).');
  }
  function porGuildasProntas() {
    if (mudarEco('pôr as guildas prontas', (e, mm) => { if (e.guildas.length) return false; e.guildas = R().guildasProntas(mm, e); }) !== false) { gdAberto = true; kit().avisoDesfazer('As 8 guildas prontas entraram no catálogo.'); }
  }

  /* ---------------- (parte 5) a população do assentamento ---------------- */
  function blocoPopulacao(o, m) {
    const { h, botao, fmt } = kit(), a = o.ass, est = a.estr || {}, total = a.pop || 0;
    const com = m.eco.estr.filter(s => est[s.id] > 0), sem = total - com.reduce((t, s) => t + est[s.id], 0);
    return [h('div', { class: 'row pop-cab', 'data-k': 'o:' + o.id + ':pop-cab' }, h('b', { text: 'População: ' + pl(total, 'pessoa', 'pessoas') }), botao('População…', () => janelaPessoas(o.id), { c: 'sm', k: 'o:' + o.id + ':pop' })),
      total ? h('div', { class: 'pop-barra', 'data-k': 'o:' + o.id + ':pop-barra', 'aria-hidden': 'true' }, com.map(s => h('span', { 'data-estr': s.id, title: s.nome + ': ' + fmt(est[s.id], 0), style: { width: (100 * est[s.id] / total).toFixed(2) + '%', background: s.cor } }))) : null,
      com.length || sem > 0 ? h('small', { class: 'pop-lista', 'data-k': 'o:' + o.id + ':pop-lista', text: com.map(s => s.nome + ' ' + fmt(est[s.id], 0)).concat(sem > 0 ? ['sem estrato ' + fmt(sem, 0)] : []).join(' · ') }) : null];
  }
  async function janelaPessoas(oId) {
    const A = app(), K = kit(), m = A.mapa, o = m && K.achar(m, oId);
    if (!o || !o.ass || !ligada(m)) return;
    if (!m.eco.estr.length) { A.toast('Não há estratos no mundo: crie um (ou ponha os de começo) na Economia do mundo, na aba Reinos.'); return; }
    const v = await dialogoPessoas(m, o);
    if (!v || !K.mesmoMapa(m.id)) return;
    const total = Object.keys(v).reduce((t, k) => t + v[k], 0);
    const ok = K.mudarObj(oId, 'mudar a população', x => {
      if (!x.ass) return false;
      const ant = x.ass.estr || {};
      if (m.eco.estr.every(s => (ant[s.id] || 0) === (v[s.id] || 0)) && (x.ass.pop || 0) === total) return false;
      if (total) x.ass.estr = v; else delete x.ass.estr;
      x.ass.pop = total;
    });
    if (ok !== false) K.avisoDesfazer('A população de ' + K.nomeDe(o, m) + ': ' + pl(total, 'pessoa', 'pessoas') + '.');
  }
  /* A janela da população: as pessoas de cada estrato (com o que produzem por semana, na hora) e o "Distribuir", que
     enche os campos com a divisão sugerida de um total (nada muda até salvar). → { estrato: pessoas } ou null */
  function dialogoPessoas(m, o) {
    const { h, lerNum, nomeDe } = kit(), MAX = (N().LIMITES && N().LIMITES.pessoas) || 1e6;
    return new Promise(resolve => {
      const est = o.ass.estr || {}, nv = R().nivelDaDivisao(m, o.ass.niv);
      const titulo = h('h2', { text: 'A população de ' + nomeDe(o, m) });
      titulo.id = 'dl-pop-' + Date.now().toString(36);
      const linhas = m.eco.estr.map(s => {
        const inp = h('input', { type: 'text', inputmode: 'numeric', class: 'in', 'data-k': 'pop:' + s.id, value: est[s.id] ? String(est[s.id]) : '', placeholder: '0', autocomplete: 'off', 'aria-label': 'Pessoas: ' + s.nome });
        const prod = h('td', { class: 'pop-prod', 'data-k': 'pop:' + s.id + ':prod' });
        inp.addEventListener('input', () => atualizar());
        return { s, inp, prod, tr: h('tr', { 'data-estr': s.id }, h('th', { scope: 'row' }, h('i', { style: { background: s.cor } }), h('span', { text: s.nome })), h('td', null, inp), prod) };
      });
      const total = h('input', { type: 'text', inputmode: 'numeric', class: 'in', 'data-k': 'pop:total', value: o.ass.pop ? String(o.ass.pop) : '', placeholder: 'Ex.: 100', autocomplete: 'off', 'aria-label': 'Quantas pessoas distribuir' });
      const bDist = h('button', { type: 'button', class: 'btn sm', 'data-k': 'pop:distribuir', text: 'Distribuir' });
      const resumo = h('p', { class: 'pop-resumo', 'data-k': 'pop:resumo', 'aria-live': 'polite' }), err = h('p', { class: 'err', role: 'alert' });
      const lerTodos = () => {
        const out = {};
        for (const { s, inp } of linhas) {
          const t = inp.value.trim();
          if (!t) continue;
          const n = lerNum(t);
          if (!Number.isInteger(n) || n < 0 || n > MAX) throw new Error(s.nome + ': um número inteiro de 0 a ' + kit().fmt(MAX, 0) + '.');
          if (n) out[s.id] = n;
        }
        return out;
      };
      function atualizar() {
        let v = null;
        try { v = lerTodos(); err.textContent = ''; } catch (e) { err.textContent = e.message; }
        const soma = {};
        for (const { s, prod } of linhas) {
          const n = v ? v[s.id] || 0 : 0;
          prod.textContent = n ? txtTab(m, R().somar({}, s.prod, n), true) || '—' : '';
          if (n) R().somar(soma, s.prod, n);
        }
        const tot = v ? Object.keys(v).reduce((t, k) => t + v[k], 0) : 0;
        resumo.textContent = v ? 'Total: ' + pl(tot, 'pessoa', 'pessoas') + '. Por semana, pela população: ' + (txtTab(m, soma, true) || 'nada') + '.' : '';
      }
      bDist.addEventListener('click', () => {
        const t = lerNum(total.value.trim());
        if (!Number.isInteger(t) || t < 1 || t > MAX) { err.textContent = 'Para distribuir: um número inteiro de pessoas (de 1 a ' + kit().fmt(MAX, 0) + ').'; total.focus(); return; }
        const d = R().distribuir(m, o.ass.niv, t);
        for (const { s, inp } of linhas) inp.value = d[s.id] ? String(d[s.id]) : '';
        atualizar();
      });
      total.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); bDist.click(); } });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'pop:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'pop:ok', text: 'Salvar' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        nv ? h('div', { class: 'pop-dist' }, h('label', null, 'Distribuir', total), bDist,
          h('small', { class: 'note', 'data-k': 'pop:como', text: 'Pela divisão de ' + nv.nome + ': os números entram na tabela e nada muda até salvar.' }))
          : h('p', { class: 'note', 'data-k': 'pop:como', text: 'Sem uma divisão por nível para sugerir (na Economia do mundo, "Divisão por nível…"): escreva as pessoas de cada estrato.' }),
        h('div', { class: 'eco-tab-caixa' }, h('table', { class: 'eco-tab pop-tab' },
          h('thead', null, h('tr', null, h('th', { scope: 'col', text: 'Estrato' }), h('th', { scope: 'col', text: 'Pessoas' }), h('th', { scope: 'col', text: 'Por semana' }))),
          h('tbody', null, linhas.map(l => l.tr)))),
        resumo, err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl eco-dl pop-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      form.addEventListener('submit', ev => { ev.preventDefault(); try { fim(lerTodos()); } catch (e) { err.textContent = (e && e.message) || 'Confira os números.'; } });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      atualizar();
      document.body.append(dl);
      dl.showModal();
      (nv ? total : linhas[0].inp).focus();
    });
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
          if (o.positivo && n < 0) { err.textContent = l.nome + ', ' + c.nome + ': use 0 ou mais.'; ent[l.id + '\n' + c.id].focus(); return; }
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
    out.push(h('small', { class: 'note eco-rot', 'data-k': 'o:' + o.id + ':esp', text: 'Construções da cidade' + (e.total ? ' · ' + e.usados + ' de ' + pl(e.total, 'espaço', 'espaços') : '') }));
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
      obra = h('div', { class: 'cons-obra' }, h('span', { class: 'tag obra', text: 'obra do nível ' + c.obra.n }), h('span', { text: c.obra.sem === 1 ? 'falta' : 'faltam' }), sem, h('span', { text: c.obra.sem === 1 ? 'semana' : 'semanas' }));
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
    out.push(h('small', { class: 'note eco-rot', text: 'Construções do clã (da página Clã)' }));
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

  /* ---------------- (parte 4) a semana ---------------- */
  // a manutenção dos exércitos: quanto cada 10 soldados custam por semana (por tipo de tropa, e as unidades sem tipo)
  async function janelaManutencao() {
    const K = kit(), m = app().mapa;
    if (!ligada(m)) return;
    const linhas = [{ id: '_', nome: 'Sem tipo de tropa' }].concat((m.guerra ? m.guerra.tipos : []).map(t => ({ id: t.id, nome: t.nome })));
    const v = await janelaTabela({ titulo: 'Manutenção dos exércitos', ok: 'Salvar', positivo: true,
      texto: 'Quanto cada 10 soldados custam por semana para a facção do exército (menos de 10, ou um número quebrado, paga na proporção). Os tipos de tropa vêm da aba Guerra. Vazio ou zero: nada.',
      linhas, colunas: m.eco.rec, valores: Object.assign({ _: m.eco.manut0 }, m.eco.manut) });
    if (v == null || !K.mesmoMapa(m.id)) return;
    const m0 = v._ || {}, resto = Object.assign({}, v);
    delete resto._;
    if (mudarEco('mudar a manutenção dos exércitos', e => {
      if (JSON.stringify(e.manut0) === JSON.stringify(m0) && JSON.stringify(e.manut) === JSON.stringify(resto)) return false;
      e.manut0 = m0; e.manut = resto;
    }) !== false) K.avisoDesfazer('Manutenção dos exércitos salva.');
  }
  // as regras da falta: o que a prévia da semana propõe
  async function janelaRegras() {
    const K = kit(), m = app().mapa;
    if (!ligada(m)) return;
    const r = m.eco.regras, sn = [['sim', 'Sim'], ['nao', 'Não']];
    const v = await K.janela({ titulo: 'Regras da falta', ok: 'Salvar', texto: 'O que a prévia da semana propõe quando falta um recurso. Na prévia, você ainda escolhe o que vale.',
      campos: [
        { id: 'fome', rotulo: 'Sem comida: o apoio da facção cai (pontos, por semana)', tipo: 'number', valor: r.fome, min: 0, max: 100 },
        { id: 'moral', rotulo: 'Sem moeda: a moral de cada exército da facção cai', tipo: 'number', valor: r.moral, min: 0, max: 10 },
        { id: 'obras', rotulo: 'Sem moeda: as obras da facção param?', tipo: 'select', valor: r.obras ? 'sim' : 'nao', opcoes: sn },
        { id: 'outro', rotulo: 'Sem outro recurso: as construções que gastam dele param?', tipo: 'select', valor: r.outro ? 'sim' : 'nao', opcoes: sn },
        { id: 'moralOutro', rotulo: 'Sem outro recurso: a moral dos exércitos que o usam na manutenção cai', tipo: 'number', valor: r.moralOutro, min: 0, max: 10 }],
      ler: x => {
        const n = (k, a, b, nome) => { const v0 = Number(String(x[k]).trim() || 0); if (!(Number.isInteger(v0) && v0 >= a && v0 <= b)) throw new Error(nome + ': um número inteiro de ' + a + ' a ' + b + '.'); return v0; };
        return { fome: n('fome', 0, 100, 'O apoio'), moral: n('moral', 0, 10, 'A moral sem moeda'), obras: x.obras === 'sim', outro: x.outro === 'sim', moralOutro: n('moralOutro', 0, 10, 'A moral sem outro recurso') };
      } });
    if (!v || !K.mesmoMapa(m.id)) return;
    if (mudarEco('mudar as regras da falta', e => { if (JSON.stringify(e.regras) === JSON.stringify(v)) return false; e.regras = v; }) !== false) K.avisoDesfazer('Regras da falta salvas.');
  }
  // fechar a semana: a prévia (a primeira pendente); aplicar faz tudo num passo de Desfazer e abre a próxima, se houver
  let semanaAberta = false;
  async function janelaSemana() {
    const A = app(), m = A.mapa;
    if (semanaAberta || !A.podeEditar() || !ligada(m)) return;
    const clas = id => (A.infoDoCla ? A.infoDoCla(id) : null), prev = R().semanaPrevia(m, clas);
    if (!prev) { A.toast('Nenhuma semana para fechar agora.'); return; }
    // (parte 6) o resumo para o rascunho do Jornal (só com a facção dos jogadores): o que eles veem — a cidade no mapa e
    // aberta por dentro, o exército no mapa — sai pela projeção
    let jornal = null;
    if (A.temJornal && A.temJornal() && R().resumoDaSemana(m, prev, [], null)) {
      const noMapa = new Set(N().projetar(m, { clas }).objs.map(o => o.id));
      jornal = { ve: o => noMapa.has(o.id) && (o.k !== 'm' || R().verDentro(m, o)) };
    }
    semanaAberta = true;
    let res = null;
    // (lote 11, parte 3b) desmarcar o tributo ou uma troca refaz a prévia
    try { res = await dialogoSemana(m, prev, jornal, rec => R().semanaPrevia(m, clas, rec)); } finally { semanaAberta = false; }
    if (!res || !kit().mesmoMapa(m.id)) return;
    const ate = N().textoData(m.cal, prev.ate);
    let feito = null;
    const ok = A.mudar('fechar a semana', mm => { feito = R().aplicarSemana(mm, clas, res.recusadas, 'Semana até ' + ate, res.dipl); if (!feito) return false; });
    if (ok === false || !feito) return;
    const no = new Set(res.recusadas), prontas = feito.obras.filter(w => w.pronta || (w.parada && no.has('obras:' + w.fac) && w.sem0 <= 1)).length;
    // (parte 6) o resumo entra no rascunho do Jornal (o mestre revisa lá e publica); o Desfazer da semana tira, o Refazer põe de novo
    let jtxt = '';
    const r = jornal && res.jornal ? R().resumoDaSemana(m, feito, res.recusadas, jornal.ve) : null;
    if (r) {
      const mat = { id: 'mt_sem' + feito.n + '_' + Date.now().toString(36), tit: r.tit, txt: r.txt, ass: '', dest: false }, MAXM = (window.JornalNucleo.MAX || {}).materias || 30;
      let cheio = false;
      const por = () => A.mudarRascunhoJornal(jx => { if (jx.materias.some(x => x.id === mat.id)) return false; if (jx.materias.length >= MAXM) { cheio = true; return false; } jx.materias.push(Object.assign({}, mat)); });
      const tirar = () => A.mudarRascunhoJornal(jx => { const n0 = jx.materias.length; jx.materias = jx.materias.filter(x => x.id !== mat.id); if (jx.materias.length === n0) return false; });
      if (por()) { A.foraDoPasso({ desfazer: tirar, refazer: por }); jtxt = ' O resumo foi para o rascunho do Jornal.'; }
      else jtxt = ' O resumo não foi para o Jornal' + (cheio ? ': o rascunho já tem ' + MAXM + ' matérias.' : '.');
    }
    // (lote 11, parte 3b) os tratados que o mestre encerrou ou renovou
    const dec = res.dipl ? Object.values(res.dipl.tratados) : [], nE = dec.filter(x => x === 'encerrar').length, nR = dec.length - nE;
    const dtxt = nE || nR ? ' ' + [nE ? (nE === 1 ? '1 tratado encerrado' : nE + ' tratados encerrados') : '', nR ? (nR === 1 ? '1 tratado renovado' : nR + ' tratados renovados') : ''].filter(Boolean).join(' e ') + '.' : '';
    kit().avisoDesfazer('Semana fechada (até ' + ate + ').' + (prontas ? ' ' + (prontas === 1 ? '1 obra ficou pronta.' : prontas + ' obras ficaram prontas.') : '') + dtxt + jtxt);
    if (R().semanasPendentes(A.mapa) > 0) setTimeout(() => janelaSemana(), 400);
  }
  function dialogoSemana(m, prev, jornal, refazer) {
    const { h, nomeFac, facDe, fmt, nomeDe, achar } = kit();
    return new Promise(resolve => {
      const recs = m.eco.rec, cxs = [], papel = id => (recs.find(r => r.id === id) || {}).papel || '';
      const nomeR = id => (recs.find(r => r.id === id) || { nome: id }).nome, nomeG = id => { const g = achar(m, id); return g ? nomeDe(g, m) : 'o exército'; }, nomeF = id => { const f = facDe(m, id); return f ? nomeFac(f) : 'a facção'; };
      const titulo = h('h2', { text: 'Fechar a semana' });
      titulo.id = 'dl-sem-' + Date.now().toString(36);
      const mais = prev.pendentes - 1;
      const sub = h('p', { 'data-k': 'sem:quando', text: 'De ' + N().textoDataSemana(m.cal, prev.de) + ' a ' + N().textoDataSemana(m.cal, prev.ate) + '.' + (mais > 0 ? ' Depois desta, ' + (mais === 1 ? 'mais 1 semana' : 'mais ' + mais + ' semanas') + ' para fechar.' : '') + ' Nada muda até você aplicar.' });
      const n2 = v => fmt(v || 0, 2);
      /* (lote 11, parte 3b) com tributo ou trocas na semana, a coluna "Trocas" (o que chega menos o que sai). Desmarcar um
         deles refaz a prévia (prev): as facções e as linhas da prévia de começo (prev0) ficam no lugar */
      const prev0 = prev, comTroca = prev0.fluxos.length > 0, vazia = { est: {}, prod: {}, manut: {}, fica: {}, falta: {}, exe: [], paradas: [], envia: {}, recebe: {} };
      const temRec = q => r => q.est[r.id] || q.prod[r.id] || q.manut[r.id] || q.falta[r.id] || q.fica[r.id] || q.envia[r.id] || q.recebe[r.id];
      const blocos = () => prev0.fac.map(p0 => {
        const pf = prev.fac.find(x => x.id === p0.id) || Object.assign({ id: p0.id }, vazia), troca = r => Math.round(((pf.recebe[r.id] || 0) - (pf.envia[r.id] || 0)) * 100) / 100;
        const f = facDe(m, pf.id), ids = recs.filter(r => temRec(pf)(r) || temRec(p0)(r));
        const tab = h('table', { class: 'eco-tab sem-tab' },
          h('thead', null, h('tr', null, ['Recurso', 'Estoque', 'Produção', 'Manutenção'].concat(comTroca ? ['Trocas'] : [], ['Fica', 'Falta']).map((t, i) => h('th', { scope: 'col', class: i ? 'num' : null, text: t })))),
          h('tbody', null, ids.map(r => h('tr', { 'data-rec': r.id, class: pf.falta[r.id] ? 'falta' : null },
            h('th', { scope: 'row' }, h('i', { style: { background: r.cor } }), h('span', { text: r.nome })),
            h('td', { class: 'num', text: n2(pf.est[r.id]) }), h('td', { class: 'num', text: pf.prod[r.id] ? sinalN(pf.prod[r.id]) : '—' }),
            h('td', { class: 'num', text: pf.manut[r.id] ? '−' + fmt(pf.manut[r.id], 2) : '—' }), comTroca ? h('td', { class: 'num', 'data-k': 'sem:troca', text: troca(r) ? sinalN(troca(r)) : '—' }) : null,
            h('td', { class: 'num', text: n2(pf.fica[r.id]) }),
            h('td', { class: 'num', text: pf.falta[r.id] ? n2(pf.falta[r.id]) : '' })))));
        const exe = pf.exe.map(x => nomeG(x.id) + ' (' + txtTab(m, x.manut, false) + ')');
        const par = pf.paradas.map(x => { const o = achar(m, x.o), t = R().tipoDe(m, x.t); return (t ? t.nome : 'A construção') + (o ? ' (' + nomeDe(o, m) + ')' : '') + ' não produz nem gasta: falta ' + nomeR(x.r) + '.'; });
        return h('div', { class: 'sem-fac', 'data-k': 'sem:fac:' + pf.id }, h('div', { class: 'sem-cab' }, kit().bandeiraFac(pf.id, 14) || h('i', { style: { background: f ? f.cor : null } }), h('b', { text: f ? nomeFac(f) : pf.id })),
          ids.length ? h('div', { class: 'eco-tab-caixa' }, tab) : null,
          exe.length ? h('small', { class: 'sem-exe', text: 'Manutenção dos exércitos: ' + exe.join(' · ') + '.' }) : null,
          par.map(t => h('small', { class: 'sem-par', text: t })));
      });
      const txtCons = c => {
        if (c.tipo === 'fome') return 'Fome: o apoio de ' + nomeF(c.fac) + ' cai ' + c.d + ' (de ' + c.de + '% para ' + c.para + '%).';
        if (c.tipo === 'obras') { const pf = prev.fac.find(x => x.id === c.fac), ms = pf ? Object.keys(pf.falta).filter(id => papel(id) === 'moeda').map(nomeR) : [], k = prev.obras.filter(w => w.parada && w.fac === c.fac).length; return 'Sem ' + (ms.join(' e ') || 'moeda') + ': as obras de ' + nomeF(c.fac) + ' param esta semana' + (k ? ' (' + k + ')' : '') + '.'; }
        if (c.tipo === 'moral') return 'Sem moeda: a moral de ' + nomeG(c.g) + ' cai ' + c.d + ' (de ' + c.de + ' para ' + c.para + ').';
        return 'Sem ' + nomeR(c.r) + ': a moral de ' + nomeG(c.g) + ' cai ' + c.d + ' (de ' + c.de + ' para ' + c.para + ').';
      };
      const caixaFac = h('div', { class: 'sem-facs', 'data-k': 'sem:facs' }), pintarFac = () => caixaFac.replaceChildren(...blocos());
      const listaObras = h('ul', { class: 'sem-obras', 'data-k': 'sem:obras' });
      // (lote 11, parte 3b) a diplomacia: o tributo e as trocas (desmarcar refaz a prévia), os tratados e os motivos que vencem
      const dps = DP() ? DP().secSemana(m, prev, () => { prev = refazer(recusadas()) || prev; pintarFac(); dps.pintar(prev); pintarObras(); pintarJornal(); }) : null;
      const recusadas = () => cxs.filter(([, cb]) => !cb.checked).map(([id]) => id).concat(dps ? dps.recusados() : []);
      function pintarObras() {
        const no = new Set(recusadas());
        listaObras.replaceChildren(...prev.obras.map(w => {
          const o = achar(m, w.o), t = R().tipoDe(m, w.t), parada = w.parada && !no.has('obras:' + w.fac), sem1 = parada ? w.sem0 : Math.max(0, w.sem0 - 1);
          return h('li', { 'data-k': 'sem:obra:' + w.c, class: parada ? 'parada' : sem1 === 0 ? 'pronta' : null },
            (t ? t.nome : 'Obra') + (w.n > 1 ? ' (nível ' + w.n + ')' : '') + (o ? ' em ' + nomeDe(o, m) : '') + ': ' + (parada ? 'parada (falta moeda)' : sem1 === 0 ? 'fica pronta' : sem1 === 1 ? 'falta 1 semana' : 'faltam ' + sem1 + ' semanas'));
        }));
      }
      // (parte 6) o resumo para o rascunho do Jornal: só o que é da facção dos jogadores; a prévia acompanha as recusas
      const cxJ = jornal ? h('input', { type: 'checkbox', 'data-k': 'sem:jornal', checked: true }) : null, txtJ = jornal ? h('div', { class: 'sem-jornal-txt', 'data-k': 'sem:jornal:txt' }) : null;
      function pintarJornal() {
        if (!txtJ) return;
        const r = R().resumoDaSemana(m, prev, recusadas(), jornal.ve);
        txtJ.replaceChildren(...(r ? [h('b', { text: r.tit })].concat(r.txt.split('\n\n').map(p => h('p', { text: p.replace(/\*\*/g, '') }))) : []));
      }
      const cons = prev.cons.map(c => { const cb = h('input', { type: 'checkbox', 'data-k': 'sem:c:' + c.id, checked: true, onchange: () => { pintarObras(); pintarJornal(); } }); cxs.push([c.id, cb]); return h('label', { class: 'op sem-cons' }, cb, h('span', { text: txtCons(c) })); });
      pintarFac(); pintarObras(); pintarJornal();
      const bNao = h('button', { type: 'button', class: 'btn', text: 'Agora não' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'sem:aplicar', text: 'Aplicar a semana' });
      const err = h('p', { class: 'err', role: 'alert', 'data-k': 'sem:err' });
      const form = h('form', { class: 'dl', novalidate: true }, titulo, sub,
        prev0.fac.length ? caixaFac : h('p', { class: 'note', text: 'Nada muda nos estoques nesta semana.' }),
        dps ? dps.fluxos : null,
        cons.length ? h('fieldset', { class: 'sem-conss' }, h('legend', { text: 'O que a falta traz (desmarque o que não vale)' }), cons) : null,
        prev.obras.length ? h('div', { class: 'sem-obras-caixa' }, h('small', { class: 'note', text: 'As obras' }), listaObras) : null,
        dps ? dps.vencem : null, dps ? dps.motivos : null,
        (prev.lembretes || []).length ? h('div', { class: 'sem-lemb-caixa' }, h('small', { class: 'note', text: 'Lembretes dos estratos (nada muda sozinho)' }),
          h('ul', { class: 'sem-lemb', 'data-k': 'sem:lembretes' }, prev.lembretes.map(l => {
            const o = achar(m, l.o), nomeE = id => (m.eco.estr.find(s => s.id === id) || { nome: id }).nome;
            return h('li', { 'data-k': 'sem:lemb:' + l.o }, h('b', { text: (o ? nomeDe(o, m) : 'Assentamento') + (l.fac ? ' (' + nomeF(l.fac) + ')' : '') + ': ' }),
              h('span', { text: l.itens.map(x => nomeE(x.estr) + ' (' + kit().fmt(x.n, 0) + '): ' + x.txt).join(' · ') }));
          }))) : null,
        (prev.guildas || []).length ? h('div', { class: 'sem-gd-caixa' }, h('small', { class: 'note', text: 'As guildas (o estoque de cada uma)' }),
          h('ul', { class: 'sem-gd', 'data-k': 'sem:guildas' }, prev.guildas.map(w => {
            const o = achar(m, w.o), g = o && o.ass && (o.ass.guildas || []).find(x => x.id === w.g), t = x => txtTab(m, x, false), faltou = Object.keys(w.falta).length > 0;
            const partes = [t(w.paraGuilda) ? 'recebe ' + t(w.paraGuilda) : '', t(w.paraFac) ? t(w.paraFac) + ' para ' + (w.fac ? nomeF(w.fac) : 'ninguém') : '', t(w.gasto) ? 'gasta ' + t(w.gasto) : ''].filter(Boolean);
            return h('li', { 'data-k': 'sem:gd:' + w.g, class: faltou ? 'falta' : null }, h('b', { text: (g ? g.nome : 'Guilda') + (o ? ' (' + nomeDe(o, m) + ')' : '') + ': ' }),
              h('span', { text: partes.concat(['o estoque fica ' + (t(w.fica) || 'vazio')]).join(' · ') + (faltou ? ' · ' : '.') }),
              faltou ? h('span', { class: 'gd-falta', text: 'falta ' + t(w.falta) + ' (o estoque fica em zero).' }) : null);
          }))) : null,
        jornal ? h('div', { class: 'sem-jornal', 'data-k': 'sem:jornal-caixa' },
          h('label', { class: 'op' }, cxJ, h('span', { text: 'Mandar o resumo da semana para o rascunho do Jornal' })),
          h('small', { class: 'note', text: 'Só o que é da facção dos jogadores: o saldo, as obras prontas nas cidades que eles veem por dentro e o que a falta trouxe. Você revisa no Jornal antes de publicar.' }),
          h('details', { class: 'sem-jornal-ver', 'data-k': 'sem:jornal:ver' }, h('summary', { text: 'Ver o resumo' }), txtJ)) : null,
        err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl eco-dl sem-dl', 'aria-labelledby': titulo.id }, form);
      let feito = false;
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      form.addEventListener('input', () => { err.textContent = ''; });
      form.addEventListener('submit', ev => {
        ev.preventDefault();
        let dipl = null;
        try { dipl = dps ? dps.ler() : null; } catch (e) { err.textContent = (e && e.message) || 'Confira o que foi escrito.'; return; }
        fim({ recusadas: recusadas(), jornal: !!(cxJ && cxJ.checked), dipl });
      });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      document.body.append(dl);
      dl.showModal();
      bOk.focus();
    });
  }
  // a prévia abre sozinha quando o calendário passa de domingo para segunda (por uma mudança deste mestre)
  let pendVistas = null, iniciado = false;
  function iniciar(A) {
    if (iniciado || !A || typeof A.on !== 'function') return;
    iniciado = true;
    A.on('muda', info => {
      const m = A.mapa, p = m && A.podeEditar() && ligada(m) ? R().semanasPendentes(m) : 0, antes = pendVistas;
      pendVistas = p;
      if (info && info.origem === 'local' && antes != null && p > antes) setTimeout(() => janelaSemana(), 0);
    });
  }

  /* ---------------- a bandeira própria da facção (sem clã) ---------------- */
  // a luminância de uma cor (#rrggbb), de 0 (preto) a 1 (branco)
  function luz(c) {
    const m0 = /^#([0-9a-f]{6})$/i.exec(c || '');
    if (!m0) return 0;
    const n = parseInt(m0[1], 16), lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  }
  // a bandeira de começo: um estandarte partido na cor da facção e no dourado (ou, numa cor clara, no azul-escuro)
  function bandeiraNova(f) {
    const c1 = /^#[0-9a-f]{6}$/i.test(f.cor || '') ? f.cor.toLowerCase() : '#3f7fbf';
    return { forma: 'estandarte', div: 'partido', cores: [c1, luz(c1) < 0.4 ? '#d9a441' : '#24305e'], simb: null, img: null };
  }
  // uma imagem pequena para a bandeira: PNG (pode ter fundo transparente), com até `lado` px no lado maior
  async function imagemPequena(arq, lado) {
    if (!arq || !/^image\/(png|jpeg|webp)$/.test(arq.type || '')) throw new Error('Escolha uma imagem PNG, JPG ou WebP.');
    let fonte = null, w = 0, hh = 0, u = '';
    try {
      try { fonte = await createImageBitmap(arq); w = fonte.width; hh = fonte.height; }
      catch (e) {
        u = URL.createObjectURL(arq);
        fonte = await new Promise((ok, falha) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => falha(new Error('Não deu para ler esta imagem.')); im.src = u; });
        w = fonte.naturalWidth; hh = fonte.naturalHeight;
      }
      if (!w || !hh) throw new Error('Não deu para ler esta imagem.');
      const k = Math.min(1, lado / Math.max(w, hh)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(hh * k));
      cv.getContext('2d').drawImage(fonte, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      if (!blob) throw new Error('Não deu para preparar esta imagem.');
      return blob;
    } finally {
      if (fonte && typeof fonte.close === 'function') { try { fonte.close(); } catch (e) { /* já fechada */ } }
      if (u) URL.revokeObjectURL(u);
    }
  }
  /* A janela da bandeira de uma facção: o mesmo editor do brasão do Clã (a forma, a divisão, as duas cores, o símbolo — ou,
     numa mesa, uma imagem). Mexe numa cópia (a prévia mostra); "Criar a bandeira" (ou "Salvar") vale num passo de
     Desfazer. Com um clã ligado à facção, vale a bandeira do clã: a própria fica guardada. */
  async function janelaBandeira(fid) {
    const A = app(), K = kit(), m = A.mapa;
    if (!A.podeEditar() || !window.ClaNucleo || !m) return;
    const f = K.facDe(m, fid);
    if (!f) return;
    const v = await dialogoBandeira(f, A.brasoes instanceof Map && A.brasoes.has(fid));
    if (!v || !K.mesmoMapa(m.id)) return;
    const nova = !f.band;
    const ok = A.mudar(nova ? 'criar a bandeira da facção' : 'mudar a bandeira da facção', mm => {
      const x = K.facDe(mm, fid);
      if (!x || (x.band && JSON.stringify(x.band) === JSON.stringify(v))) return false;
      x.band = v;
    });
    if (ok !== false) K.avisoDesfazer('A bandeira de ' + K.nomeFac(f) + (nova ? ' está pronta.' : ' mudou.'));
  }
  let seqBand = 0;
  // (lote 11) o mesmo editor serve ao brasão de uma casa: o = { titulo, criar } (os textos da janela)
  function dialogoBandeira(f, doCla, o) {
    const { h, glifo, nomeFac } = kit(), C = window.ClaNucleo, A = app(), NS = 'http://www.w3.org/2000/svg';
    const naMesa = !!(A.naMesa && window.TC && window.TC.arquivos && typeof window.TC.arquivos.subir === 'function');
    return new Promise(resolve => {
      const b = JSON.parse(JSON.stringify(f.band || bandeiraNova(f))), nova = !f.band;
      let alvo = 0, enviando = false, feito = false;
      const titulo = h('h2', { text: (o && o.titulo) || 'A bandeira de ' + nomeFac(f) });
      titulo.id = 'dl-band-' + Date.now().toString(36);
      const previa = h('div', { class: 'band-previa', 'data-k': 'band:previa', 'aria-hidden': 'true' });
      // cada escolha muda a cópia e a prévia (nada muda no mapa até "Criar a bandeira" ou "Salvar")
      const esc = (attrs, conteudo, fn) => { const el = h('button', Object.assign({ type: 'button', class: 'band-esc' }, attrs), conteudo); el.addEventListener('click', () => { fn(); atualizar(); }); return el; };
      const svgForma = d => { const s0 = document.createElementNS(NS, 'svg'), p = document.createElementNS(NS, 'path'); s0.setAttribute('width', '24'); s0.setAttribute('height', '28'); s0.setAttribute('viewBox', '0 0 100 120'); s0.setAttribute('aria-hidden', 'true'); p.setAttribute('d', d); p.setAttribute('fill', 'currentColor'); s0.append(p); return s0; };
      const bFormas = C.FORMAS.map(fm => esc({ 'data-forma': fm.id, title: fm.nome, 'aria-label': fm.nome }, svgForma(fm.d), () => { b.forma = fm.id; }));
      const bDivs = C.DIVISOES.map(([d, nm]) => esc({ 'data-div': d }, nm, () => { b.div = d; }));
      const amostras = [0, 1].map(() => h('span', { class: 'band-am' }));
      const bAlvos = [0, 1].map(i => esc({ 'data-alvo': String(i) }, [amostras[i], 'Cor ' + (i + 1)], () => { alvo = i; }));
      const paleta = (C.CORES.includes(f.cor) ? [] : [f.cor]).concat(C.CORES);
      const bCores = paleta.map(c => { const rot = c === f.cor ? 'A cor da facção' : 'Cor ' + c; return esc({ class: 'band-esc cor', 'data-cor': c, title: rot, 'aria-label': rot }, h('span', { style: { background: c } }), () => { b.cores[alvo] = c; }); });
      const outra = h('input', { type: 'color', 'data-k': 'band:outra', 'aria-label': 'Outra cor' });
      outra.addEventListener('change', () => { b.cores[alvo] = String(outra.value).toLowerCase(); atualizar(); });
      const bSimbs = [esc({ class: 'band-esc nenhum', 'data-simb': '' }, 'Nenhum', () => { b.simb = null; })]
        .concat([...C.SIMBOLOS.values()].map(s0 => esc({ 'data-simb': s0.id, title: s0.nome, 'aria-label': s0.nome }, glifo('<path d="' + s0.d + '"/>', 22), () => { b.simb = s0.id; })));
      // a imagem (numa mesa): vai para o banco e volta o endereço; "Voltar ao desenho" tira
      const arquivo = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', 'data-k': 'band:arquivo', 'aria-label': 'A imagem da bandeira' });
      arquivo.hidden = true;
      const bImg = h('button', { type: 'button', class: 'btn sm', 'data-k': 'band:img' }), bSemImg = h('button', { type: 'button', class: 'btn sm', 'data-k': 'band:sem-img', text: 'Voltar ao desenho' });
      const notaImg = h('small', { class: 'band-nota', 'data-k': 'band:img-nota' });
      bImg.addEventListener('click', () => { arquivo.value = ''; arquivo.click(); });
      bSemImg.addEventListener('click', () => { b.img = null; atualizar(); });
      arquivo.addEventListener('change', async () => {
        const arq = arquivo.files && arquivo.files[0];
        if (!arq || enviando) return;
        enviando = true; err.textContent = ''; atualizar();
        try { const url = await window.TC.arquivos.subir(await imagemPequena(arq, 480)); if (!feito) b.img = url; }
        catch (e) { err.textContent = (e && e.message) || 'Não deu para usar esta imagem.'; }
        finally { enviando = false; if (!feito) atualizar(); }
      });
      const err = h('p', { class: 'err', role: 'alert' });
      const bNao = h('button', { type: 'button', class: 'btn', 'data-k': 'band:nao', text: 'Cancelar' }), bOk = h('button', { type: 'submit', class: 'btn pri', 'data-k': 'band:ok', text: nova ? (o && o.criar) || 'Criar a bandeira' : 'Salvar' });
      function atualizar() {
        const marcar = (el, sim) => el.setAttribute('aria-pressed', String(!!sim));
        bFormas.forEach((el, i) => marcar(el, C.FORMAS[i].id === b.forma));
        bDivs.forEach((el, i) => marcar(el, C.DIVISOES[i][0] === b.div));
        bAlvos.forEach((el, i) => marcar(el, i === alvo));
        amostras.forEach((sw, i) => { sw.style.background = b.cores[i]; });
        bCores.forEach((el, i) => marcar(el, paleta[i] === b.cores[alvo]));
        outra.value = b.cores[alvo];
        bSimbs.forEach((el, i) => marcar(el, i ? el.dataset.simb === b.simb : !b.simb));
        if (b.img) previa.replaceChildren(h('img', { src: b.img, alt: '' }));
        else previa.innerHTML = C.brasaoSvg(b, 'bd' + (++seqBand));          // o desenho do núcleo do Clã: só números e cores conferidos
        bImg.textContent = b.img ? 'Trocar a imagem…' : 'Usar uma imagem…';
        bImg.hidden = !naMesa; bImg.disabled = enviando; bSemImg.hidden = !b.img; bSemImg.disabled = enviando; bOk.disabled = enviando;
        notaImg.textContent = enviando ? 'Enviando a imagem…' : b.img ? 'Com a imagem, a forma, as cores e o símbolo ficam guardados para quando voltar ao desenho.'
          : naMesa ? 'Ou use uma imagem (PNG, JPG ou WebP): ela fica no lugar do desenho.' : 'Uma imagem no lugar do desenho só dá para usar numa mesa.';
      }
      const campo = (rot, ...filhos) => h('div', { class: 'band-campo' }, h('span', { class: 'band-rot', text: rot }), ...filhos);
      const grupo = (rot, filhos, cls) => h('div', { class: cls || 'band-escolhas', role: 'group', 'aria-label': rot }, filhos);
      const form = h('form', { class: 'dl', novalidate: true }, titulo,
        doCla ? h('p', { class: 'band-cla', 'data-k': 'band:cla', text: 'Esta facção tem um clã ligado: no mapa vale a bandeira dele (o brasão, na aba Clã). Esta fica guardada e volta a valer se o clã deixar a facção.' }) : null,
        h('div', { class: 'band-ed' }, previa,
          h('div', { class: 'band-campos' },
            campo('Forma', grupo('Forma', bFormas)), campo('Divisão', grupo('Divisão', bDivs)),
            campo('Cores (escolha qual e depois a cor)', grupo('Qual cor', bAlvos), grupo('A cor', [bCores, h('label', { class: 'band-esc band-outra' }, 'Outra', outra)])),
            campo('Símbolo', grupo('Símbolo', bSimbs, 'band-simbolos')),
            h('div', { class: 'row band-img' }, bImg, bSemImg, arquivo), notaImg)),
        err, h('div', { class: 'pe' }, bNao, bOk));
      const dl = h('dialog', { class: 'mundo-dl band-dl', 'aria-labelledby': titulo.id }, form);
      const fim = v => { if (feito) return; feito = true; try { if (dl.open) dl.close(); } catch (e) { /* já fechada */ } dl.remove(); resolve(v); };
      form.addEventListener('submit', ev => { ev.preventDefault(); if (!enviando) fim(JSON.parse(JSON.stringify(b))); });
      bNao.addEventListener('click', () => fim(null));
      dl.addEventListener('close', () => fim(null));
      dl.addEventListener('keydown', ev => ev.stopPropagation());
      atualizar();
      document.body.append(dl);
      dl.showModal();
      (bFormas.find(el => el.getAttribute('aria-pressed') === 'true') || bOk).focus();
    });
  }

  /* ---------------- o Livro do reino (na aba Reinos) ---------------- */
  function secLivro(v) {
    const { h, nota, secao, fmt, plural, nomeFac, facDe, bandeiraFac } = kit();
    if (!R() || !v) return null;
    const L = R().livroDoReino(v), out = [];
    // (parte 2) com a economia: o que cada facção produz por semana e o estoque (os recursos do mundo nela)
    const eco = ligada(v) ? v.eco : null, prod = eco ? R().producaoPorFaccao(v, id => (app().infoDoCla ? app().infoDoCla(id) : null)) : null;
    const txtRec = t => eco.rec.filter(r => t[r.id]).map(r => r.nome + ' ' + (t[r.id] > 0 ? '' : '−') + fmt(Math.abs(t[r.id]), 2)).join(' · ');
    const linha = (l, nome, cor, f) => h('div', { class: 'livro-li', 'data-k': 'livro:' + (l.fac || '-') },
      (f && bandeiraFac(f.id, 14)) || h('i', { class: cor ? '' : 'sem', style: cor ? { background: cor } : null }), h('b', { text: nome }),
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

  /* ---------------- (parte 6) o que os jogadores veem ---------------- */
  /* Para quem joga, na aba Reinos: a linha da facção deles no Livro do reino (as províncias, as sub-regiões, os
     hexágonos e os exércitos que eles veem; o que produz por semana e o estoque) e, ao abrir "De onde vem", cada recurso
     com as fontes, a manutenção dos exércitos e a produção por província. Vem pronto na projeção (v.ecoJ). */
  const FONTES_J = [['terreno', 'terreno'], ['pop', 'população'], ['cons', 'construções'], ['guilda', 'guildas'], ['cla', 'sede do clã'], ['mestre', 'outras fontes']];
  const abertosJ = new Set();                // o que quem joga deixou aberto (só nesta página: o painel se refaz a cada mudança)
  function secLivroJog(v) {
    const e = v && v.ecoJ, K = kit();
    if (!e) return null;
    const { h, nota, secao, plural, nomeFac, facDe, bandeiraFac, fmt } = K, f = facDe(v, e.fac);
    if (!f) return null;
    // "Lapros 12 · Suprimentos −3" (com sinal: "+12")
    const txt = (t, sinal) => e.rec.filter(r => t && t[r.id]).map(r => r.nome + ' ' + (sinal ? sinalN(t[r.id]) : (t[r.id] > 0 ? '' : '−') + fmt(Math.abs(t[r.id]), 2))).join(' · ');
    const l = e.livro;
    const linhaL = h('div', { class: 'livro-li', 'data-k': 'livro:' + f.id },
      bandeiraFac(f.id, 14) || h('i', { style: { background: f.cor } }), h('b', { text: nomeFac(f) }),
      h('small', { text: [plural(l.prov, 'província', 'províncias'), plural(l.sub, 'sub-região', 'sub-regiões'), l.grade ? plural(l.hex, 'hexágono', 'hexágonos') : null,
        l.exe ? plural(l.exe, 'exército', 'exércitos') : null].filter(Boolean).join(' · ') }),
      h('small', { class: 'livro-prod', text: 'Produz por semana: ' + (txt(e.prod.total) || 'nada') }),
      h('small', { class: 'livro-est', text: 'Estoque: ' + (txt(e.est) || 'nada') }));
    const porRec = e.rec.filter(r => e.prod.total[r.id]).map(r => h('div', { class: 'prod-li', 'data-rec': r.id },
      h('i', { style: { background: r.cor } }), h('b', { text: r.nome + ' ' + sinalN(e.prod.total[r.id]) }),
      h('small', { text: FONTES_J.filter(([k]) => e.prod[k][r.id]).map(([k, t0]) => t0 + ' ' + sinalN(e.prod[k][r.id])).join(' · ') })));
    const manut = txt(e.manut);
    // (lote 11, parte 3b) o tributo e as trocas deles, por semana (com o sinal: o que sai, o que chega)
    const com = id => { const g = id ? facDe(v, id) : null; return g ? nomeFac(g) : 'outra facção'; }, recN = id => (e.rec.find(r => r.id === id) || { nome: id }).nome;
    const trocas = e.trocas.map(x => (x.tipo === 'trib' ? 'tributo ' + (x.sentido === 'envia' ? 'a ' : 'de ') : 'troca com ') + com(x.com) + ': ' + (x.sentido === 'envia' ? '−' : '+') + fmt(x.q, 2) + ' ' + recN(x.rec));
    const provs = e.prov.map(p => h('div', { class: 'prod-li', 'data-k': 'livro:j:p:' + (p.id || '-') },
      h('i', { class: 'sem' }), h('b', { text: p.id ? p.nome || 'Província sem nome' : 'Outras terras' }), h('small', { text: txt(p.prod.total, true) || 'nada' })));
    const det = h('details', { class: 'eco-jog', 'data-k': 'livro:j:de-onde', open: abertosJ.has('de-onde') || null },
      h('summary', { text: 'De onde vem', onclick: function (ev) { ev.preventDefault(); const d = this.parentNode, abrir = !d.open; if (abrir) abertosJ.add('de-onde'); else abertosJ.delete('de-onde'); d.open = abrir; } }),
      h('div', { class: 'prov-prod', 'data-k': 'livro:j:fontes' }, h('small', { class: 'note', text: 'Produção por semana, por fonte' }), porRec.length ? porRec : nota('Nada por enquanto.')),
      manut ? h('p', { class: 'note', 'data-k': 'livro:j:manut', text: 'Manutenção dos exércitos, por semana: ' + manut + ' (sai do estoque quando a semana fecha).' }) : null,
      trocas.length ? h('p', { class: 'note', 'data-k': 'livro:j:trocas', text: 'Tributo e trocas, por semana: ' + trocas.join(' · ') + ' (quando a semana fecha).' }) : null,
      provs.length ? h('div', { class: 'prov-prod', 'data-k': 'livro:j:provs' }, h('small', { class: 'note', text: 'Por província' }), provs) : null);
    return secao('Livro do reino', linhaL, det, nota('Só a facção de vocês. O estoque muda quando a semana fecha.'));
  }
  /* Para quem joga, na cidade que o mestre abriu (a leitura do marcador): o nível, a população (o total), as construções
     prontas e as guildas que não são secretas, com a descrição e os serviços (com o preço). Vem pronto na projeção
     (o.dentro). */
  function leituraDentro(o) {
    const d = o && o.dentro;
    if (!d) return null;
    const { h, secao } = kit(), out = [], TS = N().TIPOS_SERV || {};
    const cab = [d.nivel, d.pop ? pl(d.pop, 'pessoa', 'pessoas') : ''].filter(Boolean).join(' · ');
    if (cab) out.push(h('p', { class: 'dt-cab', 'data-k': 'ler:dt:cab', text: cab }));
    if (d.cons.length) out.push(h('div', { class: 'dt-cons', 'data-k': 'ler:dt:cons' }, h('small', { class: 'note', text: 'Construções' }),
      h('ul', null, d.cons.map((c, i) => h('li', { 'data-k': 'ler:dt:c:' + i }, glifoIc(c.ic, 16), h('span', { text: c.nome + ' · nível ' + c.n }))))));
    if (d.guildas.length) out.push(h('div', { class: 'dt-gds', 'data-k': 'ler:dt:gds' }, h('small', { class: 'note', text: 'Guildas' }),
      d.guildas.map(g => h('div', { class: 'dt-gd', 'data-k': 'ler:dt:g:' + g.id },
        h('div', { class: 'dt-gd-cab' }, glifoIc(g.ic, 18), h('b', { text: g.nome })),
        g.txt ? h('p', { class: 'publico', text: g.txt }) : null,
        g.serv.length ? h('ul', { class: 'dt-serv' }, g.serv.map(s => h('li', { 'data-k': 'ler:dt:s:' + g.id + ':' + s.id },
          h('span', { class: 'tag', text: TS[s.tipo] || 'Serviço' }), ' ', h('b', { text: s.nome }), s.preco ? h('span', { class: 'preco', text: ' · ' + s.preco }) : null,
          s.desc ? h('small', { text: s.desc }) : null))) : null))));
    return out.length ? secao('O que tem dentro', out) : null;
  }

  window.MundoReinoPainel = { secProvincia, secLivro, secEconomia, secAssentamento, janelaTerreno, ligar, janelaObra, janelaTipo, icones, janelaEstrato, janelaDivisao, janelaPessoas, janelaGuilda, janelaGuildaCat,
    janelaSemana, janelaManutencao, janelaRegras, iniciar, janelaBandeira, secLivroJog, leituraDentro,
    dialogoBandeira, fichasDaMesa, nomeDaFicha, abrirFicha };       // (lote 11) para a corte (mundo/corte-painel.js)
})();
