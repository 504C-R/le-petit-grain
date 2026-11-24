// Données du jeu : grains, stations, travaux, succès, histoire. Aucune logique ici.

export const DOSES_SAC = 50;          // tasses par sac de grain
export const DELAI_LIVRAISON = 6;     // secondes (livraisons d’urgence : voir URGENCE)
export const SURCOUT_AUTO = 1.1;      // Gérard commande avec 10 % de frais
export const ABSENCE_MAX = 2 * 3600;  // gains hors ligne plafonnés à 2 h
export const SEUIL_FRANCHISE = 1500000;
// Réserve : quelques sacs de base, plus de quoi tenir une journée au rythme de la livraison.
// place (sacs) = base + sacs des travaux + débit max de la livraison × durée d'une journée × coef / 50
export const RESERVE = { base: 6, coef: .8 };
// Fraîcheur : un grain garde tout son goût 2 jours, puis perd 7 % par jour (jusqu'à −45 %). La cave voûtée ralentit le vieillissement de moitié.
export const FRAICHEUR = { jours: 2, perte: .07, min: .55 };
// Renforts : des extras embauchés pour un moment de la journée (matin, midi…). Chacun ajoute 30 % de débit à toutes les stations pendant ce moment.
// Coût de chacun : 2 % des recettes moyennes des derniers jours (au moins 6 €), payé à la fermeture.
export const RENFORTS = { max: 3, gain: .3, part: .02, min: 6 };
// Tarifs par moment : le prix de base × un coefficient (par exemple ×1,15 au rush du matin, ×0,85 l'après-midi)
export const TARIFS = { min: .7, max: 1.4, pas: .05 };
// Météo du jour : elle change l'affluence (surtout en terrasse). La prévision du soir est juste 4 fois sur 5.
export const METEOS = [
  { id: 'soleil', nom: 'Grand soleil', icone: '☀️', demande: 1.08, terrasse: 1.15, poids: 3 },
  { id: 'nuages', nom: 'Nuageux', icone: '⛅', demande: 1, terrasse: 1, poids: 3 },
  { id: 'pluie', nom: 'Pluie', icone: '🌧️', demande: .95, terrasse: .75, poids: 2 },
  { id: 'chaleur', nom: 'Canicule', icone: '🥵', demande: .95, terrasse: 1.2, poids: 1 },
  { id: 'froid', nom: 'Froid et neige', icone: '❄️', demande: .9, terrasse: .6, poids: 1 },
];
export const FIABILITE_PREVISION = .8;
// Formules : une offre par moment de la journée, activée le soir dans le Planning. Elle attire du monde (demande)
// et fait dépenser plus (panier), mais coûte des ingrédients (cout, part du panier) et une mise en place chaque jour.
export const FORMULES = [
  { id: 'petitdej', nom: 'Formule petit-déj', icone: '🥐', moment: 0, demande: .15, panier: .14, cout: .06, req: ['vitrine'], desc: 'Croissant + café, pour les pressés du matin.' },
  { id: 'dejeuner', nom: 'Formule déjeuner', icone: '🥪', moment: 1, demande: .28, panier: .4, cout: .17, req: ['cuisine'], desc: 'Sandwich maison, dessert et café.' },
  { id: 'gouter', nom: 'Goûter maison', icone: '🍰', moment: 2, demande: .3, panier: .16, cout: .08, req: ['cuisine'], desc: 'Les gâteaux de mamie pour réveiller le creux de l’après-midi.' },
  { id: 'afterwork', nom: 'Afterwork gourmand', icone: '🍪', moment: 3, demande: .2, panier: .15, cout: .07, req: ['cuisine'], rep: 3, desc: 'Café gourmand et chocolat viennois en sortant du bureau.' },
];
export const MISE_EN_PLACE = { part: .008, min: 5 };   // par formule active et par jour, en part des recettes moyennes
// Défi du jour : un objectif tiré chaque matin (à partir du 3e jour), récompensé par une prime (part des recettes d'hier)
export const DEFIS = { part: .12, min: 30, depuis: 3 };
// Décoration au choix (après le coup de peinture) : couleur des murs et sol. Un mur et un sol du même style s'accordent :
// +0,15 ★ et +4 % de clients. Changer coûte le prix indiqué (le premier choix de chaque est gratuit).
export const STYLES = { chaleureux: 'Chaleureux', nature: 'Nature', moderne: 'Moderne', retro: 'Rétro' };
export const HARMONIE = { etoiles: .15, clients: .04 };
export const MURS = [
  { id: 'creme', nom: 'Crème vanille', c1: '#F7E9D7', c2: '#F0DCC4', plinthe: 0xC8874A, style: 'chaleureux', prix: 0 },
  { id: 'sauge', nom: 'Vert sauge', c1: '#DCE6D5', c2: '#CCDAC3', plinthe: 0x6F8B6B, style: 'nature', prix: 250 },
  { id: 'terracotta', nom: 'Terracotta', c1: '#EDC3A6', c2: '#E3B091', plinthe: 0xA86A33, style: 'chaleureux', prix: 500 },
  { id: 'rose', nom: 'Rose poudré', c1: '#F3D9D6', c2: '#EACAC5', plinthe: 0x9C6B8E, style: 'retro', prix: 800 },
  { id: 'bleu', nom: 'Bleu de Prusse', c1: '#4A6580', c2: '#425B74', plinthe: 0x2E2A2A, style: 'moderne', prix: 2200, rep: 2.5 },
  { id: 'brique', nom: 'Briques apparentes', motif: 'brique', c1: '#B86A4B', c2: '#E8D8C8', plinthe: 0x4A2E1F, style: 'moderne', prix: 6000, rep: 3.2 },
  { id: 'boiserie', nom: 'Boiseries anciennes', motif: 'boiserie', c1: '#9A6A45', c2: '#B5835A', plinthe: 0x4A2E1F, style: 'retro', prix: 15000, rep: 3.8 },
  { id: 'jungle', nom: 'Papier peint jungle', motif: 'jungle', c1: '#2F4F3E', c2: '#6F9B6B', plinthe: 0x2F4F3E, style: 'nature', prix: 30000, rep: 4.2 },
];
export const SOLS = [
  { id: 'parquet', nom: 'Parquet miel', motif: 'lames', c1: '#D7B089', c2: '#CFA67C', style: 'chaleureux', prix: 0 },
  { id: 'chene', nom: 'Chêne fumé', motif: 'lames', c1: '#8C6A50', c2: '#80604A', style: 'moderne', prix: 900 },
  { id: 'tomettes', nom: 'Tomettes provençales', motif: 'tomettes', c1: '#C9694F', c2: '#B95E45', style: 'nature', prix: 1600 },
  { id: 'damier', nom: 'Damier noir et blanc', motif: 'damier', c1: '#F4EFE6', c2: '#3A3333', style: 'retro', prix: 2800 },
  { id: 'beton', nom: 'Béton ciré', motif: 'beton', c1: '#B8B2AA', c2: '#A9A39B', style: 'moderne', prix: 5000, rep: 3 },
  { id: 'terrazzo', nom: 'Terrazzo', motif: 'terrazzo', c1: '#EFE6DA', c2: '#C9694F', style: 'retro', prix: 12000, rep: 3.6 },
  { id: 'mosaique', nom: 'Mosaïque vert d’eau', motif: 'damier', c1: '#CFE3DC', c2: '#9CC5B9', style: 'nature', prix: 20000, rep: 4 },
];
// Boisson du jour, choisie le soir : chaque client dépense plus (ou moins) selon la météo ; « cout » = part du panier en ingrédients
export const BOISSONS = [
  { id: 'aucune', nom: 'Rien de spécial', icone: '☕', cout: 0, bonus: {}, rep: 0 },
  { id: 'chocolat', nom: 'Chocolat chaud', icone: '🍫', cout: .07, bonus: { froid: .25, pluie: .14, nuages: .06, soleil: -.02, chaleur: -.08 }, rep: 1.5 },
  { id: 'coldbrew', nom: 'Cold brew glacé', icone: '🧊', cout: .08, bonus: { chaleur: .26, soleil: .14, nuages: .04, pluie: -.03, froid: -.08 }, rep: 1.8 },
  { id: 'the', nom: 'Thé chaï épicé', icone: '🫖', cout: .05, bonus: { pluie: .11, nuages: .1, froid: .09, soleil: .02, chaleur: -.05 }, rep: 2.2 },
];
// Calcaire : chaque machine s'entartre un peu chaque jour (plus vite si elle est peu fiable).
// À 100 % : −20 % de goût pour cette machine et des pannes 45 % plus fréquentes. On détartre le soir (3 % du prix de la machine, au moins 10 €).
export const CALCAIRE = { parJour: .12, gout: .2, pannes: .45, prix: .03, min: 10, seuilLucas: .5 };
export const SEUIL_CAFEMAX = 20000;
// Lait : un pack = 30 doses ; avec la buse, 40 % des clients prennent un cappuccino ou un latte (60 % plus cher)
export const LAIT = { prixPack: 12, doses: 100, part: .4, bonus: .6 };   // une caisse de lait = 100 doses

