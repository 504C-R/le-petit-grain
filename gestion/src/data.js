// Données du jeu : grains, stations, travaux, succès, histoire. Aucune logique ici.

export const DOSES_SAC = 125;         // v5 : un « sac » est 1 kg de grain = 125 tasses à 8 g
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
// Dosage : grammes de café par tasse. 8 g = la référence. Plus de café = plus de goût (rendements décroissants), mais plus de grain consommé.
export const DOSAGE = { min: 7, max: 11, pas: .5, reference: 8, gout: [[7, .86], [8, 1], [9, 1.09], [10, 1.15], [11, 1.18]] };
// Avis clients : prénoms des auteurs (les avis sont tirés chaque soir selon la journée)
export const PRENOMS_AVIS = ['Léa', 'Hugo', 'Chloé', 'Nathan', 'Manon', 'Lucas', 'Camille', 'Jules', 'Sarah', 'Louis', 'Inès', 'Gabriel', 'Zoé', 'Adam', 'Jade', 'Raphaël', 'Lina', 'Arthur', 'Emma', 'Malik'];
// Formules : une offre par moment de la journée, activée le soir dans le Planning. Elle attire du monde (demande)
// et fait dépenser plus (panier), mais coûte des ingrédients (cout, part du panier) et une mise en place chaque jour.
export const FORMULES = [
  { id: 'petitdej', nom: 'Formule petit-déj', icone: '🥐', moment: 0, demande: .15, panier: .14, cout: .06, req: ['vitrine'], desc: 'Croissant + café, pour les pressés du matin.' },
  { id: 'dejeuner', nom: 'Formule déjeuner', icone: '🥪', moment: 1, demande: .28, panier: .4, cout: .17, req: ['cuisine'], desc: 'Sandwich maison, dessert et café.' },
  { id: 'gouter', nom: 'Goûter maison', icone: '🍰', moment: 2, demande: .3, panier: .16, cout: .08, req: ['cuisine'], desc: 'Les gâteaux de mamie pour réveiller le creux de l’après-midi.' },
  { id: 'afterwork', nom: 'Afterwork gourmand', icone: '🍪', moment: 3, demande: .2, panier: .15, cout: .07, req: ['cuisine'], rep: 3.6, desc: 'Café gourmand et chocolat viennois en sortant du bureau.' },
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
  { id: 'sauge', nom: 'Vert sauge', c1: '#DCE6D5', c2: '#CCDAC3', plinthe: 0x6F8B6B, style: 'nature', prix: 300 },
  { id: 'terracotta', nom: 'Terracotta', c1: '#EDC3A6', c2: '#E3B091', plinthe: 0xA86A33, style: 'chaleureux', prix: 500 },
  { id: 'rose', nom: 'Rose poudré', c1: '#F3D9D6', c2: '#EACAC5', plinthe: 0x9C6B8E, style: 'retro', prix: 700 },
  { id: 'bleu', nom: 'Bleu de Prusse', c1: '#4A6580', c2: '#425B74', plinthe: 0x2E2A2A, style: 'moderne', prix: 1500, rep: 3.3 },
  { id: 'brique', nom: 'Briques apparentes', motif: 'brique', c1: '#B86A4B', c2: '#E8D8C8', plinthe: 0x4A2E1F, style: 'moderne', prix: 4000, rep: 3.5 },
  { id: 'boiserie', nom: 'Boiseries anciennes', motif: 'boiserie', c1: '#9A6A45', c2: '#B5835A', plinthe: 0x4A2E1F, style: 'retro', prix: 8000, rep: 3.8 },
  { id: 'jungle', nom: 'Papier peint jungle', motif: 'jungle', c1: '#2F4F3E', c2: '#6F9B6B', plinthe: 0x2F4F3E, style: 'nature', prix: 12000, rep: 4.2 },
  // Exclusif : offert par mamie dans son courrier (n'apparaît qu'une fois reçu)
  { id: 'mamie', nom: 'Papier peint de mamie', c1: '#F5DDB0', c2: '#EAC48C', plinthe: 0x8A5226, style: 'retro', prix: 0, exclusif: true },
];
export const SOLS = [
  { id: 'parquet', nom: 'Parquet miel', motif: 'lames', c1: '#D7B089', c2: '#CFA67C', style: 'chaleureux', prix: 0 },
  { id: 'chene', nom: 'Chêne fumé', motif: 'lames', c1: '#8C6A50', c2: '#80604A', style: 'moderne', prix: 900 },
  { id: 'tomettes', nom: 'Tomettes provençales', motif: 'tomettes', c1: '#C9694F', c2: '#B95E45', style: 'nature', prix: 1600 },
  { id: 'damier', nom: 'Damier noir et blanc', motif: 'damier', c1: '#F4EFE6', c2: '#3A3333', style: 'retro', prix: 2200 },
  { id: 'beton', nom: 'Béton ciré', motif: 'beton', c1: '#B8B2AA', c2: '#A9A39B', style: 'moderne', prix: 3500, rep: 3.4 },
  { id: 'terrazzo', nom: 'Terrazzo', motif: 'terrazzo', c1: '#EFE6DA', c2: '#C9694F', style: 'retro', prix: 6000, rep: 3.6 },
  { id: 'mosaique', nom: 'Mosaïque vert d’eau', motif: 'damier', c1: '#CFE3DC', c2: '#9CC5B9', style: 'nature', prix: 9000, rep: 4 },
];
// Boisson du jour, choisie le soir : chaque client dépense plus (ou moins) selon la météo ; « cout » = part du panier en ingrédients
export const BOISSONS = [
  { id: 'aucune', nom: 'Rien de spécial', icone: '☕', cout: 0, bonus: {}, rep: 0 },
  { id: 'chocolat', nom: 'Chocolat chaud', icone: '🍫', cout: .07, bonus: { froid: .25, pluie: .14, nuages: .06, soleil: -.02, chaleur: -.08 }, rep: 3.1 },
  { id: 'coldbrew', nom: 'Cold brew glacé', icone: '🧊', cout: .08, bonus: { chaleur: .26, soleil: .14, nuages: .04, pluie: -.03, froid: -.08 }, rep: 3.2 },
  { id: 'the', nom: 'Thé chaï épicé', icone: '🫖', cout: .05, bonus: { pluie: .11, nuages: .1, froid: .09, soleil: .02, chaleur: -.05 }, rep: 3.3 },
];
// Calcaire : chaque machine s'entartre un peu chaque jour (plus vite si elle est peu fiable).
// À 100 % : −20 % de goût pour cette machine et des pannes 45 % plus fréquentes. On détartre le soir (3 % du prix de la machine, au moins 10 €).
export const CALCAIRE = { parJour: .12, gout: .2, pannes: .45, prix: .03, min: 10, seuilLucas: .5 };
export const SEUIL_CAFEMAX = 20000;
// Lait : un pack = 30 doses ; avec la buse, 40 % des clients prennent un cappuccino ou un latte (60 % plus cher)
export const LAIT = { prixPack: 1.1, doses: 7, part: .35, bonus: .6 };   // v5 : 1 litre de lait (1,10 €) = 7 cappuccinos

