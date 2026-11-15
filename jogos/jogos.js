/* Tiny Cats · Jogos de Tabuleiro (lote 167): a página.
   O salão (jogar contra o computador, desafiar alguém da mesa, os convites, as partidas em andamento e as terminadas) e
   a partida (o tabuleiro, de quem é a vez, os lances, desistir e o empate combinado). As regras ficam em
   tc/jogos-xadrez.js, tc/jogos-damas.js e tc/jogos-tablut.js; o computador, em tc/jogos-ia.js (rodando em
   jogos/ia-worker.js); as partidas online (os dois documentos, a aposta), em tc/jogos.js. */
(() => {
  'use strict';
  const U = window.TC.dom, G = window.TC.jogos, O = G.online, IA = G.ia;
  const { h, trocar } = U;
  const $ = id => document.getElementById(id);
  const toast = U.avisos($('toasts'));
  const JAN = U.janelas($('dlg'));
  const DEBUG = /[?&]debug\b/.test(location.search);

  let st = null, D = null, PC = null, naMesa = false, eu = 'local', pronto = false;
  let vista = { tipo: 'salao' };              // { tipo: 'salao' } | { tipo: 'ia' } | { tipo: 'online', pid }
  let prefixo = [];                           // as casas já escolhidas do lance que está sendo feito
  const form = { jogo: 'xadrez', nivel: 'medio', ladoIa: 0, jogoOn: 'xadrez', ladoOn: 'sorteio', aposta: 0, pc: '', contra: '' };
  const ICONE = { xadrez: '♞', damas: '⛀', tablut: '♔' };
  const RESUMO = {
    xadrez: 'Regras completas: roque, en passant, promoção e empates.',
    damas: 'Damas brasileiras: captura obrigatória (a que leva mais) e dama voadora.',
    tablut: 'O rei foge para a borda; os atacantes tentam cercá-lo.',
  };

  /* ---------------- quem é quem ---------------- */
  const souMestre = () => !!st && (st.cargo === 'mestre' || st.papel === 'mestre');
  function meusPcs() {
    if (!naMesa) return [];
    return PC.todas().filter(l => l && !l.apagado && String(l.nome || '').trim() && (souMestre() || l.dono_id === eu))
      .map(l => ({ id: l.id, nome: String(l.nome).trim(), lapros: laprosDe(l) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function laprosDe(l) { const v = l && l.estado && l.estado.lapros; return Number.isFinite(+v) && v !== null && v !== '' ? Math.max(0, Math.round(+v)) : 0; }
  const pcLinha = id => (naMesa && id ? PC.pegar(id) : null);
  const nomeDe = conta => { const m = ((st && st.membros) || []).find(x => x.id === conta); return m ? m.nome : 'Alguém'; };
  const outros = () => ((st && st.membros) || []).filter(m => m.id !== eu);

  /* ---------------- lapros ---------------- */
  // só na ficha de um personagem que quem usa pode gravar (o dele; quem mestra, qualquer um)
  function mexerLapros(pcId, delta) {
    const l = pcLinha(pcId); if (!l) return false;
    const est = Object.assign({}, l.estado || {});
    est.lapros = Math.max(0, laprosDe(l) + delta);
    PC.gravar(pcId, { estado: est });
    return true;
  }

  /* ---------------- as partidas online ---------------- */
  const linhasJogo = () => (naMesa ? D.todas().filter(l => l && typeof l.id === 'string' && l.id.startsWith(O.PRE)) : []);
  const todasPartidas = () => O.partidas(linhasJogo());
  const partida = pid => O.juntar(linhasJogo().filter(l => (O.lerId(l.id) || {}).pid === pid));
  const meuDoc = pid => { const l = D.pegar(O.docId(pid, eu)); return l && !l.apagado && l.dados ? l.dados : null; };
  function gravarMeu(pid, dados) {
    const id = O.docId(pid, eu), novo = !D.pegar(id);
    D.gravar(id, novo ? { dados, vis: 'mesa', dono_id: eu } : { dados });
  }
  const mudarMeu = (pid, fn) => { const d = Object.assign({}, meuDoc(pid) || {}); fn(d); gravarMeu(pid, d); return partida(pid); };
  function publicar(texto, pc) { try { if (window.TC.ponte && naMesa) window.TC.ponte.publicar('jogos', { titulo: 'Jogos de Tabuleiro', resumo: texto, pc: pc || null }); } catch (e) { /* a mesa ao vivo é opcional */ } }
  // quem fez o lance que terminou a partida (ou desistiu, ou aceitou o empate) conta à mesa — uma vez
  function avisarFim(p) {
    if (!p || p.status !== 'fim') return;
    const d = meuDoc(p.pid); if (!d || d.publicou) return;
    const lado = O.meuLado(p, eu);
    publicar(O.textoDoFim(p), lado && lado.pc);
    mudarMeu(p.pid, x => { x.publicou = true; });
  }

  async function convidar() {
    const pcs = meusPcs(), pc = pcs.find(x => x.id === form.pc) || null, contra = outros().find(m => m.id === form.contra);
    const aposta = O.inteiro(form.aposta, O.MAX_APOSTA);
    if (!contra) { toast('Escolha quem você quer desafiar.'); return; }
    if (aposta && !pc) { toast('Para apostar, escolha o personagem que paga a aposta.'); return; }
    if (aposta && pc.lapros < aposta) { toast(pc.nome + ' tem ' + pc.lapros + ' lapros: não dá para apostar ' + aposta + '.'); return; }
    const lado = form.ladoOn === 'sorteio' ? (Math.random() < 0.5 ? 0 : 1) : +form.ladoOn;
    const J = G[form.jogoOn];
    if (aposta && !(await JAN.confirmar('Apostar ' + aposta + ' lapros?', 'Os ' + aposta + ' lapros saem agora da ficha de ' + pc.nome + ' e ficam na mesa até o fim da partida. Se ' + contra.nome + ' recusar ou você cancelar o convite, eles voltam.', 'Convidar'))) return;
    const pid = O.novoId();
    if (aposta) mexerLapros(pc.id, -aposta);
    gravarMeu(pid, { v: 1, papel: 'criador', jogo: form.jogoOn, pc: pc ? pc.id : null, pcNome: pc ? pc.nome : (st.meuNome || nomeDe(eu)), contra: contra.id, contraNome: contra.nome,
      aposta, lado, t: Date.now(), lances: [], pagou: !!aposta });
    toast('Convite enviado a ' + contra.nome + ': ' + J.nome + ', você com as ' + J.lados[lado].toLowerCase() + (aposta ? ', valendo ' + aposta + ' lapros' : '') + '.');
    pintar();
  }
  async function aceitar(p, pcId) {
    const pc = meusPcs().find(x => x.id === pcId) || null;
    if (p.aposta && !pc) { toast('Escolha o personagem que paga a aposta.'); return; }
    if (p.aposta && pc.lapros < p.aposta) { toast(pc.nome + ' tem ' + pc.lapros + ' lapros: faltam ' + (p.aposta - pc.lapros) + ' para a aposta.'); return; }
    if (p.aposta && !(await JAN.confirmar('Aceitar valendo ' + p.aposta + ' lapros?', 'Os ' + p.aposta + ' lapros saem agora da ficha de ' + pc.nome + '. Quem vencer leva ' + 2 * p.aposta + '; no empate, cada um recebe o seu de volta.', 'Aceitar'))) return;
    if (p.aposta) mexerLapros(pc.id, -p.aposta);
    gravarMeu(p.pid, { v: 1, papel: 'convidado', resp: 'aceito', pc: pc ? pc.id : null, pcNome: pc ? pc.nome : (st.meuNome || nomeDe(eu)), t: Date.now(), lances: [], pagou: !!p.aposta });
    const np = partida(p.pid);
    if (np) publicar(O.textoDoInicio(np), pc && pc.id);
    abrir({ tipo: 'online', pid: p.pid });
  }
  function recusar(p) { gravarMeu(p.pid, { v: 1, papel: 'convidado', resp: 'recusado', t: Date.now(), lances: [] }); toast('Convite recusado.'); pintar(); }
  function cancelar(p) { mudarMeu(p.pid, d => { d.cancela = true; }); toast('Convite cancelado.'); liquidar(); pintar(); }
  function jogarOnline(p, m) {
    const np = mudarMeu(p.pid, d => { d.lances = (Array.isArray(d.lances) ? d.lances : []).concat({ n: p.lances.length, id: m.id }); });
    prefixo = [];
    avisarFim(np); liquidar(); pintar();
  }
  async function desistir(p) {
    if (!(await JAN.confirmar('Desistir da partida?', p.aposta ? 'Quem desiste perde, e a aposta (' + 2 * p.aposta + ' lapros) vai para o outro.' : 'Quem desiste perde a partida.', 'Desistir', true))) return;
    const np = mudarMeu(p.pid, d => { d.desiste = true; });
    avisarFim(np); liquidar(); pintar();
  }
  function empate(p) {
    const np = mudarMeu(p.pid, d => { d.empate = p.lances.length; });
    if (np && np.status === 'fim') { avisarFim(np); liquidar(); } else toast('Empate oferecido. Vale até alguém jogar.');
    pintar();
  }
  // a aposta: cada um recebe na própria ficha o que é dele (uma vez), e marca no documento
  const recebendo = new Set();
  function liquidar() {
    if (!naMesa) return;
    for (const p of todasPartidas()) {
      const r = O.aReceber(p, eu); if (!r || recebendo.has(p.pid)) continue;
      recebendo.add(p.pid);
      const lado = O.meuLado(p, eu);
      if (r.lapros > 0 && lado.pc && pcLinha(lado.pc)) {
        mexerLapros(lado.pc, r.lapros);
        toast(lado.pcNome + ' recebeu ' + r.lapros + ' lapros (' + r.motivo + ', ' + p.nomeJogo + ').');
      }
      mudarMeu(p.pid, d => { d.recebeu = true; });
    }
  }

  /* ---------------- contra o computador ---------------- */
  const CH_IA = 'tinycats:jogos:ia';
  let ia = (() => { try { const x = JSON.parse(localStorage.getItem(CH_IA) || 'null'); return x && G[x.jogo] && Array.isArray(x.lances) ? x : null; } catch (e) { return null; } })();
  const guardarIa = () => { try { localStorage.setItem(CH_IA, JSON.stringify(ia)); } catch (e) { /* sem armazenamento */ } };
  function estadoDe(J, ids) { let e = J.inicial(); for (const id of ids) { const m = J.lancePorId(e, id); if (!m) break; e = J.jogar(e, m); } return e; }
  let trabalhador = null, nPedido = 0, pensando = false;
  try { trabalhador = new Worker('ia-worker.js?v=1'); } catch (e) { trabalhador = null; }
  function pedirLance(q) {
    const n = ++nPedido;
    return new Promise(ok => {
      const local = () => { const J = G[q.jogo]; const r = IA.escolher(J, estadoDe(J, q.lances), q.nivel); ok(r ? r.lance.id : null); };
      if (!trabalhador) { setTimeout(local, 30); return; }
      const ouvir = ev => { if (!ev.data || ev.data.n !== n) return; trabalhador.removeEventListener('message', ouvir); if (ev.data.erro) local(); else ok(ev.data.id); };
      trabalhador.addEventListener('message', ouvir);
      trabalhador.onerror = () => { trabalhador = null; local(); };
      trabalhador.postMessage(Object.assign({ n }, q));
    });
  }
  async function vezDoComputador() {
    if (!ia || pensando) return;
    const J = G[ia.jogo], e = estadoDe(J, ia.lances);
    if (J.fim(e) || J.vez(e) === ia.lado) return;
    pensando = true; pintar();
    const antes = ia, t0 = Date.now();
    const id = await pedirLance({ jogo: ia.jogo, lances: ia.lances.slice(), nivel: ia.nivel });
    if (Date.now() - t0 < 350) await new Promise(r => setTimeout(r, 350 - (Date.now() - t0)));    // (um respiro: o lance não aparece no mesmo instante)
    pensando = false;
    if (ia !== antes || !id) { pintar(); return; }
    ia.lances.push(id); guardarIa(); pintar();
  }
  function novaIa() {
    ia = { jogo: form.jogo, nivel: form.nivel, lado: +form.ladoIa, lances: [], t: Date.now() };
    guardarIa(); prefixo = [];
    abrir({ tipo: 'ia' });
    vezDoComputador();
  }
  function jogarIa(m) { ia.lances.push(m.id); guardarIa(); prefixo = []; pintar(); vezDoComputador(); }
  function desfazerIa() {
    if (!ia || pensando) return;
    const J = G[ia.jogo];
    do { ia.lances.pop(); } while (ia.lances.length && J.vez(estadoDe(J, ia.lances)) !== ia.lado);
    guardarIa(); prefixo = []; pintar();
  }

  /* ---------------- o tabuleiro ---------------- */
  const GLIFO = { R: '♚', D: '♛', T: '♜', B: '♝', C: '♞', P: '♟︎' };
  function peca(jogo, p) {
    if (!p) return null;
    if (jogo === 'xadrez') return h('span', { class: 'peca ' + (p === p.toUpperCase() ? 'xb' : 'xp'), text: GLIFO[p.toUpperCase()] });
    if (jogo === 'damas') return h('span', { class: 'disco ' + (p.toLowerCase() === 'b' ? 'db' : 'dp'), text: p === 'B' || p === 'P' ? '♛' : '' });
    return h('span', { class: 'disco ' + (p === 'a' ? 'ta' : p === 'd' ? 'td' : 'tk'), text: p === 'K' ? '♔' : '' });
  }
  const NOME_PECA = { xadrez: p => (p === p.toUpperCase() ? 'branco' : 'preto'), damas: p => (p.toLowerCase() === 'b' ? 'branca' : 'preta') };
  function rotuloCasa(J, jogo, c, p) {
    let s = J.nomeCasa(c);
    if (!p) return s;
    if (jogo === 'xadrez') s += ', ' + G.xadrez.NOMES[p.toUpperCase()] + ' ' + NOME_PECA.xadrez(p);
    else if (jogo === 'damas') s += ', ' + (p === 'B' || p === 'P' ? 'dama ' : 'pedra ') + NOME_PECA.damas(p);
    else s += ', ' + (p === 'K' ? 'rei' : p === 'a' ? 'atacante' : 'defensor');
    return s;
  }
  /* o = { jogo, e, vira, ultimo, podeJogar, aoJogar(m) } */
  function tabuleiro(o) {
    const J = G[o.jogo], n = J.tam, e = o.e;
    const ls = o.podeJogar ? J.lances(e) : [];
    const cam = m => m.caminho || [m.de, m.para];
    const cands = ls.filter(m => prefixo.every((c, i) => cam(m)[i] === c));
    if (prefixo.length && !cands.length) prefixo = [];
    const origens = new Set(ls.map(m => cam(m)[0]));
    const alvos = new Set(prefixo.length ? cands.map(m => cam(m)[prefixo.length]).filter(x => x !== undefined) : []);
    const ult = new Set(o.ultimo ? (o.ultimo.caminho || [o.ultimo.de, o.ultimo.para]) : []);
    const xeque = o.jogo === 'xadrez' && J.emXeque(e) ? e.b.indexOf(e.vez === 0 ? 'R' : 'r') : -1;
    const grade = h('div', { class: 'tabuleiro' + (o.jogo === 'tablut' ? ' tablut' : ''), style: '--n:' + n, role: 'grid', 'aria-label': 'Tabuleiro de ' + J.nome });
    const linhas = [...Array(n).keys()].map(i => (o.vira ? i : n - 1 - i));
    const cols = [...Array(n).keys()].map(i => (o.vira ? n - 1 - i : i));
    for (const r of linhas) {
      grade.append(h('span', { class: 'rot', text: String(r + 1) }));
      for (const f of cols) {
        const c = r * n + f, p = e.b[c];
        let cls = 'casa';
        if (o.jogo !== 'tablut' && ((f + r) & 1) === 0) cls += ' e';
        if (o.jogo === 'tablut') { if (c === J.TRONO) cls += ' trono'; else if (J.borda(c)) cls += ' borda'; }
        if (ult.has(c)) cls += ' ult';
        if (prefixo.includes(c)) cls += ' sel';
        if (c === xeque) cls += ' xeque';
        if (alvos.has(c)) cls += ' alvo' + (p ? ' cheia' : '');
        const clicavel = alvos.has(c) || origens.has(c);
        grade.append(h('button', { type: 'button', class: cls, 'data-c': J.nomeCasa(c), 'aria-label': rotuloCasa(J, o.jogo, c, p), disabled: !o.podeJogar || (!clicavel && !prefixo.length) ? true : null,
          onclick: () => clicar(c) }, peca(o.jogo, p)));
      }
    }
    grade.append(h('span', { class: 'rot' }));
    for (const f of cols) grade.append(h('span', { class: 'rot', text: 'abcdefghi'[f] }));
    function clicar(c) {
      if (alvos.has(c)) {
        prefixo = prefixo.concat(c);
        const resta = cands.filter(m => cam(m)[prefixo.length - 1] === c);
        const completos = resta.filter(m => cam(m).length === prefixo.length);
        if (completos.length === 1 && resta.length === 1) { o.aoJogar(completos[0]); return; }
        if (completos.length > 1 && o.jogo === 'xadrez') { escolherPromocao(completos, o.aoJogar); return; }
        if (completos.length && resta.length === completos.length) { o.aoJogar(completos[0]); return; }
        pintar(); return;
      }
      if (origens.has(c) && !(prefixo.length > 1)) { prefixo = prefixo[0] === c ? [] : [c]; pintar(); return; }
      if (prefixo.length) { prefixo = []; pintar(); }
    }
    return grade;
  }
  function escolherPromocao(ms, fazer) {
    const bot = ms.map(m => h('button', { type: 'button', 'aria-label': G.xadrez.NOMES[m.promo.toUpperCase()], 'data-k': 'promo:' + m.promo.toUpperCase(), text: GLIFO[m.promo.toUpperCase()], onclick: () => { JAN.fechar(); fazer(m); } }));
    JAN.abrir('', [h('h2', { text: 'Promover o peão a…' }), h('div', { class: 'promo' }, bot), JAN.pe(h('button', { type: 'button', class: 'btn', text: 'Cancelar', onclick: () => { JAN.fechar(); prefixo = []; pintar(); } }))], () => { prefixo = []; pintar(); });
  }
  const COR_LADO = { xadrez: ['#fbf7ee', '#1d1a17'], damas: ['#f3ead6', '#3a2a1e'], tablut: ['#1d1d22', '#e2b23e'] };
  function cartaoJogador(jogo, nome, sub, lado, vez) {
    return h('div', { class: 'jog' + (vez ? ' vez' : '') }, h('span', { class: 'cor', style: { background: COR_LADO[jogo][lado] } }), h('b', { text: nome }), h('small', { text: sub }));
  }
  function historico(J, ids) {
    let e = J.inicial(); const itens = [];
    for (const id of ids) { const m = J.lancePorId(e, id); if (!m) break; itens.push(h('li', { text: J.nomeDoLance(e, m) })); e = J.jogar(e, m); }
    return itens.length ? h('ol', { class: 'historico' }, itens) : h('p', { class: 'vazio', text: 'Nenhum lance ainda.' });
  }
  function ultimoDe(J, ids) {
    let e = J.inicial(), u = null;
    for (const id of ids) { const m = J.lancePorId(e, id); if (!m) break; u = m; e = J.jogar(e, m); }
    return u;
  }
  const textoFimIa = (J, f, lado) => (f.vencedor === null ? 'Empate (' + f.motivo + ').' : f.vencedor === lado ? 'Você venceu! (' + f.motivo + ')' : 'O computador venceu (' + f.motivo + ').');

  /* ---------------- as telas ---------------- */
  function abrir(v) { vista = v; prefixo = []; pintar(); try { window.scrollTo(0, 0); } catch (e) { /* sem rolagem */ } }
  function pintar() {
    if (!pronto) return;
    $('voltar').hidden = vista.tipo === 'salao';
    $('quem').textContent = naMesa ? '' : 'Sem mesa aberta: só contra o computador.';
    const meio = $('meio');
    if (vista.tipo === 'ia' && ia) trocar(meio, telaIa());
    else if (vista.tipo === 'online') { const p = partida(vista.pid); if (p) trocar(meio, telaOnline(p)); else { vista = { tipo: 'salao' }; trocar(meio, salao()); } }
    else { vista = { tipo: 'salao' }; trocar(meio, salao()); }
  }
  $('voltar').onclick = () => abrir({ tipo: 'salao' });

  function seg(rotulo, opcoes, valor, mudar, k) {
    return h('span', { class: 'seg', role: 'group', 'aria-label': rotulo }, opcoes.map(([v, t]) => h('button', { type: 'button', 'data-k': k + ':' + v, 'aria-pressed': String(String(valor) === String(v)), text: t, onclick: () => { mudar(v); pintar(); } })));
  }
  function escolhaJogo(valor, mudar, k) {
    return h('div', { class: 'escolha-jogo', role: 'group', 'aria-label': 'Jogo' }, O.JOGOS.map(j => h('button', { type: 'button', 'data-k': k + ':' + j, 'aria-pressed': String(valor === j), onclick: () => { mudar(j); pintar(); } },
      h('span', { class: 'ico', 'aria-hidden': 'true', text: ICONE[j] }), G[j].nome, h('small', { text: RESUMO[j] }))));
  }

  function salao() {
    const out = [];
    // contra o computador
    const J = G[form.jogo];
    const pIa = h('section', { class: 'painel', 'aria-labelledby': 't-ia' }, h('h2', { id: 't-ia', text: 'Contra o computador' }),
      escolhaJogo(form.jogo, j => { form.jogo = j; }, 'ia'),
      h('div', { class: 'campo' }, 'Você joga com', seg('Seu lado', [[0, J.lados[0]], [1, J.lados[1]]], form.ladoIa, v => { form.ladoIa = v; }, 'ladoia')),
      h('div', { class: 'campo' }, 'Nível', seg('Nível', [['facil', 'Fácil'], ['medio', 'Médio'], ['dificil', 'Difícil']], form.nivel, v => { form.nivel = v; }, 'nivel')),
      h('div', { class: 'linha' }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'ia:comecar', text: 'Começar', onclick: novaIa }),
        ia ? h('button', { type: 'button', class: 'btn', 'data-k': 'ia:continuar', text: 'Continuar a partida (' + G[ia.jogo].nome + ')', onclick: () => { abrir({ tipo: 'ia' }); vezDoComputador(); } }) : null));
    out.push(pIa);
    if (!naMesa) {
      out.push(h('section', { class: 'painel' }, h('h2', { text: 'Com alguém da mesa' }), h('p', { class: 'vazio', text: 'Entre numa mesa (no alto do site) para desafiar quem joga com você, apostar lapros e assistir às partidas dos outros.' })));
      return h('div', { class: 'salao' }, out);
    }
    const ps = todasPartidas();
    // desafiar
    const pcs = meusPcs(), contras = outros();
    if (form.pc && !pcs.some(x => x.id === form.pc)) form.pc = '';
    if (!form.pc && pcs.length && !souMestre()) form.pc = pcs[0].id;
    if (form.contra && !contras.some(x => x.id === form.contra)) form.contra = '';
    if (!form.contra && contras.length) form.contra = contras[0].id;
    const Jo = G[form.jogoOn], pcSel = pcs.find(x => x.id === form.pc);
    const inPc = h('select', { class: 'in', 'data-k': 'on:pc', 'aria-label': 'Seu personagem', onchange: ev => { form.pc = ev.target.value; pintar(); } },
      h('option', { value: '', text: 'Sem personagem (você mesmo)' }), pcs.map(x => h('option', { value: x.id, text: x.nome + ' · ' + x.lapros + ' lapros', selected: x.id === form.pc ? true : null })));
    const inContra = h('select', { class: 'in', 'data-k': 'on:contra', 'aria-label': 'Adversário', onchange: ev => { form.contra = ev.target.value; } },
      contras.map(m => h('option', { value: m.id, text: m.nome, selected: m.id === form.contra ? true : null })));
    const inAposta = h('input', { class: 'in', type: 'number', min: 0, step: 1, inputmode: 'numeric', 'data-k': 'on:aposta', 'aria-label': 'Aposta em lapros', value: form.aposta || 0, style: { width: '120px' }, oninput: ev => { form.aposta = O.inteiro(ev.target.value, O.MAX_APOSTA); } });
    out.push(h('section', { class: 'painel', 'aria-labelledby': 't-on' }, h('h2', { id: 't-on', text: 'Desafiar alguém da mesa' }),
      contras.length ? [
        escolhaJogo(form.jogoOn, j => { form.jogoOn = j; }, 'on'),
        h('label', { class: 'campo' }, 'Adversário', inContra),
        h('label', { class: 'campo' }, 'Você joga como', inPc),
        h('div', { class: 'campo' }, 'Seu lado', seg('Seu lado', [['sorteio', 'Sorteio'], [0, Jo.lados[0]], [1, Jo.lados[1]]], form.ladoOn, v => { form.ladoOn = v; }, 'ladoon')),
        h('label', { class: 'campo' }, 'Aposta em lapros (0 = sem aposta)', h('div', { class: 'linha' }, inAposta, pcSel ? h('span', { class: 'ajuda', text: pcSel.nome + ' tem ' + pcSel.lapros + '.' }) : h('span', { class: 'ajuda', text: 'Apostar pede um personagem.' }))),
        h('div', { class: 'linha' }, h('button', { type: 'button', class: 'btn pri', 'data-k': 'on:convidar', text: 'Enviar convite', onclick: convidar })),
      ] : h('p', { class: 'vazio', text: 'Ainda não há mais ninguém nesta mesa.' })));

    // os convites
    const paraMim = ps.filter(p => p.status === 'convite' && p.convidado.conta === eu);
    const meusEnviados = ps.filter(p => p.status === 'convite' && p.criador.conta === eu);
    if (paraMim.length || meusEnviados.length) {
      out.push(h('section', { class: 'painel', 'aria-labelledby': 't-conv' }, h('h2', { id: 't-conv', text: 'Convites' }), h('div', { class: 'lista' },
        paraMim.map(p => {
          const sel = h('select', { class: 'in', 'aria-label': 'Jogar como', 'data-k': 'aceitar:pc:' + p.pid },
            !p.aposta ? h('option', { value: '', text: 'Sem personagem (você mesmo)' }) : null,
            pcs.map(x => h('option', { value: x.id, text: x.nome + ' · ' + x.lapros + ' lapros' })));
          return h('div', { class: 'part minha' }, h('div', {}, h('b', { text: p.criador.pcNome + ' desafia você: ' + p.nomeJogo }),
            h('div', { class: 'info' }, 'Você jogaria com as ' + G[p.jogo].lados[p.convidado.lado].toLowerCase() + '. ', p.aposta ? h('span', { class: 'selo lap', text: p.aposta + ' lapros de cada um' }) : 'Sem aposta.')),
          h('div', { class: 'acoes' }, sel, h('button', { type: 'button', class: 'btn pri sm', 'data-k': 'aceitar:' + p.pid, text: 'Aceitar', onclick: () => aceitar(p, sel.value) }),
            h('button', { type: 'button', class: 'btn sm', 'data-k': 'recusar:' + p.pid, text: 'Recusar', onclick: () => recusar(p) })));
        }),
        meusEnviados.map(p => h('div', { class: 'part' }, h('div', {}, h('b', { text: p.nomeJogo + ' com ' + p.convidado.nome }),
          h('div', { class: 'info', text: 'Esperando a resposta.' + (p.aposta ? ' Aposta: ' + p.aposta + ' lapros.' : '') })),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'cancelar:' + p.pid, text: 'Cancelar', onclick: () => cancelar(p) })))))));
    }
    // em andamento
    const andando = ps.filter(p => p.status === 'jogando');
    out.push(h('section', { class: 'painel', 'aria-labelledby': 't-and' }, h('h2', { id: 't-and', text: 'Partidas em andamento' }),
      andando.length ? h('div', { class: 'lista' }, andando.map(p => {
        const minha = !!O.meuLado(p, eu), minhaVez = p.vez === eu;
        const vezDe = p.vez === p.criador.conta ? p.criador.pcNome : p.convidado.pcNome;
        return h('div', { class: 'part' + (minha ? ' minha' : '') }, h('div', {}, h('b', { text: p.criador.pcNome + ' × ' + p.convidado.pcNome }),
          h('div', { class: 'info' }, p.nomeJogo + ' · ' + p.lances.length + ' lances · ', minhaVez ? h('span', { class: 'selo vez', text: 'sua vez' }) : 'vez de ' + vezDe, p.aposta ? [' ', h('span', { class: 'selo lap', text: 2 * p.aposta + ' lapros na mesa' })] : null)),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm' + (minhaVez ? ' pri' : ''), 'data-k': 'abrir:' + p.pid, text: minha ? 'Abrir' : 'Assistir', onclick: () => abrir({ tipo: 'online', pid: p.pid }) })));
      })) : h('p', { class: 'vazio', text: 'Nenhuma partida agora.' })));
    // terminadas (as de duas semanas para cá)
    const limite = Date.now() - 14 * 864e5;
    const fim = ps.filter(p => p.status === 'fim' && p.t > limite).slice(0, 10);
    if (fim.length) out.push(h('section', { class: 'painel', 'aria-labelledby': 't-fim' }, h('h2', { id: 't-fim', text: 'Terminadas' }), h('div', { class: 'lista' },
      fim.map(p => h('div', { class: 'part' }, h('div', {}, h('b', { text: p.criador.pcNome + ' × ' + p.convidado.pcNome }), h('div', { class: 'info', text: O.textoDoFim(p) })),
        h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'btn sm', 'data-k': 'rever:' + p.pid, text: 'Ver', onclick: () => abrir({ tipo: 'online', pid: p.pid }) })))))));
    return h('div', { class: 'salao' }, out);
  }

  function telaIa() {
    const J = G[ia.jogo], e = estadoDe(J, ia.lances), f = J.fim(e), minhaVez = !f && J.vez(e) === ia.lado && !pensando;
    const u = ultimoDe(J, ia.lances);
    const NIV = { facil: 'fácil', medio: 'médio', dificil: 'difícil' };
    const status = f ? textoFimIa(J, f, ia.lado) : pensando || J.vez(e) !== ia.lado ? 'O computador está pensando…' : 'Sua vez' + (ia.jogo === 'xadrez' && J.emXeque(e) ? ' — xeque!' : '.');
    return h('div', { class: 'jogo' },
      h('div', { class: 'tab-moldura' }, tabuleiro({ jogo: ia.jogo, e, vira: ia.jogo !== 'tablut' && ia.lado === 1, ultimo: u ? { de: u.de, para: u.para, caminho: u.caminho } : null, podeJogar: minhaVez, aoJogar: jogarIa })),
      h('aside', { class: 'lado' },
        h('section', { class: 'painel' }, h('h2', { text: J.nome }), h('p', { class: 'status', role: 'status', text: status }),
          cartaoJogador(ia.jogo, 'Computador', J.lados[1 - ia.lado] + ' · ' + NIV[ia.nivel], 1 - ia.lado, !f && J.vez(e) !== ia.lado),
          cartaoJogador(ia.jogo, 'Você', J.lados[ia.lado], ia.lado, !f && J.vez(e) === ia.lado),
          h('div', { class: 'linha' }, h('button', { type: 'button', class: 'btn', 'data-k': 'ia:desfazer', text: 'Desfazer', disabled: !ia.lances.length || pensando ? true : null, onclick: desfazerIa }),
            h('button', { type: 'button', class: 'btn', 'data-k': 'ia:nova', text: 'Nova partida', onclick: () => { form.jogo = ia.jogo; form.nivel = ia.nivel; form.ladoIa = ia.lado; novaIa(); } }))),
        h('section', { class: 'painel' }, h('h3', { text: 'Lances' }), historico(J, ia.lances))));
  }

  function telaOnline(p) {
    const J = G[p.jogo], e = p.estado, eus = O.meuLado(p, eu), f = p.fim;
    const status = p.status === 'convite' ? 'Esperando ' + p.convidado.nome + ' aceitar.'
      : p.status === 'recusado' ? p.convidado.nome + ' recusou o convite.'
      : p.status === 'cancelado' ? 'O convite foi cancelado.'
      : f ? O.textoDoFim(p)
      : p.vez === eu ? 'Sua vez' + (p.jogo === 'xadrez' && J.emXeque(e) ? ' — xeque!' : '.')
      : 'Vez de ' + (p.vez === p.criador.conta ? p.criador.pcNome : p.convidado.pcNome) + '.';
    const podeJogar = p.status === 'jogando' && p.vez === eu;
    const lados = [p.criador, p.convidado].sort((a, b) => a.lado - b.lado);
    const acoes = [];
    if (eus && p.status === 'jogando') {
      const outroOfereceu = p.empateOferecido && p.empateOferecido !== eu, euOfereci = p.empateOferecido === eu;
      acoes.push(h('button', { type: 'button', class: 'btn' + (outroOfereceu ? ' pri' : ''), 'data-k': 'on:empate', disabled: euOfereci ? true : null, text: outroOfereceu ? 'Aceitar o empate' : euOfereci ? 'Empate oferecido' : 'Oferecer empate', onclick: () => empate(p) }),
        h('button', { type: 'button', class: 'btn per', 'data-k': 'on:desistir', text: 'Desistir', onclick: () => desistir(p) }));
    }
    const aviso = !eus ? 'Você está assistindo.' : p.empateOferecido && p.empateOferecido !== eu ? 'O outro lado ofereceu empate.' : '';
    return h('div', { class: 'jogo' },
      h('div', { class: 'tab-moldura' }, tabuleiro({ jogo: p.jogo, e, vira: p.jogo !== 'tablut' && !!eus && eus.lado === 1, ultimo: p.ultimo, podeJogar, aoJogar: m => jogarOnline(p, m) })),
      h('aside', { class: 'lado' },
        h('section', { class: 'painel' }, h('h2', { text: J.nome }), h('p', { class: 'status', role: 'status', text: status }),
          aviso ? h('p', { class: 'ajuda', text: aviso }) : null,
          lados.map(x => cartaoJogador(p.jogo, x.pcNome || x.nome || '?', J.lados[x.lado] + (x.conta === eu ? ' · você' : ''), x.lado, p.status === 'jogando' && p.vez === x.conta)),
          p.aposta ? h('p', { class: 'ajuda' }, h('span', { class: 'selo lap', text: 2 * p.aposta + ' lapros na mesa' }), ' Quem vencer leva tudo; no empate, cada um recebe o seu.') : null,
          acoes.length ? h('div', { class: 'linha' }, acoes) : null),
        h('section', { class: 'painel' }, h('h3', { text: 'Lances' }), historico(J, p.lances))));
  }

  /* ---------------- partida ---------------- */
  const vezes = new Map();
  function avisarVez() {
    if (!naMesa) return;
    for (const p of todasPartidas()) {
      const antes = vezes.get(p.pid), agora = p.status === 'jogando' ? p.vez : p.status;
      vezes.set(p.pid, agora);
      if (antes === undefined || antes === agora) continue;
      const aberta = vista.tipo === 'online' && vista.pid === p.pid;
      if (agora === eu && !aberta) toast('Sua vez no ' + p.nomeJogo + ' (' + p.criador.pcNome + ' × ' + p.convidado.pcNome + ').', 'Abrir', () => abrir({ tipo: 'online', pid: p.pid }));
      if (p.status === 'fim' && O.meuLado(p, eu) && !aberta) toast(O.textoDoFim(p), 'Ver', () => abrir({ tipo: 'online', pid: p.pid }));
    }
  }
  function convitesNovos(antes) {
    for (const p of todasPartidas()) if (p.status === 'convite' && p.convidado.conta === eu && !antes.has(p.pid)) toast(p.criador.pcNome + ' desafiou você para ' + p.nomeJogo + '.', 'Ver', () => abrir({ tipo: 'salao' }));
  }
  async function partidaInicio() {
    const TCx = window.TC;
    if (TCx && TCx.ponte) {
      st = await TCx.ponte.pronta;
      if (TCx.ponte.naCasca) document.documentElement.classList.add('na-casca');
      if (TCx.dados && TCx.dados.disponivel()) {
        naMesa = true;
        eu = st.eu || 'local';
        D = TCx.dados.col('documentos'); PC = TCx.dados.col('personagens');
        await Promise.all([D.pronta, PC.pronta]);
        let t = 0;
        D.aoMudar(l => {
          if (!l || typeof l.id !== 'string' || !l.id.startsWith(O.PRE)) return;
          const antes = new Set(todasPartidas().filter(p => p.status === 'convite').map(p => p.pid));
          clearTimeout(t);
          t = setTimeout(() => { convitesNovos(antes); avisarVez(); liquidar(); if (!JAN.aberta()) pintar(); }, 60);
        });
        PC.aoMudar(() => { if (vista.tipo === 'salao' && !JAN.aberta() && !(document.activeElement && /INPUT|SELECT/.test(document.activeElement.tagName))) pintar(); });
      }
      TCx.ponte.aoMudar(x => { st = x; if (pronto && vista.tipo === 'salao') pintar(); });
    }
    pronto = true;
    avisarVez(); liquidar();
    pintar();
    if (vista.tipo === 'ia') vezDoComputador();
  }
  if (DEBUG) window.__jogos = { get ia() { return ia; }, set ia(v) { ia = v; guardarIa(); }, partidas: todasPartidas, partida, abrir, pintar, form, get vista() { return vista; }, liquidar };
  partidaInicio().catch(e => {
    console.error(e);
    trocar($('meio'), h('div', { class: 'painel' }, h('strong', { text: 'Não deu para abrir os Jogos de Tabuleiro. ' }), (e && e.message) || ''));
  });
})();