export const GRAINS = [
  { id: 'premier', nom: 'Robusta premier prix', court: 'Premier prix', q: .6, prixSac: 3, rep: 0 },
  { id: 'robusta', nom: 'Robusta du coin', court: 'Robusta', q: 1, prixSac: 6, rep: 1.5 },
  { id: 'arabica', nom: 'Arabica du Brésil', court: 'Arabica', q: 2, prixSac: 15, rep: 2.2 },
  { id: 'moka', nom: "Moka d'Éthiopie", court: 'Moka', q: 3, prixSac: 32, rep: 3.0 },
  { id: 'bourbon', nom: 'Bourbon pointu', court: 'Bourbon', q: 4.5, prixSac: 75, rep: 3.8 },
  { id: 'geisha', nom: 'Geisha du Panama', court: 'Geisha', q: 6.5, prixSac: 170, rep: 4.4 },
];
export const G = Object.fromEntries(GRAINS.map(g => [g.id, g]));

export const STATIONS = [
  { id: 'livraison', nom: 'Livraison de grains', court: 'Livraison', desc: 'Le coursier monte les sacs de la réserve.', base: .8, c0: 8, mgr: 60, mgrNom: 'Gérard', mgrTxt: 'remplit la réserve tout seul (+10 %)' },
  { id: 'moulin', nom: 'Moulin & torréfaction', court: 'Moulin', desc: 'Moudre (et plus tard torréfier) les grains.', base: .7, c0: 12, mgr: 160, mgrNom: 'Sofia', mgrTxt: 'répare les pannes du moulin' },
  { id: 'bar', nom: 'Bar à espresso', court: 'Bar', desc: 'Les machines et les baristas font les cafés.', base: .6, c0: 18, mgr: 400, mgrNom: 'Lucas', mgrTxt: 'répare les machines' },
  { id: 'salle', nom: 'Salle & service', court: 'Salle', desc: 'Servir, encaisser, et donner envie de revenir.', base: .9, c0: 25, mgr: 1000, mgrNom: 'Nadia', mgrTxt: 'fidélise les habitués' },
];

