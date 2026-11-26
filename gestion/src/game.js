// Logique pure du jeu — version « gestion » (v5) : aucun DOM, aucune 3D, aucun Date.now(). Testée par node --test.
// Le hasard est passé en paramètre (rnd), pour que les tests soient reproductibles.
// Une heure de jeu dure 30 s ; les capacités et la demande se comptent par heure, puis sont ramenées à la seconde.
import {
  GRAINS, G, STATIONS, TRAVAUX, T, SUCCES, HISTOIRE, DOSES_SAC, VILLES, INFOS_VILLES, OBJECTIFS, HABITUES, LAIT,
  HORAIRES, COURBE_HEURE, MOMENTS, URGENCE, MACHINES, MOULINS, FOURNISSEURS, DUREE_DECISION, FRAICHEUR, TARIFS, CALCAIRE,
  METEOS, FIABILITE_PREVISION, BOISSONS, MURS, SOLS, FORMULES, DEFIS, DOSAGE, PRENOMS_AVIS,
  CAPACITE, DEMANDE_BASE, RESERVE_KG, PERSONNEL, TRAITS, PRENOMS_EMPLOYES, MOIS, ENERGIE, PRETS, DECOUVERT, ARGENT_DEPART,
  JOURS_SEMAINE, AFFLUENCE_JOUR, NOMS_MOIS, SAISONS, VIENNOISERIES, NOTE, NOTORIETE, CONSOMMABLES,
  CARTE, VARIETE, DEUXIEME_TASSE, MARKETING, FIDELITE, DIFFICULTES, MEDAILLES, NOUVELLES_QUARTIER,
  LETTRES, LETTRES_QUARTIER, LETTRE_QUARTIER, SECRET_MAMIE, AMITIE, CADEAUX_HABITUES, HISTOIRES_HABITUES,
  NIVEAU_CAFE, XP, DEBLOCAGES, NIVEAUX_POSTES, COMMANDES, CLIENTS_COMMANDES, ABSENCE, VISITEURS, VISITE_RARE,
  OR, MISSIONS, RARETES, CARTES_NIVEAUX, EMPLACEMENTS, CARTES as CARTES_COLLECTION, CAISSES,
  COLLECTIONS, BOUTIQUE, UNIFORMES, LIGUE, CAFES_RIVAUX, EVENEMENTS_QUARTIER, EVT_QUARTIER, TRAITS_LEGENDE, LEGENDES, ROUE, CONCOURS_DECO,
} from './data.js';
const CA = Object.fromEntries(CARTE.map(p => [p.id, p]));
const MK = Object.fromEntries(MARKETING.map(m => [m.id, m]));
export { CA as CATALOGUE_CARTE, MK as CATALOGUE_MARKETING };

const M = Object.fromEntries(MACHINES.map(m => [m.id, m]));
const MO = Object.fromEntries(MOULINS.map(m => [m.id, m]));
const F = Object.fromEntries(FOURNISSEURS.map(f => [f.id, f]));
const MET = Object.fromEntries(METEOS.map(x => [x.id, x])), BO = Object.fromEntries(BOISSONS.map(x => [x.id, x]));
const FO = Object.fromEntries(FORMULES.map(x => [x.id, x]));
const MU = Object.fromEntries(MURS.map(x => [x.id, x])), SO = Object.fromEntries(SOLS.map(x => [x.id, x]));
const TR = Object.fromEntries([...TRAITS, ...TRAITS_LEGENDE].map(x => [x.id, x]));
const PR = Object.fromEntries(PRETS.map(x => [x.id, x]));
export { M as CATALOGUE_MACHINES, MO as CATALOGUE_MOULINS, F as CATALOGUE_FOURNISSEURS, MET as CATALOGUE_METEOS, BO as CATALOGUE_BOISSONS,
  FO as CATALOGUE_FORMULES, MU as CATALOGUE_MURS, SO as CATALOGUE_SOLS, TR as CATALOGUE_TRAITS, PR as CATALOGUE_PRETS };

const SPH = HORAIRES.secondesParHeure;
export const HEURES_MOMENT = MOMENTS.map(m => m.a - m.de);

// ---------- État ----------
export function nouvelleMeta() {
  return { succes: [], histoire: [], tasses: 0, totalGagne: 0, reparations: 0, critiques: 0, habitues: {}, nomCafe: '', ville: 0, clientsTotal: 0,
    courrier: null, amities: {}, cadeaux: [], secret: false, xpBonus: 0, niveau: 1, album: {}, visiteJour: 0,
    grainsOr: OR.depart, orTotal: 0, cartes: {}, cartesActives: [], caissesOuvertes: 0,
    caissesGratuites: {}, uniforme: 'cafe', uniformes: ['cafe'], roueJour: '' };
}
export const nouvelleJournee = () => ({ recettes: 0, depenses: 0, charges: 0, tasses: 0, clients: 0, perdus: 0, satisfaction: 0, commandes: 0,
  viennoiseries: 0, invendus: 0, produits: {}, remises: 0,
  moments: MOMENTS.map(() => ({ t: 0, ventes: 0, station: 0, clients: 0, stock: 0, stations: [0, 0, 0, 0] })),
  heures: Array.from({ length: HORAIRES.fermeture - HORAIRES.ouverture }, () => ({ ventes: 0, recettes: 0, station: 0, clients: 0, stock: 0 })) });
export const nouveauMois = () => ({ ca: 0, achats: 0, salaires: 0, loyer: 0, energie: 0, entretien: 0, interets: 0, impots: 0, investissements: 0, marketing: 0, primes: 0 });
// vu : le produit a déjà été proposé (ceux qui demandent un achat entrent à la carte tout seuls, la première fois)
export const carteDepart = () => Object.fromEntries(CARTE.filter(p => p.id !== 'espresso').map(p => [p.id, { on: !!p.actif, prix: p.depart, vu: !p.req }]));
const gerant = () => ({ id: 'toi', nom: 'Toi', role: 'barista', comp: 2, salaire: 0, trait: null, fatigue: 0, moral: 1, planning: [1, 1, 1, 1], formation: 0, heuresSemaine: 0, gerant: true });
const candidatsDeDepart = () => [
  { id: 'c1', nom: 'Nadia', role: 'salle', comp: 2, salaire: 13.6, trait: 'souriant' },
  { id: 'c2', nom: 'Lucas', role: 'barista', comp: 2, salaire: 13.6, trait: 'rapide' },
  { id: 'c3', nom: 'Théo', role: 'salle', comp: 1, salaire: 11.65, trait: 'apprenti' },
];
export function nouvelEtat(meta = nouvelleMeta()) {
  return {
    version: 5,
    argent: (DIFFICULTES[meta.difficulte] || DIFFICULTES.normal).argent, rep: NOTE.depart, nbAvis: 0, notoriete: NOTORIETE.depart, prix: 1.5, maison: 'premier',
    stock: Object.fromEntries(GRAINS.map(g => [g.id, g.id === 'premier' ? 3 * DOSES_SAC : 0])),
    debloques: ['premier'], achats: [], commandes: [], livraisonsMatin: [],
    machines: ['occasion', null, null], moulin: 'manivelle', fournisseur: 'grossiste',
    st: STATIONS.map(() => ({ niv: 1, manager: false, coup: 0, panne: null })),
    equipe: [gerant()], candidats: candidatsDeDepart(), prochainId: 1,
    pret: null, mois: nouveauMois(), historiqueMois: [], sauvetage: false, faillite: false,
    abonnement: { grain: null, kg: 0 }, viennoiseries: { commande: 0, stock: 0 },
    age: Object.fromEntries(GRAINS.map(g => [g.id, 0])), tarifs: [1, 1, 1, 1], calcaire: [0, 0, 0],
    meteo: 'nuages', meteoDemain: 'soleil', boisson: 'aucune', deco: { mur: 'creme', sol: 'parquet', vus: ['creme', 'parquet'] }, formules: {}, defi: null,
    dosage: DOSAGE.reference, service: 1,
    carte: carteDepart(), campagnes: [], fidelite: { active: false, membres: 0 }, gazettes: [],
    commandesSpe: [], attenteCommande: 0, compteurCommandes: 0, ligue: null, boutique: null, evtQuartier: null, roue: null,
    evts: [], ruptureDepuis: 0, rupturesVues: 0, lait: 0, laitVide: false,
    phase: 'service', horloge: HORAIRES.ouverture, nuitReste: 0, jour: 1,
    journee: nouvelleJournee(), bilans: [], decision: null, decisionsDuJour: [],
    objectif: 0, stats: { coups: 0, commandes: 0, nuits: 0, embauches: 0, formations: 0, pretsRembourses: 0, campagnes: 0 },
    meta,
  };
}

// ---------- Le café du joueur : son nom, et sa sauvegarde à emporter ----------
export const NOM_PAR_DEFAUT = 'Le Petit Grain';
export const nomCafe = e => e.meta.nomCafe || NOM_PAR_DEFAUT;
export const nettoyerNom = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 22);
export function exporterSauvegarde(e) {
  const octets = new TextEncoder().encode(JSON.stringify(e));
  let bin = ''; for (let k = 0; k < octets.length; k += 8192) bin += String.fromCharCode(...octets.subarray(k, k + 8192));
  return 'PG5:' + btoa(bin);
}
export function importerSauvegarde(code) {
  try {
    const brut = String(code || '').trim().replace(/^PG5:/, '').replace(/\s+/g, '');
    const bin = atob(brut), octets = Uint8Array.from(bin, c => c.charCodeAt(0));
    const d = JSON.parse(new TextDecoder().decode(octets));
    if (!d || typeof d !== 'object' || !d.meta || typeof d.argent !== 'number' || d.version !== 5) return null;
    return restaurer(d);
  } catch { return null; }
}
export function restaurer(d) {
  const meta = Object.assign(nouvelleMeta(), d.meta || {});
  const base = nouvelEtat(meta);
  const e = Object.assign(base, d, { meta });
  e.stock = Object.assign(nouvelEtat(meta).stock, d.stock || {});
  e.stats = Object.assign(nouvelEtat(meta).stats, d.stats || {});
  e.mois = Object.assign(nouveauMois(), d.mois || {});
  e.journee = Object.assign(nouvelleJournee(), d.journee || {});
  // Parties d'avant la carte : on complète produit par produit
  e.carte = carteDepart(); for (const id in d.carte || {}) if (e.carte[id]) Object.assign(e.carte[id], d.carte[id]);
  e.fidelite = Object.assign({ active: false, membres: 0 }, d.fidelite || {});
  e.campagnes = Array.isArray(d.campagnes) ? d.campagnes : [];
  if (!d.carte) nouveauxProduits(e);   // les anciennes parties gardent leurs cappuccinos et leurs croissants
  // Parties d'avant les niveaux : un peu d'XP pour les travaux déjà faits, et on part du niveau atteint (sans pluie de primes)
  if (d.meta?.xpBonus == null) e.meta.xpBonus = e.achats.length * 30;
  if (d.meta?.niveau == null) e.meta.niveau = niveauCafe(e);
  if (d.meta?.grainsOr == null) e.meta.grainsOr = 30;   // de quoi ouvrir sa première caisse
  return e;
}

// ---------- Dérivés ----------
export const a = (e, id) => e.achats.includes(id);
export const machinesInstallees = e => e.machines.filter(Boolean).map(id => M[id]);
export const nbPostes = e => 1 + (a(e, 'comptoir2') ? 1 : 0) + (a(e, 'agrandir') ? 1 : 0);
export const nbMachines = e => machinesInstallees(e).length;
export const tierMachine = e => machinesInstallees(e).some(m => m.visuel === 'machine_pro' || m.prix >= 12000) ? 2 : machinesInstallees(e).some(m => m.id !== 'occasion') ? 1 : 0;
export const tierMoulin = e => MO[e.moulin].visuel === 'torrefacteur' ? 2 : e.moulin === 'manivelle' ? 0 : 1;
export const aBuse = e => a(e, 'buse') || e.machines.includes('vapore');
export const ouvert = e => e.phase === 'service';
export const places = e => 4 + 2 * ['table3', 'table4', 'table5', 'table6'].filter(t => a(e, t)).length + (a(e, 'terrasse') ? 4 : 0) + (a(e, 'etage') ? 6 : 0);
export const bonusDeco = e => bonusCadeaux(e, 'ambiance') + (a(e, 'peinture') ? .2 : 0) + (a(e, 'plantes') ? .15 : 0) + (a(e, 'lampes') ? .15 : 0) + (a(e, 'enseigne') ? .25 : 0) + (a(e, 'ardoise') ? .1 : 0) + (a(e, 'fresque') ? .2 : 0)
  + (a(e, 'tapis') ? .1 : 0) + (a(e, 'cheminee') ? .1 : 0) + (a(e, 'lustre') ? .15 : 0);
export const villeInfo = e => INFOS_VILLES[VILLES[e.meta.ville % VILLES.length]] || INFOS_VILLES.Lyon;
export const nomVille = e => VILLES[e.meta.ville % VILLES.length];
export const menuLait = e => aBuse(e) && e.lait > 0;
export const cafemaxOuvert = e => e.meta.histoire.includes('cafemax') || !!villeInfo(e).cafemax;
export const prixTravaux = (e, t) => t.prix;
export const prerequisOk = (e, t) => !a(e, t.id) && (t.req || []).every(r => a(e, r));
export const disponible = (e, t) => prerequisOk(e, t) && niveauCafe(e) >= niveauRequis('travaux', t.id);

// ---------- Niveaux : le niveau du café (XP) et les niveaux des postes ----------
export const xpPour = n => Math.round(NIVEAU_CAFE.base * Math.pow(Math.max(0, n - 1), NIVEAU_CAFE.expo));
export const xpTotal = e => Math.floor(e.meta.clientsTotal || 0) + (e.meta.xpBonus || 0);
export function niveauCafe(e) {
  const x = xpTotal(e); let n = 1;
  while (n < NIVEAU_CAFE.max && x >= xpPour(n + 1)) n++;
  return n;
}
export function progresNiveau(e) {
  const n = niveauCafe(e), de = xpPour(n), a2 = xpPour(n + 1), x = xpTotal(e);
  return { niveau: n, xp: x - de, besoin: a2 - de, part: n >= NIVEAU_CAFE.max ? 1 : Math.min(1, (x - de) / (a2 - de)) };
}
export const gagnerXp = (e, n) => { if (n > 0) e.meta.xpBonus = (e.meta.xpBonus || 0) + Math.round(n); };
const REQ_NIVEAU = {};
DEBLOCAGES.forEach(d => ['mur', 'sol', 'travaux'].forEach(k => { if (d[k]) REQ_NIVEAU[k + ':' + d[k]] = d.niveau; }));
export const niveauRequis = (type, id) => REQ_NIVEAU[type + ':' + id] || 1;
export const deblocagesNiveau = n => DEBLOCAGES.find(d => d.niveau === n) || null;
export const prochainDeblocage = e => DEBLOCAGES.find(d => d.niveau > niveauCafe(e)) || null;
export const primeNiveau = n => (NIVEAU_CAFE.prime + NIVEAU_CAFE.primeParNiveau * n) * (n % 5 === 0 ? NIVEAU_CAFE.coffre : 1);
// Les niveaux gagnés depuis la dernière vérification : chacun paie sa prime (un coffre tous les 5 niveaux)
export function verifierNiveau(e) {
  const n = niveauCafe(e), nouveaux = [];
  if (e.meta.niveau == null) { e.meta.niveau = n; return nouveaux; }
  while (e.meta.niveau < n) {
    const k = ++e.meta.niveau, p = primeNiveau(k);
    encaisserPrime(e, p);
    const or = gagnerOr(e, k % 5 === 0 ? OR.coffre : OR.niveau);
    const emplacement = EMPLACEMENTS.some(x => x.niveau === k && k > 1);
    nouveaux.push({ niveau: k, prime: p, or, emplacement, debloque: deblocagesNiveau(k), coffre: k % 5 === 0, nivMaxPoste: nivMaxPoste(e) });
  }
  return nouveaux;
}
export const nivMaxPoste = e => Math.min(NIVEAUX_POSTES.max, NIVEAUX_POSTES.depart + NIVEAUX_POSTES.parNiveauCafe * niveauCafe(e));
export const multPoste = (e, i) => {
  const n = e.st[i]?.niv || 1;
  return (1 + NIVEAUX_POSTES.gain * (n - 1)) * Math.pow(1 + NIVEAUX_POSTES.bonusPalier, Math.floor(n / NIVEAUX_POSTES.palier));
};
export const coutPoste = (e, i) => Math.round(NIVEAUX_POSTES.couts[i] * Math.pow(NIVEAUX_POSTES.croissance, (e.st[i]?.niv || 1) - 1));
export function ameliorerPoste(e, i) {
  const st = e.st[i]; if (!st) return 'indispo';
  if (st.niv >= nivMaxPoste(e)) return 'max';
  const c = coutPoste(e, i); if (e.argent < c) return 'argent';
  depenser(e, c, 'investissements'); st.niv++; gagnerXp(e, XP.poste);
  return 'ok';
}
const depenser = (e, x, poste = 'achats') => { e.argent -= x; e.journee.depenses += x; e.mois[poste] = (e.mois[poste] || 0) + x; };

