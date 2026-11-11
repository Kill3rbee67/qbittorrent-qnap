// SPDX-License-Identifier: GPL-2.0-or-later
// Interface explorateur — torrents : synchronisation, tri, actions du clic droit
// et panneau de détails (fichiers, trackers, pairs, sources HTTP).
//
// Chargé avant le script principal de index.html : ce fichier ne contient que
// des déclarations. Les variables du script principal (state, det, I, api,
// post, toast, dialog…) sont utilisées au moment des appels.
//
// Endpoints utilisés (API WebUI v2, vérifiés dans le wiki « WebUI API
// (qBittorrent 5.0) » et dans le code source de qBittorrent 5.3.0) :
//   sync/maindata, transfer/pauseSession, transfer/resumeSession,
//   torrents/rename, torrents/downloadLimit, torrents/uploadLimit,
//   torrents/setDownloadLimit, torrents/setUploadLimit, torrents/setShareLimits,
//   torrents/setAutoManagement, torrents/setSuperSeeding,
//   torrents/toggleSequentialDownload, torrents/toggleFirstLastPiecePrio,
//   torrents/export, torrents/webseeds, torrents/addWebSeeds,
//   torrents/editWebSeed, torrents/removeWebSeeds, torrents/filePrio,
//   torrents/renameFile, torrents/renameFolder, torrents/addTrackers,
//   torrents/editTracker, torrents/removeTrackers, torrents/reannounce,
//   torrents/addPeers, transfer/banPeers.
// removeTrackers, addWebSeeds et removeWebSeeds décodent chaque adresse (séparées
// par « | ») : elles sont encodées une à une, comme dans l'interface d'origine.
'use strict';

/* ---------- Erreurs et presse-papiers ---------- */
function errText(status) {
  return ({
    400: 'Paramètre refusé par qBittorrent.',
    404: 'Introuvable : le torrent a peut-être été supprimé entre-temps.',
    409: 'Opération impossible dans l\'état actuel (conflit).',
    415: 'Fichier non reconnu par qBittorrent.',
    502: 'qBittorrent ne répond pas : vérifiez qu\'il est démarré dans l\'App Center.',
    503: 'qBittorrent ne répond pas : vérifiez qu\'il est démarré dans l\'App Center.',
  })[status] || `Refusé par qBittorrent (erreur ${status}).`;
}
// Appel POST avec message d'erreur ; renvoie la réponse, ou false en cas d'échec
async function apiAct(path, params, okMsg) {
  let r;
  try { r = await post(path, params); } catch (e) {
    if (e.message !== 'session') toast('Le NAS ne répond pas : action non effectuée.', true);
    return false;
  }
  if (!r.ok) {
    let detail = '';
    try { detail = (await r.text()).trim(); } catch (_) {}
    toast(r.status === 409 && detail && detail.length < 160 ? detail : errText(r.status), true);
    return false;
  }
  if (okMsg) toast(okMsg);
  setTimeout(poll, 400);
  return r;
}
async function copyText(text, label) {
  // navigator.clipboard n'existe qu'en HTTPS ; en HTTP on passe par une zone de texte
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); toast(`${label} copié`); return; }
  } catch (_) {}
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.appendChild(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) {}
  ta.remove();
  if (ok) { toast(`${label} copié`); return; }
  dialog({ title: label, ok: 'Fermer', cancel: false,
    body: `<span class="muted">Copiez le texte ci-dessous (Ctrl+C) :</span><textarea class="field" rows="5" readonly>${esc(text)}</textarea>`,
    onOpen: (bd) => bd.querySelector('textarea').select() });
}

/* ---------- Synchronisation (sync/maindata, mise à jour incrémentale) ---------- */
const md = { rid: 0, torrents: {}, categories: {}, tags: [], trackers: {}, server: {} };
async function syncMain() {
  const r = await api('sync/maindata?rid=' + md.rid);
  if (!r.ok) throw new Error('http ' + r.status);
  const d = await r.json();
  if (d.full_update) Object.assign(md, { torrents: {}, categories: {}, tags: [], trackers: {}, server: {} });
  md.rid = d.rid;
  for (const [h, t] of Object.entries(d.torrents || {})) md.torrents[h] = Object.assign(md.torrents[h] || { hash: h }, t);
  for (const h of d.torrents_removed || []) delete md.torrents[h];
  for (const [n, c] of Object.entries(d.categories || {})) md.categories[n] = Object.assign(md.categories[n] || {}, c);
  for (const n of d.categories_removed || []) delete md.categories[n];
  if (d.tags) md.tags = [...new Set([...md.tags, ...d.tags])];
  if (d.tags_removed) md.tags = md.tags.filter((x) => !d.tags_removed.includes(x));
  for (const [u, hs] of Object.entries(d.trackers || {})) md.trackers[u] = hs;
  for (const u of d.trackers_removed || []) delete md.trackers[u];
  Object.assign(md.server, d.server_state || {});
  state.torrents = Object.values(md.torrents);
  state.altSpeed = !!md.server.use_alt_speed_limits;
  return md.server;
}
const sessionPaused = () => md.server.session_state === true;
function updateTitle() {
  const s = md.server;
  document.title = store.get('titleSpeed', false) && s.dl_info_speed !== undefined
    ? `[↓ ${fmtSpeed(s.dl_info_speed)}, ↑ ${fmtSpeed(s.up_info_speed)}] qBittorrent`
    : 'qBittorrent';
}

