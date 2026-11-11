# Licences des composants

Le code propre à ce projet (scripts, interface explorateur, outillage de build et de test) est sous licence **GPL-2.0-or-later** ([LICENSE](../LICENSE)). Les fichiers concernés portent l'en-tête `SPDX-License-Identifier: GPL-2.0-or-later`.

Chaque paquet `.qpkg` publié contient en plus les composants tiers ci-dessous, redistribués sans modification (sauf mention contraire). Les versions exactes et les empreintes SHA-256 de chaque release figurent dans son fichier `PROVENANCE.txt`.

| Composant | Où dans le paquet | Licence | Sources |
|---|---|---|---|
| qBittorrent (`qbittorrent-nox`) | `qbittorrent-nox` | GPL-2.0-or-later, avec exception autorisant la liaison avec OpenSSL | <https://github.com/qbittorrent/qBittorrent> (tag correspondant à la version, ex. `release-5.3.0`) |
| Binaire statique (recette de compilation) | `qbittorrent-nox` | Apache-2.0 pour les scripts de userdocs | <https://github.com/userdocs/qbittorrent-nox-static> (release indiquée dans `PROVENANCE.txt`) |
| libtorrent-rasterbar | lié statiquement dans `qbittorrent-nox` | BSD-3-Clause | <https://github.com/arvidn/libtorrent> |
| Qt | lié statiquement dans `qbittorrent-nox` | LGPL-3.0 (ou GPL) | <https://download.qt.io/archive/qt/> ; recette de compilation chez userdocs |
| OpenSSL | lié statiquement dans `qbittorrent-nox` | Apache-2.0 | <https://github.com/openssl/openssl> |
| Boost | lié statiquement dans `qbittorrent-nox` | BSL-1.0 | <https://www.boost.org/> |
| zlib | lié statiquement dans `qbittorrent-nox` | zlib | <https://zlib.net/> |
| Interface web d'origine de qBittorrent | `webui/private/` (`classic.html`, `scripts/`, `css/`, `views/`…) et `webui/translations/` | GPL-2.0-or-later et MIT selon les fichiers (voir leurs en-têtes) | sources de qBittorrent, dossier `src/webui/www` du même tag |
| MooTools, MochaUI (Greg Houston), clipboard-copy, vanillaSelectBox (utilisés par l'interface d'origine) | `webui/private/scripts/lib/` | MIT (voir l'en-tête de chaque fichier) | <https://mootools.net/> ; les autres sont redistribués par qBittorrent dans `src/webui/www/private/scripts/lib` |
| Polices des thèmes (Inter, JetBrains Mono, DM Sans, Fraunces, Space Grotesk, IBM Plex Mono, Exo 2, Share Tech Mono) | `webui/public/explorer/fonts/*.woff2` (sous-ensembles latin et latin étendu) | SIL Open Font License 1.1 (fichiers `*-OFL.txt` à côté) | <https://fontsource.org> (paquets npm `@fontsource` et `@fontsource-variable`, version 5.3.0), d'après les dépôts des auteurs |
| Script d'installation QDK | en-tête de chaque `.qpkg` (`qinstall.sh`), gabarit `package_routines` | GPL-2.0-or-later pour `qinstall.sh` (en-tête du fichier) ; le gabarit, sans en-tête, relève de la licence de QDK | <https://github.com/qnap-dev/QDK> (tag indiqué dans `PROVENANCE.txt`) |

Remarques :

- Le fichier `debian/copyright` du dépôt QDK indique « GPL-3 » pour l'ensemble du projet, alors que `qinstall.sh`, repris dans chaque paquet, porte un en-tête « GPL version 2 or (at your option) any later version ». Dans les deux cas, la redistribution de ces fichiers au sein d'un projet sous GPL-2.0-or-later (donc utilisable sous GPL-3) est permise.
- Le binaire `qbittorrent-nox` est redistribué tel que publié par userdocs (empreinte vérifiée à chaque build). Ses sources et la recette permettant de le reconstruire sont publiques aux adresses ci-dessus.
- Ce document est fourni à titre informatif ; en cas de doute, ce sont les licences et en-têtes de chaque projet qui font foi.
