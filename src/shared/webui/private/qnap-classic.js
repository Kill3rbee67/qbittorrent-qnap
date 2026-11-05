// SPDX-License-Identifier: GPL-2.0-or-later
// Ajouté à l'interface d'origine de qBittorrent (classic.html) par le paquet QNAP :
// - bouton pour revenir à l'interface explorateur ;
// - ouverture directe de la fenêtre Options quand on arrive par classic.html#reglages.
(function () {
    "use strict";
    var a = document.createElement("a");
    a.id = "qnapExplorerLink";
    a.href = "./";
    a.title = "Revenir à l'interface explorateur";
    a.textContent = "⇄ Interface explorateur";
    a.style.cssText = "position:fixed;top:3px;right:12px;z-index:100000;padding:3px 12px;border-radius:4px;"
        + "background:#1866c2;color:#fff;font:600 13px/1.6 sans-serif;text-decoration:none;box-shadow:0 1px 3px rgba(0,0,0,.3)";
    document.body.appendChild(a);

    if (location.hash !== "#reglages")
        return;
    history.replaceState(null, "", location.pathname);
    // Attend que l'interface ait branché ses menus, puis ouvre les Options
    var tries = 0;
    var timer = setInterval(function () {
        var link = document.getElementById("preferencesLink");
        if ((link && window.MochaUI && document.getElementById("torrentsTableDiv")) || ++tries > 40) {
            clearInterval(timer);
            if (link)
                setTimeout(function () { link.click(); }, 300);
        }
    }, 250);
})();
