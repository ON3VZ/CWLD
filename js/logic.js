/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Learning rules without any screen or audio: progress object, groups, alignment, scoring, unlocking,
   speed, streak, final test and logbook. Tested in node (see the test scripts). */
'use strict';
let KOCH = SEQ_KOCH;
function setOrder(o) { KOCH = o === 'koch' ? SEQ_KOCH : SEQ_FAM; }
function bounds(o) { if (o === 'koch') return null; let t = 0; return FAMILIES.map(f => (t += f.length)); }
function startKnown(o) { return o === 'koch' ? 2 : FAMILIES[0].length; }
/* Next step: one character (Koch) or the next family */
function nextKnown(P) { const b = bounds(P.order); if (!b) return P.known + 1; return b.find(x => x > P.known) || KOCH.length; }
/* Switch to another order: only characters you already knew stay known, nothing new without an introduction */
function switchOrder(P, o) {
  const had = new Set(KOCH.slice(0, P.known).split('').filter(c => !P.introQueue.includes(c)));
  P.order = o; setOrder(o);
  let k = 0; while (k < KOCH.length && had.has(KOCH[k])) k++;
  const b = bounds(o); if (b) k = [0].concat(b).filter(x => x <= k).pop();
  const st = startKnown(o);
  if (k < st) { P.known = st; P.introQueue = KOCH.slice(0, st).split('').filter(c => !had.has(c)); }
  else { P.known = k; P.introQueue = []; }
  P.okRun = 0; P.alphabetDone = P.known > N1 || (P.known === N1 && P.alphabetDone); P.phase2Done = false;
}
const lab = c => PS[c] || c;
const wordLab = w => [...w].map(c => PS[c] ? ' ' + PS[c] : c).join('').trim();
/* Syllables to say along: di (short), dah (long), dit (short at the end) */
function syl(c) {
  const m = MORSE[c]; if (!m) return '';
  return [...m].map((x, i) => x === '-' ? 'dah' : (i === m.length - 1 ? 'dit' : 'di')).join('-');
}
function startPhase4(P) {
  if (!P.vocabQueue) P.vocabQueue = [];
  if (!P.vocab) { P.vocab = Math.min(V_STEP, VOCAB.length); P.vocabQueue = VOCAB.slice(0, P.vocab).map(v => v.w); }
}
function knownVocab(P) { return VOCAB.slice(0, P.vocab || 0).map(v => v.w).filter(w => !(P.vocabQueue || []).includes(w)); }
function vacc(P, w) { const s = P.vstats && P.vstats[w]; return s && s.length ? s.reduce((a, b) => a + b, 0) / s.length : null; }
function pickVocab(P, pool, rnd, recent) {
  const fresh = VOCAB.slice(Math.max(0, (P.vocab || 0) - 2 * V_STEP), P.vocab || 0).map(v => v.w);
  const w = x => {
    if (recent && recent.includes(x)) return 0.15;
    const a = vacc(P, x), n = P.vstats && P.vstats[x] ? P.vstats[x].length : 0;
    let k = fresh.includes(x) ? 2 : 1;
    if (a !== null && n >= 3 && a < 0.8) k = Math.max(k, 2.5);
    return k;
  };
  return pick(pool, w, rnd);
}
function eligibleLines(kv) {
  const ks = new Set(kv);
  return LINES.filter(l => l.split(' ').every(x => !VSET.has(x) || ks.has(x)) && (!l.includes('{R}') || (ks.has('599') && ks.has('5NN'))));
}
function qsoLine(kv, rnd) {
  const ok = eligibleLines(kv);
  if (!ok.length) return null;
  const one = a => a[Math.floor(rnd() * a.length)];
  const calls = callsigns(new Set(SEQ_KOCH.split('')), rnd, 6).filter(c => !c.includes('/'));
  const A = calls[0] || 'ON4ABC', B = calls.find(c => c !== A) || 'DL1XYZ';
  const map = {'{A}':A, '{B}':B, '{N}':one(NAMES), '{Q}':one(CITIES), '{R}':one(['599', '579', '559', '5NN'])};
  const words = one(ok).split(' ').map(x => map[x] || x);
  return {words, groups:words.map(w => [...w]), tokens:words.join('').split('')};
}
function lineMeaning(words, mf) {
  mf = mf || (w => MEANING[w]);
  const seen = new Set(), out = [];
  words.forEach(w => { if (MEANING[w] && !seen.has(w)) { seen.add(w); out.push(wordLab(w) + ': ' + mf(w)); } });
  return out.join(' · ');
}
function bandFor(lv, rnd) {
  const b = BAND_LV[lv]; if (!b) return null;
  return {noise:b.noise, sig:b.sig, qsb:Math.min(b.qsb, b.sig - 0.1), qsbRate:0.08 + rnd() * 0.22,
          qrm:b.qrm ? b.qrm * (0.5 + rnd() * 0.5) : 0, qrmOff:(rnd() < 0.5 ? -1 : 1) * (120 + rnd() * 280), qrmWpm:16 + Math.floor(rnd() * 14),
          chirp:rnd() < 0.35 ? b.chirp : 0, fist:b.fist * (0.5 + rnd() * 0.5), pitch:Math.round((rnd() * 2 - 1) * b.pitch)};
}
function isCall(w) { return /^[A-Z]{1,2}[0-9][A-Z]{1,3}(\/[PM])?$/.test(w); }
function callsigns(knownSet, rnd, n) {
  const letters = [...knownSet].filter(c => /[A-Z]/.test(c));
  const pre = PREFIXES.filter(p => [...p].every(c => knownSet.has(c)));
  if (!pre.length || letters.length < 2) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    let w = pre[Math.floor(rnd() * pre.length)];
    const k = 2 + Math.floor(rnd() * 2);
    for (let j = 0; j < k; j++) w += letters[Math.floor(rnd() * letters.length)];
    if (knownSet.has('/') && rnd() < 0.25) { const sfx = ['P', 'M'].filter(c => knownSet.has(c)); if (sfx.length) w += '/' + sfx[Math.floor(rnd() * sfx.length)]; }
    if (w.length <= 8) out.push(w);
  }
  return out;
}

