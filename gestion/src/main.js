// Point d'entrée (version gestion) : relie la logique, la scène 3D et l'interface. Sauvegarde, vitesse, pannes, événements.
import { creerScene } from './scene.js';
import { creerUI, fmt } from './ui.js';
import { sons } from './sons.js';
import { plateforme } from './plateforme.js';
import * as J from './game.js';
import { G, STATIONS } from './data.js';

// Sauvegarde à part de la version idle ; le mode ?debug a la sienne, pour ne jamais toucher à la vraie partie
const CLE = new URLSearchParams(location.search).has('debug') ? 'n15x-gestion-v1-debug' : 'n15x-gestion-v1';
let e = J.nouvelEtat();
let enJeu = false;   // vrai une fois l'écran d'accueil passé
let vitesse = 1;     // ×1, ×2, ×3, ou 0 (pause)

// ---------- Sauvegarde ----------
try {
  const d = JSON.parse(localStorage.getItem(CLE) || 'null');
  if (d && d.version === 5) e = J.restaurer(d);
} catch { e = J.nouvelEtat(); }
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(e)); } catch { /* stockage indisponible : on joue sans sauvegarde */ } }

// ---------- Plateforme (CrazyGames, itch.io, web) ----------
await plateforme.init();
plateforme.chargementDebut();

// ---------- Scène et interface ----------
let ui = null;
const elChargement = document.getElementById('chargement');
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
  surHabitue: (h, pos) => {
    const p = J.servirHabitue(e, h.id);
    if (!p) return;
    ui.parole(pos, h.nom, h.phrases[Math.floor(Math.random() * h.phrases.length)]);
    setTimeout(() => ui.pop(pos, '+' + fmt(p) + ' pourboire'), 400);
  },
});
const jeu = {
  get e() { return e; },
  get vitesse() { return vitesse; },
  set vitesse(v) { vitesse = v; },
  sauver,
  plateforme,
  // Le matin, c'est le joueur qui ouvre le café
  ouvrirCafe() {
    if (J.ouvert(e) || e.faillite) return;
    const arr = J.ouvrir(e);
    arr.forEach(ar => { traiterArrivee(ar); if (ar.livraison) scene.livraison(ar.livraison.grain, sacsVisibles(ar.livraison)); });
    ui.fermer(); sauver(); sons.clic();
  },
  renommer(nom) { e.meta.nomCafe = J.nettoyerNom(nom); scene.majDecor(e); sauver(); },
  exporter() { sauver(); return J.exporterSauvegarde(e); },
  importer(code) {
    const n = J.importerSauvegarde(code); if (!n) return false;
    e = n; scene.majDecor(e); ui.fermer(); sauver(); return true;
  },
  nouvellePartie() {
    try { localStorage.removeItem(CLE); } catch { /* rien */ }
    e = J.nouvelEtat(); scene.majDecor(e); ui.fermer(); sauver();
  },
};
ui = creerUI({ jeu, scene });
scene.majDecor(e);
// Les livraisons se comptent en kilos : on montre entre 1 et 6 cartons
const sacsVisibles = c => Math.max(1, Math.min(6, Math.round(c.sacs / 5)));

// Onglet masqué : on met en pause (un jeu de gestion n'avance pas sans toi)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { sauver(); plateforme.jeuPause(); return; }
  if (enJeu) plateforme.jeuDebut();
});
setInterval(sauver, 5000);
addEventListener('pagehide', sauver);

// ---------- Pannes et événements ----------
let minuteurPanne = J.intervallePanne(e, Math.random()), minuteurEvt = 120 + Math.random() * 80, accVerif = 0;
function panne() {
  const i = J.choisirPanne(e, Math.random());
  if (!J.declencherPanne(e, i)) return;
  const s = STATIONS[i], vieille = i === 2 && J.tierMachine(e) === 0;
  const reparateur = e.equipe.some(p => p.role === 'barista' && p.comp >= 3 && J.presentA(p, J.momentIndex(e)));
  sons.panne();
  ui.toast(`<b>Panne !</b> ${vieille ? "La vieille machine d'occasion a encore lâché." : `${s.nom} est en panne.`} ${reparateur ? 'Ton barista confirmé s’en occupe… ou touche-la 3 fois.' : 'Touche-la 3 fois pour la réparer.'}`, 6000);
}
function evenement() {
  const liste = J.evenementsPossibles(e), type = liste[Math.floor(Math.random() * liste.length)];
  const r = J.appliquerEvenement(e, type);
  if (type === 'touristes') ui.toast("<b>Un bus de touristes</b> s'arrête devant le café : affluence ×1,8 pendant 1 h 20. L’équipe va suivre ?");
  if (type === 'pluie') ui.toast(r.terrasse ? '<b>Averse !</b> La terrasse se vide : −20 % de clients pendant 1 h 40.' : '<b>Averse !</b> Les passants se réfugient chez toi : +15 % de clients pendant 1 h 40.');
  if (type === 'cafemax') ui.toast('<b>CaféMax</b> lance une promo en face : −35 % de clients pendant 1 h 30.');
  if (type === 'critique') ui.toast(r.ok ? '<b>Madame Lefèvre</b>, la critique gastronomique, a adoré ton café : la note grimpe et on parle de toi !'
    : '<b>Madame Lefèvre</b> est passée… « Un café quelconque. » La note baisse. Il faudrait un meilleur grain, au juste prix.', 6500);
}

