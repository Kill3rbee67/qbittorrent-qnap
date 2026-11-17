// SPDX-License-Identifier: GPL-2.0-or-later
// Langue de l'interface explorateur et de la page de connexion.
//
// Le français est la langue d'origine : les textes sont écrits en français dans le code
// et, en français, ce fichier ne fait rien d'autre qu'afficher le sélecteur FR / EN.
// En anglais, chaque texte affiché est remplacé au vol par sa traduction :
// - explorer/i18n-en.js fournit le dictionnaire (texte français exact → anglais) et des
//   règles pour les textes qui contiennent un nombre ou un nom (« 3 torrents supprimés ») ;
// - un MutationObserver traduit les nœuds de texte et les attributs title, placeholder,
//   aria-label et alt dès qu'ils entrent dans la page, avant l'affichage.
// Un texte absent du dictionnaire reste en français : rien ne casse, il manque seulement
// une ligne dans i18n-en.js. Pour les repérer : ?i18n=debug dans l'adresse, puis
// I18N.missing() dans la console du navigateur.
//
// Choix mémorisé par navigateur (qbfs.lang), comme le thème. Sans choix : français si le
// navigateur est en français, anglais sinon.
(function () {
  'use strict';
  var LANGS = ['fr', 'en'];
  var NAMES = { fr: 'Français', en: 'English' };

  function langChoice() {
    try {
      var l = JSON.parse(localStorage.getItem('qbfs.lang'));
      if (LANGS.indexOf(l) >= 0) return l;
    } catch (e) { if (window.langSession) return window.langSession; }
    return /^fr\b/i.test(navigator.language || 'fr') ? 'fr' : 'en';
  }
  var lang = langChoice();
  var dict = lang === 'en' ? window.QBFS_I18N_EN : null;
  if (lang !== 'fr' && !dict) lang = 'fr'; // dictionnaire absent : on reste en français
  var debug = /[?&]i18n=debug\b/.test(location.search);
  var missing = {}, produced = {};

  function setLang(l) {
    if (LANGS.indexOf(l) < 0 || l === lang) return;
    window.langSession = l;
    try { localStorage.setItem('qbfs.lang', JSON.stringify(l)); } catch (e) {}
    location.reload();
  }

  /* ---------- Traduction d'un texte ---------- */
  var cache = new Map();
  var SPACES = /[  ]/g; // espaces insécables (fines ou non) → espace simple

  function lookup(key) {
    var exact = dict.exact, v = exact[key];
    if (typeof v === 'string') return v;
    var rules = dict.rules;
    for (var i = 0; i < rules.length; i++) {
      var m = rules[i][0].exec(key);
      if (m) return typeof rules[i][1] === 'function' ? rules[i][1].apply(null, m) : key.replace(rules[i][0], rules[i][1]);
    }
    return null;
  }

  // Renvoie la traduction, ou null si le texte n'a pas à changer
  function tr(s) {
    if (!dict || !s) return null;
    var hit = cache.get(s);
    if (hit !== undefined) return hit;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2], out = null;
    if (core && /[A-Za-zÀ-ÿ]/.test(core) && core.length < 1200) {
      var v = lookup(core.replace(SPACES, ' ').replace(/\s+/g, ' '));
      if (v !== null && v !== core) { out = m[1] + v + m[3]; if (debug) produced[v] = 1; }
      else if (v === null && debug && !produced[core]) missing[core] = (missing[core] || 0) + 1;
    }
    if (cache.size > 6000) cache.clear();
    cache.set(s, out);
    return out;
  }

  /* ---------- Application à la page ---------- */
  var ATTRS = ['title', 'placeholder', 'aria-label', 'alt'];
  // Contenus saisis par l'utilisateur ou venus du NAS : jamais traduits
  var SKIP = 'script,style,textarea,code,pre,[data-i18n-skip]';
  var skipSel = SKIP;

  function skipped(el) { return !!(el && el.closest && el.closest(skipSel)); }

  function doText(node) {
    var p = node.parentNode;
    if (!p || p.nodeType !== 1 || skipped(p)) return;
    var v = tr(node.nodeValue);
    if (v === null && dict.scoped) v = scoped(p, node.nodeValue);
    if (v !== null) node.nodeValue = v;
  }
  // Mots trop courts ou trop ambigus pour être traduits partout (« de », « à ») :
  // seulement à l'intérieur de la zone indiquée par le dictionnaire
  function scoped(el, s) {
    var key = s.trim();
    if (!key) return null;
    for (var i = 0; i < dict.scoped.length; i++) {
      var v = dict.scoped[i][1][key];
      if (typeof v === 'string' && el.closest(dict.scoped[i][0])) return s.replace(key, v);
    }
    return null;
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = el.getAttribute(ATTRS[i]);
      if (a) { var v = tr(a); if (v !== null) el.setAttribute(ATTRS[i], v); }
    }
  }
  function doTree(root) {
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 || skipped(root)) return;
    doAttrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && n.matches(skipSel)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    for (var n = w.nextNode(); n; n = w.nextNode()) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }

  if (dict) {
    if (dict.skip) skipSel = SKIP + ',' + dict.skip;
    document.documentElement.lang = lang;

    // Nombres et dates : l'interface les formate en 'fr-FR' (1 234,5 · 16/11/2026).
    // En anglais, même appel avec la locale du dictionnaire (1,234.5).
    var locale = dict.locale || 'en-GB';
    [[Number.prototype, 'toLocaleString'], [Date.prototype, 'toLocaleString'],
     [Date.prototype, 'toLocaleDateString'], [Date.prototype, 'toLocaleTimeString']].forEach(function (x) {
      var orig = x[0][x[1]];
      x[0][x[1]] = function (loc) {
        if (loc === 'fr-FR') { var a = Array.prototype.slice.call(arguments); a[0] = locale; return orig.apply(this, a); }
        return orig.apply(this, arguments);
      };
    });

    doTree(document.documentElement);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') { if (!skipped(r.target)) doAttrs(r.target); }
        else for (var j = 0; j < r.addedNodes.length; j++) doTree(r.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ---------- Sélecteur FR / EN ---------- */
  // Remplit tout élément .langsw de la page (barre du haut, page de connexion)
  function mountSwitch() {
    var hosts = document.querySelectorAll('.langsw:not([data-ready])');
    for (var i = 0; i < hosts.length; i++) {
      var h = hosts[i];
      h.setAttribute('data-ready', '1');
      h.setAttribute('role', 'group');
      h.setAttribute('aria-label', 'Langue');
      LANGS.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = l.toUpperCase();
        b.setAttribute('data-i18n-skip', '');
        b.setAttribute('lang', l);
        b.title = NAMES[l];
        b.setAttribute('aria-pressed', l === lang ? 'true' : 'false');
        if (l === lang) b.className = 'on';
        b.addEventListener('click', function () { setLang(l); });
        h.appendChild(b);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountSwitch);
  else mountSwitch();

  // Langue changée dans un autre onglet
  window.addEventListener('storage', function (e) { if (e.key === 'qbfs.lang' && langChoice() !== lang) location.reload(); });

  window.I18N = {
    lang: lang, langs: LANGS, set: setLang,
    // Traduit un texte hors de la page (document.title est déjà couvert)
    t: function (s) { var v = tr(s); return v === null ? s : v; },
    missing: function () { return Object.keys(missing).sort(); }
  };
})();
