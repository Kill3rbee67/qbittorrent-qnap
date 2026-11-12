#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Vérifications statiques de l'interface explorateur (sans navigateur, lancées par la CI).

1. Couleurs : aucune couleur écrite en dur hors de public/explorer/themes.css.
2. Adresses externes : aucune ressource chargée depuis un autre site (polices, scripts,
   feuilles de style, images, CDN) ; seul le lien vers la page du projet est permis.
3. Contrastes : pour chaque thème, chaque couple texte / fond utilisé par l'interface
   atteint 4,5:1 (WCAG AA), calculé à partir des variables de themes.css
   (var() et color-mix() résolus ici).

Usage : tests/interface-check.py [--details]
"""
import re, sys, glob, os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'shared', 'webui')
THEMES_CSS = os.path.join(ROOT, 'public', 'explorer', 'themes.css')
THEMES = ['classique', 'ardoise', 'papier', 'signal', 'minimal', 'futur', 'terminal']
DETAILS = '--details' in sys.argv
errors = []

def fail(msg):
    errors.append(msg); print('ÉCHEC ' + msg)

# ---------------------------------------------------------------- 1. couleurs en dur
# Fichiers de l'interface explorateur et de la page de connexion. qnap-classic.js n'est
# pas concerné : il complète l'interface classique de qBittorrent, qui n'est pas thémée.
SOURCES = [os.path.join(ROOT, 'private', 'index.html'), os.path.join(ROOT, 'public', 'index.html')] \
    + sorted(glob.glob(os.path.join(ROOT, 'private', 'explorer', '*.js'))) \
    + sorted(glob.glob(os.path.join(ROOT, 'private', 'explorer', '*.css'))) \
    + [f for f in sorted(glob.glob(os.path.join(ROOT, 'public', 'explorer', '*.css'))) if os.path.basename(f) != 'themes.css']
NAMED = r'(?:white|black|red|green|blue|orange|yellow|gray|grey|silver|navy|teal|purple|maroon|olive|lime|aqua|fuchsia|pink|brown|gold)'
PATTERNS = [
    (re.compile(r'(?<![\w$&-])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b(?!-)'), 'couleur hexadécimale'),
    (re.compile(r'\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\s*\('), 'fonction de couleur'),
    (re.compile(r'(?:color|background(?:-color)?|border(?:-[a-z]+)?|fill|stroke|outline|box-shadow|text-shadow)\s*[:=]\s*["\']?[^;"\'{}]*?\b' + NAMED + r'\b(?![-\w])', re.I), 'couleur nommée'),
]
ids = set()
for f in SOURCES:
    ids.update(re.findall(r'\bid=["\']([\w-]+)["\']', open(f, encoding='utf-8').read()))
found = 0
for f in SOURCES:
    rel = os.path.relpath(f, ROOT)
    for n, line in enumerate(open(f, encoding='utf-8'), 1):
        for rx, kind in PATTERNS:
            for m in rx.finditer(line):
                if kind == 'couleur hexadécimale' and m.group(1) in ids:
                    continue  # sélecteur d'identifiant (#add…), pas une couleur
                fail(f'{rel}:{n} : {kind} en dur « {m.group(0).strip()} » — utiliser une variable de themes.css')
                found += 1
if not found:
    print(f'OK  aucune couleur en dur dans {len(SOURCES)} fichiers (hors themes.css)')

# ---------------------------------------------------------------- 2. adresses externes
# Tous les fichiers de code de l'interface (html, js, css, y compris themes.css).
CODE = sorted(glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True) + glob.glob(os.path.join(ROOT, '**', '*.js'), recursive=True)
              + glob.glob(os.path.join(ROOT, '**', '*.css'), recursive=True))
# Lien cliquable vers la page du projet (aide, signaler un problème) : pas une ressource
ALLOWED_LINKS = {'github.com/Kill3rbee67/qbittorrent-qnap'}
# http(s)://hôte, ou //hôte (adresse sans protocole) juste après un guillemet, « ( » ou « = »
URL = re.compile(r'(?:https?://|(?<=["\'(=])//)([A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,})(/[^\s"\'`)<>]*)?')
RESOURCE = re.compile(r'(?:\bsrc\s*=|\burl\s*\(|@import|<link\b[^>]*href\s*=|\bfetch\s*\(|\bimport\s*\(|new\s+(?:Worker|EventSource|WebSocket)\s*\()\s*["\']?\s*(?:https?:)?//', re.I)
urls = 0
for f in CODE:
    rel = os.path.relpath(f, ROOT)
    for n, line in enumerate(open(f, encoding='utf-8'), 1):
        if RESOURCE.search(line):
            fail(f'{rel}:{n} : ressource chargée depuis un autre site — embarquer le fichier et utiliser un chemin relatif'); urls += 1
        for m in URL.finditer(line):
            host_path = m.group(1) + (m.group(2) or '')
            if m.group(1) in ('127.0.0.1', 'localhost') or any(host_path.startswith(a) for a in ALLOWED_LINKS):
                continue
            fail(f'{rel}:{n} : adresse externe « {m.group(0)} »'); urls += 1
if not urls:
    print(f'OK  aucune adresse externe dans {len(CODE)} fichiers de code (hors lien vers la page du projet)')

# ---------------------------------------------------------------- 3. contrastes
css = re.sub(r'/\*.*?\*/', '', open(THEMES_CSS, encoding='utf-8').read(), flags=re.S)
blocks = []
for sel, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
    decls = dict((k.strip(), v.strip()) for k, v in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', body))
    if decls:
        blocks.append((' '.join(sel.split()), decls))

THEME_SEL = re.compile(r'^(?::root|:root:not\(\[data-theme\]\)|\[data-theme="[\w-]+"\]|:root\[data-theme="[\w-]+"\])$')
def theme_vars(t):
    # Seuls les blocs de variables d'un thème (sélecteur fait uniquement de :root /
    # [data-theme="…"]) ; les règles de présentation (« [data-theme] .st.dl ») sont ignorées
    v = {}
    own = [(sel, d) for sel, d in blocks if all(THEME_SEL.match(x.strip()) for x in sel.split(','))]
    for sel, d in own:
        if sel == ':root':
            v.update(d)
    for sel, d in own:
        parts = [x.strip() for x in sel.split(',')]
        if t == 'classique' and ':root:not([data-theme])' in parts or f'[data-theme="{t}"]' in parts or f':root[data-theme="{t}"]' in parts:
            v.update(d)
    return v

def split_args(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur.strip()); cur = ''
        else:
            cur += ch
    out.append(cur.strip())
    return out

def resolve(v, expr, depth=0):
    """Remplace les var() par leur valeur (avec repli)."""
    if depth > 30:
        raise ValueError('boucle de variables')
    while True:
        m = re.search(r'var\(\s*(--[\w-]+)\s*(?:,|\))', expr)
        if not m:
            return expr
        start = m.start(); i = expr.index('(', start) + 1; d = 1; j = i
        while d:
            d += {'(': 1, ')': -1}.get(expr[j], 0); j += 1
        args = split_args(expr[i:j - 1])
        name = args[0]
        if name in v:
            rep = resolve(v, v[name], depth + 1)
        elif len(args) > 1:
            rep = resolve(v, args[1], depth + 1)
        else:
            raise ValueError(f'variable non définie : {name}')
        expr = expr[:start] + rep + expr[j:]

def parse_color(s):
    s = s.strip()
    if s == 'transparent':
        return (0, 0, 0, 0)
    m = re.fullmatch(r'#([0-9a-fA-F]+)', s)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = ''.join(c * 2 for c in h)
        r, g, b = (int(h[k:k + 2], 16) / 255 for k in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1
        return (r, g, b, a)
    m = re.fullmatch(r'rgba?\((.*)\)', s)
    if m:
        p = [x.strip() for x in re.split(r'[,\s/]+', m.group(1).strip()) if x.strip()]
        r, g, b = (float(x) / 255 for x in p[:3])
        a = float(p[3].rstrip('%')) / (100 if p[3].endswith('%') else 1) if len(p) > 3 else 1
        return (r, g, b, a)
    m = re.fullmatch(r'color-mix\(\s*in\s+srgb\s*,(.*)\)', s, re.S)
    if m:
        parts = split_args(m.group(1))
        cols = []
        for part in parts:
            pm = re.match(r'(.*?)\s+(\d+(?:\.\d+)?)%\s*$', part)
            cols.append((parse_color(pm.group(1)), float(pm.group(2)) / 100) if pm else (parse_color(part), None))
        (c1, p1), (c2, p2) = cols
        if p1 is None and p2 is None: p1 = p2 = .5
        elif p1 is None: p1 = 1 - p2
        elif p2 is None: p2 = 1 - p1
        a = c1[3] * p1 + c2[3] * p2
        if a == 0:
            return (0, 0, 0, 0)
        rgb = tuple((c1[k] * c1[3] * p1 + c2[k] * c2[3] * p2) / a for k in range(3))
        return rgb + (a,)
    raise ValueError(f'couleur non reconnue : {s}')

def over(fg, bg):
    """Superpose une couleur (avec transparence) sur un fond opaque."""
    a = fg[3]
    return tuple(fg[k] * a + bg[k] * (1 - a) for k in range(3)) + (1,)

def lum(c):
    f = lambda x: x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])

def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

# Couples texte / fond de l'interface : (texte, fond, [fond dessous si transparent], où)
TEXT_PAIRS = [
    ('--text', '--bg', 'texte sur le fond de page'),
    ('--text', '--panel', 'texte de la liste et des fenêtres'),
    ('--text', '--panel-2', 'texte des barres d\'outils et d\'état'),
    ('--text', '--side-bg', 'barre latérale'),
    ('--text', '--row-hover', 'ligne survolée'),
    ('--text', '--row-selected', 'ligne sélectionnée'),
    ('--text', '--field-bg', 'champs de saisie'),
    ('--muted', '--panel', 'texte secondaire'),
    ('--muted', '--panel-2', 'barre d\'état'),
    ('--muted', '--bg', 'texte secondaire sur le fond'),
    ('--muted', '--side-bg', 'titres de la barre latérale'),
    ('--muted', '--th-bg', 'onglets du panneau de détails'),
    ('--muted', '--count-bg', 'compteurs de la barre latérale'),
    ('--faint', '--panel', 'séparateurs du chemin, fichiers non téléchargés'),
    ('--th-text', '--th-bg', 'en-têtes de colonnes'),
    ('--accent-on-soft', '--accent-soft', 'élément actif (barre latérale, réglages, aide)'),
    ('--accent-strong', '--th-bg', 'onglet actif, en-tête survolé'),
    ('--accent-strong', '--row-hover', 'chemin survolé'),
    ('--link', '--panel', 'liens et dossiers'),
    ('--link', '--panel-2', 'liens de la barre d\'état'),
    ('--link', '--row-selected', 'dossier d\'une ligne sélectionnée'),
    ('--link', '--row-hover', 'dossier d\'une ligne survolée'),
    ('--sort-arrow', '--th-bg', 'flèche de tri'),
    ('--accent-text', '--accent', 'texte sur l\'accent (bouton principal)'),
    ('--accent-text', '--accent-hover', 'bouton principal survolé'),
    ('--header-text', '--header-bg', 'barre du haut'),
    ('--header-text', ('--header-btn-bg', '--header-bg'), 'boutons de la barre du haut'),
    ('--header-text', ('--header-menu-hover', '--header-bg'), 'onglet de menu ouvert'),
    ('--menu-text', '--menu-bg', 'menus'),
    ('--menu-text', '--menu-hover', 'entrée de menu survolée'),
    ('--menu-icon', '--menu-bg', 'titres et flèches des menus'),
    ('--disabled', '--menu-bg', 'entrées de menu désactivées'),
    ('--danger', '--panel', 'erreurs, bouton Supprimer'),
    ('--danger', '--btn-bg', 'bouton Supprimer'),
    ('--danger', '--offline-bg', '« qBittorrent ne répond pas »'),
    ('--tag-text', '--tag-bg', 'étiquettes'),
    ('--warn-text', '--warn-bg', 'avertissements'),
    ('--danger-text', '--danger-bg', 'avertissements graves'),
    ('--log-warn', '--panel', 'journal : avertissements'),
    ('--toast-text', '--toast-bg', 'messages'),
    ('--toast-text', '--danger', 'messages d\'erreur'),
    ('--accent-on-soft', ('--drop-bg', '--panel'), 'zone de dépôt'),
    ('--prog-text', '--progress-track', 'pourcentage sur la barre vide'),
    ('--on-st-dl', '--st-dl', 'pourcentage sur la barre (téléchargement)'),
    ('--on-st-done', '--st-done', 'pourcentage sur la barre (terminé)'),
    ('--on-st-stop', '--st-stop', 'pourcentage sur la barre (arrêté)'),
    ('--on-st-err', '--st-err', 'pourcentage sur la barre (erreur)'),
    ('--login-err', '--panel', 'connexion : erreur'),
]
# Éléments graphiques (pastilles d'état) : 3:1 recommandé (WCAG 1.4.11) ; l'état est aussi
# écrit en toutes lettres, ces valeurs sont donc indicatives
GRAPHIC_PAIRS = [(f'--st-{k}', '--panel', f'pastille « {k} »') for k in ('dl', 'seed', 'done', 'stop', 'err', 'wait')]

# Apparence d'origine conservée telle quelle : ces couples du Classique sont sous 4,5:1
# depuis les premières versions. Le test vérifie qu'il n'y en a pas d'autre.
CLASSIC_KNOWN = {
    ('--muted', '--panel-2'), ('--muted', '--bg'), ('--muted', '--side-bg'), ('--muted', '--th-bg'), ('--muted', '--panel'), ('--muted', '--count-bg'),
    ('--faint', '--panel'), ('--menu-icon', '--menu-bg'), ('--tag-text', '--tag-bg'), ('--log-warn', '--panel'),
    ('--prog-text', '--progress-track'), ('--on-st-dl', '--st-dl'), ('--on-st-done', '--st-done'), ('--on-st-stop', '--st-stop'), ('--on-st-err', '--st-err'),
    ('--sort-arrow', '--th-bg'), ('--link', '--row-selected'), ('--header-text', '--header-btn-bg'),
    ('--header-text', '--header-menu-hover'), ('--danger', '--offline-bg'),
}

def color_of(v, spec):
    if isinstance(spec, tuple):
        top, under = spec
        return over(parse_color(resolve(v, f'var({top})')), color_of(v, under))
    c = parse_color(resolve(v, f'var({spec})'))
    if c[3] < 1:
        c = over(c, parse_color(resolve(v, 'var(--panel)')))
    return c

# Couples propres à certains thèmes (lot 4) : pastilles d'état, codes [DL]…, barre en caractères
STATES = ('dl', 'up', 'done', 'stop', 'wait', 'err')
EXTRA = {
    'papier': [(f'--pill-{k}-text', f'--pill-{k}-bg', f'pastille d\'état « {k} »') for k in STATES],
    'signal': [(f'--pill-{k}-text', f'--pill-{k}-bg', f'pastille d\'état « {k} »') for k in STATES],
    'terminal': [(f'--st-{k}', bg, f'code d\'état [{k}] ({w})') for k in ('dl', 'seed', 'done', 'stop', 'wait', 'err')
                 for bg, w in (('--panel', 'ligne'), ('--row-hover', 'ligne survolée'), ('--row-selected', 'ligne sélectionnée'))],
    'futur': [('--prog-text', '--row-selected', 'pourcentage à côté de la barre, ligne sélectionnée')],
}
for t in THEMES:
    v = theme_vars(t)
    pairs = TEXT_PAIRS + EXTRA.get(t, [])
    bad, classic_low = [], []
    worst = (99, '')
    for fg, bg, where in pairs:
        try:
            r = ratio(color_of(v, fg), color_of(v, bg))
        except ValueError as e:
            fail(f'{t} : {fg} / {bg} : {e}'); continue
        bgname = bg if isinstance(bg, str) else bg[0]
        known = t == 'classique' and (fg, bgname) in CLASSIC_KNOWN
        if r < worst[0] and not known:
            worst = (r, where)
        if r < 4.5:
            if known:
                classic_low.append(f'{where} {r:.2f}:1')
            else:
                bad.append(f'{where} ({fg} sur {bgname}) : {r:.2f}:1')
        elif DETAILS:
            print(f'     {t:9s} {where:45s} {r:5.2f}:1')
    for b in bad:
        fail(f'thème {t} : contraste insuffisant — {b}')
    if not bad:
        print(f'OK  thème {t} : {len(pairs) - len(classic_low)} couples texte / fond ≥ 4,5:1 (le plus faible : {worst[1]}, {worst[0]:.2f}:1)')
    if classic_low:
        print(f'    Classique (apparence d\'origine conservée), sous 4,5:1 : ' + ' ; '.join(classic_low))
    low = [f'{w} {ratio(color_of(v, a), color_of(v, b)):.2f}:1' for a, b, w in GRAPHIC_PAIRS if ratio(color_of(v, a), color_of(v, b)) < 3]
    if low:
        print(f'    info {t} : pastilles d\'état sous 3:1 (l\'état est aussi écrit) : ' + ' ; '.join(low))

print(f'\n{"ÉCHEC" if errors else "OK"} : {len(errors)} problème(s)')
sys.exit(1 if errors else 0)
