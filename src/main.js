// Point d'entrée : relie la logique, la scène 3D et l'interface. Sauvegarde, hors ligne, pannes, événements.
import { creerScene } from './scene.js';
import { creerUI, fmt } from './ui.js';
import { sons } from './sons.js';
import { plateforme } from './plateforme.js';
import * as J from './game.js';
import { G, STATIONS, ABSENCE_MAX } from './data.js';

// Le mode ?debug a sa propre sauvegarde, pour ne jamais toucher à la vraie partie
const CLE = new URLSearchParams(location.search).has('debug') ? 'n15x-v1-debug' : 'n15x-v1';
let e = J.nouvelEtat();
let absence = 0;
let enJeu = false;   // vrai une fois l'écran d'accueil passé

// ---------- Sauvegarde ----------
try {
  const d = JSON.parse(localStorage.getItem(CLE) || 'null');
  if (d) {
    const t0 = d.t; delete d.t;
    e = J.restaurer(d);
    if (t0) absence = Math.min(Math.max(0, (Date.now() - t0) / 1000), ABSENCE_MAX);
  }
} catch { e = J.nouvelEtat(); }
function sauver() { try { localStorage.setItem(CLE, JSON.stringify({ ...e, t: Date.now() })); } catch { /* stockage indisponible : on joue sans sauvegarde */ } }

// ---------- Plateforme (CrazyGames, itch.io, web) ----------
await plateforme.init();
plateforme.chargementDebut();

// ---------- Scène et interface ----------
let ui = null;
const elChargement = document.getElementById('chargement');
// Pas de WebGL : on le dit clairement au lieu d'afficher une page blanche
const toileTest = document.createElement('canvas');
if (!(toileTest.getContext('webgl2') || toileTest.getContext('webgl'))) {
  elChargement.textContent = 'Ton navigateur ne peut pas afficher la 3D (WebGL). Essaie avec Chrome, Edge, Firefox ou Safari à jour.';
  throw new Error('WebGL indisponible');
}
const scene = await creerScene(document.getElementById('scene'), {
  surProgression: p => { elChargement.style.setProperty('--progression', Math.round(p * 100) + '%'); },
  surStation: i => ui.toucherStation(i),
  surPop: (pos, txt, rouge) => { ui.pop(pos, txt, rouge); if (txt.startsWith('+') && txt.includes('€')) sons.tinte(); },
  fmt,
  // Un habitué est servi : pourboire, petite phrase, et on le compte
  surHabitue: (h, pos) => {
    const p = J.servirHabitue(e, h.id);
    if (!p) return;
    ui.parole(pos, h.nom, h.phrases[Math.floor(Math.random() * h.phrases.length)]);
    setTimeout(() => ui.pop(pos, '+' + fmt(p) + ' pourboire'), 400);
  },
});
const jeu = {
  get e() { return e; },
  sauver,
  plateforme,
  franchiser(ville) {
    const n = J.franchiser(e, ville); if (!n) return;
    const avant = J.nomVille(e);
    e = n; scene.majDecor(e); ui.fermer(); sauver(); plateforme.joie();
    ui.bulle(`Le Petit Grain de ${avant} tourne tout seul maintenant. Te voilà à ${J.nomVille(e)}, dans un petit local avec une vieille machine… comme au début ! Mais cette fois, tu as ${e.meta.etoilesF} étoile${e.meta.etoilesF > 1 ? 's' : ''} de franchise : dépense-les dans l’Héritage (carnet). ${J.villeInfo(e).desc}`, { titre: `Bienvenue à ${J.nomVille(e)} !` });
  },
  nouvellePartie() {
    try { localStorage.removeItem(CLE); } catch { /* rien */ }
    e = J.nouvelEtat(); scene.majDecor(e); ui.fermer(); sauver();
  },
};
ui = creerUI({ jeu, scene });
scene.majDecor(e);

// Gains hors ligne au chargement
if (absence > 30) {
  const r = J.simulerAbsence(e, absence);
  scene.majDecor(e);
  const texte = `Pendant ton absence (${Math.round(absence / 60)} min), l'équipe a servi ${Math.round(r.tasses).toLocaleString('fr-FR')} cafés et gagné ${fmt(r.gain)}.` + (r.vide ? ' Mais la réserve est vide : commande des grains !' : '');
  // Sur CrazyGames : regarder une pub double les gains de l'absence
  const boutons = plateforme.pubs && r.gain > 0 ? [{ label: 'Merci !' }, { label: `📺 Doubler (+${fmt(r.gain)})`, cls: 'miel', fn: () => plateforme.pubRecompense().then(ok => {
    if (!ok) return ui.toast('La pub n’a pas pu s’afficher. Pas grave !');
    e.argent += r.gain; e.meta.totalGagne += r.gain; sons.succes(); ui.toast(`Gains doublés : <b>+${fmt(r.gain)}</b> !`); sauver();
  }) }] : [{ label: "D'accord !" }];
  ui.bulle(texte, { titre: 'Bon retour !', boutons });
}

