# CWLD

**Learn to copy Morse code (CW) in 15 minutes a day.**

CWLD is a free web app (PWA) for radio amateurs who want to learn to receive Morse by ear. It works on phone and desktop, installs like an app, and works offline once opened.

Live app: https://on3vz.github.io/CWLD/

Made by ON3VZ. The name is a nod to CW and the radio club WLD.

## How it works

- **Think in tones.** No dots, dashes, Morse trees or tables during training. You answer first, then the letter appears.
- **Koch method with Farnsworth spacing.** Characters are sent at 20 WPM or faster. The effective speed starts low and grows with your score. A new character is added only when you copy the current set at 90% or better.
- **Always groups.** You practise with groups of characters from day one, never with single characters (except once, when a new character is introduced).
- **A session is 15 minutes.** Warm-up, a new character, copying groups in short rounds with rests in between, and a listening block. The session stops by itself, preferably on a success. A daily streak keeps you going.
- **Path.** 1) the alphabet, 2) digits, punctuation (. , ? / =) and prosigns (AR, SK, BT, KN), 3) a final test, "Ready for the band", 4) listening: abbreviations, call signs, QSOs, with simulated noise, fading (QSB) and interference (QRM).
- **Listen a lot.** Once the alphabet is known, the golden rule is to listen to real signals on the bands. The app has a listening log for that.

## Install on your phone

- **Android (Chrome):** open the link, tap the menu (three dots) and choose "Install app" or "Add to home screen".
- **iPhone (Safari):** open the link in Safari, tap Share and choose "Add to Home Screen".

Open the app once with internet. After that it also works offline.

## Languages

Dutch (Flemish), French and English. The app starts in English unless your browser is set to Dutch or French. You can change the language in the settings.

## Your data

Progress is stored only on your own device, in the browser. Use Settings, Export to make a backup or to move to another device.

## Improving a translation

All texts are in `js/taal.js`. The Dutch text is the key on the left, the translation is on the right. Only change the right-hand side.

## Files

- `index.html`: the screens (markup only)
- `css/cwld.css`: all styling
- `js/taal.js`: French and English translations of every text
- `js/data.js`: fixed content (learning orders, abbreviations and Q codes with meanings, words, QSO lines, band conditions)
- `js/logic.js`: the learning rules (groups, scoring, unlocking, speed, streak), without screen or audio
- `js/i18n.js`: language switching
- `js/storage.js`: settings and progress, stored on the device
- `js/audio.js`: the audio engine (Web Audio API, Farnsworth timing, band conditions)
- `js/ui.js`: navigation, the Today screen and the on-screen keyboard
- `js/session.js`: the daily session, free practice, final test, paper mode and listening
- `js/views.js`: progress, logbook, settings, start wizard and level picker
- `js/main.js`: start-up
- `sw.js`: makes the app work offline (the cache name changes with every version)
- `manifest.webmanifest`: makes the app installable
- `icons/`, `img/`: icons and start screen images
- `fonts/`: fonts (SIL Open Font License)
- `LICENSE.txt`: the license

The scripts are plain files loaded in this order by `index.html`, without modules or a build tool, so the app also opens straight from disk. When you change a file, also change the cache name in `sw.js`, otherwise installed apps keep the old version.

## License

CC BY-NC-SA 4.0. You may use it, learn from it and build on it, but not commercially, and you must credit "CWLD by ON3VZ" with a link to https://on3vz.github.io/CWLD/ and share your changes under the same license. See `LICENSE.txt`.

73 de ON3VZ
