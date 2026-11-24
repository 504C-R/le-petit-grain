// Sons et musique générés par le navigateur (Web Audio) : aucun fichier audio à télécharger.
// Tout passe par un volume général, qu'on coupe pendant les pubs et quand l'onglet est masqué.
let ctx = null, general = null, busSons = null, busMusique = null;
let actif = true, musiqueOn = true, coupe = false, dernierTinte = 0;

function audio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    general = ctx.createGain(); general.connect(ctx.destination);
    busSons = ctx.createGain(); busSons.connect(general);
    // La musique passe par un filtre doux, pour un son feutré de café
    const filtre = ctx.createBiquadFilter(); filtre.type = 'lowpass'; filtre.frequency.value = 2400;
    busMusique = ctx.createGain(); busMusique.gain.value = musiqueOn ? 1 : 0;
    busMusique.connect(filtre).connect(general);
    majVolume();
  }
  if (ctx.state === 'suspended' && !coupe) ctx.resume();
  return ctx;
}
function majVolume() { if (general) general.gain.setTargetAtTime(coupe ? 0 : 1, ctx.currentTime, .05); }

// Une note avec une attaque douce et une fin qui s'éteint
function note(freq, debut, duree, type = 'sine', volume = .07, bus = null, attaque = .012) {
  const c = audio(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + debut;
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + attaque);
  g.gain.exponentialRampToValueAtTime(.0001, t + duree);
  o.connect(g).connect(bus || busSons);
  o.start(t); o.stop(t + duree + .05);
}
const sonNote = (...a) => { if (actif) note(...a); };

// ---------- Musique d'ambiance : une boucle douce façon « lofi », jouée à l'infini ----------
// Quatre accords (Fa maj7, Mi m7, Ré m7, Do maj7), une basse, un arpège léger. 76 battements par minute.
const ACCORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
const MELODIE = [0, 2, 3, 1, 2, 3, 1, 0];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const TEMPS = 60 / 76;
let prochaineMesure = 0, mesure = 0, minuteur = null;
function planifier() {
  const c = audio(); if (!c || !musiqueOn || coupe) return;
  if (prochaineMesure < c.currentTime) prochaineMesure = c.currentTime + .1;
  while (prochaineMesure < c.currentTime + 1.5) {
    const acc = ACCORDS[mesure % ACCORDS.length], debut = prochaineMesure - c.currentTime, longueur = TEMPS * 4;
    acc.forEach(m => note(mtof(m), debut, longueur * 1.05, 'sine', .012, busMusique, .5));                 // nappe
    note(mtof(acc[0] - 12), debut, TEMPS * 1.8, 'triangle', .035, busMusique, .02);                      // basse
    note(mtof(acc[0] - 12), debut + TEMPS * 2, TEMPS * 1.6, 'triangle', .028, busMusique, .02);
    MELODIE.forEach((k, i) => {                                                                          // arpège
      if ((mesure + i) % 3 === 2) return;   // quelques silences pour respirer
      note(mtof(acc[k] + 12), debut + i * TEMPS / 2, TEMPS * .9, 'triangle', .011, busMusique, .01);
    });
    prochaineMesure += longueur; mesure++;
  }
}
function demarrerMusique() { if (!minuteur) { planifier(); minuteur = setInterval(planifier, 400); } }
function arreterMusique() { clearInterval(minuteur); minuteur = null; }

export function regleSon(on) { actif = on; }
export const sonActif = () => actif;
export function regleMusique(on) {
  musiqueOn = on;
  if (busMusique) busMusique.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .3);
  if (on && ctx) demarrerMusique(); else arreterMusique();
}
export const musiqueActive = () => musiqueOn;
// Coupure totale (pubs, onglet masqué)
export function couper(oui) {
  coupe = oui;
  if (!ctx) return;
  majVolume();
  if (oui) ctx.suspend?.(); else { ctx.resume?.(); if (musiqueOn) demarrerMusique(); }
}
// Les navigateurs n'autorisent le son qu'après un geste du joueur
addEventListener('pointerdown', () => { audio(); if (musiqueOn) demarrerMusique(); }, { once: true });
document.addEventListener('visibilitychange', () => couper(document.hidden));

export const sons = {
  tinte() { const n = performance.now(); if (n - dernierTinte < 300) return; dernierTinte = n; sonNote(1318, 0, .12, 'triangle', .04); sonNote(1760, .06, .2, 'triangle', .03); },
  clic() { sonNote(660, 0, .08, 'sine', .05); },
  achat() { [523, 659, 784, 1046].forEach((f, i) => sonNote(f, i * .07, .28, 'triangle', .05)); },
  succes() { [784, 988, 1175, 1568].forEach((f, i) => sonNote(f, i * .09, .45, 'sine', .06)); },
  panne() { sonNote(110, 0, .35, 'sawtooth', .035); sonNote(98, .15, .4, 'sawtooth', .03); },
  repare() { sonNote(880, 0, .1, 'square', .025); sonNote(1175, .08, .15, 'square', .025); },
  livraison() { sonNote(196, 0, .15, 'triangle', .06); sonNote(147, .1, .22, 'triangle', .05); },
  bulle() { sonNote(587, 0, .18, 'sine', .04); sonNote(784, .1, .25, 'sine', .04); },
};
