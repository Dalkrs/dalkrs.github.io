// Os lugares importantes do mundo novo (lote 126): o Vale das mil torres (a Academia), a Fortaleza da Caldeira, o
// Forte-prisão, a Clareira da Conversão e a Escola dos Pilares do Vento. Cada um é montado à mão com as peças do gerador
// das Cenas (Encontro.motor, as Ruínas, os Lugares do mundo, a Cidade grande), na página de testes das Cenas.
// Saída: cenas/mapas/<id>.webp (o fundo) e src/mapas_cidades/importantes_in.json (as paredes, os marcadores e as luzes
// de cada cena, para ir ao banco). Uso: node src/mapas_cidades/lugares_importantes.js
// Nada aqui é decisão do Bruno: é proposta do Claude (8–9 nov. 2026), para ele confirmar.
const fs = require('fs'), path = require('path');
const { open } = require('../cenas/test/lib');
const ROOT = path.join(__dirname, '..', '..');

const LUGARES = {
  vale: {
    nome: 'Vale das mil torres', estilo: 'silk', W: 120, H: 90, terreno: 'campo', marcador: 'mc_28',
    notas: {
      'A Torre de Hump': 'A torre do sábio Hump, o líder da Academia. Calmo, enigmático; está treinando o sucessor. Sabe coisas do mundo antigo.',
      'A biblioteca da Academia': 'A Academia guarda os livros (poucos sabem ler). Parte do acervo é proibida.',
      'O pátio das runas': 'Onde os aprendizes treinam a magia (o idioma antigo).',
      'O Portão da Academia': 'A única entrada da muralha branca. Guardas pedem documentos ou pedágio.',
      'Os alojamentos': 'Onde vivem os aprendizes e os mestres.',
      'O observatório': 'Os Silks olham as três luas daqui.',
      'A cúpula afundada': 'Uma cúpula de metal enterrada, de antes do reset. A Academia proíbe a entrada.',
      'O bunker selado': 'Uma porta de metal que ninguém abriu. Só uma relíquia, ou muita força.',
      'O campo das torres caídas': 'Os topos das torres de metal saindo da terra. Saqueadores de ruínas trabalham aqui à noite.',
    },
  },
  caldeira: {
    nome: 'Fortaleza da Caldeira', estilo: 'orc', W: 120, H: 90, terreno: 'campo', marcador: 'mc_29',
    notas: {
      'O salão de Blavas': 'O grande salão dos Orcs, com o trono de ossos. Os xamãs guardam segredos sobre Blavas.',
      'A boca do vulcão': 'A cratera de lava. Daqui nasce o Rio de Fogo. As erupções são um desastre que se repete.',
      'O Rio de Fogo': 'A lava que desce do vulcão e esfria até virar pedra antes do mar.',
      'O cercado das feras': 'Onde os Orcs domam as feras de guerra (bisões, lagartos, trolls).',
      'As forjas de lava': 'As forjas na beira da lava. As armas dos Furiosos de Blavas saem daqui.',
      'O Portão dos Crânios': 'A entrada da fortaleza, com as estacas e os crânios. Empalar é honra.',
      'O círculo dos xamãs': 'Os totens e o fogo dos xamãs.',
      'A arena': 'Onde os Furiosos provam a força.',
    },
  },
  prisao: {
    nome: 'Forte-prisão', estilo: 'comum', W: 110, H: 84, terreno: 'campo', marcador: 'mc_35',
    notas: {
      'O bloco das celas': 'As celas comuns. Quem a Coroa quer longe acaba aqui.',
      'A solitária': 'O poço fundo onde se jogam os que dão trabalho.',
      'A torre do diretor': 'Onde mora o diretor do forte, um homem da Coroa.',
      'A doca': 'O único jeito de chegar: de barco, pela doca.',
      'O pátio': 'Onde os presos andam uma vez por dia.',
      'O farol': 'A luz que avisa os barcos dos recifes.',
      'O portão do forte': 'A porta de ferro, do lado da doca.',
    },
  },
  clareira: {
    nome: 'Clareira da Conversão', estilo: 'antro', W: 110, H: 84, terreno: 'floresta', marcador: 'mc_51',
    notas: {
      'O círculo da Conversão': 'Os Antros e os druidas convertem os monstros para Mã\'Nizaria aqui. Às vezes dá errado, e nascem os meio-resíduo.',
      'As jaulas dos monstros': 'Os monstros que esperam a conversão. Alguns nunca se deixam domar.',
      'O cercado dos meio-resíduo': 'Os que a conversão deixou pela metade. Ninguém sabe o que fazer com eles.',
      'A árvore anciã': 'A árvore mais velha da floresta. O espírito de Mã\'Nizaria fala por ela.',
      'As casas dos druidas': 'Onde vivem os druidas e os Antros que cuidam da clareira.',
      'O lago': 'A água limpa que lava o resíduo.',
      'A trilha da floresta': 'O caminho para fora da clareira, pela floresta das raízes altas.',
    },
  },
  pilares: {
    nome: 'Pilares do Vento', estilo: 'oriental', W: 120, H: 90, terreno: 'campo', marcador: null,
    notas: {
      'O salão da escola': 'A escola da classe nova que controla o vento pela dança (separada do Samurai).',
      'O pilar da dança': 'A plataforma no alto do pilar maior, onde os mestres dançam com o vento.',
      'As passarelas': 'As pontes de corda e tábua entre os pilares. Com vendaval, ninguém passa.',
      'Os sinos de vento': 'Os sinos dizem para onde o vento vai.',
      'O cais': 'Os barcos de costa chegam aqui.',
      'A trilha da península': 'O caminho de volta para o continente.',
    },
  },
};

