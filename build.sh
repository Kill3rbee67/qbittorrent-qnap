#!/usr/bin/env bash
# Construit le paquet QPKG qBittorrent pour QNAP (x86_64).
#
#   ./build.sh            -> build/qBittorrent_<version>_x86_64.qpkg
#
# Dépendances : bash, git, curl, rsync, gcc, tar, gzip, sha256sum, md5sum.
# Le binaire qBittorrent-nox et l'outil QDK de QNAP sont téléchargés dans .cache/
# (le binaire est vérifié par son empreinte SHA-256).
set -euo pipefail

# --- Versions épinglées ------------------------------------------------------
# Binaire statique : https://github.com/userdocs/qbittorrent-nox-static
QBT_RELEASE="release-5.3.0_v2.1.2"
QBT_SHA256_X86_64="563e695a2b830e62e627e1ae403bcfcc494e444d5cabb5ecc1e09907353d8ed5"
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

# 2. Binaire qBittorrent-nox
BIN="$CACHE/qbittorrent-nox-$QBT_RELEASE-x86_64"
if [ ! -f "$BIN" ]; then
    step "Téléchargement de qbittorrent-nox ($QBT_RELEASE, x86_64)"
    curl -fsSL --retry 3 -o "$BIN.part" \
        "https://github.com/userdocs/qbittorrent-nox-static/releases/download/$QBT_RELEASE/x86_64-qbittorrent-nox"
    mv "$BIN.part" "$BIN"
fi
echo "$QBT_SHA256_X86_64  $BIN" | sha256sum -c --quiet - \
    || { rm -f "$BIN"; die "empreinte SHA-256 du binaire incorrecte (fichier supprimé, relancez le build)"; }

# 3. Préparation de l'arborescence du paquet
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
step "Préparation du paquet"
cp -r "$SRC" "$WORK/pkg"
mkdir -p "$WORK/pkg/x86_64"
cp "$BIN" "$WORK/pkg/x86_64/qbittorrent-nox"
chmod 755 "$WORK/pkg/x86_64/qbittorrent-nox" "$WORK/pkg/shared/qBittorrent.sh"

# 4. qbuild : son qdk.conf déduit l'emplacement de QDK du dossier courant,
#    d'où ce dossier de travail contenant un lien « QDK ».
mkdir -p "$WORK/run"
ln -s "$CACHE/QDK/shared" "$WORK/run/QDK"
step "Assemblage avec qbuild"
# TAR_OPTIONS : fichiers attribués à root dans le paquet, même si le build ne
# tourne pas en root (sinon l'UID de l'utilisateur de build se retrouve sur le NAS).
( cd "$WORK/run" && PATH="$CACHE/bin:$PATH" TAR_OPTIONS="--owner=0 --group=0 --numeric-owner" \
    "$CACHE/QDK/shared/bin/qbuild" --root "$WORK/pkg" )

QPKG="$WORK/pkg/build/qBittorrent_${VERSION}_x86_64.qpkg"
[ -f "$QPKG" ] || die "qbuild n'a pas produit $QPKG"
# Garde-fou : sans rsync, qbuild produit un paquet vide sans signaler d'erreur
SIZE=$(stat -c %s "$QPKG")
[ "$SIZE" -gt 20000000 ] || die "paquet anormalement petit ($SIZE octets) : le binaire n'a pas été inclus"

# 5. Résultat
rm -f "$OUT"/qBittorrent_*_x86_64.qpkg*
cp "$QPKG" "$OUT/"
( cd "$OUT" && sha256sum "$(basename "$QPKG")" > "$(basename "$QPKG").sha256" \
            && md5sum "$(basename "$QPKG")" > "$(basename "$QPKG").md5" )
step "Terminé : build/$(basename "$QPKG") ($((SIZE / 1048576)) Mo)"
cat "$OUT/$(basename "$QPKG").sha256"
