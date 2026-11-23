// Construit le site statique dans dist/ à partir de data/journees.json.
// Usage : node src/build.js [--donnees chemin.json] [--sortie dossier]
import { mkdir, rm, writeFile, cp, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chargerJournees, DonneesInvalides } from './donnees.js';
import { pageAccueil, pageJour, page404 } from './rendu.js';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function construire({ donnees, sortie, site }) {
  const journees = await chargerJournees(donnees);
  await rm(sortie, { recursive: true, force: true });
  await mkdir(join(sortie, 'jour'), { recursive: true });
  await cp(join(racine, 'public'), sortie, { recursive: true });
  await writeFile(join(sortie, 'index.html'), pageAccueil(journees, site));
  await writeFile(join(sortie, '404.html'), page404(site));
  for (const j of journees) {
    await writeFile(join(sortie, 'jour', `${j.date}.html`), pageJour(journees, j.date, site));
  }
  return journees;
}

async function lireSite() {
  try {
    return JSON.parse(await readFile(join(racine, 'data', 'site.json'), 'utf8'));
  } catch {
    return {};
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      donnees: { type: 'string', default: join(racine, 'data', 'journees.json') },
      sortie: { type: 'string', default: join(racine, 'dist') },
    },
  });
  try {
    const journees = await construire({ ...values, site: await lireSite() });
    console.log(`Site construit : ${journees.length} journée(s) dans ${values.sortie}`);
  } catch (e) {
    if (e instanceof DonneesInvalides) {
      console.error(`Construction arrêtée. ${e.message}`);
      process.exit(1);
    }
    throw e;
  }
}
