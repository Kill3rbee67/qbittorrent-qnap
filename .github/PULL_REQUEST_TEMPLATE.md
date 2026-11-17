## Ce que change cette pull request

<!-- En une ou deux phrases. English is welcome too. -->

## Comment je l'ai testée

- [ ] `./build.sh` passe
- [ ] `tests/upgrade-test.sh build/qBittorrent_<version>_x86_64.qpkg` passe
- [ ] Testé sur un vrai NAS (modèle et version de QTS : …)
- [ ] Documentation seulement, rien à tester

## Avant de fusionner

- [ ] Toute modification visible est décrite dans `CHANGELOG.md`
- [ ] Tout nouveau texte de l'interface a sa traduction dans `explorer/i18n-en.js` (`python3 tests/i18n-check.py` passe)
- [ ] `QPKG_VER` (`src/qpkg.cfg`) n'est augmenté que si cette PR doit publier une nouvelle version
- [ ] Les nouveaux fichiers portent l'en-tête `SPDX-License-Identifier: GPL-2.0-or-later`
- [ ] Aucun mot de passe, adresse de NAS ni contenu de `profile/` dans les captures ou les journaux
