# qBittorrent pour QNAP

Paquet **QPKG** prêt à installer qui ajoute [qBittorrent](https://www.qbittorrent.org/) à un NAS QNAP, avec une interface web en français organisée comme un explorateur de fichiers. Pensé comme une alternative à Download Station : pas de Docker, pas de ligne de commande, tout se fait depuis l'App Center et le navigateur.

![Explorateur de dossiers du NAS](docs/captures/explorateur.png)

## Fonctionnalités

- **Navigation dans les dossiers partagés du NAS** (arborescence, fil d'Ariane, liste ou icônes) pour choisir où télécharger.
- **Ajout de torrents dans le dossier ouvert** :
  - fichiers `.torrent` depuis le PC (bouton ou glisser-déposer) ;
  - liens magnet ;
  - fichiers `.torrent` déjà présents sur le NAS (cocher ou double-cliquer).
- **Création de dossiers** à la volée : le dossier est créé au premier téléchargement.
- **Abonnements RSS** : depuis le dossier d'une série, « S'abonner (RSS) » avec l'adresse d'une recherche nyaa.si, et chaque nouvel épisode publié est téléchargé automatiquement dans ce dossier.
- **Suivi des téléchargements** : progression, vitesses, temps restant, filtres (en cours, terminés, arrêtés, en erreur), démarrer, arrêter, supprimer avec ou sans les fichiers.
- **Première connexion simple** : identifiants initiaux connus, changement de mot de passe imposé.
- L'**interface d'origine** de qBittorrent (en français) est incluse : bouton « ⇄ Interface classique » pour y aller, bouton « ⇄ Interface explorateur » pour revenir. Les deux restent disponibles, sans rien changer dans les réglages.

![Liste des téléchargements](docs/captures/telechargements.png)

## Compatibilité

| | |
|---|---|
| Processeur | **x86_64** (Intel / AMD) uniquement |
| Testé sur | TS-453D (Celeron J4125) |
| QTS minimum | 4.5.0 |
| qBittorrent | 5.3.0 (binaire statique [userdocs/qbittorrent-nox-static](https://github.com/userdocs/qbittorrent-nox-static)) |

Les modèles ARM ne sont pas encore pris en charge. Les contributions sont bienvenues : il suffit en principe d'ajouter le binaire ARM correspondant au build.

Pour connaître le processeur de votre NAS : Panneau de configuration › Système › Informations système.

## Installation

1. Téléchargez le fichier `qBittorrent_<version>_x86_64.qpkg` depuis la [dernière release](../../releases/latest).
2. Dans l'**App Center**, ouvrez les paramètres (roue dentée), onglet *Général*, et cochez **« Autoriser l'installation d'applications sans signature numérique valide »**. Le paquet n'est pas signé par QNAP : seul QNAP (ou le Qnapclub Store) peut signer des paquets reconnus par l'App Center.
3. Toujours dans l'App Center, cliquez sur **Installation manuelle** et choisissez le fichier `.qpkg`.
4. Ouvrez **`http://IP-DE-VOTRE-NAS:8085`**.

### Première connexion

- Utilisateur : **`admin`**
- Mot de passe : **`adminadmin`**

Vous devrez immédiatement choisir votre propre mot de passe. Changez-le dès l'installation : `adminadmin` est connu de tous.

![Choix du mot de passe à la première connexion](docs/captures/premiere-connexion.png)

Vous pourrez ensuite le modifier à tout moment avec le bouton « Mot de passe ».

## Télécharger automatiquement une série (RSS)

1. Sur nyaa.si, faites la recherche qui correspond aux sorties voulues, par exemple `Tsundere-Raws Nia Liston 1080p`, et copiez l'adresse de la page de résultats.
2. Dans l'explorateur, ouvrez (ou créez) le dossier où ranger la série, puis cliquez sur **« S'abonner (RSS) »** et collez l'adresse. Elle est convertie automatiquement en flux RSS.
3. Facultatif : affinez avec « Le titre doit contenir » / « ne doit pas contenir » (`720p|Batch`…).

Par défaut, seuls les **épisodes à venir** sont téléchargés (cochez « Télécharger aussi les épisodes déjà publiés » pour rattraper ceux du flux), et un même épisode n'est jamais téléchargé deux fois. La page **Abonnements RSS** permet de suspendre, modifier ou supprimer un abonnement, de forcer une vérification et de régler la fréquence de vérification des flux (30 minutes par défaut).

## Bon à savoir

| | |
|---|---|
| Interface web | port **8085** (le 8080 est utilisé par QTS) |
| Port BitTorrent | **51881** : pour de bons débits, redirigez-le vers le NAS sur votre box. Si ce port est déjà pris au démarrage, un port libre proche est choisi automatiquement (voir le journal). |
| Dossier de téléchargement par défaut | dossier partagé **Download** de QTS |
| Journal | `/share/CACHEDEV1_DATA/.qpkg/qBittorrent/qbittorrent.log` (le volume peut varier) |
| Réglages et torrents | dossier `profile/` du paquet, conservés lors des mises à jour |

**Mise à jour** : installez simplement la nouvelle version par-dessus l'ancienne. Vos torrents et votre mot de passe sont conservés.

**Interface d'origine de qBittorrent** : bouton « ⇄ Interface classique » (barre du haut), ou directement `http://IP-DU-NAS:8085/classic.html`. Pour revenir : bouton « ⇄ Interface explorateur » en haut à droite. Ne décochez pas « Utiliser l'interface Web alternative » dans les options : ce réglage fait fonctionner les deux interfaces.

## Dépannage

**L'interface ne répond pas (`ERR_CONNECTION_REFUSED`)**
Vérifiez que l'application est activée dans l'App Center, puis consultez le journal en SSH :
```sh
/etc/init.d/qBittorrent.sh start
cat /share/CACHEDEV1_DATA/.qpkg/qBittorrent/qbittorrent.log
```

**Les téléchargements restent « En attente de sources » alors que le torrent a des seeders**
Ouvrez le torrent, onglet **Trackers**. Si tous les trackers restent « Pas encore contacté » et que la barre du bas indique **DHT : 0 nœuds**, qBittorrent n'arrive pas à ouvrir son port BitTorrent, généralement parce que **Download Station** l'utilise déjà (port 6881). Redémarrez qBittorrent depuis l'App Center : un port libre est choisi automatiquement. Vous pouvez aussi changer le port dans Interface classique › Outils › Options › Connexion. Si les trackers affichent une erreur, lisez la colonne « Message » : pare-feu (QuFirewall), VPN, proxy ou DNS.

**qBittorrent ne démarre plus après une mise à jour du firmware**
Une mise à jour de QTS peut désactiver l'option « Autoriser l'installation d'applications sans signature numérique valide ». Réactivez-la dans l'App Center.

**Mot de passe perdu**
En SSH, en root, supprimez la ligne du mot de passe puis redémarrez. Le mot de passe initial `adminadmin` sera de nouveau appliqué :
```sh
/etc/init.d/qBittorrent.sh stop
sed -i '/^Password_PBKDF2=/d' /share/CACHEDEV1_DATA/.qpkg/qBittorrent/profile/qBittorrent/config/qBittorrent.conf
/etc/init.d/qBittorrent.sh start
```

## Sécurité

- N'exposez pas le port 8085 sur Internet. Pour un accès à distance, passez par un VPN (QVPN, WireGuard…).
- Le changement de mot de passe à la première connexion est imposé par l'interface. Ce n'est pas une barrière de sécurité : changez-le vous-même dès l'installation.
- Le service tourne en root, comme la plupart des paquets QPKG.
- Le binaire qBittorrent est téléchargé depuis le projet userdocs et vérifié par son empreinte SHA-256 au moment du build.

## Construire le paquet soi-même

Sous Linux (Debian, Ubuntu…) :

```sh
sudo apt install git curl rsync gcc qt6-l10n-tools
./build.sh
```

Le paquet est produit dans `build/`. Le script télécharge le binaire qBittorrent (version et empreinte SHA-256 épinglées en tête de `build.sh`) et l'outil [QDK](https://github.com/qnap-dev/QDK) de QNAP.

**Publier une nouvelle version** : augmentez `QPKG_VER` dans `src/qpkg.cfg`, complétez `CHANGELOG.md` et poussez sur `main`. GitHub Actions construit le paquet, crée le tag `v<version>` et publie la release. Chaque pull request est aussi construite (paquet disponible dans les artefacts du workflow).

### Organisation du dépôt

```
src/qpkg.cfg                    description du paquet (nom, version, ports)
src/shared/qBittorrent.sh       script de démarrage et d'arrêt utilisé par QTS
src/shared/webui/public/        page de connexion
src/shared/webui/private/       interface « explorateur de fichiers » (l'interface d'origine y est ajoutée au build, sous classic.html)
src/icons/                      icônes de l'App Center
src/package_routines            gabarit QDK (non modifié)
build.sh                        construction du .qpkg
```

## Crédits et licence

- [qBittorrent](https://github.com/qbittorrent/qBittorrent) (GPL-2.0-or-later)
- [qbittorrent-nox-static](https://github.com/userdocs/qbittorrent-nox-static) par userdocs, pour les binaires statiques
- [QDK](https://github.com/qnap-dev/QDK), l'outil de création de paquets de QNAP (GPL-2.0-or-later)
- L'interface web d'origine et ses traductions proviennent des sources de qBittorrent (même version que le binaire), récupérées au build.

Ce projet est distribué sous licence **GPL-2.0-or-later** (voir [LICENSE](LICENSE)).

Projet communautaire, sans lien avec QNAP Systems, Inc. ni avec le projet qBittorrent. QNAP, QTS et Download Station sont des marques de QNAP Systems, Inc.

---

### English summary

A ready-to-install **QPKG** that adds qBittorrent 5.3 to x86_64 QNAP NAS models, with a French web UI laid out like a file browser: navigate your NAS shares and add `.torrent` files (from your PC or already on the NAS) or magnet links straight into the folder you are viewing. Install it from App Center (manual installation; enable unsigned apps first), then open `http://NAS-IP:8085` and log in with `admin` / `adminadmin`. You will be asked to choose your own password. Build it yourself with `./build.sh`.
