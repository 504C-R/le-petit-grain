// Logique pure du jeu : aucun DOM, aucune 3D, aucun Date.now(). Testée par node --test.
// Le hasard est passé en paramètre (rnd), pour que les tests soient reproductibles.
import {
  GRAINS, G, STATIONS, TRAVAUX, T, SUCCES, HISTOIRE, DOSES_SAC, SURCOUT_AUTO,
  SEUIL_FRANCHISE, SEUIL_CAFEMAX, VILLES, INFOS_VILLES, HERITAGE, OBJECTIFS, HABITUES, POURBOIRE, LAIT,
  HORAIRES, COURBE_HEURE, MOMENTS, URGENCE, MACHINES, MOULINS, FOURNISSEURS, CHARGES, DUREE_DECISION, RESERVE, AMELIORATIONS, FRAICHEUR, RENFORTS, TARIFS, CALCAIRE, METEOS, FIABILITE_PREVISION, BOISSONS, MURS, SOLS, HARMONIE, FORMULES, MISE_EN_PLACE, DEFIS, DOSAGE, PRENOMS_AVIS,
} from './data.js';

const M = Object.fromEntries(MACHINES.map(m => [m.id, m]));
const MO = Object.fromEntries(MOULINS.map(m => [m.id, m]));
const F = Object.fromEntries(FOURNISSEURS.map(f => [f.id, f]));
const AM = Object.fromEntries(AMELIORATIONS.map(x => [x.id, x]));
const MET = Object.fromEntries(METEOS.map(x => [x.id, x])), BO = Object.fromEntries(BOISSONS.map(x => [x.id, x]));
export { MET as CATALOGUE_METEOS, BO as CATALOGUE_BOISSONS };
export { M as CATALOGUE_MACHINES, MO as CATALOGUE_MOULINS, F as CATALOGUE_FOURNISSEURS };

// ---------- État ----------
export function nouvelleMeta() {
  return { franchises: 0, etoilesF: 0, ville: 0, succes: [], histoire: [], tasses: 0, totalGagne: 0, reparations: 0, critiques: 0, habitues: {},
    heritage: {}, etoilesDepensees: 0, reseau: [], nomCafe: '' };
}
// Statistiques d'une journée, avec le détail par moment (matin, midi, après-midi, fin de journée)
export const nouvelleJournee = () => ({ recettes: 0, depenses: 0, charges: 0, tasses: 0,
  moments: MOMENTS.map(() => ({ t: 0, ventes: 0, station: 0, clients: 0, stock: 0, stations: [0, 0, 0, 0] })),
  // une case par heure d'ouverture (7 h → 18 h) : ventes, recettes, et ce qui a limité
  heures: Array.from({ length: HORAIRES.fermeture - HORAIRES.ouverture }, () => ({ ventes: 0, recettes: 0, station: 0, clients: 0, stock: 0 })) });
export function nouvelEtat(meta = nouvelleMeta()) {
  return {
    version: 3,
    argent: 25 + 60 * meta.etoilesF + 400 * (meta.heritage?.capital || 0), totalRun: 0, rep: 1.2 + .25 * (meta.heritage?.bouche || 0), prix: 1.2, maison: 'premier',
    stock: Object.fromEntries(GRAINS.map(g => [g.id, g.id === 'premier' ? 3 * DOSES_SAC : 0])),
    debloques: ['premier'], achats: [], commandes: [], livraisonsMatin: [], service: 1, dosage: DOSAGE.reference,
    machines: ['occasion', null, null], moulin: 'manivelle', fournisseur: 'grossiste', amelios: {},
    age: Object.fromEntries(GRAINS.map(g => [g.id, 0])), renforts: [0, 0, 0, 0], tarifs: [1, 1, 1, 1], calcaire: [0, 0, 0], meteo: 'nuages', meteoDemain: 'soleil', boisson: 'aucune', deco: { mur: 'creme', sol: 'parquet', vus: ['creme', 'parquet'] }, formules: {}, defi: null,
    st: STATIONS.map((_, i) => ({ niv: 1 + 5 * (meta.heritage?.equipe || 0), manager: i === 0 && !!meta.heritage?.gerard, coup: 0, panne: null })),
    salaires: [1, 1, 1, 1],
    rush: 0, rushRecharge: 0, evts: [], ruptureDepuis: 0, rupturesVues: 0,
    lait: 0, laitVide: false,
    phase: 'service', horloge: 7, nuitReste: 0, jour: 1,
    journee: nouvelleJournee(), bilans: [],
    decision: null, decisionsDuJour: [],
    objectif: 0, stats: { coups: 0, commandes: 0, nuits: 0 },
    meta,
  };
}
// ---------- Le café du joueur : son nom, et sa sauvegarde à emporter ----------
export const NOM_PAR_DEFAUT = 'Le Petit Grain';
export const nomCafe = e => e.meta.nomCafe || NOM_PAR_DEFAUT;
// Un nom propre : sans espaces en trop, sans caractères de contrôle, 22 caractères au plus
export const nettoyerNom = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 22);
// La sauvegarde en un code texte (à copier ou à garder dans un fichier) : « PG1: » + JSON en base64
export function exporterSauvegarde(e) {
  const octets = new TextEncoder().encode(JSON.stringify(e));
  let bin = ''; for (let k = 0; k < octets.length; k += 8192) bin += String.fromCharCode(...octets.subarray(k, k + 8192));
  return 'PG1:' + btoa(bin);
}
export function importerSauvegarde(code) {
  try {
    const brut = String(code || '').trim().replace(/^PG1:/, '').replace(/\s+/g, '');
    const bin = atob(brut), octets = Uint8Array.from(bin, c => c.charCodeAt(0));
    const d = JSON.parse(new TextDecoder().decode(octets));
    if (!d || typeof d !== 'object' || !d.meta || typeof d.argent !== 'number') return null;
    return restaurer(d);
  } catch { return null; }
}

// Recharge une sauvegarde en complétant les champs manquants (et convertit les anciennes parties)
export function restaurer(d) {
  const meta = Object.assign(nouvelleMeta(), d.meta || {});
  const e = Object.assign(nouvelEtat(meta), d, { meta });
  e.stock = Object.assign(nouvelEtat(meta).stock, d.stock || {});
  e.stats = Object.assign({ coups: 0, commandes: 0, nuits: 0 }, d.stats || {});
  e.amelios = Object.assign({}, d.amelios || {});
  e.age = Object.assign(nouvelEtat(meta).age, d.age || {});
  e.renforts = Array.isArray(d.renforts) ? d.renforts : [0, 0, 0, 0];
  e.tarifs = Array.isArray(d.tarifs) ? d.tarifs : [1, 1, 1, 1];
  e.calcaire = Array.isArray(d.calcaire) ? d.calcaire : [0, 0, 0];
  e.formules = Object.assign({}, d.formules || {});
  e.deco = Object.assign({ mur: 'creme', sol: 'parquet', vus: ['creme', 'parquet'] }, d.deco || {});
  if (!e.journee.heures) e.journee.heures = nouvelleJournee().heures;
  if (!e.journee.moments) e.journee = Object.assign(nouvelleJournee(), e.journee, { moments: nouvelleJournee().moments });
  if (!d.version || d.version < 3) {
    // Ancienne partie : on traduit les anciens travaux de machines et de moulin en catalogue
    const ach = d.achats || [];
    const modele = ach.includes('machinePro') ? 'maestro' : ach.includes('machine1') ? 'bellacrema' : 'occasion';
    e.machines = [modele, ach.includes('machine2') ? modele : null, ach.includes('machine3') ? modele : null];
    e.moulin = ach.includes('torrefacteur') ? 'torrefacteur' : ach.includes('moulinElec') ? 'electrique' : 'manivelle';
    e.achats = ach.filter(id => T[id]);
    if (ach.includes('machine2') && !e.achats.includes('comptoir2')) e.achats.push('comptoir2');
    e.phase = 'service'; e.horloge = 7; e.version = 3;
  }
  return e;
}