function newProgress(order) {
  order = order || 'koch';
  const st = startKnown(order);
  return {v:1, order, known:st, introQueue:(order === 'koch' ? SEQ_KOCH : SEQ_FAM).slice(0, st).split(''), okRun:0, hi:0, lo:0, ewpm:10, fixedSpeed:false,
          stats:{}, conf:{}, sessions:[], days:{}, lastDate:null, gapApplied:null, alphabetDone:false, listenMin:0,
          phase2Done:false, exam:{passes:[]}, bandReady:null, vocab:0, vocabQueue:[], vstats:{}, log:[], bandMin:0};
}

/* Alignment: one missed character does not make the rest of the group wrong. */
function align(exp, typ) {
  const n = exp.length, m = typ.length;
  const D = Array.from({length:n + 1}, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) D[i][0] = i;
  for (let j = 0; j <= m; j++) D[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const sub = D[i-1][j-1] + (exp[i-1] === typ[j-1] ? 0 : 1);
    D[i][j] = Math.min(sub, D[i-1][j] + 1, D[i][j-1] + 1);
  }
  const res = new Array(n);
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i-1][j-1] + (exp[i-1] === typ[j-1] ? 0 : 1)) {
      res[i-1] = {ok: exp[i-1] === typ[j-1], typed: typ[j-1]}; i--; j--;
    } else if (i > 0 && D[i][j] === D[i-1][j] + 1) {
      res[i-1] = {ok:false, typed:null}; i--;
    } else { j--; }
  }
  return res;
}

