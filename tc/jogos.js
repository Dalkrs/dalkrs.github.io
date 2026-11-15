/* Tiny Cats · Jogos de Tabuleiro (lote 167): as partidas online, a lógica (sem tela).
   Cada partida entre duas pessoas da mesa são dois documentos, um de cada jogador, com ele de dono e vis 'mesa' (toda a
   mesa vê: é assim que se assiste):
     jogo:<partida>:<conta de quem convida>   { papel: 'criador', jogo, pc, pcNome, contra, contraNome, aposta, lado, t,
                                               lances, desiste, empate, cancela, pagou, recebeu, publicou }
     jogo:<partida>:<conta do convidado>      { papel: 'convidado', resp: 'aceito' | 'recusado', pc, pcNome, t,
                                               lances, desiste, empate, pagou, recebeu, publicou }
   Cada um só escreve no seu: os lances de cada lado ficam no documento de quem os jogou ({ n: o número do lance na
   partida, id }), e a partida é a junção dos dois, conferida pelas regras do jogo (um lance fora da vez ou que as regras
   não aceitam para a leitura ali).
   A aposta (lapros): quem convida paga ao convidar; o convidado, ao aceitar. O dinheiro fica "na mesa" até o fim: quem
   vence recebe as duas partes, no empate cada um recebe a sua de volta, e no convite recusado ou cancelado quem convidou
   recebe a dele. Cada um só mexe na ficha do próprio personagem (pagar e receber), e marca no documento que já fez.
   Empate combinado: quem oferece marca `empate` com o número de lances de agora; o outro aceita marcando o mesmo número.
   Vale enquanto ninguém jogar. */
