/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Progress, logbook, install card, settings, start wizard, splash screen and the level picker. */
'use strict';
/* ============================================================
   PROGRESS
   ============================================================ */
function renderProgress() {
  renderHeader();
  $('pMile').textContent = tx('Alfabet: ') + Math.min(P.known, N1) + tx(' van ') + N1 + tx('. Fase 2: ') + Math.max(0, P.known - N1) + tx(' van ') + P2.length +
    tx('. Klaar voor de band: ') + (P.bandReady ? tx('sinds ') + fmtD(P.bandReady) : tx('nog niet')) + '. Luistertijd: ' + listenTxt() + '.';
  const el = $('chars'); el.innerHTML = '';
  const el2 = $('chars2'); el2.innerHTML = '';
  KOCH.split('').forEach((c, i) => {
    const d = document.createElement('div');
    const locked = i >= P.known;
    const a = acc(P, c), n = P.stats[c] ? P.stats[c].h.length : 0;
    d.className = 'cell' + (locked ? ' lock' : a === null ? '' : a >= 0.9 ? ' ok' : a >= 0.85 ? ' mid' : ' low') + (locked ? '' : ' tap');
    if (!locked) { d.dataset.hear = c; d.setAttribute('role', 'button'); d.setAttribute('aria-label', tx('Beluister ') + lab(c)); }
    d.innerHTML = '<b>' + h(c) + '</b><span>' + (locked || a === null ? '&nbsp;' : Math.round(a * 100) + '%') + '</span>';
    (i < N1 ? el : el2).appendChild(d);
  });
  const np = (P.exam && P.exam.passes) ? P.exam.passes.length : 0;
  $('f3Mile').textContent = P.bandReady ? tx('Behaald op ') + fmtD(P.bandReady) + tx('. Nu geldt de gouden regel: heel veel luisteren.')
    : P.known < KOCH.length ? tx('Nog vergrendeld. De Eindproef opent zodra alle 44 tekens gekend zijn. Nu gekend: ') + P.known + tx(' van ') + KOCH.length + '.'
    : tx('De Eindproef staat klaar op het scherm Vandaag. Geslaagd: ') + Math.min(np, 2) + tx(' van 2 keer.');
  $('vocLock').hidden = ph4();
  $('vocTable').hidden = !ph4();
  $('vChips').innerHTML = VOCAB.map(v => '<span' + (knownVocab(P).includes(v.w) ? ' class="on"' : '') + '>' + [...v.w].map(h).join('') + '</span>').join('');
  if (!ph4()) $('vMile').textContent = VOCAB.length + tx(' afkortingen en Q-codes wachten op je.');
  if (ph4()) {
    const kv = knownVocab(P);
    $('vMile').textContent = tx('Gekend: ') + kv.length + tx(' van ') + VOCAB.length + ((P.vocabQueue || []).length ? tx('. Klaar om voor te stellen: ') + P.vocabQueue.length + '.' : '.');
    $('vRows').innerHTML = kv.map(w => { const a = vacc(P, w); return '<tr><td><b>' + [...w].map(h).join('') + '</b></td><td class="vmean">' + mean(w) + '</td><td>' + (a === null ? '' : Math.round(a * 100) + '%') + '</td></tr>'; }).join('');
  }
  const rows = P.sessions.slice(-8).reverse();
  $('pRows').innerHTML = rows.map(s => '<tr><td>' + s.d.slice(8) + '/' + s.d.slice(5, 7) + '</td><td>' + fmt(s.s, 0) + '%</td><td>' + s.n + '</td><td>' + s.c + '/' + s.e + '</td><td>' + s.k + '</td></tr>').join('');
  $('pEmpty').hidden = rows.length > 0;
}

/* ============================================================
   LOGBOOK
   ============================================================ */