// ---------- La journée ----------
// Le café ouvre à 7 h et ferme à 19 h. Une heure de jeu dure 30 s : une journée fait 6 minutes.
// La nuit (60 s, ou moins si on ouvre plus tôt) sert à gérer : journal du soir, commandes, travaux.
export const HORAIRES = { ouverture: 7, fermeture: 19, secondesParHeure: 30, nuit: 60 };
// Affluence selon l’heure (1 = moyenne) : gros rush du matin, rush du midi, creux de l’après-midi
export const COURBE_HEURE = [[7, .6], [8, 2.1], [9, 1.4], [10, .8], [11, 1.0], [12, 1.9], [13, 1.7], [14, .8], [15, .45], [16, .6], [17, 1.0], [18, .9], [19, .5]];
export const MOMENTS = [
  { nom: 'Matin', de: 7, a: 11 }, { nom: 'Midi', de: 11, a: 14 }, { nom: 'Après-midi', de: 14, a: 17 }, { nom: 'Fin de journée', de: 17, a: 19 },
];
// En journée, on ne peut commander qu’en urgence au grossiste : deux fois plus cher, livré en 1 h
export const URGENCE = { mult: 2, delai: 30 };

// ---------- Le catalogue (on choisit le soir, dans le journal) ----------
// vitesse : tasses du bar ; qualite : goût ; fiabilite : plus c’est haut, moins ça tombe en panne
export const MACHINES = [
  { id: 'occasion', nom: 'Vieille machine d’occasion', desc: 'Celle de mamie. Lente, et elle tombe souvent en panne.', vitesse: .7, qualite: .85, fiabilite: .4, prix: 0, visuel: 'machine_occasion' },
  { id: 'compacta', nom: 'Compacta Mini', desc: 'Petite et increvable, pour sortir de la vieille machine à petit prix.', vitesse: .85, qualite: .95, fiabilite: 1.25, prix: 120, visuel: 'machine_neuve', teinte: 0xB9C4C9 },
  { id: 'bellacrema', nom: 'Bellacrema Uno', desc: 'Simple et fiable, un peu lente.', vitesse: 1.0, qualite: 1.0, fiabilite: 1.1, prix: 250, visuel: 'machine_neuve', teinte: 0x8FA98B },
  { id: 'turbo', nom: 'Turbo Espresso 2000', desc: 'Très rapide, mais capricieuse : pannes fréquentes.', vitesse: 1.8, qualite: .95, fiabilite: .45, prix: 900, visuel: 'machine_neuve', teinte: 0xD9695F },
  { id: 'vapore', nom: 'Vapore Duo', desc: 'Buse à lait intégrée : cappuccinos sans travaux.', vitesse: 1.25, qualite: 1.05, fiabilite: .85, prix: 1600, visuel: 'machine_neuve', teinte: 0xE8B54A, buse: true },
  { id: 'levier', nom: 'Leva Classica', desc: 'Machine à levier à l’italienne : un café sublime, mais lente et délicate.', vitesse: 1.15, qualite: 1.35, fiabilite: .75, prix: 4200, visuel: 'machine_levier', teinte: 0xD9695F, rep: 2.6 },
  { id: 'maestro', nom: 'Maestro Pro', desc: 'Rapide, fiable, un excellent café.', vitesse: 2.3, qualite: 1.2, fiabilite: 1.3, prix: 12000, visuel: 'machine_pro' },
  { id: 'lunaria', nom: 'Lunaria Triple', desc: 'Trois groupes, une bête de course. Exigeante en entretien.', vitesse: 3.6, qualite: 1.25, fiabilite: .9, prix: 70000, visuel: 'machine_pro', teinte: 0x2F4B6E, rep: 4 },
  { id: 'sirena', nom: 'Sirena Doppia Leva', desc: 'Le levier de compétition en laiton. Le meilleur goût du catalogue.', vitesse: 2.6, qualite: 1.62, fiabilite: 1.05, prix: 220000, visuel: 'machine_levier', teinte: 0x2E2A2A, rep: 4.3 },
  { id: 'celeste', nom: 'Céleste Atelier', desc: 'Faite main en Italie. La machine d’une vie.', vitesse: 4.8, qualite: 1.45, fiabilite: 1.5, prix: 450000, visuel: 'machine_pro', teinte: 0xE8B54A, rep: 4.4 },
  { id: 'robot', nom: 'Robo-Barista X1', desc: 'Un bras robot qui ne dort jamais. Une vitesse folle, un goût correct.', vitesse: 7.5, qualite: 1.15, fiabilite: .95, prix: 1800000, visuel: 'machine_robot', rep: 4.6 },
];
export const MOULINS = [
  { id: 'manivelle', nom: 'Moulin à manivelle', desc: 'À la force du poignet.', vitesse: 1, qualite: 1, fiabilite: .7, prix: 0, visuel: 'moulin_manuel' },
  { id: 'electrique', nom: 'Moulin électrique', desc: 'Rapide et pas cher.', vitesse: 1.6, qualite: 1.0, fiabilite: 1.0, prix: 120, visuel: 'moulin_electrique' },
  { id: 'coniques', nom: 'Moulin à meules coniques', desc: 'Mouture parfaite : meilleur goût, un peu moins rapide.', vitesse: 1.35, qualite: 1.15, fiabilite: 1.2, prix: 1100, visuel: 'moulin_electrique', teinte: 0x3E3A3A },
  { id: 'torrefacteur', nom: 'Torréfacteur en cuivre', desc: 'On torréfie sur place : rapide et délicieux.', vitesse: 2.5, qualite: 1.25, fiabilite: 1.0, prix: 10500, visuel: 'torrefacteur' },
  { id: 'precision', nom: 'Moulin de précision', desc: 'Réglage au micron : mouture parfaite et rapide.', vitesse: 2.1, qualite: 1.33, fiabilite: 1.25, prix: 32000, visuel: 'moulin_electrique', teinte: 0xC07A45, rep: 3.6 },
  { id: 'atelier', nom: 'Atelier de torréfaction', desc: 'Double tambour et moulin de compétition.', vitesse: 4, qualite: 1.4, fiabilite: 1.3, prix: 120000, visuel: 'torrefacteur', rep: 4.2 },
];
export const FOURNISSEURS = [
  { id: 'grossiste', nom: 'Grossiste du marché', desc: 'Pas cher, mais une livraison sur cinq arrive à midi.', prixMult: 1, qualite: 1, retard: .2, rep: 0 },
  { id: 'artisan', nom: 'Torréfacteur artisan', desc: 'Grains plus frais (+12 % de goût), 40 % plus chers, toujours à l’heure.', prixMult: 1.4, qualite: 1.12, retard: 0, rep: 2.5 },
  { id: 'importateur', nom: 'Importateur direct', desc: 'Achète aux fermes, sans intermédiaire : +22 % de goût, à peine plus cher.', prixMult: 1.2, qualite: 1.22, retard: .05, rep: 4.1 },
];
// Charges de chaque journée, payées à la fermeture
export const CHARGES = { loyer: 15, loyerAgrandi: 45, loyerTerrasse: 30, loyerEtage: 90, parPlace: 1.5, salaire: 1 / 8, entretien: .01 };

