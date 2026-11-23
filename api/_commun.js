// Outils partagés des fonctions /api (les fichiers préfixés par _ ne sont pas des routes Vercel).
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'qdn_admin';
const DUREE_SESSION = 7 * 24 * 3600; // 7 jours

export function reponse(donnees, statut = 200, entetes = {}) {
  const h = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  for (const [cle, valeur] of Object.entries(entetes)) {
    for (const v of [].concat(valeur)) h.append(cle, v);
  }
  return new Response(JSON.stringify(donnees), { status: statut, headers: h });
}

export function erreur(message, statut = 400) {
  return reponse({ erreur: message }, statut);
}

export function variable(nom) {
  const v = process.env[nom];
  if (!v) throw new ConfigManquante(nom);
  return v;
}

export class ConfigManquante extends Error {
  constructor(nom) { super(`Variable d'environnement manquante : ${nom}`); }
}

// La clé change si le mot de passe change : toutes les sessions tombent.
function cle() {
  return createHash('sha256').update(`${variable('SESSION_SECRET')}:${variable('ADMIN_PASSWORD')}`).digest();
}

function signer(valeur) {
  return createHmac('sha256', cle()).update(valeur).digest();
}

export function motDePasseValide(saisi) {
  const a = createHash('sha256').update(String(saisi ?? '')).digest();
  const b = createHash('sha256').update(variable('ADMIN_PASSWORD')).digest();
  return timingSafeEqual(a, b);
}

export function cookieSession(maintenant = Date.now()) {
  const expiration = String(Math.floor(maintenant / 1000) + DUREE_SESSION);
  const signature = signer(expiration).toString('base64url');
  return `${COOKIE}=${expiration}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DUREE_SESSION}`;
}

export function cookieEfface() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// Témoin lisible par le navigateur : il sert seulement à afficher les boutons de l'équipe tech.
// Il ne donne aucun droit ; chaque action revérifie le cookie de session signé.
export const TEMOIN = 'qdn_tech';
export function cookieTemoin() {
  return `${TEMOIN}=1; Path=/; Secure; SameSite=Strict; Max-Age=${DUREE_SESSION}`;
}
export function temoinEfface() {
  return `${TEMOIN}=; Path=/; Secure; SameSite=Strict; Max-Age=0`;
}

export function estConnecte(requete) {
  const m = (requete.headers.get('cookie') ?? '').match(/(?:^|;\s*)qdn_admin=(\d+)\.([A-Za-z0-9_-]+)/);
  if (!m || Number(m[1]) < Date.now() / 1000) return false;
  const attendu = signer(m[1]);
  const recu = Buffer.from(m[2], 'base64url');
  return recu.length === attendu.length && timingSafeEqual(recu, attendu);
}

// Les requêtes qui modifient quelque chose doivent être en JSON (bloque les formulaires d'autres sites).
export async function lireJson(requete) {
  if (!(requete.headers.get('content-type') ?? '').startsWith('application/json')) return null;
  try { return await requete.json(); } catch { return null; }
}

// Enveloppe chaque route : session obligatoire si demandé, erreurs de config lisibles.
export function route(gestionnaire, { connexion = true } = {}) {
  return async (requete) => {
    try {
      if (connexion && !estConnecte(requete)) return erreur('Connexion requise.', 401);
      return await gestionnaire(requete);
    } catch (e) {
      if (e instanceof ConfigManquante) return erreur(`${e.message}. À régler dans Vercel.`, 500);
      console.error(e);
      return erreur('Erreur inattendue côté serveur.', 500);
    }
  };
}
