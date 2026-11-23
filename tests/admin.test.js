// Espace Équipe tech : on appelle les routes /api comme le ferait le navigateur,
// avec GitHub simulé, et on vérifie ce qui serait écrit dans le dépôt.
import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
Object.assign(process.env, {
  ADMIN_PASSWORD: 'bon-mot-de-passe',
  SESSION_SECRET: 'secret-de-test',
  CLOUDINARY_CLOUD_NAME: 'monsenior',
  CLOUDINARY_API_KEY: '123',
  CLOUDINARY_API_SECRET: 'cloud-secret',
  GITHUB_TOKEN: 'jeton',
  GITHUB_REPO: 'exemple/depot',
});

const session = await import('../api/session.js');
const signature = await import('../api/signature-cloudinary.js');
const video = await import('../api/video.js');

const FIXTURE = await readFile(join(ici, 'fixtures', 'journees.json'), 'utf8');
const VIDEO_URL = 'https://res.cloudinary.com/monsenior/video/upload/v1/quoi-de-neuf/demo.mp4';
const fetchOriginal = globalThis.fetch;
let ecritures;

beforeEach(() => {
  ecritures = [];
  globalThis.fetch = async (url, options = {}) => {
    assert.match(String(url), /^https:\/\/api\.github\.com\/repos\/exemple\/depot\/contents\/data\/journees\.json/);
    if ((options.method ?? 'GET') === 'GET') {
      return Response.json({ sha: 'abc', content: Buffer.from(FIXTURE).toString('base64') });
    }
    const corps = JSON.parse(options.body);
    ecritures.push({ ...corps, donnees: JSON.parse(Buffer.from(corps.content, 'base64').toString('utf8')) });
    return Response.json({}, { status: 200 });
  };
});
after(() => { globalThis.fetch = fetchOriginal; });

function requete(methode, corps, cookie) {
  return new Request('https://site.test/api', {
    method: methode,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: corps ? JSON.stringify(corps) : undefined,
  });
}

async function seConnecter() {
  const r = await session.POST(requete('POST', { motDePasse: 'bon-mot-de-passe' }));
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}

test('un mauvais mot de passe est refusé sans session', async () => {
  const r = await session.POST(requete('POST', { motDePasse: 'faux' }));
  assert.equal(r.status, 401);
  assert.equal(r.headers.get('set-cookie'), null);
  assert.equal((await r.json()).erreur, 'Mot de passe incorrect.');
});

test('le bon mot de passe ouvre une session reconnue', async () => {
  const r0 = await session.POST(requete('POST', { motDePasse: 'bon-mot-de-passe' }));
  const poses = r0.headers.getSetCookie();
  assert.match(poses[0], /^qdn_admin=\d+\.[\w-]+; .*HttpOnly/);
  assert.match(poses[1], /^qdn_tech=1; /);
  assert.doesNotMatch(poses[1], /HttpOnly/);
  const cookie = poses[0].split(';')[0];
  const r = await session.GET(requete('GET', null, cookie));
  assert.deepEqual(await r.json(), { connecte: true });
  const sans = await session.GET(requete('GET'));
  assert.deepEqual(await sans.json(), { connecte: false });
  const falsifie = await session.GET(requete('GET', null, cookie.replace(/\.(.)/, '.x')));
  assert.deepEqual(await falsifie.json(), { connecte: false });
});

test('la signature Cloudinary exige une session et suit la règle de Cloudinary', async () => {
  assert.equal((await signature.POST(requete('POST', { type: 'video' }))).status, 401);
  const r = await signature.POST(requete('POST', { type: 'video' }, await seConnecter()));
  const s = await r.json();
  assert.equal(s.uploadUrl, 'https://api.cloudinary.com/v1_1/monsenior/video/upload');
  const attendu = createHash('sha1').update(`folder=quoi-de-neuf&timestamp=${s.timestamp}cloud-secret`).digest('hex');
  assert.equal(s.signature, attendu);
  assert.equal(JSON.stringify(s).includes('cloud-secret'), false);
});

