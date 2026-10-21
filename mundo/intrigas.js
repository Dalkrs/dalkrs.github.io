/* Tiny Cats · Mapa-múndi · as intrigas e os segredos (lote 11, parte 4): as contas, sem página e sem DOM.
   O modelo (mapa.intr, normalizado no núcleo): os segredos (o texto, de quem é — um personagem, uma casa, uma facção, um
   título, um tratado, uma região ou um lugar do mapa; sem dono, um segredo do mundo —, quem sabe — personagens e
   facções —, se os jogadores sabem, se é boato e se é falso, e a nota do mestre).
   Aqui: o dono de um segredo e o nome dele, as escolhas de dono de cada tipo (para o cartão), as facções ligadas a um
   segredo (para o filtro da aba) e a notícia para o rascunho do Jornal quando o mestre revela um segredo.
   (parte 4b) As intrigas (o nome, o estado, quem trama — personagens e/ou uma facção —, os alvos, o objetivo, os passos,
   os segredos que usa, quem já sabe, o texto para os jogadores e se eles veem): os textos da lista (quem trama, os
   alvos, os passos), as que usam um segredo, as facções de uma intriga (para o filtro), as em andamento (para a prévia
   da semana) e mostrar as escolhidas na semana.
   Roda no navegador (window.MundoIntrigas) e no Node (testes). */
