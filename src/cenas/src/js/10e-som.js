/* ---------------------------------------------------------------
   10e. SOM — os sons da vez (lote 7), feitos no próprio navegador, sem arquivo nenhum
   O gongo na vez de um aliado (os personagens dos jogadores e os NPCs do lado deles), o tambor na de um inimigo, dois
   toques claros no "Sua vez!" do jogador e o sino grave com tambor da rodada nova. Seguem a chave de som da mesa ao
   vivo ("Som ao rolar", tinycats:som, em cada aparelho): desligada, nada toca.
   --------------------------------------------------------------- */
const Som = (() => {
  let ac = null, ultimo = null, vezes = 0;
  const ligado = () => { try { return localStorage.getItem('tinycats:som') === '1'; } catch (e) { return false; } };
  function contexto() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { ac = null; }
    return ac;
  }
  // um parcial: um oscilador com ataque curto e queda exponencial
  function tom(a, t0, freq, tipo, vol, dur, ataque) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (ataque || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // o gongo: parciais que não são múltiplos uns dos outros, cada um caindo no seu tempo
  function gongo(a, t0, base, vol) {
    for (const [m, v, d] of [[1, 1, 2.6], [2.03, 0.5, 2.1], [2.74, 0.34, 1.7], [3.9, 0.2, 1.2], [5.4, 0.1, 0.9]]) tom(a, t0, base * m, 'sine', vol * v, d, 0.015);
  }
  // a batida do tambor: um tom que cai depressa (150 → 55 Hz) e um sopro curto de ruído abafado
  function tambor(a, t0, vol) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(55, t0 + 0.25);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + 0.5);
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * 0.12), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900; gn.gain.value = vol * 0.5;
    s.connect(f); f.connect(gn); gn.connect(a.destination); s.start(t0);
  }
  // qual: 'aliado' | 'inimigo' | 'sua' | 'rodada' → tocou?
  function tocar(qual) {
    if (!ligado()) return false;
    const a = contexto();
    if (!a) return false;
    try { if (a.state === 'suspended') a.resume(); } catch (e) { /* o navegador ainda não deixou tocar */ }
    try {
      const t0 = a.currentTime + 0.02;
      if (qual === 'inimigo') { tambor(a, t0, 0.6); tambor(a, t0 + 0.22, 0.45); }
      else if (qual === 'sua') { gongo(a, t0, 262, 0.28); gongo(a, t0 + 0.16, 392, 0.18); }
      else if (qual === 'rodada') { gongo(a, t0, 98, 0.36); tambor(a, t0, 0.32); }
      else gongo(a, t0, 196, 0.3);
    } catch (e) { return false; }
    ultimo = qual; vezes++;
    return true;
  }
  /* (lote 28) Os sons dos avisos da cena, só no aparelho do mestre (quem chama confere): um por tipo, curtos e
     baixos — a zona (um sino duplo, suave), a condição (dois toques de madeira) e o urgente (três batidas, para o HP
     abaixo de zero, a queda, a armadilha, os reforços). Valem a chave e o volume deste aparelho (o ícone do sino, no
     alto das Cenas: um clique liga e desliga; segurar abre o volume). O mesmo tipo não toca de novo antes de um
     segundo (vários avisos juntos fazem um som só). */
  const AV_KEY = 'tinycats:som-avisos', AV_VOL = 'tinycats:som-avisos-vol', TIPOS_AV = ['zona', 'condicao', 'urgente'];
  let ultimoAviso = null, vezesAviso = 0;
  const ultimoDe = {};
  const avisosLigados = () => { try { return localStorage.getItem(AV_KEY) !== '0'; } catch (e) { return true; } };
  function volumeAvisos() {
    try { const v = localStorage.getItem(AV_VOL); return v == null || v === '' || !isFinite(Number(v)) ? 70 : Math.max(0, Math.min(100, Math.round(Number(v)))); } catch (e) { return 70; }
  }
  function ligarAvisos(on) { try { localStorage.setItem(AV_KEY, on ? '1' : '0'); } catch (e) { /* sem armazenamento: vale até recarregar */ } }
  function volumeDosAvisos(v) { try { localStorage.setItem(AV_VOL, String(Math.max(0, Math.min(100, Math.round(Number(v) || 0))))); } catch (e) { /* idem */ } }
  // a batida de madeira: um triângulo que cai depressa, com o corpo uma oitava abaixo
  function madeira(a, t0, f, vol) { tom(a, t0, f, 'triangle', vol, 0.28, 0.004); tom(a, t0, f / 2, 'sine', vol * 0.6, 0.22, 0.004); }
  // o sino pequeno: dois parciais claros
  function sino(a, t0, f, vol) { tom(a, t0, f, 'sine', vol, 1.1, 0.008); tom(a, t0, f * 2.76, 'sine', vol * 0.25, 0.6, 0.008); }
  // tipo: 'zona' | 'condicao' | 'urgente'. teste: toca mesmo desligado e sem esperar (o "Ouvir" do volume) → tocou?
  function aviso(tipo, teste) {
    if (!TIPOS_AV.includes(tipo)) tipo = 'condicao';
    if (!teste && !avisosLigados()) return false;
    const vol = volumeAvisos() / 100;
    if (!(vol > 0)) return false;
    const agora = Date.now();
    if (!teste && ultimoDe[tipo] && agora - ultimoDe[tipo] < 1000) return false;
    ultimoDe[tipo] = agora;
    ultimoAviso = tipo; vezesAviso++;
    const a = contexto();
    if (!a) return true;
    try { if (a.state === 'suspended') a.resume(); } catch (e) { /* o navegador ainda não deixou tocar */ }
    try {
      const t0 = a.currentTime + 0.02, v = 0.5 * vol;
      if (tipo === 'zona') { sino(a, t0, 784, v * 0.45); sino(a, t0 + 0.15, 1046, v * 0.35); }
      else if (tipo === 'urgente') { for (let k = 0; k < 3; k++) madeira(a, t0 + k * 0.15, 880, v * 0.7); }
      else { madeira(a, t0, 587, v * 0.6); madeira(a, t0 + 0.1, 440, v * 0.5); }
    } catch (e) { /* sem som: o aviso escrito continua */ }
    return true;
  }
  /* (lote 47) O som de um momento preparado: o mestre solta, e cada aparelho com o som da mesa ligado toca o seu. */
  function ruido(a, t0, dur, freq, vol) {
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(a.destination); s.start(t0);
  }
  let ultimoMomento = null, vezesMomento = 0;
  function momento(k) {
    ultimoMomento = k; vezesMomento++;
    if (!ligado()) return false;
    const a = contexto();
    if (!a) return true;
    try { if (a.state === 'suspended') a.resume(); } catch (e) { /* o navegador ainda não deixou tocar */ }
    try {
      const t0 = a.currentTime + 0.03;
      if (k === 'trovao') { ruido(a, t0, 0.35, 2400, 0.5); ruido(a, t0 + 0.12, 2.8, 260, 0.9); }
      else if (k === 'gongo') gongo(a, t0, 98, 0.32);
      else if (k === 'tambores') { for (const [dt, v] of [[0, 0.7], [0.3, 0.5], [0.6, 0.7], [0.75, 0.5], [1.05, 0.8], [1.5, 0.7], [1.8, 0.5], [2.1, 0.9]]) tambor(a, t0 + dt, v * 0.6); }
      else if (k === 'sino') { for (let n = 0; n < 3; n++) { tom(a, t0 + n * 0.9, 523, 'sine', 0.22, 2.2, 0.01); tom(a, t0 + n * 0.9, 523 * 2.76, 'sine', 0.06, 1.2, 0.01); } }
      else if (k === 'tremor') { tom(a, t0, 38, 'sine', 0.5, 2.6, 0.4); tom(a, t0, 55, 'triangle', 0.25, 2.2, 0.3); ruido(a, t0, 2.6, 180, 0.6); }
      else if (k === 'misterio') { tom(a, t0, 392, 'sine', 0.12, 2.4, 0.5); tom(a, t0, 395, 'sine', 0.12, 2.4, 0.5); tom(a, t0 + 0.8, 311, 'sine', 0.1, 2.2, 0.5); tom(a, t0 + 0.8, 466, 'sine', 0.07, 2.2, 0.5); }
    } catch (e) { /* sem som */ }
    return true;
  }
  return { momento, get ultimoMomento() { return ultimoMomento; }, get vezesMomento() { return vezesMomento; }, tocar, ligado, aviso, avisosLigados, ligarAvisos, volumeAvisos, volumeDosAvisos, get ultimo() { return ultimo; }, get vezes() { return vezes; },
    get ultimoAviso() { return ultimoAviso; }, get vezesAviso() { return vezesAviso; } };
})();