// Onglet masqué : le navigateur coupe l'animation, alors on rattrape le temps au retour
let masqueDepuis = document.hidden ? Date.now() : null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { masqueDepuis = Date.now(); sauver(); plateforme.jeuPause(); return; }
  if (enJeu) plateforme.jeuDebut();
  if (masqueDepuis == null) return;
  const s = Math.min((Date.now() - masqueDepuis) / 1000, ABSENCE_MAX); masqueDepuis = null;
  if (s < 2) return;
  const r = J.simulerAbsence(e, s, 1);
  if (s > 20) ui.toast(`Pendant ton absence : <b>${fmt(r.gain)}</b>.`);
});
setInterval(sauver, 5000);
addEventListener('pagehide', sauver);

// ---------- Pannes et événements ----------
let minuteurPanne = J.intervallePanne(e, Math.random()), minuteurEvt = 90 + Math.random() * 50, accVerif = 0;
function panne() {
  const i = J.choisirPanne(e, Math.random());
  if (!J.declencherPanne(e, i)) return;
  const s = STATIONS[i], vieille = i === 2 && J.tierMachine(e) === 0;
  sons.panne();
  ui.toast(`<b>Panne !</b> ${vieille ? "La vieille machine d'occasion a encore lâché." : `${s.nom} est en panne.`} ${e.st[i].manager ? `${s.mgrNom} répare (6 s)… ou touche-la 3 fois.` : 'Touche-la 3 fois pour la réparer.'}`, 6000);
}
function evenement() {
  const liste = J.evenementsPossibles(e), type = liste[Math.floor(Math.random() * liste.length)];
  const r = J.appliquerEvenement(e, type);
  if (type === 'touristes') ui.toast("<b>Un bus de touristes</b> s'arrête devant le café : affluence ×1,9 pendant 40 s. Vérifie ta réserve !");
  if (type === 'pluie') ui.toast(r.terrasse ? '<b>Averse !</b> La terrasse se vide : −20 % de clients pendant 50 s.' : '<b>Averse !</b> Les passants se réfugient chez toi : +20 % de clients pendant 50 s.');
  if (type === 'cafemax') ui.toast('<b>CaféMax</b> lance une promo en face : affluence −40 % pendant 45 s. Baisse ton prix pour résister ?');
  if (type === 'critique') ui.toast(r.ok ? '<b>Madame Lefèvre</b>, la critique gastronomique, a adoré ton café : +0,7 ★ !'
    : '<b>Madame Lefèvre</b> est passée… « Un café quelconque. » −0,4 ★. Il faudrait un meilleur grain, au juste prix.', 6500);
}

// ---------- Arrivées de la journée et de la nuit ----------
function traiterArrivee(ar) {
  if (ar.fermeture) { ui.finJournee(ar.fermeture); setTimeout(() => ui.ouvrirJournal('bilan'), 600); sauver(); }
  if (ar.ouverture) { const m = J.meteoDuJour(e), b = J.CATALOGUE_BOISSONS[e.boisson]; ui.toast(`7 h : le Petit Grain ouvre ! Jour ${ar.ouverture} · ${m.icone} ${m.nom}${e.boisson !== 'aucune' ? ` · boisson du jour : ${b.icone} ${b.nom}` : ''}.`, 4500); scene.majDecor(e); }
  if (ar.surpriseMeteo) setTimeout(() => ui.toast(`La météo s’est trompée : ${J.CATALOGUE_METEOS[ar.surpriseMeteo.reelle].icone} <b>${J.CATALOGUE_METEOS[ar.surpriseMeteo.reelle].nom}</b> au lieu de ${J.CATALOGUE_METEOS[ar.surpriseMeteo.prevue].nom.toLowerCase()}.`, 5000), 4600);
  if (ar.retard) ui.toast(`Le grossiste est en retard : <b>${ar.retard.sacs} sac${ar.retard.sacs > 1 ? 's' : ''}</b> arriveront vers midi.`, 5000);
  if (ar.decisionAuto) ui.toast(`Pas de réponse : ${ar.decisionAuto}`, 4500);
}
jeu.arrivees = liste => liste.forEach(ar => { traiterArrivee(ar); if (ar.livraison) scene.livraison(ar.livraison.grain, ar.livraison.sacs); });