// ---------- Dérivés ----------
export const a = (e, id) => e.achats.includes(id);
export const machinesInstallees = e => e.machines.filter(Boolean).map(id => M[id]);
export const nbPostes = e => 1 + (a(e, 'comptoir2') ? 1 : 0) + (a(e, 'agrandir') ? 1 : 0);
export const nbMachines = e => machinesInstallees(e).length;
// Pour l'affichage : 0 = vieille machine, 1 = machines neuves, 2 = au moins une Maestro Pro
export const tierMachine = e => machinesInstallees(e).some(m => m.visuel === 'machine_pro' || m.prix >= 12000) ? 2 : machinesInstallees(e).some(m => m.id !== 'occasion') ? 1 : 0;
export const tierMoulin = e => MO[e.moulin].visuel === 'torrefacteur' ? 2 : e.moulin === 'manivelle' ? 0 : 1;
// Niveau d'une amélioration de l'atelier, et son effet multiplicatif (1 + effet × niveau)
export const niv = (e, id) => e.amelios?.[id] || 0;
export const bonusAm = (e, id) => 1 + AM[id].effet * niv(e, id);
export const aBuse = e => a(e, 'buse') || e.machines.includes('vapore');
export const ouvert = e => e.phase === 'service';
export const places = e => 4 + 2 * ['table3', 'table4', 'table5', 'table6'].filter(t => a(e, t)).length + (a(e, 'terrasse') ? 4 : 0) + (a(e, 'etage') ? 6 : 0);
export const bonusDeco = e => (a(e, 'peinture') ? .2 : 0) + (a(e, 'plantes') ? .15 : 0) + (a(e, 'lampes') ? .15 : 0) + (a(e, 'enseigne') ? .25 : 0) + (a(e, 'ardoise') ? .1 : 0) + (a(e, 'fresque') ? .2 : 0)
  + (a(e, 'tapis') ? .1 : 0) + (a(e, 'cheminee') ? .1 : 0) + (a(e, 'lustre') ? .15 : 0) + (harmonie(e) ? HARMONIE.etoiles : 0);
// ---------- Décoration au choix ----------
const MU = Object.fromEntries(MURS.map(x => [x.id, x])), SO = Object.fromEntries(SOLS.map(x => [x.id, x]));
export { MU as CATALOGUE_MURS, SO as CATALOGUE_SOLS };
export const murActuel = e => MU[e.deco?.mur] || MU.creme;
export const solActuel = e => SO[e.deco?.sol] || SO.parquet;
// Un mur et un sol du même style s'accordent (il faut avoir fait le coup de peinture)
export const harmonie = e => a(e, 'peinture') && murActuel(e).style === solActuel(e).style;
// Un revêtement déjà posé une fois se remet gratuitement
export const prixDeco = (e, x) => (e.deco?.vus || []).includes(x.id) ? 0 : x.prix;
export function choisirDeco(e, type, id) {
  const x = (type === 'mur' ? MU : SO)[id];
  if (!x) return 'indispo';
  if (!a(e, 'peinture')) return 'peinture';
  if (e.rep < (x.rep || 0)) return 'verrou';
  if (ouvert(e)) return 'ferme';
  if (e.deco[type] === id) return 'deja';
  const p = prixDeco(e, x);
  if (e.argent < p) return 'argent';
  depenser(e, p); e.deco[type] = id; if (!e.deco.vus.includes(id)) e.deco.vus.push(id);
  return 'ok';
}
export const menuLait = e => aBuse(e) && e.lait > 0;
const multPrixEvts = e => e.evts.reduce((m, v) => m * (v.prix || 1), 1);
// Ce qu'un client dépense en moyenne (viennoiserie avec la vitrine, cappuccino avec le lait)
// Prix réellement affiché : le prix de base × le tarif du moment (seulement café ouvert)
export const prixEffectif = e => e.prix * (ouvert(e) ? (e.tarifs?.[momentIndex(e)] ?? 1) : 1);
export function reglerTarif(e, m, v) {
  if (m < 0 || m >= MOMENTS.length) return 'indispo';
  e.tarifs[m] = Math.round(Math.round(Math.max(TARIFS.min, Math.min(TARIFS.max, v)) / TARIFS.pas) * TARIFS.pas * 100) / 100;
  return 'ok';
}
// ---------- Formules par moment ----------
const FO = Object.fromEntries(FORMULES.map(x => [x.id, x]));
export { FO as CATALOGUE_FORMULES };
export const formuleOuverte = (e, f) => (f.req || []).every(r => a(e, r)) && e.rep >= (f.rep || 0);
// La formule active pour le moment en cours (café ouvert), sinon rien
export const formuleDuMoment = e => { if (!ouvert(e)) return null; const k = momentIndex(e); return FORMULES.find(f => f.moment === k && e.formules?.[f.id] && formuleOuverte(e, f)) || null; };
export const coutMiseEnPlace = e => Math.max(MISE_EN_PLACE.min, Math.round(MISE_EN_PLACE.part * recettesRef(e)));
export function reglerFormule(e, id, actif) {
  const f = FO[id]; if (!f) return 'indispo';
  if (!formuleOuverte(e, f)) return 'verrou';
  if (ouvert(e)) return 'ferme';
  e.formules[id] = !!actif; return 'ok';
}
const multFormulePanier = e => { const f = formuleDuMoment(e); return f ? 1 + f.panier - f.cout : 1; };
export const panier = e => prixEffectif(e) * multPrixEvts(e) * (ouvert(e) ? multBoisson(e) * multFormulePanier(e) : 1) * (a(e, 'vitrine') ? 1.2 : 1) * (a(e, 'boutique') ? 1.15 : 1) * (menuLait(e) ? 1 + LAIT.part * LAIT.bonus : 1);
export const prixCappuccino = e => prixEffectif(e) * (1 + LAIT.bonus);
export const multGlobal = e => (1 + .1 * e.meta.etoilesF) * (1 + .02 * e.meta.succes.length);
export function multEquip(e, i) {
  if (i === 1) return MO[e.moulin].vitesse * bonusAm(e, 'meules');
  if (i === 2) return Math.max(.1, machinesInstallees(e).reduce((s, m) => s + m.vitesse, 0)) * bonusAm(e, 'pression');
  return 1;
}
// Tous les 25 niveaux, la station passe un palier : ×1,5 (×2 auparavant : la progression s’emballait)
export const milestone = niv => Math.pow(1.5, Math.floor(niv / 25));
export const debitMax = (e, i) => STATIONS[i].base * e.st[i].niv * milestone(e.st[i].niv) * multEquip(e, i) * multGlobal(e);
export function debitStation(e, i) {
  const s = e.st[i];
  if (s.panne) return 0;
  return debitMax(e, i) * ((s.manager || s.coup > 0) ? 1 : .5) * (e.rush > 0 ? 2 : 1) * multRenfort(e);
}
export const coutNiveau = (e, i) => STATIONS[i].c0 * Math.pow(1.15, e.st[i].niv - 1) * (a(e, 'ecole') ? .7 : 1);
export function qualiteEquipement(e) {
  const ms = machinesInstallees(e);
  // le calcaire gâte le café de chaque machine entartrée
  const gouts = e.machines.map((id, p) => id ? M[id].qualite * (1 - CALCAIRE.gout * (e.calcaire?.[p] || 0)) : null).filter(x => x != null);
  const machine = gouts.length ? gouts.reduce((s, q) => s + q, 0) / gouts.length : .8;
  return machine * MO[e.moulin].qualite * F[e.fournisseur].qualite;
}
// Fraîcheur d'un grain (1 = frais) selon l'âge moyen du stock, en jours
export const fraicheur = (e, g) => Math.max(FRAICHEUR.min, 1 - FRAICHEUR.perte * Math.max(0, (e.age?.[g] || 0) - FRAICHEUR.jours));
// Ajoute des grains à la réserve : l'âge moyen se mélange avec celui du stock déjà là
export function ajouterStock(e, g, doses) {
  const s = Math.max(0, e.stock[g]);
  e.age[g] = s + doses > 0 ? (e.age[g] || 0) * s / (s + doses) : 0;
  e.stock[g] = s + doses;
}
export const qualite = e => G[e.maison].q * (1 + .006 * Math.min(e.st[1].niv, 100)) * qualiteEquipement(e) * bonusAm(e, 'recettes') * fraicheur(e, e.maison) * (1 + .06 * (e.meta?.heritage?.recettes || 0)) * facteurDosage(e);
export const prixJuste = e => (1.0 + .45 * qualite(e)) * villeInfo(e).prix;
export const villeInfo = e => INFOS_VILLES[VILLES[e.meta.ville % VILLES.length]] || INFOS_VILLES.Lyon;
// La note visée, et d'où elle vient : le goût compte le plus, puis le service, la déco et l'équipe.
// Chaque morceau plafonne : il faut être bon partout pour approcher 5 ★.
export function cibleReputation(e) {
  const r = prixEffectif(e) / prixJuste(e);
  const parts = {
    base: .7,
    gout: 2.2 * (1 - Math.exp(-qualite(e) / 3)),
    service: .8 * Math.pow(Math.max(0, Math.min(1, e.service ?? 1)), 2),
    deco: Math.min(1, bonusDeco(e) * .6),
    equipe: e.st.filter(s => s.manager).length * .08,
    prix: -Math.max(0, r - 1.05) * 4,
    incidents: -(e.ruptureDepuis > 3 ? 1.5 : 0) - e.st.filter(s => s.panne).length * .4,
  };
  const total = Math.max(.5, Math.min(5, Object.values(parts).reduce((x, y) => x + y, 0)));
  return { total, parts };
}
// Héritage « contrat fournisseur » : tous les grains moins chers
export const remiseGrains = e => 1 - .08 * (e.meta?.heritage?.contrat || 0);
// ---------- Dosage ----------
// Part d'une dose « de référence » (8 g) utilisée par tasse : à 10 g, un sac fait 20 % de tasses en moins
export const consoParTasse = e => (e.dosage || DOSAGE.reference) / DOSAGE.reference;
export function facteurDosage(e) {
  const d = e.dosage || DOSAGE.reference, T = DOSAGE.gout;
  if (d <= T[0][0]) return T[0][1];
  for (let k = 1; k < T.length; k++) if (d <= T[k][0]) return T[k - 1][1] + (T[k][1] - T[k - 1][1]) * (d - T[k - 1][0]) / (T[k][0] - T[k - 1][0]);
  return T[T.length - 1][1];
}
export function reglerDosage(e, g) { e.dosage = Math.round(Math.max(DOSAGE.min, Math.min(DOSAGE.max, g)) / DOSAGE.pas) * DOSAGE.pas; return 'ok'; }
export const coutTasse = e => G[e.maison].prixSac * F[e.fournisseur].prixMult * remiseGrains(e) * consoParTasse(e) / DOSES_SAC;
export function facteurPrix(e) { const r = prixEffectif(e) / prixJuste(e); return r <= 1 ? 1 + .3 * (1 - r) : Math.exp(-2.5 * (r - 1)); }
const multEvts = e => e.evts.reduce((m, v) => m * (v.demande ?? 1), 1);
// Affluence selon l'heure (interpolée entre les points de COURBE_HEURE)
export function courbeHeure(h) {
  if (h <= COURBE_HEURE[0][0]) return COURBE_HEURE[0][1];
  for (let k = 1; k < COURBE_HEURE.length; k++) {
    const [h1, v1] = COURBE_HEURE[k], [h0, v0] = COURBE_HEURE[k - 1];
    if (h <= h1) return v0 + (v1 - v0) * (h - h0) / (h1 - h0);
  }
  return COURBE_HEURE[COURBE_HEURE.length - 1][1];
}
export const momentIndex = e => { const k = MOMENTS.findIndex(m => e.horloge >= m.de && e.horloge < m.a); return k < 0 ? MOMENTS.length - 1 : k; };
// Renforts : extras du moment en cours (seulement café ouvert)
export const multRenfort = e => ouvert(e) ? 1 + RENFORTS.gain * (e.renforts?.[momentIndex(e)] || 0) : 1;
const recettesRef = e => { const b = e.bilans.slice(-3); return b.length ? b.reduce((s, x) => s + x.recettes, 0) / b.length : 100; };
export const coutRenfort = e => Math.max(RENFORTS.min, Math.round(RENFORTS.part * recettesRef(e)));
// Le planning se décide le soir, pour le lendemain
export function reglerRenfort(e, m, n) {
  if (ouvert(e)) return 'ferme';
  if (m < 0 || m >= MOMENTS.length) return 'indispo';
  e.renforts[m] = Math.max(0, Math.min(RENFORTS.max, Math.round(n)));
  return 'ok';
}
export const momentActuel = e => !ouvert(e) ? { nom: 'Nuit' } : (MOMENTS.find(m => e.horloge >= m.de && e.horloge < m.a) || MOMENTS[MOMENTS.length - 1]);
// Pour la lumière : 0 = ouverture, 1 = fermeture
export const avanceeJournee = e => Math.max(0, Math.min(1, (e.horloge - HORAIRES.ouverture) / (HORAIRES.fermeture - HORAIRES.ouverture)));
export const multSalle = e => (.5 + .125 * places(e)) * (a(e, 'agrandir') ? 1.25 : 1) * (a(e, 'terrasse') ? 1.4 : 1) * (a(e, 'enseigne') ? 1.1 : 1) * (a(e, 'ardoise') ? 1.05 : 1)
  * (a(e, 'emporter') ? 1.15 : 1) * (a(e, 'velo') ? 1.2 : 1) * (a(e, 'etage') ? 1.35 : 1) * bonusAm(e, 'fidelite')
  * (a(e, 'jukebox') ? 1.06 : 1) * (harmonie(e) ? 1 + HARMONIE.clients : 1);
