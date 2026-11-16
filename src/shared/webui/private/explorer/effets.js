// SPDX-License-Identifier: GPL-2.0-or-later
// Effets du thème « Aurore » (présentation seulement, aucune couleur ici : tout vient des
// variables de explorer/themes.css, section 5). Chargé après le script principal.
//
// Le fichier n'agit que si <html data-theme="aurore"> ; dans les autres thèmes il ne crée
// aucun élément, n'écoute pas le pointeur et ne lance aucune animation. Il ne modifie ni
// les données ni les appels à l'API : il observe ce que l'interface affiche déjà.
//
//  1. bordures lumineuses : --aur-mx / --aur-my (position du pointeur) sur les panneaux fixes ;
//  2. liste des torrents : entrée échelonnée des premières lignes, vitesses qui pulsent ;
//  3. compteurs de la barre latérale et de la barre d'état animés ;
//  4. changement de vue : View Transitions API si le navigateur l'a, sinon fondu (CSS) ;
//  5. arrière-plan en canvas (rubans lumineux), désactivable (menu Thème), environ 30 images/s,
//     suspendu quand l'onglet est caché ; grain SVG.
// « Réduire les animations » (système) : rien de tout cela n'est animé.
'use strict';
(function () {
  const root = document.documentElement;
  const on = () => root.getAttribute('data-theme') === 'aurore';
  const calmQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const calm = () => calmQuery.matches;
  const fxPrefs = () => store.get('fx', {});
  // Arrière-plan animé : choix mémorisé (qbfs.fx) ; sans choix, actif sauf sur téléphone
  const phone = matchMedia('(max-width: 760px)');
  const canvasWanted = () => { const c = fxPrefs().canvas; return typeof c === 'boolean' ? c : !phone.matches; };

  /* ---------- 1. Bordures lumineuses qui suivent le pointeur ----------
     Les rectangles des panneaux sont lus hors de la boucle (au premier mouvement, puis après
     un redimensionnement) ; la boucle ne fait qu'écrire deux variables par panneau. */
  const HOSTS = '.top, .side, main';
  const REACH = 180; // rayon du halo (px), le même que dans themes.css
  let hosts = null, px = 0, py = 0, glowFrame = 0;
  const forgetHosts = () => { hosts = null; };
  function measureHosts() {
    hosts = [...document.querySelectorAll(HOSTS)].map((el) => { const r = el.getBoundingClientRect(); return { el, x: r.left, y: r.top, w: r.width, h: r.height, lit: true }; });
  }
  function paintGlow() {
    glowFrame = 0;
    if (!hosts) measureHosts();
    for (const h of hosts) {
      const x = px - h.x, y = py - h.y;
      // Bordure hors de portée (pointeur loin du panneau, ou au milieu d'un grand panneau) : rien à repeindre
      const far = x < -REACH || y < -REACH || x > h.w + REACH || y > h.h + REACH
        || (x > REACH && y > REACH && x < h.w - REACH && y < h.h - REACH);
      if (far && !h.lit) continue;
      h.lit = !far;
      h.el.style.setProperty('--aur-mx', Math.round(x) + 'px');
      h.el.style.setProperty('--aur-my', Math.round(y) + 'px');
    }
  }
  function onPointer(e) {
    if (!on() || e.pointerType === 'touch') return;
    px = e.clientX; py = e.clientY;
    if (!glowFrame) glowFrame = requestAnimationFrame(paintGlow);
  }
  function clearGlow() {
    for (const el of document.querySelectorAll(HOSTS)) { el.style.removeProperty('--aur-mx'); el.style.removeProperty('--aur-my'); }
    forgetHosts();
  }
  // Sans propriétés enregistrées (@property), les variables seraient héritées par toute la
  // liste à chaque mouvement : l'effet est alors laissé de côté.
  if (window.CSS && CSS.registerProperty) {
    document.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', forgetHosts, { passive: true });
    root.addEventListener('pointerleave', () => { if (on()) clearGlow(); });
  }

  /* ---------- 2. Liste des torrents ---------- */
  const STAGGER = 24; // lignes animées à l'entrée (les suivantes sont hors de l'écran ou presque)
  const SHIMMER_MAX = 40; // au-delà, le reflet des barres de progression est coupé (une animation par ligne)
  let lastTable = null, hadRows = false, staggerTimer = 0;
  function stagger(body) {
    const rows = body.rows, n = Math.min(rows.length, STAGGER);
    for (let i = 0; i < n; i++) rows[i].style.setProperty('--fx-i', i);
    body.classList.add('fx-in');
    clearTimeout(staggerTimer);
    staggerTimer = setTimeout(() => body.classList.remove('fx-in'), 1000);
  }
  // Une ligne redessinée (rafraîchissement toutes les 2 s) dont la vitesse a changé : pulsation
  function pulseCells(oldRow, newRow) {
    for (const k of ['dlspeed', 'upspeed']) {
      const a = oldRow.querySelector(`td[data-k="${k}"]`), b = newRow.querySelector(`td[data-k="${k}"]`);
      if (a && b && a.textContent !== b.textContent) b.classList.add('fx-pa');
    }
  }
  const content = document.getElementById('content');
  new MutationObserver((records) => {
    if (!on()) { lastTable = null; return; }
    const table = content.querySelector('table.tl'), body = table && table.tBodies[0];
    const rowsNow = !!(body && body.rows.length && body.rows[0].dataset.hash);
    if (body) body.classList.toggle('fx-many', body.querySelectorAll('tr[data-st="dl"]').length > SHIMMER_MAX);
    if (!calm()) {
      if (rowsNow && (table !== lastTable || !hadRows)) stagger(body);
      else if (rowsNow && records.length <= 120) {
        for (const r of records) {
          const a = r.removedNodes[0], b = r.addedNodes[0];
          if (r.target === body && r.removedNodes.length === 1 && r.addedNodes.length === 1 && a.dataset && b.dataset && a.dataset.hash === b.dataset.hash) pulseCells(a, b);
        }
      }
    }
    lastTable = table; hadRows = rowsNow;
  }).observe(content, { childList: true, subtree: true });

  // Vitesses de la barre du haut : deux animations identiques en alternance, pour rejouer
  // la pulsation sans forcer de calcul de mise en page
  for (const id of ['spd-dl', 'spd-up']) {
    const el = document.getElementById(id);
    let flip = false;
    new MutationObserver(() => {
      if (!on() || calm()) return;
      flip = !flip;
      el.classList.remove('fx-pa', 'fx-pb'); el.classList.add(flip ? 'fx-pa' : 'fx-pb');
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }

  /* ---------- 3. Compteurs animés ----------
     La barre latérale et la barre d'état sont réécrites à chaque rafraîchissement : quand un
     nombre a changé, il défile de l'ancienne valeur à la nouvelle (0,45 s, 30 images/s au plus). */
  const seen = new Map(), tweens = new Map();
  let tweenFrame = 0, tweenLast = 0;
  const TWEEN_MS = 450;
  function tweenStep(now) {
    tweenFrame = 0;
    if (now - tweenLast >= 33) {
      tweenLast = now;
      for (const [key, t] of tweens) {
        const p = Math.max(0, Math.min(1, (now - t.start) / TWEEN_MS)), e = 1 - Math.pow(1 - p, 3);
        if (!t.node.isConnected) { tweens.delete(key); continue; }
        t.cur = Math.round(t.from + (t.to - t.from) * e);
        t.node.nodeValue = t.fmt(t.cur);
        if (p >= 1) tweens.delete(key);
      }
    }
    if (tweens.size) tweenFrame = requestAnimationFrame(tweenStep);
  }
  // node : nœud de texte qui porte le nombre ; fmt : remet le nombre dans son texte
  function count(key, node, value, fmt) {
    const old = seen.get(key), t = tweens.get(key);
    seen.set(key, value);
    // Barre réécrite pendant le défilement, même valeur : il continue dans le nouveau nœud
    if (t && t.to === value) { t.node = node; t.fmt = fmt; node.nodeValue = fmt(t.cur); return; }
    if (old === undefined || old === value || !on() || calm() || document.hidden) { tweens.delete(key); return; }
    node.nodeValue = fmt(old);
    tweens.set(key, { node, from: old, cur: old, to: value, fmt, start: performance.now() });
    if (!tweenFrame) tweenFrame = requestAnimationFrame(tweenStep);
  }
  const filters = document.getElementById('filters');
  new MutationObserver(() => {
    if (!on()) { seen.clear(); return; }
    for (const nav of filters.children) {
      const c = nav.querySelector('.cnt'), n = c && c.firstChild && Number(c.textContent);
      if (c && c.firstChild && Number.isFinite(n)) count('f:' + nav.dataset.filter, c.firstChild, n, String);
    }
  }).observe(filters, { childList: true });
  const statusbar = document.getElementById('statusbar');
  new MutationObserver(() => {
    if (!on()) return;
    const s = statusbar.firstElementChild, t = s && s.firstChild, m = t && t.nodeType === 3 && /^(\d+)( torrents?)$/.exec(t.nodeValue);
    // Pendant le défilement, le singulier / pluriel reste celui de la valeur finale
    if (m) count('s:torrents', t, Number(m[1]), (v) => v + m[2]);
  }).observe(statusbar, { childList: true });

  /* ---------- 4. Changement de vue ----------
     renderAll() redessine toute la vue (dossier ouvert, filtre, RSS). Quand la vue affichée
     change, l'appel est enveloppé dans une transition ; sinon, et dans les autres thèmes,
     renderAll est appelée telle quelle.
     Une View Transition redessine à l'image suivante (pas tout de suite) : elle n'est donc
     utilisée que là où rien ne relit la page juste après — clic dans la page (barre latérale,
     chemin, liste, barre d'état) ou fin de lecture d'un dossier. Partout ailleurs (menus,
     clavier), le dessin reste immédiat, suivi d'un fondu en CSS. */
  const viewKey = () => [state.view, state.view === 'folder' ? state.path : state.filter, state.pathFilter || ''].join('|');
  const deferrable = () => {
    const e = window.event;
    if (!e) return true; // suite d'une lecture de dossier (openFolder), hors de tout événement
    return e.isTrusted && e.type === 'click' && !!(e.target && e.target.closest && e.target.closest('.side, .pathbar, .content, .statusbar'));
  };
  if (typeof window.renderAll === 'function') {
    const draw = window.renderAll;
    let shown = viewKey(), flip = false;
    window.renderAll = function () {
      const key = viewKey();
      // Dossier en cours de lecture (« Chargement… ») : la transition attend son contenu
      if (!on() || calm() || key === shown || state.loading || document.hidden) { if (!state.loading) shown = key; return draw(); }
      shown = key;
      if (document.startViewTransition && deferrable()) { document.startViewTransition(draw); return; }
      draw();
      flip = !flip;
      content.classList.remove('fx-view-a', 'fx-view-b'); content.classList.add(flip ? 'fx-view-a' : 'fx-view-b');
    };
  }

  /* ---------- 5. Arrière-plan : grain SVG et canvas ---------- */
  let grain = null, canvas = null, ctx = null, cw = 0, ch = 0, frame = 0, lastDraw = 0, palette = null;
  const FRAME_MS = 33; // environ 30 images par seconde
  function addGrain() {
    const box = document.createElement('div');
    box.innerHTML = '<svg class="fx-grain" aria-hidden="true" focusable="false"><filter id="fx-grain-f" x="0" y="0" width="100%" height="100%">'
      + '<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>'
      + '<pattern id="fx-grain-p" width="220" height="220" patternUnits="userSpaceOnUse"><rect width="220" height="220" filter="url(#fx-grain-f)"/></pattern>'
      + '<rect width="100%" height="100%" fill="url(#fx-grain-p)"/></svg>';
    grain = box.firstChild;
    document.body.appendChild(grain);
  }
  function readPalette() {
    const cs = getComputedStyle(root), v = (n) => cs.getPropertyValue(n).trim();
    palette = { colors: [v('--aur-fx-a'), v('--aur-fx-b'), v('--aur-fx-c')], alpha: parseFloat(v('--aur-fx-alpha')) || 0 };
  }
  function sizeCanvas() {
    // Décor flou par nature : un pixel de canvas pour quatre pixels CSS suffit (étiré par le CSS)
    cw = canvas.width = Math.ceil(window.innerWidth / 2); ch = canvas.height = Math.ceil(window.innerHeight / 2);
  }
  // Trois rubans : sinusoïdes larges qui dérivent lentement (tracé seulement, aucune lecture du DOM)
  function draw(now) {
    frame = requestAnimationFrame(draw);
    if (now - lastDraw < FRAME_MS) return;
    lastDraw = now;
    const t = now / 1000;
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = palette.alpha;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = palette.colors[i];
      ctx.lineWidth = ch * (0.07 + 0.03 * i);
      ctx.beginPath();
      for (let x = -20; x <= cw + 20; x += 20) {
        const y = ch * (0.3 + 0.2 * i) + Math.sin(x / (130 + 35 * i) + t * (0.16 + 0.05 * i) + i * 2) * ch * 0.11 + Math.sin(x / 48 + t * 0.21 + i) * ch * 0.025;
        if (x === -20) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  const runCanvas = () => { if (canvas && !frame && !document.hidden) frame = requestAnimationFrame(draw); };
  const pauseCanvas = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
  function setCanvas(want) {
    if (want && !canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'fx-canvas'; canvas.setAttribute('aria-hidden', 'true');
      ctx = canvas.getContext('2d');
      document.body.appendChild(canvas);
      sizeCanvas(); readPalette(); runCanvas();
    } else if (!want && canvas) {
      pauseCanvas(); canvas.remove(); canvas = ctx = null;
    }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseCanvas(); else runCanvas(); });
  window.addEventListener('resize', () => { if (canvas) sizeCanvas(); }, { passive: true });

  // Mise en place ou retrait selon le thème, le réglage et « réduire les animations »
  function sync() {
    const active = on();
    if (active && !grain) addGrain();
    if (!active && grain) { grain.remove(); grain = null; }
    setCanvas(active && canvasWanted() && !calm());
    if (!active) { clearGlow(); tweens.clear(); }
  }
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  calmQuery.addEventListener('change', sync);
  phone.addEventListener('change', sync);
  window.addEventListener('storage', (e) => { if (e.key === 'qbfs.fx') sync(); });
  sync();

  /* ---------- Menu Thème : entrée « Arrière-plan animé » (seulement avec Aurore) ---------- */
  window.fxThemeItems = () => (on() ? ['-', ['fx:canvas', 'Arrière-plan animé', null, calm(), canvasWanted() && !calm()]] : []);
  window.fxRun = (act) => {
    if (act !== 'fx:canvas') return;
    store.set('fx', Object.assign(fxPrefs(), { canvas: !canvasWanted() }));
    sync();
  };
})();