// ---------- Arrivées de la journée et de la nuit ----------
function traiterArrivee(ar) {
  if (ar.fermeture) { ui.finJournee(ar.fermeture); setTimeout(() => ui.ouvrirJournal('bilan'), 600); sauver(); }
  if (ar.ouverture) { const m = J.meteoDuJour(e), b = J.CATALOGUE_BOISSONS[e.boisson]; ui.toast(`7 h : ${J.nomCafe(e)} ouvre ! ${J.dateTexte(e)} · ${m.icone} ${m.nom}${e.boisson !== 'aucune' ? ` · boisson du jour : ${b.icone} ${b.nom}` : ''}.`, 4500); scene.majDecor(e); }
  if (ar.surpriseMeteo) setTimeout(() => ui.toast(`La météo s’est trompée : ${J.CATALOGUE_METEOS[ar.surpriseMeteo.reelle].icone} <b>${J.CATALOGUE_METEOS[ar.surpriseMeteo.reelle].nom}</b> au lieu de ${J.CATALOGUE_METEOS[ar.surpriseMeteo.prevue].nom.toLowerCase()}.`, 5000), 4600);
  if (ar.retard) ui.toast(`Le fournisseur est en retard : <b>${ar.retard.sacs} kg</b> arriveront vers midi.`, 5000);
  if (ar.decisionAuto) ui.toast(`Pas de réponse : ${ar.decisionAuto}`, 4500);
  if (ar.demission) setTimeout(() => ui.bulle(`${ar.demission} a démissionné : trop de fatigue, ou un salaire trop bas. Regarde le moral de ton équipe dans le journal.`, { titre: 'Une démission' }), 1200);
  if (ar.formation) ui.toast(`<b>${ar.formation}</b> revient de formation : niveau ${ar.comp} !`, 4500);
  if (ar.pretRembourse) ui.toast('<b>Prêt remboursé !</b> Plus de mensualité.', 5000);
  if (ar.abonnementRate) ui.toast(`La commande permanente n’a pas pu partir (${ar.abonnementRate === 'place' ? 'réserve pleine' : 'problème'}).`, 5000);
  if (ar.alerteBanque) setTimeout(() => ui.toast('<b>La banque s’inquiète</b> : ton compte est bien dans le rouge. Réduis les charges ou augmente les ventes.', 6000), 2000);
  if (ar.finMois) {
    const m = ar.finMois, res = m.resultat;
    setTimeout(() => ui.bulle(`Bilan de ${m.nom.toLowerCase()} : ${fmt(m.ca)} de chiffre d’affaires, ${fmt(m.salaires)} de salaires, ${fmt(m.loyer)} de loyer. Résultat : ${res < 0 ? '−' + fmt(-res) : fmt(res)}${m.impots ? ` (après ${fmt(m.impots)} d’impôt)` : ''}. ${res > 0 ? 'Bravo, ma petite !' : 'On va redresser la barre : regarde les salaires et le prix.'}`, { titre: `Fin du mois de ${m.nom.toLowerCase()}` }), 1800);
  }
  if (ar.sauvetage) setTimeout(() => ui.bulle('Ton compte a plongé trop bas : la banque voulait fermer le café ! J’ai vidé mon livret pour te renflouer de 10 000 €. Je ne pourrai pas le refaire, alors fais attention aux charges.', { titre: 'Mamie à la rescousse' }), 2500);
  if (ar.faillite) setTimeout(() => ui.bulle('La banque a fermé le compte : le café est en faillite. On ne baisse pas les bras : on recommence, en surveillant mieux les charges.', { titre: 'Faillite', boutons: [{ label: 'Recommencer', cls: 'vert', fn: () => jeu.nouvellePartie() }] }), 2500);
}

