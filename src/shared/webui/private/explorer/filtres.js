// SPDX-License-Identifier: GPL-2.0-or-later
// Interface explorateur — barre latérale : filtres par état, catégories,
// étiquettes et trackers (avec leurs menus contextuels), et affectation des
// catégories et étiquettes aux torrents.
//
// Endpoints (API WebUI v2, vérifiés dans le wiki « WebUI API (qBittorrent 5.0) »
// et dans le code source de qBittorrent 5.3.0) : torrents/createCategory,
// torrents/editCategory (category, savePath, downloadPathEnabled, downloadPath),
// torrents/removeCategories (catégories séparées par des retours à la ligne),
// torrents/setCategory, torrents/createTags, torrents/deleteTags,
// torrents/addTags, torrents/removeTags (étiquettes séparées par des virgules),
// torrents/removeTrackers (hash « * » = tous les torrents), torrents/start,
// torrents/stop, torrents/setForceStart. Catégories, étiquettes et trackers
// viennent de sync/maindata.
// Les définitions des filtres d'état reprennent celles de l'interface d'origine
// (scripts/dynamicTable.js, applyFilter).
'use strict';

const has = (t, s) => t.state.includes(s);
function statusFilters() {
  return [
    ['all', 'Tous', () => true],
    ['downloading', 'En téléchargement', (t) => t.state === 'downloading' || has(t, 'DL')],
    ['seeding', 'En partage', (t) => ['uploading', 'forcedUP', 'stalledUP', 'queuedUP', 'checkingUP'].includes(t.state)],
    ['completed', 'Complété', (t) => t.state === 'uploading' || has(t, 'UP')],
    ['running', 'En cours', (t) => !has(t, 'stopped') && !has(t, 'paused')],
    ['stopped', 'Arrêté', (t) => has(t, 'stopped') || has(t, 'paused')],
    ['active', 'Actif', (t) => t.upspeed > 0 || t.dlspeed > 0],
    ['inactive', 'Inactif', (t) => !(t.upspeed > 0 || t.dlspeed > 0)],
    ['stalled', 'Dormant', (t) => t.state === 'stalledUP' || t.state === 'stalledDL'],
    ['stalled_uploading', 'Dormant en envoi', (t) => t.state === 'stalledUP'],
    ['stalled_downloading', 'Dormant en téléchargement', (t) => t.state === 'stalledDL'],
    ['checking', 'En vérification', (t) => ['checkingUP', 'checkingDL', 'checkingResumeData'].includes(t.state)],
    ['moving', 'En déplacement', (t) => t.state === 'moving'],
    ['errored', 'Erroné', (t) => ['error', 'unknown', 'missingFiles'].includes(t.state)],
  ];
}
// Anciennes valeurs mémorisées par l'explorateur (avant la version 5.3.4.0)
const LEGACY_FILTER = { done: 'completed', error: 'errored', active: 'downloading' };
const migrateFilter = (f) => LEGACY_FILTER[f] || f;
// Filtres toujours affichés même s'ils sont vides ; les autres sont masqués à 0
const ALWAYS_SHOWN = new Set(['all', 'downloading', 'completed', 'stopped']);

/* ---------- Trackers : regroupés par hôte ---------- */
function trackerHost(url) {
  try { return new URL(url).hostname || url; } catch (_) { return url; }
}
function trackerHosts() {
  const m = new Map(); // hôte -> { urls: Set, hashes: Set }
  for (const [url, hs] of Object.entries(md.trackers)) {
    const h = trackerHost(url);
    if (!m.has(h)) m.set(h, { urls: new Set(), hashes: new Set() });
    const e = m.get(h); e.urls.add(url); hs.forEach((x) => e.hashes.add(x));
  }
  return m;
}
const TRK_SPECIAL = [['__none', 'Sans tracker', (t) => !t.trackers_count], ['__err', 'Erreur du tracker', (t) => t.has_tracker_error],
  ['__other', 'Autre erreur', (t) => t.has_other_announce_error], ['__warn', 'Avertissement', (t) => t.has_tracker_warning]];

