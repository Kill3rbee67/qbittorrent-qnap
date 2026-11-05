# Journal des versions

Le numéro de version reprend celui de qBittorrent, suivi d'un numéro de révision du paquet (5.3.0.**4** = révision 4 du paquet pour qBittorrent 5.3.0).

## 5.3.3.2
- Mise à jour depuis la 5.3.3.0 : QTS ajoutait la nouvelle règle de proxy `/qbittorrent/` sans retirer l'ancienne (`/qbittorrent`), qui restait prioritaire, d'où l'erreur « Type de fichier inacceptable » persistante. Le paquet retire l'ancienne règle de `/etc/app_proxy.conf` au démarrage et recharge le proxy de QTS.

## 5.3.3.1
- Correction de l'accès par QTS et myQNAPcloud Link : « Type de fichier inacceptable, seul un fichier normal est autorisé » sur `/qbittorrent/`. QTS génère `ProxyPass "/qbittorrent" "http://127.0.0.1:8085/"`, qui transmettait `//` à qBittorrent ; le chemin de proxy est désormais `/qbittorrent/`. L'adresse doit donc se terminer par une barre oblique.

## 5.3.3.0
- **Accès à distance par myQNAPcloud Link** : l'interface est aussi servie par le serveur web de QTS à l'adresse `/qbittorrent/` (proxy QTS), donc joignable depuis myqnapcloud.com sans ouvrir de port. L'icône du bureau QTS ne renvoie plus « Ce service ne prend pas en charge myQNAPcloud Link ».
- Réglages appliqués au démarrage pour cet accès : proxy local déclaré de confiance (vraie adresse du client, protection CSRF), vérification de l'en-tête Host désactivée, authentification obligatoire pour les connexions locales (option « Ignorer l'authentification pour localhost » bloquée dans l'interface classique).
- Outils › Réglages › Interface : adresses d'accès indiquées ; le HTTPS de qBittorrent, incompatible avec l'accès par QTS, ne se modifie plus depuis `/qbittorrent/`.
- Page de connexion : conseils adaptés à l'accès par myQNAPcloud Link.

