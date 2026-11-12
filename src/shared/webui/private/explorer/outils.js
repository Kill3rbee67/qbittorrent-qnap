// SPDX-License-Identifier: GPL-2.0-or-later
// Interface explorateur — outils : limites de vitesse globales, journal
// (messages filtrables et pairs bannis), créateur de torrent, association des
// liens magnet au navigateur, quitter qBittorrent.
//
// Endpoints (API WebUI v2, vérifiés dans le wiki « WebUI API (qBittorrent 5.0) »
// et dans le code source de qBittorrent 5.3.0) : app/preferences,
// app/setPreferences (dl_limit, up_limit, alt_dl_limit, alt_up_limit, en
// octets/s), transfer/toggleSpeedLimitsMode, log/main (normal, info, warning,
// critical, last_known_id), log/peers, torrentcreator/addTask,
// torrentcreator/status, torrentcreator/torrentFile, torrentcreator/deleteTask,
// app/shutdown.
'use strict';

/* ---------- Limites de vitesse globales ---------- */
async function globalLimitsDialog() {
  let p;
  try { p = await api('app/preferences').then((r) => r.json()); } catch (e) { if (e.message !== 'session') toast('Le NAS ne répond pas.', true); return; }
  const kib = (v) => (v > 0 ? Math.round(v / 1024) : 0);
  const alt = !!md.server.use_alt_speed_limits;
  const f = (id, v) => `<div class="unit"><input class="field" id="${id}" type="number" min="0" step="1" value="${kib(v)}">Kio/s</div>`;
  dialog({ title: 'Limites de vitesse globales', ok: 'Enregistrer',
    body: `<span class="muted" style="font-size:12.5px">0 = illimité. Les limites s'appliquent à l'ensemble des torrents.</span>
      <div style="display:grid;grid-template-columns:auto 1fr 1fr;gap:8px 12px;align-items:center">
        <span></span><b>Téléchargement</b><b>Envoi</b>
        <span>Limites normales</span>${f('gl-dl', p.dl_limit)}${f('gl-up', p.up_limit)}
        <span>Limites alternatives</span>${f('gl-adl', p.alt_dl_limit)}${f('gl-aup', p.alt_up_limit)}</div>
      <label class="chk"><input type="checkbox" id="gl-alt" ${alt ? 'checked' : ''}> Utiliser les limites alternatives maintenant</label>
      <span class="muted" style="font-size:12.5px">Pour passer automatiquement aux limites alternatives selon un horaire : Outils › Réglages › Vitesse.</span>`,
    onOk: async (bd, err) => {
      const v = (id) => Number(bd.querySelector(id).value);
      const vals = { dl_limit: v('#gl-dl'), up_limit: v('#gl-up'), alt_dl_limit: v('#gl-adl'), alt_up_limit: v('#gl-aup') };
      if (Object.values(vals).some((x) => !Number.isFinite(x) || x < 0)) { err('Indiquez des nombres positifs, ou 0.'); return false; }
      const diff = {};
      for (const [k, x] of Object.entries(vals)) if (Math.round(x * 1024) !== Math.max(0, p[k] || 0)) diff[k] = Math.round(x * 1024);
      if (Object.keys(diff).length && !(await apiAct('app/setPreferences', { json: JSON.stringify(diff) }))) return false;
      const want = bd.querySelector('#gl-alt').checked;
      if (want !== alt) {
        if (!(await apiAct('transfer/toggleSpeedLimitsMode', {}))) return false;
        md.server.use_alt_speed_limits = want; state.altSpeed = want;
      }
      toast('Limites de vitesse enregistrées');
    } });
}