// ---------- Calendrier ----------
export const jourSemaine = e => (e.jour - 1) % 7;
export const moisIndex = e => Math.floor((e.jour - 1) / MOIS.jours) % 12;
export const jourDuMois = e => ((e.jour - 1) % MOIS.jours) + 1;
export const saison = e => SAISONS.find(s => s.mois.includes(moisIndex(e))) || SAISONS[0];
export const dateTexte = e => `${JOURS_SEMAINE[jourSemaine(e)]} ${jourDuMois(e)} ${NOMS_MOIS[moisIndex(e)].toLowerCase()}`;
// Le jour (ou la nuit) de la fin de mois : 0 = ce soir. La nuit, le mois du jour est déjà clos.
export const joursAvantLoyer = e => ouvert(e) ? MOIS.jours - ((e.jour - 1) % MOIS.jours) - 1 : MOIS.jours - (e.jour % MOIS.jours);

// ---------- Décoration au choix ----------
export const murActuel = e => MU[e.deco?.mur] || MU.creme;
export const solActuel = e => SO[e.deco?.sol] || SO.parquet;
export const harmonie = e => a(e, 'peinture') && murActuel(e).style === solActuel(e).style;
export const prixDeco = (e, x) => (e.deco?.vus || []).includes(x.id) ? 0 : x.prix;
export function choisirDeco(e, type, id) {
  const x = (type === 'mur' ? MU : SO)[id];
  if (!x) return 'indispo';
  if (!a(e, 'peinture')) return 'peinture';
  if (niveauCafe(e) < niveauRequis(type, id)) return 'niveau';
  if (e.rep < (x.rep || 0)) return 'verrou';
  if (ouvert(e)) return 'ferme';
  if (e.deco[type] === id) return 'deja';
  const p = prixDeco(e, x);
  if (e.argent < p) return 'argent';
  depenser(e, p, 'investissements'); e.deco[type] = id; if (!e.deco.vus.includes(id)) e.deco.vus.push(id);
  return 'ok';
}

// ---------- Le personnel ----------
export const HEURES_JOUR = HEURES_MOMENT.reduce((x, y) => x + y, 0);
export const salaireMarche = comp => Math.round((PERSONNEL.smic + PERSONNEL.parNiveau * (comp - 1)) * 100) / 100;
export const employe = (e, id) => e.equipe.find(p => p.id === id);
export const heuresPlanifiees = p => p.formation ? 0 : p.planning.reduce((s, on, k) => s + (on ? HEURES_MOMENT[k] : 0), 0);
// absent : moment à partir duquel l'employé manque aujourd'hui (malade), effacé à la fermeture
export const presentA = (p, k) => !!p.planning[k] && !p.formation && !(p.absent != null && k >= p.absent);
export function vitesseEmploye(p) {
  const [v0, v1] = PERSONNEL.vitesse[p.role] || PERSONNEL.vitesse.salle;
  return (v0 + v1 * p.comp) * (p.trait === 'champion' ? 1.4 : p.trait === 'rapide' ? 1.15 : p.trait === 'distrait' ? .92 : 1) * (1 - .45 * (p.fatigue || 0));
}
export function coutJournee(p) {
  if (p.gerant) return 0;
  const h = heuresPlanifiees(p), normales = Math.max(0, Math.min(h, PERSONNEL.semaine - (p.heuresSemaine || 0)));
  return p.salaire * PERSONNEL.charges * (normales + (h - normales) * PERSONNEL.supp);
}
export const masseSalarialeJour = e => e.equipe.reduce((s, p) => s + coutJournee(p), 0);
export function genererCandidats(e, rnd = Math.random, n = 3) {
  const roles = ['barista', 'salle', 'salle', 'barista', 'cuisine'];
  e.candidats = Array.from({ length: n }, () => {
    const role = roles[Math.floor(rnd() * roles.length) % roles.length];
    const trait = TRAITS[Math.floor(rnd() * TRAITS.length) % TRAITS.length].id;
    const comp = trait === 'apprenti' ? 1 : Math.min(5, 1 + Math.floor(rnd() * 3) + (rnd() < .2 ? 1 : 0));
    const salaire = Math.round(salaireMarche(comp) * (trait === 'apprenti' ? .9 : 1 + (rnd() - .4) * .15) * 100) / 100;
    return { id: 'c' + (e.prochainId++), nom: PRENOMS_EMPLOYES[Math.floor(rnd() * PRENOMS_EMPLOYES.length) % PRENOMS_EMPLOYES.length], role, comp, salaire: Math.max(PERSONNEL.smic, salaire), trait };
  });
  // De temps en temps, un candidat de légende : un trait unique, et un salaire qui va avec
  if (e.jour >= LEGENDES.depuisJour && rnd() < LEGENDES.chance) {
    const c = e.candidats[Math.floor(rnd() * e.candidats.length) % e.candidats.length], t = TRAITS_LEGENDE[Math.floor(rnd() * TRAITS_LEGENDE.length) % TRAITS_LEGENDE.length];
    c.trait = t.id; c.comp = 4 + (rnd() < .4 ? 1 : 0); c.salaire = Math.round(salaireMarche(c.comp) * LEGENDES.salaire * 100) / 100; c.legende = true;
  }
  return e.candidats;
}
export function embaucher(e, id) {
  const c = e.candidats.find(x => x.id === id); if (!c) return 'indispo';
  e.candidats = e.candidats.filter(x => x.id !== id);
  e.equipe.push({ ...c, id: 'e' + (e.prochainId++), fatigue: 0, moral: .8, planning: [1, 1, 0, 0], formation: 0, heuresSemaine: 0 });
  e.stats.embauches++;
  return 'ok';
}
export const indemnite = p => Math.round(p.salaire * PERSONNEL.charges * 7 * PERSONNEL.indemniteJours);
export function renvoyer(e, id) {
  const p = employe(e, id); if (!p || p.gerant) return 'indispo';
  depenser(e, indemnite(p), 'salaires');
  e.equipe = e.equipe.filter(x => x.id !== id);
  return 'ok';
}
export const coutFormation = e => PERSONNEL.formation * (a(e, 'ecole') ? .5 : 1);
export function former(e, id) {
  const p = employe(e, id); if (!p) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if (p.comp >= 5) return 'max';
  if (p.formation) return 'deja';
  const c = coutFormation(e); if (e.argent < c) return 'argent';
  depenser(e, c, 'salaires'); p.formation = 1;
  return 'ok';
}
export function reglerPlanning(e, id, k, on) {
  const p = employe(e, id); if (!p || p.gerant || k < 0 || k >= MOMENTS.length) return 'indispo';
  p.planning[k] = on ? 1 : 0; return 'ok';
}
export function changerRole(e, id, role) {
  const p = employe(e, id); if (!p || !PERSONNEL.vitesse[role]) return 'indispo';
  if (p.gerant && role === 'cuisine') return 'indispo';
  p.role = role; return 'ok';
}
export function changerSalaire(e, id, delta) {
  const p = employe(e, id); if (!p || p.gerant) return 'indispo';
  p.salaire = Math.max(PERSONNEL.smic, Math.round((p.salaire + delta) * 100) / 100);
  if (delta > 0) p.moral = Math.min(1, p.moral + .15 * delta);
  return 'ok';
}

// ---------- Capacité du moment ----------
export const momentIndex = e => { const k = MOMENTS.findIndex(m => e.horloge >= m.de && e.horloge < m.a); return k < 0 ? MOMENTS.length - 1 : k; };
export const momentActuel = e => !ouvert(e) ? { nom: 'Nuit' } : (MOMENTS.find(m => e.horloge >= m.de && e.horloge < m.a) || MOMENTS[MOMENTS.length - 1]);
export const avanceeJournee = e => Math.max(0, Math.min(1, (e.horloge - HORAIRES.ouverture) / (HORAIRES.fermeture - HORAIRES.ouverture)));
export const partEmporter = e => a(e, 'emporter') ? CAPACITE.emporterGuichet : CAPACITE.emporter;
export function capacites(e, k = momentIndex(e)) {
  const presents = e.equipe.filter(p => presentA(p, k));
  const baristas = presents.filter(p => p.role === 'barista').map(vitesseEmploye).sort((x, y) => y - x);
  const salle = presents.filter(p => p.role === 'salle').reduce((s, p) => s + vitesseEmploye(p), 0);
  const cuisine = presents.filter(p => p.role === 'cuisine').reduce((s, p) => s + vitesseEmploye(p), 0);
  const caps = e.st[2].panne ? [] : machinesInstallees(e).map(m => m.vitesse * CAPACITE.machine).sort((x, y) => y - x);
  let boissons = 0;
  for (let i = 0; i < Math.min(baristas.length, caps.length); i++) boissons += Math.min(baristas[i], caps[i]);
  if (salle <= 0) boissons *= PERSONNEL.sansSalle;
  boissons *= multPoste(e, 2) * (1 + bonusCarte(e, 'bar'));
  const moulin = e.st[1].panne ? 0 : MO[e.moulin].vitesse * CAPACITE.moulin * multPoste(e, 1) * (1 + bonusCarte(e, 'moulin'));
  const placesH = places(e) * CAPACITE.placesParHeure / (1 - partEmporter(e));
  return { boissons, moulin, salle: salle > 0 ? salle * multPoste(e, 3) * (1 + bonusCarte(e, 'salle')) : Infinity, places: placesH, cuisine, baristas: baristas.length, enSalle: presents.filter(p => p.role === 'salle').length, presents: presents.length };
}

// ---------- Qualité, prix, demande ----------
export function qualiteEquipement(e) {
  const gouts = e.machines.map((id, p) => id ? M[id].qualite * (1 - CALCAIRE.gout * (e.calcaire?.[p] || 0)) : null).filter(x => x != null);
  const machine = gouts.length ? gouts.reduce((s, q) => s + q, 0) / gouts.length : .8;
  return machine * MO[e.moulin].qualite * F[e.fournisseur].qualite;
}
export const fraicheur = (e, g) => Math.max(FRAICHEUR.min, 1 - FRAICHEUR.perte * Math.max(0, (e.age?.[g] || 0) - FRAICHEUR.jours));
export function ajouterStock(e, g, doses) {
  const s = Math.max(0, e.stock[g]);
  e.age[g] = s + doses > 0 ? (e.age[g] || 0) * s / (s + doses) : 0;
  e.stock[g] = s + doses;
}
function savoirFaire(e) {
  const b = e.equipe.filter(p => p.role === 'barista' && presentA(p, momentIndex(e)));
  if (!b.length) return 1;
  return b.reduce((s, p) => s + 1 + .03 * (p.comp - 2) + (p.trait === 'perfectionniste' ? .04 : 0), 0) / b.length;
}
export const consoParTasse = e => (e.dosage || DOSAGE.reference) / DOSAGE.reference;
export function facteurDosage(e) {
  const d = e.dosage || DOSAGE.reference, Tb = DOSAGE.gout;
  if (d <= Tb[0][0]) return Tb[0][1];
  for (let k = 1; k < Tb.length; k++) if (d <= Tb[k][0]) return Tb[k - 1][1] + (Tb[k][1] - Tb[k - 1][1]) * (d - Tb[k - 1][0]) / (Tb[k][0] - Tb[k - 1][0]);
  return Tb[Tb.length - 1][1];
}
export function reglerDosage(e, g) { e.dosage = Math.round(Math.max(DOSAGE.min, Math.min(DOSAGE.max, g)) / DOSAGE.pas) * DOSAGE.pas; return 'ok'; }
export const qualite = e => G[e.maison].q * qualiteEquipement(e) * fraicheur(e, e.maison) * facteurDosage(e) * savoirFaire(e) * (1 + bonusCarte(e, 'gout'));
export const prixJuste = e => (1.3 + .42 * qualite(e)) * villeInfo(e).prix * (1 + bonusCarte(e, 'prix'));
export const coutTasse = e => G[e.maison].prixSac * F[e.fournisseur].prixMult * consoParTasse(e) / DOSES_SAC;
export const prixEffectif = e => e.prix * (ouvert(e) ? (e.tarifs?.[momentIndex(e)] ?? 1) : 1);
export function reglerPrix(e, p) { e.prix = Math.round(Math.max(.8, Math.min(9, p)) * 20) / 20; }
export function reglerTarif(e, m, v) {
  if (m < 0 || m >= MOMENTS.length) return 'indispo';
  e.tarifs[m] = Math.round(Math.round(Math.max(TARIFS.min, Math.min(TARIFS.max, v)) / TARIFS.pas) * TARIFS.pas * 100) / 100;
  return 'ok';
}
export function facteurPrix(e) { const r = prixEffectif(e) / prixJuste(e); return r <= 1 ? 1 + .3 * (1 - r) : Math.exp(-2.5 * (r - 1)); }
const multEvts = e => e.evts.reduce((m, v) => m * (v.demande ?? 1), 1);
const multPrixEvts = e => e.evts.reduce((m, v) => m * (v.prix || 1), 1);
export function courbeHeure(h) {
  if (h <= COURBE_HEURE[0][0]) return COURBE_HEURE[0][1];
  for (let k = 1; k < COURBE_HEURE.length; k++) {
    const [h1, v1] = COURBE_HEURE[k], [h0, v0] = COURBE_HEURE[k - 1];
    if (h <= h1) return v0 + (v1 - v0) * (h - h0) / (h1 - h0);
  }
  return COURBE_HEURE[COURBE_HEURE.length - 1][1];
}
export const attrait = e => (a(e, 'enseigne') ? 1.12 : 1) * (a(e, 'ardoise') ? 1.04 : 1) * (a(e, 'emporter') ? 1.1 : 1) * (a(e, 'velo') ? 1.12 : 1)
  * (a(e, 'etage') ? 1.2 : 1) * (a(e, 'jukebox') ? 1.05 : 1) * (harmonie(e) ? 1.04 : 1) * (1 + bonusCadeaux(e, 'clients')) * (1 + bonusCarte(e, 'clients'));
