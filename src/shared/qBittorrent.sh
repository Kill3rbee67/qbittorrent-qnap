#!/bin/sh
# SPDX-License-Identifier: GPL-2.0-or-later
# Script de service QTS pour qBittorrent-nox (démarrage, arrêt, configuration).
CONF=/etc/config/qpkg.conf
QPKG_NAME="qBittorrent"
QPKG_ROOT=`/sbin/getcfg $QPKG_NAME Install_Path -f ${CONF}`

BIN="$QPKG_ROOT/qbittorrent-nox"
PROFILE="$QPKG_ROOT/profile"
CONFIG_FILE="$PROFILE/qBittorrent/config/qBittorrent.conf"
LOG="$QPKG_ROOT/qbittorrent.log"
WEBUI_DIR="$QPKG_ROOT/webui"
SSL_DIR="$QPKG_ROOT/ssl"
PIDFILE="/var/run/qBittorrent.pid"
WEBUI_PORT=8085
# Port BitTorrent par défaut. Pas 6881 : c'est celui de Download Station, et si
# le port est déjà pris, qBittorrent ne contacte aucun tracker (DHT : 0 nœud).
TORRENT_PORT=51881

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
Session\MaxActiveDownloads=10
Session\MaxActiveUploads=5
Session\MaxActiveTorrents=15
Session\IgnoreSlowTorrentsForQueueing=true

[Preferences]
General\Locale=fr
WebUI\Port=$WEBUI_PORT
WebUI\Address=*
EOF
}

# Si le port BitTorrent configuré est déjà utilisé par un autre programme
# (typiquement Download Station sur 6881), passe sur un port libre.
# Appelé avant le lancement : qBittorrent ne tourne pas, donc tout processus
# à l'écoute sur ce port est un autre programme.
port_in_use() {
    netstat -tuln 2>/dev/null | awk '{ print $4 }' | grep -qE "[:.]$1\$"
}
fix_port() {
    command -v netstat >/dev/null 2>&1 || return 0
    CUR=`sed -n 's/^Session\\\\Port=\([0-9]*\)$/\1/p' "$CONFIG_FILE" | head -n 1`
    [ -n "$CUR" ] || return 0
    port_in_use "$CUR" || return 0
    NEW=$TORRENT_PORT
    while port_in_use "$NEW" && [ "$NEW" -lt $((TORRENT_PORT + 20)) ]; do NEW=$((NEW + 1)); done
    [ "$NEW" = "$CUR" ] && return 0
    sed -i "s/^Session\\\\Port=$CUR\$/Session\\\\Port=$NEW/" "$CONFIG_FILE"
    echo "`date '+%F %T'` Port BitTorrent $CUR déjà utilisé par un autre programme (Download Station ?) : passage sur le port $NEW" >> "$LOG"
}

# Mot de passe initial de l'interface web : admin / adminadmin (empreinte
# PBKDF2-SHA512 au format qBittorrent). Il est public : l'interface oblige à le
# changer à la première connexion. Un mot de passe déjà défini n'est jamais écrasé.
DEFAULT_PW_HASH='@ByteArray(hErOMdZerJO9Vg6ilg9h1g==:v6WC5LuduPnik8N0Rd/5HOgk0Sh3NhyOdrs+wrhIOvzaWSvbAfXZGp3w3dCHWicInVAPDME3QMtGssVUR9k9ww==)'

