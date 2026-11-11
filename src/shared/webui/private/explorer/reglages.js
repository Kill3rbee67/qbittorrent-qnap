// SPDX-License-Identifier: GPL-2.0-or-later
// Interface explorateur — réglages complémentaires (Outils › Réglages).
//
// Complète la liste SETTINGS du script principal pour couvrir les options de
// qBittorrent 5.3 (clés de app/preferences et app/setPreferences, vérifiées
// sur le binaire installé et dans views/preferences.html de qBittorrent 5.3.0).
//
// Types de champ : bool, int, float, rate (Kio/s), select, path, text, password,
// area (texte sur plusieurs lignes), watch (dossiers surveillés), iface
// (interface réseau), ro (lecture seule). Option « scale » : la valeur affichée
// est multipliée par scale avant l'envoi (ex. Mio -> octets).
//
// Les réglages d'authentification et d'accès que le paquet fixe au démarrage
// (proxy de confiance, authentification locale, en-tête Host, port, interface
// alternative) sont affichés en lecture seule : ils ne se modifient pas ici.
'use strict';

const YESNO = (v) => (v ? 'activé' : 'désactivé');
const SETTINGS_MORE = {
  dl: [
    ['=', 'Ajout des torrents'],
    ['add_to_top_of_queue', 'bool', 'Ajouter en haut de la file d\'attente'],
    ['torrent_stop_condition', 'select', 'Condition d\'arrêt du torrent', { options: [['None', 'Aucune'], ['MetadataReceived', 'Métadonnées reçues'], ['FilesChecked', 'Fichiers vérifiés']] }],
    ['merge_trackers', 'bool', 'Torrent déjà présent : fusionner les trackers avec le torrent existant'],
    ['auto_delete_mode', 'select', 'Supprimer les fichiers .torrent par la suite', { options: [[0, 'Jamais'], [1, 'Après l\'ajout'], [2, 'Après l\'ajout, et aussi quand l\'ajout est annulé']] }],
    ['use_unwanted_folder', 'bool', 'Conserver les fichiers non sélectionnés dans le dossier « .unwanted »'],
    ['excluded_file_names_enabled', 'bool', 'Exclure des noms de fichiers'],
    ['excluded_file_names', 'area', 'Noms exclus (un motif par ligne, ex. *.exe)', { dep: 'excluded_file_names_enabled' }],
    ['=', 'Copie de sauvegarde des .torrent'],
    ['torrent_files_backup_enabled', 'bool', 'Conserver une copie des fichiers .torrent'],
    ['torrent_files_backup_dir', 'text', 'Dossier de la copie', { dep: 'torrent_files_backup_enabled', hint: 'relatif au profil, ou chemin complet' }],
    ['torrent_files_finished_backup_dir_enabled', 'bool', 'Déplacer la copie quand le torrent est terminé', { dep: 'torrent_files_backup_enabled' }],
    ['torrent_files_finished_backup_dir', 'text', 'Dossier des copies terminées', { dep: 'torrent_files_finished_backup_dir_enabled' }],
    ['remove_torrent_file_backup', 'bool', 'Supprimer la copie quand le torrent est retiré', { dep: 'torrent_files_backup_enabled' }],
    ['=', 'Gestion de torrent automatique'],
    ['#', 'En mode automatique, l\'emplacement d\'un torrent dépend de sa catégorie (voir Catégories dans la barre latérale).'],
    ['auto_tmm_enabled', 'select', 'Mode de gestion de torrent par défaut', { options: [[false, 'Manuel'], [true, 'Automatique']] }],
    ['torrent_changed_tmm_enabled', 'select', 'Lorsque la catégorie du torrent change', { options: [[true, 'Déplacer le torrent'], [false, 'Basculer le torrent en mode manuel']] }],
    ['save_path_changed_tmm_enabled', 'select', 'Lorsque le dossier par défaut change', { options: [[true, 'Déplacer les torrents affectés'], [false, 'Basculer les torrents affectés en mode manuel']] }],
    ['category_changed_tmm_enabled', 'select', 'Lorsque le dossier de la catégorie change', { options: [[true, 'Déplacer les torrents affectés'], [false, 'Basculer les torrents affectés en mode manuel']] }],
    ['use_category_paths_in_manual_mode', 'bool', 'Utiliser les chemins des catégories en mode manuel'],
    ['=', 'Dossiers surveillés'],
    ['#', 'qBittorrent ajoute automatiquement les fichiers .torrent déposés dans ces dossiers.'],
    ['scan_dirs', 'watch', 'Ajouter automatiquement les torrents présents sous'],
  ],
  queue: [
    ['max_active_checking_torrents', 'int', 'Torrents en vérification simultanément', { min: 1 }],
    ['=', 'Torrents lents'],
    ['slow_torrent_dl_rate_threshold', 'int', 'Seuil de vitesse de téléchargement (Kio/s)', { dep: 'dont_count_slow_torrents', min: 0 }],
    ['slow_torrent_ul_rate_threshold', 'int', 'Seuil de vitesse d\'envoi (Kio/s)', { dep: 'dont_count_slow_torrents', min: 0 }],
    ['slow_torrent_inactive_timer', 'int', 'Temps limite d\'inactivité d\'un torrent (secondes)', { dep: 'dont_count_slow_torrents', min: 1 }],
  ],
  speed: [
    ['=', 'Réglages des limites'],
    ['limit_utp_rate', 'bool', 'Appliquer les limites de vitesse au protocole µTP'],
    ['limit_tcp_overhead', 'bool', 'Appliquer les limites de vitesse au surplus généré par le protocole'],
    ['limit_lan_peers', 'bool', 'Appliquer les limites de vitesse aux pairs locaux'],
  ],
  conn: [
    ['bittorrent_protocol', 'select', 'Protocole de connexion des pairs', { options: [[0, 'TCP et μTP'], [1, 'TCP'], [2, 'μTP']] }],
    ['!randport', 'Choisir un port aléatoire'],
    ['=', 'Serveur proxy'],
    ['proxy_type', 'select', 'Type', { options: [['None', '(Aucun)'], ['SOCKS4', 'SOCKS4'], ['SOCKS5', 'SOCKS5'], ['HTTP', 'HTTP']] }],
    ['proxy_ip', 'text', 'Hôte'],
    ['proxy_port', 'int', 'Port', { min: 1, max: 65535 }],
    ['proxy_hostname_lookup', 'bool', 'Rechercher le nom d\'hôte via le proxy'],
    ['proxy_auth_enabled', 'bool', 'Le proxy demande une authentification'],
    ['proxy_username', 'text', 'Identifiant', { dep: 'proxy_auth_enabled' }],
    ['proxy_password', 'password', 'Mot de passe', { dep: 'proxy_auth_enabled', hint: 'enregistré en clair par qBittorrent ; vide = inchangé' }],
    ['proxy_bittorrent', 'bool', 'Utiliser le proxy pour BitTorrent'],
    ['proxy_peer_connections', 'bool', 'Utiliser le proxy pour se connecter aux pairs', { dep: 'proxy_bittorrent' }],
    ['proxy_rss', 'bool', 'Utiliser le proxy pour les flux RSS'],
    ['proxy_misc', 'bool', 'Utiliser le proxy à des fins générales'],
    ['=', 'I2P (expérimental)'],
    ['i2p_enabled', 'bool', 'Activer I2P'],
    ['i2p_address', 'text', 'Hôte', { dep: 'i2p_enabled' }],
    ['i2p_port', 'int', 'Port', { dep: 'i2p_enabled', min: 1, max: 65535 }],
    ['i2p_mixed_mode', 'bool', 'Mode mixte (pairs I2P et pairs ordinaires, sans anonymat)', { dep: 'i2p_enabled' }],
    ['=', 'Filtrage IP'],
    ['ip_filter_enabled', 'bool', 'Activer le filtrage IP'],
    ['ip_filter_path', 'text', 'Chemin du filtre (.dat, .p2p, .p2b)', { dep: 'ip_filter_enabled', hint: 'chemin complet sur le NAS' }],
    ['ip_filter_trackers', 'bool', 'Appliquer aux trackers', { dep: 'ip_filter_enabled' }],
    ['banned_IPs', 'area', 'Adresses IP bannies manuellement (une par ligne)'],
    ['=', 'Torrents SSL'],
    ['ssl_enabled', 'bool', 'Activer les torrents SSL'],
    ['ssl_listen_port', 'int', 'Port SSL', { dep: 'ssl_enabled', min: 1024, max: 65535 }],
  ],
  bt: [
    ['=', 'Trackers ajoutés automatiquement'],
    ['add_trackers_enabled', 'bool', 'Ajouter automatiquement ces trackers aux nouveaux téléchargements'],
    ['add_trackers', 'area', 'Trackers (un par ligne)', { dep: 'add_trackers_enabled' }],
    ['add_trackers_from_url_enabled', 'bool', 'Ajouter automatiquement les trackers d\'une adresse web'],
    ['add_trackers_url', 'text', 'Adresse de la liste', { dep: 'add_trackers_from_url_enabled' }],
    ['add_trackers_url_list', 'ro', 'Trackers récupérés', { fmt: (p) => (p.add_trackers_url_list || '—').split('\n').filter(Boolean).length + ' tracker(s)' }],
  ],
  seed: [
    ['max_inactive_seeding_time_enabled', 'bool', 'Arrêter le partage après une durée d\'inactivité'],
    ['max_inactive_seeding_time', 'int', 'Durée de partage inactif maximum (minutes)', { dep: 'max_inactive_seeding_time_enabled', min: 0 }],
    ['share_limits_mode', 'select', 'Quand plusieurs limites sont définies', { options: [['MatchAny', 'Dès qu\'une limite est atteinte'], ['MatchAll', 'Quand toutes les limites sont atteintes']] }],
  ],
  rss: [
    ['rss_fetch_delay', 'int', 'Délai entre deux requêtes au même site (secondes)', { min: 0 }],
    ['=', 'Filtre intelligent des épisodes'],
    ['rss_download_repack_proper_episodes', 'bool', 'Télécharger les épisodes REPACK/PROPER'],
    ['rss_smart_episode_filters', 'area', 'Filtres (une expression régulière par ligne)'],
  ],
  notif: [
    ['!testmail', 'Envoyer un courriel test (avec les réglages enregistrés)'],
  ],
  ui: [
    ['=', 'Sessions et sécurité'],
    ['web_ui_session_timeout', 'int', 'Expiration de la session (secondes)', { min: 0 }],
    ['web_ui_max_auth_fail_count', 'int', 'Bannir le client après échecs consécutifs', { min: 0, hint: '0 = jamais' }],
    ['web_ui_ban_duration', 'int', 'Durée du bannissement (secondes)', { min: 1 }],
    ['web_ui_sessions_count_limit', 'int', 'Nombre maximum de sessions', { min: 0, hint: '0 = illimité' }],
    ['=', 'Nom de domaine dynamique'],
    ['dyndns_enabled', 'bool', 'Mettre à jour mon nom de domaine dynamique'],
    ['dyndns_service', 'select', 'Service', { dep: 'dyndns_enabled', options: [[0, 'DynDNS'], [1, 'NO-IP']] }],
    ['dyndns_domain', 'text', 'Nom de domaine', { dep: 'dyndns_enabled' }],
    ['dyndns_username', 'text', 'Identifiant', { dep: 'dyndns_enabled' }],
    ['dyndns_password', 'password', 'Mot de passe', { dep: 'dyndns_enabled', hint: 'vide = inchangé' }],
    ['=', 'Réglés par le paquet QNAP (lecture seule)'],
    ['#', 'Ces réglages permettent l\'accès par QTS et myQNAPcloud Link et protègent l\'authentification : le paquet les fixe à chaque démarrage. Ils restent visibles dans l\'interface classique.'],
    ['web_ui_port', 'ro', 'Port de l\'interface web', { fmt: (p) => String(p.web_ui_port) }],
    ['bypass_local_auth', 'ro', 'Ignorer l\'authentification pour localhost', { fmt: (p) => YESNO(p.bypass_local_auth) }],
    ['bypass_auth_subnet_whitelist_enabled', 'ro', 'Ignorer l\'authentification pour des sous-réseaux', { fmt: (p) => YESNO(p.bypass_auth_subnet_whitelist_enabled) + (p.bypass_auth_subnet_whitelist ? ` (${p.bypass_auth_subnet_whitelist})` : '') }],
    ['web_ui_reverse_proxy_enabled', 'ro', 'Proxy inverse de confiance', { fmt: (p) => YESNO(p.web_ui_reverse_proxy_enabled) + (p.web_ui_reverse_proxies_list ? ` (${p.web_ui_reverse_proxies_list})` : '') }],
    ['web_ui_host_header_validation_enabled', 'ro', 'Vérification de l\'en-tête Host', { fmt: (p) => YESNO(p.web_ui_host_header_validation_enabled) }],
    ['web_ui_csrf_protection_enabled', 'ro', 'Protection CSRF', { fmt: (p) => YESNO(p.web_ui_csrf_protection_enabled) }],
    ['web_ui_clickjacking_protection_enabled', 'ro', 'Protection contre le clickjacking', { fmt: (p) => YESNO(p.web_ui_clickjacking_protection_enabled) }],
    ['web_ui_secure_cookie_enabled', 'ro', 'Cookie « Secure »', { fmt: (p) => YESNO(p.web_ui_secure_cookie_enabled) }],
    ['web_ui_api_key', 'ro', 'Clé d\'API', { fmt: (p) => (p.web_ui_api_key ? 'définie' : 'aucune') }],
  ],
  adv: [
    ['#', 'Réglages de qBittorrent et de libtorrent pour utilisateurs avertis. En cas de doute, laissez les valeurs par défaut. Certains réglages ne s\'appliquent qu\'au prochain démarrage.'],
    ['=', 'qBittorrent'],
    ['resume_data_storage_type', 'select', 'Stockage des données de reprise (redémarrage requis)', { options: [['Legacy', 'Fichiers de reprise rapide'], ['SQLite', 'Base de données SQLite (expérimentale)']] }],
    ['torrent_content_remove_option', 'select', 'Mode de retrait de contenu du torrent', { options: [['Delete', 'Supprimer les fichiers définitivement'], ['MoveToTrash', 'Déplacer dans la corbeille (si possible)']] }],
    ['memory_working_set_limit', 'int', 'Limite d\'utilisation de la mémoire vive (Mio)', { min: 1 }],
    ['current_network_interface', 'iface', 'Interface réseau'],
    ['current_interface_address', 'text', 'Adresse IP à laquelle se relier', { hint: 'vide = toutes' }],
    ['save_resume_data_interval', 'int', 'Intervalle d\'enregistrement des données de reprise (minutes)', { min: 0 }],
    ['save_statistics_interval', 'int', 'Intervalle d\'enregistrement des statistiques (minutes)', { min: 0 }],
    ['torrent_file_size_limit', 'int', 'Taille maximale d\'un fichier .torrent (Mio)', { min: 1, scale: 1048576 }],
    ['recheck_completed_torrents', 'bool', 'Revérifier les torrents à la fin'],
    ['app_instance_name', 'text', 'Nom de l\'instance d\'application'],
    ['refresh_interval', 'int', 'Intervalle d\'actualisation interne (ms)', { min: 30 }],
    ['resolve_peer_countries', 'bool', 'Résoudre les pays des pairs'],
    ['resolve_peer_host_names', 'bool', 'Résoudre les noms d\'hôtes des pairs'],
    ['reannounce_when_address_changed', 'bool', 'Réannoncer à tous les trackers lorsque l\'IP ou le port change'],
    ['enable_embedded_tracker', 'bool', 'Activer le tracker intégré'],
    ['embedded_tracker_port', 'int', 'Port du tracker intégré', { dep: 'enable_embedded_tracker', min: 1, max: 65535 }],
    ['embedded_tracker_port_forwarding', 'bool', 'Activer la redirection de port pour le tracker intégré', { dep: 'enable_embedded_tracker' }],
    ['ignore_ssl_errors', 'bool', 'Ignorer les erreurs SSL'],
    ['start_paused', 'bool', 'Démarrer la session BitTorrent en pause'],
    ['shutdown_timeout', 'int', 'Délai d\'arrêt de la session BitTorrent (secondes, -1 = illimité)', { min: -1 }],
    ['=', 'libtorrent'],
    ['bdecode_depth_limit', 'int', 'Limite de profondeur pour Bdecode', { min: 0 }],
    ['bdecode_token_limit', 'int', 'Limite de jetons pour Bdecode', { min: 0 }],
    ['async_io_threads', 'int', 'Fils d\'E/S asynchrones', { min: 1 }],
    ['hashing_threads', 'int', 'Fils de hachage', { min: 1 }],
    ['file_pool_size', 'int', 'Taille du pool de fichiers', { min: 1 }],
    ['checking_memory_use', 'int', 'Mémoire utilisée pour vérifier les torrents (Mio)', { min: 1 }],
    ['disk_cache', 'int', 'Cache disque (Mio, -1 = automatique)', { min: -1 }],
    ['disk_cache_ttl', 'int', 'Expiration du cache disque (secondes)', { min: 1 }],
    ['disk_queue_size', 'int', 'Taille de la file d\'attente du disque (Kio)', { min: 1, scale: 1024 }],
    ['disk_io_type', 'select', 'Type d\'E/S du disque (redémarrage requis)', { options: [[0, 'Par défaut'], [1, 'Fichiers mappés en mémoire'], [2, 'Conforme POSIX'], [3, 'pread/pwrite simple'], [4, 'pread/pwrite']] }],
    ['disk_io_read_mode', 'select', 'Mode de lecture des E/S du disque', { options: [[0, 'Désactiver le cache du système'], [1, 'Activer le cache du système']] }],
    ['disk_io_write_mode', 'select', 'Mode d\'écriture des E/S du disque', { options: [[0, 'Désactiver le cache du système'], [1, 'Activer le cache du système'], [2, 'Écriture immédiate (write-through)']] }],
    ['enable_coalesce_read_write', 'bool', 'Regrouper les lectures et écritures'],
    ['enable_piece_extent_affinity', 'bool', 'Utiliser l\'affinité par extension de morceau'],
    ['enable_upload_suggestions', 'bool', 'Envoyer des suggestions de morceaux d\'envoi'],
    ['send_buffer_watermark', 'int', 'Seuil du tampon d\'envoi (Kio)', { min: 1 }],
    ['send_buffer_low_watermark', 'int', 'Seuil bas du tampon d\'envoi (Kio)', { min: 1 }],
    ['send_buffer_watermark_factor', 'int', 'Facteur du seuil du tampon d\'envoi (%)', { min: 1 }],
    ['connection_speed', 'int', 'Connexions sortantes par seconde', { min: 0 }],
    ['seeding_outgoing_connections', 'bool', 'Autoriser les connexions sortantes pendant le partage'],
    ['socket_send_buffer_size', 'int', 'Tampon d\'envoi du socket (Kio, 0 = système)', { min: 0, scale: 1024 }],
    ['socket_receive_buffer_size', 'int', 'Tampon de réception du socket (Kio, 0 = système)', { min: 0, scale: 1024 }],
    ['socket_backlog_size', 'int', 'Taille de la file des connexions du socket', { min: 1 }],
    ['outgoing_ports_min', 'int', 'Ports de sortie, minimum (0 = désactivé)', { min: 0, max: 65535 }],
    ['outgoing_ports_max', 'int', 'Ports de sortie, maximum (0 = désactivé)', { min: 0, max: 65535 }],
    ['upnp_lease_duration', 'int', 'Durée de l\'allocation UPnP (secondes, 0 = permanente)', { min: 0 }],
    ['peer_tos', 'int', 'Type de service (ToS) des connexions aux pairs', { min: 0, max: 255 }],
    ['utp_tcp_mixed_mode', 'select', 'Algorithme du mode mixte μTP-TCP', { options: [[0, 'Préférer les connexions TCP'], [1, 'Proportionnel par pair (limite TCP)']] }],
    ['hostname_cache_ttl', 'int', 'Expiration du cache de résolution de noms (secondes)', { min: 0 }],
    ['idn_support_enabled', 'bool', 'Prendre en charge les noms de domaine internationalisés (IDN)'],
    ['enable_multi_connections_from_same_ip', 'bool', 'Permettre plusieurs connexions depuis la même adresse IP'],
    ['validate_https_tracker_certificate', 'bool', 'Valider le certificat des trackers HTTPS'],
    ['ssrf_mitigation', 'bool', 'Atténuation de la falsification de requêtes côté serveur (SSRF)'],
    ['block_peers_on_privileged_ports', 'bool', 'Interdire la connexion aux pairs sur des ports privilégiés'],
    ['upload_slots_behavior', 'select', 'Comportement des emplacements d\'envoi', { options: [[0, 'Emplacements fixes'], [1, 'Basé sur la vitesse d\'envoi']] }],
    ['upload_choking_algorithm', 'select', 'Algorithme d\'étouffement à l\'envoi', { options: [[0, 'Répartition de charge'], [1, 'Envoi le plus rapide'], [2, 'Anti-leech']] }],
    ['announce_to_all_trackers', 'bool', 'Toujours annoncer à tous les trackers d\'un niveau'],
    ['announce_to_all_tiers', 'bool', 'Toujours annoncer à tous les niveaux'],
    ['announce_ip', 'text', 'Adresse IP annoncée aux trackers (redémarrage requis)'],
    ['announce_port', 'int', 'Port annoncé aux trackers (0 = port d\'écoute, redémarrage requis)', { min: 0, max: 65535 }],
    ['max_concurrent_http_announces', 'int', 'Annonces HTTP simultanées maximum', { min: 1 }],
    ['stop_tracker_timeout', 'int', 'Délai d\'attente à l\'arrêt du tracker (secondes, 0 = désactivé)', { min: 0 }],
    ['peer_turnover', 'int', 'Rotation des pairs : pourcentage de déconnexion', { min: 0, max: 100 }],
    ['peer_turnover_cutoff', 'int', 'Rotation des pairs : seuil (%)', { min: 0, max: 100 }],
    ['peer_turnover_interval', 'int', 'Rotation des pairs : intervalle (secondes)', { min: 0 }],
    ['request_queue_size', 'int', 'Requêtes en suspens maximum vers un seul pair', { min: 1 }],
    ['dht_bootstrap_nodes', 'text', 'Nœuds d\'amorçage DHT', { hint: 'séparés par des virgules ; vide = valeurs par défaut' }],
  ],
  log: [
    ['file_log_enabled', 'bool', 'Enregistrer le journal dans un fichier'],
    ['file_log_path', 'text', 'Dossier du journal', { dep: 'file_log_enabled', hint: 'relatif au profil, ou chemin complet' }],
    ['file_log_backup_enabled', 'bool', 'Sauvegarder le fichier journal au-delà d\'une taille', { dep: 'file_log_enabled' }],
    ['file_log_max_size', 'int', 'Taille maximale (Kio)', { dep: 'file_log_backup_enabled', min: 1 }],
    ['file_log_delete_old', 'bool', 'Supprimer les anciennes sauvegardes du journal', { dep: 'file_log_enabled' }],
    ['file_log_age', 'int', 'Antérieures à', { dep: 'file_log_delete_old', min: 1 }],
    ['file_log_age_type', 'select', 'Unité', { dep: 'file_log_delete_old', options: [[0, 'jours'], [1, 'mois'], [2, 'années']] }],
    ['performance_warning', 'bool', 'Journaliser les avertissements de performances'],
  ],
};
// Fusionne SETTINGS_MORE dans SETTINGS (onglets existants complétés, nouveaux onglets ajoutés)
function mergeSettings(settings) {
  const titles = { adv: 'Avancé', log: 'Journal' };
  for (const [tab, fields] of Object.entries(SETTINGS_MORE)) {
    const t = settings.find((x) => x[0] === tab);
    if (!t) { settings.push([tab, titles[tab] || tab, fields]); continue; }
    // Interface : les nouveaux champs avant les boutons (mot de passe, interface classique)
    const at = tab === 'ui' ? t[2].findIndex((f) => f[0][0] === '!') : -1;
    if (at >= 0) t[2].splice(at, 0, ...fields); else t[2].push(...fields);
  }
  // Le bouton « Tous les autres réglages » n'a plus lieu d'être
  const ui = settings.find((x) => x[0] === 'ui');
  if (ui) ui[2] = ui[2].filter((f) => f[0] !== '!advanced');
}