export function demande(e) {
  if (!ouvert(e)) return 0;
  return .45 * e.st[3].niv * milestone(e.st[3].niv) * (.4 + e.rep * .24) * multSalle(e) * facteurPrix(e) * multEvts(e)
    * courbeHeure(e.horloge) * (e.rush > 0 ? 1.5 : 1) * multGlobal(e) * multMeteo(e) * (1 + (formuleDuMoment(e)?.demande || 0)) * villeInfo(e).demande;
}
// ---------- Météo et boisson du jour ----------
export const meteoDuJour = e => MET[e.meteo] || MET.nuages;
// Les travaux de confort changent l'effet de la météo : cheminée par grand froid, clim en canicule, chauffages en terrasse
export const multMeteo = e => {
  const m = meteoDuJour(e);
  const terr = a(e, 'terrasse') ? (a(e, 'chauffages') && m.terrasse < 1 ? 1 - (1 - m.terrasse) / 2 : m.terrasse) * (villeInfo(e).terrasse || 1) : 1;
  return m.demande * terr * (m.id === 'froid' && a(e, 'cheminee') ? 1.3 : 1) * (m.id === 'chaleur' && a(e, 'clim') ? 1.25 : 1);
};
// Ce que la boisson du jour rapporte en plus sur chaque client, ingrédients déduits, pour une météo donnée
export const effetBoisson = (id, meteo) => { const b = BO[id] || BO.aucune; return id === 'aucune' ? 0 : (b.bonus[meteo] || 0) - b.cout; };
export const multBoisson = e => 1 + effetBoisson(e.boisson, e.meteo);
export function tirerMeteo(rnd, e = null) {
  // la ville change les chances de chaque temps (Lille pluvieuse, Marseille ensoleillée…)
  const poids = m => e ? (villeInfo(e).meteo[m.id] ?? m.poids) : m.poids;
  const total = METEOS.reduce((s, m) => s + poids(m), 0); let x = rnd() * total;
  for (const m of METEOS) { if ((x -= poids(m)) <= 0) return m.id; }
  return METEOS[METEOS.length - 1].id;
}
// La boisson du jour se prépare le soir, pour le lendemain
export function choisirBoisson(e, id) {
  const b = BO[id]; if (!b) return 'indispo';
  if (e.rep < b.rep) return 'verrou';
  if (ouvert(e)) return 'ferme';
  e.boisson = id; return 'ok';
}
// La réserve suit la livraison : former Gérard, c'est aussi pouvoir stocker une journée entière
export const coefReserve = e => (RESERVE.coef + (a(e, 'palette') ? .25 : 0) + (a(e, 'arriere') ? .4 : 0) + (a(e, 'entrepot') ? .6 : 0)) * bonusAm(e, 'rayonnages');
const JOURNEE = (HORAIRES.fermeture - HORAIRES.ouverture) * HORAIRES.secondesParHeure;
export const capaciteReserve = e => (RESERVE.base + (a(e, 'palette') ? 8 : 0) + (a(e, 'arriere') ? 30 : 0) + (a(e, 'entrepot') ? 100 : 0)
  + Math.floor(debitMax(e, 0) * JOURNEE * coefReserve(e) / DOSES_SAC)) * DOSES_SAC;
