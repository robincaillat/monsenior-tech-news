// Lecture et écriture de data/journees.json via l'API GitHub.
import { variable, ErreurService } from './_commun.js';

const CHEMIN = 'data/journees.json';

function entetes() {
  return {
    authorization: `Bearer ${variable('GITHUB_TOKEN')}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'quoi-de-neuf-admin',
  };
}

function url() {
  return `https://api.github.com/repos/${variable('GITHUB_REPO')}/contents/${CHEMIN}`;
}

export async function lireDonnees() {
  const branche = process.env.GITHUB_BRANCH || 'main';
  const r = await fetch(`${url()}?ref=${encodeURIComponent(branche)}`, { headers: entetes() });
  if (!r.ok) throw await erreurGithub(r, 'lecture');
  const fichier = await r.json();
  return { sha: fichier.sha, donnees: JSON.parse(Buffer.from(fichier.content, 'base64').toString('utf8')) };
}

// Traduit un refus de GitHub en message actionnable, affiché dans le formulaire.
async function erreurGithub(r, etape) {
  const detail = await r.json().then((d) => d.message).catch(() => '');
  const depot = process.env.GITHUB_REPO;
  const causes = {
    401: 'le jeton GITHUB_TOKEN est invalide ou expiré',
    403: etape === 'écriture'
      ? 'le jeton GITHUB_TOKEN n\'a pas le droit d\'écrire (permission « Contents » en « Read and write »)'
      : 'le jeton GITHUB_TOKEN n\'a pas accès au dépôt',
    404: `dépôt ou fichier introuvable : vérifie GITHUB_REPO (« ${depot} ») et que le jeton inclut bien ce dépôt`,
    422: 'GitHub a refusé le contenu envoyé',
  };
  console.error(`GitHub ${etape} ${r.status} : ${detail}`);
  return new ErreurService(`GitHub a refusé la ${etape} (${r.status}) : ${causes[r.status] ?? 'erreur inattendue'}.${detail ? ` Détail : ${detail}` : ''}`);
}

// Renvoie false si le fichier a changé entre la lecture et l'écriture.
export async function ecrireDonnees(donnees, sha, message) {
  const r = await fetch(url(), {
    method: 'PUT',
    headers: { ...entetes(), 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      sha,
      branch: process.env.GITHUB_BRANCH || 'main',
      content: Buffer.from(JSON.stringify(donnees, null, 2) + '\n', 'utf8').toString('base64'),
    }),
  });
  if (r.status === 409) return false;
  if (!r.ok) throw await erreurGithub(r, 'écriture');
  return true;
}