// ---------- Météo, saison et boisson du jour ----------
export const meteoDuJour = e => MET[e.meteo] || MET.nuages;
export function multMeteo(e) {
  const m = meteoDuJour(e), s = saison(e);
  const terr = a(e, 'terrasse') ? (a(e, 'chauffages') && m.terrasse < 1 ? 1 - (1 - m.terrasse) / 2 : m.terrasse) * (villeInfo(e).terrasse || 1) * s.terrasse * 1.25 : 1;
  return m.demande * terr * (m.id === 'froid' && a(e, 'cheminee') ? 1.3 : 1) * (m.id === 'chaleur' && a(e, 'clim') ? 1.25 : 1);
}
export const effetBoisson = (id, meteo) => { const b = BO[id] || BO.aucune; return id === 'aucune' ? 0 : (b.bonus[meteo] || 0) - b.cout; };
export const multBoisson = e => 1 + effetBoisson(e.boisson, e.meteo);
export function tirerMeteo(rnd, e = null) {
  const poids = m => { if (!e) return m.poids; const v = villeInfo(e).meteo?.[m.id]; const s = saison(e).meteo[m.id]; return (v ?? m.poids) * (s ?? 1) / 3; };
  const total = METEOS.reduce((s, m) => s + poids(m), 0); let x = rnd() * total;
  for (const m of METEOS) { if ((x -= poids(m)) <= 0) return m.id; }
  return METEOS[METEOS.length - 1].id;
}
export function choisirBoisson(e, id) {
  const b = BO[id]; if (!b) return 'indispo';
  if (e.rep < b.rep) return 'verrou';
  if (ouvert(e)) return 'ferme';
  e.boisson = id; return 'ok';
}
export const pleut = e => e.evts.some(v => v.id === 'pluie') || (ouvert(e) && e.meteo === 'pluie');
export const neige = e => e.meteo === 'froid';
// ---------- Formules par moment ----------
export const formuleOuverte = (e, f) => (f.req || []).every(r => a(e, r)) && e.rep >= (f.rep || 0);
export function formuleDuMoment(e) {
  if (!ouvert(e)) return null;
  const k = momentIndex(e), f = FORMULES.find(x => x.moment === k && e.formules?.[x.id] && formuleOuverte(e, x));
  if (!f) return null;
  if (f.id !== 'petitdej' && capacites(e, k).cuisine <= 0) return null;
  return f;
}
export function reglerFormule(e, id, actif) {
  const f = FO[id]; if (!f) return 'indispo';
  if (!formuleOuverte(e, f)) return 'verrou';
  if (ouvert(e)) return 'ferme';
  e.formules[id] = !!actif; return 'ok';
}
const multFormulePanier = e => { const f = formuleDuMoment(e); return f ? 1 + f.panier - f.cout : 1; };
// ---------- La carte : boissons et extras, chacun avec son prix ----------
export const produitOuvert = (e, p) => (p.req || []).every(r => r === 'buse' ? aBuse(e) : a(e, r)) && e.rep >= (p.rep || 0);
export const produitActif = (e, id) => id === 'espresso' || (!!e.carte?.[id]?.on && produitOuvert(e, CA[id]));
export const prixProduit = (e, id) => id === 'espresso' ? e.prix : (e.carte?.[id]?.prix ?? CA[id].depart);
export const prixJusteProduit = (e, id) => { const p = CA[id]; return Math.round((p.cafe ? prixJuste(e) * p.ref : p.ref * (villeInfo(e).prix || 1)) * 20) / 20; };
export const nbProduits = e => CARTE.filter(p => produitActif(e, p.id)).length;
export const multVariete = e => 1 + VARIETE.parProduit * (nbProduits(e) - VARIETE.reference);
const tarifMoment = e => ouvert(e) ? (e.tarifs?.[momentIndex(e)] ?? 1) : 1;
// Un client prend d'autant plus un produit qu'il est sous son prix juste ; au-dessus, il le boude vite
export const attache = r => r <= 1 ? 1 + .6 * (1 - r) : Math.exp(-3 * (r - 1));
export function regleProduit(e, id, champ, v) {
  const p = CA[id]; if (!p || id === 'espresso') return 'indispo';
  if (!produitOuvert(e, p)) return 'verrou';
  if (champ === 'on') { e.carte[id].on = !!v; return 'ok'; }
  e.carte[id].prix = Math.round(Math.max(.5, Math.min(15, v)) * 10) / 10; return 'ok';
}
// Après un achat (buse, vitrine, cuisine) : les nouveaux produits entrent à la carte ; renvoie leurs noms
export function nouveauxProduits(e) {
  const n = [];
  for (const id in e.carte) { const c = e.carte[id]; if (!c.vu && produitOuvert(e, CA[id])) { c.vu = true; c.on = true; n.push(CA[id].nom); } }
  return n;
}
// Ce que prend un client moyen au moment k : la part de chaque produit (l'espresso complète les boissons)
export function partsCarte(e, k = momentIndex(e), service = ouvert(e)) {
  const parts = {}; let autres = 0;
  const cuisine = capacites(e, k).cuisine > 0;
  for (const p of CARTE) {
    if (p.id === 'espresso' || !produitActif(e, p.id)) continue;
    if (p.lait && e.lait <= 0) continue;
    if (p.cuisine && !cuisine) continue;
    if (p.stock && service && e.viennoiseries.stock <= 0) continue;
    parts[p.id] = p.parts[k] * attache(prixProduit(e, p.id) * (service ? tarifMoment(e) : 1) / prixJusteProduit(e, p.id));
    if (p.type === 'boisson') autres += parts[p.id];
  }
  if (autres > .85) { for (const id in parts) if (CA[id].type === 'boisson') parts[id] *= .85 / autres; autres = .85; }
  parts.espresso = 1 - autres;
  for (const id in parts) if (CA[id].type === 'boisson') parts[id] *= 1 + DEUXIEME_TASSE;
  return parts;
}
// Le prix moyen de la carte comparé aux prix justes, pondéré par ce que prennent les clients (l'espresso compte plus)
export function ratioPrixCarte(e, parts = partsCarte(e)) {
  let s = 0, w = 0;
  for (const id in parts) { const p = parts[id] * (id === 'espresso' ? 1.5 : 1); s += p * prixProduit(e, id) * tarifMoment(e) / prixJusteProduit(e, id); w += p; }
  return w > 0 ? s / w : 1;
}
// Multiplicateur commun à tout le ticket : événements, boisson du jour, formule, boutique, café offert aux fidèles
export const multTicket = e => multPrixEvts(e) * (ouvert(e) ? multBoisson(e) * multFormulePanier(e) : 1) * (a(e, 'boutique') ? 1.12 : 1) * (1 - partFideles(e) * FIDELITE.remise);
// Ticket moyen d'un client (sans les croissants, vendus dans la limite du stock)
export function panier(e, parts = partsCarte(e)) {
  let s = 0; for (const id in parts) if (!CA[id].stock) s += parts[id] * prixProduit(e, id);
  return s * tarifMoment(e) * multTicket(e);
}
export const partGrain = (e, parts = partsCarte(e)) => Object.keys(parts).reduce((s, id) => s + (CA[id].cafe ? parts[id] : 0), 0);

// ---------- Marketing et fidélité ----------
export const campagneActive = (e, id) => (e.campagnes || []).some(c => c.id === id);
export const multCampagnes = e => 1 + (e.campagnes || []).reduce((s, c) => s + (MK[c.id]?.demande || 0), 0);
const multBouche = e => 1 + (e.campagnes || []).reduce((s, c) => s + (MK[c.id]?.bouche || 0), 0);
export function lancerCampagne(e, id) {
  const m = MK[id]; if (!m) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if (e.rep < (m.rep || 0)) return 'verrou';
  if (campagneActive(e, id)) return 'deja';
  if (e.argent < m.prix) return 'argent';
  depenser(e, m.prix, 'marketing');
  e.campagnes.push({ id, jours: m.jours });
  e.notoriete = Math.min(NOTORIETE.max, e.notoriete + (m.noto || 0));
  e.stats.campagnes = (e.stats.campagnes || 0) + 1;
  return 'ok';
}
export function lancerFidelite(e) {
  if (e.fidelite.active) return 'deja';
  if (ouvert(e)) return 'ferme';
  if (e.argent < FIDELITE.lancement) return 'argent';
  depenser(e, FIDELITE.lancement, 'marketing'); e.fidelite.active = true; return 'ok';
}
export function arreterFidelite(e) { if (!e.fidelite.active) return 'indispo'; e.fidelite.active = false; e.fidelite.membres = 0; return 'ok'; }
export const bonusFidelite = e => e.fidelite?.active ? FIDELITE.bonusMax * e.fidelite.membres / (e.fidelite.membres + FIDELITE.demi) : 0;
export const partFideles = e => e.fidelite?.active ? FIDELITE.partMax * bonusFidelite(e) / FIDELITE.bonusMax : 0;
// Chaque soir : des clients ravis s'inscrivent, quelques membres décrochent (beaucoup si la journée a déçu)
export function evolutionFidelite(e, clients, sat) {
  if (!e.fidelite?.active) return 0;
  const avant = e.fidelite.membres;
  const gain = clients * FIDELITE.inscription * Math.max(0, Math.min(1, ((sat ?? 3) - 2.8) / 1.5));
  const perte = avant * FIDELITE.depart * ((sat ?? 3) < 3 ? 3 : 1);
  e.fidelite.membres = Math.max(0, avant + gain - perte);
  return e.fidelite.membres - avant;
}

export function demandeParHeure(e) {
  if (!ouvert(e)) return 0;
  const f = formuleDuMoment(e);
  return DEMANDE_BASE * difficulte(e).demande * e.notoriete * (.4 + e.rep * .2) * attrait(e) * courbeHeure(e.horloge) * AFFLUENCE_JOUR[jourSemaine(e)] * saison(e).demande
    * multMeteo(e) * facteurPrix(e) * (1 + (f?.demande || 0)) * multEvts(e) * (villeInfo(e).demande || 1)
    * multVariete(e) * multCampagnes(e) * (1 + bonusFidelite(e)) * multEvtQuartier(e);
}
export const demande = e => demandeParHeure(e) / SPH;
export function bilan(e) {
  if (!ouvert(e)) return { ventes: 0, chaine: 0, demande: 0, goulot: { type: 'ferme', nom: 'le café est fermé (journal du soir)' }, parSeconde: 0, cap: null };
  const c = capacites(e), dem = demandeParHeure(e);
  const limites = [
    [c.boissons, { type: 'station', i: 2, nom: c.baristas ? (c.baristas < nbMachines(e) ? 'les baristas (une machine attend quelqu’un)' : 'les machines du bar') : 'personne au bar !', cause: 'bar' }],
    [c.moulin, { type: 'station', i: 1, nom: 'le moulin', cause: 'moulin' }],
    [c.salle, { type: 'station', i: 3, nom: 'le service en salle', cause: 'salle' }],
    [c.places, { type: 'station', i: 3, nom: 'les places assises', cause: 'places' }],
  ];
  let [chaine, goulot] = limites.reduce((m, l) => l[0] < m[0] ? l : m, [Infinity, null]);
  let ventes = Math.min(chaine, dem);
  if (dem < chaine) goulot = { type: 'clients', nom: 'les clients (heure, prix, note, notoriété)' };
  if (e.stock[e.maison] <= 0) { ventes = 0; goulot = { type: 'stock', nom: 'la réserve : plus de grain !' }; }
  return { ventes: ventes / SPH, chaine: chaine / SPH, demande: dem / SPH, goulot, parSeconde: ventes / SPH * panier(e), cap: c, parHeure: { ventes, chaine, demande: dem } };
}
export const debitMax = () => 1;
export function debitStation(e, i) {
  const s = e.st[i]; if (s.panne || !ouvert(e)) return 0;
  const k = momentIndex(e), pres = e.equipe.filter(p => presentA(p, k));
  if (i === 2) return pres.some(p => p.role === 'barista') ? 1 : .15;
  if (i === 3) return pres.some(p => p.role === 'salle') ? 1 : .5;
  return 1;
}

// ---------- La note : la moyenne des avis des clients ----------
function partsSatisfaction(e, b) {
  const gout = 1 - Math.exp(-qualite(e) / 2.5);
  const attente = b.demande > 0 ? Math.min(1, b.chaine * 1.3 / b.demande) : 1;
  const r = ratioPrixCarte(e), prix = r <= 1 ? 1 : Math.max(0, 1 - (r - 1) * 2.5);
  const ambiance = Math.min(1, .35 + bonusDeco(e) * .45 + (harmonie(e) ? .1 : 0));
  const sourire = e.equipe.some(p => ((p.trait === 'souriant' && p.role === 'salle') || p.trait === 'star') && presentA(p, momentIndex(e))) ? .15 : 0;
  return { gout, attente, prix, ambiance, sourire };
}
export function satisfaction(e, b = bilan(e)) {
  const p = partsSatisfaction(e, b);
  return Math.max(1, Math.min(5, 1 + 4 * (.45 * p.gout + .25 * p.attente + .15 * p.prix + .15 * p.ambiance) + p.sourire));
}
export function cibleReputation(e) {
  const b = ouvert(e) ? bilan(e) : { demande: 1, chaine: 1 };
  const p = partsSatisfaction(e, b);
  return { total: satisfaction(e, b), parts: { gout: 4 * .45 * p.gout, service: 4 * .25 * p.attente + p.sourire, prix: 4 * .15 * p.prix, deco: 4 * .15 * p.ambiance, base: 1 } };
}

// ---------- Réserve et commandes (en kilos) ----------
export const capaciteReserve = e => Math.round((RESERVE_KG.base + (a(e, 'palette') ? RESERVE_KG.palette : 0) + (a(e, 'arriere') ? RESERVE_KG.arriere : 0) + (a(e, 'entrepot') ? RESERVE_KG.entrepot : 0)) * multPoste(e, 0) * (1 + bonusCarte(e, 'reserve'))) * DOSES_SAC;
const grainsCommandes = e => e.commandes.concat(e.livraisonsMatin).filter(c => c.grain !== 'lait').reduce((x, c) => x + c.sacs * DOSES_SAC, 0);
export const totalStock = e => Object.values(e.stock).reduce((x, y) => x + y, 0) + grainsCommandes(e);
export const prixKg = (e, g) => G[g].prixSac * F[e.fournisseur].prixMult * (1 - bonusCarte(e, 'grain'));
export function commander(e, grain, kg, auto = false) {
  if (!e.debloques.includes(grain)) return 'verrou';
  if (ouvert(e)) return 'ferme';
  kg = Math.round(kg);
  if (kg < 1) return 'indispo';
  const prix = prixKg(e, grain) * kg;
  if (totalStock(e) + kg * DOSES_SAC > capaciteReserve(e) + 1e-6) return 'place';
  if (e.argent < prix && !auto) return 'argent';
  depenser(e, prix); if (!auto) e.stats.commandes++;
  e.livraisonsMatin.push({ grain, sacs: kg });
  return 'ok';
}
export function commanderUrgence(e, grain, kg) {
  if (!e.debloques.includes(grain)) return 'verrou';
  if (!ouvert(e)) return commander(e, grain, kg);
  const prix = prixKg(e, grain) * URGENCE.mult * kg;
  if (e.argent < prix) return 'argent';
  if (totalStock(e) + kg * DOSES_SAC > capaciteReserve(e) + 1e-6) return 'place';
  depenser(e, prix); e.stats.commandes++;
  e.commandes.push({ grain, sacs: kg, eta: URGENCE.delai });
  return 'ok';
}
export function commanderLait(e, litres) {
  if (!aBuse(e)) return 'verrou';
  const urgence = ouvert(e), prix = LAIT.prixPack * litres * (urgence ? URGENCE.mult : 1);
  if (e.argent < prix) return 'argent';
  depenser(e, prix); e.stats.commandes++;
  if (urgence) e.commandes.push({ grain: 'lait', sacs: litres, eta: URGENCE.delai });
  else e.livraisonsMatin.push({ grain: 'lait', sacs: litres });
  return 'ok';
}
export function remplir(e, grain, auto = false, maxKg = Infinity) {
  if (ouvert(e)) return 'ferme';
  const place = Math.floor((capaciteReserve(e) - totalStock(e)) / DOSES_SAC + 1e-6);
  if (place < 1) return 'place';
  const n = Math.min(place, Math.floor(e.argent / prixKg(e, grain)), maxKg);
  if (n < 1) return 'argent';
  return commander(e, grain, n, auto) === 'ok' ? n : 'argent';
}
export function reglerAbonnement(e, grain, kg) {
  if (grain && !e.debloques.includes(grain)) return 'verrou';
  e.abonnement = { grain: grain || null, kg: Math.max(0, Math.min(100, Math.round(kg || 0))) };
  return 'ok';
}
export function commanderViennoiseries(e, n) {
  if (!a(e, 'vitrine')) return 'verrou';
  e.viennoiseries.commande = Math.max(0, Math.min(400, Math.round(n))); return 'ok';
}

