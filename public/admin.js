// Espace Équipe tech : connexion, envoi d'une vidéo sur Cloudinary, rattachement à une journée.
(function () {
  var $ = function (s) { return document.querySelector(s); };
  var connexion = $('[data-connexion]');
  var panneau = $('[data-panneau]');
  var statut = $('[data-statut]');
  var ajout = $('[data-ajout]');
  var progression = $('[data-progression]');

  function afficher(message, enErreur) {
    statut.hidden = !message;
    statut.textContent = message || '';
    statut.classList.toggle('admin-statut--erreur', !!enErreur);
  }

  function api(chemin, methode, corps) {
    return fetch(chemin, {
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

  connexion.addEventListener('submit', function (e) {
    e.preventDefault();
    afficher('');
    api('/api/session', 'POST', { motDePasse: $('#mdp').value })
      .then(function () { $('#mdp').value = ''; vers('panneau'); })
      .catch(function (err) { afficher(err.message, true); $('#mdp').select(); });
  });

  $('[data-deconnexion]').addEventListener('click', function () {
    api('/api/session', 'DELETE').then(function () { afficher('Tu es déconnecté.'); vers('connexion'); });
  });

  ajout.addEventListener('submit', function (e) {
    e.preventDefault();
    var bouton = ajout.querySelector('button[type="submit"]');
    var fichier = $('#fichier').files[0];
    var vtt = $('#vtt').files[0];
    var date = $('#jour').value;
    if (fichier.size > 100 * 1024 * 1024) { afficher('La vidéo dépasse 100 Mo. Compresse-la avant de la publier.', true); return; }
    bouton.disabled = true;
    progression.hidden = false;
    progression.value = 0;
    afficher('Envoi de la vidéo…');
    var video;
    envoyer(fichier, 'video', function (p) { progression.value = p; })
      .then(function (v) {
        video = v;
        if (!vtt) return null;
        afficher('Envoi des sous-titres…');
        return envoyer(vtt, 'raw');
      })
      .then(function (st) {
        afficher('Enregistrement sur le site…');
        return api('/api/video', 'POST', {
          date: date,
          url: video.secure_url,
          duree: duree(video.duration),
          legende: $('#legende').value,
          sous_titres: st ? st.secure_url : undefined,
        });
      })
      .then(function () {
        ajout.reset();
        afficher('C’est publié. La vidéo apparaîtra sur le site dans environ une minute.');
      })
      .catch(function (err) { afficher(err.message, true); })
      .then(function () { bouton.disabled = false; progression.hidden = true; });
  });

  document.querySelectorAll('[data-retirer]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!confirm('Retirer la vidéo de cette journée ?')) return;
      b.disabled = true;
      api('/api/video', 'DELETE', { date: b.dataset.retirer })
        .then(function () {
          b.closest('li').remove();
          afficher('Vidéo retirée. Le site se met à jour dans environ une minute.');
        })
        .catch(function (err) { b.disabled = false; afficher(err.message, true); });
    });
  });

  api('/api/session', 'GET')
    .then(function (d) { vers(d.connecte ? 'panneau' : 'connexion'); })
    .catch(function () { afficher("Le service de connexion ne répond pas.", true); });
})();
