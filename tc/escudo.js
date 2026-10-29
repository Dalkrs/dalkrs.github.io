/* Tiny Cats · o Escudo do mestre (lote 31): a conta pura (sem página, sem DOM). Roda igual no navegador
   (window.TC.escudo: na aba Escudo do mestre, nas Pistas, na casca e nas Cenas) e no Node (testes).
   Os documentos da mesa:
     escudo:sessao:<id>     uma sessão do roteiro: os passos (cada um pode se ligar a uma cena, a um lugar do Mapa-múndi,
                            a um encontro do Bestiário, a um handout ou a um relógio), o que aconteceu e o resumo
     escudo:relogio:<id>    um relógio de ameaça (ou de progresso): os gomos, quantos já encheram, a consequência
     escudo:handout:<id>    um handout (imagem, carta ou puzzle), como o mestre o fez: com os trechos e as áreas
                            escondidas, a solução do puzzle e o que acontece ao acertar e ao errar
     escudo:vista[@camp]    os relógios que o mestre mostra (a mesa lê): só o nome, os gomos e quantos encheram
     pista:<id>[@camp]      o handout entregue, como os jogadores o veem: sem o que ainda está escondido. Para a mesa toda
                            (vis 'mesa') ou só para alguns (vis 'mestre' e "para": os escolhidos)
     pista:jogo:<id>[@camp] o puzzle entregue, que os jogadores resolvem juntos: o desenho (sem a solução), o estado de
                            agora, os erros e quem resolveu. Muda pelo banco (pista_jogar), um lance de cada vez
   Tudo o que se sorteia sai de uma semente: a mesma semente dá o mesmo puzzle. */