/* ---------- Journal ---------- */
const LOG_TYPES = { 1: ['Normal', ''], 2: ['Info', ''], 4: ['Avertissement', 'warn'], 8: ['Critique', 'crit'] };
async function logDialog() {
  let msgs, peers;
  try {
    [msgs, peers] = await Promise.all([api('log/main?last_known_id=-1').then((r) => r.json()), api('log/peers?last_known_id=-1').then((r) => r.json())]);
  } catch (e) { if (e.message !== 'session') toast('Le NAS ne répond pas.', true); return; }
  const shown = store.get('logTypes', { 1: true, 2: true, 4: true, 8: true });
  const fmt = (ts) => new Date(ts * 1000).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
  const msgRows = (q) => msgs.filter((l) => shown[l.type] !== false && (!q || l.message.toLowerCase().includes(q))).slice(-1000).reverse().map((l) => {
    const [label, cls] = LOG_TYPES[l.type] || ['—', ''];
    return `<tr class="${cls}"><td class="muted" style="white-space:nowrap">${fmt(l.timestamp)}</td><td style="white-space:nowrap">${label}</td><td style="overflow-wrap:anywhere">${esc(l.message)}</td></tr>`;
  }).join('') || '<tr><td colspan="3">Aucun message.</td></tr>';
  const peerRows = () => peers.slice().reverse().map((x) => `<tr><td class="muted" style="white-space:nowrap">${fmt(x.timestamp)}</td><td>${esc(x.ip)}</td>
    <td>${x.blocked ? 'Bloqué' : 'Banni'}</td><td style="overflow-wrap:anywhere">${esc(x.reason || '—')}</td></tr>`).join('') || '<tr><td colspan="4">Aucun pair bloqué ou banni.</td></tr>';
  dialog({ title: 'Journal de qBittorrent', ok: 'Fermer', cancel: false, wide: true,
    body: `<div class="seg" style="align-self:start"><button data-logtab="m" class="on" style="width:auto;padding:0 10px">Messages généraux</button><button data-logtab="p" style="width:auto;padding:0 10px">Pairs bloqués (${peers.length})</button></div>
      <div data-logpane="m" style="display:grid;gap:8px">
        <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">${Object.entries(LOG_TYPES).map(([k, [l]]) => `<label class="chk"><input type="checkbox" data-logtype="${k}" ${shown[k] !== false ? 'checked' : ''}> ${l}</label>`).join('')}
          <input class="search" type="search" id="log-q" placeholder="Filtrer les messages" style="flex:1;min-width:160px"></div>
        <div style="max-height:56vh;overflow:auto;margin:0 -18px"><table class="logt"><thead><tr><th>Date</th><th>Type</th><th>Message</th></tr></thead><tbody id="log-m">${msgRows('')}</tbody></table></div></div>
      <div data-logpane="p" hidden><div style="max-height:60vh;overflow:auto;margin:0 -18px"><table class="logt"><thead><tr><th>Date</th><th>Adresse IP</th><th>État</th><th>Raison</th></tr></thead><tbody>${peerRows()}</tbody></table></div></div>`,
    onOpen: (bd) => {
      const q = () => bd.querySelector('#log-q').value.trim().toLowerCase();
      bd.addEventListener('input', (e) => { if (e.target.id === 'log-q') bd.querySelector('#log-m').innerHTML = msgRows(q()); });
      bd.addEventListener('change', (e) => {
        if (!e.target.dataset.logtype) return;
        shown[e.target.dataset.logtype] = e.target.checked; store.set('logTypes', shown);
        bd.querySelector('#log-m').innerHTML = msgRows(q());
      });
      bd.addEventListener('click', (e) => {
        const t = e.target.closest('[data-logtab]'); if (!t) return;
        bd.querySelectorAll('[data-logtab]').forEach((b) => b.classList.toggle('on', b === t));
        bd.querySelectorAll('[data-logpane]').forEach((x) => { x.hidden = x.dataset.logpane !== t.dataset.logtab; });
      });
      bd.querySelector('[data-ok]').focus();
    } });
}