// Améliorations à niveaux (atelier du soir) : chaque niveau coûte plus cher que le précédent
// effet : ce que gagne chaque niveau ; cout0 × mult^niveau
export const AMELIORATIONS = [
  { id: 'pression', nom: 'Réglage de pression', icone: '⚙️', desc: 'Le bar va plus vite.', effet: .12, unite: 'vitesse du bar', cout0: 300, mult: 2.3, max: 12 },
  { id: 'meules', nom: 'Meules affûtées', icone: '🪨', desc: 'Le moulin va plus vite.', effet: .12, unite: 'vitesse du moulin', cout0: 220, mult: 2.3, max: 12 },
  { id: 'rayonnages', nom: 'Rayonnages', icone: '📦', desc: 'Plus de place dans la réserve.', effet: .15, unite: 'place en réserve', cout0: 150, mult: 2.1, max: 12 },
  { id: 'joints', nom: 'Joints et entretien', icone: '🔧', desc: 'Moins de pannes.', effet: .12, unite: 'temps entre deux pannes', cout0: 400, mult: 2.2, max: 10 },
  { id: 'recettes', nom: 'Carte des recettes', icone: '📜', desc: 'Meilleur goût, prix juste plus haut.', effet: .04, unite: 'goût', cout0: 900, mult: 2.4, max: 12, rep: 2.5 },
  { id: 'fidelite', nom: 'Carte de fidélité', icone: '💳', desc: 'Les clients reviennent plus souvent.', effet: .08, unite: 'clients', cout0: 700, mult: 2.4, max: 12, rep: 2 },
];

// Décisions : 2 par jour, avec un choix à faire (sans réponse au bout de 40 s, on refuse)
export const DUREE_DECISION = 40;

