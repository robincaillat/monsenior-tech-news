// Signe un envoi direct navigateur → Cloudinary (la vidéo ne passe pas par Vercel).
import { createHash } from 'node:crypto';
import { route, reponse, erreur, lireJson, variable } from './_commun.js';

export const DOSSIER = 'quoi-de-neuf';

export function signatureCloudinary(params, secret) {
  const chaine = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return createHash('sha1').update(chaine + secret).digest('hex');
}

export const POST = route(async (requete) => {
  const corps = await lireJson(requete);
  const type = corps?.type;
  if (type !== 'video' && type !== 'raw') return erreur('Type de fichier inconnu.');
  const nuage = variable('CLOUDINARY_CLOUD_NAME');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder: DOSSIER, timestamp };
  return reponse({
    uploadUrl: `https://api.cloudinary.com/v1_1/${nuage}/${type}/upload`,
    apiKey: variable('CLOUDINARY_API_KEY'),
    folder: DOSSIER,
    timestamp,
    signature: signatureCloudinary(params, variable('CLOUDINARY_API_SECRET')),
  });
});