export const GRAINS = [
  { id: 'premier', nom: 'Robusta premier prix', court: 'Premier prix', q: .6, prixSac: 9, rep: 0 },
  { id: 'robusta', nom: 'Robusta du coin', court: 'Robusta', q: 1, prixSac: 14, rep: 0 },
  { id: 'arabica', nom: 'Arabica du Brésil', court: 'Arabica', q: 2, prixSac: 22, rep: 3.2 },
  { id: 'moka', nom: "Moka d'Éthiopie", court: 'Moka', q: 3, prixSac: 32, rep: 3.5 },
  { id: 'bourbon', nom: 'Bourbon pointu', court: 'Bourbon', q: 4.5, prixSac: 45, rep: 3.9 },
  { id: 'geisha', nom: 'Geisha du Panama', court: 'Geisha', q: 6.5, prixSac: 110, rep: 4.3 },
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
  { id: 'compacta', nom: 'Compacta Mini', desc: 'Petite et increvable, pour sortir de la vieille machine à petit prix.', vitesse: .85, qualite: .95, fiabilite: 1.25, prix: 900, visuel: 'machine_neuve', teinte: 0xB9C4C9 },
  { id: 'bellacrema', nom: 'Bellacrema Uno', desc: 'Simple et fiable, un peu lente.', vitesse: 1.0, qualite: 1.0, fiabilite: 1.1, prix: 2500, visuel: 'machine_neuve', teinte: 0x8FA98B },
  { id: 'turbo', nom: 'Turbo Espresso 2000', desc: 'Très rapide, mais capricieuse : pannes fréquentes.', vitesse: 1.8, qualite: .95, fiabilite: .45, prix: 4000, visuel: 'machine_neuve', teinte: 0xD9695F },
  { id: 'vapore', nom: 'Vapore Duo', desc: 'Buse à lait intégrée : cappuccinos sans travaux.', vitesse: 1.25, qualite: 1.05, fiabilite: .85, prix: 5500, visuel: 'machine_neuve', teinte: 0xE8B54A, buse: true },
  { id: 'levier', nom: 'Leva Classica', desc: 'Machine à levier à l’italienne : un café sublime, mais lente et délicate.', vitesse: 1.15, qualite: 1.35, fiabilite: .75, prix: 7000, visuel: 'machine_levier', teinte: 0xD9695F, rep: 3.4 },
  { id: 'maestro', nom: 'Maestro Pro', desc: 'Rapide, fiable, un excellent café.', vitesse: 2.3, qualite: 1.2, fiabilite: 1.3, prix: 12000, visuel: 'machine_pro' },
  { id: 'lunaria', nom: 'Lunaria Triple', desc: 'Trois groupes, une bête de course. Exigeante en entretien.', vitesse: 3.6, qualite: 1.25, fiabilite: .9, prix: 18000, visuel: 'machine_pro', teinte: 0x2F4B6E, rep: 3.8 },
  { id: 'sirena', nom: 'Sirena Doppia Leva', desc: 'Le levier de compétition en laiton. Le meilleur goût du catalogue.', vitesse: 2.6, qualite: 1.62, fiabilite: 1.05, prix: 25000, visuel: 'machine_levier', teinte: 0x2E2A2A, rep: 4.0 },
  { id: 'celeste', nom: 'Céleste Atelier', desc: 'Faite main en Italie. La machine d’une vie.', vitesse: 4.8, qualite: 1.45, fiabilite: 1.5, prix: 35000, visuel: 'machine_pro', teinte: 0xE8B54A, rep: 4.2 },
  { id: 'robot', nom: 'Robo-Barista X1', desc: 'Un bras robot qui ne dort jamais. Une vitesse folle, un goût correct.', vitesse: 7.5, qualite: 1.15, fiabilite: .95, prix: 60000, visuel: 'machine_robot', rep: 4.4 },
];
export const MOULINS = [
  { id: 'manivelle', nom: 'Moulin à manivelle', desc: 'À la force du poignet.', vitesse: 1, qualite: 1, fiabilite: .7, prix: 0, visuel: 'moulin_manuel' },
  { id: 'electrique', nom: 'Moulin électrique', desc: 'Rapide et pas cher.', vitesse: 1.6, qualite: 1.0, fiabilite: 1.0, prix: 350, visuel: 'moulin_electrique' },
  { id: 'coniques', nom: 'Moulin à meules coniques', desc: 'Mouture parfaite : meilleur goût, un peu moins rapide.', vitesse: 1.35, qualite: 1.15, fiabilite: 1.2, prix: 1100, visuel: 'moulin_electrique', teinte: 0x3E3A3A },
  { id: 'torrefacteur', nom: 'Torréfacteur en cuivre', desc: 'On torréfie sur place : rapide et délicieux.', vitesse: 2.5, qualite: 1.25, fiabilite: 1.0, prix: 6500, visuel: 'torrefacteur' },
  { id: 'precision', nom: 'Moulin de précision', desc: 'Réglage au micron : mouture parfaite et rapide.', vitesse: 2.1, qualite: 1.33, fiabilite: 1.25, prix: 2800, visuel: 'moulin_electrique', teinte: 0xC07A45, rep: 3.6 },
  { id: 'atelier', nom: 'Atelier de torréfaction', desc: 'Double tambour et moulin de compétition.', vitesse: 4, qualite: 1.4, fiabilite: 1.3, prix: 15000, visuel: 'torrefacteur', rep: 4 },
];
export const FOURNISSEURS = [
  { id: 'grossiste', nom: 'Grossiste du marché', desc: 'Pas cher, mais une livraison sur cinq arrive à midi.', prixMult: 1, qualite: 1, retard: .2, rep: 0 },
  { id: 'artisan', nom: 'Torréfacteur artisan', desc: 'Grains plus frais (+12 % de goût), 40 % plus chers, toujours à l’heure.', prixMult: 1.4, qualite: 1.12, retard: 0, rep: 3.3 },
  { id: 'importateur', nom: 'Importateur direct', desc: 'Achète aux fermes, sans intermédiaire : +22 % de goût, à peine plus cher.', prixMult: 1.2, qualite: 1.22, retard: .05, rep: 3.8 },
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
  { id: 'peinture', cat: 'Déco', nom: 'Coup de peinture', prix: 800, desc: 'Adieu les murs jaunis : ambiance ++ (et tu pourras choisir la déco).' },
  { id: 'table3', cat: 'Salle', nom: 'Une table de plus', prix: 350, desc: '+2 places : plus de clients.' },
  { id: 'palette', cat: 'Réserve', nom: 'Palette et étagères', prix: 250, desc: 'Réserve : +40 kg de grain.' },
  { id: 'plantes', cat: 'Déco', nom: 'Plantes vertes', prix: 300, req: ['peinture'], desc: 'Un peu de vert : ambiance +.' },
  { id: 'table4', cat: 'Salle', nom: 'Encore une table', prix: 400, req: ['table3'], desc: '+2 places.' },
  { id: 'lampes', cat: 'Déco', nom: 'Suspensions dorées', prix: 900, req: ['peinture'], desc: 'Lumière chaude : ambiance +.' },
  { id: 'ardoise', cat: 'Déco', nom: 'Ardoise du jour', prix: 150, req: ['peinture'], desc: 'Tes prix écrits à la craie : ambiance + et +4 % de clients.' },
  { id: 'comptoir2', cat: 'Bar', nom: 'Rallonger le comptoir', prix: 3500, req: ['table3'], desc: 'Un 2e poste de machine (à équiper dans le catalogue ; il faudra un barista de plus).' },
  { id: 'buse', cat: 'Bar', nom: 'Buse à lait et nouveau menu', prix: 1200, desc: 'Le cappuccino entre à la carte : bien plus cher qu’un espresso, beaucoup de clients le préfèrent. Il faut du lait (Réserve).' },
  { id: 'vitrine', cat: 'Bar', nom: 'Vitrine à pâtisseries', prix: 2500, req: ['peinture'], desc: 'Croissants et cookies à la carte. Les croissants se commandent chaque soir (Réserve) ; les invendus sont jetés.' },
  { id: 'enseigne', cat: 'Déco', nom: 'Enseigne neuve', prix: 2000, req: ['peinture'], desc: 'On la voit de loin : ambiance ++ et +12 % de clients.' },
  { id: 'arriere', cat: 'Réserve', nom: 'Arrière-boutique', prix: 6000, req: ['palette'], desc: 'Réserve : +150 kg de grain.' },
  { id: 'agrandir', cat: 'Agrandir', nom: 'Abattre la cloison', prix: 25000, req: ['table4'], desc: 'Le café double de surface : place pour 2 tables de plus et un 3e poste de machine. Loyer +1 500 € par mois.' },
  { id: 'table5', cat: 'Salle', nom: 'Table près de la fenêtre', prix: 450, req: ['agrandir'], desc: '+2 places.' },
  { id: 'table6', cat: 'Salle', nom: 'Grande table du fond', prix: 600, req: ['table5'], desc: '+2 places.' },
  { id: 'terrasse', cat: 'Agrandir', nom: 'Terrasse', prix: 8000, req: ['agrandir'], desc: '2 tables au soleil (+4 places) et +25 % d’attrait. Redevance de 400 € par mois à la mairie.' },
  { id: 'emporter', cat: 'Bar', nom: 'Fenêtre à emporter', prix: 4500, req: ['agrandir'], desc: 'Un guichet sur la rue pour les pressés : +10 % de clients, et la moitié prend à emporter (moins de places assises nécessaires).' },
  { id: 'entrepot', cat: 'Réserve', nom: 'Cave voûtée', prix: 15000, req: ['arriere'], desc: 'La vieille cave remise en état : +400 kg, et le grain y vieillit deux fois moins vite.' },
  { id: 'fresque', cat: 'Déco', nom: 'Fresque de mamie', prix: 3000, req: ['enseigne'], desc: 'Un artiste peint mamie Odette sur le mur : ambiance ++.' },
  { id: 'velo', cat: 'Agrandir', nom: 'Livraison à vélo', prix: 6000, req: ['emporter'], desc: 'Karim et Yanis livrent le quartier : +12 % de clients.' },
  { id: 'boutique', cat: 'Bar', nom: 'Coin boutique', prix: 9000, req: ['vitrine', 'agrandir'], desc: 'Sachets de grains et tasses à vendre : chaque client dépense +12 %.' },
  { id: 'ecole', cat: 'Équipe', nom: 'École de barista', prix: 12000, req: ['terrasse'], desc: 'Tu formes toi-même ton équipe : les formations coûtent moitié moins cher.' },
  { id: 'tapis', cat: 'Déco', nom: 'Grand tapis persan', prix: 600, req: ['peinture'], desc: 'Un tapis moelleux sous les tables : ambiance +.' },
  { id: 'jukebox', cat: 'Déco', nom: 'Jukebox', prix: 2500, req: ['ardoise'], desc: 'De vieux tubes : +5 % de clients, et la musique se voit.' },
  { id: 'cheminee', cat: 'Confort', nom: 'Cheminée', prix: 7000, req: ['peinture'], desc: 'Un vrai feu de bois : ambiance +, et +30 % de clients les jours de froid.' },
  { id: 'clim', cat: 'Confort', nom: 'Ventilateurs et clim', prix: 6500, req: ['agrandir'], desc: 'Il fait frais chez toi : +25 % de clients les jours de canicule.' },
  { id: 'chauffages', cat: 'Confort', nom: 'Chauffages de terrasse', prix: 3000, req: ['terrasse'], desc: 'La terrasse reste pleine : la pluie et le froid la vident deux fois moins.' },
  { id: 'lustre', cat: 'Déco', nom: 'Lustre en laiton', prix: 4000, req: ['agrandir', 'lampes'], desc: 'Huit bougies qui brillent au-dessus de la salle : ambiance +.' },
  { id: 'cuisine', cat: 'Bar', nom: 'Annexe-cuisine', prix: 18000, req: ['vitrine', 'agrandir'], desc: 'Une petite cuisine dans l’annexe : sandwichs et gâteaux à la carte, formules déjeuner, goûter et afterwork. Il faut quelqu’un en cuisine.' },
  { id: 'etage', cat: 'Agrandir', nom: 'Salle à l’étage', prix: 60000, req: ['terrasse'], desc: 'On ouvre l’étage : +6 places et +20 % d’attrait. Loyer +2 000 € par mois.' },
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
  { id: 'premierCafe', nom: 'Premier café', desc: 'Servir un premier client.' },
  { id: 'habitues', nom: 'Les habitués', desc: 'Servir 100 clients.' },
  { id: 'milleTasses', nom: 'Mille tasses', desc: 'Servir 1 000 clients.' },
  { id: 'centMille', nom: 'Une rivière de café', desc: 'Servir 100 000 clients.' },
  { id: 'caisse1k', nom: 'La caisse tinte', desc: 'Encaisser 10 000 € au total.' },
  { id: 'caisse100k', nom: 'Belle affaire', desc: 'Encaisser 100 000 € au total.' },
  { id: 'caisse10M', nom: 'Le million', desc: 'Encaisser 1 M€ au total.' },
  { id: 'travaux5', nom: 'Bricoleur', desc: 'Faire 5 travaux.' },
  { id: 'toutNeuf', nom: 'Tout beau, tout neuf', desc: 'Faire tous les travaux.' },
  { id: 'equipe', nom: 'Une vraie brigade', desc: 'Avoir 5 employés.' },
  { id: 'etoiles3', nom: 'Bonne adresse', desc: 'Atteindre 3,5 ★ avec au moins 50 avis.' },
  { id: 'etoiles5', nom: 'Le meilleur café de la ville', desc: 'Atteindre 4,6 ★ avec au moins 300 avis.' },
  { id: 'fineBouche', nom: 'Fine bouche', desc: 'Servir du Bourbon pointu.' },
  { id: 'reparateur', nom: 'Le roi de la clé à molette', desc: 'Réparer 10 pannes à la main.' },
  { id: 'critique', nom: 'Bonne presse', desc: 'Séduire Madame Lefèvre, la critique.' },
  { id: 'franchise', nom: 'Libre comme l’air', desc: 'Rembourser un prêt jusqu’au bout.' },
  { id: 'quartier', nom: 'Tout le quartier', desc: 'Recevoir les 5 habitués.' },
  { id: 'geisha', nom: 'Le grain des rois', desc: 'Servir du Geisha du Panama.' },
  { id: 'atelier5', nom: 'Maître d’apprentissage', desc: 'Faire 5 formations.' },
  { id: 'atelierMax', nom: 'Une perle rare', desc: 'Avoir un employé au niveau 5.' },
  { id: 'etage', nom: 'Deux étages de bonheur', desc: 'Ouvrir la salle à l’étage.' },
  { id: 'celeste', nom: 'La machine d’une vie', desc: 'Installer une Céleste Atelier.' },
  { id: 'premierChapitre', nom: 'Une histoire commence', desc: 'Écouter le premier chapitre de l’histoire d’un habitué.' },
  { id: 'lettresMamie', nom: 'Le secret de mamie', desc: 'Lire les 7 lettres de mamie.' },
  { id: 'amiQuartier', nom: 'L’ami du quartier', desc: 'Connaître toute l’histoire des 4 habitués.' },
];

