# Contribuer

Merci de votre intérêt ! Les contributions sont bienvenues, en particulier :

- **Retours sur la version ARM 64 bits** (TS-233, TS-433, TS-x28A, TS-x32X…), qui n'a pas encore été testée sur un vrai NAS : même un simple « ça marche » est utile.
- **Retours sur la source d'applications App Center** : votre modèle voit-il qBittorrent dans la source ? (la liste des plateformes est dans `tools/make-repository.sh`).
- Corrections, améliorations de l'interface, de la documentation ou des traductions.

## Signaler un problème

Ouvrez un [ticket](../../issues/new/choose) en précisant :

- le modèle du NAS et son processeur (Panneau de configuration › Système › Informations système) ;
- la version de QTS et la version du paquet (Aide › À propos dans l'interface) ;
- ce que vous avez fait, ce qui était attendu, ce qui s'est passé ;
- si possible, la fin du journal : `tail -n 50 /share/CACHEDEV1_DATA/.qpkg/qBittorrent/qbittorrent.log` (en SSH).

Ne publiez jamais votre mot de passe ni le contenu de `profile/` dans un ticket.

## Construire et tester

Sous Linux (Debian, Ubuntu…), ou dans GitHub Codespaces :

```sh
sudo apt install git curl rsync gcc qt6-l10n-tools
./build.sh                                                   # paquets dans build/
tests/upgrade-test.sh build/qBittorrent_<version>_x86_64.qpkg   # installe la dernière release puis la vôtre par-dessus
```

`tests/upgrade-test.sh` simule QTS dans un dossier temporaire (port 8085 nécessaire). Sans second argument, il télécharge la dernière release publiée si la variable `GITHUB_REPOSITORY` est définie (`GITHUB_REPOSITORY=Kill3rbee67/qbittorrent-qnap`) ; sinon il teste une installation neuve.

Pour essayer l'interface sans NAS, lancez le binaire (dans `.cache/` après un build) avec un profil de test qui pointe vers `src/shared/webui` :

```sh
mkdir -p /tmp/qbt/qBittorrent/config
printf '[LegalNotice]\nAccepted=true\n[WebUI]\nPort=8085\nAlternativeUIEnabled=true\nRootFolder=%s\n' "$PWD/src/shared/webui" > /tmp/qbt/qBittorrent/config/qBittorrent.conf
.cache/qbittorrent-nox-*-x86_64 --profile=/tmp/qbt
```

puis ouvrez <http://localhost:8085> (le mot de passe temporaire s'affiche dans le terminal). Ajoutez `?root=/un/dossier` à l'adresse pour naviguer ailleurs que dans `/share`.

## Organisation et conventions

- **Script de service** (`src/shared/qBittorrent.sh`) : shell POSIX, il doit tourner avec le BusyBox de QTS (pas de `nohup`, pas de bashismes, pas de dépendance absente de QTS).
- **Interface** (`src/shared/webui/private/index.html`) : un seul fichier HTML/CSS/JS, sans framework ni dépendance externe (le NAS peut ne pas avoir Internet), textes en français.
- **Versions** : `QPKG_VER` dans `src/qpkg.cfg` = version de qBittorrent + numéro de révision du paquet. Toute modification visible est décrite dans `CHANGELOG.md` ; une entrée qui change le format du profil est marquée **« ⚠ Migration »**.
- **Mise à jour des binaires amont** : un ticket est ouvert automatiquement chaque semaine quand une nouvelle version sort ; reprendre les lignes proposées dans `build.sh` après avoir vérifié les empreintes.
- **Licence** : en contribuant, vous acceptez que votre contribution soit distribuée sous GPL-2.0-or-later. Ajoutez l'en-tête `SPDX-License-Identifier: GPL-2.0-or-later` aux nouveaux fichiers.

## Proposer une modification

1. Créez une branche, faites vos changements, testez avec `./build.sh` et `tests/upgrade-test.sh`.
2. Ouvrez une pull request : la CI vérifie les empreintes, construit les deux paquets et rejoue le test de mise à jour ; le paquet construit est téléchargeable dans les artefacts du workflow.
3. Décrivez ce que vous avez testé (et sur quel NAS, le cas échéant).
