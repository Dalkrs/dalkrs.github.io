/* Tiny Cats · Fichas na mesa.
   Com a página aberta dentro do site e uma mesa aberta, as fichas deixam de morar só neste navegador:
     · cada personagem é uma linha da mesa (ficha, skills e estado atual), com dono (jogador) e visibilidade;
     · tabelas base, grupos, situações e tabelas de eventos são documentos da mesa.
   A calculadora continua trabalhando com o mesmo "estado inteiro" de sempre (a variável S). Este arquivo traduz
   esse estado para as linhas da mesa e de volta, pelo gancho de armazenamento que ela já tinha (window.storage).
   Sem mesa (ou com a página aberta sozinha) nada daqui age: vale o que está salvo no navegador. */
const FichasMesa = (() => {
  'use strict';
  const LOCAL = 'urgm_calc_atributos_v1';            // onde a calculadora guarda as fichas sem mesa
  const DOCS = { cfg: 'fichas:cfg', grupos: 'fichas:grupos', situacoes: 'fichas:situacoes', tabelas: 'fichas:tabelas' };
  const VIS = { cfg: 'mesa', grupos: 'mesa', situacoes: 'mestre', tabelas: 'mestre' };
  const j = JSON.stringify;
  let st = null, P = null, D = null, ativo = false, renderPendente = false;
  let sombra = { pcs: new Map(), docs: {} };          // o que a mesa já tem, para mandar só o que mudou

  const mestre = () => !!st && st.papel === 'mestre';
  const podeEditar = pc => !ativo || mestre() || (!!pc && pc._dono === st.eu);
  const ehJogador = id => !!id && (st.membros || []).some(m => m.id === id && m.papel === 'jogador');
  // ficha de jogador: controlada por alguém da mesa que não é o mestre
  const deJogador = pc => ativo && !!pc && ehJogador(pc._dono);

  /* personagem da calculadora ⇄ linha da mesa */
  // A biblioteca de árvores vem da mesa: para o mestre, a original; para o jogador, o pacote publicado.
  const bibDaMesa = () => { const d = D.pegar(mestre() ? 'arvore:biblioteca' : 'arvore:pacote'), b = d && d.dados; return b && Array.isArray(b.arvores) ? b : null; };

  function daLinha(l, antigo, manter) {
    // personagem criado em outra aba (na Árvore) ainda não tem ficha: nasce com a ficha padrão
    // (a de jogador, já em distribuição livre, com os pontos por distribuir)
    const semFicha = !(l.ficha && Object.keys(l.ficha).length);
    /* …mas uma linha que chega sem a ficha nunca apaga a ficha que esta tela já tem (manter): fica a daqui. Sem isso,
       a ficha aberta apareceria em branco, e a primeira coisa digitada nela iria por cima da de verdade. */
    const daqui = semFicha && manter && antigo ? partes(antigo).ficha : null, tem = !!daqui && Object.keys(daqui).length > 3;
    const pc = !semFicha ? Object.assign({}, l.ficha) : tem ? daqui : personagemPadrao(l.nome);
    if (semFicha && !tem && ehJogador(l.dono_id)) FichasExtras.tornarLivre(pc, true);
    pc.id = l.id;
    pc.nome = l.nome || pc.nome || 'Sem nome';
    pc.skills = l.skills && Array.isArray(l.skills.arvores) ? l.skills : { arvores: [], pontos: {}, alocados: {} };
    pc.estado = l.estado && typeof l.estado === 'object' && !Array.isArray(l.estado) ? l.estado : {};
    pc._dono = l.dono_id || null;
    pc._vis = l.vis === 'mesa' ? 'mesa' : 'mestre';
    pc.ultRol = antigo ? antigo.ultRol || null : null;     // a última rolagem mostrada na ficha é só desta tela
    return pc;
  }
  function partes(pc) {
    const ficha = Object.assign({}, pc);
    for (const k of ['id', 'skills', 'estado', '_dono', '_vis', 'ultRol']) delete ficha[k];
    return { nome: String(pc.nome || '').slice(0, 120), ficha, skills: pc.skills || {}, estado: pc.estado || {}, dono_id: pc._dono || null, vis: pc._vis === 'mesa' ? 'mesa' : 'mestre' };
  }
  const retrato = (p, ordem) => ({ nome: p.nome, ficha: j(p.ficha), skills: j(p.skills), estado: j(p.estado), dono: p.dono_id, vis: p.vis, ordem });
  const lerLocal = chave => { try { const v = JSON.parse(localStorage.getItem(chave) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
  const doc = k => { const d = D.pegar(DOCS[k]); return d && d.dados && 'v' in d.dados ? d.dados.v : undefined; };

  /* Monta o estado inteiro a partir da mesa (mais o que é só desta tela, guardado neste navegador). */
  function montar() {
    const tela = lerLocal(KEY) || {};
    const velhos = new Map((tela.personagens || []).map(p => [p.id, p]));
    const linhas = P.todas().sort((a, b) => (a.ordem - b.ordem) || (a.id < b.id ? -1 : 1));
    const s = {
      v: 1,
      cfg: doc('cfg') || estadoPadrao().cfg,
      personagens: linhas.map(l => daLinha(l, velhos.get(l.id))),
      grupos: doc('grupos') || [],
      situacoes: doc('situacoes') || [],
      tabelas: doc('tabelas') || [],
      log: Array.isArray(tela.log) ? tela.log : [],
      bib: bibDaMesa() || tela.bib || null,
      sel: tela.sel || null, selSit: tela.selSit || null, aba: tela.aba || 'fichas',
      alvos: tela.alvos, ultimoAlvo: tela.ultimoAlvo,          // memória dos alvos de disputa: é desta tela
      abaFicha: tela.abaFicha, abaAtr: tela.abaAtr, abaBolsa: tela.abaBolsa, skillsUI: tela.skillsUI, fechados: tela.fechados, filtroTags: tela.filtroTags, ultimaExpr: tela.ultimaExpr,
    };
    sombra = { pcs: new Map(), docs: {} };
    linhas.forEach(l => sombra.pcs.set(l.id, retrato({ nome: l.nome || '', ficha: l.ficha || {}, skills: l.skills || {}, estado: l.estado || {}, dono_id: l.dono_id || null, vis: l.vis || 'mestre' }, l.ordem)));
    // o retrato guarda a ficha como a calculadora a escreveria: assim a primeira gravação não reenvia tudo à toa
    s.personagens.forEach((pc, i) => { const p = partes(pc), r = sombra.pcs.get(pc.id); r.ficha = j(p.ficha); r.skills = j(p.skills); r.estado = j(p.estado); r.nome = p.nome; if (mestre()) r.ordem = linhas[i].ordem; });
    for (const k in DOCS) { const v = doc(k); sombra.docs[k] = v === undefined ? undefined : j(v); }
    sombra.bib = bibDaMesa() ? j(bibDaMesa()) : null;
    return s;
  }

  /* Compara o estado inteiro com o que a mesa já tem e manda só as diferenças. */
  function gravar(s) {
    if (!ativo || !s || !Array.isArray(s.personagens)) return;
    const vistos = new Set();
    s.personagens.forEach((pc, i) => {
      vistos.add(pc.id);
      const ant = sombra.pcs.get(pc.id), novo = !ant;
      if (novo && !mestre()) pc._dono = st.eu;                       // jogador só cria personagem dele
      if (!novo && !mestre() && ant.dono !== st.eu) return;          // ficha de outra pessoa: só consulta
      const p = partes(pc), campos = {}, r = retrato(p, mestre() ? i : (ant ? ant.ordem : i));
      if (novo || ant.nome !== r.nome) campos.nome = p.nome;
      if (novo || ant.ficha !== r.ficha) campos.ficha = p.ficha;
      if (novo || ant.skills !== r.skills) campos.skills = p.skills;
      if (novo || ant.estado !== r.estado) campos.estado = p.estado;
      if (novo || (mestre() && ant.dono !== r.dono)) campos.dono_id = p.dono_id;
      if (novo || (mestre() && ant.vis !== r.vis)) campos.vis = p.vis;
      if (novo || (mestre() && ant.ordem !== i)) campos.ordem = i;
      /* O estado vai como "o que mudou desde o que esta tela tinha" (a sombra): se outra pessoa mexeu em outra barra
         deste personagem nesse meio-tempo, as duas mudanças ficam valendo. */
      if (Object.keys(campos).length) P.gravar(pc.id, campos, !novo && campos.estado !== undefined ? { estado: JSON.parse(ant.estado) } : undefined);
      sombra.pcs.set(pc.id, r);
    });
    if (mestre()) {
      for (const id of [...sombra.pcs.keys()]) if (!vistos.has(id)) { P.apagar(id); sombra.pcs.delete(id); }
      for (const k in DOCS) {
        const v = k === 'cfg' ? s.cfg : (s[k] || []), jv = j(v);
        if (sombra.docs[k] !== jv) { D.gravar(DOCS[k], { dados: { v }, vis: VIS[k] }); sombra.docs[k] = jv; }
      }
    }
  }

  /* Uma mudança que veio da mesa (outra pessoa, outra aba, outro aparelho). */
  function remoto(tipo, l0) {
    if (!ativo) return;
    gravar(S);                                   // primeiro sobe o que acabou de ser digitado aqui
    if (tipo === 'pc') {
      const l = l0.apagado ? l0 : (P.pegar(l0.id) || l0);
      const i = S.personagens.findIndex(p => p.id === l.id);
      if (l.apagado) {
        if (i < 0) return;
        S.personagens.splice(i, 1); sombra.pcs.delete(l.id);
        if (S.sel === l.id) S.sel = S.personagens[0] ? S.personagens[0].id : null;
      } else {
        const pc = daLinha(l, i >= 0 ? S.personagens[i] : null, true), p = partes(pc);
        const r = retrato(p, l.ordem), ant = sombra.pcs.get(l.id);
        if (ant && i >= 0 && ant.nome === r.nome && ant.ficha === r.ficha && ant.skills === r.skills && ant.estado === r.estado && ant.dono === r.dono && ant.vis === r.vis && ant.ordem === r.ordem) return;   // eco do que já está aqui
        /* O personagem que já está na tela é atualizado no lugar (o mesmo objeto): quem está digitando na ficha dele
           continua digitando no personagem de verdade, e o que digitar depois deste aviso não se perde. */
        if (i >= 0) { const alvo = S.personagens[i]; for (const k of Object.keys(alvo)) delete alvo[k]; Object.assign(alvo, pc); }
        else S.personagens.push(pc);
        sombra.pcs.set(l.id, r);
        if (mestre() && (!ant || ant.ordem !== l.ordem)) {
          const ord = id => { const x = sombra.pcs.get(id); return x ? x.ordem : 1e9; };
          S.personagens.sort((a, b) => ord(a.id) - ord(b.id));
        }
        if (!S.sel) S.sel = pc.id;
        if (garantirRelacoes()) save();           // entrou ou mudou de nome um personagem de jogador
      }
    } else {
      if (l0.id === 'arvore:biblioteca' || l0.id === 'arvore:pacote') {       // as árvores mudaram na aba Árvore
        const b = bibDaMesa();
        if (!b || j(b) === sombra.bib) return;
        sombra.bib = j(b); S.bib = JSON.parse(sombra.bib);
        migrar(); guardarTela(); redesenhar();
        return;
      }
      const k = Object.keys(DOCS).find(x => DOCS[x] === l0.id);
      if (!k) return;
      const v = l0.apagado || !l0.dados ? undefined : l0.dados.v, jv = v === undefined ? undefined : j(v);
      if (sombra.docs[k] === jv) return;
      sombra.docs[k] = jv;
      if (k === 'cfg') S.cfg = v || estadoPadrao().cfg; else S[k] = v || [];
    }
    guardarTela();
    redesenhar();
  }
  // Não tira o campo de quem está digitando: o redesenho espera a pessoa sair do campo.
  const digitando = () => { const a = document.activeElement; return !!a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox' && a.type !== 'button' && !!a.closest('#ficha, #mesa, #eventos'); };
  function redesenhar() {
    if (digitando()) {                       // a ficha espera; o elenco, que fica ao lado, já pode se atualizar
      renderPendente = true;
      try { renderLista(); } catch (e) { /* ainda abrindo */ }
      try { pintarAoVivo(); } catch (e) { /* ainda abrindo */ }      // (e os valores das barras, nos campos em que ninguém está)
      return;
    }
    renderPendente = false;
    render();
  }
  document.addEventListener('focusout', () => { if (renderPendente) setTimeout(() => { if (renderPendente && !digitando()) redesenhar(); }, 60); });
  function guardarTela() { try { localStorage.setItem(KEY, j(S)); } catch (e) { /* sem espaço: a mesa continua valendo */ } }

  /* Chamado pela calculadora antes de ler os dados. Devolve true se as fichas vêm da mesa. */
  async function preparar() {
    if (!window.TC || !TC.ponte) return false;
    st = await TC.ponte.pronta;
    if (!TC.dados.disponivel()) return false;
    P = TC.dados.col('personagens'); D = TC.dados.col('documentos');
    await Promise.all([P.pronta, D.pronta]);
    ativo = true;
    KEY = 'tinycats:fichas:' + st.mesa.id;       // cópia desta mesa neste navegador (estado de tela e reserva)
    window.storage = { get: async () => ({ value: j(montar()) }), set: async (k, texto) => { gravar(JSON.parse(texto)); } };
    P.aoMudar(l => remoto('pc', l));
    D.aoMudar(l => remoto('doc', l));
    TC.ponte.aoMudar(e => {
      const antes = j(st && st.membros); st = e;
      if (antes === j(e.membros)) return;
      try { if (digitando()) { renderPendente = true; pintarDono(); renderLista(); } else render(); } catch (x) { /* ainda abrindo */ }
    });
    document.documentElement.classList.add('na-mesa', mestre() ? 'papel-mestre' : 'papel-jogador');
    return true;
  }
  function falhou(e) {
    document.body.insertAdjacentHTML('afterbegin', '<div class="mesa-falha" role="alert"><strong>Não deu para abrir as fichas da mesa.</strong> <span></span> <button type="button">Tentar de novo</button></div>');
    const box = document.querySelector('.mesa-falha');
    box.querySelector('span').textContent = (e && e.message) || '';
    box.querySelector('button').onclick = () => location.reload();
  }

  /* Depois que a calculadora abriu: avisos e limites de quem não é o mestre. */
  function depoisDeAbrir() {
    if (!ativo) return;
    const alvo = document.getElementById('ficha');
    if (alvo) new MutationObserver(limitar).observe(alvo, { childList: true });
    limitar();
    oferecerLocal();
    if (mestre()) {
      // fichas de jogador não seguem a tabela de tiers: as que ainda seguiam passam para a distribuição livre,
      // com os valores que tinham (nada muda de número; daqui em diante é o jogador quem distribui)
      const viradas = S.personagens.filter(pc => deJogador(pc) && pc.modoAtr === undefined);
      viradas.forEach(pc => FichasExtras.tornarLivre(pc, false));
      const rel = garantirRelacoes();
      if (viradas.length || rel) { save(); render(); }
      if (viradas.length) toast(viradas.length === 1 ? 'A ficha de ' + viradas[0].nome + ' passou para a distribuição livre de atributos (os valores foram mantidos).' : viradas.length + ' fichas de jogador passaram para a distribuição livre de atributos (os valores foram mantidos).');
    }
  }
  /* Cada personagem de jogador tem a própria barra de Relacionamento para cada outro personagem de jogador.
     Só o mestre enxerga todas as fichas, então é a tela dele que cria as que faltam (e acerta o nome se mudou). */
  function garantirRelacoes() {
    if (!ativo || !mestre()) return false;
    const dj = S.personagens.filter(deJogador);
    let mudou = false;
    for (const a of dj) {
      const est = a.estado && typeof a.estado === 'object' ? a.estado : (a.estado = {});
      const rel = Array.isArray(est.rel) ? est.rel : [];
      let aqui = false;
      for (const b of dj) {
        if (b.id === a.id) continue;
        const e = rel.find(x => x && x.alvo === b.id);
        if (!e) { rel.push({ id: uid(), alvo: b.id, nome: b.nome, v: 0 }); aqui = true; }
        else if (e.nome !== b.nome) { e.nome = b.nome; aqui = true; }
      }
      if (aqui) { est.rel = rel; mudou = true; }
    }
    return mudou;
  }
  function limitar() {
    if (!ativo) return;
    const alvo = document.getElementById('ficha'), pc = S.personagens.find(p => p.id === S.sel);
    if (!alvo || !pc) return;
    if (!mestre()) alvo.querySelectorAll('[data-act="del"]').forEach(b => { b.disabled = true; b.title = 'Só o mestre exclui personagens da mesa'; });
    if (podeEditar(pc)) return;
    alvo.querySelectorAll('input, select, textarea, button').forEach(el => { el.disabled = true; });
    if (!alvo.querySelector('.so-consulta')) alvo.insertAdjacentHTML('afterbegin', '<div class="so-consulta">Ficha de outra pessoa: só para consulta.</div>');
  }

  /* O que aparece na ficha só para o mestre, dentro de uma mesa: de quem é a ficha e quem a vê. */
  function htmlDono(pc) {
    if (!ativo || !mestre()) return '';
    const jog = (st.membros || []).filter(m => m.papel === 'jogador');
    return `<div class="idmesa">
      <label class="f"><span class="eyebrow">Jogador que controla</span><select id="f_dono">
        <option value="">Ninguém (só o mestre)</option>
        ${jog.map(m => `<option value="${esc(m.id)}" ${pc._dono === m.id ? 'selected' : ''}>${esc(m.nome)}</option>`).join('')}
        ${pc._dono && !jog.some(m => m.id === pc._dono) ? `<option value="${esc(pc._dono)}" selected>(jogador que saiu da mesa)</option>` : ''}
      </select></label>
      <label class="chk"><input type="checkbox" id="f_vis" ${pc._vis === 'mesa' ? 'checked' : ''}> <span>Todos os jogadores veem esta ficha</span></label>
    </div>`;
  }
  // Entrou ou saiu alguém da mesa enquanto o mestre digita na ficha: a lista de jogadores se atualiza no lugar.
  function pintarDono() {
    const d = document.querySelector('#f_dono'), pc = S.personagens.find(p => p.id === S.sel);
    if (!d || !pc) return;
    const tmp = document.createElement('div'); tmp.innerHTML = htmlDono(pc);
    const novo = tmp.querySelector('#f_dono');
    if (novo) { d.innerHTML = novo.innerHTML; d.value = pc._dono || ''; }
  }
  function ligarDono(host, pc) {
    const d = host.querySelector('#f_dono'), v = host.querySelector('#f_vis');
    if (d) d.onchange = e => {
      pc._dono = e.target.value || null;
      // ficha entregue a um jogador: os atributos passam a ser distribuídos por ele (os valores de agora ficam como ponto de partida)
      const virou = deJogador(pc) && pc.modoAtr === undefined;
      if (virou) FichasExtras.tornarLivre(pc, false);
      garantirRelacoes();
      save(); render();
      toast(pc._dono ? 'Agora ' + ((st.membros.find(m => m.id === pc._dono) || {}).nome || 'o jogador') + ' vê e controla esta ficha.' + (virou ? ' Os atributos ficaram em distribuição livre.' : '') : 'Só o mestre vê esta ficha.');
    };
    if (v) v.onchange = e => { pc._vis = e.target.checked ? 'mesa' : 'mestre'; save(); renderLista(); };
  }
  /* No elenco, o mestre escolhe com um clique quais fichas os jogadores podem ver. */
  const OLHO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12s3.6-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.6 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>';
  const OLHO_FECHADO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12c2.2 2.6 5.3 4 9 4s6.8-1.4 9-4"/><path d="M6.5 15.2 5 17.5M12 16v2.7M17.5 15.2 19 17.5"/></svg>';
  function htmlOlho(pc) {
    if (!ativo || !mestre()) return '';
    const aberta = pc._vis === 'mesa';
    const dono = nomeDoDono(pc);
    const txt = aberta ? 'Todos os jogadores veem esta ficha. Clique para esconder.' : (dono ? 'Só você e ' + dono + ' veem esta ficha. Clique para mostrar a todos.' : 'Só você vê esta ficha. Clique para mostrar aos jogadores.');
    return `<button type="button" class="olho" data-olho="${esc(pc.id)}" aria-pressed="${aberta}" title="${esc(txt)}" aria-label="${esc(pc.nome + ': ' + txt)}">${aberta ? OLHO : OLHO_FECHADO}</button>`;
  }
  function ligarOlhos(ul) {
    if (!ativo || !mestre()) return;
    ul.querySelectorAll('[data-olho]').forEach(b => b.onclick = () => {
      const pc = S.personagens.find(p => p.id === b.dataset.olho); if (!pc) return;
      pc._vis = pc._vis === 'mesa' ? 'mestre' : 'mesa';
      save(); renderLista();
      const v = document.querySelector('#f_vis'); if (v && S.sel === pc.id) v.checked = pc._vis === 'mesa';
      toast(pc._vis === 'mesa' ? 'Os jogadores agora veem a ficha de ' + pc.nome + '.' : 'A ficha de ' + pc.nome + ' voltou a ficar escondida dos jogadores.');
    });
  }
  function nomeDoDono(pc) {
    if (!ativo || !pc._dono) return '';
    const m = (st.membros || []).find(x => x.id === pc._dono);
    return m ? m.nome : '';
  }

  /* Trazer para a mesa o que está num arquivo ou neste navegador. Só acrescenta; nada da mesa é apagado. */
  function trazer(d, deOnde) {
    if (!ativo) return false;
    if (!mestre()) { toast('Só o mestre traz fichas de um arquivo para a mesa.'); return true; }
    const ids = new Set(S.personagens.map(p => p.id));
    let n = 0;
    for (const p0 of d.personagens || []) {
      const pc = JSON.parse(j(p0));
      if (!pc || typeof pc !== 'object') continue;
      if (!pc.id || ids.has(pc.id)) pc.id = uid();
      ids.add(pc.id); delete pc._dono; delete pc._vis;
      S.personagens.push(pc); n++;
    }
    for (const g of d.grupos || []) if (typeof g === 'string' && !(S.grupos || []).includes(g)) (S.grupos = S.grupos || []).push(g);
    const junta = (campo) => { const tem = new Set((S[campo] || []).map(x => x.id)); for (const x of d[campo] || []) { if (!x || typeof x !== 'object') continue; const c = JSON.parse(j(x)); if (!c.id || tem.has(c.id)) c.id = uid(); tem.add(c.id); (S[campo] = S[campo] || []).push(c); } };
    junta('situacoes'); junta('tabelas');
    if (d.cfg && sombra.docs.cfg === undefined) S.cfg = d.cfg;      // tabelas base só vêm junto se a mesa ainda não tem as dela
    if (d.bib && !S.bib) S.bib = d.bib;
    migrar();
    if (!S.sel && S.personagens[0]) S.sel = S.personagens[0].id;
    save(); render();
    toast(n + (n === 1 ? ' ficha trazida ' : ' fichas trazidas ') + (deOnde || 'do arquivo') + ' para a mesa.');
    return true;
  }
  function oferecerLocal() {
    if (!mestre() || S.personagens.length) return;
    const local = lerLocal(LOCAL), chave = 'tinycats:fichas:oferta:' + st.mesa.id;
    if (!local || !Array.isArray(local.personagens) || !local.personagens.length) return;
    try { if (localStorage.getItem(chave)) return; } catch (e) { /* segue */ }
    const lista = document.getElementById('lista');
    if (!lista) return;
    const n = local.personagens.length;
    const box = document.createElement('div');
    box.className = 'mesa-oferta';
    box.innerHTML = '<p></p><div><button type="button" class="primary" id="ofertaSim"></button> <button type="button" id="ofertaNao">Começar vazia</button></div>';
    box.querySelector('p').textContent = 'Esta mesa ainda não tem fichas. Neste navegador há ' + n + (n === 1 ? ' ficha guardada.' : ' fichas guardadas.');
    box.querySelector('#ofertaSim').textContent = n === 1 ? 'Trazer a ficha para a mesa' : 'Trazer as ' + n + ' fichas para a mesa';
    const fechar = () => { box.remove(); try { localStorage.setItem(chave, '1'); } catch (e) { /* tudo bem */ } };
    box.querySelector('#ofertaSim').onclick = () => { fechar(); trazer(local, 'deste navegador'); };
    box.querySelector('#ofertaNao').onclick = fechar;
    lista.parentNode.insertBefore(box, lista);
  }

  return { preparar, falhou, depoisDeAbrir, htmlDono, ligarDono, nomeDoDono, trazer, podeEditar, ativo: () => ativo, mestre, deJogador, htmlOlho, ligarOlhos, garantirRelacoes };
})();