// Dossiers surveillés : { dossier: 0 (télécharger dans ce dossier) | 1 (dossier par défaut) | "chemin" }
function watchHTML(p) {
  const rows = Object.entries(p.scan_dirs || {}).map(([d, v]) => watchRow(d, v));
  return `<div class="srow full" data-k="scan_dirs" data-watch><label>Dossiers surveillés<small>un .torrent déposé dans le dossier est ajouté automatiquement</small></label>
    <div data-wrows>${rows.join('')}</div><div><button type="button" class="btn" data-sact="addwatch">Ajouter un dossier</button></div></div>`;
}
function watchRow(dir = '', v = 1) {
  const mode = typeof v === 'number' ? String(v) : 'other';
  return `<div class="wrow" style="display:grid;grid-template-columns:minmax(0,1.3fr) auto minmax(0,1fr) auto;gap:6px;align-items:center;margin-bottom:6px">
    <input class="field" data-w="dir" value="${esc(dir)}" placeholder="/share/Download/A-ajouter" spellcheck="false">
    <select class="field" data-w="mode"><option value="0" ${mode === '0' ? 'selected' : ''}>Télécharger dans ce dossier</option><option value="1" ${mode === '1' ? 'selected' : ''}>Dossier par défaut</option><option value="other" ${mode === 'other' ? 'selected' : ''}>Autre dossier…</option></select>
    <input class="field" data-w="other" value="${mode === 'other' ? esc(v) : ''}" placeholder="Dossier de destination" ${mode === 'other' ? '' : 'hidden'} spellcheck="false">
    <button type="button" class="ibtn" data-sact="delwatch" title="Retirer">✕</button></div>`;
}
function readWatch(el) {
  const out = {};
  for (const r of el.querySelectorAll('.wrow')) {
    const d = r.querySelector('[data-w=dir]').value.trim().replace(/\/+$/, '');
    if (!d) continue;
    if (!d.startsWith('/')) throw new Error(`Dossier surveillé « ${d} » : indiquez un chemin complet.`);
    const m = r.querySelector('[data-w=mode]').value;
    if (m === 'other') {
      const o = r.querySelector('[data-w=other]').value.trim().replace(/\/+$/, '');
      if (!o.startsWith('/')) throw new Error(`Dossier surveillé « ${d} » : indiquez un dossier de destination complet.`);
      out[d] = o;
    } else out[d] = Number(m);
  }
  return out;
}
const sameJSON = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});

