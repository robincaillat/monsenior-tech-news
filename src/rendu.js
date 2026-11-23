// Gabarits HTML des pages et composants.
import { PRODUITS } from './donnees.js';
import {
  trierRecentes, produitsDe, voisins, grouperParProduit,
  dateLongue, dateCourte, libelleCompte,
} from './journees.js';

const NOM_SITE = 'Quoi de neuf MonSenior';

// Image d'aperçu générée par Cloudinary à partir de la vidéo (1re seconde, 16:9).
export function apercu(url) {
  if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\/video\/upload\//.test(url)) return null;
  return url
    .replace(/\/video\/upload\/(q_auto\/)?/, '/video/upload/so_1,w_960,ar_16:9,c_fill,q_auto/')
    .replace(/\.[a-z0-9]+$/i, '.jpg');
}

export function esc(valeur) {
  return String(valeur)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const ICONES = {
  gauche: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  droite: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  lecture: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
};

// ---------- Mise en page commune ----------

function page({ titre, description, contenu, scripts = '', large = false, site, robots = '', chemin = '/' }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
${robots ? `<meta name="robots" content="${robots}">\n` : ''}<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="${NOM_SITE}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#003a65">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&amp;display=swap">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<div class="conteneur${large ? ' conteneur--large' : ''}">
${enTete()}
<main id="contenu">
${contenu}
</main>
${piedDePage(site, chemin)}
</div>
${scripts}
</body>
</html>
`;
}

function enTete() {
  return `<header class="en-tete">
  <a href="/" class="logo focus"><img src="/logo.svg" alt="MonSenior, accueil de Quoi de neuf" width="140" height="27"></a>
</header>`;
}

function piedDePage(site, chemin = '/') {
  const contact = site?.contact
    ? `<a href="${esc(site.contact)}" class="lien-44 focus">Une question ?</a>`
    : `<span class="lien-44">Une question ? Contactez l'équipe produit.</span>`;
  return `<footer class="pied">${contact}<a href="/admin?retour=${encodeURIComponent(chemin)}" class="lien-44 lien-discret focus">Équipe tech</a></footer>`;
}

function etiquetteProduit(produit, attributs = '') {
  return `<span class="etiquette etiquette--${produit}"${attributs}><span class="etiquette__point" aria-hidden="true"></span>${esc(PRODUITS[produit])}</span>`;
}

// ---------- Accueil ----------

export function pageAccueil(journees, site) {
  const triees = trierRecentes(journees);
  const filtres = [['tous', 'Tous'], ...Object.entries(PRODUITS)]
    .map(([valeur, libelle]) =>
      `<button type="button" class="onglet focus" data-valeur="${valeur}" aria-pressed="${valeur === 'tous'}">${esc(libelle)}</button>`)
    .join('\n      ');

  const contenu = `<div class="intro">
    <div class="intro__texte">
      <h1>Quoi de neuf</h1>
      <p class="discret">Les nouveautés de Mon Espace et de Pulse, jour par jour.</p>
    </div>
    <div class="filtre" role="group" aria-label="Filtrer par produit" data-filtre hidden>
      ${filtres}
    </div>
  </div>
  <ul class="grille" aria-label="Journées">
${triees.map((j, i) => carteJour(j, i === 0)).join('\n')}
  </ul>
  <p class="aucun" data-aucun hidden role="status"></p>`;

  return page({
    titre: NOM_SITE,
    description: 'Les nouveautés de Mon Espace et de Pulse, jour par jour.',
    contenu,
    large: true,
    site,
    scripts: '<script src="/filtre.js" defer></script>',
  });
}

function carteJour(j, vedette = false) {
  const miniature = j.video
    ? `<div class="miniature" data-miniature>${apercu(j.video.url) ? `<img src="${esc(apercu(j.video.url))}" alt="" loading="lazy" class="miniature__image">` : ''}
          <span class="miniature__bouton" aria-hidden="true">${ICONES.lecture}</span>
          <span class="miniature__duree">Vidéo · ${esc(j.video.duree)}</span>
        </div>`
    : '';
  const etiquettes = produitsDe(j)
    .map((p) => etiquetteProduit(p, ` data-etiquette="${p}"`))
    .join('');
  const titres = j.changements
    .map((c) => `<li data-produit="${c.produit}">${esc(c.titre)}</li>`)
    .join('');
  return `    <li class="grille__item${vedette ? ' grille__item--vedette' : ''}" data-carte>
      <a href="/jour/${j.date}" class="carte focus-carte">
        ${miniature}
        <div class="carte__corps">
          <div class="carte__tete">
            <span class="carte__vedette">Dernière mise à jour</span>
            <h2 class="carte__date">${esc(dateLongue(j.date))}</h2>
            <span class="etiquettes">${etiquettes}</span>
          </div>
          <ul class="carte__titres">${titres}</ul>
          <span class="carte__compte" data-compte>${libelleCompte(j.changements.length)}</span>
        </div>
      </a>
    </li>`;
}

// ---------- Page jour ----------

export function pageJour(journees, date, site) {
  const j = journees.find((x) => x.date === date);
  const { precedent, suivant } = voisins(journees, date);
  const titreJour = dateLongue(j.date);

  const nav = `<nav class="nav-jours" aria-label="Changer de jour">
      ${boutonJour(precedent, 'precedent')}
      ${boutonJour(suivant, 'suivant')}
    </nav>`;

  const groupes = grouperParProduit(j).map(({ produit, changements }) => `
  <section class="groupe" aria-labelledby="g-${produit}">
    <h2 id="g-${produit}" class="groupe__titre etiquette--${produit}"><span class="etiquette__point" aria-hidden="true"></span>${esc(PRODUITS[produit])} · ${changements.length} changement${changements.length > 1 ? 's' : ''}</h2>
    ${changements.map(carteChangement).join('\n')}
  </section>`).join('\n');

  const contenu = `<a href="/" class="retour focus">${ICONES.gauche}Tous les jours</a>
  <div class="jour__tete">
    <h1>${esc(titreJour)}</h1>
    ${nav}
  </div>
  ${outilsTech(j)}
  ${j.video ? lecteurVideo(j.video) : ''}
  ${groupes}`;

  return page({
    titre: `${titreJour} · ${NOM_SITE}`,
    description: j.changements.map((c) => c.titre).join(' · '),
    contenu,
    site,
    chemin: `/jour/${j.date}`,
    scripts: '<script src="/tech.js" defer></script>',
  });
}

function boutonJour(cible, sens) {
  const libelle = sens === 'precedent' ? 'Jour précédent' : 'Jour suivant';
  const icone = sens === 'precedent' ? ICONES.gauche : ICONES.droite;
  if (!cible) {
    const contenu = sens === 'precedent' ? `${icone}${libelle}` : `${libelle}${icone}`;
    return `<span class="bouton-jour bouton-jour--inactif" aria-disabled="true">${contenu}</span>`;
  }
  const court = `<span>${esc(dateCourte(cible.date))}</span>`;
  const contenu = sens === 'precedent' ? `${icone}${court}` : `${court}${icone}`;
  const etiquette = `${libelle} : ${dateLongue(cible.date).toLowerCase()}`;
  return `<a href="/jour/${cible.date}" class="bouton-jour focus" rel="${sens === 'precedent' ? 'prev' : 'next'}" aria-label="${esc(etiquette)}">${contenu}</a>`;
}

function carteChangement(c) {
  const ligne = (terme, def) =>
    `<div class="definition"><dt>${terme}</dt><dd>${esc(def)}</dd></div>`;
  return `<article class="changement">
      <h3>${esc(c.titre)}</h3>
      <dl>
        ${ligne('Ce qui change', c.ce_qui_change)}
        ${ligne('Pour qui', c.pour_qui)}
        ${ligne('Pourquoi', c.pourquoi)}
      </dl>
    </article>`;
}

function lecteurVideo(v) {
  return `<figure class="video" data-video>
    <video controls preload="metadata" src="${esc(v.url)}"${apercu(v.url) ? ` poster="${esc(apercu(v.url))}"` : ''} aria-label="${esc(v.legende)}"></video>
    <figcaption><span>${esc(v.legende)} · ${esc(v.duree)}</span></figcaption>
  </figure>`;
}

// ---------- 404 ----------

export function page404(site) {
  return page({
    titre: `Page introuvable · ${NOM_SITE}`,
    description: 'Cette page n’existe pas.',
    contenu: `<h1>Page introuvable</h1>
  <p>Cette journée n'existe pas ou n'a pas encore été publiée.</p>
  <p><a href="/" class="lien-44 focus">Voir tous les jours</a></p>`,
    site,
  });
}

// ---------- Équipe tech ----------

// Barre d'outils de l'équipe tech sur la page jour. Masquée pour les visiteurs ;
// tech.js l'affiche si le cookie de connexion est présent. Le serveur revérifie la session.
function outilsTech(j) {
  const titre = j.video ? 'Remplacer la vidéo' : 'Ajouter une vidéo';
  return `<div class="outils-tech" data-outils-tech data-date="${j.date}" hidden>
    <span class="outils-tech__label">Équipe tech</span>
    <button type="button" class="bouton focus" data-ouvrir>${titre}</button>
    ${j.video ? '<button type="button" class="bouton bouton--secondaire focus" data-retirer>Retirer la vidéo</button>' : ''}
    <p class="outils-tech__statut" data-statut role="status" hidden></p>
    <dialog class="dialogue" data-dialogue aria-labelledby="dialogue-titre">
      <form class="admin-carte" data-ajout method="dialog">
        <h2 id="dialogue-titre">${titre} · ${esc(dateLongue(j.date))}</h2>
        <label for="fichier">Vidéo (MP4 conseillé, 100 Mo max.)</label>
        <input id="fichier" name="fichier" type="file" accept="video/*" required>
        <label for="legende">Légende</label>
        <input id="legende" name="legende" type="text" required value="${j.video ? esc(j.video.legende) : ''}" placeholder="Démo : ${esc(j.changements[0].titre)}">
        <progress data-progression max="1" value="0" hidden></progress>
        <p class="admin-erreur" data-erreur role="alert" hidden></p>
        <div class="dialogue__actions">
          <button type="submit" class="bouton focus">Publier la vidéo</button>
          <button type="button" class="bouton bouton--secondaire focus" data-fermer>Annuler</button>
        </div>
      </form>
    </dialog>
  </div>`;
}

export function pageAdmin(journees, site) {
  const contenu = `<h1>Équipe tech</h1>
  <noscript><p>Cette page a besoin de JavaScript.</p></noscript>
  <p class="admin-statut" data-statut role="status" hidden></p>

  <form class="admin-carte" data-connexion hidden>
    <h2>Connexion</h2>
    <label for="mdp">Mot de passe</label>
    <input id="mdp" name="mdp" type="password" autocomplete="current-password" required>
    <button type="submit" class="bouton focus">Se connecter</button>
  </form>

  <div class="admin-carte" data-panneau hidden>
    <h2>Tu es connecté</h2>
    <p class="discret">Ouvre une journée : un bouton « Ajouter une vidéo » apparaît sous la date.</p>
    <div class="dialogue__actions">
      <a href="/" class="bouton focus" data-retour>Voir les journées</a>
      <button type="button" class="bouton bouton--secondaire focus" data-deconnexion>Se déconnecter</button>
    </div>
  </div>`;

  return page({
    titre: `Équipe tech · ${NOM_SITE}`,
    description: 'Connexion de l\'équipe tech.',
    contenu,
    site,
    robots: 'noindex',
    scripts: '<script src="/admin.js" defer></script>',
  });
}
