// Lecture et écriture de data/journees.json via l'API GitHub.
import { variable } from './_commun.js';

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
  if (!r.ok) throw new Error(`GitHub a répondu ${r.status} en lecture`);
  const fichier = await r.json();
  return { sha: fichier.sha, donnees: JSON.parse(Buffer.from(fichier.content, 'base64').toString('utf8')) };
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
  if (r.status === 409 || r.status === 422) return false;
  if (!r.ok) throw new Error(`GitHub a répondu ${r.status} en écriture`);
  return true;
}
