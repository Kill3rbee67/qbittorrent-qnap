# SPDX-License-Identifier: GPL-2.0-or-later
"""Extrait la partie « données » d'un paquet .qpkg (ce que QTS installe dans
.qpkg/qBittorrent), comme le ferait l'App Center.

    python3 -I tests/qpkg-extract.py <paquet.qpkg> <dossier de destination>

Un .qpkg est un script shell suivi d'archives tar compressées (contrôle, icônes,
données) : on cherche celle qui contient le binaire qbittorrent-nox.
"""
import io
import sys
import tarfile
import zlib


def extract(qpkg: str, dest: str) -> int:
    data = open(qpkg, "rb").read()
    i = 0
    while True:
        i = data.find(b"\x1f\x8b\x08", i)
        if i < 0:
            return 0
        try:
            raw = zlib.decompressobj(31).decompress(data[i:])
            with tarfile.open(fileobj=io.BytesIO(raw)) as t:
                if "./qbittorrent-nox" in t.getnames():
                    t.extractall(dest, filter="tar")
                    return len(t.getnames())
        except (zlib.error, tarfile.TarError, EOFError):
            pass
        i += 3


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    n = extract(sys.argv[1], sys.argv[2])
    if not n:
        sys.exit(f"aucune archive de données trouvée dans {sys.argv[1]}")
    print(f"{n} éléments extraits dans {sys.argv[2]}")
