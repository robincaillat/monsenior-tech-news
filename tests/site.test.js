// Un seul seam : on construit le site avec un jeu de données d'exemple,
// puis on vérifie ce qu'une personne voit dans un vrai navigateur.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { construire } from '../src/build.js';

const ici = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(ici, 'fixtures', 'journees.json');
const INVALIDE = join(ici, 'fixtures', 'invalide.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript' };

// Serveur statique qui imite Vercel (cleanUrls) : /jour/2026-11-20 → jour/2026-11-20.html
function servir(dossier) {
  const serveur = createServer(async (req, res) => {
    const chemin = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const essais = chemin === '/' ? ['index.html'] : [chemin.slice(1), `${chemin.slice(1)}.html`];
    for (const e of essais) {
      try {
        const corps = await readFile(join(dossier, e));
        res.writeHead(200, { 'content-type': TYPES[extname(e)] ?? 'application/octet-stream' });
        return res.end(corps);
      } catch {}
    }
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    res.end(await readFile(join(dossier, '404.html')));
  });
  return new Promise((ok) => serveur.listen(0, () => ok(serveur)));
}

async function construireEtServir(donnees) {
  const sortie = await mkdtemp(join(tmpdir(), 'qdn-'));
  await construire({ donnees, sortie, site: { contact: 'mailto:exemple@exemple.test' } });
  const serveur = await servir(sortie);
  return { sortie, serveur, base: `http://localhost:${serveur.address().port}` };
}

let navigateur, site, page;

before(async () => {
  navigateur = await chromium.launch();
  site = await construireEtServir(FIXTURE);
});

after(async () => {
  await navigateur?.close();
  site?.serveur.close();
  await rm(site.sortie, { recursive: true, force: true });
});

async function ouvrir(chemin, base = site.base) {
  page = await navigateur.newPage();
  await page.goto(base + chemin);
  return page;
}

const cartes = () => page.locator('[data-carte]:visible');

test("1. l'accueil affiche une carte par jour, du plus récent au plus ancien", async () => {
  await ouvrir('/');
  assert.deepEqual(await cartes().locator('h2').allInnerTexts(), [
    'Vendredi 20 novembre',
    'Jeudi 19 novembre',
    'Vendredi 13 novembre',
  ]);
});

test('2. une carte montre la date, les produits, les titres et le bon nombre de changements', async () => {
  await ouvrir('/');
  const carte = cartes().filter({ hasText: 'Jeudi 19 novembre' });
  assert.deepEqual(await carte.locator('[data-etiquette]').allInnerTexts(), ['Mon Espace', 'Pulse']);
  assert.deepEqual(await carte.locator('li').allInnerTexts(), [
    "Le résultat d'un appel est bien enregistré",
    'Nouveau choix « Injoignable »',
    "Une question en plus sur l'accompagnement",
  ]);
  assert.equal(await carte.locator('[data-compte]').innerText(), 'Voir les 3 changements');
  assert.equal(await carte.locator('a').getAttribute('href'), '/jour/2026-11-19');
  const seul = cartes().filter({ hasText: 'Vendredi 13 novembre' });
  assert.equal(await seul.locator('[data-compte]').innerText(), 'Voir le changement');
});

test("3. seule la carte d'un jour avec vidéo affiche une miniature", async () => {
  await ouvrir('/');
  const avecMiniature = cartes().filter({ has: page.locator('[data-miniature]') });
  assert.deepEqual(await avecMiniature.locator('h2').allInnerTexts(), ['Vendredi 20 novembre']);
  assert.match(await avecMiniature.innerText(), /Vidéo · 1:20/);
});

test('4. le filtre Pulse ne garde que le 19/11, avec ses seuls titres Pulse', async () => {
  await ouvrir('/');
  await page.getByRole('button', { name: 'Pulse' }).click();
  assert.equal(await page.getByRole('button', { name: 'Pulse' }).getAttribute('aria-pressed'), 'true');
  assert.deepEqual(await cartes().locator('h2').allInnerTexts(), ['Jeudi 19 novembre']);
  assert.deepEqual(await cartes().locator('li:visible').allInnerTexts(), [
    "Le résultat d'un appel est bien enregistré",
    'Nouveau choix « Injoignable »',
  ]);
  assert.deepEqual(await cartes().locator('[data-etiquette]:visible').allInnerTexts(), ['Pulse']);
  assert.equal(await cartes().locator('[data-compte]').innerText(), 'Voir les 2 changements');
  assert.match(page.url(), /\?produit=pulse$/);
});

