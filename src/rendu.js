// Gabarits HTML des pages et composants.
import { PRODUITS } from './donnees.js';
import {
  trierRecentes, produitsDe, voisins, grouperParProduit,
  dateLongue, dateCourte, libelleCompte,
} from './journees.js';

const NOM_SITE = 'Quoi de neuf MonSenior';

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
  sousTitres: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15h4M15 15h2M7 11h2M13 11h4"/></svg>',
};

// ---------- Mise en page commune ----------

function page({ titre, description, contenu, scripts = '', large = false, site }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titre)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(titre)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="${NOM_SITE}">
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
${piedDePage(site)}
</div>
${scripts}
</body>
</html>
`;
}

function enTete() {
  return `<header class="en-tete">
  <a href="/" class="logo focus" aria-label="MonSenior, accueil de Quoi de neuf">MonSenior</a>
</header>`;
}

function piedDePage(site) {
  const contact = site?.contact
    ? `<a href="${esc(site.contact)}" class="lien-44 focus">Une question ?</a>`
    : `<span class="lien-44">Une question ? Contactez l'équipe produit.</span>`;
  return `<footer class="pied">${contact}</footer>`;
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
${triees.map(carteJour).join('\n')}
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

function carteJour(j) {
  const miniature = j.video
    ? `<div class="miniature" data-miniature>
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
  return `    <li class="grille__item" data-carte>
      <a href="/jour/${j.date}" class="carte focus-carte">
        ${miniature}
        <div class="carte__corps">
          <div class="carte__tete">
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
  ${j.video ? lecteurVideo(j.video) : ''}
  ${groupes}`;

  return page({
    titre: `${titreJour} · ${NOM_SITE}`,
    description: j.changements.map((c) => c.titre).join(' · '),
    contenu,
    site,
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
  const piste = v.sous_titres
    ? `<track kind="subtitles" srclang="fr" label="Français" src="${esc(v.sous_titres)}" default>`
    : '';
  const mention = v.sous_titres
    ? `<span class="video__st">${ICONES.sousTitres}Sous-titres</span>`
    : '';
  return `<figure class="video" data-video>
    <video controls preload="metadata" src="${esc(v.url)}" aria-label="${esc(v.legende)}">${piste}</video>
    <figcaption><span>${esc(v.legende)} · ${esc(v.duree)}</span>${mention}</figcaption>
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
