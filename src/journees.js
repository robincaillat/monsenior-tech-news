// Requêtes sur les journées : tri, voisins, regroupement par produit.

export const ORDRE_PRODUITS = ['mon-espace', 'pulse'];

export function trierRecentes(journees) {
  return [...journees].sort((a, b) => b.date.localeCompare(a.date));
}

export function produitsDe(journee) {
  return ORDRE_PRODUITS.filter((p) => journee.changements.some((c) => c.produit === p));
}

// Jour précédent = plus ancien, jour suivant = plus récent.
// La liste ne contient que des jours avec changements, donc les jours vides sont sautés d'office.
export function voisins(journees, date) {
  const triees = trierRecentes(journees);
  const i = triees.findIndex((j) => j.date === date);
  return {
    precedent: triees[i + 1] ?? null,
    suivant: i > 0 ? triees[i - 1] : null,
  };
}

export function grouperParProduit(journee) {
  return ORDRE_PRODUITS.map((produit) => ({
    produit,
    changements: journee.changements.filter((c) => c.produit === produit),
  })).filter((g) => g.changements.length > 0);
}

const LONGUE = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const COURTE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// « Vendredi 20 novembre »
export function dateLongue(date) {
  const s = LONGUE.format(new Date(`${date}T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// « 20 nov. »
export function dateCourte(date) {
  return COURTE.format(new Date(`${date}T00:00:00Z`));
}

export function libelleCompte(n) {
  return n > 1 ? `Voir les ${n} changements` : 'Voir le changement';
}