const tagsOf = (t) => (t.tags ? t.tags.split(', ').filter(Boolean) : []);
// Filtre combiné : catégorie, étiquette, tracker (l'état est géré par FILTERS)
function sideFilter(t, hosts = null) {
  const c = state.cat;
  if (c !== null && c !== undefined) { if (c === '' ? t.category : !(t.category === c || t.category.startsWith(c + '/'))) return false; }
  const g = state.tag;
  if (g !== null && g !== undefined) { if (g === '' ? tagsOf(t).length : !tagsOf(t).includes(g)) return false; }
  const k = state.tracker;
  if (k) {
    const sp = TRK_SPECIAL.find((x) => x[0] === k);
    if (sp) return !!sp[2](t);
    const e = (hosts || trackerHosts()).get(k);
    if (!e || !e.hashes.has(t.hash)) return false;
  }
  return true;
}

/* ---------- Rendu de la barre latérale ---------- */
const sideOpen = (k) => store.get('side_' + k, k !== 'trackers');
function sideSection(key, title, body) {
  const open = sideOpen(key);
  return `<div class="sec" data-sidesec="${key}" style="cursor:pointer;display:flex;align-items:center;gap:4px" title="Afficher / masquer">
    <span style="display:inline-block;transform:rotate(${open ? 90 : 0}deg);transition:transform .15s">${I.caret()}</span>${title}</div>${open ? body : ''}`;
}
function navItem(attrs, label, count, on, icon = '') {
  return `<div class="nav${on ? ' on' : ''}" ${attrs}>${icon}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(label)}">${esc(label)}</span><span class="cnt">${count}</span></div>`;
}
function renderSideFilters() {
  const box = $('#sidefilters');
  if (!box) return;
  const T = state.torrents, inT = state.view === 'torrents';
  const cats = Object.keys(md.categories).sort(coll.compare);
  const tags = [...md.tags].sort(coll.compare);
  const hosts = trackerHosts();
  const cnt = (fn) => T.filter(fn).length;
  const catItems = [
    navItem('data-cat="*"', 'Toutes', T.length, inT && (state.cat === null || state.cat === undefined)),
    navItem('data-cat=""', 'Sans catégorie', cnt((t) => !t.category), inT && state.cat === ''),
    ...cats.map((c) => {
      const depth = c.split('/').length - 1, label = depth ? c.split('/').pop() : c;
      return navItem(`data-cat="${esc(c)}" style="padding-left:${14 + depth * 14}px"`, label, cnt((t) => t.category === c || t.category.startsWith(c + '/')), inT && state.cat === c, I.folder(14));
    }),
  ].join('');
  const tagItems = [
    navItem('data-tag="*"', 'Toutes', T.length, inT && (state.tag === null || state.tag === undefined)),
    navItem('data-tag=""', 'Sans étiquette', cnt((t) => !t.tags), inT && state.tag === ''),
    ...tags.map((g) => navItem(`data-tag="${esc(g)}"`, g, cnt((t) => tagsOf(t).includes(g)), inT && state.tag === g)),
  ].join('');
  const trkItems = [
    navItem('data-trk="*"', 'Tous', T.length, inT && !state.tracker),
    ...TRK_SPECIAL.map(([k, l, fn]) => navItem(`data-trk="${k}"`, l, cnt(fn), inT && state.tracker === k)),
    ...[...hosts.keys()].sort(coll.compare).map((h) => navItem(`data-trk="${esc(h)}"`, h, hosts.get(h).hashes.size, inT && state.tracker === h)),
  ].join('');
  box.innerHTML = sideSection('cats', 'Catégories', catItems) + sideSection('tags', 'Étiquettes', tagItems) + sideSection('trackers', 'Trackers', trkItems);
}