const grainsCommandes = e => e.commandes.concat(e.livraisonsMatin).filter(c => c.grain !== 'lait').reduce((x, c) => x + c.sacs * DOSES_SAC, 0);
export const totalStock = e => Object.values(e.stock).reduce((x, y) => x + y, 0) + grainsCommandes(e);
// Héritage « artisans fidèles » : travaux moins chers
export const prixTravaux = (e, t) => Math.round(t.prix * (1 - .1 * (e.meta?.heritage?.artisans || 0)));
export const disponible = (e, t) => !a(e, t.id) && (t.req || []).every(r => a(e, r));
export const cafemaxOuvert = e => e.meta.histoire.includes('cafemax') || !!villeInfo(e).cafemax;

// Ce que le café vend en ce moment, et ce qui le limite
export function bilan(e) {
  if (!ouvert(e)) return { ventes: 0, chaine: 0, demande: 0, goulot: { type: 'ferme', nom: 'le café est fermé (journal du soir)' }, parSeconde: 0 };
  let chaine = Infinity, goulot = null;
  STATIONS.forEach((s, i) => { const d = debitStation(e, i); if (d < chaine) { chaine = d; goulot = { type: 'station', i, nom: s.nom }; } });
  const dem = demande(e);
  let ventes = Math.min(chaine, dem);
  if (dem < chaine) goulot = { type: 'clients', nom: 'les clients (heure, prix, réputation, places)' };
  if (e.stock[e.maison] <= 0) { ventes = 0; goulot = { type: 'stock', nom: 'la réserve : plus de grains !' }; }
  return { ventes, chaine, demande: dem, goulot, parSeconde: ventes * panier(e) };
}

// Charges de la journée : loyer, salaires des managers, entretien des machines
export function chargesJour(e) {
  const loyer = villeInfo(e).loyer * (CHARGES.loyer + (a(e, 'agrandir') ? CHARGES.loyerAgrandi : 0) + (a(e, 'terrasse') ? CHARGES.loyerTerrasse : 0) + (a(e, 'etage') ? CHARGES.loyerEtage : 0) + places(e) * CHARGES.parPlace);
  // Un manager coûte plus cher quand sa station grandit (plus de monde à encadrer)
  const salaires = STATIONS.reduce((s, st, i) => s + (e.st[i].manager ? st.mgr * CHARGES.salaire * (e.salaires[i] || 1) * (1 + e.st[i].niv / 12) : 0), 0);
  const entretien = machinesInstallees(e).reduce((s, m) => s + m.prix * CHARGES.entretien, 0) + MO[e.moulin].prix * CHARGES.entretien;
  const renforts = (e.renforts || []).reduce((s, n) => s + n, 0) * coutRenfort(e);
  const formules = FORMULES.filter(f => e.formules?.[f.id] && formuleOuverte(e, f)).length * coutMiseEnPlace(e);
  return { loyer, salaires, entretien, renforts, formules, total: loyer + salaires + entretien + renforts + formules };
}

const depenser = (e, x) => { e.argent -= x; e.journee.depenses += x; };

// ---------- Commandes ----------
// Le soir : livré le lendemain matin, au prix du fournisseur. En journée : urgence (×2, livré en 1 h).
export function commander(e, grain, sacs, auto = false) {
  if (!e.debloques.includes(grain)) return 'verrou';
  if (ouvert(e)) return 'ferme';
  const prix = G[grain].prixSac * F[e.fournisseur].prixMult * remiseGrains(e) * sacs * (auto ? SURCOUT_AUTO : 1);
  if (e.argent < prix) return 'argent';
  if (totalStock(e) + sacs * DOSES_SAC > capaciteReserve(e) + 1e-6) return 'place';
  depenser(e, prix); if (!auto) e.stats.commandes++;
  e.livraisonsMatin.push({ grain, sacs });
  return 'ok';
}
export function commanderUrgence(e, grain, sacs, auto = false) {
  if (!e.debloques.includes(grain)) return 'verrou';
  if (!ouvert(e)) return commander(e, grain, sacs, auto);
  const prix = G[grain].prixSac * URGENCE.mult * remiseGrains(e) * sacs;
  if (e.argent < prix) return 'argent';
  if (totalStock(e) + sacs * DOSES_SAC > capaciteReserve(e) + 1e-6) return 'place';
  depenser(e, prix); if (!auto) e.stats.commandes++;
  e.commandes.push({ grain, sacs, eta: URGENCE.delai });
  return 'ok';
}
// Le lait se range au frigo : il ne prend pas de place dans la réserve de grains
export function commanderLait(e, packs, auto = false) {
  if (!aBuse(e)) return 'verrou';
  const urgence = ouvert(e);
  const prix = LAIT.prixPack * packs * (urgence ? URGENCE.mult : auto ? SURCOUT_AUTO : 1);
  if (e.argent < prix) return 'argent';
  depenser(e, prix); if (!auto) e.stats.commandes++;
  if (urgence) e.commandes.push({ grain: 'lait', sacs: packs, eta: URGENCE.delai });
  else e.livraisonsMatin.push({ grain: 'lait', sacs: packs });
  return 'ok';
}
// Commande autant de sacs que la place et l'argent le permettent (le soir)
export function remplir(e, grain, auto = false, maxSacs = Infinity) {
  if (ouvert(e)) return 'ferme';
  const prixSac = G[grain].prixSac * F[e.fournisseur].prixMult * remiseGrains(e) * (auto ? SURCOUT_AUTO : 1);
  const place = Math.floor((capaciteReserve(e) - totalStock(e)) / DOSES_SAC + 1e-6);
  if (place < 1) return 'place';
  const n = Math.min(place, Math.floor(e.argent / prixSac), maxSacs);
  if (n < 1) return 'argent';
  return commander(e, grain, n, auto) === 'ok' ? n : 'argent';
}

// ---------- Achats du soir : travaux et catalogue ----------
export function acheter(e, id) {
  const t = T[id];
  if (!t || !disponible(e, t)) return 'indispo';
  if (ouvert(e)) return 'ferme';
  const p = prixTravaux(e, t);
  if (e.argent < p) return 'argent';
  depenser(e, p); e.achats.push(id); return 'ok';
}
// L'ancienne machine est revendue 25 % de son prix
export function acheterMachine(e, poste, id) {
  const m = M[id];
  if (!m || poste < 0 || poste >= nbPostes(e)) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if (e.rep < (m.rep || 0)) return 'verrou';
  if (e.machines[poste] === id) return 'deja';
  const reprise = e.machines[poste] ? M[e.machines[poste]].prix * .25 : 0;
  if (e.argent + reprise < m.prix) return 'argent';
  depenser(e, m.prix - reprise); e.machines[poste] = id; e.calcaire[poste] = 0; return 'ok';
}
export function acheterMoulin(e, id) {
  const m = MO[id];
  if (!m) return 'indispo';
  if (ouvert(e)) return 'ferme';
  if (e.rep < (m.rep || 0)) return 'verrou';
  if (e.moulin === id) return 'deja';
  const reprise = MO[e.moulin].prix * .25;
  if (e.argent + reprise < m.prix) return 'argent';
  depenser(e, m.prix - reprise); e.moulin = id; return 'ok';
}
// ---------- Atelier : améliorations à niveaux (le soir) ----------
export const coutAmelioration = (e, id) => Math.round(AM[id].cout0 * Math.pow(AM[id].mult, niv(e, id)));
export const ameliorationOuverte = (e, id) => e.rep >= (AM[id].rep || 0);
export function ameliorer(e, id) {
  const x = AM[id];
  if (!x || !ameliorationOuverte(e, id)) return 'verrou';
  if (niv(e, id) >= x.max) return 'max';
  if (ouvert(e)) return 'ferme';
  const c = coutAmelioration(e, id);
  if (e.argent < c) return 'argent';
  depenser(e, c); e.amelios[id] = niv(e, id) + 1; return 'ok';
}
export function choisirFournisseur(e, id) {
  const f = F[id];
  if (!f) return 'indispo';
  if (e.rep < f.rep) return 'verrou';
  e.fournisseur = id; return 'ok';
}

