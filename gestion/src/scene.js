// Scène 3D du café (Three.js). Lit l'état du jeu, ne le modifie jamais.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { nomCafe, prixEffectif, neige, murActuel, solActuel, formuleDuMoment, a, tierMachine, nbMachines, tierMoulin, debitStation, debitMax, panier, pleut, choisirHabitue, cafemaxOuvert, capaciteReserve, prixProduit, produitActif, CATALOGUE_CARTE, partsCarte, ratioPrixCarte, satisfaction, ouvert, avanceeJournee, CATALOGUE_MACHINES } from './game.js';
import { G, VILLES, INFOS_VILLES } from './data.js';
import { Grille } from './chemins.js';

// Modèles 3D générés par Blender (tools/blender/modeles.py). Si un fichier manque, on garde les formes simples.
const NOMS_MODELES = ['machine_occasion', 'machine_neuve', 'machine_pro', 'moulin_manuel', 'moulin_electrique', 'torrefacteur',
  'personnage', 'table', 'table_vieille', 'chaise', 'chaise_vieille', 'plante', 'parasol_framboise', 'parasol_sauge', 'sac', 'caisse', 'tasse',
  'vitrine', 'ardoise', 'cadres', 'lampadaire', 'arbre', 'banc', 'velo', 'cafemax',
  'machine_levier', 'machine_robot', 'cheminee', 'jukebox', 'lustre', 'chauffage', 'chien',
  // modèles KayKit (Kay Lousberg, CC0), convertis par tools/blender/kaykit.py
  'tabouret', 'etagere_deco', 'etagere_petite', 'cadre_a', 'cadre_b', 'lampadaire_salon', 'fauteuil', 'canape', 'table_basse', 'tapis_raye',
  'cactus', 'cactus_petit', 'livres', 'bocal_a', 'bocal_b', 'bocal_c', 'assiette', 'menu', 'caisse_pains', 'caisse_bois',
  'route', 'route_passage', 'voiture_a', 'voiture_b', 'voiture_taxi', 'voiture_c', 'buisson', 'borne_incendie', 'benne',
  'immeuble_a', 'immeuble_b', 'immeuble_c', 'immeuble_d', 'immeuble_e', 'immeuble_f', 'immeuble_g', 'immeuble_h'];
// Les animations des modèles (personnage : marche, repos, assis, travail), gardées à part
const ANIMS = {};
async function chargerModeles(surProgression) {
  const chargeur = new GLTFLoader(), M = {};
  let faits = 0;
  await Promise.all(NOMS_MODELES.map(n => chargeur.loadAsync(`assets/models/${n}.glb`).then(g => { M[n] = g.scene; ANIMS[n] = g.animations || []; }).catch(() => {})
    .finally(() => surProgression?.(++faits / NOMS_MODELES.length))));
  return M;
}

// Couleurs de l'éclairage selon le moment de la journée (matin, midi, après-midi, soirée)
const AMBIANCES = [
  { fond: 0xBFE6F5, soleil: 0xFFE2B0, iSoleil: 2.4, iCiel: 1.15, fenetre: 0xFFE2B8, lampes: .6 },
  { fond: 0xA9DDF3, soleil: 0xFFF4DE, iSoleil: 2.8, iCiel: 1.25, fenetre: 0xCFE9E2, lampes: .4 },
  { fond: 0xF6D9B0, soleil: 0xFFCF8A, iSoleil: 2.5, iCiel: 1.1, fenetre: 0xFFD7A0, lampes: .7 },
  { fond: 0x8C8FC9, soleil: 0x9FA8D8, iSoleil: .9, iCiel: .7, fenetre: 0x4E5A8A, lampes: 1.6 },
];

const C = { lait: 0xFFFDF8, cafe: 0x4A2E1F, caramel: 0xC8874A, caramelF: 0xA86A33, sauge: 0x8FA98B,
            framboise: 0xD9695F, miel: 0xE8B54A, bois: 0x8A5A3A, cuivre: 0xC07A45, peau: 0xF2C9A5 };
const COULEUR_SAC = { premier: 0xA89880, robusta: C.caramel, arabica: 0xB9A07A, moka: 0x8FA98B, bourbon: 0xE8B54A, geisha: 0x9C6B8E };
const HABITS = [0x4FA3E0, 0xF2B632, 0xE8584F, 0x6CC04A, 0xA77BDB, 0x2FB8B0, 0xF28A3A, 0xF06FA8];
const CHEVEUX = [0x4A2E1F, 0x2B1B12, 0xE9E1DA, 0x8A4B2B, 0xD9A35C, 0x1E1E1E];
const PEAUX = [0xF2C9A5, 0xE0B08A, 0xC99A78, 0x9C6B4A, 0xF5D3B8];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
// Mesures des personnages selon le modèle : hauteur assise, au-dessus de la tête, main (hauteur, côté), taille de la tasse,
// centre et échelle de la tête (pour poser les chapeaux dessinés pour l'ancienne tête), cou (hauteur, rayon), hanche (hauteur, côté), épaule
const FORMES = {
  cartoon: { assis: -.07, tete: 1.62, main: [.62, .27], tasse: .9, teteC: 1.18, teteS: 1.16, teteSy: 1, cou: [.98, .09], hanche: [.62, .3], epaule: .98 },
  realiste: { assis: -.42, tete: 1.95, main: [.8, .23], tasse: .7, teteC: 1.66, teteS: .48, teteSy: 1.08, cou: [1.46, .075], hanche: [.98, .27], epaule: 1.46 },
};

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, metalness: 0, ...o });
const ombre = m => { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };
const rbox = (w, h, d, c, r = .08) => ombre(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), mat(c)));
const cyl = (rt, rb, h, c, s = 20) => ombre(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat(c)));
const sph = (r, c) => ombre(new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat(c)));

function texture(w, h, dessin) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dessin(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// Copie d'un modèle à squelette : chaque copie a ses propres os (même principe que SkeletonUtils.clone de three.js)
function clonerAvecOs(source) {
  const copie = source.clone(true), versCopie = new Map(), versSource = new Map();
  const parcourir = (a, b) => { versCopie.set(a, b); versSource.set(b, a); a.children.forEach((c, k) => parcourir(c, b.children[k])); };
  parcourir(source, copie);
  copie.traverse(n => {
    if (!n.isSkinnedMesh) return;
    const s = versSource.get(n);
    n.skeleton = s.skeleton.clone(); n.bindMatrix.copy(s.bindMatrix);
    n.skeleton.bones = s.skeleton.bones.map(b => versCopie.get(b));
    n.bind(n.skeleton, n.bindMatrix);
  });
  return copie;
}
// Passe en douceur d'une animation à l'autre (marche, repos, assis, travail) ; « vitesse » règle la cadence
function jouer(p, nom, vitesse = 1) {
  const an = p.userData.anim; if (!an) return;
  const act = an.actions[nom]; if (!act) return;
  act.timeScale = vitesse;
  if (an.courant === act) return;
  act.reset().setEffectiveWeight(1).fadeIn(.25).play();
  if (an.courant) an.courant.fadeOut(.25);
  an.courant = act;
}

// Un personnage qui marche d'un point à l'autre, en contournant les meubles (grille et A*) et en évitant les autres personnes
class Marcheur {
  static tous = new Set();     // tous les marcheurs présents, pour s'éviter entre eux
  static grille = null;        // la carte des obstacles du café (src/chemins.js)
  constructor(obj, vitesse) { this.o = obj; this.vitesse = vitesse; this.chemin = []; this.attente = 0; this.t = Math.random() * 10; this.patience = 0; this.bouge = false; Marcheur.tous.add(this); }
  quitter() { Marcheur.tous.delete(this); }
  aller(...pts) { this.chemin.push(...pts); return this; }
  libre() { return this.chemin.length === 0 && this.attente <= 0; }
  // Bras et jambes : balancent en marchant, se replient quand on est assis
  membres(marche) {
    // personnage animé : on choisit simplement son animation, la cadence de marche suit sa vitesse
    if (this.o.userData.anim) { jouer(this.o, this.assis ? 'assis' : marche ? 'marche' : 'repos', marche ? 1.25 * this.vitesse / 1.8 : 1); return; }
    const mb = this.o.userData.membres; if (!mb || !mb.jg) return;
    const a = marche ? Math.sin(this.t * 11) * .55 : 0;
    const jambes = this.assis ? -1.5 : a;
    mb.jg.rotation.x = jambes; mb.jd.rotation.x = this.assis ? -1.5 : -a;
    // genoux : pliés à angle droit assis, légèrement en marchant (jambe qui revient)
    if (mb.kg) { mb.kg.rotation.x = this.assis ? 1.5 : Math.max(0, -a) * .9; mb.kd.rotation.x = this.assis ? 1.5 : Math.max(0, a) * .9; }
    if (mb.bg) { mb.bg.rotation.x = this.assis ? -.5 : -a * .8; mb.bd.rotation.x = this.assis ? -.5 : a * .8; }
  }
  maj(dt, facteur = 1) {
    const o = this.o;
    this.bouge = false;
    if (this.attente > 0) { this.attente -= dt * Math.max(facteur, .05); o.position.y = this.assis ? (o.userData.forme ? o.userData.forme.assis : .1) : 0; this.membres(false); return; }
    let p = this.chemin[0];
    if (!p) { o.position.y = 0; this.membres(false); return; }
    this.assis = false;
    // La première fois qu'on vise un point, on calcule un chemin qui contourne les meubles (sauf pour s'asseoir : la chaise est là)
    if (!p.vu && !p.assis && Marcheur.grille) {
      p.vu = true;
      const route = Marcheur.grille.chemin(o.position.x, o.position.z, p.x, p.z);
      if (route.length > 1) { this.chemin.unshift(...route.slice(0, -1).map(q => ({ x: q.x, z: q.z, vu: true }))); p = this.chemin[0]; }
    }
    const dx = p.x - o.position.x, dz = p.z - o.position.z, d = Math.hypot(dx, dz), pas = this.vitesse * facteur * dt;
    // Les autres : on s'écarte de ceux qui sont tout près, et on attend son tour si quelqu'un est arrêté juste devant
    let mx = d > 0 ? dx / d : 0, mz = d > 0 ? dz / d : 0, ax = 0, az = 0, bloque = false;
    for (const a of Marcheur.tous) {
      if (a === this || a.fini || a.assis || !a.o.parent || !a.o.visible) continue;
      const ox = a.o.position.x - o.position.x, oz = a.o.position.z - o.position.z, dd = Math.hypot(ox, oz);
      if (dd > .6 || dd < 1e-4) continue;
      const devant = (ox * mx + oz * mz) / dd;
      if (devant > .7 && dd < .5 && !a.bouge && d > .35) bloque = true;
      const f = (.6 - dd) / .6; ax -= ox / dd * f; az -= oz / dd * f;
      // quelqu'un en face : on se décale sur sa droite (comme dans la rue), sinon on se pousserait seulement d'avant en arrière
      if (devant > .3) { ax -= mz * f * 1.2; az += mx * f * 1.2; }
    }
    if (bloque && this.patience < 1.5) { this.patience += dt * Math.max(facteur, .2); o.position.y = 0; this.membres(false); return; }
    if (!bloque) this.patience = Math.max(0, this.patience - dt);
    if ((ax || az) && (d > .3 || (!p.fn && !p.attente && !p.assis))) {
      let nx = mx + ax * 1.3, nz = mz + az * 1.3; const n = Math.hypot(nx, nz) || 1; nx /= n; nz /= n;
      const g = Marcheur.grille;   // on ne s'écarte pas dans un meuble
      if (!g || g.libre(o.position.x + nx * .25, o.position.z + nz * .25)) { mx = nx; mz = nz; }
    }
    this.bouge = true;
    if (d <= pas) {
      o.position.x = p.x; o.position.z = p.z; o.position.y = 0;
      this.chemin.shift();
      if (p.face !== undefined) o.rotation.y = p.face;
      this.assis = !!p.assis;
      if (p.attente) this.attente = p.attente;
      if (p.fn) p.fn(this);
      return;
    }
    o.position.x += mx * pas; o.position.z += mz * pas;
    let diff = Math.atan2(mx, mz) - o.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); o.rotation.y += diff * Math.min(1, dt * 12);
    this.t += dt * facteur; o.position.y = Math.abs(Math.sin(this.t * 11)) * (o.userData.membres ? .015 : .03);
    this.membres(true);
  }
}

