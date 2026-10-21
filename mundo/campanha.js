/* Tiny Cats · Mapa-múndi · a campanha (lote 12): as contas, sem página e sem DOM.
   (parte 12a) O dia da campanha: as regras (as do mestre, ou as de começo; sem os meses do mestre, os de inverno vêm da
   estação do calendário), onde cada exército está (na terra da facção dele, de uma aliada, de uma facção em guerra com
   a dele, sem dono, alheia ou neutra) e o que vale em cada dia que passou: o reabastecimento do estoque de comida da
   facção (na terra dela e das aliadas, até o teto de dias), a forragem (na terra inimiga, sem dono ou alheia: a % do que
   ele come; a região produz menos naquela semana), comer e o desgaste (a fome em qualquer lugar; o terreno duro e o
   inverno só fora das terras da facção e das aliadas: em casa, o exército se abriga). Tudo
   vira uma proposta: o mestre desmarca o que não vale e aplica num passo de Desfazer.
   (parte 12c) A cura: no dia, cada exército cura a % do HP que falta na tropa ferida de cada unidade — a soma da cura das
   unidades de médicos e alquimistas (em qualquer lugar) e a da Enfermaria da cidade onde ele está (o hexágono dela ou
   um colado, na terra da facção dele ou de uma aliada). O desgaste sai do HP das unidades (as tropas morrem uma a uma).
   (parte 12b) A ocupação: quem controla a região (quem ocupa, ou a dona), as fortificações de pé, a contagem dos dias
   (para ocupar: um exército de uma facção em guerra com a dona, sem exército da dona nem de uma aliada dela e sem
   fortificação de pé dela; para libertar a ocupada: um exército da dona ou de uma aliada, sem o de quem ocupa nem de uma
   aliada dela) e as propostas do dia (ocupar, libertar; a desmarcada recomeça a contagem); anexar, devolver e as
   notícias para o Jornal.
   Roda no navegador (window.MundoCampanha) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const DD = () => (typeof window !== 'undefined' && window.MundoDiplomacia) || (typeof require === 'function' ? require('./diplomacia.js') : null);
  const RR = () => (typeof window !== 'undefined' && window.MundoReino) || (typeof require === 'function' ? require('./reino.js') : null);
  const CC = () => (typeof window !== 'undefined' && window.MundoCorte) || (typeof require === 'function' ? require('./corte.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const arred2 = n => Math.round(n * 100) / 100 || 0;
  const facDe = (m, id) => (id && ehObj(m) && Array.isArray(m.faccoes) ? m.faccoes.find(f => f.id === id) || null : null);

  /* ---------------- as regras ---------------- */
  // os meses de inverno pela estação do calendário (o primeiro e o último do ano, num ano de 12 meses)
  function mesesDeInverno(m) { const N = NN(), ms = N.mesesDe(ehObj(m) ? m.cal : null); return ms.map((_, i) => i).filter(i => N.estacaoDoMes(i, ms.length) === 'inverno'); }
  // as regras que valem: as do mestre, ou as de começo (os meses de inverno, sem os do mestre, pela estação)
  function regrasDe(m) {
    const N = NN(), r = ehObj(m) && ehObj(m.guerra) && ehObj(m.guerra.regras) ? m.guerra.regras : null;
    const out = Object.assign({}, N.CAMPANHA_PADRAO, r || {});
    out.duros = (r ? r.duros : N.CAMPANHA_PADRAO.duros).slice();
    out.meses = r && Array.isArray(r.meses) ? r.meses.slice() : mesesDeInverno(m);
    return out;
  }
  // o recurso de comida da economia (o primeiro com o papel "comida"), ou null sem a economia ligada
  function recComida(m) {
    const e = ehObj(m) && ehObj(m.eco) && m.eco.on ? m.eco : null, r = e && Array.isArray(e.rec) ? e.rec.find(x => x.papel === 'comida') : null;
    return r ? r.id : null;
  }

  /* ---------------- onde o exército está ---------------- */
  // aliadas: a relação Aliança ou um tratado de aliança valendo hoje
  function aliadas(m, a, b) {
    if (!a || !b || a === b) return false;
    const fa = facDe(m, a), D = DD();
    if (fa && ehObj(fa.rel) && fa.rel[b] === 'alianca') return true;
    return !!D && D.tratadosEntre(m, a, b).some(t => t.tipo === 'alianca' && D.estadoDe(m, t) === 'ativo');
  }
  const emGuerra = (m, a, b) => { const fa = facDe(m, a); return !!(fa && ehObj(fa.rel) && fa.rel[b] === 'guerra'); };
  /* A região (a de mais dentro) e a dona dela, e o que isso é para o exército: 'casa' (a terra da facção dele), 'aliada',
     'inimiga' (de uma facção em guerra com a dele), 'semdono', 'alheia' (de uma facção, e o exército sem facção) ou
     'neutra'. (parte 12b) Na ocupada, dono é quem ocupa (e ocup: true). → { r (o id da região, ou null), dono, tipo, ocup? } */
  function ondeEsta(m, g) {
    const N = NN(), r = N.regiaoEm(m, g.x, g.y), dono = r ? N.controleDaRegiao(m, r) : null;
    const tipo = !dono ? 'semdono' : !g.fac ? 'alheia' : dono === g.fac ? 'casa' : aliadas(m, g.fac, dono) ? 'aliada' : emGuerra(m, g.fac, dono) ? 'inimiga' : 'neutra';
    const out = { r: r ? r.id : null, dono, tipo };
    if (dono && dono !== N.facDaRegiao(m, r)) out.ocup = true;
    return out;
  }
  const REABASTECE = ['casa', 'aliada'], FORRAGEIA = ['inimiga', 'semdono', 'alheia'];
  // o terreno do hexágono do exército, se ele é duro pelas regras (sem a grade, nenhum)
  function terrenoDuro(m, g, rg) {
    const N = NN(), h = N.temGrade(m) ? N.hexDe(m, g.x, g.y) : null, t = h ? N.hexInfo(m, h.q, h.r).terreno : null;
    return t && (rg || regrasDe(m)).duros.includes(t.id) ? t : null;
  }
  // o inverno num dia e num ponto: um mês de inverno (pelas regras) ou a zona do evento Inverno rigoroso
  function invernoEm(m, x, y, dia, rg) {
    const N = NN();
    if ((rg || regrasDe(m)).meses.includes(N.dataDe(m.cal, dia).mes)) return true;
    return N.eventosDoDia(m, dia).some(e => e.tipo === 'inverno' && Math.hypot(x - e.x, y - e.y) <= N.raioNoDia(e, dia));
  }

  /* ---------------- o dia da campanha ----------------
     Os dias que passaram (os "dias" antes de hoje: do "Próximo dia" de domingo para segunda, o domingo), exército por exército (na ordem do mapa: o estoque de comida de uma
     facção vai primeiro para quem vem antes) e dia a dia: na terra da facção ou de uma aliada, o reabastecimento (o que
     falta para a refeição do dia e para o teto de dias; cada mantimento custa "custo" do recurso de comida); na terra
     inimiga, sem dono ou alheia, a forragem (a % do que ele come); comer (sem a refeição inteira, o dia é de fome: a
     moral cai 1 e o contador da fome sobe); e o desgaste do dia (a soma das % da fome, do terreno duro e do inverno, nas
     tropas de cada unidade; o terreno e o inverno só fora das terras da facção e das aliadas). recusadas: o que o mestre
     desmarcou — 'g:<id>' (o exército fica como está), 'reab:<id>',
     'forr:<id>' e 'desg:<id>'; (parte 12b) 'ocup:<região>' e 'lib:<região>'.
     (parte 12c) 'cura:<id>' (sem a cura).
     → { dias, rec (o recurso de comida, ou null), regras, linhas: [{ g, nome, fac, onde, cons, mant0, mant1, fome0, fome1,
     moral0, moral1, fomeDias, reab: { n, gasto } | null, forr: { n, r } | null, desg: { dias: { fome, terreno, inverno },
     ter (o nome do terreno duro), tropas0, tropas1, unid: [{ id, nome, t0, t1, f1 (o que falta na ferida), acaba }] } |
     null, cura: { pct, med (a % dos médicos), enf: { m, nome, pct } | null, hp (o que volta), unid: [{ id, nome, f0, f1 }] }
     | null, curaPct (a % de cura do exército, com ou sem ferida), fora }],
     estoque: { facção: { de, para } }, forr: [{ r, s, n }] (a forragem por região e semana, só com a economia ligada),
     (parte 12b) regioes e pres (a ocupação: ocupacaoNoDia) } */
  function diaDaCampanha(m, dias, recusadas) {
    const N = NN(), R = RR(), rg = regrasDe(m), rec = recComida(m), no = new Set(recusadas || []);
    const n = Math.max(1, Math.min(366, Math.round(Number(dias) || 1))), hoje = ehObj(m.cal) ? Number(m.cal.dia) || 0 : 0;
    const estoque = {}, porForr = new Map(), linhas = [];
    const est = fid => {
      if (!estoque[fid]) { const f = facDe(m, fid), r = f && rec ? (f.rec || []).find(x => x.id === rec) : null, v = r ? Math.max(0, Number(r.n) || 0) : 0; estoque[fid] = { de: v, para: v }; }
      return estoque[fid];
    };
    for (const g of Array.isArray(m.objs) ? m.objs : []) {
      if (!ehObj(g) || g.k !== 'g' || g.tipo !== 'exercito' || !ehObj(g.exe) || g.exe.pub || !g.exe.unid.some(u => u.tropas > 0)) continue;
      const e = g.exe, c = N.consumoDe(e), onde = ondeEsta(m, g), abrigo = REABASTECE.includes(onde.tipo), ter = abrigo ? null : terrenoDuro(m, g, rg);
      const L = { g: g.id, nome: g.nome || 'Exército', fac: g.fac || null, onde, cons: c, mant0: e.mant, mant1: e.mant, fome0: e.fome, fome1: e.fome, moral0: e.moral, moral1: e.moral,
        fomeDias: 0, reab: null, forr: null, desg: null, fora: no.has('g:' + g.id) };
      linhas.push(L);
      if (L.fora) continue;
      const reab = abrigo && !!rec && !!g.fac && !no.has('reab:' + g.id);
      const forr = FORRAGEIA.includes(onde.tipo) && rg.forr > 0 && c > 0 && !no.has('forr:' + g.id);
      let mant = e.mant, fome = e.fome, moral = e.moral, reabN = 0, gasto = 0, forrN = 0, fator = 1;
      const dd = { fome: 0, terreno: 0, inverno: 0 };
      for (let i = 0; i < n; i++) {
        const dia = hoje - n + i;
        // a comida do dia: o reabastecimento (para a refeição e até o teto) ou a forragem
        if (reab && c > 0) {
          const E = est(g.fac), quer = Math.max(0, c + rg.teto * c - mant), pode = rg.custo > 0 ? Math.floor(E.para / rg.custo + 1e-9) : quer, k = Math.min(quer, pode);
          if (k > 0) { mant += k; reabN += k; gasto = arred2(gasto + k * rg.custo); E.para = arred2(E.para - k * rg.custo); }
        }
        if (forr) {
          const k = Math.max(1, Math.round(c * rg.forr / 100));
          mant += k; forrN += k;
          const s = rec && onde.r && onde.dono && R ? R.semanaN(m, dia) : null;
          if (s != null) { const ch = onde.r + '|' + s; porForr.set(ch, arred2((porForr.get(ch) || 0) + k * rg.custo)); }
        }
        // comer
        const comeu = mant >= c;
        mant = comeu ? mant - c : 0;
        if (comeu) fome = 0; else { fome++; moral = Math.max(0, moral - 1); L.fomeDias++; }
        // o desgaste do dia
        const inv = !abrigo && rg.inverno > 0 && invernoEm(m, g.x, g.y, dia, rg), duro = !!ter && rg.terreno > 0, faminto = !comeu && rg.fome > 0;
        if (faminto) dd.fome++;
        if (duro) dd.terreno++;
        if (inv) dd.inverno++;
        const p = (faminto ? rg.fome : 0) + (duro ? rg.terreno : 0) + (inv ? rg.inverno : 0);
        if (p > 0) fator *= Math.max(0, 1 - p / 100);
      }
      Object.assign(L, { mant1: mant, fome1: fome, moral1: moral, reab: reabN > 0 ? { n: reabN, gasto } : null, forr: forrN > 0 ? { n: forrN, r: onde.r } : null });
      // (parte 12c) o desgaste sai do HP da unidade (a soma das tropas): as tropas morrem uma a uma
      let fer = new Map(e.unid.map(u => [u.id, u.tropas > 0 ? u.fer || 0 : 0]));
      if (fator < 1 && !no.has('desg:' + g.id)) {
        const unid = e.unid.map(u => {
          const H = N.hpDaUnidade(u), x = u.tropas > 0 ? N.tropasComHp(u.hpT, Math.round(H.hp * fator)) : { tropas: 0, fer: 0 };
          return { id: u.id, nome: u.nome, t0: u.tropas, t1: x.tropas, f1: x.fer, acaba: u.tropas > 0 && x.tropas === 0 };
        });
        const tropas0 = unid.reduce((s, u) => s + u.t0, 0), tropas1 = unid.reduce((s, u) => s + u.t1, 0);
        if (tropas1 < tropas0 || unid.some(u => u.f1 !== fer.get(u.id))) {
          L.desg = { dias: dd, ter: ter ? ter.nome : '', tropas0, tropas1, unid };
          fer = new Map(unid.map(u => [u.id, u.t1 > 0 ? u.f1 : 0]));
        }
      }
      // (parte 12c) a cura da tropa ferida de cada unidade, dia a dia: a % do HP que falta (pelo menos 1)
      const vivas = id => { const D = L.desg && L.desg.unid.find(x => x.id === id); return D ? D.t1 > 0 : true; };
      const med = Math.min(100, e.unid.reduce((s0, u) => s0 + (u.tropas > 0 && vivas(u.id) ? u.cura || 0 : 0), 0)), enf = enfermariaPerto(m, g);
      const pct = Math.min(100, med + (enf ? enf.pct : 0));
      L.curaPct = pct;
      if (!no.has('cura:' + g.id)) {
        const unid = [];
        for (const u of e.unid) {
          const f0 = fer.get(u.id) || 0;
          if (!(f0 > 0) || !(pct > 0) || !vivas(u.id)) continue;
          let f = f0;
          for (let i = 0; i < n && f > 0; i++) f = Math.max(0, f - Math.max(1, Math.round(f * pct / 100)));
          unid.push({ id: u.id, nome: u.nome, f0, f1: f });
        }
        if (unid.length) L.cura = { pct, med, enf, hp: unid.reduce((s0, x) => s0 + x.f0 - x.f1, 0), unid };
      }
    }
    const forrs = [...porForr].map(([k, v]) => { const [r, s] = k.split('|'); return { r, s: Number(s), n: v }; });
    // (parte 12b) a ocupação (o exército desmarcado continua lá: conta)
    const oc = ocupacaoNoDia(m, n, no, rg);
    return { dias: n, rec, regras: rg, linhas, estoque, forr: forrs, regioes: oc.regioes, pres: oc.pres };
  }
  /* Aplica o dia no rascunho (d, o mapa de App.mudar): os mantimentos, a fome, a moral e as tropas de cada exército (a
     unidade que fica sem ninguém sai), o estoque de comida das facções (com o motivo no histórico) e a forragem da semana.
     (parte 12b) A contagem dos dias da ocupação e as regiões ocupadas e libertadas (as marcadas).
     → quantas coisas mudaram (os exércitos e as regiões) */
  function aplicarDia(d, res) {
    const N = NN(), achar = id => (Array.isArray(d.objs) ? d.objs : []).find(o => ehObj(o) && o.id === id) || null;
    let n = 0;
    for (const L of res.linhas) {
      const g = L.fora ? null : achar(L.g);
      if (!g || !ehObj(g.exe)) continue;
      g.exe.mant = L.mant1; g.exe.fome = L.fome1; g.exe.moral = L.moral1;
      if (L.desg) {
        const por = new Map(L.desg.unid.map(u => [u.id, u]));
        g.exe.unid = g.exe.unid.filter(u => !(por.get(u.id) || {}).acaba).map(u => { const x = por.get(u.id); if (x) { u.tropas = x.t1; u.fer = x.f1 || 0; } return u; });
      }
      // (parte 12c) a cura: o que falta na ferida de cada unidade
      if (L.cura) for (const x of L.cura.unid) { const u = g.exe.unid.find(q => q.id === x.id); if (u) u.fer = x.f1; }
      n++;
    }
    for (const fid of Object.keys(res.estoque)) {
      const E = res.estoque[fid], f = facDe(d, fid);
      if (f && res.rec && E.para !== E.de) N.facMudar(f, 'r:' + res.rec, E.para, ehObj(d.cal) ? d.cal.dia : 0, 'reabastecimento dos exércitos');
    }
    if (res.forr.length) {
      if (!ehObj(d.guerra)) d.guerra = { tipos: [], bats: [], hexes: {} };
      d.guerra.forr = (Array.isArray(d.guerra.forr) ? d.guerra.forr : []).concat(res.forr.map(x => Object.assign({}, x)));
    }
    // (parte 12b) a contagem nova dos dias; ocupar e libertar o que ficou marcado (a contagem dela sai; a da desmarcada
    // também: recomeça do zero)
    const pres = Object.assign({}, res.pres || {}), hoje = ehObj(d.cal) ? d.cal.dia : 0;
    for (const x of res.regioes || []) {
      if (x.tipo !== 'ocupar' && x.tipo !== 'libertar') continue;
      delete pres[x.r];
      const r = regiaoDe(d, x.r);
      if (!r || x.recusado) continue;
      if (x.tipo === 'ocupar') r.ocup = { fac: x.fac, d: hoje }; else delete r.ocup;
      n++;
    }
    const tinha = ehObj(d.guerra) && ehObj(d.guerra.pres) && Object.keys(d.guerra.pres).length;
    if (Object.keys(pres).length || tinha) {
      if (!ehObj(d.guerra)) d.guerra = { tipos: [], bats: [], hexes: {} };
      if (Object.keys(pres).length) d.guerra.pres = pres; else delete d.guerra.pres;
    }
    return n;
  }
  // a forragem de uma semana da economia (s), por região: { região: n } (no recurso de comida)
  function forragemDaSemana(m, s) {
    const out = {};
    for (const x of ehObj(m) && ehObj(m.guerra) && Array.isArray(m.guerra.forr) ? m.guerra.forr : []) if (x.s === s) out[x.r] = arred2((out[x.r] || 0) + x.n);
    return out;
  }

  /* ---------------- (parte 12c) a Enfermaria ---------------- */
  /* A Enfermaria da cidade onde o exército está (o marcador num hexágono a até 1 do dele; sem a grade, perto), na terra
     da facção dele ou de uma aliada: a de maior cura. → { m (o id do marcador), nome, pct } | null */
  function enfermariaPerto(m, g) {
    const N = NN(), R = RR();
    if (!R || !g.fac || !ehObj(m.eco) || !m.eco.on) return null;
    const hg = N.temGrade(m) ? N.hexDe(m, g.x, g.y) : null;
    let melhor = null;
    for (const o of Array.isArray(m.objs) ? m.objs : []) {
      if (!ehObj(o) || o.k !== 'm' || !ehObj(o.ass)) continue;
      const pct = R.curaDoAssentamento(m, o);
      if (!(pct > 0) || (melhor && melhor.pct >= pct)) continue;
      const perto = hg ? N.distHex(hg, N.hexDe(m, o.x, o.y)) <= 1 : Math.hypot(o.x - g.x, o.y - g.y) < 60;
      if (!perto) continue;
      const r = N.regiaoEm(m, o.x, o.y), dono = r ? N.controleDaRegiao(m, r) : null;
      if (!dono || !doLado(m, g.fac, dono)) continue;
      melhor = { m: o.id, nome: String(o.nome || '').trim() || 'a cidade', pct };
    }
    return melhor;
  }

  /* ---------------- (parte 12b) a ocupação ---------------- */
  const regiaoDe = (m, id) => (id && ehObj(m) && Array.isArray(m.objs) ? m.objs.find(o => ehObj(o) && o.k === 'r' && o.id === id) || null : null);
  /* As fortificações de pé de uma região nas mãos da dona: os marcadores dela (a região de mais dentro deles é esta) com a
     fortificação ainda com HP — ou, sem a fortificação, com a defesa das construções (a Paliçada, a Muralha) —, que outra
     facção não ocupa */
  function fortesDePe(m, r) {
    const N = NN(), R = RR(), dono = N.facDaRegiao(m, r), out = [];
    for (const o of ehObj(m) && Array.isArray(m.objs) ? m.objs : []) {
      if (!ehObj(o) || o.k !== 'm' || !N.dentroPoligono([o.x, o.y], r.pts)) continue;
      const aqui = N.regiaoEm(m, o.x, o.y);
      if (!aqui || aqui.id !== r.id || (ehObj(o.ocup) && o.ocup.fac && o.ocup.fac !== dono)) continue;
      if (ehObj(o.estr) ? o.estr.hp > 0 : !!(R && R.defDoAssentamento(m, o) > 0)) out.push(o);
    }
    return out;
  }
  // do lado de x: a própria x ou uma aliada dela
  const doLado = (m, f, x) => f === x || aliadas(m, f, x);
  // as facções com exército (com tropas) em cada região, a de mais dentro → Map
  function presencas(m) {
    const N = NN(), out = new Map();
    for (const g of Array.isArray(m.objs) ? m.objs : []) {
      if (!ehObj(g) || g.k !== 'g' || g.tipo !== 'exercito' || !g.fac || !ehObj(g.exe) || g.exe.pub || !g.exe.unid.some(u => u.tropas > 0)) continue;
      const r = N.regiaoEm(m, g.x, g.y);
      if (!r) continue;
      if (!out.has(r.id)) out.set(r.id, []);
      if (!out.get(r.id).includes(g.fac)) out.get(r.id).push(g.fac);
    }
    return out;
  }
  /* A ocupação no dia da campanha (os "dias" que passaram): em cada região com exército (a de mais dentro), quem conta
     os dias seguidos — para ocupar, uma facção em guerra com a dona (a primeira, na ordem do mapa), sem exército da dona
     nem de uma aliada dela e sem fortificação de pé dela; para libertar a ocupada, a dona ou uma aliada, sem o exército de
     quem ocupa nem de uma aliada dela. Com os dias das regras (ocupar), a proposta. no: as recusas ('ocup:<região>',
     'lib:<região>'). → { regioes: [{ r, tipo ('ocupar' | 'libertar' | 'conta' | 'forte'), lib, fac (quem conta), dono,
     quem (quem ocupa, ao libertar), n, de, forte (o marcador de pé), recusado (só na proposta) }], pres (a contagem nova:
     só onde ela continua) } */
  function ocupacaoNoDia(m, dias, no, rg) {
    const N = NN(), pres0 = ehObj(m.guerra) && ehObj(m.guerra.pres) ? m.guerra.pres : {}, pres = {}, regioes = [], de = (rg || regrasDe(m)).ocupar;
    no = no || new Set();
    for (const [rid, facs] of presencas(m)) {
      const r = regiaoDe(m, rid), dono = r ? N.facDaRegiao(m, r) : null, oc = r && ehObj(r.ocup) && r.ocup.fac ? r.ocup : null, p0 = pres0[rid];
      if (!r || !dono) continue;
      if (oc) {
        const y = facs.find(f => doLado(m, f, dono));
        if (!y || facs.some(f => doLado(m, f, oc.fac))) continue;
        const n = (p0 && p0.lib ? p0.n : 0) + dias;
        pres[rid] = { fac: y, n, lib: true };
        regioes.push({ r: rid, tipo: n >= de ? 'libertar' : 'conta', lib: true, fac: y, dono, quem: oc.fac, n: Math.min(n, de), de, recusado: n >= de && no.has('lib:' + rid) });
        continue;
      }
      const x = facs.find(f => emGuerra(m, f, dono));
      if (!x || facs.some(f => doLado(m, f, dono))) continue;
      const fortes = fortesDePe(m, r);
      if (fortes.length) { regioes.push({ r: rid, tipo: 'forte', lib: false, fac: x, dono, n: 0, de, forte: fortes[0].id, recusado: false }); continue; }
      const n = (p0 && !p0.lib && p0.fac === x ? p0.n : 0) + dias;
      pres[rid] = { fac: x, n };
      regioes.push({ r: rid, tipo: n >= de ? 'ocupar' : 'conta', lib: false, fac: x, dono, n: Math.min(n, de), de, recusado: n >= de && no.has('ocup:' + rid) });
    }
    return { regioes, pres };
  }
  // (à mão) a contagem dos dias da região sai junto
  const semContagem = (d, rid) => { if (ehObj(d.guerra) && ehObj(d.guerra.pres)) delete d.guerra.pres[rid]; };
  // anexar a ocupada (no rascunho): a dona passa a ser quem ocupa → a facção nova, ou null
  function anexar(d, rid) { const r = regiaoDe(d, rid), oc = r && ehObj(r.ocup) ? r.ocup.fac : null; if (!oc) return null; r.fac = oc; delete r.ocup; semContagem(d, rid); return oc; }
  // devolver (ou tirar à mão) a ocupação, no rascunho → se havia
  function devolver(d, rid) { const r = regiaoDe(d, rid); if (!r || !r.ocup) return false; delete r.ocup; semContagem(d, rid); return true; }
  // ocupar à mão, no rascunho: a terra de uma facção; fac, que não é a dona (nem quem já ocupa) → se mudou
  function ocupar(d, rid, fac) {
    const N = NN(), r = regiaoDe(d, rid), dono = r ? N.facDaRegiao(d, r) : null;
    if (!r || !dono || !fac || !facDe(d, fac) || dono === fac || (ehObj(r.ocup) && r.ocup.fac === fac)) return false;
    r.ocup = { fac, d: ehObj(d.cal) ? Number(d.cal.dia) || 0 : 0 };
    semContagem(d, rid);
    return true;
  }
  /* A paz: as regiões ocupadas entre as duas facções (a de uma, ocupada pela outra), na ordem do mapa → [{ r, nome, dono,
     quem }] */
  function terrasEntre(m, a, b) {
    const N = NN(), out = [];
    for (const r of ehObj(m) && Array.isArray(m.objs) ? m.objs : []) {
      if (!ehObj(r) || r.k !== 'r' || !ehObj(r.ocup) || !r.ocup.fac) continue;
      const dono = N.facDaRegiao(m, r), quem = r.ocup.fac;
      if ((dono === a && quem === b) || (dono === b && quem === a)) out.push({ r: r.id, nome: nomeRg(r), dono, quem });
    }
    return out;
  }
  // o que fica das terras na paz, no rascunho: escolhas = [{ r, anexar }] (sem anexar: devolve) → quantas mudaram
  function terrasNaPaz(d, escolhas) { let n = 0; for (const x of escolhas || []) if (x.anexar ? anexar(d, x.r) : devolver(d, x.r)) n++; return n; }
  /* as notícias para o rascunho do Jornal (o mestre revisa lá antes de publicar): { tit, txt }. dia: o dia do mapa (sem
     ele, hoje) */
  const nomeRg = r => (r ? String(r.nome || '').trim() || 'Região sem nome' : 'a região');
  const nomeFc = (m, id) => { const f = facDe(m, id); return f ? String(f.nome || '').trim() || 'Facção sem nome' : 'uma facção'; };
  const quando = (m, dia) => {
    const N = NN(), C = CC(), cal = ehObj(m) ? m.cal : null, x = N.dataDe(cal, dia == null ? (ehObj(cal) ? cal.dia : 0) : dia), t = C ? C.dataTxt(m, { a: x.ano, m: x.mes, d: x.diaMes }) : '';
    return t ? ' (' + t + ')' : '';
  };
  function noticiaOcupacao(m, rid, fac, dia) {
    const r = regiaoDe(m, rid), dono = r ? NN().facDaRegiao(m, r) : null;
    return { tit: nomeRg(r) + ' ocupada por ' + nomeFc(m, fac), txt: 'As tropas de ' + nomeFc(m, fac) + ' ocupam ' + nomeRg(r) + (dono ? ', terra de ' + nomeFc(m, dono) : '') + quando(m, dia) + '.' };
  }
  // por: quem libertou (a dona, ou uma aliada dela)
  function noticiaLibertacao(m, rid, quem, por, dia) {
    const r = regiaoDe(m, rid), dono = r ? NN().facDaRegiao(m, r) : null, com = por && por !== dono ? 'Com as tropas de ' + nomeFc(m, por) + ', ' : '';
    return { tit: nomeRg(r) + ' livre de novo', txt: com + nomeFc(m, dono) + ' retoma ' + nomeRg(r) + (quem ? ', que estava ocupada por ' + nomeFc(m, quem) : '') + quando(m, dia) + '.' };
  }
  // (antes de anexar: a região ainda ocupada)
  function noticiaAnexacao(m, rid, dia) {
    const r = regiaoDe(m, rid), oc = r && ehObj(r.ocup) ? r.ocup.fac : null, dono = r ? NN().facDaRegiao(m, r) : null;
    return { tit: nomeFc(m, oc) + ' anexa ' + nomeRg(r), txt: nomeRg(r) + (dono ? ', que era de ' + nomeFc(m, dono) + ',' : '') + ' passa a ser de ' + nomeFc(m, oc) + quando(m, dia) + '.' };
  }
  // o parágrafo das terras para a notícia da paz (antes de aplicar): escolhas = [{ r, anexar }] → '' sem nenhuma
  function textoTerrasNaPaz(m, escolhas) {
    const N = NN(), partes = [];
    for (const x of escolhas || []) {
      const r = regiaoDe(m, x.r), oc = r && ehObj(r.ocup) ? r.ocup.fac : null;
      if (!oc) continue;
      partes.push(nomeRg(r) + (x.anexar ? ' passa a ser de ' + nomeFc(m, oc) : ' volta para ' + nomeFc(m, N.facDaRegiao(m, r))));
    }
    return partes.length ? '**As terras ocupadas:** ' + partes.join('; ') + '.' : '';
  }

  const MundoCampanha = { mesesDeInverno, regrasDe, recComida, aliadas, emGuerra, ondeEsta, REABASTECE, FORRAGEIA, terrenoDuro, invernoEm, diaDaCampanha, aplicarDia, forragemDaSemana, enfermariaPerto,
    fortesDePe, presencas, ocupacaoNoDia, anexar, devolver, ocupar, terrasEntre, terrasNaPaz, noticiaOcupacao, noticiaLibertacao, noticiaAnexacao, textoTerrasNaPaz };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoCampanha;
  if (typeof window !== 'undefined') window.MundoCampanha = MundoCampanha;
})();
