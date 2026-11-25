// Chemins des personnages : une grille d'obstacles vue de dessus (murs, comptoir, tables, chaises, étagères…),
// et un calcul de chemin A* qui les contourne, puis un lissage pour marcher en lignes droites naturelles.
// Logique pure (aucune 3D) : testée par node --test.

export class Grille {
  // x0, z0 : coin de la grille ; pas : taille d'une case (en mètres) ; l × h cases
  constructor(x0 = -8, z0 = -6, pas = .2, l = 90, h = 85) {
    Object.assign(this, { x0, z0, pas, l, h });
    this.cases = new Uint8Array(l * h);
  }
  vider() { this.cases.fill(0); }
  dedans(i, j) { return i >= 0 && j >= 0 && i < this.l && j < this.h; }
  ci(x) { return Math.floor((x - this.x0) / this.pas); }
  cj(z) { return Math.floor((z - this.z0) / this.pas); }
  cx(i) { return this.x0 + (i + .5) * this.pas; }
  cz(j) { return this.z0 + (j + .5) * this.pas; }
  // Bloque un rectangle (vu de dessus), élargi de « marge » pour tenir compte de la largeur d'une personne
  bloquer(xmin, xmax, zmin, zmax, marge = .18) {
    const i0 = Math.max(0, this.ci(xmin - marge)), i1 = Math.min(this.l - 1, this.ci(xmax + marge));
    const j0 = Math.max(0, this.cj(zmin - marge)), j1 = Math.min(this.h - 1, this.cj(zmax + marge));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.cases[j * this.l + i] = 1;
  }
  bloquee(i, j) { return !this.dedans(i, j) || this.cases[j * this.l + i] === 1; }
  // Hors de la grille, tout est libre (la rue au loin)
  libre(x, z) { const i = this.ci(x), j = this.cj(z); return !this.dedans(i, j) || this.cases[j * this.l + i] === 0; }

  // Peut-on aller en ligne droite de a à b sans toucher d'obstacle ? (échantillons tous les 8 cm)
  ligneLibre(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / .08));
    for (let k = 1; k < n; k++) { const t = k / n; if (!this.libre(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
    return true;
  }
  // La case libre la plus proche (si on part d'un obstacle, ou si on vise une chaise)
  procheLibre(i, j, rayon = 8) {
    if (!this.bloquee(i, j)) return [i, j];
    let best = null, bd = Infinity;
    for (let r = 1; r <= rayon && !best; r++)
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || this.bloquee(i + di, j + dj)) continue;
        const d = di * di + dj * dj; if (d < bd) { bd = d; best = [i + di, j + dj]; }
      }
    return best;
  }

  // Chemin de (ax, az) à (bx, bz) : liste de points intermédiaires puis l'arrivée. Ligne droite si rien ne gêne.
  chemin(ax, az, bx, bz) {
    if (this.ligneLibre(ax, az, bx, bz)) return [{ x: bx, z: bz }];
    const ai = this.ci(ax), aj = this.cj(az), bi = this.ci(bx), bj = this.cj(bz);
    if (!this.dedans(ai, aj) || !this.dedans(bi, bj)) return [{ x: bx, z: bz }];
    const dep = this.procheLibre(ai, aj), arr = this.procheLibre(bi, bj);
    if (!dep || !arr) return [{ x: bx, z: bz }];
    const brut = this.astar(dep[0], dep[1], arr[0], arr[1]);
    if (!brut) return [{ x: bx, z: bz }];
    // Lissage : depuis chaque point, on saute au point le plus loin visible en ligne droite
    const pts = [{ x: ax, z: az }, ...brut.map(([i, j]) => ({ x: this.cx(i), z: this.cz(j) })), { x: bx, z: bz }];
    const lisse = [];
    let k = 0;
    while (k < pts.length - 1) {
      let s = pts.length - 1;
      while (s > k + 1 && !this.ligneLibre(pts[k].x, pts[k].z, pts[s].x, pts[s].z)) s--;
      lisse.push(pts[s]); k = s;
    }
    return lisse;
  }

  // A* sur 8 voisins (pas de coin coupé entre deux obstacles), avec un tas binaire
  astar(si, sj, gi, gj) {
    const L = this.l, N = L * this.h, depart = sj * L + si, but = gj * L + gi;
    const g = new Float32Array(N).fill(Infinity), parent = new Int32Array(N).fill(-1), ferme = new Uint8Array(N);
    const h = c => { const dx = Math.abs(c % L - gi), dz = Math.abs(((c / L) | 0) - gj); return Math.max(dx, dz) + .414 * Math.min(dx, dz); };
    const tas = [[h(depart), depart]];
    const pousser = n => { tas.push(n); let k = tas.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (tas[p][0] <= tas[k][0]) break; [tas[p], tas[k]] = [tas[k], tas[p]]; k = p; } };
    const tirer = () => { const haut = tas[0], dernier = tas.pop(); if (tas.length) { tas[0] = dernier; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < tas.length && tas[a][0] < tas[m][0]) m = a; if (b < tas.length && tas[b][0] < tas[m][0]) m = b; if (m === k) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } } return haut; };
    g[depart] = 0;
    while (tas.length) {
      const [, c] = tirer();
      if (c === but) break;
      if (ferme[c]) continue; ferme[c] = 1;
      const ci = c % L, cj = (c / L) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (this.bloquee(ni, nj)) continue;
        if (di && dj && (this.bloquee(ci + di, cj) || this.bloquee(ci, cj + dj))) continue;
        const n = nj * L + ni, cout = g[c] + (di && dj ? 1.414 : 1);
        if (cout < g[n]) { g[n] = cout; parent[n] = c; pousser([cout + h(n), n]); }
      }
    }
    if (parent[but] === -1 && but !== depart) return null;
    const route = []; for (let c = but; c !== depart && c !== -1; c = parent[c]) route.push([c % L, (c / L) | 0]);
    return route.reverse();
  }
}