export async function creerScene(conteneur, { surStation, surPop, fmt, surHabitue = () => {}, surProgression, surHumeur = () => {}, surClient = () => {} }) {
  const M = await chargerModeles(surProgression);
  // Copie d'un modèle, avec ses ombres ; « couleurs » recolore les matériaux par nom (habit, peau, cheveux…)
  function modele(nom, couleurs = {}) {
    if (!M[nom]) return null;
    const o = ANIMS[nom]?.length ? clonerAvecOs(M[nom]) : M[nom].clone(true);
    o.traverse(m => {
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      if (m.material.metalness > .3 && !m.material.envMap) { m.material.envMap = reflets; m.material.envMapIntensity = .9; }
      if (couleurs[m.material.name] !== undefined) { m.material = m.material.clone(); m.material.color.setHex(couleurs[m.material.name]); }
    });
    return o;
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  conteneur.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xEFDDC8);
  // Reflets doux, réservés au métal (chrome, cuivre, laiton) pour ne pas délaver les murs
  const reflets = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  const put = (o, x, y, z, p) => { o.position.set(x, y, z); (p || scene).add(o); return o; };
  const grp = (p, x = 0, y = 0, z = 0) => put(new THREE.Group(), x, y, z, p);

  // ---- Caméra isométrique, glissable au doigt ----
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100);
  const cible = new THREE.Vector3(-1.8, 0, .6);
  const DIR_CAM = new THREE.Vector3(10, 15, 10).normalize().multiplyScalar(30);
  let largeurVue = 9.5, zoom = 1;
  const limites = { x: [-4, 5.5], z: [-3, 6.5] };
  const placerCam = () => { cam.position.copy(cible).add(DIR_CAM); cam.lookAt(cible); };
  // Post-traitement (graphismes « beaux ») : un halo doux autour de ce qui brille (lampes, lanternes, guirlande)
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, cam));
  const halo = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .3, .45, 1.2);
  // Étalonnage : couleurs un peu moins saturées et coins assombris, comme une photo
  const etalonnage = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, force: { value: .12 }, couleur: { value: 1.22 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float force; uniform float couleur; varying vec2 vUv;
      void main() { vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - .5;
        float l = dot(c.rgb, vec3(.299, .587, .114)); c.rgb = mix(vec3(l), c.rgb, couleur);
        c.rgb *= 1.0 - force * dot(d, d) * 2.4; gl_FragColor = c; }`,
  });
  composer.addPass(halo); composer.addPass(etalonnage); composer.addPass(new OutputPass());
  let hauteQualite = true;
  function redim() {
    const w = innerWidth, h = innerHeight, r = w / h;
    if (!w || !h) return;   // fenêtre réduite à rien (onglet replié) : on attend sa vraie taille
    const base = largeurVue * zoom;
    const largeur = r < 1 ? base : Math.max(base * 1.35, base * 1.25 * r);
    const hauteur = largeur / r;
    const decalage = hauteur * (r < 1 ? .05 : .1);   // laisse la place au bandeau du haut
    // En paysage, la colonne de droite (panneaux, boutons) cache une partie de l'écran : on recentre le café dans la place libre
    const colonne = r >= 1 && w >= 760 ? Math.min(420, w * .4) * .45 * largeur / w : 0;
    Object.assign(cam, { left: -largeur / 2 + colonne, right: largeur / 2 + colonne, top: hauteur / 2 + decalage, bottom: -hauteur / 2 + decalage });
    cam.updateProjectionMatrix(); placerCam();
    renderer.setSize(w, h);
    composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h);
  }
  addEventListener('resize', redim);

  const ciel = new THREE.HemisphereLight(0xFFF6E6, 0x9BC46A, 1.15);
  scene.add(ciel);
  const soleil = new THREE.DirectionalLight(0xFFE2BC, 2.5);
  soleil.position.set(7, 14, 9);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  soleil.shadow.bias = -0.0008;
  scene.add(soleil);
  soleil.shadow.normalBias = .02;
  // Lumière de contour, froide et douce, venue de l'arrière : elle détache les personnages et les meubles du fond
  const contour = new THREE.DirectionalLight(0xC9DAFF, .45); contour.position.set(-9, 8, -10); scene.add(contour);
  // Ombre de contact : une tache douce sous chaque personnage, pour qu'il pose bien au sol
  const texOmbre = texture(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(40,25,15,.55)'); r.addColorStop(.6, 'rgba(40,25,15,.22)'); r.addColorStop(1, 'rgba(40,25,15,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const matOmbre = new THREE.MeshBasicMaterial({ map: texOmbre, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const geoOmbre = new THREE.PlaneGeometry(.75, .75);
  function ombreContact(p) { const o = new THREE.Mesh(geoOmbre, matOmbre); o.rotation.x = -Math.PI / 2; o.position.y = .015; o.renderOrder = -1; p.add(o); return o; }

  // ---- Textures dessinées ----
  // Hasard fixe (toujours le même dessin) pour les textures
  const hasardTex = (graine => () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647; })(97);
  // Parquet : lames de teintes un peu différentes (entre c1 et c2), veinage, nœuds et joints
  const mixHex = (a, b, t) => { const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), m = s => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t); return `rgb(${m(16)},${m(8)},${m(0)})`; };
  function dessinParquet(g, w, c1, c2, H) {
    for (let i = 0; i < w / H; i++) {
      let x = -hasardTex() * H * 5;
      while (x < w) {
        const long = H * (4 + hasardTex() * 5), t = hasardTex();
        g.fillStyle = mixHex(c1, c2, t); g.fillRect(x, i * H, long, H);
        g.fillStyle = `rgba(${t < .5 ? '255,240,220' : '60,35,20'},${.03 + hasardTex() * .05})`; g.fillRect(x, i * H, long, H);
        for (let v = 0; v < 9; v++) {   // veines du bois
          g.strokeStyle = `rgba(110,70,40,${.05 + hasardTex() * .08})`; g.lineWidth = 1 + hasardTex() * 1.5; g.beginPath();
          const y0 = i * H + 4 + hasardTex() * (H - 8); g.moveTo(x, y0);
          g.bezierCurveTo(x + long * .3, y0 + (hasardTex() - .5) * 10, x + long * .7, y0 + (hasardTex() - .5) * 10, x + long, y0 + (hasardTex() - .5) * 6); g.stroke();
        }
        if (hasardTex() < .3) { g.fillStyle = 'rgba(90,55,30,.18)'; g.beginPath(); g.ellipse(x + long * hasardTex(), i * H + H / 2, 6, 3, 0, 0, Math.PI * 2); g.fill(); }   // nœud
        g.fillStyle = 'rgba(60,35,20,.35)'; g.fillRect(x, i * H, 2, H);   // joint de bout
        x += long;
      }
      g.fillStyle = 'rgba(60,35,20,.3)'; g.fillRect(0, i * H, w, 2);   // joint entre les lames
      g.fillStyle = 'rgba(255,240,220,.06)'; g.fillRect(0, i * H + 2, w, 3);
    }
  }
  const texSol = texture(512, 512, (g, w) => dessinParquet(g, w, '#D7B089', '#C49A70', 32));
  texSol.wrapS = texSol.wrapT = THREE.RepeatWrapping; texSol.repeat.set(1.5, 1);
  // Mur peint : un enduit légèrement irrégulier (plus de rayures de papier peint)
  const texMurNeuf = texture(256, 256, (g, w, h) => {
    g.fillStyle = '#F4E6D4'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 900; k++) { const c = hasardTex() < .5 ? '255,250,240' : '150,120,90'; g.fillStyle = `rgba(${c},${.03 + hasardTex() * .05})`; g.fillRect(hasardTex() * w, hasardTex() * h, 2 + hasardTex() * 6, 2 + hasardTex() * 6); }
    const bas = g.createLinearGradient(0, h * .7, 0, h); bas.addColorStop(0, 'rgba(120,90,60,0)'); bas.addColorStop(1, 'rgba(120,90,60,.1)'); g.fillStyle = bas; g.fillRect(0, h * .7, w, h * .3);
  });
  const texMurVieux = texture(256, 256, (g, w, h) => {
    g.fillStyle = '#D8C9A8'; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(120,95,55,${.06 + (k % 4) * .03})`; g.beginPath(); g.ellipse((k * 67) % w, (k * 41) % h, 18 + k % 5 * 6, 10 + k % 3 * 8, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(90,70,40,.12)'; g.fillRect(0, h - 30, w, 30);
  });
  [texMurNeuf, texMurVieux].forEach(tx => { tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(5, 1); });
  const texEnseigne = (neuve, nom = 'Le Petit Grain') => texture(512, 128, (g, w, h) => {
    g.fillStyle = neuve ? '#4A2E1F' : '#8B7B6A'; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, neuve ? 56 : 10); g.fill();
    g.fillStyle = neuve ? '#F6EBDD' : '#D9CDBE'; g.font = `${neuve ? 600 : 500} 58px Fredoka, Nunito, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    // le nom du café ; sur la vieille enseigne, quelques lettres sont tombées
    const texte = neuve ? nom : [...nom].map((c, k) => k % 4 === 3 && c !== ' ' ? ' ' : c).join('');
    let taille = 58; g.font = `${neuve ? 600 : 500} ${taille}px Fredoka, Nunito, sans-serif`;
    while (g.measureText(texte).width > w - 60 && taille > 22) { taille -= 2; g.font = `${neuve ? 600 : 500} ${taille}px Fredoka, Nunito, sans-serif`; }
    g.fillText(texte, w / 2, h / 2 + 4);
    if (!neuve) { g.strokeStyle = 'rgba(60,45,30,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 20); g.lineTo(120, 100); g.stroke(); }
  });
  const texTravaux = texture(256, 128, (g, w, h) => {
    g.fillStyle = '#E8B54A'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4A2E1F'; for (let x = -h; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 0); g.lineTo(x + 20 + h, h); g.lineTo(x + h, h); g.fill(); }
    g.fillStyle = '#FFFDF8'; g.fillRect(28, 34, w - 56, 60);
    g.fillStyle = '#4A2E1F'; g.font = '600 34px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TRAVAUX', w / 2, h / 2 + 2);
  });

  // ---- Structure fixe ----
  const matSol = mat(0xffffff, { map: texSol });
  put(ombre(new THREE.Mesh(new THREE.BoxGeometry(12, .3, 8), matSol)), 0, -.15, 0);
  put(rbox(12.6, .5, 8.6, C.caramelF, .15), 0, -.45, 0);
  const matMur = mat(0xffffff, { map: texMurVieux });
  put(ombre(new THREE.Mesh(new THREE.BoxGeometry(12, 3.3, .25), matMur)), 0, 1.65, -4.12);
  put(ombre(new THREE.Mesh(new THREE.BoxGeometry(.25, 3.3, 8), matMur)), -6.12, 1.65, 0);
  const matPlinthe = mat(0x9C8466);
  put(ombre(new THREE.Mesh(new RoundedBoxGeometry(12, 1.0, .32, 3, .04), matPlinthe)), 0, .5, -4.1);
  put(ombre(new THREE.Mesh(new RoundedBoxGeometry(.32, 1.0, 8, 3, .04), matPlinthe)), -6.1, .5, 0);
  put(rbox(12.1, .12, .4, C.caramelF, .03), 0, 1.02, -4.06);
  put(rbox(.4, .12, 8.1, C.caramelF, .03), -6.06, 1.02, 0);
  put(rbox(2.6, 1.6, .14, C.caramelF, .1), 3.6, 2.0, -3.96);
  const vitre = put(new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.3), mat(0xCFE6DD, { emissive: 0xBFE0D4, emissiveIntensity: .5 })), 3.6, 2.0, -3.88);
  put(rbox(.08, 1.3, .06, C.caramelF, .02), 3.6, 2.0, -3.86);
  put(rbox(2.3, .08, .06, C.caramelF, .02), 3.6, 2.0, -3.86);
  const enseigne = put(new THREE.Mesh(new THREE.PlaneGeometry(3.0, .75), new THREE.MeshBasicMaterial({ map: texEnseigne(false), transparent: true })), -.1, 2.7, -3.98);
  put(rbox(1.2, .04, .9, C.sauge, .03), 1.0, .02, 3.5);

  // ---- La rue : trottoir pavé, lampadaires, arbres, banc ----
  const texPaves = texture(256, 256, (g, w, h) => {
    g.fillStyle = '#D9CDBB'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(120,100,80,.25)'; g.lineWidth = 3;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke(); }
    for (let r = 0; r < 4; r++) for (let k = 0; k <= 4; k++) { const x = k * 64 + (r % 2) * 32; g.beginPath(); g.moveTo(x, r * 64); g.lineTo(x, r * 64 + 64); g.stroke(); }
  });
  texPaves.wrapS = texPaves.wrapT = THREE.RepeatWrapping;
  const matsTrottoir = [];   // ils blanchissent sous la neige
  function trottoir(l, p, x, z) {
    const t = texPaves.clone(); t.needsUpdate = true; t.repeat.set(l / 2, p / 2);
    const m = mat(0xffffff, { map: t, emissive: 0xE4EAF2, emissiveIntensity: 0 }); matsTrottoir.push(m);
    put(ombre(new THREE.Mesh(new THREE.BoxGeometry(l, .5, p), m)), x, -.31, z);
  }
  trottoir(16.5, 4.4, 1.0, 6.5); trottoir(2.9, 13, 7.75, -2.1);
  // Une grande pelouse bien verte tout autour, semée de touffes et de fleurs
  const texHerbe = texture(512, 512, (g, w) => {
    g.fillStyle = '#7CC24A'; g.fillRect(0, 0, w, w);
    for (let k = 0; k < 2600; k++) { const x = Math.random() * w, y = Math.random() * w, t = Math.random(); g.fillStyle = t < .5 ? 'rgba(98,170,52,.55)' : 'rgba(150,212,92,.5)'; g.fillRect(x, y, 2 + t * 3, 5 + t * 6); }
    for (let k = 0; k < 40; k++) { const x = Math.random() * w, y = Math.random() * w; g.fillStyle = ['#FFFFFF', '#FFE45C', '#FF8FB8'][k % 3]; g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#F2B632'; g.beginPath(); g.arc(x, y, 1.4, 0, Math.PI * 2); g.fill(); }
  });
  texHerbe.wrapS = texHerbe.wrapT = THREE.RepeatWrapping; texHerbe.repeat.set(10, 10);
  const pelouse = put(new THREE.Mesh(new THREE.PlaneGeometry(70, 70), mat(0xffffff, { map: texHerbe, roughness: 1 })), 0, -.09, 0); pelouse.rotation.x = -Math.PI / 2; pelouse.receiveShadow = true;
  put(rbox(16.5, .14, .2, 0xB8AA96, .03), 1.0, -.1, 8.7);
  const lumieresRue = [], lanternes = [];
  [[7.7, 5.0], [-6.5, 8.0]].forEach(([x, z]) => {
    const l = modele('lampadaire'); if (!l) return;
    put(l, x, -.06, z);
    l.traverse(o => { if (o.isMesh && o.material.name === 'lanterne') { o.material = o.material.clone(); lanternes.push(o.material); } });
    lumieresRue.push(put(new THREE.PointLight(0xFFD9A0, 0, 7, 1.6), x, 2.9, z));
  });
  [[7.9, -2.2], [3.6, 8.1]].forEach(([x, z]) => { const t = modele('arbre'); if (t) put(t, x, -.06, z); });
  const bancM = modele('banc'); if (bancM) { bancM.rotation.y = -Math.PI / 2; put(bancM, 7.7, -.06, 1.6); }

  // ---- Décor qui dépend des travaux ----
  const D = {};
  D.cloison = grp(scene);
  put(rbox(.16, 2.6, 8.0, 0xB08A62, .04), 2.15, 1.3, 0, D.cloison);
  for (let z = -3.5; z <= 3.5; z += .5) put(rbox(.2, 2.6, .05, 0x9A7550, .02), 2.15, 1.3, z, D.cloison);
  put(new THREE.Mesh(new THREE.PlaneGeometry(1.6, .8), new THREE.MeshBasicMaterial({ map: texTravaux })), 2.05, 1.6, .5, D.cloison).rotation.y = -Math.PI / 2;
  D.cartons = grp(scene);
  // Cartons de déménagement : carton brun, bande de scotch sur le dessus et un rabat
  [[3.3, -2.5, .9], [4.2, -2.2, .7], [3.6, 1.8, .8], [4.6, 2.8, .6], [3.8, -2.4, .5]].forEach(([x, z, s], k) => {
    const y = s * .4 + (k === 4 ? .7 : 0), c = grp(D.cartons, x, y, z); c.rotation.y = (k * 1.3) % .5 - .25;
    put(rbox(s, s * .8, s, k % 2 ? 0xB89470 : 0xA9825C, .01), 0, 0, 0, c);
    put(rbox(.09, .006, s + .01, 0xD8C8A4, .002), 0, s * .4 + .003, 0, c);
    put(rbox(s * .35, .004, .2, 0xE9E2D4, .002), s * .2, s * .4 + .004, s * .25, c);   // étiquette
  });
  function plante(x, z, s, parent) {
    const g = grp(parent, x, 0, z);
    const p = modele('plante'); if (p) { p.scale.setScalar(s); g.add(p); return; }
    put(cyl(.26 * s, .2 * s, .42 * s, C.framboise), 0, .21 * s, 0, g);
    [[0, .7, 0, .34], [.18, .58, .1, .24], [-.17, .6, -.08, .26], [.02, .9, -.1, .2]].forEach(([u, v, w, r]) => put(sph(r * s, C.sauge), u * s, v * s, w * s, g));
  }
  D.plantes = grp(scene); plante(-5.4, 3.3, 1.1, D.plantes); plante(-5.4, -3.5, .9, D.plantes);
  D.plantesB = grp(scene); plante(5.3, -3.4, 1.0, D.plantesB); plante(5.4, 3.4, .9, D.plantesB);
  D.lampes = grp(scene);
  const lumieresLampes = [];
  [[-2.8, 2.2], [-.2, 1.4]].forEach(([x, z]) => {
    put(cyl(.012, .012, 1.6, C.cafe, 6), x, 3.3, z, D.lampes);
    put(cyl(.12, .42, .34, C.miel, 22), x, 2.45, z, D.lampes);
    put(new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 10), new THREE.MeshBasicMaterial({ color: 0xFFF3CF })), x, 2.28, z, D.lampes);
    lumieresLampes.push(put(new THREE.PointLight(0xFFD9A0, 4, 6, 1.6), x, 2.2, z, D.lampes));
  });
  D.ampoule = grp(scene);
  put(cyl(.01, .01, 1.0, C.cafe, 6), -1.6, 3.0, 1.0, D.ampoule);
  put(new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xFFF1C8 })), -1.6, 2.45, 1.0, D.ampoule);
  const lumiereAmpoule = put(new THREE.PointLight(0xFFE2B0, 2, 5, 1.8), -1.6, 2.4, 1.0, D.ampoule);
  D.etagere = grp(scene);
  put(rbox(.5, .1, 3, C.caramelF, .03), -5.75, 2.0, -1.2, D.etagere);
  [[0xE8B54A, -2.3], [0x8FA98B, -1.7], [0xD9695F, -1.1], [0xFFFDF8, -.5]].forEach(([c, z]) => put(rbox(.32, .42, .32, c, .1), -5.75, 2.26, z, D.etagere));

  // ---- Stations ----
  const ANCRES = [new THREE.Vector3(-4.85, 1.9, -2.8), new THREE.Vector3(-2.4, 2.3, -3.2), new THREE.Vector3(.4, 2.45, -1.8), new THREE.Vector3(-2.8, 1.6, 2.2)];
  const groupes = [0, 1, 2, 3].map(i => { const g = new THREE.Group(); g.userData.station = i; scene.add(g); return g; });

  const PANTALONS = [0x3E6BB0, 0x5C4A3E, 0x2F8F6B, 0x8A5A3A, 0x4A5A9E, 0xC9A86A, 0x6E86A8];
  const animes = new Set();   // les personnages animés présents (leur mélangeur avance à chaque image)
  function perso(habit, cheveux, { tablier = false, peau = C.peau, pantalon = null } = {}) {
    const p = modele('personnage', { habit, cheveux, peau, tablier: 0x8A5226, ...(pantalon ? { pantalon } : {}) });
    if (p) {
      ombreContact(p);
      const t = p.getObjectByName('tablier'); if (t) t.visible = tablier;
      const n = k => p.getObjectByName(k);
      // Personnage à squelette : une coiffure au hasard, et un mélangeur d'animations (mis à jour à chaque image)
      if (ANIMS.personnage?.length) {
        const coiffures = ['coiffure_courte', 'coiffure_longue', 'coiffure_houppette', 'coiffure_chignon'].map(n).filter(Boolean);
        const garde = pick(coiffures); coiffures.forEach(c => { c.visible = c === garde; });
        const mixer = new THREE.AnimationMixer(p), actions = {};
        ANIMS.personnage.forEach(c => { actions[c.name] = mixer.clipAction(c); });
        p.userData.anim = { mixer, actions, courant: null };
        p.userData.membres = {}; p.userData.realiste = true; p.userData.forme = FORMES.cartoon;
        jouer(p, 'repos'); mixer.update(Math.random() * 2);   // chacun respire à son rythme
        animes.add(p);
        return p;
      }
      p.userData.membres = { bg: n('bras_g'), bd: n('bras_d'), jg: n('jambe_g'), jd: n('jambe_d'), kg: n('genou_g'), kd: n('genou_d'), tete: n('tete') };
      p.userData.realiste = !!n('genou_g');
      // les mesures du modèle chargé : cartoon (grosse tête) ou réaliste (1,72 m)
      p.userData.forme = n('crane_cartoon') ? FORMES.cartoon : p.userData.realiste ? FORMES.realiste : null;
      return p;
    }
    const g = new THREE.Group();
    put(ombre(new THREE.Mesh(new THREE.CapsuleGeometry(.22, .36, 4, 12), mat(habit))), 0, .46, 0, g);
    if (tablier) put(rbox(.3, .34, .04, C.lait, .02), 0, .44, .2, g);
    put(sph(.2, peau), 0, 1.0, 0, g);
    put(ombre(new THREE.Mesh(new THREE.SphereGeometry(.212, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.05), mat(cheveux))), 0, 1.02, -.01, g);
    const oeil = new THREE.MeshBasicMaterial({ color: C.cafe });
    [-.07, .07].forEach(x => put(new THREE.Mesh(new THREE.SphereGeometry(.026, 8, 6), oeil), x, 1.0, .185, g));
    const joue = new THREE.MeshBasicMaterial({ color: 0xEBA3A0, transparent: true, opacity: .6 });
    [-.12, .12].forEach(x => put(new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), joue), x, .95, .17, g));
    return g;
  }
  function sac(c = C.caramel) {
    const m = modele('sac', { toile: c });
    if (m) { m.traverse(o => { if (o.isMesh && o.material.name === 'toile') m.userData.toile = o.material; }); return m; }
    const g = new THREE.Group();
    put(rbox(.62, .42, .46, c, .16), 0, .21, 0, g);
    put(rbox(.5, .08, .36, C.caramelF, .04), 0, .44, 0, g);
    return g;
  }

  // ---- La réserve : une vraie pièce dans le coin du fond, sol en béton, murets (coupés pour qu'on voie dedans),
  // une porte côté moulin et des étagères métalliques. Les sacs posés suivent le remplissage réel de la réserve.
  const RES = { x0: -6.0, x1: -3.7, z0: -3.95, z1: -1.6, porte: [-3.3, -2.5] };
  const reserve = grp(groupes[0]);
  const solReserve = put(new THREE.Mesh(new THREE.PlaneGeometry(RES.x1 - RES.x0, RES.z1 - RES.z0), mat(0x8F8880, { roughness: .95 })), (RES.x0 + RES.x1) / 2, .006, (RES.z0 + RES.z1) / 2, reserve);
  solReserve.rotation.x = -Math.PI / 2; solReserve.receiveShadow = true;
  const enduit = 0xE3D6C4, chapeau = 0x6B4A33, HM = 1.0;
  const muret = (x, z, lx, lz) => { put(rbox(lx, HM, lz, enduit, .015), x, HM / 2, z, reserve); put(rbox(lx + .04, .05, lz + .04, chapeau, .01), x, HM + .025, z, reserve); };
  muret((RES.x0 + RES.x1) / 2 + .05, RES.z1, RES.x1 - RES.x0 + .1, .1);                                  // muret de façade
  muret(RES.x1, (RES.z0 + RES.porte[0]) / 2, .1, RES.porte[0] - RES.z0);                                  // côté, avant la porte
  muret(RES.x1, (RES.porte[1] + RES.z1) / 2, .1, RES.z1 - RES.porte[1]);                                  // côté, après la porte
  [RES.porte[0], RES.porte[1]].forEach(z => put(rbox(.12, 2.05, .1, chapeau, .02), RES.x1, 1.025, z, reserve));   // montants de la porte
  put(rbox(.12, .1, RES.porte[1] - RES.porte[0] + .1, chapeau, .02), RES.x1, 2.05, (RES.porte[0] + RES.porte[1]) / 2, reserve);
  // la plaque « Réserve » sur le muret de façade
  const plaque = put(new THREE.Mesh(new THREE.PlaneGeometry(.7, .18), new THREE.MeshStandardMaterial({ map: texture(256, 64, (g, w, h) => {
    g.fillStyle = '#2E2622'; g.fillRect(0, 0, w, h); g.strokeStyle = '#B08A4A'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#E9DFCF'; g.font = '600 34px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RÉSERVE', w / 2, h / 2 + 2);
  }), roughness: .6 })), -4.85, .72, RES.z1 + .056, reserve);
  // étagère métallique (montants, tablettes) : base le long du mur du fond, une deuxième avec l'arrière-boutique, le long du mur de gauche
  const metal = 0x5C5F63, tablette = 0x8A8F94;
  function etagere(parent, cx, cz, long, prof, tourne) {
    const g = grp(parent, cx, 0, cz); if (tourne) g.rotation.y = Math.PI / 2;
    for (const dx of [-long / 2, long / 2]) for (const dz of [-prof / 2, prof / 2]) put(rbox(.04, 1.8, .04, metal, .008), dx, .9, dz, g);
    [.1, .7, 1.3].forEach(y => put(rbox(long, .03, prof, tablette, .006), 0, y, 0, g));
    return g;
  }
  etagere(reserve, -4.85, -3.68, 1.8, .48, false);
  D.arriere = grp(groupes[0]); etagere(D.arriere, -5.68, -2.55, 1.5, .46, true);
  D.palette = grp(groupes[0]);
  put(rbox(1.2, .13, .85, 0xA88A64, .01), -4.75, .065, -2.3, D.palette);
  [-5.2, -4.75, -4.3].forEach(x => put(rbox(.1, .1, .85, 0x8A6E4E, .01), x, .05, -2.3, D.palette));
  // Emplacements de sacs : étagère du fond (9), palette (8), étagère de gauche (6)
  const placesSacs = [];
  [.13, .73, 1.33].forEach(y => [-5.45, -4.85, -4.25].forEach(x => placesSacs.push({ x, y, z: -3.68, rot: 0, quand: () => true })));
  [.13, .41].forEach(y => [[-5.03, -2.5], [-4.47, -2.5], [-5.03, -2.1], [-4.47, -2.1]].forEach(([x, z]) => placesSacs.push({ x, y, z, rot: 0, quand: e => a(e, 'palette') })));
  [.73, 1.33, .13].forEach(y => [-2.9, -2.2].forEach(z => placesSacs.push({ x: -5.68, y, z, rot: Math.PI / 2, quand: e => a(e, 'arriere') })));
  const sacsPile = placesSacs.map(p => { const s = put(sac(), p.x, p.y, p.z, groupes[0]); s.rotation.y = p.rot + (Math.random() - .5) * .12; s.scale.setScalar(M.sac ? .9 : .8); s.userData.place = p; return s; });

  // Moulin : manivelle → électrique → torréfacteur
  const moulin = groupes[1];
  D.moulin0 = grp(moulin);
  put(rbox(1.0, .8, .7, C.bois, .05), -2.5, .4, -3.2, D.moulin0);
  put(rbox(.3, .32, .3, 0x6B4A33, .04), -2.5, .96, -3.2, D.moulin0);
  put(cyl(.12, .12, .1, 0x9C9087, 14), -2.5, 1.17, -3.2, D.moulin0);
  let manivelle = put(rbox(.04, .04, .32, 0x5a5048, .01), -2.5, 1.26, -3.05, D.moulin0);
  D.moulin1 = grp(moulin);
  put(rbox(1.0, .8, .7, C.bois, .05), -2.5, .4, -3.2, D.moulin1);
  put(ombre(new THREE.Mesh(new THREE.CylinderGeometry(.22, .26, .55, 18), mat(0xB8B4AE, { metalness: .5, roughness: .4 }))), -2.5, 1.08, -3.2, D.moulin1);
  put(ombre(new THREE.Mesh(new THREE.ConeGeometry(.24, .35, 18), mat(0x7a6a5a))), -2.5, 1.5, -3.2, D.moulin1).rotation.x = Math.PI;
  D.moulin2 = grp(moulin);
  const cuivre = () => mat(C.cuivre, { metalness: .45, roughness: .4 });
  put(rbox(1.3, .9, 1.0, C.cafe, .1), -2.5, .45, -3.1, D.moulin2);
  let tambour = put(ombre(new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .9, 24), cuivre())), -2.5, 1.32, -3.1, D.moulin2);
  tambour.rotation.z = Math.PI / 2;
  put(ombre(new THREE.Mesh(new THREE.ConeGeometry(.34, .5, 20), cuivre())), -2.5, 2.0, -3.1, D.moulin2).rotation.x = Math.PI;
  put(cyl(.09, .09, 1.2, C.cafe, 10), -2.0, 2.1, -3.55, D.moulin2);
  put(cyl(.45, .4, .18, C.caramelF), -2.5, .99, -2.45, D.moulin2);

  // Remplace un groupe de formes simples par le modèle Blender, s'il est là
  function remplacer(groupe, nom, x, z) {
    const m = modele(nom); if (!m) return null;
    groupe.clear(); put(m, x, 0, z, groupe); return m;
  }
  if (remplacer(D.moulin0, 'moulin_manuel', -2.5, -3.2)) manivelle = D.moulin0.getObjectByName('manivelle') || manivelle;
  remplacer(D.moulin1, 'moulin_electrique', -2.5, -3.2);
  if (remplacer(D.moulin2, 'torrefacteur', -2.5, -3.1)) tambour = D.moulin2.getObjectByName('tambour') || tambour;

  // Bar
  const bar = groupes[2];
  put(rbox(3.4, 1.0, .9, C.caramel, .06), .3, .5, -1.65, bar);
  put(rbox(3.55, .12, 1.08, C.bois, .04), .3, 1.06, -1.65, bar);
  [-.9, .3, 1.5].forEach(x => put(rbox(.9, .6, .04, 0xB97A3F, .05), x, .5, -1.18, bar));
  // finitions du comptoir : plateau clair façon marbre, panneaux moulurés, socle sombre et barre repose-pieds en laiton
  put(rbox(3.6, .035, 1.12, 0xF3ECE2, .015), .3, 1.135, -1.65, bar);
  [-.9, .3, 1.5].forEach(x => put(rbox(.72, .44, .03, 0xD39A5C, .04), x, .5, -1.155, bar));
  put(rbox(3.42, .1, .92, 0x5A3214, .02), .3, .05, -1.65, bar);
  const laiton = mat(0xD4A24C, { metalness: .85, roughness: .3, envMap: reflets, envMapIntensity: 1 });
  const rail = put(ombre(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 3.3, 16), laiton)), .3, .2, -1.06, bar); rail.rotation.z = Math.PI / 2;
  [-1.3, .3, 1.9].forEach(x => put(ombre(new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .16, 10), laiton)), x, .13, -1.12, bar).rotation.x = .5);
  D.comptoirB = grp(bar);
  put(rbox(2.0, 1.0, .9, C.caramel, .06), 3.0, .5, -1.65, D.comptoirB);
  put(rbox(2.1, .12, 1.08, C.bois, .04), 3.0, 1.06, -1.65, D.comptoirB);
  put(rbox(.9, .6, .04, 0xB97A3F, .05), 3.0, .5, -1.18, D.comptoirB);
  const caisse = grp(bar, -.95, 1.12, -1.6);
  const caisseModele = modele('caisse'); if (caisseModele) { caisseModele.rotation.y = 0; caisse.add(caisseModele); }
  if (!caisseModele) {
    put(rbox(.55, .34, .48, C.miel, .08), 0, .17, 0, caisse);
    put(rbox(.4, .2, .06, C.cafe, .03), 0, .44, -.12, caisse).rotation.x = -.4;
  }
  const POSTES = [0.25, 1.45, 3.0];
  const VARIANTES_MACHINES = ['machine_occasion', 'machine_neuve', 'machine_pro', 'machine_levier', 'machine_robot'];
  const machines = [], vapeurs = [], baristas = [];
  POSTES.forEach((x, i) => {
    const m = grp(bar, x, 1.12, -1.8);
    const corps = put(rbox(.95, .62, .6, C.framboise, .12), 0, .31, 0, m);
    put(rbox(.5, .2, .08, C.lait, .04), -.12, .42, .3, m);
    put(cyl(.09, .09, .05, C.miel, 16), .28, .42, .31, m).rotation.x = Math.PI / 2;
    put(rbox(.24, .1, .2, C.cafe, .03), 0, .05, .25, m);
    put(cyl(.06, .05, .1, C.lait, 12), 0, .17, .27, m);
    const rouille = put(new THREE.Mesh(new THREE.CircleGeometry(.12, 12), new THREE.MeshBasicMaterial({ color: 0x7a5a3a, transparent: true, opacity: .6 })), .3, .18, .305, m);
    m.userData = { corps, rouille };
    const variantes = VARIANTES_MACHINES.map(n => modele(n));
    if (variantes.every(Boolean)) {
      m.clear(); variantes.forEach(v => m.add(v)); m.userData.variantes = variantes; m.userData.bras = variantes[4].getObjectByName('bras');
      variantes[4].traverse(o => { if (o.isMesh && o.material.name === 'ecran') { o.material.emissive = new THREE.Color(0x5EC9D0); o.material.emissiveIntensity = 1.4; } });
    }
    machines.push(m);
    const vap = [];
    for (let k = 0; k < 3; k++) {
      const v = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
      put(v, x, 1.9, -1.8, bar); v.userData.phase = k / 3; vap.push(v);
    }
    vapeurs.push(vap);
    baristas.push(put(perso(i === 0 ? 0x6E86A8 : C.sauge, [0x4A2E1F, 0x2B1B12, 0xD9A35C][i], { tablier: true, peau: [0xF2C9A5, 0xC99A78, 0xE0B08A][i] }), x, 0, -2.55, bar));
  });

  // Vitrine à pâtisseries, à côté du comptoir (fait partie du bar : la toucher ouvre le bar)
  D.vitrine = grp(bar, -1.85, 0, -1.55);
  const vm = modele('vitrine');
  if (vm) D.vitrine.add(vm); else { put(rbox(.9, .74, .7, C.bois, .04), 0, .37, 0, D.vitrine); put(rbox(.86, .4, .66, 0xDDEFF0, .02), 0, .98, 0, D.vitrine).material.transparent = true; }
  // Ardoise sur le mur de gauche : le jeu y écrit le vrai prix et le grain servi
  D.ardoise = grp(scene, -5.95, 1.35, 1.9); D.ardoise.rotation.y = Math.PI / 2;
  const am = modele('ardoise'); if (am) D.ardoise.add(am); else put(rbox(1.2, .86, .06, C.bois, .02), 0, .39, 0, D.ardoise);
  const toileArdoise = document.createElement('canvas'); toileArdoise.width = 512; toileArdoise.height = 360;
  const texArdoise = new THREE.CanvasTexture(toileArdoise); texArdoise.colorSpace = THREE.SRGBColorSpace;
  put(new THREE.Mesh(new THREE.PlaneGeometry(1.04, .72), new THREE.MeshBasicMaterial({ map: texArdoise, transparent: true })), 0, .39, .035, D.ardoise);
  let cleArdoise = '';
  function majArdoise(e) {
    // Trois produits de la carte (l'espresso d'abord, puis les plus vendus hier), et le grain servi
    const hier = e.bilans?.at(-1)?.produits || {};
    const autres = Object.keys(e.carte || {}).filter(id => produitActif(e, id)).sort((x, y) => (hier[y]?.n || 0) - (hier[x]?.n || 0)).slice(0, 2);
    const cle = [prixEffectif(e), e.maison, ...autres.map(id => id + prixProduit(e, id))].join('|'); if (cle === cleArdoise) return; cleArdoise = cle;
    const g = toileArdoise.getContext('2d'), W = toileArdoise.width;
    g.clearRect(0, 0, W, 360);
    g.fillStyle = 'rgba(255,253,248,.92)'; g.textAlign = 'center';
    g.font = '600 46px Fredoka, sans-serif'; g.fillText('~ Aujourd\'hui ~', W / 2, 62);
    g.font = '500 34px Fredoka, sans-serif'; g.textAlign = 'left';
    const lignes = [['Espresso', fmt(prixEffectif(e))], ...autres.map(id => [CATALOGUE_CARTE[id].nom.replace('Jus d’orange pressé', 'Jus d’orange'), fmt(prixProduit(e, id))]), ['Grain : ' + G[e.maison].court, '']];
    lignes.forEach(([t, p], k) => { g.fillText(t, 40, 140 + k * 62); g.textAlign = 'right'; g.fillText(p, W - 40, 140 + k * 62); g.textAlign = 'left'; });
    g.strokeStyle = 'rgba(255,253,248,.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, 86); g.lineTo(W - 70, 86); g.stroke();
    texArdoise.needsUpdate = true;
  }
  // Tableaux au mur (avec la peinture)
  D.cadres = grp(scene, -4.1, 1.6, -3.96);
  const cm = modele('cadres'); if (cm) D.cadres.add(cm);

  // Panneau « Fermé » devant la porte, la nuit
  D.ferme = grp(scene, 1.9, 0, 4.0);
  put(rbox(.06, 1.1, .06, C.cafe, .02), -.32, .55, 0, D.ferme); put(rbox(.06, 1.1, .06, C.cafe, .02), .32, .55, 0, D.ferme);
  const texFerme = texture(256, 160, (g, w, h) => { g.fillStyle = '#2F3533'; g.fillRect(0, 0, w, h); g.fillStyle = '#FFFDF8'; g.textAlign = 'center';
    g.font = '600 52px Fredoka, sans-serif'; g.fillText('Fermé', w / 2, 70); g.font = '500 26px Fredoka, sans-serif'; g.fillText('À demain, 7 h !', w / 2, 120); });
  put(new THREE.Mesh(new THREE.PlaneGeometry(.75, .47), new THREE.MeshBasicMaterial({ map: texFerme })), 0, .95, .04, D.ferme);
  D.ferme.visible = false;

  // Le vélo de Karim (garé devant quand les livreurs viennent au café)
  D.velo = grp(scene, 4.6, -.06, 5.4); D.velo.rotation.y = .35;
  const vm2 = modele('velo'); if (vm2) D.velo.add(vm2);
  // CaféMax, en face, de l'autre côté de la rue
  D.cafemax = grp(scene, 8.1, -.06, -6.6);
  const cmx = modele('cafemax');
  if (cmx) {
    D.cafemax.add(cmx);
    const texCM = texture(512, 96, (g, w, h) => { g.fillStyle = '#E3D6B8'; g.fillRect(0, 0, w, h); g.fillStyle = '#6E6A64'; g.font = '700 58px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CaféMax', w / 2, h / 2 + 3); });
    put(new THREE.Mesh(new THREE.PlaneGeometry(3.2, .5), new THREE.MeshBasicMaterial({ map: texCM })), 0, 2.45, .22, D.cafemax);
  }
  // Briques de lait sur le comptoir (avec la buse)
  D.lait = grp(bar, -.45, 1.12, -1.95);
  const briques = [0, 1, 2].map(k => { const b = grp(D.lait, k * .17, 0, 0); put(rbox(.13, .26, .13, C.lait, .02), 0, .13, 0, b); put(rbox(.135, .06, .135, 0x6E86A8, .01), 0, .16, 0, b); return b; });
  // Les managers, visibles à leur station une fois engagés
  const MANAGERS = [
    { x: -3.6, z: -3.45, rot: .4, habit: 0x8A5A3A, cheveux: 0xE9E1DA },
    { x: -1.6, z: -2.75, rot: -.9, habit: 0xD9695F, cheveux: 0x2B1B12 },
    { x: -.55, z: -2.65, rot: 0, habit: 0x3E3A3A, cheveux: 0xD9A35C },
    { x: -2.9, z: -.35, rot: .2, habit: 0x9C6B8E, cheveux: 0x4A2E1F },
  ];
  const managers = MANAGERS.map(m => { const p = perso(m.habit, m.cheveux, { tablier: true }); p.rotation.y = m.rot; put(p, m.x, 0, m.z); p.visible = false; return p; });

  // Salle : 8 emplacements de tables
  const TABLES = [
    { x: -4.2, z: 1.0, req: null }, { x: -1.4, z: 1.3, req: null }, { x: -4.2, z: 3.2, req: 'table3' }, { x: -1.4, z: 3.3, req: 'table4' },
    { x: 3.7, z: .9, req: 'table5' }, { x: 3.7, z: 3.0, req: 'table6' }, { x: -3.9, z: 5.6, req: 'terrasse' }, { x: -1.2, z: 5.6, req: 'terrasse' },
  ];
  const sieges = [];
  TABLES.forEach((tb, k) => {
    const g = grp(groupes[3], tb.x, 0, tb.z);
    const vieille = k < 2;
    const tm = modele(vieille ? 'table_vieille' : 'table');
    if (tm) {
      g.add(tm);
      [[-.85, Math.PI / 2], [.85, -Math.PI / 2]].forEach(([dx, rot]) => {
        const ch = modele(vieille ? 'chaise_vieille' : 'chaise'); ch.rotation.y = rot; put(ch, dx, 0, 0, g);
        sieges.push({ x: tb.x + dx * .8, z: tb.z, face: rot + Math.PI, libre: true, table: k });
      });
      // sur chaque table : le menu plié et une assiette (KayKit)
      const mn = modele('menu'); if (mn) { mn.rotation.y = k * 1.1; put(mn, .12, .75, -.1, g); }
      const as = modele('assiette'); if (as) put(as, -.18, .75, .14, g);
      tb.g = g; return;
    }
    put(cyl(.55, .55, .08, vieille ? 0xD9CDBE : C.lait, 28), 0, .78, 0, g);
    put(cyl(.06, .06, .74, C.cafe, 10), 0, .4, 0, g);
    put(cyl(.3, .32, .05, C.cafe, 20), 0, .03, 0, g);
    [[-.85, Math.PI / 2], [.85, -Math.PI / 2]].forEach(([dx, rot]) => {
      const ch = grp(g, dx, 0, 0); ch.rotation.y = rot;
      put(rbox(.42, .08, .42, vieille ? 0xA88A6A : C.caramel, .04), 0, .45, 0, ch);
      put(rbox(.42, .5, .08, vieille ? 0xA88A6A : C.caramel, .04), 0, .72, -.19, ch);
      [[-.16, -.16], [.16, -.16], [-.16, .16], [.16, .16]].forEach(([u, w]) => put(cyl(.025, .025, .42, C.caramelF, 6), u, .21, w, ch));
      sieges.push({ x: tb.x + dx * .8, z: tb.z, face: rot + Math.PI, libre: true, table: k });
    });
    tb.g = g;
  });

  // ---- Décor KayKit (Kay Lousberg, CC0) : le buffet derrière le bar, des bocaux sur le comptoir, des cadres, un coin lecture ----
  const kk = (nom, x, y, z, rot = 0, parent = scene, ech = 1) => { const m = modele(nom); if (!m) return null; m.rotation.y = rot; m.scale.setScalar(ech); return put(m, x, y, z, parent); };
  D.buffet = grp(groupes[2]);
  kk('etagere_deco', -1.0, 0, -3.72, 0, D.buffet); kk('etagere_deco', .65, 0, -3.72, 0, D.buffet);
  kk('livres', -1.4, .66, -3.72, 0, D.buffet); kk('cactus_petit', 1.2, .66, -3.72, 0, D.buffet);
  D.bocaux = grp(groupes[2]);
  [['bocal_a', 1.25], ['bocal_b', 1.48], ['bocal_c', 1.68]].forEach(([n, x], k) => kk(n, x, 1.12, -1.75 + (k % 2) * .12, k, D.bocaux));
  kk('cactus_petit', -1.25, 1.12, -1.75, 0, D.bocaux);
  D.cadresMur = grp(scene);   // après le coup de peinture
  kk('cadre_a', -5.92, 1.0, 1.0, Math.PI / 2, D.cadresMur); kk('cadre_b', -5.92, 1.15, 2.6, Math.PI / 2, D.cadresMur);
  D.coinLecture = grp(scene);  // après la cloison : un lampadaire et un cactus dans le coin
  kk('lampadaire_salon', 5.55, 0, 3.65, 0, D.coinLecture); kk('cactus', 5.55, 0, 1.95, 0, D.coinLecture);

  D.terrasse = grp(scene);
  put(rbox(7.6, .3, 2.9, 0xE6D3BC, .08), -2.2, -.2, 5.75, D.terrasse);
  for (let x = -5.8; x <= 1.4; x += .6) put(rbox(.08, .5, .08, C.caramelF, .02), x, .2, 7.1, D.terrasse);
  put(rbox(7.3, .07, .08, C.caramelF, .02), -2.2, .45, 7.1, D.terrasse);
  [[-2.6, C.framboise, 'parasol_framboise'], [.1, C.sauge, 'parasol_sauge']].forEach(([x, c, nom]) => {
    const p = modele(nom); if (p) { put(p, x, -.05, 5.6, D.terrasse); return; }
    put(cyl(.035, .035, 2.1, C.cafe, 8), x, 1.05, 5.6, D.terrasse);
    put(ombre(new THREE.Mesh(new THREE.ConeGeometry(1.2, .45, 8), mat(c))), x, 2.2, 5.6, D.terrasse);
  });

  // ---- Travaux de fin de partie ----
  // Fresque de mamie Odette, peinte sur le mur de gauche
  const texFresque = texture(256, 320, (g, w, h) => {
    const fond = g.createLinearGradient(0, 0, 0, h); fond.addColorStop(0, '#E8B54A'); fond.addColorStop(1, '#D9695F');
    g.fillStyle = fond; g.beginPath(); g.roundRect(0, 0, w, h, 40); g.fill();
    g.fillStyle = 'rgba(255,253,248,.25)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(w / 2, 150, 60 + k * 22, 0, Math.PI * 2); g.lineWidth = 6; g.strokeStyle = 'rgba(255,253,248,.18)'; g.stroke(); }
    g.fillStyle = '#E9E1DA'; g.beginPath(); g.arc(w / 2, 82, 34, 0, Math.PI * 2); g.fill();          // chignon
    g.beginPath(); g.ellipse(w / 2, 142, 74, 66, 0, 0, Math.PI * 2); g.fill();                         // cheveux
    g.fillStyle = '#F2C9A5'; g.beginPath(); g.ellipse(w / 2, 160, 58, 62, 0, 0, Math.PI * 2); g.fill(); // visage
    g.strokeStyle = '#4A2E1F'; g.lineWidth = 5;
    [-24, 24].forEach(dx => { g.beginPath(); g.arc(w / 2 + dx, 150, 15, 0, Math.PI * 2); g.stroke(); });
    g.beginPath(); g.moveTo(w / 2 - 9, 150); g.lineTo(w / 2 + 9, 150); g.stroke();
    g.beginPath(); g.arc(w / 2, 180, 20, .2, Math.PI - .2); g.stroke();                               // sourire
    g.fillStyle = 'rgba(217,105,95,.45)'; [-38, 38].forEach(dx => { g.beginPath(); g.arc(w / 2 + dx, 178, 10, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#FFFDF8'; g.beginPath(); g.roundRect(w / 2 - 40, 236, 80, 44, 10); g.fill();       // la tasse
    g.strokeStyle = '#FFFDF8'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2 + 44, 256, 12, -1.4, 1.4); g.stroke();
    g.fillStyle = '#4A2E1F'; g.font = '600 30px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillText('Odette', w / 2, 305);
  });
  D.fresque = put(new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.44), mat(0xffffff, { map: texFresque })), -5.97, 2.25, 2.95, scene);
  D.fresque.rotation.y = Math.PI / 2;
  // Cave voûtée : une porte cintrée dans le mur de la réserve, et des sacs devant
  D.entrepot = grp(groupes[0]);
  const forme = new THREE.Shape(); forme.moveTo(-.45, 0); forme.lineTo(-.45, 1.15); forme.absarc(0, 1.15, .45, Math.PI, 0, true); forme.lineTo(.45, 0); forme.lineTo(-.45, 0);
  const porte = put(ombre(new THREE.Mesh(new THREE.ExtrudeGeometry(forme, { depth: .06, bevelEnabled: false }), mat(0x6B4129))), -5.99, 0, -.8, D.entrepot); porte.rotation.y = Math.PI / 2;
  [-.2, .2].forEach(dz => put(rbox(.04, 1.3, .05, 0x4A2E1F, .01), -5.93, .7, -.8 + dz, D.entrepot));
  put(sph(.05, C.miel), -5.92, .8, -.5, D.entrepot);
  [[-5.4, .14, -.2], [-4.8, .14, -.2], [-5.1, .56, -.2]].forEach(([x, y, z]) => put(sac(0x9C6B8E), x, y * (M.sac ? 1.15 : 1), z, D.entrepot));
  // Guichet à emporter, sur le trottoir à droite, avec son auvent rayé
  D.emporter = grp(scene, 5.25, 0, 3.75);
  put(rbox(1.5, 1.0, .5, C.caramelF, .06), 0, .5, 0, D.emporter);
  put(rbox(1.6, .08, .6, C.lait, .03), 0, 1.04, 0, D.emporter);
  [-.6, .6].forEach(x => put(rbox(.07, 1.3, .07, C.cafe, .02), x, 1.7, -.15, D.emporter));
  const texAuvent = texture(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? '#FFFDF8' : '#8FA98B'; g.fillRect(x, 0, 32, h); } });
  const auvent = put(new THREE.Mesh(new THREE.PlaneGeometry(1.8, .8), mat(0xffffff, { map: texAuvent, side: THREE.DoubleSide })), 0, 2.45, .15, D.emporter); auvent.rotation.x = -1.0;
  const texEmporter = texture(256, 80, (g, w, h) => { g.fillStyle = '#4A2E1F'; g.beginPath(); g.roundRect(0, 0, w, h, 18); g.fill(); g.fillStyle = '#FFFDF8'; g.font = '600 36px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('À emporter', w / 2, h / 2 + 2); });
  put(new THREE.Mesh(new THREE.PlaneGeometry(1.1, .34), new THREE.MeshBasicMaterial({ map: texEmporter, transparent: true })), 0, .62, .26, D.emporter);
  for (let k = 0; k < 4; k++) put(cyl(.07, .05, .14, k % 2 ? C.lait : C.caramel, 12), -.45 + k * .3, 1.16, .05, D.emporter);
  // Vélo-cargo de livraison, garé devant le guichet
  D.cargo = grp(scene, 6.4, -.06, 5.3); D.cargo.rotation.y = -.5;
  const vc = modele('velo'); if (vc) D.cargo.add(vc);
  put(rbox(.6, .45, .55, C.sauge, .05), 0, .85, .75, D.cargo);
  put(rbox(.62, .06, .57, C.lait, .02), 0, 1.09, .75, D.cargo);
  // Coin boutique : une étagère de sachets « Le Petit Grain »
  // (sous la fenêtre du fond, face à la salle)
  D.boutique = grp(scene, 3.6, 0, -3.7);
  put(rbox(2.3, 1.2, .42, C.bois, .04), 0, .6, -.05, D.boutique);
  [.42, .9].forEach((y, r) => {
    put(rbox(2.2, .05, .4, C.caramel, .01), 0, y - .2, .02, D.boutique);
    for (let k = 0; k < 7; k++) put(rbox(.2, .3, .14, [C.miel, C.sauge, C.framboise, 0x9C6B8E, C.lait][(k + r) % 5], .05), -.9 + k * .3, y - .02, .12, D.boutique);
  });
  put(rbox(2.4, .06, .5, C.caramel, .02), 0, 1.22, -.04, D.boutique);
  // École de barista : une ardoise accrochée au mur du fond
  const texEcole = texture(256, 180, (g, w, h) => { g.fillStyle = '#8A5A3A'; g.fillRect(0, 0, w, h); g.fillStyle = '#2F3533'; g.fillRect(10, 10, w - 20, h - 20); g.fillStyle = '#FFFDF8'; g.textAlign = 'center';
    g.font = '600 30px Fredoka, sans-serif'; g.fillText('École', w / 2, 62); g.fillText('de barista', w / 2, 98); g.font = '500 20px Fredoka, sans-serif'; g.fillText('mousse · pression · latte art', w / 2, 142); });
  D.ecole = put(new THREE.Mesh(new THREE.PlaneGeometry(.95, .67), mat(0xffffff, { map: texEcole })), 5.45, 1.95, -3.96, scene);
  // L'étage : un escalier le long du côté droit, avec une rampe
  D.etage = grp(scene);
  for (let k = 0; k < 9; k++) put(rbox(.9, .34 * (k + 1), .26, k % 2 ? C.caramel : C.caramelF, .03), 5.45, .17 * (k + 1), 1.75 - k * .26, D.etage);
  put(rbox(.06, .06, 3.4, C.cafe, .02), 5.0, 2.55, .7, D.etage).rotation.x = .92;   // la rampe suit la pente des marches
  for (let k = 0; k < 5; k++) put(rbox(.04, .9, .04, C.cafe, .01), 5.0, .34 * (2 * k + 1) + .45, 1.75 - 2 * k * .26, D.etage);
  const texEtage = texture(200, 64, (g, w, h) => { g.fillStyle = '#E8B54A'; g.beginPath(); g.roundRect(0, 0, w, h, 14); g.fill(); g.fillStyle = '#4A2E1F'; g.font = '600 32px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Étage ↑', w / 2, h / 2 + 2); });
  const panEtage = put(new THREE.Mesh(new THREE.PlaneGeometry(.75, .24), new THREE.MeshBasicMaterial({ map: texEtage, transparent: true })), 4.95, 1.3, 2.1, D.etage); panEtage.rotation.y = -Math.PI / 2;

  // Fumée de panne
  const fumees = ANCRES.map(an => {
    const puffs = [];
    for (let k = 0; k < 5; k++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0x5b5048, transparent: true, opacity: 0 }));
      p.userData.phase = k / 5; put(p, an.x, an.y - .9, an.z); puffs.push(p);
    }
    return puffs;
  });

  // Pluie : des traits qui tombent sur toute la scène pendant une averse
  const NB_GOUTTES = 420, gouttes = new Float32Array(NB_GOUTTES * 6);
  // Les gouttes tombent dehors seulement (autour du café et sur la terrasse), jamais dans la salle
  const dehors = () => { let x, z; do { x = Math.random() * 20 - 9; z = Math.random() * 17 - 7; } while (x > -6.6 && x < 8.2 && z > -4.6 && z < 6.2); return [x, z]; };
  const HAUT_PLUIE = 2.6;   // une goutte trop haute se projette sur la salle en vue de dessus
  const graines = Array.from({ length: NB_GOUTTES }, () => { const [x, z] = dehors(); return [x, Math.random() * HAUT_PLUIE, z]; });
  const geoPluie = new THREE.BufferGeometry(); geoPluie.setAttribute('position', new THREE.BufferAttribute(gouttes, 3));
  const pluie = new THREE.LineSegments(geoPluie, new THREE.LineBasicMaterial({ color: 0xC9D6E2, transparent: true, opacity: .45 }));
  pluie.frustumCulled = false; pluie.visible = false; scene.add(pluie);
  function majPluie(dt) {
    graines.forEach((g, k) => {
      g[1] -= dt * 9; if (g[1] < 0) { g[1] += HAUT_PLUIE; [g[0], g[2]] = dehors(); }
      gouttes.set([g[0], g[1], g[2], g[0] + .04, g[1] + .35, g[2] + .04], k * 6);
    });
    geoPluie.attributes.position.needsUpdate = true;
  }
  // Pièces qui volent du client jusqu'à la caisse
  const matPiece = mat(C.miel, { metalness: .8, roughness: .3, envMap: reflets, envMapIntensity: 1 });
  const geoPiece = new THREE.CylinderGeometry(.06, .06, .015, 16);
  const pieces = Array.from({ length: 15 }, () => { const p = new THREE.Mesh(geoPiece, matPiece); p.visible = false; scene.add(p); return { m: p, t: 1, de: new THREE.Vector3() }; });
  const posCaisse = new THREE.Vector3(-.95, 1.55, -1.6);
  function lancerPieces(depuis) {
    let n = 0;
    for (const p of pieces) { if (p.t >= 1 && n < 3) { p.t = -n * .1; p.de.copy(depuis); p.m.visible = true; n++; } }
  }
  function majPieces(dt) {
    for (const p of pieces) {
      if (p.t >= 1) { p.m.visible = false; continue; }
      p.t += dt * 1.8; const k = Math.max(0, Math.min(1, p.t));
      p.m.position.lerpVectors(p.de, posCaisse, k); p.m.position.y += Math.sin(k * Math.PI) * 1.1;
      p.m.rotation.x += dt * 12; p.m.visible = p.t > 0 && p.t < 1;
    }
  }

  // Les chapeaux et lunettes sont dessinés pour l'ancienne tête (centre à 1,03, rayon 0,215) : sur le personnage réaliste,
  // un groupe les ramène à la taille et à la hauteur de la nouvelle tête (centre à 1,655, environ deux fois plus petite)
  function groupeTete(p) {
    const g = grp(p);
    const f = p.userData.forme; if (f) { g.scale.set(f.teteS, f.teteS * f.teteSy, f.teteS); g.position.y = f.teteC - 1.03 * f.teteS * f.teteSy; }
    // personnage à squelette : le chapeau est accroché à l'os de la tête, il suit ses mouvements
    const os = p.userData.anim && p.getObjectByName('os_tete');
    if (os) { p.updateMatrixWorld(true); os.attach(g); }
    return g;
  }
  // Accessoires des habitués, posés sur la tête
  function accessoire(p, type) {
    const f = p.userData.forme;
    if (type === 'parapluie' && f) {   // tenu à bout de bras, au-dessus de la tête
      const g = grp(p);
      put(cyl(.012, .012, .9, 0x2E2622, 6), .22, f.tete - .4, .08, g);
      put(ombre(new THREE.Mesh(new THREE.ConeGeometry(.55, .22, 12, 1, true), mat(pick([C.framboise, C.miel, 0x4FA3E0, 0x6CC04A, 0xA77BDB]), { side: THREE.DoubleSide }))), .22, f.tete + .1, .08, g);
      return g;
    }
    const g = groupeTete(p);
    if (type === 'beret') { const b = put(sph(.2, 0x2E3046), 0, 1.16, -.01, g); b.scale.set(1.05, .35, 1.05); b.rotation.z = .25; put(sph(.025, 0x2E3046), .02, 1.24, 0, g); }
    if (type === 'casque') {
      const arc = put(new THREE.Mesh(new THREE.TorusGeometry(.215, .025, 8, 24, Math.PI), mat(0x2B2B2B)), 0, 1.0, 0, g); arc.castShadow = true;
      [-.215, .215].forEach(x => put(cyl(.06, .06, .05, 0xD9695F, 16), x, 1.0, 0, g).rotation.z = Math.PI / 2);
    }
    if (type === 'velo') {
      const c = put(new THREE.Mesh(new THREE.SphereGeometry(.235, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), mat(0xE8B54A)), 0, 1.02, 0, g); c.castShadow = true;
      put(rbox(.06, .03, .4, 0x4A2E1F, .01), 0, 1.24, 0, g);
    }
    if (type === 'parapluie') {
      // Un parapluie ouvert au-dessus de la tête, de couleur gaie
      put(cyl(.012, .012, .75, C.cafe, 6), .12, 1.35, .05, g);
      const toile = put(ombre(new THREE.Mesh(new THREE.ConeGeometry(.5, .22, 10, 1, true), mat(pick([C.framboise, C.sauge, C.miel, 0x6E86A8, 0xB48EC9]), { side: THREE.DoubleSide }))), .12, 1.78, .05, g);
      toile.castShadow = true;
    }
    if (type === 'lunettes') {
      [-.075, .075].forEach(x => put(new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 6, 16), mat(0x3A2A20)), x, 1.01, .19, g));
      put(rbox(.06, .012, .012, 0x3A2A20, .004), 0, 1.02, .19, g);
    }
    return g;
  }

  // ---- Agents ----
  const coursier = new Marcheur(put(perso(C.miel, C.cafe, { tablier: true }), -3.45, 0, -2.9), 1.6);
  // le coursier porte le sac sur l'épaule
  const fc = coursier.o.userData.forme || FORMES.cartoon;
  const sacPorte = sac(); sacPorte.scale.setScalar(.62); put(sacPorte, .1, fc.epaule, -.02, coursier.o); sacPorte.rotation.z = -.25; sacPorte.visible = false;
  const serveur = new Marcheur(put(perso(C.framboise, CHEVEUX[3], { tablier: true }), -.9, 0, -.7), 2.0);
  const plateau = put(cyl(.2, .2, .02, C.lait, 18), .1, (serveur.o.userData.forme || FORMES.cartoon).main[0] + .25, .32, serveur.o); plateau.visible = false;
  let clients = [], livreurs = [];
  let etat = null;
  const entree = () => etat && a(etat, 'terrasse') ? { x: 1.9, z: 7.4 } : { x: 1.0, z: 4.5 };
  const pointsAttente = () => [-.4, .7, 1.6].concat(etat && a(etat, 'agrandir') ? [2.6, 3.5] : []);

  // ---- Applique les travaux au décor ----
  let vue = null, cleEnseigne = '';
  // ---- La carte des obstacles : tout ce qui est visible et à hauteur de jambes (comptoir, tables, chaises, étagères,
  // cloison, cartons, plantes, murets…), vu de dessus. Refaite à chaque changement de décor. Les personnages s'en servent pour marcher.
  const grille = new Grille(); Marcheur.grille = grille;
  const boiteMesh = new THREE.Box3();
  function construireGrille() {
    grille.vider();
    grille.bloquer(-6.4, 6.3, -4.5, -3.95, 0);   // mur du fond
    grille.bloquer(-6.5, -5.95, -4.5, 4.1, 0);   // mur de gauche
    const sources = [...groupes, D.cloison, D.cartons, D.plantes, D.plantesB, D.terrasse, D.emporter, D.boutique, D.etage, D.cheminee, D.jukebox, D.coinLecture].filter(Boolean);
    const visible = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
    for (const s of sources) s.traverse(m => {
      if (!m.isMesh || !visible(m)) return;
      boiteMesh.setFromObject(m);
      const b = boiteMesh;
      if (b.min.y > 1.0 || b.max.y < .12) return;                                     // lampes suspendues, sols, tapis
      if ((b.max.x - b.min.x) * (b.max.z - b.min.z) > 25) return;                       // grands plans (sol de la réserve…)
      grille.bloquer(b.min.x, b.max.x, b.min.z, b.max.z, .16);
    });
  }

  function majDecor(e) {
    etat = e;
    const ag = a(e, 'agrandir');
    D.cloison.visible = !ag; D.cartons.visible = !ag; D.comptoirB.visible = ag;
    D.plantes.visible = a(e, 'plantes'); D.plantesB.visible = a(e, 'plantes') && ag;
    D.lampes.visible = a(e, 'lampes'); D.ampoule.visible = !a(e, 'lampes');
    D.etagere.visible = a(e, 'peinture');
    // Murs et sol : la décoration choisie (les murs restent jaunis tant qu'on n'a pas fait le coup de peinture)
    const mur = murActuel(e), mapMur = a(e, 'peinture') ? texMurDeco(mur) : texMurVieux;
    if (matMur.map !== mapMur) { matMur.map = mapMur; matMur.needsUpdate = true; }
    matPlinthe.color.setHex(a(e, 'peinture') ? mur.plinthe : 0x9C8466);
    const mapSol = texSolDeco(solActuel(e)); if (matSol.map !== mapSol) { matSol.map = mapSol; matSol.needsUpdate = true; }
    D.tapis.visible = a(e, 'tapis'); D.cheminee.visible = a(e, 'cheminee'); D.clim.visible = a(e, 'clim'); D.chauffages.visible = a(e, 'chauffages');
    D.lustre.visible = a(e, 'lustre'); D.jukebox.visible = a(e, 'jukebox'); D.cuisine.visible = a(e, 'cuisine');
    const cle = a(e, 'enseigne') + '|' + nomCafe(e);
    if (cle !== cleEnseigne) { cleEnseigne = cle; enseigne.material.map = texEnseigne(a(e, 'enseigne'), nomCafe(e)); enseigne.material.needsUpdate = true; }
    D.palette.visible = a(e, 'palette'); D.arriere.visible = a(e, 'arriere');
    const tm = tierMoulin(e); D.moulin0.visible = tm === 0; D.moulin1.visible = tm === 1; D.moulin2.visible = tm === 2;
    const tb = tierMachine(e), nb = nbMachines(e);
    machines.forEach((m, i) => {
      m.visible = !!e.machines[i]; baristas[i].visible = !!e.machines[i];
      if (m.userData.variantes && e.machines[i]) {
        // Chaque poste montre le modèle choisi dans le catalogue, avec sa couleur
        const mod = CATALOGUE_MACHINES[e.machines[i]], k = VARIANTES_MACHINES.indexOf(mod.visuel);
        m.userData.variantes.forEach((v, j) => { v.visible = j === k; });
        if (mod.teinte !== undefined) m.userData.variantes[k].traverse(o => { if (o.isMesh && o.material.name === 'corps') { if (!o.userData.propre) { o.material = o.material.clone(); o.userData.propre = true; } o.material.color.setHex(mod.teinte); } });
        return;
      }
      const c = m.userData.corps.material;
      c.color.setHex([0xA89482, C.framboise, 0x3E3A3A][tb]); c.metalness = tb === 2 ? .5 : 0; c.roughness = tb === 2 ? .35 : .85;
      m.userData.rouille.visible = tb === 0;
    });
    TABLES.forEach(tbl => { tbl.g.visible = !tbl.req || a(e, tbl.req); });
    D.terrasse.visible = a(e, 'terrasse');
    D.velo.visible = e.rep >= 2.2; D.cafemax.visible = cafemaxOuvert(e);
    D.vitrine.visible = a(e, 'vitrine'); D.ardoise.visible = a(e, 'ardoise'); D.cadres.visible = a(e, 'peinture');
    D.fresque.visible = a(e, 'fresque'); D.entrepot.visible = a(e, 'entrepot'); D.emporter.visible = a(e, 'emporter'); D.cargo.visible = a(e, 'velo');
    D.cadresMur.visible = a(e, 'peinture'); D.coinLecture.visible = ag && !a(e, 'etage');
    D.boutique.visible = a(e, 'boutique'); D.ecole.visible = a(e, 'ecole'); D.etage.visible = a(e, 'etage');
    // Le guichet et l'escalier prennent la place des plantes du côté droit
    D.plantesB.visible = a(e, 'plantes') && ag && !a(e, 'emporter') && !a(e, 'jukebox');
    verifierArrivees(e); majVille(e);
    construireGrille();
    const v = a(e, 'terrasse') ? 'terrasse' : ag ? 'grand' : 'petit';
    if (v !== vue) {
      vue = v;
      if (v === 'petit') { cible.set(-1.8, 0, .6); largeurVue = 9.5; }
      if (v === 'grand') { cible.set(-.3, 0, .2); largeurVue = 11.6; }
      if (v === 'terrasse') { cible.set(-.2, 0, 2.4); largeurVue = 12.4; }
      redim();
    }
  }
  document.fonts?.ready.then(() => { cleEnseigne = ''; if (etat) majDecor(etat); });

  // ---- Toucher et glisser ----
  const ray = new THREE.Raycaster(), souris = new THREE.Vector2();
  let glisse = null;
  const el = renderer.domElement;
  const doigts = new Map(); let pincement = null;
  const regleZoom = z => { zoom = THREE.MathUtils.clamp(z, .55, 1.5); redim(); };
  el.addEventListener('wheel', ev => { ev.preventDefault(); regleZoom(zoom * (1 + Math.sign(ev.deltaY) * .1)); }, { passive: false });
  el.addEventListener('pointerdown', ev => {
    doigts.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (doigts.size === 2) { const [p, q] = [...doigts.values()]; pincement = { d: Math.hypot(p[0] - q[0], p[1] - q[1]), z: zoom }; glisse = null; }
  });
  el.addEventListener('pointermove', ev => {
    if (!doigts.has(ev.pointerId)) return;
    doigts.set(ev.pointerId, [ev.clientX, ev.clientY]);
    if (pincement && doigts.size === 2) { const [p, q] = [...doigts.values()]; regleZoom(pincement.z * pincement.d / Math.max(20, Math.hypot(p[0] - q[0], p[1] - q[1]))); }
  });
  const leve = ev => { doigts.delete(ev.pointerId); if (doigts.size < 2) pincement = null; };
  el.addEventListener('pointerup', leve); el.addEventListener('pointercancel', leve);
  el.addEventListener('pointerdown', ev => { if (doigts.size > 1) return; glisse = { x: ev.clientX, y: ev.clientY, bouge: false, cx: cible.x, cz: cible.z }; el.setPointerCapture(ev.pointerId); });
  el.addEventListener('pointermove', ev => {
    if (!glisse || pincement) return;
    const dx = ev.clientX - glisse.x, dy = ev.clientY - glisse.y;
    if (!glisse.bouge && Math.hypot(dx, dy) < 8) return;
    glisse.bouge = true;
    const parPixel = (cam.right - cam.left) / innerWidth, sx = -dx * parPixel, sy = dy * parPixel * 1.25;
    cible.x = THREE.MathUtils.clamp(glisse.cx + (sx - sy) / Math.SQRT2, limites.x[0], limites.x[1]);
    cible.z = THREE.MathUtils.clamp(glisse.cz + (-sx - sy) / Math.SQRT2, limites.z[0], limites.z[1]);
    placerCam();
  });
  el.addEventListener('pointerup', ev => {
    const g = glisse; glisse = null;
    if (!g || g.bouge) return;
    souris.set(ev.clientX / innerWidth * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(souris, cam);
    const visible = o => { while (o) { if (!o.visible) return false; o = o.parent; } return true; };
    // Un client touché : sa fiche (qui il est, ce qu'il a pris, ce qu'il pense)
    // (on prend le client le plus proche du doigt à l'écran, à 45 px près : plus facile qu'un clic au pixel près)
    let proche = null, dMin = 45;
    for (const c of clients) {
      if (c.fini || !c.profil) continue;
      const [x, y] = projeter(c.o.position.clone().add(new THREE.Vector3(0, c.o.userData.forme ? c.o.userData.forme.tete * .5 : .7, 0)));
      const d = Math.hypot(x - ev.clientX, y - ev.clientY); if (d < dMin) { dMin = d; proche = c; }
    }
    if (proche) { surClient(proche.profil, proche.o.position.clone().add(new THREE.Vector3(0, 2, 0))); return; }
    const hit = ray.intersectObjects(groupes, true).find(h => visible(h.object));
    if (!hit) return;
    let o = hit.object; while (o && o.userData.station === undefined) o = o.parent;
    if (o) surStation(o.userData.station);
  });

  const projeter = v => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; };
  // ---- Effets : guirlande, rayons de soleil, poussière, arrivée des achats ----
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // Guirlande lumineuse au-dessus de la terrasse : les ampoules brillent (halo) en fin de journée
  const matAmpoules = new THREE.MeshBasicMaterial({ color: 0xFFE2A0 }), matFil = new THREE.LineBasicMaterial({ color: 0x4A2E1F });
  const geoAmpoule = new THREE.SphereGeometry(.06, 8, 6);
  function guirlande(parent, de, a, n, creux) {
    const pt = u => de.clone().lerp(a, u).add(V3(0, -Math.sin(u * Math.PI) * creux, 0));
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 25 }, (_, k) => pt(k / 24))), matFil));
    for (let k = 1; k < n; k++) { const m = new THREE.Mesh(geoAmpoule, matAmpoules); m.position.copy(pt(k / n)).y -= .07; parent.add(m); }
  }
  D.guirlande = grp(scene);
  [[-5.9, 7.0], [1.5, 7.0]].forEach(([x, z]) => put(cyl(.04, .05, 2.7, C.cafe, 8), x, 1.35, z, D.guirlande));
  guirlande(D.guirlande, V3(-5.9, 2.65, 7.0), V3(1.5, 2.65, 7.0), 16, .4);
  guirlande(D.guirlande, V3(-6.05, 3.2, 3.95), V3(1.5, 2.65, 7.0), 14, .45);
  guirlande(D.guirlande, V3(-6.05, 3.2, 3.95), V3(-5.9, 2.65, 7.0), 6, .2);
  // Les ampoules des suspensions brillent un peu plus fort (le halo les fait rayonner)
  [D.lampes, D.ampoule].forEach(g => g.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial) o.material.color.multiplyScalar(2.4); }));

  // Rayons de soleil qui entrent par la fenêtre du fond, avec de la poussière qui danse dedans
  const texRayon = texture(64, 128, (g, w, h) => {
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(255,255,255,.9)'); v.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    const bord = g.createLinearGradient(0, 0, w, 0); bord.addColorStop(0, 'rgba(0,0,0,1)'); bord.addColorStop(.25, 'rgba(0,0,0,0)'); bord.addColorStop(.75, 'rgba(0,0,0,0)'); bord.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = bord; g.fillRect(0, 0, w, h);
  });
  const matRayon = new THREE.MeshBasicMaterial({ map: texRayon, color: 0xFFE3B0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  function rayon(haut, bas) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...haut[0], ...haut[1], ...bas[1], ...bas[0]], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    return put(new THREE.Mesh(geo, matRayon), 0, 0, 0, D.rayons);
  }
  D.rayons = grp(scene);
  rayon([[2.5, 2.6, -3.85], [4.7, 2.6, -3.85]], [[3.3, .02, -.9], [5.5, .02, -.9]]);
  rayon([[2.5, 1.4, -3.85], [4.7, 1.4, -3.85]], [[3.1, .02, -2.0], [5.3, .02, -2.0]]);
  const NB_POUSSIERE = 60, posPoussiere = new Float32Array(NB_POUSSIERE * 3);
  const grainsPoussiere = Array.from({ length: NB_POUSSIERE }, () => [2.7 + Math.random() * 2.4, .3 + Math.random() * 2.2, -3.6 + Math.random() * 2.4, Math.random() * 10]);
  const geoPoussiere = new THREE.BufferGeometry(); geoPoussiere.setAttribute('position', new THREE.BufferAttribute(posPoussiere, 3));
  const matPoussiere = new THREE.PointsMaterial({ color: 0xFFF1CF, size: 2.5 * Math.min(devicePixelRatio, 2), sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  D.rayons.add(new THREE.Points(geoPoussiere, matPoussiere));
  function majRayons(force) {
    matRayon.opacity = .16 * force; matPoussiere.opacity = .8 * force;
    D.rayons.visible = force > .02 && !!etat && a(etat, 'agrandir');
    if (!D.rayons.visible) return;
    grainsPoussiere.forEach(([x, y, z, p], k) => {
      posPoussiere[k * 3] = x + Math.sin(t * .3 + p) * .25; posPoussiere[k * 3 + 1] = y + Math.sin(t * .2 + p * 2) * .2; posPoussiere[k * 3 + 2] = z + Math.cos(t * .25 + p) * .2;
    });
    geoPoussiere.attributes.position.needsUpdate = true;
  }

  // Arrivée d'un achat : l'objet tombe du ciel en rebondissant, avec une pluie de confettis
  const SANS_ARRIVEE = new Set(['ferme', 'ampoule', 'cloison', 'cartons', 'velo', 'cafemax', 'lait', 'plantesB', 'rayons', 'guirlande']);
  const chutes = [];
  let visibles = null, machinesAvant = null;
  const COULEURS_CONFETTIS = [C.framboise, C.miel, C.sauge, 0x6E86A8, C.lait, 0xB48EC9];
  const geoConfetti = new THREE.PlaneGeometry(.09, .055);
  const confettis = Array.from({ length: 90 }, (_, k) => {
    const m = new THREE.Mesh(geoConfetti, new THREE.MeshBasicMaterial({ color: COULEURS_CONFETTIS[k % COULEURS_CONFETTIS.length], side: THREE.DoubleSide }));
    m.visible = false; scene.add(m); return { m, v: V3(0, 0, 0), vie: 0, rot: V3(0, 0, 0) };
  });
  function lancerConfettis(p, n = 40) {
    let lances = 0;
    for (const c of confettis) {
      if (c.vie > 0) continue;
      c.m.position.copy(p); c.m.visible = true; c.vie = 1.4 + Math.random() * .6;
      const ang = Math.random() * Math.PI * 2, vit = 1 + Math.random() * 2.2;
      c.v.set(Math.cos(ang) * vit, 3 + Math.random() * 3, Math.sin(ang) * vit);
      c.rot.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
      if (++lances >= n) break;
    }
  }
  function majConfettis(dt) {
    for (const c of confettis) {
      if (c.vie <= 0) continue;
      c.vie -= dt;
      c.v.y -= 9 * dt; c.v.multiplyScalar(1 - 1.6 * dt);
      c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += c.rot.x * dt; c.m.rotation.y += c.rot.y * dt; c.m.rotation.z += c.rot.z * dt;
      c.m.scale.setScalar(Math.min(1, c.vie * 2));
      if (c.vie <= 0 || c.m.position.y < 0) { c.vie = 0; c.m.visible = false; }
    }
  }
  function arrivee(o) {
    const centre = new THREE.Box3().setFromObject(o).getCenter(V3(0, 0, 0));
    if (!isFinite(centre.x)) return;
    chutes.push({ o, t: 0, y0: o.position.y });
    o.position.y += .12;   // il se pose, simplement (plus de chute ni de confettis)
  }
  const rebond = u => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + .75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + .9375; return n * (u -= 2.625 / d) * u + .984375; };
  function majChutes(dt) {
    for (let k = chutes.length - 1; k >= 0; k--) {
      const c = chutes[k]; c.t += dt; const u = Math.min(1, c.t / .6);
      c.o.position.y = c.y0 + .12 * (1 - u) * (1 - u);
      if (u >= 1) chutes.splice(k, 1);
    }
  }
  // Compare le décor avant et après une mise à jour : ce qui vient d'apparaître fait son entrée
  function verifierArrivees(e) {
    const vis = Object.fromEntries(Object.keys(D).map(k => [k, D[k].visible]));
    if (visibles) for (const k in vis) if (vis[k] && !visibles[k] && !SANS_ARRIVEE.has(k)) arrivee(D[k]);
    if (machinesAvant) e.machines.forEach((id, i) => { if (id && id !== machinesAvant[i]) arrivee(machines[i]); });
    visibles = vis; machinesAvant = [...e.machines];
  }

  // ---- Pigeons du trottoir : ils picorent, sautillent, et s'envolent quand quelqu'un passe trop près ----
  const ZONES_PIGEONS = [[2.6, 8.6, 4.9, 8.3], [6.9, 8.9, .5, 3.6]];
  const auHasard = () => { const [x0, x1, z0, z1] = pick(ZONES_PIGEONS); return { x: x0 + Math.random() * (x1 - x0), z: z0 + Math.random() * (z1 - z0) }; };
  function pigeon() {
    const g = new THREE.Group();
    const corps = put(sph(.11, 0x8E909C), 0, .13, 0, g); corps.scale.set(.85, .8, 1.3);
    put(sph(.075, 0x6F8A8C), 0, .2, .1, g);                                  // cou aux reflets verts
    const tete = grp(g, 0, .26, .14); put(sph(.055, 0x7C808E), 0, 0, 0, tete);
    put(ombre(new THREE.Mesh(new THREE.ConeGeometry(.018, .05, 6), mat(C.miel))), 0, -.01, .065, tete).rotation.x = Math.PI / 2;
    const ailes = [-1, 1].map(s => { const pivot = grp(g, s * .08, .17, 0); put(rbox(.16, .02, .2, 0x6E7180, .01), s * .08, 0, 0, pivot); return pivot; });
    put(rbox(.08, .02, .12, 0x5E6170, .01), 0, .12, -.17, g);                 // queue
    return { g, tete, ailes };
  }
  const pigeons = Array.from({ length: 5 }, () => {
    const p = pigeon(), d = auHasard();
    put(p.g, d.x, 0, d.z); p.g.rotation.y = Math.random() * 6; p.g.scale.setScalar(1.45);
    return { ...p, cible: auHasard(), attente: Math.random() * 3, vol: null, phase: Math.random() * 10 };
  });
  function majPigeons(dt) {
    const gens = clients.concat(livreurs, [coursier]).map(c => c.o.position);
    for (const p of pigeons) {
      const o = p.g; p.phase += dt;
      if (p.vol) {
        // En vol : il monte en s'éloignant, battant des ailes ; il revient se poser plus tard
        p.vol.t += dt;
        if (p.vol.t < 3) { o.position.x += p.vol.dx * dt; o.position.z += p.vol.dz * dt; o.position.y += (p.vol.monte ? 2.2 : -1.6) * dt; }
        p.ailes.forEach((a, k) => { a.rotation.z = (k ? -1 : 1) * Math.sin(p.phase * 28) * .9; });
        if (p.vol.monte && p.vol.t > 2.2) { o.visible = false; if (p.vol.t > 6 + Math.random() * 6) { const d = auHasard(); o.position.set(d.x, 3, d.z); o.visible = true; p.vol = { t: 0, dx: 0, dz: 0, monte: false }; } }
        if (!p.vol.monte && o.position.y <= 0) { o.position.y = 0; p.vol = null; p.ailes.forEach(a => { a.rotation.z = 0; }); p.cible = auHasard(); }
        continue;
      }
      const peur = gens.find(g => Math.hypot(g.x - o.position.x, g.z - o.position.z) < 1.3);
      if (peur) {
        const dx = o.position.x - peur.x, dz = o.position.z - peur.z, n = Math.hypot(dx, dz) || 1;
        p.vol = { t: 0, dx: dx / n * 2.5, dz: dz / n * 2.5, monte: true }; o.rotation.y = Math.atan2(dx, dz); continue;
      }
      if (p.attente > 0) {
        // Il picore
        p.attente -= dt; p.tete.rotation.x = Math.max(0, Math.sin(p.phase * 9)) * .9; o.position.y = 0; continue;
      }
      const dx = p.cible.x - o.position.x, dz = p.cible.z - o.position.z, d = Math.hypot(dx, dz);
      if (d < .05 || d > 1.6) { p.cible = d > 1.6 ? { x: o.position.x + (Math.random() - .5) * 1.4, z: o.position.z + (Math.random() - .5) * 1.4 } : auHasard(); p.attente = 1 + Math.random() * 3; continue; }
      o.rotation.y = Math.atan2(dx, dz); p.tete.rotation.x = 0;
      o.position.x += dx / d * .45 * dt; o.position.z += dz / d * .45 * dt; o.position.y = Math.abs(Math.sin(p.phase * 12)) * .05;
    }
  }

  // ---- Météo visible : neige, ombres de nuages ----
  // Neige : de gros flocons qui tombent doucement dehors, en tournoyant ; le trottoir blanchit
  const NB_FLOCONS = 500, posFlocons = new Float32Array(NB_FLOCONS * 3);
  const flocons = Array.from({ length: NB_FLOCONS }, () => { const [x, z] = dehors(); return [x, Math.random() * 7, z, Math.random() * 10]; });
  const geoFlocons = new THREE.BufferGeometry(); geoFlocons.setAttribute('position', new THREE.BufferAttribute(posFlocons, 3));
  // un cœur blanc cerclé de bleu-gris, pour qu'on voie les flocons même sur le fond clair
  const texFlocon = texture(32, 32, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.45, 'rgba(255,255,255,1)'); r.addColorStop(.62, 'rgba(120,140,175,.85)'); r.addColorStop(1, 'rgba(120,140,175,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const neigeVue = new THREE.Points(geoFlocons, new THREE.PointsMaterial({ map: texFlocon, color: 0xffffff, size: 9 * Math.min(devicePixelRatio, 2), sizeAttenuation: false, transparent: true, depthWrite: false }));
  scene.add(neigeVue); neigeVue.visible = false;
  function majNeige(dt) {
    flocons.forEach((f, k) => {
      f[1] -= dt * .9; f[3] += dt;
      if (f[1] < 0) { f[1] += 7; [f[0], f[2]] = dehors(); }
      posFlocons[k * 3] = f[0] + Math.sin(f[3] * 1.3) * .25; posFlocons[k * 3 + 1] = f[1]; posFlocons[k * 3 + 2] = f[2] + Math.cos(f[3]) * .2;
    });
    geoFlocons.attributes.position.needsUpdate = true;
  }
  // Ombres de nuages qui glissent sur tout le quartier (plus nombreuses par temps couvert)
  const texNuages = texture(256, 256, (g, w) => {
    for (let k = 0; k < 9; k++) {
      const x = (k * 97) % w, y = (k * 61 + 30) % w, r = 34 + (k % 4) * 14;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, w], [0, -w]]) {
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        gr.addColorStop(0, 'rgba(40,30,60,.9)'); gr.addColorStop(1, 'rgba(40,30,60,0)'); g.fillStyle = gr; g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
    }
  });
  texNuages.wrapS = texNuages.wrapT = THREE.RepeatWrapping; texNuages.repeat.set(1.4, 1.4);
  const matNuages = new THREE.MeshBasicMaterial({ map: texNuages, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const ombresNuages = put(new THREE.Mesh(new THREE.PlaneGeometry(26, 26), matNuages), 1, .035, 1); ombresNuages.rotation.x = -Math.PI / 2;
  const OPACITE_NUAGES = { soleil: .1, nuages: .28, pluie: .32, chaleur: .04, froid: .2 };
  function majMeteo(dt, e) {
    const neigeOn = neige(e);
    neigeVue.visible = neigeOn; if (neigeOn) majNeige(dt);
    matsTrottoir.forEach(m => { m.emissiveIntensity += ((neigeOn ? .6 : 0) - m.emissiveIntensity) * Math.min(1, dt * .8); });
    const cible = ouvert(e) ? (OPACITE_NUAGES[e.meteo] ?? .15) : .06;
    matNuages.opacity += (cible - matNuages.opacity) * Math.min(1, dt);
    texNuages.offset.x += dt * .012; texNuages.offset.y += dt * .006;
  }

  // ---- Décoration au choix : murs et sols dessinés à la volée (et gardés en cache) ----
  const nuance = (hex, d) => { const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, v + d)); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };
  const cacheMurs = new Map(), cacheSols = new Map();
  function texMurDeco(m) {
    if (cacheMurs.has(m.id)) return cacheMurs.get(m.id);
    const tx = texture(256, 256, (g, w, h) => {
      if (m.motif === 'brique') {
        g.fillStyle = m.c2; g.fillRect(0, 0, w, h);
        for (let r = 0; r < 16; r++) for (let k = -1; k < 5; k++) { g.fillStyle = nuance(m.c1, ((r * 7 + k * 13) % 5 - 2) * 9); g.fillRect(k * 64 + (r % 2) * 32 + 2, r * 16 + 2, 60, 12); }
      } else if (m.motif === 'boiserie') {
        g.fillStyle = m.c2; g.fillRect(0, 0, w, h);
        g.fillStyle = m.c1; g.fillRect(0, h * .45, w, h * .55);
        for (let k = 0; k < 4; k++) { g.strokeStyle = nuance(m.c1, -30); g.lineWidth = 4; g.strokeRect(k * 64 + 8, h * .52, 48, h * .4); g.strokeStyle = nuance(m.c2, 25); g.strokeRect(k * 64 + 10, 14, 44, h * .34); }
        g.fillStyle = nuance(m.c1, -40); g.fillRect(0, h * .45, w, 6);
      } else if (m.motif === 'jungle') {
        g.fillStyle = m.c1; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 40; k++) {
          const x = (k * 53) % w, y = (k * 97) % h, a = k * 1.7;
          g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = k % 3 ? m.c2 : nuance(m.c2, 30);
          g.beginPath(); g.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = nuance(m.c1, -10); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-24, 0); g.lineTo(24, 0); g.stroke(); g.restore();
        }
        g.fillStyle = '#E8B54A'; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc((k * 89) % w, (k * 61 + 40) % h, 5, 0, Math.PI * 2); g.fill(); }
      } else {
        // Peinture unie sur un enduit un peu irrégulier
        g.fillStyle = m.c1; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 900; k++) { g.fillStyle = hasardTex() < .5 ? nuance(m.c1, 10) : m.c2; g.globalAlpha = .15 + hasardTex() * .25; g.fillRect(hasardTex() * w, hasardTex() * h, 2 + hasardTex() * 6, 2 + hasardTex() * 6); }
        g.globalAlpha = 1;
        const bas = g.createLinearGradient(0, h * .7, 0, h); bas.addColorStop(0, 'rgba(90,60,40,0)'); bas.addColorStop(1, 'rgba(90,60,40,.12)'); g.fillStyle = bas; g.fillRect(0, h * .7, w, h * .3);
      }
    });
    tx.wrapS = THREE.RepeatWrapping; tx.repeat.set(5, 1);
    cacheMurs.set(m.id, tx); return tx;
  }
  function texSolDeco(s) {
    if (cacheSols.has(s.id)) return cacheSols.get(s.id);
    let rep = [3, 2];
    const tx = texture(512, 512, (g, w, h) => {
      if (s.motif === 'lames') {
        rep = [1.5, 1];
        dessinParquet(g, w, s.c1, s.c2, 32);
      } else if (s.motif === 'damier') {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? s.c2 : s.c1; g.fillRect(x * 64, y * 64, 64, 64); }
        g.strokeStyle = 'rgba(0,0,0,.08)'; for (let k = 0; k <= 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64, h); g.moveTo(0, k * 64); g.lineTo(w, k * 64); g.stroke(); }
      } else if (s.motif === 'tomettes') {
        g.fillStyle = '#E6D3BC'; g.fillRect(0, 0, w, h);
        const r = 36, dx = r * Math.sqrt(3);
        for (let row = -1; row < 12; row++) for (let col = -1; col < 10; col++) {
          const cx = col * dx + (row % 2) * dx / 2, cy = row * r * 1.5;
          g.fillStyle = nuance((row * 3 + col) % 3 ? s.c1 : s.c2, ((row * 5 + col * 3) % 4) * 5);
          g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)); } g.fill();
        }
      } else if (s.motif === 'beton') {
        g.fillStyle = s.c1; g.fillRect(0, 0, w, h);
        for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(90,85,80,${.03 + (k % 4) * .015})`; g.beginPath(); g.ellipse((k * 137) % w, (k * 89) % h, 30 + k % 5 * 12, 18 + k % 3 * 10, k, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = 'rgba(60,55,50,.12)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);
      } else if (s.motif === 'terrazzo') {
        g.fillStyle = s.c1; g.fillRect(0, 0, w, h);
        const couleurs = [s.c2, '#8FA98B', '#E8B54A', '#4A2E1F', '#B9A07A'];
        for (let k = 0; k < 420; k++) { g.fillStyle = couleurs[k % couleurs.length]; g.beginPath(); g.ellipse((k * 137.5) % w, (k * 71.3) % h, 2 + k % 5, 1.5 + k % 3, k, 0, Math.PI * 2); g.fill(); }
      }
    });
    tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(...rep);
    cacheSols.set(s.id, tx); return tx;
  }

  // ---- Travaux de confort et de déco ----
  // Grand tapis persan sous les tables de la salle
  const texTapis = texture(512, 384, (g, w, h) => {
    g.fillStyle = '#8E2F2A'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#23324F'; g.fillRect(18, 18, w - 36, h - 36);
    g.fillStyle = '#9C3A32'; g.fillRect(36, 36, w - 72, h - 72);
    g.strokeStyle = '#E8C98A'; g.lineWidth = 4; g.strokeRect(28, 28, w - 56, h - 56); g.strokeRect(44, 44, w - 88, h - 88);
    for (let k = 0; k < 24; k++) { g.fillStyle = k % 2 ? '#E8C98A' : '#F2E6D0'; g.beginPath(); g.arc(30 + k * 20.5, 10, 4, 0, Math.PI * 2); g.arc(30 + k * 20.5, h - 10, 4, 0, Math.PI * 2); g.fill(); }
    g.save(); g.translate(w / 2, h / 2);
    for (const [r, c] of [[110, '#23324F'], [86, '#E8C98A'], [64, '#8E2F2A'], [40, '#F2E6D0'], [18, '#23324F']]) { g.fillStyle = c; g.beginPath(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, rr = k % 2 ? r * .78 : r; g.lineTo(Math.cos(a) * rr * 1.3, Math.sin(a) * rr); } g.fill(); }
    g.restore();
    g.fillStyle = '#E8C98A'; [[90, 90], [w - 90, 90], [90, h - 90], [w - 90, h - 90]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 18, 0, Math.PI * 2); g.fill(); });
  });
  D.tapis = put(new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.6), mat(0xffffff, { map: texTapis })), -2.8, .012, 2.15, scene);
  D.tapis.rotation.x = -Math.PI / 2; D.tapis.receiveShadow = true;
  // Matériaux qui brillent dans les nouveaux modèles (flammes, ampoules, néons, écran)
  function lueur(o, nom, couleur, force) { const mats = []; o?.traverse(m => { if (m.isMesh && m.material.name === nom) { m.material.emissive = new THREE.Color(couleur); m.material.emissiveIntensity = force; mats.push(m.material); } }); return mats; }
  // Cheminée sur le mur de gauche, avec un feu qui danse
  D.cheminee = grp(scene, -5.78, 0, .45); D.cheminee.rotation.y = Math.PI / 2;
  const mCheminee = modele('cheminee'); if (mCheminee) D.cheminee.add(mCheminee);
  const flammes = []; mCheminee?.traverse(o => { if (o.isMesh && o.name.startsWith('flamme')) flammes.push(o); });
  const matsFeu = lueur(mCheminee, 'flamme', 0xFF8A2A, 2.2);
  const lumiereFeu = put(new THREE.PointLight(0xFF9A4A, 0, 3, 2), .1, .5, .35, D.cheminee);
  // Ventilateurs au plafond et clim au mur
  D.clim = grp(scene);
  const pales = [[-3.4, 3.4], [3.7, 3.5]].map(([x, z]) => {
    put(cyl(.015, .015, .6, C.cafe, 6), x, 3.0, z, D.clim);
    put(cyl(.12, .09, .14, C.bois, 14), x, 2.68, z, D.clim);
    const rotor = grp(D.clim, x, 2.6, z);
    for (let k = 0; k < 4; k++) { const p = put(rbox(.75, .02, .16, C.caramelF, .01), .42, 0, 0, grp(rotor)); p.parent.rotation.y = k * Math.PI / 2; }
    return rotor;
  });
  put(rbox(1.1, .32, .22, C.lait, .06), 1.5, 2.95, -3.88, D.clim);
  put(rbox(.9, .03, .02, 0xB8B4AE, .01), 1.5, 2.83, -3.76, D.clim);
  // Chauffages de terrasse (champignons) qui rougeoient
  D.chauffages = grp(scene);
  [[-5.4, 6.75], [1.2, 6.75]].forEach(([x, z]) => { const m = modele('chauffage'); if (m) put(m, x, -.05, z, D.chauffages); lueur(m, 'flamme', 0xFF5A2A, 2.2); });
  // Lustre au-dessus de la grande salle
  D.lustre = grp(scene, 3.6, 3.3, 1.9);
  const mLustre = modele('lustre'); if (mLustre) D.lustre.add(mLustre);
  lueur(mLustre, 'ampoule', 0xFFE0A0, 2.6);
  // Jukebox dans le coin du fond, avec des notes de musique qui s'envolent
  D.jukebox = grp(scene, 5.5, 0, -3.62);
  const mJuke = modele('jukebox'); if (mJuke) D.jukebox.add(mJuke);
  const matsNeon = lueur(mJuke, 'lumiere', 0xFFB84A, 1.8);
  const texNote = texture(64, 64, (g, w) => { g.fillStyle = '#4A2E1F'; g.font = '700 48px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♪', w / 2, w / 2 + 2); });
  const notes = Array.from({ length: 6 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texNote, transparent: true, depthWrite: false })); s.scale.setScalar(.32); s.visible = false; scene.add(s); return { s, vie: 0 }; });
  let minuteurNote = 0;
  function majConfort(dt, e) {
    const ouv = ouvert(e);
    if (D.cheminee.visible) {
      const f = .75 + Math.sin(t * 11) * .12 + Math.sin(t * 17.3) * .08;
      flammes.forEach((fl, k) => { fl.scale.set(1, f + k * .05, 1); });
      matsFeu.forEach(m => { m.emissiveIntensity = 1.6 + f; });
      lumiereFeu.intensity = (ouv && e.meteo !== 'froid' ? .5 : 1.2) * f;   // le feu éclaire surtout le soir et par grand froid
    } else lumiereFeu.intensity = 0;
    if (D.clim.visible) pales.forEach(r => { r.rotation.y += dt * (ouv ? 9 : 1.5); });
    matsNeon.forEach(m => { m.emissive.setHSL((t * .08) % 1, .8, .55); });
    minuteurNote -= dt;
    if (D.jukebox.visible && ouv && minuteurNote <= 0) {
      minuteurNote = .9; const n = notes.find(x => x.vie <= 0);
      if (n) { n.vie = 2.4; n.s.visible = true; n.s.position.set(5.5 + (Math.random() - .5) * .3, 1.5, -3.5); }
    }
    for (const n of notes) {
      if (n.vie <= 0) continue;
      n.vie -= dt; n.s.position.y += dt * .6; n.s.position.x += Math.sin(t * 3 + n.vie * 4) * dt * .4;
      n.s.material.opacity = Math.min(1, n.vie); if (n.vie <= 0) n.s.visible = false;
    }
  }

  // ---- Personnages : coiffures, chapeaux, tenues selon la météo, sacs, tailles ----
  // ---- Qui est ce client ? Un prénom, un âge, une commande tirée de la carte, et ce qu'il pense du café ----
  const PRENOMS_CLIENTS = ['Léa', 'Hugo', 'Chloé', 'Nathan', 'Manon', 'Camille', 'Jules', 'Sarah', 'Louis', 'Gabriel', 'Zoé', 'Adam', 'Jade', 'Raphaël', 'Lina', 'Arthur', 'Emma', 'Malik', 'Juliette', 'Paul', 'Agnès', 'Michel', 'Fatou', 'Yves', 'Nora', 'Bastien', 'Élise', 'Omar', 'Colette', 'Victor'];
  const METIERS = ['étudiante', 'infirmier', 'graphiste', 'retraitée', 'livreur', 'professeure', 'architecte', 'boulanger', 'avocate', 'touriste', 'musicien', 'comptable', 'pharmacienne', 'développeur', 'libraire'];
  function profilClient(e, hab) {
    const parts = partsCarte(e), boissons = Object.keys(parts).filter(id => CATALOGUE_CARTE[id].type === 'boisson'), extras = Object.keys(parts).filter(id => CATALOGUE_CARTE[id].type === 'extra');
    let x = Math.random() * boissons.reduce((s, id) => s + parts[id], 0), boisson = boissons[0];
    for (const id of boissons) { x -= parts[id]; if (x <= 0) { boisson = id; break; } }
    const commande = [boisson, ...extras.filter(id => Math.random() < parts[id])].map(id => CATALOGUE_CARTE[id].nom.toLowerCase());
    const r = ratioPrixCarte(e), sat = satisfaction(e);
    const pense = r > 1.15 ? 'C’est bon, mais franchement cher pour ce que c’est.'
      : sat >= 4.2 ? pick(['Le meilleur café du quartier, sans hésiter.', 'Je viens ici tous les matins, maintenant.', 'Quelle ambiance, on se sent bien ici.'])
      : sat < 2.8 ? pick(['Le café pourrait être bien meilleur.', 'Bof… il manque quelque chose ici.'])
      : r < .85 ? 'Pas cher du tout, j’adore !' : pick(['Un bon petit café, tranquille.', 'Sympa, je reviendrai.', 'Rien à redire, c’est correct.']);
    const humeur = r > 1.15 ? '💸' : sat >= 4.2 ? '😍' : sat >= 3.4 ? '🙂' : sat < 2.8 ? '😕' : null;
    const age = 18 + Math.floor(Math.random() * 62);
    return { nom: hab ? hab.nom : pick(PRENOMS_CLIENTS), age: hab ? null : age, metier: hab ? 'un habitué' : pick(METIERS), commande, pense, humeur, habitue: !!hab };
  }

  const COULEURS_TENUES = [0xE8584F, 0xF2B632, 0x6CC04A, 0x4FA3E0, 0xA77BDB, 0x2FB8B0, 0xF28A3A, 0xFFFFFF, 0xF06FA8];
  function habiller(p, cheveux, e) {
    const g = groupeTete(p), corps = grp(p), f = p.userData.forme, vrai = !!f, r = Math.random, met = e.meteo;
    const froid = met === 'froid', soleil = met === 'soleil' || met === 'chaleur';
    if (froid && r() < .7) {
      // bonnet à pompon et écharpe
      const c = pick(COULEURS_TENUES), b = put(new THREE.Mesh(new THREE.SphereGeometry(.215, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(c)), 0, 1.05, 0, g); b.castShadow = true;
      put(sph(.06, C.lait), 0, 1.27, 0, g);
      if (vrai) put(new THREE.Mesh(new THREE.TorusGeometry(f.cou[1], .035, 8, 18), mat(pick(COULEURS_TENUES))), 0, f.cou[0], 0, corps).rotation.x = Math.PI / 2;   // écharpe
      else put(new THREE.Mesh(new THREE.TorusGeometry(.17, .05, 8, 18), mat(pick(COULEURS_TENUES))), 0, .8, 0, g).rotation.x = Math.PI / 2;
    } else {
      const style = r();
      if (style < .18) put(sph(.09, cheveux), 0, 1.2, -.1, g);                                              // chignon
      else if (style < .34) { const q = put(sph(.07, cheveux), 0, .98, -.24, g); q.scale.set(.8, 1.7, .8); q.rotation.x = .5; }   // queue de cheval
      else if (style < .48) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; put(sph(.075, cheveux), Math.cos(a) * .16, 1.1 + (k % 2) * .05, Math.sin(a) * .16 - .02, g); }   // boucles
      else if (style < .6) { const c = pick(COULEURS_TENUES); put(new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(c)), 0, 1.06, 0, g); put(rbox(.24, .025, .18, c, .01), 0, 1.07, .2, g); }   // casquette
      else if (soleil && style < .8) { put(cyl(.34, .34, .02, 0xE8D29A, 20), 0, 1.16, 0, g); put(cyl(.17, .2, .14, 0xE8D29A, 16), 0, 1.24, 0, g); put(cyl(.205, .205, .04, C.framboise, 16), 0, 1.19, 0, g); }   // chapeau de paille
    }
    if (soleil && r() < .5) [-.075, .075].forEach(x => put(rbox(.11, .06, .02, 0x1E1E1E, .02), x, 1.01, .2, g));   // lunettes de soleil
    if (r() < .25) {   // sac en bandoulière
      if (vrai) { const s = put(rbox(.24, .28, .07, pick(COULEURS_TENUES), .03), f.hanche[1], f.hanche[0], 0, corps); s.rotation.z = .06; put(cyl(.008, .008, .62, 0x2E2622, 6), .1, f.hanche[0] + .24, 0, corps).rotation.z = .55; }
      else { const s = put(rbox(.2, .26, .07, pick(COULEURS_TENUES), .03), .27, .5, 0, g); s.rotation.z = .08; put(cyl(.01, .01, .3, C.cafe, 6), .27, .76, 0, g).rotation.z = .4; }
    }
    // tailles variées (de 1,60 m à 1,85 m environ, et parfois un enfant)
    const enfant = r() < .08, h = enfant ? (vrai ? .7 : .68) : vrai ? .93 + r() * .15 : .92 + r() * .18, l = enfant ? .78 : .94 + r() * .12;
    p.scale.set(l, h, l);
  }
  // Un chien qui suit son maître et remue la queue
  const PELAGES = [[C.caramel, C.cafe], [0xF2EDE4, 0xC8A276], [0x2E2A2A, 0x4A4040], [0xA89482, 0x6E5A4A], [0xD98A4A, 0xA0582A]];
  function chienPour() {
    const [pelage, oreilles] = pick(PELAGES), o = modele('chien', { pelage, oreilles });
    if (!o) return null;
    o.scale.setScalar(1.15); scene.add(o); ombreContact(o).scale.setScalar(.75);
    return { o, queue: o.getObjectByName('queue') };
  }
  function majChien(c, dt) {
    const d = c.chien.o, p = c.o.position, ang = c.o.rotation.y + 2.4;
    const cx = p.x + Math.sin(ang) * .55, cz = p.z + Math.cos(ang) * .55, dx = cx - d.position.x, dz = cz - d.position.z, dist = Math.hypot(dx, dz);
    if (dist > .06) { const v = Math.min(dist, dt * 3.4); d.position.x += dx / dist * v; d.position.z += dz / dist * v; d.rotation.y = Math.atan2(dx, dz); d.position.y = Math.abs(Math.sin(t * 15)) * .035; }
    else d.position.y = 0;
    if (c.chien.queue) c.chien.queue.rotation.y = Math.sin(t * 16) * .7;
  }

  // ---- Le ciel derrière le quartier : étoiles, lune et étoiles filantes la nuit, oiseaux le jour ----
  // Le groupe suit la caméra (toujours derrière le café) ; ses coordonnées vont de −1 à 1 sur la largeur et la hauteur de la vue.
  const ciel3D = new THREE.Group(); scene.add(ciel3D);
  const NB_ETOILES = 170, posEtoiles = new Float32Array(NB_ETOILES * 3);
  for (let k = 0; k < NB_ETOILES; k++) { posEtoiles[k * 3] = Math.random() * 2 - 1; posEtoiles[k * 3 + 1] = Math.random() * 2 - 1; }
  const geoEtoiles = new THREE.BufferGeometry(); geoEtoiles.setAttribute('position', new THREE.BufferAttribute(posEtoiles, 3));
  // des étoiles rondes et douces (sans texture, les points seraient carrés)
  const texEtoile = texture(32, 32, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,250,235,.9)'); r.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); });
  const matEtoiles = new THREE.PointsMaterial({ map: texEtoile, color: 0xFFF4DA, size: 5 * Math.min(devicePixelRatio, 2), sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false });
  ciel3D.add(new THREE.Points(geoEtoiles, matEtoiles));
  const texLune = texture(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 20, w / 2, w / 2, 64); r.addColorStop(0, 'rgba(255,240,200,.5)'); r.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
    g.fillStyle = '#FFF4D6'; g.beginPath(); g.arc(w / 2, w / 2, 26, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(w / 2 + 13, w / 2 - 8, 23, 0, Math.PI * 2); g.fill();
  });
  const lune = new THREE.Sprite(new THREE.SpriteMaterial({ map: texLune, transparent: true, opacity: 0, depthWrite: false })); lune.position.set(.78, .72, 0); ciel3D.add(lune);
  const texFilante = texture(128, 16, (g, w, h) => { const l = g.createLinearGradient(0, 0, w, 0); l.addColorStop(0, 'rgba(255,250,230,0)'); l.addColorStop(1, 'rgba(255,250,230,1)'); g.fillStyle = l; g.fillRect(0, h / 2 - 2, w, 4); });
  const filante = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFilante, transparent: true, opacity: 0, depthWrite: false, rotation: -.45 })); ciel3D.add(filante);
  let filanteT = 0, prochaineFilante = 5;
  const texOiseau = texture(64, 32, (g) => { g.strokeStyle = '#4A2E1F'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, 10); g.quadraticCurveTo(20, 4, 32, 18); g.quadraticCurveTo(44, 4, 58, 10); g.stroke(); });
  const oiseaux = Array.from({ length: 6 }, (_, k) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOiseau, transparent: true, opacity: .75, depthWrite: false })); s.visible = false; ciel3D.add(s); return { s, k }; });
  let vol = null, prochainVol = 12;
  const vCiel = new THREE.Vector3();
  function majCiel(dt, e) {
    // derrière le café, dans l'axe de la caméra, à la taille de la vue
    ciel3D.position.copy(cam.position).addScaledVector(cam.getWorldDirection(vCiel), 85);
    ciel3D.quaternion.copy(cam.quaternion);
    const sx = (cam.right - cam.left) / 2, sy = (cam.top - cam.bottom) / 2;
    ciel3D.scale.set(sx, sy, 1);
    const taille = (o, l, h) => o.scale.set(l / sx, h / sy, 1);   // une taille en unités de la scène, malgré l'échelle du groupe
    // La nuit tombe à partir de 17 h 30
    const nuitF = !ouvert(e) ? 1 : THREE.MathUtils.smoothstep(e.horloge, 17.5, 19);
    const clair = e.meteo === 'pluie' || e.meteo === 'nuages' ? .45 : 1;
    matEtoiles.opacity = nuitF * clair * (.75 + Math.sin(t * 3) * .08);
    lune.material.opacity = nuitF; taille(lune, 2.6, 2.6);
    // Étoile filante, de temps en temps
    prochaineFilante -= dt;
    if (nuitF > .6 && prochaineFilante <= 0 && filanteT <= 0) { filanteT = 1; prochaineFilante = 7 + Math.random() * 9; filante.userData.x = -.6 + Math.random() * .8; filante.userData.y = .5 + Math.random() * .35; }
    if (filanteT > 0) {
      filanteT -= dt * 1.4; const u = 1 - filanteT;
      filante.position.set(filante.userData.x + u * .5, filante.userData.y - u * .25, 0); taille(filante, 2.2, .28);
      filante.material.opacity = Math.sin(Math.min(1, u) * Math.PI) * nuitF;
    } else filante.material.opacity = 0;
    // Un vol d'oiseaux traverse le ciel les jours sans pluie
    prochainVol -= dt;
    const beau = ouvert(e) && nuitF < .3 && e.meteo !== 'pluie' && e.meteo !== 'froid';
    if (!vol && beau && prochainVol <= 0) { vol = { x: -1.2, y: .55 + Math.random() * .3, v: .09 + Math.random() * .05 }; prochainVol = 22 + Math.random() * 20; }
    oiseaux.forEach(({ s, k }) => {
      s.visible = !!vol; if (!vol) return;
      const rang = Math.ceil(k / 2), cote = k % 2 ? 1 : -1;
      s.position.set(vol.x - rang * .05, vol.y + cote * rang * .045, 0);
      taille(s, .55, .28 * (.6 + Math.abs(Math.sin(t * 9 + k)) * .5));
    });
    if (vol) { vol.x += vol.v * dt; vol.y += Math.sin(t * .7) * dt * .01; if (vol.x > 1.3) vol = null; }
  }

  // ---- La ville au loin : une silhouette de toits et son monument, derrière le café ----
  function texVille(monument, avecMonument = true) {
    return texture(1024, 256, (g, w, h) => {
      let graine = 7; const hasard = () => (graine = (graine * 9301 + 49297) % 233280) / 233280;
      g.fillStyle = 'rgba(255,255,255,1)';
      // des toits de la ville, avec cheminées et pignons
      for (let x = 0; x < w;) {
        const l = 40 + hasard() * 60, hh = 40 + hasard() * 70;
        g.fillRect(x, h - hh, l - 3, hh);
        if (hasard() < .5) { g.beginPath(); g.moveTo(x - 2, h - hh); g.lineTo(x + l / 2, h - hh - 22); g.lineTo(x + l, h - hh); g.fill(); }
        if (hasard() < .4) g.fillRect(x + l * .7, h - hh - 14, 6, 14);
        x += l;
      }
      if (!avecMonument) return;
      const c = w * .44, sol = h - 60;   // au-dessus du mur du fond du café
      g.beginPath();
      if (monument === 'tour') {        // la tour Eiffel
        g.moveTo(c - 70, h); g.quadraticCurveTo(c - 20, sol - 60, c - 6, 20); g.lineTo(c + 6, 20); g.quadraticCurveTo(c + 20, sol - 60, c + 70, h); g.fill();
        g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(c, h - 10, 34, Math.PI, 0); g.fill(); g.globalCompositeOperation = 'source-over';
        g.fillRect(c - 38, sol - 20, 76, 7); g.fillRect(c - 22, sol - 90, 44, 6); g.fillRect(c - 2, 4, 4, 18);
      } else if (monument === 'beffroi') {   // le beffroi
        g.fillRect(c - 22, 60, 44, h - 60); g.fillRect(c - 30, 100, 60, 10); g.moveTo(c - 22, 60); g.lineTo(c, 6); g.lineTo(c + 22, 60); g.fill();
      } else if (monument === 'cathedrale') { // une seule flèche, comme à Strasbourg
        g.fillRect(c - 70, 110, 140, h - 110); g.fillRect(c - 70, 70, 34, 40); g.moveTo(c - 70, 70); g.lineTo(c - 53, 2); g.lineTo(c - 36, 70); g.fill(); g.fillRect(c + 36, 90, 34, 20);
      } else if (monument === 'bonnemere') { // la colline, la basilique et la mer
        g.ellipse(c, h + 20, 210, 120, 0, Math.PI, 0); g.fill(); g.fillRect(c - 30, 60, 60, 50); g.fillRect(c - 9, 14, 18, 50); g.beginPath(); g.arc(c, 14, 9, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 4; k++) { g.fillRect(w * .1 + k * 60, h - 70, 3, 50); g.beginPath(); g.moveTo(w * .1 + k * 60 + 3, h - 66); g.lineTo(w * .1 + k * 60 + 28, h - 30); g.lineTo(w * .1 + k * 60 + 3, h - 30); g.fill(); }
      } else if (monument === 'chateau') {   // le château et ses tours rondes
        g.fillRect(c - 110, 120, 220, h - 120);
        [-110, -40, 40, 110].forEach(dx => { g.fillRect(c + dx - 18, 90, 36, h - 90); for (let k = 0; k < 3; k++) g.fillRect(c + dx - 18 + k * 14, 80, 8, 12); });
      } else if (monument === 'capitole') {  // une longue façade et un clocher octogonal
        g.fillRect(c - 160, 130, 320, h - 130); g.fillRect(c - 40, 110, 80, 20); g.fillRect(c + 120, 40, 30, h - 40); g.moveTo(c + 118, 40); g.lineTo(c + 135, 0); g.lineTo(c + 152, 40); g.fill();
      } else if (monument === 'pont') {      // le pont de pierre sur le fleuve
        g.fillRect(0, h - 40, w, 6);
        for (let k = 0; k < 9; k++) { g.fillRect(k * 115, h - 70, 115, 22); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.ellipse(k * 115 + 57, h - 48, 44, 22, 0, Math.PI, 0); g.fill(); g.globalCompositeOperation = 'source-over'; }
      } else {                                // Lyon : la colline de Fourvière et sa basilique
        g.ellipse(c, h + 30, 240, 140, 0, Math.PI, 0); g.fill(); g.fillRect(c - 60, 50, 120, 50); [-60, -20, 20, 60].forEach(dx => g.fillRect(c + dx - 8, 30, 16, 30)); g.fillRect(c + 80, 20, 10, 60);
      }
    });
  }
  // Deux grandes façades plates au fond du quartier (derrière le café) : le monument au fond, des toits à gauche
  const matVilleFond = new THREE.MeshBasicMaterial({ transparent: true, opacity: .55, depthWrite: false, color: 0x9C8070 });
  const matVilleCote = matVilleFond.clone();
  // (repoussées loin derrière les immeubles du quartier, et agrandies pour dépasser de leurs toits)
  const villeLoin = put(new THREE.Mesh(new THREE.PlaneGeometry(36, 9), matVilleFond), 2, 9, -26); villeLoin.scale.setScalar(2.2);
  const villeCote = put(new THREE.Mesh(new THREE.PlaneGeometry(30, 7), matVilleCote), -26, 7, 1); villeCote.rotation.y = Math.PI / 2; villeCote.scale.setScalar(2.2);

  // ---- Le quartier (KayKit City Builder, Kay Lousberg, CC0) : des immeubles voisins derrière et à gauche du café,
  // une route devant, avec des voitures qui passent dans les deux sens ----
  const quartier = grp(scene);
  const IMM = 'abcdefgh';
  for (let k = 0; k < 6; k++) kk(`immeuble_${IMM[(k * 3 + 2) % 8]}`, -16.6 + k * 7.4, 0, -12.2, 0, quartier);
  for (let k = 0; k < 2; k++) kk(`immeuble_${IMM[(k * 5 + 1) % 8]}`, -10.4, 0, -1.8 + k * 7.4, Math.PI / 2, quartier);
  for (let x = -36; x <= 36; x += 9) kk(x === 0 ? 'route_passage' : 'route', x, -.08, 13.3, Math.PI / 2, quartier);
  [[-8.6, 6.4], [-8.6, 8.0], [10.6, -2.4], [10.6, 1.2], [10.6, 4.6]].forEach(([x, z]) => kk('buisson', x, 0, z, Math.random() * 6, quartier));
  kk('borne_incendie', 9.0, 0, 8.35, 0, quartier);
  kk('benne', -4.6, 0, -5.0, 0, quartier);
  // les voitures : deux files, en boucle d'un bout à l'autre de la rue
  const MODELES_VOITURES = ['voiture_a', 'voiture_b', 'voiture_taxi', 'voiture_c'];
  const voitures = MODELES_VOITURES.map((nom, k) => {
    const sens = k % 2 ? -1 : 1, m = kk(nom, -30 + k * 17, 0, sens > 0 ? 12.1 : 14.6, sens > 0 ? Math.PI / 2 : -Math.PI / 2, quartier);
    return m && { m, sens, vitesse: 4 + Math.random() * 3, pause: 0 };
  }).filter(Boolean);
  function majVoitures(dt) {
    for (const v of voitures) {
      v.m.position.x += v.sens * v.vitesse * dt;
      if (v.sens > 0 && v.m.position.x > 38) { v.m.position.x = -38; v.vitesse = 4 + Math.random() * 3; }
      if (v.sens < 0 && v.m.position.x < -38) { v.m.position.x = 38; v.vitesse = 4 + Math.random() * 3; }
    }
  }
  let villeAffichee = null; const teinteVille = new THREE.Color(0xEFDDC8);
  function majVille(e) {
    const nom = VILLES[e.meta.ville % VILLES.length], info = INFOS_VILLES[nom];
    if (nom === villeAffichee) return;
    villeAffichee = nom;
    matVilleFond.map?.dispose(); matVilleFond.map = texVille(info.monument); matVilleFond.needsUpdate = true;
    matVilleCote.map?.dispose(); matVilleCote.map = texVille(info.monument, false); matVilleCote.needsUpdate = true;
    teinteVille.setHex(info.ciel);
    matsTrottoir.forEach(m => m.color.setHex(info.trottoir));
  }

  // ---- L'annexe-cuisine, dehors à droite du café : fenêtre éclairée, cheminée qui fume, chef en toque ----
  D.cuisine = grp(scene, 7.05, 0, -.95);
  put(rbox(1.5, 1.7, 1.7, 0xF3E6D3, .05), 0, .85, 0, D.cuisine);
  const toit = new THREE.Shape(); toit.moveTo(-.95, 0); toit.lineTo(0, .7); toit.lineTo(.95, 0); toit.lineTo(-.95, 0);
  const mToit = put(ombre(new THREE.Mesh(new THREE.ExtrudeGeometry(toit, { depth: 1.9, bevelEnabled: false }), mat(C.framboise))), 0, 1.7, -.95, D.cuisine);
  mToit.rotation.y = 0;
  put(rbox(.24, .7, .24, 0xA8957F, .03), .4, 2.3, -.3, D.cuisine);
  const fenetreCuisine = put(new THREE.Mesh(new THREE.PlaneGeometry(.7, .55), mat(0xFFE2B0, { emissive: 0xFFC27A, emissiveIntensity: .6 })), .76, 1.05, .2, D.cuisine); fenetreCuisine.rotation.y = Math.PI / 2;
  put(rbox(.06, .65, .62, C.bois, .02), .77, 1.05, .2, D.cuisine).visible = false;
  put(rbox(.55, 1.05, .06, C.bois, .03), -.25, .53, .86, D.cuisine);
  const texCuisine = texture(160, 48, (g, w, h) => { g.fillStyle = '#4A2E1F'; g.beginPath(); g.roundRect(0, 0, w, h, 12); g.fill(); g.fillStyle = '#FFFDF8'; g.font = '600 26px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Cuisine', w / 2, h / 2 + 2); });
  put(new THREE.Mesh(new THREE.PlaneGeometry(.7, .21), new THREE.MeshBasicMaterial({ map: texCuisine, transparent: true })), .3, 1.4, .87, D.cuisine);
  const fumeeCuisine = Array.from({ length: 6 }, (_, k) => { const f = put(new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xF2EEE8, transparent: true, opacity: 0, depthWrite: false })), .4, 2.7, -.3, D.cuisine); f.userData.phase = k / 6; return f; });
  const chef = perso(C.lait, 0x4A2E1F, { tablier: true }); put(chef, -.85, 0, .95, D.cuisine); chef.rotation.y = .5;
  put(cyl(.15, .12, .26, C.lait, 16), 0, 1.3, 0, chef); put(sph(.17, C.lait), 0, 1.45, 0, chef).scale.set(1, .6, 1);   // toque
  function majCuisine(dt, e) {
    if (!D.cuisine.visible) return;
    const actif = ouvert(e) && !!formuleDuMoment(e);
    fumeeCuisine.forEach(f => {
      const ph = (t * .25 + f.userData.phase) % 1;
      f.position.set(.4 + Math.sin(ph * 6 + f.userData.phase * 9) * .12 + ph * .3, 2.7 + ph * 1.6, -.3);
      f.scale.setScalar(.6 + ph * 1.6); f.material.opacity = Math.sin(ph * Math.PI) * (actif ? .55 : .2);
    });
    fenetreCuisine.material.emissiveIntensity = actif ? 1.3 : .5;
    if (chef.userData.anim) jouer(chef, actif ? 'travail' : 'repos', actif ? 1.4 : 1);
    const mb = chef.userData.membres; if (mb && mb.bd) mb.bd.rotation.x = -1 + Math.sin(t * (actif ? 7 : 2)) * .4;
  }

  const pulsations = new Map();
  let gainEnAttente = 0, minuteurClient = 1, t = 0;

  // ---- Une image ----
  function image(dt, e, res) {
    etat = e; t += dt;
    gainEnAttente += res.recette || 0;
    e.st.forEach((st, i) => {
      const p = pulsations.get(i) || 0;
      groupes[i].scale.set(1, p > 0 ? 1 + Math.sin((1 - p / .35) * Math.PI) * .06 : 1, 1);
      groupes[i].position.x = st.panne ? Math.sin(t * 40) * .02 : 0;
      if (p > 0) pulsations.set(i, Math.max(0, p - dt));
      fumees[i].forEach(f => {
        const ph = (t * .5 + f.userData.phase) % 1;
        f.position.y = ANCRES[i].y - .9 + ph * 1.3; f.scale.setScalar(.6 + ph * 1.4); f.material.opacity = st.panne ? Math.sin(ph * Math.PI) * .7 : 0;
      });
    });
    // Les sacs de la réserve : autant d'emplacements remplis que la réserve est pleine, chaque grain avec sa couleur
    const places = sacsPile.filter(s => s.userData.place.quand(e));
    const enStock = Object.entries(e.stock).filter(([, v]) => v > 0), total = enStock.reduce((x, [, v]) => x + v, 0);
    const nSacs = total > 0 ? Math.max(1, Math.round(places.length * Math.min(1, total / capaciteReserve(e)))) : 0;
    const couleurs = []; enStock.sort((x, y) => y[1] - x[1]).forEach(([g, v]) => { for (let k = 0; k < Math.round(nSacs * v / total) && couleurs.length < nSacs; k++) couleurs.push(COULEUR_SAC[g]); });
    while (couleurs.length < nSacs) couleurs.push(COULEUR_SAC[e.maison]);
    sacsPile.forEach(s => { s.visible = false; });
    places.forEach((s, k) => { s.visible = k < nSacs; if (k < nSacs) (s.userData.toile || s.children[0].material).color.setHex(couleurs[k]); });

    const actif = i => res.ventes <= 0 ? .1 : Math.min(3, .45 + debitStation(e, i) / debitMax(e, i) * Math.log2(1 + e.st[i].niv) * .7);
    // Le coursier va chercher un sac sur l'étagère de la réserve (par la porte) et le porte au moulin
    if (coursier.libre()) coursier.aller(
      { x: -3.45, z: -2.9 }, { x: -4.4, z: -3.15, face: Math.PI, attente: .5, fn: () => { sacPorte.visible = e.stock[e.maison] > 0; } },
      { x: -3.45, z: -2.9 }, { x: -2.5, z: -2.3, face: Math.PI, attente: .5, fn: () => { sacPorte.visible = false; } });
    coursier.maj(dt, e.st[0].panne ? 0 : actif(0));
    const am = e.st[1].panne ? 0 : actif(1);
    tambour.rotation.x += dt * 3 * am; manivelle.rotation.y += dt * 4 * am;
    const ab = e.st[2].panne ? 0 : actif(2), nb = nbMachines(e);
    vapeurs.forEach((vap, i) => vap.forEach(v => {
      const ph = (t * .6 * ab + v.userData.phase + i * .13) % 1;
      v.position.y = 1.85 + ph * .9; v.scale.setScalar(.6 + ph * 1.1); v.material.opacity = i < nb ? Math.sin(ph * Math.PI) * .55 * Math.min(1, ab) : 0;
    }));
    baristas.forEach((b, i) => {
      b.rotation.y = Math.sin(t * 2.2 * ab + i) * .5 * Math.min(1, ab); b.position.y = Math.abs(Math.sin(t * 5 * ab + i)) * .02;
      if (b.userData.anim) jouer(b, ab > .15 ? 'travail' : 'repos', .6 + Math.min(1.2, ab) * .6);
      const mb = b.userData.membres;
      if (mb && mb.bd) { mb.bd.rotation.x = -1.1 + Math.sin(t * 6 * ab + i) * .35 * Math.min(1, ab); mb.bg.rotation.x = -.7 + Math.sin(t * 4 * ab + i * 2) * .25 * Math.min(1, ab); }
    });
    eclairer(ouvert(e) ? avanceeJournee(e) : 1, pleut(e), !ouvert(e));
    D.ferme.visible = !ouvert(e); baristas.forEach(b => { if (!ouvert(e)) b.visible = false; });
    pluie.visible = pleut(e); if (pluie.visible) majPluie(dt);
    majPieces(dt); majArdoise(e);
    D.lait.visible = a(e, 'buse');
    briques.forEach((b, k) => { b.visible = e.lait > k * 100; });
    managers.forEach((m, i) => {
      m.visible = e.st[i].manager;
      if (!m.visible) return;
      m.position.y = Math.abs(Math.sin(t * 1.5 + i)) * .015;
      if (m.userData.anim) jouer(m, 'travail', .8);
      const mb = m.userData.membres;
      if (mb && mb.bd) { mb.bd.rotation.x = -.6 + Math.sin(t * 2 + i) * .25; mb.tete.rotation.y = Math.sin(t * .7 + i * 2) * .4; }
    });
    if (serveur.libre()) {
      const pl = pick(sieges.filter(s => TABLES[s.table].g.visible));
      serveur.aller({ x: -.9, z: -.75, face: Math.PI, attente: .4, fn: () => { plateau.visible = res.ventes > 0; } },
                    { x: pl.x + (pl.face > 0 ? .1 : -.1), z: pl.z + .6, attente: .4, fn: () => { plateau.visible = false; } });
    }
    serveur.maj(dt, actif(3));

    // Clients : leur nombre suit la demande
    minuteurClient -= dt;
    if (minuteurClient <= 0 && clients.length < 11 && ouvert(e)) {
      minuteurClient = Math.max(.7, 3.2 / (1 + res.demande * .8));
      const en = entree();
      // Environ un client sur huit est un habitué (s'il n'y en a pas déjà un dans la salle)
      const hab = !clients.some(x => x.habitue) && Math.random() < .13 ? choisirHabitue(e, Math.random()) : null;
      const cheveux = pick(CHEVEUX);
      const corpsClient = hab ? perso(hab.habit, hab.cheveux, { peau: hab.peau }) : perso(pick(HABITS), cheveux, { peau: pick(PEAUX), pantalon: pick(PANTALONS) });
      if (hab) accessoire(corpsClient, hab.accessoire); else habiller(corpsClient, cheveux, e);
      const parapluie = pleut(e) && Math.random() < .75 ? accessoire(corpsClient, 'parapluie') : null;
      const c = new Marcheur(put(corpsClient, en.x, 0, en.z), 1.7 + Math.random() * .5);
      c.habitue = hab; c.parapluie = parapluie;
      // Un client sur dix vient avec son chien (un sur quatre quand il fait beau)
      if (Math.random() < (e.meteo === 'soleil' ? .25 : .1)) { c.chien = chienPour(); if (c.chien) c.chien.o.position.set(en.x + .5, 0, en.z); }
      c.o.rotation.y = Math.PI;
      // Quand le café ne suit pas, une partie des clients fait la queue… puis repart sans être servie
      const perdus = res.demande > 0 ? Math.max(0, Math.min(.9, 1 - res.ventes / res.demande)) : 0;
      const repart = res.ventes > 0 && Math.random() < perdus;
      const sert = res.ventes > 0 && !repart;
      const place = sert && Math.random() < .7 ? sieges.find(s => s.libre && TABLES[s.table].g.visible) : null;
      if (place) place.libre = false;
      const tete = m => m.o.position.clone().add(new THREE.Vector3(0, m.o.userData.forme ? m.o.userData.forme.tete : 1.6, 0));
      c.profil = profilClient(e, hab);
      // la file d'attente se forme du comptoir vers la porte
      const rang = Math.min(5, clients.filter(x => x.enFile).length);
      c.enFile = true;
      const attente = 1 + (perdus > .1 ? rang * .6 : 0) + (repart ? 2.5 : 0);
      if (repart) setTimeout(() => { if (!c.fini && c.enFile) surHumeur(tete(c), '⏳'); }, 2500);
      c.aller({ x: 1.35, z: 2.6 },   // on entre par la droite de la porte, on ressort par la gauche
        { x: pick(pointsAttente()), z: -.55 + rang * .55, face: Math.PI, attente, fn: m => {
        m.enFile = false;
        if (sert) {
          const ta = modele('tasse'); if (ta) { const f = m.o.userData.forme; put(ta, f ? f.main[1] : .23, f ? f.main[0] : .5, .08, m.o); if (f) ta.scale.setScalar(f.tasse); } else put(cyl(.07, .055, .14, C.lait, 10), .2, .62, .17, m.o);
          if (gainEnAttente > 0) { surPop(tete(m), '+' + fmt(gainEnAttente)); gainEnAttente = 0; lancerPieces(tete(m)); }   // des pièces qui volent jusqu'à la caisse
          m.profil.servi = true;
          if (m.habitue) surHabitue(m.habitue, tete(m).add(new THREE.Vector3(0, .5, 0)));
          else if (m.profil.humeur && Math.random() < .45) surHumeur(tete(m), m.profil.humeur);
        } else if (repart) { m.profil.parti = true; m.profil.pense = 'Trop d’attente… je reviendrai un autre jour.'; surHumeur(tete(m), '😠'); }
        else surPop(tete(m), 'Plus de café ?!', true);
      } });
      if (place) c.aller({ x: place.x, z: place.z + .9 }, { x: place.x, z: place.z, face: place.face, assis: true, attente: 3 + Math.random() * 3, fn: () => { place.libre = true; } });
      c.aller({ x: .65, z: 2.8 }, { x: en.x, z: en.z, fn: m => { m.fini = true; } });
      clients.push(c);
    }
    for (const c of clients) {
      c.maj(dt, 1);
      // on ferme son parapluie en entrant dans le café
      if (c.parapluie) { const p = c.o.position; c.parapluie.visible = p.z > 4.1 || p.x > 6.1; }
      if (c.chien) majChien(c, dt);
    }
    for (const c of livreurs) c.maj(dt, 1);
    const nettoyer = liste => liste.filter(c => { if (c.fini) { c.quitter(); scene.remove(c.o); if (c.chien) scene.remove(c.chien.o); return false; } return true; });
    clients = nettoyer(clients); livreurs = nettoyer(livreurs);

    for (const p of animes) { if (!p.parent) { animes.delete(p); continue; } if (p.visible) p.userData.anim.mixer.update(dt); }   // les personnages animés
    majChutes(dt); majConfettis(dt); majPigeons(dt); majVoitures(dt); majMeteo(dt, e); majConfort(dt, e); majCiel(dt, e); majCuisine(dt, e);
    machines.forEach(m => { const b = m.userData.bras; if (b && b.parent.visible) b.rotation.y = Math.sin(t * 2.6 * Math.max(.2, ab)) * 1.1; });
    if (innerWidth && innerHeight) { if (hauteQualite) composer.render(); else renderer.render(scene, cam); }
  }

  // Mélange les ambiances voisines selon l'heure (0 = début du matin, 1 = fin de soirée)
  const cA = new THREE.Color(), cB = new THREE.Color();
  const gris = new THREE.Color(0xB8BCC4);
  const bleuNuit = new THREE.Color(0x5E6488);
  function eclairer(h, averse, nuit = false) {
    const x = Math.min(h, 1) * (AMBIANCES.length - 1), i = Math.floor(x) % AMBIANCES.length, j = (i + 1) % AMBIANCES.length;
    const f = THREE.MathUtils.smoothstep(x - Math.floor(x), .6, 1);
    const A = AMBIANCES[i], B = AMBIANCES[j], mix = (u, v) => u + (v - u) * f;
    scene.background.copy(cA.setHex(A.fond)).lerp(cB.setHex(B.fond), f);
    soleil.color.copy(cA.setHex(A.soleil)).lerp(cB.setHex(B.soleil), f); soleil.intensity = mix(A.iSoleil, B.iSoleil);
    ciel.intensity = mix(A.iCiel, B.iCiel);
    vitre.material.emissive.copy(cA.setHex(A.fenetre)).lerp(cB.setHex(B.fenetre), f);
    scene.background.lerp(teinteVille, .35);   // chaque ville a sa lumière
    if (averse) { scene.background.lerp(gris, .55); soleil.intensity *= .55; ciel.intensity *= .85; }
    // La météo du jour colore la lumière : soleil franc, ciel couvert, canicule dorée, froid bleuté
    const met = etat?.meteo;
    if (met === 'nuages') { soleil.intensity *= .82; scene.background.lerp(gris, .18); }
    if (met === 'soleil') soleil.intensity *= 1.08;
    if (met === 'chaleur') { soleil.color.lerp(cB.setHex(0xFFB868), .35); soleil.intensity *= 1.15; scene.background.lerp(cB.setHex(0xF6D2A2), .3); }
    if (met === 'froid') { soleil.color.lerp(cB.setHex(0xCFDDF5), .5); soleil.intensity *= .8; scene.background.lerp(cB.setHex(0xDCE5F0), .5); }
    if (nuit) { scene.background.lerp(bleuNuit, .6); soleil.intensity *= .3; ciel.intensity *= .55; }
    const l = mix(A.lampes, B.lampes) + (averse ? .5 : 0) + (nuit ? 1 : 0);
    lumieresLampes.forEach(p => { p.intensity = 4 * l; }); lumiereAmpoule.intensity = 2 * l;
    // Les lampadaires s'allument le soir (et sous la pluie)
    const sombre = Math.max(0, (l - .8) / .8);
    lumieresRue.forEach(p => { p.intensity = 6 * sombre; });
    lanternes.forEach(m => { m.emissive.setHex(0xFFC870); m.emissiveIntensity = .2 + 2.4 * sombre; });
    // La nuit, l'enseigne neuve s'illumine et la fenêtre prend une lueur chaude
    enseigne.material.color.setScalar(etat && a(etat, 'enseigne') ? 1 + 1.4 * sombre : 1);
    if (nuit) { vitre.material.emissive.lerp(cB.setHex(0xFFC27A), .8); vitre.material.emissiveIntensity = .5 + .8 * sombre; } else vitre.material.emissiveIntensity = .5;
    // Guirlande : éteinte le matin, elle s'allume doucement en fin de journée
    matAmpoules.color.setHex(0xFFE2A0).multiplyScalar(.55 + 3.2 * sombre);
    D.guirlande.visible = !!etat && a(etat, 'terrasse');
    // Rayons de soleil : surtout le matin et le midi, pas la nuit ni sous la pluie
    majRayons(nuit || averse ? 0 : Math.max(0, 1 - Math.max(0, h - .45) * 2.2));
  }

  // Un livreur apporte des sacs
  function livraison(grain, sacs) {
    const en = entree();
    const l = new Marcheur(put(perso(0x5E9CA0, pick(CHEVEUX), { peau: pick(PEAUX) }), en.x, 0, en.z), 2.6);
    const s = sac(COULEUR_SAC[grain]); s.scale.setScalar(.75); put(s, 0, .55, .25, l.o);
    l.aller({ x: 1.0, z: .3 }, { x: -3.4, z: -.9 }, { x: -4.2, z: -2.0, attente: .4, fn: () => { s.visible = false; } },
            { x: 1.0, z: .3 }, { x: en.x, z: en.z, fn: m => { m.fini = true; } });
    livreurs.push(l);
  }

  redim();
  // Graphismes « beaux » (ombres, haute résolution) ou « légers » pour les petits téléphones
  // Sur téléphone, on limite la finesse de l'image (les écrans sont très denses) : plus fluide, moins de batterie
  const telephone = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
  function qualite(haute) {
    hauteQualite = haute;
    renderer.setPixelRatio(haute ? Math.min(devicePixelRatio, telephone ? 1.6 : 2) : 1);
    renderer.shadowMap.enabled = haute;
    scene.traverse(o => { if (o.isMesh) [].concat(o.material).forEach(m => { m.needsUpdate = true; }); });
    redim();
  }
  // ---- Vignettes du catalogue : chaque modèle rendu en petit, de trois quarts, avec sa couleur ----
  const vignettes = new Map();
  let vig = null;
  function vignette(nom, teinte) {
    const cle = nom + '|' + (teinte ?? '');
    if (vignettes.has(cle)) return vignettes.get(cle);
    if (!M[nom]) return '';
    if (!vig) {
      const T = 192;
      vig = { T, rt: new THREE.WebGLRenderTarget(T, T, { samples: 4 }), sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(28, 1, .05, 50),
              toile: Object.assign(document.createElement('canvas'), { width: T, height: T }), px: new Uint8Array(T * T * 4) };
      vig.rt.texture.colorSpace = THREE.SRGBColorSpace;
      vig.sc.add(new THREE.HemisphereLight(0xFFF4E6, 0xC8A88A, 1.6));
      const sol = new THREE.DirectionalLight(0xFFE7C8, 2.4); sol.position.set(2, 4, 3); vig.sc.add(sol);
      const contre = new THREE.DirectionalLight(0xCFE2FF, .8); contre.position.set(-3, 2, -2); vig.sc.add(contre);
      vig.sc.environment = reflets;
    }
    const o = M[nom].clone(true);
    o.traverse(m => {
      if (!m.isMesh) return;
      if (teinte !== undefined && m.material.name === 'corps') { m.material = m.material.clone(); m.material.color.setHex(teinte); }
    });
    vig.sc.add(o);
    // Cadrage automatique sur la boîte du modèle, vue de face et un peu de côté
    const boite = new THREE.Box3().setFromObject(o), centre = boite.getCenter(new THREE.Vector3()), taille = boite.getSize(new THREE.Vector3());
    const rayon = Math.max(taille.x, taille.y, taille.z) * .62;
    const dist = rayon / Math.sin(THREE.MathUtils.degToRad(vig.cam.fov / 2));
    vig.cam.position.copy(centre).add(new THREE.Vector3(.55, .42, 1).normalize().multiplyScalar(dist));
    vig.cam.lookAt(centre);
    const fond = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha(), ombres = renderer.shadowMap.enabled;
    renderer.setClearColor(0x000000, 0); renderer.shadowMap.enabled = false;
    renderer.setRenderTarget(vig.rt); renderer.clear(); renderer.render(vig.sc, vig.cam);
    renderer.readRenderTargetPixels(vig.rt, 0, 0, vig.T, vig.T, vig.px);
    renderer.setRenderTarget(null); renderer.setClearColor(fond, alpha); renderer.shadowMap.enabled = ombres;
    vig.sc.remove(o);
    // Les pixels arrivent la tête en bas : on les retourne dans une petite toile
    const ctx = vig.toile.getContext('2d'), img = ctx.createImageData(vig.T, vig.T), ligne = vig.T * 4;
    for (let y = 0; y < vig.T; y++) img.data.set(vig.px.subarray((vig.T - 1 - y) * ligne, (vig.T - y) * ligne), y * ligne);
    ctx.clearRect(0, 0, vig.T, vig.T); ctx.putImageData(img, 0, 0);
    const url = vig.toile.toDataURL('image/png');
    vignettes.set(cle, url);
    return url;
  }

  // ---- Capture en haute définition (visuels des portails, outil ?debug) : la scène seule, sans l'interface ----
  function capture(l, h, { x = cible.x, z = cible.z, largeur = largeurVue * zoom } = {}) {
    const ratio = renderer.getPixelRatio(), avant = { x: cible.x, z: cible.z };
    renderer.setPixelRatio(1); renderer.setSize(l, h, false); composer.setPixelRatio(1); composer.setSize(l, h);
    cible.set(x, 0, z);
    const r = l / h, L = r < 1 ? largeur : largeur * 1.15 * Math.max(1, r / 1.6), H = L / r;
    Object.assign(cam, { left: -L / 2, right: L / 2, top: H / 2, bottom: -H / 2 }); cam.updateProjectionMatrix(); placerCam();
    if (innerWidth && innerHeight) { if (hauteQualite) composer.render(); else renderer.render(scene, cam); }
    const toile = Object.assign(document.createElement('canvas'), { width: l, height: h });
    toile.getContext('2d').drawImage(renderer.domElement, 0, 0);
    renderer.setPixelRatio(ratio); cible.set(avant.x, 0, avant.z); redim();
    return toile;
  }

  return { majDecor, image, livraison, projeter, ANCRES, pulse: i => pulsations.set(i, .35), redim, qualite, vignette, capture, grille, marcheurs: () => [...Marcheur.tous] };
}
