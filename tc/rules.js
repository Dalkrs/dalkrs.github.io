/* =======================================================================
   TC.rules — regras de personagem de Urgm (atributos, fórmulas, recursos)

   Sem DOM, sem dependências, sem build. Script clássico:
     navegador   <script src="tc/rules.js"></script>    → window.TC.rules
     Node        const rules = require('./tc/rules.js')   (e também TC.rules)

   O miolo veio da Calculadora de Atributos (src/legado/calculadora-urgm.html)
   sem mudar o comportamento: os blocos marcados "da calculadora" são o código
   de lá, só que a configuração chega por parâmetro em vez de sair do S.cfg
   global. Com `extra` vazio, calcular(pc, cfg) devolve o mesmo que o
   calcular(pc) original em todos os campos que ele tinha —
   src/tests/rules.test.js confere isso contra o arquivo legado.

   Formatos
     pc      a ficha como a calculadora salva (ver personagemPadrao), mais
             ini: fórmula da iniciativa
             modoAtr: 'livre' + atrLivre:{FOR,DES,VIT,CAN,AGI} — ficha de jogador, que
             distribui os próprios pontos em vez de seguir tiers e percentuais
     cfg     { niveis:[{lvl,pts}], tiersPersonagem:[{t,m}], pct:{A..E},
               arredondar:'floor'|'round'|'ceil'|'none' }  (ver cfgPadrao;
             se faltar, vale o padrão)
     extra   { arvore:{ FOR:2, HP:10, ... } } — o que os nódulos alocados da
             árvore somam (sai de bonusDaArvore). Chave que é uma das
             CHAVES_BONUS soma no atributo; qualquer outra é nome de recurso.
     estado  { rec:{ [idDoRecurso]: valorAtual } } — faltando = no valor inicial
             da barra (cheia, se ela não tem "começa em")
             sob:{ [idDoRecurso]: sobrevida } — pontos por cima do recurso, que
             absorvem o dano antes dele (faltando = nenhuma)
             tmp:{ [id]: { n: nome, k: chave, v: valor, d: duração (texto), off, t } }
             — bônus temporários (comida, poção): somam enquanto não estão desligados
             qtd:{ [idDoItemDaBolsa]: quantidade } — faltando = 0

   O que entrou depois (nada disto muda as contas de quem não usa):
     recurso   comeca: onde a barra começa e para onde volta ao "encher" e no
               descanso longo (número ou fórmula; MAX = o máximo da barra);
               piso: até quanto abaixo de zero ela pode ir (número ou fórmula)
     item      rec:{ [idDoRecurso]: n } soma no máximo da barra; def:{ FOGO: n }
               soma numa das defesas específicas
     pc        defEsp:{ FOGO: n, ... } a base digitada das 13 defesas específicas;
               bolsa:[{ id, t:'pocao'|'bomba'|'runa'|'municao'|'material', nome,
               nota, e nas poções: rec (id da barra), val ("30", "-10", "2d6+3"),
               bk/bv/bd (bônus temporário: chave, valor, duração) }]
     extra     temp: o estado.tmp do personagem (resumo() passa sozinho)

   E depois ainda (relacionamentos com romance, ferimentos e missões):
     estado    rels:{ [id]: { alvo, nome, v, rom, oc, o } } — o que o personagem sente por cada um:
               v de −100 a +100; rom, a trilha de romance, de −10 (dez corações partidos) a +10 (dez
               cheios), ausente = sem trilha; oc: o valor está escondido do jogador (aí v e rom não
               ficam aqui: ficam com o mestre); o: a ordem na lista. O formato antigo, a lista
               rel:[{ id, alvo, nome, v }], continua sendo lido.
               fer:{ [id]: { p: parte do corpo, t: tipo, g: gravidade 1–3, s:{ sg, en, su, ta, inf },
               n: nota, k/v: penalidade (chave e valor, sempre ≤ 0), c: quando } } — ferimentos
               abertos; a penalidade soma como um bônus temporário enquanto o ferimento existir
               mis:{ [id]: missão } — as missões do personagem (ver missoes)
               xp:{ v, min, max } — a barra de XP: sem mínimo guardado, 0; sem máximo guardado,
               10 por nível. O XP não fica abaixo do mínimo, mas pode passar do máximo (ver xpDe)
     extra     fer: o estado.fer do personagem (resumo() passa sozinho)
     seg       o que o mestre guarda de um personagem, fora da ficha (documento só dele):
               { [idDaLinha]: { v, rom } } para a linha de valor escondido, ou a linha inteira
               { l: 1, alvo, nome, v, rom, o } quando ela nem aparece na ficha (é o caso dos NPCs)
   ======================================================================= */
