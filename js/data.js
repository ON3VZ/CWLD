/* CWLD by ON3VZ, https://on3vz.github.io/CWLD/ . License CC BY-NC-SA 4.0, see LICENSE.txt. */
/* Fixed content: learning orders, prosign labels, words, abbreviations and Q codes with their meaning,
   QSO lines, band condition levels and call sign prefixes. Data only, no logic. */
'use strict';
/* Phase 1: letters. Phase 2: digits, punctuation and prosigns.
   Prosigns have their own internal character: + = AR, ( = KN, % = SK. The = sign is also BT. */
/* Two learning orders. KOCH is the active order and is set with setOrder().
   By family: the letters grouped by sound family, one whole family at a time. */
const SEQ_KOCH = 'KMURESNAPTLWIJZFOYVGQHBCDX' + '.=+,5/(9238?%47160';
const FAMILIES = ['ETANIM', 'DSOURC', 'KPBGWL', 'QHFY', 'ZVXJ', '1234567890', '.,?/=', '+(%'];
const SEQ_FAM = FAMILIES.join('');
const N1 = 26;
const P2 = SEQ_KOCH.slice(N1);
const PS = {'+':'AR', '(':'KN', '%':'SK'};
const INFO = {'.':'de punt', '=':'de scheiding, ook BT genoemd. Je hoort ze tussen delen van een bericht', '+':'AR, einde van een bericht',
  ',':'de komma', '/':'de breukstreep, zoals in ON3VZ/P', '(':'KN, enkel het aangeroepen station mag antwoorden', '?':'het vraagteken, zoals in QRZ?',
  '%':'SK, einde van de verbinding'};
const SAY = {'0':'nul','1':'één','2':'twee','3':'drie','4':'vier','5':'vijf','6':'zes','7':'zeven','8':'acht','9':'negen',
  '.':'punt', ',':'komma', '?':'vraagteken', '/':'breukstreep', '=':'B T', '+':'A R', '(':'K N', '%':'S K'};
const MORSE = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',
  N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', '/':'-..-.', '=':'-...-', '+':'.-.-.', '(':'-.--.', '%':'...-.-'
};
const MIN_EWPM = 8;      /* absolute lower limit, only when you fix the speed yourself */
const AUTO_MIN = 10;     /* automatically, the effective speed never drops below the 10 WPM plateau */
const MISS = '_';

/* Words and abbreviations, letters only. They are filtered on the characters already known. */
const WORDS = (
 'ARM KAM KAN KUS MAN MES MUS REM RUM RUS SER MAAN NAAM MEER MARS KERN KERS KEUR KRUK MERK NEUS REUS RAMP RAAM MAST SNEL SLAK UREN ' +
 'KAMP KANT KNAL RANK TANK RAKEN RAMEN SAMEN STAM TRAM TRAP STEM NEST REST TEST WEST WARM WERK WENS GAST LAST PAST MALT KRANT KAMER ' +
 'ANKER NAMEN MUREN PLANT STAMP TREIN WAPEN LAKEN TALEN MALEN KRANS STAKEN WERKEN KANSEN TANKEN DANKEN LAMP PLAN PAAR PAUS KAAS KAART ' +
 'MAKEN NEMEN KOMEN BANK BOOM BRUG DAG DAK DIK DOEN DUS EEN GOED GROEN HAND HEEL HUIS JAAR JONG KOUD LANG LEVEN MOOI NOG OOK OUD RAAD ' +
 'STAD VAN VOOR WAAR WEER ZEE ZON ZEKER ZIJN THE AND ARE FOR NOT ALL CAN HER WAS ONE OUR OUT DAY GET HAS HIM HIS HOW NEW NOW OLD SEE TWO ' +
 'WAY WHO BOY DID ITS LET PUT SAY SHE TOO USE RADIO MAKE NAME TIME WORK STAY STAR TEAM TERM ' +
 'ES UR OM FB PSE AGN CUL TNX HR WX GM GA GE GN TU PWR ANT RIG CQ DE VY SRI XYL YL HI DX NR BK OK HW ' +
 'QRM QRN QRP QRT QRX QRZ QSB QSL QSO QSY QTH RST ' +
 'R? 599 579 559 5NN 73 88 QRZ? QTH? QRL? QSL? HW? AGN? 73% TU% TNX+'
).split(' ');
const MEANING = {
  ES:'en', UR:'jouw', OM:'oude kerel (amateur)', FB:'prima', PSE:'alsjeblieft', AGN:'opnieuw', CUL:'tot ziens', TNX:'bedankt',
  HR:'hier', WX:'weer', GM:'goeiemorgen', GA:'goeiemiddag', GE:'goeieavond', GN:'goeienacht', TU:'dank je', PWR:'vermogen',
  ANT:'antenne', RIG:'toestel', CQ:'algemene oproep', DE:'van', VY:'heel', SRI:'sorry', XYL:'echtgenote', YL:'jongedame',
  HI:'gelach', DX:'ver weg', NR:'nummer', BK:'terug', OK:'in orde', HW:'hoe is het?',
  QRM:'storing door een ander station', QRN:'atmosferische storing', QRP:'laag vermogen', QRT:'ik stop',
  QRX:'wacht even', QRZ:'wie roept mij?', QSB:'fading', QSL:'bevestiging', QSO:'verbinding', QSY:'verander van frequentie', QTH:'locatie',
  RST:'rapport: leesbaarheid, sterkte, toon', 'R?':'ontvangen?', '599':'perfect rapport', '579':'goed rapport', '559':'redelijk rapport',
  '5NN':'599 in contestvorm (N staat voor 9)', '73':'groeten', '88':'liefs', 'QRZ?':'wie roept mij?', 'QTH?':'waar zit je?',
  'QRL?':'is de frequentie vrij?', 'QSL?':'bevestig je?', 'HW?':'hoe ontvang je me?', 'AGN?':'nog eens?', '73%':'groeten, einde verbinding',
  'TU%':'dank je, einde verbinding', 'TNX+':'bedankt, einde bericht'
};
/* Phase 4: abbreviations and Q codes. 3 new ones after each valid session with 90%.
   Order: what you hear first in a QSO. Meanings checked against the usual Q code and abbreviation lists. */