(() => {
  'use strict';
  const NN = () => (typeof window !== 'undefined' && window.MundoNucleo) || (typeof require === 'function' ? require('./nucleo.js') : null);
  const CC = () => (typeof window !== 'undefined' && window.MundoCorte) || (typeof require === 'function' ? require('./corte.js') : null);
  const DD = () => (typeof window !== 'undefined' && window.MundoDiplomacia) || (typeof require === 'function' ? require('./diplomacia.js') : null);
  const ehObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const VAZIA = { segredos: [], intrigas: [] };
  const intrDe = m => (ehObj(m) && ehObj(m.intr) ? m.intr : VAZIA);
  const segredoDe = (m, id) => (id ? intrDe(m).segredos.find(s => s.id === id) || null : null);
  // os tipos de dono, na ordem do cartão
  const TIPOS_DONO = { p: 'Personagem', c: 'Casa', f: 'Facção', t: 'Título', tr: 'Tratado', r: 'Região', m: 'Lugar do mapa' };
  const facDe = (m, id) => (ehObj(m) && Array.isArray(m.faccoes) && id ? m.faccoes.find(f => f.id === id) || null : null);
  const objDe = (m, k, id) => (ehObj(m) && Array.isArray(m.objs) && id ? m.objs.find(o => o.k === k && o.id === id) || null : null);
  // o dono de um segredo (o personagem, a casa, a facção, o título, o tratado, a região ou o marcador); null sem ele
  function donoDe(m, de) {
    if (!ehObj(de)) return null;
    const C = CC();
    if (de.t === 'p') return C.pessoaDe(m, de.id);
    if (de.t === 'c') return C.casaDe(m, de.id);
    if (de.t === 'f') return facDe(m, de.id);
    if (de.t === 't') return C.tituloDe(m, de.id);
    if (de.t === 'tr') return DD().tratadoDe(m, de.id);
    return objDe(m, de.t, de.id);
  }
  // o nome do dono: o do personagem, o da casa, o da facção, o do título ("Reino de Aldar"), o do tratado ("Aliança:
  // Aldar, Ilhas"), o da região e o do lugar (o marcador sem nome: o do ícone); '' sem dono
  function nomeDoDono(m, de) {
    const x = donoDe(m, de);
    if (!x) return '';
    const N = NN(), nome = String(x.nome || '').trim();
    if (de.t === 't') return CC().nomeDoTitulo(m, x);
    if (de.t === 'tr') return DD().nomeDoTipo(m, x) + ': ' + x.partes.map(id => { const f = facDe(m, id); return f ? String(f.nome || '').trim() || 'Facção sem nome' : 'uma facção'; }).join(', ');
    if (de.t === 'm') return nome || (N.ICONES[x.ic] || N.ICONES.cidade).nome;
    return nome || (de.t === 'f' ? 'Facção sem nome' : de.t === 'r' ? 'Região sem nome' : de.t === 'c' ? 'Casa sem nome' : 'Sem nome');
  }
  // as escolhas de dono de um tipo, para o cartão: [[id, nome]] (os personagens em ordem alfabética; os outros, na ordem do mapa)
  function opcoesDeDono(m, t) {
    const C = CC(), par = x => [x.id, nomeDoDono(m, { t, id: x.id })];
    if (t === 'p') return C.corteDe(m).pessoas.map(par).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    if (t === 'c') return C.corteDe(m).casas.map(par);
    if (t === 'f') return (ehObj(m) && Array.isArray(m.faccoes) ? m.faccoes : []).map(par);
    if (t === 't') return C.corteDe(m).titulos.map(par);
    if (t === 'tr') return DD().diplDe(m).tratados.map(par);
    if (t === 'r' || t === 'm') return (ehObj(m) && Array.isArray(m.objs) ? m.objs : []).filter(o => o.k === t).map(par);
    return [];
  }
  /* As facções ligadas a um dono (a do personagem; as dos membros da casa; a própria facção; o reino do título; as partes
     do tratado; a dona da região e a do lugar), postas em out (um Set) */
  function facsDoDono(m, de, out) {
    const N = NN(), C = CC(), x = donoDe(m, de), t = de && de.t;
    if (x && t === 'p') out.add(x.fac);
    if (x && t === 'c') for (const p of C.membrosDe(m, x.id)) out.add(p.fac);
    if (x && t === 'f') out.add(x.id);
    if (x && t === 't') out.add(x.fac);
    if (x && t === 'tr') for (const f of x.partes) out.add(f);
    if (x && t === 'r') out.add(N.facDaRegiao(m, x));
    if (x && t === 'm') { const r = N.regiaoEm(m, x.x, x.y); if (r) out.add(N.facDaRegiao(m, r)); }
    return out;
  }
  // as facções ligadas a um segredo (para o filtro da aba): as do dono e as que sabem → Set
  function facsDoSegredo(m, s) {
    const out = facsDoDono(m, s.de, new Set(s.sabem.f));
    out.delete(null);
    return out;
  }
  /* A notícia para o rascunho do Jornal quando o mestre revela um segredo (ele revisa lá antes de publicar): o título diz
     se é boato e de quem é; o texto é o segredo. → { tit, txt } */
  function noticiaSegredo(m, s) {
    const dono = nomeDoDono(m, s.de);
    return { tit: (s.boato ? 'Um boato' : 'Um segredo revelado') + (dono ? ': ' + dono : ''), txt: s.txt };
  }

  /* ---------------- (parte 4b) as intrigas ---------------- */
  const ESTADOS = { plano: 'Planejando', andamento: 'Em andamento', descoberta: 'Descoberta', concluida: 'Concluída', fracassou: 'Fracassou' };
  const TIPOS_ALVO = { p: 'Personagem', c: 'Casa', f: 'Facção', t: 'Título', r: 'Região', m: 'Lugar do mapa' };
  const intrigaDe = (m, id) => (id ? intrDe(m).intrigas.find(x => x.id === id) || null : null);
  const nomeDaIntriga = x => x.nome || 'Intriga sem nome';
  const juntar = l => (l.length <= 1 ? l.join('') : l.slice(0, -1).join(', ') + ' e ' + l[l.length - 1]);
  // quem trama ("Isolda, Otão e Aldar": os personagens e a facção) e os alvos ("Reino do Vale e Otão"), em texto
  const quemTramaTxt = (m, x) => juntar(x.quem.p.map(id => nomeDoDono(m, { t: 'p', id })).concat(x.quem.f ? [nomeDoDono(m, { t: 'f', id: x.quem.f })] : []).filter(Boolean));
  const alvosTxt = (m, x) => juntar(x.alvos.map(a => nomeDoDono(m, a)).filter(Boolean));
  // os passos feitos: "2 de 5 passos" ('' sem passos)
  const passosTxt = x => (x.passos.length ? x.passos.filter(y => y.feito).length + ' de ' + x.passos.length + (x.passos.length === 1 ? ' passo' : ' passos') : '');
  // as intrigas que usam um segredo
  const intrigasQueUsam = (m, sid) => intrDe(m).intrigas.filter(x => x.segredos.includes(sid));
  // as facções ligadas a uma intriga (para o filtro): a facção por trás, as de quem trama, as dos alvos e as que sabem → Set
  function facsDaIntriga(m, x) {
    const out = new Set(x.sabem.f);
    if (x.quem.f) out.add(x.quem.f);
    for (const id of x.quem.p) facsDoDono(m, { t: 'p', id }, out);
    for (const a of x.alvos) facsDoDono(m, a, out);
    out.delete(null);
    return out;
  }
  // as intrigas em andamento (a prévia da semana lembra o mestre)
  const intrigasEmAndamento = m => intrDe(m).intrigas.filter(x => x.estado === 'andamento');
  /* Mostrar aos jogadores as intrigas escolhidas na prévia da semana (ids), no rascunho (o mapa de App.mudar): só as em
     andamento, com o texto para eles. → quantas passaram a ser vistas */
  function mostrarIntrigas(m, ids) {
    const l = new Set(Array.isArray(ids) ? ids : []);
    let n = 0;
    for (const x of intrigasEmAndamento(m)) if (l.has(x.id) && !x.ver && x.txtJ) { x.ver = true; n++; }
    return n;
  }

  const MundoIntrigas = { intrDe, segredoDe, TIPOS_DONO, donoDe, nomeDoDono, opcoesDeDono, facsDoSegredo, noticiaSegredo,
    ESTADOS, TIPOS_ALVO, intrigaDe, nomeDaIntriga, quemTramaTxt, alvosTxt, passosTxt, intrigasQueUsam, facsDaIntriga, intrigasEmAndamento, mostrarIntrigas };
  if (typeof module === 'object' && module && module.exports) module.exports = MundoIntrigas;
  if (typeof window !== 'undefined') window.MundoIntrigas = MundoIntrigas;
})();