(function (root) {
  'use strict';

  /* ---------- atributos do sistema (da calculadora) ---------- */
  const ATRIBS = [
    {k:'FOR', nome:'Força',             aliases:['FORCA','FORÇA']},
    {k:'DES', nome:'Destreza',          aliases:['DESTREZA']},
    {k:'VIT', nome:'Vitalidade',        aliases:['VITALIDADE']},
    {k:'CAN', nome:'Canalização Mágica',aliases:['CANALIZACAO','CANALIZAÇÃO','CM','MAG']},
    {k:'AGI', nome:'Agilidade',         aliases:['AGILIDADE']},
  ];
  /* Derivados: não recebem pontos. Somam atributos BASE (sem equipamento) mais o
     campo especial do próprio derivado nos equipamentos. Metades arredondam pra baixo. */
  const DERIV = [
    {k:'ESQ', nome:'Esquiva',     desc:'AGI',           calc:b=>b.AGI,
     aliases:['ESQUIVA']},
    {k:'FUR', nome:'Furtividade', desc:'AGI + DES/2',   calc:b=>b.AGI+Math.floor(b.DES/2),
     aliases:['FURTIVIDADE']},
    {k:'PER', nome:'Percepção',   desc:'DES + CAN/2',   calc:b=>b.DES+Math.floor(b.CAN/2),
     aliases:['PERCEPCAO','PERCEPÇÃO']},
  ];
  const ehDerivado = k => DERIV.some(d=>d.k===k);
  /* Defesas: valor manual por personagem (varia por raça) + o que os equipamentos somam.
     Não entram na distribuição de pontos do level. */
  const DEFESAS = [
    {k:'DFF', nome:'Defesa Física', rot:'DEF F', aliases:['DEFF','DEFESAFISICA']},
    {k:'DFM', nome:'Defesa Mágica', rot:'DEF M', aliases:['DEFM','DEFESAMAGICA']},
  ];
  const ehDefesa = k => DEFESAS.some(d=>d.k===k);
  const TIERS_ATR = ['A','B','C','D','E'];

  /* Defesas específicas: contra um elemento ou um tipo de golpe. Base digitada na ficha + o que os equipamentos e
     os bônus temporários somam. Ficam à parte das dez chaves: a árvore não as conhece (lá, "Gelo" é nome de barra). */
  const DEFESAS_ESP = [
    {k:'FOGO',   nome:'Fogo',        tipo:'elemento'},
    {k:'AGUA',   nome:'Água',        tipo:'elemento'},
    {k:'PEDRA',  nome:'Pedra',       tipo:'elemento'},
    {k:'GELO',   nome:'Gelo',        tipo:'elemento'},
    {k:'TROVAO', nome:'Trovão',      tipo:'elemento'},
    {k:'PLANTA', nome:'Planta',      tipo:'elemento'},
    {k:'VENTO',  nome:'Vento',       tipo:'elemento'},
    {k:'LUZ',    nome:'Luz',         tipo:'elemento'},
    {k:'SOMBRAS',nome:'Sombras',     tipo:'elemento'},
    {k:'PSI',    nome:'Psicológico', tipo:'mente'},
    {k:'CORTE',  nome:'Corte',       tipo:'golpe'},
    {k:'PERF',   nome:'Perfuração',  tipo:'golpe'},
    {k:'CONT',   nome:'Contusão',    tipo:'golpe'},
  ];
  const CHAVES_ESP = DEFESAS_ESP.map(d => d.k);
  const ehDefesaEsp = k => CHAVES_ESP.indexOf(k) >= 0;
  /* os tipos de item que uma bolsa guarda */
  const BOLSAS = [
    {t:'pocao',    nome:'Poções',    um:'Poção'},
    {t:'bomba',    nome:'Bombas',    um:'Bomba'},
    {t:'runa',     nome:'Runas',     um:'Runa'},
    {t:'municao',  nome:'Munições',  um:'Munição'},
    {t:'material', nome:'Materiais', um:'Material'},
  ];

  /* O corpo, em 12 partes (esquerda e direita são as do personagem), e o que se anota de um ferimento. */
  const PARTES = [
    {k:'cabeca',  nome:'Cabeça'},        {k:'pescoco', nome:'Pescoço'},
    {k:'peito',   nome:'Peito'},         {k:'abdomen', nome:'Abdômen'},
    {k:'bracoE',  nome:'Braço esquerdo'},{k:'bracoD',  nome:'Braço direito'},
    {k:'maoE',    nome:'Mão esquerda'},  {k:'maoD',    nome:'Mão direita'},
    {k:'pernaE',  nome:'Perna esquerda'},{k:'pernaD',  nome:'Perna direita'},
    {k:'peE',     nome:'Pé esquerdo'},   {k:'peD',     nome:'Pé direito'},
  ];
  const TIPOS_FER = [
    {k:'corte', nome:'Corte',      f:false}, {k:'perf',  nome:'Perfuração', f:true},
    {k:'cont',  nome:'Contusão',   f:true},  {k:'queim', nome:'Queimadura', f:true},
    {k:'frat',  nome:'Fratura',    f:true},  {k:'mord',  nome:'Mordida',    f:true},
  ];
  const GRAVIDADES = [{k:1, nome:'Leve', m:'leve', f:'leve'}, {k:2, nome:'Médio', m:'médio', f:'média'}, {k:3, nome:'Grave', m:'grave', f:'grave'}];
  const ESTADOS_FER = [
    {k:'sg',  nome:'Sangrando'}, {k:'en', nome:'Enfaixado'}, {k:'su', nome:'Suturado'},
    {k:'ta',  nome:'Com tala'},  {k:'inf', nome:'Infeccionado'},
  ];
  const ROM_MAX = 10;                       // a trilha de romance vai de −10 a +10
  const MIS_ESTADOS = [{k:'ativa', nome:'Ativa'}, {k:'feita', nome:'Concluída'}, {k:'falhou', nome:'Falhou'}];

  /* as dez chaves que um equipamento (e a árvore) pode somar, e o nome de cada uma */
  const CHAVES_BONUS = [].concat(ATRIBS, DERIV, DEFESAS).map(x => x.k);
  const NOMES = {};
  [].concat(ATRIBS, DERIV, DEFESAS).forEach(x => { NOMES[x.k] = x.nome; });
  /* o nome de qualquer chave que recebe bônus: as dez de sempre e as 13 defesas específicas ("Defesa: Fogo") */
  const NOMES_BONUS = Object.assign({}, NOMES);
  DEFESAS_ESP.forEach(d => { NOMES_BONUS[d.k] = 'Defesa: ' + d.nome; });
  /* "Todos os atributos": uma chave só, que soma nos cinco atributos de uma vez. Vale onde o bônus é escolhido numa
     lista — bônus temporário, poção, penalidade de ferimento. (Não é uma das dez de CHAVES_BONUS: equipamento e
     árvore continuam com um campo por atributo.) */
  const CHAVE_TODOS = 'ATR';
  NOMES_BONUS[CHAVE_TODOS] = 'Todos os atributos';
  // a chave como é guardada, ou '' se não é uma chave de bônus
  const chaveDeBonus = k => (k === CHAVE_TODOS || CHAVES_BONUS.indexOf(k) >= 0 || CHAVES_ESP.indexOf(k) >= 0 ? k : '');
  // soma v onde a chave manda: nas dez (soma), nas 13 específicas (esp), ou nos cinco atributos de uma vez
  const somarBonus = (soma, esp, k, v) => {
    if (k === CHAVE_TODOS) ATRIBS.forEach(a => { soma[a.k] += v; });
    else if (CHAVES_ESP.indexOf(k) >= 0) esp[k] += v;
    else soma[k] += v;
  };

  /* são tabelas compartilhadas por todos os apps: ninguém altera por engano */
  const congelar = o => {
    Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') congelar(o[k]); });
    return Object.freeze(o);
  };
  [ATRIBS, DERIV, DEFESAS, TIERS_ATR, CHAVES_BONUS, NOMES, DEFESAS_ESP, CHAVES_ESP, BOLSAS, NOMES_BONUS, PARTES, TIPOS_FER, GRAVIDADES, ESTADOS_FER, MIS_ESTADOS].forEach(congelar);

  /* ---------- FORMULA ENGINE (parser próprio, sem eval) — da calculadora ---------- */
  /* ##PARSER_START## */
  function tokenize(src){
    const t=[]; let i=0;
    const isD=c=>c>='0'&&c<='9';
    const isA=c=>/[A-Za-zÀ-ÿ_]/.test(c);
    while(i<src.length){
      const c=src[i];
      if(c===' '||c==='\t'||c==='\n'){i++;continue}
      if(isD(c)||(c==='.'&&isD(src[i+1]))){
        let j=i; while(j<src.length&&(isD(src[j])||src[j]==='.'))j++;
        t.push({t:'num',v:parseFloat(src.slice(i,j))}); i=j; continue;
      }
      if(isA(c)){
        let j=i; while(j<src.length&&(isA(src[j])||isD(src[j])))j++;
        t.push({t:'id',v:src.slice(i,j)}); i=j; continue;
      }
      if('><=!'.includes(c)){
        const dois=src.slice(i,i+2);
        if(['>=','<=','==','!='].includes(dois)){t.push({t:'cmp',v:dois});i+=2;continue}
        if(c==='>'||c==='<'){t.push({t:'cmp',v:c});i++;continue}
        if(c==='='){t.push({t:'cmp',v:'=='});i++;continue}
        throw new Error('Use >, <, >=, <=, == ou !=');
      }
      if(';'===c){t.push({t:','});i++;continue}
      if('+-*/%^(),'.includes(c)){t.push({t:c});i++;continue}
      throw new Error('Caractere inválido: "'+c+'"');
    }
    return t;
  }
  const FUNCS={
    min:Math.min, max:Math.max, floor:Math.floor, ceil:Math.ceil,
    round:Math.round, abs:Math.abs, sqrt:Math.sqrt, pow:Math.pow,
    arredondar:Math.round, teto:Math.ceil, piso:Math.floor, raiz:Math.sqrt,
    se:(c,a,b)=>c?a:b
  };
  function evalFormula(src, vars){
    if(src==null||String(src).trim()==='') return null;
    if(vars==null) vars={};          // único acréscimo: sem variáveis, toda variável é desconhecida
    const tk=tokenize(String(src)); let p=0;
    const peek=()=>tk[p], next=()=>tk[p++];
    function comparacao(){
      let v=expr();
      while(peek()&&peek().t==='cmp'){
        const o=next().v, r=expr();
        v = (o==='>'?v>r : o==='<'?v<r : o==='>='?v>=r : o==='<='?v<=r : o==='=='?v===r : v!==r) ? 1 : 0;
      }
      return v;
    }
    function expr(){
      let v=term();
      while(peek()&&(peek().t==='+'||peek().t==='-')){ const o=next().t; const r=term(); v = o==='+'? v+r : v-r; }
      return v;
    }
    function term(){
      let v=unary();
      while(peek()&&(peek().t==='*'||peek().t==='/'||peek().t==='%')){
        const o=next().t; const r=unary();
        if(o==='*')v=v*r; else if(o==='/'){ if(r===0) throw new Error('Divisão por zero'); v=v/r; } else { if(r===0) throw new Error('Divisão por zero'); v=v%r; }
      }
      return v;
    }
    function unary(){
      if(peek()&&peek().t==='-'){next();return -unary()}
      if(peek()&&peek().t==='+'){next();return unary()}
      return power();
    }
    function power(){
      const b=atom();
      if(peek()&&peek().t==='^'){next(); return Math.pow(b,unary())}
      return b;
    }
    function atom(){
      const tok=next();
      if(!tok) throw new Error('Fórmula incompleta');
      if(tok.t==='num') return tok.v;
      if(tok.t==='('){ const v=comparacao(); if(!peek()||next().t!==')') throw new Error('Falta fechar ")"'); return v; }
      if(tok.t==='id'){
        const nm=tok.v;
        if(peek()&&peek().t==='('){
          next();
          const f=FUNCS[nm.toLowerCase()];
          if(!f) throw new Error('Função desconhecida: '+nm);
          const args=[];
          if(peek()&&peek().t===')'){next()}
          else{
            for(;;){ args.push(comparacao()); const s=next(); if(!s) throw new Error('Falta fechar ")"'); if(s.t===')')break; if(s.t!==',') throw new Error('Esperado "," ou ")"'); }
          }
          return f.apply(null,args);
        }
        const key=nm.toUpperCase();
        if(key in vars) return vars[key];
        throw new Error('Variável desconhecida: '+nm);
      }
      throw new Error('Trecho inesperado na fórmula');
    }
    const out=comparacao();
    if(p<tk.length) throw new Error('Sobrou conteúdo depois da fórmula');
    if(!isFinite(out)) throw new Error('Resultado inválido');
    return out;
  }
  /* ##PARSER_END## */

  /* ---------- padrões (da calculadora) ---------- */
  function tabelaNiveisPadrao(){
    const t=[]; for(let l=1;l<=50;l++) t.push({lvl:l, pts: l===50?445:45+(l-1)*8});
    return t;
  }
  /* a parte cfg do estadoPadrao() de lá; cada chamada devolve uma cópia nova */
  function cfgPadrao(){
    return {
      niveis:tabelaNiveisPadrao(),
      tiersPersonagem:[{t:'S',m:1.12},{t:'A',m:1.08},{t:'B',m:1.04},{t:'C',m:1.00},{t:'D',m:0.85},{t:'E',m:0.75}],
      pct:{A:0.30,B:0.26,C:0.22,D:0.17,E:0.05},
      arredondar:'floor'
    };
  }
  const CFG_PADRAO = cfgPadrao();      // só leitura aqui dentro: é o que vale quando ninguém passa cfg
  function uid(){return Math.random().toString(36).slice(2,10)}
  /* a ficha em branco que o botão "novo personagem" da calculadora cria, com o id
     vindo de fora quando houver (o do banco, por exemplo) e o campo novo `ini` */
  function personagemPadrao(nome,id){
    return {
      id: id!=null&&id!=='' ? id : uid(), nome:nome||'Novo personagem', raca:'', lado:'Aliado', grupo:'', tags:[],
      tier:'C', level:1,
      tiers: {FOR:'A',DES:'B',AGI:'C',VIT:'D',CAN:'E'},
      pctProprio:null,
      poderes:[],
      skills:{arvores:[], pontos:{}, alocados:{}},
      defesas:{DFF:0, DFM:0},
      rol:{fixa:0, fonte:'total'}, ultRol:null,
      disputa:{atrA:'FOR', alvoId:'', atrB:'FOR', fixaB:0, valorB:40},
      estaque:{a:'', b:''},
      habilidades:[],
      itens:[],
      recursos:[
        {id:uid(), nome:'HP', fml:'VIT*8 + LVL*5'},
        {id:uid(), nome:'SP', fml:'CAN*6 + LVL*3'}
      ],
      ini:'',
      notas:''
    };
  }

  /* ---------- miudezas das extensões ---------- */
  const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  /* grava como propriedade própria: nada herdado atrapalha e "__proto__" é uma chave como outra */
  function por(o, k, v) {
    Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true });
  }
  const somar = (o, k, v) => por(o, k, (tem(o, k) ? o[k] : 0) + v);
  /* número finito ou null. Texto numérico vale ("2" → 2); vazio, null, NaN e infinito não. */
  function numFinito(v) {
    if (typeof v === 'string') v = v.trim() === '' ? NaN : +v;
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  /* soma sem tocar no valor quando não há o que somar (mantém até o −0 do original) */
  const mais = (a, b) => (b ? a + b : a);
  /* nome de recurso para comparação: sem maiúsculas, sem acentos, sem espaços nas pontas */
  function normNome(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
  /* "for", " FOR " → 'FOR'; qualquer outra coisa → null (é nome de recurso) */
  function codigoBonus(ch) {
    const c = String(ch == null ? '' : ch).trim().toUpperCase();
    return CHAVES_BONUS.indexOf(c) >= 0 ? c : null;
  }
  /* separa o mapa de bônus da árvore: arv (as dez chaves, zero quando não vem)
     e arvRec (nome de recurso normalizado → bônus) */
  function separarArvore(mapa) {
    const arv = {}, arvRec = {};
    CHAVES_BONUS.forEach(k => { arv[k] = 0; });
    if (mapa && typeof mapa === 'object') {
      Object.keys(mapa).forEach(ch => {
        const v = numFinito(mapa[ch]);
        if (v == null) return;
        const cod = codigoBonus(ch);
        if (cod) { arv[cod] += v; return; }
        const n = normNome(ch);
        if (n) somar(arvRec, n, v);
      });
    }
    return { arv, arvRec };
  }

  /* ---------- o que entrou depois: itens que dão barra e defesa, bônus temporários ---------- */
  /* o que os itens equipados somam no máximo das barras (por id do recurso) e nas defesas específicas */
  function bonusExtras(pc) {
    const rec = {}, esp = {};
    CHAVES_ESP.forEach(k => { esp[k] = 0; });
    (pc.itens || []).forEach(it => {
      if (!it || it.equipado === false) return;
      if (it.rec && typeof it.rec === 'object') Object.keys(it.rec).forEach(id => { const v = numFinito(it.rec[id]); if (v) somar(rec, id, v); });
      if (it.def && typeof it.def === 'object') CHAVES_ESP.forEach(k => { const v = numFinito(tem(it.def, k) ? it.def[k] : null); if (v) esp[k] += v; });
    });
    return { rec, esp };
  }
  /* Os bônus temporários do estado (estado.tmp), dos mais antigos para os mais novos, e a soma dos que estão ligados.
     → { lista: [{ id, n, k, v, d, off, t, r, ate }], soma: { as dez chaves }, esp: { as 13 defesas específicas } }
     Um bônus com chave desconhecida ou valor zero continua na lista (dá para consertar na ficha), só não soma.
     A duração pode ser uma anotação (d), "até o próximo descanso" (ate: 'descanso' — o descanso do Acampamento tira)
     ou um contador de rodadas (r, que o mestre desconta na mão): com 0 rodadas o bônus acabou e não soma mais. */
  function temporarios(mapa) {
    const soma = {}, esp = {}, lista = [];
    CHAVES_BONUS.forEach(k => { soma[k] = 0; });
    CHAVES_ESP.forEach(k => { esp[k] = 0; });
    if (mapa && typeof mapa === 'object' && !Array.isArray(mapa)) {
      Object.keys(mapa).forEach(id => {
        const b = mapa[id];
        if (!b || typeof b !== 'object') return;
        const k = String(b.k == null ? '' : b.k).toUpperCase(), v = numFinito(b.v), r = numFinito(b.r);
        lista.push({ id, n: String(b.n == null ? '' : b.n), k: chaveDeBonus(k), v: v == null ? 0 : v,
          d: String(b.d == null ? '' : b.d), off: !!b.off, t: numFinito(b.t) || 0,
          r: r == null ? null : Math.max(0, Math.round(r)), ate: b.ate === 'descanso' ? 'descanso' : '' });
      });
      lista.sort((a, b) => (a.t - b.t) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
      lista.forEach(b => { if (b.off || !b.k || !b.v || b.r === 0) return; somarBonus(soma, esp, b.k, b.v); });
    }
    return { lista, soma, esp };
  }

  /* ---------- ferimentos ---------- */
  const ehObjeto = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const inteiroEntre = (v, a, b) => { const n = numFinito(v); return n == null ? 0 : Math.max(a, Math.min(b, Math.round(n))); };
  const porChave = lista => { const o = {}; lista.forEach(x => { o[x.k] = x; }); return o; };
  const PARTE = porChave(PARTES), TIPO_FER = porChave(TIPOS_FER);
  const porOrdem = (campo) => (a, b) => (a[campo] - b[campo]) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  /* Os ferimentos abertos (estado.fer), dos mais antigos para os mais novos, e o que as penalidades deles somam.
     → { lista: [{ id, p, t, g, s:{ sg, en, su, ta, inf }, n, k, v, c }], soma: { as dez chaves }, esp: { as 13 } }
     A penalidade é sempre para menos (v ≤ 0). Ferimento numa parte que não existe não entra. */
  function ferimentos(mapa) {
    const soma = {}, esp = {}, lista = [];
    CHAVES_BONUS.forEach(k => { soma[k] = 0; });
    CHAVES_ESP.forEach(k => { esp[k] = 0; });
    if (ehObjeto(mapa)) {
      Object.keys(mapa).forEach(id => {
        const f = mapa[id];
        if (!ehObjeto(f) || !tem(PARTE, f.p)) return;
        const k = String(f.k == null ? '' : f.k).toUpperCase(), v = numFinito(f.v), s = {};
        ESTADOS_FER.forEach(e => { s[e.k] = !!(ehObjeto(f.s) && f.s[e.k]); });
        lista.push({ id, p: f.p, t: tem(TIPO_FER, f.t) ? f.t : 'corte', g: inteiroEntre(f.g == null ? 1 : f.g, 1, 3), s,
          n: String(f.n == null ? '' : f.n).slice(0, 200), k: chaveDeBonus(k),
          v: v ? -Math.abs(v) : 0, c: numFinito(f.c) || 0 });
      });
      lista.sort(porOrdem('c'));
      lista.forEach(f => { if (!f.k || !f.v) return; somarBonus(soma, esp, f.k, f.v); });
    }
    return { lista, soma, esp };
  }
  /* "Corte grave · Braço esquerdo · sangrando, enfaixado · −2 Destreza" (as partes que houver) */
  function textoDoFerimento(f, semParte) {
    const t = TIPO_FER[f.t] || TIPOS_FER[0], g = GRAVIDADES[(f.g || 1) - 1] || GRAVIDADES[0];
    const partes = [t.nome + ' ' + (t.f ? g.f : g.m)];
    if (!semParte && PARTE[f.p]) partes.push(PARTE[f.p].nome);
    const est = ESTADOS_FER.filter(e => f.s && f.s[e.k]).map(e => e.nome.toLowerCase());
    if (est.length) partes.push(est.join(', '));
    if (f.k && f.v) partes.push('−' + Math.abs(f.v) + ' ' + (f.k === CHAVE_TODOS ? 'em todos os atributos' : NOMES_BONUS[f.k] || f.k));
    return partes.join(' · ');
  }
  /* O que o token mostra: quantos ferimentos, o mais grave, e se algum sangra ou está infeccionado. */
  function sinalDeFerido(mapa) {
    const l = ferimentos(mapa).lista;
    return { n: l.length, grave: l.reduce((m, f) => Math.max(m, f.g), 0), sangra: l.some(f => f.s.sg), inf: l.some(f => f.s.inf) };
  }

  /* ---------- cálculo (da calculadora, com cfg por parâmetro) ---------- */
  function ptsDoLevel(cfg,lvl){
    const t=cfg.niveis||[], row=t.find(r=>+r.lvl===+lvl);
    if(row) return +row.pts;
    if(!t.length) return 0;
    const last=t[t.length-1], first=t[0];
    if(+lvl>+last.lvl) return +last.pts;      // acima da tabela: trava no último
    return +first.pts;
  }
  function multTier(cfg,tier){
    const r=(cfg.tiersPersonagem||[]).find(x=>x.t===tier);
    return r? +r.m : 1;
  }
  function pctDe(pc,cfg,tier){
    const tab = pc.pctProprio || cfg.pct || {};
    const v = tab[tier];
    return v==null?0:+v;
  }
  function arred(cfg,n){
    if(n==null||isNaN(n))return n;
    switch(cfg.arredondar){
      case 'floor': return Math.floor(n);
      case 'ceil':  return Math.ceil(n);
      case 'round': return Math.round(n);
      default:      return Math.round(n*1000)/1000;
    }
  }
  function bonusItens(pc){
    const b={}; ATRIBS.forEach(a=>b[a.k]=0); DERIV.forEach(d=>b[d.k]=0); DEFESAS.forEach(d=>b[d.k]=0);
    (pc.itens||[]).forEach(it=>{ if(it.equipado!==false){
      ATRIBS.forEach(a=>{ b[a.k]+= (+it.bonus?.[a.k]||0); });
      DERIV.forEach(d=>{ b[d.k]+= (+it.bonus?.[d.k]||0); });
      DEFESAS.forEach(d=>{ b[d.k]+= (+it.bonus?.[d.k]||0); });
    }});
    return b;
  }
  /* Devolve {mult,total,totalAnt,base,ant,tot,eq,der,derAnt,def,vars,recursos} como a
     calculadora, mais nat, arv e arvRec.

     A árvore (extra.arvore) entra assim:
       atributos   nat = o que vem de level, tier e percentuais (a "base" de lá)
                   base = nat + arv      a árvore faz parte da BASE
                   tot  = base + eq
       derivados   continuam saindo dos atributos BASE (agora com a árvore) e somam o
                   próprio campo do equipamento e o da árvore: ESQ = base.AGI + eq.ESQ + arv.ESQ
       defesas     manual + eq + arv
       ant/derAnt  o level anterior com a mesma árvore e o mesmo equipamento, então
                   base − ant continua sendo só o ganho do level
       recursos    val = fórmula + bônus da árvore para aquele nome; sem fórmula (ou com
                   erro) val fica null e nada é somado. Cada recurso ganha arv (quanto
                   entrou em val) e max (val no arredondamento da configuração).
       variáveis   as de sempre, com a base nova; mais X_ARV nas dez chaves e X_NAT nos
                   cinco atributos (os apelidos dos atributos também: FORCA_ARV, ...)

     Distribuição livre (pc.modoAtr === 'livre', fichas de jogador): nat vem de
     pc.atrLivre — os pontos que a pessoa pôs em cada atributo — em vez de tiers e
     percentuais; o total do level vira só a referência de quantos pontos há para
     distribuir. O resultado ganha livre (true), usados (soma dos pontos postos) e
     limite (pontos do level, inteiros). Sem atrLivre ainda (ninguém distribuiu),
     os números continuam os da tabela até a primeira mudança. ant = base (não há
     "level anterior" numa distribuição feita à mão).

     O que entrou depois (com extra.temp vazio e sem os campos novos na ficha, nada acima muda):
       temporários tmp = a soma dos bônus temporários ligados (extra.temp). Entram como um
                   equipamento: tot = base + eq + tmp; derivados e defesas somam o próprio tmp.
                   Variáveis X_TMP nas dez chaves.
       defesas     defEsp = base digitada (pc.defEsp) + itens (it.def) + temporários, nas 13
       específicas defesas específicas; eqEsp e tmpEsp dizem quanto veio de cada lado.
                   Variáveis DEF_FOGO, DEF_AGUA…
       recursos    val soma também o que os itens equipados dão àquela barra (it.rec, por id);
                   cada recurso ganha eq (quanto), min (até onde desce: 0 ou negativo),
                   inicio (onde começa; null = cheia) e errMin/errInicio (fórmula com erro). */
  /* Os limites de uma barra além do máximo. `piso` e `comeca` aceitam número ou fórmula, com as variáveis de
     sempre e MAX (o máximo da barra). */
  function limitesDoRecurso(r, max, vars, cfg) {
    const o = { min: 0, inicio: null, errMin: null, errInicio: null };
    const m = numFinito(max);
    if (m == null) return o;
    let v2 = null;
    const conta = txt => {
      const t = String(txt == null ? '' : txt).trim();
      if (t === '') return null;
      if (!v2) v2 = Object.assign({}, vars, { MAX: m });
      return evalFormula(t, v2);
    };
    try { const p = conta(r.piso); if (p != null) { const a = arred(cfg, Math.abs(p)); o.min = a > 0 ? -a : 0; } } catch (e) { o.errMin = e.message; }
    try { const i = conta(r.comeca); if (i != null) { const a = arred(cfg, i); o.inicio = Math.min(m, Math.max(o.min, a === 0 ? 0 : a)); } } catch (e) { o.errInicio = e.message; }
    return o;
  }
  function pontosLivres(pc){
    if(pc.modoAtr!=='livre' || !pc.atrLivre || typeof pc.atrLivre!=='object') return null;
    const o={};
    ATRIBS.forEach(a=>{ const v=numFinito(tem(pc.atrLivre,a.k)?pc.atrLivre[a.k]:null); o[a.k]=v==null?0:Math.max(0,Math.round(v)); });
    return o;
  }
  function calcular(pc,cfg,extra){
    cfg=cfg||CFG_PADRAO;
    const mult=multTier(cfg,pc.tier);
    const total    = ptsDoLevel(cfg,pc.level)*mult;
    const totalAnt = ptsDoLevel(cfg,Math.max(1,(+pc.level)-1))*mult;
    const eq=bonusItens(pc);
    const ext=bonusExtras(pc), tp=temporarios(extra&&extra.temp), tmp=tp.soma;
    const fp=ferimentos(extra&&extra.fer);           // as penalidades dos ferimentos abertos contam junto
    if(fp.lista.length){ CHAVES_BONUS.forEach(k=>{ tmp[k]+=fp.soma[k]; }); CHAVES_ESP.forEach(k=>{ tp.esp[k]+=fp.esp[k]; }); }
    const {arv,arvRec}=separarArvore(extra&&extra.arvore);
    const tiers=pc.tiers||{};
    const livres=pontosLivres(pc);
    const nat={},base={},ant={},tot={};
    ATRIBS.forEach(a=>{
      const p=pctDe(pc,cfg,tiers[a.k]);
      nat[a.k] =livres? livres[a.k] : arred(cfg,total*p);
      base[a.k]=mais(nat[a.k],arv[a.k]);
      ant[a.k] =livres? base[a.k] : mais(arred(cfg,totalAnt*p),arv[a.k]);
      tot[a.k] =mais(base[a.k]+eq[a.k],tmp[a.k]);
    });
    const der={}, derAnt={};                       // sempre a partir dos valores BASE
    DERIV.forEach(d=>{
      der[d.k]   =mais(mais(d.calc(base)+eq[d.k],arv[d.k]),tmp[d.k]);
      derAnt[d.k]=mais(mais(d.calc(ant)+eq[d.k],arv[d.k]),tmp[d.k]);
    });
    const def={};                                   // manual da ficha + equipamentos + árvore (+ temporários)
    DEFESAS.forEach(d=>{ def[d.k]=mais(mais((+((pc.defesas||{})[d.k])||0)+eq[d.k],arv[d.k]),tmp[d.k]); });
    const defEsp={}, baseEsp={};                    // as 13 específicas: digitada + itens + temporários
    DEFESAS_ESP.forEach(d=>{
      const b=numFinito(pc.defEsp&&tem(pc.defEsp,d.k)?pc.defEsp[d.k]:null)||0;
      baseEsp[d.k]=b; defEsp[d.k]=b+ext.esp[d.k]+tp.esp[d.k];
    });
    const vars={LVL:+pc.level, NIVEL:+pc.level, MULT:mult, PTS:arred(cfg,total), TOTAL:arred(cfg,total)};
    DERIV.forEach(d=>{
      vars[d.k]=der[d.k]; vars[d.k+'_B']=d.calc(base); vars[d.k+'_EQ']=eq[d.k];
      d.aliases.forEach(al=>{vars[al]=der[d.k]});
    });
    DEFESAS.forEach(d=>{
      vars[d.k]=def[d.k]; vars[d.k+'_B']=+((pc.defesas||{})[d.k])||0; vars[d.k+'_EQ']=eq[d.k];
      d.aliases.forEach(al=>{vars[al]=def[d.k]});
    });
    ATRIBS.forEach(a=>{
      vars[a.k]=tot[a.k];               // com equipamento
      vars[a.k+'_B']=base[a.k];         // base, sem equipamento
      vars[a.k+'_EQ']=eq[a.k];          // só o bônus
      a.aliases.forEach(al=>{vars[al]=tot[a.k]; vars[al+'_B']=base[a.k]; vars[al+'_EQ']=eq[a.k];});
    });
    /* variáveis novas, depois das originais para não mexer na ordem delas */
    CHAVES_BONUS.forEach(k=>{ vars[k+'_ARV']=arv[k]; });            // só o que a árvore soma
    ATRIBS.forEach(a=>{
      vars[a.k+'_NAT']=nat[a.k];                                    // level + tier, antes da árvore
      a.aliases.forEach(al=>{vars[al+'_ARV']=arv[a.k]; vars[al+'_NAT']=nat[a.k];});
    });
    CHAVES_BONUS.forEach(k=>{ vars[k+'_TMP']=tmp[k]; });            // só os bônus temporários
    DEFESAS_ESP.forEach(d=>{ vars['DEF_'+d.k]=defEsp[d.k]; });
    const recursos=(pc.recursos||[]).map(r=>{
      let val=null,err=null;
      try{ val=evalFormula(r.fml,vars); }catch(e){ err=e.message; }
      const n=val==null?'':normNome(r.nome);
      const b=n&&tem(arvRec,n)?arvRec[n]:0;
      if(b) val=val+b;
      const q=val!=null&&tem(ext.rec,r.id)?ext.rec[r.id]:0;  // o que os itens equipados somam nesta barra
      if(q) val=val+q;
      const max=arred(cfg,val);
      const o={...r, val, err, arv:b, max:max===0?0:max};     // o teste com 0 tira o −0 (teto(-0.3))
      o.eq=q;
      return Object.assign(o, limitesDoRecurso(r, o.max, vars, cfg));
    });
    const r={mult,total,totalAnt,base,ant,tot,eq,der,derAnt,def,vars,recursos,nat,arv,arvRec,
      tmp, temporarios:tp.lista, defEsp, baseEsp, eqEsp:ext.esp, tmpEsp:tp.esp, eqRec:ext.rec,
      ferimentos:fp.lista, fer:fp.soma, ferEsp:fp.esp};
    if(pc.modoAtr==='livre'){
      r.livre=true;
      r.usados=ATRIBS.reduce((s,a)=>s+(+nat[a.k]||0),0);
      r.limite=Math.floor(total+1e-9);
    }
    return r;
  }
  function somaPercentuaisUsados(pc,cfg){
    cfg=cfg||CFG_PADRAO;
    const tiers=pc.tiers||{};
    return ATRIBS.reduce((s,a)=>s+pctDe(pc,cfg,tiers[a.k]),0);
  }
  /* o número que se rola: c é o resultado de calcular(); fonte 'base' só muda os cinco atributos */
  function valorDoAtributo(c,atr,fonte){
    if(ehDefesaEsp(atr)) return c.defEsp[atr];      // defesa específica: digitada + itens + temporários
    if(ehDefesa(atr))   return c.def[atr];          // defesa: manual + equipamento + árvore
    if(ehDerivado(atr)) return c.der[atr];          // derivados têm valor único
    return fonte==='base'? c.base[atr] : c.tot[atr];
  }

  /* ---------- árvore de habilidades → bônus ---------- */
  /* Soma o `bonus` dos graus comprados e devolve o mapa plano de extra.arvore.
       skills      { arvores:[idsEquipados], pontos:{}, alocados:{ idDoNódulo: grau } }
       biblioteca  { arvores:[{ id, nodes:[{ id, graus:[{ custos, texto, bonus? }] }] }] }
     Como os custos, os bônus acumulam: quem está no grau g leva graus[0..g-1].
     Só contam nódulos que existem na biblioteca e cuja árvore está equipada. Código
     de atributo sai em maiúsculas; nome de recurso sai na primeira grafia que
     aparecer, juntando as que só diferem em maiúsculas, acentos ou espaços nas
     pontas. Valor que não é número finito é ignorado. */
  function bonusDaArvore(skills, biblioteca) {
    const out = {};
    const sk = skills || {};
    const equipadas = Array.isArray(sk.arvores) ? sk.arvores : [];
    const al = sk.alocados || {};
    const arvores = biblioteca && Array.isArray(biblioteca.arvores) ? biblioteca.arvores : [];
    /* mesmo índice da calculadora (indexarArvores): com id repetido vale a última definição,
       assim cada nódulo alocado conta uma vez só, do jeito que os custos contam */
    const porId = new Map(), arvDe = new Map();
    arvores.forEach(a => ((a && a.nodes) || []).forEach(n => {
      if (n) { porId.set(n.id, n); arvDe.set(n.id, a); }
    }));
    const grafia = new Map();                    // nome normalizado → primeira grafia
    arvores.forEach(a => {
      if (!a || equipadas.indexOf(a.id) < 0) return;
      (a.nodes || []).forEach(n => {
        if (!n || porId.get(n.id) !== n || arvDe.get(n.id) !== a || !tem(al, n.id)) return;
        const graus = Array.isArray(n.graus) ? n.graus : [];
        const g = Math.min(+al[n.id], graus.length);
        for (let k = 0; k < g; k++) {
          const b = graus[k] && graus[k].bonus;
          if (!b || typeof b !== 'object') continue;
          Object.keys(b).forEach(ch => {
            const v = numFinito(b[ch]);
            if (v == null) return;
            const cod = codigoBonus(ch);
            if (cod) { somar(out, cod, v); return; }
            const nm = normNome(ch);
            if (!nm) return;
            if (!grafia.has(nm)) grafia.set(nm, String(ch).trim());
            somar(out, grafia.get(nm), v);
          });
        }
      });
    });
    return out;
  }

  /* ---------- iniciativa ---------- */
  function iniDe(pc, vars) {
    let val = 0, err = null;
    try {
      const v = evalFormula(pc.ini, vars);
      if (v != null) val = Math.floor(v) || 0;   // pra baixo; o "|| 0" tira o −0
    } catch (e) { err = e.message; }
    return { val, err };
  }
  /* pc.ini é uma fórmula com as mesmas variáveis dos recursos ("AGI/5", "3").
     → { val: inteiro (0 se vazia ou com erro), err: mensagem ou null } */
  function iniciativa(pc, cfg, extra) {
    return iniDe(pc, calcular(pc, cfg, extra).vars);
  }

  /* ---------- valor atual dos recursos ---------- */
  /* dentro de min..max (min é 0, ou negativo na barra que pode ficar negativa); com max negativo (fórmula
     estranha) fica no próprio max */
  const limitar = (v, max, min) => Math.min(max, Math.max(numFinito(min) || 0, v));
  function atualDe(guardado, max, min, inicio) { // max: número finito ou null
    const g = numFinito(guardado);
    if (max == null) return g;                   // sem máximo não há "cheio" nem limite
    if (g == null) { const i = numFinito(inicio); return i == null ? max : limitar(i, max, min); }   // nada anotado: no começo da barra
    return limitar(g, max, min);
  }
  /* → [{id, nome, max, min, inicio, atual, sobre}] na ordem da ficha. max vem de calc (null se o recurso
     não tem fórmula ou ela deu erro); min é até onde a barra desce (0, ou negativo); inicio é onde ela
     começa (null = cheia). atual é o guardado em estado.rec — no começo da barra quando não há nada
     guardado — e só é preso em min..max quando existe max. sobre é a sobrevida guardada em estado.sob
     (0 quando não há). */
  function estadoRecursos(pc, calc, estado) {
    const rec = (estado && estado.rec) || {};
    const sob = (estado && estado.sob) || {};
    const sobreDe = id => { const v = numFinito(tem(sob, id) ? sob[id] : null); return v == null || v < 0 ? 0 : v; };
    const calcs = (calc && calc.recursos) || [];
    return ((pc && pc.recursos) || []).map((r, i) => {
      const c = calcs[i] && calcs[i].id === r.id ? calcs[i] : calcs.find(x => x.id === r.id);
      const max = c ? numFinito(c.max) : null, min = c ? Math.min(0, numFinito(c.min) || 0) : 0, inicio = c ? numFinito(c.inicio) : null;
      return { id: r.id, nome: r.nome, max, min, inicio, atual: atualDe(tem(rec, r.id) ? rec[r.id] : null, max, min, inicio), sobre: sobreDe(r.id) };
    });
  }
  /* → um estado NOVO com o recurso somado de delta (dano negativo, cura positiva),
     preso em min..max (min: 0 se não vier). Quem ainda não tem valor guardado parte do
     começo da barra (inicio; cheia se não vier). O estado recebido não é alterado. */
  function aplicarDelta(estado, id, max, delta, min, inicio) {
    const rec = (estado && estado.rec) || {};
    const m = numFinito(max);
    const atual = atualDe(tem(rec, id) ? rec[id] : null, m, min, inicio);
    let novo = (atual == null ? 0 : atual) + (numFinito(delta) || 0);
    if (m != null) novo = limitar(novo, m, min);
    const rec2 = Object.assign({}, rec);
    por(rec2, id, novo);
    return Object.assign({}, estado, { rec: rec2 });
  }

  /* ---------- bolsas: poções, bombas, runas, munições e materiais ---------- */
  const TIPOS_BOLSA = BOLSAS.map(b => b.t);
  const numTxt = n => String(Math.round(n * 100) / 100).replace('-', '−');
  /* A bolsa da ficha, arrumada: só itens com id, cada um com a quantidade que o estado guarda (0 se não guarda).
     → [{ id, t, nome, nota, qtd, rec, val, bk, bv, bd }] na ordem da ficha */
  function bolsa(pc, estado) {
    const q = (estado && estado.qtd) || {};
    return (Array.isArray(pc && pc.bolsa) ? pc.bolsa : []).filter(it => it && typeof it === 'object' && it.id != null && it.id !== '').map(it => {
      const id = String(it.id), n = numFinito(tem(q, id) ? q[id] : null), k = String(it.bk == null ? '' : it.bk).toUpperCase();
      return { id, t: TIPOS_BOLSA.indexOf(it.t) >= 0 ? it.t : 'material', nome: String(it.nome == null ? '' : it.nome), nota: String(it.nota == null ? '' : it.nota),
        qtd: n == null || n < 0 ? 0 : Math.floor(n),
        rec: it.rec ? String(it.rec) : '', val: String(it.val == null ? '' : it.val).trim(),
        bk: chaveDeBonus(k), bv: numFinito(it.bv) || 0, bd: String(it.bd == null ? '' : it.bd) };
    });
  }
  /* O efeito de uma poção numa barra, do jeito que foi escrito: "30", "+30", "-10", "2d6+3", "-1d4".
     → null (vazio) · { erro } · { fixo: n } · { sinal: 1|-1, dados: "2d6+3" } — o sinal na frente vale para a conta
     inteira, e quem chama é que rola os dados. */
  function lerEfeito(txt) {
    let s = String(txt == null ? '' : txt).replace(/\s+/g, '').replace(/[−–—]/g, '-').replace(',', '.').toLowerCase();
    if (s === '') return null;
    let sinal = 1;
    if (s[0] === '+') s = s.slice(1); else if (s[0] === '-') { sinal = -1; s = s.slice(1); }
    if (/^\d+(\.\d+)?$/.test(s)) return { fixo: sinal * Number(s) };
    if (/^\d*d\d+([+-](\d*d\d+|\d+))*$/.test(s)) return { sinal, dados: s };
    return { erro: 'Escreva um valor (30) ou dados (2d6+3).' };
  }
  /* Usar um item da bolsa: gasta uma unidade e, se for poção, faz o que ela faz — mexe na barra (rolado = o total
     dos dados, quando o efeito é uma rolagem) e põe o bônus temporário. Bomba, runa, munição e material só gastam.
       calc     o calcular() da ficha, já com os temporários
       agora    a hora (ms), para o bônus novo entrar no fim da lista · novoId: o id dele (sorteado se não vier)
     → { ok:false, erro } ou { ok:true, estado (novo; o recebido não muda), item, sobra,
         barra: { id, nome, de, para, delta } | null, bonus: { id, n, k, v, d } | null } */
  function usarItem(pc, calc, estado, idItem, rolado, agora, novoId) {
    const it = bolsa(pc, estado).find(x => x.id === idItem);
    if (!it) return { ok: false, erro: 'Este item não está mais na bolsa.' };
    if (it.qtd < 1) return { ok: false, erro: 'Não há mais ' + (it.nome || 'deste item') + ' na bolsa.' };
    let est = Object.assign({}, estado);
    const qtd = Object.assign({}, (estado && estado.qtd) || {});
    por(qtd, it.id, it.qtd - 1); est.qtd = qtd;
    let barra = null, bonus = null;
    if (it.t === 'pocao') {
      const ef = lerEfeito(it.val);
      if (it.rec && ef && !ef.erro) {
        const r = estadoRecursos(pc, calc, estado).find(x => x.id === it.rec);
        if (r && r.max != null) {
          const delta = Math.round((ef.fixo != null ? ef.fixo : ef.sinal * (numFinito(rolado) || 0)) * 10) / 10;
          est = aplicarDelta(est, r.id, r.max, delta, r.min, r.inicio);
          barra = { id: r.id, nome: r.nome, de: r.atual, para: est.rec[r.id], delta };
        }
      }
      if (it.bk && it.bv) {
        const id = novoId || ('t' + uid());
        const tmp = Object.assign({}, (estado && estado.tmp) || {});
        por(tmp, id, { n: it.nome || 'Poção', k: it.bk, v: it.bv, d: it.bd, t: numFinito(agora) || 0 });
        est.tmp = tmp;
        bonus = { id, n: it.nome || 'Poção', k: it.bk, v: it.bv, d: it.bd };
      }
    }
    return { ok: true, estado: est, item: it, sobra: it.qtd - 1, barra, bonus };
  }
  /* O que usar este item vai fazer, em palavras, antes de usar (só as poções fazem alguma coisa sozinhas):
     ["HP 20 → 50 (+30)"] · ["HP 20 + 2d6+3, rolado na hora"] · ["Força +4 (3 turnos)"] · [] (só gasta) */
  function previaDoUso(pc, calc, estado, it) {
    const p = [];
    if (!it || it.t !== 'pocao') return p;
    const ef = lerEfeito(it.val), r = it.rec ? estadoRecursos(pc, calc, estado).find(x => x.id === it.rec) : null;
    if (r && r.max != null && ef && !ef.erro) {
      if (ef.fixo != null) p.push(r.nome + ' ' + numTxt(r.atual) + ' → ' + numTxt(limitar(r.atual + ef.fixo, r.max, r.min)) + ' (' + (ef.fixo < 0 ? '−' : '+') + numTxt(Math.abs(ef.fixo)) + ')');
      else p.push(r.nome + ' ' + numTxt(r.atual) + (ef.sinal < 0 ? ' − ' : ' + ') + ef.dados + ', rolado na hora');
    }
    if (it.bk && it.bv) p.push((NOMES_BONUS[it.bk] || it.bk) + ' ' + (it.bv > 0 ? '+' : '−') + numTxt(Math.abs(it.bv)) + (it.bd ? ' (' + it.bd + ')' : ''));
    return p;
  }
  /* O resultado de um uso, numa linha (para o aviso e para a mesa ao vivo):
     "HP 20 → 29 (+9) · Força +3 (3 turnos) · restam 2" */
  function textoDoUso(u) {
    const p = [];
    if (u.barra) p.push(u.barra.nome + ' ' + numTxt(u.barra.de) + ' → ' + numTxt(u.barra.para) + (u.barra.delta ? ' (' + (u.barra.delta > 0 ? '+' : '−') + numTxt(Math.abs(u.barra.delta)) + ')' : ''));
    if (u.bonus) p.push((NOMES_BONUS[u.bonus.k] || u.bonus.k) + ' ' + (u.bonus.v > 0 ? '+' : '−') + numTxt(Math.abs(u.bonus.v)) + (u.bonus.d ? ' (' + u.bonus.d + ')' : ''));
    p.push(u.sobra === 0 ? 'era a última unidade' : u.sobra === 1 ? 'resta 1' : 'restam ' + u.sobra);
    return p.join(' · ');
  }

  /* ---------- relacionamentos (com romance, e com o que o mestre esconde) ---------- */
  const copiaJ = x => (x == null ? x : JSON.parse(JSON.stringify(x)));
  const romDe = v => (v == null || v === '' || numFinito(v) == null ? null : inteiroEntre(v, -ROM_MAX, ROM_MAX));
  function umaRelacao(id, e, ordem) {
    const o = numFinito(e.o);
    return { id: String(id), alvo: e.alvo ? String(e.alvo) : null, nome: String(e.nome == null ? '' : e.nome).slice(0, 80),
      v: inteiroEntre(e.v, -100, 100), rom: romDe(e.rom), oc: !!e.oc, o: o == null ? ordem : o };
  }
  /* As linhas que estão na ficha, em ordem. Numa linha de valor escondido (oc) o v e o rom vêm zerados: não estão ali. */
  function relacoes(estado) {
    const out = [];
    if (estado && ehObjeto(estado.rels)) Object.keys(estado.rels).forEach((id, i) => { const e = estado.rels[id]; if (ehObjeto(e)) out.push(umaRelacao(id, e, i)); });
    else if (estado && Array.isArray(estado.rel)) estado.rel.forEach((e, i) => { if (ehObjeto(e) && e.id) out.push(umaRelacao(e.id, e, i)); });
    out.forEach(e => { if (e.oc) { e.v = 0; e.rom = null; } });
    return out.sort(porOrdem('o'));
  }
  const temRelacoes = estado => relacoes(estado).length > 0;
  // a ficha ainda guarda os relacionamentos no formato antigo (a lista)?
  const relLegado = estado => !!estado && Array.isArray(estado.rel) && !ehObjeto(estado.rels);
  function visaoDoMestre(lista, seg, tudoDoMestre) {
    const out = [], vistos = {};
    lista.forEach(e => {
      por(vistos, e.id, true);
      const s = ehObjeto(seg) && tem(seg, e.id) && ehObjeto(seg[e.id]) ? seg[e.id] : null;
      if (e.oc) out.push(Object.assign({}, e, { v: s ? inteiroEntre(s.v, -100, 100) : 0, rom: s ? romDe(s.rom) : null, modo: 'valor' }));
      else out.push(Object.assign({}, e, { modo: tudoDoMestre ? 'mestre' : 'aberta' }));
    });
    if (ehObjeto(seg)) Object.keys(seg).forEach((id, i) => {
      const s = seg[id];
      if (tem(vistos, id) || !ehObjeto(s) || !s.l) return;
      out.push(Object.assign(umaRelacao(id, s, 1e6 + i), { oc: false, modo: 'mestre' }));
    });
    return out.sort(porOrdem('o'));
  }
  /* O que o mestre vê: as linhas da ficha (as de valor escondido, com o valor que ele guarda) e as que só ele tem.
     Cada linha ganha `modo`: 'aberta' (está toda na ficha), 'valor' (o nome na ficha, o valor com o mestre) ou
     'mestre' (a linha inteira com o mestre).
     `npc`: a ficha não é de jogador. Os relacionamentos de um NPC são do mestre; os que ainda estão na ficha no
     formato antigo contam como dele (e passam para ele na primeira mudança — ver mexerRelacao). */
  function relacoesDoMestre(estado, seg, npc) {
    return visaoDoMestre(relacoes(estado), seg, !!npc && relLegado(estado));
  }
  // o estado com as linhas dadas, no formato novo (o antigo sai)
  function comRelacoes(estado, lista) {
    const e = Object.assign({}, estado), m = {};
    lista.forEach(x => {
      const o = { nome: x.nome, o: x.o };
      if (x.alvo) o.alvo = x.alvo;
      if (x.oc) o.oc = 1; else { o.v = x.v; if (x.rom != null) o.rom = x.rom; }
      por(m, x.id, o);
    });
    delete e.rel;
    if (lista.length) e.rels = m; else delete e.rels;
    return e;
  }
  const linhaDoMestre = x => { const o = { l: 1, nome: x.nome, v: x.v, o: x.o }; if (x.alvo) o.alvo = x.alvo; if (x.rom != null) o.rom = x.rom; return o; };
  const valorDoMestre = x => { const o = { v: x.v }; if (x.rom != null) o.rom = x.rom; return o; };
  /* Uma mudança nos relacionamentos de um personagem → { estado, seg, mudou }, sem alterar o que recebeu.
     `seg` é o que o mestre guarda desse personagem (quem não é o mestre passa null: só mexe nas linhas abertas).
     op.t:
       'nova'      { id, alvo, nome, v, rom, o, comMestre }   cria (com o mestre, se comMestre; senão, aberta na ficha)
       'valor'     { id, v }      'rom' { id, rom }  (rom null tira a trilha)      'nome' { id, nome }
       'esconder'  { id }   aberta → valor escondido          'revelar' { id }   valor escondido → aberta
       'guardar'   { id }   aberta → só com o mestre          'abrir'   { id }   só com o mestre → aberta
       'tirar'     { id }
       'guardar-legado'  {}   (só com op.npc) passa para o mestre o que a ficha de um NPC tem no formato antigo
     op.npc: a ficha é de um NPC. Antes de qualquer mudança do mestre, o que ela tem no formato antigo passa para ele. */
  function mexerRelacao(estado, seg, op) {
    const mestre = seg !== null && seg !== undefined, t = op && op.t;
    const s = ehObjeto(seg) ? copiaJ(seg) : {};
    let lista = relacoes(estado), mudouE = false, mudouS = false;
    if (mestre && op && op.npc && relLegado(estado)) {
      lista.forEach(e => { if (!(tem(s, e.id) && ehObjeto(s[e.id]) && s[e.id].l)) por(s, e.id, linhaDoMestre(e)); });
      lista = []; mudouE = mudouS = true;
    }
    const todas = mestre ? visaoDoMestre(lista, s, false) : lista.map(e => Object.assign({}, e, { modo: e.oc ? 'valor' : 'aberta' }));
    const achar = id => todas.find(e => e.id === String(id)) || null;
    const naFicha = id => lista.find(e => e.id === String(id)) || null;
    const proxima = () => todas.reduce((m, e) => Math.max(m, e.o < 1e6 ? e.o : -1), -1) + 1;
    const fim = () => ({ estado: mudouE ? comRelacoes(estado, lista) : estado, seg: mudouS ? s : seg, mudou: mudouE || mudouS });
    if (t === 'guardar-legado') return fim();
    if (t === 'nova') {
      const id = String(op.id || uid());
      if (achar(id)) return fim();
      const e = umaRelacao(id, { alvo: op.alvo, nome: op.nome, v: op.v || 0, rom: op.rom, o: numFinito(op.o) == null ? proxima() : op.o }, 0);
      if (op.comMestre && mestre) { por(s, id, linhaDoMestre(e)); mudouS = true; }
      else { lista.push(e); mudouE = true; }
      return fim();
    }
    const e = achar(op && op.id);
    if (!e) return fim();
    const f = naFicha(e.id);
    if (t === 'valor' || t === 'rom' || t === 'nome') {
      const antes = { v: e.v, rom: e.rom, nome: e.nome };
      if (t === 'valor') e.v = inteiroEntre(op.v, -100, 100);
      else if (t === 'rom') e.rom = romDe(op.rom);
      else e.nome = String(op.nome == null ? '' : op.nome).slice(0, 80);
      if (antes.v === e.v && antes.rom === e.rom && antes.nome === e.nome) return fim();
      if (e.modo === 'aberta') { Object.assign(f, { v: e.v, rom: e.rom, nome: e.nome }); mudouE = true; }
      else if (!mestre) return fim();                                         // o valor não está com quem pediu
      else if (e.modo === 'valor') { if (t === 'nome') { f.nome = e.nome; mudouE = true; } else { por(s, e.id, valorDoMestre(e)); mudouS = true; } }
      else { por(s, e.id, linhaDoMestre(e)); mudouS = true; }
    } else if (t === 'tirar') {
      if (e.modo !== 'aberta' && !mestre) return fim();
      if (f) { lista = lista.filter(x => x.id !== e.id); mudouE = true; }
      if (tem(s, e.id)) { delete s[e.id]; mudouS = true; }
    } else if (!mestre) return fim();
    else if (t === 'esconder' && e.modo === 'aberta') { por(s, e.id, valorDoMestre(e)); f.oc = true; mudouE = mudouS = true; }
    else if (t === 'revelar' && e.modo === 'valor') { Object.assign(f, { oc: false, v: e.v, rom: e.rom }); delete s[e.id]; mudouE = mudouS = true; }
    else if (t === 'guardar' && e.modo !== 'mestre') { por(s, e.id, linhaDoMestre(e)); lista = lista.filter(x => x.id !== e.id); mudouE = mudouS = true; }
    else if (t === 'abrir' && e.modo === 'mestre') { lista.push(Object.assign(umaRelacao(e.id, e, e.o), { oc: false })); delete s[e.id]; mudouE = mudouS = true; }
    return fim();
  }
  // a linha (na visão de quem pede) do que o personagem sente por `alvo`
  function relacaoCom(estado, seg, alvo, npc) {
    const l = seg === null || seg === undefined ? relacoes(estado) : relacoesDoMestre(estado, seg, npc);
    return l.find(e => e.alvo === alvo) || null;
  }

  /* ---------- missões ---------- */
  /* As missões de um mapa { [id]: { t: título, d: descrição, r: recompensa, e: estado, de: 'm' | 'j' (quem criou),
     c: quando, o:{ [id]: { t: texto, ok, n: ordem } } } } → lista em ordem (as ativas primeiro, cada grupo pela criação),
     com os objetivos em ordem e a conta de quantos estão feitos. */
  function missoes(mapa) {
    const out = [];
    if (ehObjeto(mapa)) Object.keys(mapa).forEach(id => {
      const m = mapa[id];
      if (!ehObjeto(m)) return;
      const objs = [];
      if (ehObjeto(m.o)) Object.keys(m.o).forEach((oid, i) => { const o = m.o[oid]; if (ehObjeto(o)) objs.push({ id: oid, t: String(o.t == null ? '' : o.t).slice(0, 200), ok: !!o.ok, n: numFinito(o.n) == null ? i : numFinito(o.n) }); });
      objs.sort(porOrdem('n'));
      out.push({ id, t: String(m.t == null ? '' : m.t).slice(0, 120), d: String(m.d == null ? '' : m.d).slice(0, 2000), r: String(m.r == null ? '' : m.r).slice(0, 300),
        e: MIS_ESTADOS.some(x => x.k === m.e) ? m.e : 'ativa', de: m.de === 'j' ? 'j' : 'm', c: numFinito(m.c) || 0,
        objs, feitos: objs.filter(o => o.ok).length, total: objs.length });
    });
    const peso = { ativa: 0, feita: 1, falhou: 2 };
    return out.sort((a, b) => (peso[a.e] - peso[b.e]) || (a.c - b.c) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  /* ---------- a barra de XP ---------- */
  const XP_PASSO = 10;                      // a cada nível o máximo cresce isto (sem máximo digitado, vale isto × nível)
  /* estado.xp → { v, min, max, falta, fracao (0 a 1), cheia, minProprio, maxProprio }.
     minProprio / maxProprio: o limite foi digitado (está guardado); senão é o de costume. */
  function xpDe(estado, nivel) {
    const x = estado && ehObjeto(estado.xp) ? estado.xp : {};
    const minP = numFinito(x.min), maxP = numFinito(x.max), lv = Math.max(1, Math.round(numFinito(nivel) || 1));
    const min = minP == null ? 0 : minP, max = Math.max(min, maxP == null ? XP_PASSO * lv : maxP);
    const vP = numFinito(x.v), v = Math.max(min, vP == null ? min : vP), faixa = max - min;
    return { v, min, max, falta: Math.max(0, max - v), fracao: faixa > 0 ? Math.max(0, Math.min(1, (v - min) / faixa)) : 1, cheia: v >= max,
      minProprio: minP != null, maxProprio: maxP != null };
  }
  /* O estado depois de subir de nível (de `nivel` para o seguinte): o que passou do máximo fica, o mínimo não muda,
     o máximo ganha XP_PASSO (o digitado é somado; o de costume acompanha o nível sozinho). Não altera o que recebeu. */
  function subirNivelXp(estado, nivel) {
    const x = xpDe(estado, nivel), e = Object.assign({}, estado), novo = Object.assign({}, estado && ehObjeto(estado.xp) ? estado.xp : {});
    novo.v = x.min + Math.max(0, x.v - x.max);
    if (x.maxProprio) novo.max = x.max + XP_PASSO;
    e.xp = novo;
    return e;
  }

  /* ---------- resumo para os outros apps ---------- */
  /* objeto pequeno e plano (vai bem em JSON) com o que a mesa, o rolador e as cenas
     precisam de uma ficha sem ter de recalcular */
  function resumo(pc, cfg, extra, estado) {
    // os bônus temporários moram no estado: entram sozinhos, a não ser que quem chama já os tenha passado
    const ex = Object.assign({}, extra);
    if (ex.temp === undefined && estado) ex.temp = estado.tmp;
    if (ex.fer === undefined && estado) ex.fer = estado.fer;
    const c = calcular(pc, cfg, ex);
    const attrs = {}, base = {}, der = {}, def = {}, defEsp = {};
    ATRIBS.forEach(a => { attrs[a.k] = c.tot[a.k]; base[a.k] = c.base[a.k]; });
    DERIV.forEach(d => { der[d.k] = c.der[d.k]; });
    DEFESAS.forEach(d => { def[d.k] = c.def[d.k]; });
    DEFESAS_ESP.forEach(d => { defEsp[d.k] = c.defEsp[d.k]; });
    return {
      nome: pc.nome || '', lado: pc.lado || 'Aliado',
      attrs, base, der, def, defEsp,
      recursos: estadoRecursos(pc, c, estado),
      ini: iniDe(pc, c.vars).val,
      fixa: (pc.rol && pc.rol.fixa) || 0,
      fonte: (pc.rol && pc.rol.fonte) || 'total'
    };
  }

  const api = {
    ATRIBS, DERIV, DEFESAS, TIERS_ATR, CHAVES_BONUS, NOMES, ehDerivado, ehDefesa,
    cfgPadrao, personagemPadrao,
    evalFormula, calcular, valorDoAtributo, somaPercentuaisUsados,
    bonusDaArvore, iniciativa, estadoRecursos, aplicarDelta, resumo,
    normNome,
    DEFESAS_ESP, CHAVES_ESP, ehDefesaEsp, NOMES_BONUS, CHAVE_TODOS, BOLSAS,
    temporarios, bolsa, lerEfeito, usarItem, previaDoUso, textoDoUso,
    PARTES, TIPOS_FER, GRAVIDADES, ESTADOS_FER, ferimentos, textoDoFerimento, sinalDeFerido,
    ROM_MAX, relacoes, temRelacoes, relacoesDoMestre, mexerRelacao, relacaoCom,
    MIS_ESTADOS, missoes,
    XP_PASSO, xpDe, subirNivelXp
  };

  (root.TC || (root.TC = {})).rules = api;
  /* em página de verdade window é o próprio global; em teste pode ser um objeto à parte */
  if (typeof window !== 'undefined' && window && window !== root) (window.TC || (window.TC = root.TC)).rules = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
