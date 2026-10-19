/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Settings (S) and progress (P) in localStorage, plus small shared helpers ($, sleep, h). */
'use strict';
/* ============================================================
   STORAGE: settings (S) and progress (P) in localStorage
   ============================================================ */
const $ = id => document.getElementById(id);
const LS_P = 'cwt-progress-v1', LS_S = 'cwt-settings-v1';
const DEF_S = {sv:2, freq:600, vol:70, cwpm:20, ramp:5, glen:5, wake:false, test:false, mode:'onderweg', pgroups:10, plen:5, pcheck:'snel', speech:true, live:true, dd:true, skipIntro:false, round:'1', band:1};
let S = {...DEF_S}, P = newProgress();
function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(LS_S) || 'null'); if (raw) Object.assign(S, raw); } catch (e) {}
  try { const p = JSON.parse(localStorage.getItem(LS_P) || 'null'); if (p && p.v === 1) { if (!p.order) p.order = 'koch'; setOrder(p.order); P = Object.assign(newProgress(p.order), p); } } catch (e) {}
  setOrder(P.order);
  if (!S.lang) { S.lang = detectLang(); saveS(); }
  setLang(S.lang, false);
  if (raw && raw.sv !== 2) { if (S.glen === 4) S.glen = 5; if (S.plen === 4) S.plen = 5; S.sv = 2; saveS(); }
  migrate();
}
/* Whoever had finished the alphabet in an earlier version starts phase 2 right away */
function migrate() {
  if (P.workshopReady) { P.bandReady = P.bandReady || P.workshopReady; delete P.workshopReady; saveP(); }
  if (!P.exam) P.exam = {passes:[]};
  if (!P.fixedSpeed && P.ewpm < AUTO_MIN) { P.ewpm = AUTO_MIN; saveP(); }
  if (P.bandReady && !P.vocab) { startPhase4(P); saveP(); }
  if (!P.vstats) P.vstats = {};
  if (!P.log) P.log = [];
  if (P.alphabetDone && P.known === N1 && !P.introQueue.length) { const nk = nextKnown(P); P.introQueue = KOCH.slice(N1, nk).split(''); P.known = nk; P.okRun = 0; saveP(); }
}
const saveS = () => { try { localStorage.setItem(LS_S, JSON.stringify(S)); } catch (e) {} };
const saveP = () => { try { localStorage.setItem(LS_P, JSON.stringify(P)); } catch (e) {} };
const today = () => fmtDate(new Date());
const listenTxt = () => { const m = Math.round(P.listenMin || 0); return Math.floor(m / 60) + tx(' u ') + (m % 60) + ' min'; };
const fmt = (x, d = 0) => x.toLocaleString(LOCALE[LANG] || 'nl-BE', {minimumFractionDigits:d, maximumFractionDigits:d});
const sleep = ms => new Promise(r => setTimeout(r, ms));   /* only for screen pauses, never for audio timing */
const esc = c => c === '<' ? '&lt;' : c === '&' ? '&amp;' : c;
/* A character as HTML: prosigns with a bar on top, = with a small BT underneath */
const h = c => PS[c] ? '<span class="ps">' + PS[c] + '</span>' : c === '=' ? '<span class="eq">=<small>BT</small></span>' : esc(c);