// ---------- Actions de la journée ----------
export function former(e, i) {
  const c = coutNiveau(e, i);
  if (e.argent < c) return 'argent';
  depenser(e, c); e.st[i].niv++; return 'ok';
}
export function engager(e, i) {
  if (e.st[i].manager) return 'deja';
  if (e.argent < STATIONS[i].mgr) return 'argent';
  depenser(e, STATIONS[i].mgr); e.st[i].manager = true; e.salaires[i] = 1; return 'ok';
}
// Toucher une station : réparer si elle est en panne, sinon lui donner un coup de main
export function toucher(e, i) {
  const s = e.st[i];
  if (s.panne) {
    s.panne.coups--;
    if (s.panne.coups <= 0) { s.panne = null; e.meta.reparations++; return { type: 'repare' }; }
    return { type: 'reparation', reste: s.panne.coups };
  }
  if (!ouvert(e)) return { type: 'rien' };
  if (!s.manager) { s.coup = 5; e.stats.coups++; return { type: 'coup' }; }
  return { type: 'rien' };
}
export function choisirGrain(e, id) { if (!e.debloques.includes(id)) return 'verrou'; e.maison = id; return 'ok'; }
export function reglerPrix(e, p) { e.prix = Math.max(.5, Math.min(8, p)); }
export function lancerRush(e) { if (!ouvert(e)) return 'ferme'; if (e.rushRecharge > 0) return 'recharge'; e.rush = 30; e.rushRecharge = 150; return 'ok'; }

// ---------- Pannes et événements ----------
// Les machines peu fiables (la vieille, la Turbo) cassent bien plus souvent
export function choisirPanne(e, rnd) {
  const bar = machinesInstallees(e).reduce((s, m) => s + 1 / m.fiabilite, 0) * .8;
  const poids = [[0, .6], [1, 1 / MO[e.moulin].fiabilite], [2, bar]].filter(([i]) => !e.st[i].panne);
  if (!poids.length) return null;
  const total = poids.reduce((s, p) => s + p[1], 0); let x = rnd * total;
  for (const [i, w] of poids) { if ((x -= w) <= 0) return i; }
  return poids[poids.length - 1][0];
}
export function declencherPanne(e, i) { if (i == null || e.st[i].panne || !ouvert(e)) return false; e.st[i].panne = { coups: 3, auto: 6 }; return true; }
export const intervallePanne = (e, rnd) => ((machinesInstallees(e).some(m => m.fiabilite < .5) ? 45 : 70) + rnd * 60) * bonusAm(e, 'joints')
  * (1 - CALCAIRE.pannes * Math.max(0, ...(e.calcaire || [0])) / (1 + CALCAIRE.pannes));
// ---------- Calcaire ----------
export const coutDetartrage = (e, p) => Math.round(Math.max(CALCAIRE.min, (e.machines[p] ? M[e.machines[p]].prix : 0) * CALCAIRE.prix));
export function detartrer(e, p, auto = false) {
  if (!e.machines[p]) return 'indispo';
  if (ouvert(e) && !auto) return 'ferme';   // Lucas, lui, le fait pendant la fermeture
  if ((e.calcaire[p] || 0) <= 0) return 'propre';
  const c = coutDetartrage(e, p) * (auto ? 1.2 : 1);
  if (e.argent < c) return 'argent';
  e.argent -= c; e.calcaire[p] = 0; return 'ok';
}
export function evenementsPossibles(e) { return ['touristes', 'critique', 'pluie'].concat(cafemaxOuvert(e) ? ['cafemax'] : []); }
export const pleut = e => e.evts.some(v => v.id === 'pluie') || (ouvert(e) && e.meteo === 'pluie');
export const neige = e => e.meteo === 'froid';
export function appliquerEvenement(e, type) {
  e.evts = e.evts.filter(v => v.id !== type);   // le même événement ne se cumule pas : il repart de zéro
  if (type === 'touristes') { e.evts.push({ id: 'touristes', nom: 'Bus de touristes', demande: 1.9, reste: 40 }); return { type }; }
  if (type === 'pluie') {
    // La pluie vide la terrasse, mais les passants viennent se réfugier dans la salle
    const f = a(e, 'terrasse') ? .8 : 1.2;
    e.evts.push({ id: 'pluie', nom: 'Averse', demande: f, reste: 50 });
    return { type, terrasse: a(e, 'terrasse') };
  }
  if (type === 'cafemax') { e.evts.push({ id: 'cafemax', nom: 'Promo CaféMax', demande: .6, reste: 45 }); return { type }; }
  const r = prixEffectif(e) / prixJuste(e), ok = qualite(e) >= 2.4 && r <= 1.15 && e.stock[e.maison] > 0;
  e.rep = Math.max(.5, Math.min(5, e.rep + (ok ? .7 : -.4)));
  if (ok) e.meta.critiques++;
  return { type: 'critique', ok };
}

// ---------- Décisions (cartes à choix) ----------
const meilleurGrain = e => [...GRAINS].reverse().find(g => e.debloques.includes(g.id));
const prixMusicien = e => Math.round(40 * (1 + e.jour * .15));
const prixNettoyage = e => Math.round(30 + Math.min(500, Math.max(0, e.argent) * .04));
const CARTES = {
  groupe: {
    ok: () => true,
    carte: () => ({ texte: 'Un guide appelle : un groupe de 15 touristes voudrait venir dans l’heure. Ça va bousculer le service…', options: ['Accepter', 'Refuser'] }),
    choix: (e, k) => {
      if (k === 0) { e.evts = e.evts.filter(v => v.id !== 'groupe'); e.evts.push({ id: 'groupe', nom: 'Groupe de touristes', demande: 2.3, reste: 45 }); return 'Le groupe arrive : affluence ×2,3 pendant une heure et demie. Gare aux pannes !'; }
      return 'Tu as poliment refusé le groupe.';
    },
  },
  lot: {
    ok: e => e.argent >= meilleurGrain(e).prixSac * 3 && totalStock(e) + 5 * DOSES_SAC <= capaciteReserve(e),
    carte: e => { const g = meilleurGrain(e); return { texte: `Un livreur propose 5 sacs de ${g.nom} à −40 %, tout de suite (${Math.round(g.prixSac * 5 * .6)} €).`, options: ['Acheter', 'Non merci'] }; },
    choix: (e, k) => {
      if (k !== 0) return 'Tu as laissé passer l’affaire.';
      const g = meilleurGrain(e), prix = g.prixSac * 5 * .6;
      if (e.argent < prix) return 'Plus assez d’argent : l’affaire tombe à l’eau.';
      depenser(e, prix); ajouterStock(e, g.id, 5 * DOSES_SAC); return `5 sacs de ${g.nom} rangés dans la réserve.`;
    },
  },
  etudiants: {
    ok: e => e.rep >= 1.5 && !e.evts.some(v => v.id === 'etudiants'),
    carte: () => ({ texte: 'Inès demande une réduction de 10 % pour les étudiants. Ils viendront plus nombreux…', options: ['D’accord', 'Non'] }),
    choix: (e, k) => {
      if (k === 0) { e.evts.push({ id: 'etudiants', nom: 'Réduction étudiante', demande: 1.25, prix: .9, reste: 360 }); return 'Les étudiants affluent : +25 % de clients, −10 % sur le prix, pendant une journée.'; }
      e.rep = Math.max(.5, e.rep - .1); return 'Inès est un peu déçue (−0,1 ★).';
    },
  },
  musicien: {
    ok: e => e.horloge < 17,
    carte: e => ({ texte: `Un musicien propose de jouer cet après-midi pour ${prixMusicien(e)} €. L’ambiance attire du monde.`, options: ['Payer', 'Non merci'] }),
    choix: (e, k) => {
      if (k !== 0) return 'Le musicien ira jouer chez CaféMax…';
      if (e.argent < prixMusicien(e)) return 'Pas assez d’argent pour le musicien.';
      depenser(e, prixMusicien(e)); e.evts.push({ id: 'musique', nom: 'Musicien', demande: 1.5, reste: 90 }); return 'Musique ! +50 % de clients pendant 3 heures.';
    },
  },
  hygiene: {
    ok: () => true,
    carte: e => ({ texte: `Contrôle d’hygiène surprise ! Payer un nettoyage express (${prixNettoyage(e)} €), ou fermer une heure pour tout nettoyer ?`, options: ['Payer', 'Fermer 1 h'] }),
    choix: (e, k) => {
      if (k === 0 && e.argent >= prixNettoyage(e)) { depenser(e, prixNettoyage(e)); return 'Le nettoyage express est fait. Inspecteur satisfait.'; }
      e.evts.push({ id: 'nettoyage', nom: 'Fermé pour nettoyage', demande: 0, reste: 30 }); return 'Le café ferme une heure pour le grand ménage.';
    },
  },
  debauche: {
    ok: e => e.st[2].manager && (e.salaires[2] || 1) === 1,
    carte: () => ({ texte: 'CaféMax veut débaucher Lucas, ton barista ! Augmenter son salaire de 50 % pour le garder ?', options: ['Augmenter', 'Le laisser partir'] }),
    choix: (e, k) => {
      if (k === 0) { e.salaires[2] = 1.5; return 'Lucas reste, ravi de son augmentation.'; }
      e.st[2].manager = false; return 'Lucas est parti chez CaféMax. Il faudra réembaucher au bar.';
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
      depenser(e, M.maestro.prix / 2); e.machines[poste] = 'maestro'; e.calcaire[poste] = 0; return 'La Maestro Pro est installée !';
    },
  },
};
// Prévoit 2 décisions à des heures au hasard dans la journée
function planifierDecisions(e, rnd) {
  e.decisionsDuJour = [8 + rnd() * 4, 13 + rnd() * 4].map(h => ({ heure: h }));
}
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

