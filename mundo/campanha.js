/* Tiny Cats · Mapa-múndi · a campanha (lote 12): as contas, sem página e sem DOM.
   (parte 12a) O dia da campanha: as regras (as do mestre, ou as de começo; sem os meses do mestre, os de inverno vêm da
   estação do calendário), onde cada exército está (na terra da facção dele, de uma aliada, de uma facção em guerra com
   a dele, sem dono, alheia ou neutra) e o que vale em cada dia que passou: o reabastecimento do estoque de comida da
   facção (na terra dela e das aliadas, até o teto de dias), a forragem (na terra inimiga, sem dono ou alheia: a % do que
   ele come; a região produz menos naquela semana), comer e o desgaste (a fome em qualquer lugar; o terreno duro e o
   inverno só fora das terras da facção e das aliadas: em casa, o exército se abriga). Tudo
   vira uma proposta: o mestre desmarca o que não vale e aplica num passo de Desfazer.
   Roda no navegador (window.MundoCampanha) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const DD = () => (typeof window !== 'undefined' && window.MundoDiplomacia) || (typeof require === 'function' ? require('./diplomacia.js') : null);
  const RR = () => (typeof window !== 'undefined' && window.MundoReino) || (typeof require === 'function' ? require('./reino.js') : null);
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
     'neutra'. → { r (o id da região, ou null), dono, tipo } */
  function ondeEsta(m, g) {
    const N = NN(), r = N.regiaoEm(m, g.x, g.y), dono = r ? N.facDaRegiao(m, r) : null;
    const tipo = !dono ? 'semdono' : !g.fac ? 'alheia' : dono === g.fac ? 'casa' : aliadas(m, g.fac, dono) ? 'aliada' : emGuerra(m, g.fac, dono) ? 'inimiga' : 'neutra';
    return { r: r ? r.id : null, dono, tipo };
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
     'forr:<id>' e 'desg:<id>'.
     → { dias, rec (o recurso de comida, ou null), regras, linhas: [{ g, nome, fac, onde, cons, mant0, mant1, fome0, fome1,
     moral0, moral1, fomeDias, reab: { n, gasto } | null, forr: { n, r } | null, desg: { dias: { fome, terreno, inverno },
     ter (o nome do terreno duro), tropas0, tropas1, unid: [{ id, nome, t0, t1, acaba }] } | null, fora }],
     estoque: { facção: { de, para } }, forr: [{ r, s, n }] (a forragem por região e semana, só com a economia ligada) } */
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
      if (fator < 1 && !no.has('desg:' + g.id)) {
        const unid = e.unid.map(u => { const t1 = u.tropas > 0 ? Math.round(u.tropas * fator) : 0; return { id: u.id, nome: u.nome, t0: u.tropas, t1, acaba: u.tropas > 0 && t1 === 0 }; });
        const tropas0 = unid.reduce((s, u) => s + u.t0, 0), tropas1 = unid.reduce((s, u) => s + u.t1, 0);
        if (tropas1 < tropas0) L.desg = { dias: dd, ter: ter ? ter.nome : '', tropas0, tropas1, unid };
      }
    }
    const forrs = [...porForr].map(([k, v]) => { const [r, s] = k.split('|'); return { r, s: Number(s), n: v }; });
    return { dias: n, rec, regras: rg, linhas, estoque, forr: forrs };
  }
  /* Aplica o dia no rascunho (d, o mapa de App.mudar): os mantimentos, a fome, a moral e as tropas de cada exército (a
     unidade que fica sem ninguém sai), o estoque de comida das facções (com o motivo no histórico) e a forragem da semana.
     → quantos exércitos mudaram */
  function aplicarDia(d, res) {
    const N = NN(), achar = id => (Array.isArray(d.objs) ? d.objs : []).find(o => ehObj(o) && o.id === id) || null;
    let n = 0;
    for (const L of res.linhas) {
      const g = L.fora ? null : achar(L.g);
      if (!g || !ehObj(g.exe)) continue;
      g.exe.mant = L.mant1; g.exe.fome = L.fome1; g.exe.moral = L.moral1;
      if (L.desg) {
        const por = new Map(L.desg.unid.map(u => [u.id, u]));
        g.exe.unid = g.exe.unid.filter(u => !(por.get(u.id) || {}).acaba).map(u => { const x = por.get(u.id); if (x) u.tropas = x.t1; return u; });
      }
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
    return n;
  }
  // a forragem de uma semana da economia (s), por região: { região: n } (no recurso de comida)
  function forragemDaSemana(m, s) {
    const out = {};
    for (const x of ehObj(m) && ehObj(m.guerra) && Array.isArray(m.guerra.forr) ? m.guerra.forr : []) if (x.s === s) out[x.r] = arred2((out[x.r] || 0) + x.n);
    return out;
  }

  const MundoCampanha = { mesesDeInverno, regrasDe, recComida, aliadas, emGuerra, ondeEsta, REABASTECE, FORRAGEIA, terrenoDuro, invernoEm, diaDaCampanha, aplicarDia, forragemDaSemana };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoCampanha;
  if (typeof window !== 'undefined') window.MundoCampanha = MundoCampanha;
})();
