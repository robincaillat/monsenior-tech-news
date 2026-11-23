// GET : suis-je connecté ? POST : connexion par mot de passe. DELETE : déconnexion.
import { route, reponse, erreur, lireJson, motDePasseValide, cookieSession, cookieEfface, cookieTemoin, temoinEfface, estConnecte } from './_commun.js';

// Si la session a expiré, on efface aussi le témoin pour masquer les boutons.
export const GET = route(async (requete) => {
  const connecte = estConnecte(requete);
  return reponse({ connecte }, 200, connecte ? {} : { 'set-cookie': temoinEfface() });
}, { connexion: false });

export const POST = route(async (requete) => {
  const corps = await lireJson(requete);
  if (!corps) return erreur('Requête invalide.');
  if (!motDePasseValide(corps.motDePasse)) {
    await new Promise((ok) => setTimeout(ok, 600)); // ralentit les essais en série
    return erreur('Mot de passe incorrect.', 401);
  }
  return reponse({ connecte: true }, 200, { 'set-cookie': [cookieSession(), cookieTemoin()] });
}, { connexion: false });

export const DELETE = route(async () => reponse({ connecte: false }, 200, { 'set-cookie': [cookieEfface(), temoinEfface()] }), { connexion: false });
