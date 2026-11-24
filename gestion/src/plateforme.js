// Plateforme d'accueil du jeu : CrazyGames (SDK v3), itch.io ou simple page web.
// Le jeu ne parle qu'à ce module ; sur itch.io et le web, tout est sans effet (pas de pub).
// La plateforme est fixée par le build (window.PLATEFORME), ou par ?plateforme=crazygames pour tester en local.
import { couper } from './sons.js';

const NOM = window.PLATEFORME || new URLSearchParams(location.search).get('plateforme') || 'web';
let sdk = null;
const essayer = f => { try { return f(); } catch { return undefined; } };

export const plateforme = {
  nom: NOM,
  pubs: false,          // vrai seulement si un SDK de pub répond
  enPub: false,         // le jeu se met en pause pendant une pub
  // À appeler avant tout : charge le SDK s'il existe, sans jamais bloquer le jeu plus de 4 s
  async init() {
    if (NOM !== 'crazygames' || !window.CrazyGames?.SDK) return;
    try {
      await Promise.race([window.CrazyGames.SDK.init(), new Promise((_, non) => setTimeout(() => non(new Error('délai')), 4000))]);
      sdk = window.CrazyGames.SDK;
      this.pubs = sdk.environment !== 'disabled';
    } catch { sdk = null; }
  },
  chargementDebut() { essayer(() => sdk?.game.loadingStart()); },
  chargementFin() { essayer(() => sdk?.game.loadingStop()); },
  jeuDebut() { essayer(() => sdk?.game.gameplayStart()); },
  jeuPause() { essayer(() => sdk?.game.gameplayStop()); },
  // Un beau moment (objectif atteint, franchise…) : CrazyGames s'en sert pour ses animations
  joie() { essayer(() => sdk?.game.happytime()); },
  // Pub récompensée : renvoie true si le joueur l'a regardée jusqu'au bout
  pubRecompense() {
    if (!sdk || !this.pubs) return Promise.resolve(false);
    return new Promise(fini => {
      const fin = ok => { this.enPub = false; couper(document.hidden); this.jeuDebut(); fini(ok); };
      try {
        sdk.ad.requestAd('rewarded', {
          adStarted: () => { this.enPub = true; couper(true); this.jeuPause(); },
          adFinished: () => fin(true),
          adError: () => fin(false),
        });
      } catch { fin(false); }
    });
  },
};
