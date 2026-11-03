#!/bin/sh
# Script de service QTS pour qBittorrent-nox
CONF=/etc/config/qpkg.conf
QPKG_NAME="qBittorrent"
QPKG_ROOT=`/sbin/getcfg $QPKG_NAME Install_Path -f ${CONF}`

BIN="$QPKG_ROOT/qbittorrent-nox"
PROFILE="$QPKG_ROOT/profile"
CONFIG_FILE="$PROFILE/qBittorrent/config/qBittorrent.conf"
LOG="$QPKG_ROOT/qbittorrent.log"
WEBUI_DIR="$QPKG_ROOT/webui"
PIDFILE="/var/run/qBittorrent.pid"
WEBUI_PORT=8085
TORRENT_PORT=6881

is_running() {
    [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

# Dossier de téléchargement : le dossier partagé "Download" de QTS
# (nom variable selon la version de QTS), sinon un dossier dans le paquet.
download_dir() {
    SHARE=`/sbin/getcfg SHARE_DEF defDownload -d Qdownload -f /etc/config/def_share.info`
    DIR=`/sbin/getcfg "$SHARE" path -f /etc/config/smb.conf`
    if [ -z "$DIR" ] || [ ! -d "$DIR" ]; then
        DIR="$QPKG_ROOT/downloads"
    fi
    echo "$DIR"
}

# Configuration initiale (créée une seule fois, vos réglages sont ensuite conservés)
seed_config() {
    [ -f "$CONFIG_FILE" ] && return 0
    DL_DIR=`download_dir`
    mkdir -p "$DL_DIR" "$(dirname "$CONFIG_FILE")"
    cat > "$CONFIG_FILE" <<EOF
[LegalNotice]
Accepted=true

[BitTorrent]
Session\DefaultSavePath=$DL_DIR
Session\Port=$TORRENT_PORT

[Preferences]
General\Locale=fr
WebUI\Port=$WEBUI_PORT
WebUI\Address=*
EOF
}

# Mot de passe initial de l'interface web : admin / adminadmin
# (empreinte PBKDF2-SHA512 au format qBittorrent). L'interface oblige à le
# changer à la première connexion. Un mot de passe déjà défini n'est jamais écrasé.
DEFAULT_PW_HASH='@ByteArray(hErOMdZerJO9Vg6ilg9h1g==:v6WC5LuduPnik8N0Rd/5HOgk0Sh3NhyOdrs+wrhIOvzaWSvbAfXZGp3w3dCHWicInVAPDME3QMtGssVUR9k9ww==)'

# Complète la section [WebUI] (format qBittorrent 5.x) :
#  - interface « explorateur de fichiers », activée une première fois (y compris
#    sur une installation existante) ; si l'utilisateur revient ensuite à
#    l'interface classique, ce choix est respecté ;
#  - mot de passe initial, uniquement si aucun mot de passe n'est défini.
ensure_webui() {
    [ -d "$WEBUI_DIR" ] || return 0
    awk -v dir="$WEBUI_DIR" -v pw="$DEFAULT_PW_HASH" '
        function add() {
            if (!hasroot) { print "AlternativeUIEnabled=true"; print "RootFolder=" dir; hasroot = 1 }
            if (!haspw) { print "Password_PBKDF2=\"" pw "\""; haspw = 1 }
        }
        /^\[/ {
            if (insec) add()
            insec = ($0 == "[WebUI]"); if (insec) seen = 1
        }
        insec && /^RootFolder=/ {
            hasroot = 1
            # Met à jour le chemin si le paquet a été déplacé sur un autre volume
            if ($0 ~ /\/qBittorrent\/webui$/) $0 = "RootFolder=" dir
        }
        insec && /^Password_PBKDF2=/ { haspw = 1 }
        { print }
        END {
            if (insec) add()
            else if (!seen) { print ""; print "[WebUI]"; add() }
        }' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" \
        && cat "$CONFIG_FILE.tmp" > "$CONFIG_FILE"
    rm -f "$CONFIG_FILE.tmp"
}

case "$1" in
  start)
    ENABLED=$(/sbin/getcfg $QPKG_NAME Enable -u -d FALSE -f $CONF)
    if [ "$ENABLED" != "TRUE" ]; then
        echo "$QPKG_NAME is disabled."
        exit 1
    fi
    if is_running; then
        echo "$QPKG_NAME is already running."
        exit 0
    fi
    if [ ! -x "$BIN" ]; then
        echo "$BIN introuvable"
        exit 1
    fi

    seed_config
    ensure_webui
    # Évite un journal qui grossit indéfiniment
    if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 1048576 ]; then
        : > "$LOG"
    fi

    # nohup n'existe pas sur QTS : on ignore SIGHUP et on détache l'entrée standard
    ( trap '' HUP; exec "$BIN" --profile="$PROFILE" --webui-port=$WEBUI_PORT \
        --confirm-legal-notice < /dev/null >> "$LOG" 2>&1 ) &
    echo $! > "$PIDFILE"
    sleep 2
    if ! is_running; then
        echo "$QPKG_NAME n'a pas démarré, voir $LOG"
        rm -f "$PIDFILE"
        exit 1
    fi
    ;;

  stop)
    if is_running; then
        PID=$(cat "$PIDFILE")
        kill -TERM "$PID"
        # Laisse à qBittorrent le temps d'enregistrer l'état des torrents
        i=0
        while kill -0 "$PID" 2>/dev/null && [ $i -lt 30 ]; do
            sleep 1
            i=$((i + 1))
        done
        kill -0 "$PID" 2>/dev/null && kill -KILL "$PID"
    fi
    rm -f "$PIDFILE"
    ;;

  restart)
    $0 stop
    $0 start
    ;;

  remove)
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|remove}"
    exit 1
esac

exit 0