// ---------- Catalogue et travaux (le soir) ----------
export function acheter(e, id) {
  const t = T[id];
  if (!t || !disponible(e, t)) return 'indispo';
  if (ouvert(e)) return 'ferme';
  const p = prixTravaux(e, t);
  if (e.argent < p) return 'argent';
  depenser(e, p, 'investissements'); e.achats.push(id); nouveauxProduits(e); gagnerXp(e, Math.min(XP.travauxMax, p * XP.travaux)); return 'ok';
}
export function acheterMachine(e, poste, id) {
  const m = M[id];
  if (!m || poste < 0 || poste >= nbPostes(e)) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if (e.rep < (m.rep || 0)) return 'verrou';
  if (e.machines[poste] === id) return 'deja';
  const reprise = e.machines[poste] ? M[e.machines[poste]].prix * .25 : 0;
  if (e.argent + reprise < m.prix) return 'argent';
  depenser(e, m.prix - reprise, 'investissements'); e.machines[poste] = id; e.calcaire[poste] = 0; nouveauxProduits(e);
  gagnerXp(e, Math.min(XP.travauxMax, m.prix * XP.travaux)); return 'ok';
}
export function acheterMoulin(e, id) {
  const m = MO[id];
  if (!m) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if (e.rep < (m.rep || 0)) return 'verrou';
  if (e.moulin === id) return 'deja';
  const reprise = MO[e.moulin].prix * .25;
  if (e.argent + reprise < m.prix) return 'argent';
  depenser(e, m.prix - reprise, 'investissements'); e.moulin = id; return 'ok';
}
export function choisirFournisseur(e, id) {
  const f = F[id];
  if (!f) return 'indispo';
  if (e.rep < f.rep) return 'verrou';
  e.fournisseur = id; return 'ok';
}
export function choisirGrain(e, id) { if (!e.debloques.includes(id)) return 'verrou'; e.maison = id; return 'ok'; }

// ---------- Finances : charges, mois, prêts, découvert ----------
export const energieJour = e => ENERGIE.base + ENERGIE.parMachine * nbMachines(e) + (a(e, 'clim') ? ENERGIE.clim : 0) + (a(e, 'cheminee') ? ENERGIE.cheminee : 0);
export const loyerMois = e => Math.round((1 - bonusCarte(e, 'loyer')) * difficulte(e).loyer * (villeInfo(e).loyer || 1) * (MOIS.loyer + (a(e, 'agrandir') ? MOIS.agrandir : 0) + (a(e, 'etage') ? MOIS.etage : 0)) + (a(e, 'terrasse') ? MOIS.terrasse : 0));
export const entretienMois = e => Math.round(machinesInstallees(e).reduce((s, m) => s + m.prix, 0) * MOIS.entretien + MO[e.moulin].prix * MOIS.entretien);
export function chargesJour(e) {
  const salaires = masseSalarialeJour(e), energie = energieJour(e), agios = e.argent < 0 ? -e.argent * DECOUVERT.agios : 0;
  return { salaires, energie, agios, total: salaires + energie + agios };
}
export const mensualite = (montant, taux, mois) => { const t = taux / 12; return Math.round(montant * t / (1 - Math.pow(1 + t, -mois)) * 100) / 100; };
export function pretAccorde(e, id) {
  const p = PR[id]; if (!p) return false;
  if (e.pret) return false;
  if (id === 'petit') return true;
  const ca7 = e.bilans.slice(-7).reduce((s, b) => s + b.recettes, 0);
  return ca7 * 4 >= mensualite(p.montant, p.taux, p.mois) * 6;
}
export function emprunter(e, id) {
  const p = PR[id]; if (!p) return 'indispo';
  if (e.pret) return 'deja';
  if (!pretAccorde(e, id)) return 'refus';
  e.argent += p.montant;
  e.pret = { id, montant: p.montant, taux: p.taux, mois: p.mois, restant: p.mois, capital: p.montant, mensualite: mensualite(p.montant, p.taux, p.mois) };
  return 'ok';
}
// Résultat d'un mois avant impôt : les investissements n'y comptent pas (ils durent), les primes oui
export const resultatMois = m => m.ca + (m.primes || 0) - m.achats - m.salaires - m.loyer - m.energie - m.entretien - m.interets - (m.marketing || 0);
// Une prime (défi, objectif de mamie) entre dans la caisse et dans les comptes du mois
export function encaisserPrime(e, x) { if (!(x > 0)) return; e.argent += x; e.mois.primes = (e.mois.primes || 0) + x; }
function finDuMois(e, arrivees) {
  const m = e.mois, loyer = loyerMois(e), entretien = entretienMois(e);
  e.argent -= loyer + MOIS.assurance + entretien; m.loyer += loyer + MOIS.assurance; m.entretien += entretien;
  if (e.pret) {
    const interets = e.pret.capital * e.pret.taux / 12, capital = e.pret.mensualite - interets;
    e.argent -= e.pret.mensualite; m.interets += interets; m.remboursement = capital; e.pret.capital = Math.max(0, e.pret.capital - capital); e.pret.restant--;
    if (e.pret.restant <= 0) { e.pret = null; e.stats.pretsRembourses++; arrivees.push({ pretRembourse: true }); }
  }
  const avantImpot = resultatMois(m);
  m.impots = avantImpot > 0 ? Math.round(avantImpot * MOIS.impot) : 0; e.argent -= m.impots;
  e.stats.mois = (e.stats.mois || e.historiqueMois.length) + 1;
  m.resultat = avantImpot - m.impots; m.numero = e.stats.mois; m.nom = NOMS_MOIS[(Math.floor((e.jour - 1) / MOIS.jours)) % 12];
  e.historiqueMois = [...e.historiqueMois.slice(-11), m];
  e.mois = nouveauMois();
  arrivees.push({ finMois: m });
  if (m.numero % 12 === 0) arrivees.push({ finAnnee: bilanAnnee(e) });
  arrivees.push({ concoursDeco: concoursDeco(e) });
}

// ---------- Difficulté ----------
export const difficulte = e => DIFFICULTES[e.meta?.difficulte] || DIFFICULTES.normal;
export const seuilFaillite = e => difficulte(e).faillite;
// Se choisit au tout début (avant la première journée) : l'argent de départ suit
export function reglerDifficulte(e, id) {
  if (!DIFFICULTES[id]) return 'indispo';
  if (e.jour > 1 || e.stats.nuits > 0) return 'trop tard';
  const avant = difficulte(e).argent;
  e.meta.difficulte = id; e.argent += DIFFICULTES[id].argent - avant;
  return 'ok';
}

// ---------- Bilan de l'année : chiffres des 12 derniers mois et médaille ----------
export function bilanAnnee(e) {
  const ms = e.historiqueMois.slice(-12);
  const ca = ms.reduce((s, m) => s + m.ca, 0), resultat = ms.reduce((s, m) => s + m.resultat, 0);
  const meilleur = ms.reduce((b, m) => (!b || m.resultat > b.resultat ? m : b), null);
  const medaille = resultat >= MEDAILLES.or && e.rep >= MEDAILLES.noteOr ? 'or' : resultat >= MEDAILLES.argent ? 'argent' : 'bronze';
  const b = { annee: Math.round((e.stats.mois || 12) / 12), ca, resultat, meilleur: meilleur?.nom, note: e.rep, clients: Math.round(e.meta.clientsTotal || 0), equipe: e.equipe.length - 1, travaux: e.achats.length, medaille };
  e.meta.annees = [...(e.meta.annees || []), b];
  return b;
}

// ---------- La Gazette du quartier : chaque dimanche soir, les nouvelles de la semaine ----------
export function genererGazette(e, rnd = Math.random) {
  const semaine = e.bilans.slice(-7), avant = e.bilans.slice(-14, -7);
  if (!semaine.length) return null;
  const somme = (l, k) => l.reduce((s, b) => s + (b[k] || 0), 0);
  const ca = somme(semaine, 'recettes'), caAvant = somme(avant, 'recettes'), res = somme(semaine, 'benefice'), clients = somme(semaine, 'clients'), perdus = somme(semaine, 'perdus');
  const top = semaine.reduce((b, x) => (!b || x.recettes > b.recettes ? x : b), null);
  const evol = caAvant > 0 ? ca / caAvant - 1 : null;
  const fmtE = x => `${Math.round(x).toLocaleString('fr-FR')} €`, nom = nomCafe(e);
  const titre = evol == null ? `${nom} ouvre ses portes : le quartier découvre le café de mamie Odette`
    : evol > .12 ? `${nom} : une semaine en or, le quartier se presse au comptoir`
    : evol < -.12 ? `Semaine difficile pour ${nom}, qui compte bien rebondir`
    : perdus > clients * .2 ? `Chez ${nom}, on fait la queue jusque sur le trottoir`
    : `${nom} tient le cap, tasse après tasse`;
  const articles = [
    { titre: 'Les chiffres de la semaine', texte: `${Math.round(clients).toLocaleString('fr-FR')} clients servis et ${fmtE(ca)} de chiffre d’affaires${evol == null ? '' : ` (${evol >= 0 ? '+' : '−'}${Math.round(Math.abs(evol) * 100)} % sur une semaine)`}. Résultat : ${res >= 0 ? '' : '−'}${fmtE(Math.abs(res))}. La meilleure journée : ${top.date.toLowerCase()}, avec ${fmtE(top.recettes)}.` },
  ];
  const avis = semaine.flatMap(b => b.avis || []).sort((x, y) => y.etoiles - x.etoiles);
  if (avis.length) { const a = avis[Math.floor(rnd() * Math.min(3, avis.length))]; articles.push({ titre: 'La parole aux clients', texte: `« ${a.texte} » nous confie ${a.nom}. La note du café est de ${e.rep.toFixed(2).replace('.', ',')} étoiles.` }); }
  if (perdus > clients * .15) articles.push({ titre: 'Le courrier des lecteurs', texte: `« J’ai attendu si longtemps que je suis reparti sans mon café ! » Cette semaine, environ ${Math.round(perdus)} clients sont repartis sans être servis. Une personne de plus derrière le comptoir ?` });
  if (cafemaxOuvert(e)) articles.push({ titre: 'Concurrence', texte: pick(rnd, ['CaféMax annonce une nouvelle carte de fidélité « super-points ». Les habitués du quartier restent sceptiques.', 'En face, CaféMax baisse encore ses prix. La qualité, elle, ne suit pas toujours, murmurent les clients.', 'CaféMax recrute à tour de bras : les baristas du quartier sont très demandés.']) });
  articles.push({ titre: 'Dans le quartier', texte: pick(rnd, NOUVELLES_QUARTIER) });
  const g = { numero: (e.gazettes?.length ? e.gazettes.at(-1).numero : 0) + 1, date: dateTexte(e), titre, articles };
  e.gazettes = [...(e.gazettes || []).slice(-3), g];
  return g;
}
const pick = (rnd, l) => l[Math.min(l.length - 1, Math.floor(rnd() * l.length))];

// ---------- Pannes et événements ----------
export function choisirPanne(e, rnd) {
  const distraits = e.equipe.filter(p => p.trait === 'distrait').length;
  const bar = machinesInstallees(e).reduce((s, m) => s + 1 / m.fiabilite, 0) * .8 * (1 + .25 * distraits);
  const poids = [[1, 1 / MO[e.moulin].fiabilite], [2, bar]].filter(([i]) => !e.st[i].panne);
  if (!poids.length) return null;
  const total = poids.reduce((s, p) => s + p[1], 0); let x = rnd * total;
  for (const [i, w] of poids) { if ((x -= w) <= 0) return i; }
  return poids[poids.length - 1][0];
}
export function declencherPanne(e, i) { if (i == null || e.st[i].panne || !ouvert(e)) return false; e.st[i].panne = { coups: 3, auto: 15 }; return true; }
export const intervallePanne = (e, rnd) => ((machinesInstallees(e).some(m => m.fiabilite < .5) ? 60 : 95) + rnd * 70)
  * (1 - CALCAIRE.pannes * Math.max(0, ...(e.calcaire || [0])) / (1 + CALCAIRE.pannes));
export function toucher(e, i) {
  const s = e.st[i];
  if (s.panne) {
    s.panne.coups--;
    if (s.panne.coups <= 0) { s.panne = null; e.meta.reparations++; return { type: 'repare' }; }
    return { type: 'reparation', reste: s.panne.coups };
  }
  return { type: 'rien' };
}
const reparateurPresent = e => e.equipe.some(p => p.role === 'barista' && p.comp >= 3 && presentA(p, momentIndex(e)));
export const coutDetartrage = (e, p) => Math.round(Math.max(CALCAIRE.min, (e.machines[p] ? M[e.machines[p]].prix : 0) * CALCAIRE.prix));
export function detartrer(e, p) {
  if (!e.machines[p]) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if ((e.calcaire[p] || 0) <= 0) return 'propre';
  const c = coutDetartrage(e, p);
  if (e.argent < c) return 'argent';
  depenser(e, c, 'entretien'); e.calcaire[p] = 0; return 'ok';
}
export function evenementsPossibles(e) { return ['touristes', 'critique', 'pluie'].concat(cafemaxOuvert(e) ? ['cafemax'] : []); }
export function appliquerEvenement(e, type) {
  e.evts = e.evts.filter(v => v.id !== type);
  if (type === 'touristes') { e.evts.push({ id: 'touristes', nom: 'Bus de touristes', demande: 1.8, reste: 40 }); return { type }; }
  if (type === 'pluie') { const f = a(e, 'terrasse') ? .8 : 1.15; e.evts.push({ id: 'pluie', nom: 'Averse', demande: f, reste: 50 }); return { type, terrasse: a(e, 'terrasse') }; }
  if (type === 'cafemax') { e.evts.push({ id: 'cafemax', nom: 'Promo CaféMax', demande: .65, reste: 45 }); return { type }; }
  const r = prixEffectif(e) / prixJuste(e), ok = qualite(e) >= 2.2 && r <= 1.15 && e.stock[e.maison] > 0;
  e.rep = Math.max(1, Math.min(5, e.rep + (ok ? .25 : -.2))); e.notoriete = Math.min(NOTORIETE.max, e.notoriete + (ok ? .12 : .03));
  if (ok) e.meta.critiques++;
  return { type: 'critique', ok };
}

