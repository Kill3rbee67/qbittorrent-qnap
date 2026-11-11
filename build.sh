#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Construit les paquets QPKG qBittorrent pour QNAP.
#
#   ./build.sh            -> build/qBittorrent_<version>_x86_64.qpkg  (Intel / AMD)
#                            build/qBittorrent_<version>_arm_64.qpkg  (ARM 64 bits, expérimental)
#                            build/PROVENANCE.txt (versions et empreintes de tout ce qui est embarqué)
#   ./build.sh --check    -> télécharge et vérifie seulement les binaires amont (empreintes SHA-256)
#
# Dépendances : bash, git, curl, rsync, gcc, tar, gzip, sha256sum, md5sum.
# Le binaire qBittorrent-nox et l'outil QDK de QNAP sont téléchargés dans .cache/
# (le binaire est vérifié par son empreinte SHA-256).
set -euo pipefail

# --- Versions épinglées ------------------------------------------------------
# Binaire statique : https://github.com/userdocs/qbittorrent-nox-static
QBT_RELEASE="release-5.3.0_v2.1.2"
QBT_SHA256_X86_64="563e695a2b830e62e627e1ae403bcfcc494e444d5cabb5ecc1e09907353d8ed5"
QBT_SHA256_ARM_64="ac1e57089795270489491320c5fff0ceaed8e8910cf3abb6be597879408eb033"
# Architectures QDK construites, et nom du binaire correspondant chez userdocs
ARCHS="x86_64:x86_64 arm_64:aarch64"
# Interface web d'origine de qBittorrent (même version que le binaire), servie
# à côté de l'interface explorateur sous classic.html
QBT_WEBUI_TAG="release-5.3.0"
# QPKG Development Kit : https://github.com/qnap-dev/QDK
QDK_TAG="v2.5.3"
# -----------------------------------------------------------------------------

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/src"
CACHE="$ROOT/.cache"
OUT="$ROOT/build"

die() { echo "Erreur : $*" >&2; exit 1; }
step() { echo "==> $*"; }

for cmd in git curl rsync gcc tar gzip sha256sum md5sum; do
    command -v "$cmd" >/dev/null 2>&1 || die "commande « $cmd » introuvable (sous Debian/Ubuntu : sudo apt install $cmd)"
done

VERSION="$(sed -n 's/^QPKG_VER="\(.*\)"/\1/p' "$SRC/qpkg.cfg")"
[ -n "$VERSION" ] || die "QPKG_VER introuvable dans src/qpkg.cfg"
step "Construction de qBittorrent $VERSION (binaire $QBT_RELEASE)"

mkdir -p "$CACHE/bin" "$OUT"

# Binaires qBittorrent-nox (un par architecture), vérifiés par leur empreinte SHA-256
fetch_binaries() {
    for a in $ARCHS; do
        arch="${a%%:*}"; name="${a##*:}"
        BIN="$CACHE/qbittorrent-nox-$QBT_RELEASE-$arch"
        if [ ! -f "$BIN" ]; then
            step "Téléchargement de qbittorrent-nox ($QBT_RELEASE, $arch)"
            curl -fsSL --retry 3 -o "$BIN.part" \
                "https://github.com/userdocs/qbittorrent-nox-static/releases/download/$QBT_RELEASE/$name-qbittorrent-nox"
            mv "$BIN.part" "$BIN"
        fi
        var="QBT_SHA256_$(echo "$arch" | tr 'a-z' 'A-Z')"
        echo "${!var}  $BIN" | sha256sum -c --quiet - \
            || { rm -f "$BIN"; die "empreinte SHA-256 du binaire $arch incorrecte (fichier supprimé, relancez le build)"; }
    done
}

# Mode vérification seule (CI) : empreintes des binaires amont, sans construire
if [ "${1:-}" = "--check" ]; then
    fetch_binaries
    for a in $ARCHS; do
        arch="${a%%:*}"
        echo "OK  $arch  $(sha256sum "$CACHE/qbittorrent-nox-$QBT_RELEASE-$arch" | cut -d' ' -f1)  ($QBT_RELEASE)"
    done
    exit 0
fi
fetch_binaries

# 1. QDK
if [ ! -x "$CACHE/QDK/shared/bin/qbuild" ]; then
    step "Récupération de QDK $QDK_TAG"
    rm -rf "$CACHE/QDK"
    git clone -q --depth 1 --branch "$QDK_TAG" https://github.com/qnap-dev/QDK "$CACHE/QDK"
fi
if [ ! -x "$CACHE/bin/qpkg_encrypt" ]; then
    step "Compilation de qpkg_encrypt"
    gcc -O2 -w -o "$CACHE/bin/qpkg_encrypt" "$CACHE/QDK/src/qpkg_encrypt.c"
fi

# 1b. Interface web classique de qBittorrent (seulement le dossier www des sources)
WEBUI_SRC="$CACHE/qbt-webui-$QBT_WEBUI_TAG"
if [ ! -d "$WEBUI_SRC/src/webui/www/public/images" ]; then
    step "Récupération de l'interface classique de qBittorrent ($QBT_WEBUI_TAG)"
    rm -rf "$WEBUI_SRC"
    git clone -q --depth 1 --branch "$QBT_WEBUI_TAG" --filter=blob:none --sparse \
        https://github.com/qbittorrent/qBittorrent "$WEBUI_SRC"
    git -C "$WEBUI_SRC" sparse-checkout set --no-cone \
        /src/webui/www/private/ /src/webui/www/public/images/ /src/webui/www/translations/