(async () => {
  const t = await open({ w: 1400, h: 950 });
  const { page } = t; const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.waitForTimeout(600);
  const saida = [];
  for (const id of Object.keys(LUGARES)) {
    const L = LUGARES[id];
    const r = await page.evaluate(async ({ id, L }) => {
      const T = window.__tc, MO = T.Encontro.motor, F = T.Ruinas.ferr, CG = T.CidadeGrande.ferr, E = T.Estilos;
      const W = L.W, H = L.H, seed = 116000 + id.length * 37;
      const K = MO.contexto(W, H, CG.TER_DE[L.terreno], 'ruinas', L.estilo, 'estrada', seed, L.terreno), P = K.P, r = K.r;
      P.paredes = []; P.pontos = [];
      const mc = CG.MUROS[L.estilo] || CG.MUROS.comum;
      const C = { K, P, W, H, estilo: L.estilo, terreno: L.terreno, rocha: CG.ROCHA[L.terreno], pedra: F.PEDRA[L.terreno], muro: [mc[1], mc[0], mc[2], '#2a2620'], com: { masmorra: true, mato: true }, entrada: null };
      const ponto = (x, y, n) => P.pontos.push({ x, y, n });
      const oval = CG.oval;
      if (id === 'vale') {
        // a Academia no meio, murada de branco; em volta, as ruínas de uma cidade de magitec
        const cx = W * 0.46, cy = H * 0.5, anel = oval(cx, cy, 24, 19, 14);
        const portao = CG.noAnel(anel, Math.PI / 2, cx, cy);
        CG.muralha(C, anel, { portoes: [portao], larg: 1.2, cores: ['#eeeae0', '#d8d4c8', '#8a8478', '#5e594f'] });
        ponto(portao[0], portao[1], 'O Portão da Academia');
        CG.estrada(C, [[cx, H + 2], [cx + r(-2, 2), H * 0.8], portao, [cx, cy + 4]]);
        // a torre de Hump (redonda, cúpula), a biblioteca, os alojamentos, o observatório, o pátio das runas
        CG.predioNomeado(C, 'templo', Math.round(cx - 4), Math.round(cy - 13), 9, 9, 'A Torre de Hump').forma = 'oct';
        CG.predioNomeado(C, 'templo', Math.round(cx - 18), Math.round(cy - 6), 12, 8, 'A biblioteca da Academia');
        CG.predioNomeado(C, 'casa', Math.round(cx + 8), Math.round(cy - 8), 12, 6, 'Os alojamentos');
        CG.predioNomeado(C, 'casa', Math.round(cx + 8), Math.round(cy + 1), 12, 6, 'Os alojamentos (2)');
        CG.predioNomeado(C, 'templo', Math.round(cx + 13), Math.round(cy + 9), 6, 6, 'O observatório').forma = 'oct';
        K.pinta(1, 'pracaCidade', { x: cx - 8, y: cy + 8, r: 4.5, estilo: 'silk' }); K.marcaCirc(cx - 8, cy + 8, 4.5, 1, true);
        K.zona('arcano', cx - 8, cy + 8, { r: 2.5 }); ponto(cx - 8, cy + 8, 'O pátio das runas');
        K.pinta(1, 'pracaCidade', { x: cx, y: cy + 3, r: 3.5, estilo: 'silk' }); K.marcaCirc(cx, cy + 3, 3.5, 1, true);
        for (let k = 0; k < 8; k++) K.objetoPerto(K.pick(['estatua', 'flores', 'lanterna']), cx, cy, 16, v => v === 0);
        // as ruínas de fora: a cúpula afundada, o bunker, os topos das torres
        const dx = W * 0.85, dy = H * 0.3, R = 7;
        K.pinta(2, 'cupulaRachada', { x: dx, y: dy, r: R }); K.marcaCirc(dx, dy, R, 3, true); K.visaoPoli(F.roda(dx, dy, R * 0.95, 12, 0));
        P.relevo.push({ t: 'plataforma', alt: 4, k: 'ell', x: dx - R, y: dy - R, w: R * 2, h: R * 2 });
        ponto(dx, dy, 'A cúpula afundada');
        const bx = W * 0.86, by = H * 0.76, b = [[bx - 4, by - 3], [bx + 4, by - 3], [bx + 4, by + 3], [bx - 4, by + 3]];
        K.pinta(2, 'placasMetal', { pts: b, cores: F.METAL }); K.marcaPoli(b, 3, true); K.visaoPoli(b);
        P.paredes.push({ k: 'door', x1: bx - 1, y1: by - 3, x2: bx + 1, y2: by - 3, trancada: true });
        for (const u of [-2, 2]) K.pinta(3, 'respiro', { x: bx + u, y: by + 0.5 });
        ponto(bx, by - 3.5, 'O bunker selado');
        for (let k = 0; k < 16; k++) {
          const l = K.lugar(2.4, null, 80, (x, y) => Math.hypot((x - cx) / 27, (y - cy) / 22) > 1); if (!l) continue;
          const [x, y] = l, redondo = K.rT() < 0.4, s = r(1.4, 2.6), pts = redondo ? F.roda(x, y, s, 10, 0) : E.retangulo(x, y, s * 2, s * 2, r(-0.4, 0.4));
          K.pinta(1, 'placasMetal', { pts, cores: F.METAL, escuro: true });
          F.paredeEmPedacos(Object.assign({}, C, { pedra: F.METAL }), pts.concat([pts[0]]), { pedaco: 1.6, esp: 0.4, pe: 0.5 });
          if (K.rT() < 0.3) K.luz(x, y, 2, '#5fd4e6', 0.5);
        }
        ponto(W * 0.12, H * 0.25, 'O campo das torres caídas');
        for (let k = 0; k < 30; k++) { const x = r(2, W - 2), y = r(2, H - 2); if (Math.hypot((x - cx) / 26, (y - cy) / 21) > 1) K.pinta(1, 'entulhoRuina', { x, y, r: r(0.3, 0.9), cores: F.METAL }); }
        K.foco(cx, cy);
      } else if (id === 'caldeira') {
        // o vulcão no nordeste, com a lava; o Rio de Fogo descendo; a fortaleza Orc no meio
        const vx = W * 0.82, vy = H * 0.2, vr = 12;
        const boca = oval(vx, vy, vr * 0.55, vr * 0.45, 14, K, 0.1), dentro = oval(vx, vy, vr * 0.7, vr * 0.6, 20), fora = oval(vx, vy, vr + 6, vr + 4, 20, K, 0.1);
        K.poePenhasco(fora.concat([fora[0]], dentro.slice().reverse(), [dentro[dentro.length - 1]]), 9, ['#5a4a42', '#3e322c', '#241c18']);
        K.poeLago(boca, 'lava', -2, 2); K.luz(vx, vy, 16, '#ff6a2a', 3);
        ponto(vx, vy, 'A boca do vulcão');
        const rio = K.poeRio([[vx - 6, vy + 8], [W * 0.62, H * 0.42], [W * 0.66, H * 0.7], [W * 0.6, H + 2]], 1.4, 'lava', -1);
        for (const q of [rio[Math.floor(rio.length * 0.3)], rio[Math.floor(rio.length * 0.7)]]) K.luz(q[0], q[1], 8, '#ff7a3a', 1.5);
        ponto(W * 0.64, H * 0.6, 'O Rio de Fogo');
        // a fortaleza: a paliçada de troncos e pedra (orc), o Portão dos Crânios ao sul
        const cx = W * 0.34, cy = H * 0.5, anel = oval(cx, cy, 25, 20, 14, K, 0.08), portao = CG.noAnel(anel, Math.PI / 2, cx, cy);
        CG.muralha(C, anel, { portoes: [portao], larg: 1.3 });
        for (let k = 0; k < 6; k++) K.objetoPerto(K.pick(['estacas', 'cranios']), portao[0], portao[1] + 3, 3);
        ponto(portao[0], portao[1], 'O Portão dos Crânios');
        CG.estrada(C, [[portao[0], H + 2], portao, [cx, cy + 4]]);
        CG.predioNomeado(C, 'senhor', Math.round(cx - 8), Math.round(cy - 14), 16, 10, 'O salão de Blavas');
        K.pinta(2, 'arenaCidade', { x: cx + 12, y: cy + 6, r: 5 }); K.marcaCirc(cx + 12, cy + 6, 5.5, 3, true); ponto(cx + 12, cy + 6, 'A arena');
        K.pinta(1, 'pracaCidade', { x: cx - 10, y: cy + 7, r: 4, estilo: 'orc' }); K.marcaCirc(cx - 10, cy + 7, 4, 1, true);
        for (const a of [0, 1.6, 3.2, 4.8]) K.objeto('totem', Math.floor(cx - 10 + Math.cos(a) * 3), Math.floor(cy + 7 + Math.sin(a) * 3), 0);
        K.objeto('fogueira', Math.floor(cx - 10.5), Math.floor(cy + 6.5), 0); K.luz(cx - 10, cy + 7, 6, '#ff9a5a', 2);
        ponto(cx - 10, cy + 7, 'O círculo dos xamãs');
        // o cercado das feras, fora do muro, a leste; as forjas na beira da lava
        const cf = [[cx + 28, cy - 6], [cx + 36, cy - 6], [cx + 36, cy + 6], [cx + 28, cy + 6]];
        K.pinta(2, 'cerca', { pts: cf.concat([cf[0]]) }); for (let k = 0; k < 3; k++) K.objetoPerto('jaula', cx + 32, cy, 3);
        ponto(cx + 32, cy, 'O cercado das feras');
        for (let k = 0; k < 3; k++) { const q = rio[Math.floor(rio.length * (0.35 + k * 0.15))]; K.objetoPerto(K.pick(['bigorna', 'fornalha']), q[0] - 3, q[1], 2); }
        ponto(rio[Math.floor(rio.length * 0.5)][0] - 3, rio[Math.floor(rio.length * 0.5)][1], 'As forjas de lava');
        CG.casas(C, anel, { passo: 5, vazio: 0.25, tam: [[5, 4], [6, 4], [4, 5], [6, 5]] });
        for (let k = 0; k < 14; k++) K.arvore(r(2, W * 0.5), r(2, H - 2), r(0.8, 1.4), 'morta');
        K.foco(cx, cy);
      } else if (id === 'prisao') {
        // a ilha no meio do mar; o forte de pedra com as torres nos cantos; a doca ao sul
        const cx = W / 2, cy = H * 0.46, ilha = oval(cx, cy, 34, 26, 26, K, 0.15);
        // o mar: o retângulo com o buraco da ilha (o contorno vai e volta pela ilha)
        { let iL = 0; ilha.forEach((q, i) => { if (q[0] < ilha[iL][0]) iL = i; }); const yL = ilha[iL][1], volta = ilha.slice(iL).concat(ilha.slice(0, iL)).reverse();
          const xL = ilha[iL][0], ida = [], volta2 = []; for (let x = -20; x < xL; x += 1) { ida.push([x, yL + 0.02]); volta2.unshift([x, yL - 0.02]); }
          K.poeLago([[-20, yL - 0.02], [-20, -20], [W + 20, -20], [W + 20, H + 20], [-20, H + 20]].concat(ida, volta, volta2), 'agua', -3); }
        P.relevo.push({ t: 'plataforma', alt: 2, k: 'poly', pts: ilha });
        const f = [[cx - 16, cy - 13], [cx + 16, cy - 13], [cx + 16, cy + 11], [cx - 16, cy + 11]], portao = [cx, cy + 11];
        CG.muralha(C, f, { portoes: [portao], larg: 1.4 });
        ponto(portao[0], portao[1], 'O portão do forte');
        CG.predioNomeado(C, 'quartel', Math.round(cx - 13), Math.round(cy - 10), 18, 6, 'O bloco das celas');
        CG.predioNomeado(C, 'senhor', Math.round(cx + 7), Math.round(cy - 10), 7, 7, 'A torre do diretor').forma = 'oct';
        CG.predioNomeado(C, 'casa', Math.round(cx + 6), Math.round(cy + 1), 8, 5, 'O quartel da guarda');
        K.pinta(1, 'pracaCidade', { x: cx - 5, y: cy + 3, r: 4, estilo: 'comum' }); K.marcaCirc(cx - 5, cy + 3, 4, 1, true); ponto(cx - 5, cy + 3, 'O pátio');
        K.pinta(2, 'escadaDesce', { x: cx - 12, y: cy + 4, w: 2, h: 2, lado: 'n', cores: F.PEDRA.campo }); P.relevo.push({ t: 'fosso', alt: -4, k: 'rect', x: cx - 12, y: cy + 4, w: 2, h: 2 });
        ponto(cx - 11, cy + 5, 'A solitária');
        for (let k = 0; k < 3; k++) K.objetoPerto('grilhoes', cx - 5, cy + 3, 3);
        // a doca e o barco, o farol na ponta leste
        const dy = cy + 24; K.pinta(1, 'pier', { x: cx - 1.5, y: cy + 14, w: 3, h: 14 }); K.marcaPoli([[cx - 1.5, cy + 14], [cx + 1.5, cy + 14], [cx + 1.5, cy + 28], [cx - 1.5, cy + 28]], 1, true);
        K.pinta(2, 'barco', { x: cx + 4, y: dy, L: 6, ang: Math.PI / 2 }); ponto(cx, dy, 'A doca');
        CG.estrada(C, [[cx, cy + 15], portao]);
        CG.predioNomeado(C, 'torre', Math.round(cx + 27), Math.round(cy - 4), 3, 3, 'O farol'); K.luz(cx + 28.5, cy - 2.5, 9, '#ffd27a', 2);
        for (let k = 0; k < 10; k++) K.pedraGrandeLivre(r(0.8, 1.6), C.rocha, (x, y) => MO.dentroPoli(ilha, x, y) && !(Math.abs(x - cx) < 19 && Math.abs(y - cy) < 15));
        K.foco(cx, cy);
      } else if (id === 'clareira') {
        // a floresta das raízes altas em volta; a clareira no meio, com o círculo, a árvore anciã, o lago e as casas
        const cx = W / 2, cy = H / 2, R = 26;
        for (let k = 0; k < 140; k++) { const x = r(1, W - 1), y = r(1, H - 1); if (Math.hypot((x - cx) / (R + 4), (y - cy) / (R * 0.8 + 3)) < 1) continue; K.arvore(x, y, r(1.4, 2.6), K.rT() < 0.3 ? 'selva' : undefined); }
        K.pinta(1, 'pracaCidade', { x: cx, y: cy, r: 8, estilo: 'antro' }); K.marcaCirc(cx, cy, 8, 1, true);
        for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, x = cx + Math.cos(a) * 7, y = cy + Math.sin(a) * 7, ret = E.retangulo(x, y, 1, 1.6, a); K.pinta(2, 'menir', { pts: ret, x, y, cores: C.rocha }); K.marcaPoli(ret, 3, true); K.visaoPoli(ret); }
        K.objeto('altar', Math.floor(cx - 0.5), Math.floor(cy - 0.5), 0, () => true); K.zona('cura', cx, cy, { r: 4 }); K.luz(cx, cy, 8, '#b8f0a0', 2);
        ponto(cx, cy, 'O círculo da Conversão');
        const ax = cx - 16, ay = cy - 10; K.arvore(ax, ay, 5, undefined); K.marcaCirc(ax, ay, 2.5, 3, true); ponto(ax, ay, 'A árvore anciã');
        K.poeLago(oval(cx + 16, cy + 10, 6, 4.5, 14, K, 0.15), 'agua', -1.5); ponto(cx + 16, cy + 10, 'O lago');
        const jx = cx + 15, jy = cy - 12; for (let k = 0; k < 5; k++) K.objeto('jaula', Math.floor(jx + (k % 3) * 2.5), Math.floor(jy + Math.floor(k / 3) * 2.6), 0, () => true);
        ponto(jx + 2, jy + 1, 'As jaulas dos monstros');
        const pc = [[cx - 20, cy + 8], [cx - 12, cy + 8], [cx - 12, cy + 15], [cx - 20, cy + 15]];
        K.pinta(2, 'cerca', { pts: pc.concat([pc[0]]) }); P.paredes.push(...pc.map((p, i) => { const q = pc[(i + 1) % 4]; return { k: 'mureta', x1: p[0], y1: p[1], x2: q[0], y2: q[1] }; }));
        ponto(cx - 16, cy + 11.5, 'O cercado dos meio-resíduo');
        for (const [x, y] of [[cx - 4, cy - 19], [cx + 4, cy - 19], [cx + 21, cy - 2], [cx + 2, cy + 15], [cx - 24, cy - 1]]) { const k2 = K.predio({ tipo: 'casa', x: Math.round(x - 2.5), y: Math.round(y - 2.5), w: 5, h: 5, lado: 's', aberto: false }); k2.soDesenho = true; }
        ponto(cx, cy - 19, 'As casas dos druidas');
        K.poeCaminho([[cx, H + 2], [cx + r(-3, 3), cy + 22], [cx, cy + 8]], 'trilha'); ponto(cx, H - 4, 'A trilha da floresta');
        K.foco(cx, cy);
      } else if (id === 'pilares') {
        // a península entrando no mar (pelo sul), os pilares de pedra com as plataformas, as passarelas
        const pen = [[W * 0.38, H + 2], [W * 0.34, H * 0.75], [W * 0.3, H * 0.55], [W * 0.36, H * 0.35], [W * 0.48, H * 0.28], [W * 0.6, H * 0.34], [W * 0.66, H * 0.55], [W * 0.62, H * 0.78], [W * 0.6, H + 2]];
        K.poeLago([[-20, -20], [W + 20, -20], [W + 20, H + 20], [pen[pen.length - 1][0], H + 20]].concat(pen.slice().reverse(), [[pen[0][0], H + 20], [-20, H + 20]]), 'agua', -3);
        P.relevo.push({ t: 'plataforma', alt: 2, k: 'poly', pts: pen });
        // os pilares no mar, cada um com a plataforma no alto
        const pil = [[W * 0.5, H * 0.14, 4.2], [W * 0.26, H * 0.22, 3], [W * 0.74, H * 0.2, 3.2], [W * 0.2, H * 0.48, 2.6], [W * 0.8, H * 0.5, 2.8], [W * 0.74, H * 0.75, 2.4]];
        for (const [x, y, rr] of pil) { K.poePenhasco(oval(x, y, rr, rr * 0.9, 12, K, 0.1), 14, C.rocha, true); K.pinta(2, 'plataformaPedra', { pts: oval(x, y, rr * 0.7, rr * 0.62, 10) }); }
        ponto(pil[0][0], pil[0][1], 'O pilar da dança'); K.zona('vento', pil[0][0], pil[0][1], { r: 3 });
        // as passarelas: da península até cada pilar, e entre os pilares
        const borda = [W * 0.48, H * 0.3];
        K.poePassarela([borda, [pil[0][0], pil[0][1] + pil[0][2] * 0.6]], 1.2, 14);
        K.poePassarela([[W * 0.36, H * 0.36], [pil[1][0] + 2, pil[1][1] + 2]], 1, 12);
        K.poePassarela([[W * 0.6, H * 0.35], [pil[2][0] - 2, pil[2][1] + 2]], 1, 12);
        K.poePassarela([[W * 0.31, H * 0.5], [pil[3][0] + 2, pil[3][1]]], 1, 10);
        K.poePassarela([[W * 0.66, H * 0.52], [pil[4][0] - 2, pil[4][1]]], 1, 10);
        ponto((borda[0] + pil[0][0]) / 2, (borda[1] + pil[0][1]) / 2, 'As passarelas');
        // a escola no meio da península, os sinos, o cais
        CG.predioNomeado(C, 'templo', Math.round(W * 0.43), Math.round(H * 0.42), 12, 9, 'O salão da escola');
        K.pinta(1, 'pracaCidade', { x: W * 0.49, y: H * 0.62, r: 4.5, estilo: 'oriental' }); K.marcaCirc(W * 0.49, H * 0.62, 4.5, 1, true);
        for (let k = 0; k < 6; k++) K.objetoPerto('lanterna', W * 0.49, H * 0.62, 5);
        ponto(W * 0.49, H * 0.62, 'Os sinos de vento');
        for (const [x, y] of [[W * 0.4, H * 0.7], [W * 0.56, H * 0.7], [W * 0.42, H * 0.82], [W * 0.55, H * 0.83]]) { const k2 = K.predio({ tipo: 'casa', x: Math.round(x - 2.5), y: Math.round(y - 2), w: 5, h: 4, lado: 's', aberto: false }); k2.soDesenho = true; }
        K.pinta(1, 'pier', { x: W * 0.64, y: H * 0.68, w: 9, h: 2 }); K.pinta(2, 'barco', { x: W * 0.72, y: H * 0.72, L: 5, ang: 0 }); ponto(W * 0.68, H * 0.69, 'O cais');
        K.poeCaminho([[W * 0.49, H + 2], [W * 0.49, H * 0.78], [W * 0.49, H * 0.52]], 'trilha'); ponto(W * 0.49, H - 4, 'A trilha da península');
        K.foco(W / 2, H / 2);
      }
      const rV = (n => () => { n = (n * 1103515245 + 12345) & 0x7fffffff; return n / 0x7fffffff; })(seed);
      if (id !== 'clareira') { P.dens = () => 0.4; MO.vegetacao(K, rV); delete P.dens; }
      P.marcas = {};
      const p = Object.assign(P, { v: 1, lugar: 'importante', seed, sT: seed, tamanho: 'grande', entradas: [], comMarcas: true, occ: Array.from(K.occ) });
      // o fundo: 24 px por quadrado
      const cv = MO.pintar(p, 24);
      const url = cv.toDataURL('image/webp', 0.86);
      // a cena (as paredes, os marcadores, as luzes, as formas, as zonas)
      const sc = T.newScene(L.nome);
      sc.cols = W; sc.rows = H;
      MO.montar(sc, p, sc.cell, { relevo: true });
      for (const tk of sc.tokens) if (tk.prop === 'interesse' && L.notas[tk.name]) tk.notes = L.notas[tk.name];
      return { url, w: cv.width, h: cv.height, cell: sc.cell, walls: sc.walls, tokens: sc.tokens, lights: sc.lights, shapes: sc.shapes, effects: sc.effects, bgColor: (T.Paisagem.PAL[p.pal] || T.Paisagem.PAL.campo).base };
    }, { id, L });
    const b64 = r.url.split(',')[1];
    fs.writeFileSync(path.join(ROOT, 'cenas', 'mapas', id + '.webp'), Buffer.from(b64, 'base64'));
    delete r.url;
    saida.push(Object.assign({ id, cena: 'cena_' + id, nome: L.nome, marcador: L.marcador, W: L.W, H: L.H }, r));
    console.log(id, r.w + 'x' + r.h, 'paredes', r.walls.length, 'tokens', r.tokens.length, 'luzes', r.lights.length);
  }
  fs.writeFileSync(path.join(__dirname, 'importantes_in.json'), JSON.stringify(saida));
  console.log('erros:', errs.join(' | ') || 'nenhum');
  await t.close();
})().catch(e => { console.error(e); process.exit(1); });
