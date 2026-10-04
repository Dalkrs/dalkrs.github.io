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
     estado  { rec:{ [idDoRecurso]: valorAtual } } — faltando = cheio
             sob:{ [idDoRecurso]: sobrevida } — pontos por cima do recurso, que
             absorvem o dano antes dele (faltando = nenhuma)
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

  /* as dez chaves que um equipamento (e a árvore) pode somar, e o nome de cada uma */
  const CHAVES_BONUS = [].concat(ATRIBS, DERIV, DEFESAS).map(x => x.k);
  const NOMES = {};
  [].concat(ATRIBS, DERIV, DEFESAS).forEach(x => { NOMES[x.k] = x.nome; });

  /* são tabelas compartilhadas por todos os apps: ninguém altera por engano */
  const congelar = o => {
    Object.keys(o).forEach(k => { if (o[k] && typeof o[k] === 'object') congelar(o[k]); });
    return Object.freeze(o);
  };
  [ATRIBS, DERIV, DEFESAS, TIERS_ATR, CHAVES_BONUS, NOMES].forEach(congelar);

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
     "level anterior" numa distribuição feita à mão). */
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
    const {arv,arvRec}=separarArvore(extra&&extra.arvore);
    const tiers=pc.tiers||{};
    const livres=pontosLivres(pc);
    const nat={},base={},ant={},tot={};
    ATRIBS.forEach(a=>{
      const p=pctDe(pc,cfg,tiers[a.k]);
      nat[a.k] =livres? livres[a.k] : arred(cfg,total*p);
      base[a.k]=mais(nat[a.k],arv[a.k]);
      ant[a.k] =livres? base[a.k] : mais(arred(cfg,totalAnt*p),arv[a.k]);
      tot[a.k] =base[a.k]+eq[a.k];
    });
    const der={}, derAnt={};                       // sempre a partir dos valores BASE
    DERIV.forEach(d=>{
      der[d.k]   =mais(d.calc(base)+eq[d.k],arv[d.k]);
      derAnt[d.k]=mais(d.calc(ant)+eq[d.k],arv[d.k]);
    });
    const def={};                                   // manual da ficha + equipamentos + árvore
    DEFESAS.forEach(d=>{ def[d.k]=mais((+((pc.defesas||{})[d.k])||0)+eq[d.k],arv[d.k]); });
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
    const recursos=(pc.recursos||[]).map(r=>{
      let val=null,err=null;
      try{ val=evalFormula(r.fml,vars); }catch(e){ err=e.message; }
      const n=val==null?'':normNome(r.nome);
      const b=n&&tem(arvRec,n)?arvRec[n]:0;
      if(b) val=val+b;
      const max=arred(cfg,val);
      return {...r, val, err, arv:b, max:max===0?0:max};     // o teste com 0 tira o −0 (teto(-0.3))
    });
    const r={mult,total,totalAnt,base,ant,tot,eq,der,derAnt,def,vars,recursos,nat,arv,arvRec};
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
  /* dentro de 0..max; com max negativo (fórmula estranha) fica no próprio max */
  const limitar = (v, max) => Math.min(max, Math.max(0, v));
  function atualDe(guardado, max) {              // max: número finito ou null
    const g = numFinito(guardado);
    if (max == null) return g;                   // sem máximo não há "cheio" nem limite
    return g == null ? max : limitar(g, max);
  }
  /* → [{id, nome, max, atual, sobre}] na ordem da ficha. max vem de calc (null se o recurso
     não tem fórmula ou ela deu erro); atual é o guardado em estado.rec, cheio quando
     não há nada guardado, e só é preso em 0..max quando existe max. sobre é a sobrevida
     guardada em estado.sob (0 quando não há). */
  function estadoRecursos(pc, calc, estado) {
    const rec = (estado && estado.rec) || {};
    const sob = (estado && estado.sob) || {};
    const sobreDe = id => { const v = numFinito(tem(sob, id) ? sob[id] : null); return v == null || v < 0 ? 0 : v; };
    const calcs = (calc && calc.recursos) || [];
    return ((pc && pc.recursos) || []).map((r, i) => {
      const c = calcs[i] && calcs[i].id === r.id ? calcs[i] : calcs.find(x => x.id === r.id);
      const max = c ? numFinito(c.max) : null;
      return { id: r.id, nome: r.nome, max, atual: atualDe(tem(rec, r.id) ? rec[r.id] : null, max), sobre: sobreDe(r.id) };
    });
  }
  /* → um estado NOVO com o recurso somado de delta (dano negativo, cura positiva),
     preso em 0..max. Quem ainda não tem valor guardado parte de cheio. O estado
     recebido não é alterado. */
  function aplicarDelta(estado, id, max, delta) {
    const rec = (estado && estado.rec) || {};
    const m = numFinito(max);
    const atual = atualDe(tem(rec, id) ? rec[id] : null, m);
    let novo = (atual == null ? 0 : atual) + (numFinito(delta) || 0);
    if (m != null) novo = limitar(novo, m);
    const rec2 = Object.assign({}, rec);
    por(rec2, id, novo);
    return Object.assign({}, estado, { rec: rec2 });
  }

  /* ---------- resumo para os outros apps ---------- */
  /* objeto pequeno e plano (vai bem em JSON) com o que a mesa, o rolador e as cenas
     precisam de uma ficha sem ter de recalcular */
  function resumo(pc, cfg, extra, estado) {
    const c = calcular(pc, cfg, extra);
    const attrs = {}, base = {}, der = {}, def = {};
    ATRIBS.forEach(a => { attrs[a.k] = c.tot[a.k]; base[a.k] = c.base[a.k]; });
    DERIV.forEach(d => { der[d.k] = c.der[d.k]; });
    DEFESAS.forEach(d => { def[d.k] = c.def[d.k]; });
    return {
      nome: pc.nome || '', lado: pc.lado || 'Aliado',
      attrs, base, der, def,
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
    normNome
  };

  (root.TC || (root.TC = {})).rules = api;
  /* em página de verdade window é o próprio global; em teste pode ser um objeto à parte */
  if (typeof window !== 'undefined' && window && window !== root) (window.TC || (window.TC = root.TC)).rules = api;
  if (typeof module !== 'undefined' && module && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