// ---------- Boucle ----------
let dernier = performance.now();
function image(dt) {
  const res = J.tick(e, dt);
  for (const ar of res.arrivees) {
    if (ar.livraison) { scene.livraison(ar.livraison.grain, ar.livraison.sacs); sons.livraison(); }
    if (ar.debloque) ui.toast(`Ta réputation grimpe : <b>${G[ar.debloque].nom}</b> est disponible dans la réserve !`, 6000);
    if (ar.cadeau) ui.toast("<b>Mamie Odette</b> passe en douce et te dépanne d'un sac. « Fais attention à ta caisse, ma petite ! »", 6500);
    traiterArrivee(ar);
    if (ar.plusDeLait) ui.toast('<b>Plus de lait !</b> Les clients reprennent des espressos. Commande du lait dans la Réserve.', 5500);
    if (ar.defiReussi) { sons.succes(); ui.toast(`⚡ Défi du jour réussi : <b>${ar.defiReussi.texte}</b> · +${fmt(ar.defiReussi.prime)}`, 5000); }
    if (ar.defiRate) ui.toast(`Défi du jour raté : ${ar.defiRate.texte}. Demain, un autre !`, 4500);
    if (ar.repli) ui.toast(`Plus de grain servi : on passe au <b>${G[ar.repli].nom}</b>. Vérifie ton prix !`, 5500);
  }
  if (J.ouvert(e)) {   // pannes et événements seulement quand le café est ouvert
    minuteurPanne -= dt; if (minuteurPanne <= 0) { minuteurPanne = J.intervallePanne(e, Math.random()); panne(); }
    minuteurEvt -= dt; if (minuteurEvt <= 0) { minuteurEvt = 80 + Math.random() * 70; evenement(); }
  }
  accVerif += dt;
  if (accVerif > 1) {
    accVerif = 0;
    const obj = J.verifierObjectif(e); if (obj) { ui.objectifAtteint(obj); plateforme.joie(); }
    J.verifierSucces(e).forEach((s, k) => setTimeout(() => sons.succes() || ui.toast(`Succès : <b>${s.nom}</b> · +2 % de clients pour toujours`, 4000), k * 1500));
    if (document.getElementById('bulle').hidden) { const h = J.verifierHistoire(e); if (h) { ui.bulle(h.texte, { titre: h.titre }); scene.majDecor(e); } }
  }
  ui.maj(res, dt);
  scene.image(dt, e, res);
}
function boucle(maintenant) {
  const dt = Math.min((maintenant - dernier) / 1000, .1); dernier = maintenant;
  if (!plateforme.enPub) image(dt);   // pendant une pub, le café s'arrête
  requestAnimationFrame(boucle);
}
image(0);
elChargement.classList.add('fini');
plateforme.chargementFin();
requestAnimationFrame(t => { dernier = t; requestAnimationFrame(boucle); });

// Écran d'accueil (pas en mode test)
const params = new URLSearchParams(location.search);
if (!params.has('debug') || params.has('accueil')) {   // ?debug&accueil : voir l'accueil sans toucher à la vraie partie
  const acc = document.getElementById('accueil');
  const dejaJoue = e.meta.tasses > 0;
  document.getElementById('jouer').textContent = dejaJoue ? 'Continuer' : 'Jouer';
  document.getElementById('accueil-info').textContent = dejaJoue ? `${J.nomVille(e)} · ${fmt(e.argent)} en caisse` : '';
  acc.hidden = false;
  document.getElementById('jouer').onclick = () => { acc.classList.add('part'); setTimeout(() => { acc.hidden = true; }, 450); sons.clic(); enJeu = true; plateforme.jeuDebut(); };
} else { enJeu = true; plateforme.jeuDebut(); }
// Hors ligne : le navigateur garde une copie du jeu après la première visite
// (pas sur CrazyGames ni itch.io : le jeu y tourne dans une iframe, c'est la plateforme qui gère le cache)
if (!window.PLATEFORME && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
}

// Outils de test, seulement avec ?debug dans l'adresse
if (new URLSearchParams(location.search).has('debug')) {
  window.__n15x = { plateforme, scene, get e() { return e; }, set e(v) { e = v; scene.majDecor(e); }, J, majDecor: () => scene.majDecor(e), pas: (n = 10, dt = .1) => { for (let k = 0; k < n; k++) image(dt); } };
}