// ---------- Boucle ----------
let dernier = performance.now();
function image(dt) {
  const dtJeu = dt * vitesse;
  const res = J.tick(e, dtJeu);
  for (const ar of res.arrivees) {
    if (ar.livraison) { scene.livraison(ar.livraison.grain, sacsVisibles(ar.livraison)); sons.livraison(); }
    if (ar.debloque) ui.toast(`Ta note grimpe : <b>${G[ar.debloque].nom}</b> est disponible dans la réserve !`, 6000);
    traiterArrivee(ar);
    if (ar.plusDeLait) ui.toast('<b>Plus de lait !</b> Les clients reprennent des espressos. Commande du lait dans la Réserve.', 5500);
    if (ar.defiReussi) { sons.succes(); ui.toast(`⚡ Défi du jour réussi : <b>${ar.defiReussi.texte}</b> · +${fmt(ar.defiReussi.prime)}`, 5000); }
    if (ar.defiRate) ui.toast(`Défi du jour raté : ${ar.defiRate.texte}. Demain, un autre !`, 4500);
    if (ar.repli) ui.toast(`Plus de grain servi : on passe au <b>${G[ar.repli].nom}</b>. Vérifie ton prix !`, 5500);
    if (ar.reparee) ui.toast('Ton barista a réparé la panne.', 3000);
  }
  if (J.ouvert(e)) {   // pannes et événements seulement quand le café est ouvert
    minuteurPanne -= dtJeu; if (minuteurPanne <= 0) { minuteurPanne = J.intervallePanne(e, Math.random()) * 1.5; panne(); }
    minuteurEvt -= dtJeu; if (minuteurEvt <= 0) { minuteurEvt = 120 + Math.random() * 100; evenement(); }
  }
  accVerif += dt;
  if (accVerif > 1) {
    accVerif = 0;
    const obj = J.verifierObjectif(e); if (obj) { ui.objectifAtteint(obj); plateforme.joie(); }
    J.verifierSucces(e).forEach((s, k) => setTimeout(() => sons.succes() || ui.toast(`Succès : <b>${s.nom}</b>`, 4000), k * 1500));
    if (document.getElementById('bulle').hidden) { const h = J.verifierHistoire(e); if (h) { ui.bulle(h.texte, { titre: h.titre }); scene.majDecor(e); } }
  }
  // Pour la 3D : le personnel présent apparaît à son poste (ces champs ne servent qu'au dessin)
  const k = J.momentIndex(e), pres = J.ouvert(e) ? e.equipe.filter(p => J.presentA(p, k) && !p.gerant) : [];
  e.st[0].manager = false;
  e.st[1].manager = pres.filter(p => p.role === 'barista').length >= 2;
  e.st[2].manager = pres.some(p => p.role === 'barista');
  e.st[3].manager = pres.some(p => p.role === 'salle');
  ui.maj(res, dt);
  scene.image(vitesse ? dt * Math.min(vitesse, 2) : 0, e, res);
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
if (!params.has('debug') || params.has('accueil')) {
  const acc = document.getElementById('accueil');
  const dejaJoue = e.meta.tasses > 0 || e.jour > 1;
  document.getElementById('jouer').textContent = dejaJoue ? 'Continuer' : 'Ouvrir mon café';
  const nouveau = !e.meta.nomCafe;
  document.getElementById('accueil-nom').hidden = !nouveau;
  if (nouveau && dejaJoue) document.querySelector('#accueil-nom label').textContent = 'Ton café n’a pas encore de nom : comment s’appelle-t-il ?';
  const champ = document.getElementById('nom-cafe');
  champ.addEventListener('keydown', ev => { if (ev.key === 'Enter') document.getElementById('jouer').click(); });
  document.getElementById('accueil-info').textContent = dejaJoue ? `${J.nomCafe(e)} · ${J.dateTexte(e)} · ${fmt(e.argent)} en caisse` : 'Version gestion : recrute, fais le planning, tiens tes comptes.';
  acc.hidden = false;
  document.getElementById('jouer').onclick = () => {
    if (nouveau) { e.meta.nomCafe = J.nettoyerNom(champ.value) || J.NOM_PAR_DEFAUT; scene.majDecor(e); sauver(); champ.blur(); }
    acc.classList.add('part'); setTimeout(() => { acc.hidden = true; }, 450); sons.clic(); enJeu = true; plateforme.jeuDebut(); };
} else { enJeu = true; plateforme.jeuDebut(); }
if (!window.PLATEFORME && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
}

// Outils de test, seulement avec ?debug dans l'adresse
if (new URLSearchParams(location.search).has('debug')) {
  window.__n15x = { plateforme, scene, get e() { return e; }, set e(v) { e = v; scene.majDecor(e); }, J, jeu, majDecor: () => scene.majDecor(e), pas: (n = 10, dt = .1) => { for (let k = 0; k < n; k++) image(dt); } };
}
