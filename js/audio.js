/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Audio engine on the Web Audio API: everything scheduled on AudioContext.currentTime,
   Farnsworth timing, soft keying, band conditions and feedback sounds. */
'use strict';
/* ============================================================
   AUDIO: an oscillator that always runs; the key is a GainNode
   ============================================================ */
function timing(c, s) {
  s = Math.min(s, c);
  const u = 1.2 / c, ta = (60 * c - 37.2 * s) / (s * c);
  return {u, dit:u, dah:3 * u, tc:3 * ta / 19, tw:7 * ta / 19};
}
const Engine = (() => {
  let ac = null, osc, key, sig, vol, fx, current = null;
  let nG, bp, qOsc, qKey, qG, lfo, lfoG;   /* band conditions: noise, interfering station, fading */
  function init() {
    if (ac) { if (ac.state !== 'running') ac.resume(); return ac; }
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    ac = new (window.AudioContext || window.webkitAudioContext)();
    osc = ac.createOscillator(); osc.type = 'sine';
    key = ac.createGain(); key.gain.value = 0;
    vol = ac.createGain();
    fx = ac.createGain(); fx.gain.value = 1;
    sig = ac.createGain(); sig.gain.value = 1;
    osc.connect(key).connect(sig).connect(vol).connect(ac.destination);
    fx.connect(vol);
    osc.start();
    /* Noise: white noise through a band-pass filter around the tone, like the CW filter of a receiver */
    const nb = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ns = ac.createBufferSource(); ns.buffer = nb; ns.loop = true;
    bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.value = S.freq;
    nG = ac.createGain(); nG.gain.value = 0;
    ns.connect(bp).connect(nG).connect(vol); ns.start();
    /* QRM: a second station at another pitch, with its own keying */
    qOsc = ac.createOscillator(); qOsc.type = 'sine';
    qKey = ac.createGain(); qKey.gain.value = 0; qG = ac.createGain(); qG.gain.value = 0;
    qOsc.connect(qKey).connect(qG).connect(vol); qOsc.start();
    /* QSB: a slow wave that makes the signal strength rise and fall */
    lfo = ac.createOscillator(); lfo.frequency.value = 0.15; lfoG = ac.createGain(); lfoG.gain.value = 0;
    lfo.connect(lfoG).connect(sig.gain); lfo.start();
    apply();
    return ac;
  }
  function apply() {
    if (!ac) return;
    const t = ac.currentTime;
    osc.frequency.setTargetAtTime(S.freq, t, 0.01);
    bp.frequency.setTargetAtTime(S.freq, t, 0.01);
    vol.gain.setTargetAtTime((S.vol / 100) ** 2 * 0.9, t, 0.02);
  }
  function curve(up, n = 64) {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = 0.5 - 0.5 * Math.cos(Math.PI * i / (n - 1)); a[i] = up ? x : 1 - x; }
    return a;
  }
  function bandOff(now) {
    [nG.gain, qKey.gain, qG.gain, lfoG.gain].forEach(p => { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(0, now + 0.05); });
    sig.gain.cancelScheduledValues(now); sig.gain.setValueAtTime(1, now);
  }
  /* Band conditions around a transmission: noise starts a little before the signal and stops a little after it */
  function bandOn(B, f, now, t0, end) {
    const UP = curve(true), DN = curve(false);
    bp.frequency.setValueAtTime(f, now);
    nG.gain.cancelScheduledValues(now); nG.gain.setValueAtTime(nG.gain.value, now);
    nG.gain.linearRampToValueAtTime(B.noise, now + 0.3); nG.gain.setValueAtTime(B.noise, end + 0.2); nG.gain.linearRampToValueAtTime(0, end + 0.5);
    sig.gain.cancelScheduledValues(now); sig.gain.setValueAtTime(B.sig, now);
    lfo.frequency.setValueAtTime(B.qsbRate, now);
    lfoG.gain.cancelScheduledValues(now); lfoG.gain.setValueAtTime(B.qsb, now);
    qKey.gain.cancelScheduledValues(now); qKey.gain.setValueAtTime(0, now);
    qG.gain.cancelScheduledValues(now); qG.gain.setValueAtTime(B.qrm, now);
    if (!B.qrm) return;
    qOsc.frequency.setValueAtTime(Math.max(300, f + B.qrmOff), now);
    const Q = timing(B.qrmWpm, B.qrmWpm), r = Math.min(0.005, Q.dit / 2.2), pool = 'ETAOINSRHDLUCMKQXYZ0123456789';
    let t = now + 0.15, n = 0;
    while (t < end) {
      const code = MORSE[pool[Math.floor(Math.random() * pool.length)]];
      [...code].forEach((el, ei) => {
        const d = el === '.' ? Q.dit : Q.dah;
        qKey.gain.setValueCurveAtTime(UP, t, r); qKey.gain.setValueCurveAtTime(DN, t + d - r, r);
        t += d; if (ei < code.length - 1) t += Q.u;
      });
      t += (++n % 5 === 0) ? Q.tw : Q.tc;
    }
  }
  /* groups: array of arrays of characters. Everything is scheduled in advance on ac.currentTime.
     opts.band (phase 4): noise, fading, QRM, chirp and a human fist (small deviations in the element lengths). */
  function play(groups, opts, onEnd) {
    init();
    stop(true);
    const B = opts.band || null;
    const now = ac.currentTime;
    const f = opts.freq || S.freq;
    osc.frequency.cancelScheduledValues(now); osc.frequency.setValueAtTime(f, now);
    const T = timing(opts.c, opts.s);
    const r0 = opts.ramp / 1000;
    const J = () => B && B.fist ? 1 + (Math.random() * 2 - 1) * B.fist : 1;
    const UP = curve(true), DN = curve(false), g = key.gain;
    const t0 = now + (B ? 0.7 : 0.15);
    let t = t0;
    const marks = [];
    groups.forEach((grp, gi) => {
      marks.push(t);
      grp.forEach((tok, ci) => {
        const code = MORSE[tok];
        [...code].forEach((el, ei) => {
          const d = (el === '.' ? T.dit : T.dah) * J();
          const r = Math.min(r0, d / 2.2);
          if (B && B.chirp) { osc.frequency.setValueAtTime(f - B.chirp, t); osc.frequency.setTargetAtTime(f, t, 0.015); }
          g.setValueCurveAtTime(UP, t, r);
          g.setValueCurveAtTime(DN, t + d - r, r);
          t += d;
          if (ei < code.length - 1) t += T.u * J();
        });
        if (ci < grp.length - 1) t += T.tc * J();
      });
      if (gi < groups.length - 1) t += T.tw * J();
    });
    if (B) bandOn(B, f, now, t0, t); else bandOff(now);
    const src = ac.createBufferSource(); src.buffer = ac.createBuffer(1, 1, ac.sampleRate);
    src.connect(ac.destination);
    current = {src, onEnd, t0, end:t, marks};
    src.onended = () => { if (current && current.src === src) { const c = current; current = null; c.onEnd({stopped:false}); } };
    src.start(t);
  }
  function stop(silent) {
    if (!ac) return;
    const t = ac.currentTime, g = key.gain;
    g.cancelScheduledValues(0);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(0, t + 0.006);
    bandOff(t);
    osc.frequency.cancelScheduledValues(t); osc.frequency.setValueAtTime(S.freq, t);
    if (current) {
      const c = current; current = null;
      try { c.src.onended = null; c.src.stop(); } catch (e) {}
      if (!silent) c.onEnd({stopped:true});
    }
  }
  /* Feedback sound: correct = two rising tones, wrong = one soft low tone */
  function tick(ok) {
    init();
    const t = ac.currentTime;
    const notes = ok ? [[660, 0, 0.08], [990, 0.09, 0.12]] : [[196, 0, 0.22]];
    notes.forEach(([f, d, len]) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = ok ? 'sine' : 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + d);
      g.gain.linearRampToValueAtTime(0.28, t + d + 0.008);
      g.gain.linearRampToValueAtTime(0, t + d + len);
      o.connect(g).connect(fx);
      o.start(t + d); o.stop(t + d + len + 0.02);
    });
  }
  function pos() {
    if (!ac || !current) return null;
    const now = ac.currentTime;
    let gi = -1; current.marks.forEach((m, i) => { if (now >= m) gi = i; });
    return {gi, pct:Math.max(0, Math.min(1, (now - current.t0) / (current.end - current.t0)))};
  }
  /* Very quiet low-frequency signal so the device keeps treating the page as 'playing' */
  let ka = null;
  function keepAlive(on) {
    if (!ac) return;
    if (on && !ka) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 40; g.gain.value = 0.003; o.connect(g).connect(ac.destination); o.start(); ka = {o, g}; }
    if (!on && ka) { try { ka.o.stop(); } catch (e) {} ka = null; }
  }
  return {init, apply, play, stop, tick, pos, keepAlive, get ac() { return ac; }};
})();
let pendingPlay = null;
function playP(groups, ew) {
  return new Promise(res => {
    pendingPlay = res;
    const B = sess && sess.band ? bandFor(sess.band, Math.random) : null;
    const freq = B ? Math.max(400, Math.min(1000, S.freq + B.pitch)) : 0;
    Engine.play(groups, {c:(sess && sess.c) || S.cwpm, s:ew, ramp:S.ramp, band:B, freq}, r => { pendingPlay = null; res(r.stopped ? 'stopped' : 'ok'); });
  });
}