function renderLog() {
  renderHeader();
  const open = ph4() || S.test;
  $('gLock').hidden = open; $('gBody').hidden = !open; $('gListCard').hidden = !open;
  if (!open) return;
  if (!$('gDate').value) $('gDate').value = today();
  const log = P.log || [];
  const wk = fmtDate(new Date(Date.now() - 6 * 86400000));
  $('gTot').textContent = minTxt(P.bandMin);
  $('gWeek').textContent = minTxt(log.filter(e => e.d >= wk).reduce((a, e) => a + e.min, 0));
  $('gCnt').textContent = log.length;
  $('gEmpty').hidden = log.length > 0;
  const esc2 = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
  $('gRows').innerHTML = log.slice(0, 60).map(e => '<tr class="logrow"><td>' + fmtD(e.d) + '</td><td>' + esc2(tx(e.band)) + '</td><td>' + e.min + '</td><td>' + esc2(tx(e.kind)) +
    (e.note ? '<span class="note">' + esc2(e.note) + '</span>' : '') + '</td><td><button class="btn-link" data-del="' + e.id + '">' + tx('Wis') + '</button></td></tr>').join('');
  $('gRows').querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.sure) { delLog(P, b.dataset.del); saveP(); renderLog(); }
    else { b.dataset.sure = '1'; b.textContent = tx('Zeker?'); b.style.color = 'var(--red)'; }
  }));
}
$('p4Ok').addEventListener('click', () => { P.p4Seen = true; saveP(); renderHome(); });
let aboutFrom = 'home';
const openAbout = () => { if (curView !== 'about' && curView !== 'session') aboutFrom = curView; go('about'); };
$('aboutLink').addEventListener('click', openAbout);
$('aboutOpen').addEventListener('click', openAbout);
$('aboutBack').addEventListener('click', () => go(aboutFrom));
$('lang').addEventListener('change', e => { S.lang = e.target.value; saveS(); setLang(S.lang, true); });
$('updGo').addEventListener('click', () => location.reload());
/* Install as an app: own card on the Today screen right after the wizard; Android and desktop through the browser, iPhone with instructions */
let instEvt = null;
const isStandalone = () => { try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (e) { return false; } };
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); instEvt = e; renderInstall(); });
window.addEventListener('appinstalled', () => { instEvt = null; S.installed = true; saveS(); renderInstall(); });
function instHow() {
  return isIOS() ? tx('Tik onderaan op de knop Delen, kies "Zet op beginscherm" en tik rechtsboven op Voeg toe. Dit werkt in Safari.')
    : tx('Open het menu van je browser (drie puntjes) en kies "App installeren" of "Toevoegen aan startscherm".');
}
function renderInstall() {
  const can = !isStandalone();
  const show = can && !S.installed && !S.instNever && Date.now() > (S.instUntil || 0);
  $('instCard').hidden = !show;
  if (show) {
    const t = $('instTxt'); t.textContent = tx('Zo start ze meteen vanaf je startscherm, in volledig scherm, en werkt ze ook zonder internet.');
    if (!instEvt) { const p2 = document.createElement('span'); p2.style.display = 'block'; p2.style.marginTop = '10px'; p2.textContent = instHow(); t.appendChild(p2); }
  }
  $('instGo').hidden = !instEvt;
  $('instSet').hidden = !can;
}
async function doInstall() {
  if (instEvt) { const e = instEvt; instEvt = null; try { await e.prompt(); const c = await e.userChoice; if (c && c.outcome === 'accepted') S.installed = true; else S.instUntil = Date.now() + 14 * 86400000; saveS(); } catch (x) {} renderInstall(); return true; }
  return false;
}
$('instGo').addEventListener('click', doInstall);
$('instLater').addEventListener('click', () => { S.instUntil = Date.now() + 14 * 86400000; saveS(); renderInstall(); });
$('instNever').addEventListener('click', () => { S.instNever = true; saveS(); renderInstall(); });
$('instSetGo').addEventListener('click', async () => { if (!(await doInstall())) $('instSetMsg').textContent = instHow(); });
/* Update notice: only when a version was already active and the service worker takes a new one */
try {
  if ('serviceWorker' in navigator) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) $('updBar').hidden = false; });
  }
} catch (e) {}
$('gAdd').addEventListener('click', () => {
  const d = $('gDate').value, m = +$('gMin').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d > today()) { $('gMsg').textContent = tx('Kies een geldige datum, niet in de toekomst'); $('gMsg').className = 'small bad'; return; }
  if (!(m >= 1 && m <= 600)) { $('gMsg').textContent = tx('Geef het aantal minuten (1 tot 600)'); $('gMsg').className = 'small bad'; return; }
  addLog(P, {d, band:$('gBand').value, min:m, kind:$('gKind').value, note:$('gNote').value.trim()});
  saveP(); $('gNote').value = '';
  $('gMsg').textContent = tx('Genoteerd: ') + m + tx(' min op ') + tx($('gBand').value) + tx('. Goed bezig.'); $('gMsg').className = 'small ok';
  renderLog();
});

