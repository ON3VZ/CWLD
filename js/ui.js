/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Screens: navigation between views, header, the Today screen and the on-screen keyboard. */
'use strict';
/* ============================================================
   SCREENS: navigation, Today screen, keyboard
   ============================================================ */
const views = ['home', 'session', 'result', 'progress', 'log', 'settings', 'about', 'wizard', 'know'];
let curView = 'home';
function go(v) {
  curView = v;
  views.forEach(x => { $('v-' + x).hidden = x !== v; });
  const inSession = v === 'session';
  $('tabs').hidden = inSession || v === 'wizard';
  document.querySelectorAll('#tabs button').forEach(b => b.toggleAttribute('aria-current', b.dataset.go === v));
  document.querySelectorAll('#tabs button').forEach(b => { if (b.dataset.go !== v) b.removeAttribute('aria-current'); else b.setAttribute('aria-current', 'page'); });
  if (v === 'home') renderHome();
  if (v === 'wizard') renderWizard();
  if (v === 'know') renderKnow();
  if (v === 'progress') renderProgress();
  if (v === 'settings') renderSettings();
  if (v === 'log') renderLog();
  if (v === 'about') $('aboutBody').innerHTML = (ABOUT[LANG] || ABOUT.nl).replace('{v}', APP_VERSION);
  window.scrollTo(0, 0);
}
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));

