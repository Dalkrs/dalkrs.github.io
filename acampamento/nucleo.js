/* Tiny Cats · Acampamento: a lógica pura (sem página, sem DOM).
   O modelo do acampamento, os efeitos da estrutura, as provisões e a conta do descanso. Roda igual no navegador
   (window.AcampNucleo) e no Node (testes).

   O acampamento da mesa:
     nome, hora ('entardecer' | 'noite' | 'amanhecer'), fundo ({ url } | null), cena (id da cena tática | null)
     presentes [idDoPersonagem], autoVistos [ids já chamados sozinhos], lugares { id: { x, y } } (em % do palco)
     roda [{ id, nome, img, dono }] — quem está em volta da fogueira, do jeito que os jogadores podem ver
     provisoes [{ id, nome, qtd }]              cada unidade é uma ração; a ordem é a ordem em que são gastas
     melhorias [{ id, nome, desc, on, ef }]     ef = { conf, san, rec, prov }: o que soma ao descanso longo
     equipamentos [{ id, nome, desc, on, qtd, ef }]
     bonus [{ id, nome, desc, ateDescanso }]    bônus declarados pela mesa (texto); os "até o descanso" saem ao descansar
     regras { longo, curto, semProv }           longo/curto: { rec %, prov por personagem, conf, san, poderes }
                                                semProv: { rec % do que recuperaria, conf } quando faltam rações
     diario [{ id, t (ms), texto }]             os mais novos primeiro; no máximo 60 */
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
  const normRegra = (r, p) => { r = ehObj(r) ? r : {}; return { rec: inteiro(r.rec, p.rec, 0, 100), prov: inteiro(r.prov, p.prov, 0, 99), conf: inteiro(r.conf, p.conf, -100, 100), san: inteiro(r.san, p.san, -100, 100), poderes: r.poderes === undefined ? p.poderes : !!r.poderes }; };
  const listaDe = (v, max) => (Array.isArray(v) ? v.filter(ehObj).slice(0, max) : []);

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
    return {
      v: 1,
      nome: texto(a.nome, MAX_NOME).trim() || 'Acampamento',
      hora: HORAS.includes(a.hora) ? a.hora : 'noite',
      fundo,
      cena: idOk(a.cena) || null,
      presentes: ids(a.presentes), autoVistos: ids(a.autoVistos), lugares,
      roda: listaDe(a.roda, 200).map(r => ({ id: idOk(r.id), nome: texto(r.nome, MAX_NOME), img: typeof r.img === 'string' && /^https:\/\//.test(r.img) ? r.img.slice(0, 500) : null, dono: typeof r.dono === 'string' ? r.dono.slice(0, 64) : null })).filter(r => r.id),
      provisoes: unicos(listaDe(a.provisoes, MAX_ITENS).map(p => ({ id: p.id, nome: texto(p.nome, MAX_NOME), qtd: inteiro(p.qtd, 0, 0, 9999) })), 'pv'),
      melhorias: unicos(listaDe(a.melhorias, MAX_ITENS).map(m => ({ id: m.id, nome: texto(m.nome, MAX_NOME), desc: texto(m.desc), on: m.on !== false, ef: normEf(m.ef) })), 'ml'),
      equipamentos: unicos(listaDe(a.equipamentos, MAX_ITENS).map(m => ({ id: m.id, nome: texto(m.nome, MAX_NOME), desc: texto(m.desc), on: m.on !== false, qtd: inteiro(m.qtd, 1, 0, 999), ef: normEf(m.ef) })), 'eq'),
      bonus: unicos(listaDe(a.bonus, MAX_ITENS).map(b => ({ id: b.id, nome: texto(b.nome, MAX_NOME), desc: texto(b.desc), ateDescanso: !!b.ateDescanso })), 'bn'),
      regras: { longo: normRegra(reg.longo, REGRAS_PADRAO.longo), curto: normRegra(reg.curto, REGRAS_PADRAO.curto), semProv: { rec: inteiro(sp.rec, REGRAS_PADRAO.semProv.rec, 0, 100), conf: inteiro(sp.conf, REGRAS_PADRAO.semProv.conf, -100, 100) } },
      diario: unicos(listaDe(a.diario, MAX_DIARIO).map(d => ({ id: d.id, t: Math.max(0, num(d.t, 0)), texto: texto(d.texto) })), 'di'),
    };
  }
  function normalizarSeguro(x) { try { return normalizar(x); } catch (e) { return normalizar(null); } }

  /* O que a estrutura em uso soma ao descanso longo. */
  function efeitos(camp) {
    const t = Object.assign({}, EF_ZERO);
    for (const m of camp.melhorias.concat(camp.equipamentos)) if (m.on) for (const k in t) t[k] += m.ef[k] || 0;
    return t;
  }
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
       pessoas     [{ id, nome, recursos: [{ id, nome, max, atual, min?, inicio? }], san, conf (número ou null = a ficha não usa),
                      poderes: [{ id, nome, atual, max }] }] — só quem vai descansar
     Devolve o plano: o que cada um recupera, as rações gastas (de quais provisões) e os avisos.
     Só o descanso longo usa a estrutura (melhorias e equipamentos) e gasta provisões pela regra "por personagem". */
  function planejar(camp, tipo, pessoas) {
    const longo = tipo !== 'curto', regra = camp.regras[longo ? 'longo' : 'curto'], ef = longo ? efeitos(camp) : Object.assign({}, EF_ZERO);
    const n = pessoas.length, disponivel = racoes(camp);
    const custo = n ? Math.max(0, regra.prov * n + ef.prov) : 0;
    const gasto = Math.min(custo, disponivel), falta = custo - gasto;
    const consumo = [];
    let resta = gasto;
    for (const p of camp.provisoes) { if (resta <= 0) break; const q = Math.min(p.qtd, resta); if (q > 0) { consumo.push({ id: p.id, nome: p.nome, qtd: q }); resta -= q; } }
    let rec = Math.max(0, regra.rec + ef.rec), conf = regra.conf + ef.conf;
    const san = regra.san + ef.san;
    if (falta > 0) { rec = rec * camp.regras.semProv.rec / 100; conf += camp.regras.semProv.conf; }
    const linhas = pessoas.map(p => {
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
    });
    return { tipo: longo ? 'longo' : 'curto', n, custo, disponivel, gasto, falta, consumo, rec: Math.round(rec * 10) / 10, conf, san, linhas, efeitos: ef };
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
  const item = (tipo, nome) => {
    if (tipo === 'provisoes') return { id: novoId('pv'), nome: nome || '', qtd: 1 };
    if (tipo === 'melhorias') return { id: novoId('ml'), nome: nome || '', desc: '', on: true, ef: Object.assign({}, EF_ZERO) };
    if (tipo === 'equipamentos') return { id: novoId('eq'), nome: nome || '', desc: '', on: true, qtd: 1, ef: Object.assign({}, EF_ZERO) };
    if (tipo === 'bonus') return { id: novoId('bn'), nome: nome || '', desc: '', ateDescanso: false };
    return null;
  };

  const AcampNucleo = { HORAS, REGRAS_PADRAO, normalizar: normalizarSeguro, efeitos, racoes, textoEfeitos, comSinal, planejar, aposDescanso, resumoDescanso, lugarPadrao, folga, AREA, item, novoId, copia, limitar };
  if (typeof module === 'object' && module && module.exports) module.exports = AcampNucleo;
  if (typeof window !== 'undefined') window.AcampNucleo = AcampNucleo;
})();
