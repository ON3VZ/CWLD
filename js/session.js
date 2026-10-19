/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Sessions: the daily session in blocks and rounds, free practice, final test, paper mode,
   listening only, results. */
'use strict';
/* ============================================================
   SESSION
   ============================================================ */
let sess = null, ans = null;
const kbState = {chars:[]};

/* AZERTY from phase 2 on: fixed positions, unknown keys stay empty */
const AZ = ['1234567890', 'AZERTYUIOP', 'QSDFGHJKLM', 'WXCVBN,.?/', '=+(%'];
const QW = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL?', 'ZXCVBNM,./', '=+(%'];
const kbRows = () => LANG === 'en' ? QW : AZ;
function renderKb() {
  const kb = $('kb'); kb.innerHTML = '';
  const az = kbState.chars.some(c => P2.includes(c));
  kb.classList.toggle('az', az);
  const add = c => {
    const b = document.createElement('button');
    if (!kbState.chars.includes(c)) { b.className = 'key ghost'; b.disabled = true; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
    else { b.className = 'key'; b.innerHTML = h(c); b.dataset.c = c; b.id = 'key-' + c; b.setAttribute('aria-label', lab(c)); b.addEventListener('click', () => typeChar(c)); }
    if (az && kbRows()[4].includes(c)) b.classList.add('wide');
    kb.appendChild(b);
  };
  if (az) kbRows().forEach(r => [...r].forEach(add));
  else kbState.chars.forEach(add);
}
function setKb(enabled) {
  document.querySelectorAll('#kb .key:not(.ghost), #kMis, #kBack, #kDone').forEach(b => { b.disabled = !enabled; });
  $('kAgain').disabled = !enabled;
}
function renderBoxes(n, typed, res) {
  const el = $('boxes'); el.innerHTML = ''; el.classList.toggle('many', n > 6);
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'box';
    if (res) { d.classList.add(res[i].ok ? 'ok' : 'bad'); d.innerHTML = h(res[i].typed || MISS); }
    else { d.innerHTML = typed[i] ? h(typed[i]) : ''; if (i === typed.length) d.classList.add('cur'); }
    el.appendChild(d);
  }
}
function typeChar(c) {
  if (!ans || !ans.open) return;
  ans.typed.push(c);
  renderBoxes(ans.n, ans.typed);
  if (ans.typed.length >= ans.n) finishAnswer({});
}
function finishAnswer(o) {
  if (!ans || !ans.open) return;
  ans.open = false;
  const r = ans.resolve; const typed = ans.typed.slice();
  setKb(false);
  r({typed, ...o});
}
function getAnswer(n) {
  return new Promise(resolve => { ans = {n, typed:[], open:true, resolve}; renderBoxes(n, []); });
}
$('kMis').addEventListener('click', () => typeChar(MISS));
$('kBack').addEventListener('click', () => { if (ans && ans.open && ans.typed.length) { ans.typed.pop(); renderBoxes(ans.n, ans.typed); } });
$('kDone').addEventListener('click', () => { if (ans && ans.open && ans.typed.length) finishAnswer({}); });
$('kAgain').addEventListener('click', () => { if (ans && ans.open) finishAnswer({replay:true}); });
document.addEventListener('keydown', e => {
  if ($('v-session').hidden || !ans || !ans.open || e.ctrlKey || e.metaKey || e.altKey) return;
  let k = e.key.toUpperCase();
  if (k === '+' || k === '(' || k === '%') k = '';
  if (k.length === 1 && kbState.chars.includes(k)) { e.preventDefault(); typeChar(k); }
  else if (e.key === 'Backspace') { e.preventDefault(); $('kBack').click(); }
  else if (e.key === 'Enter') { e.preventDefault(); $('kDone').click(); }
});

function status(t) { $('sStatus').textContent = t; }
function panel(n) { const ids = {play:'sPlay', intro:'sIntro', paper:'sPaper', listen:'sListen', 'break':'sBreak'}; Object.keys(ids).forEach(k => { $(ids[k]).hidden = k !== n; }); }
function showPlay(on) { panel(on ? 'play' : 'intro'); }
let blockTimer = 0;
/* Block x of y: the blocks of the session are decided in advance in sess.blocks */
function blockTitle(label) { return sess && sess.bn > 1 && sess.bi ? tx('Blok ') + sess.bi + tx(' van ') + sess.bn + ' \u00b7 ' + label : label; }
function showTotal(blockLeft) {
  if (!sess || !sess.blocks || sess.bn < 2) { $('sTotal').textContent = ''; return; }
  let t = blockLeft + (sess.extra || 0); for (let i = sess.bi; i < sess.blocks.length; i++) t += sess.blocks[i].secs;
  $('sTotal').textContent = tx('Sessie: nog ongeveer ') + Math.max(1, Math.ceil(t / 60)) + tx(' min te gaan');
}
function startBlockTimer(secs) {
  clearInterval(blockTimer);
  const t0 = performance.now();
  const upd = () => {
    const left = Math.max(0, secs - (performance.now() - t0) / 1000);
    $('sTime').textContent = Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0');
    $('sBar').style.width = Math.min(100, (1 - left / secs) * 100) + '%';
    showTotal(left);
  };
  upd(); blockTimer = setInterval(upd, 250);
  return t0;
}

async function runGroup(g, ew, scored) {
  const n = g.tokens.length;
  $('expected').textContent = ''; $('meaning').textContent = '';
  renderBoxes(n, []);
  let replayed = false, a;
  for (;;) {
    let ap = null;
    if (S.live) {
      /* Tap along: the keyboard is active while the group is playing */
      status(tx('Luister en tik mee')); setKb(true); $('kAgain').disabled = true;
      const pp = playP([g.tokens], ew);
      ap = getAnswer(n);
      const r = await pp;
      if (r === 'stopped' || sess.abort) { if (ans && ans.open) { ans.open = false; ans.resolve({abort:true, typed:[]}); } return; }
      if (ans && ans.open) { status(tx('Tik wat je hoorde')); $('kAgain').disabled = false; }
    } else {
      setKb(false); status(tx('Luister...'));
      if (await playP([g.tokens], ew) === 'stopped' || sess.abort) return;
      status(tx('Tik wat je hoorde')); setKb(true);
      ap = getAnswer(n);
    }
    a = await ap;
    if (a.abort || sess.abort) return;
    if (a.replay) { replayed = true; continue; }
    break;
  }
  const res = align(g.tokens, a.typed);
  const correct = res.filter(x => x.ok).length;
  const all = correct === n;
  Engine.tick(all && !replayed);
  renderBoxes(n, a.typed, res);
  status(all ? (replayed ? tx('Juist, maar herhaald telt als fout') : tx('Juist')) : tx('Bijna, kijk even'));
  if (!all) $('expected').innerHTML = tx('Juist was ') + g.tokens.map(c => '<b>' + h(c) + '</b>').join('');
  if (g.word && (MEANING[g.word] || isCall(g.word))) $('meaning').textContent = wordLab(g.word) + ': ' + (MEANING[g.word] ? mean(g.word) : tx('roepnaam'));
  if (scored) {
    sess.tokens += n;
    if (!replayed) {
      sess.correct += correct;
      res.forEach((x, i) => { sess.perChar.push([g.tokens[i], x.ok]); if (!x.ok && x.typed) sess.conf.push([g.tokens[i], x.typed]); });
      if (g.word && VSET.has(g.word) && sess.vres) sess.vres.push([g.word, all]);
    }
  }
  await sleep(all ? 800 : 1700);
}

async function groupsBlock(label, secs, scored, gen, ew) {
  $('sBlock').textContent = blockTitle(label);
  $('sScored').textContent = (scored ? tx('Dit blok telt mee') : tx('Oefenblok, telt niet mee')) + (sess.band ? tx('. Band: ') + tx(BAND_NAMES[sess.band]).toLowerCase() : '');
  showPlay(true); setKb(false); renderBoxes(0, []);
  $('expected').textContent = ''; $('meaning').textContent = '';
  status(label); await sleep(1400);
  if (sess.abort) return;
  const t0 = startBlockTimer(secs);
  while (!sess.abort && (performance.now() - t0) / 1000 < secs) await runGroup(gen(), ew, scored);
  sess.minutes += (performance.now() - t0) / 60000;
}
/* The scoring block in short rounds with a rest in between */
async function roundsBlock(label, total, scored, gen, ew) {
  const rl = S.test ? 10 : (S.round === '2' ? 120 : 60);
  const n = Math.max(1, Math.round(total / rl));
  for (let r = 1; r <= n && !sess.abort; r++) {
    sess.extra = (n - r) * rl;
    await groupsBlock(label + ' \u00b7 ' + tx('ronde ') + r + tx(' van ') + n, rl, scored, gen, ew);
    if (r < n && !sess.abort) await roundPause(r, n);
  }
  sess.extra = 0;
}
async function roundPause(r, n) {
  clearInterval(blockTimer);
  $('sBlock').textContent = tx('Pauze'); $('sTime').textContent = ''; $('sBar').style.width = '100%'; $('sScored').textContent = '';
  showTotal(0);
  $('brkDone').textContent = tx('Ronde ') + r + tx(' van ') + n + tx(' klaar');
  $('brkNext').textContent = tx('Volgend: ronde ') + (r + 1);
  const pct = sess.tokens ? Math.round(100 * sess.correct / sess.tokens) : 0;
  $('brkInfo').textContent = tx('Tot nu toe ') + pct + tx('% juist. Neem even rust. Jij bepaalt wanneer de volgende ronde start.');
  panel('break'); setKb(false);
  Engine.tick(true);
  await waitClick('brkGo');
}
async function isleep(ms) { const t0 = performance.now(); while (performance.now() - t0 < ms && sess && !sess.abort && !sess.skipI) await sleep(Math.min(100, ms)); }
async function introChar(c, ew) {
  $('sBlock').textContent = blockTitle(tx('Nieuw teken')); $('sScored').textContent = ''; showTotal(sess.blocks && sess.blocks[sess.bi - 1] ? sess.blocks[sess.bi - 1].secs : 0);
  sess.skipI = false; showPlay(false); $('introBig').classList.remove('word');
  if (S.dd) {
    $('introBig').innerHTML = h(c);
    $('introText').textContent = tx('Nieuw teken: ') + sylL(c).toUpperCase() + tx('. Luister en zeg het hardop mee.');
    await isleep(1800); if (sess.abort || sess.skipI) return;
    if (await playP([[c], [c], [c], [c]], ew) === 'stopped' || sess.abort || sess.skipI) return;
    await isleep(1000); if (sess.abort || sess.skipI) return;
  }
  $('introBig').textContent = ''; $('introText').textContent = tx('Nu zonder hulp. Luister naar het ritme.');
  await isleep(1200); if (sess.abort || sess.skipI) return;
  if (await playP([[c], [c], [c]], ew) === 'stopped' || sess.abort || sess.skipI) return;
  $('introBig').innerHTML = h(c);
  $('introText').textContent = (INFO[c] ? tx('Dit is ') + tx(INFO[c]) : tx('Dit is de ') + c) + tx('. Zeg het ritme hardop mee.');
  await isleep(1000); if (sess.abort || sess.skipI) return;
  if (await playP([[c], [c], [c], [c], [c]], ew) === 'stopped' || sess.abort || sess.skipI) return;
  await isleep(800);
}

/* Phase 4: introduce a new abbreviation. First only hear it, then see it with its meaning and say it along. */
async function introVocab(w, ew) {
  $('sBlock').textContent = blockTitle(tx('Nieuwe afkorting')); $('sScored').textContent = ''; showTotal(sess.blocks && sess.blocks[sess.bi - 1] ? sess.blocks[sess.bi - 1].secs : 0);
  sess.skipI = false; showPlay(false); $('introBig').classList.add('word');
  $('introBig').textContent = ''; $('introText').textContent = tx('Een nieuwe afkorting. Luister.');
  await isleep(1200); if (sess.abort || sess.skipI) return;
  const t = [...w];
  if (await playP([t, t], ew) === 'stopped' || sess.abort || sess.skipI) return;
  $('introBig').innerHTML = t.map(h).join('');
  $('introText').textContent = wordLab(w) + ': ' + mean(w) + tx('. Zeg het hardop mee.');
  await isleep(1500); if (sess.abort || sess.skipI) return;
  if (await playP([t, t, t], ew) === 'stopped' || sess.abort || sess.skipI) return;
  await isleep(800);
}
/* Phase 4, scoring block: abbreviations, call signs and mixed groups with all characters */
function makeGen4(all, kv, rnd) {
  const ks = new Set(all), recent = [];
  return () => {
    const r = rnd();
    if (kv.length && r < 0.45) { const w = pickVocab(P, kv, rnd, recent); recent.push(w); if (recent.length > 4) recent.shift(); return {tokens:[...w], word:w}; }
    if (r < 0.6) { const c = callsigns(ks, rnd, 1)[0]; if (c) return {tokens:[...c], word:c}; }
    return {tokens:randomGroup(P, all, +S.glen, rnd)};
  };
}
/* Phase 4, listening: pieces of QSOs, alternated with single abbreviations and call signs */
function makeLineGen(all, kv, rnd) {
  const g4 = makeGen4(all, kv, rnd);
  return () => {
    if (rnd() < 0.65) { const l = qsoLine(kv, rnd); if (l) return l; }
    return g4();
  };
}
function makeGen(all, words, share, rnd) {
  const recent = [];
  return (len, fixed) => {
    const pool = fixed ? words.filter(w => w.length === len) : words;
    if (share > 0 && pool.length && rnd() < share) {
      let w, tries = 0;
      do { w = pool[Math.floor(rnd() * pool.length)]; } while (recent.includes(w) && tries++ < 20);
      recent.push(w); if (recent.length > 8) recent.shift();
      return {tokens:[...w], word:w};
    }
    return {tokens:randomGroup(P, all, len, rnd)};
  };
}
/* Break screen: the user decides when the next block starts */
async function pauseBetween(done, next) {
  clearInterval(blockTimer);
  $('sBlock').textContent = tx('Pauze'); $('sTime').textContent = ''; $('sBar').style.width = '100%'; $('sScored').textContent = '';
  showTotal(0);
  $('brkDone').textContent = tx('Blok ') + (sess.bi - 1) + tx(' van ') + sess.bn + tx(' klaar');
  $('brkNext').textContent = tx('Volgend: ') + next.label;
  const mins = Math.max(1, Math.round(next.secs / 60));
  $('brkInfo').textContent = (next.scored ? tx('Dit blok telt mee.') : next.id === 'b4' ? tx('Dit is het luisterblok. Je hoeft niets te typen.') : tx('Dit blok telt niet mee.')) + ' ' + tx('Ongeveer ') + mins + ' min. ' + tx('Jij bepaalt wanneer het volgende blok start.');
  panel('break'); setKb(false);
  Engine.tick(true);
  await waitClick('brkGo');
}
async function runSession(exam) {
  Engine.init();
  if (exam === true) return runExam();
  const plan = makePlan(P, today(), S.test);
  saveP();
  const mode = S.mode;
  const hold = (plan.suppressIntro || mode === 'luister') ? P.introQueue.slice() : [];
  const news = hold.length ? [] : P.introQueue.slice();
  const all = KOCH.slice(0, P.known).split('').filter(c => !hold.includes(c));
  const oldChars = all.filter(c => !news.includes(c));
  if (all.length < 2) { go('home'); return; }
  const floor = P.fixedSpeed ? MIN_EWPM : AUTO_MIN;
  const ew = Math.max(floor, Math.min(P.ewpm + plan.ewpmAdj, S.cwpm));
  const warmEw = Math.max(floor, ew - 2);
  plan.hadIntro = news.length > 0;
  /* A new character: back to rounds of 1 minute, and 3 good sessions are needed again for 2 minutes */
  let roundDown = false;
  if (news.length && mode !== 'luister') { if (S.round === '2') roundDown = true; S.round = '1'; saveS(); P.rgood = 0; saveP(); }
  sess = {roundDown, abort:false, tokens:0, correct:0, perChar:[], conf:[], vres:[], minutes:0, ewpm:ew, plan, mode, release:null, paused:false, pausedMs:0, pauseAt:null, band:0, bandUsed:0};
  kbState.chars = all; renderKb(); panel('play');
  const p4 = ph4();
  const lv = p4 ? (+S.band || 0) : 0;
  const news4 = p4 && !plan.suppressIntro && mode !== 'luister' ? (P.vocabQueue || []).slice() : [];
  const kvOld = p4 ? knownVocab(P) : [];
  go('session'); $('stopBox').hidden = true; wake(S.wake);
  const len = +S.glen;
  const rnd = Math.random;
  const kvSet = new Set(kvOld);
  const words = availableWords(new Set(all)).filter(w => !p4 || !VSET.has(w) || kvSet.has(w)).concat(callsigns(new Set(all), rnd, 30));
  const gen = makeGen(all, words, meaningfulShare(P.known), rnd);
  const gen4 = p4 ? makeGen4(all, kvOld, rnd) : null;
  const lineGen = p4 ? makeLineGen(all, kvOld, rnd) : null;

  /* Decide the blocks in advance, so the screen can show "Block x of y" and there is a break screen between blocks */
  const b2Kind = mode === 'luister' ? '' : news4.length ? 'vocab' : news.length ? 'chars' : (oldChars.length >= 3 && P.sessions.length > 0) ? 'weak' : '';
  const introOn = b2Kind === 'vocab' || (b2Kind === 'chars' && !S.skipIntro);
  const b2Practice = b2Kind === 'vocab' || b2Kind === 'weak' || (b2Kind === 'chars' && oldChars.length > 0);
  const blocks = [];
  if (mode !== 'luister') {
    if (oldChars.length >= 2) blocks.push({id:'warm', label:tx('Opwarmen'), secs:plan.warm, scored:false});
    if (introOn || b2Practice) blocks.push({id:'b2', scored:false,
      label:b2Kind === 'vocab' ? (news4.length > 1 ? tx('Nieuwe afkortingen') : tx('Nieuwe afkorting')) : b2Kind === 'chars' ? (news.length > 1 ? tx('Nieuwe tekens') : tx('Nieuw teken')) : tx('Zwakke tekens'),
      secs:(introOn ? 45 * (b2Kind === 'vocab' ? news4.length : news.length) : 0) + (b2Practice ? plan.b2 : 0)});
    blocks.push({id:'b3', scored:true, label:mode === 'papier' ? tx('Op papier') : p4 ? tx('Op de band') : tx('Groepen kopiëren'), secs:plan.b3});
    blocks.push({id:'b4', scored:false, label:tx('Luisteren'), secs:plan.b4});
  }
  sess.blocks = blocks; sess.bn = blocks.length; sess.bi = 0;
  const begin = async id => {
    const i = blocks.findIndex(x => x.id === id); sess.bi = i + 1;
    if (i > 0 && !sess.abort) await pauseBetween(blocks[i - 1], blocks[i]);
    return !sess.abort;
  };

  if (mode === 'luister') {
    sess.band = lv; sess.bandUsed = lv;
    await listenSession(S.test ? 60 : 720, p4 ? lineGen : () => gen(len, false), ew);
  } else {
    /* Block 1: warm-up with known characters, 2 WPM slower */
    if (oldChars.length >= 2 && await begin('warm')) {
      await groupsBlock(tx('Opwarmen'), plan.warm, false, () => ({tokens:randomGroup(P, oldChars, len, rnd)}), warmEw);
    }
    /* Block 2: new character, new abbreviations (phase 4) or weak characters */
    if (!sess.abort && (introOn || b2Practice) && await begin('b2')) {
      if (b2Kind === 'vocab') {
        for (const w of news4) { await introVocab(w, ew); if (sess.abort) break; }
        if (!sess.abort) {
          P.vocabQueue = (P.vocabQueue || []).filter(w => !news4.includes(w)); saveP();
          const pool = kvOld.slice();
          await groupsBlock(news4.length > 1 ? tx('Nieuwe afkortingen') : tx('Nieuwe afkorting'), plan.b2, false, () => {
            const w = rnd() < 0.6 || !pool.length ? news4[Math.floor(rnd() * news4.length)] : pickVocab(P, pool, rnd);
            return {tokens:[...w], word:w};
          }, ew);
          kvOld.push(...news4);
        }
      } else if (b2Kind === 'chars') {
        if (introOn) for (const c of news) { await introChar(c, ew); if (sess.abort) break; }
        if (!sess.abort) {
          P.introQueue = P.introQueue.filter(c => !news.includes(c)); saveP();
          if (b2Practice) await groupsBlock(news.length > 1 ? tx('Nieuwe tekens') : tx('Nieuw teken'), plan.b2, false, () => ({tokens:introGroup(oldChars, news, +S.glen, rnd)}), ew);
        }
      } else if (b2Kind === 'weak') {
        const weak = weakest(P, oldChars, 3);
        await groupsBlock(tx('Zwakke tekens'), plan.b2, false, () => ({tokens:randomGroup(P, weak, len, rnd)}), ew);
      }
    }
    /* No introduction and no practice block needed (e.g. first session with only new characters): the character still counts as introduced */
    if (!sess.abort && b2Kind === 'chars' && P.introQueue.some(c => news.includes(c))) { P.introQueue = P.introQueue.filter(c => !news.includes(c)); saveP(); }
    /* Block 3: copying groups, scored, in the chosen form. Phase 4: with band conditions. */
    if (!sess.abort && await begin('b3')) {
      sess.band = lv; if (lv) sess.bandUsed = lv;
      if (mode === 'papier') await paperBlocks(plan.b3, l => gen(l, true), ew);
      else if (p4) await roundsBlock(tx('Op de band'), plan.b3, true, gen4, ew);
      else await roundsBlock(tx('Groepen kopiëren'), plan.b3, true, () => gen(len, false), ew);
    }
  }
  /* Block 4: listening, 3 minutes, part of every session. Phase 4: pieces of QSOs with band conditions. */
  if (mode !== 'luister' && !sess.abort && await begin('b4')) {
    sess.band = lv;
    await listenSession(plan.b4, p4 ? lineGen : () => gen(len, false), ew, true);
  }
  sess.band = 0;
  clearInterval(blockTimer);
  wake(false);
  Engine.stop(true);
  endSession();
}

/* ---------- Free practice: review and maintenance, does not change level or speed ---------- */
const freeAll = () => KOCH.slice(0, P.known).split('').filter(c => !P.introQueue.includes(c));
const allKnown = () => P.known >= KOCH.length && !P.introQueue.length;
function freeWords(all) {
  const ks = new Set(all);
  const v = allKnown() ? VOCAB.map(x => x.w) : knownVocab(P);
  const w = availableWords(ks).filter(x => !VSET.has(x));
  return {vocab:v.filter(x => [...x].every(c => ks.has(c))), words:w, calls:callsigns(ks, Math.random, 3).length > 0};
}
function freeAvail(k, all) {
  if (all.length < 2) return false;
  if (k === 'words') { const f = freeWords(all); return f.vocab.length + f.words.length >= 5 || f.calls; }
  if (k === 'qso') return allKnown();
  if (k === 'weak') return all.length >= 4;
  return true;
}
function freeEw(sp) {
  const floor = P.fixedSpeed ? MIN_EWPM : AUTO_MIN;
  const e = sp === 'full' ? S.cwpm : sp === 'up' ? P.ewpm + 3 : P.ewpm;
  return Math.max(floor, Math.min(e, S.cwpm));
}
const FREE_INFO = {mix:'Groepen met alle tekens die je kent, ook cijfers, leestekens en prosigns. Je typt wat je hoort.',
  words:'Afkortingen, Q-codes, woorden en roepnamen, zoals op de band. Je typt wat je hoort; daarna zie je de betekenis.',
  qso:"Stukjes QSO met bandcondities. Je luistert, zegt het in je hoofd en ziet daarna de tekst. Je hoeft niets te typen.",
  weak:'Je zwakste tekens komen vaker, gemengd met de rest. Je typt wat je hoort.'};
function renderFree() {
  const all = freeAll();
  $('freeCard').hidden = all.length < 2;
  if ($('freeCard').hidden) return;
  if (!S.frKind || !freeAvail(S.frKind, all)) S.frKind = 'mix';
  if (!S.frDur) S.frDur = '10';
  if (!S.frSpeed) S.frSpeed = 'me';
  document.querySelectorAll('#frKind .chip').forEach(b => { b.disabled = !freeAvail(b.dataset.v, all); b.setAttribute('aria-pressed', String(b.dataset.v === S.frKind)); });
  document.querySelectorAll('#frDur .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(S.frDur))));
  document.querySelectorAll('#frSpeed .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.frSpeed)));
  let info = tx(S.frKind === 'mix' && P.known <= N1 ? 'Groepen met alle tekens die je kent. Je typt wat je hoort.' : FREE_INFO[S.frKind]);
  if (!allKnown()) info += ' ' + tx("QSO's worden beschikbaar zodra alle 44 tekens gekend zijn.");
  $('frInfo').textContent = info;
  $('frSpeedInfo').textContent = tx('Tekens op ') + S.cwpm + tx(' WPM, effectief ') + freeEw(S.frSpeed) + ' WPM.';
}
['frKind', 'frDur', 'frSpeed'].forEach(id => document.querySelectorAll('#' + id + ' .chip').forEach(b => b.addEventListener('click', () => {
  if (b.disabled) return; S[id] = b.dataset.v; saveS(); renderFree();
})));
$('frStart').addEventListener('click', () => runFree());
async function runFree() {
  Engine.init();
  const all = freeAll();
  if (all.length < 2) { go('home'); return; }
  const kind = freeAvail(S.frKind, all) ? S.frKind : 'mix';
  const secs = S.test ? 30 : (+S.frDur || 10) * 60;
  const ew = freeEw(S.frSpeed);
  const rnd = Math.random, len = +S.glen;
  const bandLv = (kind === 'qso' || kind === 'words') ? (+S.band || 0) : 0;
  sess = {free:kind, abort:false, tokens:0, correct:0, perChar:[], conf:[], vres:[], minutes:0, ewpm:ew, plan:{}, mode:'vrij',
          release:null, paused:false, pausedMs:0, pauseAt:null, band:bandLv, bandUsed:bandLv};
  kbState.chars = all; renderKb(); panel('play');
  go('session'); $('stopBox').hidden = true; wake(S.wake);
  const label = tx('Vrij oefenen') + ' \u00b7 ' + tx({mix:'Alles door elkaar', words:'Afkortingen en roepnamen', qso:"QSO's", weak:'Zwakke tekens'}[kind]);
  if (kind === 'qso') {
    const kv = VOCAB.map(x => x.w);
    const lg = makeLineGen(all, kv, rnd);
    await listenSession(secs, lg, ew);
  } else {
    let gen;
    if (kind === 'words') {
      const f = freeWords(all), ks = new Set(all), recent = [];
      gen = () => {
        const r = rnd();
        if (f.vocab.length && r < 0.4) { let w, t = 0; do { w = f.vocab[Math.floor(rnd() * f.vocab.length)]; } while (recent.includes(w) && t++ < 10); recent.push(w); if (recent.length > 5) recent.shift(); return {tokens:[...w], word:w}; }
        if (r < 0.7) { const c = callsigns(ks, rnd, 1)[0]; if (c) return {tokens:[...c], word:c}; }
        if (f.words.length) { const w = f.words[Math.floor(rnd() * f.words.length)]; return {tokens:[...w], word:w}; }
        return {tokens:randomGroup(P, all, len, rnd)};
      };
    } else if (kind === 'weak') {
      const weak = weakest(P, all, 5);
      gen = () => {
        const g = [];
        for (let i = 0; i < len; i++) g.push(rnd() < 0.6 ? weak[Math.floor(rnd() * weak.length)] : all[Math.floor(rnd() * all.length)]);
        return {tokens:g};
      };
    } else gen = () => ({tokens:randomGroup(P, all, len, rnd)});
    await roundsBlock(label, secs, true, gen, ew);
  }
  sess.band = 0;
  clearInterval(blockTimer); wake(false); Engine.stop(true);
  endSession();
}
function endFree() {
  const r = {tokens:sess.tokens, correct:sess.correct, perChar:sess.perChar, conf:sess.conf, vres:sess.vres || [], minutes:sess.minutes, listen:sess.listenAcc || 0};
  const d = today();
  addStats(P, r);
  P.days[d] = (P.days[d] || 0) + r.minutes;
  P.listenMin = (P.listenMin || 0) + r.listen;
  if (r.tokens > 0 || r.minutes > 0.5) P.lastDate = d;
  saveP();
  const kind = sess.free; sess = null;
  lastExam = false; lastFree = true;
  go('result');
  const lis = kind === 'qso';
  $('rMeter').hidden = lis || !r.tokens; $('rMeterLbl').hidden = lis || !r.tokens;
  const pct = r.tokens ? Math.round(100 * r.correct / r.tokens) : 0;
  $('rTitle').textContent = lis ? tx('Goed geluisterd') : tx('Vrij oefenen');
  $('rScore').textContent = lis ? fmt(r.minutes, 0) + ' min' : r.tokens ? pct + '%' : '-';
  $('rFill').style.width = pct + '%';
  const li = [];
  if (!lis) li.push(r.tokens ? r.correct + tx(' van ') + r.tokens + tx(' tekens juist.') : tx('Er werden geen groepen gekopieerd.'));
  else li.push(tx('Dat telt mee voor je luistertijd en je reeks. Totale luistertijd: ') + listenTxt() + '.');
  const miss = {}; r.perChar.forEach(([c, ok]) => { if (!ok) miss[c] = (miss[c] || 0) + 1; });
  const top = Object.keys(miss).sort((a, b) => miss[b] - miss[a]).slice(0, 3);
  if (top.length) li.push(tx('Meeste fouten bij: ') + top.map(lab).join(', ') + tx('. Die komen vaker terug.'));
  li.push(tx('Vrij oefenen verandert je niveau en snelheid niet.'));
  li.push(tx('Geoefend: ') + fmt(r.minutes, 0) + tx(' minuten') + (r.minutes < 10 && (P.days[d] || 0) < 10 ? tx(' (een dag telt vanaf 10 minuten)') : '') + '.');
  $('rList').innerHTML = li.map(t => '<li>' + t + '</li>').join('');
}

/* ---------- Final test ---------- */
async function runExam() {
  const all = KOCH.split('');
  const plan = {minTokens:S.test ? 15 : 100};
  sess = {abort:false, tokens:0, correct:0, perChar:[], conf:[], minutes:0, ewpm:Math.min(10, 20), c:20, plan, mode:'proef', exam:true, band:0, release:null, paused:false, pausedMs:0, pauseAt:null};
  kbState.chars = all; renderKb(); panel('play');
  go('session'); $('stopBox').hidden = true; wake(S.wake);
  const len = +S.glen, rnd = Math.random;
  await groupsBlock(tx('Eindproef'), S.test ? 40 : 300, true, () => ({tokens:randomGroup(P, all, len, rnd)}), 10);
  clearInterval(blockTimer);
  wake(false);
  Engine.stop(true);
  endSession();
}

/* ---------- On paper ---------- */
function paperView(v) { ['pReady', 'pPlay', 'pSnel', 'pRes'].forEach(x => { $(x).hidden = x !== v; }); }
function waitClick(id) {
  return new Promise(res => {
    const el = $(id);
    const done = v => { el.removeEventListener('click', h); if (sess) sess.release = null; res(v); };
    const h = () => done(true);
    el.addEventListener('click', h);
    sess.release = () => done(false);
  });
}
function renderCheckChips() { document.querySelectorAll('#pReady .chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.check === S.pcheck))); }
function buildRow(i, groupLen) {
  const row = document.createElement('div'); row.className = 'prow';
  const n = document.createElement('span'); n.className = 'pn'; n.textContent = i + 1; row.appendChild(n);
  const cells = document.createElement('span'); cells.className = 'pcells'; row.appendChild(cells);
  return {row, cells};
}
function buildSnel(groups) {
  const el = $('pRowsSnel'); el.innerHTML = '';
  groups.forEach((g, i) => {
    const {row, cells} = buildRow(i);
    g.tokens.forEach(t => {
      const b = document.createElement('button'); b.className = 'pc tap'; b.innerHTML = h(t); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => { const on = b.classList.toggle('bad'); b.setAttribute('aria-pressed', String(on)); });
      cells.appendChild(b);
    });
    el.appendChild(row);
  });
}
function readSnel() { return [...$('pRowsSnel').querySelectorAll('.prow')].map(r => [...r.querySelectorAll('button')].map(b => !b.classList.contains('bad'))); }
function renderRows(el, groups, flags, typedRows) {
  el.innerHTML = '';
  groups.forEach((g, i) => {
    const {row, cells} = buildRow(i);
    g.tokens.forEach((t, j) => { const c = document.createElement('span'); c.className = 'pc ' + (flags[i][j] ? 'ok' : 'bad'); c.innerHTML = h(t); cells.appendChild(c); });
    if (typedRows && flags[i].some(f => !f)) { const tp = document.createElement('span'); tp.className = 'ptyped'; tp.textContent = 'jij: ' + typedRows[i].map(x => lab(x || MISS)).join(' '); row.appendChild(tp); }
    el.appendChild(row);
  });
}
async function paperBlocks(secs, gen, ew) {
  $('sBlock').textContent = blockTitle(tx('Op papier')); $('sScored').textContent = tx('Dit blok telt mee');
  panel('paper');
  const t0 = startBlockTimer(secs);
  let n = 0;
  while (!sess.abort && (performance.now() - t0) / 1000 < secs) {
    n++;
    const N = +S.pgroups, L = +S.plen;
    const groups = []; for (let i = 0; i < N; i++) groups.push(gen(L));
    panel('paper'); paperView('pReady');
    $('pReadyTxt').textContent = tx('Blok ') + n + ': ' + N + tx(' groepjes. Pen en papier klaar?');
    renderCheckChips();
    if (!(await waitClick('pStart')) || sess.abort) break;
    paperView('pPlay'); $('pBar').style.width = '0';
    for (const c of ['3', '2', '1']) { if (sess.abort) break; $('pPlayTxt').textContent = tx('Start over ') + c; await sleep(800); }
    if (sess.abort) break;
    $('pPlayTxt').textContent = tx('Luister en schrijf mee');
    const tick = setInterval(() => { const p = Engine.pos(); if (p) { $('pBar').style.width = (p.pct * 100) + '%'; $('pPlayTxt').textContent = tx('Groep ') + Math.max(1, p.gi + 1) + tx(' van ') + N; } }, 150);
    const r = await playP(groups.map(g => g.tokens), ew);
    clearInterval(tick);
    if (r === 'stopped' || sess.abort) break;
    $('pBar').style.width = '100%';
    let flags, typedRows = null;
    if (S.pcheck === 'snel') {
      buildSnel(groups); paperView('pSnel');
      if (!(await waitClick('pDone')) || sess.abort) break;
      flags = readSnel();
    } else {
      panel('play'); $('kAgain').hidden = true; $('sScored').textContent = '';
      $('expected').textContent = ''; $('meaning').textContent = '';
      const typedAll = []; let aborted = false;
      for (let i = 0; i < N; i++) {
        status(tx('Groep ') + (i + 1) + tx(' van ') + N + tx(': tik wat je opschreef')); setKb(true); $('kAgain').hidden = true;
        const a = await getAnswer(groups[i].tokens.length);
        if (a.abort || sess.abort) { aborted = true; break; }
        typedAll.push(a.typed);
      }
      $('kAgain').hidden = false;
      if (aborted) break;
      flags = []; typedRows = [];
      groups.forEach((g, i) => {
        const res = align(g.tokens, typedAll[i]);
        flags.push(res.map(x => x.ok)); typedRows.push(res.map(x => x.typed));
        res.forEach((x, j) => { if (!x.ok && x.typed && x.typed !== MISS) sess.conf.push([g.tokens[j], x.typed]); });
      });
      panel('paper');
    }
    let tok = 0, ok = 0;
    groups.forEach((g, i) => g.tokens.forEach((t, j) => { tok++; if (flags[i][j]) ok++; sess.perChar.push([t, !!flags[i][j]]); }));
    sess.tokens += tok; sess.correct += ok;
    Engine.tick(ok / tok >= 0.9);
    $('pResTxt').textContent = ok + tx(' van ') + tok + tx(' juist (') + Math.round(ok / tok * 100) + '%)';
    renderRows($('pRowsRes'), groups, flags, typedRows);
    paperView('pRes');
    const timeLeft = (performance.now() - t0) / 1000 < secs;
    $('pNext').textContent = timeLeft ? tx('Volgend blok') : tx('Afronden');
    if (!(await waitClick('pNext'))) break;
  }
  sess.minutes += (performance.now() - t0) / 60000;
}

/* ---------- Listening only ---------- */
async function nap(ms) { const end = performance.now() + ms; while (performance.now() < end && sess && !sess.abort) await sleep(Math.min(200, Math.max(10, end - performance.now()))); }
async function holdWhilePaused() { while (sess && sess.paused && !sess.abort) await sleep(200); }
function setPaused(p) {
  if (!sess || !sess.listening) return;
  if (p && !sess.paused) sess.pauseAt = performance.now();
  if (!p && sess.paused && sess.pauseAt) { sess.pausedMs += performance.now() - sess.pauseAt; sess.pauseAt = null; }
  sess.paused = p; $('lPause').textContent = p ? tx('Verder') : tx('Pauze');
  if (p) { $('lStatus').textContent = tx('Gepauzeerd'); try { speechSynthesis.cancel(); } catch (e) {} }
}
$('lPause').addEventListener('click', () => setPaused(!(sess && sess.paused)));
function speakGroups(groups) {
  const n = groups.reduce((a, g) => a + g.length, 0);
  return speak(null, groups.map(g => g.map(sayc).join(' ')).join('. '), n);
}
function speak(tokens, text, n) {
  return new Promise(res => {
    try {
      if (!('speechSynthesis' in window)) return res(false);
      if (tokens) { text = tokens.map(sayc).join(', '); n = tokens.length; }
      const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices();
      const VL = {nl:[/^nl[-_]BE/i, /^nl/i], fr:[/^fr[-_]BE/i, /^fr/i], en:[/^en[-_]GB/i, /^en/i]}[LANG] || [/^nl/i, /^nl/i];
      const v = vs.find(x => VL[0].test(x.lang)) || vs.find(x => VL[1].test(x.lang));
      if (v) u.voice = v;
      u.lang = v ? v.lang : LOCALE[LANG]; u.rate = 0.85;
      let done = false; const fin = () => { if (!done) { done = true; res(true); } };
      u.onend = fin; u.onerror = fin;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
      setTimeout(fin, 2500 + n * 900);
    } catch (e) { res(false); }
  });
}
let silentEl = null;
function silentUri() {
  const n = 8000, b = new Uint8Array(44 + n), dv = new DataView(b.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 8000, true); dv.setUint32(28, 8000, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true); w(36, 'data'); dv.setUint32(40, n, true);
  for (let i = 0; i < n; i++) b[44 + i] = i % 2 ? 129 : 128;
  let s = ''; for (let i = 0; i < b.length; i += 4096) s += String.fromCharCode.apply(null, b.subarray(i, i + 4096));
  return 'data:audio/wav;base64,' + btoa(s);
}
function listenSupport(on) {
  Engine.keepAlive(on);
  try {
    if (on) {
      if (!silentEl) { silentEl = new Audio(silentUri()); silentEl.loop = true; silentEl.volume = 0.05; }
      silentEl.play().catch(() => {});
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({title:tx('Alleen luisteren'), artist:'CWLD'});
        navigator.mediaSession.setActionHandler('play', () => setPaused(false));
        navigator.mediaSession.setActionHandler('pause', () => setPaused(true));
      }
    } else {
      if (silentEl) silentEl.pause();
      if ('mediaSession' in navigator) ['play', 'pause'].forEach(a => { try { navigator.mediaSession.setActionHandler(a, null); } catch (e) {} });
    }
  } catch (e) {}
}
async function listenSession(secs, gen, ew, asBlock) {
  $('sBlock').textContent = asBlock ? blockTitle(tx('Luisteren')) : tx('Alleen luisteren'); $('sScored').textContent = '';
  panel('listen'); $('lPause').textContent = tx('Pauze'); sess.listening = true; sess.paused = false;
  $('lNote').textContent = ('speechSynthesis' in window) ? (S.speech ? tx('Je mag je scherm vergrendelen. Pauze en verder werken ook met de knoppen van je oortjes, als je toestel dat toelaat.') : tx('Spraak staat uit. De letters verschijnen enkel op het scherm.')) : tx('Spraak is niet beschikbaar op dit toestel. De letters verschijnen op het scherm.');
  listenSupport(true);
  const t0 = startBlockTimer(secs);
  while (!sess.abort && (performance.now() - t0) / 1000 < secs) {
    await holdWhilePaused(); if (sess.abort) break;
    const g = gen();
    const grp = g.groups || [g.tokens], line = grp.length > 1;
    const n = grp.reduce((a, x) => a + x.length, 0);
    $('lSol').textContent = ''; $('lMean').textContent = ''; $('lStatus').textContent = tx('Luister...');
    if (await playP(grp, ew) === 'stopped' || sess.abort) break;
    $('lStatus').textContent = tx('Zeg het in je hoofd');
    await nap(line ? 2000 : 3000); if (sess.abort) break;
    $('lSol').classList.toggle('line', line);
    $('lSol').style.fontSize = !line && g.tokens.length > 5 ? '38px' : '';
    $('lSol').innerHTML = line ? grp.map(w => w.map(h).join('')).join(' ') : g.tokens.map(h).join(' ');
    $('lMean').textContent = g.words ? lineMeaning(g.words, mean) : g.word && MEANING[g.word] ? wordLab(g.word) + ': ' + mean(g.word) : '';
    $('lStatus').textContent = tx('Oplossing');
    if (S.speech && n <= 18) await (line ? speakGroups(grp) : speak(g.tokens)); else await nap(1800 + (line ? n * 120 : 0));
    await nap(1500);
  }
  const now = performance.now();
  const paused = sess.pausedMs + (sess.pauseAt ? now - sess.pauseAt : 0);
  const lm = Math.max(0, now - t0 - paused) / 60000;
  sess.minutes += lm; sess.listenAcc = (sess.listenAcc || 0) + lm;
  sess.listening = false; sess.paused = false;
  listenSupport(false);
}

function endSession() {
  if (sess.free) { endFree(); return; }
  if (sess.exam) {
    const r = {tokens:sess.tokens, correct:sess.correct, perChar:sess.perChar, conf:sess.conf, minutes:sess.minutes};
    const out = finishExam(P, r, today(), sess.plan.minTokens);
    saveP(); showExamResult(r, out, sess.plan); sess = null; return;
  }
  const r = {tokens:sess.tokens, correct:sess.correct, perChar:sess.perChar, conf:sess.conf, vres:sess.vres || [], minutes:sess.minutes, ewpm:sess.ewpm, listen:sess.listenAcc || 0, band:sess.bandUsed || 0};
  const before = {ewpm:P.ewpm, known:P.known, okRun:P.okRun};
  const out = finishSession(P, r, sess.plan, today(), S.cwpm);
  if (out.valid && sess.mode !== 'luister') {
    P.rgood = out.score >= 0.95 ? (P.rgood || 0) + 1 : 0;
    if (S.round !== '2' && P.rgood >= 3) { S.round = '2'; saveS(); out.roundUp = true; }
  }
  if (sess.roundDown) out.roundDown = true;
  saveP();
  showResult(r, out, before, sess.plan, sess.mode);
  sess = null;
}
function showResult(r, out, before, plan, mode) {
  lastExam = false; lastFree = false;
  go('result');
  const lis = mode === 'luister';
  $('rMeter').hidden = lis; $('rMeterLbl').hidden = lis;
  const pct = Math.round(out.score * 100);
  $('rTitle').textContent = lis ? tx('Goed geluisterd') : !out.valid ? tx('Te kort om te tellen') : out.score >= 0.9 ? tx('Goed gedaan') : out.score >= 0.8 ? tx('Bijna er') : tx('Blijf oefenen');
  $('rScore').textContent = lis ? fmt(r.minutes, 0) + ' min' : r.tokens ? pct + '%' : '-';
  $('rFill').style.width = (r.tokens ? pct : 0) + '%';
  const li = [];
  if (!lis && r.listen > 0.2) li.push(tx('Daarvan luisterde je ') + fmt(r.listen, 0) + tx(' min. Totale luistertijd: ') + listenTxt() + '.');
  if (lis) li.push(tx('Dat telt mee voor je luistertijd en je reeks. Totale luistertijd: ') + listenTxt() + '.');
  else li.push(r.tokens ? r.correct + tx(' van ') + r.tokens + tx(' tekens juist in het scorende blok.') : tx('Er werd geen scorend blok gespeeld.'));
  if (lis) { /* no score when only listening */ }
  else if (!out.valid) li.push(tx('Een sessie telt vanaf ') + plan.minTokens + tx(' tekens. Deze sessie wijzigt je niveau niet.'));
  else {
    if (out.unlocked && !out.alphabetDone) li.push('<b class="ok">' + (out.unlocked.length > 1 ? tx('Nieuwe tekens ontgrendeld.') : tx('Nieuw teken ontgrendeld.')) + '</b>' + (out.unlocked.length > 1 ? tx(' Je hoort ze in je volgende sessie.') : tx(' Je hoort het in je volgende sessie.')));
    if (out.roundDown) li.push(tx('Er kwam een nieuw teken bij. Daarom oefen je weer in rondes van 1 minuut, tot je opnieuw drie goede sessies hebt.'));
    if (out.roundUp) li.push(tx('Drie sessies op rij minstens 95%. Vanaf nu oefen je in 4 rondes van 2 minuten. Je kan dit terugzetten bij Instellingen.'));
    if (out.alphabetDone) li.push(tx('<b class="ok">Het hele alfabet is gekend.</b> Nu start fase 2 met cijfers, leestekens en prosigns.'));
    if (out.phase2Done) li.push(tx('<b class="ok">Alle 44 tekens zijn gekend.</b> De Eindproef staat klaar op het scherm Vandaag.'));
    if (out.vocabUnlocked) li.push(tx('<b class="ok">Nieuwe afkortingen ontgrendeld:</b> ') + out.vocabUnlocked.map(wordLab).join(', ') + tx('. Je hoort ze in je volgende sessie.'));
    else if (ph4() && !(P.vocabQueue || []).length && (P.vocab || 0) < VOCAB.length) li.push(tx('Haal minstens 90% in een geldige sessie voor de volgende afkortingen.'));
    else if (ph4() && (P.vocab || 0) >= VOCAB.length && !(P.vocabQueue || []).length) li.push(tx('Alle ') + VOCAB.length + tx(' afkortingen en Q-codes zijn gekend. Blijf luisteren op de banden.'));
    if (!out.unlocked && P.introQueue.length === 0 && P.known < KOCH.length) li.push(tx('Haal minstens 90% in een geldige sessie voor ') + (P.order === 'koch' ? tx('het volgende teken.') : tx('de volgende familie.')));
    if (out.speed === 1) li.push(tx('Snelheid omhoog: effectief ') + P.ewpm + ' WPM.');
    if (out.speed === -1) li.push(tx('Snelheid omlaag: effectief ') + P.ewpm + tx(' WPM. Dat is tijdelijk.'));
  }
  const miss = {}; r.perChar.forEach(([c, ok]) => { if (!ok) miss[c] = (miss[c] || 0) + 1; });
  const top = Object.keys(miss).sort((a, b) => miss[b] - miss[a]).slice(0, 3);
  if (r.band) li.push(tx('Bandcondities: ') + tx(BAND_NAMES[r.band]).toLowerCase() + tx('. Aanpassen kan bij Instellingen.'));
  if (ph4() && !lis) li.push(tx('Vergeet het echte luisteren niet: noteer het in je Logboek.'));
  if (top.length) li.push(tx('Meeste fouten bij: ') + top.map(lab).join(', ') + tx('. Die komen vaker terug.'));
  li.push(tx('Geoefend: ') + fmt(r.minutes, 0) + tx(' minuten') + (r.minutes < 10 && (P.days[today()] || 0) < 10 ? tx(' (een dag telt vanaf 10 minuten)') : '') + '.');
  $('rList').innerHTML = li.map(t => '<li>' + t + '</li>').join('');
}

let lastExam = false, lastFree = false;
function showExamResult(r, out, plan) {
  lastExam = true; lastFree = false;
  go('result');
  $('rMeter').hidden = false; $('rMeterLbl').hidden = false;
  const pct = Math.round(out.score * 100);
  $('rTitle').textContent = out.ready ? tx('Klaar voor de band') : out.pass ? tx('Proef geslaagd') : !out.valid ? tx('Te kort om te tellen') : tx('Nog niet geslaagd');
  $('rScore').textContent = r.tokens ? pct + '%' : '-';
  $('rFill').style.width = (r.tokens ? pct : 0) + '%';
  const li = [];
  li.push(r.tokens ? r.correct + tx(' van ') + r.tokens + tx(' tekens juist.') : tx('Er werden geen groepen gekopieerd.'));
  if (!out.valid) li.push(tx('De proef telt vanaf ') + plan.minTokens + tx(' tekens.'));
  else {
    if (out.score < 0.9) li.push(tx('Je hebt minstens 90% nodig.'));
    if (out.weak.length) li.push(tx('Nog zwak (onder 85%): ') + out.weak.map(lab).join(', ') + tx('. Die komen vaker terug in je sessies.'));
    if (out.ready) li.push(tx('<b class="ok">Twee keer geslaagd op verschillende dagen.</b> Je bent klaar voor de band: nu geldt de gouden regel, heel veel luisteren. Fase 4 start: afkortingen, Q-codes en bandcondities. Het Logboek staat nu bovenaan.'));
    else if (out.pass) li.push(tx('Geslaagd. Slaag nog een keer op een andere dag voor de mijlpaal.'));
  }
  li.push(tx('De proef verandert je niveau en snelheid niet.'));
  $('rList').innerHTML = li.map(t => '<li>' + t + '</li>').join('');
}

/* stopping */
$('sStop').addEventListener('click', () => { $('stopBox').hidden = false; });
$('stopNo').addEventListener('click', () => { $('stopBox').hidden = true; });
$('brkStop').addEventListener('click', () => { $('stopBox').hidden = false; });
$('introSkip').addEventListener('click', () => { if (!sess) return; sess.skipI = true; Engine.stop(false); if (pendingPlay) { const r = pendingPlay; pendingPlay = null; r('stopped'); } });
$('stopYes').addEventListener('click', () => {
  if (!sess) return;
  sess.abort = true; $('stopBox').hidden = true;
  if (ans && ans.open) { ans.open = false; ans.resolve({abort:true, typed:[]}); }
  if (sess.release) sess.release();
  try { speechSynthesis.cancel(); } catch (e) {}
  Engine.stop(false);
  if (pendingPlay) { const r = pendingPlay; pendingPlay = null; r('stopped'); }
});
async function afterAbortWatcher() {}
$('start').addEventListener('click', () => { runSession(); });
$('rHome').addEventListener('click', () => go('home'));
$('rAgain').addEventListener('click', () => { if (lastFree) runFree(); else runSession(lastExam); });