/* ---------- Créateur de torrent ---------- */
const PIECE_SIZES = [0, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144]; // Kio (0 = auto)
function creatorDialog() {
  const src = state.view === 'folder' && state.path ? state.path : '';
  dialog({ title: 'Créateur de torrent', ok: 'Créer le torrent', wide: true,
    body: `<label>Fichier ou dossier à partager (sur le NAS)<input class="field" id="tc-src" value="${esc(src)}" placeholder="/share/Download/Mon dossier" spellcheck="false"></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label>Format<select class="field" id="tc-fmt"><option value="v1">v1 (compatible avec tous les clients)</option><option value="hybrid">Hybride (v1 + v2)</option><option value="v2">v2</option></select></label>
        <label>Taille des morceaux<select class="field" id="tc-piece">${PIECE_SIZES.map((k) => `<option value="${k * 1024}">${k ? (k >= 1024 ? k / 1024 + ' Mio' : k + ' Kio') : 'Automatique'}</option>`).join('')}</select></label></div>
      <label class="chk"><input type="checkbox" id="tc-priv"> Torrent privé (pas de DHT, PeX ni LSD)</label>
      <label class="chk"><input type="checkbox" id="tc-seed" checked> Partager le torrent une fois créé</label>
      <label class="chk"><input type="checkbox" id="tc-dot" checked> Ignorer les fichiers cachés (commençant par un point)</label>
      <label>Trackers <i>(un par ligne ; une ligne vide sépare les niveaux)</i><textarea class="field" id="tc-trk" rows="3" spellcheck="false"></textarea></label>
      <label>Sources web <i>(une par ligne)</i><textarea class="field" id="tc-web" rows="2" spellcheck="false"></textarea></label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label>Commentaire<input class="field" id="tc-com"></label><label>Source<input class="field" id="tc-source"></label></div>
      <div id="tc-status" class="muted" aria-live="polite"></div>`,
    onOk: async (bd, err) => {
      const q = (id) => bd.querySelector(id);
      const source = q('#tc-src').value.trim().replace(/\/+$/, '');
      if (!source.startsWith('/')) { err('Indiquez le chemin complet du fichier ou du dossier (ex. /share/Download/Mon dossier).'); return false; }
      const lines = (id) => q(id).value.split(/\r?\n/).map((x) => x.trim());
      const trackers = lines('#tc-trk'); while (trackers.length && !trackers[trackers.length - 1]) trackers.pop();
      const webs = lines('#tc-web').filter(Boolean);
      const bad = [...trackers.filter(Boolean), ...webs].find((u) => !/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(u));
      if (bad) { err(`Adresse invalide : ${bad.slice(0, 80)}`); return false; }
      const seed = q('#tc-seed').checked;
      const r = await apiAct('torrentcreator/addTask', {
        sourcePath: source, format: q('#tc-fmt').value, pieceSize: q('#tc-piece').value, private: String(q('#tc-priv').checked),
        ignoreDotfiles: String(q('#tc-dot').checked), startSeeding: String(seed), comment: q('#tc-com').value.trim(), source: q('#tc-source').value.trim(),
        trackers: trackers.map(encodeURIComponent).join('|'), urlSeeds: webs.map(encodeURIComponent).join('|'),
      });
      if (!r) return false;
      const { taskID } = await r.json();
      const st = q('#tc-status'), okBtn = q('[data-ok]');
      okBtn.disabled = true;
      // Suivi de la création ; la fenêtre reste ouverte jusqu'au résultat
      for (;;) {
        await sleep(700);
        let t;
        try { t = (await api('torrentcreator/status?taskID=' + encodeURIComponent(taskID)).then((x) => x.json()))[0]; } catch (e) { if (e.message === 'session') return; continue; }
        if (!t) { err('Tâche introuvable.'); return false; }
        if (t.status === 'Failed') { err('Échec de la création : ' + (t.errorMessage || 'erreur inconnue')); await post('torrentcreator/deleteTask', { taskID }).catch(() => {}); return false; }
        if (t.status === 'Finished') break;
        st.textContent = t.status === 'Running' ? `Création en cours… ${Math.round(t.progress || 0)} %` : 'En attente…';
      }
      // Téléchargement du .torrent créé
      const name = base(source) + '.torrent';
      try {
        const f = await api('torrentcreator/torrentFile?taskID=' + encodeURIComponent(taskID));
        if (f.ok) {
          const url = URL.createObjectURL(await f.blob()), a = document.createElement('a');
          a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
      } catch (_) {}
      await post('torrentcreator/deleteTask', { taskID }).catch(() => {});
      toast(seed ? `Torrent créé (${name}) et ajouté en partage` : `Torrent créé : ${name}`);
      setTimeout(poll, 800);
    } });
}

/* ---------- Liens magnet ---------- */
function registerMagnetHandler() {
  if (typeof navigator.registerProtocolHandler !== 'function' || !window.isSecureContext) {
    dialog({ title: 'Associer les liens magnet', ok: 'Fermer', cancel: false,
      body: `<span>${window.isSecureContext ? 'Votre navigateur ne permet pas cette fonction.'
        : 'Le navigateur n\'autorise cette fonction qu\'en HTTPS : ouvrez l\'interface par myQNAPcloud Link (https://…/qbittorrent/) ou par https://IP-DU-NAS/qbittorrent/, puis recommencez.'}</span>` });
    return;
  }
  // Même mécanisme que l'interface d'origine : …#download=<lien>
  navigator.registerProtocolHandler('magnet', `${location.origin}${location.pathname}${location.search}#download=%s`);
  toast('Demande envoyée au navigateur : confirmez dans la barre d\'adresse si elle s\'affiche');
}
function handleDownloadHash() {
  const h = '#download=';
  if (!location.hash.startsWith(h)) return;
  const url = decodeURIComponent(location.hash.slice(h.length));
  history.replaceState(null, '', location.pathname + location.search);
  if (url) openAddDialog({ magnet: true, links: [url] });
}

/* ---------- Quitter qBittorrent ---------- */
function shutdownDialog() {
  dialog({ title: 'Quitter qBittorrent', ok: 'Quitter', okClass: 'danger',
    body: `<span>qBittorrent va s'arrêter : plus aucun téléchargement ni partage, et cette interface ne répondra plus.</span>
      <span>Pour le relancer : <b>App Center</b> de QTS › qBittorrent › <b>Ouvrir</b> ou le bouton de démarrage.</span>`,
    onOk: async () => {
      if (!(await apiAct('app/shutdown', {}))) return false;
      state.halted = true;
      document.body.innerHTML = `<div class="empty" style="height:100vh"><strong>qBittorrent est arrêté</strong><span>Relancez-le depuis l'App Center de QTS, puis rechargez cette page.</span></div>`;
    } });
}

/* ---------- Jauges de vitesse (thème Futur) ----------
   Réception et envoi dans la barre du haut : vitesse rapportée à la limite globale, ou,
   sans limite, au pic récent. Masquées dans les autres thèmes (CSS). */
const gaugePeak = { dl: 1, up: 1 };
function updateGauges(s) {
  for (const [k, sp, lim, lbl] of [['dl', s.dl_info_speed, s.dl_rate_limit, 'Réception'], ['up', s.up_info_speed, s.up_rate_limit, 'Envoi']]) {
    const g = document.getElementById('g-' + k);
    if (!g) continue;
    if (!g.firstChild) g.innerHTML = '<svg width="22" height="22" viewBox="0 0 36 36"><circle class="gt" cx="18" cy="18" r="15" pathLength="100"/><circle class="gv" cx="18" cy="18" r="15" pathLength="100" stroke-dasharray="0 100"/></svg>';
    gaugePeak[k] = Math.max(gaugePeak[k] * 0.98, sp || 0, 1);
    const max = lim > 0 ? lim : gaugePeak[k], pct = Math.min(100, (sp || 0) / max * 100);
    g.querySelector('.gv').setAttribute('stroke-dasharray', `${pct.toFixed(1)} 100`);
    g.title = `${lbl} : ${fmtSpeed(sp)}${lim > 0 ? ` sur ${fmtSize(lim)}/s (limite)` : ''}`;
  }
}
