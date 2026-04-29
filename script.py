#!/usr/bin/env python3
"""
Génère automatiquement index.json pour un dossier contenu/.
Usage : python generate_index.py
Placé à la racine du dépôt, il met à jour les deux index.json.
"""

import json
import os
from pathlib import Path

# Dossiers à scanner (chemins relatifs depuis la racine du dépôt)
DOSSIERS = [
    "dossiers/nexara/contenu",
    "dossiers/fondation_scp/contenu",
]

def generer_index(dossier: str):
    chemin = Path(dossier)
    if not chemin.exists():
        print(f"[ERREUR] Dossier introuvable : {dossier}")
        return

    fichiers = sorted(
        f.name for f in chemin.iterdir()
        if f.is_file() and f.suffix == ".md"
    )

    index_path = chemin / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(fichiers, f, ensure_ascii=False, indent=2)

    print(f"[OK] {index_path} — {len(fichiers)} fichier(s) indexé(s)")
    for nom in fichiers:
        print(f"     • {nom}")

if __name__ == "__main__":
    for dossier in DOSSIERS:
        generer_index(dossier)