fi
LRELEASE="$(command -v lrelease || command -v lrelease-qt6 || ls /usr/lib/qt6/bin/lrelease 2>/dev/null || true)"

# 3. Préparation de l'arborescence du paquet
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
step "Préparation du paquet"
cp -r "$SRC" "$WORK/pkg"
for a in $ARCHS; do
    arch="${a%%:*}"
    mkdir -p "$WORK/pkg/$arch"
    cp "$CACHE/qbittorrent-nox-$QBT_RELEASE-$arch" "$WORK/pkg/$arch/qbittorrent-nox"
    chmod 755 "$WORK/pkg/$arch/qbittorrent-nox"
done
chmod 755 "$WORK/pkg/shared/qBittorrent.sh" "$WORK/pkg/shared/notify.sh"

# Version du paquet : affichée dans « À propos » et ajoutée aux adresses des
# scripts et de la feuille des thèmes (pas de fichiers périmés en cache)
UI="$WORK/pkg/shared/webui"
sed -i "s/__QPKG_VER__/$VERSION/g" "$UI/private/index.html" "$UI/public/index.html"

# Interface classique : copiée à côté de la nôtre (son index.html devient
# classic.html). qnap-classic.js y ajoute le bouton de retour vers l'explorateur
# et l'ouverture directe des Options (classic.html#reglages).
rsync -a --exclude=/index.html "$WEBUI_SRC/src/webui/www/private/" "$UI/private/"
rsync -a "$WEBUI_SRC/src/webui/www/public/images/" "$UI/public/images/"   # icônes d'onglet
sed 's#</body>#<script src="qnap-classic.js"></script>\n</body>#' \
    "$WEBUI_SRC/src/webui/www/private/index.html" > "$UI/private/classic.html"
grep -q 'qnap-classic.js' "$UI/private/classic.html" || die "script non inséré dans classic.html"
if [ -n "$LRELEASE" ]; then
    mkdir -p "$UI/translations"
    for ts in "$WEBUI_SRC"/src/webui/www/translations/webui_*.ts; do
        "$LRELEASE" -silent "$ts" -qm "$UI/translations/$(basename "${ts%.ts}").qm"
    done
else
    echo "Attention : lrelease introuvable (paquet qt6-l10n-tools), l'interface classique sera en anglais." >&2
fi

# 4. qbuild : son qdk.conf déduit l'emplacement de QDK du dossier courant,
#    d'où ce dossier de travail contenant un lien « QDK ».
mkdir -p "$WORK/run"
ln -s "$CACHE/QDK/shared" "$WORK/run/QDK"
step "Assemblage avec qbuild"
# TAR_OPTIONS : fichiers attribués à root dans le paquet, même si le build ne
# tourne pas en root (sinon l'UID de l'utilisateur de build se retrouve sur le NAS).
( cd "$WORK/run" && PATH="$CACHE/bin:$PATH" TAR_OPTIONS="--owner=0 --group=0 --numeric-owner" \
    "$CACHE/QDK/shared/bin/qbuild" --root "$WORK/pkg" )

# 5. Résultat : un paquet par architecture
rm -f "$OUT"/qBittorrent_*.qpkg* "$OUT/PROVENANCE.txt"
for a in $ARCHS; do
    arch="${a%%:*}"
    QPKG="$WORK/pkg/build/qBittorrent_${VERSION}_${arch}.qpkg"
    [ -f "$QPKG" ] || die "qbuild n'a pas produit $QPKG"
    # Garde-fou : sans rsync, qbuild produit un paquet vide sans signaler d'erreur
    SIZE=$(stat -c %s "$QPKG")
    [ "$SIZE" -gt 20000000 ] || die "paquet $arch anormalement petit ($SIZE octets) : le binaire n'a pas été inclus"
    cp "$QPKG" "$OUT/"
    ( cd "$OUT" && sha256sum "$(basename "$QPKG")" > "$(basename "$QPKG").sha256" \
                && md5sum "$(basename "$QPKG")" > "$(basename "$QPKG").md5" )
    step "Terminé : build/$(basename "$QPKG") ($((SIZE / 1048576)) Mo)"
    cat "$OUT/$(basename "$QPKG").sha256"
done

# 6. Provenance : ce qui a servi à construire ces paquets (traçabilité des releases)
{
    echo "qBittorrent pour QNAP $VERSION"
    echo "Source du paquet : $(git -C "$ROOT" rev-parse HEAD 2>/dev/null || echo inconnue)$(git -C "$ROOT" diff --quiet 2>/dev/null || echo ' (modifications locales)')"
    echo "Construit le : $(date -u '+%Y-%m-%d %H:%M UTC')"
    echo
    echo "Binaires qbittorrent-nox : https://github.com/userdocs/qbittorrent-nox-static/releases/tag/$QBT_RELEASE"
    for a in $ARCHS; do
        arch="${a%%:*}"
        echo "  $arch  $(sha256sum "$CACHE/qbittorrent-nox-$QBT_RELEASE-$arch" | cut -d' ' -f1)"
    done
    echo "Interface web d'origine : qBittorrent $QBT_WEBUI_TAG ($(git -C "$WEBUI_SRC" rev-parse HEAD))"
    echo "QDK : $QDK_TAG ($(git -C "$CACHE/QDK" rev-parse HEAD))"
    echo
    echo "Paquets (SHA-256) :"
    ( cd "$OUT" && sha256sum qBittorrent_*.qpkg | sed 's/^/  /' )
} > "$OUT/PROVENANCE.txt"
cat "$OUT/PROVENANCE.txt"