(() => {
  'use strict';
  const ehObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, p) => { const n = Number(v); return Number.isFinite(n) ? n : p; };
  const int = (v, p, a, b) => clamp(Math.round(num(v, p)), a, b);
  const linha = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max || 80);
  function texto(v, max) {
    let s = typeof v === 'string' ? v : v == null ? '' : String(v);
    s = s.replace(/\r\n?/g, '\n');
    if (s.length > max) { s = s.slice(0, max); if (/[\ud800-\udbff]$/.test(s)) s = s.slice(0, -1); }
    return s;
  }
  const idOk = v => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(v) && !(v in Object.prototype) ? v : null);
  const uidOk = v => (typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v.toLowerCase() : null);
  const instante = v => (typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null);
  // (a imagem da mesa: um endereço https; fora de uma mesa, a imagem guardada no próprio texto — data:, até ~1 MB)
  const urlOk = v => (typeof v === 'string' && ((v.length <= 2000 && /^https:\/\/[^\s"'<>]+$/.test(v)) || (v.length <= 1400000 && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v))) ? v : null);
  function mulberry(a) { return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  let seq = 0;
  const novoId = pre => { seq = (seq + 1) % 1296; return pre + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5) + seq.toString(36); };
  const novaSemente = () => 1 + Math.floor(Math.random() * 2147483000);
  // sem acento, em minúsculas (para buscar e conferir respostas)
  const sem = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const embaralhar = (l, r) => { const a = l.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
  const sortear = (l, r) => l[Math.floor(r() * l.length)];
  // um resumo curto de um texto (o mesmo nos dois lados): a chave de um trecho escondido
  function resumo(s) {
    let a = 0xdeadbeef, b = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); }
    a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
    b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
    return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
  }

  /* ---------------- md5 (o mesmo do banco: md5(text) do Postgres) ----------------
     A resposta de um puzzle não vai para os jogadores: vai o md5 de "sal:resposta". Quem resolve manda a resposta, e
     o banco confere com o md5 dele. */
  function md5(str) {
    const bytes = [];
    for (const ch of unescape(encodeURIComponent(String(str)))) bytes.push(ch.charCodeAt(0));
    const n = bytes.length;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const bits = n * 8;
    for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bits >>> (8 * i)) & 0xff : i === 4 ? Math.floor(bits / 4294967296) & 0xff : 0);
    const K = [], S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let o = 0; o < bytes.length; o += 64) {
      const M = [];
      for (let i = 0; i < 16; i++) M[i] = bytes[o + 4 * i] | (bytes[o + 4 * i + 1] << 8) | (bytes[o + 4 * i + 2] << 16) | (bytes[o + 4 * i + 3] << 24);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    return [a0, b0, c0, d0].map(v => { let s = ''; for (let i = 0; i < 4; i++) s += ((v >>> (8 * i)) & 0xff).toString(16).padStart(2, '0'); return s; }).join('');
  }
  const chkDe = (sal, prova) => md5(sal + ':' + prova);

  /* ---------------- os catálogos ---------------- */
  const PRE = { sessao: 'escudo:sessao:', relogio: 'escudo:relogio:', handout: 'escudo:handout:', vista: 'escudo:vista', pista: 'pista:', jogo: 'pista:jogo:' };
  const LIM = { nome: 80, passos: 80, passo: 160, nota: 1200, log: 200, resumo: 8000, texto: 6000, legenda: 400, consequencia: 600, areas: 24, msg: 240, liga: 12, para: 12 };
  const CORES = { vermelho: ['Vermelho', '#d4574e'], ambar: ['Âmbar', '#e6ab4f'], verde: ['Verde', '#5aa469'], azul: ['Azul', '#5b8fd9'], roxo: ['Roxo', '#9a6ad8'] };
  const TIPOS_RELOGIO = { ameaca: 'Ameaça', progresso: 'Progresso' };
  const GOMOS = [4, 6, 8, 10, 12];
  const PAPEIS = { pergaminho: 'Pergaminho', carta: 'Carta', bilhete: 'Bilhete', tomo: 'Página de livro' };
  const TIPOS_HANDOUT = { imagem: 'Imagem', carta: 'Carta / pergaminho', puzzle: 'Puzzle' };
  const DIF = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
  const PUZZLES = {
    cifra: { nome: 'Cifra', grupo: 'Cifras e códigos', erra: false, desc: 'Uma mensagem cifrada: descubram que letra é cada símbolo.' },
    charada: { nome: 'Charada', grupo: 'Charadas e enigmas', erra: true, desc: 'Uma charada: escrevam a resposta.' },
    luzes: { nome: 'Runas que acendem', grupo: 'Mecanismos', erra: false, desc: 'Tocar uma runa acende ou apaga ela e as vizinhas. Acendam todas.' },
    alavancas: { nome: 'Alavancas', grupo: 'Mecanismos', erra: false, desc: 'Cada alavanca abre ou fecha certas grades. Abram todas ao mesmo tempo.' },
    cadeado: { nome: 'Cadeado de símbolos', grupo: 'Mecanismos', erra: true, desc: 'Palpites antigos riscados na parede dizem quantos símbolos estavam certos. Achem a combinação.' },
    placas: { nome: 'Placas de pressão', grupo: 'Mecanismos', erra: true, desc: 'Pisem nas placas na ordem certa. As inscrições dão as pistas.' },
    imagem: { nome: 'Quebra-cabeça', grupo: 'Quebra-cabeça de imagem', erra: false, desc: 'A imagem em peças embaralhadas: troquem duas peças de lugar até montar.' },
  };
  const LIGAS = { cena: 'Cena', lugar: 'Lugar do Mapa-múndi', encontro: 'Encontro do Bestiário', handout: 'Handout ou puzzle', relogio: 'Relógio', npc: 'NPC' };
  // os símbolos dos mecanismos (cadeado e placas): o nome, "de" (para as frases das pistas) e o desenho (24×24, traço)
  const SIMBOLOS = {
    sol: ['Sol', 'do Sol', '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
    lua: ['Lua', 'da Lua', '<path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 17 7 7 0 0 1 15.5 3.5z"/>'],
    estrela: ['Estrela', 'da Estrela', '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>'],
    chama: ['Chama', 'da Chama', '<path d="M12 3c3 4 6 6.5 6 10.5a6 6 0 0 1-12 0c0-2.6 1.4-4.3 3-5.5 0 2 1 3 2 3 0-3 0-5.5 1-8z"/>'],
    onda: ['Onda', 'da Onda', '<path d="M3 9.5c3-3 6 3 9 0s6 3 9 0M3 15.5c3-3 6 3 9 0s6 3 9 0"/>'],
    folha: ['Folha', 'da Folha', '<path d="M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8"/>'],
    montanha: ['Montanha', 'da Montanha', '<path d="M2.5 19.5l6.5-11 4 6.5 2.5-3.5 6 8z"/>'],
    olho: ['Olho', 'do Olho', '<path d="M2 12s4-6.5 10-6.5S22 12 22 12s-4 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'],
    coroa: ['Coroa', 'da Coroa', '<path d="M4 19h16M5 16 4 7l5 4 3-6.5 3 6.5 5-4-1 9z"/>'],
    espada: ['Espada', 'da Espada', '<path d="M14.5 3.5H20.5v6L10 20l-6-6z"/><path d="M3.5 20.5l3-3M7.5 13.5l3 3"/>'],
    chave: ['Chave', 'da Chave', '<circle cx="7.5" cy="16.5" r="4"/><path d="M10.5 13.5l9-9M16.5 7.5l2.5 2.5M14 10l2 2"/>'],
    caveira: ['Caveira', 'da Caveira', '<path d="M12 3a7.5 7.5 0 0 0-5 13.1V20h10v-3.9A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11.5" r="1.6"/><circle cx="15" cy="11.5" r="1.6"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>'],
  };
  const ORDEM_SIMBOLOS = Object.keys(SIMBOLOS);
  // as runas (para as cifras de runas): 26 desenhos, um por letra
  const RUNAS = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ', 'ᛇ', 'ᛈ', 'ᛉ', 'ᛊ', 'ᛏ', 'ᛒ', 'ᛖ', 'ᛗ', 'ᛚ', 'ᛜ', 'ᛞ', 'ᛟ', 'ᚩ', 'ᚣ'];
  const ALFA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  // mensagens para sortear numa cifra (o mestre pode escrever a dele)
  const MENSAGENS = [
    'O tesouro está sob a ponte velha', 'Não confie no capitão da guarda', 'A porta norte abre ao luar',
    'Encontre o ferreiro antes do amanhecer', 'O rei não está morto, está escondido', 'Três passos à esquerda do altar',
    'A chave está com a filha do moleiro', 'Eles chegam pelo rio na lua nova', 'Queime esta carta depois de ler',
    'O mapa verdadeiro está no sino da torre', 'A senha é o nome do primeiro rei', 'Siga o corvo até a pedra partida',
    'O veneno estava no vinho do banquete', 'Ninguém sai da cidade depois do sino', 'A bruxa da colina sabe a verdade',
    'Cave onde a sombra da torre termina ao meio-dia', 'O espião usa um anel de prata', 'A caravana leva armas, não sal',
    'O dragão dorme, mas não para sempre', 'Diga ao lobo que o pacto acabou',
  ];
  /* As charadas: p (a pergunta), r (as respostas aceitas), d (duas dicas, que o mestre revela se quiser), dif. As
     respostas são conferidas sem acento, sem maiúsculas e sem o artigo do começo ("o rio" vale "rio"). */
  const CHARADAS = [
    // fáceis
    { dif: 'facil', p: 'Tem dentes, mas não morde.', r: ['pente'], d: ['Fica perto do espelho.', 'Passa pelo cabelo.'] },
    { dif: 'facil', p: 'Quanto mais se tira, maior fica.', r: ['buraco'], d: ['Uma pá ajuda.', 'Fica no chão.'] },
    { dif: 'facil', p: 'Anda com os pés na cabeça.', r: ['piolho', 'piolhos'], d: ['É um bicho bem pequeno.', 'Ninguém quer ter.'] },
    { dif: 'facil', p: 'Tem coroa, mas não é rei; tem escamas, mas não é peixe.', r: ['abacaxi', 'ananas'], d: ['É uma fruta.', 'Por dentro é amarela.'] },
    { dif: 'facil', p: 'Cai em pé e corre deitada.', r: ['chuva', 'agua da chuva'], d: ['Vem do céu.', 'Molha.'] },
    { dif: 'facil', p: 'Tem cabeça, tem dente, não é bicho nem é gente.', r: ['alho', 'cabeca de alho'], d: ['Vai na comida.', 'Espanta vampiro.'] },
    { dif: 'facil', p: 'Quanto mais seca, mais molhada fica.', r: ['toalha'], d: ['Usa-se depois do banho.', 'É de pano.'] },
    { dif: 'facil', p: 'Nasce grande e morre pequena.', r: ['vela'], d: ['Dá luz.', 'Derrete.'] },
    { dif: 'facil', p: 'Tem um olho só e não enxerga nada.', r: ['agulha'], d: ['O alfaiate usa.', 'A linha passa pelo olho.'] },
    { dif: 'facil', p: 'Sobe e desce sem sair do lugar.', r: ['escada'], d: ['Tem degraus.', 'Liga um andar ao outro.'] },
    { dif: 'facil', p: 'Tem pescoço, mas não tem cabeça.', r: ['garrafa'], d: ['Guarda vinho.', 'Tem rolha.'] },
    { dif: 'facil', p: 'Voa sem asas e chora sem olhos.', r: ['nuvem', 'nuvens'], d: ['Fica no céu.', 'Às vezes fica cinza.'] },
    { dif: 'facil', p: 'Tem chapéu, mas não tem cabeça; tem pé, mas não tem sapato.', r: ['cogumelo'], d: ['Nasce no úmido.', 'Uns são venenosos.'] },
    { dif: 'facil', p: 'É uma ponte de sete cores que aparece depois da chuva.', r: ['arco-iris', 'arco iris', 'arcoiris'], d: ['Precisa de sol.', 'Fica no céu.'] },
    { dif: 'facil', p: 'Segue você de dia e some à noite.', r: ['sombra', 'minha sombra', 'sua sombra'], d: ['Precisa de luz.', 'É escura.'] },
    // médias
    { dif: 'medio', p: 'Feito de pedra, guarda reis que não respiram.', r: ['tumulo', 'tumba', 'cripta', 'mausoleu', 'sepulcro'], d: ['Fica num cemitério.', 'É a última casa.'] },
    { dif: 'medio', p: 'Sou leve como uma pena, mas nem o mais forte me segura por muito tempo.', r: ['folego', 'respiracao', 'ar'], d: ['Você está usando agora.', 'Debaixo d’água, falta.'] },
    { dif: 'medio', p: 'Tenho cidades sem casas, florestas sem árvores e rios sem água.', r: ['mapa'], d: ['É de papel.', 'Serve para não se perder.'] },
    { dif: 'medio', p: 'Falo sem boca e ouço sem ouvidos; nas montanhas, respondo a quem chama.', r: ['eco'], d: ['Repete o que você diz.', 'Gosta de cavernas.'] },
    { dif: 'medio', p: 'Quem me faz não precisa de mim; quem me compra não me usa; quem me usa não me vê.', r: ['caixao', 'esquife'], d: ['É de madeira.', 'Vai para debaixo da terra.'] },
    { dif: 'medio', p: 'Corro sem pernas, tenho leito e não durmo, tenho boca e não falo.', r: ['rio'], d: ['Tem margens.', 'Vai dar no mar.'] },
    { dif: 'medio', p: 'Basta dizer o meu nome para eu me quebrar.', r: ['silencio'], d: ['Na biblioteca, pedem por mim.', 'Some com um barulho.'] },
    { dif: 'medio', p: 'É seu, mas os outros usam muito mais do que você.', r: ['nome', 'seu nome', 'meu nome'], d: ['Todo mundo tem um.', 'Chamam você por ele.'] },
    { dif: 'medio', p: 'Tenho muitas teclas, mas não abro nenhuma porta.', r: ['piano', 'teclado', 'cravo', 'orgao'], d: ['Faz música.', 'As teclas são brancas e pretas.'] },
    { dif: 'medio', p: 'Entro seco e saio molhado; quanto mais tempo fico, mais forte fico.', r: ['cha', 'saquinho de cha', 'folha de cha'], d: ['Precisa de água quente.', 'Bebe-se numa xícara.'] },
    { dif: 'medio', p: 'Dia e noite ando em círculos, e nunca saio do lugar.', r: ['ponteiro', 'ponteiros', 'relogio'], d: ['Marca as horas.', 'Tem um grande e um pequeno.'] },
    { dif: 'medio', p: 'Devoro ferro e pedra, rei e reino; nada me escapa.', r: ['tempo', 'o tempo'], d: ['Ninguém o segura.', 'Uma ampulheta o mede.'] },
    { dif: 'medio', p: 'Tenho gola e não tenho pescoço, tenho mangas e não tenho braços.', r: ['camisa', 'camisao', 'blusa', 'casaco', 'gibao'], d: ['Você veste.', 'Tem botões.'] },
    { dif: 'medio', p: 'Quem me tem quer me contar; contado, deixo de existir.', r: ['segredo', 'um segredo'], d: ['Conta-se baixinho.', 'Melhor guardado.'] },
    { dif: 'medio', p: 'Enche uma sala inteira sem ocupar espaço nenhum.', r: ['luz', 'a luz'], d: ['Vem da vela.', 'Some quando a vela apaga.'] },
    { dif: 'medio', p: 'Quanto mais você dá, mais deixa para trás.', r: ['passos', 'passo', 'pegadas'], d: ['Os pés fazem.', 'Na lama, ficam marcados.'] },
    { dif: 'medio', p: 'Dou muitas voltas e não saio do lugar; com o vento, viro o trigo em farinha.', r: ['moinho', 'moinho de vento'], d: ['Tem pás.', 'O moleiro cuida de mim.'] },
    // difíceis
    { dif: 'dificil', p: 'Uma casa sem portas nem janelas; dentro, um tesouro de ouro.', r: ['ovo'], d: ['A galinha sabe.', 'O ouro é a gema.'] },
    { dif: 'dificil', p: 'Trinta cavalos brancos num morro vermelho: mordem, batem e ficam parados.', r: ['dentes', 'dente'], d: ['O morro é a gengiva.', 'Ficam na boca.'] },
    { dif: 'dificil', p: 'Sem voz eu choro, sem asas eu esvoaço, sem dentes eu mordo, sem boca eu murmuro.', r: ['vento', 'o vento'], d: ['Ninguém me vê.', 'Mexe as folhas.'] },
    { dif: 'dificil', p: 'Vivo sem respirar, frio como a morte; nunca tenho sede, embora sempre beba; vestido de malha, nunca tilinto.', r: ['peixe'], d: ['A malha são as escamas.', 'Mora no rio.'] },
    { dif: 'dificil', p: 'De manhã anda em quatro pés, ao meio-dia em dois e à tarde em três.', r: ['homem', 'ser humano', 'humano', 'pessoa', 'o homem'], d: ['A tarde é a velhice.', 'O terceiro pé é a bengala.'] },
    { dif: 'dificil', p: 'Posso ser quebrada sem ser tocada, e feita sem ser vista.', r: ['promessa', 'uma promessa', 'palavra'], d: ['Faz-se com palavras.', 'Quem cumpre não quebra.'] },
    { dif: 'dificil', p: 'Vem uma vez num minuto, duas vezes num momento e nunca em cem anos.', r: ['m', 'letra m', 'a letra m'], d: ['Olhe para as palavras.', 'É uma letra.'] },
    { dif: 'dificil', p: 'Tenho raízes que ninguém vê e sou mais alta que as árvores; subo, subo, e nunca cresço.', r: ['montanha', 'monte', 'serra'], d: ['Às vezes tem neve no topo.', 'É de pedra.'] },
    { dif: 'dificil', p: 'Alimente-me e eu vivo; dê-me água e eu morro.', r: ['fogo', 'chama', 'fogueira'], d: ['Esquenta.', 'Come lenha.'] },
    { dif: 'dificil', p: 'O pobre tem, o rico precisa, e quem come morre.', r: ['nada'], d: ['É menos que pouco.', 'Leia de novo, palavra por palavra.'] },
    { dif: 'dificil', p: 'Tenho cara e tenho coroa, mas nenhum corpo.', r: ['moeda', 'uma moeda'], d: ['Vai na bolsa.', 'Joga-se para decidir.'] },
    { dif: 'dificil', p: 'Duas irmãs: uma dá à luz a outra, e a outra dá à luz a primeira.', r: ['dia e noite', 'noite e dia', 'o dia e a noite', 'a noite e o dia'], d: ['Uma é clara, a outra escura.', 'Revezam-se no céu.'] },
    { dif: 'dificil', p: 'Verde por fora, branco por dentro; se quer que eu diga, espera.', r: ['pera'], d: ['É uma fruta.', 'A resposta está na pergunta.'] },
    { dif: 'dificil', p: 'Nasce na água, vive da água, e se lhe jogam água, morre.', r: ['sal'], d: ['Vem do mar.', 'Vai na comida.'] },
    { dif: 'dificil', p: 'O que está bem no meio do ovo?', r: ['v', 'letra v', 'a letra v'], d: ['Não é a gema.', 'Olhe para a palavra.'] },
  ];

  /* ---------------- respostas ---------------- */
  // a resposta escrita como se confere: sem acento, minúsculas, sem pontuação, sem artigo no começo
  function normResposta(s) {
    let r = sem(s).replace(/[’'`´]/g, '').replace(/[^a-z0-9\- ]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    for (let i = 0; i < 3; i++) r = r.replace(/^(o|a|os|as|um|uma|uns|umas) /, '');
    return r;
  }
  // a mensagem de uma cifra como se confere: só as letras de A a Z e os espaços entre as palavras
  const normMensagem = s => sem(s).toUpperCase().replace(/[^A-Z ]+/g, ' ').replace(/\s+/g, ' ').trim();

  /* ---------------- sessões e passos ---------------- */
  function normLiga(v) {
    if (!ehObj(v) || !Object.prototype.hasOwnProperty.call(LIGAS, v.k)) return null;
    if (v.k === 'lugar') { const mapa = idOk(v.mapa), obj = idOk(v.obj); return mapa && obj ? { k: 'lugar', mapa, obj } : null; }
    const id = idOk(v.id);
    if (!id) return null;
    if (v.k === 'relogio') return { k: 'relogio', id, n: int(v.n, 1, -12, 12) || 1 };
    return { k: v.k, id };
  }
  function normPasso(p, vistos) {
    p = ehObj(p) ? p : {};
    let id = idOk(p.id) || novoId('ps');
    while (vistos && vistos.has(id)) id = novoId('ps');
    if (vistos) vistos.add(id);
    return { id, txt: linha(p.txt, LIM.passo), nota: texto(p.nota, LIM.nota), feito: p.feito === true, liga: normLiga(p.liga) };
  }
  const ESTADOS_SESSAO = { plano: 'Planejada', aberta: 'Em jogo', fechada: 'Jogada' };
  function normLog(v) {
    const out = [];
    for (const e of Array.isArray(v) ? v : []) {
      if (!ehObj(e)) continue;
      const em = instante(e.em);
      if (!em) continue;
      out.push({ em, t: linha(e.t, 20), txt: linha(e.txt, 240) });
    }
    return out.slice(-LIM.log);
  }
  function normSessao(d) {
    d = ehObj(d) ? d : {};
    const vistos = new Set();
    const ini = ehObj(d.inicio) ? d.inicio : null, fim = ehObj(d.fim) ? d.fim : null;
    const rel = {};
    if (ini && ehObj(ini.relogios)) for (const k of Object.keys(ini.relogios)) { if (idOk(k)) rel[k] = int(ini.relogios[k], 0, 0, 12); }
    return {
      v: 1,
      nome: linha(d.nome, 60) || 'Sessão',
      n: int(d.n, 1, 1, 9999),
      camp: idOk(d.camp) || null,
      estado: Object.prototype.hasOwnProperty.call(ESTADOS_SESSAO, d.estado) ? d.estado : 'plano',
      quando: linha(d.quando, 40),
      passos: (Array.isArray(d.passos) ? d.passos : []).slice(0, LIM.passos).map(p => normPasso(p, vistos)),
      inicio: ini && instante(ini.em) ? { em: ini.em, relogios: rel } : null,
      fim: fim && instante(fim.em) ? { em: fim.em } : null,
      log: normLog(d.log),
      resumo: texto(d.resumo, LIM.resumo),
    };
  }
  function sessaoNova(n, camp) { return normSessao({ nome: 'Sessão ' + n, n, camp: camp || null, passos: [] }); }
  // a próxima sessão planejada (a de número mais baixo), ou null
  function proximaPlanejada(sessoes, camp, menosId) {
    const l = sessoes.filter(x => x.s.estado === 'plano' && (x.s.camp || null) === (camp || null) && x.id !== menosId);
    l.sort((a, b) => a.s.n - b.s.n);
    return l[0] || null;
  }
  const proximoNumero = (sessoes, camp) => 1 + sessoes.filter(x => (x.s.camp || null) === (camp || null)).reduce((m, x) => Math.max(m, x.s.n), 0);
  const sobras = s => s.passos.filter(p => !p.feito);

  /* ---------------- relógios ---------------- */
  function normRelogio(d) {
    d = ehObj(d) ? d : {};
    const gomos = int(d.gomos, 6, 2, 12);
    return {
      v: 1,
      nome: linha(d.nome, 60) || 'Relógio',
      gomos,
      cheio: int(d.cheio, 0, 0, gomos),
      cor: Object.prototype.hasOwnProperty.call(CORES, d.cor) ? d.cor : 'vermelho',
      tipo: Object.prototype.hasOwnProperty.call(TIPOS_RELOGIO, d.tipo) ? d.tipo : 'ameaca',
      vista: d.vista === true,
      porDia: int(d.porDia, 0, 0, 12),
      consequencia: texto(d.consequencia, LIM.consequencia),
      camp: idOk(d.camp) || null,
      ordem: int(d.ordem, 0, -1e6, 1e6),
    };
  }
  // avançar (ou voltar) n gomos: → { r (o relógio novo), encheu (acabou de encher), antes }
  function avancar(r, n) {
    r = normRelogio(r);
    const antes = r.cheio;
    r.cheio = clamp(antes + Math.round(num(n, 1)), 0, r.gomos);
    return { r, antes, encheu: antes < r.gomos && r.cheio === r.gomos };
  }
  // o que a mesa lê: só os relógios à vista, do mundo (camp null) ou de uma campanha
  function vistaDe(relogios, camp) {
    const l = relogios.filter(x => x.r.vista && (x.r.camp || null) === (camp || null));
    l.sort((a, b) => a.r.ordem - b.r.ordem || a.r.nome.localeCompare(b.r.nome, 'pt-BR'));
    return { v: 1, relogios: l.map(x => ({ id: x.id, nome: x.r.nome, gomos: x.r.gomos, cheio: x.r.cheio, cor: x.r.cor, tipo: x.r.tipo })) };
  }
  function normVista(d) {
    d = ehObj(d) ? d : {};
    const out = [];
    for (const r of Array.isArray(d.relogios) ? d.relogios : []) {
      if (!ehObj(r) || !idOk(r.id) || out.length >= 40) continue;
      const g = int(r.gomos, 6, 2, 12);
      out.push({ id: r.id, nome: linha(r.nome, 60), gomos: g, cheio: int(r.cheio, 0, 0, g), cor: Object.prototype.hasOwnProperty.call(CORES, r.cor) ? r.cor : 'vermelho', tipo: r.tipo === 'progresso' ? 'progresso' : 'ameaca' });
    }
    return { v: 1, relogios: out };
  }
  const idVista = camp => PRE.vista + (camp ? '@' + camp : '');

  /* ---------------- handouts: os trechos e as áreas escondidas ----------------
     No texto, {{assim}} é um trecho escondido: os jogadores veem uma mancha do tamanho dele até o mestre revelar. A
     chave de um trecho é o resumo do texto dele (sem espaços sobrando): revelado continua revelado enquanto o texto do
     trecho não muda. */
  const RE_TRECHO = /\{\{([\s\S]*?)\}\}/g;
  const chaveTrecho = s => 't' + resumo(linha(s, 2000));
  function trechos(txt) {
    const out = [], vistos = new Set();
    let m;
    RE_TRECHO.lastIndex = 0;
    while ((m = RE_TRECHO.exec(String(txt || '')))) {
      const s = m[1];
      if (!linha(s, 2000)) continue;
      const k = chaveTrecho(s);
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ k, txt: linha(s, 120) });
    }
    return out;
  }
  // o texto em pedaços, como os jogadores o recebem: texto à vista (string) e trecho escondido (o tamanho, em letras)
  function partesDoTexto(txt, revelados) {
    const rev = new Set(Array.isArray(revelados) ? revelados : []), out = [];
    const s = String(txt || '');
    let i = 0, m;
    const poe = t => { if (!t) return; if (typeof out[out.length - 1] === 'string') out[out.length - 1] += t; else out.push(t); };
    RE_TRECHO.lastIndex = 0;
    while ((m = RE_TRECHO.exec(s))) {
      poe(s.slice(i, m.index));
      const k = chaveTrecho(m[1]);
      if (!linha(m[1], 2000) || rev.has(k)) poe(m[1]);
      else out.push(clamp(m[1].length, 1, 400));
      i = m.index + m[0].length;
    }
    poe(s.slice(i));
    return out;
  }
  function normArea(a, vistos) {
    if (!ehObj(a)) return null;
    let id = idOk(a.id) || novoId('ar');
    while (vistos.has(id)) id = novoId('ar');
    vistos.add(id);
    const x = clamp(num(a.x, 0), 0, 1), y = clamp(num(a.y, 0), 0, 1);
    const w = clamp(num(a.w, 0.2), 0.02, 1 - x), h = clamp(num(a.h, 0.2), 0.02, 1 - y);
    const r3 = v => Math.round(v * 1000) / 1000;
    return { id, x: r3(x), y: r3(y), w: r3(w), h: r3(h), rev: a.rev === true };
  }
  function normPara(v) {
    if (v === 'mesa') return 'mesa';
    if (!Array.isArray(v)) return null;
    const l = [...new Set(v.map(uidOk).filter(Boolean))].slice(0, LIM.para);
    return l.length ? l : null;
  }
  function normAcerto(l) {
    const out = [];
    for (const a of Array.isArray(l) ? l : []) {
      if (!ehObj(a) || out.length >= LIM.liga) continue;
      const h = idOk(a.h);
      if (!h) continue;
      if (a.k === 'entregar') out.push({ k: 'entregar', h });
      else if (a.k === 'revelar') out.push({ k: 'revelar', h, trechos: Array.isArray(a.trechos) ? a.trechos.filter(t => typeof t === 'string' && /^t[0-9a-z]{1,14}$/.test(t)).slice(0, 40) : null, areas: Array.isArray(a.areas) ? a.areas.map(idOk).filter(Boolean).slice(0, 40) : null });
    }
    return out;
  }
  function normPuzzleDef(p) {
    if (!ehObj(p) || !Object.prototype.hasOwnProperty.call(PUZZLES, p.tipo)) return null;
    const o = { tipo: p.tipo, dif: Object.prototype.hasOwnProperty.call(DIF, p.dif) ? p.dif : 'medio', seed: int(p.seed, 1, 1, 2147483646) };
    if (p.tipo === 'cifra') {
      o.msg = linha(p.msg, LIM.msg);
      o.metodo = ['cesar', 'troca', 'runas'].includes(p.metodo) ? p.metodo : 'runas';
    }
    if (p.tipo === 'charada') {
      o.idx = Number.isInteger(p.idx) && p.idx >= 0 && p.idx < CHARADAS.length ? p.idx : null;
      if (ehObj(p.propria) && linha(p.propria.p, 400)) {
        o.propria = { p: linha(p.propria.p, 400), r: (Array.isArray(p.propria.r) ? p.propria.r : []).map(x => linha(x, 60)).filter(x => normResposta(x)).slice(0, 8),
          d: (Array.isArray(p.propria.d) ? p.propria.d : []).map(x => linha(x, 160)).filter(Boolean).slice(0, 4) };
        if (!o.propria.r.length) o.propria = null;
      }
      if (o.idx == null && !o.propria) o.idx = 0;
    }
    return o;
  }
  function normHandout(d) {
    d = ehObj(d) ? d : {};
    const tipo = Object.prototype.hasOwnProperty.call(TIPOS_HANDOUT, d.tipo) ? d.tipo : 'carta';
    const vistos = new Set();
    const ent = ehObj(d.entregue) ? d.entregue : null, res = ehObj(d.resultado) ? d.resultado : {}, lg = ehObj(d.liga) ? d.liga : {};
    const erro = ehObj(lg.erro) && idOk(lg.erro.relogio) ? { relogio: lg.erro.relogio, gomos: int(lg.erro.gomos, 1, 1, 6) } : null;
    return {
      v: 1,
      nome: linha(d.nome, LIM.nome) || (tipo === 'puzzle' ? 'Puzzle' : 'Handout'),
      tipo,
      camp: idOk(d.camp) || null,
      img: urlOk(d.img),
      imgAr: Math.round(clamp(num(d.imgAr, 1) > 0 ? num(d.imgAr, 1) : 1, 0.25, 4) * 1000) / 1000,
      legenda: texto(d.legenda, LIM.legenda),
      texto: texto(d.texto, LIM.texto),
      papel: Object.prototype.hasOwnProperty.call(PAPEIS, d.papel) ? d.papel : 'pergaminho',
      assinatura: linha(d.assinatura, 80),
      revelados: [...new Set((Array.isArray(d.revelados) ? d.revelados : []).filter(t => typeof t === 'string' && /^t[0-9a-z]{1,14}$/.test(t)))].slice(0, 200),
      areas: (Array.isArray(d.areas) ? d.areas : []).map(a => normArea(a, vistos)).filter(Boolean).slice(0, LIM.areas),
      puzzle: tipo === 'puzzle' ? normPuzzleDef(d.puzzle) || normPuzzleDef({ tipo: 'charada', dif: 'facil', seed: 1, idx: 0 }) : null,
      liga: { acerto: normAcerto(lg.acerto), erro },
      entregue: ent && instante(ent.em) && normPara(ent.para) ? { para: normPara(ent.para), em: ent.em, ver: int(ent.ver, 1, 1, 1e9) } : null,
      ver: int(d.ver, 1, 1, 1e9),
      resultado: { acertoFeito: res.acertoFeito === true, errosVistos: int(res.errosVistos, 0, 0, 1e6) },
      ordem: int(d.ordem, 0, -1e6, 1e6),
    };
  }
  const idPista = (hid, camp) => PRE.pista + hid + (camp ? '@' + camp : '');
  const idJogo = (hid, camp) => PRE.jogo + hid + (camp ? '@' + camp : '');
  // o handout de uma pista (pista:<hid>[@camp] → hid; pista:jogo:… → null)
  function hidDaPista(id) {
    if (typeof id !== 'string' || !id.startsWith(PRE.pista) || id.startsWith(PRE.jogo)) return null;
    return idOk(id.slice(PRE.pista.length).split('@')[0]);
  }
  function hidDoJogo(id) {
    if (typeof id !== 'string' || !id.startsWith(PRE.jogo)) return null;
    return idOk(id.slice(PRE.jogo.length).split('@')[0]);
  }
  /* A pista, como os jogadores a recebem: img é a imagem já com as áreas escondidas cobertas (a casca a monta e sobe;
     sem áreas, a original). → os dados do documento pista:<hid> */
  function projetarHandout(hid, h, img, em) {
    h = normHandout(h);
    const pz = h.puzzle;
    return {
      v: 1, hid, nome: h.nome, tipo: h.tipo, papel: h.papel,
      img: urlOk(img) || null,
      legenda: h.legenda,
      partes: partesDoTexto(h.texto, h.revelados),
      assinatura: h.assinatura,
      ver: h.ver,
      em: instante(em) || new Date().toISOString(),
      puzzle: pz ? { tipo: pz.tipo, nome: PUZZLES[pz.tipo].nome, dif: pz.dif } : null,
    };
  }
  function normPista(d) {
    d = ehObj(d) ? d : {};
    const partes = [];
    for (const p of Array.isArray(d.partes) ? d.partes : []) {
      if (typeof p === 'string') partes.push(texto(p, LIM.texto));
      else if (typeof p === 'number' && Number.isFinite(p)) partes.push(clamp(Math.round(p), 1, 400));
      if (partes.length >= 400) break;
    }
    const pz = ehObj(d.puzzle) && Object.prototype.hasOwnProperty.call(PUZZLES, d.puzzle.tipo) ? { tipo: d.puzzle.tipo, nome: PUZZLES[d.puzzle.tipo].nome, dif: Object.prototype.hasOwnProperty.call(DIF, d.puzzle.dif) ? d.puzzle.dif : 'medio' } : null;
    return {
      v: 1, hid: idOk(d.hid), nome: linha(d.nome, LIM.nome) || 'Pista', tipo: Object.prototype.hasOwnProperty.call(TIPOS_HANDOUT, d.tipo) ? d.tipo : 'carta',
      papel: Object.prototype.hasOwnProperty.call(PAPEIS, d.papel) ? d.papel : 'pergaminho', img: urlOk(d.img), legenda: texto(d.legenda, LIM.legenda), partes,
      assinatura: linha(d.assinatura, 80), ver: int(d.ver, 1, 1, 1e9), em: instante(d.em), puzzle: pz,
    };
  }
  const escondidos = h => trechos(h.texto).filter(t => !h.revelados.includes(t.k)).length + h.areas.filter(a => !a.rev).length;

  /* ---------------- os puzzles ----------------
     montarPuzzle(def, img) → { pub (o desenho que os jogadores veem), estado (o começo), sal, chk (os md5 das respostas
     certas) }. A solução não sai daqui: só o md5 dela. Cada tipo tem também o "prova" — a resposta que o estado de agora
     dá (ou null) — e quem resolve manda essa prova ao banco. */
  const QTD = { facil: 0, medio: 1, dificil: 2 };
  function salDe(r) { let s = ''; for (let i = 0; i < 10; i++) s += 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(r() * 32)]; return s; }

  // -- cifra
  function montarCifra(def, r) {
    const msg = normMensagem(def.msg || sortear(MENSAGENS, r)) || 'A CHAVE ESTA NA TORRE';
    const metodo = def.metodo;
    let mapa = {};                                       // letra → símbolo (o desenho)
    let dica = '';
    if (metodo === 'cesar') {
      const k = 1 + Math.floor(r() * 25);
      for (let i = 0; i < 26; i++) mapa[ALFA[i]] = ALFA[(i + k) % 26];
      if (def.dif === 'facil') dica = 'Cada letra andou ' + k + (k === 1 ? ' casa' : ' casas') + ' no alfabeto.';
      else if (def.dif === 'medio') dica = 'Cada letra andou o mesmo tanto de casas no alfabeto.';
    } else {
      const simb = metodo === 'runas' ? embaralhar(RUNAS, r) : (() => { let p; do { p = embaralhar(ALFA.split(''), r); } while (p.some((c, i) => c === ALFA[i])); return p; })();
      for (let i = 0; i < 26; i++) mapa[ALFA[i]] = simb[i];
    }
    // os símbolos na ordem em que aparecem; o texto cifrado: número (o símbolo) ou texto (o espaço e a pontuação)
    const simbolos = [], idx = {}, cod = [];
    const original = sem(def.msg || '').toUpperCase().replace(/[^A-Z .,!?;:-]+/g, ' ').replace(/\s+/g, ' ').trim() || msg;
    for (const c of original) {
      if (ALFA.includes(c)) {
        const s = mapa[c];
        if (!(s in idx)) { idx[s] = simbolos.length; simbolos.push(s); }
        cod.push(idx[s]);
      } else if (typeof cod[cod.length - 1] === 'string') cod[cod.length - 1] += c;
      else cod.push(c);
    }
    // as letras dadas: fácil, uma boa parte; médio, poucas; difícil, nenhuma (o César fácil já tem a dica)
    const dadas = {};
    const inverso = {}; for (const L of ALFA) inverso[mapa[L]] = L;
    const frac = metodo === 'cesar' ? (def.dif === 'medio' ? 0.0001 : 0) : def.dif === 'facil' ? 0.4 : def.dif === 'medio' ? 0.18 : 0;
    if (frac > 0) {
      const contagem = simbolos.map((s, i) => [i, cod.filter(x => x === i).length]);
      contagem.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      const n = Math.max(1, Math.round(simbolos.length * frac));
      for (const [i] of embaralhar(contagem.slice(0, Math.min(contagem.length, n * 2)), r).slice(0, n)) dadas[i] = inverso[simbolos[i]];
    }
    const letras = {}; simbolos.forEach((x, i) => { letras[i] = inverso[x]; });
    return { pub: { metodo, simbolos, cod, dadas, dica }, estado: {}, provaCerta: normMensagem(original), letras };
  }
  function decifrar(pub, estado) {
    let s = '';
    for (const x of pub.cod) {
      // (a letra dada no desenho, ou a que o mestre revelou depois, vale mais que o palpite)
      if (typeof x === 'number') { const g = pub.dadas[x] || (estado && estado['d' + x]) || (estado && estado['c' + x]) || ''; s += /^[A-Z]$/.test(g) ? g : '_'; }
      else s += x;
    }
    return s;
  }

  // -- charada
  function montarCharada(def, r) {
    const c = def.propria || CHARADAS[def.idx == null ? 0 : def.idx];
    const certas = [...new Set(c.r.map(normResposta).filter(Boolean))];
    return { pub: { pergunta: c.p, nd: (c.d || []).length }, estado: {}, certas, dicas: (c.d || []).slice() };
  }
  // a charada sorteada de uma dificuldade (o índice no banco)
  function sortearCharada(dif, r, menos) {
    const l = CHARADAS.map((c, i) => [c, i]).filter(([c, i]) => c.dif === dif && i !== menos);
    return sortear(l.length ? l : CHARADAS.map((c, i) => [c, i]), r)[1];
  }

  // -- luzes (runas que acendem: tocar acende ou apaga a runa e as quatro vizinhas)
  function tocarLuz(l, n, i) {
    const a = l.split('');
    const flip = k => { a[k] = a[k] === '1' ? '0' : '1'; };
    const x = i % n, y = Math.floor(i / n);
    flip(i);
    if (x > 0) flip(i - 1);
    if (x < n - 1) flip(i + 1);
    if (y > 0) flip(i - n);
    if (y < n - 1) flip(i + n);
    return a.join('');
  }
  function montarLuzes(def, r) {
    const n = def.dif === 'facil' ? 3 : def.dif === 'medio' ? 4 : 5;
    const toques = def.dif === 'facil' ? 3 : def.dif === 'medio' ? 5 : 8;
    const cheio = '1'.repeat(n * n);
    let l = cheio, tent = 0;
    while (l === cheio && tent++ < 20) {
      l = cheio;
      for (const i of embaralhar([...Array(n * n).keys()], r).slice(0, toques)) l = tocarLuz(l, n, i);
    }
    return { pub: { n }, estado: { l }, provaCerta: cheio };
  }

  // -- alavancas (cada alavanca abre ou fecha certas grades; todas abertas ao mesmo tempo)
  function gradesDe(pub, estado) {
    const g = pub.g0.split('');
    for (let i = 0; i < pub.liga.length; i++) {
      if ((estado && estado['a' + i]) !== '1') continue;
      for (const j of pub.liga[i]) g[j] = g[j] === '1' ? '0' : '1';
    }
    return g.join('');
  }
  function montarAlavancas(def, r) {
    const n = def.dif === 'facil' ? 4 : def.dif === 'medio' ? 5 : 6;
    const m = n;
    let liga, g0, tent = 0;
    do {
      liga = [];
      for (let i = 0; i < n; i++) {
        const q = def.dif === 'facil' ? 1 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2);
        liga.push(embaralhar([...Array(m).keys()], r).slice(0, q).sort((a, b) => a - b));
      }
      // cada grade mexida por pelo menos uma alavanca
      for (let j = 0; j < m; j++) if (!liga.some(l => l.includes(j))) { const i = Math.floor(r() * n); liga[i].push(j); liga[i].sort((a, b) => a - b); }
      // a solução: algumas alavancas para cima
      const sol = [...Array(n)].map(() => (r() < 0.5 ? '1' : '0'));
      if (!sol.includes('1')) sol[Math.floor(r() * n)] = '1';
      const est = {}; sol.forEach((v, i) => { est['a' + i] = v; });
      const virado = gradesDe({ g0: '0'.repeat(m), liga }, est);       // o que a solução vira
      g0 = virado.split('').map(c => (c === '1' ? '0' : '1')).join('');   // virando isso, tudo abre
    } while (g0 === '1'.repeat(m) && tent++ < 30);
    return { pub: { n, m, liga, g0 }, estado: {}, provaCerta: '1'.repeat(m) };
  }

  // -- cadeado (Senha: os palpites antigos e quantos estavam certos)
  function nota(palpite, sol) {
    let lugar = 0; const cp = {}, cs = {};
    for (let i = 0; i < sol.length; i++) {
      if (palpite[i] === sol[i]) lugar++;
      else { cp[palpite[i]] = (cp[palpite[i]] || 0) + 1; cs[sol[i]] = (cs[sol[i]] || 0) + 1; }
    }
    let fora = 0; for (const k in cp) fora += Math.min(cp[k], cs[k] || 0);
    return [lugar, fora];
  }
  function todasCombinacoes(n, k) {
    const out = [], c = Array(n).fill(0);
    for (;;) {
      out.push(c.slice());
      let i = n - 1;
      while (i >= 0 && ++c[i] === k) { c[i] = 0; i--; }
      if (i < 0) return out;
    }
  }
  function montarCadeado(def, r) {
    const n = def.dif === 'facil' ? 3 : def.dif === 'medio' ? 4 : 4;
    const k = def.dif === 'dificil' ? 8 : 6;
    const simbolos = embaralhar(ORDEM_SIMBOLOS, r).slice(0, k);
    const sol = [...Array(n)].map(() => Math.floor(r() * k));
    let cand = todasCombinacoes(n, k);
    const pistas = [];
    const igualSol = c => c.every((x, i) => x === sol[i]);
    let guarda = 0;
    const alvo = def.dif === 'facil' ? 0.22 : 0.28;
    while (cand.length > 1 && pistas.length < 12 && guarda++ < 60) {
      // de vários palpites ao acaso (nenhum é a resposta), o que mais corta
      let melhor = null;
      for (let t = 0; t < 36; t++) {
        const p = t % 2 && cand.length > 2 ? cand[Math.floor(r() * cand.length)].slice() : [...Array(n)].map(() => Math.floor(r() * k));
        if (igualSol(p)) continue;
        const nt = nota(p, sol);
        if (nt[0] === n) continue;
        const resto = cand.filter(c => { const x = nota(p, c); return x[0] === nt[0] && x[1] === nt[1]; });
        // nem a que corta tudo de uma vez nem a que quase não corta: perto de um quarto do que sobra (mais pistas, cada
        // uma mais fácil de pensar)
        const nota_ = Math.abs(Math.log((resto.length || 0.5) / cand.length) - Math.log(alvo));
        if (resto.length < cand.length && (!melhor || nota_ < melhor.nota_)) melhor = { p, nt, resto, nota_ };
      }
      if (!melhor) break;
      pistas.push({ c: melhor.p, l: melhor.nt[0], f: melhor.nt[1] });
      cand = melhor.resto;
    }
    // sem chegar a uma só (raro), mais uma pista que entrega um símbolo no lugar
    if (cand.length > 1) {
      const p = sol.map((x, i) => (i === 0 ? x : (x + 1) % k));
      const nt = nota(p, sol);
      pistas.push({ c: p, l: nt[0], f: nt[1] });
      cand = cand.filter(c => { const x = nota(p, c); return x[0] === nt[0] && x[1] === nt[1]; });
    }
    return { pub: { n, simbolos, pistas }, estado: {}, provaCerta: sol.join(','), unica: cand.length === 1 };
  }
  function textoPistaCadeado(p, n) {
    const q = (v, um, varios) => (v === 1 ? 'um ' + um : v === 2 ? 'dois ' + varios : v === 3 ? 'três ' + varios : v + ' ' + varios);
    const partes = [];
    if (p.l) partes.push(q(p.l, 'símbolo certo no lugar certo', 'símbolos certos nos lugares certos'));
    if (p.f) partes.push(q(p.f, 'símbolo certo no lugar errado', 'símbolos certos nos lugares errados'));
    return partes.length ? partes.join(' e ') : 'nenhum símbolo certo';
  }

  // -- placas (a ordem certa; as inscrições dizem como)
  function permutacoes(n) {
    const out = [];
    const rec = (a, resto) => { if (!resto.length) { out.push(a); return; } for (let i = 0; i < resto.length; i++) rec(a.concat(resto[i]), resto.slice(0, i).concat(resto.slice(i + 1))); };
    rec([], [...Array(n).keys()]);
    return out;
  }
  // pos: a posição (0…) de cada placa na ordem
  const posDe = ordem => { const p = []; ordem.forEach((s, i) => { p[s] = i; }); return p; };
  const REGRAS = {
    antes: (p, a, b) => p[a] < p[b],
    logo: (p, a, b) => p[a] === p[b] + 1,
    lado: (p, a, b) => Math.abs(p[a] - p[b]) === 1,
    longe: (p, a, b) => Math.abs(p[a] - p[b]) > 1,
    primeira: (p, a) => p[a] === 0,
    ultima: (p, a, b, n) => p[a] === n - 1,
    naoPrimeira: (p, a) => p[a] !== 0,
    naoUltima: (p, a, b, n) => p[a] !== n - 1,
    lugar: (p, a, b) => p[a] === b,
  };
  const PESO_REGRA = { antes: 1, lado: 1, longe: 1, naoPrimeira: 1, naoUltima: 1, logo: 2, primeira: 3, ultima: 3, lugar: 4 };
  function montarPlacas(def, r) {
    const n = def.dif === 'facil' ? 4 : def.dif === 'medio' ? 5 : 6;
    const simbolos = embaralhar(ORDEM_SIMBOLOS, r).slice(0, n);
    const ordem = embaralhar([...Array(n).keys()], r);
    const pos = posDe(ordem);
    // todas as pistas verdadeiras para a ordem certa
    const todas = [];
    for (let a = 0; a < n; a++) {
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        for (const k of ['antes', 'logo']) if (REGRAS[k](pos, a, b, n)) todas.push({ k, a, b });
        if (a < b) for (const k of ['lado', 'longe']) if (REGRAS[k](pos, a, b, n)) todas.push({ k, a, b });
      }
      for (const k of ['primeira', 'ultima', 'naoPrimeira', 'naoUltima']) if (REGRAS[k](pos, a, null, n)) todas.push({ k, a, b: null });
      todas.push({ k: 'lugar', a, b: pos[a] });
    }
    const passa = (c, p) => REGRAS[c.k](p, c.a, c.b, n);
    // as fáceis primeiro (embaralhadas), as mais fortes por último
    const fila = embaralhar(todas, r).sort((x, y) => PESO_REGRA[x.k] - PESO_REGRA[y.k] + (r() - 0.5) * (def.dif === 'facil' ? 2.5 : 1.2));
    let cand = permutacoes(n).map(posDe);
    const pistas = [];
    for (const c of fila) {
      if (cand.length === 1) break;
      const resto = cand.filter(p => passa(c, p));
      if (resto.length < cand.length) { pistas.push(c); cand = resto; }
    }
    // tirar as que sobraram (sem elas, a resposta continua uma só)
    for (let i = pistas.length - 1; i >= 0; i--) {
      const sem_ = pistas.slice(0, i).concat(pistas.slice(i + 1));
      const c2 = permutacoes(n).map(posDe).filter(p => sem_.every(c => passa(c, p)));
      if (c2.length === 1) pistas.splice(i, 1);
    }
    return { pub: { n, simbolos, pistas: embaralhar(pistas, r) }, estado: { seq: [] }, provaCerta: ordem.join(',') };
  }
  function textoPistaPlacas(c, simbolos) {
    const de = i => (SIMBOLOS[simbolos[i]] || ['?', 'do ?'])[1];
    const pl = i => 'a placa ' + de(i);
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
    const ORD = ['primeira', 'segunda', 'terceira', 'quarta', 'quinta', 'sexta'];
    switch (c.k) {
      case 'antes': return cap(pl(c.a)) + ' vem antes da placa ' + de(c.b) + '.';
      case 'logo': return cap(pl(c.a)) + ' vem logo depois da placa ' + de(c.b) + '.';
      case 'lado': return cap(pl(c.a)) + ' e ' + pl(c.b) + ' ficam lado a lado.';
      case 'longe': return cap(pl(c.a)) + ' e ' + pl(c.b) + ' não ficam lado a lado.';
      case 'primeira': return cap(pl(c.a)) + ' é a primeira.';
      case 'ultima': return cap(pl(c.a)) + ' é a última.';
      case 'naoPrimeira': return cap(pl(c.a)) + ' não é a primeira.';
      case 'naoUltima': return cap(pl(c.a)) + ' não é a última.';
      case 'lugar': return cap(pl(c.a)) + ' é a ' + ORD[c.b] + '.';
    }
    return '';
  }

  // -- quebra-cabeça de imagem (trocar duas peças de lugar)
  function montarImagem(def, r, img, ar) {
    const n = def.dif === 'facil' ? 3 : def.dif === 'medio' ? 4 : 5;
    const tot = n * n;
    let p, tent = 0;
    do { p = embaralhar([...Array(tot).keys()], r); } while (p.filter((x, i) => x === i).length > Math.floor(tot * 0.3) && tent++ < 40);
    const a = num(ar, 1);
    return { pub: { n, img: urlOk(img) || null, ar: Math.round(clamp(a > 0 ? a : 1, 0.25, 4) * 1000) / 1000 }, estado: { p }, provaCerta: [...Array(tot).keys()].join(',') };
  }

  function montarPuzzle(def, img, ar) {
    def = normPuzzleDef(def);
    if (!def) return null;
    const r = mulberry(def.seed * 7919 + QTD[def.dif] * 104729 + Object.keys(PUZZLES).indexOf(def.tipo) * 13);
    const sal = salDe(mulberry(def.seed + 99991));
    let m;
    switch (def.tipo) {
      case 'cifra': m = montarCifra(def, r); break;
      case 'charada': m = montarCharada(def, r); break;
      case 'luzes': m = montarLuzes(def, r); break;
      case 'alavancas': m = montarAlavancas(def, r); break;
      case 'cadeado': m = montarCadeado(def, r); break;
      case 'placas': m = montarPlacas(def, r); break;
      case 'imagem': m = montarImagem(def, r, img, ar); break;
    }
    const certas = m.certas || [m.provaCerta];
    return { tipo: def.tipo, dif: def.dif, pub: m.pub, estado: m.estado, sal, chk: certas.map(c => chkDe(sal, c)), dicas: m.dicas || [], unica: m.unica !== false, resposta: certas[0], letras: m.letras || null };
  }
  // o documento do jogo, novo (o estado do começo, sem erros, sem ninguém ter resolvido)
  function jogoNovo(hid, h, img) {
    h = normHandout(h);
    const m = montarPuzzle(h.puzzle, img || h.img, h.imgAr);
    if (!m) return null;
    return { v: 1, hid, tipo: m.tipo, dif: m.dif, nome: h.nome, pub: m.pub, sal: m.sal, chk: m.chk, estado: m.estado, erros: 0, resolvido: null, ultimo: null };
  }
  // o documento do jogo, como chegou (vindo de qualquer lugar: os jogadores mexem nele)
  function normJogo(d) {
    d = ehObj(d) ? d : {};
    if (!Object.prototype.hasOwnProperty.call(PUZZLES, d.tipo) || !ehObj(d.pub)) return null;
    const res = ehObj(d.resolvido) && instante(d.resolvido.em) ? { por: uidOk(d.resolvido.por), em: d.resolvido.em } : null;
    const ult = ehObj(d.ultimo) && instante(d.ultimo.em) ? { por: uidOk(d.ultimo.por), em: d.ultimo.em, txt: linha(d.ultimo.txt, 120) } : null;
    return { v: 1, hid: idOk(d.hid), tipo: d.tipo, dif: Object.prototype.hasOwnProperty.call(DIF, d.dif) ? d.dif : 'medio', nome: linha(d.nome, LIM.nome),
      pub: d.pub, sal: typeof d.sal === 'string' ? d.sal.slice(0, 20) : '', chk: Array.isArray(d.chk) ? d.chk.filter(c => typeof c === 'string' && /^[0-9a-f]{32}$/.test(c)).slice(0, 12) : [],
      estado: ehObj(d.estado) ? d.estado : {}, erros: int(d.erros, 0, 0, 1e6), resolvido: res, ultimo: ult };
  }
  /* A prova que o estado de agora dá: a resposta a mandar (string), ou null (ainda não dá para conferir). Para a
     charada, o cadeado e as placas, a tentativa é o que a pessoa escreveu ou montou (vem de fora: "tentativa"). */
  function provaDoEstado(jogo, tentativa) {
    const p = jogo.pub, e = jogo.estado || {};
    switch (jogo.tipo) {
      case 'cifra': { const s = decifrar(p, e); return s.includes('_') ? null : normMensagem(s); }
      case 'luzes': return typeof e.l === 'string' ? e.l : null;
      case 'alavancas': return gradesDe(p, e);
      case 'imagem': return Array.isArray(e.p) ? e.p.join(',') : null;
      case 'charada': return tentativa == null ? null : normResposta(tentativa);
      case 'cadeado': return Array.isArray(tentativa) ? tentativa.join(',') : null;
      case 'placas': return Array.isArray(tentativa) ? tentativa.join(',') : null;
    }
    return null;
  }
  const confere = (jogo, prova) => prova != null && jogo.chk.includes(chkDe(jogo.sal, prova));

  /* ---------------- o resumo da sessão ---------------- */
  // relogios: [{ id, r }] (os de agora); nomes: { handout: id → nome }
  function resumoDaSessao(s, relogios) {
    s = normSessao(s);
    const linhas = [];
    const feitos = s.passos.filter(p => p.feito), sobra = s.passos.filter(p => !p.feito);
    linhas.push('**' + s.nome + '**' + (s.quando ? ' (' + s.quando + ')' : ''));
    if (feitos.length) { linhas.push(''); linhas.push('O que aconteceu:'); for (const p of feitos) linhas.push('- ' + (p.txt || 'Passo sem nome')); }
    const por = t => s.log.filter(e => e.t === t);
    const ent = por('entregou'), pz = por('puzzle'), rv = por('revelou');
    if (ent.length || rv.length) { linhas.push(''); linhas.push('Pistas:'); for (const e of ent.concat(rv)) linhas.push('- ' + e.txt); }
    if (pz.length) { linhas.push(''); linhas.push('Puzzles:'); for (const e of pz) linhas.push('- ' + e.txt); }
    const andaram = [];
    if (s.inicio) {
      for (const x of relogios || []) {
        const antes = Object.prototype.hasOwnProperty.call(s.inicio.relogios, x.id) ? s.inicio.relogios[x.id] : null;
        if (antes == null || antes === x.r.cheio) continue;
        andaram.push('- ' + x.r.nome + ': ' + antes + ' → ' + x.r.cheio + ' de ' + x.r.gomos + (x.r.cheio === x.r.gomos ? ' (encheu)' : ''));
      }
    }
    if (andaram.length) { linhas.push(''); linhas.push('Relógios:'); linhas.push(...andaram); }
    if (sobra.length) { linhas.push(''); linhas.push('Ficou para depois:'); for (const p of sobra) linhas.push('- ' + (p.txt || 'Passo sem nome')); }
    return linhas.join('\n').slice(0, LIM.resumo);
  }

  const api = {
    PRE, LIM, CORES, TIPOS_RELOGIO, GOMOS, PAPEIS, TIPOS_HANDOUT, DIF, PUZZLES, LIGAS, SIMBOLOS, ORDEM_SIMBOLOS, RUNAS, MENSAGENS, CHARADAS, ESTADOS_SESSAO,
    ehObj, idOk, uidOk, urlOk, linha, texto, sem, novoId, novaSemente, mulberry, md5, chkDe, resumo,
    normResposta, normMensagem,
    normLiga, normPasso, normSessao, sessaoNova, proximaPlanejada, proximoNumero, sobras,
    normRelogio, avancar, vistaDe, normVista, idVista,
    trechos, chaveTrecho, partesDoTexto, normArea, normPara, normHandout, normPuzzleDef, projetarHandout, normPista, escondidos,
    idPista, idJogo, hidDaPista, hidDoJogo,
    montarPuzzle, jogoNovo, normJogo, provaDoEstado, confere, decifrar, tocarLuz, gradesDe, nota, textoPistaCadeado, textoPistaPlacas, sortearCharada, posDe, REGRAS,
    resumoDaSessao,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.TC = window.TC || {}; window.TC.escudo = api; }
})();