(function (root) {
  'use strict';
  const PRE = 'jogo:';
  const JOGOS = ['xadrez', 'damas', 'tablut'];
  const NOMES = { xadrez: 'Xadrez', damas: 'Damas', tablut: 'Tablut' };
  const MAX_APOSTA = 1000000;
  const motor = nome => { const J = (root.TC && root.TC.jogos) || {}; return J[nome] || null; };

  const novoId = () => { const a = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 10; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const docId = (pid, conta) => PRE + pid + ':' + conta;
  /* "jogo:<partida>:<conta>" → { pid, conta } | null */
  function lerId(id) {
    const m = /^jogo:([a-z0-9]{6,16}):([0-9a-zA-Z_-]{1,64})$/.exec(String(id || ''));
    return m ? { pid: m[1], conta: m[2] } : null;
  }
  const inteiro = (v, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0; };
  const lista = v => (Array.isArray(v) ? v : []);
  const lancesDe = d => lista(d && d.lances).filter(x => x && Number.isInteger(x.n) && x.n >= 0 && typeof x.id === 'string').slice(0, 2000);

  /* Junta os documentos de uma partida (as linhas da coleção) numa visão só.
     docs: [{ id, dono_id, dados, apagado }] — os dois (ou só o de quem convidou, enquanto não há resposta).
     → { pid, jogo, criador: { conta, pc, pcNome, lado, d }, convidado: { conta, pc, pcNome, lado, d } | null, aposta,
         status: 'convite' | 'recusado' | 'cancelado' | 'jogando' | 'fim', estado, lances: [ids], vez: conta, ultimo,
         fim: { vencedor: conta | null, motivo } | null, empateOferecido: conta | null } | null */
  function juntar(docs) {
    docs = (docs || []).filter(l => l && !l.apagado && l.dados && lerId(l.id));
    const a = docs.find(l => l.dados.papel === 'criador' && lerId(l.id).conta === l.dono_id);
    if (!a) return null;
    const pid = lerId(a.id).pid, A = a.dados;
    const J = motor(A.jogo); if (!J || !JOGOS.includes(A.jogo)) return null;
    const contaA = a.dono_id, contaB = typeof A.contra === 'string' ? A.contra : null;
    const b = docs.find(l => l !== a && lerId(l.id).pid === pid && l.dono_id === contaB && lerId(l.id).conta === contaB && l.dados.papel === 'convidado');
    const B = b ? b.dados : null;
    const ladoA = A.lado === 1 ? 1 : 0;
    const p = {
      pid, jogo: A.jogo, nomeJogo: NOMES[A.jogo], aposta: inteiro(A.aposta, MAX_APOSTA), t: Number(A.t) || 0,
      criador: { conta: contaA, pc: A.pc || null, pcNome: String(A.pcNome || '?'), lado: ladoA, d: A },
      convidado: { conta: contaB, nome: String(A.contraNome || '?'), pc: B ? B.pc || null : null, pcNome: B ? String(B.pcNome || '?') : null, lado: 1 - ladoA, d: B },
      status: 'convite', estado: J.inicial(), lances: [], ultimo: null, fim: null, vez: null, empateOferecido: null,
    };
    if (A.cancela && !(B && B.resp === 'aceito')) { p.status = 'cancelado'; return p; }
    if (!B) return p;
    if (B.resp === 'recusado') { p.status = 'recusado'; return p; }
    if (B.resp !== 'aceito') return p;
    p.status = 'jogando';
    // os lances, na ordem, conferidos pelas regras
    const porLado = [null, null]; porLado[ladoA] = lancesDe(A); porLado[1 - ladoA] = lancesDe(B);
    const contaDoLado = l => (l === ladoA ? contaA : contaB);
    let e = J.inicial(), n = 0, ultimo = null;
    for (;;) {
      const lado = J.vez(e);
      if (J.fim(e)) break;
      const x = porLado[lado].find(y => y.n === n);
      if (!x) break;
      const m = J.lancePorId(e, x.id);
      if (!m) break;
      ultimo = { de: m.de, para: m.para, caminho: m.caminho || null, id: m.id, nome: J.nomeDoLance(e, m), quem: contaDoLado(lado) };
      e = J.jogar(e, m); p.lances.push(x.id); n++;
    }
    p.estado = e; p.ultimo = ultimo;
    const f = J.fim(e);
    if (f) p.fim = { vencedor: f.vencedor === null ? null : contaDoLado(f.vencedor), motivo: f.motivo, lado: f.vencedor };
    else if (A.desiste || B.desiste) {
      const quem = A.desiste ? contaA : contaB;
      p.fim = { vencedor: quem === contaA ? contaB : contaA, motivo: 'desistência', lado: quem === contaA ? 1 - ladoA : ladoA };
    } else if (Number.isInteger(A.empate) && A.empate === B.empate && A.empate === n) {
      p.fim = { vencedor: null, motivo: 'empate combinado', lado: null };
    }
    if (p.fim) { p.status = 'fim'; return p; }
    p.vez = contaDoLado(J.vez(e));
    if (Number.isInteger(A.empate) && A.empate === n && B.empate !== n) p.empateOferecido = contaA;
    else if (Number.isInteger(B.empate) && B.empate === n && A.empate !== n) p.empateOferecido = contaB;
    return p;
  }

  /* As partidas da mesa, a partir de todas as linhas da coleção de documentos: [visão], a mais nova primeiro. */
  function partidas(linhas) {
    const por = new Map();
    for (const l of linhas || []) {
      const x = lerId(l && l.id); if (!x || l.apagado) continue;
      if (!por.has(x.pid)) por.set(x.pid, []);
      por.get(x.pid).push(l);
    }
    const out = [];
    for (const docs of por.values()) { const p = juntar(docs); if (p) out.push(p); }
    return out.sort((a, b) => b.t - a.t);
  }

  /* De que lado esta conta joga (null: não joga). */
  const meuLado = (p, conta) => (p.criador.conta === conta ? p.criador : p.convidado.conta === conta ? p.convidado : null);

  /* Quanto esta conta ainda tem a receber da partida (e se é a vez dela de receber). → { lapros, motivo } | null */
  function aReceber(p, conta) {
    const eu = meuLado(p, conta); if (!eu || !eu.d || !eu.d.pagou || eu.d.recebeu || !p.aposta) return null;
    if (eu === p.criador && (p.status === 'recusado' || p.status === 'cancelado')) return { lapros: p.aposta, motivo: p.status === 'recusado' ? 'convite recusado' : 'convite cancelado' };
    if (p.status !== 'fim') return null;
    const outro = eu === p.criador ? p.convidado : p.criador;
    if (!outro.d || !outro.d.pagou) return { lapros: p.aposta, motivo: 'o outro não chegou a pagar' };
    if (p.fim.vencedor === null) return { lapros: p.aposta, motivo: 'empate' };
    if (p.fim.vencedor === conta) return { lapros: 2 * p.aposta, motivo: 'vitória' };
    return { lapros: 0, motivo: 'derrota' };
  }

  /* O texto para a mesa ao vivo. */
  function textoDoFim(p) {
    const a = p.criador, b = p.convidado, J = motor(p.jogo);
    const nomeLado = x => x.pcNome + (J ? ' (' + J.lados[x.lado] + ')' : '');
    if (!p.fim) return '';
    if (p.fim.vencedor === null) return a.pcNome + ' e ' + b.pcNome + ' empataram no ' + p.nomeJogo + ' (' + p.fim.motivo + ').' + (p.aposta ? ' Cada um recebe de volta os ' + p.aposta + ' lapros.' : '');
    const v = p.fim.vencedor === a.conta ? a : b, d = v === a ? b : a;
    return nomeLado(v) + ' venceu ' + nomeLado(d) + ' no ' + p.nomeJogo + ' (' + p.fim.motivo + ', em ' + p.lances.length + ' lances).' + (p.aposta ? ' Levou ' + 2 * p.aposta + ' lapros.' : '');
  }
  function textoDoInicio(p) {
    return p.criador.pcNome + ' e ' + p.convidado.pcNome + ' começaram uma partida de ' + p.nomeJogo + (p.aposta ? ', valendo ' + p.aposta + ' lapros de cada um' : '') + '. Quem quiser, assiste na aba Jogos de Tabuleiro.';
  }

  const api = Object.freeze({ PRE, JOGOS, NOMES, MAX_APOSTA, novoId, docId, lerId, juntar, partidas, meuLado, aReceber, textoDoFim, textoDoInicio, inteiro, motor });
  const TC = (root.TC = root.TC || {});
  TC.jogos = TC.jogos || {};
  TC.jogos.online = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