test("4 bis. le filtre se lit depuis l'adresse partagée", async () => {
  await ouvrir('/?produit=pulse');
  assert.deepEqual(await cartes().locator('h2').allInnerTexts(), ['Jeudi 19 novembre']);
});

test('5. un filtre sans résultat affiche le message « aucun jour »', async () => {
  const dossier = await mkdtemp(join(tmpdir(), 'qdn-donnees-'));
  const fichier = join(dossier, 'mon-espace-seul.json');
  const tout = JSON.parse(await readFile(FIXTURE, 'utf8'));
  await writeFile(fichier, JSON.stringify(tout.journees.filter((j) => j.date !== '2026-11-19')));
  const autre = await construireEtServir(fichier);
  try {
    await ouvrir('/?produit=pulse', autre.base);
    assert.equal(await cartes().count(), 0);
    assert.match(await page.locator('[data-aucun]').innerText(), /Aucun jour/);
    await page.getByRole('button', { name: 'Tous' }).click();
    assert.equal(await cartes().count(), 2);
    assert.equal(await page.locator('[data-aucun]').isVisible(), false);
  } finally {
    autre.serveur.close();
    await rm(autre.sortie, { recursive: true, force: true });
    await rm(dossier, { recursive: true, force: true });
  }
});

test('6. la page jour groupe les changements par produit, Mon Espace d’abord', async () => {
  await ouvrir('/jour/2026-11-19');
  assert.equal(await page.locator('h1').innerText(), 'Jeudi 19 novembre');
  assert.deepEqual(await page.locator('main h2:visible').allInnerTexts(), [
    'Mon Espace · 1 changement',
    'Pulse · 2 changements',
  ]);
  assert.deepEqual(await page.locator('section').nth(1).locator('h3').allInnerTexts(), [
    "Le résultat d'un appel est bien enregistré",
    'Nouveau choix « Injoignable »',
  ]);
});

test('7. chaque changement affiche « Ce qui change », « Pour qui », « Pourquoi »', async () => {
  await ouvrir('/jour/2026-11-19');
  const articles = page.locator('article');
  assert.equal(await articles.count(), 3);
  for (const article of await articles.all()) {
    assert.deepEqual(await article.locator('dt').allInnerTexts(), ['Ce qui change', 'Pour qui', 'Pourquoi']);
  }
  assert.match(await articles.first().innerText(), /Pour mieux préparer le premier appel/);
});

test("8. la page d'un jour sans vidéo n'a aucun bloc vidéo ; celle avec vidéo l'affiche", async () => {
  await ouvrir('/jour/2026-11-19');
  assert.equal(await page.locator('video, [data-video]').count(), 0);
  await ouvrir('/jour/2026-11-20');
  const video = page.locator('[data-video]');
  assert.match(await video.locator('figcaption').innerText(), /Démo : les témoignages.*1:20/);
});

test('9. jour précédent depuis le 19/11 mène au 13/11 (les jours absents sont sautés)', async () => {
  await ouvrir('/jour/2026-11-19');
  await page.getByRole('link', { name: /Jour précédent/ }).click();
  await page.waitForURL(/\/jour\/2026-11-13$/);
  assert.equal(await page.locator('h1').innerText(), 'Vendredi 13 novembre');
  assert.equal(await page.getByRole('link', { name: /Jour précédent/ }).count(), 0);
});

test('10. jour suivant est désactivé sur la journée la plus récente', async () => {
  await ouvrir('/jour/2026-11-20');
  assert.equal(await page.getByRole('link', { name: /Jour suivant/ }).count(), 0);
  const inactif = page.locator('[aria-disabled="true"]', { hasText: 'Jour suivant' });
  assert.equal(await inactif.isVisible(), true);
  assert.equal(await page.getByRole('link', { name: /Jour précédent : jeudi 19 novembre/ }).count(), 1);
});

