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

## 2 ter. Thèmes (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 2t.1 | Menu Thème. | Il s'ouvre sous son onglet : Automatique, puis Classique, Ardoise, Papier, Signal, Minimal, Futur, Terminal, Aurore, chacun avec 4 carrés de couleur ; coche sur Classique. |
| 2t.2 | Choisir chaque thème l'un après l'autre. | Couleurs et polices changent aussitôt, sans rechargement ; la sélection, le tri et la position dans la liste restent. Textes lisibles partout (liste, barre latérale, menus, entrées grisées, en-têtes de colonnes, barres de progression). |
| 2t.3 | Avec un thème choisi : ouvrir Réglages, l'ajout d'un torrent, le panneau de détails, le lecteur RSS, un clic droit. | Fenêtres, champs, listes déroulantes et menus aux couleurs du thème. |
| 2t.4 | Recharger la page (Ctrl+F5). | Le thème est conservé et s'affiche directement, sans passer par le Classique. |
| 2t.5 | Se déconnecter. | La page de connexion est au même thème. |
| 2t.6 | Thème › Automatique, puis passer le système (Windows, macOS, téléphone) de clair à sombre. | Papier en clair, Ardoise en sombre, bascule sans recharger. |
| 2t.7 | « ⇄ Interface classique ». | L'interface d'origine de qBittorrent garde son apparence habituelle. |
| 2t.8 | Clavier : Tab jusqu'à l'onglet Thème, Entrée, ↓, Entrée ; puis Échap sur le menu ouvert. | Le thème choisi s'applique ; Échap ferme le menu. |
| 2t.9 | Sur téléphone : « Menu ▾ » › un thème. | Thème appliqué, pas de défilement horizontal, menu entièrement visible. |
| 2t.10 | Par myQNAPcloud Link : choisir un thème. | Mêmes résultats (chaque adresse garde son propre choix). |

## 2 quater. Présentation propre à certains thèmes (QTS)