// ---------- Décisions (cartes à choix) ----------
const meilleurGrain = e => [...GRAINS].reverse().find(g => e.debloques.includes(g.id));
const PRIX_MUSICIEN = 120, PRIX_NETTOYAGE = 180, PRIX_EXTRA = 90;
const meilleurEmploye = e => e.equipe.filter(p => !p.gerant).sort((x, y) => y.comp - x.comp)[0];
// Quelqu'un qui devait travailler cet après-midi (ou ce soir)
const employeDuJour = e => e.equipe.find(x => !x.gerant && !x.formation && x.absent == null && (x.planning[2] || x.planning[3]));
const CARTES = {
  groupe: {
    ok: () => true,
    carte: () => ({ texte: 'Un guide appelle : un groupe de 15 touristes voudrait venir dans l’heure. Ça va bousculer le service…', options: ['Accepter', 'Refuser'] }),
    choix: (e, k) => {
      if (k === 0) { e.evts = e.evts.filter(v => v.id !== 'groupe'); e.evts.push({ id: 'groupe', nom: 'Groupe de touristes', demande: 2, reste: 45 }); return 'Le groupe arrive : deux fois plus de monde pendant une heure et demie. L’équipe va devoir suivre !'; }
      return 'Tu as poliment refusé le groupe.';
    },
  },
  lot: {
    ok: e => e.argent >= meilleurGrain(e).prixSac * 3 && totalStock(e) + 5 * DOSES_SAC <= capaciteReserve(e),
    carte: e => { const g = meilleurGrain(e); return { texte: `Un torréfacteur propose 5 kg de ${g.nom} à −40 %, tout de suite (${Math.round(g.prixSac * 5 * .6)} €).`, options: ['Acheter', 'Non merci'] }; },
    choix: (e, k) => {
      if (k !== 0) return 'Tu as laissé passer l’affaire.';
      const g = meilleurGrain(e), prix = g.prixSac * 5 * .6;
      if (e.argent < prix) return 'Plus assez d’argent : l’affaire tombe à l’eau.';
      depenser(e, prix); ajouterStock(e, g.id, 5 * DOSES_SAC); return `5 kg de ${g.nom} rangés dans la réserve.`;
    },
  },
  etudiants: {
    ok: e => !e.evts.some(v => v.id === 'etudiants'),
    carte: () => ({ texte: 'Inès demande une réduction de 10 % pour les étudiants. Ils viendront plus nombreux…', options: ['D’accord', 'Non'] }),
    choix: (e, k) => {
      if (k === 0) { e.evts.push({ id: 'etudiants', nom: 'Réduction étudiante', demande: 1.2, prix: .9, reste: 360 }); return 'Les étudiants affluent : +20 % de clients, −10 % sur le prix, pendant une journée.'; }
      return 'Inès est un peu déçue.';
    },
  },
  musicien: {
    ok: e => e.horloge < 17,
    carte: () => ({ texte: `Un musicien propose de jouer cet après-midi pour ${PRIX_MUSICIEN} €. L’ambiance attire du monde.`, options: ['Payer', 'Non merci'] }),
    choix: (e, k) => {
      if (k !== 0) return cafemaxOuvert(e) ? 'Le musicien ira jouer chez CaféMax…' : 'Le musicien ira jouer plus loin dans la rue.';
      if (e.argent < PRIX_MUSICIEN) return 'Pas assez d’argent pour le musicien.';
      depenser(e, PRIX_MUSICIEN); e.evts.push({ id: 'musique', nom: 'Musicien', demande: 1.35, reste: 90 }); return 'Musique ! +35 % de clients pendant 3 heures.';
    },
  },
  hygiene: {
    ok: () => true,
    carte: () => ({ texte: `Contrôle d’hygiène surprise ! Payer un nettoyage express (${PRIX_NETTOYAGE} €), ou fermer une heure pour tout nettoyer ?`, options: ['Payer', 'Fermer 1 h'] }),
    choix: (e, k) => {
      if (k === 0 && e.argent >= PRIX_NETTOYAGE) { depenser(e, PRIX_NETTOYAGE, 'entretien'); return 'Le nettoyage express est fait. Inspecteur satisfait.'; }
      e.evts.push({ id: 'nettoyage', nom: 'Fermé pour nettoyage', demande: 0, reste: 30 }); return 'Le café ferme une heure pour le grand ménage.';
    },
  },
  debauche: {
    ok: e => cafemaxOuvert(e) && !!meilleurEmploye(e) && meilleurEmploye(e).comp >= 3,
    carte: e => ({ texte: `CaféMax veut débaucher ${meilleurEmploye(e).nom} ! L’augmenter de 2 €/h pour la ou le garder ?`, options: ['Augmenter', 'Laisser partir'] }),
    choix: (e, k) => {
      const p = meilleurEmploye(e); if (!p) return 'Fausse alerte.';
      if (k === 0) { changerSalaire(e, p.id, 2); return `${p.nom} reste, ravi·e de son augmentation.`; }
      e.equipe = e.equipe.filter(x => x.id !== p.id); return `${p.nom} est parti·e chez CaféMax. Il faudra recruter.`;
    },
  },
  occasion: {
    ok: e => !e.machines.includes('maestro') && e.argent >= M.maestro.prix / 2,
    carte: () => ({ texte: `Un café qui ferme revend sa Maestro Pro à moitié prix (${M.maestro.prix / 2} €). Elle remplacerait ta machine la plus lente.`, options: ['Acheter', 'Non merci'] }),
    choix: (e, k) => {
      if (k !== 0) return 'Tu laisses passer la Maestro Pro.';
      if (e.argent < M.maestro.prix / 2) return 'Plus assez d’argent.';
      let poste = e.machines.findIndex((id, p) => !id && p < nbPostes(e));
      if (poste < 0) poste = e.machines.reduce((best, id, p) => (p < nbPostes(e) && id && (best < 0 || M[id].vitesse < M[e.machines[best]].vitesse)) ? p : best, -1);
      depenser(e, M.maestro.prix / 2, 'investissements'); e.machines[poste] = 'maestro'; e.calcaire[poste] = 0; return 'La Maestro Pro est installée !';
    },
  },
  malade: {
    ok: e => e.horloge < 14 && !!employeDuJour(e),
    carte: e => ({ texte: `${employeDuJour(e).nom} appelle : malade, pas de travail cet après-midi. Appeler un extra d’agence (${PRIX_EXTRA} €) pour la ou le remplacer ?`, options: ['Appeler l’agence', 'On fera sans'] }),
    choix: (e, k) => {
      const p = employeDuJour(e); if (!p) return 'Fausse alerte.';
      if (k === 0 && e.argent >= PRIX_EXTRA) { depenser(e, PRIX_EXTRA, 'salaires'); return `Un extra remplace ${p.nom} cet après-midi.`; }
      p.absent = 2; return `${p.nom} est absent·e cet après-midi : l’équipe fera sans. Retour demain.`;
    },
  },
};
function planifierDecisions(e, rnd) { e.decisionsDuJour = [8 + rnd() * 4, 13 + rnd() * 4].map(h => ({ heure: h })); }
function proposerDecision(e, rnd) {
  const possibles = Object.keys(CARTES).filter(id => CARTES[id].ok(e));
  if (!possibles.length) return null;
  const id = possibles[Math.min(possibles.length - 1, Math.floor(rnd() * possibles.length))];
  e.decision = { id, ...CARTES[id].carte(e), reste: DUREE_DECISION };
  return e.decision;
}
export function choisirDecision(e, k) {
  const d = e.decision; if (!d) return null;
  e.decision = null;
  return CARTES[d.id].choix(e, k);
}
export const decisionsConnues = () => Object.keys(CARTES);

// ---------- Avis clients : trois avis chaque soir, tirés de la journée ----------
export function genererAvis(e, b, rnd = Math.random) {
  const r = ratioPrixCarte(e), g = 1 - Math.exp(-qualite(e) / 2.5);
  const rupture = (b.moments || []).reduce((s, m) => s + (m.stock || 0), 0), boisson = BO[e.boisson], effetB = effetBoisson(e.boisson, e.meteo);
  const perdus = b.perdus || 0, servis = b.tasses || 0;
  const sujets = [];
  if (g > .7) sujets.push([g, 5, 'Un café incroyable, on sent la qualité du grain.']); else if (g < .35) sujets.push([1 - g, 2, 'Café plat et amer… le grain mériterait mieux.']); else sujets.push([.3, 4, 'Un bon petit café, sans chichis.']);
  if (perdus > servis * .25) sujets.push([1.2, 2, 'Trop de monde, pas assez de personnel : j’ai renoncé.']); else if (perdus < servis * .03) sujets.push([.5, 5, 'Service rapide et souriant !']);
  if (r > 1.12) sujets.push([r - .6, 2, 'Bon, mais bien trop cher pour ce que c’est.']); else if (r < .85) sujets.push([.6, 5, 'Pas cher du tout, j’adore !']);
  if (rupture > 20) sujets.push([1.4, 1, 'Plus de café… dans un café ! On est repartis.']);
  if (fraicheur(e, e.maison) < .9) sujets.push([1, 2, 'Le café avait un petit goût de rassis.']);
  if (Math.max(...e.calcaire) > .6) sujets.push([.9, 3, 'Un drôle d’arrière-goût de calcaire, non ?']);
  if (e.boisson !== 'aucune' && effetB > .05) sujets.push([.8, 5, `Le ${boisson.nom.toLowerCase()} du jour tombait à pic avec ce temps !`]);
  else if (e.boisson !== 'aucune' && effetB < -.02) sujets.push([.7, 3, `Un ${boisson.nom.toLowerCase()} par ce temps ? Drôle d’idée.`]);
  if (harmonie(e)) sujets.push([.55, 5, 'Quelle jolie salle, tout va bien ensemble.']); else if (bonusDeco(e) < .3) sujets.push([.45, 3, 'La salle est un peu tristounette.']);
  if (e.dosage >= 10) sujets.push([.5, 5, 'Un café bien corsé, comme je l’aime.']); else if (e.dosage <= 7) sujets.push([.6, 2, 'Le café manque de corps, on dirait de l’eau.']);
  if ((b.invendus || 0) === 0 && (b.viennoiseries || 0) > 0 && a(e, 'vitrine') && e.viennoiseries.commande > 0) sujets.push([.4, 3, 'Plus un seul croissant à 10 h…']);
  if (e.meteo === 'froid' && a(e, 'cheminee')) sujets.push([.7, 5, 'Se réchauffer près de la cheminée, le bonheur.']);
  const nb = nbProduits(e);
  if (nb >= 8) sujets.push([.5, 5, 'Une vraie carte : il y en a pour tous les goûts.']); else if (nb <= 2) sujets.push([.5, 3, 'Juste un café ? Un jus ou un thé, ce serait bien.']);
  const cherProduit = CARTE.find(p => p.id !== 'espresso' && produitActif(e, p.id) && prixProduit(e, p.id) / prixJusteProduit(e, p.id) > 1.25);
  if (cherProduit) sujets.push([.85, 2, `${cherProduit.nom} à ${prixProduit(e, cherProduit.id).toFixed(2).replace('.', ',')} € ? Faut pas exagérer.`]);
  sujets.sort((x, y) => y[0] - x[0]);
  return sujets.slice(0, 3).map(([, etoiles, texte], k) => ({ nom: PRENOMS_AVIS[Math.floor(rnd() * PRENOMS_AVIS.length) % PRENOMS_AVIS.length], etoiles: Math.max(1, Math.min(5, etoiles + (k === 2 && rnd() < .3 ? -1 : 0))), texte }));
}

// ---------- Défi du jour ----------
export function tirerDefi(e, rnd = Math.random) {
  const hier = e.bilans.at(-1);
  if (!hier || e.jour < DEFIS.depuis) return null;
  const prime = Math.max(20, Math.round(hier.recettes * .06));
  const n = x => Math.round(x).toLocaleString('fr-FR');
  const types = [
    { id: 'tasses', cible: Math.ceil(hier.tasses * 1.12), texte: c => `Servir ${n(c)} clients aujourd’hui` },
    { id: 'matin', cible: Math.ceil((hier.moments?.[0]?.ventes || hier.tasses * .3) * 1.15), texte: c => `Servir ${n(c)} clients avant 11 h` },
    { id: 'sansRupture', cible: 1, texte: () => 'Ne jamais tomber à court de grain' },
    { id: 'benefice', cible: Math.ceil(Math.max(30, hier.benefice * 1.1)), texte: c => `Faire plus de ${n(c)} € de bénéfice` },
  ];
  const t = types[Math.min(types.length - 1, Math.floor(rnd() * types.length))];
  return { id: t.id, cible: t.cible, texte: t.texte(t.cible), progres: 0, prime, fini: false, rate: false };
}