// ---------- Avis clients : trois avis chaque soir, tirés de ce qui s'est vraiment passé ----------
export function genererAvis(e, b, rnd = Math.random) {
  const P = cibleReputation(e).parts, r = prixEffectif({ ...e, phase: 'service', horloge: 9 }) / prixJuste(e);
  const rupture = (b.moments || []).reduce((s, m) => s + (m.stock || 0), 0), boisson = BO[e.boisson], effetB = effetBoisson(e.boisson, e.meteo);
  const sujets = [];   // [poids (plus c'est marquant, plus c'est haut), étoiles, texte]
  const g = P.gout / 2.2;
  if (g > .7) sujets.push([g, 5, 'Un café incroyable, on sent la qualité du grain.']); else if (g < .35) sujets.push([1 - g, 2, 'Café plat et amer… le grain mériterait mieux.']); else sujets.push([.3, 4, 'Un bon petit café, sans chichis.']);
  if (e.service < .6) sujets.push([1.2 - e.service, 2, 'J’ai attendu une éternité pour un espresso.']); else if (e.service > .92) sujets.push([.5, 5, 'Service rapide et souriant !']);
  if (r > 1.12) sujets.push([r - .6, 2, 'Bon, mais bien trop cher pour ce que c’est.']); else if (r < .85) sujets.push([.6, 5, 'Pas cher du tout, j’adore !']);
  if (rupture > 20) sujets.push([1.4, 1, 'Plus de café… dans un café ! On est repartis.']);
  if (fraicheur(e, e.maison) < .9) sujets.push([1, 2, 'Le café avait un petit goût de rassis.']);
  if (Math.max(...e.calcaire) > .6) sujets.push([.9, 3, 'Un drôle d’arrière-goût de calcaire, non ?']);
  if (e.boisson !== 'aucune' && effetB > .05) sujets.push([.8, 5, `Le ${boisson.nom.toLowerCase()} du jour tombait à pic avec ce temps !`]);
  else if (e.boisson !== 'aucune' && effetB < -.02) sujets.push([.7, 3, `Un ${boisson.nom.toLowerCase()} par ce temps ? Drôle d’idée.`]);
  if (harmonie(e)) sujets.push([.55, 5, 'Quelle jolie salle, tout va bien ensemble.']); else if (P.deco < .2) sujets.push([.45, 3, 'La salle est un peu tristounette.']);
  if (e.dosage >= 10) sujets.push([.5, 5, 'Un café bien corsé, comme je l’aime.']); else if (e.dosage <= 7) sujets.push([.6, 2, 'Le café manque de corps, on dirait de l’eau.']);
  if (e.meteo === 'froid' && a(e, 'cheminee')) sujets.push([.7, 5, 'Se réchauffer près de la cheminée, le bonheur.']);
  sujets.sort((x, y) => y[0] - x[0]);
  const choisis = sujets.slice(0, 3);
  return choisis.map(([, etoiles, texte], k) => ({ nom: PRENOMS_AVIS[Math.floor(rnd() * PRENOMS_AVIS.length) % PRENOMS_AVIS.length], etoiles: Math.max(1, Math.min(5, etoiles + (k === 2 && rnd() < .3 ? -1 : 0))), texte }));
}

// ---------- Défi du jour ----------
export function tirerDefi(e, rnd = Math.random) {
  const hier = e.bilans.at(-1);
  if (!hier || e.jour < DEFIS.depuis) return null;
  const prime = Math.max(DEFIS.min, Math.round(hier.recettes * DEFIS.part));
  // nombres lisibles : 12 500, 340 K, 1,7 M
  const n = x => x < 1e5 ? Math.round(x).toLocaleString('fr-FR') : x < 1e6 ? Math.round(x / 1000) + ' K' : (x / 1e6).toFixed(1).replace('.', ',') + ' M';
  const types = [
    { id: 'tasses', cible: Math.ceil(hier.tasses * 1.15), texte: c => `Servir ${n(c)} tasses aujourd’hui` },
    { id: 'matin', cible: Math.ceil((hier.moments?.[0]?.ventes || hier.tasses * .3) * 1.2), texte: c => `Servir ${n(c)} tasses avant 11 h` },
    { id: 'sansRupture', cible: 1, texte: () => 'Ne jamais tomber à court de grains' },
    { id: 'benefice', cible: Math.ceil(Math.max(50, hier.benefice * 1.1)), texte: c => `Faire plus de ${n(c)}${c >= 1e5 ? '€' : ' €'} de bénéfice` },
  ];
  if (e.rep < 4.9) types.push({ id: 'reputation', cible: Math.min(5, Math.round((e.rep + .05) * 100) / 100), texte: c => `Finir la journée à ${String(c).replace('.', ',')} ★ ou plus` });
  const t = types[Math.min(types.length - 1, Math.floor(rnd() * types.length))];
  return { id: t.id, cible: t.cible, texte: t.texte(t.cible), progres: 0, prime, fini: false, rate: false };
}

