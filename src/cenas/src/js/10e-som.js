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
  return { tocar, ligado, get ultimo() { return ultimo; }, get vezes() { return vezes; } };
})();