function renderHeader() {
  const n = calcStreak(P.days, today());
  $('hStreak').textContent = n + (n === 1 ? tx(' dag') : tx(' dagen'));
  $('tabLog').classList.toggle('dim', !(P.bandReady || S.test));
}
const ph4 = () => !!P.bandReady;
const minTxt = m => { m = Math.round(m || 0); return Math.floor(m / 60) + tx(' u ') + (m % 60) + ' min'; };
function renderHome() {
  renderHeader(); renderInstall(); renderFree();
  const first = P.sessions.length === 0 && !P.lastDate;
  $('firstCard').hidden = !first;
  const min = P.days[today()] || 0;
  $('homeTitle').textContent = first ? tx('Welkom, start je eerste sessie') : min >= 10 ? tx('Vandaag al geoefend') : tx('Klaar voor je sessie?');
  const plan = makePlanPreview();
  $('homeNotes').innerHTML = plan.map(t => '<div class="notice">' + t + '</div>').join('');
  const ph2 = P.known > N1;
  $('fKnownL').textContent = ph4() ? tx('Afkortingen') : ph2 ? tx('Fase 2') : tx('Letters');
  $('fKnown').textContent = ph4() ? (P.vocab || 0) + tx(' van ') + VOCAB.length : ph2 ? (P.known - N1) + tx(' van ') + P2.length : P.known + tx(' van ') + N1;
  $('p4Card').hidden = !(ph4() && !P.p4Seen);
  $('fBandW').hidden = !ph4(); $('fBand').textContent = minTxt(P.bandMin);
  const ew = Math.min(P.ewpm, S.cwpm);
  $('fSpeed').textContent = S.cwpm + ' / ' + ew + ' WPM';
  let next;
  if (ph4()) next = (P.vocabQueue || []).length ? tx('wacht op je') : (P.vocab || 0) >= VOCAB.length ? tx('alles gekend') : tx('na 90%');
  else if (P.introQueue.length) next = tx('wacht op je');
  else if (P.known >= KOCH.length) next = tx('alles gekend');
  else next = tx('na 90%');
  $('fNext').innerHTML = next;
  $('fToday').textContent = fmt(min, 0) + ' min';
  $('fListen').textContent = listenTxt();
  renderModes();
  renderExam();
  $('startHint').textContent = S.test ? tx('Testmodus staat aan') : S.mode === 'luister' ? tx('Ongeveer 12 minuten luisteren') : tx('Ongeveer 15 minuten');
  /* An interrupted session of an earlier day is closed; one of today can be continued */
  if (P.resume && !resumeGet()) resumeDrop();
  const R = resumeGet();
  $('resumeBox').hidden = !R; $('resumeNew').hidden = !R;
  $('start').textContent = R ? tx('Verder waar je stopte') : tx('Start sessie');
  if (R) {
    const pct = R.acc.tokens ? Math.round(100 * R.acc.correct / R.acc.tokens) : null;
    $('resumeBox').textContent = tx('Je sessie van vandaag is onderbroken. ') + resumeWhere(R) + (pct !== null ? ' ' + tx('Tot nu toe ') + pct + tx('% juist.') : '');
    $('startHint').textContent = '';
  }
}
function fmtD(d) { return d.slice(8) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4); }
function examOpen() { return P.known >= KOCH.length && !P.introQueue.length; }
function renderExam() {
  const open = examOpen() || !!P.bandReady;
  $('examCard').hidden = !open;
  if (!open) return;
  const passes = (P.exam && P.exam.passes) || [];
  if (P.bandReady) {
    $('examTitle').textContent = tx('Klaar voor de band');
    $('examText').textContent = tx('Geslaagd op ') + fmtD(P.bandReady) + tx('. Nu geldt de gouden regel: heel veel luisteren op de banden. Je mag de proef altijd opnieuw doen.');
  } else {
    $('examTitle').textContent = tx('Eindproef');
    $('examText').textContent = tx('Alle 44 tekens zijn gekend. De proef duurt 5 minuten: gemengde groepen aan 20 WPM, 10 WPM effectief. Je slaagt met minstens 90% en geen enkel zwak teken. Twee keer slagen op verschillende dagen maakt je klaar voor de band.');
  }
  $('examHint').textContent = S.test ? tx('Testmodus: 40 seconden') : passes.length ? tx('Geslaagd op ') + passes.map(fmtD).join(', ') : tx('Nog niet afgelegd');
}
$('examStart').addEventListener('click', () => { runSession(true); });
const MODE_INFO = {
  onderweg: 'Je hoort een groep en tikt hem meteen in. Handig in de trein of een wachtzaal.',
  papier: 'Een blok groepjes klinkt achter elkaar. Je schrijft mee op papier en controleert daarna.',
  luister: 'Handsfree. Je hoort een groep, denkt na en de gsm zegt de oplossing. Telt niet voor je score, wel voor je luistertijd.'
};
function listenUsable() { return KOCH.slice(0, P.known).split('').filter(c => !P.introQueue.includes(c)).length >= 2; }
function renderModes() {
  document.querySelectorAll('#modes .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  $('paperOpts').hidden = S.mode !== 'papier';
  $('pgroups').value = S.pgroups; $('plen').value = S.plen;
  const lok = listenUsable();
  const blocked = S.mode === 'luister' && !lok;
  $('modeInfo').textContent = blocked ? tx('Leer eerst de eerste letters met Onderweg of Op papier. Daarna kan je ook handsfree luisteren.') : tx(MODE_INFO[S.mode]);
  $('start').disabled = blocked;
}
document.querySelectorAll('#modes .chip').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; saveS(); renderHome(); }));
['pgroups', 'plen'].forEach(k => $(k).addEventListener('change', e => { S[k] = +e.target.value; saveS(); }));
document.querySelectorAll('#pReady .chip').forEach(b => b.addEventListener('click', () => { S.pcheck = b.dataset.check; saveS(); renderCheckChips(); }));
function makePlanPreview() {
  const notes = [];
  if (!P.lastDate) return notes;
  const missed = Math.max(0, daysBetween(P.lastDate, today()) - 1);
  if (missed >= 7) notes.push(tx('Je was ') + missed + tx(' dagen weg. De sessie begint met herhaling.'));
  else if (missed >= 2) notes.push(tx('Je was ') + missed + tx(' dagen weg. De sessie begint met extra opwarming.'));
  if (ph4() && (P.vocab || 0) <= V_STEP && (P.vocabQueue || []).length) notes.push(tx('Fase 4 start: afkortingen, Q-codes en bandcondities. Luister daarnaast echt op de banden en noteer het in je Logboek.'));
  if (P.alphabetDone && P.known <= N1 + 1 && P.introQueue.length) notes.push(tx('Het alfabet is gekend. Nu start fase 2: cijfers, leestekens en prosigns, gemengd met de letters.'));
  return notes;
}

