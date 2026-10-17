/* Tiny Cats · Acampamento: a lógica pura (sem página, sem DOM).
   O modelo do acampamento, os efeitos da estrutura, as provisões e a conta do descanso. Roda igual no navegador
   (window.AcampNucleo) e no Node (testes).

   O acampamento da mesa:
     nome, hora ('entardecer' | 'noite' | 'amanhecer'), fundo ({ url } | null), cena (id da cena tática | null)
     presentes [idDoPersonagem], autoVistos [ids já chamados sozinhos], lugares { id: { x, y } } (em % do palco)
     roda [{ id, nome, img, dono, emo? }] — quem está em volta da fogueira, do jeito que os jogadores podem ver
     provisoes [{ id, nome, qtd, ef, fx, todos }]   cada unidade é uma ração; a ordem é a ordem em que são gastas.
                                                ef = { conf, san, rec }: o que muda no descanso de quem come esta;
                                                fx: o que ela faz na ficha de quem come (ver EFEITO, abaixo);
                                                todos: banquete — comida uma ração dela no descanso, o efeito vale para
                                                todos que descansam (sem isso, só para quem a come)
     melhorias [{ id, nome, desc, on, ef, alvo, fx }]   ef = { conf, san, rec, prov }: o que soma ao descanso longo;
                                                alvo = { todos, pers: [ids], grupos: [nomes] }: para quem vale (as rações
                                                — prov — valem para o acampamento inteiro); fx: o que faz na ficha deles
     equipamentos [{ id, nome, desc, on, qtd, ef, alvo, fx }]
     bonus [{ id, nome, desc, ateDescanso }]    bônus declarados pela mesa (texto); os "até o descanso" saem ao descansar
     regras { longo, curto, semProv }           longo/curto: { rec %, prov por personagem, conf, san, tiraBonus }
                                                tiraBonus: o descanso tira os bônus "até o próximo descanso" (o padrão;
                                                na janela do descanso o mestre muda só para aquele descanso)
                                                semProv: { rec % do que recuperaria, conf } quando faltam rações
                                                (as barras especiais não estão aqui: cada uma tem a sua regra, na ficha)
     servir { longo, curto }                    a provisão que cada descanso serve primeiro (id, ou null: a ordem da lista)
     emo { [id]: emoção }                       a emoção de cada um, sem mesa (numa mesa ela fica na ficha: estado.emo)
     caravana { veiculos, carga, gente, vai }   ver normCaravana
     lugar ('floresta' | 'montanha' | 'deserto' | 'neve' | 'mar' | 'caverna')   onde o acampamento está (muda o desenho)
     clima ('limpo' | 'chuva' | 'tempestade' | 'neve' | 'neblina' | 'vento')     o tempo, animado na cena
     verCaravana (bool)                         os veículos e animais da caravana aparecem na cena
     area { [id]: 'oficinas' | 'convivio' | 'guarda' }   em que área do acampamento cada um está (sem nada: na fogueira)
     comer { racas: { [raça]: n }, pers: { [id]: n } }   quantas rações cada um come no descanso longo, por raça (o
                                                campo "Raça / classe" da ficha) ou por personagem (vale mais que a raça)
     diario [{ id, t (ms), texto }]             os mais novos primeiro; no máximo 60

   CONSTRUÇÕES: uma melhoria pode ser de um tipo do catálogo (ESTRUTURAS: a forja, o canto do bardo…). Aí ela tem um
   desenho na área dela, três níveis (nivel 1, 2, 3: simples, boa, excelente) e o que cada nível faz (nv: [{ ef, fx }]);
   ef e fx são sempre os do nível em que ela está.

   EFEITO na ficha (fx), um por linha:
     { id, t: 'bonus', k (chave do bônus: FOR, DFF, FOGO…), v, dur: 'descanso' | 'rodadas', r (rodadas) }
     { id, t: 'barra', b (nome da barra), val ("20", "-5", "2d6+3") }
     { id, t: 'sob',   b (nome da barra), v (sobrevida) } */
