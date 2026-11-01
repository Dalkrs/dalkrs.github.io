/* ---------------------------------------------------------------
   10gb. O MISTÉRIO NA CENA (lote 53) — o bloco "Mistério" do "Gerar um lugar…" (em qualquer lugar) e as marcas de pista.
   · Com o bloco ligado, ao criar a cena: um caso do Escudo do mestre (ou um caso novo, sorteado na hora e guardado no
     Escudo) entra na cena — o corpo coberto (ou os papéis revirados, quando não há corpo) no lugar do crime, e uma marca
     de pista oculta para cada vestígio e cada documento do caso, perto de onde ele costuma ficar: o que é "na porta",
     na porta mais perto; "sobre a mesa", na mesa; "na lareira", na lareira; "do lado de fora", longe dali. Os
     testemunhos não viram marca (são dos suspeitos, no interrogatório).
   · A marca de pista guarda o caso e a pista (t.mist). Dois cliques nela (ou o menu, ou o painel) revelam a marca e
     entregam a pista à mesa — ela vai para as Pistas de quem joga, no caso. Se o caso ainda não está aberto à mesa, a
     marca é revelada e o aviso diz como abrir. Tudo com Desfazer.
   · Fora de uma mesa, o caso sorteado fica só nesta cena (a verdade nas notas do corpo; a pista nas notas da marca).
   --------------------------------------------------------------- */