/* ============================================================
   SETTINGS
   ============================================================ */
let wl = null;
async function wake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    if (!on && wl) { await wl.release(); wl = null; }
  } catch (e) {}
}
function renderSettings() {
  renderHeader(); renderInstall(); $('instSetMsg').textContent = '';
  $('freq').value = S.freq; $('o-freq').textContent = S.freq + ' Hz';
  $('vol').value = S.vol; $('o-vol').textContent = S.vol + '%';
  $('cwpm').value = S.cwpm; $('o-cwpm').textContent = S.cwpm + ' WPM';
  $('cwarn').className = S.cwpm < 20 ? 'warnc' : '';
  $('ramp').value = S.ramp; $('o-ramp').textContent = S.ramp + ' ms';
  $('errWait').value = String(S.errWait || '1.7'); [...$('errWait').options].forEach(o => { o.textContent = (+o.value).toLocaleString(S.lang === 'en' ? 'en' : S.lang === 'fr' ? 'fr' : 'nl') + ' s'; });
  $('glen').value = S.glen; $('round').value = S.round || '1'; $('wake').checked = S.wake; $('test').checked = S.test; $('speech').checked = S.speech; $('live').checked = S.live; $('dd').checked = S.dd; $('skipIntro').checked = !!S.skipIntro;
  $('fixed').checked = P.fixedSpeed;
  const ew = Math.min(P.ewpm, S.cwpm);
  $('ewpm').value = ew; $('ewpm').disabled = !P.fixedSpeed; $('o-ewpm').textContent = ew + ' WPM' + (P.fixedSpeed ? '' : tx(' (automatisch)'));
  $('order').value = P.order;
  const p4open = ph4() || S.test;
  $('lang').value = LANG;
  $('bandLock').hidden = p4open; $('band').disabled = !p4open; $('testBand').disabled = !p4open;
  $('band').value = S.band; $('o-band').textContent = tx(BAND_NAMES[S.band]);
  $('bandInfo').textContent = tx(BAND_INFO[S.band]) + tx(' Geldt in fase 4 voor het scorende blok en het luisterblok, niet bij nieuwe afkortingen en niet bij de Eindproef.');
  $('lvlRow').hidden = !S.test;
  const bb = bounds(P.order);
  $('lvl').innerHTML = KOCH.split('').map((c, i) => i < 1 || (bb && !bb.includes(i + 1)) ? '' : '<option value="' + (i + 1) + '">' + (i + 1) + tx(' tekens, tot en met ') + lab(c) + (i + 1 === N1 ? tx(' (alfabet)') : i + 1 === KOCH.length ? tx(' (alles)') : '') + '</option>').join('');
  $('lvl').innerHTML += tx('<option value="ph4">Klaar voor de band (fase 4)</option>');
  $('lvl').value = P.bandReady ? 'ph4' : P.known;
  $('exp').value = JSON.stringify({app:'cwld', v:1, progress:P, settings:S});
}
['freq', 'vol', 'cwpm', 'ramp'].forEach(k => $(k).addEventListener('input', e => {
  S[k] = +e.target.value; saveS();
  if (k === 'cwpm' && P.ewpm > S.cwpm) { P.ewpm = S.cwpm; saveP(); }
  renderSettings(); Engine.apply();
}));
$('round').addEventListener('change', e => { S.round = e.target.value; saveS(); });
$('errWait').addEventListener('change', e => { S.errWait = e.target.value; saveS(); });
$('glen').addEventListener('change', e => { S.glen = +e.target.value; saveS(); });
$('order').addEventListener('change', e => {
  switchOrder(P, e.target.value); saveP();
  $('orderMsg').textContent = tx('Volgorde gewijzigd. Tekens die je al kende blijven gekend, je statistiek en reeks blijven bewaard.');
  renderSettings();
});
$('wake').addEventListener('change', e => { S.wake = e.target.checked; saveS(); });
$('speech').addEventListener('change', e => { S.speech = e.target.checked; saveS(); });
$('live').addEventListener('change', e => { S.live = e.target.checked; saveS(); });
$('dd').addEventListener('change', e => { S.dd = e.target.checked; saveS(); });
$('skipIntro').addEventListener('change', e => { S.skipIntro = e.target.checked; saveS(); });
$('testSpeech').addEventListener('click', () => { speak(['K', 'M', 'R']); });
$('test').addEventListener('change', e => { S.test = e.target.checked; saveS(); renderSettings(); renderHeader(); });
const BAND_INFO = ['Uit: een zuiver signaal, zoals tot nu toe.',
  'Licht: wat ruis, kleine verschillen in toonhoogte en seinstijl.',
  'Matig: meer ruis, fading (QSB), een zwak storend station (QRM) en duidelijkere verschillen in seinstijl.',
  'Zwaar: veel ruis, diepe fading, sterkere QRM en soms een chirpend signaal.'];
