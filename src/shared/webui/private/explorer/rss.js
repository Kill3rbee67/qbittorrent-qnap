// SPDX-License-Identifier: GPL-2.0-or-later
// Interface explorateur — RSS : lecteur de flux (articles), gestion des flux et
// dossiers, options avancées des règles de téléchargement, cookies.
//
// Endpoints (API WebUI v2, vérifiés dans le wiki « WebUI API (qBittorrent 5.0) »
// et dans le code source de qBittorrent 5.3.0) : rss/items, rss/addFeed,
// rss/addFolder, rss/removeItem, rss/moveItem, rss/setFeedURL, rss/refreshItem,
// rss/markAsRead, rss/rules, rss/setRule, rss/renameRule, rss/removeRule,
// rss/matchingArticles, app/cookies, app/setCookies.
// Format d'une règle : clés de base/rss/rss_autodownloadrule.cpp ;
// torrentParams : clés de base/bittorrent/addtorrentparams.cpp.
'use strict';

/* ---------- Arborescence des flux ---------- */
// rss/items renvoie { nom: flux | dossier } ; un flux a une clé « url »
function rssTreeHTML(obj, prefix = '', depth = 0) {
  return Object.keys(obj || {}).sort(coll.compare).map((k) => {
    const v = obj[k], path = prefix + k, pad = `padding-left:${10 + depth * 16}px`;
    if (v && typeof v === 'object' && 'url' in v) {
      const unread = (v.articles || []).filter((a) => !a.isRead).length;
      const st = v.hasError ? '<span class="st err" style="margin-left:6px" title="Flux illisible">!</span>' : v.isLoading ? '<span class="muted" style="margin-left:6px">…</span>' : '';
      return `<div class="nav${state.rssFeed === path ? ' on' : ''}" data-rfeed="${esc(path)}" style="${pad}" title="${esc(v.url)}">${I.rss(14)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(k)}</span>${st}${unread ? `<span class="cnt">${unread}</span>` : ''}</div>`;
    }
    return `<div class="nav${state.rssFeed === path ? ' on' : ''}" data-rfeed="${esc(path)}" data-rfolder style="${pad}">${I.folder(14)}<span>${esc(k)}</span></div>` + rssTreeHTML(v, path + '\\', depth + 1);
  }).join('');
}
// Flux contenus dans un chemin (flux seul, dossier, ou tout si chemin vide)
const feedsUnder = (path) => rss.feeds.filter((f) => !path || f.path === path || f.path.startsWith(path + '\\'));
const isFolderPath = (path) => !!path && !rss.feeds.some((f) => f.path === path);

