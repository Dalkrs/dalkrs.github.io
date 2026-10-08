/* Tiny Cats · Acampamento: a lógica pura (sem página, sem DOM).
   O modelo do acampamento, os efeitos da estrutura, as provisões e a conta do descanso. Roda igual no navegador
   (window.AcampNucleo) e no Node (testes).

   O acampamento da mesa:
     nome, hora ('entardecer' | 'noite' | 'amanhecer'), fundo ({ url } | null), cena (id da cena tática | null)
     presentes [idDoPersonagem], autoVistos [ids já chamados sozinhos], lugares { id: { x, y } } (em % do palco)
     roda [{ id, nome, img, dono, emo? }] — quem está em volta da fogueira, do jeito que os jogadores podem ver
     provisoes [{ id, nome, qtd, ef, fx }]      cada unidade é uma ração; a ordem é a ordem em que são gastas.
                                                ef = { conf, san, rec }: o que muda no descanso de quem come esta;
                                                fx: o que ela faz na ficha de quem come (ver EFEITO, abaixo)
     melhorias [{ id, nome, desc, on, ef, alvo, fx }]   ef = { conf, san, rec, prov }: o que soma ao descanso longo;
                                                alvo = { todos, pers: [ids], grupos: [nomes] }: para quem vale (as rações
                                                — prov — valem para o acampamento inteiro); fx: o que faz na ficha deles
     equipamentos [{ id, nome, desc, on, qtd, ef, alvo, fx }]
     bonus [{ id, nome, desc, ateDescanso }]    bônus declarados pela mesa (texto); os "até o descanso" saem ao descansar
     regras { longo, curto, semProv }           longo/curto: { rec %, prov por personagem, conf, san, poderes }
                                                semProv: { rec % do que recuperaria, conf } quando faltam rações
     servir { longo, curto }                    a provisão que cada descanso serve primeiro (id, ou null: a ordem da lista)
     emo { [id]: emoção }                       a emoção de cada um, sem mesa (numa mesa ela fica na ficha: estado.emo)
     caravana { veiculos, carga, gente, vai }   ver normCaravana
     diario [{ id, t (ms), texto }]             os mais novos primeiro; no máximo 60

   EFEITO na ficha (fx), um por linha:
     { id, t: 'bonus', k (chave do bônus: FOR, DFF, FOGO…), v, dur: 'descanso' | 'rodadas', r (rodadas) }
     { id, t: 'barra', b (nome da barra), val ("20", "-5", "2d6+3") }
     { id, t: 'sob',   b (nome da barra), v (sobrevida) } */
