// POST : attache une vidéo (déjà envoyée sur Cloudinary) à une journée. DELETE : la retire.
import { route, reponse, erreur, lireJson, variable } from './_commun.js';
import { lireDonnees, ecrireDonnees } from './_github.js';
import { validerJournees, DonneesInvalides } from '../src/donnees.js';

function urlCloudinary(url, type) {
  const nuage = variable('CLOUDINARY_CLOUD_NAME');
  return typeof url === 'string' && url.startsWith(`https://res.cloudinary.com/${nuage}/${type}/upload/`);
}

function dateCourte(date) {
  const [, m, j] = date.split('-');
  return `${j}/${m}`;
}

async function modifier(date, video, message) {
  const { sha, donnees } = await lireDonnees();
  const liste = Array.isArray(donnees) ? donnees : donnees.journees;
  const journee = liste?.find((j) => j.date === date);
  if (!journee) return erreur(`Aucune journée au ${date}.`, 404);
  if (video) journee.video = video;
  else delete journee.video;
  try {
    validerJournees(donnees);
  } catch (e) {
    if (e instanceof DonneesInvalides) return erreur(e.message);
    throw e;
  }
  const ok = await ecrireDonnees(donnees, sha, message);
  if (!ok) return erreur('Le fichier a changé entre-temps. Réessaie.', 409);
  return reponse({ ok: true });
}

export const POST = route(async (requete) => {
  const c = await lireJson(requete);
  if (!c) return erreur('Requête invalide.');
  if (!urlCloudinary(c.url, 'video')) return erreur('La vidéo doit être hébergée sur le compte Cloudinary de MonSenior.');
  if (c.sous_titres && !urlCloudinary(c.sous_titres, 'raw')) return erreur('Les sous-titres doivent être hébergés sur le compte Cloudinary de MonSenior.');
  const video = {
    url: c.url.replace('/video/upload/', '/video/upload/q_auto/').replace('/q_auto/q_auto/', '/q_auto/'),
    legende: String(c.legende ?? '').trim(),
    duree: String(c.duree ?? '').trim(),
    ...(c.sous_titres ? { sous_titres: c.sous_titres } : {}),
  };
  return modifier(String(c.date ?? ''), video, `Vidéo ajoutée au ${dateCourte(String(c.date ?? '--'))} depuis l'espace Équipe tech`);
});

export const DELETE = route(async (requete) => {
  const c = await lireJson(requete);
  if (!c) return erreur('Requête invalide.');
  return modifier(String(c.date ?? ''), null, `Vidéo retirée du ${dateCourte(String(c.date ?? '--'))} depuis l'espace Équipe tech`);
});
