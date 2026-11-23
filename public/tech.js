// Outils de l'équipe tech sur la page jour : ajouter, remplacer ou retirer la vidéo.
// Ne fait rien pour les visiteurs (pas de témoin de connexion).
(function () {
  if (!/(?:^|;\s*)qdn_tech=1/.test(document.cookie)) return;
  var outils = document.querySelector('[data-outils-tech]');
  if (!outils) return;
  outils.hidden = false;

  var $ = function (s) { return outils.querySelector(s); };
  var date = outils.dataset.date;
  var dialogue = $('[data-dialogue]');
  var formulaire = $('[data-ajout]');
  var progression = $('[data-progression]');
  var erreurForm = $('[data-erreur]');
  var statut = $('[data-statut]');

  function annoncer(message) {
    statut.hidden = !message;
    statut.textContent = message || '';
  }

  function erreurDans(zone, err) {
    var message = err.statut === 401 ? 'Ta session a expiré. Reconnecte-toi depuis « Équipe tech » en bas de page.' : err.message;
    zone.hidden = false;
    zone.textContent = message;
  }

  function api(chemin, methode, corps) {
    return fetch(chemin, {
      method: methode,
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: corps ? JSON.stringify(corps) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.erreur || 'Erreur ' + r.status); e.statut = r.status; throw e; }
        return d;
      });
    });
  }

  function duree(secondes) {
    var s = Math.max(1, Math.round(secondes || 0));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function envoyer(fichier, type, surProgression) {
    return api('/api/signature-cloudinary', 'POST', { type: type }).then(function (s) {
      var fd = new FormData();
      fd.append('file', fichier);
      fd.append('api_key', s.apiKey);
      fd.append('timestamp', s.timestamp);
      fd.append('folder', s.folder);
      fd.append('signature', s.signature);
      return new Promise(function (ok, ko) {
        var x = new XMLHttpRequest();
        x.open('POST', s.uploadUrl);
        x.upload.onprogress = function (e) { if (e.lengthComputable && surProgression) surProgression(e.loaded / e.total); };
        x.onload = function () {
          var d = {};
          try { d = JSON.parse(x.responseText); } catch (e) {}
          if (x.status < 300) ok(d);
          else ko(new Error((d.error && d.error.message) || 'Cloudinary a refusé le fichier.'));
        };
        x.onerror = function () { ko(new Error("La connexion a coupé pendant l'envoi.")); };
        x.send(fd);
      });
    });
  }

  $('[data-ouvrir]').addEventListener('click', function () {
    erreurForm.hidden = true;
    dialogue.showModal();
  });
  $('[data-fermer]').addEventListener('click', function () { dialogue.close(); });

  formulaire.addEventListener('submit', function (e) {
    e.preventDefault();
    var bouton = formulaire.querySelector('button[type="submit"]');
    var fichier = formulaire.querySelector('#fichier').files[0];
    erreurForm.hidden = true;
    if (fichier.size > 100 * 1024 * 1024) {
      erreurDans(erreurForm, new Error('La vidéo dépasse 100 Mo. Compresse-la avant de la publier.'));
      return;
    }
    bouton.disabled = true;
    bouton.textContent = 'Envoi en cours…';
    progression.hidden = false;
    progression.value = 0;
    var video;
    envoyer(fichier, 'video', function (p) { progression.value = p; })
      .then(function (v) {
        video = v;
        bouton.textContent = 'Enregistrement…';
        return api('/api/video', 'POST', {
          date: date,
          url: video.secure_url,
          duree: duree(video.duration),
          legende: formulaire.querySelector('#legende').value,
        });
      })
      .then(function () {
        dialogue.close();
        formulaire.reset();
        annoncer('C’est publié. La vidéo apparaîtra sur cette page dans environ une minute.');
      })
      .catch(function (err) { erreurDans(erreurForm, err); })
      .then(function () {
        bouton.disabled = false;
        bouton.textContent = 'Publier la vidéo';
        progression.hidden = true;
      });
  });

  var retirer = $('[data-retirer]');
  if (retirer) {
    retirer.addEventListener('click', function () {
      if (!confirm('Retirer la vidéo de cette journée ?')) return;
      retirer.disabled = true;
      api('/api/video', 'DELETE', { date: date })
        .then(function () { annoncer('Vidéo retirée. La page se met à jour dans environ une minute.'); })
        .catch(function (err) { retirer.disabled = false; erreurDans(statut, err); });
    });
  }

})();