// ---------- La journée et la nuit ----------
// 19 h : on ferme, on paie les charges, on fait le bilan. Gérard (s'il est là) commande pour demain.
function fermer(e, rnd = Math.random) {
  const c = chargesJour(e);
  e.argent -= c.total; e.journee.charges = c.total;
  const b = { jour: e.jour, recettes: e.journee.recettes, depenses: e.journee.depenses, charges: c.total, tasses: e.journee.tasses,
    benefice: e.journee.recettes - e.journee.depenses - c.total, detail: c, moments: e.journee.moments, heures: e.journee.heures };
  // Défi du jour : ceux qui se jugent le soir (bénéfice, sans rupture, réputation)
  if (e.defi && !e.defi.fini && !e.defi.rate) {
    const d = e.defi;
    const ok = d.id === 'benefice' ? b.benefice >= d.cible : d.id === 'sansRupture' ? true : d.id === 'reputation' ? e.rep >= d.cible : false;
    if (ok) { d.fini = true; e.argent += d.prime; } else d.rate = true;
  }
  if (e.defi) b.defi = { texte: e.defi.texte, reussi: e.defi.fini, prime: e.defi.prime };
  b.avis = genererAvis(e, b, rnd);
  // La nuit, les grains vieillissent (moitié moins vite dans la cave voûtée)
  for (const g of GRAINS) if (e.stock[g.id] > 0) e.age[g.id] = (e.age[g.id] || 0) + (a(e, 'entrepot') ? .5 : 1); else e.age[g.id] = 0;
  // Les machines s'entartrent (plus vite si elles sont peu fiables) ; Lucas détartre tout seul au-delà de 50 %
  // Prévision pour demain
  e.meteoDemain = tirerMeteo(rnd, e);
  e.machines.forEach((id, p) => {
    if (!id) return;
    e.calcaire[p] = Math.min(1, (e.calcaire[p] || 0) + CALCAIRE.parJour / Math.sqrt(M[id].fiabilite));
    if (e.st[2].manager && e.calcaire[p] >= CALCAIRE.seuilLucas) detartrer(e, p, true);
  });
  e.bilans = [...e.bilans.slice(-6), b];
  e.phase = 'nuit'; e.horloge = HORAIRES.fermeture; e.nuitReste = HORAIRES.nuit;
  e.rush = 0; e.evts = e.evts.filter(v => v.id === 'etudiants'); e.decision = null; e.decisionsDuJour = [];
  e.st.forEach(s => { s.panne = null; s.coup = 0; });
  e.stats.nuits++;
  if (e.st[0].manager) commandesDeGerard(e);
  return b;
}
// Gérard commande de quoi tenir une journée comme aujourd'hui, avec une marge
function commandesDeGerard(e) {
  const besoin = Math.max(2 * DOSES_SAC, e.journee.tasses * consoParTasse(e) * 1.3) - e.stock[e.maison];
  if (besoin > 0) {
    const sacs = Math.ceil(besoin / DOSES_SAC);
    if (typeof remplir(e, e.maison, true, sacs) !== 'number' && e.stock[e.maison] <= 0) {
      const repli = [...GRAINS].reverse().find(g => e.debloques.includes(g.id) && g.id !== e.maison && e.argent >= g.prixSac * SURCOUT_AUTO);
      if (repli) remplir(e, repli.id, true, sacs);
    }
  }
  if (aBuse(e)) {
    const laitBesoin = Math.max(LAIT.doses, e.journee.tasses * LAIT.part * 1.3) - e.lait;
    if (laitBesoin > 0) commanderLait(e, Math.ceil(laitBesoin / LAIT.doses), true);
  }
}
// 7 h : livraisons du matin (parfois en retard chez le grossiste), nouvelle journée
export function ouvrir(e, rnd = Math.random) {
  if (ouvert(e)) return [];
  const arrivees = [];
  for (const c of e.livraisonsMatin) {
    if (c.grain !== 'lait' && rnd() < F[e.fournisseur].retard) {
      e.commandes.push({ ...c, eta: 5 * HORAIRES.secondesParHeure }); arrivees.push({ retard: c });
    } else {
      if (c.grain === 'lait') { e.lait += c.sacs * LAIT.doses; e.laitVide = false; } else ajouterStock(e, c.grain, c.sacs * DOSES_SAC);
      arrivees.push({ livraison: c });
    }
  }
  e.livraisonsMatin = [];
  e.phase = 'service'; e.horloge = HORAIRES.ouverture; e.nuitReste = 0; e.jour++;
  // La prévision se réalise 4 fois sur 5
  const prevue = e.meteoDemain || 'nuages'; e.meteo = rnd() < FIABILITE_PREVISION ? prevue : tirerMeteo(rnd, e);
  if (e.meteo !== prevue) arrivees.push({ surpriseMeteo: { prevue, reelle: e.meteo } });
  e.journee = nouvelleJournee();
  planifierDecisions(e, rnd);
  e.defi = tirerDefi(e, rnd);
  arrivees.push({ ouverture: e.jour });
  return arrivees;
}

export function tick(e, dt, rnd = Math.random) {
  const arrivees = [];
  // ---- La nuit : rien ne se vend, on gère. Le café rouvre tout seul au bout d'une minute.
  if (!ouvert(e)) {
    e.nuitReste -= dt;
    if (e.nuitReste <= 0) arrivees.push(...ouvrir(e, rnd));
    return { ...bilan(e), recette: 0, arrivees };
  }
  e.rush = Math.max(0, e.rush - dt); e.rushRecharge = Math.max(0, e.rushRecharge - dt);
  for (const s of e.st) {
    s.coup = Math.max(0, s.coup - dt);
    if (s.panne && s.manager) { s.panne.auto -= dt; if (s.panne.auto <= 0) s.panne = null; }
  }
  e.evts.forEach(v => v.reste -= dt); e.evts = e.evts.filter(v => v.reste > 0);
  e.commandes.forEach(c => c.eta -= dt);
  e.commandes = e.commandes.filter(c => {
    if (c.eta > 0) return true;
    if (c.grain === 'lait') { e.lait += c.sacs * LAIT.doses; e.laitVide = false; } else ajouterStock(e, c.grain, c.sacs * DOSES_SAC);
    arrivees.push({ livraison: c }); return false;
  });
  // Gérard dépanne en urgence si la réserve est presque vide et que rien n'arrive
  const grainsEnRoute = e.commandes.some(c => c.grain !== 'lait');
  const parHeure = bilan(e).ventes * consoParTasse(e) * HORAIRES.secondesParHeure;
  if (e.st[0].manager && e.stock[e.maison] < Math.max(.5 * DOSES_SAC, parHeure * 2) && !grainsEnRoute) {
    // Gérard anticipe : dès qu'il reste moins de 2 h de stock, il appelle le grossiste (×2) pour 4 h
    const place = Math.floor((capaciteReserve(e) - totalStock(e)) / DOSES_SAC + 1e-6);
    const payable = Math.floor(e.argent / (G[e.maison].prixSac * URGENCE.mult));
    const sacs = Math.min(Math.max(1, Math.ceil(parHeure * 4 / DOSES_SAC)), place, payable);
    if (sacs >= 1) commanderUrgence(e, e.maison, sacs, true);
  }
  // Filets de sécurité : bascule sur un grain en stock, et mamie dépanne si tout est vide
  if (e.stock[e.maison] <= 0) { const autre = [...GRAINS].reverse().find(g => e.stock[g.id] > 0); if (autre) { e.maison = autre.id; arrivees.push({ repli: autre.id }); } }
  const toutVide = Object.values(e.stock).every(v => v <= 0) && !e.commandes.some(c => c.grain !== 'lait');
  if (toutVide && e.argent < G.premier.prixSac * URGENCE.mult) { ajouterStock(e, 'premier', DOSES_SAC); e.maison = 'premier'; arrivees.push({ cadeau: true }); }

  const b = bilan(e);
  // chaque tasse prend un peu plus (ou moins) qu'une dose selon le dosage choisi
  const k = consoParTasse(e), ventes = Math.min(b.ventes * dt, e.stock[e.maison] / k);
  e.stock[e.maison] = Math.max(0, e.stock[e.maison] - ventes * k);
  if (menuLait(e)) {
    e.lait = Math.max(0, e.lait - ventes * LAIT.part);
    if (e.lait <= 0 && !e.laitVide) { e.laitVide = true; arrivees.push({ plusDeLait: true }); }
  }
  const recette = ventes * panier(e);
  e.argent += recette; e.totalRun += recette; e.meta.totalGagne += recette; e.meta.tasses += ventes;
  e.journee.recettes += recette; e.journee.tasses += ventes;
  // Statistiques du moment : ce qui a limité les ventes (pour le planning des renforts)
  const hr = e.journee.heures?.[Math.max(0, Math.min(e.journee.heures.length - 1, Math.floor(e.horloge - HORAIRES.ouverture)))];
  if (hr) { hr.ventes += ventes; hr.recettes += recette; if (b.goulot.type === 'station') hr.station += dt; else if (b.goulot.type === 'clients') hr.clients += dt; else if (b.goulot.type === 'stock') hr.stock += dt; }
  const mo = e.journee.moments?.[momentIndex(e)];
  if (mo) {
    mo.t += dt; mo.ventes += ventes;
    if (b.goulot.type === 'station') { mo.station += dt; mo.stations[b.goulot.i] += dt; }
    else if (b.goulot.type === 'clients') mo.clients += dt; else if (b.goulot.type === 'stock') mo.stock += dt;
  }
  if (e.stock[e.maison] <= 0) { if (e.ruptureDepuis === 0) e.rupturesVues++; e.ruptureDepuis += dt; } else e.ruptureDepuis = 0;
  // Défi du jour : suivi en direct
  const d = e.defi;
  if (d && !d.fini && !d.rate) {
    if (d.id === 'tasses') d.progres = e.journee.tasses;
    if (d.id === 'matin') { d.progres = e.journee.moments[0].ventes; if (e.horloge >= MOMENTS[0].a && d.progres < d.cible) d.rate = true; }
    if (d.id === 'sansRupture' && e.ruptureDepuis > 0) d.rate = true;
    if ((d.id === 'tasses' || d.id === 'matin') && d.progres >= d.cible) { d.fini = true; e.argent += d.prime; arrivees.push({ defiReussi: d }); }
    if (d.rate) arrivees.push({ defiRate: d });
  }

  // Service : la part des clients servis sans trop attendre (moyenne glissante). Si l'équipe ne suit pas, la note baisse.
  // (les clients acceptent d'attendre un peu : on compte servis ceux qu'on sert jusqu'à 1,6 fois la capacité)
  if (b.demande > 0) e.service += (Math.min(1, b.chaine * 1.6 / b.demande) - e.service) * Math.min(1, dt * .02);
  // Réputation : tend lentement vers une cible
  e.rep += (cibleReputation(e).total - e.rep) * Math.min(1, .0018 * dt);
  for (const g of GRAINS) if (e.rep >= g.rep && !e.debloques.includes(g.id)) { e.debloques.push(g.id); arrivees.push({ debloque: g.id }); }

  // Décisions : une carte à l'heure prévue ; sans réponse, on refuse
  if (e.decision) { e.decision.reste -= dt; if (e.decision.reste <= 0) arrivees.push({ decisionAuto: choisirDecision(e, 1) }); }
  else if (e.decisionsDuJour.length && e.horloge >= e.decisionsDuJour[0].heure) { e.decisionsDuJour.shift(); const d = proposerDecision(e, rnd); if (d) arrivees.push({ decision: d }); }

  // L'horloge avance ; à 19 h, le café ferme
  e.horloge += dt / HORAIRES.secondesParHeure;
  if (e.horloge >= HORAIRES.fermeture) arrivees.push({ fermeture: fermer(e, rnd) });
  return { ...b, recette, arrivees };
}