// ---------- La journée et la nuit ----------
function fermer(e, rnd = Math.random) {
  const arrivees = [];
  gagnerXp(e, XP.journee);
  const c = chargesJour(e);
  e.argent -= c.total; e.journee.charges = c.total; e.mois.salaires += c.salaires; e.mois.energie += c.energie; e.mois.interets += c.agios;
  e.journee.invendus = e.viennoiseries.stock; e.viennoiseries.stock = 0;
  const b = { jour: e.jour, date: dateTexte(e), recettes: e.journee.recettes, depenses: e.journee.depenses, charges: c.total, tasses: e.journee.tasses,
    clients: e.journee.clients, perdus: e.journee.perdus, viennoiseries: e.journee.viennoiseries, invendus: e.journee.invendus,
    satisfaction: e.journee.clients > 0 ? e.journee.satisfaction / e.journee.clients : null,
    benefice: e.journee.recettes - e.journee.depenses - c.total, detail: c, moments: e.journee.moments, heures: e.journee.heures,
    produits: e.journee.produits, remises: e.journee.remises };
  if (e.defi && !e.defi.fini && !e.defi.rate) {
    const d = e.defi, ok = d.id === 'benefice' ? b.benefice >= d.cible : d.id === 'sansRupture';
    if (ok) { d.fini = true; encaisserPrime(e, d.prime); } else d.rate = true;
  }
  b.nouveauxFideles = evolutionFidelite(e, b.clients, b.satisfaction);
  e.campagnes = (e.campagnes || []).map(x => ({ ...x, jours: x.jours - 1 })).filter(x => x.jours > 0);
  e.equipe.forEach(p => { delete p.absent; });
  if (e.defi) b.defi = { texte: e.defi.texte, reussi: e.defi.fini, prime: e.defi.prime };
  b.avis = genererAvis(e, b, rnd);
  for (const p of [...e.equipe]) {
    const h = heuresPlanifiees(p);
    if (p.formation) { p.comp = Math.min(5, p.comp + (p.trait === 'apprenti' && p.comp < 3 ? 2 : 1)); p.formation = 0; e.stats.formations++; p.fatigue = Math.max(0, p.fatigue - .2); arrivees.push({ formation: p.nom, comp: p.comp }); continue; }
    p.heuresSemaine = (p.heuresSemaine || 0) + h;
    if (p.gerant) continue;
    const endurance = p.trait === 'infatigable' ? .15 : p.trait === 'endurant' ? .6 : 1;
    p.fatigue = Math.max(0, Math.min(1, p.fatigue + (h > 8 ? (h - 8) * .08 * endurance : h === 0 ? -.4 : -.12)));
    const bienPaye = p.salaire >= salaireMarche(p.comp) - .01;
    p.moral = Math.max(0, Math.min(1, p.moral + (p.fatigue < .5 ? .03 : 0) + (bienPaye ? .02 : -.05) - (p.fatigue > .7 ? .08 : 0)));
    if (p.moral < .15) { e.equipe = e.equipe.filter(x => x.id !== p.id); arrivees.push({ demission: p.nom }); }
  }
  GRAINS.forEach(g => { if (e.stock[g.id] > 0) e.age[g.id] = (e.age[g.id] || 0) + (a(e, 'entrepot') ? .5 : 1); else e.age[g.id] = 0; });
  e.meteoDemain = tirerMeteo(rnd, e);
  e.machines.forEach((id, p) => { if (id) e.calcaire[p] = Math.min(1, (e.calcaire[p] || 0) + CALCAIRE.parJour / Math.sqrt(M[id].fiabilite)); });
  e.bilans = [...e.bilans.slice(-27), b];   // quatre semaines, pour les courbes
  e.phase = 'nuit'; e.horloge = HORAIRES.fermeture; e.nuitReste = 0;
  e.evts = e.evts.filter(v => v.id === 'etudiants'); e.decision = null; e.decisionsDuJour = [];
  e.st.forEach(s => { s.panne = null; s.coup = 0; });
  e.stats.nuits++;
  if (e.jour % MOIS.jours === 0) finDuMois(e, arrivees);
  if (e.jour % 7 === 0) { genererCandidats(e, rnd); const g = genererGazette(e, rnd); if (g) arrivees.push({ gazette: g }); }
  if (e.abonnement.grain && e.abonnement.kg > 0) {
    const place = Math.floor((capaciteReserve(e) - totalStock(e)) / DOSES_SAC);
    if (place >= 1) { const r = commander(e, e.abonnement.grain, Math.min(e.abonnement.kg, place), true); if (r !== 'ok') arrivees.push({ abonnementRate: r }); }
  }
  if (e.argent < seuilFaillite(e)) {
    if (!e.sauvetage) { e.sauvetage = true; e.argent += 10000; arrivees.push({ sauvetage: true }); }
    else { e.faillite = true; arrivees.push({ faillite: true }); }
  } else if (e.argent < DECOUVERT.alerte) arrivees.push({ alerteBanque: true });
  // Pour les courbes du journal : l'état du café ce soir-là
  Object.assign(b, { caisse: e.argent, note: e.rep, notoriete: e.notoriete, membres: e.fidelite?.active ? e.fidelite.membres : 0, commandes: e.journee.commandes || 0 });
  majLigue(e, b, rnd, arrivees);
  return { bilan: b, arrivees };
}
export function ouvrir(e, rnd = Math.random) {
  if (ouvert(e) || e.faillite) return [];
  const arrivees = [];
  for (const c of e.livraisonsMatin) {
    if (c.grain !== 'lait' && rnd() < F[e.fournisseur].retard) {
      e.commandes.push({ ...c, eta: 5 * SPH }); arrivees.push({ retard: c });
    } else {
      if (c.grain === 'lait') { e.lait += c.sacs * LAIT.doses; e.laitVide = false; } else ajouterStock(e, c.grain, c.sacs * DOSES_SAC);
      arrivees.push({ livraison: c });
    }
  }
  e.livraisonsMatin = [];
  e.journee = nouvelleJournee();
  if (a(e, 'vitrine') && e.viennoiseries.commande > 0) { const n = e.viennoiseries.commande; depenser(e, n * VIENNOISERIES.cout); e.viennoiseries.stock = n; }
  e.phase = 'service'; e.horloge = HORAIRES.ouverture; e.nuitReste = 0; e.jour++;
  if (jourSemaine(e) === 0) e.equipe.forEach(p => { p.heuresSemaine = 0; });
  // Un événement du quartier, une journée sur cinq environ
  e.evtQuartier = e.jour >= EVT_QUARTIER.depuisJour && rnd() < EVT_QUARTIER.chance ? EVENEMENTS_QUARTIER[Math.floor(rnd() * EVENEMENTS_QUARTIER.length)].id : null;
  if (e.evtQuartier) arrivees.push({ evtQuartier: EVENEMENTS_QUARTIER.find(x => x.id === e.evtQuartier) });
  const prevue = e.meteoDemain || 'nuages'; e.meteo = rnd() < FIABILITE_PREVISION ? prevue : tirerMeteo(rnd, e);
  if (e.meteo !== prevue) arrivees.push({ surpriseMeteo: { prevue, reelle: e.meteo } });
  planifierDecisions(e, rnd);
  e.defi = tirerDefi(e, rnd);
  arrivees.push({ ouverture: e.jour });
  return arrivees;
}

export function tick(e, dt, rnd = Math.random) {
  const arrivees = [];
  if (!ouvert(e)) return { ...bilan(e), recette: 0, arrivees };
  // Les trois missions du jour, tirées au premier instant de chaque journée
  if (!e.missions || e.missionsJour !== e.jour) { e.missions = tirerMissions(e, rnd); e.missionsJour = e.jour; e.missionsParfait = false; }
  if (!e.boutique || e.boutique.jour !== e.jour) e.boutique = tirerBoutique(e, rnd);
  if (!e.ligue) e.ligue = nouvelleSemaine(e, 0, rnd);
  if (e.roue && e.roue.jour < e.jour) e.roue = null;
  for (const s of e.st) {
    if (s.panne && reparateurPresent(e)) { s.panne.auto -= dt; if (s.panne.auto <= 0) { s.panne = null; arrivees.push({ reparee: true }); } }
  }
  e.evts.forEach(v => v.reste -= dt); e.evts = e.evts.filter(v => v.reste > 0);
  e.commandes.forEach(c => c.eta -= dt);
  e.commandes = e.commandes.filter(c => {
    if (c.eta > 0) return true;
    if (c.grain === 'lait') { e.lait += c.sacs * LAIT.doses; e.laitVide = false; } else ajouterStock(e, c.grain, c.sacs * DOSES_SAC);
    arrivees.push({ livraison: c }); return false;
  });
  if (e.stock[e.maison] <= 0) { const autre = [...GRAINS].reverse().find(g => e.stock[g.id] > 0); if (autre) { e.maison = autre.id; arrivees.push({ repli: autre.id }); } }

  const b = bilan(e), parts = partsCarte(e), k = consoParTasse(e) * Math.max(.05, partGrain(e, parts));
  const ventes = Math.min(b.ventes * dt, e.stock[e.maison] / k);
  const perdus = Math.max(0, b.demande * dt - ventes);
  e.stock[e.maison] = Math.max(0, e.stock[e.maison] - ventes * k);
  // Chaque produit de la carte : combien en vendre, dans la limite du lait, des croissants et de la cuisine
  const mult = tarifMoment(e) * multTicket(e), capCuisine = (b.cap?.cuisine || 0) * dt / SPH;
  const demCuisine = ventes * Object.keys(parts).reduce((s, id) => s + (CA[id].cuisine ? parts[id] : 0), 0);
  const fCuisine = demCuisine > capCuisine ? capCuisine / demCuisine : 1;
  let recette = 0, ingredients = 0, vienno = 0;
  for (const id in parts) {
    const p = CA[id]; let n = ventes * parts[id];
    if (p.cuisine) n *= fCuisine;
    if (p.lait) { n = Math.min(n, e.lait); e.lait = Math.max(0, e.lait - n); if (e.lait <= 0 && !e.laitVide) { e.laitVide = true; arrivees.push({ plusDeLait: true }); } }
    if (p.stock) { n = Math.min(n, e.viennoiseries.stock); e.viennoiseries.stock -= n; vienno += n; }
    if (n <= 0) continue;
    const ca = n * prixProduit(e, id) * mult;
    recette += ca; if (!p.stock) ingredients += n * p.cout;
    const t = e.journee.produits[id] || (e.journee.produits[id] = { n: 0, ca: 0 }); t.n += n; t.ca += ca;
    for (const c of e.commandesSpe || []) if (c.produit === id && c.fait < c.quantite) c.fait = Math.min(c.quantite, c.fait + n);
  }
  majCommandes(e, dt, rnd, arrivees);
  e.journee.remises += ventes * partFideles(e) * FIDELITE.remise * prixEffectif(e);
  e.argent += recette; e.meta.totalGagne += recette; e.meta.tasses += ventes; e.meta.clientsTotal += ventes;
  e.journee.recettes += recette; e.journee.tasses += ventes; e.journee.clients += ventes; e.journee.perdus += perdus; e.journee.viennoiseries += vienno;
  e.mois.ca += recette; if (ventes > 0) depenser(e, ventes * CONSOMMABLES + ingredients);
  const sat = satisfaction(e, b);
  e.journee.satisfaction += sat * ventes;
  e.rep += (sat - e.rep) * Math.min(1, ventes * NOTE.poids);
  e.rep += (NOTE.perdu - e.rep) * Math.min(1, perdus * NOTE.poidsPerdu);
  e.rep = Math.max(1, Math.min(5, e.rep));
  e.nbAvis += ventes * .08;
  e.notoriete = Math.min(NOTORIETE.max, e.notoriete + ventes * NOTORIETE.parClient * Math.max(.2, (e.rep - 2) / 1.5) * multBouche(e));
  if (b.demande > 0) e.service += (Math.min(1, b.chaine * 1.3 / b.demande) - e.service) * Math.min(1, dt * .02);
  const hr = e.journee.heures?.[Math.max(0, Math.min(e.journee.heures.length - 1, Math.floor(e.horloge - HORAIRES.ouverture)))];
  if (hr) { hr.ventes += ventes; hr.recettes += recette; if (b.goulot.type === 'station') hr.station += dt; else if (b.goulot.type === 'clients') hr.clients += dt; else if (b.goulot.type === 'stock') hr.stock += dt; }
  const mo = e.journee.moments?.[momentIndex(e)];
  if (mo) {
    mo.t += dt; mo.ventes += ventes;
    if (b.goulot.type === 'station') { mo.station += dt; mo.stations[b.goulot.i] += dt; }
    else if (b.goulot.type === 'clients') mo.clients += dt; else if (b.goulot.type === 'stock') mo.stock += dt;
  }
  if (e.stock[e.maison] <= 0) { if (e.ruptureDepuis === 0) e.rupturesVues++; e.ruptureDepuis += dt; } else e.ruptureDepuis = 0;
  const d = e.defi;
  if (d && !d.fini && !d.rate) {
    if (d.id === 'tasses') d.progres = e.journee.tasses;
    if (d.id === 'matin') { d.progres = e.journee.moments[0].ventes; if (e.horloge >= MOMENTS[0].a && d.progres < d.cible) d.rate = true; }
    if (d.id === 'sansRupture' && e.ruptureDepuis > 0) d.rate = true;
    if ((d.id === 'tasses' || d.id === 'matin') && d.progres >= d.cible) { d.fini = true; encaisserPrime(e, d.prime); arrivees.push({ defiReussi: d }); }
    if (d.rate) arrivees.push({ defiRate: d });
  }
  for (const g of GRAINS) if (e.rep >= g.rep && !e.debloques.includes(g.id)) { e.debloques.push(g.id); arrivees.push({ debloque: g.id }); }
  if (e.decision) { e.decision.reste -= dt; if (e.decision.reste <= 0) arrivees.push({ decisionAuto: choisirDecision(e, 1) }); }
  else if (e.decisionsDuJour.length && e.horloge >= e.decisionsDuJour[0].heure) { e.decisionsDuJour.shift(); const dd = proposerDecision(e, rnd); if (dd) arrivees.push({ decision: dd }); }
  e.horloge += dt / SPH;
  if (e.horloge >= HORAIRES.fermeture) { const f = fermer(e, rnd); arrivees.push({ fermeture: f.bilan }, ...f.arrivees); }
  return { ...b, recette, arrivees };
}

// ---------- Succès et histoire ----------
const TESTS_SUCCES = {
  premierCafe: e => e.meta.tasses >= 1, habitues: e => e.meta.tasses >= 100, milleTasses: e => e.meta.tasses >= 1000, centMille: e => e.meta.tasses >= 1e5,
  caisse1k: e => e.meta.totalGagne >= 1e4, caisse100k: e => e.meta.totalGagne >= 1e5, caisse10M: e => e.meta.totalGagne >= 1e6,
  travaux5: e => e.achats.length >= 5, toutNeuf: e => e.achats.length >= TRAVAUX.length, equipe: e => e.equipe.filter(p => !p.gerant).length >= 5,
  etoiles3: e => e.rep >= 3.5 && e.nbAvis >= 50, etoiles5: e => e.rep >= 4.6 && e.nbAvis >= 300, fineBouche: e => e.maison === 'bourbon' && e.stock.bourbon > 0,
  reparateur: e => e.meta.reparations >= 10, critique: e => e.meta.critiques >= 1, franchise: e => e.stats.pretsRembourses >= 1,
  quartier: e => HABITUES.every(h => (e.meta.habitues[h.id] || 0) > 0),
  geisha: e => e.maison === 'geisha' && e.stock.geisha > 0, atelier5: e => e.stats.formations >= 5,
  atelierMax: e => e.equipe.some(p => !p.gerant && p.comp >= 5), etage: e => a(e, 'etage'), celeste: e => e.machines.includes('celeste'),
  amiQuartier: e => HISTOIRES_HABITUES.every(h => amitie(e, h.id).lus >= h.chapitres.length),
  lettresMamie: e => (e.meta.courrier?.lus || 0) >= LETTRES.length,
  premierChapitre: e => Object.values(e.meta.amities || {}).some(x => x.lus >= 1),
  coursier: e => (e.stats.commandesFaites || 0) >= 10,
  album5: e => Object.keys(e.meta.album || {}).length >= 5,
  albumComplet: e => VISITEURS.every(v => e.meta.album?.[v.id]),
  collection12: e => Object.keys(e.meta.cartes || {}).length >= 12,
  legendaire: e => Object.keys(e.meta.cartes || {}).some(id => CR[id]?.rarete === 'legendaire'),
  collection1: e => COLLECTIONS.some(k => collectionComplete(e, k.id)),
  ligueOr: e => (e.ligue?.division || 0) >= 2,
  legendeEquipe: e => e.equipe.some(p => TRAITS_LEGENDE.some(t => t.id === p.trait)),
};
export function verifierSucces(e) {
  const nouveaux = SUCCES.filter(s => !e.meta.succes.includes(s.id) && TESTS_SUCCES[s.id]?.(e));
  nouveaux.forEach(s => { e.meta.succes.push(s.id); gagnerXp(e, XP.succes); });
  return nouveaux;
}
const TESTS_HISTOIRE = {
  intro: () => true, premierManager: e => e.equipe.some(p => !p.gerant), premiereRupture: e => e.rupturesVues > 0,
  etoiles3: e => e.rep >= 3.5 && e.nbAvis >= 50, cloison: e => a(e, 'agrandir'), cafemax: e => e.meta.totalGagne >= 30000,
  terrasse: e => a(e, 'terrasse'), atelier: e => e.historiqueMois.length >= 1, etage: e => a(e, 'etage'),
};
export function verifierHistoire(e) {
  const h = HISTOIRE.find(m => !e.meta.histoire.includes(m.id) && TESTS_HISTOIRE[m.id]?.(e));
  if (h) e.meta.histoire.push(h.id);
  return h || null;
}

// ---------- Habitués ----------
export const habituesDisponibles = e => HABITUES.filter(h => e.rep >= h.repMin);
export function choisirHabitue(e, rnd) {
  const liste = habituesDisponibles(e);
  return liste.length ? liste[Math.min(liste.length - 1, Math.floor(rnd * liste.length))] : null;
}
export function servirHabitue(e, id) {
  if (e.stock[e.maison] <= 0 || !ouvert(e)) return 0;
  const pourboire = 1;
  e.argent += pourboire; e.meta.totalGagne += pourboire; e.journee.recettes += pourboire; e.mois.ca += pourboire;
  e.meta.habitues[id] = (e.meta.habitues[id] || 0) + 1;
  return pourboire;
}

