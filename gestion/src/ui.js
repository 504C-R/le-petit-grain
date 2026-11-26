// Interface (DOM) — version gestion : en-tête (date, caisse, note, vitesse), étiquettes, panneaux, journal du soir, carnet.
import * as J from './game.js';
import { sons, regleSon, regleMusique } from './sons.js';
import { STATIONS, GRAINS, G, TRAVAUX, T, SUCCES, HISTOIRE, MOTS_TRAVAUX, DOSES_SAC, LAIT, MOMENTS, TARIFS, MURS, SOLS, STYLES, FORMULES,
  PERSONNEL, ROLES, PRETS, MOIS, DECOUVERT, VIENNOISERIES, CARTE, MARKETING, FIDELITE, HISTOIRES_HABITUES, HABITUES, LETTRES, NIVEAUX_POSTES, DEBLOCAGES } from './data.js';
const heureTexte = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

export function fmt(n) {
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n < 100) s = n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  else if (n < 1e6) s = Math.round(n).toLocaleString('fr-FR') + ' €';
  else s = (n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' M€';
  return (neg ? '−' : '') + s;
}
export const virg = (n, d = 1) => n.toFixed(d).replace('.', ',');
const kg = doses => virg(doses / DOSES_SAC, doses / DOSES_SAC < 10 ? 1 : 0) + ' kg';
const $ = id => document.getElementById(id);
const PANNEAUX = ['fiche', 'p-stock', 'p-prix', 'p-travaux', 'p-carnet'];
const ICONES_ROLE = { barista: '☕', salle: '🍽️', cuisine: '🥐' };
const ICONES_MOMENTS = ['🌅', '☀️', '🌤️', '🌇'];
const COURTS_MOMENTS = ['Matin', 'Midi', 'Aprèm', 'Soir'];