// Achats uniques, réalisés pendant la nuit (journal du soir), chacun visible dans la salle 3D
export const TRAVAUX = [
  { id: 'peinture', cat: 'Déco', nom: 'Coup de peinture', prix: 45, desc: 'Adieu les murs jaunis. +0,2 ★' },
  { id: 'table3', cat: 'Salle', nom: 'Une table de plus', prix: 70, desc: '+2 places : plus de clients.' },
  { id: 'palette', cat: 'Réserve', nom: 'Palette et étagères', prix: 90, desc: 'Réserve : +8 sacs, et +25 % de place.' },
  { id: 'plantes', cat: 'Déco', nom: 'Plantes vertes', prix: 140, req: ['peinture'], desc: 'Un peu de vert. +0,15 ★' },
  { id: 'table4', cat: 'Salle', nom: 'Encore une table', prix: 180, req: ['table3'], desc: '+2 places.' },
  { id: 'lampes', cat: 'Déco', nom: 'Suspensions dorées', prix: 320, req: ['peinture'], desc: 'Lumière chaude. +0,15 ★' },
  { id: 'ardoise', cat: 'Déco', nom: 'Ardoise du jour', prix: 250, req: ['peinture'], desc: 'Tes prix écrits à la craie : +0,1 ★ et +5 % de clients.' },
  { id: 'comptoir2', cat: 'Bar', nom: 'Rallonger le comptoir', prix: 1500, req: ['table3'], desc: 'Un 2e poste de machine (à équiper dans le catalogue).' },
  { id: 'buse', cat: 'Bar', nom: 'Buse à lait et nouveau menu', prix: 600, desc: 'Cappuccinos et lattes : 40 % des clients en prennent et paient 60 % de plus. Il faut du lait (Réserve).' },
  { id: 'vitrine', cat: 'Bar', nom: 'Vitrine à pâtisseries', prix: 1200, req: ['peinture'], desc: 'Croissants et cookies : chaque client dépense +20 %.' },
  { id: 'enseigne', cat: 'Déco', nom: 'Enseigne neuve', prix: 1800, req: ['peinture'], desc: 'On la voit de loin. +0,25 ★ et +10 % de clients.' },
  { id: 'arriere', cat: 'Réserve', nom: 'Arrière-boutique', prix: 3500, req: ['palette'], desc: 'Réserve : +30 sacs, et +40 % de place.' },
  { id: 'agrandir', cat: 'Agrandir', nom: 'Abattre la cloison', prix: 7500, req: ['table4'], desc: 'Le café double de surface : +25 % de clients, place pour 2 tables et un 3e poste de machine. Le loyer augmente.' },
  { id: 'table5', cat: 'Salle', nom: 'Table près de la fenêtre', prix: 450, req: ['agrandir'], desc: '+2 places.' },
  { id: 'table6', cat: 'Salle', nom: 'Grande table du fond', prix: 2250, req: ['table5'], desc: '+2 places.' },
  { id: 'terrasse', cat: 'Agrandir', nom: 'Terrasse', prix: 36000, req: ['agrandir'], desc: '2 tables au soleil (+4 places) et +40 % de clients. Le loyer augmente.' },
  { id: 'emporter', cat: 'Bar', nom: 'Fenêtre à emporter', prix: 9000, req: ['agrandir'], desc: 'Un guichet sur la rue pour les pressés : +15 % de clients.' },
  { id: 'entrepot', cat: 'Réserve', nom: 'Cave voûtée', prix: 22000, req: ['arriere'], desc: 'La vieille cave remise en état : +100 sacs, et +60 % de place.' },
  { id: 'fresque', cat: 'Déco', nom: 'Fresque de mamie', prix: 15000, req: ['enseigne'], desc: 'Un artiste peint mamie Odette sur le mur. +0,2 ★' },
  { id: 'velo', cat: 'Agrandir', nom: 'Livraison à vélo', prix: 55000, req: ['emporter'], desc: 'Karim et Yanis livrent le quartier : +20 % de clients.' },
  { id: 'boutique', cat: 'Bar', nom: 'Coin boutique', prix: 80000, req: ['vitrine', 'agrandir'], desc: 'Sachets de grains et tasses à vendre : chaque client dépense +15 %.' },
  { id: 'ecole', cat: 'Équipe', nom: 'École de barista', prix: 140000, req: ['terrasse'], desc: 'Tu formes toi-même : former l’équipe coûte 30 % de moins.' },
  { id: 'tapis', cat: 'Déco', nom: 'Grand tapis persan', prix: 900, req: ['peinture'], desc: 'Un tapis moelleux sous les tables. +0,1 ★' },
  { id: 'jukebox', cat: 'Déco', nom: 'Jukebox', prix: 6500, req: ['ardoise'], desc: 'De vieux tubes : +6 % de clients, et la musique se voit.' },
  { id: 'cheminee', cat: 'Confort', nom: 'Cheminée', prix: 12000, req: ['peinture'], desc: 'Un vrai feu de bois. +0,1 ★, et +30 % de clients les jours de froid.' },
  { id: 'clim', cat: 'Confort', nom: 'Ventilateurs et clim', prix: 18000, req: ['agrandir'], desc: 'Il fait frais chez toi : +25 % de clients les jours de canicule.' },
  { id: 'chauffages', cat: 'Confort', nom: 'Chauffages de terrasse', prix: 26000, req: ['terrasse'], desc: 'La terrasse reste pleine : la pluie et le froid la vident deux fois moins.' },
  { id: 'lustre', cat: 'Déco', nom: 'Lustre en laiton', prix: 48000, req: ['agrandir', 'lampes'], desc: 'Huit bougies qui brillent au-dessus de la salle. +0,15 ★' },
  { id: 'cuisine', cat: 'Bar', nom: 'Annexe-cuisine', prix: 20000, req: ['vitrine', 'agrandir'], desc: 'Une petite cuisine dans l’annexe : formules déjeuner, goûter et afterwork (onglet Planning).' },
  { id: 'etage', cat: 'Agrandir', nom: 'Salle à l’étage', prix: 320000, req: ['terrasse'], desc: 'On ouvre l’étage : +6 places et +35 % de clients. Le loyer augmente.' },
];
export const T = Object.fromEntries(TRAVAUX.map(t => [t.id, t]));

