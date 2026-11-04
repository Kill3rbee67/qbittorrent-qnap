# Journal des versions

Le numéro de version reprend celui de qBittorrent, suivi d'un numéro de révision du paquet (5.3.0.**4** = révision 4 du paquet pour qBittorrent 5.3.0).

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
- Une adresse web en commentaire (ex. page nyaa.si du torrent) est cliquable.

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