/* ---------- Clics et menus de la barre latérale ---------- */
document.addEventListener('click', (e) => {
  const sec = e.target.closest('[data-sidesec]');
  if (sec) { const k = sec.dataset.sidesec; store.set('side_' + k, !sideOpen(k)); return renderSideFilters(); }
  const c = e.target.closest('[data-cat]'), g = e.target.closest('[data-tag]'), k = e.target.closest('[data-trk]');
  if (!c && !g && !k) return;
  if (c) state.cat = c.dataset.cat === '*' ? null : c.dataset.cat;
  if (g) state.tag = g.dataset.tag === '*' ? null : g.dataset.tag;
  if (k) state.tracker = k.dataset.trk === '*' ? null : k.dataset.trk;
  store.set('sidesel', { cat: state.cat, tag: state.tag, tracker: state.tracker });
  showTorrents(state.filter, null);
});
// Torrents correspondant à un élément de la barre latérale (sans tenir compte des autres filtres)
function hashesOfSide(kind, val) {
  const saved = { cat: state.cat, tag: state.tag, tracker: state.tracker };
  Object.assign(state, { cat: null, tag: null, tracker: null }, { [kind]: val });
  const hosts = trackerHosts(), out = state.torrents.filter((t) => sideFilter(t, hosts)).map((t) => t.hash);
  Object.assign(state, saved);
  return out;
}
document.addEventListener('contextmenu', (e) => {
  const c = e.target.closest('[data-cat]'), g = e.target.closest('[data-tag]'), k = e.target.closest('[data-trk]');
  if (!c && !g && !k) return;
  e.preventDefault();
  const batch = (kind, v) => {
    const n = hashesOfSide(kind, v).length;
    const enc = encodeURIComponent(JSON.stringify([kind, v]));
    return ['-', ['f:start:' + enc, 'Démarrer les torrents', I.play(), !n], ['f:force:' + enc, 'Forcer le démarrage des torrents', null, !n],
      ['f:stop:' + enc, 'Arrêter les torrents', I.stop(), !n], ['f:remove:' + enc, 'Retirer les torrents…', I.trash(), !n]];
  };
  let items;
  if (c) {
    const v = c.dataset.cat, real = v !== '*' && v !== '';
    items = [['f:newcat', 'Ajouter une catégorie…'], ...(real ? [['f:newsub:' + v, 'Ajouter une sous-catégorie…'], ['f:editcat:' + v, 'Modifier la catégorie…'], ['f:delcat:' + v, 'Retirer la catégorie']] : []),
      ['f:delunusedcats', 'Retirer les catégories inutilisées'], ...batch('cat', v === '*' ? null : v)];
  } else if (g) {
    const v = g.dataset.tag, real = v !== '*' && v !== '';
    items = [['f:newtag', 'Ajouter une étiquette…'], ...(real ? [['f:deltag:' + v, 'Retirer l\'étiquette']] : []), ['f:delunusedtags', 'Retirer les étiquettes inutilisées'], ...batch('tag', v === '*' ? null : v)];
  } else {
    const v = k.dataset.trk, real = v !== '*' && !v.startsWith('__');
    items = [...(real ? [['f:deltrk:' + v, 'Retirer le tracker (de tous les torrents)…']] : []), ...batch('tracker', v === '*' ? null : v)];
    if (items[0] === '-') items.shift();
  }
  showMenu(items, e.clientX, e.clientY);
});