$('band').addEventListener('input', e => { S.band = +e.target.value; saveS(); renderSettings(); });
$('testBand').addEventListener('click', () => {
  Engine.init();
  const B = bandFor(S.band, Math.random);
  const words = ['CQ', 'CQ', 'DE', 'ON4ABC', 'K'];
  Engine.play(words.map(w => [...w]), {c:S.cwpm, s:Math.max(MIN_EWPM, Math.min(P.ewpm, S.cwpm)), ramp:S.ramp, band:B, freq:B ? Math.max(400, Math.min(1000, S.freq + B.pitch)) : 0}, () => {});
});
$('lvlSet').addEventListener('click', () => {
  const v = $('lvl').value;
  if (v === 'ph4') {
    P.known = KOCH.length; P.introQueue = []; P.okRun = 0; P.alphabetDone = true; P.phase2Done = true;
    if (!P.bandReady) P.bandReady = today(); startPhase4(P);
    saveP(); $('lvlMsg').textContent = tx('Fase 4 ingesteld'); renderSettings(); renderHeader(); return;
  }
  const n = +v;
  P.known = n; P.introQueue = []; P.okRun = 0;
  P.alphabetDone = n > N1; P.phase2Done = n >= KOCH.length; P.bandReady = null;
  saveP(); $('lvlMsg').textContent = tx('Niveau op ') + n + tx(' tekens gezet'); renderSettings(); renderHeader();
});
$('fixed').addEventListener('change', e => { P.fixedSpeed = e.target.checked; P.hi = 0; P.lo = 0; saveP(); renderSettings(); });
$('ewpm').addEventListener('input', e => { P.ewpm = Math.max(MIN_EWPM, Math.min(+e.target.value, S.cwpm)); saveP(); renderSettings(); });
$('testTone').addEventListener('click', async () => { Engine.init(); await playP([['K', 'M', 'R', 'E']], Math.max(MIN_EWPM, Math.min(P.ewpm, S.cwpm))); });
$('copyExp').addEventListener('click', async () => {
  const t = $('exp').value;
  try { await navigator.clipboard.writeText(t); $('copyMsg').textContent = tx('Gekopieerd'); }
  catch (e) { $('exp').select(); $('copyMsg').textContent = tx('Selecteer en kopieer zelf'); }
});
$('doImp').addEventListener('click', () => {
  try {
    const o = JSON.parse($('imp').value);
    const p = o && o.progress;
    if (!o || (o.app !== 'cwld' && o.app !== 'cw-in-toontjes') || !p || p.v !== 1 || !(p.known >= 2 && p.known <= KOCH.length)) throw new Error('x');
    if (!p.order) p.order = 'koch'; setOrder(p.order); P = Object.assign(newProgress(p.order), p); if (o.settings) S = Object.assign({...DEF_S}, o.settings);
    migrate(); saveP(); saveS(); $('imp').value = ''; $('impMsg').textContent = tx('Geimporteerd'); $('impMsg').className = 'small ok'; renderSettings();
  } catch (e) { $('impMsg').textContent = tx('Dit is geen geldige export van deze app'); $('impMsg').className = 'small bad'; }
});
$('resetS').addEventListener('click', () => { const l = S.lang; S = {...DEF_S, lang:l}; saveS(); renderSettings(); Engine.apply(); });
$('resetP').addEventListener('click', () => { $('resetBox').hidden = false; });
$('resetNo').addEventListener('click', () => { $('resetBox').hidden = true; });
$('resetYes').addEventListener('click', () => { P = newProgress(P.order); saveP(); $('resetBox').hidden = true; renderSettings(); });

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { const ac = Engine.ac; if (ac && ac.state !== 'running') ac.resume(); if (sess && S.wake) wake(true); }
});
setInterval(() => { $('utc').textContent = new Date().toISOString().slice(11, 19) + ' UTC'; }, 1000);
/* ============================================================
   START WIZARD (once, at first use; can always be skipped)
   ============================================================ */
