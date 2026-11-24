// Interface (DOM) : en-tête, étiquettes des stations, panneaux, bulle de mamie, notifications.
import * as J from './game.js';
import { sons, regleSon, sonActif, regleMusique } from './sons.js';
import { STATIONS, GRAINS, G, TRAVAUX, T, SUCCES, HISTOIRE, MOTS_TRAVAUX, DOSES_SAC, DELAI_LIVRAISON, SEUIL_FRANCHISE, VILLES, INFOS_VILLES, HERITAGE, LAIT, AMELIORATIONS, MOMENTS, RENFORTS, TARIFS, MURS, SOLS, STYLES, FORMULES } from './data.js';
const ICONES_MOMENT = { 'Matin': '🌅', 'Midi': '☀️', 'Après-midi': '🌤️', 'Fin de journée': '🌇', 'Nuit': '🌙' };
const heureTexte = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;

export function fmt(n) {
  const neg = n < 0; n = Math.abs(n);
  let s;
  if (n < 1000) s = n.toLocaleString('fr-FR', { minimumFractionDigits: n < 100 ? 2 : 0, maximumFractionDigits: n < 100 ? 2 : 0 }) + ' €';
  else {
    const u = ['K', 'M', 'Md', 'T', 'aa', 'ab', 'ac', 'ad']; let i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    s = n.toLocaleString('fr-FR', { maximumFractionDigits: n < 10 ? 2 : 1 }) + ' ' + u[i] + ' €';
  }
  return (neg ? '−' : '') + s;
}
export const virg = (n, d = 1) => n.toFixed(d).replace('.', ',');
const $ = id => document.getElementById(id);
const PANNEAUX = ['fiche', 'p-stock', 'p-prix', 'p-travaux', 'p-carnet'];