/* ---------- Actions ---------- */
async function runFilterAction(a) {
  const [verb, ...rest] = a.split(':'), arg = rest.join(':');
  const batchArgs = () => JSON.parse(decodeURIComponent(arg));
  switch (verb) {
    case 'newcat': return categoryDialog();
    case 'newsub': return categoryDialog({ parent: arg });
    case 'editcat': return categoryDialog({ name: arg });
    case 'delcat':
      if (await apiAct('torrents/removeCategories', { categories: arg }, `Catégorie « ${arg} » retirée`)) { if (state.cat === arg) state.cat = null; }
      return;
    case 'delunusedcats': {
      const used = new Set(state.torrents.map((t) => t.category).filter(Boolean));
      const unused = Object.keys(md.categories).filter((c) => ![...used].some((u) => u === c || u.startsWith(c + '/')));
      if (!unused.length) return toast('Aucune catégorie inutilisée');
      await apiAct('torrents/removeCategories', { categories: unused.join('\n') }, `${unused.length} catégorie${unused.length > 1 ? 's' : ''} retirée${unused.length > 1 ? 's' : ''}`);
      return;
    }
    case 'newtag': return tagDialog();
    case 'deltag':
      if (await apiAct('torrents/deleteTags', { tags: arg }, `Étiquette « ${arg} » retirée`)) { if (state.tag === arg) state.tag = null; }
      return;
    case 'delunusedtags': {
      const used = new Set(state.torrents.flatMap(tagsOf));
      const unused = md.tags.filter((x) => !used.has(x));
      if (!unused.length) return toast('Aucune étiquette inutilisée');
      await apiAct('torrents/deleteTags', { tags: unused.join(',') }, `${unused.length} étiquette${unused.length > 1 ? 's' : ''} retirée${unused.length > 1 ? 's' : ''}`);
      return;
    }
    case 'deltrk': {
      const e = trackerHosts().get(arg);
      if (!e) return;
      dialog({ title: 'Retirer le tracker', ok: 'Retirer',
        body: `<span>Retirer <b>${esc(arg)}</b> de ${e.hashes.size} torrent${e.hashes.size > 1 ? 's' : ''} ?</span><ul class="addlist">${[...e.urls].map((u) => `<li><span>${esc(u)}</span></li>`).join('')}</ul>`,
        onOk: async () => {
          if (!(await apiAct('torrents/removeTrackers', { hash: '*', urls: [...e.urls].map(encodeURIComponent).join('|') }, 'Tracker retiré'))) return false;
          if (state.tracker === arg) state.tracker = null;
        } });
      return;
    }
    case 'start': case 'stop': case 'force': case 'remove': {
      const [kind, v] = batchArgs(), hs = hashesOfSide(kind, v);
      if (!hs.length) return;
      if (verb === 'remove') { state.sel = new Set(hs); renderTorrentRows(); renderToolbar(); return deleteDialog(); }
      const path = verb === 'force' ? 'torrents/setForceStart' : 'torrents/' + verb;
      const n = hs.length, label = { start: 'démarré', stop: 'arrêté', force: 'en démarrage forcé' }[verb];
      await apiAct(path, { hashes: hs.join('|'), ...(verb === 'force' ? { value: 'true' } : {}) }, `${n} torrent${n > 1 ? 's' : ''} ${label}${n > 1 && verb !== 'force' ? 's' : ''}`);
      return;
    }
    // Clic droit sur des torrents : catégorie et étiquettes
    case 'setcat': {
      const hs = selHashes();
      await apiAct('torrents/setCategory', { hashes: hs.join('|'), category: arg }, arg ? `Catégorie « ${arg} » appliquée` : 'Catégorie retirée');
      return;
    }
    case 'newcatsel': return categoryDialog({ apply: selHashes() });
    case 'tag': {
      const hs = selHashes(), all = selTorrents().every((t) => tagsOf(t).includes(arg));
      await apiAct(all ? 'torrents/removeTags' : 'torrents/addTags', { hashes: hs.join('|'), tags: arg }, all ? `Étiquette « ${arg} » retirée` : `Étiquette « ${arg} » ajoutée`);
      return;
    }
    case 'newtagsel': return tagDialog({ apply: selHashes() });
    case 'cleartags': {
      const hs = selHashes(), tags = [...new Set(selTorrents().flatMap(tagsOf))];
      if (!tags.length) return toast('Aucune étiquette à retirer');
      await apiAct('torrents/removeTags', { hashes: hs.join('|'), tags: tags.join(',') }, 'Étiquettes retirées');
      return;
    }
  }
}
// Sous-menus « Catégorie » et « Étiquettes » du clic droit sur les torrents
function torrentCatTagItems(s) {
  const ts = selTorrents(), cats = Object.keys(md.categories).sort(coll.compare), tags = [...md.tags].sort(coll.compare);
  const catSub = [['f:newcatsel', 'Nouvelle catégorie…'], ['f:setcat:', 'Réinitialiser'], ...(cats.length ? ['-'] : []),
    ...cats.map((c) => ['f:setcat:' + c, c, null, false, ts.length > 0 && ts.every((t) => t.category === c)])];
  const tagSub = [['f:newtagsel', 'Ajouter…'], ['f:cleartags', 'Tout retirer'], ...(tags.length ? ['-'] : []),
    ...tags.map((g) => ['f:tag:' + g, g, null, false, ts.length > 0 && ts.every((t) => tagsOf(t).includes(g))])];
  return [['catmenu', 'Catégorie', null, !s, null, catSub], ['tagmenu', 'Étiquettes', null, !s, null, tagSub]];
}