// Récit minimal : un message de mamie aux grandes étapes
export const HISTOIRE = [
  { id: 'intro', titre: 'Les clés du Petit Grain', texte: "Voilà les clés, ma petite. Le Petit Grain n'est plus tout jeune : une vieille machine d'occasion, un moulin à manivelle, deux tables bancales, et 4 000 € d'économies pour démarrer. Pour l'instant, tu es seule derrière le bar. Le loyer tombe tous les 28 jours, les salaires chaque soir. Le soir, dans ton journal, tu recrutes, tu fais le planning, tu commandes le grain et tu regardes tes comptes. Le matin, c'est toi qui ouvres. Je compte sur toi !" },
  { id: 'premierManager', titre: 'La première recrue', texte: "Te voilà patronne ! Un salaire, c'est une charge chaque soir : fais bien le planning. Mets ton monde là où il y a des clients (le matin et à midi), et laisse-les souffler l'après-midi." },
  { id: 'premiereRupture', titre: 'La panne sèche', texte: "Un café sans grains, c'est une église sans cloches ! Garde un œil sur la réserve, ou prends une commande permanente chez le fournisseur." },
  { id: 'etoiles3', titre: 'Le club de pétanque', texte: 'Monsieur Bernard ramène tous ses copains du club de pétanque. Trois étoiles et demie, ça se fête !' },
  { id: 'cloison', titre: 'La cloison de grand-père', texte: "La cloison est tombée. Ton grand-père l'avait montée en 1974 « provisoirement »… Il serait fier de toi. Attention, le loyer monte avec la surface." },
  { id: 'cafemax', titre: 'CaféMax ouvre en face', texte: 'Oh non… CaféMax ouvre en face, avec ses gobelets beiges. Ils vont lancer des promos et débaucher ton équipe. Ne te laisse pas faire !' },
  { id: 'terrasse', titre: 'La terrasse', texte: 'Une terrasse ! Je viendrai y lire mon journal tous les matins, réserve-moi la table au soleil. Et pense à mettre quelqu’un en salle, dehors aussi on attend.' },
  { id: 'atelier', titre: 'Le premier mois', texte: 'Un mois déjà ! Regarde ton compte de résultat dans le journal (onglet Finances) : chiffre d’affaires, salaires, loyer… Si c’est dans le vert, bravo. Sinon, on ajuste.' },
  { id: 'etage', titre: 'L’étage', texte: 'Deux étages de café… Ton grand-père n’en revenait pas quand on a ouvert la terrasse. Alors ça !' },
];

