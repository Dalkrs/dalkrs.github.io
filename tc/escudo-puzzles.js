/* Tiny Cats · os puzzles do lote 46 (a conta pura, sem DOM), registrados no Escudo do mestre (tc/escudo.js):
     Palavras  — cruzadas, caça-palavras, anagrama (do banco por tema, ou as palavras do mestre)
     Caminhos  — labirinto, espelhos de luz, ligar os fios
     Lógica    — sudoku de runas, a pedra falsa (balança), equilibrar os pratos (balança), tabuleiro deslizante
     Memória   — pares, repetir a sequência
   Como os de antes: tudo sai da semente; o estado muda pelo banco (pista_jogar), um lance de cada vez; a resposta
   não vai para os jogadores — vai o md5 dela. Onde a tela precisa saber a resposta para jogar (a balança pesa, as
   cartas viram, a sequência pisca), ela vai embaralhada com o sal (pub.x), não à vista.
   Cada tipo: { nome, grupo, erra, desc, normDef(p, o), montar(def, r, ctx) → { pub, estado, provaCerta, seg },
   prova(jogo, tentativa) → string | null, dica(jogo, m) → { mudas, txt } | null, resposta(m, def) → texto }. */
(() => {
  'use strict';
  const E = (typeof window !== 'undefined' && window.TC && window.TC.escudo) || (typeof require === 'function' ? require('./escudo.js') : null);
  if (!E) return;
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  const N3 = (dif, a, b, c) => (dif === 'facil' ? a : dif === 'medio' ? b : c);
  const intOk = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const listaInt = (v, a, b, max) => (Array.isArray(v) ? v.filter(x => intOk(x, a, b)).slice(0, max || 400) : []);

  /* ---------------- embaralhar com o sal (pub.x) ---------------- */
  function fluxo(sal) { let h = 0; for (const c of String(sal)) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return E.mulberry(h ^ 0x5bd1e995); }
  function cobrir(v, sal) {
    const s = encodeURIComponent(JSON.stringify(v)), r = fluxo(sal);
    let o = ''; for (let i = 0; i < s.length; i++) o += ((s.charCodeAt(i) ^ Math.floor(r() * 256)) & 255).toString(16).padStart(2, '0');
    return o;
  }
  function descobrir(x, sal) {
    if (typeof x !== 'string' || x.length % 2) return null;
    const r = fluxo(sal); let s = '';
    for (let i = 0; i < x.length; i += 2) s += String.fromCharCode(parseInt(x.slice(i, i + 2), 16) ^ Math.floor(r() * 256));
    try { return JSON.parse(decodeURIComponent(s)); } catch (e) { return null; }
  }

  /* ---------------- o banco de palavras, por tema ----------------
     [a palavra, a dica]. A palavra vale sem acento e sem espaço nas grades (CERVEJA, BALCAO); a dica é a das cruzadas. */
  const TEMAS = {
    taverna: ['Taverna', [['Cerveja', 'Bebida de cevada servida na caneca'], ['Caneca', 'Onde a bebida espumante é servida'], ['Bardo', 'Canta histórias em troca de moedas'],
      ['Estalagem', 'Pousada à beira da estrada'], ['Lareira', 'Aquece o salão nas noites frias'], ['Dados', 'Rolados nas mesas de aposta'], ['Taverneiro', 'O dono do balcão'],
      ['Hidromel', 'Vinho feito de mel'], ['Balcão', 'Onde se pede a bebida'], ['Ensopado', 'Comida quente da panela grande'], ['Moeda', 'Paga a conta'], ['Briga', 'Começa com um copo derrubado'],
      ['Quarto', 'Alugado para passar a noite'], ['Viajante', 'Chega com poeira na capa'], ['Barril', 'Guarda o vinho na adega'], ['Rumor', 'Notícia que ninguém confirma'], ['Alaúde', 'O instrumento de cordas do bardo'], ['Brinde', 'Copos erguidos juntos']]],
    floresta: ['Floresta', [['Carvalho', 'Árvore velha de folhas recortadas'], ['Musgo', 'Verde e macio sobre as pedras'], ['Clareira', 'Lugar aberto no meio das árvores'], ['Riacho', 'Água que corre entre as pedras'],
      ['Raposa', 'Ruiva e esperta'], ['Cogumelo', 'Nasce no úmido; alguns envenenam'], ['Cervo', 'Tem galhada na cabeça'], ['Trilha', 'Caminho aberto pelos pés'], ['Lobo', 'Uiva para a lua'], ['Seiva', 'O sangue das árvores'],
      ['Coruja', 'Caça à noite, em silêncio'], ['Raiz', 'Segura a árvore no chão'], ['Folhagem', 'As folhas todas juntas'], ['Espinho', 'Fura quem passa'], ['Druida', 'Guardião dos bosques'], ['Névoa', 'Esconde o caminho de manhã'], ['Javali', 'Porco do mato, de presas'], ['Pinheiro', 'Sempre verde, dá pinhas']]],
    masmorra: ['Masmorra', [['Armadilha', 'Espera o descuidado'], ['Corrente', 'Elos de ferro'], ['Tocha', 'Fogo na ponta de um pau'], ['Esqueleto', 'Só os ossos'], ['Cela', 'Onde o prisioneiro fica'],
      ['Alavanca', 'Puxe e algo se abre'], ['Cripta', 'Câmara dos mortos'], ['Grades', 'Ferros que prendem'], ['Morcego', 'Dorme de cabeça para baixo'], ['Portão', 'A entrada de ferro'], ['Escuridão', 'Onde a tocha não chega'],
      ['Lodo', 'Lama verde e grudenta'], ['Chave', 'Abre a fechadura'], ['Baú', 'Guarda o tesouro'], ['Aranha', 'Tece a teia nos cantos'], ['Túnel', 'Passagem debaixo da terra'], ['Carcereiro', 'Guarda das celas'], ['Ossos', 'O que sobra do aventureiro']]],
    mar: ['Mar', [['Navio', 'Leva gente pelo mar'], ['Âncora', 'Prende o barco no fundo'], ['Vela', 'Pega o vento'], ['Pirata', 'Ladrão dos mares'], ['Ilha', 'Terra cercada de água'], ['Bússola', 'Aponta o norte'],
      ['Maré', 'Sobe e desce com a lua'], ['Sereia', 'Canta para afundar marinheiros'], ['Leme', 'Dá a direção ao barco'], ['Coral', 'Recife colorido'], ['Tempestade', 'Raios e ondas altas'], ['Porto', 'Onde os barcos atracam'],
      ['Gaivota', 'Ave que grita no cais'], ['Canhão', 'Dispara balas de ferro'], ['Tesouro', 'Enterrado no X do mapa'], ['Mastro', 'O poste mais alto do navio'], ['Onda', 'Quebra na praia'], ['Polvo', 'Tem oito braços']]],
    magia: ['Magia', [['Grimório', 'Livro de feitiços'], ['Feitiço', 'Palavras com poder'], ['Varinha', 'Aponta a magia'], ['Poção', 'Bebida borbulhante do caldeirão'], ['Runa', 'Letra antiga gravada na pedra'], ['Cristal', 'Pedra que guarda energia'],
      ['Encanto', 'Magia que prende'], ['Caldeirão', 'Panela da bruxa'], ['Mana', 'A energia de quem conjura'], ['Portal', 'Passagem para outro lugar'], ['Amuleto', 'Protege quem carrega'], ['Ilusão', 'Engana os olhos'],
      ['Conjuro', 'A fala que chama a magia'], ['Oráculo', 'Vê o futuro'], ['Espelho', 'Mostra o que não está ali'], ['Alquimia', 'Transformar chumbo em ouro'], ['Selo', 'Marca que tranca'], ['Pergaminho', 'Rolo com escrita mágica']]],
    guerra: ['Guerra', [['Espada', 'Lâmina longa'], ['Escudo', 'Para o golpe'], ['Elmo', 'Protege a cabeça'], ['Lança', 'Haste com ponta'], ['Catapulta', 'Atira pedras nas muralhas'], ['Cerco', 'Ninguém entra, ninguém sai'],
      ['Batalha', 'Exércitos frente a frente'], ['Muralha', 'Defende a cidade'], ['Estandarte', 'A bandeira do exército'], ['Cavalaria', 'Soldados a cavalo'], ['Trégua', 'A pausa na luta'], ['Tambor', 'Marca o passo da marcha'],
      ['Armadura', 'Roupa de metal'], ['Flecha', 'Sai do arco'], ['General', 'Comanda o exército'], ['Trincheira', 'Vala para se proteger'], ['Vitória', 'O fim que todos querem'], ['Arqueiro', 'Atira de longe']]],
    corte: ['Corte', [['Rainha', 'Senta ao lado do rei'], ['Trono', 'A cadeira do rei'], ['Coroa', 'Vai na cabeça real'], ['Castelo', 'A casa do rei'], ['Duque', 'Nobre acima do conde'], ['Banquete', 'Festa com muita comida'],
      ['Bobo', 'Faz o rei rir'], ['Conselheiro', 'Sussurra ao ouvido do rei'], ['Brasão', 'O desenho da família'], ['Espião', 'Escuta atrás das portas'], ['Traição', 'O punhal nas costas'], ['Herdeiro', 'O próximo no trono'],
      ['Baile', 'Dança no salão'], ['Cetro', 'O bastão do poder'], ['Cavaleiro', 'Jurou servir ao rei'], ['Decreto', 'Ordem escrita do rei'], ['Torre', 'A parte mais alta do castelo'], ['Aliança', 'Um acordo entre casas']]],
    templo: ['Templo', [['Altar', 'Onde se fazem as oferendas'], ['Incenso', 'Fumaça perfumada'], ['Oração', 'Fala com os deuses'], ['Sacerdote', 'Serve no templo'], ['Relíquia', 'Objeto sagrado e antigo'], ['Sino', 'Chama para a reza'],
      ['Profecia', 'O que vai acontecer, dito antes'], ['Claustro', 'Pátio cercado de colunas'], ['Deusa', 'Divindade feminina'], ['Oferenda', 'Presente para os deuses'], ['Santuário', 'Lugar sagrado'], ['Monge', 'Vive em silêncio e reza'],
      ['Vitral', 'Janela de vidro colorido'], ['Bênção', 'A graça pedida'], ['Jejum', 'Ficar sem comer, por fé'], ['Peregrino', 'Caminha até o lugar santo'], ['Estátua', 'O deus em pedra'], ['Vela', 'Queima diante do altar']]],
  };
  const ORDEM_TEMAS = Object.keys(TEMAS);
  const chaveP = s => E.sem(s).toUpperCase().replace(/[^A-Z]/g, '');
  // as palavras de um puzzle: as do mestre (def.palavras) ou as do tema, embaralhadas pela semente
  function palavrasDe(def, r, min, max) {
    const base = Array.isArray(def.palavras) && def.palavras.length ? def.palavras.map(x => [x.p, x.d || '']) : (TEMAS[def.tema] || TEMAS.taverna)[1];
    return embaralhar(base, r).map(([p, d]) => ({ p, d, k: chaveP(p) })).filter(x => x.k.length >= min && x.k.length <= max);
  }
  function normPalavras(v) {
    const out = [];
    for (const x of Array.isArray(v) ? v : []) {
      if (!ehObj(x)) continue;
      const p = E.linha(x.p, 24), k = chaveP(p);
      if (k.length < 2 || out.some(y => chaveP(y.p) === k)) continue;
      out.push({ p, d: E.linha(x.d, 120) });
      if (out.length >= 30) break;
    }
    return out.length ? out : null;
  }
  const defPalavras = (p, o) => { o.tema = Object.prototype.hasOwnProperty.call(TEMAS, p.tema) ? p.tema : 'taverna'; const l = normPalavras(p.palavras); if (l) o.palavras = l; };

  /* ======================= Palavras ======================= */
  // -- palavras cruzadas
  function montarCruzadas(def, r) {
    const alvo = N3(def.dif, 5, 7, 9);
    let melhor = null;
    for (let tent = 0; tent < 12; tent++) {
      const cand = palavrasDe(def, r, 3, 11).sort((a, b) => b.k.length - a.k.length + (r() - 0.5) * 3);
      const g = new Map(), pos = [];
      const at = (x, y) => g.get(x + ',' + y);
      const caixa = () => { let x0 = 0, x1 = 0, y0 = 0, y1 = 0; for (const k of g.keys()) { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, x1, y0, y1]; };
      function cabe(w, x, y, d) {
        const dx = d === 'h' ? 1 : 0, dy = d === 'h' ? 0 : 1;
        if (at(x - dx, y - dy) || at(x + dx * w.length, y + dy * w.length)) return -1;
        let cruz = 0;
        for (let i = 0; i < w.length; i++) {
          const cx = x + dx * i, cy = y + dy * i, c = at(cx, cy);
          if (c) { if (c.l !== w[i] || c[d]) return -1; cruz++; continue; }
          // sem encostar de lado numa palavra paralela
          if (at(cx + dy, cy + dx) || at(cx - dy, cy - dx)) return -1;
        }
        // não passar do tamanho
        const [x0, x1, y0, y1] = caixa();
        if (Math.max(x1, x + dx * (w.length - 1)) - Math.min(x0, x) > 11 || Math.max(y1, y + dy * (w.length - 1)) - Math.min(y0, y) > 11) return -1;
        return cruz;
      }
      const poe = (w, x, y, d) => {
        const dx = d === 'h' ? 1 : 0, dy = d === 'h' ? 0 : 1;
        for (let i = 0; i < w.k.length; i++) { const kk = (x + dx * i) + ',' + (y + dy * i); const c = g.get(kk) || { l: w.k[i] }; c[d] = true; g.set(kk, c); }
        pos.push({ w, x, y, d });
      };
      for (const w of cand) {
        if (pos.length >= alvo) break;
        if (!pos.length) { poe(w, 0, 0, 'h'); continue; }
        const op = [];
        for (const [kk, c] of g) {
          const [cx, cy] = kk.split(',').map(Number);
          for (let i = 0; i < w.k.length; i++) {
            if (w.k[i] !== c.l) continue;
            for (const d of ['h', 'v']) {
              const x = d === 'h' ? cx - i : cx, y = d === 'h' ? cy : cy - i, n = cabe(w.k, x, y, d);
              if (n <= 0) continue;
              // (a grade mais compacta ganha: cruzar mais e crescer menos)
              const [x0, x1, y0, y1] = caixa(), ex = d === 'h' ? x + w.k.length - 1 : x, ey = d === 'v' ? y + w.k.length - 1 : y;
              const area = (Math.max(x1, ex) - Math.min(x0, x) + 1) * (Math.max(y1, ey) - Math.min(y0, y) + 1), antes = (x1 - x0 + 1) * (y1 - y0 + 1);
              op.push({ x, y, d, n: n * 6 - (area - antes) / 6 + r() });
            }
          }
        }
        if (!op.length) continue;
        op.sort((a, b) => b.n - a.n);
        const o = op[Math.floor(r() * Math.min(2, op.length))];
        poe(w, o.x, o.y, o.d);
      }
      if (!melhor || pos.length > melhor.pos.length) melhor = { g, pos };
      if (pos.length >= alvo) break;
    }
    const { g, pos } = melhor;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const k of g.keys()) { const [x, y] = k.split(',').map(Number); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    let mask = '', sol = '';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = g.get((x + x0) + ',' + (y + y0)); mask += c ? '.' : '#'; sol += c ? c.l : ' '; }
    // a numeração: da esquerda para a direita, de cima para baixo
    const comecos = [...new Set(pos.map(p => (p.y - y0) * w + (p.x - x0)))].sort((a, b) => a - b);
    const ents = pos.map(p => ({ n: comecos.indexOf((p.y - y0) * w + (p.x - x0)) + 1, x: p.x - x0, y: p.y - y0, d: p.d, len: p.w.k.length, dica: p.w.d || 'Uma palavra de ' + p.w.k.length + ' letras', pal: p.w.p }))
      .sort((a, b) => (a.d === b.d ? a.n - b.n : a.d === 'h' ? -1 : 1));
    // as letras dadas: no fácil, uma por palavra; no médio, algumas; no difícil, nenhuma
    const dadas = {};
    if (def.dif !== 'dificil') {
      for (const e of ents) {
        if (def.dif === 'medio' && r() < 0.6) continue;
        const i = Math.floor(r() * e.len), idx = (e.y + (e.d === 'v' ? i : 0)) * w + e.x + (e.d === 'h' ? i : 0);
        dadas[idx] = sol[idx];
      }
    }
    const pub = { w, h, mask, ents: ents.map(e => ({ n: e.n, x: e.x, y: e.y, d: e.d, len: e.len, dica: e.dica })), dadas };
    return { pub, estado: {}, provaCerta: sol.replace(/ /g, ''), seg: { sol, pals: ents.map(e => e.pal) } };
  }
  const letraCz = (jg, i) => (jg.pub.dadas || {})[i] || jg.estado['d' + i] || jg.estado['c' + i] || '';
  function provaCruzadas(jg) {
    let s = '';
    for (let i = 0; i < jg.pub.mask.length; i++) { if (jg.pub.mask[i] !== '.') continue; const l = letraCz(jg, i); if (!/^[A-Z]$/.test(l)) return null; s += l; }
    return s;
  }
  function dicaCruzadas(jg, m) {
    const sol = m.seg.sol, falta = [];
    for (let i = 0; i < sol.length; i++) if (jg.pub.mask[i] === '.' && !(jg.pub.dadas || {})[i] && jg.estado['d' + i] !== sol[i]) falta.push(i);
    if (!falta.length) return null;
    const i = falta.find(x => jg.estado['c' + x] !== sol[x]) ?? falta[0];
    return { mudas: { ['d' + i]: sol[i] }, txt: 'a letra ' + sol[i] };
  }

  // -- caça-palavras
  const LETRAS_PT = 'AAAAAEEEEEOOOOIIIRRRSSSNNDDMMTTUUCCLLPPVGHQBFZJX';
  function montarCaca(def, r) {
    const n = N3(def.dif, 8, 10, 12), nw = N3(def.dif, 5, 7, 9);
    const dirs = [[1, 0], [0, 1]].concat(def.dif !== 'facil' ? [[1, 1], [1, -1]] : []);
    const todas = def.dif === 'dificil' ? dirs.concat(dirs.map(([a, b]) => [-a, -b])) : dirs;
    const g = Array(n * n).fill('');
    const usadas = [];
    for (const w of palavrasDe(def, r, 3, n).sort((a, b) => b.k.length - a.k.length)) {
      if (usadas.length >= nw) break;
      let ok = false;
      for (let t = 0; t < 200 && !ok; t++) {
        const [dx, dy] = sortear(todas, r), x = Math.floor(r() * n), y = Math.floor(r() * n);
        const xe = x + dx * (w.k.length - 1), ye = y + dy * (w.k.length - 1);
        if (xe < 0 || xe >= n || ye < 0 || ye >= n) continue;
        let bate = true;
        for (let i = 0; i < w.k.length; i++) { const c = g[(y + dy * i) * n + x + dx * i]; if (c && c !== w.k[i]) { bate = false; break; } }
        if (!bate) continue;
        for (let i = 0; i < w.k.length; i++) g[(y + dy * i) * n + x + dx * i] = w.k[i];
        usadas.push({ w, a: y * n + x, b: ye * n + xe });
        ok = true;
      }
    }
    const grade = g.map(c => c || LETRAS_PT[Math.floor(r() * LETRAS_PT.length)]).join('');
    usadas.sort((a, b) => a.w.p.localeCompare(b.w.p, 'pt-BR'));
    return { pub: { n, grade, lista: usadas.map(u => u.w.p) }, estado: {}, provaCerta: 'caca:' + usadas.map((_, i) => i).join(','), seg: { pos: usadas.map(u => [u.a, u.b]) } };
  }
  // as casas de uma linha reta de a até b (ou null, se não for reta)
  function linhaReta(n, a, b) {
    const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n), dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
    const len = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    if (!(ax === bx || ay === by || Math.abs(bx - ax) === Math.abs(by - ay))) return null;
    return [...Array(len + 1)].map((_, i) => (ay + dy * i) * n + ax + dx * i);
  }
  // a palavra que a linha a→b forma (índice na lista), ou −1
  function palavraNaLinha(pub, a, b) {
    const l = linhaReta(pub.n, a, b);
    if (!l || l.length < 2) return -1;
    const s = l.map(i => pub.grade[i]).join(''), inv = s.split('').reverse().join('');
    return pub.lista.findIndex(w => { const k = chaveP(w); return k === s || k === inv; });
  }
  const achadasCaca = jg => (Array.isArray(jg.estado.f) ? jg.estado.f.filter(x => Array.isArray(x) && x.length === 3 && intOk(x[2], 0, 40)) : []);
  function provaCaca(jg) {
    const f = [...new Set(achadasCaca(jg).map(x => x[2]))].sort((a, b) => a - b);
    return f.length === jg.pub.lista.length ? 'caca:' + f.join(',') : null;
  }
  function dicaCaca(jg, m) {
    const ach = new Set(achadasCaca(jg).map(x => x[2])), ja = listaInt(jg.estado.p, 0, 400);
    const i = m.seg.pos.findIndex((p, k) => !ach.has(k) && !ja.includes(p[0]));
    if (i < 0) return null;
    return { mudas: { p: ja.concat(m.seg.pos[i][0]) }, txt: 'onde começa “' + jg.pub.lista[i] + '”' };
  }

  // -- anagrama
  function montarAnagrama(def, r, ctx) {
    const q = N3(def.dif, 3, 4, 5), lens = N3(def.dif, [4, 6], [5, 8], [6, 11]);
    let ws = palavrasDe(def, r, lens[0], lens[1]);
    if (ws.length < q) ws = ws.concat(palavrasDe(def, r, 3, 12).filter(x => !ws.some(y => y.k === x.k)));
    ws = ws.slice(0, q);
    const itens = ws.map(w => {
      let e = w.k, t = 0;
      while ((e === w.k) && t++ < 20) e = embaralhar(w.k.split(''), r).join('');
      return { emb: e, len: w.k.length, dica: def.dif === 'dificil' ? '' : w.d };
    });
    const h = ws.map((w, i) => E.md5(ctx.sal + ':a' + i + ':' + w.k));
    return { pub: { itens, h }, estado: {}, provaCerta: ws.map(w => w.k).join('|'), seg: { pals: ws.map(w => w.p), ks: ws.map(w => w.k) } };
  }
  const confereAnagrama = (jg, i, txt) => { const k = chaveP(txt); return !!k && jg.pub.h[i] === E.md5(jg.sal + ':a' + i + ':' + k); };
  function provaAnagrama(jg) {
    const l = jg.pub.itens.map((_, i) => chaveP(jg.estado['r' + i] || ''));
    return l.every(Boolean) ? l.join('|') : null;
  }
  function dicaAnagrama(jg, m) {
    const i = jg.pub.itens.findIndex((it, k) => !jg.estado['r' + k] && String(jg.estado['l' + k] || '').length < it.len - 1);
    if (i < 0) return null;
    const n = String(jg.estado['l' + i] || '').length + 1;
    return { mudas: { ['l' + i]: m.seg.ks[i].slice(0, n) }, txt: 'o começo de uma palavra (' + m.seg.ks[i].slice(0, n) + '…)' };
  }

  /* ======================= Caminhos ======================= */
  // -- labirinto: paredes por casa (N=1, L=2, S=4, O=8)
  const PAREDE = { N: 1, L: 2, S: 4, O: 8 };
  function montarLabirinto(def, r) {
    const w = N3(def.dif, 7, 9, 11), h = w, cel = Array(w * h).fill(15), vis = Array(w * h).fill(false);
    const pilha = [Math.floor(r() * h) * w];
    vis[pilha[0]] = true;
    while (pilha.length) {
      const c = pilha[pilha.length - 1], x = c % w, y = Math.floor(c / w);
      const viz = [[0, -1, 'N', 'S'], [1, 0, 'L', 'O'], [0, 1, 'S', 'N'], [-1, 0, 'O', 'L']].filter(([dx, dy]) => x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h && !vis[(y + dy) * w + x + dx]);
      if (!viz.length) { pilha.pop(); continue; }
      const [dx, dy, a, b] = sortear(viz, r), nx = (y + dy) * w + x + dx;
      cel[c] &= ~PAREDE[a]; cel[nx] &= ~PAREDE[b]; vis[nx] = true; pilha.push(nx);
    }
    const ini = Math.floor(r() * h) * w, fim = Math.floor(r() * h) * w + w - 1;
    return { pub: { w, h, m: cel.map(v => v.toString(16)).join(''), ini, fim, nevoa: def.dif === 'dificil' }, estado: { p: ini }, provaCerta: 'lab:' + fim };
  }
  const paredesLab = (pub, i) => parseInt(pub.m[i], 16);
  function passoLab(pub, i, dir) {
    const x = i % pub.w, y = Math.floor(i / pub.w), mv = { N: [0, -1], L: [1, 0], S: [0, 1], O: [-1, 0] }[dir];
    if (!mv || paredesLab(pub, i) & PAREDE[dir]) return null;
    const nx = x + mv[0], ny = y + mv[1];
    return nx >= 0 && nx < pub.w && ny >= 0 && ny < pub.h ? ny * pub.w + nx : null;
  }
  function caminhoLab(pub, de, ate) {
    const ant = new Map([[de, -1]]), fila = [de];
    while (fila.length) { const c = fila.shift(); if (c === ate) break; for (const d of 'NLSO') { const n = passoLab(pub, c, d); if (n != null && !ant.has(n)) { ant.set(n, c); fila.push(n); } } }
    if (!ant.has(ate)) return [];
    const l = []; for (let c = ate; c !== -1; c = ant.get(c)) l.unshift(c);
    return l;
  }
  const posLab = jg => (intOk(jg.estado.p, 0, jg.pub.w * jg.pub.h - 1) ? jg.estado.p : jg.pub.ini);
  const provaLab = jg => (posLab(jg) === jg.pub.fim ? 'lab:' + jg.pub.fim : null);
  function dicaLab(jg) {
    const c = caminhoLab(jg.pub, posLab(jg), jg.pub.fim);
    if (c.length < 2) return null;
    return { mudas: { t: c.slice(1, 7) }, txt: 'os próximos passos' };
  }

  // -- espelhos de luz: a luz entra pela esquerda; os espelhos giram ("/" ou "\")
  const DIRS = { L: [1, 0], O: [-1, 0], N: [0, -1], S: [0, 1] };
  const REFLETE = { '/': { L: 'N', N: 'L', O: 'S', S: 'O' }, '\\': { L: 'S', S: 'L', O: 'N', N: 'O' } };
  function montarEspelhos(def, r) {
    const n = N3(def.dif, 5, 6, 7), voltas = N3(def.dif, 2, 3, 4), iscas = N3(def.dif, 1, 3, 5), paredes = N3(def.dif, 0, 1, 3);
    for (let tent = 0; tent < 300; tent++) {
      const y0 = Math.floor(r() * n);
      let x = 0, y = y0, d = 'L';
      const usado = new Set([y * n + x]), espelhos = [];
      let ok = true, feitas = 0;
      while (true) {
        // virar aqui?
        if (feitas < voltas && x > 0 && r() < 0.45) {
          const nd = d === 'L' || d === 'O' ? sortear(['N', 'S'], r) : sortear(['L', 'O'], r);
          const tipo = REFLETE['/'][d] === nd ? '/' : '\\';
          espelhos.push({ i: y * n + x, o: tipo });
          d = nd; feitas++;
        }
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (nx < 0 || nx >= n || ny < 0 || ny >= n) break;
        x = nx; y = ny;
        if (usado.has(y * n + x)) { ok = false; break; }
        usado.add(y * n + x);
        if (usado.size > n * n) { ok = false; break; }
      }
      if (!ok || feitas < voltas || espelhos.some(e => e.i === y0 * n)) continue;
      // a saída (o alvo): o lado e a posição
      const alvo = d === 'L' ? { l: 'L', i: y } : d === 'O' ? { l: 'O', i: y } : d === 'N' ? { l: 'N', i: x } : { l: 'S', i: x };
      if (alvo.l === 'O' && alvo.i === y0) continue;
      const livres = [...Array(n * n).keys()].filter(i => !usado.has(i));
      const emb = embaralhar(livres, r);
      const isc = emb.slice(0, iscas).map(i => ({ i, o: r() < 0.5 ? '/' : '\\' })), par = emb.slice(iscas, iscas + paredes);
      const todos = espelhos.concat(isc).sort((a, b) => a.i - b.i);
      const sol = todos.map(e => (e.o === '/' ? '0' : '1')).join('');
      // o começo: os espelhos virados ao acaso, sem já estar resolvido
      let o0, t2 = 0;
      do { o0 = todos.map(() => (r() < 0.5 ? '0' : '1')).join(''); } while (t2++ < 40 && tracarLuz({ n, ms: todos.map(e => e.i), par, y0 }, o0).saida === chaveAlvo(alvo));
      const pub = { n, y0, ms: todos.map(e => e.i), par, alvo };
      if (tracarLuz(pub, sol).saida !== chaveAlvo(alvo)) continue;
      return { pub, estado: { o: o0 }, provaCerta: 'luz:' + chaveAlvo(alvo), seg: { sol, certos: espelhos.map(e => todos.findIndex(t => t.i === e.i)) } };
    }
    // (não deveria chegar aqui)
    return { pub: { n: 3, y0: 0, ms: [], par: [], alvo: { l: 'L', i: 0 } }, estado: { o: '' }, provaCerta: 'luz:L0', seg: { sol: '', certos: [] } };
  }
  const chaveAlvo = a => a.l + a.i;
  // o caminho da luz: { casas (por onde passou), saida ('L3', ou null se bateu numa parede) }
  function tracarLuz(pub, o) {
    const n = pub.n, casas = [];
    let x = 0, y = pub.y0, d = 'L', passos = 0;
    while (passos++ < n * n * 4) {
      const i = y * n + x;
      if ((pub.par || []).includes(i)) return { casas, saida: null };
      casas.push(i);
      const k = pub.ms.indexOf(i);
      if (k >= 0) d = REFLETE[(o || '')[k] === '1' ? '\\' : '/'][d];
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0) return { casas, saida: 'O' + y };
      if (nx >= n) return { casas, saida: 'L' + y };
      if (ny < 0) return { casas, saida: 'N' + x };
      if (ny >= n) return { casas, saida: 'S' + x };
      x = nx; y = ny;
    }
    return { casas, saida: null };
  }
  const oriEsp = jg => (typeof jg.estado.o === 'string' && jg.estado.o.length === jg.pub.ms.length ? jg.estado.o : '0'.repeat(jg.pub.ms.length));
  const provaEsp = jg => (tracarLuz(jg.pub, oriEsp(jg)).saida === chaveAlvo(jg.pub.alvo) ? 'luz:' + chaveAlvo(jg.pub.alvo) : null);
  function dicaEsp(jg, m) {
    const o = oriEsp(jg).split(''), fixos = listaInt(jg.estado.f, 0, 60);
    const k = m.seg.certos.find(i => !fixos.includes(i) && o[i] !== m.seg.sol[i]) ?? m.seg.certos.find(i => !fixos.includes(i));
    if (k == null) return null;
    o[k] = m.seg.sol[k];
    return { mudas: { o: o.join(''), f: fixos.concat(k) }, txt: 'um espelho no lugar (e travado)' };
  }

  // -- ligar os fios: cada par de pontas da mesma cor, por caminhos que não se cruzam
  function montarFios(def, r) {
    const n = N3(def.dif, 5, 6, 7), k = N3(def.dif, 3, 4, 5);
    for (let tent = 0; tent < 400; tent++) {
      const usado = new Set(), caminhos = [];
      let ok = true;
      for (let c = 0; c < k && ok; c++) {
        let feito = null;
        for (let t = 0; t < 60 && !feito; t++) {
          const livres = [...Array(n * n).keys()].filter(i => !usado.has(i));
          if (!livres.length) break;
          let cur = sortear(livres, r);
          const cam = [cur], seen = new Set([cur]), alvo = 3 + Math.floor(r() * (n + 1));
          while (cam.length < alvo) {
            const x = cur % n, y = Math.floor(cur / n);
            const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx >= 0 && x + dx < n && y + dy >= 0 && y + dy < n ? (y + dy) * n + x + dx : -1))
              .filter(i => i >= 0 && !usado.has(i) && !seen.has(i));
            if (!viz.length) break;
            cur = sortear(viz, r); cam.push(cur); seen.add(cur);
          }
          if (cam.length >= 3) feito = cam;
        }
        if (!feito) { ok = false; break; }
        for (const i of feito) usado.add(i);
        caminhos.push(feito);
      }
      if (!ok) continue;
      const pares = caminhos.map(c => [c[0], c[c.length - 1]]);
      return { pub: { n, pares }, estado: {}, provaCerta: 'fios:' + k, seg: { caminhos } };
    }
    return { pub: { n: 3, pares: [] }, estado: {}, provaCerta: 'fios:0', seg: { caminhos: [] } };
  }
  const vizinhas = (n, a, b) => { const ax = a % n, ay = Math.floor(a / n), bx = b % n, by = Math.floor(b / n); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
  const fioDe = (jg, i) => listaInt(jg.estado['f' + i], 0, jg.pub.n * jg.pub.n - 1, 200);
  // o fio i está completo (de uma ponta à outra, casa a casa, sem passar por casa de outro fio nem pela ponta de outro)
  function fioCompleto(jg, i) {
    const f = fioDe(jg, i), [a, b] = jg.pub.pares[i];
    if (f.length < 2 || !((f[0] === a && f[f.length - 1] === b) || (f[0] === b && f[f.length - 1] === a))) return false;
    for (let k = 1; k < f.length; k++) if (!vizinhas(jg.pub.n, f[k - 1], f[k])) return false;
    return new Set(f).size === f.length;
  }
  function provaFios(jg) {
    const n = jg.pub.pares.length;
    if (!jg.pub.pares.every((_, i) => fioCompleto(jg, i))) return null;
    const usadas = new Set();
    for (let i = 0; i < n; i++) for (const c of fioDe(jg, i)) { if (usadas.has(c)) return null; usadas.add(c); }
    return 'fios:' + n;
  }
  function dicaFios(jg, m) {
    const i = jg.pub.pares.findIndex((_, k) => !fioCompleto(jg, k));
    if (i < 0) return null;
    const cam = m.seg.caminhos[i], mudas = { ['f' + i]: cam };
    // os outros fios que passavam por ali são cortados
    jg.pub.pares.forEach((_, k) => { if (k === i) return; const f = fioDe(jg, k), corte = f.findIndex(c => cam.includes(c)); if (corte >= 0) mudas['f' + k] = corte ? f.slice(0, corte) : null; });
    return { mudas, txt: 'um fio inteiro' };
  }

  /* ======================= Lógica ======================= */
  // -- sudoku de runas (4×4, 6×6, 9×9)
  const CAIXA = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };
  function resolverSudoku(g, n, limite) {
    const [bh, bw] = CAIXA[n];
    let conta = 0;
    const pode = (i, v) => {
      const x = i % n, y = Math.floor(i / n), x0 = x - (x % bw), y0 = y - (y % bh);
      for (let k = 0; k < n; k++) if (g[y * n + k] === v || g[k * n + x] === v) return false;
      for (let yy = y0; yy < y0 + bh; yy++) for (let xx = x0; xx < x0 + bw; xx++) if (g[yy * n + xx] === v) return false;
      return true;
    };
    const rec = () => {
      let i = g.indexOf(0);
      if (i < 0) { conta++; return conta >= limite; }
      for (let v = 1; v <= n; v++) { if (!pode(i, v)) continue; g[i] = v; if (rec()) { g[i] = 0; return true; } g[i] = 0; }
      return false;
    };
    rec();
    return conta;
  }
  function montarSudoku(def, r) {
    const n = N3(def.dif, 4, 6, 9), [bh, bw] = CAIXA[n];
    // a grade cheia: o padrão de base, com as linhas, as colunas, as faixas e os números embaralhados
    const base = (y, x) => (bw * (y % bh) + Math.floor(y / bh) + x) % n;
    const faixasY = embaralhar([...Array(n / bh).keys()], r), faixasX = embaralhar([...Array(n / bw).keys()], r);
    const linhas = faixasY.flatMap(f => embaralhar([...Array(bh).keys()], r).map(k => f * bh + k)), cols = faixasX.flatMap(f => embaralhar([...Array(bw).keys()], r).map(k => f * bw + k));
    const nums = embaralhar([...Array(n).keys()].map(v => v + 1), r);
    const sol = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) sol.push(nums[base(linhas[y], cols[x])]);
    // tirar números enquanto a resposta continua uma só (até o mínimo da dificuldade)
    const g = sol.slice(), minDadas = N3(def.dif, 6, 14, 30);
    for (const i of embaralhar([...Array(n * n).keys()], r)) {
      if (g.filter(Boolean).length <= minDadas) break;
      const v = g[i]; g[i] = 0;
      if (resolverSudoku(g.slice(), n, 2) !== 1) g[i] = v;
    }
    const simb = embaralhar(E.RUNAS, r).slice(0, n);
    return { pub: { n, bw, bh, dadas: g.join(','), simb }, estado: {}, provaCerta: sol.join(''), seg: { sol } };
  }
  const dadasSdk = jg => String(jg.pub.dadas).split(',').map(Number);
  const valSdk = (jg, i) => { const d = dadasSdk(jg)[i]; if (d) return d; const v = jg.estado['d' + i] || jg.estado['c' + i]; return intOk(v, 1, jg.pub.n) ? v : 0; };
  function provaSudoku(jg) {
    let s = '';
    for (let i = 0; i < jg.pub.n * jg.pub.n; i++) { const v = valSdk(jg, i); if (!v) return null; s += v; }
    return s;
  }
  function conflitosSdk(jg) {
    const n = jg.pub.n, bw = jg.pub.bw, bh = jg.pub.bh, out = new Set(), v = i => valSdk(jg, i);
    for (let i = 0; i < n * n; i++) {
      if (!v(i)) continue;
      const x = i % n, y = Math.floor(i / n);
      for (let j = i + 1; j < n * n; j++) {
        if (v(j) !== v(i)) continue;
        const xj = j % n, yj = Math.floor(j / n);
        if (x === xj || y === yj || (Math.floor(x / bw) === Math.floor(xj / bw) && Math.floor(y / bh) === Math.floor(yj / bh))) { out.add(i); out.add(j); }
      }
    }
    return out;
  }
  function dicaSudoku(jg, m) {
    const d = dadasSdk(jg), falta = [];
    for (let i = 0; i < d.length; i++) if (!d[i] && jg.estado['d' + i] !== m.seg.sol[i]) falta.push(i);
    if (!falta.length) return null;
    const i = falta.find(x => jg.estado['c' + x] !== m.seg.sol[x]) ?? falta[0];
    return { mudas: { ['d' + i]: m.seg.sol[i], ['c' + i]: null }, txt: 'uma runa' };
  }

  // -- a pedra falsa: uma pedra pesa diferente; poucas pesagens para achar
  function montarFalsa(def, r, ctx) {
    const n = N3(def.dif, 4, 8, 12), max = N3(def.dif, 2, 2, 3), qual = def.dif === 'dificil' ? 'qualquer' : 'pesada';
    const f = Math.floor(r() * n), d = qual === 'pesada' ? 1 : r() < 0.5 ? 1 : -1;
    return { pub: { n, max, qual, x: cobrir({ f, d }, ctx.sal) }, estado: {}, provaCerta: 'falsa:' + f + (qual === 'qualquer' ? (d > 0 ? '+' : '-') : '') };
  }
  const segredoFalsa = jg => descobrir(jg.pub.x, jg.sal) || { f: -1, d: 1 };
  // o resultado de uma pesagem: 1 (a esquerda pesa mais), −1 (a direita), 0 (equilíbrio)
  function pesar(jg, esq, dir) {
    const s = segredoFalsa(jg), peso = i => (i === s.f ? s.d : 0);
    const a = esq.reduce((t, i) => t + peso(i), 0) - dir.reduce((t, i) => t + peso(i), 0) + (esq.length - dir.length) * 10;
    return Math.sign(a);
  }
  const provaFalsa = (jg, t) => (t && intOk(t.f, 0, jg.pub.n - 1) ? 'falsa:' + t.f + (jg.pub.qual === 'qualquer' ? (t.d > 0 ? '+' : '-') : '') : null);
  function dicaFalsa(jg) {
    const s = segredoFalsa(jg), ja = listaInt(jg.estado.ok, 0, 30);
    const l = [...Array(jg.pub.n).keys()].filter(i => i !== s.f && !ja.includes(i));
    if (l.length <= 1) return null;
    const i = l[Math.floor(l.length / 2)];
    return { mudas: { ok: ja.concat(i) }, txt: 'uma pedra que é verdadeira' };
  }

  // -- equilibrar os pratos: o peso do objeto, com os pesos que há
  function montarEquilibrar(def, r) {
    const q = N3(def.dif, 4, 5, 6), ambos = def.dif !== 'facil';
    for (let t = 0; t < 200; t++) {
      const pesos = embaralhar([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15, 17, 20], r).slice(0, q).sort((a, b) => a - b);
      const usar = N3(def.dif, 2, 3, 4);
      const idx = embaralhar([...Array(q).keys()], r).slice(0, usar);
      const lado = idx.map((_, k) => (ambos && k === 0 ? 'e' : 'd'));
      if (ambos && def.dif === 'dificil') lado[1] = 'e';
      const W = idx.reduce((s, i, k) => s + (lado[k] === 'd' ? pesos[i] : -pesos[i]), 0);
      if (W <= 0 || pesos.includes(W) || W > 40) continue;
      const obj = def.dif === 'dificil' ? (() => { const a = 1 + Math.floor(r() * (W - 1)); return [a, W - a]; })() : [W];
      if (def.dif === 'dificil' && obj.some(v => v < 1)) continue;
      const sol = {}; idx.forEach((i, k) => { sol[i] = lado[k]; });
      return { pub: { pesos, obj, ambos }, estado: {}, provaCerta: 'equilibrio', seg: { sol } };
    }
    return { pub: { pesos: [1, 2], obj: [3], ambos: false }, estado: {}, provaCerta: 'equilibrio', seg: { sol: { 0: 'd', 1: 'd' } } };
  }
  const ladoEq = (jg, i) => (jg.estado['w' + i] === 'e' || jg.estado['w' + i] === 'd' ? jg.estado['w' + i] : '');
  function pratosEq(jg) {
    let e = jg.pub.obj.reduce((s, v) => s + v, 0), d = 0;
    jg.pub.pesos.forEach((p, i) => { const l = ladoEq(jg, i); if (l === 'e') e += p; else if (l === 'd') d += p; });
    return { e, d };
  }
  const provaEq = (jg, t) => { if (t !== 'soltar') return null; const p = pratosEq(jg); return p.e === p.d ? 'equilibrio' : 'x:' + p.e + ':' + p.d; };
  function dicaEq(jg, m) {
    const travados = listaInt(jg.estado.k, 0, 20);
    const i = Object.keys(m.seg.sol).map(Number).find(k => !travados.includes(k));
    if (i == null) return null;
    return { mudas: { ['w' + i]: m.seg.sol[i], k: travados.concat(i) }, txt: 'um peso no prato certo (e travado)' };
  }

  // -- tabuleiro deslizante (runas ou a imagem do mestre)
  function montarDeslizante(def, r, ctx) {
    const n = N3(def.dif, 3, 4, 4), voltas = N3(def.dif, 30, 70, 220), tot = n * n, vazio = tot - 1;
    let p = [...Array(tot).keys()], e = vazio, ant = -1;
    for (let k = 0; k < voltas; k++) {
      const x = e % n, y = Math.floor(e / n);
      const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (x + dx >= 0 && x + dx < n && y + dy >= 0 && y + dy < n ? (y + dy) * n + x + dx : -1)).filter(i => i >= 0 && i !== ant);
      const v = sortear(viz, r);
      [p[e], p[v]] = [p[v], p[e]]; ant = e; e = v;
    }
    if (p.every((x, i) => x === i)) { const v = e % n ? e - 1 : e + 1; [p[e], p[v]] = [p[v], p[e]]; }
    const modo = def.modo === 'imagem' && E.urlOk(ctx.img) ? 'imagem' : 'runas';
    const a = Number(ctx.ar);
    return { pub: { n, modo, img: modo === 'imagem' ? ctx.img : null, ar: Math.round(clamp(a > 0 ? a : 1, 0.25, 4) * 1000) / 1000, simb: E.RUNAS.slice(0, tot - 1) }, estado: { p }, provaCerta: [...Array(tot).keys()].join(',') };
  }
  const posDsl = jg => (Array.isArray(jg.estado.p) && jg.estado.p.length === jg.pub.n * jg.pub.n ? jg.estado.p : [...Array(jg.pub.n * jg.pub.n).keys()]);
  // mexer a peça da casa i (na linha ou na coluna do vazio, todas as do meio andam juntas) → as posições novas, ou null
  function deslizar(jg, i) {
    const n = jg.pub.n, p = posDsl(jg).slice(), e = p.indexOf(n * n - 1);
    const ex = e % n, ey = Math.floor(e / n), ix = i % n, iy = Math.floor(i / n);
    if (i === e || (ex !== ix && ey !== iy)) return null;
    const passo = ex === ix ? (iy > ey ? n : -n) : (ix > ex ? 1 : -1);
    let cur = e;
    while (cur !== i) { const prox = cur + passo; [p[cur], p[prox]] = [p[prox], p[cur]]; cur = prox; }
    return p;
  }
  const provaDsl = jg => posDsl(jg).join(',');
  const dicaDsl = jg => (jg.estado.ver ? null : { mudas: { ver: 1 }, txt: 'o desenho montado' });

  /* ======================= Memória e sequência ======================= */
  // -- pares
  function montarPares(def, r, ctx) {
    const q = N3(def.dif, 6, 8, 10);
    const simb = embaralhar(E.ORDEM_SIMBOLOS, r).slice(0, q);
    const cartas = embaralhar(simb.concat(simb), r);
    return { pub: { n: cartas.length, cols: N3(def.dif, 4, 4, 5), x: cobrir(cartas, ctx.sal) }, estado: {}, provaCerta: 'pares:' + q };
  }
  const cartasPares = jg => descobrir(jg.pub.x, jg.sal) || [];
  const provaPares = jg => (listaInt(jg.estado.m, 0, 60).length >= jg.pub.n ? 'pares:' + jg.pub.n / 2 : null);
  function dicaPares(jg) {
    const c = cartasPares(jg), m = listaInt(jg.estado.m, 0, 60);
    const a = c.findIndex((s, i) => !m.includes(i));
    if (a < 0) return null;
    const b = c.findIndex((s, i) => i !== a && s === c[a]);
    return { mudas: { m: m.concat(a, b), a: null, v: null }, txt: 'um par' };
  }

  // -- repetir a sequência
  function montarSequencia(def, r, ctx) {
    const k = N3(def.dif, 4, 6, 8), L = N3(def.dif, 5, 7, 9);
    const simb = embaralhar(E.ORDEM_SIMBOLOS, r).slice(0, k), seq = [];
    while (seq.length < L) { const v = Math.floor(r() * k); if (seq.length >= 2 && seq[seq.length - 1] === v && seq[seq.length - 2] === v) continue; seq.push(v); }
    return { pub: { k, L, simb, x: cobrir(seq, ctx.sal) }, estado: { r: 1, i: 0 }, provaCerta: seq.join(',') };
  }
  const seqDe = jg => descobrir(jg.pub.x, jg.sal) || [];
  const rodadaSeq = jg => (intOk(jg.estado.r, 1, jg.pub.L) ? jg.estado.r : 1);
  const progSeq = jg => (intOk(jg.estado.i, 0, jg.pub.L) ? jg.estado.i : 0);
  const provaSeq = (jg, t) => (t === 'fim' ? seqDe(jg).join(',') : null);
  function dicaSeq(jg) {
    const r = rodadaSeq(jg);
    if (r >= jg.pub.L) return null;
    return { mudas: { r: r + 1, i: 0 }, txt: 'uma rodada a menos' };
  }

  /* ---------------- o registro ---------------- */
  const P = (tipo, x) => E.registrar(tipo, x);
  P('cruzadas', { nome: 'Palavras cruzadas', grupo: 'Palavras', erra: false, desc: 'Preencham a grade com as palavras das dicas.', normDef: defPalavras, montar: montarCruzadas, prova: provaCruzadas, dica: dicaCruzadas,
    resposta: m => m.seg.pals.join(', ') });
  P('caca', { nome: 'Caça-palavras', grupo: 'Palavras', erra: false, desc: 'Achem as palavras da lista na grade: toquem a primeira e a última letra.', normDef: defPalavras, montar: montarCaca, prova: provaCaca, dica: dicaCaca,
    resposta: m => m.pub.lista.join(', ') });
  P('anagrama', { nome: 'Anagrama', grupo: 'Palavras', erra: true, desc: 'As letras de cada palavra estão embaralhadas: escrevam a palavra certa.', normDef: defPalavras, montar: montarAnagrama, prova: provaAnagrama, dica: dicaAnagrama,
    resposta: m => m.seg.pals.join(', ') });
  P('labirinto', { nome: 'Labirinto', grupo: 'Caminhos', erra: false, desc: 'Levem a marca da entrada até a saída, uma casa de cada vez.', montar: montarLabirinto, prova: provaLab, dica: dicaLab,
    resposta: () => 'chegar à saída (o caminho aparece no teste)' });
  P('espelhos', { nome: 'Espelhos de luz', grupo: 'Caminhos', erra: false, desc: 'Girem os espelhos até a luz chegar ao cristal.', montar: montarEspelhos, prova: provaEsp, dica: dicaEsp,
    resposta: m => 'a luz até o cristal (' + m.seg.certos.length + ' espelhos no caminho)' });
  P('fios', { nome: 'Ligar os fios', grupo: 'Caminhos', erra: false, desc: 'Liguem cada par de pontas da mesma cor. Os fios não podem se cruzar.', montar: montarFios, prova: provaFios, dica: dicaFios,
    resposta: () => 'ligar todos os pares sem cruzar' });
  P('sudoku', { nome: 'Sudoku de runas', grupo: 'Lógica', erra: true, desc: 'Cada runa uma vez só em cada linha, em cada coluna e em cada caixa.', montar: montarSudoku, prova: provaSudoku, dica: dicaSudoku,
    resposta: () => 'a grade completa (a dica revela uma runa)' });
  P('falsa', { nome: 'A pedra falsa', grupo: 'Lógica', erra: true, desc: 'Uma das pedras pesa diferente. Usem a balança poucas vezes e apontem a falsa.', montar: montarFalsa, prova: provaFalsa, dica: dicaFalsa,
    resposta: (m, def, jg) => { const s = descobrir(m.pub.x, m.sal); return s ? 'a pedra ' + (s.f + 1) + (m.pub.qual === 'qualquer' ? (s.d > 0 ? ', mais pesada' : ', mais leve') : '') : ''; } });
  P('equilibrar', { nome: 'Equilibrar os pratos', grupo: 'Lógica', erra: true, desc: 'Ponham pesos nos pratos até equilibrar o objeto. Soltem a balança só quando tiverem certeza.', montar: montarEquilibrar, prova: provaEq, dica: dicaEq,
    resposta: m => Object.keys(m.seg.sol).map(i => m.pub.pesos[i] + (m.seg.sol[i] === 'd' ? ' no prato vazio' : ' junto do objeto')).join(', ') });
  P('deslizante', { nome: 'Tabuleiro deslizante', grupo: 'Lógica', erra: false, desc: 'Deslizem as peças pelo espaço vazio até montar o desenho.', montar: montarDeslizante, prova: provaDsl, dica: dicaDsl,
    normDef: (p, o) => { o.modo = p.modo === 'imagem' ? 'imagem' : 'runas'; }, resposta: () => 'cada peça no seu lugar' });
  P('pares', { nome: 'Pares', grupo: 'Memória e sequência', erra: true, desc: 'Virem as cartas de duas em duas e achem os pares. Errar um par que já tinham visto conta como erro.', montar: montarPares, prova: provaPares, dica: dicaPares,
    resposta: () => 'todos os pares' });
  P('sequencia', { nome: 'Repetir a sequência', grupo: 'Memória e sequência', erra: true, desc: 'As runas acendem em ordem. Repitam a sequência; a cada rodada ela cresce.', montar: montarSequencia, prova: provaSeq, dica: dicaSeq,
    resposta: m => { const s = descobrir(m.pub.x, m.sal); return s ? s.map(i => E.SIMBOLOS[m.pub.simb[i]][0]).join(' → ') : ''; } });

  const api = {
    TEMAS, ORDEM_TEMAS, chaveP, palavrasDe, normPalavras, cobrir, descobrir,
    letraCz, linhaReta, palavraNaLinha, achadasCaca, confereAnagrama,
    PAREDE, paredesLab, passoLab, caminhoLab, posLab, tracarLuz, oriEsp, chaveAlvo, fioDe, fioCompleto, vizinhas,
    valSdk, dadasSdk, conflitosSdk, resolverSudoku, segredoFalsa, pesar, ladoEq, pratosEq, posDsl, deslizar,
    cartasPares, seqDe, rodadaSeq, progSeq,
  };
  E.mais = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