const VOCAB = [
  ['CQ','algemene oproep'], ['DE','van (hier is)'], ['K','over, jij mag zenden'],
  ['RST','rapport: leesbaarheid, sterkte, toon'], ['599','perfect rapport'], ['5NN','599 in verkorte vorm (N staat voor 9)'],
  ['UR','jouw, je'], ['ES','en'], ['TNX','bedankt'],
  ['73','beste groeten'], ['GL','veel succes'], ['CUL','tot later'],
  ['QTH','locatie'], ['OP','operator'], ['HR','hier'],
  ['R','begrepen, goed ontvangen'], ['FB','prima'], ['OM','oude kerel, collega amateur'],
  ['PSE','alsjeblieft'], ['AGN','opnieuw'], ['BK','break, terug naar jou'],
  ['QRZ?','wie roept mij?'], ['QRL?','is deze frequentie in gebruik?'], ['QSL','ik bevestig ontvangst'],
  ['QRM','storing door andere stations'], ['QRN','atmosferische storing'], ['QSB','fading, het signaal zakt weg'],
  ['QRS','sein trager'], ['QRQ','sein sneller'], ['QRP','laag vermogen'],
  ['QRO','hoog vermogen'], ['QRT','ik stop met zenden'], ['QRX','wacht even'],
  ['QSY','verander van frequentie'], ['QSO','verbinding'], ['QRV','ik ben klaar, ik ben beschikbaar'],
  ['QRU','ik heb niets meer voor jou'], ['QSK','break-in, ik hoor je tussen mijn tekens door'], ['FER','voor'],
  ['RIG','toestel'], ['ANT','antenne'], ['PWR','vermogen'],
  ['WX','weer'], ['TU','dank je'], ['HW?','hoe hoor je me?'],
  ['GM','goeiemorgen'], ['GA','goeiemiddag'], ['GE','goeieavond'],
  ['GN','goeienacht'], ['DX','verre verbinding'], ['VY','heel, zeer'],
  ['HI','gelach'], ['SRI','sorry'], ['NR','nummer'],
  ['BCNU','tot ziens (be seeing you)'], ['88','liefs en kussen'], ['CFM','bevestigd']
].map(([w, m]) => ({w, m}));
const VSET = new Set(VOCAB.map(v => v.w));
VOCAB.forEach(v => { MEANING[v.w] = v.m; });
Object.assign(MEANING, {NAME:'naam', CALL:'oproep', TEST:'contestoproep', SIG:'signaal'});
const V_STEP = 3;
/* Short pieces of a real QSO. {A} and {B} are call signs, {N} a name, {Q} a place, {R} a report.
   A line is only used once all abbreviations in it are known. */
const NAMES = 'JAN PIET LUC MARC ANN TOM PAUL ERIK HANS KRIS LEEN WIM'.split(' ');
const CITIES = 'GENT BRUGGE LEUVEN HASSELT NAMUR LIEGE LILLE KOELN BERLIN LONDON PARIS OSLO'.split(' ');
const LINES = [
  'CQ CQ CQ DE {A} {A} K', '{B} DE {A} K', '{A} DE {B} UR {R} BK', '{B} DE {A} GM OM TNX FER CALL', 'GE {N} TNX FER CALL',
  'UR RST {R} {R}', 'NAME {N} {N}', 'QTH {Q} {Q}', '= HR QTH {Q} = OP {N} = HW? +', 'TNX FER QSO', '73 ES GL', 'QSL TNX 73',
  'QRZ? DE {A}', 'QRL? DE {A}', 'PSE QRS', 'PSE AGN', 'R R FB OM', 'TEST {A} {A}', 'TU 5NN', 'RIG IC7300 PWR 100W', 'ANT DIPOLE',
  'WX CLOUDY', '73 {B} DE {A} %', 'QRM PSE QSY', 'UR SIG QSB', 'HW? +', 'TNX QSO CUL', 'QRX 5 MIN', 'QRT 73 CUL', 'SRI QRM PSE AGN'
];
/* Band conditions 0 to 3. Each time something sounds, the details are drawn again (another station, other fading). */
const BAND_NAMES = ['Uit', 'Licht', 'Matig', 'Zwaar'];
const BAND_LV = [null,
  {noise:0.65, sig:0.8, qsb:0,    qrm:0,    chirp:0,  fist:0.04, pitch:50},    /* signal to noise about 18 dB */
  {noise:1.4,  sig:0.7, qsb:0.3,  qrm:0.1,  chirp:0,  fist:0.08, pitch:100},   /* about 11 dB, 6 dB in a dip */
  {noise:1.7,  sig:0.6, qsb:0.35, qrm:0.16, chirp:30, fist:0.12, pitch:150}];  /* about 8 dB, around 0 dB in a dip */
/* Call signs, using known characters only */
const PREFIXES = 'ON3 ON4 ON5 ON6 ON7 OT4 PA3 PA0 PD0 DL1 DK5 F5 F4 G4 G3 M0 OK1 SP9 I2 EA3 OE1 HB9'.split(' ');
