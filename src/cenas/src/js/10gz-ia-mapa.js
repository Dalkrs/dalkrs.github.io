/* ---------------------------------------------------------------
   10gz. DESCREVER COM A IA (lote 150) — o "texto para o mapa" da janela "Gerar um lugar…".
   O mestre escreve o lugar do jeito dele ("uma casa nobre de um andar, cozinha, 2 quartos, quintal com piscina…"); o
   site manda para a função `ia` do servidor (a chave da API fica lá) as instruções e o formato da resposta (uma
   "ferramenta" com o esquema), e a IA devolve a ficha: o lugar da janela que mais combina e as escolhas dele — no Sob
   medida, o terreno, a casa, as salas de cada andar e os anexos do quintal; no Interior, o prédio; na Furtividade, o
   tamanho e os guardas — mais o estilo, a hora, o clima, o nome e as notas só para o mestre (o que é segredo, ideias) e
   o que o gerador ainda não sabe fazer. A janela aplica a ficha (as escolhas ficam editáveis) e gera.
   --------------------------------------------------------------- */
const IaMapa = (() => {
  const OUTROS = { vila: 'Vilarejo', cidade: 'Cidade', cidadeGrande: 'Cidade grande (a capital)', tribo: 'Aldeia de uma tribo', porto: 'Porto com o mar', encontro: 'Encontro na estrada ou na natureza (combate a céu aberto)',
    regiao: 'Região livre (um pedaço de natureza: bioma, rio, caminho)', lago: 'Lago', praia: 'Praia', penhasco: 'Penhasco', desfiladeiro: 'Desfiladeiro', castelo: 'Castelo (de fora)',
    ruinas: 'Ruínas', cemiterio: 'Cemitério', mundo116: 'Lugares do mundo (templo, santuário…)', masmorra: 'Masmorra (níveis de caverna ou de construção)', catacumbas: 'Catacumbas', crime: 'Cena do crime', arena: 'Arena' };
  const FUR = () => Furtividade.IDS.map(id => [id, Furtividade.NOMES[id]]);
  const salasAndar = () => Furtividade.catF('sobmedida').salas;
  const salasBase = () => Furtividade.catF('sobmedida').base;

  function pedido() {
    const lugares = [['sobmedida', 'Sob medida: uma casa (simples, boa ou nobre) com o terreno em volta, as salas que o texto pedir, os andares, o porão e os anexos do quintal. A escolha certa para casas, sítios, chácaras e propriedades descritas com detalhe.'],
      ['interior', 'Interior: só o lado de dentro de um prédio pronto (casa, loja, taverna, templo, casa do senhor, quartel…), sem terreno.']]
      .concat(FUR().map(([id, n]) => [id, 'Furtividade: ' + n + ' (com guardas em ronda, para uma missão de infiltração).']))
      .concat(Object.entries(OUTROS).map(([id, n]) => [id, n]));
    const ids = lugares.map(l => l[0]);
    const anexos = Object.entries(Furtividade.ANEXOS).map(([k, a]) => k + ' (' + a.n + ')').join(', ');
    const nomeSala = x => PlantaAndares.NOMES[x] || x;
    const sistema = [
      'Você monta mapas de RPG de mesa para um gerador de cenas (um VTT em português). O mestre descreve um lugar; você escolhe, entre os geradores que existem, o que melhor faz esse lugar e preenche a ficha dele, chamando a ferramenta "ficha_do_lugar".',
      'Regras:',
      '- Use só os valores das listas do esquema. O que o texto pede e o gerador não sabe fazer vai em "nao_deu" (frases curtas, em português), nunca inventado na ficha.',
      '- Segredos, ideias de enredo e detalhes que o mapa não mostra (o que tem na sala misteriosa, quem mora lá) vão em "notas_mestre", curtas, em blocos simples.',
      '- Casas e propriedades com cômodos, jardim, piscina, estufas etc.: use "sobmedida". Só o interior de um prédio comum: "interior". Missão de se infiltrar com guardas: um dos de furtividade, ou "sobmedida" com guardas, se a casa for muito específica.',
      '- No sobmedida: "terreo" é a lista das salas do térreo (sem o corredor); repita "quarto" para cada quarto. "porte": simples, boa ou nobre (pampa, rica, bem ajeitada = nobre ou boa). "anexos": o que fica no quintal, com a quantidade. "guardas": nenhum, se o texto não falar de guardas.',
      '- "andares" (para sobmedida, interior e furtividade): "cima" é uma lista de andares acima do térreo, de baixo para cima; "porao" é uma lista de porões, do mais alto ao mais fundo; cada andar é a lista das salas dele, e a PRIMEIRA sala é onde a escada chega (use "sala" no andar de cima e "adega" ou "deposito" no porão). "base" são as salas de uma base secreta escondida no porão (precisa de pelo menos 1 porão); use "secreta" para uma "sala secreta" sem uso definido.',
      '- "hora": dia, entardecer, noite ou breu; "estilo": o povo/arquitetura (comum, se não disser).',
      '- O nome é curto, em português, como o título da cena.',
      '- (lote 157) "planta": desenhe o lugar, em porcentagens (0 a 100). Para sobmedida, mansao e casarao: "casa" é onde a casa fica no terreno (x da esquerda, y de cima; o portão e a rua ficam embaixo; deixe uns 8% de margem e espaço para o quintal e os anexos); "salas" são os cômodos do térreo, em porcentagem DA CASA (0 a 100 dentro dela), sem se sobrepor; o que sobrar dentro da casa vira corredor — deixe uma faixa livre de uns 15% ligando os cômodos. "agua", "mata", "patio" e "vazio" são retângulos no terreno (o lago, o bosque, o pátio de pedra, uma área sem nada), também em porcentagem do terreno. Para os outros lugares, só "agua", "mata", "patio" e "vazio", se o texto pedir. Sem desenho no texto, faça uma planta que faça sentido.',
      'Lugares: ' + lugares.map(([id, n]) => id + ' = ' + n).join(' | '),
      'Salas (papéis): ' + salasAndar().map(x => x + ' = ' + nomeSala(x)).join('; '),
      'Anexos do quintal: ' + anexos,
    ].join('\n');
    const enumS = { type: 'string', enum: salasAndar() };
    const andar = { type: 'array', items: enumS, maxItems: 12 };
    const ret = { type: 'object', required: ['x', 'y', 'w', 'h'], properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } } };
    const ferramenta = {
      name: 'ficha_do_lugar',
      description: 'A ficha do lugar para o gerador de mapas.',
      input_schema: {
        type: 'object', required: ['lugar', 'nome'],
        properties: {
          lugar: { type: 'string', enum: ids },
          nome: { type: 'string', description: 'O nome da cena, curto.' },
          estilo: { type: 'string', enum: Estilos.LISTA.map(e => e[0]) },
          hora: { type: 'string', enum: TONES.map(t => t.id) },
          clima: { type: 'string', enum: WEATHERS.map(w => w[0]) },
          tema: { type: 'string', enum: Temas.LISTA.map(t => t.id), description: 'Os objetos de um tema para espalhar pela cena, só se o texto pedir: ' + Temas.LISTA.map(t => t.id + ' = ' + t.n).join('; ') + '.' },
          sobmedida: { type: 'object', properties: {
            terreno: { type: 'string', enum: ['pequeno', 'medio', 'grande'] },
            muro: { type: 'boolean' },
            porte: { type: 'string', enum: Furtividade.PORTES.map(p => p[0]) },
            terreo: { type: 'array', items: { type: 'string', enum: Furtividade.SALAS_TERREO.filter(x => salasAndar().includes(x)) }, maxItems: 12 },
            anexos: { type: 'array', items: { type: 'object', required: ['t'], properties: { t: { type: 'string', enum: Object.keys(Furtividade.ANEXOS) }, n: { type: 'integer', minimum: 1, maximum: 4 } } } },
            guardas: { type: 'string', enum: ['nenhum', 'poucos', 'normal', 'muitos'] } } },
          dificuldade: { type: 'string', enum: ['facil', 'medio', 'dificil', 'muito'], description: 'A dificuldade da infiltração (sobmedida com guardas), só se o texto disser.' },
          andares: { type: 'object', properties: {
            cima: { type: 'array', items: andar, maxItems: 5 }, porao: { type: 'array', items: andar, maxItems: 2 },
            base: { type: 'array', items: { type: 'string', enum: salasBase() }, maxItems: 8 } } },
          interior: { type: 'object', properties: { tipo: { type: 'string', enum: Object.keys(Interior.PLANTAS).filter(k => !Interior.PLANTAS[k].so) }, tamanho: { type: 'string', enum: ['pequeno', 'medio', 'grande'] } } },
          furtividade: { type: 'object', properties: { tamanho: { type: 'string', enum: ['pequeno', 'medio', 'grande'] }, guardas: { type: 'string', enum: ['poucos', 'normal', 'muitos'] }, dificuldade: { type: 'string', enum: ['facil', 'medio', 'dificil', 'muito'], description: 'Só se o texto disser o quanto a missão é difícil.' } } },
          planta: { type: 'object', description: 'A planta, em porcentagens (0 a 100).', properties: {
            casa: ret, salas: { type: 'array', maxItems: 12, items: Object.assign({}, ret, { properties: Object.assign({}, ret.properties, { uso: { type: 'string', enum: salasAndar() } }) }) },
            agua: { type: 'array', items: ret, maxItems: 4 }, mata: { type: 'array', items: ret, maxItems: 4 }, patio: { type: 'array', items: ret, maxItems: 4 }, vazio: { type: 'array', items: ret, maxItems: 4 } } },
          notas_mestre: { type: 'string', description: 'Só o mestre lê. Curto.' },
          nao_deu: { type: 'array', items: { type: 'string' }, maxItems: 8 },
        },
      },
    };
    return { sistema, ferramenta };
  }

  // os andares da IA → a escolha de andares (PlantaAndares)
  function andaresDe(a) {
    if (!a || typeof a !== 'object') return null;
    const cima = Array.isArray(a.cima) ? a.cima.filter(Array.isArray).slice(0, 5) : [], porao = Array.isArray(a.porao) ? a.porao.filter(Array.isArray).slice(0, 2) : [];
    const base = Array.isArray(a.base) ? a.base.filter(x => typeof x === 'string') : [];
    const out = { cima: cima.length, porao: porao.length || (base.length ? 1 : 0), base: base.length > 0, temas: {}, salas: {} };
    cima.forEach((l, i) => { if (l.length) out.salas[i + 1] = l.slice(); });
    porao.forEach((l, i) => { if (l.length) out.salas[-(i + 1)] = l.slice(); });
    if (base.length) out.salas.base = base;
    return out;
  }
  /* (lote 157) a planta da IA (em porcentagens), conferida */
  function plantaDe(v) {
    if (!v || typeof v !== 'object') return null;
    const r = q => (q && typeof q === 'object' && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(Number(q[k]))) ? { x: clamp(Number(q.x), 0, 100), y: clamp(Number(q.y), 0, 100), w: clamp(Number(q.w), 1, 100), h: clamp(Number(q.h), 1, 100) } : null);
    const l = (a, n) => (Array.isArray(a) ? a.map(r).filter(Boolean).slice(0, n) : []);
    const out = { casa: r(v.casa), salas: (Array.isArray(v.salas) ? v.salas : []).map(q => { const x = r(q); if (x && typeof q.uso === 'string' && salasAndar().includes(q.uso)) x.uso = q.uso; return x; }).filter(Boolean).slice(0, 12), agua: l(v.agua, 4), mata: l(v.mata, 4), patio: l(v.patio, 4), vazio: l(v.vazio, 4) };
    return out.casa || out.agua.length || out.mata.length || out.patio.length || out.vazio.length ? out : null;
  }
  // a planta → as zonas do gerador (em quadrados), num terreno W × H; casa: só onde o lugar tem casa
  function zonasDe(pl, W, H, comCasa) {
    if (!pl) return [];
    const Q = q => ({ x: Math.round(q.x / 100 * W), y: Math.round(q.y / 100 * H), w: Math.max(2, Math.round(q.w / 100 * W)), h: Math.max(2, Math.round(q.h / 100 * H)) });
    const out = [];
    if (comCasa && pl.casa) {
      const c = Object.assign({ k: 'casa' }, Q(pl.casa));
      out.push(c);
      for (const q of pl.salas) { const s = { k: 'sala', x: c.x + Math.round(q.x / 100 * c.w), y: c.y + Math.round(q.y / 100 * c.h), w: Math.max(2, Math.round(q.w / 100 * c.w)), h: Math.max(2, Math.round(q.h / 100 * c.h)) }; if (q.uso) s.papel = q.uso; out.push(s); }
    }
    for (const k of ['agua', 'mata', 'patio', 'vazio']) for (const q of pl[k]) out.push(Object.assign({ k }, Q(q)));
    return out;
  }
  /* A ficha da IA → { lugar, op (as escolhas do lugar), comum ({ estilo, hora, clima }), nome, notas, fora } */
  function traduzir(d) {
    d = d && typeof d === 'object' ? d : {};
    const and = andaresDe(d.andares), comum = {};
    if (Estilos.LISTA.some(e => e[0] === d.estilo)) comum.estilo = d.estilo;
    if (TONES.some(t => t.id === d.hora)) comum.hora = d.hora;
    if (WEATHERS.some(w => w[0] === d.clima)) comum.clima = d.clima;
    if (Temas.tema(d.tema)) comum.tema = d.tema;      // (lote 158)
    const notas = typeof d.notas_mestre === 'string' ? d.notas_mestre.trim().slice(0, 1200) : '';
    const fora = Array.isArray(d.nao_deu) ? d.nao_deu.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim().slice(0, 120)).slice(0, 8) : [];
    let op = null;
    if (d.lugar === 'sobmedida') op = Object.assign({ spec: d.sobmedida || {}, and, notas, fora, titulo: 'ia' }, typeof d.dificuldade === 'string' ? { dific: d.dificuldade } : null);
    else if (d.lugar === 'interior') op = Object.assign({}, d.interior && d.interior.tipo ? { tipo: d.interior.tipo } : null, d.interior && d.interior.tamanho ? { tam: d.interior.tamanho } : null, and ? { and } : null);
    else if (Furtividade.IDS.includes(d.lugar)) { const fu = Object.assign({}, d.furtividade || {}); if (fu.dificuldade) { fu.dific = fu.dificuldade; delete fu.dificuldade; } op = Object.assign(fu, and ? { and } : null); }
    const planta = plantaDe(d.planta);
    return { planta, lugar: typeof d.lugar === 'string' ? d.lugar : 'sobmedida', op, comum, nome: typeof d.nome === 'string' ? d.nome.trim().slice(0, 60) : '', notas, fora };
  }
  // chama a IA (pela casca, que fala com o servidor)
  async function pedir(texto) {
    const T = window.TC;
    if (!T || !T.ia || !T.ia.pedir) throw new Error('A IA funciona com a mesa aberta no site (pela casca).');
    const { sistema, ferramenta } = pedido();
    const r = await T.ia.pedir({ acao: 'mapa', texto, sistema, ferramenta });
    if (!r || !r.dados) throw new Error('A IA não devolveu o lugar. Tente descrever de outro jeito.');
    return Object.assign(traduzir(r.dados), { restam: r.restam });
  }
  return { pedido, traduzir, pedir, andaresDe, plantaDe, zonasDe };
})();
