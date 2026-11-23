// Page /admin : connexion et déconnexion de l'équipe tech.
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var connexion = $('[data-connexion]');
  var panneau = $('[data-panneau]');
  var statut = $('[data-statut]');

  // Retour vers la page d'où l'on vient, uniquement sur ce site.
  var retour = new URLSearchParams(location.search).get('retour');
  if (!retour || retour.charAt(0) !== '/' || retour.charAt(1) === '/' || retour.indexOf('/admin') === 0) retour = '/';
  $('[data-retour]').href = retour;
  $('[data-retour]').textContent = retour === '/' ? 'Voir les journées' : 'Revenir à la journée';

  function afficher(message, enErreur) {
    statut.hidden = !message;
    statut.textContent = message || '';
    statut.classList.toggle('admin-statut--erreur', !!enErreur);
  }

  function api(methode, corps) {
    return fetch('/api/session', {
      method: methode,
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: corps ? JSON.stringify(corps) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.erreur || 'Erreur ' + r.status);
        return d;
      });
    });
  }

  function vers(etat) {
    connexion.hidden = etat !== 'connexion';
    panneau.hidden = etat !== 'panneau';
    if (etat === 'connexion') $('#mdp').focus();
  }

  connexion.addEventListener('submit', function (e) {
    e.preventDefault();
    afficher('');
    api('POST', { motDePasse: $('#mdp').value })
      .then(function () { location.href = retour; })
      .catch(function (err) { afficher(err.message, true); $('#mdp').select(); });
  });

  $('[data-deconnexion]').addEventListener('click', function () {
    api('DELETE').then(function () { afficher('Tu es déconnecté.'); vers('connexion'); });
  });

  api('GET')
    .then(function (d) { vers(d.connecte ? 'panneau' : 'connexion'); })
    .catch(function () { afficher('Le service de connexion ne répond pas.', true); });
})();