/* ---------- Tri de la liste ---------- */
// Tri des colonnes Catégorie et Étiquettes : chaînes vides en dernier
const SORT_STATE = ['downloading', 'forcedDL', 'metaDL', 'forcedMetaDL', 'stalledDL', 'queuedDL', 'checkingDL', 'checkingUP', 'checkingResumeData',
  'moving', 'uploading', 'forcedUP', 'stalledUP', 'queuedUP', 'stoppedDL', 'pausedDL', 'stoppedUP', 'pausedUP', 'error', 'missingFiles'];
function torrentSorter() {
  const { k, d } = store.get('sort', { k: 'added_on', d: -1 });
  const val = (t) => k === 'state' ? SORT_STATE.indexOf(t.state)
    : k === 'eta' ? (t.progress >= 1 || isStopped(t) || !(t.eta >= 0) || t.eta >= 8640000 ? Infinity : t.eta)
    : k === 'save_path' ? normalize(t.save_path)
    : k === 'category' || k === 'tags' ? (t[k] || '\uffff') : t[k];
  return (a, b) => {
    const x = val(a), y = val(b);
    const c = typeof x === 'string' || typeof y === 'string' ? coll.compare(String(x ?? ''), String(y ?? '')) : (x ?? 0) - (y ?? 0);
    return (c || b.added_on - a.added_on) * (c ? d : 1);
  };
}
function sortTh(key, label, cls = '') {
  const { k, d } = store.get('sort', { k: 'added_on', d: -1 });
  return `<th class="${cls}" data-sort="${key}" title="Trier par ${label.toLowerCase()}">${label}${k === key ? `<span class="arr">${d > 0 ? '▲' : '▼'}</span>` : ''}</th>`;
}
document.addEventListener('click', (e) => {
  const th = e.target.closest('th[data-sort]');
  if (!th) return;
  const cur = store.get('sort', { k: 'added_on', d: -1 }), k = th.dataset.sort;
  // Premier clic : ordre croissant (décroissant pour les nombres où le plus grand intéresse)
  const desc = ['size', 'progress', 'dlspeed', 'upspeed', 'ratio'].includes(k);
  store.set('sort', cur.k === k ? { k, d: -cur.d } : { k, d: desc ? -1 : 1 });
  renderTorrentsView();
});