function acc(P, c) {
  const h = P.stats[c] && P.stats[c].h;
  if (!h || !h.length) return null;
  return h.reduce((a, b) => a + b, 0) / h.length;
}
function weightOf(P, c, recent) {
  let w = 1;
  if (recent.includes(c)) w = 2;
  const a = acc(P, c), n = P.stats[c] ? P.stats[c].h.length : 0;
  if (a !== null && n >= 10) { if (a < 0.7) w = Math.max(w, 3); else if (a < 0.85) w = Math.max(w, 2.5); }
  return w;
}
function pick(pool, weightFn, rnd) {
  const ws = pool.map(weightFn), tot = ws.reduce((a, b) => a + b, 0);
  let r = rnd() * tot;
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
/* A random group: weights favour new and weak characters, now and then a pair that is often confused */
function randomGroup(P, pool, len, rnd) {
  const recent = KOCH.slice(Math.max(0, P.known - 2), P.known).split('');
  const w = c => weightOf(P, c, recent);
  const g = [];
  const pairs = Object.keys(P.conf).filter(k => P.conf[k] >= 2).map(k => k.split('>'))
    .filter(([a, b]) => pool.includes(a) && pool.includes(b));
  if (pairs.length && rnd() < 0.25 && len >= 2) {
    const pr = pairs[Math.floor(rnd() * pairs.length)];
    g.push(pr[0], pr[1]);
  }
  let guard = 0;
  while (g.length < len && guard++ < 200) {
    const c = pick(pool, w, rnd);
    const n = g.length;
    if (pool.length > 1 && n >= 2 && g[n-1] === c && g[n-2] === c) continue;
    if (pool.length > 1 && n >= 1 && g[n-1] === c && rnd() < 0.6) continue;
    g.push(c);
  }
  /* Phase 2: at least one digit, punctuation mark or prosign per group, at most half */
  const p2 = pool.filter(c => P2.includes(c)), p1 = pool.filter(c => !P2.includes(c));
  if (p2.length && p1.length && g.length >= 2) {
    const idx = () => g.map((c, i) => P2.includes(c) ? i : -1).filter(i => i >= 0);
    if (!idx().length) g[Math.floor(rnd() * g.length)] = pick(p2, w, rnd);
    const max = Math.max(1, Math.floor(g.length / 2));
    let ix = idx(), guard2 = 0;
    while (ix.length > max && guard2++ < 50) { g[ix[Math.floor(rnd() * ix.length)]] = pick(p1, w, rnd); ix = idx(); }
  }
  for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
  return g;
}
/* A short group with the new character (at least one, about half) */
function introGroup(pool, news, len, rnd) {
  const g = [];
  for (let i = 0; i < len; i++) {
    const useNew = i === 0 ? true : rnd() < 0.5;
    const src = useNew || pool.length === 0 ? news : pool;
    g.push(src[Math.floor(rnd() * src.length)]);
  }
  for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
  return g;
}
function meaningfulShare(known) { return known < 8 ? 0 : known < 21 ? 0.2 : 0.3; }
function availableWords(knownSet) {
  return WORDS.filter(w => w.length >= 2 && w.length <= 8 && [...w].every(ch => knownSet.has(ch)));
}
function weakest(P, chars, k) {
  const att = c => P.stats[c] ? P.stats[c].h.length : 0;
  const cand = chars.filter(c => att(c) >= 5);
  if (cand.length < Math.min(k, chars.length)) return chars.slice(-Math.min(k, chars.length));
  return cand.sort((a, b) => acc(P, a) - acc(P, b)).slice(0, k);
}

/* Dates and streak */
function fmtDate(d) {
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
function calcStreak(days, today) {
  const ok = d => (days[d] || 0) >= 10;
  const base = parseDate(today);
  let streak = 0, lastFree = -99;
  for (let k = 0; k < 400; k++) {
    const d = new Date(base); d.setDate(d.getDate() - k);
    const ds = fmtDate(d);
    if (ok(ds)) { streak++; continue; }
    if (k === 0) continue;                       /* today is still open */
    const prev = new Date(base); prev.setDate(prev.getDate() - k - 1);
    if (k - lastFree >= 7 && ok(fmtDate(prev))) { lastFree = k; continue; }   /* one free day per week */
    break;
  }
  return streak;
}

/* Plan for a session, following the design (breaks, test mode) */
function makePlan(P, today, test) {
  const missed = P.lastDate ? Math.max(0, daysBetween(P.lastDate, today) - 1) : 0;
  const plan = {missed, warm:test ? 20 : 120, b2:test ? 20 : 120, b3:test ? 40 : 480, b4:test ? 20 : 180,
                ewpmAdj:0, suppressIntro:false, minTokens:test ? 15 : 100, hadIntro:false, notes:[]};
  if (missed >= 2 && missed <= 6) {
    plan.warm = test ? 30 : 240; plan.ewpmAdj = -1;
    plan.suppressIntro = P.introQueue.length > 0;
    plan.notes.push('Je was ' + missed + ' dagen weg. We starten met meer opwarming en iets lagere snelheid' + (plan.suppressIntro ? ', en het nieuwe teken wacht nog een sessie.' : '.'));
  }
  if (missed >= 7 && P.gapApplied !== today) {
    if (P.order === 'koch' && P.known > 2) P.known--;
    P.introQueue = P.introQueue.filter(c => KOCH.indexOf(c) < P.known);
    P.okRun = 0; P.gapApplied = today;
    plan.notes.push('Na ' + missed + ' dagen pauze herhalen we eerst. ' + (P.order === 'koch' ? 'Het laatste teken moet je opnieuw met 90% halen.' : 'Je moet opnieuw 90% halen voor de volgende familie.'));
  } else if (missed >= 7) {
    plan.notes.push('Na een lange pauze herhalen we eerst.');
  }
  return plan;
}

/* End of a session: statistics, unlocking and speed */
function addStats(P, r) {
  for (const [c, ok] of r.perChar) {
    const s = P.stats[c] || (P.stats[c] = {h:[]});
    s.h.push(ok ? 1 : 0); if (s.h.length > 50) s.h.shift();
  }
  for (const [w, ok] of (r.vres || [])) {
    const s = P.vstats[w] || (P.vstats[w] = []);
    s.push(ok ? 1 : 0); if (s.length > 10) s.shift();
  }
  for (const [e, t] of r.conf) {
    if (t === MISS || e === t) continue;
    const k = e + '>' + t; P.conf[k] = (P.conf[k] || 0) + 1;
  }
}
function finishSession(P, r, plan, today, cwpm) {
  const out = {valid:false, unlocked:null, speed:0, alphabetDone:false, phase2Done:false, score:0, vocabUnlocked:null};
  if (!P.vstats) P.vstats = {};
  addStats(P, r);
  out.score = r.tokens ? r.correct / r.tokens : 0;
  out.valid = r.tokens >= plan.minTokens;
  P.days[today] = (P.days[today] || 0) + r.minutes;
  P.listenMin = (P.listenMin || 0) + (r.listen || 0);
  if (r.tokens > 0 || r.minutes > 0.5) P.lastDate = today;
  if (out.valid) {
    if (P.introQueue.length === 0) {
      if (out.score >= 0.9) P.okRun++; else P.okRun = 0;
      if (P.okRun >= 1) {
        if (P.known === N1 && !P.alphabetDone) { P.alphabetDone = true; out.alphabetDone = true; }
        if (P.known < KOCH.length) { const nk = nextKnown(P); const add = KOCH.slice(P.known, nk).split(''); P.known = nk; P.introQueue.push(...add); P.okRun = 0; out.unlocked = add.join(''); }
        else if (!P.phase2Done) { P.phase2Done = true; out.phase2Done = true; P.okRun = 0; }
      }
    }
    /* Phase 4: 90% in a valid session unlocks the next abbreviations */
    if (P.bandReady && !(P.vocabQueue || []).length && out.score >= 0.9 && (P.vocab || 0) < VOCAB.length) {
      const add = VOCAB.slice(P.vocab, P.vocab + V_STEP).map(v => v.w);
      P.vocab += add.length; P.vocabQueue = add.slice(); out.vocabUnlocked = add;
    }
    if (!P.fixedSpeed && plan.ewpmAdj === 0) {
      if (out.score >= 0.95) { P.hi++; P.lo = 0; }
      else if (out.score < 0.8) { P.lo++; P.hi = 0; }
      else { P.hi = 0; P.lo = 0; }
      if (P.hi >= 2 && !out.unlocked && !plan.hadIntro) { if (P.ewpm < cwpm) { P.ewpm++; out.speed = 1; } P.hi = 0; }
      if (P.lo >= 2) { if (P.ewpm > AUTO_MIN) { P.ewpm--; out.speed = -1; } P.lo = 0; }
    }
    P.sessions.push({d:today, s:Math.round(out.score * 1000) / 10, n:r.tokens, k:P.known - (out.unlocked ? 1 : 0), c:cwpm, e:r.ewpm, m:Math.round(r.minutes * 10) / 10});
    if (P.sessions.length > 80) P.sessions.shift();
  }
  return out;
}
/* Final test: does not change level or speed. P.bandReady is the storage key of the milestone 'Ready for the band' */
function weakChars(P) { return KOCH.split('').filter(c => { const a = acc(P, c), n = P.stats[c] ? P.stats[c].h.length : 0; return a !== null && n >= 10 && a < 0.85; }); }
function finishExam(P, r, today, minTokens) {
  addStats(P, r);
  P.days[today] = (P.days[today] || 0) + r.minutes;
  if (r.tokens > 0) P.lastDate = today;
  if (!P.exam) P.exam = {passes:[]};
  const out = {score:r.tokens ? r.correct / r.tokens : 0, valid:r.tokens >= minTokens, pass:false, ready:false, weak:weakChars(P)};
  out.pass = out.valid && out.score >= 0.9 && out.weak.length === 0;
  if (out.pass && !P.exam.passes.includes(today)) P.exam.passes.push(today);
  if (out.pass && P.exam.passes.length >= 2 && !P.bandReady) { P.bandReady = today; out.ready = true; startPhase4(P); }
  return out;
}
/* Listening log: real listening on the bands counts for the streak */
function addLog(P, e) {
  if (!P.log) P.log = [];
  const m = Math.max(1, Math.min(600, Math.round(+e.min || 0)));
  const item = {id:Date.now().toString(36) + Math.floor(Math.random() * 1e4), d:e.d, band:e.band, min:m, kind:e.kind, note:(e.note || '').slice(0, 200)};
  P.log.push(item); P.log.sort((a, b) => a.d < b.d ? 1 : a.d > b.d ? -1 : 0);
  P.days[e.d] = (P.days[e.d] || 0) + m; P.bandMin = (P.bandMin || 0) + m;
  return item;
}
function delLog(P, id) {
  const i = (P.log || []).findIndex(x => x.id === id); if (i < 0) return false;
  const e = P.log[i]; P.log.splice(i, 1);
  P.days[e.d] = Math.max(0, (P.days[e.d] || 0) - e.min); P.bandMin = Math.max(0, (P.bandMin || 0) - e.min);
  return true;
}