export const MOTS_TRAVAUX = {
  peinture: 'Monsieur Bernard a prêté ses rouleaux : les murs sont tout beaux !',
  comptoir2: 'Le comptoir s’allonge : de la place pour une deuxième machine !',
  agrandir: 'Boum ! La cloison est tombée : le café double de surface.',
  enseigne: "La nouvelle enseigne brille jusqu'au bout de la rue.",
  terrasse: 'La terrasse est ouverte : au soleil, même le robusta a bon goût.',
  buse: 'Un cappuccino avec un petit cœur dessiné dans la mousse… Tu as du talent !',
  vitrine: 'Mes croissants au beurre dans ta vitrine ? Les clients vont craquer.',
  ardoise: 'Une jolie ardoise, écrite à la craie. Ça fait tout de suite plus sérieux !',
  emporter: 'Un petit guichet sur la rue : les pressés n’ont même plus besoin d’entrer.',
  entrepot: 'La cave de grand-père ! Il y gardait ses bouteilles… maintenant, ce sera des sacs de café.',
  fresque: 'C’est moi, là, sur le mur ? Il m’a rajeunie de vingt ans, ce coquin.',
  velo: 'Karim et Yanis sont ravis : ils livrent tout le quartier à vélo.',
  boutique: 'Des sachets « Le Petit Grain » ! Les clients repartent avec un peu de chez nous.',
  ecole: 'Une école de barista. Tu vas transmettre ce que je t’ai appris… et bien plus.',
  etage: 'L’étage est ouvert ! Avant, j’y rangeais mes bocaux de confiture.',
  tapis: 'Le tapis de ma sœur Lucienne ! Il était au grenier depuis 1982.',
  jukebox: 'Mets-moi donc une petite chanson de Dalida…',
  cheminee: 'Un bon feu de bois : les jours de neige, tout le quartier viendra se réchauffer chez toi.',
  clim: 'Ouf, un peu de fraîcheur ! Les jours de canicule, on viendra se réfugier ici.',
  chauffages: 'Avec ces chauffages, même en hiver on prendra le café dehors.',
  lustre: 'Quel lustre ! On se croirait dans un grand café de Vienne.',
  cuisine: 'Une vraie cuisine ! Je te donnerai la recette de mon quatre-quarts.',
};

// Succès : chacun donne +2 % de clients, pour toujours (même après une franchise)
export const SUCCES = [
  { id: 'premierCafe', nom: 'Premier café', desc: 'Servir une première tasse.' },
  { id: 'habitues', nom: 'Les habitués', desc: 'Servir 100 tasses.' },
  { id: 'milleTasses', nom: 'Mille tasses', desc: 'Servir 1 000 tasses.' },
  { id: 'centMille', nom: 'Une rivière de café', desc: 'Servir 100 000 tasses.' },
  { id: 'caisse1k', nom: 'La caisse tinte', desc: 'Gagner 1 000 € au total.' },
  { id: 'caisse100k', nom: 'Belle affaire', desc: 'Gagner 100 000 € au total.' },
  { id: 'caisse10M', nom: 'Empire du café', desc: 'Gagner 10 M€ au total.' },
  { id: 'travaux5', nom: 'Bricoleur', desc: 'Faire 5 travaux.' },
  { id: 'toutNeuf', nom: 'Tout beau, tout neuf', desc: 'Faire tous les travaux.' },
  { id: 'equipe', nom: "L'équipe au complet", desc: 'Engager les 4 managers.' },
  { id: 'etoiles3', nom: 'Bonne adresse', desc: 'Atteindre 3 ★.' },
  { id: 'etoiles5', nom: 'Le meilleur café de la ville', desc: 'Atteindre 4,8 ★.' },
  { id: 'fineBouche', nom: 'Fine bouche', desc: 'Servir du Bourbon pointu.' },
  { id: 'reparateur', nom: 'Le roi de la clé à molette', desc: 'Réparer 10 pannes à la main.' },
  { id: 'critique', nom: 'Bonne presse', desc: 'Séduire Madame Lefèvre, la critique.' },
  { id: 'franchise', nom: 'Le Petit Grain voyage', desc: 'Ouvrir une première franchise.' },
  { id: 'quartier', nom: 'Tout le quartier', desc: 'Recevoir les 5 habitués.' },
  { id: 'geisha', nom: 'Le grain des rois', desc: 'Servir du Geisha du Panama.' },
  { id: 'atelier5', nom: 'Mécano', desc: 'Monter une amélioration au niveau 5.' },
  { id: 'atelierMax', nom: 'Tout réglé au millimètre', desc: 'Monter toutes les améliorations au niveau 8.' },
  { id: 'etage', nom: 'Deux étages de bonheur', desc: 'Ouvrir la salle à l’étage.' },
  { id: 'celeste', nom: 'La machine d’une vie', desc: 'Installer une Céleste Atelier.' },
];

