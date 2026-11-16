# Audit de présentation du dépôt

Réalisé le 16 novembre 2026 sur le commit `bf97a04` (version 5.3.8.1). Ce fichier accompagne la pull request « documentation et présentation » ; il peut être supprimé après lecture.

## Ce que fait le projet, et pour qui

Un paquet QPKG qui installe qBittorrent 5.3 sur un NAS QNAP depuis l'App Center, avec une interface web propre au projet, organisée comme un explorateur de fichiers. Il s'adresse aux propriétaires de NAS QNAP qui veulent remplacer Download Station sans passer par Docker ni par SSH.

## Ce qui a été vérifié en suivant la documentation

| Étape documentée | Résultat |
|---|---|
| `sudo apt install git curl rsync gcc qt6-l10n-tools` | fonctionne (Ubuntu 24.04) |
| `./build.sh --check` | empreintes x86_64 et arm_64 conformes |
| `python3 tests/interface-check.py` | 0 problème, 8 thèmes contrôlés |
| `./build.sh` | deux paquets de 35 Mo et `PROVENANCE.txt` |
| `tests/upgrade-test.sh` avec `GITHUB_REPOSITORY` | mise à jour depuis la release 5.3.8.1 réussie, tout est conservé |
| Première connexion `admin` / `adminadmin` | la fenêtre de choix du mot de passe s'affiche |
| Remise à zéro du mot de passe (`sed` sur `Password_PBKDF2`) | fonctionne sur une installation simulée |
| Désactivation de HTTPS (`sed` sur `HTTPS\Enabled`) | la substitution fonctionne |

Aucun blocage en suivant la documentation. Non vérifiable sans NAS : l'installation par l'App Center, la source d'applications, `/etc/init.d/qBittorrent.sh`, `getcfg`, l'accès par myQNAPcloud Link.

## Points forts

- Documentation utilisateur déjà très complète, honnête sur les limites (ARM non testé, service en root, mot de passe initial public).
- Chaîne de publication sérieuse : binaires épinglés par empreinte, test de mise à jour avant chaque release, `PROVENANCE.txt`, suivi hebdomadaire des versions amont.
- Vrai élément différenciant : choisir la destination en naviguant dans les dossiers du NAS. Les autres paquets QPKG observés (sherpa, syncthing-qpkg, tailscale-qpkg) se contentent d'empaqueter un logiciel existant.
- Rythme soutenu : 13 jours d'existence, plus de 20 versions publiées, CI verte.

## Ce qui manquait, par priorité

1. **Captures périmées.** Les trois captures dataient d'avant la barre de menus, les catégories, les étiquettes et les thèmes. L'une affichait un torrent nommé d'après un film sous droits (`Dune.Part.Two.2024.mkv`), ce qui expose inutilement un dépôt public. Aucune image des thèmes, alors que c'est l'atout visuel du projet.
2. **Topics mal orthographiés.** `donwload-station` et `qbittorent` ne correspondent à aucune recherche : le dépôt est introuvable par les deux mots-clés les plus importants. Seuls `qnap` et `qpkg` fonctionnent.
3. **Lecteur anglophone mal servi.** Un seul paragraphe dense en anglais en tête d'un README français. La description « About » est en français uniquement.
4. **README trop long pour une page d'accueil** (29 Ko) : l'installation n'arrive qu'après deux écrans de fonctionnalités.
5. **Pas de badges** (build, version, licence) ni d'image d'aperçu social.
6. **Fichiers communautaires absents** : politique de sécurité, code de conduite, modèle de pull request, modèle de suggestion. GitHub affiche un score de 57 %.
7. **Interface en français uniquement.** Ce n'est pas un défaut de documentation, mais c'est le premier frein à une audience internationale ; le README anglais le dit désormais d'emblée.

## Constats hors périmètre (code non modifié)

- À 1280 px de large, la colonne « Nom » de la liste tronque presque tous les noms, alors que la colonne « Étiquettes », vide, occupe de la place.
- Le pourcentage affiché dans la barre de progression chevauche le bord de la partie remplie et devient peu lisible autour de 40 à 65 % (thème Classique).
- `src/qpkg.cfg` renvoie en commentaire à `README.md`, désormais en anglais ; le lien `tutorialLink` de `repository.xml` (`#readme`) ouvre lui aussi la version anglaise.
- La barre d'état affiche « DHT : 1 nœuds » (accord au singulier).
- L'API `community/profile` de GitHub ne détecte pas les modèles de ticket au format YAML ; ils fonctionnent bien.

## Comparaison avec des dépôts du même domaine

Consultés par recherche web (l'API GitHub de cette session ne donnait accès qu'à ce dépôt) :

| Dépôt | Présentation | Topics |
|---|---|---|
| OneCDOnly/sherpa (environ 130 étoiles) | README court, badge de version, wiki détaillé | `qnap`, `qpkg`, `qts`, `quts`, `nas`, `bittorrent`, `linux`, `bash`… |
| breml/syncthing-qpkg | README orienté construction | `qnap`, `qpkg`, `syncthing` |
| tailscale/tailscale-qpkg | README minimal, renvoi vers la documentation officielle | non relevés |

Les topics proposés dans le rapport reprennent ce vocabulaire (`qnap`, `qpkg`, `qts`, `nas`, `bittorrent`) et y ajoutent ceux du cas d'usage.

## Métadonnées proposées (non appliquées)

```sh
gh repo edit Kill3rbee67/qbittorrent-qnap \
  --description "qBittorrent as a native QPKG for QNAP NAS, with a file-browser web UI. A Download Station alternative: no Docker, no command line." \
  --remove-topic donwload-station --remove-topic qbittorent \
  --add-topic qbittorrent --add-topic download-station --add-topic bittorrent \
  --add-topic torrent --add-topic torrent-client --add-topic nas --add-topic qnap-nas \
  --add-topic qts --add-topic webui --add-topic rss --add-topic self-hosted --add-topic homelab
```

Les topics `qnap` et `qpkg` sont conservés, soit 14 au total. Pas d'URL de site à renseigner : le README sert de documentation.
