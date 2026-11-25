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

// ---------- Ambiance du café : le murmure de la salle (plus fort quand il y a du monde) et la pluie sur la vitrine ----------
let amb = null;
function bufferBruit(c, brun) {
  const b = c.createBuffer(1, c.sampleRate * 3, c.sampleRate), d = b.getChannelData(0); let dernier = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brun) { dernier = (dernier + .02 * w) / 1.02; d[i] = dernier * 3.5; } else d[i] = w; }
  return b;
}
function creerAmbiance() {
  const c = ctx; if (!c) return null;
  const source = brun => { const s = c.createBufferSource(); s.buffer = bufferBruit(c, brun); s.loop = true; s.start(); return s; };
  // murmure : du bruit brun filtré autour des fréquences de la voix, qui « respire » lentement
  const voix = c.createBiquadFilter(); voix.type = 'bandpass'; voix.frequency.value = 520; voix.Q.value = .9;
  const murmure = c.createGain(); murmure.gain.value = 0;
  const souffle = c.createOscillator(), profondeur = c.createGain(); souffle.frequency.value = .23; profondeur.gain.value = 0; souffle.connect(profondeur).connect(murmure.gain); souffle.start();
  source(true).connect(voix).connect(murmure).connect(general);
  // pluie : bruit blanc adouci
  const haut = c.createBiquadFilter(); haut.type = 'highpass'; haut.frequency.value = 900;
  const bas = c.createBiquadFilter(); bas.type = 'lowpass'; bas.frequency.value = 6500;
  const pluie = c.createGain(); pluie.gain.value = 0;
  source(false).connect(haut).connect(bas).connect(pluie).connect(general);
  return { murmure, profondeur, pluie };
}
// Appelée à chaque image : clients présents, café ouvert, pluie
export function ambiance({ clients = 0, ouvert = false, pluie = false } = {}) {
  if (!ctx || ctx.state !== 'running') return;
  if (!amb) amb = creerAmbiance(); if (!amb) return;
  const on = actif && !coupe, t = ctx.currentTime;
  const m = on && ouvert ? Math.min(.11, .012 + clients * .009) : 0;
  amb.murmure.gain.setTargetAtTime(m, t, 1.2); amb.profondeur.gain.setTargetAtTime(m * .35, t, 1.2);
  amb.pluie.gain.setTargetAtTime(on && pluie ? .022 : 0, t, 1.5);
}

export const sons = {
  // le sifflement de la buse à vapeur et le tintement d'une tasse posée
  vapeur() {
    const c = audio(); if (!c || !actif) return;
    const s = c.createBufferSource(); s.buffer = bufferBruit(c, false);
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2800;
    const g = c.createGain(), t = c.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.018, t + .15); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
    s.connect(f).connect(g).connect(busSons); s.start(t); s.stop(t + 1.5);
  },
  tasse() { sonNote(2350 + Math.random() * 300, 0, .18, 'sine', .012); sonNote(3100 + Math.random() * 300, .01, .12, 'sine', .007); },
  tinte() { const n = performance.now(); if (n - dernierTinte < 300) return; dernierTinte = n; sonNote(1318, 0, .12, 'triangle', .04); sonNote(1760, .06, .2, 'triangle', .03); },
  clic() { sonNote(660, 0, .08, 'sine', .05); },
  achat() { [523, 659, 784, 1046].forEach((f, i) => sonNote(f, i * .07, .28, 'triangle', .05)); },
  succes() { [784, 988, 1175, 1568].forEach((f, i) => sonNote(f, i * .09, .45, 'sine', .06)); },
  panne() { sonNote(110, 0, .35, 'sawtooth', .035); sonNote(98, .15, .4, 'sawtooth', .03); },
  repare() { sonNote(880, 0, .1, 'square', .025); sonNote(1175, .08, .15, 'square', .025); },
  livraison() { sonNote(196, 0, .15, 'triangle', .06); sonNote(147, .1, .22, 'triangle', .05); },
  bulle() { sonNote(587, 0, .18, 'sine', .04); sonNote(784, .1, .25, 'sine', .04); },
};