// Les habitués : ils reviennent, on les reconnaît à leurs accessoires, et ils laissent un pourboire
export const HABITUES = [
  { id: 'bernard', nom: 'Monsieur Bernard', accessoire: 'beret', habit: 0x6E86A8, cheveux: 0xE9E1DA, peau: 0xF2C9A5, repMin: 0,
    phrases: ['Comme d’habitude, un petit noir !', 'Ah, ça me rappelle le café de 1987…', 'Votre grand-mère serait fière.'] },
  { id: 'ines', nom: 'Inès', accessoire: 'casque', habit: 0xB48EC9, cheveux: 0x2B1B12, peau: 0xC99A78, repMin: 3.1,
    phrases: ['Un allongé, j’ai un partiel demain…', 'Le wifi marche aujourd’hui ?', 'Je révise mieux ici qu’à la BU !'] },
  { id: 'karim', nom: 'Karim', accessoire: 'velo', habit: 0xE59A6B, cheveux: 0x1E1E1E, peau: 0x9C6B4A, repMin: 3.2,
    phrases: ['Un café à emporter, je suis en retard !', 'Trois livraisons et une pause café.', 'Yanis arrive, il paie le sien !'] },
  { id: 'yanis', nom: 'Yanis', accessoire: 'velo', habit: 0x5E9CA0, cheveux: 0x1E1E1E, peau: 0x9C6B4A, repMin: 3.2,
    phrases: ['Karim a dit que tu payais, non ?', 'Le meilleur café du quartier, sans hésiter.', 'Vite, vite, la course n’attend pas !'] },
  { id: 'lefevre', nom: 'Madame Lefèvre', accessoire: 'lunettes', habit: 0x4A2E1F, cheveux: 0x8A4B2B, peau: 0xF5D3B8, repMin: 3.6,
    phrases: ['Hmm. L’acidité est… intéressante.', 'Je ne suis pas là pour la critique. Officiellement.', 'Notez que je reviens. C’est un compliment.'] },
];
export const POURBOIRE = 1;    // v5 : un habitué laisse environ 1 € de pourboire