| # | Action | Résultat attendu |
|---|---|---|
| 2q.1 | Thème Signal. | Torrents en cartes : nom, barre, état en pastille, taille, ↓, ↑, temps restant ; liseré coloré à gauche selon l'état. |
| 2q.2 | Signal : cliquer sur « Taille » dans la rangée d'en-têtes, cocher deux cartes, clic droit sur une carte. | Tri, sélection et menu Édition fonctionnent comme dans le tableau. |
| 2q.3 | Signal sur téléphone. | Une carte par ligne, pas de défilement horizontal. |
| 2q.4 | Masquer la colonne Taille (en Ardoise), passer en Signal puis revenir. | La carte montre la taille ; de retour au tableau, la colonne reste masquée. |
| 2q.5 | Thème Papier. | États en pastilles, barre fine arrondie avec le pourcentage à droite, boutons en pilule. |
| 2q.6 | Thème Futur, avec un téléchargement actif. | Barres segmentées ; deux jauges circulaires près des vitesses en haut, qui bougent avec la vitesse ; fenêtres et menus aux coins coupés. |
| 2q.7 | Thème Terminal. | États [DL] [UP] [OK] [--] [!!], barres [#####.....], pointillés, [x] / (*) et raccourcis [D] [A]… dans les menus. |
| 2q.8 | Terminal : ouvrir Affichage, appuyer sur la lettre affichée devant « Journal… ». | Le journal s'ouvre. |
| 2q.9 | Thème Minimal. | Barre de progression de 2 px, menus sans ombre. |

## 2 quinquies. Thème Aurore (QTS)

À faire dans Chrome (ou Edge, Opera) **et** dans Firefox sur ordinateur, puis sur téléphone. Sauf mention contraire, le résultat attendu est le même dans les deux navigateurs.

Ordinateur — Chrome et Firefox

| # | Action | Résultat attendu |
|---|---|---|
| 2qq.1 | Menu Thème › Aurore. | Thème sombre appliqué aussitôt : fond aux lueurs colorées qui dérivent très lentement, grain à peine visible, barre du haut et barre latérale en verre dépoli (le fond se devine, flou, à travers), panneaux aux coins arrondis séparés par un espace. Une entrée « Arrière-plan animé », cochée, apparaît en bas du menu Thème. |
| 2qq.2 | Promener le pointeur près des bords de la barre du haut, de la barre latérale et de la zone principale. | Un halo suit le pointeur le long de la bordure du panneau ; rien ne saute ni ne clignote dans la liste. |
| 2qq.3 | Cliquer sur plusieurs filtres de la barre latérale, ouvrir un dossier, revenir à « Tous ». | Changement de vue en fondu (l'ancienne vue s'efface, la nouvelle monte légèrement) ; les premières lignes de la liste arrivent l'une après l'autre. Pendant le fondu, un second clic est pris en compte. |
| 2qq.4 | Avec un téléchargement actif, regarder la liste pendant 10 secondes. | Un reflet traverse sa barre de progression ; sa vitesse (colonne et barre du haut) pulse brièvement quand elle change ; les autres lignes ne bougent pas ; la liste ne rejoue pas son animation d'entrée toutes les 2 secondes. |
| 2qq.5 | Arrêter ou ajouter un torrent, taper un mot dans « Rechercher un torrent ». | Les compteurs de la barre latérale et « N torrents » de la barre d'état défilent jusqu'à leur nouvelle valeur, qui est exacte. |
| 2qq.6 | Survoler les boutons de la barre d'outils et de la barre du haut ; ouvrir un menu, un sous-menu (clic droit sur un torrent › Catégorie), Outils › Réglages ; provoquer un message (Colonnes › Réinitialiser). | Boutons : léger soulèvement et halo. Menus et fenêtres : ouverture avec un petit rebond, en verre dépoli, entièrement visibles, textes lisibles même au-dessus du bouton « Ajouter ». Message : glisse depuis la droite puis repart. |
| 2qq.7 | Thème › Arrière-plan animé (décocher), recharger la page, puis le recocher. | Les rubans lumineux du fond disparaissent (les lueurs et le verre restent) ; le choix est conservé après rechargement ; recoché, ils reviennent. |
| 2qq.8 | Laisser l'onglet en arrière-plan une minute (autre onglet au premier plan), y revenir. | Le processeur de l'onglet retombe à zéro pendant ce temps (gestionnaire de tâches du navigateur) ; au retour, l'animation reprend sans saccade. |
| 2qq.9 | Avec plusieurs centaines de torrents (ou la liste la plus longue disponible) : faire défiler vite, trier, redimensionner une colonne, promener le pointeur. | Aussi fluide qu'en Ardoise ; le rafraîchissement toutes les 2 s ne fige pas la page. Si ce n'est pas le cas, noter le navigateur et la machine, et refaire l'essai avec « Arrière-plan animé » décoché. |
| 2qq.10 | Colonnes : en masquer une, en élargir une ; recharger ; passer en Classique puis revenir en Aurore. | Colonnes, largeurs et thème conservés (mêmes réglages que dans les autres thèmes). |
| 2qq.11 | Se déconnecter. | Page de connexion en Aurore : carte de verre sur le fond aux lueurs, champs et avertissement lisibles. |
| 2qq.12 | Thème › Classique. | Retour exact à l'apparence d'origine : plus de fond animé, de halo ni d'animation ; rien d'Aurore ne subsiste. |
| 2qq.13 | Firefox seulement : refaire 2qq.1, 2qq.3 et 2qq.6. | Verre dépoli et halos présents. Changement de vue : fondu identique à Chrome dans un Firefox récent ; dans un Firefox plus ancien, la nouvelle vue apparaît en fondu sans effacement de l'ancienne — c'est le repli prévu, pas une anomalie. |

Réduire les animations

| # | Action | Résultat attendu |
|---|---|---|
| 2qq.14 | Activer « Réduire les animations » dans le système (Windows : Paramètres › Accessibilité › Effets visuels › Effets d'animation ; macOS : Réglages › Accessibilité › Affichage › Réduire les animations ; Android / iOS : Accessibilité), recharger la page en Aurore. | Plus aucun mouvement : fond immobile, pas de rubans, pas de reflet sur les barres, pas de pulsation, compteurs changés d'un coup, vues et menus affichés immédiatement, messages sans glissement. Couleurs, verre et halo du pointeur inchangés. Dans le menu Thème, « Arrière-plan animé » est grisé. |
| 2qq.15 | Désactiver « Réduire les animations » sans recharger. | Les animations reviennent d'elles-mêmes. |

Clavier

| # | Action | Résultat attendu |
|---|---|---|
| 2qq.16 | Depuis la barre d'adresse, Tab à travers toute la page : menus, vitesses, boutons de la barre du haut, barre d'outils, recherche, en-têtes de colonnes et leurs poignées, cases des lignes. | Chaque élément atteint porte un contour net de la couleur d'accent, visible sur le verre comme sur la liste ; l'ordre est le même qu'en Classique. |
| 2qq.17 | Tab jusqu'à Thème, Entrée, ↓ jusqu'à « Arrière-plan animé », Entrée ; rouvrir, Échap. | L'entrée se coche et se décoche au clavier ; Échap ferme le menu et rend le focus à l'onglet. |
| 2qq.18 | Outils › Réglages au clavier : Tab dans les champs, Échap. | Contour visible sur chaque champ, case et bouton ; Échap ferme la fenêtre. |
| 2qq.19 | Regarder l'interface en niveaux de gris (filtre de couleur du système) ou à travers une capture en noir et blanc. | États toujours écrits en toutes lettres à côté de leur pastille, pourcentage écrit sur chaque barre, thème et option actifs cochés (✓), filtre actif en gras avec un trait à gauche, ligne sélectionnée cochée avec un trait à gauche : rien ne dépend de la seule couleur. |

Téléphone (largeur ≤ 760 px)

| # | Action | Résultat attendu |
|---|---|---|
| 2qq.20 | « Menu ▾ » › Aurore. | Thème appliqué ; colonnes Nom et Progression seulement ; pas de défilement horizontal de la page ; « Arrière-plan animé » décoché par défaut. |
| 2qq.21 | Bouton ☰. | La barre latérale glisse par-dessus la liste, en verre dépoli plus opaque : ses textes restent lisibles au-dessus des barres de progression ; toucher un filtre la referme et change la vue. |
| 2qq.22 | Toucher un torrent, ouvrir Réglages depuis « Menu ▾ », faire défiler la liste. | Panneau de détails, fenêtre et menus entièrement utilisables ; défilement fluide ; aucun halo ne reste accroché après un toucher. |
| 2qq.23 | Par myQNAPcloud Link (adresse en `/qbittorrent/`) : refaire 2qq.1 et 2qq.11. | Mêmes résultats ; aucune requête vers un autre site (onglet Réseau des outils de développement : tout vient de l'adresse du NAS). |

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
| 6.4b | Nouvel abonnement en collant l'adresse de la page de résultats d'une recherche (pas celle du flux). | Abonnement créé ; son adresse se termine par `page=rss` et l'état du flux est « OK ». |
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
