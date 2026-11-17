#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-or-later
"""Vérifications statiques de la traduction anglaise (sans navigateur, lancées par la CI).

1. Chargement : les deux pages (explorateur, connexion) chargent explorer/i18n-en.js puis
   explorer/i18n.js dans le <head>, en chemin relatif avec ?v=, et contiennent le
   sélecteur de langue (.langsw).
2. Dictionnaire (public/explorer/i18n-en.js, bloc « exact ») : pas de doublon, pas de
   texte vide, pas d'espace en trop ni d'espace insécable dans les clés, pas de
   traduction qui serait elle-même retraduite (boucle).
3. Fidélité : la ponctuation finale (…, deux-points, point, point d'interrogation) et les
   nombres du texte français se retrouvent dans la traduction.
4. Textes fixes des deux pages (hors scripts) : chacun a sa traduction.

Ce script ne peut pas voir les textes construits par le JavaScript : pour ceux-là, ouvrez
l'interface en anglais avec ?i18n=debug puis tapez I18N.missing() dans la console.

Usage : tests/i18n-check.py
"""
import json, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'shared', 'webui')
DICT = os.path.join(ROOT, 'public', 'explorer', 'i18n-en.js')
PAGES = {'explorateur': os.path.join(ROOT, 'private', 'index.html'), 'connexion': os.path.join(ROOT, 'public', 'index.html')}
errors = []

def fail(msg):
    errors.append(msg); print('ÉCHEC ' + msg)

def short(s):
    return s if len(s) <= 70 else s[:67] + '…'

# ---------------------------------------------------------------- 1. chargement
before = len(errors)
for name, path in PAGES.items():
    html = open(path, encoding='utf-8').read()
    head = html.split('</head>')[0]
    a = head.find('<script src="explorer/i18n-en.js?v=__QPKG_VER__"></script>')
    b = head.find('<script src="explorer/i18n.js?v=__QPKG_VER__"></script>')
    if a < 0 or b < 0:
        fail(f'page {name} : explorer/i18n-en.js et explorer/i18n.js doivent être chargés dans le <head> (chemin relatif, ?v=__QPKG_VER__)')
    elif a > b:
        fail(f'page {name} : explorer/i18n-en.js (dictionnaire) doit être chargé avant explorer/i18n.js')
    if 'class="langsw"' not in html:
        fail(f'page {name} : sélecteur de langue absent (élément class="langsw")')
for f in ('i18n.js', 'i18n-en.js'):
    if not os.path.isfile(os.path.join(ROOT, 'public', 'explorer', f)):
        fail(f'public/explorer/{f} introuvable')
if len(errors) == before:
    print('OK  chargement : dictionnaire puis i18n.js dans le <head> des deux pages, sélecteur présent')
if not os.path.isfile(DICT):
    print(f'\nÉCHEC : {len(errors)} problème(s)'); sys.exit(1)

# ---------------------------------------------------------------- 2. dictionnaire
src = open(DICT, encoding='utf-8').read()
m = re.search(r'var exact = \{(.*?)\n  \};', src, re.S)
if not m:
    fail('i18n-en.js : bloc « var exact = { … }; » introuvable')
    print(f'\nÉCHEC : {len(errors)} problème(s)'); sys.exit(1)
STR = r'"((?:[^"\\]|\\.)*)"'
pairs = [(json.loads('"' + k + '"'), json.loads('"' + v + '"')) for k, v in re.findall(STR + r'\s*:\s*' + STR, m.group(1))]
# Toute ligne du bloc doit être une suite de paires, un commentaire ou vide
for line in m.group(1).split('\n'):
    rest = re.sub(STR + r'\s*:\s*' + STR + r'\s*,?', '', line)
    rest = re.sub(r'/\*.*?\*/', '', rest).strip()
    if rest and not rest.startswith('//'):
        fail(f'i18n-en.js : ligne non reconnue dans « exact » : {short(line.strip())}')
before = len(errors)
exact, seen = {}, set()
for k, v in pairs:
    if k in seen:
        fail(f'clé en double : « {short(k)} »')
    seen.add(k); exact[k] = v
    if not k.strip() or not v.strip():
        fail(f'texte vide : « {short(k)} » → « {short(v)} »')
    if k != k.strip() or '  ' in k or ' ' in k or ' ' in k:
        fail(f'clé avec espace en trop ou insécable (les écrire avec des espaces simples) : « {short(k)} »')
for k, v in exact.items():
    if v != k and v in exact and exact[v] != v:
        fail(f'boucle : « {short(k)} » → « {short(v)} », lui-même traduit en « {short(exact[v])} »')
if len(errors) == before:
    print(f'OK  dictionnaire : {len(exact)} textes, pas de doublon, de clé mal espacée ni de boucle')

# ---------------------------------------------------------------- 3. fidélité
before = len(errors)
ENDS = (('…', '…'), (' :', ':'), (':', ':'), (' ?', '?'), ('.', '.'), (' ;', ';'))
for k, v in exact.items():
    for fr, en in ENDS:
        if k.endswith(fr):
            if not v.endswith(en):
                fail(f'ponctuation finale : « {short(k)} » se termine par « {fr.strip()} », pas « {short(v)} »')
            break
    for n in re.findall(r'\d{3,}', k):
        if n not in v:
            fail(f'nombre {n} absent de la traduction de « {short(k)} »')
if len(errors) == before:
    print('OK  fidélité : ponctuation finale et nombres conservés')

# ---------------------------------------------------------------- 4. textes fixes des pages
# Identiques dans les deux langues
SAME = {'qBittorrent', 'admin', 'adminadmin', '↓ —', '↑ —'}
RULES_HINT = re.compile(r'^\d')

class Texts(HTMLParser):
    def __init__(self):
        super().__init__(); self.skip = 0; self.out = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        for k, v in attrs:
            if k in ('title', 'placeholder', 'aria-label', 'alt') and v:
                self.out.append(v)
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1
    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)

before = len(errors)
total = 0
for name, path in PAGES.items():
    p = Texts(); p.feed(open(path, encoding='utf-8').read())
    for t in p.out:
        t = re.sub(r'\s+', ' ', t.replace(' ', ' ').replace(' ', ' ')).strip()
        if not t or not re.search(r'[A-Za-zÀ-ÿ]', t) or t in SAME:
            continue
        total += 1
        if t not in exact:
            fail(f'page {name} : texte sans traduction dans i18n-en.js : « {short(t)} »')
if len(errors) == before:
    print(f'OK  textes fixes : les {total} textes des deux pages ont une traduction')

print(f'\n{"ÉCHEC" if errors else "OK"} : {len(errors)} problème(s)')
sys.exit(1 if errors else 0)