const Misterio = (() => {
  const M = () => (window.TC && window.TC.misterio) || null;
  const D = () => { try { return window.TC && TC.dados && TC.dados.disponivel && TC.dados.disponivel() ? TC.dados.col('documentos') : null; } catch (e) { return null; } };
  const vivo = (d, id) => { const l = d && d.pegar(id); return l && !l.apagado ? l : null; };
  const SEM_CORPO = new Set(['roubo', 'desaparecimento', 'incubo', 'sombras']);

  // os casos do Escudo que podem ir para uma cena (os em aberto primeiro, os mais novos antes)
  function casos() {
    const d = D(), m = M();
    if (!d || !m) return [];
    return d.todas().filter(l => !l.apagado && typeof l.id === 'string' && l.id.startsWith(m.PRE.caso)).map(l => ({ id: l.id.slice(m.PRE.caso.length), c: m.normCaso(l.dados) }))
      .filter(x => m.idOk(x.id)).sort((a, b) => ((a.c.estado === 'resolvido') - (b.c.estado === 'resolvido')) || String(b.c.em || '').localeCompare(String(a.c.em || '')));
  }
  const prefs = () => { const o = App.opt; return { on: o.genMist === true, caso: typeof o.genMistCaso === 'string' ? o.genMistCaso : '', tipo: M() && M().TIPOS[o.genMistTipo] ? o.genMistTipo : 'assassinato' }; };
  function controles(K, mudou) {
    const m = M();
    if (!m) return null;
    const pr = prefs(), lista = casos(), set = (k, v) => { App.opt[k] = v; if (mudou) mudou(); };
    if (pr.caso && !lista.some(x => x.id === pr.caso)) pr.caso = '';
    const escolhido = pr.caso ? lista.find(x => x.id === pr.caso).c : null;
    const marcas = escolhido ? escolhido.pistas.filter(p => p.jeito !== 'testemunho').length : 6;
    return h('div', { class: 'ger-mist', id: 'ger-mist' },
      K.toggle('ger-mist-on', pr.on, v => set('genMist', v), 'Pôr um mistério na cena (o corpo e as pistas, ocultos)'),
      pr.on ? h('div', { class: 'ger-pov-op' },
        K.field('O caso', K.inSelect('ger-mist-caso', pr.caso, [['', 'Sortear um caso novo']].concat(lista.map(x => [x.id, x.c.titulo + ' · ' + m.TIPOS[x.c.tipo].n + (x.c.estado === 'resolvido' ? ' (resolvido)' : '')])), v => set('genMistCaso', v)), 'stack'),
        !pr.caso ? K.field('O tipo do caso novo', K.seg('ger-mist-tipo', pr.tipo, m.ORDEM_TIPOS.map(t => [t, m.TIPOS[t].n]), v => set('genMistTipo', v)), 'stack') : null,
        K.note(escolhido ? `${marcas} ${marcas === 1 ? 'marca de pista' : 'marcas de pista'} (os vestígios e os documentos de “${escolhido.titulo}”), ${SEM_CORPO.has(escolhido.tipo) ? 'o lugar revirado' : 'o corpo coberto'} no lugar do crime. Os testemunhos ficam com os suspeitos, no Escudo.`
          : D() ? 'O caso novo é sorteado ao criar a cena e fica guardado no Escudo do mestre (aba Mistérios), com os suspeitos e todas as pistas.'
            : 'Fora de uma mesa, o caso fica só nesta cena: a verdade nas notas do corpo e cada pista nas notas da marca.')) : null);
  }

  /* ---- onde pôr: um quadrado livre perto de (x, y), em quadrados ---- */
  function livrePerto(sc, x, y, rMin, rMax, r, ocup) {
    const c = sc.cell, segs = sc.walls.map(w => [w.x1 / c, w.y1 / c, w.x2 / c, w.y2 / c]);
    const perto = (a, b) => segs.some(([p1, p2, p3, p4]) => Geo.distSeg(a, b, p1, p2, p3, p4) < 0.6);
    for (let t = 0; t < 160; t++) {
      const ang = r() * Math.PI * 2, d = rMin + r() * (rMax - rMin), i = Math.floor(x + Math.cos(ang) * d), j = Math.floor(y + Math.sin(ang) * d);
      if (i < 1 || j < 1 || i >= sc.cols - 1 || j >= sc.rows - 1 || ocup.has(i + ',' + j) || perto(i + 0.5, j + 0.5)) continue;
      ocup.add(i + ',' + j); return [i, j];
    }
    const i = Math.max(1, Math.min(sc.cols - 2, Math.floor(x))), j = Math.max(1, Math.min(sc.rows - 2, Math.floor(y)));
    ocup.add(i + ',' + j); return [i, j];
  }
  // o lugar do crime: o que o gerador marcou, ou perto de uma mesa, cama, balcão ou altar, ou o meio da cena
  function lugarDoCrime(sc, p, r) {
    const c = sc.cell;
    if (p && Array.isArray(p.cena) && p.cena.length === 2) return [p.cena[0], p.cena[1]];
    const alvo = sc.tokens.filter(t => ['mesa', 'cama', 'balcao', 'altar', 'sarcofago', 'fogueira', 'bau'].includes(t.prop));
    if (alvo.length) { const t = alvo[Math.floor(r() * alvo.length)]; return [t.x / c + t.size / 2, t.y / c + t.size + 0.5]; }
    return [sc.cols / 2, sc.rows / 2];
  }
  function ancora(sc, onde, crime, r) {
    const c = sc.cell, [cx, cy] = crime;
    const maisPerto = lista => lista.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0] || null;
    const deProp = ids => maisPerto(sc.tokens.filter(t => ids.includes(t.prop)).map(t => [t.x / c + t.size / 2, t.y / c + t.size / 2]));
    const deParede = k => maisPerto(sc.walls.filter(w => w.k === k).map(w => [(w.x1 + w.x2) / 2 / c, (w.y1 + w.y2) / 2 / c]));
    let a = null, raio = [1, 2.5];
    if (onde === 'porta') { a = deParede('door') || deProp(['portao']); raio = [0.6, 1.6]; }
    else if (onde === 'janela') { a = deParede('window'); raio = [0.6, 1.6]; }
    else if (onde === 'mesa') { a = deProp(['mesa', 'balcao', 'altar']); raio = [0.8, 1.8]; }
    else if (onde === 'lareira') { a = deProp(['lareira', 'fogueira', 'braseiro', 'fornalha']); raio = [0.8, 2]; }
    else if (onde === 'estante') { a = deProp(['estante']); raio = [0.8, 1.8]; }
    else if (onde === 'bau') { a = deProp(['bau', 'cofre', 'caixote', 'sarcofago']); raio = [0.8, 1.8]; }
    else if (onde === 'jardim') { return { pt: [cx, cy], raio: [6, 11] }; }
    return { pt: a || [cx, cy], raio: a ? raio : [1, 3] };
  }

  /* Põe o caso na cena que acabou de nascer. o: prefs(). → o texto do que entrou (para o aviso) */
  function aplicar(sc, lugar, p, o) {
    const m = M();
    if (!m || !o || !o.on) return '';
    const d = D(), r = mulberry(((p && p.seed) || 11) ^ 0x51ed27);
    let cid = null, caso = null;
    if (o.caso && d) { const l = vivo(d, m.PRE.caso + o.caso); if (l) { cid = o.caso; caso = m.normCaso(l.dados); } }
    let novo = false;
    if (!caso) {
      caso = m.gerarCaso({ tipo: o.tipo, n: 4, lugar: sc.name }, 1 + Math.floor(r() * 2147483000), { npc: window.TC && window.TC.npc });
      caso.em = new Date().toISOString();
      try { const est = window.TC && TC.ponte && TC.ponte.estado; caso.camp = est && est.campanha ? est.campanha.id : null; } catch (e) { caso.camp = null; }
      if (d) cid = m.novoId('c');
      novo = true;
    }
    const c = sc.cell, ocup = new Set(sc.tokens.map(t => Math.floor(t.x / c) + ',' + Math.floor(t.y / c)));
    const crime = lugarDoCrime(sc, p, r);
    // o corpo coberto, ou os papéis revirados
    const semCorpo = SEM_CORPO.has(caso.tipo);
    const [bx, by] = livrePerto(sc, crime[0], crime[1], 0, 1.5, r, ocup);
    const corpo = Props.novo(sc, semCorpo ? 'papeis' : 'corpo', bx * c, by * c, semCorpo ? 1 : 2, true);
    corpo.name = semCorpo ? 'O lugar revirado' : 'O corpo (' + caso.verdade.vitima + ')';
    corpo.mist = { c: cid, p: null };
    const cul = m.culpado(caso);
    corpo.notes = [caso.titulo + ' — ' + m.TIPOS[caso.tipo].n + '.', 'Vítima: ' + caso.verdade.vitima + '.'].concat(m.conclusoes(caso).map(k => m.CONCLUSOES[k] + ': ' + (k === 'quem' ? (cul ? cul.nome : '—') : caso.verdade[k] || '—'))).concat(cid ? ['O caso inteiro está no Escudo do mestre (aba Mistérios).'] : caso.suspeitos.map(s => 'Suspeito: ' + s.nome + ' — ' + s.aparencia + ' Álibi: ' + s.alibi + (s.mente ? ' (mente)' : ''))).join('\n').slice(0, 2000);
    sc.tokens.push(corpo);
    // as marcas de pista: os vestígios e os documentos
    let n = 0;
    for (const pi of caso.pistas) {
      if (pi.jeito === 'testemunho') continue;
      const an = ancora(sc, pi.onde, crime, r), [x, y] = livrePerto(sc, an.pt[0], an.pt[1], an.raio[0], an.raio[1], r, ocup);
      const t = Props.novo(sc, 'pista', x * c, y * c, 1, true);
      t.size = 0.7; t.x += c * 0.15; t.y += c * 0.15;
      const curto = pi.txt.replace(/[.!].*$/, ''); t.name = 'Pista: ' + (curto.length > 46 ? curto.slice(0, 46).replace(/\s+\S*$/, '') + '…' : curto);
      t.notes = (pi.txt + (pi.falsa ? '\n(É a pista falsa: aponta um inocente.)' : '') + '\nDois cliques: revelar e entregar à mesa.').slice(0, 2000);
      t.mist = { c: cid, p: pi.id };
      sc.tokens.push(t);
      pi.cena = { sc: sc.id, tok: t.id };
      n++;
    }
    caso.cenaId = sc.id;
    if (d && cid) d.gravar(m.PRE.caso + cid, { dados: m.normCaso(caso), vis: 'mestre' });
    Persist.scene(sc.id);
    return `Mistério: ${novo ? 'o caso novo “' + caso.titulo + '”' + (cid ? ' (guardado no Escudo)' : '') : '“' + caso.titulo + '”'}, ${semCorpo ? 'o lugar revirado' : 'o corpo'} e ${n} ${n === 1 ? 'marca de pista' : 'marcas de pista'} (ocultos).`;
  }

  /* ---- revelar uma marca de pista e entregar a pista à mesa ---- */
  const ehPista = t => !!(t && t.prop === 'pista' && t.mist && t.mist.p);
  function revelar(t) {
    if (!isGM() || !ehPista(t)) return;
    t = Store.get('tokens', t.id) || t;
    const m = M(), d = D();
    const l = m && d && t.mist.c ? vivo(d, m.PRE.caso + t.mist.c) : null;
    const caso = l ? m.normCaso(l.dados) : null, pi = caso ? caso.pistas.find(x => x.id === t.mist.p) : null;
    if (pi && pi.entregue && !t.hidden) { UI.toast('Essa pista já foi entregue à mesa.'); return; }
    const antes = caso ? [[m.PRE.caso + t.mist.c, d.pegar(m.PRE.caso + t.mist.c)], [m.idPub(t.mist.c, caso.camp), vivo(d, m.idPub(t.mist.c, caso.camp))]].map(([id, x]) => [id, x ? JSON.parse(JSON.stringify({ dados: x.dados, vis: x.vis })) : null]) : [];
    const fezTx = !!t.hidden;
    if (fezTx) Store.tx('Revelar a pista', () => Store.upd('tokens', t.id, { hidden: false }));
    let msg = 'Marca revelada: “' + t.name.replace(/^Pista: /, '') + '”.';
    if (caso && pi) {
      const novo = m.entregar(caso, pi.id);
      d.gravar(m.PRE.caso + t.mist.c, { dados: novo, vis: 'mestre' });
      if (novo.aberto) { d.gravar(m.idPub(t.mist.c, novo.camp), { dados: m.projetar(t.mist.c, novo, (vivo(d, m.idPub(t.mist.c, novo.camp)) || {}).dados), vis: 'mesa' }); msg = 'Pista entregue à mesa: o grupo a vê nas Pistas, no caso “' + novo.titulo + '”.'; }
      else msg += ' O caso “' + novo.titulo + '” ainda não está aberto à mesa: abra no Escudo do mestre (aba Mistérios) para a pista ir para as Pistas.';
    } else if (t.mist.c) msg += ' O caso dessa marca não está mais no Escudo.';
    UI.toast(msg, { long: true, key: 'mist-rev', action: 'Desfazer', run: () => {
      if (fezTx) Tools.undo();
      for (const [id, x] of antes) { if (x) d.gravar(id, x); else if (vivo(d, id)) d.apagar(id); }
    } });
  }
  return { casos, controles, prefs, aplicar, revelar, ehPista, SEM_CORPO };
})();