# Certificat HTTPS de l'interface web : celui du NAS (QTS > Sécurité > Certificat,
# y compris Let's Encrypt), recopié à chaque démarrage pour suivre ses
# renouvellements ; à défaut, un certificat auto-signé. HTTPS reste désactivé
# tant que l'utilisateur ne l'active pas (Outils > Réglages > Interface).
prepare_ssl() {
    mkdir -p "$SSL_DIR" && chmod 700 "$SSL_DIR"
    if [ -r /etc/stunnel/stunnel.pem ]; then
        awk '/-----BEGIN .*PRIVATE KEY-----/,/-----END .*PRIVATE KEY-----/' /etc/stunnel/stunnel.pem > "$SSL_DIR/key.pem.tmp"
        { awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' /etc/stunnel/stunnel.pem
          [ -r /etc/stunnel/uca.pem ] && awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' /etc/stunnel/uca.pem
        } > "$SSL_DIR/cert.pem.tmp"
        if [ -s "$SSL_DIR/key.pem.tmp" ] && [ -s "$SSL_DIR/cert.pem.tmp" ]; then
            mv "$SSL_DIR/key.pem.tmp" "$SSL_DIR/key.pem"; mv "$SSL_DIR/cert.pem.tmp" "$SSL_DIR/cert.pem"
        fi
        rm -f "$SSL_DIR/key.pem.tmp" "$SSL_DIR/cert.pem.tmp"
    fi
    if [ ! -s "$SSL_DIR/cert.pem" ] && command -v openssl >/dev/null 2>&1; then
        openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=`hostname`" \
            -keyout "$SSL_DIR/key.pem" -out "$SSL_DIR/cert.pem" >/dev/null 2>&1
    fi
    chmod 600 "$SSL_DIR"/*.pem 2>/dev/null
    return 0
}

# Complète la section [WebUI] (format qBittorrent 5.x) :
#  - interface « explorateur de fichiers », activée une première fois (y compris
#    sur une installation existante) ; si l'utilisateur revient ensuite à
#    l'interface classique, ce choix est respecté ;
#  - chemins du certificat HTTPS, s'ils ne sont pas déjà définis ;
#  - mot de passe initial, uniquement si aucun mot de passe n'est défini ;
#  - accès par le proxy de QTS (http(s)://NAS:8080/qbittorrent/, myQNAPcloud
#    Link) : le proxy local (127.0.0.1) est déclaré de confiance pour que
#    qBittorrent voie la vraie adresse du client et l'adresse tapée dans le
#    navigateur (protection CSRF) ; la vérification de l'en-tête Host, qui
#    refuserait le port 8080 du proxy, est désactivée une première fois ;
#  - authentification obligatoire pour les connexions locales (127.0.0.1),
#    forcée à chaque démarrage : à travers le proxy, tout le monde, y compris
#    depuis Internet, arrive de 127.0.0.1.
ensure_webui() {
    [ -d "$WEBUI_DIR" ] || return 0
    SSL_OK=0; [ -s "$SSL_DIR/cert.pem" ] && [ -s "$SSL_DIR/key.pem" ] && SSL_OK=1
    awk -v dir="$WEBUI_DIR" -v pw="$DEFAULT_PW_HASH" -v ssl="$SSL_DIR" -v sslok="$SSL_OK" '
        function add() {
            if (!hasroot) { print "AlternativeUIEnabled=true"; print "RootFolder=" dir; hasroot = 1 }
            if (sslok && !hascert) { print "HTTPS\\CertificatePath=" ssl "/cert.pem"; hascert = 1 }
            if (sslok && !haskey) { print "HTTPS\\KeyPath=" ssl "/key.pem"; haskey = 1 }
            if (!haspw) { print "Password_PBKDF2=\"" pw "\""; haspw = 1 }
            if (!hasrp) { print "ReverseProxySupportEnabled=true"; hasrp = 1 }
            if (!hasrpl) { print "TrustedReverseProxiesList=\"127.0.0.1;::1\""; hasrpl = 1 }
            if (!hashv) { print "HostHeaderValidation=false"; hashv = 1 }
            if (!haslh) { print "LocalHostAuth=true"; haslh = 1 }
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
        insec && /^HTTPS\\CertificatePath=./ { hascert = 1 }
        insec && /^HTTPS\\KeyPath=./ { haskey = 1 }
        # Lignes vides laissées par qBittorrent : supprimées puis réécrites
        insec && /^HTTPS\\(CertificatePath|KeyPath)=$/ { next }
        insec && /^Password_PBKDF2=/ { haspw = 1 }
        insec && /^ReverseProxySupportEnabled=/ { hasrp = 1 }
        insec && /^TrustedReverseProxiesList=/ { hasrpl = 1 }
        insec && /^HostHeaderValidation=/ { hashv = 1 }
        # Ancien format ([Preferences] WebUI\LocalHostAuth) compris
        /^(WebUI\\)?LocalHostAuth=/ { sub(/=.*/, "=true"); if (insec) haslh = 1 }
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
    prepare_ssl
    ensure_webui
    fix_port
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