test("10 bis. retour à l'accueil, liens « Une question ? » et « Équipe tech »", async () => {
  await ouvrir('/jour/2026-11-20');
  assert.equal(await page.getByRole('link', { name: 'Une question ?' }).getAttribute('href'), 'mailto:exemple@exemple.test');
  assert.equal(await page.getByRole('link', { name: 'Équipe tech' }).getAttribute('href'), '/admin?retour=%2Fjour%2F2026-11-20');
  await page.getByRole('link', { name: 'Tous les jours' }).click();
  await page.waitForURL(site.base + '/');
  assert.equal(await page.locator('h1').innerText(), 'Quoi de neuf');
});

test("11. une entrée invalide fait échouer la construction avec un message qui nomme l'entrée et le champ", async () => {
  const sortie = await mkdtemp(join(tmpdir(), 'qdn-ko-'));
  const r = spawnSync(process.execPath, [join(ici, '..', 'src', 'build.js'), '--donnees', INVALIDE, '--sortie', sortie], { encoding: 'utf8' });
  await rm(sortie, { recursive: true, force: true });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Entrée n°2 \(2026-11-19\)/);
  assert.match(r.stderr, /changements\[1\]\.produit/);
  assert.match(r.stderr, /« pulsee » est inconnu/);
});

test('11 bis. une date manquante bloque aussi la construction', async () => {
  const { validerJournees, DonneesInvalides } = await import('../src/donnees.js');
  assert.throws(
    () => validerJournees([{ changements: [] }]),
    (e) => e instanceof DonneesInvalides && /Entrée n°1, champ « date » : manquant/.test(e.message),
  );
});

test("les outils de l'équipe tech sont invisibles pour les visiteurs", async () => {
  await ouvrir('/jour/2026-11-19');
  assert.equal(await page.getByRole('button', { name: 'Ajouter une vidéo' }).isVisible(), false);
  assert.equal(await page.locator('[data-outils-tech]').isVisible(), false);
});

test("connecté, l'équipe tech ajoute une vidéo depuis la page du jour", async () => {
  page = await navigateur.newPage();
  await page.context().addCookies([{ name: 'qdn_tech', value: '1', url: site.base }]);
  await page.goto(site.base + '/jour/2026-11-19');
  await page.getByRole('button', { name: 'Ajouter une vidéo' }).click();
  const dialogue = page.getByRole('dialog', { name: 'Ajouter une vidéo · Jeudi 19 novembre' });
  assert.equal(await dialogue.isVisible(), true);
  assert.equal(await dialogue.getByLabel('Légende').inputValue(), '');
  await dialogue.getByRole('button', { name: 'Annuler' }).click();
  assert.equal(await dialogue.isVisible(), false);
  assert.equal(await page.getByRole('button', { name: 'Retirer la vidéo' }).count(), 0);

  await page.goto(site.base + '/jour/2026-11-20');
  await page.getByRole('button', { name: 'Remplacer la vidéo' }).click();
  const remplacer = page.getByRole('dialog', { name: 'Remplacer la vidéo · Vendredi 20 novembre' });
  assert.equal(await remplacer.getByLabel('Légende').inputValue(), "Démo : les témoignages sur la page d'entrée de Mon Espace");
  await remplacer.getByRole('button', { name: 'Annuler' }).click();
  assert.equal(await page.getByRole('button', { name: 'Retirer la vidéo' }).isVisible(), true);
  await page.context().clearCookies();
});

test('le lien « Équipe tech » ramène à la journée après connexion', async () => {
  await ouvrir('/jour/2026-11-19');
  assert.equal(await page.getByRole('link', { name: 'Équipe tech' }).getAttribute('href'), '/admin?retour=%2Fjour%2F2026-11-19');
});

test('la journée la plus récente est en bannière, et la bannière suit le filtre', async () => {
  await ouvrir('/');
  const banniere = page.locator('.grille__item--vedette');
  assert.equal(await banniere.count(), 1);
  assert.equal(await banniere.locator('h2').innerText(), 'Vendredi 20 novembre');
  assert.equal(await banniere.getByText('Dernière mise à jour').isVisible(), true);
  assert.equal(await cartes().first().getByText('Dernière mise à jour').isVisible(), true);
  assert.equal(await cartes().nth(1).getByText('Dernière mise à jour').isVisible(), false);
  await page.getByRole('button', { name: 'Pulse' }).click();
  assert.equal(await banniere.locator('h2').innerText(), 'Jeudi 19 novembre');
  await page.getByRole('button', { name: 'Tous' }).click();
  assert.equal(await banniere.locator('h2').innerText(), 'Vendredi 20 novembre');
});