// Temps passé hors du jeu : on simule par pas, sans pannes ni événements (les décisions sont refusées)
export function simulerAbsence(e, secondes, pas = 5, rnd = Math.random) {
  const avant = e.argent, tasses = e.meta.tasses, jour = e.jour;
  e.evts = e.evts.filter(v => v.id === 'etudiants'); e.rush = 0;
  for (let t = 0; t < secondes; t += pas) tick(e, Math.min(pas, secondes - t), rnd);
  return { gain: e.argent - avant, tasses: e.meta.tasses - tasses, secondes, jours: e.jour - jour, vide: e.stock[e.maison] <= 0 };
}

// ---------- Succès et histoire ----------
const TESTS_SUCCES = {
  premierCafe: e => e.meta.tasses >= 1, habitues: e => e.meta.tasses >= 100, milleTasses: e => e.meta.tasses >= 1000, centMille: e => e.meta.tasses >= 1e5,
  caisse1k: e => e.meta.totalGagne >= 1e3, caisse100k: e => e.meta.totalGagne >= 1e5, caisse10M: e => e.meta.totalGagne >= 1e7,
  travaux5: e => e.achats.length >= 5, toutNeuf: e => e.achats.length >= TRAVAUX.length, equipe: e => e.st.every(s => s.manager),
  etoiles3: e => e.rep >= 3, etoiles5: e => e.rep >= 4.8, fineBouche: e => e.maison === 'bourbon' && e.stock.bourbon > 0,
  reparateur: e => e.meta.reparations >= 10, critique: e => e.meta.critiques >= 1, franchise: e => e.meta.franchises >= 1,
  quartier: e => HABITUES.every(h => (e.meta.habitues[h.id] || 0) > 0),
  geisha: e => e.maison === 'geisha' && e.stock.geisha > 0, atelier5: e => AMELIORATIONS.some(x => niv(e, x.id) >= 5),
  atelierMax: e => AMELIORATIONS.every(x => niv(e, x.id) >= 8), etage: e => a(e, 'etage'), celeste: e => e.machines.includes('celeste'),
};
export function verifierSucces(e) {
  const nouveaux = SUCCES.filter(s => !e.meta.succes.includes(s.id) && TESTS_SUCCES[s.id](e));
  nouveaux.forEach(s => e.meta.succes.push(s.id));
  return nouveaux;
}
const TESTS_HISTOIRE = {
  intro: () => true, premierManager: e => e.st.some(s => s.manager), premiereRupture: e => e.rupturesVues > 0,
  etoiles3: e => e.rep >= 3, cloison: e => a(e, 'agrandir'), cafemax: e => e.meta.totalGagne >= SEUIL_CAFEMAX,
  terrasse: e => a(e, 'terrasse'), atelier: e => e.stats.nuits >= 3, etage: e => a(e, 'etage'), franchisePossible: e => peutFranchiser(e),
};
export function verifierHistoire(e) {
  const h = HISTOIRE.find(m => !e.meta.histoire.includes(m.id) && TESTS_HISTOIRE[m.id](e));
  if (h) e.meta.histoire.push(h.id);
  return h || null;   // un seul message à la fois
}

// ---------- Habitués ----------
export const habituesDisponibles = e => HABITUES.filter(h => e.rep >= h.repMin);
export function choisirHabitue(e, rnd) {
  const liste = habituesDisponibles(e);
  return liste.length ? liste[Math.min(liste.length - 1, Math.floor(rnd * liste.length))] : null;
}
// Un habitué est servi : il laisse un pourboire (s'il reste du café) et on compte sa visite
export function servirHabitue(e, id) {
  if (e.stock[e.maison] <= 0 || !ouvert(e)) return 0;
  const pourboire = POURBOIRE * panier(e);
  e.argent += pourboire; e.totalRun += pourboire; e.meta.totalGagne += pourboire; e.journee.recettes += pourboire;
  e.meta.habitues[id] = (e.meta.habitues[id] || 0) + 1;
  return pourboire;
}

// ---------- Objectifs de mamie ----------
const TESTS_OBJECTIFS = {
  aider: e => e.stats.coups >= 1, former: e => e.st[2].niv >= 2, journal: e => e.stats.nuits >= 1,
  commande: e => e.stats.commandes >= 1 || e.st[0].manager,
  peinture: e => a(e, 'peinture'), gerard: e => e.st[0].manager, machine: e => machinesInstallees(e).some(m => m.id !== 'occasion'),
  deuxEtoiles: e => e.rep >= 2, reparer: e => e.meta.reparations >= 1, arabica: e => ['arabica', 'moka', 'bourbon', 'geisha'].includes(e.maison),
  quatreTables: e => a(e, 'table4'), equipe: e => e.st.every(s => s.manager), cloison: e => a(e, 'agrandir'),
  pro: e => machinesInstallees(e).some(m => m.prix >= 12000), terrasse: e => a(e, 'terrasse'),
  atelier5: e => AMELIORATIONS.some(x => niv(e, x.id) >= 5), geisha: e => e.maison === 'geisha', etage: e => a(e, 'etage'), franchise: () => false,
};
export const objectifActuel = e => OBJECTIFS[e.objectif] || null;
export const primeObjectif = (e, o) => Math.round(o.prime * (1 + .5 * e.meta.etoilesF));
export function verifierObjectif(e) {
  const o = objectifActuel(e);
  if (!o || !TESTS_OBJECTIFS[o.id](e)) return null;
  const prime = primeObjectif(e, o);
  e.argent += prime; e.objectif++;
  return { ...o, prime };
}

// ---------- Franchise (prestige) ----------
export const etoilesFranchise = e => Math.floor(Math.sqrt(e.totalRun / 150000));
export const peutFranchiser = e => e.totalRun >= SEUIL_FRANCHISE;
export const nomVille = e => VILLES[e.meta.ville % VILLES.length];
// ---------- Héritage (dépenser les étoiles de franchise) ----------
const HE = Object.fromEntries(HERITAGE.map(x => [x.id, x]));
export const etoilesDispo = m => m.etoilesF - (m.etoilesDepensees || 0);
export const coutHeritage = (m, id) => HE[id].cout * ((m.heritage?.[id] || 0) + 1);
export function acheterHeritage(e, id) {
  const x = HE[id], m = e.meta; if (!x) return 'indispo';
  m.heritage = m.heritage || {};
  if ((m.heritage[id] || 0) >= x.max) return 'max';
  const c = coutHeritage(m, id); if (etoilesDispo(m) < c) return 'etoiles';
  m.etoilesDepensees = (m.etoilesDepensees || 0) + c; m.heritage[id] = (m.heritage[id] || 0) + 1;
  return 'ok';
}
// On choisit la ville du prochain café ; l'ancien rejoint le réseau (souvenir et statistiques dans le carnet)
export function franchiser(e, ville = (e.meta.ville + 1) % VILLES.length) {
  if (!peutFranchiser(e)) return null;
  const b = e.bilans.at(-1);
  const reseau = [...(e.meta.reseau || []), { ville: nomVille(e), jours: e.jour, gagne: Math.round(e.totalRun), recettes: Math.round(b?.recettes || 0), rep: Math.round(e.rep * 10) / 10 }];
  const meta = { ...e.meta, franchises: e.meta.franchises + 1, etoilesF: e.meta.etoilesF + etoilesFranchise(e), ville, reseau };
  return nouvelEtat(meta);
}