// Actions des boutons propres à ces réglages (renvoie true si prise en charge)
async function settingsExtraAction(a, bd, btn) {
  if (a === 'addwatch') { bd.querySelector('[data-wrows]').insertAdjacentHTML('beforeend', watchRow()); return true; }
  if (a === 'delwatch') { btn.closest('.wrow').remove(); return true; }
  if (a === 'randport') {
    const f = bd.querySelector('[data-k=listen_port]');
    f.value = 1024 + Math.floor(Math.random() * (65535 - 1024)); f.focus();
    toast('Port aléatoire choisi : cliquez sur « Enregistrer » pour l\'appliquer');
    return true;
  }
  if (a === 'testmail') {
    if (await apiAct('app/sendTestEmail', {})) toast('Courriel test envoyé : vérifiez la boîte de réception (et les indésirables)');
    return true;
  }
  return false;
}
// Liste des interfaces réseau (chargée à l'ouverture des réglages)
async function fillIfaces(bd, p) {
  const sel = bd.querySelector('[data-k=current_network_interface]');
  if (!sel) return;
  try {
    const list = await api('app/networkInterfaceList').then((r) => r.json());
    sel.innerHTML = `<option value="">Toutes les interfaces</option>` + list.map((i) => `<option value="${esc(i.value)}" ${i.value === p.current_network_interface ? 'selected' : ''}>${esc(i.name || i.value)}</option>`).join('');
  } catch (_) {}
}
// Changement « select » sur les dossiers surveillés : affiche le champ « Autre dossier »
document.addEventListener('change', (e) => {
  if (e.target.matches('.wrow [data-w=mode]')) e.target.closest('.wrow').querySelector('[data-w=other]').hidden = e.target.value !== 'other';
});