let wzStep = 1;
function renderWizard() {
  for (let i = 1; i <= 5; i++) $('wz' + i).hidden = i !== wzStep;
  document.querySelectorAll('#wzDots i').forEach((d, i) => d.classList.toggle('on', i < wzStep));
  document.querySelectorAll('#wzLang .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === LANG)));
  document.querySelectorAll('#wzPitch .chip').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.f === S.freq)));
  $('wzVol').value = S.vol; $('wzVolO').textContent = S.vol + '%';
  $('wzBack').hidden = wzStep === 1;
  $('wzNext').hidden = wzStep === 5;
  $('wzStart').hidden = wzStep !== 5;
  window.scrollTo(0, 0);
}
function wzOpen() { wzStep = 1; go('wizard'); }
function wzDone() {
  S.wizardDone = true; saveS();
  go('home');
}
document.querySelectorAll('#wzLang .chip').forEach(b => b.addEventListener('click', () => { S.lang = b.dataset.l; saveS(); setLang(S.lang, false); renderWizard(); }));
document.querySelectorAll('#wzPitch .chip').forEach(b => b.addEventListener('click', async () => {
  S.freq = +b.dataset.f; saveS(); Engine.init(); Engine.apply(); renderWizard();
  await playP([['K', 'M']], Math.max(MIN_EWPM, Math.min(P.ewpm, S.cwpm)));
}));
$('wzVol').addEventListener('input', e => { S.vol = +e.target.value; $('wzVolO').textContent = S.vol + '%'; saveS(); Engine.apply(); });
$('wzTest').addEventListener('click', async () => { Engine.init(); Engine.apply(); await playP([['K', 'M', 'R', 'E']], Math.max(MIN_EWPM, Math.min(P.ewpm, S.cwpm))); });
$('wzNext').addEventListener('click', () => { if (wzStep < 5) { wzStep++; renderWizard(); } });
$('wzBack').addEventListener('click', () => { if (wzStep > 1) { wzStep--; renderWizard(); } });
$('wzSkip').addEventListener('click', wzDone);
$('wzStart').addEventListener('click', wzDone);
$('wizOpen').addEventListener('click', wzOpen);
$('wzKnow').addEventListener('click', () => knOpen('wizard'));