// ---------- Revenir le lendemain : le courrier de mamie et les histoires des habitués ----------
// Le jour réel (« AAAA-MM-JJ ») est fourni par main.js : la logique ne lit jamais l'horloge, et les tests peuvent changer de jour.
// Rien ne se perd si l'on ne vient pas un jour : la lettre et le chapitre suivants attendent, simplement.
const avecNomCafe = (e, t) => String(t).replaceAll('{cafe}', nomCafe(e));
export function bonusCadeaux(e, champ) {
  const m = e.meta;
  return (m.cadeaux || []).reduce((s, id) => s + (CADEAUX_HABITUES[id]?.[champ] || 0), 0) + (champ === 'clients' && m.secret ? SECRET_MAMIE.clients : 0);
}
function ajouterAvis(e, n) { e.rep = (e.rep * e.nbAvis + 4.6 * n) / (e.nbAvis + n); e.nbAvis += n; }
function ajouterNotoriete(e, x) { e.notoriete = Math.min(NOTORIETE.max, e.notoriete + x); }
const pctNotoriete = x => Math.round(x / NOTORIETE.max * 100);
// Une nouvelle partie n'a pas de lettre le premier jour (mamie écrit « demain ») ; une partie déjà lancée en reçoit une tout de suite.
export function initCourrier(e, auj) {
  if (e.meta.courrier) return;
  e.meta.courrier = { dernier: e.jour > 1 || e.meta.tasses > 0 ? '' : auj, lus: 0 };
}
export const courrierDispo = (e, auj) => !!e.meta.courrier && e.meta.courrier.dernier !== auj;
export const pourboireQuartier = e => {
  const j = e.bilans.slice(-7), moy = j.length ? j.reduce((s, b) => s + b.recettes, 0) / j.length : 0;
  return Math.max(LETTRE_QUARTIER.min, Math.round(moy * LETTRE_QUARTIER.part / 10) * 10);
};
export function prochaineLettre(e) {
  const n = e.meta.courrier?.lus || 0;
  if (n < LETTRES.length) return { ...LETTRES[n], de: 'Mamie Odette', numero: n + 1, total: LETTRES.length };
  const q = LETTRES_QUARTIER[(n - LETTRES.length) % LETTRES_QUARTIER.length];
  return { titre: 'Un mot du quartier', texte: q.texte, de: q.de, cadeau: { argent: pourboireQuartier(e) } };
}
export function ouvrirCourrier(e, auj) {
  if (!courrierDispo(e, auj)) return null;
  const l = prochaineLettre(e), c = l.cadeau, gains = [];
  if (c.argent) { encaisserPrime(e, c.argent); gains.push(`+${c.argent} €`); }
  if (c.notoriete) { ajouterNotoriete(e, c.notoriete); gains.push(`Notoriété +${pctNotoriete(c.notoriete)} %`); }
  if (c.mur && !e.deco.vus.includes(c.mur)) { e.deco.vus.push(c.mur); gains.push(`Nouveau mur : ${MU[c.mur].nom}`); }
  if (c.secret) { e.meta.secret = true; gains.push(`Le secret de mamie : +${Math.round(SECRET_MAMIE.clients * 100)} % de clients, pour toujours`); }
  e.meta.courrier.dernier = auj; e.meta.courrier.lus++; gagnerXp(e, XP.lettre);
  return { ...l, texte: avecNomCafe(e, l.texte), gains };
}

export const histoireDe = idHabitue => HISTOIRES_HABITUES.find(h => h.qui.includes(idHabitue)) || null;
export const visitesHistoire = (e, h) => h.qui.reduce((s, id) => s + (e.meta.habitues[id] || 0), 0);
export const amitie = (e, id) => e.meta.amities?.[id] || { lus: 0, jour: '' };
// pret : un chapitre attend d'être lu ; demain : l'habitué est venu assez souvent, mais il a déjà raconté un chapitre aujourd'hui
export function etatHistoire(e, h, auj) {
  const am = amitie(e, h.id), lus = am.lus, visites = visitesHistoire(e, h);
  if (lus >= h.chapitres.length) return { lus, fini: true, visites };
  const seuil = AMITIE.visites[lus], assez = visites >= seuil, dejaAujourdhui = am.jour === auj;
  return { lus, fini: false, visites, seuil, pret: assez && !dejaAujourdhui, demain: dejaAujourdhui };
}
export function chapitrePret(e, idHabitue, auj) {
  const h = histoireDe(idHabitue);
  return h && etatHistoire(e, h, auj).pret ? h : null;
}
export function lireChapitre(e, idHistoire, auj) {
  const h = HISTOIRES_HABITUES.find(x => x.id === idHistoire);
  if (!h || !etatHistoire(e, h, auj).pret) return null;
  const am = { ...amitie(e, h.id) }, c = h.chapitres[am.lus], gains = [];
  if (c.argent) { encaisserPrime(e, c.argent); gains.push(`Pourboire : +${c.argent} €`); }
  if (c.avis) { ajouterAvis(e, c.avis); gains.push(`+${c.avis} avis enthousiastes`); }
  am.lus++; am.jour = auj; gagnerXp(e, XP.chapitre);
  e.meta.amities = { ...(e.meta.amities || {}), [h.id]: am };
  const final = am.lus >= h.chapitres.length;
  if (final && !e.meta.cadeaux.includes(h.cadeau.id)) {
    e.meta.cadeaux.push(h.cadeau.id);
    if (CADEAUX_HABITUES[h.cadeau.id]?.notoriete) ajouterNotoriete(e, CADEAUX_HABITUES[h.cadeau.id].notoriete);
    gains.push(`${h.cadeau.nom} : ${h.cadeau.effet}`);
  }
  return { histoire: h, numero: am.lus, total: h.chapitres.length, titre: c.titre, texte: avecNomCafe(e, c.texte), gains, final };
}
// Ce qui attend le joueur à sa prochaine visite (affiché le soir, pour donner envie de revenir)
export function aSuivre(e, auj) {
  const l = [];
  const c = e.meta.courrier;
  if (c && c.dernier === auj) l.push({ icone: '✉️', texte: c.lus < LETTRES.length ? 'Demain matin, une nouvelle lettre de mamie t’attend.' : 'Demain, le quartier t’écrit un petit mot.' });
  else if (c) l.push({ icone: '✉️', texte: 'Une lettre de mamie t’attend déjà : touche l’enveloppe.' });
  for (const h of HISTOIRES_HABITUES) {
    const s = etatHistoire(e, h, auj);
    if (s.fini || !habituesDisponibles(e).some(x => h.qui.includes(x.id))) continue;
    if (s.demain) l.push({ icone: h.icone, texte: `${h.nom} aura la suite de son histoire demain (chapitre ${s.lus + 1}/${h.chapitres.length}).` });
    else if (s.pret) l.push({ icone: h.icone, texte: `${h.nom} a quelque chose à te raconter : sers-le bien !` });
    else if (s.lus > 0) l.push({ icone: h.icone, texte: `${h.nom} : encore ${s.seuil - s.visites} visite${s.seuil - s.visites > 1 ? 's' : ''} avant le chapitre ${s.lus + 1}.` });
  }
  return l.slice(0, 4);
}

// ---------- Commandes spéciales : un client du quartier veut N produits avant un délai (en heures de service) ----------
// La quantité suit les ventes de la veille : on y arrive en servant bien, plus vite en soignant prix, équipe et stock.
export function nouvelleCommande(e, rnd = Math.random) {
  const [hMin, hMax] = COMMANDES.delaiHeures, heures = hMin + Math.floor(rnd() * (hMax - hMin + 1));
  // Ventes par heure de la veille ; on ne demande que des produits qu'on vend assez pour pouvoir réussir
  const parHeureDe = id => { const n = e.bilans.at(-1)?.produits?.[id]?.n; return n ? n / (HORAIRES.fermeture - HORAIRES.ouverture) : (id === 'espresso' ? 6 : 0); };
  const ids = CARTE.filter(p => produitActif(e, p.id) && parHeureDe(p.id) * heures * COMMANDES.part >= COMMANDES.min * 1.2).map(p => p.id);
  const id = ids[Math.floor(rnd() * ids.length)] || 'espresso';
  const parHeure = parHeureDe(id) || 6;
  const quantite = Math.max(COMMANDES.min, Math.round(parHeure * heures * COMMANDES.part / COMMANDES.pas) * COMMANDES.pas);
  const cl = CLIENTS_COMMANDES[Math.floor(rnd() * CLIENTS_COMMANDES.length)];
  // La prime grandit avec le café : au moins 5 % d'une journée moyenne de recettes
  const j = e.bilans.slice(-7), recetteJour = j.length ? j.reduce((s, b) => s + (b.recettes || 0), 0) / j.length : 0;
  const prime = Math.max(COMMANDES.primeMin, Math.round(quantite * prixProduit(e, id) * COMMANDES.prime / 5) * 5, Math.round(recetteJour * COMMANDES.partRecette / 5) * 5);
  e.compteurCommandes = (e.compteurCommandes || 0) + 1;
  return { num: e.compteurCommandes, client: cl.nom, icone: cl.icone, produit: id, quantite, fait: 0, reste: heures * SPH, heures, prime, xp: COMMANDES.xp + quantite };
}
function majCommandes(e, dt, rnd, arrivees) {
  e.commandesSpe ??= [];
  for (const c of e.commandesSpe) {
    if (c.fait >= c.quantite) {
      c.prime = Math.round(c.prime * (1 + bonusCarte(e, 'commandes')));
      encaisserPrime(e, c.prime); gagnerXp(e, c.xp); c.or = gagnerOr(e, OR.commande); c.finie = true;
      e.stats.commandesFaites = (e.stats.commandesFaites || 0) + 1; e.journee.commandes = (e.journee.commandes || 0) + 1;
      arrivees.push({ commandeFaite: c });
    } else { c.reste -= dt; if (c.reste <= 0) { c.finie = true; arrivees.push({ commandeRatee: c }); } }
  }
  e.commandesSpe = e.commandesSpe.filter(c => !c.finie);
  e.attenteCommande = (e.attenteCommande || 0) - dt;
  if (e.commandesSpe.length < COMMANDES.max && e.attenteCommande <= 0 && e.horloge >= COMMANDES.depuisHeure && e.horloge < HORAIRES.fermeture - 2) {
    const c = nouvelleCommande(e, rnd); e.commandesSpe.push(c);
    e.attenteCommande = COMMANDES.attente * SPH;
    arrivees.push({ nouvelleCommande: c });
  }
}

// ---------- Pendant ton absence : si une équipe est là, le café tourne au ralenti (vraies heures, plafonnées) ----------
export function gainsAbsence(e, secondes, rnd = Math.random) {
  const heures = Math.min(ABSENCE.max, secondes / 3600);
  if (!(heures >= ABSENCE.min) || e.faillite) return null;
  const equipe = e.equipe.filter(p => !p.gerant).length;
  if (!equipe || !e.bilans.length) return { heures, rien: true, sansEquipe: !equipe };
  const j = e.bilans.slice(-7), moy = k => j.reduce((s, b) => s + (b[k] || 0), 0) / j.length;
  const prevu = moy('clients') * ABSENCE.part * heures;
  const k = consoParTasse(e) * Math.max(.05, partGrain(e, partsCarte(e, 1, true)));
  const clients = Math.max(0, Math.min(prevu, e.stock[e.maison] / k));
  const argent = prevu > 0 ? Math.max(0, moy('benefice')) * ABSENCE.part * heures * clients / prevu : 0;
  return { heures, clients: Math.floor(clients), argent: Math.round(argent), grain: clients * k, plusDeGrain: clients < prevu * .99,
    avis: PRENOMS_AVIS[Math.floor(rnd() * PRENOMS_AVIS.length)] };
}
export function appliquerAbsence(e, g) {
  if (!g || g.rien) return;
  e.stock[e.maison] = Math.max(0, e.stock[e.maison] - g.grain);
  encaisserPrime(e, g.argent); e.meta.totalGagne += g.argent;
  e.meta.clientsTotal += g.clients; e.meta.tasses += g.clients;
}

// ---------- Visiteurs rares : un par jour au plus, à collectionner dans l'album ----------
export function choisirVisiteur(e, rnd = Math.random) {
  if (e.meta.visiteJour === e.jour) return null;
  const ok = VISITEURS.filter(v => e.rep >= (v.rep || 0) && (!v.meteo || v.meteo === e.meteo));
  if (!ok.length) return null;
  const neufs = ok.filter(v => !e.meta.album?.[v.id]);
  const liste = neufs.length && rnd() < VISITE_RARE.nouveau ? neufs : ok;
  const v = liste[Math.floor(rnd() * liste.length)];
  e.meta.visiteJour = e.jour;
  return { ...v, rare: true };
}
export function recevoirVisiteur(e, id) {
  const v = VISITEURS.find(x => x.id === id); if (!v) return null;
  e.meta.album = { ...(e.meta.album || {}), [id]: (e.meta.album?.[id] || 0) + 1 };
  const c = v.cadeau;
  if (c.argent) encaisserPrime(e, c.argent);
  if (c.notoriete) ajouterNotoriete(e, c.notoriete);
  if (c.avis) ajouterAvis(e, c.avis);
  gagnerXp(e, VISITE_RARE.xp);
  const nouveau = e.meta.album[id] === 1;
  if (nouveau) gagnerOr(e, OR.visiteur);
  return { visiteur: v, nouveau, total: Object.keys(e.meta.album).length };
}

// ---------- Grains d'or : la monnaie du marché (jamais achetée avec de l'argent réel) ----------
const CR = Object.fromEntries(CARTES_COLLECTION.map(c => [c.id, c]));
export { CR as CATALOGUE_CARTES };
export const grainsOr = e => e.meta.grainsOr || 0;
export function gagnerOr(e, n) {
  if (!(n > 0)) return 0;
  const g = Math.round(n * (1 + bonusCarte(e, 'or')));
  e.meta.grainsOr = grainsOr(e) + g; e.meta.orTotal = (e.meta.orTotal || 0) + g;
  return g;
}

