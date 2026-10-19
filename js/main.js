/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Start-up: load the saved data, show the wizard or the Today screen, register the service worker. */
'use strict';
load();
if (!S.wizardDone) {
  if (P.sessions.length || P.lastDate) { S.wizardDone = true; saveS(); go('home'); }
  else wzOpen();
} else go('home');
/* Offline support: register the service worker (only works over http/https, not from a local file) */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
