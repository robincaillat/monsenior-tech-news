// Filtre produit côté navigateur. L'état vit dans l'adresse (?produit=pulse).
(function () {
  var groupe = document.querySelector('[data-filtre]');
  if (!groupe) return;
  groupe.hidden = false;

  var NOMS = { 'mon-espace': 'Mon Espace', pulse: 'Pulse' };
  var boutons = Array.prototype.slice.call(groupe.querySelectorAll('button[data-valeur]'));
  var cartes = Array.prototype.slice.call(document.querySelectorAll('[data-carte]'));
  var aucun = document.querySelector('[data-aucun]');

  function compte(n) {
    return n > 1 ? 'Voir les ' + n + ' changements' : 'Voir le changement';
  }

  function appliquer(valeur) {
    var visibles = 0;
    boutons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.valeur === valeur));
    });
    cartes.forEach(function (carte) {
      var n = 0;
      carte.querySelectorAll('[data-produit]').forEach(function (li) {
        var garde = valeur === 'tous' || li.dataset.produit === valeur;
        li.hidden = !garde;
        if (garde) n++;
      });
      carte.querySelectorAll('[data-etiquette]').forEach(function (e) {
        e.hidden = !(valeur === 'tous' || e.dataset.etiquette === valeur);
      });
      carte.querySelector('[data-compte]').textContent = compte(n);
      carte.hidden = n === 0;
      if (n > 0) visibles++;
    });
    // La première journée visible passe en bannière.
    var premiere = cartes.filter(function (c) { return !c.hidden; })[0];
    cartes.forEach(function (c) { c.classList.toggle('grille__item--vedette', c === premiere); });
    aucun.hidden = visibles > 0;
    aucun.textContent = visibles > 0 ? '' : 'Aucun jour ne contient de changement pour ' + NOMS[valeur] + ' pour le moment.';
  }

  function depuisAdresse() {
    var v = new URLSearchParams(location.search).get('produit');
    return Object.prototype.hasOwnProperty.call(NOMS, v) ? v : 'tous';
  }

  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.valeur;
      var url = v === 'tous' ? location.pathname : location.pathname + '?produit=' + v;
      history.replaceState(null, '', url);
      appliquer(v);
    });
  });

  appliquer(depuisAdresse());
})();
