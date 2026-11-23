# Quoi de neuf MonSenior

Les nouveautés de Mon Espace et de Pulse, jour par jour. Site statique, sans base de données ni framework.

## Publier une journée

1. Ouvrir `data/journees.json`.
2. Ajouter une entrée dans la liste `journees` :

```json
{
  "date": "2026-11-24",
  "changements": [
    {
      "produit": "pulse",
      "titre": "Titre court du changement",
      "ce_qui_change": "Ce que l'équipe verra de différent.",
      "pour_qui": "Qui est concerné.",
      "pourquoi": "Pourquoi on l'a fait, en une phrase."
    }
  ],
  "video": {
    "url": "https://…/demo.mp4",
    "legende": "Démo : …",
    "duree": "1:20",
    "sous_titres": "https://…/demo.vtt"
  }
}
```

3. Commiter sur `main`. Vercel reconstruit et publie tout seul.

Règles :

- `produit` vaut `mon-espace` ou `pulse`.
- `video` est facultatif. Sans vidéo, aucun bloc vidéo n'apparaît. `sous_titres` (fichier WebVTT) est facultatif mais conseillé.
- L'ordre des entrées dans le fichier n'a pas d'importance : le site trie du plus récent au plus ancien.
- Si une entrée est invalide (date manquante, produit inconnu, texte vide…), la construction échoue et le message dit quelle entrée et quel champ corriger. Le site en ligne reste alors sur la version précédente.

Le lien « Une question ? » du pied de page se règle dans `data/site.json` (`"contact": "mailto:…"` ou une URL Slack).

## Développer

```bash
npm install
npm run build   # génère dist/
npm test        # construit le site d'exemple et le vérifie dans Chromium
```

Pour les tests sur une nouvelle machine : `npx playwright install chromium`.

## Organisation

| Fichier | Rôle |
| --- | --- |
| `src/donnees.js` | Lit et valide `journees.json` |
| `src/journees.js` | Tri, jour précédent / suivant, regroupement par produit, dates en français |
| `src/rendu.js` | Gabarits HTML : accueil, page jour, 404 |
| `src/build.js` | Écrit `dist/index.html` et `dist/jour/AAAA-MM-JJ.html` |
| `public/` | CSS et script du filtre produit, copiés tels quels |
| `tests/` | Tests de bout en bout sur un jeu de données d'exemple |

Adresses : `/` pour l'accueil, `/?produit=pulse` pour une vue filtrée, `/jour/2026-11-20` pour une journée.

## Hébergement Vercel

`vercel.json` règle tout : commande `npm run build`, dossier `dist`, adresses sans `.html`. Aucun framework à choisir à l'import.