export function creerUI({ jeu, scene }) {
  const E = () => jeu.e;
  let ouvert = null, choisie = null, accUI = 0, accPanneau = 0, revenuLisse = 0, toastT = null, argentAffiche = E().argent, dernierArgent = E().argent, dernierPulse = 0;

  // ---------- Bulle de mamie et notifications ----------
  function bulle(texte, { titre = 'Mamie Odette', boutons = [{ label: "D'accord !" }] } = {}) {
    $('bulle-titre').textContent = titre; $('bulle-txt').textContent = texte; $('bulle').classList.remove('haut', 'bas');
    const zone = $('bulle-boutons'); zone.innerHTML = ''; zone.className = 'boutons' + (boutons.length === 1 ? ' un' : '');
    boutons.forEach(b => {
      const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label;
      el.onclick = () => { $('bulle').hidden = true; b.fn?.(); };
      zone.appendChild(el);
    });
    $('bulle').hidden = false;
    sons.bulle();
  }
  function toast(html, duree = 4500) {
    $('toast').innerHTML = html; $('toast').classList.remove('cache');
    clearTimeout(toastT); toastT = setTimeout(() => $('toast').classList.add('cache'), duree);
  }
  function pop(pos, txt, rouge = false) {
    const [x, y] = scene.projeter(pos);
    const el = document.createElement('div'); el.className = 'pop' + (rouge ? ' rouge' : ''); el.textContent = txt;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('labels').appendChild(el); setTimeout(() => el.remove(), 1300);
  }
  function parole(pos, nom, texte) {
    const [x, y] = scene.projeter(pos);
    const el = document.createElement('div'); el.className = 'parole';
    el.innerHTML = '<b></b><span></span>'; el.querySelector('b').textContent = nom; el.querySelector('span').textContent = texte;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('labels').appendChild(el); setTimeout(() => el.remove(), 3600);
  }
  // L'humeur d'un client : une petite pastille ronde au-dessus de sa tête, qui s'efface
  function humeur(pos, icone) {
    const [x, y] = scene.projeter(pos);
    const el = document.createElement('div'); el.className = 'humeur'; el.textContent = icone;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('labels').appendChild(el); setTimeout(() => el.remove(), 2200);
  }
  // ---------- Le papier : la Gazette du quartier et le bilan de l'année, mis en page comme un journal ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function ouvrirPapier(html) { $('papier-contenu').innerHTML = html; $('papier').hidden = false; $('papier').scrollTop = 0; sons.bulle(); }
  $('papier-fermer').onclick = () => {
    $('papier').hidden = true; sons.clic();
    if (vitesseAvantLecture !== null) { if (jeu.vitesse === 0) { jeu.vitesse = vitesseAvantLecture || 1; majVitesse(); } vitesseAvantLecture = null; }
  };
  // ---------- Revenir le lendemain : le courrier de mamie et les histoires des habitués ----------
  // On lit tranquille : le jeu se met en pause le temps de la lettre ou du chapitre
  let vitesseAvantLecture = null;
  const pauserPourLire = () => { if (vitesseAvantLecture === null) { vitesseAvantLecture = jeu.vitesse; jeu.vitesse = 0; majVitesse(); } };
  const coeurs = (n, total) => `<span class="ch-coeurs">${Array.from({ length: total }, (_, k) => `<i class="${k < n ? 'plein' : ''}">♥</i>`).join('')}</span>`;
  const cadeaux = gains => gains?.length ? `<div class="lt-cadeaux">${gains.map(g => `<span>🎁 ${esc(g)}</span>`).join('')}</div>` : '';
  function majCourrier() { $('b-courrier').hidden = !J.courrierDispo(E(), jeu.auj); }
  function afficherLettre(l, gains = []) {
    pauserPourLire();
    const mamie = l.de === 'Mamie Odette';
    ouvrirPapier(`<div class="lettre"><div class="lt-tete"><span>${mamie ? `Une lettre de mamie · ${l.numero}/${l.total}` : `De la part de : ${esc(l.de)}`}</span><h2>${esc(l.titre)}</h2></div>
      <p>${esc(l.texte)}</p>${mamie ? '<p class="lt-signe">Ta mamie qui t’embrasse</p>' : ''}${cadeaux(gains)}</div>`);
  }
  function ouvrirCourrier() {
    const l = J.ouvrirCourrier(E(), jeu.auj); if (!l) return;
    majCourrier(); jeu.sauver(); sons.succes();
    afficherLettre(l, l.gains);
    if (l.gains.some(g => g.startsWith('Nouveau mur'))) scene.majDecor(E());
  }
  $('b-courrier').onclick = ouvrirCourrier;
  function afficherChapitre(h, n, titre, texte, gains, relu) {
    pauserPourLire();
    const final = n >= h.chapitres.length;
    ouvrirPapier(`<div class="chapitre"><div class="ch-tete"><span class="ch-ico">${h.icone}</span><div><small>L’histoire de ${esc(h.nom)} · chapitre ${n}/${h.chapitres.length}</small><h2>${esc(titre)}</h2>${coeurs(n, h.chapitres.length)}</div></div>
      <p>${esc(texte)}</p>${cadeaux(gains)}${relu ? '' : `<p class="ch-suite">${final ? 'Fin de l’histoire. Merci de l’avoir écoutée jusqu’au bout.' : 'La suite… à ta prochaine visite, demain.'}</p>`}</div>`);
  }
  // Un habitué bien servi raconte le chapitre suivant de son histoire
  function raconter(idHistoire) {
    const c = J.lireChapitre(E(), idHistoire, jeu.auj); if (!c) return false;
    jeu.sauver(); sons.succes();
    afficherChapitre(c.histoire, c.numero, c.titre, c.texte, c.gains, false);
    return true;
  }
  function relireChapitre(idHistoire, k) {
    const h = HISTOIRES_HABITUES.find(x => x.id === idHistoire), c = h?.chapitres[k]; if (!c) return;
    afficherChapitre(h, k + 1, c.titre, c.texte.replaceAll('{cafe}', J.nomCafe(E())), [], true);
  }
  // Ce qui attend à la prochaine visite : affiché dans le bilan du soir
  function blocASuivre(e) {
    const l = J.aSuivre(e, jeu.auj);
    return l.length ? `<div class="a-suivre"><h4>À ta prochaine visite</h4>${l.map(x => `<div><span>${x.icone}</span><span>${esc(x.texte)}</span></div>`).join('')}</div>` : '';
  }
  function afficherGazette(g) {
    if (!g) return;
    ouvrirPapier(`<div class="gz-tete"><span>N° ${g.numero} · ${esc(g.date)}</span><h2>La Gazette du quartier</h2><span>Le journal de ceux qui aiment leur rue</span></div>
      <h3 class="gz-une">${esc(g.titre)}</h3><div class="gz-articles">` + g.articles.map(a => `<article><h4>${esc(a.titre)}</h4><p>${esc(a.texte)}</p></article>`).join('') + `</div>`);
  }
  function annoncerGazette(g) { toast(`📰 <b>La Gazette du quartier</b> est parue : « ${esc(g.titre)} ». À lire dans le journal du soir.`, 6000); }
  function afficherAnnee(b) {
    const med = { or: ['🥇', 'Médaille d’or', 'Un café d’exception. Tout le quartier en parle.'], argent: ['🥈', 'Médaille d’argent', 'Une belle affaire, qui tourne et qui plaît.'], bronze: ['🥉', 'Médaille de bronze', 'Le café tient debout : l’année prochaine sera la bonne.'] }[b.medaille];
    const ligne = (n, v) => `<div><span>${n}</span><b>${v}</b></div>`;
    ouvrirPapier(`<div class="gz-tete"><span>Année ${b.annee}</span><h2>Un an au café ${esc(J.nomCafe(E()))}</h2><span>Le bilan de mamie Odette</span></div>
      <div class="medaille"><span>${med[0]}</span><b>${med[1]}</b><p>${med[2]}</p></div>
      <div class="chiffres-annee">${ligne('Chiffre d’affaires', fmt(b.ca))}${ligne('Résultat de l’année', montant(b.resultat))}${ligne('Clients servis', b.clients.toLocaleString('fr-FR'))}${ligne('Note', virg(b.note, 2) + ' ★')}${ligne('Meilleur mois', b.meilleur || '—')}${ligne('Équipe', `${b.equipe} employé${b.equipe > 1 ? 's' : ''}`)}${ligne('Travaux faits', b.travaux)}</div>
      <p class="gz-mot">« ${b.medaille === 'or' ? 'Je n’aurais jamais osé rêver ça pour mon vieux café. Merci, ma petite.' : b.medaille === 'argent' ? 'Tu as fait du chemin depuis la vieille machine d’occasion ! Pour l’or, il faudra des clients encore plus contents.' : 'Une année, c’est déjà beaucoup. Regarde tes comptes, ajuste, et on repart.'} » — Mamie Odette</p>
      <p class="legende">Le café continue : une nouvelle année commence.</p>`);
    sons.succes();
  }

  // La fiche d'un client touché : qui il est, ce qu'il a commandé, ce qu'il pense
  let ficheT = null;
  function ficheClient(p, pos) {
    document.querySelectorAll('.fiche-client').forEach(x => x.remove());
    const [x, y] = scene.projeter(pos);
    const el = document.createElement('div'); el.className = 'fiche-client';
    const qui = p.habitue ? 'Un habitué du café' : `${p.age} ans · ${p.metier}`;
    const etat = p.parti ? 'Reparti sans être servi' : p.servi ? `A pris : ${p.commande.join(', ')}` : `Attend : ${p.commande.join(', ')}`;
    el.innerHTML = '<b></b><small></small><span class="cmd"></span><i></i>';
    el.querySelector('b').textContent = p.nom; el.querySelector('small').textContent = qui;
    el.querySelector('.cmd').textContent = etat; el.querySelector('i').textContent = `« ${p.pense} »`;
    el.style.left = Math.max(110, Math.min(innerWidth - 110, x)) + 'px'; el.style.top = Math.max(150, y) + 'px';
    $('labels').appendChild(el); sons.clic();
    clearTimeout(ficheT); ficheT = setTimeout(() => el.remove(), 5000);
  }

  // ---------- Étiquettes des stations ----------
  const etiquettes = STATIONS.map((s, i) => {
    const el = document.createElement('div'); el.className = 'etiq';
    el.innerHTML = `<span class="auto"></span><span>${s.court}</span><span class="niv"></span>`;
    el.addEventListener('pointerdown', ev => { ev.stopPropagation(); toucherStation(i); });
    $('labels').appendChild(el); return el;
  });

  // ---------- Panneaux ----------
  function ouvrir(id) { PANNEAUX.forEach(p => { $(p).hidden = p !== id; }); ouvert = id; document.body.classList.add('panneau-ouvert'); }
  function fermer() { PANNEAUX.forEach(p => { $(p).hidden = true; }); ouvert = null; choisie = null; document.body.classList.remove('panneau-ouvert'); }
  document.querySelectorAll('[data-fermer]').forEach(b => { b.onclick = fermer; });
  const basculer = (id, maj) => () => { if (ouvert === id) return fermer(); ouvrir(id); maj(); };

  function toucherStation(i) {
    const r = J.toucher(E(), i);
    if (r.type === 'reparation') { pop(scene.ANCRES[i], `Réparation… ${r.reste}`, true); sons.clic(); }
    if (r.type === 'repare') { pop(scene.ANCRES[i], 'Réparé !'); sons.repare(); }
    choisie = i; ouvrir('fiche'); majFiche();
  }
  // Vitesse du temps : ×1, ×2, ×3, pause
  $('rush').onclick = () => { const v = [1, 2, 3, 0], k = v.indexOf(jeu.vitesse); jeu.vitesse = v[(k + 1) % v.length]; sons.clic(); majVitesse(); };
  function majVitesse() {
    $('rush').firstChild.textContent = jeu.vitesse === 0 ? 'Pause' : 'Vitesse';
    $('rush-txt').textContent = jeu.vitesse === 0 ? '⏸ arrêté' : '▶'.repeat(jeu.vitesse) + ` ×${jeu.vitesse}`;
    $('rush').classList.toggle('pause', jeu.vitesse === 0);
  }
  $('f-up').onclick = () => { if (choisie === 0) { ouvrir('p-stock'); majStock(); } else ouvrirJournal('equipe'); };
  $('f-mgr').onclick = () => ouvrirJournal(choisie === 3 ? 'travaux' : choisie === 0 ? 'bilan' : 'catalogue');
  $('b-stock').onclick = basculer('p-stock', majStock);
  $('b-prix').onclick = basculer('p-prix', () => { $('x-curseur').value = E().prix; $('x-dose').value = E().dosage; majPrix(); });
  $('b-travaux').onclick = basculer('p-travaux', majTravaux);
  $('b-carnet').onclick = basculer('p-carnet', majCarnet);
  $('x-curseur').oninput = ev => { J.reglerPrix(E(), +ev.target.value); majPrix(); };
  $('x-dose').oninput = ev => { J.reglerDosage(E(), +ev.target.value); majPrix(); };

  // La fiche d'une station : qui y travaille, ce qu'elle peut faire en une heure, ce qui coince
  function majFiche() {
    const i = choisie; if (i == null) return;
    const e = E(), s = STATIONS[i], st = e.st[i], b = J.bilan(e), k = J.momentIndex(e), c = J.capacites(e, k);
    const presents = role => e.equipe.filter(p => p.role === role && J.presentA(p, k)).map(p => p.nom).join(', ') || 'personne';
    $('f-nom').textContent = s.nom;
    const equip = i === 1 ? J.CATALOGUE_MOULINS[e.moulin].nom : i === 2 ? (J.machinesInstallees(e).map(m => m.nom).join(', ') || 'aucune machine')
      : i === 3 ? `${J.places(e)} places assises` : `réserve de ${J.capaciteReserve(e) / DOSES_SAC} kg`;
    $('f-desc').textContent = `Équipement : ${equip}.`;
    $('f-niv').textContent = i === 2 ? presents('barista') : i === 3 ? presents('salle') : i === 1 ? 'les baristas' : 'toi, le soir';
    $('f-debit').innerHTML = i === 2 ? `${Math.round(c.boissons)} tasses/h` : i === 1 ? `${Math.round(c.moulin)} tasses/h`
      : i === 3 ? `${isFinite(c.salle) ? Math.round(c.salle) : '—'} clients/h <em>places : ${Math.round(c.places)}/h</em>` : kg(e.stock[e.maison]);
    const al = $('f-alerte'); al.className = 'alerte';
    if (st.panne) al.textContent = `EN PANNE ! Touche la station encore ${st.panne.coups} fois (un barista de niveau 3 ou plus la répare tout seul).`;
    else if (!J.ouvert(e)) { al.textContent = 'Le café est fermé : prépare demain dans le journal.'; al.className = 'alerte ok'; }
    else if (b.goulot.type === 'station' && b.goulot.i === i) al.textContent = `C’est ici que ça coince : ${b.goulot.nom}. ${b.goulot.cause === 'places' ? 'Plus de tables, ou une terrasse.' : b.goulot.cause === 'moulin' ? 'Un meilleur moulin.' : b.goulot.cause === 'salle' ? 'Quelqu’un de plus en salle.' : 'Un barista de plus, ou une machine plus rapide.'}`;
    else { al.textContent = 'Tout roule.'; al.className = 'alerte ok'; }
    $('f-up').innerHTML = i === 0 ? 'Commander<small>réserve</small>' : 'Équipe<small>planning</small>';
    $('f-mgr').innerHTML = i === 3 ? 'Travaux<small>tables, terrasse</small>' : i === 0 ? 'Bilan<small>du jour</small>' : 'Catalogue<small>matériel</small>';
    $('f-up').disabled = false; $('f-mgr').disabled = false;
    majPoste(e, i);
  }
  // ---------- Niveaux des postes : on les monte à tout moment, avec de l'argent ----------
  function majPoste(e, i) {
    const st = e.st[i], max = J.nivMaxPoste(e), c = J.coutPoste(e, i), m = J.multPoste(e, i);
    const avantPalier = NIVEAUX_POSTES.palier - (st.niv % NIVEAUX_POSTES.palier);
    const crans = Array.from({ length: NIVEAUX_POSTES.palier }, (_, k) => `<i class="${k < st.niv % NIVEAUX_POSTES.palier ? 'plein' : ''}"></i>`).join('');
    $('f-poste').innerHTML = `<div class="pn-tete"><span class="pn-niv">niv ${st.niv}</span><div><b>+${Math.round((m - 1) * 100)} % ${NIVEAUX_POSTES.effets[i]}</b>
        <small>Palier dans ${avantPalier} niveau${avantPalier > 1 ? 'x' : ''} : +${Math.round(NIVEAUX_POSTES.bonusPalier * 100)} % en plus</small><span class="pn-crans">${crans}</span></div></div>`
      + (st.niv >= max ? `<p class="legende">Niveau maximum pour l’instant (${max}). Il monte de 2 à chaque niveau du café.</p>`
        : `<button class="btn vert pn-btn${e.argent < c ? ' off' : ''}" id="f-ameliorer">Améliorer → niv ${st.niv + 1}<small>${fmt(c)} · +${Math.round(NIVEAUX_POSTES.gain * 100)} %</small></button>`);
    const b = $('f-ameliorer');
    if (b) b.onclick = () => {
      const r = J.ameliorerPoste(E(), i);
      if (r === 'ok') { sons.achat(); pop(scene.ANCRES[i], `niv ${E().st[i].niv} !`); jeu.sauver(); if (E().st[i].niv % NIVEAUX_POSTES.palier === 0) celebrer({ genre: 'Palier atteint', titre: `${STATIONS[i].court} niveau ${E().st[i].niv}`, texte: `+${Math.round(NIVEAUX_POSTES.bonusPalier * 100)} % en plus, d’un coup !` }); }
      else if (r === 'argent') toast("Pas encore assez d'argent.");
      majFiche();
    };
  }
  // ---------- Niveau du café : la barre d'XP de l'en-tête, et la fête à chaque niveau ----------
  const nomDeblocage = d => [d.mur && `mur « ${J.CATALOGUE_MURS[d.mur].nom} »`, d.sol && `sol « ${J.CATALOGUE_SOLS[d.sol].nom} »`, d.travaux && T[d.travaux].nom].filter(Boolean).join(', ');
  function celebrerNiveau(n) {
    const deb = n.debloque ? `Débloqué : ${nomDeblocage(n.debloque)}. ` : '';
    celebrer({ genre: n.coffre ? 'Niveau supérieur · coffre !' : 'Niveau supérieur', titre: `Niveau ${n.niveau}`, texte: `${deb}Tes postes peuvent monter jusqu’au niveau ${n.nivMaxPoste}.`, prime: n.prime });
  }
  $('niveau-cafe').onclick = () => {
    const p = J.progresNiveau(E()), d = J.prochainDeblocage(E());
    toast(`⭐ <b>Niveau ${p.niveau}</b> · ${Math.round(p.xp)} / ${p.besoin} XP. Chaque client servi rapporte 1 XP, les travaux, objectifs et histoires bien plus.${d ? ` Au niveau ${d.niveau} : ${nomDeblocage(d)}.` : ''}`, 6500);
  };

  const barres = q => { let h = '<span class="q">'; for (let k = 1; k <= 5; k++) h += `<i class="${q >= k - .25 ? '' : 'v'}"></i>`; return h + '</span>'; };
  // Une commande urgente couvre environ 2 h de ventes, dans la limite de la place et de la caisse
  function urgence(grain) {
    const e = E(), parHeure = (J.bilan(e).parHeure?.ventes || 20) * J.consoParTasse(e) * J.partGrain(e);
    const place = Math.floor((J.capaciteReserve(e) - J.totalStock(e)) / DOSES_SAC + 1e-6), payable = Math.floor(e.argent / (J.prixKg(e, grain) * 2));
    return Math.max(1, Math.min(Math.ceil(parHeure * 2 / DOSES_SAC), place, payable));
  }
  function majStock() {
    const e = E(), cap = J.capaciteReserve(e), tot = J.totalStock(e), b = J.bilan(e), soir = !J.ouvert(e);
    $('s-jauge').style.width = Math.min(100, tot / cap * 100) + '%';
    const parH = (b.parHeure?.ventes || 0) * J.consoParTasse(e) * J.partGrain(e), reste = parH > 0 ? e.stock[e.maison] / parH : Infinity;
    $('s-desc').textContent = `Réserve : ${kg(tot)} / ${cap / DOSES_SAC} kg · ${isFinite(reste) ? `${G[e.maison].nom} épuisé dans ${reste >= 12 ? 'plus d’une journée' : virg(reste) + ' h'}` : soir ? 'commandes du soir livrées demain à 7 h' : 'stock stable'}`;
    let h = GRAINS.map(g => {
      if (!e.debloques.includes(g.id)) return `<div class="ligne verrou"><div class="infos"><h4>${g.nom}</h4><p>Qualité ${barres(g.q)} · ${fmt(g.prixSac)}/kg · se débloque à ${virg(g.rep)} ★</p></div></div>`;
      const enCours = e.commandes.concat(e.livraisonsMatin).filter(c => c.grain === g.id).reduce((x, c) => x + c.sacs, 0), pk = J.prixKg(e, g.id);
      return `<div class="ligne"><div class="infos"><h4>${g.nom}${e.maison === g.id ? '<span class="tag">servi</span>' : ''}</h4>
        <p>Qualité ${barres(g.q)} · ${fmt(pk)}/kg · ${kg(e.stock[g.id])}${enCours ? ` (+${enCours} kg en route)` : ''}${e.stock[g.id] > 0 ? ` · <span class="${J.fraicheur(e, g.id) < .9 ? 'rassis' : 'frais'}">fraîcheur ${Math.round(J.fraicheur(e, g.id) * 100)} %</span>` : ''}</p></div>
        <div class="actions">
          ${e.maison === g.id ? '' : `<button class="btn mini vert" data-maison="${g.id}">Servir</button>`}
          ${!soir ? `<button class="btn mini${e.argent < pk * 2 ? ' off' : ''}" data-cmd="${g.id}">+${urgence(g.id)} kg urgent</button>`
            : `<button class="btn mini${e.argent < pk ? ' off' : ''}" data-kg="${g.id}:1">+1</button><button class="btn mini${e.argent < pk * 5 ? ' off' : ''}" data-kg="${g.id}:5">+5</button><button class="btn mini${e.argent < pk ? ' off' : ''}" data-remplir="${g.id}">Plein</button>`}
        </div></div>`;
    }).join('');
    // Commande permanente : livrée chaque matin
    const ab = e.abonnement, abG = ab.grain || e.maison;
    h += `<div class="ligne"><div class="infos"><h4>Commande permanente${ab.kg ? '<span class="tag">active</span>' : ''}</h4>
      <p>${ab.kg ? `${ab.kg} kg de ${G[abG].nom} livrés chaque matin (${fmt(ab.kg * J.prixKg(e, abG))}/jour), tant qu’il y a de la place.` : 'Rien de prévu : tu commandes toi-même chaque soir.'}</p></div>
      <div class="actions"><button class="btn mini${ab.kg <= 0 ? ' off' : ''}" data-abo="${abG}:${ab.kg - 1}">−</button><button class="btn mini vert" data-abo="${e.maison}:${(ab.grain === e.maison ? ab.kg : 0) + 1}">+1 kg</button></div></div>`;
    // Lait, au litre
    if (J.aBuse(e)) {
      const enCours = e.commandes.concat(e.livraisonsMatin).filter(c => c.grain === 'lait').reduce((x, c) => x + c.sacs, 0);
      h += `<div class="ligne"><div class="infos"><h4>Lait (au frigo)${e.lait <= 0 ? '<span class="tag" style="background:var(--framboise)">vide</span>' : ''}</h4>
        <p>Pour les cappuccinos · ${fmt(LAIT.prixPack)} le litre (${LAIT.doses} tasses) · reste ${virg(e.lait / LAIT.doses)} L${enCours ? ` (+${enCours} L en route)` : ''}</p></div>
        <div class="actions"><button class="btn mini${e.argent < LAIT.prixPack * 5 ? ' off' : ''}" data-lait="5">+5 L</button><button class="btn mini${e.argent < LAIT.prixPack * 20 ? ' off' : ''}" data-lait="20">+20 L</button></div></div>`;
    }
    // Viennoiseries du lendemain (avec la vitrine)
    if (J.a(e, 'vitrine')) {
      const n = e.viennoiseries.commande, hier = e.bilans.at(-1);
      h += `<div class="ligne"><div class="infos"><h4>Croissants pour demain</h4>
        <p>${n} commandés (${fmt(n * VIENNOISERIES.cout)}, vendus ${fmt(J.prixProduit(e, 'croissant'))} pièce${e.carte.croissant.on ? '' : ' · <b class="rouge">pas à la carte</b>'})${hier ? ` · hier : ${Math.round(hier.viennoiseries)} vendus, ${Math.round(hier.invendus)} jetés` : ''}</p></div>
        <div class="actions"><button class="btn mini${n <= 0 ? ' off' : ''}" data-vienno="${n - 10}">−10</button><button class="btn mini vert" data-vienno="${n + 10}">+10</button></div></div>`;
    }
    $('s-liste').innerHTML = h;
  }
  $('s-liste').addEventListener('pointerdown', ev => {
    const b = ev.target.closest('button'); if (!b || b.classList.contains('off')) return;
    const e = E();
    if (b.dataset.maison) { J.choisirGrain(e, b.dataset.maison); toast(`On sert maintenant du <b>${G[e.maison].nom}</b>. Pense à ajuster ton prix !`); }
    if (b.dataset.remplir) {
      const r = J.remplir(e, b.dataset.remplir);
      toast(r === 'place' ? 'La réserve est déjà pleine.' : r === 'argent' ? "Pas assez d'argent." : r === 'ferme' ? 'Les commandes normales se passent le soir.' : `Commande passée : <b>${r} kg</b> de ${G[b.dataset.remplir].nom}, livrés demain à 7 h.`);
    }
    if (b.dataset.kg) {
      const [g, n] = b.dataset.kg.split(':'), r = J.commander(e, g, +n);
      toast(r === 'ok' ? `Commande passée : <b>${n} kg</b> de ${G[g].nom}, livrés demain à 7 h.` : r === 'place' ? 'Plus de place dans la réserve.' : "Pas assez d'argent.");
      if (r === 'ok') sons.clic();
    }
    if (b.dataset.abo) { const [g, n] = b.dataset.abo.split(':'); J.reglerAbonnement(e, +n > 0 ? g : null, +n); sons.clic(); jeu.sauver(); }
    if (b.dataset.vienno) { J.commanderViennoiseries(e, +b.dataset.vienno); sons.clic(); jeu.sauver(); }
    if (b.dataset.lait) {
      const r = J.commanderLait(e, +b.dataset.lait);
      toast(r === 'ok' ? `Commande passée : <b>${b.dataset.lait} L de lait</b>${J.ouvert(e) ? ' en urgence, livrés dans 1 h' : ', livrés demain à 7 h'}.` : "Pas assez d'argent pour le lait.");
      if (r === 'ok') sons.clic();
    }
    if (b.dataset.cmd) {
      const n = urgence(b.dataset.cmd), r = J.commanderUrgence(e, b.dataset.cmd, n);
      toast(r === 'argent' ? "Pas assez d'argent pour cette commande." : r === 'place' ? 'La réserve est pleine.' : `Urgence : <b>${n} kg</b> de ${G[b.dataset.cmd].nom} au prix fort, livrés dans 1 h.`);
    }
    majStock();
  });

  // ---------- Journal du soir (en onglets) ----------
  // Le journal est rangé en 5 rubriques simples ; une rubrique peut avoir plusieurs pages
  const RUBRIQUES = [
    { icone: '<img src="assets/icones/journee.svg" alt="">', nom: 'Ma journée', pages: [['bilan', 'Bilan du jour']] },
    { icone: '<img src="assets/icones/carte.svg" alt="">', nom: 'Carte & clients', pages: [['carte', 'La carte'], ['clients', 'Fidélité et pub']] },
    { icone: '<img src="assets/icones/equipe.svg" alt="">', nom: 'Équipe', pages: [['equipe', 'Les employés'], ['planning', 'Le planning']] },
    { icone: '<img src="assets/icones/cafe.svg" alt="">', nom: 'Le café', pages: [['travaux', 'Travaux et déco'], ['catalogue', 'Matériel'], ['entretien', 'Entretien']] },
    { icone: '<img src="assets/icones/comptes.svg" alt="">', nom: 'Comptes', pages: [['finances', 'Comptes et banque']] },
  ];
  const ICONES_CAT = { 'Déco': '🎨', 'Salle': '🪑', 'Réserve': '📦', 'Bar': '☕', 'Agrandir': '🏗️', 'Équipe': '🎓', 'Confort': '🔥' };
  const ICONES_FOURN = { grossiste: '🏪', artisan: '🔥', importateur: '🚢' };
  let onglet = 'bilan', poste = 0, dernierHtml = '';
  const pct = x => (x >= 0 ? '+' : '−') + Math.round(Math.abs(x) * 100) + ' %';
  function jauge(nom, val, max, ref, inverse = false) {
    const ecart = ref ? val / ref - 1 : 0, mieux = inverse ? ecart < -.005 : ecart > .005, moins = inverse ? ecart > .005 : ecart < -.005;
    return `<div class="jg"><span class="jg-nom">${nom}</span><span class="jg-barre"><i style="width:${Math.min(100, val / max * 100)}%"></i>${ref ? `<b style="left:${Math.min(100, ref / max * 100)}%"></b>` : ''}</span>`
      + `<span class="jg-ecart ${mieux ? 'mieux' : moins ? 'moins' : ''}">${ref && (mieux || moins) ? pct(ecart) : ref ? '=' : ''}</span></div>`;
  }
  function carte({ img, icone, nom, tags = '', desc, jauges = '', bouton = '', cls = '' }) {
    return `<div class="carte-cat ${cls}">${img ? `<img class="vig" src="${img}" alt="">` : `<span class="vig ico">${icone || '☕'}</span>`}
      <div class="cc"><h4>${nom}${tags}</h4><p>${desc}</p>${jauges}</div>${bouton ? `<div class="cc-act">${bouton}</div>` : ''}</div>`;
  }
  const btnPrix = (prix, data, e, soir, txt) => `<button class="btn mini${!soir || e.argent < prix ? ' off' : ''}" ${data}>${soir ? (txt || fmt(Math.max(0, prix))) : 'le soir'}</button>`;
  const montant = v => v < 0 ? '−' + fmt(-v) : fmt(v);
  const ligneCompte = (nom, v, cls = '') => `<span class="${cls}">${nom}</span><b class="${cls}"${v < 0 ? ' style="color:var(--framboise)"' : ''}>${montant(v)}</b>`;

  function ongletBilan(e, soir) {
    const b = e.bilans.at(-1);
    let h = '';
    const gz = e.gazettes?.at(-1);
    if (gz) h += `<button class="une-gazette${e.gazetteLue === gz.numero ? '' : ' nouvelle'}" data-gazette><span>📰</span><div><b>La Gazette du quartier · n° ${gz.numero}</b><small>${gz.titre}</small></div><em>${e.gazetteLue === gz.numero ? 'Relire' : 'Lire'}</em></button>`;
    if (soir) h += blocASuivre(e);
    if (b) {
      h += `<div class="journal-bilan"><span>${b.date} · ${Math.round(b.clients)} clients servis</span><b>${fmt(b.recettes)}</b>`
        + `<span>Achats (grain, consommables…)</span><b>−${fmt(b.depenses)}</b><span>Salaires</span><b>−${fmt(b.detail.salaires)}</b><span>Énergie</span><b>−${fmt(b.detail.energie)}</b>`
        + (b.detail.agios > .01 ? `<span>Agios du découvert</span><b>−${fmt(b.detail.agios)}</b>` : '')
        + (b.defi ? `<span>Défi : ${b.defi.texte}</span><b style="color:${b.defi.reussi ? 'var(--sauge-f)' : 'var(--framboise)'}">${b.defi.reussi ? '+' + fmt(b.defi.prime) : 'raté'}</b>` : '')
        + `<span class="total">Résultat du jour</span><b class="total" style="color:${b.benefice < 0 ? 'var(--framboise)' : 'var(--sauge-f)'}">${montant(b.benefice)}</b></div>`;
      const partPerdus = b.perdus / Math.max(1, b.clients + b.perdus);
      h += `<p class="legende">Satisfaction moyenne : <b>${b.satisfaction ? virg(b.satisfaction, 2) + ' ★' : '—'}</b> · ${Math.round(b.perdus)} client${b.perdus >= 2 ? 's' : ''} reparti${b.perdus >= 2 ? 's' : ''} sans être servi${b.perdus >= 2 ? 's' : ''}${partPerdus > .1 ? ' : <b class="rouge">il manque du monde ou de la place</b>' : ''}${b.viennoiseries > 0 ? ` · ${Math.round(b.viennoiseries)} croissants vendus, ${Math.round(b.invendus)} jetés` : ''}</p>`;
      const top = Object.entries(b.produits || {}).sort((x, y) => y[1].ca - x[1].ca).slice(0, 4);
      if (top.length) h += `<p class="legende">Les meilleures ventes : ${top.map(([id, p]) => `${J.CATALOGUE_CARTE[id].icone} ${J.CATALOGUE_CARTE[id].nom.toLowerCase()} <b>${fmt(p.ca)}</b>`).join(' · ')} <button class="lien-mini" data-onglet="carte">voir la carte</button></p>`;
    }
    if (b?.heures) {
      const max = Math.max(1, ...b.heures.map(x => x.ventes));
      h += `<div class="heures"><div class="h-tete"><b>Clients heure par heure</b><span><i class="st"></i>équipe <i class="cl"></i>clients <i class="sk"></i>stock</span></div><div class="h-barres">` + b.heures.map((x, k) => {
        const lim = x.stock > Math.max(x.station, x.clients) ? 'sk' : x.station >= x.clients ? 'st' : 'cl';
        return `<div title="${7 + k} h : ${Math.round(x.ventes)} clients"><i class="${lim}" style="height:${Math.max(3, x.ventes / max * 100)}%"></i><small>${7 + k}</small></div>`;
      }).join('') + `</div></div>`;
    }
    if (b?.avis?.length) h += `<div class="avis"><b class="avis-titre">Ce que disent les clients</b>` + b.avis.map(x => `<div class="un-avis"><span class="av-etoiles">${'★'.repeat(x.etoiles)}<i>${'★'.repeat(5 - x.etoiles)}</i></span><p>« ${x.texte} »</p><small>${x.nom}</small></div>`).join('') + `</div>`;
    // Demain : la météo annoncée, et la boisson du jour
    const prev = J.CATALOGUE_METEOS[e.meteoDemain] || J.CATALOGUE_METEOS.nuages;
    const aff = prev.demande * (J.a(e, 'terrasse') ? prev.terrasse : 1) - 1;
    const demain = { ...e, jour: e.jour + 1 };
    h += `<div class="demain"><div class="dm-meteo"><span class="dm-ico">${prev.icone}</span><div><b>Demain, ${J.dateTexte(demain).toLowerCase()} : ${prev.nom.toLowerCase()}</b>
      <small>Prévision juste 4 fois sur 5 · affluence ${Math.abs(aff) < .005 ? 'normale' : pct(aff)} · ${J.saison(demain).nom.toLowerCase()}</small></div></div>
      <div class="dm-titre">Boisson du jour</div><div class="boissons">` + Object.values(J.CATALOGUE_BOISSONS).map(x => {
        const ef = J.effetBoisson(x.id, prev.id), verrou = e.rep < x.rep, choisie = e.boisson === x.id;
        return `<button class="boisson${choisie ? ' choisie' : ''}${verrou ? ' verrou' : ''}" data-boisson="${x.id}"><span>${x.icone}</span><b>${x.nom}</b>
          <small class="${ef > .005 ? 'vert' : ef < -.005 ? 'rouge' : ''}">${verrou ? `${virg(x.rep)} ★` : x.id === 'aucune' ? 'panier normal' : `${pct(ef)} par client`}</small></button>`;
      }).join('') + `</div></div>`;
    // Réserve pour demain
    const cap = J.capaciteReserve(e) / DOSES_SAC, tot = J.totalStock(e) / DOSES_SAC, hier = b ? (b.tasses + b.perdus * .5) * J.consoParTasse(e) * J.partGrain(e) / DOSES_SAC : 2;
    const g = G[e.maison], pk = J.prixKg(e, g.id), place = Math.max(0, Math.floor(cap - tot + 1e-6)), n = Math.min(place, Math.floor(e.argent / pk));
    const tient = tot / Math.max(.1, hier), pourDemain = Math.max(0, Math.min(n, Math.ceil(hier * 1.3 - tot)));
    h += `<div class="commande-demain"><div class="cd-tete"><b>Réserve pour demain</b><span>${virg(tot)} / ${cap} kg</span></div>
      <div class="cd-jauge"><i style="width:${Math.min(100, tot / cap * 100)}%"></i><b style="left:${Math.min(100, hier / cap * 100)}%" title="besoin d’hier"></b></div>
      <p>Hier : ${virg(hier)} kg de besoin · ta réserve tient <b class="${tient < 1.1 ? 'rouge' : 'vert'}">${tient >= 10 ? 'plus de 10' : virg(tient)} jour${tient >= 2 ? 's' : ''}</b>${e.abonnement.kg ? ` · commande permanente : ${e.abonnement.kg} kg/jour` : ''}</p>
      <p>Fraîcheur du ${g.court} : <b class="${J.fraicheur(e, g.id) < .9 ? 'rouge' : 'vert'}">${Math.round(J.fraicheur(e, g.id) * 100)} %</b>. Un grain garde son goût 2 jours, puis en perd chaque jour : ne commande pas trop d’avance.</p>
      ${soir ? `<div class="cd-boutons"><button class="btn vert${pourDemain < 1 ? ' off' : ''}" data-plein="${g.id}:${pourDemain}">Pour demain<small>${pourDemain} kg · ${fmt(pourDemain * pk)}</small></button>`
        + `<button class="btn${n < 1 ? ' off' : ''}" data-plein="${g.id}:${n}">Plein<small>${n} kg · ${fmt(n * pk)}</small></button></div><p class="cd-grain">${g.nom} · ${fmt(pk)} le kilo (change de grain dans la Réserve)</p>` : ''}</div>`;
    const c = J.chargesJour(e), jl = J.joursAvantLoyer(e);
    h += `<p class="fait" style="color:var(--cafe-doux)">Charges de demain : environ ${fmt(c.total)} (salaires ${fmt(c.salaires)}, énergie ${fmt(c.energie)}) · loyer de ${fmt(J.loyerMois(e) + MOIS.assurance)} ${jl === 0 ? 'ce soir' : `dans ${jl} jour${jl > 1 ? 's' : ''}`}</p>`;
    return h;
  }

  // L'équipe : les employés (rôle, niveau, trait, salaire, fatigue, moral), puis les candidats
  const pips = (n, max = 5) => { let h = '<span class="pips">'; for (let k = 0; k < max; k++) h += `<i class="${k < n ? 'on' : ''}"></i>`; return h + '</span>'; };
  const barreEtat = (nom, v, mauvais) => `<div class="etat-barre"><span>${nom}</span><span class="eb"><i class="${mauvais ? 'rouge' : ''}" style="width:${Math.round(v * 100)}%"></i></span></div>`;
  function ongletEquipe(e, soir) {
    const masse = J.masseSalarialeJour(e);
    let h = `<p class="legende">Chaque employé coûte son salaire horaire × ${virg(PERSONNEL.charges, 2)} (charges), pour les heures du planning. Au-delà de ${PERSONNEL.semaine} h par semaine : heures sup (+25 %). Trop d’heures fatiguent ; un salaire sous le marché fait baisser le moral, et un employé malheureux démissionne.</p>`;
    h += `<div class="section-titre">Ton équipe · ${fmt(masse)} par jour</div>`;
    h += e.equipe.map(p => {
      const roles = Object.keys(ROLES).filter(r => !(p.gerant && r === 'cuisine')).map(r => `<button class="btn mini${p.role === r ? ' vert' : ''}" data-role="${p.id}:${r}">${ICONES_ROLE[r]} ${ROLES[r]}</button>`).join('');
      const planning = p.gerant ? '<small>Toujours là, de 7 h à 19 h, sans salaire.</small>' : MOMENTS.map((m, k) => `<button class="plan${p.planning[k] ? ' on' : ''}" data-plan="${p.id}:${k}:${p.planning[k] ? 0 : 1}" title="${m.nom} (${m.de} h – ${m.a} h)">${ICONES_MOMENTS[k]}<small>${COURTS_MOMENTS[k]}</small></button>`).join('');
      const trait = p.trait ? J.CATALOGUE_TRAITS[p.trait] : null;
      const sousPaye = !p.gerant && p.salaire < J.salaireMarche(p.comp) - .01;
      const desc = (p.gerant ? 'C’est toi. ' : `${fmt(p.salaire)}/h${sousPaye ? ` <b class="rouge">(marché : ${fmt(J.salaireMarche(p.comp))})</b>` : ''} · ${J.heuresPlanifiees(p)} h demain · ${Math.round(p.heuresSemaine || 0)} h cette semaine · ${fmt(J.coutJournee(p))}/jour. `)
        + (trait ? `<i>${trait.nom} : ${trait.desc}.</i>` : '') + (p.formation ? ' <b>En formation demain.</b>' : '');
      const etats = p.gerant ? '' : barreEtat('Fatigue', p.fatigue || 0, (p.fatigue || 0) > .6) + barreEtat('Moral', p.moral ?? 1, (p.moral ?? 1) < .35);
      const actions = p.gerant ? '' : `<div class="actions-emp"><button class="btn mini" data-sal="${p.id}:-0.5">− 0,50 €</button><button class="btn mini" data-sal="${p.id}:0.5">+ 0,50 €</button>`
        + (p.comp < 5 && !p.formation ? btnPrix(J.coutFormation(e), `data-former="${p.id}"`, e, soir, `Former · ${fmt(J.coutFormation(e))}`) : '')
        + `<button class="btn mini rouge" data-renvoi="${p.id}">Renvoyer</button></div>`;
      return `<div class="carte-cat employe"><span class="vig ico">${ICONES_ROLE[p.role]}</span><div class="cc">
        <h4>${p.nom} ${pips(p.comp)}</h4><p>${desc}</p>${etats}<div class="roles">${roles}</div><div class="planning">${planning}</div>${actions}</div></div>`;
    }).join('');
    h += `<div class="section-titre">Candidats · nouveaux chaque lundi</div>`;
    h += e.candidats.length ? e.candidats.map(c => {
      const trait = c.trait ? J.CATALOGUE_TRAITS[c.trait] : null, cout = c.salaire * PERSONNEL.charges * 7;
      return carte({ icone: ICONES_ROLE[c.role], nom: `${c.nom} ${pips(c.comp)}`, tags: `<span class="tag cat">${ROLES[c.role]}</span>`,
        desc: `${fmt(c.salaire)}/h · environ ${fmt(cout)} par jour pour 7 h (matin + midi)${trait ? ` · <i>${trait.nom} : ${trait.desc}</i>` : ''}`,
        bouton: `<button class="btn mini vert" data-embauche="${c.id}">Embaucher</button>` });
    }).join('') : '<p class="legende">Plus de candidat cette semaine. D’autres se présenteront lundi.</p>';
    return h;
  }

  // Formule du moment : un interrupteur, son effet
  function ligneFormule(e, k, soir) {
    const f = FORMULES.find(x => x.moment === k); if (!f) return '';
    const ouverte = J.formuleOuverte(e, f), actif = !!e.formules[f.id] && ouverte;
    const besoin = (f.req || []).filter(r => !J.a(e, r)).map(r => T[r].nom.toLowerCase());
    const cuisine = f.id === 'petitdej' || e.equipe.some(p => p.role === 'cuisine' && p.planning[k]);
    return `<div class="formule${actif ? ' active' : ''}${ouverte ? '' : ' verrou'}"><span>${f.icone}</span><div><b>${f.nom}</b>
      <small>${ouverte ? `+${Math.round(f.demande * 100)} % de clients, panier ${pct(f.panier - f.cout)} (ingrédients déduits)${cuisine ? '' : ' · <b class="rouge">il faut quelqu’un en cuisine à ce moment</b>'}`
        : `Il faut : ${besoin.join(', ') || `${virg(f.rep)} ★`}`}</small></div>
      ${ouverte ? `<button class="btn mini${actif ? ' vert' : ''}${soir ? '' : ' off'}" data-formule="${f.id}:${actif ? 0 : 1}">${actif ? 'Active' : 'Activer'}</button>` : ''}</div>`;
  }
  // Planning : qui travaille à chaque moment, ce qui a limité hier, et le tarif du moment
  function ongletPlanning(e, soir) {
    const hier = e.bilans.at(-1);
    let h = `<p class="legende">Pour chaque moment de la journée : qui est là, ce qui a limité les ventes hier, et le <b>tarif</b> du moment (il ajuste ton prix de base de ${fmt(e.prix)} : plus cher au rush, moins cher au creux). Le planning de chacun se règle dans l’onglet Équipe.</p>`;
    h += `<div class="legende-barres"><span><i class="st"></i>équipe ou place</span><span><i class="cl"></i>clients</span><span><i class="sk"></i>stock</span></div>`;
    h += MOMENTS.map((m, k) => {
      const s = hier?.moments?.[k], t = s?.t || 0, c = J.capacites(e, k);
      const p = x => t ? Math.round(x / t * 100) : 0;
      const qui = e.equipe.filter(x => J.presentA(x, k)).map(x => `${ICONES_ROLE[x.role]} ${x.nom}`).join(' · ');
      let conseil = 'Pas encore de chiffres : attends la fin d’une journée.';
      if (t) conseil = s.stock / t > .2 ? '<b class="rouge">Rupture de stock</b> : commande plus de grain.'
        : s.station / t > .5 ? '<b class="rouge">Ça coince</b> : il manque du monde ou des places à ce moment.'
        : s.station / t > .2 ? 'Ça coince parfois : une personne de plus peut se rentabiliser.'
        : 'Ce sont les clients qui manquent : inutile d’ajouter du monde.';
      const tf = e.tarifs[k] ?? 1;
      return `<div class="carte-cat moment-carte"><span class="vig ico">${ICONES_MOMENTS[k]}</span><div class="cc">
        <h4>${m.nom} <span class="tag cat">${m.de} h – ${m.a} h</span></h4>
        <p>${qui || 'personne'} · capacité ${Math.round(Math.min(c.boissons, c.moulin, c.salle, c.places))} clients/h</p>
        ${t ? `<div class="barre-moment"><i class="st" style="width:${p(s.station)}%"></i><i class="cl" style="width:${p(s.clients)}%"></i><i class="sk" style="width:${p(s.stock)}%"></i></div>
        <p>Hier : <b>${Math.round(s.ventes)}</b> clients · ${conseil}</p>` : `<p>${conseil}</p>`}
        <div class="renfort tarif"><button class="btn mini${tf <= TARIFS.min ? ' off' : ''}" data-tarif="${k}:${tf - TARIFS.pas}">−</button>
          <span class="tarif-val ${tf > 1 ? 'haut' : tf < 1 ? 'bas' : ''}">${tf === 1 ? 'tarif normal' : `${tf > 1 ? '+' : '−'}${Math.round(Math.abs(tf - 1) * 100)} %`}</span>
          <button class="btn mini${tf >= TARIFS.max ? ' off' : ''}" data-tarif="${k}:${tf + TARIFS.pas}">+</button><small>${fmt(e.prix * tf)} l’espresso</small></div>
        ${ligneFormule(e, k, soir)}
      </div></div>`;
    }).join('');
    return h;
  }

  // La carte : chaque produit, son prix, ce qu'il coûte, ce qu'il rapporte, et ce qui s'est vendu hier
  const coutProduit = (e, id) => { const p = J.CATALOGUE_CARTE[id]; return (p.cafe ? J.coutTasse(e) : 0) + (p.lait ? LAIT.prixPack / LAIT.doses : 0) + (p.stock ? VIENNOISERIES.cout : p.cout); };
  function ongletCarte(e, soir) {
    const hier = e.bilans.at(-1)?.produits || {}, totalHier = Object.values(hier).reduce((s, p) => s + p.ca, 0), nb = J.nbProduits(e);
    const v = J.multVariete(e) - 1;
    let h = `<p class="legende">Chaque client prend une boisson, et parfois un extra. Plus un produit est sous son <b>prix juste</b>, plus il se vend ; au-dessus, les clients le boudent et la note baisse. ${nb} produits à la carte : ${Math.abs(v) < .001 ? 'affluence normale' : `<b class="${v > 0 ? 'vert' : 'rouge'}">${pct(v)} de clients</b>`} (1,5 % par produit au-delà de 4).</p>`;
    const moy = (e2, id) => { let s = 0; for (let k = 0; k < MOMENTS.length; k++) s += (J.partsCarte(e2, k, false)[id] || 0) * J.HEURES_MOMENT[k]; return s / J.HEURES_JOUR; };
    h += CARTE.map(p => {
      const ouvert = J.produitOuvert(e, p), actif = J.produitActif(e, p.id), prix = J.prixProduit(e, p.id), juste = J.prixJusteProduit(e, p.id), cout = coutProduit(e, p.id);
      if (!ouvert) {
        const besoin = (p.req || []).filter(r => r === 'buse' ? !J.aBuse(e) : !J.a(e, r)).map(r => r === 'buse' ? 'la buse à lait (Travaux) ou une Vapore Duo' : T[r].nom.toLowerCase());
        return carte({ icone: p.icone, nom: p.nom, desc: `${p.desc} <i>Pour l’avoir : ${besoin.join(', ') || virg(p.rep) + ' ★'}.</i>`, cls: 'verrou' });
      }
      const r = prix / juste, ventes = hier[p.id], part = actif ? moy(e, p.id) : 0;
      const etat = `<span class="prix-etat ${r > 1.1 ? 'rouge' : r < .85 ? 'miel' : 'vert'}">${r > 1.1 ? 'trop cher' : r < .85 ? 'bradé' : 'bon prix'}</span>`;
      const reglage = p.id === 'espresso' ? `<button class="btn mini" data-ouvrir-prix>Régler</button>`
        : `<div class="prix-produit"><button class="btn mini" data-produit="${p.id}:prix:${(prix - .1).toFixed(2)}">−</button><b>${fmt(prix)}</b><button class="btn mini" data-produit="${p.id}:prix:${(prix + .1).toFixed(2)}">+</button></div>`
          + `<button class="btn mini${actif ? ' vert' : ''}" data-produit="${p.id}:on:${actif ? 0 : 1}">${actif ? 'À la carte' : 'Ajouter'}</button>`;
      const desc = `${p.id === 'espresso' ? fmt(prix) + ' · ' : ''}prix juste ${fmt(juste)} ${etat} · coûte ${fmt(cout)} · marge <b>${fmt(prix - cout)}</b>`
        + (actif ? `<br>${Math.round(part * 100)} % des clients en prennent${ventes ? ` · hier : ${Math.round(ventes.n)} vendus, ${fmt(ventes.ca)}${totalHier ? ` (${Math.round(ventes.ca / totalHier * 100)} % du CA)` : ''}` : ''}` : `<br><i>${p.desc}</i>`)
        + (p.cuisine && actif && !e.equipe.some(x => x.role === 'cuisine') ? '<br><b class="rouge">Personne en cuisine : il ne se vend pas.</b>' : '')
        + (p.lait && actif && e.lait <= 0 ? '<br><b class="rouge">Plus de lait : commande-en dans la Réserve.</b>' : '')
        + (p.stock && actif && !e.viennoiseries.commande ? '<br><b class="rouge">Aucun croissant commandé pour demain (Réserve).</b>' : '');
      return carte({ icone: p.icone, nom: p.nom, tags: p.type === 'extra' ? '<span class="tag cat">extra</span>' : '', desc, bouton: reglage, cls: actif ? 'actuelle' : '' });
    }).join('');
    h += `<p class="legende">Les tarifs du Planning (rush, creux) s’appliquent à toute la carte. Les prix se changent à tout moment.</p>`;
    return h;
  }

  // Les clients : notoriété, fidélité et campagnes de marketing
  function ongletClients(e, soir) {
    const f = e.fidelite, bonus = J.bonusFidelite(e), hier = e.bilans.at(-1);
    let h = `<div class="tresorerie"><div><small>Notoriété</small><b>${Math.round(e.notoriete / 2 * 100)} %</b></div><div><small>Note</small><b>${virg(e.rep, 2)} ★</b></div><div><small>Fidèles</small><b>${f.active ? Math.round(f.membres) : '—'}</b></div></div>`;
    h += `<p class="legende">La <b>notoriété</b> monte avec le bouche-à-oreille : chaque client content en parle. Le marketing l’accélère ; la <b>note</b>, elle, dépend de ce que les clients trouvent chez toi.</p>`;
    h += `<div class="section-titre">Carte de fidélité</div>`;
    if (f.active) {
      h += carte({ icone: '💳', nom: `${Math.round(f.membres)} membres`, tags: '<span class="tag">active</span>',
        desc: `Le 10e café offert. Les membres reviennent plus souvent : <b class="vert">+${Math.round(bonus * 100)} % de clients</b>. Ce que ça coûte : environ ${fmt((hier?.remises || 0))} de cafés offerts hier.${hier?.nouveauxFideles != null ? ` Hier : ${hier.nouveauxFideles >= 0 ? '+' : ''}${Math.round(hier.nouveauxFideles)} membres.` : ''} Des journées décevantes font décrocher des membres.`,
        bouton: `<button class="btn mini rouge" data-fidelite="0">Arrêter</button>` });
    } else {
      h += carte({ icone: '💳', nom: 'Lancer la carte de fidélité', desc: `Le 10e café offert. Les clients ravis s’inscrivent (jusqu’à +${Math.round(FIDELITE.bonusMax * 100)} % de clients avec beaucoup de membres). Impression des cartes : ${fmt(FIDELITE.lancement)}.`,
        bouton: btnPrix(FIDELITE.lancement, 'data-fidelite="1"', e, soir, `Lancer · ${fmt(FIDELITE.lancement)}`) });
    }
    h += `<div class="section-titre">Marketing</div><p class="legende">Une campagne se lance le soir et dure quelques jours. Elle attire du monde… encore faut-il pouvoir les servir !</p>`;
    h += MARKETING.map(m => {
      const actif = (e.campagnes || []).find(c => c.id === m.id), verrou = e.rep < (m.rep || 0);
      const effets = [m.demande ? `+${Math.round(m.demande * 100)} % de clients` : '', m.noto ? `+${Math.round(m.noto / 2 * 100)} point${m.noto > .02 ? 's' : ''} de notoriété` : '', m.bouche ? 'bouche-à-oreille plus rapide' : ''].filter(Boolean).join(', ');
      const bouton = actif ? `<span class="tag-gros">encore ${actif.jours} j</span>` : verrou ? `<span class="tag-gros verrou">${virg(m.rep)} ★</span>` : btnPrix(m.prix, `data-campagne="${m.id}"`, e, soir);
      return carte({ icone: m.icone, nom: m.nom, desc: `${m.desc} <b>${effets}</b>, pendant ${m.jours} jour${m.jours > 1 ? 's' : ''}.`, bouton, cls: actif ? 'actuelle' : verrou ? 'verrou' : '' });
    }).join('');
    if (hier?.avis?.length) h += `<div class="section-titre">Ce qu’ils ont dit hier</div>` + hier.avis.map(x => `<p class="legende">${'★'.repeat(x.etoiles)} « ${x.texte} » · ${x.nom}</p>`).join('');
    return h;
  }

  // Finances : trésorerie, mois en cours, historique, banque
  function compte(m, partiel) {
    const res = m.resultat ?? J.resultatMois(m);
    return `<div class="journal-bilan">${ligneCompte('Chiffre d’affaires', m.ca)}${m.primes ? ligneCompte('Primes (défis, mamie)', m.primes) : ''}${ligneCompte('Achats (grain, lait, ingrédients)', -m.achats)}${ligneCompte('Salaires et charges', -m.salaires)}`
      + `${ligneCompte('Loyer et assurance', -m.loyer)}${ligneCompte('Énergie', -m.energie)}${ligneCompte('Entretien', -m.entretien)}${m.marketing ? ligneCompte('Marketing', -m.marketing) : ''}${m.interets > .5 ? ligneCompte('Intérêts et agios', -m.interets) : ''}`
      + `${m.impots ? ligneCompte('Impôt (15 %)', -m.impots) : ''}${ligneCompte(partiel ? 'Résultat (avant loyer)' : 'Résultat', res, 'total')}</div>`
      + (m.investissements ? `<p class="legende">Investissements (matériel, travaux, déco) : ${fmt(m.investissements)}. Ils sortent de la caisse mais ne comptent pas dans le résultat.</p>` : '');
  }
  // ---------- Courbes : les 4 dernières semaines, jour par jour, et les mois passés ----------
  const COURBES = [
    ['ca', 'Chiffre d’affaires', b => b.recettes, fmt], ['resultat', 'Résultat', b => b.benefice, montant],
    ['caisse', 'Caisse', b => b.caisse, montant], ['clients', 'Clients', b => b.clients, v => Math.round(v).toLocaleString('fr-FR')],
    ['note', 'Note', b => b.note, v => virg(v, 2) + ' ★', false],
  ];
  let courbe = 'ca';
  function courbes(e) {
    const [, nom, val, f, depuisZero = true] = COURBES.find(c => c[0] === courbe) || COURBES[0];
    const jours = e.bilans.filter(b => val(b) != null);
    let h = `<div class="section-titre">Courbes</div><div class="choix-courbe">` + COURBES.map(([id, n]) => `<button class="${id === courbe ? 'choisi' : ''}" data-courbe="${id}">${n}</button>`).join('') + `</div>`;
    if (jours.length < 2) return h + `<p class="legende">Les courbes apparaissent après deux journées.</p>`;
    const W = 320, H = 120, g = 26, vs = jours.map(val), lo = depuisZero ? Math.min(0, ...vs) : Math.max(1, Math.min(...vs) - .15), hi = Math.max(...vs, lo + (depuisZero ? 1e-6 : .3));
    const x = k => g + k * (W - g - 6) / (jours.length - 1), y = v => 8 + (H - 22) * (1 - (v - lo) / (hi - lo));
    const pts = vs.map((v, k) => `${x(k).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const zero = lo < 0 ? `<line x1="${g}" x2="${W - 6}" y1="${y(0)}" y2="${y(0)}" class="zero"/>` : '';
    const lundis = jours.map((b, k) => b.date.startsWith('Lundi') ? `<line x1="${x(k)}" x2="${x(k)}" y1="8" y2="${H - 14}" class="sem"/><text x="${x(k)}" y="${H - 2}">${b.date.split(' ').slice(1, 3).join(' ')}</text>` : '').join('');
    h += `<div class="courbe"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${nom} des ${jours.length} derniers jours">${lundis}${zero}`
      + `<text x="2" y="12">${f(hi)}</text><text x="2" y="${H - 16}">${f(lo)}</text>`
      + `<polyline points="${pts}"/>${vs.map((v, k) => `<circle cx="${x(k)}" cy="${y(v)}" r="${k === vs.length - 1 ? 3.2 : 1.8}"><title>${jours[k].date} : ${f(v)}</title></circle>`).join('')}</svg>`
      + `<p class="legende">${nom} des ${jours.length} derniers jours · hier : <b>${f(vs.at(-1))}</b> · moyenne : ${f(vs.reduce((s, v) => s + v, 0) / vs.length)}</p></div>`;
    if (e.historiqueMois.length >= 1) {
      const ms = e.historiqueMois.slice(-6), mx = Math.max(1, ...ms.map(m => Math.max(m.ca, Math.abs(m.resultat))));
      h += `<div class="mois-barres">` + ms.map(m => `<div><span class="mb"><i class="ca" style="height:${m.ca / mx * 100}%"></i><i class="${m.resultat < 0 ? 'neg' : 'res'}" style="height:${Math.abs(m.resultat) / mx * 100}%"></i></span><small>${m.nom.slice(0, 4)}</small></div>`).join('')
        + `</div><p class="legende"><i class="pastille-ca"></i> chiffre d’affaires <i class="pastille-res"></i> résultat, mois par mois</p>`;
    }
    return h;
  }

  function ongletFinances(e, soir) {
    const j = J.joursAvantLoyer(e), loyer = J.loyerMois(e) + MOIS.assurance, entretien = J.entretienMois(e), mens = e.pret?.mensualite || 0;
    let h = `<div class="tresorerie"><div><small>Caisse</small><b class="${e.argent < 0 ? 'rouge' : ''}">${montant(e.argent)}</b></div>
      <div><small>Fin du mois</small><b>${j === 0 ? 'ce soir' : `dans ${j} j`}</b></div><div><small>À payer ce jour-là</small><b>${fmt(loyer + entretien + mens)}</b></div></div>`;
    h += `<p class="legende">Le ${MOIS.jours}e jour : loyer et assurance ${fmt(loyer)}, entretien du matériel ${fmt(entretien)}${mens ? `, mensualité du prêt ${fmt(mens)}` : ''}, et 15 % d’impôt sur le résultat s’il est positif.${e.argent < 0 ? ` <b class="rouge">Découvert : ${virg(DECOUVERT.agios * 100 * 365, 0)} % d’agios par an. Sous ${montant(DECOUVERT.faillite)}, c’est la faillite.</b>` : ''}</p>`;
    h += courbes(e);
    h += `<div class="section-titre">Mois en cours</div>` + compte(e.mois, true);
    if (e.historiqueMois.length) {
      h += `<div class="section-titre">Mois passés</div><div class="bilans mois"><span></span><span>CA</span><span>Salaires</span><span>Résultat</span>`
        + [...e.historiqueMois].reverse().map(m => `<b>${m.nom}</b><span>${fmt(m.ca)}</span><span>${fmt(m.salaires)}</span><span class="${m.resultat < 0 ? 'neg' : 'pos'}">${montant(m.resultat)}</span>`).join('') + `</div>`;
    }
    h += `<div class="section-titre">Banque</div>`;
    if (e.pret) {
      const p = e.pret;
      h += carte({ icone: '🏦', nom: `Prêt de ${fmt(p.montant)}`, desc: `Reste ${fmt(p.capital)} à rembourser · ${fmt(p.mensualite)} par mois pendant encore ${p.restant} mois · taux ${virg(p.taux * 100)} %` });
    } else {
      h += `<p class="legende">Un prêt pour investir plus tôt (une machine, la cloison…). La banque regarde ton chiffre d’affaires des 7 derniers jours ; le petit prêt est accordé à tout nouveau café.</p>`
        + PRETS.map(p => { const ok = J.pretAccorde(e, p.id), m = J.mensualite(p.montant, p.taux, p.mois);
          return carte({ icone: '🏦', nom: `Prêt de ${fmt(p.montant)}`, desc: `${fmt(m)} par mois pendant ${p.mois} mois · taux ${virg(p.taux * 100)} % · coût total ${fmt(m * p.mois - p.montant)}`,
            bouton: ok ? `<button class="btn mini vert" data-pret="${p.id}">Emprunter</button>` : '<span class="tag-gros verrou">refusé</span>', cls: ok ? '' : 'verrou' }); }).join('');
    }
    return h;
  }

  function ongletCatalogue(e, soir) {
    const MS = Object.values(J.CATALOGUE_MACHINES), MOS = Object.values(J.CATALOGUE_MOULINS), FS = Object.values(J.CATALOGUE_FOURNISSEURS);
    const max = k => Math.max(...MS.map(m => m[k])), maxM = k => Math.max(...MOS.map(m => m[k]));
    poste = Math.min(poste, J.nbPostes(e) - 1);
    let h = `<div class="section-titre">Machines</div><p class="legende">Chaque machine a besoin d’un barista pour tourner.</p><div class="postes">` + Array.from({ length: J.nbPostes(e) }, (_, p) => {
      const id = e.machines[p];
      return `<button class="poste${p === poste ? ' choisi' : ''}" data-poste="${p}">${id ? `<img src="${scene.vignette(J.CATALOGUE_MACHINES[id].visuel, J.CATALOGUE_MACHINES[id].teinte)}" alt="">` : '<span>＋</span>'}<small>Poste ${p + 1}</small></button>`;
    }).join('') + `</div>`;
    const cur = e.machines[poste] ? J.CATALOGUE_MACHINES[e.machines[poste]] : null;
    h += `<p class="legende">Les barres comparent avec ${cur ? `la ${cur.nom}` : 'un poste vide'} (le trait). <span class="mieux">vert</span> = mieux, <span class="moins">rouge</span> = moins bien.</p>`;
    h += MS.filter(m => m.prix > 0 || m.id === cur?.id).map(m => {
      const installe = cur?.id === m.id, verrou = e.rep < (m.rep || 0), net = m.prix - (cur ? cur.prix * .25 : 0);
      const jauges = jauge('Vitesse', m.vitesse, max('vitesse'), cur?.vitesse) + jauge('Goût', m.qualite, max('qualite'), cur?.qualite) + jauge('Fiabilité', m.fiabilite, max('fiabilite'), cur?.fiabilite);
      const bouton = installe ? '<span class="tag-gros">installée</span>' : verrou ? `<span class="tag-gros verrou">${virg(m.rep)} ★</span>` : btnPrix(net, `data-machine="${poste}:${m.id}"`, e, soir);
      return carte({ img: scene.vignette(m.visuel, m.teinte), nom: m.nom, desc: `Jusqu’à ${Math.round(m.vitesse * 80)} tasses/h. ` + m.desc + (m.buse ? ' <b>Buse à lait.</b>' : '') + (!installe && cur && !verrou ? ` <i>Reprise de l’ancienne : ${fmt(cur.prix * .25)}.</i>` : ''),
        jauges, bouton, cls: installe ? 'actuelle' : verrou ? 'verrou' : '' });
    }).join('');
    const mo = J.CATALOGUE_MOULINS[e.moulin];
    h += `<div class="section-titre">Moulin</div>` + MOS.filter(m => m.prix > 0 || m.id === e.moulin).map(m => {
      const installe = m.id === e.moulin, verrou = e.rep < (m.rep || 0), net = m.prix - mo.prix * .25;
      const jauges = jauge('Vitesse', m.vitesse, maxM('vitesse'), mo.vitesse) + jauge('Goût', m.qualite, maxM('qualite'), mo.qualite) + jauge('Fiabilité', m.fiabilite, maxM('fiabilite'), mo.fiabilite);
      const bouton = installe ? '<span class="tag-gros">installé</span>' : verrou ? `<span class="tag-gros verrou">${virg(m.rep)} ★</span>` : btnPrix(net, `data-moulin="${m.id}"`, e, soir);
      return carte({ img: scene.vignette(m.visuel, m.teinte), nom: m.nom, desc: `${Math.round(m.vitesse * 120)} tasses/h. ` + m.desc, jauges, bouton, cls: installe ? 'actuelle' : verrou ? 'verrou' : '' });
    }).join('');
    const fo = J.CATALOGUE_FOURNISSEURS[e.fournisseur], maxP = Math.max(...FS.map(f => f.prixMult)), maxQ = Math.max(...FS.map(f => f.qualite));
    h += `<div class="section-titre">Fournisseur de grains</div>` + FS.map(f => {
      const choisi = f.id === e.fournisseur, verrou = e.rep < f.rep;
      const jauges = jauge('Goût', f.qualite, maxQ, fo.qualite) + jauge('Prix', f.prixMult, maxP, fo.prixMult, true) + jauge('À l’heure', 1 - f.retard, 1, 1 - fo.retard);
      const bouton = choisi ? '<span class="tag-gros">choisi</span>' : verrou ? `<span class="tag-gros verrou">${virg(f.rep)} ★</span>` : `<button class="btn mini vert" data-fourn="${f.id}">Choisir</button>`;
      return carte({ icone: ICONES_FOURN[f.id], nom: f.nom, desc: f.desc, jauges, bouton, cls: choisi ? 'actuelle' : verrou ? 'verrou' : '' });
    }).join('');
    return h;
  }

  function ongletEntretien(e, soir) {
    let h = `<div class="section-titre">Détartrage</div><p class="legende">Le calcaire s’accumule chaque jour : jusqu’à −20 % de goût, et des pannes plus fréquentes. L’entretien courant du matériel est aussi payé chaque fin de mois (${fmt(J.entretienMois(e))}).</p>`;
    e.machines.forEach((id, p) => {
      if (!id) return;
      const m = J.CATALOGUE_MACHINES[id], c = e.calcaire[p] || 0;
      const bouton = c <= 0 ? '<span class="tag-gros">propre</span>' : btnPrix(J.coutDetartrage(e, p), `data-detartrer="${p}"`, e, soir, `Détartrer · ${fmt(J.coutDetartrage(e, p))}`);
      h += carte({ img: scene.vignette(m.visuel, m.teinte), nom: `Poste ${p + 1} · ${m.nom}`, desc: `Calcaire : <b class="${c >= .5 ? 'rouge' : ''}">${Math.round(c * 100)} %</b> · goût −${Math.round(c * 20)} %`,
        jauges: `<div class="calcaire"><i style="width:${c * 100}%"></i></div>`, bouton });
    });
    h += `<p class="legende">Les pannes arrivent pendant le service. Un barista de niveau 3 ou plus répare tout seul en quelques secondes ; sinon, touche la station 3 fois.</p>`;
    return h;
  }

  function apercuDeco(x, type) {
    if (type === 'mur') {
      if (x.motif === 'brique') return `repeating-linear-gradient(0deg, ${x.c2} 0 2px, transparent 2px 9px), ${x.c1}`;
      if (x.motif === 'boiserie') return `linear-gradient(${x.c2} 45%, ${x.c1} 45%)`;
      if (x.motif === 'jungle') return `radial-gradient(ellipse 8px 4px at 30% 30%, ${x.c2} 90%, transparent), radial-gradient(ellipse 8px 4px at 70% 70%, ${x.c2} 90%, transparent), ${x.c1}`;
      return `repeating-linear-gradient(90deg, ${x.c1} 0 8px, ${x.c2} 8px 12px)`;
    }
    if (x.motif === 'damier') return `conic-gradient(${x.c1} 25%, ${x.c2} 0 50%, ${x.c1} 0 75%, ${x.c2} 0) 0 0 / 16px 16px`;
    if (x.motif === 'lames') return `repeating-linear-gradient(0deg, ${x.c1} 0 7px, ${x.c2} 7px 14px)`;
    if (x.motif === 'tomettes') return `radial-gradient(circle at 50% 50%, ${x.c1} 55%, #E6D3BC 57%) 0 0 / 12px 12px, ${x.c2}`;
    if (x.motif === 'terrazzo') return `radial-gradient(circle at 20% 30%, ${x.c2} 2px, transparent 3px), radial-gradient(circle at 70% 60%, #8FA98B 2px, transparent 3px), radial-gradient(circle at 40% 80%, #E8B54A 2px, transparent 3px), ${x.c1}`;
    return x.c1;
  }
  function sectionDeco(e, soir) {
    if (!J.a(e, 'peinture')) return `<div class="section-titre">Décoration</div><p class="legende">Fais d’abord le coup de peinture : ensuite, tu choisiras la couleur des murs et le sol.</p><div class="section-titre">Travaux</div>`;
    const mur = J.murActuel(e), sol = J.solActuel(e), ok = J.harmonie(e);
    const choix = (type, liste, actuel) => `<div class="deco-choix">` + liste.map(x => {
      const nreq = J.niveauRequis(type, x.id), verrouN = J.niveauCafe(e) < nreq, verrou = verrouN || e.rep < (x.rep || 0), p = J.prixDeco(e, x);
      return `<button class="deco${x.id === actuel.id ? ' choisie' : ''}${verrou ? ' verrou' : ''}" data-deco="${type}:${x.id}" title="${x.nom}">
        <i style="background:${apercuDeco(x, type)}"></i><b>${x.nom}</b><small>${verrouN ? `⭐ niveau ${nreq}` : verrou ? `${virg(x.rep)} ★` : x.id === actuel.id ? 'posé' : p ? fmt(p) : 'gratuit'} · ${STYLES[x.style]}</small></button>`;
    }).join('') + `</div>`;
    return `<div class="section-titre">Décoration</div>
      <div class="harmonie ${ok ? 'oui' : ''}">${ok ? `✨ <b>Harmonie ${STYLES[mur.style].toLowerCase()}</b> : clients plus contents et +4 % d’attrait` : `Murs <b>${STYLES[mur.style].toLowerCase()}</b>, sol <b>${STYLES[sol.style].toLowerCase()}</b> : choisis le même style pour l’harmonie.`}</div>
      <div class="dm-titre">Murs</div>${choix('mur', MURS.filter(x => !x.exclusif || e.deco.vus.includes(x.id)), mur)}<div class="dm-titre">Sol</div>${choix('sol', SOLS, sol)}${soir ? '' : '<p class="legende">Les changements de déco se font le soir.</p>'}
      <div class="section-titre">Travaux</div>`;
  }
  function ongletTravaux(e, soir) {
    const deco = sectionDeco(e, soir);
    const dispo = TRAVAUX.filter(t => J.disponible(e, t)).sort((x, y) => x.prix - y.prix);
    const faits = TRAVAUX.filter(t => J.a(e, t.id));
    const auNiveau = TRAVAUX.filter(t => J.prerequisOk(e, t) && !J.disponible(e, t)).sort((x, y) => J.niveauRequis('travaux', x.id) - J.niveauRequis('travaux', y.id));
    const bloques = TRAVAUX.length - dispo.length - faits.length - auNiveau.length;
    return deco + `<p class="legende">${J.places(e)} places assises aujourd’hui. Agrandir fait monter le loyer : regarde l’onglet Finances avant de te lancer.</p>`
      + dispo.map(t => carte({ icone: ICONES_CAT[t.cat], nom: t.nom, tags: `<span class="tag cat">${t.cat}</span>`, desc: t.desc, bouton: btnPrix(t.prix, `data-achat="${t.id}"`, e, soir) })).join('')
      + auNiveau.map(t => carte({ icone: ICONES_CAT[t.cat], nom: t.nom, tags: `<span class="tag niveau">⭐ niveau ${J.niveauRequis('travaux', t.id)}</span>`, desc: t.desc, cls: 'verrou' })).join('')
      + (bloques ? `<p class="fait" style="color:var(--cafe-doux)">Encore ${bloques} travaux à débloquer plus tard…</p>` : '')
      + `<div class="progres-travaux"><span>${faits.length} / ${TRAVAUX.length} travaux faits</span><div class="jauge"><span style="width:${faits.length / TRAVAUX.length * 100}%"></span></div></div>`;
  }

  function nbAchetables(e) {
    const cur = e.machines[poste] ? J.CATALOGUE_MACHINES[e.machines[poste]] : null;
    return {
      catalogue: Object.values(J.CATALOGUE_MACHINES).filter(m => m.prix > 0 && e.rep >= (m.rep || 0) && !e.machines.includes(m.id) && e.argent >= m.prix - (cur ? cur.prix * .25 : 0)).length,
      equipe: e.equipe.filter(p => !p.gerant && ((p.fatigue || 0) > .6 || (p.moral ?? 1) < .35)).length,
      entretien: e.calcaire.filter(c => c >= .5).length,
    };
  }

  function majTravaux() {
    const e = E(), soir = !J.ouvert(e);
    $('t-titre').textContent = soir ? 'Journal du soir' : 'Journal';
    $('t-desc').textContent = soir ? `${J.dateTexte(e)}, le café est fermé. Prépare demain, puis ouvre le café.`
      : `Le café est ouvert (${heureTexte(e.horloge)}). Tu peux tout regarder ; recrutement, achats et commandes normales se font le soir.`;
    const nb = nbAchetables(e);
    const rub = RUBRIQUES.find(r => r.pages.some(p => p[0] === onglet)) || RUBRIQUES[0];
    let h = `<div class="onglets">` + RUBRIQUES.map(r => { const n = r.pages.reduce((s, p) => s + (nb[p[0]] || 0), 0);
      return `<button class="onglet rubrique${r === rub ? ' choisi' : ''}" data-onglet="${r.pages[0][0]}"><span class="ico">${r.icone}</span>${r.nom}${n ? `<span class="pastille">${n}</span>` : ''}</button>`; }).join('') + `</div>`;
    if (rub.pages.length > 1) h += `<div class="sous-onglets">` + rub.pages.map(([id, nom]) => `<button class="${id === onglet ? 'choisi' : ''}" data-onglet="${id}">${nom}${nb[id] ? ` <span class="pastille">${nb[id]}</span>` : ''}</button>`).join('') + `</div>`;
    if (soir && !e.faillite) h += `<button class="btn vert" data-ouvrir style="width:100%;margin:2px 0 8px">☀️ Ouvrir le café (7 h)</button>`;
    const f = { carte: ongletCarte, clients: ongletClients, catalogue: ongletCatalogue, equipe: ongletEquipe, planning: ongletPlanning, finances: ongletFinances, entretien: ongletEntretien, travaux: ongletTravaux }[onglet] || ongletBilan;
    h += f(e, soir);
    if (h !== dernierHtml) { dernierHtml = h; $('t-liste').innerHTML = h; }
  }
  $('t-liste').addEventListener('pointerdown', ev => {
    const e = E(), bt = ev.target.closest('button'); if (!bt || bt.classList.contains('off')) return;
    const res = r => { if (r === 'argent') toast("Pas encore assez d'argent."); if (r === 'ferme') toast('Ça se fait le soir, après 19 h.'); if (r === 'ok') { scene.majDecor(e); sons.achat(); jeu.sauver(); } return r; };
    const d = bt.dataset;
    if (d.onglet) { onglet = d.onglet; sons.clic(); majTravaux(); $('p-travaux').scrollTop = 0; return; }
    if (d.deco) {
      const [type, id] = d.deco.split(':'), r = J.choisirDeco(e, type, id);
      if (r === 'ok') { scene.majDecor(e); sons.achat(); jeu.sauver(); toast(J.harmonie(e) ? '✨ <b>Harmonie !</b> Les murs et le sol vont parfaitement ensemble.' : `Nouvelle déco : <b>${(type === 'mur' ? J.CATALOGUE_MURS : J.CATALOGUE_SOLS)[id].nom}</b>.`); }
      else if (r === 'argent') toast("Pas encore assez d'argent."); else if (r === 'verrou') toast('Il faut une meilleure note pour cette déco.'); else if (r === 'niveau') toast(`⭐ Cette déco se débloque au <b>niveau ${J.niveauRequis(type, id)}</b> du café.`); else if (r === 'ferme') toast('Les travaux de déco se font le soir.');
      majTravaux(); return;
    }
    if (d.boisson) { const r = J.choisirBoisson(e, d.boisson); if (r === 'ok') { sons.clic(); jeu.sauver(); } else if (r === 'verrou') toast('Il faut une meilleure note pour cette boisson.'); else if (r === 'ferme') toast('La boisson du jour se prépare le soir.'); majTravaux(); return; }
    if (d.formule) { const [id, v] = d.formule.split(':'), r = J.reglerFormule(e, id, v === '1'); if (r === 'ok') { sons.clic(); jeu.sauver(); } else if (r === 'ferme') toast('Les formules se préparent le soir.'); majTravaux(); return; }
    if (d.courbe) { courbe = d.courbe; sons.clic(); majTravaux(); return; }
    if ('gazette' in d) { afficherGazette(e.gazettes.at(-1)); e.gazetteLue = e.gazettes.at(-1).numero; jeu.sauver(); majTravaux(); return; }
    if (d.produit) {
      const [id, champ, v] = d.produit.split(':'), r = J.regleProduit(e, id, champ, +v);
      if (r === 'ok') { sons.clic(); jeu.sauver(); scene.majDecor(e); if (champ === 'on') toast(+v ? `${J.CATALOGUE_CARTE[id].icone} <b>${J.CATALOGUE_CARTE[id].nom}</b> à la carte.` : `${J.CATALOGUE_CARTE[id].nom} retiré de la carte.`); }
      majTravaux(); return;
    }
    if ('ouvrirPrix' in d) { ouvrir('p-prix'); $('x-curseur').value = e.prix; $('x-dose').value = e.dosage; majPrix(); return; }
    if (d.campagne) {
      const m = J.CATALOGUE_MARKETING[d.campagne], r = J.lancerCampagne(e, d.campagne);
      if (r === 'ok') { sons.achat(); jeu.sauver(); toast(`${m.icone} <b>${m.nom}</b> : c’est parti pour ${m.jours} jour${m.jours > 1 ? 's' : ''} !`); }
      else if (r === 'argent') toast("Pas encore assez d'argent."); else if (r === 'ferme') toast('Les campagnes se lancent le soir.');
      majTravaux(); return;
    }
    if (d.fidelite) {
      if (d.fidelite === '1') { const r = J.lancerFidelite(e); if (r === 'ok') { sons.achat(); jeu.sauver(); toast('💳 <b>Carte de fidélité lancée</b> : les clients ravis vont s’inscrire.'); } else if (r === 'argent') toast("Pas encore assez d'argent."); else if (r === 'ferme') toast('Ça se lance le soir.'); majTravaux(); return; }
      bulle('Arrêter la carte de fidélité ? Les membres seront perdus.', { titre: 'Fidélité', boutons: [{ label: 'Non', cls: 'vert' }, { label: 'Arrêter', cls: 'rouge', fn: () => { J.arreterFidelite(E()); jeu.sauver(); majTravaux(); } }] });
      return;
    }
    if (d.tarif) { const [k, v] = d.tarif.split(':').map(Number); if (J.reglerTarif(e, k, v) === 'ok') { sons.clic(); jeu.sauver(); } majTravaux(); return; }
    if (d.detartrer) { const p = +d.detartrer; if (res(J.detartrer(e, p)) === 'ok') toast(`Machine du poste ${p + 1} détartrée : elle retrouve tout son goût.`); majTravaux(); return; }
    if (d.poste) { poste = +d.poste; sons.clic(); majTravaux(); return; }
    if ('ouvrir' in d) { jeu.ouvrirCafe(); fermer(); return; }
    if (d.plein) { const [g, n] = d.plein.split(':'), r = J.remplir(e, g, false, +n); if (typeof r === 'number') { sons.clic(); toast(`Commande passée : <b>${r} kg</b> de ${G[g].nom}, livrés demain à 7 h.`); jeu.sauver(); } majTravaux(); return; }
    if (d.machine) { const [p, id] = d.machine.split(':'); if (res(J.acheterMachine(e, +p, id)) === 'ok') toast(`<b>${J.CATALOGUE_MACHINES[id].nom}</b> installée au poste ${+p + 1}. Il lui faut un barista !`); majTravaux(); return; }
    if (d.moulin) { if (res(J.acheterMoulin(e, d.moulin)) === 'ok') toast(`<b>${J.CATALOGUE_MOULINS[d.moulin].nom}</b> installé.`); majTravaux(); return; }
    if (d.fourn) { J.choisirFournisseur(e, d.fourn); sons.clic(); toast(`Fournisseur : <b>${J.CATALOGUE_FOURNISSEURS[d.fourn].nom}</b>.`); majTravaux(); return; }
    // Équipe
    if (d.embauche) { const c = e.candidats.find(x => x.id === d.embauche); if (J.embaucher(e, d.embauche) === 'ok') { sons.achat(); jeu.sauver(); toast(`<b>${c.nom}</b> rejoint l’équipe (${ROLES[c.role].toLowerCase()}). Planning par défaut : matin et midi.`); } majTravaux(); return; }
    if (d.plan) { const [id, k, v] = d.plan.split(':'); J.reglerPlanning(e, id, +k, v === '1'); sons.clic(); jeu.sauver(); majTravaux(); return; }
    if (d.role) { const [id, r] = d.role.split(':'); J.changerRole(e, id, r); sons.clic(); jeu.sauver(); majTravaux(); return; }
    if (d.sal) { const [id, v] = d.sal.split(':'); J.changerSalaire(e, id, +v); sons.clic(); jeu.sauver(); majTravaux(); return; }
    if (d.former) { const p = J.employe(e, d.former); if (res(J.former(e, d.former)) === 'ok') toast(`<b>${p.nom}</b> part en formation demain (absent toute la journée) : un niveau de plus au retour.`, 5000); majTravaux(); return; }
    if (d.renvoi) {
      const p = J.employe(e, d.renvoi); if (!p) return;
      bulle(`Renvoyer ${p.nom} ? Il faudra verser une indemnité de ${fmt(J.indemnite(p))}.`, { titre: 'Renvoyer ?', boutons: [{ label: 'Non', cls: 'vert' },
        { label: 'Renvoyer', cls: 'rouge', fn: () => { J.renvoyer(E(), p.id); jeu.sauver(); toast(`${p.nom} a quitté le café.`); majTravaux(); } }] });
      return;
    }
    if (d.pret) {
      const p = PRETS.find(x => x.id === d.pret);
      bulle(`Emprunter ${fmt(p.montant)} ? Tu rembourseras ${fmt(J.mensualite(p.montant, p.taux, p.mois))} chaque fin de mois pendant ${p.mois} mois.`, { titre: 'La banque', boutons: [{ label: 'Pas maintenant' },
        { label: 'Signer', cls: 'vert', fn: () => { if (J.emprunter(E(), p.id) === 'ok') { sons.achat(); jeu.sauver(); toast(`<b>+${fmt(p.montant)}</b> sur le compte. Investis bien !`); } majTravaux(); } }] });
      return;
    }
    if (d.achat) {
      const id = d.achat, nouv = CARTE.filter(p => (p.req || []).includes(id) && J.produitOuvert({ ...e, achats: [...e.achats, id] }, p)).map(p => p.icone + ' ' + p.nom.toLowerCase());
      if (res(J.acheter(e, id)) === 'ok') toast(`<b>${T[id].nom}</b> : ${MOTS_TRAVAUX[id] || "c'est fait !"}${nouv.length ? `<br>Nouveau à la carte : ${nouv.join(', ')}.` : ''}`, 6000);
      majTravaux();
    }
  });

  function majPrix() {
    const e = E(), pj = J.prixJuste(e), r = J.prixEffectif(e) / pj, b = J.bilan(e);
    const tf = J.ouvert(e) ? e.tarifs[J.momentIndex(e)] : 1;
    $('x-prix').innerHTML = fmt(e.prix) + (tf !== 1 ? ` <small class="tarif-moment">${J.momentActuel(e).nom.toLowerCase()} : ${fmt(J.prixEffectif(e))}</small>` : '');
    $('x-juste').textContent = `prix juste ${fmt(pj)}`;
    $('x-clients').textContent = J.ouvert(e) ? `${Math.round(b.parHeure.demande)}/h` : 'fermé';
    $('x-marge').innerHTML = `${fmt(J.panier(e) - J.coutTasse(e) * J.partGrain(e))} <em>ticket ${fmt(J.panier(e))} · grain ${fmt(J.coutTasse(e) * J.partGrain(e))}</em>`;
    const fd = J.facteurDosage(e), k = J.consoParTasse(e);
    $('x-dosage').textContent = `${virg(e.dosage, e.dosage % 1 ? 1 : 0)} g`;
    $('x-dose-effet').textContent = Math.abs(k - 1) < .01 ? 'référence' : `goût ${fd >= 1 ? '+' : '−'}${Math.round(Math.abs(fd - 1) * 100)} % · grain ${k >= 1 ? '+' : '−'}${Math.round(Math.abs(k - 1) * 100)} %`;
    const av = $('x-avis');
    if (r > 1.1) { av.className = 'alerte'; av.textContent = `Trop cher (+${Math.round((r - 1) * 100)} %) : les clients fuient et la note baisse.`; }
    else if (r < .8) { av.className = 'alerte'; av.textContent = 'Très bon marché : beaucoup de clients, mais peu de marge.'; }
    else { av.className = 'alerte ok'; av.textContent = J.ouvert(e) && b.chaine < b.demande ? 'Tu refuses du monde : tu peux monter un peu le prix.' : 'Bon équilibre entre affluence et marge.'; }
  }

  // ---------- Carnet ----------
  $('c-renommer').onclick = () => { const n = J.nettoyerNom($('c-nom').value); if (!n) return toast('Donne un nom à ton café.'); jeu.renommer(n); sons.achat(); toast(`Ton café s’appelle maintenant <b>${n}</b>.`); };
  $('c-nom').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('c-renommer').click(); });
  $('c-exporter').onclick = async () => {
    const code = jeu.exporter();
    let copie = false; try { await navigator.clipboard.writeText(code); copie = true; } catch { /* presse-papier refusé */ }
    try { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([code], { type: 'text/plain' })), download: `sauvegarde-gestion-${J.nettoyerNom(J.nomCafe(E())).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'cafe'}.txt` }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); } catch { /* pas de téléchargement */ }
    toast(copie ? 'Sauvegarde <b>copiée</b> (et téléchargée). Garde ce code bien au chaud !' : 'Sauvegarde téléchargée. Garde ce fichier bien au chaud !', 5000); sons.clic();
  };
  $('c-importer').onclick = () => {
    const code = prompt('Colle ici le code de ta sauvegarde (il commence par PG5:). Attention : la partie en cours sera remplacée.');
    if (!code) return;
    if (jeu.importer(code)) { sons.succes(); toast(`Sauvegarde chargée : bienvenue à <b>${J.nomCafe(E())}</b> !`); } else toast('Ce code ne ressemble pas à une sauvegarde de la version gestion.');
  };
  function majCarnet() {
    const e = E(), m = e.meta;
    if (document.activeElement !== $('c-nom')) $('c-nom').value = J.nomCafe(e);
    $('c-desc').textContent = `${J.dateTexte(e)} · ${Math.round(m.clientsTotal || m.tasses).toLocaleString('fr-FR')} clients servis · ${Math.round(e.nbAvis).toLocaleString('fr-FR')} avis · notoriété ${Math.round(e.notoriete / 2 * 100)} %`;
    const cr = J.cibleReputation(e), P = cr.parts;
    const barre = (nom, v, max, aide) => `<div class="nd"><span>${nom}</span><span class="nd-barre"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span><b>${virg(v, 2)}</b><small>${aide}</small></div>`;
    $('c-note').innerHTML = `<p>Note actuelle <b>${virg(e.rep, 2)} ★</b> (${Math.round(e.nbAvis)} avis) · un client servi maintenant donnerait <b>${virg(cr.total, 2)} ★</b>${cr.total > e.rep + .02 ? ' ↗' : cr.total < e.rep - .02 ? ' ↘' : ''}</p>`
      + barre('Goût', P.gout, 1.8, 'grain, machines, moulin, fraîcheur, baristas') + barre('Service', P.service, 1.15, 'assez de monde, peu d’attente, un sourire en salle')
      + barre('Prix', P.prix, .6, 'pas plus cher que le prix juste') + barre('Ambiance', P.deco, .6, 'déco, harmonie')
      + `<p class="legende">Chaque client qui repart sans être servi tire la note vers le bas.</p>`;
    $('c-bilans').innerHTML = e.bilans.length ? '<span></span><span>Recettes</span><span>Dépenses</span><span>Résultat</span>' + [...e.bilans].reverse().map(b => `<b>${b.date.split(' ').slice(0, 2).join(' ')}</b><span>${fmt(b.recettes)}</span><span>${fmt(b.depenses + b.charges)}</span><span class="${b.benefice < 0 ? 'neg' : 'pos'}">${montant(b.benefice)}</span>`).join('') : '<span style="grid-column:1/-1">La première journée n’est pas finie (une journée dure 6 minutes).</span>';
    const jours = e.bilans.slice(-7), max = Math.max(1, ...jours.map(b => Math.abs(b.benefice)));
    $('c-graphe').innerHTML = jours.length > 1 ? jours.map(b => `<div class="${b.benefice < 0 ? 'neg' : ''}" style="height:${Math.max(4, Math.abs(b.benefice) / max * 100)}%" title="Jour ${b.jour}"><span>J${b.jour}</span></div>`).join('') : '';
    $('c-nb-succes').textContent = `${m.succes.length}/${SUCCES.length}`;
    $('c-succes').innerHTML = SUCCES.map(s => `<div class="${m.succes.includes(s.id) ? 'oui' : 'non'}"><b>${m.succes.includes(s.id) ? '★ ' : ''}${s.nom}</b>${s.desc}</div>`).join('');
    $('c-histoire').innerHTML = HISTOIRE.filter(h => m.histoire.includes(h.id)).map(h => `<button data-h="${h.id}">${h.titre}</button>`).join('') || '<p class="desc">Rien pour l\'instant.</p>';
    // Le niveau du café : où on en est, et les trois prochains déblocages
    const pn = J.progresNiveau(e), suite = DEBLOCAGES.filter(d => d.niveau > pn.niveau).slice(0, 3);
    $('c-niveau').innerHTML = `<div class="cn-tete"><span class="cn-etoile">${pn.niveau}</span><div><b>Niveau ${pn.niveau}</b><span class="nd-barre"><i style="width:${pn.part * 100}%"></i></span>
      <small>${Math.round(pn.xp)} / ${pn.besoin} XP · prochain niveau : +${fmt(J.primeNiveau(pn.niveau + 1))}${(pn.niveau + 1) % 5 === 0 ? ' (coffre !)' : ''} · postes jusqu’au niveau ${J.nivMaxPoste(e)}</small></div></div>`
      + (suite.length ? `<div class="cn-suite">${suite.map(d => `<div><span>⭐ ${d.niveau}</span>${nomDeblocage(d)}</div>`).join('')}</div>` : '');
    // Les habitués : où en est chaque histoire, et les chapitres à relire
    $('c-amities').innerHTML = HISTOIRES_HABITUES.map(h => {
      const s = J.etatHistoire(e, h, jeu.auj), repMin = Math.min(...HABITUES.filter(x => h.qui.includes(x.id)).map(x => x.repMin));
      const venu = s.visites > 0 || e.rep >= repMin;
      const etat = s.fini ? `🎁 ${h.cadeau.nom} : ${h.cadeau.effet}` : !venu ? `Pas encore venu : il faudra ${virg(repMin)} ★` : s.demain ? 'La suite de son histoire : demain.'
        : s.pret ? 'A quelque chose à te raconter : à sa prochaine visite !' : `${s.visites}/${s.seuil} visites avant le chapitre ${s.lus + 1}`;
      return `<div class="amitie${venu ? '' : ' inconnu'}"><span class="am-ico">${venu ? h.icone : '❔'}</span><div class="am-corps"><b>${venu ? h.nom : 'Un habitué à rencontrer'}</b>${coeurs(s.lus, h.chapitres.length)}<small>${etat}</small>
        ${s.lus ? `<div class="am-relire">${h.chapitres.slice(0, s.lus).map((c, k) => `<button data-chap="${h.id}:${k}">${k + 1}. ${c.titre}</button>`).join('')}</div>` : ''}</div></div>`;
    }).join('');
    const lus = Math.min(m.courrier?.lus || 0, LETTRES.length);
    $('c-nb-lettres').textContent = `${lus}/${LETTRES.length}`;
    $('c-lettres').innerHTML = LETTRES.slice(0, lus).map((l, k) => `<button data-lettre="${k}">${l.titre}</button>`).join('')
      || `<p class="desc">${J.courrierDispo(e, jeu.auj) ? 'Une lettre t’attend : touche l’enveloppe ✉️.' : 'Mamie t’écrit une lettre chaque jour où tu viens jouer (à partir de demain).'}</p>`;
  }
  $('c-amities').addEventListener('click', ev => { const b = ev.target.closest('button[data-chap]'); if (b) { const [id, k] = b.dataset.chap.split(':'); relireChapitre(id, +k); } });
  $('c-lettres').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-lettre]'); if (!b) return;
    const k = +b.dataset.lettre, l = LETTRES[k];
    afficherLettre({ ...l, texte: l.texte.replaceAll('{cafe}', J.nomCafe(E())), de: 'Mamie Odette', numero: k + 1, total: LETTRES.length });
  });
  $('c-histoire').addEventListener('click', ev => { const b = ev.target.closest('button[data-h]'); if (b) { const h = HISTOIRE.find(x => x.id === b.dataset.h); bulle(h.texte, { titre: h.titre }); } });
  // ---------- Réglages (gardés sur cet appareil) ----------
  const CLE_REGLAGES = 'n15x-reglages';
  const petitAppareil = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
  let reglages = { son: true, musique: true, gfx: petitAppareil ? 'légers' : 'beaux' };
  try { Object.assign(reglages, JSON.parse(localStorage.getItem(CLE_REGLAGES) || '{}')); } catch { /* réglages par défaut */ }
  function appliquerReglages() {
    regleSon(reglages.son); regleMusique(reglages.musique); scene.qualite(reglages.gfx === 'beaux');
    $('r-son').textContent = 'Son : ' + (reglages.son ? 'activé' : 'coupé');
    $('r-mus').textContent = 'Musique : ' + (reglages.musique ? 'activée' : 'coupée');
    $('r-gfx').textContent = 'Graphismes : ' + reglages.gfx;
    try { localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages)); } catch { /* rien */ }
  }
  $('r-son').onclick = () => { reglages.son = !reglages.son; appliquerReglages(); sons.clic(); };
  $('r-mus').onclick = () => { reglages.musique = !reglages.musique; appliquerReglages(); sons.clic(); };
  $('r-gfx').onclick = () => { reglages.gfx = reglages.gfx === 'beaux' ? 'légers' : 'beaux'; appliquerReglages(); };
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('c-installer').hidden = !(ios && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches && !window.PLATEFORME);
  appliquerReglages();

  $('c-reset').onclick = () => bulle('Tout effacer et recommencer depuis le tout début ? Tes succès seront perdus.', {
    titre: 'Nouvelle partie ?', boutons: [{ label: 'Non, je garde', cls: 'vert' }, { label: 'Tout effacer', cls: 'rouge', fn: () => jeu.nouvellePartie() }] });

  $('puces').addEventListener('pointerdown', ev => {
    const p = ev.target.closest('.puce'); if (!p) return;
    if ('ouvrir' in p.dataset) { jeu.ouvrirCafe(); return; }
    if ('journal' in p.dataset) { ouvrirJournal(p.dataset.journal || null); return; }
    if ('goulot' in p.dataset) { const c = conseilGoulot(E(), J.bilan(E()).goulot); if (c.journal) ouvrirJournal(c.journal); else if (c.stock) { ouvrir('p-stock'); majStock(); } else { ouvrir('p-prix'); $('x-curseur').value = E().prix; majPrix(); } }
    if ('stock' in p.dataset) { ouvrir('p-stock'); majStock(); }
    if (p.dataset.panne) toucherStation(+p.dataset.panne);
  });

  // ---------- Tutoriel : mamie montre l'écran, bulle après bulle (le temps s'arrête pendant ce temps) ----------
  const ETAPES = {
    jour: [
      [null, 'Bienvenue derrière le bar ! Je te montre l’essentiel en quelques bulles. Le temps est arrêté pendant ce temps.'],
      ['.carte-argent', 'En haut : ta caisse, ta note (les étoiles) et ce que tu encaisses par heure. L’heure et la date sont juste en dessous.'],
      ['#puces', 'Ces pastilles disent ce qui limite tes ventes en ce moment : l’équipe, les places, le grain… ou les clients. Touche-les pour aller droit au problème.'],
      ['#objectif', 'Mon conseil du moment. Chaque objectif atteint rapporte une petite prime.'],
      ['#b-stock', 'La Réserve : ton grain, au kilo. Sans grain, pas de café ! Les commandes normales se passent le soir ; en journée, seulement en urgence et au prix fort.'],
      ['#b-prix', 'Le prix de l’espresso. Reste près du prix juste : trop cher, les clients fuient et la note baisse ; trop bas, tu travailles pour rien.'],
      ['#b-travaux', 'Le Journal : ta carte, ton équipe, le planning, tes clients, tes comptes… C’est là que tout se décide, le soir après 19 h.'],
      ['#rush', 'La vitesse du temps : ×1, ×2, ×3 ou pause. Une journée dure 6 minutes à ×1.'],
      [null, 'Pour ce premier jour, regarde le café tourner jusqu’à 19 h. Ensuite, je te montrerai le journal du soir.'],
    ],
    soir: [
      ['#t-liste .journal-bilan', 'Le bilan de ta journée : ce que tu as encaissé, ce que tu as dépensé, et le résultat.'],
      ['#t-liste .onglets', 'Le journal est rangé en cinq rubriques : ta journée, la carte et les clients, l’équipe, le café (travaux, matériel) et les comptes. Une pastille rouge signale ce qui demande ton attention.'],
      ['#t-liste .commande-demain', 'Le plus urgent chaque soir : le grain pour demain. « Pour demain » commande juste ce qu’il faut, livré à 7 h.'],
      ['#t-liste [data-ouvrir]', 'Quand tout est prêt, ouvre le café. La nuit attend que tu aies fini : prends ton temps.'],
    ],
  };
  let tutoEnCours = false;
  function tutoriel(id) {
    const etapes = ETAPES[id]; if (!etapes || tutoEnCours) return;
    tutoEnCours = true;
    const avant = jeu.vitesse || 1; jeu.vitesse = 0; majVitesse();
    let k = 0;
    const etape = () => {
      document.querySelectorAll('.tuto-cible').forEach(x => x.classList.remove('tuto-cible'));
      if (k >= etapes.length) { tutoEnCours = false; jeu.vitesse = avant; majVitesse(); $('bulle').classList.remove('haut', 'bas'); return; }
      const [sel, texte] = etapes[k], el = sel ? document.querySelector(sel) : null, visible = el && el.offsetParent !== null;
      if (visible) { el.classList.add('tuto-cible'); el.scrollIntoView?.({ block: 'nearest' }); }
      const dernier = k === etapes.length - 1, suivant = () => { k++; etape(); };
      bulle(texte, { titre: `Mamie Odette · ${k + 1}/${etapes.length}`,
        boutons: dernier ? [{ label: 'Compris !', cls: 'vert', fn: suivant }] : [{ label: 'Passer', fn: () => { k = etapes.length; etape(); } }, { label: 'Suivant', cls: 'vert', fn: suivant }] });
      // La bulle se met à l'écart de ce qu'elle montre
      if (visible) { const r = el.getBoundingClientRect(); $('bulle').classList.add(r.top + r.height / 2 > innerHeight / 2 ? 'haut' : 'bas'); }
    };
    etape();
  }
  $('c-tuto').onclick = () => { fermer(); tutoriel('jour'); };

  // ---------- Ce qui freine les ventes, dit simplement, avec l'endroit où agir ----------
  function conseilGoulot(e, g) {
    if (g.type === 'stock') return { texte: 'Plus de grain ! Commande en urgence', cls: 'rouge', stock: true };
    if (g.type === 'clients') return { texte: 'Tout roule : le café pourrait servir plus de monde', cls: 'vert', prix: true };
    const c = g.cause;
    if (c === 'bar' && /personne/.test(g.nom)) return { texte: 'Personne au bar ! Planning', cls: 'rouge', journal: 'planning' };
    if (c === 'bar' && /attend/.test(g.nom)) return { texte: 'Une machine attend un barista : embauche', cls: 'rouge', journal: 'equipe' };
    if (c === 'bar') return { texte: 'Le bar ne suit pas : machine plus rapide', cls: 'miel', journal: 'catalogue' };
    if (c === 'moulin') return { texte: 'Le moulin est trop lent : nouveau moulin', cls: 'miel', journal: 'catalogue' };
    if (c === 'salle') return { texte: 'Le service en salle déborde : quelqu’un de plus', cls: 'miel', journal: 'equipe' };
    if (c === 'places') return { texte: 'Toutes les tables sont prises : ajoute des tables', cls: 'miel', journal: 'travaux' };
    return { texte: g.nom, cls: '' };
  }

  // ---------- Guide : fait pulser ce qu'il faut toucher pour l'objectif en cours ----------
  let cibleGuide = null;
  function guider(o, e) {
    let el = null;
    if (o && !J.ouvert(e)) {
      if (o.id === 'commande') el = $('b-stock');
      else if (['embauche', 'peinture', 'carte', 'machine', 'fidelite', 'equipe3', 'cloison', 'terrasse'].includes(o.id)) el = $('b-travaux');
    }
    if (el === cibleGuide) return;
    cibleGuide?.classList.remove('guide'); cibleGuide = el; el?.classList.add('guide');
  }

  // ---------- Mise à jour à chaque image ----------
  const etoilesTxt = r => { const n = Math.round(r * 2) / 2; let h = ''; for (let k = 1; k <= 5; k++) h += n >= k ? '★' : n >= k - .5 ? '⯪' : '<i>★</i>'; return h + ` <small>${virg(r, 2)}</small>`; };
  function maj(res, dt) {
    const e = E();
    revenuLisse += ((res.parSeconde || 0) * 30 - revenuLisse) * Math.min(1, dt * 2);
    argentAffiche = Math.abs(e.argent - argentAffiche) < .5 ? e.argent : argentAffiche + (e.argent - argentAffiche) * Math.min(1, dt * 7);
    $('argent').textContent = fmt(argentAffiche);
    $('argent').classList.toggle('rouge', e.argent < 0);
    // la caisse « pulse » quand l'argent rentre (pas plus de deux fois par seconde)
    const maintenant = performance.now();
    if (e.argent > dernierArgent + .5 && maintenant - dernierPulse > 500) { dernierPulse = maintenant; const a = $('argent'); a.classList.remove('gain'); void a.offsetWidth; a.classList.add('gain'); }
    dernierArgent = e.argent;
    const pn = J.progresNiveau(e);
    $('nc-num').textContent = pn.niveau; $('nc-barre').style.width = (pn.part * 100).toFixed(1) + '%';
    // L'en-tête d'un gérant : l'heure et la date, puis l'affluence en mots simples (pas d'euros qui défilent)
    $('ips').textContent = J.ouvert(e) ? heureTexte(e.horloge) : 'Fermé';
    const ph = res.parHeure;
    $('tasses').innerHTML = J.ouvert(e) ? `${J.dateTexte(e)} · ${J.meteoDuJour(e).nom.toLowerCase()}<br><span class="moment">${Math.round(ph?.ventes || 0)} clients/h${ph && ph.demande > ph.ventes + .5 ? ` · <span class="rouge">${Math.round(ph.demande - ph.ventes)} repartent</span>` : ''}</span>`
      : `${J.dateTexte(e)}<br><span class="moment">${e.faillite ? 'faillite' : 'la nuit · à toi d’ouvrir'}</span>`;
    majDecision(e);
    const c = res.cap;
    STATIONS.forEach((s, i) => {
      const el = etiquettes[i], [x, y] = scene.projeter(scene.ANCRES[i]), st = e.st[i];
      el.style.left = x + 'px'; el.style.top = y + 'px';
      // Pas d'étiquettes de jeu arcade : un poste ne se signale que s'il a un problème (panne, débordé, plus de grain)
      const goulot = res.goulot.type === 'station' && res.goulot.i === i && !st.panne, vide = i === 0 && J.ouvert(e) && e.stock[e.maison] <= 0;
      // Un poste qu'on peut améliorer le signale d'une petite flèche (sans couvrir les problèmes)
      // (pas dès le premier jour : l'argent de départ sert d'abord aux travaux)
      const peut = !st.panne && !goulot && !vide && J.niveauCafe(e) >= 3 && st.niv < J.nivMaxPoste(e) && e.argent >= J.coutPoste(e, i) * 3 + 1500;
      el.querySelector('.niv').textContent = st.panne ? 'en panne' : goulot ? 'débordé' : vide ? 'plus de grain' : peut ? `niv ${st.niv} ⬆` : '';
      el.hidden = !(st.panne || goulot || vide || peut);
      el.classList.toggle('peut', peut);
      el.classList.toggle('goulot', goulot || vide);
      el.classList.toggle('panne', !!st.panne);
    });
    accUI += dt;
    if (accUI > .25 || dt === 0) {
      accUI = 0;
      const o = J.objectifActuel(e);
      guider(o, e);
      $('objectif').hidden = !o;
      const d = e.defi; $('defi').hidden = !d || !J.ouvert(e);
      if (d) {
        const suivi = d.id === 'tasses' || d.id === 'matin';
        $('defi-txt').textContent = d.texte + (suivi && !d.fini ? ` · ${Math.round(d.progres).toLocaleString('fr-FR')}` : '');
        $('defi-barre').style.width = (d.fini ? 100 : suivi ? Math.min(100, d.progres / d.cible * 100) : d.rate ? 0 : 50) + '%';
        $('defi-prime').textContent = d.fini ? 'réussi ✓' : d.rate ? 'raté' : '+' + fmt(d.prime);
        $('defi').className = 'defi' + (d.fini ? ' fini' : d.rate ? ' rate' : '');
      }
      if (o) { $('obj-txt').textContent = o.texte; $('obj-prime').textContent = o.prime ? '+' + fmt(J.primeObjectif(e, o)) : ''; }
      $('nom').textContent = `${J.nomCafe(e)} · ${J.nomVille(e)}`;
      $('etoiles').innerHTML = etoilesTxt(e.rep);
      let puces = '';
      if (!J.ouvert(e) && !e.faillite) puces += `<span class="puce vert" data-ouvrir>☀️ Ouvrir le café</span><span class="puce" data-journal>📒 Journal du soir</span>`;
      else if (J.ouvert(e)) { const c = conseilGoulot(e, res.goulot); puces += `<span class="puce ${c.cls}" data-goulot>${c.texte} ›</span>`; }
      const kgServi = e.stock[e.maison] / DOSES_SAC;
      puces += `<span class="puce ${kgServi < 1 ? 'rouge' : kgServi < 3 ? 'miel' : ''}" data-stock>${G[e.maison].court} : ${kg(e.stock[e.maison])}${e.commandes.some(x => x.grain !== 'lait') ? ' · livraison en route' : ''}</span>`;
      const jl = J.joursAvantLoyer(e); if (jl <= 3) puces += `<span class="puce miel" data-journal="finances">Loyer ${jl === 0 ? 'ce soir' : `dans ${jl} j`} : ${fmt(J.loyerMois(e) + MOIS.assurance)}</span>`;
      if (e.argent < 0) puces += `<span class="puce rouge" data-journal="finances">Découvert : ${montant(e.argent)}</span>`;
      const fatigues = e.equipe.filter(p => !p.gerant && (p.fatigue || 0) > .6).length; if (fatigues) puces += `<span class="puce miel" data-journal="equipe">${fatigues} employé${fatigues > 1 ? 's' : ''} épuisé${fatigues > 1 ? 's' : ''}</span>`;
      const cmax = Math.max(...e.calcaire); if (cmax >= .5) puces += `<span class="puce miel" data-journal="entretien">Calcaire : ${Math.round(cmax * 100)} %</span>`;
      const fr = J.fraicheur(e, e.maison); if (fr < .9) puces += `<span class="puce miel" data-stock>Grain rassis : −${Math.round((1 - fr) * 100)} % de goût</span>`;
      if (J.aBuse(e) && e.lait < LAIT.doses * 2) puces += `<span class="puce ${e.lait <= 0 ? 'rouge' : 'miel'}" data-stock>Lait : ${e.lait <= 0 ? 'vide' : virg(e.lait / LAIT.doses) + ' L'}</span>`;
      (e.campagnes || []).forEach(c => { const m = J.CATALOGUE_MARKETING[c.id]; if (m) puces += `<span class="puce vert" data-journal="clients">${m.icone} ${m.nom} · ${c.jours} j</span>`; });
      e.evts.forEach(v => { puces += `<span class="puce ${v.id === 'cafemax' || v.id === 'nettoyage' ? 'rouge' : 'vert'}">${v.nom} · ${Math.ceil(v.reste / 30 * 60)} min</span>`; });
      e.st.forEach((s, i) => { if (s.panne) puces += `<span class="puce rouge" data-panne="${i}">Panne : ${STATIONS[i].court}</span>`; });
      $('puces').innerHTML = puces;
      majVitesse();
      $('b-prix-txt').textContent = fmt(J.prixEffectif(e));
      $('b-stock-txt').textContent = `${virg(J.totalStock(e) / DOSES_SAC, 0)} kg`;
      $('b-travaux').innerHTML = J.ouvert(e) ? `Journal<small>équipe, comptes</small>` : `Journal<small>du soir</small><span class="pastille">!</span>`;
      $('b-carnet').innerHTML = `Carnet<small>${e.meta.succes.length} succès</small>`;
      if (ouvert === 'fiche') majFiche();
      if (ouvert === 'p-prix') majPrix();
      // Le tutoriel : le premier matin (après le mot d'accueil de mamie), puis le premier soir
      if (jeu.enJeu && $('bulle').hidden && !tutoEnCours && !e.faillite) {
        if (!e.meta.tutoJour && e.meta.histoire.includes('intro') && J.ouvert(e)) { e.meta.tutoJour = true; jeu.sauver(); tutoriel('jour'); }
        else if (!e.meta.tutoSoir && !J.ouvert(e) && ouvert === 'p-travaux' && onglet === 'bilan') { e.meta.tutoSoir = true; jeu.sauver(); setTimeout(() => tutoriel('soir'), 300); }
      }
    }
    accPanneau += dt;
    if (accPanneau > 1) { accPanneau = 0; if (ouvert === 'p-stock') majStock(); if (ouvert === 'p-travaux') majTravaux(); if (ouvert === 'p-carnet') majCarnet(); }
  }

  function objectifAtteint(o) {
    const el = $('objectif'); el.classList.remove('bravo'); void el.offsetWidth; el.classList.add('bravo');
    celebrer({ genre: 'Objectif atteint', titre: 'Bravo !', texte: o.texte, prime: o.prime });
  }
  // ---------- Célébration : rayons qui tournent, confettis, une étoile qui rebondit (le jeu se met en pause) ----------
  const fileFetes = [];
  let feteEnCours = false, vitesseAvantFete = 1;
  function celebrer(f) {
    fileFetes.push(f);
    if (!feteEnCours) prochaineFete();
  }
  function prochaineFete() {
    const f = fileFetes.shift();
    if (!f) { feteEnCours = false; if (jeu.vitesse === 0) { jeu.vitesse = vitesseAvantFete || 1; majVitesse(); } return; }
    if (!feteEnCours) { vitesseAvantFete = jeu.vitesse; jeu.vitesse = 0; majVitesse(); }
    feteEnCours = true;
    $('fete-genre').textContent = f.genre || ''; $('fete-titre').textContent = f.titre; $('fete-texte').textContent = f.texte || '';
    $('fete-prime').textContent = f.prime ? '+' + fmt(f.prime) : ''; $('fete-prime').hidden = !f.prime;
    const c = $('confettis'); c.innerHTML = '';
    const COULEURS = ['#FFD34A', '#E8584F', '#5FAE2E', '#4FA3E0', '#F28A3A', '#A77BDB', '#FFFFFF'];
    for (let k = 0; k < 46; k++) {
      const i = document.createElement('i');
      i.style.left = Math.random() * 100 + '%'; i.style.background = COULEURS[k % COULEURS.length];
      i.style.animationDelay = (Math.random() * .7) + 's'; i.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      i.style.setProperty('--tourne', (Math.random() * 720 - 360) + 'deg'); i.style.setProperty('--derive', (Math.random() * 120 - 60) + 'px');
      c.appendChild(i);
    }
    $('fete').hidden = false; sons.succes();
  }
  $('fete-ok').onclick = () => { $('fete').hidden = true; sons.clic(); setTimeout(prochaineFete, 180); };
  function finJournee(b) {
    toast(`19 h, le café ferme. ${Math.round(b.clients)} clients servis, ${Math.round(b.perdus)} repartis. Résultat du jour : <b>${montant(b.benefice)}</b>.`, 6500);
  }
  // ---------- Carte de décision ----------
  let decisionAffichee = null;
  function majDecision(e) {
    const d = e.decision;
    $('decision').hidden = !d;
    if (!d) { decisionAffichee = null; return; }
    $('d-temps').textContent = `Sans réponse dans ${Math.ceil(d.reste)} s : « ${d.options[1]} »`;
    if (decisionAffichee === d) return;
    decisionAffichee = d; sons.bulle();
    $('d-txt').textContent = d.texte;
    const z = $('d-boutons'); z.innerHTML = '';
    d.options.forEach((o, k) => { const b = document.createElement('button'); b.className = 'btn ' + (k === 0 ? 'vert' : ''); b.textContent = o;
      b.onclick = () => { const msg = J.choisirDecision(E(), k); if (msg) toast(msg, 5000); sons.clic(); jeu.sauver(); majDecision(E()); }; z.appendChild(b); });
  }
  function ouvrirJournal(o) { if (o) onglet = o; ouvrir('p-travaux'); majTravaux(); }
  return { maj, toast, bulle, pop, parole, humeur, ficheClient, annoncerGazette, afficherGazette, afficherAnnee, celebrer, celebrerNiveau, majCourrier, raconter, fermer, toucherStation, objectifAtteint, finJournee, ouvrirJournal, majVitesse, tutoriel };
}
