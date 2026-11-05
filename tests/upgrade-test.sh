#!/usr/bin/env bash
# SPDX-License-Identifier: GPL-2.0-or-later
# Test de mise à jour : installe la version précédente, y crée des données
# (mot de passe, torrent, abonnement RSS, réglage), installe la nouvelle version
# par-dessus comme le fait l'App Center, puis vérifie que tout est conservé.
#
#   tests/upgrade-test.sh <nouveau paquet x86_64> [ancien paquet]
#
# Sans ancien paquet, celui de la dernière release GitHub est téléchargé
# (GITHUB_REPOSITORY, et GITHUB_TOKEN si disponible). S'il n'y a pas encore de
# release, seule une installation neuve est testée.
# Simule QTS dans un dossier temporaire ; nécessite curl, python3, et le port 8085 libre.
set -euo pipefail

NEW="${1:?usage : $0 <nouveau.qpkg> [ancien.qpkg]}"
OLD="${2:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
T="$(mktemp -d)"
API="http://127.0.0.1:8085/api/v2"
fail() { echo "ÉCHEC : $*" >&2; "$T/svc.sh" stop >/dev/null 2>&1 || true; tail -n 20 "$T/qpkg/qbittorrent.log" >&2 2>/dev/null || true; exit 1; }
ok() { echo "  ok : $*"; }
trap '"$T/svc.sh" stop >/dev/null 2>&1 || true; rm -rf "$T"' EXIT

# --- Faux QTS : getcfg, dossier partagé, emplacement du paquet ---
mkdir -p "$T/qpkg" "$T/Download" "$T/bin"
cat > "$T/bin/getcfg" <<EOF
#!/bin/sh
case "\$1 \$2" in
  "qBittorrent Install_Path") echo "$T/qpkg" ;;
  "qBittorrent Enable") echo TRUE ;;
  "SHARE_DEF defDownload") echo Download ;;
  "Download path") echo "$T/Download" ;;
esac
EOF
chmod +x "$T/bin/getcfg"
install_pkg() {
    python3 -I "$HERE/qpkg-extract.py" "$1" "$T/qpkg" >/dev/null || fail "extraction de $1"
    sed -e "s#/sbin/getcfg#$T/bin/getcfg#g" -e "s#/var/run/qBittorrent.pid#$T/qbt.pid#" "$T/qpkg/qBittorrent.sh" > "$T/svc.sh"
    chmod +x "$T/svc.sh"
}
login() { curl -s -c "$T/cj" -o /dev/null -w '%{http_code}' --data-urlencode "username=admin" --data-urlencode "password=$1" "$API/auth/login"; }
wait_up() { for _ in $(seq 1 30); do curl -s -o /dev/null "$API/app/version" && return 0; sleep 1; done; fail "l'interface web ne répond pas"; }

# --- Ancien paquet : dernière release publiée ---
if [ -z "$OLD" ] && [ -n "${GITHUB_REPOSITORY:-}" ]; then
    AUTH=(); [ -n "${GITHUB_TOKEN:-}" ] && AUTH=(-H "Authorization: Bearer $GITHUB_TOKEN")
    URL=$(curl -fsSL "${AUTH[@]}" "https://api.github.com/repos/$GITHUB_REPOSITORY/releases/latest" 2>/dev/null \
        | python3 -I -c "import sys,json; print(next((a['browser_download_url'] for a in json.load(sys.stdin).get('assets',[]) if a['name'].endswith('_x86_64.qpkg')), ''))" || true)
    if [ -n "$URL" ]; then
        echo "Version précédente : ${URL##*/}"
        curl -fsSL -o "$T/old.qpkg" "$URL" && OLD="$T/old.qpkg"
    fi
fi

# 64 Ko de données et le .torrent correspondant, pour vérifier que le torrent est conservé
python3 -I - "$T" <<'EOF'
import sys, os, hashlib
t = sys.argv[1]; d = os.urandom(65536)
def be(x):
    if isinstance(x, int): return b"i%de" % x
    if isinstance(x, bytes): return b"%d:%s" % (len(x), x)
    if isinstance(x, str): return be(x.encode())
    if isinstance(x, dict): return b"d" + b"".join(be(k) + be(x[k]) for k in sorted(x)) + b"e"
info = {"name": "test-mise-a-jour.bin", "length": len(d), "piece length": 16384,
        "pieces": b"".join(hashlib.sha1(d[i:i + 16384]).digest() for i in range(0, len(d), 16384))}
open(f"{t}/test.torrent", "wb").write(be({"announce": "http://127.0.0.1:1/a", "info": info}))
EOF

if [ -n "$OLD" ]; then
    echo "== Installation de la version précédente"
    install_pkg "$OLD"; "$T/svc.sh" start >/dev/null || fail "démarrage de l'ancienne version"; wait_up
    [ "$(login adminadmin)" = 204 ] || fail "connexion initiale (adminadmin) refusée sur l'ancienne version"
    curl -s -b "$T/cj" -o /dev/null --data-urlencode 'json={"web_ui_password":"MiseAJour2026","max_active_downloads":7}' "$API/app/setPreferences"
    curl -s -b "$T/cj" -o /dev/null -F "torrents=@$T/test.torrent" -F "savepath=$T/Download" "$API/torrents/add"
    curl -s -b "$T/cj" -o /dev/null --data-urlencode "url=http://127.0.0.1:9/flux.xml" --data-urlencode "path=Flux test" "$API/rss/addFeed"
    curl -s -b "$T/cj" -o /dev/null --data-urlencode "ruleName=Règle test" \
        --data-urlencode 'ruleDef={"enabled":true,"mustContain":"S01","affectedFeeds":["http://127.0.0.1:9/flux.xml"],"torrentParams":{"save_path":"/tmp"}}' "$API/rss/setRule"
    sleep 2
    "$T/svc.sh" stop >/dev/null
    PASS=MiseAJour2026
    echo "== Mise à jour vers ${NEW##*/}"
else
    echo "== Pas de version précédente : installation neuve de ${NEW##*/}"
    PASS=adminadmin
fi

install_pkg "$NEW"; "$T/svc.sh" start >/dev/null || fail "démarrage de la nouvelle version"; wait_up
[ "$(login "$PASS")" = 204 ] || fail "mot de passe ($PASS) refusé après la mise à jour"
ok "qBittorrent $(curl -s -b "$T/cj" "$API/app/version") démarré, mot de passe conservé"
curl -s "http://127.0.0.1:8085/" | grep -q '<title>qBittorrent – Connexion' || fail "page de connexion de l'interface explorateur absente"
ok "interface explorateur servie"
curl -s -b "$T/cj" "http://127.0.0.1:8085/classic.html" | grep -q 'qnap-classic.js' || fail "interface classique absente"
ok "interface classique servie"
if [ -n "$OLD" ]; then
    [ "$(login adminadmin)" != 204 ] || fail "adminadmin accepté alors qu'un mot de passe personnel avait été défini"
    login "$PASS" >/dev/null
    curl -s -b "$T/cj" "$API/torrents/info" | grep -q 'test-mise-a-jour.bin' || fail "torrent perdu"; ok "torrent conservé"
    curl -s -b "$T/cj" "$API/rss/rules" | grep -q 'Règle test' || fail "abonnement RSS perdu"; ok "abonnement RSS conservé"
    curl -s -b "$T/cj" "$API/app/preferences" | grep -q '"max_active_downloads":7' || fail "réglage perdu"; ok "réglages conservés"
fi
"$T/svc.sh" stop >/dev/null
echo "Test de mise à jour réussi."