## 5.3.2.0
Sécurité
- Page de connexion : avertissement explicite (le mot de passe initial `adminadmin` est public, à changer aussitôt ; pas d'exposition sur Internet), renforcé quand la page est ouverte depuis une adresse Internet.
- **HTTPS en option** (Outils › Réglages › Interface) avec le certificat du NAS, recopié à chaque démarrage pour suivre ses renouvellements (Let's Encrypt compris), ou un certificat auto-signé à défaut.
- README : risques liés au mot de passe initial public et à l'exécution en root détaillés.

Fonctionnalités
- **Espace disque** : espace libre et taille des torrents affichés dans la fenêtre d'ajout, avec alerte en cas de manque de place ; espace libre dans la barre d'état.
- **Notifications** (Outils › Réglages › Notifications) : e-mail à la fin d'un téléchargement, webhook (Discord, Slack, Mattermost, ntfy, Home Assistant…) à chaque nouveau torrent et/ou téléchargement terminé.

Packaging
- Test automatique de mise à jour en CI : la version précédente est installée, des données y sont créées, la nouvelle version est installée par-dessus et la conservation de tout est vérifiée avant chaque publication.
- Vérification explicite des empreintes des binaires amont en CI (`./build.sh --check`) et fichier `PROVENANCE.txt` dans chaque release.
- Workflow hebdomadaire qui ouvre un ticket quand une nouvelle version de qbittorrent-nox ou de QDK est publiée, avec les lignes de `build.sh` à mettre à jour.

Documentation et communauté
- README : résumé en anglais en tête, sections Mise à jour et migration, Désinstallation, Notifications, Plex / Jellyfin / Container Station, Licences.
- `docs/LICENCES.md` (licences de chaque composant embarqué), en-têtes SPDX, `CONTRIBUTING.md`, modèles de tickets.

## 5.3.1.1
- **Version ARM 64 bits (expérimentale)** : chaque release contient désormais aussi `qBittorrent_<version>_arm_64.qpkg`, pour les NAS QNAP à processeur ARM 64 bits. Pas encore testée sur un vrai NAS.
- **Source d'applications App Center (en test)** : en ajoutant l'adresse du `repository.xml` du projet dans l'App Center, qBittorrent s'installe en un clic et les mises à jour sont proposées automatiquement. Le bon paquet (x86_64 ou ARM) est choisi selon le NAS.
- Nouvelles installations : 10 téléchargements simultanés et 15 torrents actifs par défaut (au lieu de 3 et 5), torrents lents non comptés. Les installations existantes gardent leurs réglages.
- Textes de l'interface et de la documentation rendus neutres vis-à-vis des sites de torrents.

## 5.3.1.0
- **Barre de menus** dans l'interface explorateur, comme dans qBittorrent : Fichier, Édition, Affichage, Outils, Aide.
  - Édition : démarrer, arrêter, forcer la reprise, déplacer vers un autre dossier, revérifier, réannoncer, ordre dans la file d'attente, supprimer, tout sélectionner, tout démarrer / arrêter.
  - Affichage : journal de qBittorrent, statistiques.
  - Outils : réglages, limites de vitesse alternatives, mot de passe, réglages avancés.
  - Aide : à propos (versions), guide, signaler un problème.
- **Clic droit** sur un torrent : menu des actions.
- **Fenêtre Réglages** en français : téléchargements, file d'attente (nombre de téléchargements simultanés), vitesse (limites, limites alternatives et horaire), connexion, BitTorrent, partage, RSS. Les autres réglages s'ouvrent directement dans l'interface classique.
- Sur téléphone, les menus sont regroupés dans un bouton « Menu ».

## 5.3.0.9
- **Abonnements RSS** : bouton « S'abonner (RSS) » dans chaque dossier. On colle l'adresse d'une recherche (convertie automatiquement en flux RSS), et les nouveaux épisodes sont téléchargés automatiquement dans ce dossier. Seuls les épisodes à venir sont pris par défaut, sans doublon.
- Page « Abonnements RSS » : liste des abonnements avec dernier ajout et état du flux, suspendre / modifier / supprimer, vérification immédiate, fréquence de vérification réglable.
- Le RSS de qBittorrent est activé automatiquement au premier abonnement.

## 5.3.0.8
- L'interface d'origine de qBittorrent est désormais **incluse à côté de l'explorateur**, en français. On passe de l'une à l'autre en un clic : « ⇄ Interface classique » d'un côté, « ⇄ Interface explorateur » de l'autre. Plus besoin de changer le réglage « Utiliser l'interface Web alternative ».

## 5.3.0.7
- **Correction** : les torrents restaient « En attente de sources » quand Download Station était encore installé. Les deux utilisaient le port 6881 et qBittorrent ne pouvait alors contacter aucun tracker. Nouveau port par défaut **51881**, et si le port configuré est déjà pris au démarrage, un port libre est choisi automatiquement (indiqué dans le journal).
- Panneau de détails : onglets **Trackers** (état et message d'erreur de chaque tracker, avec une aide au diagnostic) et **Pairs** (clients connectés).
- Barre du bas : état de la connexion au réseau BitTorrent et nombre de nœuds DHT.

## 5.3.0.6
- Panneau de détails : les champs « Dossier » et « Commentaire » ne se chevauchent plus (affichés sur toute la largeur, avec retour à la ligne).
- Une adresse web en commentaire (ex. page du torrent sur son site d'origine) est cliquable.

## 5.3.0.5
- Panneau de détails quand on clique sur un torrent, comme dans Download Station :
  - onglet **Informations** : heure de début, durée écoulée, temps restant, progression, téléchargé, envoyé, vitesses, ratio de partage, sources et pairs ;
  - onglet **Fichiers** : progression de chaque fichier (pratique pour suivre les épisodes d'une saison), avec la possibilité de ne pas télécharger certains fichiers.
- Un clic sur une ligne sélectionne ce torrent ; les cases à cocher permettent toujours d'en sélectionner plusieurs.
- Barre du haut plus compacte sur téléphone.

## 5.3.0.4
- Mot de passe initial `admin` / `adminadmin`, à changer obligatoirement à la première connexion.
- Un mot de passe déjà défini n'est jamais écrasé lors d'une mise à jour.

## 5.3.0.3
- Bouton « Mot de passe » dans l'interface.

## 5.3.0.2
- Nouvelle interface web « explorateur de fichiers » : navigation dans les dossiers du NAS, ajout de torrents depuis le PC, par lien magnet ou depuis le NAS, création de dossiers, liste des téléchargements.
- Destination modifiable dans la fenêtre d'ajout.

## 5.3.0.1
- Correction : le service ne démarrait pas sur QTS (`nohup` absent du système).

## 5.3.0
- Première version : qBittorrent-nox 5.3.0 en paquet QPKG, interface web sur le port 8085.