// Objectifs de mamie : un à la fois, ils guident le joueur et rapportent une petite prime
export const OBJECTIFS = [
  { id: 'journal', texte: 'Tiens jusqu’à 19 h : le soir, le journal s’ouvre', prime: 0 },
  { id: 'commande', texte: 'Commande du grain pour demain (journal du soir)', prime: 0 },
  { id: 'embauche', texte: 'Embauche quelqu’un en salle (onglet Équipe)', prime: 150 },
  { id: 'peinture', texte: 'Fais un coup de peinture (onglet Travaux)', prime: 100 },
  { id: 'carte', texte: 'Ajoute un produit à ta carte (onglet Carte)', prime: 100 },
  { id: 'machine', texte: 'Achète une machine neuve (catalogue du soir)', prime: 250 },
  { id: 'premierMois', texte: 'Termine un mois dans le vert', prime: 500 },
  { id: 'fidelite', texte: 'Lance la carte de fidélité (onglet Clients)', prime: 200 },
  { id: 'note35', texte: 'Atteins 3,5 ★ avec 100 avis', prime: 500 },
  { id: 'equipe3', texte: 'Constitue une équipe de 3 employés', prime: 800 },
  { id: 'cloison', texte: 'Abats la cloison', prime: 2000 },
  { id: 'ca15k', texte: 'Fais 15 000 € de chiffre d’affaires dans un mois', prime: 2000 },
  { id: 'terrasse', texte: 'Ouvre la terrasse', prime: 3000 },
  { id: 'note45', texte: 'Atteins 4,5 ★ avec 500 avis', prime: 5000 },
  { id: 'ca40k', texte: 'Fais 40 000 € de chiffre d’affaires dans un mois', prime: 10000 },
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

// =================== Version « gestion » (v5) ===================
// Capacités : une machine fait vitesse × 80 tasses par heure, un moulin vitesse × 120.
// Places : un client assis reste environ 25 min ; une part des clients prend à emporter.
export const CAPACITE = { machine: 80, moulin: 120, placesParHeure: 2.4, emporter: .35, emporterGuichet: .5 };
// Un client dépense en moyenne 1,5 fois le prix de l’espresso (allongé, deuxième tasse, verre de jus…)
export const TICKET = 1.5;
// Consommables par client servi : gobelet ou sucre, eau, lait de l’allongé, serviettes (comptés dans les achats)
export const CONSOMMABLES = .3;
// La demande de base : clients par heure, avant l'heure, le jour, la météo, la notoriété, la note et le prix
export const DEMANDE_BASE = 26;
export const RESERVE_KG = { base: 25, palette: 40, arriere: 150, entrepot: 400 };
// Personnel : salaire horaire (SMIC + par niveau), charges patronales, heures sup, formation, vitesses (par heure)
export const PERSONNEL = { smic: 11.65, parNiveau: 1.9, charges: 1.42, semaine: 35, supp: 1.25, formation: 250, indemniteJours: 5,
  vitesse: { barista: [40, 18], salle: [50, 15], cuisine: [24, 10] }, sansSalle: .65 };
export const ROLES = { barista: 'Barista', salle: 'Salle', cuisine: 'Cuisine' };
export const TRAITS = [
  { id: 'rapide', nom: 'Rapide', desc: 'va 15 % plus vite' },
  { id: 'souriant', nom: 'Souriant', desc: 'les clients sont plus contents' },
  { id: 'endurant', nom: 'Endurant', desc: 'se fatigue moins vite' },
  { id: 'perfectionniste', nom: 'Perfectionniste', desc: 'meilleur goût (barista)' },
  { id: 'apprenti', nom: 'Apprenti', desc: 'moins cher, progresse vite en formation' },
  { id: 'distrait', nom: 'Distrait', desc: 'un peu plus lent, casse plus souvent' },
];
export const PRENOMS_EMPLOYES = ['Lucas', 'Sofia', 'Nadia', 'Théo', 'Clara', 'Yanis', 'Léna', 'Mathis', 'Elsa', 'Rayan', 'Louise', 'Noah', 'Alice', 'Sami', 'Rose', 'Tom', 'Maya', 'Enzo', 'Juliette', 'Bilal', 'Anna', 'Paul', 'Lou', 'Karim'];
// Charges mensuelles (tous les 28 jours) et quotidiennes
export const MOIS = { jours: 28, loyer: 1200, agrandir: 1500, terrasse: 400, etage: 2000, assurance: 90, entretien: .006, impot: .15 };
export const ENERGIE = { base: 8, parMachine: 3, clim: 6, cheminee: 4 };
export const PRETS = [
  { id: 'petit', montant: 5000, taux: .045, mois: 24 },
  { id: 'moyen', montant: 15000, taux: .05, mois: 36 },
  { id: 'gros', montant: 40000, taux: .055, mois: 60 },
];
export const DECOUVERT = { agios: .0004, alerte: -3000, faillite: -12000 };
export const ARGENT_DEPART = 4000;
// Calendrier : le jeu commence un lundi de mars
export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const AFFLUENCE_JOUR = [.95, .95, 1, 1, 1.1, 1.3, .8];
export const NOMS_MOIS = ['Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février'];
// Saisons (0 = mars) : affluence en salle, effet sur la terrasse, et poids de la météo
export const SAISONS = [
  { nom: 'Printemps', mois: [0, 1, 2], demande: 1, terrasse: 1.05, meteo: { soleil: 3, nuages: 3, pluie: 2.5, chaleur: .3, froid: .3 } },
  { nom: 'Été', mois: [3, 4, 5], demande: .95, terrasse: 1.25, meteo: { soleil: 5, nuages: 2, pluie: 1, chaleur: 2.5, froid: 0 } },
  { nom: 'Automne', mois: [6, 7, 8], demande: 1.05, terrasse: .9, meteo: { soleil: 2, nuages: 4, pluie: 3, chaleur: .2, froid: .8 } },
  { nom: 'Hiver', mois: [9, 10, 11], demande: 1.1, terrasse: .6, meteo: { soleil: 1.5, nuages: 3, pluie: 2, chaleur: 0, froid: 3 } },
];
// Viennoiseries (avec la vitrine) : commandées le soir, vendues le lendemain, invendus jetés
export const VIENNOISERIES = { cout: .45, prix: 1.4, part: [.3, .1, .16, .05] };
// Note tirée des clients : point de départ, vitesse de la moyenne glissante, note des clients repartis sans être servis
export const NOTE = { depart: 3, poids: .0025, perdu: 1.2, poidsPerdu: .0006 };
// Notoriété : le bouche-à-oreille, de 0,4 (inconnu) à 2 (adresse incontournable)
export const NOTORIETE = { depart: .4, max: 2, parClient: .00003 };

// =================== La carte, le marketing et la fidélité ===================
// La carte : chaque client prend une boisson (l’espresso, ou une autre boisson de la carte qui le remplace) et parfois un extra.
// parts : part des clients qui le prennent, par moment (matin, midi, après-midi, soir), quand le prix est au prix juste.
// ref : prix juste (pour les cafés : × le prix juste de l’espresso, qui suit la qualité ; sinon en euros, × la ville).
// cout : ingrédients par unité (le grain et le lait sont comptés à part). cafe : consomme une dose de grain. lait : une dose de lait.
// stock : vendu dans la limite du stock du jour (croissants commandés la veille). cuisine : il faut quelqu’un en cuisine.
export const CARTE = [
  { id: 'espresso', nom: 'Espresso', icone: '☕', type: 'boisson', cafe: true, ref: 1, cout: 0, parts: [1, 1, 1, 1], desc: 'Le café de la maison. Son prix fait venir (ou fuir) les clients : il se règle avec le bouton Prix.' },
  { id: 'allonge', nom: 'Café allongé', icone: '🫗', type: 'boisson', cafe: true, ref: 1.2, cout: .02, parts: [.22, .18, .22, .16], depart: 1.8, actif: true, desc: 'Le même café, avec plus d’eau. Presque la même marge que l’espresso, un peu plus cher.' },
  { id: 'cappuccino', nom: 'Cappuccino', icone: '🥛', type: 'boisson', cafe: true, lait: true, ref: 1.75, cout: 0, parts: [.3, .18, .3, .2], depart: 2.6, req: ['buse'], desc: 'Café et lait mousseux : beaucoup le préfèrent, et il se vend bien plus cher. Il faut du lait.' },
  { id: 'the', nom: 'Thé', icone: '🫖', type: 'boisson', ref: 2.2, cout: .18, parts: [.05, .05, .13, .09], depart: 2.2, actif: true, desc: 'Pour ceux qui ne boivent pas de café : ne consomme pas de grain.' },
  { id: 'jus', nom: 'Jus d’orange pressé', icone: '🍊', type: 'extra', ref: 3.2, cout: .75, parts: [.18, .07, .1, .07], depart: 3.2, actif: true, desc: 'Surtout le matin. Les oranges coûtent cher : surveille la marge.' },
  { id: 'limonade', nom: 'Limonade maison', icone: '🍋', type: 'extra', ref: 3, cout: .45, parts: [.02, .07, .09, .08], depart: 3, desc: 'Fraîche et faite ici. Elle plaît à midi et l’après-midi.' },
  { id: 'croissant', nom: 'Croissant', icone: '🥐', type: 'extra', stock: true, ref: 1.4, cout: .45, parts: [.3, .1, .16, .05], depart: 1.4, req: ['vitrine'], desc: 'Commandés le soir pour le lendemain (Réserve) : payés d’avance, les invendus sont jetés.' },
  { id: 'cookie', nom: 'Cookie', icone: '🍪', type: 'extra', ref: 2.4, cout: .5, parts: [.02, .04, .09, .04], depart: 2.4, req: ['vitrine'], desc: 'Le petit plaisir de l’après-midi, qui se garde bien.' },
  { id: 'gateau', nom: 'Part de gâteau', icone: '🍰', type: 'extra', cuisine: true, ref: 3.8, cout: 1, parts: [0, .05, .18, .07], depart: 3.8, req: ['cuisine'], desc: 'Le quatre-quarts de mamie. Il faut quelqu’un en cuisine.' },
  { id: 'sandwich', nom: 'Sandwich maison', icone: '🥪', type: 'extra', cuisine: true, ref: 6, cout: 2.1, parts: [0, .32, .04, .03], depart: 6, req: ['cuisine'], desc: 'Le gros de la vente à midi. Il faut quelqu’un en cuisine.' },
];
// Chaque produit de plus à la carte (au-delà de 4) attire 1,5 % de clients en plus ; une carte trop courte en fait perdre.
export const VARIETE = { reference: 4, parProduit: .015 };
// Un client sur huit reprend une deuxième boisson (un deuxième café, un thé après le déjeuner…)
export const DEUXIEME_TASSE = .12;
// Marketing : des campagnes lancées le soir, qui durent quelques jours (une seule à la fois par type)
// demande : clients en plus ; noto : notoriété gagnée tout de suite ; bouche : bouche-à-oreille plus rapide pendant la campagne
export const MARKETING = [
  { id: 'flyers', nom: 'Flyers dans le quartier', icone: '📄', prix: 120, jours: 3, demande: .1, noto: .02, desc: 'On glisse des flyers dans les boîtes aux lettres de la rue.' },
  { id: 'reseaux', nom: 'Pub sur les réseaux', icone: '📱', prix: 350, jours: 7, demande: .07, bouche: .8, desc: 'De jolies photos de tes cafés : on en parle plus vite autour de soi.' },
  { id: 'journal', nom: 'Encart dans le journal local', icone: '📰', prix: 600, jours: 1, demande: .05, noto: .12, rep: 3.2, desc: 'Une demi-page dans le journal du quartier : tout le monde connaîtra ton nom.' },
  { id: 'radio', nom: 'Spot à la radio', icone: '📻', prix: 1500, jours: 7, demande: .18, noto: .1, rep: 3.6, desc: 'Trente secondes sur la radio locale, matin et soir, pendant une semaine.' },
];
// Carte de fidélité : le 10e café offert. Des clients contents s’inscrivent ; les membres reviennent plus souvent.
// lancement : impression des cartes ; inscription : part des clients servis qui s’inscrit quand ils sont ravis ;
// depart : part des membres qui décroche chaque jour ; bonusMax et demi : clients en plus (bonus = max × m / (m + demi)) ;
// remise : ce que coûte le café offert, sur les achats des membres
export const FIDELITE = { lancement: 150, inscription: .05, depart: .012, bonusMax: .15, demi: 600, remise: .1, partMax: .6 };

// =================== Modes de difficulté, Gazette ===================
// Choisi au début de la partie : argent de départ, affluence, loyer et seuil de faillite
export const DIFFICULTES = {
  tranquille: { nom: 'Tranquille', desc: 'Plus d’argent au départ, des clients plus nombreux, un loyer plus doux. Pour profiter.', argent: 6000, demande: 1.12, loyer: .85, faillite: -20000 },
  normal: { nom: 'Normal', desc: 'L’expérience prévue : il faut gérer, mais on a le droit à l’erreur.', argent: 4000, demande: 1, loyer: 1, faillite: -12000 },
  exigeant: { nom: 'Exigeant', desc: 'Peu d’argent, moins de clients, un loyer plus cher, une banque sévère. Pour les pros.', argent: 3000, demande: .9, loyer: 1.15, faillite: -6000 },
};
// Bilan d'une année : médailles selon le résultat cumulé des 12 mois (et la note pour l'or)
export const MEDAILLES = { argent: 25000, or: 50000, noteOr: 3.8 };
// La Gazette du quartier : petites nouvelles tirées au hasard, pour l'ambiance
export const NOUVELLES_QUARTIER = [
  'La boulangerie de la rue d’à côté refait sa vitrine : les travaux dureront deux semaines.',
  'Le marché du samedi accueille un nouveau fromager. Il paraît que son comté est extraordinaire.',
  'Monsieur Bernard a encore gagné le concours de pétanque du quartier. Il fête ça au café, évidemment.',
  'La mairie promet de nouveaux bancs sur la place. Les pigeons, eux, sont déjà ravis.',
  'Un tournage de film a bloqué la rue mardi. Personne n’a reconnu l’acteur principal.',
  'La bibliothèque lance un club de lecture le jeudi soir. On cherche un endroit chaleureux pour se réunir…',
  'Le fleuriste du coin propose des bouquets de saison à prix doux tout le mois.',
  'Les élèves de l’école primaire ont repeint la fresque du préau. Bravo à eux !',
  'Un vélo jaune attend son propriétaire devant la pharmacie depuis lundi. Mystère.',
  'La chorale du quartier répète tous les mercredis. On l’entend jusqu’au carrefour.',
];

// =================== Niveaux ===================
// Le niveau du café : l'expérience vient des clients servis (1 XP chacun) et de bonus (travaux, objectifs, succès, histoires…).
// XP cumulée pour atteindre le niveau n : base × (n − 1)^expo. Chaque niveau rapporte une prime, et un coffre tous les 5 niveaux.
export const NIVEAU_CAFE = { base: 40, expo: 1.8, max: 60, prime: 60, primeParNiveau: 40, coffre: 3 };
export const XP = { travaux: 1 / 40, travauxMax: 400, objectif: 60, succes: 40, chapitre: 50, lettre: 25, journee: 20, poste: 8 };
// Ce que chaque niveau débloque (les déco et travaux absents de cette liste sont libres dès le niveau 1)
export const DEBLOCAGES = [
  { niveau: 2, mur: 'sauge', travaux: 'tapis' },
  { niveau: 3, sol: 'chene', travaux: 'ardoise' },
  { niveau: 4, mur: 'terracotta', travaux: 'plantes' },
  { niveau: 5, sol: 'tomettes', travaux: 'lampes' },
  { niveau: 6, mur: 'rose', travaux: 'enseigne' },
  { niveau: 7, sol: 'damier' },
  { niveau: 8, travaux: 'jukebox' },
  { niveau: 9, mur: 'bleu' },
  { niveau: 10, sol: 'beton', travaux: 'fresque' },
  { niveau: 12, mur: 'brique' },
  { niveau: 14, sol: 'terrazzo', travaux: 'lustre' },
  { niveau: 16, mur: 'boiserie' },
  { niveau: 18, sol: 'mosaique' },
  { niveau: 20, mur: 'jungle' },
];
// Les niveaux des postes (réserve, moulin, bar, salle) : chacun monte avec de l'argent, +2 % par niveau et +10 % tous les 10 niveaux.
// Le niveau maximum d'un poste suit le niveau du café : départ + 2 par niveau du café.
export const NIVEAUX_POSTES = { couts: [60, 90, 120, 100], croissance: 1.16, gain: .02, palier: 10, bonusPalier: .1, depart: 4, parNiveauCafe: 2, max: 50,
  effets: ['de place dans la réserve', 'de vitesse au moulin', 'de tasses par heure au bar', 'de service en salle'] };

// =================== Revenir le lendemain (jours réels) ===================
// Le courrier de mamie : une lettre par jour réel où l'on joue, avec un petit cadeau. Rater un jour ne fait rien perdre :
// la lettre suivante attend simplement. {cafe} est remplacé par le nom du café.
// cadeau : argent (€), notoriete (+), mur (un mur exclusif offert), secret (bonus permanent)
export const LETTRES = [
  { titre: 'Ma première lettre', texte: "Ma petite, je t'écris de chez ta tante, où je me repose les jambes. On me dit que {cafe} rouvre ses volets chaque matin : ça me fait chaud au cœur. Je glisse un billet dans l'enveloppe. Ce n'est pas grand-chose, mais une caisse qui tinte, ça donne du courage.", cadeau: { argent: 300 } },
  { titre: 'Le marché du mardi', texte: "Hier, au marché, j'ai parlé de toi à tout le monde. Au fromager, à la fleuriste, et même au monsieur des olives qui ne sourit jamais. Tu vas voir de nouvelles têtes cette semaine. Sers-les bien, ils parlent beaucoup.", cadeau: { notoriete: .12 } },
  { titre: 'Le papier peint de ma jeunesse', texte: "J'ai retrouvé au grenier les rouleaux du papier peint qu'on avait posé en 1974, avec ton grand-père. Des petites fleurs couleur miel, tu te souviens ? Je te les envoie. Pose-les un soir si le cœur t'en dit (Journal, Le café, Déco) : il paraît que ça revient à la mode.", cadeau: { mur: 'mamie' } },
  { titre: 'Les comptes', texte: "Ton oncle me dit que tu regardes tes comptes tous les soirs. C'est bien, c'est comme ça qu'on tient une maison. Voilà un petit coup de pouce pour la prochaine machine. Ne le dépense pas en chocolats.", cadeau: { argent: 600 } },
  { titre: 'Une carte postale', texte: "Une carte postale du bord de mer : la mouette dessus, c'est moi qui l'ai choisie. Ici, le café est imbuvable. Je pense au tien tous les matins. J'ai écrit à la Gazette pour leur dire de passer te voir.", cadeau: { notoriete: .15 } },
  { titre: 'Un coup de main', texte: "Je sais que les débuts sont durs, j'ai connu ça en 1968. On n'avait pas un sou et ton grand-père réparait la machine avec une épingle à cheveux. Prends ça, et paie-toi un bon repas avant de tout remettre dans le café.", cadeau: { argent: 1000 } },
  { titre: 'Mon secret', texte: "Il est temps que je te dise mon secret. Ce n'est pas le grain, ni la machine. Chaque matin, je saluais chaque client par son prénom, même ceux que je ne connaissais pas encore : je leur en inventais un. Les gens reviennent là où on les attend. Maintenant, c'est ton café. Je suis fière de toi.", cadeau: { secret: true } },
];
// Le secret de mamie : les clients se sentent attendus
export const SECRET_MAMIE = { clients: .05 };
// Après les 7 lettres de mamie, le quartier écrit à son tour : un mot gentil et un pourboire collectif
export const LETTRES_QUARTIER = [
  { de: 'La fleuriste', texte: 'Merci pour les cafés offerts pendant l’inventaire. Voilà de quoi en offrir d’autres.' },
  { de: 'Le club de pétanque', texte: 'Le club a fait une cagnotte pour son café préféré. Monsieur Bernard a insisté pour l’apporter lui-même.' },
  { de: 'La bibliothécaire', texte: 'Le club de lecture se réunit maintenant chez vous. Voici notre participation au chauffage !' },
  { de: 'Les voisins du 3e', texte: 'L’odeur du café nous réveille chaque matin. On ne s’en plaint pas : on vous remercie.' },
  { de: 'L’école du quartier', texte: 'Les parents d’élèves ont adoré la kermesse avec vos chocolats chauds. Merci !' },
];
export const LETTRE_QUARTIER = { min: 150, part: .15 };   // le pourboire du quartier : une part de la recette moyenne d'une journée

// Les histoires des habitués : 4 chapitres chacun. Un chapitre s'ouvre quand l'habitué est venu assez souvent,
// et au plus un nouveau chapitre par habitué et par jour réel. Le dernier offre un cadeau permanent.
// avis : des avis 5 ★ en plus ; argent : un pourboire
export const AMITIE = { visites: [2, 6, 12, 20] };
export const CADEAUX_HABITUES = { photo: { ambiance: .25 }, etudiants: { clients: .06 }, velos: { clients: .08 }, guide: { ambiance: .2, notoriete: .2 } };
export const HISTOIRES_HABITUES = [
  { id: 'bernard', nom: 'Monsieur Bernard', icone: '👴', qui: ['bernard'], cadeau: { id: 'photo', nom: 'La photo de 1987', effet: 'Accrochée au mur : la salle est plus chaleureuse (+ ambiance).' }, chapitres: [
    { titre: 'Depuis 1987', texte: "« Vous savez, je suis venu ici pour la première fois en 1987. Avec Simone, ma femme. Votre grand-mère nous avait offert le café parce qu'on venait de se fiancer. Simone n'est plus là, mais moi, je reviens. Toujours à la même table, près de la fenêtre. »", argent: 40 },
    { titre: 'Le club de pétanque', texte: "« J'ai parlé de votre café au club. Ils sont un peu bougons, mes copains, mais ils ont bon goût. Ils viendront samedi. Prévoyez des petits noirs bien serrés, et ne leur parlez pas de la finale de 2019. »", avis: 25 },
    { titre: 'Les mots croisés', texte: "« Le matin, je fais les mots croisés de la Gazette ici. Chez moi, c'est trop calme. Ici, il y a le bruit des tasses, les gens qui discutent… Ça me tient compagnie. Huit lettres, “lieu où l'on se sent chez soi” ? Ah ! B-I-S-T-R-O-T… non, ça fait sept. »", argent: 80 },
    { titre: 'La vieille photo', texte: "Monsieur Bernard pose un cadre sur le comptoir. Une photo jaunie : le café en 1987, et votre grand-mère, toute jeune, derrière le bar. « Je l'ai gardée trente ans dans un tiroir. Elle est mieux ici. Accrochez-la, s'il vous plaît. »" },
  ] },
  { id: 'ines', nom: 'Inès', icone: '🎓', qui: ['ines'], cadeau: { id: 'etudiants', nom: 'Le club des étudiants', effet: 'Les amis d’Inès révisent chez toi : +6 % de clients.' }, chapitres: [
    { titre: 'La table du fond', texte: "« Je peux rester un peu ? Je révise mes partiels de droit, et à la bibliothèque, il y a un monsieur qui renifle toutes les trente secondes. Ici, ça sent bon et personne ne renifle. Enfin, presque personne. »", argent: 30 },
    { titre: 'Le partiel raté', texte: "Inès arrive les yeux rouges. « J'ai raté mon partiel de droit civil. Huit sur vingt. » Tu lui sers un chocolat chaud, offert. Le soir, tu trouves un mot sous sa tasse : « Merci. Je n'abandonne pas. »", avis: 15 },
    { titre: 'Seize sur vingt', texte: "« SEIZE ! J'ai eu seize au rattrapage ! » Inès saute partout dans la salle et renverse presque un cappuccino. « C'est grâce à votre table du fond, j'en suis sûre. Je vais le dire à toute ma promo. »", argent: 120 },
    { titre: 'Le club des étudiants', texte: "« On a monté un club de révision, et on a voté : ce sera ici, tous les après-midi. On sera sages, promis. Enfin, on consommera beaucoup, surtout. » Une dizaine d'étudiants s'installent déjà avec leurs fiches." },
  ] },
  { id: 'livreurs', nom: 'Karim et Yanis', icone: '🚲', qui: ['karim', 'yanis'], cadeau: { id: 'velos', nom: 'Les Frères Pédale', effet: 'Karim et Yanis livrent tes cafés dans le quartier : +8 % de clients.' }, chapitres: [
    { titre: 'Qui paie ?', texte: "« C'est lui qui paie. » « Non, c'est toi, j'ai payé hier. » « Hier, c'était le croissant, ça ne compte pas. » Karim et Yanis, cousins et livreurs à vélo, se disputent l'addition chaque matin depuis 2016. Ils finissent par laisser un pourboire chacun.", argent: 30 },
    { titre: 'Le vélo volé', texte: "Yanis arrive à pied, furieux. « On m'a volé mon vélo devant la pharmacie ! » Karim lui tend les clés du sien : « Prends le mien, je ferai mes livraisons en courant. Ça me fera les mollets. »", avis: 15 },
    { titre: 'Le grand projet', texte: "Ils étalent un plan sur la table. « On veut lancer notre service de livraison. Rien que nous deux, à vélo, dans le quartier. Et on se disait… si on commençait par livrer vos cafés aux bureaux d'à côté ? » Ils te regardent avec des yeux pleins d'espoir.", argent: 90 },
    { titre: 'Les Frères Pédale', texte: "Deux vélos tout neufs, peints aux couleurs de {cafe}, attendent devant la vitrine. « Les Frères Pédale sont en service ! » Ils partent livrer leurs dix premiers cafés de la matinée. Les bureaux d'en face en redemandent déjà." },
  ] },
  { id: 'lefevre', nom: 'Madame Lefèvre', icone: '🖋️', qui: ['lefevre'], cadeau: { id: 'guide', nom: 'Recommandé par le guide', effet: 'L’article de Madame Lefèvre : + ambiance et + notoriété.' }, chapitres: [
    { titre: 'Le carnet noir', texte: "Madame Lefèvre goûte son espresso en silence, puis écrit trois lignes dans un petit carnet noir. Elle referme le carnet d'un coup sec. « Ce n'est pas pour vous. C'est pour moi. » Elle laisse un pourboire exact au centime.", argent: 40 },
    { titre: 'La première critique', texte: "« Je vais vous faire une confidence. Ma toute première critique, en 1979, c'était sur ce café. Votre grand-mère m'avait servi un espresso parfait, et j'avais écrit qu'il était “correct”. J'étais jeune et bête. Je ne l'ai jamais oublié. »", avis: 20 },
    { titre: 'Un sourire', texte: "« Quel est votre secret ? » Tu lui montres ton grain, ta machine, ta façon de tasser. Elle écoute, sans rien noter cette fois. Puis, pour la première fois, Madame Lefèvre sourit. Ça ne dure qu'une seconde, mais tout le monde l'a vu.", argent: 100 },
    { titre: 'L’article', texte: "La Gazette publie un article de Madame Lefèvre : « {cafe}, la renaissance d'une adresse. Le meilleur espresso du quartier, et je pèse mes mots. » Elle te tend le journal : « Cette fois, j'ai écrit “parfait”. Il était temps. »" },
  ] },
];