// ---------- Les cartes : bonus selon la rareté et le niveau ; 1 emplacement, puis 2 au niveau 10 et 3 au niveau 20 ----------
export const nbEmplacements = e => EMPLACEMENTS.filter(x => niveauCafe(e) >= x.niveau).length;
export const carteDe = (e, id) => e.meta.cartes?.[id] || null;
export const valeurCarte = (c, niv = 1) => c.valeur * CARTES_NIVEAUX.mult[Math.min(Math.max(1, niv), CARTES_NIVEAUX.max) - 1];
// Le bonus d'un effet : cartes actives, collections complètes, la roue du jour, et une star dans l'équipe (+5 % de clients)
export function bonusCarte(e, effet) {
  const cartes = (e.meta?.cartesActives || []).reduce((s, id) => {
    const c = CR[id], p = carteDe(e, id);
    return s + (c && p && c.effet === effet ? valeurCarte(c, p.niv) : 0);
  }, 0);
  const star = effet === 'clients' && e.equipe?.some(p => p.trait === 'star') ? .05 : 0;
  return cartes + bonusCollections(e, effet) + bonusRoue(e, effet) + star;
}
export const collectionComplete = (e, idCol) => CARTES_COLLECTION.filter(c => c.collection === idCol).every(c => carteDe(e, c.id));
const bonusCollections = (e, effet) => COLLECTIONS.reduce((s, k) => s + (k.effet === effet && collectionComplete(e, k.id) ? k.valeur : 0), 0);
// La roue du matin : le bonus vaut pour la journée de jeu choisie (et la nuit d'avant, pour les commandes de grain)
const bonusRoue = (e, effet) => {
  const r = e.roue; if (!r || r.effet !== effet) return 0;
  return r.jour === e.jour || (!ouvert(e) && r.jour === e.jour + 1) ? r.valeur : 0;
};
export function tirerCarte(caisse, rnd = Math.random) {
  const ch = caisse.chances, total = Object.values(ch).reduce((x, y) => x + y, 0);
  let x = rnd() * total, rarete = 'commune';
  for (const r of Object.keys(RARETES)) { x -= ch[r] || 0; if (x < 0) { rarete = r; break; } }
  const liste = CARTES_COLLECTION.filter(c => c.rarete === rarete);
  return liste[Math.min(liste.length - 1, Math.floor(rnd() * liste.length))];
}
export function ouvrirCaisse(e, idCaisse, rnd = Math.random) {
  const k = CAISSES.find(x => x.id === idCaisse);
  if (!k) return { erreur: 'indispo' };
  // Une caisse gratuite (ligue, roue) passe avant les grains d'or
  const gratuite = (e.meta.caissesGratuites?.[idCaisse] || 0) > 0;
  if (!gratuite && grainsOr(e) < k.prix) return { erreur: 'or' };
  if (gratuite) e.meta.caissesGratuites[idCaisse]--; else e.meta.grainsOr -= k.prix;
  e.meta.caissesOuvertes = (e.meta.caissesOuvertes || 0) + 1;
  const c = tirerCarte(k, rnd);
  return { carte: c, gratuite, ...ajouterCarte(e, c.id) };
}
export function ajouterCarte(e, id) {
  e.meta.cartes = e.meta.cartes || {};
  const col = CR[id].collection, avant = col && collectionComplete(e, col);
  const p = e.meta.cartes[id] || (e.meta.cartes[id] = { niv: 1, n: 0 });
  p.n++;
  // Une place libre : la nouvelle carte s'active toute seule
  const actives = e.meta.cartesActives || (e.meta.cartesActives = []);
  let activee = false;
  if (!actives.includes(id) && actives.length < nbEmplacements(e)) { actives.push(id); activee = true; }
  const collection = col && !avant && collectionComplete(e, col) ? COLLECTIONS.find(x => x.id === col) : null;
  return { nouvelle: p.n === 1 && p.niv === 1, exemplaires: p.n, niv: p.niv, activee, fusion: peutFusionner(e, id), collection };
}
export const caissesGratuites = (e, id) => e.meta.caissesGratuites?.[id] || 0;
function offrirCaisse(e, id, n = 1) { e.meta.caissesGratuites = { ...(e.meta.caissesGratuites || {}), [id]: caissesGratuites(e, id) + n }; }

// ---------- La boutique du jour : 3 cartes précises, à prix fixe ----------
export function tirerBoutique(e, rnd = Math.random) {
  const rar = ['commune', rnd() < .5 ? 'commune' : 'rare', rnd() < .06 ? 'legendaire' : rnd() < .35 ? 'epique' : 'rare'];
  const pris = new Set();
  const offres = rar.map(r => {
    const l = CARTES_COLLECTION.filter(c => c.rarete === r && !pris.has(c.id));
    const c = l[Math.floor(rnd() * l.length) % l.length]; pris.add(c.id);
    return { carte: c.id, prix: BOUTIQUE.prix[r], achete: false };
  });
  return { jour: e.jour, offres };
}
export function acheterOffre(e, k) {
  const o = e.boutique?.offres?.[k];
  if (!o || o.achete) return { erreur: 'indispo' };
  if (grainsOr(e) < o.prix) return { erreur: 'or' };
  e.meta.grainsOr -= o.prix; o.achete = true;
  return { carte: CR[o.carte], ...ajouterCarte(e, o.carte) };
}

// ---------- Les uniformes de l'équipe ----------
export const uniforme = e => UNIFORMES.find(u => u.id === e.meta.uniforme) || UNIFORMES[0];
export function choisirUniforme(e, id) {
  const u = UNIFORMES.find(x => x.id === id); if (!u) return 'indispo';
  const a2 = e.meta.uniformes || (e.meta.uniformes = ['cafe']);
  if (!a2.includes(id)) {
    if (grainsOr(e) < u.prix) return 'or';
    e.meta.grainsOr -= u.prix; a2.push(id);
  }
  e.meta.uniforme = id; return 'ok';
}

// ---------- La ligue de la semaine : 9 cafés rivaux simulés, points = clients + 30 par commande ----------
const pointsBilan = b => Math.round((b.clients || 0) + LIGUE.pointsCommande * (b.commandes || 0));
function nouvelleSemaine(e, division, rnd = Math.random) {
  const j = e.bilans.slice(-7), base = j.length ? j.reduce((s, b) => s + pointsBilan(b), 0) / j.length : LIGUE.depart;
  const noms = [...CAFES_RIVAUX].sort(() => rnd() - .5).slice(0, LIGUE.rivaux);
  const mult = LIGUE.divisions[division].mult;
  return { semaine: Math.floor((e.jour - 1) / 7), division, points: 0, rivaux: noms.map(nom => ({ nom, points: 0, rythme: Math.round(base * mult * (.6 + rnd() * .75)) })) };
}
export function classementLigue(e) {
  const l = e.ligue; if (!l) return [];
  const enCours = ouvert(e), part = enCours ? avanceeJournee(e) : 0;
  const moi = { nom: nomCafe(e), points: l.points + (enCours ? pointsBilan(e.journee) : 0), moi: true };
  return [moi, ...l.rivaux.map(r => ({ nom: r.nom, points: Math.round(r.points + r.rythme * part) }))].sort((x, y) => y.points - x.points);
}
export const placeLigue = e => classementLigue(e).findIndex(x => x.moi) + 1;
function majLigue(e, b, rnd, arrivees) {
  if (!e.ligue) e.ligue = nouvelleSemaine(e, 0, rnd);
  e.ligue.points += pointsBilan(b);
  e.ligue.rivaux.forEach(r => { r.points += Math.round(r.rythme * (.8 + rnd() * .4)); });
  e.ligue.placeHier = placeLigue(e);   // pour la flèche ▲▼ du classement le lendemain
  if (jourSemaine(e) !== 6) return;   // la semaine se termine le dimanche soir
  const place = placeLigue(e), rec = LIGUE.recompenses[place - 1] || { or: 5 };
  const or = gagnerOr(e, rec.or); if (rec.caisse) offrirCaisse(e, rec.caisse);
  const avant = e.ligue.division, nb = LIGUE.rivaux + 1;
  let div = avant;
  if (place <= LIGUE.montent && div < LIGUE.divisions.length - 1) div++;
  else if (place > nb - LIGUE.descendent && div > 0) div--;
  arrivees.push({ finLigue: { place, or, caisse: rec.caisse || null, avant, apres: div } });
  e.ligue = nouvelleSemaine(e, div, rnd);
}

// ---------- Les événements du quartier ----------
export const evtQuartier = e => EVENEMENTS_QUARTIER.find(x => x.id === e.evtQuartier) || null;
export function multEvtQuartier(e) {
  const v = evtQuartier(e); if (!v || !ouvert(e)) return 1;
  return e.horloge >= v.de && e.horloge < v.a ? v.mult : 1;
}

// ---------- La roue du matin : un tour gratuit par vrai jour ----------
export const roueDispo = (e, auj) => e.meta.roueJour !== auj;
export function tournerRoue(e, auj, rnd = Math.random) {
  if (!roueDispo(e, auj)) return null;
  const total = ROUE.reduce((s, x) => s + x.poids, 0);
  let x = rnd() * total, k = 0;
  for (; k < ROUE.length - 1; k++) { x -= ROUE[k].poids; if (x < 0) break; }
  const s = ROUE[k];
  e.meta.roueJour = auj;
  if (s.id === 'or' || s.id === 'jackpot') gagnerOr(e, s.valeur);
  else if (s.id === 'argent') encaisserPrime(e, s.valeur);
  else if (s.id === 'xp') gagnerXp(e, s.valeur);
  else if (s.id === 'caisse') offrirCaisse(e, 'carton', s.valeur);
  else e.roue = { effet: s.id, valeur: s.valeur, jour: ouvert(e) ? e.jour : e.jour + 1 };
  return { index: k, segment: s };
}

// ---------- Le concours de déco : chaque fin de mois ----------
export const scoreDeco = e => Math.round((bonusDeco(e) + (harmonie(e) ? .3 : 0)) * 100) / 100;
function concoursDeco(e) {
  const score = scoreDeco(e), k = CONCOURS_DECO.places.findIndex(p => score >= p.seuil);
  const or = gagnerOr(e, k >= 0 ? CONCOURS_DECO.places[k].or : CONCOURS_DECO.participation);
  return { place: k + 1, nom: k >= 0 ? CONCOURS_DECO.places[k].nom : 'participation', or, score, prochain: k > 0 ? CONCOURS_DECO.places[k - 1].seuil : k < 0 ? CONCOURS_DECO.places.at(-1).seuil : null };
}
export const peutFusionner = (e, id) => { const p = carteDe(e, id); return !!p && p.niv < CARTES_NIVEAUX.max && p.n >= CARTES_NIVEAUX.fusion; };
export function fusionner(e, id) {
  if (!peutFusionner(e, id)) return 'indispo';
  const p = carteDe(e, id); p.n -= CARTES_NIVEAUX.fusion - 1; p.niv++;
  return 'ok';
}
// On garde toujours un exemplaire : on ne recycle que les doubles
export function recycler(e, id) {
  const p = carteDe(e, id); if (!p || p.n < 2) return 0;
  p.n--; const g = RARETES[CR[id].rarete].recyclage;
  e.meta.grainsOr = grainsOr(e) + g;
  return g;
}
export function activerCarte(e, id) {
  const p = carteDe(e, id); if (!p) return 'indispo';
  const actives = e.meta.cartesActives || (e.meta.cartesActives = []);
  if (actives.includes(id)) return 'deja';
  if (actives.length >= nbEmplacements(e)) return 'plein';
  actives.push(id); return 'ok';
}
export function desactiverCarte(e, id) { e.meta.cartesActives = (e.meta.cartesActives || []).filter(x => x !== id); return 'ok'; }

// ---------- Les missions du jour : trois petits défis à chaque journée de jeu, payés en grains d'or ----------
export function tirerMissions(e, rnd = Math.random) {
  const hier = e.bilans.at(-1), n = x => Math.max(10, Math.round(x / 10) * 10);
  const produits = CARTE.filter(p => p.id !== 'espresso' && produitActif(e, p.id) && (hier?.produits?.[p.id]?.n || 0) >= 8);
  const pool = [
    { type: 'clients', cible: n((hier?.clients || 60) * .85), texte: c => `Servir ${c} clients` },
    { type: 'commandes', cible: hier ? 2 : 1, texte: c => `Réussir ${c} commande${c > 1 ? 's' : ''} spéciale${c > 1 ? 's' : ''}` },
    { type: 'habitue', cible: 1, texte: () => 'Recevoir un habitué', ok: habituesDisponibles(e).length > 0 },
    { type: 'poste', cible: 1, texte: () => 'Améliorer un poste (touche-le)' },
    { type: 'benefice', cible: n(Math.max(50, (hier?.benefice || 0) * .8)), texte: c => `Finir la journée avec ${c} € de bénéfice`, ok: !!hier && hier.benefice > 0 },
  ];
  if (produits.length) { const p = produits[Math.floor(rnd() * produits.length)]; pool.push({ type: 'produit', produit: p.id, cible: Math.max(5, Math.round(hier.produits[p.id].n * .7 / 5) * 5), texte: c => `Vendre ${c} ${p.nom.toLowerCase()}` }); }
  const dispo = pool.filter(m => m.ok !== false), choisies = [];
  while (choisies.length < MISSIONS.nombre && dispo.length) choisies.push(dispo.splice(Math.floor(rnd() * dispo.length), 1)[0]);
  return choisies.map((m, k) => {
    const mi = { type: m.type, produit: m.produit, cible: m.cible, texte: m.texte(m.cible), or: OR.mission[k] || OR.mission[0], jour: e.jour, fini: false };
    mi.base = valeurMission(e, mi);
    return mi;
  });
}
function valeurMission(e, m) {
  switch (m.type) {
    case 'clients': return e.journee.clients;
    case 'commandes': return e.stats.commandesFaites || 0;
    case 'produit': return e.journee.produits?.[m.produit]?.n || 0;
    case 'habitue': return Object.values(e.meta.habitues || {}).reduce((s, x) => s + x, 0);
    case 'poste': return e.st.reduce((s, x) => s + (x.niv || 1), 0);
    case 'benefice': { const b = e.bilans.at(-1); return b && b.jour === m.jour ? b.benefice : e.journee.recettes - e.journee.depenses; }
    default: return 0;
  }
}
export const progresMission = (e, m) => Math.max(0, Math.min(m.cible, m.type === 'benefice' ? valeurMission(e, m) : valeurMission(e, m) - (m.base || 0)));
// Vérifie les missions et le défi du jour ; renvoie les grains d'or gagnés (avec de quoi l'annoncer)
export function verifierMissions(e) {
  const gains = [];
  for (const m of e.missions || []) {
    if (m.fini) continue;
    const fin = m.type === 'benefice' ? e.bilans.at(-1)?.jour === m.jour && e.bilans.at(-1).benefice >= m.cible : progresMission(e, m) >= m.cible;
    if (fin) { m.fini = true; gains.push({ mission: m, or: gagnerOr(e, m.or) }); }
  }
  if (e.missions?.length && e.missions.every(m => m.fini) && !e.missionsParfait) { e.missionsParfait = true; gains.push({ parfait: true, or: gagnerOr(e, OR.journeeParfaite) }); }
  if (e.defi?.fini && !e.defi.orDonne) { e.defi.orDonne = true; gains.push({ defi: e.defi, or: gagnerOr(e, OR.defi) }); }
  return gains;
}

// ---------- Objectifs de mamie ----------
const TESTS_OBJECTIFS = {
  journal: e => e.stats.nuits >= 1, commande: e => e.stats.commandes >= 1 || !!e.abonnement.grain,
  embauche: e => e.equipe.some(p => !p.gerant && p.role === 'salle'), peinture: e => a(e, 'peinture'),
  carte: e => nbProduits(e) > VARIETE.reference, fidelite: e => !!e.fidelite?.active,
  machine: e => machinesInstallees(e).some(m => m.id !== 'occasion'), premierMois: e => e.historiqueMois.some(m => m.resultat > 0),
  note35: e => e.rep >= 3.5 && e.nbAvis >= 100, equipe3: e => e.equipe.filter(p => !p.gerant).length >= 3,
  cloison: e => a(e, 'agrandir'), ca15k: e => e.historiqueMois.some(m => m.ca >= 15000), terrasse: e => a(e, 'terrasse'),
  note45: e => e.rep >= 4.5 && e.nbAvis >= 500, ca40k: e => e.historiqueMois.some(m => m.ca >= 40000),
};
export const objectifActuel = e => OBJECTIFS[e.objectif] || null;
export const primeObjectif = (e, o) => o.prime;
export function verifierObjectif(e) {
  const o = objectifActuel(e);
  if (!o || !TESTS_OBJECTIFS[o.id]?.(e)) return null;
  encaisserPrime(e, o.prime); e.objectif++; gagnerXp(e, XP.objectif);
  return { ...o, prime: o.prime };
}