(() => {
  'use strict';
  const MAX_ITENS = 80, MAX_DIARIO = 60, MAX_TXT = 600, MAX_NOME = 80;
  const HORAS = ['entardecer', 'noite', 'amanhecer'];
  const FAD_MAX = 5;          // a fadiga: uma pilha de 5 (descansado) a 0 (esgotado), como a bateria do celular
  const REGRAS_PADRAO = {
    longo: { rec: 100, prov: 1, conf: 10, san: 5, tiraBonus: true },
    curto: { rec: 25, prov: 0, conf: 0, san: 0, tiraBonus: true },
    semProv: { rec: 50, conf: -10 },
  };
  const EF_ZERO = { conf: 0, san: 0, rec: 0, prov: 0 };
  /* Onde as pessoas podem ficar, em % da cena. Os lados ficam de fora porque em telas estreitas a cena é cortada dos
     lados (nunca mais do que isto); assim, o que o mestre arruma aparece igual na tela de todo mundo. */
  const AREA = { x0: 12, x1: 88, y0: 22, y1: 86 };

  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const num = (v, padrao) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN; return Number.isFinite(n) ? n : padrao; };
  const limitar = (n, a, b) => Math.min(b, Math.max(a, n));
  const inteiro = (v, padrao, a, b) => { const n = num(v, NaN); return Number.isFinite(n) ? limitar(Math.round(n), a, b) : padrao; };
  const texto = (v, max) => String(v == null ? '' : v).slice(0, max || MAX_TXT);
  const idOk = v => (typeof v === 'string' && v.length <= 80 && /^[A-Za-z0-9_:.-]+$/.test(v) && v !== '__proto__' ? v : '');
  const novoId = p => (p || 'x') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const copia = x => JSON.parse(JSON.stringify(x));
  function unicos(lista, p) {
    const vistos = new Set();
    return lista.map((x, i) => { let id = idOk(x.id) || p + '_' + i; while (vistos.has(id)) id += '_'; vistos.add(id); x.id = id; return x; });
  }
  const normEf = e => { e = ehObj(e) ? e : {}; return { conf: inteiro(e.conf, 0, -100, 100), san: inteiro(e.san, 0, -100, 100), rec: inteiro(e.rec, 0, -100, 100), prov: inteiro(e.prov, 0, -99, 99) }; };
  // o que uma ração muda no descanso de quem a come (sem "rações a mais": isso é da estrutura)
  const normEfRacao = e => { e = ehObj(e) ? e : {}; return { conf: inteiro(e.conf, 0, -100, 100), san: inteiro(e.san, 0, -100, 100), rec: inteiro(e.rec, 0, -100, 100) }; };
  const normRegra = (r, p) => { r = ehObj(r) ? r : {}; return { rec: inteiro(r.rec, p.rec, 0, 100), prov: inteiro(r.prov, p.prov, 0, 99), conf: inteiro(r.conf, p.conf, -100, 100), san: inteiro(r.san, p.san, -100, 100), tiraBonus: r.tiraBonus === undefined ? p.tiraBonus : !!r.tiraBonus }; };
  const listaDe = (v, max) => (Array.isArray(v) ? v.filter(ehObj).slice(0, max) : []);
  const r1d = v => Math.round(v * 10) / 10, r2d = v => Math.round(v * 100) / 100;

  /* ---- o que vai para a ficha (fx), e para quem vale a estrutura (alvo) ---- */
  const MAX_FX = 8, MAX_ALVO = 60;
  const TIPOS_FX = ['bonus', 'barra', 'sob'];
  const chaveOk = k => String(k == null ? '' : k).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 12);
  function normFx(lista) {
    return unicos(listaDe(lista, MAX_FX).map(f => {
      const t = TIPOS_FX.includes(f.t) ? f.t : 'bonus';
      if (t === 'bonus') {
        const dur = f.dur === 'rodadas' ? 'rodadas' : 'descanso', o = { id: f.id, t, k: chaveOk(f.k) || 'FOR', v: r1d(limitar(num(f.v, 0), -999, 999)), dur };
        if (dur === 'rodadas') o.r = inteiro(f.r, 3, 1, 99);
        return o;
      }
      if (t === 'barra') return { id: f.id, t, b: texto(f.b, 40).trim(), val: String(f.val == null ? '' : f.val).replace(/\s+/g, '').slice(0, 24) };
      return { id: f.id, t, b: texto(f.b, 40).trim(), v: r1d(limitar(num(f.v, 0), 0, 9999)) };
    }), 'fx');
  }
  function normAlvo(a) {
    a = ehObj(a) ? a : {};
    const pers = Array.from(new Set((Array.isArray(a.pers) ? a.pers : []).map(idOk).filter(Boolean))).slice(0, MAX_ALVO);
    const grupos = Array.from(new Set((Array.isArray(a.grupos) ? a.grupos : []).map(g => texto(g, MAX_NOME).trim()).filter(Boolean))).slice(0, MAX_ALVO);
    return { todos: a.todos !== false, pers, grupos };
  }

  /* ---- as emoções (a aura em volta do retrato, na fogueira) ---- */
  const EMOCOES = [
    { k: 'calmo', nome: 'Calmo', cor: '#7fb8e6' },
    { k: 'alegre', nome: 'Alegre', cor: '#f2c94c' },
    { k: 'confiante', nome: 'Confiante', cor: '#f39a4a' },
    { k: 'apaixonado', nome: 'Apaixonado', cor: '#ec6fa0' },
    { k: 'pensativo', nome: 'Pensativo', cor: '#5ec2b0' },
    { k: 'cansado', nome: 'Cansado', cor: '#9aa3b2' },
    { k: 'triste', nome: 'Triste', cor: '#5b84d6' },
    { k: 'ansioso', nome: 'Ansioso', cor: '#c4cc4e' },
    { k: 'medo', nome: 'Com medo', cor: '#a184e0' },
    { k: 'raiva', nome: 'Com raiva', cor: '#e5533f' },
  ];
  const emoOk = k => (EMOCOES.some(e => e.k === k) ? k : null);
  const emocao = k => EMOCOES.find(e => e.k === k) || null;

  /* ---- a caravana: veículos e animais, a carga (com peso) e quem viaja ----
       veiculos [{ id, nome, tipo, cap (peso que leva), estado (texto: "roda quebrada"), nota }]
       carga    [{ id, nome, qtd, peso (de cada um), veiculo (id | null) }]
       gente    [{ id, nome, papel, veiculo (id | null), nota }]   quem viaja junto e não tem ficha (cocheiro, guarda…)
       vai      { [idDoPersonagem]: idDoVeiculo }                  onde vai cada personagem do acampamento */
  const TIPOS_VEICULO = [['carroca', 'Carroça'], ['carruagem', 'Carruagem'], ['barco', 'Barco'], ['montaria', 'Montaria'], ['animal', 'Animal de carga'], ['outro', 'Outro']];
  function normCaravana(x) {
    const c = ehObj(x) ? x : {};
    const veiculos = unicos(listaDe(c.veiculos, 40).map(v => ({ id: v.id, nome: texto(v.nome, MAX_NOME), tipo: TIPOS_VEICULO.some(t => t[0] === v.tipo) ? v.tipo : 'carroca', cap: r1d(limitar(num(v.cap, 0), 0, 999999)), estado: texto(v.estado, 120), nota: texto(v.nota) })), 'vc');
    const ids = new Set(veiculos.map(v => v.id)), onde = v => (typeof v === 'string' && ids.has(v) ? v : null);
    const carga = unicos(listaDe(c.carga, 200).map(k => ({ id: k.id, nome: texto(k.nome, MAX_NOME), qtd: inteiro(k.qtd, 1, 0, 99999), peso: r2d(limitar(num(k.peso, 0), 0, 99999)), veiculo: onde(k.veiculo) })), 'cg');
    const gente = unicos(listaDe(c.gente, 80).map(g => ({ id: g.id, nome: texto(g.nome, MAX_NOME), papel: texto(g.papel, 40), veiculo: onde(g.veiculo), nota: texto(g.nota) })), 'gt');
    const vai = {};
    if (ehObj(c.vai)) for (const k of Object.keys(c.vai).slice(0, 200)) { const v = onde(c.vai[k]); if (idOk(k) && v) vai[k] = v; }
    return { veiculos, carga, gente, vai };
  }
  /* O peso da carga: em cada veículo, sem lugar, o total, e quanto todos os veículos juntos levam. */
  function cargaDe(camp) {
    const cv = camp.caravana, por = {};
    let semLugar = 0, total = 0;
    for (const v of cv.veiculos) por[v.id] = 0;
    for (const k of cv.carga) { const p = k.qtd * k.peso; total += p; if (k.veiculo && por[k.veiculo] != null) por[k.veiculo] += p; else semLugar += p; }
    for (const id in por) por[id] = r2d(por[id]);
    return { por, semLugar: r2d(semLugar), total: r2d(total), cap: r2d(cv.veiculos.reduce((s, v) => s + v.cap, 0)) };
  }

  /* ---- onde o acampamento está, o tempo e as áreas ---- */
  const LUGARES = [['floresta', 'Floresta'], ['montanha', 'Montanha'], ['deserto', 'Deserto'], ['neve', 'Neve'], ['mar', 'Beira-mar'], ['caverna', 'Caverna']];
  const CLIMAS = [['limpo', 'Tempo bom'], ['chuva', 'Chuva'], ['tempestade', 'Tempestade'], ['neve', 'Nevando'], ['neblina', 'Neblina'], ['vento', 'Ventania']];
  /* (lote 7, parte 5c) O clima do dia do Mapa-múndi (os mesmos de lá — e do Jornal): o nome, o que uma noite nele mexe no
     Conforto (a proposta do descanso longo) e o desenho daqui que mais se parece. */
  const CLIMA_MUNDO = {
    sol: { nome: 'Ensolarado', conf: 0, acamp: 'limpo' }, nublado: { nome: 'Nublado', conf: 0, acamp: 'limpo' }, chuva: { nome: 'Chuva', conf: -5, acamp: 'chuva' },
    tempestade: { nome: 'Tempestade', conf: -10, acamp: 'tempestade' }, neve: { nome: 'Neve', conf: -10, acamp: 'neve' }, nevoa: { nome: 'Névoa', conf: 0, acamp: 'neblina' },
    vento: { nome: 'Ventania', conf: -5, acamp: 'vento' }, calor: { nome: 'Calor', conf: -5, acamp: 'limpo' }, frio: { nome: 'Frio', conf: -10, acamp: 'limpo' },
  };
  const AREAS = [['fogueira', 'Fogueira'], ['oficinas', 'Oficinas'], ['convivio', 'Convívio'], ['guarda', 'Guarda e Cuidado']];
  const areaOk = a => (AREAS.some(x => x[0] === a) ? a : 'fogueira');

  /* ---- o catálogo das construções ----
     Cada tipo tem uma categoria (as da estrutura), a área onde é desenhado e o que faz em cada nível — o padrão, que o
     mestre pode mudar nível por nível. ef: { conf, san, rec, prov } no descanso longo; fx: o que vai para a ficha. */
  const CATEGORIAS = [['oficios', 'Ofícios'], ['convivio', 'Convívio'], ['protecao', 'Proteção'], ['cuidado', 'Cuidado e estudo']];
  const NIVEIS = ['Simples', 'Boa', 'Excelente'];
  const ef4 = (conf, san, rec, prov) => ({ conf, san, rec, prov });
  const bon = (k, v) => ({ t: 'bonus', k, v, dur: 'descanso' });
  const ESTRUTURAS = [
    { k: 'cozinha', nome: 'Cozinha de campanha', cat: 'oficios', area: 'fogueira', desc: 'Panelas, um fogão de pedra e quem saiba usar: a comida rende e conforta.',
      nv: [{ ef: ef4(3, 0, 0, 0) }, { ef: ef4(5, 0, 0, 0) }, { ef: ef4(8, 0, 0, -1) }] },
    { k: 'alquimia', nome: 'Bancada de alquimista', cat: 'oficios', area: 'oficinas', desc: 'Frascos, ervas secando e um alambique: unguentos e chás que ajudam a recuperar.',
      nv: [{ ef: ef4(0, 0, 5, 0) }, { ef: ef4(0, 0, 10, 0) }, { ef: ef4(0, 0, 15, 0) }] },
    { k: 'forja', nome: 'Forja', cat: 'oficios', area: 'oficinas', desc: 'Bigorna, fole e carvão: armas afiadas e armaduras ajustadas para o dia seguinte.',
      nv: [{ fx: [bon('DFF', 1)] }, { fx: [bon('DFF', 2)] }, { fx: [bon('DFF', 2), bon('FOR', 1)] }] },
    { k: 'oficina', nome: 'Oficina de couro e madeira', cat: 'oficios', area: 'oficinas', desc: 'Remendos, cordas novas e botas consertadas: a viagem fica mais leve.',
      nv: [{ ef: ef4(2, 0, 0, 0) }, { ef: ef4(3, 0, 0, 0), fx: [bon('AGI', 1)] }, { ef: ef4(5, 0, 0, 0), fx: [bon('AGI', 1)] }] },
    { k: 'bardo', nome: 'Canto do bardo', cat: 'convivio', area: 'convivio', desc: 'Um banco, um alaúde e histórias ao pé do fogo.',
      nv: [{ ef: ef4(2, 2, 0, 0) }, { ef: ef4(3, 4, 0, 0) }, { ef: ef4(5, 6, 0, 0) }] },
    { k: 'mesa', nome: 'Mesa comprida', cat: 'convivio', area: 'convivio', desc: 'Refeições juntos, cartas e dados: o grupo vira família.',
      nv: [{ ef: ef4(3, 0, 0, 0) }, { ef: ef4(5, 1, 0, 0) }, { ef: ef4(8, 2, 0, 0) }] },
    { k: 'banho', nome: 'Tina de banho', cat: 'convivio', area: 'convivio', desc: 'Água quente e um biombo: o cansaço sai junto com a poeira.',
      nv: [{ ef: ef4(2, 0, 0, 0) }, { ef: ef4(4, 0, 5, 0) }, { ef: ef4(6, 1, 5, 0) }] },
    { k: 'lanternas', nome: 'Varal de lanternas', cat: 'convivio', area: 'convivio', desc: 'Luzes coloridas no alto: a noite fica menos escura.',
      nv: [{ ef: ef4(1, 1, 0, 0) }, { ef: ef4(2, 2, 0, 0) }, { ef: ef4(3, 3, 0, 0) }] },
    { k: 'palicada', nome: 'Paliçada', cat: 'protecao', area: 'guarda', desc: 'Estacas em volta do acampamento: dorme-se melhor atrás de um muro.',
      nv: [{ ef: ef4(0, 3, 0, 0) }, { ef: ef4(0, 5, 0, 0) }, { ef: ef4(1, 8, 0, 0) }] },
    { k: 'torre', nome: 'Torre de vigia', cat: 'protecao', area: 'guarda', desc: 'Alguém de olho no horizonte enquanto os outros dormem.',
      nv: [{ ef: ef4(0, 2, 0, 0) }, { ef: ef4(0, 3, 0, 0), fx: [bon('PER', 1)] }, { ef: ef4(0, 5, 0, 0), fx: [bon('PER', 2)] }] },
    { k: 'alarmes', nome: 'Alarmes e armadilhas', cat: 'protecao', area: 'guarda', desc: 'Sinos em cordas e estacas escondidas: ninguém chega de surpresa.',
      nv: [{ ef: ef4(0, 2, 0, 0) }, { ef: ef4(0, 3, 0, 0) }, { ef: ef4(0, 4, 0, 0), fx: [bon('ESQ', 1)] }] },
    { k: 'enfermaria', nome: 'Enfermaria', cat: 'cuidado', area: 'guarda', desc: 'Catres limpos, ataduras e um lugar quieto para curar.',
      nv: [{ ef: ef4(0, 0, 10, 0) }, { ef: ef4(0, 0, 20, 0) }, { ef: ef4(2, 0, 30, 0) }] },
    { k: 'estudo', nome: 'Mesa de estudo', cat: 'cuidado', area: 'guarda', desc: 'Livros, mapas e velas: tempo para pensar e se preparar.',
      nv: [{ fx: [bon('CAN', 1)] }, { fx: [bon('CAN', 2)] }, { ef: ef4(0, 2, 0, 0), fx: [bon('CAN', 3)] }] },
    { k: 'santuario', nome: 'Santuário', cat: 'cuidado', area: 'guarda', desc: 'Um altar pequeno, flores e velas: paz para a cabeça.',
      nv: [{ ef: ef4(0, 3, 0, 0) }, { ef: ef4(0, 6, 0, 0) }, { ef: ef4(1, 10, 0, 0) }] },
    { k: 'horta', nome: 'Horta de ervas', cat: 'cuidado', area: 'guarda', desc: 'Canteiros de ervas e legumes: menos provisões gastas e chás que ajudam.',
      nv: [{ ef: ef4(0, 0, 0, -1) }, { ef: ef4(0, 0, 5, -1) }, { ef: ef4(1, 0, 5, -2) }] },
  ];
  ESTRUTURAS.forEach(e => { Object.freeze(e.nv); Object.freeze(e); });
  Object.freeze(ESTRUTURAS);
  const estrutura = k => ESTRUTURAS.find(e => e.k === k) || null;
  // o que um nível do catálogo faz, no formato do acampamento (uma cópia nova)
  const padraoDoNivel = (k, i) => { const e = estrutura(k), x = e && e.nv[i] ? e.nv[i] : {}; return { ef: normEf(x.ef), fx: normFx(copia(x.fx || [])) }; };
  /* Uma melhoria arrumada. A de um tipo do catálogo leva o tipo, o nível e o que cada nível faz; o ef e o fx dela são
     sempre os do nível em que está (quem mexe nos efeitos mexe nos do nível; quem troca o nível troca os efeitos). */
  function normMelhoria(m) {
    const o = { id: m.id, nome: texto(m.nome, MAX_NOME), desc: texto(m.desc), on: m.on !== false, ef: normEf(m.ef), alvo: normAlvo(m.alvo), fx: normFx(m.fx) };
    if (!estrutura(m.tipo)) return o;
    const nivel = inteiro(m.nivel, 1, 1, 3), vem = Array.isArray(m.nv) ? m.nv : null, temEf = m.ef !== undefined || m.fx !== undefined;
    // (sem a lista dos níveis — uma construção gravada só com ef/fx —, o nível em que ela está fica com o que veio)
    const nv = [0, 1, 2].map(i => (vem && ehObj(vem[i]) ? { ef: normEf(vem[i].ef), fx: normFx(vem[i].fx) } : !vem && temEf && i === nivel - 1 ? { ef: o.ef, fx: o.fx } : padraoDoNivel(m.tipo, i)));
    return Object.assign(o, { ef: copia(nv[nivel - 1].ef), fx: copia(nv[nivel - 1].fx), tipo: m.tipo, nivel, nv });
  }

  /* ---- quanto cada um come ---- */
  // a chave de uma raça: sem diferença de maiúsculas, acentos e espaços nas pontas ("Anã " e "ana" são a mesma)
  const chaveRaca = r => String(r == null ? '' : r).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 40);
  function normComer(x) {
    const c = ehObj(x) ? x : {}, racas = {}, pers = {};
    if (ehObj(c.racas)) for (const k of Object.keys(c.racas).slice(0, 60)) { const ch = chaveRaca(k), n = inteiro(c.racas[k], null, 0, 99); if (ch && ch !== '__proto__' && n != null) racas[ch] = n; }
    if (ehObj(c.pers)) for (const k of Object.keys(c.pers).slice(0, 200)) { const n = inteiro(c.pers[k], null, 0, 99); if (idOk(k) && n != null) pers[k] = n; }
    return { racas, pers };
  }
  /* Quantas rações esta pessoa come neste descanso: no longo, a dela (por personagem) ou a da raça dela, se o mestre
     anotou; senão, a da regra (ou a que veio para este descanso, `prov`). O curto é igual para todos. */
  function quantoCome(camp, tipo, p, prov) {
    const padrao = prov != null && Number.isFinite(num(prov, NaN)) ? inteiro(prov, 0, 0, 99) : camp.regras[tipo === 'curto' ? 'curto' : 'longo'].prov;
    if (tipo === 'curto' || !p) return padrao;
    if (Object.prototype.hasOwnProperty.call(camp.comer.pers, p.id)) return camp.comer.pers[p.id];
    const r = chaveRaca(p.raca);
    if (r && Object.prototype.hasOwnProperty.call(camp.comer.racas, r)) return camp.comer.racas[r];
    return padrao;
  }

  /* Nunca lança: com qualquer coisa na entrada sai um acampamento válido, sempre com os campos na mesma ordem. */
  function normalizar(x) {
    const a = ehObj(x) ? x : {};
    const reg = ehObj(a.regras) ? a.regras : {}, sp = ehObj(reg.semProv) ? reg.semProv : {};
    const ids = v => Array.from(new Set((Array.isArray(v) ? v : []).map(idOk).filter(Boolean))).slice(0, 200);
    const lugares = {};
    if (ehObj(a.lugares)) for (const k of Object.keys(a.lugares).slice(0, 200)) {
      const p = a.lugares[k];
      if (idOk(k) && ehObj(p) && Number.isFinite(num(p.x, NaN)) && Number.isFinite(num(p.y, NaN))) lugares[k] = { x: Math.round(limitar(num(p.x, 50), AREA.x0, AREA.x1) * 10) / 10, y: Math.round(limitar(num(p.y, 50), AREA.y0, AREA.y1) * 10) / 10 };
    }
    const fundo = ehObj(a.fundo) && typeof a.fundo.url === 'string' && /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(a.fundo.url) ? { url: a.fundo.url } : null;
    const provisoes = unicos(listaDe(a.provisoes, MAX_ITENS).map(p => ({ id: p.id, nome: texto(p.nome, MAX_NOME), qtd: inteiro(p.qtd, 0, 0, 9999), ef: normEfRacao(p.ef), fx: normFx(p.fx), todos: p.todos === true })), 'pv');
    const sv = ehObj(a.servir) ? a.servir : {}, servida = v => { const id = idOk(v); return id && provisoes.some(p => p.id === id) ? id : null; };
    const emo = {};
    if (ehObj(a.emo)) for (const k of Object.keys(a.emo).slice(0, 200)) { const e = emoOk(a.emo[k]); if (idOk(k) && e) emo[k] = e; }
    const area = {};
    if (ehObj(a.area)) for (const k of Object.keys(a.area).slice(0, 200)) { const ar = areaOk(a.area[k]); if (idOk(k) && ar !== 'fogueira') area[k] = ar; }
    return {
      v: 1,
      nome: texto(a.nome, MAX_NOME).trim() || 'Acampamento',
      hora: HORAS.includes(a.hora) ? a.hora : 'noite',
      fundo,
      cena: idOk(a.cena) || null,
      presentes: ids(a.presentes), autoVistos: ids(a.autoVistos), lugares,
      // (a emoção só entra na roda de quem tem uma: a roda de antes continua igual)
      roda: listaDe(a.roda, 200).map(r => Object.assign({ id: idOk(r.id), nome: texto(r.nome, MAX_NOME), img: typeof r.img === 'string' && /^https:\/\//.test(r.img) ? r.img.slice(0, 500) : null, dono: typeof r.dono === 'string' ? r.dono.slice(0, 64) : null }, emoOk(r.emo) ? { emo: r.emo } : {})).filter(r => r.id),
      provisoes,
      melhorias: unicos(listaDe(a.melhorias, MAX_ITENS).map(normMelhoria), 'ml'),
      equipamentos: unicos(listaDe(a.equipamentos, MAX_ITENS).map(m => ({ id: m.id, nome: texto(m.nome, MAX_NOME), desc: texto(m.desc), on: m.on !== false, qtd: inteiro(m.qtd, 1, 0, 999), ef: normEf(m.ef), alvo: normAlvo(m.alvo), fx: normFx(m.fx) })), 'eq'),
      bonus: unicos(listaDe(a.bonus, MAX_ITENS).map(b => ({ id: b.id, nome: texto(b.nome, MAX_NOME), desc: texto(b.desc), ateDescanso: !!b.ateDescanso })), 'bn'),
      regras: { longo: normRegra(reg.longo, REGRAS_PADRAO.longo), curto: normRegra(reg.curto, REGRAS_PADRAO.curto), semProv: { rec: inteiro(sp.rec, REGRAS_PADRAO.semProv.rec, 0, 100), conf: inteiro(sp.conf, REGRAS_PADRAO.semProv.conf, -100, 100) } },
      servir: { longo: servida(sv.longo), curto: servida(sv.curto) },
      emo,
      caravana: normCaravana(a.caravana),
      lugar: LUGARES.some(l => l[0] === a.lugar) ? a.lugar : 'floresta',
      clima: CLIMAS.some(l => l[0] === a.clima) ? a.clima : 'limpo',
      verCaravana: a.verCaravana !== false,
      area,
      comer: normComer(a.comer),
      diario: unicos(listaDe(a.diario, MAX_DIARIO).map(d => ({ id: d.id, t: Math.max(0, num(d.t, 0)), texto: texto(d.texto) })), 'di'),
    };
  }
  function normalizarSeguro(x) { try { return normalizar(x); } catch (e) { return normalizar(null); } }

  /* O que a estrutura em uso soma ao descanso longo de todos: Conforto, Sanidade e recuperação das que valem para
     todos, e as rações a mais (ou a menos) de todas as que estão em uso — essas são do acampamento inteiro. */
  function efeitos(camp) {
    const t = Object.assign({}, EF_ZERO);
    for (const m of camp.melhorias.concat(camp.equipamentos)) if (m.on) for (const k in t) if (k === 'prov' || !m.alvo || m.alvo.todos) t[k] += m.ef[k] || 0;
    return t;
  }
  // a melhoria (ou o equipamento) vale para esta pessoa? (pessoa: { id, grupo })
  function alcanca(m, p) {
    const a = m.alvo;
    if (!a || a.todos) return true;
    return a.pers.includes(p.id) || (!!p.grupo && a.grupos.includes(p.grupo));
  }
  // o que a estrutura em uso soma ao descanso longo DESTA pessoa (sem as rações, que são do acampamento inteiro)
  function efeitosDe(camp, p) {
    const t = { conf: 0, san: 0, rec: 0 };
    for (const m of camp.melhorias.concat(camp.equipamentos)) if (m.on && alcanca(m, p)) for (const k in t) t[k] += m.ef[k] || 0;
    return t;
  }
  // o que a estrutura em uso faz na ficha DESTA pessoa no descanso longo, com o nome de onde vem
  function fxDe(camp, p) {
    const out = [];
    for (const m of camp.melhorias.concat(camp.equipamentos)) if (m.on && alcanca(m, p)) for (const f of m.fx) out.push(Object.assign({ de: m.nome || 'Estrutura' }, f));
    return out;
  }
  // há alguma melhoria ou equipamento em uso que vale só para alguns?
  const temParaAlguns = camp => camp.melhorias.concat(camp.equipamentos).some(m => m.on && m.alvo && !m.alvo.todos);
  // a ração (ou a melhoria) faz alguma coisa além de matar a fome?
  const temEfeito = x => !!x && (x.fx.length > 0 || !!(x.ef.conf || x.ef.san || x.ef.rec));
  const racoes = camp => camp.provisoes.reduce((s, p) => s + p.qtd, 0);
  // por extenso, para os avisos: "Conforto +15 · Sanidade +5 · recuperação +20% · 1 ração a menos"
  const comSinal = n => (n > 0 ? '+' + n : '−' + Math.abs(n));
  function textoEfeitos(e) {
    const p = [];
    if (e.conf) p.push('Conforto ' + comSinal(e.conf));
    if (e.san) p.push('Sanidade ' + comSinal(e.san));
    if (e.rec) p.push('recuperação ' + comSinal(e.rec) + '%');
    if (e.prov) p.push(Math.abs(e.prov) + (Math.abs(e.prov) === 1 ? ' ração' : ' rações') + (e.prov < 0 ? ' a menos' : ' a mais') + ' por descanso');
    return p.join(' · ');
  }

  /* A conta de um descanso, sem mudar nada.
       tipo        'longo' | 'curto'
       pessoas     [{ id, nome, grupo?, raca?, recursos: [{ id, nome, max, atual, min?, inicio? }], san, conf (número ou null =
                      a ficha não usa), poderes: [{ id, nome, atual, max, rec?, qc?, ql? }] (as barras especiais, cada uma
                      com a regra dela), fad (a fadiga, de 0 a 5, ou null = a ficha não usa), tmp: [{ id, n, k, v }] (os
                      bônus "até o próximo descanso" que a ficha tem agora) }] — só quem vai descansar
       opt         { servir: id | null (a provisão servida neste descanso; sem vir, a do descanso), prov: rações por pessoa
                     neste descanso (sem vir, a da regra), porPessoa: { id: rações } (o que o mestre mudou na hora, pessoa
                     por pessoa), tiraBonus: bool (só neste descanso; sem vir, o da regra) } — sem porPessoa, no descanso
                     longo, vale o que o acampamento anotou por personagem ou por raça (comer); senão, prov. Cada linha do
                     plano diz quanto a pessoa ia comer (quer) e os bônus que acabam (saem).
     Devolve o plano: o que cada um recupera, as rações gastas (de quais provisões) e os avisos.
     Só o descanso longo usa a estrutura (melhorias e equipamentos). As rações saem primeiro da provisão servida e
     depois da lista, de cima para baixo, em rodízio (uma para cada, depois mais uma para cada…); quem come uma ração
     com efeito ganha o efeito dela — e, se ela é de banquete (todos), todos que descansam ganham.
     Cada linha traz também fx: o que vai para a ficha (o efeito da ração e o da estrutura), para quem chama aplicar. */
  function planejar(camp, tipo, pessoas, opt) {
    const longo = tipo !== 'curto', regra = Object.assign({}, camp.regras[longo ? 'longo' : 'curto']), ef = longo ? efeitos(camp) : Object.assign({}, EF_ZERO);
    if (opt && opt.prov != null && Number.isFinite(num(opt.prov, NaN))) regra.prov = inteiro(opt.prov, regra.prov, 0, 99);
    // tirar os bônus "até o próximo descanso": o que o mestre escolheu na janela, só para este descanso; senão, a regra
    const tira = opt && typeof opt.tiraBonus === 'boolean' ? opt.tiraBonus : regra.tiraBonus !== false;
    const n = pessoas.length, disponivel = racoes(camp);
    // quanto cada um come: o que veio para esta pessoa neste descanso; senão, a dela ou a da raça (no longo); senão, a regra
    const pp = opt && ehObj(opt.porPessoa) ? opt.porPessoa : {};
    const quer = pessoas.map(p => (Object.prototype.hasOwnProperty.call(pp, p.id) && Number.isFinite(num(pp[p.id], NaN)) ? inteiro(pp[p.id], 0, 0, 99) : quantoCome(camp, longo ? 'longo' : 'curto', p, regra.prov)));
    const custo = n ? Math.max(0, quer.reduce((s, q) => s + q, 0) + ef.prov) : 0;
    const gasto = Math.min(custo, disponivel), falta = custo - gasto;
    const idServ = opt && opt.servir !== undefined ? opt.servir : camp.servir[longo ? 'longo' : 'curto'];
    const servida = idServ ? camp.provisoes.find(x => x.id === idServ) || null : null;
    // a fila das rações: a provisão servida primeiro, depois a lista de cima para baixo
    const fila = servida ? [servida].concat(camp.provisoes.filter(x => x !== servida)) : camp.provisoes;
    const consumo = [];
    let resta = gasto;
    for (const p of fila) { if (resta <= 0) break; const q = Math.min(p.qtd, resta); if (q > 0) { consumo.push({ id: p.id, nome: p.nome, qtd: q }); resta -= q; } }
    /* O que cada um come: em rodízio — uma ração para cada um, na ordem da roda, depois mais uma para cada…, até cada
       um ter a porção dele ou as rações acabarem. Assim a comida da frente da fila (a servida, a especial) se espalha
       por todos enquanto houver uma para cada, em vez de ficar inteira com o primeiro da roda (com 10 rações por
       pessoa, o primeiro comia sozinho as 10 de cima). Quem come uma ração com efeito ganha o efeito dela; quem come
       duas diferentes ganha os dois (cada tipo conta uma vez). Rações a mais ou a menos da estrutura não mudam quem come
       o quê: são do acampamento. */
    const porcoes = pessoas.map(() => []), restaComer = quer.slice();
    for (let fi = 0, tirado = 0, mais = true; mais;) {
      mais = false;
      for (let i = 0; i < n; i++) {
        if (restaComer[i] <= 0) continue;
        while (fi < fila.length && fila[fi].qtd - tirado <= 0) { fi++; tirado = 0; }
        if (fi >= fila.length) break;
        const pv = fila[fi], ja = porcoes[i].find(x => x.p === pv);
        if (ja) ja.qtd += 1; else porcoes[i].push({ p: pv, qtd: 1 });
        tirado += 1; restaComer[i] -= 1; mais = true;
      }
    }
    // as rações de banquete que alguém comeu neste descanso: o efeito delas vale para todos que descansam
    const banquete = fila.filter(pv => pv.todos && temEfeito(pv) && porcoes.some(c => c.some(x => x.p === pv)));
    // quantos comem a provisão servida (para a prévia dizer quando ela não dá para todos)
    const comem = servida ? porcoes.filter(c => c.some(x => x.p === servida)).length : 0;
    let rec = Math.max(0, regra.rec + ef.rec), conf = regra.conf + ef.conf;
    const san = regra.san + ef.san;
    if (falta > 0) { rec = rec * camp.regras.semProv.rec / 100; conf += camp.regras.semProv.conf; }
    // (lote 7, parte 5c) o clima da noite (o do Mapa-múndi, quando o mestre deixa): soma no Conforto do descanso longo
    const clima = longo && opt && ehObj(opt.clima) && CLIMA_MUNDO[opt.clima.k] ? { k: opt.clima.k, nome: CLIMA_MUNDO[opt.clima.k].nome, conf: inteiro(opt.clima.conf, CLIMA_MUNDO[opt.clima.k].conf, -100, 100) } : null;
    if (clima) conf += clima.conf;
    const linhas = pessoas.map((p, i) => {
      // o que vale para esta pessoa: a estrutura que a alcança, as rações que ela come e as de banquete (cada tipo uma vez)
      const come = porcoes[i], eP = longo ? efeitosDe(camp, p) : { conf: 0, san: 0, rec: 0 };
      const delas = come.map(x => x.p).filter(pv => !pv.todos).concat(banquete);
      const eR = delas.reduce((a, pv) => ({ conf: a.conf + pv.ef.conf, san: a.san + pv.ef.san, rec: a.rec + pv.ef.rec }), { conf: 0, san: 0, rec: 0 });
      let rec = Math.max(0, regra.rec + eP.rec + eR.rec), conf = regra.conf + eP.conf + eR.conf;
      const san = regra.san + eP.san + eR.san;
      if (falta > 0) { rec = rec * camp.regras.semProv.rec / 100; conf += camp.regras.semProv.conf; }
      if (clima) conf += clima.conf;
      const fx = [].concat(...delas.map(pv => pv.fx.map(f => Object.assign({ de: pv.nome || 'Ração' }, f)))).concat(longo ? fxDe(camp, p) : []);
      // os bônus "até o próximo descanso" que acabam (os de antes; os que este descanso dá entram depois) — ou que ficam
      const tmp = (Array.isArray(p.tmp) ? p.tmp : []).filter(ehObj).map(b => ({ id: String(b.id), n: texto(b.n, 60), k: String(b.k || ''), v: num(b.v, 0) }));
      return Object.assign(linhaDoDescanso(p, longo, regra, rec, conf, san), {
        come: come.map(x => ({ id: x.p.id, nome: x.p.nome, qtd: x.qtd, efeito: temEfeito(x.p) })), quer: quer[i], rec: Math.round(rec * 10) / 10, fx,
        saem: tira ? tmp : [], ficam: tira ? [] : tmp });
    });
    // as rações com efeito que alguém comeu, e quantos ganharam o efeito de cada uma (para o diário e a mesa ao vivo);
    // as de banquete valem para todos (todos: true)
    const comidas = [];
    for (const pv of fila) {
      if (!temEfeito(pv)) continue;
      const deTodos = banquete.includes(pv), k = deTodos ? n : porcoes.filter(c => c.some(x => x.p === pv)).length;
      if (k) comidas.push(Object.assign({ id: pv.id, nome: pv.nome, n: k }, deTodos ? { todos: true } : {}));
    }
    return { tipo: longo ? 'longo' : 'curto', n, custo, disponivel, gasto, falta, consumo, rec: Math.round(rec * 10) / 10, conf, san, linhas, efeitos: ef,
      servida: servida ? { id: servida.id, nome: servida.nome, qtd: servida.qtd, efeito: temEfeito(servida), todos: !!servida.todos } : null, comem, comidas, prov: regra.prov,
      tiraBonus: tira, clima };
  }
  // o que uma pessoa recupera, com a recuperação, o Conforto e a Sanidade que valem para ela
  function linhaDoDescanso(p, longo, regra, rec, conf, san) {
    const recursos = (p.recursos || []).filter(r => r.max != null && Number.isFinite(r.max) && r.max > 0).map(r => {
      // min: até onde a barra desce (0, ou negativo na que pode ficar negativa); inicio: onde ela começa (null = cheia)
      const min = Number.isFinite(r.min) && r.min < 0 ? r.min : 0;
      // (lote 8) a ferida permanente: a cura não passa do teto (o máximo menos o que apodreceu)
      const podre = Number.isFinite(r.podre) && r.podre > 0 ? r.podre : 0, teto = Math.max(min, r.max - podre), pd = podre ? { podre } : {};
      const inicio = r.inicio != null && Number.isFinite(r.inicio) ? limitar(r.inicio, min, teto) : null;
      const de = limitar(num(r.atual, inicio == null ? teto : inicio), min, teto);
      /* A barra que tem um começo próprio (a que nasce em 4 de 20, por exemplo) não "recupera": o descanso longo a
         leva de volta ao começo, de onde ela estiver, e o curto não mexe nela. */
      if (inicio != null) return Object.assign({ id: r.id, nome: r.nome, max: r.max, de, para: longo ? inicio : de, inicio }, pd);
      // recuperar 100% (ou mais) é encher a barra, mesmo a que estava abaixo de zero
      const para = rec >= 100 ? teto : limitar(Math.round((de + Math.ceil(r.max * rec / 100 - 1e-9)) * 10) / 10, min, teto);
      return Object.assign({ id: r.id, nome: r.nome, max: r.max, de, para: Math.max(de, para) }, pd);
    });
    const barra = (v, d) => (v == null ? null : { de: v, para: limitar(v + d, 0, 100) });
    // as barras especiais, cada uma pela regra dela (só entram as que mudam)
    const poderes = (p.poderes || []).map(x => ({ id: x.id, nome: x.nome, de: x.atual, para: paraDaEspecial(x, longo) })).filter(x => x.para !== x.de);
    // a fadiga (a pilha de 5 a 0, cheia = descansado): o descanso longo enche, o curto devolve um
    const fad = p.fad == null || !Number.isFinite(num(p.fad, NaN)) ? null : inteiro(p.fad, FAD_MAX, 0, FAD_MAX);
    return { id: p.id, nome: p.nome, recursos, san: barra(p.san, san), conf: barra(p.conf, conf), poderes,
      fad: fad == null ? null : { de: fad, para: longo ? FAD_MAX : Math.min(FAD_MAX, fad + 1) } };
  }
  /* Quanto uma barra especial fica depois do descanso, pela regra dela (rec, como em TC.rules.especiais):
       longo     enche no descanso longo (o padrão)       qualquer  enche em qualquer descanso
       quantia   soma qc no curto e ql no longo           manual    o descanso não mexe nela
     Encher é ir até o limite: a barra sem limite (max 0) não tem o que encher — só a quantia soma nela. */
  const REC_ESPECIAIS = ['longo', 'qualquer', 'quantia', 'manual'];
  function paraDaEspecial(x, longo) {
    const a = Math.max(0, Math.round(num(x.atual, 0))), m = Math.max(0, Math.round(num(x.max, 0)));
    const rec = REC_ESPECIAIS.includes(x.rec) ? x.rec : 'longo';
    if (rec === 'manual' || (rec === 'longo' && !longo)) return a;
    if (rec === 'quantia') { const n = a + inteiro(longo ? x.ql : x.qc, longo ? 2 : 1, 0, 999); return m > 0 ? Math.max(a, Math.min(n, m)) : n; }
    return m > 0 ? Math.max(a, m) : a;
  }

  /* ---- o que vai para a ficha ----
     A barra da ficha com este nome (sem diferença de maiúsculas e acentos): "vida" acha "Vida", "HP" acha "HP". */
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const barraPeloNome = (recursos, nome) => (recursos || []).find(r => semAcento(r.nome) === semAcento(nome)) || null;
  /* Um efeito por extenso, para a prévia e os avisos: "FOR +2 (até o próximo descanso)", "Vida +20", "Vida +2d6",
     "Sobrevida 10 na Vida". nomes: { FOR: 'Força', … } (sem vir, fica a sigla). */
  function textoFx(f, nomes) {
    if (f.t === 'bonus') return ((nomes && nomes[f.k]) || f.k) + ' ' + comSinal(f.v) + ' (' + (f.dur === 'rodadas' ? f.r + (f.r === 1 ? ' rodada' : ' rodadas') : 'até o próximo descanso') + ')';
    if (f.t === 'barra') { const v = String(f.val || '').replace(/^\+/, ''); return (f.b || 'Barra') + ' ' + (v[0] === '-' || v[0] === '−' ? '−' + v.slice(1) : '+' + v); }
    return 'Sobrevida ' + f.v + ' em ' + (f.b || 'Barra');
  }
  /* O bônus temporário que um efeito "bonus" põe na ficha (estado.tmp): o nome de onde veio, a chave, o valor, a
     duração anotada e — conforme a escolha do mestre — até o próximo descanso (ate) ou por quantas rodadas (r). */
  function tmpDoFx(f, quando) {
    const b = { n: String(f.de || 'Acampamento').slice(0, 60), k: f.k, v: f.v, d: f.dur === 'rodadas' ? f.r + (f.r === 1 ? ' rodada' : ' rodadas') : 'até o próximo descanso', t: quando || 0 };
    if (f.dur === 'rodadas') b.r = f.r; else b.ate = 'descanso';
    return b;
  }
  // O acampamento depois do descanso: as rações gastas saem (provisão zerada continua na lista), os bônus "até o
  // descanso" acabam (se o descanso tira os bônus) e o diário ganha a linha. Não muda o que recebeu.
  function aposDescanso(camp, plano, quando) {
    const c = copia(camp);
    for (const g of plano.consumo) { const p = c.provisoes.find(x => x.id === g.id); if (p) p.qtd = Math.max(0, p.qtd - g.qtd); }
    if (plano.tiraBonus !== false) c.bonus = c.bonus.filter(b => !b.ateDescanso);
    c.diario.unshift({ id: novoId('di'), t: quando || Date.now(), texto: resumoDescanso(plano) });
    c.diario = c.diario.slice(0, MAX_DIARIO);
    return normalizarSeguro(c);
  }
  function resumoDescanso(plano) {
    const p = [(plano.tipo === 'longo' ? 'Descanso longo' : 'Descanso curto') + ': ' + (plano.n === 1 ? plano.linhas[0].nome + ' descansou' : plano.n + ' descansaram')];
    if (plano.gasto) p.push(plano.gasto + (plano.gasto === 1 ? ' ração gasta' : ' rações gastas'));
    // (as rações que fazem alguma coisa — têm efeito — e quantos as comeram)
    for (const cm of plano.comidas || []) p.push(cm.todos ? 'banquete de ' + (cm.nome || 'uma ração com efeito') + ' para todos'
      : (cm.n === plano.n ? (plano.n === 1 ? 'comeu ' : 'comeram ') : cm.n + (cm.n === 1 ? ' comeu ' : ' comeram ')) + (cm.nome || 'uma ração com efeito'));
    if (plano.falta) p.push('faltaram ' + plano.falta + (plano.falta === 1 ? ' ração' : ' rações'));
    if (plano.rec) p.push('recuperação de ' + plano.rec + '%');
    if (plano.conf) p.push('Conforto ' + comSinal(plano.conf));
    if (plano.clima) p.push('noite de ' + plano.clima.nome.toLocaleLowerCase('pt-BR'));      // (lote 7, parte 5c)
    if (plano.san) p.push('Sanidade ' + comSinal(plano.san));
    // (o descanso que não tira os bônus fica anotado: é a exceção)
    if (plano.tiraBonus === false) p.push('os bônus “até o próximo descanso” continuam');
    return p.join(' · ');
  }
  /* Onde cada um fica em volta da fogueira quando ninguém arrastou: um arco na frente do fogo, da esquerda para a
     direita. Devolve { x, y } em % do palco. */
  /* Os lugares de quem ainda não foi arrastado. Até sete: um arco de frente para o fogo. Com mais gente: a fila da
     frente em arco e uma fila atrás, aberta no meio para a fogueira continuar aparecendo. */
  const r1 = v => Math.round(v * 10) / 10;
  function lugarPadrao(i, n) {
    if (n <= 1) return { x: 50, y: 82 };
    const arco = (j, m, rx, cy) => { const a = Math.PI - (Math.PI / (m + 1)) * (j + 1); return { x: r1(50 + rx * Math.cos(a)), y: r1(cy + 12 * Math.sin(a)) }; };
    if (n <= 7) return arco(i, n, Math.min(34, 14 + n * 4.5), 70);
    const frente = Math.ceil(n / 2), tras = n - frente;
    if (i < frente) return arco(i, frente, 34, 72);
    const j = i - frente, esq = Math.ceil(tras / 2);
    return j < esq ? { x: r1(14 + 24 * (j + 0.5) / esq), y: 61 } : { x: r1(62 + 24 * (j - esq + 0.5) / (tras - esq)), y: 61 };
  }
  /* A menor distância entre duas pessoas, em px da cena de 1600×900 (para saber até onde os retratos podem crescer). */
  function folga(lugares) {
    let d = Infinity;
    for (let a = 0; a < lugares.length; a++) for (let b = a + 1; b < lugares.length; b++) d = Math.min(d, Math.hypot((lugares[a].x - lugares[b].x) * 16, (lugares[a].y - lugares[b].y) * 9));
    return d;
  }
  const ALVO_TODOS = () => ({ todos: true, pers: [], grupos: [] });
  const item = (tipo, nome) => {
    if (tipo === 'provisoes') return { id: novoId('pv'), nome: nome || '', qtd: 1, ef: { conf: 0, san: 0, rec: 0 }, fx: [], todos: false };
    if (tipo === 'melhorias') return { id: novoId('ml'), nome: nome || '', desc: '', on: true, ef: Object.assign({}, EF_ZERO), alvo: ALVO_TODOS(), fx: [] };
    if (tipo === 'equipamentos') return { id: novoId('eq'), nome: nome || '', desc: '', on: true, qtd: 1, ef: Object.assign({}, EF_ZERO), alvo: ALVO_TODOS(), fx: [] };
    if (tipo === 'bonus') return { id: novoId('bn'), nome: nome || '', desc: '', ateDescanso: false };
    if (tipo === 'fx') return { id: novoId('fx'), t: 'bonus', k: 'FOR', v: 1, dur: 'descanso' };
    if (tipo === 'veiculos') return { id: novoId('vc'), nome: nome || '', tipo: 'carroca', cap: 0, estado: '', nota: '' };
    if (tipo === 'carga') return { id: novoId('cg'), nome: nome || '', qtd: 1, peso: 0, veiculo: null };
    if (tipo === 'gente') return { id: novoId('gt'), nome: nome || '', papel: '', veiculo: null, nota: '' };
    // uma construção do catálogo (nome = o tipo): no nível simples, com o que cada nível faz por padrão
    if (tipo === 'construcao') {
      const e = estrutura(nome); if (!e) return null;
      const nv = [0, 1, 2].map(i => padraoDoNivel(e.k, i));
      return { id: novoId('ml'), nome: e.nome, desc: e.desc, on: true, ef: copia(nv[0].ef), alvo: ALVO_TODOS(), fx: copia(nv[0].fx), tipo: e.k, nivel: 1, nv };
    }
    return null;
  };
  // em que área está cada um (sem nada anotado: na fogueira), e as construções em uso desenhadas numa área
  const areaDe = (camp, id) => camp.area[id] || 'fogueira';
  const construcoes = (camp, area) => camp.melhorias.filter(m => m.tipo && m.on && estrutura(m.tipo).area === area);

  /* ---- quem mexe no quê ----
     O mestre mexe em tudo. O jogador a quem o mestre deu o acampamento (no menu da mesa, em Permissões) mexe em quase
     tudo — provisões, estrutura, caravana, os lugares e as áreas, o diário —; estas partes ficam com o mestre (o banco
     confere: o gatilho privado.acamp_guarda recusa a gravação de quem não mestra que mude alguma delas). */
  const SO_MESTRE = ['nome', 'hora', 'fundo', 'cena', 'presentes', 'autoVistos', 'roda', 'regras', 'bonus', 'emo', 'lugar', 'clima'];
  // a mudança de antes para depois mexe em alguma parte que é só do mestre?
  const mexeNoMestre = (antes, depois) => SO_MESTRE.some(k => JSON.stringify(antes[k]) !== JSON.stringify(depois[k]));
  /* O que o jogador grava: o documento como está no banco (cru), com as partes dele trocadas pelas do acampamento
     novo. As partes do mestre vão exatamente como estão lá — mesmo as que esta versão do site arrumaria diferente. */
  function paraJogador(cru, novo) {
    const out = ehObj(cru) ? copia(cru) : {};
    for (const k of Object.keys(novo)) if (!SO_MESTRE.includes(k)) out[k] = copia(novo[k]);
    return out;
  }

  const AcampNucleo = { HORAS, REGRAS_PADRAO, normalizar: normalizarSeguro, efeitos, efeitosDe, alcanca, fxDe, temParaAlguns, temEfeito, racoes, textoEfeitos, comSinal, planejar, aposDescanso, resumoDescanso,
    textoFx, tmpDoFx, barraPeloNome, EMOCOES, emocao, emoOk, TIPOS_VEICULO, cargaDe, lugarPadrao, folga, AREA, item, novoId, copia, limitar,
    LUGARES, CLIMAS, CLIMA_MUNDO, AREAS, CATEGORIAS, NIVEIS, ESTRUTURAS, estrutura, areaDe, construcoes, chaveRaca, quantoCome, SO_MESTRE, mexeNoMestre, paraJogador,
    FAD_MAX, paraDaEspecial };
  if (typeof module === 'object' && module && module.exports) module.exports = AcampNucleo;
  if (typeof window !== 'undefined') window.AcampNucleo = AcampNucleo;
})();
