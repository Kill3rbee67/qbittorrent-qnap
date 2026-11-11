# Tests manuels sur un NAS

À faire sur un vrai NAS avant de publier une version qui touche l'interface ou le service. Chaque test indique l'action et le résultat attendu. Faites-les une fois par l'adresse directe `http://IP-DU-NAS:8085` et, pour ceux marqués **(QTS)**, aussi par `http://IP-DU-NAS:8080/qbittorrent/` et par myQNAPcloud Link (`https://xxx.myqnapcloud.com/qbittorrent/`).

Avant de commencer : sauvegardez le profil (voir README, « Mise à jour et migration »).

## 1. Mise à jour

| # | Action | Résultat attendu |
|---|---|---|
| 1.1 | Installer la nouvelle version par-dessus l'ancienne (App Center ou `.qpkg`). | Installation sans erreur, qBittorrent redémarre. |
| 1.2 | Se connecter avec le mot de passe habituel. | Connexion acceptée, pas de demande de changement de mot de passe. |
| 1.3 | Regarder la liste des téléchargements. | Tous les torrents sont là, avec leur progression. |
| 1.4 | Ouvrir Abonnements RSS. | Abonnements et flux conservés. |
| 1.5 | Ouvrir Outils › Réglages. | Réglages conservés (téléchargements simultanés, vitesses, notifications…). |
| 1.6 | Forcer le rechargement du navigateur (Ctrl+F5) puis Aide › À propos. | Le numéro de la nouvelle version s'affiche. |

## 2. Torrents (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 2.1 | Cliquer sur les en-têtes Nom, Taille, Progression (pas sur la poignée du bord). | Tri croissant puis décroissant, flèche ▲ / ▼. |
| 2.2 | Clic droit sur un torrent › Renommer… | Le nom change dans la liste (pas les fichiers sur le disque). |
| 2.3 | Clic droit › Limiter la vitesse de téléchargement… › 500. | Infos du torrent : « Limites de vitesse ↓ 500 Kio/s ». Remettre 0. |
| 2.4 | Clic droit › Limiter le ratio de partage… › Limiter à ratio 2. | Fenêtre rouverte : ratio 2 coché. Remettre « limites globales ». |
| 2.5 | Clic droit sur un torrent en cours › Télécharger en ordre séquentiel. | Coche ✓ au prochain clic droit ; Infos › Options : « ordre séquentiel ». |
| 2.6 | Clic droit › Copier › Lien magnet, coller dans un éditeur. | Lien `magnet:?xt=…` complet. |
| 2.7 | Clic droit › Exporter le .torrent. | Le fichier `.torrent` est téléchargé, avec le nom du torrent. |
| 2.8 | Édition › Suspendre la session, puis Édition › Reprendre la session. | Tous les échanges s'arrêtent, puis reprennent. |
| 2.9 | Affichage › Vitesse dans la barre de titre. | L'onglet du navigateur affiche `[↓ …, ↑ …]`. |

## 2 bis. Colonnes de la liste (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 2b.1 | Clic droit sur un en-tête de la liste. | Menu « Colonnes » : 38 colonnes, Nom coché et grisé (non décochable). |
| 2b.2 | Cocher Ratio, Ajouté le, Tracker ; décocher Envoi. | Les colonnes apparaissent ou disparaissent aussitôt, le menu reste ouvert. Échap le ferme. |
| 2b.3 | Glisser la poignée au bord droit de l'en-tête Taille. | La colonne s'élargit ou se rétrécit en suivant la souris, sans trier la liste. |
| 2b.4 | Double-cliquer sur la poignée de Répertoire de destination. | Largeur ajustée au plus long dossier affiché. |
| 2b.5 | Glisser l'en-tête Taille après État. | Un trait bleu montre la position ; Taille se place après État. La colonne Nom ne se déplace pas. |
| 2b.6 | Recharger la page (F5), puis l'ouvrir dans un autre onglet. | Colonnes, largeurs et ordre conservés. |
| 2b.7 | Afficher une dizaine de colonnes en plus, faire défiler la liste vers la droite. | La colonne Nom reste visible à gauche, le début des noms n'est jamais coupé. |
| 2b.8 | Clavier : Tab jusqu'à un en-tête, ←/→, Entrée, Maj+→, puis Maj+F10, ↓, Entrée, Échap. | Le focus passe d'un en-tête à l'autre ; Entrée trie ; Maj+→ déplace la colonne ; le menu des colonnes s'ouvre et se manipule sans souris. |
| 2b.9 | Clic droit sur un en-tête › Réinitialiser les colonnes. | Retour aux colonnes, largeurs et ordre d'origine. |
| 2b.10 | Avec plusieurs centaines de torrents : faire défiler, trier, redimensionner. | Pas de ralentissement visible ; le rafraîchissement toutes les 2 s ne fige pas la page. |

