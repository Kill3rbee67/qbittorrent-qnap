#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-or-later
# Notification web (webhook) appelée par qBittorrent (« programme externe ») :
#
#   notify.sh <url> <added|finished> "<nom>" "<dossier>" <taille en octets>
#
# Envoie un JSON compris par Discord (« content »), Slack, Mattermost, Rocket.Chat
# (« text ») ou tout service générique ; pour ntfy, un simple message texte.
# Réglage depuis l'interface : Outils > Réglages > Notifications.
URL="$1"; EVENT="$2"; NAME="$3"; DIR="$4"; SIZE="$5"
LOGF="$(dirname "$0")/notify.log"

case "$URL" in http://*|https://*) ;; *) exit 0 ;; esac

# Échappement JSON (antislash, guillemets, caractères de contrôle)
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' | tr '\n\r\t' '   ' | tr -d '\000-\037'; }
HUMAN=`echo "$SIZE" | awk '{ s=$1+0; split("o Ko Mo Go To", u, " "); i=1; while (s>=1024 && i<5) { s/=1024; i++ } printf (i==1 ? "%d %s" : "%.1f %s"), s, u[i] }' | tr . ,`

case "$EVENT" in
    added)    TITLE="Nouveau téléchargement" ;;
    finished) TITLE="Téléchargement terminé" ;;
    *)        TITLE="qBittorrent" ;;
esac
MSG="$TITLE : $NAME ($HUMAN) → $DIR"

case "$URL" in
    *ntfy*)
        CT="text/plain; charset=utf-8"; BODY="$MSG" ;;
    *)
        CT="application/json"
        BODY="{\"content\":\"`esc "$MSG"`\",\"text\":\"`esc "$MSG"`\",\"event\":\"`esc "$EVENT"`\",\"name\":\"`esc "$NAME"`\",\"path\":\"`esc "$DIR"`\",\"size\":${SIZE:-0}}" ;;
esac

if command -v curl >/dev/null 2>&1; then
    CODE=`curl -sS -m 20 -o /dev/null -w '%{http_code}' -H "Content-Type: $CT" -H "Title: $TITLE" --data-binary "$BODY" "$URL" 2>&1`
elif command -v wget >/dev/null 2>&1; then
    wget -q -T 20 -O /dev/null --header="Content-Type: $CT" --post-data="$BODY" "$URL" && CODE=OK || CODE=erreur
else
    CODE="ni curl ni wget"
fi

# Petit journal (tronqué au-delà de 100 Ko)
[ -f "$LOGF" ] && [ "$(wc -c < "$LOGF")" -gt 102400 ] && : > "$LOGF"
echo "`date '+%F %T'` $EVENT « $NAME » -> $CODE" >> "$LOGF"
exit 0