// Récit minimal : un message de mamie aux grandes étapes
export const HISTOIRE = [
  { id: 'intro', titre: 'Les clés du Petit Grain', texte: "Voilà les clés, ma petite. Le Petit Grain n'est plus tout jeune : une vieille machine d'occasion, un moulin à manivelle, deux tables bancales et du robusta premier prix. Le café ouvre à 7 h et ferme à 19 h. Le soir, dans ton journal, tu commandes les grains pour le lendemain et tu choisis tes travaux. Je compte sur toi !" },
  { id: 'premierManager', titre: 'Le premier manager', texte: "Enfin quelqu'un pour m'aider… pardon, pour T'aider ! Un manager fait tourner sa station à fond, même quand tu n'es pas là." },
  { id: 'premiereRupture', titre: 'La panne sèche', texte: "Un café sans grains, c'est une église sans cloches ! Garde un œil sur la réserve, ou engage Gérard à la livraison." },
  { id: 'etoiles3', titre: 'Le club de pétanque', texte: 'Monsieur Bernard ramène tous ses copains du club de pétanque. Trois étoiles, ça se fête !' },
  { id: 'cloison', titre: 'La cloison de grand-père', texte: "La cloison est tombée. Ton grand-père l'avait montée en 1974 « provisoirement »… Il serait fier de toi." },
  { id: 'cafemax', titre: 'CaféMax ouvre en face', texte: 'Oh non… CaféMax ouvre en face, avec ses gobelets beiges. Ils vont lancer des promos. Ne te laisse pas faire !' },
  { id: 'terrasse', titre: 'La terrasse', texte: 'Une terrasse ! Je viendrai y lire mon journal tous les matins, réserve-moi la table au soleil.' },
  { id: 'atelier', titre: 'Le carnet de grand-père', texte: 'J’ai retrouvé le carnet de grand-père : tous ses petits réglages pour la machine et le moulin. Regarde « Atelier » dans le journal du soir : chaque réglage se monte niveau par niveau.' },
  { id: 'etage', titre: 'L’étage', texte: 'Deux étages de café… Ton grand-père n’en revenait pas quand on a ouvert la terrasse. Alors ça !' },
  { id: 'franchisePossible', titre: 'Et si on voyait plus grand ?', texte: "Ma petite, le Petit Grain est devenu une institution. Il est temps d'en ouvrir un deuxième, ailleurs ! Ouvre le carnet et touche « Franchiser »." },
];

// Les habitués : ils reviennent, on les reconnaît à leurs accessoires, et ils laissent un pourboire
export const HABITUES = [
  { id: 'bernard', nom: 'Monsieur Bernard', accessoire: 'beret', habit: 0x6E86A8, cheveux: 0xE9E1DA, peau: 0xF2C9A5, repMin: 0,
    phrases: ['Comme d’habitude, un petit noir !', 'Ah, ça me rappelle le café de 1987…', 'Votre grand-mère serait fière.'] },
  { id: 'ines', nom: 'Inès', accessoire: 'casque', habit: 0xB48EC9, cheveux: 0x2B1B12, peau: 0xC99A78, repMin: 1.6,
    phrases: ['Un allongé, j’ai un partiel demain…', 'Le wifi marche aujourd’hui ?', 'Je révise mieux ici qu’à la BU !'] },
  { id: 'karim', nom: 'Karim', accessoire: 'velo', habit: 0xE59A6B, cheveux: 0x1E1E1E, peau: 0x9C6B4A, repMin: 2.2,
    phrases: ['Un café à emporter, je suis en retard !', 'Trois livraisons et une pause café.', 'Yanis arrive, il paie le sien !'] },
  { id: 'yanis', nom: 'Yanis', accessoire: 'velo', habit: 0x5E9CA0, cheveux: 0x1E1E1E, peau: 0x9C6B4A, repMin: 2.2,
    phrases: ['Karim a dit que tu payais, non ?', 'Le meilleur café du quartier, sans hésiter.', 'Vite, vite, la course n’attend pas !'] },
  { id: 'lefevre', nom: 'Madame Lefèvre', accessoire: 'lunettes', habit: 0x4A2E1F, cheveux: 0x8A4B2B, peau: 0xF5D3B8, repMin: 3.2,
    phrases: ['Hmm. L’acidité est… intéressante.', 'Je ne suis pas là pour la critique. Officiellement.', 'Notez que je reviens. C’est un compliment.'] },
];
export const POURBOIRE = 20;   // un habitué laisse l'équivalent de 20 tasses

// Objectifs de mamie : un à la fois, ils guident le joueur et rapportent une petite prime
export const OBJECTIFS = [
  { id: 'aider', texte: 'Touche le bar pour donner un coup de main', prime: 10 },
  { id: 'former', texte: "Forme l'équipe du bar (niveau 2)", prime: 15 },
  { id: 'journal', texte: 'Tiens jusqu’à 19 h : le soir, le journal s’ouvre', prime: 15 },
  { id: 'commande', texte: 'Commande des grains pour demain (journal du soir)', prime: 15 },
  { id: 'peinture', texte: 'Fais un coup de peinture (journal du soir)', prime: 30 },
  { id: 'gerard', texte: 'Engage Gérard à la livraison', prime: 40 },
  { id: 'machine', texte: 'Achète une machine neuve (catalogue du soir)', prime: 60 },
  { id: 'deuxEtoiles', texte: 'Atteins 2 ★ de réputation', prime: 120 },
  { id: 'reparer', texte: 'Répare une panne à la main', prime: 150 },
  { id: 'arabica', texte: "Sers de l'arabica", prime: 300 },
  { id: 'quatreTables', texte: 'Installe 4 tables', prime: 400 },
  { id: 'equipe', texte: 'Engage les 4 managers', prime: 1500 },
  { id: 'cloison', texte: 'Abats la cloison', prime: 3000 },
  { id: 'pro', texte: 'Installe une machine pro (Maestro ou mieux)', prime: 8000 },
  { id: 'terrasse', texte: 'Ouvre la terrasse', prime: 15000 },
  { id: 'atelier5', texte: 'Monte une amélioration au niveau 5 (Atelier du soir)', prime: 20000 },
  { id: 'geisha', texte: 'Sers du Geisha du Panama', prime: 40000 },
  { id: 'etage', texte: 'Ouvre la salle à l’étage', prime: 80000 },
  { id: 'franchise', texte: 'Gagne 1,5 M€ ici, puis franchise le Petit Grain (Carnet)', prime: 0 },
];

