/* (lote 205) O que uma habilidade faz no mapa, lido do texto NA HORA.
   É o mesmo leitor de src/habs/gerar_acoes.py, em JavaScript: quando TC.habsAcoes não tem a habilidade (as árvores
   reescritas, ou as que o Claude ou o mestre escreverem depois), as Cenas acham a habilidade na árvore (Fichas.arvore)
   e leem o texto de cada nível. O que está em tc/habs-acoes.js (gerado, e o escrito à mão em acoes_mao.json) continua
   valendo primeiro. As chaves do resultado são as do cabeçalho do gerador (m, al, f, r, q, mx, z, inv, c, mv, d, cu).
   Também: nq { condição: quanto o contador sobe } (as condições com número, como Rachado 2 ou +2 Costelas). */
(function (root) {
  'use strict';
  const ROM = { I: 1, II: 2, III: 3, IV: 4, V: 5 };
  const NUM = { um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
  const NUMW = String.raw`(\d+|um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)`;
  const num = s => (/^\d+$/.test(s) ? parseInt(s, 10) : (NUM[String(s).toLowerCase()] || 1));
  // o \b e o \w do Python valem para letras com acento; no JavaScript, só com isto
  const L = String.raw`[\p{L}\p{N}_]`;
  const B = `(?:(?<=${L})(?!${L})|(?<!${L})(?=${L}))`;
  const cache = new Map();
  function rx(src, fl) {
    const k = src + '\u0000' + (fl || '');
    let r = cache.get(k);
    if (!r) { r = new RegExp(src.replace(/\\b/g, B).replace(/\\w/g, L), 'u' + (fl || '')); cache.set(k, r); }
    return r;
  }
  const S = (p, t, fl) => rx(p, fl).exec(t);
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---------- condições: (regex no texto, id da condição no site) ----------
  const CONDS = [
    [String.raw`\bderrub|\bo alvo cai\b|\bcai(?:em)? no chão|\bcaem\b|\bcai \(|\bcai,|\bfica caíd|\b(?:e|o alvo|ele) cai\b`, 'caido'],
    [String.raw`\bpres[oa]s?\b|\bprende|\benraiz|não anda|\bimobiliz|\bfica no fundo`, 'preso'],
    [String.raw`\batordo|perde o (?:próximo )?turno|perde a vez`, 'atordoado'],
    [String.raw`\bsangramento|\bsangra\b|\bsangrando`, 'sangue'],
    [String.raw`\benvenen|\bveneno (?:entra|do corpo)|\bpeçonha`, 'veneno'],
    [String.raw`\bqueima(?:ndo|m|r)?\b|\bpega fogo|\bem chamas\b`, 'fogo'],
    [String.raw`\bcongela(?:d[oa]s?)? (?:o|um|uma|os|quem|o alvo|inimigos|todos)\b|\bfica(?:m)? congelad`, 'gelo'],
    [String.raw`\bfica cego|\bficam cegos|\bcega\b|\bcegueira|\bofusca`, 'cego'],
    [String.raw`\bamedront|\bmedo\b|\bfoge(?:m)? de medo`, 'medo'],
    [String.raw`\babalad`, 'abalado'],
    [String.raw`\bdorme|\bdormem|\badormec`, 'adormecido'],
    [String.raw`\bsonolent`, 'sonolento'],
    [String.raw`\bconfus`, 'confuso'],
    [String.raw`\benfeiti|\bencantad`, 'enfeiticado'],
    [String.raw`\bsilenci`, 'silencio'],
    [String.raw`\bamaldiçoad|\bmaldição\b`, 'maldicao'],
    [String.raw`\bmarcad|\bmarca (?:um|o|uma|dois|até)`, 'marcado'],
    [String.raw`\bdistraíd|\bdistrai\b`, 'distraido'],
    [String.raw`\bexpost`, 'exposto'],
    [String.raw`(?<!sem )\bprovoca(?!r ataque)`, 'provocado'],
    [String.raw`\bdesarma`, 'desarmado'],
    [String.raw`\blent[oa]s?\b|metade do movimento|\bandam? (?:só )?metade`, 'lento'],
    [String.raw`\bescolhid`, 'escolhido'],
    [String.raw`\bo protegido\b|\bseu protegido|\bvira (?:o )?(?:seu )?protegido|\bfica protegid[oa] (?:por|pel)`, 'protegido'],
    // (lote 205) as condições das classes refeitas (lote 202)
    [String.raw`\bfica(?:m)? no ar\b`, 'noAr'],
    [String.raw`\bganha um ponto\b|\bfica com 2 pontos\b`, 'ponto'],
    [String.raw`\+\d de mira\b`, 'mira'],
    [String.raw`\bfica cravada\b|\bdeixa (?:uma |2 )?cravadas?\b`, 'cravada'],
    [String.raw`\bcomo réu\b|\bviram réus\b|\bganha(?:m)? (?:1|2) acusaç`, 'acusacoes'],
    [String.raw`\bcom um elo\b|\bficam com elo\b|\bviram elos\b`, 'eloVoto'],
    [String.raw`\b(?:\d|um) rachados?\b`, 'rachado'],
    [String.raw`\ba esfera fica nele\b|\buma esfera em cada\b|\bponha uma esfera\b`, 'esfera'],
    [String.raw`\b(?:\d|um) iluminados?\b`, 'iluminado'],
    [String.raw`\brecebe uma bênção\b|^bênção:|\btêm a bênção`, 'bencao'],
    [String.raw`\bplante (?:um|\d) brotos?\b|\b(?:\d|um) brotos?\b`, 'broto'],
    [String.raw`\bescolha um par\b`, 'par'],
    [String.raw`\b(?:\d|um|uma) lendas?\b`, 'lenda'],
    [String.raw`\b(?:\d|um) envergonhados?\b`, 'envergonhado'],
    // (lote 205) a Kitsune Ayto
    [String.raw`\bficam? sem sombra\b`, 'semSombra'],
    [String.raw`\barranca (?:uma|a) lembrança\b`, 'roubado'],
  ];
  // o que é em você (ou no aliado): só quando o texto fala de você
  const CONDS_SI = [
    [String.raw`\ba fome negra sobe\b|\+1 de fome negra\b`, 'fomeNegra'],   // (lote 205) a Kitsune Ayto
    [String.raw`\bfica(?:m)? escondid|\bfica(?:m)? invisív|\bsome da vista|\bvocê some\b`, 'escondido'],
    [String.raw`\bvocê voa\b|\bvoa por\b|\bfica voando|\bvoa livre`, 'voando'],
    [String.raw`\bregenera|\bcura tier [IV]+ por turno|\bcura .{0,20} no começo`, 'regen'],
    // (lote 205)
    [String.raw`\bguarda aberta (?:iii|ii|i)\b`, 'guardaAberta'],
    [String.raw`\+\d cargas? de vento\b`, 'cargasVento'],
    [String.raw`\bcobrem você\b|\+\d costelas\b`, 'costelas'],
    [String.raw`\+\d de calor\b`, 'calor'],
    [String.raw`\+\d compassos?\b`, 'compasso'],
    [String.raw`\bponha \d placas\b|\+\d placas?\b`, 'placas'],
    [String.raw`\bquem te bate\w* (?:corpo a corpo )?leva dano tier \w+ de fogo`, 'armaduraBrasa'],
    [String.raw`^uma canção\b|\bcomece uma canção\b`, 'verso'],
  ];
  // quanto o contador sobe: o número escrito ("2 Rachados", "+2 Costelas", "Guarda Aberta II")
  const QUANTO = {
    rachado: String.raw`\b(\d) rachados?\b`, iluminado: String.raw`\b(\d) iluminados?\b`, broto: String.raw`\b(\d) brotos?\b`,
    lenda: String.raw`\b(\d) lendas?\b`, envergonhado: String.raw`\b(\d) envergonhados?\b`, mira: String.raw`\+(\d) de mira\b`,
    costelas: String.raw`(?:\+|cobrem você: )(\d) costelas\b`, calor: String.raw`\+(\d) de calor\b`, compasso: String.raw`\+(\d) compassos?\b`,
    placas: String.raw`(?:ponha |\+)(\d) placas?\b`, cargasVento: String.raw`\+(\d) cargas? de vento\b`, acusacoes: String.raw`\b(\d) acusaç`,
  };
  const SEM_DURACAO = new Set(['sangue', 'veneno', 'marcado', 'escolhido', 'ponto', 'mira', 'cravada', 'acusacoes', 'eloVoto', 'rachado', 'esfera',
    'iluminado', 'bencao', 'broto', 'lenda', 'envergonhado', 'cargasVento', 'costelas', 'calor', 'compasso', 'placas', 'verso', 'fomeNegra', 'roubado']);
  const COM_TESTE = new Set(['caido', 'preso', 'atordoado', 'medo', 'abalado', 'adormecido', 'sonolento', 'confuso', 'enfeiticado', 'cego', 'lento',
    'distraido', 'silencio', 'gelo', 'provocado', 'desarmado', 'maldicao', 'noAr', 'envergonhado', 'par', 'roubado']);

  const FX_PALAVRAS = [
    ['fumaça', 'fumaca'], ['névoa (?:de|que) (?:veneno|tóxic)|gás|nuvem verde|nuvem tóxica|fumaça amarela', 'toxica'], [String.raw`escur(?:o|idão|ece)|breu|trevas`, 'escuridao'],
    ['névoa', 'nevoa'], ['teia|rede', 'teia'], ['óleo', 'oleo'], ['lama|chão mole|atoleiro', 'lama'], ['gelo|congel|neve', 'gelado'],
    ['brasa', 'brasas'], ['fogo|chama|incêndio', 'fogo'], ['vento|tornado|redemoinho|ciclone', 'vento'], ['raio|trovão|tempestade', 'tempestade'],
    ['espinho|estaca', 'chaoEspinhos'], ['raiz|raízes|cipó|planta|vinha', 'raizesNirus'], ['parede de luz|barreira|escudo de|cúpula', 'barreira'],
    ['muro|muralha|parede', 'muralhaNatu'], [String.raw`luz|sol\b|sagrad|bênção`, 'sagrado'], ['cura|fonte', 'cura'], ['sombra', 'sombra'],
    ['silêncio', 'silencio'], [String.raw`esporo|pólen|pó\b`, 'esporos'], ['runa|selo|círculo', 'runas'], [String.raw`armadilha|laço|fosso|mina`, 'chaoEspinhos'],
    ['terra|tremor|terremoto|chão', 'terra'], ['água|onda', 'correnteza'], ['ácid', 'acida'], ['maldi', 'maldicao'], ['espírito|alma', 'espiritos'],
    ['sangue', 'luaSangue'], ['gravidade|peso', 'gravidade'], ['tempo', 'tempo'],
  ];
  const INVOC = [
    [String.raw`\bclones?\b|cópias? de você|sombras? idêntic`, null, null, 1, 0],
    [String.raw`\blob(?:o|os)\b`, 'Lobo', '#8A8070', 1, 5],
    [String.raw`\besqueleto`, 'Esqueleto', '#D8D2C4', 1, 4],
    [String.raw`\bzumbi`, 'Zumbi', '#6F7F5A', 1, 8],
    [String.raw`\bmorto-vivo|\bmortos-vivos|\blevanta (?:um|o|os) (?:morto|cad)`, 'Morto-vivo', '#9A9484', 1, 6],
    [String.raw`\bárvore viva|\buma árvore`, 'Árvore', '#3F7A46', 1, 10],
    [String.raw`\btorreta`, 'Torreta', '#8A7A4A', 0.5, 5],
    [String.raw`\bimp\b`, 'Imp', '#8E3B3B', 0.5, 3],
    [String.raw`\bdemônio`, 'Demônio', '#6E2A2A', 1, 8],
    [String.raw`\bespírito`, 'Espírito', '#9FB8E0', 1, 4],
    [String.raw`\bfera\b|\bcompanheiro`, 'Fera', '#8B6B4A', 1, 10],
    [String.raw`\bcorvo|\bave\b|\bfalcão`, 'Ave', '#5A5A6A', 0.5, 2],
    [String.raw`\bgolem`, 'Golem', '#7A7A6A', 1, 12],
    [String.raw`\bservo`, 'Servo', '#7A6A70', 1, 5],
    [String.raw`\brei antigo|\brei-sem-coroa`, 'Rei antigo', '#B8A86A', 1, 20],
    [String.raw`\bsol pequeno`, 'Sol pequeno', '#E0C060', 0.5, 0],
    [String.raw`\bbandeira|\bestandarte`, 'Bandeira', '#D9B44A', 0.5, 0],
    [String.raw`\bboneco|\bespantalho|\bisca\b`, 'Isca', '#A08A6A', 1, 3],
    [String.raw`\bengenhoca|\baranha`, 'Engenhoca', '#6A6A6A', 0.5, 3],
  ];
  const CONTA = String.raw`(?:clones?|lobos?|esqueletos?|zumbis?|mortos-vivos|servos?|espíritos?|imps?|demônios?|torretas?|chamas|corvos?|aves?|árvores?|iscas?|bonecos?|cópias|sombras)`;

  function turnos(t) {
    const m = S('por ' + NUMW + ' turnos?', t, 'i');
    if (m) return num(m[1]);
    if (S('até o fim do (?:seu )?próximo turno|no próximo turno|por 1 turno', t, 'i')) return 1;
    if (S('até o fim da luta', t, 'i')) return 10;
    return null;
  }
  function teste(t) {
    let m = S('teste de (Vigor|CAN ou DES|DES ou CAN|CAN|DES|VIT|FOR|AGI)', t) || S('testa(?:m)? (Vigor|CAN ou DES|DES ou CAN|CAN|DES|VIT|FOR|AGI)', t);
    if (!m) return null;
    const k = m[1];
    return k === 'Vigor' ? 'vigor' : k.includes('ou') ? 'candes' : k;
  }
  const tier = (pal, t) => { const m = S(pal + String.raw` tier (V|IV|III|II|I)\b`, t); return m ? ROM[m[1]] : null; };
  function alcance(t) {
    const m = S('(?:a até|até|a) ' + NUMW + ' cédulas?', t);
    if (m) return num(m[1]);
    if (S('à vista|alcance ilimitado|o campo inteiro', t)) return 30;
    if (S(String.raw`colad|corpo a corpo|\btoque|\btoca\b|\bmordida|\bgolpe\b|\bsoco|\bchute|\bagarra`, t, 'i')) return 1;
    if (S('tiro|flecha|atira|arremess|virote|kunai|lança|dardo|agulha|disparo|projétil|bola de', t, 'i')) return 8;
    return null;
  }

  // o que o texto de um nível diz. base: o do nível anterior (o que este não diz, herda)
  function ler(t, base) {
    t = String(t || '');
    const s = Object.assign({}, base || {});
    const tl = t.toLowerCase();
    const d = tier('Dano', t);
    let cu = tier('Cura', t) || tier('cura', t);
    if (!cu) { const m = S(String.raw`curam? tier (V|IV|III|II|I)\b`, t); if (m) cu = ROM[m[1]]; }
    if (d) s.d = d;
    if (cu) s.cu = cu;
    const soNum = S(String.raw`^\s*(?:E |Com )?(?:Dano|Cura|Defesa)[^.]{0,30}\.?\s*$`, t) && base;
    if (soNum) return s;
    const al = alcance(t);
    const herda = !!base && al == null && t.length < 90 && !S('área|raio|círculo|cone|linha|parede|muro|em volta', tl);
    const plural = S(String.raw`\b(inimigos|aliados|todos|quem estiver|cada inimigo|cada aliado|os seres|todo inimigo|todo aliado)\b`, tl);
    const area = S('(?:área|raio|círculo|cúpula) de ' + NUMW + '(?: cédulas?)?', tl);   // (lote 205) "círculo de 2"
    const cone = S(String.raw`\bcone\b(?: de ` + NUMW + ')?', tl);
    const linha = S(String.raw`\b(?:em linha|uma linha|linha de|parede de|muro de|muralha de|corredor de)\s*` + NUMW + '?', tl);
    if (!('q' in s) || !base) s.q = S(String.raw`\baliad`, tl) && !S(String.raw`\binimig`, tl) ? 'a' : S(String.raw`\binimig`, tl) ? 'i' : 't';
    const mx = S('até ' + NUMW + ' (?:inimigos|aliados|alvos)', tl);
    if (mx) s.mx = num(mx[1]);
    let m;
    if (cone) Object.assign(s, { m: 'ponto', f: 'cone', r: cone[1] ? num(cone[1]) : (al || 3), al: 0 });
    else if (linha && S('parede|muro|muralha|corredor', tl)) Object.assign(s, { m: 'ponto', f: 'line', r: linha[1] ? num(linha[1]) : 3, al: al || 6 });
    else if (linha) Object.assign(s, { m: 'ponto', f: 'line', r: linha[1] ? num(linha[1]) : (al || 6), al: 0 });
    else if ((m = S('a ' + NUMW + ' cédulas? do ponto', tl))) Object.assign(s, { m: 'ponto', f: 'circ', r: num(m[1]), al: al && al > 2 ? al : 6 });
    else if (plural && S('(?:todos|todo|os)? ?(?:os )?(?:inimigos|aliados) à vista|todos à vista', tl)) Object.assign(s, { m: 'volta', f: 'circ', r: 30, al: 0 });
    else if (area) {
      const r = num(area[1]), centroSi = S(String.raw`em volta de você|à sua volta|ao seu redor|em volta\b|\bpisão\b|\bpisa\b`, tl) && !al;
      Object.assign(s, { m: centroSi ? 'volta' : 'ponto', f: 'circ', r, al: centroSi ? 0 : (al && al !== r ? al : 6) });
    } else if (plural && al && S(String.raw`\b(?:inimigos|aliados|todos|todo inimigo|todo aliado|cada inimigo|cada aliado) (?:a|que estiverem a|que começarem o turno a|a até) ` + NUMW + ' cédulas?', tl)) Object.assign(s, { m: 'volta', f: 'circ', r: al, al: 0 });
    else if (S(String.raw`\b(?:inimigos|aliados) colados|quem estiver colado|todos colados`, tl)) Object.assign(s, { m: 'volta', f: 'circ', r: 1, al: 0 });
    else if (S(String.raw`\b(?:um|o|num|uma|a) (?:alvo|inimigo|aliado|ser|criatura|morto-vivo seu)|\bo alvo\b|\bnum alvo|\bum ser\b|\bem quem\b`, tl) || (s.d && !plural)) Object.assign(s, { m: 'alvo', al: al || 1 });
    else if (S(String.raw`\b(anda|salta|corre|pula|teleporta|aparece|atravessa|avança|recua|dispara até)\b`, tl)) Object.assign(s, { m: 'ponto', al: al || 4 });
    else if (!('m' in s)) s.m = 'si';
    if (herda) for (const k of ['m', 'al', 'f', 'r', 'q', 'mx']) if (k in base) s[k] = base[k];
    // zona no chão
    const tt = turnos(t);
    const fxDe = def => { for (const [p, v] of FX_PALAVRAS) if (S(p, tl)) return v; return def; };
    if (s.f && (tt || S(String.raw`parede|muro|muralha|armadilha|fosso|laço|mina\b`, tl))) {
      const fx = fxDe(null);
      if (fx) s.z = { fx, t: tt || (S(String.raw`armadilha|laço|fosso|mina\b`, tl) ? 10 : 2) };
    } else if (S(String.raw`\b(?:arma|monta|cria|abre|planta|finca) (?:um|uma|o|a)? ?(?:armadilha|laço|fosso|mina|totem|círculo|selo)`, tl)) {
      const fx = fxDe('runas');
      Object.assign(s, { m: 'ponto', f: 'circ', r: S('fosso de ' + NUMW, tl) ? 1 : 0.5, al: s.al || 3 });
      s.z = { fx, t: tt || 10 };
    }
    // invocação
    let achou = false;
    for (const [p, nm, cor, tam, vida] of INVOC) {
      const mm = S(p, tl);
      if (!mm) continue;
      const ini = mm.index, fim = mm.index + mm[0].length;
      if (S(String.raw`^\s*(?:seu|seus|sua|suas)\b`, tl.slice(fim, fim + 8)) || S('(?:seu|seus|sua|suas|os seus|cada) $', tl.slice(Math.max(0, ini - 9), ini))) { achou = true; break; }
      if (S(String.raw`expuls|consert|desmont|\bdoma|destr[oó]i|\bbane|afasta|contra (?:mortos|morto|espírito|demônio)|\bem (?:mortos|espíritos)`, tl)) { achou = true; break; }
      if (S(String.raw`\b(?:a|o|as|os|sua|seu|à|ao|da|do|na|no) $`, tl.slice(Math.max(0, ini - 4), ini)) && !S('levanta|invoca|chama|aparece|surge|cria|ergue|nasce|brota|monta|planta|finca', tl)) { achou = true; break; }
      if (S(String.raw`\bvir[ae] (?:o |a |um |uma |meia )?$`, tl.slice(Math.max(0, ini - 12), ini))) { achou = true; break; }
      if (!S(String.raw`levanta|invoca|chama|aparece|aparecem|surge|surgem|lutam?\b|cria|ergue|nasce|brota|monta|planta|finca|\b(?:um|uma|dois|duas|três|quatro|cinco|seis) ` + esc(mm[0].trim().slice(0, 5)), tl)) continue;
      let n = 1;
      const mn2 = S(String.raw`\b` + NUMW + ' ' + CONTA, tl);
      if (mn2) n = num(mn2[1]);
      s.inv = nm == null ? { clone: true, n, t: tt || 2 } : { nome: nm, cor, tam, vida, t: tt || 3, n };
      if (s.m === 'alvo' && !s.d) s.m = 'si';
      achou = true; break;
    }
    if (!achou && base && base.inv) {
      const mn2 = S(String.raw`\b` + NUMW + ' ' + CONTA, tl);
      if (mn2) s.inv = Object.assign({}, base.inv, { n: num(mn2[1]) });
    }
    const tc = tl.replace(rx('^(?:quando|se|sempre que|toda vez que)[^:,]*[:,]'), '').trim();
    if (s.inv && !herda) {
      if (s.inv.clone) s.m = 'si';
      else if (['alvo', 'si', undefined, null].includes(s.m)) Object.assign(s, { m: 'ponto', al: al && al > 1 ? al : 3 });
    }
    // mover
    let mv = null;
    let mm = S('empurr|joga|arremessa', tc) ? S(NUMW + ' cédulas? para (?:trás|longe|fora)', tc) : null;
    mm = mm || S(String.raw`empurr\w*(?: [^.]{0,30}?)? ` + NUMW + ' cédulas?', tc) || S('empurr', tc);
    if (mm && S(String.raw`ninguém (?:te|o|a|os) empurra|não (?:pode ser|é) empurrad`, tc) && (tc.match(/empurr/g) || []).length === 1) mm = null;   // (lote 205) defesa, não empurrão
    if (mm) mv = { k: 'empurra', d: mm[1] !== undefined ? num(mm[1]) : 1 };
    mm = S(String.raw`\bpuxa\w*(?: [^.]{0,30}?)? ` + NUMW + ' cédulas?', tc) || S(String.raw`\bpuxa(?:d[oa]s?)? (?:o alvo|um inimigo|para perto|até você)`, tc);
    if (mm && !mv) mv = { k: 'puxa', d: mm[1] !== undefined ? num(mm[1]) : 3 };
    if (S('troca(?:m)? de lugar', tc)) mv = { k: 'troca', d: 0 };
    mm = S(String.raw`\b(?:anda|salta|corre|pula|teleporta|avança|recua|atravessa|dispara|voa)\w*(?: [^.]{0,20}?)? (?:até )?` + NUMW + ' cédulas?(?!s| a mais)', tc);   // (lote 205) "a mais" é bônus
    if (mm && !mv) mv = { k: 'salta', d: num(mm[1]) };
    else if (S(String.raw`teleporta|reaparece|aparece (?:atrás|ao lado|colado)`, tc) && !mv) mv = { k: 'salta', d: al || 6 };
    if (mv) {
      s.mv = mv;
      if (mv.k === 'salta' && s.d && ['si', 'alvo', 'ponto', undefined, null].includes(s.m) && !s.f) Object.assign(s, { m: 'alvo', al: mv.d, q: 'i' });
      else if (mv.k === 'salta' && ['si', 'alvo', undefined, null].includes(s.m) && !s.d) Object.assign(s, { m: 'ponto', al: mv.d });
      if (mv.k === 'troca' && s.m === 'si') Object.assign(s, { m: 'alvo', al: al || 30 });
    }
    // condições
    const limpa = !!S(String.raw`perde(?:m)? (?:todas )?as condições|sem condições|tira (?:uma |a |as )?(?:maldição|condição|condições|veneno|o veneno)|remove (?:uma |a )?condição`, tl);
    if (limpa) s.lp = 1;
    let cs = [];
    const te = teste(t), tt1 = tt || 1, nq = {};
    const quanto = cid => { if (!QUANTO[cid]) return; const q = S(QUANTO[cid], tc); if (q && +q[1] > 1) nq[cid] = Math.min(6, +q[1]); };
    if (!limpa) for (const [p, cid] of CONDS) {
      const mneg = S(p, tc);
      if (!mneg) continue;
      if (S(String.raw`(?:não|nem|sem) (?:fica\w*|é|está|pode ficar|\w+r) ?$`, tc.slice(Math.max(0, mneg.index - 22), mneg.index))) continue;
      if (cid === 'marcado' && S(String.raw`\bmarcad[oa]s? (?:pela|por)|contra (?:o|um) (?:alvo )?marcad|quem está marcad|alvo marcado|presa marcada`, tl) && !S(String.raw`\bmarca (?:um|o|uma|dois)`, tl)) continue;
      if (cid === 'caido' && S(String.raw`(?:quando|se) (?:um|o|uma)? ?\w+ cai|cair\b|que cai\b|quem cai|antes de cair|caído\b(?! )`, tl) && !S(String.raw`derrub|o alvo cai|e cai\b|cai no chão`, tl)) continue;
      if (cid === 'caido' && S(String.raw`\bca(?:i|em) (?:\d|um|dois) tiers?\b`, tl) && !S(String.raw`derrub(?!a \d placa)|o alvo cai\b|cai no chão|ou caem?\b|e caem\b|testa\w* vigor ou cai`, tl)) continue;   // "o golpe cai 1 tier"
      if (cid === 'distraido' && S(String.raw`quem está distraíd|contra (?:quem|um alvo|o alvo) distraíd|acertar quem`, tl) && !S(String.raw`fica(?:m)? distraíd|distrai\b`, tl)) continue;
      if (cid === 'sangue' && S(String.raw`contra quem (?:está )?sangr|em quem sangra`, tl) && !S(String.raw`\+\d camada|camadas? de sangramento`, tl)) continue;
      // (lote 205) contar o que o alvo já tem não põe mais ("se o alvo tem 3 Rachados", "com 3 Envergonhados")
      if (['rachado', 'iluminado', 'envergonhado', 'lenda', 'broto'].includes(cid) && S(String.raw`(?:tem|com|tinha) (?:\d|um) ` + mneg[0].replace(/^\S+ /, ''), tc) && !S(String.raw`\b(?:ganha|põe|fica com|e \d|recebe|plante)\b`, tc)) continue;
      cs.push([cid, SEM_DURACAO.has(cid) ? (tt || 0) : tt1, COM_TESTE.has(cid) ? te : null, 'a']);
      quanto(cid);
    }
    if (S(String.raw`\bvir[ae] (?:o |a |um |uma |meia |fera|lobo|névoa|morcego|besta|raposa)`, tl) && !S('vir[ae] frasco|vir[ae] o rosto', tl)) cs.push(['transformado', turnos(t.split(/tra[çc]o |ao sair/i)[0]) || 10, null, 's']);   // (lote 205) o Traço de depois não conta
    for (const [p, cid] of CONDS_SI) {
      if (S(p, tc) && !S(String.raw`(?:não|nem) (?:fica|ficam)\w* (?:escondid|invisív)`, tc)) {
        cs.push([cid, SEM_DURACAO.has(cid) ? (tt || 0) : (tt || 1), null, ['si', 'ponto', 'volta', undefined, null].includes(s.m) || S(String.raw`\bvocê\b`, tl) || cid !== 'escondido' && cid !== 'voando' && cid !== 'regen' ? 's' : 'a']);
        if (cid === 'guardaAberta') { const g = S(String.raw`\bguarda aberta (iii|ii|i)\b`, tc); if (g && g[1].length > 1) nq.guardaAberta = g[1].length; }
        quanto(cid);
      }
    }
    if (tt && S(String.raw`\+\d+ (?:tiers? de dano|no acerto|de dano)|\+\d+ tiers? de dano`, tl) && !S(String.raw`contra (?:o|um|quem)`, tl.slice(0, 40))) cs.push(['inspirado', tt, null, s.q === 'a' || S(String.raw`\baliad`, tl) ? 'a' : 's']);
    if (S('defesa tier [IV]+', t, 'i') && !S('defesa -tier', tl) && (tt || s.m !== 'alvo')) cs.push(['escudo', tt || 1, null, S(String.raw`\baliad`, tl) ? 'a' : 's']);
    if (S(String.raw`defesa -tier|-\d+ (?:na|de) defesa|e na defesa`, tl)) cs.push(['vulneravel', tt || 1, te, 'a']);
    if (S(String.raw`-\d+ no acerto|-\d+ tiers? de dano|-1 tier de dano`, tl) && !S('você tem -|seus golpes', tl)) cs.push(['fraco', tt || 1, te, 'a']);
    if (S(String.raw`\+\d+ cédulas? de movimento|anda o dobro|movimento dobrado`, tl)) cs.push(['acelerado', tt || 1, null, 's']);
    if (herda && base.c) cs = base.c.slice().concat(cs.filter(c => !base.c.some(b => b[0] === c[0])));
    if (cs.some(c => c[0] === 'maldicao')) cs = cs.filter(c => c[0] !== 'vulneravel' && c[0] !== 'fraco');
    if (cs.some(c => c[0] === 'transformado') && s.m === 'alvo' && !S('o alvo|um inimigo|num alvo|um alvo', tl)) s.m = 'si';
    if (cs.some(c => c[0] === 'transformado') && s.m === 'si') delete s.d;   // (lote 205) virar a fera é em você; as garras ficam para os golpes
    if (cs.length) {
      const vis = new Set(), out = [];
      for (const c of cs) { if (vis.has(c[0])) continue; vis.add(c[0]); out.push(c); }
      s.c = out;
    } else if (base && base.c && tt) s.c = base.c.map(c => [c[0], c[1] ? tt : 0, c[2], c[3]]);
    if (Object.keys(nq).length) s.nq = nq; else if (!herda) delete s.nq;
    if (s.z && tt) s.z = Object.assign({}, s.z, { t: tt });
    if (s.inv && tt && !s.inv.clone) s.inv = Object.assign({}, s.inv, { t: tt });
    if (s.m === 'alvo' && !herda) s.q = S(String.raw`\b(?:um|o|num|no|a um|ao) aliado`, tl) && !S(String.raw`\b(?:um|o|num) (?:alvo|inimigo)`, tl) ? 'a' : 'i';
    if (s.mv && s.mv.k === 'salta' && s.m === 'ponto' && !s.f && (s.c || []).some(c => c[3] === 'a')) Object.assign(s, { m: 'alvo', q: 'i' });
    return s;
  }
  const util = s => ['z', 'inv', 'c', 'mv', 'd', 'cu'].some(k => k in s) || s.m === 'ponto' || s.m === 'volta';

  // os níveis de uma habilidade (o nó da árvore) → [spec por nível] ou null (não age no mapa)
  function doNo(n) {
    const gs = (n && Array.isArray(n.graus)) ? n.graus : [];
    if (!gs.some(g => g && g.uso)) return null;
    const lst = []; let base = null;
    for (const g of gs) { const s = ler(g && g.texto, base); lst.push(s); base = s; }
    if (!lst.some(util)) return null;
    return lst.map(s => { const o = {}; for (const k of Object.keys(s)) if (s[k] != null) o[k] = s[k]; return o; });
  }

  // o nó pelo id (n_<árvore>_<resto>): tenta a_<árvore> com 1, 2 e 3 partes (a_kare_ma, a_kitsune_nirus, a_arcano_sombrio)
  const porId = new Map();
  let fichas = null;                                         // (lote 205) as Cenas entregam as Fichas no boot: TC.habsLer.usar(Fichas)
  const usar = F => { fichas = F || null; porId.clear(); };
  function noDe(id) {
    const F = fichas && fichas.arvore ? fichas : null;   // as Fichas das Cenas (dentro do pacote; ver usar())
    if (!F || typeof id !== 'string' || !id.startsWith('n_')) return null;
    const p = id.slice(2).split('_');
    for (let k = Math.min(3, p.length - 1); k >= 1; k--) {
      let a = null; try { a = F.arvore('a_' + p.slice(0, k).join('_')); } catch (e) { a = null; }
      const n = a && Array.isArray(a.nodes) ? a.nodes.find(x => x && x.id === id) : null;
      if (n) return n;
    }
    return null;
  }
  function de(id, grau) {
    let l = porId.get(id);
    if (l === undefined) {
      const n = noDe(id);
      if (!n) return null;                                   // a árvore ainda não chegou: tenta de novo depois
      const chave = JSON.stringify(n.graus || []);
      l = { chave, lst: doNo(n) };
      porId.set(id, l);
    } else {
      const n = noDe(id);                                    // a árvore mudou (o mestre editou): lê de novo
      if (n && JSON.stringify(n.graus || []) !== l.chave) { porId.delete(id); return de(id, grau); }
    }
    if (!l.lst) return null;
    const g = Math.max(1, Math.min(l.lst.length, Math.floor(grau) || 1));
    return l.lst[g - 1] || null;
  }
  const API = { ler, doNo, de, usar, CONDS, CONDS_SI };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) {
    root.TC = root.TC || {};
    root.TC.habsLer = API;
    // o que o gerador não tem, o leitor lê na hora
    const A = root.TC.habsAcoes;
    if (A && !A._comLeitor) {
      const velho = A.de;
      A.de = (id, grau) => velho(id, grau) || de(id, grau);
      A._comLeitor = true;
    }
  }
})(typeof window !== 'undefined' ? window : null);