/* ---------- Clic droit / menu Édition : actions supplémentaires ---------- */
const selTorrents = () => state.torrents.filter((t) => state.sel.has(t.hash));
const allSel = (fn) => { const l = selTorrents(); return l.length > 0 && l.every(fn); };
function torrentExtraItems(s) {
  const n = state.sel.size, ts = selTorrents();
  const done = ts.length && ts.every((t) => t.progress >= 1);
  const copy = [['copy:name', 'Nom'], ['copy:infohash_v1', 'Info hash v1'], ['copy:infohash_v2', 'Info hash v2'], ['copy:magnet_uri', 'Lien magnet'],
    ['copy:hash', 'ID du torrent'], ['copy:comment', 'Commentaire'], ['copy:content_path', 'Chemin du contenu']];
  return [
    '-', ['rename', 'Renommer…', null, n !== 1], ...torrentCatTagItems(s),
    ['dllimit', 'Limiter la vitesse de téléchargement…', null, !s], ['uplimit', 'Limiter la vitesse d\'envoi…', null, !s],
    ['ratio', 'Limiter le ratio de partage…', null, !s],
    '-', ['autotmm', 'Gestion de torrent automatique', null, !s, s ? allSel((t) => t.auto_tmm) : false],
    ['seq', 'Télécharger en ordre séquentiel', null, !s || done, s ? allSel((t) => t.seq_dl) : false],
    ['flp', 'Télécharger les premiers et derniers morceaux en premier', null, !s || done, s ? allSel((t) => t.f_l_piece_prio) : false],
    ['superseed', 'Mode super partage', null, !s || !done, s ? allSel((t) => t.super_seeding) : false],
    '-', ['copymenu', 'Copier', null, !s, null, copy], ['export', 'Exporter le .torrent', null, !s],
  ];
}
// Renvoie true si l'action a été prise en charge ici
async function runTorrentMenu(a, hs) {
  // Menu contextuel du panneau de détails (préfixe « d: »)
  if (a.startsWith('d:')) { runDetailAction(a.slice(2)); return true; }
  // Menu contextuel du lecteur RSS (préfixe « r: »)
  if (a.startsWith('r:')) { runRssAction(a.slice(2)); return true; }
  // Catégories, étiquettes, trackers (préfixe « f: »)
  if (a.startsWith('f:')) { runFilterAction(a.slice(2)); return true; }
  const n = hs.length, H = hs.join('|'), ts = selTorrents();
  // qBittorrent peut mettre quelques secondes à renvoyer le changement : on l'affiche tout de suite
  const local = (key, want) => { ts.forEach((t) => { t[key] = want; }); renderTorrentRows(); if (det.hash) renderDetails(); };
  const toggle = async (path, key, label) => {
    const want = !ts.every((t) => t[key]);
    const todo = ts.filter((t) => !!t[key] !== want).map((t) => t.hash);
    if (todo.length && await apiAct(path, { hashes: todo.join('|') })) { local(key, want); toast(`${label} ${want ? 'activé' : 'désactivé'}`); }
  };
  if (a.startsWith('copy:')) {
    const k = a.slice(5);
    const labels = { name: 'Nom', infohash_v1: 'Info hash v1', infohash_v2: 'Info hash v2', magnet_uri: 'Lien magnet', hash: 'ID du torrent', comment: 'Commentaire', content_path: 'Chemin du contenu' };
    const vals = ts.map((t) => t[k] || '').filter(Boolean);
    if (!vals.length) { toast(`${labels[k]} : non disponible pour ${n > 1 ? 'ces torrents' : 'ce torrent'}`, true); return true; }
    copyText(vals.join('\n'), labels[k]);
    return true;
  }
  switch (a) {
    case 'rename': renameTorrentDialog(ts[0]); return true;
    case 'dllimit': case 'uplimit': limitDialog(a === 'dllimit' ? 'dl' : 'up', hs); return true;
    case 'ratio': shareLimitDialog(ts); return true;
    case 'seq': await toggle('torrents/toggleSequentialDownload', 'seq_dl', 'Téléchargement séquentiel'); return true;
    case 'flp': await toggle('torrents/toggleFirstLastPiecePrio', 'f_l_piece_prio', 'Premiers et derniers morceaux en premier :'); return true;
    case 'superseed': {
      const want = !ts.every((t) => t.super_seeding);
      if (await apiAct('torrents/setSuperSeeding', { hashes: H, value: String(want) })) { local('super_seeding', want); toast(`Mode super partage ${want ? 'activé' : 'désactivé'}`); }
      return true;
    }
    case 'autotmm': {
      const want = !ts.every((t) => t.auto_tmm);
      const go = async () => { if (await apiAct('torrents/setAutoManagement', { hashes: H, enable: String(want) })) { local('auto_tmm', want); toast(`Gestion automatique ${want ? 'activée' : 'désactivée'}`); } };
      if (!want) { await go(); return true; }
      // Comme l'interface d'origine : confirmation, car les fichiers peuvent être déplacés
      dialog({ title: 'Gestion de torrent automatique', ok: 'Activer',
        body: `<span>En mode automatique, l'emplacement d'un torrent dépend de sa catégorie : les fichiers de ${n > 1 ? `ces ${n} torrents` : 'ce torrent'} peuvent être <b>déplacés</b> vers le dossier de leur catégorie (ou le dossier par défaut s'ils n'en ont pas).</span>`,
        onOk: go });
      return true;
    }
    case 'export':
      if (n > 5) toast(`Export de ${n} fichiers .torrent : autorisez les téléchargements multiples si le navigateur le demande`);
      // Téléchargé puis enregistré sous le nom du torrent (le nom envoyé par le serveur perd les accents)
      for (const t of ts) {
        let r;
        try { r = await api('torrents/export?hash=' + t.hash); } catch (e) { if (e.message !== 'session') toast('Le NAS ne répond pas.', true); return true; }
        if (!r.ok) { toast(`${t.name} : ${errText(r.status)}`, true); continue; }
        const url = URL.createObjectURL(await r.blob()), a2 = document.createElement('a');
        a2.href = url; a2.download = (t.name || t.hash).replace(/[\\/:*?"<>|]/g, '_') + '.torrent';
        document.body.appendChild(a2); a2.click(); a2.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        await sleep(250);
      }
      return true;
  }
  return false;
}

/* ---------- Fenêtres : renommer, limites, ratio ---------- */
function renameTorrentDialog(t) {
  if (!t) return;
  dialog({ title: 'Renommer le torrent', ok: 'Renommer',
    body: `<label>Nouveau nom<input class="field" id="rn" value="${esc(t.name)}" spellcheck="false"></label>
      <span class="muted" style="font-size:12.5px">Seul le nom affiché change ; les fichiers sur le disque gardent leur nom (voir l'onglet Fichiers pour les renommer).</span>`,
    onOpen: (bd) => { const i = bd.querySelector('#rn'); i.select(); },
    onOk: async (bd, err) => {
      const name = bd.querySelector('#rn').value.trim();
      if (!name) { err('Le nom ne peut pas être vide.'); return false; }
      if (name === t.name) return;
      if (!(await apiAct('torrents/rename', { hash: t.hash, name }, 'Torrent renommé'))) return false;
    } });
}
// kind : 'dl' ou 'up' ; valeur en Kio/s, 0 = illimité (l'API attend des octets/s)
async function limitDialog(kind, hs) {
  let cur = null;
  try {
    const r = await post(kind === 'dl' ? 'torrents/downloadLimit' : 'torrents/uploadLimit', { hashes: hs.join('|') });
    if (r.ok) { const vals = [...new Set(Object.values(await r.json()))]; if (vals.length === 1) cur = vals[0]; }
  } catch (e) { if (e.message === 'session') return; }
  const n = hs.length, what = kind === 'dl' ? 'téléchargement' : 'envoi';
  const kib = cur > 0 ? Math.round(cur / 1024) : 0;
  dialog({ title: `Limiter la vitesse de ${what}`, ok: 'Appliquer',
    body: `<span>${n > 1 ? `${n} torrents` : 'Torrent sélectionné'}${cur === null && n > 1 ? ' (limites actuelles différentes)' : ''}</span>
      <label>Vitesse maximale (Kio/s)<input class="field" id="lim" type="number" min="0" step="1" value="${kib}"></label>
      <span class="muted" style="font-size:12.5px">0 = pas de limite propre à ce torrent (les limites globales s'appliquent toujours).</span>`,
    onOk: async (bd, err) => {
      const v = Number(bd.querySelector('#lim').value);
      if (!Number.isFinite(v) || v < 0) { err('Indiquez un nombre positif, ou 0.'); return false; }
      const ok = await apiAct(kind === 'dl' ? 'torrents/setDownloadLimit' : 'torrents/setUploadLimit',
        { hashes: hs.join('|'), limit: String(Math.round(v * 1024)) }, v ? `Limite de ${what} : ${v} Kio/s` : `Limite de ${what} retirée`);
      if (!ok) return false;
    } });
}
// Valeurs de l'API : -2 = limite globale, -1 = pas de limite
function shareLimitDialog(ts) {
  const t = ts[0] || {}, one = ts.length === 1;
  const mode = !one || t.ratio_limit === -2 && t.seeding_time_limit === -2 && t.inactive_seeding_time_limit === -2 ? 'default'
    : t.ratio_limit === -1 && t.seeding_time_limit === -1 && t.inactive_seeding_time_limit === -1 ? 'none' : 'custom';
  const num = (v, d) => (one && v >= 0 ? v : d);
  const sel = (id, opts, cur) => `<select class="field" id="${id}">${opts.map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  dialog({ title: 'Limitation du ratio de partage', ok: 'Enregistrer',
    body: `${one ? '' : `<span>${ts.length} torrents</span>`}
      <label class="radio"><input type="radio" name="sl" value="default" ${mode === 'default' ? 'checked' : ''}> Utiliser les limites globales de partage</label>
      <label class="radio"><input type="radio" name="sl" value="none" ${mode === 'none' ? 'checked' : ''}> Ne pas limiter le partage</label>
      <label class="radio"><input type="radio" name="sl" value="custom" ${mode === 'custom' ? 'checked' : ''}> Limiter le partage à</label>
      <div class="sub-fields" id="slc">
        <label class="chk"><input type="checkbox" id="sl-r" ${one && t.ratio_limit >= 0 ? 'checked' : ''}> ratio <input class="field" id="sl-rv" type="number" min="0" step="0.01" value="${num(t.ratio_limit, 1)}" style="width:110px"></label>
        <label class="chk"><input type="checkbox" id="sl-t" ${one && t.seeding_time_limit >= 0 ? 'checked' : ''}> minutes totales <input class="field" id="sl-tv" type="number" min="0" step="1" value="${num(t.seeding_time_limit, 1440)}" style="width:110px"></label>
        <label class="chk"><input type="checkbox" id="sl-i" ${one && t.inactive_seeding_time_limit >= 0 ? 'checked' : ''}> minutes inactives <input class="field" id="sl-iv" type="number" min="0" step="1" value="${num(t.inactive_seeding_time_limit, 60)}" style="width:110px"></label>
        <label>Quand plusieurs limites sont définies${sel('sl-m', [['Default', 'Par défaut (dès qu\'une limite est atteinte)'], ['MatchAny', 'Dès qu\'une limite est atteinte'], ['MatchAll', 'Quand toutes les limites sont atteintes']], one ? t.share_limits_mode : 'Default')}</label>
        <label>Action lorsque la limite est atteinte${sel('sl-a', [['Default', 'Par défaut (réglage global)'], ['Stop', 'Arrêter le torrent'], ['Remove', 'Retirer le torrent'], ['RemoveWithContent', 'Retirer le torrent et son contenu'], ['EnableSuperSeeding', 'Activer le super partage pour ce torrent']], one ? t.share_limit_action : 'Default')}</label>
      </div>`,
    onOpen: (bd) => {
      const upd = () => { const c = bd.querySelector('[name=sl]:checked').value === 'custom'; bd.querySelector('#slc').classList.toggle('off', !c); bd.querySelectorAll('#slc input, #slc select').forEach((x) => { x.disabled = !c; }); };
      bd.querySelectorAll('[name=sl]').forEach((x) => x.addEventListener('change', upd)); upd();
    },
    onOk: async (bd, err) => {
      const m = bd.querySelector('[name=sl]:checked').value, q = (id) => bd.querySelector(id);
      let r = -2, st = -2, it = -2, act = 'Default', mode2 = 'Default';
      if (m === 'none') r = st = it = -1;
      if (m === 'custom') {
        r = q('#sl-r').checked ? Number(q('#sl-rv').value) : -1;
        st = q('#sl-t').checked ? Math.round(Number(q('#sl-tv').value)) : -1;
        it = q('#sl-i').checked ? Math.round(Number(q('#sl-iv').value)) : -1;
        if ([r, st, it].some((v) => !Number.isFinite(v) || (v < 0 && v !== -1))) { err('Valeurs invalides.'); return false; }
        if (r === -1 && st === -1 && it === -1) { err('Cochez au moins une limite, ou choisissez « Ne pas limiter le partage ».'); return false; }
        act = q('#sl-a').value; mode2 = q('#sl-m').value;
      }
      const ok = await apiAct('torrents/setShareLimits', { hashes: ts.map((x) => x.hash).join('|'), ratioLimit: String(r), seedingTimeLimit: String(st),
        inactiveSeedingTimeLimit: String(it), shareLimitAction: act, shareLimitsMode: mode2 }, 'Limites de partage enregistrées');
      if (!ok) return false;
    } });
}

/* ---------- Panneau de détails ---------- */
const PRIO = { 0: 'Ne pas télécharger', 1: 'Normale', 6: 'Haute', 7: 'Maximale', 4: 'Normale' };
const fmtLimit = (v) => (v > 0 ? fmtSize(v) + '/s' : '∞');
function infoExtraRows(t, p) {
  if (!t) return [];
  const yesNo = (v) => (v === true ? 'Oui' : v === false ? 'Non' : '—');
  return [
    ['Temps actif', fmtDur(t.time_active)],
    ['Temps de partage', t.seeding_time > 0 ? fmtDur(t.seeding_time) : '—'],
    ['Connexions', p.nb_connections >= 0 ? `${p.nb_connections} (${p.nb_connections_limit > 0 ? `max. ${p.nb_connections_limit}` : 'illimité'})` : '—'],
    ['Limites de vitesse', `↓ ${fmtLimit(p.dl_limit)} · ↑ ${fmtLimit(p.up_limit)}`],
    ['Gaspillé', fmtSize(p.total_wasted || 0)],
    ['Réannoncer dans', p.reannounce > 0 ? fmtDur(p.reannounce) : '—'],
    ['Dernière fois vu complet', fmtDate(p.last_seen)],
    ['Popularité', p.popularity >= 0 ? p.popularity.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : '—'],
    ['Catégorie', t.category || '—'],
    ['Étiquettes', t.tags || '—'],
    ['Options', [t.auto_tmm && 'gestion automatique', t.seq_dl && 'ordre séquentiel', t.f_l_piece_prio && 'premiers et derniers morceaux en premier',
      t.super_seeding && 'super partage', t.force_start && 'démarrage forcé'].filter(Boolean).join(', ') || '—'],
    ['Privé', yesNo(p.is_private ?? p.private)],
    ['Créé par', p.created_by || '—'],
    ['Créé le', fmtDate(p.creation_date)],
  ];
}
function infoHashRows(t) {
  if (!t) return [];
  const mono = (v) => (v ? `<code style="user-select:all">${esc(v)}</code>` : '—');
  return [['Info hash v1', mono(t.infohash_v1), true, true], ['Info hash v2', mono(t.infohash_v2), true, true],
    ...(t.download_path ? [['Dossier des téléchargements en cours', esc(normalize(t.download_path)), true, true]] : [])];
}
// Barre d'actions au-dessus de chaque onglet
function detToolHTML(tab) {
  const n = [...det.sel].filter((x) => x[0] === { files: 'f', trackers: 't', peers: 'p', webseeds: 'w' }[tab]).length;
  const b = (a, l, dis = false) => `<button class="btn" data-dact="${a}" ${dis ? 'disabled' : ''}>${l}</button>`;
  const tip = '<span class="muted" style="font-size:12px">Clic : sélectionner · Ctrl+clic : plusieurs · clic droit : actions</span>';
  if (tab === 'files' && det.files && det.files.length) {
    return `<div class="dtool">${b('fprio:7', 'Priorité maximale', !n)}${b('fprio:6', 'Haute', !n)}${b('fprio:1', 'Normale', !n)}${b('fprio:0', 'Ne pas télécharger', !n)}
      ${b('frename', 'Renommer…', n !== 1)}${b('fmulti', 'Renommer les fichiers…')}<span class="grow"></span>${tip}</div>`;
  }
  if (tab === 'trackers') {
    return `<div class="dtool">${b('tadd', 'Ajouter des trackers…')}${b('tedit', 'Modifier l\'URL du tracker…', n !== 1)}${b('tdel', 'Retirer le tracker', !n)}
      ${b('tannounce', 'Forcer la réannonce à tous les trackers')}<span class="grow"></span>${tip}</div>`;
  }
  if (tab === 'peers') return `<div class="dtool">${b('padd', 'Ajouter des pairs…')}${b('pcopy', 'Copier l\'IP:port', !n)}${b('pban', 'Bannir le pair indéfiniment', !n)}<span class="grow"></span>${tip}</div>`;
  if (tab === 'webseeds') return `<div class="dtool">${b('wadd', 'Ajouter les sources Web…')}${b('wedit', 'Modifier l\'URL de la source Web…', n !== 1)}${b('wdel', 'Supprimer la source Web', !n)}<span class="grow"></span>${tip}</div>`;
  return '';
}
function webseedsHTML() {
  const list = det.webseeds || [];
  if (!list.length) return `<div class="empty" style="padding:30px"><strong>Aucune source HTTP</strong><span>Une source HTTP (web seed) est une adresse web d'où qBittorrent peut aussi télécharger le contenu.</span></div>`;
  return `<table><thead><tr><th>Adresse</th></tr></thead><tbody>${list.map((w) => `<tr data-drow="w${esc(w.url)}" class="${det.sel.has('w' + w.url) ? 'dsel' : ''}"><td style="overflow-wrap:anywhere">${esc(w.url)}</td></tr>`).join('')}</tbody></table>`;
}
const detSel = (prefix) => [...det.sel].filter((x) => x[0] === prefix).map((x) => x.slice(1));
const fileById = (id) => (det.files || []).find((f, i) => String(f.index ?? i) === String(id));

// Sélection des lignes du panneau (clic, Ctrl+clic, Maj+clic)
let detAnchor = null;
document.addEventListener('click', (e) => {
  const row = e.target.closest('#dbody tr[data-drow]');
  if (!row || e.target.closest('input, a, .folderlink')) return;
  const id = row.dataset.drow;
  if (e.ctrlKey || e.metaKey) det.sel.has(id) ? det.sel.delete(id) : det.sel.add(id);
  else if (e.shiftKey && detAnchor) {
    const rows = [...document.querySelectorAll('#dbody tr[data-drow]')].map((r) => r.dataset.drow);
    const [i, j] = [rows.indexOf(detAnchor), rows.indexOf(id)].sort((x, y) => x - y);
    if (i >= 0) rows.slice(i, j + 1).forEach((x) => det.sel.add(x));
  } else det.sel = new Set([id]);
  detAnchor = id;
  renderDetails();
});
document.addEventListener('contextmenu', (e) => {
  const row = e.target.closest('#dbody tr[data-drow]');
  if (!row) return;
  e.preventDefault();
  const id = row.dataset.drow;
  if (!det.sel.has(id)) { det.sel = new Set([id]); renderDetails(); }
  const n = det.sel.size, k = id[0];
  const items = k === 'f' ? [
    ['fprio:7', 'Priorité maximale'], ['fprio:6', 'Priorité haute'], ['fprio:1', 'Priorité normale'], ['fprio:0', 'Ne pas télécharger'],
    '-', ['frename', 'Renommer…', null, n !== 1], ...(folderOf(id) ? [['frenamedir', `Renommer le dossier « ${base(folderOf(id))} »…`, null, n !== 1]] : []),
    ['fcopy', 'Copier le chemin'],
  ] : k === 't' ? [
    ['tadd', 'Ajouter des trackers…'], ['tedit', 'Modifier l\'URL du tracker…', null, n !== 1], ['tdel', 'Retirer le tracker'],
    ['tcopy', 'Copier l\'URL du tracker'], '-', ['tannounce', 'Forcer la réannonce à tous les trackers'],
  ] : k === 'p' ? [['padd', 'Ajouter des pairs…'], ['pcopy', 'Copier l\'IP:port'], ['pban', 'Bannir le pair indéfiniment']]
    : [['wadd', 'Ajouter les sources Web…'], ['wedit', 'Modifier l\'URL de la source Web…', null, n !== 1], ['wdel', 'Supprimer la source Web'], ['wcopy', 'Copier l\'URL de la source Web']];
  showMenu(items.map((it) => (Array.isArray(it) ? ['d:' + it[0], ...it.slice(1)] : it)), e.clientX, e.clientY);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-dact]');
  if (b && !b.disabled) runDetailAction(b.dataset.dact);
});
function folderOf(id) {
  const f = id && id[0] === 'f' ? fileById(id.slice(1)) : null;
  if (!f) return '';
  const i = f.name.lastIndexOf('/');
  return i > 0 ? f.name.slice(0, i) : '';
}

async function runDetailAction(a) {
  const h = det.hash;
  if (!h) return;
  const reload = () => { det.sel.clear(); loadDetails(); };
  if (a.startsWith('fprio:')) {
    const ids = detSel('f');
    if (!ids.length) return;
    if (await apiAct('torrents/filePrio', { hash: h, id: ids.join('|'), priority: a.slice(6) }, `Priorité modifiée (${ids.length} fichier${ids.length > 1 ? 's' : ''})`)) loadDetails();
    return;
  }
  switch (a) {
    case 'frename': { const f = fileById(detSel('f')[0]); if (f) renamePathDialog('file', f.name, reload); return; }
    case 'frenamedir': { const d = folderOf('f' + detSel('f')[0]); if (d) renamePathDialog('folder', d, reload); return; }
    case 'fcopy': return copyText(detSel('f').map((id) => (fileById(id) || {}).name).filter(Boolean).join('\n'), 'Chemin');
    case 'fmulti': return multiRenameDialog(reload);
    case 'tadd': return textListDialog({ title: 'Ajouter des trackers', label: 'Adresses des trackers (une par ligne)', ok: 'Ajouter',
      check: (l) => /^(https?|udp|wss?):\/\//i.test(l), bad: 'Adresse de tracker invalide',
      send: (lines) => apiAct('torrents/addTrackers', { hash: h, urls: lines.join('\n') }, 'Trackers ajoutés'), after: reload });
    case 'tedit': {
      const url = detSel('t')[0];
      return editUrlDialog('Modifier l\'URL du tracker', url, (nu) => apiAct('torrents/editTracker', { hash: h, url, newUrl: nu }, 'Tracker modifié'), reload);
    }
    case 'tdel': {
      const urls = detSel('t');
      if (urls.length && await apiAct('torrents/removeTrackers', { hash: h, urls: urls.map(encodeURIComponent).join('|') }, `${urls.length} tracker${urls.length > 1 ? 's' : ''} retiré${urls.length > 1 ? 's' : ''}`)) reload();
      return;
    }
    case 'tcopy': return copyText(detSel('t').join('\n'), 'URL du tracker');
    case 'tannounce': { if (await apiAct('torrents/reannounce', { hashes: h }, 'Réannonce envoyée à tous les trackers')) setTimeout(loadDetails, 1500); return; }
    case 'padd': return textListDialog({ title: 'Ajouter des pairs', label: 'Pairs au format IP:port (un par ligne)', ok: 'Ajouter',
      check: (l) => /^(\[[0-9a-f:.]+\]|[0-9a-z.-]+):\d{1,5}$/i.test(l), bad: 'Format attendu : IP:port (ex. 203.0.113.5:51413)',
      send: (lines) => apiAct('torrents/addPeers', { hashes: h, peers: lines.join('|') }, 'Pairs ajoutés'), after: reload });
    case 'pcopy': return copyText(detSel('p').join('\n'), 'IP:port');
    case 'pban': {
      const peers = detSel('p');
      if (!peers.length) return;
      dialog({ title: 'Bannir des pairs', ok: 'Bannir', body: `<span>Êtes-vous sûr de vouloir bannir les pairs sélectionnés de façon permanente ?</span><ul class="addlist">${peers.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ul>
        <span class="muted" style="font-size:12.5px">La liste des adresses bannies se gère dans Outils › Réglages › Connexion.</span>`,
        onOk: async () => { if (!(await apiAct('transfer/banPeers', { peers: peers.join('|') }, 'Pairs bannis'))) return false; reload(); } });
      return;
    }
    case 'wadd': return textListDialog({ title: 'Ajouter les sources Web', label: 'Adresses (une par ligne)', ok: 'Ajouter',
      check: (l) => /^https?:\/\//i.test(l), bad: 'Adresse invalide (http:// ou https://)',
      send: (lines) => apiAct('torrents/addWebSeeds', { hash: h, urls: lines.map(encodeURIComponent).join('|') }, 'Sources ajoutées'), after: reload });
    case 'wedit': {
      const url = detSel('w')[0];
      return editUrlDialog('Modifier l\'URL de la source Web', url, (nu) => apiAct('torrents/editWebSeed', { hash: h, origUrl: url, newUrl: nu }, 'Source modifiée'), reload);
    }
    case 'wdel': {
      const urls = detSel('w');
      if (urls.length && await apiAct('torrents/removeWebSeeds', { hash: h, urls: urls.map(encodeURIComponent).join('|') }, 'Source supprimée')) reload();
      return;
    }
    case 'wcopy': return copyText(detSel('w').join('\n'), 'URL de la source Web');
  }
}
function textListDialog({ title, label, ok, check, bad, send, after }) {
  dialog({ title, ok, body: `<label>${label}<textarea class="field" id="tl" rows="6" spellcheck="false"></textarea></label>`,
    onOk: async (bd, err) => {
      const lines = bd.querySelector('#tl').value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      if (!lines.length) { err('Saisissez au moins une ligne.'); return false; }
      const wrong = lines.find((l) => !check(l));
      if (wrong) { err(`${bad} : ${wrong.slice(0, 80)}`); return false; }
      if (!(await send(lines))) return false;
      after();
    } });
}
function editUrlDialog(title, url, send, after) {
  if (!url) return;
  dialog({ title, ok: 'Enregistrer', body: `<label>Nouvelle adresse<input class="field" id="eu" value="${esc(url)}" spellcheck="false"></label>`,
    onOk: async (bd, err) => {
      const nu = bd.querySelector('#eu').value.trim();
      if (!/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(nu)) { err('Adresse invalide.'); return false; }
      if (nu === url) return;
      if (!(await send(nu))) return false;
      after();
    } });
}
// Renomme un fichier ou un dossier du torrent (chemin relatif au torrent)
function renamePathDialog(kind, oldPath, after) {
  const i = oldPath.lastIndexOf('/'), dir = i >= 0 ? oldPath.slice(0, i + 1) : '', name = oldPath.slice(i + 1);
  dialog({ title: kind === 'file' ? 'Renommer le fichier' : 'Renommer le dossier', ok: 'Renommer',
    body: `${dir ? `<span class="muted" style="font-size:12.5px">Dans : ${esc(dir)}</span>` : ''}<label>Nouveau nom<input class="field" id="np" value="${esc(name)}" spellcheck="false"></label>`,
    onOpen: (bd) => { const inp = bd.querySelector('#np'); const dot = kind === 'file' ? name.lastIndexOf('.') : -1; inp.setSelectionRange(0, dot > 0 ? dot : name.length); },
    onOk: async (bd, err) => {
      const nn = bd.querySelector('#np').value.trim();
      if (!nn || /[\\/]/.test(nn) || nn === '.' || nn === '..') { err('Nom invalide (pas de / ni de \\).'); return false; }
      if (nn === name) return;
      const ok = await apiAct(kind === 'file' ? 'torrents/renameFile' : 'torrents/renameFolder', { hash: det.hash, oldPath, newPath: dir + nn }, 'Renommé');
      if (!ok) return false;
      after();
    } });
}
// Renommage multiple par rechercher / remplacer sur les noms de fichiers
function multiRenameDialog(after) {
  const files = (det.files || []).map((f, i) => ({ ...f, idx: f.index ?? i }));
  const sel = new Set(detSel('f'));
  const scope = sel.size ? files.filter((f) => sel.has(String(f.idx))) : files;
  let plan = [];
  dialog({ title: 'Renommer les fichiers', ok: 'Renommer', wide: true,
    body: `<span class="muted" style="font-size:12.5px">${sel.size ? `${scope.length} fichier${scope.length > 1 ? 's' : ''} sélectionné${scope.length > 1 ? 's' : ''}` : `Tous les fichiers (${files.length})`} — seul le nom du fichier est modifié, pas son dossier.</span>
      <label>Rechercher<input class="field" id="mr-f" spellcheck="false"></label>
      <label>Remplacer par<input class="field" id="mr-r" spellcheck="false"></label>
      <div style="display:flex;gap:18px;flex-wrap:wrap">
        <label class="chk"><input type="checkbox" id="mr-x"> Expression régulière</label>
        <label class="chk"><input type="checkbox" id="mr-c"> Respecter la casse</label>
        <label class="chk"><input type="checkbox" id="mr-a" checked> Toutes les occurrences</label>
        <label class="chk"><input type="checkbox" id="mr-e"> Inclure l'extension</label></div>
      <div class="preview" id="mr-p"></div>`,
    onOpen: (bd) => {
      const q = (id) => bd.querySelector(id);
      const upd = () => {
        const find = q('#mr-f').value, repl = q('#mr-r').value;
        plan = []; q('#mr-p').innerHTML = '';
        if (!find) { q('#mr-p').innerHTML = '<div class="muted" style="padding:8px">Saisissez le texte à rechercher.</div>'; return; }
        let re;
        try {
          const src = q('#mr-x').checked ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          re = new RegExp(src, (q('#mr-c').checked ? '' : 'i') + (q('#mr-a').checked ? 'g' : ''));
        } catch (e) { q('#mr-p').innerHTML = `<div style="padding:8px;color:var(--red)">Expression invalide : ${esc(e.message)}</div>`; return; }
        for (const f of scope) {
          const i = f.name.lastIndexOf('/'), dir = f.name.slice(0, i + 1), nm = f.name.slice(i + 1);
          const dot = q('#mr-e').checked ? -1 : nm.lastIndexOf('.');
          const stem = dot > 0 ? nm.slice(0, dot) : nm, ext = dot > 0 ? nm.slice(dot) : '';
          const nn = stem.replace(re, repl) + ext;
          if (nn !== nm && nn && !/[\\/]/.test(nn)) plan.push({ old: f.name, neu: dir + nn, nm, nn });
        }
        q('#mr-p').innerHTML = plan.length ? `<table>${plan.slice(0, 200).map((x) => `<tr><td class="old">${esc(x.nm)}</td><td>→</td><td>${esc(x.nn)}</td></tr>`).join('')}</table>`
          : '<div class="muted" style="padding:8px">Aucun nom ne change.</div>';
      };
      bd.querySelectorAll('input').forEach((x) => x.addEventListener('input', upd));
      upd();
    },
    onOk: async (bd, err) => {
      if (!plan.length) { err('Aucun fichier à renommer.'); return false; }
      const names = new Set(plan.map((x) => x.neu));
      if (names.size !== plan.length) { err('Plusieurs fichiers auraient le même nom.'); return false; }
      let done = 0;
      for (const x of plan) {
        let r;
        try { r = await post('torrents/renameFile', { hash: det.hash, oldPath: x.old, newPath: x.neu }); } catch (e) { if (e.message === 'session') return; break; }
        if (!r.ok) { err(`Arrêt après ${done} fichier${done > 1 ? 's' : ''} : « ${x.nm} » refusé (${errText(r.status)})`); after(); return false; }
        done++;
      }
      toast(`${done} fichier${done > 1 ? 's' : ''} renommé${done > 1 ? 's' : ''}`);
      after();
    } });
}