test("ajouter une vidéo écrit la journée dans le dépôt, sans toucher aux autres", async () => {
  const cookie = await seConnecter();
  const r = await video.POST(requete('POST', {
    date: '2026-11-19', url: VIDEO_URL, duree: '0:45', legende: 'Démo : Injoignable',
  }, cookie));
  assert.equal(r.status, 200, await r.clone().text());
  assert.equal(ecritures.length, 1);
  const { donnees, sha, message } = ecritures[0];
  assert.equal(sha, 'abc');
  assert.match(message, /Vidéo ajoutée au 19\/11/);
  const jour = donnees.journees.find((j) => j.date === '2026-11-19');
  assert.deepEqual(jour.video, {
    url: 'https://res.cloudinary.com/monsenior/video/upload/q_auto/v1/quoi-de-neuf/demo.mp4',
    legende: 'Démo : Injoignable',
    duree: '0:45',
  });
  assert.equal(donnees.journees.find((j) => j.date === '2026-11-20').video.duree, '1:20');
});

test('une vidéo hors du compte Cloudinary, une journée inconnue ou une légende vide sont refusées', async () => {
  const cookie = await seConnecter();
  const base = { date: '2026-11-19', url: VIDEO_URL, duree: '0:45', legende: 'Démo' };
  const cas = [
    [{ ...base, url: 'https://ailleurs.test/v.mp4' }, 400, /compte Cloudinary/],
    [{ ...base, date: '2026-11-01' }, 404, /Aucune journée au 2026-11-01/],
    [{ ...base, legende: '  ' }, 400, /video\.legende/],
  ];
  for (const [corps, statut, message] of cas) {
    const r = await video.POST(requete('POST', corps, cookie));
    assert.equal(r.status, statut);
    assert.match((await r.json()).erreur, message);
  }
  assert.equal(ecritures.length, 0);
  assert.equal((await video.POST(requete('POST', base))).status, 401);
});

test('retirer une vidéo la supprime de la journée', async () => {
  const r = await video.DELETE(requete('DELETE', { date: '2026-11-20' }, await seConnecter()));
  assert.equal(r.status, 200);
  assert.equal('video' in ecritures[0].donnees.journees.find((j) => j.date === '2026-11-20'), false);
});

test('une requête qui n’est pas en JSON est refusée (protection contre les formulaires externes)', async () => {
  const cookie = await seConnecter();
  const r = await video.DELETE(new Request('https://site.test/api', {
    method: 'DELETE', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie }, body: 'date=2026-11-20',
  }));
  assert.equal(r.status, 400);
  assert.equal(ecritures.length, 0);
});

test('une session expirée ou absente efface le témoin, la déconnexion efface les deux cookies', async () => {
  const r = await session.GET(requete('GET', null, 'qdn_tech=1'));
  assert.match(r.headers.getSetCookie()[0], /^qdn_tech=; .*Max-Age=0/);
  const d = await session.DELETE(requete('DELETE'));
  assert.deepEqual(d.headers.getSetCookie().map((c) => c.split('=')[0]), ['qdn_admin', 'qdn_tech']);
});

test('un refus de GitHub donne un message qui dit quoi corriger', async () => {
  const cookie = await seConnecter();
  const cas = [
    [{ GET: 404 }, /\(404\).*GITHUB_REPO \(« exemple\/depot »\)/],
    [{ GET: 401 }, /\(401\).*GITHUB_TOKEN est invalide/],
    [{ PUT: 403 }, /écriture \(403\).*« Read and write ».*Resource not accessible/],
  ];
  for (const [statuts, message] of cas) {
    globalThis.fetch = async (url, options = {}) => {
      const methode = options.method ?? 'GET';
      if (statuts[methode]) return Response.json({ message: 'Resource not accessible by personal access token' }, { status: statuts[methode] });
      return Response.json({ sha: 'abc', content: Buffer.from(FIXTURE).toString('base64') });
    };
    const r = await video.POST(requete('POST', { date: '2026-11-19', url: VIDEO_URL, duree: '0:45', legende: 'Démo' }, cookie));
    assert.equal(r.status, 502);
    assert.match((await r.json()).erreur, message);
  }
});