/* Splash screen: visible for at least 5 seconds when the app opens (screen timing only, no audio) */
(function () {
  const sp = $('splash');
  if (navigator.webdriver && !/[?&]splash=1/.test(location.search)) { sp.remove(); return; }
  const left = Math.max(0, 5000 - (performance.now() - (window.__t0 || 0)));
  setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 450); }, left);
})();
/* ============================================================
   CHOOSE LEVEL: what do you already know? With a short check.
   ============================================================ */
/* knClaim: the user tapped characters they know (also K and M alone); false after 'Nothing yet' */
let knN = 2, knFrom = 'settings', knClaim = false;
function snapLevel(n, up) {
  const b = bounds(P.order), lo = startKnown(P.order);
  n = Math.max(lo, Math.min(KOCH.length, n));
  if (!b) return n;
  return up ? (b.find(x => x >= n) || KOCH.length) : ([...b].reverse().find(x => x <= n) || b[0]);
}
/* next = true: the user knows the characters up to n (check passed or chosen on purpose), so the next character is introduced right away */
function applyLevel(n, next) {
  P.known = n; P.introQueue = []; P.okRun = 0;
  if (next && n < KOCH.length) { P.known = n + 1; P.introQueue = [KOCH[n]]; }
  else if (!next && n <= startKnown(P.order)) P.introQueue = KOCH.slice(0, n).split('');   /* 'Nothing yet': start from the very beginning, first characters are introduced */
  n = P.known;
  P.alphabetDone = n > N1; P.phase2Done = n >= KOCH.length; P.bandReady = null;
  saveP(); renderHeader();
}
function nextTxt(n) { return n < KOCH.length ? ' ' + tx('Je eerste nieuwe teken in de volgende sessie is ') + lab(KOCH[n]) + '.' : ''; }
function knOpen(from) {
  knFrom = from; knN = snapLevel(Math.max(P.known, startKnown(P.order)), true); knClaim = knN > startKnown(P.order);
  $('knRes').hidden = true; $('knDone').hidden = true; $('knCheck').hidden = false; $('knNow').hidden = false;
  go('know');
}
function knSum() {
  const lo = startKnown(P.order);
  $('knSum').textContent = !knClaim ? tx('Je begint helemaal vooraan.') : tx('Gekozen niveau: ') + knN + tx(' tekens, tot en met ') + lab(KOCH[knN - 1]) + '.';
}
function renderKnow() {
  const g = $('knGrid'); g.innerHTML = '';
  KOCH.split('').forEach((c, i) => {
    const b = document.createElement('button');
    b.innerHTML = h(c); b.setAttribute('aria-label', lab(c));
    b.className = !knClaim ? '' : i + 1 === knN ? 'on cur' : i < knN ? 'on' : '';
    b.addEventListener('click', () => knSetN(i + 1, true));
    g.appendChild(b);
  });
  knSum();
}
function knSetN(n, claim) { knN = snapLevel(n, true); knClaim = !!claim; $('knRes').hidden = true; $('knDone').hidden = true; $('knCheck').hidden = false; $('knNow').hidden = false; renderKnow(); }
function knFinish() { if (knFrom === 'wizard') { wzStep = 5; go('wizard'); } else go('settings'); }
function knApplied(msg) {
  const box = $('knRes'); box.hidden = false; box.textContent = msg;
  $('knDone').hidden = false; $('knCheck').hidden = true; $('knNow').hidden = true;
}
async function runPlacement(n) {
  Engine.init();
  const all = KOCH.slice(0, n).split('');
  const ew = Math.max(AUTO_MIN, Math.min(P.ewpm, S.cwpm));
  const secs = S.test ? 30 : 120;
  sess = {abort:false, tokens:0, correct:0, perChar:[], conf:[], vres:[], minutes:0, ewpm:ew, plan:{}, mode:'proef', band:0, release:null, paused:false, pausedMs:0, pauseAt:null, bn:1, bi:1, blocks:[{secs}]};
  kbState.chars = all; renderKb(); panel('play'); go('session'); $('stopBox').hidden = true; wake(S.wake);
  const len = +S.glen, rnd = Math.random;
  await groupsBlock(tx('Controle'), secs, true, () => ({tokens:randomGroup(P, all, len, rnd)}), ew);
  clearInterval(blockTimer); wake(false); Engine.stop(true);
  const s = sess; sess = null; $('sTotal').textContent = '';
  knEvaluate(n, s);
}
function knEvaluate(n, s) {
  knN = n; go('know');
  const box = $('knRes'); box.hidden = false; box.innerHTML = '';
  const say = t => { const p = document.createElement('p'); p.style.margin = '0 0 8px'; p.textContent = t; box.appendChild(p); };
  const btn = (t, fn, ghost) => { const b = document.createElement('button'); b.className = 'btn ' + (ghost ? 'ghost' : 'go'); b.style.marginRight = '8px'; b.style.marginBottom = '8px'; b.textContent = t; b.addEventListener('click', fn); box.appendChild(b); };
  if (s.abort || s.tokens < 10) {
    say(tx('Controle afgebroken of te kort. Je niveau is niet gewijzigd.'));
    btn(tx('Nog eens proberen'), () => runPlacement(n), true);
    return;
  }
  const acc = s.correct / s.tokens, pct = Math.round(acc * 100);
  if (acc >= 0.9) {
    applyLevel(n, true);
    knApplied(tx('Controle: ') + pct + tx('% juist. Je niveau staat nu op ') + n + tx(' tekens.') + nextTxt(n));
    return;
  }
  const st = {}; s.perChar.forEach(([c, ok]) => { const x = st[c] || (st[c] = [0, 0]); x[1]++; if (ok) x[0]++; });
  const weak = KOCH.slice(0, n).split('').filter(c => st[c] && st[c][1] >= 2 && st[c][0] / st[c][1] < 0.7);
  let cut = KOCH.slice(0, n).split('').findIndex(c => weak.includes(c));
  let low = snapLevel(cut >= 0 ? cut : n - 3, false);
  if (low >= n) low = snapLevel(n - 1, false);
  say(tx('Controle: ') + pct + tx('% juist. Dat is onder de 90%. ') + (weak.length ? tx('Moeilijk waren vooral: ') + weak.slice(0, 5).map(lab).join(' ') + '. ' : '') + (low < n ? tx('Ik stel een lager niveau voor: ') + low + tx(' tekens, tot en met ') + lab(KOCH[low - 1]) + '.' : ''));
  if (low < n) btn(tx('Zet op ') + low + tx(' tekens'), () => { knN = low; applyLevel(low); renderKnow(); knApplied(tx('Niveau op ') + low + tx(' tekens gezet')); });
  btn(tx('Toch mijn keuze houden'), () => { applyLevel(n); knApplied(tx('Niveau op ') + n + tx(' tekens gezet')); }, true);
  btn(tx('Nog eens proberen'), () => runPlacement(n), true);
}
$('knNone').addEventListener('click', () => knSetN(startKnown(P.order), false));
$('knAlpha').addEventListener('click', () => knSetN(N1, true));
$('knAll').addEventListener('click', () => knSetN(KOCH.length, true));
$('knCheck').addEventListener('click', () => runPlacement(knN));
$('knNow').addEventListener('click', () => { const nx = knClaim; applyLevel(knN, nx); knApplied(tx('Niveau op ') + knN + tx(' tekens gezet') + '.' + (nx ? nextTxt(knN) : '')); });
$('knDone').addEventListener('click', knFinish);
$('knBack').addEventListener('click', () => { if (knFrom === 'wizard') { wzStep = 4; go('wizard'); } else go('settings'); });
$('knOpen').addEventListener('click', () => knOpen('settings'));

