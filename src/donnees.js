// Chargement et validation du jeu de données « journées ».
import { readFile } from 'node:fs/promises';

export const PRODUITS = { 'mon-espace': 'Mon Espace', pulse: 'Pulse' };
const CHAMPS_TEXTE = ['titre', 'ce_qui_change', 'pour_qui', 'pourquoi'];

export class DonneesInvalides extends Error {}

export async function chargerJournees(chemin) {
  let brut;
  try {
    brut = JSON.parse(await readFile(chemin, 'utf8'));
  } catch (e) {
    throw new DonneesInvalides(`Impossible de lire ${chemin} : ${e.message}`);
  }
  return validerJournees(brut);
}

// Accepte soit une liste de journées, soit { journees: [...], semaines: [...] }.
// Les semaines sont gardées dans le fichier pour plus tard mais ignorées ici.
export function validerJournees(brut) {
  const liste = Array.isArray(brut) ? brut : brut?.journees;
  if (!Array.isArray(liste)) {
    throw new DonneesInvalides('Le fichier doit contenir une liste « journees ».');
  }
  const datesVues = new Set();
  return liste.map((entree, i) => {
    const nom = `Entrée n°${i + 1}` + (texte(entree?.date) ? ` (${entree.date})` : '');
    const erreur = (champ, message) => {
      throw new DonneesInvalides(`${nom}, champ « ${champ} » : ${message}`);
    };
    if (!entree || typeof entree !== 'object' || Array.isArray(entree)) {
      throw new DonneesInvalides(`${nom} : l'entrée doit être un objet.`);
    }

    if (!texte(entree.date)) erreur('date', 'manquant.');
    if (!dateValide(entree.date)) erreur('date', `« ${entree.date} » n'est pas une date au format AAAA-MM-JJ.`);
    if (datesVues.has(entree.date)) erreur('date', 'cette date existe déjà dans une autre entrée.');
    datesVues.add(entree.date);

    if (!Array.isArray(entree.changements) || entree.changements.length === 0) {
      erreur('changements', 'il faut au moins un changement.');
    }
    const changements = entree.changements.map((c, j) => {
      const champ = (k) => `changements[${j + 1}].${k}`;
      if (!c || typeof c !== 'object') erreur(`changements[${j + 1}]`, 'doit être un objet.');
      if (!texte(c.produit)) erreur(champ('produit'), 'manquant.');
      if (!Object.hasOwn(PRODUITS, c.produit)) {
        erreur(champ('produit'), `« ${c.produit} » est inconnu. Valeurs possibles : ${Object.keys(PRODUITS).join(', ')}.`);
      }
      for (const k of CHAMPS_TEXTE) {
        if (!texte(c[k])) erreur(champ(k), 'texte manquant ou vide.');
      }
      return {
        produit: c.produit,
        titre: c.titre.trim(),
        ce_qui_change: c.ce_qui_change.trim(),
        pour_qui: c.pour_qui.trim(),
        pourquoi: c.pourquoi.trim(),
      };
    });

    let video = null;
    if (entree.video !== undefined && entree.video !== null) {
      const v = entree.video;
      if (typeof v !== 'object') erreur('video', 'doit être un objet.');
      for (const k of ['url', 'legende', 'duree']) {
        if (!texte(v[k])) erreur(`video.${k}`, 'texte manquant ou vide.');
      }
      if (!/^\d{1,2}:\d{2}$/.test(v.duree.trim())) erreur('video.duree', `« ${v.duree} » doit ressembler à 1:20.`);
      video = {
        url: v.url.trim(),
        legende: v.legende.trim(),
        duree: v.duree.trim(),
      };
    }

    return { date: entree.date, changements, video };
  });
}

function texte(valeur) {
  return typeof valeur === 'string' && valeur.trim() !== '';
}

function dateValide(valeur) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false;
  const d = new Date(`${valeur}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === valeur;
}
