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

## Ajouter une vidéo (espace Équipe tech)

Le lien « Équipe tech » en pied de page mène à `/admin`, qui sert uniquement à se connecter (mot de passe partagé, session de 7 jours) puis ramène à la page d'origine. Une fois connecté, chaque page jour affiche sous la date un encadré « Équipe tech » avec « Ajouter une vidéo », ou « Remplacer la vidéo » et « Retirer la vidéo ». Le formulaire s'ouvre dans une fenêtre : vidéo, légende, sous-titres facultatifs. La vidéo part directement sur Cloudinary et la durée est calculée toute seule. Le site enregistre ensuite la journée dans `data/journees.json` par un commit sur GitHub, et Vercel republie en une minute environ.

Variables d'environnement à régler dans Vercel (Settings → Environment Variables) :

| Variable | Valeur |
| --- | --- |
| `ADMIN_PASSWORD` | Mot de passe partagé de l'équipe tech. Le changer déconnecte tout le monde. |
| `SESSION_SECRET` | Longue chaîne aléatoire, par exemple `openssl rand -hex 32`. |
| `CLOUDINARY_CLOUD_NAME` | Nom du compte Cloudinary (tableau de bord Cloudinary). |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary. |
| `CLOUDINARY_API_SECRET` | Secret API Cloudinary. Il ne quitte jamais le serveur. |
| `GITHUB_TOKEN` | Jeton GitHub « fine-grained » limité à ce dépôt, permission Contents en lecture et écriture. |
| `GITHUB_REPO` | `robincaillat/monsenior-tech-news` |
| `GITHUB_BRANCH` | Facultatif, `main` par défaut. |

Pour tester l'espace en local : `npx vercel dev` (les routes `/api` ne tournent pas avec un simple serveur de fichiers).

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
| `public/` | CSS, logo, script du filtre et de l'espace Équipe tech, copiés tels quels |
| `api/` | Fonctions Vercel : connexion, signature Cloudinary, ajout et retrait de vidéo |
| `tests/` | Tests de bout en bout sur un jeu de données d'exemple |

Adresses : `/` pour l'accueil, `/?produit=pulse` pour une vue filtrée, `/jour/2026-11-20` pour une journée.

## Hébergement Vercel

`vercel.json` règle tout : commande `npm run build`, dossier `dist`, adresses sans `.html`. Aucun framework à choisir à l'import.
