# Sécurité / Security

*English below.*

## Versions suivies

Seule la **dernière version publiée** reçoit des correctifs. Mettez à jour avant de signaler un problème : [dernière release](https://github.com/Kill3rbee67/qbittorrent-qnap/releases/latest).

## Signaler une faille

N'ouvrez pas de ticket public. Utilisez le signalement privé de GitHub : onglet **Security** du dépôt › **Report a vulnerability**. Indiquez la version du paquet, le modèle du NAS, la version de QTS et les étapes pour reproduire. Ne joignez jamais votre mot de passe ni le contenu du dossier `profile/`.

Ce projet est maintenu bénévolement : aucune garantie de délai, mais les signalements sont lus.

## Ce qui relève de ce projet

- le script de service (`src/shared/qBittorrent.sh`), le script de notifications et le paquetage ;
- l'interface explorateur et la page de connexion (`src/shared/webui/`) ;
- la chaîne de construction et de publication (`build.sh`, workflows).

Une faille dans qBittorrent lui-même, dans libtorrent ou dans l'interface web d'origine se signale au [projet qBittorrent](https://github.com/qbittorrent/qBittorrent/security). Prévenez-nous aussi si le paquet doit embarquer une version corrigée.

## Choix connus et documentés

Ces points sont décrits dans le README et ne sont pas des failles à signaler :

- le mot de passe initial `admin` / `adminadmin` est public, et son changement est imposé à la première connexion ;
- le service tourne en root, comme la plupart des paquets QPKG ;
- le paquet n'est pas signé par QNAP.

---

## Supported versions

Only the **latest published release** receives fixes.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private reporting: the repository's **Security** tab › **Report a vulnerability**. Include the package version, NAS model, QTS version and steps to reproduce. Never attach your password or the contents of the `profile/` folder.

Vulnerabilities in qBittorrent itself, libtorrent or the original Web UI belong to the [qBittorrent project](https://github.com/qbittorrent/qBittorrent/security). The public initial password, the service running as root and the unsigned package are known, documented choices.
