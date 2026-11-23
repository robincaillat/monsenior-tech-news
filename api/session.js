// GET : suis-je connecté ? POST : connexion par mot de passe. DELETE : déconnexion.
import { route, reponse, erreur, lireJson, motDePasseValide, cookieSession, cookieEfface, estConnecte } from './_commun.js';

export const GET = route(async (requete) => reponse({ connecte: estConnecte(requete) }), { connexion: false });

export const POST = route(async (requete) => {
  const corps = await lireJson(requete);
  if (!corps) return erreur('Requête invalide.');
  if (!motDePasseValide(corps.motDePasse)) {
    await new Promise((ok) => setTimeout(ok, 600)); // ralentit les essais en série
    return erreur('Mot de passe incorrect.', 401);
  }
  return reponse({ connecte: true }, 200, { 'set-cookie': cookieSession() });
}, { connexion: false });

export const DELETE = route(async () => reponse({ connecte: false }, 200, { 'set-cookie': cookieEfface() }), { connexion: false });