export const VILLES = ['Lyon', 'Bordeaux', 'Lille', 'Marseille', 'Nantes', 'Toulouse', 'Strasbourg', 'Paris'];
// Chaque ville a son caractère : météo (poids qui remplacent ceux de METEOS), loyer, affluence, prix acceptés (× prix juste),
// terrasse (× son bonus), CaféMax déjà installé, et son décor (monument au loin, teinte du ciel et du trottoir).
export const INFOS_VILLES = {
  Lyon: { desc: 'La ville de mamie : un quartier calme et une météo de saison.', meteo: {}, loyer: 1, demande: 1, prix: 1, monument: 'fourviere', ciel: 0xEFDDC8, trottoir: 0xFFFFFF },
  Bordeaux: { desc: 'Ville de gourmets : on paie volontiers un bon café, mais le loyer est cher.', meteo: { soleil: 4, froid: .5 }, loyer: 1.4, demande: 1, prix: 1.2, monument: 'pont', ciel: 0xF2E2C6, trottoir: 0xF4EBDA },
  Lille: { desc: 'Pluie et grisaille : on se réfugie au café. Loyer doux, clients attentifs aux prix.', meteo: { pluie: 5, froid: 2, nuages: 4, soleil: 1, chaleur: 0 }, loyer: .8, demande: 1.12, prix: .88, monument: 'beffroi', ciel: 0xD9D6D8, trottoir: 0xD8D2CC },
  Marseille: { desc: 'Soleil et chaleur : la terrasse est reine (+25 %), le cold brew aussi.', meteo: { soleil: 5, chaleur: 3, pluie: .5, froid: 0 }, loyer: 1, demande: 1.05, prix: 1, terrasse: 1.25, monument: 'bonnemere', ciel: 0xF6E3C2, trottoir: 0xFFF6E8 },
  Nantes: { desc: 'Un temps changeant et des étudiants partout : plus de monde, des prix serrés.', meteo: { nuages: 4, pluie: 3 }, loyer: .95, demande: 1.18, prix: .88, monument: 'chateau', ciel: 0xE4E0D8, trottoir: 0xE6E0D8 },
  Toulouse: { desc: 'La ville rose : de la chaleur et une clientèle fidèle.', meteo: { soleil: 4, chaleur: 2, froid: .5 }, loyer: 1.05, demande: 1.05, prix: 1.05, monument: 'capitole', ciel: 0xF3D9CC, trottoir: 0xF2D8CC },
  Strasbourg: { desc: 'Hivers glacés et marchés de Noël : la cheminée fait des miracles.', meteo: { froid: 4, nuages: 3, chaleur: 0, soleil: 2 }, loyer: 1.15, demande: 1.12, prix: 1.1, monument: 'cathedrale', ciel: 0xDDE2EA, trottoir: 0xE2E4EA },
  Paris: { desc: 'La capitale : une foule de clients, des prix élevés acceptés… un loyer énorme, et CaféMax déjà en face.', meteo: {}, loyer: 3, demande: 1.5, prix: 1.3, cafemax: true, monument: 'tour', ciel: 0xE6DFD6, trottoir: 0xE8E2DA },
};
// Héritage : les étoiles de franchise se dépensent en bonus permanents (coût = cout × niveau visé)
export const HERITAGE = [
  { id: 'capital', nom: 'Capital de départ', icone: '💰', desc: '+400 € dans la caisse à chaque nouveau café.', cout: 1, max: 5, depart: true },
  { id: 'equipe', nom: 'Équipe formée', icone: '🎓', desc: 'Chaque station démarre 5 niveaux plus haut.', cout: 2, max: 4, depart: true },
  { id: 'bouche', nom: 'Bouche-à-oreille', icone: '🗣️', desc: '+0,25 ★ de réputation au départ.', cout: 2, max: 3, depart: true },
  { id: 'recettes', nom: 'Recettes de mamie', icone: '📖', desc: '+6 % de goût, dans tous les cafés.', cout: 3, max: 5 },
  { id: 'contrat', nom: 'Contrat fournisseur', icone: '🤝', desc: 'Grains 8 % moins chers.', cout: 2, max: 4 },
  { id: 'artisans', nom: 'Artisans fidèles', icone: '🔨', desc: 'Travaux 10 % moins chers.', cout: 3, max: 4 },
  { id: 'gerard', nom: 'Gérard te suit', icone: '🚚', desc: 'Gérard est engagé dès le premier jour.', cout: 4, max: 1, depart: true },
];