/* ---------- Fenêtres ---------- */
function categoryDialog({ name = null, parent = null, apply = null } = {}) {
  const c = name ? md.categories[name] || {} : {};
  const dlp = c.download_path;
  dialog({ title: name ? 'Modifier la catégorie' : parent ? 'Ajouter une sous-catégorie' : 'Nouvelle catégorie', ok: name ? 'Enregistrer' : 'Créer',
    body: `<label>Catégorie<input class="field" id="cat-n" value="${esc(name || (parent ? parent + '/' : ''))}" ${name ? 'readonly' : ''} spellcheck="false"></label>
      ${parent || (name || '').includes('/') ? '<span class="muted" style="font-size:12px;margin-top:-6px">Le « / » sépare une catégorie de ses sous-catégories.</span>' : ''}
      <div class="dest">${I.folder(28)}<div style="flex:1;min-width:0;display:grid;gap:4px"><small>Dossier de destination <i>(vide = dossier par défaut + nom de la catégorie)</i></small>
        <input class="field" id="cat-p" value="${esc(normalize(c.savePath || ''))}" placeholder="${esc(join(state.defaultPath, name || 'Catégorie'))}" spellcheck="false"></div></div>
      <label>Dossier des téléchargements en cours<select class="field" id="cat-dm">
        <option value="" ${dlp === undefined || dlp === null ? 'selected' : ''}>Réglage global</option><option value="no" ${dlp === false ? 'selected' : ''}>Désactivé</option>
        <option value="yes" ${typeof dlp === 'string' ? 'selected' : ''}>Ce dossier :</option></select></label>
      <input class="field" id="cat-d" value="${esc(typeof dlp === 'string' ? normalize(dlp) : '')}" placeholder="/share/Download/en-cours" spellcheck="false">
      <span class="muted" style="font-size:12px">En gestion automatique, les torrents de cette catégorie sont enregistrés dans son dossier.</span>`,
    onOpen: (bd) => {
      const upd = () => { bd.querySelector('#cat-d').hidden = bd.querySelector('#cat-dm').value !== 'yes'; };
      bd.querySelector('#cat-dm').addEventListener('change', upd); upd();
    },
    onOk: async (bd, err) => {
      const n = bd.querySelector('#cat-n').value.trim().replace(/\/+$/, ''), p = bd.querySelector('#cat-p').value.trim().replace(/\/+$/, '');
      const dm = bd.querySelector('#cat-dm').value, d = bd.querySelector('#cat-d').value.trim().replace(/\/+$/, '');
      if (!n || /^\/|\/\/|\\/.test(n)) { err('Nom de catégorie invalide.'); return false; }
      if (!name && md.categories[n]) { err('Cette catégorie existe déjà.'); return false; }
      if (p && !p.startsWith('/')) { err('Le dossier doit être un chemin complet (ex. /share/Download/Films).'); return false; }
      if (dm === 'yes' && !d.startsWith('/')) { err('Indiquez le chemin complet du dossier des téléchargements en cours.'); return false; }
      const params = { category: n, savePath: p, ...(dm === 'yes' ? { downloadPathEnabled: 'true', downloadPath: d } : dm === 'no' ? { downloadPathEnabled: 'false' } : {}) };
      const ok = await apiAct(name ? 'torrents/editCategory' : 'torrents/createCategory', params, name ? 'Catégorie modifiée' : `Catégorie « ${n} » créée`);
      if (!ok) return false;
      if (apply && apply.length) await apiAct('torrents/setCategory', { hashes: apply.join('|'), category: n });
    } });
}
function tagDialog({ apply = null } = {}) {
  dialog({ title: apply ? 'Ajouter des étiquettes' : 'Nouvelle étiquette', ok: apply ? 'Ajouter' : 'Créer',
    body: `<label>Étiquette(s) <i>(séparées par des virgules)</i><input class="field" id="tag-n" spellcheck="false"></label>`,
    onOk: async (bd, err) => {
      const tags = bd.querySelector('#tag-n').value.split(',').map((x) => x.trim()).filter(Boolean);
      if (!tags.length) { err('Saisissez au moins une étiquette.'); return false; }
      const ok = apply && apply.length
        ? await apiAct('torrents/addTags', { hashes: apply.join('|'), tags: tags.join(',') }, 'Étiquettes ajoutées')
        : await apiAct('torrents/createTags', { tags: tags.join(',') }, tags.length > 1 ? 'Étiquettes créées' : `Étiquette « ${tags[0]} » créée`);
      if (!ok) return false;
    } });
}
// Champs « catégorie » et « étiquettes » de la fenêtre d'ajout de torrents
function addCatTagHTML() {
  const cats = Object.keys(md.categories).sort(coll.compare), last = store.get('addCat', '');
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <label>Catégorie<select class="field" id="add-cat"><option value="">(aucune)</option>${cats.map((c) => `<option ${c === last ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <label>Étiquettes <i>(virgules)</i><input class="field" id="add-tags" spellcheck="false"></label></div>`;
}
