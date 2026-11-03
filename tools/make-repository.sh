#!/usr/bin/env bash
# Génère repository.xml : la source d'applications à ajouter dans l'App Center de QTS
# (App Center › Paramètres › Sources d'applications). Le paquet s'installe alors
# en un clic et l'App Center signale les nouvelles versions.
#
#   tools/make-repository.sh [propriétaire/dépôt]
#
# Le paquet référencé est celui de la release v<QPKG_VER> du dépôt GitHub.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${1:-${GITHUB_REPOSITORY:-Kill3rbee67/qbittorrent-qnap}}"
cfg() { sed -n "s/^$1=\"\(.*\)\"/\1/p" "$ROOT/src/qpkg.cfg"; }
VERSION="$(cfg QPKG_VER)"
FW_MIN="$(cfg QTS_MINI_VERSION)"
[ -n "$VERSION" ] || { echo "QPKG_VER introuvable" >&2; exit 1; }

RAW="https://raw.githubusercontent.com/$REPO/main"
QPKG_URL="https://github.com/$REPO/releases/download/v$VERSION/qBittorrent_${VERSION}_x86_64.qpkg"

# Identifiants de plateformes QNAP correspondant aux modèles x86_64
# (même liste que le dépôt communautaire Emby, éprouvé en pratique)
PLATFORMS="TS-NASX86 TS-X73 TVS-873 TVS-873e"

{
cat <<EOF
<?xml version='1.0' encoding='UTF-8'?>
<plugins>
  <cachechk>$(date -u +%Y%m%d%H%M%S)</cachechk>
  <item>
    <name>qBittorrent</name>
    <internalName>qBittorrent</internalName>
    <category>Essentials</category>
    <type>Download</type>
    <icon100>$RAW/assets/icon-100.png</icon100>
    <icon80>$RAW/assets/icon-80.png</icon80>
    <description>Client BitTorrent qBittorrent avec une interface web en français organisée comme un explorateur de fichiers : naviguez dans les dossiers du NAS et ajoutez vos .torrent ou liens magnet directement dans le dossier de votre choix. Interface : http://IP-DU-NAS:8085 (admin / adminadmin à la première connexion, mot de passe à changer ensuite).</description>
    <developer>qbittorrent-qnap (projet communautaire)</developer>
    <developerLink>https://github.com/$REPO</developerLink>
    <fwVersion>$FW_MIN</fwVersion>
    <version>$VERSION</version>
EOF
for p in $PLATFORMS; do
cat <<EOF
    <platform>
      <platformID>$p</platformID>
      <location>$QPKG_URL</location>
    </platform>
EOF
done
cat <<EOF
    <snapshot>$RAW/docs/captures/explorateur.png</snapshot>
    <tutorialLink>https://github.com/$REPO#readme</tutorialLink>
    <forumLink>https://github.com/$REPO/issues</forumLink>
  </item>
</plugins>
EOF
} > "$ROOT/repository.xml"

echo "repository.xml généré pour qBittorrent $VERSION ($QPKG_URL)"
