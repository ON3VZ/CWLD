/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Language switching: tx() translates a Dutch key, translateDom() translates the fixed page texts. */
'use strict';
/* ============================================================
   LANGUAGE: translate the interface (Dutch text is the key)
   ============================================================ */
const APP_VERSION = '2.0';
let LANG = 'nl';
function tx(t) { if (LANG === 'nl' || t == null) return t; const d = TR[LANG]; return d && d[t] != null ? d[t] : t; }
const mean = w => tx(MEANING[w] || '');
const sayc = c => (LANG === 'nl' ? SAY[c] : (SAYL[LANG] || {})[c]) || c;
function sylL(c) {
  const m = MORSE[c]; if (!m) return '';
  const [a, b, e] = SYL[LANG] || SYL.nl;
  return [...m].map((x, i) => x === '-' ? b : (i === m.length - 1 ? e : a)).join('-');
}
/* Fixed texts in the page: the Dutch text is the key; the original is kept so the language can be switched back */
const ORIG = new WeakMap();
function translateDom() {
  const norm = v => v.replace(/\s+/g, ' ').trim();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {acceptNode:n => n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
  let n;
  while ((n = w.nextNode())) {
    let o = ORIG.get(n);
    if (o === undefined) { const k = norm(n.nodeValue); if (!k || !(k in TR.en)) continue; o = n.nodeValue; ORIG.set(n, o); }
    n.nodeValue = o.match(/^\s*/)[0] + tx(norm(o)) + o.match(/\s*$/)[0];
  }
  document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => ['placeholder', 'aria-label', 'title'].forEach(a => {
    if (!el.hasAttribute(a)) return;
    const key = 'data-o-' + a;
    if (!el.hasAttribute(key)) { const v = el.getAttribute(a); if (!(v in TR.en)) return; el.setAttribute(key, v); }
    el.setAttribute(a, tx(el.getAttribute(key)));
  }));
}
function detectLang() { const l = String((navigator.languages && navigator.languages[0]) || navigator.language || 'en').toLowerCase(); return l.startsWith('fr') ? 'fr' : l.startsWith('nl') ? 'nl' : 'en'; }
function setLang(l, rerender) {
  LANG = TR[l] || l === 'nl' ? l : 'nl';
  document.documentElement.lang = LANG;
  translateDom();
  if (rerender) go(curView);
}