function renderRssReader() {
  const c = $('#content');
  if (!rss.feeds.length && !rss.tree) { c.innerHTML = '<div class="empty">Chargement…</div>'; return; }
  const feeds = feedsUnder(state.rssFeed || '');
  const arts = feeds.flatMap((f) => (f.articles || []).map((a) => ({ ...a, feed: f })))
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
  const list = arts.length ? `<table><thead><tr><th style="width:18px"></th><th>Titre</th>${state.rssFeed && !isFolderPath(state.rssFeed) ? '' : '<th class="hide-sm">Flux</th>'}<th class="hide-sm">Date</th></tr></thead><tbody>
    ${arts.slice(0, 1000).map((a) => {
      const id = a.feed.path + '/' + a.id;
      return `<tr data-rart="${esc(id)}" class="${id === state.rssArt ? 'sel' : ''}" style="${a.isRead ? '' : 'font-weight:600'}">
        <td>${a.isRead ? '' : '<span title="Non lu" style="color:var(--blue)">●</span>'}</td>
        <td><div class="name"><span title="${esc(a.title || '')}">${esc(a.title || '(sans titre)')}</span></div></td>
        ${state.rssFeed && !isFolderPath(state.rssFeed) ? '' : `<td class="hide-sm muted">${esc(base(a.feed.path.replace(/\\/g, '/')))}</td>`}
        <td class="hide-sm muted" style="white-space:nowrap">${a.date && !isNaN(Date.parse(a.date)) ? new Date(a.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td></tr>`;
    }).join('')}</tbody></table>`
    : `<div class="empty">${I.rss(40)}<strong>${rss.feeds.length ? 'Aucun article' : 'Aucun flux'}</strong><span>${rss.feeds.length ? 'qBittorrent n\'a encore rien lu dans ce flux : cliquez sur « Actualiser ».' : 'Ajoutez un flux avec « Nouveau flux ».'}</span></div>`;
  c.innerHTML = `<div style="display:grid;grid-template-columns:minmax(180px,260px) minmax(0,1fr);height:100%;min-height:0">
    <div id="rtree" style="border-right:1px solid var(--border);overflow:auto;padding:6px 0">${rssTreeFull()}</div>
    <div style="display:flex;flex-direction:column;min-height:0"><div style="flex:1;overflow:auto">${list}</div><div id="rdetail"></div></div></div>`;
  renderRssDetail();
}
function rssTreeFull() {
  const totalUnread = rss.feeds.reduce((n, f) => n + (f.articles || []).filter((a) => !a.isRead).length, 0);
  return `<div class="nav${!state.rssFeed ? ' on' : ''}" data-rfeed="">Tous les flux${totalUnread ? `<span class="cnt">${totalUnread}</span>` : ''}</div>${rssTreeHTML(rss.tree)}`;
}
// Détail de l'article sélectionné (mis à jour sans redessiner la liste, pour garder le double-clic)
function renderRssDetail() {
  const box = document.getElementById('rdetail');
  if (!box) return;
  const sel = state.rssArt && rssArticleById(state.rssArt);
  box.innerHTML = sel ? `<div style="border-top:1px solid var(--border);padding:12px 16px;max-height:40vh;overflow:auto;background:#fafbfd">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px"><strong style="flex:1;min-width:200px">${esc(sel.title || '')}</strong>
        ${sel.torrentURL || sel.link ? '<button class="btn primary" data-ract="download">Télécharger…</button>' : ''}
        ${sel.link && /^https?:/i.test(sel.link) ? `<a class="btn" href="${esc(sel.link)}" target="_blank" rel="noopener noreferrer">Ouvrir la page</a>` : ''}
        ${sel.torrentURL ? '<button class="btn" data-ract="copylink">Copier le lien du torrent</button>' : ''}</div>
      <div class="muted" style="font-size:12.5px;margin-bottom:6px">${esc(base(sel.feed.path.replace(/\\/g, '/')))}${sel.date ? ' · ' + esc(new Date(sel.date).toLocaleString('fr-FR')) : ''}${sel.author ? ' · ' + esc(sel.author) : ''}</div>
      <div style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px">${esc(htmlToText(sel.description || ''))}</div></div>` : '';
}
// Description d'un article : HTML du site converti en texte (rien n'est interprété)
function htmlToText(h) {
  const doc = new DOMParser().parseFromString(String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n'), 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
function rssArticleById(id) {
  const i = id.lastIndexOf('/'), path = id.slice(0, i), aid = id.slice(i + 1);
  const f = rss.feeds.find((x) => x.path === path);
  const a = f && (f.articles || []).find((x) => String(x.id) === aid);
  return a ? { ...a, feed: f } : null;
}

/* ---------- Actions du lecteur ---------- */
document.addEventListener('click', async (e) => {
  const fd = e.target.closest('[data-rfeed]');
  if (fd && state.view === 'rss') { state.rssFeed = fd.dataset.rfeed; state.rssArt = null; renderRssView(); return; }
  const ar = e.target.closest('tr[data-rart]');
  if (ar) {
    state.rssArt = ar.dataset.rart;
    document.querySelectorAll('tr[data-rart].sel').forEach((x) => x.classList.remove('sel'));
    ar.classList.add('sel');
    const a = rssArticleById(ar.dataset.rart);
    if (a && !a.isRead) {
      // Marqué comme lu localement tout de suite, puis dans qBittorrent
      const f = rss.feeds.find((x) => x.path === a.feed.path), art = f && f.articles.find((x) => x.id === a.id);
      if (art) art.isRead = true;
      post('rss/markAsRead', { itemPath: a.feed.path, articleId: a.id }).catch(() => {});
      ar.style.fontWeight = ''; ar.cells[0].innerHTML = '';
      const t = document.getElementById('rtree'); if (t) t.innerHTML = rssTreeFull();
    }
    renderRssDetail();
    return;
  }
  const b = e.target.closest('[data-ract]');
  if (b) runRssAction(b.dataset.ract);
});
document.addEventListener('dblclick', (e) => {
  const ar = e.target.closest('tr[data-rart]');
  if (ar) { state.rssArt = ar.dataset.rart; runRssAction('download'); }
});
document.addEventListener('contextmenu', (e) => {
  const fd = e.target.closest('[data-rfeed]');
  if (!fd || state.view !== 'rss') return;
  e.preventDefault();
  state.rssFeed = fd.dataset.rfeed; renderRssView();
  const path = fd.dataset.rfeed, folder = fd.hasAttribute('data-rfolder'), all = !path;
  const items = all ? [['r:refreshall', 'Actualiser tous les flux'], ['r:readall', 'Tout marquer comme lu'], '-', ['r:newfeed', 'Nouveau flux…'], ['r:newfolder', 'Nouveau dossier…']]
    : [['r:refresh', 'Actualiser'], ['r:read', 'Marquer comme lu'], '-',
      ...(folder ? [] : [['r:subscribe', 'Télécharger automatiquement (nouvel abonnement)…'], ['r:seturl', 'Modifier l\'URL du flux…'], ['r:copyurl', 'Copier l\'URL du flux']]),
      ['r:rename', 'Renommer…'], ['r:move', 'Déplacer vers un dossier…'], '-', ['r:remove', folder ? 'Supprimer le dossier…' : 'Supprimer le flux…']];
  showMenu(items, e.clientX, e.clientY);
});

async function runRssAction(a) {
  const path = state.rssFeed || '';
  const feed = rss.feeds.find((f) => f.path === path);
  const after = (ms = 0) => setTimeout(loadRss, ms);
  switch (a) {
    case 'newfeed': return rssFeedDialog();
    case 'newfolder': return rssNameDialog({ title: 'Nouveau dossier RSS', label: 'Nom du dossier', ok: 'Créer',
      send: (n) => apiAct('rss/addFolder', { path: rssParent() + n }, 'Dossier créé') });
    case 'refreshall':
      await Promise.all(rss.feeds.map((f) => post('rss/refreshItem', { itemPath: f.path }).catch(() => {})));
      toast('Actualisation des flux lancée'); return after(3000);
    case 'refresh': if (await apiAct('rss/refreshItem', { itemPath: path }, 'Actualisation lancée')) after(3000); return;
    case 'readall': for (const f of rss.feeds) await post('rss/markAsRead', { itemPath: f.path }).catch(() => {}); toast('Tous les articles sont marqués comme lus'); return after();
    case 'read': if (await apiAct('rss/markAsRead', { itemPath: path }, 'Marqué comme lu')) after(); return;
    case 'copyurl': return feed && copyText(feed.url, 'URL du flux');
    case 'seturl': return feed && rssNameDialog({ title: 'Modifier l\'URL du flux', label: 'Nouvelle adresse', ok: 'Enregistrer', value: feed.url, url: true,
      send: (u) => apiAct('rss/setFeedURL', { path, url: u }, 'Adresse du flux modifiée') });
    case 'rename': {
      const i = path.lastIndexOf('\\'), dir = i >= 0 ? path.slice(0, i + 1) : '', name = path.slice(i + 1);
      return rssNameDialog({ title: 'Renommer', label: 'Nouveau nom', ok: 'Renommer', value: name,
        send: async (n) => { const r = await apiAct('rss/moveItem', { itemPath: path, destPath: dir + n }, 'Renommé'); if (r) state.rssFeed = dir + n; return r; } });
    }
    case 'move': return rssMoveDialog(path);
    case 'remove': {
      const folder = isFolderPath(path), used = feedsUnder(path).filter((f) => Object.values(rss.rules).some((r) => (r.affectedFeeds || []).includes(f.url)));
      dialog({ title: folder ? 'Supprimer le dossier' : 'Supprimer le flux', ok: 'Supprimer',
        body: `<span>Supprimer « ${esc(base(path.replace(/\\/g, '/')))} »${folder ? ' et tous les flux qu\'il contient' : ''} ?</span>
          ${used.length ? `<p class="hint" style="margin:0">${used.length > 1 ? `${used.length} flux sont utilisés` : 'Ce flux est utilisé'} par un abonnement : il ne téléchargera plus rien.</p>` : ''}`,
        onOk: async () => { if (!(await apiAct('rss/removeItem', { path }, 'Supprimé'))) return false; state.rssFeed = ''; state.rssArt = null; after(); } });
      return;
    }
    case 'subscribe': return feed && subscribeDialog({ url: feed.url });
    case 'download': {
      const art = state.rssArt && rssArticleById(state.rssArt);
      const link = art && (art.torrentURL || art.link);
      if (!link) return toast('Cet article ne contient pas de lien de torrent', true);
      return openAddDialog({ magnet: true, links: [link] });
    }
    case 'copylink': { const art = state.rssArt && rssArticleById(state.rssArt); return art && copyText(art.torrentURL, 'Lien du torrent'); }
  }
}
// Dossier parent pour un nouvel élément : le dossier sélectionné, sinon la racine
const rssParent = () => (state.rssFeed && isFolderPath(state.rssFeed) ? state.rssFeed + '\\' : '');
function rssNameDialog({ title, label, ok, value = '', url = false, send }) {
  dialog({ title, ok, body: `<label>${label}<input class="field" id="rn-v" value="${esc(value)}" spellcheck="false"></label>`,
    onOpen: (bd) => bd.querySelector('#rn-v').select(),
    onOk: async (bd, err) => {
      const v = bd.querySelector('#rn-v').value.trim();
      if (!v) { err('Ce champ ne peut pas être vide.'); return false; }
      if (url ? !/^https?:\/\/\S+$/i.test(v) : /\\/.test(v)) { err(url ? 'Adresse web invalide.' : 'Le caractère \\ est interdit.'); return false; }
      if (v === value) return;
      if (!(await send(v))) return false;
      loadRss();
    } });
}
function rssFeedDialog() {
  dialog({ title: 'Nouveau flux RSS', ok: 'Ajouter',
    body: `<label>Adresse du flux<input class="field" id="nf-u" placeholder="https://…" spellcheck="false"></label>
      <label>Nom <i>(facultatif)</i><input class="field" id="nf-n"></label>
      <span class="muted" style="font-size:12.5px">Le flux est seulement lu : rien n'est téléchargé tant que vous ne créez pas d'abonnement (clic droit sur le flux › Télécharger automatiquement).</span>`,
    onOk: async (bd, err) => {
      const u = bd.querySelector('#nf-u').value.trim(), n = bd.querySelector('#nf-n').value.trim();
      if (!/^https?:\/\/\S+$/i.test(u)) { err('Collez une adresse web complète (https://…).'); return false; }
      if (/\\/.test(n)) { err('Le caractère \\ est interdit dans le nom.'); return false; }
      if (!(await apiAct('rss/addFeed', { url: u, ...(n ? { path: rssParent() + n } : rssParent() ? { path: rssParent() + nameFromUrl(u) } : {}) }, 'Flux ajouté'))) return false;
      await ensureRssEnabled();
      setTimeout(loadRss, 500); setTimeout(loadRss, 4000);
    } });
}
function rssMoveDialog(path) {
  const folders = [];
  const walk = (o, p) => Object.entries(o || {}).forEach(([k, v]) => { if (v && typeof v === 'object' && !('url' in v)) { folders.push(p + k); walk(v, p + k + '\\'); } });
  walk(rss.tree, '');
  const name = path.slice(path.lastIndexOf('\\') + 1);
  const opts = ['', ...folders.filter((f) => f !== path && !f.startsWith(path + '\\'))];
  dialog({ title: 'Déplacer vers un dossier', ok: 'Déplacer',
    body: `<label>Dossier de destination<select class="field" id="mv-d">${opts.map((f) => `<option value="${esc(f)}">${f ? esc(f.replace(/\\/g, ' › ')) : '(racine)'}</option>`).join('')}</select></label>`,
    onOk: async (bd) => {
      const d = bd.querySelector('#mv-d').value, dest = (d ? d + '\\' : '') + name;
      if (dest === path) return;
      if (!(await apiAct('rss/moveItem', { itemPath: path, destPath: dest }, 'Déplacé'))) return false;
      state.rssFeed = dest; loadRss();
    } });
}

/* ---------- Abonnement : options avancées de la règle ---------- */
function ruleAdvancedHTML(r) {
  const tp = (r && r.torrentParams) || {};
  const cats = Object.keys(md.categories).sort(coll.compare), cat = tp.category ?? (r && r.assignedCategory) ?? '';
  const feeds = rss.feeds;
  const aff = new Set((r && r.affectedFeeds) || []);
  const layout = tp.content_layout ?? (r && r.torrentContentLayout) ?? '';
  return `<details class="adv" style="border:1px solid var(--border);border-radius:6px;padding:8px 12px"><summary style="cursor:pointer;font-weight:600">Options avancées</summary>
    <div style="display:grid;gap:10px;margin-top:10px">
      ${r ? `<label>Nom de l'abonnement<input class="field" id="ra-name" value="${esc(r.name || '')}"></label>` : ''}
      <label class="chk"><input type="checkbox" id="ra-regex" ${r && r.useRegex ? 'checked' : ''}> Utiliser des expressions régulières dans les filtres</label>
      <label>Filtre d'épisode <i>(facultatif)</i><input class="field" id="ra-ep" value="${esc((r && r.episodeFilter) || '')}" placeholder="ex. 1x2;8-15;5;30-;" spellcheck="false"></label>
      <span class="muted" style="font-size:12px;margin-top:-6px">Saison x épisodes : <b>1x2;8-15;</b> = épisodes 2 et 8 à 15 de la saison 1 ; <b>2x25-;</b> = à partir de l'épisode 25 de la saison 2.</span>
      <label>Ignorer les correspondances suivantes pendant (jours, 0 = désactivé)<input class="field" id="ra-days" type="number" min="0" value="${(r && r.ignoreDays) || 0}"></label>
      <label>Catégorie<select class="field" id="ra-cat"><option value="">(aucune)</option>${cats.map((c) => `<option ${c === cat ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Étiquettes <i>(séparées par des virgules)</i><input class="field" id="ra-tags" value="${esc((tp.tags || []).join(', '))}"></label>
      <label>Organisation des fichiers<select class="field" id="ra-layout">${[['', 'Réglage global'], ['Original', 'Comme dans le torrent'], ['Subfolder', 'Toujours dans un sous-dossier'], ['NoSubfolder', 'Jamais de sous-dossier']]
        .map(([v, l]) => `<option value="${v}" ${v === layout ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${r && feeds.length ? `<div><span>Flux surveillés par cet abonnement</span><div style="max-height:130px;overflow:auto;border:1px solid var(--border);border-radius:4px;padding:6px 8px;margin-top:4px">
        ${feeds.map((f) => `<label class="chk"><input type="checkbox" data-ra-feed="${esc(f.url)}" ${aff.has(f.url) ? 'checked' : ''}> ${esc(f.path.replace(/\\/g, ' › '))}</label>`).join('')}</div></div>` : ''}
      ${r ? `<label class="chk"><input type="checkbox" id="ra-forget"> Oublier les épisodes déjà téléchargés (${((r && r.previouslyMatchedEpisodes) || []).length})</label>
      <div><button type="button" class="btn" data-ra-preview>Voir les articles correspondants</button><div id="ra-prev" class="preview" style="margin-top:6px" hidden></div></div>` : ''}
    </div></details>`;
}
// Applique les options avancées à une définition de règle ; renvoie un message d'erreur ou ''
function ruleAdvancedApply(bd, def) {
  const q = (id) => bd.querySelector(id);
  if (!q('#ra-regex')) return '';
  def.useRegex = q('#ra-regex').checked;
  if (def.useRegex) for (const x of [def.mustContain, def.mustNotContain].filter(Boolean)) { try { new RegExp(x); } catch (e) { return `Expression régulière invalide : ${x}`; } }
  const ep = q('#ra-ep').value.trim();
  if (ep && !/^(\d+x(\d+(-\d*)?;)+)+$/i.test(ep.endsWith(';') ? ep : ep + ';')) return 'Filtre d\'épisode invalide (ex. 1x2;8-15;).';
  def.episodeFilter = ep && !ep.endsWith(';') ? ep + ';' : ep;
  def.ignoreDays = Math.max(0, parseInt(q('#ra-days').value, 10) || 0);
  const cat = q('#ra-cat').value, tags = q('#ra-tags').value.split(',').map((x) => x.trim()).filter(Boolean), layout = q('#ra-layout').value;
  def.assignedCategory = cat;
  def.torrentParams = { ...(def.torrentParams || {}), category: cat, tags };
  if (layout) { def.torrentParams.content_layout = layout; def.torrentContentLayout = layout; }
  else { delete def.torrentParams.content_layout; delete def.torrentContentLayout; }
  const fb = bd.querySelectorAll('[data-ra-feed]');
  if (fb.length) {
    def.affectedFeeds = [...fb].filter((x) => x.checked).map((x) => x.dataset.raFeed);
    if (!def.affectedFeeds.length) return 'Cochez au moins un flux.';
  }
  if (q('#ra-forget') && q('#ra-forget').checked) def.previouslyMatchedEpisodes = [];
  return '';
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-ra-preview]');
  if (!b) return;
  const box = document.getElementById('ra-prev'), name = b.closest('.dlg').dataset.rule;
  box.hidden = false; box.innerHTML = '<div class="muted" style="padding:8px">Recherche…</div>';
  try {
    const r = await api('rss/matchingArticles?ruleName=' + encodeURIComponent(name));
    const d = r.ok ? await r.json() : {};
    const rows = Object.entries(d).flatMap(([feed, list]) => list.map((t) => `<tr><td>${esc(t)}</td><td class="muted">${esc(feed)}</td></tr>`));
    box.innerHTML = rows.length ? `<table>${rows.join('')}</table><div class="muted" style="padding:4px 8px;font-size:12px">D'après la règle enregistrée (avant vos modifications).</div>`
      : '<div class="muted" style="padding:8px">Aucun article des flux ne correspond à la règle enregistrée.</div>';
  } catch (_) { box.innerHTML = '<div style="padding:8px;color:var(--red)">Le NAS ne répond pas.</div>'; }
});

/* ---------- Cookies (sites demandant une connexion pour les flux ou les .torrent) ---------- */
async function cookiesDialog() {
  let list;
  try { const r = await api('app/cookies'); if (!r.ok) return toast(errText(r.status), true); list = await r.json(); } catch (e) { if (e.message !== 'session') toast('Le NAS ne répond pas.', true); return; }
  const toLocal = (s) => { if (!s) return ''; const d = new Date(s * 1000); return isNaN(d) ? '' : new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const row = (c = {}) => `<tr class="ckrow"><td><input class="field" data-c="domain" value="${esc(c.domain || '')}" placeholder=".exemple.org"></td>
    <td><input class="field" data-c="path" value="${esc(c.path || '/')}" style="width:70px"></td><td><input class="field" data-c="name" value="${esc(c.name || '')}"></td>
    <td><input class="field" data-c="value" value="${esc(c.value || '')}"></td><td><input class="field" type="datetime-local" data-c="exp" value="${toLocal(c.expirationDate)}"></td>
    <td><button type="button" class="ibtn" data-ckdel title="Retirer">✕</button></td></tr>`;
  dialog({ title: 'Gérer les cookies', ok: 'Enregistrer', wide: true,
    body: `<span class="muted" style="font-size:12.5px">Cookies envoyés par qBittorrent lorsqu'il télécharge un flux RSS ou un fichier .torrent (sites qui demandent d'être connecté).</span>
      <div style="overflow:auto"><table><thead><tr><th>Domaine</th><th>Chemin</th><th>Nom</th><th>Valeur</th><th>Expiration</th><th></th></tr></thead><tbody id="ck">${list.map(row).join('')}</tbody></table></div>
      <div><button type="button" class="btn" data-ckadd>Ajouter un cookie</button></div>`,
    onOpen: (bd) => bd.addEventListener('click', (e) => {
      if (e.target.closest('[data-ckadd]')) bd.querySelector('#ck').insertAdjacentHTML('beforeend', row());
      const d = e.target.closest('[data-ckdel]'); if (d) d.closest('tr').remove();
    }),
    onOk: async (bd, err) => {
      const out = [];
      for (const tr of bd.querySelectorAll('.ckrow')) {
        const g = (k) => tr.querySelector(`[data-c=${k}]`).value.trim();
        if (!g('domain') && !g('name')) continue;
        if (!g('domain') || !g('name')) { err('Chaque cookie doit avoir un domaine et un nom.'); return false; }
        const exp = g('exp') ? Math.floor(new Date(g('exp')).getTime() / 1000) : 0;
        // Sans date d'expiration : cookie de session (une date 0 le ferait expirer aussitôt)
        out.push({ domain: g('domain'), path: g('path') || '/', name: g('name'), value: g('value'), ...(exp > 0 ? { expirationDate: exp } : {}) });
      }
      if (!(await apiAct('app/setCookies', { cookies: JSON.stringify(out) }, `Cookies enregistrés (${out.length})`))) return false;
    } });
}