## 3. Panneau de détails (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 3.1 | Cliquer sur un torrent, onglet Informations. | Info hash, créé par, privé, limites, catégorie, étiquettes affichés. |
| 3.2 | Onglet Fichiers d'une saison : sélectionner un épisode › Ne pas télécharger. | Priorité « Ne pas télécharger », ligne grisée. |
| 3.3 | Clic droit sur un fichier › Renommer… | Le fichier est renommé sur le disque (vérifier dans File Station). |
| 3.4 | Renommer les fichiers… › rechercher `.` remplacer par ` ` | L'aperçu montre les nouveaux noms ; appliqué après « Renommer ». |
| 3.5 | Onglet Trackers › Ajouter des trackers…, puis le modifier et le retirer. | Liste à jour à chaque étape. |
| 3.6 | Onglet Pairs (torrent actif) › clic droit › Copier l'IP:port. | Adresse copiée. Ne pas bannir un vrai pair sans raison. |
| 3.7 | Onglet Sources HTTP › Ajouter / modifier / supprimer. | Liste à jour. |

## 4. Catégories, étiquettes, trackers (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 4.1 | Barre latérale › clic droit sur Catégories › Ajouter une catégorie… (« Films », `/share/Download/Films`). | Catégorie listée avec son compteur. |
| 4.2 | Clic droit sur un torrent › Catégorie › Films. | Colonne Catégorie à jour ; filtre « Films » : le torrent apparaît. |
| 4.3 | Clic droit sur un torrent › Étiquettes › Ajouter… « test ». | Étiquette affichée dans la colonne et la barre latérale. |
| 4.4 | Combiner un filtre d'état, une catégorie et une étiquette. | Liste filtrée ; puces dans le chemin, ✕ pour les retirer. |
| 4.5 | Trackers › clic droit sur un hôte › Arrêter les torrents. | Les torrents de ce tracker s'arrêtent. Les redémarrer. |
| 4.6 | Ajouter un torrent avec une catégorie et une étiquette (fenêtre d'ajout). | Le torrent porte bien les deux. |
| 4.7 | Retirer la catégorie et l'étiquette de test. | Elles disparaissent ; les torrents restent. |

## 5. Réglages (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 5.1 | Ouvrir Réglages puis Enregistrer sans rien toucher. | La fenêtre se ferme sans message ; aucun réglage ne change. |
| 5.2 | Onglet Interface : section « Réglés par le paquet QNAP ». | Valeurs en lecture seule, non modifiables. |
| 5.3 | Onglet Téléchargements › Dossiers surveillés › ajouter `/share/Download/A-ajouter` (dossier par défaut), enregistrer, y copier un `.torrent` avec File Station. | Le torrent est ajouté automatiquement. Retirer ensuite le dossier surveillé. |
| 5.4 | Onglet Notifications › Envoyer un courriel test (si l'e-mail est configuré). | Courriel reçu. |
| 5.5 | Onglet Avancé : changer « Intervalle d'enregistrement des statistiques », enregistrer, rouvrir. | Valeur conservée. Remettre l'ancienne. |

## 6. RSS (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 6.1 | Affichage › Lecteur RSS › Nouveau flux (adresse d'un flux de votre choix). | Le flux apparaît avec ses articles non lus. |
| 6.2 | Cliquer sur un article. | Description affichée en texte ; l'article passe en lu. |
| 6.3 | Double-cliquer sur un article. | Fenêtre d'ajout avec le lien préremplie. |
| 6.4 | Clic droit sur le flux › Télécharger automatiquement (nouvel abonnement)…, Options avancées › catégorie + filtre d'épisode. | Abonnement créé ; les prochains épisodes arrivent avec la catégorie choisie. |
| 6.5 | Modifier l'abonnement › Voir les articles correspondants. | Liste des articles qui correspondent. |
| 6.6 | Clic droit sur le flux › Renommer, Déplacer, Modifier l'URL, puis Supprimer. | Chaque action est visible dans la liste des flux. |

## 7. Outils (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 7.1 | Cliquer sur les vitesses en haut › Limites normales 1000 Kio/s. | Limite appliquée (vitesse plafonnée). Remettre 0. |
| 7.2 | Affichage › Journal › décocher Normal, filtrer « port ». | Seuls les messages correspondants restent. |
| 7.3 | Fichier › Créateur de torrent sur un petit dossier. | `.torrent` téléchargé ; torrent ajouté en partage. Le supprimer ensuite. |
| 7.4 | Par myQNAPcloud Link (HTTPS) : Fichier › Associer les liens magnet au navigateur, puis cliquer sur un lien magnet d'un site. | Le navigateur ouvre l'interface avec la fenêtre d'ajout préremplie. |
| 7.5 | Fichier › Quitter qBittorrent, puis le relancer depuis l'App Center. | Page « qBittorrent est arrêté » ; après relance et rechargement, tout revient. |

## 8. Cas d'erreur

| # | Action | Résultat attendu |
|---|---|---|
| 8.1 | App Center › arrêter qBittorrent pendant que l'interface est ouverte. | Barre d'état : « qBittorrent ne répond pas » ; une action affiche un message clair. |
| 8.2 | Relancer qBittorrent. | L'interface redemande la connexion, puis tout fonctionne. |
| 8.3 | Ouvrir la fenêtre Renommer d'un torrent, le supprimer dans un autre onglet, valider. | « Introuvable : le torrent a peut-être été supprimé entre-temps. » |
| 8.4 | Laisser l'interface ouverte plus d'une heure sans activité (expiration de session), puis cliquer. | Retour à la page de connexion, sans erreur. |
| 8.5 | Sur téléphone : ouvrir l'interface, menu ☰, détails d'un torrent. | Pas de défilement horizontal ; tout reste utilisable. |