(() => {
  'use strict';
  const MAX_ITENS = 80, MAX_DIARIO = 60, MAX_TXT = 600, MAX_NOME = 80;
  const HORAS = ['entardecer', 'noite', 'amanhecer'];
  const REGRAS_PADRAO = {
    longo: { rec: 100, prov: 1, conf: 10, san: 5, poderes: true },
    curto: { rec: 25, prov: 0, conf: 0, san: 0, poderes: false },
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
  const normRegra = (r, p) => { r = ehObj(r) ? r : {}; return { rec: inteiro(r.rec, p.rec, 0, 100), prov: inteiro(r.prov, p.prov, 0, 99), conf: inteiro(r.conf, p.conf, -100, 100), san: inteiro(r.san, p.san, -100, 100), poderes: r.poderes === undefined ? p.poderes : !!r.poderes }; };
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
    const provisoes = unicos(listaDe(a.provisoes, MAX_ITENS).map(p => ({ id: p.id, nome: texto(p.nome, MAX_NOME), qtd: inteiro(p.qtd, 0, 0, 9999), ef: normEfRacao(p.ef), fx: normFx(p.fx) })), 'pv');
    const sv = ehObj(a.servir) ? a.servir : {}, servida = v => { const id = idOk(v); return id && provisoes.some(p => p.id === id) ? id : null; };
    const emo = {};
    if (ehObj(a.emo)) for (const k of Object.keys(a.emo).slice(0, 200)) { const e = emoOk(a.emo[k]); if (idOk(k) && e) emo[k] = e; }
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
      melhorias: unicos(listaDe(a.melhorias, MAX_ITENS).map(m => ({ id: m.id, nome: texto(m.nome, MAX_NOME), desc: texto(m.desc), on: m.on !== false, ef: normEf(m.ef), alvo: normAlvo(m.alvo), fx: normFx(m.fx) })), 'ml'),
      equipamentos: unicos(listaDe(a.equipamentos, MAX_ITENS).map(m => ({ id: m.id, nome: texto(m.nome, MAX_NOME), desc: texto(m.desc), on: m.on !== false, qtd: inteiro(m.qtd, 1, 0, 999), ef: normEf(m.ef), alvo: normAlvo(m.alvo), fx: normFx(m.fx) })), 'eq'),
      bonus: unicos(listaDe(a.bonus, MAX_ITENS).map(b => ({ id: b.id, nome: texto(b.nome, MAX_NOME), desc: texto(b.desc), ateDescanso: !!b.ateDescanso })), 'bn'),
      regras: { longo: normRegra(reg.longo, REGRAS_PADRAO.longo), curto: normRegra(reg.curto, REGRAS_PADRAO.curto), semProv: { rec: inteiro(sp.rec, REGRAS_PADRAO.semProv.rec, 0, 100), conf: inteiro(sp.conf, REGRAS_PADRAO.semProv.conf, -100, 100) } },
      servir: { longo: servida(sv.longo), curto: servida(sv.curto) },
      emo,
      caravana: normCaravana(a.caravana),
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
       pessoas     [{ id, nome, grupo?, recursos: [{ id, nome, max, atual, min?, inicio? }], san, conf (número ou null = a ficha
                      não usa), poderes: [{ id, nome, atual, max }] }] — só quem vai descansar
       opt         { servir: id | null (a provisão servida neste descanso; sem vir, a do descanso), prov: rações por pessoa
                     neste descanso (sem vir, a da regra) }
     Devolve o plano: o que cada um recupera, as rações gastas (de quais provisões) e os avisos.
     Só o descanso longo usa a estrutura (melhorias e equipamentos). As rações saem primeiro da provisão servida e
     depois da lista, de cima para baixo; quem come a servida (os primeiros, enquanto ela der) ganha o efeito dela.
     Cada linha traz também fx: o que vai para a ficha (o efeito da ração e o da estrutura), para quem chama aplicar. */
  function planejar(camp, tipo, pessoas, opt) {
    const longo = tipo !== 'curto', regra = Object.assign({}, camp.regras[longo ? 'longo' : 'curto']), ef = longo ? efeitos(camp) : Object.assign({}, EF_ZERO);
    if (opt && opt.prov != null && Number.isFinite(num(opt.prov, NaN))) regra.prov = inteiro(opt.prov, regra.prov, 0, 99);
    const n = pessoas.length, disponivel = racoes(camp);
    const custo = n ? Math.max(0, regra.prov * n + ef.prov) : 0;
    const gasto = Math.min(custo, disponivel), falta = custo - gasto;
    const idServ = opt && opt.servir !== undefined ? opt.servir : camp.servir[longo ? 'longo' : 'curto'];
    const servida = idServ ? camp.provisoes.find(x => x.id === idServ) || null : null;
    // a fila das rações: a provisão servida primeiro, depois a lista de cima para baixo
    const fila = servida ? [servida].concat(camp.provisoes.filter(x => x !== servida)) : camp.provisoes;
    const consumo = [];
    let resta = gasto;
    for (const p of fila) { if (resta <= 0) break; const q = Math.min(p.qtd, resta); if (q > 0) { consumo.push({ id: p.id, nome: p.nome, qtd: q }); resta -= q; } }
    /* O que cada um come: a porção de cada pessoa (a regra diz quantas rações) sai da fila, na ordem da roda. Quem come
       uma ração com efeito ganha o efeito dela — da servida ou da que veio pela ordem da lista; quem come duas
       diferentes ganha os dois (cada tipo conta uma vez). Rações a mais ou a menos da estrutura não mudam quem come o
       quê: são do acampamento. */
    const porcoes = [];
    for (let i = 0, fi = 0, tirado = 0; i < n; i++) {
      const come = [];
      for (let quer = regra.prov; quer > 0 && fi < fila.length;) {
        const pv = fila[fi], tem = pv.qtd - tirado;
        if (tem <= 0) { fi++; tirado = 0; continue; }
        const q = Math.min(tem, quer), ja = come.find(x => x.p === pv);
        if (ja) ja.qtd += q; else come.push({ p: pv, qtd: q });
        quer -= q; tirado += q;
      }
      porcoes.push(come);
    }
    // quantos comem a provisão servida (para a prévia dizer quando ela não dá para todos)
    const comem = servida ? porcoes.filter(c => c.some(x => x.p === servida)).length : 0;
    let rec = Math.max(0, regra.rec + ef.rec), conf = regra.conf + ef.conf;
    const san = regra.san + ef.san;
    if (falta > 0) { rec = rec * camp.regras.semProv.rec / 100; conf += camp.regras.semProv.conf; }
    const linhas = pessoas.map((p, i) => {
      // o que vale para esta pessoa: a estrutura que a alcança e as rações que ela come
      const come = porcoes[i], eP = longo ? efeitosDe(camp, p) : { conf: 0, san: 0, rec: 0 };
      const eR = come.reduce((a, x) => ({ conf: a.conf + x.p.ef.conf, san: a.san + x.p.ef.san, rec: a.rec + x.p.ef.rec }), { conf: 0, san: 0, rec: 0 });
      let rec = Math.max(0, regra.rec + eP.rec + eR.rec), conf = regra.conf + eP.conf + eR.conf;
      const san = regra.san + eP.san + eR.san;
      if (falta > 0) { rec = rec * camp.regras.semProv.rec / 100; conf += camp.regras.semProv.conf; }
      const fx = [].concat(...come.map(x => x.p.fx.map(f => Object.assign({ de: x.p.nome || 'Ração' }, f)))).concat(longo ? fxDe(camp, p) : []);
      return Object.assign(linhaDoDescanso(p, longo, regra, rec, conf, san), {
        come: come.map(x => ({ id: x.p.id, nome: x.p.nome, qtd: x.qtd, efeito: temEfeito(x.p) })), rec: Math.round(rec * 10) / 10, fx });
    });
    // as rações com efeito que alguém comeu, e quantos comeram cada uma (para o diário e a mesa ao vivo)
    const comidas = [];
    for (const pv of fila) { if (!temEfeito(pv)) continue; const k = porcoes.filter(c => c.some(x => x.p === pv)).length; if (k) comidas.push({ id: pv.id, nome: pv.nome, n: k }); }
    return { tipo: longo ? 'longo' : 'curto', n, custo, disponivel, gasto, falta, consumo, rec: Math.round(rec * 10) / 10, conf, san, linhas, efeitos: ef,
      servida: servida ? { id: servida.id, nome: servida.nome, qtd: servida.qtd, efeito: temEfeito(servida) } : null, comem, comidas, prov: regra.prov };
  }
  // o que uma pessoa recupera, com a recuperação, o Conforto e a Sanidade que valem para ela
  function linhaDoDescanso(p, longo, regra, rec, conf, san) {
    const recursos = (p.recursos || []).filter(r => r.max != null && Number.isFinite(r.max) && r.max > 0).map(r => {
      // min: até onde a barra desce (0, ou negativo na que pode ficar negativa); inicio: onde ela começa (null = cheia)
      const min = Number.isFinite(r.min) && r.min < 0 ? r.min : 0;
      const inicio = r.inicio != null && Number.isFinite(r.inicio) ? limitar(r.inicio, min, r.max) : null;
      const de = limitar(num(r.atual, inicio == null ? r.max : inicio), min, r.max);
      /* A barra que tem um começo próprio (a que nasce em 4 de 20, por exemplo) não "recupera": o descanso longo a
         leva de volta ao começo, de onde ela estiver, e o curto não mexe nela. */
      if (inicio != null) return { id: r.id, nome: r.nome, max: r.max, de, para: longo ? inicio : de, inicio };
      // recuperar 100% (ou mais) é encher a barra, mesmo a que estava abaixo de zero
      const para = rec >= 100 ? r.max : limitar(Math.round((de + Math.ceil(r.max * rec / 100 - 1e-9)) * 10) / 10, min, r.max);
      return { id: r.id, nome: r.nome, max: r.max, de, para: Math.max(de, para) };
    });
    const barra = (v, d) => (v == null ? null : { de: v, para: limitar(v + d, 0, 100) });
    const poderes = regra.poderes ? (p.poderes || []).filter(x => x.max > 0 && x.atual < x.max).map(x => ({ id: x.id, nome: x.nome, de: x.atual, para: x.max })) : [];
    return { id: p.id, nome: p.nome, recursos, san: barra(p.san, san), conf: barra(p.conf, conf), poderes };
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
  // descanso" acabam e o diário ganha a linha. Não muda o que recebeu.
  function aposDescanso(camp, plano, quando) {
    const c = copia(camp);
    for (const g of plano.consumo) { const p = c.provisoes.find(x => x.id === g.id); if (p) p.qtd = Math.max(0, p.qtd - g.qtd); }
    c.bonus = c.bonus.filter(b => !b.ateDescanso);
    c.diario.unshift({ id: novoId('di'), t: quando || Date.now(), texto: resumoDescanso(plano) });
    c.diario = c.diario.slice(0, MAX_DIARIO);
    return normalizarSeguro(c);
  }
  function resumoDescanso(plano) {
    const p = [(plano.tipo === 'longo' ? 'Descanso longo' : 'Descanso curto') + ': ' + (plano.n === 1 ? plano.linhas[0].nome + ' descansou' : plano.n + ' descansaram')];
    if (plano.gasto) p.push(plano.gasto + (plano.gasto === 1 ? ' ração gasta' : ' rações gastas'));
    // (as rações que fazem alguma coisa — têm efeito — e quantos as comeram)
    for (const cm of plano.comidas || []) p.push((cm.n === plano.n ? (plano.n === 1 ? 'comeu ' : 'comeram ') : cm.n + (cm.n === 1 ? ' comeu ' : ' comeram ')) + (cm.nome || 'uma ração com efeito'));
    if (plano.falta) p.push('faltaram ' + plano.falta + (plano.falta === 1 ? ' ração' : ' rações'));
    if (plano.rec) p.push('recuperação de ' + plano.rec + '%');
    if (plano.conf) p.push('Conforto ' + comSinal(plano.conf));
    if (plano.san) p.push('Sanidade ' + comSinal(plano.san));
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
    if (tipo === 'provisoes') return { id: novoId('pv'), nome: nome || '', qtd: 1, ef: { conf: 0, san: 0, rec: 0 }, fx: [] };
    if (tipo === 'melhorias') return { id: novoId('ml'), nome: nome || '', desc: '', on: true, ef: Object.assign({}, EF_ZERO), alvo: ALVO_TODOS(), fx: [] };
    if (tipo === 'equipamentos') return { id: novoId('eq'), nome: nome || '', desc: '', on: true, qtd: 1, ef: Object.assign({}, EF_ZERO), alvo: ALVO_TODOS(), fx: [] };
    if (tipo === 'bonus') return { id: novoId('bn'), nome: nome || '', desc: '', ateDescanso: false };
    if (tipo === 'fx') return { id: novoId('fx'), t: 'bonus', k: 'FOR', v: 1, dur: 'descanso' };
    if (tipo === 'veiculos') return { id: novoId('vc'), nome: nome || '', tipo: 'carroca', cap: 0, estado: '', nota: '' };
    if (tipo === 'carga') return { id: novoId('cg'), nome: nome || '', qtd: 1, peso: 0, veiculo: null };
    if (tipo === 'gente') return { id: novoId('gt'), nome: nome || '', papel: '', veiculo: null, nota: '' };
    return null;
  };

  const AcampNucleo = { HORAS, REGRAS_PADRAO, normalizar: normalizarSeguro, efeitos, efeitosDe, alcanca, fxDe, temParaAlguns, temEfeito, racoes, textoEfeitos, comSinal, planejar, aposDescanso, resumoDescanso,
    textoFx, tmpDoFx, barraPeloNome, EMOCOES, emocao, emoOk, TIPOS_VEICULO, cargaDe, lugarPadrao, folga, AREA, item, novoId, copia, limitar };
  if (typeof module === 'object' && module && module.exports) module.exports = AcampNucleo;
  if (typeof window !== 'undefined') window.AcampNucleo = AcampNucleo;
})();