export function creerUI({ jeu, scene }) {
  const E = () => jeu.e;
  let ouvert = null, choisie = null, accUI = 0, accPanneau = 0, revenuLisse = 0, toastT = null, argentAffiche = E().argent;

  // ---------- Bulle de mamie et notifications ----------
  function bulle(texte, { titre = 'Mamie Odette', boutons = [{ label: "D'accord !" }] } = {}) {
    $('bulle-titre').textContent = titre; $('bulle-txt').textContent = texte;
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

  // Bulle de parole d'un habitué, au-dessus de sa tête
  function parole(pos, nom, texte) {
    const [x, y] = scene.projeter(pos);
    const el = document.createElement('div'); el.className = 'parole';
    el.innerHTML = '<b></b><span></span>'; el.querySelector('b').textContent = nom; el.querySelector('span').textContent = texte;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('labels').appendChild(el); setTimeout(() => el.remove(), 3600);
  }

  // ---------- Étiquettes des stations ----------
  const etiquettes = STATIONS.map((s, i) => {
    const el = document.createElement('div'); el.className = 'etiq';
    el.innerHTML = `<span class="auto"></span><span>${s.court}</span><span class="niv"></span>`;
    el.addEventListener('pointerdown', ev => { ev.stopPropagation(); toucherStation(i); });
    $('labels').appendChild(el); return el;
  });

  // ---------- Panneaux ----------
  function ouvrir(id) { PANNEAUX.forEach(p => { $(p).hidden = p !== id; }); ouvert = id; }
  function fermer() { PANNEAUX.forEach(p => { $(p).hidden = true; }); ouvert = null; choisie = null; }
  document.querySelectorAll('[data-fermer]').forEach(b => { b.onclick = fermer; });
  const basculer = (id, maj) => () => { if (ouvert === id) return fermer(); ouvrir(id); maj(); };

  function toucherStation(i) {
    const r = J.toucher(E(), i);
    if (r.type === 'reparation') { pop(scene.ANCRES[i], `Réparation… ${r.reste}`, true); sons.clic(); }
    if (r.type === 'repare') { pop(scene.ANCRES[i], 'Réparé !'); sons.repare(); }
    if (r.type === 'coup') sons.clic();
    choisie = i; ouvrir('fiche'); majFiche();
  }
  $('f-up').onclick = () => { if (choisie != null && J.former(E(), choisie) === 'ok') { scene.pulse(choisie); majFiche(); sons.clic(); } };
  $('f-mgr').onclick = () => {
    const i = choisie; if (i == null) return;
    if (J.engager(E(), i) === 'ok') { scene.pulse(i); majFiche(); sons.achat(); toast(`<b>${STATIONS[i].mgrNom}</b> rejoint l'équipe : « ${STATIONS[i].nom} » tourne à fond, et ${STATIONS[i].mgrNom} ${STATIONS[i].mgrTxt}.`, 5500); }
  };
  $('rush').onclick = () => {
    const e = E();
    // Pendant la recharge, sur CrazyGames : une pub relance le rush tout de suite
    if (e.rushRecharge > 0 && e.rush <= 0 && jeu.plateforme?.pubs && J.ouvert(e)) {
      jeu.plateforme.pubRecompense().then(ok => { if (!ok) return toast('La pub n’a pas pu s’afficher.'); E().rushRecharge = 0; if (J.lancerRush(E()) === 'ok') { sons.succes(); toast('<b>Rush offert !</b> Production ×2 et affluence ×1,5 pendant 30 s.'); } });
      return;
    }
    if (J.lancerRush(e) === 'ok') toast('<b>Rush du matin !</b> Production ×2 et affluence ×1,5 pendant 30 s.');
  };
  $('b-stock').onclick = basculer('p-stock', majStock);
  $('b-prix').onclick = basculer('p-prix', () => { $('x-curseur').value = E().prix; majPrix(); });
  $('b-travaux').onclick = basculer('p-travaux', majTravaux);
  $('b-carnet').onclick = basculer('p-carnet', majCarnet);
  $('x-curseur').oninput = ev => { J.reglerPrix(E(), +ev.target.value); majPrix(); };

  function majFiche() {
    const i = choisie; if (i == null) return;
    const e = E(), s = STATIONS[i], st = e.st[i], b = J.bilan(e);
    $('f-nom').textContent = s.nom;
    const nb = J.nbMachines(e);
    const equip = i === 1 ? J.CATALOGUE_MOULINS[e.moulin].nom.toLowerCase()
      : i === 2 ? (J.machinesInstallees(e).map(m => m.nom).join(', ') || 'aucune machine')
      : i === 3 ? `${J.places(e)} places` : `réserve de ${J.capaciteReserve(e) / DOSES_SAC} sacs`;
    $('f-desc').textContent = (st.manager ? `Manager : ${s.mgrNom}, qui ${s.mgrTxt}.` : s.desc) + ` Équipement : ${equip}.`;
    const facteur = (st.panne ? 0 : (st.manager || st.coup > 0) ? 1 : .5) * (e.rush > 0 ? 2 : 1);
    const suivant = s.base * (st.niv + 1) * J.milestone(st.niv + 1) * J.multEquip(e, i) * J.multGlobal(e) * facteur;
    $('f-niv').textContent = st.niv;
    $('f-debit').innerHTML = `${Math.round(J.debitStation(e, i) * 60)}/min <em>→ ${Math.round(suivant * 60)}</em>`;
    const al = $('f-alerte'); al.className = 'alerte';
    if (st.panne) al.textContent = `EN PANNE ! Touche la station encore ${st.panne.coups} fois${st.manager ? ` (ou attends ${s.mgrNom})` : ''}.`;
    else if (b.goulot.type === 'station' && b.goulot.i === i) al.textContent = "C'est cette station qui ralentit tout le café ! Forme l'équipe ou regarde les Travaux.";
    else if (!st.manager) al.textContent = st.coup > 0 ? `Coup de main en cours : ${Math.ceil(st.coup)} s.` : "Sans manager, elle tourne à 50 %. Touche-la pour l'aider.";
    else { al.textContent = 'Tout roule.'; al.className = 'alerte ok'; }
    const c = J.coutNiveau(e, i);
    $('f-up-cout').textContent = fmt(c); $('f-up').disabled = e.argent < c;
    if (st.manager) { $('f-mgr').disabled = true; $('f-mgr-cout').textContent = 'engagé ✓'; }
    else { $('f-mgr').disabled = e.argent < s.mgr; $('f-mgr-cout').textContent = `${s.mgrNom} · ${fmt(s.mgr)}`; }
  }

  const barres = q => { let h = '<span class="q">'; for (let k = 1; k <= 5; k++) h += `<i class="${q >= k - .25 ? '' : 'v'}"></i>`; return h + '</span>'; };
  // Une commande urgente couvre environ 2 h de ventes (au moins 1 sac), dans la limite de la place et de la caisse
  function urgence(grain) {
    const e = E(), parHeure = J.bilan(e).ventes * 30;
    const place = Math.floor((J.capaciteReserve(e) - J.totalStock(e)) / DOSES_SAC + 1e-6), payable = Math.floor(e.argent / (G[grain].prixSac * 2));
    return Math.max(1, Math.min(Math.ceil(parHeure * 2 / DOSES_SAC), place, payable));
  }
  function majStock() {
    const e = E(), cap = J.capaciteReserve(e), tot = J.totalStock(e), b = J.bilan(e);
    $('s-jauge').style.width = Math.min(100, tot / cap * 100) + '%';
    const reste = b.ventes > 0 ? e.stock[e.maison] / b.ventes : Infinity;
    $('s-desc').textContent = `Réserve : ${virg(tot / DOSES_SAC)} / ${cap / DOSES_SAC} sacs · ${isFinite(reste) ? `${G[e.maison].nom} épuisé dans ${reste > 90 ? Math.round(reste / 60) + ' min' : Math.round(reste) + ' s'}` : 'stock stable'}` + (e.st[0].manager ? ' · Gérard recommande tout seul' : '');
    $('s-liste').innerHTML = GRAINS.map(g => {
      if (!e.debloques.includes(g.id)) return `<div class="ligne verrou"><div class="infos"><h4>${g.nom}</h4><p>Qualité ${barres(g.q)} · se débloque à ${virg(g.rep)} ★</p></div></div>`;
      const enCours = e.commandes.filter(c => c.grain === g.id).reduce((x, c) => x + c.sacs, 0);
      return `<div class="ligne"><div class="infos"><h4>${g.nom}${e.maison === g.id ? '<span class="tag">servi</span>' : ''}</h4>
        <p>Qualité ${barres(g.q)} · ${fmt(g.prixSac)}/sac · ${virg(e.stock[g.id] / DOSES_SAC)} sac${enCours ? ` (+${enCours} en route)` : ''}${e.stock[g.id] > 0 ? ` · <span class="${J.fraicheur(e, g.id) < .9 ? 'rassis' : 'frais'}">fraîcheur ${Math.round(J.fraicheur(e, g.id) * 100)} %</span>` : ''}</p></div>
        <div class="actions">
          ${e.maison === g.id ? '' : `<button class="btn mini vert" data-maison="${g.id}">Servir</button>`}
          ${J.ouvert(e) ? `<button class="btn mini${e.argent < g.prixSac * 2 ? ' off' : ''}" data-cmd="${g.id}">+${urgence(g.id)} urgent</button>`
            : `<button class="btn mini${e.argent < g.prixSac ? ' off' : ''}" data-cmd="${g.id}">+1</button><button class="btn mini${e.argent < g.prixSac ? ' off' : ''}" data-remplir="${g.id}">Plein</button>`}
        </div></div>`;
    }).join('') + (J.a(e, 'buse') ? (() => {
      const enCours = e.commandes.filter(c => c.grain === 'lait').reduce((x, c) => x + c.sacs, 0);
      return `<div class="ligne"><div class="infos"><h4>Lait (au frigo)${e.lait <= 0 ? '<span class="tag" style="background:var(--framboise)">vide</span>' : ''}</h4>
        <p>Pour les cappuccinos · ${fmt(LAIT.prixPack)}/caisse de ${LAIT.doses} · ${Math.round(e.lait)} doses${enCours ? ` (+${enCours} caisses en route)` : ''}</p></div>
        <div class="actions"><button class="btn mini${e.argent < LAIT.prixPack ? ' off' : ''}" data-lait="1">+1</button><button class="btn mini${e.argent < LAIT.prixPack * 10 ? ' off' : ''}" data-lait="10">+10</button></div></div>`;
    })() : '');
  }
  $('s-liste').addEventListener('pointerdown', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const e = E();
    if (b.dataset.maison) { J.choisirGrain(e, b.dataset.maison); toast(`On sert maintenant du <b>${G[e.maison].nom}</b>. Pense à ajuster ton prix !`); }
    if (b.dataset.remplir) {
      const r = J.remplir(e, b.dataset.remplir);
      toast(r === 'place' ? 'La réserve est déjà pleine.' : r === 'argent' ? "Pas assez d'argent pour un seul sac." : r === 'ferme' ? 'Les vraies commandes se passent le soir. En journée : « +1 urgent » (prix ×2).' : `Commande passée : <b>${r} sac${r > 1 ? 's' : ''}</b> de ${G[b.dataset.remplir].nom}, livrés demain à 7 h.`);
    }
    if (b.dataset.lait) {
      const r = J.commanderLait(e, +b.dataset.lait);
      toast(r === 'ok' ? `Commande passée : <b>${b.dataset.lait} caisse${b.dataset.lait > 1 ? 's' : ''} de lait</b>. Livraison dans ${DELAI_LIVRAISON} s.` : "Pas assez d'argent pour le lait.");
      if (r === 'ok') sons.clic();
    }
    if (b.dataset.cmd) {
      const urg = J.ouvert(e), n = urg ? urgence(b.dataset.cmd) : 1, r = urg ? J.commanderUrgence(e, b.dataset.cmd, n) : J.commander(e, b.dataset.cmd, 1);
      toast(r === 'argent' ? "Pas assez d'argent pour cette commande." : r === 'place' ? 'La réserve est pleine : fais des travaux ou forme la livraison.' : urg ? `Urgence : <b>${n} sac${n > 1 ? 's' : ''}</b> de ${G[b.dataset.cmd].nom} au prix fort, livré${n > 1 ? 's' : ''} dans 1 h.` : `Commande passée : <b>1 sac</b> de ${G[b.dataset.cmd].nom}, livré demain à 7 h.`);
    }
    majStock();
  });

  // ---------- Journal du soir : bilan, catalogue, atelier, travaux (en onglets) ----------
  const ONGLETS = [['bilan', 'Bilan'], ['catalogue', 'Catalogue'], ['equipe', 'Planning'], ['atelier', 'Atelier'], ['travaux', 'Travaux']];
  const ICONES_CAT = { 'Déco': '🎨', 'Salle': '🪑', 'Réserve': '📦', 'Bar': '☕', 'Agrandir': '🏗️', 'Équipe': '🎓', 'Confort': '🔥' };
  const ICONES_FOURN = { grossiste: '🏪', artisan: '🔥', importateur: '🚢' };
  let onglet = 'bilan', poste = 0, dernierHtml = '';
  const pct = x => (x >= 0 ? '+' : '−') + Math.round(Math.abs(x) * 100) + ' %';
  // Une jauge : la barre de l'article, un trait pour l'équipement actuel, et l'écart en couleur
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

  function ongletBilan(e, soir) {
    const b = e.bilans.at(-1), c = J.chargesJour(e);
    let h = '';
    if (b) h += `<div class="journal-bilan"><span>Recettes du jour ${b.jour}</span><b>${fmt(b.recettes)}</b><span>Achats</span><b>−${fmt(b.depenses)}</b>
      <span>Loyer</span><b>−${fmt(b.detail.loyer)}</b><span>Salaires</span><b>−${fmt(b.detail.salaires)}</b><span>Entretien</span><b>−${fmt(b.detail.entretien)}</b>${b.detail.renforts ? `<span>Renforts</span><b>−${fmt(b.detail.renforts)}</b>` : ''}${b.detail.formules ? `<span>Mise en place des formules</span><b>−${fmt(b.detail.formules)}</b>` : ''}${b.defi ? `<span>Défi : ${b.defi.texte}</span><b style="color:${b.defi.reussi ? 'var(--sauge-f)' : 'var(--framboise)'}">${b.defi.reussi ? '+' + fmt(b.defi.prime) : 'raté'}</b>` : ''}
      <span class="total">Bénéfice</span><b class="total" style="color:${b.benefice < 0 ? 'var(--framboise)' : 'var(--sauge-f)'}">${fmt(b.benefice)}</b></div>`;
    // Les ventes d'hier heure par heure : la couleur dit ce qui a limité (équipe, clients, stock)
    if (b?.heures) {
      const max = Math.max(1, ...b.heures.map(x => x.ventes));
      h += `<div class="heures"><div class="h-tete"><b>Ventes heure par heure</b><span><i class="st"></i>équipe <i class="cl"></i>clients <i class="sk"></i>stock</span></div><div class="h-barres">` + b.heures.map((x, k) => {
        const lim = x.stock > Math.max(x.station, x.clients) ? 'sk' : x.station >= x.clients ? 'st' : 'cl';
        return `<div title="${7 + k} h : ${Math.round(x.ventes)} tasses"><i class="${lim}" style="height:${Math.max(3, x.ventes / max * 100)}%"></i><small>${7 + k}</small></div>`;
      }).join('') + `</div></div>`;
    }
    // Demain : la météo annoncée, et la boisson du jour à préparer
    const prev = J.CATALOGUE_METEOS[e.meteoDemain] || J.CATALOGUE_METEOS.nuages;
    const aff = prev.demande * (J.a(e, 'terrasse') ? prev.terrasse : 1) - 1;
    h += `<div class="demain"><div class="dm-meteo"><span class="dm-ico">${prev.icone}</span><div><b>Demain : ${prev.nom.toLowerCase()}</b>
      <small>Prévision juste 4 fois sur 5 · affluence ${Math.abs(aff) < .005 ? 'normale' : pct(aff)}${J.a(e, 'terrasse') && prev.terrasse !== 1 ? ' (terrasse comprise)' : ''}</small></div></div>
      <div class="dm-titre">Boisson du jour</div><div class="boissons">` + Object.values(J.CATALOGUE_BOISSONS).map(x => {
        const ef = J.effetBoisson(x.id, prev.id), verrou = e.rep < x.rep, choisie = e.boisson === x.id;
        return `<button class="boisson${choisie ? ' choisie' : ''}${verrou ? ' verrou' : ''}" data-boisson="${x.id}"><span>${x.icone}</span><b>${x.nom}</b>
          <small class="${ef > .005 ? 'vert' : ef < -.005 ? 'rouge' : ''}">${verrou ? `${virg(x.rep)} ★` : x.id === 'aucune' ? 'panier normal' : `${pct(ef)} par client`}</small></button>`;
      }).join('') + `</div></div>`;
    // Commande pour demain : on voit d'un coup d'œil si la réserve tiendra
    const cap = J.capaciteReserve(e) / DOSES_SAC, tot = J.totalStock(e) / DOSES_SAC, hier = b ? b.tasses / DOSES_SAC : 3;
    const g = G[e.maison], place = Math.max(0, Math.floor(cap - tot + 1e-6));
    const prixSac = g.prixSac * J.CATALOGUE_FOURNISSEURS[e.fournisseur].prixMult, n = Math.min(place, Math.floor(e.argent / prixSac));
    const tient = tot / Math.max(1, hier);
    // « Pour demain » : la consommation d'hier + 30 %, moins ce qu'il reste
    const demain = Math.max(0, Math.min(n, Math.ceil(hier * 1.3 - tot)));
    h += `<div class="commande-demain"><div class="cd-tete"><b>Réserve pour demain</b><span>${virg(tot)} / ${cap} sacs</span></div>
      <div class="cd-jauge"><i style="width:${Math.min(100, tot / cap * 100)}%"></i><b style="left:${Math.min(100, hier / cap * 100)}%" title="consommation d’hier"></b></div>
      <p>Hier : ${virg(hier)} sacs vendus · ta réserve tient <b class="${tient < 1.1 ? 'rouge' : 'vert'}">${tient >= 10 ? 'plus de 10' : virg(tient)} jour${tient >= 2 ? 's' : ''}</b>${e.st[0].manager ? ' · Gérard commande tout seul' : ''}</p>
      <p>Fraîcheur du ${g.court} : <b class="${J.fraicheur(e, g.id) < .9 ? 'rouge' : 'vert'}">${Math.round(J.fraicheur(e, g.id) * 100)} %</b> (stock de ${virg(e.age[g.id] || 0)} j). Un grain garde son goût 2 jours, puis perd 7 % par jour${J.a(e, 'entrepot') ? ' (2 fois moins vite dans la cave)' : ''} : ne commande pas trop d’avance.</p>
      ${soir && !e.st[0].manager ? `<div class="cd-boutons"><button class="btn vert${demain < 1 ? ' off' : ''}" data-plein="${g.id}:${demain}">Pour demain<small>${demain} sac${demain > 1 ? 's' : ''} · ${fmt(demain * prixSac)}</small></button>`
        + `<button class="btn${n < 1 ? ' off' : ''}" data-plein="${g.id}:${n}">Plein<small>${n} sac${n > 1 ? 's' : ''} · ${fmt(n * prixSac)}</small></button></div><p class="cd-grain">${g.nom} · ${fmt(prixSac)} le sac (change de grain dans la Réserve)</p>` : ''}</div>`;
    h += `<p class="fait" style="color:var(--cafe-doux)">Charges de demain : environ ${fmt(c.total)} (loyer ${fmt(c.loyer)}, salaires ${fmt(c.salaires)}, entretien ${fmt(c.entretien)}${c.renforts ? `, renforts ${fmt(c.renforts)}` : ''}${c.formules ? `, formules ${fmt(c.formules)}` : ''})</p>`;
    return h;
  }

  function ongletCatalogue(e, soir) {
    const MS = Object.values(J.CATALOGUE_MACHINES), MOS = Object.values(J.CATALOGUE_MOULINS), FS = Object.values(J.CATALOGUE_FOURNISSEURS);
    const max = k => Math.max(...MS.map(m => m[k])), maxM = k => Math.max(...MOS.map(m => m[k]));
    poste = Math.min(poste, J.nbPostes(e) - 1);
    let h = `<div class="section-titre">Machines</div><div class="postes">` + Array.from({ length: J.nbPostes(e) }, (_, p) => {
      const id = e.machines[p];
      return `<button class="poste${p === poste ? ' choisi' : ''}" data-poste="${p}">${id ? `<img src="${scene.vignette(J.CATALOGUE_MACHINES[id].visuel, J.CATALOGUE_MACHINES[id].teinte)}" alt="">` : '<span>＋</span>'}<small>Poste ${p + 1}</small></button>`;
    }).join('') + `</div>`;
    const cur = e.machines[poste] ? J.CATALOGUE_MACHINES[e.machines[poste]] : null;
    h += `<p class="legende">Les barres comparent avec ${cur ? `la ${cur.nom}` : 'un poste vide'} (le trait). <span class="mieux">vert</span> = mieux, <span class="moins">rouge</span> = moins bien.</p>`;
    h += MS.filter(m => m.prix > 0 || m.id === cur?.id).map(m => {
      const installe = cur?.id === m.id, verrou = e.rep < (m.rep || 0), net = m.prix - (cur ? cur.prix * .25 : 0);
      const jauges = jauge('Vitesse', m.vitesse, max('vitesse'), cur?.vitesse) + jauge('Goût', m.qualite, max('qualite'), cur?.qualite) + jauge('Fiabilité', m.fiabilite, max('fiabilite'), cur?.fiabilite);
      const bouton = installe ? '<span class="tag-gros">installée</span>' : verrou ? `<span class="tag-gros verrou">${virg(m.rep)} ★</span>`
        : btnPrix(net, `data-machine="${poste}:${m.id}"`, e, soir);
      return carte({ img: scene.vignette(m.visuel, m.teinte), nom: m.nom, desc: m.desc + (m.buse ? ' <b>Buse à lait.</b>' : '') + (!installe && cur && !verrou ? ` <i>Reprise de l’ancienne : ${fmt(cur.prix * .25)}.</i>` : ''),
        jauges, bouton, cls: installe ? 'actuelle' : verrou ? 'verrou' : '' });
    }).join('');
    const mo = J.CATALOGUE_MOULINS[e.moulin];
    h += `<div class="section-titre">Moulin</div>` + MOS.filter(m => m.prix > 0 || m.id === e.moulin).map(m => {
      const installe = m.id === e.moulin, verrou = e.rep < (m.rep || 0), net = m.prix - mo.prix * .25;
      const jauges = jauge('Vitesse', m.vitesse, maxM('vitesse'), mo.vitesse) + jauge('Goût', m.qualite, maxM('qualite'), mo.qualite) + jauge('Fiabilité', m.fiabilite, maxM('fiabilite'), mo.fiabilite);
      const bouton = installe ? '<span class="tag-gros">installé</span>' : verrou ? `<span class="tag-gros verrou">${virg(m.rep)} ★</span>` : btnPrix(net, `data-moulin="${m.id}"`, e, soir);
      return carte({ img: scene.vignette(m.visuel, m.teinte), nom: m.nom, desc: m.desc, jauges, bouton, cls: installe ? 'actuelle' : verrou ? 'verrou' : '' });
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

  function ongletAtelier(e, soir) {
    let h = `<div class="section-titre">Entretien des machines</div><p class="legende">Le calcaire s’accumule chaque jour : jusqu’à −20 % de goût et des pannes plus fréquentes. ${e.st[2].manager ? 'Lucas détartre tout seul au-delà de 50 % (20 % plus cher).' : 'Engage Lucas au bar pour qu’il s’en occupe.'}</p>`;
    e.machines.forEach((id, p) => {
      if (!id) return;
      const m = J.CATALOGUE_MACHINES[id], c = e.calcaire[p] || 0;
      const bouton = c <= 0 ? '<span class="tag-gros">propre</span>' : btnPrix(J.coutDetartrage(e, p), `data-detartrer="${p}"`, e, soir, `Détartrer · ${fmt(J.coutDetartrage(e, p))}`);
      h += carte({ img: scene.vignette(m.visuel, m.teinte), nom: `Poste ${p + 1} · ${m.nom}`, desc: `Calcaire : <b class="${c >= .5 ? 'rouge' : ''}">${Math.round(c * 100)} %</b> · goût −${Math.round(c * 20)} %`,
        jauges: `<div class="calcaire"><i style="width:${c * 100}%"></i></div>`, bouton });
    });
    h += `<div class="section-titre">Le carnet de grand-père</div><p class="legende">Des réglages qui se montent niveau par niveau. Chaque niveau coûte plus cher.</p>`;
    h += AMELIORATIONS.map(x => {
      const n = J.niv(e, x.id), ouverte = J.ameliorationOuverte(e, x.id), c = J.coutAmelioration(e, x.id), fini = n >= x.max;
      let pips = '<span class="pips">'; for (let k = 0; k < x.max; k++) pips += `<i class="${k < n ? 'on' : ''}"></i>`; pips += '</span>';
      const effet = `<span class="effet">${x.unite[0].toUpperCase() + x.unite.slice(1)} : <b>${pct(x.effet * n)}</b>${fini ? '' : ` → <b class="vert">${pct(x.effet * (n + 1))}</b>`}</span>`;
      const bouton = fini ? '<span class="tag-gros">max</span>' : !ouverte ? `<span class="tag-gros verrou">${virg(x.rep)} ★</span>` : btnPrix(c, `data-amelio="${x.id}"`, e, soir);
      return carte({ icone: x.icone, nom: x.nom, tags: `<span class="tag">niv ${n}</span>`, desc: x.desc + ' ' + effet, jauges: pips, bouton, cls: !ouverte ? 'verrou' : '' });
    }).join('');
    return h;
  }

  // Formule du moment : un interrupteur, son effet, et un conseil tiré des chiffres d'hier
  function ligneFormule(e, k, soir, stats) {
    const f = FORMULES.find(x => x.moment === k); if (!f) return '';
    const ouverte = J.formuleOuverte(e, f), actif = !!e.formules[f.id] && ouverte;
    const besoin = (f.req || []).filter(r => !J.a(e, r)).map(r => T[r].nom.toLowerCase());
    const conseil = stats && stats.t ? (stats.clients / stats.t > .4 ? ' · la salle attendait du monde : bonne idée' : stats.station / stats.t > .5 ? ' · l’équipe était déjà débordée' : '') : '';
    return `<div class="formule${actif ? ' active' : ''}${ouverte ? '' : ' verrou'}"><span>${f.icone}</span><div><b>${f.nom}</b>
      <small>${ouverte ? `+${Math.round(f.demande * 100)} % de clients, panier ${pct(f.panier - f.cout)} (ingrédients déduits), mise en place ${fmt(J.coutMiseEnPlace(e))}/jour${conseil}`
        : `Il faut : ${besoin.join(', ') || `${virg(f.rep)} ★`}`}</small></div>
      ${ouverte ? `<button class="btn mini${actif ? ' vert' : ''}${soir ? '' : ' off'}" data-formule="${f.id}:${actif ? 0 : 1}">${actif ? 'Active' : 'Activer'}</button>` : ''}</div>`;
  }
  // Onglet Équipe : ce qui a limité les ventes hier, moment par moment, et le planning des renforts pour demain
  const ICONES_MOMENTS = ['🌅', '☀️', '🌤️', '🌇'];
  function ongletEquipe(e, soir) {
    const hier = e.bilans.at(-1), cout = J.coutRenfort(e);
    let h = `<p class="legende">Un renfort ajoute <b>+30 %</b> de débit à toutes les stations pendant un moment de la journée, pour <b>${fmt(cout)}</b> (payé le soir). Il sert quand c’est l’équipe qui bloque, pas quand il manque des clients. Le <b>tarif</b> du moment ajuste ton prix de base (${fmt(e.prix)}) : plus cher au rush, moins cher au creux.</p>`;
    h += `<div class="legende-barres"><span><i class="st"></i>équipe</span><span><i class="cl"></i>clients</span><span><i class="sk"></i>stock</span></div>`;
    h += MOMENTS.map((m, k) => {
      const s = hier?.moments?.[k], t = s?.t || 0, n = e.renforts[k] || 0;
      const p = x => t ? Math.round(x / t * 100) : 0;
      let conseil = 'Pas encore de chiffres : attends la fin d’une journée.';
      if (t) {
        const station = s.station / t, pire = s.stations.indexOf(Math.max(...s.stations));
        conseil = s.stock / t > .2 ? '<b class="rouge">Rupture de stock</b> : commande plus de grains avant tout.'
          : station > .5 ? `<b class="vert">L’équipe bloque</b> (surtout ${STATIONS[pire].court.toLowerCase()}) : un renfort ferait vendre plus.`
          : station > .2 ? 'L’équipe bloque parfois : un renfort peut se rentabiliser.'
          : 'Ce sont les clients qui manquent : un renfort ne servirait à rien.';
      }
      // Conseil de tarif : on monte quand on refuse du monde, on baisse quand la salle est vide
      const tf = e.tarifs[k] ?? 1;
      const conseilTarif = !t ? '' : s.station / t > .5 ? 'Tu refuses du monde : tu peux monter le tarif.' : s.clients / t > .7 ? 'La salle attend des clients : un tarif plus bas en attirerait.' : '';
      let pions = ''; for (let j = 0; j < RENFORTS.max; j++) pions += `<i class="${j < n ? 'on' : ''}">👤</i>`;
      return `<div class="carte-cat moment-carte"><span class="vig ico">${ICONES_MOMENTS[k]}</span><div class="cc">
        <h4>${m.nom} <span class="tag cat">${m.de} h – ${m.a} h</span></h4>
        ${t ? `<div class="barre-moment"><i class="st" style="width:${p(s.station)}%"></i><i class="cl" style="width:${p(s.clients)}%"></i><i class="sk" style="width:${p(s.stock)}%"></i></div>
        <p>Hier : <b>${Math.round(s.ventes).toLocaleString('fr-FR')}</b> tasses · ${conseil}</p>` : `<p>${conseil}</p>`}
        <div class="renfort"><button class="btn mini${!soir || n <= 0 ? ' off' : ''}" data-renfort="${k}:${n - 1}">−</button><span class="pions">${pions}</span>
        <button class="btn mini vert${!soir || n >= RENFORTS.max ? ' off' : ''}" data-renfort="${k}:${n + 1}">+</button><small>${n ? `${fmt(n * cout)} demain` : soir ? 'aucun renfort' : 'le soir'}</small></div>
        <div class="renfort tarif"><button class="btn mini${tf <= TARIFS.min ? ' off' : ''}" data-tarif="${k}:${tf - TARIFS.pas}">−</button>
          <span class="tarif-val ${tf > 1 ? 'haut' : tf < 1 ? 'bas' : ''}">${tf === 1 ? 'tarif normal' : `${tf > 1 ? '+' : '−'}${Math.round(Math.abs(tf - 1) * 100)} %`}</span>
          <button class="btn mini${tf >= TARIFS.max ? ' off' : ''}" data-tarif="${k}:${tf + TARIFS.pas}">+</button><small>${fmt(e.prix * tf)} la tasse${conseilTarif ? ` · ${conseilTarif}` : ''}</small></div>
        ${ligneFormule(e, k, soir, t ? s : null)}
      </div></div>`;
    }).join('');
    const total = e.renforts.reduce((x, y) => x + y, 0);
    h += `<p class="fait" style="color:var(--cafe-doux)">Total des renforts demain : <b>${fmt(total * cout)}</b>${hier ? ` (hier, les recettes étaient de ${fmt(hier.recettes)})` : ''}</p>`;
    return h;
  }

  // Décoration au choix : murs et sol, avec un aperçu de chaque motif et l'harmonie des styles
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
    if (!J.a(e, 'peinture')) return `<div class="section-titre">Décoration</div><p class="legende">Fais d’abord le coup de peinture : ensuite, tu choisiras la couleur des murs et le sol.</p>`;
    const mur = J.murActuel(e), sol = J.solActuel(e), ok = J.harmonie(e);
    const choix = (type, liste, actuel) => `<div class="deco-choix">` + liste.map(x => {
      const verrou = e.rep < (x.rep || 0), p = J.prixDeco(e, x);
      return `<button class="deco${x.id === actuel.id ? ' choisie' : ''}${verrou ? ' verrou' : ''}" data-deco="${type}:${x.id}" title="${x.nom}">
        <i style="background:${apercuDeco(x, type)}"></i><b>${x.nom}</b><small>${verrou ? `${virg(x.rep)} ★` : x.id === actuel.id ? 'posé' : p ? fmt(p) : 'gratuit'} · ${STYLES[x.style]}</small></button>`;
    }).join('') + `</div>`;
    return `<div class="section-titre">Décoration</div>
      <div class="harmonie ${ok ? 'oui' : ''}">${ok ? `✨ <b>Harmonie ${STYLES[mur.style].toLowerCase()}</b> : +0,15 ★ et +4 % de clients` : `Murs <b>${STYLES[mur.style].toLowerCase()}</b>, sol <b>${STYLES[sol.style].toLowerCase()}</b> : choisis le même style pour l’harmonie (+0,15 ★, +4 % de clients).`}</div>
      <div class="dm-titre">Murs</div>${choix('mur', MURS, mur)}<div class="dm-titre">Sol</div>${choix('sol', SOLS, sol)}${soir ? '' : '<p class="legende">Les changements de déco se font le soir.</p>'}
      <div class="section-titre">Travaux</div>`;
  }

  function ongletTravaux(e, soir) {
    const deco = sectionDeco(e, soir);
    const dispo = TRAVAUX.filter(t => J.disponible(e, t)).sort((x, y) => x.prix - y.prix);
    const faits = TRAVAUX.filter(t => J.a(e, t.id)), bloques = TRAVAUX.length - dispo.length - faits.length;
    return deco + dispo.map(t => carte({ icone: ICONES_CAT[t.cat], nom: t.nom, tags: `<span class="tag cat">${t.cat}</span>`, desc: t.desc, bouton: btnPrix(t.prix, `data-achat="${t.id}"`, e, soir) })).join('')
      + (bloques ? `<p class="fait" style="color:var(--cafe-doux)">Encore ${bloques} travaux à débloquer plus tard…</p>` : '')
      + `<div class="progres-travaux"><span>${faits.length} / ${TRAVAUX.length} travaux faits</span><div class="jauge"><span style="width:${faits.length / TRAVAUX.length * 100}%"></span></div></div>`
      + (!dispo.length && !bloques ? '<p class="fait">Le café est complet ! Regarde le carnet pour ouvrir une franchise.</p>' : '');
  }

  // Combien d'achats sont possibles dans chaque onglet (petite pastille)
  function nbAchetables(e) {
    const cur = e.machines[poste] ? J.CATALOGUE_MACHINES[e.machines[poste]] : null;
    return {
      catalogue: Object.values(J.CATALOGUE_MACHINES).filter(m => m.prix > 0 && e.rep >= (m.rep || 0) && !e.machines.includes(m.id) && e.argent >= m.prix - (cur ? cur.prix * .25 : 0)).length,
      atelier: AMELIORATIONS.filter(x => J.ameliorationOuverte(e, x.id) && J.niv(e, x.id) < x.max && e.argent >= J.coutAmelioration(e, x.id)).length,
      travaux: TRAVAUX.filter(t => J.disponible(e, t) && e.argent >= t.prix).length,
    };
  }

  function majTravaux() {
    const e = E(), soir = !J.ouvert(e);
    $('t-desc').textContent = soir ? `Le café est fermé. Réouverture automatique dans ${Math.max(0, Math.ceil(e.nuitReste))} s.`
      : `Le café est ouvert (${heureTexte(e.horloge)}). Tu peux tout regarder ; les achats se font le soir, après 19 h.`;
    const nb = soir ? nbAchetables(e) : {};
    let h = `<div class="onglets">` + ONGLETS.map(([id, nom]) => `<button class="onglet${id === onglet ? ' choisi' : ''}" data-onglet="${id}">${nom}${nb[id] ? `<span class="pastille">${nb[id]}</span>` : ''}</button>`).join('') + `</div>`;
    if (soir) h += `<button class="btn vert" data-ouvrir style="width:100%;margin:2px 0 8px">Ouvrir le café maintenant (7 h)</button>`;
    h += onglet === 'catalogue' ? ongletCatalogue(e, soir) : onglet === 'equipe' ? ongletEquipe(e, soir) : onglet === 'atelier' ? ongletAtelier(e, soir) : onglet === 'travaux' ? ongletTravaux(e, soir) : ongletBilan(e, soir);
    if (h !== dernierHtml) { dernierHtml = h; $('t-liste').innerHTML = h; }
  }
  $('t-liste').addEventListener('pointerdown', ev => {
    const e = E(), bt = ev.target.closest('button'); if (!bt || bt.classList.contains('off')) return;
    const res = r => { if (r === 'argent') toast("Pas encore assez d'argent."); if (r === 'ferme') toast('Les achats se font le soir, après 19 h.'); if (r === 'ok') { scene.majDecor(e); sons.achat(); jeu.sauver(); } return r; };
    if (bt.dataset.onglet) { onglet = bt.dataset.onglet; sons.clic(); majTravaux(); $('p-travaux').scrollTop = 0; return; }
    if (bt.dataset.deco) {
      const [type, id] = bt.dataset.deco.split(':'), r = J.choisirDeco(e, type, id);
      if (r === 'ok') { scene.majDecor(e); sons.achat(); jeu.sauver(); toast(J.harmonie(e) ? '✨ <b>Harmonie !</b> Les murs et le sol vont parfaitement ensemble.' : `Nouvelle déco : <b>${(type === 'mur' ? J.CATALOGUE_MURS : J.CATALOGUE_SOLS)[id].nom}</b>.`); }
      else if (r === 'argent') toast("Pas encore assez d'argent."); else if (r === 'verrou') toast('Il faut plus de réputation pour cette déco.'); else if (r === 'ferme') toast('Les travaux de déco se font le soir.');
      majTravaux(); return;
    }
    if (bt.dataset.boisson) { const r = J.choisirBoisson(e, bt.dataset.boisson); if (r === 'ok') { sons.clic(); jeu.sauver(); } else if (r === 'verrou') toast('Il faut plus de réputation pour cette boisson.'); else if (r === 'ferme') toast('La boisson du jour se prépare le soir.'); majTravaux(); return; }
    if (bt.dataset.formule) { const [id, v] = bt.dataset.formule.split(':'), r = J.reglerFormule(e, id, v === '1'); if (r === 'ok') { sons.clic(); jeu.sauver(); } else if (r === 'ferme') toast('Les formules se préparent le soir.'); majTravaux(); return; }
    if (bt.dataset.tarif) { const [k, v] = bt.dataset.tarif.split(':').map(Number); if (J.reglerTarif(e, k, v) === 'ok') { sons.clic(); jeu.sauver(); } majTravaux(); return; }
    if (bt.dataset.detartrer) { const p = +bt.dataset.detartrer, r = res(J.detartrer(e, p)); if (r === 'ok') toast(`Machine du poste ${p + 1} détartrée : elle retrouve tout son goût.`); majTravaux(); return; }
    if (bt.dataset.renfort) { const [k, n] = bt.dataset.renfort.split(':').map(Number); if (res(J.reglerRenfort(e, k, n)) === 'ok') sons.clic(); majTravaux(); return; }
    if (bt.dataset.poste) { poste = +bt.dataset.poste; sons.clic(); majTravaux(); return; }
    if ('ouvrir' in bt.dataset) { const arr = J.ouvrir(e); jeu.arrivees?.(arr); fermer(); return; }
    if (bt.dataset.plein) { const [g, n] = bt.dataset.plein.split(':'), r = J.remplir(e, g, false, +n); if (typeof r === 'number') { sons.clic(); toast(`Commande passée : <b>${r} sac${r > 1 ? 's' : ''}</b> de ${G[g].nom}, livrés demain à 7 h.`); jeu.sauver(); } majTravaux(); return; }
    if (bt.dataset.machine) { const [p, id] = bt.dataset.machine.split(':'); if (res(J.acheterMachine(e, +p, id)) === 'ok') toast(`<b>${J.CATALOGUE_MACHINES[id].nom}</b> installée au poste ${+p + 1}.`); majTravaux(); return; }
    if (bt.dataset.moulin) { if (res(J.acheterMoulin(e, bt.dataset.moulin)) === 'ok') toast(`<b>${J.CATALOGUE_MOULINS[bt.dataset.moulin].nom}</b> installé.`); majTravaux(); return; }
    if (bt.dataset.fourn) { J.choisirFournisseur(e, bt.dataset.fourn); sons.clic(); toast(`Fournisseur : <b>${J.CATALOGUE_FOURNISSEURS[bt.dataset.fourn].nom}</b>.`); majTravaux(); return; }
    if (bt.dataset.amelio) { const x = AMELIORATIONS.find(y => y.id === bt.dataset.amelio); if (res(J.ameliorer(e, x.id)) === 'ok') toast(`<b>${x.nom}</b> : niveau ${J.niv(e, x.id)}.`); majTravaux(); return; }
    if (bt.dataset.achat) {
      const id = bt.dataset.achat;
      if (res(J.acheter(e, id)) === 'ok') toast(`<b>${T[id].nom}</b> : ${MOTS_TRAVAUX[id] || "c'est fait !"}`, 5000);
      majTravaux();
    }
  });

  function majPrix() {
    const e = E(), pj = J.prixJuste(e), r = J.prixEffectif(e) / pj, b = J.bilan(e);
    const tf = J.ouvert(e) ? e.tarifs[J.momentIndex(e)] : 1;
    $('x-prix').innerHTML = fmt(e.prix) + (tf !== 1 ? ` <small class="tarif-moment">${J.momentActuel(e).nom.toLowerCase()} : ${fmt(J.prixEffectif(e))}</small>` : '');
    $('x-juste').textContent = `prix juste ${fmt(pj)}`;
    $('x-clients').textContent = `${Math.round(b.demande * 60)}/min`;
    $('x-marge').innerHTML = `${fmt(e.prix - J.coutTasse(e))} <em>grain ${fmt(J.coutTasse(e))}</em>`;
    const av = $('x-avis');
    if (r > 1.1) { av.className = 'alerte'; av.textContent = `Trop cher (+${Math.round((r - 1) * 100)} %) : les clients fuient et la réputation baisse.`; }
    else if (r < .8) { av.className = 'alerte'; av.textContent = 'Très bon marché : beaucoup de clients, mais peu de marge.'; }
    else { av.className = 'alerte ok'; av.textContent = b.chaine < b.demande ? 'Ta production ne suit pas la demande : tu peux monter un peu le prix.' : 'Bon équilibre entre affluence et marge.'; }
  }

  let villeChoisie = null;
  $('p-carnet').addEventListener('pointerdown', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.ville) { villeChoisie = +b.dataset.ville; sons.clic(); majCarnet(); }
    if (b.dataset.heritage) { const r = J.acheterHeritage(E(), b.dataset.heritage); if (r === 'ok') { sons.achat(); jeu.sauver(); toast('Héritage amélioré !'); } else if (r === 'etoiles') toast('Pas assez d’étoiles de franchise.'); majCarnet(); }
  });
  function majCarnet() {
    const e = E(), m = e.meta;
    $('c-desc').textContent = `${m.franchises ? `${m.franchises} franchise${m.franchises > 1 ? 's' : ''} · ${m.etoilesF} étoile${m.etoilesF > 1 ? 's' : ''} de franchise (+${m.etoilesF * 10} %) · ` : ''}${Math.round(m.tasses).toLocaleString('fr-FR')} tasses servies en tout`;
    // Ta note : d'où elle vient, morceau par morceau
    const cr = J.cibleReputation(e), P = cr.parts;
    const barre = (nom, v, max, aide) => `<div class="nd"><span>${nom}</span><span class="nd-barre"><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%"></i></span><b>${virg(v, 2)}</b><small>${aide}</small></div>`;
    $('c-note').innerHTML = `<p>Note actuelle <b>${virg(e.rep, 2)} ★</b> · elle tend vers <b>${virg(cr.total, 2)} ★</b>${cr.total > e.rep + .02 ? ' ↗' : cr.total < e.rep - .02 ? ' ↘' : ''}</p>`
      + barre('Goût', P.gout, 2.2, 'grain, machines, moulin, fraîcheur') + barre('Service', P.service, .8, `${Math.round((e.service ?? 1) * 100)} % des clients servis sans attendre`)
      + barre('Déco', P.deco, 1, 'travaux de déco, harmonie') + barre('Équipe', P.equipe, .32, 'managers engagés')
      + (P.prix < 0 ? `<p class="nd-malus">Prix trop élevé : ${virg(P.prix, 2)} ★</p>` : '') + (P.incidents < 0 ? `<p class="nd-malus">Pannes ou rupture en cours : ${virg(P.incidents, 2)} ★</p>` : '');
    // Franchise : choisir la ville du prochain café
    const ICONES_VILLES = { Lyon: '⛪', Bordeaux: '🍷', Lille: '🌧️', Marseille: '⛵', Nantes: '🏰', Toulouse: '🌸', Strasbourg: '❄️', Paris: '🗼' };
    if (villeChoisie == null || villeChoisie === m.ville) villeChoisie = (m.ville + 1) % VILLES.length;
    const villes = VILLES.map((v, k) => { const I = INFOS_VILLES[v], ici = k === m.ville, deja = (m.reseau || []).some(r => r.ville === v);
      return `<button class="ville${k === villeChoisie ? ' choisie' : ''}${ici ? ' ici' : ''}" data-ville="${k}" ${ici ? 'disabled' : ''}><span>${ICONES_VILLES[v]}</span><b>${v}${ici ? ' (ici)' : deja ? ' ✓' : ''}</b>
        <small>${I.desc}</small><em>loyer ×${virg(I.loyer, 2)} · clients ×${virg(I.demande, 2)} · prix ×${virg(I.prix, 2)}</em></button>`; }).join('');
    if (J.peutFranchiser(e)) {
      const gain = J.etoilesFranchise(e), dest = VILLES[villeChoisie];
      $('c-franchise').innerHTML = `<p><b>Le Petit Grain peut s’agrandir !</b> Ce café continue sans toi et tu repars de zéro ailleurs, avec <b>+${gain} étoile${gain > 1 ? 's' : ''} de franchise</b> (+10 % chacune, pour toujours, et à dépenser dans l’Héritage). Choisis la ville :</p><div class="villes">${villes}</div><button class="btn rouge" id="c-franchiser" style="width:100%;margin-top:8px">Ouvrir un Petit Grain à ${dest}</button>`;
      $('c-franchiser').onclick = () => bulle(`Tu vas laisser le café de ${J.nomVille(e)} et repartir de zéro à ${dest}, avec +${gain} étoile${gain > 1 ? 's' : ''} de franchise. ${INFOS_VILLES[dest].desc} On y va ?`, {
        titre: 'Franchiser ?', boutons: [{ label: 'Pas encore', cls: 'vert' }, { label: 'On y va !', cls: 'rouge', fn: () => jeu.franchiser(villeChoisie) }] });
    } else {
      const p = Math.min(1, e.totalRun / SEUIL_FRANCHISE);
      $('c-franchise').innerHTML = `<p>Quand ce café aura gagné ${fmt(SEUIL_FRANCHISE)}, tu pourras ouvrir un Petit Grain dans une autre ville, chacune avec son caractère. (${fmt(e.totalRun)} gagnés ici)</p><div class="jauge"><span style="width:${p * 100}%"></span></div><div class="villes apercu">${villes}</div>`;
    }
    // Héritage : bonus permanents achetés avec les étoiles de franchise
    $('c-heritage-bloc').hidden = !m.etoilesF;
    $('c-etoiles').textContent = `${J.etoilesDispo(m)} étoile${J.etoilesDispo(m) > 1 ? 's' : ''} à dépenser`;
    $('c-heritage').innerHTML = HERITAGE.map(x => { const n = m.heritage?.[x.id] || 0, fini = n >= x.max, c = J.coutHeritage(m, x.id);
      let pips = '<span class="pips">'; for (let k = 0; k < x.max; k++) pips += `<i class="${k < n ? 'on' : ''}"></i>`; pips += '</span>';
      return `<div class="carte-cat"><span class="vig ico">${x.icone}</span><div class="cc"><h4>${x.nom}</h4><p>${x.desc}${x.depart ? ' <i>(au prochain café)</i>' : ''}</p>${pips}</div>
        <div class="cc-act">${fini ? '<span class="tag-gros">max</span>' : `<button class="btn mini${J.etoilesDispo(m) < c ? ' off' : ''}" data-heritage="${x.id}">✦ ${c}</button>`}</div></div>`; }).join('');
    // Le réseau : les cafés déjà ouverts
    $('c-reseau-bloc').hidden = !(m.reseau || []).length;
    $('c-reseau').innerHTML = (m.reseau || []).map(r => `<div><b>${ICONES_VILLES[r.ville] || '☕'} ${r.ville}</b><span>${r.jours} jours · ${virg(r.rep)} ★ · ${fmt(r.gagne)} gagnés</span></div>`).join('');
    $('c-bilans').innerHTML = e.bilans.length ? '<span></span><span>Recettes</span><span>Dépenses</span><span>Bénéfice</span>' + [...e.bilans].reverse().map(b => `<b>Jour ${b.jour}</b><span>${fmt(b.recettes)}</span><span>${fmt(b.depenses)}</span><span class="${b.benefice < 0 ? 'neg' : 'pos'}">${fmt(b.benefice)}</span>`).join('') : '<span style="grid-column:1/-1">La première journée n’est pas finie (une journée dure 4 minutes).</span>';
    const jours = e.bilans.slice(-7), max = Math.max(1, ...jours.map(b => Math.abs(b.benefice)));
    $('c-graphe').innerHTML = jours.length > 1 ? jours.map(b => `<div class="${b.benefice < 0 ? 'neg' : ''}" style="height:${Math.max(4, Math.abs(b.benefice) / max * 100)}%" title="Jour ${b.jour}"><span>J${b.jour}</span></div>`).join('') : '';
    $('c-nb-succes').textContent = `${m.succes.length}/${SUCCES.length} · +${m.succes.length * 2} % de clients`;
    $('c-succes').innerHTML = SUCCES.map(s => `<div class="${m.succes.includes(s.id) ? 'oui' : 'non'}"><b>${m.succes.includes(s.id) ? '★ ' : ''}${s.nom}</b>${s.desc}</div>`).join('');
    $('c-histoire').innerHTML = HISTOIRE.filter(h => m.histoire.includes(h.id)).map(h => `<button data-h="${h.id}">${h.titre}</button>`).join('') || '<p class="desc">Rien pour l\'instant.</p>';
  }
  $('c-histoire').addEventListener('click', ev => { const b = ev.target.closest('button[data-h]'); if (b) { const h = HISTOIRE.find(x => x.id === b.dataset.h); bulle(h.texte, { titre: h.titre }); } });
  // ---------- Réglages (gardés sur cet appareil) ----------
  const CLE_REGLAGES = 'n15x-reglages';
  // Par défaut, graphismes légers sur les petits appareils (peu de cœurs ou de mémoire)
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
  // Sur iPhone, dans Safari (pas encore installé) : on explique comment l'ajouter à l'écran d'accueil
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  $('c-installer').hidden = !(ios && !navigator.standalone && !matchMedia('(display-mode: standalone)').matches && !window.PLATEFORME);
  appliquerReglages();

  $('c-reset').onclick = () => bulle('Tout effacer et recommencer depuis le tout début ? Tes succès et tes franchises seront perdus.', {
    titre: 'Nouvelle partie ?', boutons: [{ label: 'Non, je garde', cls: 'vert' }, { label: 'Tout effacer', cls: 'rouge', fn: () => jeu.nouvellePartie() }] });

  $('puces').addEventListener('pointerdown', ev => {
    const p = ev.target.closest('.puce'); if (!p) return;
    if ('goulot' in p.dataset) { const g = J.bilan(E()).goulot; if (g.type === 'station') toucherStation(g.i); else if (g.type === 'stock') { ouvrir('p-stock'); majStock(); } else { ouvrir('p-prix'); $('x-curseur').value = E().prix; majPrix(); } }
    if ('stock' in p.dataset) { ouvrir('p-stock'); majStock(); }
    if (p.dataset.panne) toucherStation(+p.dataset.panne);
  });

  // ---------- Guide : fait pulser ce qu'il faut toucher pour l'objectif en cours ----------
  let cibleGuide = null;
  function guider(o, e) {
    let el = null;
    if (o) {
      const id = o.id;
      if (id === 'aider' || id === 'former') el = etiquettes[2];
      else if (id === 'gerard') el = etiquettes[0];
      else if (id === 'equipe') { const i = e.st.findIndex(s => !s.manager); el = i >= 0 ? etiquettes[i] : null; }
      else if (id === 'commande' || id === 'arabica' || id === 'geisha') el = $('b-stock');
      else if (id === 'franchise') el = J.peutFranchiser(e) ? $('b-carnet') : null;
      else if (['peinture', 'machine', 'quatreTables', 'cloison', 'pro', 'terrasse', 'journal', 'atelier5', 'etage'].includes(id)) el = $('b-travaux');
      else if (id === 'reparer') { const i = e.st.findIndex(s => s.panne); el = i >= 0 ? etiquettes[i] : null; }
    }
    if (el === cibleGuide) return;
    cibleGuide?.classList.remove('guide'); cibleGuide = el; el?.classList.add('guide');
  }

  // ---------- Mise à jour à chaque image ----------
  const etoilesTxt = r => { const n = Math.round(r * 2) / 2; let h = ''; for (let k = 1; k <= 5; k++) h += n >= k ? '★' : n >= k - .5 ? '⯪' : '<i>★</i>'; return h + ` <small>${virg(r)}</small>`; };
  function maj(res, dt) {
    const e = E();
    revenuLisse += (res.parSeconde - revenuLisse) * Math.min(1, dt * 2);
    // L'argent défile vers sa vraie valeur (au lieu de sauter d'un coup)
    argentAffiche = Math.abs(e.argent - argentAffiche) < Math.max(.01, Math.abs(e.argent) * .001) ? e.argent : argentAffiche + (e.argent - argentAffiche) * Math.min(1, dt * 7);
    $('argent').textContent = fmt(argentAffiche);
    $('ips').textContent = '+' + fmt(revenuLisse) + '/s';
    const m = J.momentActuel(e);
    $('tasses').innerHTML = J.ouvert(e) ? `${Math.round(res.ventes * 60)} tasses/min${e.rush > 0 ? ' · RUSH' : ''}<br><span class="moment">${J.meteoDuJour(e).icone} ${heureTexte(e.horloge)} · ${m.nom} · jour ${e.jour}${e.boisson !== 'aucune' ? ` · ${J.CATALOGUE_BOISSONS[e.boisson].icone}` : ''}</span>`
      : `Fermé<br><span class="moment">🌙 Nuit · réouverture dans ${Math.max(0, Math.ceil(e.nuitReste))} s</span>`;
    majDecision(e);
    STATIONS.forEach((s, i) => {
      const el = etiquettes[i], [x, y] = scene.projeter(scene.ANCRES[i]), st = e.st[i];
      el.style.left = x + 'px'; el.style.top = y + 'px';
      el.querySelector('.niv').textContent = st.panne ? 'PANNE' : 'niv ' + st.niv;
      el.querySelector('.auto').classList.toggle('on', st.manager || st.coup > 0);
      el.classList.toggle('goulot', res.goulot.type === 'station' && res.goulot.i === i && !st.panne);
      el.classList.toggle('panne', !!st.panne);
    });
    accUI += dt;
    if (accUI > .25) {
      accUI = 0;
      const o = J.objectifActuel(e);
      guider(o, e);
      $('objectif').hidden = !o;
      // Défi du jour, avec sa barre de progression
      const d = e.defi; $('defi').hidden = !d || !J.ouvert(e);
      if (d) {
        const suivi = d.id === 'tasses' || d.id === 'matin';
        $('defi-txt').textContent = d.texte + (suivi && !d.fini ? ` · ${Math.round(d.progres).toLocaleString('fr-FR')}` : '');
        $('defi-barre').style.width = (d.fini ? 100 : suivi ? Math.min(100, d.progres / d.cible * 100) : d.rate ? 0 : 50) + '%';
        $('defi-prime').textContent = d.fini ? 'réussi ✓' : d.rate ? 'raté' : '+' + fmt(d.prime);
        $('defi').className = 'defi' + (d.fini ? ' fini' : d.rate ? ' rate' : '');
      }
      if (o) { $('obj-txt').textContent = o.texte; $('obj-prime').textContent = o.prime ? '+' + fmt(J.primeObjectif(e, o)) : ''; }
      $('nom').textContent = `Le Petit Grain · ${J.nomVille(e)}${e.meta.etoilesF ? ` · ✦${e.meta.etoilesF}` : ''}`;
      $('etoiles').innerHTML = etoilesTxt(e.rep);
      const sacs = e.stock[e.maison] / DOSES_SAC;
      let puces = `<span class="puce rouge" data-goulot>Limité par : ${res.goulot.nom}</span>`;
      puces += `<span class="puce ${sacs < 1 ? 'rouge' : sacs < 2 ? 'miel' : ''}" data-stock>${G[e.maison].court} : ${virg(sacs)} sac${sacs >= 2 ? 's' : ''}${e.commandes.length ? ' · livraison en route' : ''}</span>`;
      const cmax = Math.max(...e.calcaire); if (cmax >= .5) puces += `<span class="puce miel">Calcaire : ${Math.round(cmax * 100)} % (détartre le soir)</span>`;
      if (J.ouvert(e) && (e.service ?? 1) < .75) puces += `<span class="puce rouge" data-goulot>Service lent : ${Math.round((e.service ?? 1) * 100)} % · la note baisse</span>`;
      const fr = J.fraicheur(e, e.maison); if (fr < .9) puces += `<span class="puce miel" data-stock>Grain rassis : −${Math.round((1 - fr) * 100)} % de goût</span>`;
      if (J.a(e, 'buse') && e.lait < LAIT.doses) puces += `<span class="puce ${e.lait <= 0 ? 'rouge' : 'miel'}" data-stock>Lait : ${e.lait <= 0 ? 'vide' : Math.round(e.lait) + ' doses'}</span>`;
      e.evts.forEach(v => { puces += `<span class="puce ${v.id === 'cafemax' ? 'rouge' : 'vert'}">${v.nom} · ${Math.ceil(v.reste)} s</span>`; });
      e.st.forEach((s, i) => { if (s.panne) puces += `<span class="puce rouge" data-panne="${i}">Panne : ${STATIONS[i].court}</span>`; });
      $('puces').innerHTML = puces;
      const rushPub = e.rushRecharge > 0 && e.rush <= 0 && jeu.plateforme?.pubs && J.ouvert(e);
      $('rush').disabled = e.rushRecharge > 0 && !rushPub;
      $('rush-txt').textContent = e.rush > 0 ? `actif · ${Math.ceil(e.rush)} s` : rushPub ? '📺 gratuit' : e.rushRecharge > 0 ? `${Math.ceil(e.rushRecharge)} s` : '×2 · 30 s';
      $('b-prix-txt').textContent = fmt(J.prixEffectif(e));
      $('b-stock-txt').textContent = `${virg(J.totalStock(e) / DOSES_SAC)} sacs`;
      const abordables = TRAVAUX.filter(t => J.disponible(e, t) && e.argent >= t.prix).length;
      $('b-travaux').innerHTML = J.ouvert(e) ? `Journal<small>ce soir</small>` : `Journal<small>ouvert</small><span class="pastille">!</span>`;
      $('b-carnet').innerHTML = `Carnet<small>${e.meta.succes.length} succès</small>${J.peutFranchiser(e) ? '<span class="pastille">!</span>' : ''}`;
      if (ouvert === 'fiche') majFiche();
      if (ouvert === 'p-prix') majPrix();
    }
    accPanneau += dt;
    if (accPanneau > 1) { accPanneau = 0; if (ouvert === 'p-stock') majStock(); if (ouvert === 'p-travaux') majTravaux(); if (ouvert === 'p-carnet') majCarnet(); }
  }

  function objectifAtteint(o) {
    sons.succes();
    toast(`Objectif atteint : <b>${o.texte}</b>${o.prime ? ` · +${fmt(o.prime)}` : ''}`, 4500);
    const el = $('objectif'); el.classList.remove('bravo'); void el.offsetWidth; el.classList.add('bravo');
  }
  function finJournee(b) {
    toast(`19 h, le café ferme. Jour ${b.jour} : ${Math.round(b.tasses).toLocaleString('fr-FR')} cafés, bénéfice <b>${fmt(b.benefice)}</b> (charges ${fmt(b.charges)}). Le journal du soir est ouvert.`, 6500);
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
  return { maj, toast, bulle, pop, parole, fermer, toucherStation, objectifAtteint, finJournee, ouvrirJournal };
}
